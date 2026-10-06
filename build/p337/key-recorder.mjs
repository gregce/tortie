#!/usr/bin/env node
/**
 * A key recorder for Phase 337 (build/p337/SPEC.md §7.5): a stand-in that asks
 * its terminal for the modes it is told to, then logs EVERY BYTE IT READS, one
 * read per line, with a monotonic stamp. It is what `measure:p337` arm K and
 * `probe:p337` arms S4, S5(g) and S8 read to say which bytes a key reached the
 * program as, and how many reads they arrived in.
 *
 * WHAT IT RUNS. Nothing. It is not a shell: it never executes what it reads, it
 * starts no process, it writes only its own log file and the mode sequences to
 * its own terminal, and it ends on SIGHUP, SIGTERM or SIGINT, or after its
 * lifetime (ten minutes by default), whichever comes first. A key it reads is
 * DATA, so Ctrl-C reaches it as the byte 03 and is logged, not obeyed (the
 * terminal is put in raw mode, which is why a recorder is the right reader for
 * a key and a shell is not).
 *
 * THE MODES, by name (comma separated in argv[3], `normal` for none):
 *
 *   decckm   application cursor keys (`ESC [ ? 1 h`): tmux sends an arrow as
 *            `ESC O x` rather than `ESC [ x` (§14 M4)
 *   keypad   application keypad (`ESC =`)
 *   paste    bracketed paste (`ESC [ ? 2004 h`)
 *   mok1     modifyOtherKeys 1 (`ESC [ > 4 ; 1 m`)
 *   mok2     modifyOtherKeys 2 (`ESC [ > 4 ; 2 m`): tmux sends C-c as
 *            `ESC [ 2 7 ; 5 ; 9 9 ~`
 *   kitty    the kitty keyboard, disambiguate (`ESC [ > 1 u`)
 *   focus    focus reports (`ESC [ ? 1004 h`)
 *   alt      the alternate screen (`ESC [ ? 1049 h`)
 *   mouse    mouse tracking with SGR reports (`ESC [ ? 1000 h ESC [ ? 1006 h`)
 *
 * THE BUSY READER (`--busy=<ms>`). After each read it spins for that long
 * before it reads again, as an agent drawing a frame after each key does. The
 * attack on D42 measured that such a reader reads two writes up to 10 ms apart
 * as ONE read (§Attack AM2), so `measure:p337` K and `probe:p337` S5(g) run it
 * busy 25 ms to prove the Mac keeps two keys writes 50 ms apart.
 *
 * THE LOG, one JSON object per read: `{"t":"<hrtime ns>","hex":"<bytes>","n":<serial>}`.
 * The first line it writes is `{"ready":true,"modes":[…],"pid":<pid>}`, so a
 * reader knows the modes were asked for before any key was sent.
 *
 * THE SCREEN. It draws one line, `key recorder <modes> <label>`, and nothing
 * else, so a capture of its pane is its own name (probe:p337 S10 reads a
 * session's screen and must find its own label there).
 *
 * Usage: node build/p337/key-recorder.mjs <log> [modes] [--busy=<ms>] [--label=<word>] [--life=<s>]
 */

import { appendFileSync, writeFileSync } from 'node:fs';

const MODE_SEQUENCES = Object.freeze({
  decckm: '\u001b[?1h',
  keypad: '\u001b=',
  paste: '\u001b[?2004h',
  mok1: '\u001b[>4;1m',
  mok2: '\u001b[>4;2m',
  kitty: '\u001b[>1u',
  focus: '\u001b[?1004h',
  alt: '\u001b[?1049h',
  mouse: '\u001b[?1000h\u001b[?1006h'
});

/** The mode names, so a caller can say which it may ask for. */
export const RECORDER_MODES = Object.freeze(Object.keys(MODE_SEQUENCES));

/**
 * Read the arguments. Answers `{ log, modes, busyMs, label, lifeMs }` or a
 * sentence saying what is wrong. Pure, so `measure:p337 --self-test` reads it.
 */
export function recorderArgs(argv) {
  const positional = argv.filter((a) => !a.startsWith('--'));
  const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const log = positional[0];
  if (log === undefined || log === '') return 'no log path: node build/p337/key-recorder.mjs <log> [modes]';
  const modeText = positional[1] ?? 'normal';
  const modes = modeText === 'normal' || modeText === '' ? [] : modeText.split(',').filter((m) => m !== '');
  for (const m of modes) if (!RECORDER_MODES.includes(m)) return `unknown mode ${JSON.stringify(m)}; the modes are ${RECORDER_MODES.join(', ')}`;
  const busyMs = Number(flag('busy') ?? '0');
  if (!Number.isInteger(busyMs) || busyMs < 0 || busyMs > 1000) return `--busy must be a whole number of milliseconds from 0 to 1000`;
  const label = flag('label') ?? '';
  if (!/^[A-Za-z0-9._-]{0,40}$/.test(label)) return '--label must be at most 40 letters, digits, dots, dashes or underscores';
  const lifeS = Number(flag('life') ?? '600');
  if (!Number.isInteger(lifeS) || lifeS < 1 || lifeS > 3600) return '--life must be a whole number of seconds from 1 to 3600';
  return { log, modes, busyMs, label, lifeMs: lifeS * 1000 };
}

/** The bytes that ask a terminal for the modes, in the order named. */
export function modeBytes(modes) {
  return modes.map((m) => MODE_SEQUENCES[m]).join('');
}

/** Read a recorder's log back: the ready line, then one entry per read. */
export function readRecorderLog(text) {
  let ready = null;
  const reads = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.ready === true) ready = entry;
    else if (typeof entry.hex === 'string' && typeof entry.t === 'string') reads.push(entry);
  }
  return { ready, reads };
}

const isMain = process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const args = recorderArgs(process.argv.slice(2));
  if (typeof args === 'string') {
    process.stderr.write(`[key-recorder] ${args}\n`);
    process.exit(2);
  }
  const { log, modes, busyMs, label, lifeMs } = args;
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  writeFileSync(log, `${JSON.stringify({ ready: true, modes, busyMs, pid: process.pid })}\n`, { mode: 0o600 });
  process.stdout.write(modeBytes(modes));
  process.stdout.write(`key recorder ${modes.length === 0 ? 'normal' : modes.join('+')}${label === '' ? '' : ` ${label}`}\r\n`);
  let n = 0;
  process.stdin.on('data', (chunk) => {
    n += 1;
    appendFileSync(log, `${JSON.stringify({ t: process.hrtime.bigint().toString(), hex: chunk.toString('hex'), n })}\n`);
    if (busyMs > 0) {
      const until = Date.now() + busyMs;
      while (Date.now() < until) {
        /* busy, as a program drawing its frame is */
      }
    }
  });
  const end = () => process.exit(0);
  for (const sig of ['SIGHUP', 'SIGTERM', 'SIGINT']) process.on(sig, end);
  // Kept referenced on purpose: it holds the loop for the lifetime even if
  // stdin closes, and ends the recorder when the lifetime is up.
  setTimeout(end, lifeMs);
}
