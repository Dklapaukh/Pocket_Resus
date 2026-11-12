// Reference recordings (stage 0): play cases on an app folder, in this thread or in parallel
// worker threads (this machine has 2 cores; the test runner otherwise uses only one).
import { Worker } from 'node:worker_threads';
import os from 'node:os';
import { Driver, SCREEN_SURFACES, SAVED_SURFACES } from './driver.mjs';
import { playCase, caseInfo } from './cases.mjs';
import { encodeCase } from './format.mjs';

/* Play one case and return every step in full (used by the show tool and by recording). */
export async function playFull(appDir, id) {
  let info = caseInfo(id);
  const D = new Driver(appDir, { startOffset: info.startOffset });
  try {
    info = await playCase(D, id);
  } catch (err) {
    // A story that cannot go on (e.g. a screen the person expects is missing) is itself a difference.
    await D.capture('CASE STOPPED: ' + err.message);
    D.steps.at(-1).screens.frame += '|CASE STOPPED: ' + err.message;
  } finally {
    D.close();
  }
  return { info, steps: D.steps };
}

export async function playEncoded(appDir, id) {
  const { info, steps } = await playFull(appDir, id);
  return encodeCase(info, steps, SCREEN_SURFACES, SAVED_SURFACES);
}

/* A set of worker threads that stays open, so several replays (e.g. one per planted change) do not
   each pay for starting the threads. Each worker keeps one bundle per app folder. */
export class Pool {
  constructor(threads = Math.max(1, Math.min(2, os.availableParallelism()))) {
    this.slots = Array.from({ length: threads }, () => {
      const slot = { w: new Worker(new URL('./worker.mjs', import.meta.url)), busy: false };
      slot.w.on('message', (msg) => this.#message(slot, msg));
      slot.w.on('error', (err) => this.#stop(err));
      return slot;
    });
    this.token = 0;
    this.run = null;
  }

  /* Play `ids` on appDir. onResult(enc) runs as each case finishes (in no fixed order); returning true
     stops early (used to stop at the first difference). Resolves to the encoded cases that finished. */
  play(appDir, ids, { onResult = () => false, mode = 'encode' } = {}) {
    return new Promise((resolve, reject) => {
      this.run = { token: ++this.token, appDir, queue: [...ids], done: [], onResult, mode, resolve, reject, inflight: 0, stopped: false };
      for (const slot of this.slots) if (!slot.busy) this.#feed(slot);
      this.#maybeFinish();
    });
  }

  close() { for (const s of this.slots) s.w.terminate(); }

  #feed(slot) {
    const run = this.run;
    if (!run || run.stopped || !run.queue.length) return;
    slot.busy = true; run.inflight++;
    slot.w.postMessage({ token: run.token, appDir: run.appDir, id: run.queue.shift(), mode: run.mode });
  }
  #maybeFinish() {
    const run = this.run;
    if (run && !run.stopped && !run.queue.length && !run.inflight) { run.stopped = true; run.resolve(run.done); }
  }
  #stop(err) { const run = this.run; if (run && !run.stopped) { run.stopped = true; run.reject(err); } }
  #message(slot, msg) {
    slot.busy = false;
    const run = this.run;
    if (!run || msg.token !== run.token) { this.#feed(slot); return; } // a case left over from a replay that stopped early
    run.inflight--;
    if (run.stopped) return;
    if (msg.error) return this.#stop(new Error(`case ${msg.id}: ${msg.error}`));
    run.done.push(msg.enc);
    if (run.onResult(msg.enc)) { run.stopped = true; run.resolve(run.done); return; }
    this.#feed(slot);
    this.#maybeFinish();
  }
}

/* Play many cases on a pool of its own (or `pool` if given). */
export async function playMany(appDir, ids, { pool = null, ...options } = {}) {
  const own = pool || new Pool();
  try { return await own.play(appDir, ids, options); } finally { if (!pool) own.close(); }
}
