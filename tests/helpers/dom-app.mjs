// Runs the real app (index.html + its scripts) inside a fake browser (jsdom) with a
// controlled clock, so each screen's HTML can be captured and compared exactly.
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { rulesBundleOptions, giveRulesToWindow } from './rules-for-fake-browser.mjs';

process.env.TZ = 'UTC';                   // clock text must not depend on the computer's time zone
export const T0 = 1700000000000;           // fixed start time used by every scenario
export const sha = t => createHash('sha256').update(t).digest('hex').slice(0, 16);

// appDir: folder holding index.html. scriptLoader(window, dir, srcList) runs the scripts.
export function openApp({ appDir, savedState = null, scriptLoader = defaultLoader } = {}) {
  const html = readFileSync(path.join(appDir, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'https://example.test/', pretendToBeVisual: true, runScripts: 'outside-only' });
  const w = dom.window;
  let now = T0, uid = 0, tickFn = null;

  // Fake clock
  const RealDate = w.Date;
  class FakeDate extends RealDate { constructor(...a) { a.length ? super(...a) : super(now); } static now() { return now; } }
  w.Date = FakeDate;
  Object.defineProperty(w, 'crypto', { value: { randomUUID: () => 'id-' + (++uid) }, configurable: true });
  // Capture the 250 ms timer instead of running it for real
  w.setInterval = fn => { tickFn = fn; return 1; };
  w.setTimeout = () => 1; w.clearTimeout = () => {};
  // jsdom lacks <dialog> methods
  const D = w.HTMLDialogElement.prototype;
  D.showModal = function () { this.setAttribute('open', ''); };
  D.close = function () { this.removeAttribute('open'); this.dispatchEvent(new w.Event('close')); };
  w.URL.createObjectURL = () => 'blob:test'; w.URL.revokeObjectURL = () => {}; w.document.execCommand = () => false;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  if (savedState !== null) w.localStorage.setItem('resus-pocket-v1', savedState);

  const srcs = [...w.document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'));
  giveRulesToWindow(w, appDir); // the rule set, for app copies that read it from nz-eas.yaml
  scriptLoader(w, appDir, srcs, dom);

  const $ = sel => w.document.querySelector(sel);
  const api = {
    window: w, T0,
    get now() { return now; },
    tick() { tickFn && tickFn(); },
    advance(ms) { now += ms; api.tick(); },
    setNow(t) { now = t; api.tick(); },
    click(sel) {
      const el = typeof sel === 'string' ? $(sel) : sel;
      if (!el) throw new Error('Nothing to click: ' + sel);
      el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
      api.tick();
    },
    type(sel, value) {
      const el = $(sel); if (!el) throw new Error('No field: ' + sel);
      el.value = value;
      el.dispatchEvent(new w.Event('input', { bubbles: true }));
      el.dispatchEvent(new w.Event('change', { bubbles: true }));
    },
    check(sel, on = true) {
      const el = $(sel); if (!el) throw new Error('No checkbox: ' + sel);
      el.checked = on; el.dispatchEvent(new w.Event('change', { bubbles: true })); api.tick();
    },
    select(sel, value) { const el = $(sel); el.value = value; el.dispatchEvent(new w.Event('change', { bubbles: true })); api.tick(); },
    submit(sel) { const f = $(sel); if (!f) throw new Error('No form: ' + sel); f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); api.tick(); },
    // Everything the person can see or that is stored, as plain text
    surfaces() {
      const d = w.document;
      return {
        header: d.querySelector('header').innerHTML,
        main: d.getElementById('main').innerHTML,
        sheet: d.getElementById('sheet').innerHTML + '|open=' + d.getElementById('sheet').hasAttribute('open'),
        toast: d.getElementById('toast').textContent + '|' + d.getElementById('toast').className,
        body: d.body.className,
        nav: d.querySelector('.bottom-nav').innerHTML,
        storageError: String(d.getElementById('storageError').hidden),
        stored: w.localStorage.getItem('resus-pocket-v1') || '',
      };
    },
  };
  return api;
}

// Original app: plain scripts run in index.html order, all sharing one global scope.
// (vm.Script in the page's context gives scripts the same shared top-level scope a browser does.)
export function defaultLoader(w, dir, srcs, dom) {
  const ctx = dom.getInternalVMContext();
  // Rebuilt app (Stage 2b): one <script type=module>. jsdom cannot run modules, so bundle it into one
  // strict-mode script first (browsers run modules in strict mode, so the test does too).
  const mod = srcs.find(x => x.startsWith('src/'));
  if (mod) {
    const code = buildSync({ entryPoints: [path.join(dir, mod)], bundle: true, format: 'iife', write: false, banner: { js: '"use strict";' }, ...rulesBundleOptions }).outputFiles[0].text;
    new vm.Script(code, { filename: mod }).runInContext(ctx);
    return;
  }
  for (const src of srcs) new vm.Script(readFileSync(path.join(dir, src), 'utf8'), { filename: src }).runInContext(ctx);
}
