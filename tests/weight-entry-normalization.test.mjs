import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

test('normal weight entry saves a decimal comma as a numeric decimal point', () => {
  const app = openApp({ appDir: ROOT });
  app.click('[data-action=weight]');
  app.type('#weightInput', '15,5');
  app.click('[data-action=save-weight]');
  const session = JSON.parse(app.surfaces().stored);
  assert.equal(session.weight, '15.5');
  assert.equal(session.events.filter(event => event.type === 'weight').length, 1);
  assert.equal(session.events.filter(event => ['adrenaline', 'amiodarone', 'magnesium', 'fluids'].includes(event.type)).length, 0);
});
