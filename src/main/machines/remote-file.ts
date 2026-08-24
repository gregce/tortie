/**
 * Saving one file on another machine (Phase 101).
 *
 * ## What this module owns
 *
 * The whole decision about whether a byte leaves this Mac for one file, and the
 * reading of what the machine said afterwards. It is `./remote-image.ts`'s
 * shape, and it is the only production caller of the `file-put` script.
 *
 * ## The one field that decides everything
 *
 * `writeRoot` on the machine row, which is the sixth confirmed field. It is the
 * one folder on that machine under which Tortie may replace a file. A machine
 * that carries none cannot be saved to at all, and this module answers
 * `writesOff` without composing anything.
 *
 * ## Why this path asks the confirm gate, which no read script channel does
 *
 * No READ script channel calls `assertMachineMayConnect`, and `./ipc.ts` says
 * so in four places. The two Phase 102 write verbs in `./remote-entry.ts` do
 * call it, through {@link confirmedWriteRoot} below, for the same reason this
 * one does. What stands in its place on those channels
 * is `readyRemoteContext`, and that is sound for them because none of them
 * reads a value out of the row at call time: a registered context has already
 * been through the gate.
 *
 * THIS ONE READS `writeRoot` OUT OF THE ROW ON DISK AT CALL TIME, and the
 * agreement is the only thing that makes that value a confirmed fact. A row
 * whose file changed after the connection was made would otherwise contain the
 * write with a root nobody agreed to. So it calls BOTH, in this order: the gate
 * first, then `readyRemoteContext`. The connected-only check and the generation
 * check come from `runRemoteWrite`, which every caller of that door gets,
 * rather than from a copy held here.
 *
 * ## Containment lives in three places and this is one of them
 *
 * The schema refuses a root that is not absolute, holds a single quote, holds a
 * `..` segment or ends in a slash. The script's own two `case` lines refuse the
 * same shapes on the far side, so the rule holds when main is bypassed. And
 * {@link relativeUnderRoot} below resolves both paths and requires the file's
 * resolved path to start with the resolved root PLUS a separator. Without the
 * separator a root of `/Users/gdc` would contain `/Users/gdcx`.
 *
 * WHAT NONE OF THE THREE COVERS. A symlink on that machine is not resolved by
 * any of them and cannot be, because resolving one means a second round trip
 * and a second answer that can be stale by the time the write lands.
 * Containment here is over the path text.
 *
 * ## No sixth kind of remote work is declared
 *
 * The five kinds in `../manifest/remote-executions.ts` are a durable enum and
 * one of them is journaled. A save is a bounded 60,000 ms write, so it rides
 * the Phase 118 ledger as `command`, which is what every other login shell read
 * already is, with the remote path as its subject so a person can read what the
 * work was.
 */

import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import type { MachineRowV1 } from '@shared/machines';
import {
  REMOTE_FILE_MAX_BYTES,
  type MachineFilePutInput,
  type MachineFilePutOutcome,
  type MachineFilePutResult
} from '@shared/ipc';
import { gmuxError } from '../errors';
import { assertMachineMayConnect } from './confirm';
import { readyRemoteContext } from './ready-context';
import { runRemoteWrite } from './remote-run';
import { machineFieldsOf, machineRow } from './store';

export { REMOTE_FILE_MAX_BYTES };

/**
 * How long one save gets. 60,000 ms.
 *
 * It matches `REMOTE_IMAGE_TIMEOUT_MS` for a payload of the same size, because
 * the two carry the same number of bytes over the same link. Far side compute
 * for a 90,000 byte decode plus two checksum runs was 0.03 s to 0.05 s across
 * five runs on this Mac, so nearly all of this budget is the link rather than
 * the machine.
 */
export const REMOTE_FILE_PUT_TIMEOUT_MS = 60_000;

/** The word `$3` carries when the caller is making a file that is not there. */
export const REMOTE_FILE_PUT_NEW = 'new';

/**
 * The word the script prints when the bytes are already in place and it cannot
 * describe them, and the one word from that script this module deliberately
 * does not know.
 *
 * It fires only when the checksum program answered for `/dev/null` before
 * either arm and then said nothing about the file it had just written. Every
 * other word the script prints is decided before it writes.
 *
 * IT IS NOT AN OUTCOME AND IT MUST NEVER BECOME ONE. An outcome is something a
 * person is told happened, and this is the case where nobody can say. So
 * {@link parseFilePutAnswer} answers null for it, like any word it does not
 * know, and {@link putFileOnMachine} throws the sentence that says Tortie
 * cannot tell whether the file was saved. Adding it to {@link WORDS} would put
 * it through {@link refused}, and every sentence there ends "Nothing was
 * written", which would be the exact false claim the first fix round of this
 * phase removed from the script.
 */
export const REMOTE_FILE_PUT_UNSURE = 'unsure';

