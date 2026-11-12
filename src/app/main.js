/* Start-up: save and draw, report recovery, start the timer and service worker,
   and reopen an unfinished rhythm sheet. Shared state lives in st (see state.js). */
import './events.js'; // registers every tap/type/submit listener
import { save } from './session.js';
import { toast } from './format.js';
import { render, tick } from './views.js';
import { openRhythm } from './sheets.js';
import { st } from './state.js';
import { T } from './base.js';

// Write the session to storage, draw the screen, then update the clocks four times a second.
save();

render();

// A6: tell the user when an unreadable saved session was replaced.
if (st.recovery)
  toast(
    T(st.recovery === 'backed-up' ? 'toasts.recoveryBackedUp' : 'toasts.recoveryNotBackedUp'),
  );

setInterval(tick, 250);

// Offline support: sw.js caches the app files (cache name must change whenever files change).
if ('serviceWorker' in navigator)
  navigator.serviceWorker
    .register('sw.js')
    .then(() => {})
    .catch(() => {});

// If the app was closed while the rhythm pop-up was open, reopen it.
if (st.s.pendingRhythm) openRhythm(st.s.pendingRhythm.outcome);
