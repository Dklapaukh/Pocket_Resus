# Pocket Resus — structured rebuild handover

## Objective
Rebuild the current GitHub application into a readable, modular, tested codebase **without changing observable clinical behaviour or UX**. The current GitHub HEAD is the implementation baseline, not an architectural template. This package is a specification and audit checklist, **not** a verified source-code analysis: the full repository was not available to inspect here.

## Instructions to Claude
1. Clone/open the actual GitHub repository and record repository URL, branch and commit SHA.
2. Read every file, including tests, assets, configuration and documentation. Determine whether the repo contains full development source or only a deployable build. Do not pretend compiled assets are source.
3. Complete `01-REPOSITORY-AUDIT.md` and `02-FEATURE-CONTRACT.md` with evidence (file paths, functions, screenshots and observed behaviour). Mark unknowns rather than guessing.
4. Capture a reproducible baseline: screenshots at several screen sizes, interaction recordings or scripts, event-log exports, existing test results and known bugs.
5. Propose the smallest maintainable architecture; seek approval before any intentional UX or clinical change.
6. Rebuild incrementally with tests and side-by-side parity checks. Preserve the old deployment and provide a rollback route.
7. Do not claim production or clinical readiness without independent validation.

## Order of work
Inventory → behavioural baseline → architecture plan → clinical logic extraction → event model → UI migration → regression tests → deployment review → handover.

## Definition of done
Every observed baseline feature has a mapped implementation and test; no unexplained omissions; no undocumented clinical changes; build/lint/typecheck/tests pass; deployed staging compared to original; source is readable to a human programmer; documentation explains how to extend it.
