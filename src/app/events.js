/* Tap, typing and form listeners. Later owner-approved changes are marked near
   the relevant paths. Shared screen and session state lives in st (see state.js). */
import {
  administration,
  closeSheet,
  copyLog,
  dateValue,
  download,
  editEvent,
  equipmentFeedback,
  error,
  exportSheet,
  exportText,
  openDrug,
  openSelectDose,
  openEquipment,
  openExplainMe,
  openHistory,
  openInterventions,
  openNote,
  openResusTime,
  openRhythm,
  openRhythmCheck,
  openSettings,
  openWeight,
  sheet,
  toggleField,
  weightChanged,
} from './sheets.js';
import {
  canRecord,
  commit,
  keepAwake,
  recordSupport,
  requestWakeSilently,
  save,
  saveRhythm,
  selectRhythm,
  syncRhythm,
} from './session.js';
import { checkStatus, openCycleLog, referenceSheet, render, tick } from './views.js';
import { $, KEY, R, T } from './base.js';
import { fitNote, fitNotes, formatGuidelineReference, local, toast } from './format.js';
import { st, torsades } from './state.js';

/* Listeners are registered here, in original order. */
/* Weight, start time and earlier-count forms validate before committing. */
function estimateWeight() {
  const w = R.estimate($('ageInput').value);
  if (w === null) return error(R.guideText('estimateAgeError'));
  $('weightInput').value = w;
  $('weightPadPrompt').hidden = !R.needsPaediatricPads(w);
  st.sheetContext.source = R.guideText('estimatedWeightSource', { age: $('ageInput').value });
  $('weightBasis').innerHTML = formatGuidelineReference(st.sheetContext.source);
}

function saveWeight() {
  const w = $('weightInput').value.replace(',', '.');
  if (!R.validWeight(w))
    return error(R.wording('invalidWeight', { maxKg: R.RULES.numbers.weight.maxKg }));
  const source = st.sheetContext.source,
    age = $('ageInput').value;
  commit(() => {
    Object.assign(st.s, {
      weight: String(+w),
      group: +w <= R.RULES.numbers.weight.adultAboveKg ? 'Child' : 'Adult',
      weightSource: source,
      age,
    });
    delete st.s.adultConfirmed;
    R.add(st.s, 'weight', T('eventTitles.weightUpdated'), T('eventDetails.weightUpdated', { weight: w, source }));
  }, T('toasts.weightUpdated'));
  closeSheet();
}

function saveResusTime() {
  const at = new Date($('resusStartInput').value).getTime();
  if (!Number.isFinite(at) || at > st.s.appStart)
    return error(T('errors.resusStartAfterApp'));
  commit(() => {
    const prev = st.s.resusStart;
    st.s.resusStart = at;
    R.add(
      st.s,
      'resus-time',
      T('eventTitles.resusStartCorrected'),
      T('eventDetails.resusStartCorrected', { before: new Date(prev).toISOString(), after: new Date(at).toISOString() }),
    );
  }, T('toasts.resusDurationUpdated'));
  closeSheet();
}

function saveHistory() {
  const vals = Object.fromEntries(
    ['priorShocks', 'priorNoShock', 'priorStreak', 'priorAmio'].map((k) => [
      k,
      Number($(k).value),
    ]),
  );
  if (
    Object.values(vals).some((v) => !Number.isInteger(v) || v < 0 || v > 100) ||
    vals.priorStreak > vals.priorNoShock
  )
    return error(T('errors.earlierCounts'));
  commit(() => {
    Object.assign(st.s, vals);
    R.add(
      st.s,
      'history',
      T('eventTitles.earlierCountsUpdated'),
      T('eventDetails.earlierCounts', { shocks: vals.priorShocks, noShock: vals.priorNoShock, amiodarone: vals.priorAmio }),
    );
  }, T('toasts.earlierCountsSaved'));
  closeSheet();
}

/* Session changes keep their validation, persistence and redraw together. */
function startCycle() {
  if (!canRecord()) return;
  commit(() => {
    const now = Date.now();
    R.begin(st.s, now);
    R.add(st.s, 'start', T('eventTitles.cycleStarted'), T('eventDetails.cycleNumber', { number: st.s.cycle }), now);
  }, T('toasts.cycleStarted'));
  requestWakeSilently();
}

