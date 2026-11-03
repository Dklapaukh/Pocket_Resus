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
    if (f === 'core.js') {
      // A1 (owner-approved 3 Nov 2026): joules() is the ONE allowed difference; everything else must match.
      const isJ = l => l.startsWith('function joules(');
      assert.equal(port.filter(isJ).length, 1); assert.equal(orig.filter(isJ).length, 1);
      assert.equal(port.find(isJ), "function joules(weight){if(!validWeight(weight))return null;const w=Number(String(weight).replace(',','.')),b=[5,10,20,30,40].find(n=>w<=n);return b?b*4:200;}");
      assert.deepEqual(port.filter(l => !isJ(l)), orig.filter(l => !isJ(l)));
    } else assert.deepEqual(port, orig);
    assert.ok(orig.length >= 8, 'sanity: compared real code');
  });
}
