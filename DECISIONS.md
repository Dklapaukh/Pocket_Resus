# Pocket Resus: principle, owner decisions, state and build queue

This file holds what is true **now**. When a decision changes, its row is rewritten, not added to;
git keeps the history. Read sections 4 to 7 first in any new chat. Section 9 (editor design) gives
way to sections 1 to 3 if they ever disagree.

Old references in code, tests and commit messages: "doc 06" and "doc 07" = this file; "doc 18" =
section 9 of this file; "doc 11" = `GUIDELINE-TRACE.md`; "doc 10", "doc 17" and "doc 19" = `README.md`.
"Decision N" in code means an owner decision (section 3) unless it says doc 18 (editor decision,
section 9). Both lists are numbered separately: never renumber either.

## 1. Guiding principle (owner, 15 Nov 2026)
1. **The app shows what the NZ EAS CPGs say, as the guideline says it, at the moment it applies.**
   It makes no clinical decision; the clinician does (for example, deciding the rhythm is torsades).
2. **The only calculations the app performs are ones clearly traced to a guideline.** The trace for
   every number, sentence and trigger is GUIDELINE-TRACE.md.
3. **A specific guideline beats a general one.** RSI doses come from the RSI guideline (EAS 9.3),
   not from the general paediatric tables (EAS 7.2).
4. **A dose printed in the guideline (for example in a table) beats a calculated dose.**
5. When 3 and 4 pull apart: rule 3 picks the guideline; inside it rule 4 applies. If the specific
   guideline gives only a formula and another guideline prints the number, show the printed number
   and quote the specific guideline's own words for the rest (the A19 pattern: table volume, then
   "EAS 3.14 allows up to 40 mL/kg").

**What this means for every chat and every change**
- Nothing clinical goes on screen without a row in GUIDELINE-TRACE.md naming the guideline, the page, and
  whether the value is looked up, fixed, counted or calculated.
- Not in the guideline: not shown as guidance. A missing or unclear dose shows no number and
  "Seek clinical advice".
- App mechanics (recording, clocks, undo, double-tap locks, log, export) are not guidance. They are
  listed as such in GUIDELINE-TRACE.md and must never look like a guideline instruction.
- Anything that does not yet follow the principle is on the **deviations list in GUIDELINE-TRACE.md**. Each one
  needs an owner ruling: make it match the guideline, remove it, or keep it labelled as an owner
  addition (which weakens the position below).

## 2. Regulatory position (not legal advice; nothing here is confirmed by a regulator)
- **The owner's position:** a dynamic display of existing guidance that makes no decisions is not a
  medical device. The principle above exists so that this can be shown by one check: the app matches
  the guideline.
- **Where the position is weaker than it sounds (audit, 15 Nov 2026):**
  1. Choosing *which* guideline line to show for *this* patient *now* (dose for the weight band,
     "amiodarone due" at the third shock, fluids after PEA) applies guideline rules to patient data
     even when no arithmetic is done. Regulators generally judge software by its intended purpose
     and patient-specific output, not by whether it multiplies. The principle makes the app easy to
     verify; it does not by itself settle the legal question.
  2. Every deviation in GUIDELINE-TRACE.md is content that is not the guideline. Each one left in place
     undercuts "it only shows the guideline".
  3. The editor (section 9) lets an editor type anything. The claim then rests on the editor's checks
     (citation required, word-for-word extracts, approval record), not on the app.
