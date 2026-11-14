// WHAT-CHANGED LIBRARY (rules editor, stage E1): play the generated cases through the real app under TWO
// rule sets and list every screen that differs.
//
// It reuses the stage 0 safety-net machinery (the case generator, the tapping "person", the fake browser,
// the worker threads and the readable line differences in this folder) and plays the app code of the working
// copy twice: once with each rule set. Nothing in the working copy is touched; the two copies of the app
// live in temporary folders that are removed again afterwards.
//
// The main function is compareRuleSets(before, after, options). It takes two rule-set objects (the five
// parts, as in src/rules/nz-eas.yaml) and returns a plain object (see its comment), so the editor can use it
// later. The command-line wrapper is tools/rules-diff.mjs, which only prints the result.
//
// LIMITS FOR TEST CASES (the owner's testing limits, not app rules): a case counts only if it stays within
// 90 minutes of case time and 10 adrenaline doses, under BOTH rule sets. The generated cases are played,
// measured, and any case over a limit is left out of the comparison and listed as skipped.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Pool } from './run.mjs';
import { comparePart } from './format.mjs';
import { SCREEN_SURFACES, SAVED_SURFACES } from './driver.mjs';
import { FAST_CASES, RECORDED_CASES } from './cases.mjs';
import { ROOT } from './reference-app.mjs';
import { lines, diff } from './textdiff.mjs';
import { checkRuleSet } from '../../../src/rules/check.js';
import { rulesFileText } from '../../../src/rules/write.js';
import { readYamlStrict } from '../../../src/rules/parse.js';

