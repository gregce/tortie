/**
 * THE QUESTIONS THE PHONE MAY PRESS, COMPILED (Phase 318, build/p318/SPEC.md
 * §5.4.3, D11, D12; §Revision R4, R20, R21, R22, R25, R27; research 135 §2.2).
 *
 * A press types ONE DIGIT into a running agent from outside the Mac, so it is
 * offered only on a dialog whose layout was measured on the real agent and is
 * written here as a constant no configuration reaches (refusal 5). Two shapes,
 * each measured by the capture step on 2026-10-02
 * (build/fixtures/reply/real-captures.json):
 *
 *  - `claude-permission`: Claude Code 2.1.287's numbered BASH permission
 *    prompt. Its question row is `Do you want to proceed?`, then `1. Yes`, a
 *    widening option worded by Claude's own suggestion, `Yes, and switch to
 *    auto mode`, and `No`. The rows (and so the screen's mark) are the SAME for
 *    every command in one folder, so the command is the HOOK's and the identity
 *    is the question id: the shape needs a `Bash` `PermissionRequest` to have
 *    named this wait (`hookBash` non-null). Claude's Edit and Write prompts
 *    were not measured and are not admitted (research 135 §7 ruling 1).
 *  - `codex-command-approval`: Codex 0.160.0's command approval, its question
 *    `Would you like to run the following command?` read from the SCREEN
 *    (§Revision R21: past four inked rows above the options the shipping
 *    detector answers no question), option 1 `Yes, proceed`, the last `No, and
 *    tell Codex`, and its `$` line.
 *
 * "SAYS WHAT WILL RUN" (D12). An allow option, and under his ruling 2 ("Yes,
 * allow them") a widening one, may be pressed only when what will run is said
 * whole; otherwise only the options that say No. For Claude that is the hook's
 * question equal to `Bash ` and the command byte for byte (./hook-says.ts). For
 * Codex it is the ONE `$` row of the dialog with every row under it blank
 * (§Revision R20): Codex draws a command's later lines unprefixed and a blank
 * line as a blank row, so the first rule written ("one `$ ` row, the next row
 * blank") read `echo ok`, `ls` and `ls` on three real approvals whose Yes would
 * have run something longer.
 *
 * Every other screen answers null: Claude's trust gates, theme picker, API-key
 * list and first-run notes, its Edit and Write prompts, Codex's sign-in list,
 * update prompt and trust gate, any non-agent program's numbered dialog, and a
 * resized Claude dialog whose hook words were cleared.
 *
 * PURE. It reads only its input, imports two leaves and two types, and logs
 * nothing.
 */

import type { DialogRows } from '../activity/screen';
import { QUESTION_MAX } from '../activity/question';
import { redactText } from '../overview/redact';
import { hidesCharacters } from './hook-says';
import type { HookBash } from './question-id';

/** The two measured shapes. */
export type PressShapeId = 'claude-permission' | 'codex-command-approval';

/** What one screen says a press may do. */
export interface PressReading {
  readonly shape: PressShapeId;
  /** The fresh rows' own markers, `1` to `k`, consecutive. */
  readonly markers: readonly string[];
  /** The markers whose option text starts `No`. */
  readonly deny: readonly string[];
  /** What will run, said whole, or null. */
  readonly runs: string | null;
  /** The command to draw, when the question does not say it (Codex), else null. */
  readonly command: string | null;
}

/** The input one reading is made of. */
export interface PressInput {
  readonly agent: string;
  /** The NORMALIZED plain capture (`normalizeCapture`), the screen the detector was measured on. */
  readonly screen: string;
  /** `detectDialogRows` over that same screen. */
  readonly rows: DialogRows;
  /** The hook's composed question that belongs to the current question id, or null. */
  readonly hookAsk: string | null;
  /** Whether that hook was a Bash `PermissionRequest` that says its command whole. */
  readonly hookBash: HookBash | null;
}

/** What every shape needs: 2 to 9 options, numbered `1` to `k` in drawn order, each one character. */
const OPTIONS = Object.freeze({ min: 2, max: 9 });

/** Claude Code's Bash permission prompt, as 2.1.287 draws it. */
const CLAUDE_PERMISSION = Object.freeze({
  shape: 'claude-permission' as const,
  agent: 'claude',
  /** `rows.question` starts with this. */
  questionStarts: 'Do you want to'
});

/** Codex's command approval, as 0.160.0 draws it. */
const CODEX_COMMAND_APPROVAL = Object.freeze({
  shape: 'codex-command-approval' as const,
  agent: 'codex',
  /** The one row on the screen, trimmed, that is the question. */
  question: 'Would you like to run the following command?',
  /** Option 1's text starts with this. */
  firstStarts: 'Yes, proceed',
  /** The last option's text starts with this. */
  lastStarts: 'No, and tell Codex',
  /** The command row's prefix: the row's trimmed text starts `$`, and then must start this. */
  commandRow: '$',
  commandPrefix: '$ ',
  /** A command drawn cut. */
  cut: '\u2026'
});

/** An option whose text says No, as a word: `No` and `No, and …`, never `Not now`. */
const SAYS_NO = /^No(?![A-Za-z])/;

