#!/usr/bin/env node
/**
 * probe:p350 — THE PHASE 350 APP RUN, the Mac side (build/p350/SPEC.md §8.2):
 * John Berryman's two sentences (issue 42) measured at the parent and at HEAD,
 * pi started and restored with `--tui-mode regular` exactly where its version
 * holds, every full-screen program paged by ONE `PPage` a pull, and the
 * per-agent matrix of SPEC §9.1 here and on another machine, every byte a
 * program received read from build/p350/stand-in.mjs's own log and never
 * from the keys verb's report (Method 1's ground truth).
 *
 * ONE ELECTRON AT A TIME, every launch through build/electron-run.mjs's
 * `withElectron` on ONE scratch profile, a scratch HOME (ZDOTDIR the same,
 * HISTFILE=/dev/null, no TERM_SESSION_ID) and the socket build/harness-socket.mjs
 * hands this file (`gmux-p350…`), inside build/with-scratch-machine.mjs's
 * LOOPBACK machine with the quiet shell, its own far HOME and none of the
 * person's keys (`SCRATCH_MACHINE_QUIET_SHELL=1`, `SCRATCH_MACHINE_SCRATCH_HOME=1`,
 * `SCRATCH_MACHINE_NO_OWN_KEYS=1`, which the npm script exports and this file
 * refuses to run without). FIRST the parent, `P350_PARENT_CHECKOUT` (a BUILT
 * c60c2a48, required: `--preflight` refuses without it), which pairs the two
 * phones; then HEAD, launched once a band.
 *
 * IN THE STANDARD FORM (his ruling of 2 November 2026, "ok do the allow"):
 * every launch names this run's socket (`tmuxSocket`) beside
 * `GMUX_TMUX_SOCKET` in the app's env, so build/electron-run.mjs judges the
 * socket the app announces, reads his session names once before and once after
 * the launch, READ ONLY, and fails the launch if one appeared or went (its
 * layer-4 census), and its teardown ends this run's scratch server. That census
 * is the one read of his server anything in this run makes, and this file
 * names that server nowhere. Phase 349's "not even to count", which this file
 * once followed (no `tmuxSocket` and a `kill-server` of its own), is withdrawn.
 *
 * WHAT IS REAL. The door, switched on, confirmed and published through the
 * STAND-IN Tailscale (build/p330/tailscale-standin.mjs behind
 * GMUX_TAILSCALE_BIN, preflighted by sha256, the process table sampled every
 * second: a real Tailscale under the app, or run as a command, FAILS the run).
 * The name check asks build/p332/dns-standin.mjs IN THIS PROCESS on
 * 127.0.0.1. The phones are build/p316/node-phone.mjs, paired through the
 * stand-in's loopback forwarder with mutual TLS; a pull is this file's own
 * reading of the phone's rule (D7, D8: one `PPage` on a picture whose `pages`
 * is true, that takes keys and does not ask), sent through the allowed
 * `/v1/keys` route with the picture's turn and dialog.
 *
 * THE AGENTS ARE STAND-INS (SPEC §0.2 rule 5). The scratch login shell
 * resolves the bare names of ten registry rows (claude, codex, cursor-agent,
 * codewhale, agy, muse, qwen, pi, grok, opencode) to build/p350/stand-in.mjs's
 * wrappers, and this file REFUSES (exit 2) unless each resolves there. pi's is
 * laid out as npm installs pi (the ruled round: Tortie composes pi's token only
 * for a pi inside pi's own package), a link on the PATH to the wrapper as
 * `lib/node_modules/@earendil-works/pi-coding-agent/dist/cli.js`.
 * build/hidden-agents.mjs renames EVERY OTHER probed row (gemini, droid and
 * omp) before EVERY launch (`hiddenAgentsBesides(STAND_IN_ROWS)`), its
 * precheck holds that list to the checkout's own registry, and the app's own
 * `agents:list` must say nothing resolved but the stand-ins, under this run
 * (`standInsOnlyVerdict`). gemini and omp are hidden rather than stood in
 * because this Mac keeps real copies of them in two folders Tortie's scan
 * always searches (`/usr/local/bin/gemini`, `/opt/homebrew/bin/omp`, read by
 * name only), and the scan asks every shadowed copy of a name it resolves for
 * its version: their matrix rows run the SAME stand-in TYPED IN A SHELL
 * session, which is what those rows grade (the screen, the offer, the bytes),
 * and nothing about either row's registry entry moves in this phase. The
 * shadow refusal (`shadowCopiesOf`) holds the ten names out of the scan's
 * absolute folders and the app PATH's system folders. NO VENDOR PROCESS RUNS
 * AND NO MODEL TURN IS SPENT. After the run every manifest row's argv[0] is
 * read (a COPY beside its WAL), and one outside the run fails RUN.
 *
 * THE BANDS (SPEC §2.1, M1). pi's version is a FILE (`pi-band`) both wrappers
 * read at every start, so one profile is launched at 1.4.0, 0.99.2, 0.83.0 and
 * a band that is no version, one after the other; `version-delay` holds
 * D13's 6,000 ms. The loopback machine's pi reads the same file, and Tortie
 * reads no version there (research 134 §5).
 *
 * THE LAUNCHES, one after the other:
 *   L0 parent 1.4.0   pair A and B; J1, RP, M's parent half, GRACE's parent
 *                     half; the pi rows PASS plants from
 *   L1 parent 1.4.0   D13's parent half: no stand-in `-v` until this file's own
 *                     ask, which is LAST
 *        plant        PASS's rows, through the SHIPPING manifest store
 *   L2 HEAD 1.4.0     J2, M's HEAD half, GRACE's HEAD half, PASS at holds, B's
 *                     1.4.0 create
 *   L3 HEAD 1.4.0     B's 1.4.0 restore, PASS at holds again
 *   L4 HEAD 1.4.0     D13's HEAD half, the version answer held 6,000 ms;
 *                     `agents:list` asked LAST
 *   L5 HEAD 0.99.2    B's 0.99.2 create;  L6 its restore
 *   L7 HEAD 0.83.0    B's 0.83.0 create, PASS below the floor;  L8 its restore
 *                     and a row recorded with the token restored below it
 *        plant        two rows with the token
 *   L9 HEAD garbage   PASS on an unread version, and the strip on restore
 *
 * THE ARMS (SPEC §8.2)
 *   J1     at the parent: pi (band 1.4.0) on the alternate screen with no
 *          depth, a page of history `moved`, a phone page `malformed` with
 *          nothing in its log, and the Mac's real wheel notches (CDP
 *          `Input.dispatchMouseEvent`, as probe:p331 drives them) moving its
 *          view, the next picture following; claude paged on the phone with
 *          the Mac's view unchanged, and a Mac scroll parking copy mode with
 *          the picture's first row unchanged
 *   J2     at HEAD: no route waits over the parent's agreement; pi's argv and
 *          resume argv hold the token straight after argv[0]; pi reads as
 *          claude reads on both sentences; a pi with a person's `--tui-mode
 *          fullscreen` and a pi on the loopback machine read as J1's pi, plus
 *          exactly one `ESC[5~` for one phone page
 *   M      §9.1's matrix: every row here and on the loopback machine, at the
 *          parent and at HEAD (`MATRIX`); the picture's `alternate`, `depth`
 *          and `pages`, the log's bytes for one pull (exactly `1b5b357e`, or
 *          nothing), the view moved by the program's own page, a page of
 *          history where it is inline with the Mac's view unchanged, the
 *          controls, grok's Tab, omp's overlay, and the Mac's own wheel byte
 *          for byte as at the parent wherever this phase did not move the view
 *   B      the bands: a create once `agents:list` answered at 0.83.0, 0.99.2
 *          and 1.4.0, then a relaunch and a restore, each typed command read
 *          by this file's own `capture-pane` and graded by its OWN reading of
 *          M1 (`m1Draws`), then Enter and the pane read alive and inline; and
 *          a row recorded with the token restored once pi reads 0.83.0
 *   D13    before the scan answers (`version-delay` 6000): a HEAD-recorded row
 *          restored inside the window types no token and lives, another after
 *          the scan answers types it, a phone start inside the window
 *          composes none, no stand-in `-v` before the window's first terminal
 *          bytes at HEAD and one before this file's own ask (D18), and none at
 *          the parent until that ask
 *   PASS   every pi row of the manifest, planted ones (`PLANTED`) and created
 *          ones, read through the SHIPPING store before and after each HEAD
 *          launch's first scan answered, byte for byte against this file's
 *          own reading of §4.2 step 3 (`passExpect`) at holds, below and
 *          unread; every planted row restored after, its typed command
 *          against D17 (`armExpect`)
 *   GRACE  an idle pi in full screen (a person's flag) paged once from the
 *          phone at HEAD: its status never reads working (`running`) in the
 *          6 s after, sampled every 250 ms through `sessions:list`; the desk's
 *          wheel over it reads working at both builds, recorded, not changed
 *   RP     the parent's door: no `pages` offered, a page key answers
 *          `malformed`, nothing in the log
 *   RUN    the preflights, the hidden agents and the shadow refusal at every
 *          launch, the stand-ins resolved here and on the machine, every
 *          manifest argv[0] the run's, every launch naming this run's own
 *          socket and the helper's census of his session names finding no
 *          change across it, no real Tailscale, nothing left, his shell
 *          history unmoved (a moved history read again after
 *          HISTORY_QUIET_MS, starting nothing)
 *
 * WHAT IT REFUSES TO DO. It never names the person's tmux server (it refuses
 * any socket that is not a `gmux-p350` harness socket); the one read of it is
 * the helper's census of his session names, before and after each launch,
 * read only, by his ruling of 2 November 2026. It binds no real interface and dials
 * nothing but 127.0.0.1, never runs a real `tailscale` and never asks real
 * DNS, reads no keychain and no credential (the app runs
 * `--use-mock-keychain`), reads no agent's or conversation store (a pi
 * settings file is read by the stand-in only under a scratch HOME), and
 * signals only the pids it started or the stand-ins wrote in their hellos, by
 * pid, re-reading a pid's command line first (SIGUSR1 to one omp stand-in,
 * SIGTERM and SIGKILL at the end), never by pattern. It takes NO screenshot.
 * It reads his shell history's size and modified time, under the ACCOUNT's
 * home, and nothing else of it.
 *
 * VERIFIERS ONLY: it starts an Electron. Take the orchestrator's lock.
 *
 *   npm run build && P350_PARENT_CHECKOUT=<a BUILT c60c2a48> npm run -s probe:p350
 *   P350_ARMS=M,B,…          the arms to run (default all; RP and RUN are always read)
 *   P350_KEEP=1              keep the scratch world and every answer (out/p350) for a re-derivation
 *   node build/p350/probe-p350.mjs --grader-self-test   every grader on build/p350/fixtures/graders.json; starts nothing
 *   node build/p350/probe-p350.mjs --preflight          the parent, out/ and the stand-in; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ. A launch refused because an agent other than the
 * stand-ins could run (the precondition, the shadow refusal, the precheck,
 * the scan's own verdict) is no run, exit 2.
 *
 * A missing reading is UNREADABLE, never a pass and never the app's failure
 * (docs/method/HOW-WE-BUILT-THIS.md rule 9): a row whose stand-in never said
 * hello, a picture never read, a wheel whose pane was another size at the
 * other build, a band never launched, a restore inside D13's window that
 * landed after the scan answered.
 *
 * WHERE THIS FILE READS SPEC §8.2 OTHERWISE, STATED (the builder's report
 * names each):
 *   1. HEAD is launched once a band, not once: the scan is read once a
 *      process, so B's three bands, D13's held answer and PASS's unread band
 *      are each a launch of their own (L2 to L9), every one in the same form.
 *   2. gemini and omp are hidden and their rows typed in a shell (the header
 *      above says why); every other row runs through its registry row.
 *   3. gemini's resting screen is `a-gemini-0006` (build/p350/stand-in.mjs
 *      says why); the self-test holds every resting screen to its verdicts.
 *   4. omp's overlay is asked for 8 s (`--overlay-ms 8000`) where the stand-in's
 *      own is SPEC §8.1's 4 s, so a pull on the loopback machine, whose
 *      pictures tick every 400 ms, lands while it is up.
 *   5. J1's "the phone pages 228 rows" is read as one page of up to 100 rows
 *      answered with the agent's numbered lines: 228 is the page reader's
 *      capture of a 100-row page with its 128-row overscan, not what a phone
 *      receives.
 *   6. The four controls run on this Mac only; the far half of the matrix is
 *      every agent row.
 *   7. The leaving control's second page is written against the picture the
 *      first was (its turn stale, which the keys lock accepts off a question),
 *      so it lands after the program left full screen: SPEC §13.1's one `~`.
 *
 * THE PROBE REVIEW (2026-10-31, rule 9, by a reader who did not write this
 * file). Five clauses passed over a read that never happened and are now
 * UNREADABLE first: every GRACE status sample unread (`null`), the parent's
 * D13 half with no `-v` logged at all, a PASS floor whose launches read no row
 * the pass may move, the leaving control's `~` count from a failed capture
 * (`null <= 1`) and grok's view unread around its page before the Tab. Two
 * readings the drive took recorded a missing read as a real one and now record
 * `null`: the phone's first row around the Mac's wheel (`''`, so `'' === ''`
 * passed J1's and J2's "unchanged") and the RP, J1 and GRACE logs of a
 * stand-in that never said hello (`[]`, so "nothing reached it" passed). A page
 * pull marks a picture it could not read, GRACE whether its page was pictured.
 * B's last clause was renamed: it never reached D17's own strip (L7's pass
 * takes the token out first). build/p350/fixtures/graders.json holds the
 * review's readings, named `review:`.
 */

import { execFile, spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { keyscanText } from '../ssh-run.mjs';
import { tsxCli } from '../ts-runner.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentBinaries, hiddenAgentsBesides, hiddenAgentsPrecheck, hiddenAgentsScanVerdict, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { freshWriteId, makePhone, pairThrough, readOffer, readSessions, screenRead, screenRowText, scrollbackRead, sendKeys, signedGet, startAnswerOf, startSession, writeAnswerOf } from '../p316/node-phone.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin } from '../p332/dns-standin.mjs';
import { ASKING_SCREEN, FULLSCREEN_MOUSE, PI_PACKAGE, SCREENS, SPEC_GEMINI_SCREEN, STANDIN_PATH, hellos, lineNumberOf, loadScreen, modeOf, pageOf, piModeOf, readLog, readsSince, screenProblems, stateOf, versionCalls, versionLineOf, viewTopOf, writeWrappers } from './stand-in.mjs';
import { manifestSessions, within } from '../scratch-login.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// What the run holds the app against, BY VALUE (never imported from src/)
// ---------------------------------------------------------------------------

/** The parent this phase is measured against (build/p350/SPEC.md: origin/main at the spec). */
export const SNAPSHOT = 'c60c2a48';
export const MACHINE_ID = 'p350far';
export const MACHINE_LABEL = 'p350 loopback';
/** Tortie's pi token, by value (SPEC §4.1 item 1, D1). */
export const PI_TOKEN = Object.freeze(['--tui-mode', 'regular']);
/** pi's floor (D2). */
export const PI_FLOOR = '0.84.0';
/** The bands B launches (SPEC §8.2), in the order they run, and the band that is no version. */
export const BANDS = Object.freeze(['1.4.0', '0.99.2', '0.83.0']);
export const UNREAD_BAND = 'garbage';
/** What tmux types for PPage and NPage in every mode M4 measured (D4). */
export const PAGE_UP_HEX = '1b5b357e';
export const PAGE_DOWN_HEX = '1b5b367e';
/** GRACE's window and cadence (SPEC §8.2), and the status the window reads as working. */
export const GRACE_WINDOW_MS = 6_000;
export const GRACE_SAMPLE_MS = 250;
export const WORKING_STATUS = 'running';
/** The fewest samples a GRACE window may hold: half the nominal count, for the bridge's own time per read. */
export const GRACE_MIN_SAMPLES = Math.floor(GRACE_WINDOW_MS / GRACE_SAMPLE_MS / 2);
/** D13's held version answer (SPEC §8.2). */
export const D13_DELAY_MS = 6_000;
/** How long a moved history is waited on, starting nothing, before it is read again (his rule of 2026-10-20). */
export const HISTORY_QUIET_MS = 180_000;

/** The registry rows stood in through their own rows, by id (the scan resolves each to a wrapper of this run). */
export const STAND_IN_ROWS = Object.freeze(['claude', 'codex', 'cursor', 'deepseek', 'antigravity', 'muse', 'qwen', 'pi', 'grok', 'opencode']);
/** Each stood-in row's wrapper names: the launch argv's bare name, which the scan resolves first. */
export const ROW_WRAPPERS = Object.freeze([
  { name: 'claude', agent: 'claude' },
  { name: 'codex', agent: 'codex' },
  { name: 'cursor-agent', agent: 'cursor' },
  { name: 'codewhale', agent: 'deepseek' },
  { name: 'agy', agent: 'antigravity' },
  { name: 'muse', agent: 'muse' },
  { name: 'qwen', agent: 'qwen' },
  // THE RULED ROUND (his ruling of 2026-11-02): Tortie composes pi's token only for a pi inside pi's own package,
  // so pi's wrapper is laid out as npm installs pi, a link on the PATH to its package's dist/cli.js.
  { name: 'pi', agent: 'pi', npmPackage: PI_PACKAGE },
  { name: 'grok', agent: 'grok' },
  { name: 'opencode', agent: 'opencode' }
]);
/** The wrappers a shell types (names no row resolves), each running under the program token it stands in for. */
export const SHELL_WRAPPERS = Object.freeze([
  { name: 'p350-gemini', agent: 'gemini', as: 'gemini' },
  { name: 'p350-omp', agent: 'omp', as: 'omp' },
  { name: 'p350-ctl', agent: 'p350', as: 'p350-ctl' }
]);

/**
 * SPEC §9.1's matrix, one entry a row and place: how it is started (`row`, a
 * registry create with `extra` as a person's launch flags, or `shell`, the
 * stand-in typed into a shell session), and the view each build's stand-in
 * must draw (`view.parent`, `view.head`), which is the agent's own rule over
 * what Tortie composed: pi's token at HEAD on this Mac only, Claude's variable
 * on this Mac only, Codex's pair everywhere. droid is not run (never observed,
 * no committed screen: SPEC §9.1, stated).
 */
export const MATRIX = Object.freeze([
  { id: 'claude', place: 'here', via: 'row', agent: 'claude', view: { parent: 'inline', head: 'inline' } },
  { id: 'codex', place: 'here', via: 'row', agent: 'codex', view: { parent: 'inline', head: 'inline' } },
  { id: 'codex-true', place: 'here', via: 'row', agent: 'codex', extra: ['-c', 'tui.fullscreen_transcript=true'], view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'cursor', place: 'here', via: 'row', agent: 'cursor', view: { parent: 'inline', head: 'inline' } },
  { id: 'gemini', place: 'here', via: 'shell', agent: 'gemini', wrapper: 'p350-gemini', view: { parent: 'inline', head: 'inline' } },
  { id: 'gemini-opted', place: 'here', via: 'shell', agent: 'gemini', wrapper: 'p350-gemini', args: ['--opted-in'], view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'deepseek', place: 'here', via: 'row', agent: 'deepseek', view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'antigravity', place: 'here', via: 'row', agent: 'antigravity', view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'muse', place: 'here', via: 'row', agent: 'muse', view: { parent: 'inline', head: 'inline' } },
  { id: 'qwen', place: 'here', via: 'row', agent: 'qwen', view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'pi', place: 'here', via: 'row', agent: 'pi', view: { parent: 'fullscreen', head: 'inline' } },
  { id: 'pi-person', place: 'here', via: 'row', agent: 'pi', extra: ['--tui-mode', 'fullscreen'], view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'pi-shell', place: 'here', via: 'shell', agent: 'pi', wrapper: 'pi', view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'omp', place: 'here', via: 'shell', agent: 'omp', wrapper: 'p350-omp', args: ['--overlay-ms', '8000'], view: { parent: 'inline', head: 'inline' } },
  { id: 'grok', place: 'here', via: 'row', agent: 'grok', view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'opencode', place: 'here', via: 'row', agent: 'opencode', view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'ctl-legacy1000', place: 'here', via: 'shell', agent: 'p350', wrapper: 'p350-ctl', args: ['--mode', 'legacy1000'], view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'ctl-altonly', place: 'here', via: 'shell', agent: 'p350', wrapper: 'p350-ctl', args: ['--mode', 'altonly'], view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'ctl-leave', place: 'here', via: 'shell', agent: 'p350', wrapper: 'p350-ctl', args: ['--mode', 'leave-on-page'], view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'ctl-asking', place: 'here', via: 'shell', agent: 'p350', wrapper: 'p350-ctl', args: ['--mode', 'asking'], view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'claude', place: 'far', via: 'row', agent: 'claude', view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'codex', place: 'far', via: 'row', agent: 'codex', view: { parent: 'inline', head: 'inline' } },
  { id: 'cursor', place: 'far', via: 'row', agent: 'cursor', view: { parent: 'inline', head: 'inline' } },
  { id: 'gemini', place: 'far', via: 'shell', agent: 'gemini', wrapper: 'p350-gemini', view: { parent: 'inline', head: 'inline' } },
  { id: 'deepseek', place: 'far', via: 'row', agent: 'deepseek', view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'antigravity', place: 'far', via: 'row', agent: 'antigravity', view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'muse', place: 'far', via: 'row', agent: 'muse', view: { parent: 'inline', head: 'inline' } },
  { id: 'qwen', place: 'far', via: 'row', agent: 'qwen', view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'pi', place: 'far', via: 'row', agent: 'pi', view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'omp', place: 'far', via: 'shell', agent: 'omp', wrapper: 'p350-omp', args: ['--overlay-ms', '8000'], view: { parent: 'inline', head: 'inline' } },
  { id: 'grok', place: 'far', via: 'row', agent: 'grok', view: { parent: 'fullscreen', head: 'fullscreen' } },
  { id: 'opencode', place: 'far', via: 'row', agent: 'opencode', view: { parent: 'fullscreen', head: 'fullscreen' } }
]);
/** One matrix entry's key. */
export const rowKey = (x) => `${String(x.place)}:${String(x.id)}`;
/** The matrix entry a reading is of, or undefined. */
export const matrixOf = (x) => MATRIX.find((m) => m.id === x.id && m.place === x.place);
/** The view a reading's stand-in must have drawn at its build. */
export const expectedView = (x) => matrixOf(x)?.view?.[x.build] ?? null;

// ---------------------------------------------------------------------------
// THIS FILE'S OWN READINGS OF THE RULES (Method 1): transcribed from SPEC
// §2.1, §4.2 step 3 and D17, never imported from src/, so the app is held to
// the spec rather than to itself
// ---------------------------------------------------------------------------

