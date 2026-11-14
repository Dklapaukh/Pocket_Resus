# 11. Guideline trace: where everything clinical on screen comes from

This is the evidence for the guiding principle (doc 06): the app shows what the NZ EAS CPGs say and
calculates only what a guideline tells it to. **Every clinical number, sentence and trigger must
have a row here. A change that adds or alters one updates this page in the same commit.**

It is a software trace, not independent clinical validation. Values were compared with the text of
the packaged PDFs (exports dated 24 Sep 2026) on 14 Nov 2026 and by the tests named below; a
second person has not yet checked each cell by eye (see "Still to do").

Packaged guidelines: EAS 3.14 cardiac arrest (`cpg-cardiac-arrest.pdf`), 3.15 post ROSC
(`cpg-post-rosc.pdf`), 7.2 paediatric equipment and doses (`cpg-paediatric-equipment.pdf`), 9.2 RSI
preparation (`cpg-preparation-rsi.pdf`), 9.3 RSI (`cpg-rsi.pdf`), 9.4 RSI checklist
(`cpg-rsi-checklist.pdf`), 14.3 adrenaline and 14.4 amiodarone (`cpg-drugs/`). EAS 14.27 magnesium
is linked online only. Page numbers are PDF pages. All values live in `src/rules/nz-eas.yaml`.

## 1. Patient-specific numbers
"Looked up" = read from a stored copy of a guideline table. "Fixed" = one stored value.
Band = the child's weight rounded up to 5, 10, 20, 30 or 40 kg (EAS 7.2 page 1 states this rule).

| Output | How | Guideline | Notes and test |
|---|---|---|---|
| Child adrenaline, first amiodarone, magnesium | Looked up by band | EAS 7.2 band tables, pages 5, 8, 10, 12, 14 (magnesium 7, 9, 11, 13, 15) | All 15 values match. `rules-file` test |
| Child magnesium, 5 and 10 kg bands | No number: "Seek clinical advice" | EAS 7.2 prints "-" | A9. `a9-magnesium-seek-advice` |
| Child second amiodarone dose | No number | None: EAS 7.2 has one amiodarone row per band | A10. `a10-child-second-amiodarone` |
| Adult adrenaline 1 mg, amiodarone 300 then 150 mg, magnesium 10 mmol, fluids 1–2 L | Fixed | EAS 3.14 pages 1–2; EAS 14.4 page 2 | Match. `rules-file` test |
| Child shock energy | Looked up by band: 20, 40, 80, 120, 160 J | EAS 7.2 tables print ranges: 20–25, 40–50, 80–100, 120–150, 160–200 J; page 1 gives 4 J/kg | **Deviation D3** (one value shown, not the range). `a1-energy` |
| Adult shock energy 200 J | Fixed | EAS 3.14 page 1: "Maximum joule setting for an adult" | **Deviation D3** |
| Child fluid volume | Looked up by band: 100, 200, 400, 600, 800 mL, then the words "EAS 3.14 allows up to 40 mL/kg" | EAS 7.2 band tables (20 mL/kg row), pages 7, 9, 12, 14, 16; EAS 3.14 page 2 "20-40 ml/kg" | A19. The upper limit is quoted, not calculated. `a19-child-fluids-table-only` |
| Weight from age | Looked up: under 1 year 5 kg; 1 year 10 kg; 2–5 years 20 kg; 6–10 years 30 kg; 11–13 years 40 kg; 14 years "adult, enter the weight" | EAS 7.2 band table headings, pages 5–15 | A16. Part-year ages are rounded up (**D7**). The page 1 formula is not used (principle 4). `a16-weight-from-age-bands` |
| Tube size and length at lips | Looked up by band: 3 mm / 9 cm; 3 or 4 / 12; 4 or 5 / 15; 5 or 6 / 17; 6 or 7 / 19. Adults: not shown | EAS 7.2 band tables, pages 6, 8, 10, 12, 14; caution line from page 1 | A17, A18. A saved weight wins over the age. `a18-tube-sizes-band-table` |
| LMA size and cuff volume | Looked up by band: 1 / 4 mL; 2 / 10 mL (10 and 20 kg); 3 / 20 mL (30 and 40 kg) | EAS 7.2 band tables | A15. `a15-lma-band-table` |
| RSI doses: fentanyl, ketamine, reduced ketamine, rocuronium or suxamethonium | Looked up by column. Child: band (10 to 40 kg); 5 kg band has no column: "Seek clinical advice". Adult: next 10 kg column up; over 90 kg the "≥ 100 kg" column | EAS 9.3 page 2, adult and paediatric dose tables | A12. All 40 values match. Adult rounding up is decision 2 (**D8**). `a12-rsi-table-doses` |

