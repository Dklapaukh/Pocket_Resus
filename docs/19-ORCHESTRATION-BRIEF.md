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
   re-runs the tests, reads the changes against the stage proof and the rules, tries to break the new
   behaviour, and reports problems in plain English.
5. Fix through the worker (or a new one) until the reviewer has no blocking findings.
6. Commit to `rules-editor` (one commit per step), push, update doc 07 (short) and doc 09 (history).
7. Go to the next stage without asking, unless a stop condition applies.

## Rules for every agent (copy into each worker and reviewer brief)
- Branch `rules-editor` only. Never commit to `main` without the owner's yes in the chat.
- Run all tests before and after every change. **If any test fails, stop and explain in plain
  English.** Never edit `tests/golden/`, never loosen or delete a test to make it pass.
- **No clinical change.** No dose, energy, timing, wording or behaviour may differ from v22 unless it
  is an approved row in doc 07's A-table. Until the last stage every stage must leave every screen
  identical to v22 (the recorded screens and the random-case comparisons prove it).
- Clinical numbers and wording live only in the rule set. The lock-in test must keep passing and is
  extended as more moves into data.
- Ask the owner before: deleting files, installing packages, anything outside the current stage.
- The app is plain static files with no build step, works offline, portrait phone. Keep it that way.
- The rule set is plain JSON data: no code, no functions. Logic is rule tables read by the engine.
- Name blocks generally where it costs nothing ("counted event", not "shock"): decision 24.
- Comments in plain English; the owner is a clinician, not a programmer.

## Stop conditions (tell the owner, wait)
A failing test you cannot explain as a stage defect and fix within the rules; any clinical question;
anything going to `main`; an owner phone check (marked below); a design choice not covered by doc 18.
Otherwise keep going (decision 25: few checkpoints). Reports to the owner: short, plain English, what
was done, what was proved, what is next; one decision at a time with the full text of every option.

## Before stage 0
A8 (doc 07 A-table) is on branch `a8-rosc-other`, waiting for the owner's answer about one
comparison test. If the owner has approved, merge it into `rules-editor` first; v22 plus A8 is then
the reference for every proof below. If not, leave it and use v22.

## Stages
Proof for all: tests pass before and after; recorded screens and random-case comparisons identical to
the reference; reviewer has no blocking findings.

| # | Goal | Extra proof | Worker |
|---|---|---|---|
| 0 | **Wider safety net.** Record the reference Live screens, cards, status lines and pop-ups step by step across thousands of generated cases (weights, ages, rhythms, doses, voids, undo, ROSC, re-arrest, special situation, timer moments). New recordings only; existing golden files untouched | Planted behaviour changes (at least 10 different kinds) are each caught | Opus · high |
| 1 | **Rule set becomes JSON** (decision 9): `nz-eas.json`, loader, offline list updated, first checker for the five existing parts | Every value and sentence identical; app works offline | Sonnet · medium |
| 2 | **Remaining text and settings into data:** card status lines, labels, titles, messages, disclaimers, timer thresholds, rhythm display names, correction-form rhythm lists, resus-start choices, equipment form questions, log "intervention" list (inventory F, 31, 34, 37, 39, 40) | Lock-in test extended to these | Sonnet · medium |
| 3 | **Facts, flags and rule tables.** Engine reads ordered tables. Move into tables: lower slot, torsades flag, amiodarone due and visibility, second-dose and child-advice cases and their precedence, special situation, after-ROSC states, locks (inventory A). Save the "card has appeared" memory in the session | Table-driven engine equals the current engine on every generated case | Fable · high |
| 4 | **Drugs as data and one general card builder.** Drug definitions; dose-method menu (fixed, band table, per kg with cap, per kg with rounding, dose sequence); any number of cards with layout by rule (decision 14); units, routes, maximum doses, intervals (inventory A, C). **Owner phone check after this stage** | With the two reference cards the screen markup is identical; a test-only third card renders and records correctly | Fable · high |
| 5 | **Pop-ups, triggered prompts, situations, on-demand cards.** Pop-ups built from blocks with triggers; situations as data replacing the single switch (built with only today's behaviour); on-demand cards; addable checklists with "where it appears" (inventory B, E; decision 16) | Identical screens; test-only examples of each new block work | Opus · high |
| 6 | **Appearance settings** (decision 22, Option A): named colours, text sizes, card order, pop-up style, labels, icons read from the rule set, with contrast and minimum-size checks; structured so free layout can be added later. **Owner phone check after this stage** | Default settings give identical screens and styles | Opus · medium |
| 7 | **Checker, formulas, scenario tests, difference report.** Full checker (decision 18 limits; every table ends in "otherwise"; no unreachable row; exactly one answer for every case); advanced formula grammar with its safeguards (decision 13); scenario runner; behaviour-difference report between two rule sets | Checker rejects a library of deliberately bad rule sets (at least 30) and accepts the reference; difference report finds planted changes | Fable · high |
| 8 | **The editor** (decisions 12, 19, 20, 23): separate offline page, five tabs. Rules view first; then App view (working phone preview, "Edit" on, tap a card to see every rule attached to it in plain sentences); scenario recorder by tapping; what-changed view. Read the `frontend-design` guidance. **Owner tries it after this stage** | Round trip: open the reference rule set, save without edits, file is identical; every inventory item is reachable from both views | Opus · high |
| 9 | **Approve, publish, rollback** (decisions 18, 21): approval record (editor's name, date, reason, source), version name on screen, previous rule set kept, one-step rollback; trial with a second, deliberately different rule set to find anything still NZ-EAS-specific in code | Second rule set runs with no code change; rollback restores the reference exactly | Opus · high |
| 10 | **First native additions** through the editor only, no code: G1, G2, G3, G10, G11 (doc 18), **one at a time, each needing the owner's approval of the exact content, its own A-table row and its own scenario tests.** Anything that cannot be done in the editor is reported as a missing block, not typed into code | Each addition appears in the difference report and nowhere else | Sonnet · medium, clinical cross-check Opus · high |

Reviewer after every stage: Opus · high, fresh agent. Orchestrator: Fable · high.

## Going live
Nothing reaches `main` during stages 0 to 9 unless the owner asks. When the owner says yes: new cache
name, update the cache-name pins in the tests, publish, owner phone check of the live app, and be
ready to put the previous version back with one commit.
