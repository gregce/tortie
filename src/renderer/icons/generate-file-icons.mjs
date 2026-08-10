/**
 * GENERATOR for file-icons.generated.ts — run manually, commit the output:
 *
 *   node src/renderer/icons/generate-file-icons.mjs
 *
 * Source: material-icon-theme (npm, MIT — license verified 2026-08-09 against
 * the package's LICENSE file and npm registry metadata; © Philipp Kief).
 * Chosen over VS Code's built-in Seti theme because Seti ships only as an
 * icon FONT + mapping baked into the microsoft/vscode repo (not consumable
 * as a package), while material-icon-theme publishes per-file 16-grid SVGs
 * plus its own filename/extension mapping JSON on npm. It is the most-used
 * VS Code file-icon theme, so the tree reads instantly to VS Code users.
 *
 * Strategy: bundling all 1250 SVGs would bloat the renderer, so we embed a
 * curated subset. SEED_* lists below name what real repos contain; the
 * generator resolves each seed through material-icons.json to an icon id,
 * then emits (a) the SVG source of every reachable icon and (b) the FULL
 * name/extension maps filtered to those icons — so every alias the theme
 * knows about (e.g. `.jshintrc` → json) keeps working for free. Unknown
 * files fall back to the theme's own `file` icon.
 *
 * PER-FILE ICONS ONLY (Phase 11): @pierre/trees resolves per-path icons for
 * the file slot alone (`file-tree-icon-file` — dist/render/iconResolver.js);
 * a directory row's leading slot is always the chevron, and nothing in
 * FileTreeIconConfig is folder-shaped. So the theme's 122 per-basename folder
 * SVGs (folder-src, folder-test, …) stay out — 48% of the payload for a
 * surface that cannot address them. What DOES ship is the generic closed/open
 * pair below: two ~250-byte SVGs the tree paints into a second icon column
 * with CSS (src/renderer/tree/pierre-icons.ts), which is the only folder
 * distinction the row can express. DESIGN.md §3.1 records the same limit.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const themeJsonPath = require.resolve('material-icon-theme/dist/material-icons.json');
const theme = JSON.parse(readFileSync(themeJsonPath, 'utf8'));
const iconsDir = resolve(dirname(themeJsonPath), '..', 'icons');

/** Extensions we guarantee coverage for (suffix keys, longest-match first at runtime). */
const SEED_EXTENSIONS = [
  // web / js
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts', 'd.ts', 'js.map', 'json', 'jsonc',
  'html', 'css', 'scss', 'sass', 'less', 'vue', 'svelte', 'astro',
  'test.ts', 'test.tsx', 'spec.ts', 'spec.tsx', 'test.js', 'spec.js',
  // docs / text
  'md', 'mdx', 'txt', 'log', 'pdf', 'csv', 'tsv', 'rtf',
  // data / config
  'yml', 'yaml', 'xml', 'toml', 'ini', 'conf', 'env', 'lock', 'graphql', 'gql', 'proto',
  'sql', 'db', 'sqlite', 'plist',
  // images / media / fonts
  'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'icns', 'bmp',
  'mp3', 'wav', 'flac', 'mp4', 'mov', 'webm', 'avi',
  'ttf', 'otf', 'woff', 'woff2',
  // archives / binaries
  'zip', 'tar', 'gz', 'tgz', 'bz2', '7z', 'rar', 'wasm', 'dmg', 'exe',
  // languages
  'py', 'ipynb', 'rs', 'go', 'java', 'jar', 'kt', 'kts', 'swift', 'c', 'cpp', 'cc', 'h', 'hpp',
  'cs', 'rb', 'erb', 'php', 'lua', 'r', 'scala', 'hs', 'ex', 'exs', 'erl', 'zig', 'dart',
  'clj', 'elm', 'ml', 'nim', 'pl', 'groovy', 'coffee',
  // shell
  'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd', 'nu',
  // misc
  'patch', 'diff', 'snap', 'gradle', 'tf', 'tfvars', 'prisma', 'sol', 'vsix', 'apk', 'key', 'pem'
];

