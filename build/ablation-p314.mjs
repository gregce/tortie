#!/usr/bin/env node
/**
 * `npm run ablation:p314`. The attack on the push's gate (Phase 314).
 *
 * A GREEN GATE IS ONLY EVIDENCE IF IT CAN GO RED. `conformance:push` asserts
 * twenty-three rules about `src/main/push/`, the wake rule and the seam — one
 * spelling of Apple's hosts, one refusal before a socket, one allowlist of
 * fields, one age function, one wake window — and every one of them is a clause
 * a later round can delete in one line. THIS SCRIPT BREAKS ONE CLAUSE AT A TIME
 * IN THE SHIPPING SOURCE AND PROVES IT REDDENS THE RULE THAT OWNS IT.
 *
 * An ablation that leaves its rule where the base had it is a hole in the
 * gate. An ablation that reddens only rules OTHER than its own is a finding
 * about the gate rather than about the build, and it is printed as one.
 *
 * ## THE ONES THAT MATTER MOST, SAID FIRST
 *
 *   - `H2`, the refusal before a socket. The sender holds the key that can
 *     alert any phone the app is on; aimed off this Mac it is aimed at Apple.
 *   - `E5`, THE WAKE. Everything that blocked during a sleep is first seen on
 *     the wake tick, and without the suppression it is a batch of fresh alerts
 *     each lying about its age. It is ONE LINE.
 *   - `A2`, the allowlist. A native alert is JSON Apple reads; one read of the
 *     question and the question is Apple's.
 *
 * ## IT NEVER WRITES INTO THE WORKING TREE
 *
 * Three builders work in one worktree during a phase and a harness that writes
 * into `src/` even for the second a check takes can lose another builder's
 * edit. So it builds a CLONE, `build/ablation-p313.mjs`'s shape: `cp -Rc`
 * (APFS clonefile) of `src/` and `build/` under `/private/tmp/p314-ablation-
 * <pid>-…`, every tsconfig and `package.json` copied, `node_modules`
 * symlinked, and the gate run there with that directory as its cwd. Each
 * edited file is put back and CHECKED BY SHA256 against the worktree's bytes
 * before the next entry, and the clone is removed in a `finally` and on a
 * signal. Nothing under the operator's home is touched, and the run ends by
 * asserting the worktree's own bytes never moved.
 *
 * ## IT STARTS NOTHING BUT THE GATE
 *
 * No Electron, no tmux, no ssh, no agent, no token, NO NETWORK. The gate's
 * driven half listens on two loopback ports and closes them in its own
 * `finally`, and its fence refuses any socket to anything but `127.0.0.1` —
 * which is what keeps the H2 arm, the sender with its refusal deleted, from
 * dialling Apple from inside this harness.
 *
 * ## THE DELTA RULE
 *
 * The base's findings are counted first, PER RULE, and each ablation must make
 * its OWN rule's count of `[p314 <rule>]` lines RISE. That proves the ablation
 * CAUSED the reddening rather than inheriting it, and it lets this run while a
 * sibling's half is still red for its own reason. A red base is still reported
 * and still fails the run unless `P314_ALLOW_RED_BASE=1` says the operator
 * knows why.
 *
 * ## A `from` TEXT THAT IS ABSENT FAILS, BY NAME
 *
 * It never skips. A clause that moved moves its entry in the same commit; a
 * clause that is gone leaves its rule unproven, and the run says which.
 *
 * Usage:
 *   node build/ablation-p314.mjs
 *   P314_ONLY=H2,E5,A2 node build/ablation-p314.mjs        named entries only
 *   P314_ALLOW_RED_BASE=1 node build/ablation-p314.mjs
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p314-ablation]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);

const APNS = 'src/main/push/apns.ts';
const ALERT = 'src/main/push/alert.ts';
const ENGINE = 'src/main/push/engine.ts';
const ATTENTION = 'src/main/tray/attention.ts';
const SEAM = 'src/main/harness/push-seam.ts';
const DRIVEN = 'build/p314/push-conformance.mts';

/** The check this harness runs inside the clone. It prints `[p314 <rule>]`. */
const GATE = ['build/conformance-push.mjs'];

