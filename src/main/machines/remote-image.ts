/**
 * Image bytes on another machine (Phase 73, M6, item 3).
 *
 * ## The defect this closes, before the feature it adds
 *
 * Dropping an image on a session that runs on another machine inserted THIS
 * Mac's path into that session's prompt. The path names nothing on the far
 * side, so the agent there could not read the picture and said so. This module
 * puts the bytes on that machine and answers with the path they landed at, and
 * that path is what goes into the prompt instead.
 *
 * ## It is the one write in the product that lands on another computer
 *
 * Everything else Tortie sends to a machine is a tmux verb or a read. This is
 * the single exception, and it goes through `./remote-run.ts`'s write door,
 * which can send exactly one script because the catalogue holds exactly one
 * script with `mode: 'write'`.
 *
 * ## The four things that decide a byte ever leaves this Mac
 *
 *  1. The size. A file over {@link REMOTE_IMAGE_MAX_BYTES} is refused here,
 *     before anything is read past its size and before anything is sent. The
 *     limit is not the local drop limit and the reason is in the contract: the
 *     bytes travel inside one command, and one command is one argument of the
 *     far side's login shell.
 *  2. The content. The leading bytes are sniffed by `../drop/store.ts`'s own
 *     `sniffImage`, which is the same function a local drop uses. A file called
 *     `notes.png` that holds text is refused. THE CLAIMED NAME DECIDES NOTHING.
 *  3. The name on the far side. It is composed here from the session id and the
 *     first sixteen hexadecimal characters of the checksum of the bytes, with
 *     the extension the sniff returned. Nothing a person typed and nothing a
 *     browser supplied reaches the other computer's file system as a name.
 *  4. The link. The write door refuses while the machine is not answering, and
 *     refuses again when the connection changed while the command was in
 *     flight.
 *
 * ## Two answers mean it worked, and they mean different things
 *
 * `added` means the machine wrote the file. `present` means a file of that name
 * was already there and nothing was written. The second is the ordinary answer
 * for the same image dropped twice, and it is what makes the one write in this
 * product safe to run twice: the name is a checksum of the bytes, so the same
 * bytes are always the same name.
 *
 * ## What is compared before a path is handed back
 *
 * The far side prints the size and the checksum of the file it now has. Both
 * are compared against the numbers this Mac computed. A mismatch means nothing
 * is handed back, so no reference is ever inserted for bytes that did not land
 * whole. A machine with no checksum program answers `nosum`, and then the size
 * is the only comparison and the module says so in its log line rather than
 * pretending it checked more.
 */

import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import {
  REMOTE_IMAGE_MAX_BYTES,
  type MachineImagePlacement,
  type MachineImagePutInput
} from '@shared/ipc';
import { sniffImage } from '../drop/store';
import { getLog } from '../log';
import {
  IMAGE_NOT_AN_IMAGE,
  IMAGE_NOT_WRITTEN,
  imageTooLargeRefusal
} from './remote-copy';
import { machineGeneration, type RemoteMachineContext } from './context';
import { readyRemoteContext } from './remote-sessions';
import { runRemoteRead, runRemoteWrite } from './remote-run';
import { REMOTE_SCRIPT_EMPTY } from './remote-scripts';

const imageLog = getLog('machines');

export { REMOTE_IMAGE_MAX_BYTES };

/**
 * The same limit as the number the refusal sentence names. 90 kilobytes.
 *
 * PHASE 73 FIX ROUND. It was megabytes and the sentence read "0.09 MB", which
 * is arithmetically true and useless to read. `imageTooLargeRefusal` in
 * `./remote-copy.ts` now takes kilobytes, so this is the cap in kilobytes and
 * the sentence says 90 KB. `__tests__/remote-image.test.ts` asserts the
 * arithmetic so the sentence can never state a limit that is not the limit.
 */
export const REMOTE_IMAGE_MAX_KILOBYTES = REMOTE_IMAGE_MAX_BYTES / 1_000;

/**
 * The directory the images land in, as the far side's own shell composes it.
 *
 * It is a DISPLAY path rather than a resolved one, for the reason
 * `REMOTE_AUTHORIZED_KEYS_DISPLAY` is: the resolving is done by that machine's
 * own shell from its own `HOME`. Tortie never composes a home path for another
 * computer.
 */
export const REMOTE_IMAGE_DIR_DISPLAY = '~/.tortie/images';

