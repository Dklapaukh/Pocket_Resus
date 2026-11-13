import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ROOT } from './helpers/engines.mjs';
const CURRENT_NAME = readFileSync(ROOT + '/sw.js', 'utf8').match(/const CACHE='([^']+)'/)[1];

// Model only the service-worker APIs used here; this does not emulate a device browser.
// A "world" is the phone: its stores and its network. Two workers can share one world (old and new version).
function world() { return { stores: new Map(), offline: false, unavailable: null, puts: 0, fetches: [] }; }

function worker(phone = world(), cacheName = null) {
  const scope = 'https://example.test/resus/';
  const handlers = new Map();
  const stores = phone.stores;
  const key = input => new URL(typeof input === 'string' ? input : input.url, scope).href;
  const response = value => ({ ok: true, redirected: false, value, clone() { return response(value); } });
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async put(input, value) { phone.puts++; store.set(key(input), value); },
        async match(input) { return store.get(key(input)); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  const self = {
    location: new URL(scope),
    addEventListener(type, handler) { handlers.set(type, handler); },
    clients: { async claim() {} },
  };
  const fetch = async (input, options) => {
    phone.fetches.push({ url: key(input), options });
    if (phone.offline) throw new Error('network unavailable');
    if (input === phone.unavailable) return { ok: false, redirected: false };
    return response(key(input));
  };
  let source = readFileSync(ROOT + '/sw.js', 'utf8');
  if (cacheName) source = source.replace(/const CACHE='[^']+'/, `const CACHE='${cacheName}'`); // pretend to be another version
  vm.runInNewContext(source, {
    self, caches, fetch, URL, Response: { error: () => ({ error: true }) },
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

// Stage 1: the clinical rules are now a JSON file read by a loader module. If either is missing from the
// offline list, the app would not start without signal, so these tests fail in that case.
test('the rules file and its loader are saved at install and served with no signal', async () => {
  const sw = worker();
  await sw.install();
  sw.goOffline();
  for (const file of ['src/rules/nz-eas.json', 'src/rules/load.js', 'src/rules/parse.js', 'src/rules/check.js'])
    assert.equal((await sw.request(file)).value, 'https://example.test/resus/' + file, file + ' must be available offline');
});

test('installation fails if the rules file cannot be fetched', async () => {
  const sw = worker();
  sw.failAsset('src/rules/nz-eas.json');
  await assert.rejects(sw.install(), /Offline asset unavailable/);
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
    for (const m of source.matchAll(/new URL\('(\.[^']+)', import\.meta\.url\)/g)) needed.add(join(m[1])); // e.g. the rules JSON
  }
  assert.ok(needed.has('src/rules/nz-eas.json') && needed.has('src/rules/load.js'), 'the walk must reach the rules file');
  assert.deepEqual([...needed].filter(f => !listed.includes(f)), []);
});

// Safe-update tests (v23): the new version is built whole in its own store, or not at all.
const BASE = 'https://example.test/resus/';
const listedFiles = [...readFileSync(ROOT + '/sw.js', 'utf8').match(/const FILES=\[(.*?)\];/s)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const OLD = 'resus-pocket-v22-old', NEW = readFileSync(ROOT + '/sw.js', 'utf8').match(/const CACHE='([^']+)'/)[1];

test('(a) if the rules file fails during an update, the old version keeps its complete set offline', async () => {
  const phone = world();
  const oldSw = worker(phone, OLD);
  await oldSw.install();
  await oldSw.activate();
  const before = oldSw.storeKeys(OLD);
  assert.equal(before.length, listedFiles.length);
  const newSw = worker(phone);
  newSw.failAsset('src/rules/nz-eas.json');
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
