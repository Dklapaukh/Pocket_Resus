# Pocket Resus rebuild: read this first (Claude Code reads this file automatically)

1. Read `docs/07-HANDOFF-AND-CHANGE-BACKLOG.md` now. It holds the current stage, owner decisions and approved changes. Read other numbered docs only when needed.
2. Owner is a clinician, not a programmer. Explain terms simply, keep replies short, recommend ONE best option, show the full text of any options offered, ask one decision at a time.
3. NZ EAS CPGs (PDFs in repo) are the clinical authority. Never change a dose, energy, timing or wording unless the owner has approved that exact change in the A-table of doc 07.
4. Rebuild order: reproduce the old behaviour exactly FIRST (tests must match), then apply approved changes ONE at a time, each with its own test.
5. Run the tests (README) before AND after every change. If anything fails, stop and explain in plain English. Never edit golden files (`tests/golden/`) or loosen a test to make it pass. Clinical numbers live in `src/rules/nz-eas.json` only.
6. Ask before: deleting files, installing packages, or changing anything outside the current stage. `main` is the live app: complete releases only (doc 19 "Publishing to `main`"; owner's standing permission 13 Nov 2026).
7. Continue approved work without routine checkpoints. Update doc 07 (keep it short; history goes in doc 09). Commit freely to a branch. Every chat first runs `sh tools/build-progress.sh check` (doc 19 "Running unattended").
8. Token efficiency: do not re-print large files; read files only when needed.
9. When a chat gets long or inefficient, give the owner a ready-to-paste prompt for a new chat. Tell the owner if a task would be better in Claude Code (owner is not a developer).
10. When writing code keep it as easy to read as possible, use common tools and frameworks, document expected behaviours of functions. Literal values and constants that are likely to change should be stored in a single central YAML configuration file.