- **Open questions only the owner can settle (listed in section 6 "Waiting for the owner"):**
  Medsafe's view (NZ has no software-specific rules yet; Medsafe applies the general device
  definition by intended purpose); Apple review rule 1.4.2 (dose calculators must come from an
  approved body such as a hospital or university, or have regulator approval; Apple is likely to
  treat a weight-to-dose look-up as a dose calculator); permission from the guideline's owner to
  reproduce CPG text and PDFs in a published app (the packaged exports are marked "uncontrolled
  document"); who keeps the app in step when the guideline changes.
- **Context (owner, 15 Nov 2026):** the owner's employer, Wellington Free Ambulance, is on the CPG
  working group and endorses the product. Endorsement is not yet written permission to reproduce
  the guideline, nor publication by an approved body (Apple rule 1.4.2); both are still to ask.

## 3. Owner decisions
Numbers 2, 7 and 8 are quoted in code and tests: never renumber them.

| # | Decision |
|---|---|
| 2 | **Weight rounding.** Weights are entered in whole kg only (ruling D7, 15 Nov 2026). Children: weight rounded **up** to the EAS 7.2 bands 5, 10, 20, 30, 40 kg (EAS 7.2 page 1 states this). Over 40 kg: adult doses. RSI doses for adults: the next 10 kg column up in the EAS 9.3 adult table (50 to 90 kg); over 90 kg uses the "≥ 100 kg" column; the RSI pop-up says "weight rounded up to the next column" (ruling D8). Weights under 5 kg use the 5 kg band. |
| 3 | "+ Previous shock" adds 1 to the shock count (no time, no rhythm). App mechanic. |
| 4 | Portrait only. |
| 5 | Clinical changes are made one at a time, each an approved row in the A-table (section 7) with its own test. |
| 7 | **Dose rules.** (1) The band weight (decision 2) is used for every dose. (2) A calculation is allowed only where the guideline gives a formula and prints no value, and its trace is in GUIDELINE-TRACE.md (principle 2 and 4). (3) A dose that is missing or unclear in the guideline shows "Seek clinical advice" and no number. (4) The screen shows the outcome; the working is in GUIDELINE-TRACE.md for reviewers. |
| 8 | **Band tables are the authority.** The EAS 7.2 band tables (`cpg-paediatric-equipment.pdf` pages 5 to 15) are the source for child drug doses, tube size and length, shock energy and airway device (LMA). Weight from age uses the table headings; age is entered in whole years only, plus "under 1 year" (ruling D7); age 14 is adult. RSI doses use EAS 9.3. |
| 9 | **Test-case limits (testing only, not app rules):** new generated or recorded test cases run at most 90 minutes of case time and at most 10 adrenaline doses. Existing recordings are not edited or skipped. |
| 10 | **`main` is the live app.** Standing permission to publish without asking each time, for complete releases only (README "Release"). Git history is the rollback. |
| 11 | **Store apps:** developer accounts go under the owner's personal name (see section 6, item 5, for what that costs). |
| 12 | **Timeline:** the goal is store publication by the end of December 2026. It is a goal, not a deadline: if it is not realistic it moves. Nothing is rushed or skipped to meet it. |
| 13 | **Models:** Fable is not available after 15 Nov 2026. The orchestrator, hard build steps and every review use Opus; routine build steps use Sonnet (README "How the build is run"). |
| 14 | **Deviation rulings, 15 Nov 2026 (D1 to D8).** D1 fluids only while the latest rhythm is PEA, no-shock choices PEA and Asystole; D2 pads prompt removed; D3 shock energy as printed (child range, "Maximum joule setting for an adult"), nothing pre-filled; D4 amiodarone card only in VF or VT once the shock count is met, magnesium holds the card once torsades is recorded; D5 EAS 3.14 p13 reversible causes; D6 every guidance sentence word for word, a summary or omission only by an owner ruling (shown "Summary: see EAS [number] [title]" with its link), fentanyl SBP threshold and all amiodarone contraindications shown; D7 whole years and whole kg; D8 adult RSI rounding kept and stated. Detail: GUIDELINE-TRACE.md section 5; rows A20 to A31 in section 7. D9 to D12 still wait. |
| 15 | **Citations (Q9).** Every clinical value and sentence in the rule set carries its guideline number and page, and the checker refuses one without; a test compares every extract with the guideline text. Where the app follows an owner ruling it cites "Owner ruling 15 Nov 2026" plus the guideline it rests on. On screen: one short source line per card or pop-up (for example "EAS 3.14 Cardiac Arrest, p1"). The settings tab links each guideline used, by number and title (website online, packaged PDF offline). May be revised if screens become hard to read. Guidelines are named by number and title; the official source is the NZ CPG website, built from the PDFs. |
| 16 | **Checker relationship rules (Q10).** All stay switched on except "each child band shock energy equals the band weight times the joules per kg", which goes (D3). The two rules that compare the adult shock energy as a number wait for one owner answer (waiting list 1). |
| 17 | **Order of work (Q11).** Make the app match the principle (rows A20 to A32 and step P3), then the first editor (E2, E3), then release v24, then store apps; editor stages 3 to 10 after store publication. |

**Rulings made before the principle** (fluids after Asystole and "Other"; pads prompt; single
shock energies; amiodarone card whatever the rhythm; ANZCOR causes; shortened wording) were
reversed by decision 14. They stay in the app until rows A20 to A31 are built.

## 4. Project and current state
Pocket Resus (github.com/Dklapaukh/Pocket_Resus; live at dklapaukh.github.io/Pocket_Resus): an
offline phone app that runs a cardiac arrest as an active flowchart and records events. It shows
NZ EAS CPG content only (sections 1 to 3). The owner is a clinician, not a developer, and is the clinical
reviewer. Independent clinical review comes after the deviation rulings (GUIDELINE-TRACE.md).

- **Live: v23** (published 13 Nov 2026; owner phone check passed 14 Nov 2026). It loads
  `nz-eas.json`. The owed v23 check of "Other" (A7) is no longer needed: A20 removes "Other".
- **On `rules-editor`, not live:** rule set as YAML (`src/rules/nz-eas.yaml`), the checker and the
  what-changed tool, and the changes listed under "Changes not yet live".

## 5. Build queue (README "How the build is run" has the method; commit messages hold each step's proof)
| Step | State |
|---|---|
| 0 Safety net (`tests/reference/`, 3,609 recorded cases) | Done |
| 1 Rule set as a data file; 2 remaining text and settings into data | Done |
| 2b Safer update (`sw.js`), v23 published | Done |
| E1 Checker and what-changed tool (`src/rules/check.js`, `tools/rules-diff.mjs`) | Done |
| E1b Rule set as YAML, strict reader and byte-for-byte writer | Done |
| A9 to A12, A15 to A19 (guideline tables instead of calculations) | Done, not live |
| P1 Trace check of GUIDELINE-TRACE.md (found D9 to D12) | Done |
| P2 Deviation rulings | D1 to D8 ruled 15 Nov 2026: rows A20 to A26 approved, **next: build A20**, one row per chat. D9 to D12 wait for the owner |
| P3 Citations in the rule set; word-for-word extract test | Approved (owner ruling Q9). After A26, before A27 |
| P2 continued: A27 to A31 (word-for-word wording, D6), then A32 (source lines and guideline links, Q9) | Approved. After P3 (A32 also needs the web addresses, waiting list 3) |
| E2 Editor page, Rules view | After A32. Checker rules settled (Q10) except one point (waiting list 1) |
| E3 Approve, publish, rollback | After E2; needs a short design note first |
| v24 release | After P2 rulings are built and E3 |
| S Store apps | Owner actions can start now (below); build after v24 |
| 3 to 10 Deeper editor stages | After store publication (owner ruling Q11) |

### Work plan, step by step
Order is the owner's (owner decision 17): rows A20 to A26, P3, A27 to A32, E2, E3, v24, store apps. Proof for every step: tests pass before and
after; screens identical to the reference except where an approved A-row says otherwise; reviewer
has no blocking findings.

| Step | Goal | Extra proof | Worker |
|---|---|---|---|
| A-row (rows from P2) | Build one approved row from section 7 exactly as written. Add its test and its entry in `tests/helpers/approved-changes.mjs`; never edit the frozen copies. Run the what-changed report on all cases; the reference is re-recorded from the change's commit only after the report shows every difference is the approved change (in an owner-started chat: see "Running unattended"). Shrink the row in section 7 to one line; update GUIDELINE-TRACE.md | What-changed report lists only the row's screens; no saved session differs unless the row says so | Sonnet · high |
| P1 | **Trace check.** Read GUIDELINE-TRACE.md and the rule set against the text of each packaged PDF (`pdftotext -layout`), cell by cell for sections 1 to 3. Then search the rule set's `wording` and `checklists` for any clinical sentence or number with no row in GUIDELINE-TRACE.md. Correct GUIDELINE-TRACE.md; list anything new as a further deviation (D9 onward) with options, under section 6 question 1. No app change | Every row of GUIDELINE-TRACE.md marked checked, with the page; reviewer re-checks 15 cells chosen at random | Opus · high |
| P2 | **Deviations.** For each owner ruling on D1 to D12: write the full A-row, then build it as an A-row step. One ruling, one row, one chat | As for an A-row | Sonnet · high |
| P3 | **Citations** (approved, owner decision 15). Each clinical value and sentence in the rule set gets its guideline and page (a parallel `citations` block beside `notes`, so no existing value moves); checker rule: none missing; new test compares every sentence marked as an extract with the PDF text. Read section 9 "What the guiding principle requires" | All existing values identical; a planted missing citation and a planted one-word change to an extract are both caught | Sonnet · high |
| E2a | **Editor page, read-only.** A separate offline page of the same site that opens the rule set and shows every value of the five parts with its note and citation; tabs Rules, Tests, Publish (shells). Read editor decisions 20, 23, 24, 26 and the `frontend-design` guidance. Start with a one-page design note; reviewer checks the note before any code | Every value reachable; live app files unchanged | Opus · high |
| E2b | **Editing and saving.** Edit any value; the checker runs as you type and blocks saving an invalid rule set; do the "before the editor saves files" items in section 8 first | Open the reference rule set and save without edits: file identical byte for byte; invalid edits cannot be saved | Opus · high |
| E2c | **What-changed view and large-change confirmation** (editor decision 18). **Owner tries the editor after this step** | Planted edits appear in the view; a doubled dose needs the typed confirmation | Opus · high |
| E3 | **Approve, publish, rollback** (editor decisions 18, 20, 21, 26). Design note first (how a confirmed rule set goes live; whether the phone runs the checker or checks a fingerprint): the owner approves the note before any code | Rollback restores the previous rule set exactly; the what-changed report is part of the approval record | Opus · high |
| v24 | **Release** (attended chat only): see "Release" | Owner phone checks | Orchestrator |
| S1 | **Store apps, design note:** how the same files are wrapped for Android and iPhone, built by GitHub Actions, with the rule set still updatable; privacy policy and store listing text; what each store will ask about medical content (section 2 "Regulatory position"). Owner approves the note | Note only | Opus · high |
| S2 | Build the wrappers and the GitHub Actions build; test builds the owner can install | Wrapped app behaves as the web app offline; update path proved | Sonnet · high |
| S3 | Closed test, store submissions (owner's accounts and actions; Claude prepares the material) | Store acceptance | Owner, with Sonnet · medium |

**After store publication (unless the owner reorders): the deeper editor.** Each stage starts with
a design note reviewed before code, and is cut into steps of at most one chat each.

| Stage | Goal | Extra proof | Worker |
|---|---|---|---|
| 3 | Facts, flags and rule tables: the engine reads ordered tables for the lower slot, torsades flag, amiodarone due and visibility, second-dose and child-advice cases and their precedence, special situation, after-ROSC states, locks (section 9 list A, D). Save the "card has appeared" memory | Table-driven engine equals the current engine on every generated case | Opus · xhigh, 3 steps |
| 4 | Drugs as data and one general card builder; dose methods per section 9 principle point 3; any number of cards (editor decision 14). **Owner phone check** | With the two reference cards the screen markup is identical; a test-only third card works | Opus · xhigh, 3 steps |
| 5 | Pop-ups, triggered prompts, situations, on-demand cards, addable checklists (list B, E; editor decision 16) | Identical screens; test-only examples of each block work | Opus · high, 3 steps |
| 6 | Appearance settings (editor decision 22). **Owner phone check** | Default settings give identical screens and styles | Opus · medium |
| 7 | Full checker (every table ends in "otherwise", no unreachable row, exactly one answer), formula box within its limits (editor decision 13), scenario runner | Rejects at least 30 deliberately bad rule sets and accepts the reference | Opus · xhigh, 3 steps |
| 8 | Editor: App view, Appearance and Tests tabs, scenario recorder by tapping (editor decisions 12, 19). **Owner tries it** | Round trip identical; every item of section 9's list reachable from both views | Opus · high, 3 steps |
| 9 | Trial with a second, deliberately different rule set to find anything still NZ-EAS-specific in code | Second rule set runs with no code change | Opus · high |
| 10 | Guideline candidates G1, G2, G3, G10, G11 through the editor only, one at a time, each an owner-approved A-row with GUIDELINE-TRACE.md rows | Each appears in the what-changed report and nowhere else | Sonnet · medium; clinical cross-check Opus · high |

## 6. Waiting for the owner (ask in this order, one at a time)
Owner rulings of 15 Nov 2026 (D1 to D8, Q9 citations, Q10 checker, Q11 order of work) are recorded
in sections 1 to 3, GUIDELINE-TRACE.md section 5 and the A-table below.
1. **Checker rules that compare the adult shock energy (from Q10).** Q10 keeps every
   relationship rule on except rule 2. Rule 3 ("the last child band reaches the adult limit")
   compares weights (40 kg), so it still works. But two rules compare a number with the adult
   shock energy, and A22 replaces that number with the words "Maximum joule setting for an adult":
   rule 1's shock-energy part ("no child band shock energy is above the adult value") and rule 4
   ("the adult shock energy is not above the highest energy that can be recorded").
   **A (recommended): replace both with one rule:** "No child band energy (either end of the
   printed range) is above the highest energy that can be recorded." Rule 1 keeps adrenaline,
   amiodarone and magnesium. Still catches typing slips (1600 J) without an adult number.
   **B: drop both** (rule 1 keeps adrenaline, amiodarone and magnesium; nothing checks energies).
2. **Unattended runs and the recordings.** Today an unattended run may not re-record the reference
   recordings, so it builds an approved A-row uncommitted and an owner-started chat must finish it.
   The next scheduled run then sees that waiting row and stops, so the schedule builds **one row,
   then waits for the owner** (13 rows are now approved). **Option A (recommended): allow an
   unattended run to commit and re-record for an approved A-row** when the what-changed report
   shows that every difference is the approved change and the reviewer has no blocking findings.
   **Option B: keep today's rule** (one owner-started chat per row).
3. **Web addresses for A32** (the settings-tab guideline links). Known: EAS 3.14 Cardiac Arrest
   https://cpg.stjohn.org.nz/tabs/guidelines/cardiac-eas/page/cardiac-arrest-eas; EAS 9.3 RSI
   (Rapid Sequence Intubation)
   https://cpg.stjohn.org.nz/tabs/guidelines/intubation-and-ventilation/page/rsi-rapid-sequence-intubation-eas
   (linked from the EAS 7.2 PDF); EAS 14.27 Magnesium sulphate
   https://cpg.stjohn.org.nz/tabs/medicines/page/magnesium-sulphate-eas. **Not yet confirmed**
   (the website cannot be read from here): EAS 7.2 Paediatric Equipment and Drug Doses, EAS 9.2
   Airway Backup Checklist, EAS 3.15 Treatment following ROSC, EAS 9.4 RSI Checklist, EAS 14.3
   Adrenaline, EAS 14.4 Amiodarone. Owner action: copy each page's address from the website.
4. **Deviations D9 to D12** (GUIDELINE-TRACE.md section 5): one ruling each. Option A recommended for each.
   - **D9** child second amiodarone (now "Seek clinical advice", A10; EAS 3.14 says "See the
     paediatric drug dose tables for a child"). **A (recommended):** at the second-dose point show
     the EAS 3.14 sentence "See the paediatric drug dose tables for a child" and the band's EAS 7.2
     table row exactly as printed, without the app calling it the second dose. A reverses
     owner-approved A10 and needs the owner's clinical sign-off. **B:** keep "Seek clinical advice"
     (A10), with the source line quoting that EAS 3.14 sentence and saying the tables print one
     amiodarone dose per band.
   - **D10** child magnesium time not shown (EAS 7.2: "over approximately 15 minutes, preferably
     into a running line"). **A (recommended):** show EAS 7.2 dilution 13 word for word, including
     that administration sentence. **B:** keep the time out, with the line "Administration time: see
     EAS 7.2, dilution 13". (Under D6 a left-out sentence needs this ruling.)
   - **D11** adult doses above 40 kg and with no weight, without EAS 7.2's caution. **A
     (recommended):** above 40 kg, show in full, word for word, the EAS 7.2 sentences "Children
     weighing greater than 40 kg can usually be administered adult doses, but clinical judgement
     must be used if the dose may be potentially harmful, for example when administering
     paracetamol. If there is any doubt, a paediatric dose should be administered." with the adult
     dose; with no weight entered, label the dose with EAS 3.14's own words "for an adult" instead
     of "weight band above 40 kg". **B:** keep today's label.
   - **D12** two magnesium sentences (adult dilution to 10 mL; avoid the adrenaline-infusion line)
     with no packaged source (EAS 14.27 is online only). **A (recommended):** package the EAS 14.27
     export, check both sentences against it word for word, and quote them as written. **B:** remove
     both sentences until EAS 14.27 is packaged.
5. **Store publication, owner actions** (these have waiting times, so they decide the date):
   - Ask Medsafe whether the app is a medical device (section 2 "Regulatory position").
   - Written permission from the guideline's owners to reproduce CPG text and PDFs in a published
     app. The owner's employer, Wellington Free Ambulance, is on the CPG working group and endorses
     the product: ask whether it would publish the app or give that permission in writing. An
     organisation publishing it would also answer Apple rule 1.4.2 and remove Google's testing
     requirement.
   - Under a personal account (decision 11): Google needs a closed test with 12 testers for 14 days
     before public release; Apple rule 1.4.2 is not satisfied.
   - Open the developer accounts; recruit the 12 testers.
6. Smaller items, each a possible A-row: a manual entry timed later than now is saved as the
   previous day (on purpose, for a case crossing midnight); closing the rhythm pop-up with × leaves
   "Rhythm not recorded"; the tutorial step "Find weight-based RSI doses" still says doses "are
   calculated from the entered weight" (they are looked up since A12); the start-up message shown
   when the rule set cannot be read (wording in `src/rules/parse.js`) may be reworded.
7. **Paediatric pads prompt:** removed 15 Nov 2026; may return as an owner addition once the
   corpuls criterion (weight, age or energy) is supplied.

## 7. A-table: changes not yet live
No clinical number, wording, timing or behaviour changes unless it is an approved row here. A new
row is written in full (what changes, which screens, the test, the guideline source in GUIDELINE-TRACE.md
terms) and shown to the owner; once applied it shrinks to one line and GUIDELINE-TRACE.md carries the result.
Rows already live (A1 to A8, C6b-2) are no longer listed: their behaviour is in GUIDELINE-TRACE.md.

| ID | Change (applied on `rules-editor` unless stated) | Phone check at the next release |
|---|---|---|
| A9 | Child magnesium, 5 and 10 kg bands: "Seek clinical advice" in three places (062e27a) | 7 kg, torsades shock: card and pop-up say "Seek clinical advice" |
| A10 | Child second amiodarone dose: stored numbers deleted; dose line empty after two doses (04d2b32) | 15 kg, 3 shocks, dose 1, 3 more shocks, second dose by "Other…": dose line empty |
| A11 | Child fluids from the band weight (ae7f337); its calculated upper end was replaced by A19 | See A19 |
| A12 | RSI doses from the EAS 9.3 tables (7ed57db) | 45 kg: fentanyl 100 mcg, blocker 100 mg; 3 kg: "Seek clinical advice" four times |
| A15 | LMA from the EAS 7.2 band table; iGel list removed (ba1304d) | 15 kg: "LMA size 2 · cuff 10 mL", no iGel list |
| A16 | Weight from age from the band table headings; age 14 fills no weight (1093424) | Age 6: 30 kg, 120 J; age 14: "Age 14: adult. Enter the weight." |
| A17 | Tube sizes "Use age" with an empty box saves nothing (c4d095f) | Guidance, Tube sizes, Use age with an empty box: nothing saved, "Enter weight or age…" |
| A18 | Tube size and length from the EAS 7.2 band table (24e73f1) | 15 kg: "4 or 5 mm", "15 cm"; 60 kg: adult line |
| A19 | Child fluids: the EAS 7.2 table volume only (100, 200, 400, 600, 800 mL by band); the pop-up's source line adds "EAS 3.14 allows up to 40 mL/kg"; nothing calculated (99388e2; recordings 5760f47) | 15 kg, PEA: card "400 mL IV"; pop-up "400 mL from the *EAS guideline 7.2* table (20 mL/kg); *EAS guideline 3.14* allows up to 40 mL/kg" |

**Approved 15 Nov 2026 (owner rulings), not built.** Build in this order, one row per chat: A20 to
A26, then step P3, then A27 to A31, then A32. Every row: tests named below; extracts compared with
the packaged PDF text; GUIDELINE-TRACE.md rows updated; source cited "EAS [number] [title], p[n]" or "Owner
ruling 15 Nov 2026" plus the guideline it rests on. Rows superseding an earlier row (A1, A2b, A2c,
A7) update that row's test to the new approved behaviour; that is not a loosening.

| ID | Change (approved, not built) | Phone check at the next release |
|---|---|---|
| A20 | **D1, fluids after PEA only.** No-shock check choices: PEA and Asystole only ("Other" leaves `numbers.rhythms.noshock` and the no-shock list of the correction sheet; ROSC "Other" stays, A8; the "Other…" drug or fluid entry stays). `numbers.lowerCard.fluidRhythms`: PEA only. Lower card by the latest recorded rhythm: PEA: fluids card, plus the magnesium card if torsades was recorded earlier; Asystole: blank, or magnesium if torsades was recorded; "Rhythm not recorded" changes nothing (as today); a v23 saved session whose latest rhythm is "Other" counts as not PEA. Fluids pop-up opens only after PEA; its title becomes the guideline heading "If the patient is in PEA" (was "Non-shockable rhythm · fluid guidance"). Screens: rhythm check (no shock), correction sheet, Live lower card, fluids pop-up. Test `a20-fluids-pea-only` (PEA; Asystole; torsades then PEA; torsades then Asystole; no "Other" choice); a2c and a7 tests move to this row. Source: EAS 3.14 Cardiac Arrest, p2; Owner ruling 15 Nov 2026 (D1) | 20 kg: PEA: fluids card "400 mL IV"; Asystole: lower card blank; no "Other" at the no-shock check; torsades shock then PEA: fluids and magnesium |
| A21 | **D2, pads prompt removed.** Delete wording `padsPrompt`, `padsPromptWithLimit`, number `numbers.shock.paediatricPadsUpToJ`, their checker entries and the code that shows the prompt. Screens: Live header. Test `a21-no-pads-prompt` (5, 10, 20 kg and adult: no prompt). Source: Owner ruling 15 Nov 2026 (D2); EAS 3.14 Cardiac Arrest, p10 | 10 kg: no "Use paediatric pads" |
| A22 | **D3, shock energy as printed.** Child band: the EAS 7.2 range as printed, "20-25 J", "40-50 J", "80-100 J", "120-150 J", "160-200 J" (`childBands.*.shockJ` becomes `shockRangeJ: [low, high]`). Adult: "Maximum joule setting for an adult." (`numbers.adult.shockJ` 200 deleted; the words are wording). `headerEnergyTitle` becomes the source line. Shock record sheet: energy box empty, never pre-filled; `energyEstimated` ("est.") deleted; the recorded energy is what the clinician types (optional, as today). Checker: rule 2 (band energy = weight × J/kg) removed (Q10); rules 1 and 4 wait for waiting list 1; new shape check: low ≤ high. Screens: Live header energy, shock record sheet, weight-from-age result. Test `a22-energy-as-printed` (each band, adult words, empty energy box, saved energy equals typed); a1 test moves to this row. Source: EAS 7.2 Paediatric Equipment and Drug Doses, p5, p8, p10, p12, p14 ("Manual defibrillation"); EAS 3.14 Cardiac Arrest, p1 | 15 kg: header "80-100 J"; 60 kg: "Maximum joule setting for an adult."; shock sheet energy box empty; age 6: "120-150 J" (replaces A16's "120 J") |
| A23 | **D4, amiodarone in VF or VT only.** The amiodarone card shows only while the latest recorded rhythm is VF or VT **and** the shock count (including "+ Previous shock") has reached 3; second-dose state at 6. Not shown before 3 (`amiodaroneNotYetDue` deleted); hidden after PEA or Asystole (lower card then follows A20); back when VF or VT is recorded again and the count is met. First lines, word for word: at 3, "If in VF or VT after three shocks, including shocks delivered prior to ambulance arrival:" "Administer amiodarone:" then "300 mg IV for an adult." or the child band dose (as today); at 6, "If in VF or VT after six shocks, including shocks delivered prior to ambulance arrival, administer a second dose of amiodarone:" then "150 mg IV for an adult." or, for a child, "Seek clinical advice" (A10; D9 waits). Deleted (no guideline sentence): "Review at {shocks} shocks", "Due after {second} shocks"; "{maxDoses} doses recorded" stays (a record count). Torsades: once recorded, magnesium holds the card for the rest of the arrest whatever the later rhythm (with fluids when the latest is PEA, A20); amiodarone stays withheld. Screens: Live lower card. Test `a23-amiodarone-vf-vt-only` (3 earlier shocks, no rhythm: hidden; VF: shown with the sentence; Asystole: hidden; VF again: back; sentence at 6; torsades then VF: magnesium; extracts equal the PDF text); a2b test moves to this row. Source: EAS 3.14 Cardiac Arrest, p1, p2; Owner ruling 15 Nov 2026 (D4) | 3 × "+ Previous shock", no rhythm: no amiodarone card; shock in VF: card starts "If in VF or VT after three shocks"; then Asystole: card gone |
| A24 | **D5, EAS reversible causes.** The eight ANZCOR prompts (`checklists.causes` with their `plain` and `text` advice) and `sources.reversibleCauses` ("ANZCOR 11.2") are replaced by, word for word: "Potentially reversible causes of PEA include:" "Hypoxia." "Hypothermia." "Hypovolaemia (including anaphylaxis)." "Hyper/hypokalaemia (and other metabolic abnormalities)." "Tension pneumothorax." "Tamponade (cardiac)." "Toxins (poisoning)." "Thrombosis (pulmonary and coronary)." Shown as text, in any rhythm (Guidance tab, `causesHeading`); the caption's "Reversible causes: …" goes. A button "EAS 3.14 Cardiac Arrest ↗" opens https://cpg.stjohn.org.nz/tabs/guidelines/cardiac-eas/page/cardiac-arrest-eas online and `cpg-cardiac-arrest.pdf#page=13` offline. Screens: Guidance tab. Test `a24-reversible-causes-eas` (nine lines equal the p13 text; no ANZCOR text anywhere; link online and offline). Source: EAS 3.14 Cardiac Arrest, p13; Owner ruling 15 Nov 2026 (D5) | Guidance: the heading and eight causes; link opens EAS 3.14; in airplane mode the PDF at page 13 |
| A25 | **D7, whole years and whole kg.** Age box: whole years 1 to 14, plus "under 1 year"; part-year rounding removed. Every weight box (child and adult): whole kg only; no decimal point; a decimal is refused. `invalidWeight` becomes "Enter a whole number of kg above zero and no more than {maxKg} kg." (app text); the age captions lose "Age rounded up to the next whole year." A weight already saved with a decimal (a v23 session) is kept as saved. Screens: weight sheet, Tube sizes age box. Test `a25-whole-age-weight`. Source: Owner ruling 15 Nov 2026 (D7); EAS 7.2 Paediatric Equipment and Drug Doses, p5, p8, p10, p12, p14 (whole-year headings) | Weight keypad has no decimal point; age 5.5 not accepted |
| A26 | **D8, adult RSI rounding shown.** The RSI pop-up, whenever an adult column is used, adds "weight rounded up to the next column" (app text). Rounding unchanged (decision 2). Screens: RSI pop-up. Test `a26-rsi-rounding-line` (45 kg and 95 kg: line shown; 20 kg child: not shown). Source: Owner ruling 15 Nov 2026 (D8); EAS 9.3 RSI (Rapid Sequence Intubation), p2 | 45 kg: RSI pop-up shows "weight rounded up to the next column" |
| A27 | **D6, torsades, magnesium and fluids lines word for word.** `magnesiumFirstStatus` and `withholdTorsades`: "Withhold amiodarone."; `magnesiumRepeatStatus`: "Repeat once if torsades de pointes recurs or persists."; `magnesiumMaxDosesStatus` ("2 doses · clinical review") deleted, the card uses "{maxDoses} doses recorded"; torsades pop-up title: "If torsades de pointes is present or has occurred"; `torsadesExtract`: "10 mmol (2.5 g) over 1-2 minutes for an adult." "See the paediatric drug dose tables for a child." "Repeat once if torsades de pointes recurs or persists."; `fluidsExtract`: "1-2 litres IV for an adult." "20-40 ml/kg IV for a child." ("Assess and treat the reversible cause." deleted); `amiodaroneAfterTorsadesWarning`: "If torsades de pointes is present or has occurred" "Withhold amiodarone." plus the app text "This form records an actual event, not a recommendation."; `repeatMagnesium`: "One dose is already recorded." (app text) plus "Repeat once if torsades de pointes recurs or persists." Screens: Live lower card, torsades and fluids pop-ups, amiodarone "Other…" form, repeat-magnesium sheet. Test `a27-torsades-fluids-extracts`. Source: EAS 3.14 Cardiac Arrest, p2 | Torsades shock: card "Withhold amiodarone."; pop-up lines as written |
| A28 | **D6, adrenaline and amiodarone pop-ups word for word.** `adrenalineHow`: "Administer adrenaline IV every four minutes:" (EAS 3.14 p1); "Cardiac arrest:" "Adults and children whose weight has been rounded to 50 kg or more: administer undiluted as an IV bolus." "Children whose weight has been rounded to 40 kg or less: dilute 1 mg of adrenaline to a total of 10 ml using 0.9% sodium chloride. This solution is 1:10,000 and contains 0.1 mg/ml. Draw up the dose from this solution and administer as an IV bolus." (EAS 14.3 p2). `amiodaroneHow`: "Cardiac arrest: administer IV undiluted as a bolus." (EAS 14.4 p3); "Contraindications" "Known severe allergy." "Known severe allergy to iodine." "VT secondary to cyclic antidepressant poisoning. In this setting amiodarone administration can be associated with severe worsening of shock, without resolution of the rhythm." "If torsades de pointes is present or has occurred." (EAS 14.4 p1; reverses the 11 Nov exclusion). Dose lines: the A23 sentences with "300 mg IV for an adult." and "150 mg IV for an adult." (replace `amiodaroneAdultPopupDose`); child as A23. Not in this row: the magnesium pop-up (waits for D10, D12) and `selectDoseAdvice` (D9). Screens: adrenaline and amiodarone pop-ups. Test `a28-drug-popup-extracts`. Source: EAS 3.14 Cardiac Arrest, p1; EAS 14.3 Adrenaline, p2; EAS 14.4 Amiodarone, p1, p3 | Amiodarone pop-up lists the four contraindications |
| A29 | **D6, Guidance opening text and special situations word for word.** `guidanceIntro`: item 1 stays (app text: what the app is); items 2 and 3 become: "This guideline is for adults and children in non-traumatic cardiac arrest." "Perform two-minute cycles of high performance CPR between rhythm checks." "Administer adrenaline IV every four minutes:" "1 mg IV for an adult." "See the paediatric drug dose tables for a child." "If in VF or VT after three shocks, including shocks delivered prior to ambulance arrival:" "Administer amiodarone:" "300 mg IV for an adult." "See the paediatric drug dose tables for a child." "If in VF or VT after six shocks, including shocks delivered prior to ambulance arrival, administer a second dose of amiodarone:" "150 mg IV for an adult." "See the paediatric drug dose tables for a child." "Maximum joule setting for an adult." "See the paediatric drug dose tables for joule settings for a child." (EAS 3.14 p1); "The following pages contain tables of paediatric drug doses. They are based on rounding the child’s weight up to 5, 10, 20, 30 or 40 kg." (EAS 7.2 p1); "The usual recommended defibrillation energy for a child is 4 J/kg, but this may not be available for all defibrillators. If the recommended defibrillation energy level is not available, select the next highest level." (EAS 7.2 p2); app text kept: "A no-shock cycle is counted only when recorded." `specialNote`: "See the ‘cardiac arrest secondary to trauma’ guideline if the cardiac arrest is secondary to trauma." (EAS 3.14 p1), then the headings as printed: "Cardiac arrest secondary to drowning", "Cardiac arrest secondary to hanging" (p16), "Cardiac arrest secondary to asthma", "Cardiac arrest secondary to anaphylaxis", "Cardiac arrest secondary to cyclic antidepressant poisoning" (p17), "Cardiac arrest during pregnancy greater than 20 weeks", "Cardiac arrest secondary to hypothermia", "Cardiac arrest secondary to hyperkalaemia", "Cardiac arrest secondary to opiate poisoning" (p18). Screens: Guidance tab, settings special-situation note. Test `a29-guidance-text-extracts`. Source: EAS 3.14 Cardiac Arrest, p1, p16–18; EAS 7.2 Paediatric Equipment and Drug Doses, p1, p2 | Guidance opening text as written; no "capped at 200 J" |
| A30 | **D6, RSI text word for word.** `guidanceRsi` and `rsiConditions` become: "Administer 2 mcg/kg of fentanyl IV (up to a maximum of 200 mcg) immediately prior to ketamine if the patient has:" "Traumatic brain injury, or" "Suspected intracranial pathology, or" "Hypertension (SBP > 150 mmHg in an adult)." "Withhold fentanyl if the above clinical indications are not present, or there are signs of shock." "Administer 2 mg/kg of ketamine IV (up to a maximum of 200 mg) for most patients." "Consider reducing the dose to 1 mg/kg if:" "There are signs of shock, or" "Sedative medicines have already been administered or taken." "Administer neuromuscular blockade:" "2 mg/kg of rocuronium IV, or" "2 mg/kg of suxamethonium IV." (EAS 9.3 p1); "Do not reduce the dose of ketamine in the setting of RSI for prolonged seizures." "2 mg/kg of rocuronium or suxamethonium (to a maximum of 200 mg) is an appropriate dose for all patients." (p4); "The dose should usually be rounded to the nearest 50 mg in adults." (p5). Deleted: "Alternatives, not both", "Use the full RSI CPG…" (A32's link replaces it). Shows the fentanyl SBP threshold (reverses the 11 Nov exclusion). Screens: Guidance RSI section, RSI pop-up. Test `a30-rsi-text-extracts`. Source: EAS 9.3 RSI (Rapid Sequence Intubation), p1, p4, p5 | RSI text shows "Hypertension (SBP > 150 mmHg in an adult)." |
| A31 | **D6, tube, age and checklist text word for word.** `tubeCaution`: "Children may require a different sized SGA, ETT or length at lips than that predicted by the formulae."; age captions: "estimates may underestimate" becomes "If the weight is not known, it can be estimated from the child’s age using formulae, noting that the formulae are a guide only and tend to underestimate true weight." (EAS 7.2 p1). Checklists: the EAS 9.2 opening sentence in full, "This checklist should be used to prepare a patient for RSI while awaiting CCP backup."; checklist titles as the PDF headings; "35-45" with the printed hyphen; EAS 9.4 items under their printed section headings, not the heading repeated in each item. Screens: Tube sizes and weight sheets, the four checklists. Test `a31-checklist-text-extracts` (every item equals the PDF text, same order). Source: EAS 7.2 Paediatric Equipment and Drug Doses, p1; EAS 3.14 Cardiac Arrest, p2–3; EAS 3.15 Treatment following ROSC, p2–3; EAS 9.2 Airway Backup Checklist, p1; EAS 9.4 RSI Checklist, p1–2 | RSI checklist shows its section headings once each |
| A32 | **Q9, source lines and guideline links** (after P3). One short source line per card or pop-up, for example "EAS 3.14 Cardiac Arrest, p1", or "Owner ruling 15 Nov 2026 · EAS 9.3 RSI (Rapid Sequence Intubation), p2"; it replaces the guideline part of today's footers and basis lines (`drugPopupFooter`, `adultMagnesiumBasis` and similar; the D11 wording waits). Settings tab: "Guidelines used", one link per guideline by number and title, the website when online and the packaged PDF when offline: EAS 3.14 Cardiac Arrest; EAS 3.15 Treatment following ROSC; EAS 7.2 Paediatric Equipment and Drug Doses; EAS 9.2 Airway Backup Checklist; EAS 9.3 RSI (Rapid Sequence Intubation); EAS 9.4 RSI Checklist; EAS 14.3 Adrenaline; EAS 14.4 Amiodarone; EAS 14.27 Magnesium sulphate (website only until D12). Needs waiting list 3. May be revised if screens become hard to read. Test `a32-source-lines-and-links`. Source: Owner ruling 15 Nov 2026 (Q9) | Each card has one source line; settings lists nine guidelines; airplane mode opens the PDFs |

Withdrawn: A13, A14 (showing the working on screen; decision 7 rule 4).

## 8. Carried forward (not blocking; each has a "do before")
**Before the next release (v24)**
- The start page entry `./` is not part of the install check: require its download to equal `index.html`.
- `tools/check-offline-browser.cjs` sometimes fails at "old store changed" (the test browser still
  checks for updates while "offline"): wait for that install to end.
- Nothing runs the tests on GitHub before a release (a GitHub Actions check would).
- Not checked anywhere: real phones beyond the owner's, iPhone Safari, the bytes GitHub Pages serves.

**Before the editor is used (E2)**
- The 0–100 limit on the earlier-counts boxes is typed in code (three places); its error text is data.
- `index.html` still holds screen text ("Saving unavailable", tab names, header labels).
- Renaming a drug in `wording.drugNames` does not change which hand-typed names count as that drug.
- The checker's ranges only stop the impossible: a tenfold slip passes (adult adrenaline 10 mg).
  The editor's typed confirmation for a large change and the what-changed report are the guard.
- Rhythm names the code relies on (PEA, Torsades and others) can be renamed and the checker passes.
- Bold and italic tags in the wrong order pass; a `<` meaning "less than" is refused.
- The app writes rule-set text into page attributes without escaping it, so the checker refuses
  double quotes. Escape in the app so quotes can be allowed again.
- What-changed tool: two rule sets that fail the checker the same way are reported as the same; a
  case over the testing limits under only one rule set is left out; a reversed range says "nothing
  compared"; it cannot read the YAML of commit e41d850.

**Before the editor saves files (E2)**
- The writer can write `-0`, `1e-7` and `1e21` in a form the reader refuses.
- Numbers over about 16 digits lose their last digits silently: refuse them.
- The reader accepts forms the writer never writes (`|` and `>` text, text carried onto a second
  line, invisible-character escapes, a JSON-style body): refuse them.

**Design question for E3**
- Deleting one whole line from the rules file is still read, and the phone does not run the
  checker. Should the phone run the checker, or check a fingerprint of the rules file?

**Later**
- `src/engine/core.js` lines 274 to 276: the comment on the child second amiodarone dose ("EAS 7.2
  gives none") differs from D9's reading; update it with the D9 ruling.
- EAS 14.27 (magnesium) is not packaged, so two magnesium sentences cannot be checked (D12).
- `tests/a19-child-fluids-table-only.test.mjs` (lines 47 to 51) does not prove that the 20 and 40
  in the source line come from the rule set (A11's test has the same gap): change the rule-set
  value in a test and check the line follows. `tests/a11-child-fluids-band.test.mjs` still carries
  an unused `upper` column.
- Retire the engine's original PEA-only `careMode` (no longer used by any comparison test; only a2c checks it is unchanged).
- The Post ROSC checklist may scroll (owner accepts this).

## 9. Rules editor design
### Goal
Rules can be updated, and rule sets made for other services, without touching code. Nothing goes
live unchecked: plain data in; a checker that blocks impossible values; a "what changed" view;
automatic tests for each rule set; approval before a rule set goes live.

### What the guiding principle requires of the editor (15 Nov 2026)
The editor is where the principle could be broken, because an editor can type anything. So:
1. **Citation required (owner ruling Q9, 15 Nov 2026; owner decision 15).** Every clinical value, sentence and
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

### The rule set
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

### Decisions (numbers are quoted in code: never renumber)
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

### How it works
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

### Behaviour still fixed in code (the work list for stages 3 to 6)
Read from the code at v22 (12 Nov 2026) and corrected for later changes. **Re-read the code at the
start of each stage; this list is a guide, not a specification.** Labels, messages, timer
thresholds, rhythm button names, correction-form lists, resus-start choices, equipment form
questions and export labels became data in stage 2.

**A. Which drug card shows, and when** (stages 3 and 4)
1. Two card slots only: adrenaline on top; the lower slot is fluids, amiodarone or magnesium.
2. Lower slot: the latest recorded rhythm that is in either rhythm list decides (lists are data).
3. Torsades: once recorded, magnesium replaces amiodarone for the rest of the case.
4. Amiodarone due: counts (3, 6) are data; code fixes that earlier shocks count, the case must be
   running, not special situation, torsades never recorded, current rhythm ignored (GUIDELINE-TRACE.md D4).
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
(GUIDELINE-TRACE.md D1); 16. "Repeat magnesium?" and the amiodarone-after-torsades warning; 17. pads prompt
placement (GUIDELINE-TRACE.md D2); 18. arrest checklist reminder; 19. what each administration pop-up contains.

**C. How doses and sizes are found** (stage 4; all look-ups since A9 to A19)
20. No weight = adult; 40 kg or less = child; band rounding. 21. Shock energy by band, adult
otherwise (GUIDELINE-TRACE.md D3). 22. Which table and column each output uses (RSI, tubes, LMA, fluids, age).
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

### Guideline candidates (decision 17; each needs the owner's approval of exact content)
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
