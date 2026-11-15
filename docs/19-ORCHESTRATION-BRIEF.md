# 19. Orchestration brief (Opus orchestrator, from 15 Nov 2026)

For the chat that runs the build, attended or not. Read `CLAUDE.md`, then doc 07 (state, what is
next, what is waiting for the owner), then this page. Read docs 06, 11 and 18 only where a step
card says so. Fable is no longer available: no step may name it.

## Roles and models
| Role | Model · effort | Notes |
|---|---|---|
| Orchestrator (you) | Opus · high | Runs tests, briefs agents, checks proofs, commits, updates docs. Writes no step code |
| Worker, routine step | Sonnet · high | Steps with an exact specification: A-rows, data moves, tools, wrappers |
| Worker, hard step | Opus · high (xhigh where the card says) | New designs: editor screens, rule tables, card builder, checker grammar |
| Reviewer, every step | Opus · high, fresh agent | Has not seen the worker's reasoning. Independence comes from the fresh start and a different method (planted faults, real browser), since worker and reviewer may be the same model |

Why this differs from the Fable plan: the hard stages are cut smaller, each starts with a short
design note that is reviewed before any code, and every chat does **one step**. That keeps each
chat small and means a usage limit or a mistake costs one step at most.

## The loop for one step
1. `sh tools/build-progress.sh check`. BUSY: stop at once. Saved unfinished work: `restore`, run
   the full tests on it before believing its note, and carry on from there. Exception: if the
   saved work is an A-row waiting for an owner-started chat (see "Running unattended"), an
   unattended chat stops at once and commits nothing, because any commit would orphan the snapshot.
2. `git fetch origin main`; if `main` has commits the branch lacks (the owner sometimes edits on
   GitHub), merge them first, keeping the branch's version of a doc where they clash and telling
   the owner what was on `main`.
3. Take the first step in doc 07's progress table that is not done and not waiting for the owner.
   Read its card below. If no step is free, stop and say so in one line.
4. Run `npm test`, then `npm run test:deep` (two separate commands; about 5 and 9 minutes; deep run
   in the foreground with a 10-minute limit). Both must pass before anything is changed.
5. `sh tools/build-progress.sh save "starting <step>"`. Start the worker with: the card, the "Rules
   for every agent" below, the exact files to read, and the instruction to save a snapshot at least
   once an hour. One step per worker. Agents start in the background; wait for the report.
6. When it reports, run both test commands yourself (never trust a reported result) and
   `git diff --exit-code -- tests/golden tests/reference/screens.json tests/reference/saved-sessions.json`
   (must be clean unless the card says recordings change). Read the diff summary.
7. Commit to `rules-editor` labelled "awaiting independent review". Start the reviewer with your
   test results for that commit (it does not repeat those runs), the diff scope and the card's
   proof. It must: read every changed test for loosening; trace edited text from the rule set to
   the screen; plant at least 8 new faults in a scratch copy (never in the repo) and confirm each
   is caught; run a real-browser check (start, a short case, offline, slow and damaged rules file)
   when the loader, `sw.js`, screen markup or the file format changed.
8. Blocking findings go back to the same worker, then to the **same** reviewer by message. One
   review round; non-blocking findings go on doc 07's "Carried forward" list.
9. Update doc 07 (progress table, A-table, waiting list) and doc 11 if anything clinical on screen
   changed. Put the proof in the commit message. Push (see "Git"). Last act:
   `sh tools/build-progress.sh save "IDLE: <what is next>"`. Then stop: one step per chat.

## Rules for every agent (copy into each worker and reviewer brief)
- **The guiding principle (doc 06) governs every change:** the app shows NZ EAS CPG content, as
  written, and calculates only what a guideline says. Anything clinical on screen has a row in doc 11.
- Branch `rules-editor` only. Never touch `main`.
- Run the tests before and after. **If any test fails, stop and explain in plain English.** Never
  edit `tests/golden/` or the reference recordings, never loosen or delete a test to make it pass.
- **No clinical change** unless it is an approved row in doc 07's A-table. Every other step must
  leave every screen identical to the reference (recorded screens and random-case comparisons).
- Clinical numbers and wording live only in `src/rules/nz-eas.yaml` (plain data, ends with `...`).
  The lock-in test must keep passing and is extended when more moves into data.
- Ask the owner before: deleting files, installing packages, anything outside the current step.
- The app is plain static files with no build step, offline, portrait phone. Keep it that way.
- After changing any file the app ships (the `sw.js` list, or `sw.js`), run
  `node tools/set-cache-name.mjs` or the tests fail.
