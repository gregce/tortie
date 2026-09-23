/**
 * Tier 3 — the screen (Phase 13, research 18 §5).
 *
 * Two things come off a `capture-pane` of the VISIBLE screen: whether it
 * changed recently (weak evidence of working) and whether a dialog is on it
 * (the ONLY screen-derived route to `needs_input`).
 *
 * MASKING IS BANNED HERE, and that is a measured decision, not taste. Over
 * 337 scored transitions a plain rstrip-trimmed hash missed 25.3 % of working
 * ticks; masking the spinner glyph, elapsed timer and token counts — the
 * BACKLOG's original instruction — missed 69.5 %. During claude's thinking
 * phase the spinner line is the ONLY changing line on the screen, so masking
 * it erases the single piece of evidence that the agent is alive. What fixes
 * the misses is MEMORY, not normalization: "changed within the last K ticks"
 * with K = 5 at 1 Hz scored 0 % false negatives and 0 % false positives.
 *
 * The rstrip earns its place cheaply — gemini pads its rows, and some TUIs
 * pad to the pane width, which would otherwise churn the hash.
 *
 * PHASE 312 adds a THIRD thing, and it is the same read: the rows the dialog
 * detector matched. Until this phase they were discarded in the expression
 * that computed the verdict, so nothing in Tortie could tell whether a blocked
 * session was waiting on a numbered choice or on prose. No extra capture and
 * no new cadence — `detectDialogRows` reads the capture the tick already took.
 *
 * PHASE 321 adds a FOURTH, and it sits BESIDE the verdict rather than in it:
 * the named question shapes (`DIALOG_SHAPES`, `detectShapes`). qwen and
 * Claude Code 2.1.280 draw questions the numbered verdict cannot read, so the
 * numbered verdict is no longer the only screen-derived route to
 * `needs_input`. It is still the only one for every agent whose compiled
 * registry row names no shape, and it has not moved by a byte.
 */

import type { SessionChoiceOption } from '@shared/ipc/sessions';
import { redactText } from '../overview/redact';

/** Ticks of memory at a 1 s cadence (0 % FN / 0 % FP over 337 transitions). */
export const SCREEN_MEMORY_TICKS = 5;

/** Trim trailing whitespace per line and drop trailing blank lines. */
export function normalizeCapture(text: string): string {
  const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''));
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

/** FNV-1a, 12 hex chars — cheap, and only ever compared to itself. */
export function hashScreen(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(4, '0').slice(0, 4);
}

// ---------------------------------------------------------------------------
// The generic needs-input dialog detector
// ---------------------------------------------------------------------------

/**
 * ONE detector, not a regex per agent: every agent's prompt has the same
 * shape — numbered options plus a confirm hint in the bottom rows. Measured
 * 57/57 recall and 0/386 false positives across claude/codex/qwen/gemini idle
 * and working screens, and it also catches both workspace-trust gates, which
 * is exactly the startup window where claude has no pid file yet.
 *
 * Because it requires a RENDERED dialog, the Phase 9.2 self-inflicted-input
 * rule is preserved by construction: an answered dialog leaves the screen.
 */
const BORDER = /^[\s│┃║▌▏|]+|[\s│┃║▕|]+$/g;
const OPT1 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}1[.)]\s+\S/;
const OPT2 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}2[.)]\s+\S/;
const HINT =
  /(enter to (confirm|select|continue)|press enter|esc to cancel|esc to quit|use enter to select|to cancel)/i;
const QUEST = /(do you (want|trust)|would you like|how would you like)/i;

/** Rows from the bottom of the RENDERED screen the dialog must live in. */
const DIALOG_ROWS = 24;

/**
 * The window both answers below are computed over.
 *
 * It is measured from the last row that has ink on it, not from the last row
 * of the capture. A gmux pane is ~42 rows and an agent draws its first gate at
 * the TOP with blank rows under it, so counting 24 up from the bottom of the
 * raw capture lands entirely inside the padding and sees nothing — the
 * workspace-trust gate, the very case this detector exists for, went
 * undetected on any pane taller than 24 rows.
 *
 * `rows` is border-stripped, which is what every predicate here reads. `raw`
 * is the same window untouched, and exists for ONE question: how far in a row
 * was drawn, which is what the wrap rule needs and which the strip destroys.
 */
