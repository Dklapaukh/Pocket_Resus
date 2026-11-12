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
| 2 | 12 Nov 2026 | Typed-in 1000 J (`session.js`, two `sheets.js` fields) now uses `shock.maxRecordableJ`; age-estimate captions (weight and tube sheets) and the age box limit built from `ageEstimate` (new engine helper `ageEstimateGaps`); rhythm choices from `rhythms`; Child/Adult label from `adultAboveKg`. Screens identical. 164 tests pass. Left for later: the edit sheet's rhythm lists (different order from the rules lists). |
| 3 | 12 Nov 2026 | RSI doses (`numbers.rsi`) and tube formulae (`numbers.tubes`) are data; engine `rsiDoses` and `tubeReference` calculate them. New test compares them with the v21 formulas for 5,000 weights and 12,000 ages: identical. The blocker's adult rounding uses `weight.adultAboveKg` (40 kg, same number). 167 tests pass. |
| 4 | 12 Nov 2026 | Safety net widened first (now 278 screens, re-recorded from the v21 commit 97db27d: torsades confirm, repeat magnesium, select dose, fluids form, overdue adrenaline). Drug pop-ups, torsades and fluids extracts, Guidance pop-up, RSI and tube sheet text, pads prompts, header energy title, card statuses and the estimate messages moved to `wording`; every number is a `{gap}` filled by engine `wordingGaps` from part 1. Part 1 gained values the wording showed but were not stored: `shock.joulesPerKg`, `weight.adultRoundedToKg`, `magnesium.maxDoses`, `products` (0.9% sodium chloride), `preparation` (adrenaline dilution, magnesium preparation). The typed-in limit of 2 doses (magnesium, amiodarone) now comes from the rules. Screens identical. 169 tests pass. |
| 5 | 12 Nov 2026 | Checklists (`checklists.lists`) and 4 Hs / 4 Ts (`checklists.causes`) moved from `data.js` into part 3. New test: both equal v21 exactly (fixture from v21 `data.js`) and the checklists still equal the original app; first part 3 checks (no empty items, unique ids). Screens identical. 172 tests pass. |
| 6 | 12 Nov 2026 | Part 4 filled: `equipment.devices`, `sites`, `colours` (from `data.js`), plus `blades` (laryngoscope choices, from `events.js`), `maxTubeSizeMm` (12) and `igelRanges` (data; the tube sheet builds the same line from it). Tests: equal to v21; colours valid and for listed sizes; iGel ranges ordered with no gaps. Screens identical. 175 tests pass. |
| 7 | 12 Nov 2026 | Part 5 filled: guideline name, export date, ANZCOR and iGel source names, and each linked guideline's EAS code, label, PDF and web page (`sources.guidelines`), plus the Guidance pop-up link order. `data.js` now holds only the tutorial slides. Tests: links equal v21; every PDF exists and is in the offline list. Screens identical. 177 tests pass. Checklists keep their own `code`/`pdf` in part 3 (also checked). |
| 8 | 12 Nov 2026 | Lock-in test `tests/step3a-lock-in.test.mjs`: fails if a clinical number with its unit, a guideline link/PDF/EAS number, or any rules-file sentence (wording, checklist item, cause prompt) is typed into `src/app` or `src/engine` (comments ignored); every `{gap}` must be filled from parts 1/5 or by the app where listed; spot checks that the filled wording reads exactly as v21. Shown to catch a planted "2 mg/kg". 182 tests pass. **Step 3a done; next is sub-step 9 (owner phone check, then approval to publish as v22).** |
| 9 | 12 Nov 2026 | **Rule set file format: plain JSON** (Option B). `nz-eas.js` becomes `nz-eas.json` with no value or wording change, proved by the existing tests. Not started: waits for the revised plan (decision 10). |
| 10 | 12 Nov 2026 | **Owner's editor scope:** one interface with separate tabs (or similar) for clinical rules and for visual settings, including pop-ups. The owner must be able to edit **any clinically relevant function** without touching code; build new functions where needed. Claude's review: the current plan only makes numbers, wording and lists editable; the logic (which card shows when, amiodarone gate, torsades → magnesium, child advice, pop-up triggers) and visual settings are still fixed in code. **The plan needs re-drafting in a new chat before building** (prompt in doc 07). |
| 11 | 12 Nov 2026 | **Logic becomes editable through menus and rule tables** (Option A): "when" picked from a list of facts, "then" from a list of results, first match wins, last row "otherwise"; no typed formulas. Owner asked how new options get added: see "Adding options" below (decision 13 pending). |
| 12 | 12 Nov 2026 | **Owner goals added.** (a) Long term, these building blocks should become a no-code program / website that turns flowcharts into apps. (b) **Two ways into the editor:** a technical "rules" view for people who like that, and editing from the front end: in an editing view, tap a card (e.g. adrenaline) and see every rule attached to it. (c) Guideline gaps should be added natively through the editor where possible, not typed into code. |
| 13 | 12 Nov 2026 | **New blocks: three levels plus an advanced formula box** (Option B). Safeguards (Claude, not asked): the box is in the Rules view only; it accepts listed facts, numbers, comparisons, and / or / not and simple arithmetic, never code; the checker reads it like any table; it is marked "advanced" in the what-changed view; a rule set cannot be approved unless each formula is covered by at least one scenario test. |
| 14 | 12 Nov 2026 | **Any number of drug cards on the Live screen, layout set by rules** (Option A): a change to the guidelines could easily need more cards. Safeguards: with the two v22 cards the screen must be identical to v22; the checker warns when the cards no longer fit a small phone; owner phone check the first time a third card is used. |
| 15 | 12 Nov 2026 | **Fix the ROSC "Other" mistake now as A8** (Option A), own test, on a branch; live only on the owner's yes. Built on branch `a8-rosc-other`; see doc 07. |
| 16 | 12 Nov 2026 | **Named situations as data** (Option A), replacing the single switch; built empty first (identical to v22), then filled one approved item at a time. |
| 17 | 12 Nov 2026 | **Guideline gaps become candidates added through the editor** (Option A), each approved and tested separately. Owner removed G4, G5, G6, G7, G8, G9 and G12, and from G11 any situation that is only a 15:2 ratio. |
| 18 | 12 Nov 2026 | **Strict limits** (Option A): impossible values blocked; a large change needs a typed confirmation; every clinical change needs a reason and a source. Owner: changes can be made by **any approved person, who is by definition an "editor"**; the future program will not be clinically focused, so the role is named generally. Until there are accounts (decision 20), the approval record holds the editor's typed name and going live still passes through GitHub. |
| 19 | 12 Nov 2026 | **Scenario tests are recorded by tapping through the preview** (Option B), saved as form steps that can be edited later. |
| 20 | 12 Nov 2026 | **Editor is a separate page of the same site** (Option A): works offline in the browser, no logins, saves a rule-set file that goes live through GitHub after the checks. |
| 21 | 12 Nov 2026 | **One rule set built into each published version** (Option A); version name on screen; nothing changes silently. |
| 22 | 12 Nov 2026 | **Appearance: Option A now** (colours, text sizes, card order, pop-up style, labels, icons, with contrast and size checks). Free layout (Option B) is wanted for the future program, so appearance settings must be built so B can be added later. |
| 23 | 12 Nov 2026 | **Five tabs:** App view, Rules, Appearance, Tests, Publish (Option A). |
| 24 | 12 Nov 2026 | **Build the Pocket Resus editor with general blocks** that can become the platform later (Option A). |
| 25 | 12 Nov 2026 | **Few owner checkpoints** (Option A): the owner is not technical; stop only when the owner's input really helps (phone checks after screen-changing stages, clinical approvals, anything going to `main`). |
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

