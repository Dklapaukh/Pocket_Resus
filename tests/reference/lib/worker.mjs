// Reference recordings (stage 0): a worker thread that plays the cases it is sent, one at a time.
import { parentPort } from 'node:worker_threads';
import { playEncoded, playFull } from './run.mjs';
import { censusOf } from './census.mjs';

process.env.TZ = 'UTC';
parentPort.on('message', async ({ token, appDir, id, mode }) => {
  try {
    if (mode === 'census') {
      const { info, steps } = await playFull(appDir, id);
      parentPort.postMessage({ token, id, enc: { id, theme: info.theme, steps: steps.length, census: censusOf(steps) } });
    } else parentPort.postMessage({ token, id, enc: await playEncoded(appDir, id) });
  } catch (err) {
    parentPort.postMessage({ token, id, error: err.stack || String(err) });
  }
});
