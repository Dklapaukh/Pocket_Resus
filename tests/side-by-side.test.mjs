// Stage 1 exit gate: old and new engines run side by side on 300 random action sequences.
import test from 'node:test';
import assert from 'node:assert/strict';
import { original, ported, giveOriginalTheA1Energy } from './helpers/engines.mjs';
giveOriginalTheA1Energy(); // A1: the only intended difference between the engines
import { compareEngines } from './helpers/fuzz.mjs';
// Since 11 Nov 2026 this is the main engine safeguard: the readable rewrite replaced the exact-line
// fidelity test (owner-approved), so the number of sequences was raised from 300 to 3000.
test('3000 random sequences give identical state and derived values in both engines', () => {
  for (let seed = 1; seed <= 3000; seed++) assert.equal(compareEngines(original, ported, seed), null, 'first difference at seed ' + seed);
});
