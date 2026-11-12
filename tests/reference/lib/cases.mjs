// Reference recordings (stage 0): the generated cases.
//
// Each case is made from a fixed number (its seed), so it is exactly the same every time it runs.
// A case is a short clinical "story" told through taps on the real app: entering a weight, running
// CPR cycles, rhythm checks, doses, corrections, ROSC and re-arrest, the other tabs, and so on.
// Cases take turns through the THEMES below (case 0 is the first theme, case 1 the second, ...),
// and every case also gets a random set-up at the start, random "interruptions" in the middle
// (a pop-up opened, a correction, a reload, the special situation switch...) and a tour of the
// Log, Guidance and export at the end.
//
// The person in the story only taps what is on screen. They look at the screen and at what the app
// saved (e.g. how long the cycle has left) to choose a sensible next move, exactly like a clinician
// would. If the app behaves differently, the story can go differently, but the first difference is
// always on the screen first, so the comparison finds it.
//
// IMPORTANT: changing anything in this file changes the cases. Then GENERATOR_VERSION must go up
// and the recordings must be made again FROM THE REFERENCE COMMIT (see tests/reference/README.md).
export const GENERATOR_VERSION = 3;
export const SEED_BASE = 20261112;

export const THEMES = [
  'shockable', 'nonShockable', 'torsades', 'rosc', 'corrections', 'counts',
  'special', 'timers', 'references', 'reload', 'records', 'mixed',
];

/* The first cases (0-8) are fixed SWEEPS: every value of a per-value formula or table is tried in turn (all
   ages, every weight-band edge, every equipment size, ...), so the fast set always covers them.
   After them, the themes above take turns. */
export const SWEEPS = ['ages', 'bandsAdrenaline', 'bandsAmiodarone', 'bandsMagnesium', 'bandsFluids', 'lists', 'midnight', 'timers', 'characters'];
/* How many cases are recorded, and how many of them `npm test` replays (the fast set: every sweep and
   20 cases of each theme). record.mjs uses these, so the plain command reproduces the files exactly. */
export const RECORDED_CASES = SWEEPS.length + 3600;
export const FAST_CASES = SWEEPS.length + 240;
const MIDNIGHT = 5800000; // the fixed start is 22:13:20 UTC; this many ms later is 23:50:00

export function caseInfo(id) {
  const seed = (SEED_BASE + Math.imul(id, 2654435761)) >>> 0;
  if (id < SWEEPS.length) return { id, theme: 'sweep ' + SWEEPS[id], seed, startOffset: SWEEPS[id] === 'midnight' ? MIDNIGHT : 0 };
  const n = id - SWEEPS.length;
  // every 40th regular case starts a few minutes before midnight, so its events run past 00:00
  return { id, theme: THEMES[n % THEMES.length], seed, startOffset: n % 40 === 20 ? MIDNIGHT - (n % 7) * 60000 : 0 };
}

/* Repeatable random numbers from a seed (the same generator as tests/helpers/fuzz.mjs). */
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const SEC = 1000, MIN = 60000;
const CYCLE_MS = 2 * MIN;

/* Weights: none, every CPG band and both sides of each edge, adult, maximum and invalid entries. */
export const WEIGHTS = ['', '0.5', '3', '5', '5.1', '7.5', '10', '10.1', '12', '15', '20', '20.1', '25', '30', '30.1',
  '35', '40', '40.1', '41', '42', '50', '80', '120', '500'];
export const BAD_WEIGHTS = ['0', '500.1', '600', '7.55', '15,5', 'abc', ' 12', '.'];
export const AGES = ['0.5', '0.01', '1', '2.5', '3', '7', '10', '11', '14', '15', '0', '-1', 'abc', ''];
const ENERGIES = ['', '200', '150', '120', '80', '20', '1000', '0', '1001', '-3', 'abc', '4.5'];
const ROSC_RHYTHMS = ['Sinus rhythm', 'Organised rhythm', 'AF', 'Other', 'Unknown'];
const NOSHOCK_RHYTHMS = ['PEA', 'Asystole', 'Other', 'Unknown'];
const SHOCK_RHYTHMS = ['VF', 'VT'];
const MEDICINE_NAMES = ['', 'adrenaline', 'AMIODARONE', 'Magnesium', ' Adrenaline ', 'Adrenalin', '0.9% Sodium Chloride',
  '0.9% sodium chloride', 'Calcium chloride', 'Sodium bicarbonate', 'magnesium sulphate', 'Fluids'];
const DEVICES = ['iv', 'io', 'opa', 'npa', 'igel', 'laryngoscopy', 'intubation'];
const CHECKLISTS = ['arrest', 'postrosc', 'preparation', 'rsi'];
const CAUSES = ['oxygen', 'volume', 'metabolic', 'temperature', 'tension', 'tamponade', 'toxins', 'thrombosis'];

/* Clock text for a time box (HH:MM), in the fake browser's UTC. */
const hhmm = (ms) => new Date(ms).toISOString().slice(11, 16);

class Story {
  constructor(D, r) { this.D = D; this.r = r; }

  /* --- random choices --- */
  p(chance) { return this.r() < chance; }
  pick(list) { return list[Math.floor(this.r() * list.length)]; }
  int(lo, hi) { return lo + Math.floor(this.r() * (hi - lo + 1)); }
  weighted(entries) { // [[weight, value], ...]
    const total = entries.reduce((s, [w]) => s + w, 0);
    let x = this.r() * total;
    for (const [w, v] of entries) { if ((x -= w) < 0) return v; }
    return entries.at(-1)[1];
  }

  /* --- what the person can see --- */
  has(sel) { return !this.D.whyNot(this.D.$(sel)); }
  session() { return this.D.saved() || {}; }
  phase() { return this.session().phase; }
  left() { const s = this.session(); return s.deadline == null ? s.remaining : Math.max(0, s.deadline - this.D.now); }
  running() { const s = this.session(); return s.phase === 'Active' && s.deadline != null; }
  lastDose(type) {
    const ev = (this.session().events || []).filter((e) => e.type === type && !e.voided).sort((a, b) => a.at - b.at);
    return ev.at(-1);
  }

  /* --- moving around --- */
  async closeSheet(how = 'x') {
    if (!this.D.sheetOpen()) return;
    const content = this.D.$('#sheet .sheet-content [data-close]');
    if (how === 'button' && content) return this.D.tap(content);
    return this.D.tap('#sheet .sheet-heading [data-close]');
  }
  async toTab(tab) {
    await this.closeSheet();
    if (this.D.tab() !== tab) await this.D.tap(`.bottom-nav [data-tab=${tab}]`);
  }
  async live() { await this.toTab('live'); }
  async menu() { await this.closeSheet(); await this.D.tap('[data-action=settings]'); }

  /* --- time --- */
  async waitLeft(target, why) { // let the cycle run until exactly `target` ms remain
    if (!this.running()) return;
    const gap = this.left() - target;
    if (gap > 0) await this.D.wait(gap, why || `until ${target} ms of the cycle remain`);
  }
  async waitDue(extra = 0) {
    await this.waitLeft(0, 'until the rhythm check is due');
    if (extra && this.running()) await this.D.wait(extra, 'rhythm check overdue');
  }
  async timerMoments() { // the cycle-clock thresholds, each just before, at and just after
    const marks = [90001, 90000, 89999, 30001, 30000, 29999, 15001, 15000, 14999, 1000, 1, 0];
    for (const m of marks) if (this.p(0.55)) await this.waitLeft(m);
  }
  async adrenalineMoments() { // review highlight and overdue, plus the double-tap lock edges
    const last = this.lastDose('adrenaline');
    if (!last) return;
    const lock = 210000, review = 240000;
    for (const at of [lock - 1, lock, lock + 1, review - 30001, review - 30000, review - 29999, review - 1, review, review + 1, review + 61000]) {
      const gap = last.at + at - this.D.now;
      if (gap > 0 && this.p(0.5)) {
        await this.D.wait(gap, `${at} ms after the last adrenaline`);
        if (this.p(0.3)) await this.D.tap('[data-drug=adrenaline]');
      }
    }
  }

