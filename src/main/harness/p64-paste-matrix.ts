/**
 * THE MULTI LINE PASTE MATRIX — GMUX_SMOKE=p64-paste-matrix (Phase 64, Tier 3).
 *
 * ## The question, and why nothing in this tree had answered it
 *
 * Phase 64 puts a composed block of text into a running agent's prompt. The
 * block has line breaks in it. Research 16 measured ONE PATH PER PASTE and
 * nothing anywhere in this repository has ever measured a multi line one.
 *
 * Two facts make that the phase's real risk rather than a formality.
 *
 *  1. xterm converts before it wraps. Verified in this worktree, in
 *     node_modules/@xterm/xterm/lib/xterm.js module 7861:
 *     `function i(e){return e.replace(/\r?\n/g,"\r")}` runs first, and
 *     `function s(e,t){return t?"\x1b[200~"+e+"\x1b[201~":e}` wraps the result
 *     when `decPrivateModes.bracketedPasteMode` is on. So every newline in a
 *     composed block leaves the renderer as a CARRIAGE RETURN.
 *  2. A bare CR SUBMITS. `src/shared/agent-defaults.ts` records that a bare CR
 *     submits on 6 of 10 agents outside bracketed paste, and three registry
 *     rows carry the same trap in their own words: codex "tmux downgrades it
 *     to CR and codex submits", cursor "cursor-agent SUBMITS on CSI-u",
 *     antigravity "submits on CSI-u at VT10x".
 *
 * Bracketed paste is supposed to stop exactly that. Whether each agent's line
 * editor really honours it for an embedded CR is what this file measures, one
 * row per agent, on this machine, against the real binaries.
 *
 * ## The bytes it sends, and the one difference from the shipping path
 *
 * It sends the bytes xterm produces, byte for byte: ESC[200~, the block with
 * every newline already a CR, ESC[201~. They go in with
 * `tmux send-keys -t <target> -l`, which writes literal bytes at the pane.
 *
 * THE ONE DIFFERENCE, stated rather than glossed: on the shipping path those
 * bytes arrive at tmux's ATTACH CLIENT and tmux forwards them to the pane
 * unchanged when the application in it enabled DECSET 2004, and strips the
 * markers when it did not (research 16 section 1.3, verified both ways with
 * `cat -v`). `send-keys -l` writes at the pane and does no such stripping. For
 * an AGENT pane, which is every row in this matrix, the two are the same bytes
 * arriving at the same reader. For a plain shell they would differ, and a plain
 * shell is not a row here because Phase 64 refuses to aim one.
 *
 * ## What it costs the person whose machine this is
 *
 * A row whose agent submits early spends one turn on fourteen lines of
 * nonsense. That is the accepted cost of measuring the failure rather than
 * assuming it away. The session is killed as soon as the row is read, which
 * ends any turn that did start. NOTHING HERE EVER PRESSES RETURN.
 *
 * ## What the fix round changed here, and why fourteen lines rather than three
 *
 * The first build sent three lines and asked only whether each line's marker
 * was somewhere on the screen. Two agents were measured wrongly by that.
 * deepseek threw every line break away and the presence check still said whole,
 * because a substring survives concatenation. claude collapsed the block into
 * `[Pasted text #1 +13 lines]` and put no line on the screen at all, which the
 * same check would have called lost, and three lines never reached that
 * threshold so the phase never saw it. Both readings, and the four questions a
 * presence check cannot ask, are in `./p64-paste-classify.ts`, which is pure
 * and unit tested against the real screens both agents drew.
 *
 * ## What it refuses
 *
 * It runs only on a scratch tmux socket, and refuses socket `gmux` by name for
 * the reason every other harness that spawns real work refuses it. It moves,
 * deletes and installs no binary: an agent that is not on PATH is a ROW THAT
 * SAYS SO rather than a row that is quietly skipped, which is the charter's
 * own instruction and the honest denominator.
 *
 * `npm run probe:p64`.
 */

import { app } from 'electron';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  LAUNCHABLE_AGENT_IDS,
  agentBinaryCandidates,
  getRegistryEntry
} from '../agents';
import type { AgentKind, LaunchableAgentId } from '@shared/types';
import { TRUST_DIALOG_PATTERNS, firstMatch } from '../conformance/cases';
import { clearTrustGate, readPane, waitForQuiet } from '../conformance/pane';
import {
  P64_PROBE_LINES,
  classifyPaste,
  keyNamedByScreen,
  probeBlock,
  readPasteback,
  type PasteReadKind,
  type PasteReadback
} from './p64-paste-classify';
import { getGmuxCore, shutdownGmuxCore } from '../sessions';
import * as tmux from '../tmux';
import { armWatchdog, smokeFail, smokeLog } from './support';

