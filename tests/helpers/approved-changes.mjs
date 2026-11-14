// APPROVED CHANGES: every rule-set value the owner has approved changing (doc 07 A-table) since the frozen
// reference copies were made (tests/baseline/, tests/golden/, owner decision 14 Nov 2026, Option A).
//
// The frozen copies are NEVER edited. A test that says "identical to the reference" compares with the frozen
// copy plus exactly these swaps, and nothing else. So the tests still prove that an approved change is the
// ONLY difference from the reference, and every swap here can be traced to its A-table row.
//
// Each change: the A-table row, the dotted place in the rules file, the value before and the value after.
// A value that was deleted has `after: REMOVED`, and a new value has `before: REMOVED`; both name the value
// they follow (`follows`), so the value goes in (or back) at the same place. A value may be a whole group or
// list (A12's dose tables); then `jsonAfter` gives the exact text of the frozen JSON file it goes after, as the
// line of the value it follows is not unique there. A place is a dotted text, or a
// list of names when a name itself holds dots (notes are named after the place they describe).
// CODE_CHANGES lists the exact code edits of approved rows, so a copy of the app can be put back to the
// reference (appWithApprovedChangesUndone) for tests whose reference holds only fingerprints of screens.
// A swap fails loudly if the copy holds anything other than the "before" value at that place, so a wrong
// or out-of-date entry here cannot pass quietly.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { readYamlStrict } from '../../src/rules/parse.js';
import { rulesFileText } from '../../src/rules/write.js';

export const REMOVED = Symbol('removed');
const NOTE_BANDS = "Child weight bands (EAS 7.2). A child's weight is ROUNDED UP to the next band (e.g. 15 kg uses the 20 kg row). magnesiumMmol null = no dose listed: seek clinical advice. shockJ = 4 J/kg of the band, from change A1 (owner-approved 3 Nov 2026).";
const OLD_FLUIDS = "/* Fluid volume reference in mL: adult range, or 20-40 mL/kg of the ACTUAL child weight.\n   Same comma quirk as magnesium (see above). */\nexport function fluidReference(session) {\n  if (!R.validWeight(session.weight)) return { min: null, max: null, basis: R.wording('noWeightFluidBasis') };\n  if (R.isPaediatric(session)) {\n    const kg = +session.weight;\n    const perKg = { minPerKg: RULES.numbers.child.fluidsMinMlPerKg, maxPerKg: RULES.numbers.child.fluidsMaxMlPerKg };\n    return { min: perKg.minPerKg * kg, max: perKg.maxPerKg * kg, basis: R.wording('childFluidBasis', perKg) };\n  }";
const NEW_FLUIDS = "/* Fluid volume reference in mL: adult range, or for a child the weight BAND (rounded up, change A11):\n   lower = the band's EAS 7.2 table volume (20 mL/kg), upper = 40 mL/kg x the band weight (EAS 3.14 formula),\n   with the working shown in the basis line. Same comma quirk as magnesium (see above). */\nexport function fluidReference(session) {\n  if (!R.validWeight(session.weight)) return { min: null, max: null, basis: R.wording('noWeightFluidBasis') };\n  if (R.isPaediatric(session)) {\n    const band = R.childBand(+session.weight);\n    if (!band) return { min: null, max: null, basis: R.wording('noWeightFluidBasis') }; // cannot happen: a saved comma weight is converted on load\n    const maxPerKg = RULES.numbers.child.fluidsMaxMlPerKg;\n    const min = band.fluidsTableMl, max = maxPerKg * band.maxKg;\n    return { min, max, basis: R.wording('childFluidBasis', { band: band.maxKg, min, maxPerKg, max }) };\n  }";

