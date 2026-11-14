// Stage 1 (doc 19, owner decision 9): the rules became a data file (first JSON, since step E1b YAML:
// src/rules/nz-eas.yaml). Proof that NOTHING changed: every value of the frozen v22 + A8 baseline
// (tests/baseline/nz-eas-v22-a8.js, never loaded by the app, never edited) is still in the rule set, with the
// same value and type, in the same relative order. Every comment in the baseline is kept as a plain-English
// note, and the file is laid out in the one standard way (exactly what src/rules/write.js produces).
//
// Stage 2 (doc 18, items F, 31, 34, 37, 39, 40): screen text, timer thresholds and choice lists moved out of
// the code into the rule set, so the rule set is now "baseline + additions". The additions are pinned
// exactly in the frozen file tests/baseline/stage2-additions.json (dotted path -> value, in file order;
// notes are listed as "notes.<place>"). The test asserts: rule set = baseline + exactly those additions,
// nothing else. That is at least as strict as before: an extra, missing, changed or reordered value fails.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RULES } from '../src/rules/load.js';
import { RULES as FROZEN_BASELINE } from './baseline/nz-eas-v22-a8.js';
import { withApprovedChanges, withApprovedChangesFlat } from './helpers/approved-changes.mjs';
import { baselineComments } from './helpers/rules-comments.mjs';
import { readYamlStrict } from '../src/rules/parse.js';
import { rulesFileText } from '../src/rules/write.js';

const yamlText = readFileSync(new URL('../src/rules/nz-eas.yaml', import.meta.url), 'utf8');
const file = readYamlStrict(yamlText); // the whole file, read the strict way
const baselineSource = readFileSync(new URL('./baseline/nz-eas-v22-a8.js', import.meta.url), 'utf8');
// Approved A-table changes (tests/helpers/approved-changes.mjs) are made in the frozen copies before comparing.
const BASELINE = withApprovedChanges(FROZEN_BASELINE);
const ADDITIONS = withApprovedChangesFlat(JSON.parse(readFileSync(new URL('./baseline/stage2-additions.json', import.meta.url), 'utf8')));
const PARTS = ['numbers', 'wording', 'checklists', 'equipment', 'sources'];

// Every single value (text, number, true / false, empty) with its dotted place, in file order.
// A list item is a value of its own (".0", ".1"); an empty list or group counts as a value.
function flatten(node, where = '', out = []) {
  if (node !== null && typeof node === 'object' && Object.keys(node).length > 0) {
    for (const [key, value] of Object.entries(node)) flatten(value, where ? `${where}.${key}` : key, out);
  } else out.push([where, node]);
  return out;
}
const kind = (v) => (v === null ? 'null' : Array.isArray(v) ? 'list' : typeof v);

// What is wrong with a rule set compared with the baseline: any baseline value missing, changed (value or
// type) or moved relative to the others. Additions are NOT reported here (see the pinned additions below).
function baselineProblems(rules, baseline) {
  const problems = [];
  const have = new Map(flatten(rules));
  const wanted = flatten(baseline);
  for (const [path, value] of wanted) {
    if (!have.has(path)) problems.push(`${path}: missing (baseline has ${JSON.stringify(value)})`);
    else if (kind(have.get(path)) !== kind(value) || !Object.is(have.get(path), value)) problems.push(`${path}: ${JSON.stringify(have.get(path))} is not ${JSON.stringify(value)}`);
  }
  const inBaseline = new Set(wanted.map(([path]) => path));
  const order = flatten(rules).map(([path]) => path).filter((path) => inBaseline.has(path));
  if (!problems.length && order.join('\u0001') !== wanted.map(([path]) => path).join('\u0001')) problems.push('the baseline values are in a different order');
  return problems;
}

// The values in the rule set that the baseline does not have (the parts only), as [path, value] in file order.
function additionsOf(rules, baseline) {
  const inBaseline = new Set(flatten(baseline).map(([path]) => path));
  return flatten(rules).filter(([path]) => !inBaseline.has(path));
}

const pinnedParts = Object.entries(ADDITIONS).filter(([path]) => !path.startsWith('notes.'));
const pinnedNotes = Object.entries(ADDITIONS).filter(([path]) => path.startsWith('notes.')).map(([path, text]) => [path.slice('notes.'.length), text]);

