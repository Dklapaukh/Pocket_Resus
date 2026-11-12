// Stage 0 proof (doc 19): the new safety net CATCHES behaviour changes of the kinds later stages could
// make by accident. For each planted change below: copy the app to a temporary folder, make that ONE
// small edit, replay the recorded fast-set cases in order until the first difference, and require
// that a difference is found. Then the next change, on a fresh copy.
// The test also fails if a planted change's search text is no longer in the source exactly once, so
// this proof cannot silently stop testing anything when the code moves (update the search text to
// the new code, keeping the same kind of change, if that happens).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadRecordings, replay } from './reference/lib/compare.mjs';
import { ROOT } from './reference/lib/reference-app.mjs';
import { Pool } from './reference/lib/run.mjs';

const RULES = 'src/rules/nz-eas.js', VIEWS = 'src/app/views.js', SESSION = 'src/app/session.js', EVENTS = 'src/app/events.js';
const CORE = 'src/engine/core.js', CARDS = 'src/engine/drug-cards.js', CARE = 'src/engine/rhythm-care.js', LOG = 'src/engine/log-view.js', SHEETS = 'src/app/sheets.js';

/* kind: what sort of change; change: the edit in plain English; file, find (exactly once), replace. */
const PLANTED = [
  { kind: 'dose number', change: 'adult adrenaline 1 mg becomes 0.5 mg', file: RULES, find: 'adrenalineMg: 1,', replace: 'adrenalineMg: 0.5,' },
  { kind: 'dose number', change: 'adult second amiodarone 150 mg becomes 100 mg', file: RULES, find: 'amiodaroneSecondMg: 150,', replace: 'amiodaroneSecondMg: 100,' },
  { kind: 'shock energy', change: '20 kg band shock 80 J becomes 90 J', file: RULES, find: 'shockJ: 80 }', replace: 'shockJ: 90 }' },
  { kind: 'prompt threshold', change: 'paediatric pads prompt up to 100 J becomes up to 80 J', file: RULES, find: 'paediatricPadsUpToJ: 100,', replace: 'paediatricPadsUpToJ: 80,' },
  { kind: 'drug interval', change: 'adrenaline review every 4 min becomes every 3 min', file: RULES, find: 'adrenalineIntervalMs: 240000', replace: 'adrenalineIntervalMs: 180000' },
  { kind: 'dose due at a count', change: 'second amiodarone due after 5 shocks instead of 6', file: RULES, find: 'dueAtShocks: [3, 6]', replace: 'dueAtShocks: [3, 5]' },
  { kind: 'dose limit', change: 'magnesium allowed 3 doses instead of 2', file: RULES, find: 'maxDoses: 2,', replace: 'maxDoses: 3,' },
  { kind: 'torsades rule', change: 'torsades no longer swaps amiodarone for magnesium', file: CARDS, find: "return hasTorsades(session) ? 'magnesium' : 'amiodarone';", replace: "return 'amiodarone';" },
  { kind: 'lower-card rule', change: 'A8 reverted: a ROSC rhythm decides the lower card again', file: CARDS, find: "return lastRecorded?.type === 'rosc' ? 'Not recorded' : session.rhythm;", replace: 'return session.rhythm;' },
  { kind: 'lower-card rule', change: 'A7 reverted: "Other" no longer brings the fluids card', file: RULES, find: "fluidRhythms: ['PEA', 'Asystole', 'Other'],", replace: "fluidRhythms: ['PEA', 'Asystole']," },
  { kind: 'pop-up trigger', change: 'A8 reverted: ROSC "Other" opens the fluid pop-up again', file: SESSION, find: "outcome !== 'rosc' && R.RULES", replace: 'R.RULES' },
  { kind: 'pop-up trigger', change: 'the "Confirm Torsades" pop-up is skipped after a shock', file: SESSION, find: "if (rhythm === 'Torsades' && outcome === 'shock') {", replace: "if (rhythm === 'Torsades' && outcome === 'rosc') {" },
  { kind: 'pop-up trigger', change: '"Repeat magnesium?" only asked before a third dose', file: SESSION, find: 'if (stats.count && !confirmed) {', replace: 'if (stats.count > 1 && !confirmed) {' },
  { kind: 'pop-up trigger', change: 'the rhythm pop-up is not cleared after the rhythm is saved (reopens on reload)', file: CARE, find: '  delete session.pendingRhythm;', replace: '' },
  { kind: 'child second dose', change: 'child "Select dose" button still offered after the 6th shock', file: VIEWS, find: 'selectDose = needsClinicalAdvice && secondDoseEarly &&', replace: 'selectDose = needsClinicalAdvice &&' },
  { kind: 'child second dose', change: '"Seek clinical advice" reworded', file: RULES, find: "childSecondAmiodarone: 'Seek clinical advice',", replace: "childSecondAmiodarone: 'Seek senior advice'," },
  { kind: 'double-tap lock', change: 'adrenaline lock 3 min 30 s becomes 3 min', file: RULES, find: 'adrenaline: 210000,', replace: 'adrenaline: 180000,' },
  { kind: 'double-tap lock', change: 'magnesium 5 s double-tap lock removed', file: RULES, find: 'magnesium: 5000,', replace: 'magnesium: 0,' },
  { kind: 'status line wording', change: '"No dose recorded" becomes "No dose given"', file: VIEWS, find: "if (remaining === null) return 'No dose recorded';", replace: "if (remaining === null) return 'No dose given';" },
  { kind: 'pop-up wording', change: 'adult amiodarone Administration dose line reworded', file: RULES, find: "amiodaroneAdultPopupDose: '{first} mg IV first; {second} mg IV second',", replace: "amiodaroneAdultPopupDose: '{first} mg IV first, then {second} mg IV'," },
  { kind: 'button label', change: 'magnesium button "Record … mmol IV" becomes "Give … mmol IV"', file: VIEWS, find: "else label = 'Record ' + ref.dose + ' mmol IV';", replace: "else label = 'Give ' + ref.dose + ' mmol IV';" },
  { kind: 'header wording', change: 'special situation flag reworded', file: VIEWS, find: '<span class="special-flag">Special situation · manual review</span>', replace: '<span class="special-flag">Special situation · review</span>' },
  { kind: 'timer threshold', change: '"30 seconds remaining" shown from 31 s', file: VIEWS, find: "if (running && t.left <= 30000) return '30 seconds remaining';", replace: "if (running && t.left <= 31000) return '30 seconds remaining';" },
  { kind: 'timer threshold', change: 'yellow "prepare" panel from 10 s instead of 15 s', file: VIEWS, find: "classList.toggle('prepare', running && t.left > 0 && t.left <= 15000);", replace: "classList.toggle('prepare', running && t.left > 0 && t.left <= 10000);" },
  { kind: 'attention highlight', change: 'adrenaline card highlighted from 60 s before review instead of 30 s', file: VIEWS, find: 't.adr !== null && t.adr <= 30000', replace: 't.adr !== null && t.adr <= 60000' },
  { kind: 'reminder condition', change: 'arrest-checklist reminder needs 60 s left instead of 90 s', file: RULES, find: 'checklistPromptMinLeftMs: 90000,', replace: 'checklistPromptMinLeftMs: 60000,' },
  { kind: 'special situation', change: 'special situation no longer disables the magnesium / fluids card', file: VIEWS, find: "const enabled = !st.s.special && !['ROSC', 'Ended'].includes(st.s.phase);", replace: "const enabled = !['ROSC', 'Ended'].includes(st.s.phase);" },
  { kind: 'special situation', change: 'amiodarone becomes due in special situation mode', file: CARDS, find: '    !session.special &&\n', replace: '' },
  { kind: 'after-ROSC card state', change: 'adrenaline / amiodarone buttons stay usable-looking after ROSC', file: VIEWS, find: "      !['ROSC', 'Ended'].includes(st.s.phase),", replace: "      !['Ended'].includes(st.s.phase)," },
  { kind: 're-arrest', change: 're-arrest no longer restarts the resus clock (end time kept)', file: CORE, find: '  session.end = null;', replace: '' },
  { kind: 're-count after void', change: 'voided shocks and no-shock checks still counted', file: CORE, find: '  const checks = active(session)', replace: '  const checks = session.events' },
  { kind: 'manual-entry name matching', change: 'typed medicine names matched only with exact capitals', file: EVENTS, find: '  switch (name.toLowerCase()) {', replace: '  switch (name) {' },
  { kind: 'weight band edge', change: 'a weight exactly on a band edge (5, 10, 20 … kg) goes to the next band', file: CORE, find: 'return RULES.numbers.childBands.find((band) => kg <= band.maxKg);', replace: 'return RULES.numbers.childBands.find((band) => kg < band.maxKg);' },
  { kind: 'weight band edge', change: 'exactly 40 kg treated as adult', file: CORE, find: 'weightNumber(session.weight) <= RULES.numbers.weight.adultAboveKg;', replace: 'weightNumber(session.weight) < RULES.numbers.weight.adultAboveKg;' },
  { kind: 'fluid volume', change: 'child fluids from the band weight instead of the actual weight', file: CARE, find: '    const kg = +session.weight;', replace: '    const kg = R.childBand(+session.weight).maxKg;' },
  { kind: 'fluid total', change: 'fluid total adds doses in any unit, not only mL', file: CARE, find: "event.unit === 'mL' && Number.isFinite(+event.dose)", replace: 'Number.isFinite(+event.dose)' },
  { kind: 'form default', change: 'no adult energy pre-filled when no weight is entered', file: LOG, find: "return String(session.weight).trim() === '' ? RULES.numbers.adult.shockJ : R.joules(session.weight);", replace: "return String(session.weight).trim() === '' ? '' : R.joules(session.weight);" },
  { kind: 'choice list', change: '"When did resus start?" 20 min choice becomes 30 min', file: SHEETS, find: 'const earlierChoices = [5, 10, 15, 20]', replace: 'const earlierChoices = [5, 10, 15, 30]' },
  { kind: 'correction form', change: 'shock correction form loses the "Unknown" rhythm', file: SHEETS, find: "if (event.type === 'shock') rhythms = ['Unknown', 'VF', 'VT', 'Torsades'];", replace: "if (event.type === 'shock') rhythms = ['VF', 'VT', 'Torsades'];" },
  { kind: 'log filter', change: '"Interventions only" no longer lists recorded actions (notes)', file: LOG, find: "'adrenaline', 'amiodarone', 'magnesium', 'fluids', 'medicine', 'equipment', 'note',", replace: "'adrenaline', 'amiodarone', 'magnesium', 'fluids', 'medicine', 'equipment'," },
];