const OLD_RSI_CODE = "/* RSI dose references from the exact weight in kg (not the band). Reference only; records nothing. */\nexport function rsiDoses(weightKg) {\n  const { fentanyl, ketamine, reducedKetamine, blocker, displayDecimals } = RULES.numbers.rsi;\n  const capped = (perKg, max) => Math.min(weightKg * perKg, max);\n  const blockerMg = weightKg > RULES.numbers.weight.adultAboveKg\n    ? Math.min(Math.round((weightKg * blocker.mgPerKg) / blocker.roundAdultToMg) * blocker.roundAdultToMg, blocker.maxMg)\n    : capped(blocker.mgPerKg, blocker.maxMg);\n  return {\n    fentanylMcg: roundTo(capped(fentanyl.mcgPerKg, fentanyl.maxMcg), displayDecimals),\n    ketamineMg: roundTo(capped(ketamine.mgPerKg, ketamine.maxMg), displayDecimals),\n    reducedKetamineMg: roundTo(capped(reducedKetamine.mgPerKg, reducedKetamine.maxMg), displayDecimals),\n    blockerMg: roundTo(blockerMg, displayDecimals),\n  };\n}\n\n";
const NEW_RSI_CODE = "/* RSI dose references looked up in the EAS 9.3 dose summary tables (change A12). Reference only; records nothing.\n   A child (weight.adultAboveKg or less) uses the column of its weight band, rounded up (decision 2). The 5 kg band\n   has no column, so null is returned and the pop-up shows \"Seek clinical advice\" (decision 7 rule 3).\n   An adult uses the first adult column at or above the weight; above the last column, the last (\"≥ 100 kg\").\n   Returns a copy of the column: { columnKg, fentanylMcg, ketamineMg, reducedKetamineMg, blockerMg }, or null. */\nexport function rsiDoses(weightKg) {\n  const { paediatric, adult } = RULES.numbers.rsi.tables;\n  const column = weightKg <= RULES.numbers.weight.adultAboveKg\n    ? paediatric.find((c) => c.columnKg === childBand(weightKg)?.maxKg)\n    : adult.find((c) => weightKg <= c.columnKg) ?? adult.at(-1);\n  return column ? { ...column } : null;\n}\n\n";
const OLD_RSI_SHEET = "    const d = R.rsiDoses(w);\n    const doseList = w\n      ? `<p><b>${T('weightHeader.weightKg', { weight: w })}</b> · ${R.guideText('rsiNotRecorded')}</p><dl>` +\n        `<dt>${T('referenceSheets.fentanylName')}</dt><dd>${T('referenceSheets.doseMcgIv', { dose: d.fentanylMcg })}</dd>` +\n        `<dt>${T('referenceSheets.ketamineUsualName')}</dt><dd>${T('liveCards.doseMgIv', { dose: d.ketamineMg })}</dd>` +\n        `<dt>${T('referenceSheets.ketamineReducedName')}</dt><dd>${T('liveCards.doseMgIv', { dose: d.reducedKetamineMg })}</dd>` +\n        `<dt>${T('referenceSheets.blockerName')}</dt><dd>${T('liveCards.doseMgIv', { dose: d.blockerMg })}</dd></dl>`\n";
const NEW_RSI_SHEET = "    const d = R.rsiDoses(w);\n    // A12: no table column for this weight (5 kg band) shows \"Seek clinical advice\" and no number\n    const dose = (phrase, value) => (d ? T(phrase, { dose: d[value] }) : R.guideText('rsiNoDose'));\n    const doseList = w\n      ? `<p><b>${T('weightHeader.weightKg', { weight: w })}</b> · ${R.guideText('rsiNotRecorded')}</p><dl>` +\n        `<dt>${T('referenceSheets.fentanylName')}</dt><dd>${dose('referenceSheets.doseMcgIv', 'fentanylMcg')}</dd>` +\n        `<dt>${T('referenceSheets.ketamineUsualName')}</dt><dd>${dose('liveCards.doseMgIv', 'ketamineMg')}</dd>` +\n        `<dt>${T('referenceSheets.ketamineReducedName')}</dt><dd>${dose('liveCards.doseMgIv', 'reducedKetamineMg')}</dd>` +\n        `<dt>${T('referenceSheets.blockerName')}</dt><dd>${dose('liveCards.doseMgIv', 'blockerMg')}</dd></dl>`\n";
/* A16: weight from age from the EAS 7.2 band table headings (code before and after). */
const OLD_AGE_CODE = "/* Paediatric weight estimate from age in years, or null when no rule applies. */\nexport function estimate(age) {\n  const years = Number(age);\n  const rules = RULES.numbers.ageEstimate;\n  if (String(age).trim() === '' || !Number.isFinite(years) || years <= 0 || years > rules.elevenToFourteenYears.maxAge) return null;\n  if (years < 1) return rules.underOneYearKg;\n  if (!Number.isInteger(years)) return null; // between 1 and 14, only whole years have a rule\n  if (years <= rules.oneToTenYears.maxAge) return (years + rules.oneToTenYears.addYears) * rules.oneToTenYears.multiplyBy;\n  return years * rules.elevenToFourteenYears.multiplyBy;\n}\n\n/* The numbers the age-estimate wording shows, all taken from numbers.ageEstimate. */\nexport function ageEstimateGaps() {\n  const { underOneYearKg, oneToTenYears: ten, elevenToFourteenYears: fourteen } = RULES.numbers.ageEstimate;\n  return {\n    underOneYearKg,\n    tenMaxAge: ten.maxAge,\n    tenAddYears: ten.addYears,\n    tenMultiplyBy: ten.multiplyBy,\n    fourteenFromAge: ten.maxAge + 1,\n    fourteenMaxAge: fourteen.maxAge,\n    fourteenMultiplyBy: fourteen.multiplyBy,\n  };\n}\n\n";
const NEW_AGE_CODE = "/* Age from the EAS 7.2 band table headings (change A16): an age under 1 year stays as typed; an age of 1 year\n   or more is ROUNDED UP to the next whole year (1.1 -> 2). null for a blank or non-number entry, 0 or less,\n   or above numbers.ageEstimate.adultUpToAge (no estimate). */\nfunction roundedUpAge(age) {\n  const years = Number(age);\n  if (String(age).trim() === '' || !Number.isFinite(years) || years <= 0 || years > RULES.numbers.ageEstimate.adultUpToAge) return null;\n  return years < 1 ? years : Math.ceil(years);\n}\n\n/* Paediatric weight estimate from age in years (change A16): under 1 year = underOneYearKg; otherwise the\n   weightKg of the first band whose maxAge the rounded-up age does not pass. null when no weight is given:\n   an age outside the rules, or an adult age (see adultAge). */\nexport function estimate(age) {\n  const rules = RULES.numbers.ageEstimate, years = roundedUpAge(age);\n  if (years === null) return null;\n  if (years < 1) return rules.underOneYearKg;\n  return rules.bands.find((band) => years <= band.maxAge)?.weightKg ?? null;\n}\n\n/* The rounded-up age when it is above every band but not above adultUpToAge (age 14 = adult, owner decision\n   8): the weight pop-up then says to enter the weight. null for any other age. */\nexport function adultAge(age) {\n  const years = roundedUpAge(age);\n  return years !== null && years >= 1 && estimate(age) === null ? years : null;\n}\n\n/* The numbers and phrases the age-estimate wording shows, all built from numbers.ageEstimate:\n   ageBandList \"1 year: 10 kg. 2–5 years: 20 kg. ...\", adultAges \"14 years\", ageMaxYears 14. */\nexport function ageEstimateGaps() {\n  const { underOneYearKg, bands, adultUpToAge } = RULES.numbers.ageEstimate;\n  const ages = (from, to) => (from === to ? wording(from === 1 ? 'ageOneYear' : 'ageManyYears', { age: from }) : wording('ageYearRange', { from, to }));\n  const ageBandList = bands.map((band, i) => wording('ageBandWeight', { ages: ages(i === 0 ? 1 : bands[i - 1].maxAge + 1, band.maxAge), kg: band.weightKg })).join(' ');\n  return { underOneYearKg, ageBandList, adultAges: ages(bands.at(-1).maxAge + 1, adultUpToAge), ageMaxYears: adultUpToAge };\n}\n\n";
const OLD_AGE_EVENT = "  if (w === null) return error(R.guideText('estimateAgeError'));\n";
const NEW_AGE_EVENT = "  if (w === null) {\n    const adult = R.adultAge($('ageInput').value); // A16: age 14 = adult, no weight is filled\n    return error(adult === null ? R.guideText('estimateAgeError') : R.guideText('estimateAgeAdult', { age: adult }));\n  }\n";
const OLD_AGE_ESTIMATE = {"underOneYearKg": 5, "oneToTenYears": {"maxAge": 10, "addYears": 4, "multiplyBy": 2}, "elevenToFourteenYears": {"maxAge": 14, "multiplyBy": 3}};
const NEW_AGE_ESTIMATE = {"underOneYearKg": 5, "bands": [{"maxAge": 1, "weightKg": 10}, {"maxAge": 5, "weightKg": 20}, {"maxAge": 10, "weightKg": 30}, {"maxAge": 13, "weightKg": 40}], "adultUpToAge": 14};
/* A18: tube size and length from the EAS 7.2 band tables (code before and after). */
const OLD_TUBE_CODE = "/* Tube size and length-at-lips wording for an age in years, or null when not shown (no age, or above\n   showUpToAge). */\nexport function tubeReference(age) {\n  const t = RULES.numbers.tubes;\n  if (age === null || !(age <= t.showUpToAge)) return null;\n  if (age < 1) {\n    return {\n      size: wording('tubeSizeUnderOne', { minMm: t.underOneSizeMinMm, maxMm: t.underOneSizeMaxMm }),\n      length: wording('tubeLengthUnderOne', { timesSize: t.underOneLengthTimesSize }),\n    };\n  }\n  return {\n    size: wording('tubeSizeFormula', { mm: roundTo(age / t.sizeAgeDivisor + t.sizeAddMm, t.displayDecimals) }),\n    length: wording('tubeLengthFormula', { cm: roundTo(age / t.lengthAgeDivisor + t.lengthAddCm, t.displayDecimals) }),\n  };\n}\n\n";
const NEW_TUBE_CODE = "/* Cuffed ETT size and length at lips from the EAS 7.2 band tables (change A18). The band comes from the saved\n   weight, rounded up; with no valid weight, from the saved age (weight from age, A16). A saved weight wins.\n   Returns { size, length } for a child band, { adult: true } for a weight over adultAboveKg or an age above the\n   age rows (14 years or more), or null when neither weight nor age gives a band. */\nexport function tubeReference(weight, age) {\n  const kg = validWeight(weight) ? weightNumber(weight) : estimate(age);\n  if (kg === null) return adultAge(age) !== null || Number(age) > RULES.numbers.ageEstimate.adultUpToAge ? { adult: true } : null;\n  const band = childBand(kg);\n  if (!band) return { adult: true };\n  const [first, second] = band.ettSizesMm;\n  const sizes = second === undefined ? first : wording('tubeSizeOr', { first, second });\n  return { size: wording('tubeSizeBand', { sizes }), length: wording('tubeLengthBand', { cm: band.ettLengthCm }) };\n}\n\n";
const OLD_TUBE_SECTION = "/* ---------- Guidance-tab references (RSI doses, tube formulae) ---------- */\n\nconst roundTo = (value, decimals) => Math.round(value * 10 ** decimals) / 10 ** decimals;\n\n";
const NEW_TUBE_SECTION = "/* ---------- Guidance-tab references (RSI doses, tube sizes) ---------- */\n\n";
const OLD_TUBE_SHEET_TOP = "/* Reference pop-up opened from Guidance (RSI doses, tube sizes), calculated from weight or age. */\nexport function referenceSheet(type) {\n  const w = Number(st.s.weight),\n    age = st.s.age === '' ? null : Number(st.s.age);\n";
const NEW_TUBE_SHEET_TOP = "/* Reference pop-up opened from Guidance (RSI doses, tube sizes), looked up from weight or age. */\nexport function referenceSheet(type) {\n  const w = Number(st.s.weight);\n";
const OLD_TUBE_SHEET = "  const tube = R.tubeReference(age); // rule: engine tubeReference\n  const igelRanges = R.RULES.equipment.igelRanges\n    .map((r) => (r.maxKg === null\n      ? T('referenceSheets.igelRangeAndAbove', { size: r.size, min: r.minKg })\n      : T('referenceSheets.igelRange', { size: r.size, min: r.minKg, max: r.maxKg }))).join(' · ');\n  const tubeReference = tube\n    ? `<p><b>${T('referenceSheets.cuffedEtt')}</b> ${tube.size}</p><p><b>${T('referenceSheets.lengthAtLips')}</b> ${tube.length}</p>`\n    : paras('tubeNoAge');\n";
const NEW_TUBE_SHEET = "  const tube = R.tubeReference(st.s.weight, st.s.age); // rule: engine tubeReference (A18: band table, weight first)\n  const igelRanges = R.RULES.equipment.igelRanges\n    .map((r) => (r.maxKg === null\n      ? T('referenceSheets.igelRangeAndAbove', { size: r.size, min: r.minKg })\n      : T('referenceSheets.igelRange', { size: r.size, min: r.minKg, max: r.maxKg }))).join(' · ');\n  const tubeReference = !tube\n    ? paras('tubeNoAge')\n    : tube.adult\n      ? paras('tubeAdult')\n      : `<p><b>${T('referenceSheets.cuffedEtt')}</b> ${tube.size}</p><p><b>${T('referenceSheets.lengthAtLips')}</b> ${tube.length}</p>`;\n";
const OLD_TUBE_FORMULAE = {"showUpToAge": 14, "underOneSizeMinMm": 3, "underOneSizeMaxMm": 4, "underOneLengthTimesSize": 3, "sizeAgeDivisor": 4, "sizeAddMm": 3.5, "lengthAgeDivisor": 2, "lengthAddCm": 12, "displayDecimals": 1};
/* A12: the EAS 9.3 dose summary tables (cpg-rsi.pdf page 2), one row per column. */
const column = (columnKg, fentanylMcg, ketamineMg, reducedKetamineMg, blockerMg) => ({ columnKg, fentanylMcg, ketamineMg, reducedKetamineMg, blockerMg });
const RSI_TABLES = {
  paediatric: [column(10, 20, 20, 10, 20), column(20, 40, 40, 20, 40), column(30, 60, 60, 30, 60), column(40, 80, 80, 40, 80)],
  adult: [column(50, 100, 100, 50, 100), column(60, 120, 120, 60, 100), column(70, 140, 140, 70, 150), column(80, 160, 160, 80, 150),
    column(90, 180, 180, 90, 200), column(100, 200, 200, 100, 200)],
};

