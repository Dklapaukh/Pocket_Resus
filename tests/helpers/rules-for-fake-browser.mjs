// The fake browser (jsdom) runs the app as one bundled script, and such a script cannot "await" the rules
// file the way a phone does. So when the app is bundled for the fake browser, the loader
// (src/rules/load.js) is left out of the bundle, and the fake browser hands the app the rule set instead:
// built from the src/rules/nz-eas.yaml of the app folder being run, with the SAME reader the phone uses
// (src/rules/parse.js). A temporary copy with one planted edit therefore gets its own edited rules.
// Older app copies (the reference commit has no loader) are left exactly as they were.
// The real loader (fetch, offline, error message) is tested by tests/rules-loader.test.mjs.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseRules } from '../../src/rules/parse.js';

// Add to the esbuild options for every fake-browser bundle.
export const rulesBundleOptions = { external: ['*/rules/load.js'] };

// Called by openApp just before the app script runs.
export function giveRulesToWindow(window, appDir) {
  const file = path.join(appDir, 'src/rules/nz-eas.yaml');
  if (!existsSync(file)) return;
  const RULES = parseRules(readFileSync(file, 'utf8'));
  window.require = () => ({ RULES });
}
