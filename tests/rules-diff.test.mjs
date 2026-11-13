// Rules editor stage E1: the what-changed tool (tests/reference/lib/rules-diff.mjs, run from tools/rules-diff.mjs).
// Proof that it (1) finds planted changes of several kinds and names the screens they change, (2) reports
// nothing at all for two identical rule sets, and (3) leaves out cases over the owner's testing limits
// (90 minutes of case time, 10 adrenaline doses). Each planted change is played only on a few cases that are
// known to show it, to keep the test quick; the tool itself plays the whole fast set by default.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CASE_LIMITS, compareRuleSets, fastCaseIds, formatReport, parseCaseList, readable } from './reference/lib/rules-diff.mjs';
import { Pool } from './reference/lib/run.mjs';
import { ROOT } from './reference/lib/reference-app.mjs';

const rulesText = readFileSync(path.join(ROOT, 'src/rules/nz-eas.json'), 'utf8');
const fresh = () => JSON.parse(rulesText); // a new copy of the reference rules each time
const pool = new Pool(2);
after(() => pool.close());

/* Change the rule set with `edit`, compare with the reference on `caseIds`. */
async function whatChanged(edit, caseIds, options = {}) {
  const changed = fresh(); edit(changed);
  return compareRuleSets(fresh(), changed, { caseIds, pool, ...options });
}
const screensWith = (result, surface, side, needle) => result.differences.filter((d) => d.surface === surface && d[side].includes(needle));

test('two identical rule sets: nothing differs, in any case, on any screen or in the saved session', async () => {
  const result = await compareRuleSets(fresh(), fresh(), { caseIds: [0, 1, 2, 3, 7, 11], includeSaved: true, pool });
  assert.deepEqual(result.differences, []);
  assert.deepEqual(result.differingCases, []);
  assert.equal(result.casesCompared, result.casesChosen);
  assert.equal(result.casesIdentical, result.casesCompared);
  assert.ok(result.casesCompared >= 5, 'the identical rule sets were not really played');
  assert.match(formatReport(result), /No screen differs/);
});

test('planted change, a number: adult adrenaline 1 mg becomes 0.5 mg; the Live screen is named, before and after', async () => {
  const result = await whatChanged((r) => { r.numbers.adult.adrenalineMg = 0.5; }, [0, 1]);
  assert.ok(result.differingCases.length >= 1);
  const hits = screensWith(result, 'main', 'after', '0.5 mg');
  assert.ok(hits.length, 'no Live screen shows 0.5 mg');
  assert.ok(hits.every((d) => d.before.includes('1 mg') && !d.before.includes('0.5 mg')));
  const d = hits[0];
  assert.ok(Number.isInteger(d.step) && d.step >= 1 && d.tap && d.theme && d.part === 'screens');
  assert.ok(d.changes.some((l) => /^\s+- /.test(l)) && d.changes.some((l) => /^\s+\+ /.test(l)), 'the changes must show a "-" line and a "+" line');
});

test('planted change, a sentence: "No dose recorded" becomes "No dose given"', async () => {
  const result = await whatChanged((r) => { r.wording.liveCards.noDoseRecorded = 'No dose given'; }, [1, 2]);
  const hits = screensWith(result, 'main', 'after', 'No dose given');
  assert.ok(hits.length, 'no screen shows the new sentence');
  assert.ok(hits.every((d) => d.before.includes('No dose recorded')));
  assert.ok(result.differences.every((d) => d.after.includes('No dose given') || d.before.includes('No dose recorded') || d.surface !== 'main'), 'only screens with the sentence should differ on the Live screen');
});

test('planted change, a list item: "Other" no longer brings the fluids card', async () => {
  const result = await whatChanged((r) => { r.numbers.lowerCard.fluidRhythms = ['PEA', 'Asystole']; }, [14, 11, 12]);
  assert.ok(result.differences.length >= 1, 'the removed list item changed no screen');
  assert.ok(result.differences.every((d) => d.part === 'screens'));
  assert.ok(result.differences.some((d) => d.surface === 'main'), 'the Live screen should be named');
});

test('planted change, a list item in a choice list: the 20 minute start choice becomes 30', async () => {
  const result = await whatChanged((r) => { r.numbers.resusStart.quickChoicesMin = [5, 10, 15, 30]; }, [6, 7]);
  const hits = result.differences.filter((d) => d.after.includes('30 min before app opened') && !d.before.includes('30 min before app opened'));
  assert.ok(hits.length, 'no screen shows the new choice');
  assert.ok(hits.some((d) => d.surface === 'sheet'), 'the pop-up with the choices should be named');
});