- Comments in plain English; the owner is a clinician. Name blocks generally (doc 18 decision 24).
- Reports under 300 words; never paste file contents. Read only the files and line ranges named.

## Stop conditions
A failing test you cannot explain as a defect of the step and fix within the rules; any clinical
question; any design choice not settled in docs 06 or 18; an owner phone check; a release. In an
attended chat, ask the owner (plain English, one decision, full text of every option, one
recommended). In an unattended chat, write the question under "Waiting for the owner" in doc 07 in
the same form and move to a step that is not blocked, or stop.

## Running unattended
The scheduled task "Pocket Resus build" starts a fresh Opus chat every 3 hours with the prompt
below. To change it, update the task and this section together. An unattended chat never pushes to
`main`, never makes a clinical or design choice, and **never touches the reference recordings**
(doc 07 waiting list 2 asks the owner whether to relax this). An approved A-row cannot be committed
with passing tests until the recordings are re-recorded, so an unattended chat: builds the row
uncommitted; proves the end state in a scratch copy (clone, apply, commit there,
`node tests/reference/record.mjs --commit <it>`, `npm test`, deep run); has it reviewed; commits
docs only (doc 07: "A-row waits for an owner-started chat"); then saves the work with
`sh tools/build-progress.sh save "IDLE: <row> built, waits for an owner-started chat"`. The
owner-started chat restores it, runs `npm test` (only the recording-based tests may fail), commits
the row, re-records from that commit, checks the recordings differ only where the what-changed
report said, runs `npm test` and the deep run, and commits the recordings.

```
Continue the Pocket Resus build (github.com/Dklapaukh/Pocket_Resus). This is an UNATTENDED run started by a schedule: the owner is not watching and cannot answer questions now.

1. Attach the repo with push access (owner Dklapaukh, repo Pocket_Resus), clone it, fetch and check out branch `rules-editor`, run `npm ci`.
2. FIRST run `sh tools/build-progress.sh check`. If it prints BUSY, another chat is already working: stop immediately, do nothing else, and say so in one line.
3. Read `CLAUDE.md`, then `docs/07-HANDOFF-AND-CHANGE-BACKLOG.md`, then all of `docs/19-ORCHESTRATION-BRIEF.md`. Read docs 06, 11 and 18 only where the step card in doc 19 says so.
4. If doc 07 shows that every remaining step is waiting for the owner, stop at once and say so in one line.
5. Otherwise act as the orchestrator in doc 19 and follow "The loop for one step" exactly, for ONE step: the first step in doc 07's progress table that is not done and not waiting for the owner (or the saved unfinished work, if the check in step 2 reported any). Use the worker and reviewer models and effort levels in doc 19. Never use Fable.
6. Limits: never push to `main`; never make a clinical or design decision (write it under "Waiting for the owner" in doc 07 with the full text of every option and one recommendation); never edit `tests/golden/` or the reference recordings (for an approved A-row follow "Running unattended" in doc 19: build uncommitted, prove in a scratch copy, save the snapshot); never loosen a test. If a test fails and you cannot explain and fix it within the rules, stop and write a plain-English explanation at the top of the progress table in doc 07. If a model reports a usage limit, do not retry in a loop and do not swap models: note it in doc 07 and stop.
7. Update doc 07 (and doc 11 if anything clinical on screen changed), commit and push to `rules-editor`, then run `sh tools/build-progress.sh save "IDLE: <what is next>"`.
8. Finish with a short plain-English summary for the owner (a clinician, not a programmer): what was done, what was proved, what is next, and at most one question.
```

**Prompt for a chat the owner starts** (paste as is):

```
Continue the Pocket Resus build (github.com/Dklapaukh/Pocket_Resus). Attach the repo with push access, check out branch `rules-editor`, run `npm ci`, then `sh tools/build-progress.sh check`. Read `CLAUDE.md`, then `docs/07-HANDOFF-AND-CHANGE-BACKLOG.md`, then `docs/19-ORCHESTRATION-BRIEF.md`. If the check reports a saved A-row waiting for an owner-started chat, finish it first (doc 19 "Running unattended"). Then ask me the next question under "Waiting for the owner" in doc 07 (one at a time, full text of every option, one recommended). Then act as the orchestrator in doc 19 for the next free step. Explain simply. Update the docs before you finish so this same prompt works again.
```