export const APPROVED_CHANGES = [
  // A9 (approved 14 Nov 2026): magnesium at the 5 and 10 kg bands reads "Seek clinical advice".
  { row: 'A9', path: 'wording.liveCards.doseClinicalReview', before: 'Dose: clinical review', after: 'Seek clinical advice' },
  { row: 'A9', path: 'wording.liveCards.reviewDose', before: 'Review dose', after: 'Seek clinical advice' },
  { row: 'A9', path: 'wording.magnesiumNoDose', before: 'Dose requires clinical review', after: 'Seek clinical advice' },
  // A10 (approved 14 Nov 2026): a child's second amiodarone dose has no guideline source; the numbers are deleted.
  ...[12.5, 25, 50, 75, 100].map((mg, band) => ({ row: 'A10', path: `numbers.childBands.${band}.amiodaroneSecondMg`, before: mg, after: REMOVED, follows: 'amiodaroneFirstMg' })),
  // A11 (approved 14 Nov 2026): child fluids from the weight band; 20 mL/kg volume from the EAS 7.2 table.
  ...[100, 200, 400, 600, 800].map((ml, band) => ({ row: 'A11', path: `numbers.childBands.${band}.fluidsTableMl`, before: REMOVED, after: ml, follows: 'shockJ' })),
  { row: 'A11', path: 'wording.childFluidBasis', before: '{minPerKg}–{maxPerKg} mL/kg · EAS 3.14', after: 'Child · {band} kg CPG band (rounded up) · {min} mL from the EAS 7.2 table; {maxPerKg} mL/kg × {band} kg = {max} mL (EAS 3.14)' },
  { row: 'A11', path: ['notes', 'numbers.child.fluidsMinMlPerKg'], before: '20-40 mL/kg of the ACTUAL weight (not the band), EAS 3.14', after: "20-40 mL/kg, EAS 3.14. A child uses the weight band (change A11): the lower volume is the band's fluidsTableMl, the upper is fluidsMaxMlPerKg x the band weight" },
  { row: 'A11', path: ['notes', 'numbers.childBands'], before: NOTE_BANDS, after: NOTE_BANDS + ' fluidsTableMl = the 0.9% sodium chloride 20 mL/kg volume from the EAS 7.2 band table (change A11, owner-approved 14 Nov 2026).' },
  // A12 (approved 14 Nov 2026): RSI doses from the EAS 9.3 tables; the tables are added (first, so the frozen JSON
  // keeps a comma after displayDecimals for its removal), the rounding setting they replace is deleted.
  { row: 'A12', path: 'numbers.rsi.tables', before: REMOVED, after: RSI_TABLES, follows: 'displayDecimals', jsonAfter: '"roundAdultToMg": 50\n      },\n      "displayDecimals": 1' },
  { row: 'A12', path: 'numbers.rsi.displayDecimals', before: 1, after: REMOVED, follows: 'blocker' },
  { row: 'A12', path: 'wording.rsiNotRecorded', before: 'calculated references, not recorded administrations', after: 'guideline table references, not recorded administrations' },
  { row: 'A12', path: 'wording.rsiNoDose', before: REMOVED, after: 'Seek clinical advice', follows: 'rsiConditions' },
  { row: 'A12', path: ['notes', 'numbers.rsi'], before: "RSI dose references (EAS 9.3), shown on the Guidance tab from the EXACT entered weight (not the band). Each dose = weight x perKg, capped at max. Above the adult threshold (weight.adultAboveKg) the blocker is first rounded to the nearest roundAdultToMg. Shown to displayDecimals places.", after: "RSI dose references (EAS 9.3), shown on the Guidance tab. Change A12 (owner-approved 14 Nov 2026): the doses are looked up in the EAS 9.3 dose summary tables (tables.paediatric and tables.adult, cpg-rsi.pdf page 2), not calculated. A child (weight.adultAboveKg or less) uses the column of its weight band, rounded up; the 5 kg band has no column, so the pop-up shows \"Seek clinical advice\" (decision 7 rule 3). An adult uses the first adult column at or above the weight (rounded up to the next 10 kg); above the last column the last (\"≥ 100 kg\") is used. The per-kg doses, maximums and roundAdultToMg fill the Guidance-tab RSI extract wording only." },
  // A16 (approved 14 Nov 2026, decision 8): weight from age from the EAS 7.2 band table headings; age 14 = adult.
  // New wording is added before the swaps it follows, so each name it follows is still found; notes likewise.
  { row: 'A16', path: 'numbers.ageEstimate', before: OLD_AGE_ESTIMATE, after: NEW_AGE_ESTIMATE },
  { row: 'A16', path: 'wording.estimateAgeAdult', before: REMOVED, after: 'Age {age}: adult. Enter the weight.', follows: 'estimateAgeError' },
  { row: 'A16', path: 'wording.estimateAgeError', before: "Use an infant age in years or whole years 1–{fourteenMaxAge}.", after: "Enter an age from under 1 year to {ageMaxYears} years." },
  { row: 'A16', path: 'wording.weightSheetAgeEstimate', before: "Under 1 year: {underOneYearKg} kg. 1–{tenMaxAge} years: (age + {tenAddYears}) × {tenMultiplyBy}. {fourteenFromAge}–{fourteenMaxAge}: age × {fourteenMultiplyBy}. CPG 7.2; estimates may underestimate. Excludes newborn resuscitation.", after: "Under 1 year: {underOneYearKg} kg. {ageBandList} {adultAges}: adult. Age rounded up to the next whole year. CPG 7.2; estimates may underestimate." },
  { row: 'A16', path: 'wording.ageBandWeight', before: REMOVED, after: '{ages}: {kg} kg.', follows: 'tubeSheetAgeEstimate' },
  { row: 'A16', path: 'wording.ageOneYear', before: REMOVED, after: '{age} year', follows: 'ageBandWeight' },
  { row: 'A16', path: 'wording.ageManyYears', before: REMOVED, after: '{age} years', follows: 'ageOneYear' },
  { row: 'A16', path: 'wording.ageYearRange', before: REMOVED, after: '{from}–{to} years', follows: 'ageManyYears' },
  { row: 'A16', path: 'wording.tubeSheetAgeEstimate', before: "Under 1 year: {underOneYearKg} kg. Ages 1–{tenMaxAge}: (age + {tenAddYears}) × {tenMultiplyBy} kg. Ages {fourteenFromAge}–{fourteenMaxAge}: age × {fourteenMultiplyBy} kg. Estimates may underestimate actual weight.", after: "Under 1 year: {underOneYearKg} kg. {ageBandList} {adultAges}: adult. Age rounded up to the next whole year. CPG 7.2; estimates may underestimate." },
  { row: 'A16', path: ['notes', 'numbers.ageEstimate'], before: "Paediatric weight estimate from age, in years (EAS 7.2). Ages outside these rules give no estimate.", after: "Paediatric weight estimate from age, in years, from the EAS 7.2 band table headings (cpg-paediatric-equipment.pdf pages 5-15; change A16, owner-approved 14 Nov 2026). An age of 1 year or more is ROUNDED UP to the next whole year first. Ages of 0 or less, or above adultUpToAge, give no estimate." },
  { row: 'A16', path: ['notes', 'numbers.ageEstimate.bands'], before: REMOVED, after: "Rounded-up age up to maxAge (and above the previous row) gives weightKg, the band weight: 1 year 10 kg, 2-5 years 20 kg, 6-10 years 30 kg, 11-13 years 40 kg", follows: 'numbers.ageEstimate.elevenToFourteenYears' },
  { row: 'A16', path: ['notes', 'numbers.ageEstimate.adultUpToAge'], before: REMOVED, after: "a rounded-up age above the last band and up to this age is treated as adult (owner decision 8: age 14 = adult): no weight is filled and the weight must be entered", follows: 'numbers.ageEstimate.bands' },
  { row: 'A16', path: ['notes', 'numbers.ageEstimate.elevenToFourteenYears'], before: "age x 3, whole years only", after: REMOVED, follows: 'numbers.ageEstimate.oneToTenYears' },
  { row: 'A16', path: ['notes', 'numbers.ageEstimate.oneToTenYears'], before: "(age + 4) x 2, whole years only", after: REMOVED, follows: 'numbers.ageEstimate.underOneYearKg' },
  // A18 (approved 14 Nov 2026, decision 8): ETT size and length at lips from the EAS 7.2 band tables (weight band,
  // or the band from age); the page 1 age formula (numbers.tubes) and its wording are deleted.
  ...[[[3], 9], [[3, 4], 12], [[4, 5], 15], [[5, 6], 17], [[6, 7], 19]].map(([sizes, cm], band) => [
    { row: 'A18', path: `numbers.childBands.${band}.ettSizesMm`, before: REMOVED, after: sizes, follows: 'fluidsTableMl' },
    { row: 'A18', path: `numbers.childBands.${band}.ettLengthCm`, before: REMOVED, after: cm, follows: 'ettSizesMm' },
  ]).flat(),
  { row: 'A18', path: 'numbers.tubes', before: OLD_TUBE_FORMULAE, after: REMOVED, follows: 'rsi' },
  { row: 'A18', path: 'wording.tubeAdult', before: REMOVED, after: 'Not shown for adults (over {adultAboveKg} kg or {adultAges}).', follows: 'tubeNoAge' },
  { row: 'A18', path: 'wording.tubeNoAge', before: "Enter age to show the paediatric ETT and length-at-lips formula results.", after: 'Enter weight or age to show the paediatric ETT size and length at lips.' },
  { row: 'A18', path: 'wording.tubeCaution', before: "Paediatric formulae are guides; confirm actual fit. Not a weight-only adult tube-size recommendation.", after: 'Children may need a different ETT size or length at lips than the table shows; confirm actual fit.' },
  { row: 'A18', path: 'wording.tubeSizeBand', before: REMOVED, after: '{sizes} mm', follows: 'tubeCaution' },
  { row: 'A18', path: 'wording.tubeSizeOr', before: REMOVED, after: '{first} or {second}', follows: 'tubeSizeBand' },
  { row: 'A18', path: 'wording.tubeLengthBand', before: REMOVED, after: '{cm} cm', follows: 'tubeSizeOr' },
  { row: 'A18', path: 'wording.tubeLengthFormula', before: "{cm} cm (formula)", after: REMOVED, follows: 'tubeSizeFormula' },
  { row: 'A18', path: 'wording.tubeSizeFormula', before: "{mm} mm (formula)", after: REMOVED, follows: 'tubeLengthUnderOne' },
  { row: 'A18', path: 'wording.tubeLengthUnderOne', before: "ETT size × {timesSize} cm", after: REMOVED, follows: 'tubeSizeUnderOne' },
  { row: 'A18', path: 'wording.tubeSizeUnderOne', before: "{minMm}–{maxMm} mm", after: REMOVED, follows: 'igelSourceCaption' },
  { row: 'A18', path: ['notes', 'numbers.childBands'], before: "Child weight bands (EAS 7.2). A child's weight is ROUNDED UP to the next band (e.g. 15 kg uses the 20 kg row). magnesiumMmol null = no dose listed: seek clinical advice. shockJ = 4 J/kg of the band, from change A1 (owner-approved 3 Nov 2026). fluidsTableMl = the 0.9% sodium chloride 20 mL/kg volume from the EAS 7.2 band table (change A11, owner-approved 14 Nov 2026).", after: "Child weight bands (EAS 7.2). A child's weight is ROUNDED UP to the next band (e.g. 15 kg uses the 20 kg row). magnesiumMmol null = no dose listed: seek clinical advice. shockJ = 4 J/kg of the band, from change A1 (owner-approved 3 Nov 2026). fluidsTableMl = the 0.9% sodium chloride 20 mL/kg volume from the EAS 7.2 band table (change A11, owner-approved 14 Nov 2026). ettSizesMm and ettLengthCm = the cuffed ETT size(s) and length at lips from the EAS 7.2 band table (change A18, owner-approved 14 Nov 2026), shown in the Tube sizes pop-up." },
  { row: 'A18', path: ['notes', 'numbers.tubes'], before: "Paediatric tube formulae (shown on the Guidance tab from age in years, up to showUpToAge). Under 1 year: a fixed size range, length = size x underOneLengthTimesSize. Otherwise: size = age / sizeAgeDivisor + sizeAddMm; length = age / lengthAgeDivisor + lengthAddCm.", after: REMOVED, follows: "numbers.rsi.blocker" },
  { row: 'A18', path: ['notes', 'wording.tubeSizeBand'], before: REMOVED, after: "Tube sheet results (change A18): sizes and length come from the band row (numbers.childBands, ettSizesMm and ettLengthCm); two sizes are joined by tubeSizeOr", follows: 'wording.tubeSizeUnderOne' },
  { row: 'A18', path: ['notes', 'wording.tubeSizeUnderOne'], before: "Tube sheet results; gaps come from numbers.tubes", after: REMOVED, follows: "wording.rsiNotRecorded" },
];

