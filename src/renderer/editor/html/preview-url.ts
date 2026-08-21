/**
 * The renderer's half of the `gmux-preview:` contract (Phase 20.5).
 *
 * Main owns the URL, the token, the containment check and every refusal.
 * `previewUrlForFile` in src/main/preview/protocol.ts makes all of them one
 * round trip before the frame is mounted, so the viewer can show "not on
 * disk" or "too large" without first mounting a frame that will fail. The
 * renderer builds no URL of its own on purpose. A second URL builder in this
 * process would be a second opinion about which bytes are inside a project,
 * and the whole containment argument rests on there being one.
 *
 * So this file holds three small things: the feature detection, the call,
 * and the number that decides when the frame reloads.
 */

import type { InstalledGmuxApi } from '@shared/ipc';
import { gmuxBridge } from '../../bridge';
import type {
  PreviewStats,
  PreviewStatsInput,
  PreviewUrlInput,
  PreviewUrlResult
} from '@shared/preview-types';

/**
 * The contract itself is `@shared/preview-types`, which main's handler and
 * this file both import, so the refusal union cannot gain a reason in one
 * process that the other renders as nothing. The channel is `preview:url`,
 * one invoke, exposed as `window.gmux.preview.url`.
 *
 * It stays feature-detected. An older preload has no `preview` object, and
 * the viewer then says so in plain words instead of mounting a frame with
 * nothing behind it. That is the shape every other optional bridge in this
 * renderer already uses.
 */
export type {
  PreviewRefusal,
  PreviewStats,
  PreviewStatsInput,
  PreviewUrlInput,
  PreviewUrlResult
} from '@shared/preview-types';

function bridge(): InstalledGmuxApi['preview'] | undefined {
  return gmuxBridge()?.preview;
}

/** Is the preview channel in this build at all? */
export function previewAvailable(): boolean {
  return typeof bridge()?.url === 'function';
}

/**
 * Ask main for one document's URL.
 *
 * A thrown IPC error is turned into `missing` rather than propagated. The
 * viewer has one job when it cannot get a URL, which is to say the page is
 * not there, and a rejected promise reaching a React effect would leave the
 * pane on its loading state forever.
 */
export async function previewUrlFor(
  input: PreviewUrlInput
): Promise<PreviewUrlResult> {
  const api = bridge();
  if (typeof api?.url !== 'function') {
    return { status: 'refused', reason: 'missing' };
  }
  try {
    return await api.url(input);
  } catch {
    return { status: 'refused', reason: 'missing' };
  }
}

/**
 * Read back what the handler refused while serving this document.
 *
 * Null means "make no claim", and every failure here returns it: an older
 * preload with no `stats` function, a rejected invoke, a token whose project
 * has closed, and a generation another tab has superseded. That is the whole
 * point of the null. The line under the frame used to state an all-clear it
 * could not know, and the honest answer when main will not confirm the counts
 * is to say nothing rather than to say nothing was blocked.
 */
export async function previewStatsOf(
  input: PreviewStatsInput
): Promise<PreviewStats | null> {
  const api = bridge();
  if (typeof api?.stats !== 'function') return null;
  try {
    return await api.stats(input);
  } catch {
    return null;
  }
}

/**
 * A stamp for a string of bytes, used as the `?v=` revision. FNV-1a, 32 bit.
 *
 * It is a cache key and nothing else. It is not a checksum, it is not
 * security, and two different files are allowed to collide: the worst
 * outcome of a collision is a frame that does not reload, and the next write
 * to that file changes the bytes again.
 *
 * The reason it comes from the CONTENT rather than from a counter is that a
 * counter reloads the frame every time the watcher fires, and an agent
 * rewriting a generated report fires it several times with the same bytes.
 * Reloading costs the reader their place on the page, which cannot be given
 * back: the frame has an opaque origin and no script, so nothing in this
 * process may read its scroll offset.
 */
export function contentVersion(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
