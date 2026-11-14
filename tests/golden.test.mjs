// Stage 0/1: the scripted scenarios must reproduce the golden file (made from the ORIGINAL code).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { original, ported, giveOriginalTheA1Energy, giveOriginalTheA10ChildSecondDose, giveOriginalTheA11BandFluids, giveOriginalTheA16AgeBands } from './helpers/engines.mjs';
import { runAll } from './helpers/scenarios.mjs';
const golden = readFileSync(new URL('./golden/engine.golden.json', import.meta.url), 'utf8');
const text = o => JSON.stringify(runAll(o), null, 1) + '\n';
test('original engine still matches the golden file', () => { assert.equal(text(original), golden); });
// A1 and A10 (owner-approved): the golden file stays the ORIGINAL record. The new engine may differ from it only
// in shock-energy / paediatric-pads values (A1) and a child's second amiodarone dose (A10, now none); the
// original given those two rules must match the new engine byte-for-byte.
function diffs(a, b, path = '', out = []) {
  if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffs(a[k], b[k], path + '/' + k, out); }
  else if (JSON.stringify(a) !== JSON.stringify(b)) out.push(path);
  return out;
}
test('ported engine matches the golden file except shock-energy / pads values (A1) and child second amiodarone (A10)', () => {
  giveOriginalTheA1Energy();
  giveOriginalTheA10ChildSecondDose();
  giveOriginalTheA11BandFluids();
  giveOriginalTheA16AgeBands();
  assert.equal(text(ported), text(original));
  const changed = diffs(JSON.parse(golden), runAll(ported));
  assert.ok(changed.length > 0, 'sanity: A1 does change some energy values');
  assert.ok(changed.some((p) => /amio2/.test(p)), 'sanity: A10 does change a child second amiodarone value');
  assert.ok(changed.some((p) => /^\/estimate\//.test(p)), 'sanity: A16 does change a weight from age');
  for (const p of changed) assert.match(p, /joules|energy|padsPaed|pads|amio2|fluid|^\/estimate\/\d+\/est$/i, 'unexpected change at ' + p); // A1, A10, A11, A16
});
// The readable rewrite (11 Nov 2026) shares three small helpers between engine files; nothing else may be added or lost.
const ADDED_BY_REWRITE = ['childBand', 'invalidEnergy', 'rhythmDetails'];
// Doc 07 step 2 (12 Nov 2026, owner-approved): drug-card rules moved from the app into the engine,
// plus the rule set, its wording helper and the saved-session check. Listed by name so nothing slips in.
const ADDED_BY_STEP_2 = ['RULES', 'wording', 'restoreSaved', 'latestLowerRhythm', 'lowerCard', 'amiodaroneDue', 'amiodaroneDosesComplete',
  'childAmiodaroneAdvice', 'childSecondAmiodarone', 'secondAmiodaroneEarly', 'doseFor', 'lockLeft'];
// Doc 18 step 3a (12 Nov 2026): helpers that fill rules-file wording and calculate reference values.
const ADDED_BY_STEP_3A = ['ageEstimateGaps', 'rsiDoses', 'tubeReference', 'wordingGaps', 'guideText'];
// A16 (owner-approved 14 Nov 2026): the adult-age check for the weight pop-up (age 14 = adult).
const ADDED_BY_A16 = ['adultAge'];
test('ported engine exposes the same functions and constants as the original (plus the named helpers)', () => {
  assert.deepEqual(Object.keys(ported).sort(), [...Object.keys(original), ...ADDED_BY_REWRITE, ...ADDED_BY_STEP_2, ...ADDED_BY_STEP_3A, ...ADDED_BY_A16].sort());
});
