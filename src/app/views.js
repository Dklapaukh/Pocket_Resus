/* Builds the screens (live, causes, checklists, log, guidance) and the 250 ms tick.
   The rebuild preserved the original behaviour first; later approved changes are marked below.
   Shared screen and session state lives in st (see state.js). */
import { $, R } from './base.js';
import {
  clock,
  countdown,
  esc,
  formatGuidelineReference,
  normalizeGuidelineReferences,
  time,
} from './format.js';
import { ARREST_CHECKLISTS, CAUSES } from './data.js';
import { sheet } from './sheets.js';
import { finished, logRows, st, torsades } from './state.js';

/* True when an amiodarone dose is due (rule in src/engine/drug-cards.js: amiodaroneDue). */
export function amioDue() {
  return R.amiodaroneDue(st.s);
}

/* A2 (owner-approved): the amiodarone card appears only when a dose is due. Once it has appeared it stays for
   that patient, even if a shock is later voided or undone. It also shows whenever a dose is already recorded. */
export function amioCardVisible() {
  if (amioDue()) st.amioShownFor = st.s.id;
  return st.amioShownFor === st.s.id || R.counts(st.s).amio >= 1;
}

/* A2: what sits in the lower drug slot before the amiodarone card is due (no dose, no button). */
export function amioPendingCard() {
  const [first, second] = R.RULES.numbers.amiodarone.dueAtShocks;
  return `<section class="drug drug-pending" id="amiodaronePending"><h3>Amiodarone</h3><p class="pending-note">${R.wording('amiodaroneNotYetDue', { first, second })}</p></section>`;
}

/* One drug card (adrenaline or amiodarone) on the Live screen. */
export function drugCard(type) {
  const isAdrenaline = type === 'adrenaline',
    name = isAdrenaline ? 'Adrenaline' : 'Amiodarone',
    doseReference = R.dose(st.s),
    counts = R.counts(st.s),
    value = R.doseFor(st.s, type),
    blocked = !isAdrenaline && torsades(),
    secondDoseEarly = !isAdrenaline && R.secondAmiodaroneEarly(st.s), // C6b-2: second dose is not an option before the 6th shock
    needsClinicalAdvice = !isAdrenaline && R.childAmiodaroneAdvice(st.s), // C6b: child second amiodarone dose has no source
    selectDose = needsClinicalAdvice && secondDoseEarly && !blocked && !st.s.special && !['ROSC', 'Ended'].includes(st.s.phase),
    canRecordSuggestedDose =
      doseReference &&
      !needsClinicalAdvice &&
      !secondDoseEarly &&
      !st.s.special &&
      !blocked &&
      (isAdrenaline || !R.amiodaroneDosesComplete(st.s)) &&
      !['ROSC', 'Ended'].includes(st.s.phase),
    adrenalineLocked = isAdrenaline && R.lockLeft(st.s, 'adrenaline') > 0, // A5: greyed out for 3 min 30 s after a dose
    lockAttribute = adrenalineLocked ? ` data-a5-free="${canRecordSuggestedDose ? 1 : 0}"` : ''; // remembers whether it is otherwise usable, to free it later
  // Keep this precedence: the same conditions can be true at the same time.
  let doseText;
  if (needsClinicalAdvice) doseText = R.wording('childSecondAmiodarone');
  else if (secondDoseEarly) doseText = R.wording('amiodaroneSecondNotYetDue', { second: R.RULES.numbers.amiodarone.dueAtShocks[1] });
  else if (doseReference) doseText = esc(value + ' mg IV');
  else doseText = 'Enter weight';

  let buttonText = '';
  if (!selectDose) {
    if (canRecordSuggestedDose) buttonText = 'Record ' + value + ' mg IV';
    else if (blocked) buttonText = 'Withhold · torsades';
    else if (needsClinicalAdvice) buttonText = 'Seek clinical advice';
    else if (secondDoseEarly) buttonText = 'Not yet due';
    else if (st.s.special) buttonText = 'Manual review';
    else if (!isAdrenaline && counts.amio >= 2) buttonText = '2 doses recorded';
    else if (st.s.phase === 'ROSC') buttonText = 'ROSC recorded';
    else if (st.s.phase === 'Ended') buttonText = 'Session ended';
    else buttonText = 'Weight needed';
  }
  const doseClass = R.isPaediatric(st.s) && doseReference ? 'child' : '';
  const recordButton = selectDose
    ? '<button class="record" data-select-dose="amiodarone">Select dose</button>'
    : `<button class="record" data-drug="${type}"${lockAttribute} ${
        canRecordSuggestedDose && !adrenalineLocked ? '' : 'disabled'
      }>${buttonText}</button>`;

  // Joining fragments without whitespace keeps the existing rendered markup.
  return [
    `<section class="drug" id="${type}Card"><h3>${name}</h3>`,
    `<div class="drug-dose ${doseClass}">${doseText}</div>`,
    `<strong class="drug-clock" id="${type}Clock">—</strong>`,
    `<p class="caption" id="${type}Status"></p>`,
    recordButton,
    '<div class="drug-links">',
    `<button class="administration-link" data-drug-info="${type}" aria-label="${name} administration guidance">Administration ⓘ</button>`,
    `<button class="alternate" data-custom-drug="${type}" aria-label="Other ${name.toLowerCase()} dose, route or time">Other…</button>`,
    '</div></section>',
  ].join('');
}

