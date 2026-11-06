import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ROOT } from './helpers/engines.mjs';

// Model only the service-worker APIs used here; this does not emulate a device browser.
function worker() {
  const scope = 'https://example.test/resus/';
  const handlers = new Map();
  const stores = new Map();
  let offline = false;
  let unavailable = null;
  const key = input => new URL(typeof input === 'string' ? input : input.url, scope).href;
  const response = value => ({ ok: true, redirected: false, value, clone() { return response(value); } });
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async put(input, value) { store.set(key(input), value); },
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
  const fetch = async input => {
    if (offline) throw new Error('network unavailable');
    if (input === unavailable) return { ok: false, redirected: false };
    return response(key(input));
  };
  vm.runInNewContext(readFileSync(ROOT + '/sw.js', 'utf8'), {
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
    goOffline() { offline = true; },
    failAsset(path) { unavailable = path; },
    async seed(name, path, value) { await (await caches.open(name)).put(path, response(value)); },
    async activate() {
      let work;
      handlers.get('activate')({ waitUntil(promise) { work = promise; } });
      return work;
    },
    cacheNames() { return caches.keys(); },
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
  assert.deepEqual(await sw.cacheNames(), ['another-app', 'resus-pocket-v19-readable']);
  // An old worker can recreate its cache while it is finishing a request.
  await sw.seed('resus-pocket-v18-readable', 'src/app/state.js', 'stale');
  sw.goOffline();
  assert.equal((await sw.request('src/app/state.js')).value, 'https://example.test/resus/src/app/state.js');
});
