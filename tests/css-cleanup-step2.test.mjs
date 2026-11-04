// CSS cleanup step 2 (owner-approved 4 Nov 2026): the unused rules (for removed features: live checklist, causes screen,
// timer-top / timer-corner, count-box, weight-joules, pause button, segmented buttons, ring marks, tube strip, site picker ...)
// were deleted from style.css, phone.css, precision.css and rhythm-care.css. The list is in docs/css-cleanup-step2.md.
// This file (1) pins the new fingerprints, and (2) fails if a rule that names a class or id used by NO live screen comes back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ROOT } from './helpers/engines.mjs';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const want = Object.fromEntries(readFileSync(`${ROOT}/docs/baseline/css-cleanup-step2-hashes.sha256`, 'utf8')
  .trim().split('\n').map((l) => l.trim().split(/\s+/)).map(([h, f]) => [f, h]));
const css = (f) => readFileSync(`${ROOT}/${f}`, 'utf8');
// precision.css and rhythm-care.css end with an owner-approved block (A2 / A4); the fingerprint covers what comes before it
const cut = { 'precision.css': '\n/* A2: tile shown', 'rhythm-care.css': '\n/* A4 (owner-approved)' };

for (const f of ['style.css', 'phone.css', 'precision.css', 'rhythm-care.css']) {
  test(`${f}: matches the fingerprint recorded after CSS cleanup step 2`, () => {
    const text = css(f);
    const body = cut[f] ? text.slice(0, text.indexOf(cut[f])) : text;
    assert.ok(!cut[f] || text.indexOf(cut[f]) > 0, 'appended block marker missing');
    assert.equal(sha(body), want[f]);
  });
}

const walk = (d) => readdirSync(d).flatMap((n) => { const p = `${d}/${n}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
const live = [`${ROOT}/index.html`, ...walk(`${ROOT}/src`).filter((f) => f.endsWith('.js'))].map((f) => readFileSync(f, 'utf8')).join('\n');

// every .class and #id named in a selector of the five style sheets must appear somewhere in the live page or modules
// (the old root app.js etc. are deliberately NOT counted: they are dormant code)
const names = (text) => {
  const t = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  for (const m of t.matchAll(/([^{}]+)\{/g)) {
    const sel = m[1].trim();
    if (sel.startsWith('@') || /^(from|to|\d+(\.\d+)?%)([\s,]|$)/.test(sel)) continue;
    for (const n of sel.matchAll(/[.#]([A-Za-z_][\w-]*)/g)) out.push(n[1]);
  }
  return [...new Set(out)];
};
test('no CSS rule names a class or id that no live screen uses', () => {
  const dead = [];
  for (const f of ['style.css', 'phone.css', 'precision.css', 'rhythm-care.css', 'explain-me.css'])
    for (const n of names(css(f))) if (!live.includes(n)) dead.push(`${f}: ${n}`);
  assert.deepEqual(dead, []);
});
test('the checker itself works: it would flag a made-up unused class', () => {
  assert.deepEqual(names('.live-checklist{color:red} @media(max-width:3px){#nothing-here .x{a:b}}'), ['live-checklist', 'nothing-here', 'x']);
  assert.ok(!live.includes('live-checklist'));
});
