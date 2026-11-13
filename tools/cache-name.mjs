// Works out the name the offline store in sw.js must have: resus-pocket-<label>-<fingerprint>.
// The fingerprint changes whenever any shipped file (or sw.js itself) changes, so a changed app can never
// reuse an old name by mistake. Used by tools/set-cache-name.mjs and by the tests.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const CACHE_LINE = /^const CACHE='[^']*'.*\n?/m;

export function listedFiles(swText) {
  return [...swText.match(/const FILES=\[(.*?)\];/s)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
}

// readFile(path) returns the bytes of a shipped file; the default reads from disk.
export function computeName(root, label, swText = readFileSync(root + '/sw.js', 'utf8'), readFile = p => readFileSync(root + '/' + p)) {
  const hash = createHash('sha256');
  for (const path of listedFiles(swText)) {
    if (path === './') continue; // the start page is index.html, which is listed separately
    hash.update(path + '\n');
    hash.update(readFile(path));
  }
  hash.update(swText.replace(CACHE_LINE, ''));
  const current = swText.match(/const CACHE='resus-pocket-([^'-]+)/)?.[1];
  return `resus-pocket-${label || current}-${hash.digest('hex').slice(0, 10)}`;
}
