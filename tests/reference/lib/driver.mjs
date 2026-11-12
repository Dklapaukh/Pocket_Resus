// Reference recordings (stage 0): a "person" tapping the real app inside the fake browser.
//
// Built on tests/helpers/dom-app.mjs (the same fake browser and fixed clock the other screen tests
// use). This file only adds what a long generated case needs, all on the TEST side (nothing in the
// app is changed):
//   - the app is bundled once per app folder and reused (opening is then fast);
//   - a tap only happens if a person could make it: a button that is missing, greyed out (disabled),
//     hidden, inside a closed "details" section, or behind an open pop-up is NOT pressed, and the
//     step says so ("nothing happens");
//   - form buttons are pressed for real, so the browser's own "required field" checks apply;
//   - downloads and "copy" are caught so the exported text can be recorded;
//   - a reload opens a new app on the saved session at the SAME clock time;
//   - any error the app throws is recorded as part of the screen (so it cannot pass unnoticed).
// After every action one step is captured: what is on screen (screens) and what is saved on the
// phone (saved), kept apart so a planned change to the saved session can be checked on its own.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { buildSync } from 'esbuild';
import { openApp, T0 } from '../../helpers/dom-app.mjs';
import { rulesBundleOptions } from '../../helpers/rules-for-fake-browser.mjs';

const KEY = 'resus-pocket-v1';
export const SCREEN_SURFACES = ['header', 'main', 'sheet', 'toast', 'frame', 'export'];
export const SAVED_SURFACES = ['stored', 'jsonExport'];

/* The app's module code, bundled into one script per app folder (as the other screen tests do). */
const bundles = new Map();
/* The coverage tool supplies its own bundle (same code plus a source map). */
export function useBundle(appDir, code, filename) { bundles.set(appDir, new vm.Script(code, { filename })); }
function bundleFor(appDir) {
  if (!bundles.has(appDir)) {
    const html = readFileSync(path.join(appDir, 'index.html'), 'utf8');
    const entry = /<script type="module" src="([^"]+)"/.exec(html)[1];
    const code = buildSync({ entryPoints: [path.join(appDir, entry)], bundle: true, format: 'iife', write: false, banner: { js: '"use strict";' }, ...rulesBundleOptions }).outputFiles[0].text;
    bundles.set(appDir, new vm.Script(code, { filename: entry }));
  }
  return bundles.get(appDir);
}

/* Errors thrown inside the app's async tap handler surface as unhandled promise rejections. */
let currentDriver = null;
process.on('unhandledRejection', (reason) => {
  if (currentDriver) currentDriver.errors.push('unhandled: ' + (reason?.message || String(reason)));
  else throw reason;
});

const flush = () => new Promise((resolve) => setImmediate(resolve));

export class Driver {
  /* startOffset: start the clock this many ms after the usual fixed start time (e.g. just before midnight). */
  constructor(appDir, { startOffset = 0 } = {}) {
    this.appDir = appDir;
    this.steps = [];
    this.errors = [];
    this.exported = { text: '', json: '' };
    currentDriver = this;
    this.#open(null, startOffset);
  }