  /* --- weight --- */
  async weight(value, method, sure = false) { // sure: always save (no changing their mind)
    await this.closeSheet();
    await this.D.tap(this.p(0.15) && this.D.tab() === 'guidance' && this.has('[data-reference=rsi]') ? '[data-reference=rsi]' : '[data-action=weight]');
    if (this.D.sheetTitle() === 'RSI dose references') {
      if (!this.has('#sheet [data-action=weight]')) return this.closeSheet();
      await this.D.tap('#sheet [data-action=weight]');
    }
    method = method || this.weighted([[6, 'keypad'], [2, 'typed'], [1, 'mistakes']]);
    if (method === 'typed') await this.D.fill('#weightInput', value);
    else {
      const keys = [...value].filter((k) => '0123456789.'.includes(k));
      if (method === 'mistakes') { await this.D.tap(`[data-key="${this.pick(['9', '1', '.', '0'])}"]`); await this.D.tap('[data-key="⌫"]'); }
      for (const k of keys) {
        await this.D.tap(`[data-key="${k}"]`);
        if (method === 'mistakes' && k === '.' && this.p(0.5)) await this.D.tap('[data-key="."]'); // a second point is ignored
      }
      if (method === 'mistakes' && this.p(0.5)) { await this.D.tap('[data-key="⌫"]'); if (keys.length) await this.D.tap(`[data-key="${keys.at(-1)}"]`); }
    }
    if (!sure && this.p(0.08)) return this.closeSheet(); // changed their mind
    await this.D.tap('[data-action=save-weight]');
    if (this.D.sheetOpen()) await this.closeSheet(); // refused entry: error shown, then closed
  }
  async ageEstimate(age, save = true) {
    await this.closeSheet();
    await this.D.tap('[data-action=weight]');
    await this.D.tap('#sheet details summary');
    await this.D.fill('#ageInput', age);
    await this.D.tap('[data-action=estimate]');
    if (this.p(0.2)) { await this.D.tap(`[data-key="${this.pick(['1', '2', '⌫'])}"]`); }
    if (save) await this.D.tap('[data-action=save-weight]');
    await this.closeSheet();
  }
  async randomWeight(changeOnly = false) {
    const roll = this.r();
    if (roll < 0.12) return this.ageEstimate(this.pick(AGES), this.p(0.85));
    if (roll < 0.22) return this.weight(this.pick(BAD_WEIGHTS));
    const w = this.pick(WEIGHTS);
    if (w === '' && changeOnly) return this.weight(this.pick(WEIGHTS.slice(1)));
    if (w === '') return;
    return this.weight(w);
  }

  /* --- rhythm checks --- */
  async check(outcome, rhythm, opt = {}) {
    await this.live();
    if (!this.has('#rhythmCheck')) {
      if (!this.running()) { if (this.phase() !== 'Ready' || !this.p(0.5)) return; await this.D.tap('#startCycle'); }
      await this.waitDue(opt.late ?? this.pick([0, 0, 0, 0, 1000, 1001, 65000]));
    }
    await this.D.tap('#rhythmCheck');
    await this.D.tap(`#sheet [data-outcome=${outcome}]`);
    if (opt.abandon) return this.closeSheet(); // rhythm never chosen: left as "Rhythm not recorded"
    if (outcome === 'shock') {
      const energy = 'energy' in opt ? opt.energy : (this.p(0.25) ? this.pick(ENERGIES) : null);
      if (energy !== null) await this.D.fill('#shockEnergy', energy);
    }
    await this.D.tap(`#sheet [data-record-rhythm="${rhythm}"]`);
    if (this.D.sheetTitle() === 'Record shock delivered' && this.D.$('#sheetError:not([hidden])')) {
      await this.D.fill('#shockEnergy', this.pick(['', '200']));
      await this.D.tap(`#sheet [data-record-rhythm="${rhythm}"]`);
    }
    if (this.D.sheetTitle() === 'Confirm Torsades') {
      const answer = opt.torsades ?? this.pick(['confirm', 'confirm', 'back']);
      if (answer === 'back') {
        await this.D.tap('#sheet [data-back-rhythms]');
        const next = this.pick(['VF', 'VT', 'Torsades']);
        await this.D.tap(`#sheet [data-record-rhythm="${next}"]`);
        if (this.D.sheetTitle() === 'Confirm Torsades') await this.D.tap('#sheet [data-confirm-torsades]');
      } else await this.D.tap('#sheet [data-confirm-torsades]');
    }
    if (/fluid guidance/.test(this.D.sheetTitle())) {
      const how = opt.fluidClose ?? this.pick(['button', 'button', 'x', 'leave']);
      if (how !== 'leave') await this.closeSheet(how);
    }
    if (this.D.tab() === 'checks' && this.p(0.5)) await this.postRoscTicks();
  }
  async shock(rhythm) { return this.check('shock', rhythm || this.pick(SHOCK_RHYTHMS)); }
  async noShock(rhythm) { return this.check('noshock', rhythm || this.pick(NOSHOCK_RHYTHMS)); }
  async rosc(rhythm, via) {
    rhythm = rhythm || this.pick(ROSC_RHYTHMS);
    via = via || (this.has('#rhythmCheck') ? this.pick(['check', 'button']) : 'button');
    if (via === 'check') return this.check('rosc', rhythm);
    await this.live();
    await this.D.tap('#unexpectedRosc');
    if (this.p(0.07)) return this.closeSheet();
    await this.D.tap(`#sheet [data-record-rhythm="${rhythm}"]`);
    if (this.D.tab() === 'checks' && this.p(0.6)) await this.postRoscTicks();
  }
  async postRoscTicks() {
    if (this.D.tab() === 'checks' && this.p(0.3)) await this.live(); // look at the Live screen, then come back by its button
    if (this.D.tab() !== 'checks') { await this.live(); await this.D.tap('[data-action=postrosc]'); }
    const boxes = this.D.$$('#main [data-check]');
    for (let i = 0; i < boxes.length; i++) if (this.p(0.4)) await this.D.tap(`#main [data-check="${boxes[i].dataset.check}"]`);
  }
  async rearrest() { await this.live(); await this.D.tap('[data-action=rearrest]'); }
  async start() { await this.live(); await this.D.tap('#startCycle'); }

