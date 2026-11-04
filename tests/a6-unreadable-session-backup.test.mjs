// A6 (owner ruling, 4 Nov 2026): a saved session the app cannot read is NOT silently thrown away.
// A raw backup copy is kept and a short message is shown; a new case starts as before.
// Nothing saved at all = no backup and no message. A readable session is untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, defaultLoader } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

const BACKUP = 'resus-pocket-v1-unreadable-backup';
const toastText = a => a.window.document.getElementById('toast').textContent;
const backup = a => a.window.localStorage.getItem(BACKUP);
const stored = a => JSON.parse(a.window.localStorage.getItem('resus-pocket-v1'));

test('A6 garbled text: backup kept, message shown, new case started', () => {
  const junk = '{"version":1,"events":[{"type":"shock"';  // cut off half way
  const a = openApp({ appDir: ROOT, savedState: junk });
  assert.equal(backup(a), junk);
  assert.match(toastText(a), /could not be read.*backup copy was kept.*new case/i);
  assert.equal(stored(a).events.length, 0);
});

test('A6 wrong version or missing parts: also backed up', () => {
  for (const bad of ['{"version":2,"events":[],"appStart":1}', '{"version":1,"events":"x","appStart":1}', '{"version":1,"events":[]}', '[]', '"hello"', '42']) {
    const a = openApp({ appDir: ROOT, savedState: bad });
    assert.equal(backup(a), bad, bad);
    assert.match(toastText(a), /backup copy was kept/i, bad);
  }
});

test('A6 nothing saved (first ever open): no backup, no message', () => {
  const a = openApp({ appDir: ROOT });
  assert.equal(backup(a), null);
  assert.equal(toastText(a), '');
});

test('A6 a readable saved session: loaded as before, no backup, no message', () => {
  const a1 = openApp({ appDir: ROOT });
  const good = a1.window.localStorage.getItem('resus-pocket-v1');
  const a2 = openApp({ appDir: ROOT, savedState: good });
  assert.equal(backup(a2), null);
  assert.equal(toastText(a2), '');
  assert.equal(JSON.parse(good).appStart, stored(a2).appStart);
});

test('A6 the backup survives later saves (the new case does not overwrite it)', () => {
  const junk = 'not json at all';
  const a = openApp({ appDir: ROOT, savedState: junk });
  a.click('[data-action=weight]'); a.click('[data-key="7"]'); a.click('[data-action=save-weight]');
  assert.equal(backup(a), junk);
});

test('A6 storage full: new case still starts, message says no backup could be kept', () => {
  const loader = (w, dir, srcs, dom) => {
    const real = w.Storage.prototype.setItem;
    w.Storage.prototype.setItem = function (k, v) { if (k === BACKUP) throw new Error('full'); return real.call(this, k, v); };
    defaultLoader(w, dir, srcs, dom);
  };
  const a = openApp({ appDir: ROOT, savedState: 'garbled', scriptLoader: loader });
  assert.equal(backup(a), null);
  assert.match(toastText(a), /no backup could be kept/i);
  assert.equal(stored(a).events.length, 0);
});
