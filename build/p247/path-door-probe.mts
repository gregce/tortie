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
  couldBeAbsolute(spelling: string): boolean;
  decidePathDoor(facts: {
    spelling: string;
    realPath: string | null;
    kind: 'file' | 'dir' | 'other' | 'missing';
    bundle: boolean;
    executable: boolean;
  }): { door: string | null; refusal?: string };
};
interface RowEdges {
  width: number;
  columns: number[];
  above: string | null;
  aboveEnd: number;
}
const spans = (await import(from('path-spans'))) as {
  pathSpansInRow(
    row: string,
    edges: RowEdges
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

  // THE MOUNT ASKED OF THE REALPATH (the Phase 247 fix round's finding 3). A
  // symlink at an ordinary name is what carries a path onto a mount without
  // ever spelling one, and the spelling clause above cannot see it. It is the
  // pure decision because the live half would need a real stale automount.
  readings['order-mount-on-realpath'] = word(
    doors.decidePathDoor({
      spelling: '/Users/somebody/notes.md',
      realPath: '/Volumes/elsewhere/notes.md',
      kind: 'file',
      bundle: false,
      executable: false
    }) as { door: null; refusal: string }
  );
  readings['order-mount-on-realpath-net'] = word(
    doors.decidePathDoor({
      spelling: '/Users/somebody/notes.md',
      realPath: '/net/elsewhere/notes.md',
      kind: 'file',
      bundle: false,
      executable: false
    }) as { door: null; refusal: string }
  );

  // RULE 12. The renderer refuses a spelling that can never be absolute
  // before it makes a round trip, and its rule must be WIDER than main's or
  // it drops links in silence. So: every spelling `couldBeAbsolute` refuses
  // must really answer `not-absolute`, and the ones it admits are counted so
  // a predicate that refused everything could not read as a pass.
  const SPELLINGS = [
    'src/main/fs/ipc.ts',
    './a/b.md',
    '../a/b.md',
    'origin/main',
    'America/Chicago',
    '@scope/package',
    'a/b',
    '171/383',
    '$HOME/notes.md',
    '%USERPROFILE%/x',
    'file:///etc/hosts',
    '/etc/hosts',
    '~/notes.md',
    '~somebody/notes.md',
    '~'
  ];
  let widerRefused = 0;
  let widerAdmitted = 0;
  let widerWrong = 0;
  for (const spelling of SPELLINGS) {
    if (doors.couldBeAbsolute(spelling)) {
      widerAdmitted += 1;
      continue;
    }
    widerRefused += 1;
    const answer = await door.answerPathDoor(spelling);
    if (word(answer) !== 'refused:not-absolute') widerWrong += 1;
  }
  readings['could-be-absolute-refused'] = String(widerRefused);
  readings['could-be-absolute-admitted'] = String(widerAdmitted);
  readings['could-be-absolute-disagreed'] = String(widerWrong);

  // --- the closed set ------------------------------------------------------
  readings['external-allow'] = [...doors.EXTERNAL_ALLOW].sort().join(',');

  // --- refusal 8 and the span grammar, over rows -------------------------
  //
  // PHASE 250 narrowed refusal 8 from "the span ends its row" to "the span
  // runs off the pane's LAST COLUMN", so every row below names the width it
  // is read at. Every fixture row here is pure ASCII, where a string index
  // and a cell column are the same number, which is what makes the identity
  // map honest rather than a shortcut — the non-ASCII half is rule 11's, and
  // it drives a real `@xterm/xterm` buffer.
  const row = (
    key: string,
    text: string,
    above: string | null,
    width: number,
    aboveEnd?: number
  ): void => {
    readings[key] = spans
      .pathSpansInRow(text, {
        width,
        columns: [...text].map((_, i) => i).concat([text.length]),
        above,
        aboveEnd: aboveEnd ?? (above === null ? 0 : above.length)
      })
      .map((s) => `${s.target}@${String(s.start)}-${String(s.end)}${s.line === undefined ? '' : `:${String(s.line)}`}`)
      .join(' ');
  };
  const WIDE = 120;
  row('span-plain', 'wrote /a/b.md for you', null, WIDE);
  row('span-line-suffix', 'see /a/b.ts:42:7 there', null, WIDE);
  row('span-url-left-alone', 'read https://x.dev/a/b and /a/b.md now', null, WIDE);
  row('span-fraction', 'did 171/383 of them', null, WIDE);

  // PHASE 250 LIFT ONE. A path at the end of an ordinary sentence, in a pane
  // far wider than the sentence, IS offered — that is his first screenshot.
  row('span-ends-the-row', 'wrote /a/b.md', null, WIDE);
  // ...and the same text in a pane exactly that wide is a span whose last
  // cell IS the last column, which is the only shape a wrap can take. A
  // wrapped path stays refused.
  row('span-ends-the-row-at-the-width', 'wrote /a/b.md', null, 'wrote /a/b.md'.length);
  // ...and a resize can leave a row longer than today's width, so the
  // comparison is against the width and never against the row.
  row('span-past-the-width', 'wrote /a/b.md', null, 8);

  // The head half. A predecessor that filled its own last column carried
  // something over; one that stopped short did not.
  row('span-heads-a-row-below-a-full-one', '/b.md and more text', 'wrote /a', 'wrote /a'.length);
  row('span-heads-a-row-below-a-short-one', '/b.md and more text', 'wrote /a', WIDE);
  // THE PADDING, and it is why this is not research 111 section 4.1's
  // spelling: 32.2% of his rows run out to the width in spaces their drawn
  // text does not reach, and a padded predecessor did not wrap.
  row('span-heads-a-row-below-a-padded-one', '/b.md and more text', 'wrote /a', WIDE, 'wrote /a'.length);
  // ...and the predecessor's last character still has to be one a path can
  // continue with, which is the shipped rule's own second half.
  row('span-heads-a-row-below-a-full-sentence', '/b.md and more text', 'all done!', 'all done!'.length);
  row('span-heads-an-uncontinued-row', '/b.md and more text', 'all done!', WIDE);
  // The gutter, which is where a row's content really begins. The predecessor
  // is as long as the pane is wide here so the WIDTH clause cannot be what
  // refuses the span — otherwise a gutter ablation would move no reading and
  // the gutter clause would be pinned by nothing.
  row('span-behind-a-gutter', '  | /b.md and more', 'wrote /Users/gdc/a', 18);
  row('span-behind-a-gutter-below-a-short-one', '  | /b.md and more', 'wrote /Users/gdc/a', WIDE);

  // A map that does not reach the span cannot say where the span ends, and a
  // span whose end is unknown is exactly what refusal 8 is for. This is the
  // one reading that fails CLOSED rather than by a column comparison.
  readings['span-with-a-short-map'] = spans
    .pathSpansInRow('wrote /a/b.md here', {
      width: 120,
      columns: [0, 1, 2],
      above: null,
      aboveEnd: 0
    })
    .map((s) => `${s.target}@${String(s.start)}-${String(s.end)}`)
    .join(' ');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify(readings)}\n`);
