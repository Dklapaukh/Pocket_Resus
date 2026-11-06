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