test('the baseline has 425 values and every one is still in the rule set, identical and in the same relative order (all five parts)', () => {
  assert.deepEqual(Object.keys(RULES), PARTS, 'the app gets the five parts only (about and notes are not passed on)');
  assert.deepEqual(Object.keys(BASELINE), PARTS);
  assert.equal(flatten(BASELINE).length, 425);
  assert.deepEqual(baselineProblems(RULES, BASELINE), []);
  for (const part of PARTS) assert.deepEqual(baselineProblems({ [part]: file[part] }, { [part]: BASELINE[part] }), [], part);
});

test('rule set = baseline + exactly the pinned stage 2 additions, nothing else (every value, every place, in order)', () => {
  assert.ok(pinnedParts.length > 400, 'the pinned additions file must hold the stage 2 values');
  const added = additionsOf(RULES, BASELINE);
  assert.deepEqual(added.map(([path]) => path), pinnedParts.map(([path]) => path), 'the added places differ from the pinned list');
  for (const [i, [path, value]] of added.entries()) {
    assert.equal(kind(value), kind(pinnedParts[i][1]), `${path}: a different kind of value from the pinned one`);
    assert.ok(Object.is(value, pinnedParts[i][1]), `${path}: ${JSON.stringify(value)} is not the pinned ${JSON.stringify(pinnedParts[i][1])}`);
  }
  // the notes: the file's notes are the baseline notes followed by exactly the pinned new notes
  const baselinePlaces = new Set(baselineComments(baselineSource).slice(1).map((c) => c.path));
  const newNotes = Object.entries(file.notes).filter(([place]) => !baselinePlaces.has(place));
  assert.deepEqual(newNotes, pinnedNotes, 'the new notes differ from the pinned ones');
});

test('the comparison itself can see a changed value, a changed type, a swapped order, a missing key, an extra value and a changed addition', () => {
  const copy = () => JSON.parse(JSON.stringify(RULES));
  let c = copy(); c.numbers.adult.adrenalineMg = 2;
  assert.equal(baselineProblems(c, BASELINE).length, 1);
  c = copy(); c.numbers.weight.maxKg = '500';
  assert.equal(baselineProblems(c, BASELINE).length, 1);
  c = copy(); [c.numbers.rhythms.shock[0], c.numbers.rhythms.shock[1]] = [c.numbers.rhythms.shock[1], c.numbers.rhythms.shock[0]];
  assert.equal(baselineProblems(c, BASELINE).length, 2);
  c = copy(); const { cprCycleMs, ...rest } = c.numbers.timing; c.numbers.timing = { ...rest, cprCycleMs }; // same values, different order
  assert.deepEqual(baselineProblems(c, BASELINE), ['the baseline values are in a different order']);
  c = copy(); delete c.equipment.maxTubeSizeMm;
  assert.equal(baselineProblems(c, BASELINE).length, 1);
  c = copy(); c.numbers.timing.aValueNobodyPinned = 1; // an extra value is not a baseline problem, but it is not in the pinned additions
  assert.deepEqual(baselineProblems(c, BASELINE), []);
  assert.notDeepEqual(additionsOf(c, BASELINE).map(([path]) => path), pinnedParts.map(([path]) => path));
  c = copy(); c.wording.liveCards.reviewInactive = 'Review off';
  assert.notDeepEqual(additionsOf(c, BASELINE), pinnedParts);
  c = copy(); c.wording.baselineAddedKeyOnTopLevel = 'x';
  assert.notDeepEqual(additionsOf(c, BASELINE).map(([path]) => path), pinnedParts.map(([path]) => path));
  c = copy(); c.numbers.rhythms.shock.push('Wobbly'); // a baseline list that grew shows up as an addition
  assert.deepEqual(baselineProblems(c, BASELINE), []);
  assert.notDeepEqual(additionsOf(c, BASELINE).map(([path]) => path), pinnedParts.map(([path]) => path));
});

// Step E1b: the file changed from JSON to YAML and NOTHING else. The frozen copy of the JSON file as it was
// the moment before (tests/baseline/nz-eas-before-yaml.json, never edited) is compared with the YAML file read
// the strict way, whole (about and notes too), at every depth: same values, same kinds (number, text,
// true/false, empty), same order of names.
const frozenJsonText = readFileSync(new URL('./baseline/nz-eas-before-yaml.json', import.meta.url), 'utf8');
const frozenJson = withApprovedChanges(JSON.parse(frozenJsonText));

