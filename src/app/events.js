/* All tap / type / submit listeners. Order of listeners is the same as the original app.
   Converted mechanically from the original app files in Stage 2b: logic unchanged;
   shared variables are now st.<name>. */
import {administration, closeSheet, copyLog, dateValue, download, editEvent, equipmentFeedback, error, exportSheet, exportText, openDrug, openEquipment, openExplainMe, openHistory, openInterventions, openNote, openResusTime, openRhythm, openRhythmCheck, openSettings, openWeight, sheet, toggleField, weightChanged} from './sheets.js';
import {canRecord, commit, drugDose, keepAwake, recordSupport, requestWakeSilently, save, saveRhythm, selectRhythm, syncRhythm, toast, torsades} from './session.js';
import {checkStatus, openCycleLog, referenceSheet, render, tick} from './views.js';
import {$, KEY, R} from './base.js';
import {ARREST_CHECKLISTS, ARREST_EQUIPMENT, CAUSES} from './data.js';
import {fitNote, fitNotes, formatGuidelineReference, local} from './format.js';
import {st} from './state.js';

/* Listeners are registered here, in original order. */
document.addEventListener('click',async e=>{
 const b=e.target.closest('button,a[data-action]');if(!b)return;
 if(b.dataset.action)e.preventDefault();
 if(b.dataset.close!==undefined){closeSheet();return;}
 if(b.id==='undo'){st.s=R.undo(st.s);save();closeSheet();render();toast('Last action undone');return;}
 if(b.dataset.tab){if(b.dataset.tab==='checks'){st.checklist='arrest';st.checkReturn=st.tab==='guidance'?'guidance':'live';}st.tab=b.dataset.tab;render();window.scrollTo(0,0);return;}
 if(b.dataset.outcome){if(canRecord()){const outcome=b.dataset.outcome;if(outcome==='rosc')openRhythm(outcome);else if(R.startOutcome(st.s,outcome)){save();render();openRhythm(outcome);}}return;}
 if(b.dataset.recordRhythm){selectRhythm(b.dataset.recordRhythm);return;}
 if(b.hasAttribute('data-confirm-torsades')){const ctx=st.sheetContext;if(ctx?.kind==='torsades-confirm'&&ctx.session===st.s.id)saveRhythm(ctx.outcome,'Torsades',ctx.energy,ctx.at,ctx.eventId);return;}
 if(b.hasAttribute('data-back-rhythms')){const energy=st.sheetContext?.energy;openRhythm('shock');if($('shockEnergy'))$('shockEnergy').value=energy||'';return;}
 if(b.dataset.support){recordSupport(b.dataset.support);return;}
 if(b.hasAttribute('data-confirm-magnesium')){if(st.sheetContext?.kind==='repeat-magnesium')recordSupport('magnesium',true);return;}

 if(b.dataset.drug){if(!canRecord())return;const type=b.dataset.drug,value=drugDose(type);if(value===null||st.s.special||(type==='amiodarone'&&(torsades()||R.counts(st.s).amio>=2))||st.s.phase==='ROSC')return;commit(()=>R.add(st.s,type,type==='adrenaline'?'Adrenaline':'Amiodarone',value+' mg IV',Date.now(),{dose:value,unit:'mg',route:'IV',weightBasis:R.dose(st.s).basis,weight:st.s.weight,group:st.s.group}),'Recorded '+value+' mg IV · Undo available');return;}
 if(b.dataset.customDrug){if(canRecord())openDrug(b.dataset.customDrug);return;}
 if(b.dataset.drugInfo){administration(b.dataset.drugInfo);return;}
 if(b.dataset.checklist){st.checklist=b.dataset.checklist;render();return;}
 if(b.dataset.equipment){if(canRecord())openEquipment(b.dataset.equipment);return;}
 if(b.dataset.reviewChecklist){st.checklist=b.dataset.reviewChecklist;st.checkReturn='log';st.tab='checks';render();return;}
 if(b.dataset.edit){editEvent(b.dataset.edit);return;}
 if(b.dataset.void){commit(()=>{const ev=st.s.events.find(x=>x.id===b.dataset.void);ev.audit=[...(ev.audit||[]),{at:Date.now(),before:JSON.parse(JSON.stringify({...ev,audit:undefined}))}];ev.voided=!ev.voided;ev.correctedAt=Date.now();syncRhythm();},'Event updated');closeSheet();return;}
 if(b.dataset.key){const input=$('weightInput'),k=b.dataset.key;if(st.sheetContext.replaceWeight&&k!=='⌫')input.value='';st.sheetContext.replaceWeight=false;input.value=k==='⌫'?input.value.slice(0,-1):k==='.'?(input.value.includes('.')?input.value:(input.value||'0')+'.'):(input.value==='0'?'':input.value)+k;weightChanged();return;}
 if(b.dataset.earlier){$('resusStartInput').value=local(st.s.appStart-Number(b.dataset.earlier)*60000);return;}
 const action=b.dataset.action;if(!action)return;
 if(action==='rhythm-check')openRhythmCheck();
 if(action==='arrest-checklist'){st.tab='checks';st.checklist='arrest';render();}
 if(action==='start'){if(!canRecord())return;commit(()=>{const now=Date.now();R.begin(st.s,now);R.add(st.s,'start','CPR cycle started','Cycle '+st.s.cycle,now);},'CPR cycle started');requestWakeSilently();}
 if(action==='rearrest'){if(st.s.phase!=='ROSC')return;commit(()=>{R.begin(st.s,Date.now());R.add(st.s,'rearrest','Re-arrest · CPR restarted');},'Re-arrest recorded');}
 if(action==='postrosc'){closeSheet();st.tab='checks';st.checklist='postrosc';st.checkReturn='live';render();}
 if(action==='previous-shock'&&canRecord())commit(()=>R.addPreAppShock(st.s),'Previous shock added');if(action==='explain-me')openExplainMe();if(action==='weight')openWeight();if(action==='cycle-log')openCycleLog();
 if(action==='resus-time')openResusTime();
 if(action==='settings')openSettings();
 if(action==='large'){st.s.largeText=!st.s.largeText;save();render();openSettings();}
 if(action==='wake')await keepAwake();
 if(action==='history')openHistory();
 if(action==='guidance'){closeSheet();st.tab='guidance';render();}
 if(action==='interventions')openInterventions();if(action==='airway'||action==='access')openInterventions(action);
 if(action==='note'){if(canRecord())openNote();}
 if(action==='estimate'){const w=R.estimate($('ageInput').value);if(w===null)return error('Use an infant age in years or whole years 1–14.');$('weightInput').value=w;$('weightPadPrompt').hidden=!R.needsPaediatricPads(w);st.sheetContext.source='Estimated from age '+$('ageInput').value+' years · CPG 7.2';$('weightBasis').innerHTML=formatGuidelineReference(st.sheetContext.source);}
 if(action==='save-weight'){const w=$('weightInput').value.replace(',','.');if(!R.validWeight(w))return error('Enter weight above zero and no more than 500 kg, with up to one decimal.');const source=st.sheetContext.source,age=$('ageInput').value;commit(()=>{Object.assign(st.s,{weight:String(+w),group:+w<=40?'Child':'Adult',weightSource:source,age});delete st.s.adultConfirmed;R.add(st.s,'weight','Patient weight updated',w+' kg · '+source);},'Weight reference updated');closeSheet();}
 if(action==='save-resus-time'){const at=new Date($('resusStartInput').value).getTime();if(!Number.isFinite(at)||at>st.s.appStart)return error('Resus start must be at or before the app session start.');commit(()=>{const prev=st.s.resusStart;st.s.resusStart=at;R.add(st.s,'resus-time','Resus start corrected',new Date(prev).toISOString()+' → '+new Date(at).toISOString());},'Resus duration updated');closeSheet();}
 if(action==='save-history'){const vals=Object.fromEntries(['priorShocks','priorNoShock','priorStreak','priorAmio'].map(k=>[k,Number($(k).value)]));if(Object.values(vals).some(v=>!Number.isInteger(v)||v<0||v>100)||vals.priorStreak>vals.priorNoShock)return error('Use whole numbers 0–100. Consecutive cycles cannot exceed the prior total.');commit(()=>{Object.assign(st.s,vals);R.add(st.s,'history','Earlier counts updated',vals.priorShocks+' shocks · '+vals.priorNoShock+' no-shock cycles · '+vals.priorAmio+' amiodarone doses');},'Earlier counts saved');closeSheet();}
 if(action==='export')exportSheet();
 if(action==='download-text')download(exportText(),'text/plain','txt');
 if(action==='download-json'){const data={...st.s,undo:undefined,exportedAt:new Date().toISOString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone};download(JSON.stringify(data,null,2),'application/json','json');}
 if(action==='copy')await copyLog();
 if(action==='end')sheet('End resuscitation session?',`<p>This stops the cycle and resus clocks. Your event log is kept.</p><button class="primary danger" data-action="confirm-end">End session now</button><button class="primary" data-close>Keep recording</button>`);
 if(action==='confirm-end'){commit(()=>{const now=Date.now();st.s.remaining=R.timing(st.s,now).left;st.s.phase='Ended';st.s.deadline=null;st.s.end=now;R.add(st.s,'end','Session ended','',now);},'Session ended · log kept');closeSheet();}
 if(action==='new')sheet('Start a new patient?',`<p>The current record will be cleared from this browser. Export it first if you need to keep it.</p><button class="primary" data-action="export">Export current record</button><button class="primary danger" data-action="confirm-new">Clear record & start new patient</button>`);
 if(action==='confirm-new'){const large=st.s.largeText;st.s=R.fresh();st.s.largeText=large;st.tab='live';st.logScope='all';st.checklistDisplay='items';save();closeSheet();render();toast('New patient · clocks started');}
 if(action==='install'){if(st.installPrompt){await st.installPrompt.prompt();st.installPrompt=null;}else sheet('Add to home screen',`<p><b>Android / Chrome:</b> open the browser menu, then choose “Add to Home screen” or “Install app”.</p><p><b>iPhone / Safari:</b> tap Share, then “Add to Home Screen”.</p><p class="caption">Open this site in your phone browser first. Offline files are prepared after the first successful load. Browser or device suspension can delay screen updates; clocks catch up on return. No background alarm is guaranteed.</p>`);}
});


