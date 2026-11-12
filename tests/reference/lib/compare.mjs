// Reference recordings (stage 0): replay recorded cases on an app folder and compare with the recording.
import { readFileSync } from 'node:fs';
import { playMany, playFull } from './run.mjs';
import { comparePart, readRecording } from './format.mjs';
import { GENERATOR_VERSION } from './cases.mjs';
import { SCREEN_SURFACES, SAVED_SURFACES } from './driver.mjs';
import { SCREENS_FILE, SAVED_FILE } from './reference-app.mjs';

export function loadRecordings() {
  const screens = readRecording(readFileSync(SCREENS_FILE, 'utf8'), 'screens');
  const saved = readRecording(readFileSync(SAVED_FILE, 'utf8'), 'saved');
  return { screens, saved, header: screens.header };
}

/* Problems with the recording files themselves (wrong generator, files out of step). */
export function recordingProblems({ screens, saved }) {
  const p = [];
  if (screens.header.generatorVersion !== GENERATOR_VERSION)
    p.push(`the recordings were made with generator version ${screens.header.generatorVersion} but the generator is now version ${GENERATOR_VERSION}: re-record from the reference commit (README)`);
  for (const k of ['madeFromCommit', 'generatorVersion', 'seedBase', 'cases'])
    if (screens.header[k] !== saved.header[k]) p.push(`screens.json and saved-sessions.json disagree on ${k}`);
  if (screens.cases.size !== screens.header.cases) p.push('screens.json does not hold the number of cases its header states');
  return p;
}

/* Compare one played case with both recordings. Returns a list of differences (empty = identical). */
export function differences(enc, rec, parts = ['screens', 'saved']) {
  const want = rec.screens.cases.get(enc.id), out = [];
  if (!want) return [{ id: enc.id, part: 'screens', text: 'no recording for this case' }];
  for (const part of parts) {
    const recorded = part === 'screens' ? want : rec.saved.cases.get(enc.id);
    const d = comparePart(recorded, enc, part, part === 'screens' ? SCREEN_SURFACES : SAVED_SURFACES);
    if (d) out.push({ id: enc.id, theme: enc.theme, part, step: d.step, surfaces: d.surfaces, text: d.note });
  }
  if (!out.length && (want.n !== enc.n || want.a !== enc.a))
    out.push({ id: enc.id, theme: enc.theme, part: 'actions', step: null, surfaces: [], text: 'same screens, but the taps made were not the same (the case generator changed?)' });
  return out;
}

/* Replay `ids` on appDir; collect every difference (or stop at the first one when failFast). */
export async function replay(appDir, ids, rec, { failFast = false, parts, pool = null } = {}) {
  const found = [];
  const t0 = Date.now();
  const done = await playMany(appDir, ids, {
    pool,
    onResult: (enc) => { const d = differences(enc, rec, parts); found.push(...d); return failFast && d.length > 0; },
  });
  return { found: found.sort((a, b) => a.id - b.id), played: done.length, ms: Date.now() - t0 };
}

/* A readable explanation of the first few differences, including the tap that led to each step. */
export async function explain(appDir, found, max = 3) {
  const lines = [];
  for (const d of found.slice(0, max)) {
    lines.push(`case ${d.id} (${d.theme}) ${d.part}: ${d.step ? `first difference at step ${d.step}` : ''}${d.surfaces.length ? ' in ' + d.surfaces.join(', ') : ''}${d.text ? ' - ' + d.text : ''}`);
    if (d.step) {
      const { steps } = await playFull(appDir, d.id);
      for (let i = Math.max(0, d.step - 3); i < Math.min(steps.length, d.step); i++) lines.push(`    step ${i + 1}: ${steps[i].label}`);
      const s = steps[d.step - 1];
      if (s) for (const surf of d.surfaces) {
        const text = (s.screens[surf] ?? s.saved[surf] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        lines.push(`    ${surf} now reads: ${text.slice(0, 300)}${text.length > 300 ? ' …' : ''}`);
      }
    }
    lines.push(`    see before/after:  node tests/reference/show.mjs ${d.id}${d.step ? ' --step ' + d.step : ''}${d.part === 'saved' ? ' --part saved' : ''}`);
  }
  if (found.length > max) lines.push(`… and ${found.length - max} more differing case(s): ${[...new Set(found.slice(max).map((d) => d.id))].slice(0, 40).join(', ')}`);
  return lines.join('\n');
}
