# Hand-off (read this first in any new chat)

Keep this page short: current state, decisions and next steps only. Dated detail goes in
`09-STAGE-HISTORY.md`. Update this page at each checkpoint.

## Project
Pocket Resus (https://github.com/Dklapaukh/Pocket_Resus, branch `main`, live at
dklapaukh.github.io/Pocket_Resus): an offline phone app that runs a cardiac arrest as an
active flowchart and records events. NZ EAS CPGs (PDFs in repo, exports 24 Sep 2026) are the
clinical authority. The owner is a clinician (not a developer) and the clinical reviewer;
independent clinical review is deferred until the code and other key goals are ready.

## How we work
- Claude (claude.ai app, attached to the GitHub repo) does the work: reads, edits, runs tests,
  commits and pushes. No zip uploads. Claude Code is not needed; tell the owner if a task
  would genuinely be better there.
- Continue approved work without routine checkpoints; stop only for a clinical decision,
  approval, or an owner action (e.g. a phone check).
- **`main` (owner 13 Nov 2026):** standing permission to publish without asking each time, used for
  complete releases only (doc 19 "Publishing to `main`"). Git history is the rollback.
- **Unattended running (on since 13 Nov 2026):** the scheduled task "Pocket Resus build" restarts the
  build every 3 hours; every chat first runs `sh tools/build-progress.sh check` (doc 19 "Running
  unattended"). The owner can pause it any time in the Claude app under scheduled tasks.
- **Usage:** Opus reached its weekly limit on 13 Nov 2026 (resets 17 Nov, 4 pm NZ time) but an Opus
  reviewer ran normally on 14 Nov 2026. The plan's weekly allowance, not the work, sets the pace.
- **Owner goal (13 Nov 2026):** secure Android and iPhone apps with the editor in place, by December.
  Owner is away 18 Nov to 2 Dec 2026 with a phone only (can answer questions and do phone checks).
- Explain simply, recommend one option, show the full text of any options, one decision at a time.
- **Token efficiency:** when a chat gets long or slow, give the owner a ready-to-paste prompt to
  start a new chat (objective, state, next steps). Keep docs tidy so new chats start cheaply.

## Current state (14 Nov 2026)
- **Live: v23** (store name `resus-pocket-v23-bbd0202f01`, published 13 Nov 2026) = v22 plus A8 (ROSC
  "Other" fix), the rule set as a data file (stage 1), remaining screen text in the rule set (stage 2)
  and the safer update step (stage 2b). **Confirmed on phones (owner, 14 Nov 2026):** starts in
  airplane mode, Start works, ROSC "Other" gives no "Continue CPR" pop-up (A8). The separate A7 check
  ("Other" triggers fluids, doc 09 11 Nov entry) has not been confirmed on its own.
- **Not live yet (branch `rules-editor`):** steps E1 and E1b; the rule set there is YAML
  (`src/rules/nz-eas.yaml`). The live v23 still loads `nz-eas.json` until the next release.
- **Step 2 done (12 Nov 2026):** every drug-card rule is now in the engine
  (`src/engine/drug-cards.js`) with its numbers and wording in `src/rules/nz-eas.js`; no value or
  text changed (3000-session old-vs-new test). Saved-session fixes (doc 17, doc 11 comma weight)
  done in `restoreSaved` (`core.js`). 151 tests pass.
- Owner rulings 11 Nov 2026: "Other" triggers fluids (A7, built); fentanyl hypertension
  threshold and extra amiodarone contraindications are NOT to be added.

## Goal and next steps
Goal: readable, auditable code with all clinical rules in a rules file, then a **rules editor**
so rules can be updated, and new rule sets made for other services, without touching code.
1. **Done:** readable engine + rules file for engine numbers (11 Nov).
2. **Done:** app-layer clinical rules moved into the engine / rules file; storage fixes (12 Nov).
3. **Next: rules editor (design in progress, doc 18, branch `rules-editor`).** Owner 12 Nov 2026:
   one rule set per service holds numbers AND guideline text, approved together. First (3a) move
   every remaining rule and guideline extract out of the app code into the rule set, clearly
   partitioned into five parts (owner, decision 2); then design and build the editor.
   **Step 3a sub-steps 0–8 done (12 Nov 2026, branch `rules-editor`, not live):** every clinical
   number, guideline sentence, checklist, equipment list and source is in `src/rules/nz-eas.js`
   (five parts); screens proved identical to v21 (278 recorded screens); lock-in test stops them
   creeping back. 182 tests pass. **Sub-step 9:** owner chose to publish first, then phone-check
   the live app (published as v22, 12 Nov 2026). Owner: format YAML (doc 18
   decision 9, changed 13 Nov 2026, built in step E1b); editor must cover any clinically relevant function plus visual settings
   (decision 10). **Re-plan drafted 12 Nov 2026 in doc 18** (inventory of behaviour still in
   code, revised plan, stages); nothing built. Decision 11 made (menus and rule tables). Owner goals added (decision 12):
   two ways into the editor (tap a card in an app view; technical rules view) and, long term, a
   no-code flowchart-to-app platform. **EAS 3.14 checked 12 Nov 2026 (doc 18).** Decisions 13–25 made
   12 Nov 2026 (doc 18 table). Guideline candidates kept: G1, G2, G3, G10, G11 (added later through
   the editor, each approved separately). **A8 merged into `rules-editor` 12 Nov 2026 (not live); v22 + A8 is the reference for the build.**
   **Orchestrated build (doc 19) started 12 Nov 2026; progress table below.**
4. Later: retire the engine's original PEA-only `careMode` (kept only for the side-by-side test).

## Rules editor build progress (doc 19; detail in doc 09)
| Stage | State |
|---|---|
| Before 0: A8 merged | Done 12 Nov 2026 |
| 0 Wider safety net | Done 13 Nov 2026. `tests/reference/` (read its README): 3,609 recorded cases from 91843ae; first 249 replayed by `npm test`, all by `npm run test:deep`; 51 planted faults caught; two independent reviews, no blocking findings. 246 tests pass |
| 1 Rule set becomes JSON | Done 13 Nov 2026. `src/rules/nz-eas.json` (five parts + `about` + `notes`), `load.js`, `parse.js`, `check.js` (first checker, tests only); old file kept as `tests/baseline/nz-eas-v22-a8.js`. 425 values identical incl. order; real-browser start, offline, slow network and failure cases checked; review: no blocking findings. 318 tests pass |
| 2 Remaining text and settings into data | Done 13 Nov 2026 (commit 097ee00). 506 values added to `nz-eas.json` (labels, messages, timer thresholds, rhythm button names, correction-form lists, resus-start choices, equipment form questions, log intervention list, export labels); additions frozen in `tests/baseline/stage2-additions.json`; all 425 earlier values identical. 359 tests and the deep run pass; real-browser check matched the reference on 21 screens and offline; 25 new planted faults caught; review: no blocking findings |
| 2b Safer update (`sw.js`), then publish v23 | Done and **published as v23 on 13 Nov 2026** (commits c770cb8, b028bdc; release d28f809 plus docs). New `sw.js`: a complete new set is downloaded and checked against the fingerprint in its store name before anything changes; answers come from the version's own store; nothing is saved while the app runs; a new version takes over only at a fresh open. `tools/set-cache-name.mjs` sets the name; a test fails if a shipped file changes without a new name. 375 tests and the deep run pass; review (Opus, high, two passes): no blocking findings, 31 planted faults caught after fixes, real-browser v22 → v23 update clean. Owner phone check passed 14 Nov 2026 |
| E1 Checker for today's rule set + what-changed report | Done 14 Nov 2026 (commits df08202, a58c974, 328b76d). `src/rules/check.js`: every number has a type and an allowed range, lists in order, wording uses exactly its own gaps and only bold, italic and line break (checklists included), no double quotes in any rule-set text, web addresses `https://` only; over 70 deliberately bad rule sets rejected, reference accepted. `tools/rules-diff.mjs` plays the generated cases through two rule sets and lists every screen and saved-session difference; it never says "no differences" when nothing was compared. 494 tests and the deep run pass; review (Opus, high): no blocking findings after two rounds of fixes; app behaviour unchanged (the app never loads the checker) |
| E1b Rule set becomes YAML | Done 14 Nov 2026 (commits e41d850, 36f9a53; not live). `src/rules/nz-eas.yaml` replaces `nz-eas.json`: all 991 values identical in value, type and order to the frozen copy `tests/baseline/nz-eas-before-yaml.json`. Reader `src/rules/parse.js` uses js-yaml 5.5.0 (one file in `src/vendor/`, proved equal to the published package) in its strictest mode: look-alike numbers, dates, repeated names, anchors, tags, comments, tabs and a second document are refused; `yes`, `no`, `~` stay text. The file must hold exactly the seven parts in order and end with the line `...`, so a file cut short anywhere is refused (tested at every character). Writer `src/rules/write.js` rewrites the file byte for byte. 627 tests and the deep run pass; review (Opus, high): one blocking finding (cut-short file could start the app) fixed and re-checked, 19 of 19 effective planted faults caught, real-browser start, offline, slow, broken file and update from the previous store all clean |
| E2 Editor page, Rules view | **Next.** The editor points are answered (doc 18 decisions 20 and 26). One question is still to be asked before it starts: the checker's clinical-relationship rules (under "Waiting for the owner") |
| E3 Approve, publish, rollback | After E2; needs a short design note first: how a rule set confirmed in the editor goes live (doc 18 decision 20) |
| 3 to 6, then full 7 to 10, 11 store apps | After the first editor is published (owner chose "editor first", 13 Nov 2026) |

**Carried forward from the stage 2b review (not blocking; do before the next release, v24):**
- The start page entry `./` is not part of the install check (harmless for v23: `index.html` is unchanged since v22). Require the `./` download to equal `index.html`.
- `tools/check-offline-browser.cjs` sometimes fails at "old store changed" because the test browser still checks for updates while "offline"; wait for that install to end.
- Nothing runs the tests automatically on GitHub before a release (a GitHub Actions check would).
- The one-off v22 → v23 update is unprotected (old v22 code on phones): if a download fails during that visit the app may not start offline until the phone next has signal; one open with signal repairs it.
- Not checked anywhere: real phones, iPhone Safari, the bytes GitHub Pages actually serves.

**Carried forward from the stage 2 review (not blocking; do before the editor is used):**
- The 100 limit on the earlier-counts boxes is typed in code (three places) while its error text "0–100" is in the rule set: move the limit into the rule set (stage 3).
- `index.html` still holds screen text ("Saving unavailable", tab names, header labels): move with appearance settings (stage 6) or earlier.
- Changing a name in `wording.drugNames` does not change which hand-typed names count as that medicine (noted in the file).

**Carried forward from the E1 review (not blocking; do before the editor is used, E2):**
- The checker's ranges only stop the impossible: a tenfold slip passes (adult adrenaline 10 mg). The editor's typed confirmation for a large change (E2) and the what-changed report are the guard; consider tighter ranges.
- Rhythm names the code relies on (PEA, Torsades and others) can be renamed or removed and the checker still passes.
- Bold and italic tags in the wrong order pass; a `<` meaning "less than" is refused (false alarm); `&quot;` shows as a quote mark (harmless).
- What-changed tool: two rule sets that fail the checker in the same way are reported as the same (the warnings are printed); a case over the testing limits under only one rule set is left out, not reported as a change; a reversed range (`5-3`) says "nothing compared".
- The app writes rule-set text into page attributes without escaping it; the checker now refuses double quotes instead. Escape in the app (stage 4 or 6) so quotes can be allowed again.

**Carried forward from the E1b review (not blocking; do before the editor saves files, E2):**
- The writer can write `-0`, `1e-7` and `1e21` in a form the reader then refuses (the editor could save a file it cannot reopen).
- Numbers with more than about 16 digits lose their last digits without an error (JSON did the same): refuse a number that does not write back as typed.
- The reader accepts things the writer never writes: `|` and `>` multi-line text, plain text carried onto a second line, escapes that make invisible characters, and a JSON-style body (values read correctly). Refuse them in the reader or the checker.
- Deleting one whole line from the rules file (a deliberate edit, not a cut) is still read, and the phone does not run the checker, so the app would start without that setting (JSON had the same weakness). Design question for E3: should the phone run the checker, or check a fingerprint of the rules file?
- `tools/rules-diff.mjs` cannot read the YAML of commit e41d850 (no end line); older commits fall back to their JSON.

**Owner's limits for test cases (13 Nov 2026):** do not run test cases that record a case longer than
90 minutes, and adrenaline is never given more than 10 times to one patient. Apply to every NEW
generated or recorded test case (E1 difference report, later safety-net additions): at most 90 minutes
of case time and at most 10 adrenaline doses. These are limits on testing, NOT app rules: the app's
behaviour is unchanged (owner confirmed 13 Nov 2026: testing only). Existing recordings are not
edited and none is skipped: the pretend clock means long cases take no longer to replay, and the
owner said not to skip them if it saves no time.

**Waiting for the owner:**
- **Dose sources: owner's rules (14 Nov 2026). Not built; each is a clinical change needing its own
  A-table row with exact values, the owner's approval of that row, and its own test, in a chat the
  owner started.** (1) The entered weight is rounded to a guideline weight band and that band is used
  for every dose (**exact rounding rule to confirm, question below**). (2) Where the guideline gives a
  dose formula (for example 2 mg/kg, 20–40 mL/kg), a simple calculation is acceptable if the screen
  shows how it was worked out and the guideline it came from. This replaces "read fluids, tube sizes
  and RSI doses from tables only" (Option A, earlier the same day). (3) Where a dose is unclear or
  missing in the guideline, the app says "Seek clinical advice" and shows no number. Under (3): a
  child's second amiodarone dose (already so; the unsourced stored numbers should be removed) and
  magnesium at 5 and 10 kg (today reads "Dose: clinical review").
- **QUESTION TO ANSWER NEXT (weight rounding; asked 14 Nov 2026).** The owner wrote "rounded to the
  nearest 10". The guideline (EAS 7.2 page 1) rounds a child's weight **up** to 5, 10, 20, 30 or 40 kg,
  which is what the app does now (owner decision 2). "Nearest 10" would put a 12 kg child on the 10 kg
  doses (the guideline says 20 kg) and has no 5 kg band.
  - **Option A (recommended):** Children: round up to the guideline bands 5, 10, 20, 30, 40 kg (as now).
    Adults (over 40 kg), for RSI doses only: round up to the next 10 kg, matching the columns of the
    EAS 9.3 adult table (50 to 100 kg); 100 kg or more uses the last column.
  - **Option B:** Round to the nearest 10 kg for everyone, as written (12 kg uses 10 kg doses; under
    5 kg has no band). This differs from the guideline.
  - **Option C:** Round up to the next 10 kg for everyone, with no 5 kg band (a 3 kg baby uses the
    10 kg doses). This differs from the guideline.
- Reviewer (answered 13 Nov 2026): Opus · high; Fable · high if Opus is stopped by a limit again.
- **Store apps (owner 14 Nov 2026): developer accounts go under the owner's personal name.** So Google
  requires a closed test with 12 testers for 14 days before public release (organisation accounts are
  exempt). Apple's review rule 1.4.2 (dose calculators must come from a hospital, university,
  manufacturer or similar approved body, or have regulator approval) is **still open, not satisfied**.
  **Owner's design principle (intended, not yet fully true):** the app is not a clinical calculator; it
  only shows recommendations taken from the guideline dose tables, so the only check needed is that it
  matches the guidelines; clinical decisions (for example diagnosing torsades) are made only by the
  clinician. Checked 14 Nov 2026 (doc 11): true for the arrest drug doses and shock energy; not true
  for child fluid volume, weight from age, tube sizes and RSI doses, which are calculated (owner chose to
  move them to table look-ups, item above). The app already installs from the web link on both kinds of phone. Whether it is a medical
  device under NZ law is a question for Medsafe.
