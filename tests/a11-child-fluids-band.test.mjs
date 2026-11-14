// A11 (doc 07 A-table, approved 14 Nov 2026; owner dose rules 1 and 2): a child's fluid volume comes from the
// weight BAND (rounded up to 5, 10, 20, 30, 40 kg). Lower end = the EAS 7.2 table 20 mL/kg volume of the band
// (100, 200, 400, 600, 800 mL); upper end = 40 mL/kg x the band weight (EAS 3.14 formula), with the working in
// the pop-up's source line. Before A11: 20-40 mL/kg of the exact weight. Adults (over 40 kg) unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

const MIN = 60000;
const weight = (a, digits) => { a.click('[data-action=weight]'); for (const k of digits) a.click(`[data-key="${k}"]`); a.click('[data-action=save-weight]'); };
/* Start a case at this weight and record PEA at a no-shock check, so the fluids card fills the lower slot. */
function fluidsCase(kg) {
  const a = openApp({ appDir: ROOT });
  weight(a, kg); a.click('[data-action=start]');
  a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=noshock]'); a.click('[data-record-rhythm="PEA"]');
  return a;
}
const card = (a) => { const m = a.surfaces().main, i = m.indexOf('id="fluidsCard"'); assert.ok(i >= 0, 'fluids card shown'); return m.slice(i, m.indexOf('</section>', i)); };
const popup = (a) => { a.click('[data-drug-info=fluids]'); return a.surfaces().sheet; };

// [weight, band, lower mL, upper mL]
const CHILD = [['0.5', 5, 100, 200], ['3', 5, 100, 200], ['5', 5, 100, 200], ['5.1', 10, 200, 400], ['7.5', 10, 200, 400],
  ['10', 10, 200, 400], ['10.1', 20, 400, 800], ['12', 20, 400, 800], ['15', 20, 400, 800], ['20', 20, 400, 800],
  ['20.1', 30, 600, 1200], ['25', 30, 600, 1200], ['30', 30, 600, 1200], ['30.1', 40, 800, 1600], ['35', 40, 800, 1600], ['40', 40, 800, 1600]];

for (const [kg, band, lower, upper] of CHILD) {
  test(`A11: ${kg} kg child: ${lower}–${upper} mL from the ${band} kg band, working shown in the pop-up`, () => {
    const a = fluidsCase(kg);
    assert.match(card(a), new RegExp(`<div class="drug-dose">${lower}–${upper} mL IV</div>`), 'card volume');
    const sh = popup(a);
    assert.match(sh, new RegExp(`<b>${lower}–${upper} mL IV</b>`), 'pop-up volume');
    // the app shows each "EAS x.y" source as an italic "EAS guideline x.y" (formatGuidelineReference)
    assert.ok(sh.includes(`Child · ${band} kg CPG band (rounded up) · ${lower} mL from the <em>EAS guideline 7.2</em> table; 40 mL/kg × ${band} kg = ${upper} mL (<em>EAS guideline 3.14</em>)`), 'pop-up working and sources');
  });
}

for (const kg of ['40.1', '70']) {
  test(`A11: ${kg} kg adult: 1000–2000 mL (unchanged)`, () => {
    const a = fluidsCase(kg);
    assert.match(card(a), /<div class="drug-dose">1000–2000 mL IV<\/div>/);
    assert.ok(!popup(a).includes('CPG band'));
  });
}
