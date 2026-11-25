/**
 * Tortie's own status line runs, told apart from an agent's tools (Phase 374).
 *
 * WHY. With the Antigravity meter on, agy runs Tortie's script several times a
 * turn and on a key. A descendant that leads a session is an agent's tool to
 * the verdict (`hasToolChild` and `hasTerminalTool`, ./process.ts), and whether
 * agy starts its status line that way is not known. If it does, an idle session
 * with the meter on would read as working whenever a tick met a run, and a
 * session with the meter off has no such runs. So the runs are not evidence,
 * whichever way agy starts them.
 *
 * THE RULE IS NARROW. It is asked only of an Antigravity session and only for a
 * descendant that leads a session. Such a descendant is not a tool when its
 * command line is Tortie's run, word for word at both ends. And when its own
 * PARENT is an agy started with Tortie's status line, it is not one either when
 * it is still the copy of that parent that has not started its program, or when
 * it has gone by the time it is asked about. A run is over in about 10 ms,
 * so most are gone. THE LAST ONE IS A TRADE, stated: in such a session a tool
 * that ended inside the few milliseconds between the table and the question is
 * not evidence for that one tick. Every other descendant is a tool exactly as
 * it was, and so is every descendant of an agy started without the flag.
 *
 * It sets no status and starts no process of its own: the command lines are
 * read by the monitor's one reader, and a descendant judged to be a tool is
 * remembered so a long tool is asked about once.
 */

import { carriesAntigravityStatusLine, isAntigravityStatusRun } from '../usage/antigravity/script';
import { descendants, type ProcSnapshot } from './process';

/** The most session leaders asked about for one session on one tick. */
export const STATUS_RUN_READS = 8;

/** The descendants of a pane that lead a session, by this table. */
export function sessionLeadersUnder(snap: ProcSnapshot, root: number): number[] {
  return descendants(snap, root).filter((pid) => (snap.stat.get(pid) ?? '').includes('s'));
}

/** What `ps` prints for a process that is ending: its name in brackets, or the word. */
function isEnding(command: string): boolean {
  return /^\(.*\)$/.test(command) || command === '<defunct>';
}

/**
 * Is this session leader one of Tortie's own runs? `command` and `parent` are
 * the two command lines, null for a process that has gone.
 */
export function isStatusLineRun(command: string | null, parent: string | null): boolean {
  if (command !== null && isAntigravityStatusRun(command)) return true;
  if (parent === null || !carriesAntigravityStatusLine(parent)) return false;
  return command === null || command === parent || isEnding(command);
}

/** The same table with these processes no longer leading a session. Nothing else about them moves. */
export function withoutLeaders(snap: ProcSnapshot, pids: ReadonlySet<number>): ProcSnapshot {
  if (pids.size === 0) return snap;
  const stat = new Map(snap.stat);
  for (const pid of pids) stat.set(pid, (stat.get(pid) ?? '').replace('s', ''));
  return { ...snap, stat };
}