document.addEventListener('input',e=>{if(e.target.id==='weightInput')weightChanged();if(e.target.dataset.size){const type=e.target.dataset.size,unit=document.querySelector('[name=sizeUnit]:checked')?.value||'mm',sizes=ARREST_EQUIPMENT[type].sizes.filter(v=>type!=='npa'||v.endsWith(unit)),value=sizes[+e.target.value];document.querySelector('#equipmentForm [name=size]').value=value;$('sizeRead').textContent=value+(type==='iv'?'G':'');equipmentFeedback(e);}});

document.addEventListener('change',e=>{
 if(e.target.id==='logScope'){st.logScope=e.target.value;render();return;}
 if(e.target.id==='checklistDisplay'){st.checklistDisplay=e.target.value;render();return;}
 if(e.target.dataset.check){const key=e.target.dataset.check,checked=e.target.checked,[id,i]=key.split(':'),list=ARREST_CHECKLISTS.find(c=>c.id===id);commit(()=>{R.add(st.s,'checklist',list.label,(checked?'Checked: ':'Unmarked: ')+list.items[+i],Date.now(),{key,checked});});}
 if(e.target.id==='specialInput'){commit(()=>{st.s.special=e.target.checked;R.add(st.s,'context','Special situation mode',st.s.special?'Routine prompts disabled':'Routine prompts enabled');});}
 if(e.target.name==='sizeUnit'){const sizes=ARREST_EQUIPMENT.npa.sizes.filter(v=>v.endsWith(e.target.value)),range=document.querySelector('[data-size=npa]');range.max=sizes.length-1;range.value=0;document.querySelector('#equipmentForm [name=size]').value='';$('sizeRead').textContent='Not recorded';$('sizeRange').textContent=sizes[0]+' – '+sizes.at(-1);}
});

