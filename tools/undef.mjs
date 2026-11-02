import {parse} from 'acorn'; import * as es from 'eslint-scope'; import {readFileSync,readdirSync} from 'fs';
const OK=new Set('document window navigator localStorage Date Math Number String Array Object JSON Promise Set Map Intl URL Blob Error Boolean RegExp parseInt parseFloat isNaN isFinite setInterval setTimeout clearTimeout clearInterval console location history alert confirm requestAnimationFrame cancelAnimationFrame getComputedStyle CSS Event HTMLElement Node undefined NaN Infinity encodeURIComponent decodeURIComponent structuredClone crypto Notification fetch performance caches AbortController FormData Image ResizeObserver IntersectionObserver MutationObserver matchMedia screen Symbol Reflect Proxy WeakMap'.split(' '));
for(const f of readdirSync('src/app')){const ast=parse(readFileSync('src/app/'+f,'utf8'),{ecmaVersion:'latest',sourceType:'module',ranges:true});
 const sc=es.analyze(ast,{ecmaVersion:2022,sourceType:'module'});const bad=new Set();
 sc.globalScope.through.forEach(r=>{if(!OK.has(r.identifier.name))bad.add(r.identifier.name)});
 console.log(f,[...bad].join(',')||'ok');}