## Step 3a progress (branch `rules-editor`)
| Sub-step | Date | Result |
|---|---|---|
| 0 | 12 Nov 2026 | Safety net added: `tests/step3a-output-unchanged.test.mjs` records 192 screens and pop-ups from v21 (8 weights, 9 tube ages, 9 estimate ages, checklists, causes, equipment) and must match exactly. Found: the "Guidance & sources" pop-up (`views.js` `guidance`) is not opened by any button in v21 (the menu button opens the Guidance tab); it is covered through a test-only hook. 163 tests pass. |
| 1 | 12 Nov 2026 | `nz-eas.js` laid out in five parts: `numbers`, `wording`, `checklists`, `equipment`, `sources` (parts 3 and 4 empty until sub-steps 5 and 6). Engine, app and tests read `RULES.numbers.…`; no value changed. New test pins the five parts. 164 tests pass. |
| 2–8 | 12 Nov 2026 | See decisions 2–8 above. |
| 9 | 12 Nov 2026 | Owner chose: publish to `main` as v22 now (new cache `resus-pocket-v22-rules-file`), then phone-check the live app; if anything looks wrong, Claude puts v21 back with one commit. Published; cache-name pins updated in `modules` and `service-worker-offline` tests. 182 tests pass. Phone check pending. |

