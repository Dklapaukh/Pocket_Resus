# Deferred phone and installation checks

## Result reported by owner

On 6 November 2026 the owner reported **PASSED** for the phone test of the
published readability and offline-cache update. The report did not include
the phone, operating system, browser version, screenshots, or individual
check outcomes; those details are not independently recorded. This result
is not independent clinical review.

The owner approved publication of the prepared test build to the existing
GitHub Pages site on 6 November 2026. Use fictional data only and do not use
this test build for patient care. An installed web app and service worker generally
need a suitable secure origin; a desktop localhost address is not the phone's
localhost. Do not assume a plain LAN address is equivalent to the final
installed environment.

The local desktop Chrome check currently covers an offline reload, weight
entry, a cross-tab update, accelerated countdown, session recovery and a
v17-to-v18 service-worker upgrade. It uses a controlled clock and is not
evidence of phone background behavior. The v19 worker waits for older app
windows to close before activating; close all open app tabs and installed-app
windows, then reopen online before checking offline.

## Record the environment

Record the build or file version, date, phone and OS, browser version, whether
the app is in a tab or installed, connectivity, screen size/orientation and
text size. Record the result and any screenshots without patient data.

## Checks after a successful first online load

1. **Installation and offline launch:** Install from the chosen secure test
   origin, open it once online, then turn off network access and reopen it.
   Check the live screen, guidance and packaged PDF links. Restore network
   afterwards. Note any asset or page that fails rather than assuming the
   entire offline package works from one screen.
2. **Clock and background:** Start a fictional session and note the time and
   displayed cycle. Put the app in the background beyond a cycle, return, and
   check that the displayed clock catches up and offers a rhythm check.
   Confirm no rhythm, shock or medicine was recorded solely by time passing.
   Repeat after closing and reopening the app. No background alarm is
   guaranteed; do not expect one as a pass criterion.
3. **Persistence and correction:** Enter a fictional weight and record a
   fictional event, reload, and check both remain. Correct the event, inspect
   its audit in JSON export, void it and undo the void. Verify the visible log
   and counters match the recorded actions.
4. **Wake lock:** With the phone's normal screen timeout enabled, turn on
   the app's keep-awake option and observe whether the screen remains awake.
   Switch away and return; record device or battery restrictions and whether
   it is reacquired. Test release through the app as well.
5. **Clipboard and export:** Copy the current filtered log and paste it into
   a local test note; download text and complete JSON. Check the chosen
   filters, timestamps, void handling and audit against the test session.
   Delete the fictional exports afterwards if appropriate.
6. **Phone layout and orientation:** In the normal and larger-text modes,
   check the countdown, prior-shock button, rhythm-check button and captions
   do not overlap. Check the installed app's intended portrait behavior and
   the post-ROSC checklist, including its allowed scrolling. See the owner
   decisions and earlier phone checks in doc 07 for detailed expectations.

If a check fails, record the exact build, steps, expected and observed result,
and whether it was reproducible. Do not change clinical wording or behavior
as part of a device-only fix without the owner's clinical decision.