/**
 * The ablations, one per rule, and one more for E7 (`E7b`, the integrator's:
 * a fall asked as a state), then SEVEN MORE FROM THE FIX ROUND, one per defect
 * the Tier 3 verifiers found, each red on the rule whose scenario drives it:
 * `A1b` the wake lead, `E3b` the in-flight fall, `E7c` and `E7d` the sender's
 * deadline, `E7e` the dead set, `E7f` the clock fault and `E7g` the dedupe. `rule` is the rule that must go red. `why` is
 * what the clause is FOR, so a reader of a failure knows what was lost. The
 * `from` texts are the pinned lines of `build/p314/SPEC.md` §9.3 where it pins
 * one, and otherwise a line the built source holds exactly once.
 */
const ABLATIONS = [
  // -------------------------------------------------------------------------
  // The hosts, and the refusals before any socket
  // -------------------------------------------------------------------------
  {
    n: 'H1',
    rule: 'H1',
    name: 'Apple’s production host spelled a second time, outside apnsOrigin',
    why: 'the one spelling is what makes "nothing in this phase dials Apple" checkable: a second spelling is a second place an origin can come from that no reviewer is looking at.',
    file: ENGINE,
    from: '    if (!seeded) {',
    to: "    const apple = 'https://api.push.apple.com';\n    void apple;\n    if (!seeded) {"
  },
  {
    n: 'H2',
    rule: 'H2',
    name: 'the loopback refusal deleted, so an origin off this Mac is dialled without allowRemote',
    why: 'THIS IS THE ONE THAT MATTERS MOST. The sender holds the key that can alert any phone the app is on, and aimed off this Mac it is aimed at Apple. The gate’s fence is what stops this arm from actually dialling.',
    file: APNS,
    from: '  if (!isLoopbackOrigin(url) && options.allowRemote !== true) {',
    to: '  if (false as boolean) {'
  },
  {
    n: 'H3',
    rule: 'H3',
    name: 'the gate’s own driven half aims a sender at a real address',
    why: 'every test, gate and probe aims the sender at the loopback stand-in. A check that named a real host would reach it on every commit.',
    file: DRIVEN,
    from: "  // P314-H3-ANCHOR: the ablation's H3 arm inserts a hostile sender below this line.",
    to: "  // P314-H3-ANCHOR: the ablation's H3 arm inserts a hostile sender below this line.\n  if (false as boolean) createApnsSender!({ origin: () => 'http://192.0.2.7:443' });"
  },
  // -------------------------------------------------------------------------
  // The provider token
  // -------------------------------------------------------------------------
  {
    n: 'J1',
    rule: 'J1',
    name: 'the signature DER-encoded rather than the raw 64-byte r||s',
    why: 'Apple names ES256, which is the 64-byte ieee-p1363 form; a DER signature is refused as InvalidProviderToken and nothing would ever arrive.',
    file: APNS,
    from: "dsaEncoding: 'ieee-p1363'",
    to: "dsaEncoding: 'der'"
  },
  {
    n: 'J2',
    rule: 'J2',
    name: 'a token re-minted when the wall clock went backwards',
    why: 'Apple judges the token by Apple’s clock, and re-minting on every backwards jump is how a provider meets TooManyProviderTokenUpdates (SPEC §2.6).',
    file: APNS,
    from: '  if (age < TOKEN_REUSE_MS) return cached.token;',
    to: '  if (age >= 0 && age < TOKEN_REUSE_MS) return cached.token;'
  },
  // -------------------------------------------------------------------------
  // The alert
  // -------------------------------------------------------------------------
  {
    n: 'A1',
    rule: 'A1',
    name: 'one row seen at a wake sent as a single alert',
    why: 'a wake is always SAID, even for one row: the single shape carries no sentence, so a row first seen at the wake would arrive looking young (SPEC §2.2).',
    file: ALERT,
    from: '  const single = input.announce.length === 1 && !input.announce[0].seenAtWake;',
    to: '  const single = input.announce.length === 1;'
  },
  {
    n: 'A2',
    rule: 'A2',
    name: 'the composer reads the question',
    why: 'a native alert is JSON Apple reads. Never the question, never an excerpt, never a conversation byte (research 127 §6); one read is one step from one send.',
    file: ALERT,
    from: '  const single = input.announce.length === 1 && !input.announce[0].seenAtWake;',
    to: '  const single = input.announce.length === 1 && !input.announce[0].seenAtWake;\n  void input.announce[0].question;'
  },
  {
    n: 'A3',
    rule: 'A3',
    name: 'the ceiling doubled',
    why: 'Apple’s ceiling is 4096 bytes for every remote notification that is not VoIP. A payload over it is refused whole with PayloadTooLarge, so the ONE alert a wake produces would never arrive.',
    file: ALERT,
    from: 'export const APNS_PAYLOAD_MAX_BYTES = 4096;',
    to: 'export const APNS_PAYLOAD_MAX_BYTES = 8192;'
  },
  {
    n: 'A4',
    rule: 'A4',
    name: 'the hex refusal deleted, so any string becomes a path segment',
    why: 'a device token is hex bytes. Anything else composed into `/3/device/<token>` is a path the sender did not mean to ask for.',
    file: APNS,
    from: '  if (!/^[0-9a-f]+$/.test(request.token)) {',
    to: '  if (false as boolean) {'
  },
  {
    n: 'C1',
    rule: 'C1',
    name: 'the single title reworded',
    why: 'the title is the approved mock’s first line (`fix-login needs input`) and the copy ledger owns it; a colon is a new word nobody approved.',
    file: ALERT,
    from: '`${row.name} ${row.statusLabel}`',
    to: '`${row.name}: ${row.statusLabel}`'
  },
  // -------------------------------------------------------------------------
  // The engine
  // -------------------------------------------------------------------------
  {
    n: 'E1',
    rule: 'E1',
    name: 'a working session admitted to the blocked set',
    why: 'nothing rises for working or idle, ever (research 127 §4). A number that rises on its own is not a signal, it is noise in a nicer font (attention.ts:1-11).',
    file: ATTENTION,
    from: "    .filter((s) => s.status === 'needs_input')",
    to: "    .filter((s) => s.status === 'needs_input' || s.status === 'running')"
  },
  {
    n: 'E2',
    rule: 'E2',
    name: 'the remote filter deleted',
    why: 'nothing rises for, and nothing counts, a row on another machine: the badge is the number ⌘J’s header draws, and a remote row forced to needs_input is not his to answer from this Mac’s alert.',
    file: ENGINE,
    from: '    const rows = deps.rows().filter((row) => row.machine === null);',
    to: '    const rows = deps.rows();'
  },
  {
    n: 'E3',
    rule: 'E3',
    name: 'the coalescing window set to zero',
    why: 'twenty rows can flip at once and a locked phone must not take twenty cards — the adversary’s second blocker.',
    file: ENGINE,
    from: 'export const COALESCE_MS = 4_000;',
    to: 'export const COALESCE_MS = 0;'
  },
  {
    n: 'E4',
    rule: 'E4',
    name: 'the single alert’s collapse id made unique per send',
    why: 'a session that blocks twice replaces its own card through apns-collapse-id, Apple’s own mechanism; a different id each time stacks them.',
    file: ALERT,
    from: '      collapseId: head.sessionId,',
    to: '      collapseId: `${head.sessionId}.${String(Math.random()).slice(2, 8)}`,'
  },
  {
    n: 'E5',
    rule: 'E5',
    name: 'THE WAKE: the suppression inside the window deleted',
    why: 'THE DESIGN. The poll does not run while the Mac sleeps, so what blocked during it is first seen on the wake tick; without this line it goes out as separate fresh alerts, each lying about its age.',
    file: ENGINE,
    from: '    if (wakeUntil !== null && monotonic() < wakeUntil) return;',
    to: ''
  },
  {
    n: 'E6',
    rule: 'E6',
    name: 'the silent seed deleted',
    why: 'on launch every row already waiting would be a join, which is the twenty-cards failure of the wake again, at every restart.',
    file: ENGINE,
    from: '    if (!seeded) {',
    to: '    if (!seeded && (false as boolean)) {'
  },
  {
    n: 'E7',
    rule: 'E7',
    name: 'a 410 no longer drops the device token',
    why: 'a phone he removed must not become a permanent retry loop: Apple says there is no need to send further pushes to that token.',
    file: ENGINE,
    from: "      if (answer.kind === 'drop') deps.drop(destination);",
    to: "      if (answer.kind === 'drop') void destination;"
  },
  {
    n: 'E7b',
    rule: 'E7',
    name: 'a fall asked as a state on every poll rather than as an event',
    why: 'a badge Apple refused was sent again on every later poll beside its one retry (the integrator measured 282 sends in ten minutes against a 500); SPEC §2.7 allows one retry and none for a 429.',
    file: ENGINE,
    from: '    const fell = left && lastBadge !== null && ids.size < lastBadge;',
    to: '    void left;\n    const fell = lastBadge !== null && ids.size < lastBadge;'
  },
  {
    n: 'E8',
    rule: 'E8',
    name: 'the key read on a join with nobody to tell',
    why: 'a person who never pairs a phone must cost nothing: no key read, no connection, no timer, no log line (SPEC §3.6).',
    file: ENGINE,
    from: '    if (liveDestinations().length === 0) {',
    to: '    void deps.providerKey();\n    if (liveDestinations().length === 0) {'
  },
  {
    n: 'E9',
    rule: 'E9',
    name: 'beginShutdown no longer closes admission first',
    why: 'the quit’s ordered disposer calls beginShutdown and then joins; a join that arrives while admission is still open can start a send the quit never waits for.',
    file: ENGINE,
    from: '    beginShutdown(): void {\n      closed = true;',
    to: '    beginShutdown(): void {\n      void 0;'
  },
  {
    n: 'G1',
    rule: 'G1',
    name: 'a device token logged on a drop',
    why: 'the log takes a sentence and never a value. A device token in app.log is the address a leaked key can alert.',
    file: ENGINE,
    from: "      if (answer.kind === 'drop') deps.drop(destination);",
    to: "      if (answer.kind === 'drop') deps.drop(destination);\n      if (answer.kind === 'drop') engineLog.warn(`dropped ${destination.token}`);"
  },
  {
    n: 'W1',
    rule: 'W1',
    name: 'the push names the logins domain',
    why: 'the push reads the credentials and pocket domains by type only and names no login store: a sender that can name the logins can be made to read one.',
    file: ENGINE,
    from: '    if (!seeded) {',
    to: "    if (false as boolean) void import('../logins/ipc');\n    if (!seeded) {"
  },
  {
    n: 'Y1',
    rule: 'Y1',
    name: 'the wake window made exclusive at its far edge',
    why: 'every surface that draws an age reads blockedAge; a row first seen at resume + 15,000 is in the wake alert, so the door must say it was seen at the wake too, or the alert and the door disagree.',
    file: ATTENTION,
    from: '    (w) => stamp >= w.resumedAt && stamp <= w.resumedAt + WAKE_WINDOW_MS',
    to: '    (w) => stamp >= w.resumedAt && stamp < w.resumedAt + WAKE_WINDOW_MS'
  },
  // -------------------------------------------------------------------------
  // The fix round (Phase 314): one arm per defect the Tier 3 verifiers found
  // -------------------------------------------------------------------------
  {
    n: 'A1b',
    rule: 'A1',
    name: 'the wake lead said when ANY announced row was first seen at the wake',
    why: 'a row pending from before the sleep folds into the wake alert with its true stamp, and "Seen when your Mac woke" in front of its name is false of it; the alert and the door would disagree about that row.',
    file: ALERT,
    from: '  const wake = input.announce.every((row) => row.seenAtWake);',
    to: '  const wake = input.announce.some((row) => row.seenAtWake);'
  },
  {
    n: 'E3b',
    rule: 'E3',
    name: 'no correction for a row that left while its alert was in flight',
    why: 'the fall was judged against the badge before the send and the send then recorded the higher badge, so the phone kept a badge above the blocked count for as long as nothing else joined or fell.',
    file: ENGINE,
    from: '        localRows().length < badge',
    to: '        localRows().length < 0'
  },
  {
    n: 'E7c',
    rule: 'E7',
    name: 'a connection a request got no answer on is kept and handed to the next send',
    why: 'a silent peer or a stalled handshake then eats the one retry and every later alert on that origin until thirty idle minutes or a sleep.',
    file: APNS,
    from: '          abandon(origin, held.session);',
    to: '          void held;'
  },
  {
    n: 'E7d',
    rule: 'E7',
    name: 'the request deadline put back to the stream’s own idle timer',
    why: 'THE FIRST BUILD. A stream on a connection whose TLS handshake nobody answers is pending, node defers its reset until ready, and ready never comes: the send never settled, and on a Mac that never sleeps nothing was pushed again for the rest of the run.',
    file: APNS,
    from:
      '      deadline = setTimeout(() => {\n' +
      '        if (status === 0) {\n' +
      '          abandon(origin, held.session);\n' +
      '          settle(UNREACHABLE_ANSWER);\n' +
      '          return;\n' +
      '        }\n' +
      '        settle(answered());\n' +
      '        stream.close(http2Constants.NGHTTP2_CANCEL);\n' +
      '      }, requestTimeout);\n' +
      '      deadline.unref?.();',
    to:
      '      stream.setTimeout(requestTimeout, () => {\n' +
      '        stream.close(http2Constants.NGHTTP2_CANCEL);\n' +
      '      });'
  },
  {
    n: 'E7e',
    rule: 'E7',
    name: 'the engine keeps no dead set of its own',
    why: 'a drop the host could not seal to disk left the host answering the dead token, and every later alert asked Apple about it again while the person was told it had stopped.',
    file: ENGINE,
    from: "      if (answer.kind === 'drop') dead.add(destination.tokenDigest);",
    to: "      if (answer.kind === 'drop') void dead;"
  },
  {
    n: 'E7f',
    rule: 'E7',
    name: 'a second ExpiredProviderToken stops the key again',
    why: 'a fresh token called expired is this Mac’s clock, not the key: the stop lasted the whole run after the clock was put right, and its sentence blamed the key.',
    file: ENGINE,
    from: "      if (answer.kind === 'reauth') say('clock');",
    to: "      if (answer.kind === 'reauth') {\n        refusedDigest = digest;\n        say('refused-key');\n      }"
  },
  {
    n: 'E7g',
    rule: 'E7',
    name: 'one device token presented by two pairings is asked twice',
    why: 'the same phone takes two identical cards for one wait.',
    file: ENGINE,
    from: '      if (dead.has(destination.tokenDigest) || seen.has(destination.tokenDigest)) continue;',
    to: '      if (dead.has(destination.tokenDigest)) continue;'
  },
  {
    n: 'S1',
    rule: 'S1',
    name: 'the seam’s status word drifts from statusVisual',
    why: 'there is no main-side spelling of the word yet (313 mechanism 8 is Phase 316’s), so the seam’s one spelling is held equal to the renderer’s by this rule and nothing else.',
    file: SEAM,
    from: "const SEAM_STATUS_WORD = 'needs input';",
    to: "const SEAM_STATUS_WORD = 'needs your input';"
  }
];

