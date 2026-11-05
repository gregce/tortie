/**
 * Phase 350, his ruling of 2026-11-02 (R1): pi's installs planted as they lie
 * on a disk, for the tests that read pi's floor.
 *
 * The floor holds only for a binary whose REAL file sits inside pi's own
 * installed package (`insidePiPackage` in ../detection.ts): the nearest
 * package.json above it names `@earendil-works/pi-coding-agent`. So a test that
 * wants the floor to hold plants pi the way npm installs it (pi 0.84.2 on this
 * Mac is `~/.npm-global/bin/pi`, a relative link to
 * `../lib/node_modules/@earendil-works/pi-coding-agent/dist/cli.js`, read on
 * 2026-11-02), with the test's own `/bin/sh` stand-in as `dist/cli.js`; and a
 * test that plants a bare script on its PATH is planting a wrapper, whose
 * floor never holds. Nothing here starts a process.
 */

import { chmodSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

/** pi's own package name, spelled here on purpose so a moved constant turns these tests red. */
export const PI_PACKAGE = '@earendil-works/pi-coding-agent';

/** Write an executable file, its folder made first. */
export function writeExecutable(path: string, text: string): string {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  chmodSync(path, 0o755);
  return path;
}

/** A link at `at` to `target`, written relative as npm and bun write theirs, replacing whatever was there. */
export function linkTo(at: string, target: string): string {
  mkdirSync(dirname(at), { recursive: true });
  rmSync(at, { force: true });
  symlinkSync(relative(dirname(at), target), at);
  return at;
}

export interface PlantedPi {
  /** The path on the PATH: `<prefix>/bin/<binName>`, a link. */
  readonly bin: string;
  /** The real file the link leads to: the package's `dist/cli.js`. */
  readonly cli: string;
  /** The package's own folder, holding its package.json. */
  readonly root: string;
}

/**
 * pi as `npm install -g` lays it out under `prefix`: the package at
 * `<prefix>/lib/node_modules/<name>/` with a package.json naming `name`, the
 * stand-in `text` as its `dist/cli.js`, and `<prefix>/bin/<binName>` a relative
 * link to that file. `manifest` replaces the package.json's whole text (a
 * nameless or broken one); `name` plants another package's.
 */
export function plantNpmPi(
  prefix: string,
  text: string,
  options: { binName?: string; name?: string; manifest?: string; file?: string } = {}
): PlantedPi {
  const name = options.name ?? PI_PACKAGE;
  const root = join(prefix, 'lib', 'node_modules', ...name.split('/'));
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, 'package.json'),
    options.manifest ?? `${JSON.stringify({ name, version: '0.0.0-p350', type: 'module', bin: { pi: 'dist/cli.js' } }, null, '\t')}\n`
  );
  const cli = writeExecutable(join(root, options.file ?? join('dist', 'cli.js')), text);
  const bin = linkTo(join(prefix, 'bin', options.binName ?? 'pi'), cli);
  return { bin, cli, root };
}
