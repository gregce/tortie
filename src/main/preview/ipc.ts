/**
 * `preview:*` registration — wiring only; the rules live in ./protocol.ts.
 *
 * TWO CHANNELS, AND THE SHORTNESS OF THIS FILE IS THE POINT.
 *
 * The renderer may ask main for the URL of a document the user opened, and it
 * may read back the counts main kept while serving that document. That is the
 * whole surface. Neither call takes an address, neither opens anything and
 * neither returns a byte of file content: `preview:stats` answers with six
 * numbers or with null.
 *
 * There is deliberately no channel for reading a previewed file, no channel
 * for opening a link, and nothing a previewed DOCUMENT can reach at all: the
 * frame is `sandbox=""`, it has no preload and its own response policy is
 * `default-src 'none'`, so the content inside it has no way to call anything.
 * An earlier draft of this phase gave it one indirectly, through a sentinel
 * URL that main turned into `shell.openExternal`, and a one pixel nested
 * iframe fired it on load with an address the page author chose.
 * `__tests__/no-path-into-main.test.ts` is what keeps that cut.
 *
 * Registered separately from the protocol handler because they are two
 * different things: `registerPreviewProtocol` installs the byte channel, and
 * this installs the one question Tortie's own renderer may ask about it.
 */

import type { IpcMain } from 'electron';
import { handle } from '../typed-ipc';
import { previewStatsFor, previewUrlForFile } from './protocol';

/**
 * Register the preview channels. Call once during main-process boot.
 *
 * Every check `servePreviewRequest` makes is made by `previewUrlForFile` too,
 * one round trip earlier, so the viewer can say "not on disk" or "too large"
 * without first mounting a frame that will fail. This function adds nothing to
 * that: it is two invokes and no logic, so there is one place where a preview
 * is decided.
 */
export function registerPreviewIpc(ipc: IpcMain): void {
  handle(ipc, 'preview:url', (_e, input) => previewUrlForFile(input));
  handle(ipc, 'preview:stats', (_e, input) => previewStatsFor(input));
}
