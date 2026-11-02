// Proves the ported files contain the same logic lines as the originals (only wrapper lines differ).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROOT } from './helpers/engines.mjs';
const read = p => readFileSync(ROOT + '/' + p, 'utf8').split('\n');
const idx = (L, pred) => L.findIndex(pred);
// First logic line: core.js starts at its first `const CYCLE`; the others start right after their R-loading line.
const first = (L, f) => f === 'core.js' ? idx(L, l => l.startsWith('const CYCLE')) : idx(L, l => l.startsWith('const R=root.Resus') || l.startsWith("import * as R from")) + 1;
for (const f of ['core.js', 'rhythm-care.js', 'log-view.js']) {
  test(f + ': logic lines identical to the original', () => {
    const O = read(f), P = read('src/engine/' + f);
    const orig = O.slice(first(O, f), idx(O, l => l.startsWith('root.Resus=') || l.startsWith('const api={')));
    const port = P.slice(first(P, f), idx(P, l => l.startsWith('export {')));
    assert.deepEqual(port, orig);
    assert.ok(orig.length >= 8, 'sanity: compared real code');
  });
}
