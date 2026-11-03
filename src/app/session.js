/* Saving, recording events, drug doses, rhythm choices, screen wake lock.
   Logic is the same as the original app files; shared memory lives in st (see state.js). */
import { $, KEY, R } from './base.js';
import { peaSnippet, render, torsadesSnippet } from './views.js';
import { closeSheet, error, openDrug, openSettings, sheet } from './sheets.js';
import { st } from './state.js';

/* Save the session to the phone. If storage is blocked or full, show the warning banner. */
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(st.s));
    st.storageOK = true;
  } catch {
    st.storageOK = false;
  }
  $('storageError').hidden = st.storageOK;
}

/* Show a short message at the bottom for 4 seconds. */
export function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(st.toastTimeout);
  st.toastTimeout = setTimeout(() => $('toast').classList.remove('show'), 4000);
}

/* The one way to change the session: remember an undo point, make the change (fn), save,
   redraw, and optionally show a message. Every recorded action goes through here. */
export function commit(fn, message) {
  R.snapshot(st.s);
  fn();
  save();
  render();
  if (message) toast(message);
}

/* True once the session has been ended. */
export function finished() {
  return st.s.phase === 'Ended';
}

/* Recording is blocked after the session has ended (the user must undo the end first). */
export function canRecord() {
  if (finished()) {
    toast('Session ended. Undo the end action to continue.');
    return false;
  }
  return true;
}

/* A2c (owner ruling, 3 Nov 2026): which card fills the lower drug slot. Same as the engine's R.careMode except that
   ANY non-shockable rhythm (PEA or Asystole) at the latest check gives fluids. "Other" and "Not recorded" are still
   ignored. VF/VT then bring amiodarone back (or magnesium if torsades was ever recorded). The engine file is untouched. */
export function latestLowerRhythm(s) {
  const latest = R.active(s)
    .filter((e) => ['shock', 'noshock', 'rhythm', 'rosc'].includes(e.type) && ['PEA', 'Asystole', 'VF', 'VT', 'Torsades'].includes(e.rhythm))
    .sort((a, b) => a.at - b.at)
    .at(-1);
  return latest?.rhythm || s.rhythm;
}

export function careMode(s) {
  const rhythm = latestLowerRhythm(s);
  if (rhythm === 'PEA' || rhythm === 'Asystole') return 'fluids';
  return R.hasTorsades(s) ? 'magnesium' : 'amiodarone';
}

/* True if torsades has been recorded (amiodarone is then withheld and magnesium offered). */
export function torsades() {
  return R.hasTorsades(st.s);
}

/* Dose in mg for the drug card: adrenaline, or amiodarone first/second dose. null with no weight. */
export function drugDose(type) {
  const d = R.dose(st.s),
    c = R.counts(st.s);
  return !d ? null : type === 'adrenaline' ? d.adr : c.amio === 0 ? d.amio1 : d.amio2;
}

/* C6b (owner ruling 3 Nov 2026): the child second amiodarone dose has no EAS source, so once a child has had
   one dose and 6 shocks are reached the app shows "Seek clinical advice" instead of a number. */
export function childSecondAmio() {
  const c = R.counts(st.s);
  return R.isPaediatric(st.s) && c.amio === 1 && c.shocks >= 6;
}

/* C6b-2 (owner ruling 3 Nov 2026): the second amiodarone dose is only an option from the 6th shock. True while one
   dose is recorded and fewer than 6 shocks (including earlier shocks) have been counted. */
export function secondAmioEarly() {
  const c = R.counts(st.s);
  return c.amio === 1 && c.shocks < 6;
}

/* Settings toggle: hold or release the screen wake lock (keeps the screen on). */
export async function keepAwake() {
  try {
    if (!('wakeLock' in navigator))
      return toast('Screen wake lock is unavailable in this browser.');
    if (st.wakeLock) {
      await st.wakeLock.release();
      st.wakeLock = null;
    } else {
      st.wakeLock = await navigator.wakeLock.request('screen');
      st.wakeLock.addEventListener('release', () => {
        st.wakeLock = null;
      });
    }
    openSettings();
  } catch {
    toast('Could not keep screen awake. Check device settings.');
  }
}