**Noted during 3a, left as they are (not guideline content, or for a later decision):** the
"Guidance & sources" pop-up is not opened by any button in v21; the edit sheet's rhythm lists;
input checks that are not guideline values (age 0–120, earlier counts 0–100); timer display
thresholds (yellow at 15 s, adrenaline highlight 30 s before review); checklist `code`/`pdf` stay
with each checklist in part 3; the tutorial slides (`data.js`).

## Inventory: clinically relevant behaviour still fixed in code (12 Nov 2026, v22)
Read from `src/engine` and `src/app`. Numbers, sentences, checklists, equipment lists and sources
are already data. What is listed here is **behaviour**: it can only be changed by a programmer.

**A. Which drug card shows, and when (Live screen)**
1. Two card slots only: adrenaline always on top; the lower slot is fluids, amiodarone or magnesium.
   Only these four medicines can have a card; a new one (or a third slot) needs code.
2. Lower slot choice: the latest recorded rhythm that is in either rhythm list decides (shock,
   no-shock, rhythm entry or ROSC events count; rhythms in neither list are ignored). The two lists
   are data; the method is code.
3. Torsades rule: once torsades is the current rhythm or on any non-voided event, magnesium replaces
   amiodarone for the rest of the case and amiodarone is withheld. "Torsades" is named in code.
4. Amiodarone due: shock counts (3, 6) are data. Fixed in code: earlier and "previous" shocks count;
   the case must be running; not in special-situation mode; torsades never recorded; the current
   rhythm is ignored.
5. Amiodarone card visibility (A2): grey "not yet due" tile until a dose is first due; once shown it
   stays for that patient, and always shows once a dose is recorded. The "has appeared" memory is
   not saved, so it is forgotten if the app reloads.
6. Second amiodarone dose: adult before the 6th shock shows "Due after 6 shocks" and a disabled
   button. Child with one dose shows "Seek clinical advice" and no number (C6b); before the 6th
   shock a "Select dose" button opens a type-in form (C6b-2); from the 6th shock the button is disabled.
7. Order of precedence when several of these are true at once (which dose text and which button
   label wins) is a fixed list in code.
8. Adrenaline card: always shown, no maximum number of doses, not linked to rhythm or cycle count.
   Record button works when a dose reference exists, not special situation, not ROSC/ended, not locked.
9. Magnesium card: one tap records the first dose; a second dose needs the "Repeat magnesium?"
   confirmation; no dose listed for the band (5 and 10 kg) gives "Dose: clinical review" and a
   disabled button.
10. Fluids card: never records a suggested volume; the button opens a type-in form. Status names the
    rhythm (PEA, Asystole or Other; anything else is shown as "PEA") or the total mL recorded
    (only entries in mL are added up).
11. Special situation switch: turns off every routine dose prompt and one-tap record button
    ("Manual review"); "Other…" manual entry still works. What it turns off, and its caption
    (trauma, hypothermia, pregnancy, toxins), are in code.
12. After ROSC or session end: cards are disabled ("ROSC recorded" / "Session ended"); the Post ROSC
    checklist opens by itself on ROSC and a Post ROSC button appears on the Live screen.
13. Double-tap locks: times are data. Fixed in code: only adrenaline is greyed out while locked;
    amiodarone has no lock.

