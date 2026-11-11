/* Pop-up sheets for weight, rhythm, drugs, equipment, notes, correction,
   export, settings and the tutorial. Shared state lives in st (see state.js). */
import { $, R, paras } from './base.js';
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
import { ARREST_EQUIPMENT, ARREST_SITES, CARDIAC_CPG, CAUSES, COLOURS, EXPLAIN_ME_SLIDES, MAGNESIUM_CPG } from './data.js';
import { finished, logRows, st, torsades } from './state.js';

/* Open the pop-up with a title and content. ctx records what the pop-up is for (st.sheetContext). */
export function sheet(title, html, ctx = {}) {
  if (typeof stopExplainMe === 'function') stopExplainMe();
  $('sheet').className = '';
  st.sheetContext = ctx;
  $('sheet').innerHTML =
    `<div class="sheet-heading"><h2 id="sheetTitle">${title}</h2><button data-close aria-label="Close dialog">×</button></div>` +
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
  const labels = {
    shock: 'Record shock delivered',
    noshock: 'Record no-shock cycle',
    rosc: 'Record ROSC',
  };
  const options = R.RULES.numbers.rhythms[outcome];
  const isShock = outcome === 'shock';
  const energy = isShock
    ? '<label>Energy delivered (J) · optional<input id="shockEnergy" type="number" inputmode="numeric" min="1" max="' + R.RULES.numbers.shock.maxRecordableJ + '" value="' + (R.shockEnergy(st.s) ?? '') + '" placeholder="Not recorded"></label>'
    : '';
  const rhythms = isShock
    ? rhythmImages()
    : `<div class="choice-grid">${options.map((r) => `<button data-record-rhythm="${r}">${r === 'VT' ? 'Pulseless VT' : r}</button>`).join('')}</div>`;
  sheet(labels[outcome], energy + rhythms, {
    kind: 'rhythm',
    outcome,
    eventId: st.s.pendingRhythm?.outcome === outcome ? st.s.pendingRhythm.id : null,
  });
}

/* Pop-up to enter or change patient weight. */
export function openWeight() {
  const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']
    .map((key) => `<button data-key="${key}" aria-label="${key === '⌫' ? 'Delete digit' : key}">${key}</button>`)
    .join('');
  sheet(
    'Patient weight',
    `<label>Weight (kg)<input id="weightInput" type="text" inputmode="decimal" value="${esc(st.s.weight)}" autocomplete="off"></label>` +
      `<div class="number-pad">${numberKeys}</div>` +
      `<details><summary>Estimate weight from age</summary><label>Age in years<input id="ageInput" type="number" inputmode="decimal" min="0.01" max="${R.RULES.numbers.ageEstimate.elevenToFourteenYears.maxAge}" step="any" value="${esc(st.s.age)}"></label>` +
      `<button data-action="estimate">Use age estimate</button><p class="caption">${R.wording('weightSheetAgeEstimate', R.ageEstimateGaps())}</p></details>` +
      `<p id="weightBasis" class="caption">${esc(st.s.weightSource)}</p>` +
      `<p id="weightPadPrompt" class="pads-entry" ${R.needsPaediatricPads(st.s.weight) ? '' : 'hidden'}>▰ ▰ ${R.guideText('padsPromptWithLimit')}</p>` +
      `<button class="primary" data-action="save-weight">Use weight</button>`,
    { kind: 'weight', source: st.s.weightSource, replaceWeight: !!st.s.weight },
  );
}

/* "Rhythm check" pop-up: choose the observed outcome (only when a rhythm check is allowed). */
export function openRhythmCheck() {
  if (!R.canRhythmCheck(st.s)) return;
  sheet(
    'Rhythm check',
    `<p class="caption">Choose the observed outcome.</p>` +
      `<div class="rhythm-outcomes"><button class="shock" data-outcome="shock"><span aria-hidden="true">ϟ</span><b>Shock</b><small>Record delivered</small></button>` +
      `<button data-outcome="noshock"><span aria-hidden="true">⊘</span><b>No shock</b></button>` +
      `<button class="rosc" data-outcome="rosc"><span aria-hidden="true">♡</span><b>ROSC</b></button></div>`,
  );
}