function dialogWindow(capture: string): { raw: string[]; rows: string[] } {
  const lines = capture.split('\n');
  while (lines.length > 0 && (lines[lines.length - 1] ?? '').trim() === '') {
    lines.pop();
  }
  const raw = lines.slice(-DIALOG_ROWS);
  return { raw, rows: raw.map((l) => l.replace(BORDER, '')) };
}

export function detectDialog(capture: string): boolean {
  return detectDialogRows(capture).atChoice;
}

// ---------------------------------------------------------------------------
// Phase 312 — the rows the verdict matched, instead of only the verdict
// ---------------------------------------------------------------------------

/**
 * PHASE 312. The collector, and it sits BESIDE the verdict's own regexes
 * rather than replacing them.
 *
 * `OPT1` and `OPT2` above carry literal digits, because they are the regexes
 * the 57/57 recall and the 0/386 false positives were measured with. A third
 * option has therefore always been invisible to them: the committed
 * `claude-permission-prompt.txt` draws three and the detector only ever saw
 * two. This one generalises the digit so every option can be carried, and a
 * later round must NOT "tidy" the pair above into it — the verdict would then
 * be a clause nobody has measured, and the floor it holds up is the only
 * screen-derived route to `needs_input` for every agent with no hook.
 *
 * Group 1 is the marker a person would press and group 2 is the text beside
 * it. Both halves are carried, and the split is made HERE and nowhere else —
 * the channel's `SessionChoiceOption` says why.
 *
 * THE `s` FLAG IS LOAD-BEARING AND IT IS THE UNION'S OWN PROMISE. `.` matches
 * no line terminator without it, and `$` carries no `m`, so a row holding a
 * stray CR, U+2028 or U+2029 after the first character of its text made this
 * regex fail where `OPT1` — which has no `.*` and no `$` — still matched. The
 * verdict was then true with that option MISSING from the list, which is the
 * one failure mode this pair was designed to make unbuildable: a person shown
 * one choice where the agent drew two. With the flag, `OPT1` matching implies
 * this regex matching with marker `1`, and `OPT2` the same with `2`, so the
 * collector can never be silent on a row the verdict counted. Such a row is
 * carried WHOLE, terminator and all, rather than cut at it, because half an
 * option reads as a different choice from the one the agent drew.
 */
const OPT_ANY = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}(\d{1,2})[.)]\s+(\S.*)$/s;

/**
 * A row that LOOKS numbered but whose marker this collector cannot lex.
 *
 * `OPT_ANY` refuses a third digit on purpose — it is the verdict's own marker
 * shape with the digit generalised, and the verdict counts one or two digits —
 * so an agent numbering past 99, a code gutter, a version string or a line
 * number drawn at the right indent matched no option and fell through to the
 * wrap rule, which GLUED it onto the option above it: a screen drawing `1.
 * Alpha`, `2. Beta`, `100. Hundred` came back as two options, the second
 * reading `Beta 100. Hundred`. A row a person would read as numbered is never
 * the continuation of the row above it, whatever this module can make of its
 * marker, so it closes the open option instead of joining it.
 */
const NUMBERED = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}\d+[.)]\s/;

/**
 * The leading half of `BORDER`, as its own literal so the verdict's own regex
 * is not touched. It answers one question — how far into the row the agent
 * drew this — because the strip deletes exactly that.
 */
const LEAD = /^[\s│┃║▌▏|]*/;

/**
 * Rows one option may absorb when its text wrapped (the trap: a wrapped
 * option must become neither two options nor a half sentence that reads as a
 * different choice). Two, because a pane is ~80 columns and an option that
 * needs a fourth row is being capped by `CHOICE_OPTION_MAX_CHARS` anyway.
 */
const OPTION_WRAP_ROWS = 2;