/* Set the current rhythm to the rhythm on the latest non-voided event. */
export function syncRhythm() {
  const last = R.active(st.s)
    .filter((e) => e.rhythm)
    .sort((a, b) => a.at - b.at)
    .at(-1);
  st.s.rhythm = last?.rhythm || 'Not recorded';
}

/* Re-request the wake lock when the app returns to view, without messages if it fails. */
export async function requestWakeSilently() {
  try {
    if ('wakeLock' in navigator && !st.wakeLock)
      st.wakeLock = await navigator.wakeLock.request('screen');
  } catch {}
}

/* Record the second-line support item for the current rhythm: magnesium (torsades; a repeat
   needs confirming; maximum 2) or open the fluids sheet (PEA). */
export function recordSupport(type, confirmed = false) {
  if (
    !canRecord() ||
    st.s.special ||
    ['ROSC', 'Ended'].includes(st.s.phase) ||
    careMode(st.s) !== type
  )
    return;
  if (type === 'fluids') {
    openDrug('fluids');
    return;
  }
  const ref = R.magnesiumReference(st.s),
    stats = R.supportStats(st.s, type);
  if (ref.dose === null || stats.count >= 2) return;
  if (stats.count && !confirmed) {
    sheet(
      'Repeat magnesium?',
      `${torsadesSnippet()}<p>One dose is already recorded. Record a second dose only if it was given for persistent or recurrent torsades.</p><button class="primary" data-confirm-magnesium>Record repeat ${ref.dose} mmol IV</button><button class="primary" data-close>Back</button>`,
      { kind: 'repeat-magnesium' },
    );
    return;
  }
  commit(
    () =>
      R.add(st.s, 'magnesium', 'Magnesium', ref.dose + ' mmol IV', Date.now(), {
        dose: ref.dose,
        unit: 'mmol',
        route: 'IV',
        weight: st.s.weight,
        weightBasis: ref.basis,
      }),
    'Magnesium recorded · Undo available',
  );
  closeSheet();
}

/* Finish a shock / no-shock / ROSC record with the chosen rhythm and energy. ROSC moves to the
   post-ROSC checklist. Returns true if saved. */
export function saveRhythm(
  outcome,
  rhythm,
  energy,
  at = Date.now(),
  eventId = st.sheetContext?.eventId,
) {
  if (!canRecord()) return false;
  if (
    !(eventId
      ? R.completeOutcome(st.s, eventId, rhythm, energy)
      : outcome === 'rosc' && R.check(st.s, outcome, rhythm, energy, at))
  ) {
    error('Check the recorded energy.');
    return false;
  }
  const rosc = outcome === 'rosc';
  save();
  closeSheet();
  if (rosc) {
    st.tab = 'checks';
    st.checklist = 'postrosc';
    st.checkReturn = 'live';
  }
  render();
  toast(rosc ? 'ROSC recorded · clocks stopped' : 'Rhythm recorded');
  return true;
}

/* A rhythm button was tapped in the rhythm pop-up. Torsades after a shock asks for confirmation
   first; PEA or asystole shows fluid guidance after saving (A2c). */
export function selectRhythm(rhythm) {
  const ctx = st.sheetContext;
  if (ctx?.kind !== 'rhythm') return;
  const energy = $('shockEnergy')?.value || '',
    outcome = ctx.outcome;
  if (rhythm === 'Torsades' && outcome === 'shock') {
    if (energy !== '' && (!Number.isFinite(+energy) || +energy <= 0 || +energy > 1000)) {
      error('Check the recorded energy.');
      return;
    }
    sheet(
      'Confirm Torsades',
      `${torsadesSnippet()}<p>Confirm the observed rhythm to record the delivered shock. This does not record a magnesium administration.</p><button class="primary" data-confirm-torsades>Confirm Torsades</button><button class="primary" data-back-rhythms>Back to rhythms</button>`,
      {
        kind: 'torsades-confirm',
        outcome,
        energy,
        at: Date.now(),
        session: st.s.id,
        eventId: ctx.eventId,
      },
    );
    return;
  }
  if (saveRhythm(outcome, rhythm, energy) && (rhythm === 'PEA' || rhythm === 'Asystole'))
    sheet(
      'Non-shockable rhythm · fluid guidance',
      `${peaSnippet()}<button class="primary" data-close>Continue CPR</button>`,
    );
}
