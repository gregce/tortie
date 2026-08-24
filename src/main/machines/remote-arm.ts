/**
 * Arming a resume on another machine (Phase 89).
 *
 * ## What this module does, in one paragraph
 *
 * It composes the command that continues one conversation, types that command
 * into one session on one machine, and then reads that machine's screen to say
 * what happened. It never presses Enter. The person presses Enter, which is the
 * same promise the local restore in `../restore/restore.ts` has always made.
 *
 * ## The five rules, and each one has a seat in the code below
 *
 *  1. THE BYTES ARE COMPOSED BY TORTIE. Every element of the argv after the
 *     program path has to be a token the compiled build already holds, or the
 *     row's own conversation id. {@link armedResumeTokens} is that list and
 *     {@link composeArmedResumeText} is the check. A folder, a session name, a
 *     machine address or a person's free text cannot be in it, because none of
 *     them is in the compiled build.
 *  2. ONE CALL SITE. `sendArmedResumeText` in `./exec-plane.ts` is the only
 *     function that can send the verb, and this file is its only product
 *     caller. `build/conformance-machines.mjs` counts the call sites.
 *  3. ENTER IS NEVER SENT. The door composes its own argv and refuses a text
 *     carrying a newline, a carriage return or any other control character.
 *  4. THE SCREEN IS READ BEFORE AND AFTER. `send-keys` is not safe to run
 *     twice, so a second copy has to be FOUND rather than assumed away. The
 *     counts are what decide the landing.
 *  5. THE LEDGER ROW SAYS SO. The row for `send-keys` reads `unsafe` and names
 *     this read back as its guard.
 *
 * ## Which layer enforces which rule, said plainly so neither is overclaimed
 *
 * `sendArmedResumeText` in `./exec-plane.ts` is a door and it checks what a
 * door can check. It refuses a target that is not an immutable identifier, a
 * text that is empty, a text over the cap, and a text carrying a newline, a
 * carriage return or any other control character. IT DOES NOT KNOW WHAT TORTIE
 * COMPOSED, so it cannot refuse a text on those grounds and it does not claim
 * to. Handed one line of printable characters it types that line.
 *
 * RULE 1 IS ENFORCED HERE, in {@link composeArmedResumeText}, and nowhere else.
 * What keeps the door narrow is that this file is its only product caller,
 * which `build/conformance-machines.mjs` counts rather than assumes, and that
 * the only text this file hands it is a text it composed itself out of the
 * compiled agent catalogue.
 *
 * ## Four landings, because "not there" and "could not look" are different
 *
 * | copies after minus copies before | landing   | what a person is told        |
 * | --- | --- | --- |
 * | 1                                | `armed`   | the command is there, press Enter |
 * | 2 or more                        | `twice`   | there are two copies, clear the line |
 * | 0 or fewer                       | `absent`  | Tortie looked and it is not there |
 * | a read failed                    | `unknown` | Tortie could not look |
 *
 * `absent` is a screen Tortie READ. `unknown` is a screen Tortie could not
 * read. Saying "it is not there" when nobody looked is the shape of dishonesty
 * the restore gate already split apart for the same reason.
 *
 * ## It never throws for a machine failure
 *
 * A send that fails, a machine that stopped answering and a read that timed out
 * each become a landing, because the whole point of reading the screen is that
 * a failed send is not the same as an unsent one. Only a programming error
 * throws.
 */

import { getLog } from '../log';
import {
  AGENT_REGISTRY,
  SESSION_ID_SLOT,
  type AgentRegistryEntry
} from '../agents/registry';
import { AGENT_FLAG_PRESETS, NON_REGISTRY_FLAG_PRESETS } from '../agents/flags';
// The SAME composer the local path uses at step 3 of `restoreSession`, so the
// two lines cannot drift into two different quotings of one argv.
import { buildArmedCommand } from '../restore/command';
import { execOn, sendArmedResumeText } from './exec-plane';
import {
  RESUME_ARMED_NOT_PRESSED,
  RESUME_ARM_UNREADABLE,
  RESUME_NOT_COMPOSED,
  RESUME_NOT_LANDED,
  RESUME_TYPED_TWICE
} from './remote-copy';
import { readyRemoteContext } from './ready-context';