/* "When did resus start?" pop-up (the app session clock is unchanged). */
export function openResusTime() {
  const earlierChoices = [5, 10, 15, 20]
    .map((minutes) => `<button data-earlier="${minutes}">${minutes} min<small>before app opened</small></button>`)
    .join('');
  sheet(
    'When did resus start?',
    `<p>The app session clock stays unchanged.</p><label>Resuscitation started<input id="resusStartInput" type="datetime-local" step="60" value="${local(st.s.resusStart)}" max="${local(st.s.appStart)}"></label>` +
      `<div class="choice-grid">${earlierChoices}</div>` +
      `<p class="caption">Resus duration is elapsed clock time from this start, including pauses. It freezes at ROSC or session end.</p>` +
      `<button class="primary" data-action="save-resus-time">Save start time</button>`,
  );
}

/* "Session & display" pop-up: tutorial, undo, large text and other session settings. */
export function openSettings() {
  sheet(
    'Session & display',
    `<div class="stack"><button data-action="explain-me">Tutorial</button>` +
      `<button id="undo" ${st.s.undo.length ? '' : 'disabled'}>↶ Undo last action</button>` +
      `<button data-action="large">${st.s.largeText ? '✓ Larger text on' : 'Larger text'}</button>` +
      `<button data-action="wake">${st.wakeLock ? '✓ Screen kept awake' : 'Keep screen awake'}</button>` +
      `<button data-action="install">Add to home screen</button>` +
      `<button data-action="history">Earlier shocks / doses / cycles</button>` +
      `<button data-action="resus-time">Edit resus start</button>` +
      `<button data-action="guidance">Clinical guidance & sources</button>` +
      `<button data-action="export">Export event log</button></div>` +
      `<label><input id="specialInput" type="checkbox" ${st.s.special ? 'checked' : ''}>Special situation · disable routine dose prompts</label><p class="caption">Use specific guidance for trauma, hypothermia, pregnancy, toxins and other special situations.</p>` +
      `<div class="stack"><button class="danger" data-action="end" ${finished() ? 'disabled' : ''}>End resuscitation session</button>` +
      `<button class="danger" data-action="new">New patient / clear session</button></div>` +
      `<p class="caption" id="offlineState">${navigator.onLine ? 'Online' : 'Offline'} · Events are saved in this browser on this device. App session time includes background time and continues after refresh. Export before clearing browser data.</p>`,
  );
}

/* "Events before this app" pop-up: earlier shocks / no-shock cycles entered as counts only. */
export function openHistory() {
  const priorAmiodaroneOptions = [...Array(R.RULES.numbers.amiodarone.dueAtShocks.length + 1).keys()] // 0 up to the most doses
    .map((count) => `<option ${st.s.priorAmio === count ? 'selected' : ''}>${count}</option>`)
    .join('');
  sheet(
    'Events before this app',
    `<p class="caption">These counts are added to events logged here. They do not create administration timestamps.</p><label>Prior shocks<input id="priorShocks" type="number" inputmode="numeric" min="0" max="100" value="${st.s.priorShocks}"></label>` +
      `<label>Prior no-shock cycles · total<input id="priorNoShock" type="number" inputmode="numeric" min="0" max="100" value="${st.s.priorNoShock}"></label>` +
      `<label>Prior consecutive no-shock cycles since last shock<input id="priorStreak" type="number" inputmode="numeric" min="0" max="100" value="${st.s.priorStreak}"></label>` +
      `<label>Prior amiodarone doses<select id="priorAmio">${priorAmiodaroneOptions}</select></label>` +
      `<button class="primary" data-action="save-history">Save earlier counts</button>` +
      `<button class="primary" data-custom-drug="adrenaline">Record an earlier adrenaline dose</button>`,
  );
}