/** Option 1's row, in the shape of the verdict's own `OPT1` (src/main/activity/screen.ts). */
const OPTION_ONE_ROW = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}1[.)]\s+\S/;

/** The markers when they are exactly `1` to `k`, 2 ≤ k ≤ 9, in drawn order; else null. */
function consecutiveMarkers(rows: DialogRows): string[] | null {
  if (!rows.atChoice) return null;
  const k = rows.options.length;
  if (k < OPTIONS.min || k > OPTIONS.max) return null;
  const markers: string[] = [];
  for (let i = 0; i < k; i += 1) {
    const marker = rows.options[i]?.marker;
    if (marker !== String(i + 1)) return null;
    markers.push(marker);
  }
  return markers;
}

/** Claude Code's Bash permission prompt, or null. */
function readClaude(input: PressInput, markers: readonly string[]): PressReading | null {
  if (input.agent !== CLAUDE_PERMISSION.agent) return null;
  // A Bash `PermissionRequest` named this wait (D7, D11): `hookBash` is set
  // only by ./hook-says.ts, and only for a body whose `tool_name` is `Bash`.
  if (input.hookBash === null || input.hookAsk === null) return null;
  const question = input.rows.question;
  if (question === null || !question.startsWith(CLAUDE_PERMISSION.questionStarts)) return null;
  const deny = markers.filter((_, i) => SAYS_NO.test(input.rows.options[i]?.text ?? ''));
  return Object.freeze({
    shape: CLAUDE_PERMISSION.shape,
    markers: Object.freeze([...markers]),
    deny: Object.freeze(deny),
    runs: input.hookBash === 'whole' ? input.hookAsk : null,
    command: null
  });
}

/**
 * Codex's `$` line, when it says the command whole: between the question row
 * and option 1's row, EXACTLY ONE row whose trimmed text starts `$`, that row
 * starting `$ `, and every row after it to option 1's row blank; the command
 * non-empty, under `QUESTION_MAX - 1`, not drawn cut, holding no hidden
 * character, and unchanged by redaction. Otherwise null.
 */
function codexCommand(lines: readonly string[], questionRow: number, optionRow: number): string | null {
  let dollarRow = -1;
  for (let i = questionRow + 1; i < optionRow; i += 1) {
    if ((lines[i] ?? '').trim().startsWith(CODEX_COMMAND_APPROVAL.commandRow)) {
      if (dollarRow !== -1) return null;
      dollarRow = i;
    }
  }
  if (dollarRow === -1) return null;
  const drawn = (lines[dollarRow] ?? '').trim();
  if (!drawn.startsWith(CODEX_COMMAND_APPROVAL.commandPrefix)) return null;
  for (let i = dollarRow + 1; i < optionRow; i += 1) {
    if ((lines[i] ?? '').trim().length > 0) return null;
  }
  const command = drawn.substring(CODEX_COMMAND_APPROVAL.commandPrefix.length);
  if (command.length === 0 || command.length >= QUESTION_MAX - 1) return null;
  if (command.includes(CODEX_COMMAND_APPROVAL.cut)) return null;
  if (hidesCharacters(command)) return null;
  if (redactText(command) !== command) return null;
  return command;
}

/** Codex's command approval, or null. */
function readCodex(input: PressInput, markers: readonly string[]): PressReading | null {
  if (input.agent !== CODEX_COMMAND_APPROVAL.agent) return null;
  const options = input.rows.options;
  if (!(options[0]?.text ?? '').startsWith(CODEX_COMMAND_APPROVAL.firstStarts)) return null;
  if (!(options[options.length - 1]?.text ?? '').startsWith(CODEX_COMMAND_APPROVAL.lastStarts)) return null;
  const lines = input.screen.split('\n');
  // EXACTLY ONE question row on the whole screen: a command that draws the
  // question again reads no shape at all (§Revision R20, the spoofed approval).
  let questionRow = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if ((lines[i] ?? '').trim() === CODEX_COMMAND_APPROVAL.question) {
      if (questionRow !== -1) return null;
      questionRow = i;
    }
  }
  if (questionRow === -1) return null;
  // Option 1's row: the LOWEST row the verdict's own shape reads as option 1,
  // which is where `detectDialogRows` starts the choice it carried.
  let optionRow = -1;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (OPTION_ONE_ROW.test(lines[i] ?? '')) {
      optionRow = i;
      break;
    }
  }
  if (optionRow <= questionRow) return null;
  const command = codexCommand(lines, questionRow, optionRow);
  const last = markers[markers.length - 1];
  return Object.freeze({
    shape: CODEX_COMMAND_APPROVAL.shape,
    markers: Object.freeze([...markers]),
    deny: Object.freeze(last === undefined ? [] : [last]),
    runs: command,
    command
  });
}

/** What one screen says a press may do, or null when it is no measured shape. */
export function readPress(input: PressInput): PressReading | null {
  const markers = consecutiveMarkers(input.rows);
  if (markers === null) return null;
  return readClaude(input, markers) ?? readCodex(input, markers);
}

/** The markers the phone may press: every one when what will run is said (his ruling 2), else the ones that say No. */
export function pressableOf(reading: PressReading): readonly string[] {
  return reading.runs !== null ? reading.markers : reading.deny;
}
