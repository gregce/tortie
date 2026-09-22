/**
 * Phase 312 — the choices the agent drew, as a surface reads them.
 *
 * `detectDialog` has recognised a numbered choice on any agent's pane since
 * Phase 13, and until this phase it answered `true` and threw the rows away in
 * the same expression. Main now computes the rows beside that verdict and puts
 * them on `activity:changed`. This file is where a SURFACE reads them, and it
 * exists for one reason: the question "is there anything to draw here" is
 * spelled ONCE, so no two draw sites can disagree about whether a blocked
 * session is sitting at a choice.
 *
 * IT IS NOT A STATUS AND IT NEVER BECOMES ONE. `SessionStatus` gains no member
 * for a session that is at a choice, no dot is drawn from it, and nothing here
 * decides whether a session needs input. The verdict that produces
 * `needs_input` is main's and did not change in this phase, which is why the
 * detector's measured floor did not have to be re-earned.
 *
 * THE OPTIONS ARE DRAWN AND NEVER PRESSED. There is no press, no digit and no
 * reply here, and a later round must not add one to this file: answering a
 * choice needs a delivery door that does not exist in the tree, and it is its
 * own phase with its own ruling.
 *
 * THE QUESTION IS READ HERE AND COMPOSED NOWHERE HERE. There is ONE question
 * field on the activity channel and main composes its one value out of the
 * agent's own words (the Phase 311 hook) and the screen's reading, in
 * `src/main/activity/question.ts`, so no renderer surface chooses between two
 * sources for one concept — the mistake that would leave every later surface,
 * the phone included, deciding which to trust. `readQuestion` below is the
 * reader for that composed answer, structural like `readChoice` beside it,
 * because a string that crossed a process boundary is not a string until it has
 * been asked. Its `null` arm is main's own clear, and it is the ONE thing that
 * empties the record: the question's life is the WAIT's and not the choice's,
 * which is what the two phases landing together settled.
 *
 * THERE IS NO CAP AND NO REDACTION HERE, DELIBERATELY. Main redacts every
 * string through `redactText` and caps both the option count and each option's
 * length before it sends them, each cap at one definition with one call site.
 * A second cap on this side would be a second place the truth about what a
 * person sees lives, so this file validates SHAPE and nothing else.
 */

import type {
  SessionActivityInfo,
  SessionChoiceInfo,
  SessionChoiceOption
} from '@shared/ipc/sessions';

/**
 * The line that says the choices on screen are not controls.
 *
 * It is drawn whenever the options are, because a list of numbered options that
 * looks like a menu and answers no press is worse than no list at all. The
 * words are the phone mock's own (`docs/design/phone/Choice.html`), so the
 * desktop and the phone say one thing and Phase 311's copy-drift gate has one
 * module to find this string in.
 */
export const CHOICE_NOT_PRESSABLE = 'Answer this in the session.';

/**
 * Read the choice off one `activity:changed` update, structurally.
 *
 * Three answers, and they are deliberately the three `readHandback` gives for
 * Phase 141's field on this same channel (`src/renderer/state/subscriptions.ts`,
 * and the reasoning is in that file's own block comment). `undefined` is an
 * update that says nothing about the choice and leaves the record alone, which
 * is every ordinary tick. `null` is main saying this session is not at a choice,
 * and it deletes the record rather than storing a third state. Anything else
 * replaces it.
 *
 * The field is read through a cast for the reason `readHandback` reads its own
 * through one: this update crossed a process boundary, and a choice that
 * arrived misshapen from a build of main that does not agree with this window
 * is dropped WHOLE rather than partially merged. An option that is not a
 * `{ marker, text }` pair of strings takes the whole CHOICE down with it — not
 * the update, whose excerpt and age are read separately and stay good — and
 * the row keeps the choice it had, because a half-read list of things a person
 * is being asked to choose between is worse than no list at all.
 */
