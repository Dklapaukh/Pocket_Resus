/* Pop-up sheets (weight, rhythm, drugs, equipment, notes, edit, export, settings, explain-me).
   Logic is the same as the original app files; shared memory lives in st (see state.js). */
import { $, R } from './base.js';
import {
  compactOptionalFields,
  esc,
  fitNotes,
  formatGuidelineReference,
  local,
  normalizeGuidelineReferences,
  time,
} from './format.js';
import { logRows, rhythmImages, supportAdministration } from './views.js';
import { finished, toast, torsades } from './session.js';
import { ARREST_EQUIPMENT, ARREST_SITES, CAUSES, COLOURS, EXPLAIN_ME_SLIDES } from './data.js';
import { st } from './state.js';

/* Open the pop-up with a title and content. ctx records what the pop-up is for (st.sheetContext). */
export function sheet(title, html, ctx = {}) {
  if (typeof stopExplainMe === 'function') stopExplainMe();
  $('sheet').className = '';
  st.sheetContext = ctx;
  $('sheet').innerHTML =
    `<div class="sheet-heading"><h2 id="sheetTitle">${title}</h2><button data-close aria-label="Close dialog">×</button></div><div class="sheet-content">${html}<p id="sheetError" class="error" role="alert" hidden></p></div>`;
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
  return `<fieldset class="toggles"><legend>${label}</legend>${values.map((v) => `<label class="toggle"><input type="radio" name="${name}" value="${esc(v)}" aria-label="${esc(v)}" ${v === value ? 'checked' : ''}><span>${esc(v)}</span></label>`).join('')}</fieldset>`;
}

/* Pop-up to record a shock, no-shock cycle or ROSC: choose the rhythm (and energy for a shock). */
export function openRhythm(outcome) {
  const labels = {
      shock: 'Record shock delivered',
      noshock: 'Record no-shock cycle',
      rosc: 'Record ROSC',
    },
    opts =
      outcome === 'shock'
        ? ['VF', 'VT', 'Torsades']
        : outcome === 'noshock'
          ? ['PEA', 'Asystole', 'Other', 'Unknown']
          : ['Sinus rhythm', 'Organised rhythm', 'AF', 'Other', 'Unknown'];
  sheet(
    labels[outcome],
    `${outcome === 'shock' ? '<label>Energy delivered (J) · optional<input id="shockEnergy" type="number" inputmode="numeric" min="1" max="1000" value="' + (R.shockEnergy(st.s) ?? '') + '" placeholder="Not recorded"></label>' : ''}${outcome === 'shock' ? rhythmImages() : `<div class="choice-grid">${opts.map((r) => `<button data-record-rhythm="${r}">${r === 'VT' ? 'Pulseless VT' : r}</button>`).join('')}</div>`}`,
    {
      kind: 'rhythm',
      outcome,
      eventId: st.s.pendingRhythm?.outcome === outcome ? st.s.pendingRhythm.id : null,
    },
  );
}

/* Pop-up to enter or change patient weight. */
export function openWeight() {
  sheet(
    'Patient weight',
    `<label>Weight (kg)<input id="weightInput" type="text" inputmode="decimal" value="${esc(st.s.weight)}" autocomplete="off"></label><div class="number-pad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => `<button data-key="${k}" aria-label="${k === '⌫' ? 'Delete digit' : k}">${k}</button>`).join('')}</div><details><summary>Estimate weight from age</summary><label>Age in years<input id="ageInput" type="number" inputmode="decimal" min="0.01" max="14" step="any" value="${esc(st.s.age)}"></label><button data-action="estimate">Use age estimate</button><p class="caption">Under 1 year: 5 kg. 1–10 years: (age + 4) × 2. 11–14: age × 3. CPG 7.2; estimates may underestimate. Excludes newborn resuscitation.</p></details><p id="weightBasis" class="caption">${esc(st.s.weightSource)}</p><p id="weightPadPrompt" class="pads-entry" ${R.needsPaediatricPads(st.s.weight) ? '' : 'hidden'}>▰ ▰ Use paediatric pads · 100 J or less</p><button class="primary" data-action="save-weight">Use weight</button>`,
    { kind: 'weight', source: st.s.weightSource, replaceWeight: !!st.s.weight },
  );
}

