// Loads the ORIGINAL engine (root files, old global-script style) and the PORTED engine
// (src/engine, ES modules) so tests can run both. Also fixes randomness and the clock
// so results are repeatable.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXED_NOW = 1700000000000;
let idCounter = 0;
export function resetDeterminism() { idCounter = 0; }
// Event ids come from crypto.randomUUID and createdAt from Date.now: make both repeatable.
Object.defineProperty(globalThis, 'crypto', { value: { randomUUID: () => 'id-' + (++idCounter) }, configurable: true, writable: true });
Date.now = () => FIXED_NOW;

const require = createRequire(import.meta.url);
require(path.join(ROOT, 'core.js'));
require(path.join(ROOT, 'rhythm-care.js'));
require(path.join(ROOT, 'log-view.js'));
export const original = globalThis.Resus; // all three files add to this one object

const { Resus: ported } = await import('../../src/engine/index.js');
export { ported };

// checklists.js is a plain browser script (const ARREST_CHECKLISTS=...): evaluate it to get the data.
export const LISTS = new Function(readFileSync(path.join(ROOT, 'checklists.js'), 'utf8') + ';return ARREST_CHECKLISTS;')();

// A1 (owner-approved 3 Nov 2026): shock energy = 4 J/kg of the CPG weight band. The ORIGINAL files in the
// repo root stay untouched as evidence. Tests that compare old and new engines call this to give the
// original object the A1 energy rule (and nothing else), so every OTHER difference is still caught.
// Only call it in a test file that does not also need the pure original afterwards (each file runs separately).
export function giveOriginalTheA1Energy() {
  original.joules = ported.joules;
  original.needsPaediatricPads = ported.needsPaediatricPads;
}
