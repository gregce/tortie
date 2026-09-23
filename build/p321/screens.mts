/**
 * build/p321/screens.mts — the REDACTED screens Phase 321 commits from the
 * real-agent recordings, the one pass that makes them, and the checks that hold
 * them (build/p321/SPEC.md §2.4).
 *
 *   node <tsx> --tsconfig tsconfig.main.json build/p321/screens.mts --make     (needs P321_CORPUS)
 *   node <tsx> --tsconfig tsconfig.main.json build/p321/screens.mts --check    (no corpus)
 *   node <tsx> --tsconfig tsconfig.main.json build/p321/screens.mts --matrix   (no corpus; --all lists every window)
 *
 * where `<tsx>` is `node_modules/tsx/dist/cli.mjs` (build/ts-runner.mjs).
 *
 * WHAT IS COMMITTED. For every capture stream of the corpus, each distinct
 * DETECTOR WINDOW after redaction — the last 24 inked rows, exactly what
 * `dialogWindow` in `src/main/activity/screen.ts` hands both readers, so a
 * verdict on the committed window equals the verdict on the capture it came
 * from — one JSON line each in `build/fixtures/questions/<source>-<agent>.jsonl`:
 * `{ id, label, verdicts: { parent, head }, rows }`. `verdicts` is what the
 * RAW window read at `--make`, pinned so `--check` can hold the redacted rows
 * to it with no corpus (the one field beyond SPEC §2.4's three). The labels and
 * the 17 question instances are in `labels.json`, derived by hand in
 * `build/p321/corpus.mjs` from the capture streams and the key events and never
 * from a detector. Nine named full screens go to
 * `src/main/activity/__tests__/fixtures/` through the same pass.
 *
 * THE PASS, one mechanical sequence per row (SPEC §2.4):
 *   1. the window: trailing blank rows popped, the last 24 kept, each row
 *      right-trimmed (which neither reader can see: the border strip trims it);
 *   2. the slots: any token carrying the scratch path (or a wrapped fragment of
 *      it) becomes `/work/<agent>`, the home directory becomes `~`, an account
 *      address with the plan beside it becomes blanks of the same width, every
 *      skill name becomes `skill-N` and every MCP server name `mcp-N` (the names
 *      are read from the recordings at run time and written nowhere), then the
 *      tree's own `redactText`;
 *   3. prose to shape: a row is kept only when the agent's hand-written CHROME
 *      table below names it, and inside a kept row every `x…` group (a command,
 *      a model, a folder, anything the person or the model chose) is shaped
 *      too. Every other row is shaped: each letter to `x` (`X` for a capital),
 *      and digits, punctuation, spacing and box drawing kept, so it keeps its
 *      length, its indent and its ink;
 *   4. the check, both ways: the parent verdict (a literal copy of
 *      `detectDialog` at `ecb6997a`, below) and the HEAD verdict (the shipping
 *      `detectDialog` OR the agent's own shapes from the compiled registry,
 *      through the shipping `detectShapes`) of the redacted window must equal
 *      their verdicts on the raw one, or the window is DROPPED and counted;
 *   5. the disclosure scan: an address, `/Users/`, `/private/`, `/tmp/`, the
 *      account name and its home flattened and SHAPED (what a home the slot
 *      missed looks like after shaping), `scratchpad`, a uuid, a piece of one
 *      or a long mixed hex run, the model and plan names, and, read at run time
 *      and written nowhere, every skill and MCP name, every scratch-path token
 *      of the raw captures SHAPED, and any 16-character run of any typed
 *      prompt. A window that still matches is dropped and counted. Then the
 *      windows are deduplicated. `--check` runs the patterns that need no
 *      corpus.
 *
 * NOTHING HERE PRINTS A RAW ROW. `--make` prints counts only; `--matrix` prints
 * verdicts and ids; `--check` prints what failed by id, row number and class.
 *
 * WHAT `--check` HOLDS, with no corpus: every committed row is either one the
 * agent's chrome table names (with every `x…` group holding no letter but `x`
 * and `X`) or holds no letter but `x` and `X`; no row carries a disclosure
 * pattern; no window is longer than 24 rows or ends blank (an EMPTY window,
 * the captures before an agent drew anything, is allowed); no two windows of a
 * file are the same; each window's parent and HEAD verdicts are the pinned
 * ones, and the shipping `detectDialog` equals the literal parent copy on it;
 * `labels.json` agrees with the files; and no committed file of this pass
 * carries a control byte other than the newline.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as screen from '../../src/main/activity/screen.ts';
import type { DialogShapeId } from '../../src/main/activity/screen.ts';
import { activityProfileFor } from '../../src/main/agents/registry.ts';
import { redactText } from '../../src/main/overview/redact.ts';
import * as corpus from './corpus.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const QUESTIONS_DIR = join(ROOT, 'build', 'fixtures', 'questions');
export const LABELS_FILE = join(QUESTIONS_DIR, 'labels.json');
export const FIXTURES_DIR = join(ROOT, 'src', 'main', 'activity', '__tests__', 'fixtures');

/** The committed files this pass writes or owns, for the control-byte scan. */
const OWN_SOURCES = ['build/p321/corpus.mjs', 'build/p321/screens.mts'];

/** `DIALOG_ROWS` in `screen.ts`. */
const WINDOW_ROWS = 24;

// ---------------------------------------------------------------------------
// The two verdicts
// ---------------------------------------------------------------------------

/**
 * `detectDialog` as it stood at `ecb6997a` (and at `a31999fc`, which
 * `p312-choices.test.ts` copies), copied byte for byte except for the name.
 * Nothing here is imported from the module it judges.
 */
function parentVerdict(capture: string): boolean {
  const BORDER = /^[\s│┃║▌▏|]+|[\s│┃║▕|]+$/g;
  const OPT1 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}1[.)]\s+\S/;
  const OPT2 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}2[.)]\s+\S/;
  const HINT =
    /(enter to (confirm|select|continue)|press enter|esc to cancel|esc to quit|use enter to select|to cancel)/i;
  const QUEST = /(do you (want|trust)|would you like|how would you like)/i;
  const DIALOG_ROWS = 24;
  const lines = capture.split('\n');
  while (lines.length > 0 && (lines[lines.length - 1] ?? '').trim() === '') {
    lines.pop();
  }
  const rows = lines.slice(-DIALOG_ROWS).map((l) => l.replace(BORDER, ''));
  let opt1 = false;
  let opt2 = false;
  let hint = false;
  for (const row of rows) {
    if (!opt1 && OPT1.test(row)) opt1 = true;
    if (!opt2 && OPT2.test(row)) opt2 = true;
    if (!hint && (HINT.test(row) || QUEST.test(row))) hint = true;
  }
  return opt1 && opt2 && hint;
}

type DetectShapes = (capture: string, shapes: readonly DialogShapeId[]) => boolean;

/** Builder B's `detectShapes`, read from the shipping module at run time. */
function detectShapesOrRefuse(): DetectShapes {
  const fn = (screen as unknown as { detectShapes?: unknown }).detectShapes;
  if (typeof fn !== 'function') {
    throw new Error('src/main/activity/screen.ts exports no detectShapes yet, so the HEAD verdict cannot be read');
  }
  return fn as DetectShapes;
}

/** The shapes the COMPILED registry row of `agent` names, or none. */
export function shapesFor(agent: string): readonly DialogShapeId[] {
  const profile = activityProfileFor(agent) as { dialogs?: readonly DialogShapeId[] };
  return profile.dialogs ?? [];
}

/** HEAD: the shipping numbered verdict OR the agent's own shapes (SPEC §4.2's `dialog`, before the grok belt). */
export function headVerdict(agent: string, capture: string): boolean {
  return screen.detectDialog(capture) || detectShapesOrRefuse()(capture, shapesFor(agent));
}

export { parentVerdict };

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/** The window both readers see, each row right-trimmed. */
export function windowOf(text: string): string[] {
  const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''));
  while (lines.length > 0 && (lines[lines.length - 1] ?? '').trim() === '') lines.pop();
  return lines.slice(-WINDOW_ROWS);
}

/** A whole screen's rows, right-trimmed, the capture's own trailing newline dropped. */
function screenRows(text: string): string[] {
  const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''));
  if (text.endsWith('\n')) lines.pop();
  return lines;
}

/** The border halves of `BORDER`, split so a kept row keeps its border. */
function splitBorder(row: string): { lead: string; body: string; trail: string } {
  const lead = /^[\s│┃║▌▏|]+/.exec(row)?.[0] ?? '';
  const rest = row.slice(lead.length);
  const trail = /[\s│┃║▕|]+$/.exec(rest)?.[0] ?? '';
  return { lead, body: rest.slice(0, rest.length - trail.length), trail };
}

/** Prose to shape: every letter to `x`, a capital to `X`; everything else kept. */
export function shape(text: string): string {
  return text.replace(/\p{Lu}/gu, 'X').replace(/\p{L}/gu, 'x');
}

/** A letter other than the shaping's own `x` and `X`. */
const UNSHAPED_LETTER = /[^\P{L}xX]/u;

// ---------------------------------------------------------------------------
// The chrome tables, by hand
// ---------------------------------------------------------------------------

/**
 * One row of an agent's own UI. A `re` is tested against the border-stripped
 * row; every named group whose name starts with `x` is SHAPED in the kept row
 * (a command, a model, a folder, a thought: anything the person or the model
 * chose rather than the agent's UI). A `wrap` is a sentence the agent draws
 * wrapped at the pane width; a row that is a word-aligned piece of it is kept.
 * `from` names the recordings the row was read from, by eye, at this step.
 */
