import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

test('RSI references preserve child, adult rounding and maximum boundaries', () => {
  for (const [weight, expected] of [['40', '80 mg IV'], ['41', '100 mg IV'], ['110', '200 mg IV']]) {
    const app = openApp({ appDir: ROOT });
    app.click('[data-action=weight]');
    app.type('#weightInput', weight);
    app.click('[data-action=save-weight]');
    app.click('[data-tab=guidance]');
    app.click('[data-reference=rsi]');
    const terms = [...app.window.document.querySelectorAll('#sheet dt')];
    const blocker = terms.find(term => term.textContent.includes('Rocuronium'));
    assert.equal(blocker.nextElementSibling.textContent, expected, weight + ' kg');
    assert.equal(JSON.parse(app.window.localStorage.getItem('resus-pocket-v1')).events.filter(event => ['medicine', 'adrenaline', 'amiodarone'].includes(event.type)).length, 0);
  }
});
