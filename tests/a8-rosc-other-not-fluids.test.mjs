// A8 (owner-approved 12 Nov 2026): a rhythm recorded with ROSC never triggers fluids. Before A8,
// recording ROSC with the rhythm "Other" opened the "Non-shockable rhythm · fluid guidance" pop-up
// (with a "Continue CPR" button) and, after a re-arrest, showed the fluids card. "Other" at a
// NO-SHOCK rhythm check still triggers fluids exactly as A7 says.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT, ported as R } from './helpers/engines.mjs';

const MIN = 60000;
const shock = (a, rhythm = 'VF') => { a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=shock]'); a.click(`[data-record-rhythm=${rhythm}]`); };
const noShock = (a, rhythm) => { a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=noshock]'); a.click(`[data-record-rhythm="${rhythm}"]`); };
const rosc = (a, rhythm) => { a.advance(30000); a.click('[data-outcome=rosc]'); a.click(`[data-record-rhythm="${rhythm}"]`); };
const rearrest = (a) => { a.click('[data-tab=live]'); a.click('[data-action=rearrest]'); a.advance(1000); };
const has = (a, id) => a.surfaces().main.includes(`id="${id}"`);

test('A8: ROSC recorded as "Other" opens the post-ROSC checklist, not the fluid pop-up', () => {
  const a = openApp({ appDir: ROOT }); a.click('[data-action=start]');
  shock(a);
  rosc(a, 'Other');
  assert.match(a.surfaces().sheet, /\|open=false$/);
  assert.doesNotMatch(a.surfaces().sheet, /fluid guidance/);
  assert.match(a.surfaces().main, /Post ROSC checklist/);
});

test('A8: after ROSC "Other" and a re-arrest, the lower card is not fluids (earlier VF shock)', () => {
  const a = openApp({ appDir: ROOT }); a.click('[data-action=start]');
  shock(a);
  rosc(a, 'Other'); rearrest(a);
  assert.ok(has(a, 'amiodaronePending') && !has(a, 'fluidsCard'));
});

test('A8: the same with no rhythm check before ROSC', () => {
  const a = openApp({ appDir: ROOT }); a.click('[data-action=start]');
  rosc(a, 'Other'); rearrest(a);
  assert.ok(has(a, 'amiodaronePending') && !has(a, 'fluidsCard'));
});

test('A8: a non-shockable rhythm before ROSC still decides the card after a re-arrest', () => {
  const a = openApp({ appDir: ROOT }); a.click('[data-action=start]');
  noShock(a, 'PEA'); a.click('[data-close]');
  rosc(a, 'Other'); rearrest(a);
  assert.ok(has(a, 'fluidsCard'));
  assert.match(a.surfaces().main, /PEA · review fluid volume/);
});

test('A8: "Other" at a no-shock check still gives the fluids card and pop-up (A7 unchanged)', () => {
  const a = openApp({ appDir: ROOT }); a.click('[data-action=start]');
  noShock(a, 'Other');
  assert.ok(has(a, 'fluidsCard'));
  assert.match(a.surfaces().sheet, /Non-shockable rhythm · fluid guidance/);
});

test('A8 engine: a ROSC rhythm never decides the lower card', () => {
  const s = R.fresh(1000);
  R.begin(s, 1000);
  assert.equal(R.check(s, 'rosc', 'Other', '', 2000), true);
  R.begin(s, 3000); // re-arrest
  assert.equal(R.lowerCard(s), 'amiodarone');
  assert.equal(R.latestLowerRhythm(s), 'Not recorded');
});
