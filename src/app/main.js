/* Start-up: first save and draw, timer, service worker, reopen an unfinished rhythm sheet.
   Converted mechanically from the original app files in Stage 2b: logic unchanged;
   shared variables are now st.<name>. */
import './events.js'; // registers every tap/type/submit listener
import {save} from './session.js';
import {render, tick} from './views.js';
import {openRhythm} from './sheets.js';
import {st} from './state.js';

save();

render();

setInterval(tick,250);

if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').then(()=>{}).catch(()=>{});

if(st.s.pendingRhythm)openRhythm(st.s.pendingRhythm.outcome);