document.addEventListener('submit',e=>{
 if(!['drugForm','equipmentForm','noteForm','editForm'].includes(e.target.id))return;e.preventDefault();const f=new FormData(e.target),at=dateValue(f);if(at===null)return;
 if(e.target.id==='drugForm'){if(!canRecord())return;const name=f.get('name').trim(),dose=+f.get('dose'),unit=f.get('unit'),route=f.get('route');if(!name||!Number.isFinite(dose)||dose<=0||!route)return error('Enter medicine, actual dose and route.');const type=name.toLowerCase()==='adrenaline'?'adrenaline':name.toLowerCase()==='amiodarone'?'amiodarone':name.toLowerCase()==='magnesium'?'magnesium':name.toLowerCase()==='0.9% sodium chloride'?'fluids':'medicine';commit(()=>R.add(st.s,type,name,dose+' '+unit+' '+route+(f.get('notes')?' · '+f.get('notes'):''),at,{dose,unit,route,notes:f.get('notes')}),'Administration recorded');closeSheet();}
 if(e.target.id==='equipmentForm'){if(!canRecord())return;const type=st.sheetContext.type,data=Object.fromEntries(f);if(data.side&&data.site)data.site=data.side+' '+data.site;const confirmed=f.getAll('confirmation');if(type==='intubation'&&data.size&&(!Number.isFinite(+data.size)||+data.size<=0||+data.size>12))return error('Enter a valid tube size in mm.');const parts=Object.entries(data).filter(([k,v])=>!['at','confirmation','sizeUnit','side'].includes(k)&&v).map(([k,v])=>k+': '+v);if(!data.size)parts.unshift('Size not recorded');if(type==='intubation')parts.push(confirmed.length?'Confirmed with: '+confirmed.join(', '):'Confirmation not recorded');commit(()=>R.add(st.s,'equipment',ARREST_EQUIPMENT[type].name,parts.join(' · '),at,{procedure:type,equipment:{...data,confirmation:confirmed}}),'Intervention recorded');closeSheet();if(type==='laryngoscopy'&&e.submitter?.value==='intubation')openEquipment('intubation');}
 if(e.target.id==='noteForm'){if(!canRecord())return;const text=f.get('text').trim();if(!text)return error('Enter the event or action.');commit(()=>R.add(st.s,'note','Event',text,at,{}),'Event recorded');closeSheet();}
 if(e.target.id==='editForm'){const ev=st.s.events.find(x=>x.id===st.sheetContext.id);if(ev.preApp&&at>=st.s.appStart)return error('Use a time before the app opened.');if(['start','pause','resume','rearrest','end','rosc'].includes(ev.type)&&local(at)!==local(ev.at))return error('State-change times cannot be changed here. Undo and re-record the state change.');const dose=f.has('dose')?+f.get('dose'):null;if(f.has('dose')&&(!Number.isFinite(dose)||dose<=0))return error('Enter a positive actual dose.');commit(()=>{ev.audit=[...(ev.audit||[]),{at:Date.now(),before:JSON.parse(JSON.stringify({...ev,audit:undefined}))}];ev.at=at;ev.details=f.get('details');if(ev.type==='equipment')delete ev.equipment;ev.correctedAt=Date.now();if(ev.preApp){ev.needsReview=false;delete ev.timeUnknown;}if(f.has('rhythm'))ev.rhythm=f.get('rhythm');if(f.has('dose')){ev.dose=dose;ev.unit=f.get('unit');ev.route=f.get('route');ev.details=dose+' '+ev.unit+' '+ev.route+(ev.notes?' · '+ev.notes:'');}if(f.has('energy'))ev.energy=f.get('energy');if(['shock','noshock','rosc','rhythm'].includes(ev.type))ev.details=ev.rhythm+(ev.type==='shock'?' · '+(ev.energy?ev.energy+' J':'energy not recorded'):'');syncRhythm();},'Event corrected');closeSheet();}
});

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){tick();if(st.s.phase==='Active')requestWakeSilently();}});

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();st.installPrompt=e;});

