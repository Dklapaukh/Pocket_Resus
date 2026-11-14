/* Pop-up sheets for weight, rhythm, drugs, equipment, notes, correction,
   export, settings and the tutorial. Shared state lives in st (see state.js). */
import { $, R, T, paras } from './base.js';
import {
  compactOptionalFields,
  esc,
  fitNotes,
  formatGuidelineReference,
  local,
  normalizeGuidelineReferences,
  time,
  toast,
} from './format.js';
import { EXPLAIN_ME_SLIDES } from './data.js';
import { finished, logRows, st, torsades } from './state.js';

/* Open the pop-up with a title and content. ctx records what the pop-up is for (st.sheetContext). */
export function sheet(title, html, ctx = {}) {
  if (typeof stopExplainMe === 'function') stopExplainMe();
  $('sheet').className = '';
  st.sheetContext = ctx;
  $('sheet').innerHTML =
    `<div class="sheet-heading"><h2 id="sheetTitle">${title}</h2><button data-close aria-label="${T('popups.closeAria')}">×</button></div>` +
    `<div class="sheet-content">${html}<p id="sheetError" class="error" role="alert" hidden></p></div>`;
  normalizeGuidelineReferences($('sheet'));
  compactOptionalFields();
  $('sheet').classList.toggle('input-sheet', !!$('sheet').querySelector('form,input'));
  if (!$('sheet').open) $('sheet').showModal();
  fitNotes();
  $('sheet').scrollTop = 0;
}

/* Close the pop-up and forget its context. */
export function closeSheet() {
  if (typeof stopExplainMe === 'function') stopExplainMe();
  $('sheet').close();
  $('sheet').className = '';
  st.sheetContext = null;
}

/* Show an error message inside the open pop-up. */
export function error(message) {
  $('sheetError').hidden = false;
  $('sheetError').textContent = message;
}

/* A row of single-choice buttons used in forms. */
export function toggleField(name, label, values, value = '') {
  const options = values.map((v) =>
    `<label class="toggle"><input type="radio" name="${name}" value="${esc(v)}" aria-label="${esc(v)}" ${v === value ? 'checked' : ''}>` +
    `<span>${esc(v)}</span></label>`,
  ).join('');
  return `<fieldset class="toggles"><legend>${label}</legend>${options}</fieldset>`;
}

/* Pop-up to record a shock, no-shock cycle or ROSC: choose the rhythm (and energy for a shock). */
export function openRhythm(outcome) {
  const options = R.RULES.numbers.rhythms[outcome];
  const isShock = outcome === 'shock';
  const energy = isShock
    ? '<label>' + T('rhythmSheet.energyLabel') + '<input id="shockEnergy" type="number" inputmode="numeric" min="1" max="' + R.RULES.numbers.shock.maxRecordableJ + '" value="' + (R.shockEnergy(st.s) ?? '') + '" placeholder="' + T('rhythmSheet.energyPlaceholder') + '"></label>'
    : '';
  const rhythms = isShock
    ? rhythmImages()
    : `<div class="choice-grid">${options.map((r) => `<button data-record-rhythm="${r}">${Object.hasOwn(R.RULES.wording.otherRhythmButtons, r) ? R.RULES.wording.otherRhythmButtons[r] : r}</button>`).join('')}</div>`;
  sheet(T('rhythmSheet.titles.' + outcome), energy + rhythms, {
    kind: 'rhythm',
    outcome,
    eventId: st.s.pendingRhythm?.outcome === outcome ? st.s.pendingRhythm.id : null,
  });
}

/* Pop-up to enter or change patient weight. */
export function openWeight() {
  const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']
    .map((key) => `<button data-key="${key}" aria-label="${key === '⌫' ? T('weightSheet.deleteDigitAria') : key}">${key}</button>`)
    .join('');
  sheet(
    T('weightSheet.title'),
    `<label>${T('weightSheet.weightLabel')}<input id="weightInput" type="text" inputmode="decimal" value="${esc(st.s.weight)}" autocomplete="off"></label>` +
      `<div class="number-pad">${numberKeys}</div>` +
      `<details><summary>${T('weightSheet.estimateSummary')}</summary><label>${T('weightSheet.ageLabel')}<input id="ageInput" type="number" inputmode="decimal" min="0.01" max="${R.RULES.numbers.ageEstimate.adultUpToAge}" step="any" value="${esc(st.s.age)}"></label>` +
      `<button data-action="estimate">${T('weightSheet.useAgeEstimateButton')}</button><p class="caption">${R.wording('weightSheetAgeEstimate', R.ageEstimateGaps())}</p></details>` +
      `<p id="weightBasis" class="caption">${esc(st.s.weightSource)}</p>` +
      `<p id="weightPadPrompt" class="pads-entry" ${R.needsPaediatricPads(st.s.weight) ? '' : 'hidden'}>▰ ▰ ${R.guideText('padsPromptWithLimit')}</p>` +
      `<button class="primary" data-action="save-weight">${T('weightSheet.useWeightButton')}</button>`,
    { kind: 'weight', source: st.s.weightSource, replaceWeight: !!st.s.weight },
  );
}

