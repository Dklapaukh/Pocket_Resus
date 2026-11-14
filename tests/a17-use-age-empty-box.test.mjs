// A17 (doc 07 A-table, approved 14 Nov 2026): in the Tube sizes pop-up (Guidance tab), "Use age" with an empty box,
// a non-number or a negative age saves nothing, and the pop-up shows what applies without it: with no weight and
// no age, A18's line "Enter weight or age to show the paediatric ETT size and length at lips.".
// Before A17: an empty box saved age 0 (infant sizes "3–4 mm"); "abc" and "-1" showed "Enter a valid age.".
// Unchanged: a real age is saved ("0.5" shows the 5 kg band, "3 mm" since A18); above 120 still "Enter a valid age.".
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

const NEITHER = 'Enter weight or age to show the paediatric ETT size and length at lips.';

/* Open the Tube sizes pop-up (optionally after saving an age first), type into the age box and tap "Use age". */
function useAge(typed, { savedAge } = {}) {
  const app = openApp({ appDir: ROOT });
  app.click('[data-tab=guidance]');
  app.click('[data-reference=tubes]');
  if (savedAge !== undefined) { app.type('#referenceAge', savedAge); app.click('[data-save-age]'); }
  app.type('#referenceAge', typed);
  app.click('[data-save-age]');
  const doc = app.window.document, error = doc.getElementById('sheetError');
  const saved = JSON.parse(app.window.localStorage.getItem('resus-pocket-v1') || 'null');
  return {
    lines: [...doc.querySelectorAll('#sheet p')].map((p) => p.textContent),
    error: error && !error.hidden ? error.textContent : '',
    age: saved ? saved.age : '',
    open: doc.getElementById('sheet').hasAttribute('open'),
  };
}

test('A17: an empty box, "abc" or "-1" saves no age and shows the "Enter weight or age" line, with no error', () => {
  for (const typed of ['', '   ', 'abc', '-1']) {
    const got = useAge(typed);
    assert.equal(got.age, '', `"${typed}": no age saved`);
    assert.ok(got.lines.includes(NEITHER), `"${typed}": the "Enter weight or age" line`);
    assert.ok(!got.lines.some((l) => l.startsWith('Cuffed ETT:')), `"${typed}": no tube size`);
    assert.equal(got.error, '', `"${typed}": no error message`);
    assert.ok(got.open, `"${typed}": the pop-up stays open`);
  }
});

test('A17: an empty box keeps an age saved earlier', () => {
  const got = useAge('', { savedAge: '3' });
  assert.equal(got.age, '3');
  assert.ok(got.lines.includes('Cuffed ETT: 4 or 5 mm'), 'age 3 still gives the 20 kg band');
});

test('A17: unchanged: a real age is saved, and an age above 120 is still refused', () => {
  const infant = useAge('0.5');
  assert.equal(infant.age, '0.5');
  assert.ok(infant.lines.includes('Cuffed ETT: 3 mm'), '0.5 years: 5 kg band (A18)');
  const old = useAge('121');
  assert.equal(old.age, '');
  assert.equal(old.error, 'Enter a valid age.');
});