## 2. Timing, counting and triggers
| What the app does | How | Guideline | Notes |
|---|---|---|---|
| 2-minute CPR cycle; adrenaline review every 4 minutes | Clock from recorded times | EAS 3.14 page 1 | Nothing is recorded because time passed |
| Amiodarone card at 3 shocks, second dose at 6, counting shocks before arrival | Count | EAS 3.14 pages 1–2: "If in VF or VT after three shocks, including shocks delivered prior to ambulance arrival" | **Deviation D4** (the card ignores the current rhythm) |
| Torsades recorded: amiodarone withheld, magnesium card, one repeat | Flag from the record | EAS 3.14 page 2 | The clinician records torsades; the app does not diagnose it |
| Fluids card and pop-up after PEA | Latest recorded rhythm | EAS 3.14 page 2, "If the patient is in PEA" | **Deviation D1** (also shown after Asystole and Other) |
| Paediatric pads prompt at 100 J or less | Threshold | None | **Deviation D2** |

## 3. Wording, checklists and references
| Content | Guideline | Notes |
|---|---|---|
| Arrest, post-ROSC, RSI preparation and RSI checklists | EAS 3.14 pages 2–3; 3.15 pages 2–3; 9.2 page 1; 9.4 pages 1–2 | Same items in the same order. `ETCO2` and `cmH2O` without subscripts; 9.4 section headings repeated in each item; the 9.2 opening sentence is shortened (**D6**) |
| Drug administration pop-ups: adrenaline (adult undiluted; child 1 mg diluted to 10 mL), amiodarone (undiluted), magnesium (preparation, 1–2 minutes for an adult, repeat once) | EAS 14.3 page 2; 14.4 pages 2–3; 7.2 pages 4–5; 3.14 page 2 | The app's wording is a summary, not an extract (**D6**). No child magnesium administration time is shown (EAS 7.2 gives about 15 minutes outside arrest) |
| Guidance tab: RSI summary (per-kg doses, maximums, conditions) | EAS 9.3 pages 1–2 | Summary wording; the adult systolic threshold for fentanyl is left out (**D6**) |
| Reversible causes (4 Hs / 4 Ts prompts) | **ANZCOR 11.2, not an NZ EAS CPG** | **Deviation D5.** EAS 3.14 page 13 has its own list |
| "Seek clinical advice" where no dose is printed | App wording | Kept on purpose (decision 7 rule 3); the source line says no dose is listed |

## 4. Every calculation the app performs
1. Rounds a child's weight up to its band (EAS 7.2 page 1) and an adult's weight up to the next
   RSI column (decision 2; **D8**).
2. Rounds a part-year age up to pick a band heading (decision 8; **D7**).
3. Counts shocks and doses, and runs the 2-minute and 4-minute clocks (EAS 3.14).
4. Adds up recorded fluid volumes for the status line (the record, not guidance).
5. No dose, energy or size is multiplied or divided while the app runs (since A19).
   `shock.joulesPerKg` is used only in wording and in a checker rule.

## 5. Deviations: where the app is not "the guideline, as written, at the right time"
Each needs an owner ruling, one at a time (doc 07 lists which is next). Option A is recommended in
each case because it is what the principle requires. An approved option becomes an A-table row and
is built and tested like any other change.

