#!/usr/bin/env node
/**
 * probe:p330 — the door published through Tailscale Funnel, driven inside the
 * real app against a STAND-IN Tailscale, and read by a node phone through the
 * stand-in's forwarder with mutual TLS (Phase 330, build/p330/SPEC.md §7.2).
 *
 * NO REAL TAILSCALE, EVER. The app runs with `GMUX_TAILSCALE_BIN` set to a
 * `/bin/sh` wrapper this probe writes, which execs build/p330/tailscale-
 * standin.mjs. Before any launch the PREFLIGHT refuses unless that variable is
 * the wrapper, the wrapper is executable and unchanged, and the file it execs
 * is byte for byte the stand-in. Through the run the process table is sampled
 * every second, and ANY real Tailscale program (/Applications/Tailscale.app,
 * /usr/local/bin/tailscale, /opt/homebrew/bin/tailscale) under this run's app,
 * or run as a command line anywhere, FAILS the run. The stand-in's log must hold
 * every Tailscale call the app made, and a forbidden argv (`--bg`, `reset`,
 * `off`, a TLS-terminating mode) in it fails the run on sight. This probe never
 * presses Open Tailscale, because that would open a browser on this Mac to a
 * made-up page. No real Funnel is proved here: his checklist
 * (build/p330/CHECKLIST.md) is the only proof of Funnel itself.
 *
 * WHAT IS REAL: the app's own `pocket:*` channels and the Settings then Phone
 * sheet, pressed through its DOM the way a person presses it; the door process
 * (a `utilityProcess`) and its TLS; the Funnel child's spawn, read-back, stop,
 * restart and orphan sweep; the confirm gate; the pairing window; the signed
 * reads over the real session list and the real overview store.
 *
 * WHAT IS SUPPLIED: the stand-in (build/p330/tailscale-standin.mjs), the node
 * phone (build/p316/node-phone.mjs, a third implementation of the wire), and a
 * `/bin/sh` `claude` on the scratch PATH that plants the COMMITTED research 63
 * transcript, so NO VENDOR PROCESS RUNS AND NO TOKEN IS SPENT.
 *
 * THE ARMS. Arms 1 to 10 in ONE app; arm 11 is two more launches, one after
 * the other, never at once.
 *   A1  the door off: no stand-in call, no Tortie Door process (a descendant
 *       carrying `--utility-sub-type=node.mojom.NodeService`), no Tailscale
 *       child, and the app's listening sockets the parent's (opening
 *       Settings then Phone first, so opening the sheet is shown to read nothing)
 *   A2  Pair pressed: the stand-in saw `status --json --peers=false` and
 *       `serve status --json` and nothing else; the lines name
 *       https://<name>:8443, the tailnet and the program; the approval warning
 *   A3  Allow, with the approval scenario: Open Tailscale drawn and enabled,
 *       approvalOpens true and approvalText null; NEVER PRESSED. Then the
 *       stand-in is approved, the door listens and the code shows WITH NO
 *       OTHER PRESS
 *   A4  the child's argv from its own log and `ps -ww`, byte for byte with
 *       §4.2.4, its target the door process's real port, and the record file
 *       (`<profile>/gmux/pocket-funnel/record.json`) equal to `ps` AFTER the
 *       stand-in wrapper's `exec`, at 0600 in a 0700 directory of its own
 *   A5  two node phones pair through the forwarder (v:3 read the phone's way,
 *       the proof, the three-key fingerprint on both screens, the client
 *       certificate) and read with mutual TLS, a conversation paged back to its
 *       first turn; a read with no client certificate is closed after the
 *       handshake
 *   A6  every refusal sentence, one scenario each, in the sheet and in the
 *       status: not-running, signed-out, shields-up, ports443 (funnel-ports),
 *       port-taken, busy, exit0 (not-approved), and late in the run
 *       ports-taken and no program (a wrapper path that does not exist: it
 *       must refuse override-unusable and MUST NOT fall back)
 *   A7  Remove: the child, the door process and the forwarder end; Allow again
 *       and the door restarts without the removed phone's pin; the removed
 *       phone's next connection is closed after the handshake with no HTTP
 *       byte answered and `unknown-key` is in app.log; the other phone reads
 *   A8  a profile switch: the tailnet moves, the probe SIGINTs the child, and
 *       there is NO restart: the gate reads `changed` and the new lines are drawn
 *   A9  an unexpected exit, the fields unchanged: SIGKILL the child; the
 *       restarting line, the restart at the floor, counted, and a read again
 *   A10 quit: the child and the door process end inside it; the record goes
 *   A11 THE ORPHAN, two launches: launch A publishes, the probe SIGKILLs the
 *       app's MAIN pid (never the shim), the child survives reparented and
 *       recorded; a DECOY with the same wrapper and argv and a later start
 *       time is started; launch B ends exactly the recorded child, leaves the
 *       decoy, starts a new child, and app.log names the ending
 *   A12 (the fix round, run before A2) BOTH PORTS HELD ON A FIRST PAIR: the
 *       sheet draws ports-taken with Try again and NO lines and no Allow, main
 *       answers confirmable false, and a confirm sent through the bridge with
 *       the lines anyway records nothing and starts nothing
 *   A13 (the fix round) THE DOOR PROCESS'S ENVIRONMENT, read with `ps -E`:
 *       its own TORTIE_DOOR=1 and no HOME, no GMUX_TAILSCALE_BIN and no
 *       P330_MAIN_MARKER, the variable this probe gives main alone; the
 *       control is a SIBLING of the door that main started with its whole
 *       environment, the `--utility-sub-type=network.mojom.NetworkService`
 *       child, whose `ps -E` must show the marker. Never main's own `ps -E`:
 *       Electron's main empties its own environment when it renames itself
 *       `Tortie` (the reverify, 2026-09-29), so a control read there is empty
 *       whatever the door holds, and the grader refuses one read there
 *   and at the end: the stand-in's log holds every call and no forbidden
 *   argv, no real Tailscale was seen, every stand-in pid and the decoy are
 *   ended by pid in the `finally`, and no Electron of this run is left.
 *
 * PHASE 332: THE NAME CHECK, AGAINST A LOOPBACK DNS STAND-IN. From Phase 332 a
 * published door asks the `ts.net` zone's own servers whether its public name
 * answers before a code may show. This probe hands the app
 * `GMUX_POCKET_NAME_SERVERS`, naming build/p332/dns-standin.mjs IN THIS
 * PROCESS on 127.0.0.1, answering the stand-in's made-up name, so no question
 * reaches real DNS (a parent build ignores the variable). The preflight also
 * refuses unless that value names 127.0.0.1 alone and the stand-in answers; A3
 * waits for main's `pairable` (60 s for the code), and RUN grades every
 * question the app asked: an `A` question, RD 0, for the stand-in's name.
 * Before every launch the profile's agents.json renames the Gemini, Qwen,
 * Antigravity, Grok and Droid binaries, and `agents:list` is read back, so no
 * agent's `--version` ever runs.
 *
 * THE PARENT. `P330_PARENT_CHECKOUT=<a built checkout at 217f47e5>` runs A1
 * against that build (with the quit timed), and writes probe-p330-parent.json,
 * which a later HEAD run reads for A1's comparison. `P330_ARMS=1` runs A1 alone
 * at HEAD, with the quit timed, for the parent measurement's other half.
 *
 * WHAT IT REFUSES TO DO. It launches only through build/electron-run.mjs's
 * `withElectron`, whose kill is in a `finally`, on its own scratch profile,
 * scratch HOME and tmux socket `gmux-p330-<pid>` (never `gmux`). It signals
 * only pids it can prove are this run's: the app's main pid in A11 (never the
 * shim), and stand-in pids whose command line names the stand-in file. It
 * never runs `pkill`, installs nothing, spends no token, binds nothing but
 * 127.0.0.1, dials nothing but 127.0.0.1, and reads no credential, keychain
 * item or conversation store of the person's. `npm run shot` is not called.
 *
 * VERIFIERS ONLY, under THE LOCK: it starts an Electron. Builders write it and
 * run only `--grader-self-test`, which grades recorded fixtures and starts
 * nothing.
 *
 * BUILD FIRST. It refuses (exit 2) when the checkout it is pointed at has no build.
 *
 *   npm run -s probe:p330
 *   P330_PARENT_CHECKOUT=/path/to/parent npm run -s probe:p330   the parent reading
 *   P330_ARMS=1,12,2 npm run -s probe:p330                       some arms
 *   P330_KEEP=1 npm run -s probe:p330                            keep the scratch world
 *   node build/p330/probe-p330.mjs --grader-self-test            the graders, no Electron
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ, which is never a pass.
 */

import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { connect as netConnect } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { wsConnect, cdpEval } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { gradeFixtures } from '../probe-graders.mjs';
import { adoptCertificate, doorFrom, fingerprintDigits, makePhone, pageBack, pairThrough, readOffer, signedGet } from '../p316/node-phone.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, processRows, realTailscaleIn, watchForRealTailscale } from './tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin, nameQuestionsSelfTest, nameQuestionsVerdict, quietAgentsHeld, writeQuietAgents } from '../p332/dns-standin.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// ---------------------------------------------------------------------------
// The words, read from the SHIPPING source rather than copied, with the SPEC's
// text (§4.10) as the fallback the report names when a word is not found.
// ---------------------------------------------------------------------------

/** One string literal (`'…'`, `"…"` or a template with no `${`) at `text[i]`, or null. */
function literalAt(text, i) {
  const q = text[i];
  if (q !== "'" && q !== '"' && q !== '`') return null;
  let out = '';
  for (let k = i + 1; k < text.length; k += 1) {
    const c = text[k];
    if (c === '\\') {
      const n = text[k + 1];
      if (n === 'n') out += '\n';
      else if (n === 'u') {
        const m = /^u\{([0-9a-fA-F]+)\}|^u([0-9a-fA-F]{4})/.exec(text.slice(k + 1));
        if (m === null) return null;
        out += String.fromCodePoint(parseInt(m[1] ?? m[2], 16));
        k += m[0].length;
        continue;
      } else out += n;
      k += 1;
      continue;
    }
    if (q === '`' && c === '$' && text[k + 1] === '{') return null;
    if (c === q) return { value: out, end: k + 1 };
    out += c;
  }
  return null;
}

/** A `'a' + 'b'` concatenation of literals starting at `i`, or null. */
function concatAt(text, i) {
  let k = i;
  let value = '';
  for (;;) {
    while (/\s/.test(text[k] ?? '')) k += 1;
    const lit = literalAt(text, k);
    if (lit === null) return value === '' ? null : { value, end: k };
    value += lit.value;
    k = lit.end;
    while (/\s/.test(text[k] ?? '')) k += 1;
    if (text[k] !== '+') return { value, end: k };
    k += 1;
  }
}

/** `export const NAME = 'a' + 'b';` → the string, or null. Exported for the self-test. */
export function stringConst(src, name) {
  const m = new RegExp(`\\b(?:export\\s+)?const\\s+${name}\\b[^=]*=\\s*`).exec(src);
  if (m === null) return null;
  return concatAt(src, m.index + m[0].length)?.value ?? null;
}

/** `NAME = { 'key': 'text' + 'text', key: 'text' }` → the table, or {}. */
export function sentenceTable(src, name) {
  const m = new RegExp(`\\b${name}\\b[^=]*=\\s*\\{`).exec(src);
  if (m === null) return {};
  const out = {};
  let k = m.index + m[0].length;
  for (;;) {
    while (/[\s,]/.test(src[k] ?? '')) k += 1;
    if (src[k] === '}' || k >= src.length) return out;
    let key;
    const quoted = literalAt(src, k);
    if (quoted !== null) {
      key = quoted.value;
      k = quoted.end;
    } else {
      const id = /^[A-Za-z_$][\w$-]*/.exec(src.slice(k));
      if (id === null) return out;
      key = id[0];
      k += id[0].length;
    }
    while (/\s/.test(src[k] ?? '')) k += 1;
    if (src[k] !== ':') return out;
    const value = concatAt(src, k + 1);
    if (value === null) return out;
    out[key] = value.value;
    k = value.end;
  }
}