/* The exact code edits of approved rows: file, code before, code after (each "after" must occur once). */
export const CODE_CHANGES = [
  { row: 'A10', file: 'src/engine/core.js', before: '    amio2: band.amiodaroneSecondMg,\n', after: '    amio2: null, // A10: no guideline source for a child\'s second dose\n' },
  { row: 'A10', file: 'src/app/views.js', before: '', after: "  else if (doseReference && value === null) doseText = ''; // A10: a child's second dose has no number (two doses recorded: empty line)\n" },
  { row: 'A11', file: 'src/engine/rhythm-care.js', before: OLD_FLUIDS, after: NEW_FLUIDS },
  { row: 'A12', file: 'src/engine/core.js', before: OLD_RSI_CODE, after: NEW_RSI_CODE },
  { row: 'A12', file: 'src/app/views.js', before: OLD_RSI_SHEET, after: NEW_RSI_SHEET },
  { row: 'A16', file: 'src/engine/core.js', before: OLD_AGE_CODE, after: NEW_AGE_CODE },
  { row: 'A16', file: 'src/app/events.js', before: OLD_AGE_EVENT, after: NEW_AGE_EVENT },
  { row: 'A16', file: 'src/app/sheets.js', before: 'max="${R.RULES.numbers.ageEstimate.elevenToFourteenYears.maxAge}"', after: 'max="${R.RULES.numbers.ageEstimate.adultUpToAge}"' },
  { row: 'A18', file: 'src/engine/core.js', before: OLD_TUBE_CODE, after: NEW_TUBE_CODE },
  { row: 'A18', file: 'src/engine/core.js', before: OLD_TUBE_SECTION, after: NEW_TUBE_SECTION },
  { row: 'A18', file: 'src/app/views.js', before: OLD_TUBE_SHEET_TOP, after: NEW_TUBE_SHEET_TOP },
  { row: 'A18', file: 'src/app/views.js', before: OLD_TUBE_SHEET, after: NEW_TUBE_SHEET },
];