/* Reference pop-up for a drug's dose (adrenaline, amiodarone); magnesium and fluids use supportAdministration. */
export function administration(type) {
  if (['magnesium', 'fluids'].includes(type)) return supportAdministration(type);
  const d = R.dose(st.s);
  const adrenaline = type === 'adrenaline';
  let doseText = R.guideText('noWeightDoseReference');
  if (d) {
    if (adrenaline) doseText = d.adr + ' mg IV';
    else if (R.isPaediatric(st.s)) doseText = R.guideText('amiodaroneChildPopupDose', { first: d.amio1 });
    else doseText = R.guideText('amiodaroneAdultPopupDose', { first: d.amio1, second: d.amio2 });
    doseText = esc(doseText);
  }
  const instructions = paras(adrenaline ? 'adrenalineHow' : 'amiodaroneHow');
  const guideline = adrenaline ? '14.3' : '14.4';
  const pdf = adrenaline ? 'eas-14-3' : 'eas-14-4';
  sheet(
    adrenaline ? 'Adrenaline · reference' : 'Amiodarone · reference',
    `<p><b>${doseText}</b></p>` +
      `<p class="caption">${d ? formatGuidelineReference(d.basis) : R.guideText('referenceOnly')}</p>` +
      `${instructions}<a href="cpg-drugs/${pdf}.pdf" target="_blank" rel="noopener"><em>EAS guideline ${guideline}</em> ↗</a>` +
      `<p class="caption">${R.guideText('drugPopupFooter', { guideline })}</p>`,
  );
}

/* Names prefilled by the card's Other… button; an unrecognised type opens
   a blank medicine field for manual entry. */
function medicineEntryName(type) {
  switch (type) {
    case 'adrenaline': return 'Adrenaline';
    case 'amiodarone': return 'Amiodarone';
    case 'magnesium': return 'Magnesium';
    case 'fluids': return R.RULES.numbers.products.fluid;
    default: return '';
  }
}

/* Pop-up to record a drug administration (dose, time, notes). */
export function openDrug(type) {
  const name = medicineEntryName(type);
  const now = Date.now();
  const defaultUnit = type === 'magnesium' ? 'mmol' : type === 'fluids' ? 'mL' : 'mg';
  const units = ['mg', 'mcg', 'mmol', 'mL', 'g']
    .map((unit) => `<option ${unit === defaultUnit ? 'selected' : ''}>${unit}</option>`).join('');
  const route = ['magnesium', 'fluids'].includes(type) ? 'IV' : '';
  const torsadesWarning = type === 'amiodarone' && torsades()
    ? `<p class="error">${R.guideText('amiodaroneAfterTorsadesWarning')}</p>`
    : '';
  sheet(
    'Record ' + (name || 'medicine'),
    `<form id="drugForm"><label>Medicine<input name="name" value="${name}" required></label>` +
      `<div class="inline-two"><label>Actual dose<input name="dose" type="number" inputmode="decimal" min="0.001" step="any" required placeholder="Dose given"></label>` +
      `<label>Unit<select name="unit">${units}</select></label></div>` +
      toggleField('route', 'Route', ['IV', 'IO', 'IM', 'Other'], route) +
      `<label>Given at<input name="at" type="time" step="60" value="${local(now).slice(11)}" required></label>` +
      `<label>Notes<input name="notes" placeholder="Optional"></label>` +
      `<button class="primary" type="submit">Record actual administration</button></form>${torsadesWarning}`,
    { kind: 'drug', type, at: now },
  );
}

/* C6b-2 (owner ruling 3 Nov 2026, option A): child second amiodarone dose before 6 shocks. No dose is suggested or
   pre-filled; the clinician types the mg actually given. Submits through the normal drugForm handler. */
export function openSelectDose() {
  const now = Date.now();
  sheet(
    'Select amiodarone dose',
    `<p>${R.guideText('selectDoseAdvice')}</p>` +
      `<form id="drugForm"><input type="hidden" name="name" value="Amiodarone">` +
      `<input type="hidden" name="unit" value="mg"><input type="hidden" name="route" value="IV">` +
      `<label>Dose given (mg IV)<input name="dose" type="number" inputmode="decimal" min="0.001" step="any" required placeholder="mg"></label>` +
      `<label>Given at<input name="at" type="time" step="60" value="${local(now).slice(11)}" required></label>` +
      `<button class="primary" type="submit">Record dose</button></form>`,
    { kind: 'drug', type: 'amiodarone', at: now },
  );
}

