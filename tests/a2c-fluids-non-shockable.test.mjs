// A2c (owner ruling, 3 Nov 2026): fluids are offered after ANY non-shockable rhythm (PEA or Asystole) at the latest
// rhythm check. VF/VT bring amiodarone back (magnesium if torsades was ever recorded). "Other" and "Not recorded"
// do not change the lower slot. The engine file src/engine/rhythm-care.js is untouched; the live rule is in state.js.
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

test('A2c: asystole at the first check shows the fluids card (not the grey tile)', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  assert.ok(has(a, 'amiodaronePending'));
  noShock(a, 'Asystole'); assert.ok(has(a, 'fluidsCard') && !has(a, 'amiodaronePending') && !has(a, 'amiodaroneCard'));
  assert.match(main(a), /Fluids/);
});

test('A2c: asystole fluids card can be recorded (button opens the fluids sheet)', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  noShock(a, 'Asystole');
  a.click('[data-support=fluids]');
  assert.ok(a.surfaces().sheet.includes('id="drugForm"'), 'fluids dose sheet opens');
  a.type('#drugForm [name=dose]', '500'); a.submit('#drugForm');
  assert.match(main(a), /fluidsCard/);
});

test('A2c: PEA and asystole behave the same; either one then VF/VT gives the grey tile when fewer than 3 shocks', () => {
  for (const r of ['PEA', 'Asystole']) {
    const a = openApp({ appDir: ROOT }); start(a);
    noShock(a, r); assert.ok(has(a, 'fluidsCard'), r);
    shock(a, 'VT'); assert.ok(has(a, 'amiodaronePending') && !has(a, 'fluidsCard'), r + ' then VT');
  }
});

test('A2c: "Other" as the latest non-shockable rhythm does not trigger fluids (unchanged)', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  noShock(a, 'Other'); assert.ok(has(a, 'amiodaronePending') && !has(a, 'fluidsCard'));
});

test('A2c: the latest rhythm decides: asystole, VF (3 shocks), asystole again: fluids, amiodarone, fluids', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a); shock(a); noShock(a, 'Asystole'); assert.ok(has(a, 'fluidsCard'));
  shock(a, 'VF'); assert.ok(has(a, 'amiodaroneCard'));
  noShock(a, 'Asystole'); assert.ok(has(a, 'fluidsCard') && !has(a, 'amiodaroneCard'));
});

test('A2c: undoing the asystole check returns the lower slot to what it was', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a); shock(a); shock(a); assert.ok(has(a, 'amiodaroneCard'));
  noShock(a, 'Asystole'); assert.ok(has(a, 'fluidsCard'));
  a.click('[data-action=settings]'); a.click('#undo'); assert.ok(has(a, 'amiodaroneCard') && !has(a, 'fluidsCard'));
});

test('A2c: torsades history: asystole shows fluids, then magnesium (never amiodarone) after the next VF', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a, 'Torsades'); a.click('[data-confirm-torsades]'); assert.ok(has(a, 'magnesiumCard'));
  noShock(a, 'Asystole'); assert.ok(has(a, 'fluidsCard'));
  shock(a, 'VF'); assert.ok(has(a, 'magnesiumCard') && !has(a, 'amiodaroneCard'));
});

test('A2c: the engine file is untouched (R.careMode still the original, PEA-only)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(ROOT + '/src/engine/rhythm-care.js', 'utf8');
  assert.ok(src.includes("if(rhythm==='PEA')return 'fluids';"));
  assert.ok(!src.includes('Asystole\'].includes(e.rhythm)'));
});

test('A2c: the fluids card names the actual rhythm (never says PEA after asystole)', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  noShock(a, 'Asystole'); assert.match(main(a), /Asystole · review fluid volume/); assert.doesNotMatch(main(a), /PEA · review fluid volume/);
  noShock(a, 'PEA'); assert.match(main(a), /PEA · review fluid volume/);
});

test('A2c wording (owner Option 1): neutral headings; the pop-up appears after PEA or Asystole, body text unchanged', () => {
  const body = /Correct immediately reversible causes\.\s*<br>Administer 0\.9% sodium chloride IV:<\/blockquote><p>The IV volume reference is 1–2 L in adults, or 20–40 mL\/kg in children\. Assess and treat the reversible cause\./;
  for (const r of ['PEA', 'Asystole']) {
    const a = openApp({ appDir: ROOT }); start(a); noShock(a, r);
    const sheet = a.surfaces().sheet;
    assert.match(sheet, /Non-shockable rhythm · fluid guidance/, r); assert.match(sheet, /Fluids · guideline extract/, r);
    assert.match(sheet, body, r); assert.doesNotMatch(sheet, /PEA · (fluid guidance|guideline extract)/, r);
    assert.ok(sheet.includes('Continue CPR'), r);
  }
});

test('A2c wording: no pop-up after "Other" (only PEA and Asystole)', () => {
  const a = openApp({ appDir: ROOT }); start(a); noShock(a, 'Other');
  assert.doesNotMatch(a.surfaces().sheet, /fluid guidance/);
});
