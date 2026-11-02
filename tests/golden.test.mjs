// Stage 0/1: the scripted scenarios must reproduce the golden file (made from the ORIGINAL code).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { original, ported } from './helpers/engines.mjs';
import { runAll } from './helpers/scenarios.mjs';
const golden = readFileSync(new URL('./golden/engine.golden.json', import.meta.url), 'utf8');
const text = o => JSON.stringify(runAll(o), null, 1) + '\n';
test('original engine still matches the golden file', () => { assert.equal(text(original), golden); });
test('ported engine matches the golden file byte-for-byte', () => { assert.equal(text(ported), golden); });
test('ported engine exposes exactly the same functions and constants as the original', () => {
  assert.deepEqual(Object.keys(ported).sort(), Object.keys(original).sort());
});
