/* RULE SET CHECKER: reads a whole rules file (as parsed from nz-eas.json) and lists every problem in
   plain English. An empty list means the file passed. Each problem starts with the place it is about,
   for example "numbers.childBands.2.shockJ: must be a number above 0".

   This is a pre-publish gate that the tests run; the phone does not run it (the phone only needs the five
   parts to be present: see parse.js). It checks the SHAPE and the arithmetic structure of the file:
   which parts and settings must exist, that numbers are real numbers in a sensible range and order, that
   lists the app picks items from have those items, and that every {gap} in the wording can be filled.
   It makes NO clinical judgement: it never says what a dose or an energy "should" be.

   It is a pure function: it reads only what it is given, changes nothing, and holds no clinical values
   (only the names of settings). Stage 1 covers the five existing parts; later stages add the rest. */

const PARTS = ['numbers', 'wording', 'checklists', 'equipment', 'sources'];

/* The {gap} names the engine fills from part 1 and part 5 for any wording (engine wordingGaps). */
const ENGINE_GAPS = [
  'underOneYearKg', 'tenMaxAge', 'tenAddYears', 'tenMultiplyBy', 'fourteenFromAge', 'fourteenMaxAge', 'fourteenMultiplyBy',
  'cprCycleMinWord', 'adrenalineEveryMin', 'amiodaroneFirstShocks', 'amiodaroneSecondShocks', 'amiodaroneMaxDoses',
  'magnesiumMaxDoses', 'bandList', 'joulesPerKg', 'adultShockJ', 'padsUpToJ', 'adultAboveKg', 'adultRoundedToKg', 'fluid',
  'fluidShort', 'adrDiluteMg', 'adrDiluteMl', 'adrDiluteMgPerMl', 'adultMagnesiumMmol', 'magAdultGrams', 'magAdultDiluteToMl',
  'magOverMinMinutes', 'magOverMaxMinutes', 'magChildMmolPerMl', 'magAmpouleMmol', 'magAmpouleMl', 'magChildDiluteToMl',
  'adultFluidsMinL', 'adultFluidsMaxL', 'childFluidsMinPerKg', 'childFluidsMaxPerKg', 'fentanylMcgPerKg', 'fentanylMaxMcg',
  'ketamineMgPerKg', 'ketamineMaxMg', 'reducedKetamineMgPerKg', 'blockerMgPerKg', 'blockerMaxMg', 'blockerRoundMg',
  'exportDate', 'reversibleCauses', 'igel',
];

/* Every wording entry the app uses: 'text' (one sentence) or 'list' (separate paragraphs), then the
   {gaps} the APP itself fills when it shows that entry (everything else must be one of ENGINE_GAPS). */
const WORDING = {
  adultDoseBasis: ['text', 'adultAboveKg'], childDoseBasis: ['text', 'band'], adultMagnesiumBasis: ['text'],
  childMagnesiumBasis: ['text', 'band'], noMagnesiumDoseBasis: ['text', 'band'], invalidWeightMagnesiumBasis: ['text'],
  adultFluidBasis: ['text'], childFluidBasis: ['text', 'minPerKg', 'maxPerKg'], noWeightFluidBasis: ['text'],
  amiodaroneNotYetDue: ['text', 'first', 'second'], amiodaroneSecondNotYetDue: ['text', 'second'], childSecondAmiodarone: ['text'],
  invalidWeight: ['text', 'maxKg'], headerEnergyTitle: ['text'], padsPrompt: ['text'], padsPromptWithLimit: ['text'],
  estimateAgeError: ['text'], estimatedWeightSource: ['text', 'age'], adrenalineOverdue: ['text'], adrenalineUntilReview: ['text'],
  amiodaroneReviewAt: ['text', 'shocks'], maxDosesRecorded: ['text', 'maxDoses'], withholdTorsades: ['text'],
  magnesiumMaxDosesStatus: ['text'], magnesiumRepeatStatus: ['text'], magnesiumFirstStatus: ['text'], fluidsCardTitle: ['text'],
  noWeightDoseReference: ['text'], referenceOnly: ['text'], amiodaroneChildPopupDose: ['text', 'first'],
  amiodaroneAdultPopupDose: ['text', 'first', 'second'], adrenalineHow: ['list'], amiodaroneHow: ['list'],
  drugPopupFooter: ['text', 'guideline'], amiodaroneAfterTorsadesWarning: ['text'], selectDoseAdvice: ['text'],
  confirmTorsades: ['text'], repeatMagnesium: ['text'], torsadesExtractTitle: ['text'], torsadesExtractQuote: ['text'],
  torsadesExtract: ['text'], fluidsExtractTitle: ['text'], fluidsExtractQuote: ['text'], fluidsExtract: ['text'],
  fluidsRecordNote: ['text'], magnesiumNoDose: ['text'], magnesiumHow: ['list'], guidanceIntro: ['list'],
  guidanceRsiTitle: ['text'], guidanceRsi: ['list'], guidanceCaption: ['text'], rsiNotRecorded: ['text'], rsiConditions: ['text'],
  tubeNoAge: ['text'], tubeCaution: ['text'], igelSourceCaption: ['text'], tubeSizeUnderOne: ['text', 'minMm', 'maxMm'],
  tubeLengthUnderOne: ['text', 'timesSize'], tubeSizeFormula: ['text', 'mm'], tubeLengthFormula: ['text', 'cm'],
  weightSheetAgeEstimate: ['text'], tubeSheetAgeEstimate: ['text'],
};