/** The SPEC's words (§4.10), for any the source does not yield. */
export const SPEC_WORDS = Object.freeze({
  POCKET_FUNNEL_RIGHT_WARNING: 'Approving Funnel lets any device signed in to your tailnet publish to the internet, not only this Mac.',
  POCKET_FUNNEL_APPROVAL: 'Tailscale needs your OK to publish this door.',
  POCKET_FUNNEL_RESTARTING: 'Tailscale stopped publishing the door. Tortie is trying again.',
  BTN_PAIR: 'Pair',
  BTN_OPEN_TAILSCALE: 'Open Tailscale',
  // Phase 333.2 moved the scan line (build/p3332/SPEC.md).
  SCAN_LINE: 'Scan it with Tortie on your iPhone, from tortie.sh/iphone.',
  PHONES_DROPPED: 'Phones paired before this version must pair again.',
  sentences: {
    'no-tailscale': 'Tortie found no Tailscale program on this Mac. Install Tailscale and sign in, then try again.',
    'override-unusable': 'GMUX_TAILSCALE_BIN does not name a program Tortie can run, so Tortie published nothing.',
    'not-running': 'Tailscale is not running on this Mac. Open Tailscale, then try again.',
    'signed-out': 'Tailscale on this Mac is signed out. Sign in, then try again.',
    'no-name': 'Tailscale has not given this Mac a name, so there is nothing for a phone to reach. Turn on MagicDNS for your tailnet, then try again.',
    unreadable: 'Tortie could not read what Tailscale answered, so it published nothing.',
    'ports-taken': 'Tailscale on this Mac already uses ports 8443 and 10000, so Tortie has no port to publish on.',
    'port-taken': 'Tailscale on this Mac already uses port PORT for something else. Tortie will not take it over.',
    'not-approved': 'Tailscale did not turn Funnel on. An admin of your tailnet must approve it.',
    'shields-up': 'Tailscale is set to refuse incoming connections on this Mac. Allow incoming connections in Tailscale, then try again.',
    'funnel-ports': 'Your tailnet’s policy does not allow Funnel on the ports Tortie needs. An admin can allow ports 443, 8443 and 10000.',
    'approval-timeout': 'Tailscale’s approval did not arrive, so Tortie published nothing.',
    busy: 'Tailscale was changing its settings at the same moment. Try again.',
    failed: 'Tailscale did not publish the door. Nothing was published.'
  },
  FUNNEL_RESTART_FLOOR_MS: 2_000
});

/** The words this run grades against, and where each came from. */
export function wordsFrom(contractSrc, sheetSrc, funnelSrc) {
  const from = {};
  const pick = (name, src) => {
    const v = stringConst(src, name);
    from[name] = v === null ? 'spec' : 'source';
    return v ?? SPEC_WORDS[name];
  };
  const table = sentenceTable(contractSrc, 'POCKET_FUNNEL_SENTENCES');
  const sentences = {};
  for (const [word, text] of Object.entries(SPEC_WORDS.sentences)) {
    sentences[word] = table[word] ?? text;
    from[`sentence:${word}`] = table[word] === undefined ? 'spec' : 'source';
  }
  const floor = /FUNNEL_RESTART_FLOOR_MS\s*=\s*([0-9_]+)/.exec(funnelSrc);
  from.FUNNEL_RESTART_FLOOR_MS = floor === null ? 'spec' : 'source';
  return {
    rightWarning: pick('POCKET_FUNNEL_RIGHT_WARNING', contractSrc),
    approval: pick('POCKET_FUNNEL_APPROVAL', contractSrc),
    restarting: pick('POCKET_FUNNEL_RESTARTING', contractSrc),
    btnPair: pick('BTN_PAIR', sheetSrc),
    btnOpen: pick('BTN_OPEN_TAILSCALE', sheetSrc),
    scanLine: pick('SCAN_LINE', sheetSrc),
    phonesDropped: pick('PHONES_DROPPED', sheetSrc),
    sentences,
    sentence: (word, port) => (word === 'port-taken' ? sentences[word].replace('PORT', String(port)) : sentences[word]),
    floorMs: floor === null ? SPEC_WORDS.FUNNEL_RESTART_FLOOR_MS : Number(floor[1].replace(/_/g, '')),
    from
  };
}

// ---------------------------------------------------------------------------
// THE GRADERS. Pure: each takes the reading an arm collected and answers which
// of its clauses failed. `--grader-self-test` runs every one over a passing
// fixture and, for EVERY clause, a fixture broken on that clause alone, which
// must fail on that clause: a grader nobody has seen fail proves nothing.
// Every predicate is ONE expression, so the ablation in build/p330's proof can
// replace any one by `true`.
// ---------------------------------------------------------------------------

const TAILSCALE_ARGV = { status: J(['status', '--json', '--peers=false']), serve: J(['serve', 'status', '--json']) };
const expectedFunnelArgv = (publicPort, localPort) => ['funnel', `--tcp=${String(publicPort)}`, '--proxy-protocol=2', `tcp://127.0.0.1:${String(localPort)}`];

export const GRADERS = {
  A1: {
    title: 'the door off: nothing read, nothing spawned, nothing listening that the parent did not',
    clauses: [
      ['no stand-in call', (r) => r.invocations.length === 0],
      ['no Tortie Door process', (r) => r.nodeServices === 0],
      ['no Tailscale child', (r) => r.tailscaleChildren === 0],
      ['no listener off loopback', (r) => r.listeners.every((l) => l.startsWith('127.0.0.1:') || l.startsWith('[::1]:'))],
      ['the parent\'s listeners', (r) => r.parent === null || r.listeners.length === r.parent.listeners]
    ]
  },
  A2: {
    title: 'Pair pressed: one read of Tailscale, and the lines name the internet',
    clauses: [
      ['a status read with --peers=false', (r) => r.argvs.includes(TAILSCALE_ARGV.status)],
      ['a serve status read', (r) => r.argvs.includes(TAILSCALE_ARGV.serve)],
      ['nothing else asked of Tailscale', (r) => r.argvs.every((a) => a === TAILSCALE_ARGV.status || a === TAILSCALE_ARGV.serve)],
      ['the lines name https://<name>:8443', (r) => r.lines.some((l) => l.includes(`https://${r.name}:8443`))],
      ['the lines name the tailnet', (r) => r.lines.some((l) => l.includes(r.tailnet))],
      ['the lines name the program', (r) => r.lines.some((l) => l.includes(r.program))],
      ['asksApproval', (r) => r.asksApproval === true],
      ['the sheet draws the standing-right warning', (r) => r.sheetText.includes(r.words.rightWarning)],
      ['nothing is listening yet', (r) => r.state !== 'listening' && r.nodeServices === 0]
    ]
  },
  A3: {
    title: 'Allow: the approval face, never pressed; then the code with no other press',
    clauses: [
      ['the child waits on approval', (r) => r.funnelState === 'approval'],
      ['approvalOpens', (r) => r.approvalOpens === true],
      ['approvalText is null', (r) => r.approvalText === null],
      ['Open Tailscale is drawn and enabled', (r) => r.openButton === 'enabled'],
      ['the approval sentence is drawn', (r) => r.approvalSheetText.includes(r.words.approval)],
      ['Open Tailscale was never pressed', (r) => r.openPressed === false],
      ['listening after the approval', (r) => r.stateAfter === 'listening'],
      ['the code shows', (r) => r.codeShown === true],
      ['one press after Pair', (r) => r.pressesAfterPair === 1]
    ]
  },
  A4: {
    title: 'the argv, byte for byte, and the record equal to ps',
    clauses: [
      ['the argv the stand-in received', (r) => J(r.childArgv) === J(expectedFunnelArgv(r.publicPort, r.localPort))],
      ['its target is the door process\'s port', (r) => r.localPort === r.doorPort && r.doorPort > 0],
      ['ps names the same argv', (r) => r.psCommand.endsWith(` ${expectedFunnelArgv(r.publicPort, r.localPort).join(' ')}`)],
      ['the record names the child', (r) => r.record !== null && r.record.pid === r.childPid],
      ['the record\'s command is ps\'s', (r) => r.record !== null && r.record.command === r.psCommand],
      ['the record\'s start time is ps\'s', (r) => r.record !== null && r.record.lstart === r.psLstart],
      ['the record keeps the spawn argv', (r) => r.record !== null && J(r.record.argv) === J([r.program, ...expectedFunnelArgv(r.publicPort, r.localPort)])],
      ['the record is 0600', (r) => r.recordMode === 0o600],
      ['its directory is 0700', (r) => r.dirMode === 0o700]
    ]
  },
  A5: {
    title: 'two phones pair through the forwarder and read with mutual TLS',
    clauses: [
      ['the code reads as v:3 the phone\'s way', (r) => r.offerOk === true],
      ['the code names the public name and port', (r) => r.offerHost === r.name && r.offerPort === 8443],
      ['phone A pairs', (r) => r.pairA === true],
      ['both screens show phone A\'s three-key fingerprint', (r) => r.fingerprintMatches === true],
      ['the certificate names the client key', (r) => r.certOk === true],
      ['phone A reads the list', (r) => r.blocked === 200],
      ['phone A reads a session', (r) => r.session === 200],
      ['the conversation pages back to its first turn', (r) => r.paged === true && r.turns === r.turnCount && r.turnCount > 0],
      ['phone B pairs and reads', (r) => r.pairB === true && r.readB === 200],
      ['no certificate outside a window is closed after the handshake', (r) => r.bare.handshook === true && r.bare.status === 0]
    ]
  },
  A6: {
    title: 'every refusal, in its own words, in the status and the sheet',
    clauses: [
      ['every scenario was driven', (r) => r.rows.length === r.wanted && r.wanted > 0],
      ['every status refusal is the sentence', (r) => r.rows.every((x) => x.refusal === x.sentence)],
      ['every sheet draws the sentence', (r) => r.rows.every((x) => x.sheetShows === true)],
      ['nothing published on a refusal', (r) => r.rows.every((x) => x.published === false)],
      ['no program never falls back', (r) => r.rows.filter((x) => x.scenario === 'no program').every((x) => x.standinCalls === 0 && x.realTailscale === 0)]
    ]
  },
  A7: {
    title: 'Remove ends the child and the door; Allow restarts without the removed pin',
    clauses: [
      ['the child ended at the Remove', (r) => r.childAliveAfterRemove === false],
      ['the door process ended', (r) => r.nodeServicesAfterRemove === 0],
      ['the forwarder went with it', (r) => r.forwarderAnswersAfterRemove === false],
      ['Allow listens again', (r) => r.stateAfterAllow === 'listening'],
      ['a new child', (r) => r.newChild === true],
      ['the removed phone is closed after the handshake', (r) => r.removedRead.handshook === true && r.removedRead.status === 0],
      ['unknown-key is in app.log, once per door process', (r) => r.unknownKeyLines >= 1 && r.unknownKeyLines <= r.doorProcesses],
      ['the other phone reads', (r) => r.otherRead === 200]
    ]
  },
  A8: {
    title: 'a profile switch never restarts: the gate reads changed',
    clauses: [
      ['no funnel start after the exit', (r) => r.funnelStartsAfter === 0],
      ['the gate reads changed', (r) => r.confirmState === 'changed'],
      ['the door is not listening', (r) => r.state !== 'listening'],
      ['the new lines are drawn', (r) => r.sheetText.includes(r.movedTailnet)]
    ]
  },
  A9: {
    title: 'an unexpected exit restarts at the floor, and the phone reads again',
    clauses: [
      ['the status said restarting', (r) => r.sawRestarting === true],
      ['the sheet drew the restarting line', (r) => r.sheetSawRestarting === true],
      ['not before the floor', (r) => r.restartMs >= r.floorMs - 250],
      ['at the floor', (r) => r.restartMs <= r.floorMs + 4_000],
      ['counted: listening again', (r) => r.stateAfter === 'listening'],
      ['the phone reads again', (r) => r.readAfter === 200]
    ]
  },
  A10: {
    title: 'quit ends the child and the door, and the record goes',
    clauses: [
      ['the app quit', (r) => r.exited === true],
      ['the child ended at the quit', (r) => r.childAlive === false],
      ['it ended by SIGINT, its own exit', (r) => r.childHow === 'SIGINT'],
      ['no door process is left', (r) => r.nodeServices === 0],
      ['the record is deleted', (r) => r.recordExists === false]
    ]
  },
  A11: {
    title: 'the orphan: ended at the next launch, the decoy left alone',
    clauses: [
      ['launch A published a recorded child', (r) => r.orphanPid > 0 && r.recordPidA === r.orphanPid],
      ['the child survived the SIGKILL of main', (r) => r.orphanAliveAfterKill === true],
      ['reparented', (r) => r.orphanPpid === 1],
      ['still in the record', (r) => r.recordPidAfterKill === r.orphanPid],
      ['the decoy\'s command is the orphan\'s', (r) => r.decoyCommand === r.orphanCommand && r.decoyCommand !== ''],
      ['the decoy started later', (r) => r.decoyLstart !== r.orphanLstart],
      ['launch B ended the orphan', (r) => r.orphanAliveAfterB === false],
      ['launch B left the decoy', (r) => r.decoyAliveAfterB === true],
      ['launch B started a new child', (r) => r.newChildPid > 0 && r.newChildPid !== r.orphanPid && r.newChildPid !== r.decoyPid],
      ['app.log names the ending', (r) => r.logEnded === true]
    ]
  },
  A12: {
    title: 'both ports held on a first Pair: the sentence and Try again, no lines, and a confirm records nothing',
    clauses: [
      ['the status says ports-taken', (r) => r.refusal === r.sentence],
      ['main says the lines may not be agreed to', (r) => r.confirmable === false && r.publicPort === 0],
      ['the sheet draws the sentence', (r) => r.sheetText.includes(r.sentence)],
      ['the sheet draws no lines and no Allow', (r) => r.confirmBlock === false && r.allowButton === false],
      ['the sheet offers Try again', (r) => r.retryButton === true],
      ['a confirm through the bridge is refused', (r) => r.confirmAllowed === false],
      ['nothing was agreed to', (r) => r.confirmStateAfter === 'never'],
      ['nothing started', (r) => r.funnelStarts === 0 && r.nodeServices === 0]
    ]
  },
  A13: {
    title: 'the door process’s environment is its own: one variable, nothing of main’s',
    clauses: [
      ['the door process was found', (r) => r.doorPid > 0],
      [
        'a sibling of the door reads main’s environment (the control)',
        (r) => r.controlPid > 0 && r.controlPid !== r.mainPid && r.controlPid !== r.doorPid && r.controlPpid === r.doorPpid && r.controlIsNetworkService === true && r.controlHasMarker === true
      ],
      ['the door holds its own variable', (r) => r.doorHasOwn === true],
      ['no HOME in the door', (r) => r.doorHasHome === false],
      ['no variable only main was given', (r) => r.doorHasMarker === false],
      ['no GMUX_TAILSCALE_BIN in the door', (r) => r.doorHasTailscaleBin === false]
    ]
  },
  RUN: {
    title: 'no real Tailscale, nothing forbidden, nothing left',
    clauses: [
      ['the preflight passed', (r) => r.preflight === true],
      ['no real Tailscale in any sample', (r) => r.realTailscale === 0 && r.samples > 0],
      ['no forbidden argv reached the stand-in', (r) => r.forbidden === 0],
      ['no refused argv reached the stand-in', (r) => r.refusedArgv === 0],
      ['no stand-in process is left', (r) => r.standinLeft === 0],
      ['no Electron of this run is left', (r) => r.electronLeft === 0],
      // PHASE 332: the name check asked the loopback stand-in and nothing else.
      ['the DNS preflight passed at every launch', (r) => r.dnsPreflights.length > 0 && r.dnsPreflights.every((p) => p === true)],
      ['the quiet agents held at every launch', (r) => r.agentsHeld.length > 0 && r.agentsHeld.every((p) => p === true)],
      ['every name question was A, RD 0, for the stand-in’s name', (r) => nameQuestionsVerdict(r.nameQuestions).ok]
    ]
  }
};

