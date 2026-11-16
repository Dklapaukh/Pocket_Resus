// Child second amiodarone dose: "Seek clinical advice" ONLY (owner decision 23c, 16 Nov 2026; A10, D9).
// This test was the C3 engine-level test of A33, which added two lines under "Seek clinical advice" (the EAS 3.14
// sentence "See the paediatric drug dose tables for a child." and the app text "The EAS 7.2 tables print one
// amiodarone dose per band."). The owner then withdrew A33 (decision 23c: "the A33 lines are dropped; a child's second
// amiodarone dose shows 'Seek clinical advice' only"). So step C4 moves this test to that ruling: an owner ruling, not a
// loosening. The file keeps its name so the history of the row can be followed.
// Checked: 15 kg, one dose, 6 shocks in VF: the second-dose card's child dose is the one app-text line "Seek clinical
// advice" (citing owner ruling A10 and EAS 3.14 p1), with no number to record; neither A33 line is anywhere in the card
// file (not even as a trace-only line: they were app additions, not trimmed guideline text). An adult sees 150 mg.
// Screen check added at C4 part 2: the Live lower card and the amiodarone pop-up for a child show "Seek clinical advice"
// and no other dose line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, CARD_TEXT, fileLines } from './helpers/card-sessions.mjs';

const second = (weight) => arrest({ weight }).shock().shock().shock().dose('amiodarone', 100).shock().shock().shock().card('amiodarone-2');

test('decision 23c: 15 kg, dose 1, 6 shocks: "Seek clinical advice" only, nothing to record', () => {
  const card = second('15');
  assert.deepEqual(card.dose, { who: 'child', lines: [
    { kind: 'app', text: 'Seek clinical advice', source: 'Owner ruling A10 · EAS 3.14 p1' },
  ] });
  assert.equal(card.record.value, null, 'no number: nothing can be recorded from the card');
  assert.deepEqual(fileLines('amiodarone-2', 'dose.child'), ['Seek clinical advice [app]']);
});

test('decision 23c: the two A33 lines are gone from the card file', () => {
  assert.doesNotMatch(CARD_TEXT, /The EAS 7\.2 tables print one amiodarone dose per band/);
  assert.doesNotMatch(CARD_TEXT, /Owner ruling A33/);
  assert.ok(!fileLines('amiodarone-2', 'dose.child').some((line) => /See the paediatric drug dose tables/.test(line)));
});

test('decision 23c: an adult sees "150 mg IV for an adult." and none of the child lines', () => {
  const card = second('70');
  assert.deepEqual(card.dose.lines.map((l) => l.text), ['150 mg IV for an adult.']);
  assert.equal(card.record.value, 150);
});
