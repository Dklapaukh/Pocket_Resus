# Readability assessment and remaining work

Working target: aim for 10/10 and require at least 9/10 before calling the
readability project complete. This is a software-maintainability assessment,
not clinical validation. The owner is the clinical reviewer; independent
clinical review is deferred until code and other key goals are ready.

## Evidence so far

- The entry point, state, event recording, rendering, offline cache and
  engine have a [code map](10-DEVELOPER-CODE-MAP.md). The compact engine has
  a separate [reading guide](12-READING-THE-ENGINE.md); its exact-line
  fidelity test remains intact.
- The application module graph is now acyclic. The service worker still
  caches the same module paths. A test checks for application import cycles,
  existing tests check offline file-list completeness, and a simulated worker
  test checks install failure and cached responses offline. A local Chrome
  check also passed offline reload, weight entry, cross-tab update, an
  accelerated countdown and recovery after reload. These do not replace a
  phone, background or installation check.
- The click listener was 348 lines at the start of this pass. Named action,
  recording, correction and keypad paths now make its major decisions
  traceable. The former 123-line submit listener delegates to four form
  paths, with time validation kept before dispatch. The former 89-line
  `tick` delegates cycle and medication display updates separately. Line
  counts are navigation aids, not proof of readability.
- Display references, recorded administrations, correction, void and undo
  paths are indexed in the code map and rule inventory. The suite includes
  baseline engine fidelity, syntax-tree checks, scenario and screen golden
  checks, lock and clinical-decision regressions, manual-entry defaults, and
  correction/void/undo and timer-expiry workflows.

## Honest remaining limits

- The main click listener is 97 lines and the named-action dispatcher is 84;
  their longer recording paths are named. `drugCard`, `liveView` and
  the tutorial workflow also remain substantial. A fresh reader should
  trace representative cases and identify any genuinely confusing remainder;
  splitting solely to reduce line counts can obscure execution order.
- The original engine remains compact because its exact logic lines are
  deliberately pinned. The guide helps readers but is not the same as
  readable engine source. Do not relax the fidelity check to improve a score.
- Golden scenarios and targeted tests do not exhaust all possible state,
  browser, device, and timing combinations. The source comparisons are not
  independent clinical review. See the [review brief](13-INDEPENDENT-REVIEW-BRIEF.md).
- A later fresh-reader assessment can check the self-assessment by tracing a
  dose reference versus a recorded dose; rhythm and lower-card selection; a
  correction and its audit; a timer without an inferred intervention; and
  startup/offline loading. Record concrete failures rather than treating a
  numerical score as proof. Do not ask the owner to review code at routine
  checkpoints.

## Self-review of representative traces

The refactoring author traced all five routes above and added the exact entry
points to the code map. The correction/void/undo path now also has a focused
audit regression. The full test suite passed with concurrency 2 after the
refactor. These checks support improved traceability but are not independent:
the author already knew the code and could overlook a confusing transition.
The author now estimates readability at roughly 9/10 under the explicit
constraint that the engine's compact logic lines remain unchanged. That is a
subjective self-assessment, not independent verification or a 10/10 claim.
The remaining dispatchers and the dense engine mean that a fresh reader may
still find worthwhile improvements; the reading guide mitigates but does not
eliminate the engine limitation.