interface Chrome {
  re?: RegExp;
  wrap?: string;
  from: string;
}

interface AgentChrome {
  /**
   * A column the agent draws BESIDE its rows (qwen's scrollbar, opencode's
   * sidebar), split off the row's end before the table is asked and kept as
   * drawn. Only a column this pattern names is kept.
   */
  side?: RegExp;
  rows: Chrome[];
}

const ALL_CURSOR = 'a/cursor adv1/cursor b/cursor';
const ALL_QWEN = 'a/qwen adv1/qwen b/qwen';
const ALL_GROK = 'a/grok adv1/grok b/grok';

/** The chrome tables. Every `re` is anchored at both ends. */
export const CHROME: Readonly<Record<string, AgentChrome>> = {
  cursor: {
    rows: [
      { re: /^Cursor Agent$/, from: `${ALL_CURSOR}, banner` },
      { re: /^v\d{4}\.\d{2}\.\d{2}-[0-9a-f]{7}$/, from: 'banner version: v2026.09.02 in a/cursor, v2026.09.18 in adv1/cursor and b/cursor' },
      { re: /^\/work\/cursor(?: · main)?$/, from: `${ALL_CURSOR}, the footer and the trust box's folder` },
      { re: /^[⠀-⣿]{1,2} (?:Running|Composing|Thinking)(?: {2}\d+ tokens)?$/, from: `${ALL_CURSOR}, spinner` },
      { re: /^→ (?:Add a follow-up|Plan, search, build anything)(?:\s{3,}ctrl\+c to stop)?$/, from: `${ALL_CURSOR}, the input box` },
      {
        re: /^→ Tell the agent what to do instead \(Enter to send, empty to skip, Esc to cancel\)(?:\s{3,}ctrl\+c to stop)?$/,
        from: 'b/cursor, the input box after a refused command'
      },
      { re: /^\d+ tasks?$/, from: `${ALL_CURSOR}, footer` },
      { re: /^ctrl\+b twice to send to background$/, from: 'a/cursor adv1/cursor' },
      {
        re: /^Tip: (?:Use \/debug to instrument and debug complex problems|Use \/plan to plan execution and reach the right outcome faster|Type \? in the prompt bar to show in-app hints|Use \/mcp to connect Cursor to your tools and data sources|Use \/run-everything to skip all approvals)\.$/,
        from: `${ALL_CURSOR}, tips`
      },
      { re: /^⚠ Workspace Trust Required$/, from: `${ALL_CURSOR}, trust gate` },
      { re: /^Cursor Agent can execute code and access files in this directory\.$/, from: `${ALL_CURSOR}, trust gate` },
      { re: /^Do you trust the contents of this directory\?$/, from: `${ALL_CURSOR}, trust gate` },
      { re: /^(?:▶ )?\[(?:a\] Trust this workspace|q\] Quit)$/, from: `${ALL_CURSOR}, trust gate options` },
      { re: /^Use arrow keys to navigate, Enter to select, or press the key shown$/, from: `${ALL_CURSOR}, trust gate hint` },
      { re: /^⏳ Trusting workspace\.\.\.$/, from: `${ALL_CURSOR}, the answered trust gate` },
      { re: /^Run this command\?$/, from: `${ALL_CURSOR}, permission` },
      { re: /^Not in allowlist: (?<x1>.+)$/, from: `${ALL_CURSOR}, permission` },
      { re: /^(?:→ )?Run \(once\) \(y\)$/, from: `${ALL_CURSOR}, permission options` },
      { re: /^(?:→ )?Add Shell\((?<x1>[^)]*)\) to allowlist\? \(tab\)$/, from: `${ALL_CURSOR}, permission options` },
      { re: /^(?:→ )?Run Everything \(shift\+tab\)$/, from: `${ALL_CURSOR}, permission options` },
      { re: /^(?:→ )?Skip & tell the agent what to do instead \(esc or n\)$/, from: `${ALL_CURSOR}, permission options` },
      {
        re: /^\$ {1,2}(?<x1>.+?)(?: Waiting for approval\.\.\.| in \.| exit \d+(?: [\dms. ]+)?| [\d.]+m?s| \d+m(?: \d+s)?)?$/,
        from: `${ALL_CURSOR}, a tool call and its state`
      }
    ]
  },
  qwen: {
    side: /\s+█$/,
    rows: [
      { re: /^[>*] {3}Type your message or @path\/to\/file$/, from: `${ALL_QWEN}, the input box` },
      { re: /^∴\u{FE0E}? Thought briefly \(click or ctrl\+o to expand\)$/u, from: ALL_QWEN },
      { re: /^∵\u{FE0E}? Thinking… \d+s$/u, from: 'a/qwen b/qwen' },
      {
        re: /^➜ (?<x1>\S+)(?: · git:\(main\))? · (?<x2>\S+)(?: · [\d.]+m Context [\d.]+% used)?$/,
        from: `${ALL_QWEN}, footer: folder and model shaped`
      },
      { re: /^Tips: Try \/insight to generate personalized insights from your chat history\.$/, from: ALL_QWEN },
      { re: /^●\u{FE0E}? Qwen Code update available! [\d.]+ → [\d.]+$/u, from: ALL_QWEN },
      { re: /^The update will be installed after you exit this session\.$/, from: ALL_QWEN },
      {
        re: /^(?:Enter to steer · Ctrl\+Q to queue · )?(?:Auto mode|⏸ Ask permissions|YOLO mode|plan mode) \(shift \+ tab to cycle\)(?: ⏳ \d+ queued)?$/,
        from: `${ALL_QWEN}, the mode footer`
      },
      { re: /^Ctrl\+Q to queue · ↑ to edit queued messages$/, from: 'a/qwen' },
      { re: /^●\u{FE0E}? Read context files: ~\/\.qwen\/output-language\.md$/u, from: ALL_QWEN },
      { re: /^(?:x|✓|\?|\.{1,2}) ?Shell (?<x1>.+?)(?: (?:\d+m )?\d+s| \d+m)?(?: ←)?$/, from: `${ALL_QWEN}, a tool call` },
      {
        re: /^\.{1,2} {1,2}(?:Initializing\.\.\.|(?<x1>[^()]+?) +\((?:\d+m )?\d+s(?: · ↑ \d+ tokens)? · esc to cancel\))$/,
        from: `${ALL_QWEN}, the working row, its phrase shaped`
      },
      { re: /^Allow execution of: '(?<x1>[^']*)'\?$/, from: 'a/qwen, confirmation' },
      { re: /^(?:› )?1\. Yes, allow once$/, from: 'a/qwen, confirmation options' },
      { re: /^(?:› )?[23]\. Always allow run '(?<x1>[^']*) \*' commands (?:in this project|for this user)$/, from: 'a/qwen, confirmation options' },
      { re: /^(?:› )?4\. No, suggest changes \(esc\)$/, from: 'a/qwen, confirmation options' },
      { re: /^[⠀-⣿] Waiting for user confirmation\.\.\.$/, from: 'a/qwen, confirmation' },
      { re: /^Press Esc again to rewind conversation\.$/, from: 'b/qwen' },
      { re: /^[^\p{L}]*>_ Qwen Code \(v[\d.]+\)$/u, from: `${ALL_QWEN}, banner` },
      { re: /^[^\p{L}]*\/work\/qwen$/u, from: `${ALL_QWEN}, banner` }
    ]
  },
  gemini: {
    rows: [
      {
        re: /^ℹ Skill command '\/skill-\d+' was renamed to '\/skill-\d+' because it conflicts with built-in command\.$/,
        from: 'a/gemini b/gemini, banner'
      },
      {
        re: /^(?:⚠ {2})?(?:(?:Skill conflict detected:|is|overriding|the|same|skill|from|"skill-\d+"|"~\/\.(?:agents|gemini)\/skills\/skill-\d+\/SKILL\.md"\.?)(?: |$))+$/,
        from: 'a/gemini b/gemini, banner, wrapped at 160 and at 120'
      },
      { re: /^ℹ Update successful! The new version will be used on your next run\.$/, from: 'a/gemini b/gemini' },
      { re: /^Gemini CLI update available! [\d.]+ → [\d.]+$/, from: 'a/gemini b/gemini' },
      { re: /^Installed with npm\. Attempting to automatically update now\.\.\.$/, from: 'a/gemini b/gemini' },
      { re: /^Do you trust the files in this folder\?$/, from: 'a/gemini b/gemini, trust gate' },
      {
        wrap: 'Trusting a folder allows Gemini CLI to load its local configurations, including custom commands, hooks, MCP servers, agent skills, and settings. These configurations could execute code on your behalf or change the behavior of the CLI.',
        from: 'a/gemini b/gemini, trust gate'
      },
      { re: /^(?:● )?1\. Trust folder \((?<x1>[^)]*)\)$/, from: 'a/gemini b/gemini, trust gate options, folder shaped' },
      { re: /^(?:● )?2\. Trust parent folder \((?<x1>[^)]*)\)$/, from: 'a/gemini b/gemini, trust gate options, folder shaped' },
      { re: /^(?:● )?3\. Don't trust$/, from: 'a/gemini b/gemini, trust gate options' },
      { re: /^Gemini CLI is restarting to apply the trust changes\.\.\.$/, from: 'a/gemini, the answered gate' },
      { re: /^> {3}Press '(?:Esc' for NORMAL|i' for INSERT) mode\.$/, from: 'a/gemini b/gemini, the input box' },
      { re: /^Shift\+Tab to accept edits(?:\s{3,}\d+ GEMINI\.md file · \d+(?: skills?)?)?$/, from: 'a/gemini b/gemini, footer' },
      { re: /^\? for shortcuts$/, from: 'a/gemini b/gemini' },
      { re: /^workspace \(\/directory\)\s+sandbox\s+\/model$/, from: 'a/gemini b/gemini, footer' },
      { re: /^\[(?:INSERT|NORMAL)\]\s+\/work\/gemini\s+(?:no sandbox|untrusted)\s+Auto$/, from: 'a/gemini b/gemini, footer' },
      { re: /^[⠀-⣿] Thinking\.\.\. \(esc to cancel, \d+s\)(?:\s{3,}\? for shortcuts)?$/, from: 'a/gemini b/gemini' },
      {
        wrap: 'ℹ This request failed. Press F12 for diagnostics, or run /settings and change "Error Verbosity" to full for full details.',
        from: 'a/gemini b/gemini, after the API refused the request'
      }
    ]
  },
  antigravity: {
    rows: [
      { re: /^Accessing workspace:$/, from: 'a/antigravity, trust gate' },
      { re: /^\/work\/antigravity$/, from: 'a/antigravity, trust gate' },
      { re: /^Do you trust the contents of this project\?$/, from: 'a/antigravity, trust gate' },
      { re: /^Antigravity CLI requires permission to read, edit, and execute files here\.$/, from: 'a/antigravity, trust gate' },
      { re: /^(?:> )?(?:Yes, I trust this folder|No, exit)$/, from: 'a/antigravity, trust gate options' },
      { re: /^↑\/↓ Navigate · (?:enter Confirm|tab Amend · ctrl\+g edit\/expand command)$/, from: 'a/antigravity, the list hint' },
      { re: /^(?:Command|Requesting permission for:|Run this command\?)$/, from: 'a/antigravity, permission' },
      { re: /^(?:> )?1\. Yes, run command$/, from: 'a/antigravity, permission options' },
      {
        re: /^(?:> )?2\. Yes, and always allow in this conversation for commands that start with '(?<x1>[^']*)'$/,
        from: 'a/antigravity, permission options'
      },
      {
        re: /^(?:> )?3\. Yes, and always allow for commands that start with '(?<x1>[^']*)' \(Persist to settings\.json\)$/,
        from: 'a/antigravity, permission options'
      },
      { re: /^(?:> )?4\. No, cancel$/, from: 'a/antigravity, permission options' },
      { re: /^(?:esc to cancel|\? for shortcuts)(?:\s{3,}(?<x1>.+))?$/, from: 'a/antigravity, the key row, the model beside it shaped' },
      { re: /^>$/, from: 'a/antigravity, the empty input box' },
      { re: /^▸ Thought for \d+s, [\d.]+k? tokens$/, from: 'a/antigravity' },
      { re: /^[○●] (?:Bash|ManageTask)\((?<x1>[^)]*)\) \(ctrl\+o to expand\)$/, from: 'a/antigravity, a tool call' },
      { re: /^● \[\d\d:\d\d:\d\d\] (?<x1>.+) running$/, from: 'a/antigravity, a background task' },
      { re: /^[⠀-⣿] {2}(?:Running command|Generating|Managing tasks)\.\.\.$/, from: 'a/antigravity, spinner' },
      { re: /^└ Tip: (?:Use \/skills to browse and manage agent skills|Press esc to interrupt generation)\.$/, from: 'a/antigravity' },
      { re: /^[▄▀ ]+Antigravity CLI [\d.]+$/, from: 'a/antigravity, banner' },
      { re: /^[▄▀ ]+\/work\/antigravity$/, from: 'a/antigravity, banner' }
    ]
  },
  opencode: {
    side: /\s{3,}(?:\/work\/opencode|opencode:main|• OpenCode [\d.]+|[\d.]+)$/,
    rows: [
      { re: /^▣ {2}Build · (?<x1>.+?)(?: · (?:\d+m )?[\d.]+s)?$/, from: 'a/opencode, a turn header, the model shaped' },
      { re: /^Build · (?<x1>.+)$/, from: 'a/opencode, the input box, the model shaped' },
      {
        re: /^[⬝■]{8} {2}esc interrupt\s{3,}(?:[\d.]+K \(\d+%\) {2})?(?:tab agents {2})?ctrl\+p commands$/,
        from: 'a/opencode, the working footer'
      },
      { re: /^[⠀-⣿] (?:Thinking|(?<x1>.+))$/, from: 'a/opencode, spinner, a command shaped' },
      { re: /^\$ (?<x1>.+)$/, from: 'a/opencode, a tool call' },
      { re: /^\(no output\)$/, from: 'a/opencode' },
      { re: /^\+ Thought: (?<x1>.+) · [\d.]+s$/, from: 'a/opencode, a thought, shaped' },
      { re: /^~ Writing command…$/, from: 'a/opencode' },
      { re: /^△ Permission required$/, from: 'a/opencode, permission' },
      { re: /^← Access external directory \/work\/opencode$/, from: 'a/opencode, permission' },
      { re: /^(?:- )?\/work\/opencode$/, from: 'a/opencode, permission patterns and the sidebar' },
      { re: /^Patterns$/, from: 'a/opencode, permission' },
      {
        re: /^Allow once {3}Allow always {3}Reject\s{3,}ctrl\+f fullscreen {2}⇆ select {2}enter confirm$/,
        from: 'a/opencode, permission buttons and hint'
      },
      { re: /^(?:• OpenCode [\d.]+|opencode:main|[\d.]+)$/, from: 'a/opencode, sidebar' },
      { re: /^tab agents {2}ctrl\+p commands$/, from: 'a/opencode' },
      { re: /^Ask anything… "What is the tech stack of this project\?"$/, from: 'a/opencode, the idle input box' }
    ]
  },
  claude: {
    rows: [
      { re: /^❯$/, from: 'a/claude, the empty input box' },
      { re: /^❯ Try "fix typecheck errors"$/, from: 'a/claude, the idle input box' },
      {
        re: /^⏸ manual mode on(?: · (?:esc to interrupt|\? for shortcuts) · ← for agents)?(?:\s{3,}(?<x1>.+))?$/,
        from: 'a/claude, the mode footer, the usage beside it shaped'
      },
      {
        re: /^⏵⏵ don't ask on \(shift\+tab to cycle\) · ← for agents(?:\s{3,}(?<x1>.+))?$/,
        from: 'a/claude, the mode footer, the usage beside it shaped'
      },
      { re: /^⎿ {2}Error: (?<x1>.+)$/, from: 'a/claude, a tool error, shaped' },
      {
        re: /^⎿ {2}Tip: (?:Use git worktrees to run multiple Claude sessions in parallel\.|Use \/memory to view and manage Claude memory)$/,
        from: 'a/claude'
      },
      { re: /^\(ctrl\+b ctrl\+b \(twice\) to run in background\)$/, from: 'a/claude' },
      { re: /^⎿ {2}(?:Running…(?: \((?:\d+m )?\d+s\))?|\(No output\)|Done)$/, from: 'a/claude, a tool result' },
      { re: /^(?:⏺ )?Bash\((?<x1>.+)\)$/, from: 'a/claude, a tool call' },
      {
        re: /^[✳✶✻✢✽·] (?:Fluttering|Mustering|Effecting|Transfiguring)…(?: \((?:running UserPromptSubmit hook · \d+s|(?:\d+m )?\d+s(?: · ↓ \d+ tokens)?(?: · (?:thinking|thought for \d+s))?)\))?$/,
        from: 'a/claude, spinner'
      },
      { re: /^✻ (?:Brewed|Cooked|Sautéed) for (?:\d+m )?\d+s · done \d{1,2}:\d\d [AP]M$/, from: 'a/claude, a finished turn' },
      { re: /^[▐▛█▜▌▝▘▀ ]+Claude Code v[\d.]+$/, from: 'a/claude, banner' },
      { re: /^[▐▛█▜▌▝▘▀ ]+\/work\/claude$/, from: 'a/claude, banner' },
      { re: /^Accessing workspace:$/, from: 'a/claude, trust gate' },
      { re: /^\/work\/claude$/, from: 'a/claude, trust gate' },
      {
        wrap: "Quick safety check: Is this a project you created or one you trust? (Like your own code, a well-known open source project, or work from your team). If not, take a moment to review what's in this folder first.",
        from: 'a/claude, trust gate'
      },
      { re: /^Claude Code'll be able to read, edit, and execute files here\.$/, from: 'a/claude, trust gate' },
      { re: /^Security guide$/, from: 'a/claude, trust gate' },
      { re: /^(?:❯ )?(?:No, exit|Yes, I trust this folder)$/, from: 'a/claude, trust gate options' },
      { re: /^Enter to confirm · Esc to cancel$/, from: 'a/claude, trust gate hint' }
    ]
  },
  codex: {
    rows: [
      { re: /^› Ask Codex to do anything$/, from: 'a/codex, the input box' },
      {
        re: /^• (?:Working|Waiting for background terminal) \((?:\d+m )?\d+s • esc to interrupt\)(?: · \d+ background terminals? running · \/ps to view · \/stop to close)?$/,
        from: 'a/codex, the working row'
      },
      { re: /^\d+ background terminals? running · \/ps to view · \/stop to close$/, from: 'a/codex' },
      {
        re: /^(?<x1>\S+) (?:xhigh|high|medium|low|minimal|default) · \/work\/codex · (?:[\d.]+K used · )?[\d.]+K? in · [\d.]+K? o(?:ut|…)$/,
        from: 'a/codex, footer, the model shaped'
      },
      { re: /^└ (?:\(no output\)|(?<x1>.+))$/, from: 'a/codex, a tool result' },
      { re: /^• (?:Ran|Waited for background terminal ·) (?<x1>.+)$/, from: 'a/codex, a tool call' },
      { re: /^Tip: Run \/review to get a code review of your current changes\.$/, from: 'a/codex' },
      { re: /^directory: \/work\/codex$/, from: 'a/codex, banner' },
      { re: /^model: {5}(?<x1>\S+(?: \S+)?) {3}\/model to change$/, from: 'a/codex, banner, the model shaped' },
      { re: /^>_ OpenAI Codex \(v[\d.]+\)$/, from: 'a/codex, banner' },
      { re: /^Worked for (?:\d+m )?\d+s · done \d{1,2}:\d\d [AP]M$/, from: 'a/codex' },
      { re: /^✨\s+Update available! [\d.]+ -> [\d.]+$/, from: 'a/codex, update prompt (a hair space after the glyph)' },
      { re: /^Release notes: https:\/\/github\.com\/openai\/codex\/releases\/latest$/, from: 'a/codex, update prompt' },
      { re: /^(?:› )?1\. Update now \(runs `(?<x1>[^`]*)`\)$/, from: 'a/codex, update prompt options, the command shaped' },
      { re: /^(?:› )?2\. Skip$/, from: 'a/codex, update prompt options' },
      { re: /^(?:› )?3\. Skip until next version$/, from: 'a/codex, update prompt options' },
      { re: /^Press enter to continue$/, from: 'a/codex, update prompt hint' },
      { re: /^\? for shortcuts$/, from: 'a/codex' },
      { re: /^Run (?<x1>.+) to update\.$/, from: 'a/codex, after the update prompt, the command shaped' },
      { re: /^See full release notes:$/, from: 'a/codex' },
      { re: /^https:\/\/github\.com\/openai\/codex\/releases\/latest$/, from: 'a/codex' }
    ]
  },
  pi: {
    rows: [
      { re: /^\/work\/pi \(main\)$/, from: 'a/pi, footer' },
      { re: /^[⠀-⣿] Working\.\.\.$/, from: 'a/pi, spinner' },
      { re: /^\$ (?:\.\.\.|(?<x1>.+))$/, from: 'a/pi, a tool call' },
      { re: /^Changelog: https:\/\/pi\.dev\/changelog$/, from: 'a/pi, banner' },
      {
        re: /^(?:↑[\d.]+k? ↓[\d.]+k?(?: R[\d.]+k?)?(?: CH[\d.]+%)? \$[\d.]+ )?[\d.]+%\/[\d.]+M \(auto\)(?:\s{3,}(?<x1>.+))?$/,
        from: 'a/pi, footer, the model beside it shaped'
      },
      { re: /^(?:Elapsed|Took) [\d.]+s$/, from: 'a/pi' },
      { re: /^\(no output\)$/, from: 'a/pi' },
      { re: /^Update Available$/, from: 'a/pi' },
      { re: /^New version [\d.]+ is available\. Run pi update$/, from: 'a/pi' },
      { re: /^Pi can explain its own features and look up its docs\. Ask it how to use or extend Pi\.$/, from: 'a/pi, banner' },
      { re: /^\[Skills\]$/, from: 'a/pi, banner; the list under it is shaped' },
      { re: /^Press ctrl\+o to show full startup help and loaded resources\.$/, from: 'a/pi, banner' }
    ]
  },
  omp: {
    rows: [
      { re: /^\$ (?<x1>.+)$/, from: 'a/omp, a tool call' },
      { re: /^Update Available$/, from: 'a/omp' },
      { re: /^New version [\d.]+ is available\. Run: omp update$/, from: 'a/omp' },
      { re: /^⎋ (?:Waiting synchronously|Working…|Waiting for (?<x1>.+)|(?<x2>.+))$/, from: 'a/omp, the working row, a task title shaped' },
      {
        re: /^(?:[⠀-⣿] (?:\d+m|\d+s) {2}|π {2})> ◕ (?<x1>\S+) > 🗑 \/work\/omp > ⑂ main(?: \?\d+)? > (?:S[\d.]+|\(sub\)) ▶[─\d%╎┃ ]*(?:[\d.]+K)?(?:─◀ ⚙ \d+|─)?$/u,
        from: 'a/omp, the status line, the model shaped'
      },
      { re: /^├─── Output ─+$/, from: 'a/omp' },
      { re: /^⟦(?:Backgrounded: bg_\d+|Wall: [\d.]+s) \| Timeout: disabled⟧$/, from: 'a/omp' },
      { re: /^ⓘ waiting on \d+ jobs?$/, from: 'a/omp' },
      { re: /^✔ \d+ jobs? settled \d+ done$/, from: 'a/omp' },
      { re: /^└─ (?:[⠀-⣿]|•) bg_\d+ ⟦bash⟧ (?<x1>.+?) (?:\d+m)?\d+s$/, from: 'a/omp, a background job' },
      { re: /^Tip: `\/shake` rips heavy tool results out of context to reclaim tokens without a full \/compact —$/, from: 'a/omp' },
      { re: /^`\/shake images` drops just images$/, from: 'a/omp' },
      { re: /^(?:Recent sessions|No recent sessions)$/, from: 'a/omp, banner' },
      { re: /^\(no output\)$/, from: 'a/omp' }
    ]
  },
  grok: {
    rows: [
      { re: /^❯$/, from: `${ALL_GROK}, the empty input box` },
      {
        re: /^(?:Enter:send {2}│ {2}Shift\+Enter\/Opt\+Enter:newline {2}│ {2})?Shift\+Tab:mode(?: {2}│ {2}Ctrl\+c:cancel)?(?: {2}│ {2}Ctrl\+b:send to bg)? {2}│ {2}Ctrl\+x:shortcuts$/,
        from: `${ALL_GROK}, the key footer`
      },
      { re: /^█$/, from: 'a/grok' },
      {
        re: /^[⠀-⣿] (?:Thinking|Waiting for response|Responding|Writing command|(?<x1>.+))… (?:\d+m)?[\d.]+s$/,
        from: `${ALL_GROK}, spinner, a task title shaped`
      },
      { re: /^◆ (?:Thought for [\d.]+s|Thinking…|Run (?<x1>.+))$/, from: 'a/grok adv1/grok' },
      { re: /^Worked for (?:\d+m)?\d+s$/, from: 'a/grok adv1/grok' },
      { re: /^\[stable\]$/, from: ALL_GROK },
      { re: /^[○◎◉] \d+ commands? still running · send a message to interrupt$/, from: 'a/grok adv1/grok' },
      { re: /^Update: v[\d.]+ available, press ctrl\+u to restart$/, from: 'a/grok' },
      { re: /^Switched to mode: (?:Plan|Auto|Always-Approve|Normal)$/, from: 'a/grok' },
      {
        re: /^Tip: Start Grok in a fresh worktree with `-w`; add `-r <session-id>` to resume an existing session there\.$/,
        from: 'adv1/grok'
      },
      { re: /^[⠀-⣿ ]*(?:New worktree|Resume session|Changelog|Quit)(?:\s{3,}ctrl\+[wrq])?$/, from: 'b/grok, the start screen' },
      { re: /^Help improve Grok\s{3,}\[Opt out\] \[Opt in\]$/, from: 'b/grok, the start screen' },
      {
        re: /^Off by default\. Opt-in to allow SpaceXAI to retain coding data, e\.g\., prompts, traces, & metrics,$/,
        from: 'b/grok, the start screen'
      },
      { re: /^for training and debugging purposes\. Change anytime via settings\.$/, from: 'b/grok, the start screen' },
      { re: /^Read Terms and Privacy Policy\.$/, from: 'b/grok, the start screen' }
    ]
  }
};

/** Every chrome `re` with the `d` flag, so its `x…` groups can be located. */
const COMPILED = new Map<Chrome, RegExp>();
function compiled(entry: Chrome): RegExp {
  let re = COMPILED.get(entry);
  if (re === undefined && entry.re !== undefined) {
    re = new RegExp(entry.re.source, entry.re.flags.includes('d') ? entry.re.flags : `${entry.re.flags}d`);
    COMPILED.set(entry, re);
  }
  return re as RegExp;
}

/** A word-aligned piece of a wrapped sentence. */
function isWrapPiece(sentence: string, body: string): boolean {
  if (body === '') return false;
  let at = sentence.indexOf(body);
  while (at >= 0) {
    const startOk = at === 0 || sentence[at - 1] === ' ';
    const end = at + body.length;
    const endOk = end === sentence.length || sentence[end] === ' ';
    if (startOk && endOk) return true;
    at = sentence.indexOf(body, at + 1);
  }
  return false;
}

interface ChromeHit {
  entry: Chrome;
  /** The kept body: the row with every `x…` group shaped. */
  kept: string;
  /** The `x…` groups' own text, as they stand in the body asked about. */
  groups: string[];
}

/** The agent's chrome entry that names this border-stripped body, if any. */
function chromeHit(agent: string, body: string): ChromeHit | null {
  const table = CHROME[agent];
  if (table === undefined) return null;
  for (const entry of table.rows) {
    if (entry.wrap !== undefined) {
      if (isWrapPiece(entry.wrap, body)) return { entry, kept: body, groups: [] };
      continue;
    }
    const m = compiled(entry).exec(body);
    if (m === null) continue;
    const spans: Array<[number, number]> = [];
    const groups: string[] = [];
    for (const [name, span] of Object.entries(m.indices?.groups ?? {})) {
      if (!name.startsWith('x') || span === undefined) continue;
      spans.push(span);
      groups.push(body.slice(span[0], span[1]));
    }
    spans.sort((a, b) => b[0] - a[0]);
    let kept = body;
    for (const [s, e] of spans) kept = kept.slice(0, s) + shape(kept.slice(s, e)) + kept.slice(e);
    return { entry, kept, groups };
  }
  return null;
}

/** The agent's side column at the end of a body, if it draws one there. */
function splitSide(agent: string, body: string): { main: string; side: string } {
  const re = CHROME[agent]?.side;
  if (re === undefined) return { main: body, side: '' };
  const m = re.exec(body);
  if (m === null || m.index === 0) return { main: body, side: '' };
  return { main: body.slice(0, m.index), side: body.slice(m.index) };
}

// ---------------------------------------------------------------------------
// The slots
// ---------------------------------------------------------------------------

interface Slots {
  /** The account's home as the passwd entry has it, and `HOME` when that differs. */
  homes: string[];
  /** Skill names to `skill-N`, longest first. */
  skills: Array<[string, string]>;
  /** MCP server names to `mcp-N`, longest first. */
  mcps: Array<[string, string]>;
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** A token that carries the scratch path, a wrapped fragment of it, or a piece of its session id. */
const SCRATCH_TOKEN =
  /\/private\/|\/tmp\/|claude-\d+|-Users-|scratchpad|(?:^|\/)p319\/|(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{8,}|\b[0-9a-f]{4,8}-[0-9a-f]{4}-/;
/** Tokens are runs of anything but space, box drawing, quotes and brackets. */
const TOKEN = /[^\s│┃║▕▌▏|"'`()[\]<>]+/g;
/** An e-mail address, and the parenthesised plan antigravity draws beside it. */
const ADDRESS_AND_PLAN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\s*\([^)]*\))?/g;