/** Grade one arm's reading. */
export function grade(id, reading) {
  const g = GRADERS[id];
  const failed = [];
  for (const [name, predicate] of g.clauses) {
    let ok = false;
    try {
      ok = predicate(reading) === true;
    } catch {
      ok = false;
    }
    if (!ok) failed.push(name);
  }
  return { ok: failed.length === 0, failed };
}

const W = wordsFrom('', '', '');
const FIX_NAME = 'p330-mac.tail00000.ts.net';

/** A passing reading per arm, and one break per clause. */
export const GRADER_FIXTURES = {
  A1: {
    pass: { invocations: [], nodeServices: 0, tailscaleChildren: 0, listeners: ['127.0.0.1:51234'], parent: { listeners: 1 } },
    breaks: {
      'no stand-in call': (r) => void (r.invocations = [{ argv: ['status', '--json', '--peers=false'] }]),
      'no Tortie Door process': (r) => void (r.nodeServices = 1),
      'no Tailscale child': (r) => void (r.tailscaleChildren = 1),
      'no listener off loopback': (r) => void (r.listeners = ['0.0.0.0:8443']),
      'the parent\'s listeners': (r) => void (r.listeners = ['127.0.0.1:51234', '127.0.0.1:8443'])
    }
  },
  A2: {
    pass: {
      argvs: [TAILSCALE_ARGV.status, TAILSCALE_ARGV.serve],
      lines: [`Answers on the internet at https://${FIX_NAME}:8443, through Tailscale Funnel on standin@example.com`, 'Publishes it with /private/tmp/p/standin/tailscale'],
      name: FIX_NAME,
      tailnet: 'standin@example.com',
      program: '/private/tmp/p/standin/tailscale',
      asksApproval: true,
      sheetText: `Allow ${W.rightWarning}`,
      words: W,
      state: 'opening',
      nodeServices: 0
    },
    breaks: {
      'a status read with --peers=false': (r) => void (r.argvs = [J(['status', '--json']), TAILSCALE_ARGV.serve]),
      'a serve status read': (r) => void (r.argvs = [TAILSCALE_ARGV.status]),
      'nothing else asked of Tailscale': (r) => void r.argvs.push(J(['funnel', '--tcp=8443', '--proxy-protocol=2', 'tcp://127.0.0.1:1'])),
      'the lines name https://<name>:8443': (r) => void (r.lines = r.lines.map((l) => l.replace(':8443', ':10000'))),
      'the lines name the tailnet': (r) => void (r.lines = r.lines.map((l) => l.replace('standin@example.com', 'another'))),
      'the lines name the program': (r) => void (r.lines = r.lines.map((l) => l.replace('/private/tmp/p/standin/tailscale', '/Applications/Tailscale.app/Contents/MacOS/Tailscale'))),
      asksApproval: (r) => void (r.asksApproval = false),
      'the sheet draws the standing-right warning': (r) => void (r.sheetText = 'Allow'),
      'nothing is listening yet': (r) => void (r.state = 'listening')
    }
  },
  A3: {
    pass: { funnelState: 'approval', approvalOpens: true, approvalText: null, openButton: 'enabled', approvalSheetText: W.approval, words: W, openPressed: false, stateAfter: 'listening', codeShown: true, pressesAfterPair: 1 },
    breaks: {
      'the child waits on approval': (r) => void (r.funnelState = 'starting'),
      approvalOpens: (r) => void (r.approvalOpens = false),
      'approvalText is null': (r) => void (r.approvalText = 'https://login.tailscale.com/f/funnel?node=nMADEUP'),
      'Open Tailscale is drawn and enabled': (r) => void (r.openButton = 'disabled'),
      'the approval sentence is drawn': (r) => void (r.approvalSheetText = ''),
      'Open Tailscale was never pressed': (r) => void (r.openPressed = true),
      'listening after the approval': (r) => void (r.stateAfter = 'opening'),
      'the code shows': (r) => void (r.codeShown = false),
      'one press after Pair': (r) => void (r.pressesAfterPair = 2)
    }
  },
  A4: {
    pass: {
      childArgv: expectedFunnelArgv(8443, 50123),
      publicPort: 8443,
      localPort: 50123,
      doorPort: 50123,
      psCommand: `/usr/local/bin/node /r/build/p330/tailscale-standin.mjs ${expectedFunnelArgv(8443, 50123).join(' ')}`,
      childPid: 4242,
      program: '/private/tmp/p/standin/tailscale',
      psLstart: 'Tue Sep 29 12:00:00 2026',
      record: { pid: 4242, command: `/usr/local/bin/node /r/build/p330/tailscale-standin.mjs ${expectedFunnelArgv(8443, 50123).join(' ')}`, lstart: 'Tue Sep 29 12:00:00 2026', argv: ['/private/tmp/p/standin/tailscale', ...expectedFunnelArgv(8443, 50123)] },
      recordMode: 0o600,
      dirMode: 0o700
    },
    breaks: {
      'the argv the stand-in received': (r) => void (r.childArgv = ['funnel', '--bg', '--tcp=8443', 'tcp://127.0.0.1:50123']),
      'its target is the door process\'s port': (r) => void (r.doorPort = 50124),
      'ps names the same argv': (r) => void (r.psCommand = '/usr/local/bin/node /r/build/p330/tailscale-standin.mjs funnel --tcp=8443 tcp://127.0.0.1:50123'),
      'the record names the child': (r) => void (r.record = { ...r.record, pid: 4243 }),
      'the record\'s command is ps\'s': (r) => void (r.record = { ...r.record, command: '/bin/sh /private/tmp/p/standin/tailscale funnel' }),
      'the record\'s start time is ps\'s': (r) => void (r.record = { ...r.record, lstart: 'Tue Sep 29 12:00:01 2026' }),
      'the record keeps the spawn argv': (r) => void (r.record = { ...r.record, argv: ['tailscale', ...expectedFunnelArgv(8443, 50123)] }),
      'the record is 0600': (r) => void (r.recordMode = 0o644),
      'its directory is 0700': (r) => void (r.dirMode = 0o755)
    }
  },
  A5: {
    pass: { offerOk: true, offerHost: FIX_NAME, offerPort: 8443, name: FIX_NAME, pairA: true, fingerprintMatches: true, certOk: true, blocked: 200, session: 200, paged: true, turns: 12, turnCount: 12, pairB: true, readB: 200, bare: { handshook: true, status: 0 } },
    breaks: {
      'the code reads as v:3 the phone\'s way': (r) => void (r.offerOk = false),
      'the code names the public name and port': (r) => void (r.offerPort = 10000),
      'phone A pairs': (r) => void (r.pairA = false),
      'both screens show phone A\'s three-key fingerprint': (r) => void (r.fingerprintMatches = false),
      'the certificate names the client key': (r) => void (r.certOk = false),
      'phone A reads the list': (r) => void (r.blocked = 404),
      'phone A reads a session': (r) => void (r.session = 0),
      'the conversation pages back to its first turn': (r) => void (r.turns = 10),
      'phone B pairs and reads': (r) => void (r.readB = 404),
      'no certificate outside a window is closed after the handshake': (r) => void (r.bare = { handshook: true, status: 404 })
    }
  },
  A6: {
    pass: {
      wanted: 2,
      rows: [
        { scenario: 'shields-up', refusal: W.sentence('shields-up', 8443), sentence: W.sentence('shields-up', 8443), sheetShows: true, published: false, standinCalls: 3, realTailscale: 0 },
        { scenario: 'no program', refusal: W.sentence('override-unusable', 8443), sentence: W.sentence('override-unusable', 8443), sheetShows: true, published: false, standinCalls: 0, realTailscale: 0 }
      ]
    },
    breaks: {
      'every scenario was driven': (r) => void r.rows.pop(),
      'every status refusal is the sentence': (r) => void (r.rows[0].refusal = W.sentence('failed', 8443)),
      'every sheet draws the sentence': (r) => void (r.rows[0].sheetShows = false),
      'nothing published on a refusal': (r) => void (r.rows[0].published = true),
      'no program never falls back': (r) => void (r.rows[1].realTailscale = 1)
    }
  },
  A7: {
    pass: { childAliveAfterRemove: false, nodeServicesAfterRemove: 0, forwarderAnswersAfterRemove: false, stateAfterAllow: 'listening', newChild: true, removedRead: { handshook: true, status: 0 }, unknownKeyLines: 1, doorProcesses: 2, otherRead: 200 },
    breaks: {
      'the child ended at the Remove': (r) => void (r.childAliveAfterRemove = true),
      'the door process ended': (r) => void (r.nodeServicesAfterRemove = 1),
      'the forwarder went with it': (r) => void (r.forwarderAnswersAfterRemove = true),
      'Allow listens again': (r) => void (r.stateAfterAllow = 'refused'),
      'a new child': (r) => void (r.newChild = false),
      'the removed phone is closed after the handshake': (r) => void (r.removedRead = { handshook: true, status: 404 }),
      'unknown-key is in app.log, once per door process': (r) => void (r.unknownKeyLines = 0),
      'the other phone reads': (r) => void (r.otherRead = 0)
    }
  },
  A8: {
    pass: { funnelStartsAfter: 0, confirmState: 'changed', state: 'refused', sheetText: 'Answers on the internet … through Tailscale Funnel on moved@example.com', movedTailnet: 'moved@example.com' },
    breaks: {
      'no funnel start after the exit': (r) => void (r.funnelStartsAfter = 1),
      'the gate reads changed': (r) => void (r.confirmState = 'confirmed'),
      'the door is not listening': (r) => void (r.state = 'listening'),
      'the new lines are drawn': (r) => void (r.sheetText = 'standin@example.com')
    }
  },
  A9: {
    pass: { sawRestarting: true, sheetSawRestarting: true, restartMs: 2_150, floorMs: 2_000, stateAfter: 'listening', readAfter: 200 },
    breaks: {
      'the status said restarting': (r) => void (r.sawRestarting = false),
      'the sheet drew the restarting line': (r) => void (r.sheetSawRestarting = false),
      'not before the floor': (r) => void (r.restartMs = 200),
      'at the floor': (r) => void (r.restartMs = 20_000),
      'counted: listening again': (r) => void (r.stateAfter = 'opening'),
      'the phone reads again': (r) => void (r.readAfter = 0)
    }
  },
  A10: {
    pass: { exited: true, childAlive: false, childHow: 'SIGINT', nodeServices: 0, recordExists: false },
    breaks: {
      'the app quit': (r) => void (r.exited = false),
      'the child ended at the quit': (r) => void (r.childAlive = true),
      'it ended by SIGINT, its own exit': (r) => void (r.childHow = 'SIGKILL'),
      'no door process is left': (r) => void (r.nodeServices = 1),
      'the record is deleted': (r) => void (r.recordExists = true)
    }
  },
  A11: {
    pass: {
      orphanPid: 100,
      recordPidA: 100,
      orphanAliveAfterKill: true,
      orphanPpid: 1,
      recordPidAfterKill: 100,
      orphanCommand: 'node standin.mjs funnel --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:5',
      decoyCommand: 'node standin.mjs funnel --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:5',
      orphanLstart: 'Tue Sep 29 12:00:00 2026',
      decoyLstart: 'Tue Sep 29 12:01:00 2026',
      decoyPid: 200,
      orphanAliveAfterB: false,
      decoyAliveAfterB: true,
      newChildPid: 300,
      logEnded: true
    },
    breaks: {
      'launch A published a recorded child': (r) => void (r.recordPidA = 99),
      'the child survived the SIGKILL of main': (r) => void (r.orphanAliveAfterKill = false),
      reparented: (r) => void (r.orphanPpid = 50),
      'still in the record': (r) => void (r.recordPidAfterKill = null),
      'the decoy\'s command is the orphan\'s': (r) => void (r.decoyCommand = 'node standin.mjs funnel --tcp=10000'),
      'the decoy started later': (r) => void (r.decoyLstart = r.orphanLstart),
      'launch B ended the orphan': (r) => void (r.orphanAliveAfterB = true),
      'launch B left the decoy': (r) => void (r.decoyAliveAfterB = false),
      'launch B started a new child': (r) => void (r.newChildPid = r.decoyPid),
      'app.log names the ending': (r) => void (r.logEnded = false)
    }
  },
  A12: {
    pass: {
      refusal: W.sentence('ports-taken', 0),
      sentence: W.sentence('ports-taken', 0),
      confirmable: false,
      publicPort: 0,
      sheetText: `Let my phone reach this Mac ${W.sentence('ports-taken', 0)} Try again`,
      confirmBlock: false,
      allowButton: false,
      retryButton: true,
      confirmAllowed: false,
      confirmStateAfter: 'never',
      funnelStarts: 0,
      nodeServices: 0
    },
    breaks: {
      'the status says ports-taken': (r) => void (r.refusal = 'Read what it answers, then allow it.'),
      'main says the lines may not be agreed to': (r) => void (r.confirmable = true),
      'the sheet draws the sentence': (r) => void (r.sheetText = 'Read what it answers, then allow it. Allow'),
      'the sheet draws no lines and no Allow': (r) => void (r.allowButton = true),
      'the sheet offers Try again': (r) => void (r.retryButton = false),
      'a confirm through the bridge is refused': (r) => void (r.confirmAllowed = true),
      'nothing was agreed to': (r) => void (r.confirmStateAfter = 'confirmed'),
      'nothing started': (r) => void (r.nodeServices = 1)
    }
  },
  A13: {
    pass: {
      doorPid: 4343,
      doorPpid: 4300,
      mainPid: 4300,
      controlPid: 4310,
      controlPpid: 4300,
      controlIsNetworkService: true,
      controlHasMarker: true,
      doorHasOwn: true,
      doorHasHome: false,
      doorHasMarker: false,
      doorHasTailscaleBin: false
    },
    breaks: {
      'the door process was found': (r) => void (r.doorPid = 0),
      'a sibling of the door reads main’s environment (the control)': (r) => void (r.controlHasMarker = false),
      'the door holds its own variable': (r) => void (r.doorHasOwn = false),
      'no HOME in the door': (r) => void (r.doorHasHome = true),
      'no variable only main was given': (r) => void (r.doorHasMarker = true),
      'no GMUX_TAILSCALE_BIN in the door': (r) => void (r.doorHasTailscaleBin = true)
    },
    // Readings that must NOT be accepted as the control, each red on the
    // clause named. Main renames itself `Tortie` and empties its own
    // environment (the reverify, 2026-09-29), so a control read from main is
    // no control, whether it reads empty (as it does) or not.
    refused: [
      {
        what: 'a control read from main after the rename, its environment emptied',
        clause: 'a sibling of the door reads main’s environment (the control)',
        edit: (r) => void Object.assign(r, { controlPid: r.mainPid, controlPpid: 1, controlIsNetworkService: false, controlHasMarker: false })
      },
      {
        what: 'a control read from main that still showed the marker',
        clause: 'a sibling of the door reads main’s environment (the control)',
        edit: (r) => void Object.assign(r, { controlPid: r.mainPid, controlPpid: 1, controlIsNetworkService: false, controlHasMarker: true })
      }
    ]
  },
  RUN: {
    pass: {
      preflight: true,
      realTailscale: 0,
      samples: 40,
      forbidden: 0,
      refusedArgv: 0,
      standinLeft: 0,
      electronLeft: 0,
      dnsPreflights: [true],
      agentsHeld: [true],
      nameQuestions: { expect: true, rows: [{ at: 1, rd: 0, qtype: 1, qname: FIX_NAME, answered: 'record' }], name: FIX_NAME }
    },
    breaks: {
      'the preflight passed': (r) => void (r.preflight = false),
      'no real Tailscale in any sample': (r) => void (r.realTailscale = 1),
      'no forbidden argv reached the stand-in': (r) => void (r.forbidden = 1),
      'no refused argv reached the stand-in': (r) => void (r.refusedArgv = 1),
      'no stand-in process is left': (r) => void (r.standinLeft = 1),
      'no Electron of this run is left': (r) => void (r.electronLeft = 1),
      'the DNS preflight passed at every launch': (r) => void (r.dnsPreflights = [true, false]),
      'the quiet agents held at every launch': (r) => void (r.agentsHeld = [false]),
      'every name question was A, RD 0, for the stand-in’s name': (r) => void (r.nameQuestions.rows[0].rd = 1)
    }
  }
};