- New start-up message if the rule set cannot be read (stage 1; wording in `src/rules/parse.js`): owner may reword.
- Checker rules that encode clinical relationships (child value not above adult; band shock = band weight × J/kg; last child band reaches the adult limit; six in all) have been switched on since stage 1, though E1 said to list them only. Example of what they refuse: a band energy rounded to a defibrillator step (20 J typed as 21 J). Keep them on, or list only? To be asked before E2.
- Three existing app behaviours found while recording (unchanged, recorded as they are; each a possible A-table row, one decision at a time): (1) a manual entry timed later than now is saved as the previous day; (2) closing the rhythm pop-up with × leaves "Rhythm not recorded"; (3) Tube sizes "Use age" with an empty or non-number box saves age 0 and shows infant sizes.

## Decisions made by owner
1. Not rebuilt (historical): pause/resume, Reviewed/Suspected causes screen, "record rhythm
   only", VF/VT/torsades images, single-item live checklist. 4Hs/4Ts guidance prompts kept.
2. Weights round **up** to CPG bands for drug doses (5, 10, 20, 30, 40 kg; above 40 kg adult).
3. "+ Previous shock" just adds 1 to the shock count (no sheet).
4. App is portrait only.
5. Clinical changes are made one at a time, each with its own test and owner approval.
6. Engine exact-line safeguard replaced by result-equivalence checks (11 Nov 2026).

