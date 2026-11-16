/* CARD ENGINE (cards plan step C3, CARDS-DESIGN.md section 2): one routine that answers "which cards show now?".

   cardsNow(cardFile, session, nowMs, options) reads
     - the card file (src/cards/nz-eas-cards.yaml, read with readCardFile from check.js; it must pass checkCardFile),
     - the session exactly as the app saves it today (src/engine/core.js: events, earlier counts, weight, phase,
       the special-situation switch),
   and returns the cards to draw, in file order, each with what the screen needs: place, title, lines, the dose
   lines for this patient, what tapping records, the timer, the dose count, the lock, the details pop-up lines and
   the sources. It is a pure function: it changes nothing it is given and records nothing because time passed.

   It holds no clinical numbers or wording. Every dose, sentence and condition value comes from the card file.
   The only fixed things here are how the app's saved session is laid out (event types, the "Unknown" rhythm that a
   rhythm check carries until its rhythm is chosen, the earlier-amiodarone count) and the weight rule of owner
   decision 2: a child's weight is rounded UP to the EAS 7.2 band; above the last band, adult; no weight, adult
   (decision 2, D11). The live app does not use this file until plan step C4. */

// The EAS 7.2 band table in the card file: the authority for child weight bands (owner decisions 2 and 8).
export const BAND_TABLE = 'eas72';

// Events that are rhythm checks (a shock, a no-shock check, or an older rhythm entry). A ROSC event is not one:
// a rhythm recorded with ROSC never decides a card (A8).
const RHYTHM_CHECK_EVENTS = ['shock', 'noshock', 'rhythm'];

// What a rhythm check carries while its rhythm has not been chosen ("Rhythm not recorded", "+ Previous shock").
// It changes nothing (A20).
const NOT_RECORDED = ['Unknown', 'Not recorded'];

// Doses entered as "earlier counts" (care before the app was opened), by drug. Only amiodarone has one today.
const EARLIER_DOSES = { amiodarone: 'priorAmio' };

/* ---------- Reading the session ---------- */

/* The events still in force: an event that was voided (crossed out in the log) never counts. Undo needs nothing
   here, because undo puts back the whole earlier session. */
function activeEvents(session) {
  return (Array.isArray(session.events) ? session.events : []).filter((event) => event && !event.voided);
}

/* The same list sorted oldest first by the time each event happened (a corrected time counts). Events at the same
   time keep the order they were recorded in. */
function byTime(events) {
  return events.slice().sort((a, b) => a.at - b.at);
}

/* A count saved in the session as a number ("earlier counts"); anything else counts as 0. */
function savedCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

/* Condition 1, arrest_running: CPR has been started and there has been no ROSC or end since. The app keeps this
   as the session phase: "Active" from the first cycle (or a re-arrest) until ROSC or the end of the session. */
function arrestRunning(session) {
  return session.phase === 'Active';
}

/* The rhythm recorded at the latest rhythm check, or null if none. Rhythm checks only (ROSC rhythms are ignored,
   A8); a check whose rhythm was not recorded changes nothing (A20). A rhythm that is no longer a choice (an older
   saved session's "Other") still counts as the latest rhythm, so it is "not PEA" (A20). */
export function latestRhythm(session) {
  const checks = activeEvents(session).filter((event) => RHYTHM_CHECK_EVENTS.includes(event.type) && isRecordedRhythm(event.rhythm));
  return byTime(checks).at(-1)?.rhythm ?? null;
}

// True for a rhythm that was actually chosen (not empty and not "Unknown" / "Not recorded").
function isRecordedRhythm(rhythm) {
  return typeof rhythm === 'string' && rhythm.trim() !== '' && !NOT_RECORDED.includes(rhythm);
}

/* Condition 4 and 5: was this rhythm recorded at any rhythm check in this session (voided checks left out)? */
function everRecorded(session, rhythm) {
  return activeEvents(session).some((event) => RHYTHM_CHECK_EVENTS.includes(event.type) && event.rhythm === rhythm);
}

/* Condition 3: shocks so far. Every shock event counts, including "+ Previous shock" (a shock event placed just
   before the app was opened) and a shock whose rhythm was not recorded, plus the earlier shock count. */
export function shockCount(session) {
  return savedCount(session.priorShocks) + activeEvents(session).filter((event) => event.type === 'shock').length;
}

/* Condition 6: doses of one drug so far: the recorded doses (a dose entered by hand under the drug's name counts,
   as today) plus any earlier doses entered for that drug. */
export function doseCount(session, drug) {
  const earlier = Object.hasOwn(EARLIER_DOSES, drug) ? savedCount(session[EARLIER_DOSES[drug]]) : 0;
  return earlier + activeEvents(session).filter((event) => event.type === drug).length;
}

// The latest recorded dose of a drug (an earlier-count dose has no time, so it is never the latest), or undefined.
function lastDose(session, drug) {
  return byTime(activeEvents(session).filter((event) => event.type === drug)).at(-1);
}

/* ---------- The patient: adult or child (it only picks the dose line) ---------- */

