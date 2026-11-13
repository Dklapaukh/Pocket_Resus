// WHAT CHANGED: plays the generated test cases through the real app under two rule sets and lists every
// screen that differs (which case, which step, what was on screen before and after).
//
// Usage:
//   node tools/rules-diff.mjs <before> <after> [options]
// <before> and <after> are each a rules file (for example src/rules/nz-eas.json or a saved copy), or
// git:<commit> for the rules file as it was at that commit (for example git:HEAD or git:main).
// Example: what did my edits change?   node tools/rules-diff.mjs git:HEAD src/rules/nz-eas.json
//
// Options:
//   --all            play every generated case (about ten minutes per rule set) instead of the fast set
//                    (the default: 249 cases, about a minute per rule set)
//   --cases 5,9-20   play only these case numbers
//   --saved          also compare what the app saves on the phone, not only what is on screen
//   --limit N        print the first N differing screens in full (default 30)
//   --json           print the whole result as JSON instead of text
// Testing limits (not app rules): only cases within 90 minutes of case time and 10 adrenaline doses are
// compared; longer or heavier cases are left out and counted as skipped.
// Nothing in the working copy is changed. The library behind this is tests/reference/lib/rules-diff.mjs.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { ROOT } from '../tests/reference/lib/reference-app.mjs';
import { allCaseIds, compareRuleSets, fastCaseIds, formatReport, parseCaseList } from '../tests/reference/lib/rules-diff.mjs';

process.env.TZ = 'UTC';
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
const options = ['--cases', '--limit'];
const positional = argv.filter((a, i) => !a.startsWith('--') && !options.includes(argv[i - 1]));

/* A rule set from a file path, or from git:<commit>. */
function readRules(spec) {
  const text = spec.startsWith('git:')
    ? execFileSync('git', ['show', `${spec.slice(4)}:src/rules/nz-eas.json`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })
    : readFileSync(spec, 'utf8');
  return JSON.parse(text);
}

if (positional.length !== 2) {
  console.error('Usage: node tools/rules-diff.mjs <before> <after> [--all] [--cases 5,9-20] [--saved] [--limit N] [--json]\n' +
    '  <before> and <after>: a rules file, or git:<commit> (for example git:HEAD)');
  process.exit(2);
}

try {
  const caseIds = value('--cases') ? parseCaseList(value('--cases')) : flag('--all') ? allCaseIds() : fastCaseIds();
  const result = await compareRuleSets(readRules(positional[0]), readRules(positional[1]), {
    caseIds, includeSaved: flag('--saved'), onProgress: (text) => console.error(text + '...'),
  });
  console.log(flag('--json') ? JSON.stringify(result, null, 2) : formatReport(result, { limit: Number(value('--limit', 30)) }));
} catch (err) {
  console.error('Could not compare the rule sets: ' + err.message);
  process.exit(1);
}
