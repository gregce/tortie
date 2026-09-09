/**
 * PHASE 247 — the probe `npm run conformance:pathdoors` drives.
 *
 * It runs the SHIPPING door sequence over hostile shapes it builds itself in a
 * scratch directory it removes in a `finally`, and prints ONE line of JSON.
 * The gate judges what it printed; this file decides nothing.
 *
 * NOTHING HERE IS EVER OPENED OR EXECUTED. Every answer is `lstat`, `realpath`
 * and `stat`, and a refusal is a word. `shell.openPath` and `shell.openExternal`
 * are not imported, are not reachable from anything imported, and are never
 * called: this probe runs under plain node and electron is not in its graph.
 *
 * `P247_MODULES` names a directory holding an ABLATED copy of the sequence.
 * Unset, it drives the shipping one.
 */

import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const modules = process.env['P247_MODULES'];
const from = (name: string): string =>
  modules === undefined
    ? new URL(
        name === 'path-door'
          ? '../../src/main/fs/path-door.ts'
          : `../../src/shared/${name}.ts`,
        import.meta.url
      ).href
    : pathToFileURL(join(modules, `${name}.ts`)).href;

const door = (await import(from('path-door'))) as {
  answerPathDoor(raw: string): Promise<
    { door: string; path: string } | { door: null; refusal: string }
  >;
};
const doors = (await import(from('path-doors'))) as {
  EXTERNAL_ALLOW: ReadonlySet<string>;
  decidePathDoor(facts: {
    spelling: string;
    realPath: string | null;
    kind: 'file' | 'dir' | 'other' | 'missing';
    bundle: boolean;
    executable: boolean;
  }): { door: string | null; refusal?: string };
};
const spans = (await import(from('path-spans'))) as {
  pathSpansInRow(
    row: string,
    above: string | null
  ): { text: string; start: number; end: number; target: string; line?: number }[];
};

/** The answer as one word, so a matrix is comparable across ablations. */
function word(
  a: { door: string; path: string } | { door: null; refusal: string }
): string {
  return a.door === null ? `refused:${a.refusal}` : `door:${a.door}`;
}

const readings: Record<string, string> = {};
const dir = realpathSync(mkdtempSync(join(tmpdir(), 'p247-probe-')));

