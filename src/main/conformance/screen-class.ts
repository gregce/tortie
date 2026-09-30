/**
 * The resume-conformance harness's SCREEN reading (Phase 331,
 * build/p331/SPEC.md §2.8; research 133 and 134).
 *
 * WHAT IT IS FOR. Phase 331 launches and resumes two agents inline on
 * purpose: Codex with `-c tui.fullscreen_transcript=false` in its argv and
 * Claude Code with `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` in its env. Both
 * switches are a vendor's spelling, and a vendor can rename, drop or override
 * one in any release. `conformance:agents` proves the registry still CARRIES
 * each switch; only a real agent can prove the switch still WORKS. The
 * harness that is owed after every agent-CLI upgrade therefore reads the
 * pane's screen after create and after the restored resume, and an agent
 * whose compiled record says `switch-to-inline` FAILS when tmux says it drew
 * on the alternate screen. That is how the next Codex that changes its
 * default, or the next Claude that ignores the variable, is caught by the run
 * rather than by the operator's wheel.
 *
 * WHAT IT READS. One `display-message -p` of `#{alternate_on}`,
 * `#{mouse_any_flag}` and `#{history_size}` on the harness's own socket, the
 * three facts Tortie's wheel router and its history surfaces decide by
 * (`src/main/tmux/scroll.ts`). Nothing about the screen's text.
 *
 * WHAT IT NEVER DOES. Every class but `switch-to-inline` is RECORDED, never
 * failed: the person's own setting may choose otherwise for an agent Tortie
 * compiles nothing for, and a gate that went red on that would stop being
 * run. A switch-to-inline row with NO reading fails too, because a gate that
 * could not look has not passed, and since Phase 331's fix round a reading
 * taken at a trust question the harness could not answer is no reading
 * ({@link unreadBecause}): Claude Code draws that question on the normal
 * screen whatever its switch says.
 *
 * `judgeScreen` is pure and is what `p331-screen.test.ts` drives; `readScreen`
 * is the one tmux call.
 *
 * Ownership: src/main/conformance/**.
 */

import type { LaunchableAgentId } from '@shared/types';
import { getLaunchableEntry, type AgentScreenClass } from '../agents/registry';
import * as tmux from '../tmux';

/** What tmux says about one pane's screen, and nothing else. */
export interface ScreenReading {
  /** `#{alternate_on}`: the program is drawing on the alternate screen. */
  alternateOn: boolean;
  /** `#{mouse_any_flag}`: the program asked for the mouse. */
  mouseAny: boolean;
  /** `#{history_size}`: lines tmux holds above the visible screen. */
  historySize: number;
}

/** The judgement of one reading against the row's compiled record. */
export interface ScreenJudgement {
  /** The row's compiled class, or 'none' for a row that carries no record. */
  class: AgentScreenClass | 'none';
  /** A sentence when the case must FAIL, else null. Only a switch fails. */
  fail: string | null;
  /** A sentence when the reading disagrees with the class, else null. Never fails. */
  mismatch: string | null;
}

/** The one format this module asks tmux for. */
export const SCREEN_FORMAT = '#{alternate_on}\t#{mouse_any_flag}\t#{history_size}';

/**
 * One line of `display-message -p` output, parsed, or null when it is not the
 * three fields this module asked for. Anything unreadable is null, never a
 * guess: a zero read out of an empty string would pass a switch that nobody
 * looked at.
 */
export function parseScreenReading(stdout: string): ScreenReading | null {
  const line = stdout.split('\n')[0] ?? '';
  const parts = line.split('\t');
  if (parts.length !== 3) return null;
  const [alt, mouse, history] = parts as [string, string, string];
  if (!/^[01]$/.test(alt) || !/^[01]$/.test(mouse) || !/^\d+$/.test(history)) return null;
  return { alternateOn: alt === '1', mouseAny: mouse === '1', historySize: Number(history) };
}

/** Read one pane's screen through the harness's own tmux. Null on any failure. */
export async function readScreen(tmuxId: string): Promise<ScreenReading | null> {
  try {
    return parseScreenReading(
      await tmux.execTmux(['display-message', '-p', '-t', tmuxId, SCREEN_FORMAT])
    );
  } catch {
    return null;
  }
}

