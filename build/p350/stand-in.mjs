#!/usr/bin/env node
/**
 * build/p350/stand-in.mjs — every agent Phase 350's probes page from the
 * phone, and the controls beside them (build/p350/SPEC.md §8.1). It is NOT an
 * agent and runs none. It applies each agent's OWN switch rule to the argv
 * and the environment it was started with, draws that agent's committed
 * not-question screen under 400 numbered transcript lines, pages its own view
 * when it is full screen, and WRITES DOWN EVERY BYTE IT READS before it acts
 * on one. That log is the ground truth every arm is graded on, never the keys
 * verb's report of what it typed.
 *
 * HOW IT IS LAUNCHED. Under each agent's bare name, by a wrapper a probe
 * writes (`writeWrappers`):
 *
 *     exec -a <bare> <node> build/p350/stand-in.mjs --agent <id> "$@"
 *
 * so the pane's program token is the agent's own name, as the real one's is
 * (`commandRunsAgent`, src/main/activity/state-machine.ts), and Tortie's
 * composed argv follows `--agent <id>` untouched. It may also be started by
 * hand in a shell (`node build/p350/stand-in.mjs --mode altonly`), which is how
 * probe:p316's PS16a and `pages` group start it.
 *
 * ITS OWN FLAGS, consumed wherever they stand, everything else being the
 * agent's argv in order:
 *
 *   --agent <id>        the registry row it stands in for (default `p350`, a
 *                       neutral program for the controls); its numbered lines
 *                       read `<id> line NNNN`
 *   --mode <m>          overrides the agent's own rule, and only when <m> is
 *                       one of: `inline`, `fullscreen`, and the four controls
 *                       `legacy1000` (`1049` with `1000` and no `1006`),
 *                       `altonly` (`1049` alone, no mouse), `leave-on-page`
 *                       (full screen until the first page key, which it takes
 *                       by leaving full screen; then a shell prompt that types
 *                       one `~` for a page key, as zsh, bash and sh measured),
 *                       `asking` (full screen over `a-codex-0002`, the
 *                       committed numbered question). Any other value is left
 *                       in the agent's argv (pi has a `--mode` of its own)
 *   --opted-in          gemini's opt-in full-screen view (`ui.useAlternateBuffer`)
 *   --screen <id>       another committed screen from build/fixtures/questions
 *   --lines <n>         the transcript's length (default 400, 1 to 9999)
 *   --overlay-ms <n>    how long omp's SIGUSR1 overlay stays up (default 4000)
 *   --log <path>        the same as P350_LOG
 *
 * ITS ENVIRONMENT (the seam probe:p316 reads, SPEC §10.2):
 *
 *   P350_LOG                the read log, ONE LINE A READ: `<ms> <hex>`, ms the
 *                           wall clock (`Date.now()`); `%p` in it is this
 *                           process's pid, so one wrapper serves many panes
 *   P350_DIR                where it writes `hello-<pid>.json`, `state-<pid>.json`
 *                           and `events-<pid>.jsonl`, and every version answer
 *                           to `versions.jsonl`; the log defaults to
 *                           `reads-<pid>.log` there. It ends when this folder is
 *                           removed
 *   P350_PI_BAND            pi's version, a bare semver (default 1.4.0); a value
 *                           that is no version is printed as it is, which is how
 *                           a probe makes the scan read `unread`
 *   P350_VERSION_DELAY_MS   a delay before a version answer, a whole number
 *                           under 10,000 (VERSION_PROBE_TIMEOUT_MS,
 *                           src/main/agents/detection.ts); any other value is
 *                           ignored and the answer is at once
 *   P350_STANDIN_CEILING_MS how long it may live (default 45 minutes)
 *
 * WHAT IT ANSWERS FIRST. An argv of exactly one `-v`, `--version` or `-V` is
 * the detection scan's version probe: it prints the first line that row's
 * probe reads (`VERSION_LINES`; pi a BARE semver from P350_PI_BAND, Claude
 * Code's carrying `(Claude Code)`, omp's `omp/` and grok's `grok `, the
 * registry's identity substrings), after P350_VERSION_DELAY_MS, and writes
 * the call to `versions.jsonl` before and after. `--help` and `-h` exit 0.
 * Anything else with no terminal on stdout exits 0 at once.
 *
 * EACH AGENT'S OWN SWITCH RULE (`modeOf`), from its argv and environment as
 * the real one reads them, and its recorded modes (research 134's table, the
 * agents investigator's matrix, build/p350/SPEC.md §8.1):
 *
 *   claude      inline only under CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1, else
 *               `1049` and `1000/1002/1003/1006`
 *   codex       inline only with `-c tui.fullscreen_transcript=false` and no
 *               later `=true` (the last one wins), else `1049` and `1007`, no
 *               mouse
 *   pi          M1's table (§2.1, `piModeOf`): below 0.84.0 any `--tui-mode`
 *               is an unknown flag, which the stand-in takes by drawing a
 *               trust ask and exiting 1 after a key, as research 134's
 *               adversary measured; from 0.84.0 the LAST `--tui-mode` wins,
 *               then `tuiMode` in `$PI_CODING_AGENT_DIR/settings.json` (else
 *               `$HOME/.pi/agent/settings.json`), then the band's default:
 *               regular to 0.99.2, full screen from 1.0.0. Full screen is
 *               `1049`, `?7l`, and under TMUX (or a tmux or screen TERM)
 *               `1000/1002/1004/1006`, as pi's renderer does
 *   cursor      inline; cleared (`CSI H CSI 2J CSI 3J`) and its last ten turns
 *               printed again on mount and on SIGWINCH
 *   gemini      inline; `--opted-in` gives `1049` and `1002/1006`
 *   deepseek    `1049` and `1000/1002/1003/1015/1006`, over numbered lines
 *   antigravity `1049` with an ASSUMED `1000/1006` (its own numbers are
 *               unmeasured; a verifier says so)
 *   muse        inline, over numbered lines
 *   qwen        `1049`, then `CSI 3J`, then `1002/1006`
 *   omp         inline, cleared at first paint; on SIGUSR1 an overlay of
 *               `1049` with `1000/1003/1006` for `--overlay-ms` (4 s)
 *   grok        `1049` and `1000/1002/1003/1015/1006`, taking a page key only
 *               after a Tab has moved its focus to the transcript
 *   opencode    `1049` and `1000/1002/1003/1006`
 *   droid       never observed and no committed screen: inline numbered
 *               lines, which no arm grades (SPEC §9.1, "not run, stated")
 *
 * THE DRAWING. The transcript is `--lines` numbered lines `<id> line NNNN`
 * (1-based). Inline it prints them to the normal screen and then the agent's
 * committed screen under them, so tmux's history holds them and a page of
 * history reads by text. Full screen it draws a view of a document that is the
 * same lines and the screen's last `FULLSCREEN_SCREEN_ROWS` rows under them,
 * the view starting at the bottom (a turn's end), every row cut one cell short
 * of the width; the first row of a picture is `doc[top]`, a numbered line at
 * every position a 24-row pane can show, so a probe reads where the view is
 * from the picture alone (`viewTopOf`).
 *
 * THE COMMITTED SCREENS (`SCREENS`), the ids of SPEC §9.1 with ONE CORRECTION
 * of this build: gemini's is `a-gemini-0006`, not `a-gemini-0004`. That window
 * is labelled not-question but its own `verdicts` read it as a question at
 * both builds (build/p321/SPEC.md §As built item 6 lists it as one of gemini's
 * two answered-gate windows the numbered verdict counts), so a picture drawing
 * it is `asking`, D8 refuses every page over it and gemini's opted-in row
 * could never page; `a-gemini-0006` is the first gemini window that is not a
 * question by its label and by both verdicts. Every default is held to that
 * rule (`screenProblems`). No committed screen is pi's trust question (no line
 * of a-pi.jsonl or adv2-pi.jsonl is one), so the ask a pi below the floor
 * draws is this file's own two lines, named as such.
 *
 * PAGING. `ESC [ 5 ~` and `ESC [ 6 ~` move a full-screen view by its height
 * (pi's by `rows - 4`, pi 1.4.0's own PAGE_SCROLL_OVERLAP, D26), and an SGR,
 * urxvt or legacy wheel report by three lines; nothing else moves it, and
 * inline nothing moves at all (the phone pages tmux's history there).
 *
 * WHAT IT NEVER DOES. It runs no program, opens no socket, reads nothing but
 * this checkout's committed screens, pi's settings file where pi reads it
 * (and never one under the account's own home, which is the person's own pi's:
 * the probes give it a scratch HOME), and its own folder, and writes nothing
 * but its log, its folder's files and its terminal. It ends on SIGHUP, SIGTERM
 * or SIGINT, when P350_DIR is removed, or after P350_STANDIN_CEILING_MS.
 *
 * THE PROBES IMPORT IT for the rules, the documents, the wrapper writer and
 * the readers, so a grader and the stand-in read one spelling of each.
 * Importing it runs nothing.
 */

