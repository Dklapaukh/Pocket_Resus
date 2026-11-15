# 18. Rules editor design (current only)

The build plan is doc 19. The guiding principle and clinical decisions are doc 06 and win over this
page. Earlier drafts and the finished "move everything into the rule set" work are in git history.

## Goal
Rules can be updated, and rule sets made for other services, without touching code. Nothing goes
live unchecked: plain data in; a checker that blocks impossible values; a "what changed" view;
automatic tests for each rule set; approval before a rule set goes live.

## What the guiding principle requires of the editor (15 Nov 2026)
The editor is where the principle could be broken, because an editor can type anything. So:
1. **Citation required (owner ruling Q9, 15 Nov 2026; doc 06 decision 15).** Every clinical value, sentence and
   rule carries its guideline and page. The checker refuses a rule set with one missing.
2. **Guideline text is an extract.** A sentence shown as guidance is word for word from the
   guideline (whole sentences may be left out), checked against the packaged PDF text (owner
   ruling D6). A summary or an omission needs a recorded owner ruling and shows "Summary: see EAS
   [number] [title]" with its link. Anything else is marked as app text and cannot be styled to
   look like guidance.
3. **Dose methods, in order of preference:** a printed value (fixed, band table, column table);
   "Seek clinical advice" with no number; a guideline formula only where the cited guideline prints
   a formula and no value. "Per kg with cap" and "per kg with rounding" exist only as the last kind.
4. **The advanced formula box (decision 13) is not available for doses, energies or sizes.** It may
   only combine facts for *when* something shows. (Owner to confirm when stage 7 is reached.)
5. **For another service,** "the guideline" means that service's own published guideline, packaged
   with its rule set. The approval record names the guideline edition the rule set was checked against.

## The rule set
One file per service, `src/rules/nz-eas.yaml`, plain YAML data: no code, anchors, aliases or tags;
it must end with the line `...`. Parts, in order: `about`, then the five parts of decision 2, then
`notes` (a plain-English note for every value).

| Part | Holds | Checks |
|---|---|---|
| 1 `numbers` | bands, doses, energies, timings, card rules, locks, limits, age table, RSI tables, tube and LMA tables | type, range, order, units |
| 2 `wording` | every sentence about a drug or decision, labels, messages | not empty; a number appears only as a `{gap}` filled from part 1; only bold, italic, line break |
| 3 `checklists` | four checklists, reversible causes | no empty items, unique IDs |
| 4 `equipment` | device types, sizes, access sites, colours | sizes ordered, valid colours |
| 5 `sources` | guideline names, export date, PDF files, web links | every PDF is in the app; `https://` only |

Reader `src/rules/parse.js` (js-yaml 5.5.0 in `src/vendor/`, strictest mode), writer
`src/rules/write.js` (byte for byte), checker `src/rules/check.js` (the app never loads it),
what-changed tool `tools/rules-diff.mjs`. A lock-in test fails if a clinical number or rule-set
sentence is typed into `src/app` or `src/engine`.

