# Pocket Resus: read this first (Claude Code reads this file automatically)

1. Read `DECISIONS.md` sections 4 to 7 now: current state, build queue, what waits for the owner, the A-table.
   `README.md` has tests, code map and how the build is run; `GUIDELINE-TRACE.md` is the guideline trace.
2. Protected principles:
   (a) clinical numbers and wording live only in src/rules/nz-eas.yaml;
   (b) the app shows only what the NZ EAS CPGs say and calculates only what a guideline says to calculate;
   (c) every clinical item has a trace row (guideline number and page) in doc 11 (now `GUIDELINE-TRACE.md`), with deviations listed.
   Full principle (a specific guideline beats a general one; a printed dose beats a calculated one): `DECISIONS.md` section 1.
3. Never change a dose, energy, timing, wording or clinical behaviour unless the owner has approved that exact change as a row in the A-table of doc 07 (now `DECISIONS.md` section 7). One change at a time, each with its own test.
4. Owner is a clinician, not a programmer: explain simply, keep replies short, recommend ONE option, show the full text of every option, one decision at a time.
5. Run the tests (README) before and after every change. If anything fails, stop and explain in plain English. Never edit the reference recordings or loosen a test to make it pass.
6. Ask before deleting files, installing packages or changing anything outside the current step. Continue approved work without routine checkpoints; commit freely to branch `rules-editor`; `main` is the live app, complete releases only (README "Release").
7. Docs hold what is true now: rewrite a line when it changes, no dated history. Keep code readable, comment what each function does, keep values likely to change in the YAML rule set. When a chat gets long, give the owner a ready-to-paste prompt for a new chat.
