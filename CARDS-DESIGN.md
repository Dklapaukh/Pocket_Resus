# Cards design note (approved by the owner 15 Nov 2026; owner decisions 5 and 17, editor decision 13)

The idea: one **card** for each guideline instruction the app acts on. The rule file becomes a short
list of cards plus the verified dose tables, the engine becomes one routine that asks "which cards
show now?", and the editor becomes "tap a card, change a field, see what changed, publish". Nothing
here changes the live app until plan step C5. Inputs: CLAUDE.md, DECISIONS.md sections 1, 3 and 9,
GUIDELINE-TRACE.md, `src/rules/nz-eas.yaml`, `src/engine/*.js`, `src/app/*.js`, and the packaged PDF text.

## 1. Every instruction the app acts on
| # | Instruction (EAS text) | Source | Ruling | Card |
|---|---|---|---|---|
| 1 | "Perform two-minute cycles of high performance CPR between rhythm checks." | 3.14 p1 | | CPR clock (setting) |
| 2 | "Administer adrenaline IV every four minutes:" "1 mg IV for an adult." "See the paediatric drug dose tables for a child." | 3.14 p1; 7.2 band tables | D11 B (no change) | adrenaline |
| 3 | "Maximum joule setting for an adult." "See the paediatric drug dose tables for joule settings for a child." | 3.14 p1; 7.2 p2, band tables | D3 | shock energy |
| 4 | "If in VF or VT after three shocks, including shocks delivered prior to ambulance arrival:" "Administer amiodarone:" "300 mg IV for an adult." | 3.14 p1 | D4 | amiodarone-1 |
| 5 | "If in VF or VT after six shocks, including shocks delivered prior to ambulance arrival, administer a second dose of amiodarone:" "150 mg IV for an adult." Child: "Seek clinical advice" | 3.14 p1 | D4; D9 B (A33) | amiodarone-2 |
| 6 | "If torsades de pointes is present or has occurred" "Withhold amiodarone." "Administer magnesium IV:" "10 mmol (2.5 g) over 1-2 minutes for an adult." "Repeat once if torsades de pointes recurs or persists." | 3.14 p2; 7.2 dilution 13 | D10 B (A34), D12 B (A35) | magnesium |
| 7 | "If the patient is in PEA" "Correct immediately reversible causes." "Administer 0.9% sodium chloride IV:" "1-2 litres IV for an adult." "20-40 ml/kg IV for a child." | 3.14 p2; 7.2 band tables | D1 | fluids |
| 8 | "Potentially reversible causes of PEA include:" and the eight causes | 3.14 p13 | D5 | reversible causes |
| 9 | Trauma sentence and the special-situation headings | 3.14 p1, p16–18 | D6 (A29) | special situations |
| 10 | Weight rounded up to 5, 10, 20, 30, 40 kg; over 40 kg adult doses | 7.2 p1–2 | decision 2; D7; D11 B | look-up (code) |
| 11 | Weight from the band headings ("5 kg / less than one year" … "40 kg / 11-13 years") | 7.2 p5–14 | D7; decision 8 | weight from age |
| 12 | Cuffed ETT size, length at lips, LMA size and cuff; caution sentence | 7.2 p1, p6–14 | D6 (A31) | tubes and LMA |
| 13 | Adrenaline preparation (undiluted ≥ 50 kg; 1 mg to 10 ml ≤ 40 kg) | 14.3 p2 | D6 (A28) | adrenaline details |
| 14 | Amiodarone contraindications; "administer IV undiluted as a bolus." | 14.4 p1, p3 | D6 (A28) | amiodarone details |
| 15 | Magnesium dilution and the adrenaline-line sentence | 14.27 (online only) | D12 B: removed (A35) | magnesium details |
| 16 | RSI doses by column; fentanyl, ketamine, blocker sentences | 9.3 p1, p2, p4, p5 | D6 (A30); D8 | RSI reference |
| 17 | Arrest, post-ROSC, RSI preparation, RSI checklists | 3.14 p2–3; 3.15; 9.2; 9.4 | D6 (A31) | checklists (lists) |

D2 (pads prompt) and the "Other" no-shock rhythm (D1) have no card: they go. Not acted on today
(G1, G2, G3, backup request): each would be one new card later, through the editor.

