// A30 (D6, owner ruling 15 Nov 2026): RSI text word for word. EAS 9.3 RSI (Rapid Sequence Intubation), p1, p2, p4, p5.
// Step C3 checks the ENGINE and the card file: opened from Guidance, the RSI card shows the fifteen sentences word for
// word, in order, with the fentanyl SBP threshold; "Alternatives, not both" and "Use the full RSI CPG" are gone.
// (A30 cites p1 for the three neuromuscular blockade lines; the PDF prints them on p2, which the card cites:
// DECISIONS.md section 8, to correct in the trace row at C5.)
// Screen checks added at C4: the Guidance RSI section and the RSI pop-up show "Hypertension (SBP > 150 mmHg in an adult)."
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, texts, CARD_TEXT } from './helpers/card-sessions.mjs';

const RSI = ['Administer 2 mcg/kg of fentanyl IV (up to a maximum of 200 mcg) immediately prior to ketamine if the patient has:', 'Traumatic brain injury, or',
  'Suspected intracranial pathology, or', 'Hypertension (SBP > 150 mmHg in an adult).', 'Withhold fentanyl if the above clinical indications are not present, or there are signs of shock.',
  'Administer 2 mg/kg of ketamine IV (up to a maximum of 200 mg) for most patients.', 'Consider reducing the dose to 1 mg/kg if:', 'There are signs of shock, or',
  'Sedative medicines have already been administered or taken.', 'Administer neuromuscular blockade:', '2 mg/kg of rocuronium IV, or', '2 mg/kg of suxamethonium IV.',
  'Do not reduce the dose of ketamine in the setting of RSI for prolonged seizures.', '2 mg/kg of rocuronium or suxamethonium (to a maximum of 200 mg) is an appropriate dose for all patients.',
  'The dose should usually be rounded to the nearest 50 mg in adults.'];

test('A30: the RSI card shows the EAS 9.3 sentences word for word, in order, for an adult and a child', () => {
  for (const weight of ['70', '20']) {
    const rsi = arrest({ weight }).card('rsi', { request: 'rsi' });
    assert.deepEqual(texts(rsi.lines), RSI);
    assert.ok(rsi.lines.every((line) => line.kind === 'guideline'));
  }
});

test('A30: the sentences cite p1, p2, p4 and p5', () => {
  const rsi = arrest().card('rsi', { request: 'rsi' });
  assert.deepEqual(rsi.lines.map((l) => l.source), [...Array(9).fill('EAS 9.3 p1'), ...Array(3).fill('EAS 9.3 p2'), 'EAS 9.3 p4', 'EAS 9.3 p4', 'EAS 9.3 p5']);
});

test('A30: "Alternatives, not both" and "Use the full RSI CPG" are gone', () => {
  assert.doesNotMatch(CARD_TEXT, /Alternatives, not both/);
  assert.doesNotMatch(CARD_TEXT, /Use the full RSI CPG/);
});
