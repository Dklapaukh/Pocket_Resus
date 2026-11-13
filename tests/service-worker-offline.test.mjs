import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { computeName } from '../tools/cache-name.mjs';
import vm from 'node:vm';
import { ROOT } from './helpers/engines.mjs';
import { readYamlStrict } from '../src/rules/parse.js';
const CURRENT_NAME = readFileSync(ROOT + '/sw.js', 'utf8').match(/const CACHE='([^']+)'/)[1];

// Model only the service-worker APIs used here; this does not emulate a device browser.
const listedFiles = [...readFileSync(ROOT + '/sw.js', 'utf8').match(/const FILES=\[(.*?)\];/s)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);

// A "world" is the phone: its stores and its network. Two workers can share one world (old and new version).
// stale = paths served with old bytes; redirected = paths answered with a redirect; staleSw = old text for sw.js.
function world() { return { stores: new Map(), offline: false, unavailable: null, puts: 0, fetches: [], stale: new Set(), redirected: new Set(), staleSw: false, claims: 0 }; }

function worker(phone = world(), cacheName = null) {
  const scope = 'https://example.test/resus/';
  const handlers = new Map();
  const stores = phone.stores;
  const key = input => new URL(typeof input === 'string' ? input : input.url, scope).href;
  // Responses carry real bytes, so the worker's fingerprint can be calculated over the real files.
  const response = (value, bytes = Buffer.from(String(value)), redirected = false) => ({
    ok: true, redirected, value, bytes,
    clone() { return response(value, bytes, redirected); },
    async arrayBuffer() { return new Uint8Array(bytes).buffer; },
    async text() { return Buffer.from(bytes).toString('utf8'); },
  });
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async put(input, value) { phone.puts++; store.set(key(input), value); },
        async match(input, options) {
          if (!options?.ignoreSearch) return store.get(key(input));
          const bare = href => href.split('#')[0].split('?')[0];
          for (const [k, v] of store) if (bare(k) === bare(key(input))) return v;
        },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  const self = {
    location: new URL(scope),
    addEventListener(type, handler) { handlers.set(type, handler); },
    clients: { async claim() { phone.claims++; } },
  };
  const fetch = async (input, options) => {
    phone.fetches.push({ url: key(input), options });
    if (phone.offline) throw new Error('network unavailable');
    if (input === phone.unavailable) return { ok: false, redirected: false };
    const path = typeof input === 'string' ? input : input.url;
    let bytes;
    if (path === 'sw.js') bytes = phone.staleSw ? Buffer.from(readFileSync(ROOT + '/sw.js', 'utf8') + '\n// old') : readFileSync(ROOT + '/sw.js');
    else if (path !== './' && listedFiles.includes(path)) bytes = readFileSync(ROOT + '/' + path);
    if (bytes && phone.stale.has(path)) bytes = Buffer.concat([bytes, Buffer.from(' ')]);
    return response(key(input), bytes, phone.redirected.has(path));
  };
  let source = readFileSync(ROOT + '/sw.js', 'utf8');
  if (cacheName) source = source.replace(/const CACHE='[^']+'/, `const CACHE='${cacheName}'`); // pretend to be another version
  vm.runInNewContext(source, {
    self, caches, fetch, URL, TextEncoder, Uint8Array, crypto: webcrypto, Response: { error: () => ({ error: true }) },
  });
  return {
    async install() {
      let work;
      handlers.get('install')({ waitUntil(promise) { work = promise; } });
      return work;
    },
    async request(path, mode = 'same-origin') {
      let work;
      handlers.get('fetch')({
        request: { method: 'GET', url: key(path), mode },
        respondWith(promise) { work = promise; },
      });
      return work;
    },
    goOffline() { phone.offline = true; },
    goOnline() { phone.offline = false; },
    failAsset(path) { phone.unavailable = path; },
    phone,
    async seed(name, path, value) { await (await caches.open(name)).put(path, response(value)); },
    async activate() {
      let work;
      handlers.get('activate')({ waitUntil(promise) { work = promise; } });
      return work;
    },
    cacheNames() { return caches.keys(); },
    storeKeys(name) { return [...(stores.get(name)?.keys() || [])]; },
  };
}

