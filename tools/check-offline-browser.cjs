/* Optional local-browser check; requires Playwright and Chrome.
   No real patient data is used. This does not replace phone testing. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const previousWorker = fs.readFileSync(path.join(root, 'tests/fixtures/sw-v18.js'));
let servePreviousWorker = false;
// Safe-update check: serve an "old" copy (own cache name, marker in base.js) then the real "new" copy.
const currentName = fs.readFileSync(path.join(root, 'sw.js'), 'utf8').match(/const CACHE='([^']+)'/)[1];
const OLD_NAME = 'resus-pocket-v22-old-copy';
let serveCopy = null;      // null (normal), 'old' or 'new'
let failRules = false;     // make src/rules/nz-eas.json fail while true
let rulesRequests = 0;
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
  if (url.pathname === '/src/rules/nz-eas.json') {
    rulesRequests++;
    if (failRules) return response.writeHead(503).end();
  }
  fs.readFile(filename, (error, bytes) => {
    if (error) return response.writeHead(404).end();
    if (serveCopy && url.pathname === '/sw.js' && serveCopy === 'old')
      bytes = Buffer.from(bytes.toString().replace(/const CACHE='[^']+'/, `const CACHE='${OLD_NAME}'`));
    if (serveCopy && url.pathname === '/src/app/base.js')
      bytes = Buffer.concat([bytes, Buffer.from(`\n/* copy-marker-${serveCopy} */\n`)]);
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
    if (!beforeCaches.includes('resus-pocket-v18-readable')) throw new Error('Previous cache was not installed');
    servePreviousWorker = false;
    await oldPage.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await oldPage.waitForFunction(async () => (await navigator.serviceWorker.getRegistration()).waiting !== null);
    await oldPage.close();
    let newPage = await upgradeContext.newPage();
    await newPage.goto(url, { waitUntil: 'networkidle' });
    // The page opened just after the old tab closed may still be held by the old worker, so reopen once more.
    await newPage.close();
    newPage = await upgradeContext.newPage();
    await newPage.goto(url, { waitUntil: 'networkidle' });
    // (This used to return a promise, which is always "true"; now the page-side check is awaited properly.)
    await newPage.evaluate(async expected => {
      for (let i = 0; i < 300; i++) {
        const names = await caches.keys();
        const registration = await navigator.serviceWorker.getRegistration();
        if (names.includes(expected) && registration?.active?.state === 'activated' &&
          !registration.waiting && !registration.installing) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const r = await navigator.serviceWorker.getRegistration();
      throw new Error('Previous-worker upgrade did not finish: ' + (await caches.keys()).join(',') + ' active=' + r.active?.state + ' waiting=' + !!r.waiting + ' installing=' + !!r.installing);
    }, currentName);
    const recovered = await newPage.evaluate(() => JSON.parse(localStorage.getItem('resus-pocket-v1')));
    if (recovered.weight !== '42') throw new Error('Session changed during the offline cache update');
    await upgradeContext.setOffline(true);
    await newPage.reload({ waitUntil: 'load' });
    await newPage.locator('#headerWeight').getByText('42 kg').waitFor();
    const offlineModule = await newPage.evaluate(async () => (await fetch('src/app/base.js')).text());
    if (offlineModule.includes('previous-release-marker')) throw new Error('Offline fetch returned the previous module');
    console.log('Previous-worker upgrade, session recovery and offline reload passed in Chrome.');
    await upgradeContext.close();

    // REAL-BROWSER SAFE-UPDATE CHECK: a failed update must leave the old version fully working offline,
    // and a good update must take over only when the app is next opened fresh.
    const check = (ok, message) => { if (!ok) throw new Error('Safe-update check: ' + message); };
    const marker = page => page.evaluate(async () => (await (await fetch('src/app/base.js')).text()).match(/copy-marker-(\w+)/)?.[1]);
    const cacheNames = page => page.evaluate(() => caches.keys());
    serveCopy = 'old';
    const safeContext = await browser.newContext();
    let appPage = await safeContext.newPage();
    const safeErrors = [];
    appPage.on('pageerror', error => safeErrors.push(error.message));
    await appPage.goto(url, { waitUntil: 'networkidle' });
    await appPage.evaluate(() => navigator.serviceWorker.ready);
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.click('[data-action="weight"]');
    await appPage.fill('#weightInput', '33');
    await appPage.click('[data-action="save-weight"]');
    check((await cacheNames(appPage)).join() === OLD_NAME, 'old copy did not install alone: ' + (await cacheNames(appPage)));
    check(await marker(appPage) === 'old', 'old copy not running');

    // 1. The update visit, with the rules file failing.
    serveCopy = 'new'; failRules = true; rulesRequests = 0;
    await appPage.evaluate(async () => { try { await (await navigator.serviceWorker.getRegistration()).update(); } catch (e) {} });
    await appPage.waitForFunction(() => navigator.serviceWorker.getRegistration().then(r => !r.installing)); // install has ended
    await appPage.waitForTimeout(500);
    check(rulesRequests > 0, 'the update never asked for the rules file');
    check(await appPage.evaluate(async () => !(await navigator.serviceWorker.getRegistration()).waiting), 'a failed update must not be waiting');
    check((await cacheNames(appPage)).join() === OLD_NAME, 'a failed update left something behind: ' + (await cacheNames(appPage)));
    // Phone goes offline, app reopened: the old version must still start and work.
    await safeContext.setOffline(true);
    await appPage.close();
    appPage = await safeContext.newPage();
    appPage.on('pageerror', error => safeErrors.push(error.message));
    await appPage.goto(url, { waitUntil: 'load' });
    await appPage.locator('#headerWeight').getByText('33 kg').waitFor();
    check(await marker(appPage) === 'old', 'offline after a failed update did not give the old version');
    await appPage.click('[data-action="start"]');
    check((await cacheNames(appPage)).join() === OLD_NAME, 'old store changed');
    console.log('Failed update (rules file down) then offline: old version still starts and works, nothing of the new one kept.');

    // 2. The update succeeds. It must wait while the app is open.
    await safeContext.setOffline(false);
    failRules = false;
    await appPage.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
    await appPage.waitForFunction(() => navigator.serviceWorker.getRegistration().then(r => r.waiting));
    check(await marker(appPage) === 'old', 'new version took over a running app');
    check((await cacheNames(appPage)).sort().join() === [currentName, OLD_NAME].sort().join(), 'new store should sit beside the old one until activation');
    await appPage.close();
    appPage = await safeContext.newPage();
    appPage.on('pageerror', error => safeErrors.push(error.message));
    await appPage.goto(url, { waitUntil: 'networkidle' });
    // That page may still have been held by the old version; opening the app fresh once more lets the new one take over.
    await appPage.close();
    appPage = await safeContext.newPage();
    appPage.on('pageerror', error => safeErrors.push(error.message));
    await appPage.goto(url, { waitUntil: 'networkidle' });
    await appPage.waitForFunction(() => navigator.serviceWorker.getRegistration().then(r => r.active && !r.waiting && !r.installing));
    await appPage.waitForFunction(name => caches.keys().then(n => n.join() === name), currentName);
    await safeContext.setOffline(true);
    await appPage.reload({ waitUntil: 'load' });
    await appPage.locator('#headerWeight').getByText('33 kg').waitFor();
    const m = await marker(appPage);
    check(m === 'new', 'new version is not in charge after reopening (saw ' + m + ', stores ' + (await cacheNames(appPage)) + ')');
    check(safeErrors.length === 0, 'browser errors: ' + safeErrors.join('; '));
    console.log('Good update: waited while the app was open, took over on fresh open, old store removed, works offline.');
    await safeContext.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