/* The saved weight as a number of kg, or 'blank', or 'invalid'. A valid weight is digits with at most one decimal
   place (a decimal comma is read as a point), above 0 and no more than maxWeightKg: the same test as the app's
   validWeight today. A weight saved with a decimal (an older session) is kept as saved (A25). */
function readWeight(weight, maxWeightKg) {
  const text = String(weight ?? '').trim().replace(',', '.');
  if (text === '') return 'blank';
  if (!/^\d+(\.\d)?$/.test(text)) return 'invalid';
  const kg = Number(text);
  return kg > 0 && kg <= maxWeightKg ? kg : 'invalid';
}

/* Who the dose lines are for (owner decision 2; D11):
     { who: 'adult', kg: null }             no weight entered: adult doses
     { who: 'adult', kg }                   above the last EAS 7.2 band (40 kg): adult doses
     { who: 'child', kg, bandKg }           the weight rounded UP to the first band at or above it (5, 10, 20, 30, 40)
     { who: null, kg: null }                a weight that is not valid: no dose is shown (as today) */
export function patientNow(cardFile, session, options = {}) {
  const maxWeightKg = options.maxWeightKg ?? Infinity;
  const kg = readWeight(session.weight, maxWeightKg);
  if (kg === 'blank') return { who: 'adult', kg: null };
  if (kg === 'invalid') return { who: null, kg: null };
  const bands = cardFile.tables[BAND_TABLE];
  const band = bands.rows.find((row) => kg <= row[bands.key]);
  return band ? { who: 'child', kg, bandKg: band[bands.key] } : { who: 'adult', kg };
}

/* ---------- Lines and doses ---------- */

/* One card line as the screen draws it: guideline words (kind 'guideline', with its source) or the app's own words
   (kind 'app', drawn differently; source may be null). */
function showLine(line) {
  if ('app_text' in line) return { kind: 'app', text: line.app_text, source: line.source ?? null };
  return { kind: 'guideline', text: line.text, source: line.source };
}

/* One table cell for this patient. A child uses the row of its weight band (owner decision 2): for the EAS 7.2 table
   the band row itself, for another child table (EAS 9.3) the column headed with the band weight. An adult uses the
   first row at or above the weight, or the last row above that (the EAS 9.3 adult columns, "rounded up to the next
   column", A26). The result:
     { kind: 'cell', table, column, value, rowKey, source }   the printed value (a number or a list of numbers)
     { kind: 'seek_advice', table, column, source }          the cell is "-" or the band has no row: the screen shows
                                                             "Seek clinical advice" and no number (decision 7 rule 3)
     { kind: 'needs_weight', table, column, source }         an adult with no weight: no row can be chosen */
function resolveCell(cell, cardFile, patient) {
  const table = cardFile.tables[cell.table];
  const base = { table: cell.table, column: cell.column, source: cell.source };
  let row;
  if (patient.who === 'child') row = table.rows.find((candidate) => candidate[table.key] === patient.bandKg);
  else if (patient.kg === null) return { kind: 'needs_weight', ...base };
  else row = table.rows.find((candidate) => patient.kg <= candidate[table.key]) ?? table.rows.at(-1);
  const value = row ? row[cell.column] : null;
  if (value === null || value === undefined) return { kind: 'seek_advice', ...base };
  return { kind: 'cell', ...base, value, rowKey: row[table.key] };
}

/* The dose lines for this patient: the card's adult part or child part (each one line, one table cell, or a list).
   { who, lines } ; who is null and lines empty when the weight is not valid (no dose is shown, as today). */
function resolveDose(dose, cardFile, patient) {
  if (!dose) return null;
  if (patient.who === null) return { who: null, lines: [] };
  const part = dose[patient.who];
  const lines = (Array.isArray(part) ? part : [part]).map((line) => ('table' in line ? resolveCell(line, cardFile, patient) : showLine(line)));
  return { who: patient.who, lines };
}

/* The amount a tap records. "typed": nothing, the clinician types it (never pre-filled). "dose": the dose shown in
   the FIRST dose line: a table cell's printed number, or the number printed just before the record unit at the
   start of a guideline line ("1 mg IV for an adult." -> 1 for unit mg). Nothing is calculated. null when the first
   line shows no such number ("Seek clinical advice", no valid weight): then nothing can be recorded from the card. */
function recordValue(record, dose) {
  if (record.amount !== 'dose' || !dose || !dose.lines.length) return null;
  const first = dose.lines[0];
  if (first.kind === 'cell') return typeof first.value === 'number' ? first.value : null;
  if (first.kind !== 'guideline') return null;
  const unit = record.unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const printed = new RegExp('^(\\d+(?:\\.\\d+)?) ' + unit + '(?![A-Za-z])').exec(first.text);
  return printed ? Number(printed[1]) : null;
}

/* Details pop-up lines for this patient: a line marked only: adult or only: child is left out for the other
   patient (A34), and left out when the weight is not valid. */
function detailsFor(details, patient) {
  return (details || []).filter((line) => !('only' in line) || line.only === patient.who).map(showLine);
}