/* Header "Pt weight (kg)" button, with the shock energy calculated from the weight. */
export function weightHeader() {
  const weight = st.s.weight;
  const energy = R.joules(weight);
  const weightLabel = weight ? ' ' + esc(weight) + ' kg' : '';
  const displayedWeight = weight ? esc(weight) + ' kg' : 'Enter kg';
  const energyReference = weight
    ? `<small class="header-energy" title="4 J/kg of CPG weight band · maximum 200 J">${energy} J${st.s.weightSource.startsWith('Estimated') ? ' · est.' : ''}</small>`
    : '';
  const padsPrompt = R.needsPaediatricPads(weight)
    ? '<div class="pads-prompt"><span aria-hidden="true">▰ ▰</span> Use paediatric pads</div>'
    : '';
  const specialFlag = st.s.special
    ? '<span class="special-flag">Special situation · manual review</span>'
    : '';

  return [
    '<div class="weight-row">',
    `<button data-action="weight" class="weight-button" aria-label="Patient weight${weightLabel}">`,
    `<span>Pt weight (kg)</span><strong>${displayedWeight}</strong>`,
    energyReference,
    '</button>', padsPrompt, specialFlag, '</div>',
  ].join('');
}

/* Start, shock, no-shock and re-arrest events (voided ones left out), oldest first. */
export function cycleRecords() {
  return R.active(st.s)
    .filter((e) => ['start', 'shock', 'noshock', 'rearrest'].includes(e.type))
    .sort((a, b) => a.at - b.at);
}

/* "Cycle log" pop-up: each recorded cycle with its time, plus a note about earlier cycles entered as counts only. */
export function openCycleLog() {
  const rows = cycleRecords();
  const prior = st.s.priorShocks + st.s.priorNoShock;
  const priorNote = prior
    ? `<p class="caption">${prior} earlier cycles recorded as counts only; individual timestamps unavailable.</p>`
    : '';
  const cycleRows = rows.length
    ? rows.map((event, index) => {
        const label = event.preApp
          ? 'Before app'
          : 'Cycle ' + (prior + rows.slice(0, index + 1).filter((row) => !row.preApp).length);
        const eventTime = event.timeUnknown ? 'Time not set' : time(event.at);
        let action;
        if (event.type === 'shock') {
          action = '<svg class="shock-bolt" viewBox="0 0 24 32" aria-hidden="true"><path d="M14 1 1 19h9l-1 12 14-20h-9z"/></svg> Shock delivered';
        } else if (event.type === 'noshock') action = 'No shock · next cycle started';
        else if (event.type === 'rearrest') action = 'Re-arrest · CPR restarted';
        else action = 'CPR cycle started';
        const details = event.details ? ' · ' + esc(event.details) : '';
        return `<article class="cycle-log-row"><b>${label}</b><time>${eventTime}</time><p>${action}${details}</p></article>`;
      }).join('')
    : '<p>No cycles recorded yet.</p>';
  sheet(
    'Cycle log',
    priorNote + cycleRows,
  );
}