## Decisions (numbers are quoted in code: never renumber)
| # | Decision |
|---|---|
| 2 | **Five parts, divided by kind, each with its own checks.** Each number is stored once; text gets numbers only through `{gaps}`. One rule set per service holds numbers and guideline text, approved together. |
| 9 | **Rule set file format: YAML.** |
| 10 | **Scope:** the owner must be able to edit any clinically relevant function without touching code (values, wording, decision logic, pop-ups) and visual settings, in one interface. |
| 11 | **Logic is edited through menus and rule tables:** "when" picked from a list of facts, "then" from a list of results, first match wins, last row "otherwise". |
| 12 | **Two ways into the editor:** a technical Rules view, and an App view (tap a card in a phone preview and see every rule attached to it). Long term the blocks become a no-code "flowchart to app" tool. Guideline gaps are added through the editor, not typed into code. |
| 13 | **New blocks at three levels** (below) **plus an advanced formula box**, limited by principle point 4 above. The box accepts listed facts, numbers, comparisons, and / or / not, never code; the checker reads it; it is marked "advanced" in the what-changed view; each formula needs at least one scenario test. |
| 14 | **Any number of drug cards, layout set by rules.** With today's two cards the screen must stay identical; the checker warns when cards no longer fit a small phone; owner phone check the first time a third card is used. |
| 16 | **Named situations as data,** replacing the single special-situation switch; built empty first, then filled one approved item at a time. |
| 17 | **Guideline candidates are added through the editor,** each approved and tested separately: G1, G2, G3, G10, G11 (below). |
| 18 | **Strict limits:** impossible values blocked; a large change (more than double or less than half) needs a typed confirmation; every clinical change needs a reason and a source. Anyone approved to make changes is an "editor"; until there are accounts the approval record holds the editor's typed name. |
| 19 | **Scenario tests are recorded by tapping through the preview,** saved as steps that can be edited. |
| 20 | **The editor is a separate page of the same site,** offline, no logins. A rule set goes live when it is confirmed in the editor after the checks and tests pass (how: design note at E3). Each service has its own URL; an organisation decides who its editors are. |
| 21 | **One rule set built into each published version;** version name on screen; nothing changes silently. |
| 22 | **Appearance:** named colours, text sizes, card order, pop-up style, labels, icons, with contrast and minimum-size checks; built so free layout can be added later. |
| 23 | **Five tabs:** App view, Rules, Appearance, Tests, Publish. The first editor (E2) has Rules, Tests, Publish. |
| 24 | **General blocks:** names avoid cardiac-arrest words where that costs nothing ("counted event", not "shock"). |
| 25 | **Few owner checkpoints:** phone checks after screen-changing stages, clinical approvals, releases. |
| 26 | **No version-history screens:** only the current version number is shown. Before a draft is confirmed the editor shows what it will change; the previous rule set is kept out of sight for one-step rollback. |

## How it works
**Logic as data.** *Facts* the engine works out from the record ("latest rhythm", "shock count",
"doses given of a drug", "time since last dose", "patient group", "case phase", flags such as
"torsades recorded at any time"). *Rule tables* turn facts into results. *Drugs* are definitions
(name, unit, route, dose method, maximum doses, review interval, lock time, and tables for card
shown, dose text, button, status line). *Pop-ups and prompts* are blocks (title, paragraphs, dose
line, links, buttons) plus a trigger. *Situations* can change a dose, withhold a drug, add a card
or show a prompt. *On-demand cards* are brought up by the clinician ("Patient moving") because the
app cannot see the reason.

**Never editable:** the record and audit trail, undo, saving, clocks, "nothing is recorded because
time passed", and the checker itself. A clinical card or disclaimer cannot be hidden from Appearance.

**Before a rule set goes live:** (1) the checker runs as you type and blocks saving an invalid rule
set; (2) general tests (record, undo, clocks, storage) run for every rule set, service-specific
tests stay with their rule set; (3) scenario tests written by the editor all pass; (4) the
what-changed report runs thousands of generated cases through the live and the edited rule set and
lists every screen that differs; (5) preview, approval (name, date, reason, source), publish; the
previous rule set is kept for rollback.

**Adding options, cheapest first:** (1) automatic: add a drug, rhythm, situation or checklist and
its facts appear in every menu; (2) in the editor: a "new fact" form combines existing ones;
(3) a new kind of block: the editor writes a plain-English request, a programmer adds the block
once with tests and checker rules.

**The two views** show the same rule set; neither can do anything the other cannot. The long-term
"flowchart to app" tool maps a decision diamond to a rule table, an action box to a card, prompt
or checklist item, an arrow to a fact changing and a loop to a timer, with the same safety line
(checker, scenario tests, what-changed report, approval, rollback) for every app.

## Behaviour still fixed in code (the work list for stages 3 to 6)
Read from the code at v22 (12 Nov 2026) and corrected for later changes. **Re-read the code at the
start of each stage; this list is a guide, not a specification.** Labels, messages, timer
thresholds, rhythm button names, correction-form lists, resus-start choices, equipment form
questions and export labels became data in stage 2.