/** Exact (lowercased) filenames we guarantee coverage for. */
const SEED_FILENAMES = [
  'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', '.npmrc', '.nvmrc',
  'tsconfig.json', 'jsconfig.json',
  '.gitignore', '.gitattributes', '.gitmodules', '.gitconfig',
  'readme.md', 'license', 'license.md', 'license.txt', 'changelog.md', 'contributing.md',
  'code_of_conduct.md', 'security.md', 'todo.md',
  'dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore',
  'makefile', 'cmakelists.txt', 'justfile',
  'vite.config.ts', 'vite.config.js', 'vitest.config.ts', 'vitest.config.js',
  'webpack.config.js', 'rollup.config.js', 'esbuild.config.js',
  'jest.config.js', 'jest.config.ts', 'playwright.config.ts', 'cypress.config.ts',
  '.eslintrc', '.eslintrc.json', '.eslintrc.js', 'eslint.config.js', 'eslint.config.mjs',
  '.prettierrc', 'prettier.config.js', '.prettierignore',
  'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js',
  'next.config.js', 'next.config.mjs', 'nuxt.config.ts', 'svelte.config.js', 'astro.config.mjs',
  'babel.config.js', '.babelrc', '.editorconfig', '.env.example',
  'go.mod', 'go.sum', 'pyproject.toml', 'requirements.txt', 'poetry.lock', 'pipfile',
  'gemfile', 'gemfile.lock', 'rakefile', 'pom.xml', 'build.gradle', 'settings.gradle',
  'cargo.toml', 'cargo.lock',
  'procfile', 'vercel.json', 'netlify.toml', 'firebase.json', 'renovate.json', '.mailmap',
  'codeowners', '.vscodeignore', 'browserslist', 'nodemon.json', 'lerna.json', 'turbo.json', 'nx.json'
];

const wanted = new Set([theme.file]);

const misses = [];
for (const ext of SEED_EXTENSIONS) {
  const icon = theme.fileExtensions[ext];
  if (icon) wanted.add(icon);
  else misses.push(`ext:${ext}`);
}
for (const name of SEED_FILENAMES) {
  const icon = theme.fileNames[name];
  if (icon) wanted.add(icon);
  // seed misses fall through to extension matching at runtime — fine.
}
/** Namespace every id inside an icon so two icons in one document can't cross-link. */
function namespaceIds(svg, iconName) {
  const prefix = `mi-${iconName.replace(/[^a-z0-9-]/gi, '')}-`;
  return svg
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}${id})`)
    .replace(/\bxlink:href="#([^"]+)"/g, (_, id) => `xlink:href="#${prefix}${id}"`)
    .replace(/\bhref="#([^"]+)"/g, (_, id) => `href="#${prefix}${id}"`);
}

const svgs = {};
for (const icon of [...wanted].sort()) {
  const def = theme.iconDefinitions[icon];
  if (!def) {
    console.warn(`no iconDefinition for ${icon} — skipped`);
    wanted.delete(icon);
    continue;
  }
  let svg = readFileSync(join(iconsDir, `${icon}.svg`), 'utf8').trim();
  svg = svg.replace(/<\?xml[^?]*\?>\s*/g, '');
  svgs[icon] = namespaceIds(svg, icon);
}

/** Filter a whole theme map down to entries whose icon made the cut. */
function filterMap(map) {
  const out = {};
  for (const [key, icon] of Object.entries(map).sort(([a], [b]) => a.localeCompare(b))) {
    if (wanted.has(icon)) out[key] = icon;
  }
  return out;
}

const extMap = filterMap(theme.fileExtensions);
const nameMap = filterMap(theme.fileNames);

/**
 * The generic folder pair (`folder` / `folder-open`). Emitted raw, not
 * namespaced: these two are painted as CSS background images, so their ids —
 * if they ever gain any — would live in a separate document anyway.
 */
const folderSvgs = {};
for (const [key, icon] of [
  ['closed', theme.folder],
  ['open', theme.folderExpanded]
]) {
  folderSvgs[key] = readFileSync(join(iconsDir, `${icon}.svg`), 'utf8')
    .trim()
    .replace(/<\?xml[^?]*\?>\s*/g, '');
}

const themeVersion = require('material-icon-theme/package.json').version;
const banner = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate: node src/renderer/icons/generate-file-icons.mjs
 *
 * Curated subset of material-icon-theme v${themeVersion} (npm, MIT license —
 * © Philipp Kief, https://github.com/material-extensions/vscode-material-icon-theme).
 * See generate-file-icons.mjs for why this theme and how the subset is chosen.
 * Per-file icons plus the generic closed/open folder pair — @pierre/trees
 * resolves per-path icons for files only (see the header of
 * generate-file-icons.mjs).
 * ${Object.keys(svgs).length} icons · ${Object.keys(extMap).length} extension aliases · ${Object.keys(nameMap).length} filename aliases.
 */

`;

const body = `export const FILE_ICON_SVGS: Record<string, string> = ${JSON.stringify(svgs, null, 0)};

export const EXT_TO_ICON: Record<string, string> = ${JSON.stringify(extMap)};

export const NAME_TO_ICON: Record<string, string> = ${JSON.stringify(nameMap)};

export const DEFAULT_FILE_ICON = ${JSON.stringify(theme.file)};

/** Generic folder art — painted as CSS background images, not sprite symbols. */
export const FOLDER_ICON_SVGS: { closed: string; open: string } = ${JSON.stringify(folderSvgs)};
`;

const outPath = join(here, 'file-icons.generated.ts');
writeFileSync(outPath, banner + body);
const kb = (banner.length + body.length) / 1024;
console.log(`wrote ${outPath}`);
console.log(`${Object.keys(svgs).length} icons, ${kb.toFixed(0)} KB`);
if (misses.length) console.log('seed misses (fall back to default):', misses.join(', '));
