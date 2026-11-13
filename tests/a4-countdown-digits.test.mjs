// A4 (owner-approved): bigger countdown digits on shorter screens, without touching "+ Previous shock".
// This file can only check the CSS text (the fake browser used by `npm test` cannot measure real pixels).
// The real-pixel check (digits never overlap "+ Previous shock", the title, ROSC, the buttons or the caption)
// is tools/check-countdown-layout.py, run in a real Chrome; see docs/07 for the last result.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ROOT } from './helpers/engines.mjs';
import { readYamlStrict } from '../src/rules/parse.js';

const MARKER = '\n/* A4 (owner-approved)';
const raw = readFileSync(`${ROOT}/rhythm-care.css`, 'utf8');
const at = raw.indexOf(MARKER);

test('A4: rhythm-care.css is the v16 original (minus the unused rules removed by CSS cleanup step 2) plus one appended A4 block', () => {
  assert.ok(at > 0, 'A4 block marker not found');
  // fingerprint after CSS cleanup step 2: docs/baseline/css-cleanup-step2-hashes.sha256 (original v16 one stays in file-hashes.sha256)
  const baseline = readFileSync(`${ROOT}/docs/baseline/css-cleanup-step2-hashes.sha256`, 'utf8')
    .trim().split('\n').map((l) => l.trim().split(/\s+/)).find(([, f]) => f === 'rhythm-care.css')[0];
  assert.equal(createHash('sha256').update(raw.slice(0, at)).digest('hex'), baseline);
  assert.equal(raw.indexOf(MARKER, at + 1), -1, 'only one A4 block expected');
});

const block = raw.slice(at);

test('A4d (owner tweak): "shocks" word hidden; "+ Previous shock" is a compact bordered TWO-LINE button BELOW the two rows', () => {
  assert.match(block, /\.dial-shocks>span:last-child\{position:absolute;width:1px;height:1px/); // hidden visually, still read aloud
  assert.match(block, /\.dial-history\{flex-direction:column;align-items:flex-start/); // stacked: title / count / button
  assert.match(block, /\.previous-shock\{font-size:10px;[^}]*border:1px solid/); // compact, with a border
  assert.match(block, /\.ps-plus\{font-size:16px/); // the "+" sits at the left, bigger than the words
  assert.match(block, /\.ps-words\{text-align:center/); // "Previous" over "shock", centred
  assert.doesNotMatch(block, /previous-shock::before/); // the words are real text, not a bare "+"
  assert.doesNotMatch(block, /grid-template-columns/); // digits stay centred under the shock block, not beside it
});

test('A4d: the button reads "+" then "Previous" / "shock" on two lines; accessible name unchanged', () => {
  // Stage 2: the words moved to the rules file (wording.liveScreen); the markup around them is still in views.js.
  const views = readFileSync(`${ROOT}/src/app/views.js`, 'utf8');
  const rules = readYamlStrict(readFileSync(`${ROOT}/src/rules/nz-eas.yaml`, 'utf8')).wording.liveScreen;
  assert.match(views, /aria-label="\$\{T\('liveScreen\.previousShockAria'\)\}"><span class="ps-plus" aria-hidden="true">\+<\/span><span class="ps-words">\$\{T\('liveScreen\.previousShock'\)\}<\/span><\/button>/);
  assert.equal(rules.previousShockAria, 'Add a shock before app start'); // accessible name unchanged
  assert.equal(rules.previousShock, 'Previous<br>shock'); // "Previous" over "shock"
  assert.match(views, /data-action="previous-shock"/); // the tap handler hook is unchanged
});

test('A4: digit size is set in ONE place and is larger than the old floor on short screens', () => {
  const rules = block.match(/#cycleClock\{font-size:[^}]*\}/g) || [];
  assert.equal(rules.length, 1);
  assert.match(rules[0], /min\(36cqw,max\(24px,calc\(100cqh - 24px\)\),110px\)/);
});

test('A4: room for the Start / Rhythm check button between 621 and 700 px (caption no longer covered)', () => {
  assert.match(block, /@media\(min-height:621px\) and \(max-height:700px\)\{[^}]*padding-bottom:56px/);
});

test('A4: the real-browser overlap check script is in the repo', () => {
  assert.ok(existsSync(`${ROOT}/tools/check-countdown-layout.py`));
});
