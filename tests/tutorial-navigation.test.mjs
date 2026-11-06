import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

test('tutorial navigation follows the visible slide and closes at the end', () => {
  const app = openApp({ appDir: ROOT });
  app.click('[data-action=settings]');
  app.click('[data-action=explain-me]');
  const doc = app.window.document;
  const pages = doc.querySelector('.explain-pages');
  const slides = [...pages.children];
  slides.forEach((slide, index) => Object.defineProperty(slide, 'offsetTop', { value: index * 100 }));
  Object.defineProperty(pages, 'clientHeight', { value: 100 });
  pages.scrollTo = ({ top }) => {
    pages.scrollTop = top;
    pages.dispatchEvent(new app.window.Event('scroll'));
  };

  assert.equal(doc.querySelector('[data-explain-prev]').disabled, true);
  app.click('[data-explain-next]');
  assert.equal(pages.scrollTop, 100);
  assert.equal(doc.querySelector('[data-explain-prev]').disabled, false);
  app.click('[data-explain-prev]');
  assert.equal(pages.scrollTop, 0);
  pages.scrollTo({ top: (slides.length - 1) * 100 });
  assert.equal(doc.querySelector('[data-explain-next]').textContent, 'Done');
  assert.equal(doc.querySelector('.explain-progress').getAttribute('aria-valuenow'), '100');
  app.click('[data-explain-next]');
  assert.equal(doc.querySelector('#sheet').open, false);
});