/**
 * Options carried at most. The window is 24 rows, so this can only ever bite
 * a screen that is nothing but numbered rows — which is the point: this rides
 * a channel batched at 1 Hz and a pathological screen may not put a page of
 * text on it.
 *
 * IT CUTS THE LIST IN SILENCE, AND THAT IS DELIBERATE RATHER THAN AN OVERSIGHT
 * of the sentence `CHOICE_OPTION_MAX_CHARS` states one level down. A clipped
 * option is marked because the mark can be drawn INSIDE the thing it is about;
 * a cut list cannot be, because the only shape this array carries is an option
 * with a marker a person could press, and a twenty-first row reading "and three
 * more" would be a row nobody drew, with a marker nobody offered, in a list
 * whose whole promise is that every marker in it is the agent's own. So the
 * refusal is the honest one: a screen drawing more than twenty numbered rows
 * inside a 24-row window is not a menu, and the first twenty of it are reported
 * as what was found rather than as all there is. A surface that ever needs to
 * say "there were more" needs a COUNT field on the channel, and that is a
 * change to the contract rather than a constant.
 */
export const CHOICE_MAX_OPTIONS = 20;

/**
 * Characters of one option's text carried at most, tail-marked when it
 * truncates, because a silently cut option reads as a different choice from the
 * one the agent drew.
 */
export const CHOICE_OPTION_MAX_CHARS = 200;

/**
 * Characters of the question carried at most. The same 200 Phase 311's
 * `QUESTION_MAX` uses, because both phases fill the same question for the same
 * row and a row cannot be clipped two ways.
 */
export const CHOICE_QUESTION_MAX_CHARS = 200;

/**
 * INKED rows that may sit between the question and the choice's first option.
 *
 * MEASURED, and the two numbers are why there is a bound at all. Over the
 * committed captures the largest legitimate distance is gemini's trust gate,
 * whose box draws a three-row explanation between `Do you trust the files in
 * this folder?` and `1. Trust folder` — three inked rows, seven raw ones,
 * because the box pads with blanks. claude's permission prompt draws its
 * question directly above its first option: zero. Against that, a single line
 * of the agent's own prose placed above the committed workspace-trust gate —
 * which asks NO question of its own — put `Shall I keep going? Do you want me
 * to also update the README first?` on the gate as its question, across EIGHT
 * inked rows of the gate's own explanation.
 *
 * Four is the measured three plus one row of headroom, and blank rows are not
 * counted because a box's padding is not something drawn between two things.
 * Past it the answer is `null`, which is the direction that has to be got
 * right: a question this module cannot place is a MISS, and a miss draws
 * nothing, where a wrong question puts one sentence of the agent's on another
 * sentence's gate and a person answers the wrong thing.
 */
export const CHOICE_QUESTION_INK_ROWS = 4;

/** What one capture says about a numbered choice. */
export interface DialogRows {
  /**
   * The verdict, and it is the SAME clause `detectDialog` has always computed
   * from `OPT1`, `OPT2`, `HINT` and `QUEST`.
   */
  atChoice: boolean;
  /**
   * The question row the agent drew, or null when it drew none — and null also
   * when one was drawn too far above the options to belong to them
   * (`CHOICE_QUESTION_INK_ROWS`).
   */
  question: string | null;
  /**
   * The option rows in the order they were drawn, each split into the marker a
   * person would press and the text beside it. Empty unless `atChoice`.
   *
   * When `atChoice` is true this holds at least one row, because the verdict
   * cannot be true unless `OPT1` matched — and since `OPT_ANY` carries the `s`
   * flag, an `OPT1` match implies an `OPT_ANY` match with marker `1`, which is
   * where `choiceStart` lands and which `collectOptions` pushes on its first
   * step. The monitor still ANDs on the length before it puts a choice on the
   * channel, because the channel's union is what that belt protects and a
   * structural promise in this module is not the place a channel's shape is
   * enforced.
   */
  options: SessionChoiceOption[];
}

