// APPROVED CHANGES: every rule-set value the owner has approved changing (doc 07 A-table) since the frozen
// reference copies were made (tests/baseline/, tests/golden/, owner decision 14 Nov 2026, Option A).
//
// The frozen copies are NEVER edited. A test that says "identical to the reference" compares with the frozen
// copy plus exactly these swaps, and nothing else. So the tests still prove that an approved change is the
// ONLY difference from the reference, and every swap here can be traced to its A-table row.
//
// Each change: the A-table row, the dotted place in the rules file, the value before and the value after.
// A value that was deleted has `after: REMOVED`, and a new value has `before: REMOVED`; both name the value
// they follow (`follows`), so the value goes in (or back) at the same place. A place is a dotted text, or a
// list of names when a name itself holds dots (notes are named after the place they describe).
// CODE_CHANGES lists the exact code edits of approved rows, so a copy of the app can be put back to the
// reference (appWithApprovedChangesUndone) for tests whose reference holds only fingerprints of screens.
// A swap fails loudly if the copy holds anything other than the "before" value at that place, so a wrong
// or out-of-date entry here cannot pass quietly.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readYamlStrict } from '../../src/rules/parse.js';
import { rulesFileText } from '../../src/rules/write.js';

export const REMOVED = Symbol('removed');
const NOTE_BANDS = "Child weight bands (EAS 7.2). A child's weight is ROUNDED UP to the next band (e.g. 15 kg uses the 20 kg row). magnesiumMmol null = no dose listed: seek clinical advice. shockJ = 4 J/kg of the band, from change A1 (owner-approved 3 Nov 2026).";
const OLD_FLUIDS = "/* Fluid volume reference in mL: adult range, or 20-40 mL/kg of the ACTUAL child weight.\n   Same comma quirk as magnesium (see above). */\nexport function fluidReference(session) {\n  if (!R.validWeight(session.weight)) return { min: null, max: null, basis: R.wording('noWeightFluidBasis') };\n  if (R.isPaediatric(session)) {\n    const kg = +session.weight;\n    const perKg = { minPerKg: RULES.numbers.child.fluidsMinMlPerKg, maxPerKg: RULES.numbers.child.fluidsMaxMlPerKg };\n    return { min: perKg.minPerKg * kg, max: perKg.maxPerKg * kg, basis: R.wording('childFluidBasis', perKg) };\n  }";
const NEW_FLUIDS = "/* Fluid volume reference in mL: adult range, or for a child the weight BAND (rounded up, change A11):\n   lower = the band's EAS 7.2 table volume (20 mL/kg), upper = 40 mL/kg x the band weight (EAS 3.14 formula),\n   with the working shown in the basis line. Same comma quirk as magnesium (see above). */\nexport function fluidReference(session) {\n  if (!R.validWeight(session.weight)) return { min: null, max: null, basis: R.wording('noWeightFluidBasis') };\n  if (R.isPaediatric(session)) {\n    const band = R.childBand(+session.weight);\n    if (!band) return { min: null, max: null, basis: R.wording('noWeightFluidBasis') }; // cannot happen: a saved comma weight is converted on load\n    const maxPerKg = RULES.numbers.child.fluidsMaxMlPerKg;\n    const min = band.fluidsTableMl, max = maxPerKg * band.maxKg;\n    return { min, max, basis: R.wording('childFluidBasis', { band: band.maxKg, min, maxPerKg, max }) };\n  }";

