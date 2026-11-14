// A12 (doc 07 A-table, approved 14 Nov 2026; owner dose rules 1 and 3, decision 2): the RSI dose pop-up
// (Guidance tab) shows the doses from the EAS 9.3 dose summary tables (cpg-rsi.pdf page 2), not weight x per kg.
// A child uses the weight band, rounded up (5, 10, 20, 30, 40 kg); the 5 kg band has no column, so all four
// lines read "Seek clinical advice" with no number. An adult (over 40 kg) uses the next column up (50 to 90 kg);
// 91 kg and above use the "≥ 100 kg" column. Owner, 14 Nov 2026: show the outcome only (no column or working on
// screen); the top line keeps the weight and reads "guideline table references, not recorded administrations".
// Before A12: weight x 2 mcg/kg (fentanyl), 2 or 1 mg/kg (ketamine), 2 mg/kg (blocker; adults to the nearest
// 50 mg), each capped at 200, from the exact weight.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';
import { Resus as R } from '../src/engine/index.js';

// The EAS 9.3 tables, typed here from cpg-rsi.pdf page 2 (independent of the rules file):
// column kg: [fentanyl mcg, ketamine usual mg, ketamine reduced mg, rocuronium or suxamethonium mg]
const PDF = {
  10: [20, 20, 10, 20], 20: [40, 40, 20, 40], 30: [60, 60, 30, 60], 40: [80, 80, 40, 80], // paediatric table
  50: [100, 100, 50, 100], 60: [120, 120, 60, 100], 70: [140, 140, 70, 150], // adult table
  80: [160, 160, 80, 150], 90: [180, 180, 90, 200], 100: [200, 200, 100, 200], // 100 = "≥ 100 kg"
};
const SEEK = 'Seek clinical advice';

/* The column the row says to use, or null for the 5 kg band (no column). */
function expectedColumn(kg) {
  if (kg <= 5) return null;
  if (kg <= 40) return [10, 20, 30, 40].find((band) => kg <= band);
  return Math.min(Math.ceil(kg / 10) * 10, 100);
}

/* Open the RSI pop-up at this weight; returns its top line, the four dose lines and the saved session. */
function rsiPopup(weight) {
  const app = openApp({ appDir: ROOT });
  app.click('[data-action=weight]');
  app.type('#weightInput', weight);
  app.click('[data-action=save-weight]');
  app.click('[data-tab=guidance]');
  app.click('[data-reference=rsi]');
  const doc = app.window.document;
  return {
    top: doc.querySelector('#sheet p').textContent,
    doses: [...doc.querySelectorAll('#sheet dd')].map((dd) => dd.textContent),
    saved: JSON.parse(app.window.localStorage.getItem('resus-pocket-v1')),
  };
}

// every column edge, a weight inside each column, and above the last column
const WEIGHTS = ['0.5', '3', '5', '5.1', '7.5', '10', '10.1', '15', '20', '20.1', '25', '30', '30.1', '35', '40', '40.1', '45',
  '50', '50.1', '60', '60.1', '65', '70', '70.1', '80', '80.1', '90', '90.1', '91', '100', '100.1', '120', '250'];

for (const weight of WEIGHTS) {
  const column = expectedColumn(Number(weight));
  test(`A12: ${weight} kg → ${column === null ? 'Seek clinical advice (5 kg band)' : `${column} kg column of the EAS 9.3 table`}`, () => {
    const { top, doses, saved } = rsiPopup(weight);
    assert.equal(top, `${weight} kg · guideline table references, not recorded administrations`, 'top line: weight and outcome only');
    if (column === null) assert.deepEqual(doses, [SEEK, SEEK, SEEK, SEEK]);
    else {
      const [fentanyl, ketamine, reduced, blocker] = PDF[column];
      assert.deepEqual(doses, [`${fentanyl} mcg IV`, `${ketamine} mg IV`, `${reduced} mg IV`, `${blocker} mg IV`]);
    }
    const medicines = saved.events.filter((event) => ['medicine', 'adrenaline', 'amiodarone'].includes(event.type));
    assert.equal(medicines.length, 0, 'opening the pop-up records nothing');
  });
}

test('A12: the engine gives the table column for every weight 0.1 to 500 kg (0.1 kg steps) and edge values', () => {
  const weights = [40.0001, 90.0001, 99.9999, 100.0001];
  for (let i = 1; i <= 5000; i++) weights.push(i / 10);
  for (const kg of weights) {
    const column = expectedColumn(kg), d = R.rsiDoses(kg);
    if (column === null) { assert.equal(d, null, `${kg} kg`); continue; }
    assert.deepEqual([d.fentanylMcg, d.ketamineMg, d.reducedKetamineMg, d.blockerMg], PDF[column], `${kg} kg`);
  }
});

test('A12: the rules file holds the EAS 9.3 tables exactly as the PDF', () => {
  const { paediatric, adult } = R.RULES.numbers.rsi.tables;
  const rows = (table) => Object.fromEntries(table.map((c) => [c.columnKg, [c.fentanylMcg, c.ketamineMg, c.reducedKetamineMg, c.blockerMg]]));
  assert.deepEqual({ ...rows(paediatric), ...rows(adult) }, PDF);
  assert.deepEqual(paediatric.map((c) => c.columnKg), [10, 20, 30, 40]);
  assert.deepEqual(adult.map((c) => c.columnKg), [50, 60, 70, 80, 90, 100]);
});

test('A12: the Guidance-tab RSI extract (per-kg doses and maximums) and the conditions text are unchanged', () => {
  assert.deepEqual(R.guideText('guidanceRsi'), [
    'Fentanyl: 2 mcg/kg IV, maximum 200 mcg. Only when indicated for TBI, suspected intracranial pathology or hypertension; withhold with shock.',
    'Ketamine: 2 mg/kg IV, maximum 200 mg. Consider 1 mg/kg with shock / prior sedation; do not reduce for prolonged seizures.',
    'Rocuronium <b>or</b> suxamethonium: 2 mg/kg IV, maximum 200 mg. Adult dose usually rounded to nearest 50 mg. Alternatives, not both.',
    'Use the full RSI CPG for patient context and administration.',
  ]);
  const { doses } = rsiPopup('20');
  assert.equal(doses.length, 4);
  assert.equal(R.guideText('rsiConditions'), 'Fentanyl only for TBI, suspected intracranial pathology or hypertension; withhold with shock. Consider reduced ketamine with shock / prior sedation; do not reduce for prolonged seizures. Neuromuscular blockers are alternatives, not both.');
});
