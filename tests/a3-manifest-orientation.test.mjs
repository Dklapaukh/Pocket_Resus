// A3 (owner-approved): the installed app is locked to portrait via the web manifest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ROOT } from './helpers/engines.mjs';

const manifest = JSON.parse(readFileSync(`${ROOT}/manifest.webmanifest`, 'utf8'));

test('A3: manifest asks for portrait orientation', () => {
  assert.equal(manifest.orientation, 'portrait');
});

test('A3: the rest of the manifest is unchanged', () => {
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.icons.length, 3);
});

test('A3: manifest is exactly the v16 original plus the one orientation entry', () => {
  const raw = readFileSync(`${ROOT}/manifest.webmanifest`, 'utf8');
  const original = raw.replace(', "orientation": "portrait"', '');
  assert.notEqual(original, raw, 'orientation entry not found in the expected place');
  const baseline = readFileSync(`${ROOT}/docs/baseline/file-hashes.sha256`, 'utf8')
    .trim().split('\n').map((l) => l.trim().split(/\s+/)).find(([, f]) => f === 'manifest.webmanifest')[0];
  assert.equal(createHash('sha256').update(original).digest('hex'), baseline);
});