  /* --- medicines --- */
  async adrenaline(taps = 1) { await this.live(); for (let i = 0; i < taps; i++) await this.D.tap('[data-drug=adrenaline]'); }
  async amiodarone() {
    await this.live();
    if (this.has('[data-select-dose]')) {
      await this.D.tap('[data-select-dose]');
      await this.D.fill('#drugForm [name=dose]', this.pick(['12.5', '25', '50', '75', '0', '-5', 'abc']));
      if (this.p(0.2)) await this.D.fill('#drugForm [name=at]', hhmm(this.D.now - 2 * MIN));
      await this.D.tap('#drugForm button[type=submit]');
      return this.closeSheet();
    }
    await this.D.tap(this.D.$('[data-drug=amiodarone]') ? '[data-drug=amiodarone]' : '#amiodaronePending');
  }
  async support(opt = {}) {
    await this.live();
    const btn = this.D.$('[data-support]');
    const taps = opt.taps ?? (this.p(0.15) ? 2 : 1);
    for (let i = 0; i < taps; i++) {
      await this.D.tap(btn && btn.isConnected ? btn : '[data-support]');
      if (this.D.sheetTitle() === 'Repeat magnesium?') {
        if (this.p(0.75)) await this.D.tap('#sheet [data-confirm-magnesium]'); else await this.closeSheet(this.pick(['button', 'x']));
      } else if (this.has('#drugForm')) {
        await this.fillDrugForm({ name: null, dose: this.pick(['250', '500', '1000', '60', '20', '0', '']), unit: this.p(0.15) ? this.pick(['mg', 'mL', 'g']) : null });
      }
    }
  }
  async info(type) { await this.live(); await this.D.tap(`[data-drug-info=${type}]`); if (this.p(0.9)) await this.closeSheet(); }
  async infoAll() {
    await this.live();
    for (const b of this.D.$$('#main [data-drug-info]').map((x) => x.dataset.drugInfo)) await this.info(b);
  }
  async fillDrugForm({ name, dose, unit, route, time, notes } = {}) {
    if (name !== null && name !== undefined) await this.D.fill('#drugForm [name=name]', name);
    if (dose !== undefined) await this.D.fill('#drugForm [name=dose]', dose);
    if (unit) await this.D.fill('#drugForm [name=unit]', unit);
    if (route) await this.D.tap(`#drugForm input[name=route][value="${route}"]`);
    if (time) await this.D.fill('#drugForm [name=at]', time);
    if (notes) await this.D.fill('#drugForm [name=notes]', notes);
    await this.D.tap('#drugForm button[type=submit]');
    if (this.D.sheetOpen()) await this.closeSheet();
  }
  async other(type) { // the "Other…" entry on a card, the note sheet, or Earlier doses
    await this.live();
    if (type === 'other') { await this.D.tap('[data-action=note]'); await this.D.tap('#sheet [data-custom-drug=other]'); }
    else if (type === 'earlier') { await this.menu(); await this.D.tap('[data-action=history]'); await this.D.tap('#sheet [data-custom-drug=adrenaline]'); }
    else await this.D.tap(`#main [data-custom-drug=${type}]`);
    if (!this.has('#drugForm')) return this.closeSheet();
    const now = this.D.now;
    await this.fillDrugForm({
      name: type === 'other' || this.p(0.3) ? this.pick(MEDICINE_NAMES) : null,
      dose: this.pick(['1', '0.5', '0.1', '300', '150', '4', '10', '500', '0', '-1', '']),
      unit: this.p(0.4) ? this.pick(['mg', 'mcg', 'mmol', 'mL', 'g']) : null,
      route: this.p(0.85) ? this.pick(['IV', 'IO', 'IM', 'Other']) : null,
      time: this.p(0.3) ? this.pick([hhmm(now - 3 * MIN), hhmm(now + 10 * MIN), hhmm(now - 30 * MIN), hhmm(now)]) : null,
      notes: this.p(0.2) ? this.pick(['given by paramedic', '<b>bold?</b>', 'flush 10 mL']) : null,
    });
  }

  /* --- counts and start time --- */
  async previousShock(n = 1) { await this.live(); for (let i = 0; i < n; i++) await this.D.tap('[data-action=previous-shock]'); }
  async history() {
    await this.menu();
    await this.D.tap('[data-action=history]');
    const sets = [['0', '0', '0', '0'], ['2', '1', '1', '0'], ['3', '0', '0', '1'], ['5', '2', '2', '1'], ['6', '0', '0', '2'],
      ['1', '1', '2', '0'], ['101', '0', '0', '0'], ['2.5', '0', '0', '0'], ['-1', '0', '0', '0'], ['4', '3', '1', '2']];
    const [a, b, c, d] = this.pick(sets);
    await this.D.fill('#priorShocks', a); await this.D.fill('#priorNoShock', b); await this.D.fill('#priorStreak', c); await this.D.fill('#priorAmio', d);
    await this.D.tap('[data-action=save-history]');
    if (this.D.sheetOpen()) await this.closeSheet();
  }
  async resusTime() {
    await this.closeSheet();
    if (this.p(0.5)) await this.D.tap('header [data-action=resus-time]'); else { await this.menu(); await this.D.tap('#sheet [data-action=resus-time]'); }
    const choice = this.pick(['5', '10', '15', '20', 'typed', 'future', 'none']);
    if (['5', '10', '15', '20'].includes(choice)) await this.D.tap(`#sheet [data-earlier="${choice}"]`);
    else if (choice === 'typed') await this.D.fill('#resusStartInput', new Date(this.session().appStart - 7 * MIN).toISOString().slice(0, 16));
    else if (choice === 'future') await this.D.fill('#resusStartInput', new Date(this.D.now + 60 * MIN).toISOString().slice(0, 16));
    await this.D.tap('[data-action=save-resus-time]');
    if (this.D.sheetOpen()) await this.closeSheet();
  }

  /* --- settings --- */
  async special(on) {
    await this.menu();
    const box = this.D.$('#specialInput');
    if (box && box.checked !== on) await this.D.tap(box);
    await this.closeSheet();
  }
  async largeText() { await this.menu(); await this.D.tap('[data-action=large]'); await this.closeSheet(); }
  async undo(times = 1) { for (let i = 0; i < times; i++) { await this.menu(); await this.D.tap('#undo'); } await this.closeSheet(); }
  async end(confirm = true) {
    await this.menu(); await this.D.tap('[data-action=end]');
    if (confirm) await this.D.tap('[data-action=confirm-end]'); else await this.closeSheet('button');
  }
  async newPatient(how = 'confirm') {
    await this.menu(); await this.D.tap('[data-action=new]');
    if (how === 'export') { await this.D.tap('#sheet [data-action=export]'); await this.D.tap('[data-action=download-text]'); await this.closeSheet(); }
    else await this.D.tap('[data-action=confirm-new]');
  }
  async extras() {
    const which = this.pick(['tutorial', 'install', 'wake', 'cycleLog', 'airway', 'access', 'guidanceButton', 'resusTimeOnly']);
    if (which === 'tutorial') { await this.menu(); await this.D.tap('[data-action=explain-me]'); await this.D.tap('[data-explain-next]'); if (this.p(0.5)) await this.D.tap('[data-explain-prev]'); await this.closeSheet(); }
    if (which === 'install') { await this.menu(); await this.D.tap('[data-action=install]'); await this.closeSheet(); }
    if (which === 'wake') { await this.menu(); await this.D.tap('[data-action=wake]'); await this.closeSheet(); }
    if (which === 'cycleLog') { await this.live(); await this.D.tap('[data-action=cycle-log]'); await this.closeSheet(); }
    if (which === 'airway' || which === 'access') { await this.live(); await this.D.tap(`[data-action=${which}]`); await this.closeSheet(); }
    if (which === 'guidanceButton') { await this.menu(); await this.D.tap('#sheet [data-action=guidance]'); }
    if (which === 'resusTimeOnly') { await this.closeSheet(); await this.D.tap('header [data-action=resus-time]'); await this.closeSheet(); }
  }

