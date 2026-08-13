/**
 * `gmux-preview:` — the read-only channel that feeds the HTML preview frame.
 *
 * Phase 20.5. Research: docs/research/39-file-preview.md section 2.
 *
 * A repository HTML file is content the user did not write, and Phase 18.6
 * taught Tortie to clone arbitrary repositories, so previewing one means
 * displaying a stranger's markup inside the application that holds the
 * user's source, their credentials and their agent sessions. The frame that
 * shows it is `sandbox=""` with no keywords, and every byte it can reach
 * comes through this handler.
 *
 *   renderer (file: origin, application policy applies)
 *     <iframe sandbox="" src="gmux-preview://<token>/docs/index.html?v=3">
 *        |
 *        v
 *   main process, this file
 *     one response constructor, policy header set inside it
 *     realpath on the request AND on the root, then containment
 *     a per document request budget
 *     the preview contract's served list, which is NOT the image one
 *        |
 *        v
 *   preview frame, its own renderer process, opaque origin
 *     no preload, no window.gmux, no script of its own, no network
 *
 * THREE THINGS THIS FILE IS AND ONE IT IS NOT.
 *
 * It is the only place a `Response` for this scheme is built, so the policy
 * header cannot be missed by a new code path. It is the only place that
 * decides whether a path belongs to a project. It is the only place that
 * knows the map from an opaque host token to a project root.
 *
 * It is NOT a general file reader. `gmux-asset:` serves any absolute path
 * the renderer names, bounded by an image extension list. This one serves
 * paths BELOW one project root, bounded by the preview contract's own list,
 * and the root is fixed by the token in the URL rather than by the caller.
 *
 * WHY A TOKEN AND NOT `local`. Tortie holds several project tabs in one
 * window, which is one of the reasons the product exists, so "the project
 * root" cannot be implied by the scheme. The host segment names the project
 * and main holds the map. A relative request from inside the document keeps
 * the host segment, and the URL parser clamps `..` at the host, so a page in
 * one project cannot spell a path into another. Each project also gets its
 * own origin out of it.
 *
 * WHY `realpath` ON BOTH SIDES. A prefix check over joined paths was
 * measured serving the real /etc/passwd through a symlink named
 * docs/notes.html, and git stores symlinks, so `git clone` creates them.
 * Resolving only the request is not enough either: /tmp is a symlink to
 * /private/tmp on macOS, and a root spelled /tmp/proj then fails to contain
 * its own files. Both sides are resolved. Note that `realpath` does not
 * change letter case, so both sides come back in the spelling the disk uses
 * and the compare is exact.
 */

import { net, protocol } from 'electron';
import { randomBytes } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, normalize, resolve as resolvePath, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  canPreviewPath,
  isHtmlPath,
  previewMediaType
} from '@shared/preview-types';
import type {
  PreviewStats,
  PreviewStatsInput,
  PreviewUrlInput,
  PreviewUrlResult
} from '@shared/preview-types';
import { resolveProjectRoot } from '../fs/paths';
import type { AnchorRewrite } from './anchors';

export const PREVIEW_SCHEME = 'gmux-preview';

/**
 * The policy on every response, measured against a real project directory:
 * local stylesheets, local images and local fonts all applied, and zero
 * requests reached a local HTTP sink.
 *
 * `base-uri 'none'` is not decoration. Without it one `<base href="https://
 * evil/">` in the file rewrites every relative reference on the page to a
 * remote host.
 *
 * The header is a single point of failure and the failure is quiet. With it
 * removed, 2 requests left the frame under `sandbox=""` and 4 with no
 * sandbox attribute at all. That is why `previewResponse` below is the only
 * function in this module that builds a `Response`, and why a test counts
 * the `new Response(` occurrences in this file.
 */
