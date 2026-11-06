/*
 * build/p357/counter.cjs — probe:p357's uncaught exception counter (Phase 357,
 * build/p357/SPEC.md §8), the spec step's M2 counter committed.
 *
 * Loaded into the app's MAIN process by `NODE_OPTIONS=--require=<this file>`,
 * at the parent build and at HEAD, so ONE instrument counts both. It does
 * nothing at all unless it is in Electron's main process (`process.type` is
 * `browser`) AND `P357_COUNTER_FILE` names a file; the Electron shim, the
 * door's utility process and any node a pane starts inherit the variable and
 * are left alone.
 *
 * WHAT IT DOES. It PREPENDS one `uncaughtException` listener and writes one
 * JSON line per event to `P357_COUNTER_FILE`: the error's name, its code, its
 * message clipped to 100 characters and its first eight frames. Prepending is
 * what keeps Electron's own handler from drawing its dialog on the operator's
 * screen at the parent: that handler draws only while it is the one listener
 * (§0.1 item 5), and every exception it would have drawn is counted here
 * instead. It adds no `unhandledRejection` listener, because one would change
 * what a rejection does in the app it measures.
 *
 * THE CONTROL. With `P357_COUNTER_CONTROL=1` it throws the SAME control
 * exception twice, from one function on two timers (3 s and 4 s after load),
 * so both carry one stack and the crash handler at HEAD keys them as one error
 * (arm HC), and leaves one control rejection unhandled at 4.5 s. A run whose
 * counter did not hear both control exceptions is UNREADABLE: nothing it
 * counted can be trusted.
 *
 * It writes only the one file it is named, and a write that fails is dropped:
 * the counter never fails the app it measures.
 */
const { appendFileSync } = require('node:fs');

const out = process.env.P357_COUNTER_FILE;
if (typeof out === 'string' && out !== '' && process.type === 'browser') {
  let n = 0;
  const line = (record) => {
    try {
      appendFileSync(out, `${JSON.stringify(record)}\n`);
    } catch {
      /* the counter never fails the app */
    }
  };
  process.prependListener('uncaughtException', (e, origin) => {
    n += 1;
    let stack = '';
    try {
      stack = String((e && e.stack) || '');
    } catch {
      stack = '';
    }
    line({
      at: Date.now(),
      pid: process.pid,
      n,
      origin,
      name: e && typeof e.name === 'string' ? e.name : typeof e,
      code: e && typeof e.code === 'string' ? e.code : null,
      message: String(e && e.message).slice(0, 100),
      frames: stack
        .split('\n')
        .filter((l) => /^\s+at /.test(l))
        .slice(0, 8)
        .map((l) => l.trim())
    });
  });
  line({ at: Date.now(), pid: process.pid, installed: true, type: process.type, listeners: process.listenerCount('uncaughtException') });
  if (process.env.P357_COUNTER_CONTROL === '1') {
    // ONE function on two timers, so the two throws carry one stack.
    const controlThrow = () => {
      throw Object.assign(new Error('p357-control-exception'), { code: 'P357_CONTROL' });
    };
    setTimeout(controlThrow, 3_000).unref();
    setTimeout(controlThrow, 4_000).unref();
    setTimeout(() => {
      void Promise.reject(Object.assign(new Error('p357-control-rejection'), { code: 'P357_CONTROL_REJECTION' }));
    }, 4_500).unref();
  }
}
