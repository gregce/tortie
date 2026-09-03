/**
 * What Tortie records ABOUT the accounts it keeps, which is never the account
 * itself (Phase 204).
 *
 * ## THE FILE HOLDS NO CREDENTIAL AND NEVER WILL
 *
 * `<root>/kept.json`, mode 0600, beside `logins.json`. One row per slot,
 * carrying the address the vendor's own file named, the DIGEST of the
 * credential in that slot, the keychain account attribute a write back should
 * preserve, and when it was taken. The credential itself is in the store
 * `./vault.ts` owns, which on macOS is the keychain, and it is never in this
 * file, in the logins file, in the manifest or on the wire.
 *
 * ## WHY THE DIGEST IS HERE AT ALL
 *
 * It is how "has this store changed" is answered without a second read of the
 * store, and how a move is compared on both sides. It is a one way digest of
 * bytes Tortie already holds, so writing it costs nothing a person could lose.
 * It is never drawn, never sent to a renderer, never logged.
 *
 * ## AN INVALID ROW IS DROPPED WHOLE
 *
 * The standing rule for every file a person or an agent can write. A row whose
 * slot is not a slot Tortie minted, or whose digest is not a digest, has no
 * account behind it, and half of it would be worse than none: the surface
 * would offer an account back that Tortie cannot produce. Every drop names the
 * field and the reason, and those sentences reach the person.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isSlotName } from './vault';

/** One slot's record. No credential, no token, no length, no prefix. */
export interface KeptRecord {
  /** Whose account it is, from the vendor's own file. Null when not known. */
  email: string | null;
  /** The sha256 of the credential in this slot, in hex. */
  digest: string;
  /** The keychain item's account attribute, so a write back preserves it. */
  account: string | null;
  /** Epoch ms this record was taken. */
  at: number;
}

/** The record file's whole shape. */
export interface KeptFile {
  v: 1;
  slots: Record<string, KeptRecord>;
}

/** What a read produced, plus every row it refused and why. */
export interface KeptFileRead {
  file: KeptFile;
  problems: string[];
}

const DIGEST_RE = /^[0-9a-f]{64}$/;

export function keptFileIn(root: string): string {
  return join(root, 'kept.json');
}

export function emptyKeptFile(): KeptFile {
  return { v: 1, slots: {} };
}

/** The record file, row by row, with every refusal named. */
export function readKeptFile(root: string): KeptFileRead {
  const problems: string[] = [];
  let text: string;
  try {
    text = readFileSync(keptFileIn(root), 'utf8');
  } catch {
    return { file: emptyKeptFile(), problems };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    problems.push(
      'Tortie could not read its record of kept accounts, so none were ' +
        'offered back. Signing in again rewrites it.'
    );
    return { file: emptyKeptFile(), problems };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    problems.push('Tortie record of kept accounts is not an object, so none were read.');
    return { file: emptyKeptFile(), problems };
  }
  const bag = (parsed as Record<string, unknown>)['slots'];
  const out = emptyKeptFile();
  if (bag === null || typeof bag !== 'object' || Array.isArray(bag)) {
    return { file: out, problems };
  }
  for (const [slot, raw] of Object.entries(bag as Record<string, unknown>)) {
    if (!isSlotName(slot)) {
      problems.push('A kept account row names no login Tortie owns and was dropped.');
      continue;
    }
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      problems.push('A kept account row was not an object and was dropped.');
      continue;
    }
    const row = raw as Record<string, unknown>;
    const digest = row['digest'];
    if (typeof digest !== 'string' || !DIGEST_RE.test(digest)) {
      problems.push(
        'A kept account row has a digest that is not one, so Tortie cannot ' +
          'tell whether the account it holds is the one recorded. It was dropped.'
      );
      continue;
    }
    const email = row['email'];
    const account = row['account'];
    const at = row['at'];
    out.slots[slot] = {
      email: typeof email === 'string' && email.length > 0 ? email : null,
      digest,
      account: typeof account === 'string' && account.length > 0 ? account : null,
      at: typeof at === 'number' && Number.isFinite(at) ? at : 0
    };
  }
  return { file: out, problems };
}

/**
 * Apply a change to the record file, re-reading it FIRST.
 *
 * ## WHY A WHOLE FILE WRITE WAS WRONG, and it cost an account
 *
 * The Phase 204 verification found a defect that no ablation caught: an
 * observe read this file at its start and wrote the WHOLE of it back at its
 * end, so two observes that overlapped both composed their write from a copy
 * taken before the other one's promotion, and the second write dropped the
 * first one's row. The row was the only thing that made a promoted login draw
 * as kept, so the account Tortie had just rescued was offered back to nobody,
 * for ever, on every list from then on.
 *
 * So a caller now names ONLY the rows it changed and the rows it dropped, and
 * this function re-reads the file immediately before writing it. A row another
 * writer added in the meantime is carried through rather than overwritten.
 * `../credentials/keep.ts` also serialises every observe on one root, which is
 * what makes the in process case impossible rather than merely narrow; this
 * merge is what holds when the second writer is a second Tortie.
 *
 * It writes nothing when nothing moved, which is what keeps an ordinary list
 * from touching the disk at all.
 */
export function updateKeptFile(
  root: string,
  changed: Readonly<Record<string, KeptRecord>>,
  dropped: readonly string[] = []
): void {
  const { file } = readKeptFile(root);
  let moved = false;
  for (const [slot, row] of Object.entries(changed)) {
    if (!isSlotName(slot)) continue;
    file.slots[slot] = row;
    moved = true;
  }
  for (const slot of dropped) {
    if (file.slots[slot] === undefined) continue;
    delete file.slots[slot];
    moved = true;
  }
  if (!moved) return;
  writeKeptFile(root, file);
}

/**
 * Write the record file, atomically.
 *
 * Same shape as `../logins/store.ts`'s own write, and for the same reason: a
 * reader that arrives mid write sees the old file or the new one.
 *
 * PREFER {@link updateKeptFile}. A caller that writes a whole file it read
 * earlier discards anything another writer did in between, which is the defect
 * described above.
 */
export function writeKeptFile(root: string, file: KeptFile): void {
  mkdirSync(root, { recursive: true });
  const path = keptFileIn(root);
  const tmp = join(root, `.kept.${process.pid.toString(36)}.tmp`);
  writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600
  });
  renameSync(tmp, path);
}
