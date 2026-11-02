// Regenerates tests/golden/engine.golden.json from the ORIGINAL engine files.
// Only run this on purpose (e.g. after an owner-approved clinical change), never to "make a test pass".
import { writeFileSync } from 'node:fs';
import { original } from '../helpers/engines.mjs';
import { runAll } from '../helpers/scenarios.mjs';
const out = new URL('./engine.golden.json', import.meta.url);
writeFileSync(out, JSON.stringify(runAll(original), null, 1) + '\n');
console.log('wrote', out.pathname);
