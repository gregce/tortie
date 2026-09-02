/**
 * What one read at the end of a remote create is allowed to prove (Phase 117).
 *
 * IT IS PURE. It runs no command, opens no database, reads no file and touches
 * no map. It takes an answer or a thrown error and returns one of three words.
 * Composing the read and acting on the answer is `./remote-sessions.ts`'s work,
 * and it is on its own here for the same reason `./restore-gate.ts` is: the
 * table can be read and tested without a machine in the room.
 *
 * ## The defect this exists to close, in the order it used to happen
 *
 * A remote create sends `new-session` and the reply is lost. One read then asks
 * the machine whether the session is there. That read used to be wrapped in a
 * catch that answered null for every failure, and the caller read null as
 * nothing running, so it deleted the durable row and told the person that
 * nothing was started. The session was running on the other machine, and after
 * the row was deleted nothing on this Mac recorded it.
 *
 * A machine that did not answer is not a machine that answered no. So the read
 * has THREE answers rather than two:
 *
 *   present       the machine answered and holds this create's own session
 *   provenAbsent  the machine answered and does not hold it
 *   unreachable   nobody could read an answer, so nothing is proved either way
 *
 * The default sits on `unreachable`, and that is the whole of the fix. Only the
 * two cases below, which are both a completed answer from tmux itself, can
 * delete anything.
 *
 * ## The variable is NOT named on the read line, and that is measured
 *
 * `confirmationArgs` sends `show-environment -t =NAME` and asks for the whole
 * environment. It used to name `GMUX_SESSION_ID` on the line. MEASURED on tmux
 * 3.6a, 2026-08-17, on a scratch socket, and recorded in the header of
 * `./pane-env-rescue.ts`:
 *
 *   show-environment -t $0 GMUX_SESSION_ID   exit 1, "unknown variable: GMUX_SESSION_ID"
 *   show-environment -t $0                   exit 0, 9 lines, none of them ours
 *   show-environment -t $1                   exit 0, "GMUX_SESSION_ID=abc123"
 *
 * Naming the variable makes tmux exit non zero for the ordinary case, being a
 * session that is not this create's. The exec plane turns a non zero exit into a
 * thrown error, and this file's whole job is telling an error that says "not
 * there" apart from an error that says nothing. With the variable named, those
 * two are the same error. The rescue learned this first and the confirmation
 * learns it here.
 */

import { gmuxErrorPayloadOf } from '../errors';
import { serverProbeVerdict } from '../tmux/errors';

/** The answer one confirmation read produced. */
export type RemoteCreateConfirmation =
  | { readonly kind: 'present'; readonly tmuxId: string }
  | { readonly kind: 'provenAbsent'; readonly why: string }
  | { readonly kind: 'unreachable'; readonly why: string };

/** The three kinds, in this order, for the gate and the tests. */
export const CONFIRMATION_KINDS = [
  'present',
  'provenAbsent',
  'unreachable'
] as const;

/**
 * The one read the confirmation sends, composed in one place.
 *
 * `=NAME` is an exact name match rather than a prefix, which is the same rule
 * every other verb in this directory follows. The variable is deliberately not
 * on the line. See the header for the three measurements behind that.
 */
export function confirmationArgs(tmuxName: string): string[] {
  return ['show-environment', '-t', `=${tmuxName}`];
}

/**
 * An answer that came back, judged against the id this create generated.
 *
 * `present` only when one line of the environment is exactly this create's own
 * id. A session of the same name carrying somebody else's id is `provenAbsent`
 * for THIS create, because the question is never "is a session called this
 * there" and always "is the session this call just asked for there".
 */
export function readConfirmationEnvironment(
  stdout: string,
  sessionId: string
): 'present' | 'provenAbsent' {
  if (sessionId.length === 0) return 'provenAbsent';
  for (const line of stdout.split('\n')) {
    if (line.trim() === `GMUX_SESSION_ID=${sessionId}`) return 'present';
  }
  return 'provenAbsent';
}

