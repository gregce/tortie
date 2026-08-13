/**
 * The preview contract (Phase 20.5, research 39 sections 2.5, 3 and 5.6).
 * Which files earn a rendered view, and which bytes the `gmux-preview:`
 * protocol handler is allowed to stream.
 *
 * Shared by main and the renderer for the reason `image-types.ts` is shared.
 * "Can Tortie preview this file" must be ONE answer. The editor store asks it
 * to decide whether a tab gets the Preview, Source and Split control. The
 * protocol handler asks it as a security allowlist before it opens anything.
 * Two copies of that list drift into a tab that offers Preview and a handler
 * that then refuses to serve it, or the reverse, which is worse.
 *
 * ## Three rules this file exists to hold
 *
 * 1. **Eligibility is granted by extension and is never inferred from
 *    content.** A `.pem` is base64 text and a private key can be valid JSON.
 *    Sniffing would earn a JSON Web Key a pretty tree view. `canPreviewPath`
 *    reads the name and nothing else.
 * 2. **The served set is the preview handler's own, not `IMAGE_EXTENSIONS`.**
 *    That set also decides what opens in the image viewer, so it must not
 *    grow to carry stylesheets and fonts. See `PREVIEW_SERVED_MEDIA_TYPES`.
 * 3. **Some files must never get a rendered view at all**, and the reason is
 *    written beside each one in `NEVER_PREVIEW`. That list is redundant with
 *    the allowlist today, on purpose. See the comment above it.
 *
 * ## What a preview is, so the boundary is clear
 *
 * A preview renders a file the user OPENED, in a tab, on demand. Nothing here
 * runs during indexing, on hover in the file tree, or inside a search result.
 * Sessions are captured through SpecStory, so a rendered view of a file is a
 * candidate for appearing in a capture in a way the raw file is not. That is
 * the second reason this allowlist stays short.
 */

import { extensionOf } from './image-types';

/** File name of a path, with no directory part. Lowercased for matching. */
function baseNameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1).toLowerCase();
}

/**
 * The document types that earn a Preview mode. HTML and nothing else.
 *
 * `.xhtml` is deliberately absent. It is parsed as XML by a browser and by
 * nothing else here: the anchor rewrite in `src/main/preview/anchors.ts` uses
 * an HTML parser, which would quietly reshape a strict XML document before
 * serving it. Showing a mangled page is worse than showing the source.
 *
 * Mermaid, PDF, CSV and Quarto are each deferred to their own phase and are
 * NOT one word away from being added here. Each needs its own decision about
 * where its content runs. See research 39 section 3.
 */
export const PREVIEWABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.html',
  '.htm'
]);

/**
 * One rule about a file that must never be rendered, with the reason it is
 * refused and the examples that keep the rule honest.
 */
export interface NeverPreviewRule {
  /** What the rule matches, in plain words. */
  readonly what: string;
  /** Why a rendered view of this file is the wrong thing to build. */
  readonly reason: string;
  /**
   * File names this rule must refuse. The test iterates these, so a rule
   * cannot be narrowed without a failing test naming the file it stopped
   * covering.
   */
  readonly examples: readonly string[];
  /** Matches against the lowercased file name, never against content. */
  readonly matches: (name: string) => boolean;
}

/** Key material by extension. Named once so the rule and its test agree. */
const KEY_MATERIAL_EXTENSIONS: ReadonlySet<string> = new Set([
  '.pem',
  '.key',
  '.cer',
  '.crt',
  '.der',
  '.p12',
  '.pfx',
  '.jks',
  '.keystore',
  '.asc',
  '.gpg',
  '.ppk'
]);

/** The four spellings of an SSH private key file, plus the public half. */
const SSH_KEY_STEMS: readonly string[] = [
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519'
];

