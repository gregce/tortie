/**
 * What the sign in program printed, turned into one class and one piece of copy
 * (Phase 68, research 51 section 4.2, the failure vocabulary).
 *
 * ## Why the copy is composed here and not in the renderer
 *
 * Ten of these eleven classes are calm. One is not. A changed host key means
 * the program is warning that the machine presenting itself is not the machine
 * that presented itself before, and somebody may be reading the connection.
 * That case gets its own alarming state and it may never share calm copy with
 * a dead machine.
 *
 * If the renderer composed these sentences, a later edit to a renderer file
 * could draw the alarm case calmly and nothing would fail. So the sentences
 * come from main on the outcome, and `alarm` is a field rather than a rule the
 * renderer applies.
 *
 * ## What is calm on purpose
 *
 * An expired key, a changed permission and a machine that is switched off all
 * read as ordinary. They are ordinary. Tortie handles no keys and no passwords,
 * so the person's own ssh agent, their own ssh settings and their tailnet
 * decide those, and telling them to panic about a key rotation would teach them
 * to ignore the one message that matters.
 *
 * ## What this cannot do, stated plainly
 *
 * The matching below is against fixture text taken from the ssh clients this
 * build was written against. It is pinned by unit tests, not by golden files
 * captured per tested remote version. Those golden files belong to Phase 69,
 * and research 51 section 7 prices them. A message this table does not
 * recognise comes back as `unknown` carrying the last line the program printed,
 * which is honest and is not a guess.
 */

import type { MachineTestClass } from '@shared/ipc';

/** One class, its copy, and whether it is the alarming one. */
export interface MachineOutcomeCopy {
  readonly class: MachineTestClass;
  readonly alarm: boolean;
  readonly headline: string;
  readonly detail: string;
}

/**
 * The one class that sets `alarm`. Named so a test and the conformance gate can
 * say "exactly this one and no other" without repeating the string.
 */
export const MACHINE_ALARM_CLASS: MachineTestClass = 'host-key-changed';

/**
 * The phrases that mean the machine's identity changed.
 *
 * `Host key verification failed` on its own is not one of them, because it is
 * also what a first contact refusal prints. It counts only when one of the
 * first two phrases came with it, which is what the matcher below checks.
 */
const HOST_KEY_ALARM_PHRASES = [
  'REMOTE HOST IDENTIFICATION HAS CHANGED',
  'POSSIBLE DNS SPOOFING'
];

/** Everything else, matched in order, first hit wins. */
const PHRASE_TABLE: readonly {
  readonly cls: MachineTestClass;
  readonly phrases: readonly string[];
}[] = [
  {
    cls: 'not-resolved',
    phrases: ['Could not resolve hostname', 'nodename nor servname provided']
  },
  { cls: 'refused', phrases: ['Connection refused'] },
  {
    cls: 'unreachable',
    phrases: [
      'No route to host',
      'Network is unreachable',
      'Operation timed out',
      'Connection timed out',
      'Host is down'
    ]
  },
  {
    cls: 'auth-refused',
    phrases: [
      'Permission denied',
      'Too many authentication failures',
      'no matching host key type'
    ]
  }
];