/**
 * PHASE 312. The verdict, plus the rows it matched.
 *
 * The rows are a SECOND answer computed beside the verdict, never an input to
 * it: `atChoice` is `opt1 && opt2 && hint` over the same window, unchanged, so
 * this phase cannot move a status and the measured floor does not have to be
 * re-earned. `detectDialog` is this function's `atChoice` and nothing else, so
 * there is ONE spelling of the predicate in the tree.
 *
 * The rows are only collected when the verdict says yes. A numbered list in an
 * agent's prose is not a choice, and the measured predicate is the one thing
 * that vouches for the difference — so a screen the detector is silent on
 * answers no options at all rather than a list nobody may act on.
 *
 * Every string carried leaves here redacted and capped. They are the AGENT's
 * words about the person's work, treated as the person's own data, and nothing
 * on this path may log them.
 *
 * IT IS COMPUTED TWICE ON A PANE THAT IS AT A CHOICE, ONCE PER TICK, and that
 * is deliberate. `detectDialog` is this function's `atChoice` for the state
 * machine, and the monitor asks again for the rows themselves. Measured by this
 * phase's verifier over 20,000 calls per case, against the parent's own detector
 * extracted from `a31999fc`: 1.78 µs → 13.12 µs worst case on a 22-row menu, 4.64 µs →
 * 8.99 µs on a real gemini gate, 10.56 µs → 10.75 µs idle. At
 * `MAX_CAPTURES_PER_TICK` of 6 at 1 Hz that is under 80 µs a second, so the
 * honest trade is one spelling of the predicate against microseconds, and the
 * alternative — handing `atChoice` down from one call — puts the verdict's own
 * clause behind a caller that could forget to ask for it.
 */
export function detectDialogRows(capture: string): DialogRows {
  const { raw, rows } = dialogWindow(capture);
  let opt1 = false;
  let opt2 = false;
  let hint = false;
  for (const row of rows) {
    if (!opt1 && OPT1.test(row)) opt1 = true;
    if (!opt2 && OPT2.test(row)) opt2 = true;
    if (!hint && (HINT.test(row) || QUEST.test(row))) hint = true;
  }
  if (!(opt1 && opt2 && hint)) {
    return { atChoice: false, question: null, options: [] };
  }
  const start = choiceStart(rows);
  return {
    atChoice: true,
    question: collectQuestion(rows, start),
    options: collectOptions(raw, rows, start)
  };
}

/**
 * Where the choice begins: the LOWEST row whose marker is `1` and whose markers
 * from there down never stop increasing.
 *
 * A numbered choice starts at its own 1 and counts up, and everything above
 * that row is the screen rather than the choice. Without the rule gemini's
 * committed trust gate reads FOUR options — its "Tips for getting started" list
 * leaves `4. Be specific for the best results` inside the 24-row window,
 * eighteen rows above the dialog box — and the question is lost with it, because
 * the stray row sits below the real question and the question is taken from
 * above the first option. The LOWEST such row rather than the highest, because a
 * dialog is drawn at the bottom of the screen and a numbered list above it is
 * prose.
 *
 * THE INCREASING CLAUSE IS FOR THE LIST DRAWN BELOW THE DIALOG, which the
 * lowest-1 rule alone gets WRONG rather than merely incomplete — and wrong in
 * the worst available way, because the options then come off the stray block
 * while the question above still comes off the real gate, so a person is asked
 * the gate's question over somebody else's rows. It is a real shape and not an
 * invented one: claude draws a numbered code gutter directly under numbered
 * options on its own theme-picker screen, and a gutter, a diff or a
 * half-repainted list repeats or drops its numerals where a menu never does. So
 * a block whose markers fall back or repeat is passed over and the next `1`
 * above is tried.
 *
 * When EVERY block on the screen is like that, the highest `1` is taken, and it
 * is `collectOptions` that then closes the block at the first marker which does
 * not increase. That pair is what keeps the gutter from stealing a real gate's
 * options: the gate is the higher block, and its own rows end where the gutter
 * starts.
 *
 * THE LIMIT, STATED: a CLEAN numbered list drawn below a dialog — one whose own
 * markers increase from 1 — still wins, exactly as it did before this clause,
 * because from that row down the markers do increase and there is nothing in a
 * screen read to tell a tidy list from a menu. The only thing that vouches for
 * a menu is the verdict, and the verdict answers about the whole window.
 *
 * It never has to guess: the verdict cannot be true unless `OPT1` matched a row
 * in this same window, and `OPT_ANY` matches wherever `OPT1` does, so there is
 * always a `1` to find.
 */
