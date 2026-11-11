/* Shared in-memory session and screen state, including loading a saved session
   at startup. Owner-approved recovery and display rules are marked below. */
import { R, KEY, BACKUP_KEY } from './base.js';
import { ARREST_CHECKLISTS } from './data.js';

/* Everything the app remembers while it runs, in one object (was loose variables). */
/* st.s is the current patient/session (events, weight, phase, timers). The other fields are
   screen-only memory: current tab, open checklist, the open pop-up's context, wake lock, etc.
   Only st.s is saved to the phone. */
export const st = {
  logScope: 'all',
  checklistDisplay: 'items',
  s: undefined,
  amioShownFor: null, // id of the session whose amiodarone card has already appeared (A2: it then stays)
  tab: 'live',
  checklist: 'arrest',
  checkReturn: 'live',
  sheetContext: null,
  toastTimeout: undefined,
  installPrompt: null,
  storageOK: true,
  wakeLock: null,
  recovery: null, // A6: 'backed-up' or 'not-backed-up' when an unreadable saved session was replaced at start
};

/* Start-up: reload the saved session if it looks valid (right version, has an event list and a
   start time); otherwise begin a new one. A6 (owner ruling, 4 Nov 2026): if something WAS saved
   but cannot be read, keep a raw backup copy under BACKUP_KEY before it is replaced, and remember
   (st.recovery) to show a short message once the screen is drawn. Nothing saved = no message. */
let raw = null;
try {
  raw = localStorage.getItem(KEY);
} catch {}
let saved = null;
try {
  saved = JSON.parse(raw);
} catch {}
if (
  saved?.version === 1 &&
  Array.isArray(saved.events) &&
  Number.isFinite(saved.appStart)
) {
  st.s = saved;
} else {
  st.s = R.fresh();
  if (raw !== null && raw !== undefined) {
    try {
      localStorage.setItem(BACKUP_KEY, raw); // newest unreadable copy replaces any older backup
      st.recovery = 'backed-up';
    } catch {
      st.recovery = 'not-backed-up'; // storage full or blocked
    }
  }
}

/* A saved session that was running gets its countdown restarted from the time that was left. */
if (st.s.phase === 'Active' && st.s.deadline === null)
  st.s.deadline = Date.now() + Math.max(0, st.s.remaining);

/* Log entries for the chosen scope and checklist display; voided ones optional. */
export function logRows(includeVoided = true) {
  return R.logEntries(st.s, ARREST_CHECKLISTS, {
    scope: st.logScope,
    checklists: st.checklistDisplay,
    includeVoided,
  });
}

/* True once the session has been ended. */
export function finished() {
  return st.s.phase === 'Ended';
}

/* True if torsades has been recorded (amiodarone is then withheld and magnesium offered). */
export function torsades() {
  return R.hasTorsades(st.s);
}

/* A2c (owner ruling, 3 Nov 2026): which card fills the lower drug slot. Same as the engine's R.careMode except that
   a non-shockable rhythm (PEA or Asystole; and "Other" since A7, owner ruling 11 Nov 2026) at the latest relevant
   check gives fluids. "Not recorded" is still ignored. VF/VT then bring amiodarone back (or magnesium if torsades
   was ever recorded). The engine file is untouched. */
export const FLUID_RHYTHMS = ['PEA', 'Asystole', 'Other'];
export function latestLowerRhythm(s) {
  const latest = R.active(s)
    .filter(
      (event) =>
        ['shock', 'noshock', 'rhythm', 'rosc'].includes(event.type) &&
        [...FLUID_RHYTHMS, 'VF', 'VT', 'Torsades'].includes(event.rhythm),
    )
    .sort((a, b) => a.at - b.at)
    .at(-1);
  return latest?.rhythm || s.rhythm;
}

export function careMode(s) {
  const rhythm = latestLowerRhythm(s);
  if (FLUID_RHYTHMS.includes(rhythm)) return 'fluids';
  return R.hasTorsades(s) ? 'magnesium' : 'amiodarone';
}

/* Select the engine's dose reference in mg. The card separately decides whether
   a reference may be shown or recorded, including the child second-dose rule. */
export function drugDose(type) {
  const doseReference = R.dose(st.s);
  const counts = R.counts(st.s);
  if (!doseReference) return null;
  if (type === 'adrenaline') return doseReference.adr;
  return counts.amio === 0 ? doseReference.amio1 : doseReference.amio2;
}

/* C6b (owner ruling 3 Nov 2026): the child second amiodarone dose has no EAS source, so once a child has had
   one dose and 6 shocks are reached the app shows "Seek clinical advice" instead of a number. */
export function childSecondAmio() {
  const c = R.counts(st.s);
  return R.isPaediatric(st.s) && c.amio === 1 && c.shocks >= 6;
}

/* C6b-2 (owner ruling 3 Nov 2026): the second amiodarone dose is only an option from the 6th shock. True while one
   dose is recorded and fewer than 6 shocks (including earlier shocks) have been counted. */
export function secondAmioEarly() {
  const c = R.counts(st.s);
  return c.amio === 1 && c.shocks < 6;
}

/* A5 (owner ruling, 4 Nov 2026): protection against accidental double-taps on the Live drug cards.
   Adrenaline: after a dose is recorded the card is greyed out and cannot be used for 3 min 30 s.
   Magnesium and fluids: the card cannot record a repeat for 5 s (not greyed out). Amiodarone is already
   protected by its dose-count rules. Returns the milliseconds left (0 = free). An undone dose frees the card. */
export const A5_LOCK_MS = { adrenaline: 210000, magnesium: 5000, fluids: 5000 };
export function lockLeft(type) {
  const last = R.supportStats(st.s, type).last;
  if (!last || !A5_LOCK_MS[type]) return 0;
  const gone = Date.now() - last.at;
  return gone >= 0 && gone < A5_LOCK_MS[type] ? A5_LOCK_MS[type] - gone : 0;
}
