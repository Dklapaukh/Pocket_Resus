/* The single object holding what the app remembers while running, plus loading the saved session at start.
   Logic is the same as the original app files; shared memory lives in st (see state.js). */
import { R, KEY } from './base.js';

/* Everything the app remembers while it runs, in one object (was loose variables). */
/* st.s is the current patient/session (events, weight, phase, timers). The other fields are
   screen-only memory: current tab, open checklist, the open pop-up's context, wake lock, etc.
   Only st.s is saved to the phone. */
export const st = {
  logScope: 'all',
  checklistDisplay: 'items',
  s: undefined,
  tab: 'live',
  checklist: 'arrest',
  checkReturn: 'live',
  sheetContext: null,
  toastTimeout: undefined,
  installPrompt: null,
  storageOK: true,
  wakeLock: null,
};

/* Start-up: reload the saved session if it looks valid (right version, has an event list and a
   start time); otherwise begin a new one. Unreadable saved data is silently replaced (see backlog A6). */
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  st.s =
    saved?.version === 1 && Array.isArray(saved.events) && Number.isFinite(saved.appStart)
      ? saved
      : R.fresh();
} catch {
  st.s = R.fresh();
}

/* A saved session that was running gets its countdown restarted from the time that was left. */
if (st.s.phase === 'Active' && st.s.deadline === null)
  st.s.deadline = Date.now() + Math.max(0, st.s.remaining);
