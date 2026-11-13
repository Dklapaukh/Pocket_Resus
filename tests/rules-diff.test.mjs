// Rules editor stage E1: the what-changed tool (tests/reference/lib/rules-diff.mjs, run from tools/rules-diff.mjs).
// Proof that it (1) finds planted changes of several kinds and names the screens they change, (2) reports
// nothing at all for two identical rule sets, and (3) leaves out cases over the owner's testing limits
// (90 minutes of case time, 10 adrenaline doses), (4) never claims "no differences" when nothing was really compared, and
// (5) compares the saved session by default. Each planted change is played only on a few cases that are
// known to show it, to keep the test quick; the tool itself plays the whole fast set by default.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CASE_LIMITS, compareRuleSets, fastCaseIds, formatReport, parseCaseList, readable } from './reference/lib/rules-diff.mjs';
import { Pool } from './reference/lib/run.mjs';
import { ROOT } from './reference/lib/reference-app.mjs';
import { readYamlStrict } from '../src/rules/parse.js';
import { rulesFileText } from '../src/rules/write.js';

const rulesText = readFileSync(path.join(ROOT, 'src/rules/nz-eas.yaml'), 'utf8');
const fresh = () => readYamlStrict(rulesText); // a new copy of the reference rules each time
const pool = new Pool(2);
after(() => pool.close());

/* Change the rule set with `edit`, compare with the reference on `caseIds`. */
async function whatChanged(edit, caseIds, options = {}) {
  const changed = fresh(); edit(changed);
  return compareRuleSets(fresh(), changed, { caseIds, pool, ...options });
}
const screensWith = (result, surface, side, needle) => result.differences.filter((d) => d.surface === surface && d[side].includes(needle));

