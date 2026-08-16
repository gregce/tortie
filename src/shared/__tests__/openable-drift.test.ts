/**
 * Link 1 of the Phase 61 drift chain. `src/shared/openable.ts` owns the list
 * of file types Finder may offer to open with Tortie, and the packaging
 * declaration in electron-builder.yml must equal it, entry for entry. Link 2
 * is `build/assert-document-types.mjs`, which holds the packaged Info.plist
 * equal to the yml. Together the two links mean openable.ts equals what
 * Finder sees.
 *
 * Three claims are under test.
 *
 *  1. The yml's CFBundleDocumentTypes equals OPENABLE_DOCUMENT_GROUPS, plus
 *     exactly one folder entry, with every role Viewer and every rank
 *     Alternate. Tortie never seizes anyone's default app.
 *  2. Each group equals the module it was derived from, so the declaration
 *     can never drift from what the app displays. The markdown tie reads the
 *     source text of markdown-path.ts, because that file is a renderer
 *     module and the shared TypeScript project cannot import it. The
 *     extraction fails loudly if the set literal moves or changes shape.
 *  3. No credential-shaped extension is ever declared. The intersection with
 *     the key material list is computed and required empty, `env` is absent,
 *     and no SSH key stem is present.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { IMAGE_MEDIA_TYPES } from '../image-types';
import {
  OPENABLE_DOCUMENT_GROUPS,
  OPENABLE_EXTENSIONS,
  isOpenablePath
} from '../openable';
import { PREVIEWABLE_EXTENSIONS, looksLikeSecretPath } from '../preview-types';

const ROOT = resolve(__dirname, '..', '..', '..');

/** The shape of one CFBundleDocumentTypes entry in electron-builder.yml. */
interface DocumentTypeEntry {
  CFBundleTypeName?: string;
  CFBundleTypeRole?: string;
  LSHandlerRank?: string;
  LSItemContentTypes?: string[];
  CFBundleTypeExtensions?: string[];
}

/** The declared document types, straight out of electron-builder.yml. */
function declaredDocumentTypes(): DocumentTypeEntry[] {
  const config = load(
    readFileSync(resolve(ROOT, 'electron-builder.yml'), 'utf8')
  ) as {
    mac?: { extendInfo?: { CFBundleDocumentTypes?: DocumentTypeEntry[] } };
  };
  const types = config.mac?.extendInfo?.CFBundleDocumentTypes;
  expect(
    Array.isArray(types),
    'electron-builder.yml has no mac.extendInfo.CFBundleDocumentTypes array'
  ).toBe(true);
  return types as DocumentTypeEntry[];
}

/**
 * The markdown extension set, read out of the source text of
 * `src/renderer/editor/markdown/markdown-path.ts`. See the header for why
 * this is a text extraction rather than an import.
 */
function markdownExtensionsFromSource(): string[] {
  const source = readFileSync(
    resolve(ROOT, 'src/renderer/editor/markdown/markdown-path.ts'),
    'utf8'
  );
  const literal = source.match(/MARKDOWN_EXTENSIONS = new Set\(\[([^\]]*)\]\)/);
  expect(
    literal,
    'markdown-path.ts no longer contains the MARKDOWN_EXTENSIONS set ' +
      'literal this test extracts. Update the extraction with it.'
  ).not.toBeNull();
  const inner = (literal as RegExpMatchArray)[1] ?? '';
  const extensions = [...inner.matchAll(/'([^']+)'/g)].map((m) => m[1] ?? '');
  expect(extensions.length).toBeGreaterThan(0);
  return extensions;
}

/** Key material, copied from KEY_MATERIAL_EXTENSIONS in preview-types.ts. */
const KEY_MATERIAL = [
  'pem',
  'key',
  'cer',
  'crt',
  'der',
  'p12',
  'pfx',
  'jks',
  'keystore',
  'asc',
  'gpg',
  'ppk'
];

/** The SSH key stems named in preview-types.ts. */
const SSH_KEY_STEMS = ['id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519'];

