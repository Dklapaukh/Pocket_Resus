// Guard: the live app files are byte-identical to the Phase 1 baseline (docs/baseline/file-hashes.sha256).
// If an OWNER-APPROVED change (A1..A6) is made later, regenerate the hash file in the same commit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ROOT } from './helpers/engines.mjs';
const rows = readFileSync(ROOT + '/docs/baseline/file-hashes.sha256', 'utf8').trim().split('\n').map(l => l.trim().split(/\s+/));
// Stage 2b: index.html and sw.js change ON PURPOSE (page now loads the modules; cache list updated).
// They are covered by tests/modules.test.mjs instead. The original JS files stay in place, unused, until cleanup.
const CHANGED_ON_PURPOSE = new Set(['index.html', 'sw.js']);
for (const [hash, file] of rows.filter(([, f]) => !CHANGED_ON_PURPOSE.has(f))) test(file + ' unchanged', () => { assert.equal(createHash('sha256').update(readFileSync(ROOT + '/' + file)).digest('hex'), hash); });
