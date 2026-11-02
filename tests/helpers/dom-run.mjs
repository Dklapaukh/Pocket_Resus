// Runs every scenario against one app folder and returns an ordered list of captured steps.
import { openApp, sha } from './dom-app.mjs';
import { SCENARIOS } from './dom-scenarios.mjs';

export function runScenarios(opts) {
  const out = {}, problems = [];
  for (const [name, fn] of Object.entries(SCENARIOS)) {
    const steps = [];
    let app = openApp(opts);
    const snap = (label, other) => {
      const a = other || app, surf = a.surfaces();
      steps.push({ label, surf });
    };
    try { fn(app, snap, saved => openApp({ ...opts, savedState: saved })); }
    catch (err) { problems.push(`${name}: ${err.message}`); steps.push({ label: 'SCENARIO STOPPED: ' + err.message, surf: {} }); }
    out[name] = steps;
  }
  return { out, problems };
}
export const toHashes = out => Object.fromEntries(Object.entries(out).map(([n, steps]) =>
  [n, steps.map(s => ({ label: s.label, ...Object.fromEntries(Object.entries(s.surf).map(([k, v]) => [k, sha(v)])) }))]));
