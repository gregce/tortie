/**
 * WHETHER A CLAUDE BASH QUESTION SAYS ITS COMMAND WHOLE (Phase 318,
 * build/p318/SPEC.md §5.3, D12, §Revision R4, R22, R27).
 *
 * The phone draws the question the hook composed (`questionFromHookBody`,
 * src/main/activity/question.ts), and an allow option may be pressed only when
 * that question says WHAT WILL RUN. The composer is built to draw one line, so
 * it flattens newlines and control characters to spaces, collapses whitespace,
 * strips CSI sequences, trims, redacts and cuts at `QUESTION_MAX`. Any of those
 * can make a different command read as a harmless one: `echo ok` LF `rm -rf ~`
 * is drawn `Bash echo ok rm -rf ~`, which reads as one `echo`.
 *
 * So EQUALITY IS THE WHOLE TEST. The drawn question is `Bash ` followed by the
 * body's own `tool_input.command`, byte for byte, exactly when nothing on the
 * way changed a byte; and the command holds no bidi, zero-width or control
 * character, because the phone lays text out with bidi while the Mac compares
 * code points, so such a command could read on the phone as another one
 * (§Revision R27). Measured on Claude Code 2.1.287's real bodies
 * (build/fixtures/reply/claude-permission-requests-2.1.287.json): the one-line
 * command is whole; the two-line, blank-line and 302-character commands are not.
 *
 * PURE. It imports nothing, logs nothing and reads nothing but its arguments.
 * Its one `catch` is around the parse, and a body that is not JSON says nothing.
 */

/**
 * The characters a command shown as "what will run" may not hold: every C0 and
 * C1 control (a line break included), DEL, the Arabic letter mark, the
 * zero-width and directional marks, the bidi embeddings, overrides and
 * isolates, the invisible operators, and the byte order mark. Written as
 * escapes, because no such character may stand in a committed file.
 */
const HIDDEN = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\ufeff]/;

/** True when the text holds a character that draws as nothing, or as something else, on the phone. */
export function hidesCharacters(text: string): boolean {
  return HIDDEN.test(text);
}

/** An own property, never a prototype member. */
function own(obj: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(obj, key) ? obj[key] : undefined;
}

/** An object that is not an array, or null. */
function objectOf(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * What a `PermissionRequest` body says of its Bash command, given the question
 * the hook path composed from it: `'whole'`, `'partial'`, or null when it is
 * not a Bash request of the session's own agent at all.
 *
 * Null for a body that is not JSON, not an object, a subagent's (an own
 * `agent_id` or `agent_type`: a subagent never speaks for the session, as
 * question.ts says), a `tool_name` that is not exactly `Bash`, or a
 * `tool_input` with no own non-empty string `command`.
 */
export function hookBashOf(body: string, asked: string): 'whole' | 'partial' | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  const obj = objectOf(parsed);
  if (obj === null) return null;
  if (Object.hasOwn(obj, 'agent_id') || Object.hasOwn(obj, 'agent_type')) return null;
  if (own(obj, 'tool_name') !== 'Bash') return null;
  const input = objectOf(own(obj, 'tool_input'));
  if (input === null) return null;
  const command = own(input, 'command');
  if (typeof command !== 'string' || command.length === 0) return null;
  return asked === `Bash ${command}` && !hidesCharacters(command) ? 'whole' : 'partial';
}