test('planted change, a threshold: the seconds warning at 31 s instead of 30 s names the timer screens and the wait that causes it', async () => {
  const result = await whatChanged((r) => { r.numbers.timing.warningAtMs = 31000; }, [7]);
  const hits = screensWith(result, 'main', 'after', '31 seconds remaining');
  assert.ok(hits.length, 'no screen shows the warning at 31 s');
  assert.ok(hits.every((d) => d.before.includes('30 seconds remaining') || !d.before.includes('31 seconds')));
  assert.ok(hits.some((d) => /^wait /.test(d.tap)), 'the step that lets time pass should be named: ' + hits.map((d) => d.tap).join(' | '));
});

test('planted change, a narrower threshold: the "prepare" panel from 10 s instead of 15 s', async () => {
  const result = await whatChanged((r) => { r.numbers.timing.prepareAtMs = 10000; }, [7]);
  assert.ok(result.differences.length >= 1);
  assert.ok(screensWith(result, 'main', 'before', 'Prepare for rhythm check').length >= 1, 'the screens that stopped saying "Prepare" at 15 s should be named');
});

test('planted change, a table row: the 30 kg band magnesium 6 mmol becomes 7 mmol; the card and the Administration pop-up are named', async () => {
  const result = await whatChanged((r) => { r.numbers.childBands[3].magnesiumMmol = 7; }, [3]);
  const card = screensWith(result, 'main', 'after', '7 mmol IV');
  assert.ok(card.length && card.every((d) => d.before.includes('6 mmol IV')), 'the Live screen card should change from 6 to 7 mmol');
  const popup = screensWith(result, 'sheet', 'after', '7 mmol IV');
  assert.ok(popup.length && popup.every((d) => d.before.includes('6 mmol IV')), 'the Administration pop-up should change from 6 to 7 mmol');
});

test('the saved session is compared only when asked for: a changed event title is found there, as readable lines', async () => {
  const edit = (r) => { r.wording.eventTitles.cycleStarted = 'Cycle begun'; };
  const screensOnly = await whatChanged(edit, [1]);
  assert.ok(screensOnly.differences.length > 0 && screensOnly.differences.every((d) => d.part === 'screens'));
  const withSaved = await whatChanged(edit, [1], { includeSaved: true });
  const saved = withSaved.differences.filter((d) => d.part === 'saved' && d.surface === 'stored');
  assert.ok(saved.length, 'the changed title should be found in the saved session');
  assert.ok(saved.every((d) => d.after.includes('Cycle begun') && !d.before.includes('Cycle begun')));
  assert.ok(saved.every((d) => d.after.split('\n').length > 20), 'the saved session should be shown as indented lines, not one long line');
});

test('the testing limits: a case over 90 minutes, or over 10 adrenaline doses, is left out and listed', async () => {
  assert.deepEqual(CASE_LIMITS, { maxMinutes: 90, maxAdrenalineDoses: 10 });
  // case 16 runs about 196 minutes; case 6 gives 6 adrenaline doses within an hour
  const longCase = await compareRuleSets(fresh(), fresh(), { caseIds: [16, 0], pool });
  assert.deepEqual(longCase.skipped.map((s) => s.id), [16]);
  assert.match(longCase.skipped[0].reason, /minutes \(limit 90\)/);
  assert.equal(longCase.casesCompared, 1);
  const doses = await compareRuleSets(fresh(), fresh(), { caseIds: [6], pool, maxAdrenalineDoses: 5 });
  assert.deepEqual(doses.skipped.map((s) => s.id), [6]);
  assert.match(doses.skipped[0].reason, /adrenaline doses \(limit 5\)/);
  const within = await compareRuleSets(fresh(), fresh(), { caseIds: [6], pool });
  assert.deepEqual(within.skipped, []);
});

test('the default case list is the fast set, and a list such as "5,9-12" is understood', () => {
  assert.equal(fastCaseIds().length, 249);
  assert.deepEqual(parseCaseList('5,9-12'), [5, 9, 10, 11, 12]);
  assert.throws(() => parseCaseList('abc'), /not a case number/);
});

test('readable() turns a screen into the words a person reads', () => {
  assert.equal(readable('<div class="x"><b>Adrenaline</b> 1 mg</div><button>Record &amp; go</button>|values=a=1'), 'Adrenaline 1 mg\nRecord & go\n|values=a=1');
});

test('the command line prints "no screen differs" for two identical rules files, and the report for a changed one', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pocket-resus-rules-diff-test-'));
  try {
    const same = path.join(dir, 'same.json'), changed = path.join(dir, 'changed.json');
    writeFileSync(same, rulesText);
    const edited = fresh(); edited.wording.liveCards.noDoseRecorded = 'No dose given';
    writeFileSync(changed, JSON.stringify(edited));
    const run = (...args) => execFileSync('node', ['tools/rules-diff.mjs', ...args, '--cases', '1'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    assert.match(run(same, same), /No screen differs/);
    const report = run(same, changed);
    assert.match(report, /screen\(s\) differ/);
    assert.match(report, /- .*No dose recorded/);
    assert.match(report, /\+ .*No dose given/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