/** How long one upload gets. 60,000 ms, because 120,000 bytes cross a link. */
export const REMOTE_IMAGE_TIMEOUT_MS = 60_000;

/** How long the one facts read gets. It prints seven short values. */
export const REMOTE_FACTS_TIMEOUT_MS = 10_000;

/** What the `machine-facts` script said about one machine. */
export interface RemoteMachineFactsAnswer {
  /** The far side's own HOME. Never composed on this Mac. */
  readonly home: string;
  /**
   * The environment names that move a path Tortie reads, and nothing else.
   * `CODEX_HOME` and `XDG_DATA_HOME` since Phase 73; `CLAUDE_CONFIG_DIR`,
   * `XDG_CONFIG_HOME` and `XDG_STATE_HOME` since Phase 108, because
   * `resolveHomes` in `src/main/context/env.ts` reads them and a remote
   * Context read without them points at `~/.claude` on a machine where the
   * person moved their configuration. A name the far side has not set is
   * ABSENT here rather than empty.
   */
  readonly env: Record<string, string>;
  /** What `uname -s` printed there, e.g. 'Darwin'. */
  readonly uname: string;
}

/**
 * Read the seven facts one machine states about itself. Pure parse, live read.
 *
 * It is here rather than in `./remote-harvest.ts` because two items need it and
 * neither owns the other. A caller that needs it more than once per connection
 * remembers it against the generation, which `./remote-harvest.ts` does.
 */
export async function readRemoteMachineFacts(
  machineId: string
): Promise<RemoteMachineFactsAnswer> {
  const ctx = readyRemoteContext(machineId);
  const answer = await runRemoteRead(ctx, 'machine-facts', [], {
    timeoutMs: REMOTE_FACTS_TIMEOUT_MS
  });
  return parseMachineFacts(answer.payload);
}

/**
 * One `machine-facts` payload into its values. PURE.
 *
 * A line the script did not write is ignored rather than guessed at, and a name
 * the far side has not set arrives as an empty value, which is a different fact
 * from the name being absent. That tolerance is what let Phase 108 add three
 * lines to the script without touching the other two parse sites, being
 * `./remote-harvest.ts` and step 10e of `./remote-smoke.ts`: both go through
 * this parse or read the payload as prose, and neither counts lines.
 */
export function parseMachineFacts(payload: string): RemoteMachineFactsAnswer {
  const values = new Map<string, string>();
  for (const line of payload.split('\n')) {
    const at = line.indexOf('=');
    if (at <= 0) continue;
    values.set(line.slice(0, at), line.slice(at + 1));
  }
  const env: Record<string, string> = {};
  const carry = (fact: string, name: string): void => {
    const value = values.get(fact) ?? '';
    if (value.length > 0) env[name] = value;
  };
  carry('codex_home', 'CODEX_HOME');
  carry('xdg_data_home', 'XDG_DATA_HOME');
  // Phase 108. The three names `resolveHomes` reads that did not cross before.
  carry('claude_config_dir', 'CLAUDE_CONFIG_DIR');
  carry('xdg_config_home', 'XDG_CONFIG_HOME');
  carry('xdg_state_home', 'XDG_STATE_HOME');
  return {
    home: values.get('home') ?? '',
    env,
    uname: values.get('uname') ?? ''
  };
}

// ---------------------------------------------------------------------------
// PHASE 84. The far side's own home directory, remembered per connection
// ---------------------------------------------------------------------------

/** What one machine last said about itself, and the connection it said it on. */
const homes = new Map<string, { generation: number; home: string }>();

/**
 * That machine's own home directory, read once per connection.
 *
 * ## Who needs it and why it is cached here
 *
 * `./remote-argv.ts` composes the folders it asks about against it, on every
 * create of an agent session. Without a cache that is one extra command per
 * create, for a value that does not move inside one connection.
 *
 * It is remembered against the GENERATION rather than against the machine, for
 * the reason `./remote-harvest.ts` gives about the same value: a machine that
 * reconnects is asked again, because a connection to a DIFFERENT account on the
 * same address is exactly the case where assuming the home did not move is how
 * a folder gets composed under somebody else's name.
 *
 * ## What an empty answer means
 *
 * The machine did not say. That is not a failure and it does not stop a create:
 * `./remote-argv.ts` then walks only the folders that do not depend on a home,
 * and Tortie composes no home path for another computer out of a guess. The
 * empty answer is NOT cached, so the next call asks again.
 */