function recordRearrest() {
  if (st.s.phase !== 'ROSC') return;
  commit(() => {
    R.begin(st.s, Date.now());
    R.add(st.s, 'rearrest', T('eventTitles.rearrest'));
  }, T('toasts.rearrestRecorded'));
}

function endSession() {
  commit(() => {
    const now = Date.now();
    st.s.remaining = R.timing(st.s, now).left;
    st.s.phase = 'Ended';
    st.s.deadline = null;
    st.s.end = now;
    R.add(st.s, 'end', T('eventTitles.sessionEnded'), '', now);
  }, T('toasts.sessionEnded'));
  closeSheet();
}

function startNewPatient() {
  const large = st.s.largeText;
  st.s = R.fresh();
  st.s.largeText = large;
  st.tab = 'live';
  st.logScope = 'all';
  st.checklistDisplay = 'items';
  save();
  closeSheet();
  render();
  toast(T('toasts.newPatient'));
}

/* The complete export retains events and audit history, but omits the undo
   stack. The text export is built separately and follows the log filters. */
function downloadCompleteRecord() {
  const data = {
    ...st.s,
    undo: undefined,
    exportedAt: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  download(JSON.stringify(data, null, 2), 'application/json', 'json');
}

/* Use the browser's install prompt if available; otherwise show instructions. */
async function offerInstallation() {
  if (st.installPrompt) {
    await st.installPrompt.prompt();
    st.installPrompt = null;
  } else
    sheet(
      T('installSheet.title'),
      `<p>${T('installSheet.android')}</p>` +
      `<p>${T('installSheet.iphone')}</p>` +
      `<p class="caption">${T('installSheet.note')}</p>`,
    );
}

/* Named actions share the same order as the original click handler. */
async function handleAction(action) {
  if (action === 'rhythm-check') openRhythmCheck();
  if (action === 'arrest-checklist') {
    st.tab = 'checks';
    st.checklist = 'arrest';
    render();
  }
  if (action === 'start') return startCycle();
  if (action === 'rearrest') return recordRearrest();
  if (action === 'postrosc') {
    closeSheet();
    st.tab = 'checks';
    st.checklist = 'postrosc';
    st.checkReturn = 'live';
    render();
  }
  if (action === 'previous-shock' && canRecord())
    commit(() => R.addPreAppShock(st.s), T('toasts.previousShockAdded'));
  if (action === 'explain-me') openExplainMe();
  if (action === 'weight') openWeight();
  if (action === 'cycle-log') openCycleLog();
  if (action === 'resus-time') openResusTime();
  if (action === 'settings') openSettings();
  if (action === 'large') {
    st.s.largeText = !st.s.largeText;
    save();
    render();
    openSettings();
  }
  if (action === 'wake') await keepAwake();
  if (action === 'history') openHistory();
  if (action === 'guidance') {
    closeSheet();
    st.tab = 'guidance';
    render();
  }
  if (action === 'interventions') openInterventions();
  if (action === 'airway' || action === 'access') openInterventions(action);
  if (action === 'note') {
    if (canRecord()) openNote();
  }
  if (action === 'estimate') return estimateWeight();
  if (action === 'save-weight') return saveWeight();
  if (action === 'save-resus-time') return saveResusTime();
  if (action === 'save-history') return saveHistory();
  if (action === 'export') exportSheet();
  if (action === 'download-text') download(exportText(), 'text/plain', 'txt');
  if (action === 'download-json') downloadCompleteRecord();
  if (action === 'copy') await copyLog();
  if (action === 'end')
    sheet(
      T('endSheet.title'),
      `<p>${T('endSheet.text')}</p><button class="primary danger" data-action="confirm-end">${T('endSheet.confirmButton')}</button><button class="primary" data-close>${T('endSheet.keepButton')}</button>`,
    );
  if (action === 'confirm-end') return endSession();
  if (action === 'new')
    sheet(
      T('newPatientSheet.title'),
      `<p>${T('newPatientSheet.text')}</p>` +
      `<button class="primary" data-action="export">${T('newPatientSheet.exportButton')}</button>` +
      `<button class="primary danger" data-action="confirm-new">${T('newPatientSheet.clearButton')}</button>`,
    );
  if (action === 'confirm-new') return startNewPatient();
  if (action === 'install') await offerInstallation();
}

/* Selected tap paths keep validation and recording together. */
function undoLastAction() {
  st.s = R.undo(st.s);
  save();
  closeSheet();
  render();
  toast(T('toasts.undone'));
}

function selectTab(tab) {
  if (tab === 'checks') {
    st.checklist = 'arrest';
    st.checkReturn = st.tab === 'guidance' ? 'guidance' : 'live';
  }
  st.tab = tab;
  render();
  window.scrollTo(0, 0);
}

function recordOutcome(b) {
  if (!canRecord()) return;
  const outcome = b.dataset.outcome;
  if (outcome === 'rosc') openRhythm(outcome);
  else if (R.startOutcome(st.s, outcome)) {
    save();
    render();
    openRhythm(outcome);
  }
}

function recordQuickDrug(b) {
  if (!canRecord()) return;
  const type = b.dataset.drug,
    value = R.doseFor(st.s, type);
  if (
    value === null ||
    st.s.special ||
    (type === 'amiodarone' &&
      (torsades() || R.amiodaroneDosesComplete(st.s) || R.childSecondAmiodarone(st.s) || R.secondAmiodaroneEarly(st.s))) ||
    st.s.phase === 'ROSC' ||
    R.lockLeft(st.s, type) > 0 // A5: adrenaline is locked for 3 min 30 s after a dose
  )
    return;
  commit(
    () =>
      R.add(
        st.s,
        type,
        T(type === 'adrenaline' ? 'drugNames.adrenaline' : 'drugNames.amiodarone'),
        T('liveCards.doseMgIv', { dose: value }),
        Date.now(),
        {
          dose: value,
          unit: 'mg',
          route: 'IV',
          weightBasis: R.dose(st.s).basis,
          weight: st.s.weight,
          group: st.s.group,
        },
      ),
    T('toasts.recordedDose', { dose: value }),
  );
  return;
}

/* Retain the event before a correction or void. Exclude its existing audit
   from the copy so the audit trail does not recursively contain itself. */
function auditBeforeChange(event) {
  event.audit = [
    ...(event.audit || []),
    { at: Date.now(), before: JSON.parse(JSON.stringify({ ...event, audit: undefined })) },
  ];
}

function toggleEventVoid(b) {
  commit(() => {
    const ev = st.s.events.find((x) => x.id === b.dataset.void);
    auditBeforeChange(ev);
    ev.voided = !ev.voided;
    ev.correctedAt = Date.now();
    syncRhythm();
  }, T('toasts.eventUpdated'));
  closeSheet();
  return;
}

function useWeightKey(b) {
  const input = $('weightInput'),
    k = b.dataset.key;
  if (st.sheetContext.replaceWeight && k !== '⌫') input.value = '';
  st.sheetContext.replaceWeight = false;
  input.value =
    k === '⌫'
      ? input.value.slice(0, -1)
      : k === '.'
        ? input.value.includes('.')
          ? input.value
          : (input.value || '0') + '.'
        : (input.value === '0' ? '' : input.value) + k;
  weightChanged();
  return;
}

/* MAIN TAP HANDLER: every button on the screen is handled here, mostly by its data-action. */
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button,a[data-action]');
  if (!b) return;
  if (b.dataset.action) e.preventDefault();
  if (b.dataset.close !== undefined) {
    closeSheet();
    return;
  }
  if (b.id === 'undo') {
    undoLastAction();
    return;
  }
  if (b.dataset.tab) {
    selectTab(b.dataset.tab);
    return;
  }
  if (b.dataset.outcome) {
    recordOutcome(b);
    return;
  }
  if (b.dataset.recordRhythm) {
    selectRhythm(b.dataset.recordRhythm);
    return;
  }
  if (b.hasAttribute('data-confirm-torsades')) {
    const ctx = st.sheetContext;
    if (ctx?.kind === 'torsades-confirm' && ctx.session === st.s.id)
      saveRhythm(ctx.outcome, 'Torsades', ctx.energy, ctx.at, ctx.eventId);
    return;
  }
  if (b.hasAttribute('data-back-rhythms')) {
    const energy = st.sheetContext?.energy;
    openRhythm('shock');
    if ($('shockEnergy')) $('shockEnergy').value = energy || '';
    return;
  }
  if (b.dataset.support) {
    recordSupport(b.dataset.support);
    return;
  }
  if (b.hasAttribute('data-confirm-magnesium')) {
    if (st.sheetContext?.kind === 'repeat-magnesium') recordSupport('magnesium', true);
    return;
  }

  if (b.dataset.drug) {
    recordQuickDrug(b);
    return;
  }
  if (b.dataset.selectDose) {
    if (canRecord()) openSelectDose();
    return;
  }
  if (b.dataset.customDrug) {
    if (canRecord()) openDrug(b.dataset.customDrug);
    return;
  }
  if (b.dataset.drugInfo) {
    administration(b.dataset.drugInfo);
    return;
  }
  if (b.dataset.checklist) {
    st.checklist = b.dataset.checklist;
    render();
    return;
  }
  if (b.dataset.equipment) {
    if (canRecord()) openEquipment(b.dataset.equipment);
    return;
  }
  if (b.dataset.reviewChecklist) {
    st.checklist = b.dataset.reviewChecklist;
    st.checkReturn = 'log';
    st.tab = 'checks';
    render();
    return;
  }
  if (b.dataset.edit) {
    editEvent(b.dataset.edit);
    return;
  }
  if (b.dataset.void) {
    toggleEventVoid(b);
    return;
  }
  if (b.dataset.key) {
    useWeightKey(b);
    return;
  }
  if (b.dataset.earlier) {
    $('resusStartInput').value = local(st.s.appStart - Number(b.dataset.earlier) * 60000);
    return;
  }
  const action = b.dataset.action;
  if (!action) return;
  await handleAction(action);
});

