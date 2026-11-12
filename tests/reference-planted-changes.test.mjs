// Stage 0 proof (doc 19): the new safety net CATCHES behaviour changes of the kinds later stages could
// make by accident. For each planted change below: copy the app to a temporary folder, make that ONE
// small edit, and require that the recorded cases find a difference. Then the next change, on a fresh copy.
// To keep `npm test` quick, each change names a HINT: a fast-set case known to catch it. That case is
// replayed first; only if it no longer catches the change are all fast-set cases replayed (and the output
// says so, with the new case to use as the hint). Set PLANTED_FULL_SCAN=1 to ignore every hint.
// The test also fails if a planted change's search text is no longer in the source exactly once, so
// this proof cannot silently stop testing anything when the code moves (update the search text to
// the new code, keeping the same kind of change, if that happens).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadRecordings, replay, versionNote } from './reference/lib/compare.mjs';
import { ROOT } from './reference/lib/reference-app.mjs';
import { Pool } from './reference/lib/run.mjs';

const RULES = 'src/rules/nz-eas.js', VIEWS = 'src/app/views.js', SESSION = 'src/app/session.js', EVENTS = 'src/app/events.js', FORMAT = 'src/app/format.js';
const CORE = 'src/engine/core.js', CARDS = 'src/engine/drug-cards.js', CARE = 'src/engine/rhythm-care.js', LOG = 'src/engine/log-view.js', SHEETS = 'src/app/sheets.js';

/* kind: what sort of change; change: the edit in plain English; file, find (exactly once), replace;
   hint: a fast-set case that catches it (filled in from a full scan; see above). */
