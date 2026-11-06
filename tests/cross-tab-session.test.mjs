import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

test('another tab updates the visible session and dismisses an open dialog', () => {
  const app = openApp({ appDir: ROOT });
  const incoming = JSON.parse(app.surfaces().stored);
  incoming.weight = '70';
  incoming.weightSource = 'Entered';
  app.click('[data-action=weight]');
  assert.equal(app.window.document.querySelector('#sheet').open, true);
  app.window.dispatchEvent(new app.window.StorageEvent('storage', {
    key: 'resus-pocket-v1', newValue: JSON.stringify(incoming),
  }));
  assert.equal(app.window.document.querySelector('#sheet').open, false);
  assert.match(app.window.document.querySelector('#headerWeight').textContent, /70 kg/);
  assert.equal(app.window.document.querySelector('#toast').textContent, 'Session updated from another tab');
});

test('malformed or unrelated cross-tab updates do not replace the visible session', () => {
  const app = openApp({ appDir: ROOT });
  const before = app.window.document.querySelector('#headerWeight').textContent;
  for (const [key, value] of [['resus-pocket-v1', '{'], ['other-key', '{}']]) {
    app.window.dispatchEvent(new app.window.StorageEvent('storage', { key, newValue: value }));
  }
  assert.equal(app.window.document.querySelector('#headerWeight').textContent, before);
});
