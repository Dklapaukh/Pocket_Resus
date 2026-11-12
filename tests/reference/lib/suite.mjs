// Reference recordings (stage 0): the test itself, shared by `npm test` (the fast set) and
// `npm run test:deep` (every recorded case).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadRecordings, recordingProblems, replay, explain } from './compare.mjs';
import { ROOT } from './reference-app.mjs';

export function referenceSuite({ deep }) {
  const rec = loadRecordings();
  const count = deep ? rec.header.cases : rec.header.fastCases;
  const ids = Array.from({ length: count }, (_, i) => i);
  let run;
  before(async () => { run = await replay(ROOT, ids, rec); });

  test('reference recordings: files are consistent and made with the current case generator', () => {
    assert.deepEqual(recordingProblems(rec), []);
  });

  for (const part of ['screens', 'saved']) {
    const what = part === 'screens' ? 'screens (header, Live screen, cards, status lines, pop-ups, toasts, tabs, exported text)' : 'saved session (and complete JSON export)';
    test(`reference recordings: ${count} generated cases, ${what} identical to commit ${rec.header.madeFromCommit.slice(0, 7)} at every step`, async () => {
      assert.equal(run.played, count, 'every case was played');
      const diffs = run.found.filter((d) => d.part === part || (part === 'screens' && d.part === 'actions'));
      if (diffs.length) assert.fail(`${new Set(diffs.map((d) => d.id)).size} case(s) differ from the reference:\n` + await explain(ROOT, diffs));
    });
  }
}
