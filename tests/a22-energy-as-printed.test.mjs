// A22 (D3, owner ruling 15 Nov 2026): shock energy as printed. EAS 7.2 p5, p8, p10, p12, p14; EAS 3.14 p1.
// Step C3 checks the ENGINE and the card file: each child band gives the EAS 7.2 range as printed (low and high);
// an adult gives "Maximum joule setting for an adult."; the energy card records nothing (nothing is pre-filled).
// Screen checks added at C4: the Live header reads "80-100 J" at 15 kg and "Maximum joule setting for an adult." at
// 60 kg; the shock record sheet's energy box is empty and the saved energy equals what was typed; age 6 gives
// "120-150 J". (The old a1 test moves to this row at C4/C5.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, texts } from './helpers/card-sessions.mjs';

const PRINTED = { 5: [20, 25], 10: [40, 50], 20: [80, 100], 30: [120, 150], 40: [160, 200] };

for (const [weight, band] of [['4', 5], ['10', 10], ['15', 20], ['30', 30], ['33', 40]]) {
  test('A22: ' + weight + ' kg: the ' + band + ' kg band energy as printed, ' + PRINTED[band].join('-') + ' J', () => {
    const energy = arrest({ weight }).card('shock-energy');
    assert.deepEqual(energy.dose.lines, [{ kind: 'cell', table: 'eas72', column: 'shockRangeJ', value: PRINTED[band], rowKey: band, source: 'EAS 7.2 p5, p8, p10, p12, p14' }]);
  });
}

test('A22: an adult (60 kg, or no weight) gets the EAS 3.14 words, no number', () => {
  for (const weight of ['60', '']) {
    assert.deepEqual(texts(arrest({ weight }).card('shock-energy').dose.lines), ['Maximum joule setting for an adult.']);
  }
});

test('A22: the energy card records nothing, so nothing can be pre-filled on the shock sheet', () => {
  const energy = arrest({ weight: '15' }).card('shock-energy');
  assert.equal(energy.record, null);
  assert.equal(energy.doses, null);
});
