/* Standalone arrest engine. Epoch timestamps; no inferred clinical events.
   NZCPG EAS 3.14 and 7.2, packaged exports 24 September 2026. */
(function(root){
const CYCLE=120000, ADR=240000;
function fresh(now=Date.now()){return {version:1,id:'resus-'+now,appStart:now,resusStart:now,end:null,phase:'Ready',deadline:null,remaining:CYCLE,cycle:0,rhythm:'Not recorded',priorShocks:0,priorNoShock:0,priorStreak:0,priorAmio:0,special:false,weight:'',group:'Adult',weightSource:'Entered',age:'',events:[],undo:[],largeText:false};}
function validWeight(w){return /^\d+(\.\d)?$/.test(String(w).trim().replace(',','.'))&&+String(w).replace(',','.')>0&&+String(w).replace(',','.')<=500;}
function estimate(age){const a=Number(age);if(String(age).trim()===''||!Number.isFinite(a)||a<=0||a>14)return null;return a<1?5:Number.isInteger(a)?a<=10?(a+4)*2:a*3:null;}
function isPaediatric(s){return validWeight(s.weight)&&Number(String(s.weight).replace(',','.'))<=40;}
function joules(weight){return validWeight(weight)?Math.min(Math.round(Number(String(weight).replace(',','.'))*40)/10,200):null;}
function needsPaediatricPads(weight){const j=joules(weight);return j!==null&&j<=100;}
function canRhythmCheck(s,now=Date.now()){return s.phase==='Active'&&timing(s,now).left===0;}
function dose(s){
 if(!String(s.weight).trim()||validWeight(s.weight)&&Number(String(s.weight).replace(',','.'))>40)return {adr:1,amio1:300,amio2:150,basis:'Adult dose reference · CPG weight band above 40 kg'};
 if(!validWeight(s.weight))return null;
 const w=Number(String(s.weight).replace(',','.'));
 const b=[5,10,20,30,40].find(n=>w<=n);return {adr:b/100,amio1:b*5,amio2:b*2.5,basis:'Child · '+b+' kg CPG band (rounded up)'};
}
function active(s){return s.events.filter(e=>!e.voided);}
function counts(s){let streak=s.priorStreak;const es=active(s).filter(e=>['shock','noshock'].includes(e.type)).sort((a,b)=>a.at-b.at);for(const e of es)streak=e.type==='shock'?0:streak+1;return {shocks:s.priorShocks+es.filter(e=>e.type==='shock').length,noShock:s.priorNoShock+es.filter(e=>e.type==='noshock').length,streak,amio:s.priorAmio+active(s).filter(e=>e.type==='amiodarone').length};}
function latest(s,type){return active(s).filter(e=>e.type===type).sort((a,b)=>a.at-b.at).at(-1);}
function timing(s,now=Date.now()){const left=s.deadline===null?s.remaining:Math.max(0,s.deadline-now),a=latest(s,'adrenaline'),m=latest(s,'amiodarone');return {left,app:Math.max(0,now-s.appStart),resus:Math.max(0,(s.end??now)-s.resusStart),adr:a?a.at+ADR-now:null,amio:m?now-m.at:null,late:s.deadline!==null&&now>s.deadline?now-s.deadline:0};}
function snapshot(s){const copy=JSON.parse(JSON.stringify(s));delete copy.undo;s.undo.push(copy);s.undo=s.undo.slice(-30);}
function add(s,type,title,details='',now=Date.now(),extra={}){const e={id:globalThis.crypto?.randomUUID?.()||'e-'+now+'-'+Math.random(),type,title,details,at:now,createdAt:Date.now(),...extra};s.events.push(e);return e;}
function begin(s,now){s.phase='Active';s.end=null;s.deadline=now+CYCLE;s.remaining=CYCLE;s.cycle++;}
function check(s,outcome,rhythm,energy='',now=Date.now()){
 const allowed=outcome==='shock'?['VF','VT','Torsades']:outcome==='noshock'?['PEA','Asystole','Other','Unknown']:outcome==='rosc'?['Sinus rhythm','Organised rhythm','AF','Other','Unknown']:[];
 if(!allowed.includes(rhythm)||['ROSC','Ended'].includes(s.phase)||(energy!==''&&(!Number.isFinite(+energy)||+energy<=0||+energy>1000)))return false;
 snapshot(s);s.rhythm=rhythm;add(s,outcome,outcome==='shock'?'Shock delivered':outcome==='noshock'?'No shock · rhythm check':'ROSC',rhythm+(outcome==='shock'?' · '+(energy?energy+' J':'energy not recorded'):''),now,{rhythm,energy});
 if(outcome==='rosc'){s.remaining=timing(s,now).left;s.deadline=null;s.phase='ROSC';s.end=now;}else begin(s,now);return true;
}
function undo(s){const previous=s.undo.pop();if(!previous)return s;return {...previous,undo:s.undo};}
root.Resus={fresh,validWeight,estimate,dose,isPaediatric,joules,needsPaediatricPads,canRhythmCheck,active,counts,latest,timing,snapshot,add,begin,check,undo,CYCLE,ADR};
if(typeof module!=='undefined')module.exports=root.Resus;
})(globalThis);