const PLANTED = [
  { kind: 'dose number', change: 'adult adrenaline 1 mg becomes 0.5 mg', file: RULES, find: 'adrenalineMg: 1,', replace: 'adrenalineMg: 0.5,', hint: 0 },
  { kind: 'dose number', change: 'adult second amiodarone 150 mg becomes 100 mg', file: RULES, find: 'amiodaroneSecondMg: 150,', replace: 'amiodaroneSecondMg: 100,', hint: 2 },
  { kind: 'shock energy', change: '20 kg band shock 80 J becomes 90 J', file: RULES, find: 'shockJ: 80 }', replace: 'shockJ: 90 }', hint: 0 },
  { kind: 'prompt threshold', change: 'paediatric pads prompt up to 100 J becomes up to 80 J', file: RULES, find: 'paediatricPadsUpToJ: 100,', replace: 'paediatricPadsUpToJ: 80,', hint: 0 },
  { kind: 'drug interval', change: 'adrenaline review every 4 min becomes every 3 min', file: RULES, find: 'adrenalineIntervalMs: 240000', replace: 'adrenalineIntervalMs: 180000', hint: 1 },
  { kind: 'dose due at a count', change: 'second amiodarone due after 5 shocks instead of 6', file: RULES, find: 'dueAtShocks: [3, 6]', replace: 'dueAtShocks: [3, 5]', hint: 0 },
  { kind: 'dose limit', change: 'magnesium allowed 3 doses instead of 2', file: RULES, find: 'maxDoses: 2,', replace: 'maxDoses: 3,', hint: 11 },
  { kind: 'torsades rule', change: 'torsades no longer swaps amiodarone for magnesium', file: CARDS, find: "return hasTorsades(session) ? 'magnesium' : 'amiodarone';", replace: "return 'amiodarone';", hint: 3 },
  { kind: 'lower-card rule', change: 'A8 reverted: a ROSC rhythm decides the lower card again', file: CARDS, find: "return lastRecorded?.type === 'rosc' ? 'Not recorded' : session.rhythm;", replace: 'return session.rhythm;', hint: 9 },
  { kind: 'lower-card rule', change: 'A7 reverted: "Other" no longer brings the fluids card', file: RULES, find: "fluidRhythms: ['PEA', 'Asystole', 'Other'],", replace: "fluidRhythms: ['PEA', 'Asystole'],", hint: 14 },
  { kind: 'pop-up trigger', change: 'A8 reverted: ROSC "Other" opens the fluid pop-up again', file: SESSION, find: "outcome !== 'rosc' && R.RULES", replace: 'R.RULES', hint: 9 },
  { kind: 'pop-up trigger', change: 'the "Confirm Torsades" pop-up is skipped after a shock', file: SESSION, find: "if (rhythm === 'Torsades' && outcome === 'shock') {", replace: "if (rhythm === 'Torsades' && outcome === 'rosc') {", hint: 3 },
  { kind: 'pop-up trigger', change: '"Repeat magnesium?" only asked before a third dose', file: SESSION, find: 'if (stats.count && !confirmed) {', replace: 'if (stats.count > 1 && !confirmed) {', hint: 7 },
  { kind: 'pop-up trigger', change: 'the rhythm pop-up is not cleared after the rhythm is saved (reopens on reload)', file: CARE, find: '  delete session.pendingRhythm;', replace: '', hint: 1 },
  { kind: 'child second dose', change: 'child "Select dose" button still offered after the 6th shock', file: VIEWS, find: 'selectDose = needsClinicalAdvice && secondDoseEarly &&', replace: 'selectDose = needsClinicalAdvice &&', hint: 30 },
  { kind: 'child second dose', change: '"Seek clinical advice" reworded', file: RULES, find: "childSecondAmiodarone: 'Seek clinical advice',", replace: "childSecondAmiodarone: 'Seek senior advice',", hint: 2 },
  { kind: 'double-tap lock', change: 'adrenaline lock 3 min 30 s becomes 3 min', file: RULES, find: 'adrenaline: 210000,', replace: 'adrenaline: 180000,', hint: 7 },
  { kind: 'double-tap lock', change: 'magnesium 5 s double-tap lock removed', file: RULES, find: 'magnesium: 5000,', replace: 'magnesium: 0,', hint: 7 },
  { kind: 'status line wording', change: '"No dose recorded" becomes "No dose given"', file: VIEWS, find: "if (remaining === null) return 'No dose recorded';", replace: "if (remaining === null) return 'No dose given';", hint: 1 },
  { kind: 'pop-up wording', change: 'adult amiodarone Administration dose line reworded', file: RULES, find: "amiodaroneAdultPopupDose: '{first} mg IV first; {second} mg IV second',", replace: "amiodaroneAdultPopupDose: '{first} mg IV first, then {second} mg IV',", hint: 2 },
  { kind: 'button label', change: 'magnesium button "Record … mmol IV" becomes "Give … mmol IV"', file: VIEWS, find: "else label = 'Record ' + ref.dose + ' mmol IV';", replace: "else label = 'Give ' + ref.dose + ' mmol IV';", hint: 3 },
  { kind: 'header wording', change: 'special situation flag reworded', file: VIEWS, find: '<span class="special-flag">Special situation · manual review</span>', replace: '<span class="special-flag">Special situation · review</span>', hint: 15 },
  { kind: 'timer threshold', change: '"30 seconds remaining" shown from 31 s', file: VIEWS, find: "if (running && t.left <= 30000) return '30 seconds remaining';", replace: "if (running && t.left <= 31000) return '30 seconds remaining';", hint: 7 },
  { kind: 'timer threshold', change: 'yellow "prepare" panel from 10 s instead of 15 s', file: VIEWS, find: "classList.toggle('prepare', running && t.left > 0 && t.left <= 15000);", replace: "classList.toggle('prepare', running && t.left > 0 && t.left <= 10000);", hint: 7 },
  { kind: 'attention highlight', change: 'adrenaline card highlighted from 60 s before review instead of 30 s', file: VIEWS, find: 't.adr !== null && t.adr <= 30000', replace: 't.adr !== null && t.adr <= 60000', hint: 7 },
  { kind: 'reminder condition', change: 'arrest-checklist reminder needs 60 s left instead of 90 s', file: RULES, find: 'checklistPromptMinLeftMs: 90000,', replace: 'checklistPromptMinLeftMs: 60000,', hint: 7 },
  { kind: 'special situation', change: 'special situation no longer disables the magnesium / fluids card', file: VIEWS, find: "const enabled = !st.s.special && !['ROSC', 'Ended'].includes(st.s.phase);", replace: "const enabled = !['ROSC', 'Ended'].includes(st.s.phase);", hint: 74 },
  { kind: 'special situation', change: 'amiodarone becomes due in special situation mode', file: CARDS, find: '    !session.special &&\n', replace: '', hint: 20 },
  { kind: 'after-ROSC card state', change: 'adrenaline / amiodarone buttons stay usable-looking after ROSC', file: VIEWS, find: "      !['ROSC', 'Ended'].includes(st.s.phase),", replace: "      !['Ended'].includes(st.s.phase),", hint: 9 },
  { kind: 're-arrest', change: 're-arrest no longer restarts the resus clock (end time kept)', file: CORE, find: '  session.end = null;', replace: '', hint: 15 },
  { kind: 're-count after void', change: 'voided shocks and no-shock checks still counted', file: CORE, find: '  const checks = active(session)', replace: '  const checks = session.events', hint: 35 },
  { kind: 'manual-entry name matching', change: 'typed medicine names matched only with exact capitals', file: EVENTS, find: '  switch (name.toLowerCase()) {', replace: '  switch (name) {', hint: 6 },
  { kind: 'weight band edge', change: 'a weight exactly on a band edge (5, 10, 20 … kg) goes to the next band', file: CORE, find: 'return RULES.numbers.childBands.find((band) => kg <= band.maxKg);', replace: 'return RULES.numbers.childBands.find((band) => kg < band.maxKg);', hint: 1 },
  { kind: 'weight band edge', change: 'exactly 40 kg treated as adult', file: CORE, find: 'weightNumber(session.weight) <= RULES.numbers.weight.adultAboveKg;', replace: 'weightNumber(session.weight) < RULES.numbers.weight.adultAboveKg;', hint: 1 },
  { kind: 'fluid volume', change: 'child fluids from the band weight instead of the actual weight', file: CARE, find: '    const kg = +session.weight;', replace: '    const kg = R.childBand(+session.weight).maxKg;', hint: 4 },
  { kind: 'fluid total', change: 'fluid total adds doses in any unit, not only mL', file: CARE, find: "event.unit === 'mL' && Number.isFinite(+event.dose)", replace: 'Number.isFinite(+event.dose)', hint: 82 },
  { kind: 'form default', change: 'no adult energy pre-filled when no weight is entered', file: LOG, find: "return String(session.weight).trim() === '' ? RULES.numbers.adult.shockJ : R.joules(session.weight);", replace: "return String(session.weight).trim() === '' ? '' : R.joules(session.weight);", hint: 2 },
  { kind: 'choice list', change: '"When did resus start?" 20 min choice becomes 30 min', file: SHEETS, find: 'const earlierChoices = [5, 10, 15, 20]', replace: 'const earlierChoices = [5, 10, 15, 30]', hint: 6 },
  { kind: 'correction form', change: 'shock correction form loses the "Unknown" rhythm', file: SHEETS, find: "if (event.type === 'shock') rhythms = ['Unknown', 'VF', 'VT', 'Torsades'];", replace: "if (event.type === 'shock') rhythms = ['VF', 'VT', 'Torsades'];", hint: 13 },
  { kind: 'log filter', change: '"Interventions only" no longer lists recorded actions (notes)', file: LOG, find: "'adrenaline', 'amiodarone', 'magnesium', 'fluids', 'medicine', 'equipment', 'note',", replace: "'adrenaline', 'amiodarone', 'magnesium', 'fluids', 'medicine', 'equipment',", hint: 6 },
  { kind: 'weight from age', change: 'age 6 gives 21 kg instead of 20 kg', file: CORE, find: 'if (years <= rules.oneToTenYears.maxAge) return (years + rules.oneToTenYears.addYears) * rules.oneToTenYears.multiplyBy;', replace: 'if (years === 6) return 21;\n  if (years <= rules.oneToTenYears.maxAge) return (years + rules.oneToTenYears.addYears) * rules.oneToTenYears.multiplyBy;', hint: 0 },
  { kind: 'weight from age', change: 'age 13 gives 40 kg instead of 39 kg', file: CORE, find: 'return years * rules.elevenToFourteenYears.multiplyBy;', replace: 'return years === 13 ? 40 : years * rules.elevenToFourteenYears.multiplyBy;', hint: 0 },
  { kind: 'tube size', change: 'tube size at age 8 is 6 mm instead of 5.5 mm', file: CORE, find: "size: wording('tubeSizeFormula', { mm: roundTo(age / t.sizeAgeDivisor + t.sizeAddMm, t.displayDecimals) }),", replace: "size: wording('tubeSizeFormula', { mm: age === 8 ? 6 : roundTo(age / t.sizeAgeDivisor + t.sizeAddMm, t.displayDecimals) }),", hint: 0 },
  { kind: 'tube size', change: 'length at lips at age 3 is 14 cm instead of 13.5 cm', file: CORE, find: "length: wording('tubeLengthFormula', { cm: roundTo(age / t.lengthAgeDivisor + t.lengthAddCm, t.displayDecimals) }),", replace: "length: wording('tubeLengthFormula', { cm: age === 3 ? 14 : roundTo(age / t.lengthAgeDivisor + t.lengthAddCm, t.displayDecimals) }),", hint: 0 },
  { kind: 'table row', change: '30 kg band magnesium 6 mmol becomes 7 mmol', file: RULES, find: 'magnesiumMmol: 6,', replace: 'magnesiumMmol: 7,', hint: 3 },
  { kind: 'table row', change: 'iGel size 2.5 range 25–35 kg becomes 25–36 kg', file: RULES, find: "{ size: '2.5', minKg: 25, maxKg: 35 },", replace: "{ size: '2.5', minKg: 25, maxKg: 36 },", hint: 0 },
  { kind: 'clock display', change: 'times just after midnight shown as 24:05 instead of 00:05', file: FORMAT, find: '    hour12: false,', replace: "    hourCycle: 'h24',", hint: 6 },
  { kind: 'double-tap lock', change: 'fluids 5 s double-tap lock becomes 4 s', file: RULES, find: 'fluids: 5000,', replace: 'fluids: 4000,', hint: 7 },
  { kind: 'timer threshold', change: 'overdue "+" time shown from exactly 1 s late instead of after 1 s', file: VIEWS, find: 't.late > 1000', replace: 't.late >= 1000', hint: 7 },
  { kind: 'clock display', change: 'one-hour clock style only after 60:00 instead of from 60:00', file: VIEWS, find: 't.app >= 3600000', replace: 't.app > 3600000', hint: 7 },
  { kind: 'escaping', change: 'typed text no longer escaped (< > & " \' shown as page code)', file: FORMAT, find: `/[&<>"']/g,`, replace: '/(?!)/g,', hint: 8 },
];

