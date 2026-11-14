# Pocket Resus: read this first (Claude Code reads this file automatically)

1. Read `docs/07-HANDOFF-AND-CHANGE-BACKLOG.md` now: current state, next step, what is waiting for the owner. Other docs only when needed: 06 principle and decisions, 11 guideline trace, 18 editor design, 19 how the build is run, 10 code map.
2. **Guiding principle (doc 06):** the app shows what the NZ EAS CPGs (PDFs in repo) say, as written, at the right time. It makes no clinical decision. It calculates only what a guideline says to calculate. A specific guideline beats a general one; a printed dose beats a calculated one. Everything clinical on screen has a row in doc 11.
3. Never change a dose, energy, timing, wording or clinical behaviour unless the owner has approved that exact change as a row in the A-table of doc 07. One change at a time, each with its own test.
4. Owner is a clinician, not a programmer. Explain terms simply, keep replies short, recommend ONE best option, show the full text of any options offered, ask one decision at a time.
5. Run the tests (README) before AND after every change. If anything fails, stop and explain in plain English. Never edit golden files (`tests/golden/`) or the reference recordings, or loosen a test, to make it pass. Clinical numbers and wording live in `src/rules/nz-eas.yaml` only.
6. Ask before: deleting files, installing packages, or changing anything outside the current step. `main` is the live app: complete releases only (doc 19 "Release").
7. Continue approved work without routine checkpoints. Every chat first runs `sh tools/build-progress.sh check` (doc 19). Commit freely to branch `rules-editor`.
8. Docs hold what is true now. Rewrite a line when it changes; do not add dated history or keep superseded decisions (git keeps them). Keep doc 07 short.
9. Token efficiency: do not re-print large files; read files only when needed. When a chat gets long, give the owner a ready-to-paste prompt for a new chat.
10. Keep code as easy to read as possible, use common tools, document what each function is expected to do. Values likely to change live in the one YAML rule set, not in code.
