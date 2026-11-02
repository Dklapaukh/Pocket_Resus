/* Saving, recording events, drug doses, rhythm choices, screen wake lock.
   Converted mechanically from the original app files in Stage 2b: logic unchanged;
   shared variables are now st.<name>. */
import {$, KEY, R} from './base.js';
import {peaSnippet, render, torsadesSnippet} from './views.js';
import {closeSheet, error, openDrug, openSettings, sheet} from './sheets.js';
import {st} from './state.js';

export function save(){try{localStorage.setItem(KEY,JSON.stringify(st.s));st.storageOK=true;}catch{st.storageOK=false;}$('storageError').hidden=st.storageOK;}

export function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(st.toastTimeout);st.toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),4000);}

export function commit(fn,message){R.snapshot(st.s);fn();save();render();if(message)toast(message);}

export function finished(){return st.s.phase==='Ended';}

export function canRecord(){if(finished()){toast('Session ended. Undo the end action to continue.');return false;}return true;}

export function torsades(){return R.hasTorsades(st.s);}

export function drugDose(type){const d=R.dose(st.s),c=R.counts(st.s);return !d?null:type==='adrenaline'?d.adr:c.amio===0?d.amio1:d.amio2;}

export async function keepAwake(){try{if(!('wakeLock' in navigator))return toast('Screen wake lock is unavailable in this browser.');if(st.wakeLock){await st.wakeLock.release();st.wakeLock=null;}else{st.wakeLock=await navigator.wakeLock.request('screen');st.wakeLock.addEventListener('release',()=>{st.wakeLock=null;});}openSettings();}catch{toast('Could not keep screen awake. Check device settings.');}}

export function syncRhythm(){const last=R.active(st.s).filter(e=>e.rhythm).sort((a,b)=>a.at-b.at).at(-1);st.s.rhythm=last?.rhythm||'Not recorded';}

export async function requestWakeSilently(){try{if('wakeLock' in navigator&&!st.wakeLock)st.wakeLock=await navigator.wakeLock.request('screen');}catch{}}

export function recordSupport(type,confirmed=false){
 if(!canRecord()||st.s.special||['ROSC','Ended'].includes(st.s.phase)||R.careMode(st.s)!==type)return;
 if(type==='fluids'){openDrug('fluids');return;}
 const ref=R.magnesiumReference(st.s),stats=R.supportStats(st.s,type);if(ref.dose===null||stats.count>=2)return;
 if(stats.count&&!confirmed){sheet('Repeat magnesium?',`${torsadesSnippet()}<p>One dose is already recorded. Record a second dose only if it was given for persistent or recurrent torsades.</p><button class="primary" data-confirm-magnesium>Record repeat ${ref.dose} mmol IV</button><button class="primary" data-close>Back</button>`,{kind:'repeat-magnesium'});return;}
 commit(()=>R.add(st.s,'magnesium','Magnesium',ref.dose+' mmol IV',Date.now(),{dose:ref.dose,unit:'mmol',route:'IV',weight:st.s.weight,weightBasis:ref.basis}),'Magnesium recorded · Undo available');closeSheet();
}

export function saveRhythm(outcome,rhythm,energy,at=Date.now(),eventId=st.sheetContext?.eventId){
 if(!canRecord())return false;
 if(!(eventId?R.completeOutcome(st.s,eventId,rhythm,energy):outcome==='rosc'&&R.check(st.s,outcome,rhythm,energy,at))){error('Check the recorded energy.');return false;}
 const rosc=outcome==='rosc';save();closeSheet();if(rosc){st.tab='checks';st.checklist='postrosc';st.checkReturn='live';}render();toast(rosc?'ROSC recorded · clocks stopped':'Rhythm recorded');return true;
}

export function selectRhythm(rhythm){
 const ctx=st.sheetContext;if(ctx?.kind!=='rhythm')return;
 const energy=$('shockEnergy')?.value||'',outcome=ctx.outcome;
 if(rhythm==='Torsades'&&outcome==='shock'){
  if(energy!==''&&(!Number.isFinite(+energy)||+energy<=0||+energy>1000)){error('Check the recorded energy.');return;}
  sheet('Confirm Torsades',`${torsadesSnippet()}<p>Confirm the observed rhythm to record the delivered shock. This does not record a magnesium administration.</p><button class="primary" data-confirm-torsades>Confirm Torsades</button><button class="primary" data-back-rhythms>Back to rhythms</button>`,{kind:'torsades-confirm',outcome,energy,at:Date.now(),session:st.s.id,eventId:ctx.eventId});return;
 }
 if(saveRhythm(outcome,rhythm,energy)&&rhythm==='PEA')sheet('PEA · fluid guidance',`${peaSnippet()}<button class="primary" data-close>Continue CPR</button>`);
}
