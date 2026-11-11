# 18. Rules editor design (doc 07, step 3)

Design only; no code yet. Decisions are added here as the owner makes them, one at a time.

## Goal
Rules can be updated, and new rule sets made for other services, without touching code.
Must have: plain data in; checks that block impossible values; a "what changed" view against
the current rule set; automatic tests run for each rule set; owner approval before a rule set
goes live.

## Decisions
| # | Date | Decision |
|---|---|---|
| 1 | 12 Nov 2026 | **One rule set per service holds everything** (numbers AND guideline text), approved together as one package (Option A). **Before any editor is built**, every remaining rule and guideline extract is moved out of the app code into the rule set and clearly partitioned (step 3a below). |
| 2 | 12 Nov 2026 | **Five parts, divided by kind, each with its own checks** (Option A): 1 clinical numbers and rules; 2 clinical wording; 3 checklists and reversible causes; 4 equipment; 5 sources. Each number is stored once; text gets numbers only through `{gaps}`. |

## Step 3a: gather and partition (before the editor)
Found 12 Nov 2026: these clinical numbers and guideline texts are still in the app code, not in
`src/rules/nz-eas.js`. Each move follows the usual rule: no value or wording changes; old and new
must give identical output (tests prove it).

**Clinical numbers still in code**
- RSI doses (`views.js` `referenceSheet`): fentanyl, ketamine, rocuronium/suxamethonium 2 mg/kg
  max 200; reduced ketamine 1 mg/kg max 200; blocker rounded to nearest 50 mg above 40 kg.
- Tube formulae (`views.js`): under 1 year 3–4 mm and ETT × 3 cm; otherwise age/4 + 3.5 mm and
  age/2 + 12 cm; shown up to age 14.
- iGel weight ranges (`views.js`, text only).
- Recordable energy 1–1000 J typed directly in `session.js` and `sheets.js` (the rules file
  already has `shock.maxRecordableJ`; the code does not use it there).

**Guideline text that restates rules-file numbers** (could drift from the numbers)
- Guidance & sources pop-up (`views.js` `guidance`): cycle, adrenaline, amiodarone 3 and 6,
  bands, 4 J/kg, 200 J, RSI summary.
- Drug pop-ups (`sheets.js`): adrenaline every 4 min and child dilution; amiodarone 3/6 shocks;
  magnesium 10 mmol (2.5 g), 1–2 min, preparation; fluids 1–2 L or 20–40 mL/kg.
- Age-estimate captions (`sheets.js` weight sheet, `views.js` tube sheet).
- Pads prompt "100 J or less" (`sheets.js`).

**Guideline text only** (`data.js`)
- Checklists (`ARREST_CHECKLISTS`, 4 lists), reversible causes (`CAUSES`, 4 Hs / 4 Ts),
  equipment and sizes (`ARREST_EQUIPMENT`), access sites (`ARREST_SITES`), device colours
  (`COLOURS`), guideline links (`CARDIAC_CPG`, `MAGNESIUM_CPG`, PDF links in `views.js`).

**Not clinical (stays in code):** Explain-me tutorial slides, layout, timers' display formatting.

## The five parts (decision 2)
| Part | Holds | Checks (built with the editor) |
|---|---|---|
| 1 Clinical numbers and rules | bands, doses, energies, timings, lower-card and amiodarone rules, A5 locks, recordable limits, age estimate, RSI, tube formulae | strict: type, range, order, units; impossible values blocked |
| 2 Clinical wording | every sentence about a drug or decision: drug pop-ups, Guidance pop-up, captions, pads prompt, basis lines | not empty; any number is a `{gap}` filled from part 1 |
| 3 Checklists and causes | 4 checklists, 4 Hs / 4 Ts | no empty items, unique IDs |
| 4 Equipment | device types, sizes, access sites, iGel ranges, colours | sizes ordered, valid colours, iGel ranges with no gaps |
| 5 Sources | guideline name, export date, PDF files, web links | every PDF exists in the app, links well-formed |

## Step 3a plan: partition and correct the code (do in this order)
Rules for every sub-step: run all tests before and after; no value or wording changes; the app's
output must be identical to v21 (proved by test); one commit per sub-step on `rules-editor`.

0. **Safety net first.** Check which screens and pop-ups the existing DOM test
   (`tests/dom-golden.test.mjs`) already covers. For any it misses (likely RSI and tube sheets,
   Guidance pop-up, drug pop-ups, checklists, equipment sheets), add a new test that records
   the v21 output across a range of weights (none, 3, 5, 15, 25, 42, 80 kg, invalid) and ages
   (none, 0.5, 1, 7, 14, 15) and then must match it exactly. Existing golden files are not edited.
1. **Lay out the five parts in the rules file.** Move the current contents of `nz-eas.js` under
   part 1 (numbers) and part 2 (wording); update the engine and tests to the new places only
   (same values; `rules-file.test.mjs` keeps checking every value against the guideline).
2. **Correct code that bypasses the rules file:** the typed-in 1000 J limit (`session.js`,
   `sheets.js`) uses `shock.maxRecordableJ`; the typed-in age-estimate captions are built from
   `ageEstimate`.
3. **Part 1 additions:** RSI doses and tube formulae become data in the rules file, calculated by
   a small engine function (same results; a test compares old and new for many weights and ages).
4. **Part 2:** move the drug pop-up, Guidance pop-up, caption and pads-prompt wording into the
   rules file, replacing each number with a `{gap}` filled from part 1.
5. **Part 3:** move `ARREST_CHECKLISTS` and `CAUSES`.
6. **Part 4:** move `ARREST_EQUIPMENT`, `ARREST_SITES`, `COLOURS`, iGel ranges.
7. **Part 5:** move guideline name, export date, PDF and web links.
8. **Lock it in:** a new test fails if a clinical number or guideline sentence reappears in
   `src/app` or `src/engine` outside the rules file; every `{gap}` is checked to be filled.
9. **Owner check:** phone check of a preview, then owner approval to push to `main` as v22.

## Editor decisions still to make (after 3a)
- File format for a rule set (keep JavaScript data, or plain JSON that any tool can open).
- Where the editor runs and who can use it.
- How the "what changed" view is shown and how owner approval is recorded.
- How a rule set goes live and how the app chooses a service's rule set.
- How the automatic tests apply to a new service's rule set (which tests are NZ-EAS-specific).
