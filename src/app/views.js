/* Builds the screens (live, causes, checklists, log, guidance) and the 250 ms tick.
   The rebuild preserved the original behaviour first; later approved changes are marked below.
   Shared screen and session state lives in st (see state.js). */
import { $, R, T, paras } from './base.js';
import {
  clock,
  countdown,
  esc,
  formatGuidelineReference,
  normalizeGuidelineReferences,
  time,
} from './format.js';
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
  return `<section class="drug drug-pending" id="amiodaronePending"><h3>${T('drugNames.amiodarone')}</h3><p class="pending-note">${R.wording('amiodaroneNotYetDue', { first, second })}</p></section>`;
}

/* One drug card (adrenaline or amiodarone) on the Live screen. */
export function drugCard(type) {
  const isAdrenaline = type === 'adrenaline',
    name = T(isAdrenaline ? 'drugNames.adrenaline' : 'drugNames.amiodarone'),
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
  else if (doseReference && value === null) doseText = ''; // A10: a child's second dose has no number (two doses recorded: empty line)
  else if (doseReference) doseText = esc(T('liveCards.doseMgIv', { dose: value }));
  else doseText = T('liveCards.enterWeight');

  let buttonText = '';
  if (!selectDose) {
    if (canRecordSuggestedDose) buttonText = T('liveCards.recordDoseMgIv', { dose: value });
    else if (blocked) buttonText = R.guideText('withholdTorsades');
    else if (needsClinicalAdvice) buttonText = R.wording('childSecondAmiodarone');
    else if (secondDoseEarly) buttonText = T('liveCards.notYetDue');
    else if (st.s.special) buttonText = T('liveCards.manualReview');
    else if (!isAdrenaline && counts.amio >= R.RULES.numbers.amiodarone.dueAtShocks.length) buttonText = R.guideText('maxDosesRecorded', { maxDoses: R.RULES.numbers.amiodarone.dueAtShocks.length });
    else if (st.s.phase === 'ROSC') buttonText = T('liveCards.roscRecorded');
    else if (st.s.phase === 'Ended') buttonText = T('liveCards.sessionEnded');
    else buttonText = T('liveCards.weightNeeded');
  }
  const doseClass = R.isPaediatric(st.s) && doseReference ? 'child' : '';
  const recordButton = selectDose
    ? '<button class="record" data-select-dose="amiodarone">' + T('liveCards.selectDose') + '</button>'
    : `<button class="record" data-drug="${type}"${lockAttribute} ${
        canRecordSuggestedDose && !adrenalineLocked ? '' : 'disabled'
      }>${buttonText}</button>`;

  // Joining fragments without whitespace keeps the existing rendered markup.
  return [
    `<section class="drug" id="${type}Card"><h3>${name}</h3>`,
    `<div class="drug-dose ${doseClass}">${doseText}</div>`,
    `<strong class="drug-clock" id="${type}Clock">${T('liveCards.emptyClock')}</strong>`,
    `<p class="caption" id="${type}Status"></p>`,
    recordButton,
    '<div class="drug-links">',
    `<button class="administration-link" data-drug-info="${type}" aria-label="${T('liveCards.administrationAria', { name })}">${T('liveCards.administrationLink')}</button>`,
    `<button class="alternate" data-custom-drug="${type}" aria-label="${T('liveCards.otherAria', { name: name.toLowerCase() })}">${T('liveCards.otherLink')}</button>`,
    '</div></section>',
  ].join('');
}