  /* --- records: notes, equipment, checklists --- */
  async note() {
    await this.live();
    await this.D.tap(this.p(0.8) ? '#main [data-action=note]' : '#main [data-action=note]');
    await this.D.fill('#noteForm [name=text]', this.pick(['Pads on', 'Family present', '', '   ', 'Airway <check>', 'Handover to ICU']));
    if (this.p(0.2)) await this.D.fill('#noteForm [name=at]', hhmm(this.D.now - 5 * MIN));
    await this.D.tap('#noteForm button[type=submit]');
    if (this.D.sheetOpen()) await this.closeSheet();
  }
  async equipment(device) {
    device = device || this.pick(DEVICES);
    await this.live();
    const entry = ['iv', 'io'].includes(device) ? this.pick(['interventions', 'access']) : this.pick(['interventions', 'airway']);
    await this.D.tap(`#main [data-action=${entry}]`);
    await this.D.tap(`#sheet [data-equipment=${device}]`);
    const radios = (name) => this.D.$$(`#equipmentForm input[name=${name}]`);
    const choose = async (name, chance = 0.7) => { const list = radios(name); if (list.length && this.p(chance)) await this.D.tap(this.pick(list)); };
    if (device === 'laryngoscopy') { await choose('method', 0.85); await choose('size'); await choose('forceps'); await choose('view'); }
    else await choose('size');
    await choose('side'); await choose('site'); await choose('adjunct'); await choose('outcome');
    if (device === 'intubation') {
      if (this.p(0.5)) await this.D.fill('#equipmentForm [name=lips]', this.pick(['21', '7.5', '0', '51', '']));
      for (const box of this.D.$$('#equipmentForm input[name=confirmation]')) if (this.p(0.4)) await this.D.tap(box);
    }
    if (this.p(0.2)) await this.D.fill('#equipmentForm [name=notes]', this.pick(['Grade 2 view', 'difficult', '']));
    const follow = this.D.$('#equipmentForm button[name=followUp]');
    await this.D.tap(follow && this.p(0.5) ? follow : '#equipmentForm button[type=submit]');
    if (this.has('#equipmentForm') && this.p(0.6)) { await choose('size', 0.9); await this.D.tap('#equipmentForm button[type=submit]'); }
    if (this.D.sheetOpen()) await this.closeSheet();
  }
  async checklist(list = 'arrest') {
    await this.closeSheet();
    if (list === 'arrest') await this.D.tap('.bottom-nav [data-tab=checks]');
    else { await this.toTab('guidance'); await this.D.tap(`[data-open-check="${list}"]`); }
    const boxes = this.D.$$('#main [data-check]');
    const all = this.p(0.2);
    for (const b of boxes) if (all || this.p(0.3)) await this.D.tap(`#main [data-check="${b.dataset.check}"]`);
    if (this.p(0.3) && boxes.length) await this.D.tap(`#main [data-check="${boxes[0].dataset.check}"]`); // untick or tick again
    if (this.p(0.6)) await this.D.tap('#main .check-back');
  }
  async guidanceTour() {
    await this.toTab('guidance');
    const what = this.pick(['rsi', 'tubes', 'cause', 'checklist']);
    if (what === 'rsi') { await this.D.tap('[data-reference=rsi]'); await this.closeSheet(); }
    if (what === 'tubes') {
      await this.D.tap('[data-reference=tubes]');
      if (this.p(0.7)) { await this.D.fill('#referenceAge', this.pick(['', '0', '0.5', '1', '4', '7', '10.5', '14', '15', '121', '-2'])); await this.D.tap('[data-save-age]'); }
      await this.closeSheet();
    }
    if (what === 'cause') { await this.D.tap(`[data-cause-guide="${this.pick(CAUSES)}"]`); await this.closeSheet(); }
    if (what === 'checklist') await this.checklist(this.pick(CHECKLISTS));
  }

  /* --- the Log: filters, corrections and voids --- */
  async logTour() {
    await this.toTab('log');
    if (this.p(0.6)) { await this.D.fill('#logScope', 'interventions'); if (this.p(0.5)) await this.D.fill('#logScope', 'all'); }
    if (this.p(0.3) && this.D.$('#logScope').value === 'all') {
      await this.D.fill('#checklistDisplay', 'times');
      const summary = this.D.$$('#main [data-review-checklist]');
      if (summary.length && this.p(0.4)) { await this.D.tap(this.pick(summary)); if (this.p(0.6)) await this.D.tap('#main .check-back'); return; }
      if (this.p(0.5)) await this.D.fill('#checklistDisplay', 'items');
    }
    if (this.p(0.3)) await this.D.tap('#main [data-action=copy]');
  }
  /* Open the Log and correct one event. `only` limits which events (by their "Edit …" label). */
  async correction(kind, only = null) {
    await this.toTab('log');
    if (this.p(0.2) && !only) await this.D.fill('#logScope', this.pick(['all', 'interventions']));
    const review = only ? [] : this.D.$$('#main .review-shock');
    const edits = this.D.$$('#main button[data-edit]:not(.review-shock)').filter((b) => !only || only.test(b.getAttribute('aria-label') || ''));
    const synthetic = this.D.$$('#main [data-review-checklist]');
    if (synthetic.length && !only && this.p(0.1)) return this.D.tap(this.pick(synthetic));
    const useReview = review.length && this.p(0.5);
    const button = useReview ? this.pick(review) : edits.length ? this.pick(edits) : null;
    if (!button) return;
    await this.D.tap(button);
    if (!this.has('#editForm')) return this.closeSheet();
    if (useReview && !kind) { // a shock from before the app: add its time (before the app opened, or wrongly after)
      const s = this.session();
      await this.D.fill('#editForm [name=at]', hhmm(s.appStart - this.pick([2 * MIN, 10 * MIN, -5 * MIN])));
      if (this.p(0.5)) await this.D.fill('#editForm [name=rhythm]', this.pick(['VF', 'VT', 'Torsades', 'Unknown']));
      if (this.p(0.3)) await this.D.fill('#editForm [name=energy]', '200');
      await this.D.tap('#editForm button[type=submit]');
      if (this.D.sheetOpen()) await this.closeSheet();
      return;
    }
    const f = (n) => this.D.$(`#editForm [name=${n}]`);
    if (!kind) { // a change that fits this event
      const fits = ['time', 'details', 'void', 'void', 'nothing', 'cancel'];
      if (f('rhythm')) fits.push('rhythm', 'rhythm', 'rhythm');
      if (f('dose')) fits.push('dose', 'dose', 'dose');
      if (f('energy')) fits.push('energy');
      kind = this.pick(fits);
    }
    if (kind === 'void') {
      if (this.has('#sheet [data-void]')) {
        await this.D.tap('#sheet [data-void]');
        if (this.p(0.3)) { // changed their mind: open the same (now voided) entry and restore it
          const again = this.D.$$('#main article.void button[data-edit]');
          if (again.length) { await this.D.tap(again.at(-1)); if (this.has('#sheet [data-void]')) await this.D.tap('#sheet [data-void]'); else await this.closeSheet(); }
        }
        return;
      }
      kind = 'time';
    }
    if (kind === 'cancel') return this.closeSheet();
    if (kind === 'rhythm' && f('rhythm')) await this.D.fill(f('rhythm'), this.pick([...f('rhythm').options].map((o) => o.value)));
    if (kind === 'dose' && f('dose')) { await this.D.fill(f('dose'), this.pick(['2', '0.3', '150', '3', '0.05', '0', '-4', ''])); if (this.p(0.3)) await this.D.fill(f('unit'), this.pick(['mg', 'mL', 'mcg'])); if (this.p(0.2)) await this.D.fill(f('route'), 'IO'); }
    if (kind === 'energy' && f('energy')) await this.D.fill(f('energy'), this.pick(['150', '360', '', '1001', '0']));
    if (kind === 'time' || (kind !== 'nothing' && !f(kind))) {
      const s = this.session();
      await this.D.fill(f('at'), this.pick([hhmm(this.D.now - 4 * MIN), hhmm(this.D.now - 1 * MIN), hhmm(s.appStart - 2 * MIN), hhmm(this.D.now + 30 * MIN)]));
    }
    if (kind === 'details') await this.D.fill(f('details'), this.pick(['corrected by team leader', '', 'VF · 200 J']));
    await this.D.tap('#editForm button[type=submit]');
    if (this.D.sheetOpen()) await this.closeSheet();
  }