/* The change a later stage makes on purpose: one extra field in the saved session. It must show in the
   saved-session recording ONLY, never in the screen recording (so it can be re-recorded on its own). */
const SAVED_ONLY = { kind: 'saved session field', change: 'one extra field written to the saved session', file: SESSION, find: 'localStorage.setItem(KEY, JSON.stringify(st.s));', replace: 'localStorage.setItem(KEY, JSON.stringify({ ...st.s, extraFieldForTest: true }));' };

const rec = loadRecordings();
const FAST = Array.from({ length: rec.header.fastCases }, (_, i) => i);
const count = (text, part) => text.split(part).length - 1;
// Two lanes of one worker thread each: two planted changes are checked at the same time.
const lanes = [new Pool(1), new Pool(1)];
after(() => lanes.forEach((p) => p.close()));
// Cases for the two control checks: the midnight sweep and five themed cases.
const CONTROL = [6, 7, 8, 9, 10, 11];

function plantedCopy(m) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pocket-resus-planted-'));
  cpSync(path.join(ROOT, 'index.html'), path.join(dir, 'index.html'));
  cpSync(path.join(ROOT, 'src'), path.join(dir, 'src'), { recursive: true });
  if (m) {
    const file = path.join(dir, m.file), text = readFileSync(file, 'utf8');
    writeFileSync(file, text.replace(m.find, m.replace));
  }
  return dir;
}

