// Step 3a safety net (doc 18, sub-step 0). Drives the real app through every screen and pop-up that
// shows a clinical number or guideline text, across a range of weights and ages, so that moving the
// numbers and wording into the rules file can be proved to change nothing on screen.
// The golden file (tests/golden/step3a-v21-output.json) was recorded from v21 (commit 97db27d).
import path from 'node:path';
import vm from 'node:vm';
import { buildSync } from 'esbuild';
import { openApp } from './dom-app.mjs';
import { toHashes } from './dom-run.mjs';

const MIN = 60000;
export const WEIGHTS = ['', '3', '5', '15', '25', '42', '80', '600']; // '' = none; 600 = invalid (rejected)
export const TUBE_AGES = ['', '0', '0.5', '1', '7', '10.5', '14', '15', '120'];
export const ESTIMATE_AGES = ['0.5', '1', '2.5', '7', '10', '11', '14', '15', 'abc'];

const keypad = (a, digits) => { a.click('[data-action=weight]'); for (const k of digits) a.click(`[data-key="${k}"]`); a.click('[data-action=save-weight]'); };
const close = (a) => { if (a.window.document.getElementById('sheet').hasAttribute('open')) a.click('[data-close]'); };
const shock = (a, rhythm, snap, label) => {
  a.click('[data-action=rhythm-check]'); a.click('[data-outcome=shock]');
  if (snap) snap(label);
  a.click(`[data-record-rhythm=${rhythm}]`);
  if (rhythm === 'Torsades') a.click('[data-confirm-torsades]');
};

const has = (a, sel) => { const b = a.window.document.querySelector(sel); return b && !b.disabled; };

function weightScenario(w) {
  return (a, snap) => {
    if (w) { keypad(a, w); snap('weight entered'); close(a); }
    a.click('[data-action=weight]'); snap('weight sheet'); close(a);
    a.click('[data-drug-info=adrenaline]'); snap('adrenaline info'); close(a);
    a.click('[data-tab=guidance]'); snap('guidance tab');
    a.click('[data-reference=rsi]'); snap('RSI sheet'); close(a);
    a.window.__step3a.guidance(); snap('Guidance & sources pop-up'); close(a);
    a.click('[data-tab=live]');
    a.click('[data-action=start]'); snap('started');
    if (has(a, '[data-drug=adrenaline]')) { a.click('[data-drug=adrenaline]'); snap('adrenaline recorded'); }
    for (let i = 1; i <= 3; i++) { a.advance(2 * MIN); shock(a, 'VF', i === 1 ? snap : null, 'shock sheet'); }
    snap('3 shocks (adrenaline overdue)'); a.click('[data-drug-info=amiodarone]'); snap('amiodarone info'); close(a);
    a.click('[data-drug=amiodarone]'); snap('amiodarone recorded'); close(a);
    a.advance(30000); snap('amiodarone status');
    a.advance(2 * MIN); shock(a, 'VF'); snap('4 shocks');
    if (has(a, '[data-select-dose]')) { a.click('[data-select-dose]'); snap('select dose sheet'); close(a); }
    a.advance(2 * MIN);
    a.click('[data-action=rhythm-check]'); a.click('[data-outcome=shock]'); a.click('[data-record-rhythm=Torsades]'); snap('confirm torsades');
    a.click('[data-confirm-torsades]'); snap('torsades'); close(a);
    a.click('[data-drug-info=magnesium]'); snap('magnesium info'); close(a);
    if (has(a, '[data-support=magnesium]')) {
      a.click('[data-support=magnesium]'); snap('magnesium recorded'); close(a);
      a.advance(10000); a.click('[data-support=magnesium]'); snap('repeat magnesium sheet');
      a.click('[data-confirm-magnesium]'); snap('magnesium repeated'); close(a);
    }
    a.window.__step3a.openDrug('amiodarone'); snap('amiodarone form after torsades'); close(a);
    a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=noshock]'); snap('no-shock sheet');
    a.click('[data-record-rhythm="PEA"]'); snap('PEA pop-up'); close(a);
    snap('fluids card');
    a.click('[data-drug-info=fluids]'); snap('fluids info'); close(a);
    a.click('[data-support=fluids]'); snap('fluids form'); a.type('#drugForm [name=dose]', '300'); a.submit('#drugForm'); snap('fluids recorded'); close(a);
    a.click('[data-tab=log]'); snap('log');
    const edit = [...a.window.document.querySelectorAll('[data-edit]')]
      .find((b) => /^Edit Shock/.test(b.getAttribute('aria-label') || ''));
    if (edit) { a.click(edit); snap('edit shock'); close(a); }
    a.click('[data-tab=live]'); a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=rosc]'); snap('ROSC sheet');
  };
}

