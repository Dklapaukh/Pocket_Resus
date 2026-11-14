/* How updates work (read this before changing the file):
   1. INSTALL: the new version downloads every file fresh from the network (skipping the browser's own saved
      copies) into its OWN store. If any single file fails, is not ok or is redirected, the whole install fails,
      the half-built store is thrown away, and the old version carries on with its complete set, untouched.
      Finally the worker checks the downloaded files (and a fresh copy of this sw.js) against the fingerprint in its
      own name, using the same sums as tools/cache-name.mjs. If the web host briefly served an old copy of any
      file during a deploy, the check fails, the install fails the same way, and it is retried on a later visit.
   2. FETCH: every request is answered from this version's own store first, so the app is always one matching
      set of files. Only a file that is not in the store goes to the network, and nothing is ever saved at run time.
   3. ACTIVATE: old resus-pocket- stores are deleted. There is deliberately NO skipWaiting, so a new version only
      takes over when the app is next opened fresh, never while a case is running.
   The name carries a fingerprint of all the files, so a store with this name can only be a leftover of an interrupted
   install of this same version, which is why deleting it at the start of install is safe. After changing any shipped
   file run: node tools/set-cache-name.mjs
   Limit that cannot be fixed from here: the v22 worker already on phones still saves files the old way during
   the one v22 to v23 update visit. The protection applies from v23 onwards. */
const CACHE='resus-pocket-v23-3b87e83d41';
const FILES=['src/app/base.js','src/app/data.js','src/app/events.js','src/app/format.js','src/app/main.js','src/app/session.js','src/app/sheets.js','src/app/state.js','src/app/views.js','src/engine/core.js','src/engine/drug-cards.js','src/engine/index.js','src/engine/log-view.js','src/engine/rhythm-care.js','src/rules/check.js','src/rules/load.js','src/rules/nz-eas.yaml','src/rules/parse.js','src/rules/write.js','src/vendor/js-yaml.mjs','rhythm-care.css','explain-me.css','tutorial/step-01.png','tutorial/step-02.png','tutorial/step-03.png','tutorial/step-04.png','tutorial/step-05.png','tutorial/step-06.png','tutorial/step-07.png','tutorial/step-08.png','tutorial/step-09.png','tutorial/step-10.png','./','index.html','style.css','phone.css','precision.css','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','cpg-cardiac-arrest.pdf','cpg-post-rosc.pdf','cpg-paediatric-equipment.pdf','cpg-preparation-rsi.pdf','cpg-rsi-checklist.pdf','cpg-rsi.pdf','cpg-drugs/eas-14-3.pdf','cpg-drugs/eas-14-4.pdf'];
self.addEventListener('install',e=>e.waitUntil((async()=>{
  await caches.delete(CACHE);const cache=await caches.open(CACHE);
  try{
    const parts=[],text=new TextEncoder();
    for(const path of FILES){const r=await fetch(path,{cache:'reload'});if(!r.ok||r.redirected)throw new Error('Offline asset unavailable');const copy=r.clone();await cache.put(path,r);if(path!=='./')parts.push(text.encode(path+'\n'),new Uint8Array(await copy.arrayBuffer()));}
    const me=await fetch('sw.js',{cache:'reload'});if(!me.ok||me.redirected)throw new Error('Offline asset unavailable');
    parts.push(text.encode((await me.text()).replace(/^const CACHE='[^']*'.*\n?/m,'')));
    const all=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){all.set(p,at);at+=p.length;}
    const hex=[...new Uint8Array(await crypto.subtle.digest('SHA-256',all))].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,10);
    if(!CACHE.endsWith('-'+hex))throw new Error('Downloaded files do not match this version');
  }catch(err){await caches.delete(CACHE);throw err;}
})()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('resus-pocket-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.open(CACHE).then(c=>c.match(e.request,e.request.mode==='navigate'?{ignoreSearch:true}:undefined).then(hit=>hit||fetch(e.request).catch(()=>e.request.mode==='navigate'?c.match('./'):Response.error()))));});
