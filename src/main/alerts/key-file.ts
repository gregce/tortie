/**
 * The Apple push key, as a file a person picked (Phase 316.5, build/p3165/
 * SPEC.md §5.2.1).
 *
 * WHAT IT READS. The `.p8` Apple gives a developer team when it makes an APNs
 * key, downloaded as `AuthKey_<key id>.p8`. The key id is Apple's own, in that
 * file name, so it is read from the name and never typed. The team and the
 * topic are COMPILED FACTS of the phone app, not settings: Tortie's phone app
 * is one app, `com.itavero.tortie.phone`, signed by one team, and a provider
 * key reaches that app only if it is that team's. Asking a person to type
 * either would ask them to type the compiled world back (CLAUDE.md:
 * "configuration selects from choices the compiled world already contains").
 * `conformance:ios` (w) holds both equal to the app's own project.
 *
 * IN ORDER, each refusal a sentence and never a value:
 *
 *   1. the NAME, before the file is opened: `AuthKey_` then ten capital
 *      letters or digits then `.p8`, read on the basename;
 *   2. `open` with `O_RDONLY | O_NONBLOCK`, so a FIFO named like a key can
 *      never block the read;
 *   3. `fstat` ON THE DESCRIPTOR, so what is judged is what is read: a regular
 *      file of at most {@link KEY_FILE_MAX_BYTES};
 *   4. exactly that many bytes read, and the descriptor closed in a `finally`.
 *
 * What it answers goes to Phase 314's sealed store (`apnsKeyStore.keep`),
 * whose own refusals ("The Apple push key was not kept, because …") are
 * answered as they are. NOTHING HERE LOGS, and the bytes are dropped with the
 * function: the buffer is zeroed before it returns.
 */

import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { basename } from 'node:path';
import type { ApnsProviderKey } from '../credentials';

/** The phone app's bundle id: every alert is addressed to it. `conformance:ios` (w) holds it equal. */
export const PHONE_APP_TOPIC = 'com.itavero.tortie.phone';

/** The team that signs the phone app. `conformance:ios` (w) holds it equal to `RELEASE_TEAM`. */
export const PHONE_APP_TEAM = '4GRQMF5T5U';

/** No `.p8` Apple issues comes near this; it is `apns-key.ts`'s own `P8_MAX_CHARS`. */
export const KEY_FILE_MAX_BYTES = 4_096;

/** What the native file panel says above its list. */
export const KEY_PICK_MESSAGE = 'Choose the Apple push key for Tortie’s iPhone app';

export const KEY_NAME_REFUSED =
  'Tortie reads the key id from the file’s name, AuthKey_ then ten letters or digits. Choose the file Apple gave you. Nothing was changed.';

export const KEY_FILE_UNREADABLE = 'Tortie could not read that file. Nothing was changed.';

export const KEY_FILE_TOO_LARGE = 'That file is too large to be an Apple push key. Nothing was changed.';

/** Apple's own download name. The id is ten capital letters or digits, as Apple issues it. */
const KEY_FILE_NAME = /^AuthKey_([A-Z0-9]{10})\.p8$/;

/** The key id Apple's file name carries, or null when the name is not Apple's. Opens nothing. */
export function keyIdOfFileName(name: string): string | null {
  const hit = KEY_FILE_NAME.exec(basename(name));
  return hit === null ? null : (hit[1] ?? null);
}

export type KeyFileAnswer =
  | { readonly ok: true; readonly key: ApnsProviderKey }
  | { readonly ok: false; readonly refusal: string };

/**
 * The key record a picked file holds, for `apnsKeyStore.keep`, or the one
 * sentence saying why not. Never throws, and never logs.
 */
export async function readKeyFile(path: string): Promise<KeyFileAnswer> {
  // 1. THE NAME, before anything is opened.
  const keyId = keyIdOfFileName(path);
  if (keyId === null) return { ok: false, refusal: KEY_NAME_REFUSED };

  // 2. Opened without blocking, so a FIFO answers at once.
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  } catch {
    return { ok: false, refusal: KEY_FILE_UNREADABLE };
  }
  let bytes: Buffer | null = null;
  try {
    // 3. What the DESCRIPTOR is, not what the path names now.
    const stat = await handle.stat();
    if (!stat.isFile()) return { ok: false, refusal: KEY_FILE_UNREADABLE };
    if (stat.size > KEY_FILE_MAX_BYTES) return { ok: false, refusal: KEY_FILE_TOO_LARGE };
    // 4. Exactly that many bytes, and a file that changed under the read is
    // not a key anyone picked.
    const size = stat.size;
    bytes = Buffer.alloc(size);
    let got = 0;
    while (got < size) {
      const { bytesRead } = await handle.read(bytes, got, size - got, got);
      if (bytesRead === 0) break;
      got += bytesRead;
    }
    if (got !== size) return { ok: false, refusal: KEY_FILE_UNREADABLE };
    return {
      ok: true,
      key: { keyId, teamId: PHONE_APP_TEAM, topic: PHONE_APP_TOPIC, p8: bytes.toString('utf8') }
    };
  } catch {
    return { ok: false, refusal: KEY_FILE_UNREADABLE };
  } finally {
    bytes?.fill(0);
    await handle.close().catch(() => undefined);
  }
}