// Evaluate the lower slot after the adrenaline card, as in the original screen.
function lowerDrugCard() {
  const mode = R.lowerCard(st.s);
  return mode === 'amiodarone'
    ? (amioCardVisible() ? drugCard('amiodarone') : amioPendingCard())
    : supportCard(mode);
}

/* The Live tab screen. */
export function liveView() {
  const c = R.counts(st.s);
  const stopped = ['ROSC', 'Ended'].includes(st.s.phase);
  const startAction = stopped ? (st.s.phase === 'ROSC' ? 'rearrest' : 'export') : 'start';
  const startLabel = stopped ? (st.s.phase === 'ROSC' ? 'Re-arrest · restart CPR' : 'Export record') : '▶ Start CPR';
  const timer = `<div class="live-dashboard">

<section class="timer-panel" id="timerPanel">` +
    `<div class="cycle-dial" id="cycleTrack">` +
    `<svg class="cycle-ring" width="100%" height="100%" aria-hidden="true">` +
    `<rect class="ring-track"/>` +
    `<rect class="ring-fill" id="progress" pathLength="120"/>` +
    `</svg>` +
    `<div class="dial-face">` +
    `<div class="dial-history">` +
    `<button class="cycle-heading" data-action="cycle-log" aria-label="Open timestamped cycle log">` +
    `<span id="cycleTitle">${st.s.cycle ? 'CPR cycle ' + st.s.cycle : 'Ready for CPR'}</span>` +
    `<span class="dial-shocks">` +
    `<svg class="shock-bolt" viewBox="0 0 24 32" aria-hidden="true">` +
    `<path d="M14 1 1 19h9l-1 12 14-20h-9z"/>` +
    `</svg>` +
    `<strong>${c.shocks}</strong>` +
    `<span>${c.shocks === 1 ? 'shock' : 'shocks'}</span>` +
    `</span>` +
    `</button>` +
    `<button class="previous-shock" data-action="previous-shock" aria-label="Add a shock before app start"><span class="ps-plus" aria-hidden="true">+</span><span class="ps-words">Previous<br>shock</span></button>` +
    `</div>` +
    `<div class="dial-timing">` +
    `<div class="countdown" id="cycleClock" role="timer" aria-label="Time remaining in CPR cycle">02:00</div>` +
    `<div class="cycle-caption" id="cycleCaption">Ready to start</div>` +
    `</div>` +
    `<div class="dial-actions">` +
    `<button class="unexpected-rosc" data-outcome="rosc" id="unexpectedRosc" aria-label="Record unexpected ROSC" ${!['Ready', 'Active'].includes(st.s.phase) ? 'hidden' : ''}>♡ ROSC</button>` +
    `<button class="start-button" data-action="${startAction}" id="startCycle" ${st.s.phase === 'Active' ? 'hidden' : ''}>${startLabel}</button>` +
    `<button class="rhythm-check-button" data-action="rhythm-check" id="rhythmCheck" hidden>⌁ Rhythm check</button>` +
    `</div>` +
    `</div>` +
    `</div>` +
    `<span class="sr-only" id="cycleAlert" role="status" aria-live="polite">` +
    `</span>` +
    `</section>
`;
  const accessCards = `<div class="access-cards">` +
    `<button data-action="airway">` +
    `<svg class="equipment-icon" viewBox="0 0 32 32" aria-hidden="true">` +
    `<path d="M16 3v12m0-5-4 4m4-4 4 4M12 9C7 9 3 17 3 24c0 4 3 4 6 2l4-3V11M20 9c5 0 9 8 9 15 0 4-3 4-6 2l-4-3V11"/>` +
    `</svg>` +
    `<span>Airway</span>` +
    `<span class="card-chevron" aria-hidden="true">›</span>` +
    `</button>` +
    `<button data-action="access">` +
    `<svg class="equipment-icon" viewBox="0 0 32 32" aria-hidden="true">` +
    `<path d="M10 3h12v17a6 6 0 0 1-12 0V3ZM8 7h16M10 13h12M13 1v4m6-4v4m-3 21v5"/>` +
    `<path d="M16 17v4"/>` +
    `</svg>` +
    `<span>Access</span>` +
    `<span class="card-chevron" aria-hidden="true">›</span>` +
    `</button>` +
    `</div>`;
  return timer + accessCards +
    `<div class="drug-grid">${drugCard('adrenaline')}${lowerDrugCard()}</div>
${st.s.phase === 'ROSC' ? '<button class="postrosc-main" data-action="postrosc">☑ Post ROSC checklist</button>' : ''}
<div class="tools-row">` +
    `<button data-action="interventions" ${finished() ? 'disabled' : ''}>` +
    `<span aria-hidden="true">＋</span> Airway / access</button>` +
    `<button data-action="note" ${finished() ? 'disabled' : ''}>+ Event</button>` +
    `</div>` +
    `</div>`;
}

