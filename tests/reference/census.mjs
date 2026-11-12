// Reference recordings (stage 0): for each clinical behaviour on the stage 0 list, in how many of the
// generated cases it actually appears. Run on purpose, never by `npm test`:
//   node tests/reference/census.mjs [--from 0] [--to 599]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { playMany } from './lib/run.mjs';
import { CENSUS_NAMES } from './lib/census.mjs';

process.env.TZ = 'UTC';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const from = +arg('--from', 0), to = +arg('--to', 599);
const ids = Array.from({ length: to - from + 1 }, (_, i) => from + i);
const t0 = Date.now();
const done = await playMany(ROOT, ids, { mode: 'census' });
const count = Object.fromEntries([...CENSUS_NAMES, 'no weight all case'].map((n) => [n, 0]));
let steps = 0;
for (const c of done) { steps += c.steps; for (const n of c.census) count[n]++; }
console.log(`Cases ${from}-${to}: ${done.length} cases, ${steps} steps, ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
for (const [n, k] of Object.entries(count)) console.log(`${String(k).padStart(5)}  ${n}`);
const never = Object.entries(count).filter(([n, k]) => !k && !n.startsWith('app error')).map(([n]) => n);
console.log('\nNever seen: ' + (never.length ? never.join('; ') : 'none'));
