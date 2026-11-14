// Doc 07 step 2 (12 Nov 2026): the two open storage issues.
// Doc 17: a saved session with missing parts passed the start-up check and then crashed Settings.
// Doc 11: a saved weight with a decimal comma ("15,5") gave NaN fluids and no magnesium band.
// Fix: R.restoreSaved (src/engine/core.js) is used at start-up and for updates from another tab.
// Missing parts get the new-session default, a valid comma weight becomes "15.5" (as normal entry
// saves it), undo copies get the same treatment, and recorded events are never changed. The raw
// original is kept under its own backup key. A complete, normal save is loaded untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT, ported as R } from './helpers/engines.mjs';

const REPAIRED = 'resus-pocket-v1-repaired-backup', UNREADABLE = 'resus-pocket-v1-unreadable-backup';
const stored = (a) => JSON.parse(a.window.localStorage.getItem('resus-pocket-v1'));
const item = (a, key) => a.window.localStorage.getItem(key);
const main = (a) => a.surfaces().main;
const T0 = 1700000000000;

function sessionWith(changes, events = []) {
  const s = R.fresh(T0);
  s.events = events;
  return Object.assign(s, changes);
}
const pea = { id: 'p1', type: 'noshock', title: 'No shock · rhythm check', details: 'PEA', at: T0 + 1000, createdAt: T0 + 1000, rhythm: 'PEA', energy: '' };
const torsadesShock = { id: 't1', type: 'shock', title: 'Shock delivered', details: 'Torsades · 80 J', at: T0 + 1000, createdAt: T0 + 1000, rhythm: 'Torsades', energy: '80' };

test('doc 17: the constructed incomplete save now loads and Settings opens', () => {
  const raw = '{"version":1,"events":[],"appStart":1}';
  const a = openApp({ appDir: ROOT, savedState: raw });
  for (const key of Object.keys(R.fresh(1))) assert.ok(key in stored(a), key + ' filled in');
  assert.deepEqual(stored(a).undo, []);
  assert.equal(item(a, REPAIRED), raw, 'original kept exactly');
  assert.equal(item(a, UNREADABLE), null, 'not treated as unreadable');
  a.click('[data-action=settings]');
  assert.equal(a.window.document.querySelector('#sheet').open, true);
});

test('doc 17: a save missing parts keeps every recorded event exactly', () => {
  const full = sessionWith({ phase: 'Active', deadline: T0 + 120000, cycle: 1, rhythm: 'PEA' }, [pea]);
  for (const part of ['undo', 'remaining', 'priorShocks', 'priorAmio', 'largeText']) delete full[part];
  const a = openApp({ appDir: ROOT, savedState: JSON.stringify(full) });
  assert.deepEqual(stored(a).events, [pea]);
  assert.equal(stored(a).priorAmio, 0);
  assert.ok(Number.isFinite(stored(a).remaining));
  assert.ok(main(a).includes('id="fluidsCard"'));
});

test('doc 11: a saved comma weight shows real fluid volumes after reload (was NaN)', () => {
  const a = openApp({ appDir: ROOT, savedState: JSON.stringify(sessionWith({ weight: '15,5', group: 'Child', rhythm: 'PEA' }, [pea])) });
  assert.equal(stored(a).weight, '15.5');
  assert.doesNotMatch(main(a), /NaN/);
  assert.deepEqual([R.fluidReference(stored(a)).min, R.fluidReference(stored(a)).max], [400, 800]); // 15.5 kg -> 20 kg band (A11): EAS 7.2 table 400 mL, 40 mL/kg x 20 kg
  assert.ok(item(a, REPAIRED).includes('15,5'));
});

test('doc 11: a saved comma weight finds its magnesium band (20 kg band, 4 mmol)', () => {
  const a = openApp({ appDir: ROOT, savedState: JSON.stringify(sessionWith({ weight: '15,5', group: 'Child', rhythm: 'Torsades' }, [torsadesShock])) });
  assert.deepEqual(R.magnesiumReference(stored(a)), R.magnesiumReference({ weight: '15.5', rhythm: 'Torsades', events: [] }));
  assert.equal(R.magnesiumReference(stored(a)).dose, 4);
  assert.ok(main(a).includes('id="magnesiumCard"'));
});

test('doc 11: a comma weight inside an undo copy is converted too', () => {
  const earlier = sessionWith({ weight: '15,5' }); delete earlier.undo;
  const now = sessionWith({ weight: '20', undo: [earlier] });
  const a = openApp({ appDir: ROOT, savedState: JSON.stringify(now) });
  a.click('[data-action=settings]'); a.click('#undo');
  assert.equal(stored(a).weight, '15.5');
});

test('an undo copy that cannot be used is dropped; the usable ones stay', () => {
  const good = sessionWith({ weight: '30' }); delete good.undo;
  const a = openApp({ appDir: ROOT, savedState: JSON.stringify(sessionWith({ weight: '40', undo: [good, { version: 1 }] })) });
  assert.equal(stored(a).undo.length, 1);
  a.click('[data-action=settings]'); a.click('#undo');
  assert.equal(stored(a).weight, '30');
});

test('another tab: same repair for missing parts and comma weight; unusable data still ignored', () => {
  const a = openApp({ appDir: ROOT });
  const send = (value) => a.window.dispatchEvent(new a.window.StorageEvent('storage', { key: 'resus-pocket-v1', newValue: value }));
  const incoming = sessionWith({ weight: '15,5', group: 'Child', weightSource: 'Entered' });
  delete incoming.undo;
  send(JSON.stringify(incoming));
  assert.match(a.window.document.querySelector('#headerWeight').textContent, /15\.5 kg/);
  a.click('[data-action=settings]');
  assert.equal(a.window.document.querySelector('#sheet').open, true);
  send('{"version":1,"events":[]}'); // no start time: not usable
  assert.match(a.window.document.querySelector('#headerWeight').textContent, /15\.5 kg/);
});

test('a complete, normal save loads untouched and no repaired backup is written', () => {
  const first = openApp({ appDir: ROOT });
  first.click('[data-action=weight]'); for (const k of '25') first.click(`[data-key="${k}"]`); first.click('[data-action=save-weight]');
  first.click('[data-action=start]');
  const raw = item(first, 'resus-pocket-v1');
  const a = openApp({ appDir: ROOT, savedState: raw });
  assert.deepEqual(stored(a), JSON.parse(raw));
  assert.equal(item(a, REPAIRED), null);
});
