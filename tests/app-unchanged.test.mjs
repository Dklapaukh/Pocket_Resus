// Guard: the live app files are byte-identical to the Phase 1 baseline (docs/baseline/file-hashes.sha256).
// If an OWNER-APPROVED change (A1..A6) is made later, regenerate the hash file in the same commit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ROOT } from './helpers/engines.mjs';
const rows = readFileSync(ROOT + '/docs/baseline/file-hashes.sha256', 'utf8').trim().split('\n').map(l => l.trim().split(/\s+/));
for (const [hash, file] of rows) test(file + ' unchanged', () => { assert.equal(createHash('sha256').update(readFileSync(ROOT + '/' + file)).digest('hex'), hash); });
