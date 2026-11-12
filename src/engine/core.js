/* CORE ENGINE: the session record, weight-based references, timers and rhythm checks.

   Rewritten for readability on 11 Nov 2026 (owner-approved). It gives exactly the same results as
   the original compact engine (root core.js plus change A1): tests/side-by-side.test.mjs runs both
   through thousands of random case sequences and every state and derived value must match.

   Clinical numbers come from the rules file (src/rules/nz-eas.json), not from this file.
   Times are epoch milliseconds. Nothing here records a clinical event just because time passed. */
import { RULES } from '../rules/load.js';
export { RULES }; // the active rule set, so the app reads limits and wording from the same place

export const CYCLE = RULES.numbers.timing.cprCycleMs;

/* Wording from the rules file with its {name} gaps filled, e.g. wording('childDoseBasis', { band: 20 }). */
export function wording(key, values = {}) {
  return RULES.wording[key].replace(/\{(\w+)\}/g, (gap, name) => String(values[name]));
}
export const ADR = RULES.numbers.timing.adrenalineIntervalMs;

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

/* A saved session as read back from the phone, checked before use (fixes doc 17 and the doc 11
   comma-weight note, 12 Nov 2026). Returns null when it cannot be used at all (wrong version, no
   event list or no start time). Otherwise returns { session, repaired }:
   - any part missing from an older or damaged save is filled with the new-session default
     (events and their audit history are never touched);
   - a valid weight saved with a decimal comma ("15,5") is stored as normal entry would ("15.5");
   - the same is done for each undo copy; an undo copy that cannot be used is dropped.
   repaired = true when anything was changed. */
function usable(saved) {
  return saved !== null && typeof saved === 'object' && saved.version === 1 && Array.isArray(saved.events) && Number.isFinite(saved.appStart);
}

function repairOne(saved) {
  let repaired = false;
  const defaults = fresh(saved.appStart);
  for (const [key, value] of Object.entries(defaults)) {
    if (key === 'undo' || saved[key] !== undefined) continue;
    saved[key] = value;
    repaired = true;
  }
  if (String(saved.weight).includes(',') && validWeight(saved.weight)) {
    saved.weight = String(weightNumber(saved.weight));
    repaired = true;
  }
  return repaired;
}

export function restoreSaved(saved) {
  if (!usable(saved)) return null;
  let repaired = repairOne(saved);
  if (!Array.isArray(saved.undo)) {
    saved.undo = [];
    repaired = true;
  }
  const undoCopies = saved.undo.filter(usable);
  if (undoCopies.length !== saved.undo.length) repaired = true;
  for (const copy of undoCopies) if (repairOne(copy)) repaired = true;
  saved.undo = undoCopies;
  return { session: saved, repaired };
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
  return looksLikeAWeight && weightNumber(weight) > 0 && weightNumber(weight) <= RULES.numbers.weight.maxKg;
}

/* A child = a valid weight at or below the adult threshold (40 kg). */
export function isPaediatric(session) {
  return validWeight(session.weight) && weightNumber(session.weight) <= RULES.numbers.weight.adultAboveKg;
}

/* The CPG weight band for a weight in kg: the smallest band at or above it (rounded UP).
   Returns undefined above 40 kg or for a weight that is not a number. */
export function childBand(kg) {
  return RULES.numbers.childBands.find((band) => kg <= band.maxKg);
}

/* Paediatric weight estimate from age in years, or null when no rule applies. */
export function estimate(age) {
  const years = Number(age);
  const rules = RULES.numbers.ageEstimate;
  if (String(age).trim() === '' || !Number.isFinite(years) || years <= 0 || years > rules.elevenToFourteenYears.maxAge) return null;
  if (years < 1) return rules.underOneYearKg;
  if (!Number.isInteger(years)) return null; // between 1 and 14, only whole years have a rule
  if (years <= rules.oneToTenYears.maxAge) return (years + rules.oneToTenYears.addYears) * rules.oneToTenYears.multiplyBy;
  return years * rules.elevenToFourteenYears.multiplyBy;
}