**A. Which drug card shows, and when** (stages 3 and 4)
1. Two card slots only: adrenaline on top; the lower slot is fluids, amiodarone or magnesium.
2. Lower slot: the latest recorded rhythm that is in either rhythm list decides (lists are data).
3. Torsades: once recorded, magnesium replaces amiodarone for the rest of the case.
4. Amiodarone due: counts (3, 6) are data; code fixes that earlier shocks count, the case must be
   running, not special situation, torsades never recorded, current rhythm ignored (doc 11 D4).
5. Amiodarone card: grey tile until first due, then stays; the "has appeared" memory is not saved.
6. Second amiodarone dose: adult before the 6th shock "Due after 6 shocks"; child "Seek clinical
   advice" with "Select dose" before the 6th shock.
7. The order of precedence when several of these are true at once.
8. Adrenaline card: always shown, no maximum, not linked to rhythm or cycle count.
9. Magnesium: second dose needs a confirmation; no dose for the band gives "Seek clinical advice".
10. Fluids: never records a suggested volume; the status line names the rhythm or the total recorded.
11. Special-situation switch: what it turns off and its caption.
12. After ROSC or session end: cards disabled; Post ROSC checklist opens.
13. Double-tap locks: times are data; which cards grey out is code.

**B. Pop-ups and prompts** (stage 5)
14. "Confirm Torsades" after a shock; 15. "Fluid guidance" after a rhythm from the fluids list
(doc 11 D1); 16. "Repeat magnesium?" and the amiodarone-after-torsades warning; 17. pads prompt
placement (doc 11 D2); 18. arrest checklist reminder; 19. what each administration pop-up contains.

**C. How doses and sizes are found** (stage 4; all look-ups since A9 to A19)
20. No weight = adult; 40 kg or less = child; band rounding. 21. Shock energy by band, adult
otherwise (doc 11 D3). 22. Which table and column each output uses (RSI, tubes, LMA, fluids, age).
23. A valid weight: above 0, up to the maximum, one decimal. 24. Units and routes per drug.

**D. Cycle and case flow** (stage 3)
25. A rhythm check is offered only when the countdown reaches zero; ROSC any time. 26. Shock or no
shock is recorded first, the rhythm asked second; ROSC stops the clocks; re-arrest restarts.
27. Nothing is recorded because time passed. 28. Counting: earlier counts, "+ Previous shock",
earlier amiodarone doses. 29. A hand-typed medicine joins the counts only if its name matches
exactly. 30. State events cannot be voided; corrections re-count.

**E. Checklists, forms, log** (stage 5): where each checklist appears; airway and access grouping;
which events count as "interventions".

**G. Appearance** (stage 6): colours (five style files), text sizes, child-dose highlight,
attention states, card order and layout, the four bottom tabs, icons, pop-up style, toasts.

## Guideline candidates (decision 17; each needs the owner's approval of exact content)
All are from EAS 3.14 and must follow the principle: word-for-word text, printed doses, cited.

| # | Guideline action | Block |
|---|---|---|
| G1 | After 3 shocks in VF / VT: consider anterior/posterior pads or double sequential defibrillation | Prompt on the amiodarone trigger |
| G2 | Seek clinical advice if VF / VT persists after the second amiodarone dose | Status-line row on the amiodarone card |
| G3 | Patient movement: ketamine 1 mg/kg (max 150 mg), may repeat once; then rocuronium 2 mg/kg (max 200 mg) only with an ETT confirmed by ETCO2 | Two on-demand cards. The guideline prints a formula and no table here, so the trace must show that (principle 4) |
| G10 | Defibrillator failure action list | New checklist |
| G11 | Special situations that change treatment (anaphylaxis, cyclic antidepressant poisoning, asthma, drowning, pregnancy over 20 weeks, opiate, implanted device) | Situations as data |

Removed by the owner: G4 to G9, G12, and from G11 hanging and infant-in-sleep. Also noted: the
guideline's first action is "defibrillate immediately if VF or VT"; the app offers a rhythm check
only when the countdown reaches zero, so a shock on arrival is entered as "+ Previous shock".
