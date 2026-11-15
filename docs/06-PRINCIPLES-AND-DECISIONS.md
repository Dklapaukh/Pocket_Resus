# 06. Guiding principle and owner decisions (current only)

This page holds what is true **now**. When a decision changes, its row is rewritten, not added to.
Earlier wording is in git history (commit 5760f47 is the last one with the old docs). Editor design decisions are
in doc 18; this page wins if the two ever disagree.

## Guiding principle (owner, 15 Nov 2026)
1. **The app shows what the NZ EAS CPGs say, as the guideline says it, at the moment it applies.**
   It makes no clinical decision; the clinician does (for example, deciding the rhythm is torsades).
2. **The only calculations the app performs are ones clearly traced to a guideline.** The trace for
   every number, sentence and trigger is doc 11.
3. **A specific guideline beats a general one.** RSI doses come from the RSI guideline (EAS 9.3),
   not from the general paediatric tables (EAS 7.2).
4. **A dose printed in the guideline (for example in a table) beats a calculated dose.**
5. When 3 and 4 pull apart: rule 3 picks the guideline; inside it rule 4 applies. If the specific
   guideline gives only a formula and another guideline prints the number, show the printed number
   and quote the specific guideline's own words for the rest (the A19 pattern: table volume, then
   "EAS 3.14 allows up to 40 mL/kg").

**What this means for every chat and every change**
- Nothing clinical goes on screen without a row in doc 11 naming the guideline, the page, and
  whether the value is looked up, fixed, counted or calculated.
- Not in the guideline: not shown as guidance. A missing or unclear dose shows no number and
  "Seek clinical advice".
- App mechanics (recording, clocks, undo, double-tap locks, log, export) are not guidance. They are
  listed as such in doc 11 and must never look like a guideline instruction.
- Anything that does not yet follow the principle is on the **deviations list in doc 11**. Each one
  needs an owner ruling: make it match the guideline, remove it, or keep it labelled as an owner
  addition (which weakens the position below).

## Regulatory position (not legal advice; nothing here is confirmed by a regulator)
- **The owner's position:** a dynamic display of existing guidance that makes no decisions is not a
  medical device. The principle above exists so that this can be shown by one check: the app matches
  the guideline.
- **Where the position is weaker than it sounds (audit, 15 Nov 2026):**
  1. Choosing *which* guideline line to show for *this* patient *now* (dose for the weight band,
     "amiodarone due" at the third shock, fluids after PEA) applies guideline rules to patient data
     even when no arithmetic is done. Regulators generally judge software by its intended purpose
     and patient-specific output, not by whether it multiplies. The principle makes the app easy to
     verify; it does not by itself settle the legal question.
  2. Every deviation in doc 11 is content that is not the guideline. Each one left in place
     undercuts "it only shows the guideline".
  3. The editor (doc 18) lets an editor type anything. The claim then rests on the editor's checks
     (citation required, word-for-word extracts, approval record), not on the app.