/* The latest checklist event (ticked or unticked) for one checklist item. */
export function checkStatus(key) {
  return R.active(st.s)
    .filter((e) => e.type === 'checklist' && e.key === key)
    .at(-1);
}

/* The checklist screen. */
export function checksView() {
  const list = ARREST_CHECKLISTS.find((c) => c.id === st.checklist);
  const done = list.items.filter((_, i) => checkStatus(st.checklist + ':' + i)?.checked).length;
  const items = list.items.map((text, i) => {
    const key = list.id + ':' + i;
    const event = checkStatus(key);
    const timestamp = event?.checked ? `<time>${time(event.at)}</time>` : '';
    return `<label class="check-item">` +
      `<input type="checkbox" aria-label="${esc(text)}" data-check="${key}" ${event?.checked ? 'checked' : ''} ${finished() ? 'disabled' : ''}>` +
      `<span>${esc(text)}${timestamp}</span></label>`;
  }).join('');
  const introduction = list.intro ? ' ' + list.intro : '';
  const source = formatGuidelineReference(list.code.split(' · ')[0]);
  return `<button class="check-back" data-tab="${st.checkReturn}">← Back</button>` +
    `<div class="row"><h2>${list.label}</h2><span class="muted">${done}/${list.items.length}</span></div>` +
    `<p class="caption">${list.code} · Each tick is timestamped.${introduction}</p>` +
    `<div class="panel" style="padding:0">${items}</div>` +
    `<a href="${list.pdf}" target="_blank" rel="noopener">Original ${source} ↗</a>` +
    `<p class="caption">A tick records checklist review, not administration or an intervention.</p>`;
}

// Render one event; synthetic checklist summaries open their checklist instead of an edit form.
function logEntryMarkup(e) {
  const eventType = e.type === 'equipment' && ['iv', 'io'].includes(e.procedure) ? 'access' : e.type;
  const displayedTime = e.timeUnknown ? 'Before app' : time(e.at);
  const relativeTime = e.timeUnknown
    ? '<small>Time not set</small>'
    : `<small>${e.at < st.s.resusStart ? '−' : '+'}${clock(Math.abs(e.at - st.s.resusStart))} resus</small>`;
  const shockIcon = e.type === 'shock'
    ? '<svg class="shock-bolt" viewBox="0 0 24 32" aria-hidden="true"><path d="M14 1 1 19h9l-1 12 14-20h-9z"/></svg>'
    : '';
  const reviewShock = e.needsReview && !e.voided
    ? `<button class="review-shock" data-edit="${esc(e.id)}">Add time / edit details</button>`
    : '';
  const correction = e.correctedAt ? '<small class="caption">Corrected</small>' : '';
  const voidNotice = e.voided ? '<small class="caption">Voided · excluded from counts</small>' : '';
  const editButton = e.synthetic
    ? `<button data-review-checklist="${esc(e.checklistId)}" aria-label="Review ${esc(e.title)}">↗</button>`
    : `<button data-edit="${esc(e.id)}" aria-label="Edit ${esc(e.title)} at ${e.timeUnknown ? 'time not set' : time(e.at)}">✎</button>`;
  return `<article data-event-type="${eventType}" class="log-entry ${e.voided ? 'void' : ''}">` +
    `<time>${displayedTime}${relativeTime}</time><div>${shockIcon}<b>${esc(e.title)}</b>` +
    `<p>${esc(e.details)}</p>${reviewShock}${correction}${voidNotice}</div>${editButton}</article>`;
}