export const PREVIEW_RESPONSE_POLICY = [
  "default-src 'none'",
  `img-src ${PREVIEW_SCHEME}: data:`,
  `style-src ${PREVIEW_SCHEME}: 'unsafe-inline'`,
  `font-src ${PREVIEW_SCHEME}: data:`,
  `media-src ${PREVIEW_SCHEME}:`,
  `frame-src ${PREVIEW_SCHEME}:`,
  "form-action 'none'",
  "base-uri 'none'"
].join('; ');

/**
 * The privileged declaration for this scheme.
 *
 * IT IS A DESCRIPTOR AND NOT A REGISTRATION CALL, AND THAT IS DELIBERATE.
 * `protocol.registerSchemesAsPrivileged` must be called exactly ONCE for the
 * whole application. Measured on Electron 43.3.0 on 2026-08-13, with two
 * calls registering one scheme each: `standard` and `stream` accumulated for
 * both schemes, and `secure`, `supportFetchAPI` and `corsEnabled` were kept
 * only for the scheme in the LAST call. A `fetch()` for the first scheme
 * then failed while the second succeeded. Adding a second call here would
 * therefore have stripped three privileges from `gmux-asset:` and broken
 * markdown images. The one call lists both descriptors.
 *
 * `corsEnabled: true` is load bearing and was also measured. The preview
 * frame has an opaque origin, so every request it makes for its own
 * subresources is cross origin. With `corsEnabled: false` a local
 * `@font-face` file was refused before the request reached this handler,
 * with "Cross origin requests are only supported for protocol schemes".
 * With it true the font loaded, and no `access-control-allow-origin` header
 * was needed to make that work.
 *
 * `supportFetchAPI` stays false. Nothing should ever `fetch()` this scheme.
 * Inside the frame `default-src 'none'` forbids it, and the application
 * renderer gains only `frame-src` for this scheme, not `connect-src`.
 *
 * `bypassCSP` stays false, and `allowServiceWorkers` is left unset, which
 * means false. A service worker would outlive the frame.
 */
export const PREVIEW_PRIVILEGED_SCHEME: Electron.CustomScheme = {
  scheme: PREVIEW_SCHEME,
  privileges: {
    standard: true,
    secure: true,
    stream: true,
    corsEnabled: true,
    supportFetchAPI: false,
    bypassCSP: false
  }
};

/**
 * WHICH FILES THIS HANDLER MAY OPEN IS NOT DECIDED HERE.
 *
 * `src/shared/preview-types.ts` holds that answer, because the editor asks
 * the same question to decide whether a tab gets the Preview control. Two
 * copies of the list drift into a tab that offers Preview and a handler that
 * then refuses to serve it. Three functions come from there:
 *
 *   canPreviewPath(p)      may this file be a preview DOCUMENT
 *   previewMediaType(p)    the type to answer with, or null to refuse
 *   isHtmlPath(p)          is this response the one that gets the rewrite
 *
 * Each one reads the NAME and never the content, and each runs a refusal
 * list before its allowlist. That matters after a symlink is resolved: a
 * request for logo.png that lands on id_rsa is asked again by its real name.
 *
 * The served set is deliberately NOT `IMAGE_EXTENSIONS`, which also decides
 * what opens in the image viewer. The reasons are written in that file.
 */

/**
 * Requests one previewed document may make before this handler starts
 * refusing.
 *
 * A scriptless page holding 8,000 one pixel images produced 8,001 handler
 * invocations, 63 ms of main process CPU inside the handler and a 106 ms gap
 * in a 10 ms main process timer. That is a delay rather than a freeze, and a
 * page can hold far more references than 8,000, so the number has to be
 * bounded by us. At the measured rate 1,000 requests cost about 8 ms of
 * added latency, and no honest repository page comes near it: the fixture
 * documentation sites measured in research 39 issued between 3 and 8.
 *
 * The budget resets when the renderer asks for a new preview URL, which is
 * the only way a document can be loaded, because only main knows the token.
 * Two preview tabs open on the same project share one token and therefore
 * one budget window. That is accepted: this is a cost bound and not a
 * containment boundary, and 1,000 is far above two honest pages.
 */
