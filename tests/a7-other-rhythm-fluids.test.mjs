// A7 (owner ruling, 11 Nov 2026): "Other" recorded at a no-shock rhythm check is treated as a
// non-shockable rhythm, exactly like PEA and Asystole: fluids card in the lower slot, the fluid
// guidance pop-up, and a caption naming the recorded rhythm. "Not recorded" still changes nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

const MIN = 60000;
const weight = (a, digits) => { a.click('[data-action=weight]'); for (const k of digits) a.click(`[data-key="${k}"]`); a.click('[data-action=save-weight]'); };
const shock = (a, rhythm = 'VF') => { a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=shock]'); a.click(`[data-record-rhythm=${rhythm}]`); };
const noShock = (a, rhythm) => { a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=noshock]'); a.click(`[data-record-rhythm="${rhythm}"]`); };
const start = (a, kg = '70') => { weight(a, kg); a.click('[data-action=start]'); };
const main = a => a.surfaces().main;
const has = (a, id) => main(a).includes(`id="${id}"`);

test('A7: "Other" at the first check shows the fluids card and the pop-up', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  noShock(a, 'Other');
  assert.ok(has(a, 'fluidsCard') && !has(a, 'amiodaronePending') && !has(a, 'amiodaroneCard'));
  assert.match(a.surfaces().sheet, /Non-shockable rhythm · fluid guidance/);
});

test('A7: the fluids caption names "Other" as the recorded rhythm', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  noShock(a, 'Other'); a.click('[data-close]'); a.advance(1000);
  assert.match(main(a), /Other · review fluid volume/);
});

test('A7: after "Other", a VF shock brings amiodarone back (3+ shocks)', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a); shock(a); shock(a); assert.ok(has(a, 'amiodaroneCard'));
  noShock(a, 'Other'); assert.ok(has(a, 'fluidsCard') && !has(a, 'amiodaroneCard'));
  shock(a, 'VF'); assert.ok(has(a, 'amiodaroneCard') && !has(a, 'fluidsCard'));
});

test('A7: torsades history: "Other" gives fluids, then magnesium (never amiodarone) after the next shock', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a, 'Torsades'); a.click('[data-confirm-torsades]');
  noShock(a, 'Other'); assert.ok(has(a, 'fluidsCard'));
  shock(a, 'VF'); assert.ok(has(a, 'magnesiumCard') && !has(a, 'amiodaroneCard'));
});

test('A7: "Unknown" at a no-shock check still does not trigger fluids', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  noShock(a, 'Unknown'); assert.ok(has(a, 'amiodaronePending') && !has(a, 'fluidsCard'));
});
