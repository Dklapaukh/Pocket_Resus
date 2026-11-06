// Stage 2b checks for the module layout: the page loads one module, the offline file list is
// complete and correct, and no module uses a name that does not exist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { parse } from 'acorn';
import * as eslintScope from 'eslint-scope';
import { ROOT } from './helpers/engines.mjs';

const html = readFileSync(ROOT + '/index.html', 'utf8');
const sw = readFileSync(ROOT + '/sw.js', 'utf8');
const files = [...sw.match(/const FILES=\[(.*?)\];/s)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);

test('index.html loads exactly one script: the start-up module', () => {
  assert.deepEqual([...html.matchAll(/<script[^>]*>/g)].map(m => m[0]), ['<script type="module" src="src/app/main.js">']);
});
test('sw.js: every offline file exists', () => {
  for (const f of files) if (f !== './') assert.ok(existsSync(ROOT + '/' + f), f + ' missing');
});
test('sw.js: every module and stylesheet the page uses is in the offline list', () => {
  const need = [...readdirSync(ROOT + '/src/app').map(f => 'src/app/' + f), ...readdirSync(ROOT + '/src/engine').map(f => 'src/engine/' + f),
    ...[...html.matchAll(/href="([^"]+\.css)"/g)].map(m => m[1])];
  for (const f of need) assert.ok(files.includes(f), f + ' not cached for offline use');
});
test('sw.js: cache name changed so phones fetch the new files', () => {
  assert.match(sw, /const CACHE='resus-pocket-v18-readable'/);
});
test('every module only uses names that exist (no missing import)', () => {
  const browser = new Set('document window navigator localStorage Date Math Number String Array Object JSON Promise Set Map Intl URL Blob Error Boolean RegExp parseInt parseFloat isNaN isFinite setInterval setTimeout clearTimeout clearInterval console location NodeFilter FormData Event matchMedia undefined NaN Infinity encodeURIComponent decodeURIComponent'.split(' '));
  for (const f of readdirSync(ROOT + '/src/app')) {
    const ast = parse(readFileSync(ROOT + '/src/app/' + f, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module', ranges: true });
    const bad = new Set(eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' }).globalScope.through.map(r => r.identifier.name).filter(n => !browser.has(n)));
    assert.deepEqual([...bad], [], f);
  }
});

test('app modules have no circular imports', () => {
  const names = readdirSync(ROOT + '/src/app').filter(name => name.endsWith('.js'));
  const graph = new Map(names.map(name => {
    const ast = parse(readFileSync(ROOT + '/src/app/' + name, 'utf8'), {
      ecmaVersion: 'latest', sourceType: 'module',
    });
    const dependencies = ast.body
      .filter(node => ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) && node.source)
      .map(node => node.source.value)
      .filter(source => source.startsWith('./'))
      .map(source => source.slice(2));
    return [name, dependencies];
  }));
  const visited = new Set();
  function visit(name, path) {
    assert.ok(!path.includes(name), `circular app imports: ${[...path, name].join(' → ')}`);
    if (visited.has(name)) return;
    for (const dependency of graph.get(name) ?? []) visit(dependency, [...path, name]);
    visited.add(name);
  }
  for (const name of names) visit(name, []);
});