describe('the yml declaration equals the openable groups', () => {
  it('carries the folder entry first, and its exact shape', () => {
    const types = declaredDocumentTypes();
    const folder = types[0];
    expect(folder).toEqual({
      CFBundleTypeName: 'Folder',
      CFBundleTypeRole: 'Viewer',
      LSHandlerRank: 'Alternate',
      LSItemContentTypes: ['public.folder']
    });
    // Exactly public.folder, and no extension list on the folder entry.
    expect(folder?.CFBundleTypeExtensions).toBeUndefined();
  });

  it('carries each group after it, byte for byte, in order', () => {
    const types = declaredDocumentTypes();
    expect(types.length).toBe(OPENABLE_DOCUMENT_GROUPS.length + 1);
    OPENABLE_DOCUMENT_GROUPS.forEach((group, index) => {
      const entry = types[index + 1];
      expect(entry?.CFBundleTypeName, group.name).toBe(group.name);
      expect(entry?.CFBundleTypeExtensions, group.name).toEqual([
        ...group.extensions
      ]);
      expect(entry?.LSItemContentTypes, group.name).toBeUndefined();
    });
  });

  it('declares every entry role Viewer and rank Alternate', () => {
    for (const entry of declaredDocumentTypes()) {
      const name = entry.CFBundleTypeName ?? '(unnamed)';
      expect(entry.CFBundleTypeRole, name).toBe('Viewer');
      expect(entry.LSHandlerRank, name).toBe('Alternate');
    }
  });
});

describe('each group equals the module the app displays with', () => {
  it('markdown equals the set in markdown-path.ts', () => {
    const markdown = OPENABLE_DOCUMENT_GROUPS.find(
      (group) => group.name === 'Markdown document'
    );
    expect(markdown?.extensions).toEqual(markdownExtensionsFromSource());
  });

  it('web equals PREVIEWABLE_EXTENSIONS', () => {
    const web = OPENABLE_DOCUMENT_GROUPS.find(
      (group) => group.name === 'Web page'
    );
    expect(web?.extensions).toEqual(
      [...PREVIEWABLE_EXTENSIONS].map((extension) => extension.slice(1))
    );
  });

  it('image equals the keys of IMAGE_MEDIA_TYPES', () => {
    const image = OPENABLE_DOCUMENT_GROUPS.find(
      (group) => group.name === 'Image'
    );
    expect(image?.extensions).toEqual(
      Object.keys(IMAGE_MEDIA_TYPES).map((extension) => extension.slice(1))
    );
  });

  it('the union set carries every group member exactly once, no dots', () => {
    const all = OPENABLE_DOCUMENT_GROUPS.flatMap((group) => group.extensions);
    expect(OPENABLE_EXTENSIONS.size).toBe(all.length);
    for (const extension of all) {
      expect(OPENABLE_EXTENSIONS.has(extension), extension).toBe(true);
      expect(extension.startsWith('.'), extension).toBe(false);
      expect(extension, extension).toBe(extension.toLowerCase());
    }
  });
});

describe('what is never declared', () => {
  it('declares nothing from the key material list', () => {
    for (const extension of KEY_MATERIAL) {
      // The first check ties this test's copy of the list to the rule in
      // preview-types.ts. If the rule stops refusing one of these names,
      // this line fails and names it.
      expect(looksLikeSecretPath(`server.${extension}`), extension).toBe(true);
      expect(OPENABLE_EXTENSIONS.has(extension), extension).toBe(false);
    }
  });

  it('declares no extension the secret rules refuse', () => {
    for (const extension of OPENABLE_EXTENSIONS) {
      expect(looksLikeSecretPath(`sample.${extension}`), extension).toBe(
        false
      );
    }
  });

  it('declares no env and no SSH key stem', () => {
    expect(OPENABLE_EXTENSIONS.has('env')).toBe(false);
    expect(isOpenablePath('/p/.env')).toBe(false);
    expect(isOpenablePath('/p/.env.local')).toBe(false);
    for (const stem of SSH_KEY_STEMS) {
      expect(OPENABLE_EXTENSIONS.has(stem), stem).toBe(false);
      expect(isOpenablePath(`/home/u/.ssh/${stem}`), stem).toBe(false);
    }
  });
});

describe('isOpenablePath', () => {
  it('accepts declared extensions in any case', () => {
    expect(isOpenablePath('/p/README.md')).toBe(true);
    expect(isOpenablePath('/p/NOTES.MD')).toBe(true);
    expect(isOpenablePath('/p/shot.png')).toBe(true);
    expect(isOpenablePath('/p/index.html')).toBe(true);
    expect(isOpenablePath('/p/main.ts')).toBe(true);
  });

  it('refuses what the declaration does not carry', () => {
    expect(isOpenablePath('/p/archive.zip')).toBe(false);
    expect(isOpenablePath('/p/Makefile')).toBe(false);
    expect(isOpenablePath('/p/LICENSE')).toBe(false);
    expect(isOpenablePath('/p/tls.pem')).toBe(false);
    // A dotfile named like an extension is not that extension.
    expect(isOpenablePath('/p/.md')).toBe(false);
  });
});