test('two identical rule sets: nothing differs, in any case, on any screen or in the saved session (both are compared by default)', async () => {
  const result = await compareRuleSets(fresh(), fresh(), { caseIds: [0, 1, 2, 3, 7, 11], pool });
  assert.equal(result.savedCompared, true, 'the saved session must be compared unless the person opts out');
  assert.equal(result.nothingDiffers, true);
  assert.equal(result.complete, true);
  assert.deepEqual(result.trouble, []);
  assert.deepEqual(result.notPlayed, []);
  assert.deepEqual(result.differences, []);
  assert.deepEqual(result.differingCases, []);
  assert.equal(result.casesCompared, result.casesChosen);
  assert.equal(result.casesIdentical, result.casesCompared);
  assert.ok(result.casesCompared >= 5, 'the identical rule sets were not really played');
  assert.match(formatReport(result), /No screen differs and the saved session does not differ/);
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
  const result = await whatChanged((r) => { r.numbers.lowerCard.fluidRhythms = ['PEA', 'Asystole']; }, [14, 11, 12], { includeSaved: false }); // screens only, as this test is about screens
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

test('the saved session is compared by default: a change that touches only what is saved (a log entry\'s wording) is found, as readable lines', async () => {
  const edit = (r) => { r.wording.eventDetails.rhythmNotRecorded += ' (changed)'; }; // case 1 saves this wording but never shows it on a screen
  const byDefault = await whatChanged(edit, [1]);
  assert.equal(byDefault.savedCompared, true);
  assert.ok(byDefault.differences.length > 0 && byDefault.differences.every((d) => d.part === 'saved'), 'the change should be found in the saved session only');
  assert.equal(byDefault.nothingDiffers, false);
  assert.doesNotMatch(formatReport(byDefault), /No screen differs|behave the same/);
  const stored = byDefault.differences.filter((d) => d.surface === 'stored');
  assert.ok(stored.length, 'the changed wording should be found in the saved session');
  assert.ok(stored.every((d) => d.after.includes('(changed)') && !d.before.includes('(changed)')));
  assert.ok(stored.every((d) => d.after.split('\n').length > 20), 'the saved session should be shown as indented lines, not one long line');
  // Still found with a change to a title that also shows on screen: screens and saved session both listed.
  const both = await whatChanged((r) => { r.wording.eventTitles.cycleStarted = 'Cycle begun'; }, [1]);
  assert.ok(both.differences.some((d) => d.part === 'screens') && both.differences.some((d) => d.part === 'saved'));
});

test('opting out of the saved session ("screens only"): the same saved-only change is missed, and the report says plainly that the saved session was NOT compared', async () => {
  const result = await whatChanged((r) => { r.wording.eventDetails.rhythmNotRecorded += ' (changed)'; }, [1], { includeSaved: false });
  assert.equal(result.savedCompared, false);
  assert.deepEqual(result.differences, []);
  const report = formatReport(result);
  assert.match(report, /saved session[^.]*was NOT compared/);
  assert.doesNotMatch(report, /behave the same/, 'a screens-only report must never say the rule sets behave the same');
  assert.doesNotMatch(report, /saved session does not differ/);
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

/* ---------- A comparison that compared nothing must never read as "no differences" ---------- */

const notReportedAsSame = (result) => {
  assert.equal(result.nothingDiffers, false);
  assert.doesNotMatch(formatReport(result), /No screen differs|behave the same|does not differ/);
};

test('nothing compared (an empty case list): not reported as "no differences"', async () => {
  const result = await compareRuleSets(fresh(), fresh(), { caseIds: [], pool });
  assert.equal(result.casesCompared, 0);
  assert.equal(result.complete, false);
  notReportedAsSame(result);
  assert.match(formatReport(result), /NOTHING WAS COMPARED/);
});

test('nothing compared (every chosen case is over the testing limits): not reported as "no differences"', async () => {
  const result = await compareRuleSets(fresh(), fresh(), { caseIds: [16], pool }); // case 16 runs about 196 minutes
  assert.equal(result.casesCompared, 0);
  assert.deepEqual(result.skipped.map((s) => s.id), [16]);
  notReportedAsSame(result);
  assert.match(formatReport(result), /NOTHING WAS COMPARED[^]*every chosen case was over the testing limits/);
});

test('case numbers that do not exist are an error, never silently ignored', async () => {
  await assert.rejects(compareRuleSets(fresh(), fresh(), { caseIds: [1, 999999], pool }), /case 999999 does not exist/);
  await assert.rejects(compareRuleSets(fresh(), fresh(), { caseIds: [-1], pool }), /does not exist/);
  await assert.rejects(compareRuleSets(fresh(), fresh(), { caseIds: [1.5], pool }), /does not exist/);
  assert.throws(() => parseCaseList('5,99999'), /case 99999 does not exist/);
});

test('a play that returns nothing for a case: the case is not counted as compared, and the report says so', async () => {
  const returnsNothing = { play: async () => [] };
  const result = await compareRuleSets(fresh(), fresh(), { caseIds: [1, 2], pool: returnsNothing });
  assert.deepEqual(result.notPlayed, [1, 2]);
  assert.equal(result.casesCompared, 0);
  notReportedAsSame(result);
  assert.match(formatReport(result), /PROBLEM: 2 chosen case\(s\) were not compared/);
  // Only one of two cases returned: the other is compared, but the whole comparison is incomplete and not "the same".
  const dropsCaseTwo = { play: async (dir, ids, o) => (await pool.play(dir, ids, o)).filter((enc) => enc.id !== 2) };
  const partly = await compareRuleSets(fresh(), fresh(), { caseIds: [1, 2], pool: dropsCaseTwo });
  assert.deepEqual(partly.notPlayed, [2]);
  assert.equal(partly.casesCompared, 1);
  assert.equal(partly.complete, false);
  notReportedAsSame(partly);
});

test('a case found different in the first pass is never counted as identical, even if the second pass lists nothing for it', async () => {
  const changed = fresh(); changed.wording.liveCards.noDoseRecorded = 'No dose given';
  // Second pass returns nothing at all:
  const noSecondPass = { play: (dir, ids, o) => (o?.mode === 'full' ? Promise.resolve([]) : pool.play(dir, ids, o)) };
  const a = await compareRuleSets(fresh(), changed, { caseIds: [1], pool: noSecondPass });
  assert.equal(a.casesDifferent, 1);
  assert.equal(a.casesIdentical, 0);
  assert.ok(a.differingCases.includes(1));
  assert.ok(a.trouble.length >= 1);
  notReportedAsSame(a);
  assert.match(formatReport(a), /PROBLEM: case 1 differs/);
  // Second pass plays the SAME rule set twice, so it lists no differing screen:
  let firstDir = null;
  const sameTwice = { play: (dir, ids, o) => { if (o?.mode !== 'full') return pool.play(dir, ids, o); firstDir ??= dir; return pool.play(firstDir, ids, o); } };
  const b = await compareRuleSets(fresh(), changed, { caseIds: [1], pool: sameTwice });
  assert.equal(b.casesDifferent, 1);
  assert.equal(b.casesIdentical, 0);
  assert.deepEqual(b.differences, []);
  assert.match(b.trouble.join('\n'), /case 1 was found different in the first pass, but the second pass lists no differing screen/);
  notReportedAsSame(b);
  assert.doesNotMatch(formatReport(b), /Identical: 1/);
});

test('the command line: identical files report no differences; a changed file gives the report; a saved-only change is found by default', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pocket-resus-rules-diff-test-'));
  try {
    const same = path.join(dir, 'same.yaml'), changed = path.join(dir, 'changed.yaml'), savedOnly = path.join(dir, 'saved-only.yaml');
    writeFileSync(same, rulesText);
    const edited = fresh(); edited.wording.liveCards.noDoseRecorded = 'No dose given';
    writeFileSync(changed, rulesFileText(edited));
    const logOnly = fresh(); logOnly.wording.eventDetails.rhythmNotRecorded += ' (changed)';
    writeFileSync(savedOnly, rulesFileText(logOnly));
    assert.match(cli(same, same, '--cases', '1').stdout, /No screen differs and the saved session does not differ/);
    assert.equal(cli(same, same, '--cases', '1').status, 0);
    const report = cli(same, changed, '--cases', '1');
    assert.equal(report.status, 0);
    assert.match(report.stdout, /screen\(s\) differ/);
    assert.match(report.stdout, /- .*No dose recorded/);
    assert.match(report.stdout, /\+ .*No dose given/);
    // A change that alters only what is saved: found by default, missed (and said so) with --screens-only.
    const found = cli(same, savedOnly, '--cases', '1');
    assert.match(found.stdout, /screen\(s\) differ \(stored \d+/);
    assert.match(found.stdout, /\(saved session\)/);
    assert.doesNotMatch(found.stdout, /No screen differs|behave the same/);
    const screensOnly = cli(same, savedOnly, '--cases', '1', '--screens-only');
    assert.match(screensOnly.stdout, /saved session[^.]*was NOT compared/);
    assert.doesNotMatch(screensOnly.stdout, /behave the same/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the command line still reads a rules file in the older JSON layout, and git:<commit> falls back to nz-eas.json for a commit from before the YAML change', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pocket-resus-rules-diff-test-'));
  try {
    const same = path.join(dir, 'same.yaml'), olderLayout = path.join(dir, 'older.json');
    writeFileSync(same, rulesText);
    writeFileSync(olderLayout, readFileSync(path.join(ROOT, 'tests/baseline/nz-eas-before-yaml.json'), 'utf8'));
    const fromJson = cli(same, olderLayout, '--cases', '1');
    assert.equal(fromJson.status, 0, fromJson.stderr);
    assert.match(fromJson.stdout, /No screen differs and the saved session does not differ/);
    const OLD_COMMIT = '8dc32e2'; // the last commit before the YAML change: its rules file is nz-eas.json
    if (spawnSync('git', ['cat-file', '-e', OLD_COMMIT + '^{commit}'], { cwd: ROOT }).status === 0) {
      const fromGit = cli('git:' + OLD_COMMIT, same, '--cases', '1');
      assert.equal(fromGit.status, 0, fromGit.stderr);
      assert.match(fromGit.stdout, /No screen differs and the saved session does not differ/);
    }
    const missing = cli('git:' + 'no-such-commit', same, '--cases', '1');
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /there is no rules file/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the command line exits with a non-zero code when nothing (or not everything) was compared, and when a case number does not exist', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pocket-resus-rules-diff-test-'));
  try {
    const same = path.join(dir, 'same.yaml');
    writeFileSync(same, rulesText);
    const tooLong = cli(same, same, '--cases', '16'); // case 16 is over the 90-minute testing limit, so nothing is compared
    assert.notEqual(tooLong.status, 0);
    assert.match(tooLong.stdout, /NOTHING WAS COMPARED/);
    assert.doesNotMatch(tooLong.stdout, /No screen differs|behave the same/);
    const empty = cli(same, same, '--cases', '');
    assert.notEqual(empty.status, 0);
    assert.doesNotMatch(empty.stdout, /No screen differs|behave the same/);
    const unknown = cli(same, same, '--cases', '1,999999');
    assert.notEqual(unknown.status, 0);
    assert.match(unknown.stderr, /case 999999 does not exist/);
    assert.equal(unknown.stdout, '');
    assert.notEqual(cli(same, same, '--cases', '1', '--no-such-option').status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* Run the command-line tool; returns { status, stdout, stderr } (never throws on a non-zero exit). */
function cli(...args) {
  const run = spawnSync('node', ['tools/rules-diff.mjs', ...args], { cwd: ROOT, encoding: 'utf8' });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}
