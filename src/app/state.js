/* The single object holding what the app remembers while running, plus loading the saved session at start.
   Converted mechanically from the original app files in Stage 2b: logic unchanged;
   shared variables are now st.<name>. */
import {R, KEY} from './base.js';

/* Everything the app remembers while it runs, in one object (was loose variables). */
export const st={logScope:'all',checklistDisplay:'items',s:undefined,tab:'live',checklist:'arrest',checkReturn:'live',sheetContext:null,toastTimeout:undefined,installPrompt:null,storageOK:true,wakeLock:null,liveCheckIndex:0};

try{const saved=JSON.parse(localStorage.getItem(KEY));st.s=saved?.version===1&&Array.isArray(saved.events)&&Number.isFinite(saved.appStart)?saved:R.fresh();}catch{st.s=R.fresh();}

if(st.s.phase==='Active'&&st.s.deadline===null)st.s.deadline=Date.now()+Math.max(0,st.s.remaining);
