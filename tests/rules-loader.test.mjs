// Stage 1: the rules loader (src/rules/load.js). The real loader is run the way a phone runs it (a page
// with a document, and fetch reading nz-eas.yaml), using a temporary copy of src/ so a broken rules file
// can be tried. It must give the same rule set, and when the file cannot be loaded it must show ONE plain
// message and the engine (so the app) must not start. (The Node tests and the fake browser read the file
// without fetch; see tests/helpers/rules-for-fake-browser.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RULES as BASELINE } from './baseline/nz-eas-v22-a8.js';
import { readYamlStrict } from '../src/rules/parse.js';
import { rulesFileText } from '../src/rules/write.js';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

// Run the engine's module graph in a copy of src/ as a phone would. fetchBehaviour(url, realText) returns the response.
async function onAPhone(editText, fetchBehaviour) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pocket-resus-loader-'));
  cpSync(SRC, path.join(dir, 'src'), { recursive: true });
  const rulesFile = path.join(dir, 'src/rules/nz-eas.yaml');
  const real = readFileSync(rulesFile, 'utf8');
  if (editText) writeFileSync(rulesFile, editText(real));
  const page = { children: [] };
  const element = () => ({ style: {}, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, textContent: '' });
  const fetched = [], realFetch = globalThis.fetch;
  globalThis.document = { createElement: element, body: { replaceChildren(...nodes) { page.children = nodes; } } };
  globalThis.fetch = async (url) => { fetched.push(String(url)); return fetchBehaviour(url, readFileSync(fileURLToPath(url), 'utf8')); };
  try {
    let outcome;
    try { outcome = { engine: await import(pathToFileURL(path.join(dir, 'src/engine/index.js')).href) }; } catch (error) { outcome = { error }; }
    return { ...outcome, page, fetched };
  } finally {
    delete globalThis.document; globalThis.fetch = realFetch;
    rmSync(dir, { recursive: true, force: true });
  }
}
const ok = (url, text) => ({ ok: true, status: 200, text: async () => text });

// Stage 2 added values to the file (pinned in tests/baseline/stage2-additions.json and checked in
// rules-yaml-same-as-baseline.test.mjs), so "the same rule set" now means: exactly the five parts of the file on
// disk, and every value of the frozen baseline still in it, identical.
function assertHolds(actual, baseline, where) {
  if (baseline !== null && typeof baseline === 'object') {
    assert.ok(actual !== null && typeof actual === 'object' && Array.isArray(actual) === Array.isArray(baseline), where + ': wrong kind');
    for (const key of Object.keys(baseline)) { assert.ok(key in actual, where + '.' + key + ' is missing'); assertHolds(actual[key], baseline[key], where + '.' + key); }
  } else assert.ok(Object.is(actual, baseline), where + ': ' + JSON.stringify(actual) + ' is not ' + JSON.stringify(baseline));
}
test('on a phone: the file is fetched next to the loader and gives exactly the rule set in the file (with every baseline value)', async () => {
  const r = await onAPhone(null, ok);
  assert.equal(r.error, undefined);
  assert.equal(r.fetched.length, 1);
  assert.match(r.fetched[0], /\/src\/rules\/nz-eas\.yaml$/);
  const onDisk = readYamlStrict(readFileSync(new URL('../src/rules/nz-eas.yaml', import.meta.url), 'utf8'));
  assert.deepEqual(r.engine.Resus.RULES, Object.fromEntries(Object.keys(BASELINE).map((part) => [part, onDisk[part]])));
  assert.deepEqual(Object.keys(r.engine.Resus.RULES), Object.keys(BASELINE));
  assertHolds(r.engine.Resus.RULES, BASELINE, 'rules');
  assert.equal(r.page.children.length, 0, 'no message when all is well');
});

const FAILURES = [
  ['the file is not found (offline and not saved, or deleted)', null, () => ({ ok: false, status: 404, text: async () => 'Not found' }), /status 404/],
  ['the network fails', null, () => { throw new TypeError('Failed to fetch'); }, /Failed to fetch/],
  ['the file is not valid YAML', (t) => t + 'broken: [unclosed\n', ok, /not valid YAML/],
  ['the file is empty', () => '', ok, /not valid YAML/],
  ['a name is used twice in the file', (t) => t + 'numbers:\n  timing: 1\n', ok, /not valid YAML: duplicated mapping key/],
  ['the file holds two documents', (t) => t + '---\na: 1\n', ok, /not valid YAML: it must hold exactly one document/],
  ['the file uses an anchor', (t) => t.replace('\nnumbers:\n', '\nnumbers: &n\n'), ok, /uses a YAML anchor/],
  ['the file uses an alias', (t) => t.replace('cprCycleMs: 120000', 'cprCycleMs: *n'), ok, /uses a YAML alias/],
  ['the file uses a tag', (t) => t.replace('\nnumbers:\n', '\nnumbers: !!map\n'), ok, /uses a YAML tag/],
  ['the file holds a number written as 1e3', (t) => t.replace('cprCycleMs: 120000', 'cprCycleMs: 1e3'), ok, /looks like a number or date/],
  ['the file has a value left empty', (t) => t.replace('cprCycleMs: 120000', 'cprCycleMs:'), ok, /left empty/],
  ['the file has a # comment', (t) => t.replace('cprCycleMs: 120000', 'cprCycleMs: 120000 # two minutes'), ok, /# comment/],
  ['the file holds a list, not the rules', () => '[]', ok, /wrong shape/],
  ['a part is missing', (t) => { const f = readYamlStrict(t); delete f.wording; return rulesFileText(f); }, ok, /missing part: wording/],
  ['two parts are not groups', (t) => { const f = readYamlStrict(t); f.numbers = 5; f.sources = null; return rulesFileText(f); }, ok, /missing part: numbers, sources/],
];
for (const [what, edit, behaviour, reason] of FAILURES) {
  test('when ' + what + ': one plain message is shown and the app does not start', async () => {
    const r = await onAPhone(edit, behaviour);
    assert.ok(r.error, 'the module graph must not load');
    assert.equal(r.engine, undefined);
    assert.equal(r.page.children.length, 1, 'exactly one message replaces the page');
    const box = r.page.children[0];
    assert.equal(box.attrs.role, 'alert');
    assert.match(box.textContent, /^The clinical rules could not be loaded, so the app has not started and no doses or timers are shown\./);
    assert.match(box.textContent, reason);
    assert.match(box.textContent, /open it again while you are online/);
  });
}

test('the reader keeps only the five parts, in order, and ignores about and notes', async () => {
  const { parseRules, PARTS } = await import('../src/rules/parse.js');
  const rules = parseRules(readFileSync(path.join(SRC, 'rules/nz-eas.yaml'), 'utf8'));
  assert.deepEqual(Object.keys(rules), PARTS);
  assert.deepEqual(PARTS, ['numbers', 'wording', 'checklists', 'equipment', 'sources']);
  const rearranged = parseRules(rulesFileText({ notes: { x: 'y' }, about: 'z', sources: {}, equipment: {}, checklists: {}, wording: {}, numbers: {}, extra: 1 }));
  assert.deepEqual(Object.keys(rearranged), PARTS);
});
