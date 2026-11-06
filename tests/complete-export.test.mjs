import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

test('complete JSON export retains corrected events and audit but excludes undo snapshots', async () => {
  const app = openApp({ appDir: ROOT });
  app.window.scrollTo = () => {};
  app.click('[data-action=weight]');
  app.type('#weightInput', '70');
  app.click('[data-action=save-weight]');
  app.click('[data-action=note]');
  app.type('#noteForm [name=text]', 'Pads on');
  app.submit('#noteForm');
  const original = JSON.parse(app.surfaces().stored).events.find(event => event.type === 'note');
  app.click('[data-tab=log]');
  app.click(`[data-edit="${original.id}"]`);
  app.type('#editForm [name=details]', 'Pads checked');
  app.submit('#editForm');
  app.select('#logScope', 'interventions');
  assert.doesNotMatch(app.window.document.querySelector('#main').textContent, /Patient weight updated/);

  let exportedBlob;
  app.window.URL.createObjectURL = blob => { exportedBlob = blob; return 'blob:test'; };
  app.window.HTMLAnchorElement.prototype.click = function () {};
  const button = app.window.document.createElement('button');
  button.dataset.action = 'download-json';
  app.window.document.body.append(button);
  app.click(button);
  const json = await new Promise((resolve, reject) => {
    const reader = new app.window.FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(exportedBlob);
  });
  const exported = JSON.parse(json);
  const event = exported.events.find(entry => entry.id === original.id);
  assert.ok(exported.events.some(entry => entry.type === 'weight'));
  assert.equal(event.details, 'Pads checked');
  assert.equal(event.audit[0].before.details, 'Pads on');
  assert.equal(Object.hasOwn(exported, 'undo'), false);
  assert.ok(exported.exportedAt);
  assert.ok(exported.timezone);
});
