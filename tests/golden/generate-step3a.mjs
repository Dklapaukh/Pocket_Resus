// Records the step 3a safety-net golden file. It was made ONCE from v21 (commit 97db27d, 12 Nov 2026).
// Do not re-run it to make a failing test pass: a difference means what the app shows has changed.
// With --text DIR it also writes every captured screen as plain text into DIR (for finding a difference).
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAll } from '../helpers/step3a-scenarios.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { out, problems, hashes } = runAll(root);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
const i = process.argv.indexOf('--text');
if (i > 0) {
  mkdirSync(process.argv[i + 1], { recursive: true });
  writeFileSync(path.join(process.argv[i + 1], 'screens.json'), JSON.stringify(out, null, 1));
  console.log('Wrote text to', process.argv[i + 1]);
} else {
  writeFileSync(path.join(root, 'tests/golden/step3a-v21-output.json'), JSON.stringify(hashes, null, 1));
  console.log('Wrote', Object.values(out).reduce((n, s) => n + s.length, 0), 'steps from', Object.keys(out).length, 'scenarios');
}