/** What the far side printed after it was asked to save one file. */
export interface RemoteFilePutAnswer {
  /** One of the six words the script prints. */
  readonly word: 'wrote' | 'stale' | 'missing' | 'exists' | 'nomode' | 'nosum';
  /** The checksum the machine reported, or null when it reported none. */
  readonly sha256: string | null;
  /** The size the machine reported, or null when it reported none. */
  readonly bytes: number | null;
}

const WORDS = new Set(['wrote', 'stale', 'missing', 'exists', 'nomode', 'nosum']);

/**
 * One `file-put` payload into its three values, or null. PURE.
 *
 * The script prints THREE fields and always three, with `none` for a field that
 * has no value. A shorter answer is a machine that printed something else, and
 * reading two of three fields out of it would be a guess. That is
 * `parseImagePutAnswer`'s rule and `git-clone`'s shape, reused rather than
 * restated.
 */
export function parseFilePutAnswer(payload: string): RemoteFilePutAnswer | null {
  const parts = payload.trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const word = parts[0] ?? '';
  if (!WORDS.has(word)) return null;
  const sum = parts[1] ?? '';
  const size = parts[2] ?? '';
  const bytes = size === 'none' ? null : Number(size);
  if (bytes !== null && (!Number.isInteger(bytes) || bytes < 0)) return null;
  return {
    word: word as RemoteFilePutAnswer['word'],
    sha256: sum === 'none' || sum.length === 0 ? null : sum,
    bytes
  };
}

/**
 * The file's path relative to the confirmed root, or null when it is not under
 * it. PURE.
 *
 * Both sides are resolved first, so `/Users/gdc/./code/x.ts` and
 * `/Users/gdc/code/x.ts` are one path. The separator is part of the comparison,
 * so `/Users/gdcx/x.ts` is not under `/Users/gdc`. A path equal to the root
 * itself is not under it either, because a root is a folder and a folder is not
 * a file this door may replace.
 */
export function relativeUnderRoot(root: string, path: string): string | null {
  if (root.length === 0 || !root.startsWith('/')) return null;
  if (path.length === 0 || !path.startsWith('/')) return null;
  const base = posix.resolve(root);
  const full = posix.resolve(path);
  const prefix = base.endsWith('/') ? base : `${base}/`;
  if (!full.startsWith(prefix)) return null;
  const rel = full.slice(prefix.length);
  return rel.length === 0 ? null : rel;
}

/**
 * The row and the folder it confirmed, or null when there is no folder.
 *
 * PHASE 102 EXTRACTED THIS FROM {@link putFileOnMachine} rather than writing a
 * second copy of it. It is steps 1 to 3 of that function, and it is what every
 * verb that writes on another computer under a confirmed folder has to do
 * before it composes anything.
 *
 *  1. The row has to be in the machines file, or this throws the sentence that
 *     says so and names nothing was started.
 *  2. `assertMachineMayConnect`, for the reason this file's header gives. This
 *     path reads a value out of the row on disk at CALL TIME, and the agreement
 *     is the only thing that makes that value a confirmed fact.
 *  3. A machine with no `writeRoot` answers null, which every caller reports as
 *     `writesOff`. Nothing is composed and nothing is sent.
 *
 * It contacts no machine, opens no connection and starts nothing.
 *
 * @throws GmuxError INVALID_INPUT when the row is not in the file, and whatever
 *   the confirm gate throws for a machine nobody confirmed.
 */
export function confirmedWriteRoot(
  machineId: string
): { row: MachineRowV1; writeRoot: string } | null {
  const row = machineRow(machineId);
  if (row === null) {
    throw gmuxError(
      'INVALID_INPUT',
      `There is no machine called ${machineId} in the machines file. ` +
        `Nothing was started.`
    );
  }
  const fields = machineFieldsOf(row);
  assertMachineMayConnect(row.id, fields);
  const writeRoot =
    typeof fields.writeRoot === 'string' && fields.writeRoot.length > 0
      ? fields.writeRoot
      : null;
  if (writeRoot === null) return null;
  return { row, writeRoot };
}

/** A result with nothing sent and nothing written. */
function refused(
  outcome: MachineFilePutOutcome,
  writeRoot: string | null,
  bytes: number | null = null
): MachineFilePutResult {
  return { outcome, sha256: null, bytes, writeRoot };
}

