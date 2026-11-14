# 19. Orchestration brief: building the rules editor (written 12 Nov 2026)

For the chat that runs the build. Read `CLAUDE.md`, then doc 07, then doc 18 (decisions 9 to 25,
the inventory of behaviour still in code, the guideline check), then this page.

## Your role
You are the **orchestrator**. You do not write the stage code yourself. For each stage you:
1. Run all tests (`npm test`) and note the result.
2. Start a **worker** agent with the model and effort in the table, giving it: the stage goal, the
   proof it must meet, the rules below, and the files to read. One stage per worker.
3. When it reports, run all tests yourself (never trust a reported result) and read the diff summary.
4. Start a fresh **reviewer** agent (Opus, high effort) that has not seen the worker's reasoning. It
   reads the changes against the stage proof and the rules, tries to break the new behaviour, and
   reports problems in plain English (scope: "Efficiency rules" below).
5. Fix through the worker (or a new one) until the reviewer has no blocking findings.
6. Commit to `rules-editor` (one commit per step), push, update doc 07 (short) and doc 09 (history).
7. Go to the next stage without asking, unless a stop condition applies.

## Efficiency rules (owner asked for these 13 Nov 2026; they change cost, not safety)
1. **Tight briefs.** Name the exact files and doc line ranges an agent needs. Agents do not read
   docs 01 to 06, 09 or 11 to 17, and read doc 18 only at the lines named. The orchestrator does not
   read doc 09 either: it adds one paragraph at the end.
2. **Tests once per role.** Worker: only the tests that touch its change while building, then the full
   `npm test` once at the end (not the deep run). Orchestrator: full `npm test`, the deep run and the
   recordings check once after the worker, and again after any fix. Reviewer: is given the
   orchestrator's results for that exact commit and does **not** repeat those runs; it spends its
   effort on reading the diff, planting new faults in a scratch copy, and a real-browser check when
   the loader, `sw.js` or screen markup changed.
3. **One review round.** Only blocking findings are fixed now; the rest go on the carried-forward list
   in doc 07. Fixes are checked by messaging the **same** reviewer again, not by starting a new one.
4. **Big stages in steps.** Stages 3, 4, 5, 7 and 8 are cut into 2 or 3 steps, each committed when the
   tests pass, so a usage limit never loses more than one step.
5. **Short reports.** Agent reports are under 300 words and never paste file contents.
6. **New chat at every stage boundary**, so each chat starts small. Docs stay short (doc 07 under about
   120 lines; one paragraph per stage in doc 09).
7. The Agent tool now sets the effort level as well as the model: pass both from the stage table.

## Running unattended (scheduled task switched on 13 Nov 2026, owner's yes in chat)
The scheduled task "Pocket Resus build" starts a fresh chat every 3 hours (at 11 minutes past, on the
Fable model) with the prompt in `docs/20-UNATTENDED-PROMPT.md`, so work carries on after a usage limit
resets and while the owner is away (18 Nov to 2 Dec 2026). The owner can pause it in the Claude app
under scheduled tasks. Every chat, attended or not:
1. **First** run `sh tools/build-progress.sh check`. If it says BUSY, another chat is working: stop at
   once and do nothing else. If it says unfinished work is saved, run `... restore` and carry on from
   the note instead of starting the stage again.
2. Run `sh tools/build-progress.sh save "note"` when starting, and at least once an hour while working
   (workers do this too; put it in their brief). The note says what is done and what is next. This puts
   a snapshot on the scratch branch `rules-editor-wip` only; half-finished work never goes on
   `rules-editor`.
3. If doc 07 shows that everything left is waiting for the owner, stop at once (say so in one line).
   When a chat finishes with everything committed and pushed, its last act is
   `sh tools/build-progress.sh save "IDLE: <what is next>"`, so the next chat can start at once.