- **Open questions only the owner can settle (listed in doc 07 "Waiting for the owner"):**
  Medsafe's view (NZ has no software-specific rules yet; Medsafe applies the general device
  definition by intended purpose); Apple review rule 1.4.2 (dose calculators must come from an
  approved body such as a hospital or university, or have regulator approval; Apple is likely to
  treat a weight-to-dose look-up as a dose calculator); permission from the guideline's owner to
  reproduce CPG text and PDFs in a published app (the packaged exports are marked "uncontrolled
  document"); who keeps the app in step when the guideline changes.
- **Context (owner, 15 Nov 2026):** the owner's employer, Wellington Free Ambulance, is on the CPG
  working group and endorses the product. Endorsement is not yet written permission to reproduce
  the guideline, nor publication by an approved body (Apple rule 1.4.2); both are still to ask.

## Owner decisions
Numbers 2, 7 and 8 are quoted in code and tests: never renumber them.

| # | Decision |
|---|---|
| 2 | **Weight rounding.** Weights are entered in whole kg only (ruling D7, 15 Nov 2026). Children: weight rounded **up** to the EAS 7.2 bands 5, 10, 20, 30, 40 kg (EAS 7.2 page 1 states this). Over 40 kg: adult doses. RSI doses for adults: the next 10 kg column up in the EAS 9.3 adult table (50 to 90 kg); over 90 kg uses the "≥ 100 kg" column; the RSI pop-up says "weight rounded up to the next column" (ruling D8). Weights under 5 kg use the 5 kg band. |
| 3 | "+ Previous shock" adds 1 to the shock count (no time, no rhythm). App mechanic. |
| 4 | Portrait only. |
| 5 | Clinical changes are made one at a time, each an approved row in the A-table (doc 07) with its own test. |
| 7 | **Dose rules.** (1) The band weight (decision 2) is used for every dose. (2) A calculation is allowed only where the guideline gives a formula and prints no value, and its trace is in doc 11 (principle 2 and 4). (3) A dose that is missing or unclear in the guideline shows "Seek clinical advice" and no number. (4) The screen shows the outcome; the working is in doc 11 for reviewers. |
| 8 | **Band tables are the authority.** The EAS 7.2 band tables (`cpg-paediatric-equipment.pdf` pages 5 to 15) are the source for child drug doses, tube size and length, shock energy and airway device (LMA). Weight from age uses the table headings; age is entered in whole years only, plus "under 1 year" (ruling D7); age 14 is adult. RSI doses use EAS 9.3. |
| 9 | **Test-case limits (testing only, not app rules):** new generated or recorded test cases run at most 90 minutes of case time and at most 10 adrenaline doses. Existing recordings are not edited or skipped. |
| 10 | **`main` is the live app.** Standing permission to publish without asking each time, for complete releases only (doc 19 "Release"). Git history is the rollback. |
| 11 | **Store apps:** developer accounts go under the owner's personal name (see doc 07 for what that costs). |
| 12 | **Timeline:** the goal is store publication by the end of December 2026. It is a goal, not a deadline: if it is not realistic it moves. Nothing is rushed or skipped to meet it. |
| 13 | **Models:** Fable is not available after 15 Nov 2026. The orchestrator, hard build steps and every review use Opus; routine build steps use Sonnet (doc 19). |
| 14 | **Deviation rulings, 15 Nov 2026 (D1 to D8).** D1 fluids only while the latest rhythm is PEA, no-shock choices PEA and Asystole; D2 pads prompt removed; D3 shock energy as printed (child range, "Maximum joule setting for an adult"), nothing pre-filled; D4 amiodarone card only in VF or VT once the shock count is met, magnesium holds the card once torsades is recorded; D5 EAS 3.14 p13 reversible causes; D6 every guidance sentence word for word, a summary or omission only by an owner ruling (shown "Summary: see EAS [number] [title]" with its link), fentanyl SBP threshold and all amiodarone contraindications shown; D7 whole years and whole kg; D8 adult RSI rounding kept and stated. Detail: doc 11 section 5; rows A20 to A31 in doc 07. D9 to D12 still wait. |
| 15 | **Citations (Q9).** Every clinical value and sentence in the rule set carries its guideline number and page, and the checker refuses one without; a test compares every extract with the guideline text. Where the app follows an owner ruling it cites "Owner ruling 15 Nov 2026" plus the guideline it rests on. On screen: one short source line per card or pop-up (for example "EAS 3.14 Cardiac Arrest, p1"). The settings tab links each guideline used, by number and title (website online, packaged PDF offline). May be revised if screens become hard to read. Guidelines are named by number and title; the official source is the NZ CPG website, built from the PDFs. |
| 16 | **Checker relationship rules (Q10).** All stay switched on except "each child band shock energy equals the band weight times the joules per kg", which goes (D3). The two rules that compare the adult shock energy as a number wait for one owner answer (doc 07 waiting list 1). |
| 17 | **Order of work (Q11).** Make the app match the principle (rows A20 to A32 and step P3), then the first editor (E2, E3), then release v24, then store apps; editor stages 3 to 10 after store publication. |

**Rulings made before the principle** (fluids after Asystole and "Other"; pads prompt; single
shock energies; amiodarone card whatever the rhythm; ANZCOR causes; shortened wording) were
reversed by decision 14. They stay in the app until rows A20 to A31 are built.
