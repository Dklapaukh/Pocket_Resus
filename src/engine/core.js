/* CORE ENGINE: the session record, weight-based references, timers and rhythm checks.

   Rewritten for readability on 11 Nov 2026 (owner-approved). It gives exactly the same results as
   the original compact engine (root core.js plus change A1): tests/side-by-side.test.mjs runs both
   through thousands of random case sequences and every state and derived value must match.

   Clinical numbers come from the rules file (src/rules/nz-eas.yaml), not from this file.
   Times are epoch milliseconds. Nothing here records a clinical event just because time passed. */
import { RULES } from '../rules/load.js';
export { RULES }; // the active rule set, so the app reads limits and wording from the same place

export const CYCLE = RULES.numbers.timing.cprCycleMs;

/* One entry of the wording part of the rules file. A plain name such as 'childDoseBasis' is read
   directly; a name with dots such as 'liveCards.reviewInactive' is read from inside a group. */
function wordingEntry(key) {
  return key.split('.').reduce((node, part) => node[part], RULES.wording);
}

/* Wording from the rules file with its {name} gaps filled, e.g. wording('childDoseBasis', { band: 20 }). */
export function wording(key, values = {}) {
  return wordingEntry(key).replace(/\{(\w+)\}/g, (gap, name) => String(values[name]));
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
    weightSource: wording('weightSources.entered'),
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

/* Age from the EAS 7.2 band table headings (change A16): an age under 1 year stays as typed; an age of 1 year
   or more is ROUNDED UP to the next whole year (1.1 -> 2). null for a blank or non-number entry, 0 or less,
   or above numbers.ageEstimate.adultUpToAge (no estimate). */
function roundedUpAge(age) {
  const years = Number(age);
  if (String(age).trim() === '' || !Number.isFinite(years) || years <= 0 || years > RULES.numbers.ageEstimate.adultUpToAge) return null;
  return years < 1 ? years : Math.ceil(years);
}

/* Paediatric weight estimate from age in years (change A16): under 1 year = underOneYearKg; otherwise the
   weightKg of the first band whose maxAge the rounded-up age does not pass. null when no weight is given:
   an age outside the rules, or an adult age (see adultAge). */
export function estimate(age) {
  const rules = RULES.numbers.ageEstimate, years = roundedUpAge(age);
  if (years === null) return null;
  if (years < 1) return rules.underOneYearKg;
  return rules.bands.find((band) => years <= band.maxAge)?.weightKg ?? null;
}

/* The rounded-up age when it is above every band but not above adultUpToAge (age 14 = adult, owner decision
   8): the weight pop-up then says to enter the weight. null for any other age. */
export function adultAge(age) {
  const years = roundedUpAge(age);
  return years !== null && years >= 1 && estimate(age) === null ? years : null;
}

/* The numbers and phrases the age-estimate wording shows, all built from numbers.ageEstimate:
   ageBandList "1 year: 10 kg. 2–5 years: 20 kg. ...", adultAges "14 years", ageMaxYears 14. */
export function ageEstimateGaps() {
  const { underOneYearKg, bands, adultUpToAge } = RULES.numbers.ageEstimate;
  const ages = (from, to) => (from === to ? wording(from === 1 ? 'ageOneYear' : 'ageManyYears', { age: from }) : wording('ageYearRange', { from, to }));
  const ageBandList = bands.map((band, i) => wording('ageBandWeight', { ages: ages(i === 0 ? 1 : bands[i - 1].maxAge + 1, band.maxAge), kg: band.weightKg })).join(' ');
  return { underOneYearKg, ageBandList, adultAges: ages(bands.at(-1).maxAge + 1, adultUpToAge), ageMaxYears: adultUpToAge };
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
    warningSeconds: n.timing.warningAtMs / 1000,
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
  const entry = wordingEntry(key);
  const hasGap = (text) => text.includes('{');
  const all = [].concat(entry).some(hasGap) ? { ...wordingGaps(), ...values } : values;
  const fill = (text) => (hasGap(text) ? text.replace(/\{(\w+)\}/g, (gap, name) => String(all[name])) : text);
  return Array.isArray(entry) ? entry.map(fill) : fill(entry);
}

/* ---------- Guidance-tab references (RSI doses, tube sizes) ---------- */

/* RSI dose references looked up in the EAS 9.3 dose summary tables (change A12). Reference only; records nothing.
   A child (weight.adultAboveKg or less) uses the column of its weight band, rounded up (decision 2). The 5 kg band
   has no column, so null is returned and the pop-up shows "Seek clinical advice" (decision 7 rule 3).
   An adult uses the first adult column at or above the weight; above the last column, the last ("≥ 100 kg").
   Returns a copy of the column: { columnKg, fentanylMcg, ketamineMg, reducedKetamineMg, blockerMg }, or null. */
export function rsiDoses(weightKg) {
  const { paediatric, adult } = RULES.numbers.rsi.tables;
  const column = weightKg <= RULES.numbers.weight.adultAboveKg
    ? paediatric.find((c) => c.columnKg === childBand(weightKg)?.maxKg)
    : adult.find((c) => weightKg <= c.columnKg) ?? adult.at(-1);
  return column ? { ...column } : null;
}

/* Cuffed ETT size and length at lips from the EAS 7.2 band tables (change A18). The band comes from the saved
   weight, rounded up; with no valid weight, from the saved age (weight from age, A16). A saved weight wins.
   Returns { size, length } for a child band, { adult: true } for a weight over adultAboveKg or an age above the
   age rows (14 years or more), or null when neither weight nor age gives a band. */
export function tubeReference(weight, age) {
  const kg = validWeight(weight) ? weightNumber(weight) : estimate(age);
  if (kg === null) return adultAge(age) !== null || Number(age) > RULES.numbers.ageEstimate.adultUpToAge ? { adult: true } : null;
  const band = childBand(kg);
  if (!band) return { adult: true };
  const [first, second] = band.ettSizesMm;
  const sizes = second === undefined ? first : wording('tubeSizeOr', { first, second });
  return { size: wording('tubeSizeBand', { sizes }), length: wording('tubeLengthBand', { cm: band.ettLengthCm }) };
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
   An invalid weight gives null (no reference shown). A child has no second amiodarone dose (amio2 is
   null): EAS 7.2 gives none, so the card says "Seek clinical advice" or shows no dose (C6b, A10). */
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
    amio2: null, // A10: no guideline source for a child's second dose
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
  return energy ? wording('eventDetails.shockWithEnergy', { rhythm, energy }) : wording('eventDetails.shockNoEnergy', { rhythm });
}

/* Record a complete rhythm check (outcome and rhythm together). Returns false if refused:
   a rhythm not allowed for that outcome, after ROSC or the end, or an invalid energy.
   ROSC stops the cycle clock; any other outcome starts the next cycle. */
export function check(session, outcome, rhythm, energy = '', now = Date.now()) {
  const allowed = Object.hasOwn(RULES.numbers.rhythms, outcome) ? RULES.numbers.rhythms[outcome] : [];
  if (!allowed.includes(rhythm) || session.phase === 'ROSC' || session.phase === 'Ended' || invalidEnergy(energy)) return false;
  snapshot(session);
  session.rhythm = rhythm;
  add(session, outcome, wording('rhythmCheckTitles.' + outcome), rhythmDetails(outcome, rhythm, energy), now, { rhythm, energy });
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