/* Header "Pt weight (kg)" button, with the shock energy calculated from the weight. */
export function weightHeader() {
  const weight = st.s.weight;
  const energy = R.joules(weight);
  const weightLabel = weight ? T('weightHeader.buttonAriaWithValue', { weight: esc(weight) }) : T('weightHeader.buttonAria');
  const displayedWeight = weight ? T('weightHeader.weightKg', { weight: esc(weight) }) : T('weightHeader.enterKg');
  const energyReference = weight
    ? `<small class="header-energy" title="${R.guideText('headerEnergyTitle')}">${T(st.s.weightSource.startsWith('Estimated') ? 'weightHeader.energyEstimated' : 'weightHeader.energy', { energy })}</small>`
    : '';
  const padsPrompt = R.needsPaediatricPads(weight)
    ? `<div class="pads-prompt"><span aria-hidden="true">▰ ▰</span> ${R.guideText('padsPrompt')}</div>`
    : '';
  const specialFlag = st.s.special
    ? '<span class="special-flag">' + T('weightHeader.specialFlag') + '</span>'
    : '';

  return [
    '<div class="weight-row">',
    `<button data-action="weight" class="weight-button" aria-label="${weightLabel}">`,
    `<span>${T('weightHeader.buttonLabel')}</span><strong>${displayedWeight}</strong>`,
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
    ? `<p class="caption">${T('cycleLog.earlierCounts', { count: prior })}</p>`
    : '';
  const cycleRows = rows.length
    ? rows.map((event, index) => {
        const label = event.preApp
          ? T('cycleLog.beforeApp')
          : T('cycleLog.cycleNumber', { number: prior + rows.slice(0, index + 1).filter((row) => !row.preApp).length });
        const eventTime = event.timeUnknown ? T('cycleLog.timeNotSet') : time(event.at);
        let action;
        if (event.type === 'shock') {
          action = '<svg class="shock-bolt" viewBox="0 0 24 32" aria-hidden="true"><path d="M14 1 1 19h9l-1 12 14-20h-9z"/></svg> ' + T('cycleLog.shockDelivered');
        } else if (event.type === 'noshock') action = T('cycleLog.noShock');
        else if (event.type === 'rearrest') action = T('cycleLog.rearrest');
        else action = T('cycleLog.cycleStarted');
        const details = event.details ? ' · ' + esc(event.details) : '';
        return `<article class="cycle-log-row"><b>${label}</b><time>${eventTime}</time><p>${action}${details}</p></article>`;
      }).join('')
    : '<p>' + T('cycleLog.none') + '</p>';
  sheet(
    T('cycleLog.title'),
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
  const startLabel = T(stopped ? (st.s.phase === 'ROSC' ? 'liveScreen.rearrestButton' : 'liveScreen.exportButton') : 'liveScreen.startButton');
  const timer = `<div class="live-dashboard">

<section class="timer-panel" id="timerPanel">` +
    `<div class="cycle-dial" id="cycleTrack">` +
    `<svg class="cycle-ring" width="100%" height="100%" aria-hidden="true">` +
    `<rect class="ring-track"/>` +
    `<rect class="ring-fill" id="progress" pathLength="120"/>` +
    `</svg>` +
    `<div class="dial-face">` +
    `<div class="dial-history">` +
    `<button class="cycle-heading" data-action="cycle-log" aria-label="${T('liveScreen.cycleLogAria')}">` +
    `<span id="cycleTitle">${st.s.cycle ? T('liveScreen.cycleTitle', { number: st.s.cycle }) : T('liveScreen.readyForCpr')}</span>` +
    `<span class="dial-shocks">` +
    `<svg class="shock-bolt" viewBox="0 0 24 32" aria-hidden="true">` +
    `<path d="M14 1 1 19h9l-1 12 14-20h-9z"/>` +
    `</svg>` +
    `<strong>${c.shocks}</strong>` +
    `<span>${T(c.shocks === 1 ? 'liveScreen.shockOne' : 'liveScreen.shockMany')}</span>` +
    `</span>` +
    `</button>` +
    `<button class="previous-shock" data-action="previous-shock" aria-label="${T('liveScreen.previousShockAria')}"><span class="ps-plus" aria-hidden="true">+</span><span class="ps-words">${T('liveScreen.previousShock')}</span></button>` +
    `</div>` +
    `<div class="dial-timing">` +
    `<div class="countdown" id="cycleClock" role="timer" aria-label="${T('liveScreen.timerAria')}">${countdown(R.CYCLE)}</div>` +
    `<div class="cycle-caption" id="cycleCaption">${T('liveScreen.captionReady')}</div>` +
    `</div>` +
    `<div class="dial-actions">` +
    `<button class="unexpected-rosc" data-outcome="rosc" id="unexpectedRosc" aria-label="${T('liveScreen.unexpectedRoscAria')}" ${!['Ready', 'Active'].includes(st.s.phase) ? 'hidden' : ''}>${T('liveScreen.unexpectedRosc')}</button>` +
    `<button class="start-button" data-action="${startAction}" id="startCycle" ${st.s.phase === 'Active' ? 'hidden' : ''}>${startLabel}</button>` +
    `<button class="rhythm-check-button" data-action="rhythm-check" id="rhythmCheck" hidden>${T('liveScreen.rhythmCheckButton')}</button>` +
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
    `<span>${T('liveScreen.airwayCard')}</span>` +
    `<span class="card-chevron" aria-hidden="true">›</span>` +
    `</button>` +
    `<button data-action="access">` +
    `<svg class="equipment-icon" viewBox="0 0 32 32" aria-hidden="true">` +
    `<path d="M10 3h12v17a6 6 0 0 1-12 0V3ZM8 7h16M10 13h12M13 1v4m6-4v4m-3 21v5"/>` +
    `<path d="M16 17v4"/>` +
    `</svg>` +
    `<span>${T('liveScreen.accessCard')}</span>` +
    `<span class="card-chevron" aria-hidden="true">›</span>` +
    `</button>` +
    `</div>`;
  return timer + accessCards +
    `<div class="drug-grid">${drugCard('adrenaline')}${lowerDrugCard()}</div>
${st.s.phase === 'ROSC' ? '<button class="postrosc-main" data-action="postrosc">' + T('liveScreen.postRoscButton') + '</button>' : ''}
<div class="tools-row">` +
    `<button data-action="interventions" ${finished() ? 'disabled' : ''}>` +
    `<span aria-hidden="true">＋</span> ${T('liveScreen.airwayAccessButton')}</button>` +
    `<button data-action="note" ${finished() ? 'disabled' : ''}>${T('liveScreen.eventButton')}</button>` +
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
  const list = R.RULES.checklists.lists.find((c) => c.id === st.checklist);
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
  return `<button class="check-back" data-tab="${st.checkReturn}">${T('checks.back')}</button>` +
    `<div class="row"><h2>${list.label}</h2><span class="muted">${done}/${list.items.length}</span></div>` +
    `<p class="caption">${list.code} · ${T('checks.eachTick')}${introduction}</p>` +
    `<div class="panel" style="padding:0">${items}</div>` +
    `<a href="${list.pdf}" target="_blank" rel="noopener">${T('checks.originalLink', { source })}</a>` +
    `<p class="caption">${T('checks.disclaimer')}</p>`;
}

// Render one event; synthetic checklist summaries open their checklist instead of an edit form.
function logEntryMarkup(e) {
  const eventType = e.type === 'equipment' && ['iv', 'io'].includes(e.procedure) ? 'access' : e.type;
  const displayedTime = e.timeUnknown ? T('log.beforeApp') : time(e.at);
  const relativeTime = e.timeUnknown
    ? '<small>' + T('log.timeNotSet') + '</small>'
    : `<small>${T('log.sinceResusStart', { sign: e.at < st.s.resusStart ? '−' : '+', clock: clock(Math.abs(e.at - st.s.resusStart)) })}</small>`;
  const shockIcon = e.type === 'shock'
    ? '<svg class="shock-bolt" viewBox="0 0 24 32" aria-hidden="true"><path d="M14 1 1 19h9l-1 12 14-20h-9z"/></svg>'
    : '';
  const reviewShock = e.needsReview && !e.voided
    ? `<button class="review-shock" data-edit="${esc(e.id)}">${T('log.addTimeButton')}</button>`
    : '';
  const correction = e.correctedAt ? '<small class="caption">' + T('log.corrected') + '</small>' : '';
  const voidNotice = e.voided ? '<small class="caption">' + T('log.voided') + '</small>' : '';
  const editButton = e.synthetic
    ? `<button data-review-checklist="${esc(e.checklistId)}" aria-label="${T('log.reviewAria', { title: esc(e.title) })}">↗</button>`
    : `<button data-edit="${esc(e.id)}" aria-label="${T('log.editAria', { title: esc(e.title), time: e.timeUnknown ? T('log.timeNotSetAria') : time(e.at) })}">✎</button>`;
  return `<article data-event-type="${eventType}" class="log-entry ${e.voided ? 'void' : ''}">` +
    `<time>${displayedTime}${relativeTime}</time><div>${shockIcon}<b>${esc(e.title)}</b>` +
    `<p>${esc(e.details)}</p>${reviewShock}${correction}${voidNotice}</div>${editButton}</article>`;
}

/* The Log tab. */
export function logView() {
  const rows = logRows();
  const interventionsOnly = st.logScope === 'interventions';
  const filterHelp = interventionsOnly
    ? T('log.helpInterventions')
    : st.checklistDisplay === 'times'
      ? T('log.helpTimes')
      : T('log.helpAll');
  const entries = rows.length
    ? rows.slice().reverse().map(logEntryMarkup).join('')
    : '<p class="empty">' + T('log.noEvents') + '</p>';
  const startNote = st.s.resusStart < st.s.appStart ? T('log.beforeAppOpenedNote') : '';
  return `<div class="row"><h2>${T('log.heading')}</h2><button data-action="copy" aria-label="${T('log.exportAria')}">${T('log.exportButton')}</button></div>` +
    `<div class="log-filters"><label>${T('log.showLabel')}<select id="logScope">` +
    `<option value="all" ${st.logScope === 'all' ? 'selected' : ''}>${T('log.allEvents')}</option>` +
    `<option value="interventions" ${interventionsOnly ? 'selected' : ''}>${T('log.interventionsOnly')}</option></select></label>` +
    `<label>${T('log.checklistsLabel')}<select id="checklistDisplay" ${interventionsOnly ? 'disabled' : ''}>` +
    `<option value="items" ${st.checklistDisplay === 'items' ? 'selected' : ''}>${T('log.eachItem')}</option>` +
    `<option value="times" ${st.checklistDisplay === 'times' ? 'selected' : ''}>${T('log.startAndFinish')}</option></select></label></div>` +
    `<p class="caption log-filter-help">${filterHelp} ${T('log.exportNote')}</p>` +
    `<p class="caption">${new Date(st.s.appStart).toLocaleDateString('en-NZ')} · ${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}<br>` +
    `${T('log.resusStartLine', { time: time(st.s.resusStart), note: startNote, phase: st.s.phase })}</p>` +
    `<button class="primary" data-action="note" ${finished() ? 'disabled' : ''}>${T('log.addEventButton')}</button>${entries}`;
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
  const timing = R.RULES.numbers.timing;
  if (stopped) return T('liveScreen.captionRecordedAt', { time: time(st.s.end) });
  if (due) return t.late > timing.overdueShownAfterMs ? T('liveScreen.captionDueLate', { late: clock(t.late) }) : T('liveScreen.captionDue');
  if (on && !running) return T('liveScreen.captionPaused');
  if (running && t.left <= timing.prepareAtMs) return T('liveScreen.captionPrepare');
  if (running && t.left <= timing.warningAtMs) return T('liveScreen.captionWarning');
  return T(running ? 'liveScreen.captionRunning' : 'liveScreen.captionReady');
}

/* Update the visible CPR cycle; the timer itself records no treatment. */
function tickCycle(t, on, running, due, stopped) {
  let clockText;
  let title;
  if (stopped) {
    const hasRosc = st.s.phase === 'ROSC';
    clockText = T(hasRosc ? 'liveScreen.clockRosc' : 'liveScreen.clockEnded');
    title = T(hasRosc ? 'liveScreen.titleRosc' : 'liveScreen.titleEnded');
  } else {
    clockText = countdown(t.left);
    title = st.s.cycle ? T('liveScreen.cycleTitle', { number: st.s.cycle }) : T('liveScreen.readyForCpr');
  }
  $('cycleClock').textContent = clockText;
  $('cycleTitle').textContent = title;
  $('cycleCaption').textContent = cycleCaption(t, on, running, due, stopped);
  const alertText = due ? T('liveScreen.cycleCompleteAlert') : '';
  if ($('cycleAlert').textContent !== alertText) $('cycleAlert').textContent = alertText;
  $('timerPanel').classList.toggle('due', due);
  $('timerPanel').classList.toggle('prepare', running && t.left > 0 && t.left <= R.RULES.numbers.timing.prepareAtMs);
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
  if (!enabled) return T('liveCards.reviewInactive');
  if (remaining === null) return T('liveCards.noDoseRecorded');
  if (remaining < 0) return R.guideText('adrenalineOverdue');
  return R.guideText('adrenalineUntilReview');
}

function amiodaroneStatus(elapsed, count, enabled, due) {
  if (torsades()) return R.guideText('withholdTorsades');
  if (!enabled) return T('liveCards.reviewInactive');
  if (due) return T(count ? 'liveCards.reviewSecondDose' : 'liveCards.reviewFirstDose');
  const [first, second] = R.RULES.numbers.amiodarone.dueAtShocks;
  if (count >= R.RULES.numbers.amiodarone.dueAtShocks.length) return T('liveCards.sinceLastDose');
  if (elapsed === null) return R.guideText('amiodaroneReviewAt', { shocks: count ? second : first });
  return T('liveCards.sinceLastDose');
}

/* Update medication review clocks and release an expired display lock. */
function tickMedicines(t, c, on) {
  const enabled = on && !st.s.special;
  $('adrenalineClock').textContent =
    t.adr === null ? T('liveCards.emptyClock') : t.adr < 0 ? T('liveCards.overdueClock', { time: clock(-t.adr) }) : countdown(t.adr);
  $('adrenalineStatus').textContent = adrenalineStatus(t.adr, enabled);
  $('adrenalineCard').classList.toggle('attention', enabled && t.adr !== null && t.adr <= R.RULES.numbers.timing.adrenalineHighlightMs);
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
    $('amiodaroneClock').textContent = t.amio === null ? T('liveCards.emptyClock') : clock(t.amio);
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
  const guidelineLinks = R.RULES.sources.guidanceLinks
    .map((id) => R.RULES.sources.guidelines[id])
    .map((g) => `<a href="${g.pdf}" target="_blank" rel="noopener">${g.label} · ${T('references.guidelineLink', { code: g.code })}</a>`).join('');
  sheet(
    T('guidance.sourcesTitle'),
    paras('guidanceIntro') +
    `<div class="stack">${guidelineLinks}</div><details class="panel"><summary>${R.guideText('guidanceRsiTitle')}</summary>` +
    paras('guidanceRsi') + `</details>` +
    `<p class="caption">${R.guideText('guidanceCaption')}</p>`,
  );
}

/* Live-screen support card: magnesium for torsades or fluids for PEA / Asystole / Other. */
export function supportCard(type) {
  const mag = type === 'magnesium';
  const ref = mag ? R.magnesiumReference(st.s) : R.fluidReference(st.s);
  const stats = R.supportStats(st.s, type);
  let value;
  if (mag) value = ref.dose === null ? T('liveCards.doseClinicalReview') : T('liveCards.doseMmolIv', { dose: ref.dose });
  else value = ref.min === null ? T('liveCards.enterWeight') : T('liveCards.volumeMlIv', { min: ref.min, max: ref.max });

  const enabled = !st.s.special && !['ROSC', 'Ended'].includes(st.s.phase);
  const maxDoses = R.RULES.numbers.magnesium.maxDoses;
  const canRef = enabled && (!mag || (ref.dose !== null && stats.count < maxDoses));
  let label;
  if (!mag) label = T('liveCards.recordFluid');
  else if (stats.count >= maxDoses) label = R.guideText('maxDosesRecorded', { maxDoses });
  else if (ref.dose === null) label = T('liveCards.reviewDose');
  else if (stats.count) label = T('liveCards.recordRepeat');
  else label = T('liveCards.recordMmolIv', { dose: ref.dose });

  let buttonText = label;
  if (!enabled) {
    if (st.s.phase === 'ROSC') buttonText = T('liveCards.roscRecorded');
    else if (st.s.phase === 'Ended') buttonText = T('liveCards.sessionEnded');
    else buttonText = T('liveCards.manualReview');
  }
  return `<section class="drug ${type}" id="${type}Card"><h3>${mag ? T('drugNames.magnesium') : R.guideText('fluidsCardTitle')}</h3>` +
      `<div class="drug-dose">${esc(value)}</div>` +
      `<strong class="drug-clock" id="supportClock">${T('liveCards.emptyClock')}</strong>` +
      `<p class="caption" id="supportStatus"></p>` +
      `<button class="record" data-support="${type}" ${canRef ? '' : 'disabled'}>${buttonText}</button><div class="drug-links"><button class="administration-link" data-drug-info="${type}">${T('liveCards.administrationLink')}</button>` +
      `<button class="alternate" data-custom-drug="${type}">${T('liveCards.otherLink')}</button></div></section>`;
}

/* Per-tick text for that card: time since last dose and status line. */
export function tickSupport(type, enabled) {
  const stats = R.supportStats(st.s, type);
  $('supportClock').textContent = stats.last ? clock(Date.now() - stats.last.at) : T('liveCards.emptyClock');
  let status;
  if (!enabled) {
    status = T('liveCards.reviewInactive');
  } else if (type === 'magnesium') {
    if (stats.count >= R.RULES.numbers.magnesium.maxDoses) status = R.guideText('magnesiumMaxDosesStatus');
    else if (stats.count) status = R.guideText('magnesiumRepeatStatus');
    else status = R.guideText('magnesiumFirstStatus');
  } else if (stats.total) {
    status = T('liveCards.fluidRecordedTotal', { total: stats.total });
  } else {
    const latest = R.latestLowerRhythm(st.s);
    const rhythm = latest === 'Asystole' || latest === 'Other' ? latest : 'PEA';
    status = T('liveCards.fluidReviewVolume', { rhythm });
  }
  $('supportStatus').textContent = status;
}

/* The Guidance tab: a button for each checklist. */
export function guidanceGrid() {
  const checklistButtons = R.RULES.checklists.lists
    .map((c) => `<button data-open-check="${c.id}">${T('guidance.checklistButton', { label: c.label })}</button>`).join('');
  const weight = st.s.weight ? T('weightHeader.weightKg', { weight: esc(st.s.weight) }) : T('liveCards.enterWeight');
  const age = st.s.age ? T('guidance.ageYears', { age: esc(st.s.age) }) : T('guidance.ageCriteria');
  const causeButtons = R.RULES.checklists.causes
    .map((c) => `<button data-cause-guide="${c.id}">${c.name}</button>`).join('');
  return `<h2>${T('guidance.heading')}</h2><div class="guidance-grid">${checklistButtons}` +
    `<button data-reference="rsi">${T('guidance.rsiButton')}<br><small>${weight}</small></button>` +
    `<button data-reference="tubes">${T('guidance.tubesButton')}<br><small>${age}</small></button></div>` +
    `<section class="causes-board"><h3>${T('guidance.causesHeading')}</h3><div>${causeButtons}</div></section>`;
}

/* Reference pop-up opened from Guidance (RSI doses, tube sizes), calculated from weight or age. */
export function referenceSheet(type) {
  const w = Number(st.s.weight),
    age = st.s.age === '' ? null : Number(st.s.age);
  if (type === 'rsi') {
    // These are reference values only; opening this sheet records no medicine (rule: engine rsiDoses).
    const d = R.rsiDoses(w);
    const doseList = w
      ? `<p><b>${T('weightHeader.weightKg', { weight: w })}</b> · ${R.guideText('rsiNotRecorded')}</p><dl>` +
        `<dt>${T('referenceSheets.fentanylName')}</dt><dd>${T('referenceSheets.doseMcgIv', { dose: d.fentanylMcg })}</dd>` +
        `<dt>${T('referenceSheets.ketamineUsualName')}</dt><dd>${T('liveCards.doseMgIv', { dose: d.ketamineMg })}</dd>` +
        `<dt>${T('referenceSheets.ketamineReducedName')}</dt><dd>${T('liveCards.doseMgIv', { dose: d.reducedKetamineMg })}</dd>` +
        `<dt>${T('referenceSheets.blockerName')}</dt><dd>${T('liveCards.doseMgIv', { dose: d.blockerMg })}</dd></dl>`
      : '<button class="primary" data-action="weight">' + T('referenceSheets.enterWeightButton') + '</button>';
    sheet(
      T('referenceSheets.rsiTitle'),
      `${doseList}${paras('rsiConditions')}` +
      `<a href="${R.RULES.sources.guidelines.rsi.pdf}" target="_blank">${T('references.guidelineLink', { code: R.RULES.sources.guidelines.rsi.code })}</a>`,
    );
    return;
  }
  const tube = R.tubeReference(age); // rule: engine tubeReference
  const igelRanges = R.RULES.equipment.igelRanges
    .map((r) => (r.maxKg === null
      ? T('referenceSheets.igelRangeAndAbove', { size: r.size, min: r.minKg })
      : T('referenceSheets.igelRange', { size: r.size, min: r.minKg, max: r.maxKg }))).join(' · ');
  const tubeReference = tube
    ? `<p><b>${T('referenceSheets.cuffedEtt')}</b> ${tube.size}</p><p><b>${T('referenceSheets.lengthAtLips')}</b> ${tube.length}</p>`
    : paras('tubeNoAge');
  sheet(
    T('referenceSheets.tubesTitle'),
    `<label>${T('referenceSheets.ageLabel')}<input id="referenceAge" type="number" min="0" max="120" step="any" value="${esc(st.s.age)}"></label>` +
    `<button data-save-age>${T('referenceSheets.useAgeButton')}</button>${tubeReference}` +
    `<p class="caption">${R.guideText('tubeCaution')}</p>` +
    `<h3>${T('referenceSheets.ageEstimateHeading')}</h3><p>${R.wording('tubeSheetAgeEstimate', R.ageEstimateGaps())}</p>` +
    `<h3>${T('referenceSheets.igelHeading')}</h3><p>${T('referenceSheets.igelRangesLine', { ranges: igelRanges })}</p>` +
    `<a href="${R.RULES.sources.guidelines.paediatric.pdf}" target="_blank">${T('references.guidelineLink', { code: R.RULES.sources.guidelines.paediatric.code })}</a><p class="caption">${R.guideText('igelSourceCaption')}</p>`,
  );
}