/**
 * Files that must never get a rendered view, with the reason on each row.
 *
 * ## Why this list exists when the allowlist already refuses every row
 *
 * Every name below is refused today by `PREVIEWABLE_EXTENSIONS` alone, because
 * none of them ends in `.html`. That is exactly why the list is written down.
 * The allowlist is a set somebody will add a line to. This list is the reason
 * they may not add a line for these, stated in the same file they would edit.
 * `canPreviewPath` runs it FIRST, so a future extension cannot silently grant
 * a preview to a file matching one of these names.
 *
 * ## Why refusing is the right answer, and it is not about rendering risk
 *
 * Rendering a `.env` is not technically dangerous. The harm is that a preview
 * changes what is displayed by default, in the direction of being easier to
 * read at a glance. A dotenv file rendered as a two column table of names and
 * values is a neat screenshot of someone's credentials, produced by the act of
 * clicking a file in a tree. Monospace text in an editor is the correct
 * presentation for a secret, because reading it takes deliberate effort.
 *
 * These are not hypothetical files. Tracked in git in 233 repositories on the
 * operator's machine on 2026-08-13: 79 `.env.*`, 10 `.env`, 8 `.key`, 8 named
 * `id_rsa`, 6 `.pem`, 2 `.cer` and 1 `.keystore` (research 39 section 3).
 */
export const NEVER_PREVIEW: readonly NeverPreviewRule[] = [
  {
    what: 'dotenv files, in every spelling',
    reason:
      'Key equals value parses as easily as a spreadsheet does, which is ' +
      'the trap. A two column table of names and values is a screenshot ' +
      'of the credentials, made by one click.',
    examples: ['.env', '.env.local', '.env.production', 'app/.env.test'],
    // `.env.local.html` is refused by the second half of this rule. That is
    // deliberate: a name that opens with `.env.` is a dotenv file whatever
    // somebody appended to it, and failing closed on a file nobody has is
    // cheaper than reasoning about which suffixes are safe.
    matches: (name) => name === '.env' || name.startsWith('.env.')
  },
  {
    what: 'private keys and certificates by extension',
    reason:
      'A key is base64 text, so every pretty renderer will lay it out ' +
      'happily. There is no reading value in a rendered private key, and ' +
      'there is harm in an easy one.',
    examples: ['server.pem', 'tls.key', 'ca.cer', 'store.keystore'],
    matches: (name) => KEY_MATERIAL_EXTENSIONS.has(extensionOf(name))
  },
  {
    what: 'SSH key files by name',
    reason:
      'These carry no extension at all, so an extension allowlist refuses ' +
      'them by construction. The rule is written down so it survives a ' +
      'later change that starts matching on names. Eight files called ' +
      'id_rsa are tracked in repositories on this machine.',
    examples: ['id_rsa', 'id_ed25519', 'id_rsa.pub', '.ssh/id_ecdsa'],
    matches: (name) =>
      SSH_KEY_STEMS.some((stem) => name === stem || name.startsWith(`${stem}.`))
  },
  {
    what: 'Java and Spring properties files',
    reason:
      'Same shape as a dotenv file and the same contents. A properties ' +
      'file is where a datasource password lives.',
    examples: ['application.properties', 'gradle.properties'],
    matches: (name) => extensionOf(name) === '.properties'
  },
  {
    what: 'netrc files',
    reason:
      'A netrc file is a plain text list of hosts with a login and a ' +
      'password beside each. Of everything on a developer machine, it is ' +
      'the secret that most wants to be laid out as a table.',
    examples: ['.netrc', '_netrc'],
    matches: (name) => name === '.netrc' || name === '_netrc'
  },
  {
    what: 'htpasswd files',
    reason:
      'A user list with password hashes. Rendered as a table it is a ' +
      'credential dump with column headers.',
    examples: ['.htpasswd', 'htpasswd'],
    matches: (name) => name === '.htpasswd' || name === 'htpasswd'
  }
];

/**
 * True when a path names a file that must never be rendered, whatever else
 * the allowlists say. Reads the file NAME only, never the content.
 */
export function looksLikeSecretPath(path: string): boolean {
  const name = baseNameOf(path);
  return NEVER_PREVIEW.some((rule) => rule.matches(name));
}

/**
 * True when a path names an HTML document.
 *
 * This answers "what kind of response is this", which is the handler's
 * question when it decides whether to run the anchor rewrite. It is NOT the
 * eligibility gate. `canPreviewPath` is the gate, and it refuses things this
 * function accepts.
 */
