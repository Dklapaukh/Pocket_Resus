// Makes the DOM golden file FROM THE ORIGINAL APP (the files in the repo root).
// Only re-run this on purpose, when the owner has approved a change to what the screens show.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runScenarios, toHashes } from '../helpers/dom-run.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { out, problems } = runScenarios({ appDir: root });
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
writeFileSync(path.join(root, 'tests/golden/dom-original.json'), JSON.stringify(toHashes(out), null, 1));
console.log('Wrote', Object.values(out).reduce((n, s) => n + s.length, 0), 'steps from', Object.keys(out).length, 'scenarios');
