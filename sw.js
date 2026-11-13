/* How updates work (read this before changing the file):
   1. INSTALL: the new version downloads every file fresh from the network (skipping the browser's own saved
      copies) into its OWN store. If any single file fails, is not ok or is redirected, the whole install fails,
      the half-built store is thrown away, and the old version carries on with its complete set, untouched.
   2. FETCH: every request is answered from this version's own store first, so the app is always one matching
      set of files. Only a file that is not in the store goes to the network, and nothing is ever saved at run time.
   3. ACTIVATE: old resus-pocket- stores are deleted. There is deliberately NO skipWaiting, so a new version only
      takes over when the app is next opened fresh, never while a case is running.
   The name carries a fingerprint of all the files, so a store with this name can only be a leftover of an interrupted
   install of this same version, which is why deleting it at the start of install is safe. After changing any shipped
   file run: node tools/set-cache-name.mjs
   Limit that cannot be fixed from here: the v22 worker already on phones still saves files the old way during
   the one v22 to v23 update visit. The protection applies from v23 onwards. */
const CACHE='resus-pocket-v23-f6e718a94b';
const FILES=['src/app/base.js','src/app/data.js','src/app/events.js','src/app/format.js','src/app/main.js','src/app/session.js','src/app/sheets.js','src/app/state.js','src/app/views.js','src/engine/core.js','src/engine/drug-cards.js','src/engine/index.js','src/engine/log-view.js','src/engine/rhythm-care.js','src/rules/check.js','src/rules/load.js','src/rules/nz-eas.json','src/rules/parse.js','rhythm-care.css','explain-me.css','tutorial/step-01.png','tutorial/step-02.png','tutorial/step-03.png','tutorial/step-04.png','tutorial/step-05.png','tutorial/step-06.png','tutorial/step-07.png','tutorial/step-08.png','tutorial/step-09.png','tutorial/step-10.png','./','index.html','style.css','phone.css','precision.css','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','cpg-cardiac-arrest.pdf','cpg-post-rosc.pdf','cpg-paediatric-equipment.pdf','cpg-preparation-rsi.pdf','cpg-rsi-checklist.pdf','cpg-rsi.pdf','cpg-drugs/eas-14-3.pdf','cpg-drugs/eas-14-4.pdf'];
self.addEventListener('install',e=>e.waitUntil((async()=>{await caches.delete(CACHE);const cache=await caches.open(CACHE);try{for(const path of FILES){const r=await fetch(path,{cache:'reload'});if(!r.ok||r.redirected)throw new Error('Offline asset unavailable');await cache.put(path,r);}}catch(err){await caches.delete(CACHE);throw err;}})()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('resus-pocket-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.open(CACHE).then(c=>c.match(e.request).then(hit=>hit||fetch(e.request).catch(()=>e.request.mode==='navigate'?c.match('./'):Response.error()))));});
