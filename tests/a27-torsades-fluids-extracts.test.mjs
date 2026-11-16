// A27 (D6, owner ruling 15 Nov 2026): torsades, magnesium and fluids lines word for word. EAS 3.14 Cardiac Arrest, p2.
// Step C3 checks the ENGINE and the card file: the magnesium card lines ("Withhold amiodarone."), the repeat confirm
// lines after one dose ("One dose is already recorded." app text, then the repeat sentence), the dose count after two
// doses, the torsades pop-up lines, the fluids pop-up lines, and "Assess and treat the reversible cause." nowhere.
// Screen checks added at C4: the Live lower card after a torsades shock reads "Withhold amiodarone."; the torsades and
// fluids pop-ups, the amiodarone "Other..." form warning ("If torsades de pointes is present or has occurred"
// "Withhold amiodarone." plus "This form records an actual event, not a recommendation.") and the repeat-magnesium
// sheet show the lines as written; "2 doses · clinical review" is gone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, texts, SHOWN_TEXT } from './helpers/card-sessions.mjs';

const TORSADES = ['If torsades de pointes is present or has occurred', 'Withhold amiodarone.', 'Administer magnesium IV:'];
const REPEAT = 'Repeat once if torsades de pointes recurs or persists.';

test('A27: torsades shock: the magnesium card lines and the adult dose, word for word', () => {
  const mg = arrest({ weight: '70' }).shock('Torsades').card('magnesium');
  assert.deepEqual(texts(mg.lines), TORSADES);
  assert.deepEqual(texts(mg.dose.lines), ['10 mmol (2.5 g) over 1-2 minutes for an adult.']);
  assert.ok(mg.lines.every((l) => l.kind === 'guideline' && l.source === 'EAS 3.14 p2'));
});

test('A27: the torsades pop-up lines, titled with "If torsades de pointes is present or has occurred"', () => {
  const mg = arrest({ weight: '70' }).shock('Torsades').card('magnesium');
  assert.deepEqual(texts(mg.details), [...TORSADES, '10 mmol (2.5 g) over 1-2 minutes for an adult.', 'See the paediatric drug dose tables for a child.', REPEAT]);
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
  assert.deepEqual(texts(fluids.details), ['If the patient is in PEA', 'Correct immediately reversible causes.', 'Administer 0.9% sodium chloride IV:', '1-2 litres IV for an adult.', '20-40 ml/kg IV for a child.']);
  assert.doesNotMatch(SHOWN_TEXT, /Assess and treat the reversible cause/);
  assert.doesNotMatch(SHOWN_TEXT, /clinical review/);
});