function choiceStart(rows: readonly string[]): number {
  const ones: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (OPT_ANY.exec(rows[i] ?? '')?.[1] === '1') ones.push(i);
  }
  for (let k = ones.length - 1; k >= 0; k--) {
    const at = ones[k] ?? 0;
    if (onlyIncreasingFrom(rows, at)) return at;
  }
  return ones[0] ?? 0;
}

/** True when every marker from `at` to the end of the window only increases. */
function onlyIncreasingFrom(rows: readonly string[], at: number): boolean {
  let last = -1;
  for (let i = at; i < rows.length; i++) {
    const marker = OPT_ANY.exec(rows[i] ?? '')?.[1];
    if (marker === undefined) continue;
    const n = Number(marker);
    if (n <= last) return false;
    last = n;
  }
  return true;
}

/** One option while it is still open to a wrapped continuation. */
interface OpenOption {
  marker: string;
  text: string;
  /** Column the marker was drawn at, in the raw row. */
  column: number;
  wraps: number;
}

/**
 * The option rows, each verbatim after its marker and separator.
 *
 * The marker class is dropped and nothing else is, so `❯ 1. Yes` is the marker
 * `1` and the text `Yes`: `❯` says which option the cursor is sitting on rather
 * than what the option IS, and carrying it would make one row of the list read
 * differently from its neighbours.
 *
 * A continuation row — the second half of an option whose text wrapped — is
 * appended to the option above it, and the five clauses that decide one are
 * each there for a screen that would otherwise be misread: it must not be an
 * option itself (or one option would swallow the next), it must not be a row a
 * person would read as NUMBERED at all (`NUMBERED` says why, and it is the
 * clause that stops `100. Hundred` being glued onto option 2), it must have ink
 * (a blank row ends the block), it must be neither a hint nor a question (both
 * are drawn under the options and belong to neither), and it must have been
 * drawn at or past the marker's own column (a row that dedents back out to the
 * margin is the screen's, not the option's). Anything else closes the option,
 * so the next numbered row starts a new one.
 *
 * THE BLOCK ENDS AT THE FIRST MARKER THAT DOES NOT INCREASE, which is
 * `choiceStart`'s other half and is what stops a numbered gutter drawn below a
 * real gate from being collected as more of the gate. A menu counts up; a
 * gutter, a diff or a half-repainted list repeats or drops.
 *
 * THE ONE LIMIT OF THE JOIN, stated rather than fixed: a terminal hard-wrap
 * splits a row at the column boundary with no space, and this join puts a space
 * back, so a secret split across the wrap is two shorter strings to `redactText`
 * and travels. It is stated rather than fixed because the fix — joining with no
 * separator when the raw row reached the pane's last column — needs the pane
 * width, and the width is exactly what the rstrip above this function destroys;
 * guessing it from the widest row in the window would run real wrapped words
 * together on any screen holding a box. It is also the weaker half of the
 * channel it rides: `excerptFromCapture` below puts the last screen row on the
 * SAME channel with no redaction at all.
 */
function collectOptions(
  raw: readonly string[],
  rows: readonly string[],
  start: number
): SessionChoiceOption[] {
  const found: OpenOption[] = [];
  let open: OpenOption | null = null;
  let last = -1;
  for (let i = start; i < rows.length; i++) {
    const row = rows[i] ?? '';
    const match = OPT_ANY.exec(row);
    if (match !== null) {
      const marker = match[1] ?? '';
      const n = Number(marker);
      if (n <= last) break;
      last = n;
      open = {
        marker,
        text: match[2] ?? '',
        column: leadWidth(raw[i] ?? '') + row.indexOf(marker),
        wraps: 0
      };
      found.push(open);
      continue;
    }
    if (open === null) continue;
    if (
      row !== '' &&
      !NUMBERED.test(row) &&
      open.wraps < OPTION_WRAP_ROWS &&
      !HINT.test(row) &&
      !QUEST.test(row) &&
      leadWidth(raw[i] ?? '') >= open.column
    ) {
      open.text = `${open.text} ${row}`;
      open.wraps++;
      continue;
    }
    open = null;
  }
  return found.slice(0, CHOICE_MAX_OPTIONS).map((o) => ({
    marker: o.marker,
    text: clipRow(redactText(o.text), CHOICE_OPTION_MAX_CHARS)
  }));
}