/* "Rhythm check" pop-up: choose the observed outcome (only when a rhythm check is allowed). */
export function openRhythmCheck() {
  if (!R.canRhythmCheck(st.s)) return;
  sheet(
    T('rhythmCheckSheet.title'),
    `<p class="caption">${T('rhythmCheckSheet.prompt')}</p>` +
      `<div class="rhythm-outcomes"><button class="shock" data-outcome="shock"><span aria-hidden="true">ϟ</span><b>${T('rhythmCheckSheet.shock')}</b><small>${T('rhythmCheckSheet.shockNote')}</small></button>` +
      `<button data-outcome="noshock"><span aria-hidden="true">⊘</span><b>${T('rhythmCheckSheet.noShock')}</b></button>` +
      `<button class="rosc" data-outcome="rosc"><span aria-hidden="true">♡</span><b>${T('rhythmCheckSheet.rosc')}</b></button></div>`,
  );
}

/* "When did resus start?" pop-up (the app session clock is unchanged). */
export function openResusTime() {
  const earlierChoices = R.RULES.numbers.resusStart.quickChoicesMin
    .map((minutes) => `<button data-earlier="${minutes}">${T('resusTime.choiceLabel', { minutes })}<small>${T('resusTime.choiceNote')}</small></button>`)
    .join('');
  sheet(
    T('resusTime.title'),
    `<p>${T('resusTime.intro')}</p><label>${T('resusTime.startedLabel')}<input id="resusStartInput" type="datetime-local" step="60" value="${local(st.s.resusStart)}" max="${local(st.s.appStart)}"></label>` +
      `<div class="choice-grid">${earlierChoices}</div>` +
      `<p class="caption">${T('resusTime.note')}</p>` +
      `<button class="primary" data-action="save-resus-time">${T('resusTime.saveButton')}</button>`,
  );
}

/* "Session & display" pop-up: tutorial, undo, large text and other session settings. */
export function openSettings() {
  sheet(
    T('settings.title'),
    `<div class="stack"><button data-action="explain-me">${T('settings.tutorial')}</button>` +
      `<button id="undo" ${st.s.undo.length ? '' : 'disabled'}>${T('settings.undo')}</button>` +
      `<button data-action="large">${T(st.s.largeText ? 'settings.largerTextOn' : 'settings.largerText')}</button>` +
      `<button data-action="wake">${T(st.wakeLock ? 'settings.screenAwakeOn' : 'settings.screenAwake')}</button>` +
      `<button data-action="install">${T('settings.install')}</button>` +
      `<button data-action="history">${T('settings.history')}</button>` +
      `<button data-action="resus-time">${T('settings.resusTime')}</button>` +
      `<button data-action="guidance">${T('settings.guidance')}</button>` +
      `<button data-action="export">${T('settings.export')}</button></div>` +
      `<label><input id="specialInput" type="checkbox" ${st.s.special ? 'checked' : ''}>${T('settings.specialLabel')}</label><p class="caption">${T('settings.specialNote')}</p>` +
      `<div class="stack"><button class="danger" data-action="end" ${finished() ? 'disabled' : ''}>${T('settings.endButton')}</button>` +
      `<button class="danger" data-action="new">${T('settings.newButton')}</button></div>` +
      `<p class="caption" id="offlineState">${T('settings.storageNote', { state: T(navigator.onLine ? 'settings.online' : 'settings.offline') })}</p>`,
  );
}