function ageScenario() {
  return (a, snap) => {
    a.click('[data-tab=guidance]');
    for (const age of TUBE_AGES) {
      a.click('[data-reference=tubes]');
      if (age !== '') { a.type('#referenceAge', age); a.click('[data-save-age]'); }
      snap(`tube sheet age "${age}"`); close(a);
    }
    a.click('[data-tab=live]');
    for (const age of ESTIMATE_AGES) {
      a.click('[data-action=weight]'); a.type('#ageInput', age); a.click('[data-action=estimate]');
      snap(`age estimate "${age}"`); close(a);
    }
  };
}

function listsScenario() {
  return (a, snap) => {
    a.click('[data-tab=guidance]');
    for (const b of [...a.window.document.querySelectorAll('[data-open-check]')].map((x) => x.dataset.openCheck)) {
      a.click(`[data-open-check="${b}"]`); snap(`checklist ${b}`); a.click('[data-tab=guidance]');
    }
    for (const c of [...a.window.document.querySelectorAll('[data-cause-guide]')].map((x) => x.dataset.causeGuide)) {
      a.click(`[data-cause-guide="${c}"]`); snap(`cause ${c}`); close(a);
    }
    a.click('[data-tab=live]'); a.click('[data-action=start]');
    a.click('[data-action=interventions]'); snap('interventions');
    const types = [...a.window.document.querySelectorAll('[data-equipment]')].map((x) => x.dataset.equipment); close(a);
    for (const t of types) {
      a.click('[data-action=interventions]'); a.click(`[data-equipment="${t}"]`); snap(`equipment ${t}`);
      if (t === 'laryngoscopy') for (const m of ['Video', 'Direct']) { a.click(`input[name=method][value=${m}]`); a.window.document.querySelector(`input[name=method][value=${m}]`).dispatchEvent(new a.window.Event('change', { bubbles: true })); snap(`laryngoscopy ${m}`); }
      close(a);
    }
    a.click('[data-action=settings]'); snap('settings'); close(a);
  };
}

export const SCENARIOS = {
  ...Object.fromEntries(WEIGHTS.map((w) => [`weight "${w}"`, weightScenario(w)])),
  ages: ageScenario(),
  'checklists, causes, equipment': listsScenario(),
};

// Bundles the app plus a test hook for the Guidance & sources pop-up (not reachable from any button in v21).
const ENTRY = path.join(path.dirname(new URL(import.meta.url).pathname), 'step3a-entry.mjs');
function loader(w, dir, srcs, dom) {
  w.scrollTo = () => {};
  const code = buildSync({ entryPoints: [ENTRY], bundle: true, format: 'iife', write: false, banner: { js: '"use strict";' },
  }).outputFiles[0].text;
  new vm.Script(code, { filename: 'step3a-bundle.js' }).runInContext(dom.getInternalVMContext());
}

export function runAll(appDir) {
  const out = {}, problems = [];
  for (const [name, fn] of Object.entries(SCENARIOS)) {
    const steps = [], app = openApp({ appDir, scriptLoader: loader });
    try { fn(app, (label) => steps.push({ label, surf: app.surfaces() })); }
    catch (err) { problems.push(`${name}: ${err.message}`); }
    out[name] = steps;
  }
  return { out, problems, hashes: toHashes(out) };
}
