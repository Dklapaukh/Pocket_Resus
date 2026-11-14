// Step 3a sub-step 3 (doc 18): RSI doses and tube formulae moved from views.js into the rules file and
// the engine. The v21 formulas are copied below exactly as they were; the engine must give the same
// result for every weight and age tried.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Resus as R } from '../src/engine/index.js';
import { appWithApprovedChangesUndone, withApprovedChanges } from './helpers/approved-changes.mjs';
import { ROOT } from './helpers/engines.mjs';

// Since A12 (owner-approved 14 Nov 2026) the RSI doses come from the EAS 9.3 tables (tests/a12-rsi-table-doses.test.mjs).
// The move in step 3a is still proved exact: the engine of a copy of the app with the approved changes undone
// must give the v21 result for every weight.
const undoneDir = appWithApprovedChangesUndone(ROOT);
const { Resus: UNDONE } = await import(pathToFileURL(path.join(undoneDir, 'src/engine/index.js')).href);
rmSync(undoneDir, { recursive: true, force: true });

// ---- v21 code (src/app/views.js referenceSheet), unchanged ----
const fmt = (n) => Math.round(n * 10) / 10;
function v21Rsi(w) {
  const usualDose = fmt(Math.min(w * 2, 200));
  const reducedKetamine = fmt(Math.min(w, 200));
  const blockerDose = fmt(w > 40 ? Math.min(Math.round((w * 2) / 50) * 50, 200) : Math.min(w * 2, 200));
  return { fentanylMcg: usualDose, ketamineMg: usualDose, reducedKetamineMg: reducedKetamine, blockerMg: blockerDose };
}
function v21Tube(age) {
  const tubeSize = age < 1 ? '3–4 mm' : fmt(age / 4 + 3.5) + ' mm (formula)';
  const tubeLength = age < 1 ? 'ETT size × 3 cm' : fmt(age / 2 + 12) + ' cm (formula)';
  return age !== null && age <= 14 ? { size: tubeSize, length: tubeLength } : null;
}

test('RSI doses: engine (approved changes undone) matches v21 for every weight 0.1 to 500 kg (0.1 kg steps) and edge values', () => {
  const weights = [0, NaN, 12.25, 40.0001, 62.5, 87.5, 112.5];
  for (let i = 1; i <= 5000; i++) weights.push(i / 10);
  for (const w of weights) assert.deepEqual(UNDONE.rsiDoses(w), v21Rsi(w), `${w} kg`);
});

// Since A18 (owner-approved 14 Nov 2026) tube sizes come from the EAS 7.2 band tables (tests/a18-tube-sizes-band-table.test.mjs);
// the step 3a move is still proved exact on the copy with the approved changes undone.
test('tube formulae: engine (approved changes undone) matches v21 for no age and ages 0 to 120 (0.01 year steps)', () => {
  const ages = [null, -1, 0.001, 0.999, 13.999, 14.001];
  for (let i = 0; i <= 12000; i++) ages.push(i / 100);
  for (const a of ages) assert.deepEqual(UNDONE.tubeReference(a), v21Tube(a), `age ${a}`);
});

test('RSI and tube numbers are pinned (EAS 9.3; paediatric formulae)', () => {
  assert.deepEqual(withApprovedChanges(R.RULES, 'undo').numbers.rsi, { // as before A12; its tables are pinned in the A12 test
    fentanyl: { mcgPerKg: 2, maxMcg: 200 }, ketamine: { mgPerKg: 2, maxMg: 200 }, reducedKetamine: { mgPerKg: 1, maxMg: 200 },
    blocker: { mgPerKg: 2, maxMg: 200, roundAdultToMg: 50 }, displayDecimals: 1,
  });
  assert.deepEqual(withApprovedChanges(R.RULES, 'undo').numbers.tubes, { // as before A18, which deleted them
    showUpToAge: 14, underOneSizeMinMm: 3, underOneSizeMaxMm: 4, underOneLengthTimesSize: 3,
    sizeAgeDivisor: 4, sizeAddMm: 3.5, lengthAgeDivisor: 2, lengthAddCm: 12, displayDecimals: 1,
  });
});