/* "Rhythm check" pop-up: choose the observed outcome (only when a rhythm check is allowed). */
export function openRhythmCheck() {
  if (!R.canRhythmCheck(st.s)) return;
  sheet(
    'Rhythm check',
    `<p class="caption">Choose the observed outcome.</p><div class="rhythm-outcomes"><button class="shock" data-outcome="shock"><span aria-hidden="true">ϟ</span><b>Shock</b><small>Record delivered</small></button><button data-outcome="noshock"><span aria-hidden="true">⊘</span><b>No shock</b></button><button class="rosc" data-outcome="rosc"><span aria-hidden="true">♡</span><b>ROSC</b></button></div>`,
  );
}

/* "When did resus start?" pop-up (the app session clock is unchanged). */
export function openResusTime() {
  sheet(
    'When did resus start?',
    `<p>The app session clock stays unchanged.</p><label>Resuscitation started<input id="resusStartInput" type="datetime-local" step="60" value="${local(st.s.resusStart)}" max="${local(st.s.appStart)}"></label><div class="choice-grid">${[5, 10, 15, 20].map((m) => `<button data-earlier="${m}">${m} min<small>before app opened</small></button>`).join('')}</div><p class="caption">Resus duration is elapsed clock time from this start, including pauses. It freezes at ROSC or session end.</p><button class="primary" data-action="save-resus-time">Save start time</button>`,
  );
}

/* "Session & display" pop-up: tutorial, undo, large text and other session settings. */
export function openSettings() {
  sheet(
    'Session & display',
    `<div class="stack"><button data-action="explain-me">Tutorial</button><button id="undo" ${st.s.undo.length ? '' : 'disabled'}>↶ Undo last action</button><button data-action="large">${st.s.largeText ? '✓ Larger text on' : 'Larger text'}</button><button data-action="wake">${st.wakeLock ? '✓ Screen kept awake' : 'Keep screen awake'}</button><button data-action="install">Add to home screen</button><button data-action="history">Earlier shocks / doses / cycles</button><button data-action="resus-time">Edit resus start</button><button data-action="guidance">Clinical guidance & sources</button><button data-action="export">Export event log</button></div><label><input id="specialInput" type="checkbox" ${st.s.special ? 'checked' : ''}>Special situation · disable routine dose prompts</label><p class="caption">Use specific guidance for trauma, hypothermia, pregnancy, toxins and other special situations.</p><div class="stack"><button class="danger" data-action="end" ${finished() ? 'disabled' : ''}>End resuscitation session</button><button class="danger" data-action="new">New patient / clear session</button></div><p class="caption" id="offlineState">${navigator.onLine ? 'Online' : 'Offline'} · Events are saved in this browser on this device. App session time includes background time and continues after refresh. Export before clearing browser data.</p>`,
  );
}

