// Stage 1 exit gate: old and new engines run side by side on 300 random action sequences.
import test from 'node:test';
import assert from 'node:assert/strict';
import { original, ported } from './helpers/engines.mjs';
import { compareEngines } from './helpers/fuzz.mjs';
test('300 random sequences give identical state and derived values in both engines', () => {
  for (let seed = 1; seed <= 300; seed++) assert.equal(compareEngines(original, ported, seed), null, 'first difference at seed ' + seed);
});