export function readChoice(
  update: SessionActivityInfo
): SessionChoiceInfo | null | undefined {
  const raw = (update as { choice?: unknown }).choice;
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== 'object') return undefined;
  const { atChoice, options } = raw as {
    atChoice?: unknown;
    options?: unknown;
  };
  if (typeof atChoice !== 'boolean') return undefined;
  // Main sends `{ atChoice: false }` on the tick a session stops being at a
  // choice, so the renderer never has to read a clear out of an absence.
  if (!atChoice) return null;
  if (!Array.isArray(options)) return undefined;
  const read: SessionChoiceOption[] = [];
  for (const option of options) {
    if (option === null || typeof option !== 'object') return undefined;
    const { marker, text } = option as { marker?: unknown; text?: unknown };
    if (typeof marker !== 'string' || marker === '') return undefined;
    if (typeof text !== 'string') return undefined;
    read.push({ marker, text });
  }
  // The union's own promise: at a choice with no options cannot be expressed,
  // so an update that claims one is not a choice this window can draw.
  if (read.length === 0) return undefined;
  return { atChoice: true, options: read };
}

/**
 * Read the composed question off one `activity:changed` update.
 *
 * THREE ANSWERS, the same three `readChoice` gives, and the third one arrived
 * with Phase 311. `undefined` is an update that says nothing about the question,
 * which is every ordinary tick, and the record keeps what it had. `null` is main
 * saying the question it had for this session is no longer the question, which it
 * sends as an EMPTY STRING so no surface has to read a clear out of an absence.
 * Anything else replaces the record.
 *
 * WHY THE `null` ARM IS HERE NOW. This reader shipped with two answers and a
 * sentence saying the clear that deleted the CHOICE deleted the question with it,
 * because the question main composed at the time existed only while a choice did.
 * That stopped being true the moment the hook's question landed beside the
 * screen's: a hook fires for a tool call with no numbered choice on the screen at
 * all, and main clears the question on the tick the WAIT ends rather than on the
 * tick the choice does. Main's own clear is the one clear for the question now,
 * and the store writes this record from this reader alone.
 *
 * A misshapen value is `undefined` and never the clear: a number, a null or an
 * object is a build of main that does not agree with this window, and dropping
 * the update is not the same claim as being told there is no question.
 */
export function readQuestion(
  update: SessionActivityInfo
): string | null | undefined {
  const raw = (update as { question?: unknown }).question;
  if (typeof raw !== 'string') return undefined;
  if (raw === '') return null;
  return raw;
}

/**
 * The option rows a surface draws for this session, and `[]` when it draws
 * none. THE ONE QUESTION EVERY SURFACE ASKS.
 *
 * ONE condition, and the operator's ruling of 2026-09-21 is why it is one
 * rather than two. `atChoice` rides the same predicate that decides
 * `needs_input`, but the state machine only turns a dialog into `needs_input`
 * after its confirm ticks (`DIALOG_CONFIRM_TICKS`,
 * `src/main/activity/state-machine.ts`), so a screen that has just drawn a gate
 * can be at a choice for a tick or two while the row still reads `working`.
 * Options under a working dot would be one surface contradicting the dot beside
 * it.
 *
 * THAT GATE IS MAIN'S AND IT IS NOT REPEATED HERE. Main claims
 * `{ atChoice: true, options }` only when the status it stamps in the same tick
 * is `needs_input`, and `{ atChoice: false }` otherwise — so `atChoice` already
 * means "at a choice AND the row says so", and nothing downstream has to
 * remember the gate. A later round must not add a status argument back to this
 * function: the moment a second surface has to remember the same condition, one
 * of them forgets it, and the phone is the surface that would forget.
 *
 * The rows come back in the order the agent drew them, and each one keeps the
 * MARKER THE AGENT DREW rather than its position in this array. An agent that
 * numbers its choices as 1, 2, 4, or that renumbers them after a scroll, would
 * be misreported by an index-derived numeral — and the numeral is the one part
 * of the row a person would act on.
 */
export function choiceOptionsFor(
  choice: SessionChoiceInfo | undefined
): readonly SessionChoiceOption[] {
  if (choice === undefined || !choice.atChoice) return [];
  return choice.options;
}

/**
 * Whether this session is at a numbered choice as far as any surface is
 * concerned.
 *
 * The same condition, asked as a question instead of as a list, so a surface
 * deciding whether to open a block does not read `length` off an array it then
 * throws away.
 */
export function atNumberedChoice(choice: SessionChoiceInfo | undefined): boolean {
  return choiceOptionsFor(choice).length > 0;
}