export const APPROVED_CHANGES = [
  // A9 (approved 14 Nov 2026): magnesium at the 5 and 10 kg bands reads "Seek clinical advice".
  { row: 'A9', path: 'wording.liveCards.doseClinicalReview', before: 'Dose: clinical review', after: 'Seek clinical advice' },
  { row: 'A9', path: 'wording.liveCards.reviewDose', before: 'Review dose', after: 'Seek clinical advice' },
  { row: 'A9', path: 'wording.magnesiumNoDose', before: 'Dose requires clinical review', after: 'Seek clinical advice' },
  // A10 (approved 14 Nov 2026): a child's second amiodarone dose has no guideline source; the numbers are deleted.
  ...[12.5, 25, 50, 75, 100].map((mg, band) => ({ row: 'A10', path: `numbers.childBands.${band}.amiodaroneSecondMg`, before: mg, after: REMOVED, follows: 'amiodaroneFirstMg' })),
  // A11 (approved 14 Nov 2026): child fluids from the weight band; 20 mL/kg volume from the EAS 7.2 table.
  ...[100, 200, 400, 600, 800].map((ml, band) => ({ row: 'A11', path: `numbers.childBands.${band}.fluidsTableMl`, before: REMOVED, after: ml, follows: 'shockJ' })),
  { row: 'A11', path: 'wording.childFluidBasis', before: '{minPerKg}–{maxPerKg} mL/kg · EAS 3.14', after: 'Child · {band} kg CPG band (rounded up) · {min} mL from the EAS 7.2 table; {maxPerKg} mL/kg × {band} kg = {max} mL (EAS 3.14)' },
  { row: 'A11', path: ['notes', 'numbers.child.fluidsMinMlPerKg'], before: '20-40 mL/kg of the ACTUAL weight (not the band), EAS 3.14', after: "20-40 mL/kg, EAS 3.14. A child uses the weight band (change A11): the lower volume is the band's fluidsTableMl, the upper is fluidsMaxMlPerKg x the band weight" },
  { row: 'A11', path: ['notes', 'numbers.childBands'], before: NOTE_BANDS, after: NOTE_BANDS + ' fluidsTableMl = the 0.9% sodium chloride 20 mL/kg volume from the EAS 7.2 band table (change A11, owner-approved 14 Nov 2026).' },
];

/* The exact code edits of approved rows: file, code before, code after (each "after" must occur once). */
export const CODE_CHANGES = [
  { row: 'A10', file: 'src/engine/core.js', before: '    amio2: band.amiodaroneSecondMg,\n', after: '    amio2: null, // A10: no guideline source for a child\'s second dose\n' },
  { row: 'A10', file: 'src/app/views.js', before: '', after: "  else if (doseReference && value === null) doseText = ''; // A10: a child's second dose has no number (two doses recorded: empty line)\n" },
  { row: 'A11', file: 'src/engine/rhythm-care.js', before: OLD_FLUIDS, after: NEW_FLUIDS },
];

/* Put a value back into a group directly after the name it followed (keeps the order of names). */
function insertAfter(group, follows, name, value) {
  const entries = Object.entries(group);
  const at = entries.findIndex(([key]) => key === follows);
  assert.ok(at >= 0, `cannot put ${name} back: ${follows} is missing`);
  entries.splice(at + 1, 0, [name, value]);
  for (const key of Object.keys(group)) delete group[key];
  Object.assign(group, Object.fromEntries(entries));
}

/* The group holding a dotted place and the last name, or null when the place is not in this tree
   (each frozen copy holds only some places: the v22 baseline has no liveCards, for example). */
const namesOf = (place) => (Array.isArray(place) ? place : place.split('.'));
const shown = (place) => (Array.isArray(place) ? place.join(' › ') : place);

function placeIn(tree, dotted, mustHoldName = true) {
  const names = namesOf(dotted);
  let group = tree;
  for (const name of names.slice(0, -1)) {
    if (group === null || typeof group !== 'object' || !Object.hasOwn(group, name)) return null;
    group = group[name];
  }
  const last = names.at(-1);
  if (group === null || typeof group !== 'object') return null;
  return !mustHoldName || Object.hasOwn(group, last) ? { group, last } : null;
}

/* A copy of a rule-set tree (or a whole rules file) with every approved change made where the place
   exists. direction 'forward' = before -> after (frozen copy as it should be now); 'undo' = after -> before
   (today's file with the approved changes taken out, to compare with recordings that store only
   fingerprints of screens). Fails if a place holds an unexpected value. */
export function withApprovedChanges(tree, direction = 'forward') {
  const copy = structuredClone(tree);
  for (const change of APPROVED_CHANGES) {
    const [from, to] = direction === 'undo' ? [change.after, change.before] : [change.before, change.after];
    const place = placeIn(copy, change.path, from !== REMOVED);
    if (!place) continue;
    if (from === REMOVED) {
      // undoing a deletion: the place must be empty, then the value goes back after the name it followed
      if (!Object.hasOwn(place.group, change.follows)) continue; // this copy does not hold that group
      assert.ok(!Object.hasOwn(place.group, place.last), `${change.row} ${shown(change.path)}: expected no value, found ${JSON.stringify(place.group[place.last])}`);
      insertAfter(place.group, change.follows, place.last, to);
      continue;
    }
    assert.ok(Object.is(place.group[place.last], from), `${change.row} ${shown(change.path)}: expected ${JSON.stringify(from)}, found ${JSON.stringify(place.group[place.last])}`);
    if (to === REMOVED) delete place.group[place.last];
    else place.group[place.last] = to;
  }
  return copy;
}

