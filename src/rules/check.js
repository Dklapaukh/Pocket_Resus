/* RULE SET CHECKER: reads a whole rules file (as parsed from nz-eas.yaml) and lists every problem in
   plain English. An empty list means the file passed. Each problem starts with the place it is about,
   for example "numbers.childBands.2.shockJ: must be a number above 0 and no more than 1000 J (found -5)".

   This is a pre-publish gate that the tests run (and the rules editor will run); the phone does not run it
   (the phone only needs the five parts to be present: see parse.js). It checks the SHAPE of the file:
     - every number has a type, a unit and an allowed range (the table NUMBER_LIMITS below), so impossible
       values are blocked: a negative dose, a zero interval, 5000 J, text where a number belongs, a fraction
       where a count belongs. The ranges are wide limits that block the impossible. They are NOT clinical
       opinions: the checker never says what a dose or an energy "should" be;
     - lists that must be in order are in order (weight bands, shock counts, thresholds, size lists, ...);
     - every wording entry uses exactly its own {gaps}, no more and no fewer (the table WORDING below), and
       only the allowed markup (bold, italic, line break);
     - the lists the app picks items from have the items the app looks for (event types, units, devices, ...).

   CLINICAL RELATIONSHIPS (for example "a child dose is not above the adult dose") are a different matter:
   whether they hold is a clinical decision, not a matter of shape. They are listed in RELATIONSHIP_RULES,
   each with a plain-English description and a name, and the caller chooses which are switched on:
       checkRuleSet(file)                                    the rules marked onByDefault (kept from stage 1)
       checkRuleSet(file, { relationshipRules: [] })         none of them
       checkRuleSet(file, { relationshipRules: ['name'] })   just those
   It is a pure function: it reads only what it is given, changes nothing, and holds no clinical values
   (only the names of settings and wide limits). */

const PARTS = ['numbers', 'wording', 'checklists', 'equipment', 'sources'];

/* The {gap} names the engine fills from part 1 and part 5 for any wording (engine wordingGaps). */
const ENGINE_GAPS = [
  'underOneYearKg', 'ageBandList', 'adultAges', 'ageMaxYears',
  'cprCycleMinWord', 'adrenalineEveryMin', 'amiodaroneFirstShocks', 'amiodaroneSecondShocks', 'amiodaroneMaxDoses',
  'magnesiumMaxDoses', 'bandList', 'joulesPerKg', 'adultShockJ', 'padsUpToJ', 'adultAboveKg', 'adultRoundedToKg', 'fluid',
  'fluidShort', 'adrDiluteMg', 'adrDiluteMl', 'adrDiluteMgPerMl', 'adultMagnesiumMmol', 'magAdultGrams', 'magAdultDiluteToMl',
  'magOverMinMinutes', 'magOverMaxMinutes', 'magChildMmolPerMl', 'magAmpouleMmol', 'magAmpouleMl', 'magChildDiluteToMl',
  'adultFluidsMinL', 'adultFluidsMaxL', 'childFluidsMinPerKg', 'childFluidsMaxPerKg', 'fentanylMcgPerKg', 'fentanylMaxMcg',
  'ketamineMgPerKg', 'ketamineMaxMg', 'reducedKetamineMgPerKg', 'blockerMgPerKg', 'blockerMaxMg', 'blockerRoundMg',
  'exportDate', 'reversibleCauses', 'igel', 'warningSeconds',
];


/* Every wording entry the app uses: 'text' (one sentence) or 'list' (separate paragraphs), then EXACTLY the {gaps}
   that entry uses, in the order they appear: gaps the rule set fills (see ENGINE_GAPS) and gaps the app fills when it
   shows the entry. An entry must use all of its gaps (so a number is never typed in as text) and no other gap (so
   nothing is left unfilled and shown as the word "undefined"). An entry that is a group of entries (screen text,
   labels, messages) is written as { name: [...], ... }. */
