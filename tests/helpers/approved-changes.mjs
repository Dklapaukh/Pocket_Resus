// APPROVED CHANGES: every rule-set value the owner has approved changing (doc 07 A-table) since the frozen
// reference copies were made (tests/baseline/, tests/golden/, owner decision 14 Nov 2026, Option A).
//
// The frozen copies are NEVER edited. A test that says "identical to the reference" compares with the frozen
// copy plus exactly these swaps, and nothing else. So the tests still prove that an approved change is the
// ONLY difference from the reference, and every swap here can be traced to its A-table row.
//
// Each change: the A-table row, the dotted place in the rules file, the value before and the value after.
// A swap fails loudly if the copy holds anything other than the "before" value at that place, so a wrong
// or out-of-date entry here cannot pass quietly.
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readYamlStrict } from '../../src/rules/parse.js';
import { rulesFileText } from '../../src/rules/write.js';

export const APPROVED_CHANGES = [
  // A9 (approved 14 Nov 2026): magnesium at the 5 and 10 kg bands reads "Seek clinical advice".
  { row: 'A9', path: 'wording.liveCards.doseClinicalReview', before: 'Dose: clinical review', after: 'Seek clinical advice' },
  { row: 'A9', path: 'wording.liveCards.reviewDose', before: 'Review dose', after: 'Seek clinical advice' },
  { row: 'A9', path: 'wording.magnesiumNoDose', before: 'Dose requires clinical review', after: 'Seek clinical advice' },
];

/* The group holding a dotted place and the last name, or null when the place is not in this tree
   (each frozen copy holds only some places: the v22 baseline has no liveCards, for example). */
function placeIn(tree, dotted) {
  const names = dotted.split('.');
  let group = tree;
  for (const name of names.slice(0, -1)) {
    if (group === null || typeof group !== 'object' || !Object.hasOwn(group, name)) return null;
    group = group[name];
  }
  const last = names.at(-1);
  return group !== null && typeof group === 'object' && Object.hasOwn(group, last) ? { group, last } : null;
}

/* A copy of a rule-set tree (or a whole rules file) with every approved change made where the place
   exists. direction 'forward' = before -> after (frozen copy as it should be now); 'undo' = after -> before
   (today's file with the approved changes taken out, to compare with recordings that store only
   fingerprints of screens). Fails if a place holds an unexpected value. */
export function withApprovedChanges(tree, direction = 'forward') {
  const copy = structuredClone(tree);
  for (const change of APPROVED_CHANGES) {
    const [from, to] = direction === 'undo' ? [change.after, change.before] : [change.before, change.after];
    const place = placeIn(copy, change.path);
    if (!place) continue;
    assert.ok(Object.is(place.group[place.last], from), `${change.row} ${change.path}: expected ${JSON.stringify(from)}, found ${JSON.stringify(place.group[place.last])}`);
    place.group[place.last] = to;
  }
  return copy;
}

/* The same swaps on a flat map of dotted place -> value (tests/baseline/stage2-additions.json). */
export function withApprovedChangesFlat(map) {
  const copy = { ...map };
  for (const change of APPROVED_CHANGES) {
    if (!Object.hasOwn(copy, change.path)) continue;
    assert.ok(Object.is(copy[change.path], change.before), `${change.row} ${change.path}: expected ${JSON.stringify(change.before)}, found ${JSON.stringify(copy[change.path])}`);
    copy[change.path] = change.after;
  }
  return copy;
}

/* The same swaps on the TEXT of the frozen JSON file (tests/baseline/nz-eas-before-yaml.json), keeping its
   layout, for tests that edit that text. Each swap must match exactly one line, and the result must read as
   exactly withApprovedChanges of the original. */
export function withApprovedChangesInJsonText(text) {
  let result = text;
  for (const change of APPROVED_CHANGES) {
    const key = change.path.split('.').at(-1);
    const find = `"${key}": ${JSON.stringify(change.before)}`;
    assert.equal(result.split(find).length - 1, 1, `${change.row} ${change.path}: "${find}" must appear exactly once`);
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
  const file = path.join(dir, 'src', 'rules', 'nz-eas.yaml');
  const undone = withApprovedChanges(readYamlStrict(readFileSync(file, 'utf8')), 'undo');
  writeFileSync(file, rulesFileText(undone));
  return dir;
}