export function isHtmlPath(path: string): boolean {
  return PREVIEWABLE_EXTENSIONS.has(extensionOf(path));
}

/**
 * The eligibility gate. True when this file earns the Preview, Source and
 * Split control.
 *
 * The refusal list runs FIRST and the allowlist second. Both are name based.
 * There is no content branch in here and there must never be one: a private
 * key in JSON Web Key form is valid JSON, and content sniffing would hand it
 * a rendered view.
 */
export function canPreviewPath(path: string): boolean {
  if (looksLikeSecretPath(path)) return false;
  return isHtmlPath(path);
}

/**
 * What the `gmux-preview:` handler is allowed to stream, and the media type
 * it answers with.
 *
 * This is the preview handler's OWN set, deliberately not `IMAGE_EXTENSIONS`
 * from `image-types.ts`. That one also decides what the editor opens in the
 * image viewer, so widening it to cover stylesheets, fonts and video would
 * change which files claim the image tab. Research 39 section 2.5 makes this a
 * requirement rather than a preference.
 *
 * The five groups, and why each is here:
 *  - documents, so a link to a sibling page inside the project works;
 *  - stylesheets, because a page's own CSS is most of what a preview shows;
 *  - images, because a local screenshot or diagram is the other half;
 *  - fonts, because a page with a local webfont otherwise renders in a
 *    fallback and looks broken rather than plain;
 *  - media, because a `<video>` with a local source is a legitimate page.
 *
 * ## What is deliberately NOT served, and why
 *
 * `.js`, `.mjs`, `.ts` and `.map` are absent. The child response policy is
 * `default-src 'none'` with no `script-src`, so Chromium refuses a script
 * whether or not this handler would serve it. Leaving them out means the
 * request never reaches the disk, never spends a slot from the per document
 * request budget, and never suggests to a reader that the preview might run
 * the file. A local script is untrusted in exactly the way a remote one is.
 *
 * `.json`, `.txt`, `.xml` and `.wasm` are absent for the same reason: nothing
 * a scriptless page renders can consume them.
 */
export const PREVIEW_SERVED_MEDIA_TYPES: Readonly<Record<string, string>> = {
  // Documents.
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  // Stylesheets.
  '.css': 'text/css; charset=utf-8',
  // Images. SVG is safe here because the child policy has no `script-src`,
  // so a script element inside an SVG document is refused the same way a
  // page's own script is.
  '.apng': 'image/apng',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  // Fonts.
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  // Media.
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.ogv': 'video/ogg',
  '.wav': 'audio/wav',
  '.webm': 'video/webm'
};

/** Every extension the preview handler will open. */
export const PREVIEW_SERVED_EXTENSIONS: ReadonlySet<string> = new Set(
  Object.keys(PREVIEW_SERVED_MEDIA_TYPES)
);

/**
 * Media type for a path the preview handler was asked for, or null when the
 * handler must refuse.
 *
 * The refusal list runs first here too. It is unreachable through the served
 * set today, and it stays because the handler re-asks this question AFTER
 * resolving symlinks: a link named `logo.png` pointing at `~/.ssh/id_rsa`
 * comes back spelled `id_rsa`, and this is the function that has to say no.
 */
export function previewMediaType(path: string): string | null {
  if (looksLikeSecretPath(path)) return null;
  return PREVIEW_SERVED_MEDIA_TYPES[extensionOf(path)] ?? null;
}

/**
 * True when the preview handler may open this path at all.
 *
 * Separate from `previewMediaType` only so a caller that does not need the
 * string can read as what it is. Same answer, same rules.
 */
export function isPreviewServablePath(path: string): boolean {
  return previewMediaType(path) !== null;
}

// ---------------------------------------------------------------------------
// The `preview:url` contract.
//
// These three types are here rather than in src/main/preview/protocol.ts for
// the reason the rest of this file is shared. Main mints the URL and owns
// every refusal, and the renderer turns each refusal into a sentence the
// reader sees. Two declarations of the refusal union would let main add a
// reason the viewer renders as nothing at all.
//
// The renderer builds NO preview URL of its own. A second URL builder in that
// process would be a second opinion about which bytes are inside a project,
// and the containment argument rests on there being one.
// ---------------------------------------------------------------------------