/* The text of a file as it was at a commit, or null if the commit has no such file. */
function gitShow(commit, file) {
  try {
    return execFileSync('git', ['show', `${commit}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

/* A rule set from a file path, or from git:<commit> (the YAML file, or the older JSON file if the commit
   is from before the change to YAML). A file whose text starts with { is the older JSON layout.
   (Moved here from tools/rules-diff.mjs on 14 Nov 2026 so a test can check what is read without playing it:
   since A16 today's app cannot play a rule set from before A16, which has no age rows.) */
export function readRulesSpec(spec) {
  const text = spec.startsWith('git:')
    ? gitShow(spec.slice(4), 'src/rules/nz-eas.yaml') ?? gitShow(spec.slice(4), 'src/rules/nz-eas.json')
    : readFileSync(spec, 'utf8');
  if (text === null) throw new Error(`there is no rules file (src/rules/nz-eas.yaml or nz-eas.json) at ${spec}`);
  return text.trimStart().startsWith('{') ? JSON.parse(text) : readYamlStrict(text);
}

const PASS_TWO_BATCH = 16; // how many differing cases are held in full at one time
export const CASE_LIMITS = { maxMinutes: 90, maxAdrenalineDoses: 10 };

/* The default cases: the "fast set" (every sweep and 20 of each theme; under a minute per rule set). */
export const fastCaseIds = () => Array.from({ length: FAST_CASES }, (_, i) => i);
/* Every generated case (about ten minutes per rule set). */
export const allCaseIds = () => Array.from({ length: RECORDED_CASES }, (_, i) => i);

/* A temporary copy of the app (index.html and src/) whose rules file holds `rules`. Call cleanup() when done. */
export function appWithRules(rules) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pocket-resus-rules-diff-'));
  cpSync(path.join(ROOT, 'index.html'), path.join(dir, 'index.html'));
  cpSync(path.join(ROOT, 'src'), path.join(dir, 'src'), { recursive: true });
  writeFileSync(path.join(dir, 'src/rules/nz-eas.yaml'), rulesFileText(rules));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/* A screen as readable lines: tags removed, a new line where a block ends, the typed values ("|values=...") on
   their own lines. Used to show a person what was on screen. */
export function readable(surface) {
  return String(surface ?? '')
    .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/button|\/summary|\/label|\/legend|\/tr|\/section|\/header|\/nav|\/dialog)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\|/g, '\n|')
    .split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim()).filter(Boolean)
    .join('\n');
}

/* What a person reads of one surface: a screen as readable words; the saved session as indented JSON lines. */
const readableFor = (part, text) => (part === 'saved' ? lines(String(text ?? '')).join('\n') : readable(text));

/* The differences between one step's surface before and after, as diff lines ("-" before, "+" after) of what a
   person reads. If the readable text is the same and only the look changed (a style or a hidden attribute),
   the raw difference is shown instead and the first line says so. */
function changesOf(part, before, after) {
  const a = readableFor(part, before).split('\n'), b = readableFor(part, after).split('\n');
  if (a.join('\n') !== b.join('\n')) return diff(a, b, 1);
  return ['(the words are the same; only the look or a hidden detail changed)', ...diff(lines(before), lines(after), 0)];
}

/* "5,9-20" -> [5, 9, 10, ..., 20] (for the command line). */
export function parseCaseList(text) {
  const ids = [];
  for (const piece of String(text).split(',').map((p) => p.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(piece);
    if (!m) throw new Error(`"${piece}" is not a case number or range such as 5 or 9-20`);
    const last = +(m[2] ?? m[1]);
    if (last >= RECORDED_CASES) throw new Error(`case ${last} does not exist (the cases are numbered 0 to ${RECORDED_CASES - 1})`);
    for (let id = +m[1]; id <= last; id++) ids.push(id);
  }
  return ids;
}

/* Check that the chosen case numbers are real cases (whole numbers from 0 up to the last generated case) and
   drop repeats. A number that does not exist is an error, never silently ignored. */
export function checkCaseIds(caseIds) {
  if (!Array.isArray(caseIds)) throw new Error('the case numbers must be a list');
  for (const id of caseIds) {
    if (!Number.isInteger(id) || id < 0 || id >= RECORDED_CASES) throw new Error(`case ${id} does not exist (the cases are numbered 0 to ${RECORDED_CASES - 1})`);
  }
  return [...new Set(caseIds)];
}

/* Play the cases on both copies and compare them.

   compareRuleSets(before, after, options) -> {
     casesChosen, casesCompared, casesIdentical,        counts (casesIdentical = compared minus those that differ)
     casesDifferent                                     how many compared cases differ (counted in the first pass)
     skipped:    [{ id, theme, reason }]                cases left out because they were over a limit
     notPlayed:  [id, ...]                              chosen cases that one of the two plays returned nothing for
     differingCases: [id, ...]
     differences: [{ caseId, theme, step, tap, surface, part, before, after, changes }]
       one entry per screen that differs: the case, the step (1 = the app just opened), the tap made at that step
       (the "after" tap if the two differ), the screen name (header, main, sheet, toast, frame, export; or for the
       saved session: stored, jsonExport), what was on screen before and after (readable text) and `changes`, the
       lines that differ ("-" before, "+" after)
     savedCompared: true if what the app saves on the phone was compared as well as the screens
     trouble: [text, ...]                               anything that went wrong in the comparison itself
     problems: { before: [...], after: [...] }          what the rule-set checker says about each rule set
     complete: true only if at least one case was compared and every chosen case that was not skipped was compared
     nothingDiffers: true ONLY if complete, no trouble, and no screen (and, if compared, no saved session) differs.
                     Only this may ever be reported to a person as "no differences".
     seconds
   }
   options: caseIds (default: the fast set; every number must be a real case), includeSaved (also compare what the
   app saves on the phone; default TRUE, because a change to what is saved, such as the wording of a log entry,
   must not be missed; pass false to compare the screens only), maxMinutes / maxAdrenalineDoses (default
   CASE_LIMITS), pool (a Pool to reuse), onProgress(text). */
export async function compareRuleSets(before, after, {
  caseIds = fastCaseIds(), includeSaved = true, maxMinutes = CASE_LIMITS.maxMinutes, maxAdrenalineDoses = CASE_LIMITS.maxAdrenalineDoses,
  pool = null, onProgress = () => {},
} = {}) {
  const started = Date.now();
  caseIds = checkCaseIds(caseIds);
  const parts = includeSaved ? ['screens', 'saved'] : ['screens'];
  const A = appWithRules(before), B = appWithRules(after);
  const own = pool || new Pool();
  try {
    // Pass 1: play every chosen case on both copies in short form (a fingerprint per screen), and measure its size.
    onProgress(`playing ${caseIds.length} cases with the "before" rule set`);
    const playedA = new Map((await own.play(A.dir, caseIds)).map((enc) => [enc.id, enc]));
    onProgress(`playing ${caseIds.length} cases with the "after" rule set`);
    const playedB = new Map((await own.play(B.dir, caseIds)).map((enc) => [enc.id, enc]));

    const skipped = [], notPlayed = [], differing = [];
    for (const id of caseIds) {
      const a = playedA.get(id), b = playedB.get(id);
      if (!a || !b) { notPlayed.push(id); continue; } // a play that returned nothing is NOT a comparison
      const tooLong = [a, b].find((enc) => enc.elapsedMs > maxMinutes * 60000);
      const tooManyDoses = [a, b].find((enc) => enc.adrenalineDoses > maxAdrenalineDoses);
      if (tooLong) skipped.push({ id, theme: a.theme, reason: `ran ${Math.round(tooLong.elapsedMs / 60000)} minutes (limit ${maxMinutes})` });
      else if (tooManyDoses) skipped.push({ id, theme: a.theme, reason: `${tooManyDoses.adrenalineDoses} adrenaline doses (limit ${maxAdrenalineDoses})` });
      else if (a.a !== b.a || parts.some((part) => comparePart(a, b, part, part === 'screens' ? SCREEN_SURFACES : SAVED_SURFACES))) differing.push(id);
    }

    // Pass 2: only for the cases that differ, play them in full (a few at a time, to keep memory small) and list
    // every screen that differs.
    const trouble = [];
    const differences = [];
    for (let from = 0; from < differing.length; from += PASS_TWO_BATCH) {
      const batch = differing.slice(from, from + PASS_TWO_BATCH);
      onProgress(`listing the screens that differ: cases ${from + 1} to ${from + batch.length} of ${differing.length} that differ`);
      const fullA = new Map((await own.play(A.dir, batch, { mode: 'full' })).map((enc) => [enc.id, enc]));
      const fullB = new Map((await own.play(B.dir, batch, { mode: 'full' })).map((enc) => [enc.id, enc]));
      for (const id of batch) {
        if (!fullA.get(id) || !fullB.get(id)) { trouble.push(`case ${id} differs, but the second pass returned nothing for it, so its differences could not be listed`); continue; }
        differences.push(...stepDifferences(fullA.get(id), fullB.get(id), parts));
      }
    }
    differences.sort((x, y) => x.caseId - y.caseId || x.step - y.step);
    const differingCases = [...new Set(differences.map((d) => d.caseId))];
    // A case found different in pass 1 stays "different", even if pass 2 lists nothing for it: that is reported as a problem.
    for (const id of differing) {
      if (!differingCases.includes(id) && !trouble.some((t) => t.startsWith(`case ${id} differs, but the second pass returned nothing`)))
        trouble.push(`case ${id} was found different in the first pass, but the second pass lists no differing screen for it`);
    }
    const compared = caseIds.length - skipped.length - notPlayed.length;
    if (notPlayed.length) trouble.push(`${notPlayed.length} chosen case(s) were not compared because a play returned nothing: ${notPlayed.slice(0, 20).join(', ')}${notPlayed.length > 20 ? ', ...' : ''}`);
    const complete = compared > 0 && notPlayed.length === 0;

    return {
      casesChosen: caseIds.length, casesCompared: compared, casesDifferent: differing.length, casesIdentical: compared - differing.length,
      skipped, notPlayed, differingCases: [...new Set([...differing, ...differingCases])].sort((x, y) => x - y), differences,
      savedCompared: includeSaved, trouble, complete,
      nothingDiffers: complete && trouble.length === 0 && differing.length === 0 && differences.length === 0,
      problems: { before: checkRuleSet(before), after: checkRuleSet(after) },
      seconds: Math.round((Date.now() - started) / 1000),
    };
  } finally {
    if (!pool) own.close();
    A.cleanup(); B.cleanup();
  }
}

/* Every screen that differs between two plays of one case (each { id, theme, steps: [{ label, screens, saved }] }). */
function stepDifferences(a, b, parts) {
  const out = [];
  const surfaces = { screens: SCREEN_SURFACES, saved: SAVED_SURFACES };
  for (let i = 0; i < Math.max(a.steps.length, b.steps.length); i++) {
    const sa = a.steps[i], sb = b.steps[i];
    for (const part of parts) for (const surface of surfaces[part]) {
      const was = sa?.[part][surface] ?? '', now = sb?.[part][surface] ?? '';
      if (was === now) continue;
      out.push({
        caseId: a.id, theme: a.theme, step: i + 1, tap: sb?.label ?? sa?.label ?? '', surface, part,
        before: sa ? readableFor(part, was) : '(the case had already ended)', after: sb ? readableFor(part, now) : '(the case had already ended)',
        changes: changesOf(part, was, now),
      });
    }
  }
  return out;
}

/* The result as plain text for a person. `limit` = how many differing screens to print in full (default 30).
   "No screen differs" is printed ONLY when result.nothingDiffers is true (at least one case really compared on
   both rule sets, none left unplayed, nothing wrong, nothing different). */
export function formatReport(result, { limit = 30 } = {}) {
  const out = [];
  out.push(`Cases chosen: ${result.casesChosen}. Compared: ${result.casesCompared}` +
    (result.skipped.length ? ` (${result.skipped.length} left out because they ran over the testing limits)` : '') +
    `. Identical: ${result.casesIdentical}. Different: ${result.casesDifferent}. Took ${result.seconds} s.`);
  out.push(result.savedCompared ? 'Compared: the screens and the saved session (what the app keeps on the phone, and the export).'
    : 'The saved session (what the app keeps on the phone, and the export) was NOT compared: only the screens were (--screens-only).');
  for (const side of ['before', 'after']) if (result.problems[side].length)
    out.push(`WARNING: the "${side}" rule set fails the rule-set checker (${result.problems[side].length} problem(s)); first: ${result.problems[side][0]}`);
  for (const t of result.trouble) out.push(`PROBLEM: ${t}.`);
  if (result.casesCompared === 0) out.push('', 'NOTHING WAS COMPARED: no case was played on both rule sets' + (result.skipped.length ? ' (every chosen case was over the testing limits)' : '') + '. This says nothing about whether the rule sets differ.');
  else if (!result.complete) out.push('', 'THE COMPARISON IS INCOMPLETE: not every chosen case was compared. This says nothing about the cases that were not.');
  if (result.nothingDiffers) {
    out.push('', result.savedCompared
      ? 'No screen differs and the saved session does not differ: the two rule sets behave the same in every compared case.'
      : 'No screen differs in the compared cases. The saved session was NOT compared, so a difference in what is saved would not have been found.');
    return out.join('\n');
  }
  if (!result.differences.length) return out.join('\n'); // nothing to list; the lines above say why this is not "no differences"
  const bySurface = {};
  for (const d of result.differences) bySurface[d.surface] = (bySurface[d.surface] || 0) + 1;
  out.push(`${result.differences.length} screen(s) differ (${Object.entries(bySurface).map(([s, n]) => `${s} ${n}`).join(', ')}), in case(s) ${result.differingCases.slice(0, 30).join(', ')}${result.differingCases.length > 30 ? ', ...' : ''}.`);
  // Show the first differing screen of each case first, then the rest, so a long case does not hide the others.
  const shown = new Set(), order = [];
  for (const d of result.differences) if (!shown.has(d.caseId)) { shown.add(d.caseId); order.push(d); }
  for (const d of result.differences) if (!order.includes(d)) order.push(d);
  for (const d of order.slice(0, limit)) {
    out.push('', `Case ${d.caseId} (${d.theme}), step ${d.step}, screen "${d.surface}"${d.part === 'saved' ? ' (saved session)' : ''}, after: ${d.tap}`);
    out.push(...d.changes.map((l) => '  ' + l));
  }
  if (order.length > limit) out.push('', `... and ${order.length - limit} more differing screen(s). Print more with --limit, or use --json for the whole list.`);
  return out.join('\n');
}