window.addEventListener('storage',e=>{if(e.key!==KEY||!e.newValue)return;try{const incoming=JSON.parse(e.newValue);if(incoming.version===1&&Array.isArray(incoming.events)){st.s=incoming;closeSheet();render();toast('Session updated from another tab');}}catch{}});

$('sheet').addEventListener('cancel',()=>st.sheetContext=null);

document.addEventListener('beforeinput',e=>{
 if(e.target.id!=='weightInput'||st.sheetContext?.kind!=='weight')return;
 if(st.sheetContext.replaceWeight&&e.inputType?.startsWith('insert')){e.target.value='';e.target.setSelectionRange(0,0);}
 st.sheetContext.replaceWeight=false;
});

$('sheet').addEventListener('click',e=>{
 if(e.target!==$('sheet')||!['equipment','interventions'].includes(st.sheetContext?.kind))return;
 const r=$('sheet').getBoundingClientRect();
 if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSheet();
});

document.addEventListener('input',e=>{if(e.target.matches('#sheet textarea'))fitNote(e.target);});

document.addEventListener('toggle',e=>{if(e.target.matches('details.optional-entry')&&e.target.open)fitNotes();},true);

document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.openCheck){st.checklist=b.dataset.openCheck;st.checkReturn='guidance';st.tab='checks';render();window.scrollTo(0,0);}if(b.dataset.reference)referenceSheet(b.dataset.reference);if(b.dataset.causeGuide){const c=CAUSES.find(x=>x.id===b.dataset.causeGuide);sheet(c.name,`<h3>${c.plain}</h3><p>${c.text}</p>`);}if(b.hasAttribute('data-save-age')){const a=Number($('referenceAge').value);if(!Number.isFinite(a)||a<0||a>120)return error('Enter a valid age.');commit(()=>st.s.age=String(a));referenceSheet('tubes');}if(b.dataset.gauge){const slider=document.querySelector('[data-size=iv]');slider.value=b.dataset.gauge;slider.dispatchEvent(new Event('input',{bubbles:true}));} });

document.addEventListener('change',e=>{if(e.target.name==='method'&&st.sheetContext?.type==='laryngoscopy'){const sizes=e.target.value==='Video'?['1','2','3','4','X blade']:['Mac 1','Mac 2','Mac 3','Mac 4','Miller 0','Miller 1','Miller 2'];$('bladeChoices').innerHTML=toggleField('size','Blade',sizes);const row=$('bladeChoices').firstElementChild;row.classList.add('entry-row');row.insertAdjacentHTML('beforeend','<span class="row-confirm" aria-hidden="true">✓</span>');}});