try {
  const file = (name: string, body = 'x', mode?: number): string => {
    const p = join(dir, name);
    writeFileSync(p, body);
    if (mode !== undefined) chmodSync(p, mode);
    return p;
  };

  const ask = async (key: string, path: string): Promise<void> => {
    readings[key] = word(await door.answerPathDoor(path));
  };

  // --- the Tortie doors ----------------------------------------------------
  await ask('prose', file('notes.md', '# hi'));
  await ask('code', file('mod.ts', 'export {};'));
  await ask('picture', file('shot.png'));
  await ask('no-extension', file('LICENSE', 'MIT'));

  // --- the one door that leaves ---------------------------------------------
  await ask('pdf', file('paper.pdf'));

  // --- the mode rule, which is the precision the root rule used to buy ------
  await ask('png-executable', file('run.png', '#!/bin/sh\n', 0o755));
  await ask('pdf-executable', file('paper2.pdf', 'x', 0o755));
  await ask('command-executable', file('go.command', '#!/bin/sh\n', 0o755));
  await ask('command-plain', file('go2.command', '#!/bin/sh\n', 0o644));
  await ask('dylib', file('lib.dylib', 'x', 0o755));
  await ask('group-execute-only', file('grp', 'x', 0o050));
  await ask('other-execute-only', file('oth', 'x', 0o005));
  await ask('shebang-family', '/usr/bin/env');

  // --- a picture that is not a picture -------------------------------------
  // Tortie's image surface decodes bytes and runs nothing, which is why this
  // is a door rather than a refusal.
  await ask('png-that-is-a-script', file('fake.png', '#!/bin/sh\necho hi\n'));

  // --- bundles, whatever the suffix claims ----------------------------------
  const bundle = join(dir, 'shot2.png');
  mkdirSync(join(bundle, 'Contents'), { recursive: true });
  writeFileSync(join(bundle, 'Contents', 'Info.plist'), '<plist/>');
  await ask('bundle-wearing-png', bundle);

  const app = join(dir, 'Thing.app');
  mkdirSync(join(app, 'Contents', 'MacOS'), { recursive: true });
  writeFileSync(join(app, 'Contents', 'MacOS', 'Thing'), '#!/bin/sh\n');
  chmodSync(join(app, 'Contents', 'MacOS', 'Thing'), 0o755);
  await ask('app-bundle', app);

  symlinkSync(app, join(dir, 'pic.png'));
  await ask('link-png-to-bundle', join(dir, 'pic.png'));

  // --- every question is asked of the REALPATH, leaf included --------------
  symlinkSync(file('server.pem', 'k'), join(dir, 'readme.md'));
  await ask('link-md-to-key-material', join(dir, 'readme.md'));
  symlinkSync(file('real.pdf'), join(dir, 'spelled.md'));
  await ask('link-md-to-pdf', join(dir, 'spelled.md'));
  symlinkSync(file('runner.sh', '#!/bin/sh\n', 0o755), join(dir, 'doc.md'));
  await ask('link-md-to-executable', join(dir, 'doc.md'));

  // --- the spellings that never reach a filesystem call --------------------
  await ask('newline-in-spelling', `${dir}/notes.md\n/etc/passwd`);
  await ask('relative', 'src/main/fs/ipc.ts');
  await ask('missing', join(dir, 'never-written'));
  await ask('directory', dir);
  await ask('network-mount', '/net/anything/x.md');
  await ask('volume-mount', '/Volumes/anything/x.md');

  // --- the credential family, and the ordinary file beside it -------------
  await ask('dotenv', file('.env', 'A=1'));
  await ask('credential-auth-json', file('auth.json', '{}'));
  await ask('credential-npmrc', file('.npmrc', '_authToken=x'));
  await ask('credential-aws', file('credentials', '[default]'));
  // The control. A name-only rule that refused every .json would be useless,
  // and this is what says it does not.
  await ask('ordinary-json', file('package.json', '{}'));
  await ask('ordinary-config-json', file('config.json', '{}'));

  // --- the widening working as intended ------------------------------------
  await ask('system-text-file', '/etc/hosts');

  // --- the pure decision, so the ORDER can be read without a filesystem ----
  readings['order-mode-before-extension'] = word(
    doors.decidePathDoor({
      spelling: '/a/paper.pdf',
      realPath: '/a/paper.pdf',
      kind: 'file',
      bundle: false,
      executable: true
    }) as { door: null; refusal: string }
  );
  readings['order-name-before-mode'] = word(
    doors.decidePathDoor({
      spelling: '/a/id_rsa',
      realPath: '/a/id_rsa',
      kind: 'file',
      bundle: false,
      executable: true
    }) as { door: null; refusal: string }
  );
  readings['order-bundle-before-regular-file'] = word(
    doors.decidePathDoor({
      spelling: '/a/Thing.app',
      realPath: '/a/Thing.app',
      kind: 'dir',
      bundle: true,
      executable: true
    }) as { door: null; refusal: string }
  );
  readings['order-spelling-before-realpath'] = word(
    doors.decidePathDoor({
      spelling: 'relative/thing.md',
      realPath: '/a/thing.md',
      kind: 'file',
      bundle: false,
      executable: false
    }) as { door: null; refusal: string }
  );

  // --- the closed set ------------------------------------------------------
  readings['external-allow'] = [...doors.EXTERNAL_ALLOW].sort().join(',');

  // --- refusal 8 and the span grammar, over rows -------------------------
  const row = (key: string, text: string, above: string | null): void => {
    readings[key] = spans
      .pathSpansInRow(text, above)
      .map((s) => `${s.target}@${String(s.start)}-${String(s.end)}${s.line === undefined ? '' : `:${String(s.line)}`}`)
      .join(' ');
  };
  row('span-plain', 'wrote /a/b.md for you', null);
  row('span-line-suffix', 'see /a/b.ts:42:7 there', null);
  row('span-url-left-alone', 'read https://x.dev/a/b and /a/b.md now', null);
  row('span-ends-the-row', 'wrote /a/b.md', null);
  row('span-heads-a-continued-row', '/b.md and more text', 'wrote /a');
  row('span-heads-an-uncontinued-row', '/b.md and more text', 'all done!');
  row('span-behind-a-gutter', '  | /b.md and more', 'wrote /a');
  row('span-fraction', 'did 171/383 of them', null);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify(readings)}\n`);