/* Typing: weight box, equipment size slider and similar inputs. */
document.addEventListener('input', (e) => {
  if (e.target.id === 'weightInput') weightChanged();
  if (e.target.dataset.size) {
    const type = e.target.dataset.size,
      unit = document.querySelector('[name=sizeUnit]:checked')?.value || 'mm',
      sizes = R.RULES.equipment.devices[type].sizes.filter((v) => type !== 'npa' || v.endsWith(unit)),
      value = sizes[+e.target.value];
    document.querySelector('#equipmentForm [name=size]').value = value;
    $('sizeRead').textContent = value + (type === 'iv' ? 'G' : '');
    equipmentFeedback(e);
  }
});

/* Log filters, checklist display choice and similar changes. */
document.addEventListener('change', (e) => {
  if (e.target.id === 'logScope') {
    st.logScope = e.target.value;
    render();
    return;
  }
  if (e.target.id === 'checklistDisplay') {
    st.checklistDisplay = e.target.value;
    render();
    return;
  }
  if (e.target.dataset.check) {
    const key = e.target.dataset.check,
      checked = e.target.checked,
      [id, i] = key.split(':'),
      list = R.RULES.checklists.lists.find((c) => c.id === id);
    commit(() => {
      R.add(
        st.s,
        'checklist',
        list.label,
        T(checked ? 'eventDetails.checklistChecked' : 'eventDetails.checklistUnmarked', { item: list.items[+i] }),
        Date.now(),
        { key, checked },
      );
    });
  }
  if (e.target.id === 'specialInput') {
    commit(() => {
      st.s.special = e.target.checked;
      R.add(
        st.s,
        'context',
        T('eventTitles.specialSituation'),
        T(st.s.special ? 'eventDetails.promptsDisabled' : 'eventDetails.promptsEnabled'),
      );
    });
  }
  if (e.target.name === 'sizeUnit') {
    const sizes = R.RULES.equipment.devices.npa.sizes.filter((v) => v.endsWith(e.target.value)),
      range = document.querySelector('[data-size=npa]');
    range.max = sizes.length - 1;
    range.value = 0;
    document.querySelector('#equipmentForm [name=size]').value = '';
    $('sizeRead').textContent = 'Not recorded';
    $('sizeRange').textContent = sizes[0] + ' – ' + sizes.at(-1);
  }
});