const PREFIX = 'p64-paste-';

/** The bytes xterm wraps a paste in, and nothing else may compose them. */
const PASTE_START = '\x1b[200~';
const PASTE_END = '\x1b[201~';

/**
 * xterm's own newline conversion, copied from the shipped bundle rather than
 * reasoned about. See the header for the exact expression it mirrors.
 */
function asXtermPaste(text: string): string {
  return `${PASTE_START}${text.replace(/\r?\n/g, '\r')}${PASTE_END}`;
}

/** One agent's answer. A row is never absent. */
interface Row {
  agent: string;
  displayName: string;
  /**
   * not-installed | blocked | whole | chip-mismatch | run-on | duplicated |
   * windowed | split | out-of-order | early-submit | lost
   */
  verdict: string;
  binary: string | null;
  note: string;
  /** Whether the row was read off the screen, off a paste chip, or not at all. */
  readKind: PasteReadKind;
  /** How many of the block's lines arrived, and how many times each did. */
  markerCounts: number[];
  /** Rows of the composer carrying more than one line of the block. */
  runOn: { row: number; markers: string[] }[];
  /** The block's lines in the order the composer holds them. */
  order: number[];
  /** The composer's own summary, when it drew one instead of the text. */
  chip: string | null;
  /** True when the screen kept moving after the paste. Recorded, not decisive. */
  screenMoved: boolean;
  /**
   * How far above the bottom of the pane the first pasted line sits, sampled
   * twice. This is the early submit signal and the reason is in
   * `./p64-paste-classify.ts`.
   */
  depth: [number, number];
  ms: number;
  /** The bottom of the pane, kept so a reader can re-derive the verdict. */
  screen: string;
}

const delay = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

