/* The single object holding what the app remembers while running, plus loading the saved session at start.
   Logic is the same as the original app files; shared memory lives in st (see state.js). */
import { R, KEY, BACKUP_KEY } from './base.js';

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