/* Put a value back into a group directly after the name it followed (keeps the order of names). */
function insertAfter(group, follows, name, value) {
  const entries = Object.entries(group);
  const at = entries.findIndex(([key]) => key === follows);
  assert.ok(at >= 0, `cannot put ${name} back: ${follows} is missing`);
  entries.splice(at + 1, 0, [name, value]);
  for (const key of Object.keys(group)) delete group[key];
  Object.assign(group, Object.fromEntries(entries));
}

/* The group holding a dotted place and the last name, or null when the place is not in this tree
   (each frozen copy holds only some places: the v22 baseline has no liveCards, for example). */
const namesOf = (place) => (Array.isArray(place) ? place : place.split('.'));
const shown = (place) => (Array.isArray(place) ? place.join(' › ') : place);

function placeIn(tree, dotted, mustHoldName = true) {
  const names = namesOf(dotted);
  let group = tree;
  for (const name of names.slice(0, -1)) {
    if (group === null || typeof group !== 'object' || !Object.hasOwn(group, name)) return null;
    group = group[name];
  }
  const last = names.at(-1);
  if (group === null || typeof group !== 'object') return null;
  return !mustHoldName || Object.hasOwn(group, last) ? { group, last } : null;
}

/* A copy of a rule-set tree (or a whole rules file) with every approved change made where the place
   exists. direction 'forward' = before -> after (frozen copy as it should be now); 'undo' = after -> before
   (today's file with the approved changes taken out, to compare with recordings that store only
   fingerprints of screens). Fails if a place holds an unexpected value. */
