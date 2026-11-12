// Reference recordings (stage 0): get the app exactly as it was at a git commit, in a temporary
// folder (nothing in the working copy is touched), so a recording is always made from - or a
// difference always compared against - the stated reference commit.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, renameSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const SCREENS_FILE = path.join(ROOT, 'tests/reference/screens.json');
export const SAVED_FILE = path.join(ROOT, 'tests/reference/saved-sessions.json');

export function fullCommit(ref) {
  return execFileSync('git', ['rev-parse', '--verify', ref + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim();
}

/* The files the fake browser needs: index.html and everything under src/. */
export function appAtCommit(ref) {
  const commit = fullCommit(ref);
  const dir = path.join(os.tmpdir(), 'pocket-resus-reference-' + commit.slice(0, 12));
  if (!existsSync(path.join(dir, 'index.html'))) {
    const work = mkdtempSync(path.join(os.tmpdir(), 'pocket-resus-extract-'));
    const tar = execFileSync('git', ['archive', '--format=tar', commit, 'index.html', 'src'], { cwd: ROOT, maxBuffer: 1 << 28 });
    execFileSync('tar', ['-x', '-C', work], { input: tar });
    mkdirSync(path.dirname(dir), { recursive: true });
    try { renameSync(work, dir); } catch { /* another process got there first */ }
  }
  return { commit, dir };
}
