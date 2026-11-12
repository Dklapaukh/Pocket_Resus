// Reference recordings (stage 0): show the readable BEFORE (reference) and AFTER (working copy) for
// one case. Run on purpose:
//   node tests/reference/show.mjs <case> [--step <n>] [--part screens|saved] [--ref <commit> | --ref-dir <folder>] [--full]
// It plays the case on the reference app (by default the commit the recordings were made from, taken
// with git archive; nothing in the working copy changes) and on the working copy, lists the taps up to
// the first difference (or --step), and prints a line-by-line difference for each surface that differs.
// --full prints every surface in full at that step, even those that match.
import { readFileSync } from 'node:fs';
import { playFull } from './lib/run.mjs';
import { readRecording } from './lib/format.mjs';
import { caseInfo } from './lib/cases.mjs';
import { appAtCommit, ROOT, SCREENS_FILE } from './lib/reference-app.mjs';

process.env.TZ = 'UTC';
const argv = process.argv.slice(2);
const arg = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const id = Number(argv[0]);
if (!Number.isInteger(id)) { console.error('Usage: node tests/reference/show.mjs <case number> [--step n] [--part screens|saved] [--ref commit | --ref-dir folder] [--full]'); process.exit(2); }
const part = arg('--part', 'screens'), full = argv.includes('--full');
let refDir = arg('--ref-dir', null), refName = refDir;
if (!refDir) {
  const commit = arg('--ref', readRecording(readFileSync(SCREENS_FILE, 'utf8'), 'screens').header.madeFromCommit);
  ({ dir: refDir } = appAtCommit(commit)); refName = 'commit ' + commit.slice(0, 12);
}

const before = await playFull(refDir, id), after = await playFull(ROOT, id);
const bodyOf = (s) => (s ? s[part] : {});
let step = arg('--step', null) ? Number(arg('--step')) : null;
if (step === null) {
  for (let i = 0; i < Math.max(before.steps.length, after.steps.length); i++) {
    const a = bodyOf(before.steps[i]), b = bodyOf(after.steps[i]);
    if (JSON.stringify(a) !== JSON.stringify(b)) { step = i + 1; break; }
  }
}
const info = caseInfo(id);
console.log(`Case ${id} (${info.theme}, seed ${info.seed}): ${before.steps.length} steps on the reference (${refName}), ${after.steps.length} on the working copy.`);
if (step === null) { console.log(`No difference in ${part}.`); process.exit(0); }
console.log(`\nTaps (reference | working copy if different), up to step ${step}:`);
for (let i = Math.max(0, step - 8); i < step; i++) {
  const a = before.steps[i]?.label ?? '(no step)', b = after.steps[i]?.label ?? '(no step)';
  console.log(`  ${String(i + 1).padStart(4)}  ${a}${a !== b ? '\n        | ' + b : ''}`);
}

/* Readable lines: HTML split at tags; JSON pretty-printed. */
const lines = (text) => {
  if (!text) return [];
  if (/^[[{]/.test(text)) { try { return JSON.stringify(JSON.parse(text), null, 1).split('\n'); } catch {} }
  return text.replace(/></g, '>\n<').replace(/\|/g, '\n|').split('\n');
};
/* Line difference (longest common subsequence). */
function diff(a, b) {
  const n = a.length, m = b.length;
  if (n * m > 4e6) return ['(too long to compare line by line; use --full)'];
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0, same = 0;
  const flushSame = () => { if (same) out.push(`    … ${same} matching line(s)`); same = 0; };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { same++; i++; j++; }
    else if (i < n && (j === m || L[i + 1][j] >= L[i][j + 1])) { flushSame(); out.push('  - ' + a[i++]); }
    else { flushSame(); out.push('  + ' + b[j++]); }
  }
  flushSame();
  return out;
}

const a = bodyOf(before.steps[step - 1]), b = bodyOf(after.steps[step - 1]);
console.log(`\nAt step ${step} ("-" = reference, "+" = working copy):`);
for (const surface of Object.keys({ ...a, ...b })) {
  if (a[surface] === b[surface] && !full) continue;
  console.log(`\n=== ${surface} ${a[surface] === b[surface] ? '(same)' : '(DIFFERENT)'}`);
  if (a[surface] === b[surface]) console.log(lines(a[surface]).map((l) => '    ' + l).join('\n'));
  else console.log(diff(lines(a[surface]), lines(b[surface])).join('\n'));
}