/* "Events before this app" pop-up: earlier shocks / no-shock cycles entered as counts only. */
export function openHistory() {
  const priorAmiodaroneOptions = [...Array(R.RULES.numbers.amiodarone.dueAtShocks.length + 1).keys()] // 0 up to the most doses
    .map((count) => `<option ${st.s.priorAmio === count ? 'selected' : ''}>${count}</option>`)
    .join('');
  sheet(
    T('historySheet.title'),
    `<p class="caption">${T('historySheet.intro')}</p><label>${T('historySheet.priorShocks')}<input id="priorShocks" type="number" inputmode="numeric" min="0" max="100" value="${st.s.priorShocks}"></label>` +
      `<label>${T('historySheet.priorNoShock')}<input id="priorNoShock" type="number" inputmode="numeric" min="0" max="100" value="${st.s.priorNoShock}"></label>` +
      `<label>${T('historySheet.priorStreak')}<input id="priorStreak" type="number" inputmode="numeric" min="0" max="100" value="${st.s.priorStreak}"></label>` +
      `<label>${T('historySheet.priorAmio')}<select id="priorAmio">${priorAmiodaroneOptions}</select></label>` +
      `<button class="primary" data-action="save-history">${T('historySheet.saveButton')}</button>` +
      `<button class="primary" data-custom-drug="adrenaline">${T('historySheet.earlierAdrenalineButton')}</button>`,
  );
}

/* Reference pop-up for a drug's dose (adrenaline, amiodarone); magnesium and fluids use supportAdministration. */
export function administration(type) {
  if (['magnesium', 'fluids'].includes(type)) return supportAdministration(type);
  const d = R.dose(st.s);
  const adrenaline = type === 'adrenaline';
  let doseText = R.guideText('noWeightDoseReference');
  if (d) {
    if (adrenaline) doseText = T('liveCards.doseMgIv', { dose: d.adr });
    else if (R.isPaediatric(st.s)) doseText = R.guideText('amiodaroneChildPopupDose', { first: d.amio1 });
    else doseText = R.guideText('amiodaroneAdultPopupDose', { first: d.amio1, second: d.amio2 });
    doseText = esc(doseText);
  }
  const instructions = paras(adrenaline ? 'adrenalineHow' : 'amiodaroneHow');
  const source = R.RULES.sources.guidelines[adrenaline ? 'adrenaline' : 'amiodarone'];
  const guideline = source.code;
  sheet(
    T(adrenaline ? 'administration.adrenalineTitle' : 'administration.amiodaroneTitle'),
    `<p><b>${doseText}</b></p>` +
      `<p class="caption">${d ? formatGuidelineReference(d.basis) : R.guideText('referenceOnly')}</p>` +
      `${instructions}<a href="${source.pdf}" target="_blank" rel="noopener">${T('references.guidelineLink', { code: guideline })}</a>` +
      `<p class="caption">${R.guideText('drugPopupFooter', { guideline })}</p>`,
  );
}

/* Names prefilled by the card's Other… button; an unrecognised type opens
   a blank medicine field for manual entry. */
function medicineEntryName(type) {
  switch (type) {
    case 'adrenaline': return T('drugNames.adrenaline');
    case 'amiodarone': return T('drugNames.amiodarone');
    case 'magnesium': return T('drugNames.magnesium');
    case 'fluids': return R.RULES.numbers.products.fluid;
    default: return '';
  }
}

/* Pop-up to record a drug administration (dose, time, notes). */
export function openDrug(type) {
  const name = medicineEntryName(type);
  const now = Date.now();
  const defaultUnit = type === 'magnesium' ? 'mmol' : type === 'fluids' ? 'mL' : 'mg';
  const units = R.RULES.numbers.medicineForm.units
    .map((unit) => `<option ${unit === defaultUnit ? 'selected' : ''}>${unit}</option>`).join('');
  const route = ['magnesium', 'fluids'].includes(type) ? 'IV' : '';
  const torsadesWarning = type === 'amiodarone' && torsades()
    ? `<p class="error">${R.guideText('amiodaroneAfterTorsadesWarning')}</p>`
    : '';
  sheet(
    T('medicineForm.title', { name: name || T('medicineForm.fallbackName') }),
    `<form id="drugForm"><label>${T('medicineForm.medicineLabel')}<input name="name" value="${name}" required></label>` +
      `<div class="inline-two"><label>${T('forms.doseLabel')}<input name="dose" type="number" inputmode="decimal" min="0.001" step="any" required placeholder="${T('medicineForm.dosePlaceholder')}"></label>` +
      `<label>${T('forms.unitLabel')}<select name="unit">${units}</select></label></div>` +
      toggleField('route', T('forms.routeLabel'), R.RULES.numbers.medicineForm.routes, route) +
      `<label>${T('forms.givenAtLabel')}<input name="at" type="time" step="60" value="${local(now).slice(11)}" required></label>` +
      `<label>${T('forms.notesLabel')}<input name="notes" placeholder="${T('forms.optional')}"></label>` +
      `<button class="primary" type="submit">${T('medicineForm.submit')}</button></form>${torsadesWarning}`,
    { kind: 'drug', type, at: now },
  );
}

