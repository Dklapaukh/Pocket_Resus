// Step 3a safety net (doc 18): while numbers and guideline text move into the rules file, every screen
// and pop-up that shows them must stay exactly as in v21, for weights none / 3 / 5 / 15 / 25 / 42 / 80 /
// invalid and a range of ages. The golden file was recorded once from v21 and must not be re-recorded
// to make this pass (see tests/golden/generate-step3a.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rmSync } from 'node:fs';
import { runAll } from './helpers/step3a-scenarios.mjs';
import { ROOT } from './helpers/engines.mjs';
import { appWithApprovedChangesUndone } from './helpers/approved-changes.mjs';

const golden = JSON.parse(readFileSync(new URL('./golden/step3a-v21-output.json', import.meta.url), 'utf8'));
// The golden file holds only fingerprints of screens, so approved A-table changes cannot be swapped into it.
// Instead the scenarios run on a copy of the app with those changes taken out of its rules file
// (tests/helpers/approved-changes.mjs): that copy must still match v21 exactly, so nothing else changed.
// Each approved change has its own test of the new screens (for example tests/a9-magnesium-seek-advice.test.mjs).
const undoneDir = appWithApprovedChangesUndone(ROOT);
const run = runAll(undoneDir);
rmSync(undoneDir, { recursive: true, force: true });

test('step 3a: every scenario runs to the end', () => assert.deepEqual(run.problems, []));

test('step 3a: same scenarios and steps as recorded from v21', () => {
  assert.deepEqual(Object.keys(run.hashes), Object.keys(golden));
  for (const n of Object.keys(golden)) assert.deepEqual(run.hashes[n].map((s) => s.label), golden[n].map((s) => s.label), n);
});

for (const name of Object.keys(golden)) {
  test(`step 3a: screens identical to v21: ${name}`, () => {
    golden[name].forEach((want, i) => {
      for (const k of Object.keys(want)) assert.equal(run.hashes[name][i]?.[k], want[k], `${name} › "${want.label}" › ${k} differs`);
    });
  });
}
