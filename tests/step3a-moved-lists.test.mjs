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

test('part 5: guideline links are exactly the v21 web links and PDFs', () => {
  const g = RULES.sources.guidelines;
  assert.equal(g.cardiacArrest.web, V21.CARDIAC_CPG);
  assert.equal(g.magnesium.web, V21.MAGNESIUM_CPG);
  assert.equal(RULES.sources.exportDate, '24 September 2026');
  assert.deepEqual(Object.values(g).map((x) => [x.code, x.pdf ?? null]), [
    ['3.14', 'cpg-cardiac-arrest.pdf'], ['3.15', 'cpg-post-rosc.pdf'], ['7.2', 'cpg-paediatric-equipment.pdf'], ['9.3', 'cpg-rsi.pdf'],
    ['14.3', 'cpg-drugs/eas-14-3.pdf'], ['14.4', 'cpg-drugs/eas-14-4.pdf'], ['14.27', null]]);
});

test('part 5 checks: every PDF exists in the app and is kept for offline use; links well-formed', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const pdfs = [...Object.values(RULES.sources.guidelines).map((x) => x.pdf), ...RULES.checklists.lists.map((l) => l.pdf.split('#')[0])].filter(Boolean);
  for (const pdf of new Set(pdfs)) {
    assert.doesNotThrow(() => readFileSync(new URL('../' + pdf, import.meta.url)), pdf + ' exists');
    assert.ok(sw.includes(`'${pdf}'`), pdf + ' is in the offline file list (sw.js)');
  }
  for (const g of Object.values(RULES.sources.guidelines)) {
    assert.match(g.code, /^\d+\.\d+$/);
    if (g.web) assert.doesNotThrow(() => new URL(g.web)), assert.match(g.web, /^https:\/\//);
  }
  for (const id of RULES.sources.guidanceLinks) assert.ok(RULES.sources.guidelines[id]?.pdf, id);
});
