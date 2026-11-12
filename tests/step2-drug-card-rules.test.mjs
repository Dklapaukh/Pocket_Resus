// Doc 07 step 2 (12 Nov 2026): the drug-card rules moved from the app layer (state.js, views.js,
// events.js) into the engine (src/engine/drug-cards.js) and the rules file. The OLD app code is
// copied below exactly as it was, and both are run on the same 3000 random sessions used by the
// side-by-side test. Every answer must match, so the move cannot have changed behaviour.
//
// A8 (owner-approved 12 Nov 2026; owner agreed to update this test): a rhythm recorded with ROSC
// never decides the lower card. That is the ONE intended difference from the old app code, so:
//   1. the old code stays below word for word, and one small function next to it states A8;
//   2. the engine must equal "old code + A8" on every one of the 3000 sessions (nothing loosened);
//   3. a second test proves the engine differs from the untouched old code ONLY where A8 says:
//      a ROSC rhythm from the fluids list used to bring up the fluids card, and nowhere else.
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
function oldCareMode(s, latestLowerRhythm = oldLatestLowerRhythm) {
  const rhythm = latestLowerRhythm(s);
  if (FLUID_RHYTHMS.includes(rhythm)) return 'fluids';
  return R.hasTorsades(s) ? 'magnesium' : 'amiodarone';
}
/* A8, stated on top of the old rule: look only at rhythm checks and rhythm entries (never ROSC).
   If none of them has a listed rhythm and the most recent rhythm on the record came with ROSC,
   the answer is "Not recorded" (so no card is chosen by a ROSC rhythm); otherwise as before. */
function a8LatestLowerRhythm(s) {
  const withRhythm = R.active(s).filter((event) => event.rhythm).sort((a, b) => a.at - b.at);
  const latest = withRhythm
    .filter((event) => event.type !== 'rosc' && ['shock', 'noshock', 'rhythm'].includes(event.type) && [...FLUID_RHYTHMS, 'VF', 'VT', 'Torsades'].includes(event.rhythm))
    .at(-1);
  if (latest) return latest.rhythm;
  return withRhythm.at(-1)?.type === 'rosc' ? 'Not recorded' : s.rhythm;
}
/* The event that decided the lower card under the OLD rule (used only to explain a difference). */
function oldDecidingEvent(s) {
  return R.active(s)
    .filter((event) => ['shock', 'noshock', 'rhythm', 'rosc'].includes(event.type) && [...FLUID_RHYTHMS, 'VF', 'VT', 'Torsades'].includes(event.rhythm))
    .sort((a, b) => a.at - b.at)
    .at(-1);
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

function oldAnswers(s, now, latestLowerRhythm = oldLatestLowerRhythm) {
  const out = {
    latest: latestLowerRhythm(s), card: oldCareMode(s, latestLowerRhythm), due: oldAmioDue(s),
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

test('3000 random sessions: the engine drug-card rules give the same answers as the old app code plus A8', () => {
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
        for (const now of moments) assert.deepEqual(newAnswers(s, now), oldAnswers(s, now, a8LatestLowerRhythm), 'seed ' + seed + ' at ' + now);
      }
      s.special = false;
    }
  }
});

test('A8 is the only difference from the untouched old app code: a ROSC rhythm used to bring up fluids', () => {
  let differing = 0;
  for (let seed = 1; seed <= 3000; seed++) {
    const { acts, T0 } = makeActions(seed);
    let s = R.fresh(T0);
    for (const x of acts) {
      s = apply(R, s, x);
      for (const special of [false, true]) {
        s.special = special;
        const now = x.now + 7000;
        const engine = newAnswers(s, now);
        const old = oldAnswers(s, now);
        const where = 'seed ' + seed + ' at ' + now;
        // Everything except the lower-card rhythm and the card it picks is untouched by A8.
        assert.deepEqual({ ...engine, latest: 0, card: 0 }, { ...old, latest: 0, card: 0 }, where);
        if (engine.latest === old.latest && engine.card === old.card) continue;
        differing++;
        // A difference is allowed only when the old rule's answer came from a rhythm recorded with ROSC...
        const decider = oldDecidingEvent(s);
        const lastWithRhythm = R.active(s).filter((event) => event.rhythm).sort((a, b) => a.at - b.at).at(-1);
        assert.ok(decider ? decider.type === 'rosc' : lastWithRhythm?.type === 'rosc', where + ': differs but not because of a ROSC rhythm');
        // ...and when the card changes, it is always the fluids card that no longer appears.
        if (engine.card !== old.card) {
          assert.equal(old.card, 'fluids', where);
          assert.ok(FLUID_RHYTHMS.includes(old.latest), where);
        }
      }
      s.special = false;
    }
  }
  assert.ok(differing > 0, 'the random sessions never reach the A8 case, so this test proves nothing');
});

test('the old app code is gone from the app layer (one copy of each rule, in the engine)', async () => {
  const { readFileSync } = await import('node:fs');
  const { ROOT } = await import('./helpers/engines.mjs');
  const app = ['state.js', 'views.js', 'events.js', 'session.js'].map((f) => readFileSync(ROOT + '/src/app/' + f, 'utf8')).join('\n');
  for (const gone of ['FLUID_RHYTHMS', 'A5_LOCK_MS', 'function careMode', 'function latestLowerRhythm', 'function drugDose', 'c.shocks >= 3', '210000', 'Due after 6 shocks', '500 kg'])
    assert.ok(!app.includes(gone), gone + ' still in the app layer');
});