// ---------------------------------------------------------------------------
// The clone, and the gate run inside it
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join('/private/tmp', `p314-ablation-${String(process.pid)}-`));
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

function buildClone() {
  for (const name of ['src', 'build']) {
    const r = spawnSync('cp', ['-Rc', join(REPO, name), join(scratch, name)], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`cp -Rc ${name} failed: ${r.stderr}`);
  }
  // EVERY tsconfig: tsx resolves project references out of tsconfig.json and a
  // clone holding one alone dies on a missing sibling (ablation:p275's lesson).
  for (const name of ['package.json', ...readdirSync(REPO).filter((f) => /^tsconfig(\.[a-z]+)?\.json$/.test(f))]) {
    writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
  }
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
}

/** Run the gate inside the clone and answer each rule's count of findings. */
function runGate() {
  const r = spawnSync(process.execPath, GATE.map((a) => join(scratch, a)), {
    cwd: scratch,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120_000
  });
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const counts = new Map();
  for (const m of text.matchAll(/\[p314 ([A-Z][0-9])\]/g)) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  return { code: r.status ?? 1, counts, text };
}

/** Put one clone file back and prove it by sha256 against the worktree. */
function restore(rel) {
  const want = readFileSync(join(REPO, rel));
  writeFileSync(join(scratch, rel), want);
  const got = readFileSync(join(scratch, rel));
  if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
}