**B. Pop-ups and prompts: which appear, when, and what is in them**
14. "Confirm Torsades" appears only when torsades is chosen after a shock.
15. "Fluid guidance" appears after saving a rhythm from the fluids list (list is data; the pop-up,
    its title and "Continue CPR" button are code).
16. "Repeat magnesium?" before a second dose; amiodarone-after-torsades warning in the manual form.
17. Paediatric pads prompt: the 100 J threshold is data; where it shows (header and weight pop-up)
    and that it uses two different wordings are code.
18. Arrest checklist reminder (button highlight): cycle running, at least 1 min 30 s left (data),
    and adrenaline already given (code).
19. Administration pop-ups: which paragraphs, dose line, links and footer each one contains, and
    that a child's amiodarone pop-up says "second dose: seek clinical advice", are code.
20. The "Guidance & sources" pop-up cannot be opened by any button.

**C. How doses and energies are worked out** (numbers are data; the method is code)
21. No weight entered = adult; 40 kg or less = child; child weight rounded up to the next band.
22. Shock energy = the band's energy, else adult; no weight pre-fills the adult energy; "est." tag
    (this depends on the estimate wording starting with the word "Estimated").
23. Child fluids use the actual weight (not the band), with no upper cap.
24. Age-to-weight estimate: shape of the three formulas; whole years only between 1 and 14.
25. RSI: weight × dose per kg, capped; adult blocker rounded to the nearest 50 mg; uses exact
    weight. The four rows and their labels ("Fentanyl · conditional", "Ketamine · usual"…) are code.
26. Tube size and length: shape of the formulas; under-1 rule; hidden above 14 years.
27. A valid weight: above 0, up to the maximum, at most one decimal.
28. Units and routes: adrenaline and amiodarone always "mg IV", magnesium "mmol IV", fluids "mL";
    manual form unit list (mg, mcg, mmol, mL, g) and route list (IV, IO, IM, Other).

**D. Cycle, rhythm check and case flow**
29. A rhythm check is offered only when the countdown reaches zero; ROSC can be recorded any time.
30. Three outcomes (Shock, No shock, ROSC). Shock / no shock is recorded first and the next cycle
    starts at once; the rhythm is asked second. ROSC stops the clocks; re-arrest restarts CPR.
31. Timer messages and their times: "30 seconds remaining" (30 s), "Prepare for rhythm check" and
    yellow panel (15 s), "Rhythm check due" with overdue time; adrenaline card highlight from 30 s
    before review.
32. Nothing is ever recorded just because time passed.
33. Counting: earlier counts (0–100), "+ Previous shock", consecutive no-shock streak, earlier
    amiodarone doses.
34. Rhythm names on buttons ("Pulseless VT", "Torsades de pointes") and the rhythm lists on the
    correction form (different order from the data lists) are code.
35. A medicine typed by hand joins the counts and clocks only if its name exactly matches
    adrenaline, amiodarone, magnesium or the fluid name; manual entries are not blocked by the gates.
36. Corrections and voids: state events (start, ROSC, end…) cannot be voided; corrections re-count.
37. "When did resus start?" quick choices (5, 10, 15, 20 min).

**E. Checklists, equipment forms and log**
38. Where each checklist appears (arrest in the bottom bar, post-ROSC on ROSC, all four on Guidance).
39. Equipment forms: the questions for each device (laryngoscopy method, blade, Magill forceps, view
    grades; intubation introducer, length at lips 1–50 cm, confirmation methods; outcome; side) and
    the airway / access grouping.
40. Log: which event types count as "interventions"; checklist start / finish summary; export contents.

**F. Wording still in code**
Card status lines ("Review inactive", "No dose recorded", "Review first dose", "Since last dose",
"Enter weight", "Weight needed", "Manual review", "Dose: clinical review"), drug names, pop-up titles,
button labels, error messages, toasts, disclaimers ("A tick records checklist review…"), settings text.

**G. Visual settings fixed in code / style files**
Colours (five style files, only six named colours), text sizes (countdown, cards), child-dose purple
highlight, amber / yellow attention states, card order and two-column layout, the four bottom tabs
and their names, icons, pop-up style (slides up from the bottom), toast position and time, larger-text
mode, portrait lock, tutorial slides.