| # | The app today | The guideline | Options |
|---|---|---|---|
| D1 | Fluids card and pop-up after PEA, **Asystole** (A2c) and **Other** (A7) | EAS 3.14 page 2 lists fluids under "If the patient is in PEA" only | **A (recommended):** fluids card and pop-up after PEA only. **B:** keep Asystole and Other, each labelled on screen "owner addition, not in EAS 3.14" |
| D2 | "Use paediatric pads" prompt when the energy is 100 J or less (up to the 20 kg band) | No energy threshold. EAS 3.14 page 10: "Routinely place pads in the anterior/posterior position for small children and morbidly obese patients" | **A (recommended):** remove the prompt. **B:** keep it, labelled "owner addition, not in the EAS guidelines" |
| D3 | One shock energy per band (the bottom of the table range, equal to 4 J/kg × band); 200 J for an adult | EAS 7.2 tables print a range per band (for example 80–100 J); EAS 3.14 says "Maximum joule setting for an adult" | **A (recommended):** show what is printed: the range for a child, "Maximum joule setting" for an adult; the energy recorded with a shock is then chosen by the clinician, not pre-filled. **B:** keep the single values, with the source line naming the table range and the 4 J/kg rule |
| D4 | Amiodarone card appears at 3 shocks whatever the latest rhythm (A2b), and stays | "If in VF or VT after three shocks…" | **A (recommended):** keep the count as the trigger but make the card's first line the guideline's own sentence, including "If in VF or VT", so the rhythm judgement stays with the clinician. **B:** show the card only when the latest recorded rhythm is VF or VT (the app then decides from the record; shocks before arrival have no rhythm) |
| D5 | Eight 4 Hs / 4 Ts prompts cited to ANZCOR 11.2 | EAS 3.14 page 13 lists eight "potentially reversible causes of PEA": hypoxia, hypothermia, hypovolaemia (including anaphylaxis), hyper/hypokalaemia (and other metabolic abnormalities), tension pneumothorax, tamponade (cardiac), toxins (poisoning), thrombosis (pulmonary and coronary) | **A (recommended):** replace with the EAS 3.14 list, word for word, cited to EAS 3.14. **B:** keep the ANZCOR prompts, labelled "ANZCOR 11.2, not an NZ EAS guideline" |
| D6 | Several texts are summaries or shortened versions of the guideline (drug pop-ups, RSI summary, the 9.2 opening sentence). Rulings of 11 Nov 2026 kept the fentanyl threshold and the other amiodarone contraindications out | Principle 1: "as the guideline says it" | **A (recommended):** every guidance sentence becomes a word-for-word extract (shortened only by leaving whole sentences out), and a test compares each extract with the PDF text. **B:** keep the summaries, each labelled "summary: see the guideline" with its link |
| D7 | A part-year age is rounded up to pick the band heading (5.5 years uses "6-10 years") | The headings are whole years ("2-5 years", "6-10 years"); the guideline does not say what to do between them | **A (recommended):** accept whole years only (and "under 1 year"). **B:** keep rounding up (decision 8) |
| D8 | An adult's weight is rounded up to the next RSI column (45 kg uses the 50 kg column) | EAS 9.3 prints the columns; no rounding rule for adults was found in its text (EAS 7.2 states rounding up for children only) | **A (recommended):** keep rounding up, and add the sentence "weight rounded up to the next column" to the RSI pop-up so the choice is visible. **B:** show both neighbouring columns and let the clinician choose |

## 6. App mechanics (not guidance; must never read like a guideline instruction)
Timer messages ("30 seconds remaining", "Prepare for rhythm check", overdue time); the arrest
checklist reminder (cycle running, at least 1 min 30 s left, adrenaline given); double-tap locks
(adrenaline 3 min 30 s, magnesium and fluids 5 s; A5); the special-situation switch (turns routine
prompts off); "+ Previous shock"; "Other…" manual entry (records what was given, suggests nothing;
a child's second amiodarone dose can only be entered this way); corrections, voids, undo; the log
and its exports; saving and recovery (doc 17). Equipment lists, sites and iGel sizes and colours
are things that can be **recorded**, not recommendations (iGel data: Intersurgical).

## 7. Still to do
- **Second-person check:** each cell of sections 1 to 3 compared by eye with the PDF page (not only
  with extracted text), recorded here with name and date.
- **Independent clinical review** (after the owner's rulings on D1 to D8): the reviewer works from
  this page and the PDFs, never from the app as the authority, and records reviewer, date,
  guideline edition and pages, and a decision for each row.
- **Guideline currency:** the packaged exports are dated 24 Sep 2026 and marked "uncontrolled
  document". Before each release compare each guideline's online version with the packaged export
  and record the result here. Last compared: EAS 3.14 only, 12 Nov 2026 (version 1.1.0.1 of
  16 June 2026, same text).
- Not in the app, noted in the guideline: the newborn tube-length formula (EAS 7.2 page 1); the
  wider context, cautions and practice levels in EAS 14.3 and 14.4.