const machinesLog = getLog('config');

/**
 * The five sentences, re-exported so a caller has one import.
 *
 * They live in `./remote-copy.ts` with every other sentence main prints about a
 * session on another machine, which is the file the renderer's vocabulary audit
 * reads and the file `build/assert-bundle-refusals.mjs` pins four of them from.
 */
export {
  RESUME_ARMED_NOT_PRESSED,
  RESUME_ARM_UNREADABLE,
  RESUME_NOT_COMPOSED,
  RESUME_NOT_LANDED,
  RESUME_TYPED_TWICE
};

// ---------------------------------------------------------------------------
// The seam
// ---------------------------------------------------------------------------

export interface ArmRemoteResumeInput {
  readonly machineId: string;
  /** The far side's immutable identifier for the session, e.g. "$7". */
  readonly target: string;
  /** The agent id the row records. */
  readonly agent: string;
  /** The conversation id the row records. Never empty on this path. */
  readonly agentSessionId: string;
  /** The resume argv the row records. argv[0] is the path from create day. */
  readonly recordedResumeArgv: readonly string[];
  /** The absolute path that machine reports for the program TODAY. */
  readonly binOnMachine: string;
}

/** Why nothing was typed. One sentence covers all three, and the log names which. */
export type RemoteArmRefusal = 'not-composed' | 'not-one-line' | 'too-long';

/** What the screen said after the send. */
export type RemoteArmLanding = 'armed' | 'twice' | 'absent' | 'unknown';

export interface RemoteArmResult {
  /** Null when the text was refused before anything was sent. */
  readonly landing: RemoteArmLanding | null;
  /** Null when something was sent. */
  readonly refusal: RemoteArmRefusal | null;
  /** The text Tortie composed, or null when it composed none. */
  readonly text: string | null;
  /** The sentence a person reads. Never null, on every arm. */
  readonly note: string;
  /** Copies of the text on the screen before the send. For the log. */
  readonly before: number;
  /** Copies after. For the log. */
  readonly after: number;
}

/**
 * The three things arming does to a machine.
 *
 * IT EXISTS FOR THE UNIT TEST and for nothing else. The default is
 * {@link liveArmTransport}, which is the only implementation any product path
 * ever uses, and it is the only place `sendArmedResumeText` is named. A test
 * transport does not name it, so passing one cannot become a second way to
 * send the verb.
 */
export interface ArmTransport {
  /** What is on that session's screen right now. */
  readScreen(): Promise<string>;
  /** Type one line, with no key press after it. */
  sendText(text: string): Promise<void>;
  /** Wait, so a shell has a moment to echo what tmux delivered. */
  wait(ms: number): Promise<void>;
}

/**
 * How long to wait before the first read back, and before the second.
 *
 * The second read runs only when the first found no change, because a shell
 * echoes the text a moment after tmux delivers it and a screen read too early
 * would report `absent` for a command that is on its way.
 */
const FIRST_READ_WAIT_MS = 150;
const SECOND_READ_WAIT_MS = 350;

/** The cap the door in `./exec-plane.ts` also holds. Asked here so the refusal
 *  is a sentence about the row rather than a throw from the door. */
const ARMED_TEXT_MAX_CHARS = 1000;

// ---------------------------------------------------------------------------
// Rule 1. The tokens Tortie's own compiled build holds
// ---------------------------------------------------------------------------

/** The compiled registry entry for an agent id, or null when there is none. */
function registryEntryFor(agent: string): AgentRegistryEntry | null {
  return AGENT_REGISTRY.find((entry) => entry.id === agent) ?? null;
}

/**
 * Every token that may appear in a resume argv for this agent, besides the
 * program path and the row's own conversation id.
 *
 * It reads the COMPILED CATALOGUE ONLY. An agent a person added in Settings has
 * its flags in the overlay rather than here, so this returns the compiled
 * agent's set or an empty one, and a row carrying an overlay flag is refused.
 * That is the boundary in CLAUDE.md working as written: configuration selects
 * from choices the compiled world already contains.
 */
