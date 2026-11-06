import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

test('correcting, voiding and undoing a recorded event preserves its audit trail', () => {
  const app = openApp({ appDir: ROOT });
  app.window.scrollTo = () => {}; // jsdom does not implement window scrolling.
  const saved = () => JSON.parse(app.surfaces().stored);
  app.click('[data-action=note]');
  app.type('#noteForm [name=text]', 'Pads on');
  app.submit('#noteForm');
  const original = saved().events.find(event => event.type === 'note');

  app.click('[data-tab=log]');
  app.click(`[data-edit="${original.id}"]`);
  app.type('#editForm [name=details]', 'Pads checked');
  app.submit('#editForm');
  let event = saved().events.find(entry => entry.id === original.id);
  assert.equal(event.details, 'Pads checked');
  assert.equal(event.audit.length, 1);
  assert.equal(event.audit[0].before.details, 'Pads on');

  app.click(`[data-edit="${original.id}"]`);
  app.click(`[data-void="${original.id}"]`);
  event = saved().events.find(entry => entry.id === original.id);
  assert.equal(event.voided, true);
  assert.equal(event.audit.length, 2);
  assert.equal(event.audit[1].before.details, 'Pads checked');

  app.click('[data-action=settings]');
  app.click('#undo');
  event = saved().events.find(entry => entry.id === original.id);
  assert.ok(!event.voided);
  assert.equal(event.details, 'Pads checked');
  assert.equal(event.audit.length, 1);
});