/** One exact replacement inside the clone; a function replacer, so `$&` stays literal. */
function ablate(rel, from, to) {
  const path = join(scratch, rel);
  if (!existsSync(path)) return false;
  const text = readFileSync(path, 'utf8');
  if (!text.includes(from)) return false;
  writeFileSync(path, text.replace(from, () => to), 'utf8');
  return true;
}

let cleaned = false;
const clean = () => {
  if (cleaned) return;
  cleaned = true;
  try {
    rmSync(scratch, { recursive: true, force: true });
  } catch {
    /* under /private/tmp; not fatal */
  }
};
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    clean();
    process.exit(130);
  });
}

// The worktree's bytes for every file an entry touches, BEFORE anything runs.
const touched = [...new Set(ABLATIONS.map((a) => a.file))].filter((f) => existsSync(join(REPO, f)));
const before = new Map(touched.map((f) => [f, sha(readFileSync(join(REPO, f)))]));

const problems = [];
const table = [];
let ran = 0;
const started = Date.now();

try {
  buildClone();
  say(`clone at ${scratch}, node_modules symlinked, nothing under a home touched`);
  const base = runGate();
  const baseRed = [...base.counts.keys()];
  if (base.code === 0) {
    say('base: the gate is green, 0 rules red');
  } else {
    say(`base: ALREADY RED on ${baseRed.length === 0 ? 'no numbered rule, so the gate failed to run' : baseRed.map((r) => `${r}×${String(base.counts.get(r))}`).join(', ')}`);
    for (const line of base.text.split('\n').filter((l) => l.includes('[p314 ')).slice(0, 8)) {
      say(`  base failure: ${line.trim().slice(0, 220)}`);
    }
    if (process.env['P314_ALLOW_RED_BASE'] !== '1') {
      problems.push(
        'the gate was red before any ablation ran. Every reading below is still a DELTA against that base, ' +
          'but re-run with P314_ALLOW_RED_BASE=1 once you know why.'
      );
    }
  }

  const only = (process.env['P314_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
  for (const name of only) {
    if (!ABLATIONS.some((a) => a.n === name)) problems.push(`P314_ONLY names ${JSON.stringify(name)}, which is no entry`);
  }
  for (const entry of ABLATIONS) {
    if (only.length > 0 && !only.includes(entry.n)) continue;
    if (!ablate(entry.file, entry.from, entry.to)) {
      problems.push(
        `${entry.n} "${entry.name}": the shape to ablate is not in ${entry.file}. Either the clause moved, and this ` +
          `entry moves with it in the same commit, or it is gone and ${entry.rule} is unproven. It looked for: ` +
          `${JSON.stringify(entry.from).slice(0, 180)}`
      );
      table.push([entry.n, entry.rule, 'SHAPE MISSING', '']);
      continue;
    }
    ran += 1;
    const out = runGate();
    const rose = [...out.counts.keys()].filter((r) => (out.counts.get(r) ?? 0) > (base.counts.get(r) ?? 0));
    const own = rose.includes(entry.rule);
    table.push([entry.n, entry.rule, own ? 'red' : rose.length === 0 ? 'NOTHING MOVED' : 'RED ELSEWHERE', rose.join(',')]);
    say(`${entry.n.padEnd(3)} ${entry.rule.padEnd(3)} ${entry.name}: exit ${String(out.code)}, newly red ${rose.join(', ') || 'nothing'}`);
    if (rose.length === 0) {
      problems.push(`${entry.n} "${entry.name}": no rule moved. ${entry.why} Nothing notices, so ${entry.rule} is decoration.`);
    } else if (!own) {
      const lines = out.text.split('\n').filter((l) => l.includes('[p314 ')).slice(0, 3).map((l) => l.trim().slice(0, 220));
      problems.push(
        `${entry.n} "${entry.name}": something went red but ${entry.rule} did not (red instead: ${rose.join(', ')}). ${lines.join(' // ')}`
      );
    }
    restore(entry.file);
  }

  const after = runGate();
  const same =
    after.code === base.code &&
    [...new Set([...after.counts.keys(), ...base.counts.keys()])].every((r) => (after.counts.get(r) ?? 0) === (base.counts.get(r) ?? 0));
  if (!same) {
    problems.push('after every file was restored the gate did not read what the base read, so a restore did not land.');
  } else {
    say(`restored: every touched clone file matches the worktree by sha256, and the gate reads what the base read (exit ${String(after.code)})`);
  }
} catch (err) {
  problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  clean();
}

// The worktree was never written: every file an entry names has the bytes it had.
for (const [file, was] of before) {
  const now = sha(readFileSync(join(REPO, file)));
  if (now !== was) {
    problems.push(
      `${file} in the WORKTREE changed during the run (${was.slice(0, 12)} to ${now.slice(0, 12)}); this harness ` +
        'writes only its clone, so another process wrote it'
    );
  }
}

process.stdout.write('\n');
for (const [n, rule, verdict, rose] of table) {
  process.stdout.write(`${TAG}   ${n.padEnd(4)} ${rule.padEnd(4)} ${verdict.padEnd(15)} ${rose}\n`);
}
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (problems.length > 0) {
  process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS in ${seconds} s. ${String(ran)} ablations, one clause each, and every one made THE RULE THAT ` +
    'OWNS IT newly red, measured as a DELTA against the base. Every clone file was restored and proved by sha256, ' +
    'the worktree was never written, and the clone is gone. No Electron, no tmux, no ssh, no agent, no token, and ' +
    'no listener but the two loopback ones the gate opens and closes in its own finally.\n'
);
