// Reference recordings (stage 0): get the app exactly as it was at a git commit, in a temporary
// folder (nothing in the working copy is touched), so a recording is always made from - or a
// difference always compared against - the stated reference commit.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const SCREENS_FILE = path.join(ROOT, 'tests/reference/screens.json');
export const SAVED_FILE = path.join(ROOT, 'tests/reference/saved-sessions.json');

export function fullCommit(ref) {
  return execFileSync('git', ['rev-parse', '--verify', ref + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim();
}

/* The files the fake browser needs (index.html and everything under src/), extracted into a new
   temporary folder. Call cleanup() when done: the folder is then removed again. */
export function appAtCommit(ref) {
  const commit = fullCommit(ref);
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pocket-resus-reference-' + commit.slice(0, 12) + '-'));
  const tar = execFileSync('git', ['archive', '--format=tar', commit, 'index.html', 'src'], { cwd: ROOT, maxBuffer: 1 << 28 });
  execFileSync('tar', ['-x', '-C', dir], { input: tar });
  return { commit, dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