test('a successful install serves cached modules and the app shell when offline', async () => {
  const sw = worker();
  await sw.install();
  sw.goOffline();
  assert.equal((await sw.request('src/app/state.js')).value, 'https://example.test/resus/src/app/state.js');
  assert.equal((await sw.request('uncached-page', 'navigate')).value, 'https://example.test/resus/');
  assert.equal((await sw.request('uncached-asset.js')).error, true);
});

test('installation fails if a required offline asset cannot be fetched', async () => {
  const sw = worker();
  sw.failAsset('src/app/state.js');
  await assert.rejects(sw.install(), /Offline asset unavailable/);
});

test('activation leaves unrelated caches alone and offline reads use the current cache', async () => {
  const sw = worker();
  await sw.seed('another-app', 'src/app/state.js', 'unrelated');
  await sw.seed('resus-pocket-v18-readable', 'src/app/state.js', 'old');
  await sw.install();
  await sw.activate();
  assert.deepEqual(await sw.cacheNames(), ['another-app', CURRENT_NAME]);
  // An old worker can recreate its cache while it is finishing a request.
  await sw.seed('resus-pocket-v18-readable', 'src/app/state.js', 'stale');
  sw.goOffline();
  assert.equal((await sw.request('src/app/state.js')).value, 'https://example.test/resus/src/app/state.js');
});

// Stage 1 (YAML since step E1b): the clinical rules are a YAML file read by a loader module and the vendored
// YAML reader (src/vendor/js-yaml.mjs). If any of them is missing from the offline list, the app would not start without signal, so these tests fail in that case.
test('the rules file and its loader are saved at install and served with no signal', async () => {
  const sw = worker();
  await sw.install();
  sw.goOffline();
  for (const file of ['src/rules/nz-eas.yaml', 'src/rules/load.js', 'src/rules/parse.js', 'src/rules/check.js', 'src/vendor/js-yaml.mjs'])
    assert.equal((await sw.request(file)).value, 'https://example.test/resus/' + file, file + ' must be available offline');
});

test('installation fails if the rules file cannot be fetched', async () => {
  const sw = worker();
  sw.failAsset('src/rules/nz-eas.yaml');
  await assert.rejects(sw.install(), /Offline asset unavailable/);
});

test('installation fails if the vendored YAML reader cannot be fetched', async () => {
  const sw = worker();
  sw.failAsset('src/vendor/js-yaml.mjs');
  await assert.rejects(sw.install(), /Offline asset unavailable/);
});

test('the old JSON rules file is no longer in the offline list, and the editor-only writer is not either', () => {
  assert.ok(!listedFiles.includes('src/rules/nz-eas.json'));
  assert.ok(!listedFiles.includes('src/rules/write.js'), 'the writer is not needed on the phone yet');
  assert.ok(listedFiles.includes('src/rules/nz-eas.yaml') && listedFiles.includes('src/vendor/js-yaml.mjs'));
});