## Revised plan (draft 12 Nov 2026; nothing built; each choice awaits an owner decision)
**Aim (decision 10):** the owner edits values, wording, decision logic and appearance in one
interface with tabs, with no code, and nothing goes live unchecked.

### 1. How logic becomes editable data (proposed)
- **Facts:** a fixed list the engine works out from the record, each with a plain name, e.g.
  "latest rhythm", "shock count", "doses given of a drug", "time since last dose", "patient group",
  "weight entered", "case phase", "special situation on", and **flags** defined as data
  ("torsades recorded at any time").
- **Rule tables:** each decision is a short ordered table: *when* (facts chosen from menus) → *then*
  (result chosen from a menu). First matching row wins; the last row is always "otherwise".
  Example: lower slot = fluids when latest rhythm is PEA / Asystole / Other; magnesium when the
  torsades flag is set; otherwise amiodarone.
- **Drugs as data:** each drug has a definition: name, unit, route, how its dose is worked out
  (chosen from a menu: fixed / band table / per kg with cap / per kg with rounding), maximum doses,
  review interval, lock time, and rule tables for: card shown, dose text, button label and
  whether it records, status line, highlight.
- **Pop-ups and prompts as data:** content built from blocks (title, paragraphs, quote, dose line,
  links, buttons) plus a trigger chosen from a menu (rhythm recorded, card button tapped, before
  recording a dose, threshold reached).
- **No typed formulas or code** in a rule set: everything is picked from menus, so every rule set
  can be checked by machine.

**New functions needed:** (1) rule-table reader in the engine; (2) facts and flags list; (3) drug
definitions with one general card builder (replaces the separate adrenaline / amiodarone / support
card code; makes new drug cards possible); (4) dose-method menu; (5) pop-up builder and trigger
handler; (6) rule-set checker; (7) scenario test runner; (8) behaviour-difference report (old vs new
rule set over thousands of generated cases); (9) appearance settings (named colours and sizes read
from the rule set); (10) rule-set loader with version stamp, approval record and one-step rollback;
(11) save the "card has appeared" memory in the session; (12) phone-sized preview in the editor.

### 2. Limits on what the editor may change (proposed)
- Never editable: the record and audit trail, undo, saving, clocks, "nothing is recorded because
  time passed", and the checker itself.
- Every number has a type, unit and allowed range; bands in order; a child dose never above the
  adult dose; energy never above the maximum. A large change (more than double or less than half)
  needs a typed confirmation.
- Rules may only use listed facts and results; each table must end in "otherwise"; no rule may be
  unreachable; every case must give exactly one answer.
- Wording: numbers only through `{gaps}`; only bold, italic and line break allowed.
- Every clinical change needs a reason and a source reference.
- Appearance: minimum text size and button size, colour-contrast check; a clinical card or
  disclaimer cannot be hidden from the Appearance tab.

### 3. Checking and testing before a rule set goes live (proposed)
1. **Checker** runs as you type (limits above) and blocks saving an invalid rule set.
2. **Built-in tests:** the general tests (record, undo, clocks, storage) run for every rule set;
   NZ-EAS-specific tests stay tied to the NZ EAS rule set.
3. **Scenario tests the owner writes**, in plain steps, stored with the rule set, e.g.
   "25 kg child · shock VF ×3 → amiodarone card shows 150 mg, button on". All must pass.
4. **Behaviour-difference report:** thousands of generated cases run through the live and the
   edited rule set; every screen that differs is listed for the owner to accept.
5. **Preview**, then **owner approval** (name, date, reason), then publish; the previous approved
   rule set is kept for one-step rollback. The app shows the rule set name and version.

### 4. Editor tabs (proposed)
Overview · Numbers & doses · Drugs & cards · Rhythms & flow · Pop-ups & prompts · Wording ·
Checklists & causes · Equipment & forms · Sources · Appearance · Test & preview · Approve & publish.

