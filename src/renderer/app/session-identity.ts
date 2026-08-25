/**
 * What a session calls itself, and where its conversation lives on disk
 * (Phase 152).
 *
 * THE ONE THING THIS FILE EXISTS TO KEEP STRAIGHT. A Tortie session carries
 * TWO identifiers and they are not interchangeable.
 *
 *  - The AGENT'S CONVERSATION ID is the one a person reads, copies and hands
 *    to the agent. It is what `--resume` takes and it is what names the record
 *    on disk. It is absent on a shell, and absent on an agent session until
 *    that agent has written a conversation id down.
 *  - TORTIE'S OWN SESSION ID is the manifest primary key, the `@gmux-id` tmux
 *    option and the `GMUX_SESSION_ID` pane stamp. A person reading a log or a
 *    manifest needs it, and it resumes nothing.
 *
 * Copying the wrong one gets a person nothing, so every row here says WHOSE
 * identifier it is in its label, and the value itself is drawn in the grey
 * second line under it. That is why the menu is also the surface that shows
 * these values rather than only copying them.
 *
 * THE HONEST LIMIT, measured in Phases 141 and 138.1 rather than assumed. Some
 * agents hand Tortie no conversation id at all, one keeps no record a reader
 * can open, a fresh conversation has written nothing yet, and a session on
 * another machine keeps its record over there. A row that would copy something
 * Tortie does not have is drawn disabled with the reason under it, and never
 * copies an empty string. That follows `Show what it loaded…` and `Show saved
 * output`, which are disabled with the reason for the same stated reason: a
 * verb that vanishes teaches nothing.
 */

import type { Session, SessionRecordAbsence } from '@shared/types';
import type { MenuItemSpec } from '../state/store';
import { useApp } from '../state/store';
import { agentShortLabel } from '../state/agents';
import { displayPath } from '../format';

// ---------------------------------------------------------------------------
// The words
// ---------------------------------------------------------------------------

/** The row he asked for, and it leads the copy group. */
export const COPY_CONVERSATION_ID = "Copy the agent's conversation id";
/** The row that answers "where does this session live natively on disk". */
export const COPY_RECORD_PATH = "Copy the agent's record path";
/** The labelled secondary. Never presented as a substitute for the first. */
export const COPY_TORTIE_SESSION_ID = "Copy Tortie's session id";

/**
 * Why there is no conversation id to copy.
 *
 * Short on purpose. The row's tooltip already carries the per agent reason a
 * restart brings back a directory, written by `resumeNote`, and repeating it
 * here would be a second copy of a sentence that can then drift.
 */
export function noConversationIdNote(session: Session): string {
  if (session.agent === 'shell') return 'A shell session has no conversation.';
  return 'Tortie has no conversation id for this session.';
}

/** Why there is no record path to copy, one sentence per measured reason. */
export function noRecordPathNote(
  session: Session,
  absence: SessionRecordAbsence
): string {
  const label = agentShortLabel(session.agent);
  switch (absence) {
    case 'shell':
      return 'A shell session keeps no record on disk.';
    case 'remote':
      return `The record is on ${session.machine?.label ?? 'that machine'}, not on this Mac.`;
    case 'no-id':
      return 'Tortie needs the conversation id to find the record.';
    case 'not-yet':
      return 'Tortie found no record for this conversation on disk.';
    case 'no-store':
      return `${label} keeps no record Tortie can read.`;
    case 'unsupported':
      return `Tortie does not know where ${label} keeps its records.`;
  }
}

/**
 * THE one answer to "does this session have a conversation id", null when it
 * does not.
 *
 * IT IS ONE FUNCTION BECAUSE THE TOOLTIP AND THE MENU ROW MUST NEVER DISAGREE.
 * The fix round found the tooltip line and the menu row each carrying their own
 * copy of the same test. They agreed over all 136 of the operator's real rows,
 * so nothing was wrong on the day, but Phase 141 already paid for what happens
 * when one of two copies is edited later: a surface says a value the row does
 * not draw. An empty string counts as absent, because a row that copied one
 * would put nothing on the clipboard and say it had copied an id.
 */
export function conversationIdOf(session: Session): string | null {
  const id = session.agentSessionId;
  return id === undefined || id === '' ? null : id;
}