  /* --- random interruptions between the main beats of a story --- */
  async interrupt(chance = 0.18) {
    if (!this.p(chance)) return;
    const move = this.weighted([
      [6, 'info'], [3, 'cycleLog'], [4, 'log'], [3, 'guidance'], [3, 'checklist'], [2, 'note'], [3, 'weight'],
      [1, 'special'], [2, 'reload'], [2, 'undo'], [3, 'correction'], [1, 'equipment'], [1, 'other'], [2, 'extras'], [1, 'large'],
      [1, 'away'], [1, 'outside'],
    ]);
    if (move === 'info') { const list = this.D.$$('#main [data-drug-info]'); if (this.D.tab() === 'live' && list.length) await this.info(this.pick(list).dataset.drugInfo); else await this.info('adrenaline'); }
    if (move === 'cycleLog') { await this.live(); await this.D.tap('[data-action=cycle-log]'); await this.closeSheet(); }
    if (move === 'log') await this.logTour();
    if (move === 'guidance') await this.guidanceTour();
    if (move === 'checklist') await this.checklist('arrest');
    if (move === 'note') await this.note();
    if (move === 'weight') await this.randomWeight(true);
    if (move === 'special') { await this.special(true); if (this.p(0.7)) await this.special(false); }
    if (move === 'reload') await this.D.reload();
    if (move === 'undo') await this.undo(1);
    if (move === 'correction') await this.correction();
    if (move === 'equipment') await this.equipment();
    if (move === 'other') await this.other(this.pick(['adrenaline', 'other', 'amiodarone', 'magnesium', 'fluids']));
    if (move === 'extras') await this.extras();
    if (move === 'large') await this.largeText();
    if (move === 'away') await this.D.awayAndBack(this.pick([5000, 45000, 130000, 600000]));
    if (move === 'outside') { await this.live(); await this.D.tap(`#main [data-action=${this.pick(['interventions', 'airway', 'access'])}]`); await this.D.tapOutside(); await this.closeSheet(); }
  }

  /* A cycle ending in a rhythm check, with whatever doses a team would give around it. */
  async cycle({ outcome, rhythm, adrenaline = 0.6, amiodarone = 0.8, support = 0.5 } = {}) {
    await this.interrupt();
    if (this.running() && this.p(0.25)) await this.timerMoments();
    if (outcome === 'rosc') await this.rosc(rhythm);
    else await this.check(outcome || 'shock', rhythm || (outcome === 'noshock' ? this.pick(NOSHOCK_RHYTHMS) : this.pick(SHOCK_RHYTHMS)));
    if (this.D.tab() !== 'live' && this.p(0.5)) await this.live();
    const last = this.lastDose('adrenaline');
    if (this.p(adrenaline) && (!last || this.D.now - last.at >= 3.5 * MIN || this.p(0.15))) await this.adrenaline(this.p(0.12) ? this.int(2, 3) : 1);
    if (this.D.$('#main [data-drug=amiodarone]:not([disabled]), #main [data-select-dose]') && this.p(amiodarone)) await this.amiodarone();
    if (this.D.$('#main [data-support]:not([disabled])') && this.p(support)) await this.support();
    await this.interrupt();
  }

  /* --- every case starts and ends like this --- */
  async setup() {
    if (this.p(0.08)) await this.largeText();
    if (this.p(0.05)) { await this.toTab('log'); if (this.p(0.5)) await this.D.fill('#logScope', 'interventions'); await this.live(); } // empty log
    const roll = this.r();
    if (roll < 0.62) await this.weight(this.pick(WEIGHTS.slice(1)));
    else if (roll < 0.75) await this.ageEstimate(this.pick(AGES));
    else if (roll < 0.8) await this.weight(this.pick(BAD_WEIGHTS));
    if (this.p(0.12)) await this.previousShock(this.int(1, 3));
    if (this.p(0.1)) await this.history();
    if (this.p(0.12)) await this.resusTime();
    if (this.p(0.05)) await this.special(true);
    if (this.p(0.04)) await this.rosc();
    else if (this.p(0.96)) await this.start();
  }
  async finale() {
    await this.closeSheet();
    await this.toTab('log');
    await this.D.fill('#logScope', 'interventions');
    await this.D.fill('#logScope', 'all');
    if (this.p(0.4)) await this.D.fill('#checklistDisplay', 'times');
    if (this.p(0.25)) await this.guidanceTour();
    await this.live();
    if (this.p(0.35)) { await this.menu(); await this.D.tap('[data-action=export]'); await this.D.tap(this.pick(['[data-action=download-text]', '[data-action=copy]', '[data-action=download-json]'])); await this.closeSheet(); }
    if (this.p(0.1)) await this.end(this.p(0.85));
    if (this.p(0.05)) await this.newPatient(this.pick(['confirm', 'export']));
  }
}

