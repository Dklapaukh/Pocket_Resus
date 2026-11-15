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
  `nz-eas.json`. One phone check still owed for v23: "Other" at a no-shock check shows the fluids
  card (A7).
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
| P1 Trace check of doc 11 | **Next** (no owner input needed) |
| P2 Deviation rulings D1 to D12, each built as its own A-row | Waiting for the owner, one at a time |
| P3 Citations in the rule set; word-for-word extract test | Waiting for the owner (question 2) |
| E2 Editor page, Rules view | After the checker question (question 3) |
| E3 Approve, publish, rollback | After E2; needs a short design note first |
| v24 release | After P2 rulings are built and E3 |
| S Store apps | Owner actions can start now (below); build after v24 |
| 3 to 10 Deeper editor stages | After store publication unless the owner says otherwise (question 4) |

## Waiting for the owner (ask in this order, one at a time)
1. **Deviations D1 to D12** (doc 11 section 5): one ruling each, D1 first. Option A is recommended
   for every one. D9 to D12 were found by the P1 trace check (15 Nov 2026):
   - **D9** child second amiodarone (now "Seek clinical advice", A10; EAS 3.14 says "See the
     paediatric drug dose tables for a child"). **A (recommended):** show the guideline's sentence
     "See the paediatric drug dose tables for a child" with the band's table amiodarone dose, as for
     the first dose. **B:** keep "Seek clinical advice" (A10), with the source line quoting that
     EAS 3.14 sentence and saying the tables print one amiodarone dose per band.
   - **D10** child magnesium time not shown (EAS 7.2: "over approximately 15 minutes, preferably
     into a running line"). **A (recommended):** show EAS 7.2 dilution 13 word for word, including
     that administration sentence. **B:** keep the time out, with the line "Administration time: see
     EAS 7.2, dilution 13".
   - **D11** adult doses above 40 kg and with no weight, without EAS 7.2's caution. **A
     (recommended):** above 40 kg, show the EAS 7.2 sentence ("Children weighing greater than 40 kg
     can usually be administered adult doses, but clinical judgement must be used… If there is any
     doubt, a paediatric dose should be administered.") word for word with the adult dose; with no
     weight entered, label the dose with EAS 3.14's own words "for an adult" instead of "weight band
     above 40 kg". **B:** keep today's label.
   - **D12** two magnesium sentences (adult dilution to 10 mL; avoid the adrenaline-infusion line)
     with no packaged source (EAS 14.27 is online only). **A (recommended):** package the EAS 14.27
     export, check both sentences against it word for word, and quote them as written. **B:** remove
     both sentences until EAS 14.27 is packaged.
2. **Citations (P3, recommended yes):** every clinical value and sentence in the rule set carries
   its guideline and page, the checker refuses one without, and a test compares every extract with
   the PDF text. Yes or no.
3. **The checker's six clinical-relationship rules** (ask before E2). The checker is the program
   that refuses to save a faulty rule set in the editor. Six of its rules compare one clinical
   number with another: (1) no child band adrenaline, amiodarone, magnesium or shock energy is
   above the adult value; (2) each child band shock energy equals the band weight times the joules
   per kg; (3) the last child weight band reaches the adult weight limit; (4) the adult shock
   energy is not above the highest energy that can be recorded; (5) the weight an adult is rounded
   to is not above the highest valid weight; (6) the magnesium ampoule volume is not above the
   volume the child dose is diluted to.
   **Option A (recommended): keep all six switched on.** The editor refuses to save a rule set that
   breaks one, and says which. They catch typing slips. Cost: a deliberate exception (a band energy
   typed as 21 J instead of 20 J breaks rule 2) cannot be saved until that rule is switched off in code.
   **Option B: list only.** The editor shows the six as warnings and still saves.
   **Option C: keep on all except rule 2,** which becomes a warning.
   (If D3 option A is chosen, rule 2 goes anyway.)
4. **Order of work (recommended):** principle conformance, then the first editor (E2, E3), then
   v24, then store apps, with stages 3 to 10 after store publication. The 13 Nov order put store
   apps last. Nothing is blocked by this for several weeks.
5. **Unattended runs and the recordings.** Today an unattended run may not re-record the reference
   recordings, so it builds an approved A-row uncommitted and an owner-started chat must finish it
   (as happened with A19). With eight or more rows coming from the deviations, that means one
   owner-started chat per row. **Option A (recommended): allow an unattended run to commit and
   re-record for an approved A-row** when the what-changed report shows that every difference is
   the approved change and the reviewer has no blocking findings. **Option B: keep today's rule.**
6. **Store publication, owner actions** (these have waiting times, so they decide the date):
   - Ask Medsafe whether the app is a medical device (doc 06 "Regulatory position").
   - Ask the guideline's owner for permission to reproduce CPG text and PDFs in a published app,
     and whether they would publish or endorse it. An organisation publishing it would also answer
     Apple rule 1.4.2 and remove Google's testing requirement.
   - Under a personal account (decision 11): Google needs a closed test with 12 testers for 14 days
     before public release; Apple rule 1.4.2 is not satisfied.
   - Open the developer accounts; recruit the 12 testers.
7. Smaller items, each a possible A-row: a manual entry timed later than now is saved as the
   previous day (on purpose, for a case crossing midnight); closing the rhythm pop-up with × leaves
   "Rhythm not recorded"; the tutorial step "Find weight-based RSI doses" still says doses "are
   calculated from the entered weight" (they are looked up since A12); the start-up message shown
   when the rule set cannot be read (wording in `src/rules/parse.js`) may be reworded.

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
- `tests/a19-child-fluids-table-only.test.mjs` (lines 47 to 51) does not prove that the 20 and 40
  in the source line come from the rule set (A11's test has the same gap): change the rule-set
  value in a test and check the line follows. `tests/a11-child-fluids-band.test.mjs` still carries
  an unused `upper` column.
- Retire the engine's original PEA-only `careMode` (kept only for the side-by-side test).
- The Post ROSC checklist may scroll (owner accepts this).
