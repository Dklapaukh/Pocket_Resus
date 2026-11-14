// A18 (doc 07 A-table, approved 14 Nov 2026; owner decision 8): the Tube sizes pop-up (Guidance tab) shows the
// cuffed ETT size and length at lips from the EAS 7.2 band tables (cpg-paediatric-equipment.pdf pages 6, 8, 10,
// 12, 14), not the page 1 age formula. Band = the saved weight rounded up (5, 10, 20, 30, 40 kg); with no weight,
// the saved age gives the band (weight from age, A16). A saved weight wins over the age.
// Adult (over 40 kg, or age 14 and above): "Not shown for adults (over 40 kg or 14 years)." Neither weight nor age:
// "Enter weight or age to show the paediatric ETT size and length at lips." New caution line (EAS 7.2 page 1).
// Before A18: size = age / 4 + 3.5 mm, length = age / 2 + 12 cm (under 1 year: 3-4 mm, ETT size x 3 cm), from the
// age only, up to age 14; no age: "Enter age to show the paediatric ETT and length-at-lips formula results."
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

// typed here from the PDF band tables, independent of the rules file: band kg -> [size, length]
const PDF = { 5: ['3 mm', '9 cm'], 10: ['3 or 4 mm', '12 cm'], 20: ['4 or 5 mm', '15 cm'], 30: ['5 or 6 mm', '17 cm'], 40: ['6 or 7 mm', '19 cm'] };
const ADULT = 'Not shown for adults (over 40 kg or 14 years).';
const NEITHER = 'Enter weight or age to show the paediatric ETT size and length at lips.';
const CAUTION = 'Children may need a different ETT size or length at lips than the table shows; confirm actual fit.';
const bandOf = (kg) => [5, 10, 20, 30, 40].find((b) => kg <= b);

/* Open the Tube sizes pop-up after saving this weight (typed) and / or this age (via "Use age"). */
function tubeSheet({ weight, age } = {}) {
  const app = openApp({ appDir: ROOT });
  if (weight !== undefined) {
    app.click('[data-action=weight]');
    app.type('#weightInput', weight);
    app.click('[data-action=save-weight]');
  }
  app.click('[data-tab=guidance]');
  app.click('[data-reference=tubes]');
  if (age !== undefined) {
    app.type('#referenceAge', age);
    app.click('[data-save-age]');
  }
  const sheet = app.window.document.querySelector('#sheet');
  const lines = [...sheet.querySelectorAll('p')].map((p) => p.textContent);
  return { lines, size: lines.find((l) => l.startsWith('Cuffed ETT:')), length: lines.find((l) => l.startsWith('Length at lips:')), sheet };
}
const expectBand = (got, band, what) => {
  assert.equal(got.size, `Cuffed ETT: ${PDF[band][0]}`, `${what}: size`);
  assert.equal(got.length, `Length at lips: ${PDF[band][1]}`, `${what}: length`);
  assert.ok(!got.lines.includes(ADULT) && !got.lines.includes(NEITHER), `${what}: no message`);
};

test('A18: weight only: every band edge and a weight inside each band shows that band\'s table row', () => {
  for (const w of ['0.5', '3', '5', '5.1', '7.5', '10', '10.1', '15', '20', '20.1', '25', '30', '30.1', '35', '40']) expectBand(tubeSheet({ weight: w }), bandOf(+w), `${w} kg`);
});

test('A18: over 40 kg is adult: no size shown, the adult line instead', () => {
  for (const w of ['40.1', '41', '70', '150']) {
    const got = tubeSheet({ weight: w });
    assert.equal(got.size, undefined, `${w} kg: no size`);
    assert.ok(got.lines.includes(ADULT), `${w} kg: adult line`);
  }
});

test('A18: age only: the band comes from weight from age (A16); age 14 and above is adult', () => {
  const byAge = { '0.5': 5, '1': 10, '1.5': 20, '2': 20, '5': 20, '5.2': 30, '6': 30, '8': 30, '10': 30, '10.5': 40, '11': 40, '13': 40 };
  for (const [age, band] of Object.entries(byAge)) expectBand(tubeSheet({ age }), band, `age ${age}`);
  for (const age of ['13.2', '14', '14.5', '20', '120']) {
    const got = tubeSheet({ age });
    assert.equal(got.size, undefined, `age ${age}: no size`);
    assert.ok(got.lines.includes(ADULT), `age ${age}: adult line`);
  }
});

test('A18: a saved weight wins over the age (15 kg, age 8: 4 or 5 mm, not the 30 kg row)', () => {
  expectBand(tubeSheet({ weight: '15', age: '8' }), 20, '15 kg and age 8');
  expectBand(tubeSheet({ weight: '35', age: '1' }), 40, '35 kg and age 1');
  const adultWeight = tubeSheet({ weight: '60', age: '3' });
  assert.ok(adultWeight.lines.includes(ADULT), '60 kg and age 3: adult by weight');
});

test('A18: neither weight nor age shows the new prompt; the new caution line is always shown', () => {
  const none = tubeSheet();
  assert.equal(none.size, undefined);
  assert.ok(none.lines.includes(NEITHER), 'no weight, no age');
  for (const got of [none, tubeSheet({ weight: '15' }), tubeSheet({ weight: '60' })]) assert.ok(got.lines.includes(CAUTION), 'caution line');
  // age 0 is not an age the weight-from-age rows accept (A16), so it gives no band
  assert.ok(tubeSheet({ age: '0' }).lines.includes(NEITHER), 'age 0: no band');
});
