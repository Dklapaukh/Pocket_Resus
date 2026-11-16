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
| 5 | Clinical changes are approved one at a time, each a row in the A-table (section 7) with its own named test and phone check. **Cards plan (owner, 15 Nov 2026):** rows A20 to A32 and P3 are written straight into the new card rule set (`CARDS-DESIGN.md`), not built one at a time on the old file. The one comparison of the new app against v24 (plan step 5) must show only differences that belong to approved A-rows; any other difference is a fault. |
| 7 | **Dose rules.** (1) The band weight (decision 2) is used for every dose. (2) A calculation is allowed only where the guideline gives a formula and prints no value, and its trace is in GUIDELINE-TRACE.md (principle 2 and 4). (3) A dose that is missing or unclear in the guideline shows "Seek clinical advice" and no number. (4) The screen shows the outcome; the working is in GUIDELINE-TRACE.md for reviewers. |
| 8 | **Band tables are the authority.** The EAS 7.2 band tables (`cpg-paediatric-equipment.pdf` pages 5 to 15) are the source for child drug doses, tube size and length, shock energy and airway device (LMA). Weight from age uses the table headings; age is entered in whole years only, plus "under 1 year" (ruling D7); age 14 is adult. RSI doses use EAS 9.3. |
| 9 | **Test-case limits (testing only, not app rules):** new generated or recorded test cases run at most 90 minutes of case time and at most 10 adrenaline doses. Existing recordings are not edited or skipped. |
| 10 | **`main` is the live app.** Standing permission to publish without asking each time, for complete releases only (README "Release"). Git history is the rollback. |
| 11 | **Store apps:** developer accounts go under the owner's personal name (see section 6, item 5, for what that costs). |
| 12 | **Timeline:** the goal is store publication by the end of December 2026. It is a goal, not a deadline: if it is not realistic it moves. Nothing is rushed or skipped to meet it. |
| 13 | **Models:** Fable is not available after 15 Nov 2026. The orchestrator, hard build steps and every review use Opus; routine build steps use Sonnet (README "How the build is run"). |
| 14 | **Deviation rulings, 15 Nov 2026 (D1 to D8).** D1 fluids only while the latest rhythm is PEA, no-shock choices PEA and Asystole; D2 pads prompt removed; D3 shock energy as printed (child range, "Maximum joule setting for an adult"), nothing pre-filled; D4 amiodarone card only in VF or VT once the shock count is met, magnesium holds the card once torsades is recorded; D5 EAS 3.14 p13 reversible causes; D6 every guidance sentence word for word, a summary or omission only by an owner ruling (shown "Summary: see EAS [number] [title]" with its link), fentanyl SBP threshold and all amiodarone contraindications shown; D7 whole years and whole kg; D8 adult RSI rounding kept and stated. Detail: GUIDELINE-TRACE.md section 5; rows A20 to A31 in section 7. D9 to D12: decision 18. |
| 15 | **Citations (Q9).** Every clinical value and sentence in the rule set carries its guideline number and page, and the checker refuses one without; a test compares every extract with the guideline text. Where the app follows an owner ruling it cites "Owner ruling 15 Nov 2026" plus the guideline it rests on. On screen: one short source line per card or pop-up (for example "EAS 3.14 Cardiac Arrest, p1"). The settings tab links each guideline used, by number and title (website online, packaged PDF offline). May be revised if screens become hard to read. Guidelines are named by number and title; the official source is the NZ CPG website, built from the PDFs. |
| 16 | **Checker relationship rules (Q10).** All stay switched on except "each child band shock energy equals the band weight times the joules per kg", which goes (D3). The two rules that compare the adult shock energy as a number (rule 1's shock-energy part and rule 4) are replaced by one rule (owner, 16 Nov 2026): "No child band energy (either end of the printed range) is above the highest energy that can be recorded." Rule 1 keeps adrenaline, amiodarone and magnesium. |
| 17 | **Order of work (Q11; cards plan 15 Nov 2026).** Build the card rule set, engine and checker from the guideline (`CARDS-DESIGN.md` plan steps C1 to C6, with A20 to A32 and P3 inside it), then the first editor (E2, E3), then release v25, then store apps; the remaining editor stages after store publication. The live rule set and engine do not change until step C5. |
| 18 | **Deviation rulings, 16 Nov 2026 (D9 to D12), all option B.** D9 child second amiodarone keeps "Seek clinical advice" (A33); D10 child magnesium time stays out, with a pointer line (A34); D11 today's adult-dose label kept, no change; D12 the two unsourced magnesium sentences removed until EAS 14.27 is packaged (A35). Owner's reason: these are gaps in the guidelines themselves, to be raised with the guideline owner (the owner's employer) later, not fixed in the app. |
| 19 | **Unattended runs may re-record (16 Nov 2026).** An unattended run may commit and re-record the reference recordings for an approved A-row or cards step when the what-changed report shows that every difference is approved and the reviewer has no blocking findings (README "Running unattended"). |
| 20 | **Cards approved (16 Nov 2026).** The owner has read and approved the cards in `CARDS-DESIGN.md`; C2 writes them as designed, with rows A20 to A35. |
| 21 | **Plan simplified (16 Nov 2026).** Order of work unchanged (decision 17). The editor is two steps, E2 (open, edit, what-changed) and E3 (approve, publish, rollback), each starting with a design note; deeper stages 3, 4, 7 and 8 are dropped or folded into E2. At C5, once the comparison passes, the old rule file, old engine, old checker and the tests that only check them are deleted without asking (each named in the commit; recoverable from git history), and DECISIONS.md is trimmed to what is true now. A run skips the "before" tests when the last commit message records both test runs passing on that same commit. |

**Rulings made before the principle** (fluids after Asystole and "Other"; pads prompt; single
shock energies; amiodarone card whatever the rhythm; ANZCOR causes; shortened wording) were
reversed by decision 14. They stay in the app until rows A20 to A31 are built.

## 4. Project and current state
Pocket Resus (github.com/Dklapaukh/Pocket_Resus; live at dklapaukh.github.io/Pocket_Resus): an
offline phone app that runs a cardiac arrest as an active flowchart and records events. It shows
NZ EAS CPG content only (sections 1 to 3). The owner is a clinician, not a developer, and is the clinical
reviewer. Independent clinical review comes after the deviation rulings (GUIDELINE-TRACE.md).

- **Live: v24** (published 15 Nov 2026 at the owner's request, ahead of the planned order). It loads
  the YAML rule set (`src/rules/nz-eas.yaml`) and includes A9 to A12 and A15 to A19. **Owner phone
  checks due:** the standard release checks (README "Release" step 6) and the "Phone check" column of
  the first A-table below. Owner decision 17's "release v24" is now the next release, v25.
- **Cards plan approved** (15 Nov 2026, `CARDS-DESIGN.md`): a new card rule file, engine and checker
  built from the guideline replace building A20 to A32 one row at a time; the formula box is dropped.
  The card rule file is written (C2); the live rule set and engine stay unchanged until step C5.

## 5. Build queue (README "How the build is run" has the method; commit messages hold each step's proof)
| Step | State |
|---|---|
| 0 Safety net (`tests/reference/`, 3,609 recorded cases) | Done |
| 1 Rule set as a data file; 2 remaining text and settings into data | Done |
| 2b Safer update (`sw.js`), v23 published | Done |
| E1 Checker and what-changed tool (`src/rules/check.js`, `tools/rules-diff.mjs`) | Done |
| E1b Rule set as YAML, strict reader and byte-for-byte writer | Done |
| A9 to A12, A15 to A19 (guideline tables instead of calculations) | Done, live in v24; phone checks due |
| P1 Trace check of GUIDELINE-TRACE.md (found D9 to D12) | Done |
| P2 Deviation rulings | Done: D1 to D8 ruled 15 Nov 2026 (A20 to A31), D9 to D12 ruled 16 Nov 2026 (A33 to A35; D11 no change) |
| C1 Cards plan step 1: card format and card checker (`src/cards/`) | Done (reviewed; commit message has the proof) |
| C2 Cards plan step 2: card rule file `src/cards/nz-eas-cards.yaml` (13 cards, EAS 7.2 and 9.3 tables, 4 checklists, 9 guideline links) | Done (reviewed; commit message has the proof). Owner questions before C4: section 6 item 1 |
| C3 Cards plan step 3: card engine `src/cards/engine.js`, group-order check, engine-level A20 to A35 tests | Done (reviewed; commit message has the proof) |
| C4 to C6 Cards plan steps 4 to 6 (screens rewired; one comparison against v24 at C5) | **Waiting for the owner:** section 6 item 1 (a to f) before C4 |
| E2 Editor: open, edit, what-changed (design note first) | After C6. Checker rules settled (decision 16) |
| E3 Approve, publish, rollback (design note first) | After E2 |
| v25 release | After C6 and E3 |
| S Store apps | Owner actions can start now (below); build after v25 |
| 5, 6, 9, 10 Deeper editor stages | After store publication (owner ruling Q11) |

### Work plan, step by step
Order is the owner's (owner decision 17): cards plan C1 to C6 (A20 to A32 and P3 inside it), E2, E3, v25,
store apps. Proof for every step: tests pass before and after; screens identical to the reference
except where an approved A-row says otherwise; reviewer has no blocking findings.

| Step | Goal | Extra proof | Worker |
|---|---|---|---|
| C1 | **Card format and checker** (`CARDS-DESIGN.md` section 2). `src/cards/check.js`: fields, the seven conditions, citation required, every guideline `text` compared with the packaged PDF text (`src/cards/guideline-text.json`, made by `tools/extract-guideline-text.mjs`). Live app untouched | Accepts a good test card file; refuses at least 30 deliberately bad card files, each with its own message | Opus · high |
| C2 | **New rule file** `src/cards/nz-eas-cards.yaml` written from the PDFs and the approved A20 to A31 text; EAS 7.2 and 9.3 tables copied unchanged; D9 to D12 as decision 18 (A33 to A35). Cards approved by the owner (decision 20) | Card checker passes; existing table test passes on the copied tables | Opus · high |
| C3 | **New engine** (one routine: which cards show now) with unit tests, plus each A20 to A31 row's named test | Every condition and field tested; each A-row test passes | Opus · high |
| C4 | **Rewire the drug-card corner of the screens**; duplicated clinical logic removed; app text and equipment to their own files; old engine kept | Full tests pass except the screens the A-rows change | Opus · high |
| C5 | **One comparison against v24:** replay `tests/reference` on the new app; every difference must belong to an approved A-row. Then re-record from the new commit. Then, without asking (decision 21): delete the old rule file `src/rules/nz-eas.yaml`, the old engine, the old checker and what-changed tool, and the tests that only check them, naming each in the commit; update `sw.js`, README "Code map" and CLAUDE.md principle (a) to the card file; trim DECISIONS.md to what is true now (drop done steps and old step cards, section 9's "still fixed in code" list, and A-rows now in the cards; the cards file and GUIDELINE-TRACE.md are the record; target about 200 lines) | Difference report, each line named to its A-row; full tests pass after the deletions | Opus · high |
| C6 | **Owner phone check** of all A20 to A32 checks at once | Owner | Owner |
| A-row (rows from P2) | Build one approved row from section 7 exactly as written. Add its test and its entry in `tests/helpers/approved-changes.mjs`; never edit the frozen copies. Run the what-changed report on all cases; the reference is re-recorded from the change's commit only after the report shows every difference is the approved change (in an owner-started chat: see "Running unattended"). Shrink the row in section 7 to one line; update GUIDELINE-TRACE.md | What-changed report lists only the row's screens; no saved session differs unless the row says so | Sonnet · high |
| E2 | **Editor: open, edit, what-changed.** A separate offline page of the same site. Start with a one-page design note (reviewer checks it before code): tap a card, change a field, the checker runs as you type and blocks saving an invalid file, see what changed (large changes need a typed confirmation, editor decision 18). Do the "before the editor saves files" items in section 8 first. **Owner tries the editor after this step** | Every card field reachable; open and save with no edits gives an identical file; invalid edits cannot be saved; planted edits appear in the what-changed view | Opus · high |
| E3 | **Approve, publish, rollback** (editor decisions 18, 20, 21, 26). Design note first (how a confirmed rule set goes live; whether the phone runs the checker or checks a fingerprint): the owner approves the note before any code | Rollback restores the previous rule set exactly; the what-changed report is part of the approval record | Opus · high |
| v25 | **Release** (attended chat only): see "Release" | Owner phone checks | Orchestrator |
| S1 | **Store apps, design note:** how the same files are wrapped for Android and iPhone, built by GitHub Actions, with the rule set still updatable; privacy policy and store listing text; what each store will ask about medical content (section 2 "Regulatory position"). Owner approves the note | Note only | Opus · high |
| S2 | Build the wrappers and the GitHub Actions build; test builds the owner can install | Wrapped app behaves as the web app offline; update path proved | Sonnet · high |
| S3 | Closed test, store submissions (owner's accounts and actions; Claude prepares the material) | Store acceptance | Owner, with Sonnet · medium |

**After store publication (unless the owner reorders): the deeper editor.** Each stage starts with
a design note reviewed before code, and is cut into steps of at most one chat each.

| Stage | Goal | Extra proof | Worker |
|---|---|---|---|
| 5 | Pop-ups, triggered prompts, situations, on-demand cards, addable checklists (list B, E; editor decision 16) | Identical screens; test-only examples of each block work | Opus · high, 3 steps |
| 6 | Appearance settings (editor decision 22). **Owner phone check** | Default settings give identical screens and styles | Opus · medium |
| 9 | Trial with a second, deliberately different rule set to find anything still NZ-EAS-specific in code | Second rule set runs with no code change | Opus · high |
| 10 | Guideline candidates G1, G2, G3, G10, G11 through the editor only, one at a time, each an owner-approved A-row with GUIDELINE-TRACE.md rows | Each appears in the what-changed report and nowhere else | Sonnet · medium; clinical cross-check Opus · high |

## 6. Waiting for the owner (ask in this order, one at a time)
Owner rulings of 15 and 16 Nov 2026 (D1 to D12, Q9 citations, Q10 checker, Q11 order of work, unattended re-recording) are recorded
in sections 1 to 3, GUIDELINE-TRACE.md section 5 and the A-table below.
1. **Card questions (answer before C4 draws the cards; C4 waits for these).** a to e are small
   design choices from C2 the approved rows do not settle; the file follows option A until ruled.
   f is a clinical change found at C3.
   a. *Shock energy card.* Every card needs a guideline line, and no condition means "always".
      A: header shows the added EAS 3.14 p1 line "Defibrillate immediately if the cardiac rhythm is VF
      or VT using a single shock and immediately recommence chest compressions:" with the energy, only
      while the arrest is running. B: header shows the energy only, at all times, as in v24 (the card
      format gains "no lines" for header cards and an "always" condition). **Recommended: B** (no new
      text, no change from today's screen).
   b. *CPR clock card* holds "Perform two-minute cycles of high performance CPR between rhythm
      checks." A: not drawn (the sentence is already in the Guidance opening text, A29). B: drawn in
      the header. **Recommended: A.**
   c. *A33 lines* (child second amiodarone). A: shown as dose lines under "Seek clinical advice".
      B: shown as the card's source line, in source-line style (A33 says "source line"). **Recommended: B.**
   d. *Guidance opening item 1* (app text) loses its bold, because card text is plain. A: plain.
      B: allow bold in app text. **Recommended: A.**
   e. *Places.* Special situations: A: Guidance tab (as the file has it); B: the settings note, as
      today and as A29 names. Weight from age: opened from the weight sheet as today (the format only
      knows "opened from Guidance"). Reversible causes title still "4 Hs & 4 Ts": A: keep; B: "Reversible
      causes". **Recommended: B, today's places, and title B.**
   f. *Fluids card with no weight entered* (found at C3; no A-row covers it). Today (v24) the fluids
      card says "Enter weight" until a weight is entered, while adrenaline, amiodarone and magnesium
      already show their adult line with no weight (decision 2, D11). The new engine, as built, shows
      the adult line. A: show "1-2 litres IV for an adult." with no weight, like the other drug cards
      (becomes a new A-row, with its test and phone check). B: keep v24: "Enter weight" until a weight
      is entered (the engine is changed at C4 to match). **Recommended: A** (same rule as every other
      drug card; the guideline line is printed for adults).
2. **Web addresses for A32 (supplied by the owner)** (the settings-tab guideline links; now in the card file). Known: EAS 3.14 Cardiac Arrest
   https://cpg.stjohn.org.nz/tabs/guidelines/cardiac-eas/page/cardiac-arrest-eas; EAS 9.3 RSI
   (Rapid Sequence Intubation)
   https://cpg.stjohn.org.nz/tabs/guidelines/intubation-and-ventilation/page/rsi-rapid-sequence-intubation-eas
   (linked from the EAS 7.2 PDF); EAS 14.27 Magnesium sulphate
   https://cpg.stjohn.org.nz/tabs/medicines/page/magnesium-sulphate-eas; EAS 7.2 Paediatric Equipment and Drug Doses, https://cpg.stjohn.org.nz/tabs/guidelines/paediatrics-eas/page/paediatric-equipment-and-drug-doses-eas;  EAS 9.2 Airway Backup Checklist, https://cpg.stjohn.org.nz/tabs/checklists/procedural-checklists/page/airway-backup; EAS 3.15 Treatment following ROSC, https://cpg.stjohn.org.nz/tabs/guidelines/cardiac-eas/page/treatment-following-rosc-eas; EAS 9.4 RSI Checklist, https://cpg.stjohn.org.nz/tabs/checklists/procedural-checklists/page/rsi-checklist; EAS 14.3
   Adrenaline, https://cpg.stjohn.org.nz/tabs/medicines/page/adrenaline-eas; EAS 14.4 Amiodarone, https://cpg.stjohn.org.nz/tabs/medicines/page/amiodarone-eas.
3. **Store publication, owner actions** (these have waiting times, so they decide the date):
   - Ask Medsafe whether the app is a medical device (section 2 "Regulatory position").
   - Written permission from the guideline's owners to reproduce CPG text and PDFs in a published
     app. The owner's employer, Wellington Free Ambulance, is on the CPG working group and endorses
     the product: ask whether it would publish the app or give that permission in writing. An
     organisation publishing it would also answer Apple rule 1.4.2 and remove Google's testing
     requirement.
   - Under a personal account (decision 11): Google needs a closed test with 12 testers for 14 days
     before public release; Apple rule 1.4.2 is not satisfied.
   - Open the developer accounts; recruit the 12 testers.
4. Smaller items, each a possible A-row: a manual entry timed later than now is saved as the
   previous day (on purpose, for a case crossing midnight); closing the rhythm pop-up with × leaves
   "Rhythm not recorded"; the tutorial step "Find weight-based RSI doses" still says doses "are
   calculated from the entered weight" (they are looked up since A12); the start-up message shown
   when the rule set cannot be read (wording in `src/rules/parse.js`) may be reworded.
5. **Paediatric pads prompt:** removed 15 Nov 2026; may return as an owner addition once the
   corpuls criterion (weight, age or energy) is supplied.

## 7. A-table: changes not yet live
No clinical number, wording, timing or behaviour changes unless it is an approved row here. A new
row is written in full (what changes, which screens, the test, the guideline source in GUIDELINE-TRACE.md
terms) and shown to the owner; once applied it shrinks to one line and GUIDELINE-TRACE.md carries the result.
Rows already live (A1 to A8, C6b-2) are no longer listed: their behaviour is in GUIDELINE-TRACE.md.
A9 to A19 went live in v24 (15 Nov 2026); each stays listed until its phone check is done.

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

**Approved 15 Nov 2026 (owner rulings), not built.** Written straight into the card rule set
(cards plan C2 to C5, owner decision 5), not built one at a time on the old file. Every row: tests named below; extracts compared with
the packaged PDF text; GUIDELINE-TRACE.md rows updated; source cited "EAS [number] [title], p[n]" or "Owner
ruling 15 Nov 2026" plus the guideline it rests on. Rows superseding an earlier row (A1, A2b, A2c,
A7) update that row's test to the new approved behaviour; that is not a loosening.

| ID | Change (approved, not built) | Phone check at the next release |
|---|---|---|
| A20 | **D1, fluids after PEA only.** No-shock check choices: PEA and Asystole only ("Other" leaves `numbers.rhythms.noshock` and the no-shock list of the correction sheet; ROSC "Other" stays, A8; the "Other…" drug or fluid entry stays). `numbers.lowerCard.fluidRhythms`: PEA only. Lower card by the latest recorded rhythm: PEA: fluids card, plus the magnesium card if torsades was recorded earlier; Asystole: blank, or magnesium if torsades was recorded; "Rhythm not recorded" changes nothing (as today); a v23 saved session whose latest rhythm is "Other" counts as not PEA. Fluids pop-up opens only after PEA; its title becomes the guideline heading "If the patient is in PEA" (was "Non-shockable rhythm · fluid guidance"). Screens: rhythm check (no shock), correction sheet, Live lower card, fluids pop-up. Test `a20-fluids-pea-only` (PEA; Asystole; torsades then PEA; torsades then Asystole; no "Other" choice); a2c and a7 tests move to this row. Source: EAS 3.14 Cardiac Arrest, p2; Owner ruling 15 Nov 2026 (D1) | 20 kg: PEA: fluids card "400 mL IV"; Asystole: lower card blank; no "Other" at the no-shock check; torsades shock then PEA: fluids and magnesium |
| A21 | **D2, pads prompt removed.** Delete wording `padsPrompt`, `padsPromptWithLimit`, number `numbers.shock.paediatricPadsUpToJ`, their checker entries and the code that shows the prompt. Screens: Live header. Test `a21-no-pads-prompt` (5, 10, 20 kg and adult: no prompt). Source: Owner ruling 15 Nov 2026 (D2); EAS 3.14 Cardiac Arrest, p10 | 10 kg: no "Use paediatric pads" |
| A22 | **D3, shock energy as printed.** Child band: the EAS 7.2 range as printed, "20-25 J", "40-50 J", "80-100 J", "120-150 J", "160-200 J" (`childBands.*.shockJ` becomes `shockRangeJ: [low, high]`). Adult: "Maximum joule setting for an adult." (`numbers.adult.shockJ` 200 deleted; the words are wording). `headerEnergyTitle` becomes the source line. Shock record sheet: energy box empty, never pre-filled; `energyEstimated` ("est.") deleted; the recorded energy is what the clinician types (optional, as today). Checker: rule 2 (band energy = weight × J/kg) removed (Q10); rules 1 and 4 become the one rule in decision 16; new shape check: low ≤ high. Screens: Live header energy, shock record sheet, weight-from-age result. Test `a22-energy-as-printed` (each band, adult words, empty energy box, saved energy equals typed); a1 test moves to this row. Source: EAS 7.2 Paediatric Equipment and Drug Doses, p5, p8, p10, p12, p14 ("Manual defibrillation"); EAS 3.14 Cardiac Arrest, p1 | 15 kg: header "80-100 J"; 60 kg: "Maximum joule setting for an adult."; shock sheet energy box empty; age 6: "120-150 J" (replaces A16's "120 J") |
| A23 | **D4, amiodarone in VF or VT only.** The amiodarone card shows only while the latest recorded rhythm is VF or VT **and** the shock count (including "+ Previous shock") has reached 3; second-dose state at 6. Not shown before 3 (`amiodaroneNotYetDue` deleted); hidden after PEA or Asystole (lower card then follows A20); back when VF or VT is recorded again and the count is met. First lines, word for word: at 3, "If in VF or VT after three shocks, including shocks delivered prior to ambulance arrival:" "Administer amiodarone:" then "300 mg IV for an adult." or the child band dose (as today); at 6, "If in VF or VT after six shocks, including shocks delivered prior to ambulance arrival, administer a second dose of amiodarone:" then "150 mg IV for an adult." or, for a child, "Seek clinical advice" (A10; D9 waits). Deleted (no guideline sentence): "Review at {shocks} shocks", "Due after {second} shocks"; "{maxDoses} doses recorded" stays (a record count). Torsades: once recorded, magnesium holds the card for the rest of the arrest whatever the later rhythm (with fluids when the latest is PEA, A20); amiodarone stays withheld. Screens: Live lower card. Test `a23-amiodarone-vf-vt-only` (3 earlier shocks, no rhythm: hidden; VF: shown with the sentence; Asystole: hidden; VF again: back; sentence at 6; torsades then VF: magnesium; extracts equal the PDF text); a2b test moves to this row. Source: EAS 3.14 Cardiac Arrest, p1, p2; Owner ruling 15 Nov 2026 (D4) | 3 × "+ Previous shock", no rhythm: no amiodarone card; shock in VF: card starts "If in VF or VT after three shocks"; then Asystole: card gone |
| A24 | **D5, EAS reversible causes.** The eight ANZCOR prompts (`checklists.causes` with their `plain` and `text` advice) and `sources.reversibleCauses` ("ANZCOR 11.2") are replaced by, word for word: "Potentially reversible causes of PEA include:" "Hypoxia." "Hypothermia." "Hypovolaemia (including anaphylaxis)." "Hyper/hypokalaemia (and other metabolic abnormalities)." "Tension pneumothorax." "Tamponade (cardiac)." "Toxins (poisoning)." "Thrombosis (pulmonary and coronary)." Shown as text, in any rhythm (Guidance tab, `causesHeading`); the caption's "Reversible causes: …" goes. A button "EAS 3.14 Cardiac Arrest ↗" opens https://cpg.stjohn.org.nz/tabs/guidelines/cardiac-eas/page/cardiac-arrest-eas online and `cpg-cardiac-arrest.pdf#page=13` offline. Screens: Guidance tab. Test `a24-reversible-causes-eas` (nine lines equal the p13 text; no ANZCOR text anywhere; link online and offline). Source: EAS 3.14 Cardiac Arrest, p13; Owner ruling 15 Nov 2026 (D5) | Guidance: the heading and eight causes; link opens EAS 3.14; in airplane mode the PDF at page 13 |
| A25 | **D7, whole years and whole kg.** Age box: whole years 1 to 14, plus "under 1 year"; part-year rounding removed. Every weight box (child and adult): whole kg only; no decimal point; a decimal is refused. `invalidWeight` becomes "Enter a whole number of kg above zero and no more than {maxKg} kg." (app text); the age captions lose "Age rounded up to the next whole year." A weight already saved with a decimal (a v23 session) is kept as saved. Screens: weight sheet, Tube sizes age box. Test `a25-whole-age-weight`. Source: Owner ruling 15 Nov 2026 (D7); EAS 7.2 Paediatric Equipment and Drug Doses, p5, p8, p10, p12, p14 (whole-year headings) | Weight keypad has no decimal point; age 5.5 not accepted |
| A26 | **D8, adult RSI rounding shown.** The RSI pop-up, whenever an adult column is used, adds "weight rounded up to the next column" (app text). Rounding unchanged (decision 2). Screens: RSI pop-up. Test `a26-rsi-rounding-line` (45 kg and 95 kg: line shown; 20 kg child: not shown). Source: Owner ruling 15 Nov 2026 (D8); EAS 9.3 RSI (Rapid Sequence Intubation), p2 | 45 kg: RSI pop-up shows "weight rounded up to the next column" |
| A27 | **D6, torsades, magnesium and fluids lines word for word.** `magnesiumFirstStatus` and `withholdTorsades`: "Withhold amiodarone."; `magnesiumRepeatStatus`: "Repeat once if torsades de pointes recurs or persists."; `magnesiumMaxDosesStatus` ("2 doses · clinical review") deleted, the card uses "{maxDoses} doses recorded"; torsades pop-up title: "If torsades de pointes is present or has occurred"; `torsadesExtract`: "10 mmol (2.5 g) over 1-2 minutes for an adult." "See the paediatric drug dose tables for a child." "Repeat once if torsades de pointes recurs or persists."; `fluidsExtract`: "1-2 litres IV for an adult." "20-40 ml/kg IV for a child." ("Assess and treat the reversible cause." deleted); `amiodaroneAfterTorsadesWarning`: "If torsades de pointes is present or has occurred" "Withhold amiodarone." plus the app text "This form records an actual event, not a recommendation."; `repeatMagnesium`: "One dose is already recorded." (app text) plus "Repeat once if torsades de pointes recurs or persists." Screens: Live lower card, torsades and fluids pop-ups, amiodarone "Other…" form, repeat-magnesium sheet. Test `a27-torsades-fluids-extracts`. Source: EAS 3.14 Cardiac Arrest, p2 | Torsades shock: card "Withhold amiodarone."; pop-up lines as written |
| A28 | **D6, adrenaline and amiodarone pop-ups word for word.** `adrenalineHow`: "Administer adrenaline IV every four minutes:" (EAS 3.14 p1); "Cardiac arrest:" "Adults and children whose weight has been rounded to 50 kg or more: administer undiluted as an IV bolus." "Children whose weight has been rounded to 40 kg or less: dilute 1 mg of adrenaline to a total of 10 ml using 0.9% sodium chloride. This solution is 1:10,000 and contains 0.1 mg/ml. Draw up the dose from this solution and administer as an IV bolus." (EAS 14.3 p2). `amiodaroneHow`: "Cardiac arrest: administer IV undiluted as a bolus." (EAS 14.4 p3); "Contraindications" "Known severe allergy." "Known severe allergy to iodine." "VT secondary to cyclic antidepressant poisoning. In this setting amiodarone administration can be associated with severe worsening of shock, without resolution of the rhythm." "If torsades de pointes is present or has occurred." (EAS 14.4 p1; reverses the 11 Nov exclusion). Dose lines: the A23 sentences with "300 mg IV for an adult." and "150 mg IV for an adult." (replace `amiodaroneAdultPopupDose`); child as A23. Not in this row: the magnesium pop-up (waits for D10, D12) and `selectDoseAdvice` (D9). Screens: adrenaline and amiodarone pop-ups. Test `a28-drug-popup-extracts`. Source: EAS 3.14 Cardiac Arrest, p1; EAS 14.3 Adrenaline, p2; EAS 14.4 Amiodarone, p1, p3 | Amiodarone pop-up lists the four contraindications |
| A29 | **D6, Guidance opening text and special situations word for word.** `guidanceIntro`: item 1 stays (app text: what the app is); items 2 and 3 become: "This guideline is for adults and children in non-traumatic cardiac arrest." "Perform two-minute cycles of high performance CPR between rhythm checks." "Administer adrenaline IV every four minutes:" "1 mg IV for an adult." "See the paediatric drug dose tables for a child." "If in VF or VT after three shocks, including shocks delivered prior to ambulance arrival:" "Administer amiodarone:" "300 mg IV for an adult." "See the paediatric drug dose tables for a child." "If in VF or VT after six shocks, including shocks delivered prior to ambulance arrival, administer a second dose of amiodarone:" "150 mg IV for an adult." "See the paediatric drug dose tables for a child." "Maximum joule setting for an adult." "See the paediatric drug dose tables for joule settings for a child." (EAS 3.14 p1); "The following pages contain tables of paediatric drug doses. They are based on rounding the child’s weight up to 5, 10, 20, 30 or 40 kg." (EAS 7.2 p1); "The usual recommended defibrillation energy for a child is 4 J/kg, but this may not be available for all defibrillators. If the recommended defibrillation energy level is not available, select the next highest level." (EAS 7.2 p2); app text kept: "A no-shock cycle is counted only when recorded." `specialNote`: "See the ‘cardiac arrest secondary to trauma’ guideline if the cardiac arrest is secondary to trauma." (EAS 3.14 p1), then the headings as printed: "Cardiac arrest secondary to drowning", "Cardiac arrest secondary to hanging" (p16), "Cardiac arrest secondary to asthma", "Cardiac arrest secondary to anaphylaxis", "Cardiac arrest secondary to cyclic antidepressant poisoning" (p17), "Cardiac arrest during pregnancy greater than 20 weeks", "Cardiac arrest secondary to hypothermia", "Cardiac arrest secondary to hyperkalaemia", "Cardiac arrest secondary to opiate poisoning" (p18). Screens: Guidance tab, settings special-situation note. Test `a29-guidance-text-extracts`. Source: EAS 3.14 Cardiac Arrest, p1, p16–18; EAS 7.2 Paediatric Equipment and Drug Doses, p1, p2 | Guidance opening text as written; no "capped at 200 J" |
| A30 | **D6, RSI text word for word.** `guidanceRsi` and `rsiConditions` become: "Administer 2 mcg/kg of fentanyl IV (up to a maximum of 200 mcg) immediately prior to ketamine if the patient has:" "Traumatic brain injury, or" "Suspected intracranial pathology, or" "Hypertension (SBP > 150 mmHg in an adult)." "Withhold fentanyl if the above clinical indications are not present, or there are signs of shock." "Administer 2 mg/kg of ketamine IV (up to a maximum of 200 mg) for most patients." "Consider reducing the dose to 1 mg/kg if:" "There are signs of shock, or" "Sedative medicines have already been administered or taken." "Administer neuromuscular blockade:" "2 mg/kg of rocuronium IV, or" "2 mg/kg of suxamethonium IV." (EAS 9.3 p1); "Do not reduce the dose of ketamine in the setting of RSI for prolonged seizures." "2 mg/kg of rocuronium or suxamethonium (to a maximum of 200 mg) is an appropriate dose for all patients." (p4); "The dose should usually be rounded to the nearest 50 mg in adults." (p5). Deleted: "Alternatives, not both", "Use the full RSI CPG…" (A32's link replaces it). Shows the fentanyl SBP threshold (reverses the 11 Nov exclusion). Screens: Guidance RSI section, RSI pop-up. Test `a30-rsi-text-extracts`. Source: EAS 9.3 RSI (Rapid Sequence Intubation), p1, p4, p5 | RSI text shows "Hypertension (SBP > 150 mmHg in an adult)." |
| A31 | **D6, tube, age and checklist text word for word.** `tubeCaution`: "Children may require a different sized SGA, ETT or length at lips than that predicted by the formulae."; age captions: "estimates may underestimate" becomes "If the weight is not known, it can be estimated from the child’s age using formulae, noting that the formulae are a guide only and tend to underestimate true weight." (EAS 7.2 p1). Checklists: the EAS 9.2 opening sentence in full, "This checklist should be used to prepare a patient for RSI while awaiting CCP backup."; checklist titles as the PDF headings; "35-45" with the printed hyphen; EAS 9.4 items under their printed section headings, not the heading repeated in each item. Screens: Tube sizes and weight sheets, the four checklists. Test `a31-checklist-text-extracts` (every item equals the PDF text, same order). Source: EAS 7.2 Paediatric Equipment and Drug Doses, p1; EAS 3.14 Cardiac Arrest, p2–3; EAS 3.15 Treatment following ROSC, p2–3; EAS 9.2 Airway Backup Checklist, p1; EAS 9.4 RSI Checklist, p1–2 | RSI checklist shows its section headings once each |
| A32 | **Q9, source lines and guideline links** (after P3). One short source line per card or pop-up, for example "EAS 3.14 Cardiac Arrest, p1", or "Owner ruling 15 Nov 2026 · EAS 9.3 RSI (Rapid Sequence Intubation), p2"; it replaces the guideline part of today's footers and basis lines (`drugPopupFooter`, `adultMagnesiumBasis` and similar; the D11 label stays as today, decision 18). Settings tab: "Guidelines used", one link per guideline by number and title, the website when online and the packaged PDF when offline: EAS 3.14 Cardiac Arrest; EAS 3.15 Treatment following ROSC; EAS 7.2 Paediatric Equipment and Drug Doses; EAS 9.2 Airway Backup Checklist; EAS 9.3 RSI (Rapid Sequence Intubation); EAS 9.4 RSI Checklist; EAS 14.3 Adrenaline; EAS 14.4 Amiodarone; EAS 14.27 Magnesium sulphate (website only until D12). Needs waiting list 3. May be revised if screens become hard to read. Test `a32-source-lines-and-links`. Source: Owner ruling 15 Nov 2026 (Q9) | Each card has one source line; settings lists nine guidelines; airplane mode opens the PDFs |
| A33 | **D9, child second amiodarone source line.** The child second-dose line stays "Seek clinical advice" (A10). Its source line quotes "See the paediatric drug dose tables for a child" (EAS 3.14 p1) and adds the app text "The EAS 7.2 tables print one amiodarone dose per band." Screens: Live lower card (child, second-dose state), amiodarone pop-up. Test `a33-child-second-amiodarone-source`. Source: Owner ruling 16 Nov 2026 (D9); EAS 3.14 Cardiac Arrest, p1; EAS 7.2 Paediatric Equipment and Drug Doses, p5, p8, p10, p12, p14 | 15 kg, dose 1, 6 shocks: "Seek clinical advice" with the EAS 3.14 sentence and the one-dose line |
| A34 | **D10, child magnesium time pointer.** The child magnesium pop-up adds the app text "Administration time: see EAS 7.2, dilution 13"; no time is shown for a child. Screens: magnesium pop-up (child). Test `a34-child-magnesium-time-pointer` (20 kg: line shown; adult: not shown). Source: Owner ruling 16 Nov 2026 (D10); EAS 7.2 Paediatric Equipment and Drug Doses, p4-5 | 20 kg, torsades: pop-up shows "Administration time: see EAS 7.2, dilution 13" |
| A35 | **D12, unsourced magnesium sentences removed.** The magnesium pop-up loses the adult dilution to 10 mL and "Avoid the IV line carrying a concurrent adrenaline infusion because precipitation can occur", until EAS 14.27 is packaged. Screens: magnesium pop-up. Test `a35-magnesium-unsourced-removed` (adult and child: neither sentence anywhere in the app). Source: Owner ruling 16 Nov 2026 (D12) | Adult, torsades: pop-up has neither sentence |

Withdrawn: A13, A14 (showing the working on screen; decision 7 rule 4).

## 8. Carried forward (not blocking; each has a "do before")
**Before the next release (v25)**
- The start page entry `./` is not part of the install check: require its download to equal `index.html`.
- `tools/check-offline-browser.cjs` sometimes fails at "old store changed" (the test browser still
  checks for updates while "offline"): wait for that install to end.
- Nothing runs the tests on GitHub before a release (a GitHub Actions check would).
- Not checked anywhere: real phones beyond the owner's, iPhone Safari, the bytes GitHub Pages serves.

**Card checker (from the C1 review; do before the step named)**
- Before C4 (from the C3 review): an adult dose tap records the number printed at the start of the adult
  line ("1 mg IV for an adult." records 1 mg, the same as today). Add a checker rule that refuses an
  `amount: dose` card whose adult line does not start with a number and unit, so a reworded line
  cannot quietly record nothing.
- At C4: pass the 500 kg weight limit (`maxWeightKg`) into `cardsNow`; the engine sets "Manual review"
  on header cards too under the special-situation switch; a "-" cell comes back marked "seek advice"
  and the words come from the wording file.
- Before C2: table and cell sources are checked only for page existence; the cell values are left to the table test.
- Small: a page listed twice in a source ("p1, p1") is accepted.
- From the C2 review: a table cell's cited pages are not checked against the page holding the value;
  guideline web links are checked by prefix only (compare with section 6 item 2); the sources of
  ordinary card lines are not pinned by a test (the checker finds each sentence on its cited page).
- A30 and GUIDELINE-TRACE.md cite EAS 9.3 p1 for the three blocker lines; the PDF prints them on p2
  (the card file cites p2). Correct the trace row when A30 is traced at C5.

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
  gives none") differs from D9's reading; reword it to match decision 18 (A33).
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
4. **No formula box (editor decision 13).** When a card shows is set only by the fixed list of
   conditions (`CARDS-DESIGN.md` section 2); doses, energies and sizes are never formulas.
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
| 13 | **New blocks at three levels** (below). **No formula box** (owner, 15 Nov 2026, cards plan): a card shows by the fixed list of conditions in `CARDS-DESIGN.md` section 2, all of which must be true; a new kind of condition is a new block (level 3). |
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