export function withApprovedChanges(tree, direction = 'forward') {
  const copy = structuredClone(tree);
  // Undo goes newest first (A18 changes a note A11 changed). So a chain of deletions is listed last-deleted
  // first: undoing puts the first one back first, and each later one finds the name it follows.
  for (const change of direction === 'undo' ? [...APPROVED_CHANGES].reverse() : APPROVED_CHANGES) {
    const [from, to] = direction === 'undo' ? [change.after, change.before] : [change.before, change.after];
    const place = placeIn(copy, change.path, from !== REMOVED);
    if (!place) continue;
    if (from === REMOVED) {
      // undoing a deletion: the place must be empty, then the value goes back after the name it followed
      if (!Object.hasOwn(place.group, change.follows)) continue; // this copy does not hold that group
      assert.ok(!Object.hasOwn(place.group, place.last), `${change.row} ${shown(change.path)}: expected no value, found ${JSON.stringify(place.group[place.last])}`);
      insertAfter(place.group, change.follows, place.last, structuredClone(to));
      continue;
    }
    assert.ok(isDeepStrictEqual(place.group[place.last], from), `${change.row} ${shown(change.path)}: expected ${JSON.stringify(from)}, found ${JSON.stringify(place.group[place.last])}`);
    if (to === REMOVED) delete place.group[place.last];
    else place.group[place.last] = structuredClone(to);
  }
  return copy;
}