/** The copy for every class. Every entry is filled, and the gate checks that. */
const COPY: Readonly<Record<MachineTestClass, MachineOutcomeCopy>> = {
  ok: {
    class: 'ok',
    alarm: false,
    headline: 'This machine answered.',
    // The path is appended by the composer below, because it is a fact from
    // this run rather than a fixed sentence.
    detail: 'Tortie will run'
  },
  'host-key-changed': {
    class: 'host-key-changed',
    alarm: true,
    headline: 'The identity of this machine changed.',
    detail:
      'The program reports that the key this machine presented is not the key ' +
      'it presented before. Somebody may be reading this connection, or the ' +
      'machine may have been rebuilt. Tortie did not connect, and it changed ' +
      'nothing on either machine. Find out why before you try again.'
  },
  unreachable: {
    class: 'unreachable',
    alarm: false,
    headline: 'Tortie could not reach this machine.',
    detail:
      'Nothing was changed on either machine. The machine may be off, asleep, ' +
      'or off the network.'
  },
  refused: {
    class: 'refused',
    alarm: false,
    headline: 'That machine answered and refused the connection.',
    detail:
      'Something is at that address and it is not accepting connections on ' +
      'this port.'
  },
  'not-resolved': {
    class: 'not-resolved',
    alarm: false,
    headline: 'Nothing on this network answers to that address.',
    detail:
      'Check the address, or pick the machine from your tailnet instead of ' +
      'typing it.'
  },
  'auth-refused': {
    class: 'auth-refused',
    alarm: false,
    headline: 'The machine refused your sign in.',
    detail:
      'Tortie does not handle keys or passwords. Your own ssh agent, your own ' +
      'ssh settings and your tailnet decide this. An expired key and a changed ' +
      'permission both look like this.'
  },
  'no-program': {
    class: 'no-program',
    alarm: false,
    headline: 'The machine answered, and Tortie found no program to run on it.',
    detail:
      'Install tmux on that machine, or type the full path under Advanced.'
  },
  'client-missing': {
    class: 'client-missing',
    alarm: false,
    headline: 'This Mac has no ssh program at /usr/bin/ssh.',
    detail:
      'Tortie cannot reach any machine without it. This is a broken system ' +
      'rather than a broken machine.'
  },
  cancelled: {
    class: 'cancelled',
    alarm: false,
    headline: 'You stopped the test.',
    detail: 'Nothing was changed on either machine.'
  },
  'timed-out': {
    class: 'timed-out',
    alarm: false,
    headline: 'The test ran out of time.',
    detail:
      'Nothing was changed on either machine. Tortie stopped the program it ' +
      'had started.'
  },
  unknown: {
    class: 'unknown',
    alarm: false,
    headline: 'Tortie could not reach this machine, and it does not recognise the reason.',
    // The last printed line is appended by the composer below.
    detail: 'The last line the program printed was:'
  }
};

/** Every class, for the conformance gate and the tests. */
export const MACHINE_OUTCOME_CLASSES: readonly MachineTestClass[] = Object.keys(
  COPY
) as MachineTestClass[];

/** The copy for one class, with nothing appended. Pure. */
export function machineOutcomeCopy(cls: MachineTestClass): MachineOutcomeCopy {
  return COPY[cls];
}

/**
 * Read the program's output and name the class.
 *
 * Pure, and it never looks at the exit code. A client can exit non zero for a
 * reason the text already explains, and a client can exit zero having printed
 * nothing useful, so the text is the evidence and the caller decides what an
 * empty answer means.
 */
export function classifyMachineOutput(text: string): MachineTestClass {
  const alarming = HOST_KEY_ALARM_PHRASES.some((p) => text.includes(p));
  if (alarming) return 'host-key-changed';
  for (const entry of PHRASE_TABLE) {
    if (entry.phrases.some((p) => text.includes(p))) return entry.cls;
  }
  return 'unknown';
}

/** The last line the program printed, for the `unknown` case. */
export function lastPrintedLine(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  return lines[lines.length - 1] ?? '';
}

/**
 * The finished copy for one outcome.
 *
 * Two classes carry a fact from this run. `ok` names the path the machine
 * reported, and `unknown` names the last line it printed. Everything else is
 * the fixed sentence.
 */
export function composeOutcomeCopy(
  cls: MachineTestClass,
  facts: { resolvedPath?: string | null; lastLine?: string }
): MachineOutcomeCopy {
  const base = COPY[cls];
  if (cls === 'ok') {
    const path = facts.resolvedPath ?? '';
    return { ...base, detail: `Tortie will run ${path} on it.` };
  }
  if (cls === 'unknown') {
    const line = facts.lastLine ?? '';
    return {
      ...base,
      detail:
        line.length > 0
          ? `The last line the program printed was: ${line}`
          : 'The program printed nothing Tortie could read.'
    };
  }
  return base;
}