/** A dotted triple, or null. */
export function tripleOf(text) {
  const m = /(?<![\d.])(\d+)\.(\d+)\.(\d+)/.exec(String(text ?? ''));
  return m === null ? null : [Number(m[1]), Number(m[2]), Number(m[3])];
}
/** Numeric semver order; an unreadable side sorts lowest. */
export function cmpTriple(a, b) {
  const x = tripleOf(a) ?? [-1, -1, -1];
  const y = tripleOf(b) ?? [-1, -1, -1];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}
/** The floor a band gives (D25, by value): `holds`, `below` or `unread`. */
export function floorOf(band) {
  if (tripleOf(band) === null) return 'unread';
  return cmpTriple(band, PI_FLOOR) >= 0 ? 'holds' : 'below';
}

/**
 * M1's table (SPEC §2.1), this file's own transcription from pi's source as
 * text: what a pi of `band` DRAWS for the words after its program and a saved
 * `tuiMode`: `regular`, `fullscreen` or `dies` (below 0.84.0 any `--tui-mode`
 * is an unknown flag, and pi stops on it after its trust question; from
 * 0.84.0 a `--tui-mode` with no value or another word is an error). From
 * 0.84.0 the LAST `--tui-mode` wins over the setting; then the setting; then
 * regular to 0.99.2 and full screen from 1.0.0.
 */
export function m1Draws(band, words, setting = null) {
  const w = (words ?? []).map(String);
  if (cmpTriple(band, '0.84.0') < 0 && tripleOf(band) !== null) return w.some((x) => x === '--tui-mode' || x.startsWith('--tui-mode=')) ? 'dies' : 'regular';
  let flag = null;
  for (let i = 0; i < w.length; i += 1) {
    if (w[i] !== '--tui-mode') continue;
    if (w[i + 1] !== 'regular' && w[i + 1] !== 'fullscreen') return 'dies';
    flag = w[i + 1];
    i += 1;
  }
  if (flag !== null) return flag;
  const fullscreenFirst = tripleOf(band) === null || cmpTriple(band, '1.0.0') >= 0;
  if (fullscreenFirst) return setting === 'regular' ? 'regular' : 'fullscreen';
  return setting === 'fullscreen' ? 'fullscreen' : 'regular';
}

/** Whether indices 1 and 2 of an argv are Tortie's token. */
export const tokenAt1 = (argv) => Array.isArray(argv) && argv[1] === PI_TOKEN[0] && argv[2] === PI_TOKEN[1];
/** Whether an argv is SpecStory's wrap (`isWrappedArgv`'s shape, by value). */
export const wrappedArgv = (argv) => Array.isArray(argv) && argv.length >= 5 && argv[1] === 'run' && argv.includes('-c');
/** Whether an argv holds `--session-id <id>` somewhere after index 0. */
export function holdsOwnId(argv, id) {
  if (!Array.isArray(argv) || typeof id !== 'string' || id === '') return false;
  for (let i = 1; i + 1 < argv.length; i += 1) if (argv[i] === '--session-id' && argv[i + 1] === id) return true;
  return false;
}
/**
 * Whether a manifest row is one the pi pass may move (§4.2 step 3): a pi row
 * on this Mac with a conversation id, a recorded resume argv that is not a
 * wrap, holding `--session-id <its own id>` after index 0. Every other row is
 * read and never written.
 */
export const passEligible = (row) => row?.agent === 'pi' && row.local === true && typeof row.agentSessionId === 'string' && row.agentSessionId !== '' && Array.isArray(row.before) && !wrappedArgv(row.before) && holdsOwnId(row.before, row.agentSessionId);

/**
 * §4.2 step 3, by value: the resume argv a row reads after one pass at
 * `floor`. Ineligible rows and `unread` move nothing. `holds` puts the token
 * straight after argv[0] unless it is there; `below` takes it out of indices
 * 1 and 2 when it is there; nothing else moves (D14).
 */
export function passExpect(row, floor) {
  const argv = row?.before ?? null;
  if (!passEligible(row) || floor === 'unread') return argv;
  if (floor === 'holds') return tokenAt1(argv) ? argv : [argv[0], ...PI_TOKEN, ...argv.slice(1)];
  if (floor === 'below') return tokenAt1(argv) ? [argv[0], ...argv.slice(3)] : argv;
  return argv;
}
/**
 * D17, by value: what restore arms for a recorded resume argv, this Mac's pi
 * row with the token at 1 and 2 losing it while the floor does not hold.
 */
export function armExpect(argv, floor, { agent = 'pi', local = true } = {}) {
  if (agent === 'pi' && local && tokenAt1(argv) && floor !== 'holds') return [argv[0], ...argv.slice(3)];
  return argv;
}

/** A shell command line split into its words: single and double quotes and backslashes, as a POSIX shell reads them. */
export function shellWords(line) {
  const out = [];
  let word = null;
  const s = String(line ?? '');
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === "'") {
      const end = s.indexOf("'", i + 1);
      if (end === -1) return null;
      word = (word ?? '') + s.slice(i + 1, end);
      i = end;
    } else if (c === '"') {
      let j = i + 1;
      let got = '';
      while (j < s.length && s[j] !== '"') {
        if (s[j] === '\\' && j + 1 < s.length && '"\\$`'.includes(s[j + 1])) {
          got += s[j + 1];
          j += 2;
        } else {
          got += s[j];
          j += 1;
        }
      }
      if (j >= s.length) return null;
      word = (word ?? '') + got;
      i = j;
    } else if (c === '\\' && i + 1 < s.length) {
      word = (word ?? '') + s[i + 1];
      i += 1;
    } else if (c === ' ' || c === '\t') {
      if (word !== null) out.push(word);
      word = null;
    } else {
      word = (word ?? '') + c;
    }
  }
  if (word !== null) out.push(word);
  return out;
}

/** The line a restore's snapshot replay prints under the old scrollback (src/main/restore/command.ts SEPARATOR). */
export const REPLAY_MARK = 'scrollback above was restored from a snapshot';

/**
 * The command a restore typed, read off a pane's joined capture: the text
 * after the LAST prompt that has text after it (`<anything>% <command>`),
 * split into words; null when no prompt line carries a command.
 *
 * THE PROBE REVIEW: only lines BELOW the last replay mark are read. A row
 * restored before carries its old armed command in the snapshot the next
 * restore replays (snapshots are taken at End and at quit), so a capture
 * made before the shell echoed the new one read the OLD command (L4's first
 * row, restored at L3 with the token, is D13's inside-the-window restore).
 */
export function typedArgvOf(capture, cols = Number.POSITIVE_INFINITY) {
  // THE FIX ROUND: every line kept as captured beside its trimmed form. A restore that types its command before
  // zsh has drawn its prompt has zsh redraw the typeahead with HARD line breaks at the pane's width (`cols`),
  // which `-J` cannot join, so a command whose prompt line fills the width is read with each full-width line
  // below it joined as it stands: `-J` keeps the trailing space a break can fall on, and trimming each line first
  // lost it (the Mac verifier's run 1 read B, D13 and PASS as failures over a correct product). With no width
  // given nothing is joined, as before.
  let raw = String(capture ?? '').split('\n');
  let lines = raw.map((l) => l.replace(/\s+$/, ''));
  // The marks a replay PRINTS (no prompt on the line) and the replays' own typed lines (each printf names the mark).
  // A replay nests the ones before it, so a typed replay whose mark is not printed yet leaves one more typed line
  // than printed marks: it is still printing the old scrollback, and there is nothing to read yet.
  const printed = lines.flatMap((l, i) => (l.includes(REPLAY_MARK) && !l.includes('% ') ? [i] : []));
  const asked = lines.filter((l) => l.includes(REPLAY_MARK) && l.includes('% ')).length;
  if (printed.length < asked) return null;
  if (printed.length > 0) {
    raw = raw.slice(printed[printed.length - 1] + 1);
    lines = lines.slice(printed[printed.length - 1] + 1);
  }
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const at = lines[i].indexOf('% ');
    if (at === -1) continue;
    if (lines[i].slice(at + 2).trim() === '') continue;
    let text = raw[i].slice(at + 2);
    // A continuation follows a line that filled the width, and is non-empty and no prompt of its own.
    for (let k = i + 1; k < raw.length && raw[k - 1].length >= cols && lines[k] !== '' && !lines[k].includes('% ') && !lines[k].endsWith('%'); k += 1) text += raw[k];
    return shellWords(text.trim());
  }
  return null;
}

/** Whether a typed argv is a recorded one: the same program by basename, and the same words after it. */
export function typedMatches(typed, argv) {
  if (!Array.isArray(typed) || !Array.isArray(argv) || typed.length !== argv.length || typed.length === 0) return false;
  if (basename(String(typed[0])) !== basename(String(argv[0]))) return false;
  return typed.slice(1).every((w, i) => w === argv[i + 1]);
}

/** A log's reads are exactly one `PPage`. */
export const exactlyPageUp = (reads) => Array.isArray(reads) && reads.length === 1 && reads[0] === PAGE_UP_HEX;
/** A Mac's view before and after: copy mode not entered and the visible rows byte for byte. */
export const macUnchanged = (mac) => mac?.before !== undefined && mac?.after !== undefined && mac.before.inMode === 0 && mac.after.inMode === 0 && typeof mac.before.text === 'string' && mac.before.text === mac.after.text;
/** A page of history that answered rows holding the agent's numbered lines. */
export const historyPaged = (page) => page?.status === 200 && page.why === null && page.rows > 0 && page.numbered > 0;
/** One pull's page landed and moved the view by the program's own step (clamped at the top). */
export const pagedBy = (pull) => pull?.kind === 'page' && pull.answer?.outcome === 'done' && exactlyPageUp(pull.reads) && Number.isInteger(pull.before?.top) && pull.after?.top === Math.max(0, pull.before.top - pull.step);

// ---------------------------------------------------------------------------
// The graders: pure, over a recorded reading, each clause shown to fail
// ---------------------------------------------------------------------------

const deepEqual = (a, b) => J(a) === J(b);
const rowsOf = (r, f = () => true) => (r?.rows ?? []).filter(f);
const isHead = (x) => x.build === 'head';
const isFull = (x) => expectedView(x) === 'fullscreen';
/** The rows whose pull is ONE page at HEAD (§9.1): every full-screen row but the asking and leaving controls. */
const pagesAtHead = (x) => isHead(x) && isFull(x) && x.id !== 'ctl-asking' && x.id !== 'ctl-leave';
const refusedMalformed = (a) => a?.status === 200 && a.outcome === 'refused' && a.reason === 'malformed';
/**
 * THE FIX ROUND: the command a restore ran, read from the program's own hello when the restore was pressed, else
 * the typed line this file captured (the Mac verifier's run 1 read B and D13 as failures over a correct product,
 * from a typed line it could not read).
 */
export const ranOf = (x) => (Array.isArray(x?.ran) ? x.ran : Array.isArray(x?.typed) ? x.typed : null);
const doneAnswer = (a) => a?.status === 200 && a.outcome === 'done';

export const GRADERS = {
  J1: {
    title: "John's two sentences at the parent: pi has nothing above it on the phone, the Mac's wheel moves it; claude is independent both ways",
    clauses: [
      ['pi at the parent: the alternate screen, no depth, and a page of history answers moved', (r) => r.pi.picture.alternate === true && r.pi.picture.depth === null && r.pi.extraPage?.why === 'moved'],
      ["a phone page to the parent's pi answers malformed and nothing reaches it", (r) => r.piKeys.length > 0 && r.piKeys.every(refusedMalformed) && r.piKeysReads.length === 0],
      ["the Mac's real wheel moves pi's own view, and the next picture follows it", (r) => Number.isInteger(r.pi.wheel?.topBefore) && r.pi.wheel.topAfter < r.pi.wheel.topBefore && lineNumberOf(r.pi.wheel.firstAfter) === r.pi.wheel.topAfter + 1],
      ["the phone pages claude's history with the Mac's view unchanged", (r) => r.claude.pull.kind === 'history' && historyPaged(r.claude.pull.page) && macUnchanged(r.claude.pull.mac) && r.claude.pull.reads.length === 0],
      ["a Mac scroll parks claude in copy mode and the phone's first row is unchanged", (r) => r.claude.wheel?.inMode === 1 && typeof r.claude.wheel.firstBefore === 'string' && r.claude.wheel.firstBefore === r.claude.wheel.firstAfter]
    ]
  },
  J2: {
    title: "John's two sentences at HEAD: pi reads as claude reads, and a full-screen pi pages by one Page Up",
    clauses: [
      ["the door over the parent's agreement waits for no route (no Allow)", (r) => r.door.confirmState === 'confirmed' && Array.isArray(r.door.routesWaiting) && r.door.routesWaiting.length === 0],
      ["pi's argv and resume argv hold the token straight after argv[0]", (r) => tokenAt1(r.pi.argv) && tokenAt1(r.pi.resumeArgv)],
      ['pi reads as claude: a depth, its history paged, the Mac unchanged', (r) => typeof r.pi.picture.depth === 'number' && r.pi.picture.alternate === false && r.pi.pull.kind === 'history' && historyPaged(r.pi.pull.page) && macUnchanged(r.pi.pull.mac) && r.pi.pull.reads.length === 0],
      ["a Mac scroll parks pi in copy mode and the phone's first row is unchanged", (r) => r.pi.wheel?.inMode === 1 && typeof r.pi.wheel.firstBefore === 'string' && r.pi.wheel.firstBefore === r.pi.wheel.firstAfter],
      ["a pi with a person's --tui-mode fullscreen reads as the parent's pi, plus exactly one ESC[5~ a page", (r) => r.piPerson.picture.alternate === true && r.piPerson.picture.depth === null && r.piPerson.picture.pages === true && pagedBy(r.piPerson.pull)],
      ['a pi on the loopback machine reads as the parent\'s pi, plus exactly one ESC[5~ a page', (r) => r.piFar.picture.alternate === true && r.piFar.picture.depth === null && r.piFar.picture.pages === true && pagedBy(r.piFar.pull)],
      ['claude reads at HEAD as it read at the parent, both ways', (r) => r.claude.pull.kind === 'history' && historyPaged(r.claude.pull.page) && macUnchanged(r.claude.pull.mac) && r.claude.wheel?.inMode === 1 && r.claude.wheel.firstBefore === r.claude.wheel.firstAfter]
    ]
  },
  M: {
    title: "§9.1's matrix: every row here and on another machine, at the parent and at HEAD",
    clauses: [
      ["every row's stand-in drew the view its agent's own rule gives what each build composed", (r) => rowsOf(r).every((x) => x.hello?.view === expectedView(x))],
      ['the picture names the alternate screen exactly where the view is full screen, and a depth only off it', (r) => rowsOf(r).every((x) => x.picture.alternate === isFull(x) && (x.picture.depth === null) === isFull(x))],
      ['pages is offered on exactly the full-screen pictures that take keys at HEAD, and on none at the parent', (r) => rowsOf(r).every((x) => (isHead(x) ? x.picture.pages === (isFull(x) && x.picture.typable === true) : x.picture.pages !== true))],
      ['one pull on a full-screen picture at HEAD sends exactly one ESC[5~ and the program pages its own view', (r) => rowsOf(r, pagesAtHead).length > 0 && rowsOf(r, pagesAtHead).every((x) => pagedBy(x.pull))],
      ["an inline picture's pull pages tmux's history, the Mac's view unchanged and nothing typed", (r) => rowsOf(r, (x) => !isFull(x)).length > 0 && rowsOf(r, (x) => !isFull(x)).every((x) => x.pull.kind === 'history' && historyPaged(x.pull.page) && macUnchanged(x.pull.mac) && x.pull.reads.length === 0)],
      ['at the parent nothing is sent to a full-screen program', (r) => rowsOf(r, (x) => !isHead(x) && isFull(x) && x.id !== 'ctl-asking').every((x) => x.pull.kind === 'none' && x.pull.reads.length === 0)],
      ['grok takes a page only after a Tab', (r) => rowsOf(r, (x) => isHead(x) && x.id === 'grok').length > 0 && rowsOf(r, (x) => isHead(x) && x.id === 'grok').every((x) => exactlyPageUp(x.grok?.beforeTab?.reads) && x.grok.beforeTab.after.top === x.grok.beforeTab.before.top && doneAnswer(x.grok.tab))],
      ["omp's overlay takes the alternate screen and is paged by one Page Up at HEAD, and by nothing at the parent", (r) => rowsOf(r, (x) => x.id === 'omp').length > 0 && rowsOf(r, (x) => x.id === 'omp').every((x) => x.overlay?.picture?.alternate === true && (isHead(x) ? pagedBy(x.overlay.pull) : x.overlay.pull?.kind === 'none' && x.overlay.pull.reads.length === 0))],
      // THE PROBE REVIEW: `null <= 1` is true in JavaScript, so the count is asked to be a whole number first (a
      // capture that failed records null, which UNREADABLE_WHEN.M answers before this clause is asked).
      ['a program leaving full screen mid-pull takes the page, offers no more, and types at most one ~', (r) => rowsOf(r, (x) => isHead(x) && x.id === 'ctl-leave').length > 0 && rowsOf(r, (x) => isHead(x) && x.id === 'ctl-leave').every((x) => exactlyPageUp(x.leave?.first?.reads) && x.leave.after.alternate === false && x.leave.after.pages !== true && Number.isInteger(x.leave.tildes) && x.leave.tildes <= 1)],
      ['an asking picture names its question and is sent nothing', (r) => rowsOf(r, (x) => x.id === 'ctl-asking').length > 0 && rowsOf(r, (x) => x.id === 'ctl-asking').every((x) => x.picture.asking === true && x.pull.kind === 'none' && x.pull.reads.length === 0)],
      // THE FIX ROUND: report for report, the row each names left out. A full run leaves PASS's planted rows and
      // the parent's sessions in the local project when HEAD launches, so HEAD's terminal there is two rows
      // shorter and every report names another row (the Mac verifier's runs 1 and 2); the button, the column,
      // the encoding and the count are what this phase could have moved.
      ["the Mac's own wheel reads report for report as at the parent over every row whose view this phase did not move", (r) => {
        const pairs = wheelPairs(r);
        return pairs.length > 0 && pairs.every(([p, h]) => deepEqual(wheelReports(h.wheel.sent), wheelReports(p.wheel.sent)) && deepEqual(h.wheel.reads.map(wheelReports), p.wheel.reads.map(wheelReports)));
      }]
    ]
  },
  B: {
    title: "pi's bands: the token exactly where its version holds, and every restore what M1 says lives",
    clauses: [
      ["the create's argv and resume argv carry the token straight after argv[0] exactly at 0.99.2 and 1.4.0", (r) => r.bands.filter((b) => floorOf(b.band) === 'holds').length === 2 && r.bands.filter((b) => floorOf(b.band) === 'holds').every((b) => tokenAt1(b.create.argv) && tokenAt1(b.create.resumeArgv))],
      ["0.83.0's create carries no token and its pane lives inline", (r) => r.bands.filter((b) => floorOf(b.band) === 'below').length === 1 && r.bands.filter((b) => floorOf(b.band) === 'below').every((b) => !tokenAt1(b.create.argv) && !tokenAt1(b.create.resumeArgv) && b.create.alive === true && b.create.view === 'inline' && b.create.alternate === 0)],
      ["each restore's typed command draws regular by M1's table at its band, with the token exactly where the band holds", (r) => r.bands.length === BANDS.length && r.bands.every((b) => Array.isArray(ranOf(b.restore)) && m1Draws(b.band, ranOf(b.restore).slice(1)) === 'regular' && tokenAt1(ranOf(b.restore)) === (floorOf(b.band) === 'holds'))],
      ['every restored pane lives, inline', (r) => r.bands.every((b) => b.restore.alive === true && b.restore.view === 'inline' && b.restore.alternate === 0)],
      // THE PROBE REVIEW (2026-10-31): this clause once read "is armed without it (D17)". It is not D17's own strip:
      // `recorded` is the argv L2's create wrote, and by L8 L7's pass (at 0.83.0, below) has already taken the token
      // out of that row, so the restore arms a row that no longer holds it. What it holds is the end to end: a row
      // created with the token types none once pi reads 0.83.0, and lives. Restore's strip of a token still recorded
      // is driven live by PASS's unread launch (L9) and D13's window, and at `below` by the pi builder's vitest.
      ['a row created with the token, restored once pi reads 0.83.0, types none and lives', (r) => tokenAt1(r.belowRestore.recorded) && Array.isArray(ranOf(r.belowRestore)) && typedMatches(ranOf(r.belowRestore), armExpect(r.belowRestore.recorded, 'below')) && r.belowRestore.alive === true && r.belowRestore.view === 'inline']
    ]
  },
  D13: {
    title: 'the version read before it decides: no restore before the scan answers is worse than today',
    clauses: [
      ["inside the window the restore's typed command has no token, and the pane lives", (r) => Array.isArray(ranOf(r.head.inside)) && tokenAt1(r.head.inside.recorded) && !tokenAt1(ranOf(r.head.inside)) && typedMatches(ranOf(r.head.inside), armExpect(r.head.inside.recorded, 'unread')) && r.head.inside.alive === true],
      ["after the scan answered the next restore's typed command has the token", (r) => Array.isArray(ranOf(r.head.after)) && tokenAt1(ranOf(r.head.after)) && typedMatches(ranOf(r.head.after), r.head.after.recorded)],
      ['a phone start inside the window composes no token', (r) => r.head.phoneStart.outcome === 'done' && r.head.phoneStart.inside === true && Array.isArray(r.head.phoneStart.argv) && !tokenAt1(r.head.phoneStart.argv)],
      ["at HEAD no stand-in -v before the window's first terminal bytes, and one between them and this file's own ask (D18)", (r) => {
        const starts = (r.head.versions ?? []).filter((v) => v.phase === 'start');
        return starts.every((v) => v.at >= r.head.firstBytesAt) && starts.some((v) => v.at >= r.head.firstBytesAt && v.at < r.head.askAt);
      }],
      ["at the parent no stand-in -v until this file's own ask", (r) => (r.parent.versions ?? []).filter((v) => v.phase === 'start').every((v) => v.at >= r.parent.askAt)]
    ]
  },
  PASS: {
    title: "the rows already written: pi's pass, byte for byte, at every floor, and every planted row restored after",
    clauses: [
      ['where the floor holds every eligible pi row gains the token straight after argv[0], and nothing else moves', (r) => launchesAt(r, 'holds').length > 0 && launchesAt(r, 'holds').every((l) => l.rows.filter(passEligible).every((row) => deepEqual(row.after, passExpect(row, 'holds'))))],
      ['below the floor the token Tortie put after argv[0] comes out, and nothing else moves', (r) => launchesAt(r, 'below').length > 0 && launchesAt(r, 'below').every((l) => l.rows.filter(passEligible).every((row) => deepEqual(row.after, passExpect(row, 'below'))))],
      ['on a version the scan could not read no row moves', (r) => launchesAt(r, 'unread').length > 0 && launchesAt(r, 'unread').every((l) => l.rows.every((row) => deepEqual(row.after, row.before)))],
      ['a row on another machine, wrapped, with no id, or whose argv lacks its own id never moves', (r) => r.launches.every((l) => l.floor === 'unread' || l.rows.filter((row) => !passEligible(row)).every((row) => deepEqual(row.after, row.before)))],
      ['every planted row restored after arms what it records, less the token while the floor does not hold', (r) => r.launches.some((l) => l.restores.length > 0) && r.launches.every((l) => l.restores.every((x) => Array.isArray(ranOf(x)) && typedMatches(ranOf(x), armExpect(x.recorded, l.floor))))]
    ]
  },
  GRACE: {
    title: "a page is a key, and its repaint is not work; the desk's wheel as it was",
    clauses: [
      ['one phone page reached the idle pi at HEAD as exactly one ESC[5~', (r) => doneAnswer(r.head.page) && exactlyPageUp(r.head.reads)],
      [`the row never read working in the ${String(GRACE_WINDOW_MS / 1000)} s after the page`, (r) => r.head.samples.length >= GRACE_MIN_SAMPLES && !r.head.samples.includes(WORKING_STATUS)],
      ["the desk's wheel over it reads working at both builds, as it did", (r) => r.head.wheel.samples.includes(WORKING_STATUS) && r.parent.wheel.samples.includes(WORKING_STATUS)]
    ]
  },
  RP: {
    title: "the parent's door: no page offered, a page refused, nothing typed",
    clauses: [
      ["the parent's full-screen picture offers no pages", (r) => r.picture.alternate === true && r.picture.pages !== true],
      ['the parent answers each page key malformed', (r) => r.answers.length === 2 && r.answers.every(refusedMalformed)],
      ['nothing reached the program', (r) => Array.isArray(r.reads) && r.reads.length === 0]
    ]
  },
  RUN: {
    title: "no real Tailscale, no real DNS, no vendor agent, nothing of his server moved, nothing left",
    clauses: [
      ['the Tailscale preflight passed', (r) => r.tailscalePreflight === true],
      ['the DNS preflight passed at every launch', (r) => r.dnsPreflights.length > 0 && r.dnsPreflights.every(Boolean)],
      ['the hidden agents held at every launch, and no shadow copy of a stand-in sat where the scan looks', (r) => r.agentsHeld.length > 0 && r.agentsHeld.every(Boolean) && r.shadows.length > 0 && r.shadows.every((s) => s.ok === true)],
      ['every stand-in resolved to this run, here and on the machine, and no hidden one resolved', (r) => r.resolved === true && r.hiddenUnresolved === true && r.farResolved === true],
      ['every session the manifest holds ran a program of this run', (r) => r.manifest?.read === true && Array.isArray(r.manifest.outside) && r.manifest.outside.length === 0],
      ['every agent session the run started was read with its argv[0] inside the run', (r) => r.started.length > 0 && r.started.every((s) => typeof s.argv0 === 'string' && r.roots.some((root) => within(root, s.argv0)))],
      // HIS RULING OF 2 NOVEMBER 2026: the standard form. Each launch names this run's own socket, so the helper's
      // census reads his session names before and after it, read only, and a launch it returned from saw no change.
      ["every launch named this run's own socket, and the helper's census of his session names saw no change across it", (r) => typeof r.socket === 'string' && /^gmux-p350/.test(r.socket) && r.launches.length > 0 && r.launches.every((l) => l.tmuxSocket === r.socket && l.census === 'no change')],
      ['no real Tailscale in any sample, and nothing forbidden at the stand-in', (r) => r.realTailscale === 0 && r.samples > 0 && r.forbidden === 0],
      ['every stand-in and Electron ended, and nothing of this run is left', (r) => r.standinLeft === 0 && r.agentsLeft === 0 && r.runLeft === 0 && r.electronsLeft === 0],
      ['his shell history did not move across the run, or moved again while the run started nothing', (r) => ['unmoved', 'his terminal'].includes(historyHeld(r.history))]
    ]
  }
};