import { appendFileSync, chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const STANDIN_PATH = fileURLToPath(import.meta.url);
export const QUESTION_FIXTURES = join(ROOT, 'build', 'fixtures', 'questions');

const J = JSON.stringify;
const ESC = '\u001b';

// ---------------------------------------------------------------------------
// The rows it stands in for, and what each answers a version probe with
// ---------------------------------------------------------------------------

/** The neutral program the controls run as when no `--agent` is given. */
export const NEUTRAL_AGENT = 'p350';

/**
 * The first line each row's version probe reads (src/main/agents/registry.ts
 * `versionProbe`, `extractVersion`'s first line): Claude Code's carries its
 * identity substring `(Claude Code)`, omp's `omp/`, grok's `grok `; pi's is
 * built from the band alone (`versionLineOf`).
 */
export const VERSION_LINES = Object.freeze({
  claude: '2.1.287 (Claude Code) p350 stand-in',
  codex: 'codex-cli 0.160.0 (p350 stand-in)',
  cursor: '2026.09.18-p350 (p350 stand-in)',
  gemini: '0.60.0 (p350 stand-in)',
  droid: 'droid 0.0.0 (p350 stand-in)',
  deepseek: 'codewhale 0.8.26 (p350 stand-in)',
  antigravity: '1.2.8 (p350 stand-in)',
  muse: 'muse 1.4.1 (p350 stand-in)',
  qwen: '0.22.0 (p350 stand-in)',
  omp: 'omp/18.0.11 (p350 stand-in)',
  grok: 'grok 1.0.41 (p350 stand-in)',
  opencode: '1.18.32 (p350 stand-in)',
  [NEUTRAL_AGENT]: 'p350 stand-in'
});

/**
 * Every agent id this file stands in for: the thirteen launchable rows in the
 * registry's order (`LAUNCHABLE_AGENT_IDS`, src/main/agents/registry.ts) and
 * the neutral one. pi's version line is its band (`versionLineOf`), so pi is
 * named here and not in {@link VERSION_LINES}.
 */
export const STAND_IN_AGENT_IDS = Object.freeze(['claude', 'cursor', 'codex', 'gemini', 'droid', 'deepseek', 'antigravity', 'muse', 'qwen', 'pi', 'omp', 'grok', 'opencode', NEUTRAL_AGENT]);

/** pi's band when nothing names one (SPEC §8.1). */
export const DEFAULT_PI_BAND = '1.4.0';
/**
 * pi's own package name (the ruled round, his ruling of 2026-11-02): Tortie
 * composes pi's token only for a pi whose real file sits inside a package of
 * this name, so a probe that wants the token lays its pi out as npm installs it
 * (`writeWrappers`' `npmPackage`). Spelled here, beside Tortie's own
 * `PI_PACKAGE_NAME`, as the name pi 0.84.2's own package.json reads.
 */
export const PI_PACKAGE = '@earendil-works/pi-coding-agent';
/** pi's floor for `--tui-mode` (PI_INLINE_FLOOR, D2), and the release whose default turned full screen (M1). */
export const PI_FLAG_SINCE = '0.84.0';
export const PI_FULLSCREEN_DEFAULT_SINCE = '1.0.0';
/** The detection scan's probe timeout (src/main/agents/detection.ts VERSION_PROBE_TIMEOUT_MS): a delay must stay under it. */
export const VERSION_DELAY_CAP_MS = 10_000;

/** The version line one row prints for a version probe; pi's is the band, bare. */
export function versionLineOf(agent, band = DEFAULT_PI_BAND) {
  if (agent === 'pi') return String(band ?? DEFAULT_PI_BAND).trim() || DEFAULT_PI_BAND;
  return VERSION_LINES[agent] ?? VERSION_LINES[NEUTRAL_AGENT];
}

/** A delay setting read the way the stand-in reads it: a whole number from 0 to 9,999 ms, else 0. */
export function versionDelayOf(raw) {
  const text = String(raw ?? '').trim();
  if (!/^\d{1,4}$/.test(text)) return 0;
  const n = Number(text);
  return n >= 0 && n < VERSION_DELAY_CAP_MS ? n : 0;
}

// ---------------------------------------------------------------------------
// Versions, compared as pi's band is compared (a dotted triple, numerically)
// ---------------------------------------------------------------------------

/** The dotted triple in a text, or null (the shape `parseSpecStoryVersionOutput` reads). */
export function semverOf(text) {
  const m = /(?<![\d.])(\d+)\.(\d+)\.(\d+)/.exec(String(text ?? ''));
  return m === null ? null : [Number(m[1]), Number(m[2]), Number(m[3])];
}
/** -1, 0 or 1; an unreadable side sorts lowest. */
export function compareSemver(a, b) {
  const x = semverOf(a) ?? [-1, -1, -1];
  const y = semverOf(b) ?? [-1, -1, -1];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

// ---------------------------------------------------------------------------
// pi's rule (SPEC §2.1, M1), from its own argument and settings code as text
// ---------------------------------------------------------------------------

/**
 * What a pi of `band` draws for an argv (the words after the program) and a
 * saved `tuiMode` (or null): `regular`, `fullscreen`, `dies-after-trust` (an
 * UNKNOWN `--tui-mode` below 0.84.0: kept as `unknownFlags['tui-mode']`, and
 * pi stops on it after its trust question, research 134 adversary piB) or
 * `dies-invalid` (a `--tui-mode` with no value or another word, an error
 * diagnostic from 0.84.0). From 0.84.0 the LAST `--tui-mode <regular|
 * fullscreen>` wins and beats the setting; with no flag the setting decides
 * (0.84.0 to 0.99.2: `fullscreen` alone is full screen; from 1.0.0: `regular`
 * alone is regular); with neither, the band's default. A band that is no
 * version reads as the newest default (full screen), the shape a real pi
 * newer than this file would most likely have.
 */
export function piModeOf(band, argv, setting) {
  const words = Array.isArray(argv) ? argv.map(String) : [];
  const known = semverOf(band) === null || compareSemver(band, PI_FLAG_SINCE) >= 0;
  if (!known) {
    // 0.83.0's parse: any `--tui-mode` (two words or `=`) is an unknown flag.
    return words.some((w) => w === '--tui-mode' || w.startsWith('--tui-mode=')) ? 'dies-after-trust' : 'regular';
  }
  let flag = null;
  for (let i = 0; i < words.length; i += 1) {
    if (words[i] !== '--tui-mode') continue;
    const next = words[i + 1];
    if (next === 'regular' || next === 'fullscreen') {
      flag = next;
      i += 1;
    } else {
      return 'dies-invalid';
    }
  }
  if (flag !== null) return flag;
  const fullscreenByDefault = semverOf(band) === null || compareSemver(band, PI_FULLSCREEN_DEFAULT_SINCE) >= 0;
  if (fullscreenByDefault) return setting === 'regular' ? 'regular' : 'fullscreen';
  return setting === 'fullscreen' ? 'fullscreen' : 'regular';
}

/** Where pi reads its settings: `$PI_CODING_AGENT_DIR/settings.json`, else `$HOME/.pi/agent/settings.json`. */
export function piSettingsPathOf(env) {
  const dir = String(env?.['PI_CODING_AGENT_DIR'] ?? '').trim();
  if (dir !== '') return join(dir, 'settings.json');
  const home = String(env?.['HOME'] ?? '').trim();
  return home === '' ? null : join(home, '.pi', 'agent', 'settings.json');
}

/**
 * The account's own home, which this file never reads under: a pi settings
 * file there is the person's own pi's, and only a scratch HOME's is a probe's.
 */
const accountHome = () => {
  try {
    return userInfo().homedir;
  } catch {
    return null;
  }
};
/** Whether a path lies in the account's own home (never read). */
export const underAccountHome = (path, home = accountHome()) => typeof home === 'string' && home !== '' && typeof path === 'string' && (path === home || path.startsWith(`${home}/`));

/**
 * The saved `tuiMode` at that path, or null (no file, no JSON, no string, or
 * a path in the account's own home, which is never read: the stand-in runs
 * under a scratch HOME, and a person's own pi settings are not a probe's).
 */
export function piSettingOf(path, read = (p) => readFileSync(p, 'utf8'), home = accountHome()) {
  if (path === null || underAccountHome(path, home)) return null;
  try {
    const v = JSON.parse(read(path))?.tuiMode;
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Every row's own rule, and the modes each asks for
// ---------------------------------------------------------------------------

/** The stand-in's own `--mode` words; any other value after `--mode` stays the agent's. */
export const MODES = Object.freeze(['inline', 'fullscreen', 'legacy1000', 'altonly', 'leave-on-page', 'asking']);
/** The four controls of SPEC §9.1. */
export const CONTROLS = Object.freeze(['legacy1000', 'altonly', 'leave-on-page', 'asking']);

/** The private modes a full-screen view of each row asks for, after `1049` (and pi's `?7l`), in order. */
export const FULLSCREEN_MOUSE = Object.freeze({
  claude: Object.freeze([1000, 1002, 1003, 1006]),
  codex: Object.freeze([1007]),
  gemini: Object.freeze([1002, 1006]),
  deepseek: Object.freeze([1000, 1002, 1003, 1015, 1006]),
  antigravity: Object.freeze([1000, 1006]),
  qwen: Object.freeze([1002, 1006]),
  pi: Object.freeze([1000, 1002, 1004, 1006]),
  omp: Object.freeze([1000, 1003, 1006]),
  grok: Object.freeze([1000, 1002, 1003, 1015, 1006]),
  opencode: Object.freeze([1000, 1002, 1003, 1006]),
  legacy1000: Object.freeze([1000]),
  altonly: Object.freeze([]),
  'leave-on-page': Object.freeze([1000, 1006]),
  asking: Object.freeze([1000, 1006]),
  fullscreen: Object.freeze([1000, 1006])
});

/** Codex's switch, as Codex reads `-c`: the LAST `tui.fullscreen_transcript=` value; inline only when it is `false`. */
export function codexInlineOf(argv) {
  let last = null;
  const words = Array.isArray(argv) ? argv.map(String) : [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    const value = w === '-c' || w === '--config' ? words[i + 1] : w.startsWith('--config=') ? w.slice('--config='.length) : null;
    if (value === null || value === undefined) continue;
    const m = /^tui\.fullscreen_transcript=(.*)$/.exec(value);
    if (m !== null) last = m[1].replace(/^"|"$/g, '');
  }
  return last === 'false';
}

/** Whether pi's renderer would take the mouse: under TMUX, or a TERM that starts `tmux` or `screen` (tui-alt-screen.ts:374-386). */
export const piUnderMultiplexer = (env) => String(env?.['TMUX'] ?? '') !== '' || /^(tmux|screen)/.test(String(env?.['TERM'] ?? ''));

/**
 * The view one start decides: `{ view, setModes, page, note }`. `view` is
 * `inline`, `fullscreen`, `dies-after-trust` or `dies-invalid`; `setModes` the
 * private modes written after `1049` when it is full screen (`-7` for pi's
 * `?7l`); `page` how far a page key moves the view (`'rows-4'` for pi, else
 * `'rows'`); `kind` the control's or the row's own name.
 */
export function modeOf({ agent, argv = [], env = {}, own = {}, band = DEFAULT_PI_BAND, setting = null }) {
  const forced = own.mode ?? null;
  const fs = (kind, modes, note = null) => ({ view: 'fullscreen', kind, setModes: [...modes], page: agent === 'pi' && kind === 'pi' ? 'rows-4' : 'rows', note });
  if (forced !== null && CONTROLS.includes(forced)) return fs(forced, FULLSCREEN_MOUSE[forced], `the ${forced} control`);
  if (forced === 'inline') return { view: 'inline', kind: agent, setModes: [], page: 'rows', note: '--mode inline' };
  if (forced === 'fullscreen' && agent === 'pi') {
    return { view: 'fullscreen', kind: 'pi', setModes: [-7, ...(piUnderMultiplexer(env) ? FULLSCREEN_MOUSE.pi : [])], page: 'rows-4', note: '--mode fullscreen' };
  }
  if (forced === 'fullscreen') return fs(agent, FULLSCREEN_MOUSE[agent] ?? FULLSCREEN_MOUSE.fullscreen, '--mode fullscreen');
  switch (agent) {
    case 'claude':
      return String(env['CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN'] ?? '') === '1'
        ? { view: 'inline', kind: 'claude', setModes: [], page: 'rows', note: 'CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1' }
        : fs('claude', FULLSCREEN_MOUSE.claude, 'no CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1');
    case 'codex':
      return codexInlineOf(argv)
        ? { view: 'inline', kind: 'codex', setModes: [], page: 'rows', note: 'tui.fullscreen_transcript=false' }
        : fs('codex', FULLSCREEN_MOUSE.codex, 'no tui.fullscreen_transcript=false last');
    case 'pi': {
      const drawn = piModeOf(band, argv, setting);
      if (drawn === 'regular') return { view: 'inline', kind: 'pi', setModes: [], page: 'rows-4', note: `pi ${String(band)} regular` };
      if (drawn === 'fullscreen') {
        const mouse = piUnderMultiplexer(env) ? FULLSCREEN_MOUSE.pi : [];
        return { view: 'fullscreen', kind: 'pi', setModes: [-7, ...mouse], page: 'rows-4', note: `pi ${String(band)} fullscreen` };
      }
      return { view: drawn, kind: 'pi', setModes: [], page: 'rows-4', note: `pi ${String(band)} ${drawn}` };
    }
    case 'gemini':
      return own.optedIn === true ? fs('gemini', FULLSCREEN_MOUSE.gemini, '--opted-in') : { view: 'inline', kind: 'gemini', setModes: [], page: 'rows', note: 'the default inline view' };
    case 'deepseek':
    case 'antigravity':
    case 'qwen':
    case 'grok':
    case 'opencode':
      return fs(agent, FULLSCREEN_MOUSE[agent], agent === 'antigravity' ? 'ASSUMED 1000/1006: its own numbers are unmeasured' : null);
    case 'cursor':
    case 'muse':
    case 'omp':
    case 'droid':
    default:
      return { view: 'inline', kind: agent, setModes: [], page: 'rows', note: agent === 'droid' ? 'never observed' : null };
  }
}

/** The bytes that enter a full-screen view: `1049`, pi's `?7l`, then each mode; qwen's `CSI 3J` straight after `1049`. */
export function enterBytesOf(decided, agent) {
  let out = `${ESC}[?1049h`;
  if (agent === 'qwen' && decided.kind === 'qwen') out += `${ESC}[3J`;
  for (const m of decided.setModes) out += m < 0 ? `${ESC}[?${String(-m)}l` : `${ESC}[?${String(m)}h`;
  return `${out}${ESC}[H${ESC}[2J${ESC}[?25l`;
}
/** The bytes that leave it again, in the reverse order. */
export function leaveBytesOf(decided) {
  let out = '';
  for (const m of [...decided.setModes].reverse()) out += m < 0 ? `${ESC}[?${String(-m)}h` : `${ESC}[?${String(m)}l`;
  return `${out}${ESC}[?25h${ESC}[?1049l`;
}

// ---------------------------------------------------------------------------
// The committed screens and the documents
// ---------------------------------------------------------------------------

/**
 * Each row's committed not-question screen (SPEC §9.1), with gemini CORRECTED
 * (the header says why); null where none is committed (deepseek, muse,
 * droid), and the asking control's question.
 */
export const SCREENS = Object.freeze({
  claude: 'a-claude-0015',
  codex: 'a-codex-0004',
  cursor: 'a-cursor-0003',
  gemini: 'a-gemini-0006',
  deepseek: null,
  antigravity: 'a-antigravity-0014',
  muse: null,
  qwen: 'a-qwen-0005',
  pi: 'a-pi-0002',
  omp: 'a-omp-0002',
  grok: 'a-grok-0046',
  opencode: 'a-opencode-0003',
  droid: null,
  [NEUTRAL_AGENT]: null
});
/** The asking control's committed numbered question, which the numbered verdict reads at both builds. */
export const ASKING_SCREEN = 'a-codex-0002';
/** SPEC §9.1's gemini id, kept by name so the correction can be read. */
export const SPEC_GEMINI_SCREEN = 'a-gemini-0004';
/** The rows of the screen a full-screen document keeps under its lines, so a 24-row pane always shows a numbered first row. */
export const FULLSCREEN_SCREEN_ROWS = 12;
/** The transcript's length (SPEC §8.1), and cursor's turn: 20 lines, of which it prints the last ten again. */
export const TRANSCRIPT_LINES = 400;
export const CURSOR_TURN_LINES = 20;
export const CURSOR_TURNS_KEPT = 10;

/** One committed window by id: `{ id, label, verdicts, rows }`, or null. */
export function loadScreen(id, dir = QUESTION_FIXTURES) {
  const m = /^([a-z0-9]+-[a-z]+)-\d{4}$/.exec(String(id ?? ''));
  if (m === null) return null;
  let text = '';
  try {
    text = readFileSync(join(dir, `${m[1]}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      const o = JSON.parse(line);
      if (o.id === id) return { id: o.id, label: o.label ?? null, verdicts: o.verdicts ?? null, rows: Array.isArray(o.rows) ? o.rows.map(String) : [] };
    } catch {
      /* a line that is not JSON names no window */
    }
  }
  return null;
}

/** Why a window may not be a row's resting screen: missing, a question by its label, or a question by either verdict. */
export function screenProblems(id, dir = QUESTION_FIXTURES) {
  const s = loadScreen(id, dir);
  if (s === null) return [`${String(id)} is not a committed window`];
  const out = [];
  if (s.label !== 'not-question') out.push(`${String(id)} is labelled ${J(s.label)}`);
  if (s.verdicts?.parent !== false || s.verdicts?.head !== false) out.push(`${String(id)}'s verdicts read ${J(s.verdicts)}: the numbered verdict takes it for a question`);
  if (s.rows.length === 0) out.push(`${String(id)} has no rows`);
  return out;
}

/** A row with every C0 control and DEL taken out, so a committed capture draws as text. */
export const plainRow = (row) => String(row).replace(/[\u0000-\u001f\u007f]/g, ' ');

/** A screen's rows with its trailing blank rows dropped. */
export function trimmedRows(rows) {
  const out = rows.map(plainRow);
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
  return out;
}

/** The numbered transcript, `<label> line NNNN`, 1-based. */
export const transcriptOf = (label, n = TRANSCRIPT_LINES) => Array.from({ length: n }, (_, i) => `${label} line ${String(i + 1).padStart(4, '0')}`);

/** The number a transcript row carries, or null. */
export function lineNumberOf(text) {
  const m = /(?:^|\s)\S+ line (\d{4})(?:\s|$)/.exec(String(text ?? ''));
  return m === null ? null : Number(m[1]);
}

/**
 * The rows one view draws, top to bottom: inline every line then the whole
 * screen; full screen every line then the screen's last
 * FULLSCREEN_SCREEN_ROWS rows; cursor's inline only its last ten turns.
 */
export function documentOf({ label, view, screenRows = [], lines = TRANSCRIPT_LINES, cursorTurns = false }) {
  const transcript = transcriptOf(label, lines);
  const screen = trimmedRows(screenRows);
  if (view === 'fullscreen') return [...transcript, ...screen.slice(-FULLSCREEN_SCREEN_ROWS)];
  if (cursorTurns) return [...transcript.slice(-CURSOR_TURN_LINES * CURSOR_TURNS_KEPT), ...screen];
  return [...transcript, ...screen];
}

/**
 * Where a full-screen view's top is, from a picture's row texts alone: the
 * first numbered row gives it (`top = n - 1 - row`), and every other numbered
 * row must agree; null when no numbered row is drawn or two disagree.
 */
export function viewTopOf(texts) {
  let top = null;
  for (let r = 0; r < (texts ?? []).length; r += 1) {
    const n = lineNumberOf(texts[r]);
    if (n === null) continue;
    const t = n - 1 - r;
    if (top === null) top = t;
    else if (top !== t) return null;
  }
  return top;
}

/** How far one page key moves a view of `rows` rows: pi's `max(1, rows - 4)`, every other `max(1, rows)`. */
export const pageOf = (page, rows) => (page === 'rows-4' ? Math.max(1, rows - 4) : Math.max(1, rows));

// ---------------------------------------------------------------------------
// Cells, as a terminal counts them, for the cut one cell short of the width
// ---------------------------------------------------------------------------

/** 0 for a joiner, a variation selector or a combining mark; 2 for a wide or pictographic point; else 1. */
export function cellsOf(cp) {
  const p = Number(cp);
  if (p === 0x200b || p === 0x200c || p === 0x200d || (p >= 0xfe00 && p <= 0xfe0f) || (p >= 0x0300 && p <= 0x036f) || (p >= 0x20d0 && p <= 0x20ff)) return 0;
  if (
    (p >= 0x1100 && p <= 0x115f) ||
    (p >= 0x2e80 && p <= 0x303e) ||
    (p >= 0x3041 && p <= 0x33ff) ||
    (p >= 0x3400 && p <= 0x4dbf) ||
    (p >= 0x4e00 && p <= 0x9fff) ||
    (p >= 0xa000 && p <= 0xa4cf) ||
    (p >= 0xac00 && p <= 0xd7a3) ||
    (p >= 0xf900 && p <= 0xfaff) ||
    (p >= 0xfe30 && p <= 0xfe4f) ||
    (p >= 0xff00 && p <= 0xff60) ||
    (p >= 0xffe0 && p <= 0xffe6) ||
    p === 0x231a || p === 0x231b || p === 0x23e9 || p === 0x23ea || p === 0x23eb || p === 0x23ec || p === 0x23f0 || p === 0x23f3 ||
    p === 0x25fd || p === 0x25fe || p === 0x2614 || p === 0x2615 || (p >= 0x2648 && p <= 0x2653) || p === 0x267f || p === 0x2693 || p === 0x26a1 ||
    p === 0x26aa || p === 0x26ab || p === 0x26bd || p === 0x26be || p === 0x26c4 || p === 0x26c5 || p === 0x26ce || p === 0x26d4 || p === 0x26ea ||
    p === 0x26f2 || p === 0x26f3 || p === 0x26f5 || p === 0x26fa || p === 0x26fd || p === 0x2705 || p === 0x270a || p === 0x270b || p === 0x2728 ||
    p === 0x274c || p === 0x274e || (p >= 0x2753 && p <= 0x2755) || p === 0x2757 || (p >= 0x2795 && p <= 0x2797) || p === 0x27b0 || p === 0x27bf ||
    p === 0x2b1b || p === 0x2b1c || p === 0x2b50 || p === 0x2b55 ||
    (p >= 0x1f000 && p <= 0x1faff) ||
    (p >= 0x20000 && p <= 0x3fffd)
  ) {
    return 2;
  }
  return 1;
}

/** A row cut to at most `cells` cells, a wide point never split. */
export function clipRow(text, cells) {
  let used = 0;
  let out = '';
  for (const ch of String(text)) {
    const w = cellsOf(ch.codePointAt(0) ?? 32);
    if (used + w > cells) break;
    out += ch;
    used += w;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The bytes it reads: page keys and wheel reports
// ---------------------------------------------------------------------------

/**
 * The scroll intents in one read, in order: `{ kind: 'page', dir: -1 | 1 }`
 * for `ESC [ 5 ~` and `ESC [ 6 ~`, `{ kind: 'wheel', dir, encoding }` for an
 * SGR (`ESC [ < 64/65 ; x ; y M`), urxvt (`ESC [ 96/97 ; x ; y M`) or legacy
 * (`ESC [ M` and three bytes) report, button bits 64 and 65 only, and
 * `{ kind: 'tab' }` for a Tab. Nothing else is a scroll.
 */
export function intentsOf(latin1) {
  const s = String(latin1);
  const out = [];
  for (let i = 0; i < s.length; ) {
    if (s.startsWith(`${ESC}[5~`, i)) {
      out.push({ kind: 'page', dir: -1 });
      i += 4;
      continue;
    }
    if (s.startsWith(`${ESC}[6~`, i)) {
      out.push({ kind: 'page', dir: 1 });
      i += 4;
      continue;
    }
    const sgr = /^\u001b\[<(\d+);(\d+);(\d+)([Mm])/.exec(s.slice(i));
    if (sgr !== null) {
      const b = Number(sgr[1]);
      if ((b & 64) !== 0 && (b & 3) < 2 && sgr[4] === 'M') out.push({ kind: 'wheel', dir: (b & 3) === 0 ? -1 : 1, encoding: 'sgr' });
      i += sgr[0].length;
      continue;
    }
    const urxvt = /^\u001b\[(\d+);(\d+);(\d+)M/.exec(s.slice(i));
    if (urxvt !== null) {
      const b = Number(urxvt[1]) - 32;
      if (b >= 0 && (b & 64) !== 0 && (b & 3) < 2) out.push({ kind: 'wheel', dir: (b & 3) === 0 ? -1 : 1, encoding: 'urxvt' });
      i += urxvt[0].length;
      continue;
    }
    if (s.startsWith(`${ESC}[M`, i) && s.length >= i + 6) {
      const b = s.charCodeAt(i + 3) - 32;
      if (b >= 0 && (b & 64) !== 0 && (b & 3) < 2) out.push({ kind: 'wheel', dir: (b & 3) === 0 ? -1 : 1, encoding: 'legacy' });
      i += 6;
      continue;
    }
    if (s[i] === '\t') {
      out.push({ kind: 'tab' });
      i += 1;
      continue;
    }
    i += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The wrappers, and the readers a probe uses
// ---------------------------------------------------------------------------

const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

/**
 * Write one wrapper per name into `bin`: `{ name, agent, args? }`, each
 * `#!/bin/bash` that exports the run's folder, its log template and, when
 * the files exist, pi's band and the version delay read from `bandFile` and
 * `delayFile` AT EVERY START (so a probe moves the band between launches by
 * rewriting one file), then `exec -a <as>` this file under node with
 * `--agent <agent>`, any fixed `args`, then `"$@"`. `as` is the program token
 * the pane carries (default the name). Answers `{ [name]: path }`.
 *
 * `npmPackage` (the ruled round, his ruling of 2026-11-02): the package the
 * agent installs as, which pi's floor now asks for (Tortie composes pi's token
 * only for a pi whose real file sits inside pi's own package). The wrapper is
 * then laid out as `npm install -g` lays a package out under the folder above
 * `bin`: the text as `<prefix>/lib/node_modules/<package>/dist/cli.js` beside a
 * package.json naming the package, and `bin/<name>` a relative link to it, as
 * pi 0.84.2 is installed on this Mac. Nothing else about the wrapper moves.
 */
export function writeWrappers({ bin, standinDir, node = process.execPath, bandFile = null, delayFile = null, wrappers }) {
  mkdirSync(bin, { recursive: true });
  const out = {};
  for (const w of wrappers) {
    if (!/^[A-Za-z0-9._+-]+$/.test(String(w.name))) throw new Error(`stand-in wrapper: ${J(w.name)} is not a plain program name`);
    if (!STAND_IN_AGENT_IDS.includes(w.agent)) throw new Error(`stand-in wrapper: ${J(w.agent)} is not an agent this stand-in stands in for`);
    const as = w.as ?? w.name;
    if (!/^[A-Za-z0-9._+-]+$/.test(String(as))) throw new Error(`stand-in wrapper: ${J(as)} is not a plain program token`);
    if (w.npmPackage !== undefined && !/^(@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(String(w.npmPackage))) throw new Error(`stand-in wrapper: ${J(w.npmPackage)} is not a package name`);
    const path = join(bin, w.name);
    const lines = [
      '#!/bin/bash',
      `# Phase 350's probes. Not ${w.agent}: build/p350/stand-in.mjs under the program token ${as}.`,
      `export P350_DIR=${shq(standinDir)}`,
      `export P350_LOG=${shq(join(standinDir, 'reads-%p.log'))}`,
      ...(bandFile === null ? [] : [`if [ -r ${shq(bandFile)} ]; then export P350_PI_BAND="$(/bin/cat ${shq(bandFile)})"; fi`]),
      ...(delayFile === null ? [] : [`if [ -r ${shq(delayFile)} ]; then export P350_VERSION_DELAY_MS="$(/bin/cat ${shq(delayFile)})"; fi`]),
      `exec -a ${as} ${shq(node)} ${shq(STANDIN_PATH)} --agent ${w.agent}${(w.args ?? []).map((a) => ` ${shq(a)}`).join('')} "$@"`,
      ''
    ];
    if (w.npmPackage === undefined) {
      writeFileSync(path, lines.join('\n'), 'utf8');
      chmodSync(path, 0o755);
    } else {
      const root = join(dirname(bin), 'lib', 'node_modules', ...String(w.npmPackage).split('/'));
      mkdirSync(join(root, 'dist'), { recursive: true });
      writeFileSync(join(root, 'package.json'), `${J({ name: w.npmPackage, version: '0.0.0-p350', bin: { [w.name]: 'dist/cli.js' } }, null, 2)}\n`, 'utf8');
      const cli = join(root, 'dist', 'cli.js');
      writeFileSync(cli, lines.join('\n'), 'utf8');
      chmodSync(cli, 0o755);
      rmSync(path, { force: true });
      symlinkSync(relative(bin, cli), path);
    }
    out[w.name] = path;
  }
  return out;
}

/** A read log (`<ms> <hex>` a line): `[{ ms, hex }]`, a line cut by a racing append skipped. */
export function readLog(path) {
  let text = '';
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const line of text.split('\n')) {
    const m = /^(\d+) ([0-9a-f]*)$/.exec(line);
    if (m !== null && m[2].length % 2 === 0) out.push({ ms: Number(m[1]), hex: m[2] });
  }
  return out;
}
/** The reads at or after `fromMs`. */
export const readsSince = (log, fromMs) => log.filter((l) => l.ms >= fromMs);

/** Every stand-in that said hello in a folder, oldest first. */
export function hellos(standinDir) {
  let names = [];
  try {
    names = readdirSync(standinDir);
  } catch {
    return [];
  }
  const out = [];
  for (const n of names) {
    if (!/^hello-\d+\.json$/.test(n)) continue;
    try {
      out.push(JSON.parse(readFileSync(join(standinDir, n), 'utf8')));
    } catch {
      /* half written; the next look has it */
    }
  }
  return out.sort((a, b) => Number(a.at) - Number(b.at));
}
/** One stand-in's state, or null. */
export function stateOf(standinDir, pid) {
  try {
    return JSON.parse(readFileSync(join(standinDir, `state-${String(pid)}.json`), 'utf8'));
  } catch {
    return null;
  }
}
/** One stand-in's events, in order. */
export function eventsOf(standinDir, pid) {
  let text = '';
  try {
    text = readFileSync(join(standinDir, `events-${String(pid)}.jsonl`), 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* a line cut by a read racing the append */
    }
  }
  return out;
}
/** Every version answer the folder's stand-ins gave: `[{ at, agent, pid, line, delayMs, phase }]`. */
export function versionCalls(standinDir) {
  let text = '';
  try {
    text = readFileSync(join(standinDir, 'versions.jsonl'), 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* cut */
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The command line
// ---------------------------------------------------------------------------

const VERSION_FLAGS = new Set(['-v', '--version', '-V']);

/** Split the stand-in's own flags from the agent's argv: `{ own, argv }`. */
export function splitArgs(args) {
  const own = { agent: null, mode: null, optedIn: false, screen: null, lines: null, log: null, overlayMs: null };
  const argv = [];
  const words = Array.isArray(args) ? args.map(String) : [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    const next = words[i + 1];
    if (w === '--agent' && next !== undefined && own.agent === null) {
      own.agent = next;
      i += 1;
    } else if (w === '--mode' && next !== undefined && MODES.includes(next)) {
      own.mode = next;
      i += 1;
    } else if (w === '--opted-in') {
      own.optedIn = true;
    } else if (w === '--screen' && next !== undefined && /^[a-z0-9]+-[a-z]+-\d{4}$/.test(next)) {
      own.screen = next;
      i += 1;
    } else if (w === '--lines' && next !== undefined && /^\d{1,4}$/.test(next) && Number(next) >= 1) {
      own.lines = Number(next);
      i += 1;
    } else if (w === '--log' && next !== undefined) {
      own.log = next;
      i += 1;
    } else if (w === '--overlay-ms' && next !== undefined && /^\d{1,6}$/.test(next)) {
      own.overlayMs = Number(next);
      i += 1;
    } else {
      argv.push(w);
    }
  }
  return { own, argv };
}

// ---------------------------------------------------------------------------
// The stand-in itself, run only when this file is the entry point
// ---------------------------------------------------------------------------

async function standIn() {
  const { own, argv } = splitArgs(process.argv.slice(2));
  const agent = own.agent !== null && STAND_IN_AGENT_IDS.includes(own.agent) ? own.agent : NEUTRAL_AGENT;
  const DIR = String(process.env['P350_DIR'] ?? '').trim();
  const dirOk = DIR !== '' && existsSync(DIR);
  const pid = process.pid;
  const band = String(process.env['P350_PI_BAND'] ?? '').trim() || DEFAULT_PI_BAND;

  // The detection scan's version probe: exactly one version flag.
  if (argv.length === 1 && VERSION_FLAGS.has(argv[0])) {
    const delayMs = versionDelayOf(process.env['P350_VERSION_DELAY_MS']);
    const line = versionLineOf(agent, band);
    const note = (phase) => {
      if (!dirOk) return;
      try {
        appendFileSync(join(DIR, 'versions.jsonl'), `${J({ at: Date.now(), agent, pid, flag: argv[0], line, delayMs, phase })}\n`);
      } catch {
        /* the folder went away */
      }
    };
    note('start');
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    process.stdout.write(`${line}\n`);
    note('end');
    return 0;
  }
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) return 0;
  if (!process.stdout.isTTY) return 0;

  const named = own.log ?? String(process.env['P350_LOG'] ?? '').trim();
  const logPath = named !== '' ? named.replace(/%p/g, String(pid)) : dirOk ? join(DIR, `reads-${String(pid)}.log`) : '';
  const ceilingMs = Math.max(60_000, Number(process.env['P350_STANDIN_CEILING_MS'] ?? '') || 45 * 60_000);
  const lines = own.lines ?? TRANSCRIPT_LINES;
  const label = agent;
  const settingPath = agent === 'pi' ? piSettingsPathOf(process.env) : null;
  const setting = agent === 'pi' ? piSettingOf(settingPath) : null;
  const decided = modeOf({ agent, argv, env: process.env, own, band, setting });
  const screenId = own.mode === 'asking' ? ASKING_SCREEN : own.screen ?? SCREENS[agent] ?? null;
  const screenRows = screenId === null ? [] : loadScreen(screenId)?.rows ?? [];
  const overlayMs = own.overlayMs ?? 4_000;

  const timers = new Set();
  let done = null;
  let exitCode = 0;
  const finished = new Promise((r) => {
    done = (code = 0) => {
      exitCode = code;
      r();
    };
  });
  const later = (ms, fn) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
    return t;
  };
  const cols = () => process.stdout.columns || 80;
  const rows = () => process.stdout.rows || 24;

  let view = decided.view;
  let doc = [];
  let top = 0;
  let serial = 0;
  let pages = 0;
  let wheels = 0;
  let scrollFocus = false;
  let overlay = null;
  let left = false;
  let shellLine = '';

  const event = (entry) => {
    if (!dirOk) return;
    try {
      appendFileSync(join(DIR, `events-${String(pid)}.jsonl`), `${J({ at: Date.now(), serial, view, ...entry })}\n`);
    } catch {
      /* the folder went away; the poll ends the stand-in */
    }
  };
  const writeState = () => {
    if (!dirOk) return;
    try {
      writeFileSync(join(DIR, `state-${String(pid)}.json`), J({ pid, agent, view, kind: decided.kind, top, docLength: doc.length, rows: rows(), cols: cols(), page: decided.page, pages, wheels, scrollFocus, overlay: overlay !== null, left, serial, at: Date.now() }));
    } catch {
      /* the folder went away */
    }
  };
  const out = (bytes, why = null) => {
    try {
      process.stdout.write(bytes);
    } catch {
      /* the terminal is gone */
    }
    if (why !== null) event({ kind: 'modes', why, hex: Buffer.from(bytes, 'latin1').toString('hex') });
  };
  const maxTop = (d = doc) => Math.max(0, d.length - rows());

  /** A full-screen view, drawn whole: each row placed and cleared, cut one cell short of the width. */
  function drawView(d = doc, t = top) {
    let s = `${ESC}[H`;
    const width = Math.max(1, cols() - 1);
    for (let r = 0; r < rows(); r += 1) s += `${ESC}[${String(r + 1)};1H${ESC}[2K${clipRow(d[t + r] ?? '', width)}`;
    out(s);
    serial += 1;
    event({ kind: 'drew', top: t, rows: rows(), cols: cols() });
    writeState();
  }
  /** The inline drawing: every row printed to the normal screen, the last one without a line break. */
  function printInline(d, clearFirst) {
    const width = Math.max(1, cols() - 1);
    out(`${clearFirst ? `${ESC}[H${ESC}[2J${ESC}[3J` : ''}${ESC}[0m${d.map((row) => clipRow(row, width)).join('\r\n')}`);
    serial += 1;
    event({ kind: 'drew', inline: true, rows: rows(), cols: cols(), lines: d.length, cleared: clearFirst });
    writeState();
  }

  function enterFullscreen() {
    doc = documentOf({ label, view: 'fullscreen', screenRows, lines });
    top = maxTop();
    out(enterBytesOf(decided, agent), 'enter');
    drawView();
  }
  function mountInline() {
    const cursorTurns = agent === 'cursor' && decided.kind === 'cursor';
    doc = documentOf({ label, view: 'inline', screenRows, lines, cursorTurns });
    printInline(doc, cursorTurns || (agent === 'omp' && decided.kind === 'omp'));
  }

  /** pi below its floor asked for a `--tui-mode` it does not know: its trust ask, then exit 1 on a key. */
  function trustAsk() {
    out(`${ESC}[0mp350 stand-in: pi ${band} draws its trust question (no pi trust screen is committed; these two lines are this file's own).\r\nTrust this folder? Press any key.`);
    event({ kind: 'trust', band });
    writeState();
  }

  /** Move a full-screen view (or the omp overlay) by `delta` rows, and redraw when it moved. */
  function move(kind, delta, extra = {}) {
    const d = overlay !== null ? overlay.doc : doc;
    const from = overlay !== null ? overlay.top : top;
    const to = Math.min(maxTop(d), Math.max(0, from + delta));
    if (overlay !== null) overlay.top = to;
    else top = to;
    if (kind === 'page') pages += 1;
    else wheels += 1;
    event({ kind, from, to, moved: to !== from, ...extra });
    if (to !== from) drawView(d, to);
    else writeState();
  }

  function leaveForShell() {
    out(leaveBytesOf(decided), 'leave');
    view = 'shell';
    left = true;
    out('\r\n$ ');
    event({ kind: 'left' });
    writeState();
  }

  function overlayOn() {
    if (overlay !== null || view !== 'inline') return;
    const d = documentOf({ label, view: 'fullscreen', screenRows, lines });
    overlay = { doc: d, top: Math.max(0, d.length - rows()) };
    const modes = { setModes: [...FULLSCREEN_MOUSE.omp], kind: 'omp-overlay' };
    out(enterBytesOf(modes, 'omp-overlay'), 'overlay-on');
    drawView(d, overlay.top);
    later(overlayMs, () => {
      out(leaveBytesOf(modes), 'overlay-off');
      overlay = null;
      event({ kind: 'overlay-off' });
      writeState();
    });
  }

  /** One read, written down FIRST, then acted on. */
  function onData(chunk) {
    if (logPath !== '') {
      try {
        appendFileSync(logPath, `${String(Date.now())} ${chunk.toString('hex')}\n`);
      } catch {
        /* the folder went away; the poll ends the stand-in */
      }
    }
    const s = chunk.toString('latin1');
    if (view === 'dies-after-trust') {
      out(`\r\nerror: unknown option '--tui-mode' (p350 stand-in, pi ${band})\r\n`);
      event({ kind: 'exit', code: 1, why: 'pi before 0.84.0 met --tui-mode' });
      done(1);
      return;
    }
    if (view === 'shell') {
      for (let i = 0; i < s.length; ) {
        if (s.startsWith(`${ESC}[5~`, i) || s.startsWith(`${ESC}[6~`, i)) {
          out('~');
          shellLine += '~';
          event({ kind: 'tilde' });
          i += 4;
          continue;
        }
        const esc = /^\u001b(?:\[[0-9;?<]*[ -/]*[@-~]|.)/.exec(s.slice(i));
        if (esc !== null) {
          i += esc[0].length;
          continue;
        }
        const c = s[i];
        i += 1;
        if (c === '\r') {
          out('\r\n$ ');
          shellLine = '';
        } else if (c >= ' ' && c !== '\u007f') {
          out(c);
          shellLine += c;
        }
      }
      writeState();
      return;
    }
    for (const intent of intentsOf(s)) {
      if (intent.kind === 'tab') {
        if (agent === 'grok' && decided.kind === 'grok' && !scrollFocus) {
          scrollFocus = true;
          event({ kind: 'focus-scroll' });
          writeState();
        }
        continue;
      }
      if (overlay !== null) {
        move(intent.kind, intent.kind === 'page' ? intent.dir * pageOf('rows', rows()) : intent.dir * 3, { overlay: true });
        continue;
      }
      if (view !== 'fullscreen') {
        event({ kind: `${intent.kind}-inline`, dir: intent.dir });
        continue;
      }
      if (intent.kind === 'page') {
        if (decided.kind === 'leave-on-page') {
          event({ kind: 'page', from: top, to: top, moved: false, leaving: true });
          leaveForShell();
          return;
        }
        if (agent === 'grok' && decided.kind === 'grok' && !scrollFocus) {
          event({ kind: 'page', from: top, to: top, moved: false, why: 'grok takes a page only after a Tab' });
          continue;
        }
        move('page', intent.dir * pageOf(decided.page, rows()));
      } else {
        move('wheel', intent.dir * 3, { encoding: intent.encoding });
      }
    }
  }

  try {
    if (dirOk) {
      writeFileSync(
        join(DIR, `hello-${String(pid)}.json`),
        J({
          pid,
          ppid: process.ppid,
          agent,
          label,
          argv,
          own,
          view: decided.view,
          kind: decided.kind,
          setModes: decided.setModes,
          page: decided.page,
          note: decided.note,
          band: agent === 'pi' ? band : null,
          setting,
          settingPath,
          screen: screenId,
          session: process.env['GMUX_SESSION_ID'] ?? null,
          pane: process.env['TMUX_PANE'] ?? null,
          tmux: process.env['TMUX'] ?? null,
          claudeInline: String(process.env['CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN'] ?? '') === '1',
          cwd: process.cwd(),
          cols: cols(),
          rows: rows(),
          log: logPath,
          at: Date.now()
        })
      );
    }
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.on('data', onData);
    }
    if (view === 'fullscreen') enterFullscreen();
    else if (view === 'inline') mountInline();
    else if (view === 'dies-after-trust') trustAsk();
    else {
      out(`${ESC}[0m--tui-mode requires regular or fullscreen (p350 stand-in, pi ${band})\r\n`);
      event({ kind: 'exit', code: 1, why: 'an invalid --tui-mode' });
      done(1);
    }
    process.stdout.on('resize', () => {
      event({ kind: 'resize', cols: cols(), rows: rows() });
      if (overlay !== null) {
        overlay.top = Math.min(overlay.top, maxTop(overlay.doc));
        drawView(overlay.doc, overlay.top);
      } else if (view === 'fullscreen') {
        top = Math.min(top, maxTop());
        drawView();
      } else if (view === 'inline' && ((agent === 'pi' && decided.kind === 'pi') || (agent === 'cursor' && decided.kind === 'cursor'))) {
        // pi regular (tui-main-screen.ts:284) and cursor clear and print again on every size change.
        printInline(doc, true);
      } else writeState();
    });
    process.on('SIGUSR1', () => {
      event({ kind: 'sigusr1' });
      if (agent === 'omp' && decided.kind === 'omp') overlayOn();
    });
    for (const sig of ['SIGHUP', 'SIGTERM', 'SIGINT']) process.on(sig, () => done(0));
    later(ceilingMs, () => done(0));
    const poll = setInterval(() => {
      if (dirOk && !existsSync(DIR)) done(0);
    }, 500);
    timers.add(poll);
    await finished;
  } finally {
    for (const t of timers) {
      clearTimeout(t);
      clearInterval(t);
    }
    try {
      if (overlay !== null) process.stdout.write(leaveBytesOf({ setModes: [...FULLSCREEN_MOUSE.omp] }));
      if (view === 'fullscreen') process.stdout.write(leaveBytesOf(decided));
    } catch {
      /* the terminal is gone */
    }
    event({ kind: 'ended', code: exitCode });
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
      } catch {
        /* the terminal is gone */
      }
    }
    process.stdin.pause();
  }
  return exitCode;
}

/** This file run as the entry point, however the path that named it was spelled. */
function isEntry() {
  try {
    return process.argv[1] !== undefined && pathToFileURL(realpathSync(process.argv[1])).href === pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href;
  } catch {
    return false;
  }
}
if (isEntry()) {
  standIn()
    .then((code) => process.exit(code))
    .catch(() => process.exit(0));
}
