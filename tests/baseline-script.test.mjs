// The Phase 1 baseline script and its saved output must still agree, for the old AND the new engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROOT, original, ported } from './helpers/engines.mjs';
const script = readFileSync(ROOT + '/docs/baseline/baseline-core-engine.js', 'utf8');
const expected = readFileSync(ROOT + '/docs/baseline/baseline-core-engine.output.txt', 'utf8');
const body = script.split('\n').slice(3).join('\n'); // drop the first 3 lines (they load the old files)
assert.match(script.split('\n').slice(0, 3).join('\n'), /require\('\.\.\/\.\.\/core\.js'\)[\s\S]*rhythm-care[\s\S]*log-view/);
function run(R) { const lines = []; new Function('R', 'console', body)(R, { log: (...a) => lines.push(a.join(' ')) }); return lines.join('\n') + '\n'; }
test('original engine reproduces the saved baseline output', () => { assert.equal(run(original), expected); });
test('ported engine reproduces the saved baseline output', () => { assert.equal(run(ported), expected); });
