/**
 * Test helper: a fake IpcMainInvokeEvent whose sender is registered as
 * trusted, for unit tests that drive handlers registered through
 * src/main/typed-ipc.ts. Since Phase 42 stage 1 that wrapper refuses any
 * invoke whose sender is not a window Tortie created
 * (src/main/security/trusted-window.ts), so a test that calls a captured
 * handler must present a trusted event instead of `null`.
 *
 * Not a test file itself — vitest collects only `*.test.ts`.
 */

import type { IpcMainInvokeEvent } from 'electron';
import { registerTrustedIpcSender } from '../trusted-window';

// High and falling, so helper ids never collide with a test's own fakes.
let nextId = 1_000_000;

/** A fresh invoke event from a sender the trust registry accepts. */
export function trustedInvokeEvent(): IpcMainInvokeEvent {
  const mainFrame = {};
  const sender = {
    id: nextId++,
    mainFrame,
    once: () => undefined
  };
  registerTrustedIpcSender(sender as never);
  return { sender, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent;
}