## 2. Card fields and the fixed list of conditions
A card file has these parts, in this order, and ends with the line `...` (same strict reader as
today's rule set: no comments, anchors or tags): `about`, `guidelines` (number → title, packaged PDF
or `null` if online only, optional `https://` link), `settings` (rhythm lists), `tables` (each with
`source`, the `key` column and `rows`), `cards`, `checklists` (`id`, `title`, `items` as lines).
The checker is `src/cards/check.js` (README "Code map").

| Field | Holds |
|---|---|
| `id`, `title` | name; the title is app text |
| `place` | `top`, `lower`, `header` or `guidance` (where it is drawn) |
| `group` | optional: only the first matching card of a group shows (amiodarone-2 before -1) |
| `show_when` | conditions from the list below, all must be true |
| `lines` | each `{text, source}`, found word for word on a cited page of the packaged PDF (spacing, quote and dash style ignored; a sentence across a page break needs both pages cited); or `{app_text}` with an optional source, drawn differently |
| `dose` | `adult:` one line and `child:` a table cell `{table, column, source}` and/or lines; a dose in app text needs a source citing an owner ruling; an empty ("-") cell shows "Seek clinical advice" |
| `record` | what tapping records: drug, amount (`dose` or `typed`), unit; never pre-filled when `typed` |
| `timer` | clock on the card, e.g. `every_min: 4, from: last_dose` |
| `repeat` | `max` doses; optional `confirm` lines before a repeat |
| `details` | the "Administration ⓘ" pop-up: `{text, source}` lines |
| `pop_up_on_show` | open `details` the moment the card first appears (fluids after PEA); needs at least one `details` line |
| `lock_s` | double-tap lock after recording (app mechanic, A5) |
| `note` | plain-English note for the owner; never shown |

**Sources** are parts joined by " · ": `EAS 3.14 p1`, `EAS 7.2 p5, p8-9`, `Owner ruling A10`. A guideline
sentence or table cell needs at least one EAS part. Card text is plain: no `{gaps}`, no bold or italic.

**Conditions (seven; no "or" between conditions, no formulas; each at most once per card; exactly one
of `arrest_running` and `on_request`, and an `on_request` card has no other condition):**
1. `arrest_running`: CPR started, no ROSC or end since.
2. `latest_rhythm: [list]`: the latest rhythm recorded at a rhythm check (ROSC rhythms ignored, A8; "not recorded" changes nothing).
3. `shocks_at_least: n`: shocks so far, counting "+ Previous shock" and earlier counts.
4. `ever_recorded: rhythm`: recorded at any time in this arrest (torsades).
5. `never_recorded: rhythm`.
6. `doses_at_least: n`: doses of this card's drug, counting earlier doses entered.
7. `on_request`: shown only when opened from the Guidance tab.

Adult or child is not a condition: it only picks the `dose` line. The special-situation switch stays
one app setting that turns every automatic card to "Manual review".

