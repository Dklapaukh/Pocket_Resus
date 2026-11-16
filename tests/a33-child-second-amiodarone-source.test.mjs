// A33 (D9, owner ruling 16 Nov 2026): child second amiodarone dose stays "Seek clinical advice" (A10), with the
// EAS 3.14 p1 sentence and the app-text one-dose line. EAS 3.14 p1; EAS 7.2 p5, p8, p10, p12, p14.
// Step C3 checks the ENGINE and the card file: 15 kg, one dose, 6 shocks in VF: the second-dose card's child lines are
// "Seek clinical advice" (app text, citing owner rulings A10 and A33), "See the paediatric drug dose tables for a
// child." (EAS 3.14 p1) and "The EAS 7.2 tables print one amiodarone dose per band." (app text); no number to record.
// An adult never sees these lines.
// Screen checks added at C4: the Live lower card (child, second-dose state) and the amiodarone pop-up show them; how
// the two lines under "Seek clinical advice" are drawn is owner question 1c (DECISIONS.md section 6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest } from './helpers/card-sessions.mjs';

const second = (weight) => arrest({ weight }).shock().shock().shock().dose('amiodarone', 100).shock().shock().shock().card('amiodarone-2');

test('A33: 15 kg, dose 1, 6 shocks: "Seek clinical advice" with the EAS 3.14 sentence and the one-dose line', () => {
  const card = second('15');
  assert.deepEqual(card.dose, { who: 'child', lines: [
    { kind: 'app', text: 'Seek clinical advice', source: 'Owner ruling A10 · Owner ruling A33 · EAS 3.14 p1' },
    { kind: 'guideline', text: 'See the paediatric drug dose tables for a child.', source: 'EAS 3.14 p1' },
    { kind: 'app', text: 'The EAS 7.2 tables print one amiodarone dose per band.', source: 'Owner ruling A33 · EAS 7.2 p5, p8, p10, p12, p14' },
  ] });
  assert.equal(card.record.value, null, 'no number: nothing can be recorded from the card');
});

test('A33: an adult sees "150 mg IV for an adult." and none of the child lines', () => {
  const card = second('70');
  assert.deepEqual(card.dose.lines.map((l) => l.text), ['150 mg IV for an adult.']);
  assert.equal(card.record.value, 150);
});