const WORDING = {
  adultDoseBasis: ['text', 'adultAboveKg'], childDoseBasis: ['text', 'band'], adultMagnesiumBasis: ['text'], childMagnesiumBasis: ['text', 'band'],
  noMagnesiumDoseBasis: ['text', 'band'], invalidWeightMagnesiumBasis: ['text'], adultFluidBasis: ['text'],
  childFluidBasis: ['text', 'band', 'min', 'maxPerKg', 'max'], noWeightFluidBasis: ['text'], amiodaroneNotYetDue: ['text', 'first', 'second'],
  amiodaroneSecondNotYetDue: ['text', 'second'], childSecondAmiodarone: ['text'], invalidWeight: ['text', 'maxKg'],
  headerEnergyTitle: ['text', 'joulesPerKg', 'adultShockJ'], padsPrompt: ['text'], padsPromptWithLimit: ['text', 'padsUpToJ'],
  estimateAgeError: ['text', 'ageMaxYears'], estimateAgeAdult: ['text', 'age'], estimatedWeightSource: ['text', 'age'], adrenalineOverdue: ['text', 'adrenalineEveryMin'],
  adrenalineUntilReview: ['text', 'adrenalineEveryMin'], amiodaroneReviewAt: ['text', 'shocks'], maxDosesRecorded: ['text', 'maxDoses'],
  withholdTorsades: ['text'], magnesiumMaxDosesStatus: ['text', 'magnesiumMaxDoses'], magnesiumRepeatStatus: ['text'], magnesiumFirstStatus: ['text'],
  fluidsCardTitle: ['text', 'fluidShort'], noWeightDoseReference: ['text'], referenceOnly: ['text'], amiodaroneChildPopupDose: ['text', 'first'],
  amiodaroneAdultPopupDose: ['text', 'first', 'second'],
  adrenalineHow: ['list', 'adrenalineEveryMin', 'adultRoundedToKg', 'adultAboveKg', 'adrDiluteMg', 'adrDiluteMl', 'fluid', 'adrDiluteMgPerMl'],
  amiodaroneHow: ['list', 'amiodaroneFirstShocks', 'amiodaroneSecondShocks'], drugPopupFooter: ['text', 'guideline'],
  amiodaroneAfterTorsadesWarning: ['text'], selectDoseAdvice: ['text'], confirmTorsades: ['text'], repeatMagnesium: ['text'],
  torsadesExtractTitle: ['text'], torsadesExtractQuote: ['text'],
  torsadesExtract: ['text', 'adultMagnesiumMmol', 'magAdultGrams', 'magOverMinMinutes', 'magOverMaxMinutes'], fluidsExtractTitle: ['text'],
  fluidsExtractQuote: ['text', 'fluid'], fluidsExtract: ['text', 'adultFluidsMinL', 'adultFluidsMaxL', 'childFluidsMinPerKg', 'childFluidsMaxPerKg'],
  fluidsRecordNote: ['text'], magnesiumNoDose: ['text'],
  magnesiumHow: ['list', 'adultMagnesiumMmol', 'fluid', 'magAdultDiluteToMl', 'magOverMinMinutes', 'magOverMaxMinutes', 'magChildMmolPerMl', 'magAmpouleMl', 'magAmpouleMmol', 'magChildDiluteToMl'],
  guidanceIntro: ['list', 'cprCycleMinWord', 'adrenalineEveryMin', 'amiodaroneFirstShocks', 'amiodaroneSecondShocks', 'bandList', 'joulesPerKg', 'adultShockJ'],
  guidanceRsiTitle: ['text'],
  guidanceRsi: ['list', 'fentanylMcgPerKg', 'fentanylMaxMcg', 'ketamineMgPerKg', 'ketamineMaxMg', 'reducedKetamineMgPerKg', 'blockerMgPerKg', 'blockerMaxMg', 'blockerRoundMg'],
  guidanceCaption: ['text', 'exportDate', 'reversibleCauses'], rsiNotRecorded: ['text'], rsiConditions: ['text'], rsiNoDose: ['text'], tubeNoAge: ['text'],
  tubeCaution: ['text'], igelSourceCaption: ['text', 'igel'], tubeSizeUnderOne: ['text', 'minMm', 'maxMm'], tubeLengthUnderOne: ['text', 'timesSize'],
  tubeSizeFormula: ['text', 'mm'], tubeLengthFormula: ['text', 'cm'],
  weightSheetAgeEstimate: ['text', 'underOneYearKg', 'ageBandList', 'adultAges'],
  tubeSheetAgeEstimate: ['text', 'underOneYearKg', 'ageBandList', 'adultAges'],
  ageBandWeight: ['text', 'ages', 'kg'], ageOneYear: ['text', 'age'], ageManyYears: ['text', 'age'], ageYearRange: ['text', 'from', 'to'],
  drugNames: { adrenaline: ['text'], amiodarone: ['text'], magnesium: ['text'] },
  weightSources: { entered: ['text'] },
  rhythmCheckTitles: { shock: ['text'], noshock: ['text'], rosc: ['text'] },
  eventDetails: {
    shockWithEnergy: ['text', 'rhythm', 'energy'], shockNoEnergy: ['text', 'rhythm'], rhythmNotRecorded: ['text'], beforeAppOpened: ['text'],
    weightUpdated: ['text', 'weight', 'source'], resusStartCorrected: ['text', 'before', 'after'],
    earlierCounts: ['text', 'shocks', 'noShock', 'amiodarone'], cycleNumber: ['text', 'number'], checklistChecked: ['text', 'item'],
    checklistUnmarked: ['text', 'item'], promptsDisabled: ['text'], promptsEnabled: ['text'], doseUnitRoute: ['text', 'dose', 'unit', 'route'],
    doseUnitRouteNotes: ['text', 'dose', 'unit', 'route', 'notes'], equipmentField: ['text', 'key', 'value'], sizeNotRecorded: ['text'],
    confirmedWith: ['text', 'methods'], confirmationNotRecorded: ['text'],
  },
  eventTitles: {
    weightUpdated: ['text'], resusStartCorrected: ['text'], earlierCountsUpdated: ['text'], cycleStarted: ['text'], rearrest: ['text'],
    sessionEnded: ['text'], specialSituation: ['text'], note: ['text'],
  },
  checklistSummary: {
    title: ['text', 'label', 'kind'], started: ['text'], finished: ['text'], firstItemChecked: ['text'], reopened: ['text'],
    allItemsChecked: ['text', 'count'],
  },
  shockRhythmButtons: { VF: ['text'], VT: ['text'], Torsades: ['text'] },
  otherRhythmButtons: { VT: ['text'] },
  references: {
    guidelineName: ['text', 'issuer', 'number'], guidelineLink: ['text', 'code'], cpgSourceLabel: ['text', 'code'],
    currentGuideline: ['text', 'code'], offlineGuideline: ['text', 'code'],
  },
  weightHeader: {
    buttonLabel: ['text'], buttonAria: ['text'], buttonAriaWithValue: ['text', 'weight'], weightKg: ['text', 'weight'], enterKg: ['text'],
    energy: ['text', 'energy'], energyEstimated: ['text', 'energy'], specialFlag: ['text'],
  },
  liveCards: {
    enterWeight: ['text'], doseMgIv: ['text', 'dose'], doseMmolIv: ['text', 'dose'], volumeMlIv: ['text', 'min', 'max'],
    recordDoseMgIv: ['text', 'dose'], recordMmolIv: ['text', 'dose'], recordFluid: ['text'], recordRepeat: ['text'], reviewDose: ['text'],
    notYetDue: ['text'], manualReview: ['text'], roscRecorded: ['text'], sessionEnded: ['text'], weightNeeded: ['text'], selectDose: ['text'],
    doseClinicalReview: ['text'], administrationAria: ['text', 'name'], administrationLink: ['text'], otherLink: ['text'],
    otherAria: ['text', 'name'], emptyClock: ['text'], overdueClock: ['text', 'time'], reviewInactive: ['text'], noDoseRecorded: ['text'],
    reviewFirstDose: ['text'], reviewSecondDose: ['text'], sinceLastDose: ['text'], fluidRecordedTotal: ['text', 'total'],
    fluidReviewVolume: ['text', 'rhythm'],
  },
  liveScreen: {
    readyForCpr: ['text'], cycleTitle: ['text', 'number'], shockOne: ['text'], shockMany: ['text'], cycleLogAria: ['text'], previousShock: ['text'],
    previousShockAria: ['text'], timerAria: ['text'], unexpectedRosc: ['text'], unexpectedRoscAria: ['text'], startButton: ['text'],
    rearrestButton: ['text'], exportButton: ['text'], rhythmCheckButton: ['text'], airwayCard: ['text'], accessCard: ['text'],
    postRoscButton: ['text'], airwayAccessButton: ['text'], eventButton: ['text'], captionReady: ['text'], captionRunning: ['text'],
    captionWarning: ['text', 'warningSeconds'], captionPrepare: ['text'], captionDue: ['text'], captionDueLate: ['text', 'late'],
    captionPaused: ['text'], captionRecordedAt: ['text', 'time'], clockRosc: ['text'], clockEnded: ['text'], titleRosc: ['text'],
    titleEnded: ['text'], cycleCompleteAlert: ['text'],
  },
  cycleLog: {
    title: ['text'], earlierCounts: ['text', 'count'], beforeApp: ['text'], cycleNumber: ['text', 'number'], timeNotSet: ['text'],
    shockDelivered: ['text'], noShock: ['text'], rearrest: ['text'], cycleStarted: ['text'], none: ['text'],
  },
  checks: { back: ['text'], eachTick: ['text'], originalLink: ['text', 'source'], disclaimer: ['text'] },
  log: {
    heading: ['text'], exportButton: ['text'], exportAria: ['text'], showLabel: ['text'], allEvents: ['text'], interventionsOnly: ['text'],
    checklistsLabel: ['text'], eachItem: ['text'], startAndFinish: ['text'], helpInterventions: ['text'], helpTimes: ['text'], helpAll: ['text'],
    exportNote: ['text'], resusStartLine: ['text', 'time', 'note', 'phase'], beforeAppOpenedNote: ['text'], addEventButton: ['text'],
    noEvents: ['text'], beforeApp: ['text'], timeNotSet: ['text'], timeNotSetAria: ['text'], sinceResusStart: ['text', 'sign', 'clock'],
    addTimeButton: ['text'], corrected: ['text'], voided: ['text'], reviewAria: ['text', 'title'], editAria: ['text', 'title', 'time'],
  },
  guidance: {
    heading: ['text'], sourcesTitle: ['text'], checklistButton: ['text', 'label'], rsiButton: ['text'], tubesButton: ['text'],
    ageYears: ['text', 'age'], ageCriteria: ['text'], causesHeading: ['text'],
  },
  referenceSheets: {
    rsiTitle: ['text'], fentanylName: ['text'], ketamineUsualName: ['text'], ketamineReducedName: ['text'], blockerName: ['text'],
    doseMcgIv: ['text', 'dose'], enterWeightButton: ['text'], tubesTitle: ['text'], ageLabel: ['text'], useAgeButton: ['text'], cuffedEtt: ['text'],
    lengthAtLips: ['text'], ageEstimateHeading: ['text'], igelHeading: ['text'], igelRange: ['text', 'size', 'min', 'max'],
    igelRangeAndAbove: ['text', 'size', 'min'], igelRangesLine: ['text', 'ranges'],
  },
  popups: { closeAria: ['text'] },
  forms: {
    timeLabel: ['text'], eventTimeLabel: ['text'], givenAtLabel: ['text'], doseLabel: ['text'], unitLabel: ['text'], routeLabel: ['text'],
    notesLabel: ['text'], optional: ['text'], timeSummary: ['text', 'time'], noteAdded: ['text'], addNote: ['text'],
  },
  rhythmSheet: { titles: { shock: ['text'], noshock: ['text'], rosc: ['text'] }, energyLabel: ['text'], energyPlaceholder: ['text'] },
  weightSheet: {
    title: ['text'], weightLabel: ['text'], deleteDigitAria: ['text'], estimateSummary: ['text'], ageLabel: ['text'], useAgeEstimateButton: ['text'],
    useWeightButton: ['text'],
  },
  rhythmCheckSheet: { title: ['text'], prompt: ['text'], shock: ['text'], shockNote: ['text'], noShock: ['text'], rosc: ['text'] },
  resusTime: { title: ['text'], intro: ['text'], startedLabel: ['text'], choiceLabel: ['text', 'minutes'], choiceNote: ['text'], note: ['text'], saveButton: ['text'] },
  settings: {
    title: ['text'], tutorial: ['text'], undo: ['text'], largerText: ['text'], largerTextOn: ['text'], screenAwake: ['text'], screenAwakeOn: ['text'],
    install: ['text'], history: ['text'], resusTime: ['text'], guidance: ['text'], export: ['text'], specialLabel: ['text'], specialNote: ['text'],
    endButton: ['text'], newButton: ['text'], online: ['text'], offline: ['text'], storageNote: ['text', 'state'],
  },
  historySheet: {
    title: ['text'], intro: ['text'], priorShocks: ['text'], priorNoShock: ['text'], priorStreak: ['text'], priorAmio: ['text'], saveButton: ['text'],
    earlierAdrenalineButton: ['text'],
  },
  administration: { adrenalineTitle: ['text'], amiodaroneTitle: ['text'], fluidsTitle: ['text'], magnesiumTitle: ['text'] },
  medicineForm: { title: ['text', 'name'], fallbackName: ['text'], medicineLabel: ['text'], dosePlaceholder: ['text'], submit: ['text'] },
  selectDoseSheet: { title: ['text'], doseLabel: ['text'], dosePlaceholder: ['text'], submit: ['text'] },
  interventions: { airway: ['text'], access: ['text'], both: ['text'] },
  equipmentSheet: { recordButton: ['text', 'name'], recordAndAddIntubation: ['text'] },
  noteSheet: { title: ['text'], eventLabel: ['text'], eventPlaceholder: ['text'], submit: ['text'], anotherMedicineButton: ['text'] },
  correctionSheet: {
    title: ['text'], detailsLabel: ['text'], rhythmLabel: ['text'], energyLabel: ['text'], saveButton: ['text'], note: ['text'],
    stateChangeNote: ['text'], restoreButton: ['text'], voidButton: ['text'],
  },
  magnesiumRepeatSheet: { title: ['text'], recordButton: ['text', 'dose'], backButton: ['text'] },
  torsadesConfirmSheet: { title: ['text'], confirmButton: ['text'], backButton: ['text'] },
  fluidGuidanceSheet: { title: ['text'], continueButton: ['text'] },
  endSheet: { title: ['text'], text: ['text'], confirmButton: ['text'], keepButton: ['text'] },
  newPatientSheet: { title: ['text'], text: ['text'], exportButton: ['text'], clearButton: ['text'] },
  installSheet: { title: ['text'], android: ['text'], iphone: ['text'], note: ['text'] },
  exportSheet: { title: ['text'], intro: ['text'], downloadText: ['text'], downloadJson: ['text'], copyText: ['text'], note: ['text'] },
  exportRecord: {
    line: ['text', 'time', 'title'], lineWithDetails: ['text', 'time', 'title', 'details'], timeUnknown: ['text'],
    fileName: ['text', 'start', 'extension'],
  },
  tutorial: { title: ['text'], progressAria: ['text'], slidesAria: ['text'], endNote: ['text'], nextNote: ['text'], back: ['text'], next: ['text'], done: ['text'] },
  toasts: {
    weightUpdated: ['text'], resusDurationUpdated: ['text'], earlierCountsSaved: ['text'], cycleStarted: ['text'], rearrestRecorded: ['text'],
    sessionEnded: ['text'], newPatient: ['text'], previousShockAdded: ['text'], undone: ['text'], recordedDose: ['text', 'dose'],
    eventUpdated: ['text'], administrationRecorded: ['text'], interventionRecorded: ['text'], eventRecorded: ['text'], eventCorrected: ['text'],
    otherTab: ['text'], recordCopied: ['text'], couldNotCopy: ['text'], sessionEndedUndo: ['text'], wakeLockUnavailable: ['text'],
    keepAwakeFailed: ['text'], magnesiumRecorded: ['text'], roscRecorded: ['text'], rhythmRecorded: ['text'], recoveryBackedUp: ['text'],
    recoveryNotBackedUp: ['text'],
  },
  errors: {
    resusStartAfterApp: ['text'], earlierCounts: ['text'], medicineIncomplete: ['text'], tubeSize: ['text'], eventEmpty: ['text'],
    timeBeforeApp: ['text'], stateChangeTime: ['text'], doseNotPositive: ['text'], age: ['text'], energy: ['text'], timeInFuture: ['text'],
  },
};


