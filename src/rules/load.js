/* RULES LOADER: gives the engine and the app the rule set (RULES) read from nz-eas.yaml.

   On a phone the file is fetched from the same folder as this module (and comes from the offline copy
   when there is no signal: see sw.js). The tests read it from disk. Either way the same reader
   (parse.js) builds the rule set. If the file cannot be read, one plain message is shown on the page and
   the app does not start. This file holds no clinical numbers or wording. */
import { parseRules, rulesProblemMessage } from './parse.js';

const RULES_URL = new URL('./nz-eas.yaml', import.meta.url);

async function readRulesText() {
  if (typeof document === 'undefined' && globalThis.process?.versions?.node) { // the Node tests
    const moduleName = 'node:fs/promises'; // held in a variable so no phone-side bundle tries to include it
    return (await import(moduleName)).readFile(RULES_URL, 'utf8');
  }
  const response = await fetch(RULES_URL);
  if (!response.ok) throw new Error('the rules file could not be fetched (status ' + response.status + ').');
  return response.text();
}

function showRulesProblem(error) {
  if (typeof document === 'undefined') return;
  const box = document.createElement('div');
  box.id = 'rulesProblem';
  box.setAttribute('role', 'alert');
  box.style.cssText = 'padding:24px 16px;font:18px/1.4 system-ui,sans-serif;color:#7a1010;background:#fff;';
  box.textContent = rulesProblemMessage(error);
  document.body.replaceChildren(box);
}

let loaded;
try {
  loaded = parseRules(await readRulesText());
} catch (error) {
  showRulesProblem(error);
  throw error; // stops every module that needs the rules, so the app does not start
}
export const RULES = loaded;
