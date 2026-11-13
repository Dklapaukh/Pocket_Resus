#!/bin/sh
# Build helper for unattended work (doc 19, "Running unattended").
#
# Keeps unfinished stage work safe on GitHub and stops two chats working at once.
# It uses one scratch branch, `rules-editor-wip`. Nothing here touches `rules-editor`,
# `main`, the local branch or the staging area.
#
#   sh tools/build-progress.sh check            is another chat working? is unfinished work saved?
#   sh tools/build-progress.sh save "note"      save a snapshot of every file as it is now, with a note
#                                               (what is done, what is next); also says "I am working"
#   sh tools/build-progress.sh restore          put the saved snapshot back into the working folder
#
# "Busy" means the last save was under 100 minutes ago. Save at least once an hour while working.
# When a chat has finished and committed everything, save with a note that starts "IDLE:" so the
# next chat can start at once instead of waiting 100 minutes.
set -eu
cd "$(git rev-parse --show-toplevel)"
WIP=rules-editor-wip
BUSY_SECONDS=6000

fetch_wip() { git fetch -q --depth=5 origin "$WIP" 2>/dev/null && git rev-parse FETCH_HEAD; }

case "${1:-}" in
check)
  if tip=$(fetch_wip); then
    age=$(( $(date +%s) - $(git log -1 --format=%ct "$tip") ))
    if git log -1 --format=%s "$tip" | grep -q '^IDLE:'; then echo "FREE: the last chat finished and left the build idle."
    elif [ "$age" -lt "$BUSY_SECONDS" ]; then echo "BUSY: another chat saved work $((age / 60)) minutes ago. Do not start work."
    else echo "FREE: last save was $((age / 60)) minutes ago."; fi
    base=$(git rev-parse "$tip^1")
    if [ "$(git rev-parse "$tip^{tree}")" = "$(git rev-parse "$base^{tree}")" ]; then echo "No unfinished work is saved."
    elif [ "$base" = "$(git rev-parse HEAD)" ]; then echo "UNFINISHED WORK IS SAVED on top of this commit. Note:"; git log -1 --format=%B "$tip"
    else echo "Saved work belongs to an older commit ($base); it is out of date. Note:"; git log -1 --format=%B "$tip"; fi
  else echo "FREE: nothing has been saved yet."; echo "No unfinished work is saved."; fi
  ;;
save)
  note=${2:-"(no note)"}
  export GIT_INDEX_FILE="$(git rev-parse --git-dir)/wip-index"
  git read-tree HEAD
  git add -A
  tree=$(git write-tree)
  unset GIT_INDEX_FILE
  # Parents: the current commit first, then the previous snapshot (so the push never needs force).
  if prev=$(fetch_wip); then commit=$(git commit-tree "$tree" -p HEAD -p "$prev" -m "$note")
  else commit=$(git commit-tree "$tree" -p HEAD -m "$note"); fi
  git push -q origin "$commit:refs/heads/$WIP"
  echo "Saved snapshot $commit"
  ;;
restore)
  tip=$(fetch_wip) || { echo "Nothing saved."; exit 1; }
  [ "$(git rev-parse "$tip^1")" = "$(git rev-parse HEAD)" ] || { echo "Saved work belongs to another commit; not restored."; exit 1; }
  [ -z "$(git status --porcelain)" ] || { echo "The working folder has changes; not restored."; exit 1; }
  git restore --source="$tip" --worktree -- .
  echo "Restored. Note:"; git log -1 --format=%B "$tip"
  ;;
*) sed -n '2,13p' "$0"; exit 1 ;;
esac