/* The only markup wording may use: bold, italic and a line break. */
const ALLOWED_TAGS = ['<b>', '</b>', '<em>', '</em>', '<br>'];
const CHECKLIST_IDS_USED_BY_APP = ['arrest', 'postrosc', 'preparation', 'rsi'];
const DEVICE_TYPES_USED_BY_APP = ['iv', 'io', 'opa', 'npa', 'igel', 'laryngoscopy', 'intubation'];
const GUIDELINES_USED_BY_APP = { // setting names each linked guideline must have
  cardiacArrest: ['code', 'label', 'pdf', 'offlinePage', 'web'], postRosc: ['code', 'label', 'pdf'],
  paediatric: ['code', 'label', 'pdf'], rsi: ['code', 'label', 'pdf'], adrenaline: ['code', 'pdf'],
  amiodarone: ['code', 'pdf'], magnesium: ['code', 'web'],
};
// A PDF file name goes into a link: no ".." (it could leave the app's folder), no leading "/", no ":" (a web scheme), no quotes, spaces or < >.
const PDF_NAME = /^(?!\/)(?!.*\.\.)[\w./-]+\.pdf(#page=\d+)?$/;
// A web address goes into a link: secure (https) only, and no quotes, spaces, < > or backslash.
const WEB_ADDRESS = /^https:\/\/[^\s"'<>\\]+$/;

/* Every kind of log event the app can record. The "Interventions only" list may name only these. */
const EVENT_TYPES_THE_APP_RECORDS = ['weight', 'resus-time', 'start', 'history', 'rearrest', 'end', 'checklist', 'context', 'equipment', 'note',
  'shock', 'noshock', 'rosc', 'adrenaline', 'amiodarone', 'magnesium', 'fluids', 'medicine', 'checklist-summary'];
/* Units and routes the app itself selects by name, so the medicine form's lists must keep them. */
const MEDICINE_UNITS_THE_APP_USES = ['mg', 'mmol', 'mL'];
const MEDICINE_ROUTES_THE_APP_USES = ['IV'];

/* ------------------------------------------------------------------------------------------------
   NUMBER_LIMITS: the type, unit and allowed range of EVERY number in the rule set.
   One row per number ("*" stands for any one list position or name, for example every weight band).
     type    'whole' = a whole number (a count); 'number' = any number, fractions allowed
     unit    what the number counts or measures, used in the messages
     above / atLeast   the lowest allowed value: "above" excludes the value itself (above 0 blocks 0 as well
                       as negatives), "atLeast" includes it
     max     the highest allowed value
     orEmpty the number may also be left empty (null), meaning "none"
   These are limits that block the IMPOSSIBLE. They are deliberately wide and say nothing about what is
   clinically right: a value inside the range is not thereby approved. A number in the rule set with no row
   here is reported, so a new setting cannot slip in without a type, a unit and a range.
   ------------------------------------------------------------------------------------------------ */
const NUMBER_LIMITS = [
  // ---- timings (in milliseconds; the longest allowed is one hour) ----
  { path: 'numbers.timing.cprCycleMs', type: 'whole', unit: 'ms', above: 0, max: 3600000 }, // one CPR cycle: longer than nothing, up to an hour
  { path: 'numbers.timing.adrenalineIntervalMs', type: 'whole', unit: 'ms', above: 0, max: 3600000 }, // time between adrenaline reviews
  { path: 'numbers.timing.checklistPromptMinLeftMs', type: 'whole', unit: 'ms', above: 0, max: 3600000 }, // time left in the cycle for the checklist reminder
  { path: 'numbers.timing.overdueShownAfterMs', type: 'whole', unit: 'ms', atLeast: 0, max: 3600000 }, // how late before the lateness is shown (0 = at once)
  { path: 'numbers.timing.prepareAtMs', type: 'whole', unit: 'ms', above: 0, max: 3600000 }, // time left when "prepare" shows
  { path: 'numbers.timing.warningAtMs', type: 'whole', unit: 'ms', above: 0, max: 3600000 }, // time left when the seconds warning shows
  { path: 'numbers.timing.adrenalineHighlightMs', type: 'whole', unit: 'ms', above: 0, max: 3600000 }, // time before adrenaline review when the card is highlighted
  { path: 'numbers.doubleTapLockMs.*', type: 'whole', unit: 'ms', atLeast: 0, max: 3600000 }, // how long a button stays locked after a tap (0 = no lock)
  // ---- weights ----
  { path: 'numbers.weight.maxKg', type: 'number', unit: 'kg', above: 0, max: 1000 }, // heaviest weight the app accepts (nobody weighs a tonne)
  { path: 'numbers.weight.adultAboveKg', type: 'number', unit: 'kg', above: 0, max: 1000 }, // weight above which the adult doses are used
  { path: 'numbers.weight.adultRoundedToKg', type: 'number', unit: 'kg', above: 0, max: 1000 }, // weight an adult is rounded to for the adrenaline wording
  { path: 'numbers.childBands.*.maxKg', type: 'number', unit: 'kg', above: 0, max: 1000 }, // top weight of one child band
  // ---- weight from age ----
  { path: 'numbers.ageEstimate.underOneYearKg', type: 'number', unit: 'kg', above: 0, max: 1000 }, // estimated weight under one year
  { path: 'numbers.ageEstimate.bands.*.maxAge', type: 'whole', unit: 'years', above: 0, max: 120 }, // last (rounded-up) age of one age row (A16; nobody is older than 120)
  { path: 'numbers.ageEstimate.bands.*.weightKg', type: 'number', unit: 'kg', above: 0, max: 1000 }, // the band weight given for that age row
  { path: 'numbers.ageEstimate.adultUpToAge', type: 'whole', unit: 'years', above: 0, max: 120 }, // oldest age accepted; above the last row up to here = adult, no weight
  // ---- doses and energies, children (one row per weight band) ----
  { path: 'numbers.childBands.*.adrenalineMg', type: 'number', unit: 'mg', above: 0, max: 100 }, // a child adrenaline dose
  { path: 'numbers.childBands.*.amiodaroneFirstMg', type: 'number', unit: 'mg', above: 0, max: 5000 }, // a child first amiodarone dose
  // no child second amiodarone dose: EAS 7.2 gives none (A10, 14 Nov 2026); a band row holding one is refused
  { path: 'numbers.childBands.*.magnesiumMmol', type: 'number', unit: 'mmol', above: 0, max: 1000, orEmpty: true }, // a child magnesium dose (empty = no dose for this band)
  { path: 'numbers.childBands.*.shockJ', type: 'number', unit: 'J', above: 0, max: 2000 }, // a child shock energy (5000 J is impossible)
  { path: 'numbers.childBands.*.fluidsTableMl', type: 'number', unit: 'mL', above: 0, max: 5000 }, // the band's 20 mL/kg fluid volume from the EAS 7.2 table (A11)
  // ---- doses and energies, adults ----
  { path: 'numbers.adult.adrenalineMg', type: 'number', unit: 'mg', above: 0, max: 100 }, // adult adrenaline dose
  { path: 'numbers.adult.amiodaroneFirstMg', type: 'number', unit: 'mg', above: 0, max: 5000 }, // adult first amiodarone dose
  { path: 'numbers.adult.amiodaroneSecondMg', type: 'number', unit: 'mg', above: 0, max: 5000 }, // adult second amiodarone dose
  { path: 'numbers.adult.magnesiumMmol', type: 'number', unit: 'mmol', above: 0, max: 1000 }, // adult magnesium dose
  { path: 'numbers.adult.fluidsMinMl', type: 'number', unit: 'mL', above: 0, max: 20000 }, // smallest adult fluid volume
  { path: 'numbers.adult.fluidsMaxMl', type: 'number', unit: 'mL', above: 0, max: 20000 }, // largest adult fluid volume
  { path: 'numbers.adult.shockJ', type: 'number', unit: 'J', above: 0, max: 2000 }, // adult shock energy
  { path: 'numbers.child.fluidsMinMlPerKg', type: 'number', unit: 'mL per kg', above: 0, max: 200 }, // smallest child fluid volume
  { path: 'numbers.child.fluidsMaxMlPerKg', type: 'number', unit: 'mL per kg', above: 0, max: 200 }, // largest child fluid volume
  { path: 'numbers.shock.joulesPerKg', type: 'number', unit: 'J per kg', above: 0, max: 50 }, // energy per kg used for the band wording
  { path: 'numbers.shock.paediatricPadsUpToJ', type: 'number', unit: 'J', above: 0, max: 2000 }, // energy up to which paediatric pads are prompted
  { path: 'numbers.shock.maxRecordableJ', type: 'number', unit: 'J', above: 0, max: 2000 }, // highest energy the app lets a person record
  // ---- counts ----
  { path: 'numbers.amiodarone.dueAtShocks.*', type: 'whole', unit: 'shocks', above: 0, max: 50 }, // number of shocks at which an amiodarone dose is due
  { path: 'numbers.magnesium.maxDoses', type: 'whole', unit: 'doses', above: 0, max: 20 }, // most magnesium doses the app allows
  { path: 'numbers.resusStart.quickChoicesMin.*', type: 'whole', unit: 'minutes', above: 0, max: 1440 }, // a quick "resus started N minutes ago" choice (up to a day)
  // ---- preparation instructions ----
  { path: 'numbers.preparation.adrenalineChild.drugMg', type: 'number', unit: 'mg', above: 0, max: 100 }, // adrenaline drawn up for the child dilution
  { path: 'numbers.preparation.adrenalineChild.totalMl', type: 'number', unit: 'mL', above: 0, max: 1000 }, // total volume of the child dilution
  { path: 'numbers.preparation.magnesium.adultGrams', type: 'number', unit: 'g', above: 0, max: 100 }, // adult magnesium amount in grams
  { path: 'numbers.preparation.magnesium.adultDiluteToMl', type: 'number', unit: 'mL', above: 0, max: 1000 }, // volume the adult dose is diluted to
  { path: 'numbers.preparation.magnesium.overMinMinutes', type: 'number', unit: 'minutes', above: 0, max: 1440 }, // shortest time to give magnesium over
  { path: 'numbers.preparation.magnesium.overMaxMinutes', type: 'number', unit: 'minutes', above: 0, max: 1440 }, // longest time to give magnesium over
  { path: 'numbers.preparation.magnesium.ampouleMmol', type: 'number', unit: 'mmol', above: 0, max: 1000 }, // magnesium in one ampoule
  { path: 'numbers.preparation.magnesium.ampouleMl', type: 'number', unit: 'mL', above: 0, max: 1000 }, // volume of one ampoule
  { path: 'numbers.preparation.magnesium.childDiluteToMl', type: 'number', unit: 'mL', above: 0, max: 1000 }, // volume the child dose is diluted to
  // ---- RSI reference doses ----
  { path: 'numbers.rsi.fentanyl.mcgPerKg', type: 'number', unit: 'mcg per kg', above: 0, max: 1000 }, // fentanyl per kg
  { path: 'numbers.rsi.fentanyl.maxMcg', type: 'number', unit: 'mcg', above: 0, max: 100000 }, // fentanyl cap
  { path: 'numbers.rsi.ketamine.mgPerKg', type: 'number', unit: 'mg per kg', above: 0, max: 1000 }, // usual ketamine per kg
  { path: 'numbers.rsi.ketamine.maxMg', type: 'number', unit: 'mg', above: 0, max: 5000 }, // usual ketamine cap
  { path: 'numbers.rsi.reducedKetamine.mgPerKg', type: 'number', unit: 'mg per kg', above: 0, max: 1000 }, // reduced ketamine per kg
  { path: 'numbers.rsi.reducedKetamine.maxMg', type: 'number', unit: 'mg', above: 0, max: 5000 }, // reduced ketamine cap
  { path: 'numbers.rsi.blocker.mgPerKg', type: 'number', unit: 'mg per kg', above: 0, max: 1000 }, // neuromuscular blocker per kg
  { path: 'numbers.rsi.blocker.maxMg', type: 'number', unit: 'mg', above: 0, max: 5000 }, // neuromuscular blocker cap
  { path: 'numbers.rsi.blocker.roundAdultToMg', type: 'number', unit: 'mg', above: 0, max: 5000 }, // adult blocker dose is rounded to this
  // EAS 9.3 dose summary table columns (A12): the column weight and the four doses shown for it
  { path: 'numbers.rsi.tables.*.*.columnKg', type: 'number', unit: 'kg', above: 0, max: 1000 }, // weight of one table column
  { path: 'numbers.rsi.tables.*.*.fentanylMcg', type: 'number', unit: 'mcg', above: 0, max: 100000 }, // fentanyl dose in that column
  { path: 'numbers.rsi.tables.*.*.ketamineMg', type: 'number', unit: 'mg', above: 0, max: 5000 }, // usual ketamine dose in that column
  { path: 'numbers.rsi.tables.*.*.reducedKetamineMg', type: 'number', unit: 'mg', above: 0, max: 5000 }, // reduced ketamine dose in that column
  { path: 'numbers.rsi.tables.*.*.blockerMg', type: 'number', unit: 'mg', above: 0, max: 5000 }, // rocuronium or suxamethonium dose in that column
  // ---- airway tubes ----
  { path: 'numbers.tubes.showUpToAge', type: 'whole', unit: 'years', above: 0, max: 120 }, // oldest age the tube table is shown for
  { path: 'numbers.tubes.underOneSizeMinMm', type: 'number', unit: 'mm', above: 0, max: 30 }, // smallest tube size under one year
  { path: 'numbers.tubes.underOneSizeMaxMm', type: 'number', unit: 'mm', above: 0, max: 30 }, // largest tube size under one year
  { path: 'numbers.tubes.underOneLengthTimesSize', type: 'number', unit: 'times the tube size', above: 0, max: 100 }, // length at lips under one year, as a multiple of the size
  { path: 'numbers.tubes.sizeAgeDivisor', type: 'number', unit: 'years per mm', above: 0, max: 1000 }, // age is divided by this (so never 0) for the tube size
  { path: 'numbers.tubes.sizeAddMm', type: 'number', unit: 'mm', atLeast: 0, max: 30 }, // added to the tube size
  { path: 'numbers.tubes.lengthAgeDivisor', type: 'number', unit: 'years per cm', above: 0, max: 1000 }, // age is divided by this (so never 0) for the length at lips
  { path: 'numbers.tubes.lengthAddCm', type: 'number', unit: 'cm', atLeast: 0, max: 100 }, // added to the length at lips
  { path: 'numbers.tubes.displayDecimals', type: 'whole', unit: 'decimal places', atLeast: 0, max: 4 }, // decimal places shown for tube sizes
  // ---- equipment ----
  { path: 'equipment.maxTubeSizeMm', type: 'number', unit: 'mm', above: 0, max: 30 }, // largest tube size that can be recorded
  { path: 'equipment.forms.intubation.lipsMinCm', type: 'number', unit: 'cm', above: 0, max: 100 }, // shortest length at lips that can be recorded
  { path: 'equipment.forms.intubation.lipsMaxCm', type: 'number', unit: 'cm', above: 0, max: 100 }, // longest length at lips that can be recorded
  { path: 'equipment.igelRanges.*.minKg', type: 'number', unit: 'kg', atLeast: 0, max: 1000 }, // lightest patient for this iGel size
  { path: 'equipment.igelRanges.*.maxKg', type: 'number', unit: 'kg', above: 0, max: 1000, orEmpty: true }, // heaviest patient for this iGel size (empty = "and above", last row only)
  // ---- sources ----
  { path: 'sources.guidelines.cardiacArrest.offlinePage', type: 'whole', unit: 'page number', above: 0, max: 10000 }, // page of the packaged cardiac arrest guideline
];

/* ------------------------------------------------------------------------------------------------
   RELATIONSHIP_RULES: checks that say how one clinical number must relate to another. Whether they hold
   is a clinical decision, so each can be switched on or off by the caller (see the top of this file).
   onByDefault: true  = already on in stage 1, kept on so nothing the checker caught before is lost;
   onByDefault: false = written but OFF until the owner says otherwise.
   The "plain" text is the description an owner reads.
   ------------------------------------------------------------------------------------------------ */
export const RELATIONSHIP_RULES = [
  { id: 'childNotAboveAdult', onByDefault: true, plain: 'No child band adrenaline, amiodarone, magnesium or shock energy is above the adult value.' },
  { id: 'bandEnergyIsWeightTimesJoulesPerKg', onByDefault: true, plain: 'Each child band shock energy equals the band weight times the joules per kg.' },
  { id: 'lastBandReachesAdultWeight', onByDefault: true, plain: 'The last child weight band reaches the adult weight limit, so every child weight has a row.' },
  { id: 'adultEnergyWithinRecordableLimit', onByDefault: true, plain: 'The adult shock energy is not above the highest energy that can be recorded.' },
  { id: 'adultRoundedWeightWithinMaxWeight', onByDefault: true, plain: 'The weight an adult is rounded to is not above the highest valid weight.' },
  { id: 'ampouleFitsDilutedVolume', onByDefault: true, plain: 'The magnesium ampoule volume is not above the volume the child dose is diluted to.' },
  { id: 'bandDosesRiseWithWeight', onByDefault: false, plain: 'Within the child bands, adrenaline, amiodarone, magnesium and shock energy never fall as the weight band rises.' },
  { id: 'secondAmiodaroneNotAboveFirst', onByDefault: false, plain: 'The second amiodarone dose is not above the first, for adults and for every child band.' },
  { id: 'igelRangesLeaveNoGap', onByDefault: false, plain: 'The iGel weight ranges leave no weight uncovered between the lightest and the heaviest size.' },
];
const RELATIONSHIPS_ON_BY_DEFAULT = RELATIONSHIP_RULES.filter((rule) => rule.onByDefault).map((rule) => rule.id);

const at = (where, key) => where + '.' + key; // the place of a setting inside a group
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const show = (v) => {
  if (typeof v === 'number') return String(v);
  const t = JSON.stringify(v);
  return t === undefined ? String(v) : t.length > 40 ? t.slice(0, 37) + '...' : t;
};

/* All places in the file that a NUMBER_LIMITS path reaches, as { path, value } ("*" = every list position or name). */
function placesFor(file, pattern) {
  let found = [{ path: '', value: file }];
  for (const part of pattern.split('.')) {
    found = found.flatMap(({ path, value }) => {
      if (value === null || typeof value !== 'object') return [];
      const keys = part === '*' ? Object.keys(value) : (part in value ? [part] : []);
      return keys.map((key) => ({ path: path ? path + '.' + key : key, value: value[key] }));
    });
  }
  return found;
}
/* The NUMBER_LIMITS row for a place such as "numbers.childBands.2.shockJ" (undefined if there is none). */
const limitRows = NUMBER_LIMITS.map((row) => ({ row, pattern: new RegExp('^' + row.path.split('.').map((s) => (s === '*' ? '[^.]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('\\.') + '$') }));
const limitFor = (path) => limitRows.find(({ pattern }) => pattern.test(path))?.row;

/* Why a value is not allowed by its NUMBER_LIMITS row (plain English), or null if it is fine. */
function limitProblem(row, v) {
  if (v === null && row.orEmpty) return null;
  const fine = typeof v === 'number' && Number.isFinite(v) && (row.type !== 'whole' || Number.isInteger(v))
    && (row.above !== undefined ? v > row.above : v >= row.atLeast) && v <= row.max;
  if (fine) return null;
  const lowest = row.above !== undefined ? `above ${row.above}` : `of ${row.atLeast} or more`;
  return `must be ${row.type === 'whole' ? 'a whole number' : 'a number'} ${lowest} and no more than ${row.max} ${row.unit}${row.orEmpty ? ' (or left empty)' : ''} (found ${show(v)})`;
}

/* Are the sizes in order? A list of numbers written as text must rise all the way or fall all the way. */
function sizesAreInOrder(list) {
  const n = list.map((item) => (typeof item === 'string' && item.trim() !== '' ? Number(item) : NaN));
  if (n.some((x) => !Number.isFinite(x)) || n.length < 2) return true; // names such as Large / Medium / Small have no order to check
  return n.every((x, i) => i === 0 || x >= n[i - 1]) || n.every((x, i) => i === 0 || x <= n[i - 1]); // "00" and "0" are two sizes with the same number
}

/* checkRuleSet(file, options): the list of problems in the rule set (empty = fine). options.relationshipRules
   is the list of RELATIONSHIP_RULES names to switch on (default: the ones marked onByDefault). */
export function checkRuleSet(file, { relationshipRules = RELATIONSHIPS_ON_BY_DEFAULT } = {}) {
  for (const id of relationshipRules) if (!RELATIONSHIP_RULES.some((rule) => rule.id === id)) throw new Error(`"${id}" is not the name of a relationship rule`);
  const on = (id) => relationshipRules.includes(id);
  const problems = [];
  const say = (where, text) => { problems.push(`${where}: ${text}`); }; // returns nothing, so "return say(...)" means "not fine"

  if (!isObject(file)) return ['the rule set: must be one object with the five parts (numbers, wording, checklists, equipment, sources)'];

  /* ---------- Building blocks. Each returns the value if it is fine, or undefined after reporting. ---------- */
  const numbersChecked = new Set(); // places already checked against NUMBER_LIMITS (the closing sweep does the rest)
  // A number: its type, unit and range come from its NUMBER_LIMITS row. An empty (null) number gives undefined too.
  function number(where, v) {
    numbersChecked.add(where);
    const row = limitFor(where);
    if (!row) return typeof v === 'number' && Number.isFinite(v) ? v : undefined; // the closing sweep reports a number with no row
    const why = limitProblem(row, v);
    if (why) return say(where, why);
    return v === null ? undefined : v;
  }
  const text = (where, v) => (typeof v === 'string' && v.trim() !== '' ? v : say(where, `must be some text, not empty (found ${show(v)})`));
  // Text that is shown as it is: no markup and no {gap}. Only the wording part may use bold, italic and line breaks.
  function plainText(where, v) {
    if (!text(where, v)) return undefined;
    const bad = /<[^>]*>?|[<>]/.exec(v);
    if (bad) return say(where, `must be plain text; ${bad[0]} is not allowed here (only the wording part may use bold, italic and line breaks)`);
    if (/[{}]/.test(v)) return say(where, 'must be plain text; a {gap} is not filled here (only the wording part has gaps)');
    return v;
  }
  function textList(where, v, { unique = true, plain = true } = {}) {
    if (!Array.isArray(v) || v.length === 0) return say(where, 'must be a list with at least one item');
    let ok = true;
    v.forEach((item, i) => { if (!(plain ? plainText : text)(`${where}.${i}`, item)) ok = false; });
    if (ok && unique && new Set(v).size !== v.length) return say(where, 'has the same item more than once');
    return ok ? v : undefined;
  }
  // Text that is put on screen as HTML (so a tag would really act as a tag): only bold, italic and a line break
  // are allowed, and each <b> or <em> must be closed. `pieces` is a list of texts that are checked as one entry.
  // Used for the wording part and for the part 3 texts that the app puts on screen as HTML.
  function allowedMarkupOnly(where, pieces) {
    pieces.forEach((piece) => {
      const withoutTags = piece.replace(/<[^>]*>/g, (tag) => (ALLOWED_TAGS.includes(tag) ? '' : (say(where, `uses ${tag}; only <b>, <em> and <br> are allowed`), '')));
      if (/[<>]/.test(withoutTags)) say(where, 'has a stray < or >');
    });
    // Every opening <b> or <em> needs its closing tag.
    for (const tag of ['b', 'em']) {
      const opened = pieces.join(' ').split(`<${tag}>`).length - 1, closed = pieces.join(' ').split(`</${tag}>`).length - 1;
      if (opened !== closed) say(where, `has ${opened} <${tag}> but ${closed} </${tag}>; each needs its closing tag`);
    }
  }
  // An object that must have exactly these settings (and may also have the optional ones).
  const unknownPlaces = []; // places reported as "not a setting the app knows"
  function group(where, v, required, optional = []) {
    if (!isObject(v)) return say(where, 'must be a group of settings, and is missing or the wrong kind');
    let ok = true;
    for (const k of required) if (!(k in v)) { say(`${where}.${k}`, 'is missing'); ok = false; }
    for (const k of Object.keys(v)) if (!required.includes(k) && !optional.includes(k)) { say(`${where}.${k}`, 'is not a setting the app knows'); unknownPlaces.push(`${where}.${k}`); ok = false; }
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
      'amiodarone', 'magnesium', 'products', 'preparation', 'rsi', 'tubes', 'doubleTapLockMs',
      'resusStart', 'correctionRhythms', 'log', 'medicineForm']);

    const t = group('numbers.timing', N.timing, ['cprCycleMs', 'adrenalineIntervalMs', 'checklistPromptMinLeftMs',
      'overdueShownAfterMs', 'prepareAtMs', 'warningAtMs', 'adrenalineHighlightMs']);
    if (t) {
      const cycle = number('numbers.timing.cprCycleMs', t.cprCycleMs);
      const adrenalineEvery = number('numbers.timing.adrenalineIntervalMs', t.adrenalineIntervalMs);
      // Thresholds must fit inside the cycle or interval they count down in, and come in the right order.
      const left = number('numbers.timing.checklistPromptMinLeftMs', t.checklistPromptMinLeftMs);
      lessOrEqual('numbers.timing.checklistPromptMinLeftMs', left, cycle, 'the time left', 'the CPR cycle');
      // Timer messages: how late a check must be before the lateness is shown, and when the warnings start.
      const overdue = number('numbers.timing.overdueShownAfterMs', t.overdueShownAfterMs);
      lessOrEqual('numbers.timing.overdueShownAfterMs', overdue, cycle, 'the lateness limit', 'the CPR cycle');
      const prepare = number('numbers.timing.prepareAtMs', t.prepareAtMs);
      const warning = number('numbers.timing.warningAtMs', t.warningAtMs);
      lessOrEqual('numbers.timing.warningAtMs', warning, cycle, 'the warning time', 'the CPR cycle');
      lessOrEqual('numbers.timing.prepareAtMs', prepare, warning, 'the "prepare" time', 'the warning time (the prepare message comes later in the cycle)');
      if (warning !== undefined && warning % 1000 !== 0) say('numbers.timing.warningAtMs', `must be a whole number of seconds, because the message says the seconds (found ${warning})`);
      const highlight = number('numbers.timing.adrenalineHighlightMs', t.adrenalineHighlightMs);
      lessOrEqual('numbers.timing.adrenalineHighlightMs', highlight, adrenalineEvery, 'the highlight time', 'the adrenaline interval');
    }

    let adultAbove, weightMax;
    const w = group('numbers.weight', N.weight, ['maxKg', 'adultAboveKg', 'adultRoundedToKg']);
    if (w) {
      weightMax = number('numbers.weight.maxKg', w.maxKg);
      adultAbove = number('numbers.weight.adultAboveKg', w.adultAboveKg);
      const rounded = number('numbers.weight.adultRoundedToKg', w.adultRoundedToKg);
      if (adultAbove !== undefined && weightMax !== undefined && adultAbove >= weightMax) say('numbers.weight.adultAboveKg', `must be below the highest valid weight (${weightMax})`);
      if (on('adultRoundedWeightWithinMaxWeight')) lessOrEqual('numbers.weight.adultRoundedToKg', rounded, weightMax, 'it', 'the highest valid weight');
    }

    // Weight from age (A16): one row per age range, ages rising; the oldest accepted age is above the last row.
    const a = group('numbers.ageEstimate', N.ageEstimate, ['underOneYearKg', 'bands', 'adultUpToAge']);
    if (a) {
      number('numbers.ageEstimate.underOneYearKg', a.underOneYearKg);
      let lastAge;
      if (!Array.isArray(a.bands) || a.bands.length === 0) say('numbers.ageEstimate.bands', 'must be a list with one row for each age range');
      else a.bands.forEach((row, i) => {
        const where = `numbers.ageEstimate.bands.${i}`;
        const r = group(where, row, ['maxAge', 'weightKg']);
        if (!r) return;
        const maxAge = number(`${where}.maxAge`, r.maxAge);
        number(`${where}.weightKg`, r.weightKg);
        if (maxAge !== undefined && lastAge !== undefined && maxAge <= lastAge) say(`${where}.maxAge`, `age rows must go in rising order (${maxAge} follows ${lastAge})`);
        if (maxAge !== undefined) lastAge = maxAge;
      });
      const upTo = number('numbers.ageEstimate.adultUpToAge', a.adultUpToAge);
      if (upTo !== undefined && lastAge !== undefined && upTo <= lastAge) say('numbers.ageEstimate.adultUpToAge', `must be above the last age row (${lastAge})`);
    }

    // Adult, shock: read first because the child rows are compared with them.
    const ad = group('numbers.adult', N.adult, ['adrenalineMg', 'amiodaroneFirstMg', 'amiodaroneSecondMg', 'magnesiumMmol', 'fluidsMinMl', 'fluidsMaxMl', 'shockJ']);
    const adult = {};
    if (ad) {
      for (const k of Object.keys(ad)) adult[k] = number(`numbers.adult.${k}`, ad[k]);
      lessOrEqual('numbers.adult.fluidsMinMl', adult.fluidsMinMl, adult.fluidsMaxMl, 'the smallest volume', 'the largest volume');
      if (on('secondAmiodaroneNotAboveFirst')) lessOrEqual('numbers.adult.amiodaroneSecondMg', adult.amiodaroneSecondMg, adult.amiodaroneFirstMg, 'the second dose', 'the first dose');
    }
    const sh = group('numbers.shock', N.shock, ['joulesPerKg', 'paediatricPadsUpToJ', 'maxRecordableJ']);
    let joulesPerKg, maxRecordableJ;
    if (sh) {
      joulesPerKg = number('numbers.shock.joulesPerKg', sh.joulesPerKg);
      number('numbers.shock.paediatricPadsUpToJ', sh.paediatricPadsUpToJ);
      maxRecordableJ = number('numbers.shock.maxRecordableJ', sh.maxRecordableJ);
    }
    if (on('adultEnergyWithinRecordableLimit')) lessOrEqual('numbers.adult.shockJ', adult.shockJ, maxRecordableJ, 'the adult energy', 'the highest energy that can be recorded');

    // One row per child weight band, smallest first, and a row for every child weight.
    if (!Array.isArray(N.childBands) || N.childBands.length === 0) say('numbers.childBands', 'must be a list with one row for each weight band');
    else {
      let previous, previousRow;
      N.childBands.forEach((row, i) => {
        const where = `numbers.childBands.${i}`;
        const r = group(where, row, ['maxKg', 'adrenalineMg', 'amiodaroneFirstMg', 'magnesiumMmol', 'shockJ', 'fluidsTableMl']);
        if (!r) return;
        const maxKg = number(`${where}.maxKg`, r.maxKg);
        if (maxKg !== undefined && previous !== undefined && maxKg <= previous) say(`${where}.maxKg`, `bands must go in rising order, one row per band (${maxKg} follows ${previous})`);
        if (maxKg !== undefined) previous = maxKg;
        const values = {};
        for (const key of ['adrenalineMg', 'amiodaroneFirstMg', 'shockJ', 'magnesiumMmol']) {
          values[key] = number(`${where}.${key}`, r[key]); // magnesium may be empty (no dose for this band): then undefined
          if (on('childNotAboveAdult')) lessOrEqual(`${where}.${key}`, values[key], adult[key], 'the child value', 'the adult value');
          if (on('bandDosesRiseWithWeight') && previousRow) lessOrEqual(`${where}.${key}`, previousRow[key], values[key], 'the previous band value', 'this band value');
        }
        previousRow = { ...previousRow, ...Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined)) };
        if (on('bandEnergyIsWeightTimesJoulesPerKg') && maxKg !== undefined && joulesPerKg !== undefined && typeof r.shockJ === 'number' && r.shockJ !== maxKg * joulesPerKg)
          say(`${where}.shockJ`, `must be the band weight (${maxKg}) times the joules per kg (${joulesPerKg}) = ${maxKg * joulesPerKg} (found ${r.shockJ})`);
      });
      if (on('lastBandReachesAdultWeight') && adultAbove !== undefined && previous !== undefined && previous < adultAbove) say('numbers.childBands', `the last band (${previous} kg) must reach the adult weight limit (${adultAbove} kg) so every child weight has a row`);
    }

    const c = group('numbers.child', N.child, ['fluidsMinMlPerKg', 'fluidsMaxMlPerKg']);
    if (c) lessOrEqual('numbers.child.fluidsMinMlPerKg', number('numbers.child.fluidsMinMlPerKg', c.fluidsMinMlPerKg), number('numbers.child.fluidsMaxMlPerKg', c.fluidsMaxMlPerKg), 'the smallest volume', 'the largest volume');

    // Rhythm lists. A rhythm cannot be both shockable and not; the lower-card lists must use rhythms that exist, and no rhythm may be in both.
    const rh = group('numbers.rhythms', N.rhythms, ['shock', 'noshock', 'rosc']);
    const known = [];
    if (rh) {
      for (const k of ['shock', 'noshock', 'rosc']) { const list = textList(`numbers.rhythms.${k}`, rh[k]); if (list && k !== 'rosc') known.push(...list); }
      if (Array.isArray(rh.shock) && Array.isArray(rh.noshock)) rh.noshock.forEach((name, i) => { if (rh.shock.includes(name)) say(`numbers.rhythms.noshock.${i}`, `"${name}" is also in the shock list, and a rhythm cannot be both shockable and not`); });
    }
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
        const counts = due.map((v, i) => number(`numbers.amiodarone.dueAtShocks.${i}`, v));
        counts.forEach((v, i) => { if (v !== undefined && i > 0 && counts[i - 1] !== undefined && v <= counts[i - 1]) say(`numbers.amiodarone.dueAtShocks.${i}`, `shock counts must rise (${v} follows ${counts[i - 1]})`); });
      }
    }
    const mg = group('numbers.magnesium', N.magnesium, ['maxDoses']);
    if (mg) number('numbers.magnesium.maxDoses', mg.maxDoses);

    const pr = group('numbers.products', N.products, ['fluid', 'fluidShort']);
    if (pr) { plainText('numbers.products.fluid', pr.fluid); plainText('numbers.products.fluidShort', pr.fluidShort); }

    const prep = group('numbers.preparation', N.preparation, ['adrenalineChild', 'magnesium']);
    if (prep) {
      const ac = group('numbers.preparation.adrenalineChild', prep.adrenalineChild, ['drugMg', 'totalMl']);
      if (ac) { number('numbers.preparation.adrenalineChild.drugMg', ac.drugMg); number('numbers.preparation.adrenalineChild.totalMl', ac.totalMl); }
      const pm = group('numbers.preparation.magnesium', prep.magnesium, ['adultGrams', 'adultDiluteToMl', 'overMinMinutes', 'overMaxMinutes', 'ampouleMmol', 'ampouleMl', 'childDiluteToMl']);
      if (pm) {
        const v = {};
        for (const k of Object.keys(pm)) v[k] = number(`numbers.preparation.magnesium.${k}`, pm[k]);
        lessOrEqual('numbers.preparation.magnesium.overMinMinutes', v.overMinMinutes, v.overMaxMinutes, 'the shortest time', 'the longest time');
        if (on('ampouleFitsDilutedVolume')) lessOrEqual('numbers.preparation.magnesium.ampouleMl', v.ampouleMl, v.childDiluteToMl, 'the ampoule volume', 'the diluted volume');
      }
    }

    const rsi = group('numbers.rsi', N.rsi, ['fentanyl', 'ketamine', 'reducedKetamine', 'blocker', 'tables']);
    if (rsi) {
      for (const [drug, keys] of [['fentanyl', ['mcgPerKg', 'maxMcg']], ['ketamine', ['mgPerKg', 'maxMg']], ['reducedKetamine', ['mgPerKg', 'maxMg']], ['blocker', ['mgPerKg', 'maxMg', 'roundAdultToMg']]]) {
        const d = group(`numbers.rsi.${drug}`, rsi[drug], keys);
        if (d) for (const k of keys) number(`numbers.rsi.${drug}.${k}`, d[k]);
      }
      // A12: the EAS 9.3 tables. Each is a list of columns, lightest first (the app takes the first column at or above
      // an adult weight, and the column equal to a child's band).
      const tables = group('numbers.rsi.tables', rsi.tables, ['paediatric', 'adult']);
      if (tables) for (const name of ['paediatric', 'adult']) {
        const where = `numbers.rsi.tables.${name}`, list = tables[name];
        if (!Array.isArray(list) || list.length === 0) { say(where, 'must be a list with one row for each table column'); continue; }
        let previous;
        list.forEach((row, i) => {
          const r = group(`${where}.${i}`, row, ['columnKg', 'fentanylMcg', 'ketamineMg', 'reducedKetamineMg', 'blockerMg']);
          if (!r) return;
          for (const k of Object.keys(r)) number(`${where}.${i}.${k}`, r[k]);
          if (previous !== undefined && r.columnKg <= previous) say(`${where}.${i}.columnKg`, `columns must go in rising order (${r.columnKg} follows ${previous})`);
          previous = r.columnKg;
        });
      }
    }

    const tu = group('numbers.tubes', N.tubes, ['showUpToAge', 'underOneSizeMinMm', 'underOneSizeMaxMm', 'underOneLengthTimesSize', 'sizeAgeDivisor', 'sizeAddMm', 'lengthAgeDivisor', 'lengthAddCm', 'displayDecimals']);
    if (tu) {
      number('numbers.tubes.showUpToAge', tu.showUpToAge);
      const lo = number('numbers.tubes.underOneSizeMinMm', tu.underOneSizeMinMm), hi = number('numbers.tubes.underOneSizeMaxMm', tu.underOneSizeMaxMm);
      lessOrEqual('numbers.tubes.underOneSizeMinMm', lo, hi, 'the smallest size', 'the largest size');
      for (const k of ['underOneLengthTimesSize', 'sizeAgeDivisor', 'sizeAddMm', 'lengthAgeDivisor', 'lengthAddCm', 'displayDecimals']) number(`numbers.tubes.${k}`, tu[k]);
    }

    const lock = group('numbers.doubleTapLockMs', N.doubleTapLockMs, ['adrenaline', 'magnesium', 'fluids']);
    if (lock) for (const k of Object.keys(lock)) number(`numbers.doubleTapLockMs.${k}`, lock[k]);

    // Quick choices, correction-form rhythm lists, log settings, medicine form choices.
    const rs = group('numbers.resusStart', N.resusStart, ['quickChoicesMin']);
    if (rs) {
      const choices = Array.isArray(rs.quickChoicesMin) && rs.quickChoicesMin.length ? rs.quickChoicesMin : say('numbers.resusStart.quickChoicesMin', 'must be a list with at least one number of minutes');
      let prev;
      (choices || []).forEach((v, i) => {
        const minutes = number(`numbers.resusStart.quickChoicesMin.${i}`, v);
        if (minutes !== undefined && prev !== undefined && minutes <= prev) say(`numbers.resusStart.quickChoicesMin.${i}`, `minutes must rise, each choice different (${minutes} follows ${prev})`);
        if (minutes !== undefined) prev = minutes;
      });
    }
    const cr = group('numbers.correctionRhythms', N.correctionRhythms, ['shock', 'noshock', 'rosc', 'rhythm']);
    if (cr) for (const k of ['shock', 'noshock', 'rosc', 'rhythm']) {
      const list = textList(`numbers.correctionRhythms.${k}`, cr[k]);
      if (!list) continue;
      const allRhythms = rh ? ['shock', 'noshock', 'rosc'].flatMap((x) => (Array.isArray(rh[x]) ? rh[x] : [])) : [];
      list.forEach((name, i) => { if (allRhythms.length && !allRhythms.includes(name)) say(`numbers.correctionRhythms.${k}.${i}`, `"${name}" is not a rhythm in numbers.rhythms`); });
      // the correction form must still offer every rhythm that can be recorded for that outcome
      if (rh && Array.isArray(rh[k])) for (const name of rh[k]) if (!list.includes(name)) say(`numbers.correctionRhythms.${k}`, `must offer "${name}", which can be recorded (numbers.rhythms.${k})`);
    }
    const lg = group('numbers.log', N.log, ['interventionEventTypes']);
    if (lg) {
      const types = textList('numbers.log.interventionEventTypes', lg.interventionEventTypes);
      (types || []).forEach((type, i) => {
        if (!EVENT_TYPES_THE_APP_RECORDS.includes(type)) say(`numbers.log.interventionEventTypes.${i}`, `"${type}" is not a kind of event the app records (it records: ${EVENT_TYPES_THE_APP_RECORDS.join(', ')})`);
      });
    }
    const mf = group('numbers.medicineForm', N.medicineForm, ['units', 'routes']);
    if (mf) {
      const units = textList('numbers.medicineForm.units', mf.units), routes = textList('numbers.medicineForm.routes', mf.routes);
      for (const unit of MEDICINE_UNITS_THE_APP_USES) if (units && !units.includes(unit)) say('numbers.medicineForm.units', `must include "${unit}", which the app selects for its own medicines`);
      for (const route of MEDICINE_ROUTES_THE_APP_USES) if (routes && !routes.includes(route)) say('numbers.medicineForm.routes', `must include "${route}", which the app selects for its own medicines`);
    }
  }

  /* ---------- Part 2: wording ---------- */
  const W = file.wording;
  if (isObject(W)) {
    // One entry (text or list) with its gaps; or a group of entries, checked one level down.
    const checkWording = (where, value, spec) => {
      if (!Array.isArray(spec)) {
        if (!isObject(value)) return say(where, 'must be a group of wording entries, and is missing or the wrong kind');
        for (const key of Object.keys(spec)) if (!(key in value)) say(`${where}.${key}`, 'is missing');
        for (const [key, item] of Object.entries(value)) {
          if (!(key in spec)) say(`${where}.${key}`, 'is not a wording entry the app knows');
          else checkWording(`${where}.${key}`, item, spec[key]);
        }
        return;
      }
      const [kind, ...gaps] = spec;
      let pieces;
      if (kind === 'list') pieces = textList(where, value, { unique: false, plain: false });
      else pieces = text(where, value) ? [value] : undefined;
      if (!pieces) return;
      const gapsUsed = new Set();
      const allowed = gaps.length ? 'it may use only ' + gaps.map((g) => `{${g}}`).join(', ') : 'it uses no gaps at all';
      pieces.forEach((piece) => {
        for (const gap of new Set([...piece.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))) {
          gapsUsed.add(gap);
          if (gaps.includes(gap)) continue;
          if (!ENGINE_GAPS.includes(gap)) say(where, `{${gap}} cannot be filled (it is not a number or name the app supplies)`);
          else say(where, `{${gap}} is not one of this entry's own gaps, so it would not be filled (${allowed})`);
        }
        const withoutGaps = piece.replace(/\{\w+\}/g, '');
        if (/[{}]/.test(withoutGaps)) say(where, 'has a curly bracket that is not a complete {gap}');
        if (/\b(undefined|NaN)\b/.test(piece)) say(where, 'contains the word "undefined" or "NaN", which would be shown to the person');
      });
      allowedMarkupOnly(where, pieces.map((piece) => piece.replace(/\{\w+\}/g, ''))); // markup rule (the {gaps} are checked above)
      // Exactly its own gaps: a number the app fills in must not be typed in as text (or left out).
      for (const gap of gaps) if (!gapsUsed.has(gap)) say(where, `must contain {${gap}}, which the app fills in; typing the value in as text would stop it following the rule set (${allowed})`);
    };
    for (const key of Object.keys(WORDING)) if (!(key in W)) say(`wording.${key}`, 'is missing');
    for (const [key, value] of Object.entries(W)) {
      if (!(key in WORDING)) say(`wording.${key}`, 'is not a wording entry the app knows');
      else checkWording(`wording.${key}`, value, WORDING[key]);
    }
  }

  /* ---------- Part 3: checklists and causes ---------- */
  const C = file.checklists;
  if (isObject(C)) {
    // Checklist text is shown as it is: no {gap} is filled here.
    const noGaps = (where, v) => (text(where, v) && /[{}]/.test(v) ? say(where, 'must not contain a {gap}; checklist text is shown as it is') : v);
    // HOW THE APP SHOWS THESE TEXTS (src/app/views.js, events.js):
    //   - the checklist ITEMS are put on screen as plain text (escaped, so a tag would be shown as typed letters), and the
    //     label and code are also used in places that are escaped (the Log, the source line), so these take NO markup at all;
    //   - the checklist introduction and the cause name, group, short name and text are put on screen as HTML, so only
    //     the wording markup (bold, italic, line break; each <b> and <em> closed) is allowed, as in the wording part.
    const plainChecklistText = (where, v) => {
      if (!noGaps(where, v)) return undefined;
      const bad = /<[^>]*>?|[<>]/.exec(v);
      return bad ? say(where, `must be plain text; ${bad[0]} is not allowed here (checklist items, labels and codes take no markup)`) : v;
    };
    const markupChecklistText = (where, v) => {
      if (!noGaps(where, v)) return undefined;
      allowedMarkupOnly(where, [v]);
      return v;
    };
    // An id is put inside a page attribute and joined to an item number with ":", so it may use only letters, digits, "-" and "_".
    const idText = (where, v) => (text(where, v) && !/^[A-Za-z0-9_-]+$/.test(v) ? say(where, `must use only letters, digits, - and _ (found ${show(v)})`) : v);
    group('checklists', C, [], ['lists', 'causes']);
    if (!Array.isArray(C.lists) || C.lists.length === 0) say('checklists.lists', 'must be a list of checklists');
    else {
      const ids = [];
      C.lists.forEach((list, i) => {
        const where = `checklists.lists.${i}`;
        const l = group(where, list, ['id', 'label', 'code', 'pdf', 'items'], ['intro']);
        if (!l) return;
        if (idText(`${where}.id`, l.id) && typeof l.id === 'string') { if (ids.includes(l.id)) say(`${where}.id`, `"${l.id}" is used by another checklist`); ids.push(l.id); }
        plainChecklistText(`${where}.label`, l.label); plainChecklistText(`${where}.code`, l.code);
        if (text(at(where, 'pdf'), l.pdf) && !PDF_NAME.test(l.pdf)) say(at(where, 'pdf'), `must be a PDF file name, optionally with #page=N; no "..", no leading "/", no ":" (found ${show(l.pdf)})`);
        if ('intro' in l) markupChecklistText(`${where}.intro`, l.intro);
        if (textList(`${where}.items`, l.items, { plain: false })) l.items.forEach((item, j) => plainChecklistText(`${where}.items.${j}`, item));
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
        for (const k of Object.keys(x)) (k === 'id' ? idText : markupChecklistText)(`${where}.${k}`, x[k]);
        if (typeof x.id === 'string') { if (ids.includes(x.id)) say(`${where}.id`, `"${x.id}" is used by another cause`); ids.push(x.id); }
      });
    }
  }

  /* ---------- Part 4: equipment ---------- */
  const E = file.equipment;
  if (isObject(E)) {
    group('equipment', E, [], ['devices', 'blades', 'maxTubeSizeMm', 'sites', 'colours', 'igelRanges', 'accessDevices', 'forms']);
    const sizes = {};
    const dv = group('equipment.devices', E.devices, DEVICE_TYPES_USED_BY_APP);
    if (dv) for (const type of DEVICE_TYPES_USED_BY_APP) {
      const d = group(`equipment.devices.${type}`, dv[type], ['name', 'sizes']);
      if (d) {
        plainText(`equipment.devices.${type}.name`, d.name);
        sizes[type] = textList(`equipment.devices.${type}.sizes`, d.sizes);
        if (sizes[type] && !sizesAreInOrder(sizes[type])) say(`equipment.devices.${type}.sizes`, 'numbered sizes must be in order, all rising or all falling');
      }
    }
    // Which devices are listed under Access (the rest are listed under Airway).
    const access = textList('equipment.accessDevices', E.accessDevices);
    if (access) {
      access.forEach((type, i) => { if (!DEVICE_TYPES_USED_BY_APP.includes(type)) say(`equipment.accessDevices.${i}`, `"${type}" is not a device type in equipment.devices`); });
      if (DEVICE_TYPES_USED_BY_APP.every((type) => access.includes(type))) say('equipment.accessDevices', 'leaves no device for the Airway list');
    }
    const bl = group('equipment.blades', E.blades, ['Video', 'Direct']);
    if (bl) { textList('equipment.blades.Video', bl.Video); textList('equipment.blades.Direct', bl.Direct); }
    const maxTube = number('equipment.maxTubeSizeMm', E.maxTubeSizeMm);
    // The questions and answer choices on the equipment forms.
    const fm = group('equipment.forms', E.forms, ['laryngoscopy', 'intubation', 'outcome', 'access', 'sizes']);
    if (fm) {
      const lar = group('equipment.forms.laryngoscopy', fm.laryngoscopy, ['methodQuestion', 'methods', 'bladeHint', 'bladeQuestion', 'forcepsQuestion', 'forcepsChoices', 'viewQuestion', 'views']);
      if (lar) {
        for (const k of ['methodQuestion', 'bladeHint', 'bladeQuestion', 'forcepsQuestion', 'viewQuestion']) plainText(`equipment.forms.laryngoscopy.${k}`, lar[k]);
        const methods = textList('equipment.forms.laryngoscopy.methods', lar.methods);
        if (methods) {
          if (methods.length !== 2) say('equipment.forms.laryngoscopy.methods', 'must have exactly two methods: the first uses the Video blade list and the second the Direct blade list');
          else if (bl && (!(methods[0] in bl) || !(methods[1] in bl))) say('equipment.forms.laryngoscopy.methods', 'each method must be the name of a blade list in equipment.blades (Video, Direct)');
        }
        textList('equipment.forms.laryngoscopy.forcepsChoices', lar.forcepsChoices);
        textList('equipment.forms.laryngoscopy.views', lar.views);
      }
      const inb = group('equipment.forms.intubation', fm.intubation, ['introducerQuestion', 'introducers', 'lipsQuestion', 'lipsMinCm', 'lipsMaxCm', 'confirmQuestion', 'confirmMethods', 'sizeLegend', 'sizeUnit']);
      if (inb) {
        for (const k of ['introducerQuestion', 'lipsQuestion', 'confirmQuestion', 'sizeLegend', 'sizeUnit']) plainText(`equipment.forms.intubation.${k}`, inb[k]);
        textList('equipment.forms.intubation.introducers', inb.introducers);
        textList('equipment.forms.intubation.confirmMethods', inb.confirmMethods);
        const lo = number('equipment.forms.intubation.lipsMinCm', inb.lipsMinCm), hi = number('equipment.forms.intubation.lipsMaxCm', inb.lipsMaxCm);
        lessOrEqual('equipment.forms.intubation.lipsMinCm', lo, hi, 'the smallest length', 'the largest length');
      }
      const oc = group('equipment.forms.outcome', fm.outcome, ['question', 'choices']);
      if (oc) { plainText('equipment.forms.outcome.question', oc.question); textList('equipment.forms.outcome.choices', oc.choices); }
      const ac = group('equipment.forms.access', fm.access, ['sideQuestion', 'sides', 'locationQuestion']);
      if (ac) { plainText('equipment.forms.access.sideQuestion', ac.sideQuestion); textList('equipment.forms.access.sides', ac.sides); plainText('equipment.forms.access.locationQuestion', ac.locationQuestion); }
      const sz = group('equipment.forms.sizes', fm.sizes, ['cannulaLegend', 'otherLegend', 'cannulaSuffix']);
      if (sz) for (const k of Object.keys(sz)) plainText(`equipment.forms.sizes.${k}`, sz[k]);
    }
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
        if (plainText(`${where}.size`, r.size)) {
          if (seen.includes(r.size)) say(`${where}.size`, `"${r.size}" has more than one row`);
          seen.push(r.size);
          if (sizes.igel && !sizes.igel.includes(r.size)) say(`${where}.size`, `"${r.size}" is not an iGel size in equipment.devices.igel.sizes`);
        }
        const min = number(`${where}.minKg`, r.minKg);
        if (min !== undefined && prevMin !== undefined && min <= prevMin) say(`${where}.minKg`, `ranges must go in rising order (${min} follows ${prevMin})`);
        if (on('igelRangesLeaveNoGap') && min !== undefined && prevMax !== undefined && min > prevMax) say(`${where}.minKg`, `leaves weights from ${prevMax} to ${min} kg with no iGel size`);
        if (min !== undefined) prevMin = min;
        if (r.maxKg === null) { numbersChecked.add(`${where}.maxKg`); if (i !== E.igelRanges.length - 1) say(`${where}.maxKg`, '"and above" (empty) is allowed on the last row only'); }
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
    for (const k of ['name', 'summary', 'exportDate', 'reversibleCauses', 'igel']) plainText(`sources.${k}`, S[k]);
    const gl = group('sources.guidelines', S.guidelines, Object.keys(GUIDELINES_USED_BY_APP));
    if (gl) for (const [id, keys] of Object.entries(GUIDELINES_USED_BY_APP)) {
      const g = group(`sources.guidelines.${id}`, gl[id], keys);
      if (!g) continue;
      for (const k of keys) {
        const where = `sources.guidelines.${id}.${k}`;
        if (k === 'offlinePage') number(where, g[k]);
        else if (!plainText(where, g[k])) continue;
        else if (k === 'pdf' && !PDF_NAME.test(g[k])) say(where, `must be a PDF file name with no "..", no leading "/", no ":" (found ${show(g[k])})`);
        else if (k === 'web' && !WEB_ADDRESS.test(g[k])) say(where, `must be a secure web address starting with https and with no quotes, spaces, < > or backslash (found ${show(g[k])})`);
      }
    }
    const links = textList('sources.guidanceLinks', S.guidanceLinks);
    if (links) links.forEach((id, i) => {
      if (!isObject(S.guidelines) || !isObject(S.guidelines[id])) say(`sources.guidanceLinks.${i}`, `"${id}" is not a guideline in sources.guidelines`);
      else for (const k of ['label', 'code', 'pdf']) if (typeof S.guidelines[id][k] !== 'string') say(`sources.guidanceLinks.${i}`, `"${id}" is listed as a link but has no ${k}`);
    });
  }

  /* ---------- Closing sweep: every number in the rule set must have its type, unit and range ---------- */
  // 1. A number that sits where the table expects one, but was not reached above (for example in a group that failed).
  for (const row of NUMBER_LIMITS) for (const { path, value } of placesFor(file, row.path)) {
    if (numbersChecked.has(path) || unknownPlaces.some((u) => path === u || path.startsWith(u + '.'))) continue;
    const why = limitProblem(row, value);
    if (why) say(path, why);
  }
  // 2. A number with no row in the table: it has no type, unit or range, so it is reported.
  (function sweep(v, where) {
    if (typeof v === 'number') { if (!limitFor(where) && !unknownPlaces.some((u) => where === u || where.startsWith(u + '.'))) say(where, 'is a number with no unit and allowed range listed (every number needs a row in NUMBER_LIMITS in check.js)'); return; }
    if (v === null || typeof v !== 'object') return;
    for (const [k, item] of Object.entries(v)) sweep(item, where ? `${where}.${k}` : k);
  })({ numbers: file.numbers, wording: file.wording, checklists: file.checklists, equipment: file.equipment, sources: file.sources }, '');

  /* ---------- Closing sweep: a double quote in any text could break out of a page attribute ---------- */
  // The app puts some rule-set text inside HTML attributes written with double quotes (aria-label="...", href="...",
  // data-...="..."), without escaping it. A " would end the attribute and what follows would become new attributes
  // (for example an onclick). So no text, and no setting name, in the five parts may contain one.
  // (Every attribute in src/app and src/engine is double-quoted, so ' and spaces need no rule.)
  function noQuotes(v, where) {
    const message = 'double quotes are not allowed here (the app would put the text inside a page attribute); use single quotes instead';
    if (typeof v === 'string') { if (v.includes('"')) say(where, message); return; }
    if (v === null || typeof v !== 'object') return;
    for (const [k, item] of Object.entries(v)) {
      if (k.includes('"')) say(`${where}.${k}`, 'a setting name must not contain a double quote');
      noQuotes(item, `${where}.${k}`);
    }
  }
  for (const part of PARTS) if (isObject(file[part])) noQuotes(file[part], part);

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