// Every place in a value, in order, with the kind of value there and (for names) the order of names.
function everyPlace(node, where = 'file', out = []) {
  if (Array.isArray(node)) { out.push(`${where} list of ${node.length}`); node.forEach((item, i) => everyPlace(item, `${where}[${i}]`, out)); }
  else if (node !== null && typeof node === 'object') { out.push(`${where} names ${JSON.stringify(Object.keys(node))}`); for (const [k, v] of Object.entries(node)) everyPlace(v, `${where}.${k}`, out); }
  else out.push(`${where} ${kind(node)} ${JSON.stringify(node)}`);
  return out;
}

test('the YAML file read the strict way equals the frozen JSON file from before the change: values, kinds and order of names, at every depth', () => {
  assert.deepStrictEqual(file, frozenJson);
  assert.equal(JSON.stringify(file), JSON.stringify(frozenJson), 'same names in the same order, same kinds, at every depth');
  assert.deepEqual(Object.keys(file), ['about', ...PARTS, 'notes']);
  const places = everyPlace(frozenJson);
  assert.equal(places.length, 1168, 'the comparison covers every value and group of the frozen file');
  assert.deepEqual(everyPlace(file), places);
});

test('the same comparison can see a changed value, a changed kind, a swapped order of names and a missing or extra entry', () => {
  const copy = () => JSON.parse(JSON.stringify(file));
  const differs = (c) => JSON.stringify(c) !== JSON.stringify(frozenJson) || everyPlace(c).join('\n') !== everyPlace(frozenJson).join('\n');
  let c = copy(); c.numbers.adult.adrenalineMg = 2; assert.ok(differs(c));
  c = copy(); c.numbers.weight.maxKg = '500'; assert.ok(differs(c));
  c = copy(); c.numbers.childBands[0].magnesiumMmol = 'null'; assert.ok(differs(c));
  c = copy(); const { cprCycleMs, ...rest } = c.numbers.timing; c.numbers.timing = { ...rest, cprCycleMs }; assert.ok(differs(c));
  c = copy(); c.notes = { ...Object.fromEntries(Object.entries(c.notes).reverse()) }; assert.ok(differs(c));
  c = copy(); delete c.equipment.maxTubeSizeMm; assert.ok(differs(c));
  c = copy(); c.sources.extra = 1; assert.ok(differs(c));
  assert.ok(!differs(copy()));
});

test('the YAML file is laid out the one standard way (so a one-value change is a one-line difference); the strict reader refuses repeated keys', () => {
  assert.equal(rulesFileText(file), yamlText);
  assert.ok(yamlText.endsWith('\n') && !yamlText.endsWith('\n\n'));
  assert.deepEqual(Object.keys(file), ['about', ...PARTS, 'notes']);
});

test('every comment in the baseline file is kept as a note (none lost)', () => {
  const squash = (t) => t.replace(/\s+/g, ' ').trim();
  const comments = baselineComments(baselineSource);
  assert.equal(comments[0].path, 'BASELINE-MARKER', 'the first comment is the baseline label added at the move');
  const original = comments.slice(1); // the baseline label is not one of the original comments
  assert.equal(original.length, 62, 'the original file has 62 comments');
  const kept = { about: file.about, ...file.notes };
  const newPlaces = pinnedNotes.map(([place]) => place); // notes added in stage 2 (pinned above), not from a baseline comment
  for (const c of original) {
    assert.ok(c.path in kept, `no note for "${c.path}"`);
    assert.ok(squash(kept[c.path]).includes(c.text), `note "${c.path}" does not contain the comment: ${c.text.slice(0, 60)}`);
  }
  // 62 comments became 1 "about" text + 59 notes = 60 places: two places explain two comments each.
  const places = new Set(original.map((c) => c.path));
  assert.equal(places.size, 60);
  assert.deepEqual([...Object.keys(kept)].filter((place) => !newPlaces.includes(place)).sort(), [...places].sort(), 'no note without a baseline comment (or pinned stage 2 note), no comment without a note');
  const merged = [...places].filter((p) => original.filter((c) => c.path === p).length > 1).sort();
  assert.deepEqual(merged, ['wording', 'wording.headerEnergyTitle'],
    'merged: the PART 2 heading + the "Reference wording" note (both before wording), and the "Below: wording whose {gaps}..." note + "Header and weight pop-up" (both before the first entry)');
});

test('the about text is the baseline file header, paragraph for paragraph', () => {
  const header = baselineComments(baselineSource)[1];
  assert.equal(file.about, header.paragraphs.join('\n\n'));
  assert.ok(file.about.startsWith('CLINICAL RULES FILE: NZ EAS clinical practice guidelines'));
});