export function armedResumeTokens(agent: string): ReadonlySet<string> {
  const tokens = new Set<string>();
  const entry = registryEntryFor(agent);
  if (entry !== null) {
    for (const token of entry.resume.template) {
      if (token !== SESSION_ID_SLOT) tokens.add(token);
    }
  }
  const catalogues = [
    (AGENT_FLAG_PRESETS as Record<string, { presets: { flag: string }[] } | undefined>)[
      agent
    ],
    (
      NON_REGISTRY_FLAG_PRESETS as Record<
        string,
        { presets: { flag: string }[] } | undefined
      >
    )[agent]
  ];
  for (const catalogue of catalogues) {
    for (const preset of catalogue?.presets ?? []) {
      for (const word of preset.flag.split(' ')) {
        if (word.length > 0) tokens.add(word);
      }
    }
  }
  return tokens;
}

/** What the composer decided, with a detail the log can name the reason from. */
export interface ComposedArmedText {
  readonly text: string | null;
  readonly refusal: RemoteArmRefusal | null;
  /** Why, in words, for the log. Empty when nothing was refused. */
  readonly detail: string;
}

/**
 * Compose the one line Tortie will type, or refuse and compose nothing.
 *
 * PURE. It spawns nothing, reads no file and contacts no machine, so the unit
 * test drives every arm of it.
 */
export function composeArmedResumeText(
  input: ArmRemoteResumeInput
): ComposedArmedText {
  const refused = (
    refusal: RemoteArmRefusal,
    detail: string
  ): ComposedArmedText => ({ text: null, refusal, detail });

  const entry = registryEntryFor(input.agent);
  if (entry === null) {
    return refused(
      'not-composed',
      `${input.agent} is not an agent in the compiled registry, so Tortie has ` +
        `no list of its own to check the command against`
    );
  }
  if (entry.resume.strategy !== 'flag-uuid') {
    return refused(
      'not-composed',
      `${input.agent} has resume strategy ${entry.resume.strategy}, and only ` +
        `flag-uuid composes an argv Tortie can type`
    );
  }
  if (input.agentSessionId.length === 0) {
    return refused(
      'not-composed',
      'the row carries no conversation id, and a resume argv without one can ' +
        'open a different conversation'
    );
  }
  if (input.recordedResumeArgv.length === 0) {
    return refused('not-composed', 'the row records no resume command');
  }
  if (!input.binOnMachine.startsWith('/')) {
    return refused(
      'not-composed',
      `the program path ${JSON.stringify(input.binOnMachine)} is not a full ` +
        `path on that machine`
    );
  }
  const slash = input.binOnMachine.lastIndexOf('/');
  const bare = input.binOnMachine.slice(slash + 1);
  if (!entry.binaries.includes(bare)) {
    return refused(
      'not-composed',
      `the program on that machine is called ${JSON.stringify(bare)} and the ` +
        `registry knows ${input.agent} as ${entry.binaries.join(', ')}`
    );
  }

  const argv = [input.binOnMachine, ...input.recordedResumeArgv.slice(1)];
  const allowed = armedResumeTokens(input.agent);
  for (const token of argv.slice(1)) {
    if (token === input.agentSessionId) continue;
    if (allowed.has(token)) continue;
    return refused(
      'not-composed',
      `the element ${JSON.stringify(token)} is neither this row's own ` +
        `conversation id nor a token in Tortie's compiled list for ` +
        `${input.agent}`
    );
  }
  if (!argv.includes(input.agentSessionId)) {
    // A resume argv that lost its id is the failure `bareResumeIsDangerous`
    // records: for gemini a bare `--resume` silently opens the most recent
    // conversation instead of failing, which is somebody else's work.
    return refused(
      'not-composed',
      'the composed command does not carry this row’s conversation id'
    );
  }

  const text = buildArmedCommand(argv);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) {
      return refused(
        'not-one-line',
        `the composed command carries the character ${String(code)} at ` +
          `position ${String(i)}, and a newline typed this way is Enter`
      );
    }
  }
  if (text.length === 0) {
    return refused('not-composed', 'the composed command is empty');
  }
  if (text.length > ARMED_TEXT_MAX_CHARS) {
    return refused(
      'too-long',
      `the composed command is ${String(text.length)} characters and the cap ` +
        `is ${String(ARMED_TEXT_MAX_CHARS)}, because a string longer than one ` +
        `screen cannot be found on one screen`
    );
  }
  return { text, refusal: null, detail: '' };
}