/* C6b-2 (owner ruling 3 Nov 2026, option A): child second amiodarone dose before 6 shocks. No dose is suggested or
   pre-filled; the clinician types the mg actually given. Submits through the normal drugForm handler. */
export function openSelectDose() {
  const now = Date.now();
  sheet(
    T('selectDoseSheet.title'),
    `<p>${R.guideText('selectDoseAdvice')}</p>` +
      `<form id="drugForm"><input type="hidden" name="name" value="${T('drugNames.amiodarone')}">` +
      `<input type="hidden" name="unit" value="mg"><input type="hidden" name="route" value="IV">` +
      `<label>${T('selectDoseSheet.doseLabel')}<input name="dose" type="number" inputmode="decimal" min="0.001" step="any" required placeholder="${T('selectDoseSheet.dosePlaceholder')}"></label>` +
      `<label>${T('forms.givenAtLabel')}<input name="at" type="time" step="60" value="${local(now).slice(11)}" required></label>` +
      `<button class="primary" type="submit">${T('selectDoseSheet.submit')}</button></form>`,
    { kind: 'drug', type: 'amiodarone', at: now },
  );
}

/* Pop-up listing the airway and/or access options to choose from. */
export function openInterventions(group) {
  sheet(
    T(group === 'airway' ? 'interventions.airway' : group === 'access' ? 'interventions.access' : 'interventions.both'),
    `<div class="choice-grid">${Object.entries(R.RULES.equipment.devices)
      .filter(
        ([k]) =>
          !group || (group === 'access' ? R.RULES.equipment.accessDevices.includes(k) : !R.RULES.equipment.accessDevices.includes(k)),
      )
      .map(([k, e]) => `<button data-equipment="${k}">${e.name}</button>`)
      .join('')}</div>`,
    { kind: 'interventions' },
  );
}

/* Size choice buttons for a device type. */
export function colourSizes(type, values) {
  const sizes = R.RULES.equipment.forms.sizes;
  const legend = type === 'iv' ? sizes.cannulaLegend : sizes.otherLegend;
  const suffix = type === 'iv' ? sizes.cannulaSuffix : '';
  const options = values.map((v) => {
    const colour = R.RULES.equipment.colours[type]?.[v] || '#ccd9d3';
    return `<label class="toggle"><input type="radio" name="size" aria-label="${v}${suffix}" value="${v}">` +
      `<span style="--size-colour:${colour}">${v}${suffix}</span></label>`;
  }).join('');
  return `<fieldset class="toggles size-options"><legend>${legend}</legend>${options}</fieldset>`;
}

/* Size options for a device type: tube-size grid for intubation, otherwise size buttons. */
export function sizeFields(type) {
  const sizes = R.RULES.equipment.devices[type].sizes;
  if (type === 'iv') return colourSizes(type, sizes);
  if (type === 'intubation') {
    const options = sizes.map((v) =>
      `<label class="toggle"><input type="radio" name="size" value="${v}" aria-label="${v} ${R.RULES.equipment.forms.intubation.sizeUnit}">` +
      `<span>${v}<small>${R.RULES.equipment.forms.intubation.sizeUnit}</small></span></label>`,
    ).join('');
    return `<fieldset class="toggles tube-options"><legend>${R.RULES.equipment.forms.intubation.sizeLegend}</legend>` +
      `<div class="tube-grid">${options}</div></fieldset>`;
  }
  return colourSizes(type, sizes);
}

/* Side (left / right) and location choices for IV or IO access. */
export function sitePicker(type) {
  return (
    toggleField('side', R.RULES.equipment.forms.access.sideQuestion, R.RULES.equipment.forms.access.sides) +
    toggleField('site', R.RULES.equipment.forms.access.locationQuestion, R.RULES.equipment.sites[type]).replace(
      'class="toggles"',
      'class="toggles ' + (type === 'iv' ? 'iv-sites' : 'io-sites') + '"',
    )
  );
}