  /* Open the app (fresh, or on a saved session) with its clock `offset` ms after the fixed start time. */
  #open(savedState, offset) {
    const script = bundleFor(this.appDir), self = this;
    this.offset = offset;
    const loader = (w, dir, srcs, dom) => {
      // Fake-browser gaps (test side only): scrolling does nothing; the tutorial scrolls an element.
      w.scrollTo = () => {};
      w.Element.prototype.scrollTo = () => {};
      // Same clock, moved on by `offset` (used after a reload).
      const Base = w.Date;
      class Shifted extends Base {
        constructor(...a) { if (a.length) super(...a); else super(Base.now() + offset); }
        static now() { return Base.now() + offset; }
      }
      w.Date = Shifted;
      // Catch downloads (text and complete JSON record) and "copy".
      const RealBlob = w.Blob;
      w.Blob = class extends RealBlob { constructor(parts = [], o) { super(parts, o); this.textForTest = parts.map(String).join(''); } };
      let lastBlob = null;
      w.URL.createObjectURL = (b) => { lastBlob = b; return 'blob:test'; };
      w.HTMLAnchorElement.prototype.click = function () {
        const name = this.getAttribute('download') || '';
        if (name.endsWith('.json')) self.exported.json += name + '\n' + (lastBlob?.textForTest ?? '');
        else self.exported.text += 'download ' + name + '\n' + (lastBlob?.textForTest ?? '');
      };
      w.document.execCommand = (cmd) => {
        if (cmd !== 'copy') return false;
        const field = w.document.querySelector('textarea[aria-hidden="true"]');
        self.exported.text += 'copy\n' + (field ? field.value : '');
        return true;
      };
      // Errors thrown by the app's own listeners are kept with the screen.
      w.addEventListener('error', (e) => { self.errors.push('error: ' + (e.error?.message || e.message)); e.preventDefault(); });
      script.runInContext(dom.getInternalVMContext());
    };
    if (this.app) this.app.window.close();
    this.app = openApp({ appDir: this.appDir, savedState, scriptLoader: loader });
    this.win = this.app.window;
    this.doc = this.win.document;
  }

  /* The app's clock (fixed start time + everything advanced so far). */
  get now() { return this.app.now + this.offset; }
  get T0() { return T0; }

  $(sel) { return this.doc.querySelector(sel); }
  $$(sel) { return [...this.doc.querySelectorAll(sel)]; }
  sheetOpen() { return this.doc.getElementById('sheet').hasAttribute('open'); }
  sheetTitle() { return this.sheetOpen() ? this.$('#sheetTitle')?.textContent || '' : ''; }
  tab() { const c = this.doc.body.className; return /live-mode/.test(c) ? 'live' : /guidance-mode/.test(c) ? 'guidance' : /checklist-mode/.test(c) ? 'checks' : 'log'; }
  /* The session the app has saved on the phone (used only to choose sensible next moves). */
  saved() { try { return JSON.parse(this.win.localStorage.getItem(KEY)); } catch { return null; } }

  /* Why a person could NOT tap this element now, or null if they could. */
  whyNot(el) {
    if (!el || !el.isConnected) return 'not on screen';
    if (el.disabled) return 'greyed out';
    for (let n = el; n; n = n.parentElement) {
      if (n.hidden) return 'hidden';
      if (n.tagName === 'DIALOG' && !n.hasAttribute('open')) return 'in a closed pop-up';
      if (n.tagName === 'DETAILS' && !n.open && !n.querySelector(':scope > summary')?.contains(el)) return 'inside a closed section';
    }
    const sheet = this.doc.getElementById('sheet');
    if (sheet.hasAttribute('open') && !sheet.contains(el)) return 'behind the pop-up';
    return null;
  }

  label(el) {
    if (!el) return '';
    const attrs = ['data-action', 'data-tab', 'data-outcome', 'data-record-rhythm', 'data-drug', 'data-support', 'data-drug-info', 'data-custom-drug', 'data-key', 'data-equipment', 'data-earlier', 'data-check', 'data-open-check', 'data-reference', 'data-cause-guide',
      'data-confirm-torsades', 'data-back-rhythms', 'data-confirm-magnesium', 'data-select-dose', 'data-edit', 'data-void', 'data-review-checklist', 'data-save-age', 'data-close', 'data-explain-next', 'data-explain-prev', 'id', 'name', 'value', 'type']
      .filter((a) => el.hasAttribute(a)).map((a) => `${a}=${el.getAttribute(a)}`);
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}[${attrs.join(' ')}]${text ? ' "' + text + '"' : ''}`;
  }

  /* Record one step: what was done, then everything visible and saved. */
  async capture(label) {
    await flush();
    const s = this.app.surfaces(), d = this.doc;
    const values = (root) => [...root.querySelectorAll('input,select,textarea')]
      .map((e) => `${e.name || e.id}=${['checkbox', 'radio'].includes(e.type) ? e.checked : e.value}`).join(';');
    const step = {
      label,
      screens: {
        header: s.header,
        main: s.main + '|values=' + values(d.getElementById('main')),
        sheet: s.sheet + '|values=' + values(d.getElementById('sheet')),
        toast: s.toast,
        frame: s.body + '|' + s.nav + '|storageError hidden=' + s.storageError + '|errors=' + this.errors.join(' / '),
        export: this.exported.text,
      },
      saved: { stored: s.stored, jsonExport: this.exported.json },
    };
    this.exported = { text: '', json: '' };
    this.errors = [];
    this.steps.push(step);
    return step;
  }

  /* A field inside a folded section ("+ Add note", "Time: … · Edit"): the person first taps the
     section heading to unfold it (its own step). */
  async #unfold(el) {
    if (!el || !el.isConnected) return;
    const folded = [];
    for (let n = el.parentElement; n; n = n.parentElement)
      if (n.tagName === 'DETAILS' && !n.open && !n.querySelector(':scope > summary')?.contains(el)) folded.unshift(n);
    for (const d of folded) {
      const summary = d.querySelector(':scope > summary');
      if (summary && !this.whyNot(summary)) await this.tap(summary, 'unfold');
    }
  }

  /* Tap an element (selector or element) if a person could; one step either way. */
  async tap(target, note = '') {
    const el = typeof target === 'string' ? this.$(target) : target;
    if (note !== 'unfold') await this.#unfold(el);
    const why = this.whyNot(el);
    if (!why) el.dispatchEvent(new this.win.MouseEvent('click', { bubbles: true, cancelable: true }));
    this.app.tick();
    return this.capture(`tap ${typeof target === 'string' && !el ? target : this.label(el)}${note ? ' (' + note + ')' : ''}${why ? ' [' + why + ': nothing happens]' : ''}`);
  }

  /* Put text in a field as a person typing it would (one step). The weight box also gets the
     "beforeinput" signal the app uses to replace the old weight on the first key. */
  async fill(target, text) {
    const el = typeof target === 'string' ? this.$(target) : target;
    await this.#unfold(el);
    const why = this.whyNot(el);
    if (!why) {
      if (el.tagName === 'SELECT') {
        el.value = text;
      } else {
        el.dispatchEvent(new this.win.InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
        el.value = text; // the person clears the box and types this text
        el.dispatchEvent(new this.win.Event('input', { bubbles: true }));
      }
      el.dispatchEvent(new this.win.Event('change', { bubbles: true }));
    }
    this.app.tick();
    return this.capture(`fill ${typeof target === 'string' && !el ? target : this.label(el)} with "${text}"${why ? ' [' + why + ': nothing happens]' : ''}`);
  }

  /* Move a slider (range input) to a position (one step). */
  async slide(target, value) {
    const el = typeof target === 'string' ? this.$(target) : target;
    const why = this.whyNot(el);
    if (!why) { el.value = String(value); el.dispatchEvent(new this.win.Event('input', { bubbles: true })); el.dispatchEvent(new this.win.Event('change', { bubbles: true })); }
    this.app.tick();
    return this.capture(`slide ${this.label(el) || target} to ${value}${why ? ' [' + why + ': nothing happens]' : ''}`);
  }

  /* Let time pass (one step). The app's 250 ms timer runs once at the new time, as on a phone. */
  async wait(ms, why = '') {
    this.app.advance(ms);
    return this.capture(`wait ${ms} ms${why ? ' (' + why + ')' : ''}`);
  }

  /* The phone was locked (or another app used) for `ms`, then the person comes back (one step). */
  async awayAndBack(ms) {
    this.app.setNow(this.app.now + ms); // the clock moves on; then the app's own "back in view" handler runs
    this.doc.dispatchEvent(new this.win.Event('visibilitychange'));
    return this.capture(`phone away for ${ms} ms, then back to the app`);
  }

  /* Tap the dark area outside the pop-up (one step). */
  async tapOutside() {
    const sheet = this.doc.getElementById('sheet');
    if (sheet.hasAttribute('open')) sheet.dispatchEvent(new this.win.MouseEvent('click', { bubbles: true, cancelable: true, clientX: -5, clientY: -5 }));
    this.app.tick();
    return this.capture('tap outside the pop-up');
  }

  /* Close the app and open it again on what it saved, at the same clock time (one step). */
  async reload() {
    const saved = this.win.localStorage.getItem(KEY);
    this.#open(saved, this.now - T0);
    return this.capture('reload the app from the saved session');
  }

  close() { this.app.window.close(); if (currentDriver === this) currentDriver = null; }
}