/** The launches of a PASS reading at one floor. */
export const launchesAt = (r, floor) => (r?.launches ?? []).filter((l) => l.floor === floor);
/**
 * THE FIX ROUND. A wheel's bytes (hex) as the reports they are, each with the
 * ROW it names left out: SGR `ESC[<b;x;yM` (or `m`), urxvt `ESC[b;x;yM`, the
 * legacy `ESC[M` and its three bytes, and every other byte as itself (an arrow
 * key's `ESC [ A` stays three bytes). Two wheels turned over terminals of one
 * width and two heights read alike exactly when only the row moved.
 */
export function wheelReports(hex) {
  const text = Buffer.from(String(hex ?? ''), 'hex').toString('latin1');
  const out = [];
  for (let i = 0; i < text.length; ) {
    const rest = text.slice(i);
    const sgr = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])/.exec(rest);
    if (sgr !== null) {
      out.push(`sgr ${sgr[1]} ${sgr[2]} ${sgr[4]}`);
      i += sgr[0].length;
      continue;
    }
    const urxvt = /^\x1b\[(\d+);(\d+);(\d+)M/.exec(rest);
    if (urxvt !== null) {
      out.push(`urxvt ${urxvt[1]} ${urxvt[2]}`);
      i += urxvt[0].length;
      continue;
    }
    if (rest.startsWith('\x1b[M') && rest.length >= 6) {
      out.push(`x10 ${String(rest.charCodeAt(3))} ${String(rest.charCodeAt(4))}`);
      i += 6;
      continue;
    }
    out.push(`byte ${rest.charCodeAt(0).toString(16)}`);
    i += 1;
  }
  return out;
}

/** A terminal's `<cols>x<rows>` geometry, its width alone. */
export const colsOf = (geometry) => String(geometry ?? '').split('x')[0] ?? '';

/**
 * M's (parent, HEAD) reading pairs of one row and place whose stand-in held
 * the same view when the desk's wheel turned at both builds (its own state at
 * that moment): pi on this Mac is inline at HEAD by this phase, and the
 * leaving control is a shell prompt at HEAD once its page was taken.
 */
export function wheelPairs(r) {
  const out = [];
  for (const h of rowsOf(r, isHead)) {
    const p = rowsOf(r, (x) => !isHead(x) && x.id === h.id && x.place === h.place)[0];
    if (p !== undefined && p.wheel !== null && h.wheel !== null && p.wheel?.view === h.wheel?.view) out.push([p, h]);
  }
  return out;
}

/**
 * Whether his shell history held across the run (his rule of 2026-10-20):
 * `unmoved`; `his terminal` when it moved and moved again over a quiet wait in
 * which this run started nothing; `held` when it moved and then held still,
 * which is this run's write; `unread` when it moved and was never read again.
 */
export function historyHeld(history) {
  if (history?.before === history?.after) return 'unmoved';
  if (history?.quiet === null || history?.quiet === undefined || typeof history.quiet.again !== 'string') return 'unread';
  return history.quiet.again !== history.after ? 'his terminal' : 'held';
}

/** Every key M must hold, at both builds. */
export const MATRIX_KEYS = Object.freeze(MATRIX.flatMap((m) => ['parent', 'head'].map((build) => `${build}:${rowKey(m)}`)));

/**
 * THE PROBE REVIEW (2026-10-31), what a missing read RECORDS, so it is asked
 * by UNREADABLE_WHEN and never graded: `macWheel` records a first row `null`
 * when the picture before or after the wheel was never read (it recorded `''`,
 * which `'' === ''` passed); the RP, J1 and GRACE logs are `null` when the
 * stand-in never said hello (they were `[]`, which "nothing reached it"
 * passed); a status sample is `null` when `sessions:list` did not answer (a
 * list of them passed "never read working"); the leaving control's `~` count
 * is `null` when its capture failed (`null <= 1` passed); a page pull marks a
 * picture it could not read (`read: false`). Readings written before the
 * review carry no `read`, and only an explicit `false` is asked.
 */
const firstRowsRead = (w) => typeof w?.firstBefore === 'string' && typeof w?.firstAfter === 'string';
const pullUnread = (p) => p?.kind === 'page' && (p.before?.read === false || p.after?.read === false);
/** Every status sample a list holds was read (a status word, never `null`). */
const samplesRead = (samples) => Array.isArray(samples) && samples.every((s) => typeof s === 'string');
/** The `-v` calls of one D13 half that STARTED. */
const versionStarts = (half) => (half?.versions ?? []).filter((v) => v?.phase === 'start');

/**
 * A reading missing what an arm's clauses need is UNREADABLE, never a pass and
 * never the product's failure (docs/method/HOW-WE-BUILT-THIS.md rule 9). Each
 * entry answers why, or null when the reading can be graded.
 */
export const UNREADABLE_WHEN = {
  J1: (r) =>
    r.pi === null || r.pi === undefined || r.claude === null || r.claude === undefined
      ? 'the parent never drove its pi or its claude row'
      : r.pi.picture === null || r.claude.picture === null
        ? 'a picture was never read'
        : r.pi.extraPage === null || r.pi.extraPage === undefined
          ? "pi's history page was never asked"
          : r.pi.wheel === null || r.claude.wheel === null
            ? "the Mac's wheel was never turned over pi or claude"
            : !firstRowsRead(r.claude.wheel)
              ? "the phone's picture of claude before or after the Mac's wheel was never read"
              : !Number.isInteger(r.pi.wheel.topBefore) || !Number.isInteger(r.pi.wheel.topAfter) || typeof r.pi.wheel.firstAfter !== 'string'
                ? "pi's own view or the phone's next picture around the Mac's wheel was never read"
                : !Array.isArray(r.piKeys) || !Array.isArray(r.piKeysReads)
                  ? "the phone's page to the parent's pi was never read"
                  : null,
  J2: (r) =>
    ['pi', 'piPerson', 'piFar', 'claude'].some((k) => r[k] === null || r[k] === undefined || r[k].picture === null)
      ? 'a row J2 reads was never driven, or its picture never read'
      : r.door === null || r.door === undefined
        ? "the door's status was never read at HEAD"
        : r.pi.wheel === null || r.claude.wheel === null
          ? "the Mac's wheel was never turned over pi or claude at HEAD"
          : !firstRowsRead(r.pi.wheel) || !firstRowsRead(r.claude.wheel)
            ? "the phone's picture of pi or claude before or after the Mac's wheel was never read at HEAD"
            : pullUnread(r.piPerson.pull) || pullUnread(r.piFar.pull)
              ? 'a picture around a full-screen pi\'s page was never read'
              : null,
  M: (r) => {
    const have = new Set(rowsOf(r).map((x) => `${x.build}:${rowKey(x)}`));
    const missing = MATRIX_KEYS.filter((k) => !have.has(k));
    if (missing.length > 0) return `the matrix was not read over ${J(missing.slice(0, 6))}${missing.length > 6 ? ` and ${String(missing.length - 6)} more` : ''}`;
    for (const x of rowsOf(r)) {
      if (x.error !== undefined && x.error !== null) return `${x.build} ${rowKey(x)} stopped: ${String(x.error)}`;
      if (x.hello === null || x.hello === undefined) return `${x.build} ${rowKey(x)}'s stand-in never said hello`;
      if (x.picture === null || x.picture === undefined) return `${x.build} ${rowKey(x)}'s picture was never read`;
      if (x.pull === null || x.pull === undefined) return `${x.build} ${rowKey(x)}'s pull was never made`;
      // THE PROBE REVIEW: the reads a clause would otherwise take as "nothing moved" or "at most one ~".
      if (pullUnread(x.pull) || pullUnread(x.grok?.beforeTab) || pullUnread(x.overlay?.pull)) return `${x.build} ${rowKey(x)}: a picture around its page was never read`;
      if (x.id === 'grok' && x.grok !== undefined && (!Number.isInteger(x.grok.beforeTab?.before?.top) || !Number.isInteger(x.grok.beforeTab?.after?.top))) return `${x.build} ${rowKey(x)}: grok's view around its page before the Tab was never read`;
      if (x.id === 'omp' && x.overlay !== undefined && (x.overlay.picture === null || x.overlay.picture === undefined)) return `${x.build} ${rowKey(x)}: the overlay's picture was never read`;
      if (x.id === 'ctl-leave' && x.leave !== undefined && !Number.isInteger(x.leave.tildes)) return `${x.build} ${rowKey(x)}: the screen was never captured for its ~`;
    }
    for (const [p, h] of wheelPairs(r)) {
      // THE FIX ROUND: the reports are compared with their rows left out, so only another WIDTH, which moves the
      // column every report names, leaves them with nothing to compare.
      if (colsOf(p.wheel.geometry) !== colsOf(h.wheel.geometry)) return `the Mac's wheel over ${rowKey(h)} turned over a ${String(p.wheel.geometry)} terminal at the parent and ${String(h.wheel.geometry)} at HEAD, another width, so its reports cannot be compared`;
    }
    return null;
  },
  B: (r) =>
    !Array.isArray(r.bands) || BANDS.some((band) => !r.bands.some((b) => b.band === band))
      ? `a band was never launched (${J((r.bands ?? []).map((b) => b.band))})`
      : r.bands.some((b) => b.create === null || b.restore === null || b.create === undefined || b.restore === undefined)
        ? 'a band was launched and its create or its restore was never read'
        : r.belowRestore === null || r.belowRestore === undefined
          ? 'no row recorded with the token was restored below the floor'
          : // THE FIX ROUND: a restore whose command neither its program's hello nor this file's capture read
            // is no reading of what it typed (docs/method rule 9), never the product's failure.
            r.bands.some((b) => ranOf(b.restore) === null) || ranOf(r.belowRestore) === null
            ? 'a restore ran a command that neither its program nor this file read'
            : null,
  D13: (r) =>
    r.head === null || r.head === undefined || r.parent === null || r.parent === undefined
      ? 'a half of D13 never ran'
      : r.head.inside === null || r.head.after === null || r.head.phoneStart === null
        ? 'a restore or the phone start inside the window was never read'
        : // THE FIX ROUND: as B's.
          ranOf(r.head.inside) === null || ranOf(r.head.after) === null
          ? 'a restore ran a command that neither its program nor this file read'
        : r.head.inside.scanAnswered === true
          ? 'the first restore landed after the scan answered, so it was not inside the window (no reading of D13)'
          : r.head.phoneStart.inside !== true && r.head.phoneStart.outcome === 'done'
            ? 'the phone start landed after the scan answered, so it was not inside the window'
            : !Number.isFinite(r.head.firstBytesAt) || !Number.isFinite(r.head.askAt) || !Number.isFinite(r.parent.askAt)
              ? 'the first terminal bytes or an ask were never stamped'
              : // THE PROBE REVIEW: each half's scan runs pi's `-v` at least once by the end (this file's own ask
                // starts one where nothing did), so a half whose log holds none witnessed nothing, and "no -v
                // before the ask" would pass over an empty list.
                versionStarts(r.parent).length === 0 || versionStarts(r.head).length === 0
                ? "the stand-in's version log holds no pi -v for a half, so it witnessed no scan"
                : null,
  PASS: (r) =>
    !Array.isArray(r.launches) || r.launches.length === 0
      ? 'no HEAD launch read the rows before and after'
      : r.launches.some((l) => l.rows.some((row) => row.after === undefined))
        ? 'a row was read before a pass and never after'
        : !r.launches.some((l) => l.rows.some((row) => passEligible(row)))
          ? 'no pi row the pass may move was ever read'
          : // THE PROBE REVIEW: each floor's clause asks EVERY launch at that floor, so a floor never launched, or a
            // holds or below launch that read no row the pass may move, would pass (or fail) over nothing.
            ['holds', 'below', 'unread'].find((f) => launchesAt(r, f).length === 0) !== undefined
            ? `no launch read the rows at ${String(['holds', 'below', 'unread'].find((f) => launchesAt(r, f).length === 0))}`
            : r.launches.find((l) => l.floor !== 'unread' && !l.rows.some(passEligible)) !== undefined
              ? `${String(r.launches.find((l) => l.floor !== 'unread' && !l.rows.some(passEligible)).label)} read no pi row the pass may move`
              : // THE FIX ROUND: a planted row's restore whose typed command this file could not read is no reading of
                // what it armed (docs/method rule 9), never the product's failure.
                r.launches.some((l) => (l.restores ?? []).some((x) => ranOf(x) === null))
                ? 'a planted row was restored and its typed command was never read'
                : null,
  GRACE: (r) =>
    r.head === null || r.head === undefined || r.parent === null || r.parent === undefined
      ? 'a half of GRACE never ran'
      : r.head.settled !== true || r.parent.settled !== true
        ? 'the full-screen pi never read idle before the page or the wheel, so a working status could be its own drawing'
        : // THE PROBE REVIEW: a status sample is null when sessions:list did not answer, which "never read
          // working" took for idle; the page's own picture and log are asked too.
          r.head.pictured === false || !Array.isArray(r.head.reads)
          ? "the idle pi's picture before the page, or its log after it, was never read"
          : !samplesRead(r.head.samples)
            ? 'a status sample after the page was never read'
            : [r.head, r.parent].some((h) => !h.wheel?.samples?.includes(WORKING_STATUS) && !samplesRead(h.wheel?.samples))
              ? "a status sample after the desk's wheel was never read, and none read working"
              : null,
  RP: (r) =>
    r.picture === null || r.picture === undefined
      ? "the parent's pi picture was never read"
      : !Array.isArray(r.answers)
        ? 'no page was sent to the parent'
        : !Array.isArray(r.reads)
          ? "the parent's pi never said hello, so its log was never read"
          : null,
  RUN: (r) =>
    r.manifest?.read !== true
      ? `the manifest could not be read after the app was gone (${String(r.manifest?.why ?? 'no reading')})`
      : Array.isArray(r.agentsHeld) && Array.isArray(r.shadows) && r.agentsHeld.length < r.shadows.filter((s) => s?.ok === true).length
        ? "a launch past its shadow refusal never read its own agents:list, so whether an agent ran there for its version is not known"
        : typeof r.history?.before !== 'string' || typeof r.history?.after !== 'string' || r.history.before.split('|').includes('none') || r.history.after.split('|').includes('none')
          ? `his shell history could not be read (${J(r.history ?? null)})`
          : historyHeld(r.history) === 'unread'
            ? 'his shell history moved and was not read again after the quiet wait'
            : null
};

/** One arm's verdict, UNREADABLE asked first: `{ state: 'pass' | 'fail' | 'unreadable', failed, why }`. */
export function verdictOf(id, reading) {
  if (reading === null || reading === undefined || typeof reading !== 'object') return { state: 'unreadable', failed: [], why: 'there is no reading' };
  let why = null;
  try {
    why = UNREADABLE_WHEN[id]?.(reading) ?? null;
  } catch (err) {
    why = `the reading could not be asked whether it is whole (${String(err?.message ?? err)})`;
  }
  if (why !== null) return { state: 'unreadable', failed: [], why };
  const g = grade(id, reading);
  return { state: g.ok ? 'pass' : 'fail', failed: g.failed, why: null };
}

