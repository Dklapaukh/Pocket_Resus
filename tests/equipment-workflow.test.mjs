import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

test('laryngoscopy offers the selected blade list and can continue to intubation', () => {
  const app = openApp({ appDir: ROOT });
  app.click('[data-action=airway]');
  app.click('[data-equipment=laryngoscopy]');
  const document = app.window.document;
  assert.match(document.querySelector('#bladeChoices').textContent, /Choose video or direct/);
  app.check('#equipmentForm input[name="method"][value="Video"]');
  assert.ok(document.querySelector('#bladeChoices input[value="X blade"]'));
  app.check('#equipmentForm input[name="method"][value="Direct"]');
  assert.ok(document.querySelector('#bladeChoices input[value="Mac 3"]'));
  assert.equal(document.querySelector('#bladeChoices input[value="X blade"]'), null);
  const button = document.querySelector('button[name="followUp"]');
  document.querySelector('#equipmentForm').dispatchEvent(new app.window.SubmitEvent('submit', {
    bubbles: true, cancelable: true, submitter: button,
  }));
  assert.ok(document.querySelector('#equipmentForm input[name="lips"]'));
  const saved = JSON.parse(app.window.localStorage.getItem('resus-pocket-v1'));
  assert.ok(saved.events.some(event => event.type === 'equipment' && event.procedure === 'laryngoscopy'));
});