/* ---------- the themes ---------- */
const STORIES = {
  /* VF / pulseless VT: shocks, adrenaline, amiodarone first and second dose (adult and child). */
  async shockable(S) {
    const n = S.int(3, 9);
    for (let i = 0; i < n; i++) await S.cycle({ outcome: 'shock', adrenaline: i === 0 ? 0.3 : 0.7 });
    if (S.p(0.3)) await S.cycle({ outcome: S.pick(['noshock', 'rosc']) });
  },
  /* PEA / Asystole / Other / Unknown, the fluid pop-up and fluids form, switching rhythm families. */
  async nonShockable(S) {
    const n = S.int(3, 7);
    for (let i = 0; i < n; i++) {
      const outcome = S.p(0.75) ? 'noshock' : 'shock';
      await S.cycle({ outcome, support: 0.6 });
      if (S.p(0.2)) await S.other('fluids');
    }
  },
  /* Torsades: the confirm pop-up both ways, magnesium, its repeat, double taps, amiodarone withheld. */
  async torsades(S) {
    if (S.p(0.3)) await S.weight(S.pick(['5', '10', '3', '7.5', '15', '25', '35', '40', '42', '80']));
    for (let i = S.int(0, 3); i > 0; i--) await S.cycle({ outcome: 'shock' });
    await S.check('shock', 'Torsades', { torsades: S.pick(['confirm', 'back', 'confirm']) });
    for (let i = S.int(2, 5); i > 0; i--) {
      if (S.p(0.7)) await S.support({ taps: S.p(0.25) ? 2 : 1 });
      if (S.p(0.2)) { await S.D.wait(S.pick([4999, 5000, 5001]), 'magnesium double-tap window'); await S.support({ taps: 1 }); }
      if (S.p(0.2)) await S.other(S.pick(['amiodarone', 'magnesium']));
      await S.cycle({ outcome: S.pick(['shock', 'shock', 'noshock']), rhythm: S.p(0.3) ? 'Torsades' : undefined });
    }
  },
  /* ROSC (every ROSC rhythm, A8 "Other"), post-ROSC checklist, re-arrest FOLLOWED BY more checks and doses. */
  async rosc(S) {
    for (let i = S.int(0, 3); i > 0; i--) await S.cycle({ outcome: S.pick(['shock', 'noshock']) });
    await S.rosc(S.pick([...ROSC_RHYTHMS, 'Other', 'Other']));
    if (S.p(0.5)) { await S.live(); await S.adrenaline(); await S.D.tap('[data-support], #main [data-drug=amiodarone], #amiodaronePending'); }
    if (S.p(0.3)) await S.D.wait(S.pick([30000, 5 * MIN]), 'after ROSC');
    if (S.p(0.2)) await S.D.reload();
    if (S.p(0.85)) {
      await S.rearrest();
      for (let i = S.int(1, 4); i > 0; i--) await S.cycle({ outcome: S.pick(['shock', 'noshock', 'shock']) });
      if (S.p(0.4)) await S.rosc();
      if (S.p(0.3)) { await S.rearrest(); await S.cycle(); }
    }
  },
  /* Corrections: edit sheet (incl. changing a rhythm), voids and restores, undo, previous-shock review. */
  async corrections(S) {
    if (S.p(0.4)) await S.previousShock(S.int(1, 2));
    for (let i = S.int(2, 5); i > 0; i--) await S.cycle({ outcome: S.pick(['shock', 'shock', 'noshock']) });
    if (S.p(0.5)) await S.note();
    for (let i = S.int(2, 5); i > 0; i--) {
      await S.correction();
      if (S.p(0.3)) await S.undo(S.int(1, 2));
      if (S.p(0.3)) await S.cycle();
    }
  },
  /* Earlier counts, "+ Previous shock", resus start, then crossing the amiodarone shock counts.
     Sometimes the team holds the amiodarone and a shock is then taken back (void or undo): A2 says
     the card, once shown, stays for that patient. */
  async counts(S) {
    if (S.p(0.6)) await S.previousShock(S.int(1, 6));
    if (S.p(0.6)) await S.history();
    if (S.p(0.5)) await S.resusTime();
    const takeBack = S.p(0.45);
    for (let i = S.int(2, 7); i > 0; i--) {
      await S.cycle({ outcome: S.pick(['shock', 'shock', 'shock', 'noshock']), amiodarone: takeBack ? 0 : 0.8 });
      if (S.p(0.15)) await S.previousShock(1);
      if (S.p(0.1)) await S.history();
      if (takeBack) { await S.live(); if (S.D.$('#amiodaroneCard')) break; }
    }
    if (takeBack && S.D.$('#amiodaroneCard')) {
      const byVoid = S.p(0.6);
      for (let k = 0; k < 3 && !S.D.$('#amiodaroneStatus')?.textContent.startsWith('Review at'); k++) {
        if (byVoid) await S.correction('void', /^Edit Shock delivered/); else await S.undo(S.int(1, 3));
        await S.live();
      }
      if (S.p(0.3)) await S.D.reload(); // the "card has appeared" memory is not saved (doc 18 inventory 5)
      if (S.p(0.5)) await S.amiodarone();
      await S.cycle();
    } else if (S.p(0.4)) await S.correction('void');
  },
  /* Special situation switched on and off at different points. */
  async special(S) {
    for (let i = S.int(3, 7); i > 0; i--) {
      if (S.p(0.35)) await S.special(true);
      await S.cycle({ outcome: S.pick(['shock', 'noshock', 'shock']) });
      if (S.p(0.3)) await S.other(S.pick(['adrenaline', 'other']));
      if (S.p(0.35)) await S.special(false);
      if (S.p(0.1)) await S.rosc();
      if (S.phase() === 'ROSC' && S.p(0.6)) await S.rearrest();
    }
  },
  /* Timer moments: cycle thresholds, overdue, adrenaline highlight and lock edges, long clocks. */
  async timers(S) {
    for (let i = S.int(2, 5); i > 0; i--) {
      await S.timerMoments();
      if (S.p(0.6)) await S.adrenaline();
      if (S.p(0.5)) await S.adrenalineMoments();
      if (S.p(0.1)) await S.D.wait(S.pick([60 * MIN, 3 * 60 * MIN]), 'long case');
      await S.cycle({ adrenaline: 0.4 });
    }
  },
  /* Administration pop-ups for every card at adult and child weights; weight pop-up and pads. */
  async references(S) {
    for (let i = S.int(2, 4); i > 0; i--) {
      await S.randomWeight(true);
      await S.infoAll();
      if (S.p(0.3)) { await S.D.tap('[data-action=weight]'); await S.D.tap(`[data-key="${S.pick(['1', '2', '4', '9'])}"]`); await S.closeSheet(); }
      await S.cycle({ outcome: S.pick(['shock', 'shock', 'noshock']), rhythm: S.p(0.2) ? 'Torsades' : undefined });
      await S.infoAll();
      if (S.p(0.3)) await S.guidanceTour();
    }
  },
  /* Reload from the saved session mid-case: with a rhythm pop-up open or abandoned, locks, ROSC, end. */
  async reload(S) {
    for (let i = S.int(2, 5); i > 0; i--) {
      const where = S.pick(['plain', 'rhythmOpen', 'abandoned', 'afterAdrenaline', 'rosc', 'special']);
      if (where === 'rhythmOpen') { await S.live(); await S.waitDue(); await S.D.tap('#rhythmCheck'); await S.D.tap(`#sheet [data-outcome=${S.pick(['shock', 'noshock'])}]`); }
      if (where === 'abandoned') await S.check(S.pick(['shock', 'noshock']), 'VF', { abandon: true });
      if (where === 'afterAdrenaline') { await S.adrenaline(); await S.D.wait(S.pick([1000, 100000, 209000])); }
      if (where === 'rosc') await S.rosc();
      if (where === 'special') await S.special(true);
      await S.D.reload();
      if (S.D.sheetOpen() && S.D.$('#sheet [data-record-rhythm]')) {
        if (S.p(0.75)) await S.D.tap(`#sheet [data-record-rhythm="${S.pick(S.D.$$('#sheet [data-record-rhythm]').map((b) => b.dataset.recordRhythm))}"]`);
        if (S.D.sheetTitle() === 'Confirm Torsades') await S.D.tap('#sheet [data-confirm-torsades]');
      }
      if (S.phase() === 'ROSC' && S.p(0.6)) await S.rearrest();
      await S.cycle();
    }
    if (S.p(0.3)) { await S.end(); await S.D.reload(); await S.adrenaline(); }
  },
  /* Notes, airway and access forms, manual medicines, checklists, log filters, export. */
  async records(S) {
    for (let i = S.int(3, 6); i > 0; i--) {
      const what = S.pick(['note', 'equipment', 'equipment', 'other', 'checklist', 'checklistFull', 'log', 'earlier']);
      if (what === 'note') await S.note();
      if (what === 'equipment') await S.equipment();
      if (what === 'other') await S.other(S.pick(['other', 'adrenaline', 'amiodarone']));
      if (what === 'earlier') await S.other('earlier');
      if (what === 'checklist') await S.checklist(S.pick(CHECKLISTS));
      if (what === 'checklistFull') { // tick every item, sometimes untick one again (the summary then says "reopened")
        await S.closeSheet(); await S.D.tap('.bottom-nav [data-tab=checks]');
        const keys = S.D.$$('#main [data-check]').map((b) => b.dataset.check);
        for (const k of keys) await S.D.tap(`#main [data-check="${k}"]`);
        if (S.p(0.6)) { const k = S.pick(keys); await S.D.tap(`#main [data-check="${k}"]`); if (S.p(0.5)) await S.D.tap(`#main [data-check="${k}"]`); }
        await S.toTab('log'); await S.D.fill('#checklistDisplay', 'times');
      }
      if (what === 'log') await S.logTour();
      if (S.p(0.5)) await S.cycle();
    }
    if (S.p(0.3)) { await S.end(); await S.note(); await S.equipment(); await S.toTab('log'); }
  },
  /* A random walk over every move. */
  async mixed(S) {
    for (let i = S.int(10, 24); i > 0; i--) {
      const move = S.weighted([
        [8, 'cycle'], [2, 'adrenaline'], [2, 'amiodarone'], [2, 'support'], [2, 'rosc'], [2, 'rearrest'], [1, 'start'],
        [2, 'weight'], [1, 'prev'], [1, 'history'], [1, 'resus'], [1, 'special'], [2, 'correction'], [1, 'undo'],
        [1, 'reload'], [1, 'other'], [1, 'equipment'], [1, 'note'], [1, 'checklist'], [1, 'guidance'], [1, 'log'],
        [1, 'timers'], [1, 'end'], [1, 'extras'],
      ]);
      if (move === 'cycle') await S.cycle({ outcome: S.pick(['shock', 'noshock', 'shock']), rhythm: S.p(0.1) ? 'Torsades' : undefined });
      if (move === 'adrenaline') await S.adrenaline();
      if (move === 'amiodarone') await S.amiodarone();
      if (move === 'support') await S.support();
      if (move === 'rosc') await S.rosc();
      if (move === 'rearrest') await S.rearrest();
      if (move === 'start') await S.start();
      if (move === 'weight') await S.randomWeight(true);
      if (move === 'prev') await S.previousShock(1);
      if (move === 'history') await S.history();
      if (move === 'resus') await S.resusTime();
      if (move === 'special') await S.special(S.p(0.5));
      if (move === 'correction') await S.correction();
      if (move === 'undo') await S.undo(S.int(1, 3));
      if (move === 'reload') await S.D.reload();
      if (move === 'other') await S.other(S.pick(['other', 'adrenaline', 'amiodarone', 'magnesium', 'fluids', 'earlier']));
      if (move === 'equipment') await S.equipment();
      if (move === 'note') await S.note();
      if (move === 'checklist') await S.checklist(S.pick(CHECKLISTS));
      if (move === 'guidance') await S.guidanceTour();
      if (move === 'log') await S.logTour();
      if (move === 'timers') { await S.timerMoments(); await S.adrenalineMoments(); }
      if (move === 'end') { await S.end(S.p(0.7)); if (S.p(0.5)) await S.undo(1); }
      if (move === 'extras') await S.extras();
    }
  },
};

