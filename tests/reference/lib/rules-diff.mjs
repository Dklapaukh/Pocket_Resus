// WHAT-CHANGED LIBRARY (rules editor, stage E1): play the generated cases through the real app under TWO
// rule sets and list every screen that differs.
//
// It reuses the stage 0 safety-net machinery (the case generator, the tapping "person", the fake browser,
// the worker threads and the readable line differences in this folder) and plays the app code of the working
// copy twice: once with each rule set. Nothing in the working copy is touched; the two copies of the app
// live in temporary folders that are removed again afterwards.
//
// The main function is compareRuleSets(before, after, options). It takes two rule-set objects (the five
// parts, as in src/rules/nz-eas.json) and returns a plain object (see its comment), so the editor can use it
// later. The command-line wrapper is tools/rules-diff.mjs, which only prints the result.
//
// LIMITS FOR TEST CASES (the owner's testing limits, not app rules): a case counts only if it stays within
// 90 minutes of case time and 10 adrenaline doses, under BOTH rule sets. The generated cases are played,
// measured, and any case over a limit is left out of the comparison and listed as skipped.
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Pool } from './run.mjs';
import { comparePart } from './format.mjs';
import { SCREEN_SURFACES, SAVED_SURFACES } from './driver.mjs';
import { FAST_CASES, RECORDED_CASES } from './cases.mjs';
import { ROOT } from './reference-app.mjs';
import { lines, diff } from './textdiff.mjs';
import { checkRuleSet } from '../../../src/rules/check.js';

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
  writeFileSync(path.join(dir, 'src/rules/nz-eas.json'), JSON.stringify(rules, null, 2));
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

/* The differences between one step's screen before and after, as diff lines ("-" before, "+" after) of what a
   person reads. If the readable text is the same and only the look changed (a style or a hidden attribute),
   the raw difference is shown instead and the first line says so. */
function changesOf(before, after) {
  const a = readable(before).split('\n'), b = readable(after).split('\n');
  if (a.join('\n') !== b.join('\n')) return diff(a, b, 1);
  return ['(the words are the same; only the look or a hidden detail changed)', ...diff(lines(before), lines(after), 0)];
}

/* "5,9-20" -> [5, 9, 10, ..., 20] (for the command line). */
export function parseCaseList(text) {
  const ids = [];
  for (const piece of String(text).split(',').map((p) => p.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(piece);
    if (!m) throw new Error(`"${piece}" is not a case number or range such as 5 or 9-20`);
    for (let id = +m[1]; id <= +(m[2] ?? m[1]); id++) ids.push(id);
  }
  return ids;
}

/* Play the cases on both copies and compare them.

   compareRuleSets(before, after, options) -> {
     casesChosen, casesCompared, casesIdentical,        counts
     skipped:    [{ id, theme, reason }]                cases left out because they were over a limit
     differingCases: [id, ...]
     differences: [{ caseId, theme, step, tap, surface, part, before, after, changes }]
       one entry per screen that differs: the case, the step (1 = the app just opened), the tap made at that step
       (the "after" tap if the two differ), the screen name (header, main, sheet, toast, frame, export; or for the
       saved session: stored, jsonExport), what was on screen before and after (readable text) and `changes`, the
       lines that differ ("-" before, "+" after)
     problems: { before: [...], after: [...] }          what the rule-set checker says about each rule set
     seconds
   }
   options: caseIds (default: the fast set), includeSaved (also compare what the app saved; default false),
   maxMinutes / maxAdrenalineDoses (default CASE_LIMITS), pool (a Pool to reuse), onProgress(text). */
export async function compareRuleSets(before, after, {
  caseIds = fastCaseIds(), includeSaved = false, maxMinutes = CASE_LIMITS.maxMinutes, maxAdrenalineDoses = CASE_LIMITS.maxAdrenalineDoses,
  pool = null, onProgress = () => {},
} = {}) {
  const started = Date.now();
  const parts = includeSaved ? ['screens', 'saved'] : ['screens'];
  const A = appWithRules(before), B = appWithRules(after);
  const own = pool || new Pool();
  try {
    // Pass 1: play every chosen case on both copies in short form (a fingerprint per screen), and measure its size.
    onProgress(`playing ${caseIds.length} cases with the "before" rule set`);
    const playedA = new Map((await own.play(A.dir, caseIds)).map((enc) => [enc.id, enc]));
    onProgress(`playing ${caseIds.length} cases with the "after" rule set`);
    const playedB = new Map((await own.play(B.dir, caseIds)).map((enc) => [enc.id, enc]));

    const skipped = [], differing = [];
    for (const id of caseIds) {
      const a = playedA.get(id), b = playedB.get(id);
      const tooLong = [a, b].find((enc) => enc.elapsedMs > maxMinutes * 60000);
      const tooManyDoses = [a, b].find((enc) => enc.adrenalineDoses > maxAdrenalineDoses);
      if (tooLong) skipped.push({ id, theme: a.theme, reason: `ran ${Math.round(tooLong.elapsedMs / 60000)} minutes (limit ${maxMinutes})` });
      else if (tooManyDoses) skipped.push({ id, theme: a.theme, reason: `${tooManyDoses.adrenalineDoses} adrenaline doses (limit ${maxAdrenalineDoses})` });
      else if (a.a !== b.a || parts.some((part) => comparePart(a, b, part, part === 'screens' ? SCREEN_SURFACES : SAVED_SURFACES))) differing.push(id);
    }

    // Pass 2: only for the cases that differ, play them in full (a few at a time, to keep memory small) and list
    // every screen that differs.
    const differences = [];
    for (let from = 0; from < differing.length; from += PASS_TWO_BATCH) {
      const batch = differing.slice(from, from + PASS_TWO_BATCH);
      onProgress(`listing the screens that differ: cases ${from + 1} to ${from + batch.length} of ${differing.length} that differ`);
      const fullA = new Map((await own.play(A.dir, batch, { mode: 'full' })).map((enc) => [enc.id, enc]));
      const fullB = new Map((await own.play(B.dir, batch, { mode: 'full' })).map((enc) => [enc.id, enc]));
      for (const id of batch) differences.push(...stepDifferences(fullA.get(id), fullB.get(id), parts));
    }
    differences.sort((x, y) => x.caseId - y.caseId || x.step - y.step);
    const differingCases = [...new Set(differences.map((d) => d.caseId))];
    const compared = caseIds.length - skipped.length;

    return {
      casesChosen: caseIds.length, casesCompared: compared, casesIdentical: compared - differingCases.length,
      skipped, differingCases, differences,
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
        before: sa ? readable(was) : '(the case had already ended)', after: sb ? readable(now) : '(the case had already ended)',
        changes: changesOf(was, now),
      });
    }
  }
  return out;
}

/* The result as plain text for a person. `limit` = how many differing screens to print in full (default 30). */
export function formatReport(result, { limit = 30 } = {}) {
  const out = [];
  out.push(`Cases chosen: ${result.casesChosen}. Compared: ${result.casesCompared}` +
    (result.skipped.length ? ` (${result.skipped.length} left out because they ran over the testing limits)` : '') +
    `. Identical: ${result.casesIdentical}. Different: ${result.differingCases.length}. Took ${result.seconds} s.`);
  for (const side of ['before', 'after']) if (result.problems[side].length)
    out.push(`WARNING: the "${side}" rule set fails the rule-set checker (${result.problems[side].length} problem(s)); first: ${result.problems[side][0]}`);
  if (!result.differences.length) {
    out.push('', 'No screen differs: the two rule sets behave the same in every compared case.');
    return out.join('\n');
  }
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