### 5. Build stages (each proved identical to v22 before the next starts)
Proof for every stage: all tests pass before and after; the 278 recorded screens and the random
case comparison match v22 exactly; one commit per step on `rules-editor`; nothing goes to `main`
without the owner's yes. Model and effort are suggestions for an orchestrated build
(orchestrator: Fable, high effort; after each stage a fresh reviewer that did not do the work).

| Stage | What | Model · effort |
|---|---|---|
| 0 | Wider safety net: record v22 Live screens and pop-ups step by step across thousands of generated cases | Opus · high |
| 1 | Rule set becomes JSON (decision 9); loader; checker for the five existing parts | Sonnet · medium |
| 2 | Remaining wording, labels, lists, timer thresholds and form questions (inventory F, 31, 34, 37, 39) move to data | Sonnet · medium |
| 3 | Facts, flags and rule tables; lower slot, amiodarone, torsades, child advice, special situation become tables (A, D) | Fable · high |
| 4 | Drug definitions, dose-method menu, one general card builder (A, C) | Fable · high |
| 5 | Pop-ups and prompts as blocks plus triggers (B) | Opus · high |
| 6 | Appearance settings: named colours, sizes, layout, pop-up style (G) | Opus · medium |
| 7 | Full checker, scenario runner, behaviour-difference report | Fable · high |
| 8 | Editor screens (tabs), preview | Opus · high |
| 9 | Approve / publish / rollback; trial with a second, deliberately different rule set | Opus · high |
| Review | After every stage: re-run tests, read the changes, report in plain English | Opus · high |

## Guideline check: EAS 3.14 cardiac arrest (12 Nov 2026)
Read the live page (cpg.stjohn.org.nz, version 1.1.0.1 of 16 June 2026) and the packaged PDF
(export 24 Sep 2026): **same text.** Compared with v22.

**Matches:** 2-minute cycles; adrenaline every 4 minutes; adult doses; amiodarone after 3 and 6
shocks including earlier shocks; torsades "present or has occurred" → withhold amiodarone,
magnesium, one repeat; PEA fluid volumes; paediatric rows in EAS 7.2 (adrenaline, one amiodarone
dose only, no magnesium at 5 and 10 kg, energy = bottom of each range); the 12 checklist items.

**Mistake found (confirmed by running the app):** recording **ROSC with the rhythm "Other"** opens
the "Non-shockable rhythm · fluid guidance" pop-up with a "Continue CPR" button, and after a
re-arrest the fluids card shows "Other · review fluid volume". Cause: A7 put "Other" in the fluids
list, and the code does not check that the rhythm came from a no-shock check. Not yet fixed
(needs owner approval; decision 15).

**Differences that are owner rulings, not mistakes:** fluids card and pop-up for Asystole (A2c) and
Other (A7); the guideline lists fluids under PEA only.

**Flow point:** the guideline's first action is "defibrillate immediately if VF or VT". The app
offers a rhythm check only when the 2-minute countdown reaches zero, so a shock on arrival can only
be entered as "+ Previous shock" (no time, no rhythm).

**Actions in the guideline that the app does not have, and the block that adds each natively**
| # | Guideline action | Block the editor uses |
|---|---|---|
| G1 | After 3 shocks in VF / VT: consider anterior/posterior pads or double sequential defibrillation | Prompt: trigger "shock count reaches 3 and latest rhythm VF / VT" |
| G2 | Seek clinical advice if VF / VT persists (after the second amiodarone dose) | Status-line rule row on the amiodarone card |
| G3 | Patient movement: ketamine 1 mg/kg (max 150 mg), may repeat once; then rocuronium 2 mg/kg (max 200 mg) only if an ETT is placed and confirmed with ETCO2 | Two new on-demand drug cards (per kg with cap; max doses; rocuronium needs the fact "ETT recorded") |
| G10 | Defibrillator failure action list (10 steps) | New checklist (checklists become addable, with "where it appears") |
| G11 | Special situations that change treatment: anaphylaxis (adrenaline 1 → 3 → 5 → 1 mg in PEA; fluids 2–3 L or 40–60 mL/kg); cyclic antidepressant poisoning (8.4% sodium bicarbonate 100 mL or 2 mL/kg; fluids; **no amiodarone**); asthma (ventilate 6/min; adrenaline high priority); drowning (place an ETT if no ROSC in the first few minutes); pregnancy over 20 weeks (displace uterus left; consider transport if hospital under 10 min); opiate (no naloxone); implanted device (pads 8 cm away) | **Situations** as data: each named situation can change a dose (including a dose sequence), a fluid range, withhold a drug, add a drug card or show a prompt. Replaces the single "special situation" switch |