const ALLOWED_TAGS = ['<b>', '</b>', '<em>', '</em>', '<br>']; // the only markup wording may use
const CHECKLIST_IDS_USED_BY_APP = ['arrest', 'postrosc', 'preparation', 'rsi'];
const DEVICE_TYPES_USED_BY_APP = ['iv', 'io', 'opa', 'npa', 'igel', 'laryngoscopy', 'intubation'];
const GUIDELINES_USED_BY_APP = { // setting names each linked guideline must have
  cardiacArrest: ['code', 'label', 'pdf', 'offlinePage', 'web'], postRosc: ['code', 'label', 'pdf'],
  paediatric: ['code', 'label', 'pdf'], rsi: ['code', 'label', 'pdf'], adrenaline: ['code', 'pdf'],
  amiodarone: ['code', 'pdf'], magnesium: ['code', 'web'],
};
const PDF_NAME = /^[\w./-]+\.pdf(#page=\d+)?$/;

const at = (where, key) => where + '.' + key; // the place of a setting inside a group
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const show = (v) => { const t = JSON.stringify(v); return t === undefined ? String(v) : t.length > 40 ? t.slice(0, 37) + '...' : t; };

export function checkRuleSet(file) {
  const problems = [];
  const say = (where, text) => { problems.push(`${where}: ${text}`); }; // returns nothing, so "return say(...)" means "not fine"

  if (!isObject(file)) return ['the rule set: must be one object with the five parts (numbers, wording, checklists, equipment, sources)'];

  /* ---------- Building blocks. Each returns the value if it is fine, or undefined after reporting. ---------- */
  function number(where, v, { whole = false, min = 0, orZero = false, max = Infinity } = {}) {
    const kind = whole ? 'a whole number' : 'a number';
    const range = orZero ? 'of 0 or more' : 'above ' + min;
    if (typeof v !== 'number' || !Number.isFinite(v)) return say(where, `must be ${kind} (found ${show(v)})`);
    if (whole && !Number.isInteger(v)) return say(where, `must be a whole number (found ${v})`);
    if (orZero ? v < min : v <= min) return say(where, `must be ${kind} ${range} (found ${v})`);
    if (v > max) return say(where, `must be ${kind} no more than ${max} (found ${v})`);
    return v;
  }
  const text = (where, v) => (typeof v === 'string' && v.trim() !== '' ? v : say(where, `must be some text, not empty (found ${show(v)})`));
  function textList(where, v, { unique = true } = {}) {
    if (!Array.isArray(v) || v.length === 0) return say(where, 'must be a list with at least one item');
    let ok = true;
    v.forEach((item, i) => { if (!text(`${where}.${i}`, item)) ok = false; });
    if (ok && unique && new Set(v).size !== v.length) return say(where, 'has the same item more than once');
    return ok ? v : undefined;
  }
  // An object that must have exactly these settings (and may also have the optional ones).
  function group(where, v, required, optional = []) {
    if (!isObject(v)) return say(where, 'must be a group of settings, and is missing or the wrong kind');
    let ok = true;
    for (const k of required) if (!(k in v)) { say(`${where}.${k}`, 'is missing'); ok = false; }
    for (const k of Object.keys(v)) if (!required.includes(k) && !optional.includes(k)) { say(`${where}.${k}`, 'is not a setting the app knows'); ok = false; }
    return ok ? v : undefined;
  }
  const lessOrEqual = (where, small, big, smallName, bigName) => {
    if (small !== undefined && big !== undefined && small > big) say(where, `${smallName} (${small}) must not be more than ${bigName} (${big})`);
  };

  /* ---------- Top level ---------- */
  for (const key of Object.keys(file)) if (![...PARTS, 'about', 'notes'].includes(key)) say(key, 'is not a part of the rule set (the parts are ' + PARTS.join(', ') + ')');
  for (const part of PARTS) if (!isObject(file[part])) say(part, 'part is missing or is not a group of settings');
  if ('about' in file) text('about', file.about);

  // Only plain data: text, numbers, true/false, empty, lists and groups. No functions or other values.
  (function plain(v, where) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
    if (typeof v === 'number') { if (!Number.isFinite(v)) say(where, `a number must be a real number (found ${v})`); return; }
    if (Array.isArray(v)) { v.forEach((item, i) => plain(item, `${where}.${i}`)); return; }
    if (isObject(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v))) { for (const [k, item] of Object.entries(v)) plain(item, where ? `${where}.${k}` : k); return; }
    say(where, `is ${typeof v === 'function' ? 'a function' : typeof v === 'object' ? 'not plain data' : 'a ' + typeof v}; the rule set may hold plain data only`);
  })(file, '');

  /* ---------- Part 1: numbers ---------- */
  const N = file.numbers;
  if (isObject(N)) {
    group('numbers', N, [], ['timing', 'weight', 'ageEstimate', 'childBands', 'adult', 'child', 'shock', 'rhythms', 'lowerCard',
      'amiodarone', 'magnesium', 'products', 'preparation', 'rsi', 'tubes', 'doubleTapLockMs']);

    const t = group('numbers.timing', N.timing, ['cprCycleMs', 'adrenalineIntervalMs', 'checklistPromptMinLeftMs']);
    if (t) {
      const cycle = number('numbers.timing.cprCycleMs', t.cprCycleMs, { whole: true });
      number('numbers.timing.adrenalineIntervalMs', t.adrenalineIntervalMs, { whole: true });
      const left = number('numbers.timing.checklistPromptMinLeftMs', t.checklistPromptMinLeftMs, { whole: true });
      lessOrEqual('numbers.timing.checklistPromptMinLeftMs', left, cycle, 'the time left', 'the CPR cycle');
    }

    let adultAbove, weightMax;
    const w = group('numbers.weight', N.weight, ['maxKg', 'adultAboveKg', 'adultRoundedToKg']);
    if (w) {
      weightMax = number('numbers.weight.maxKg', w.maxKg);
      adultAbove = number('numbers.weight.adultAboveKg', w.adultAboveKg);
      const rounded = number('numbers.weight.adultRoundedToKg', w.adultRoundedToKg);
      if (adultAbove !== undefined && weightMax !== undefined && adultAbove >= weightMax) say('numbers.weight.adultAboveKg', `must be below the highest valid weight (${weightMax})`);
      lessOrEqual('numbers.weight.adultRoundedToKg', rounded, weightMax, 'it', 'the highest valid weight');
    }

    const a = group('numbers.ageEstimate', N.ageEstimate, ['underOneYearKg', 'oneToTenYears', 'elevenToFourteenYears']);
    if (a) {
      number('numbers.ageEstimate.underOneYearKg', a.underOneYearKg);
      const ten = group('numbers.ageEstimate.oneToTenYears', a.oneToTenYears, ['maxAge', 'addYears', 'multiplyBy']);
      const fourteen = group('numbers.ageEstimate.elevenToFourteenYears', a.elevenToFourteenYears, ['maxAge', 'multiplyBy']);
      let tenMax, fourteenMax;
      if (ten) {
        tenMax = number('numbers.ageEstimate.oneToTenYears.maxAge', ten.maxAge, { whole: true });
        number('numbers.ageEstimate.oneToTenYears.addYears', ten.addYears, { orZero: true });
        number('numbers.ageEstimate.oneToTenYears.multiplyBy', ten.multiplyBy);
      }
      if (fourteen) {
        fourteenMax = number('numbers.ageEstimate.elevenToFourteenYears.maxAge', fourteen.maxAge, { whole: true });
        number('numbers.ageEstimate.elevenToFourteenYears.multiplyBy', fourteen.multiplyBy);
      }
      if (tenMax !== undefined && fourteenMax !== undefined && fourteenMax <= tenMax) say('numbers.ageEstimate.elevenToFourteenYears.maxAge', `must be above the first age range's last age (${tenMax})`);
    }

    // Adult, shock: read first because the child rows are compared with them.
    const ad = group('numbers.adult', N.adult, ['adrenalineMg', 'amiodaroneFirstMg', 'amiodaroneSecondMg', 'magnesiumMmol', 'fluidsMinMl', 'fluidsMaxMl', 'shockJ']);
    const adult = {};
    if (ad) {
      for (const k of Object.keys(ad)) adult[k] = number(`numbers.adult.${k}`, ad[k]);
      lessOrEqual('numbers.adult.fluidsMinMl', adult.fluidsMinMl, adult.fluidsMaxMl, 'the smallest volume', 'the largest volume');
    }
    const sh = group('numbers.shock', N.shock, ['joulesPerKg', 'paediatricPadsUpToJ', 'maxRecordableJ']);
    let joulesPerKg, maxRecordableJ;
    if (sh) {
      joulesPerKg = number('numbers.shock.joulesPerKg', sh.joulesPerKg);
      number('numbers.shock.paediatricPadsUpToJ', sh.paediatricPadsUpToJ);
      maxRecordableJ = number('numbers.shock.maxRecordableJ', sh.maxRecordableJ);
    }
    lessOrEqual('numbers.adult.shockJ', adult.shockJ, maxRecordableJ, 'the adult energy', 'the highest energy that can be recorded');

    // One row per child weight band, smallest first, and a row for every child weight.
    if (!Array.isArray(N.childBands) || N.childBands.length === 0) say('numbers.childBands', 'must be a list with one row for each weight band');
    else {
      let previous;
      N.childBands.forEach((row, i) => {
        const where = `numbers.childBands.${i}`;
        const r = group(where, row, ['maxKg', 'adrenalineMg', 'amiodaroneFirstMg', 'amiodaroneSecondMg', 'magnesiumMmol', 'shockJ']);
        if (!r) return;
        const maxKg = number(`${where}.maxKg`, r.maxKg);
        if (maxKg !== undefined && previous !== undefined && maxKg <= previous) say(`${where}.maxKg`, `bands must go in rising order, one row per band (${maxKg} follows ${previous})`);
        if (maxKg !== undefined) previous = maxKg;
        for (const [key, adultKey] of [['adrenalineMg', 'adrenalineMg'], ['amiodaroneFirstMg', 'amiodaroneFirstMg'], ['amiodaroneSecondMg', 'amiodaroneSecondMg'], ['shockJ', 'shockJ']]) {
          const v = number(`${where}.${key}`, r[key]);
          lessOrEqual(`${where}.${key}`, v, adult[adultKey], 'the child value', 'the adult value');
        }
        if (r.magnesiumMmol !== null) lessOrEqual(`${where}.magnesiumMmol`, number(`${where}.magnesiumMmol`, r.magnesiumMmol), adult.magnesiumMmol, 'the child value', 'the adult value');
        if (maxKg !== undefined && joulesPerKg !== undefined && typeof r.shockJ === 'number' && r.shockJ !== maxKg * joulesPerKg)
          say(`${where}.shockJ`, `must be the band weight (${maxKg}) times the joules per kg (${joulesPerKg}) = ${maxKg * joulesPerKg} (found ${r.shockJ})`);
      });
      if (adultAbove !== undefined && previous !== undefined && previous < adultAbove) say('numbers.childBands', `the last band (${previous} kg) must reach the adult weight limit (${adultAbove} kg) so every child weight has a row`);
    }

    const c = group('numbers.child', N.child, ['fluidsMinMlPerKg', 'fluidsMaxMlPerKg']);
    if (c) lessOrEqual('numbers.child.fluidsMinMlPerKg', number('numbers.child.fluidsMinMlPerKg', c.fluidsMinMlPerKg), number('numbers.child.fluidsMaxMlPerKg', c.fluidsMaxMlPerKg), 'the smallest volume', 'the largest volume');

    // Rhythm lists. The lower-card lists must use rhythms that exist, and no rhythm may be in both.
    const rh = group('numbers.rhythms', N.rhythms, ['shock', 'noshock', 'rosc']);
    const known = [];
    if (rh) for (const k of ['shock', 'noshock', 'rosc']) { const list = textList(`numbers.rhythms.${k}`, rh[k]); if (list && k !== 'rosc') known.push(...list); }
    const lc = group('numbers.lowerCard', N.lowerCard, ['fluidRhythms', 'amiodaroneRhythms']);
    if (lc) {
      const lists = {};
      for (const k of ['fluidRhythms', 'amiodaroneRhythms']) {
        lists[k] = textList(`numbers.lowerCard.${k}`, lc[k]);
        for (const [i, name] of (lists[k] || []).entries()) if (rh && known.length && !known.includes(name)) say(`numbers.lowerCard.${k}.${i}`, `"${name}" is not a rhythm in numbers.rhythms (shock or no-shock list)`);
      }
      if (lists.fluidRhythms && lists.amiodaroneRhythms) for (const name of lists.fluidRhythms) if (lists.amiodaroneRhythms.includes(name)) say('numbers.lowerCard', `"${name}" is in both lists, so two cards would claim it`);
    }

    // The app reads the first and second dose counts, so there must be at least two, rising.
    const am = group('numbers.amiodarone', N.amiodarone, ['dueAtShocks']);
    if (am) {
      const due = am.dueAtShocks;
      if (!Array.isArray(due) || due.length < 2) say('numbers.amiodarone.dueAtShocks', 'must be a list of at least two shock counts (first dose, second dose)');
      else {
        const counts = due.map((v, i) => number(`numbers.amiodarone.dueAtShocks.${i}`, v, { whole: true }));
        counts.forEach((v, i) => { if (v !== undefined && i > 0 && counts[i - 1] !== undefined && v <= counts[i - 1]) say(`numbers.amiodarone.dueAtShocks.${i}`, `shock counts must rise (${v} follows ${counts[i - 1]})`); });
      }
    }
    const mg = group('numbers.magnesium', N.magnesium, ['maxDoses']);
    if (mg) number('numbers.magnesium.maxDoses', mg.maxDoses, { whole: true });

    const pr = group('numbers.products', N.products, ['fluid', 'fluidShort']);
    if (pr) { text('numbers.products.fluid', pr.fluid); text('numbers.products.fluidShort', pr.fluidShort); }

    const prep = group('numbers.preparation', N.preparation, ['adrenalineChild', 'magnesium']);
    if (prep) {
      const ac = group('numbers.preparation.adrenalineChild', prep.adrenalineChild, ['drugMg', 'totalMl']);
      if (ac) { number('numbers.preparation.adrenalineChild.drugMg', ac.drugMg); number('numbers.preparation.adrenalineChild.totalMl', ac.totalMl); }
      const pm = group('numbers.preparation.magnesium', prep.magnesium, ['adultGrams', 'adultDiluteToMl', 'overMinMinutes', 'overMaxMinutes', 'ampouleMmol', 'ampouleMl', 'childDiluteToMl']);
      if (pm) {
        const v = {};
        for (const k of Object.keys(pm)) v[k] = number(`numbers.preparation.magnesium.${k}`, pm[k]);
        lessOrEqual('numbers.preparation.magnesium.overMinMinutes', v.overMinMinutes, v.overMaxMinutes, 'the shortest time', 'the longest time');
        lessOrEqual('numbers.preparation.magnesium.ampouleMl', v.ampouleMl, v.childDiluteToMl, 'the ampoule volume', 'the diluted volume');
      }
    }

    const rsi = group('numbers.rsi', N.rsi, ['fentanyl', 'ketamine', 'reducedKetamine', 'blocker', 'displayDecimals']);
    if (rsi) {
      for (const [drug, keys] of [['fentanyl', ['mcgPerKg', 'maxMcg']], ['ketamine', ['mgPerKg', 'maxMg']], ['reducedKetamine', ['mgPerKg', 'maxMg']], ['blocker', ['mgPerKg', 'maxMg', 'roundAdultToMg']]]) {
        const d = group(`numbers.rsi.${drug}`, rsi[drug], keys);
        if (d) for (const k of keys) number(`numbers.rsi.${drug}.${k}`, d[k]);
      }
      number('numbers.rsi.displayDecimals', rsi.displayDecimals, { whole: true, min: 0, orZero: true, max: 4 });
    }

    const tu = group('numbers.tubes', N.tubes, ['showUpToAge', 'underOneSizeMinMm', 'underOneSizeMaxMm', 'underOneLengthTimesSize', 'sizeAgeDivisor', 'sizeAddMm', 'lengthAgeDivisor', 'lengthAddCm', 'displayDecimals']);
    if (tu) {
      number('numbers.tubes.showUpToAge', tu.showUpToAge, { whole: true });
      const lo = number('numbers.tubes.underOneSizeMinMm', tu.underOneSizeMinMm), hi = number('numbers.tubes.underOneSizeMaxMm', tu.underOneSizeMaxMm);
      lessOrEqual('numbers.tubes.underOneSizeMinMm', lo, hi, 'the smallest size', 'the largest size');
      number('numbers.tubes.underOneLengthTimesSize', tu.underOneLengthTimesSize);
      number('numbers.tubes.sizeAgeDivisor', tu.sizeAgeDivisor); // above 0: it is divided by
      number('numbers.tubes.sizeAddMm', tu.sizeAddMm, { orZero: true });
      number('numbers.tubes.lengthAgeDivisor', tu.lengthAgeDivisor);
      number('numbers.tubes.lengthAddCm', tu.lengthAddCm, { orZero: true });
      number('numbers.tubes.displayDecimals', tu.displayDecimals, { whole: true, min: 0, orZero: true, max: 4 });
    }

    const lock = group('numbers.doubleTapLockMs', N.doubleTapLockMs, ['adrenaline', 'magnesium', 'fluids']);
    if (lock) for (const k of Object.keys(lock)) number(`numbers.doubleTapLockMs.${k}`, lock[k], { whole: true, orZero: true });
  }

  /* ---------- Part 2: wording ---------- */
  const W = file.wording;
  if (isObject(W)) {
    for (const key of Object.keys(WORDING)) if (!(key in W)) say(`wording.${key}`, 'is missing');
    for (const [key, value] of Object.entries(W)) {
      const where = `wording.${key}`;
      if (!(key in WORDING)) { say(where, 'is not a wording entry the app knows'); continue; }
      const [kind, ...own] = WORDING[key];
      let pieces;
      if (kind === 'list') pieces = textList(where, value, { unique: false });
      else pieces = text(where, value) ? [value] : undefined;
      if (!pieces) continue;
      pieces.forEach((piece) => {
        for (const gap of new Set([...piece.matchAll(/\{(\w+)\}/g)].map((m) => m[1])))
          if (!ENGINE_GAPS.includes(gap) && !own.includes(gap)) say(where, `{${gap}} cannot be filled (it is not a number or name the app supplies)`);
        const withoutGaps = piece.replace(/\{\w+\}/g, '');
        if (/[{}]/.test(withoutGaps)) say(where, 'has a curly bracket that is not a complete {gap}');
        const withoutTags = withoutGaps.replace(/<[^>]*>/g, (tag) => (ALLOWED_TAGS.includes(tag) ? '' : (say(where, `uses ${tag}; only <b>, <em> and <br> are allowed`), '')));
        if (/[<>]/.test(withoutTags)) say(where, 'has a stray < or >');
      });
    }
  }

  /* ---------- Part 3: checklists and causes ---------- */
  const C = file.checklists;
  if (isObject(C)) {
    group('checklists', C, [], ['lists', 'causes']);
    if (!Array.isArray(C.lists) || C.lists.length === 0) say('checklists.lists', 'must be a list of checklists');
    else {
      const ids = [];
      C.lists.forEach((list, i) => {
        const where = `checklists.lists.${i}`;
        const l = group(where, list, ['id', 'label', 'code', 'pdf', 'items'], ['intro']);
        if (!l) return;
        if (text(`${where}.id`, l.id)) { if (ids.includes(l.id)) say(`${where}.id`, `"${l.id}" is used by another checklist`); ids.push(l.id); }
        text(`${where}.label`, l.label); text(`${where}.code`, l.code);
        if (text(at(where, 'pdf'), l.pdf) && !PDF_NAME.test(l.pdf)) say(at(where, 'pdf'), `must be a PDF file name, optionally with #page=N (found ${show(l.pdf)})`);
        if ('intro' in l) text(`${where}.intro`, l.intro);
        textList(`${where}.items`, l.items);
      });
      for (const id of CHECKLIST_IDS_USED_BY_APP) if (!ids.includes(id)) say('checklists.lists', `has no checklist with id "${id}", which the app opens`);
    }
    if (!Array.isArray(C.causes) || C.causes.length === 0) say('checklists.causes', 'must be a list of reversible causes');
    else {
      const ids = [];
      C.causes.forEach((cause, i) => {
        const where = `checklists.causes.${i}`;
        const x = group(where, cause, ['id', 'group', 'name', 'plain', 'text']);
        if (!x) return;
        for (const k of Object.keys(x)) text(`${where}.${k}`, x[k]);
        if (typeof x.id === 'string') { if (ids.includes(x.id)) say(`${where}.id`, `"${x.id}" is used by another cause`); ids.push(x.id); }
      });
    }
  }

  /* ---------- Part 4: equipment ---------- */
  const E = file.equipment;
  if (isObject(E)) {
    group('equipment', E, [], ['devices', 'blades', 'maxTubeSizeMm', 'sites', 'colours', 'igelRanges']);
    const sizes = {};
    const dv = group('equipment.devices', E.devices, DEVICE_TYPES_USED_BY_APP);
    if (dv) for (const type of DEVICE_TYPES_USED_BY_APP) {
      const d = group(`equipment.devices.${type}`, dv[type], ['name', 'sizes']);
      if (d) { text(`equipment.devices.${type}.name`, d.name); sizes[type] = textList(`equipment.devices.${type}.sizes`, d.sizes); }
    }
    const bl = group('equipment.blades', E.blades, ['Video', 'Direct']);
    if (bl) { textList('equipment.blades.Video', bl.Video); textList('equipment.blades.Direct', bl.Direct); }
    const maxTube = number('equipment.maxTubeSizeMm', E.maxTubeSizeMm);
    // Every intubation size offered must be one the app will accept when it is recorded.
    (sizes.intubation || []).forEach((size, i) => {
      const n = Number(size);
      if (!Number.isFinite(n) || n <= 0 || (maxTube !== undefined && n > maxTube)) say(`equipment.devices.intubation.sizes.${i}`, `"${size}" must be a number above 0 and no more than equipment.maxTubeSizeMm`);
    });
    const si = group('equipment.sites', E.sites, ['iv', 'io']);
    if (si) { textList('equipment.sites.iv', si.iv); textList('equipment.sites.io', si.io); }
    const co = group('equipment.colours', E.colours, ['iv', 'io', 'igel']);
    if (co) for (const type of ['iv', 'io', 'igel']) {
      if (!isObject(co[type])) { say(`equipment.colours.${type}`, 'must be a group of colours, one per size'); continue; }
      for (const [size, colour] of Object.entries(co[type])) {
        if (typeof colour !== 'string' || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colour)) say(`equipment.colours.${type}.${size}`, `must be a colour like #f4cc28 (found ${show(colour)})`);
        if (sizes[type] && !sizes[type].includes(size)) say(`equipment.colours.${type}.${size}`, `"${size}" is not one of the ${type} sizes`);
      }
    }
    if (!Array.isArray(E.igelRanges) || E.igelRanges.length === 0) say('equipment.igelRanges', 'must be a list with one row for each iGel size');
    else {
      let prevMin, prevMax;
      const seen = [];
      E.igelRanges.forEach((row, i) => {
        const where = `equipment.igelRanges.${i}`;
        const r = group(where, row, ['size', 'minKg', 'maxKg']);
        if (!r) return;
        if (text(`${where}.size`, r.size)) {
          if (seen.includes(r.size)) say(`${where}.size`, `"${r.size}" has more than one row`);
          seen.push(r.size);
          if (sizes.igel && !sizes.igel.includes(r.size)) say(`${where}.size`, `"${r.size}" is not an iGel size in equipment.devices.igel.sizes`);
        }
        const min = number(`${where}.minKg`, r.minKg, { orZero: true });
        if (min !== undefined && prevMin !== undefined && min <= prevMin) say(`${where}.minKg`, `ranges must go in rising order (${min} follows ${prevMin})`);
        if (min !== undefined) prevMin = min;
        if (r.maxKg === null) { if (i !== E.igelRanges.length - 1) say(`${where}.maxKg`, '"and above" (empty) is allowed on the last row only'); }
        else {
          const max = number(`${where}.maxKg`, r.maxKg);
          if (max !== undefined && min !== undefined && max <= min) say(`${where}.maxKg`, `must be above the lowest weight (${min})`);
          if (max !== undefined && prevMax !== undefined && max <= prevMax) say(`${where}.maxKg`, `ranges must go in rising order (${max} follows ${prevMax})`);
          if (max !== undefined) prevMax = max;
        }
      });
      for (const size of sizes.igel || []) if (!seen.includes(size)) say('equipment.igelRanges', `has no row for iGel size "${size}"`);
    }
  }

  /* ---------- Part 5: sources ---------- */
  const S = file.sources;
  if (isObject(S)) {
    group('sources', S, [], ['name', 'summary', 'exportDate', 'reversibleCauses', 'igel', 'guidelines', 'guidanceLinks']);
    for (const k of ['name', 'summary', 'exportDate', 'reversibleCauses', 'igel']) text(`sources.${k}`, S[k]);
    const gl = group('sources.guidelines', S.guidelines, Object.keys(GUIDELINES_USED_BY_APP));
    if (gl) for (const [id, keys] of Object.entries(GUIDELINES_USED_BY_APP)) {
      const g = group(`sources.guidelines.${id}`, gl[id], keys);
      if (!g) continue;
      for (const k of keys) {
        const where = `sources.guidelines.${id}.${k}`;
        if (k === 'offlinePage') number(where, g[k], { whole: true });
        else if (!text(where, g[k])) continue;
        else if (k === 'pdf' && !PDF_NAME.test(g[k])) say(where, `must be a PDF file name (found ${show(g[k])})`);
        else if (k === 'web' && !/^https:\/\/\S+$/.test(g[k])) say(where, `must be a secure web address (starting with https) (found ${show(g[k])})`);
      }
    }
    const links = textList('sources.guidanceLinks', S.guidanceLinks);
    if (links) links.forEach((id, i) => {
      if (!isObject(S.guidelines) || !isObject(S.guidelines[id])) say(`sources.guidanceLinks.${i}`, `"${id}" is not a guideline in sources.guidelines`);
      else for (const k of ['label', 'code', 'pdf']) if (typeof S.guidelines[id][k] !== 'string') say(`sources.guidanceLinks.${i}`, `"${id}" is listed as a link but has no ${k}`);
    });
  }

  /* ---------- Notes: each one must explain a value that exists ---------- */
  if ('notes' in file) {
    if (!isObject(file.notes)) say('notes', 'must be a group of notes, each keyed by the place it explains');
    else for (const [path, note] of Object.entries(file.notes)) {
      text(`notes.${path}`, note);
      if (!PARTS.some((part) => reaches(file[part], path, part))) say(`notes.${path}`, 'explains a value that does not exist in the rule set');
    }
  }
  return problems;
}

// Does the dotted path reach a value? (A setting name may itself contain a dot, such as the iGel size 1.5.)
function reaches(node, path, here) {
  if (path === here) return true;
  if (!path.startsWith(here + '.') || node === null || typeof node !== 'object') return false;
  const rest = path.slice(here.length + 1);
  for (const key of Object.keys(node)) if (rest === key || rest.startsWith(key + '.')) if (reaches(node[key], rest, key)) return true;
  return false;
}
