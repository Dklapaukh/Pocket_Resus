// Doc 07 step 2 (12 Nov 2026): the drug-card rules moved from the app layer (state.js, views.js,
// events.js) into the engine (src/engine/drug-cards.js) and the rules file. The OLD app code is
// copied below exactly as it was, and both are run on the same 3000 random sessions used by the
// side-by-side test. Every answer must match, so the move cannot have changed behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ported as R } from './helpers/engines.mjs';
import { makeActions, apply } from './helpers/fuzz.mjs';

/* ---- Old app-layer code, verbatim apart from taking the session as an argument ---- */
const FLUID_RHYTHMS = ['PEA', 'Asystole', 'Other'];
function oldLatestLowerRhythm(s) {
  const latest = R.active(s)
    .filter((event) => ['shock', 'noshock', 'rhythm', 'rosc'].includes(event.type) && [...FLUID_RHYTHMS, 'VF', 'VT', 'Torsades'].includes(event.rhythm))
    .sort((a, b) => a.at - b.at)
    .at(-1);
  return latest?.rhythm || s.rhythm;
}
function oldCareMode(s) {
  const rhythm = oldLatestLowerRhythm(s);
  if (FLUID_RHYTHMS.includes(rhythm)) return 'fluids';
  return R.hasTorsades(s) ? 'magnesium' : 'amiodarone';
}
function oldDrugDose(s, type) {
  const doseReference = R.dose(s);
  const counts = R.counts(s);
  if (!doseReference) return null;
  if (type === 'adrenaline') return doseReference.adr;
  return counts.amio === 0 ? doseReference.amio1 : doseReference.amio2;
}
function oldChildSecondAmio(s) { const c = R.counts(s); return R.isPaediatric(s) && c.amio === 1 && c.shocks >= 6; }
function oldSecondAmioEarly(s) { const c = R.counts(s); return c.amio === 1 && c.shocks < 6; }
const A5_LOCK_MS = { adrenaline: 210000, magnesium: 5000, fluids: 5000 };
function oldLockLeft(s, type, now) {
  const last = R.supportStats(s, type).last;
  if (!last || !A5_LOCK_MS[type]) return 0;
  const gone = now - last.at;
  return gone >= 0 && gone < A5_LOCK_MS[type] ? A5_LOCK_MS[type] - gone : 0;
}
function oldAmioDue(s) {
  const c = R.counts(s);
  return s.phase === 'Active' && !s.special && !R.hasTorsades(s) && ((c.shocks >= 3 && c.amio === 0) || (c.shocks >= 6 && c.amio === 1));
}
const oldNeedsAdvice = (s) => R.isPaediatric(s) && R.counts(s).amio === 1;
const oldDosesComplete = (s) => R.counts(s).amio >= 2;

function oldAnswers(s, now) {
  const out = {
    latest: oldLatestLowerRhythm(s), card: oldCareMode(s), due: oldAmioDue(s),
    adrDose: oldDrugDose(s, 'adrenaline'), amioDose: oldDrugDose(s, 'amiodarone'),
    childSecond: oldChildSecondAmio(s), early: oldSecondAmioEarly(s), advice: oldNeedsAdvice(s), complete: oldDosesComplete(s),
  };
  for (const type of ['adrenaline', 'magnesium', 'fluids', 'amiodarone']) out['lock_' + type] = oldLockLeft(s, type, now);
  return out;
}
function newAnswers(s, now) {
  const out = {
    latest: R.latestLowerRhythm(s), card: R.lowerCard(s), due: R.amiodaroneDue(s),
    adrDose: R.doseFor(s, 'adrenaline'), amioDose: R.doseFor(s, 'amiodarone'),
    childSecond: R.childSecondAmiodarone(s), early: R.secondAmiodaroneEarly(s), advice: R.childAmiodaroneAdvice(s), complete: R.amiodaroneDosesComplete(s),
  };
  for (const type of ['adrenaline', 'magnesium', 'fluids', 'amiodarone']) out['lock_' + type] = R.lockLeft(s, type, now);
  return out;
}

test('3000 random sessions: the engine drug-card rules give the same answers as the old app code', () => {
  for (let seed = 1; seed <= 3000; seed++) {
    const { acts, T0 } = makeActions(seed);
    let s = R.fresh(T0);
    for (const x of acts) {
      s = apply(R, s, x);
      for (const special of [false, true]) {
        s.special = special;
        // times around every A5 boundary as well as an ordinary moment
        const lasts = ['adrenaline', 'magnesium', 'fluids'].map((t) => R.supportStats(s, t).last?.at).filter(Number.isFinite);
        const moments = [x.now + 7000, ...lasts.flatMap((at) => [at - 1, at, at + 4999, at + 5000, at + 209999, at + 210000])];
        for (const now of moments) assert.deepEqual(newAnswers(s, now), oldAnswers(s, now), 'seed ' + seed + ' at ' + now);
      }
      s.special = false;
    }
  }
});

test('the old app code is gone from the app layer (one copy of each rule, in the engine)', async () => {
  const { readFileSync } = await import('node:fs');
  const { ROOT } = await import('./helpers/engines.mjs');
  const app = ['state.js', 'views.js', 'events.js', 'session.js'].map((f) => readFileSync(ROOT + '/src/app/' + f, 'utf8')).join('\n');
  for (const gone of ['FLUID_RHYTHMS', 'A5_LOCK_MS', 'function careMode', 'function latestLowerRhythm', 'function drugDose', 'c.shocks >= 3', '210000', 'Due after 6 shocks', '500 kg'])
    assert.ok(!app.includes(gone), gone + ' still in the app layer');
});
