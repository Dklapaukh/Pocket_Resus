// A25 (D7, owner ruling 15 Nov 2026): whole years and whole kg. EAS 7.2 p5, p8, p10, p12, p14 (whole-year headings).
// Step C3 checks the ENGINE and the card file: the age rows are whole years (0 = under 1 year) running on with no
// gap; a whole-kg weight finds its band; a weight already saved with a decimal (an older session) is kept as saved
// and still finds its band (rounded up), as today.
// Screen checks added at C4: the weight keypad has no decimal point and a decimal is refused with "Enter a whole
// number of kg above zero and no more than {maxKg} kg."; the age box takes whole years 1 to 14 plus "under 1 year"
// (age 5.5 not accepted); the age captions lose "Age rounded up to the next whole year."
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, CARDS } from './helpers/card-sessions.mjs';

test('A25: the age rows are whole years, from under 1 year (0) to 13, with no gap', () => {
  const ages = CARDS.tables.eas72.rows.map((row) => row.ageYears);
  assert.deepEqual(ages, [[0, 0], [1, 1], [2, 5], [6, 10], [11, 13]]);
  for (const [from, to] of ages) assert.ok(Number.isInteger(from) && Number.isInteger(to));
});

test('A25: whole-kg weights find their band', () => {
  for (const [weight, band] of [['5', 5], ['6', 10], ['20', 20], ['21', 30], ['40', 40]]) {
    assert.equal(arrest({ weight }).card('adrenaline').dose.lines[0].rowKey, band, weight + ' kg');
  }
});

test('A25: a weight saved with a decimal by an older version is kept as saved and still finds its band', () => {
  const c = arrest({ weight: '15.5' });
  assert.equal(c.s.weight, '15.5');
  assert.equal(c.card('adrenaline').dose.lines[0].rowKey, 20);
  assert.equal(c.s.weight, '15.5', 'the engine does not change the saved weight');
});
