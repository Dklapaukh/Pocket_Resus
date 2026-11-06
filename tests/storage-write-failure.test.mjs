import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

test('a failed save shows the warning while the current screen retains the change', () => {
  const app = openApp({ appDir: ROOT });
  const initial = app.surfaces().stored;
  const storage = app.window.Storage.prototype;
  const realSetItem = storage.setItem;
  storage.setItem = function (key, value) {
    if (key === 'resus-pocket-v1') throw new Error('storage unavailable');
    return realSetItem.call(this, key, value);
  };

  app.click('[data-action=weight]');
  app.type('#weightInput', '70');
  app.click('[data-action=save-weight]');
  assert.equal(app.window.document.querySelector('#storageError').hidden, false);
  assert.match(app.window.document.querySelector('#headerWeight').textContent, /70 kg/);
  assert.equal(app.surfaces().stored, initial);
});