/* The Log tab. */
export function logView() {
  const rows = logRows();
  const interventionsOnly = st.logScope === 'interventions';
  const filterHelp = interventionsOnly
    ? 'CPR, shocks, rhythm checks, medicines, airway/access and recorded actions. Checklist items excluded.'
    : st.checklistDisplay === 'times'
      ? 'Checklist start: first item checked. Finish: all items checked. Other events remain visible.'
      : 'All recorded events, including individual checklist items.';
  const entries = rows.length
    ? rows.slice().reverse().map(logEntryMarkup).join('')
    : '<p class="empty">No events in this view yet.</p>';
  const startNote = st.s.resusStart < st.s.appStart ? ' · before app opened' : '';
  return `<div class="row"><h2>Event log</h2><button data-action="copy" aria-label="Export event log to clipboard">Export</button></div>` +
    `<div class="log-filters"><label>Show<select id="logScope">` +
    `<option value="all" ${st.logScope === 'all' ? 'selected' : ''}>All events</option>` +
    `<option value="interventions" ${interventionsOnly ? 'selected' : ''}>Interventions only</option></select></label>` +
    `<label>Checklists<select id="checklistDisplay" ${interventionsOnly ? 'disabled' : ''}>` +
    `<option value="items" ${st.checklistDisplay === 'items' ? 'selected' : ''}>Each item</option>` +
    `<option value="times" ${st.checklistDisplay === 'times' ? 'selected' : ''}>Start & finish only</option></select></label></div>` +
    `<p class="caption log-filter-help">${filterHelp} Export copies this view; voided entries are excluded.</p>` +
    `<p class="caption">${new Date(st.s.appStart).toLocaleDateString('en-NZ')} · ${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}<br>` +
    `Resus start ${time(st.s.resusStart)}${startNote} · ${st.s.phase}</p>` +
    `<button class="primary" data-action="note" ${finished() ? 'disabled' : ''}>+ Add event / earlier event</button>${entries}`;
}