/* The numbers the age-estimate wording shows, all taken from numbers.ageEstimate. */
export function ageEstimateGaps() {
  const { underOneYearKg, oneToTenYears: ten, elevenToFourteenYears: fourteen } = RULES.numbers.ageEstimate;
  return {
    underOneYearKg,
    tenMaxAge: ten.maxAge,
    tenAddYears: ten.addYears,
    tenMultiplyBy: ten.multiplyBy,
    fourteenFromAge: ten.maxAge + 1,
    fourteenMaxAge: fourteen.maxAge,
    fourteenMultiplyBy: fourteen.multiplyBy,
  };
}

/* Every number the wording can show, taken from part 1 of the rules file (stored once there), plus
   the source names from part 5. */
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export function wordingGaps() {
  const n = RULES.numbers, prep = n.preparation, rsi = n.rsi;
  return {
    ...ageEstimateGaps(),
    cprCycleMinWord: NUMBER_WORDS[n.timing.cprCycleMs / 60000] ?? String(n.timing.cprCycleMs / 60000),
    adrenalineEveryMin: n.timing.adrenalineIntervalMs / 60000,
    amiodaroneFirstShocks: n.amiodarone.dueAtShocks[0],
    amiodaroneSecondShocks: n.amiodarone.dueAtShocks[1],
    amiodaroneMaxDoses: n.amiodarone.dueAtShocks.length,
    magnesiumMaxDoses: n.magnesium.maxDoses,
    bandList: n.childBands.map((band) => band.maxKg).join(' / '),
    joulesPerKg: n.shock.joulesPerKg,
    adultShockJ: n.adult.shockJ,
    padsUpToJ: n.shock.paediatricPadsUpToJ,
    adultAboveKg: n.weight.adultAboveKg,
    adultRoundedToKg: n.weight.adultRoundedToKg,
    fluid: n.products.fluid,
    fluidShort: n.products.fluidShort,
    adrDiluteMg: prep.adrenalineChild.drugMg,
    adrDiluteMl: prep.adrenalineChild.totalMl,
    adrDiluteMgPerMl: prep.adrenalineChild.drugMg / prep.adrenalineChild.totalMl,
    adultMagnesiumMmol: n.adult.magnesiumMmol,
    magAdultGrams: prep.magnesium.adultGrams,
    magAdultDiluteToMl: prep.magnesium.adultDiluteToMl,
    magOverMinMinutes: prep.magnesium.overMinMinutes,
    magOverMaxMinutes: prep.magnesium.overMaxMinutes,
    magChildMmolPerMl: prep.magnesium.ampouleMmol / prep.magnesium.childDiluteToMl,
    magAmpouleMmol: prep.magnesium.ampouleMmol,
    magAmpouleMl: prep.magnesium.ampouleMl,
    magChildDiluteToMl: prep.magnesium.childDiluteToMl,
    adultFluidsMinL: n.adult.fluidsMinMl / 1000,
    adultFluidsMaxL: n.adult.fluidsMaxMl / 1000,
    childFluidsMinPerKg: n.child.fluidsMinMlPerKg,
    childFluidsMaxPerKg: n.child.fluidsMaxMlPerKg,
    fentanylMcgPerKg: rsi.fentanyl.mcgPerKg,
    fentanylMaxMcg: rsi.fentanyl.maxMcg,
    ketamineMgPerKg: rsi.ketamine.mgPerKg,
    ketamineMaxMg: rsi.ketamine.maxMg,
    reducedKetamineMgPerKg: rsi.reducedKetamine.mgPerKg,
    blockerMgPerKg: rsi.blocker.mgPerKg,
    blockerMaxMg: rsi.blocker.maxMg,
    blockerRoundMg: rsi.blocker.roundAdultToMg,
    // part 5
    exportDate: RULES.sources.exportDate,
    reversibleCauses: RULES.sources.reversibleCauses,
    igel: RULES.sources.igel,
  };
}

/* Wording with its gaps filled from part 1 (plus any values given, e.g. { age: 7 }). A list entry
   gives back a list (one item per paragraph). */
export function guideText(key, values = {}) {
  const all = { ...wordingGaps(), ...values };
  const fill = (text) => text.replace(/\{(\w+)\}/g, (gap, name) => String(all[name]));
  const entry = RULES.wording[key];
  return Array.isArray(entry) ? entry.map(fill) : fill(entry);
}