## Usage limits
Opus does the orchestrating, the reviews and the hard steps, so the weekly Opus allowance sets the
pace. Keep it for where it matters: tight briefs; Sonnet for every routine step; no agent reads
docs it was not pointed to; one review round. If Opus reports a limit: note the reset time in
doc 07 and stop. Do not review Opus-or-Sonnet work with a weaker reviewer to keep going.

## Work plan
Order is the owner's (doc 06 decision 17): rows A20 to A26, P3, A27 to A32, E2, E3, v24, store apps. Proof for every step: tests pass before and
after; screens identical to the reference except where an approved A-row says otherwise; reviewer
has no blocking findings.

| Step | Goal | Extra proof | Worker |
|---|---|---|---|
| A-row (rows from P2) | Build one approved row from doc 07 exactly as written. Add its test and its entry in `tests/helpers/approved-changes.mjs`; never edit the frozen copies. Run the what-changed report on all cases; the reference is re-recorded from the change's commit only after the report shows every difference is the approved change (in an owner-started chat: see "Running unattended"). Shrink the row in doc 07 to one line; update doc 11 | What-changed report lists only the row's screens; no saved session differs unless the row says so | Sonnet · high |
| P1 | **Trace check.** Read doc 11 and the rule set against the text of each packaged PDF (`pdftotext -layout`), cell by cell for sections 1 to 3. Then search the rule set's `wording` and `checklists` for any clinical sentence or number with no row in doc 11. Correct doc 11; list anything new as a further deviation (D9 onward) with options, under doc 07 question 1. No app change | Every row of doc 11 marked checked, with the page; reviewer re-checks 15 cells chosen at random | Opus · high |
| P2 | **Deviations.** For each owner ruling on D1 to D12: write the full A-row, then build it as an A-row step. One ruling, one row, one chat | As for an A-row | Sonnet · high |
| P3 | **Citations** (approved, doc 06 decision 15). Each clinical value and sentence in the rule set gets its guideline and page (a parallel `citations` block beside `notes`, so no existing value moves); checker rule: none missing; new test compares every sentence marked as an extract with the PDF text. Read doc 18 "What the guiding principle requires" | All existing values identical; a planted missing citation and a planted one-word change to an extract are both caught | Sonnet · high |
| E2a | **Editor page, read-only.** A separate offline page of the same site that opens the rule set and shows every value of the five parts with its note and citation; tabs Rules, Tests, Publish (shells). Read doc 18 decisions 20, 23, 24, 26 and the `frontend-design` guidance. Start with a one-page design note; reviewer checks the note before any code | Every value reachable; live app files unchanged | Opus · high |
| E2b | **Editing and saving.** Edit any value; the checker runs as you type and blocks saving an invalid rule set; do the "before the editor saves files" items in doc 07 first | Open the reference rule set and save without edits: file identical byte for byte; invalid edits cannot be saved | Opus · high |
| E2c | **What-changed view and large-change confirmation** (decision 18). **Owner tries the editor after this step** | Planted edits appear in the view; a doubled dose needs the typed confirmation | Opus · high |
| E3 | **Approve, publish, rollback** (decisions 18, 20, 21, 26). Design note first (how a confirmed rule set goes live; whether the phone runs the checker or checks a fingerprint): the owner approves the note before any code | Rollback restores the previous rule set exactly; the what-changed report is part of the approval record | Opus · high |
| v24 | **Release** (attended chat only): see "Release" | Owner phone checks | Orchestrator |
| S1 | **Store apps, design note:** how the same files are wrapped for Android and iPhone, built by GitHub Actions, with the rule set still updatable; privacy policy and store listing text; what each store will ask about medical content (doc 06 "Regulatory position"). Owner approves the note | Note only | Opus · high |
| S2 | Build the wrappers and the GitHub Actions build; test builds the owner can install | Wrapped app behaves as the web app offline; update path proved | Sonnet · high |
| S3 | Closed test, store submissions (owner's accounts and actions; Claude prepares the material) | Store acceptance | Owner, with Sonnet · medium |

**After store publication (unless the owner reorders): the deeper editor.** Each stage starts with
a design note reviewed before code, and is cut into steps of at most one chat each.

| Stage | Goal | Extra proof | Worker |
|---|---|---|---|
| 3 | Facts, flags and rule tables: the engine reads ordered tables for the lower slot, torsades flag, amiodarone due and visibility, second-dose and child-advice cases and their precedence, special situation, after-ROSC states, locks (doc 18 list A, D). Save the "card has appeared" memory | Table-driven engine equals the current engine on every generated case | Opus · xhigh, 3 steps |
| 4 | Drugs as data and one general card builder; dose methods per doc 18 principle point 3; any number of cards (decision 14). **Owner phone check** | With the two reference cards the screen markup is identical; a test-only third card works | Opus · xhigh, 3 steps |
| 5 | Pop-ups, triggered prompts, situations, on-demand cards, addable checklists (list B, E; decision 16) | Identical screens; test-only examples of each block work | Opus · high, 3 steps |
| 6 | Appearance settings (decision 22). **Owner phone check** | Default settings give identical screens and styles | Opus · medium |
| 7 | Full checker (every table ends in "otherwise", no unreachable row, exactly one answer), formula box within its limits (decision 13), scenario runner | Rejects at least 30 deliberately bad rule sets and accepts the reference | Opus · xhigh, 3 steps |
| 8 | Editor: App view, Appearance and Tests tabs, scenario recorder by tapping (decisions 12, 19). **Owner tries it** | Round trip identical; every item of doc 18's list reachable from both views | Opus · high, 3 steps |
| 9 | Trial with a second, deliberately different rule set to find anything still NZ-EAS-specific in code | Second rule set runs with no code change | Opus · high |
| 10 | Guideline candidates G1, G2, G3, G10, G11 through the editor only, one at a time, each an owner-approved A-row with doc 11 rows | Each appears in the what-changed report and nowhere else | Sonnet · medium; clinical cross-check Opus · high |

## Release (attended chats only; decision 10)
1. Everything for the release is done and reviewed; doc 07's "before the next release" items are done.
2. Guideline currency: compare each guideline's online version with the packaged export; record
   the result in doc 11 section 7. A changed guideline stops the release and goes to the owner.
3. Merge `main` in; run `npm test` and the deep run on the merged commit.
4. `node tools/set-cache-name.mjs v24` (the next label); tests again.
5. Push `rules-editor`, then `git push origin HEAD:main` (fast-forward only, never force).
6. Tell the owner and ask for the phone checks: installs and opens in airplane mode; Start works;
   a shock and a drug record; leave the app in the background past one cycle and return (the clock
   catches up, nothing was recorded by time passing); reload keeps the case; then each line in
   doc 07's A-table "Phone check" column. On both an Android phone and an iPhone if possible.
7. Be ready to put the previous version back with one commit.

## Git
- `git pull --rebase` fails on this branch (it replays old `main` commits). Before a push:
  `git fetch origin rules-editor`, then `git merge-base --is-ancestor origin/rules-editor HEAD`;
  if the remote has new commits, `git pull --no-rebase`, re-run the tests, then push.
- Half-finished work never goes on `rules-editor`: snapshots go to the scratch branch
  `rules-editor-wip` through `tools/build-progress.sh save`. A worker's save also marks the build
  busy, so a scheduled run that starts meanwhile stops by itself.
- A stop hook asks for uncommitted work to be committed: commit only a tested tree.

## Orchestrator notes (keep short; replace, do not append)
- The safety net is `tests/reference/` (read its README); the reference is commit 99388e2.
  `record.mjs` takes about 10 minutes on 2 cores: start it detached and run nothing else beside it.
- Approved changes are listed with their row in `tests/helpers/approved-changes.mjs`; the identical-to-reference tests compare with the
  frozen copies (`tests/baseline/`, `tests/golden/`) plus exactly those swaps. An approved change
  made in code as well as data gives the original engine the same rule in
  `tests/helpers/engines.mjs`.
- The fake-browser tests bypass `src/rules/load.js`: only a real browser proves the loader. The
  pre-installed Playwright Chromium and `tools/check-offline-browser.cjs` are available.
- When a step moves text or values into the rule set: re-point planted-change search texts, add new
  wording keys to the checker's table, freeze additions in a new file under `tests/baseline/`
  (never edit an earlier frozen file).
- When a file format changes, ask what kinds of damage the new format tolerates that the old one
  did not, and serve a damaged file to a real browser.
- A restored snapshot's note can be wrong: run the full tests before believing it.
- Agents cannot be resumed from another chat: never end a chat mid-review. If a chat does stop
  there, the next chat fixes the noted findings and starts a fresh reviewer on the whole step.
- Typical cost of a step so far: worker 10 to 25 minutes, reviewer 10 to 15, fixes 10 to 20.