/* Redraw the whole screen for the current tab, then update clocks. Called after every change. */
export function render() {
  document.body.classList.toggle('large', st.s.largeText);
  document.body.classList.toggle('live-mode', st.tab === 'live');
  document.body.classList.toggle('guidance-mode', st.tab === 'guidance');
  document.body.classList.toggle('checklist-mode', st.tab === 'checks');
  $('headerWeight').innerHTML = weightHeader();
  $('main').innerHTML =
    st.tab === 'live'
      ? liveView()
      : st.tab === 'guidance'
        ? guidanceGrid()
        : st.tab === 'checks'
          ? checksView()
          : logView();
  document.querySelectorAll('[data-tab]').forEach((b) => {
    if (b.dataset.tab === st.tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if ($('undo')) $('undo').disabled = !st.s.undo.length;
  normalizeGuidelineReferences($('main'));
  normalizeGuidelineReferences($('headerWeight'));
  tick();
}

/* Caption is derived from the cycle; it never creates an event. */
function cycleCaption(t, on, running, due, stopped) {
  if (stopped) return 'Recorded at ' + time(st.s.end);
  if (due) return 'Rhythm check due' + (t.late > 1000 ? ' · +' + clock(t.late) : '');
  if (on && !running) return 'Paused · resus clock continues';
  if (running && t.left <= 15000) return 'Prepare for rhythm check';
  if (running && t.left <= 30000) return '30 seconds remaining';
  return running ? 'CPR in progress' : 'Ready to start';
}

/* Update the visible CPR cycle; the timer itself records no treatment. */
function tickCycle(t, on, running, due, stopped) {
  let clockText;
  let title;
  if (stopped) {
    const hasRosc = st.s.phase === 'ROSC';
    clockText = hasRosc ? 'ROSC' : 'Ended';
    title = hasRosc ? 'ROSC recorded' : 'Session ended';
  } else {
    clockText = countdown(t.left);
    title = st.s.cycle ? 'CPR cycle ' + st.s.cycle : 'Ready for CPR';
  }
  $('cycleClock').textContent = clockText;
  $('cycleTitle').textContent = title;
  $('cycleCaption').textContent = cycleCaption(t, on, running, due, stopped);
  if ($('cycleAlert').textContent !== (due ? 'Cycle complete. Rhythm check.' : ''))
    $('cycleAlert').textContent = due ? 'Cycle complete. Rhythm check.' : '';
  $('timerPanel').classList.toggle('due', due);
  $('timerPanel').classList.toggle('prepare', running && t.left > 0 && t.left <= 15000);
  $('timerPanel').classList.toggle('stopped', stopped);
  $('timerPanel').classList.toggle('ready', st.s.phase === 'Ready');
  $('progress').style.strokeDashoffset = String(
    120 * (1 - Math.max(0, Math.min(1, t.left / R.CYCLE))),
  );
  $('unexpectedRosc').hidden = !['Ready', 'Active'].includes(st.s.phase);
  $('rhythmCheck').hidden = !due;
  $('cycleTrack').hidden = false;
  $('startCycle').hidden = on;
}

/* Status text is a reminder derived from the session, not a recorded dose.
   Keep the order: several conditions can apply at once. */
function adrenalineStatus(remaining, enabled) {
  if (!enabled) return 'Review inactive';
  if (remaining === null) return 'No dose recorded';
  if (remaining < 0) return '4 min elapsed · review';
  return 'Until 4 min review';
}

function amiodaroneStatus(elapsed, count, enabled, due) {
  if (torsades()) return 'Withhold · torsades';
  if (!enabled) return 'Review inactive';
  if (due) return 'Review ' + (count ? 'second' : 'first') + ' dose';
  if (count >= 2) return 'Since last dose';
  if (elapsed === null) return 'Review at ' + (count ? '6' : '3') + ' shocks';
  return 'Since last dose';
}

/* Update medication review clocks and release an expired display lock. */
function tickMedicines(t, c, on) {
  const enabled = on && !st.s.special;
  $('adrenalineClock').textContent =
    t.adr === null ? '—' : t.adr < 0 ? '+' + clock(-t.adr) : countdown(t.adr);
  $('adrenalineStatus').textContent = adrenalineStatus(t.adr, enabled);
  $('adrenalineCard').classList.toggle('attention', enabled && t.adr !== null && t.adr <= 30000);
  /* A5: while the lock runs the adrenaline button is greyed out (set when the card is drawn); when the
     3 min 30 s are up, free it again, but only if it was otherwise usable (weight entered, not ROSC, etc.). */
  const adrBtn = $('adrenalineCard').querySelector('button[data-a5-free]');
  if (adrBtn && R.lockLeft(st.s, 'adrenaline') === 0) {
    adrBtn.disabled = adrBtn.dataset.a5Free !== '1';
    adrBtn.removeAttribute('data-a5-free');
  }
  if (R.lowerCard(st.s) === 'amiodarone') {
    if (!amioCardVisible()) return; // A2: placeholder tile has nothing to update
    const due = amioDue();
    $('amiodaroneClock').textContent = t.amio === null ? '—' : clock(t.amio);
    $('amiodaroneStatus').textContent = amiodaroneStatus(t.amio, c.amio, enabled, due);
    $('amiodaroneCard').classList.toggle('attention', due);
  } else tickSupport(R.lowerCard(st.s), enabled);
}

/* Runs four times a second: updates clocks, cycle countdown, ring, drug timers and prompts. */
export function tick() {
  const t = R.timing(st.s),
    c = R.counts(st.s);
  $('appClock').textContent = clock(t.app);
  $('resusClock').textContent = clock(t.resus);
  document
    .querySelector('.bottom-nav [data-checklist=arrest]')
    .classList.toggle('checklist-attention', R.checklistPrompt(st.s));
  $('appClock').classList.toggle('long-clock', t.app >= 3600000);
  $('resusClock').classList.toggle('long-clock', t.resus >= 3600000);
  if (st.tab !== 'live') return;
  const on = st.s.phase === 'Active',
    running = on && st.s.deadline !== null,
    due = on && t.left === 0,
    stopped = ['ROSC', 'Ended'].includes(st.s.phase);
  tickCycle(t, on, running, due, stopped);
  tickMedicines(t, c, on);
}

/* "Guidance & sources" pop-up: what the app is and is not, with links to the guideline PDFs. */
export function guidance() {
  const guidelineLinks = [
    ['Cardiac arrest · <em>EAS guideline 3.14</em>', 'cpg-cardiac-arrest.pdf'],
    ['Post ROSC · <em>EAS guideline 3.15</em>', 'cpg-post-rosc.pdf'],
    ['Paediatric equipment & doses · <em>EAS guideline 7.2</em>', 'cpg-paediatric-equipment.pdf'],
    ['RSI · <em>EAS guideline 9.3</em>', 'cpg-rsi.pdf'],
  ].map(([label, path]) => `<a href="${path}" target="_blank" rel="noopener">${label} ↗</a>`).join('');
  sheet(
    'Guidance & sources',
    `<p><b>Standard non-traumatic cardiac arrest.</b> Clinician reference and event recorder. It does not detect a rhythm, operate a defibrillator or infer treatment.</p>` +
    `<p>NZCPG <em>EAS guideline 3.14</em>: two minute CPR cycles; adrenaline review every 4 minutes; amiodarone reviews at 3 and 6 VF / pulseless VT shocks. Weight references retain the source app’s 5 / 10 / 20 / 30 / 40 kg paediatric bands.</p>` +
    `<p>Shock energy is 4 J/kg of the CPG weight band (rounded up), capped at 200 J. The adult CPG specifies maximum defibrillator setting. A no-shock cycle is counted only when recorded.</p>` +
    `<div class="stack">${guidelineLinks}</div><details class="panel"><summary>RSI medicine references</summary>` +
    `<p>Fentanyl: 2 mcg/kg IV, maximum 200 mcg. Only when indicated for TBI, suspected intracranial pathology or hypertension; withhold with shock.</p>` +
    `<p>Ketamine: 2 mg/kg IV, maximum 200 mg. Consider 1 mg/kg with shock / prior sedation; do not reduce for prolonged seizures.</p>` +
    `<p>Rocuronium <b>or</b> suxamethonium: 2 mg/kg IV, maximum 200 mg. Adult dose usually rounded to nearest 50 mg. Alternatives, not both.</p>` +
    `<p>Use the full RSI CPG for patient context and administration.</p></details>` +
    `<p class="caption">Packaged NZCPG exports: 24 September 2026. Reversible causes: ANZCOR 11.2. Local protocol takes precedence. This extracted app requires clinical validation before patient-care use.</p>`,
  );
}

/* Live-screen support card: magnesium for torsades or fluids for PEA / Asystole / Other. */
export function supportCard(type) {
  const mag = type === 'magnesium';
  const ref = mag ? R.magnesiumReference(st.s) : R.fluidReference(st.s);
  const stats = R.supportStats(st.s, type);
  let value;
  if (mag) value = ref.dose === null ? 'Dose: clinical review' : ref.dose + ' mmol IV';
  else value = ref.min === null ? 'Enter weight' : ref.min + '–' + ref.max + ' mL IV';

  const enabled = !st.s.special && !['ROSC', 'Ended'].includes(st.s.phase);
  const canRef = enabled && (!mag || (ref.dose !== null && stats.count < 2));
  let label;
  if (!mag) label = 'Record fluid…';
  else if (stats.count >= 2) label = '2 doses recorded';
  else if (ref.dose === null) label = 'Review dose';
  else if (stats.count) label = 'Record repeat…';
  else label = 'Record ' + ref.dose + ' mmol IV';

  let buttonText = label;
  if (!enabled) {
    if (st.s.phase === 'ROSC') buttonText = 'ROSC recorded';
    else if (st.s.phase === 'Ended') buttonText = 'Session ended';
    else buttonText = 'Manual review';
  }
  return `<section class="drug ${type}" id="${type}Card"><h3>${mag ? 'Magnesium' : 'Fluids · NaCl 0.9%'}</h3>` +
      `<div class="drug-dose">${esc(value)}</div>` +
      `<strong class="drug-clock" id="supportClock">—</strong>` +
      `<p class="caption" id="supportStatus"></p>` +
      `<button class="record" data-support="${type}" ${canRef ? '' : 'disabled'}>${buttonText}</button><div class="drug-links"><button class="administration-link" data-drug-info="${type}">Administration ⓘ</button>` +
      `<button class="alternate" data-custom-drug="${type}">Other…</button></div></section>`;
}

/* Per-tick text for that card: time since last dose and status line. */
export function tickSupport(type, enabled) {
  const stats = R.supportStats(st.s, type);
  $('supportClock').textContent = stats.last ? clock(Date.now() - stats.last.at) : '—';
  let status;
  if (!enabled) {
    status = 'Review inactive';
  } else if (type === 'magnesium') {
    if (stats.count >= 2) status = '2 doses · clinical review';
    else if (stats.count) status = 'Repeat once only if TdP persists/recurs';
    else status = 'Withhold amiodarone · torsades history';
  } else if (stats.total) {
    status = stats.total + ' mL recorded · review total';
  } else {
    const latest = R.latestLowerRhythm(st.s);
    const rhythm = latest === 'Asystole' || latest === 'Other' ? latest : 'PEA';
    status = rhythm + ' · review fluid volume';
  }
  $('supportStatus').textContent = status;
}

/* The Guidance tab: a button for each checklist. */
export function guidanceGrid() {
  const checklistButtons = ARREST_CHECKLISTS
    .map((c) => `<button data-open-check="${c.id}">☑ ${c.label}</button>`).join('');
  const weight = st.s.weight ? esc(st.s.weight) + ' kg' : 'Enter weight';
  const age = st.s.age ? esc(st.s.age) + ' years' : 'Age criteria';
  const causeButtons = CAUSES
    .map((c) => `<button data-cause-guide="${c.id}">${c.name}</button>`).join('');
  return `<h2>Guidance</h2><div class="guidance-grid">${checklistButtons}` +
    `<button data-reference="rsi">RSI doses<br><small>${weight}</small></button>` +
    `<button data-reference="tubes">Tube sizes & age<br><small>${age}</small></button></div>` +
    `<section class="causes-board"><h3>Reversible causes · 4 Hs & 4 Ts</h3><div>${causeButtons}</div></section>`;
}

/* Reference pop-up opened from Guidance (RSI doses, tube sizes), calculated from weight or age. */
export function referenceSheet(type) {
  const w = Number(st.s.weight),
    age = st.s.age === '' ? null : Number(st.s.age);
  if (type === 'rsi') {
    // These are reference values only; opening this sheet records no medicine (rule: engine rsiDoses).
    const d = R.rsiDoses(w);
    const doseList = w
      ? `<p><b>${w} kg</b> · calculated references, not recorded administrations</p><dl>` +
        `<dt>Fentanyl · conditional</dt><dd>${d.fentanylMcg} mcg IV</dd>` +
        `<dt>Ketamine · usual</dt><dd>${d.ketamineMg} mg IV</dd>` +
        `<dt>Ketamine · reduced</dt><dd>${d.reducedKetamineMg} mg IV</dd>` +
        `<dt>Rocuronium OR suxamethonium</dt><dd>${d.blockerMg} mg IV</dd></dl>`
      : '<button class="primary" data-action="weight">Enter patient weight</button>';
    sheet(
      'RSI dose references',
      `${doseList}<p>Fentanyl only for TBI, suspected intracranial pathology or hypertension; withhold with shock. Consider reduced ketamine with shock / prior sedation; do not reduce for prolonged seizures. Neuromuscular blockers are alternatives, not both.</p>` +
      `<a href="cpg-rsi.pdf" target="_blank"><em>EAS guideline 9.3</em> ↗</a>`,
    );
    return;
  }
  const tube = R.tubeReference(age); // rule: engine tubeReference
  const tubeReference = tube
    ? `<p><b>Cuffed ETT:</b> ${tube.size}</p><p><b>Length at lips:</b> ${tube.length}</p>`
    : '<p>Enter age to show the paediatric ETT and length-at-lips formula results.</p>';
  sheet(
    'Tube sizes & age criteria',
    `<label>Patient age (years)<input id="referenceAge" type="number" min="0" max="120" step="any" value="${esc(st.s.age)}"></label>` +
    `<button data-save-age>Use age</button>${tubeReference}` +
    `<p class="caption">Paediatric formulae are guides; confirm actual fit. Not a weight-only adult tube-size recommendation.</p>` +
    `<h3>Age-based weight estimate</h3><p>${R.wording('tubeSheetAgeEstimate', R.ageEstimateGaps())}</p>` +
    `<h3>iGel weight ranges</h3><p>1: 2–5 kg · 1.5: 5–12 kg · 2: 10–25 kg · 2.5: 25–35 kg · 3: 30–60 kg · 4: 50–90 kg · 5: 90+ kg.</p>` +
    `<a href="cpg-paediatric-equipment.pdf" target="_blank"><em>EAS guideline 7.2</em> ↗</a><p class="caption">iGel colours/ranges: Intersurgical product information.</p>`,
  );
}
