// A23 (D4, owner ruling 15 Nov 2026): amiodarone in VF or VT only. EAS 3.14 Cardiac Arrest, p1, p2.
// Step C3 checks the ENGINE and the card file: 3 earlier shocks with no rhythm recorded: no card; VF: the card with
// the three-shock sentence; Asystole: gone; VF again: back; at 6 shocks after one dose: the six-shock sentence;
// torsades then VF: magnesium and no amiodarone; the extracts equal the PDF text (the card checker finds each one
// word for word on its cited page).
// Screen checks added at C4: 3 x "+ Previous shock" with no rhythm shows no amiodarone card; a shock in VF shows the
// card starting "If in VF or VT after three shocks"; then Asystole removes it; "Review at ... shocks" and "Due after
// ... shocks" are gone; "{maxDoses} doses recorded" stays. (The old a2b test moves to this row at C4/C5.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, texts, CARDS, GUIDELINE_TEXT } from './helpers/card-sessions.mjs';
import { checkCardFile } from '../src/cards/check.js';

const THREE = ['If in VF or VT after three shocks, including shocks delivered prior to ambulance arrival:', 'Administer amiodarone:'];
const SIX = ['If in VF or VT after six shocks, including shocks delivered prior to ambulance arrival, administer a second dose of amiodarone:'];
const lower = (c) => c.at('lower');

test('A23: three "+ Previous shock" with no rhythm recorded: no amiodarone card', () => {
  const c = arrest({ weight: '70' }).previousShock().previousShock().previousShock();
  assert.deepEqual(lower(c), []);
});

test('A23: then a shock in VF: the card with the three-shock sentence and the adult dose', () => {
  const c = arrest({ weight: '70' }).previousShock().previousShock().previousShock().shock('VF');
  assert.deepEqual(lower(c), ['amiodarone-1']);
  assert.deepEqual(texts(c.card('amiodarone-1').lines), THREE);
  assert.deepEqual(texts(c.card('amiodarone-1').dose.lines), ['300 mg IV for an adult.']);
});

test('A23: Asystole hides it; VF again brings it back', () => {
  const c = arrest({ weight: '70' }).shock('VF').shock('VF').shock('VF');
  c.noShock('Asystole');
  assert.deepEqual(lower(c), []);
  c.shock('VT');
  assert.deepEqual(lower(c), ['amiodarone-1']);
  c.noShock('PEA');
  assert.deepEqual(lower(c), ['fluids'], 'PEA: the lower card follows A20');
});

test('A23: at 6 shocks after one dose, the six-shock sentence and 150 mg; a child sees "Seek clinical advice"', () => {
  const c = arrest({ weight: '70' }).shock().shock().shock().dose('amiodarone', 300).shock().shock();
  assert.deepEqual(lower(c), ['amiodarone-1'], '5 shocks: the second dose is not shown yet');
  c.shock();
  assert.deepEqual(lower(c), ['amiodarone-2']);
  assert.deepEqual(texts(c.card('amiodarone-2').lines), SIX);
  assert.deepEqual(texts(c.card('amiodarone-2').dose.lines), ['150 mg IV for an adult.']);
  c.dose('amiodarone', 150);
  assert.deepEqual(c.card('amiodarone-2').doses, { count: 2, max: 2, complete: true, confirm: [] }, 'two doses recorded');
  const child = arrest({ weight: '15' }).shock().shock().shock().dose('amiodarone', 100).shock().shock().shock();
  assert.equal(texts(child.card('amiodarone-2').dose.lines)[0], 'Seek clinical advice');
});

test('A23: torsades then VF: magnesium holds the card; amiodarone stays withheld', () => {
  const c = arrest({ weight: '70' }).shock('Torsades').shock('VF').shock('VF').shock('VF').shock('VF').shock('VF');
  assert.deepEqual(lower(c), ['magnesium']);
  assert.ok(texts(c.card('magnesium').lines).includes('Withhold amiodarone.'));
});

test('A23: the extracts are found word for word on the cited PDF pages', () => {
  assert.deepEqual(checkCardFile(CARDS, GUIDELINE_TEXT), []);
  for (const id of ['amiodarone-1', 'amiodarone-2']) {
    for (const line of CARDS.cards.find((c) => c.id === id).lines) assert.equal(line.source, 'EAS 3.14 p1');
  }
});
