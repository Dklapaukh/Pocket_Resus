// Random-but-repeatable action sequences applied to BOTH engines; states must stay identical.
import { LISTS, resetDeterminism } from './engines.mjs';
import { WEIGHTS, derive } from './scenarios.mjs';
const T0 = 1700000000000;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const SHOCK = ['VF', 'VT', 'Torsades', 'PEA', 'Bogus'], NOSH = ['PEA', 'Asystole', 'Other', 'Unknown', 'VF'], ROSC = ['Sinus rhythm', 'AF', 'Other', 'Nope'];
const ENERGY = ['', '', '200', '120', '0', '1000', '1001', 'abc', '-3', '4.5'];
export function makeActions(seed, n = 45) {
  const r = rng(seed), acts = []; let now = T0;
  for (let i = 0; i < n; i++) {
    now += pick(r, [1000, 20000, 60000, 119000, 120000, 130000, 300000]);
    acts.push({ now, k: pick(r, ['begin', 'check', 'check', 'start', 'complete', 'complete', 'adr', 'amio', 'mag', 'fluid', 'note', 'chk', 'weight', 'void', 'edit', 'undo', 'undo', 'preapp', 'prior']), a: r(), b: r(), w: pick(r, WEIGHTS), o: pick(r, ['shock', 'noshock', 'rosc']), rh: pick(r, [...SHOCK, ...NOSH, ...ROSC]), en: pick(r, ENERGY) });
  }
  return { acts, T0 };
}
function apply(R, s, x) {
  const ev = s.events;
  switch (x.k) {
    case 'begin': if (s.phase === 'Ready') { R.begin(s, x.now); R.add(s, 'start', 'CPR cycle started', 'Cycle 1', x.now); } return s;
    case 'check': R.check(s, x.o, x.rh, x.en, x.now); return s;
    case 'start': R.startOutcome(s, x.o, x.now); return s;
    case 'complete': { const target = ev.length ? ev[Math.floor(x.a * ev.length)] : null; R.completeOutcome(s, x.a < 0.6 && s.pendingRhythm ? s.pendingRhythm.id : target?.id, x.rh, x.en); return s; }
    case 'adr': R.add(s, 'adrenaline', 'Adrenaline', '1 mg IV', x.now, { dose: 1, unit: 'mg' }); return s;
    case 'amio': R.add(s, 'amiodarone', 'Amiodarone', '300 mg', x.now, { dose: 300, unit: 'mg' }); return s;
    case 'mag': R.add(s, 'magnesium', 'Magnesium', '', x.now, { dose: 4, unit: 'mmol' }); return s;
    case 'fluid': R.add(s, 'fluids', 'Fluids', '', x.now, { dose: Math.round(x.a * 1000), unit: 'mL' }); return s;
    case 'note': R.add(s, 'note', 'Note', 'text', x.now); return s;
    case 'chk': { const L = LISTS[Math.floor(x.a * LISTS.length)]; R.add(s, 'checklist', L.label, 'x', x.now, { key: L.id + ':' + Math.floor(x.b * (L.items.length + 1)), checked: x.b > 0.3 }); return s; }
    case 'weight': s.weight = x.w; return s;
    case 'void': if (ev.length) { const e = ev[Math.floor(x.a * ev.length)]; e.voided = !e.voided; } return s;
    case 'edit': if (ev.length) ev[Math.floor(x.a * ev.length)].at += Math.round((x.b - 0.5) * 600000); return s;
    case 'undo': return R.undo(s);
    case 'preapp': R.addPreAppShock(s, x.now); return s;
    case 'prior': s.priorShocks = Math.floor(x.a * 4); s.priorNoShock = Math.floor(x.b * 4); s.priorStreak = Math.floor(x.a * 3); s.priorAmio = Math.floor(x.b * 3); return s;
  }
}
// Returns the first difference found, or null.
export function compareEngines(A, B, seed) {
  const { acts, T0: t0 } = makeActions(seed);
  resetDeterminism(); let a = A.fresh(t0); resetDeterminism(); let b = B.fresh(t0);
  for (let i = 0; i < acts.length; i++) {
    const x = acts[i];
    resetDeterminism(); a = apply(A, a, x); resetDeterminism(); b = apply(B, b, x);
    const ja = JSON.stringify([a, derive(A, a, x.now + 7000)]), jb = JSON.stringify([b, derive(B, b, x.now + 7000)]);
    if (ja !== jb) return { seed, step: i, action: x.k };
  }
  return null;
}
