// A27 (D6, owner ruling 15 Nov 2026): torsades, magnesium and fluids lines word for word. EAS 3.14 Cardiac Arrest, p2.
// Step C3 checks the ENGINE and the card file: the magnesium card lines ("Withhold amiodarone."), the repeat confirm
// lines after one dose ("One dose is already recorded." app text, then the repeat sentence), the dose count after two
// doses, the torsades pop-up lines, the fluids pop-up lines, and "Assess and treat the reversible cause." nowhere.
// Screen checks added at C4: the Live lower card after a torsades shock reads "Withhold amiodarone."; the torsades and
// fluids pop-ups, the amiodarone "Other..." form warning ("If torsades de pointes is present or has occurred"
// "Withhold amiodarone." plus "This form records an actual event, not a recommendation.") and the repeat-magnesium
// sheet show the lines as written; "2 doses · clinical review" is gone.
// Step C4 (owner decision 22, A37 items 7 and 8, which win on what is drawn): the magnesium card draws "Withhold
// amiodarone." and the dose; its pop-up (titled "Magnesium") draws "Withhold amiodarone.", the dose for this patient
// (the card's dose lines) and the repeat sentence. The fluids pop-up draws "Correct immediately reversible causes." and
// the adult and child lines. Every trimmed A27 line stays in the card file as a trace-only line, checked here.
// The repeat confirm lines are unchanged (A37: "Repeat sheet unchanged").
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, texts, SHOWN_TEXT, fileLines } from './helpers/card-sessions.mjs';

const TORSADES = ['If torsades de pointes is present or has occurred', 'Withhold amiodarone.', 'Administer magnesium IV:'];
const REPEAT = 'Repeat once if torsades de pointes recurs or persists.';

test('A27: torsades shock: the magnesium card lines and the adult dose, word for word (A37: "Withhold amiodarone." drawn)', () => {
  const mg = arrest({ weight: '70' }).shock('Torsades').card('magnesium');
  assert.deepEqual(texts(mg.lines), ['Withhold amiodarone.']);
  assert.deepEqual(fileLines('magnesium'), [TORSADES[0] + ' [trace]', TORSADES[1], TORSADES[2] + ' [trace]']);
  assert.deepEqual(texts(mg.dose.lines), ['10 mmol (2.5 g) over 1-2 minutes for an adult.']);
  assert.ok(mg.lines.every((l) => l.kind === 'guideline' && l.source === 'EAS 3.14 p2'));
});

test('A27: the torsades pop-up lines in the file; A37 draws "Withhold amiodarone." and the repeat sentence, titled "Magnesium"', () => {
  const mg = arrest({ weight: '70' }).shock('Torsades').card('magnesium');
  assert.deepEqual(texts(mg.details), ['Withhold amiodarone.', REPEAT]);
  assert.equal(mg.title, 'Magnesium');
  assert.deepEqual(fileLines('magnesium', 'details'), [TORSADES[0] + ' [trace]', TORSADES[1], TORSADES[2] + ' [trace]',
    '10 mmol (2.5 g) over 1-2 minutes for an adult. [trace]', 'See the paediatric drug dose tables for a child. [trace]', REPEAT,
    'Administration time: see EAS 7.2, dilution 13 [app]']);
});

test('A27: after one dose the repeat asks "One dose is already recorded." (app text) then the repeat sentence; two doses complete', () => {
  const c = arrest({ weight: '70' }).shock('Torsades');
  assert.deepEqual(c.card('magnesium').doses.confirm, []);
  c.dose('magnesium', 10, 'mmol').advance(10000);
  assert.deepEqual(c.card('magnesium').doses.confirm, [{ kind: 'app', text: 'One dose is already recorded.', source: null }, { kind: 'guideline', text: REPEAT, source: 'EAS 3.14 p2' }]);
  c.dose('magnesium', 10, 'mmol');
  assert.deepEqual(c.card('magnesium').doses, { count: 2, max: 2, complete: true, confirm: [] });
});

test('A27: the fluids pop-up lines word for word; "Assess and treat the reversible cause." is gone', () => {
  const fluids = arrest({ weight: '70' }).noShock('PEA').card('fluids');
  assert.deepEqual(texts(fluids.details), ['Correct immediately reversible causes.', '1-2 litres IV for an adult.', '20-40 ml/kg IV for a child.']);
  assert.deepEqual(fileLines('fluids', 'details'), ['If the patient is in PEA [trace]', 'Correct immediately reversible causes.', 'Administer 0.9% sodium chloride IV: [trace]', '1-2 litres IV for an adult.', '20-40 ml/kg IV for a child.']);
  assert.doesNotMatch(SHOWN_TEXT, /Assess and treat the reversible cause/);
  assert.doesNotMatch(SHOWN_TEXT, /clinical review/);
});