test('every file the page needs, found by following its imports and file references, is in the offline list', async () => {
  const { parse } = await import('acorn');
  const listed = [...readFileSync(ROOT + '/sw.js', 'utf8').match(/const FILES=\[(.*?)\];/s)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const needed = new Set(), queue = ['src/app/main.js'];
  while (queue.length) {
    const file = queue.pop();
    if (needed.has(file)) continue;
    needed.add(file);
    const source = readFileSync(ROOT + '/' + file, 'utf8');
    const here = file.slice(0, file.lastIndexOf('/'));
    const join = rel => new URL(rel, 'https://x.test/' + here + '/').pathname.slice(1);
    for (const node of parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body)
      if (node.type === 'ImportDeclaration' || (node.type === 'ExportNamedDeclaration' && node.source)) queue.push(join(node.source.value));
    for (const m of source.matchAll(/new URL\('(\.[^']+)', import\.meta\.url\)/g)) needed.add(join(m[1])); // e.g. the rules file
  }
  assert.ok(needed.has('src/rules/nz-eas.yaml') && needed.has('src/rules/load.js') && needed.has('src/vendor/js-yaml.mjs'), 'the walk must reach the rules file and the YAML reader');
  assert.deepEqual([...needed].filter(f => !listed.includes(f)), []);
});

// Safe-update tests (v23): the new version is built whole in its own store, or not at all.
const BASE = 'https://example.test/resus/';
const NEW = CURRENT_NAME, OLD = 'resus-pocket-v22-' + NEW.split('-').pop(); // the pretend old version has a valid fingerprint too

test('(a) if the rules file fails during an update, the old version keeps its complete set offline', async () => {
  const phone = world();
  const oldSw = worker(phone, OLD);
  await oldSw.install();
  await oldSw.activate();
  const before = oldSw.storeKeys(OLD);
  assert.equal(before.length, listedFiles.length);
  const newSw = worker(phone);
  newSw.failAsset('src/rules/nz-eas.yaml');
  await assert.rejects(newSw.install(), /Offline asset unavailable/);
  phone.unavailable = null;
  oldSw.goOffline();
  assert.deepEqual(oldSw.storeKeys(OLD), before, 'old store must be untouched');
  assert.deepEqual(await oldSw.cacheNames(), [OLD], 'nothing of the new version may remain');
  for (const f of listedFiles) assert.ok((await oldSw.request(f)).ok, f + ' must still be served by the old version');
});

test('(b) a successful update fills the new store, and the old store goes only on activate', async () => {
  const phone = world();
  const oldSw = worker(phone, OLD);
  await oldSw.install();
  await oldSw.seed('another-app', 'x.js', 'unrelated');
  const newSw = worker(phone);
  await newSw.install();
  assert.equal(newSw.storeKeys(NEW).length, listedFiles.length);
  assert.ok(listedFiles.every(f => phone.fetches.some(x => x.url === new URL(f, BASE).href && x.options?.cache === 'reload')), 'every file is fetched past the browser cache');
  assert.deepEqual((await newSw.cacheNames()).sort(), ['another-app', NEW, OLD].sort(), 'old store survives install');
  await newSw.activate();
  assert.deepEqual((await newSw.cacheNames()).sort(), ['another-app', NEW].sort());
  assert.deepEqual(newSw.storeKeys('another-app'), [new URL('x.js', BASE).href]);
});

test('(c) the fetch handler never writes to a store', async () => {
  const sw = worker();
  await sw.install();
  const writes = sw.phone.puts;
  await sw.request('src/app/state.js');
  await sw.request('not-listed.js');
  await sw.request('another-page', 'navigate');
  sw.goOffline();
  await sw.request('not-listed.js');
  await sw.request('another-page', 'navigate');
  assert.equal(sw.phone.puts, writes);
  assert.deepEqual(sw.storeKeys(NEW).length, listedFiles.length);
});

test('(d) a file not in the list comes from the network when online and fails cleanly offline', async () => {
  const sw = worker();
  await sw.install();
  assert.equal((await sw.request('extra.json')).value, BASE + 'extra.json');
  sw.goOffline();
  assert.equal((await sw.request('extra.json')).error, true);
});

test('(e) offline navigation to an unknown page falls back to the start page', async () => {
  const sw = worker();
  await sw.install();
  sw.goOffline();
  assert.equal((await sw.request('some/other/page', 'navigate')).value, BASE);
});

test('listed files are answered from the store without touching the network', async () => {
  const sw = worker();
  await sw.install();
  const count = sw.phone.fetches.length;
  await sw.request('src/app/state.js');
  assert.equal(sw.phone.fetches.length, count);
});

test('the worker does not take over a running app (no skipWaiting)', () => {
  assert.doesNotMatch(readFileSync(ROOT + '/sw.js', 'utf8').replace(/\/\*.*?\*\//s, ''), /skipWaiting/);
});

// Integrity check: the worker works out the file fingerprint itself and must get the name written in sw.js.
// This runs the worker's OWN calculation (inside the fake) over the real files, and compares with the shared tool.
test('the worker\'s own fingerprint over the real files equals the name in sw.js and the shared calculation', async () => {
  const sw = worker();
  await sw.install(); // would throw if the worker's sums did not match its own name
  assert.equal(computeName(ROOT), NEW);
});

test('integrity: one stale listed file makes the install fail, leaves no new store, and the old version still serves', async () => {
  const phone = world();
  const oldSw = worker(phone, OLD);
  await oldSw.install();
  const before = oldSw.storeKeys(OLD);
  phone.stale.add('src/rules/nz-eas.yaml');
  await assert.rejects(worker(phone).install(), /do not match this version/);
  assert.deepEqual(await oldSw.cacheNames(), [OLD]);
  assert.deepEqual(oldSw.storeKeys(OLD), before);
  oldSw.goOffline();
  for (const f of listedFiles) assert.ok((await oldSw.request(f)).ok, f);
});

test('integrity: a stale sw.js text makes the install fail', async () => {
  const phone = world();
  phone.staleSw = true;
  const sw = worker(phone);
  await assert.rejects(sw.install(), /do not match this version/);
  assert.deepEqual(await sw.cacheNames(), []);
});

test('integrity: when every file is correct the install succeeds', async () => {
  const sw = worker();
  await sw.install();
  assert.equal(sw.storeKeys(NEW).length, listedFiles.length);
});

test('a redirected answer fails the install', async () => {
  const phone = world();
  phone.redirected.add('src/app/state.js');
  const sw = worker(phone);
  await assert.rejects(sw.install(), /Offline asset unavailable/);
  assert.deepEqual(await sw.cacheNames(), []);
});

test('activation claims the open pages (and only activation does)', async () => {
  const sw = worker();
  await sw.install();
  assert.equal(sw.phone.claims, 0);
  await sw.activate();
  assert.equal(sw.phone.claims, 1);
});

test('page opens with a query or hash are answered from the store, offline too', async () => {
  const sw = worker();
  await sw.install();
  sw.goOffline();
  assert.equal((await sw.request('./?x=1', 'navigate')).value, BASE);
  assert.equal((await sw.request('index.html?source=pwa', 'navigate')).value, BASE + 'index.html');
  assert.equal((await sw.request('./#top', 'navigate')).value, BASE);
  assert.equal((await sw.request('src/app/state.js?x=1')).error, true, 'the query is ignored for page opens only');
});

// Every picture, icon, page and PDF the app can ask for must be in the offline list.
test('files referenced by the manifest, page, stylesheets, tutorial slides and rules are all in the offline list', () => {
  const read = f => readFileSync(ROOT + '/' + f, 'utf8');
  const found = new Set();
  const add = ref => { if (ref && !/^(https?:|data:|#)/.test(ref)) found.add(ref.split(/[?#]/)[0]); };
  for (const m of read('index.html').matchAll(/(?:href|src)="([^"]+)"/g)) add(m[1]);
  for (const icon of JSON.parse(read('manifest.webmanifest')).icons) add(icon.src);
  for (const css of readdirSync(ROOT).filter(f => f.endsWith('.css'))) for (const m of read(css).matchAll(/url\(\s*['"]?([^'")]+)/g)) add(m[1]);
  for (const m of read('src/app/data.js').matchAll(/image:\s*'([^']+)'/g)) add(m[1]);
  for (const f of readdirSync(ROOT + '/src/app')) for (const m of read('src/app/' + f).matchAll(/'((?:[\w-]+\/)*[\w-]+\.(?:png|svg|pdf|jpg|webp))'/g)) add(m[1]);
  const pdfNames = (value) => (typeof value === 'string' ? (/^(?:[\w-]+\/)*[\w-]+\.pdf(?:[#?].*)?$/.test(value) ? [value] : [])
    : value && typeof value === 'object' ? Object.values(value).flatMap(pdfNames) : []);
  for (const name of pdfNames(readYamlStrict(read('src/rules/nz-eas.yaml')))) add(name);
  assert.ok(found.has('icon-192.png') && found.has('tutorial/step-01.png') && found.has('cpg-rsi.pdf'), 'the scan must find the known references');
  assert.deepEqual([...found].filter(f => !listedFiles.includes(f)), []);
});