/* Manual entries use these event types so they join the corresponding counts
   and clocks. Other names remain general medicine events. */
function manualMedicineType(name) {
  switch (name.toLowerCase()) {
    case 'adrenaline': return 'adrenaline';
    case 'amiodarone': return 'amiodarone';
    case 'magnesium': return 'magnesium';
    default: return name.toLowerCase() === R.RULES.numbers.products.fluid.toLowerCase() ? 'fluids' : 'medicine';
  }
}

/* Form recording paths: validation, commit and dialog changes stay together. */
function submitDrug(form, at) {
  if (!canRecord()) return;
  const name = form.get('name').trim(),
    dose = +form.get('dose'),
    unit = form.get('unit'),
    route = form.get('route');
  if (!name || !Number.isFinite(dose) || dose <= 0 || !route)
    return error(T('errors.medicineIncomplete'));
  const type = manualMedicineType(name);
  commit(
    () =>
      R.add(
        st.s,
        type,
        name,
        T(form.get('notes') ? 'eventDetails.doseUnitRouteNotes' : 'eventDetails.doseUnitRoute', { dose, unit, route, notes: form.get('notes') }),
        at,
        { dose, unit, route, notes: form.get('notes') },
      ),
    T('toasts.administrationRecorded'),
  );
  closeSheet();
}