/** A fixture's reading, cloned, with its words (which carry a function) handed across whole. */
function cloneReading(pass) {
  const { words, ...rest } = pass;
  const r = structuredClone(rest);
  if (words !== undefined) r.words = words;
  return r;
}

function graderSelfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  const clauses = gradeFixtures({ graders: GRADERS, fixtures: GRADER_FIXTURES, grade, clone: cloneReading, say, J });
  // The word readers, over their own texts.
  const src = "export const X =\n  'a b ' +\n  \"c’d\";\nexport const T: Readonly<Record<W, string>> = {\n  'port-taken':\n    'port PORT ' + 'taken',\n  busy: 'Try again.',\n  unreadable: `no`\n};\n";
  say(stringConst(src, 'X') === 'a b c’d', `stringConst reads a concatenation (${J(stringConst(src, 'X'))})`);
  const t = sentenceTable(src, 'T');
  say(t['port-taken'] === 'port PORT taken' && t.busy === 'Try again.' && t.unreadable === 'no', `sentenceTable reads quoted and bare keys (${J(t)})`);
  const w = wordsFrom(src.replace('T:', 'POCKET_FUNNEL_SENTENCES:'), '', 'const FUNNEL_RESTART_FLOOR_MS = 2_000;');
  say(w.sentence('port-taken', 10000) === 'port 10000 taken' && w.from['sentence:busy'] === 'source' && w.from['sentence:no-name'] === 'spec' && w.floorMs === 2000, 'wordsFrom takes the source first and names the spec fallback');
  say(nameQuestionsSelfTest(FIX_NAME, (line) => process.stdout.write(`  ${line}\n`)), 'the Phase 332 name-question clause grades its own cases');
  process.stdout.write(failures === 0 ? `[p330] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown to go red on its own break.\n` : `[p330] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

if (process.argv.includes('--grader-self-test')) {
  process.exit(graderSelfTest() ? 0 : 1);
}

// ===========================================================================
// THE RUN. Everything below starts processes; builders never reach it.
// ===========================================================================

const CHECKOUT = resolve((process.env['P330_PARENT_CHECKOUT'] ?? '').trim() || ROOT);
const AT_PARENT = CHECKOUT !== ROOT;
const TAG = `[p330 ${AT_PARENT ? 'parent' : 'head'}]`;
const say = (line) => console.log(`${TAG} ${line}`);
const ARMS = new Set(((process.env['P330_ARMS'] ?? '').trim() || (AT_PARENT ? '1' : '1,2,3,4,5,6,7,8,9,10,11,12,13')).split(',').map((s) => s.trim()));
const KEEP = (process.env['P330_KEEP'] ?? '') === '1';

if (!existsSync(join(CHECKOUT, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} ${CHECKOUT} has no build at out/main/index.js. Run npm run build there first.`);
  process.exit(2);
}

const sourceOf = (file) => {
  const path = join(CHECKOUT, file);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
};
const WORDS = wordsFrom(sourceOf('src/shared/ipc/pocket.ts'), sourceOf('src/renderer/settings/PhoneSection.tsx'), sourceOf('src/main/pocket/funnel.ts'));
const FUNNEL_SRC = sourceOf('src/main/pocket/funnel.ts');

