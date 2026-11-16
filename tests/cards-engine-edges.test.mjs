// CARD ENGINE, edge cases (step C3 review): five things the first engine tests did not pin down, each caught here.
//  1. An older saved "rhythm" entry (event type 'rhythm') is a rhythm check: it decides latest_rhythm and ever_recorded.
//  2. A rhythm check saved with the rhythm "Not recorded" changes nothing (A20), like "Unknown".
//  3. The latest dose is the latest by the time it happened, not by the order it was entered (a corrected time
//     counts), for the timer and the double-tap lock; the same as today's timing() and lockLeft().
//  4. doses_at_least counts the card's OWN drug (a test card file with a magnesium card that uses it).
//  5. A dose timed in the future leaves the lock free, exactly as today's lockLeft (src/engine/drug-cards.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../src/engine/core.js';
import * as drugCards from '../src/engine/drug-cards.js';
import { cardsNow, latestRhythm } from '../src/cards/engine.js';
import { checkCardFile } from '../src/cards/check.js';
import { arrest, CARDS, GUIDELINE_TEXT, MIN, MAX_WEIGHT_KG } from './helpers/card-sessions.mjs';

const lower = (c) => c.at('lower');
// Adds an event straight into the session, as an older version or a correction would have saved it.
const saved = (c, type, extra, at = c.now) => core.add(c.s, type, type, '', at, extra);

test('1. an older "rhythm" entry with PEA brings the fluids card; one with Torsades brings magnesium', () => {
  const c = arrest().shock('VF').advance(MIN);
  saved(c, 'rhythm', { rhythm: 'PEA' });
  assert.equal(latestRhythm(c.s), 'PEA');
  assert.deepEqual(lower(c), ['fluids']);
  const t = arrest().advance(MIN);
  saved(t, 'rhythm', { rhythm: 'Torsades' });
  assert.deepEqual(lower(t), ['magnesium']);
});

test('2. a rhythm check saved as "Not recorded" changes nothing', () => {
  const c = arrest().noShock('PEA').advance(2 * MIN);
  saved(c, 'noshock', { rhythm: 'Not recorded' });
  assert.equal(latestRhythm(c.s), 'PEA');
  assert.deepEqual(lower(c), ['fluids']);
});

test('3. timer and lock count from the dose that happened last, even when it was entered first', () => {
  const c = arrest().advance(5 * MIN).dose('adrenaline');
  const latestAt = c.now;
  saved(c, 'adrenaline', { dose: 1, unit: 'mg' }, latestAt - 3 * MIN); // entered afterwards, timed earlier
  c.advance(MIN);
  const card = c.card('adrenaline');
  assert.equal(card.timer.lastDoseAt, latestAt);
  assert.equal(card.timer.leftMs, 3 * MIN);
  assert.equal(card.timer.leftMs, core.timing(c.s, c.now).adr, 'same as today');
  assert.equal(card.lock.leftMs, 210000 - MIN);
  assert.equal(card.lock.leftMs, drugCards.lockLeft(c.s, 'adrenaline', c.now), 'same as today');
});

test('4. doses_at_least counts the card\'s own drug, not another drug', () => {
  const file = structuredClone(CARDS);
  const magnesium = file.cards.find((card) => card.id === 'magnesium');
  const repeat = { ...structuredClone(magnesium), id: 'magnesium-repeat', group: 'magnesium',
    show_when: ['arrest_running', { ever_recorded: 'Torsades' }, { doses_at_least: 1 }] };
  magnesium.group = 'magnesium';
  file.cards.splice(file.cards.indexOf(magnesium), 0, repeat);
  assert.deepEqual(checkCardFile(file, GUIDELINE_TEXT), [], 'the test card file passes the checker');
  const ids = (c) => cardsNow(file, c.s, c.now, { maxWeightKg: MAX_WEIGHT_KG }).filter((card) => card.place === 'lower').map((card) => card.id);
  assert.deepEqual(ids(arrest().shock('Torsades')), ['magnesium']);
  assert.deepEqual(ids(arrest().shock('Torsades').dose('magnesium', 10, 'mmol')), ['magnesium-repeat']);
  assert.deepEqual(ids(arrest().shock('Torsades').dose('amiodarone', 300).dose('adrenaline')), ['magnesium'], 'other drugs do not count');
  assert.deepEqual(ids(arrest().earlier({ amiodarone: 1 }).shock('Torsades')), ['magnesium'], 'earlier amiodarone does not count');
});

test('5. a dose timed in the future leaves the lock free, as today', () => {
  const c = arrest().advance(MIN);
  saved(c, 'adrenaline', { dose: 1, unit: 'mg' }, c.now + MIN);
  assert.equal(drugCards.lockLeft(c.s, 'adrenaline', c.now), 0, 'today');
  assert.equal(c.card('adrenaline').lock.leftMs, 0);
  const t = arrest().shock('Torsades');
  saved(t, 'magnesium', { dose: 10, unit: 'mmol' }, t.now + 2000);
  assert.equal(drugCards.lockLeft(t.s, 'magnesium', t.now), 0, 'today');
  assert.equal(t.card('magnesium').lock.leftMs, 0);
});