/* Every source the card shows (lines, dose lines, details), each once, in the order they appear. */
function sourcesOf(parts) {
  const seen = [];
  for (const line of parts) if (line.source && !seen.includes(line.source)) seen.push(line.source);
  return seen;
}

/* ---------- Conditions ---------- */

/* One condition of show_when, true or false for this session (CARDS-DESIGN.md section 2, the seven conditions).
   request: the ids of the cards opened from the Guidance tab (on_request). */
function conditionMet(condition, card, session, request) {
  if (condition === 'arrest_running') return arrestRunning(session);
  if (condition === 'on_request') return request.includes(card.id);
  const [[name, value]] = Object.entries(condition);
  switch (name) {
    case 'latest_rhythm': return value.includes(latestRhythm(session));
    case 'shocks_at_least': return shockCount(session) >= value;
    case 'ever_recorded': return everRecorded(session, value);
    case 'never_recorded': return !everRecorded(session, value);
    case 'doses_at_least': return doseCount(session, card.record.drug) >= value;
    default: throw new Error('unknown condition "' + name + '" (the card checker refuses this file)');
  }
}

// True when every condition of the card is met (show_when is "all of these").
function cardMatches(card, session, request) {
  return card.show_when.every((condition) => conditionMet(condition, card, session, request));
}

/* ---------- The routine ---------- */

/* The cards to draw now, in file order. Only the first matching card of a group shows (amiodarone-2 is listed
   before amiodarone-1). options:
     request      the id (or list of ids) of on_request cards opened from the Guidance tab; none by default
     maxWeightKg  the largest weight the app accepts (the input limit, a setting); no limit by default
   Each card returned:
     { id, title, place, group, lines, dose, record, timer, doses, lock, details, pop_up_on_show, manual_review, sources }
   dose          null, or { who, lines } (see resolveDose)
   record        null, or { drug, unit, amount, value } (value: the number a tap records, see recordValue)
   timer         null, or { every_min, from, lastDoseAt, leftMs } (leftMs negative = overdue; null before a dose)
   doses         null, or { count, max, complete, confirm } (confirm: the lines to show before a repeat dose, once
                 a dose is recorded and the limit is not reached)
   lock          null, or { seconds, leftMs } (A5 double-tap lock; 0 = free; a voided or undone dose frees it)
   manual_review true for every automatic (arrest_running) card while the special-situation switch is on: the
                 card is still shown, but the screen offers no recording from it ("Manual review", as today) */
export function cardsNow(cardFile, session, nowMs, options = {}) {
  const request = [].concat(options.request ?? []);
  const patient = patientNow(cardFile, session, options);
  const groupsShown = new Set();
  const shown = [];
  for (const card of cardFile.cards) {
    if (card.group && groupsShown.has(card.group)) continue;
    if (!cardMatches(card, session, request)) continue;
    if (card.group) groupsShown.add(card.group);
    shown.push(drawCard(card, cardFile, session, nowMs, patient));
  }
  return shown;
}

/* Everything the screen needs to draw one card that shows now. */
function drawCard(card, cardFile, session, nowMs, patient) {
  const lines = card.lines.map(showLine);
  const dose = resolveDose(card.dose, cardFile, patient);
  const details = detailsFor(card.details, patient);
  const record = card.record ? { ...card.record, value: recordValue(card.record, dose) } : null;
  const count = card.record ? doseCount(session, card.record.drug) : 0;
  const last = card.record ? lastDose(session, card.record.drug) : undefined;
  const max = card.repeat ? card.repeat.max : null;
  const confirm = card.repeat?.confirm && count >= 1 && count < max ? card.repeat.confirm.map(showLine) : [];
  const automatic = card.show_when.includes('arrest_running');
  return {
    id: card.id,
    title: card.title,
    place: card.place,
    group: card.group ?? null,
    lines,
    dose,
    record,
    timer: card.timer ? timerState(card.timer, last, nowMs) : null,
    doses: card.record ? { count, max, complete: max !== null && count >= max, confirm } : null,
    lock: 'lock_s' in card ? { seconds: card.lock_s, leftMs: lockLeft(card.lock_s, last, nowMs) } : null,
    details,
    pop_up_on_show: card.pop_up_on_show === true,
    manual_review: automatic && session.special === true,
    sources: sourcesOf([...lines, ...(dose ? dose.lines : []), ...confirm, ...details]),
  };
}

/* The card clock (timer: { every_min, from: last_dose }): time left until the next dose is due, counted from the
   latest recorded dose; negative when overdue; null before the first dose. */
function timerState(timer, last, nowMs) {
  const everyMs = timer.every_min * 60000;
  return { every_min: timer.every_min, from: timer.from, lastDoseAt: last ? last.at : null, leftMs: last ? last.at + everyMs - nowMs : null };
}

/* A5 double-tap lock: milliseconds until the card can record again after its latest dose (0 = free). The same rule
   as today's lockLeft: a dose timed in the future, or one older than the lock, leaves the card free. */
function lockLeft(seconds, last, nowMs) {
  const lockMs = seconds * 1000;
  if (!last || !lockMs) return 0;
  const gone = nowMs - last.at;
  return gone >= 0 && gone < lockMs ? lockMs - gone : 0;
}
