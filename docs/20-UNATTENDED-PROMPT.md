# 20. Prompt for the scheduled task "Pocket Resus build" (every 3 hours)

Create the task with this text only after the owner's clear yes in the chat (doc 19 "Running unattended").

```
Continue the Pocket Resus rebuild (github.com/Dklapaukh/Pocket_Resus). This is an UNATTENDED run started by a schedule: the owner is not watching and cannot answer questions now.

1. Attach the repo with push access (owner Dklapaukh, repo Pocket_Resus), clone it, fetch and check out branch `rules-editor`, run `npm ci`.
2. FIRST run `sh tools/build-progress.sh check`. If it prints BUSY, another chat is already working: stop immediately, do nothing else, and say so in one line.
3. Read `CLAUDE.md`, then `docs/07-HANDOFF-AND-CHANGE-BACKLOG.md` (the "Rules editor build progress" table says which stage is next and what is waiting for the owner), then all of `docs/19-ORCHESTRATION-BRIEF.md`. Read `docs/18-RULES-EDITOR-DESIGN.md` only at the lines a stage needs.
4. If doc 07 shows that everything left is waiting for the owner, stop at once and say so in one line.
5. Otherwise act as the orchestrator described in doc 19. If the check in step 2 reported saved unfinished work, run `sh tools/build-progress.sh restore` and carry on from its note; otherwise start at the first stage not marked Done in doc 07. For each stage start a worker agent with the model and effort level listed in the stage table, then a fresh reviewer agent (Opus, high effort). Run all tests yourself before and after every stage. Run `sh tools/build-progress.sh save "what is done, what is next"` when you start and at least once an hour, and tell workers to do the same.
6. Limits for an unattended run: never push to `main`; never make a clinical or design decision (write it under "Waiting for the owner" in doc 07 with the full text of every option and one recommendation, then continue with work that is not blocked, or stop); never edit `tests/golden/` or the reference recordings; never loosen a test. If a test fails and you cannot explain and fix it within the rules, stop and write a plain-English explanation at the top of the progress table in doc 07.
7. At the end of each stage update docs 07, 09 and 19 so this same prompt works again, commit and push to `rules-editor`, then carry on with the next stage.
8. Finish with a short plain-English summary for the owner (a clinician, not a programmer): what was done, what was proved, what is next, and any one question the owner must answer.
```