## Approved changes: apply only AFTER parity is proven
| ID | Change | Status |
|---|---|---|
| A1 | **Shock energy:** round weight up to the CPG weight band, multiply by 4 J/kg (bottom of the EAS 7.2 range), cap 200 J. Current app uses exact weight × 4 (42 kg shows 168 J; would become 50 kg → 200 J; 25 kg shows 100 J; would become 30 kg → 120 J). Owner said "round up to nearest 5 kg". The guideline bands are 5/10/20/30/40, which differ at 15 kg (5 kg steps: 60 J; bands: 20 kg band → 80 J) | **Applied 3 Nov 2026** (owner: bands; apply to everyone incl. <5 kg; pads rule stays ≤100 J). Needs upload + phone check |
| A2 | **Amiodarone card must not show from the start.** Proposed rule: appears when due (3 shocks in VF/VT including previous shocks; second dose at 6), stays once shown. Uses existing `amioDue` logic. Needs a decision on what fills the space before then | **Applied 3 Nov 2026** (grey tile confirmed on phone). Gate corrected by **A2b** (3 Nov 2026, needs upload + phone check) |
| A2c | **Fluids after any non-shockable rhythm** (PEA or Asystole at the latest check); VF/VT bring amiodarone/magnesium back; neutral fluids wording and pop-up for both rhythms (owner Option 1) | **Applied 3 Nov 2026; lost in the C6b-2 upload and restored 4 Nov 2026**, needs upload + phone check |
| A7 | **"Other" triggers fluids** like PEA and Asystole (fluids card, pop-up, caption names the rhythm) | **Applied 11 Nov 2026** (owner ruling), needs upload + phone check |
| A8 | **A rhythm recorded with ROSC never triggers fluids.** Before: ROSC recorded as "Other" opened the "Non-shockable rhythm · fluid guidance" pop-up ("Continue CPR") and showed the fluids card after a re-arrest (side effect of A7). "Other" at a no-shock check is unchanged. After PEA or Asystole → ROSC "Other" → re-arrest the fluids line names the earlier rhythm ("PEA · review fluid volume"), as it already did after ROSC "Sinus rhythm" | **Approved 12 Nov 2026 (doc 18 decision 15).** Owner agreed to update the step 2 comparison test (confirmed 14 Nov 2026 that this is what "Option A" meant): old code kept word for word; engine must equal "old code + A8" on 3000 cases; new test proves A8 is the only difference. Independent review: no blocking findings. 189 tests pass. **Live in v23 (13 Nov 2026); owner phone check passed 14 Nov 2026** |
| A3 | Portrait lock: add `"orientation":"portrait"` to `manifest.webmanifest` (works for the installed app, not for a normal browser tab) | **Applied; confirmed working on phone 3 Nov 2026** |
| A4 | Countdown digits look too small in v16 (really: on shorter screens and in a Chrome tab); enlarge without re-creating the "+ Previous shock" overlap | **Applied 4 Nov 2026** as a short-screen layout change (shock block beside the digits), because the size number alone could not do it (see State). Owner phone check passed 4 Nov 2026 with tweaks (A4b); A4b passed with one more tweak, applied as **A4c** (needs upload + phone check) |
| A5 | Guard against double-tap recording a drug twice: adrenaline greyed out 3 min 30 s; magnesium and fluids 5 s, not greyed | **Applied 4 Nov 2026** (owner ruling), needs upload + phone check |
| A6 | Keep a backup of an unreadable saved session instead of silently discarding it | **Applied 4 Nov 2026** (owner ruling: build it, with a short message), needs upload + phone check |

## Open clinical flags (preserve current behaviour until ruled)
C3, C5, C6a ruled **Keep**; C4 Keep for doses (energy uses bands under A1). **C6b:** child
second amiodarone dose (half of first) has no EAS source: card reads "Seek clinical advice" with
a Select dose button (C6b-2). Pads prompt (100 J or less) applies up to 20 kg.

## Observations
- Post-ROSC checklist may scroll; owner accepts this.
- Root JS files (`app.js`, `core.js`, etc.) are the original app, kept only as test baselines.
