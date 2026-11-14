// A15 (doc 07 A-table, approved 14 Nov 2026; owner decision 8, recommended option): the Tube sizes pop-up
// (Guidance tab) shows the LMA for the child's band from the EAS 7.2 band tables (cpg-paediatric-equipment.pdf):
// 5 kg "LMA size 1 · cuff 4 mL"; 10 and 20 kg "LMA size 2 · cuff 10 mL"; 30 and 40 kg "LMA size 3 · cuff 20 mL".
// Band as for the tube size (A18): saved weight rounded up, or with no weight the band from the saved age (A16).
// Adult or neither: no LMA line (the A18 adult line or "Enter weight or age…" shows instead).
// The iGel weight list (Intersurgical product information, not an EAS guideline) and its source caption are removed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

// typed here from the PDF band tables, independent of the rules file
const PDF = { 5: 'LMA size 1 · cuff 4 mL', 10: 'LMA size 2 · cuff 10 mL', 20: 'LMA size 2 · cuff 10 mL', 30: 'LMA size 3 · cuff 20 mL', 40: 'LMA size 3 · cuff 20 mL' };
const bandOf = (kg) => [5, 10, 20, 30, 40].find((b) => kg <= b);

/* Open the Tube sizes pop-up after saving this weight and / or this age. Returns its text lines and whole text. */
function tubeSheet({ weight, age } = {}) {
  const app = openApp({ appDir: ROOT });
  if (weight !== undefined) {
    app.click('[data-action=weight]');
    app.type('#weightInput', weight);
    app.click('[data-action=save-weight]');
  }
  app.click('[data-tab=guidance]');
  app.click('[data-reference=tubes]');
  if (age !== undefined) { app.type('#referenceAge', age); app.click('[data-save-age]'); }
  const sheet = app.window.document.querySelector('#sheet');
  const lines = [...sheet.querySelectorAll('p')].map((p) => p.textContent);
  return { lines, lma: lines.filter((l) => l.startsWith('LMA')), text: sheet.textContent };
}

test('A15: weight only: every band edge and a weight inside each band shows that band\'s LMA, once, after the tube length', () => {
  for (const w of ['0.5', '3', '5', '5.1', '7.5', '10', '10.1', '15', '20', '20.1', '25', '30', '30.1', '35', '40']) {
    const got = tubeSheet({ weight: w });
    assert.deepEqual(got.lma, [PDF[bandOf(+w)]], `${w} kg`);
    assert.equal(got.lines.indexOf(got.lma[0]), got.lines.findIndex((l) => l.startsWith('Length at lips:')) + 1, `${w} kg: LMA line follows the length at lips`);
  }
});

test('A15: age only uses the band from age; adult or neither shows no LMA line', () => {
  for (const [age, band] of [['0.5', 5], ['1', 10], ['3', 20], ['7', 30], ['12', 40]]) assert.deepEqual(tubeSheet({ age }).lma, [PDF[band]], `age ${age}`);
  for (const setup of [{ weight: '40.1' }, { weight: '80' }, { age: '14' }, { age: '30' }, {}, { age: '0' }]) assert.deepEqual(tubeSheet(setup).lma, [], JSON.stringify(setup));
  assert.deepEqual(tubeSheet({ weight: '25', age: '1' }).lma, [PDF[30]], 'a saved weight wins over the age');
});

test('A15: the iGel list and its source caption are gone from the Tube sizes pop-up', () => {
  for (const setup of [{}, { weight: '15' }, { weight: '80' }]) {
    const { text } = tubeSheet(setup);
    assert.doesNotMatch(text, /iGel|Intersurgical/, JSON.stringify(setup));
  }
});