export async function runP64PasteMatrix(): Promise<void> {
  armWatchdog(30 * 60_000);
  const socket = process.env['GMUX_TMUX_SOCKET'] ?? '';
  if (socket === '' || socket === 'gmux' || socket === 'default') {
    smokeFail(
      new Error(
        `this harness spawns real agents, so it runs on a scratch socket only. GMUX_TMUX_SOCKET was ${JSON.stringify(socket)}.`
      )
    );
  }
  const rows: Row[] = [];
  const outPath =
    process.env['GMUX_P64_OUT'] ?? join(process.cwd(), 'out', 'p64-paste-matrix.json');
  try {
    const core = await getGmuxCore();
    await tmux.serverPathPublished();
    smokeLog(`1/3 core booted on scratch socket ${socket}`);

    const only = (process.env['GMUX_P64_AGENTS'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const agents = (
      only.length === 0
        ? [...LAUNCHABLE_AGENT_IDS]
        : LAUNCHABLE_AGENT_IDS.filter((id) => only.includes(id))
    ) as LaunchableAgentId[];

    for (const agent of agents) {
      rows.push(await measure(core, agent));
      const last = rows[rows.length - 1];
      smokeLog(
        `  ${last?.agent ?? '?'}: ${last?.verdict ?? '?'} — ${last?.note ?? ''}`
      );
    }
    smokeLog(`2/3 ${String(rows.length)} rows measured, none skipped`);

    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(
      outPath,
      `${JSON.stringify({ socket, blockLines: P64_PROBE_LINES, rows }, null, 2)}\n`
    );
    for (const r of rows) {
      // eslint-disable-next-line no-console
      console.log(
        `[p64] ${r.agent.padEnd(12)} ${r.verdict.padEnd(13)} ${r.readKind.padEnd(6)} ${r.note}`
      );
    }
    const measured = rows.filter(
      (r) => r.verdict !== 'not-installed' && r.verdict !== 'blocked'
    );
    const whole = measured.filter((r) => r.verdict === 'whole');
    smokeLog(
      `3/3 PASS (p64-paste-matrix) — a ${String(P64_PROBE_LINES)} line block; ` +
        `${String(whole.length)} of ${String(measured.length)} measured agents took it whole; ` +
        `${String(rows.length - measured.length)} row(s) could not be measured and say why. ${outPath}`
    );
    await shutdownGmuxCore();
    app.exit(0);
  } catch (err) {
    // The rows measured before the failure are the evidence, so they are
    // written out before this process ends however it ends.
    await mkdir(dirname(outPath), { recursive: true }).catch(() => undefined);
    await writeFile(
      outPath,
      `${JSON.stringify({ socket, rows, failed: String(err) }, null, 2)}\n`
    ).catch(() => undefined);
    smokeFail(err);
  }
}

/** One row, start to finish, and it always answers. */
async function measure(
  core: Awaited<ReturnType<typeof getGmuxCore>>,
  agent: LaunchableAgentId
): Promise<Row> {
  const started = Date.now();
  const entry = getRegistryEntry(agent);
  const row: Row = {
    agent,
    displayName: entry.displayName,
    verdict: 'lost',
    binary: null,
    note: '',
    readKind: 'none',
    markerCounts: [],
    runOn: [],
    order: [],
    chip: null,
    screenMoved: false,
    depth: [-1, -1],
    ms: 0,
    screen: ''
  };

  const candidates = agentBinaryCandidates(agent);
  for (const candidate of candidates) {
    const found = await tmux.resolveBinary(candidate);
    if (found !== null) {
      row.binary = found;
      break;
    }
  }
  if (row.binary === null) {
    row.verdict = 'not-installed';
    row.note = `${candidates.join(', ')} is not on PATH on this machine, so this row was not measured`;
    row.ms = Date.now() - started;
    return row;
  }

  let sessionId: string | null = null;
  try {
    const root = join(tmpdir(), 'tortie-p64');
    await mkdir(root, { recursive: true });
    const cwd = await mkdtemp(join(root, `${agent}-`));
    const created = await core.createSession({
      name: `${PREFIX}${agent}-${String(process.pid)}`,
      projectPath: cwd,
      cwd,
      // The wire type is still the frozen AgentKind trio and the renderer
      // store carries the same cast for the same reason, recorded in the
      // INTEGRATOR note in src/shared/types.ts. `buildLaunchSpec` already
      // accepts every launchable id.
      agent: agent as AgentKind
    });
    sessionId = created.id;
    const live = (await tmux.listSessions()).find(
      (s) => s.tmuxName === created.tmuxName
    );
    if (live === undefined) {
      row.verdict = 'blocked';
      row.note = 'the session did not appear on the scratch server';
      return row;
    }
    const target = live.sessionId;

    // Let the TUI finish painting, then clear whatever first run gate it puts
    // in front of its prompt. Both answerers refuse unless they can READ which
    // option is highlighted; see `answerHighlightedTrust` for the doctrine and
    // for the one agent this must never press a key at.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await waitForQuiet(target, 2_500, 45_000);
      const shared = await clearTrustGate(target);
      const mine = shared ? false : await answerHighlightedTrust(target);
      if (!shared && !mine) break;
    }
    await waitForQuiet(target, 2_000, 30_000);

    // A gate that is still up means there was never a prompt to paste into,
    // and that is a row that says so rather than a paste verdict.
    //
    // IT READS THE BOTTOM OF THE VISIBLE SCREEN, and all three of the wrong
    // ways to do this were measured on 2026-08-26 before this line settled.
    //
    // Sixty lines of history called cursor blocked on a run where the dialog
    // had been answered and had scrolled up. `currentScreen` over that same
    // capture did not fix it, because `tail` drops blank lines before it
    // counts, so twenty four NON EMPTY lines still reach back over a screen of
    // a TUI that is mostly whitespace. The whole VISIBLE screen did not fix it
    // either: cursor leaves the answered box on screen with `Trusting
    // workspace...` under it and draws its prompt below that, so the words are
    // still there while nothing is blocked.
    //
    // The rule src/main/conformance/pane.ts already states is the one that
    // works, applied strictly: a gate that is really blocking a pane is AT THE
    // BOTTOM OF IT, and anything with output underneath it has been dealt with.
    const gate = await readPane(target, 0);
    if (firstMatch(bottomOf(gate), TRUST_DIALOG_PATTERNS) !== null) {
      row.verdict = 'blocked';
      row.note =
        'a first run gate is still in front of the prompt on this fresh folder, and this harness will not press a key it cannot read, so no paste was attempted';
      row.screen = gate.replace(/\s+$/, '');
      return row;
    }

    const before = await readPane(target, 60);
    const nonce = `TZ${String(process.pid)}${String(Date.now() % 10_000)}`;
    const text = probeBlock(nonce);

    // THE PASTE. One call, the bytes xterm produces, and no Enter afterwards.
    await tmux.execTmux([
      'send-keys',
      '-t',
      target,
      '-l',
      '--',
      asXtermPaste(text)
    ]);

    await delay(3_000);
    const first = await readPane(target, 120);
    await delay(5_000);
    const second = await readPane(target, 120);
    // The WHOLE visible screen, because a run on paragraph and a paste chip are
    // both read off it and a tail that drops blank rows loses the geometry the
    // run on reading depends on.
    row.screen = second.replace(/\s+$/, '').split('\n').slice(-40).join('\n');

    const rb: PasteReadback = readPasteback(nonce, before, first, second);
    row.markerCounts = rb.markerCounts;
    row.runOn = rb.runOn;
    row.order = rb.order;
    row.chip = rb.chip?.text ?? null;
    row.screenMoved = rb.moved;
    row.depth = rb.depth;
    const decided = classifyPaste(rb, Buffer.byteLength(text));
    row.verdict = decided.verdict;
    row.note = decided.note;
    row.readKind = decided.readKind;
  } catch (err) {
    row.verdict = 'blocked';
    row.note = err instanceof Error ? err.message : String(err);
  } finally {
    // The session is ended whatever happened, which also ends any turn that
    // an early submit started.
    if (sessionId !== null) {
      await core.killSession(sessionId).catch(() => undefined);
      core.discardSession(sessionId);
    }
    row.ms = Date.now() - started;
  }
  return row;
}

/**
 * THIS HARNESS'S OWN TRUST ANSWERER, and it is deliberately not a widening of
 * the shared one.
 *
 * `src/main/conformance/cases.ts` owns `SELECTED_AFFIRMATIVE`, and that regex
 * decides whether the RESUME conformance presses Return into a real agent. It
 * belongs to that harness and this phase does not reach into it. What this run
 * measured on this machine is that two first run dialogs it did not have are
 * perfectly readable: gemini marks its highlighted option with `●` rather than
 * with an arrow, and muse writes `1` with no punctuation after it. So the same
 * doctrine is applied here with the two markers added, in this file, where it
 * affects nothing else.
 *
 * THE DOCTRINE IS UNCHANGED AND IT IS THE WHOLE SAFETY ARGUMENT. It answers
 * only a trust question, and only in a way the SCREEN ITSELF has spelled out.
 * It never picks an option and it never presses anything it cannot read.
 *
 * There are two readable shapes and this answers both.
 *
 *  1. A HIGHLIGHTED AFFIRMATIVE, being a selection marker in front of an accept
 *     verb, which takes Return. codex draws `› 1. Yes, continue` and claude
 *     draws `❯ 1. Yes, I trust this folder`, both measured 2026-08-27.
 *  2. A NAMED KEY, being a box with no highlighted row that prints the key to
 *     press in its own words. deepseek draws `Press 1/Y to trust and continue,
 *     2/N to quit`, measured 2026-08-27, and pressing the digit that sentence
 *     names is reading the screen rather than guessing at it. This is the one
 *     the fix round added, and it is the reason deepseek has a row at all:
 *     under the first build it was the one agent that could never be measured
 *     AND the one agent that turned out to misbehave, which is the worst pair
 *     of facts a matrix can carry.
 *
 * A bare Return into deepseek's box kills the pane, measured on 2026-08-11 and
 * recorded in src/main/conformance/pane.ts, which is exactly why the digit is
 * read off the sentence rather than a Return being sent hopefully.
 *
 * ANTIGRAVITY IS STILL LEFT ALONE, and this is a refusal rather than a gap. Its
 * first run is a wizard rather than a question: a colour scheme chooser whose
 * highlighted row reads `terminal`, and beyond it a Google Terms of Service and
 * Data Use screen whose only control toggles consent to data collection. No
 * harness presses a key at a consent control on somebody else's behalf. Its row
 * says it was not measured and shows the screen that stopped it.
 */
const P64_HIGHLIGHTED_AFFIRMATIVE =
  /^[\s│┃|]{0,10}[›❯▶>*●◉•]\s*(?:\[[a-z]\]\s*)?(?:[12][.)]?\s+)?(?:yes|trust|continue|proceed|allow)\b/im;

async function answerHighlightedTrust(target: string): Promise<boolean> {
  // The VISIBLE screen, for the reason the gate check above states in full.
  const pane = await readPane(target, 0);
  if (firstMatch(pane, TRUST_DIALOG_PATTERNS) === null) return false;

  if (P64_HIGHLIGHTED_AFFIRMATIVE.test(pane)) {
    await tmux.execTmux(['send-keys', '-t', target, 'Enter']);
    await waitForQuiet(target, 2_000, 20_000);
    return true;
  }

  // The key the box named, sent literally, so nothing is submitted and nothing
  // is chosen that the sentence did not already choose.
  const key = keyNamedByScreen(pane);
  if (key === null) return false;
  await tmux.execTmux(['send-keys', '-t', target, '-l', '--', key]);
  await waitForQuiet(target, 2_000, 20_000);
  return true;
}

/**
 * The last few lines a person can actually see, blank rows dropped.
 *
 * Eight, because that is comfortably more than the tallest prompt any of these
 * eleven TUIs draws and comfortably less than the shortest dialog any of them
 * puts on screen. See the gate check for the three readings this replaced.
 */
function bottomOf(capture: string, n = 8): string {
  return capture
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.length > 0)
    .slice(-n)
    .join('\n');
}