/* "Events before this app" pop-up: earlier shocks / no-shock cycles entered as counts only. */
export function openHistory() {
  sheet(
    'Events before this app',
    `<p class="caption">These counts are added to events logged here. They do not create administration timestamps.</p><label>Prior shocks<input id="priorShocks" type="number" inputmode="numeric" min="0" max="100" value="${st.s.priorShocks}"></label><label>Prior no-shock cycles · total<input id="priorNoShock" type="number" inputmode="numeric" min="0" max="100" value="${st.s.priorNoShock}"></label><label>Prior consecutive no-shock cycles since last shock<input id="priorStreak" type="number" inputmode="numeric" min="0" max="100" value="${st.s.priorStreak}"></label><label>Prior amiodarone doses<select id="priorAmio">${[0, 1, 2].map((n) => `<option ${st.s.priorAmio === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label><button class="primary" data-action="save-history">Save earlier counts</button><button class="primary" data-custom-drug="adrenaline">Record an earlier adrenaline dose</button>`,
  );
}

/* Reference pop-up for a drug's dose (adrenaline, amiodarone); magnesium and fluids use supportAdministration. */
export function administration(type) {
  if (['magnesium', 'fluids'].includes(type)) return supportAdministration(type);
  const d = R.dose(st.s);
  sheet(
    type === 'adrenaline' ? 'Adrenaline · reference' : 'Amiodarone · reference',
    `<p><b>${d ? esc(type === 'adrenaline' ? d.adr + ' mg IV' : R.isPaediatric(st.s) ? d.amio1 + ' mg IV first; second dose: seek clinical advice' : d.amio1 + ' mg IV first; ' + d.amio2 + ' mg IV second') : 'Enter child weight for reference'}</b></p><p class="caption">${d ? formatGuidelineReference(d.basis) : 'Reference only'}</p>${type === 'adrenaline' ? '<p>NZCPG cardiac arrest: every 4 minutes. Adults and children rounded to 50 kg or more: IV bolus, undiluted.</p><p>Children rounded to 40 kg or less: dilute 1 mg to a total of 10 mL with 0.9% sodium chloride (0.1 mg/mL). Draw up the dose and give as an IV bolus.</p>' : '<p>IV bolus, undiluted. For persistent VF / pulseless VT: first dose after 3 shocks, second after 6 shocks, including earlier shocks.</p><p><b>Withhold if torsades is present or has occurred.</b></p>'}<a href="cpg-drugs/${type === 'adrenaline' ? 'eas-14-3' : 'eas-14-4'}.pdf" target="_blank" rel="noopener"><em>EAS guideline ${type === 'adrenaline' ? '14.3' : '14.4'}</em> ↗</a><p class="caption">NZCPG EAS ${type === 'adrenaline' ? '14.3' : '14.4'} and EAS 3.14. Reference values do not record administration.</p>`,
  );
}

/* Pop-up to record a drug administration (dose, time, notes). */
export function openDrug(type) {
  const name =
      type === 'adrenaline'
        ? 'Adrenaline'
        : type === 'amiodarone'
          ? 'Amiodarone'
          : type === 'magnesium'
            ? 'Magnesium'
            : type === 'fluids'
              ? '0.9% sodium chloride'
              : '',
    now = Date.now();
  sheet(
    'Record ' + (name || 'medicine'),
    `<form id="drugForm"><label>Medicine<input name="name" value="${name}" required></label><div class="inline-two"><label>Actual dose<input name="dose" type="number" inputmode="decimal" min="0.001" step="any" required placeholder="Dose given"></label><label>Unit<select name="unit">${['mg', 'mcg', 'mmol', 'mL', 'g'].map((u) => `<option ${u === (type === 'magnesium' ? 'mmol' : type === 'fluids' ? 'mL' : 'mg') ? 'selected' : ''}>${u}</option>`).join('')}</select></label></div>${toggleField('route', 'Route', ['IV', 'IO', 'IM', 'Other'], ['magnesium', 'fluids'].includes(type) ? 'IV' : '')}<label>Given at<input name="at" type="time" step="60" value="${local(now).slice(11)}" required></label><label>Notes<input name="notes" placeholder="Optional"></label><button class="primary" type="submit">Record actual administration</button></form>${type === 'amiodarone' && torsades() ? '<p class="error">Torsades has occurred. CPG advises withholding amiodarone. This form records an actual event, not a recommendation.</p>' : ''}`,
    { kind: 'drug', type, at: now },
  );
}

/* C6b-2 (owner ruling 3 Nov 2026, option A): child second amiodarone dose before 6 shocks. No dose is suggested or
   pre-filled; the clinician types the mg actually given. Submits through the normal drugForm handler. */
export function openSelectDose() {
  const now = Date.now();
  sheet(
    'Select amiodarone dose',
    `<p><b>Seek clinical advice.</b> No second-dose value is suggested for a child. Enter the dose given.</p><form id="drugForm"><input type="hidden" name="name" value="Amiodarone"><input type="hidden" name="unit" value="mg"><input type="hidden" name="route" value="IV"><label>Dose given (mg IV)<input name="dose" type="number" inputmode="decimal" min="0.001" step="any" required placeholder="mg"></label><label>Given at<input name="at" type="time" step="60" value="${local(now).slice(11)}" required></label><button class="primary" type="submit">Record dose</button></form>`,
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
  return `<fieldset class="toggles size-options"><legend>${type === 'iv' ? 'Cannula size' : 'Size'}</legend>${values.map((v) => `<label class="toggle"><input type="radio" name="size" aria-label="${v}${type === 'iv' ? 'G' : ''}" value="${v}"><span style="--size-colour:${COLOURS[type]?.[v] || '#ccd9d3'}">${v}${type === 'iv' ? 'G' : ''}</span></label>`).join('')}</fieldset>`;
}

/* Size options for a device type: tube-size grid for intubation, otherwise size buttons. */
export function sizeFields(type) {
  const sizes = ARREST_EQUIPMENT[type].sizes;
  if (type === 'iv') return colourSizes(type, sizes);
  if (type === 'intubation')
    return `<fieldset class="toggles tube-options"><legend>Tube size (mm)</legend><div class="tube-grid">${sizes.map((v) => `<label class="toggle"><input type="radio" name="size" value="${v}" aria-label="${v} mm"><span>${v}<small>mm</small></span></label>`).join('')}</div></fieldset>`;
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
  sheet(
    ARREST_EQUIPMENT[type].name,
    `<form id="equipmentForm">${type === 'laryngoscopy' ? toggleField('method', 'Laryngoscopy', ['Video', 'Direct']) + '<div id="bladeChoices"><p class="caption">Choose video or direct to show blade sizes.</p></div>' + toggleField('forceps', 'Magill forceps', ['Used', 'Not used']) + toggleField('view', 'View', ['Grade I', 'Grade IIa', 'Grade IIb', 'Grade III', 'Grade IV', 'No view']) : sizeFields(type)}${['iv', 'io'].includes(type) ? sitePicker(type) : ''}${type === 'intubation' ? toggleField('adjunct', 'Introducer', ['Bougie', 'Stylet']) + '<label>Length at lips (cm)<input name="lips" type="number" min="1" max="50" inputmode="decimal" step="any"></label><fieldset class="toggles"><legend>Confirmed with</legend>' + ['Waveform capnography', 'Visualised through cords', 'Chest rise', 'Auscultation'].map((x) => `<label><input name="confirmation" type="checkbox" value="${x}">${x}</label>`).join('') + '</fieldset>' : ''}${type === 'laryngoscopy' ? '' : toggleField('outcome', 'Outcome', ['Successful', 'Unsuccessful'])}<label>Time<input name="at" type="time" step="60" required value="${local(now).slice(11)}"></label><label>Notes<textarea rows="1" name="notes" placeholder="Optional"></textarea></label><div class="equipment-record-actions"><button class="primary" type="submit">Record ${ARREST_EQUIPMENT[type].name}</button>${type === 'laryngoscopy' ? '<button class="primary" type="submit" name="followUp" value="intubation">Record Laryngoscopy and add Intubation</button>' : ''}</div></form>`,
    { kind: 'equipment', type, at: now },
  );
  enhanceEquipment();
}

/* Pop-up to record a free-text event (or another medicine). */
export function openNote() {
  const now = Date.now();
  sheet(
    'Record another event',
    `<form id="noteForm"><label>Event<textarea rows="1" name="text" required placeholder="What happened?"></textarea></label><label>Event time<input name="at" type="time" step="60" required value="${local(now).slice(11)}"></label><button class="primary" type="submit">Record event</button></form><button class="primary" data-custom-drug="other">Record another medicine</button>`,
    { kind: 'note', at: now },
  );
}

/* "Correct event" pop-up: change a logged event's time or details. */
export function editEvent(id) {
  const e = st.s.events.find((e) => e.id === id);
  if (!e) return;
  sheet(
    'Correct event',
    `<form id="editForm"><p><b>${esc(e.title)}</b></p><label>Event time<input name="at" type="time" step="60" required value="${e.timeUnknown ? '' : local(e.at).slice(11)}"></label><label>Recorded details<textarea rows="1" name="details">${esc(e.details)}</textarea></label>${['shock', 'noshock', 'rosc', 'rhythm'].includes(e.type) ? `<label>Rhythm<select name="rhythm">${(e.type === 'shock' ? ['Unknown', 'VF', 'VT', 'Torsades'] : e.type === 'noshock' ? ['PEA', 'Asystole', 'Other', 'Unknown'] : e.type === 'rosc' ? ['Sinus rhythm', 'Organised rhythm', 'AF', 'Other', 'Unknown'] : ['VF', 'VT', 'Torsades', 'PEA', 'Asystole', 'Sinus rhythm', 'Organised rhythm', 'AF', 'Other', 'Unknown']).map((r) => `<option ${e.rhythm === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>` : ''}${['adrenaline', 'amiodarone', 'magnesium', 'fluids', 'medicine'].includes(e.type) ? `<div class="inline-two"><label>Actual dose<input name="dose" type="number" step="any" min="0.001" value="${esc(e.dose || '')}" required></label><label>Unit<input name="unit" value="${esc(e.unit || 'mg')}" required></label></div><label>Route<input name="route" value="${esc(e.route || 'IV')}" required></label>` : ''}${e.type === 'shock' ? `<label>Energy (J)<input name="energy" type="number" min="1" max="1000" inputmode="numeric" value="${esc(e.energy || '')}"></label>` : ''}<button class="primary" type="submit">Save correction</button></form><p class="caption">Corrections update counters and medicine review clocks. They do not restart a CPR cycle. Original values are retained in JSON export.</p>${['start', 'pause', 'resume', 'rearrest', 'end', 'rosc'].includes(e.type) ? '<p class="caption">To reverse a session state change, use Undo. State events cannot be voided here.</p>' : `<button class="danger primary" data-void="${esc(id)}">${e.voided ? 'Restore event' : 'Void event · keep audit record'}</button>`}`,
    { kind: 'edit', id },
  );
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
    `<p>Save the record before starting a new patient or clearing browser data.</p><div class="stack"><button data-action="download-text">Download text record</button><button data-action="download-json">Download complete JSON + audit</button><button data-action="copy">Copy text record</button></div><p class="caption">Text export follows the current log filters, with hh:mm:ss and key details. Complete JSON retains all events, dates, timezone and audit history. Records stay on this device unless you export or share them.</p>`,
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
  sheet(
    'Tutorial',
    `<div class="explain-progress" role="progressbar" aria-label="Tutorial progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="10"><span style="width:10%"></span></div>
 <div class="explain-pages" aria-label="Scrollable tutorial slides">${EXPLAIN_ME_SLIDES.map((item, i) => `<section class="explain-slide" aria-label="${esc(item.title)}"><h3>${esc(item.title)}</h3><div class="explain-shot"><img src="${item.image}" alt="${esc(item.alt)}"></div><p class="explain-action">${item.action}</p><p class="explain-note">${item.note}</p><small>${i === EXPLAIN_ME_SLIDES.length - 1 ? 'End of tutorial · scroll up to revisit a step' : 'Scroll down for the next step ↓'}</small></section>`).join('')}</div>
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
  let index = 0;
  function update(i) {
    index = i;
    const amount = ((i + 1) / slides.length) * 100;
    bar.style.width = amount + '%';
    progress.setAttribute('aria-valuenow', amount);
    prev.disabled = i === 0;
    next.textContent = i === slides.length - 1 ? 'Done' : 'Next ↓';
  }
  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    pages.scrollTo({
      top: slides[i].offsetTop - slides[0].offsetTop,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }
  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () =>
    index === slides.length - 1 ? closeSheet() : go(index + 1),
  );
  const onScroll = () => {
    const line = pages.scrollTop + pages.clientHeight * 0.35;
    let current = 0;
    slides.forEach((slide, i) => {
      if (slide.offsetTop - slides[0].offsetTop <= line) current = i;
    });
    update(current);
  };
  pages.addEventListener('scroll', onScroll, { passive: true });
  explainCleanup = () => pages.removeEventListener('scroll', onScroll);
  dialog.addEventListener('cancel', stopExplainMe, { once: true });
}