export const PREVIEW_REQUEST_BUDGET = 1000;

/**
 * Largest HTML document this handler will parse and serve.
 *
 * Matched to the editor's own 5 MB text cap on purpose. Above that cap the
 * Source pane refuses the file, and a Preview of a file the Source pane will
 * not show is a worse answer than a refusal in both places. It also bounds
 * the one read this handler does into main process memory, since an HTML
 * document is parsed for the anchor rewrite rather than streamed.
 */
export const PREVIEW_HTML_CAP_BYTES = 5 * 1024 * 1024;

/**
 * The anchor rewrite, supplied by the caller. `rewriteExternalAnchors` in
 * ./anchors.ts is the implementation, and this type is its shape.
 *
 * An external link cannot navigate the frame, because the application's
 * `frame-src` refuses the URL before any navigation event fires, and what is
 * left behind is a blank preview. So a link that leaves the project is made
 * inert, the visible text is kept, and the original address goes in the
 * `title` attribute. It has to be a real HTML parse, because an `href`
 * inside a comment fools a pattern.
 *
 * It is passed in rather than imported for two reasons. It is a REQUIRED
 * field, so a caller cannot forget it and quietly serve a document whose
 * links all lead to a blank frame. And it keeps the rewrite a pure function
 * over a string, which is how it is tested against the attacks it exists
 * for. The document URL goes with the bytes because the rewrite decides
 * "inside this project" by comparing the link's host to the token in this
 * URL.
 */
export type PreviewHtmlRewrite = (
  html: string,
  documentUrl: string
) => AnchorRewrite;

export interface PreviewProtocolDeps {
  rewriteHtml: PreviewHtmlRewrite;
}

/**
 * `PreviewStats` is declared in `@shared/preview-types` because it travels
 * over `preview:stats` to the renderer, which prints its numbers in the line
 * under the frame. The counts below are the ONLY honest source for that line.
 * A refusal this handler makes is invisible from the renderer's side: the
 * bytes never arrive, no event fires in the app process, and a pattern over
 * the source text cannot see a symlink that leaves the project or an image
 * that is not on disk. Measured on 2026-08-13, a page with 10 images refused
 * as outside the project had "Nothing in this page was blocked" printed under
 * it, because the renderer was guessing.
 */

/** One open project: its token, its resolved root and its running counts. */
interface PreviewRoot {
  token: string;
  /** The root as the caller spelled it. */
  root: string;
  /** `realpath` of the root. Containment compares against THIS. */
  realRoot: string;
  /** Requests seen since the current document began. */
  requests: number;
  /**
   * Counted up on every mint, so a reader of `stats` can tell whether the
   * counts still belong to the document it asked about. See
   * `PreviewStatsInput` for the case this exists for.
   */
  generation: number;
  stats: PreviewStats;
}

const byToken = new Map<string, PreviewRoot>();
const byRealRoot = new Map<string, PreviewRoot>();

function freshStats(): PreviewStats {
  return {
    served: 0,
    refusedOutsideRoot: 0,
    refusedType: 0,
    refusedBudget: 0,
    refusedMissing: 0,
    refusedUnreadable: 0,
    inertLinks: 0
  };
}

/**
 * The token is 16 random bytes as lowercase hex. It carries no information
 * about the project, and it is already in the case a `standard:` scheme's
 * host is normalised to, so the string in the URL is the string in the map.
 */
function mintToken(): string {
  return randomBytes(16).toString('hex');
}

/**
 * True when `target` is `root` itself or sits below it.
 *
 * The separator is part of the test on purpose: without it, a root of
 * /Users/me/proj contains /Users/me/proj-secrets by simple prefix.
 */
function isInside(root: string, target: string): boolean {
  if (target === root) return true;
  const prefix = root.endsWith(sep) ? root : root + sep;
  return target.startsWith(prefix);
}