/* Tidy the equipment form into rows after it is drawn. */
export function enhanceEquipment() {
  const form = $('equipmentForm');

  [...form.children]
    .filter((el) => el.tagName === 'LABEL' || el.tagName === 'FIELDSET')
    .forEach((el) => {
      let row = el;
      if (el.tagName === 'LABEL') {
        row = document.createElement('div');
        el.before(row);
        row.append(el);
      }
      row.classList.add('entry-row');
      const badge = document.createElement('span');
      badge.className = 'row-confirm';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = '✓';
      row.append(badge);
    });
  form.addEventListener('input', equipmentFeedback);
  form.addEventListener('change', equipmentFeedback);
}

/* Show the tick beside an equipment row once it has a value. */
export function equipmentFeedback(e) {
  const row = e.target.closest('.entry-row');
  if (!row) return;
  const inputs = [...row.querySelectorAll('input,textarea,select')],
    values = inputs
      .filter((el) => !['radio', 'checkbox'].includes(el.type) || el.checked)
      .map((el) => el.value.trim()),
    valid = values.some(Boolean) && inputs.every((el) => !el.value || el.validity.valid);
  const was = row.classList.contains('has-entry');
  row.classList.toggle('has-entry', valid);
  if (valid && !was) {
    row.classList.remove('entry-pop');
    void row.offsetWidth;
    row.classList.add('entry-pop');
  }
}

/* Pop-up to record an airway device or IV/IO access. */
export function openEquipment(type) {
  const now = Date.now();
  const isLaryngoscopy = type === 'laryngoscopy';
  const forms = R.RULES.equipment.forms;
  const deviceFields = isLaryngoscopy
    ? toggleField('method', forms.laryngoscopy.methodQuestion, forms.laryngoscopy.methods) +
      '<div id="bladeChoices"><p class="caption">' + forms.laryngoscopy.bladeHint + '</p></div>' +
      toggleField('forceps', forms.laryngoscopy.forcepsQuestion, forms.laryngoscopy.forcepsChoices) +
      toggleField('view', forms.laryngoscopy.viewQuestion, forms.laryngoscopy.views)
    : sizeFields(type);
  const accessFields = R.RULES.equipment.accessDevices.includes(type) ? sitePicker(type) : '';
  const intubationFields = type === 'intubation'
    ? toggleField('adjunct', forms.intubation.introducerQuestion, forms.intubation.introducers) +
      '<label>' + forms.intubation.lipsQuestion + '<input name="lips" type="number" min="' + forms.intubation.lipsMinCm + '" max="' + forms.intubation.lipsMaxCm + '" inputmode="decimal" step="any"></label><fieldset class="toggles"><legend>' + forms.intubation.confirmQuestion + '</legend>' +
      forms.intubation.confirmMethods
        .map((x) => `<label><input name="confirmation" type="checkbox" value="${x}">${x}</label>`).join('') +
      '</fieldset>'
    : '';
  const outcomeFields = isLaryngoscopy ? '' : toggleField('outcome', forms.outcome.question, forms.outcome.choices);
  const followUp = isLaryngoscopy
    ? '<button class="primary" type="submit" name="followUp" value="intubation">' + T('equipmentSheet.recordAndAddIntubation') + '</button>'
    : '';
  sheet(
    R.RULES.equipment.devices[type].name,
    `<form id="equipmentForm">${deviceFields}${accessFields}${intubationFields}${outcomeFields}<label>${T('forms.timeLabel')}<input name="at" type="time" step="60" required value="${local(now).slice(11)}"></label>` +
      `<label>${T('forms.notesLabel')}<textarea rows="1" name="notes" placeholder="${T('forms.optional')}"></textarea></label>` +
      `<div class="equipment-record-actions"><button class="primary" type="submit">${T('equipmentSheet.recordButton', { name: R.RULES.equipment.devices[type].name })}</button>${followUp}</div></form>`,
    { kind: 'equipment', type, at: now },
  );
  enhanceEquipment();
}