/**
 * Why a create reading is NOT a reading of the agent, or null when it is.
 *
 * Phase 331's fix round. Claude Code 2.1.285 draws its folder question on the
 * NORMAL screen at every build, switch or no switch, and the harness's scratch
 * folder is new every run, so a reading taken while that question was still up
 * read `0/0` for a Claude whose switch was gone, and the gate could not fail
 * for Claude (the verifier fed the parent's own reading at the question to
 * {@link judgeScreen} and it passed). So a switch-to-inline row has its trust
 * question answered before the create reading, and when the harness SAW a trust
 * question and could NOT answer it, there is no reading: the switch row fails,
 * with this sentence, and every other row records it.
 */
export function unreadBecause(gate: { seen: string | null; answered: boolean }): string | null {
  if (gate.seen === null || gate.answered) return null;
  return `a trust question it could not answer was still on screen (${gate.seen})`;
}

/** `alternate a/m`, the shape the report prints: `1/0`. */
export function screenPair(reading: ScreenReading): string {
  return `${reading.alternateOn ? '1' : '0'}/${reading.mouseAny ? '1' : '0'}`;
}

function failed(
  agent: LaunchableAgentId,
  reading: ScreenReading | null,
  unread: string | null = null
): ScreenJudgement {
  return {
    class: 'switch-to-inline',
    fail:
      reading === null
        ? `${agent} compiles an inline switch and ` +
          (unread === null ? 'no screen reading could be taken' : `its screen was not read: ${unread}`) +
          ', so nobody can say the switch still holds; a gate that could not look has not passed'
        : `${agent} compiles an inline switch and drew on the alternate screen ` +
          `(alternate_on 1, mouse_any_flag ${reading.mouseAny ? '1' : '0'}): its inline switch was ` +
          'renamed, dropped or overridden by this build of the agent',
    mismatch: null
  };
}

/** What each class expects, as `[alternate_on, mouse_any_flag]`, or null for no expectation. */
const EXPECTED: Readonly<Record<AgentScreenClass, readonly [boolean, boolean] | null>> = {
  'switch-to-inline': [false, false],
  'inline-already': [false, false],
  'fullscreen-with-mouse': [true, true],
  unknown: null
};

/**
 * Judge one reading against the agent's compiled screen record.
 *
 *  - switch-to-inline: FAILS on the alternate screen and on no reading. On the
 *    normal screen it passes; a mouse there is recorded, never failed.
 *  - inline-already expects 0/0, fullscreen-with-mouse expects 1/1: a reading
 *    that disagrees is RECORDED as a mismatch and never fails, because the
 *    person's own setting may choose otherwise.
 *  - unknown expects nothing.
 *  - a missing reading is recorded for every class but a switch, which fails.
 *    `unread`, when given, says why there is none, and is said in the fail.
 *  - a row with no record (a capture-only row, a configured agent) is 'none'.
 */
export function judgeScreen(
  agent: LaunchableAgentId,
  reading: ScreenReading | null,
  unread: string | null = null
): ScreenJudgement {
  const record = getLaunchableEntry(agent).screen;
  if (record === undefined) return { class: 'none', fail: null, mismatch: null };
  if (record.class === 'switch-to-inline' && (reading === null || reading.alternateOn)) return failed(agent, reading, unread);
  if (reading === null) {
    return {
      class: record.class,
      fail: null,
      mismatch:
        `no screen reading could be taken for ${agent} (${record.class})` +
        (unread === null ? '' : `: ${unread}`)
    };
  }
  const want = EXPECTED[record.class];
  if (want === null) return { class: record.class, fail: null, mismatch: null };
  const [alt, mouse] = want;
  if (reading.alternateOn === alt && reading.mouseAny === mouse) {
    return { class: record.class, fail: null, mismatch: null };
  }
  return {
    class: record.class,
    fail: null,
    mismatch:
      `${agent} is recorded ${record.class}, which expects ` +
      `${alt ? '1' : '0'}/${mouse ? '1' : '0'}, and read ${screenPair(reading)} ` +
      '(alternate_on/mouse_any_flag)'
  };
}
