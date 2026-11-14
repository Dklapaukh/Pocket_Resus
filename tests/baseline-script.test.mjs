// The Phase 1 baseline script and its saved output must still agree, for the old AND the new engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROOT, original, ported, giveOriginalTheA1Energy, giveOriginalTheA11BandFluids } from './helpers/engines.mjs';
const script = readFileSync(ROOT + '/docs/baseline/baseline-core-engine.js', 'utf8');
const expected = readFileSync(ROOT + '/docs/baseline/baseline-core-engine.output.txt', 'utf8');
const body = script.split('\n').slice(3).join('\n'); // drop the first 3 lines (they load the old files)
assert.match(script.split('\n').slice(0, 3).join('\n'), /require\('\.\.\/\.\.\/core\.js'\)[\s\S]*rhythm-care[\s\S]*log-view/);
function run(R) { const lines = []; new Function('R', 'console', body)(R, { log: (...a) => lines.push(a.join(' ')) }); return lines.join('\n') + '\n'; }
test('original engine reproduces the saved baseline output', () => { assert.equal(run(original), expected); });
// The one line that may differ is the weight table: its energy columns (A1) and fluid columns (A11).
test('ported engine = saved baseline output, except the A1 shock-energy table line', () => {
  const got = run(ported).split('\n'), want = expected.split('\n');
  assert.equal(got.length, want.length);
  const diff = got.map((l, i) => (l === want[i] ? -1 : i)).filter(i => i >= 0);
  assert.equal(diff.length, 1, 'exactly one output line may differ (the weight table with the energy column)');
  assert.match(want[diff[0]], /^\[\["",false,null/);
  // and with the A1 rule given to the original engine, the two engines agree on every line
  giveOriginalTheA1Energy(); giveOriginalTheA11BandFluids(); assert.equal(run(ported), run(original));
});