/* Pop-up to record a free-text event (or another medicine). */
export function openNote() {
  const now = Date.now();
  sheet(
    T('noteSheet.title'),
    `<form id="noteForm"><label>${T('noteSheet.eventLabel')}<textarea rows="1" name="text" required placeholder="${T('noteSheet.eventPlaceholder')}"></textarea></label>` +
      `<label>${T('forms.eventTimeLabel')}<input name="at" type="time" step="60" required value="${local(now).slice(11)}"></label>` +
      `<button class="primary" type="submit">${T('noteSheet.submit')}</button></form>` +
      `<button class="primary" data-custom-drug="other">${T('noteSheet.anotherMedicineButton')}</button>`,
    { kind: 'note', at: now },
  );
}

/* "Correct event" pop-up: change a logged event's time or details. */
export function editEvent(id) {
  const event = st.s.events.find((entry) => entry.id === id);
  if (!event) return;

  // A correction can change only the rhythms appropriate to that event type.
  const correctionRhythms = R.RULES.numbers.correctionRhythms;
  const rhythms = Object.hasOwn(correctionRhythms, event.type) ? correctionRhythms[event.type] : [];
  const rhythmOptions = rhythms.map((rhythm) =>
    '<option ' + (event.rhythm === rhythm ? 'selected' : '') + '>' + rhythm + '</option>',
  ).join('');
  const rhythmFields = rhythms.length
    ? '<label>' + T('correctionSheet.rhythmLabel') + '<select name="rhythm">' + rhythmOptions + '</select></label>'
    : '';
  const medicineFields = ['adrenaline', 'amiodarone', 'magnesium', 'fluids', 'medicine'].includes(event.type)
    ? '<div class="inline-two"><label>' + T('forms.doseLabel') + '<input name="dose" type="number" step="any" min="0.001" value="' + esc(event.dose || '') + '" required></label>' +
      '<label>' + T('forms.unitLabel') + '<input name="unit" value="' + esc(event.unit || 'mg') + '" required></label></div>' +
      '<label>' + T('forms.routeLabel') + '<input name="route" value="' + esc(event.route || 'IV') + '" required></label>'
    : '';
  const energyField = event.type === 'shock'
    ? '<label>' + T('correctionSheet.energyLabel') + '<input name="energy" type="number" min="1" max="' + R.RULES.numbers.shock.maxRecordableJ + '" inputmode="numeric" value="' + esc(event.energy || '') + '"></label>'
    : '';
  const stateChange = ['start', 'pause', 'resume', 'rearrest', 'end', 'rosc'].includes(event.type);
  const voidControl = stateChange
    ? '<p class="caption">' + T('correctionSheet.stateChangeNote') + '</p>'
    : '<button class="danger primary" data-void="' + esc(id) + '">' + T(event.voided ? 'correctionSheet.restoreButton' : 'correctionSheet.voidButton') + '</button>';
  const eventTime = event.timeUnknown ? '' : local(event.at).slice(11);
  sheet(
    T('correctionSheet.title'),
    '<form id="editForm"><p><b>' + esc(event.title) + '</b></p>' +
      '<label>' + T('forms.eventTimeLabel') + '<input name="at" type="time" step="60" required value="' + eventTime + '"></label>' +
      '<label>' + T('correctionSheet.detailsLabel') + '<textarea rows="1" name="details">' + esc(event.details) + '</textarea></label>' +
      rhythmFields + medicineFields + energyField +
      '<button class="primary" type="submit">' + T('correctionSheet.saveButton') + '</button></form>' +
      '<p class="caption">' + T('correctionSheet.note') + '</p>' + voidControl,
    { kind: 'edit', id },
  );
}

/* Source line linking the current EAS cardiac arrest guideline. */
export function cpgSource() {
  const g = R.RULES.sources.guidelines.cardiacArrest;
  return `<p class="caption">${T('references.cpgSourceLabel', { code: g.code })}<br><a href="${g.web}" target="_blank" rel="noopener">${T('references.currentGuideline', { code: g.code })}</a> · <a href="${g.pdf}#page=${g.offlinePage}" target="_blank">${T('references.offlineGuideline', { code: g.code })}</a></p>`;
}

/* Torsades guideline extract (withhold amiodarone; magnesium IV), reused in several pop-ups. */
export function torsadesSnippet() {
  return `<div class="rhythm-snippet"><h3>${R.guideText('torsadesExtractTitle')}</h3><blockquote>${R.guideText('torsadesExtractQuote')}</blockquote>` +
      `${paras('torsadesExtract')}</div>${cpgSource()}`;
}

