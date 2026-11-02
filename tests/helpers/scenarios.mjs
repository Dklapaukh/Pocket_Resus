// Scripted scenarios run against any engine object `R`. Output is plain data so it can be
// saved as a golden file (made from the ORIGINAL code) and compared byte-for-byte.
import { resetDeterminism, LISTS } from './engines.mjs';

const T0 = 1700000000000, MIN = 60000;
export const WEIGHTS = ['', ' ', '0', '0.1', '1', '4.9', '5', '5.0', '5.1', '10', '10.1', '15', '20', '20.1', '25', '30', '30.1', '40', '40.0', '40.1', '41', '42', '50', '70', '100', '500', '500.1', '-5', 'abc', '4,5', '12.34', '12.3', '.5', '5.', '1e2', ' 7 ', '7,5'];

// Everything derived from a session that the app shows or uses.
export function derive(R, s, now) {
  return {
    counts: R.counts(s), care: R.careMode(s), tdp: R.hasTorsades(s), timing: R.timing(s, now),
    canCheck: R.canRhythmCheck(s, now), prompt: R.checklistPrompt(s, now),
    dose: R.dose(s), mag: R.magnesiumReference(s), fluid: R.fluidReference(s),
    energyDefault: R.shockEnergy(s), paed: R.isPaediatric(s),
    adrStats: R.supportStats(s, 'adrenaline'), fluidStats: R.supportStats(s, 'fluids'), magStats: R.supportStats(s, 'magnesium'),
    logAll: R.logEntries(s, LISTS, { scope: 'all', includeVoided: true }),
    logAllActive: R.logEntries(s, LISTS, { scope: 'all', includeVoided: false }),
    logTimes: R.logEntries(s, LISTS, { scope: 'all', checklists: 'times', includeVoided: false }),
    logInterv: R.logEntries(s, LISTS, { scope: 'interventions', includeVoided: false }),
    logIntervAll: R.logEntries(s, LISTS, { scope: 'interventions', includeVoided: true }),
  };
}
const snap = (R, s, now) => ({ state: s, derived: derive(R, s, now) });

