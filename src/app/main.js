/* Start-up: first save and draw, timer, service worker, reopen an unfinished rhythm sheet.
   Logic is the same as the original app files; shared memory lives in st (see state.js). */
import './events.js'; // registers every tap/type/submit listener
import { save } from './session.js';
import { render, tick } from './views.js';
import { openRhythm } from './sheets.js';
import { st } from './state.js';

// Write the session to storage, draw the screen, then update the clocks four times a second.
save();

render();

setInterval(tick, 250);

// Offline support: sw.js caches the app files (cache name must change whenever files change).
if ('serviceWorker' in navigator)
  navigator.serviceWorker
    .register('sw.js')
    .then(() => {})
    .catch(() => {});

// If the app was closed while the rhythm pop-up was open, reopen it.
if (st.s.pendingRhythm) openRhythm(st.s.pendingRhythm.outcome);
