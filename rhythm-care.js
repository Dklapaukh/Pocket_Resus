/* NZCPG EAS 3.14 / 14.27 checked 28 October 2026; EAS 7.2 packaged tables.
   Pure, event-derived state: corrections, voids and undo remain authoritative. */
(function(root){
const R=root.Resus||(typeof require==='function'?require('./core.js'):null);
function hasTorsades(s){return s.rhythm==='Torsades'||R.active(s).some(e=>e.rhythm==='Torsades');}
function careMode(s){
 const relevant=R.active(s).filter(e=>['shock','noshock','rhythm','rosc'].includes(e.type)&&['PEA','VF','VT','Torsades'].includes(e.rhythm)).sort((a,b)=>a.at-b.at);
 const rhythm=relevant.at(-1)?.rhythm||s.rhythm;
 if(rhythm==='PEA')return 'fluids';
 return hasTorsades(s)?'magnesium':'amiodarone';
}
function magnesiumReference(s){
 if(!R.validWeight(s.weight))return {dose:null,basis:'Enter weight for a dose reference'};
 if(!R.isPaediatric(s))return {dose:10,basis:'Adult · EAS 3.14 / 14.27'};
 const band=[5,10,20,30,40].find(w=>+s.weight<=w);
 return {dose:({20:4,30:6,40:8})[band]??null,basis:band<=10?'No magnesium dose listed for the '+band+' kg CPG band · seek clinical advice':'Child · '+band+' kg CPG band · EAS 7.2'};
}
function fluidReference(s){
 if(!R.validWeight(s.weight))return {min:null,max:null,basis:'Enter weight for a volume reference'};
 return R.isPaediatric(s)?{min:20*(+s.weight),max:40*(+s.weight),basis:'20–40 mL/kg · EAS 3.14'}:{min:1000,max:2000,basis:'Adult · EAS 3.14'};
}
function supportStats(s,type){const events=R.active(s).filter(e=>e.type===type),last=events.slice().sort((a,b)=>a.at-b.at).at(-1);return {count:events.length,last,total:events.reduce((sum,e)=>sum+(e.unit==='mL'&&Number.isFinite(+e.dose)?+e.dose:0),0)};}
const api={hasTorsades,careMode,magnesiumReference,fluidReference,supportStats};Object.assign(R,api);
if(typeof module!=='undefined')module.exports=api;
})(globalThis);
