// Additional protection for future formatting work. The existing exact-line
// fidelity test remains in place; this test does not replace it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import { ROOT } from './helpers/engines.mjs';

function logicLines(path, endMarker) {
  const lines = readFileSync(`${ROOT}/${path}`, 'utf8').split('\n');
  const start = lines.findIndex((line) => line.startsWith('const CYCLE'));
  const end = lines.findIndex((line) => line.startsWith(endMarker));
  assert.ok(start >= 0 && end > start, `Cannot locate core logic in ${path}`);
  return lines.slice(start, end).join('\n');
}

// Ignore only source locations and spelling of literals; retain their values,
// operators, declaration types, evaluation order, and complete tree structure.
function structure(source) {
  const tree = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  return JSON.parse(JSON.stringify(tree, (key, value) =>
    ['start', 'end', 'raw'].includes(key) ? undefined : value,
  ));
}

test('core logic structure matches original with the approved A1 energy rule', () => {
  const original = logicLines('core.js', 'root.Resus=');
  const current = logicLines('src/engine/core.js', 'export {');
  const originalJoules = original.match(/^function joules\(weight\).*$/m)?.[0];
  const currentJoules = current.match(/^function joules\(weight\).*$/m)?.[0];
  assert.ok(originalJoules && currentJoules, 'Both energy functions must be present');
  const baselineWithA1 = original.replace(originalJoules, currentJoules);
  assert.deepEqual(structure(current), structure(baselineWithA1));

  // Check that this comparison catches a meaningful operator change.
  const mutated = current.replace('b*4:200', 'b+4:200');
  assert.notEqual(mutated, current, 'Mutation must apply to the energy rule');
  assert.notDeepEqual(structure(mutated), structure(baselineWithA1));
});
