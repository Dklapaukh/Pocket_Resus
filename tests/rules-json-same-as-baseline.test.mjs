// Stage 1 (doc 19, owner decision 9): the rules became JSON (src/rules/nz-eas.json). Proof that NOTHING
// changed: the rule set the app loads is identical to the frozen v22 + A8 baseline
// (tests/baseline/nz-eas-v22-a8.js, never loaded by the app, never edited): same values, same types,
// same key order at every level, same list order, for all five parts. Every comment in the baseline is
// kept as a plain-English note, and the file is laid out in the one agreed way.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RULES } from '../src/rules/load.js';
import { RULES as BASELINE } from './baseline/nz-eas-v22-a8.js';
import { baselineComments } from './helpers/rules-comments.mjs';
import { formatRulesJson } from './helpers/rules-json-format.mjs';

const jsonText = readFileSync(new URL('../src/rules/nz-eas.json', import.meta.url), 'utf8');
const file = JSON.parse(jsonText);
const baselineSource = readFileSync(new URL('./baseline/nz-eas-v22-a8.js', import.meta.url), 'utf8');
const PARTS = ['numbers', 'wording', 'checklists', 'equipment', 'sources'];

// Every difference between two values: kind of value, key order, list length and order, every number and word.
function differences(a, b, where, out = []) {
  const kind = (v) => (v === null ? 'null' : Array.isArray(v) ? 'list' : typeof v);
  if (kind(a) !== kind(b)) { out.push(`${where}: ${kind(a)} is not ${kind(b)}`); return out; }
  if (kind(a) === 'list') {
    if (a.length !== b.length) out.push(`${where}: ${a.length} items, baseline has ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) differences(a[i], b[i], `${where}.${i}`, out);
  } else if (kind(a) === 'object') {
    if (Object.keys(a).join('\u0001') !== Object.keys(b).join('\u0001')) out.push(`${where}: keys or key order differ: [${Object.keys(a)}] vs baseline [${Object.keys(b)}]`);
    for (const k of Object.keys(a)) if (k in b) differences(a[k], b[k], where ? `${where}.${k}` : k, out);
  } else if (!Object.is(a, b)) out.push(`${where}: ${JSON.stringify(a)} is not ${JSON.stringify(b)}`);
  return out;
}

test('the loaded rule set is exactly the v22 + A8 baseline: values, types, key order, list order (all five parts)', () => {
  assert.deepEqual(Object.keys(RULES), PARTS, 'the app gets the five parts only (about and notes are not passed on)');
  assert.deepEqual(Object.keys(BASELINE), PARTS);
  assert.deepEqual(differences(RULES, BASELINE, ''), []);
  for (const part of PARTS) assert.deepEqual(differences(file[part], BASELINE[part], part), [], part);
});

test('the comparison itself can see a changed value, a changed type, a swapped order and a missing key', () => {
  const copy = () => JSON.parse(JSON.stringify(BASELINE));
  let c = copy(); c.numbers.adult.adrenalineMg = 2;
  assert.equal(differences(c, BASELINE, '').length, 1);
  c = copy(); c.numbers.weight.maxKg = '500';
  assert.equal(differences(c, BASELINE, '').length, 1);
  c = copy(); [c.numbers.rhythms.shock[0], c.numbers.rhythms.shock[1]] = [c.numbers.rhythms.shock[1], c.numbers.rhythms.shock[0]];
  assert.equal(differences(c, BASELINE, '').length, 2);
  c = copy(); const { cprCycleMs, ...rest } = c.numbers.timing; c.numbers.timing = { ...rest, cprCycleMs }; // same values, different order
  assert.equal(differences(c, BASELINE, '').length, 1);
  c = copy(); delete c.equipment.maxTubeSizeMm;
  assert.ok(differences(c, BASELINE, '').length >= 1);
});

test('the JSON file is laid out the one agreed way (so a one-value change is a one-line difference) and has no repeated keys', () => {
  assert.equal(formatRulesJson(file), jsonText);
  assert.ok(jsonText.endsWith('}\n'));
  assert.deepEqual(Object.keys(file), ['about', ...PARTS, 'notes']);
});

test('every comment in the baseline file is kept as a note (none lost)', () => {
  const squash = (t) => t.replace(/\s+/g, ' ').trim();
  const comments = baselineComments(baselineSource);
  assert.equal(comments[0].path, 'BASELINE-MARKER', 'the first comment is the baseline label added at the move');
  const original = comments.slice(1); // the baseline label is not one of the original comments
  assert.equal(original.length, 62, 'the original file has 62 comments');
  const kept = { about: file.about, ...file.notes };
  for (const c of original) {
    assert.ok(c.path in kept, `no note for "${c.path}"`);
    assert.ok(squash(kept[c.path]).includes(c.text), `note "${c.path}" does not contain the comment: ${c.text.slice(0, 60)}`);
  }
  // 62 comments became 1 "about" text + 59 notes = 60 places: two places explain two comments each.
  const places = new Set(original.map((c) => c.path));
  assert.equal(places.size, 60);
  assert.deepEqual([...Object.keys(kept)].sort(), [...places].sort(), 'no note without a baseline comment, no comment without a note');
  const merged = [...places].filter((p) => original.filter((c) => c.path === p).length > 1).sort();
  assert.deepEqual(merged, ['wording', 'wording.headerEnergyTitle'],
    'merged: the PART 2 heading + the "Reference wording" note (both before wording), and the "Below: wording whose {gaps}..." note + "Header and weight pop-up" (both before the first entry)');
});

test('the about text is the baseline file header, paragraph for paragraph', () => {
  const header = baselineComments(baselineSource)[1];
  assert.equal(file.about, header.paragraphs.join('\n\n'));
  assert.ok(file.about.startsWith('CLINICAL RULES FILE: NZ EAS clinical practice guidelines'));
});
