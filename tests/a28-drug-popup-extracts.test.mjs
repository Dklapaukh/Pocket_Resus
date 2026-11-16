// A28 (D6, owner ruling 15 Nov 2026): adrenaline and amiodarone pop-ups word for word. EAS 3.14 p1; EAS 14.3 p2;
// EAS 14.4 p1, p3.
// Step C3 checks the ENGINE and the card file: the adrenaline pop-up lines, the amiodarone pop-up lines (with the four
// contraindications) for both amiodarone cards, and the A23 dose lines "300 mg IV for an adult." and "150 mg IV for an
// adult." (child as A23).
// Screen checks added at C4: the adrenaline and amiodarone Administration pop-ups show these lines; the amiodarone
// pop-up lists the four contraindications.
// Step C4 (owner decision 22, A37 item 5, which wins on what is drawn): the adrenaline pop-up draws the two EAS 14.3
// how-to-give sentences; the lead-ins "Administer adrenaline IV every four minutes:" and "Cardiac arrest:" stay in the
// card file as trace-only lines (checked here). The amiodarone pop-up is unchanged (A37 item 6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, texts, fileLines, CARDS } from './helpers/card-sessions.mjs';

const ADRENALINE = ['Administer adrenaline IV every four minutes:', 'Cardiac arrest:',
  'Adults and children whose weight has been rounded to 50 kg or more: administer undiluted as an IV bolus.',
  'Children whose weight has been rounded to 40 kg or less: dilute 1 mg of adrenaline to a total of 10 ml using 0.9% sodium chloride. This solution is 1:10,000 and contains 0.1 mg/ml. Draw up the dose from this solution and administer as an IV bolus.'];
const AMIODARONE = ['Cardiac arrest: administer IV undiluted as a bolus.', 'Contraindications', 'Known severe allergy.', 'Known severe allergy to iodine.',
  'VT secondary to cyclic antidepressant poisoning. In this setting amiodarone administration can be associated with severe worsening of shock, without resolution of the rhythm.',
  'If torsades de pointes is present or has occurred.'];

test('A28: the adrenaline pop-up, word for word, for an adult and a child', () => {
  for (const weight of ['70', '15']) {
    const adrenaline = arrest({ weight }).card('adrenaline');
    assert.deepEqual(texts(adrenaline.details), ADRENALINE.slice(2));
    assert.deepEqual(adrenaline.details.map((l) => l.source), ['EAS 14.3 p2', 'EAS 14.3 p2']);
  }
  assert.deepEqual(fileLines('adrenaline', 'details'), [ADRENALINE[0] + ' [trace]', ADRENALINE[1] + ' [trace]', ...ADRENALINE.slice(2)]);
  assert.deepEqual(CARDS.cards.find((c) => c.id === 'adrenaline').details.map((l) => l.source), ['EAS 3.14 p1', 'EAS 14.3 p2', 'EAS 14.3 p2', 'EAS 14.3 p2']);
});

test('A28: the amiodarone pop-up with its four contraindications, on the first- and second-dose cards', () => {
  const c = arrest({ weight: '70' }).shock().shock().shock();
  assert.deepEqual(texts(c.card('amiodarone-1').details), AMIODARONE);
  assert.deepEqual(texts(c.card('amiodarone-1').dose.lines), ['300 mg IV for an adult.']);
  c.dose('amiodarone', 300).shock().shock().shock();
  assert.deepEqual(texts(c.card('amiodarone-2').details), AMIODARONE);
  assert.deepEqual(texts(c.card('amiodarone-2').dose.lines), ['150 mg IV for an adult.']);
});

test('A28: a child gets the band dose for the first amiodarone dose (as A23)', () => {
  const c = arrest({ weight: '15' }).shock().shock().shock();
  assert.deepEqual(texts(c.card('amiodarone-1').dose.lines), ['cell:amiodaroneFirstMg=100']);
});