/** One arm's verdict: `{ ok, failed }`. A clause that throws is a failed clause. */
export function grade(id, reading) {
  const failed = [];
  for (const [name, predicate] of GRADERS[id].clauses) {
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

// ---------------------------------------------------------------------------
// --grader-self-test: every grader on build/p350/fixtures/graders.json, and
// the pure readers on texts of their own. Starts nothing.
// ---------------------------------------------------------------------------

/** The recorded fixtures every grader is held to. */
export const GRADER_FIXTURES = join(ROOT, 'build', 'p350', 'fixtures', 'graders.json');

/** A dotted path into a reading: its parent and the last key (a number for an array index). */
function at(obj, path) {
  const keys = String(path).split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[/^\d+$/.test(k) ? Number(k) : k];
  const last = keys[keys.length - 1];
  return { o, k: /^\d+$/.test(last) ? Number(last) : last };
}

/** Apply a broken fixture's ops to a copy of the honest reading: `set`, `push`, `delete`, `swap`. */
export function applyOps(reading, ops) {
  for (const op of ops) {
    if (op.set !== undefined) {
      const { o, k } = at(reading, op.set);
      o[k] = structuredClone(op.value);
    } else if (op.push !== undefined) {
      const { o, k } = at(reading, op.push);
      o[k].push(structuredClone(op.value));
    } else if (op.delete !== undefined) {
      const { o, k } = at(reading, op.delete);
      if (Array.isArray(o)) o.splice(k, 1);
      else delete o[k];
    } else if (op.swap !== undefined) {
      const a = at(reading, op.swap[0]);
      const b = at(reading, op.swap[1]);
      const t = a.o[a.k];
      a.o[a.k] = b.o[b.k];
      b.o[b.k] = t;
    } else throw new Error(`an op this reader does not know: ${J(op)}`);
  }
  return reading;
}

/** The index of a matrix row in an M reading, for a broken fixture's paths (`rows.<i>`). */
export const rowIndexOf = (r, build, place, id) => (r?.rows ?? []).findIndex((x) => x.build === build && x.place === place && x.id === id);

function graderSelfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  let fixtures = null;
  try {
    fixtures = JSON.parse(readFileSync(GRADER_FIXTURES, 'utf8'));
  } catch (err) {
    say(false, `${GRADER_FIXTURES.slice(ROOT.length + 1)} does not read: ${String(err?.message ?? err)}`);
  }
  let clauses = 0;
  if (fixtures !== null) {
    const honest = fixtures.honest ?? {};
    const broken = Array.isArray(fixtures.broken) ? fixtures.broken : [];
    say(Object.keys(honest).length + broken.length === fixtures.readings, `the fixtures hold ${String(Object.keys(honest).length + broken.length)} readings, as their own count says (${String(fixtures.readings)})`);
    // 1. Every grader's honest reading passes.
    for (const id of Object.keys(GRADERS)) {
      const v = verdictOf(id, structuredClone(honest[id]));
      say(v.state === 'pass', `${id}'s honest reading passes${v.state === 'pass' ? '' : ` (it read ${v.state}: ${J(v.failed)} ${v.why ?? ''})`}`);
    }
    // 2. Every broken reading answers exactly what it names. A path may name a matrix row as
    //    `rows.@<build>:<place>:<id>`, resolved against the honest reading.
    const sole = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
    const unreadableSeen = new Set();
    for (const c of broken) {
      if (GRADERS[c.arm] === undefined) {
        say(false, `the broken reading "${String(c.name)}" names ${J(c.arm)}, which is no arm`);
        continue;
      }
      const unknown = (c.mustFail ?? []).filter((name) => !GRADERS[c.arm].clauses.some(([cl]) => cl === name));
      if (unknown.length > 0) {
        say(false, `${c.arm} "${c.name}" names ${J(unknown)}, which no clause of its grader is`);
        continue;
      }
      let v;
      try {
        const base = structuredClone(honest[c.arm]);
        const ops = (c.ops ?? []).map((op) => resolveRowPaths(base, op));
        v = verdictOf(c.arm, applyOps(base, ops));
      } catch (err) {
        say(false, `${c.arm} "${c.name}" could not be applied: ${String(err?.message ?? err)}`);
        continue;
      }
      const want = J([...(c.mustFail ?? [])].sort());
      const got = J([...v.failed].sort());
      const right = c.expect === 'fail' ? v.state === 'fail' && want === got : v.state === c.expect;
      say(right, `${c.arm} answers ${String(c.expect).toUpperCase()}${c.expect === 'fail' ? ` on exactly ${want}` : ''} for: ${c.name}${right ? '' : ` (it read ${v.state}: ${got} ${v.why ?? ''})`}`);
      if (right && c.expect === 'fail' && (c.mustFail ?? []).length === 1) sole.get(c.arm).add(c.mustFail[0]);
      if (right && c.expect === 'unreadable') unreadableSeen.add(c.arm);
    }
    // 3. Every clause that can say FAIL is shown red on a broken reading of its own.
    for (const [id, g] of Object.entries(GRADERS)) {
      for (const [name] of g.clauses) {
        clauses += 1;
        say(sole.get(id).has(name), `${id}: "${name}" goes red on a broken reading of its own`);
      }
    }
    // 4. Every UNREADABLE rule is shown on a reading of its own.
    for (const id of Object.keys(UNREADABLE_WHEN)) say(unreadableSeen.has(id), `${id}: a reading missing what its clauses need reads UNREADABLE, never a pass or a failure`);
    // 5. The honest M reading covers the whole matrix, both builds.
    say(MATRIX_KEYS.every((k) => (honest.M?.rows ?? []).some((x) => `${x.build}:${rowKey(x)}` === k)), `the honest M reading holds every row of the matrix at both builds (${String(MATRIX_KEYS.length)})`);
  }
  // M1, this file's own reading, against the stand-in's (two transcriptions of one table must agree).
  {
    const words = [[], ['--tui-mode', 'regular'], ['--tui-mode', 'regular', '--session-id', 'U'], ['--tui-mode', 'regular', '--session-id', 'U', '--tui-mode', 'fullscreen'], ['--session-id', 'U', '--tui-mode', 'fullscreen'], ['--tui-mode'], ['--tui-mode', 'wide'], ['--tui-mode=regular']];
    const settings = [null, 'fullscreen', 'regular', 'other'];
    const bands = ['0.83.0', '0.84.0', '0.99.2', '1.0.0', '1.4.0', '10.0.0', UNREAD_BAND];
    const differ = [];
    for (const b of bands) for (const w of words) for (const s of settings) {
      const mine = m1Draws(b, w, s);
      const theirs = piModeOf(b, w, s);
      const norm = theirs === 'dies-after-trust' || theirs === 'dies-invalid' ? 'dies' : theirs;
      if (mine !== norm) differ.push([b, w, s, mine, theirs]);
    }
    say(differ.length === 0, `m1Draws and the stand-in's piModeOf agree over ${String(bands.length * words.length * settings.length)} cases${differ.length === 0 ? '' : ` (differ: ${J(differ.slice(0, 4))})`}`);
  }
  // The stand-in's own rules against SPEC §8.1, by value: every row's switch and the modes its full screen asks for.
  {
    const SPEC_FULL = { claude: [1000, 1002, 1003, 1006], codex: [1007], gemini: [1002, 1006], deepseek: [1000, 1002, 1003, 1015, 1006], antigravity: [1000, 1006], qwen: [1002, 1006], grok: [1000, 1002, 1003, 1015, 1006], opencode: [1000, 1002, 1003, 1006], omp: [1000, 1003, 1006], legacy1000: [1000], altonly: [] };
    const tmux = { TMUX: '/tmp/tmux-501/x,1,0' };
    const m = (agent, argv = [], env = {}, own = {}, band = '1.4.0') => modeOf({ agent, argv, env, own, band, setting: null });
    const cases = [
      ['claude under CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1 is inline', m('claude', [], { CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN: '1' }).view === 'inline'],
      ['claude without it draws 1049 and 1000/1002/1003/1006', m('claude').view === 'fullscreen' && J(m('claude').setModes) === J(SPEC_FULL.claude)],
      ['codex with -c tui.fullscreen_transcript=false is inline', m('codex', ['-c', 'tui.fullscreen_transcript=false']).view === 'inline'],
      ["codex with a person's later =true draws 1049 and 1007, no mouse", m('codex', ['-c', 'tui.fullscreen_transcript=false', '-c', 'tui.fullscreen_transcript=true']).view === 'fullscreen' && J(m('codex', []).setModes) === J(SPEC_FULL.codex)],
      ['gemini is inline, and --opted-in draws 1049 and 1002/1006', m('gemini').view === 'inline' && J(m('gemini', [], {}, { optedIn: true }).setModes) === J(SPEC_FULL.gemini)],
      ['cursor, muse, omp and droid are inline', ['cursor', 'muse', 'omp', 'droid'].every((a) => m(a).view === 'inline')],
      ['deepseek, antigravity (assumed), qwen, grok and opencode draw their recorded modes', ['deepseek', 'antigravity', 'qwen', 'grok', 'opencode'].every((a) => m(a).view === 'fullscreen' && J(m(a).setModes) === J(SPEC_FULL[a]))],
      ["pi 1.4.0 with no flag under TMUX draws 1049, ?7l and 1000/1002/1004/1006, and pages by rows - 4", m('pi', [], tmux).view === 'fullscreen' && J(m('pi', [], tmux).setModes) === J([-7, 1000, 1002, 1004, 1006]) && m('pi', [], tmux).page === 'rows-4' && J(m('pi', [], {}).setModes) === J([-7])],
      ["pi below 0.84.0 with Tortie's token dies after its trust ask", m('pi', [...PI_TOKEN, '--session-id', 'U'], tmux, {}, '0.83.0').view === 'dies-after-trust'],
      ['the controls: legacy1000 is 1000 alone, altonly no mouse, leave-on-page and asking full screen', J(m('p350', [], {}, { mode: 'legacy1000' }).setModes) === J(SPEC_FULL.legacy1000) && J(m('p350', [], {}, { mode: 'altonly' }).setModes) === J([]) && m('p350', [], {}, { mode: 'leave-on-page' }).view === 'fullscreen' && m('p350', [], {}, { mode: 'asking' }).view === 'fullscreen'],
      ["omp's overlay asks 1000/1003/1006", J(FULLSCREEN_MOUSE.omp) === J(SPEC_FULL.omp)],
      ["the version lines carry each row's identity: Claude Code's (Claude Code), omp's omp/, grok's grok , pi's a bare semver", versionLineOf('claude').includes('(Claude Code)') && versionLineOf('omp').includes('omp/') && versionLineOf('grok').includes('grok ') && versionLineOf('pi', '0.99.2') === '0.99.2']
    ];
    for (const [text, ok] of cases) say(ok === true, `stand-in: ${text}`);
  }
  // Every resting screen is a question by neither its label nor either verdict; the asking control's is one by both.
  {
    const bad = Object.entries(SCREENS).filter(([, id]) => id !== null).flatMap(([agent, id]) => screenProblems(id).map((p) => `${agent}: ${p}`));
    say(bad.length === 0, `every row's resting screen is a not-question its verdicts agree with${bad.length === 0 ? '' : ` (${J(bad)})`}`);
    say(screenProblems(SPEC_GEMINI_SCREEN).length > 0 && SCREENS.gemini !== SPEC_GEMINI_SCREEN, `SPEC §9.1's ${SPEC_GEMINI_SCREEN} is read as a question by its own verdicts, so gemini rests on ${String(SCREENS.gemini)} (the stand-in's correction)`);
    const asking = loadScreen(ASKING_SCREEN);
    say(asking !== null && asking.label === 'question' && asking.verdicts?.parent === true && asking.verdicts?.head === true, `the asking control's ${ASKING_SCREEN} is a question by its label and both verdicts`);
  }
  // M1's table (SPEC §2.1), cell by cell.
  {
    const t = (b, w, s) => m1Draws(b, w, s);
    const cells = [
      ['0.83.0', [], null, 'regular'], ['0.83.0', PI_TOKEN, null, 'dies'], ['0.83.0', [], 'fullscreen', 'regular'],
      ['0.99.2', [], null, 'regular'], ['0.99.2', PI_TOKEN, null, 'regular'], ['0.99.2', [...PI_TOKEN, '--tui-mode', 'fullscreen'], null, 'fullscreen'], ['0.99.2', [], 'fullscreen', 'fullscreen'],
      ['1.4.0', [], null, 'fullscreen'], ['1.4.0', PI_TOKEN, null, 'regular'], ['1.4.0', [], 'regular', 'regular'], ['1.4.0', PI_TOKEN, 'fullscreen', 'regular'], ['1.4.0', [...PI_TOKEN, '--session-id', 'U', '--tui-mode', 'fullscreen'], 'fullscreen', 'fullscreen']
    ];
    const wrong = cells.filter(([b, w, s, want]) => t(b, w, s) !== want);
    say(wrong.length === 0, `m1Draws reads M1's table cell by cell${wrong.length === 0 ? '' : ` (wrong: ${J(wrong)})`}`);
    say(floorOf('0.83.9') === 'below' && floorOf('0.84.0') === 'holds' && floorOf('0.84.2') === 'holds' && floorOf('1.4.0') === 'holds' && floorOf('10.0.0') === 'holds' && floorOf(UNREAD_BAND) === 'unread' && floorOf('') === 'unread' && floorOf(null) === 'unread', 'floorOf: below, holds and unread over D25\'s readings');
  }
  // §4.2 step 3 and D17, by value, over M2's planted rows (SPEC §2.2).
  {
    const U = '0f3c5d1e-0000-4000-8000-00000000000a';
    const row = (before, extra = {}) => ({ agent: 'pi', local: true, agentSessionId: U, before, ...extra });
    const R1 = ['pi', '--session-id', U];
    const R2 = ['pi', '--session-id', U, '--model', 'm'];
    const R3 = ['pi', '--session-id', U, '--tui-mode', 'fullscreen'];
    const R4 = ['pi', '--tui-mode', 'regular', '--session-id', U, '--model', 'm'];
    const R5 = ['pi', '--tui-mode', 'regular', '--session-id', U, '--tui-mode', 'fullscreen'];
    say(deepEqual(passExpect(row(R1), 'holds'), ['pi', '--tui-mode', 'regular', '--session-id', U]) && deepEqual(passExpect(row(R2), 'holds'), ['pi', '--tui-mode', 'regular', '--session-id', U, '--model', 'm']) && deepEqual(passExpect(row(R3), 'holds'), ['pi', '--tui-mode', 'regular', '--session-id', U, '--tui-mode', 'fullscreen']) && deepEqual(passExpect(row(R4), 'holds'), R4), 'passExpect at holds: the token in at index 1, a person\'s flag kept, a row already right byte identical');
    say(deepEqual(passExpect(row(R4), 'below'), ['pi', '--session-id', U, '--model', 'm']) && deepEqual(passExpect(row(R5), 'below'), R3) && deepEqual(passExpect(row(R1), 'below'), R1) && deepEqual(passExpect(row(R3), 'below'), R3), 'passExpect below: the token out of indices 1 and 2 only, a person\'s --tui-mode untouched');
    say([R1, R4].every((a) => deepEqual(passExpect(row(a), 'unread'), a)) && deepEqual(passExpect(row(R1, { local: false }), 'holds'), R1) && deepEqual(passExpect(row(R1, { agentSessionId: null }), 'holds'), R1) && deepEqual(passExpect(row(['pi', '--session-id', 'other']), 'holds'), ['pi', '--session-id', 'other']) && deepEqual(passExpect(row(['specstory', 'run', 'pi', '--no-cloud-sync', '-c', `pi --session-id ${U}`]), 'holds'), ['specstory', 'run', 'pi', '--no-cloud-sync', '-c', `pi --session-id ${U}`]), 'passExpect moves nothing unread, on another machine, with no id, without its own id, or wrapped');
    say(deepEqual(armExpect(R4, 'unread'), ['pi', '--session-id', U, '--model', 'm']) && deepEqual(armExpect(R4, 'below'), ['pi', '--session-id', U, '--model', 'm']) && deepEqual(armExpect(R4, 'holds'), R4) && deepEqual(armExpect(R4, 'unread', { local: false }), R4) && deepEqual(armExpect(R1, 'unread'), R1), 'armExpect strips the token on this Mac while the floor does not hold, and nothing else (D17)');
  }
  // The typed command's readers.
  say(J(shellWords("'/a b/pi' --tui-mode regular --session-id 'x'\\''y' \"q r\" s\\ t")) === J(['/a b/pi', '--tui-mode', 'regular', '--session-id', "x'y", 'q r', 's t']) && shellWords("'open") === null, 'shellWords reads single and double quotes and backslashes, and refuses an open quote');
  say(J(typedArgvOf('p350 % ls\nold\np350 % /h/.local/bin/pi --tui-mode regular --session-id U\n\n')) === J(['/h/.local/bin/pi', '--tui-mode', 'regular', '--session-id', 'U']) && typedArgvOf('nothing typed\np350 % \n') === null, 'typedArgvOf reads the command after the last prompt that carries one');
  {
    // THE PROBE REVIEW: a replayed snapshot holds the row's OLD armed command; only what follows the printed mark is read.
    const replay = ` cat '/s/x.txt.000002'; printf '\\n\\033[2m-- Tortie : ${REPLAY_MARK} --\\033[0m\\n\\n'`;
    const old = ['p350 % /h/.local/bin/pi --tui-mode regular --session-id U', 'pi line 0400'];
    const done = ['p350 % ' + replay, ...old, '', `-- Tortie : ${REPLAY_MARK} --`, '', 'p350 % /h/.local/bin/pi --session-id U'].join('\n');
    const midReplay = ['p350 % ' + replay, ...old].join('\n');
    const unechoed = ['p350 % ' + replay, ...old, '', `-- Tortie : ${REPLAY_MARK} --`, '', 'p350 % '].join('\n');
    // A second restore replays the first one's snapshot, which holds ITS replay and mark: mid-replay there, one
    // typed replay more than printed marks, and the old command after the old mark is still not read.
    const nested = ['p350 % ' + replay, 'p350 % ' + replay, 'pi line 0400', `-- Tortie : ${REPLAY_MARK} --`, ...old].join('\n');
    const nestedDone = [nested, `-- Tortie : ${REPLAY_MARK} --`, 'p350 % /h/.local/bin/pi --session-id U'].join('\n');
    say(J(typedArgvOf(done)) === J(['/h/.local/bin/pi', '--session-id', 'U']) && typedArgvOf(midReplay) === null && typedArgvOf(unechoed) === null && typedArgvOf(nested) === null && J(typedArgvOf(nestedDone)) === J(['/h/.local/bin/pi', '--session-id', 'U']), "typedArgvOf never reads a replayed snapshot's old armed command: the new one after the newest printed mark, nothing mid-replay (nested too) or before the shell echoed it");
  }
  say(typedMatches(['/x/pi', '--session-id', 'U'], ['/y/pi', '--session-id', 'U']) && !typedMatches(['/x/pi', '--session-id', 'U'], ['/x/pi', '--tui-mode', 'regular', '--session-id', 'U']) && !typedMatches(['/x/codex'], ['/x/pi']), 'typedMatches: the program by basename, every word after it');
  // THE FIX ROUND's readers: a hard-wrapped typed command, a trimmed prompt, the program's own argv, a wheel's reports.
  {
    const first = 'p350 % /private/var/tmp/x/home/.local/bin/pi --tui-mode regular --session-id 0f3c5d1e-0000-4000';
    const wrapped = [first, '-8000-00000000000a --model m', ''].join('\n');
    const spaced = 'p350 % /h/.local/bin/pi --tui-mode ';
    const brokenOnSpace = [spaced, 'regular --session-id U', ''].join('\n');
    const notContinued = ['p350 % ls', 'old', 'p350 % '].join('\n');
    say(J(typedArgvOf(wrapped, first.length)) === J(['/private/var/tmp/x/home/.local/bin/pi', '--tui-mode', 'regular', '--session-id', '0f3c5d1e-0000-4000-8000-00000000000a', '--model', 'm']) && J(typedArgvOf(brokenOnSpace, spaced.length)) === J(['/h/.local/bin/pi', '--tui-mode', 'regular', '--session-id', 'U']) && J(typedArgvOf(notContinued, 80)) === J(['ls']) && J(typedArgvOf(wrapped)) === J(first.slice(7).split(' ')) && J(typedArgvOf(wrapped, first.length + 1)) === J(first.slice(7).split(' ')), 'typedArgvOf joins a command hard-wrapped at the width, keeps the space a break falls on, and joins no short line, no prompt and nothing with no width given (the fix round)');
    say(J(ranOf({ ran: ['pi', '--session-id', 'U'], typed: null })) === J(['pi', '--session-id', 'U']) && J(ranOf({ ran: null, typed: ['/x/pi'] })) === J(['/x/pi']) && ranOf({ ran: null, typed: null }) === null && ranOf(null) === null, "ranOf reads the program's own argv first, then the typed line, and nothing else (the fix round)");
    const sgr = (b, x, y) => Buffer.from(`\x1b[<${String(b)};${String(x)};${String(y)}M`, 'latin1').toString('hex');
    say(J(wheelReports(sgr(64, 72, 15) + sgr(64, 72, 15))) === J(wheelReports(sgr(64, 72, 14) + sgr(64, 72, 14))) && J(wheelReports(sgr(64, 72, 15))) !== J(wheelReports(sgr(65, 72, 15))) && J(wheelReports(sgr(64, 72, 15))) !== J(wheelReports(sgr(64, 71, 15))) && J(wheelReports(sgr(64, 72, 15))) !== J(wheelReports(sgr(64, 72, 15) + sgr(64, 72, 15))) && J(wheelReports('1b5b41')) === J(['byte 1b', 'byte 5b', 'byte 41']) && wheelReports('').length === 0 && colsOf('142x40') === colsOf('142x42') && colsOf('142x40') !== colsOf('120x40'), "wheelReports reads a report with its row left out, and nothing else: the button, the column, the encoding and the count each tell two apart (the fix round)");
  }
  say(exactlyPageUp([PAGE_UP_HEX]) && !exactlyPageUp([PAGE_UP_HEX, PAGE_UP_HEX]) && !exactlyPageUp([`${PAGE_UP_HEX}00`]) && !exactlyPageUp([]) && !exactlyPageUp([PAGE_DOWN_HEX]), 'exactlyPageUp: one read, exactly 1b5b357e');
  say(pagedBy({ kind: 'page', answer: { outcome: 'done' }, reads: [PAGE_UP_HEX], before: { top: 388 }, after: { top: 368 }, step: 20 }) && pagedBy({ kind: 'page', answer: { outcome: 'done' }, reads: [PAGE_UP_HEX], before: { top: 5 }, after: { top: 0 }, step: 20 }) && !pagedBy({ kind: 'page', answer: { outcome: 'done' }, reads: [PAGE_UP_HEX], before: { top: 388 }, after: { top: 364 }, step: 20 }), 'pagedBy: moved by its own step, clamped at the top, and no other distance');
  say(historyHeld({ before: 'a', after: 'a', quiet: null }) === 'unmoved' && historyHeld({ before: 'a', after: 'b', quiet: { again: 'c' } }) === 'his terminal' && historyHeld({ before: 'a', after: 'b', quiet: { again: 'b' } }) === 'held' && historyHeld({ before: 'a', after: 'b', quiet: null }) === 'unread', 'historyHeld: unmoved, his terminal, held and unread (his rule of 2026-10-20)');
  // The stand-in's page step, and where a full-screen view is read from.
  say(pageOf('rows-4', 24) === 20 && pageOf('rows', 24) === 24 && pageOf('rows-4', 3) === 1 && viewTopOf(['pi line 0389', 'pi line 0390', ' ╭── a screen row', 'pi line 0392']) === 388 && viewTopOf(['a', 'b']) === null, "pageOf: pi's rows - 4 and every other's height; viewTopOf reads a view's top from its numbered rows");
  // The shadow refusal's readers (probe:p349's, kept).
  {
    const tree = (() => {
      try {
        return readFileSync(join(ROOT, 'src', 'main', 'tmux', 'resolve.ts'), 'utf8');
      } catch {
        return '';
      }
    })();
    say(J(absoluteScanDirsOf(tree)) === J(['/opt/homebrew/bin', '/usr/local/bin']), `absoluteScanDirsOf reads the tree's extraBinDirsFor as /opt/homebrew/bin and /usr/local/bin (${J(absoluteScanDirsOf(tree))})`);
    say(absoluteScanDirsOf('export function other() {}') === null, 'absoluteScanDirsOf answers null when the function is gone, which refuses the launch');
    const fake = { list: (d) => {
      if (d === '/x/has') return ['pi', 'other'];
      if (d === '/x/empty') return [];
      if (d === '/x/locked') throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    } };
    const s1 = shadowCopiesOf(['/x/has', '/x/empty', '/x/none'], ['pi', 'grok'], fake);
    const s2 = shadowCopiesOf(['/x/empty', '/x/locked'], ['pi'], fake);
    const s3 = shadowCopiesOf(['/x/empty', '/x/none'], ['pi'], fake);
    say(s1.ok === false && J(s1.copies) === J(['/x/has/pi']) && s2.ok === false && J(s2.unreadable) === J(['/x/locked']) && s3.ok === true, 'shadowCopiesOf finds a copy, refuses a folder it cannot read, and passes a missing one');
  }
  // The hidden set is every probed row but the ten stood in: gemini, droid and omp (read from build/hidden-agents.mjs).
  say(J(hiddenAgentsBesides(STAND_IN_ROWS)) === J(['gemini', 'droid', 'omp']), `hiddenAgentsBesides(STAND_IN_ROWS) is gemini, droid and omp (${J(hiddenAgentsBesides(STAND_IN_ROWS))})`);
  say(MATRIX.filter((m) => m.via === 'row').every((m) => STAND_IN_ROWS.includes(m.agent)) && MATRIX.filter((m) => m.via === 'shell').every((m) => [...SHELL_WRAPPERS, ...ROW_WRAPPERS].some((w) => w.name === m.wrapper)), 'every matrix row started through a registry row stands in through a wrapper of its own, and every shell row names a wrapper');
  say(ROW_WRAPPERS.every((w) => STAND_IN_ROWS.includes(w.agent)) && STAND_IN_ROWS.every((id) => ROW_WRAPPERS.some((w) => w.agent === id)), 'ROW_WRAPPERS and STAND_IN_ROWS name the same ten rows');
  process.stdout.write(failures === 0 ? `[p350] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown red on a broken reading of its own.\n` : `[p350] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

/** A broken fixture's op whose path names a matrix row as `rows.@<build>:<place>:<id>`, made a plain index path. */
function resolveRowPaths(base, op) {
  const fix = (path) => String(path).replace(/^rows\.@([a-z]+):([a-z]+):([a-z0-9-]+)/, (_m, build, place, id) => {
    const i = rowIndexOf(base, build, place, id);
    if (i === -1) throw new Error(`no row ${build}:${place}:${id} in the honest reading`);
    return `rows.${String(i)}`;
  });
  const out = { ...op };
  for (const k of ['set', 'push', 'delete']) if (typeof out[k] === 'string') out[k] = fix(out[k]);
  if (Array.isArray(out.swap)) out.swap = out.swap.map(fix);
  return out;
}

/**
 * THE SHADOW REFUSAL (probe:p349's, kept): the ABSOLUTE folders a checkout's
 * resolver always searches, read from `extraBinDirsFor` in its
 * src/main/tmux/resolve.ts as text; null when the function cannot be found,
 * which refuses the launch rather than searching nothing.
 */
export function absoluteScanDirsOf(resolveText) {
  const src = String(resolveText ?? '');
  const atFn = src.indexOf('export function extraBinDirsFor(');
  if (atFn === -1) return null;
  const end = src.indexOf('\n}\n', atFn);
  const body = src.slice(atFn, end === -1 ? src.length : end);
  return [...new Set([...body.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]))];
}

/** Where a copy of `names` sits in `dirs`: `{ ok, copies, unreadable }`. The file system is handed in. */
export function shadowCopiesOf(dirs, names, fs = { list: (d) => readdirSync(d) }) {
  const copies = [];
  const unreadable = [];
  for (const dir of dirs) {
    let entries = null;
    try {
      entries = fs.list(dir);
    } catch (err) {
      if (err?.code !== 'ENOENT') unreadable.push(dir);
      continue;
    }
    for (const name of names) if (entries.includes(name)) copies.push(join(dir, name));
  }
  return { ok: copies.length === 0 && unreadable.length === 0, copies, unreadable };
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// --preflight: what the run needs, asked before the harness socket is made.
// It starts nothing.
// ---------------------------------------------------------------------------

/** The sources a HEAD reading is made of; out/ older than any of them is refused. */
const SOURCES = [
  'src/main/agents/registry.ts',
  'src/main/agents/detection.ts',
  'src/main/manifest/agents.ts',
  'src/main/sessions/create-local.ts',
  'src/main/sessions/resume-argv.ts',
  'src/main/sessions/id-harvest.ts',
  'src/main/sessions/inline-repair.ts',
  'src/main/sessions/core.ts',
  'src/main/restart/extras.ts',
  'src/main/restore/restore.ts',
  'src/main/machines/remote-arm.ts',
  'src/main/screen/compose.ts',
  'src/main/screen/keys.ts',
  'src/main/pocket/routes.ts',
  'src/main/pocket/writes.ts',
  'src/main/capabilities.ts',
  'src/shared/ipc/pocket.ts'
];
const PARENT = (process.env['P350_PARENT_CHECKOUT'] ?? '').trim();

/** What is missing for a run, as sentences; none means the run may start. */
function preflightProblems() {
  const p = [];
  if (PARENT === '') p.push(`P350_PARENT_CHECKOUT is not set. J1, RP, M, D13 and GRACE need the parent (${SNAPSHOT}, built) to run FIRST on the same profile, where it pairs the phones`);
  else if (!existsSync(join(resolve(PARENT), 'out', 'main', 'index.js'))) p.push(`${resolve(PARENT)}/out/main/index.js is missing: build the parent checkout first`);
  const bundle = join(ROOT, 'out', 'main', 'index.js');
  if (!existsSync(bundle)) p.push(`${bundle} is missing: npm run build first`);
  else {
    const newer = SOURCES.filter((s) => existsSync(join(ROOT, s)) && statSync(join(ROOT, s)).mtimeMs > statSync(bundle).mtimeMs);
    if (newer.length > 0) p.push(`out/ is older than ${newer.join(', ')}: build first`);
  }
  if (!existsSync(STANDIN_PATH)) p.push('build/p350/stand-in.mjs is missing');
  if (!existsSync('/usr/bin/sqlite3')) p.push("/usr/bin/sqlite3 is missing, which reads the manifest's own copy");
  if (!existsSync('/bin/bash')) p.push('/bin/bash is missing, which every stand-in wrapper runs under');
  return p;
}

if (process.argv.includes('--preflight')) {
  const p = preflightProblems();
  for (const x of p) process.stderr.write(`[p350] REFUSED. ${x}\n`);
  if (p.length === 0) process.stdout.write(`[p350] preflight PASS: the parent ${resolve(PARENT)} is built, out/ is current, the stand-in is here\n`);
  process.exit(p.length === 0 ? 0 : 2);
}

// ---------------------------------------------------------------------------
// The refusals, in the order they are asked
// ---------------------------------------------------------------------------

const TAG = '[p350]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
/** His shell history's size and modified time, under the ACCOUNT's home (never $HOME), and nothing else of it. */
const historyStat = () =>
  ['.zsh_history', '.bash_history']
    .map((n) => {
      try {
        const s = statSync(join(userInfo().homedir, n));
        return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
      } catch {
        return 'none';
      }
    })
    .join('|');
const HISTORY_BEFORE = historyStat();
const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p350`, which wraps this file in build/harness-socket.mjs and build/with-scratch-machine.mjs.');
if (SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-p350')) refuse(`"${SOCKET}" is not a gmux-p350 harness socket.`);
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
for (const v of ['SCRATCH_MACHINE_QUIET_SHELL', 'SCRATCH_MACHINE_SCRATCH_HOME', 'SCRATCH_MACHINE_NO_OWN_KEYS']) {
  if ((process.env[v] ?? '') !== '1') refuse(`${v} is not 1: the loopback machine would read his own rc files, home or keys. Run it through \`npm run probe:p350\`.`);
}
const CONFIG_ROOT = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
let carriage = null;
try {
  carriage = JSON.parse(readFileSync(join(CONFIG_ROOT, 'p69-carriage.json'), 'utf8'));
} catch {
  carriage = null;
}
if (CONFIG_ROOT === '' || carriage === null) refuse('there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs.');
if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
/** The far machine's tmux, which the machine's row names. */
const FAR_TMUX = String(carriage.remoteTmuxPath ?? '');
if (!existsSync(FAR_TMUX)) refuse(`the carriage's tmux ${J(FAR_TMUX)} does not exist.`);
/** The far HOME and the far zsh's own ZDOTDIR the yard lends its sessions (build/scratch-machine.mjs). */
const FAR_HOME = join(CONFIG_ROOT, 'home');
const FAR_ZDOT = join(CONFIG_ROOT, 'zdot');
if (!existsSync(FAR_HOME)) refuse(`the machine's scratch home ${FAR_HOME} does not exist, so its far side would be his own home.`);
if (!existsSync(FAR_ZDOT)) refuse(`the machine's quiet ZDOTDIR ${FAR_ZDOT} does not exist, so the far login shell would read his own rc files.`);
{
  const p = preflightProblems();
  if (p.length > 0) refuse(p.join('; '));
}
const KEEP = (process.env['P350_KEEP'] ?? '') === '1';
const ARMS = new Set(((process.env['P350_ARMS'] ?? '').trim() || 'J1,J2,M,B,D13,PASS,GRACE').split(',').map((x) => x.trim()));
const on = (id) => ARMS.has(id);

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------

mkdirSync(join(HARNESS_DIR, 'p350'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p350'));
const HOME = join(RUN, 'home');
const PROFILE = join(RUN, 'profile');
const PROJECTS = join(RUN, 'projects');
const PROJECT = join(PROJECTS, 'main');
const FAR = join(RUN, 'far');
const BIN = join(HOME, '.local', 'bin');
/** The machine's wrappers, first on the far login PATH (the far `.zprofile` this file writes into the yard's ZDOTDIR). */
const FAR_BIN = join(RUN, 'farbin');
/** OUTSIDE the profile, so the helper's profile sweep never takes the stand-ins for the app's. */
const STANDIN_DIR = join(RUN, 'standin');
const FAR_STANDIN_DIR = join(RUN, 'standin-far');
/** pi's band and the version delay, files both sets of wrappers read at every start. */
const BAND_FILE = join(RUN, 'pi-band');
const DELAY_FILE = join(RUN, 'version-delay');
const COPIES = join(RUN, 'manifest-copies');
const NEVER_RUN = join(RUN, 'never-run');
const MANIFEST = join(PROFILE, 'gmux', 'manifest.db');
const MACHINES_JSON = join(PROFILE, 'gmux', 'config', 'machines.json');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const FAR_ENV = { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp };
const OUT = join(ROOT, 'out', 'p350');
/** The scratch login PATH: the stand-ins and the system folders, nothing of his. */
const LOGIN_PATH = `${BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
/** ONE `node`, a link to this node, for the Electron shim's `#!/usr/bin/env node` and nothing else. */
const NODE_BIN = join(RUN, 'nodebin');
/** THE APP'S OWN PATH: the stand-ins, that one `node`, and the system folders. */
const APP_PATH = `${BIN}:${NODE_BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
/** The far login PATH: the machine's wrappers and the system folders. */
const FAR_PATH = `${FAR_BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
/** The system folders of the app's PATH, which the shadow refusal reads beside the scan's own absolute folders. */
const SYSTEM_DIRS = APP_PATH.split(':').filter((d) => d.startsWith('/') && !within(RUN, d));
const HIDDEN_PREFIX = 'p350';
const HIDDEN_IDS = hiddenAgentsBesides(STAND_IN_ROWS);
const HIDDEN_BINS = hiddenAgentBinaries(HIDDEN_IDS);
const ROW_NAMES = ROW_WRAPPERS.map((w) => w.name);

const report = { checkout: ROOT, parent: resolve(PARENT), arms: [], readings: {}, printed: {} };
let failures = 0;
let unreadable = 0;
function arm(id, reading) {
  const v = verdictOf(id, reading);
  if (v.state === 'unreadable') return cannotRead(id, v.why, reading);
  const ok = v.state === 'pass';
  report.arms.push({ id, ok, failed: v.failed, title: GRADERS[id].title });
  report.readings[id] = reading;
  if (!ok) failures += 1;
  say(`${ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${ok ? '' : `; FAILED ${J(v.failed)}`}`);
}
function cannotRead(id, why, reading) {
  unreadable += 1;
  report.arms.push({ id, ok: null, said: why });
  if (reading !== undefined) report.readings[id] = reading;
  say(`UNREADABLE ${id}: ${why}`);
}
/** Run one step; a step that throws is written down and the run goes on. */
async function step(label, body) {
  try {
    return await body();
  } catch (err) {
    (report.printed.steps ??= []).push(`${label}: ${String(err?.message ?? err)}`);
    say(`${label} stopped: ${String(err?.message ?? err)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Processes, read and never matched by pattern
// ---------------------------------------------------------------------------

/** The process table as pid → { ppid, command }, read with `ps -ww -ax` (never a pattern). */
function processTable() {
  const r = spawnSync('/bin/ps', ['-ww', '-ax', '-o', 'pid=,ppid=,command='], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  const rows = new Map();
  for (const line of String(r.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m !== null) rows.set(Number(m[1]), { pid: Number(m[1]), ppid: Number(m[2]), command: m[3] });
  }
  return rows;
}
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
/** A stand-in's pid, signalled only when its command line still names the stand-in. */
function signalStandin(pid, signal) {
  const command = processTable().get(pid)?.command ?? '';
  if (!command.includes(STANDIN_PATH)) return false;
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

/**
 * D13's sampler: the process table every 100 ms, every command line naming
 * the stand-in with a version flag as its last word written down with when
 * it was first seen. A second witness beside the stand-in's own versions.jsonl.
 */
function startVersionSampler() {
  const seen = new Map();
  let stopped = false;
  let busy = false;
  const timer = setInterval(() => {
    if (stopped || busy) return;
    busy = true;
    execFile('/bin/ps', ['-ww', '-ax', '-o', 'pid=,command='], { encoding: 'utf8', timeout: 5_000, maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => {
      busy = false;
      if (err) return;
      for (const line of String(stdout).split('\n')) {
        const m = /^\s*(\d+)\s+(.*)$/.exec(line);
        if (m === null || !m[2].includes(STANDIN_PATH) || !/\s(-v|--version|-V)$/.test(m[2])) continue;
        if (!seen.has(Number(m[1]))) seen.set(Number(m[1]), { at: Date.now(), command: m[2].slice(0, 200) });
      }
    });
  }, 100);
  return {
    stop() {
      stopped = true;
      clearInterval(timer);
      return [...seen.values()];
    }
  };
}

// ---------------------------------------------------------------------------
// The app, over its renderer and its bridge
// ---------------------------------------------------------------------------

/** The variables a registry row names in its own install folders, and the agents' session variables: never handed on. */
const INHERITED = Object.fromEntries(
  [...Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_|CODEX_|PI_|P350_)/.test(n) || n === 'TERM_SESSION_ID'), 'NVM_BIN', 'BUN_INSTALL'].map((n) => [n, undefined])
);

const devtoolsPort = () => {
  try {
    return Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
  } catch {
    return 0;
  }
};
async function targets() {
  const port = devtoolsPort();
  if (!(port > 0)) return [];
  try {
    return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
  } catch {
    return [];
  }
}
/** The app window, once its bridge and the drives this run uses are armed. */
async function attachMain(timeoutMs = 150_000) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    const picked = pickRendererTarget(await targets());
    if (picked.target !== null) {
      const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
      await cdp.call('Runtime.enable');
      for (let i = 0; i < 200; i += 1) {
        if ((await cdpEval(cdp, "window.gmux !== undefined && window.gmux.pocket !== undefined && typeof window.__p293 === 'object' && typeof window.__gmuxP95 === 'object'")) === true) return cdp;
        await sleep(300);
      }
      throw new Error('the app never armed window.gmux.pocket and the drives');
    }
    why = picked.why;
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}
async function pocket(cdp, method, arg) {
  const call = arg === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${J(arg)})`;
  return JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`));
}
async function bridge(cdp, expr, ms = 180_000) {
  return JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, ms));
}
async function status(cdp) {
  const got = await pocket(cdp, 'status');
  return got.ok ? got.value : null;
}
async function waitStatus(cdp, test, ms) {
  const started = Date.now();
  let last = null;
  for (;;) {
    last = await status(cdp);
    if (last !== null && test(last)) return { ok: true, status: last };
    if (Date.now() - started >= ms) return { ok: false, status: last };
    await sleep(300);
  }
}
async function waitFor(test, ms, every = 300) {
  const started = Date.now();
  for (;;) {
    const v = await test();
    if (v) return v;
    if (Date.now() - started >= ms) return null;
    await sleep(every);
  }
}
/** Main's sessions, with the facts the arms read. */
async function sessions(cdp) {
  const got = await bridge(cdp, 'window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, name: s.name, tmuxName: s.tmuxName, status: s.status, agent: s.agent, machine: s.machine ? { id: s.machine.id } : null })))');
  return got.ok ? got.value : [];
}
const statusOf = async (cdp, id) => (await sessions(cdp)).find((s) => s.id === id)?.status ?? null;

/** Confirm the door as it stands and wait until a code may show. Called at the parent, where nothing waits. */
async function confirmDoor(cdp) {
  const now = await waitStatus(cdp, (s) => (s.state === 'listening' && s.confirmState === 'confirmed') || (s.confirmable === true && s.state !== 'opening' && s.confirmLines.some((l) => l.includes(`https://${PUBLIC_NAME}:`))), 40_000);
  if (!now.ok) return { ok: false, why: `the lines never named ${PUBLIC_NAME}: ${J({ state: now.status?.state, refusal: now.status?.refusal })}` };
  if (!(now.status.state === 'listening' && now.status.confirmState === 'confirmed')) {
    const c = await pocket(cdp, 'confirmDoor', { linesRead: now.status.confirmLines, hashRead: now.status.confirmHash });
    if (!c.ok || c.value.allowed !== true) return { ok: false, why: c.ok ? `confirm allowed=${String(c.value.allowed)}` : c.error };
  }
  const l = await waitStatus(cdp, (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening'), 70_000);
  return { ok: l.ok, why: l.ok ? '' : `never pairable: ${J({ state: l.status?.state, pairable: l.status?.pairable })}` };
}

/** The forwarder the stand-in's NEWEST live Funnel child listens on, or 0. */
const forwarderPort = () => standin?.readFunnel().at(-1)?.forwarderPort ?? 0;

/** A node phone, paired through the forwarder and allowed through the bridge. */
async function pairPhone(cdp, label) {
  const offered = await pocket(cdp, 'beginPairing');
  if (!offered.ok) return { ok: false, why: offered.error.slice(0, 200) };
  const read = readOffer(offered.value.payload);
  if (!read.ok) return { ok: false, why: `the code does not read the phone's way: ${read.why}` };
  const phone = makePhone(label, read.offer.dx);
  const door = { get port() { return forwarderPort(); }, name: read.offer.host, publicPort: read.offer.port, pin: read.offer.fp };
  const paired = await pairThrough(door, read.offer, phone, {
    tries: 20,
    everyMs: 500,
    between: async () => {
      const sheet = await pocket(cdp, 'pairingState');
      if (sheet.ok && sheet.value.state === 'presented') await pocket(cdp, 'allowPhone', { linesRead: sheet.value.lines, hashRead: sheet.value.hash });
    }
  });
  await pocket(cdp, 'cancelPairing');
  if (!paired.ok) return { ok: false, why: `pairing answered ${J(paired.words)} (${paired.why})` };
  const first = await signedGet(phone, door, '/v1/blocked');
  return { ok: first.status === 200, why: first.status === 200 ? '' : `the first read answered ${String(first.status)}`, label, phone, door };
}

/** The door switched on at a later launch over the agreement on record, and what it says about routes. */
async function doorUp(cdp) {
  await pocket(cdp, 'setDoor', { on: true });
  const listening = await waitStatus(cdp, (s) => s.state === 'listening' && (s.confirmState === 'confirmed' || s.confirmable === true), 60_000);
  const s = listening.status;
  return { ok: listening.ok && s?.confirmState === 'confirmed', confirmState: s?.confirmState ?? null, routesWaiting: Array.isArray(s?.routesWaiting) ? [...s.routesWaiting] : null };
}

// ---------------------------------------------------------------------------
// tmux, read by this file's own clients with -u: this Mac's server by the
// binary it runs, the machine's by its own binary under its TMUX_TMPDIR
// ---------------------------------------------------------------------------

let localTmuxBin = null;
function tmuxBin() {
  if (localTmuxBin !== null) return localTmuxBin;
  const pid = Number(String(spawnSync('tmux', ['-L', SOCKET, 'display-message', '-p', '#{pid}'], { encoding: 'utf8', timeout: 10_000 }).stdout ?? '').trim());
  if (!(pid > 1)) return 'tmux';
  const command = String(spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8', timeout: 10_000 }).stdout ?? '').trim();
  const bin = command.split(/\s+/)[0] ?? '';
  if (bin.startsWith('/') && existsSync(bin)) localTmuxBin = bin;
  return localTmuxBin ?? 'tmux';
}
const tmuxOut = (...args) => {
  const r = spawnSync(tmuxBin(), ['-u', '-L', SOCKET, ...args], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
const farOut = (...args) => {
  const r = spawnSync(FAR_TMUX, ['-u', '-L', SOCKET, ...args], { encoding: 'utf8', env: FAR_ENV, timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
const readerOf = (far) => (far ? farOut : tmuxOut);
/** A server's sessions as `$`-id → `@gmux-id`, from its own list. */
function idsOn(read) {
  const out = new Map();
  for (const line of String(read('list-sessions', '-F', '#{session_id} #{@gmux-id}') ?? '').split('\n')) {
    const m = /^(\$\d+) (\S*)$/.exec(line.trim());
    if (m !== null) out.set(m[1], m[2]);
  }
  return out;
}
const tmuxIdOf = (read, sessionId) => [...idsOn(read).entries()].find(([, g]) => g === sessionId)?.[0] ?? null;
/** One session's tmux target by `$`-id, waited for. */
async function targetOf(sessionId, far, ms = 20_000) {
  return waitFor(() => tmuxIdOf(readerOf(far), sessionId), ms, 200);
}
/** The probe's own read of a pane: the alternate screen, the mouse, the history, copy mode and the size. */
function flagsOf(target, far) {
  const t = String(readerOf(far)('display-message', '-p', '-t', target, '#{alternate_on} #{mouse_any_flag} #{history_size} #{pane_in_mode} #{pane_height} #{pane_width} #{pane_id} #{pane_dead}') ?? '').trim().split(' ');
  if (t.length < 8) return null;
  const n = (i) => (/^\d+$/.test(t[i] ?? '') ? Number(t[i]) : null);
  return { alternate: n(0), mouseAny: n(1), history: n(2), inMode: n(3), rows: n(4), cols: n(5), pane: t[6] ?? null, dead: n(7) };
}
/** A pane's visible rows, trailing blanks dropped. */
const visibleOf = (target, far) => String(readerOf(far)('capture-pane', '-p', '-t', target) ?? '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n');

// ---------------------------------------------------------------------------
// The manifest: a COPY beside its WAL, read with sqlite3 or the SHIPPING store
// ---------------------------------------------------------------------------

let copySeq = 0;
/** The manifest copied beside its WAL into a fresh folder; the folder, or null. */
function manifestCopy() {
  if (!existsSync(MANIFEST)) return null;
  copySeq += 1;
  const dir = join(COPIES, String(copySeq));
  mkdirSync(dir, { recursive: true });
  const copy = join(dir, 'manifest.db');
  copyFileSync(MANIFEST, copy);
  for (const side of ['-wal', '-shm']) if (existsSync(`${MANIFEST}${side}`)) copyFileSync(`${MANIFEST}${side}`, `${copy}${side}`);
  return { dir, copy };
}
/** Every row's id, agent, status, machine, conversation id, argv and resume argv, read with sqlite3 from a copy; a Map, or null. */
function manifestRows() {
  const c = manifestCopy();
  if (c === null) return null;
  try {
    const r = spawnSync('/usr/bin/sqlite3', ['-json', c.copy, 'select id, agent, status, machine_id, agent_session_id, argv, resume_argv from sessions;'], { encoding: 'utf8', timeout: 20_000, maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) return null;
    const parse = (t) => {
      try {
        return t === null ? null : JSON.parse(t);
      } catch {
        return null;
      }
    };
    return new Map(JSON.parse(String(r.stdout ?? '').trim() || '[]').map((row) => [row.id, { agent: row.agent, status: row.status, machineId: row.machine_id ?? 'local', agentSessionId: row.agent_session_id ?? null, argv: parse(row.argv), resumeArgv: parse(row.resume_argv) }]));
  } catch {
    return null;
  } finally {
    rmSync(c.dir, { recursive: true, force: true });
  }
}
/** A script run under the pinned tsx in a checkout, its JSON answer, or `{ ok: false, why }`. */
function tsxJson(script, env = {}) {
  const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', '-'], { cwd: ROOT, input: script, encoding: 'utf8', timeout: 120_000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...INHERITED, HOME, ...env } });
  try {
    return JSON.parse(String(r.stdout ?? '').trim());
  } catch {
    return { ok: false, why: `tsx answered ${String(r.status)}: ${String(r.stderr ?? '').trim().slice(0, 300)}` };
  }
}
/** Every pi row through the SHIPPING store (src/main/manifest/store.ts) over a copy, as the pass reads them. */
function storePiRows() {
  const c = manifestCopy();
  if (c === null) return { ok: false, why: 'there is no manifest', rows: [] };
  try {
    const got = tsxJson(
      [
        "import { ManifestStore } from './src/main/manifest/store.ts';",
        'const store = new ManifestStore(process.env.P350_MANIFEST_COPY);',
        'try {',
        "  const rows = store.listSessions().filter((r) => r.agent === 'pi').map((r) => ({ id: r.id, agent: r.agent, status: r.status, machineId: r.machineId ?? 'local', agentSessionId: r.agentSessionId ?? null, resumeArgv: r.resumeArgv ?? null }));",
        '  process.stdout.write(JSON.stringify({ ok: true, rows }));',
        '} finally { store.close(); }',
        ''
      ].join('\n'),
      { P350_MANIFEST_COPY: c.copy }
    );
    return got.ok === true ? got : { ok: false, why: got.why ?? 'no answer', rows: [] };
  } finally {
    rmSync(c.dir, { recursive: true, force: true });
  }
}
/** Rows planted into the scratch manifest through the SHIPPING store, while no app runs: each a copy of a source row with its own id and argv. */
function plantRows(rows) {
  return tsxJson(
    [
      "import { ManifestStore } from './src/main/manifest/store.ts';",
      'const spec = JSON.parse(process.env.P350_PLANT);',
      'const store = new ManifestStore(spec.manifest);',
      'const out = [];',
      'try {',
      '  for (const p of spec.rows) {',
      '    const src = store.getSession(p.source);',
      "    if (src === undefined) { out.push({ id: p.id, ok: false, why: 'no source row' }); continue; }",
      '    const rec = { ...src, id: p.id, name: p.name, tmuxName: p.tmuxName, argv: p.argv, status: p.status, createdAt: p.at, lastSeen: p.at };',
      "    for (const k of ['panePid', 'exitCode', 'exitSignal', 'exitDetail', 'specstory']) delete rec[k];",
      '    if (p.agentSessionId === null) delete rec.agentSessionId; else rec.agentSessionId = p.agentSessionId;',
      '    if (p.resumeArgv === null) delete rec.resumeArgv; else rec.resumeArgv = p.resumeArgv;',
      '    store.insertSession(rec);',
      '    out.push({ id: p.id, ok: store.getSession(p.id) !== undefined });',
      '  }',
      '} finally { store.close(); }',
      'process.stdout.write(JSON.stringify({ ok: out.every((o) => o.ok), out }));',
      ''
    ].join('\n'),
    { P350_PLANT: J({ manifest: MANIFEST, rows }) }
  );
}

// ---------------------------------------------------------------------------
// The stand-ins
// ---------------------------------------------------------------------------

/** Every stand-in's hello this run has seen, local and far. */
const allHellos = () => [...hellos(STANDIN_DIR).map((h) => ({ ...h, far: false })), ...hellos(FAR_STANDIN_DIR).map((h) => ({ ...h, far: true }))];
/** The NEWEST hello for a session (by its pane env, else by its pane), after `fromMs`. */
function helloOf(sessionId, pane, far, fromMs = 0) {
  const mine = allHellos().filter((h) => h.far === far && Number(h.at) >= fromMs && (h.session === sessionId || (pane !== null && h.pane === pane)));
  return mine[mine.length - 1] ?? null;
}
/** A stand-in's reads after `fromMs`, from its own log. */
const readsOf = (hello, fromMs) => (hello === null ? [] : readsSince(readLog(hello.log), fromMs).map((r) => r.hex));
const stateNow = (hello) => (hello === null ? null : stateOf(hello.far ? FAR_STANDIN_DIR : STANDIN_DIR, hello.pid));
/** The slice of a hello every reading keeps. */
const helloSlim = (h) => (h === null ? null : { view: h.view, kind: h.kind, setModes: h.setModes, page: h.page, band: h.band, argv: h.argv, claudeInline: h.claudeInline });

// ---------------------------------------------------------------------------
// The sessions
// ---------------------------------------------------------------------------

/** Every agent session this run started, for RUN: `{ id, argv0 }`. */
const startedAgents = new Map();
let nameSeq = 0;
const nameFor = (label) => `p350-${label}-${String((nameSeq += 1))}`;

/** An agent session made the way a person makes one, local or on the machine; its id. */
async function agentSession(main, label, agent, { far = false, extraArgs = [] } = {}) {
  const input = far
    ? { name: nameFor(label), projectPath: FAR, cwd: FAR, agent, machineId: MACHINE_ID, projectMachineId: MACHINE_ID, ...(extraArgs.length > 0 ? { extraArgs } : {}) }
    : { name: nameFor(label), projectPath: PROJECT, cwd: PROJECT, agent, ...(extraArgs.length > 0 ? { extraArgs } : {}) };
  const got = await bridge(main, `window.gmux.sessions.create(${J(input)}).then((s) => s.id)`);
  if (!got.ok || typeof got.value !== 'string') throw new Error(`${input.name} was not created: ${J(got)}`);
  startedAgents.set(got.value, { argv0: null });
  return got.value;
}
/** A shell, made through the session manager's drive, local or on the machine; its id. */
async function shellSession(main, label, { far = false } = {}) {
  const name = nameFor(label);
  const got = await bridge(main, `window.__p293.createSession(${J(far ? { path: FAR, name, machineId: MACHINE_ID } : { path: PROJECT, name })})`);
  if (!got.ok || typeof got.value !== 'string') throw new Error(`${name} was not created: ${J(got)}`);
  return got.value;
}
/** A command typed into a shell session once its prompt is drawn, and Enter, by this file's own tmux. */
async function typeInto(target, far, command) {
  const read = readerOf(far);
  // THE FIX ROUND: `capture-pane -p` trims a line's trailing blanks, so the quiet shell's prompt `p350 % ` reads
  // `p350 %`; a prompt is a line that holds `% ` or ends `%` (the Mac verifier's run 1 read every shell row as
  // `no prompt` and M as UNREADABLE).
  const prompt = await waitFor(() => (String(read('capture-pane', '-p', '-t', target) ?? '').split('\n').some((l) => l.includes('% ') || l.replace(/\s+$/, '').endsWith('%')) ? true : null), 30_000, 250);
  if (prompt === null) throw new Error(`no prompt in ${target}`);
  read('send-keys', '-t', target, '-l', command);
  read('send-keys', '-t', target, 'Enter');
}
/** A wrapper's absolute path, for a shell to type: this Mac's or the machine's. */
const wrapperPath = (name, far) => join(far ? FAR_BIN : BIN, name);
const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

/** The session in front, its terminal mounted (318's `front`). */
async function front(main, id, far) {
  if (far) await bridge(main, `window.__gmuxP95.openRemote(${J(MACHINE_ID)}, ${J(FAR)})`);
  else await bridge(main, `window.__gmuxP95.openLocal(${J(PROJECT)})`);
  const st = await bridge(main, `window.__gmuxP95.select(${J(id)})`);
  return st.ok === true && st.value?.activeSessionId === id && st.value?.terminal === true;
}

/**
 * The page kit: xterm's own `onData`, reached through the React fiber of
 * `.gmux-terminal-mount` (probe:p331's, research 133's probe-b), because no
 * product file gains a hook for a probe. It records every chunk xterm hands
 * the app, and the terminal's geometry.
 */
const P350_KIT = String.raw`
(() => {
  if (window.__p350 !== undefined) return true;
  const findTerm = () => {
    const mounts = [...document.querySelectorAll('.gmux-terminal-mount')];
    for (const mount of mounts) {
      const key = Object.keys(mount).find((k) => k.startsWith('__reactFiber$'));
      if (!key) continue;
      let f = mount[key];
      for (let depth = 0; f && depth < 60; depth += 1, f = f.return) {
        let h = f.memoizedState; let n = 0;
        while (h && typeof h === 'object' && n < 300) {
          const ms = h.memoizedState;
          if (ms && typeof ms === 'object' && 'current' in ms) {
            const c = ms.current;
            if (c && typeof c === 'object' && c.buffer && typeof c.write === 'function' && typeof c.rows === 'number') return c;
          }
          h = h.next; n += 1;
        }
      }
    }
    return null;
  };
  const kit = { term: null, sent: [], heard: new WeakSet() };
  kit.ready = () => {
    const t = findTerm();
    if (t !== null) kit.term = t;
    if (kit.term !== null && !kit.heard.has(kit.term)) {
      kit.heard.add(kit.term);
      kit.term.onData((d) => { if (kit.sent.length < 20000) kit.sent.push({ t: Math.round(performance.now()), d }); });
    }
    return kit.term !== null;
  };
  kit.now = () => Math.round(performance.now());
  kit.sentSince = (t) => kit.sent.filter((e) => e.t >= t).map((e) => e.d).join('');
  kit.geometry = () => {
    const b = document.querySelector('.xterm-screen')?.getBoundingClientRect();
    return b === undefined ? null : { left: b.left, top: b.top, width: b.width, height: b.height, rows: kit.term?.rows ?? 0, cols: kit.term?.cols ?? 0 };
  };
  window.__p350 = kit;
  return true;
})()
`;

/**
 * THE DESK'S WHEEL: the session in front, then three real wheel notches up
 * over its terminal (CDP `Input.dispatchMouseEvent`, as probe:p331 drives
 * them), and what xterm typed while they turned. Answers `{ sent, geometry }`
 * with `sent` as hex, or throws when no terminal mounted.
 */
async function deskFront(main, id, far, settleMs) {
  if (!(await front(main, id, far))) throw new Error('the session never came to the front with its terminal mounted');
  await cdpEval(main, P350_KIT);
  const ready = await waitFor(async () => ((await cdpEval(main, 'window.__p350.ready()')) === true ? true : null), 10_000, 200);
  if (ready === null) throw new Error("no xterm for the desk's wheel");
  // The front resized the pane to the window, and a program redraws on that: the notches wait it out.
  await sleep(settleMs);
}
async function deskWheel(main, notches = 3) {
  const geo = await cdpEval(main, 'window.__p350.geometry()');
  if (geo === null || !(geo.rows > 0)) throw new Error('no terminal is drawn to turn the wheel over');
  const x = Math.round(geo.left + geo.width / 2);
  const y = Math.round(geo.top + geo.height / 3);
  const cell = geo.height / geo.rows;
  await main.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await sleep(200);
  const mark = await cdpEval(main, 'window.__p350.now()');
  for (let k = 0; k < notches; k += 1) {
    await main.call('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: -cell * 3 });
    await sleep(250);
  }
  await sleep(1_200);
  const sent = String(await cdpEval(main, `window.__p350.sentSince(${String(mark)})`));
  return { sent: Buffer.from(sent, 'utf8').toString('hex'), geometry: `${String(geo.cols)}x${String(geo.rows)}` };
}

// ---------------------------------------------------------------------------
// The phone's half of a row: the picture, the pull, the history
// ---------------------------------------------------------------------------

/** One `/v1/screen` read's screen, or null. */
async function picture(P, id, since = null) {
  return (await pictureRead(P, id, since)).screen;
}
/** One `/v1/screen` read: `{ screen, revision }`, a `since` held by the door until the picture moves (or its bound). */
async function pictureRead(P, id, since = null) {
  const r = await screenRead(P.phone, P.door, id, since === null ? {} : { since });
  return { screen: r.answer?.screen ?? null, revision: typeof r.answer?.revision === 'string' ? r.answer.revision : null };
}
/** A picture until `test` holds, read every 250 ms up to `ms`; the last read either way. */
async function pictureUntil(P, id, test, ms = 15_000) {
  let last = null;
  const got = await waitFor(async () => {
    last = await picture(P, id);
    return last !== null && test(last) ? last : null;
  }, ms, 250);
  return got ?? last;
}
/** The slice of a picture a reading keeps. */
function pictureSlim(s) {
  if (s === null) return null;
  const texts = (s.lines ?? []).map(screenRowText);
  return { alternate: s.alternate === true, depth: typeof s.depth === 'number' ? s.depth : null, space: typeof s.space === 'string' ? s.space : null, pages: s.pages === true, asking: s.asking === true, typable: s.typable === true, rows: s.rows, cols: s.cols, first: texts[0] ?? '', top: viewTopOf(texts) };
}
/** The phone's rule (D7, D8), this file's reading: a page only on a picture that offers it, takes keys and does not ask. */
const phoneWouldPage = (s) => s !== null && s.pages === true && s.typable === true && s.asking !== true;

/** ONE keys write of one named key against a picture, read the phone's way. */
async function keyWrite(P, id, key, pic) {
  const r = await sendKeys(P.phone, P.door, id, [{ k: key }], { turn: pic?.turn ?? '0123456789abcdef-1', dialog: pic?.dialog ?? null });
  const read = writeAnswerOf(r, r.write, 'keys');
  return { status: r.status, outcome: read.ok ? read.answer.outcome : null, reason: read.ok ? read.answer.reason : null };
}

/**
 * ONE PULL OF A PAGE: one `PPage` against the picture, the stand-in's reads
 * after the write from its own log, and the next picture's top. `step` is the
 * program's own page at the picture's height.
 */
async function pullPage(P, id, hello, pic) {
  const read = await pictureRead(P, id);
  const raw = read.screen;
  const beforeTop = viewTopOf((raw?.lines ?? []).map(screenRowText));
  const from = Date.now();
  const answer = await keyWrite(P, id, 'PPage', raw ?? pic);
  await sleep(700);
  const after = (await pictureRead(P, id, read.revision)).screen ?? (await picture(P, id));
  const texts = (after?.lines ?? []).map(screenRowText);
  // THE PROBE REVIEW: `read` says whether each picture was read at all, so a top that is null because nothing
  // was read is UNREADABLE (UNREADABLE_WHEN asks `read === false`) rather than a view that did not move.
  return { kind: 'page', answer, reads: readsOf(hello, from), before: { top: beforeTop, read: raw !== null }, after: { top: viewTopOf(texts), first: texts[0] ?? '', read: after !== null }, step: pageOf(hello?.page ?? 'rows', raw?.rows ?? pic?.rows ?? 24) };
}
/**
 * ONE PULL OVER HISTORY: one `/v1/scrollback` page of the rows just above the
 * live screen, the Mac's view read by this file's own tmux before and after,
 * and the stand-in's reads (the phone types nothing for it).
 */
async function pullHistory(P, id, hello, pic, target, far) {
  const from = Date.now();
  const before = { inMode: flagsOf(target, far)?.inMode ?? null, text: visibleOf(target, far) };
  const depth = pic.depth;
  const count = Math.min(100, depth);
  const r = count > 0 ? await scrollbackRead(P.phone, P.door, id, { from: depth - count, count, depth, wrap: pic.cols, keep: 'bottom' }) : { status: 0, answer: null };
  const a = r.answer;
  const texts = (a?.rows ?? []).map(screenRowText);
  const numbered = texts.map(lineNumberOf).filter((n) => n !== null);
  await sleep(300);
  const after = { inMode: flagsOf(target, far)?.inMode ?? null, text: visibleOf(target, far) };
  return { kind: 'history', page: { status: r.status, why: a?.why ?? (r.status === 200 ? null : 'unanswered'), rows: texts.length, numbered: numbered.length, first: numbered[0] ?? null, last: numbered[numbered.length - 1] ?? null }, mac: { before, after }, reads: readsOf(hello, from) };
}
/** A page of history asked of a full-screen picture anyway (J1): its `why`. */
async function extraPage(P, id, pic, target, far) {
  const h = flagsOf(target, far)?.history ?? 0;
  const count = Math.max(1, Math.min(50, h));
  const r = await scrollbackRead(P.phone, P.door, id, { from: Math.max(0, h - count), count, depth: Math.max(h, count), wrap: pic.cols, keep: 'bottom' });
  return { status: r.status, why: r.answer?.why ?? (r.status === 200 ? null : 'unanswered') };
}

/**
 * THE MAC'S WHEEL over a row: the phone's picture's first row and the
 * stand-in's top before, the desk's three notches, the stand-in's reads, copy
 * mode, and the picture after. Copy mode is left by this file's own
 * `send-keys -X cancel` when the wheel parked it.
 */
async function macWheel(main, P, id, hello, target, far) {
  await deskFront(main, id, far, 1_500);
  const before = await picture(P, id);
  const topBefore = stateNow(hello)?.top ?? null;
  const from = Date.now();
  const w = await deskWheel(main);
  const inMode = flagsOf(target, far)?.inMode ?? null;
  const after = await pictureUntil(P, id, (s) => s !== null, 3_000);
  // THE PROBE REVIEW: a picture that was never read is a first row of null, never '' (two failed reads gave
  // `'' === ''`, which passed "the phone's first row is unchanged"); UNREADABLE_WHEN asks it.
  const firstOf = (s) => (s === null || s === undefined ? null : screenRowText(s.lines?.[0] ?? []));
  const out = { geometry: w.geometry, view: stateNow(hello)?.view ?? null, sent: w.sent, reads: readsOf(hello, from), inMode, firstBefore: firstOf(before), firstAfter: firstOf(after), topBefore, topAfter: stateNow(hello)?.top ?? null };
  if (inMode === 1) readerOf(far)('send-keys', '-t', target, '-X', 'cancel');
  return out;
}

/** The manifest's argv and resume argv of a session, once written. */
async function argvOf(id) {
  const row = await waitFor(() => manifestRows()?.get(id) ?? null, 10_000, 300);
  if (row !== null && Array.isArray(row.argv)) startedAgents.set(id, { argv0: row.argv[0] ?? null });
  return row === null ? { argv: null, resumeArgv: null } : { argv: row.argv, resumeArgv: row.resumeArgv };
}

/**
 * ONE MATRIX ROW at one build: started (a registry create, or typed into a
 * shell), its stand-in's hello, this file's own tmux read, the picture until
 * it shows the stand-in's view, the pull the phone's rule allows (and grok's
 * Tab, omp's overlay, the leaving control's second page), and the Mac's wheel.
 */
async function driveRow(main, P, spec, build) {
  const far = spec.place === 'far';
  const x = { id: spec.id, place: spec.place, build, via: spec.via, agent: spec.agent, session: null, argv: null, resumeArgv: null, hello: null, flags: null, picture: null, extraPage: null, pull: null, wheel: null };
  const fromMs = Date.now();
  try {
    if (spec.via === 'row') x.session = await agentSession(main, `${build[0]}-${spec.place}-${spec.id}`, spec.agent, { far, extraArgs: spec.extra ?? [] });
    else x.session = await shellSession(main, `${build[0]}-${spec.place}-${spec.id}`, { far });
    const target = await targetOf(x.session, far);
    if (target === null) throw new Error('its tmux session never appeared');
    if (spec.via === 'shell') await typeInto(target, far, [shq(wrapperPath(spec.wrapper, far)), ...(spec.args ?? []).map(shq)].join(' '));
    const pane = flagsOf(target, far)?.pane ?? null;
    const hello = await waitFor(() => helloOf(x.session, pane, far, fromMs), 30_000, 200);
    if (hello === null) throw new Error(`its stand-in never said hello, so Tortie ran something else as ${spec.agent}`);
    x.hello = helloSlim(hello);
    if (spec.via === 'row') Object.assign(x, await argvOf(x.session));
    const full = hello.view === 'fullscreen';
    const pic = await pictureUntil(P, x.session, (s) => (full ? s.alternate === true : typeof s.depth === 'number'), 20_000);
    x.flags = flagsOf(target, far);
    x.picture = pictureSlim(pic);
    if (pic === null) throw new Error('no picture was read');
    if (full) x.extraPage = await extraPage(P, x.session, pic, target, far);
    if (spec.id === 'grok' && build === 'head' && phoneWouldPage(pic)) {
      const beforeTab = await pullPage(P, x.session, hello, pic);
      const tab = await keyWrite(P, x.session, 'Tab', await picture(P, x.session));
      await sleep(400);
      x.grok = { beforeTab, tab };
      x.pull = await pullPage(P, x.session, hello, await picture(P, x.session));
    } else if (spec.id === 'ctl-leave' && build === 'head' && phoneWouldPage(pic)) {
      const first = await pullPage(P, x.session, hello, pic);
      const afterPic = await pictureUntil(P, x.session, (s) => s.alternate === false, 5_000);
      const from2 = Date.now();
      const second = await keyWrite(P, x.session, 'PPage', pic);
      await sleep(700);
      // THE PROBE REVIEW: a capture that failed counts no `~` as null, never 0 (UNREADABLE_WHEN asks it).
      const shown = readerOf(far)('capture-pane', '-p', '-t', target);
      const tildes = shown === null ? null : (shown.match(/~/g) ?? []).length;
      x.leave = { first, after: { alternate: afterPic?.alternate === true, pages: afterPic?.pages === true }, second: { answer: second, reads: readsOf(hello, from2) }, tildes };
      x.pull = first;
    } else if (full && build === 'head' && phoneWouldPage(pic)) {
      x.pull = await pullPage(P, x.session, hello, pic);
    } else if (!full && typeof pic.depth === 'number') {
      x.pull = await pullHistory(P, x.session, hello, pic, target, far);
    } else {
      const from = Date.now();
      await sleep(400);
      x.pull = { kind: 'none', why: pic.asking === true ? 'asking' : pic.pages === true ? 'not typable' : 'no pages offered', reads: readsOf(hello, from) };
    }
    if (spec.id === 'omp') {
      const fromO = Date.now();
      signalStandin(hello.pid, 'SIGUSR1');
      const opic = await pictureUntil(P, x.session, (s) => s.alternate === true, 3_000);
      const overlayPull = phoneWouldPage(opic) ? await pullPage(P, x.session, hello, opic) : { kind: 'none', why: 'no pages offered', reads: readsOf(hello, fromO) };
      x.overlay = { picture: pictureSlim(opic), pull: overlayPull };
      await sleep(8_500);
    }
    x.wheel = await macWheel(main, P, x.session, hello, target, far);
  } catch (err) {
    x.error = String(err?.message ?? err);
  } finally {
    if (x.session !== null) await bridge(main, `window.gmux.sessions.kill(${J(x.session)})`).catch(() => null);
  }
  say(`M ${build} ${spec.place} ${spec.id}: ${x.error ?? `${String(x.hello?.view)}, pages ${String(x.picture?.pages)}, pull ${String(x.pull?.kind)}`}`);
  return x;
}

// ---------------------------------------------------------------------------
// The machine, the profile and the launch
// ---------------------------------------------------------------------------

/** The far login files: a closed PATH with the machine's wrappers first, and a prompt this file reads. */
function writeFarLogin() {
  writeFileSync(join(FAR_ZDOT, '.zprofile'), `# probe:p350: the machine's wrappers first, and nothing of his.\nexport PATH="${FAR_PATH}"\nexport HISTFILE=/dev/null\n`, 'utf8');
  writeFileSync(join(FAR_ZDOT, '.zshrc'), `# probe:p350\nexport PATH="${FAR_PATH}"\nexport HISTFILE=/dev/null\nPS1='p350far %# '\nRPROMPT=''\n`, 'utf8');
}
function writeMachines() {
  mkdirSync(dirname(MACHINES_JSON), { recursive: true, mode: 0o700 });
  writeFileSync(MACHINES_JSON, `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: MACHINE_LABEL, host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: FAR_TMUX }] })}\n`, 'utf8');
  const known = join(PROFILE, 'gmux', 'machines', 'known-machines');
  mkdirSync(dirname(known), { recursive: true });
  writeFileSync(known, keyscanText({ host: carriage.host, port: carriage.port, caller: 'build/p350/probe-p350.mjs' }), 'utf8');
}
/** pi's band and the version delay, for every start from now on. */
function setBand(band, delayMs = 0) {
  writeFileSync(BAND_FILE, `${band}\n`, 'utf8');
  if (delayMs > 0) writeFileSync(DELAY_FILE, `${String(delayMs)}\n`, 'utf8');
  else rmSync(DELAY_FILE, { force: true });
}

let standin = null;
let dns = null;
let watch = null;
let lastShim = 0;
let lastApp = 0;
const shims = new Set();
const apps = new Set();
let tailscalePreflight = false;
const dnsPreflights = [];
const agentsHeld = [];
const shadows = [];
const launches = [];
let resolvedOk = false;
let hiddenUnresolved = false;
let farResolvedOk = false;
/** Set when a launch is refused because an agent other than the stand-ins could run: no run, exit 2. */
let agentsRefused = false;

function launchOptions(label, checkout) {
  return {
    label,
    userDataDir: PROFILE,
    cwd: checkout,
    // THE STANDARD FORM (his ruling of 2 November 2026, "ok do the allow"): the helper is handed this run's socket,
    // so it reads his session names once before and once after the launch, read only (its layer-4 census), and its
    // teardown ends this run's scratch server. Nothing else in this file reads his server.
    tmuxSocket: SOCKET,
    // THE FIX ROUND: the three switches probe:p292 launches its own wheel probe with. A window behind the
    // person's own (he works at this Mac while it runs) is occluded, Chromium then reads its page as hidden, and
    // every CDP `Input.dispatchMouseEvent` the desk's wheel sends (M, J1, GRACE) waits on a renderer that draws
    // nothing: 90 s each, measured on 2026-11-02 with `document.visibilityState` 'hidden'. The same at both builds.
    args: [
      '--remote-debugging-port=0',
      '--use-mock-keychain',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'
    ],
    env: withoutDevRenderer({
      ...INHERITED,
      HOME,
      ZDOTDIR: HOME,
      HISTFILE: '/dev/null',
      PATH: APP_PATH,
      GMUX_TMUX_SOCKET: SOCKET,
      GMUX_PROBES: '1',
      GMUX_LOG_FILE: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_CONFIG_ROOT: CONFIG_ROOT,
      GMUX_HARNESS_DIR: HARNESS_DIR,
      GMUX_TAILSCALE_BIN: standin.binPath,
      [NAME_SERVERS_VAR]: dns.servers,
      ...(typeof carriage.authSock === 'string' ? { SSH_AUTH_SOCK: carriage.authSock } : {})
    }),
    graceMs: 8_000,
    ceilingMs: 3_600_000
  };
}

/** The scan's verdict over the app's own agents:list, refusing the run on a failure. */
async function scanVerdict(main, label) {
  const list = JSON.parse(await cdpEval(main, AGENTS_LIST_EXPR, 120_000));
  const held = hiddenAgentsScanVerdict(list, HIDDEN_IDS);
  const only = standInsOnlyVerdict(list, { standIns: STAND_IN_ROWS, under: RUN });
  (report.readings.agentScans ??= []).push({ label, held: held.said, only: only.said, pi: list.find((a) => a.id === 'pi')?.version ?? null });
  agentsHeld.push(held.ok && only.ok);
  if (!held.ok || !only.ok) agentsRefused = true;
  if (!held.ok) throw new Error(`agents:list says a hidden agent resolved: ${held.said}`);
  if (!only.ok) throw new Error(`agents:list says an agent other than the stand-ins resolved: ${only.said}`);
  return list;
}

/**
 * One launch through the helper, after the preflights, the shadow refusal and
 * the hidden agents. `askLast` leaves `agents:list` to the body, which must
 * call `scanVerdict` itself at its end (D13); every other launch asks first.
 */
async function launch(label, checkout, body, { askLast = false } = {}) {
  const pre = preflightStandin(standin, standin.binPath);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused the launch: ${pre.problems.join('; ')}`);
  const dnsPre = await dns.preflight(dns.servers);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
  if (!dnsPre.ok) throw new Error(`the DNS preflight refused the launch: ${dnsPre.problems.join('; ')}`);
  {
    const scan = absoluteScanDirsOf((() => {
      try {
        return readFileSync(join(checkout, 'src', 'main', 'tmux', 'resolve.ts'), 'utf8');
      } catch {
        return '';
      }
    })());
    const s = scan === null ? { ok: false, copies: [], unreadable: ['(extraBinDirsFor not found in the checkout)'] } : shadowCopiesOf([...scan, ...SYSTEM_DIRS], ROW_NAMES);
    shadows.push({ label, ...s });
    if (!s.ok) {
      agentsRefused = true;
      throw new Error(`a copy of a stand-in's name sits where the app's scan looks, or a folder it searches cannot be read (${J(s)}), so Tortie would run it for its version`);
    }
  }
  const hiddenPre = hiddenAgentsPrecheck({ checkout, prefix: HIDDEN_PREFIX, home: HOME, userPath: `${LOGIN_PATH}:${APP_PATH}`, standIns: STAND_IN_ROWS });
  (report.readings.hiddenPrechecks ??= []).push({ label, ok: hiddenPre.ok, said: hiddenPre.said, wouldResolve: hiddenPre.wouldResolve });
  if (!hiddenPre.ok) {
    agentsHeld.push(false);
    agentsRefused = true;
    throw new Error(`the hidden agents' precheck refused the launch: ${hiddenPre.said}`);
  }
  writeHiddenAgents(PROFILE, HIDDEN_PREFIX, HIDDEN_IDS);
  const options = launchOptions(label, checkout);
  const entry = { label, tmuxSocket: options.tmuxSocket, band: readFileSync(BAND_FILE, 'utf8').trim(), startedAt: Date.now(), census: null };
  launches.push(entry);
  try {
    const value = await withElectron(options, async (handle) => {
      lastShim = handle.pid;
      shims.add(handle.pid);
      const appNow = () => {
        try {
          lastApp = handle.appPid() || lastApp;
          if (lastApp > 0) apps.add(lastApp);
        } catch {
          /* not up yet */
        }
        return lastApp;
      };
      appNow();
      const main = await attachMain();
      appNow();
      try {
        if (!askLast) await scanVerdict(main, label);
        return await body(main, handle);
      } finally {
        main.close();
        appNow();
      }
    });
    // The helper returned, so its census, which throws when one of his sessions appeared or went across a launch
    // whose body returned, read no change; and its teardown ended this run's scratch server.
    entry.census = 'no change';
    say(`${label}: the helper read his session names before and after this launch, read only, and saw no change`);
    return value;
  } catch (err) {
    const m = String(err?.message ?? err);
    if (/ APPEARED on | WENT from /.test(m)) entry.census = m;
    throw err;
  } finally {
    // The next launch's server is a new one, perhaps another build's tmux: its binary is read again.
    localTmuxBin = null;
  }
}

/** The machine made usable and its far folder opened, as probe:p348 does it. */
async function machineUp(main) {
  const up = await bridge(main, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
  const ok = up.ok && (up.value?.rows ?? []).some((row) => row.id === MACHINE_ID && row.usable);
  if (ok) {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const opened = await bridge(main, `window.__gmuxP95.openRemote(${J(MACHINE_ID)}, ${J(FAR)})`);
      if (opened.ok && opened.value?.result?.ok === true) break;
      await sleep(3_000);
    }
  }
  return ok;
}

// ---------------------------------------------------------------------------
// The arms' own steps
// ---------------------------------------------------------------------------

/** One restore, its typed command read off the pane by this file's own capture, then Enter, and the pane read alive. */
async function restoreAndRead(main, id, { press = true, far = false, program = 'pi' } = {}) {
  const fromMs = Date.now();
  const got = await bridge(main, `window.gmux.sessions.restore(${J(id)})`);
  const target = await targetOf(id, far);
  if (target === null) return { ok: false, why: `the restore made no tmux session (${J(got).slice(0, 200)})`, typed: null };
  // The snapshot's replay and a drift notice are typed WITH Enter first; the armed command is the one naming the program.
  // THE PROBE REVIEW: the reading is still the pane's own line, but it is taken once it says what the restore says it
  // typed (`armedCommand`), so a capture made before the shell echoed the new command is never the reading; when the
  // two never agree in 15 s, the pane's last line is the reading, and the grader holds the product to it.
  const armed = got.ok ? (got.value?.armedCommand ?? null) : null;
  const armedWords = typeof armed === 'string' ? shellWords(armed.trim()) : null;
  let lastTyped = null;
  // THE FIX ROUND: the pane's width, so a command zsh redrew with hard breaks there is read whole.
  const width = Number(String(readerOf(far)('display-message', '-p', '-t', target, '#{pane_width}') ?? '').trim());
  const cols = Number.isInteger(width) && width > 0 ? width : Number.POSITIVE_INFINITY;
  const typed = await waitFor(() => {
    const t = typedArgvOf(String(readerOf(far)('capture-pane', '-p', '-J', '-t', target) ?? ''), cols);
    if (t === null || basename(String(t[0] ?? '')) !== program) return null;
    lastTyped = t;
    return armedWords === null || J(t) === J(armedWords) ? t : null;
  }, 15_000, 250);
  const out = { ok: true, at: fromMs, typedAt: Date.now(), armed, typed: typed ?? lastTyped ?? null, ran: null, alive: null, view: null, alternate: null };
  if (!press) return out;
  readerOf(far)('send-keys', '-t', target, 'Enter');
  const pane = flagsOf(target, far)?.pane ?? null;
  const hello = await waitFor(() => helloOf(id, pane, far, fromMs), 15_000, 200);
  // THE FIX ROUND: what the program itself was started with, from its own hello, the ground truth a pane's
  // capture only reports; the graders read it before the typed line (`ranOf`).
  out.ran = hello === null || !Array.isArray(hello.argv) ? null : [String(out.typed?.[0] ?? program), ...hello.argv.map(String)];
  await sleep(1_000);
  // A person answering whatever the program asks first: a trust ask below the floor ends it on this key.
  readerOf(far)('send-keys', '-t', target, '-l', 'a');
  await sleep(1_200);
  const flags = flagsOf(target, far);
  out.view = hello?.view ?? null;
  out.alive = hello !== null && alive(hello.pid) && flags?.dead === 0;
  out.alternate = flags?.alternate ?? null;
  return out;
}

/** One B create at one band: a pi session once agents:list answered, its argv, its pane read alive. */
async function bandCreate(main, band) {
  const fromMs = Date.now();
  const id = await agentSession(main, `b-${band}`, 'pi');
  const target = await targetOf(id, false);
  const pane = target === null ? null : flagsOf(target, false)?.pane ?? null;
  const hello = await waitFor(() => helloOf(id, pane, false, fromMs), 20_000, 200);
  await sleep(1_500);
  const flags = target === null ? null : flagsOf(target, false);
  const a = await argvOf(id);
  await bridge(main, `window.gmux.sessions.kill(${J(id)})`);
  return { id, argv: a.argv, resumeArgv: a.resumeArgv, view: hello?.view ?? null, alternate: flags?.alternate ?? null, alive: hello !== null && flags?.dead === 0 };
}

/** PASS's before and after of one HEAD launch: every pi row through the shipping store. */
function passRowsOf(before, after) {
  const out = [];
  for (const b of before) {
    const a = after.find((x) => x.id === b.id);
    out.push({ id: b.id, agent: 'pi', local: b.machineId === 'local', agentSessionId: b.agentSessionId, status: b.status, before: b.resumeArgv, after: a === undefined ? undefined : a.resumeArgv });
  }
  return out;
}

/** The shapes PASS plants (SPEC §8.2), each a copy of a parent row with its own id. */
const PLANTED = [];
function plantShape(shape, sourceId, argv, { status = 'restorable', id = randomUUID(), conversation = randomUUID(), far = false } = {}) {
  const row = { shape, id, source: sourceId, name: `p350-plant-${shape}`, tmuxName: `p350-plant-${shape}-${id.slice(0, 6)}`, agentSessionId: conversation, argv, resumeArgv: argv, status, at: Date.now(), far };
  PLANTED.push(row);
  return row;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

let A = null;
let B = null;
const readings = { mParent: [], mHead: [], rp: null, j1: null, j2: null, graceParent: null, graceHead: null, bands: [], belowRestore: null, d13: { head: null, parent: null }, pass: [] };
const piSource = { local: null, far: null };
const bandRows = {};
let machineOk = false;

/** One HEAD launch's PASS reading, wrapped around its body: the rows before (no app), then after the scan answered. */
async function headLaunch(label, band, body, { delayMs = 0, askLast = false, plantAfter = null } = {}) {
  setBand(band, delayMs);
  const before = on('PASS') ? storePiRows() : { ok: false, rows: [] };
  let after = null;
  const result = await launch(label, ROOT, async (main, handle) => {
    if (!askLast) {
      await sleep(3_000);
      after = on('PASS') ? storePiRows() : null;
    }
    const v = await body(main, handle);
    if (askLast) after = on('PASS') ? storePiRows() : null;
    return v;
  }, { askLast });
  if (on('PASS') && before.ok && after?.ok === true) readings.pass.push({ label, floor: floorOf(band), rows: passRowsOf(before.rows, after.rows), restores: plantAfter ?? [] });
  return result;
}

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, PROFILE, PROJECTS, PROJECT, FAR, BIN, FAR_BIN, NODE_BIN, STANDIN_DIR, FAR_STANDIN_DIR, COPIES, NEVER_RUN]) mkdirSync(dir, { recursive: true });
  symlinkSync(process.execPath, join(NODE_BIN, 'node'));
  writeFileSync(join(PROJECT, 'README.md'), "# Phase 350, the probe's project\n");
  writeFileSync(join(FAR, 'README.md'), '# Phase 350, the far folder\n');
  setBand(BANDS[0]);

  // ---- the stand-ins on the scratch PATH and the machine's ------------------
  writeWrappers({ bin: BIN, standinDir: STANDIN_DIR, bandFile: BAND_FILE, delayFile: DELAY_FILE, wrappers: [...ROW_WRAPPERS, ...SHELL_WRAPPERS] });
  writeWrappers({ bin: FAR_BIN, standinDir: FAR_STANDIN_DIR, bandFile: BAND_FILE, delayFile: DELAY_FILE, wrappers: [...ROW_WRAPPERS, ...SHELL_WRAPPERS] });
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${LOGIN_PATH}"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${LOGIN_PATH}"\nexport HISTFILE=/dev/null\nPS1='p350 %# '\n`, 'utf8');
  writeFileSync(join(HOME, '.hushlogin'), '');
  writeFarLogin();
  writeMachines();
  // THE PRECONDITION: the ten bare names are this run's wrappers and no hidden row's binary resolves, asked of the
  // login shell the app will ask, with the environment the app will be given; the same of the machine's login
  // shell, which is this Mac's zsh under the yard's own ZDOTDIR and HOME (what sshd starts there). Anything else
  // is no run (exit 2).
  {
    const loginShell = (process.env['SHELL'] ?? '').trim() || userInfo().shell || '/bin/zsh';
    const ask = (env, bare) => (String(spawnSync(loginShell, ['-lc', `command -v ${bare} || true`], { encoding: 'utf8', timeout: 30_000, env }).stdout ?? '').trim().split('\n').pop() ?? '');
    const shellEnv = { ...process.env, ...INHERITED, HOME, ZDOTDIR: HOME, HISTFILE: '/dev/null', PATH: APP_PATH };
    for (const n of Object.keys(INHERITED)) delete shellEnv[n];
    const farEnv = { ...process.env, ...INHERITED, HOME: FAR_HOME, ZDOTDIR: FAR_ZDOT, HISTFILE: '/dev/null', TMUX_TMPDIR: carriage.tmuxTmp };
    for (const n of Object.keys(INHERITED)) delete farEnv[n];
    const resolved = Object.fromEntries(ROW_NAMES.map((b) => [b, ask(shellEnv, b)]));
    const hidden = Object.fromEntries(HIDDEN_BINS.map((b) => [b, ask(shellEnv, b)]));
    const farResolved = Object.fromEntries([...ROW_NAMES, ...SHELL_WRAPPERS.map((w) => w.name)].map((b) => [b, ask(farEnv, b)]));
    const named = (dir, b, at) => at === join(dir, b) && readFileSync(join(dir, b), 'utf8').includes(STANDIN_PATH);
    resolvedOk = ROW_NAMES.every((b) => named(BIN, b, resolved[b]));
    hiddenUnresolved = Object.values(hidden).every((where) => where === '');
    farResolvedOk = Object.entries(farResolved).every(([b, at]) => named(FAR_BIN, b, at));
    report.readings.resolves = { resolved, hidden, farResolved };
    if (!resolvedOk || !hiddenUnresolved || !farResolvedOk) {
      agentsRefused = true;
      throw new Error(`the scratch login shells resolve ${J({ resolved, hidden, farResolved })}: a stand-in is not this run's, or a hidden agent resolves, so nothing is launched`);
    }
  }
  standin = makeStandin({ dir: join(RUN, 'tailscale'), scenario: { ...DEFAULT_SCENARIO } });
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflight = pre.ok;
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
  watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });
  say(`measuring ${ROOT} after the parent ${resolve(PARENT)}; socket ${SOCKET}; the loopback machine on ${String(carriage.host)}:${String(carriage.port)}`);
  const matrixRows = MATRIX.filter((m) => on('M') || ((on('J1') || on('J2')) && ((m.place === 'here' && ['pi', 'claude', 'pi-person'].includes(m.id)) || (m.place === 'far' && m.id === 'pi'))));

  // ======================================================================
  // L0 THE PARENT, first: the phones, J1, RP, M, GRACE, PASS's sources
  // ======================================================================
  await launch('p350-parent', resolve(PARENT), async (main) => {
    await pocket(main, 'setDoor', { on: true });
    const door = await confirmDoor(main);
    if (!door.ok) throw new Error(`the parent's door never listened: ${door.why}`);
    A = await pairPhone(main, 'p350 phone A');
    if (!A.ok) throw new Error(`phone A did not pair with the parent: ${A.why}`);
    B = await pairPhone(main, 'p350 phone B');
    if (!B.ok) throw new Error(`phone B did not pair with the parent: ${B.why}`);
    await bridge(main, `window.__p293.addProject(${J(PROJECT)})`);
    machineOk = await machineUp(main);
    say(`parent: the loopback machine usable: ${String(machineOk)}`);
    // RP: the parent's full-screen pi, a page and its sibling sent anyway.
    await step('RP', async () => {
      const id = await agentSession(main, 'rp-pi', 'pi');
      const target = await targetOf(id, false);
      const hello = await waitFor(() => helloOf(id, flagsOf(target, false)?.pane ?? null, false, 0), 20_000, 200);
      const pic = await pictureUntil(A, id, (s) => s.alternate === true, 15_000);
      const from = Date.now();
      const answers = [{ key: 'PPage', ...(await keyWrite(A, id, 'PPage', pic)) }, { key: 'NPage', ...(await keyWrite(A, id, 'NPage', pic)) }];
      await sleep(800);
      // THE PROBE REVIEW: no hello is no log to read, null (UNREADABLE), never [] ("nothing reached it").
      readings.rp = { picture: pictureSlim(pic), answers, reads: hello === null ? null : readsOf(hello, from) };
      await bridge(main, `window.gmux.sessions.kill(${J(id)})`);
    });
    // M's parent half, and J1's rows inside it.
    for (const spec of matrixRows) {
      if (spec.place === 'far' && !machineOk) continue;
      readings.mParent.push(await driveRow(main, A, spec, 'parent'));
    }
    // J1's extra read: a phone page to the parent's pi (its keys answer and the log), over a fresh pi.
    if (on('J1')) {
      await step('J1 keys', async () => {
        const id = await agentSession(main, 'j1-pi', 'pi');
        const target = await targetOf(id, false);
        const hello = await waitFor(() => helloOf(id, flagsOf(target, false)?.pane ?? null, false, 0), 20_000, 200);
        const pic = await pictureUntil(A, id, (s) => s.alternate === true, 15_000);
        const from = Date.now();
        const piKeys = [await keyWrite(A, id, 'PPage', pic)];
        await sleep(800);
        // THE PROBE REVIEW: no hello is no log to read, null (UNREADABLE), never [] ("nothing reaches it").
        readings.j1 = { piKeys, piKeysReads: hello === null ? null : readsOf(hello, from) };
        await bridge(main, `window.gmux.sessions.kill(${J(id)})`);
      });
    }
    // GRACE's parent half: the desk's wheel over an idle full-screen pi.
    if (on('GRACE')) readings.graceParent = await step('GRACE parent', () => graceHalf(main, null, 'parent'));
    // PASS's sources: one local pi row and one on the machine, ended so they are records.
    if (on('PASS')) {
      await step('PASS sources', async () => {
        piSource.local = await agentSession(main, 'pass-src', 'pi');
        await argvOf(piSource.local);
        await bridge(main, `window.gmux.sessions.kill(${J(piSource.local)})`);
        if (machineOk) {
          piSource.far = await agentSession(main, 'pass-src-far', 'pi', { far: true });
          await argvOf(piSource.far);
          await bridge(main, `window.gmux.sessions.kill(${J(piSource.far)})`);
        }
      });
    }
  });

  // ======================================================================
  // L1 THE PARENT again, over a manifest holding local pi rows: D13's half
  // ======================================================================
  if (on('D13')) {
    await launch('p350-parent-d13', resolve(PARENT), async (main) => {
      await bridge(main, `window.__p293.addProject(${J(PROJECT)})`);
      await sleep(6_000);
      // The earliest moment any terminal of this launch could hold bytes: before its first pane exists.
      const firstBytesAt = Date.now();
      const id = await shellSession(main, 'd13-parent-shell');
      await front(main, id, false);
      await sleep(8_000);
      const askAt = Date.now();
      await scanVerdict(main, 'p350-parent-d13');
      await sleep(1_000);
      readings.d13.parent = { firstBytesAt, askAt, versions: versionCalls(STANDIN_DIR).filter((v) => v.agent === 'pi' && v.at >= launches[launches.length - 1].startedAt) };
    }, { askLast: true });
  }

  // ---- PASS's planted rows, through the SHIPPING store, while no app runs ---------------------------------------
  if (on('PASS') && piSource.local !== null) {
    const bin = (startedAgents.get(piSource.local)?.argv0 ?? join(BIN, 'pi'));
    const U = () => randomUUID();
    const shapes = [];
    { const u = U(); shapes.push(plantShape('pre', piSource.local, [bin, '--session-id', u], { conversation: u })); }
    { const u = U(); shapes.push(plantShape('pre-flags', piSource.local, [bin, '--session-id', u, '--model', 'm'], { conversation: u })); }
    { const u = U(); shapes.push(plantShape('person-fullscreen', piSource.local, [bin, '--session-id', u, '--tui-mode', 'fullscreen'], { conversation: u })); }
    { const u = U(); shapes.push(plantShape('head', piSource.local, [bin, ...PI_TOKEN, '--session-id', u], { conversation: u })); }
    { const u = U(); shapes.push(plantShape('head-person', piSource.local, [bin, ...PI_TOKEN, '--session-id', u, '--tui-mode', 'fullscreen'], { conversation: u })); }
    { const u = U(); shapes.push(plantShape('discarded', piSource.local, [bin, '--session-id', u], { conversation: u, status: 'discarded' })); }
    { shapes.push(plantShape('no-id', piSource.local, [bin], { conversation: null })); }
    { const u = U(); shapes.push(plantShape('wrapped', piSource.local, [join(NEVER_RUN, 'specstory'), 'run', 'pi', '--no-cloud-sync', '-c', `${bin} --session-id ${u}`], { conversation: u })); }
    { const u = U(); shapes.push(plantShape('differs', piSource.local, [bin, '--session-id', randomUUID()], { conversation: u })); }
    if (piSource.far !== null) { const u = U(); shapes.push(plantShape('far', piSource.far, [join(FAR_BIN, 'pi'), '--session-id', u], { conversation: u, far: true })); }
    const planted = plantRows(shapes.map((s) => ({ ...s, resumeArgv: s.agentSessionId === null ? null : s.resumeArgv })));
    report.readings.planted = planted;
    say(`PASS planted ${String(shapes.length)} rows: ${J(planted).slice(0, 200)}`);
  }

  /** Restore every planted local row that holds a resume argv (not the wrap, not the discarded), reading its typed command. */
  const restorePlanted = async (main) => {
    const out = [];
    const rows = manifestRows();
    for (const p of PLANTED.filter((x) => !x.far && x.status !== 'discarded' && x.agentSessionId !== null && x.shape !== 'wrapped')) {
      const recorded = rows?.get(p.id)?.resumeArgv ?? null;
      const got = await step(`PASS restore ${p.shape}`, () => restoreAndRead(main, p.id, { press: false }));
      out.push({ id: p.id, shape: p.shape, recorded, typed: got?.typed ?? null });
      await bridge(main, `window.gmux.sessions.kill(${J(p.id)})`).catch(() => null);
    }
    return out;
  };

  // ======================================================================
  // L2 HEAD at 1.4.0: J2, M, GRACE, PASS at holds, B's 1.4.0 create
  // ======================================================================
  const restoresL2 = [];
  await headLaunch('p350-head', BANDS[0], async (main) => {
    await bridge(main, `window.__p293.addProject(${J(PROJECT)})`);
    machineOk = await machineUp(main);
    const door = await doorUp(main);
    say(`HEAD: the machine usable ${String(machineOk)}; the door ${J(door)}`);
    if (A === null || (await signedGet(A.phone, A.door, '/v1/blocked')).status !== 200) throw new Error('phone A, paired at the parent, cannot read at HEAD');
    readings.j2door = door;
    for (const spec of matrixRows) {
      if (spec.place === 'far' && !machineOk) continue;
      readings.mHead.push(await driveRow(main, A, spec, 'head'));
    }
    if (on('GRACE')) readings.graceHead = await step('GRACE head', () => graceHalf(main, A, 'head'));
    if (on('PASS')) restoresL2.push(...(await restorePlanted(main)));
    if (on('B') || on('D13')) bandRows['1.4.0'] = await step('B create 1.4.0', () => bandCreate(main, '1.4.0'));
  }, { plantAfter: restoresL2 });

  // ======================================================================
  // L3 HEAD at 1.4.0 again: B's 1.4.0 restore
  // ======================================================================
  if (on('B') || on('PASS')) {
    await headLaunch('p350-head-1.4.0-again', BANDS[0], async (main) => {
      await bridge(main, `window.__p293.addProject(${J(PROJECT)})`);
      if (bandRows['1.4.0'] !== null && bandRows['1.4.0'] !== undefined) {
        const restore = await step('B restore 1.4.0', () => restoreAndRead(main, bandRows['1.4.0'].id));
        readings.bands.push({ band: '1.4.0', create: bandRows['1.4.0'], restore });
      }
    });
  }

  // ======================================================================
  // L4 HEAD at 1.4.0 with the version answer held: D13's HEAD half
  // ======================================================================
  if (on('D13')) {
    const rowsNow = manifestRows();
    const withToken = [...(rowsNow?.entries() ?? [])]
      .filter(([, r]) => r.agent === 'pi' && r.machineId === 'local' && r.status !== 'discarded' && tokenAt1(r.resumeArgv))
      .map(([id, r]) => ({ id, resumeArgv: r.resumeArgv }))
      .sort((a, b) => Number(b.id === bandRows['1.4.0']?.id) - Number(a.id === bandRows['1.4.0']?.id) || a.resumeArgv.length - b.resumeArgv.length);
    await headLaunch('p350-head-d13', BANDS[0], async (main) => {
      const sampler = startVersionSampler();
      try {
        await bridge(main, `window.__p293.addProject(${J(PROJECT)})`);
        // The door first, so nothing between the first terminal bytes and the start waits on it.
        const door = await doorUp(main);
        const list = door.ok && A !== null ? await readSessions(A.phone, A.door) : null;
        const project = (list?.answer?.start?.projects ?? []).find((p) => p.place === 'local')?.id ?? null;
        // No terminal yet: no stand-in -v may start (Phase 164's boot, and D18's warm waits for the first bytes).
        await sleep(6_000);
        // The earliest moment any terminal of this launch could hold bytes: before its first pane exists.
        const firstBytesAt = Date.now();
        const shellId = await shellSession(main, 'd13-head-shell');
        await front(main, shellId, false);
        const piEnd = () => versionCalls(STANDIN_DIR).find((v) => v.agent === 'pi' && v.phase === 'end' && v.at >= firstBytesAt)?.at ?? null;
        const head = { delayMs: D13_DELAY_MS, firstBytesAt, askAt: null, versions: [], inside: null, after: null, phoneStart: null };
        // INSIDE THE WINDOW, at once: the phone's start, then a HEAD-recorded row with the token restored.
        if (project !== null) {
          const startAt = Date.now();
          const reply = await startSession(A.phone, A.door, { project, agent: 'pi' });
          const read = startAnswerOf(reply, reply.write);
          const answeredAt = Date.now();
          const sid = read.answer?.session?.id ?? null;
          if (sid !== null) startedAgents.set(sid, { argv0: null });
          const a = sid === null ? { argv: null } : await argvOf(sid);
          const end = piEnd();
          head.phoneStart = { at: startAt, inside: end === null || end > answeredAt, outcome: read.answer?.outcome ?? null, argv: a.argv };
          if (sid !== null) await bridge(main, `window.gmux.sessions.kill(${J(sid)})`).catch(() => null);
        } else head.phoneStart = { at: Date.now(), inside: true, outcome: door.ok ? 'no local project offered' : 'the door never listened', argv: null };
        const rowA = withToken[0] ?? null;
        const rowB = withToken[1] ?? null;
        if (rowA !== null) {
          const r = await restoreAndRead(main, rowA.id);
          const end = piEnd();
          // Not inside when the scan answered before the restore began, or before its command was read WITH the
          // token (the arm then may have read a version); a typed command with no token was armed inside. The fix
          // round: the command is the program's own argv where it said one (`ranOf`), as the graders read it.
          head.inside = { ...r, recorded: rowA.resumeArgv, scanAnswered: end !== null && (end < r.at || (end < r.typedAt && tokenAt1(ranOf(r)))) };
        }
        // AFTER THE SCAN ANSWERED: the second row.
        await waitFor(() => (piEnd() !== null ? true : null), 20_000, 200);
        await sleep(2_000);
        if (rowB !== null) {
          const r = await restoreAndRead(main, rowB.id);
          head.after = { ...r, recorded: rowB.resumeArgv };
        }
        // THIS FILE'S OWN ASK, LAST: the scan's verdict, refusing the run on a failure.
        head.askAt = Date.now();
        await scanVerdict(main, 'p350-head-d13');
        head.versions = versionCalls(STANDIN_DIR).filter((v) => v.agent === 'pi' && v.at >= launches[launches.length - 1].startedAt);
        head.sampler = sampler.stop();
        readings.d13.head = head;
      } finally {
        sampler.stop();
      }
    }, { delayMs: D13_DELAY_MS, askLast: true });
    setBand(BANDS[0]);
  }

  // ======================================================================
  // L5 and L6 HEAD at 0.99.2; L7 and L8 at 0.83.0: B, and PASS below
  // ======================================================================
  if (on('B') || on('PASS')) {
    for (const band of ['0.99.2', '0.83.0']) {
      await headLaunch(`p350-head-${band}`, band, async (main) => {
        await bridge(main, `window.__p293.addProject(${J(PROJECT)})`);
        bandRows[band] = await step(`B create ${band}`, () => bandCreate(main, band));
      });
      await headLaunch(`p350-head-${band}-again`, band, async (main) => {
        await bridge(main, `window.__p293.addProject(${J(PROJECT)})`);
        if (bandRows[band] !== null && bandRows[band] !== undefined) {
          const restore = await step(`B restore ${band}`, () => restoreAndRead(main, bandRows[band].id));
          readings.bands.push({ band, create: bandRows[band], restore });
        }
        if (band === '0.83.0' && bandRows['1.4.0'] !== null && bandRows['1.4.0'] !== undefined) {
          const recorded = bandRows['1.4.0'].resumeArgv;
          const r = await step('B restore below', () => restoreAndRead(main, bandRows['1.4.0'].id));
          readings.belowRestore = r === null ? null : { recorded, typed: r.typed, ran: r.ran, alive: r.alive, view: r.view };
        }
      });
    }
  }

  // ======================================================================
  // L9 HEAD on a band that is no version: PASS unread, the strip on restore
  // ======================================================================
  if (on('PASS') && piSource.local !== null) {
    const bin = startedAgents.get(piSource.local)?.argv0 ?? join(BIN, 'pi');
    const fresh = [];
    { const u = randomUUID(); fresh.push(plantShape('unread-head', piSource.local, [bin, ...PI_TOKEN, '--session-id', u], { conversation: u })); }
    { const u = randomUUID(); fresh.push(plantShape('unread-head-person', piSource.local, [bin, ...PI_TOKEN, '--session-id', u, '--tui-mode', 'fullscreen'], { conversation: u })); }
    report.readings.plantedUnread = plantRows(fresh);
    const restoresL9 = [];
    await headLaunch('p350-head-unread', UNREAD_BAND, async (main) => {
      await bridge(main, `window.__p293.addProject(${J(PROJECT)})`);
      for (const p of fresh) {
        const rows = manifestRows();
        const got = await step(`PASS restore ${p.shape}`, () => restoreAndRead(main, p.id, { press: false }));
        restoresL9.push({ id: p.id, shape: p.shape, recorded: rows?.get(p.id)?.resumeArgv ?? null, typed: got?.typed ?? null });
        await bridge(main, `window.gmux.sessions.kill(${J(p.id)})`).catch(() => null);
      }
    }, { plantAfter: restoresL9 });
    setBand(BANDS[0]);
  }
} catch (err) {
  // A run that stopped left every arm after the stop unread, which is exit 2 ("could not run"), never 1.
  unreadable += 1;
  report.error = String(err?.message ?? err);
  say(`the run stopped, so every arm after this point is UNREADABLE: ${report.error}`);
} finally {
  const safely = (label, fn, fallback = null) => {
    try {
      return fn();
    } catch (err) {
      (report.ending ??= []).push(`${label}: ${String(err?.message ?? err)}`);
      return fallback;
    }
  };
  const leaked = watch === null ? [] : safely('the Tailscale watcher', () => watch.stop(), []);
  const endedStandin = standin === null ? { ended: [], left: [] } : safely('the Tailscale stand-in', () => endStandinProcesses(standin.dir, 1_500), { ended: [], left: ['unknown'] });
  if (dns !== null) await dns.close().catch((err) => (report.ending ??= []).push(`the DNS stand-in: ${String(err?.message ?? err)}`));
  // Every agent stand-in this run started, each re-read before it is signalled: a pid a stand-in of THIS run wrote in
  // its hello whose command line is still the stand-in's, and any other process whose command line names this run's
  // folder. Never a process by the stand-in's path alone.
  const helloPids = new Set(safely("the stand-ins' hellos", () => allHellos(), []).map((h) => Number(h.pid)).filter((p) => Number.isInteger(p) && p > 1));
  const ours = (rows, pid) => {
    const command = rows.get(pid)?.command ?? '';
    if (pid === process.pid || command === '') return false;
    return command.includes(RUN) || (helloPids.has(pid) && command.includes(STANDIN_PATH));
  };
  const table = processTable();
  const pids = [...new Set([...helloPids, ...table.keys()])].filter((p) => Number.isInteger(p) && p > 1 && ours(table, p));
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* gone with its pane */
    }
  }
  for (let i = 0; i < 20 && pids.some(alive); i += 1) await sleep(100);
  {
    const now = processTable();
    for (const pid of pids.filter((p) => alive(p) && ours(now, p))) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* gone */
      }
    }
  }
  // The machine's server, by this run's socket under the machine's TMUX_TMPDIR, and nothing else.
  safely("the machine's scratch server", () => spawnSync(FAR_TMUX, ['-L', SOCKET, 'kill-server'], { encoding: 'utf8', env: FAR_ENV, timeout: 10_000 }));
  await sleep(300);
  const after = processTable();
  const agentsLeft = pids.filter((p) => alive(p) && ours(after, p)).length;
  const runLeft = [...after.values()].filter((r) => r.pid !== process.pid && r.command.includes(RUN)).length;
  // Electrons, counted once at the end: anything carrying this run's profile, and the shims and apps this run started
  // still running an Electron or the app (the main process renames itself to the bare `Tortie`).
  const electronsLeft = [...after.values()].filter((r) => r.command.includes(PROFILE) || ((shims.has(r.pid) || apps.has(r.pid)) && /[Ee]lectron|Tortie/.test(r.command))).length;

  // ---- the arms, graded now that every read is in ---------------------------
  const find = (list, place, id) => list.find((x) => x.place === place && x.id === id) ?? null;
  if (readings.rp !== null) arm('RP', readings.rp);
  else cannotRead('RP', 'the parent never paged its pi');
  if (on('J1')) {
    const pi = find(readings.mParent, 'here', 'pi');
    const claude = find(readings.mParent, 'here', 'claude');
    arm('J1', { pi, claude, piKeys: readings.j1?.piKeys ?? null, piKeysReads: readings.j1?.piKeysReads ?? null });
  }
  if (on('J2')) arm('J2', { door: readings.j2door ?? null, pi: find(readings.mHead, 'here', 'pi'), piPerson: find(readings.mHead, 'here', 'pi-person'), piFar: find(readings.mHead, 'far', 'pi'), claude: find(readings.mHead, 'here', 'claude') });
  if (on('M')) arm('M', { rows: [...readings.mParent, ...readings.mHead] });
  if (on('B')) arm('B', { bands: readings.bands, belowRestore: readings.belowRestore });
  if (on('D13')) arm('D13', readings.d13);
  if (on('PASS')) arm('PASS', { launches: readings.pass });
  if (on('GRACE')) arm('GRACE', { head: readings.graceHead, parent: readings.graceParent });
  // RUN: the manifest's programs, read from a COPY beside its WAL after the app is gone.
  const m = manifestSessions(MANIFEST);
  const roots = [RUN, FAR_HOME];
  try {
    roots.push(realpathSync(FAR_HOME));
  } catch {
    /* as written */
  }
  const SHELLS = safely('/etc/shells', () => readFileSync('/etc/shells', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l.startsWith('/')), ['/bin/zsh', '/bin/bash', '/bin/sh']);
  const outside = m.read ? m.rows.filter((row) => !(roots.some((root) => within(root, row.argv0)) || (row.agent === 'shell' && (row.argv0 === null || SHELLS.includes(row.argv0))))).map((row) => ({ id: row.id, name: row.name, agent: row.agent, argv0: row.argv0 })) : [];
  const started = [...startedAgents.entries()].map(([id, s]) => ({ id, argv0: s.argv0 ?? (m.rows.find((r) => r.id === id)?.argv0 ?? null) }));
  const history = { before: HISTORY_BEFORE, after: historyStat(), quiet: null };
  if (history.after !== history.before) {
    say(`his shell history moved across the run (${history.before} to ${history.after}); starting nothing for ${String(HISTORY_QUIET_MS / 1000)} s and reading it again`);
    await sleep(HISTORY_QUIET_MS);
    history.quiet = { again: historyStat(), waitedMs: HISTORY_QUIET_MS };
  }
  arm('RUN', {
    tailscalePreflight,
    dnsPreflights,
    agentsHeld,
    shadows,
    resolved: resolvedOk,
    hiddenUnresolved,
    farResolved: farResolvedOk,
    manifest: { read: m.read, rows: m.rows.length, outside, why: m.why },
    started,
    roots,
    socket: SOCKET,
    launches: launches.map((l) => ({ label: l.label, tmuxSocket: l.tmuxSocket, band: l.band, census: l.census })),
    realTailscale: leaked.length,
    samples: watch?.samples() ?? 0,
    forbidden: standin === null ? 0 : standin.forbidden().length,
    standinLeft: endedStandin.left.length,
    agentsLeft,
    runLeft,
    electronsLeft,
    history
  });
  for (const id of ['RP', ...[...ARMS].filter((x) => GRADERS[x] !== undefined), 'RUN']) {
    if (report.arms.some((a) => a.id === id)) continue;
    if (report.error === undefined) cannotRead(id, 'the run never read it');
    else report.arms.push({ id, ok: null, said: 'not read: the run stopped before it' });
  }
  safely('the report', () => {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'probe-p350.json'), `${JSON.stringify(report, (_k, v) => (typeof v === 'bigint' ? String(v) : v), 2)}\n`, { mode: 0o600 });
  });
  if (!KEEP) safely('the scratch world', () => rmSync(RUN, { recursive: true, force: true }));
  else say(`kept ${RUN} (P350_KEEP=1): the stand-ins' logs under ${STANDIN_DIR} and ${FAR_STANDIN_DIR}; every reading in ${OUT}`);
}

/**
 * GRACE's half at one build: a pi in full screen by a person's flag, waited
 * idle; at HEAD one phone page and its status sampled every 250 ms for 6 s;
 * then the desk's wheel over it and its status sampled the same way.
 */
async function graceHalf(main, P, build) {
  const id = await agentSession(main, `grace-${build}`, 'pi', { extraArgs: ['--tui-mode', 'fullscreen'] });
  try {
    const target = await targetOf(id, false);
    const fromMs = Date.now() - 1_000;
    const hello = await waitFor(() => helloOf(id, flagsOf(target, false)?.pane ?? null, false, fromMs), 20_000, 200);
    const settled = (await waitFor(async () => ((await statusOf(main, id)) === 'idle' ? true : null), 40_000, 500)) === true;
    const sample = async () => {
      const out = [];
      const until = Date.now() + GRACE_WINDOW_MS;
      while (Date.now() < until) {
        out.push(await statusOf(main, id));
        await sleep(GRACE_SAMPLE_MS);
      }
      return out;
    };
    const half = { settled, page: null, reads: [], samples: [], wheel: { samples: [] } };
    if (build === 'head' && P !== null) {
      const pic = await pictureUntil(P, id, (s) => s.alternate === true, 10_000);
      // THE PROBE REVIEW: the page's picture read at all, and its log only when the stand-in said hello.
      half.pictured = pic !== null;
      const from = Date.now();
      half.page = await keyWrite(P, id, 'PPage', pic);
      half.samples = await sample();
      half.reads = hello === null ? null : readsOf(hello, from);
      await waitFor(async () => ((await statusOf(main, id)) === 'idle' ? true : null), 20_000, 500);
    }
    // The front resizes the pane, and the reflow grace (2,500 ms) covers that redraw: the notches wait past it.
    await deskFront(main, id, false, 3_500);
    await deskWheel(main);
    half.wheel.samples = await sample();
    return half;
  } finally {
    await bridge(main, `window.gmux.sessions.kill(${J(id)})`).catch(() => null);
  }
}

say(`${String(report.arms.filter((a) => a.ok === true).length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
if (agentsRefused) say('a launch was refused because an agent other than the stand-ins could have run: no run, exit 2');
process.exit(agentsRefused ? 2 : failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