test('planted changes: at least 10 different kinds, and every search text is still in the source exactly once', () => {
  assert.ok(new Set(PLANTED.map((m) => m.kind)).size >= 10);
  const stale = [...PLANTED, SAVED_ONLY].filter((m) => count(readFileSync(path.join(ROOT, m.file), 'utf8'), m.find) !== 1)
    .map((m) => `${m.kind} (${m.change}): "${m.find}" is not found exactly once in ${m.file}`);
  assert.deepEqual(stale, [], 'update these planted changes to the current code (same kind of change)');
});

/* First the UNCHANGED copy replays the control cases and every hint case; then each change's hint case
   is replayed on its changed copy, two changes at a time. A change only counts as caught on a case
   where the unchanged copy matches exactly (otherwise a change that does nothing could "pass"). */
const fullScan = !!process.env.PLANTED_FULL_SCAN;
const usable = (m) => !fullScan && Number.isInteger(m.hint) && FAST.includes(m.hint);
const baseIds = [...new Set([...CONTROL, ...PLANTED.filter(usable).map((m) => m.hint)])].sort((a, b) => a - b);
const hinted = new Map();
let base = null;
const baseMatches = new Set();
before(async () => {
  const dir = plantedCopy(null);
  try { base = await replay(dir, baseIds, rec); } finally { rmSync(dir, { recursive: true, force: true }); }
  const differing = new Set(base.found.map((d) => d.id));
  for (const id of baseIds) if (!differing.has(id)) baseMatches.add(id);
  const queue = PLANTED.filter((m) => usable(m) && baseMatches.has(m.hint));
  await Promise.all(lanes.map(async (pool) => {
    while (queue.length) {
      const m = queue.shift(), dir = plantedCopy(m);
      try { hinted.set(m, await replay(dir, [m.hint], rec, { pool })); } finally { rmSync(dir, { recursive: true, force: true }); }
    }
  }));
});

