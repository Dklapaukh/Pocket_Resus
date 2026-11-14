// A19 (doc 07 A-table, approved 15 Nov 2026, owner option C; replaces the calculated upper end of A11): a child's
// fluids card and Administration pop-up show the EAS 7.2 table volume of the weight band (rounded up to 5, 10, 20,
// 30, 40 kg: 100, 200, 400, 600, 800 mL) and NO upper number. The pop-up's source line says in words that
// EAS 3.14 allows up to 40 mL/kg. Nothing is calculated. Adults (over 40 kg) and "Enter weight" are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT, ported } from './helpers/engines.mjs';

const MIN = 60000;
const weight = (a, digits) => { a.click('[data-action=weight]'); for (const k of digits) a.click(`[data-key="${k}"]`); a.click('[data-action=save-weight]'); };
/* Start a case (with this weight, or none) and record PEA at a no-shock check, so the fluids card fills the lower slot. */
function fluidsCase(kg) {
  const a = openApp({ appDir: ROOT });
  if (kg !== null) weight(a, kg);
  a.click('[data-action=start]');
  a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=noshock]'); a.click('[data-record-rhythm="PEA"]');
  return a;
}
const card = (a) => { const m = a.surfaces().main, i = m.indexOf('id="fluidsCard"'); assert.ok(i >= 0, 'fluids card shown'); return m.slice(i, m.indexOf('</section>', i)); };
const popup = (a) => { a.click('[data-drug-info=fluids]'); return a.surfaces().sheet; };

// [weight, band, table volume mL]: every band edge and a weight inside each band
const CHILD = [['3', 5, 100], ['5', 5, 100], ['5.1', 10, 200], ['7', 10, 200], ['10', 10, 200], ['10.1', 20, 400], ['15', 20, 400],
  ['20', 20, 400], ['20.1', 30, 600], ['25', 30, 600], ['30', 30, 600], ['30.1', 40, 800], ['35', 40, 800], ['40', 40, 800]];

for (const [kg, band, ml] of CHILD) {
  test(`A19: ${kg} kg child: card and pop-up show "${ml} mL IV" (${band} kg band), no upper number, approved source line`, () => {
    const a = fluidsCase(kg);
    assert.ok(card(a).includes(`<div class="drug-dose">${ml} mL IV</div>`), 'card volume is the table volume only');
    assert.doesNotMatch(card(a), /\d–\d+ mL/, 'no range on the card');
    const sh = popup(a);
    assert.ok(sh.includes(`<b>${ml} mL IV</b> · `), 'pop-up volume is the table volume only');
    assert.doesNotMatch(sh, /\d–\d+ mL IV/, 'no range in the pop-up');
    // the app shows each "EAS x.y" source as an italic "EAS guideline x.y" (formatGuidelineReference)
    assert.ok(sh.includes(`<b>${ml} mL IV</b> · Child · ${band} kg CPG band (rounded up) · ${ml} mL from the <em>EAS guideline 7.2</em> table (20 mL/kg); <em>EAS guideline 3.14</em> allows up to 40 mL/kg</p>`), 'approved source line, exactly');
  });
}

test('A19: the engine gives a child the table volume and no upper number (nothing calculated)', () => {
  for (const [kg, , ml] of CHILD) {
    const ref = ported.fluidReference({ weight: kg });
    assert.deepEqual([ref.min, ref.max], [ml, null], `${kg} kg`);
  }
});

test('A19: the 20 and 40 in the source line come from the rule set', () => {
  assert.equal(ported.RULES.numbers.child.fluidsMinMlPerKg, 20);
  assert.equal(ported.RULES.numbers.child.fluidsMaxMlPerKg, 40);
  assert.ok(ported.fluidReference({ weight: '15' }).basis.endsWith('(20 mL/kg); EAS 3.14 allows up to 40 mL/kg'));
});

for (const kg of ['40.1', '70']) {
  test(`A19: ${kg} kg adult: 1000–2000 mL and the adult source line (unchanged)`, () => {
    const a = fluidsCase(kg);
    assert.ok(card(a).includes('<div class="drug-dose">1000–2000 mL IV</div>'));
    const sh = popup(a);
    assert.ok(sh.includes('<b>1000–2000 mL IV</b> · Adult · <em>EAS guideline 3.14</em></p>'));
    assert.ok(!sh.includes('CPG band'));
  });
}

test('A19: no weight entered: "Enter weight" (unchanged)', () => {
  const a = fluidsCase(null);
  assert.ok(card(a).includes('<div class="drug-dose">Enter weight</div>'));
  assert.ok(popup(a).includes('<b>Enter weight</b> · Enter weight for a volume reference</p>'));
});
