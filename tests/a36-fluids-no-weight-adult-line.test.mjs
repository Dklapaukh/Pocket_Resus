// A36 (owner decision 23f, 16 Nov 2026): fluids with no weight entered show the adult line "1-2 litres IV for an
// adult." (v24 shows "Enter weight"), the same rule as the adrenaline, amiodarone and magnesium cards (decision 2,
// D11: no weight means adult doses). EAS 3.14 Cardiac Arrest, p2.
// Step C4 part 1 checks the ENGINE and the card file: no weight, PEA: the fluids card shows with the adult line, the
// same "adult" choice the other drug cards make with no weight; nothing is pre-filled (the amount is typed).
// Screen check added at C4 part 2 (when the screens are rewired): no weight, PEA: the Live lower card reads
// "1-2 litres IV for an adult." and not "Enter weight".
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, texts } from './helpers/card-sessions.mjs';

const ADULT = '1-2 litres IV for an adult.';

test('A36: no weight, PEA: the fluids card shows the adult line', () => {
  const fluids = arrest().noShock('PEA').card('fluids');
  assert.equal(fluids.dose.who, 'adult');
  assert.deepEqual(texts(fluids.dose.lines), [ADULT]);
  assert.deepEqual(fluids.dose.lines[0], { kind: 'guideline', text: ADULT, source: 'EAS 3.14 p2' });
  assert.deepEqual(fluids.record, { drug: 'fluids', amount: 'typed', unit: 'mL', value: null }, 'nothing pre-filled: the clinician types the amount');
});

test('A36: the same rule as the other drug cards: with no weight every dose line is the adult line', () => {
  const c = arrest().shock('Torsades').noShock('PEA');
  for (const id of ['adrenaline', 'magnesium', 'fluids']) assert.equal(c.card(id).dose.who, 'adult', id);
  const amio = arrest().shock().shock().shock().card('amiodarone-1');
  assert.deepEqual(texts(amio.dose.lines), ['300 mg IV for an adult.']);
});

test('A36: a weight entered still decides (20 kg: the table volume; 70 kg: the adult line); a weight that is not valid shows no dose, as today', () => {
  assert.deepEqual(texts(arrest({ weight: '20' }).noShock('PEA').card('fluids').dose.lines), ['cell:fluidsTableMl=400']);
  assert.deepEqual(texts(arrest({ weight: '70' }).noShock('PEA').card('fluids').dose.lines), [ADULT]);
  assert.deepEqual(arrest({ weight: 'abc' }).noShock('PEA').card('fluids').dose, { who: null, lines: [] });
});
