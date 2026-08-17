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
 * The matching below is against text taken from the ssh clients this build was
 * written against. Phase 69 added the golden files research 51 section 7 priced:
 * `__tests__/golden/` holds one captured file per class that a real program
 * actually prints, plus a manifest naming the ssh client version, the remote tmux
 * version and the exit code each one was captured at. Four classes have no golden
 * on purpose, and the manifest says which and why: Tortie produces those
 * sentences and no program prints them, so a file for one would look like a
 * measurement while being a fixture.
 *
 * A message this table does not recognise comes back as `unknown` carrying the
 * last line the program printed, which is honest and is not a guess.
 *
 * ## The three classes Phase 69 added
 *
 *  - `no-server` is a machine that answered and has nothing of Tortie's running
 *    on it. Research 51 section 4.4 requires it be told apart from `refused`,
 *    which is the far side declining the connection. MEASURED 2026-08-17: ssh
 *    exits 255 for its OWN failures and otherwise passes the far side command's
 *    exit code straight through, and tmux exits 1 with `no server running on
 *    <socket>` on stderr. tmux never exits 255. So the text decides and the exit
 *    code corroborates.
 *  - `version-unmeasured` is a machine running a version nobody measured.
 *    `alarm` is false, because it is not a security event.
 *  - `prepared` is the success answer of Prepare.
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
  // FIRST among the connection outcomes, ahead of `refused`, because this text
  // comes from tmux on a machine that DID answer. Research 51 section 4.4
  // requires the two be told apart, and a machine with no server is the ordinary
  // answer for one Tortie has not prepared, while a refusal is the far side
  // declining. Matching it before `refused` costs nothing, because the phrases
  // never appear together.
  //
  // BOTH sentences are here, and the second one is the one a real capture
  // produced. MEASURED 2026-08-17 by `build/capture-machine-goldens.mjs`, over a
  // real connection to a scratch sshd, with a socket name nothing had ever used:
  //
  //   exit 1, stderr "error connecting to /private/tmp/tmux-501/<socket>
  //                   (No such file or directory)"
  //
  // The other sentence, "no server running on <path>", is what tmux prints when
  // the socket FILE is there and nothing is listening. Both mean a machine with
  // nothing of Tortie's on it, so both are this class. `./remote-server.ts`
  // explains why the LOCAL restore decision deliberately treats the two
  // differently, and why that difference does not apply here.
  { cls: 'no-server', phrases: ['no server running on', 'error connecting to'] },
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
  },
  'no-server': {
    class: 'no-server',
    alarm: false,
    headline: "That machine answered, and nothing of Tortie's is running on it yet.",
    detail:
      'This is the ordinary answer for a machine Tortie has not prepared. ' +
      'Prepare it, and Tortie starts what it needs.'
  },
  'version-unmeasured': {
    class: 'version-unmeasured',
    alarm: false,
    headline: 'Tortie has not measured the program this machine runs.',
    // The versions and the path are appended by the composer below, because they
    // are facts from this run rather than a fixed sentence.
    detail:
      'Tortie will not use a version it has not measured, because an untested ' +
      'one can hang instead of failing.'
  },
  prepared: {
    class: 'prepared',
    alarm: false,
    headline: 'This machine is ready.',
    // The path and the version are appended by the composer below.
    detail: 'Tortie started the program on this machine.'
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
 * Four classes carry a fact from this run. `ok` names the path the machine
 * reported, `unknown` names the last line it printed, and `prepared` and
 * `version-unmeasured` name the path plus the versions. Everything else is the
 * fixed sentence.
 */
export function composeOutcomeCopy(
  cls: MachineTestClass,
  facts: {
    resolvedPath?: string | null;
    lastLine?: string;
    version?: string | null;
    supportedPhrase?: string;
    /** True when this visit created the server rather than finding it. */
    serverBorn?: boolean;
  }
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
  if (cls === 'prepared') {
    // MEASURED, and it is why this sentence has two shapes. The first build said
    // "Tortie started the program" whatever happened, and the screenshot of a
    // prepared row then carried that sentence directly above the honesty line
    // "The program was already running on that machine, so Tortie left it
    // running." The two contradicted each other on screen. Which one is true is
    // a fact about the machine, so the sentence follows the fact.
    const path = facts.resolvedPath ?? '';
    const version = facts.version ?? '';
    return {
      ...base,
      detail:
        (facts.serverBorn === true
          ? `Tortie started the program at ${path} on this machine and set it ` +
            `up the way it needs.`
          : `The program at ${path} was already running on this machine, so ` +
            `Tortie left it running and set it up the way it needs.`) +
        ` The machine reports version ${version}.`
    };
  }
  if (cls === 'version-unmeasured') {
    return { ...base, detail: composeUnmeasuredDetail(facts) };
  }
  return base;
}

/**
 * The two shapes of the unmeasured refusal, and both name what was not changed.
 *
 * The first is a machine that reported a version Tortie has not measured. The
 * second is a machine that would not report one at all, which reuses this class
 * because the answer to the person is the same: Tortie will not use it, and
 * nothing was changed.
 *
 * TORTIE NAMES NO INSTALL COMMAND, on purpose. It does not know that machine's
 * operating system or how software is installed on it, and a guessed command is
 * worse than none.
 */
function composeUnmeasuredDetail(facts: {
  resolvedPath?: string | null;
  version?: string | null;
  supportedPhrase?: string;
}): string {
  const path = facts.resolvedPath ?? '';
  const supported = facts.supportedPhrase ?? '';
  if (facts.version === null || facts.version === undefined) {
    return (
      `The program at ${path} on this machine would not report its version. ` +
      `Tortie will not use a program it cannot identify. Nothing was changed ` +
      `on either machine.`
    );
  }
  return (
    `The copy at ${path} on this machine reports version ${facts.version}. ` +
    `Tortie has measured ${supported}. Tortie will not use a version it has ` +
    `not measured, because an untested one can hang instead of failing, and a ` +
    `hang looks like Tortie freezing on work you care about. Nothing was ` +
    `changed on either machine. Update the program on that machine to a ` +
    `version Tortie has measured, then prepare it again.`
  );
}
