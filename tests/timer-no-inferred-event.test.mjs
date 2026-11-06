import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

test('cycle expiry updates the display without recording a rhythm or treatment', () => {
  const app = openApp({ appDir: ROOT });
  app.click('[data-action=start]');
  const before = JSON.parse(app.surfaces().stored).events;
  app.advance(120000);
  const after = JSON.parse(app.surfaces().stored).events;
  assert.deepEqual(after, before);
  assert.equal(app.window.document.querySelector('#cycleCaption').textContent, 'Rhythm check due');
  assert.equal(app.window.document.querySelector('#rhythmCheck').hidden, false);
});

test('adrenaline review status follows the recorded dose and clock without adding events', () => {
  const app = openApp({ appDir: ROOT });
  app.click('[data-action=weight]');
  app.type('#weightInput', '70');
  app.click('[data-action=save-weight]');
  app.click('[data-action=start]');
  const status = () => app.window.document.querySelector('#adrenalineStatus').textContent;
  assert.equal(status(), 'No dose recorded');
  app.click('[data-drug=adrenaline]');
  assert.equal(status(), 'Until 4 min review');
  const recorded = JSON.parse(app.surfaces().stored).events;
  app.advance(240000);
  assert.equal(status(), 'Until 4 min review');
  app.advance(1);
  assert.equal(status(), '4 min elapsed · review');
  assert.deepEqual(JSON.parse(app.surfaces().stored).events, recorded);
});
