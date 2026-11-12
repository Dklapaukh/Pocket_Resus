// Reference recordings (stage 0): which lines of src/app and src/engine the generated cases reach.
// Run on purpose, never by `npm test`:
//   node tests/reference/coverage.mjs [--from 0] [--to 599] [--blocks]
// Uses Node's built-in V8 coverage on the bundled app and maps it back to the source files with the
// bundle's source map. "Lines" = source lines that hold code; a line counts as reached if any code
// on it ran. --blocks also lists every block of code that never ran (an untaken branch, an unused
// function), with its first line, so gaps can be judged one by one.
import inspector from 'node:inspector/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { useBundle } from './lib/driver.mjs';
import { playFull } from './lib/run.mjs';
import { rulesBundleOptions } from '../helpers/rules-for-fake-browser.mjs';

process.env.TZ = 'UTC';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const from = +arg('--from', 0), to = +arg('--to', 599), showBlocks = process.argv.includes('--blocks');

const FILE = 'coverage-bundle.js';
const built = buildSync({ entryPoints: [path.join(ROOT, 'src/app/main.js')], bundle: true, format: 'iife', write: false, sourcemap: 'external', outfile: path.join(ROOT, FILE), banner: { js: '"use strict";' }, ...rulesBundleOptions });
const code = built.outputFiles.find((f) => f.path.endsWith('.js')).text;
const map = JSON.parse(built.outputFiles.find((f) => f.path.endsWith('.map')).text);
useBundle(ROOT, code, FILE);

/* Coverage is collected in fresh worker threads, a batch of cases each (the profiler keeps every
   fake browser alive, so one long run would run out of memory). Each returns which characters of
   the bundle ran at least once; the results are combined. */
async function batchInWorker(first, last) {
  const { Worker } = await import('node:worker_threads');
  return new Promise((resolve, reject) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { first, last }, argv: process.argv.slice(2) });
    w.on('message', (m) => resolve(m)); w.on('error', reject);
  });
}
const { isMainThread, parentPort, workerData } = await import('node:worker_threads');
if (!isMainThread) {
  const session = new inspector.Session();
  session.connect();
  await session.post('Profiler.enable');
  await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
  for (let id = workerData.first; id <= workerData.last; id++) await playFull(ROOT, id);
  const { result } = await session.post('Profiler.takePreciseCoverage');
  const ran = new Uint8Array(code.length);
  for (const entry of result.filter((s) => s.url === FILE)) {
    /* the innermost range around a character decides its count (V8's rule) */
    const here = new Int32Array(code.length).fill(-1);
    for (const fn of entry.functions) {
      const ranges = [...fn.ranges].sort((x, y) => x.startOffset - y.startOffset || y.endOffset - x.endOffset);
      for (const r of ranges) here.fill(r.count, r.startOffset, r.endOffset);
    }
    for (let i = 0; i < code.length; i++) if (here[i] > 0) ran[i] = 1;
  }
  parentPort.postMessage(ran);
  process.exit(0);
}
const counts = new Uint8Array(code.length);
const batches = [];
for (let a = from; a <= to; a += 40) batches.push([a, Math.min(to, a + 39)]);
let next = 0;
async function lane() { while (next < batches.length) { const [a, b] = batches[next++]; const ran = await batchInWorker(a, b); for (let i = 0; i < ran.length; i++) counts[i] |= ran[i]; } }
await Promise.all([lane(), lane()]);

/* Decode the source map (base64 VLQ) into [generated offset, source index, source line]. */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function vlq(str) {
  const out = []; let shift = 0, value = 0;
  for (const ch of str) {
    let d = B64.indexOf(ch); const more = d & 32; d &= 31;
    value += d << shift;
    if (more) shift += 5; else { out.push(value & 1 ? -(value >> 1) : value >> 1); value = 0; shift = 0; }
  }
  return out;
}
const lineStarts = [0];
for (let i = 0; i < code.length; i++) if (code[i] === '\n') lineStarts.push(i + 1);
const segs = []; let src = 0, sLine = 0, sCol = 0;
map.mappings.split(';').forEach((line, gLine) => {
  let gCol = 0;
  for (const part of line.split(',')) {
    if (!part) continue;
    const v = vlq(part); gCol += v[0];
    if (v.length >= 4) { src += v[1]; sLine += v[2]; sCol += v[3]; segs.push([lineStarts[gLine] + gCol, src, sLine]); }
  }
});

const want = (s) => /src\/(app|engine)\//.test(s);
const files = new Map();
segs.forEach(([off, s, line], k) => {
  const name = map.sources[s];
  if (!want(name)) return;
  const end = k + 1 < segs.length ? segs[k + 1][0] : code.length;
  let hit = false;
  for (let i = off; i < Math.min(end, off + 200); i++) if (!/\s/.test(code[i])) { hit = counts[i] > 0; break; }
  if (!files.has(name)) files.set(name, new Map());
  const lines = files.get(name);
  lines.set(line, (lines.get(line) || false) || hit);
});

let total = 0, reached = 0;
console.log(`Cases ${from}-${to}. Source lines with code reached by the generated cases:\n`);
for (const [name, lines] of [...files].sort()) {
  const n = lines.size, hit = [...lines.values()].filter(Boolean).length;
  total += n; reached += hit;
  const text = readFileSync(path.join(ROOT, name.replace(/^(\.\.\/)+/, '')), 'utf8').split('\n');
  const missed = [...lines].filter(([, h]) => !h).map(([l]) => l).sort((a, b) => a - b);
  console.log(`${name.replace(/^(\.\.\/)+/, '').padEnd(28)} ${String(hit).padStart(4)}/${String(n).padEnd(4)} ${(100 * hit / n).toFixed(1)}%`);
  if (showBlocks) {
    // group consecutive missed lines into blocks
    const blocks = [];
    for (const l of missed) { const b = blocks.at(-1); if (b && l - b[1] <= 1) b[1] = l; else blocks.push([l, l]); }
    for (const [a, b] of blocks) console.log(`    line ${a + 1}${b > a ? '-' + (b + 1) : ''}: ${text[a].trim().slice(0, 110)}`);
  }
}
console.log(`\nAll: ${reached}/${total} lines (${(100 * reached / total).toFixed(1)}%)`);
