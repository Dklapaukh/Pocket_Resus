/* GUIDELINE TEXT EXTRACT: writes src/cards/guideline-text.json, the text of every packaged guideline PDF,
   page by page, so the card checker (src/cards/check.js) can compare each card sentence with the guideline
   word for word without reading PDFs itself.

   Run after a guideline PDF is added or replaced:   node tools/extract-guideline-text.mjs
   Needs pdftotext (poppler-utils). The output is plain data: { "<pdf file>": ["page 1 text", "page 2 text", ...] }.
   tests/cards-guideline-text.test.mjs re-runs this extraction (where pdftotext is installed) and fails if the
   saved file is out of date. */
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const OUTPUT = 'src/cards/guideline-text.json';

// Every packaged guideline PDF: cpg-*.pdf at the top level and everything in cpg-drugs/.
export function packagedPdfs() {
  const top = readdirSync(ROOT).filter((name) => /^cpg-.*\.pdf$/.test(name));
  const drugs = readdirSync(ROOT + 'cpg-drugs').filter((name) => name.endsWith('.pdf')).map((name) => 'cpg-drugs/' + name);
  return [...top, ...drugs].sort();
}

// Reads one PDF page by page (pdftotext reading order, UTF-8). Returns a list: item 0 is page 1.
function pagesOf(pdf) {
  const info = execFileSync('pdfinfo', [ROOT + pdf], { encoding: 'utf8' });
  const count = Number(/^Pages:\s+(\d+)/m.exec(info)[1]);
  const pages = [];
  for (let page = 1; page <= count; page++) {
    pages.push(execFileSync('pdftotext', ['-enc', 'UTF-8', '-f', String(page), '-l', String(page), ROOT + pdf, '-'], { encoding: 'utf8' }));
  }
  return pages;
}

// Builds the whole extract as the text that would be saved (stable order, ends with a newline).
export function extractAll() {
  const extract = Object.fromEntries(packagedPdfs().map((pdf) => [pdf, pagesOf(pdf)]));
  return JSON.stringify(extract, null, 1) + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(ROOT + OUTPUT, extractAll());
  console.log('Wrote ' + OUTPUT);
}
