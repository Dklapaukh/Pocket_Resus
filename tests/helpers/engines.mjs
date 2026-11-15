// Loads the app's engine (src/engine, ES modules) for tests, and fixes randomness and the clock
// so results are repeatable.
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

const { Resus: ported } = await import('../../src/engine/index.js');
export { ported };

// The original app's checklist list, frozen: the generated test cases (tests/helpers/fuzz.mjs, and through it
// the reference recordings) pick checklists from it, so it must never change. It is a plain browser script
// (const ARREST_CHECKLISTS=...): evaluate it to get the data.
export const LISTS = new Function(readFileSync(path.join(ROOT, 'tests/fixtures/original-checklists.js'), 'utf8') + ';return ARREST_CHECKLISTS;')();