export function runAll(R) {
  resetDeterminism();
  const out = {};
  out.boundaries = WEIGHTS.map(w => ({ w, valid: R.validWeight(w), joules: R.joules(w), padsPaed: R.needsPaediatricPads(w),
    isPaed: R.isPaediatric({ weight: w }), dose: R.dose({ weight: w }), mag: R.magnesiumReference({ weight: w }),
    fluid: R.fluidReference({ weight: w }), shockEnergyDefault: R.shockEnergy({ weight: w }) }));
  out.estimate = [0, 0.5, 1, 2, 3, 10, 11, 12, 13, 14, 14.5, 15, -1, '', ' ', null, undefined, 'abc', '7'].map(a => ({ a: String(a), est: R.estimate(a) }));
  out.constants = { CYCLE: R.CYCLE, ADR: R.ADR };

  // 1. Adult VF x4, amiodarone x2, adrenaline, then rhythm change to PEA
  { let s = R.fresh(T0); s.weight = '70'; R.begin(s, T0); R.add(s, 'start', 'CPR cycle started', 'Cycle 1', T0);
    const steps = {}; let now = T0;
    steps.early = [R.canRhythmCheck(s, T0 + 2 * MIN - 1000), R.canRhythmCheck(s, T0 + 2 * MIN)];
    steps.earlyStart = R.startOutcome(s, 'shock', T0 + MIN);
    for (let i = 0; i < 4; i++) { now += 2 * MIN; const id = R.startOutcome(s, 'shock', now); R.completeOutcome(s, id, 'VF', '200'); if (i === 1) R.add(s, 'adrenaline', 'Adrenaline', '1 mg IV', now + 5000, { dose: 1, unit: 'mg' }); }
    R.add(s, 'amiodarone', 'Amiodarone', '300 mg', now + 6000, { dose: 300, unit: 'mg' });
    R.add(s, 'amiodarone', 'Amiodarone', '150 mg', now + 7000, { dose: 150, unit: 'mg' });
    steps.afterVF = snap(R, JSON.parse(JSON.stringify(s)), now + 10000);
    steps.promptAt = [30, 60, 90, 110, 119].map(sec => R.checklistPrompt(s, now + sec * 1000));
    now += 2 * MIN; const id = R.startOutcome(s, 'noshock', now); R.completeOutcome(s, id, 'PEA');
    steps.afterPEA = snap(R, JSON.parse(JSON.stringify(s)), now + 1000);
    out.adultVF = steps; }

  // 2. Paediatric 15 kg
  { let s = R.fresh(T0); s.weight = '15'; R.begin(s, T0); let now = T0 + 2 * MIN;
    const id = R.startOutcome(s, 'shock', now); R.completeOutcome(s, id, 'VT', '60');
    R.add(s, 'fluids', 'Fluids', '300 mL', now + 1000, { dose: 300, unit: 'mL' }); R.add(s, 'fluids', 'Fluids', '150 mL', now + 2000, { dose: 150, unit: 'mL' });
    R.add(s, 'magnesium', 'Magnesium', '', now + 3000, { dose: 4, unit: 'mmol' });
    out.paed15 = snap(R, s, now + 4000); }

  // 3. Torsades then PEA (care mode must remember torsades history yet follow PEA)
  { let s = R.fresh(T0); s.weight = '30'; R.begin(s, T0); let now = T0;
    now += 2 * MIN; let id = R.startOutcome(s, 'shock', now); R.completeOutcome(s, id, 'Torsades', '120');
    const a = snap(R, JSON.parse(JSON.stringify(s)), now + 1000);
    now += 2 * MIN; id = R.startOutcome(s, 'noshock', now); R.completeOutcome(s, id, 'PEA');
    const b = snap(R, JSON.parse(JSON.stringify(s)), now + 1000);
    now += 2 * MIN; id = R.startOutcome(s, 'shock', now); R.completeOutcome(s, id, 'VF', '');
    out.torsades = { a, b, c: snap(R, s, now + 1000) }; }

  // 4. One-step check(): every outcome, valid and invalid inputs, ROSC lock
  { let s = R.fresh(T0); s.weight = '70'; R.begin(s, T0); const r = [];
    const tries = [['shock', 'VF', '200'], ['shock', 'PEA', ''], ['noshock', 'PEA', ''], ['noshock', 'VF', ''], ['shock', 'VT', '0'], ['shock', 'VT', '1000'], ['shock', 'VT', '1001'], ['shock', 'VT', 'abc'], ['shock', 'VT', ''], ['shock', 'Torsades', '-5'], ['noshock', 'Asystole', ''], ['bogus', 'VF', ''], ['rosc', 'Sinus rhythm', ''], ['rosc', 'AF', ''], ['shock', 'VF', '200']];
    let now = T0; for (const [o, rh, en] of tries) { now += 30000; r.push({ o, rh, en, ok: R.check(s, o, rh, en, now), phase: s.phase, rhythm: s.rhythm, undo: s.undo.length }); }
    out.check = { r, final: snap(R, s, now + 1000) }; }

  // 5. Two-step outcome guards
  { let s = R.fresh(T0); s.weight = '70'; R.begin(s, T0); const r = {};
    r.early = R.startOutcome(s, 'shock', T0 + 1000); r.badKind = R.startOutcome(s, 'rosc', T0 + 2 * MIN);
    const id = R.startOutcome(s, 'shock', T0 + 2 * MIN);
    r.badRhythm = R.completeOutcome(s, id, 'PEA'); r.badEnergy = R.completeOutcome(s, id, 'VF', '5000'); r.badId = R.completeOutcome(s, 'nope', 'VF');
    r.pending = s.pendingRhythm; r.ok = R.completeOutcome(s, id, 'VF', '150'); r.again = R.completeOutcome(s, id, 'VF', '150');
    out.outcomeGuards = { r, final: snap(R, s, T0 + 2 * MIN + 1000) }; }

  // 6. Missing weight, weight change mid-session, previous (pre-app) shock, prior counts
  { let s = R.fresh(T0); R.begin(s, T0); const a = snap(R, JSON.parse(JSON.stringify(s)), T0 + 1000);
    s.weight = '42'; R.add(s, 'weight', 'Patient weight updated', '42 kg · Entered', T0 + 18000);
    const b = snap(R, JSON.parse(JSON.stringify(s)), T0 + 19000);
    R.addPreAppShock(s, T0 + 20000); R.addPreAppShock(s, T0 + 21000); s.priorShocks = 1; s.priorNoShock = 2; s.priorStreak = 1; s.priorAmio = 1;
    out.weightAndPrior = { a, b, c: snap(R, s, T0 + 22000) }; }

  // 7. Edit and void
  { let s = R.fresh(T0); s.weight = '70'; R.begin(s, T0); let now = T0;
    for (let i = 0; i < 3; i++) { now += 2 * MIN; const id = R.startOutcome(s, 'shock', now); R.completeOutcome(s, id, 'VF', '200'); }
    R.add(s, 'adrenaline', 'Adrenaline', '1 mg IV', now + 1000, { dose: 1, unit: 'mg' });
    s.events[2].voided = true; const voided = snap(R, JSON.parse(JSON.stringify(s)), now + 2000);
    s.events[1].at += 5 * MIN; const edited = snap(R, JSON.parse(JSON.stringify(s)), now + 2000);
    out.editVoid = { voided, edited }; }

  // 8. Undo: depth cap of 30 and empty undo
  { let s = R.fresh(T0); s.weight = '70'; R.begin(s, T0); let now = T0; const marks = [];
    for (let i = 0; i < 35; i++) { now += 2 * MIN; const id = R.startOutcome(s, 'noshock', now); R.completeOutcome(s, id, 'PEA'); }
    marks.push({ depth: s.undo.length, events: s.events.length });
    for (let i = 0; i < 3; i++) { s = R.undo(s); marks.push({ depth: s.undo.length, events: s.events.length, rhythm: s.rhythm, pending: !!s.pendingRhythm }); }
    const e = R.fresh(T0); const same = R.undo(e) === e;
    out.undo = { marks, emptyReturnsSame: same, final: snap(R, s, now) }; }

  // 9. Checklist rows: started / finished / reopened, and bad keys
  { let s = R.fresh(T0); R.begin(s, T0); const L = LISTS[0]; let t = T0;
    const chk = (i, checked, key) => R.add(s, 'checklist', L.label, (checked ? 'Checked: ' : 'Unchecked: ') + L.items[i], t += 1000, { key: key ?? L.id + ':' + i, checked });
    for (let i = 0; i < L.items.length; i++) chk(i, true);
    chk(3, false); chk(3, true); chk(0, false, 'arrest:99'); chk(0, true, 'arrest:x'); chk(0, true, 'other:0');
    R.add(s, 'rosc', 'ROSC', 'Sinus rhythm', t += 1000, { rhythm: 'Sinus rhythm' });
    s.events.push({ id: 'cause1', type: 'cause', status: 'treated', title: 'Hypoxia', details: '', at: t += 1000 }, { id: 'cause2', type: 'cause', status: 'reviewed', title: 'Hypovolaemia', details: '', at: t += 1000 });
    out.checklists = snap(R, s, t + 1000); }

  // 10. Timing: running, overdue, ROSC freeze, ended
  { let s = R.fresh(T0); s.weight = '70'; R.begin(s, T0); R.add(s, 'adrenaline', 'Adrenaline', '1 mg IV', T0 + 10000, { dose: 1, unit: 'mg' });
    const at = [0, 1000, 60000, 119999, 120000, 150000, 400000].map(d => ({ d, t: R.timing(s, T0 + d), can: R.canRhythmCheck(s, T0 + d), prompt: R.checklistPrompt(s, T0 + d) }));
    R.check(s, 'rosc', 'AF', '', T0 + 50000); const afterRosc = [0, 1000, 600000].map(d => R.timing(s, T0 + 50000 + d));
    const e = R.fresh(T0); const idle = R.timing(e, T0 + 5000); e.phase = 'Ended'; e.end = T0 + 9000;
    out.timing = { at, afterRosc, idle, ended: R.timing(e, T0 + 99000), roscPhase: s.phase, roscRemaining: s.remaining, roscDeadline: s.deadline }; }

  return JSON.parse(JSON.stringify(out, (k, v) => (v === undefined ? '__undefined__' : v)));
}
