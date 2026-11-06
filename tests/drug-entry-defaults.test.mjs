import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

test('manual medicine entry keeps its unit and route defaults without recording a dose', () => {
  for (const [type, name, unit, route] of [
    ['adrenaline', 'Adrenaline', 'mg', null],
    ['amiodarone', 'Amiodarone', 'mg', null],
    ['magnesium', 'Magnesium', 'mmol', 'IV'],
    ['fluids', '0.9% sodium chloride', 'mL', 'IV'],
    ['other', '', 'mg', null],
  ]) {
    const app = openApp({ appDir: ROOT });
    const button = app.window.document.createElement('button');
    button.dataset.customDrug = type;
    app.window.document.body.append(button);
    app.click(button);
    const form = app.window.document.querySelector('#drugForm');
    assert.equal(form.querySelector('[name=name]').value, name, type);
    assert.equal(form.querySelector('[name=unit]').value, unit, type);
    assert.equal(form.querySelector('[name=route]:checked')?.value ?? null, route, type);
    assert.equal(form.querySelector('[name=dose]').value, '', type);
    const session = JSON.parse(app.window.localStorage.getItem('resus-pocket-v1'));
    assert.equal(session.events.length, 0, type);
  }
});

test('manual medicine names determine the recorded event type', () => {
  for (const [name, expectedType] of [
    [' AdReNaLiNe ', 'adrenaline'],
    ['Amiodarone', 'amiodarone'],
    ['Magnesium', 'magnesium'],
    ['0.9% sodium chloride', 'fluids'],
    ['Another medicine', 'medicine'],
  ]) {
    const app = openApp({ appDir: ROOT });
    const button = app.window.document.createElement('button');
    button.dataset.customDrug = 'other';
    app.window.document.body.append(button);
    app.click(button);
    app.type('#drugForm [name=name]', name);
    app.type('#drugForm [name=dose]', '1');
    app.check('#drugForm [name=route][value=IV]');
    app.submit('#drugForm');
    const session = JSON.parse(app.window.localStorage.getItem('resus-pocket-v1'));
    assert.equal(session.events.length, 1, name);
    assert.equal(session.events[0].type, expectedType, name);
    assert.equal(session.events[0].dose, 1, name);
  }
});
