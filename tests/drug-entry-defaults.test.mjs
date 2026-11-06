import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

test('manual medicine entry keeps its unit and route defaults without recording a dose', () => {
  for (const [type, unit, route] of [
    ['adrenaline', 'mg', null],
    ['amiodarone', 'mg', null],
    ['magnesium', 'mmol', 'IV'],
    ['fluids', 'mL', 'IV'],
    ['other', 'mg', null],
  ]) {
    const app = openApp({ appDir: ROOT });
    const button = app.window.document.createElement('button');
    button.dataset.customDrug = type;
    app.window.document.body.append(button);
    app.click(button);
    const form = app.window.document.querySelector('#drugForm');
    assert.equal(form.querySelector('[name=unit]').value, unit, type);
    assert.equal(form.querySelector('[name=route]:checked')?.value ?? null, route, type);
    assert.equal(form.querySelector('[name=dose]').value, '', type);
    const session = JSON.parse(app.window.localStorage.getItem('resus-pocket-v1'));
    assert.equal(session.events.length, 0, type);
  }
});