/**
 * The tooltip's conversation line, or null when there is nothing to name.
 *
 * The full id rather than a shortened one. A person hovers a row to READ this
 * value and compare it against what an agent printed, and half a uuid answers
 * neither question.
 *
 * NULL rather than a sentence when there is none, and that is a deliberate
 * refusal. Every row on the list would otherwise gain a line saying what it
 * does not have, and a tooltip that grows on every row is how a tooltip stops
 * being read. The menu is where a person goes looking for the id, so the menu
 * is where the honest sentence is drawn.
 */
export function conversationTooltipLine(session: Session): string | null {
  const id = conversationIdOf(session);
  return id === null ? null : `Conversation ${id}`;
}

// ---------------------------------------------------------------------------
// The rows
// ---------------------------------------------------------------------------

/**
 * One copy verb. `value` goes on the clipboard and a toast names what landed,
 * so a person knows which of the two identifiers they now hold.
 *
 * `shows` is the grey second line. It is separate from `value` because the two
 * are not always the same string: a record path is drawn in its `~` form and
 * copied absolute. A row that draws nothing under its label omits it.
 *
 * This is the only place in this file that touches the clipboard, so a row
 * that copies an empty string cannot appear by accident: every caller has
 * already proved it holds a value.
 */
export function copyMenuItem(spec: {
  label: string;
  value: string;
  shows?: string;
  copied: string;
  failed: string;
}): MenuItemSpec {
  return {
    label: spec.label,
    ...(spec.shows !== undefined ? { sublabel: spec.shows } : {}),
    run: () => {
      void navigator.clipboard.writeText(spec.value).then(
        () => useApp.getState().toast('info', spec.copied),
        () => useApp.getState().toast('error', spec.failed)
      );
    }
  };
}

/** The disabled form: the same label, the reason under it, and no copy. */
function refusedMenuItem(label: string, why: string): MenuItemSpec {
  return { label, sublabel: why, disabled: true, run: () => {} };
}

/** The agent's conversation id, leading the copy group. */
export function conversationIdItem(session: Session): MenuItemSpec {
  const id = conversationIdOf(session);
  if (id === null) {
    return refusedMenuItem(COPY_CONVERSATION_ID, noConversationIdNote(session));
  }
  // The id in full under the label. A person hovering this menu is here to
  // READ which conversation this is as well as to copy it, and half a uuid
  // answers neither question.
  return copyMenuItem({
    label: COPY_CONVERSATION_ID,
    value: id,
    shows: id,
    copied: 'Conversation id copied',
    failed: 'Could not copy the conversation id'
  });
}

/**
 * The path of the record the agent keeps this conversation in.
 *
 * The value is stamped on the projection by main, which derived it with the
 * one resolver Tortie has, and that resolver reports a path only after a stat
 * proved it names a real file. So a drawn path opens, and this file does no
 * checking of its own, which it could not do anyway with no Node in the
 * renderer.
 */
export function recordPathItem(session: Session): MenuItemSpec {
  const path = session.recordPath;
  if (path === undefined || path === '') {
    return refusedMenuItem(
      COPY_RECORD_PATH,
      noRecordPathNote(session, session.recordAbsence ?? 'not-yet')
    );
  }
  // The clipboard gets the ABSOLUTE path, because that is what a terminal and
  // an editor can both open. The grey line gets the `~` form, because the home
  // directory is the same on every row and the readable part is the rest.
  return copyMenuItem({
    label: COPY_RECORD_PATH,
    value: path,
    shows: displayPath(path),
    copied: 'Record path copied',
    failed: 'Could not copy the record path'
  });
}

/** Tortie's own id. Always present, because Tortie always knows it. */
export function tortieSessionIdItem(session: Session): MenuItemSpec {
  return copyMenuItem({
    label: COPY_TORTIE_SESSION_ID,
    value: session.id,
    shows: session.id,
    copied: "Tortie's session id copied",
    failed: "Could not copy Tortie's session id"
  });
}

/**
 * The three rows, in the order he asked for: the agent's conversation id
 * first, then where its record lives, then Tortie's own id last as the
 * labelled secondary.
 *
 * They sit immediately above `Copy directory path` so all four copy verbs are
 * one block, and that row is unchanged in both what it says and what it does.
 */
export function sessionIdentityItems(session: Session): MenuItemSpec[] {
  return [
    conversationIdItem(session),
    recordPathItem(session),
    tortieSessionIdItem(session)
  ];
}
