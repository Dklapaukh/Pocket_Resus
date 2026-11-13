// Run this after changing ANY shipped file (code, styles, rules, pictures, PDFs) or sw.js:
//   node tools/set-cache-name.mjs          (keeps the current label, e.g. v23)
//   node tools/set-cache-name.mjs v24      (starts a new label)
// It rewrites the cache name in sw.js so phones know there is a new version. The tests fail until you do.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { computeName } from './cache-name.mjs';

const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const sw = readFileSync(root + '/sw.js', 'utf8');
const name = computeName(root, process.argv[2], sw);
writeFileSync(root + '/sw.js', sw.replace(/const CACHE='[^']*'/, `const CACHE='${name}'`));
console.log('Cache name set to ' + name);
