// The Phase 1 baseline script and its saved output must still agree, for the old AND the new engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROOT, original, ported, giveOriginalTheA1Energy, giveOriginalTheA11BandFluids, giveOriginalTheA16AgeBands } from './helpers/engines.mjs';
const script = readFileSync(ROOT + '/docs/baseline/baseline-core-engine.js', 'utf8');
const expected = readFileSync(ROOT + '/docs/baseline/baseline-core-engine.output.txt', 'utf8');
const body = script.split('\n').slice(3).join('\n'); // drop the first 3 lines (they load the old files)
assert.match(script.split('\n').slice(0, 3).join('\n'), /require\('\.\.\/\.\.\/core\.js'\)[\s\S]*rhythm-care[\s\S]*log-view/);
function run(R) { const lines = []; new Function('R', 'console', body)(R, { log: (...a) => lines.push(a.join(' ')) }); return lines.join('\n') + '\n'; }
test('original engine reproduces the saved baseline output', () => { assert.equal(run(original), expected); });
// The lines that may differ: the weight table (its energy columns, A1, and fluid columns, A11) and the
// weight-from-age line (A16: band table headings; ages 2, 10, 11, 12 and 14 change).
test('ported engine = saved baseline output, except the A1 shock-energy table line and the A16 weight-from-age line', () => {
  const got = run(ported).split('\n'), want = expected.split('\n');
  assert.equal(got.length, want.length);
  const diff = got.map((l, i) => (l === want[i] ? -1 : i)).filter(i => i >= 0);
  assert.equal(diff.length, 2, 'exactly two output lines may differ (the weight table with the energy column, and weight from age)');
  assert.match(want[diff[0]], /^\[\["",false,null/);
  assert.match(want[diff[1]], /^\[\{"a":0,"est":null\}/);
  assert.equal(got[diff[1]], JSON.stringify([0, 0.5, 1, 2, 10, 11, 12, 14, 15, '', null].map((a) => ({ a, est: { 0.5: 5, 1: 10, 2: 20, 10: 30, 11: 40, 12: 40 }[a] ?? null }))), 'A16 values typed from the row');
  // and with the A1, A11 and A16 rules given to the original engine, the two engines agree on every line
  giveOriginalTheA1Energy(); giveOriginalTheA11BandFluids(); giveOriginalTheA16AgeBands(); assert.equal(run(ported), run(original));
});
