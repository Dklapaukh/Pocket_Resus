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

test('part 4: devices, sites and colours are exactly v21', () => {
  assert.deepEqual(RULES.equipment.devices, V21.ARREST_EQUIPMENT);
  assert.deepEqual(RULES.equipment.sites, V21.ARREST_SITES);
  assert.deepEqual(RULES.equipment.colours, V21.COLOURS);
});

test('part 4: blades, tube size limit and iGel ranges as v21 showed them', () => {
  assert.deepEqual(RULES.equipment.blades, {
    Video: ['1', '2', '3', '4', 'X blade'],
    Direct: ['Mac 1', 'Mac 2', 'Mac 3', 'Mac 4', 'Miller 0', 'Miller 1', 'Miller 2'],
  });
  assert.equal(RULES.equipment.maxTubeSizeMm, 12);
  // v21 tube sheet text: "1: 2–5 kg · 1.5: 5–12 kg · 2: 10–25 kg · 2.5: 25–35 kg · 3: 30–60 kg · 4: 50–90 kg · 5: 90+ kg."
  assert.deepEqual(RULES.equipment.igelRanges.map((r) => [r.size, r.minKg, r.maxKg]),
    [['1', 2, 5], ['1.5', 5, 12], ['2', 10, 25], ['2.5', 25, 35], ['3', 30, 60], ['4', 50, 90], ['5', 90, null]]);
});

test('part 4 checks: valid colours, iGel sizes match the iGel device, ranges ordered with no gaps', () => {
  for (const [type, colours] of Object.entries(RULES.equipment.colours)) {
    for (const [size, colour] of Object.entries(colours)) {
      assert.match(colour, /^#([0-9a-f]{3}|[0-9a-f]{6})$/i, `${type} ${size}`);
      assert.ok(RULES.equipment.devices[type].sizes.includes(size), `${type} ${size} is a listed size`);
    }
  }
  const r = RULES.equipment.igelRanges;
  assert.deepEqual(r.map((x) => x.size), RULES.equipment.devices.igel.sizes);
  r.forEach((x, i) => {
    assert.ok(x.maxKg === null ? i === r.length - 1 : x.minKg < x.maxKg, x.size);
    if (i) assert.ok(x.minKg >= r[i - 1].minKg && x.minKg <= r[i - 1].maxKg, `${x.size}: no gap after ${r[i - 1].size}`);
  });
});
