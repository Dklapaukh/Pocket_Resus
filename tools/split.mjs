// One-off converter (Stage 2b): moves the original global-script code into ES modules WITHOUT
// editing logic. Only mechanical changes: shared variables become st.<name>, top-level names get
// export/import. Run: node tools/split.mjs   (reads the root originals, writes src/app/*.js)
import {parse} from 'acorn'; import * as eslintScope from 'eslint-scope'; import {readFileSync,writeFileSync,mkdirSync} from 'fs';
const FILES=['checklists.js','equipment.js','app.js','guidance.js','explain-me.js'];
const STATE=new Set(['s','tab','checklist','checkReturn','sheetContext','toastTimeout','installPrompt','storageOK','wakeLock','liveCheckIndex','logScope','checklistDisplay']);
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const MOD={ // module -> statements
 base:['app.js#0'],
 state:['app.js#3','app.js#4'],
 data:['checklists.js#0','equipment.js#0','equipment.js#1','app.js#23','app.js#45','app.js#79','app.js#80','explain-me.js#0'],
 format:['app.js#5','app.js#6','app.js#7','app.js#8','app.js#9','app.js#92','app.js#93','app.js#94','app.js#95','app.js#97'],
 session:[...range(10,16),59,61,68,87,88,89].map(i=>'app.js#'+i),
 views:[...range(17,22),...range(24,31),53,81,82,83,84,85,86,90].map(i=>'app.js#'+i).concat(['guidance.js#0','guidance.js#1']),
 sheets:[...range(32,44),...range(46,52),54,55,56,57,58,60,64].map(i=>'app.js#'+i).concat(['explain-me.js#1','explain-me.js#2','explain-me.js#3']),
 events:[62,63,65,66,67,69,70,71,72,77,78,96,98].map(i=>'app.js#'+i).concat(['guidance.js#2','guidance.js#3']),
  skip:['app.js#1','app.js#2'],
 main:['app.js#73','app.js#74','app.js#75','app.js#76','app.js#91'],
};
const modOf={}; for(const [m,ks] of Object.entries(MOD)) ks.forEach(k=>{if(modOf[k])throw k;modOf[k]=m;});
const srcs={},asts={},declMod={}; // declMod: top-level name -> module
for(const f of FILES){srcs[f]=readFileSync(f,'utf8');asts[f]=parse(srcs[f],{ecmaVersion:'latest',ranges:true});
 asts[f].body.forEach((n,i)=>{const k=f+'#'+i;if(!modOf[k])throw new Error('unassigned '+k);
  const names=n.type==='FunctionDeclaration'?[n.id.name]:n.type==='VariableDeclaration'?n.declarations.flatMap(d=>d.id.type==='Identifier'?[d.id.name]:[]):[];
  names.forEach(nm=>{if(!STATE.has(nm))declMod[nm]=modOf[k];});});}
declMod.Resus='engine';
const out={}; Object.keys(MOD).forEach(m=>out[m]={body:[],imports:{},usesSt:false});
function parents(node,p,map){map.set(node,p);for(const k in node){if(k==='type')continue;const v=node[k];if(Array.isArray(v))v.forEach(c=>c&&typeof c.type==='string'&&parents(c,node,map));else if(v&&typeof v.type==='string')parents(v,node,map);}}
for(const f of FILES){const ast=asts[f],src=srcs[f];const pm=new Map();parents(ast,null,pm);
 const sc=eslintScope.analyze(ast,{ecmaVersion:2022,sourceType:'script'});const g=sc.globalScope;
 const refs=[];function walk(s){s.references.forEach(r=>refs.push(r));s.childScopes.forEach(walk);}walk(g);
 ast.body.forEach((n,i)=>{const m=modOf[f+'#'+i];if(m==='state'&&false)return;
  const edits=[];
  for(const r of refs){const id=r.identifier;if(id.start<n.start||id.end>n.end)continue;const nm=id.name;
   const resolvedTop=r.resolved?r.resolved.scope===g:true; if(!resolvedTop)continue;
   if(STATE.has(nm)&&(!r.resolved||r.resolved.scope===g)){
     const par=pm.get(id); if(par.type==='VariableDeclarator'&&par.id===id&&m!=='state')continue;
     if(par.type==='Property'&&par.shorthand)edits.push([id.start,id.end,nm+':st.'+nm]); else edits.push([id.start,id.end,'st.'+nm]); out[m].usesSt=true;
   } else if(declMod[nm]&&declMod[nm]!==m){ (out[m].imports[declMod[nm]]??=new Set()).add(nm); }
  }
  let text=src.slice(n.start,n.end);
  edits.sort((a,b)=>b[0]-a[0]).forEach(([a,b,t])=>{text=text.slice(0,a-n.start)+t+text.slice(b-n.start);});
  if(n.type==='FunctionDeclaration'||(n.type==='VariableDeclaration'&&n.kind==='const'))text='export '+text;
  out[m].body.push(text);});}
// state.js: hand-written declaration of the shared values (original lines 2-3 of app.js)
out.state.body.unshift("/* Everything the app remembers while it runs, in one object (was loose variables). */\nexport const st={logScope:'all',checklistDisplay:'items',s:undefined,tab:'live',checklist:'arrest',checkReturn:'live',sheetContext:null,toastTimeout:undefined,installPrompt:null,storageOK:true,wakeLock:null,liveCheckIndex:0};");
out.state.usesSt=false;
delete out.skip;
mkdirSync('src/app',{recursive:true});
const HEAD={base:'Shortcuts every other module uses: the arrest engine (R), $ (find element by id) and the saved-data key.',state:'The single object holding what the app remembers while running, plus loading the saved session at start.',data:'Fixed lists: checklists, equipment, causes, colours, guideline links, tutorial slides.',format:'Small helpers that turn values into text (escape, clock, time, notes, guideline links).',session:'Saving, recording events, drug doses, rhythm choices, screen wake lock.',views:'Builds the screens (live, causes, checklists, log, guidance) and the 250 ms tick.',sheets:'Pop-up sheets (weight, rhythm, drugs, equipment, notes, edit, export, settings, explain-me).',events:'All tap / type / submit listeners. Order of listeners is the same as the original app.',main:'Start-up: first save and draw, timer, service worker, reopen an unfinished rhythm sheet.'};
for(const [m,o] of Object.entries(out)){let imp='';
 if(o.usesSt||m!=='state'&&false)o.imports.state=new Set([...(o.imports.state||[]),'st']);
 for(const [from,names] of Object.entries(o.imports)){const p=from==='engine'?'../engine/index.js':'./'+from+'.js';imp+=`import {${[...names].sort().join(', ')}} from '${p}';\n`;}
  if(m==='main')imp="import './events.js'; // registers every tap/type/submit listener\n"+imp;
 if(m==='state')imp="import {R, KEY} from './base.js';\n";
 if(m==='base')imp="import {Resus} from '../engine/index.js';\n";
 let body=o.body.join('\n\n');
 if(m==='events')body="/* Listeners are registered here, in original order. */\n"+body;
 writeFileSync(`src/app/${m}.js`,`/* ${HEAD[m]}\n   Converted mechanically from the original app files in Stage 2b: logic unchanged;\n   shared variables are now st.<name>. */\n${imp}\n${body}\n`);}
if(m=>0)console.log('ok');