/* ---------- Guidance-tab references (RSI doses, tube formulae) ---------- */

const roundTo = (value, decimals) => Math.round(value * 10 ** decimals) / 10 ** decimals;

/* RSI dose references from the exact weight in kg (not the band). Reference only; records nothing. */
export function rsiDoses(weightKg) {
  const { fentanyl, ketamine, reducedKetamine, blocker, displayDecimals } = RULES.numbers.rsi;
  const capped = (perKg, max) => Math.min(weightKg * perKg, max);
  const blockerMg = weightKg > RULES.numbers.weight.adultAboveKg
    ? Math.min(Math.round((weightKg * blocker.mgPerKg) / blocker.roundAdultToMg) * blocker.roundAdultToMg, blocker.maxMg)
    : capped(blocker.mgPerKg, blocker.maxMg);
  return {
    fentanylMcg: roundTo(capped(fentanyl.mcgPerKg, fentanyl.maxMcg), displayDecimals),
    ketamineMg: roundTo(capped(ketamine.mgPerKg, ketamine.maxMg), displayDecimals),
    reducedKetamineMg: roundTo(capped(reducedKetamine.mgPerKg, reducedKetamine.maxMg), displayDecimals),
    blockerMg: roundTo(blockerMg, displayDecimals),
  };
}

/* Tube size and length-at-lips wording for an age in years, or null when not shown (no age, or above
   showUpToAge). */
export function tubeReference(age) {
  const t = RULES.numbers.tubes;
  if (age === null || !(age <= t.showUpToAge)) return null;
  if (age < 1) {
    return {
      size: wording('tubeSizeUnderOne', { minMm: t.underOneSizeMinMm, maxMm: t.underOneSizeMaxMm }),
      length: wording('tubeLengthUnderOne', { timesSize: t.underOneLengthTimesSize }),
    };
  }
  return {
    size: wording('tubeSizeFormula', { mm: roundTo(age / t.sizeAgeDivisor + t.sizeAddMm, t.displayDecimals) }),
    length: wording('tubeLengthFormula', { cm: roundTo(age / t.lengthAgeDivisor + t.lengthAddCm, t.displayDecimals) }),
  };
}

/* ---------- Shock energy ---------- */

/* Shock energy reference in joules (change A1): the child band's energy, or the adult energy above
   40 kg. null when the weight is not valid. */
export function joules(weight) {
  if (!validWeight(weight)) return null;
  const band = childBand(weightNumber(weight));
  return band ? band.shockJ : RULES.numbers.adult.shockJ;
}

/* True when the energy reference is low enough to prompt paediatric pads. */
export function needsPaediatricPads(weight) {
  const energy = joules(weight);
  return energy !== null && energy <= RULES.numbers.shock.paediatricPadsUpToJ;
}

/* ---------- Medicine references ---------- */

/* Adrenaline and amiodarone dose references in mg. No weight entered, or above 40 kg = adult.
   An invalid weight gives null (no reference shown). */
export function dose(session) {
  const adult = isBlank(session.weight) || (validWeight(session.weight) && weightNumber(session.weight) > RULES.numbers.weight.adultAboveKg);
  if (adult) {
    return {
      adr: RULES.numbers.adult.adrenalineMg,
      amio1: RULES.numbers.adult.amiodaroneFirstMg,
      amio2: RULES.numbers.adult.amiodaroneSecondMg,
      basis: wording('adultDoseBasis', { adultAboveKg: RULES.numbers.weight.adultAboveKg }),
    };
  }
  if (!validWeight(session.weight)) return null;
  const band = childBand(weightNumber(session.weight));
  return {
    adr: band.adrenalineMg,
    amio1: band.amiodaroneFirstMg,
    amio2: band.amiodaroneSecondMg,
    basis: wording('childDoseBasis', { band: band.maxKg }),
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
  return energy !== '' && (!Number.isFinite(+energy) || +energy <= 0 || +energy > RULES.numbers.shock.maxRecordableJ);
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
  const allowed = Object.hasOwn(RULES.numbers.rhythms, outcome) ? RULES.numbers.rhythms[outcome] : [];
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