export async function remoteMachineHome(
  ctx: RemoteMachineContext
): Promise<string> {
  const answer = await remoteMachineHomeAnswer(ctx);
  return answer.asked ? answer.home : '';
}

/**
 * What one machine said about its home, or that it could not be asked
 * (Phase 109, fix 3, research 58 section 1.6).
 *
 * THE THIRD ANSWER IS THE WHOLE REASON THIS FORM EXISTS. The wrapper above
 * folds "the machine answered and stated no home" and "nothing reached the
 * machine" into one empty string, and for a single create that is fine: the
 * refusal a person then reads says what was searched. For the batched agent
 * scan it is not fine. A failed facts read narrows the search to the two
 * folders that need no home, and on the operator's own machine both installed
 * agents live under the home, so one failed read would mark them absent for
 * the rest of the connection with nothing on screen saying why. The scan
 * calls THIS form and on `asked: false` writes nothing, so every agent stays
 * `unknown` and every tile stays selectable.
 *
 * `asked: true` with an empty home is the machine's own statement, and the
 * caller may act on it. `asked: false` is Tortie's failure to ask, and no
 * absence may ever be concluded from it.
 */
export async function remoteMachineHomeAnswer(
  ctx: RemoteMachineContext
): Promise<{ asked: true; home: string } | { asked: false }> {
  const generation = machineGeneration(ctx.machineId).generation;
  const held = homes.get(ctx.machineId);
  if (held !== undefined && held.generation === generation) {
    return { asked: true, home: held.home };
  }
  let home = '';
  try {
    const answer = await runRemoteRead(ctx, 'machine-facts', [], {
      timeoutMs: REMOTE_FACTS_TIMEOUT_MS
    });
    home = parseMachineFacts(answer.payload).home;
  } catch {
    // Nothing reached the machine, so nothing was learned about its home.
    // Not cached, so the next call asks again.
    return { asked: false };
  }
  if (home.length === 0) return { asked: true, home: '' };
  homes.set(ctx.machineId, { generation, home });
  return { asked: true, home };
}

/**
 * Forget what ONE machine said about its home (Phase 109, fix 7).
 *
 * `forgetMachineSessions` in `./tombstone.ts` calls it, so a removed machine
 * leaves no remembered answer behind. It replaced a reset-everything helper
 * that had no caller of any kind, in production or in a test.
 */
export function forgetRemoteMachineHome(machineId: string): void {
  homes.delete(machineId);
}

/**
 * The name one image gets on the far side. PURE.
 *
 * `<session id>-<first 16 hex of the sha256 of the bytes><extension>`. Every
 * part of it is something Tortie computed. The session id is Tortie's own, the
 * hexadecimal is a checksum of the bytes, and the extension came from the magic
 * bytes rather than from the file's name.
 *
 * It is content addressed on purpose, and that is what makes the one write in
 * this product safe to run twice: the same bytes are always the same name, so a
 * repeat finds the file already there and writes nothing.
 */
export function remoteImageName(
  sessionId: string,
  sha256: string,
  ext: string
): string {
  const safeId = sessionId.replace(/[^A-Za-z0-9_-]/g, '');
  return `${safeId}-${sha256.slice(0, 16)}${ext}`;
}

/** What the far side printed after it was asked to write one image. */
export interface RemoteImageWriteAnswer {
  readonly outcome: 'added' | 'present';
  readonly bytes: number;
  /** The checksum the machine computed, or null when it has no such program. */
  readonly sha256: string | null;
}

/**
 * One `image-put` payload into the three values, or null. PURE.
 *
 * Null covers every shape that is not the two words followed by a number and a
 * checksum, which is one answer to the caller: the machine did not report doing
 * what it was asked, so nothing is handed back.
 */
export function parseImagePutAnswer(
  payload: string
): RemoteImageWriteAnswer | null {
  const parts = payload.trim().split(/\s+/);
  // The script prints three fields and always three. A shorter answer is a
  // machine that printed something else, and reading two of three fields out
  // of it would be a guess.
  if (parts.length !== 3) return null;
  const word = parts[0] ?? '';
  if (word !== 'added' && word !== 'present') return null;
  const bytes = Number(parts[1] ?? '');
  if (!Number.isInteger(bytes) || bytes < 0) return null;
  const sum = parts[2] ?? '';
  return {
    outcome: word,
    bytes,
    sha256: sum === 'nosum' || sum.length === 0 ? null : sum
  };
}

