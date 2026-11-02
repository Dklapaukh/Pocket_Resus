/* Small helpers that turn values into text (escape, clock, time, notes, guideline links).
   Converted mechanically from the original app files in Stage 2b: logic unchanged;
   shared variables are now st.<name>. */
import {$} from './base.js';

export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function clock(ms){const sec=Math.max(0,Math.floor(ms/1000)),h=Math.floor(sec/3600);return (h?h.toString().padStart(2,'0')+':':'')+Math.floor(sec%3600/60).toString().padStart(2,'0')+':'+(sec%60).toString().padStart(2,'0');}

export function countdown(ms){return clock(Math.ceil(Math.max(0,ms)/1000)*1000);}

export function time(at){return new Date(at).toLocaleTimeString('en-NZ',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});}

export function local(at){const d=new Date(at);return new Date(at-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}

export function formatGuidelineReference(value){return esc(value).replace(/\b(EAS|CPG|ANZCOR)(?: guideline)?\s+(\d+\.\d+)/g,(_,issuer,number)=>'<em>'+(issuer==='ANZCOR'?'ANZCOR':'EAS')+' guideline '+number+'</em>');}

export function normalizeGuidelineReferences(root){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];let node;
 while((node=walker.nextNode()))if(!node.parentElement.closest('em,script,style,textarea,code,pre'))nodes.push(node);
 for(const textNode of nodes){
  const text=textNode.nodeValue,re=/\b(EAS|CPG|ANZCOR)(?: guideline)?\s+(\d+\.\d+(?:\s*(?:\/|and|,)\s*\d+\.\d+)*)/g;let m,last=0,fragment=document.createDocumentFragment(),found=false;
  while((m=re.exec(text))){found=true;fragment.append(document.createTextNode(text.slice(last,m.index)));const issuer=m[1]==='ANZCOR'?'ANZCOR':'EAS',parts=m[2].split(/(\s*(?:\/|and|,)\s*)/);
   for(const part of parts){if(/^\d/.test(part)){const em=document.createElement('em');em.textContent=issuer+' guideline '+part;fragment.append(em);}else fragment.append(document.createTextNode(part));}last=re.lastIndex;
  }
  if(found){fragment.append(document.createTextNode(text.slice(last)));textNode.replaceWith(fragment);}
 }
}

export function fitNote(field){if(!field.getClientRects().length)return;field.style.height='auto';field.style.height=field.scrollHeight+2+'px';}

export function fitNotes(){document.querySelectorAll('#sheet textarea').forEach(fitNote);}

export function compactOptionalFields(){
 const root=$('sheet');
 for(const field of root.querySelectorAll('form input[name="at"][type="time"],form [name="notes"]')){
  if(field.closest('#editForm'))continue;
  const label=field.closest('label');if(!label)continue;
  const details=document.createElement('details'),summary=document.createElement('summary'),isTime=field.name==='at';
  details.className='optional-entry '+(isTime?'optional-time':'optional-note');
  const update=()=>summary.textContent=isTime?'Time: '+field.value+' · Edit':field.value.trim()?'Note added · Edit':'+ Add note';
  update();details.append(summary);label.before(details);details.append(label);field.addEventListener('input',update);field.addEventListener('change',update);
 }
}