/** Percent-encode a POSIX path for the URL, segment by segment. */
function encodePath(relPosix: string): string {
  return relPosix
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

/**
 * `PreviewUrlInput`, `PreviewRefusal` and `PreviewUrlResult` were declared
 * here while this module was built and moved to `@shared/preview-types` at
 * integration. They travel over `preview:url`, so the renderer needs them,
 * and the refusal union in particular is a set of strings the viewer turns
 * into sentences. They are re-exported so this module still reads as the
 * owner of the contract it implements.
 */
export type {
  PreviewRefusal,
  PreviewStats,
  PreviewStatsInput,
  PreviewUrlInput,
  PreviewUrlResult
} from '@shared/preview-types';

/**
 * Mint the frame URL for one document, and begin its request budget.
 *
 * Every check the handler makes is made here as well, one round trip
 * earlier, so the renderer can show `missing`, `too-large` or a refusal
 * without first mounting a frame that will fail.
 */
export async function previewUrlForFile(
  input: PreviewUrlInput
): Promise<PreviewUrlResult> {
  const revision = input.revision ?? 0;
  if (!canPreviewPath(input.path)) {
    return { status: 'refused', reason: 'not-previewable' };
  }
  if (!isAbsolute(input.path) || input.path.includes('\0')) {
    return { status: 'refused', reason: 'missing' };
  }

  let realRoot: string;
  let realFile: string;
  try {
    // The codebase already has one answer for "resolve a project root":
    // absolute, existing, symlinks collapsed. Its sibling
    // `resolveInsideRoot` is deliberately NOT used for the file, because it
    // resolves parents and leaves the leaf alone, which is right for a
    // rename and wrong here. A read-only server has to resolve the leaf, or
    // a page named notes.html serves whatever it points at.
    realRoot = await resolveProjectRoot(input.root);
    realFile = await realpath(resolvePath(input.path));
  } catch {
    return { status: 'refused', reason: 'missing' };
  }

  // Ask again by the real name. A link named page.html that points at a
  // private key must not become previewable by its spelling.
  if (!canPreviewPath(realFile)) {
    return { status: 'refused', reason: 'not-previewable' };
  }
  if (!isInside(realRoot, realFile)) {
    return { status: 'refused', reason: 'outside-root' };
  }

  let bytes: number;
  try {
    const info = await stat(realFile);
    if (!info.isFile()) return { status: 'refused', reason: 'missing' };
    bytes = info.size;
  } catch {
    return { status: 'refused', reason: 'missing' };
  }
  if (bytes > PREVIEW_HTML_CAP_BYTES) {
    return { status: 'refused', reason: 'too-large' };
  }

  const entry = beginDocument(realRoot);
  // A root of '/' has no trailing separator to cut, so the leading slash is
  // put back rather than assumed.
  const cut = realFile.slice(realRoot.length);
  const rel = cut.startsWith('/') ? cut : `/${cut}`;
  const url = `${PREVIEW_SCHEME}://${entry.token}${encodePath(rel)}?v=${revision}`;
  return {
    status: 'ok',
    url,
    token: entry.token,
    generation: entry.generation,
    bytes
  };
}

/**
 * Reuse this project's token, or mint one, and reset the counts. Every call
 * is a new document, because the renderer calls this to load the frame.
 */
function beginDocument(realRoot: string): PreviewRoot {
  const existing = byRealRoot.get(realRoot);
  if (existing) {
    existing.requests = 0;
    existing.generation += 1;
    existing.stats = freshStats();
    return existing;
  }
  const entry: PreviewRoot = {
    token: mintToken(),
    root: realRoot,
    realRoot,
    requests: 0,
    generation: 1,
    stats: freshStats()
  };
  byRealRoot.set(realRoot, entry);
  byToken.set(entry.token, entry);
  return entry;
}

/**
 * What the handler did for one document.
 *
 * Null for a token nobody minted, for a project that has closed, and for a
 * generation that has been superseded. The third case is the one worth
 * spelling out. Two preview tabs on the same project share a token and
 * therefore share one counter, and the second tab to open resets it. Answering
 * the first tab with the second tab's counts would put a wrong number under a
 * page, so it is answered with null and the renderer then says nothing.
 */
export function previewStatsFor(input: PreviewStatsInput): PreviewStats | null {
  const entry = byToken.get(input.token);
  if (!entry) return null;
  if (entry.generation !== input.generation) return null;
  return { ...entry.stats };
}

/**
 * Forget a project's token, so its pages stop resolving. Call it when the
 * project closes. Nothing breaks if it is never called, because the map
 * holds one small row per project, but a closed project should not keep a
 * live door open.
 */
export async function releasePreviewRoot(root: string): Promise<void> {
  let realRoot: string;
  try {
    realRoot = await resolveProjectRoot(root);
  } catch {
    // A project folder that has been deleted still has a token to drop.
    realRoot = resolvePath(root);
  }
  const entry = byRealRoot.get(realRoot);
  if (!entry) return;
  byRealRoot.delete(realRoot);
  byToken.delete(entry.token);
}

/** Test seam. Drops every token, so tests do not leak state into each other. */
export function resetPreviewProtocolForTests(): void {
  byToken.clear();
  byRealRoot.clear();
}

/**
 * THE ONLY FUNCTION IN THIS MODULE THAT BUILDS A RESPONSE.
 *
 * Every path out of the handler comes through here, including every
 * refusal, so no response can exist without the policy header. A unit test
 * on the header string would still pass if somebody added a second
 * `new Response(` elsewhere in the file, so a second test counts them.
 *
 * `nosniff` keeps Chromium from guessing a type we did not choose.
 * `no-store` is what makes a reload show the file as it is now, which
 * matters because an agent is often rewriting it.
 */
function previewResponse(
  body: string | ReadableStream | null,
  init: { mediaType: string; status?: number }
): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      'content-type': init.mediaType,
      'content-security-policy': PREVIEW_RESPONSE_POLICY,
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store'
    }
  });
}