/* The same swaps on a flat map of dotted place -> value (tests/baseline/stage2-additions.json). */
export function withApprovedChangesFlat(map) {
  const copy = { ...map };
  for (const change of APPROVED_CHANGES) {
    if (Array.isArray(change.path) || !Object.hasOwn(copy, change.path)) continue;
    assert.ok(isDeepStrictEqual(copy[change.path], change.before), `${change.row} ${shown(change.path)}: expected ${JSON.stringify(change.before)}, found ${JSON.stringify(copy[change.path])}`);
    if (change.after === REMOVED) delete copy[change.path];
    else copy[change.path] = change.after;
  }
  return copy;
}

const isObject = (v) => v !== null && typeof v === 'object';
/* A value written as the frozen JSON file writes it: two spaces per level, starting at the indent of its line. */
const pretty = (value, indent) => JSON.stringify(value, null, 2).split('\n').join(`\n${indent}`);

/* The same swaps on the TEXT of the frozen JSON file (tests/baseline/nz-eas-before-yaml.json), keeping its
   layout, for tests that edit that text. Each swap must match exactly one line, and the result must read as
   exactly withApprovedChanges of the original. */
export function withApprovedChangesInJsonText(text) {
  let result = text;
  for (const change of APPROVED_CHANGES) {
    const key = namesOf(change.path).at(-1);
    const escape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (change.before === REMOVED && change.jsonAfter) {
      // a new group or list (A12): one line straight after the exact text given, at the indent of its last line
      assert.equal(result.split(change.jsonAfter).length - 1, 1, `${change.row} ${shown(change.path)}: the text after which it goes must appear exactly once`);
      const indent = change.jsonAfter.slice(change.jsonAfter.lastIndexOf('\n') + 1).match(/^ */)[0];
      result = result.replace(change.jsonAfter, () => `${change.jsonAfter},\n${indent}"${key}": ${JSON.stringify(change.after)}`);
      continue;
    }
    if (change.before === REMOVED) {
      // a new value: put its line straight after the line of the value it follows, in the same group
      // (the value it follows is read from the text as changed so far, so one new value may follow another: A16)
      const names = namesOf(change.path), group = names.slice(0, -1).reduce((node, name) => node[name], JSON.parse(result));
      const after = `"${change.follows}": ${JSON.stringify(group[change.follows])}`;
      const line = new RegExp(`(\\n[ ]*)${escape(after)}(,?)(?=\\n)`, 'g');
      assert.equal((result.match(line) || []).length, 1, `${change.row} ${shown(change.path)}: the line "${after}" must appear exactly once`);
      result = result.replace(line, (all, indent, comma) => `${indent}${after},${indent}"${key}": ${JSON.stringify(change.after)}${comma}`);
      continue;
    }
    if (isObject(change.before) && change.after !== REMOVED) {
      // a whole group swapped for another (A16): the group is written over several lines, indented as in the file
      const at = [...result.matchAll(new RegExp(`\\n( *)"${escape(key)}": `, 'g'))]
        .filter((m) => result.startsWith(pretty(change.before, m[1]), m.index + m[0].length));
      assert.equal(at.length, 1, `${change.row} ${shown(change.path)}: the group must appear exactly once`);
      const [m] = at, start = m.index + m[0].length;
      result = result.slice(0, start) + pretty(change.after, m[1]) + result.slice(start + pretty(change.before, m[1]).length);
      continue;
    }
    if (isObject(change.before) && change.after === REMOVED) {
      // a whole group deleted (A18): its lines and comma go; the group is never the last in its own group here
      const at = [...result.matchAll(new RegExp(`\\n( *)"${escape(key)}": `, 'g'))]
        .filter((m) => result.startsWith(pretty(change.before, m[1]) + ',', m.index + m[0].length));
      assert.equal(at.length, 1, `${change.row} ${shown(change.path)}: the group must appear exactly once`);
      const [m] = at;
      result = result.slice(0, m.index) + result.slice(m.index + m[0].length + pretty(change.before, m[1]).length + 1);
      continue;
    }
    const find = `"${key}": ${JSON.stringify(change.before)}`;
    if (change.after === REMOVED) {
      // delete the whole line (with its comma); the value is never the last in its group here
      const line = new RegExp(`\\n[ ]*${escape(find)},(?=\\n)`, 'g');
      assert.equal((result.match(line) || []).length, 1, `${change.row} ${shown(change.path)}: the line "${find}," must appear exactly once`);
      result = result.replace(line, '');
      continue;
    }
    assert.equal(result.split(find).length - 1, 1, `${change.row} ${shown(change.path)}: "${find}" must appear exactly once`);
    result = result.replace(find, `"${key}": ${JSON.stringify(change.after)}`);
  }
  assert.deepStrictEqual(JSON.parse(result), withApprovedChanges(JSON.parse(text)));
  return result;
}