/* Fluids guideline extract for a non-shockable rhythm (PEA or asystole; A2c): correct reversible causes; 0.9% sodium chloride IV. Heading is neutral. */
export function peaSnippet() {
  return `<div class="rhythm-snippet"><h3>${R.guideText('fluidsExtractTitle')}</h3><blockquote>${R.guideText('fluidsExtractQuote')}</blockquote>` +
      `${paras('fluidsExtract')}</div>${cpgSource()}`;
}

/* Pop-up for giving magnesium or fluids: guideline extract and calculated amount, then record it. */
export function supportAdministration(type) {
  if (type === 'fluids') {
    const ref = R.fluidReference(st.s);
    const volume = ref.min === null ? T('liveCards.enterWeight') : T('liveCards.volumeMlIv', { min: ref.min, max: ref.max });
    sheet(
      T('administration.fluidsTitle'),
      `${peaSnippet()}<p><b>${volume}</b> · ${formatGuidelineReference(ref.basis)}</p>` +
      paras('fluidsRecordNote'),
    );
    return;
  }
  const ref = R.magnesiumReference(st.s);
  const G = R.RULES.sources.guidelines;
  const dose = ref.dose === null ? R.guideText('magnesiumNoDose') : T('liveCards.doseMmolIv', { dose: ref.dose });
  sheet(
    T('administration.magnesiumTitle'),
    `${torsadesSnippet()}<p><b>${dose}</b> · ${formatGuidelineReference(ref.basis)}</p>` +
    paras('magnesiumHow') +
    `<a href="${G.magnesium.web}" target="_blank" rel="noopener">${T('references.guidelineLink', { code: G.magnesium.code })}</a>` +
    `<p><a href="${G.paediatric.pdf}" target="_blank">${T('references.guidelineLink', { code: G.paediatric.code })}</a></p>`,
  );
}

/* Rhythm choice buttons (VF, pulseless VT, torsades). Despite the name there are no pictures. */
export function rhythmImages() {
  return `<div class="rhythm-image-choices">${Object.entries(R.RULES.wording.shockRhythmButtons)
    .map(([id, title]) => `<button data-record-rhythm="${id}">${title}</button>`)
    .join('')}</div>`;
}

/* Build the plain-text event log (voided entries left out). */
export function exportText() {
  return logRows(false)
    .map(
      (e) =>
        T(e.details ? 'exportRecord.lineWithDetails' : 'exportRecord.line', {
          time: e.timeUnknown ? T('exportRecord.timeUnknown') : time(e.at),
          title: e.title,
          details: e.details,
        }),
    )
    .join('\n');
}