**Removed by the owner (12 Nov 2026), not needed:** G4 flush, G5 backup, G6 intubation at 10 minutes,
G7 stopping times, G8 ETCO2 test in PEA, G9 asystole checks, G12 rhythm check on arrival; from G11,
hanging and infant-in-sleep (15:2 ratio only). Drowning is kept because the guideline adds one action
(early ETT); the owner can strike it.

**On-demand drug card:** a card the app cannot bring up by itself, because the reason is something
only the clinician can see. Amiodarone appears because the app counts shocks; ketamine for a moving
patient cannot. The clinician taps a button (e.g. "Patient moving"), the card appears on the Live
screen with its dose, limit and record button, and it can be put away again.

Left out on purpose (general information, not actions): start / stop reasoning, prognosis lists, CPR
quality and ventilation rates, transport, helicopter, mechanical CPR.

**Blocks this adds to the plan:** triggered **prompts**; **situations**; **on-demand drug cards**;
a **dose sequence** dose method; addable checklists. (Timed prompts are not needed now that G6 and
G7 are removed; "time since" facts still exist for other rules.)

## Adding options (owner question on decision 11)
Three levels, cheapest first:
1. **Automatic.** Anything recordable is data, so adding it creates its facts: add a drug "ketamine"
   and the menus gain "ketamine doses given" and "time since last ketamine"; add a rhythm, a
   situation or a checklist and it appears in every menu that lists them.
2. **Build it in the editor.** A "new fact" form combines existing ones: count of an event, time
   since an event, "ever recorded", a number compared with a limit, or several facts joined by
   and / or. Saved with a plain name and reused. No code.
3. **New kind of block** (e.g. a new way to work out a dose, a new kind of card). The editor writes
   a short request in plain English; a programmer (or Claude) adds the block once, with its own
   tests and checker rules; it then appears in the menus for every rule set.

## Two ways in, and the long-term platform (owner goals, decision 12)
**Same rule set, two views; neither can do anything the other cannot.**
- **App view (front end):** a phone-sized working preview. Switch on "Edit", tap the adrenaline
  card, and a panel lists everything attached to it in plain sentences: when it shows, its dose,
  button, status line, lock, pop-ups. Tap a line to change it. Best for people who would be lost in
  a big flowchart.
- **Rules view (technical):** every table, drug, prompt and situation as lists and tables, with
  search, "where is this used", and the raw JSON for those who want it.

**First sketch of the platform ("flowchart to app")** (to brainstorm properly once stages 3 to 5 exist):
- An app = **record** (what can be logged) + **facts** + **rule tables** + **screens made of cards**
  + **prompts** + **checklists** + **timers** + **reference calculators** + **appearance**.
- A flowchart maps onto these: a decision diamond is a rule table; an action box is a card, prompt or
  checklist item; an arrow is a fact changing; a loop is a timer.
- Ways to start: a template (e.g. timed protocol with rhythm checks), drawing the flowchart, or the
  rules view. Later: import a guideline and have a draft proposed for the owner to check.
- The same safety line applies to every app: checker, scenario tests, difference report, approval,
  versions, rollback.
- Kept generic from now on: block names avoid cardiac-arrest words (e.g. "counted event", not
  "shock") wherever that costs nothing.

## Stage changes after this review
- Stage 5 becomes **pop-ups, triggered prompts, situations and on-demand cards**.
- Stage 8 builds the **Rules view first, then the App view** (tap a card to see its rules).
- New last stage: **first native additions** (G1, G2, G3, G10, G11, as approved, one at a time) made through
  the editor, as the proof that nothing needs typing into code.

## Decisions
All of 11 to 25 are made (table at the top). The build brief is `docs/19-ORCHESTRATION-BRIEF.md`.
