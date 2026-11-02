# Using Claude Code for this project (plain-English guide)

**Only applies if the owner subscribes to a paid Claude plan. Until then, keep using chat + zip upload.**

## Why
Claude Code works directly on your repo and your computer: it runs the tests itself and can save to GitHub, so no more zip files or uploads. Chat is still best for discussions and clinical decisions.

## One-time setup (about 15 minutes)
1. Needs a paid Claude plan (Pro or above). Check this is your plan.
2. Download the Claude desktop app (Mac or Windows) from Anthropic's site, install it, sign in. The **Code** tab is Claude Code. No separate install of Node.js is needed for the app itself.
3. Install **Git** and **Node.js** (LTS) on your computer if you do not have them (the tests need Node). Ask Claude Code: "Check whether Git and Node are installed and help me install what is missing."
4. In the Code tab, choose "open folder / new session" and let it download (clone) https://github.com/Dklapaukh/Pocket_Resus into a folder you will remember. Sign in to GitHub if asked.
5. Leave the permission mode on **Ask permissions** (the default). Claude then shows each change and waits for your OK.
6. First message: "Read CLAUDE.md, then start the next stage in docs/07."

## Staying safe (pitfalls)
- **Tests are your safety net.** Never accept "I changed the test so it passes". Golden files in `tests/golden/` must not change unless you approved a clinical change.
- **Do not use "Bypass permissions"** (it removes all asking). Not needed here.
- **Clinical changes need your explicit OK** in plain words (e.g. "apply A1"). Claude Code may suggest improvements; say no to anything not in the A-table.
- **Commits to `main` go live to the real app.** Prefer: Claude Code works on a branch, you check on your phone, then merge. Ask it to explain what will go live before you say yes.
- **Always do the phone check** after anything goes live (starts, records a shock and drug, works offline). Tests cannot see real layout, install or offline behaviour.
- **Long sessions get expensive and forgetful.** Start a fresh session at each checkpoint; CLAUDE.md and doc 07 restore context.
- **If something looks wrong or you do not understand it, stop and ask in plain words.** Undo is easy: everything is saved in Git and can be reverted.
- Do not paste patient information into any session.
