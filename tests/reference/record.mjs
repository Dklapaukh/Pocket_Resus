// Reference recordings (stage 0): MAKE the recordings. Run on purpose only, never by `npm test`.
//
//   node tests/reference/record.mjs --commit <reference commit>
// (--cases and --fast exist for experiments only; the defaults in lib/cases.mjs make the committed files)
//
// The app is taken from the named commit (git archive into a temporary folder), not from the working
// copy, so the files always describe that commit. Same commit + same generator = identical files.
// RULE (same as golden files): never re-record to make a test pass. Re-record only for an
// owner-approved A-table change, from the commit that contains it (see README.md here).
import { writeFileSync, readFileSync } from 'node:fs';
import { playMany } from './lib/run.mjs';
import { writeRecording } from './lib/format.mjs';
import { GENERATOR_VERSION, SEED_BASE, THEMES, RECORDED_CASES, FAST_CASES } from './lib/cases.mjs';
import { SCREEN_SURFACES, SAVED_SURFACES } from './lib/driver.mjs';
import { appAtCommit, ROOT, SCREENS_FILE, SAVED_FILE } from './lib/reference-app.mjs';

process.env.TZ = 'UTC';
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const ref = arg('--commit', null);
if (!ref) { console.error('Say which commit is the reference: --commit <hash>'); process.exit(2); }
const total = +arg('--cases', RECORDED_CASES), fast = +arg('--fast', FAST_CASES); // defaults = the committed files
const { commit, dir, cleanup } = appAtCommit(ref);
console.log(`Recording ${total} cases from commit ${commit} (app copied to ${dir})`);

const t0 = Date.now();
let n = 0;
const done = await playMany(dir, Array.from({ length: total }, (_, i) => i), {
  onResult: () => { if (++n % 200 === 0) console.log(`  ${n}/${total} cases, ${((Date.now() - t0) / 1000).toFixed(0)} s`); return false; },
});
cleanup(); // the temporary copy of the reference app is removed again
done.sort((a, b) => a.id - b.id);
const steps = done.reduce((s, c) => s + c.n, 0);
const jsdom = JSON.parse(readFileSync(new URL('../../node_modules/jsdom/package.json', import.meta.url), 'utf8')).version;
const header = (what, surfaces) => ({
  what,
  rule: 'Never edit or re-record to make a test pass. Re-record only for an owner-approved A-table change (tests/reference/README.md).',
  madeFromCommit: commit,
  generatorVersion: GENERATOR_VERSION,
  seedBase: SEED_BASE,
  themes: THEMES,
  cases: total,
  fastCases: fast,
  steps,
  surfaces,
  node: process.version,
  jsdom,
});
writeFileSync(SCREENS_FILE, writeRecording(header('What the person sees after every step: header, main screen, pop-up, toast, page frame (tabs, text size, app errors), exported text.', SCREEN_SURFACES), done, 'screens'));
writeFileSync(SAVED_FILE, writeRecording(header('What the app saved on the phone after every step, and any complete JSON record downloaded. Kept apart from the screens on purpose.', SAVED_SURFACES), done, 'saved'));
console.log(`Done: ${total} cases, ${steps} steps, ${((Date.now() - t0) / 1000).toFixed(0)} s. Wrote ${SCREENS_FILE.replace(ROOT + '/', '')} and ${SAVED_FILE.replace(ROOT + '/', '')}`);