// ---------------------------------------------------------------------------
// Rule 4. The counting, and what the counts mean
// ---------------------------------------------------------------------------

/**
 * Every space, tab and line break taken out of a string.
 *
 * IT IS THE WHOLE FIX FOR THE WRAPPED LINE, so it is worth reading slowly. A
 * screen read is a grid of rows and the counter needs one string, and a command
 * longer than the pane is wide sits on two rows. Joining the rows is not enough
 * on its own, because the break can fall inside a word or beside a space
 * depending on where the wrap happened. Taking every space out of BOTH sides
 * removes the question: the same characters in the same order match whether the
 * shell wrapped the line, printed it whole, or put a space in a different place.
 *
 * WHAT IT COSTS. Two rows that are not one wrapped line are joined too, so a
 * screen whose last row ends with the first half of the command and whose next
 * row begins with the second half would count as one copy. Every character of a
 * resume command would have to be on that screen in that order for it to
 * happen, which is the same thing as the command being there.
 */
function withoutSpaces(value: string): string {
  return value.replace(/\s+/gu, '');
}

/**
 * How many times one string appears in another, ignoring every space and line
 * break on both sides.
 *
 * MEASURED ON THIS MAC, 2026-08-19, tmux 3.6a on a scratch socket, one detached
 * session 40 columns wide, the text below typed with `send-keys -l` and the
 * screen read with `capture-pane -p -J`:
 *
 *   text: /Users/gdc/.local/bin/claude --resume 11111111-2222-4333-8444-5555…
 *
 *   shell     copies found, contiguous   copies found, spaces removed
 *   /bin/sh   1                          1
 *   /bin/zsh  0                          1
 *   /bin/zsh, sent twice   0             2
 *
 * `capture-pane -J` joins a row the TERMINAL wrapped. `/bin/sh` lets the
 * terminal wrap, so `-J` joins it and a contiguous search finds it. `zsh` wraps
 * the line itself and writes its own line break, so tmux never marks the row as
 * wrapped, `-J` has nothing to join, and a contiguous search finds nothing. The
 * operator's own shell is zsh, and on his Mac Pro an armed resume that had
 * landed was reported `absent` and a real double send was never reported
 * `twice`. Both readings are the same defect and this is the fix for it.
 */
export function countOccurrences(haystack: string, needle: string): number {
  const flat = withoutSpaces(needle);
  if (flat.length === 0) return 0;
  const screen = withoutSpaces(haystack);
  let count = 0;
  let at = screen.indexOf(flat);
  while (at !== -1) {
    count += 1;
    at = screen.indexOf(flat, at + flat.length);
  }
  return count;
}

/**
 * The landing, from the two counts and whether a read failed.
 *
 * PURE, so the four answers are driven from synthetic screens in the unit test
 * rather than from a machine.
 */
export function decideArmLanding(
  before: number,
  after: number,
  readFailed: boolean
): RemoteArmLanding {
  if (readFailed) return 'unknown';
  const delta = after - before;
  if (delta >= 2) return 'twice';
  if (delta === 1) return 'armed';
  // A delta of zero is a screen with no new copy on it. A negative delta is a
  // screen that lost one, which happens when the pane scrolled under the read,
  // and it is the same fact to a person: the command Tortie sent is not there.
  return 'absent';
}

/** The sentence for one landing. Every landing has one and none is silent. */
export function noteForLanding(landing: RemoteArmLanding): string {
  switch (landing) {
    case 'armed':
      return RESUME_ARMED_NOT_PRESSED;
    case 'twice':
      return RESUME_TYPED_TWICE;
    case 'absent':
      return RESUME_NOT_LANDED;
    default:
      return RESUME_ARM_UNREADABLE;
  }
}

