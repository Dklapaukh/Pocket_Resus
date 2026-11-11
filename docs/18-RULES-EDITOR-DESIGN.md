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

Partition layout: to be decided (decision 2).
