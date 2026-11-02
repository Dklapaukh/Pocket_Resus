const R=require('../../core.js');
require('../../rhythm-care.js');
require('../../log-view.js');
const out={};
// weight/dose/energy boundaries
const ws=['','0','0.1','5','5.1','10','10.1','20','30','40','40.1','50','100','500','500.1','abc','4,5','12.34'];
out.boundaries=ws.map(w=>({w,valid:R.validWeight(w),joules:R.joules(w),padsPaed:R.needsPaediatricPads(w),isPaed:R.isPaediatric({weight:w}),dose:R.dose({weight:w}),mag:R.magnesiumReference({weight:w}),fluid:R.fluidReference({weight:w}),shockEnergyDefault:R.shockEnergy({weight:w})}));
out.estimate=[0,0.5,1,2,10,11,12,14,15,'',null].map(a=>({a,est:R.estimate(a)}));
// scripted scenario
const t0=1700000000000;let s=R.fresh(t0);s.weight='70';
R.begin(s,t0);R.add(s,'start','CPR cycle started','Cycle 1',t0);
let now=t0+120000;
console.log('canRhythmCheck@2:00',R.canRhythmCheck(s,now),' @1:59',R.canRhythmCheck(s,now-1000));
const id=R.startOutcome(s,'shock',now);R.completeOutcome(s,id,'VF','200');
for(let i=2;i<=4;i++){now+=120000;const id=R.startOutcome(s,'shock',now);R.completeOutcome(s,id,'VF','200');}
out.counts=R.counts(s);out.careMode=R.careMode(s);
now+=120000;const id2=R.startOutcome(s,'shock',now);R.completeOutcome(s,id2,'Torsades','200');
out.careModeAfterTdP=R.careMode(s);
now+=120000;const id3=R.startOutcome(s,'noshock',now);R.completeOutcome(s,id3,'PEA');
out.careModeAfterPEA=R.careMode(s);
out.undoDepth=s.undo.length;
out.timing=R.timing(s,now+5000);
// ROSC / refresh
R.check(s,'rosc','Sinus rhythm','',now+60000);out.phaseAfterRosc=s.phase;
console.log(JSON.stringify(out.boundaries.map(b=>[b.w,b.valid,b.joules,b.padsPaed,b.dose&&b.dose.adr,b.dose&&b.dose.amio1,b.mag.dose,b.fluid.min,b.fluid.max,b.shockEnergyDefault])));console.log(JSON.stringify(out.estimate));console.log(JSON.stringify({counts:out.counts,care:out.careMode,tdp:out.careModeAfterTdP,pea:out.careModeAfterPEA,undo:out.undoDepth,phase:out.phaseAfterRosc,timing:out.timing}));
const exp=R.logEntries(s,[],{scope:'all',includeVoided:false}).map(e=>e.title+(e.details?' — '+e.details:''));
console.log(exp.join('\n'));