/** A refusal, in plain text, carrying the same header as anything else. */
function refuse(reason: string, status: number): Response {
  return previewResponse(reason, {
    mediaType: 'text/plain; charset=utf-8',
    status
  });
}

/**
 * Answer one request. Exported so tests can drive it without Electron's
 * registry, and registered below so production drives the same function.
 */
export async function servePreviewRequest(
  request: Request,
  deps: PreviewProtocolDeps
): Promise<Response> {
  if (request.method !== 'GET') return refuse('method not allowed', 405);

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return refuse('bad preview url', 400);
  }

  // The host segment is the whole of the authority to decide the root. An
  // unknown token is a page from a project that has closed, or a URL nobody
  // minted.
  const entry = byToken.get(url.hostname);
  if (!entry) return refuse('unknown preview token', 404);

  entry.requests += 1;
  if (entry.requests > PREVIEW_REQUEST_BUDGET) {
    entry.stats.refusedBudget += 1;
    return refuse('preview request budget spent', 429);
  }

  let requested: string;
  try {
    requested = decodeURIComponent(url.pathname);
  } catch {
    entry.stats.refusedMissing += 1;
    return refuse('bad preview path', 400);
  }
  // %00 decodes to a NUL, which some path APIs treat as a terminator.
  if (requested.includes('\0')) {
    entry.stats.refusedMissing += 1;
    return refuse('bad preview path', 400);
  }

  if (previewMediaType(requested) === null) {
    entry.stats.refusedType += 1;
    return refuse('not served in preview', 404);
  }

  // `..` above the root is already clamped at the host by the URL parser, so
  // this join cannot leave the root by spelling alone. The realpath below is
  // what handles the case the parser cannot see, which is a symlink.
  const abs = normalize(join(entry.realRoot, requested));

  let real: string;
  try {
    real = await realpath(abs);
  } catch {
    entry.stats.refusedMissing += 1;
    return refuse('preview file not found', 404);
  }

  if (!isInside(entry.realRoot, real)) {
    entry.stats.refusedOutsideRoot += 1;
    return refuse('outside the project', 404);
  }
  // Ask again after resolution. A symlink named logo.png that points at
  // id_rsa must not pass on the strength of its name.
  const mediaType = previewMediaType(real);
  if (mediaType === null) {
    entry.stats.refusedType += 1;
    return refuse('not served in preview', 404);
  }

  let size: number;
  try {
    const info = await stat(real);
    if (!info.isFile()) {
      entry.stats.refusedMissing += 1;
      return refuse('not a file', 404);
    }
    size = info.size;
  } catch {
    entry.stats.refusedMissing += 1;
    return refuse('preview file not found', 404);
  }

  // An HTML document is the one thing this handler does not serve verbatim:
  // its external anchors are made inert first, which needs the bytes in
  // memory. Everything else streams from disk through Chromium's own cache.
  if (isHtmlPath(real)) {
    if (size > PREVIEW_HTML_CAP_BYTES) {
      entry.stats.refusedUnreadable += 1;
      return refuse('document over the preview size cap', 413);
    }
    let source: string;
    try {
      source = await readFile(real, 'utf8');
    } catch {
      entry.stats.refusedUnreadable += 1;
      return refuse('preview file not readable', 404);
    }
    // A throw from the rewrite is a refusal, never an escape. Measured by a
    // sibling probe: parse5 serialises by recursion, and a document nested
    // about 100,000 elements deep exceeds the call stack. An exception out
    // of a protocol handler fails the load with no explanation and leaves an
    // unhandled rejection in main, so it is caught here and answered.
    let rewritten: AnchorRewrite;
    try {
      rewritten = deps.rewriteHtml(source, request.url);
    } catch {
      entry.stats.refusedUnreadable += 1;
      return refuse('preview could not read this document', 500);
    }
    // The rewrite keeps its own caps and does not hand back the input when it
    // trips, so there is no way to fall through to serving the file
    // unrewritten.
    //
    // EACH REFUSAL GETS ITS OWN SENTENCE. This body is what the reader sees
    // in the frame, so mapping both refusals to the size message told the
    // reader a 1.32 MB file was over a 5 MB cap. The two are not the same
    // problem and the fix for each is different: a large document is large,
    // and a deep one is a few hundred bytes of markup nested past the point
    // where parse5's serialiser overflows the stack.
    if (rewritten.status === 'too-large') {
      entry.stats.refusedUnreadable += 1;
      return refuse('document over the preview size cap', 413);
    }
    if (rewritten.status === 'too-deep') {
      entry.stats.refusedUnreadable += 1;
      return refuse(
        `document nested deeper than ${String(rewritten.maxDepth)} elements`,
        422
      );
    }
    entry.stats.served += 1;
    entry.stats.inertLinks += rewritten.inertLinks;
    return previewResponse(rewritten.html, { mediaType });
  }

  let upstream: Response;
  try {
    upstream = await net.fetch(pathToFileURL(real).toString());
  } catch {
    entry.stats.refusedUnreadable += 1;
    return refuse('preview file not readable', 404);
  }
  entry.stats.served += 1;
  return previewResponse(upstream.body, { mediaType });
}

/**
 * Install the handler. Call once, after the app is ready. The privileged
 * declaration is separate and must be part of the application's single
 * `registerSchemesAsPrivileged` call, for the reason on
 * `PREVIEW_PRIVILEGED_SCHEME`.
 */
export function registerPreviewProtocol(deps: PreviewProtocolDeps): void {
  protocol.handle(PREVIEW_SCHEME, (request) =>
    servePreviewRequest(request, deps)
  );
}