function submitEquipment(form, at, submitEvent) {
  if (!canRecord()) return;
  const type = st.sheetContext.type,
    data = Object.fromEntries(form);
  if (data.side && data.site) data.site = data.side + ' ' + data.site;
  const confirmed = form.getAll('confirmation');
  if (
    type === 'intubation' &&
    data.size &&
    (!Number.isFinite(+data.size) || +data.size <= 0 || +data.size > R.RULES.equipment.maxTubeSizeMm)
  )
    return error(T('errors.tubeSize'));
  const parts = Object.entries(data)
    .filter(([k, v]) => !['at', 'confirmation', 'sizeUnit', 'side'].includes(k) && v)
    .map(([k, v]) => T('eventDetails.equipmentField', { key: k, value: v }));
  if (!data.size) parts.unshift(T('eventDetails.sizeNotRecorded'));
  if (type === 'intubation')
    parts.push(
      confirmed.length ? T('eventDetails.confirmedWith', { methods: confirmed.join(', ') }) : T('eventDetails.confirmationNotRecorded'),
    );
  commit(
    () =>
      R.add(st.s, 'equipment', R.RULES.equipment.devices[type].name, parts.join(' · '), at, {
        procedure: type,
        equipment: { ...data, confirmation: confirmed },
      }),
    T('toasts.interventionRecorded'),
  );
  closeSheet();
  if (type === 'laryngoscopy' && submitEvent.submitter?.value === 'intubation') openEquipment('intubation');
}

function submitNote(form, at) {
  if (!canRecord()) return;
  const text = form.get('text').trim();
  if (!text) return error(T('errors.eventEmpty'));
  commit(() => R.add(st.s, 'note', T('eventTitles.note'), text, at, {}), T('toasts.eventRecorded'));
  closeSheet();
}

function submitCorrection(form, at) {
  const event = st.s.events.find((x) => x.id === st.sheetContext.id);
  if (event.preApp && at >= st.s.appStart) return error(T('errors.timeBeforeApp'));
  if (
    ['start', 'pause', 'resume', 'rearrest', 'end', 'rosc'].includes(event.type) &&
    local(at) !== local(event.at)
  )
    return error(T('errors.stateChangeTime'));
  const dose = form.has('dose') ? +form.get('dose') : null;
  if (form.has('dose') && (!Number.isFinite(dose) || dose <= 0))
    return error(T('errors.doseNotPositive'));
  commit(() => {
    auditBeforeChange(event);
    event.at = at;
    event.details = form.get('details');
    if (event.type === 'equipment') delete event.equipment;
    event.correctedAt = Date.now();
    if (event.preApp) {
      event.needsReview = false;
      delete event.timeUnknown;
    }
    if (form.has('rhythm')) event.rhythm = form.get('rhythm');
    if (form.has('dose')) {
      event.dose = dose;
      event.unit = form.get('unit');
      event.route = form.get('route');
      event.details = T(event.notes ? 'eventDetails.doseUnitRouteNotes' : 'eventDetails.doseUnitRoute', { dose, unit: event.unit, route: event.route, notes: event.notes });
    }
    if (form.has('energy')) event.energy = form.get('energy');
    if (['shock', 'noshock', 'rosc', 'rhythm'].includes(event.type))
      event.details = R.rhythmDetails(event.type, event.rhythm, event.energy);
    syncRhythm();
  }, T('toasts.eventCorrected'));
  closeSheet();
}

