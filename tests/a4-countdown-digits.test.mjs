// A4 (owner-approved): bigger countdown digits on shorter screens, without touching "+ Previous shock".
// This file can only check the CSS text (the fake browser used by `npm test` cannot measure real pixels).
// The real-pixel check (digits never overlap "+ Previous shock", the title, ROSC, the buttons or the caption)
// is tools/check-countdown-layout.py, run in a real Chrome; see docs/07 for the last result.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ROOT } from './helpers/engines.mjs';

const MARKER = '\n/* A4 (owner-approved)';
const raw = readFileSync(`${ROOT}/rhythm-care.css`, 'utf8');
const at = raw.indexOf(MARKER);

test('A4: rhythm-care.css is the v16 original plus one appended A4 block', () => {
  assert.ok(at > 0, 'A4 block marker not found');
  const baseline = readFileSync(`${ROOT}/docs/baseline/file-hashes.sha256`, 'utf8')
    .trim().split('\n').map((l) => l.trim().split(/\s+/)).find(([, f]) => f === 'rhythm-care.css')[0];
  assert.equal(createHash('sha256').update(raw.slice(0, at)).digest('hex'), baseline);
  assert.equal(raw.indexOf(MARKER, at + 1), -1, 'only one A4 block expected');
});

const block = raw.slice(at);

test('A4: shock block moves beside the digits on screens up to 700 px tall', () => {
  assert.match(block, /@media\(max-height:700px\)\{/);
  assert.match(block, /#timerPanel \.dial-face\{grid-template-columns:auto minmax\(0,1fr\)/);
  assert.match(block, /#timerPanel \.dial-timing\{padding-top:38px\}/); // keeps the digits clear of the ROSC button
});

test('A4: digit size is set in ONE place and is larger than the old floor on short screens', () => {
  const rules = block.match(/#cycleClock\{font-size:[^}]*\}/g) || [];
  assert.equal(rules.length, 1);
  assert.match(rules[0], /min\(36cqw,max\(24px,calc\(100cqh - 30px\)\),110px\)/);
});

test('A4: room for the Start / Rhythm check button between 621 and 700 px (caption no longer covered)', () => {
  assert.match(block, /@media\(min-height:621px\) and \(max-height:700px\)\{[^}]*padding-bottom:56px/);
});

test('A4: the real-browser overlap check script is in the repo', () => {
  assert.ok(existsSync(`${ROOT}/tools/check-countdown-layout.py`));
});