test('planted changes: an UNCHANGED copy of the app matches the recordings on every control and hint case', () => {
  assert.equal(base.played, baseIds.length);
  assert.deepEqual(base.found, [], versionNote(rec.header) + 'an unchanged copy must match exactly, or the planted-change proof means nothing');
});

/* For a catch found by a full scan: the unchanged copy must match on that case too. */
async function baseMatchesOn(id) {
  if (baseMatches.has(id)) return true;
  const dir = plantedCopy(null);
  try { const r = await replay(dir, [id], rec); if (!r.found.length) baseMatches.add(id); return !r.found.length; } finally { rmSync(dir, { recursive: true, force: true }); }
}

for (const m of PLANTED) {
  test(`planted change caught: ${m.kind}: ${m.change}`, async (t) => {
    let run = hinted.get(m), how = run?.found.length ? `hint case ${m.hint}` : '';
    if (usable(m)) assert.ok(baseMatches.has(m.hint), `the unchanged app already differs on hint case ${m.hint}, so this proof is void (see the unchanged-copy test)`);
    if (!how) {
      if (run) t.diagnostic(`HINT NO LONGER CATCHES IT: case ${m.hint} shows no difference; replaying the whole fast set`);
      else if (!fullScan) t.diagnostic('no usable hint (a fast-set case number) for this change; replaying the whole fast set');
      const dir = plantedCopy(m);
      try { run = await replay(dir, FAST, rec, { failFast: true }); } finally { rmSync(dir, { recursive: true, force: true }); }
      assert.ok(run.found.length > 0, versionNote(rec.header) + `NOT CAUGHT after replaying all ${FAST.length} fast-set cases: the safety net misses this kind of change`);
      assert.ok(await baseMatchesOn(run.found[0].id), `case ${run.found[0].id} differs even without the change, so this catch proves nothing`);
      how = `full scan (use hint: ${run.found[0].id})`;
    }
    const d = run.found[0];
    t.diagnostic(`caught by case ${d.id} (${d.theme}), step ${d.step}, ${d.part}: ${d.surfaces.join(', ') || d.text} [${how}]`);
  });
}

test(`planted change caught in the saved session only: ${SAVED_ONLY.change}`, async (t) => {
  const dir = plantedCopy(SAVED_ONLY);
  try {
    const run = await replay(dir, CONTROL, rec);
    assert.ok(run.found.some((d) => d.part === 'saved'), 'the saved-session recording must catch it');
    assert.deepEqual(run.found.filter((d) => d.part !== 'saved'), [], 'the screen recording must not change');
    t.diagnostic(`saved-session differences in ${run.found.length} of ${CONTROL.length} cases; screens identical in all ${CONTROL.length}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