/* Save text as a file named resus-<start time>.<ext>. */
export function download(content, type, ext) {
  const a = document.createElement('a'),
    url = URL.createObjectURL(new Blob([content], { type }));
  a.href = url;
  a.download = T('exportRecord.fileName', { start: new Date(st.s.appStart).toISOString().replace(/[:.]/g, '-'), extension: ext });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Copy the plain-text log to the clipboard. */
export async function copyLog() {
  const text = exportText();
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch {}
  if (!copied) {
    const field = document.createElement('textarea'),
      focus = document.activeElement;
    field.value = text;
    field.readOnly = true;
    field.setAttribute('aria-hidden', 'true');
    Object.assign(field.style, { position: 'fixed', opacity: '0', pointerEvents: 'none' });
    ($('sheet').open ? $('sheet') : document.body).append(field);
    try {
      field.select();
      field.setSelectionRange(0, text.length);
      copied = document.execCommand('copy');
    } catch {
    } finally {
      field.remove();
      focus?.focus();
    }
  }
  toast(T(copied ? 'toasts.recordCopied' : 'toasts.couldNotCopy'));
}

/* "Export event log" pop-up: download or copy the record. */
export function exportSheet() {
  sheet(
    T('exportSheet.title'),
    `<p>${T('exportSheet.intro')}</p>` +
      `<div class="stack"><button data-action="download-text">${T('exportSheet.downloadText')}</button>` +
      `<button data-action="download-json">${T('exportSheet.downloadJson')}</button>` +
      `<button data-action="copy">${T('exportSheet.copyText')}</button></div>` +
      `<p class="caption">${T('exportSheet.note')}</p>`,
  );
}

/* Turn the time typed in a form into a real timestamp (rolls back a day if it would be in the
   future; rejects future times). Returns null and shows an error if invalid. */
export function dateValue(form, now = Date.now()) {
  const entered = form.get('at'),
    unknownEvent =
      st.sheetContext?.kind === 'edit'
        ? st.s.events.find((x) => x.id === st.sheetContext.id && x.timeUnknown)
        : null,
    original =
      st.sheetContext?.kind === 'edit'
        ? st.s.events.find((x) => x.id === st.sheetContext.id)?.at
        : st.sheetContext?.at;
  let at;
  if (unknownEvent) {
    const d = new Date(local(st.s.appStart).slice(0, 10) + 'T' + entered);
    if (d.getTime() >= st.s.appStart) d.setDate(d.getDate() - 1);
    at = d.getTime();
  } else if (original && local(original).slice(11) === entered) at = original;
  else {
    const d = new Date(local(original || now).slice(0, 10) + 'T' + entered);
    if (st.sheetContext?.kind !== 'edit' && d.getTime() > now) d.setDate(d.getDate() - 1);
    at = d.getTime();
  }
  if (!Number.isFinite(at) || at > now + 1000) {
    error(T('errors.timeInFuture'));
    return null;
  }
  return at;
}

/* Typing a weight: show the paediatric pads prompt when needed. */
export function weightChanged() {
  const w = $('weightInput').value.replace(',', '.');
  $('weightPadPrompt').hidden = !R.needsPaediatricPads(w);
  st.sheetContext.source = T('weightSources.entered');
  $('weightBasis').textContent = T('weightSources.entered');
}

/* Explain-me tutorial: remembers how to stop it. */
let explainCleanup = null;

/* Close the tutorial. */
export function stopExplainMe() {
  if (explainCleanup) {
    explainCleanup();
    explainCleanup = null;
  }
}

/* Open the Explain-me tutorial slides. */
export function openExplainMe() {
  const slideMarkup = EXPLAIN_ME_SLIDES.map((item, i) => {
    const instruction = i === EXPLAIN_ME_SLIDES.length - 1
      ? T('tutorial.endNote')
      : T('tutorial.nextNote');
    return `<section class="explain-slide" aria-label="${esc(item.title)}"><h3>${esc(item.title)}</h3>` +
      `<div class="explain-shot"><img src="${item.image}" alt="${esc(item.alt)}"></div>` +
      `<p class="explain-action">${item.action}</p><p class="explain-note">${item.note}</p>` +
      `<small>${instruction}</small></section>`;
  }).join('');
  sheet(
    T('tutorial.title'),
    `<div class="explain-progress" role="progressbar" aria-label="${T('tutorial.progressAria')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="10"><span style="width:10%"></span></div>
 <div class="explain-pages" aria-label="${T('tutorial.slidesAria')}">${slideMarkup}</div>
 <div class="explain-controls"><button type="button" data-explain-prev disabled>${T('tutorial.back')}</button><button type="button" data-explain-next>${T('tutorial.next')}</button></div>`,
    { kind: 'explain-me' },
  );
  const dialog = $('sheet');
  dialog.classList.add('explain-me');
  const pages = dialog.querySelector('.explain-pages'),
    slides = [...pages.children],
    progress = dialog.querySelector('.explain-progress'),
    bar = progress.firstElementChild,
    prev = dialog.querySelector('[data-explain-prev]'),
    next = dialog.querySelector('[data-explain-next]');
  let currentIndex = 0;
  function updateProgress(i) {
    currentIndex = i;
    const amount = ((i + 1) / slides.length) * 100;
    bar.style.width = amount + '%';
    progress.setAttribute('aria-valuenow', amount);
    prev.disabled = i === 0;
    next.textContent = i === slides.length - 1 ? T('tutorial.done') : T('tutorial.next');
  }
  function scrollToSlide(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    pages.scrollTo({
      top: slides[i].offsetTop - slides[0].offsetTop,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }
  prev.addEventListener('click', () => scrollToSlide(currentIndex - 1));
  next.addEventListener('click', () =>
    currentIndex === slides.length - 1 ? closeSheet() : scrollToSlide(currentIndex + 1),
  );
  const onScroll = () => {
    const line = pages.scrollTop + pages.clientHeight * 0.35;
    let current = 0;
    slides.forEach((slide, i) => {
      if (slide.offsetTop - slides[0].offsetTop <= line) current = i;
    });
    updateProgress(current);
  };
  pages.addEventListener('scroll', onScroll, { passive: true });
  explainCleanup = () => pages.removeEventListener('scroll', onScroll);
  dialog.addEventListener('cancel', stopExplainMe, { once: true });
}
