/**
 * What Finder may offer to open with Tortie (Phase 61).
 *
 * This module is the single source of truth for the file types the app
 * declares to macOS. The declaration itself lives in electron-builder.yml,
 * under `mac.extendInfo.CFBundleDocumentTypes`, because Finder reads the
 * packaged Info.plist and never reads TypeScript. Two files carrying one
 * list would drift, so a chain of two checks holds them equal:
 *
 *  - `src/shared/__tests__/openable-drift.test.ts` holds the yml block
 *    equal to `OPENABLE_DOCUMENT_GROUPS`, entry for entry;
 *  - `build/assert-document-types.mjs` holds the packaged Info.plist equal
 *    to the yml block.
 *
 * So this module equals what Finder sees, transitively, and each link is
 * cheap to run.
 *
 * ## The rules the declaration lives under
 *
 * Every declared type carries CFBundleTypeRole Viewer and LSHandlerRank
 * Alternate. Tortie never seizes anyone's default app. The folder entry in
 * the yml has no extension list at all, because folders have no extension.
 * It declares the `public.folder` UTI, and it is the one UTI entry.
 *
 * ## What is deliberately absent
 *
 * No credential-shaped extension is ever declared. Nothing from
 * KEY_MATERIAL_EXTENSIONS in `preview-types.ts` appears here, and neither
 * does `env`. The editor can still open those files when the user asks from
 * inside Tortie. Finder must not advertise Tortie as a viewer for key
 * material. The drift test computes the intersection and requires it empty.
 *
 * Extensionless names (Makefile, Dockerfile, LICENSE) are also absent,
 * because CFBundleTypeExtensions cannot express them.
 *
 * ## Why the source and text group is a hand-written list
 *
 * Monaco displays any UTF-8 text file, so "what the editor shows" has no
 * finite extension set of its own. Finder needs a finite declaration. The
 * list below is the set of extensions agents in this corpus actually write
 * and Monaco actually highlights, per the corpus counts in research 39 part
 * 2 section 2. It is deliberately bounded. A file type not on it still
 * opens fine from inside Tortie. It is only absent from Finder's menu.
 */

import { IMAGE_MEDIA_TYPES, extensionOf } from './image-types';
import { PREVIEWABLE_EXTENSIONS } from './preview-types';

/** One CFBundleDocumentTypes entry, as this module owns it. */
export interface OpenableDocumentGroup {
  /** CFBundleTypeName in Info.plist. Shown by Finder in Get Info. */
  readonly name: string;
  /** Lowercase extensions, no dot, in the order the yml declares them. */
  readonly extensions: readonly string[];
}

/** `.md` becomes `md`. Info.plist extensions carry no dot. */
function stripDot(extension: string): string {
  return extension.slice(1);
}

/**
 * The markdown spellings, copied from MARKDOWN_EXTENSIONS in
 * `src/renderer/editor/markdown/markdown-path.ts`. A shared module may not
 * import a renderer module, so the copy lives here and the drift test holds
 * it equal to that file's set.
 */
const MARKDOWN_GROUP: OpenableDocumentGroup = {
  name: 'Markdown document',
  extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx']
};

/** Derived from PREVIEWABLE_EXTENSIONS, so it can never drift from it. */
const WEB_GROUP: OpenableDocumentGroup = {
  name: 'Web page',
  extensions: [...PREVIEWABLE_EXTENSIONS].map(stripDot)
};

/** Derived from IMAGE_MEDIA_TYPES, so it can never drift from it. */
const IMAGE_GROUP: OpenableDocumentGroup = {
  name: 'Image',
  extensions: Object.keys(IMAGE_MEDIA_TYPES).map(stripDot)
};

/**
 * The hand-chosen source and text extensions. The header explains why this
 * group is a hand-written list and how it was chosen.
 */
const SOURCE_GROUP: OpenableDocumentGroup = {
  name: 'Source or text file',
  extensions: [
    'ts',
    'tsx',
    'mts',
    'cts',
    'js',
    'jsx',
    'mjs',
    'cjs',
    'json',
    'jsonc',
    'css',
    'scss',
    'less',
    'py',
    'rb',
    'go',
    'rs',
    'java',
    'kt',
    'swift',
    'c',
    'h',
    'cc',
    'cpp',
    'hh',
    'hpp',
    'm',
    'mm',
    'cs',
    'php',
    'sh',
    'bash',
    'zsh',
    'fish',
    'ps1',
    'sql',
    'lua',
    'pl',
    'r',
    'yaml',
    'yml',
    'toml',
    'ini',
    'conf',
    'txt',
    'log',
    'csv',
    'tsv',
    'xml',
    'vue',
    'svelte',
    'graphql',
    'gql',
    'proto'
  ]
};

/**
 * The four groups Finder is told about, in the order the yml declares them.
 * The folder entry is not here, because it has no extensions. It exists only
 * in the yml, and the drift test pins its exact shape.
 */
export const OPENABLE_DOCUMENT_GROUPS: readonly OpenableDocumentGroup[] = [
  MARKDOWN_GROUP,
  WEB_GROUP,
  IMAGE_GROUP,
  SOURCE_GROUP
];

/** Every declared extension, lowercase, no dot. The union of the groups. */
export const OPENABLE_EXTENSIONS: ReadonlySet<string> = new Set(
  OPENABLE_DOCUMENT_GROUPS.flatMap((group) => group.extensions)
);

/**
 * True when this path carries an extension the app declares to Finder.
 *
 * It gates nothing. A file that fails this check still opens its project
 * and its tab when it arrives. Main asks it only to decide which log line
 * to write for an arrival Finder forced through the Other chooser.
 */
export function isOpenablePath(path: string): boolean {
  const extension = extensionOf(path);
  return extension !== '' && OPENABLE_EXTENSIONS.has(stripDot(extension));
}