4. Before every push run `git pull --rebase origin rules-editor` (another chat may have pushed docs).
5. **Usage limits.** If an agent fails with a limit error, do not retry in a loop and do not swap in a
   different model on your own: note it in doc 07 (which model, when it resets), carry on with work
   that does not need that model, or stop. Opus hit its weekly limit on 13 Nov 2026 (resets 17 Nov
   4 pm NZ time); the owner's answer on who reviews until then is in doc 07.
6. An unattended chat **never pushes to `main`** and never makes a clinical or design choice: it writes
   the question under "Waiting for the owner" in doc 07 (full text of every option, one recommended)
   and moves to other work that is not blocked, or stops.

## Publishing to `main` (owner's standing permission, 13 Nov 2026)
The owner allows pushes to `main` without asking each time, because git keeps every earlier version.
`main` is the live app, so this is used for **complete releases only**: new cache name and test pins,
safer `sw.js` in place (doc 07 "Go-live must do"), `npm test` and the deep run pass, independent
review has no blocking findings, done in a chat the owner started (not an unattended run). Never a
half-built stage. After each release: tell the owner, ask for a phone check of the live app, and be
ready to put the previous version back with one commit.

## Rules for every agent (copy into each worker and reviewer brief)
- Branch `rules-editor` only. Workers and reviewers never touch `main` (releases: see "Publishing to `main`").
- Run all tests before and after every change. **If any test fails, stop and explain in plain
  English.** Never edit `tests/golden/`, never loosen or delete a test to make it pass.
- **No clinical change.** No dose, energy, timing, wording or behaviour may differ from v22 unless it
  is an approved row in doc 07's A-table. Until the last stage every stage must leave every screen
  identical to v22 (the recorded screens and the random-case comparisons prove it).
- Clinical numbers and wording live only in the rule set. The lock-in test must keep passing and is
  extended as more moves into data.
- Ask the owner before: deleting files, installing packages, anything outside the current stage.
- The app is plain static files with no build step, works offline, portrait phone. Keep it that way.
- The rule set is plain YAML data (decision 9; `src/rules/nz-eas.yaml`, which must end with the line `...`): no code, no functions,
  no anchors, aliases or tags. Logic is rule tables read by the engine.
- Name blocks generally where it costs nothing ("counted event", not "shock"): decision 24.
- Comments in plain English; the owner is a clinician, not a programmer.
- The offline store name in `sw.js` carries a fingerprint of every shipped file. After changing any
  file the app ships (anything in the `sw.js` list, or `sw.js`), run `node tools/set-cache-name.mjs`
  or the tests fail. For a release give the new label: `node tools/set-cache-name.mjs v24`.

## Stop conditions (tell the owner, wait)
A failing test you cannot explain as a stage defect and fix within the rules; any clinical question;
anything going to `main`; an owner phone check (marked below); a design choice not covered by doc 18.
Otherwise keep going (decision 25: few checkpoints). Reports to the owner: short, plain English, what
was done, what was proved, what is next; one decision at a time with the full text of every option.

## Before stage 0
A8 (doc 07 A-table) was merged before stage 0 and is live in v23. v22 plus A8 is the reference for
every proof below.

## Stages
Proof for all: tests pass before and after; recorded screens and random-case comparisons identical to
the reference; reviewer has no blocking findings.