/**
 * The row that matched `QUEST`, verbatim and border-stripped.
 *
 * It is taken from ABOVE the choice's first option, which is where every agent
 * measured draws it, and the search walks UP from that option so the NEAREST
 * such row wins: an earlier "do you want" in the agent's own prose cannot beat
 * the question of the dialog drawn under it. A question drawn BELOW its options
 * is not picked up, and a question that wrapped carries only the row that
 * matched — both are stated limits rather than heuristics, and both answer null
 * rather than something invented.
 *
 * AND THE WALK STOPS, which is the part "the nearest wins" does not cover. A
 * dialog that asks NO question of its own — the committed
 * `claude-workspace-trust.txt` is one, and it is the shape that makes this a
 * defect rather than a preference — has nothing to beat the prose above it, so
 * one stray `do you want` anywhere in the window became that gate's question
 * outright and a person read a sentence from the agent's last answer as the
 * thing they were being asked. `CHOICE_QUESTION_INK_ROWS` is where the walk
 * gives up, with the two measurements that set it, and giving up answers null.
 */
function collectQuestion(
  rows: readonly string[],
  start: number
): string | null {
  let found: string | null = null;
  let ink = 0;
  for (let i = Math.min(start, rows.length) - 1; i >= 0; i--) {
    const row = rows[i] ?? '';
    if (QUEST.test(row) && !OPT_ANY.test(row)) {
      found = row;
      break;
    }
    if (row === '') continue;
    ink++;
    if (ink > CHOICE_QUESTION_INK_ROWS) break;
  }
  if (found === null) return null;
  return clipRow(redactText(found), CHOICE_QUESTION_MAX_CHARS);
}

/** Width of the border-and-padding run a row was drawn behind. */
function leadWidth(raw: string): number {
  return (LEAD.exec(raw)?.[0] ?? '').length;
}

/**
 * The one clip for a carried row. It marks what it cut, because a silently
 * truncated option reads as a different choice from the one the agent drew.
 * `clip` in `src/main/overview/turn-view.ts` is not this: it answers the
 * store's single 4,000-character question and takes no limit.
 */