## 3. Example cards (text as approved in A20, A23, A27, A28)
```yaml
- id: adrenaline
  title: Adrenaline
  place: top
  show_when: [arrest_running]
  lines:
    - {text: "Administer adrenaline IV every four minutes:", source: EAS 3.14 p1}
  dose:
    adult: {text: "1 mg IV for an adult.", source: EAS 3.14 p1}
    child: {table: eas72, column: adrenalineMg, source: "EAS 7.2 p5, p8, p10, p12, p14"}
  record: {drug: adrenaline, amount: dose, unit: mg}
  timer: {every_min: 4, from: last_dose}
  lock_s: 210
  details:
    - {text: "Cardiac arrest:", source: EAS 14.3 p2}
    - {text: "Adults and children whose weight has been rounded to 50 kg or more: administer undiluted as an IV bolus.", source: EAS 14.3 p2}
    - {text: "Children whose weight has been rounded to 40 kg or less: dilute 1 mg of adrenaline to a total of 10 ml using 0.9% sodium chloride. This solution is 1:10,000 and contains 0.1 mg/ml. Draw up the dose from this solution and administer as an IV bolus.", source: EAS 14.3 p2}

- id: amiodarone-2
  group: amiodarone
  place: lower
  show_when: [arrest_running, {latest_rhythm: [VF, VT]}, {never_recorded: Torsades}, {shocks_at_least: 6}, {doses_at_least: 1}]
  lines:
    - {text: "If in VF or VT after six shocks, including shocks delivered prior to ambulance arrival, administer a second dose of amiodarone:", source: EAS 3.14 p1}
  dose:
    adult: {text: "150 mg IV for an adult.", source: EAS 3.14 p1}
    child: {text: "Seek clinical advice", source: "Owner ruling A10 · EAS 3.14 p1"}   # D9 ruled B: kept (A33)
  record: {drug: amiodarone, amount: dose, unit: mg}
  repeat: {max: 2}
  details:
    - {text: "Cardiac arrest: administer IV undiluted as a bolus.", source: EAS 14.4 p3}
    - {text: "Contraindications", source: EAS 14.4 p1}
    - {text: "Known severe allergy.", source: EAS 14.4 p1}
    - {text: "Known severe allergy to iodine.", source: EAS 14.4 p1}
    - {text: "VT secondary to cyclic antidepressant poisoning. In this setting amiodarone administration can be associated with severe worsening of shock, without resolution of the rhythm.", source: EAS 14.4 p1}
    - {text: "If torsades de pointes is present or has occurred.", source: EAS 14.4 p1}

- id: amiodarone-1
  group: amiodarone
  place: lower
  show_when: [arrest_running, {latest_rhythm: [VF, VT]}, {never_recorded: Torsades}, {shocks_at_least: 3}]
  lines:
    - {text: "If in VF or VT after three shocks, including shocks delivered prior to ambulance arrival:", source: EAS 3.14 p1}
    - {text: "Administer amiodarone:", source: EAS 3.14 p1}
  dose:
    adult: {text: "300 mg IV for an adult.", source: EAS 3.14 p1}
    child: {table: eas72, column: amiodaroneFirstMg, source: "EAS 7.2 p5, p8, p10, p12, p14"}
  record: {drug: amiodarone, amount: dose, unit: mg}
  repeat: {max: 1}
  details: []   # the same six lines as amiodarone-2, written out again (the file allows no shortcuts)

- id: magnesium
  place: lower
  show_when: [arrest_running, {ever_recorded: Torsades}]
  lines:
    - {text: "If torsades de pointes is present or has occurred", source: EAS 3.14 p2}
    - {text: "Withhold amiodarone.", source: EAS 3.14 p2}
    - {text: "Administer magnesium IV:", source: EAS 3.14 p2}
  dose:
    adult: {text: "10 mmol (2.5 g) over 1-2 minutes for an adult.", source: EAS 3.14 p2}
    child: {table: eas72, column: magnesiumMmol, source: "EAS 7.2 p7, p9, p11, p13, p15"}   # 5 and 10 kg print "-"
  record: {drug: magnesium, amount: dose, unit: mmol}
  repeat:
    max: 2
    confirm:
      - {app_text: "One dose is already recorded."}
      - {text: "Repeat once if torsades de pointes recurs or persists.", source: EAS 3.14 p2}
  lock_s: 5
  details: []   # D10 pointer line (A34); D12 sentences removed (A35)

- id: fluids
  place: lower
  show_when: [arrest_running, {latest_rhythm: [PEA]}]
  pop_up_on_show: true
  lines:
    - {text: "If the patient is in PEA", source: EAS 3.14 p2}
    - {text: "Correct immediately reversible causes.", source: EAS 3.14 p2}
    - {text: "Administer 0.9% sodium chloride IV:", source: EAS 3.14 p2}
  dose:
    adult: {text: "1-2 litres IV for an adult.", source: EAS 3.14 p2}
    child:
      - {table: eas72, column: fluidsTableMl, source: "EAS 7.2 p7, p9, p12, p14, p16"}
      - {text: "20-40 ml/kg IV for a child.", source: EAS 3.14 p2}
  record: {drug: fluids, amount: typed, unit: mL}
  lock_s: 5
```
The checked copy of these examples is `tests/fixtures/cards/good.yaml`: it adds the titles and a fluids
`details` line the format requires, and uses `note` in place of `#` comments.

With torsades then PEA, magnesium and fluids both show (A20): a third card on screen, which decision
14 says needs an owner phone check the first time.