type Tally = Record<string, number>;
const bump = (t: Tally, k: string, n = 1): void => {
  t[k] = (t[k] ?? 0) + n;
};

/** Replace a slot, padding with spaces when the token sat in a padded column (a box or a sidebar). */
function padded(row: string, index: number, token: string, replacement: string): string {
  const after = row.slice(index + token.length);
  const pad = replacement.length < token.length && after.startsWith('  ') ? ' '.repeat(token.length - replacement.length) : '';
  return row.slice(0, index) + replacement + pad + after;
}

function slotRow(agent: string, row: string, slots: Slots, tally: Tally): string {
  let out = row;
  // The home directory, then any other home under /Users.
  for (const home of slots.homes) {
    if (home === '' || !out.includes(home)) continue;
    bump(tally, 'home');
    out = out.split(home).join('~');
  }
  if (/\/Users\/[^/\s]+/.test(out)) {
    bump(tally, 'home');
    out = out.replace(/\/Users\/[^/\s]+/g, '~');
  }
  // An address, and the plan beside it: blanks of the same width.
  out = out.replace(ADDRESS_AND_PLAN, (m) => {
    bump(tally, 'address');
    return ' '.repeat(m.length);
  });
  // The scratch path and every wrapped piece of it, one token at a time.
  for (;;) {
    let found: RegExpMatchArray | null = null;
    for (const m of out.matchAll(TOKEN)) {
      if (SCRATCH_TOKEN.test(m[0])) {
        found = m;
        break;
      }
    }
    if (found === null) break;
    bump(tally, 'path');
    const token = found[0];
    const branch = /\/work\/[A-Za-z0-9-]+(:[A-Za-z0-9._-]+)$/.exec(token)?.[1] ?? '';
    out = padded(out, found.index ?? 0, token, `/work/${agent}${branch}`);
  }
  // Skill and MCP names, whole words, longest first.
  for (const [name, slot] of [...slots.skills, ...slots.mcps]) {
    const re = new RegExp(`(?<![A-Za-z0-9_-])${escapeRe(name)}(?![A-Za-z0-9_-])`, 'g');
    if (re.test(out)) {
      bump(tally, slot.startsWith('skill') ? 'skill' : 'mcp');
      out = out.replace(re, slot);
    }
  }
  return out;
}

