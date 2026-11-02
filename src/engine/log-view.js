/* PORTED UNCHANGED from the original log-view.js (Stage 1). Only the wrapper differs:
   the old global-script wrapper became an ES module. Logic lines are identical;
   tests/engine-fidelity.test.mjs proves it. Do not edit clinical logic here. */
/* Shared log projection: display and text export use the same filters. */
import * as R from './core.js';
const INTERVENTIONS=new Set(['start','rearrest','shock','noshock','rosc','end','adrenaline','amiodarone','magnesium','fluids','medicine','equipment','note']);
function checklistTimes(events,lists){
 const rows=[];
 for(const list of lists){
  const items=new Map();let started=false,complete=false;
  for(const e of events.filter(e=>e.type==='checklist'&&e.key?.startsWith(list.id+':'))){
   const index=Number(e.key.split(':')[1]);if(!Number.isInteger(index)||index<0||index>=list.items.length)continue;
   const boundary=(kind,details)=>rows.push({id:e.id+':'+kind,type:'checklist-summary',title:list.label+' · '+kind,details,at:e.at,synthetic:true,checklistId:list.id});
   if(!started&&e.checked){boundary('started','First item checked');started=true;}
   if(complete&&!e.checked){boundary('started','Reopened for review');complete=false;}
   items.set(index,!!e.checked);
   if(started&&!complete&&list.items.every((_,i)=>items.get(i))){boundary('finished','All '+list.items.length+' items checked');complete=true;}
  }
 }
 return rows;
}
function logEntries(s,lists,{scope='all',checklists='items',includeVoided=true}={}){
 const active=R.active(s).slice().sort((a,b)=>a.at-b.at);
 if(scope==='interventions')return (includeVoided?s.events:active).filter(e=>INTERVENTIONS.has(e.type)||e.type==='cause'&&e.status==='treated').slice().sort((a,b)=>a.at-b.at);
 const events=includeVoided?s.events:active;
 return (checklists==='times'?[...events.filter(e=>e.type!=='checklist'),...checklistTimes(active,lists)]:events.slice()).sort((a,b)=>a.at-b.at);
}
function shockEnergy(s){return String(s.weight).trim()===''?200:R.joules(s.weight);}
export {checklistTimes,logEntries,shockEnergy};