/* A temporary copy of the app (index.html and src/) whose rules file has every approved change taken out
   again. Used where the reference stores only fingerprints of screens (tests/golden/step3a-v21-output.json):
   this copy must still give exactly the recorded screens, which proves nothing else changed. Returns the
   folder; the caller removes it. */
export function appWithApprovedChangesUndone(root) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pocket-resus-undone-'));
  cpSync(path.join(root, 'index.html'), path.join(dir, 'index.html'));
  cpSync(path.join(root, 'src'), path.join(dir, 'src'), { recursive: true });
  mkdirSync(path.join(dir, 'tests', 'helpers'), { recursive: true }); // where test entry files are built from
  const file = path.join(dir, 'src', 'rules', 'nz-eas.yaml');
  const undone = withApprovedChanges(readYamlStrict(readFileSync(file, 'utf8')), 'undo');
  writeFileSync(file, rulesFileText(undone));
  for (const change of [...CODE_CHANGES].reverse()) { // newest first, as for the values
    const where = path.join(dir, change.file), code = readFileSync(where, 'utf8');
    const find = change.after;
    assert.equal(code.split(find).length - 1, 1, `${change.row} ${change.file}: the approved code must appear exactly once`);
    writeFileSync(where, code.replace(find, change.before));
  }
  return dir;
}
