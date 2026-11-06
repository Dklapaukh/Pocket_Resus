/* Optional local-browser check; requires Playwright and Chrome.
   No real patient data is used. This does not replace phone testing. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const previousWorker = execFileSync('git', ['show', 'HEAD:sw.js'], { cwd: root });
let servePreviousWorker = false;
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf',
};
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (filename !== root && !filename.startsWith(root + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  fs.readFile(filename, (error, bytes) => {
    if (error) return response.writeHead(404).end();
    if (url.pathname === '/sw.js' && servePreviousWorker) {
      bytes = previousWorker;
    }
    if (url.pathname === '/src/app/base.js' && servePreviousWorker)
      bytes = Buffer.concat([bytes, Buffer.from('\n/* previous-release-marker */\n')]);
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' });
    response.end(bytes);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 360, height: 680 } });
    const page = await context.newPage();
    await page.clock.install();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = `http://127.0.0.1:${server.address().port}/`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await page.click('[data-action="weight"]');
    await page.fill('#weightInput', '15.5');
    await page.click('[data-action="save-weight"]');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('resus-pocket-v1')));
    if (stored.weight !== '15.5') throw new Error('Offline weight entry did not persist');
    const secondPage = await context.newPage();
    secondPage.on('pageerror', error => errors.push(error.message));
    await secondPage.goto(url, { waitUntil: 'load' });
    await secondPage.locator('#headerWeight').getByText('15.5 kg').waitFor();
    await page.click('[data-action="weight"]');
    await page.fill('#weightInput', '16');
    await page.click('[data-action="save-weight"]');
    await secondPage.locator('#headerWeight').getByText('16 kg').waitFor();
    await secondPage.close();
    await page.click('[data-action="start"]');
    await page.clock.runFor(121000); // Allow the 250 ms display tick to run after expiry.
    const caption = await page.locator('#cycleCaption').innerText();
    if (!caption.startsWith('Rhythm check due')) {
      throw new Error('Offline countdown did not reach rhythm check: ' + caption);
    }
    const events = await page.evaluate(() => JSON.parse(localStorage.getItem('resus-pocket-v1')).events);
    if (events.some(event => ['shock', 'noshock', 'adrenaline', 'amiodarone'].includes(event.type))) {
      throw new Error('Countdown recorded an event without a user action');
    }
    await page.reload({ waitUntil: 'load' });
    if (!(await page.locator('#cycleCaption').innerText()).startsWith('Rhythm check due')) {
      throw new Error('Offline reload did not retain the elapsed cycle');
    }
    if (errors.length) throw new Error('Browser errors: ' + errors.join('; '));
    console.log('Offline reload, weight entry, cross-tab update, countdown and session recovery passed in Chrome.');
    await context.close();

    // Check an installed previous worker can update after its controlled tab closes.
    servePreviousWorker = true;
    const upgradeContext = await browser.newContext();
    const oldPage = await upgradeContext.newPage();
    await oldPage.goto(url, { waitUntil: 'networkidle' });
    await oldPage.evaluate(() => navigator.serviceWorker.ready);
    await oldPage.click('[data-action="weight"]');
    await oldPage.fill('#weightInput', '42');
    await oldPage.click('[data-action="save-weight"]');
    const beforeCaches = await oldPage.evaluate(() => caches.keys());
    if (!beforeCaches.includes('resus-pocket-v17-modules')) throw new Error('Previous cache was not installed');
    servePreviousWorker = false;
    await oldPage.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await oldPage.waitForFunction(async () => (await navigator.serviceWorker.getRegistration()).waiting !== null);
    await oldPage.close();
    const newPage = await upgradeContext.newPage();
    await newPage.goto(url, { waitUntil: 'networkidle' });
    await newPage.waitForFunction(async () => {
      const names = await caches.keys();
      const registration = await navigator.serviceWorker.getRegistration();
      return names.includes('resus-pocket-v18-readable') && registration?.active?.state === 'activated' &&
        !registration.waiting && !registration.installing;
    });
    const recovered = await newPage.evaluate(() => JSON.parse(localStorage.getItem('resus-pocket-v1')));
    if (recovered.weight !== '42') throw new Error('Session changed during the offline cache update');
    await upgradeContext.setOffline(true);
    await newPage.reload({ waitUntil: 'load' });
    await newPage.locator('#headerWeight').getByText('42 kg').waitFor();
    const offlineModule = await newPage.evaluate(async () => (await fetch('src/app/base.js')).text());
    if (offlineModule.includes('previous-release-marker')) throw new Error('Offline fetch returned the previous module');
    console.log('Previous-worker upgrade, session recovery and offline reload passed in Chrome.');
    await upgradeContext.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
