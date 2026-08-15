/**
 * The seams the integrator made (Phase 20.5).
 *
 * Three builders each produced a working half and described a join they could
 * not make. This file is the join, asserted. Every claim below was broken at
 * some point during integration, and each break was silent: the frame simply
 * said "Preview is not available" and nothing threw.
 *
 * ## What is checked, and what a failure would cost
 *
 * 1. **`preview:url` reaches main.** Without the registration the viewer
 *    feature-detects nothing and every HTML tab shows the unavailable state.
 *    That is a correct fallback and an invisible defect.
 * 2. **The preload exposes it under the name the viewer looks for.** The
 *    renderer asks for `window.gmux.preview.url` and nothing else. A different
 *    spelling in the preload is the same invisible defect.
 * 3. **One `registerSchemesAsPrivileged` call, with both schemes in it.**
 *    Measured on Electron 43.3.0: a second call strips `secure`,
 *    `supportFetchAPI` and `corsEnabled` from whichever scheme was registered
 *    first. `gmux-asset:` is what markdown images ride on, so a second call
 *    breaks images in every README with nothing thrown and nothing logged.
 * 4. **The handler is installed with the rewrite.** `rewriteHtml` is a
 *    required field, so a missed wiring is a typecheck failure rather than
 *    something this test has to catch. What it checks instead is that the call
 *    is there at all.
 * 5. **The contract types are declared once.** They travel over IPC, so the
 *    renderer imports them, and a second declaration lets main add a refusal
 *    reason the viewer renders as nothing.
 *
 * It reads the source rather than importing main, because importing
 * `src/main/index.ts` boots an application.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SRC,
  sourceFiles,
  stripComments
} from '../../../shared/__tests__/source-scan';

function code(...parts: string[]): string {
  return stripComments(readFileSync(join(SRC, ...parts), 'utf8'));
}

/** Every production file under a directory, concatenated and stripped. */
function codeDir(...parts: string[]): string {
  return sourceFiles(join(SRC, ...parts))
    .map((file) => stripComments(readFileSync(file, 'utf8')))
    .join('\n');
}

describe('the preview channel is wired end to end', () => {
  it('declares two invoke channels in the shared contract, and no others', () => {
    // Phase 42 stage 2 split the contract by domain; the closure claim is
    // over the whole directory, so a stray preview channel in ANY domain
    // file still fails here.
    const ipc = codeDir('shared', 'ipc');
    // Two channels and no more. The preview surface is deliberately this
    // small, and adding a third is the moment to ask again whether there is
    // still nothing a previewed DOCUMENT can reach.
    //
    // `preview:stats` was added in the Phase 20.5 fix round. It takes a token
    // and a generation and answers with six numbers or with null. It opens
    // nothing, reads no file and takes no address, and it exists because the
    // line under the frame was stating an all-clear while the handler had
    // refused hundreds of requests.
    const found = ipc.match(/'preview:[a-zA-Z]+'/g) ?? [];
    expect([...new Set(found)].sort()).toEqual([
      "'preview:stats'",
      "'preview:url'"
    ]);
    expect(ipc).toContain('PreviewInvokeChannelMap');
  });

  it('registers a handler for each in main', () => {
    const previewIpc = code('main', 'preview', 'ipc.ts');
    expect(previewIpc).toContain("handle(ipc, 'preview:url'");
    expect(previewIpc).toContain("handle(ipc, 'preview:stats'");
    expect(code('main', 'index.ts')).toContain('registerPreviewIpc(ipcMain)');
  });

  it('exposes both under window.gmux.preview in the preload', () => {
    // Phase 42 stage 2: the preview object lives in the preload's files
    // domain module; the assembly in preload/index.ts attaches it.
    const preloadFiles = code('preload', 'files.ts');
    expect(preloadFiles).toMatch(
      /url:\s*\(input\)\s*=>\s*invoke\('preview:url',/
    );
    expect(preloadFiles).toMatch(
      /stats:\s*\(input\)\s*=>\s*invoke\('preview:stats',/
    );
    // The object has to be attached to the api, not merely declared.
    expect(code('preload', 'index.ts')).toMatch(/^\s*preview,\s*$/m);
  });

  it('reads the counts back after the frame loads, from the frame itself', () => {
    // The whole defect this channel fixes was a line that could not see a
    // refusal main made, so the call has to actually happen. `onLoad` on the
    // frame is the trigger, and it carries no data from inside the frame.
    const view = code('renderer', 'editor', 'html', 'HtmlPreview.tsx');
    expect(view).toContain('onLoad={onFrameLoad}');
    expect(view).toContain('previewStatsOf({ token, generation })');
    expect(code('renderer', 'editor', 'html', 'preview-url.ts')).toContain(
      "api.stats(input)"
    );
  });

  it('installs the protocol handler with the anchor rewrite', () => {
    expect(code('main', 'index.ts')).toContain(
      'registerPreviewProtocol({ rewriteHtml: rewriteExternalAnchors })'
    );
  });

  it('adds the privileged descriptor to the ONE existing call', () => {
    const main = code('main', 'index.ts');
    expect(main).toContain(
      'registerAssetSchemePrivileged([PREVIEW_PRIVILEGED_SCHEME])'
    );
    // The sibling test in privileged-schemes.test.ts proves there is exactly
    // one call site under src/main. This proves the call site is spread rather
    // than replaced, so `gmux-asset:` is still in the array.
    const assets = code('main', 'assets', 'protocol.ts');
    expect(assets).toContain('scheme: ASSET_SCHEME');
    expect(assets).toContain('...extra');
  });

  it('drops a project token when the project closes', () => {
    expect(code('main', 'ipc.ts')).toContain('releasePreviewRoot(');
  });

  it('declares the URL contract exactly once, in shared', () => {
    const shared = code('shared', 'preview-types.ts');
    expect(shared).toContain('export interface PreviewUrlInput');
    expect(shared).toContain('export type PreviewRefusal');
    expect(shared).toContain('export type PreviewUrlResult');
    // Main and the renderer both re-export, and a re-export is a pointer to
    // this one declaration. A second `export type PreviewRefusal =` anywhere
    // would be a second opinion about what main is allowed to answer.
    for (const file of [
      ['main', 'preview', 'protocol.ts'],
      ['renderer', 'editor', 'html', 'preview-url.ts'],
      ['renderer', 'editor', 'html', 'source.ts']
    ]) {
      expect(code(...file), file.join('/')).not.toMatch(
        /export type PreviewRefusal\s*=\s*\n?\s*\|/
      );
    }
  });

  it('computes the tab flag from the shared predicate', () => {
    const store = code('renderer', 'editor', 'store.ts');
    expect(store).toContain('canPreviewPath(req.path)');
    expect(store).toContain('html: boolean');
  });
});
