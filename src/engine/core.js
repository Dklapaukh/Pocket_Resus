/* CORE ENGINE: the session record, weight-based references, timers and rhythm checks.

   Rewritten for readability on 11 Nov 2026 (owner-approved). It gives exactly the same results as
   the original compact engine (root core.js plus change A1): tests/side-by-side.test.mjs runs both
   through thousands of random case sequences and every state and derived value must match.

   Clinical numbers come from the rules file (src/rules/nz-eas.js), not from this file.
   Times are epoch milliseconds. Nothing here records a clinical event just because time passed. */
import { RULES } from '../rules/nz-eas.js';

export const CYCLE = RULES.timing.cprCycleMs;
export const ADR = RULES.timing.adrenalineIntervalMs;

/* ---------- Session ---------- */

/* A new, empty session. The key order matters: saved sessions and tests compare it exactly. */
export function fresh(now = Date.now()) {
  return {
    version: 1,
    id: 'resus-' + now,
    appStart: now,
    resusStart: now,
    end: null,
    phase: 'Ready', // Ready -> Active -> ROSC / Ended
    deadline: null, // when the current CPR cycle ends (null when no cycle is running)
    remaining: CYCLE, // time left in the cycle while it is not running
    cycle: 0,
    rhythm: 'Not recorded',
    priorShocks: 0, // counts entered for care before the app was opened
    priorNoShock: 0,
    priorStreak: 0,
    priorAmio: 0,
    special: false,
    weight: '',
    group: 'Adult',
    weightSource: 'Entered',
    age: '',
    events: [],
    undo: [],
    largeText: false,
  };
}

/* ---------- Weight ---------- */

/* Weight as a number. A decimal comma is accepted ("15,5" -> 15.5); only the first comma is changed. */
function weightNumber(weight) {
  return Number(String(weight).replace(',', '.'));
}

function isBlank(weight) {
  return String(weight).trim() === '';
}

/* Valid = digits with at most one decimal place, above 0 and up to the maximum weight. */
export function validWeight(weight) {
  const looksLikeAWeight = /^\d+(\.\d)?$/.test(String(weight).trim().replace(',', '.'));
  return looksLikeAWeight && weightNumber(weight) > 0 && weightNumber(weight) <= RULES.weight.maxKg;
}

/* A child = a valid weight at or below the adult threshold (40 kg). */
export function isPaediatric(session) {
  return validWeight(session.weight) && weightNumber(session.weight) <= RULES.weight.adultAboveKg;
}

/* The CPG weight band for a weight in kg: the smallest band at or above it (rounded UP).
   Returns undefined above 40 kg or for a weight that is not a number. */
export function childBand(kg) {
  return RULES.childBands.find((band) => kg <= band.maxKg);
}

/* Paediatric weight estimate from age in years, or null when no rule applies. */
export function estimate(age) {
  const years = Number(age);
  const rules = RULES.ageEstimate;
  if (String(age).trim() === '' || !Number.isFinite(years) || years <= 0 || years > rules.elevenToFourteenYears.maxAge) return null;
  if (years < 1) return rules.underOneYearKg;
  if (!Number.isInteger(years)) return null; // between 1 and 14, only whole years have a rule
  if (years <= rules.oneToTenYears.maxAge) return (years + rules.oneToTenYears.addYears) * rules.oneToTenYears.multiplyBy;
  return years * rules.elevenToFourteenYears.multiplyBy;
}

/* ---------- Shock energy ---------- */

/* Shock energy reference in joules (change A1): the child band's energy, or the adult energy above
   40 kg. null when the weight is not valid. */
export function joules(weight) {
  if (!validWeight(weight)) return null;
  const band = childBand(weightNumber(weight));
  return band ? band.shockJ : RULES.adult.shockJ;
}

/* True when the energy reference is low enough to prompt paediatric pads. */
export function needsPaediatricPads(weight) {
  const energy = joules(weight);
  return energy !== null && energy <= RULES.shock.paediatricPadsUpToJ;
}

/* ---------- Medicine references ---------- */

/* Adrenaline and amiodarone dose references in mg. No weight entered, or above 40 kg = adult.
   An invalid weight gives null (no reference shown). */
export function dose(session) {
  const adult = isBlank(session.weight) || (validWeight(session.weight) && weightNumber(session.weight) > RULES.weight.adultAboveKg);
  if (adult) {
    return {
      adr: RULES.adult.adrenalineMg,
      amio1: RULES.adult.amiodaroneFirstMg,
      amio2: RULES.adult.amiodaroneSecondMg,
      basis: 'Adult dose reference · CPG weight band above 40 kg',
    };
  }
  if (!validWeight(session.weight)) return null;
  const band = childBand(weightNumber(session.weight));
  return {
    adr: band.adrenalineMg,
    amio1: band.amiodaroneFirstMg,
    amio2: band.amiodaroneSecondMg,
    basis: 'Child · ' + band.maxKg + ' kg CPG band (rounded up)',
  };
}

/* ---------- Events ---------- */

/* Events that have not been voided. */
export function active(session) {
  return session.events.filter((event) => !event.voided);
}