/* Pop-up listing the airway and/or access options to choose from. */
export function openInterventions(group) {
  sheet(
    group === 'airway' ? 'Airway' : group === 'access' ? 'Access' : 'Airway / access',
    `<div class="choice-grid">${Object.entries(ARREST_EQUIPMENT)
      .filter(
        ([k]) =>
          !group || (group === 'access' ? ['iv', 'io'].includes(k) : !['iv', 'io'].includes(k)),
      )
      .map(([k, e]) => `<button data-equipment="${k}">${e.name}</button>`)
      .join('')}</div>`,
    { kind: 'interventions' },
  );
}

/* Size choice buttons for a device type. */
export function colourSizes(type, values) {
  const legend = type === 'iv' ? 'Cannula size' : 'Size';
  const suffix = type === 'iv' ? 'G' : '';
  const options = values.map((v) => {
    const colour = COLOURS[type]?.[v] || '#ccd9d3';
    return `<label class="toggle"><input type="radio" name="size" aria-label="${v}${suffix}" value="${v}">` +
      `<span style="--size-colour:${colour}">${v}${suffix}</span></label>`;
  }).join('');
  return `<fieldset class="toggles size-options"><legend>${legend}</legend>${options}</fieldset>`;
}

/* Size options for a device type: tube-size grid for intubation, otherwise size buttons. */
export function sizeFields(type) {
  const sizes = ARREST_EQUIPMENT[type].sizes;
  if (type === 'iv') return colourSizes(type, sizes);
  if (type === 'intubation') {
    const options = sizes.map((v) =>
      `<label class="toggle"><input type="radio" name="size" value="${v}" aria-label="${v} mm">` +
      `<span>${v}<small>mm</small></span></label>`,
    ).join('');
    return `<fieldset class="toggles tube-options"><legend>Tube size (mm)</legend>` +
      `<div class="tube-grid">${options}</div></fieldset>`;
  }
  return colourSizes(type, sizes);
}

