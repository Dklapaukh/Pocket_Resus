// Stage 0/1: the scripted scenarios must reproduce the golden file (made from the ORIGINAL code).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { original, ported, giveOriginalTheA1Energy } from './helpers/engines.mjs';
import { runAll } from './helpers/scenarios.mjs';
const golden = readFileSync(new URL('./golden/engine.golden.json', import.meta.url), 'utf8');
const text = o => JSON.stringify(runAll(o), null, 1) + '\n';
test('original engine still matches the golden file', () => { assert.equal(text(original), golden); });
// A1 (owner-approved): the golden file stays the ORIGINAL record. The new engine may differ from it only in
// shock-energy / paediatric-pads values; the original given the A1 rule must match the new engine byte-for-byte.
function diffs(a, b, path = '', out = []) {
  if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffs(a[k], b[k], path + '/' + k, out); }
  else if (JSON.stringify(a) !== JSON.stringify(b)) out.push(path);
  return out;
}
test('ported engine matches the golden file except shock-energy / pads values (A1)', () => {
  giveOriginalTheA1Energy();
  assert.equal(text(ported), text(original));
  const changed = diffs(JSON.parse(golden), runAll(ported));
  assert.ok(changed.length > 0, 'sanity: A1 does change some energy values');
  for (const p of changed) assert.match(p, /joules|energy|padsPaed|pads/i, 'unexpected change at ' + p);
});
test('ported engine exposes exactly the same functions and constants as the original', () => {
  assert.deepEqual(Object.keys(ported).sort(), Object.keys(original).sort());
});