function byTime(a, b) {
  return a.at - b.at;
}

/* Shock, no-shock and amiodarone counts, including those entered for care before the app opened.
   streak = rhythm checks without a shock since the last shock. */
export function counts(session) {
  const checks = active(session)
    .filter((event) => event.type === 'shock' || event.type === 'noshock')
    .sort(byTime);
  let streak = session.priorStreak;
  for (const event of checks) streak = event.type === 'shock' ? 0 : streak + 1;
  return {
    shocks: session.priorShocks + checks.filter((event) => event.type === 'shock').length,
    noShock: session.priorNoShock + checks.filter((event) => event.type === 'noshock').length,
    streak,
    amio: session.priorAmio + active(session).filter((event) => event.type === 'amiodarone').length,
  };
}

/* The most recent active event of a type, or undefined. */
export function latest(session, type) {
  return active(session)
    .filter((event) => event.type === type)
    .sort(byTime)
    .at(-1);
}

/* Event ids are random; tests replace crypto.randomUUID to make them repeatable. */
function newEventId(now) {
  return globalThis.crypto?.randomUUID?.() || 'e-' + now + '-' + Math.random();
}

/* Record an event. `now` is when it happened; createdAt is when it was entered. */
export function add(session, type, title, details = '', now = Date.now(), extra = {}) {
  const event = { id: newEventId(now), type, title, details, at: now, createdAt: Date.now(), ...extra };
  session.events.push(event);
  return event;
}

/* ---------- Timers ---------- */

/* All clock values in ms:
   left  = time left in the CPR cycle      app   = since the app was opened
   resus = resuscitation duration so far   adr   = until the next adrenaline review (negative = overdue)
   amio  = since the last amiodarone       late  = how far past the end of the cycle */
export function timing(session, now = Date.now()) {
  const left = session.deadline === null ? session.remaining : Math.max(0, session.deadline - now);
  const lastAdrenaline = latest(session, 'adrenaline');
  const lastAmiodarone = latest(session, 'amiodarone');
  return {
    left,
    app: Math.max(0, now - session.appStart),
    resus: Math.max(0, (session.end ?? now) - session.resusStart),
    adr: lastAdrenaline ? lastAdrenaline.at + ADR - now : null,
    amio: lastAmiodarone ? now - lastAmiodarone.at : null,
    late: session.deadline !== null && now > session.deadline ? now - session.deadline : 0,
  };
}

/* A rhythm check is offered only when a cycle is running and its time is up. */
export function canRhythmCheck(session, now = Date.now()) {
  return session.phase === 'Active' && timing(session, now).left === 0;
}

/* Start a new 2-minute CPR cycle. */
export function begin(session, now) {
  session.phase = 'Active';
  session.end = null;
  session.deadline = now + CYCLE;
  session.remaining = CYCLE;
  session.cycle++;
}

/* ---------- Undo ---------- */

const UNDO_DEPTH = 30;

/* Save a copy of the session (without its own undo list) so the next change can be undone. */
export function snapshot(session) {
  const copy = JSON.parse(JSON.stringify(session));
  delete copy.undo;
  session.undo.push(copy);
  session.undo = session.undo.slice(-UNDO_DEPTH);
}

/* Return the session as it was before the last saved change (or unchanged if there is none). */
export function undo(session) {
  const previous = session.undo.pop();
  if (!previous) return session;
  return { ...previous, undo: session.undo };
}

/* ---------- Rhythm checks ---------- */

/* A recorded energy is optional; if given it must be a number above 0 and no more than the maximum. */
export function invalidEnergy(energy) {
  return energy !== '' && (!Number.isFinite(+energy) || +energy <= 0 || +energy > RULES.shock.maxRecordableJ);
}

/* Event text, e.g. "VF · 200 J" or "VF · energy not recorded"; no-shock events show the rhythm only. */
export function rhythmDetails(type, rhythm, energy) {
  if (type !== 'shock') return rhythm;
  return rhythm + ' · ' + (energy ? energy + ' J' : 'energy not recorded');
}

const CHECK_TITLES = { shock: 'Shock delivered', noshock: 'No shock · rhythm check', rosc: 'ROSC' };

/* Record a complete rhythm check (outcome and rhythm together). Returns false if refused:
   a rhythm not allowed for that outcome, after ROSC or the end, or an invalid energy.
   ROSC stops the cycle clock; any other outcome starts the next cycle. */
export function check(session, outcome, rhythm, energy = '', now = Date.now()) {
  const allowed = Object.hasOwn(RULES.rhythms, outcome) ? RULES.rhythms[outcome] : [];
  if (!allowed.includes(rhythm) || session.phase === 'ROSC' || session.phase === 'Ended' || invalidEnergy(energy)) return false;
  snapshot(session);
  session.rhythm = rhythm;
  add(session, outcome, CHECK_TITLES[outcome], rhythmDetails(outcome, rhythm, energy), now, { rhythm, energy });
  if (outcome === 'rosc') {
    session.remaining = timing(session, now).left;
    session.deadline = null;
    session.phase = 'ROSC';
    session.end = now;
  } else {
    begin(session, now);
  }
  return true;
}
