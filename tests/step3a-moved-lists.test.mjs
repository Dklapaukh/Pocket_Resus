// Step 3a sub-steps 5-7 (doc 18): lists moved out of src/app/data.js into the rules file must be
// exactly what v21 had. tests/fixtures/step3a-v21-data.json was written from v21's data.js (unchanged
// since commit 97db27d) before anything moved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RULES } from '../src/rules/nz-eas.js';
import { LISTS } from './helpers/engines.mjs';

const V21 = JSON.parse(readFileSync(new URL('./fixtures/step3a-v21-data.json', import.meta.url), 'utf8'));

test('part 3: the four checklists are exactly v21 (and the original app)', () => {
  assert.deepEqual(RULES.checklists.lists, V21.ARREST_CHECKLISTS);
  assert.deepEqual(RULES.checklists.lists, LISTS);
});

test('part 3: the 4 Hs and 4 Ts are exactly v21', () => {
  assert.deepEqual(RULES.checklists.causes, V21.CAUSES);
});

test('part 3 checks: no empty items, unique ids, unique items within a list', () => {
  const ids = [...RULES.checklists.lists.map((l) => l.id), ...RULES.checklists.causes.map((c) => c.id)];
  assert.equal(new Set(ids).size, ids.length, 'ids unique');
  for (const list of RULES.checklists.lists) {
    assert.ok(list.label && list.items.length, list.id);
    for (const item of list.items) assert.ok(typeof item === 'string' && item.trim(), list.id + ' item empty');
    assert.equal(new Set(list.items).size, list.items.length, list.id + ' duplicate item');
  }
  for (const c of RULES.checklists.causes) for (const k of ['group', 'name', 'plain', 'text']) assert.ok(c[k]?.trim(), c.id + ' ' + k);
});