/* Each recognized form validates its time before its specific recording path. */
document.addEventListener('submit', (submitEvent) => {
  const formId = submitEvent.target.id;
  if (!['drugForm', 'equipmentForm', 'noteForm', 'editForm'].includes(formId)) return;
  submitEvent.preventDefault();
  const form = new FormData(submitEvent.target),
    at = dateValue(form);
  if (at === null) return;
  if (formId === 'drugForm') return submitDrug(form, at);
  if (formId === 'equipmentForm') return submitEquipment(form, at, submitEvent);
  if (formId === 'noteForm') return submitNote(form, at);
  if (formId === 'editForm') return submitCorrection(form, at);
});

/* App returns to the foreground: refresh clocks and wake lock. */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    tick();
    if (st.s.phase === 'Active') requestWakeSilently();
  }
});

/* Keep the browser's install offer so Settings can trigger it. */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  st.installPrompt = e;
});

/* Another tab changed the saved session: load it here too. */
window.addEventListener('storage', (e) => {
  if (e.key !== KEY || !e.newValue) return;
  try {
    // Same check as at start-up (missing parts filled, comma weight converted); unusable data is ignored.
    const restored = R.restoreSaved(JSON.parse(e.newValue));
    if (restored) {
      st.s = restored.session;
      closeSheet();
      render();
      toast(T('toasts.otherTab'));
    }
  } catch {}
});

/* Pop-up closed with the Back gesture / Escape. */
$('sheet').addEventListener('cancel', () => (st.sheetContext = null));

/* First digit typed replaces the old weight instead of adding to it. */
document.addEventListener('beforeinput', (e) => {
  if (e.target.id !== 'weightInput' || st.sheetContext?.kind !== 'weight') return;
  if (st.sheetContext.replaceWeight && e.inputType?.startsWith('insert')) {
    e.target.value = '';
    e.target.setSelectionRange(0, 0);
  }
  st.sheetContext.replaceWeight = false;
});

/* Tap outside the equipment / interventions pop-up closes it. */
$('sheet').addEventListener('click', (e) => {
  if (e.target !== $('sheet') || !['equipment', 'interventions'].includes(st.sheetContext?.kind))
    return;
  const r = $('sheet').getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
    closeSheet();
});

/* Grow note boxes as they are typed in. */
document.addEventListener('input', (e) => {
  if (e.target.matches('#sheet textarea')) fitNote(e.target);
});

/* Opening an optional-entry section resizes its note boxes. */
document.addEventListener(
  'toggle',
  (e) => {
    if (e.target.matches('details.optional-entry') && e.target.open) fitNotes();
  },
  true,
);

/* Guidance-screen taps: open a checklist, reference sheet, 4Hs/4Ts prompt, save age, cannula gauge. */
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.openCheck) {
    st.checklist = b.dataset.openCheck;
    st.checkReturn = 'guidance';
    st.tab = 'checks';
    render();
    window.scrollTo(0, 0);
  }
  if (b.dataset.reference) referenceSheet(b.dataset.reference);
  if (b.dataset.causeGuide) {
    const c = R.RULES.checklists.causes.find((x) => x.id === b.dataset.causeGuide);
    sheet(c.name, `<h3>${c.plain}</h3><p>${c.text}</p>`);
  }
  if (b.hasAttribute('data-save-age')) {
    const a = Number($('referenceAge').value);
    if (!Number.isFinite(a) || a < 0 || a > 120) return error(T('errors.age'));
    commit(() => (st.s.age = String(a)));
    referenceSheet('tubes');
  }
  if (b.dataset.gauge) {
    const slider = document.querySelector('[data-size=iv]');
    slider.value = b.dataset.gauge;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

/* Switching laryngoscopy between video and direct changes the blade size choices. */
document.addEventListener('change', (e) => {
  if (e.target.name === 'method' && st.sheetContext?.type === 'laryngoscopy') {
    const blades = R.RULES.equipment.blades,
      methods = R.RULES.equipment.forms.laryngoscopy.methods,
      sizes = blades[e.target.value === methods[0] ? methods[0] : methods[1]];
    $('bladeChoices').innerHTML = toggleField('size', R.RULES.equipment.forms.laryngoscopy.bladeQuestion, sizes);
    const row = $('bladeChoices').firstElementChild;
    row.classList.add('entry-row');
    row.insertAdjacentHTML('beforeend', '<span class="row-confirm" aria-hidden="true">✓</span>');
  }
});