/* Side (left / right) and location choices for IV or IO access. */
export function sitePicker(type) {
  return (
    toggleField('side', 'Side', ['Left', 'Right']) +
    toggleField('site', 'Location', ARREST_SITES[type]).replace(
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
  const deviceFields = isLaryngoscopy
    ? toggleField('method', 'Laryngoscopy', ['Video', 'Direct']) +
      '<div id="bladeChoices"><p class="caption">Choose video or direct to show blade sizes.</p></div>' +
      toggleField('forceps', 'Magill forceps', ['Used', 'Not used']) +
      toggleField('view', 'View', ['Grade I', 'Grade IIa', 'Grade IIb', 'Grade III', 'Grade IV', 'No view'])
    : sizeFields(type);
  const accessFields = ['iv', 'io'].includes(type) ? sitePicker(type) : '';
  const intubationFields = type === 'intubation'
    ? toggleField('adjunct', 'Introducer', ['Bougie', 'Stylet']) +
      '<label>Length at lips (cm)<input name="lips" type="number" min="1" max="50" inputmode="decimal" step="any"></label><fieldset class="toggles"><legend>Confirmed with</legend>' +
      ['Waveform capnography', 'Visualised through cords', 'Chest rise', 'Auscultation']
        .map((x) => `<label><input name="confirmation" type="checkbox" value="${x}">${x}</label>`).join('') +
      '</fieldset>'
    : '';
  const outcomeFields = isLaryngoscopy ? '' : toggleField('outcome', 'Outcome', ['Successful', 'Unsuccessful']);
  const followUp = isLaryngoscopy
    ? '<button class="primary" type="submit" name="followUp" value="intubation">Record Laryngoscopy and add Intubation</button>'
    : '';
  sheet(
    ARREST_EQUIPMENT[type].name,
    `<form id="equipmentForm">${deviceFields}${accessFields}${intubationFields}${outcomeFields}<label>Time<input name="at" type="time" step="60" required value="${local(now).slice(11)}"></label>` +
      `<label>Notes<textarea rows="1" name="notes" placeholder="Optional"></textarea></label>` +
      `<div class="equipment-record-actions"><button class="primary" type="submit">Record ${ARREST_EQUIPMENT[type].name}</button>${followUp}</div></form>`,
    { kind: 'equipment', type, at: now },
  );
  enhanceEquipment();
}

/* Pop-up to record a free-text event (or another medicine). */
export function openNote() {
  const now = Date.now();
  sheet(
    'Record another event',
    `<form id="noteForm"><label>Event<textarea rows="1" name="text" required placeholder="What happened?"></textarea></label>` +
      `<label>Event time<input name="at" type="time" step="60" required value="${local(now).slice(11)}"></label>` +
      `<button class="primary" type="submit">Record event</button></form>` +
      `<button class="primary" data-custom-drug="other">Record another medicine</button>`,
    { kind: 'note', at: now },
  );
}

/* "Correct event" pop-up: change a logged event's time or details. */
export function editEvent(id) {
  const event = st.s.events.find((entry) => entry.id === id);
  if (!event) return;

  // A correction can change only the rhythms appropriate to that event type.
  let rhythms = [];
  if (event.type === 'shock') rhythms = ['Unknown', 'VF', 'VT', 'Torsades'];
  else if (event.type === 'noshock') rhythms = ['PEA', 'Asystole', 'Other', 'Unknown'];
  else if (event.type === 'rosc') rhythms = ['Sinus rhythm', 'Organised rhythm', 'AF', 'Other', 'Unknown'];
  else if (event.type === 'rhythm') rhythms = ['VF', 'VT', 'Torsades', 'PEA', 'Asystole', 'Sinus rhythm', 'Organised rhythm', 'AF', 'Other', 'Unknown'];
  const rhythmOptions = rhythms.map((rhythm) =>
    '<option ' + (event.rhythm === rhythm ? 'selected' : '') + '>' + rhythm + '</option>',
  ).join('');
  const rhythmFields = rhythms.length
    ? '<label>Rhythm<select name="rhythm">' + rhythmOptions + '</select></label>'
    : '';
  const medicineFields = ['adrenaline', 'amiodarone', 'magnesium', 'fluids', 'medicine'].includes(event.type)
    ? '<div class="inline-two"><label>Actual dose<input name="dose" type="number" step="any" min="0.001" value="' + esc(event.dose || '') + '" required></label>' +
      '<label>Unit<input name="unit" value="' + esc(event.unit || 'mg') + '" required></label></div>' +
      '<label>Route<input name="route" value="' + esc(event.route || 'IV') + '" required></label>'
    : '';
  const energyField = event.type === 'shock'
    ? '<label>Energy (J)<input name="energy" type="number" min="1" max="' + R.RULES.numbers.shock.maxRecordableJ + '" inputmode="numeric" value="' + esc(event.energy || '') + '"></label>'
    : '';
  const stateChange = ['start', 'pause', 'resume', 'rearrest', 'end', 'rosc'].includes(event.type);
  const voidControl = stateChange
    ? '<p class="caption">To reverse a session state change, use Undo. State events cannot be voided here.</p>'
    : '<button class="danger primary" data-void="' + esc(id) + '">' + (event.voided ? 'Restore event' : 'Void event · keep audit record') + '</button>';
  const eventTime = event.timeUnknown ? '' : local(event.at).slice(11);
  sheet(
    'Correct event',
    '<form id="editForm"><p><b>' + esc(event.title) + '</b></p>' +
      '<label>Event time<input name="at" type="time" step="60" required value="' + eventTime + '"></label>' +
      '<label>Recorded details<textarea rows="1" name="details">' + esc(event.details) + '</textarea></label>' +
      rhythmFields + medicineFields + energyField +
      '<button class="primary" type="submit">Save correction</button></form>' +
      '<p class="caption">Corrections update counters and medicine review clocks. They do not restart a CPR cycle. Original values are retained in JSON export.</p>' + voidControl,
    { kind: 'edit', id },
  );
}

/* Source line linking the current EAS cardiac arrest guideline. */
export function cpgSource() {
  return `<p class="caption">NZCPG <em>EAS guideline 3.14</em><br><a href="${CARDIAC_CPG}" target="_blank" rel="noopener">Current <em>EAS guideline 3.14</em> ↗</a> · <a href="cpg-cardiac-arrest.pdf#page=2" target="_blank">Offline <em>EAS guideline 3.14</em> ↗</a></p>`;
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
    const volume = ref.min === null ? 'Enter weight' : ref.min + '–' + ref.max + ' mL IV';
    sheet(
      'Fluids · administration',
      `${peaSnippet()}<p><b>${volume}</b> · ${formatGuidelineReference(ref.basis)}</p>` +
      paras('fluidsRecordNote'),
    );
    return;
  }
  const ref = R.magnesiumReference(st.s);
  const dose = ref.dose === null ? R.guideText('magnesiumNoDose') : ref.dose + ' mmol IV';
  sheet(
    'Magnesium · administration',
    `${torsadesSnippet()}<p><b>${dose}</b> · ${formatGuidelineReference(ref.basis)}</p>` +
    paras('magnesiumHow') +
    `<a href="${MAGNESIUM_CPG}" target="_blank" rel="noopener"><em>EAS guideline 14.27</em> ↗</a>` +
    `<p><a href="cpg-paediatric-equipment.pdf" target="_blank"><em>EAS guideline 7.2</em> ↗</a></p>`,
  );
}

/* Rhythm choice buttons (VF, pulseless VT, torsades). Despite the name there are no pictures. */
export function rhythmImages() {
  return `<div class="rhythm-image-choices">${[
    ['VF', 'Ventricular fibrillation'],
    ['VT', 'Pulseless VT'],
    ['Torsades', 'Torsades de pointes'],
  ]
    .map(([id, title]) => `<button data-record-rhythm="${id}">${title}</button>`)
    .join('')}</div>`;
}

/* Build the plain-text event log (voided entries left out). */
export function exportText() {
  return logRows(false)
    .map(
      (e) =>
        (e.timeUnknown ? 'Before app · time not set' : time(e.at)) +
        ' ' +
        e.title +
        (e.details ? ' — ' + e.details : ''),
    )
    .join('\n');
}

/* Save text as a file named resus-<start time>.<ext>. */
export function download(content, type, ext) {
  const a = document.createElement('a'),
    url = URL.createObjectURL(new Blob([content], { type }));
  a.href = url;
  a.download = 'resus-' + new Date(st.s.appStart).toISOString().replace(/[:.]/g, '-') + '.' + ext;
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
  toast(copied ? 'Record copied' : 'Could not copy. Try again in your phone browser.');
}

/* "Export event log" pop-up: download or copy the record. */
export function exportSheet() {
  sheet(
    'Export event log',
    `<p>Save the record before starting a new patient or clearing browser data.</p>` +
      `<div class="stack"><button data-action="download-text">Download text record</button>` +
      `<button data-action="download-json">Download complete JSON + audit</button>` +
      `<button data-action="copy">Copy text record</button></div>` +
      `<p class="caption">Text export follows the current log filters, with hh:mm:ss and key details. Complete JSON retains all events, dates, timezone and audit history. Records stay on this device unless you export or share them.</p>`,
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
    error('Enter a valid time that is not in the future.');
    return null;
  }
  return at;
}

/* Typing a weight: show the paediatric pads prompt when needed. */
export function weightChanged() {
  const w = $('weightInput').value.replace(',', '.');
  $('weightPadPrompt').hidden = !R.needsPaediatricPads(w);
  st.sheetContext.source = 'Entered';
  $('weightBasis').textContent = 'Entered';
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
      ? 'End of tutorial · scroll up to revisit a step'
      : 'Scroll down for the next step ↓';
    return `<section class="explain-slide" aria-label="${esc(item.title)}"><h3>${esc(item.title)}</h3>` +
      `<div class="explain-shot"><img src="${item.image}" alt="${esc(item.alt)}"></div>` +
      `<p class="explain-action">${item.action}</p><p class="explain-note">${item.note}</p>` +
      `<small>${instruction}</small></section>`;
  }).join('');
  sheet(
    'Tutorial',
    `<div class="explain-progress" role="progressbar" aria-label="Tutorial progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="10"><span style="width:10%"></span></div>
 <div class="explain-pages" aria-label="Scrollable tutorial slides">${slideMarkup}</div>
 <div class="explain-controls"><button type="button" data-explain-prev disabled>← Back</button><button type="button" data-explain-next>Next ↓</button></div>`,
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
    next.textContent = i === slides.length - 1 ? 'Done' : 'Next ↓';
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
