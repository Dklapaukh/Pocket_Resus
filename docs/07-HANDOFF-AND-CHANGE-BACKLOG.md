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
  approval, a push to `main` that changes the live app, or an owner action (e.g. a phone check).
- Explain simply, recommend one option, show the full text of any options, one decision at a time.
- **Token efficiency:** when a chat gets long or slow, give the owner a ready-to-paste prompt to
  start a new chat (objective, state, next steps). Keep docs tidy so new chats start cheaply.

## Current state (12 Nov 2026)
- **Live: v22** (cache `resus-pocket-v22-rules-file`, published 12 Nov 2026) = v21 plus step 3a
  (all rules and guideline text in the rules file; screens identical). **v22 phone check passed (owner, 12 Nov 2026).**
  v21 phone check passed (owner, 12 Nov 2026). The separate A7 check ("Other" triggers
  fluids, doc 09 11 Nov entry) has not been confirmed on its own.
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
   the live app (published as v22, 12 Nov 2026). **Next: owner's v22 phone check, and the
   remaining editor decisions in doc 18, one at a time.** Owner 12 Nov 2026: format JSON (doc 18
   decision 9); editor must cover any clinically relevant function plus visual settings
   (decision 10). **Re-plan drafted 12 Nov 2026 in doc 18** (inventory of behaviour still in
   code, revised plan, stages); nothing built. Decision 11 made (menus and rule tables). Owner goals added (decision 12):
   two ways into the editor (tap a card in an app view; technical rules view) and, long term, a
   no-code flowchart-to-app platform. **EAS 3.14 checked 12 Nov 2026 (doc 18).** Decisions 13–25 made
   12 Nov 2026 (doc 18 table). Guideline candidates kept: G1, G2, G3, G10, G11 (added later through
   the editor, each approved separately). **Next: (1) owner's answer on A8's one failing comparison
   test (below); (2) start the orchestrated build from `docs/19-ORCHESTRATION-BRIEF.md` in a new chat.**
4. Later: retire the engine's original PEA-only `careMode` (kept only for the side-by-side test).

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
| A8 | **A rhythm recorded with ROSC never triggers fluids.** Before: ROSC recorded as "Other" opened the "Non-shockable rhythm · fluid guidance" pop-up ("Continue CPR") and showed the fluids card after a re-arrest (side effect of A7). "Other" at a no-shock check is unchanged | **Approved 12 Nov 2026 (doc 18 decision 15). Built on branch `a8-rosc-other`, NOT merged:** its 6 new tests pass, but the step 2 comparison test (engine vs the pre-A8 rule, 3000 random cases) fails as expected (332 cases differ, every one is ROSC "Other" → fluids). Waiting for the owner's decision on updating that test. Then: merge, phone check, owner's yes, publish as v23 (new cache name) |
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
