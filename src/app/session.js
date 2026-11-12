/* Saving, recording events, drug doses, rhythm choices, screen wake lock.
   The rebuild preserved the original behaviour first; later approved changes are marked below.
   Shared screen and session state lives in st (see state.js). */
import { $, KEY, R, T } from './base.js';
import { render } from './views.js';
import { closeSheet, error, openDrug, openSettings, peaSnippet, sheet, torsadesSnippet } from './sheets.js';
import { finished, st } from './state.js';
import { toast } from './format.js';

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

/* Commit a change with an undo point, save, redraw and optional message.
   Some workflows (including starting a rhythm outcome) use their own engine
   snapshot and persistence path; do not assume every event goes through here. */
export function commit(fn, message) {
  R.snapshot(st.s);
  fn();
  save();
  render();
  if (message) toast(message);
}

/* Recording is blocked after the session has ended (the user must undo the end first). */
export function canRecord() {
  if (finished()) {
    toast(T('toasts.sessionEndedUndo'));
    return false;
  }
  return true;
}

/* Settings toggle: hold or release the screen wake lock (keeps the screen on). */
export async function keepAwake() {
  try {
    if (!('wakeLock' in navigator))
      return toast(T('toasts.wakeLockUnavailable'));
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
    toast(T('toasts.keepAwakeFailed'));
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
   needs confirming; maximum 2) or open the fluids sheet (PEA, Asystole or Other). */
export function recordSupport(type, confirmed = false) {
  if (
    !canRecord() ||
    st.s.special ||
    ['ROSC', 'Ended'].includes(st.s.phase) ||
    R.lowerCard(st.s) !== type ||
    R.lockLeft(st.s, type) > 0 // A5: no repeat within 5 s
  )
    return;
  if (type === 'fluids') {
    openDrug('fluids');
    return;
  }
  const ref = R.magnesiumReference(st.s),
    stats = R.supportStats(st.s, type);
  if (ref.dose === null || stats.count >= R.RULES.numbers.magnesium.maxDoses) return;
  if (stats.count && !confirmed) {
    sheet(
      T('magnesiumRepeatSheet.title'),
      `${torsadesSnippet()}<p>${R.guideText('repeatMagnesium')}</p>` +
      `<button class="primary" data-confirm-magnesium>${T('magnesiumRepeatSheet.recordButton', { dose: ref.dose })}</button>` +
      `<button class="primary" data-close>${T('magnesiumRepeatSheet.backButton')}</button>`,
      { kind: 'repeat-magnesium' },
    );
    return;
  }
  commit(
    () =>
      R.add(st.s, 'magnesium', T('drugNames.magnesium'), T('liveCards.doseMmolIv', { dose: ref.dose }), Date.now(), {
        dose: ref.dose,
        unit: 'mmol',
        route: 'IV',
        weight: st.s.weight,
        weightBasis: ref.basis,
      }),
    T('toasts.magnesiumRecorded'),
  );
  closeSheet();
}

/* Finish a shock / no-shock / ROSC record with the chosen rhythm and energy. ROSC moves to the
   post-ROSC checklist. True means the engine accepted it; save() separately reports storage failure. */
export function saveRhythm(
  outcome,
  rhythm,
  energy,
  at = Date.now(),
  eventId = st.sheetContext?.eventId,
) {
  if (!canRecord()) return false;
  // Shock/no-shock outcomes already have a pending event. Unexpected ROSC
  // has no pending event, so the engine records it in one step instead.
  const accepted = eventId
    ? R.completeOutcome(st.s, eventId, rhythm, energy)
    : outcome === 'rosc' && R.check(st.s, outcome, rhythm, energy, at);
  if (!accepted) {
    error(T('errors.energy'));
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
  toast(T(rosc ? 'toasts.roscRecorded' : 'toasts.rhythmRecorded'));
  return true;
}

/* A rhythm button was tapped in the rhythm pop-up. Torsades after a shock asks for confirmation
   first; PEA, asystole or Other at a no-shock check shows fluid guidance after saving (A2c, A7, A8). */
export function selectRhythm(rhythm) {
  const ctx = st.sheetContext;
  if (ctx?.kind !== 'rhythm') return;
  const energy = $('shockEnergy')?.value || '',
    outcome = ctx.outcome;
  if (rhythm === 'Torsades' && outcome === 'shock') {
    if (R.invalidEnergy(energy)) {
      error(T('errors.energy'));
      return;
    }
    sheet(
      T('torsadesConfirmSheet.title'),
      `${torsadesSnippet()}<p>${R.guideText('confirmTorsades')}</p>` +
      `<button class="primary" data-confirm-torsades>${T('torsadesConfirmSheet.confirmButton')}</button>` +
      `<button class="primary" data-back-rhythms>${T('torsadesConfirmSheet.backButton')}</button>`,
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
  // A8: never after ROSC (the ROSC rhythm "Other" is not a non-shockable arrest rhythm).
  if (saveRhythm(outcome, rhythm, energy) && outcome !== 'rosc' && R.RULES.numbers.lowerCard.fluidRhythms.includes(rhythm))
    sheet(
      T('fluidGuidanceSheet.title'),
      `${peaSnippet()}<button class="primary" data-close>${T('fluidGuidanceSheet.continueButton')}</button>`,
    );
}
