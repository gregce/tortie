#!/usr/bin/env node
/**
 * generate-menu-icons.mjs. The menu bar's and the tray's marks, generated once
 * and committed (Phase 156).
 *
 * ## The problem this solves, stated first
 *
 * Phase 153 put codicon marks on every right click menu. It could do that
 * because a right click menu is composed in the RENDERER, where the codicon
 * font is loaded and a canvas can paint it, and the PNG travels to main over
 * the `ui:popupMenu` bridge.
 *
 * The application menu bar and the tray menu are not like that. `installAppMenu`
 * runs inside `installMainCapabilities` at `src/main/capabilities.ts:130`, and
 * `createWindow()` is at `src/main/index.ts:535`. The menu is installed BEFORE
 * the window object exists, let alone before the renderer has mounted and the
 * font has arrived. `installTray()` builds its menu immediately after with
 * empty lists. So there is no renderer to ask at the moment main needs pixels.
 *
 * ## The three options and why this is the one
 *
 *  A. Generate the set at build time into a committed module. What this file
 *     does. `src/renderer/icons/file-icons.generated.ts` already establishes
 *     the pattern, down to the "Regenerate:" line in its header.
 *  B. Have a window rasterize once at boot and rebuild both menus. Refused. The
 *     menu bar would be iconless for the first second of every launch, the tray
 *     menu is built before that window exists at all, and a menu a person can
 *     open with no window focused would gain a dependency on a renderer that
 *     may have crashed.
 *  C. Ship one PNG file per mark under `resources/`. Refused. It reuses the
 *     tray's existing dev vs packaged path fork, but it costs sixty or a
 *     hundred and twenty files, new electron-builder `extraResources` plumbing,
 *     and a packaged path that can go missing and fail silently, to save a
 *     module this file measures and prints the size of.
 *
 * ## Where the bytes come from
 *
 * NOT from a second rasterizer. This script starts the real built renderer with
 * `harness=1`, waits for the probe chunk to install
 * `window.__gmuxP156MenuIcons`, and reads back the cache the product's own
 * `warmMenuIcons()` filled. One rasterizer, one closed set of names, two
 * processes reading it.
 *
 * ## Safety
 *
 *  - The Electron goes through build/electron-run.mjs, which ends its whole
 *    process tree in a `finally` block whatever happened here.
 *  - It starts no tmux server and names no socket.
 *  - It writes exactly two paths: its own scratch profile under the system
 *    temporary directory, and `src/main/menu-icons.generated.ts`.
 *
 * ## Usage, from the worktree root
 *
 *   npm run build
 *   node build/generate-menu-icons.mjs
 *
 * Exit 0 when the set was written, 1 when it was not.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[gen:menu-icons]';
const say = (line) => console.log(`${TAG} ${line}`);

const TABLE = join(repoRoot, 'src', 'shared', 'menu-codicons.ts');
const TARGET = join(repoRoot, 'src', 'main', 'menu-icons.generated.ts');

/** The closed set, read out of the one file that declares it. */
function readNames() {
  const source = readFileSync(TABLE, 'utf8');
  const opened = source.indexOf('MENU_CODICONS = [');
  if (opened === -1) throw new Error('MENU_CODICONS is not in ' + TABLE);
  const body = source.slice(opened).split('] as const')[0];
  return [...body.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
}

const scratch = mkdtempSync(join(tmpdir(), 'tortie-p156-gen-'));
const profile = join(scratch, 'profile');
const outFile = join(scratch, 'icons.json');

async function main() {
  const names = readNames();
  say(`${names.length} names in the closed set`);

  await withElectron(
    {
      label: 'p156 generate',
      userDataDir: profile,
      cwd: repoRoot,
      entry: false,
      // The default adds `-ApplePersistenceIgnoreState YES`, and Electron takes
      // the first non-flag argument as the app path, so the bare `YES` would be
      // the app and the script below would never run. The same note Phase 153
      // wrote at its own standalone launch.
      persistence: false,
      args: [join(repoRoot, 'build', 'p156-generate-main.cjs')],
      env: { ...process.env, P156_OUT: outFile },
      graceMs: 10_000,
      ceilingMs: 120_000
    },
    async (handle) => {
      await handle.exited;
    }
  );

  const report = JSON.parse(readFileSync(outFile, 'utf8'));
  // P156_DUMP writes the raw `name → data URL` report to a path of your
  // choosing. Nothing in the product reads it. It is here so a verifier can
  // re-derive the bitmaps by a method of its own, which is what found that
  // `source-control` and `git-branch` are one drawing.
  const dump = process.env['P156_DUMP'];
  if (dump !== undefined && dump !== '') writeFileSync(dump, JSON.stringify(report));
  for (const why of report.failures ?? []) console.error(`${TAG} ${why}`);
  const icons = report.icons ?? {};

  const missing = names.filter((n) => typeof icons[n] !== 'string');
  const extra = Object.keys(icons).filter((n) => !names.includes(n));
  if (missing.length > 0) {
    console.error(
      `${TAG} the renderer produced no bitmap for: ${missing.join(', ')}`
    );
  }
  if (extra.length > 0) {
    console.error(
      `${TAG} the renderer produced names the table does not carry: ` +
        extra.join(', ')
    );
  }
  if (missing.length > 0 || extra.length > 0 || names.length === 0) {
    return 1;
  }

  // Distinct bitmaps, checked HERE as well as in the gate, because a run where
  // the font never arrived produces sixty identical blank boxes and every one
  // of them is a valid PNG. Refusing to write is better than committing them.
  const firstWithBytes = new Map();
  const collisions = [];
  for (const n of names) {
    const already = firstWithBytes.get(icons[n]);
    if (already !== undefined) collisions.push([already, n]);
    else firstWithBytes.set(icons[n], n);
  }
  if (collisions.length > 0) {
    for (const [a, b] of collisions) {
      console.error(
        `${TAG} "${a}" and "${b}" drew the SAME picture, byte for byte, ` +
          'even though the stylesheet binds them to different codepoints.'
      );
    }
    console.error(
      `${TAG} ${String(names.length)} names produced only ` +
        `${String(firstWithBytes.size)} distinct bitmaps. All of them ` +
        'identical is what a run with no font looks like; a few is a font ' +
        'that draws one shape for several names. Nothing was written.'
    );
    return 1;
  }
  const distinct = firstWithBytes;

  const body = names
    .map((n) => `  '${n}': '${icons[n]}'`)
    .join(',\n');
  const module = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate: node build/generate-menu-icons.mjs
 *
 * The ${String(names.length)} marks a native menu row built in MAIN may wear, as 32×32 flat
 * black PNG data URLs (Phase 156).
 *
 * WHERE THEY COME FROM. The generator starts the real built renderer and reads
 * back the cache \`warmMenuIcons()\` fills in
 * src/renderer/icons/codicon-menu-icon.ts, so these are the SAME bytes a right
 * click menu draws, painted from the same codicon font through the same
 * stylesheet rule. There is one rasterizer in this product and this is its
 * output.
 *
 * WHY THEY ARE COMMITTED. The application menu is installed before any window
 * exists, so main cannot ask a renderer for them at the moment it needs them.
 *
 * The names are the closed set in src/shared/menu-codicons.ts, and
 * build/assert-menu-glyphs.mjs proves this file and that table agree name for
 * name, that every entry decodes to a 32×32 PNG, and that no two of them are
 * the same picture.
 */

import type { MenuCodicon } from '@shared/menu-codicons';

export const MENU_ICON_PNGS: Record<MenuCodicon, string> = {
${body}
};
`;
  writeFileSync(TARGET, module);
  const bytes = Buffer.byteLength(module);
  say(
    `wrote ${TARGET.slice(repoRoot.length + 1)}: ${String(names.length)} marks, ` +
      `${String(distinct.size)} distinct bitmaps, ` +
      `${(bytes / 1024).toFixed(1)} KB of source ` +
      `(${String(bytes)} bytes).`
  );
  return 0;
}

let code = 1;
try {
  code = await main();
} catch (err) {
  console.error(`${TAG} ${String(err)}`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
process.exit(code);
