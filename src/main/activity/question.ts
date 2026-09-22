/**
 * What the agent is asking, composed from the hook body Tortie already
 * receives (Phase 311; research 127 §4 and §7 item 1).
 *
 * WHY THIS FILE EXISTS. A blocked row says `needs input` and beside it draws
 * the LAST INKED LINE of the pane, which for every committed Claude dialog is
 * the hint row — `Esc to cancel · Tab to amend` — while the question the agent
 * actually asked sits five lines above it. That question was already in main's
 * memory and was thrown away four lines later: `PermissionRequest`'s body is
 * read under a cap and parsed for the subagent check in ./hooks.ts, and
 * `onEvent` then carried only `(sessionId, state, event)`. This leaf is what
 * keeps it. Claude only, because `hooks: 'claude-settings'` is carried by
 * exactly one of the registry's fifteen rows; the other fourteen are Phase
 * 312's, through the screen and not through a hook.
 *
 * IT IS A LEAF. It holds no state, opens nothing, starts nothing and logs
 * nothing. A hook payload carries the person's prompt text, so ./hooks.ts's
 * own rule — "never a line of payload in the log" — governs this file too, and
 * there is no log call in it and no call to anything that could make one. The
 * two functions it borrows are leaves themselves: `redactText` imports nothing
 * at all, and `clip`'s module imports two TYPES and therefore nothing at
 * runtime, so neither drags the overview domain in behind it.
 *
 * IT NEVER THROWS, and it has exactly ONE `catch`, around the parse alone: a
 * body that is not JSON is null. Everything after that line is a typed read of
 * an own property and a string operation, so no programming error can be
 * swallowed into a silent null, and nothing is ever coerced — a value that is
 * not already a string contributes nothing, which is why a hostile
 * `{"tool_input":{"toString":…}}` has nothing to reach.
 */

import { redactText } from '../overview/redact';
import { clip } from '../overview/turn-view';

/**
 * The drawn cap, and this module is the one place it is applied.
 *
 * 200 rather than the overview store's 4,000 because a row draws ONE line, and
 * rather than the excerpt's 120 because a question is prose that often carries
 * a path. The row tail-truncates what will not fit, so nothing here appends an
 * ellipsis of its own.
 *
 * THE DRAWN RECTANGLE, measured rather than assumed, because the phase said a
 * number that did not survive that reading would move. At the shipped width a
 * 200-character question is ONE line on both surfaces, tail-truncated with an
 * ellipsis and never wrapped: the ⌘J span is about 152px and draws roughly
 * twenty of the characters, and Catch Me Up's line is about 1,109px and draws
 * about 155. So the number stays, and the ⌘J row carries the whole of it in the
 * row's own label instead — see `attentionRowLabel`.
 */
export const QUESTION_MAX = 200;

/**
 * The keys of `tool_input` that say what a tool is about to DO, in the order
 * they are asked for. The first own key holding a non-empty string wins and
 * the rest are not read, so the answer is one short rendering and never a
 * nested dump.
 *
 * What is deliberately ABSENT is the point of the list: `content`,
 * `new_string`, `old_string` and `prompt` carry the body of a file or the text
 * of a turn. A row is not the place for either, and leaving them out is a
 * cheaper promise than clipping them would be.
 *
 * THREE TOOLS THEREFORE DRAW THEIR NAME ALONE, and the fix round measured it
 * over eleven real Claude payloads rather than leaving it to be discovered:
 * `AskUserQuestion` (its text is nested at `questions[0].question`),
 * `ExitPlanMode` (its input is the plan itself) and any `mcp__…` tool (whose
 * input is the server's own schema). A person sees `AskUserQuestion` where the
 * phone's ambition is a sentence. That is the list's cheapest promise holding
 * rather than a bug — every one of those three would need either a nested read
 * or a sentence of Tortie's — and widening it is its own entry, because the
 * three questions a person most wants are exactly the three whose text is the
 * text this list refuses to carry.
 */
const TELLING_KEYS: readonly string[] = [
  'command', // Bash
  'file_path', // Edit, Write, Read, MultiEdit
  'notebook_path', // NotebookEdit
  'pattern', // Grep, Glob
  'url', // WebFetch
  'query', // WebSearch
  'path', // the directory a search or a listing names
  'description' // Task, and any tool carrying its own summary
];