function clipRow(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

// ---------------------------------------------------------------------------
// Phase 321 — the named question shapes, read beside the verdict
// ---------------------------------------------------------------------------

/**
 * PHASE 321. The questions real agents draw that the numbered verdict cannot
 * read (build/p321/SPEC.md §3, research 129 §9 items 2 to 4).
 *
 * A CLOSED SET, and it is compiled data. Which of these an agent's screen is
 * read with is the `dialogs` field of that agent's COMPILED registry row
 * (`src/main/agents/registry.ts`), which the configuration overlay refuses
 * whole, so no configuration can name a shape, add one or widen one
 * (CLAUDE.md refusal 5). An agent whose row names none reads exactly as it did
 * before this phase, and that is every agent but two.
 *
 * TWO, NOT SIX. The build read six. Its fix round REMOVED four, whole, because
 * each one turned amber on a screen that is not a question (build/p321/SPEC.md
 * §12.9): cursor's trust gate on its own rows pasted into the input cursor
 * draws on the LAST row after a skipped permission (measured live on
 * cursor-agent 2026.09.18) and on a shell or pager showing them; cursor's run
 * permission on the same paste; opencode's permission and antigravity's arrow
 * list on a shell or pager in the session showing their rows, and
 * antigravity's on the pickers agy draws with the same component. A false
 * amber is as bad as a missed question, so those agents' questions are missed
 * again, exactly as they were before this phase. The two kept here have a tail
 * of 0: nothing may be drawn below the hint, which refused every one of those
 * screens.
 */
export type DialogShapeId = 'qwen-confirmation' | 'claude-trust-gate';

/**
 * One agent's question, as the FOUR things a live question has and an
 * answered, quoted, printed or typed one does not have all of
 * (build/p321/SPEC.md §3.1). Every shape requires every one of them.
 *
 *  1. The agent's own OPTION rows, as that agent draws them.
 *  2. The live FOCUS mark on one of them.
 *  3. The live HINT or wait row the agent draws only while the question waits.
 *  4. The BOTTOM: the question replaces the agent's input box, so at most
 *     `tail` inked rows sit below the last hint row. Both agents draw an input
 *     box and a footer below their conversation at rest and while they work,
 *     so a question answered into history, the agent printing one, his own
 *     words typed into the input box, and a shell prompt, a pager's status row
 *     or an editor's status line below a printed copy all have more.
 *
 * WHY ALL FOUR, and not the option text alone: an answered question can stay
 * drawn with its option rows intact (cursor's trust box stays for the rest of
 * the session), and Phase 319 was parked for widening false ambers to a whole
 * class of misread screens.
 *
 * NO REGEX HERE ANCHORS `$` ON A ROW AN AGENT CAN DRAW A SCROLLBAR BESIDE:
 * qwen draws a `█` column beside its second question and the border strip
 * does not remove it. Claude Code's two rows are the only anchored ones,
 * because it draws none.
 */
interface DialogShape {
  /**
   * The live key or wait row. The LAST row in the window that matches anchors
   * the shape, because a question is drawn at the bottom and an older one is
   * history.
   */
  readonly hint: RegExp;
  /** Inked rows (a border-stripped row with any character) allowed below the hint row. */
  readonly tail: number;
  /** The option row carrying the live focus mark, searched from the hint row upward through `span` rows. */
  readonly focus: RegExp;
  /** ANOTHER of the agent's own option rows: never the focus row and never the hint row. */
  readonly option: RegExp;
  /** Rows above the hint row the focus and the option may sit in. */
  readonly span: number;
}

/**
 * THE TWO SHAPES. Each comment names the recordings it was measured on and the
 * agent version the recording's own banner reads, because a shape is a fact
 * about one release of one agent and the next release may draw something
 * else. The recordings are research 129's (§8), and the committed redacted
 * windows under `build/fixtures/questions/` are what the tests read.
 */
export const DIALOG_SHAPES: Readonly<Record<DialogShapeId, DialogShape>> = {
  /**
   * qwen's confirmation, in its Ask permissions mode only; in his default Auto
   * mode it asked nothing. Recording a/qwen, two questions, qwen 0.22.0 at 160
   * columns, the second drawn with qwen's scrollbar column `█` beside every
   * row. `› 1. Yes, allow once` over the other numbered rows, then a braille
   * spinner and `Waiting for user confirmation...` as the LAST row, in place of
   * qwen's input box and footer.
   *
   * No header: the wait row is qwen's own status for every confirmation it
   * asks, and only `Allow execution of: '<cmd>'?` was recorded.
   */
  'qwen-confirmation': {
    hint: /^[⠀-⣿] Waiting for user confirmation\.\.\./,
    tail: 0,
    focus: /^› \d{1,2}\. \S/,
    option: /^\d{1,2}\. \S/,
    span: 12
  },
  /**
   * Claude Code's folder trust gate as 2.1.280 draws it: no numerals
   * (`hideIndexes`), the focus on `❯ No, exit` over `Yes, I trust this
   * folder`, and `Enter to confirm · Esc to cancel` as the last row (Phase 314
   * R3, build/p314/SPEC.md). Recording a/claude. It is read only while Claude's
   * own registry file is absent, measured at 10 s on 2.1.280 with the gate
   * drawn, because the native oracle speaks first whenever it can.
   *
   * The older numbered gate (`❯ 1. Yes, I trust this folder`) is the numbered
   * verdict's, and this shape does not read it.
   */
  'claude-trust-gate': {
    hint: /^Enter to confirm · Esc to cancel/,
    tail: 0,
    focus: /^❯ (?:Yes, I trust this folder|No, exit)$/,
    option: /^(?:Yes, I trust this folder|No, exit)$/,
    span: 4
  }
};

/**
 * PHASE 321. Whether any of the listed shapes is on the screen.
 *
 * It takes no agent id and reads no registry: the caller hands it the list its
 * compiled row names, and an empty list answers false before the capture is
 * read at all, which is what keeps every agent with no shape at exactly the
 * parent's cost.
 *
 * It reads the SAME window the numbered verdict reads (`dialogWindow`), so a
 * verdict on a committed 24-row window equals the verdict on the capture it
 * came from, and it is never an input to that verdict: the state machine ORs
 * the two, and `detectDialog` has not moved.
 */
export function detectShapes(
  capture: string,
  shapes: readonly DialogShapeId[]
): boolean {
  if (shapes.length === 0) return false;
  const { rows } = dialogWindow(capture);
  for (const id of shapes) {
    if (shapeOn(rows, DIALOG_SHAPES[id])) return true;
  }
  return false;
}

/** One shape over one window's border-stripped rows. */
function shapeOn(rows: readonly string[], shape: DialogShape): boolean {
  // 3 — the live hint, the LAST row that carries it.
  let hintAt = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (shape.hint.test(rows[i] ?? '')) {
      hintAt = i;
      break;
    }
  }
  if (hintAt < 0) return false;

  // 4 — the bottom: the question replaced the input box.
  let inkedBelow = 0;
  for (let i = hintAt + 1; i < rows.length; i++) {
    if ((rows[i] ?? '') !== '') inkedBelow++;
  }
  if (inkedBelow > shape.tail) return false;

  // 2 — the live focus mark, nearest the hint.
  const top = Math.max(0, hintAt - shape.span);
  let focusAt = -1;
  for (let i = hintAt; i >= top; i--) {
    if (shape.focus.test(rows[i] ?? '')) {
      focusAt = i;
      break;
    }
  }
  if (focusAt < 0) return false;

  // 1 — another of the agent's own option rows, above the hint row.
  for (let i = top; i < hintAt; i++) {
    if (i !== focusAt && shape.option.test(rows[i] ?? '')) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// The ⌘J excerpt
// ---------------------------------------------------------------------------

const EXCERPT_MAX = 120;

/**
 * Last non-empty line of the visible screen — the ⌘J excerpt, which used to
 * come off the renderer's byte stream and therefore only existed for the
 * VISIBLE pane. Sourced from main it works for hidden sessions too, which is
 * a capability the old path never had.
 */
export function excerptFromCapture(capture: string): string {
  const lines = capture.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = (lines[i] ?? '').trim();
    if (line.length > 0) return line.slice(0, EXCERPT_MAX);
  }
  return '';
}

/**
 * Rolling memory of one pane's screen hash.
 *
 * The predicate is "the screen CHANGED within the last K observations", which
 * is what scored 0 % FN / 0 % FP (K = 5 at 1 Hz; K = 3 gave 4.5 % FN). It is
 * not "this hash differs from the previous one" — that misses codex, which
 * repaints only when a paragraph completes and produces runs of five
 * identical captures mid-stream.
 */
export class ScreenMemory {
  private last: string | null = null;
  /** Observations since the hash last changed; starts "long ago". */
  private quiet: number;

  constructor(private readonly depth = SCREEN_MEMORY_TICKS) {
    this.quiet = depth;
  }

  note(hash: string): boolean {
    if (this.last === null) {
      // First sight of the screen is not evidence of anything.
      this.last = hash;
      this.quiet = this.depth;
    } else if (hash !== this.last) {
      this.last = hash;
      this.quiet = 0;
    } else {
      this.quiet++;
    }
    return this.quiet < this.depth;
  }

  reset(): void {
    this.last = null;
    this.quiet = this.depth;
  }
}
