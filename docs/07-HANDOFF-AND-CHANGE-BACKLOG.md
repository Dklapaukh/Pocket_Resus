# 07. Hand-off: state, next steps, waiting for the owner (read this first in any new chat)

Keep this page short and current. Rewrite lines when they change; do not add dated history (git
keeps it). The guiding principle and owner decisions are in doc 06; the guideline trace is doc 11;
the editor design is doc 18; how the build is run is doc 19.

## Project
Pocket Resus (github.com/Dklapaukh/Pocket_Resus; live at dklapaukh.github.io/Pocket_Resus): an
offline phone app that runs a cardiac arrest as an active flowchart and records events. It shows
NZ EAS CPG content only (doc 06). The owner is a clinician, not a developer, and is the clinical
reviewer. Independent clinical review comes after the deviation rulings (doc 11).

## How we work
- Claude (claude.ai, repo attached) reads, edits, tests, commits and pushes. Build work is on branch
  `rules-editor`; `main` is the live app (decision 10).
- Carry on with approved work without routine checkpoints. Stop only for a clinical or design
  decision, an approval, or an owner action such as a phone check.
- To the owner: explain simply, recommend one option, show the full text of every option, one
  decision at a time. When a chat gets long, give a ready-to-paste prompt for a new chat.
- **Timeline (decision 12):** goal is store publication by the end of December 2026; it can move.
  The owner is away 18 Nov to 2 Dec 2026 with a phone only (can answer questions and do phone checks).
- **Models (decision 13):** no Fable after 15 Nov 2026. Opus's weekly allowance sets the pace.
- **Unattended running:** the scheduled task "Pocket Resus build" starts a fresh Opus chat every
  3 hours (doc 19). Every chat first runs `sh tools/build-progress.sh check`. The owner can pause
  the task in the Claude app under scheduled tasks.

## Current state
- **Live: v23** (published 13 Nov 2026; owner phone check passed 14 Nov 2026). It loads
  `nz-eas.json`. The owed v23 check of "Other" (A7) is no longer needed: A20 removes "Other".
- **On `rules-editor`, not live:** rule set as YAML (`src/rules/nz-eas.yaml`), the checker and the
  what-changed tool, and the changes listed under "Changes not yet live".
- Root JS files (`app.js`, `core.js` and others) are the original app, kept only as test baselines.

## Build progress (doc 19 has the plan; commit messages hold each step's proof)
| Step | State |
|---|---|
| 0 Safety net (`tests/reference/`, 3,609 recorded cases) | Done |
| 1 Rule set as a data file; 2 remaining text and settings into data | Done |
| 2b Safer update (`sw.js`), v23 published | Done |
| E1 Checker and what-changed tool (`src/rules/check.js`, `tools/rules-diff.mjs`) | Done |
| E1b Rule set as YAML, strict reader and byte-for-byte writer | Done |
| A9 to A12, A15 to A19 (guideline tables instead of calculations) | Done, not live |
| P1 Trace check of doc 11 (found D9 to D12) | Done |
| P2 Deviation rulings | D1 to D8 ruled 15 Nov 2026: rows A20 to A26 approved, **next: build A20**, one row per chat. D9 to D12 wait for the owner |
| P3 Citations in the rule set; word-for-word extract test | Approved (owner ruling Q9). After A26, before A27 |
| P2 continued: A27 to A31 (word-for-word wording, D6), then A32 (source lines and guideline links, Q9) | Approved. After P3 (A32 also needs the web addresses, waiting list 3) |
| E2 Editor page, Rules view | After A32. Checker rules settled (Q10) except one point (waiting list 1) |
| E3 Approve, publish, rollback | After E2; needs a short design note first |
| v24 release | After P2 rulings are built and E3 |
| S Store apps | Owner actions can start now (below); build after v24 |
| 3 to 10 Deeper editor stages | After store publication (owner ruling Q11) |

## Waiting for the owner (ask in this order, one at a time)
Owner rulings of 15 Nov 2026 (D1 to D8, Q9 citations, Q10 checker, Q11 order of work) are recorded
in doc 06, doc 11 section 5 and the A-table below.
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
4. **Deviations D9 to D12** (doc 11 section 5): one ruling each. Option A recommended for each.
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
   - Ask Medsafe whether the app is a medical device (doc 06 "Regulatory position").
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

## A-table: changes not yet live
No clinical number, wording, timing or behaviour changes unless it is an approved row here. A new
row is written in full (what changes, which screens, the test, the guideline source in doc 11
terms) and shown to the owner; once applied it shrinks to one line and doc 11 carries the result.
Rows already live (A1 to A8, C6b-2) are no longer listed: their behaviour is in doc 11.

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
the packaged PDF text; doc 11 rows updated; source cited "EAS [number] [title], p[n]" or "Owner
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

## Carried forward (not blocking; each has a "do before")
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
- Retire the engine's original PEA-only `careMode` (kept only for the side-by-side test).
- The Post ROSC checklist may scroll (owner accepts this).