/** The skill and MCP names in the corpus, read at run time and written nowhere. */
function readNames(allText: string[], processComms: string[], homes: string[]): Slots {
  const skills = new Set<string>();
  const mcps = new Set<string>();
  for (const text of allText) {
    for (const m of text.matchAll(/skills\/([^/\s"']+)\/SKILL\.md/g)) skills.add(m[1] ?? '');
    for (const m of text.matchAll(/Skill conflict detected: "([^"]+)"/g)) skills.add(m[1] ?? '');
    for (const m of text.matchAll(/Skill command '\/([^']+)' was renamed to '\/([^']+)'/g)) {
      skills.add(m[1] ?? '');
      skills.add(m[2] ?? '');
    }
    // pi's banner lists every skill under `[Skills]`, comma separated, up to a blank row.
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if ((lines[i] ?? '').trim() !== '[Skills]') continue;
      for (let j = i + 1; j < lines.length && (lines[j] ?? '').trim() !== ''; j++) {
        for (const name of (lines[j] ?? '').split(',')) if (name.trim() !== '') skills.add(name.trim());
      }
    }
    // omp's MCP status names every server it connected, failed or is still connecting.
    for (const m of text.matchAll(/(?:Connected|Failed|Still connecting): ([^.\n[]+)/g)) {
      for (const name of (m[1] ?? '').split(',')) {
        const n = name.trim().replace(/…$/, '');
        if (n === '') continue;
        for (const part of n.split(':')) if (part.trim() !== '') mcps.add(part.trim());
      }
    }
    for (const m of text.matchAll(/^\s*(\S+) \[config:/gm)) mcps.add(m[1] ?? '');
  }
  for (const comm of processComms) {
    for (const tok of comm.split(/\s+/)) {
      const bare = tok.replace(/@.*$/, '').replace(/^.*\//, '');
      if (/mcp/i.test(bare) && bare.length >= 4 && bare.toLowerCase() !== 'mcp') mcps.add(bare);
    }
  }
  skills.delete('');
  mcps.delete('');
  const byLength = (a: string, b: string): number => b.length - a.length || a.localeCompare(b);
  const sk = [...skills].sort(byLength);
  const mc = [...mcps].filter((n) => !skills.has(n)).sort(byLength);
  return {
    homes,
    skills: sk.map((n, i) => [n, `skill-${i + 1}`]),
    mcps: mc.map((n, i) => [n, `mcp-${i + 1}`])
  };
}

// ---------------------------------------------------------------------------
// One row, one window
// ---------------------------------------------------------------------------

/** The pass over one row, right-trimmed after it (a blanked address leaves spaces). `tally` counts what was done, by class. */
export function redactRow(agent: string, raw: string, slots: Slots, tally: Tally): string {
  return redactRowUntrimmed(agent, raw, slots, tally).replace(/\s+$/, '');
}

function redactRowUntrimmed(agent: string, raw: string, slots: Slots, tally: Tally): string {
  const slotted = slotRow(agent, raw, slots, tally);
  const secret = redactText(slotted);
  if (secret !== slotted) bump(tally, 'redactText');
  const { lead, body, trail } = splitBorder(secret);
  if (!/\p{L}/u.test(body)) return secret;
  const { main, side } = splitSide(agent, body);
  if (!/\p{L}/u.test(main)) {
    // Only the side column carries letters: keep it if it is the agent's own.
    bump(tally, 'chrome-row');
    return lead + main + side + trail;
  }
  const hit = chromeHit(agent, main);
  if (hit !== null) {
    bump(tally, 'chrome-row');
    if (hit.groups.length > 0) bump(tally, 'x-group', hit.groups.length);
    return lead + hit.kept + side + trail;
  }
  bump(tally, 'shaped-row');
  return lead + shape(main) + side + trail;
}

/** Why a committed row is not allowed, or null. For `--check`. */
function rowFault(agent: string, row: string): string | null {
  const { body } = splitBorder(row);
  const { main, side } = splitSide(agent, body);
  if (side !== '' && UNSHAPED_LETTER.test(side) && !(CHROME[agent]?.side?.test(side) ?? false)) return 'side column';
  if (!UNSHAPED_LETTER.test(main)) return null;
  const hit = chromeHit(agent, main);
  if (hit === null) return 'a row with letters that no chrome entry names';
  for (const g of hit.groups) if (UNSHAPED_LETTER.test(g)) return 'an x-group that was not shaped';
  return null;
}

// ---------------------------------------------------------------------------
// The disclosure scan
// ---------------------------------------------------------------------------

/**
 * The account: its name and home from the passwd entry, which a scratch `HOME`
 * does not move, and `HOME` too when it differs.
 */
function account(): { user: string; homes: string[] } {
  const info = userInfo();
  return { user: info.username, homes: [...new Set([info.homedir, homedir()])].filter((h) => h.length > 1) };
}

/** Patterns that need nothing from the corpus. `--check` runs these. */
function staticDisclosures(): Array<[string, RegExp]> {
  const { user, homes } = account();
  const perHome: Array<[string, RegExp]> = [];
  for (const home of homes) {
    perHome.push(['flattened home', new RegExp(escapeRe(home.replace(/\//g, '-')))]);
    // The home SHAPED, which is what a home the slot missed looks like once its row is shaped.
    perHome.push(['shaped home', new RegExp(`${escapeRe(shape(home))}(?![A-Za-z0-9])`)]);
  }
  return [
    ...perHome,
    ['address', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
    ['/Users/', /\/Users\//],
    ['/private/', /\/private\//],
    ['/tmp/', /\/tmp\//],
    ['account name', new RegExp(`(?<![A-Za-z0-9])${escapeRe(user)}(?![A-Za-z0-9])`)],
    ['scratchpad', /scratchpad/i],
    ['uuid', /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i],
    ['uuid piece', /\b[0-9a-f]{8}-[0-9a-f]{4}\b/i],
    ['long mixed hex', /(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])\b[0-9a-f]{12,}\b/],
    ['model', /\b(?:Opus|Sonnet|Haiku|Composer|Gemini|Grok|Flash) \d|deepseek|DeepSeek|\bgpt-\d|\bGPT-\d|astra/],
    ['plan', /Claude (?:Max|Pro)\b|AI (?:Ultra|Pro)\b|weekly limit|usage limit/]
  ];
}

interface Scanner {
  (rows: readonly string[]): string | null;
}

/**
 * `shapedPaths` are the scratch-path tokens of the raw captures, SHAPED: what a
 * path the slot missed looks like once its row is shaped, digits of the
 * session id and all. Read at run time from the corpus and written nowhere.
 */
function makeScanner(slots: Slots | null, typed: string[], shapedPaths: string[] = []): Scanner {
  const patterns = staticDisclosures();
  const names = slots === null ? [] : [...slots.skills, ...slots.mcps].map(([n]) => n);
  const nameRes = names.map((n) => [n, new RegExp(`(?<![A-Za-z0-9_-])${escapeRe(n)}(?![A-Za-z0-9_-])`)] as const);
  const RUN = 16;
  const runs = new Set<string>();
  for (const t of typed) {
    const flat = t.replace(/\s+/g, ' ');
    for (let i = 0; i + RUN <= flat.length; i++) runs.add(flat.slice(i, i + RUN));
  }
  return (rows) => {
    for (const row of rows) {
      for (const [name, re] of patterns) if (re.test(row)) return name;
      for (const p of shapedPaths) if (row.includes(p)) return 'a shaped scratch path';
      for (const [, re] of nameRes) if (re.test(row)) return 'a skill or MCP name';
      if (runs.size > 0) {
        const flat = row.replace(/\s+/g, ' ');
        for (let i = 0; i + RUN <= flat.length; i++) if (runs.has(flat.slice(i, i + RUN))) return 'a typed prompt';
      }
    }
    return null;
  };
}

// ---------------------------------------------------------------------------
// The named fixtures
// ---------------------------------------------------------------------------

interface FixtureSource {
  name: string;
  agent: string;
  rec: string;
  /** The instance, by its name in `corpus.QUESTIONS`. */
  question: string;
  /** Which capture: the last before the answering key, the first after it, or the first with qwen's scrollbar. */
  pick: 'last-question' | 'first-after' | 'first-with-scrollbar';
  /**
   * What the raw screen must read at HEAD, so a wrong pick is refused. The fix
   * round (SPEC §12.9) removed cursor's, opencode's and antigravity's shapes,
   * so their question screens read what the parent reads: false, except
   * antigravity's numbered permission, which the numbered verdict reads.
   */
  head: boolean;
}

/** SPEC §2.4, the nine. */
export const NAMED_FIXTURES: readonly FixtureSource[] = [
  { name: 'claude-trust-2-1-280.txt', agent: 'claude', rec: 'a/claude', question: 'folder trust (2.1.280)', pick: 'last-question', head: true },
  { name: 'cursor-trust-gate.txt', agent: 'cursor', rec: 'b/cursor', question: 'workspace trust', pick: 'last-question', head: false },
  { name: 'cursor-trust-answered.txt', agent: 'cursor', rec: 'a/cursor', question: 'workspace trust', pick: 'first-after', head: false },
  { name: 'cursor-run-permission.txt', agent: 'cursor', rec: 'a/cursor', question: 'run permission 1', pick: 'last-question', head: false },
  { name: 'qwen-run-permission.txt', agent: 'qwen', rec: 'a/qwen', question: 'run permission 1 (Ask mode)', pick: 'last-question', head: true },
  {
    name: 'qwen-run-permission-scrollbar.txt',
    agent: 'qwen',
    rec: 'a/qwen',
    question: 'run permission 2 (Ask mode)',
    pick: 'first-with-scrollbar',
    head: true
  },
  { name: 'opencode-permission.txt', agent: 'opencode', rec: 'a/opencode', question: 'an outside folder', pick: 'last-question', head: false },
  { name: 'antigravity-trust-gate.txt', agent: 'antigravity', rec: 'a/antigravity', question: 'folder trust', pick: 'last-question', head: false },
  {
    name: 'antigravity-run-permission.txt',
    agent: 'antigravity',
    rec: 'a/antigravity',
    question: 'run permission 1',
    pick: 'last-question',
    head: true
  }
];

// ---------------------------------------------------------------------------
// --make
// ---------------------------------------------------------------------------

interface Line {
  id: string;
  label: string;
  verdicts: { parent: boolean; head: boolean };
  rows: string[];
}

interface WindowMeta {
  label: string;
  instance?: number;
  captures: number;
  first: number;
}

const round2 = (x: number): number => Math.round(x * 100) / 100;
const fileStem = (recId: string): string => recId.replace('/', '-').replace(/^adv2-pi-.*$/, 'adv2-pi');

function make(): void {
  const check = corpus.verifyCorpus();
  if (!check.ok) {
    throw new Error(`the corpus is not the pinned one: missing ${check.missing.length}, moved ${check.moved.length}`);
  }
  detectShapesOrRefuse();
  const { streams, instances } = corpus.deriveLabels();

  // Names, read from every capture and every recorded process table.
  const allText: string[] = [];
  for (const s of streams.values()) for (const c of s.captures) allText.push(c.text);
  for (const s of corpus.SINGLE_SCREENS) allText.push(corpus.loadSingleScreen(s.id));
  const comms: string[] = [];
  for (const rec of corpus.RECORDINGS) {
    for (const sample of corpus.loadProcessSamples(rec.id) ?? []) for (const r of sample.rows) comms.push(String(r[r.length - 1]));
  }
  const slots = readNames(allText, comms, account().homes);
  const scratchTokens = new Set<string>();
  for (const text of allText) for (const m of text.matchAll(TOKEN)) if (m[0].length >= 12 && SCRATCH_TOKEN.test(m[0])) scratchTokens.add(shape(m[0]));
  const scan = makeScanner(slots, corpus.typedTextsForScan(), [...scratchTokens]);

  const byFile = new Map<string, Line[]>();
  const windows: Record<string, WindowMeta> = {};
  const perRecording: Record<string, Record<string, number>> = {};
  const byClass: Record<string, Tally> = {};
  const conflicts: string[] = [];

  const run = (recId: string, agent: string, items: Array<{ text: string; label: string; instance: number; rel: number }>): void => {
    const stats: Record<string, number> = { captures: items.length, distinctRaw: 0, dropped: 0, droppedVerdict: 0, droppedDisclosure: 0, collapsed: 0, kept: 0 };
    const tally: Tally = {};
    const stem = fileStem(recId);
    const lines = byFile.get(stem) ?? [];
    byFile.set(stem, lines);
    const rawSeen = new Map<string, string | null>(); // raw key + label -> committed id or null when dropped
    const keptByRows = new Map<string, Line>();
    for (const line of lines) keptByRows.set(line.rows.join('\n'), line);
    for (const item of items) {
      const raw = windowOf(item.text);
      const rawKey = `${item.label}\n${raw.join('\n')}`;
      if (rawSeen.has(rawKey)) {
        const id = rawSeen.get(rawKey);
        if (id !== null && id !== undefined) windows[id]!.captures++;
        continue;
      }
      stats.distinctRaw++;
      const rawText = raw.join('\n');
      const rawParent = parentVerdict(rawText);
      if (screen.detectDialog(rawText) !== rawParent) throw new Error(`${recId}: the shipping detectDialog left the parent's verdict`);
      const rawHead = headVerdict(agent, rawText);
      const red = raw.map((r) => redactRow(agent, r, slots, tally));
      const redText = red.join('\n');
      if (parentVerdict(redText) !== rawParent || headVerdict(agent, redText) !== rawHead) {
        stats.dropped++;
        stats.droppedVerdict++;
        rawSeen.set(rawKey, null);
        continue;
      }
      if (windowOf(redText).length !== raw.length) {
        stats.dropped++;
        stats.droppedVerdict++;
        rawSeen.set(rawKey, null);
        continue;
      }
      const why = scan(red);
      if (why !== null) {
        stats.dropped++;
        stats.droppedDisclosure++;
        bump(tally, `dropped: ${why}`);
        rawSeen.set(rawKey, null);
        continue;
      }
      const existing = keptByRows.get(redText);
      if (existing !== undefined) {
        if (existing.label !== item.label) conflicts.push(`${existing.id} is both ${existing.label} and ${item.label}`);
        stats.collapsed++;
        windows[existing.id]!.captures++;
        rawSeen.set(rawKey, existing.id);
        continue;
      }
      const id = `${stem}-${String(lines.length + 1).padStart(4, '0')}`;
      const line: Line = { id, label: item.label, verdicts: { parent: rawParent, head: rawHead }, rows: red };
      lines.push(line);
      keptByRows.set(redText, line);
      windows[id] = { label: item.label, ...(item.instance >= 0 ? { instance: item.instance } : {}), captures: 1, first: round2(item.rel) };
      rawSeen.set(rawKey, id);
      stats.kept++;
    }
    perRecording[recId] = stats;
    byClass[recId] = tally;
  };

  for (const rec of corpus.RECORDINGS) {
    const s = streams.get(rec.id)!;
    run(
      rec.id,
      rec.agent,
      s.captures.map((c: { t: number; text: string }, i: number) => ({ text: c.text, label: s.labels[i], instance: s.instanceOf[i], rel: (c.t - s.t0) / 1000 }))
    );
  }
  for (const single of corpus.SINGLE_SCREENS) {
    run(single.id, single.agent, [{ text: corpus.loadSingleScreen(single.id), label: 'not-question', instance: -1, rel: 0 }]);
  }
  if (conflicts.length > 0) throw new Error(`a redacted window carries two labels: ${conflicts.join('; ')}`);

  const counts = { total: 0, question: 0, answering: 0, 'not-question': 0 } as Record<string, number>;
  for (const s of streams.values()) for (const l of s.labels) {
    counts.total!++;
    counts[l] = (counts[l] ?? 0) + 1;
  }
  console.log('screens --make: the corpus matched every pin; HEAD read through the shipping detectShapes');
  console.log(`captures ${counts.total}: question ${counts.question}, answering ${counts.answering}, not-question ${counts['not-question']}`);
  // The report, before the fixtures so a refusal there still shows the counts: counts only.
  const total: Tally = {};
  for (const t of Object.values(byClass)) for (const [k, v] of Object.entries(t)) bump(total, k, v);
  console.log(`names read at run time: ${slots.skills.length} skill names, ${slots.mcps.length} MCP names (never printed)`);
  console.log('recording            captures  distinct  kept  collapsed  dropped(verdict/disclosure)');
  for (const [rec, s] of Object.entries(perRecording)) {
    console.log(
      `${rec.padEnd(20)} ${String(s.captures).padStart(8)}  ${String(s.distinctRaw).padStart(8)}  ${String(s.kept).padStart(4)}  ${String(s.collapsed).padStart(9)}  ${s.dropped} (${s.droppedVerdict}/${s.droppedDisclosure})`
    );
  }
  console.log('redaction, per recording and class (rows or slots touched, over distinct raw windows):');
  for (const [rec, t] of Object.entries(byClass)) {
    console.log(`  ${rec.padEnd(18)} ${Object.entries(t).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
  }
  console.log(`  ${'total'.padEnd(18)} ${Object.entries(total).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
  const kept = Object.values(perRecording).reduce((a, s) => a + s.kept, 0);
  console.log(`windows committed: ${kept}`);

  // The named fixtures, full screens: every one checked before any is written.
  const fixtures: Record<string, unknown> = {};
  const fixtureTally: Tally = {};
  const fixtureText = new Map<string, string>();
  const refused: string[] = [];
  for (const f of NAMED_FIXTURES) {
    const s = streams.get(f.rec)!;
    const index = corpus.QUESTIONS.findIndex((q: { rec: string; q: string }) => q.rec === f.rec && q.q === f.question);
    if (index < 0) throw new Error(`${f.name}: no question ${f.question}`);
    const idx: number[] = [];
    s.captures.forEach((_c: unknown, i: number) => {
      if (s.instanceOf[i] === index && s.labels[i] === 'question') idx.push(i);
    });
    let at: number;
    if (f.pick === 'last-question') at = idx[idx.length - 1]!;
    else if (f.pick === 'first-after') at = idx[idx.length - 1]! + 1;
    else at = idx.find((i) => /\s█\s*$/m.test(s.captures[i].text)) ?? -1;
    if (at === undefined || at < 0 || at >= s.captures.length) throw new Error(`${f.name}: no capture to take`);
    const text: string = s.captures[at].text;
    const rawRows = screenRows(text);
    const rawText = rawRows.join('\n');
    const rawParent = parentVerdict(rawText);
    const rawHead = headVerdict(f.agent, rawText);
    if (rawHead !== f.head) refused.push(`${f.name}: the raw screen reads ${rawHead} at HEAD, not ${f.head}`);
    const red = rawRows.map((r) => redactRow(f.agent, r, slots, fixtureTally));
    const redText = red.join('\n');
    if (parentVerdict(redText) !== rawParent || headVerdict(f.agent, redText) !== rawHead) {
      refused.push(`${f.name}: redaction moved a verdict`);
    }
    const why = scan(red);
    if (why !== null) refused.push(`${f.name}: the disclosure scan found ${why}`);
    fixtureText.set(f.name, `${redText}\n`);
    fixtures[f.name] = {
      agent: f.agent,
      recording: f.rec,
      question: f.question,
      at: round2((s.captures[at].t - s.t0) / 1000),
      label: s.labels[at],
      verdicts: { parent: rawParent, head: rawHead }
    };
  }

  console.log(`  ${'fixtures'.padEnd(18)} ${Object.entries(fixtureTally).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (refused.length > 0) throw new Error(`the named fixtures were refused, nothing written: ${refused.join('; ')}`);

  // Write.
  for (const [name, text] of fixtureText) writeFileSync(join(FIXTURES_DIR, name), text);
  console.log(`named fixtures written: ${fixtureText.size}`);
  mkdirSync(QUESTIONS_DIR, { recursive: true });
  for (const f of readdirSync(QUESTIONS_DIR)) if (f.endsWith('.jsonl') && !byFile.has(f.replace(/\.jsonl$/, ''))) throw new Error(`stale ${f}`);
  for (const [stem, lines] of byFile) {
    if (lines.length === 0) continue;
    writeFileSync(join(QUESTIONS_DIR, `${stem}.jsonl`), lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  }
  const labels = {
    phase: 321,
    derivation:
      'By hand, from the capture streams and the key events, never from a detector (build/p321/corpus.mjs, deriveLabels). question: from the first capture carrying the question\'s live marks to its answering key. answering: from the key while the live marks are still drawn. not-question: every other capture. Times are seconds from each stream\'s first capture.',
    captures: counts,
    instances,
    noQuestion: corpus.NO_QUESTION,
    notMeasurable: corpus.NOT_MEASURABLE,
    windows,
    fixtures,
    pass: perRecording
  };
  writeFileSync(LABELS_FILE, `${JSON.stringify(labels, null, 2)}\n`);
}

// ---------------------------------------------------------------------------
// --check and --matrix
// ---------------------------------------------------------------------------

interface Committed {
  file: string;
  agent: string;
  line: Line;
}

function readCommitted(): Committed[] {
  const out: Committed[] = [];
  for (const f of readdirSync(QUESTIONS_DIR).filter((n) => n.endsWith('.jsonl')).sort()) {
    const agent = f.replace(/\.jsonl$/, '').split('-').slice(1).join('-');
    const text = readFileSync(join(QUESTIONS_DIR, f), 'utf8');
    for (const l of text.split('\n')) if (l !== '') out.push({ file: f, agent, line: JSON.parse(l) as Line });
  }
  return out;
}

/** A control byte other than the newline, or a C1 control. */
const CONTROL = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/;

function check(): number {
  const faults: string[] = [];
  const fault = (s: string): void => {
    faults.push(s);
  };
  if (!existsSync(LABELS_FILE)) {
    console.log('screens --check: build/fixtures/questions/labels.json is missing');
    return 1;
  }
  const labels = JSON.parse(readFileSync(LABELS_FILE, 'utf8')) as {
    captures: Record<string, number>;
    instances: Array<{ recording: string; raisable: boolean; holes: number }>;
    windows: Record<string, WindowMeta>;
    fixtures: Record<string, { agent: string; verdicts: { parent: boolean; head: boolean } }>;
  };
  const scan = makeScanner(null, []);
  const committed = readCommitted();
  const seen = new Map<string, string>();
  const ids = new Set<string>();
  for (const { file, agent, line } of committed) {
    const where = `${file} ${line.id}`;
    if (ids.has(line.id)) fault(`${where}: the id is used twice`);
    ids.add(line.id);
    if (!['question', 'answering', 'not-question'].includes(line.label)) fault(`${where}: label ${line.label}`);
    if (labels.windows[line.id]?.label !== line.label) fault(`${where}: labels.json disagrees on the label`);
    // A window may be EMPTY: the captures taken before the agent drew anything.
    if (!Array.isArray(line.rows) || line.rows.length > WINDOW_ROWS) fault(`${where}: not a window of at most ${WINDOW_ROWS} rows`);
    if (line.rows.length > 0 && (line.rows[line.rows.length - 1] ?? '').trim() === '') fault(`${where}: the window ends blank`);
    line.rows.forEach((row, i) => {
      if (CONTROL.test(row)) fault(`${where} row ${i}: a control byte`);
      const why = rowFault(agent, row);
      if (why !== null) fault(`${where} row ${i}: ${why}`);
    });
    const disclosure = scan(line.rows);
    if (disclosure !== null) fault(`${where}: the disclosure scan found ${disclosure}`);
    const text = line.rows.join('\n');
    if (seen.has(`${file}\n${text}`)) fault(`${where}: the same window as ${seen.get(`${file}\n${text}`)}`);
    seen.set(`${file}\n${text}`, line.id);
    const p = parentVerdict(text);
    if (screen.detectDialog(text) !== p) fault(`${where}: the shipping detectDialog left the parent's verdict`);
    if (p !== line.verdicts.parent) fault(`${where}: parent verdict ${p}, pinned ${line.verdicts.parent}`);
    const h = headVerdict(agent, text);
    if (h !== line.verdicts.head) fault(`${where}: HEAD verdict ${h}, pinned ${line.verdicts.head}`);
  }
  for (const id of Object.keys(labels.windows)) if (!ids.has(id)) fault(`labels.json names ${id}, which no file holds`);
  if (labels.instances.length !== 17) fault(`labels.json holds ${labels.instances.length} instances, not 17`);
  const raisable = labels.instances.filter((i) => i.raisable).length;
  if (raisable !== 15) fault(`labels.json marks ${raisable} instances raisable, not 15`);
  const adv1 = labels.instances.filter((i) => i.recording === 'adv1/cursor');
  if (adv1.length !== 2 || adv1.some((i) => i.raisable)) fault('the adv1/cursor pair is not both unraisable');
  if (labels.instances.some((i) => i.holes !== 0)) fault('an instance has a capture without its live marks inside its question span');
  const sum = (labels.captures.question ?? 0) + (labels.captures.answering ?? 0) + (labels.captures['not-question'] ?? 0);
  if (sum !== labels.captures.total) fault('labels.json capture counts do not add up');

  for (const f of NAMED_FIXTURES) {
    const path = join(FIXTURES_DIR, f.name);
    if (!existsSync(path)) {
      fault(`${f.name}: missing`);
      continue;
    }
    const text = readFileSync(path, 'utf8');
    if (CONTROL.test(text)) fault(`${f.name}: a control byte`);
    const rows = screenRows(text);
    rows.forEach((row, i) => {
      const why = rowFault(f.agent, row);
      if (why !== null) fault(`${f.name} row ${i}: ${why}`);
    });
    const disclosure = scan(rows);
    if (disclosure !== null) fault(`${f.name}: the disclosure scan found ${disclosure}`);
    const pinned = labels.fixtures[f.name]?.verdicts;
    const body = rows.join('\n');
    if (pinned === undefined) fault(`${f.name}: labels.json pins no verdict`);
    else {
      if (parentVerdict(body) !== pinned.parent) fault(`${f.name}: parent verdict moved`);
      if (headVerdict(f.agent, body) !== pinned.head) fault(`${f.name}: HEAD verdict moved`);
    }
    if (headVerdict(f.agent, body) !== f.head) fault(`${f.name}: reads ${!f.head} at HEAD`);
  }

  // No control byte in any file of this pass.
  const files = [
    ...OWN_SOURCES.map((p) => join(ROOT, p)),
    ...readdirSync(QUESTIONS_DIR).map((n) => join(QUESTIONS_DIR, n)),
    ...NAMED_FIXTURES.map((f) => join(FIXTURES_DIR, f.name))
  ];
  for (const path of files) if (existsSync(path) && CONTROL.test(readFileSync(path, 'utf8'))) fault(`${path.slice(ROOT.length + 1)}: a control byte`);

  const windowsCount = committed.length;
  if (faults.length > 0) {
    console.log(`screens --check: FAILED, ${faults.length} fault(s) over ${windowsCount} windows and ${NAMED_FIXTURES.length} fixtures`);
    for (const f of faults.slice(0, 60)) console.log(`  ${f}`);
    if (faults.length > 60) console.log(`  … and ${faults.length - 60} more`);
    return 1;
  }
  console.log(
    `screens --check: ok. ${windowsCount} windows in ${new Set(committed.map((c) => c.file)).size} files and ${NAMED_FIXTURES.length} named fixtures: every row chrome or shaped, no disclosure, no control byte, verdicts as pinned, labels agree`
  );
  return 0;
}

/** Agents whose compiled row names a shape, as the registry reads now. */
function shapedAgents(agents: string[]): Set<string> {
  return new Set(agents.filter((a) => shapesFor(a).length > 0));
}

function matrix(all: boolean): number {
  const committed = readCommitted();
  const labels = JSON.parse(readFileSync(LABELS_FILE, 'utf8')) as { windows: Record<string, WindowMeta> };
  const agents = [...new Set(committed.map((c) => c.agent))].sort();
  const shaped = shapedAgents(agents);
  const detect = detectShapesOrRefuse();
  const problems: string[] = [];
  console.log('screens --matrix: parent (the literal copy at ecb6997a) against HEAD (numbered OR the agent\'s shapes), per window');
  console.log('file                 label         windows  parent-true  head-true  head-only  parent-only');
  const byFile = new Map<string, Committed[]>();
  for (const c of committed) byFile.set(c.file, [...(byFile.get(c.file) ?? []), c]);
  const parentFalsePositives: string[] = [];
  const headOnlyByFile: string[] = [];
  for (const [file, rows] of byFile) {
    for (const label of ['question', 'answering', 'not-question']) {
      const set = rows.filter((c) => c.line.label === label);
      if (set.length === 0) continue;
      let p = 0;
      let h = 0;
      let ho = 0;
      let po = 0;
      for (const c of set) {
        const text = c.line.rows.join('\n');
        const pv = parentVerdict(text);
        const hv = headVerdict(c.agent, text);
        if (pv) p++;
        if (hv) h++;
        if (hv && !pv) {
          ho++;
          headOnlyByFile.push(`${c.line.id} (${label})`);
        }
        if (pv && !hv) po++;
        if (label === 'not-question' && pv) parentFalsePositives.push(c.line.id);
        if (label === 'not-question' && hv && !pv) problems.push(`${c.line.id}: a not-question window the parent reads false reads true at HEAD`);
        if (pv && !hv) problems.push(`${c.line.id}: the parent reads true and HEAD false, below the floor`);
        if (!shaped.has(c.agent) && hv !== pv) problems.push(`${c.line.id}: ${c.agent} names no shape, yet HEAD differs from the parent`);
        if (label === 'question' && shaped.has(c.agent) && !hv) problems.push(`${c.line.id}: a question window of ${c.agent} reads false at HEAD`);
      }
      console.log(
        `${file.padEnd(20)} ${label.padEnd(13)} ${String(set.length).padStart(7)}  ${String(p).padStart(11)}  ${String(h).padStart(9)}  ${String(ho).padStart(9)}  ${String(po).padStart(11)}`
      );
    }
  }
  console.log(`parent false positives (not-question, the parent reads true), which HEAD must equal: ${parentFalsePositives.length}`);
  for (const id of parentFalsePositives) console.log(`  ${id} first at +${labels.windows[id]?.first}`);
  console.log(`windows HEAD reads true and the parent false: ${headOnlyByFile.length}`);
  for (const id of headOnlyByFile) console.log(`  ${id}`);
  if (all) {
    console.log('every window (id, label, parent, HEAD):');
    for (const c of committed) {
      const text = c.line.rows.join('\n');
      console.log(`  ${c.line.id.padEnd(20)} ${c.line.label.padEnd(13)} ${String(parentVerdict(text)).padEnd(5)} ${headVerdict(c.agent, text)}`);
    }
  }

  // Every shape over every other agent's windows.
  const ids = Object.keys((screen as unknown as { DIALOG_SHAPES?: Record<string, unknown> }).DIALOG_SHAPES ?? {}) as DialogShapeId[];
  console.log('shape over every OTHER agent\'s committed windows (hits / windows):');
  for (const id of ids) {
    let hits = 0;
    let n = 0;
    const owner = agents.filter((a) => shapesFor(a).includes(id));
    for (const c of committed) {
      if (owner.includes(c.agent)) continue;
      n++;
      if (detect(c.line.rows.join('\n'), [id])) hits++;
    }
    console.log(`  ${id.padEnd(24)} ${hits} / ${n}`);
  }
  console.log('named fixtures (parent / HEAD):');
  for (const f of readdirSync(FIXTURES_DIR).filter((n) => n.endsWith('.txt')).sort()) {
    const text = readFileSync(join(FIXTURES_DIR, f), 'utf8');
    const agent = NAMED_FIXTURES.find((x) => x.name === f)?.agent ?? f.split('-')[0] ?? '';
    console.log(`  ${f.padEnd(36)} ${String(parentVerdict(text)).padEnd(5)} / ${headVerdict(agent, text)}`);
  }
  if (problems.length > 0) {
    console.log(`REQUIRED (SPEC §9.2) NOT MET, ${problems.length}:`);
    for (const p of problems.slice(0, 60)) console.log(`  ${p}`);
    return 1;
  }
  console.log('SPEC §9.2 over the committed windows: every question window of a shaped agent reads true at HEAD; no not-question window the parent reads false reads true at HEAD; HEAD never below the parent; every unshaped agent equal to the parent');
  return 0;
}

// ---------------------------------------------------------------------------

const mode = process.argv[2];
if (mode === '--make') {
  make();
} else if (mode === '--check') {
  process.exitCode = check();
} else if (mode === '--matrix') {
  process.exitCode = matrix(process.argv.includes('--all'));
} else {
  console.log('usage: screens.mts --make | --check | --matrix [--all]');
  process.exitCode = 2;
}