// ---------------------------------------------------------------------------
// The transport, and the one call site of the door
// ---------------------------------------------------------------------------

/**
 * The real machine. THIS IS THE ONE PLACE `sendArmedResumeText` IS NAMED in the
 * product, and `build/conformance-machines.mjs` fails when a second product
 * file names it.
 */
export function liveArmTransport(
  machineId: string,
  target: string
): ArmTransport {
  const ctx = readyRemoteContext(machineId);
  return {
    // `-p` prints the screen and writes nothing, and `-J` joins wrapped lines so
    // a command longer than the pane is still one contiguous string to search.
    // No `-e`, so no escape sequences come back to be counted.
    readScreen: () => execOn(ctx, ['capture-pane', '-p', '-J', '-t', target]),
    sendText: (text: string) => sendArmedResumeText(ctx, target, text),
    wait: (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      })
  };
}

/**
 * Type the command that continues one conversation into one session on one
 * machine, and say what the screen showed afterwards.
 *
 * @param transport ONLY the unit test and `build/probe-remote-arm.mjs` pass
 *   one. Every product caller takes the default, which is the real machine.
 * @param composed The answer {@link composeArmedResumeText} already gave for
 *   this row, when a caller asked it first. `./remote-restore.ts` asks first
 *   because the answer decides WHAT THE SESSION IS CREATED RUNNING, and a row
 *   whose text is refused has to come back running its own program rather than
 *   a bare shell. Composing is pure, so asking twice would give the same
 *   answer, and passing it through is what makes the two decisions provably the
 *   same one. Every other caller omits it and this function composes.
 */
export async function armRemoteResume(
  input: ArmRemoteResumeInput,
  transport?: ArmTransport,
  composed: ComposedArmedText = composeArmedResumeText(input)
): Promise<RemoteArmResult> {
  if (composed.text === null) {
    machinesLog.warn(
      `Tortie composed no resume command for ${input.agent} on ` +
        `${input.machineId}: ${composed.detail}`
    );
    return {
      landing: null,
      refusal: composed.refusal,
      text: null,
      note: RESUME_NOT_COMPOSED,
      before: 0,
      after: 0
    };
  }
  const text = composed.text;
  const wire = transport ?? liveArmTransport(input.machineId, input.target);

  let readFailed = false;
  let before = 0;
  try {
    before = countOccurrences(await wire.readScreen(), text);
  } catch (err) {
    readFailed = true;
    machinesLog.warn(
      `Tortie could not read ${input.target} on ${input.machineId} before ` +
        `arming it: ${(err as Error).message}`
    );
  }

  let sendDetail = '';
  try {
    await wire.sendText(text);
  } catch (err) {
    // A failed send does NOT decide the answer. The far side can take a command
    // and lose the reply on the way back, so the screen is what says whether
    // anything landed.
    sendDetail = (err as Error).message;
  }

  await wire.wait(FIRST_READ_WAIT_MS);
  let after = before;
  try {
    after = countOccurrences(await wire.readScreen(), text);
  } catch (err) {
    readFailed = true;
    sendDetail = sendDetail === '' ? (err as Error).message : sendDetail;
  }
  if (!readFailed && after - before === 0) {
    await wire.wait(SECOND_READ_WAIT_MS);
    try {
      after = countOccurrences(await wire.readScreen(), text);
    } catch (err) {
      readFailed = true;
      sendDetail = sendDetail === '' ? (err as Error).message : sendDetail;
    }
  }

  const landing = decideArmLanding(before, after, readFailed);
  machinesLog.info(
    `armed resume on ${input.machineId} for ${input.agent}: landing ` +
      `${landing}, copies before ${String(before)}, copies after ` +
      `${String(after)}, target ${input.target}, text ${JSON.stringify(text)}` +
      (sendDetail === '' ? '' : `, the machine reported ${sendDetail}`)
  );
  return {
    landing,
    refusal: null,
    text,
    note: noteForLanding(landing),
    before,
    after
  };
}
