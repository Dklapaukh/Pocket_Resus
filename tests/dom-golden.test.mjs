// Stage 2 safety net. Drives the real app screens (tapping, typing, moving the clock) and
// checks that every screen's HTML and the saved data match what the ORIGINAL app produced.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runScenarios, toHashes } from './helpers/dom-run.mjs';
import { SCENARIOS } from './helpers/dom-scenarios.mjs';
import { ROOT } from './helpers/engines.mjs';

const golden = JSON.parse(readFileSync(new URL('./golden/dom-original.json', import.meta.url), 'utf8'));

test('every scripted scenario runs to the end (no tap fails to find its button)', () => {
  const { problems } = runScenarios({ appDir: ROOT });
  assert.deepEqual(problems, []);
});

test('screens are repeatable (same taps, same HTML, twice)', () => {
  const a = toHashes(runScenarios({ appDir: ROOT }).out), b = toHashes(runScenarios({ appDir: ROOT }).out);
  assert.deepEqual(a, b);
});

test('every scenario in the golden file still exists, with the same number of steps', () => {
  const now = toHashes(runScenarios({ appDir: ROOT }).out);
  assert.deepEqual(Object.keys(now), Object.keys(golden));
  for (const n of Object.keys(golden)) assert.equal(now[n].length, golden[n].length, n);
});

for (const name of Object.keys(SCENARIOS)) {
  test(`screens and saved data match the original app: ${name}`, () => {
    const now = toHashes(runScenarios({ appDir: ROOT }).out)[name], want = golden[name];
    for (let i = 0; i < want.length; i++) {
      for (const k of Object.keys(want[i])) {
        assert.equal(now[i][k], want[i][k], `${name} › step ${i + 1} "${want[i].label}" › ${k} differs`);
      }
    }
  });
}
