// A26 (D8, owner ruling 15 Nov 2026): adult RSI rounding shown. EAS 9.3 RSI (Rapid Sequence Intubation), p2.
// Step C3 checks the ENGINE and the card file: whenever an adult column is used (45 kg, 95 kg) the RSI card's dose
// lines end with the app text "weight rounded up to the next column"; a child (20 kg) does not get it. Rounding is
// unchanged (decision 2): 45 kg uses the 50 kg column, 95 kg the last (100 kg) column, 20 kg the 20 kg column.
// Screen checks added at C4: the RSI pop-up at 45 kg shows "weight rounded up to the next column"; at 20 kg it does not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, texts } from './helpers/card-sessions.mjs';

const LINE = 'weight rounded up to the next column';
const rsi = (weight) => arrest({ weight }).card('rsi', { request: 'rsi' });

for (const [weight, column] of [['45', 50], ['95', 100]]) {
  test('A26: ' + weight + ' kg (adult): the ' + column + ' kg column and the rounding line', () => {
    const dose = rsi(weight).dose;
    assert.equal(dose.who, 'adult');
    assert.deepEqual(dose.lines.filter((l) => l.kind === 'cell').map((l) => l.rowKey), [column, column, column, column]);
    const last = dose.lines.at(-1);
    assert.deepEqual(last, { kind: 'app', text: LINE, source: 'Owner ruling A26 · EAS 9.3 p2' });
  });
}

test('A26: 20 kg (child): the 20 kg column and no rounding line', () => {
  const dose = rsi('20').dose;
  assert.equal(dose.who, 'child');
  assert.deepEqual(dose.lines.map((l) => l.rowKey), [20, 20, 20, 20]);
  assert.ok(!texts(dose.lines).includes(LINE));
});