/* The same swaps on a flat map of dotted place -> value (tests/baseline/stage2-additions.json). */
export function withApprovedChangesFlat(map) {
  const copy = { ...map };
  for (const change of APPROVED_CHANGES) {
    if (Array.isArray(change.path) || !Object.hasOwn(copy, change.path)) continue;
    assert.ok(Object.is(copy[change.path], change.before), `${change.row} ${shown(change.path)}: expected ${JSON.stringify(change.before)}, found ${JSON.stringify(copy[change.path])}`);
    if (change.after === REMOVED) delete copy[change.path];
    else copy[change.path] = change.after;
  }
  return copy;
}

/* The same swaps on the TEXT of the frozen JSON file (tests/baseline/nz-eas-before-yaml.json), keeping its
   layout, for tests that edit that text. Each swap must match exactly one line, and the result must read as
   exactly withApprovedChanges of the original. */
export function withApprovedChangesInJsonText(text) {
  let result = text;
  for (const change of APPROVED_CHANGES) {
    const key = namesOf(change.path).at(-1);
    const escape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (change.before === REMOVED) {
      // a new value: put its line straight after the line of the value it follows, in the same group
      const names = namesOf(change.path), group = names.slice(0, -1).reduce((node, name) => node[name], JSON.parse(text));
      const after = `"${change.follows}": ${JSON.stringify(group[change.follows])}`;
      const line = new RegExp(`(\\n[ ]*)${escape(after)}(,?)(?=\\n)`, 'g');
      assert.equal((result.match(line) || []).length, 1, `${change.row} ${shown(change.path)}: the line "${after}" must appear exactly once`);
      result = result.replace(line, (all, indent, comma) => `${indent}${after},${indent}"${key}": ${JSON.stringify(change.after)}${comma}`);
      continue;
    }
    const find = `"${key}": ${JSON.stringify(change.before)}`;
    if (change.after === REMOVED) {
      // delete the whole line (with its comma); the value is never the last in its group here
      const line = new RegExp(`\\n[ ]*${escape(find)},(?=\\n)`, 'g');
      assert.equal((result.match(line) || []).length, 1, `${change.row} ${shown(change.path)}: the line "${find}," must appear exactly once`);
      result = result.replace(line, '');
      continue;
    }
    assert.equal(result.split(find).length - 1, 1, `${change.row} ${shown(change.path)}: "${find}" must appear exactly once`);
    result = result.replace(find, `"${key}": ${JSON.stringify(change.after)}`);
  }
  assert.deepStrictEqual(JSON.parse(result), withApprovedChanges(JSON.parse(text)));
  return result;
}

/* A temporary copy of the app (index.html and src/) whose rules file has every approved change taken out
   again. Used where the reference stores only fingerprints of screens (tests/golden/step3a-v21-output.json):
   this copy must still give exactly the recorded screens, which proves nothing else changed. Returns the
   folder; the caller removes it. */
export function appWithApprovedChangesUndone(root) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pocket-resus-undone-'));
  cpSync(path.join(root, 'index.html'), path.join(dir, 'index.html'));
  cpSync(path.join(root, 'src'), path.join(dir, 'src'), { recursive: true });
  mkdirSync(path.join(dir, 'tests', 'helpers'), { recursive: true }); // where test entry files are built from
  const file = path.join(dir, 'src', 'rules', 'nz-eas.yaml');
  const undone = withApprovedChanges(readYamlStrict(readFileSync(file, 'utf8')), 'undo');
  writeFileSync(file, rulesFileText(undone));
  for (const change of CODE_CHANGES) {
    const where = path.join(dir, change.file), code = readFileSync(where, 'utf8');
    const find = change.after;
    assert.equal(code.split(find).length - 1, 1, `${change.row} ${change.file}: the approved code must appear exactly once`);
    writeFileSync(where, code.replace(find, change.before));
  }
  return dir;
}