/**
 * Save one file on one machine.
 *
 * The order below is the design. Steps 1 to 5 all happen before anything is
 * composed and before anything is sent, so every one of their answers means the
 * machine was never asked.
 *
 *  1. The row has to be in the machines file.
 *  2. The confirm gate, for the reason in this file's header.
 *  3. A machine with no confirmed folder answers `writesOff`.
 *
 *     PHASE 102 MOVED THOSE THREE INTO {@link confirmedWriteRoot}, which the
 *     two verbs in `./remote-entry.ts` call as well. One implementation, three
 *     call sites, no behaviour change.
 *  4. A file over {@link REMOTE_FILE_MAX_BYTES} answers `tooLarge`.
 *  5. A path outside the confirmed folder answers `outsideRoot`.
 *  6. The connection, through `readyRemoteContext`.
 *  7. The one write, through `runRemoteWrite`.
 *  8. The answer, with the `stale` rule below applied to it.
 *
 * ## A link that drops during step 7 is NOT a failed save
 *
 * `build/probe-p101-save.mjs` leg 14 killed a real ssh over a real link while
 * the far side was decoding an 89,000 byte payload. The far side shell carried
 * on and replaced the file in full. Only the answer was lost. So step 7's own
 * catch rethrows a sentence that says the file may have been saved, rather than
 * any of the refusals, all of which end "Nothing was written."
 *
 * ## The `stale` rule, which is what makes a save safe to run twice
 *
 * A link can drop after the far side has written and before its answer arrives.
 * A second attempt then finds the file already carrying the checksum of the
 * payload, so the machine answers `stale` with that checksum. That is the write
 * having landed and only the answer having been lost, so it is reported as a
 * success rather than as a refusal. Any other reported checksum is somebody
 * else's change and it is the refusal.
 */
export async function putFileOnMachine(
  input: MachineFilePutInput
): Promise<MachineFilePutResult> {
  // 1 to 3. The row, the confirm gate and the confirmed folder, in one call.
  // PHASE 102 moved these three steps into {@link confirmedWriteRoot} so that
  // this function and the two verbs in `./remote-entry.ts` run one
  // implementation rather than three copies. Nothing about the order or the
  // sentences changed.
  const ready = confirmedWriteRoot(input.machineId);
  if (ready === null) return refused('writesOff', null);
  const { row, writeRoot } = ready;

  // 4. The size, before anything is encoded.
  const payloadBytes = Buffer.from(input.contents, 'utf8');
  if (payloadBytes.byteLength > REMOTE_FILE_MAX_BYTES) {
    return refused('tooLarge', writeRoot, payloadBytes.byteLength);
  }

  // 5. Containment, main's own copy of it.
  const rel = relativeUnderRoot(writeRoot, input.path);
  if (rel === null) return refused('outsideRoot', writeRoot);

  // 6. The connection.
  const ctx = readyRemoteContext(input.machineId);

  // 7. The one write. The root that crosses is the CONFIRMED one, read from the
  // row above. Nothing the caller sent decides which folder is written under.
  const expect =
    input.expect === REMOTE_FILE_PUT_NEW ? REMOTE_FILE_PUT_NEW : input.expect;
  let answer;
  try {
    answer = await runRemoteWrite(
      ctx,
      'file-put',
      [writeRoot, rel, expect, payloadBytes.toString('base64')],
      {
        timeoutMs: REMOTE_FILE_PUT_TIMEOUT_MS,
        execution: { kind: 'command', subject: `${writeRoot}/${rel}` }
      }
    );
  } catch (err) {
    // MEASURED on 2026-08-21 by `build/probe-p101-save.mjs` leg 14, which is
    // the evidence item research 57 section 10 left open. A real ssh was killed
    // over a real link while the far side was decoding an 89,000 byte payload.
    // THE FAR SIDE SHELL DID NOT STOP. The file was replaced in full, no
    // temporary file was left, and the only thing lost was the answer. The
    // local call failed with the ssh error.
    //
    // So nothing on this path may tell a person the file was not saved. The
    // sentence below says the true thing, which is that nobody can tell, and it
    // is kept under 160 characters so the renderer shows it rather than falling
    // back to its own wording.
    throw gmuxError(
      'INVALID_INPUT',
      `${row.id} did not answer while this file was being saved, so it may ` +
        `have been saved there. Open it again to read what it says now.`,
      String((err as Error).message ?? err)
    );
  }

  // 8. The answer.
  // A word this module does not know, which includes REMOTE_FILE_PUT_UNSURE.
  // The sentence below is the only true thing to say about it, and it is
  // deliberately not one of the refusals: it does not claim nothing was
  // written, because on the `unsure` word something was.
  const said = parseFilePutAnswer(answer.payload);
  if (said === null) {
    throw gmuxError(
      'INVALID_INPUT',
      `${row.id} did not say what it did with this file, so Tortie cannot tell ` +
        `you whether it was saved. Open it again to read what it says now.`,
      `${row.id} answered "file-put" with ${JSON.stringify(
        answer.payload.slice(0, 120)
      )}`
    );
  }
  const sent = createHash('sha256').update(payloadBytes).digest('hex');
  if (said.word === 'wrote') {
    return {
      outcome: 'wrote',
      sha256: said.sha256,
      bytes: said.bytes,
      writeRoot
    };
  }
  if (said.word === 'stale' && said.sha256 !== null && said.sha256 === sent) {
    // The write landed and only the answer was lost. This is the property that
    // makes a save safe to run twice.
    return {
      outcome: 'wrote',
      sha256: said.sha256,
      bytes: payloadBytes.byteLength,
      writeRoot
    };
  }
  return refused(said.word, writeRoot);
}
