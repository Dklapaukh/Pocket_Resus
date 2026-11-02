# Pocket Resus rebuild: read this first (Claude Code reads this file automatically)

1. Read `docs/07-HANDOFF-AND-CHANGE-BACKLOG.md` now. It holds the current stage, owner decisions and approved changes. Read other numbered docs only when needed.
2. Owner is a clinician, not a programmer. Explain terms simply, keep replies short, recommend ONE best option, show the full text of any options offered, ask one decision at a time.
3. NZ EAS CPGs (PDFs in repo) are the clinical authority. Never change a dose, energy, timing or wording unless the owner has approved that exact change in the A-table of doc 07.
4. Rebuild order: reproduce the old behaviour exactly FIRST (tests must match), then apply approved changes ONE at a time, each with its own test.
5. Run `npm test` before AND after every change. If anything fails, stop and explain in plain English. Never edit golden files (`tests/golden/`) or loosen a test to make it pass.
6. Ask before: committing to `main`, deleting files, installing packages, or changing anything outside the current stage.
7. At each checkpoint: 5-line summary, update doc 07, then commit and push only after owner says yes.
8. Token efficiency: do not re-print large files; read files only when needed.
