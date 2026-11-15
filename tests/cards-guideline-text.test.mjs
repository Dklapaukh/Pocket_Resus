// GUIDELINE TEXT EXTRACT (cards plan step C1): src/cards/guideline-text.json, which the card checker compares card
// sentences with, must hold every packaged PDF and match the PDFs as they are now.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extractAll, packagedPdfs, OUTPUT } from '../tools/extract-guideline-text.mjs';
import { pageBody } from '../src/cards/check.js';

const ROOT = new URL('..', import.meta.url);
const saved = readFileSync(new URL(OUTPUT, ROOT), 'utf8');
const hasPdftotext = (() => { try { execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; } })();

test('the extract holds every packaged guideline PDF, and every PDF the app caches offline', () => {
  const extract = JSON.parse(saved);
  assert.deepEqual(Object.keys(extract), packagedPdfs());
  const cached = [...readFileSync(new URL('sw.js', ROOT), 'utf8').matchAll(/'([^']+\.pdf)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(Object.keys(extract), cached);
});

test('every page has the export header and footer the checker removes at a page break', () => {
  for (const [pdf, pages] of Object.entries(JSON.parse(saved))) {
    pages.forEach((text, i) => assert.ok(pageBody(text).length < text.length - 40, pdf + ' page ' + (i + 1)));
  }
});

test('the saved extract matches the PDFs now (re-run tools/extract-guideline-text.mjs if a PDF changed)', { skip: hasPdftotext ? false : 'pdftotext is not installed here' }, () => {
  assert.equal(extractAll(), saved);
});