/* ---------- the sweeps (cases 0-6) ---------- */
/* Every whole year 0-15 plus fractions, the upper limits the boxes accept or refuse, and bad entries. */
export const SWEEP_AGES = ['0', '0.01', '0.5', '0.99', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '10.5', '11', '12', '13', '14',
  '14.5', '15', '16', '120', '121', '-1', 'abc', ''];
/* Just below, on and just above every band edge (5, 10, 20, 30, 40 kg), plus RSI cap and rounding edges,
   the maximum and refused entries. */
export const SWEEP_WEIGHTS = ['0.5', '3', '4.9', '5', '5.1', '7.5', '9.9', '10', '10.1', '15', '19.9', '20', '20.1', '25', '29.9', '30', '30.1',
  '35', '39.9', '40', '40.1', '41', '42', '50', '62.4', '62.5', '80', '99', '100', '101', '112.5', '120', '499.9', '500', '500.1', '600', '0'];

const SWEEP_STORIES = {
  /* Weight from age (weight pop-up) and tube sizes (Guidance) for every age in SWEEP_AGES. */
  async ages(S) {
    for (const age of SWEEP_AGES) {
      await S.D.tap('[data-action=weight]');
      await S.D.tap('#sheet details summary');
      await S.D.fill('#ageInput', age);
      await S.D.tap('[data-action=estimate]');
      await S.D.tap('[data-action=save-weight]'); // a refused age leaves the pop-up open with the error
      await S.closeSheet();
    }
    await S.toTab('guidance');
    await S.D.tap('[data-reference=tubes]');
    for (const age of SWEEP_AGES) { await S.D.fill('#referenceAge', age); await S.D.tap('[data-save-age]'); }
    await S.closeSheet();
    await S.live();
  },
  /* Every weight: header energy and pads, adrenaline card and pop-up, RSI doses. */
  async bandsAdrenaline(S) {
    for (const w of SWEEP_WEIGHTS) {
      await S.weight(w, 'keypad', true);
      await S.info('adrenaline');
      await S.closeSheet();
      await S.toTab('guidance'); await S.D.tap('[data-reference=rsi]'); await S.closeSheet(); await S.live();
    }
    await S.start(); await S.check('shock', 'VF', { energy: null }); // the shock pop-up's pre-filled energy at the last weight
  },
  /* Every weight with the amiodarone card showing (3 shocks): first-dose number and pop-up. */
  async bandsAmiodarone(S) {
    await S.start();
    for (let i = 0; i < 3; i++) await S.check('shock', 'VF', { energy: null, late: 0 });
    await S.live();
    for (const w of SWEEP_WEIGHTS) { await S.weight(w, 'keypad', true); await S.info('amiodarone'); await S.closeSheet(); }
    await S.weight('80', 'keypad', true); await S.amiodarone(); // adult: second dose "Due after 6 shocks"
    for (const w of ['5', '15', '40', '40.1']) { await S.weight(w, 'keypad', true); await S.info('amiodarone'); await S.closeSheet(); }
  },
  /* Every weight with the magnesium card showing (torsades), incl. "Dose: clinical review" at 5 / 10 kg. */
  async bandsMagnesium(S) {
    await S.start();
    await S.check('shock', 'Torsades', { energy: null, late: 0, torsades: 'confirm' });
    for (const w of SWEEP_WEIGHTS) { await S.weight(w, 'keypad', true); await S.info('magnesium'); await S.closeSheet(); }
  },
  /* Every weight with the fluids card showing (PEA): volume from the actual weight, and pop-up. */
  async bandsFluids(S) {
    await S.start();
    await S.check('noshock', 'PEA', { late: 0, fluidClose: 'button' });
    for (const w of SWEEP_WEIGHTS) { await S.weight(w, 'keypad', true); await S.info('fluids'); await S.closeSheet(); }
  },
  /* Every equipment size (and blade for both laryngoscopy methods, every access site and side), every
     checklist with every item ticked, every reversible cause. */
  async lists(S) {
    await S.start();
    for (const device of DEVICES) {
      const methods = device === 'laryngoscopy' ? ['Video', 'Direct'] : [null];
      for (const method of methods) {
        for (let k = 0; ; k++) {
          await S.live(); await S.D.tap('#main [data-action=interventions]'); await S.D.tap(`#sheet [data-equipment=${device}]`);
          if (method) await S.D.tap(`#equipmentForm input[name=method][value=${method}]`);
          const sizes = S.D.$$('#equipmentForm input[name=size]');
          if (k >= sizes.length) { await S.closeSheet(); break; }
          await S.D.tap(sizes[k]);
          const sides = S.D.$$('#equipmentForm input[name=side]'), sites = S.D.$$('#equipmentForm input[name=site]');
          if (sides.length) await S.D.tap(sides[k % sides.length]);
          if (sites.length) await S.D.tap(sites[k % sites.length]);
          await S.D.tap('#equipmentForm button[type=submit]');
        }
      }
    }
    for (const site of ['iv', 'io']) { // every access site
      for (let k = 0; ; k++) {
        await S.live(); await S.D.tap('#main [data-action=access]'); await S.D.tap(`#sheet [data-equipment=${site}]`);
        const sites = S.D.$$('#equipmentForm input[name=site]');
        if (k >= sites.length) { await S.closeSheet(); break; }
        await S.D.tap(sites[k]);
        await S.D.tap('#equipmentForm button[type=submit]');
      }
    }
    for (const list of CHECKLISTS) {
      await S.toTab('guidance'); await S.D.tap(`[data-open-check="${list}"]`);
      for (const b of S.D.$$('#main [data-check]').map((x) => x.dataset.check)) await S.D.tap(`#main [data-check="${b}"]`);
    }
    await S.toTab('guidance');
    for (const c of CAUSES) { await S.D.tap(`[data-cause-guide="${c}"]`); await S.closeSheet(); }
    await S.toTab('log'); await S.D.fill('#checklistDisplay', 'times');
  },
  /* Every time threshold just below, on and just above it: the cycle clock captions and yellow panel,
     due and overdue, the arrest-checklist reminder, the adrenaline highlight, review and lock, the
     magnesium and fluids double-tap locks, and the one-hour clock style. */
  async timers(S) {
    const since = (type) => S.lastDose(type).at;
    const at = async (base, ms, why, tap) => { const gap = base + ms - S.D.now; if (gap > 0) await S.D.wait(gap, why); if (tap) await S.D.tap(tap); };
    await S.start();
    await S.adrenaline(); // the checklist reminder needs adrenaline given
    const dose = since('adrenaline');
    for (const left of [90001, 90000, 89999, 30001, 30000, 29999, 15001, 15000, 14999, 1001, 1000, 999, 1, 0]) await S.waitLeft(left);
    for (let k = 0; k < 3; k++) await S.D.wait(k === 0 ? 999 : 1, 'rhythm check overdue (+1 s edge)');
    await S.check('shock', 'VF', { energy: null, late: 0 });
    for (const ms of [209999, 210000, 210001]) await at(dose, ms, `${ms} ms after adrenaline (lock and highlight edge)`, ms === 209999 ? '[data-drug=adrenaline]' : null);
    await S.D.tap('#main [data-custom-drug=adrenaline]'); await S.closeSheet(); // looked at "Other…" instead
    for (const ms of [239999, 240000, 240001, 241000]) await at(dose, ms, `${ms} ms after adrenaline (review edge)`);
    await S.adrenaline(); // free again: records the next dose
    await S.check('noshock', 'PEA', { late: 0, fluidClose: 'button' });
    await S.D.tap('[data-support=fluids]');
    await S.fillDrugForm({ dose: '250' });
    const fluid = since('fluids');
    for (const ms of [4999, 5000, 5001]) { await at(fluid, ms, `${ms} ms after fluids (double-tap lock edge)`, '[data-support=fluids]'); if (S.D.sheetOpen()) await S.closeSheet(); }
    await S.check('shock', 'Torsades', { energy: null, late: 0, torsades: 'confirm' });
    await S.D.tap('[data-support=magnesium]');
    const mag = since('magnesium');
    for (const ms of [4999, 5000, 5001]) { await at(mag, ms, `${ms} ms after magnesium (double-tap lock edge)`, '[data-support=magnesium]'); if (S.D.sheetOpen()) await S.closeSheet('button'); }
    const start = S.session().appStart;
    for (const ms of [3599999, 3600000, 3600001]) await at(start, ms, `${ms} ms after the app opened (one-hour clock edge)`);
    await S.live();
  },
  /* Characters that need care on screen and in exports (' " < > &) typed into every free-text box that
     is shown again: event notes, medicine names, dose notes, equipment notes, corrected details, unit
     and route; then the Log, cycle log and every export. */
  async characters(S) {
    const text = `O'Neil said "stop" <b>bold</b> & <script>x</script> &amp;`;
    await S.start();
    await S.D.tap('#main [data-action=note]'); await S.D.fill('#noteForm [name=text]', text); await S.D.tap('#noteForm button[type=submit]');
    await S.D.tap('#main [data-action=note]'); await S.D.tap('#sheet [data-custom-drug=other]');
    await S.fillDrugForm({ name: `Mg "2 g" <IV> & O'Brien`, dose: '2', unit: 'g', route: 'Other', notes: text });
    await S.D.tap('#main [data-custom-drug=adrenaline]');
    await S.fillDrugForm({ dose: '1', route: 'IO', notes: `<i>'given' & "flushed"</i>` });
    await S.D.tap('#main [data-action=interventions]'); await S.D.tap('#sheet [data-equipment=igel]');
    await S.D.tap(S.D.$$('#equipmentForm input[name=size]')[2]); await S.D.fill('#equipmentForm [name=notes]', text);
    await S.D.tap('#equipmentForm button[type=submit]');
    await S.toTab('log');
    for (const label of [/^Edit Event/, /^Edit Mg/]) {
      const b = S.D.$$('#main button[data-edit]').find((x) => label.test(x.getAttribute('aria-label') || ''));
      if (!b) continue;
      await S.D.tap(b);
      await S.D.fill('#editForm [name=details]', `fixed: ${text}`);
      if (S.has('#editForm [name=unit]')) { await S.D.fill('#editForm [name=unit]', `g<&"'`); await S.D.fill('#editForm [name=route]', `IV & "IO" <'x'>`); }
      await S.D.tap('#editForm button[type=submit]');
      await S.D.tap(S.D.$$('#main button[data-edit]').find((x) => label.test(x.getAttribute('aria-label') || '') || x.getAttribute('aria-label')?.includes('fixed')) || '#main button[data-edit]');
      await S.closeSheet();
    }
    await S.D.fill('#logScope', 'interventions'); await S.D.fill('#logScope', 'all');
    await S.live(); await S.D.tap('[data-action=cycle-log]'); await S.closeSheet();
    await S.menu(); await S.D.tap('[data-action=export]'); await S.D.tap('#sheet [data-action=download-text]'); await S.D.tap('#sheet [data-action=copy]'); await S.D.tap('#sheet [data-action=download-json]');
    await S.closeSheet();
  },
  /* A case that runs across midnight: events between 00:00 and 00:59, entries typed with times either
     side of midnight, then the Log, cycle log and export. */
  async midnight(S) {
    await S.weight('20', 'keypad', true);
    await S.start();
    for (let i = 0; i < 9; i++) { await S.check(i % 3 === 2 ? 'noshock' : 'shock', i % 3 === 2 ? 'PEA' : 'VF', { late: 0, fluidClose: 'button' }); if (i % 2 === 0) await S.adrenaline(); }
    await S.other('adrenaline'); // typed time options include before midnight
    await S.live(); await S.D.tap('#main [data-custom-drug=adrenaline]');
    await S.fillDrugForm({ dose: '0.2', route: 'IO', time: '23:58' }); // given before midnight, entered after
    await S.D.awayAndBack(30 * MIN);
    for (let i = 0; i < 4; i++) await S.check('shock', 'VT', { late: 0 });
    await S.note();
    await S.resusTime();
    await S.D.tap('[data-action=cycle-log]'); await S.closeSheet();
    await S.toTab('log'); await S.D.fill('#logScope', 'interventions'); await S.D.fill('#logScope', 'all');
    await S.menu(); await S.D.tap('[data-action=export]'); await S.D.tap('#sheet [data-action=download-text]'); await S.D.tap('#sheet [data-action=copy]'); await S.D.tap('#sheet [data-action=download-json]');
    await S.closeSheet();
  },
};

/* Play one whole case on a Driver. */
export async function playCase(D, id) {
  const info = caseInfo(id), S = new Story(D, rng(info.seed));
  await D.capture('app opened');
  if (info.theme.startsWith('sweep ')) await SWEEP_STORIES[info.theme.slice(6)](S);
  else { await S.setup(); await STORIES[info.theme](S); }
  await S.finale();
  return info;
}