| # | Goal | Extra proof | Worker |
|---|---|---|---|
| 0 | **Wider safety net.** Record the reference Live screens, cards, status lines and pop-ups step by step across thousands of generated cases (weights, ages, rhythms, doses, voids, undo, ROSC, re-arrest, special situation, timer moments). New recordings only; existing golden files untouched | Planted behaviour changes (at least 10 different kinds) are each caught | Opus · high |
| 1 | **Rule set becomes a data file** (JSON at the time; YAML from step E1b): `nz-eas.json`, loader, offline list updated, first checker for the five existing parts | Every value and sentence identical; app works offline | Sonnet · medium |
| 2 | **Remaining text and settings into data:** card status lines, labels, titles, messages, disclaimers, timer thresholds, rhythm display names, correction-form rhythm lists, resus-start choices, equipment form questions, log "intervention" list (inventory F, 31, 34, 37, 39, 40) | Lock-in test extended to these | Sonnet · medium |
| 2b (done) | **Safer update, then publish v23.** `sw.js` fix from doc 07 "Go-live must do" (new-version files never saved into the old version's store; old complete set served until the new set is fully installed); new cache name and pins; publish `rules-editor` to `main` as v23 (A8 + JSON rule set + stage 2). Owner phone check of the live app passed 14 Nov 2026 | Test: rules file fails during update, then offline, and the old version still works; real-browser check | Sonnet · medium |
| 3 | **Facts, flags and rule tables.** Engine reads ordered tables. Move into tables: lower slot, torsades flag, amiodarone due and visibility, second-dose and child-advice cases and their precedence, special situation, after-ROSC states, locks (inventory A). Save the "card has appeared" memory in the session | Table-driven engine equals the current engine on every generated case | Fable · high |
| 4 | **Drugs as data and one general card builder.** Drug definitions; dose-method menu (fixed, band table, per kg with cap, per kg with rounding, dose sequence); any number of cards with layout by rule (decision 14); units, routes, maximum doses, intervals (inventory A, C). **Owner phone check after this stage** | With the two reference cards the screen markup is identical; a test-only third card renders and records correctly | Fable · high |
| 5 | **Pop-ups, triggered prompts, situations, on-demand cards.** Pop-ups built from blocks with triggers; situations as data replacing the single switch (built with only today's behaviour); on-demand cards; addable checklists with "where it appears" (inventory B, E; decision 16) | Identical screens; test-only examples of each new block work | Opus · high |
| 6 | **Appearance settings** (decision 22, Option A): named colours, text sizes, card order, pop-up style, labels, icons read from the rule set, with contrast and minimum-size checks; structured so free layout can be added later. **Owner phone check after this stage** | Default settings give identical screens and styles | Opus · medium |
| 7 | **Checker, formulas, scenario tests, difference report.** Full checker (decision 18 limits; every table ends in "otherwise"; no unreachable row; exactly one answer for every case); advanced formula grammar with its safeguards (decision 13); scenario runner; behaviour-difference report between two rule sets | Checker rejects a library of deliberately bad rule sets (at least 30) and accepts the reference; difference report finds planted changes | Fable · high |
| 8 | **The editor** (decisions 12, 19, 20, 23): separate offline page, five tabs. Rules view first; then App view (working phone preview, "Edit" on, tap a card to see every rule attached to it in plain sentences); scenario recorder by tapping; what-changed view. Read the `frontend-design` guidance. **Owner tries it after this stage** | Round trip: open the reference rule set, save without edits, file is identical; every inventory item is reachable from both views | Opus · high |
| 9 | **Approve, publish, rollback** (decisions 18, 21): approval record (editor's name, date, reason, source), version name on screen, previous rule set kept, one-step rollback; trial with a second, deliberately different rule set to find anything still NZ-EAS-specific in code | Second rule set runs with no code change; rollback restores the reference exactly | Opus · high |
| 10 | **First native additions** through the editor only, no code: G1, G2, G3, G10, G11 (doc 18), **one at a time, each needing the owner's approval of the exact content, its own A-table row and its own scenario tests.** Anything that cannot be done in the editor is reported as a missing block, not typed into code | Each addition appears in the difference report and nowhere else | Sonnet · medium, clinical cross-check Opus · high |

| 11 | **Store apps** (owner goal 13 Nov 2026: Android and iPhone apps). Developer accounts under the owner's personal name (14 Nov 2026), so Google needs a closed test with 12 testers for 14 days; Apple rule 1.4.2 is still open (doc 07 "Store apps"). Not designed yet: needs a short design note first. Likely shape: the same files wrapped in a thin native shell, built by GitHub Actions, rule set still updatable without a store release | To be set | To be set |

Reviewer after every stage: Opus · high, fresh agent. Orchestrator: Fable · high.

**Order of work: "editor first" (owner chose Option A, 13 Nov 2026).** After 2 and 2b, build a first
editor for everything that is already data, publish it, then do stages 3, 4, 5 and 6, each widening
what the editor can change (the full stages 7, 8 and 9 are finished as those arrive). First-editor steps:

| # | Goal | Extra proof | Worker |
|---|---|---|---|
| E1 | **Checker for today's rule set, and the what-changed report.** Tighten `src/rules/check.js` for all five parts as they are now (doc 07 "Carried forward" list; decision 18 limits: every number has a type, unit and allowed range, lists in order, wording uses exactly its own gaps and only bold, italic, line break). No rule tables or formulas yet. A tool that runs the generated cases through two rule sets and lists every screen that differs. Checker rules that encode a clinical relationship are listed for the owner, not switched on | Checker rejects a library of at least 30 deliberately bad rule sets and accepts the reference; the report finds planted changes and reports nothing for identical rule sets | Sonnet · high |
| E1b (done) | **Rule set becomes YAML** (decision 9 as changed 13 Nov 2026). `src/rules/nz-eas.yaml` replaces `nz-eas.json`: the same five parts plus `about` and `notes`, every value, type and order identical (a frozen JSON copy stays in `tests/baseline/`). Reader: js-yaml, exact version pinned, copied as one file into `src/vendor/` with its licence (a test proves the copy equals the npm package), used in its strictest mode: plain values only (no dates, anchors, aliases or tags), a repeated name is refused, one document only. One shared writer gives the file a standard layout, so the editor can later save it byte for byte. Loader, offline list, store name, tests and tools re-pointed; the start-up message says YAML. No release | Read YAML equals the frozen JSON (values, types, order); writing the read file gives the identical file; a library of at least 15 YAML traps (yes/no, dates, 012, 1e3, repeated name, anchor, tab, two documents, unquoted colon) is each refused or read exactly as typed, never silently changed; real-browser start, offline, slow and failing rules file; all recordings identical | Sonnet · high |
| E2 | **Editor page, Rules view** (decisions 20, 23, 24; doc 18 lines 250 to 277): a separate offline page of the same site; tabs Rules, Tests, Publish (App view and Appearance come later); edit every value of the five parts with its plain-English note; checker runs as you type and blocks saving an invalid rule set; a large change needs a typed confirmation; what-changed view; no version-history screens, only the current version number (decision 26); saves a rule-set file. Read the `frontend-design` guidance. **Owner tries it after this step** | Round trip: open the reference rule set, save without edits, file identical; every value in the five parts reachable; the live app unchanged | Opus · high |
| E3 | **Approve, publish, rollback** (decisions 18, 21): approval record (editor's name, date, reason, source), rule-set version name on screen, previous rule set kept, one-step rollback, a rule set goes live when confirmed in the editor (decision 20 as changed 14 Nov 2026; needs a short design note first: how the editor publishes) | Rollback restores the previous rule set exactly; the difference report is part of the approval record | Opus · high |

## Going live
Nothing reaches `main` during stages 0 to 9 unless the owner asks. When the owner says yes: new cache
name, update the cache-name pins in the tests, publish, owner phone check of the live app, and be
ready to put the previous version back with one commit.

## Orchestrator notes (learned in stages 0 and 1; keep short)
- The reference is commit ba1304d (v22 + A8 to A12, A16, A18, A15; recordings re-recorded for each on 14 Nov 2026, earlier 91843ae). Code edits of approved rows are listed in `CODE_CHANGES` (`tests/helpers/approved-changes.mjs`) so the fingerprint-only golden tests run on a copy with the approved changes undone. An approved change in code as well as data (A10) gives the original engine the same rule in the old-versus-new engine tests, as A1 did (`tests/helpers/engines.mjs`). **Approved A-table changes (owner Option A, 14 Nov 2026):** each changed rule-set value is listed with its row in `tests/helpers/approved-changes.mjs`; the frozen copies (`tests/baseline/`, `tests/golden/`) are never edited, the identical-to-reference tests compare with them plus exactly those swaps, and the recordings are re-recorded from the change's commit only after the what-changed report shows that every difference is the approved change. The safety net is `tests/reference/` (read its README). `npm test` takes about 3 min on 2 cores, `npm run test:deep` about 8 min; run both yourself after each stage, and check `git diff --exit-code -- tests/golden tests/reference/screens.json tests/reference/saved-sessions.json`.
- A stop hook asks for uncommitted work to be committed and pushed. Commit to `rules-editor` once your own test run passes, labelled "awaiting independent review"; fixes follow as further commits. Never commit a half-edited or untested tree.
- If an agent stops on a usage limit, resume the same agent with a message after the reset if still in the same chat; a new chat restores the saved snapshot instead ("Running unattended").
- Reviewer briefs that worked: re-run tests; diff scope; plant new faults in a scratch copy (never in the repo); from stage 1 on, a real-browser check with the pre-installed Playwright Chromium (start, a short case compared with the reference, offline, slow and failing rules file). `tools/check-offline-browser.cjs` exists. The fake-browser tests bypass `src/rules/load.js`, so only a real browser proves the loader.
- When a stage moves text or values into the rule set: planted-change search texts must be re-pointed (same change, found once); new wording keys go into the checker's table; the lock-in test scans `src/app`, `src/engine` and `src/rules/*.js`.
- Carried-forward items and what is waiting for the owner are listed in doc 07 under the progress table.
- Agents always start in the background and report back by themselves; wait for the report. Run the deep run in the foreground with a 10-minute time limit (a background run was stopped half-way on 13 Nov 2026).
- Stage 2 cost: worker about 25 minutes, reviewer similar. Reviewer brief that worked is in doc 09's stage 2 entry in outline: test-loosening check on every changed test, both directions of the move (JSON to old code, old code to JSON), 8 or more new planted faults in a scratch copy, real-browser run against 91843ae.
- From stage 2 on, frozen additions live in `tests/baseline/stage2-additions.json`; a later stage that adds values adds its own frozen file the same way and never edits an earlier one.
- The owner sometimes edits files on `main` directly on GitHub. At the start of every chat run `git fetch origin main` and, if `main` has commits the branch lacks, merge them into `rules-editor` first (keep the branch's version of a doc where they clash and record the owner's text for reconciling, as in doc 18's last section).
- `git pull --rebase` fails on this branch since `main` was merged into it (14 Nov 2026: it replays old `main` commits). Instead `git fetch origin rules-editor`, check `git merge-base --is-ancestor origin/rules-editor HEAD`, then push; if the remote has new commits, `git pull --no-rebase`.
- A release: merge `main` in, run the full tests on the merged commit, update docs, push `rules-editor`, then `git push origin HEAD:main` (fast-forward only, never force).
- A worker's `build-progress.sh save` also marks the build as busy, so a scheduled run that starts while a worker is busy stops by itself; that is intended.
- E1 (14 Nov 2026): worker 14 min, fixes 17 min, reviewer 11 min, re-check 2 min. The reviewer's best finding came from following rule-set text to where the app writes it into the page; ask every reviewer to trace edited text to the screen, not only to read the checker. A chat that stops mid-review leaves no reviewer to resume: the next chat fixes the noted findings, then starts a fresh reviewer on the whole stage.
- E1b (14 Nov 2026): first worker ran out of chat time; second worker 7 min, fix 10 min, reviewer 12 min, re-check 5 min. A restored snapshot's note ("all done except the final test") was wrong: always run the full tests on restored work before believing the note. Run `npm test` (5 min) and the deep run (9 min) as two separate commands; together they pass the 10-minute limit. The reviewer's blocking finding came from serving a damaged rules file to a real browser: when a file format changes, ask what kinds of damage the new format tolerates that the old one did not. Tests that build YAML text must end it with `...`.
- Start a new chat at a stage boundary, never mid-review (agents cannot be resumed from another chat). The owner has a standard prompt that reads doc 07 and this page; update both first.