## 4. What does not fit a card
| Today | Becomes |
|---|---|
| CPR clock, 30 s / 15 s warnings, rhythm check only at zero, two-step shock then rhythm, torsades confirm pop-up | code; the times stay settings |
| Record, undo, void, correct, "+ Previous shock", earlier counts, saving and repair (README "Recovery"), log, export | code (mechanics, unchanged) |
| Band and column look-up, rounding (decisions 2, 7, 8; D7, D8) | code, one look-up routine; the tables stay data |
| Rhythm choices, correction lists, input limits (500 kg, 1000 J, 12 mm), medicine units, log filter, locks, checklist reminder | settings |
| ~450 lines of labels, toasts, errors, tutorial text (`wording` minus guidance) | a separate app-text file, not clinical |
| Equipment lists and colours (~160 lines) | a separate recording file, not clinical |
| Checklists | stay as lists (guideline text, cited) |
| ~40 `{gap}` names, per-kg numbers kept only to fill text, `notes` part, `careMode`, pads prompt, `joulesPerKg`, `adult.shockJ`, unused `reducedKetamine.maxMg` | go: card text is written out word for word |

**Clinical decisions inside the screens (`src/app`):** about 150 to 200 lines in four files, much of
it repeated. Examples: `views.js` 36–75 decides the adrenaline and amiodarone card in nine ranked
states ("Keep this precedence"); `events.js` 290–297 repeats the same checks before recording;
`views.js` 389–397 and 494–506 pick status lines, and 505 types "Asystole" and "Other" into code;
`session.js` 80–95 (magnesium maximum, which lower card) and 159, 181 (torsades confirm, fluids
pop-up trigger); `sheets.js` 161 (child amiodarone pop-up dose) and 85, 561 plus `views.js` 105
(pads prompt). Everything else in the screens is recording, log, forms and saving.

**Recommendation: A, keep the screens and rewire them.** The clinical logic sits in one corner: the
drug cards and their pop-ups. That corner is replaced by one routine that draws whatever card the
engine returns. The rest of the screens (log, corrections, export, saving and recovery, checklists,
forms) holds no clinical decisions, works on phones, and is guarded by 673 tests and 3,609 recorded
cases. Rebuilding it (B) would redo working, phone-checked parts and risk new faults for no
clinical gain, and would push the December goal (decision 12) back.

## 5. Size, stages and plan
**Size.** Clinical file about 450 lines (about 570 with checklists), down from 1,196: the cards
about 250 lines (12 cards), the EAS 7.2 and EAS 9.3 tables about 130 (copied unchanged), the guideline
list and settings about 90. App text and equipment move to two non-clinical files. Engine: one
routine of about 150 to 200 lines in place of about 720 plus the 150 to 200 in the screens.

**Stages 3 to 10 (DECISIONS.md section 5):** 3 (rule tables) and 4 (drug cards as data) are no longer needed: the
cards are both. 5 shrinks to named situations (decision 16). 7 shrinks to checking card fields,
citations and word-for-word text; there are no rule tables to prove complete, and the formula box
is dropped (editor decision 13). 6, 8, 9 stay, smaller. 10 becomes
"add one card" per candidate. A20 to A31 and P3 are written straight into the cards instead of being
patched into the old file one by one; each row keeps its named test and phone check.

**Plan (fresh, from the guideline, not converted; steps C1 to C6 in DECISIONS.md section 5):**
1. Card format and new checker: fields, the seven conditions, citation required, every `text`
   compared with the PDF text; tested on deliberately bad cards.
2. New rule file written from the PDFs and the approved A20 to A31 text; the EAS 7.2 and 9.3 tables
   copied unchanged and still checked by the existing table test. D9 to D12 follow decision 18 (A33 to A35)
   until ruled. Owner reads every card (the cards are the clinical review document).
3. New engine and checker unit tests, plus each A20 to A31 row's named test.
4. Rewire the drug-card corner of the screens; delete the duplicated logic; move app text and
   equipment to their own files. Old engine kept until step 5 passes (deleting asks first).
5. Once: replay `tests/reference` on the new app. Every difference must belong to one approved
   A-row; any other difference is a fault to fix. The recordings are of v24 (live), so this is the
   one comparison of the new engine against v24. Then re-record from the new commit.
6. Owner phone check (all A20 to A32 checks at once), then E2 editor, E3, v25.