/**
 * A terminal control sequence in its CSI form, `ESC [ … final byte`.
 *
 * A body can carry one inside a command the agent is about to run, and a row
 * drawing `[31m` would be drawing a terminal's bytes rather than the agent's
 * words. Only this form is recognised on purpose: a wider grammar here would
 * be a second sanitizer, and the blanking below already turns every remaining
 * control character into a space.
 *
 * WHAT THAT LEAVES, measured in the fix round so a later reader does not chase
 * it as a bug: a NON-CSI escape keeps its own letters as ordinary text, because
 * only the ESC is blanked. `ESC c` draws `c` and `ESC ] 0 ; title BEL` draws
 * `]0;`. This is React text and not bytes reaching a terminal, so the residual
 * is cosmetic, and no ESC, C0, C1 or DEL survives any shape. For the same
 * reason only the CUT is guarded against splitting a surrogate pair: a lone
 * surrogate already in the middle of the agent's own words is left where it is,
 * and React draws one replacement glyph.
 */
const CSI = /\u001b\[[\d;:?]*[ -/]*[@-~]/g;

/** Every control character, including the C1 block a stray byte can produce. */
const CONTROL = /[\u0000-\u001f\u007f-\u009f]+/g;

/**
 * One drawn line. A newline flood, a tab and a raw escape are all whitespace
 * by the time this returns, because the row draws one line.
 */
function oneLine(text: string): string {
  return text.replace(CSI, '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * The one telling value of `tool_input`, or '' when it holds none.
 *
 * Only a string is ever read. An object, an array, a number and a null all
 * contribute nothing rather than being rendered, so there is no path from a
 * nested payload to a drawn row.
 */
function toolInputWord(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input === null || typeof input !== 'object') return '';
  const obj = input as Record<string, unknown>;
  for (const key of TELLING_KEYS) {
    if (!Object.hasOwn(obj, key)) continue;
    const value = obj[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return '';
}

/** An own property of a parsed body, or undefined. Never a prototype member. */
function own(obj: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(obj, key) ? obj[key] : undefined;
}

/**
 * The question a `PermissionRequest` body is asking, or null when there is
 * nothing honest to draw.
 *
 * Null for: an empty body (which is also what an OVER-CAP body arrives as,
 * because ./hooks.ts drops an oversized body whole rather than truncating it),
 * a body that is not JSON, a body that is not an object, a subagent's payload,
 * and a body whose `tool_name` is not a non-empty string.
 *
 * The composition is the AGENT'S OWN WORDS and no sentence of Tortie's: the
 * tool's name, then the one telling value of its input, joined by a space.
 */
export function questionFromHookBody(body: string): string | null {
  if (body.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    // The ONE null this catch can produce, and it is a fact about the bytes
    // rather than a swallowed error.
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  // A SUBAGENT never speaks for the session. ./hooks.ts already drops such a
  // payload before `onEvent` is called, and `isSubagentPayload` is the rule
  // there; it is restated here so a second caller of this leaf cannot lose it.
  if (own(obj, 'agent_id') !== undefined || own(obj, 'agent_type') !== undefined) {
    return null;
  }
  const name = own(obj, 'tool_name');
  if (typeof name !== 'string') return null;
  const tool = oneLine(name);
  if (tool.length === 0) return null;
  const about = oneLine(toolInputWord(own(obj, 'tool_input')));
  const words = about.length === 0 ? tool : `${tool} ${about}`;
  // Bound the text BEFORE redacting, through the store's own clip, so a
  // hostile `tool_input` cannot make the redactor's pass expensive. The cut is
  // twenty times beyond the drawn cap, so nothing a cut could have split can
  // reach the answer, and redaction still runs over everything that can.
  const redacted = redactText(clip(words).text);
  if (redacted.length <= QUESTION_MAX) return redacted;
  const cut = redacted.slice(0, QUESTION_MAX);
  // A cut between a surrogate pair would leave half a character on the row.
  const last = cut.charCodeAt(QUESTION_MAX - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}