/**
 * A read that threw. THIS IS THE ONLY PLACE THE TWO ARE TOLD APART.
 *
 * The table, and every row names the evidence rather than the feeling:
 *
 *   no server running on <path>       provenAbsent  tmux answered and said it
 *                                                   holds no server at all,
 *                                                   which is a completed answer
 *                                                   of zero sessions. `onePass`
 *                                                   already applies this rule to
 *                                                   a failed list
 *   no such session / can't find      provenAbsent  tmux answered and named the
 *   session / session not found                     session as missing. All
 *                                                   three sentences are tmux's
 *                                                   own, and the first one is
 *                                                   what 3.6a prints for
 *                                                   show-environment
 *   TMUX_UNREACHABLE                  unreachable   ssh could not reach, was
 *                                                   refused, or the name did not
 *                                                   resolve
 *   INVALID_INPUT from the machine    unreachable   the machine refused the
 *   taxonomy, being host-key-changed                caller rather than answering
 *   or auth-refused                                 the question
 *   TMUX_NOT_FOUND                    unreachable   this Mac has no sign in
 *                                                   program, so nothing was
 *                                                   asked
 *   a timeout or a killed child       unreachable   no answer arrived
 *   anything else                     unreachable   an answer nobody can read is
 *                                                   not evidence of absence
 *
 * The last row is where the old broad catch was wrong, and it is where the
 * default now sits.
 */
export function classifyConfirmationFailure(
  err: unknown
): 'provenAbsent' | 'unreachable' {
  // tmux's own "no server running on <path>", and nothing else. The verdict
  // reads the same stderr sentence the local reconcile boundary reads, so the
  // two paths cannot drift apart on what counts as a completed death.
  if (serverProbeVerdict(err) === 'no-server') return 'provenAbsent';
  // Phase 200: the payload is read by SHAPE, through the same reader the
  // verdict above uses, so a value from a second loader is the same value
  // here. A malformed payload is null and falls to the message read below,
  // where an unread answer keeps the row.
  const payload = gmuxErrorPayloadOf(err);
  if (payload !== null) {
    if (payload.code === 'SESSION_NOT_FOUND') return 'provenAbsent';
    return sessionNamedAsMissing(payload.detail ?? '')
      ? 'provenAbsent'
      : 'unreachable';
  }
  return sessionNamedAsMissing(err instanceof Error ? err.message : String(err))
    ? 'provenAbsent'
    : 'unreachable';
}

/**
 * The sentences tmux prints when it answered and the session is not there.
 *
 * MEASURED 2026-08-20 on tmux 3.6a from /opt/homebrew/bin/tmux, on a scratch
 * socket holding one real session:
 *
 *   show-environment -t '=p117-absent-1'   exit 1, "no such session: =p117-absent-1"
 *
 * `no such session` is the sentence THIS verb prints, and it was missing from
 * the pair the local classifier has always carried. Without it a machine that
 * answered and named the session as missing was read as a machine that did not
 * answer, so its row was kept for ever and the negative case could never
 * happen. The same three sentences are in `../tmux/errors.ts`, and the two
 * lists are one list on purpose.
 */
function sessionNamedAsMissing(text: string): boolean {
  return /no such session|can't find session|session not found/i.test(text);
}

/**
 * What the caller does with each kind. One row, one action, and nothing derived
 * twice.
 *
 *   present       bind        the create finishes on the identifier it read
 *   provenAbsent  dropRow     the durable row is deleted and the create fails
 *   unreachable   keepUnknown the row is kept and its status column says unknown
 */
export function confirmationDisposition(
  confirmation: RemoteCreateConfirmation
): 'bind' | 'dropRow' | 'keepUnknown' {
  switch (confirmation.kind) {
    case 'present':
      return 'bind';
    case 'provenAbsent':
      return 'dropRow';
    default:
      return 'keepUnknown';
  }
}

/** The reason a confirmation carries, for a log line and a refusal detail. */
export function confirmationWhy(
  confirmation: RemoteCreateConfirmation
): string {
  return confirmation.kind === 'present'
    ? `the machine holds ${confirmation.tmuxId}`
    : confirmation.why;
}