/**
 * Put every image on one machine, in the order asked.
 *
 * One placement comes back per path, always, so a caller can line the answers
 * up against what it sent. A path that was refused carries a sentence and no
 * remote path, and a caller that inserts a reference for a null path is
 * inserting a reference to bytes that did not land.
 *
 * The whole call refuses as one when the machine is not ready or is not
 * answering, because there is no useful half answer to give in that case: the
 * facts read is the first thing it does and it goes through the same door.
 */
export async function putImagesOnMachine(
  input: MachineImagePutInput
): Promise<MachineImagePlacement[]> {
  const ctx = readyRemoteContext(input.machineId);
  const facts = await readRemoteMachineFacts(input.machineId);
  const out: MachineImagePlacement[] = [];
  for (const localPath of input.paths) {
    out.push(await putOneImage(ctx.machineId, input.sessionId, localPath, facts));
  }
  return out;
}

/** One path, through the four checks and then the one write. */
async function putOneImage(
  machineId: string,
  sessionId: string,
  localPath: string,
  facts: RemoteMachineFactsAnswer
): Promise<MachineImagePlacement> {
  const refused = (refusal: string): MachineImagePlacement => ({
    localPath,
    remotePath: null,
    outcome: null,
    refusal
  });

  // 1. The size, before the file is read at all.
  let size = 0;
  try {
    const info = await stat(localPath);
    if (!info.isFile()) return refused(IMAGE_NOT_AN_IMAGE);
    size = info.size;
  } catch {
    return refused(IMAGE_NOT_AN_IMAGE);
  }
  if (size > REMOTE_IMAGE_MAX_BYTES) {
    return refused(imageTooLargeRefusal(REMOTE_IMAGE_MAX_KILOBYTES));
  }

  // 2. The content. The claimed name decides nothing.
  const bytes = await readFile(localPath);
  const sniff = sniffImage(bytes.subarray(0, 256));
  if (sniff === null || !sniff.isImage) return refused(IMAGE_NOT_AN_IMAGE);

  // 3. The name, composed here out of things Tortie computed.
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const name = remoteImageName(sessionId, sha256, sniff.ext);
  const payload = bytes.toString('base64');

  // 4. The link, and the one write.
  const ctx = readyRemoteContext(machineId);
  const answer = await runRemoteWrite(ctx, 'image-put', [name, payload], {
    timeoutMs: REMOTE_IMAGE_TIMEOUT_MS
  });
  const wrote = parseImagePutAnswer(answer.payload);
  if (wrote === null) return refused(IMAGE_NOT_WRITTEN);

  // What arrived has to be what was sent, or no path is handed back.
  if (wrote.bytes !== bytes.byteLength) {
    imageLog.warn(
      `${machineId} reported ${String(wrote.bytes)} byte(s) for ${name} and ` +
        `this Mac sent ${String(bytes.byteLength)}`
    );
    return refused(IMAGE_NOT_WRITTEN);
  }
  if (wrote.sha256 !== null && wrote.sha256 !== sha256) {
    imageLog.warn(
      `${machineId} reported a different checksum for ${name} than this Mac ` +
        `computed, so no path was handed back`
    );
    return refused(IMAGE_NOT_WRITTEN);
  }
  if (wrote.sha256 === null) {
    imageLog.info(
      `${machineId} has no checksum program, so ${name} was compared by size ` +
        `alone`
    );
  }

  return {
    localPath,
    remotePath: remoteImagePath(facts.home, name),
    outcome: wrote.outcome,
    refusal: null
  };
}

/**
 * Where one image sits on the machine, from that machine's OWN home. PURE.
 *
 * A machine that would not say what its home is gets the display path, because
 * a guessed absolute path for another computer is worse than a path a person
 * can still read. Tortie composes no home directory for a computer that did not
 * state its own.
 */
export function remoteImagePath(home: string, name: string): string {
  if (home.length === 0 || home === REMOTE_SCRIPT_EMPTY) {
    return `${REMOTE_IMAGE_DIR_DISPLAY}/${name}`;
  }
  const base = home.endsWith('/') ? home.slice(0, -1) : home;
  return `${base}/.tortie/images/${name}`;
}
