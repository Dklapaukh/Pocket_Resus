// A9 (doc 07 A-table, approved 14 Nov 2026; owner dose rule 3): EAS 7.2 lists no magnesium dose for the 5 and
// 10 kg bands, so for any weight up to 10 kg the magnesium card and its pop-up read "Seek clinical advice"
// and show no number. Before A9 they read "Dose: clinical review", "Review dose" and "Dose requires clinical
// review". Unchanged: the source line, "Other…" still records a dose, 20/30/40 kg = 4/6/8 mmol, adult 10 mmol.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';
import { APPROVED_CHANGES, REMOVED } from './helpers/approved-changes.mjs';
import { readYamlStrict } from '../src/rules/parse.js';
import { RULES as FROZEN_BASELINE } from './baseline/nz-eas-v22-a8.js';

const MIN = 60000;
const ADVICE = 'Seek clinical advice';
const OLD_TEXTS = ['Dose: clinical review', 'Review dose', 'Dose requires clinical review'];

const weight = (a, digits) => { a.click('[data-action=weight]'); for (const k of digits) a.click(`[data-key="${k}"]`); a.click('[data-action=save-weight]'); };
/* Start a case at this weight and record one torsades shock, so the magnesium card fills the lower slot. */
function magnesiumCase(kg) {
  const a = openApp({ appDir: ROOT });
  weight(a, kg); a.click('[data-action=start]');
  a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=shock]');
  a.click('[data-record-rhythm=Torsades]'); a.click('[data-confirm-torsades]');
  return a;
}
const card = (a) => { const m = a.surfaces().main, i = m.indexOf('id="magnesiumCard"'); assert.ok(i >= 0, 'magnesium card shown'); return m.slice(i, m.indexOf('</section>', i)); };
const popup = (a) => { a.click('[data-drug-info=magnesium]'); return a.surfaces().sheet; };

for (const kg of ['3', '5', '7.5', '10']) {
  test(`A9: ${kg} kg: magnesium card and pop-up read "Seek clinical advice", no number`, () => {
    const a = magnesiumCase(kg);
    const h = card(a);
    assert.match(h, new RegExp(`<div class="drug-dose">${ADVICE}</div>`), 'card dose line');
    assert.match(h, new RegExp(`<button class="record" data-support="magnesium" disabled="">${ADVICE}</button>`), 'greyed-out button');
    assert.ok(!/mmol/.test(h), 'no number on the card');
    assert.ok(h.includes('data-custom-drug="magnesium"'), '"Other…" can still record an actual dose');
    const sh = popup(a);
    assert.match(sh, new RegExp(`<b>${ADVICE}</b>`), 'pop-up dose line');
    assert.match(sh, new RegExp(`No magnesium dose listed for the ${Number(kg) <= 5 ? 5 : 10} kg CPG band · seek clinical advice`), 'source line unchanged');
    assert.ok(!/<b>\d[^<]*mmol/.test(sh), 'no number in the pop-up');
    for (const old of OLD_TEXTS) assert.ok(!h.includes(old) && !sh.includes(old), `old text "${old}" gone`);
  });
}

for (const [kg, mmol] of [['10.1', 4], ['20', 4], ['30', 6], ['40', 8], ['70', 10]]) {
  test(`A9: ${kg} kg still shows ${mmol} mmol (unchanged)`, () => {
    const h = card(magnesiumCase(kg));
    assert.match(h, new RegExp(`<div class="drug-dose">${mmol} mmol IV</div>`));
    assert.ok(!h.includes(ADVICE));
  });
}

test('approved changes list: each "after" is in the rules file and each "before" is in a frozen reference copy', () => {
  const file = readYamlStrict(readFileSync(new URL('../src/rules/nz-eas.yaml', import.meta.url), 'utf8'));
  const frozenJson = JSON.parse(readFileSync(new URL('./baseline/nz-eas-before-yaml.json', import.meta.url), 'utf8'));
  const additions = JSON.parse(readFileSync(new URL('./baseline/stage2-additions.json', import.meta.url), 'utf8'));
  const at = (tree, dotted) => dotted.split('.').reduce((node, name) => (node && typeof node === 'object' ? node[name] : undefined), tree);
  assert.ok(APPROVED_CHANGES.length > 0);
  for (const c of APPROVED_CHANGES) {
    assert.equal(at(file, c.path), c.after === REMOVED ? undefined : c.after, `${c.row} ${c.path} in the rules file`);
    assert.equal(at(frozenJson, c.path), c.before, `${c.row} ${c.path} in the frozen JSON copy`);
    const inBaseline = at(FROZEN_BASELINE, c.path);
    assert.ok(inBaseline === c.before || (inBaseline === undefined && additions[c.path] === c.before), `${c.row} ${c.path} in the v22 baseline or the stage 2 additions`);
  }
  assert.deepEqual([...new Set(APPROVED_CHANGES.map((c) => c.row))], ['A9', 'A10'], 'only approved rows (doc 07): add a row here only after the owner approves it');
});
