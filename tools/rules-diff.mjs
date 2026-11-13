// WHAT CHANGED: plays the generated test cases through the real app under two rule sets and lists every
// screen that differs (which case, which step, what was on screen before and after).
//
// Usage:
//   node tools/rules-diff.mjs <before> <after> [options]
// <before> and <after> are each a rules file (for example src/rules/nz-eas.yaml or a saved copy), or
// git:<commit> for the rules file as it was at that commit (for example git:HEAD or git:main; commits from
// before the YAML change held the rules as nz-eas.json, and that is read too).
// Example: what did my edits change?   node tools/rules-diff.mjs git:HEAD src/rules/nz-eas.yaml
//
// Options:
//   --all            play every generated case (about ten minutes per rule set) instead of the fast set
//                    (the default: 249 cases, about a minute per rule set)
//   --cases 5,9-20   play only these case numbers (a number that does not exist is an error)
//   --screens-only   compare only what is on screen. By DEFAULT the saved session (what the app keeps on the
//                    phone, and the export) is compared too, so a change that only alters a log entry is found.
//                    With this option the report says plainly that the saved session was NOT compared.
//   --limit N        print the first N differing screens in full (default 30)
//   --json           print the whole result as JSON instead of text
// Exit code: 0 = the comparison was complete (differences, if any, are listed; 0 does NOT mean "no
// differences": read the report). 3 = the comparison was empty or incomplete (nothing compared, or not every
// chosen case that was not left out for the testing limits was compared, or the comparison itself had trouble).
// 1 = it could not run (bad rules file, unknown case number). 2 = wrong usage.
// Testing limits (not app rules): only cases within 90 minutes of case time and 10 adrenaline doses are
// compared; longer or heavier cases are left out and counted as skipped.
// Nothing in the working copy is changed. The library behind this is tests/reference/lib/rules-diff.mjs.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { ROOT } from '../tests/reference/lib/reference-app.mjs';
import { readYamlStrict } from '../src/rules/parse.js';
import { allCaseIds, compareRuleSets, fastCaseIds, formatReport, parseCaseList } from '../tests/reference/lib/rules-diff.mjs';

process.env.TZ = 'UTC';
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
const options = ['--cases', '--limit'];
const known = ['--all', '--cases', '--screens-only', '--saved', '--limit', '--json']; // --saved is now the default, so it changes nothing
const unknownFlags = argv.filter((a) => a.startsWith('--') && !known.includes(a));
const positional = argv.filter((a, i) => !a.startsWith('--') && !options.includes(argv[i - 1]));

/* The text of a file as it was at a commit, or null if the commit has no such file. */
function gitShow(commit, file) {
  try {
    return execFileSync('git', ['show', `${commit}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

/* A rule set from a file path, or from git:<commit> (the YAML file, or the older JSON file if the commit
   is from before the change to YAML). A file whose text starts with { is the older JSON layout. */
function readRules(spec) {
  const text = spec.startsWith('git:')
    ? gitShow(spec.slice(4), 'src/rules/nz-eas.yaml') ?? gitShow(spec.slice(4), 'src/rules/nz-eas.json')
    : readFileSync(spec, 'utf8');
  if (text === null) throw new Error(`there is no rules file (src/rules/nz-eas.yaml or nz-eas.json) at ${spec}`);
  return text.trimStart().startsWith('{') ? JSON.parse(text) : readYamlStrict(text);
}

if (positional.length !== 2 || unknownFlags.length) {
  if (unknownFlags.length) console.error('Unknown option: ' + unknownFlags.join(' '));
  console.error('Usage: node tools/rules-diff.mjs <before> <after> [--all] [--cases 5,9-20] [--screens-only] [--limit N] [--json]\n' +
    '  <before> and <after>: a rules file, or git:<commit> (for example git:HEAD)');
  process.exit(2);
}

try {
  // --cases must be followed by real case numbers; an empty or missing list is an error, never "the fast set".
  const caseIds = flag('--cases') ? parseCaseList(value('--cases', '')) : flag('--all') ? allCaseIds() : fastCaseIds();
  const result = await compareRuleSets(readRules(positional[0]), readRules(positional[1]), {
    caseIds, includeSaved: !flag('--screens-only'), onProgress: (text) => console.error(text + '...'),
  });
  console.log(flag('--json') ? JSON.stringify(result, null, 2) : formatReport(result, { limit: Number(value('--limit', 30)) }));
  // An empty or incomplete comparison must never look like a pass.
  if (!result.complete || result.trouble.length) process.exitCode = 3;
} catch (err) {
  console.error('Could not compare the rule sets: ' + err.message);
  process.exit(1);
}
