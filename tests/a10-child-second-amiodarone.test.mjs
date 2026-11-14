// A10 (doc 07 A-table, approved 14 Nov 2026; owner dose rule 3, C6b): EAS 7.2 has one amiodarone row per
// band and no second dose for a child, so the stored half doses (12.5, 25, 50, 75, 100 mg) are deleted and
// the engine gives no second-dose number for a child. The one screen that showed one: a child's amiodarone
// card after two doses are recorded, which showed the half dose (15 kg: "50 mg IV"); owner chose Option B:
// that dose line is now empty. Adults are unchanged (300 mg, then 150 mg).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';
import { Resus as R } from '../src/engine/index.js';
import { readYamlStrict } from '../src/rules/parse.js';
import { checkRuleSet } from '../src/rules/check.js';

const MIN = 60000;
const weight = (a, digits) => { a.click('[data-action=weight]'); for (const k of digits) a.click(`[data-key="${k}"]`); a.click('[data-action=save-weight]'); };
const shock = (a) => { a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=shock]'); a.click('[data-record-rhythm=VF]'); };
const card = (a) => { const m = a.surfaces().main, i = m.indexOf('id="amiodaroneCard"'); assert.ok(i >= 0, 'amiodarone card shown'); return m.slice(i, m.indexOf('</section>', i)); };

/* Weight entered, 3 shocks, dose 1 from the card, 3 more shocks, dose 2 typed in through "Other…". */
function twoDoses(kg, secondMg) {
  const a = openApp({ appDir: ROOT });
  weight(a, kg); a.click('[data-action=start]');
  shock(a); shock(a); shock(a); a.click('[data-drug=amiodarone]');
  shock(a); shock(a); shock(a);
  a.click('[data-custom-drug=amiodarone]'); a.type('#drugForm [name=dose]', secondMg); a.check('#drugForm [name=route][value=IV]'); a.submit('#drugForm');
  return a;
}

for (const [kg, first] of [['3', 25], ['15', 100], ['40', 200]]) {
  test(`A10: ${kg} kg child, two doses recorded: the dose line is empty, no number`, () => {
    const h = card(twoDoses(kg, '33'));
    assert.match(h, /<div class="drug-dose child"><\/div>/, 'empty dose line');
    assert.ok(!/ mg IV/.test(h), 'no dose number on the card');
    assert.ok(!h.includes(`${first / 2} mg`), 'the old half dose is gone');
    assert.match(h, /2 doses recorded/, 'greyed button unchanged');
  });
}

test('A10: adult (70 kg), two doses recorded: still 150 mg IV (unchanged)', () => {
  const h = card(twoDoses('70', '150'));
  assert.match(h, /150 mg IV/);
  assert.match(h, /2 doses recorded/);
});

test('A10: the engine gives a child no second dose at any weight, and an adult 300 / 150 mg', () => {
  for (const kg of ['0.5', '3', '5', '5.1', '10', '15', '20', '30', '40']) {
    const d = R.dose({ weight: kg });
    assert.equal(d.amio2, null, `${kg} kg`);
    assert.ok(d.amio1 > 0, `${kg} kg first dose still given`);
  }
  for (const kg of ['', '40.1', '70']) assert.deepEqual([R.dose({ weight: kg }).amio1, R.dose({ weight: kg }).amio2], [300, 150], `weight "${kg}"`);
});

test('A10: no child band holds a second dose, and the checker refuses one typed back in', () => {
  const file = readYamlStrict(readFileSync(new URL('../src/rules/nz-eas.yaml', import.meta.url), 'utf8'));
  for (const band of file.numbers.childBands) assert.ok(!Object.hasOwn(band, 'amiodaroneSecondMg'), `${band.maxKg} kg`);
  assert.deepEqual(checkRuleSet(file), []);
  const back = structuredClone(file);
  back.numbers.childBands[2] = { maxKg: 20, adrenalineMg: 0.2, amiodaroneFirstMg: 100, amiodaroneSecondMg: 50, magnesiumMmol: 4, shockJ: 80 };
  assert.match(checkRuleSet(back).join('\n'), /numbers\.childBands\.2/);
});