const RUN = resolve((process.env['P330_RUN'] ?? '').trim() || `/private/tmp/p330-probe-${String(process.pid)}`);
if (!RUN.startsWith('/private/tmp/')) {
  console.error(`${TAG} the scratch world must be under /private/tmp; ${RUN} is not`);
  process.exit(2);
}
const HOME = join(RUN, 'home');
const HARNESS = join(RUN, 'harness');
const PROFILE = join(HARNESS, 'profile');
const PROJECT = join(RUN, 'project');
const BIN = join(HOME, '.local', 'bin');
/** OUTSIDE the profile, so the helper's profile sweep never takes the stand-in's children for the app's. */
const STANDIN_DIR = join(RUN, 'standin');
const SOCKET = `gmux-p330-${String(process.pid)}`;
const RECORD = join(PROFILE, 'gmux', 'pocket-funnel', 'record.json');
const APP_LOG = join(PROFILE, 'logs', 'app.log');
const TALK_SID = join(RUN, 'talk-sid');
const STOP = join(RUN, 'fake-stop');
const STORE_SRC = join(ROOT, 'docs/research/assets/63-fixtures/claude-session.jsonl');
const FIXTURE_SID = '11111111-2222-4333-8444-555555555555';
const FIXTURE_CWD = '/Users/dev/demo-app';
const NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const TAILNET = DEFAULT_SCENARIO.tailnet;
const MOVED = 'moved@example.com';

