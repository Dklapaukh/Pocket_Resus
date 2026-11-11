/* RHYTHM CARE: torsades, magnesium and fluid references, and two-step rhythm checks.

   Rewritten for readability on 11 Nov 2026 (owner-approved); results are identical to the original
   (see tests/side-by-side.test.mjs). Clinical numbers come from src/rules/nz-eas.js.
   Everything is worked out from the recorded events, so corrections, voids and undo always win. */
import { RULES } from '../rules/nz-eas.js';
import * as R from './core.js';

/* True if torsades is the current rhythm or appears on any active event. */
export function hasTorsades(session) {
  return session.rhythm === 'Torsades' || R.active(session).some((event) => event.rhythm === 'Torsades');
}

/* ORIGINAL lower-card rule (fluids after PEA only). The live app no longer uses this: it uses
   careMode() in src/app/state.js, which adds Asystole (A2c) and Other (A7). Kept so the
   side-by-side test can still compare against the original engine. */
export function careMode(session) {
  const relevant = R.active(session)
    .filter((event) => ['shock', 'noshock', 'rhythm', 'rosc'].includes(event.type) && ['PEA', 'VF', 'VT', 'Torsades'].includes(event.rhythm))
    .sort((a, b) => a.at - b.at);
  const rhythm = relevant.at(-1)?.rhythm || session.rhythm;
  if (rhythm === 'PEA') return 'fluids';
  return hasTorsades(session) ? 'magnesium' : 'amiodarone';
}

const ADULT_MAGNESIUM = { basis: 'Adult · EAS 3.14 / EAS 14.27' };

/* Magnesium dose reference in mmol. No weight or above 40 kg = adult.
   Known quirk, kept on purpose: the child band here is read WITHOUT the decimal-comma
   conversion, so a saved weight like "15,5" finds no band (doc 11, comma-weight note). */
export function magnesiumReference(session) {
  if (!String(session.weight).trim()) return { dose: RULES.adult.magnesiumMmol, ...ADULT_MAGNESIUM };
  if (!R.validWeight(session.weight)) return { dose: null, basis: 'Enter a valid weight for a dose reference' };
  if (!R.isPaediatric(session)) return { dose: RULES.adult.magnesiumMmol, ...ADULT_MAGNESIUM };
  const band = R.childBand(+session.weight);
  const bandKg = band?.maxKg;
  const basis = bandKg <= 10
    ? 'No magnesium dose listed for the ' + bandKg + ' kg CPG band · seek clinical advice'
    : 'Child · ' + bandKg + ' kg CPG band · EAS 7.2';
  return { dose: band?.magnesiumMmol ?? null, basis };
}

/* Fluid volume reference in mL: adult range, or 20-40 mL/kg of the ACTUAL child weight.
   Same comma quirk as magnesium: "15,5" gives NaN (doc 11). */
export function fluidReference(session) {
  if (!R.validWeight(session.weight)) return { min: null, max: null, basis: 'Enter weight for a volume reference' };
  if (R.isPaediatric(session)) {
    const kg = +session.weight;
    return { min: RULES.child.fluidsMinMlPerKg * kg, max: RULES.child.fluidsMaxMlPerKg * kg, basis: '20–40 mL/kg · EAS 3.14' };
  }
  return { min: RULES.adult.fluidsMinMl, max: RULES.adult.fluidsMaxMl, basis: 'Adult · EAS 3.14' };
}

/* For one medicine type: how many active doses, the latest one, and the total mL recorded. */
export function supportStats(session, type) {
  const events = R.active(session).filter((event) => event.type === type);
  const last = events.slice().sort((a, b) => a.at - b.at).at(-1);
  const total = events.reduce((sum, event) => sum + (event.unit === 'mL' && Number.isFinite(+event.dose) ? +event.dose : 0), 0);
  return { count: events.length, last, total };
}

/* Step 1 of a two-step rhythm check: record shock / no shock now (rhythm still unknown) and start
   the next cycle. Returns the new event id, or null if a rhythm check is not due. */
export function startOutcome(session, outcome, now = Date.now()) {
  if (!['shock', 'noshock'].includes(outcome) || !R.canRhythmCheck(session, now)) return null;
  R.snapshot(session);
  const title = outcome === 'shock' ? 'Shock delivered' : 'No shock · rhythm check';
  const event = R.add(session, outcome, title, 'Rhythm not recorded', now, { rhythm: 'Unknown', energy: '' });
  session.rhythm = 'Unknown';
  R.begin(session, now);
  session.pendingRhythm = { id: event.id, outcome, at: now };
  return event.id;
}

/* Step 2: add the rhythm (and energy) to the event from step 1. Returns false if refused:
   not the pending event, a rhythm not allowed for its outcome, or an invalid energy. */
export function completeOutcome(session, id, rhythm, energy = '') {
  const event = session.events.find((candidate) => candidate.id === id && !candidate.voided);
  const allowed = event?.type === 'shock' ? RULES.rhythms.shock : RULES.rhythms.noshock;
  const refused = !event
    || !['shock', 'noshock'].includes(event.type)
    || session.pendingRhythm?.id !== id
    || !allowed.includes(rhythm)
    || R.invalidEnergy(energy);
  if (refused) return false;
  R.snapshot(session);
  event.rhythm = rhythm;
  event.energy = energy;
  event.details = R.rhythmDetails(event.type, rhythm, energy);
  session.rhythm = rhythm;
  delete session.pendingRhythm;
  return true;
}

/* "+ Previous shock": a shock given before the app was opened. Time and details are unknown,
   so it is placed just before app start and flagged for review. */
export function addPreAppShock(session, now = Date.now()) {
  return R.add(session, 'shock', 'Shock delivered', 'Before app opened · time/details not recorded', session.appStart - 1, {
    rhythm: 'Unknown',
    energy: '',
    preApp: true,
    timeUnknown: true,
    needsReview: true,
    recordedAt: now,
  });
}

/* Offer the checklist during a running cycle with enough time left, once adrenaline has been given. */
export function checklistPrompt(session, now = Date.now()) {
  return session.phase === 'Active'
    && session.deadline !== null
    && R.timing(session, now).left >= RULES.timing.checklistPromptMinLeftMs
    && R.active(session).some((event) => event.type === 'adrenaline');
}
