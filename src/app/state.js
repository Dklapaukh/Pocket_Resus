/* Shared in-memory session and screen state, including loading a saved session
   at startup. Owner-approved recovery and display rules are marked below. */
import { R, KEY, BACKUP_KEY, REPAIRED_BACKUP_KEY } from './base.js';

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

/* Start-up: reload the saved session if it can be used (right version, has an event list and a
   start time; R.restoreSaved also fills any missing parts and converts a comma weight, doc 17 and
   doc 11); otherwise begin a new one. A6 (owner ruling, 4 Nov 2026): if something WAS saved but
   cannot be read, keep a raw backup copy under BACKUP_KEY before it is replaced, and remember
   (st.recovery) to show a short message once the screen is drawn. Nothing saved = no message.
   A save that had to be repaired is kept raw under REPAIRED_BACKUP_KEY (so an A6 backup is never
   overwritten) and loads without a message. */
let raw = null;
try {
  raw = localStorage.getItem(KEY);
} catch {}
let saved = null;
try {
  saved = JSON.parse(raw);
} catch {}
const restored = R.restoreSaved(saved);
if (restored) {
  st.s = restored.session;
  if (restored.repaired) {
    try {
      localStorage.setItem(REPAIRED_BACKUP_KEY, raw); // keep the original exactly as it was saved
    } catch {}
  }
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
  return R.logEntries(st.s, R.RULES.checklists.lists, {
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

/* The drug-card rules (lower card, amiodarone gate, child second dose, A5 locks) now live in the
   engine: src/engine/drug-cards.js, with their numbers and wording in src/rules/nz-eas.js. */