/* The change a later stage makes on purpose: one extra field in the saved session. It must show in the
   saved-session recording ONLY, never in the screen recording (so it can be re-recorded on its own). */
const SAVED_ONLY = { kind: 'saved session field', change: 'one extra field written to the saved session', file: SESSION, find: 'localStorage.setItem(KEY, JSON.stringify(st.s));', replace: 'localStorage.setItem(KEY, JSON.stringify({ ...st.s, extraFieldForTest: true }));' };

const rec = loadRecordings();
const FAST = Array.from({ length: rec.header.fastCases }, (_, i) => i);
const count = (text, part) => text.split(part).length - 1;
const pool = new Pool(); // one set of worker threads for every planted change
after(() => pool.close());

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

test('planted changes: an UNCHANGED copy of the app matches the recordings (the copying itself changes nothing)', async () => {
  const dir = plantedCopy(null);
  try {
    const run = await replay(dir, FAST.slice(0, 24), rec, { pool });
    assert.deepEqual(run.found, []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

for (const m of PLANTED) {
  test(`planted change caught: ${m.kind}: ${m.change}`, async (t) => {
    const dir = plantedCopy(m);
    try {
      const run = await replay(dir, FAST, rec, { failFast: true, pool });
      assert.ok(run.found.length > 0, `NOT CAUGHT after replaying all ${FAST.length} fast-set cases: the safety net misses this kind of change`);
      const d = run.found[0];
      t.diagnostic(`caught by case ${d.id} (${d.theme}), step ${d.step}, ${d.part}: ${d.surfaces.join(', ') || d.text} (${run.played} case(s) played, ${(run.ms / 1000).toFixed(1)} s)`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}

test(`planted change caught in the saved session only: ${SAVED_ONLY.change}`, async (t) => {
  const dir = plantedCopy(SAVED_ONLY);
  try {
    const run = await replay(dir, FAST.slice(0, 24), rec, { pool });
    assert.ok(run.found.some((d) => d.part === 'saved'), 'the saved-session recording must catch it');
    assert.deepEqual(run.found.filter((d) => d.part !== 'saved'), [], 'the screen recording must not change');
    t.diagnostic(`saved-session differences in ${run.found.length} of 24 cases; screens identical in all 24`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