const report = { checkout: CHECKOUT, atParent: AT_PARENT, arms: [], readings: {}, words: WORDS.from };
let failures = 0;
let unreadable = 0;
function arm(id, reading) {
  const g = grade(id, reading);
  const said = g.ok ? GRADERS[id].title : `${GRADERS[id].title}; FAILED ${J(g.failed)}`;
  report.arms.push({ id, ok: g.ok, failed: g.failed, said });
  report.readings[id] = reading;
  if (!g.ok) failures += 1;
  say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${said}`);
}
function cannotRead(id, why) {
  unreadable += 1;
  report.arms.push({ id, ok: null, said: why });
  say(`UNREADABLE ${id}: ${why}`);
}

// ---------------------------------------------------------------------------
// Process readings
// ---------------------------------------------------------------------------

function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === 'EPERM';
  }
}
const psOne = (pid, field, env = {}) => (spawnSync('/bin/ps', ['-ww', '-p', String(pid), '-o', `${field}=`], { encoding: 'utf8', env: { ...process.env, ...env } }).stdout ?? '').trim();
const lstartOf = (pid) => psOne(pid, 'lstart', { LC_ALL: 'C', TZ: 'UTC0' });
const commandOf = (pid) => psOne(pid, 'command');
/**
 * A process's command line WITH its environment (`ps -E`), macOS's own
 * spelling: the variables follow the arguments, space separated. Read only
 * for this run's app and its door process.
 */
const environmentOf = (pid) => (spawnSync('/bin/ps', ['-E', '-ww', '-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
const hasVariable = (line, name) => new RegExp(`(?:^|\\s)${name}=`).test(line);
/** The variable this probe gives MAIN alone, which the door must not hold. */
const MAIN_MARKER = 'P330_MAIN_MARKER';
const ppidOf = (pid) => Number(psOne(pid, 'ppid')) || 0;

/** Every descendant of `root`, from one read of the table. */
function descendantsOf(root, rows = processRows()) {
  const kids = new Map();
  for (const r of rows) {
    if (!kids.has(r.ppid)) kids.set(r.ppid, []);
    kids.get(r.ppid).push(r);
  }
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const p = stack.pop();
    for (const r of kids.get(p) ?? []) {
      out.push(r);
      stack.push(r.pid);
    }
  }
  return out;
}
/** Tortie's own utility processes: Electron's spelling for a `utilityProcess` (the verifier confirms it). */
const doorProcessesOf = (appPid) => descendantsOf(appPid).filter((r) => r.command.includes('--utility-sub-type=node.mojom.NodeService'));
const tailscaleChildrenOf = (appPid) => descendantsOf(appPid).filter((r) => r.command.includes('tailscale-standin.mjs') || realTailscaleIn([r], []).length > 0 || /\/tailscale(\s|$)/.test(r.command));

/** Listening TCP sockets of these pids, as `addr:port`. */
function listenersOf(pids) {
  if (pids.length === 0) return [];
  const r = spawnSync('/usr/sbin/lsof', ['-nP', '-a', '-p', pids.join(','), '-iTCP', '-sTCP:LISTEN', '-Fn'], { encoding: 'utf8' });
  return [...new Set((r.stdout ?? '').split('\n').filter((l) => l.startsWith('n')).map((l) => l.slice(1)))];
}
const devtoolsPort = () => {
  try {
    return Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
  } catch {
    return 0;
  }
};
const appListeners = (appPid) => listenersOf([appPid, ...descendantsOf(appPid).map((r) => r.pid)]).filter((l) => !l.endsWith(`:${String(devtoolsPort())}`));

function tcpAnswers(port) {
  return new Promise((done) => {
    if (!Number.isInteger(port) || port <= 0) return done(false);
    const s = netConnect({ host: '127.0.0.1', port });
    const finish = (v) => {
      s.destroy();
      done(v);
    };
    s.setTimeout(2_000, () => finish(false));
    s.once('connect', () => finish(true));
    s.once('error', () => finish(false));
  });
}

const readRecord = () => {
  try {
    return JSON.parse(readFileSync(RECORD, 'utf8'));
  } catch {
    return null;
  }
};
const modeOf = (path) => {
  try {
    return statSync(path).mode & 0o777;
  } catch {
    return null;
  }
};
const appLog = () => {
  try {
    return readFileSync(APP_LOG, 'utf8');
  } catch {
    return '';
  }
};

// ---------------------------------------------------------------------------
// The app, its main window and its Settings window
// ---------------------------------------------------------------------------

const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));

async function targets() {
  const port = devtoolsPort();
  if (!(port > 0)) return [];
  try {
    return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
  } catch {
    return [];
  }
}
async function attachMain(timeoutMs = 150_000) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    const picked = pickRendererTarget(await targets());
    if (picked.target !== null) {
      const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
      await cdp.call('Runtime.enable');
      for (let i = 0; i < 200; i += 1) {
        // The harness drives (GMUX_PROBES=1) arm a moment after the bridge;
        // the sessions this run makes are made through them.
        if ((await cdpEval(cdp, 'window.gmux !== undefined && window.gmux.pocket !== undefined && window.__gmuxP93 !== undefined && window.__gmuxP202 !== undefined')) === true) {
          // NO AGENT STARTS (Phase 332): the renamed rows must read not installed.
          const held = quietAgentsHeld(JSON.parse(await cdpEval(cdp, 'window.gmux.agentsList().then((r) => JSON.stringify(r))')));
          agentsHeld.push(held.ok);
          if (!held.ok) throw new Error(`agents:list says the renamed agents are not all absent: ${held.problems.join('; ')}`);
          return cdp;
        }
        await sleep(300);
      }
      throw new Error('the app never armed window.gmux.pocket');
    }
    why = picked.why;
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}
async function attachSettings(main, timeoutMs = 30_000) {
  await cdpEval(main, 'window.gmux.openSettings().then(() => true)');
  const started = Date.now();
  for (;;) {
    const t = (await targets()).find((x) => x.type === 'page' && /\/renderer\/settings\/index\.html/.test(String(x.url)) && typeof x.webSocketDebuggerUrl === 'string');
    if (t !== undefined) {
      const cdp = await wsConnect(t.webSocketDebuggerUrl);
      await cdp.call('Runtime.enable');
      await cdpEval(cdp, "(() => { location.hash = 'phone'; return true; })()");
      for (let i = 0; i < 100; i += 1) {
        if ((await cdpEval(cdp, `document.querySelector('section[aria-label="Phone"]') !== null`)) === true) return cdp;
        await sleep(200);
      }
      throw new Error('Settings opened and never drew the Phone section');
    }
    if (Date.now() - started > timeoutMs) throw new Error('no Settings window');
    await sleep(300);
  }
}
/** The Phone section's text and buttons. */
async function sheet(settings) {
  return JSON.parse(
    await cdpEval(
      settings,
      `(() => { const s = document.querySelector('section[aria-label="Phone"]'); if (s === null) return JSON.stringify({ text: '', buttons: [] }); return JSON.stringify({ text: s.innerText, buttons: [...s.querySelectorAll('button')].map((b) => ({ text: b.innerText.trim(), disabled: b.disabled })) }); })()`
    )
  );
}
/** Press the Phone section's button whose words are exactly `label` (within `scope` when given). */
async function press(settings, label, scope = null) {
  return (
    (await cdpEval(
      settings,
      `(() => { const root = ${scope === null ? `document.querySelector('section[aria-label="Phone"]')` : `document.querySelector(${J(scope)})`}; if (root === null) return false; const b = [...root.querySelectorAll('button')].find((x) => x.innerText.trim() === ${J(label)} && !x.disabled); if (b === undefined) return false; b.click(); return true; })()`
    )) === true
  );
}
async function pocket(cdp, method, arg) {
  const call = arg === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${J(arg)})`;
  return JSON.parse(
    await cdpEval(cdp, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`)
  );
}
async function waitStatus(cdp, test, ms) {
  const started = Date.now();
  let last = null;
  for (;;) {
    const got = await pocket(cdp, 'status');
    last = got.ok ? got.value : null;
    if (last !== null && test(last)) return { ok: true, status: last };
    if (Date.now() - started >= ms) return { ok: false, status: last };
    await sleep(250);
  }
}
async function waitFor(test, ms, every = 200) {
  const started = Date.now();
  for (;;) {
    const v = await test();
    if (v) return true;
    if (Date.now() - started >= ms) return false;
    await sleep(every);
  }
}
/**
 * THE LINES ARE READY TO AGREE TO (the fix round). The first build graded A2
 * and pressed Allow on the status the switch answered with, before the read
 * landed: `confirmLines` is never empty, and over empty fields it reads
 * `https://:0`. So this waits for main's own `confirmable`, the public name in
 * the first line, and a read that is no longer under way.
 */
const linesReady = (name) => (s) =>
  s.confirmable === true &&
  s.state !== 'opening' &&
  s.publicName === name &&
  s.confirmState !== 'confirmed' &&
  s.confirmLines.some((l) => l.includes(`https://${name}:${String(s.publicPort)}`));
/** Is the confirm block drawn, and is its Allow pressable? */
async function confirmFace(settings) {
  return JSON.parse(
    await cdpEval(
      settings,
      `(() => { const c = document.querySelector('[data-phone-confirm]'); const a = document.querySelector('[data-phone-action="confirm-door"]'); const r = document.querySelector('[data-phone-action="retry-door"]'); return JSON.stringify({ block: c !== null, allow: a !== null, allowEnabled: a !== null && !a.disabled, retry: r !== null }); })()`
    )
  );
}
/**
 * Press the SHEET's Allow for the door, once its lines are ready and its
 * button is enabled. False when it never was: the caller says so rather than
 * grading what happened next.
 */
async function allowDoor(settings, main, name, ms = 20_000) {
  const ready = await waitStatus(main, linesReady(name), ms);
  if (!ready.ok) return false;
  if (!(await waitFor(async () => (await confirmFace(settings)).allowEnabled, 10_000))) return false;
  return press(settings, 'Allow', '[data-phone-confirm]');
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

let standin = null;
let dns = null;
const dnsPreflights = [];
const agentsHeld = [];
let watch = null;
let decoy = null;
let lastShim = 0;
let lastApp = 0;
let preflightOk = false;
const launches = [];

function launchOptions(label) {
  return {
    label,
    userDataDir: PROFILE,
    cwd: CHECKOUT,
    tmuxSocket: SOCKET,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({
      ...INHERITED_CLAUDE,
      HOME,
      GMUX_TMUX_SOCKET: SOCKET,
      GMUX_PROBES: '1',
      GMUX_LOG_FILE: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_CONFIG_ROOT: join(PROFILE, 'gmux', 'config'),
      GMUX_HARNESS_DIR: HARNESS,
      // THE STAND-IN. A development build honours this and runs it; a packaged
      // one ignores it, which is why no packaged Tortie is ever launched here.
      GMUX_TAILSCALE_BIN: standin.binPath,
      // THE DNS STAND-IN (Phase 332), in this process on 127.0.0.1: the name
      // check asks it and nothing else. A parent build ignores the variable.
      [NAME_SERVERS_VAR]: dns.servers,
      P330_TALK_SID: TALK_SID,
      [MAIN_MARKER]: '1',
      P330_STOP: STOP,
      P330_STORE: STORE_SRC
    }),
    graceMs: 8_000,
    ceilingMs: 1_800_000
  };
}

/** One launch through the helper, the pids recorded whatever happened. */
async function launch(label, body) {
  const pre = preflightStandin(standin, standin.binPath);
  if (!pre.ok) throw new Error(`the preflight refused the launch: ${pre.problems.join('; ')}`);
  // Phase 332: the name check's servers are the loopback stand-in's, or nothing launches.
  const value = launchOptions(label).env[NAME_SERVERS_VAR];
  const dnsPre = await dns.preflight(value);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(value));
  if (!dnsPre.ok) throw new Error(`the DNS preflight refused the launch: ${dnsPre.problems.join('; ')}`);
  writeQuietAgents(PROFILE);
  return withElectron(launchOptions(label), async (handle) => {
    lastShim = handle.pid;
    const rec = { label, shim: handle.pid, app: 0 };
    launches.push(rec);
    try {
      await body(handle, () => {
        try {
          rec.app = handle.appPid();
        } catch {
          /* not up yet */
        }
        lastApp = rec.app;
        return rec.app;
      });
    } finally {
      try {
        rec.app = rec.app || handle.appPid();
      } catch {
        /* gone */
      }
      lastApp = rec.app;
      rec.text = handle.text();
    }
  });
}

const liveFunnels = () => standin.readFunnel();
const funnelStarts = (fromIndex) => standin.readLog().slice(fromIndex).filter((e) => e.kind === 'funnel' && e.role !== 'decoy');
const standinArgvs = (fromIndex) => standin.readLog().slice(fromIndex).filter((e) => Array.isArray(e.argv)).map((e) => J(e.argv));

try {
  // ---- the world ----------------------------------------------------------
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, HARNESS, PROFILE, PROJECT, BIN]) mkdirSync(dir, { recursive: true });
  standin = makeStandin({ dir: STANDIN_DIR, scenario: { ...DEFAULT_SCENARIO } });
  const pre = preflightStandin(standin, standin.binPath);
  preflightOk = pre.ok;
  if (!pre.ok) throw new Error(`the preflight refused: ${pre.problems.join('; ')}`);
  // Phase 332: the zone's servers, answering the stand-in's name at once.
  dns = await makeDnsStandin({ name: NAME, mode: 'record' });
  // Sampled every second for the whole run, rooted at whichever app is up.
  watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });

  // The fake claude: plants the committed transcript for its session and waits.
  writeFileSync(
    join(BIN, 'claude'),
    `#!/bin/sh
# probe:p330. Not Claude Code. It plants a committed transcript and waits.
case "$1" in -v|--version) echo "2.1.238 (Claude Code)"; exit 0;; esac
sid=""; prev=""
for a in "$@"; do
  if [ "$prev" = "--session-id" ] || [ "$prev" = "--resume" ]; then sid="$a"; fi
  prev="$a"
done
if [ -n "$sid" ]; then
  slug=$(printf '%s' "$PWD" | sed 's|[^a-zA-Z0-9]|-|g')
  d="$HOME/.claude/projects/$slug"
  mkdir -p "$d"
  [ -f "$d/$sid.jsonl" ] || sed -e "s|${FIXTURE_SID}|$sid|g" -e "s|${FIXTURE_CWD}|$PWD|g" "$P330_STORE" > "$d/$sid.jsonl"
  printf '%s\\n' "$sid" > "$P330_TALK_SID"
fi
while [ ! -f "$P330_STOP" ]; do sleep 1; done
exit 0
`,
    'utf8'
  );
  chmodSync(join(BIN, 'claude'), 0o755);
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  const git = (args) => spawnSync('git', args, { cwd: PROJECT, encoding: 'utf8', env: { ...process.env, HOME } });
  git(['init', '-q']);
  writeFileSync(join(PROJECT, 'note.txt'), 'hello\n');
  git(['add', '-A']);
  git(['-c', 'user.email=p@x', '-c', 'user.name=p', 'commit', '-qm', 'seed']);

  let phoneA = null;
  let phoneB = null;
  let door = null;

  // ======================================================================
  // LAUNCH 1 — arms 1 to 10
  // ======================================================================
  await launch('p330-order', async (handle, appPidNow) => {
    const main = await attachMain();
    let settings = null;
    try {
      appPidNow();
      await cdpEval(main, `window.__gmuxP93 !== undefined ? window.__gmuxP93.setup(${J({ path: PROJECT, names: ['p330-shell'] })}).then(() => true) : false`).catch(() => false);
      await cdpEval(main, "window.__gmuxP202 !== undefined ? window.__gmuxP202.createSession('p330-talk', 'claude').then(() => true).catch(() => false) : false").catch(() => false);
      settings = await attachSettings(main);
      await sleep(3_000);

      // ---- A1: the door off, with the sheet open --------------------------
      if (ARMS.has('1')) {
        const app = appPidNow();
        let parent = null;
        const parentFile = join(ROOT, 'out', 'p330', 'probe-p330-parent.json');
        if (!AT_PARENT && existsSync(parentFile)) {
          try {
            parent = { listeners: JSON.parse(readFileSync(parentFile, 'utf8')).readings.A1.listeners.length };
          } catch {
            parent = null;
          }
        }
        arm('A1', {
          invocations: standin.readLog(),
          nodeServices: doorProcessesOf(app).length,
          tailscaleChildren: tailscaleChildrenOf(app).length,
          listeners: appListeners(app),
          parent
        });
        if (AT_PARENT || (ARMS.size === 1 && ARMS.has('1'))) {
          // The quit, timed, for the parent measurement.
          const t0 = Date.now();
          await cdpEval(main, '(() => { try { window.gmux.quit(); } catch {} return true; })()', 10_000).catch(() => null);
          const code = await Promise.race([handle.exited, sleep(30_000).then(() => null)]);
          report.readings.quitMs = code === null ? null : Date.now() - t0;
          say(`quit took ${String(report.readings.quitMs)} ms with the door never turned on`);
          return;
        }
      }

      // ---- A12: both ports held on a FIRST Pair (the fix round) ----------
      // His Serve holds 8443 and 10000 before the door was ever turned on, so
      // no port can be chosen and the store's port is still 0. The first build
      // drew `https://<name>:0` with Allow here, recorded an agreement to it,
      // and reported `bind-failed` fourteen seconds later.
      if (ARMS.has('12')) {
        standin.setScenario({ ...DEFAULT_SCENARIO, servedPorts: [8443, 10000] }, { merge: false });
        const from12 = standin.readLog().length;
        const pressed12 = await press(settings, WORDS.btnPair);
        const got12 = await waitStatus(main, (s) => s.state === 'refused' && typeof s.refusal === 'string' && s.refusal.length > 0, 20_000);
        const sentence12 = WORDS.sentence('ports-taken', 0);
        await waitFor(async () => (await sheet(settings)).text.includes(sentence12), 5_000);
        const face12 = await confirmFace(settings);
        const sheet12 = await sheet(settings);
        const tried = got12.status === null ? { ok: false } : await pocket(main, 'confirmDoor', { linesRead: got12.status.confirmLines, hashRead: got12.status.confirmHash });
        await sleep(1_500);
        const after12 = await pocket(main, 'status');
        if (!pressed12) cannotRead('A12', `the sheet drew no ${WORDS.btnPair} button to press: ${J(sheet12.buttons)}`);
        else if (!got12.ok) cannotRead('A12', `the door never settled into a refusal: ${J({ state: got12.status?.state, refusal: got12.status?.refusal })}`);
        else {
          arm('A12', {
            refusal: got12.status.refusal,
            sentence: sentence12,
            confirmable: got12.status.confirmable,
            publicPort: got12.status.publicPort,
            sheetText: sheet12.text,
            confirmBlock: face12.block,
            allowButton: face12.allow,
            retryButton: face12.retry,
            confirmAllowed: tried.ok ? tried.value.allowed === true : null,
            confirmStateAfter: after12.ok ? after12.value.confirmState : null,
            funnelStarts: funnelStarts(from12).length,
            nodeServices: doorProcessesOf(appPidNow()).length
          });
        }
        await pocket(main, 'setDoor', { on: false });
        await waitStatus(main, (s) => s.state === 'off', 15_000);
        standin.setScenario({ ...DEFAULT_SCENARIO }, { merge: false });
      }

      // ---- A2: Pair pressed, the approval scenario ------------------------
      standin.setScenario({ caps: false, approval: 'wait' });
      const beforePair = standin.readLog().length;
      const pairPressed = await press(settings, WORDS.btnPair);
      // NOT the status the switch answered with: its lines are over empty
      // fields until the read lands (the first build graded `https://:0`).
      const drawn = await waitStatus(main, linesReady(NAME), 20_000);
      await sleep(1_000);
      const sheet2 = await sheet(settings);
      if (ARMS.has('2')) {
        if (!pairPressed) cannotRead('A2', `the sheet drew no ${WORDS.btnPair} button to press: ${J(sheet2.buttons)}`);
        else if (!drawn.ok) cannotRead('A2', `main never drew lines that name ${NAME}: ${J({ state: drawn.status?.state, confirmable: drawn.status?.confirmable, lines: drawn.status?.confirmLines, refusal: drawn.status?.refusal })}`);
        else {
          arm('A2', {
            argvs: standinArgvs(beforePair),
            lines: drawn.status?.confirmLines ?? [],
            name: NAME,
            tailnet: TAILNET,
            program: standin.binPath,
            asksApproval: drawn.status?.funnel?.asksApproval,
            sheetText: sheet2.text,
            words: WORDS,
            state: drawn.status?.state,
            nodeServices: doorProcessesOf(appPidNow()).length
          });
        }
      }

      // ---- A3: Allow, the approval face, never pressed ---------------------
      let presses = 0;
      if (await allowDoor(settings, main, NAME)) presses += 1;
      const waiting = await waitStatus(main, (s) => s.funnel?.state === 'approval', 25_000);
      const approvalSheet = await sheet(settings);
      const open = approvalSheet.buttons.find((b) => b.text === WORDS.btnOpen);
      standin.approve();
      // Phase 332: a code shows once main says the name answers (`pairable`,
      // one round of the stand-in); a parent answers no `pairable`.
      const listening = await waitStatus(main, (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening'), 75_000);
      const codeShown = await waitFor(async () => (await sheet(settings)).text.includes(WORDS.scanLine), 60_000);
      if (ARMS.has('3')) {
        arm('A3', {
          funnelState: waiting.status?.funnel?.state,
          approvalOpens: waiting.status?.funnel?.approvalOpens,
          approvalText: waiting.status?.funnel?.approvalText,
          openButton: open === undefined ? 'absent' : open.disabled ? 'disabled' : 'enabled',
          approvalSheetText: approvalSheet.text,
          words: WORDS,
          openPressed: false,
          stateAfter: listening.status?.state,
          codeShown,
          pressesAfterPair: presses
        });
      }
      if (!listening.ok) throw new Error(`the door never listened after the approval: ${J({ state: listening.status?.state, refusal: listening.status?.refusal, funnel: listening.status?.funnel })}`);

      // ---- A4: the argv and the record -------------------------------------
      const child = liveFunnels()[0] ?? null;
      const childEntry = standin.readLog().filter((e) => e.kind === 'funnel' && e.pid === child?.pid).pop();
      const doorPids = doorProcessesOf(appPidNow()).map((r) => r.pid);
      const doorListen = listenersOf(doorPids).map((l) => Number(l.split(':').pop()));
      if (ARMS.has('4')) {
        if (child === null) cannotRead('A4', 'no live funnel child in the stand-in after listening');
        else {
          arm('A4', {
            childArgv: childEntry?.argv ?? null,
            publicPort: child.publicPort,
            localPort: child.localPort,
            doorPort: doorListen.length === 1 ? doorListen[0] : -1,
            psCommand: commandOf(child.pid),
            childPid: child.pid,
            program: standin.binPath,
            psLstart: lstartOf(child.pid),
            record: readRecord(),
            recordMode: modeOf(RECORD),
            dirMode: modeOf(dirname(RECORD))
          });
        }
      }

      // ---- A13: the door process's environment (the fix round) ------------
      // The first build forked it with `env: {}`, which Electron reads as unset:
      // lens 2 read HOME, GMUX_TAILSCALE_BIN and a main-only variable in it.
      if (ARMS.has('13')) {
        const doors13 = doorProcessesOf(appPidNow());
        const door13 = doors13.find((r) => hasVariable(environmentOf(r.pid), 'TORTIE_DOOR')) ?? doors13[0] ?? null;
        const env13 = door13 === null ? '' : environmentOf(door13.pid);
        // THE CONTROL IS A SIBLING, never main (the reverify, 2026-09-29):
        // Electron's main empties its own environment when it renames itself
        // `Tortie`, so its `ps -E` is empty whatever the door holds. The
        // network service is a child main started with its whole environment,
        // so it shows the marker a child of main inherits unless its fork
        // replaces the environment, which is what the door's does.
        const main13Pid = appPidNow();
        const sibling13 = descendantsOf(main13Pid).find((r) => r.command.includes('--utility-sub-type=network.mojom.NetworkService'));
        const control13 = sibling13 === undefined ? '' : environmentOf(sibling13.pid);
        if (door13 === null) cannotRead('A13', `no door process under the app while it is listening: ${String(doors13.length)} node service(s)`);
        else {
          arm('A13', {
            doorPid: door13.pid,
            doorPpid: door13.ppid,
            mainPid: main13Pid,
            controlPid: sibling13?.pid ?? 0,
            controlPpid: sibling13?.ppid ?? 0,
            controlIsNetworkService: sibling13 !== undefined,
            controlHasMarker: hasVariable(control13, MAIN_MARKER),
            doorHasOwn: hasVariable(env13, 'TORTIE_DOOR'),
            doorHasHome: hasVariable(env13, 'HOME'),
            doorHasMarker: hasVariable(env13, MAIN_MARKER),
            doorHasTailscaleBin: hasVariable(env13, 'GMUX_TAILSCALE_BIN')
          });
          // The names, never the values: a value may be a path under his home.
          report.readings.A13doorVariables = env13.split(/\s+/).filter((w) => /^[A-Z_][A-Z0-9_]*=/.test(w)).map((w) => w.split('=')[0]);
        }
      }

      // ---- A5: two phones, through the forwarder, mutual TLS ---------------
      await pocket(main, 'cancelPairing');
      const offered = await pocket(main, 'beginPairing');
      const read = offered.ok ? readOffer(offered.value.payload) : { ok: false, why: offered.error };
      if (!read.ok) throw new Error(`the code does not read the phone's way: ${read.why}`);
      const offer = read.offer;
      door = doorFrom(offer, liveFunnels()[0].forwarderPort);
      phoneA = makePhone('p330 phone A', offer.dx);
      const allowFromSheet = async () => {
        const v = await pocket(main, 'pairingState');
        if (v.ok && v.value.state === 'presented') {
          if (!(await press(settings, 'Allow'))) await pocket(main, 'allowPhone', { linesRead: v.value.lines, hashRead: v.value.hash });
        }
      };
      let sheetFingerprint = null;
      const pairedA = await pairThrough(door, offer, phoneA, {
        tries: 20,
        everyMs: 500,
        between: async () => {
          const v = await pocket(main, 'pairingState');
          if (v.ok && v.value.state === 'presented') sheetFingerprint = v.value.fingerprint;
          await allowFromSheet();
        }
      });
      const blocked = pairedA.ok ? await signedGet(phoneA, door, '/v1/blocked') : { status: 0 };
      const sessions = JSON.parse(await cdpEval(main, 'window.gmux.sessions.list().then((s) => JSON.stringify(s.map((x) => ({ id: x.id, name: x.name, agentSessionId: x.agentSessionId ?? null }))))'));
      const talk = sessions.find((s) => s.name === 'p330-talk');
      const sessionRead = talk === undefined ? { status: 0 } : await signedGet(phoneA, door, `/v1/session?id=${encodeURIComponent(talk.id)}`);
      let turnCount = 0;
      try {
        turnCount = JSON.parse(sessionRead.body).session.turnCount;
      } catch {
        turnCount = 0;
      }
      const paged = talk === undefined ? { ok: false, pages: [] } : await pageBack(phoneA, door, talk.id, 3);
      const turns = paged.pages.flatMap((p) => p.turns);
      // A phone with no certificate OUTSIDE a window: closed after the
      // handshake. The allowed window lives to its deadline, so it is shut first.
      await pocket(main, 'cancelPairing');
      const bare = await signedGet({ ...phoneA, certPem: null }, door, '/v1/blocked');
      // Phone B, a second window.
      const offeredB = await pocket(main, 'beginPairing');
      const offerB = offeredB.ok ? readOffer(offeredB.value.payload) : { ok: false };
      phoneB = offerB.ok ? makePhone('p330 phone B', offerB.offer.dx) : null;
      const pairedB = phoneB === null ? { ok: false } : await pairThrough(doorFrom(offerB.offer, liveFunnels()[0].forwarderPort), offerB.offer, phoneB, { tries: 20, everyMs: 500, between: allowFromSheet });
      const readB = pairedB.ok ? await signedGet(phoneB, door, '/v1/blocked') : { status: 0 };
      if (ARMS.has('5')) {
        arm('A5', {
          offerOk: read.ok && !Object.hasOwn(offer, 'tk'),
          offerHost: offer.host,
          offerPort: offer.port,
          name: NAME,
          pairA: pairedA.ok,
          fingerprintMatches: sheetFingerprint !== null && fingerprintDigits(sheetFingerprint) === fingerprintDigits(phoneA.fingerprint),
          certOk: pairedA.ok && adoptCertificate({ ...phoneA }, Buffer.from(pairedA.cert.der).toString('base64url')).ok,
          blocked: blocked.status,
          session: sessionRead.status,
          paged: paged.ok,
          turns: turns.length,
          turnCount,
          pairB: pairedB.ok,
          readB: readB.status,
          bare: { handshook: bare.handshook === true, status: bare.status }
        });
      }

      // ---- A6: the refusals, one scenario each ------------------------------
      const rows = [];
      const refusalScenario = async (label, word, scenario, { approveFile = true } = {}) => {
        await pocket(main, 'setDoor', { on: false });
        await waitStatus(main, (s) => s.state === 'off', 15_000);
        await waitFor(async () => liveFunnels().length === 0, 10_000);
        standin.setScenario({ ...DEFAULT_SCENARIO, ...scenario }, { merge: false });
        if (approveFile) standin.approve();
        else standin.unapprove();
        const from = standin.readLog().length;
        const beforeFindings = watch.findings().length;
        // While the no-program row runs, the table is sampled every 20 ms
        // rather than every second, because a real `status` read would live
        // for less than a second. The refusal's own word is the other catch: a
        // build that fell back would read HIS Tailscale and say something else.
        let fast = null;
        if (label === 'no program') fast = setInterval(() => watch.sample(), 20);
        await pocket(main, 'setDoor', { on: true });
        const got = await waitStatus(main, (s) => s.state === 'refused' && typeof s.refusal === 'string' && s.refusal.length > 0, 30_000);
        if (fast !== null) {
          await sleep(2_000);
          clearInterval(fast);
        }
        const sentence = WORDS.sentence(word, got.status?.publicPort || 8443);
        const shows = await waitFor(async () => (await sheet(settings)).text.includes(sentence), 5_000);
        rows.push({
          scenario: label,
          word,
          refusal: got.status?.refusal ?? null,
          sentence,
          sheetShows: shows,
          published: liveFunnels().length > 0 || got.status?.state === 'listening',
          standinCalls: standin.readLog().length - from,
          realTailscale: watch.findings().length - beforeFindings
        });
      };
      const early = [
        ['not-running', 'not-running', { backendState: 'Stopped' }],
        ['signed-out', 'signed-out', { signedOut: true }],
        ['shields-up', 'shields-up', { refuse: 'shields-up' }],
        ['ports443', 'funnel-ports', { refuse: 'ports443', funnelPorts: [443] }],
        ['port-taken', 'port-taken', { refuse: 'port-taken' }],
        ['busy', 'busy', { refuse: 'busy' }],
        ['exit0', 'not-approved', { caps: false, approval: 'exit0' }, { approveFile: false }]
      ];
      if (ARMS.has('6')) for (const [label, word, scenario, opts] of early) await refusalScenario(label, word, scenario, opts);
      // Back to publishing.
      await pocket(main, 'setDoor', { on: false });
      await waitStatus(main, (s) => s.state === 'off', 15_000);
      standin.setScenario({ ...DEFAULT_SCENARIO }, { merge: false });
      standin.approve();
      await pocket(main, 'setDoor', { on: true });
      let back = await waitStatus(main, (s) => s.state === 'listening' || linesReady(NAME)(s), 30_000);
      if (back.status?.state !== 'listening') {
        await allowDoor(settings, main, NAME);
        back = await waitStatus(main, (s) => s.state === 'listening', 30_000);
      }
      if (!back.ok) throw new Error(`the door did not publish again after the refusals: ${J({ state: back.status?.state, refusal: back.status?.refusal })}`);

      // ---- A7: Remove, then Allow again -------------------------------------
      const childBefore = liveFunnels()[0];
      const forwarderBefore = childBefore.forwarderPort;
      const removed = await press(settings, 'Remove', `[data-phone-id="${phoneA.id}"]`);
      if (!removed) await pocket(main, 'removePhone', phoneA.id);
      await waitFor(async () => !isAlive(childBefore.pid), 10_000);
      await waitFor(async () => doorProcessesOf(appPidNow()).length === 0, 10_000);
      const after7 = {
        childAliveAfterRemove: isAlive(childBefore.pid),
        nodeServicesAfterRemove: doorProcessesOf(appPidNow()).length,
        forwarderAnswersAfterRemove: await tcpAnswers(forwarderBefore)
      };
      await waitStatus(main, (s) => s.confirmState !== 'confirmed', 10_000);
      await allowDoor(settings, main, NAME);
      const again = await waitStatus(main, (s) => s.state === 'listening', 30_000);
      const childAfter = liveFunnels()[0] ?? null;
      door = childAfter === null ? door : { ...door, port: childAfter.forwarderPort };
      const removedRead = await signedGet(phoneA, door, '/v1/blocked');
      await sleep(1_000);
      const otherRead = phoneB === null ? { status: 0 } : await signedGet(phoneB, door, '/v1/blocked');
      if (ARMS.has('7')) {
        arm('A7', {
          ...after7,
          stateAfterAllow: again.status?.state,
          newChild: childAfter !== null && childAfter.pid !== childBefore.pid,
          removedRead: { handshook: removedRead.handshook === true, status: removedRead.status },
          unknownKeyLines: appLog().split('\n').filter((l) => l.includes('refused a connection at the door: unknown-key')).length,
          // Only the door started by this Allow ever saw the removed phone.
          doorProcesses: 1,
          otherRead: otherRead.status
        });
      }

      // ---- A8: a profile switch, no restart ---------------------------------
      if (ARMS.has('8')) {
        const child8 = liveFunnels()[0];
        const reads = standin.readLog().filter((e) => e.kind === 'status' && e.verdict === 'answered').length;
        standin.setScenario({ tailnetAfterReads: { n: reads, name: MOVED } });
        const from8 = standin.readLog().length;
        process.kill(child8.pid, 'SIGINT');
        const moved = await waitStatus(main, (s) => s.confirmState === 'changed', 20_000);
        await sleep(WORDS.floorMs * 3);
        const sheet8 = await sheet(settings);
        arm('A8', {
          funnelStartsAfter: funnelStarts(from8).length,
          confirmState: moved.status?.confirmState,
          state: moved.status?.state,
          sheetText: sheet8.text,
          movedTailnet: MOVED
        });
        // The moved tailnet is the tailnet now; confirm its lines and publish.
        standin.setScenario({ tailnet: MOVED, tailnetAfterReads: null });
        await allowDoor(settings, main, NAME);
        await waitStatus(main, (s) => s.state === 'listening', 30_000);
      }

      // ---- A9: an unexpected exit, restarted at the floor --------------------
      if (ARMS.has('9')) {
        const child9 = liveFunnels()[0];
        const from9 = standin.readLog().length;
        const killedAt = Date.now();
        process.kill(child9.pid, 'SIGKILL');
        let sawRestarting = false;
        let sheetSawRestarting = false;
        let restartMs = -1;
        const until = Date.now() + WORDS.floorMs + 15_000;
        while (Date.now() < until) {
          const s = await pocket(main, 'status');
          if (s.ok && s.value.funnel?.state === 'restarting') sawRestarting = true;
          if (!sheetSawRestarting && (await sheet(settings)).text.includes(WORDS.restarting)) sheetSawRestarting = true;
          const start = funnelStarts(from9)[0];
          if (start !== undefined && restartMs < 0) restartMs = start.at - killedAt;
          if (restartMs >= 0 && s.ok && s.value.state === 'listening') break;
          await sleep(100);
        }
        const after9 = await waitStatus(main, (s) => s.state === 'listening', 10_000);
        const child9b = liveFunnels()[0] ?? null;
        const readAfter = child9b === null || phoneB === null ? { status: 0 } : await signedGet(phoneB, { ...door, port: child9b.forwarderPort }, '/v1/blocked');
        arm('A9', { sawRestarting, sheetSawRestarting, restartMs, floorMs: WORDS.floorMs, stateAfter: after9.status?.state, readAfter: readAfter.status });
      }

      // ---- A6, late: ports-taken with nothing chosen, and no program -------
      if (ARMS.has('6')) {
        await pocket(main, 'forgetDoor');
        await waitStatus(main, (s) => s.state === 'off' || s.confirmState !== 'confirmed', 15_000);
        await refusalScenario('ports-taken', 'ports-taken', { servedPorts: [8443, 10000], tailnet: MOVED });
        // NO PROGRAM. The wrapper is moved away, so GMUX_TAILSCALE_BIN names a
        // path that does not exist. The build must refuse override-unusable
        // and NOT fall back to the pinned list, which on this Mac would be his
        // real Tailscale. Asked only when the source holds the refusal, and
        // with nothing confirmed, so even a build that fell back could spawn
        // no funnel: the sampler would see its read and fail the run.
        if (!/override-unusable/.test(FUNNEL_SRC) || !/dev-override/.test(FUNNEL_SRC)) {
          rows.push({ scenario: 'no program', word: 'override-unusable', refusal: null, sentence: WORDS.sentence('override-unusable', 8443), sheetShows: false, published: false, standinCalls: 0, realTailscale: 0, notRun: 'funnel.ts names no override-unusable refusal, so this arm was NOT run: it could reach his real Tailscale' });
        } else {
          const away = `${standin.binPath}.away`;
          renameSync(standin.binPath, away);
          try {
            await refusalScenario('no program', 'override-unusable', { tailnet: MOVED });
          } finally {
            renameSync(away, standin.binPath);
          }
        }
        arm('A6', { rows, wanted: early.length + 2 });
      }

      // ---- A10: quit with the door publishing --------------------------------
      if (ARMS.has('10') || ARMS.has('11')) {
        await pocket(main, 'setDoor', { on: false });
        await waitStatus(main, (s) => s.state === 'off', 15_000);
        standin.setScenario({ ...DEFAULT_SCENARIO, tailnet: MOVED }, { merge: false });
        await pocket(main, 'setDoor', { on: true });
        // THE LINES FIRST (the fix round): the first build pressed Allow on
        // lines the read had not landed in, published nothing, and graded the
        // child it never had as alive.
        let up = await waitStatus(main, (s) => s.state === 'listening' || linesReady(NAME)(s), 30_000);
        if (up.status?.state !== 'listening') {
          await allowDoor(settings, main, NAME);
          up = await waitStatus(main, (s) => s.state === 'listening', 30_000);
        }
        const child10 = up.ok ? (liveFunnels()[0] ?? null) : null;
        const app = appPidNow();
        await cdpEval(main, '(() => { try { window.gmux.quit(); } catch {} return true; })()', 10_000).catch(() => null);
        const code = await Promise.race([handle.exited, sleep(40_000).then(() => null)]);
        await sleep(500);
        const exitEvent = child10 === null ? null : standin.readLog().filter((e) => e.event === 'exit' && e.pid === child10.pid).pop();
        if (ARMS.has('10') && child10 === null) {
          cannotRead('A10', `the door never published before the quit, so there was no child to end: ${J({ state: up.status?.state, refusal: up.status?.refusal, confirmState: up.status?.confirmState })}`);
        } else if (ARMS.has('10')) {
          arm('A10', {
            exited: code !== null,
            childAlive: isAlive(child10.pid),
            childHow: exitEvent?.how ?? null,
            nodeServices: doorProcessesOf(app).length,
            recordExists: existsSync(RECORD)
          });
        }
      }
    } finally {
      settings?.close();
      main.close();
    }
  });

  // ======================================================================
  // ARM 11 — the orphan, two launches one after the other
  // ======================================================================
  if (ARMS.has('11') && !AT_PARENT) {
    const r11 = { orphanPid: 0, recordPidA: null, orphanAliveAfterKill: false, orphanPpid: 0, recordPidAfterKill: null, orphanCommand: '', orphanLstart: '', decoyCommand: '', decoyLstart: '', decoyPid: 0, orphanAliveAfterB: true, decoyAliveAfterB: false, newChildPid: 0, logEnded: false };
    await launch('p330-orphan-a', async (handle, appPidNow) => {
      const main = await attachMain();
      appPidNow();
      try {
        const up = await waitStatus(main, (s) => s.state === 'listening', 60_000);
        const child = liveFunnels()[0] ?? null;
        if (!up.ok || child === null) return;
        r11.orphanPid = child.pid;
        r11.recordPidA = readRecord()?.pid ?? null;
        r11.orphanCommand = commandOf(child.pid);
        r11.orphanLstart = lstartOf(child.pid);
        // THE MAIN PID, NEVER THE SHIM: a SIGKILL to the shim leaves the app up.
        const app = appPidNow();
        if (app > 0 && app !== handle.pid) process.kill(app, 'SIGKILL');
        await Promise.race([handle.exited, sleep(20_000)]);
      } finally {
        main.close();
      }
    });
    // After the helper's teardown too: the child is not the app's any more.
    await sleep(1_000);
    r11.orphanAliveAfterKill = isAlive(r11.orphanPid);
    r11.orphanPpid = ppidOf(r11.orphanPid);
    r11.recordPidAfterKill = readRecord()?.pid ?? null;
    // THE DECOY: the same wrapper and argv, a later start time.
    const record = readRecord();
    if (record !== null && Array.isArray(record.argv) && r11.orphanAliveAfterKill) {
      await sleep(1_100);
      decoy = spawn(standin.binPath, record.argv.slice(1), { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, P330_STANDIN_DIR: STANDIN_DIR, P330_STANDIN_ROLE: 'decoy' } });
      let decoyOut = '';
      decoy.stdout.on('data', (c) => (decoyOut += c.toString('utf8')));
      await waitFor(async () => decoyOut.includes('Press Ctrl+C'), 10_000);
      r11.decoyPid = decoy.pid ?? 0;
      r11.decoyCommand = commandOf(r11.decoyPid);
      r11.decoyLstart = lstartOf(r11.decoyPid);
    }
    await launch('p330-orphan-b', async (handle, appPidNow) => {
      const main = await attachMain();
      appPidNow();
      try {
        await waitStatus(main, (s) => s.state === 'listening', 60_000);
        await waitFor(async () => !isAlive(r11.orphanPid) || !commandOf(r11.orphanPid).includes('tailscale-standin.mjs'), 10_000);
        r11.orphanAliveAfterB = isAlive(r11.orphanPid) && commandOf(r11.orphanPid).includes('tailscale-standin.mjs');
        r11.decoyAliveAfterB = isAlive(r11.decoyPid) && commandOf(r11.decoyPid) === r11.decoyCommand;
        r11.newChildPid = liveFunnels().map((f) => f.pid).find((p) => p !== r11.orphanPid && p !== r11.decoyPid) ?? 0;
        r11.logEnded = /ended a Funnel child a previous run left behind/.test(appLog());
      } finally {
        main.close();
      }
    });
    arm('A11', r11);
  }
} catch (err) {
  cannotRead('the run', `it threw: ${String(err?.stack ?? err)}`);
} finally {
  // Everything this run started, by pid, whatever happened.
  try {
    writeFileSync(STOP, 'stop\n');
  } catch {
    /* the world may be gone */
  }
  if (decoy !== null && decoy.exitCode === null && decoy.signalCode === null) {
    try {
      decoy.kill('SIGINT');
    } catch {
      /* gone */
    }
    await sleep(500);
    if (decoy.exitCode === null && decoy.signalCode === null) {
      try {
        decoy.kill('SIGKILL');
      } catch {
        /* gone */
      }
    }
  }
  const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(STANDIN_DIR, 1_500);
  report.readings.standinEnded = ended;
  const findings = watch?.stop() ?? [];
  const log = standin?.readLog() ?? [];
  const nameRows = dns?.log() ?? [];
  if (dns !== null) await dns.close();
  const ours = (spawnSync('/bin/ps', ['-Ao', 'pid=,ppid=,comm='], { encoding: 'utf8' }).stdout ?? '')
    .split('\n')
    .filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l))
    .filter((l) => {
      const [pid, ppid] = l.trim().split(/\s+/).map(Number);
      return launches.some((x) => [x.shim, x.app].filter((p) => p > 0).some((p) => pid === p || ppid === p)) || commandOf(pid).includes(PROFILE);
    });
  arm('RUN', {
    preflight: preflightOk,
    realTailscale: findings.length,
    samples: watch?.samples() ?? 0,
    forbidden: log.filter((e) => e.forbidden === true).length,
    refusedArgv: log.filter((e) => e.verdict === 'refused').length,
    standinLeft: ended.left.length,
    electronLeft: ours.length,
    dnsPreflights,
    agentsHeld,
    // Owed at HEAD on a run that published the door; a parent ignores the variable.
    nameQuestions: { expect: !AT_PARENT && log.some((e) => e.kind === 'funnel'), rows: nameRows, name: NAME }
  });
  report.readings.realTailscaleFindings = findings;
  report.readings.standinCalls = log.map((e) => ({ at: e.at, kind: e.kind, argv: e.argv, verdict: e.verdict, event: e.event, how: e.how }));
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
}

const OUT = join(ROOT, 'out', 'p330');
mkdirSync(OUT, { recursive: true });
const outFile = join(OUT, `probe-p330${AT_PARENT ? '-parent' : ''}.json`);
writeFileSync(outFile, `${J({ ...report, readings: { ...report.readings, A2: report.readings.A2 === undefined ? undefined : { ...report.readings.A2, words: undefined }, A3: report.readings.A3 === undefined ? undefined : { ...report.readings.A3, words: undefined } } }, null, 1)}\n`, 'utf8');
say(`wrote ${outFile}${KEEP ? `; kept the scratch world at ${RUN}` : ''}`);
if (failures > 0) {
  say(`probe:p330 FAILED ${String(failures)} arm(s)`);
  process.exit(1);
}
if (unreadable > 0) {
  say(`probe:p330 could not READ ${String(unreadable)} arm(s); that is not a pass`);
  process.exit(2);
}
say(AT_PARENT ? 'probe:p330 at the parent: the parent reading is taken' : 'probe:p330 OK');
process.exit(0);