/** What the renderer asks for when it wants a frame URL. */
export interface PreviewUrlInput {
  /** Absolute path of the open project root that owns the file. */
  root: string;
  /** Absolute path of the document to preview. */
  path: string;
  /**
   * Bumped by the renderer when the file changes on disk. It becomes `?v=`,
   * so Chromium fetches the new bytes instead of showing the old document
   * while an agent rewrites the file underneath the reader.
   */
  revision?: number;
}

/** Why a preview was refused, in the words the renderer needs to show. */
export type PreviewRefusal =
  | 'not-previewable'
  | 'outside-root'
  | 'missing'
  | 'too-large';

export type PreviewUrlResult =
  | {
      status: 'ok';
      /** The frame's `src`. */
      url: string;
      /** Host segment of that URL, and the key for `previewStatsFor`. */
      token: string;
      /**
       * Which document this token is currently serving, counted up on every
       * mint. It is the second half of the key for `previewStatsFor`, and the
       * reason it exists is written on `PreviewStatsInput`.
       */
      generation: number;
      /** Size of the document on disk. */
      bytes: number;
    }
  | { status: 'refused'; reason: PreviewRefusal };

// ---------------------------------------------------------------------------
// The `preview:stats` contract.
//
// WHY THIS CHANNEL EXISTS, and it is a correctness fix rather than a feature.
//
// The line under the frame says what the preview refused. Until this channel
// existed the renderer worked that line out by itself, from patterns over the
// source text, and so it could only ever see the two refusals that are visible
// in the markup: a `<script>` element and an `http:` address. Every refusal the
// HANDLER makes is invisible from there. Three cases were measured in the app
// on 2026-08-13, and in all three the line read "Nothing in this page was
// blocked" while the reader was looking at a broken page.
//
//   a page with 10 images and 2 nested frames refused as outside the project
//   a page where 501 of 1,500 image requests were refused by the budget
//   a document the handler refused outright for nesting depth
//
// So main now reports its own counts and the renderer folds them in. The call
// is read only, it returns six numbers and nothing else, and it is made by
// Tortie's own renderer after the frame's load event. NOTHING INSIDE A
// PREVIEWED DOCUMENT CAN REACH IT: that frame is `sandbox=""` with an opaque
// origin, it has no preload and its own response policy is `default-src
// 'none'`, so it has no way to call anything at all.
// ---------------------------------------------------------------------------

/**
 * What the handler did since the current document began.
 *
 * Every field is a count of requests, and the counts are monotonic within one
 * document, so a later reading is never smaller than an earlier one. That is
 * what lets the renderer poll twice and simply keep the later answer.
 */
export interface PreviewStats {
  /** Requests answered with bytes. */
  served: number;
  /** Refused because the resolved path is not inside the resolved root. */
  refusedOutsideRoot: number;
  /** Refused because the extension is not one this handler serves. */
  refusedType: number;
  /** Refused because the document spent its request budget. */
  refusedBudget: number;
  /** Refused because nothing is at that path inside the project. */
  refusedMissing: number;
  /**
   * Refused because the file is there and could not be turned into a
   * response. Over the 5 MB cap, nested past `MAX_NESTING_DEPTH`, or a read
   * that failed. Kept apart from `refusedMissing` because "not found" and
   * "found and refused" are different sentences to the reader.
   */
  refusedUnreadable: number;
  /** External anchors made inert across the documents served. */
  inertLinks: number;
}

/**
 * Which document's counts the renderer is asking for.
 *
 * THE GENERATION IS THE HONEST PART. One token belongs to one project, and
 * Tortie holds several tabs per project, so two preview tabs on the same
 * project share a token and therefore share one counter. Every mint resets
 * that counter. Without the generation, tab A could read the counts of the
 * document tab B just opened and print them under tab A's page. With it, main
 * answers null instead, and the renderer then makes no claim at all rather
 * than a wrong one.
 */
export interface PreviewStatsInput {
  token: string;
  generation: number;
}
