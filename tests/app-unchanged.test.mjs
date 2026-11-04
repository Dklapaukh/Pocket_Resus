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
// A2 (owner-approved): precision.css gained one appended block; tests/a2-amiodarone-card.test.mjs checks it is baseline + that block only.
// A3 (owner-approved): manifest.webmanifest gained `"orientation": "portrait"`; tests/a3-manifest-orientation.test.mjs checks it is baseline + that one line only.
// A4 (owner-approved): rhythm-care.css gained one appended block; tests/a4-countdown-digits.test.mjs checks it is baseline + that block only.
// CSS cleanup step 2 (owner-approved 4 Nov 2026): style.css, phone.css, precision.css and rhythm-care.css lost their unused rules;
// tests/css-cleanup-step2.test.mjs pins their new fingerprints (docs/baseline/css-cleanup-step2-hashes.sha256) and checks no unused CSS is left.
const CHANGED_ON_PURPOSE = new Set(['index.html', 'sw.js', 'precision.css', 'manifest.webmanifest', 'rhythm-care.css', 'style.css', 'phone.css']);
for (const [hash, file] of rows.filter(([, f]) => !CHANGED_ON_PURPOSE.has(f))) test(file + ' unchanged', () => { assert.equal(createHash('sha256').update(readFileSync(ROOT + '/' + file)).digest('hex'), hash); });
