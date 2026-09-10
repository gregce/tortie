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
  answerPathDoor(raw: string, base?: string): Promise<
    { door: string; path: string } | { door: null; refusal: string }
  >;
};
const doors = (await import(from('path-doors'))) as {
  EXTERNAL_ALLOW: ReadonlySet<string>;
  couldBeAbsolute(spelling: string): boolean;
  couldBeAsked(spelling: string, base: string): boolean;
  insideBase(real: string, base: string): boolean;
  usableBase(base: string): boolean;
  decidePathDoor(facts: {
    spelling: string;
    realPath: string | null;
    kind: 'file' | 'dir' | 'other' | 'missing';
    bundle: boolean;
    executable: boolean;
    resolvedFrom: string | null;
  }): { door: string | null; refusal?: string };
};
interface RowEdges {
  width: number;
  columns: number[];
  above: string | null;
  aboveEnd: number | null;
}
const spans = (await import(from('path-spans'))) as {
  pathSpansInRow(
    row: string,
    edges: RowEdges
  ): { text: string; start: number; end: number; target: string; line?: number }[];
  stripDecoration(token: string): { target: string; line?: number; visible: number };
  bareFileShaped(token: string): boolean;
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
      executable: true,
      resolvedFrom: null
    }) as { door: null; refusal: string }
  );
  readings['order-name-before-mode'] = word(
    doors.decidePathDoor({
      spelling: '/a/id_rsa',
      realPath: '/a/id_rsa',
      kind: 'file',
      bundle: false,
      executable: true,
      resolvedFrom: null
    }) as { door: null; refusal: string }
  );
  readings['order-bundle-before-regular-file'] = word(
    doors.decidePathDoor({
      spelling: '/a/Thing.app',
      realPath: '/a/Thing.app',
      kind: 'dir',
      bundle: true,
      executable: true,
      resolvedFrom: null
    }) as { door: null; refusal: string }
  );
  readings['order-spelling-before-realpath'] = word(
    doors.decidePathDoor({
      spelling: 'relative/thing.md',
      realPath: '/a/thing.md',
      kind: 'file',
      bundle: false,
      executable: false,
      resolvedFrom: null
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
      executable: false,
      resolvedFrom: null
    }) as { door: null; refusal: string }
  );
  readings['order-mount-on-realpath-net'] = word(
    doors.decidePathDoor({
      spelling: '/Users/somebody/notes.md',
      realPath: '/net/elsewhere/notes.md',
      kind: 'file',
      bundle: false,
      executable: false,
      resolvedFrom: null
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

  // PHASE 250 narrowed the renderer's cheap refusal, and the property is the
  // same one: everything it refuses must really answer `not-absolute` FROM
  // MAIN, asked with the same base. With no base it is exactly
  // `couldBeAbsolute`; with a base it refuses nothing, because a relative
  // spelling can now reach a door.
  let askedRefusedNoBase = 0;
  let askedRefusedWithBase = 0;
  let askedWrong = 0;
  for (const spelling of SPELLINGS) {
    if (!doors.couldBeAsked(spelling, '')) {
      askedRefusedNoBase += 1;
      const answer = await door.answerPathDoor(spelling);
      if (word(answer) !== 'refused:not-absolute') askedWrong += 1;
    }
    if (!doors.couldBeAsked(spelling, '/Users/gdc/gmux')) {
      askedRefusedWithBase += 1;
      const answer = await door.answerPathDoor(spelling, '/Users/gdc/gmux');
      if (word(answer) !== 'refused:not-absolute') askedWrong += 1;
    }
  }
  readings['could-be-asked-refused-with-no-base'] = String(askedRefusedNoBase);
  readings['could-be-asked-refused-with-a-base'] = String(askedRefusedWithBase);
  readings['could-be-asked-disagreed'] = String(askedWrong);

  // --- PHASE 250 LIFT TWO: a relative spelling and the pane's own base -----
  //
  // A base is not a bypass. Every reading below is the SHIPPING sequence over
  // real files and real links in the same scratch directory, and a resolved
  // path is asked every question an absolute one is asked, of its realpath,
  // leaf included.
  const base = join(dir, 'project');
  const outside = join(dir, 'elsewhere');
  mkdirSync(join(base, 'docs'), { recursive: true });
  mkdirSync(join(base, 'bin'), { recursive: true });
  mkdirSync(join(base, 'links'), { recursive: true });
  mkdirSync(outside, { recursive: true });
  const inBase = (rel: string, body = 'x', mode?: number): string => {
    const p = join(base, rel);
    writeFileSync(p, body);
    if (mode !== undefined) chmodSync(p, mode);
    return p;
  };
  const askIn = async (key: string, raw: string, b?: string): Promise<void> => {
    readings[key] = word(await door.answerPathDoor(raw, b));
  };

  inBase('docs/decision.md', '# hi');
  await askIn('rel-resolves', 'docs/decision.md', base);
  await askIn('rel-no-base', 'docs/decision.md');
  await askIn('rel-empty-base', 'docs/decision.md', '');
  // A base of `/` contains everything, which would make containment say
  // nothing at all, so it is not a base.
  await askIn('rel-base-is-the-filesystem-root', 'etc/hosts', '/');
  await askIn('rel-base-is-gone', 'docs/decision.md', join(dir, 'never-made'));
  // On this Mac /tmp is a symlink to /private/tmp, so a base reached through
  // a link has to contain its own files.
  symlinkSync(base, join(dir, 'via-a-link'));
  await askIn('rel-base-through-a-link', 'docs/decision.md', join(dir, 'via-a-link'));
  // `~` means a home directory and never a name inside the project.
  await askIn('rel-tilde-is-never-joined', '~nobody/notes.md', base);
  // An absolute spelling ignores the base entirely, base offered or not.
  writeFileSync(join(outside, 'plain.md'), 'x');
  await askIn('absolute-ignores-the-base', join(outside, 'plain.md'), base);

  // CONTAINMENT, asked of the REALPATH so a climb and an escaping link are
  // one clause rather than two.
  writeFileSync(join(outside, 'secrets.md'), 'x');
  await askIn('rel-climbs-out', '../elsewhere/secrets.md', base);
  symlinkSync(join(outside, 'secrets.md'), join(base, 'links', 'looks-local.md'));
  await askIn('rel-symlink-escapes', 'links/looks-local.md', base);

  // EVERY OTHER REFUSAL, unchanged by the join.
  inBase('bin/go.sh', '#!/bin/sh\n', 0o755);
  await askIn('rel-executable-bit', 'bin/go.sh', base);
  inBase('docs/.env', 'A=1');
  await askIn('rel-secret-name', 'docs/.env', base);
  await askIn('rel-directory', 'docs', base);
  mkdirSync(join(base, 'docs', 'shot.png', 'Contents'), { recursive: true });
  writeFileSync(join(base, 'docs', 'shot.png', 'Contents', 'Info.plist'), '<plist/>');
  await askIn('rel-bundle', 'docs/shot.png', base);
  await askIn('rel-control-character', 'docs/decision.md\n/etc/passwd', base);
  await askIn('rel-mount-through-the-base', 'x.md', '/Volumes/anything');

  // THE MAC DOOR IS CLOSED TO A RESOLVED SPELLING, and the same file spelled
  // absolutely still takes it — which is what makes this a rule about the
  // spelling rather than a rule about the file.
  const paper = inBase('docs/paper.pdf', '%PDF-1.4\n');
  await askIn('rel-mac-door-refused', 'docs/paper.pdf', base);
  await askIn('rel-mac-door-absolute-still-opens', paper);
  symlinkSync(paper, join(base, 'docs', 'spelled.md'));
  await askIn('rel-link-to-a-pdf-refused', 'docs/spelled.md', base);
  // ...and a picture still opens in Tortie, which decodes bytes and runs
  // nothing.
  inBase('docs/real.png');
  await askIn('rel-image-still-opens', 'docs/real.png', base);

  // THE PURE HALVES, so the two clauses can be read without a filesystem.
  readings['inside-base'] = [
    doors.insideBase('/a/b/c.md', '/a/b'),
    doors.insideBase('/a/b', '/a/b'),
    doors.insideBase('/a/b/c.md', '/a/b/'),
    doors.insideBase('/a/bc.md', '/a/b'),
    doors.insideBase('/a/b/c.md', 'a/b'),
    doors.insideBase('/a/b/c.md', '/')
  ]
    .map((b) => (b ? '1' : '0'))
    .join('');
  readings['usable-base'] = [
    doors.usableBase('/Users/gdc/gmux'),
    doors.usableBase('/a'),
    doors.usableBase('/'),
    doors.usableBase(''),
    doors.usableBase('relative'),
    doors.usableBase('~/gmux'),
    doors.usableBase('/a\nb')
  ]
    .map((b) => (b ? '1' : '0'))
    .join('');

  // --- HIS THREE SCREENSHOTS, GRAMMAR AND DOOR TOGETHER -------------------
  //
  // Phase 250's charter asks for these driven end to end through the SHIPPING
  // grammar and the SHIPPING door, because the two lifts compose rather than
  // add: refusal 8 fires FIRST, so with only lift two in, the third span never
  // reaches the relative rule at all. Each reading is what a hover would do
  // with the whole row in front of it.
  mkdirSync(join(base, 'docs', 'reviews'), { recursive: true });
  writeFileSync(join(base, 'docs', 'reviews', 'fixed-egress-decision.md'), '# a');
  writeFileSync(join(base, 'docs', 'reviews', 'running-url-handoff.md'), '# b');
  const readme = inBase('README.md', '# c');

  const shot = async (
    key: string,
    row: string,
    width: number,
    b?: string
  ): Promise<void> => {
    const found = spans.pathSpansInRow(row, {
      width,
      columns: [...row].map((_, i) => i).concat([row.length]),
      above: null,
      aboveEnd: 0
    });
    if (found.length === 0) {
      readings[key] = 'no-span';
      return;
    }
    const first = found[0] as { target: string; line?: number };
    const answer = await door.answerPathDoor(first.target, b);
    readings[key] =
      `${word(answer)}${first.line === undefined ? '' : `:${String(first.line)}`}`;
  };

  // ONE. An absolute, existing README on a line of its own, in a pane far
  // wider than the line. Lift one alone.
  await shot('screenshot-one', readme, 200);
  // TWO. A relative path mid-sentence with a trailing colon, which the
  // tokeniser's CLOSE set already strips. Lift two alone.
  await shot(
    'screenshot-two',
    'wrote docs/reviews/fixed-egress-decision.md: and then stopped',
    200,
    base
  );
  // THREE. A relative path at the END of its row, and carrying a `:93` that
  // `stripDecoration` already handles. It needs BOTH lifts.
  await shot(
    'screenshot-three',
    'see docs/reviews/running-url-handoff.md:93',
    200,
    base
  );
  // ...and the same three with no base, which is what the second and third
  // still do on a pane whose session carries no project.
  await shot('screenshot-two-without-a-base', 'wrote docs/reviews/fixed-egress-decision.md: and then stopped', 200);
  await shot('screenshot-three-without-a-base', 'see docs/reviews/running-url-handoff.md:93', 200);
  // ...and the third in a pane exactly as wide as its row, which is the
  // wrapped case and stays refused whatever else is lifted.
  await shot(
    'screenshot-three-at-the-width',
    'see docs/reviews/running-url-handoff.md:93',
    'see docs/reviews/running-url-handoff.md:93'.length,
    base
  );

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
    aboveEnd?: number | null
  ): void => {
    readings[key] = spans
      .pathSpansInRow(text, {
        width,
        columns: [...text].map((_, i) => i).concat([text.length]),
        above,
        // `??` WOULD COLLAPSE AN EXPLICIT null INTO THE DEFAULT, and null is
        // the reading the fix round added: a predecessor whose own end column
        // could not be read. So the default is chosen by `undefined` alone.
        aboveEnd: aboveEnd === undefined ? (above === null ? 0 : above.length) : aboveEnd
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

  // THE SECOND UNKNOWN, and until the fix round it fell the other way (the
  // fix round). The head clause reads the PREDECESSOR's own drawn end column
  // out of that row's map, and a map that cannot answer used to arrive as 0,
  // which is smaller than every width, which admitted the span. It is `null`
  // now and it refuses, the way `span-with-a-short-map` refuses for this row's
  // own map. The control beside it is the same predecessor with a readable
  // short end, which IS offered, so a rule that refused everything could not
  // read as a pass.
  row('span-heads-a-row-whose-end-cannot-be-read', '/b.md and more text', 'wrote /a', WIDE, null);
  row('span-heads-a-row-whose-end-can-be-read', '/b.md and more text', 'wrote /a', WIDE, 8);

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

  // --- PHASE 253: the suffix table, the brackets and the bare filename -----
  //
  // The grammar half of research 115's three adoptions, over rows. The `end`
  // each reading prints is the TRIMMED one — the underline stops after the
  // line suffix and never covers a grep remainder.
  row('span-grep-remainder', 'see /a/b.ts:12:match here', null, WIDE);
  row('span-grep-remainder-col', 'see /a/b.ts:12:7:match here', null, WIDE);
  row('span-line-range', 'see /a/b.ts:12-14 here', null, WIDE);
  row('span-tsc-paren', 'see /a/b.ts(12,34) now', null, WIDE);
  row('span-tsc-colon', 'see /a/b.ts(12:34) now', null, WIDE);
  row('span-bracket-line', 'see /a/b.ts[12] now', null, WIDE);
  row('span-bracket-segment', 'read /foo/[bar].baz now', null, WIDE);
  row('span-bracket-kept', 'read /foo/[bar] now', null, WIDE);
  row('span-bare-name', 'wrote README.md just now', null, WIDE);
  row('span-bare-name-line', 'wrote README.md:12 now', null, WIDE);
  row('span-bare-word-refused', 'wrote nothing here', null, WIDE);
  row('span-bare-version-refused', 'now at 1.2.3 today', null, WIDE);
  // A domain-shaped token passes the SHAPE test on purpose — research 115 §5
  // measured 92 occurrences and 0 project files, so the join's lstat is the
  // filter; the door reading `rel-bare-domain-missing` below is that filter.
  row('span-bare-domain-admitted', 'see github.com now', null, WIDE);

  // --- PHASE 253: the bare filename behind the SAME doors -------------------
  //
  // The grammar admits the token and NOTHING else changes: `answerPathDoor`
  // joins it to the base exactly as it joins `docs/x.md`, so containment, the
  // secret name, the mode, the bundle and the closed Mac door all apply, and
  // a spelling with no base is still refused before a filesystem call.
  await askIn('rel-bare-resolves', 'README.md', base);
  await askIn('rel-bare-missing', 'absent.md', base);
  await askIn('rel-bare-no-base', 'README.md');
  await askIn('rel-bare-domain-missing', 'github.com', base);
  inBase('auth.json', '{}');
  await askIn('rel-bare-secret', 'auth.json', base);
  inBase('installer.pdf', '%PDF-1.4\n');
  await askIn('rel-bare-mac-refused', 'installer.pdf', base);
  inBase('deploy.command', '#!/bin/sh\n', 0o755);
  await askIn('rel-bare-executable', 'deploy.command', base);

  // --- PHASE 253: grammar and door together, one hover each -----------------
  await shot(
    'screenshot-grep',
    'grep says docs/reviews/fixed-egress-decision.md:7:const x here',
    200,
    base
  );
  await shot(
    'screenshot-tsc',
    'docs/reviews/running-url-handoff.md(9,2): error TS2304 here',
    200,
    base
  );
  await shot('screenshot-bare', 'wrote README.md today', 200, base);

  // --- PHASE 253: VS Code's own test rows, run against OUR grammar ----------
  //
  // Ported from microsoft/vscode at 770a9bced0e6eff10342b2d95d7cfd98c33b85ed,
  // src/vs/workbench/contrib/terminalContrib/links/test/browser/
  // terminalLinkParsing.test.ts, NARROWED to the adopted clauses (research 115
  // §7.1): the delimited `:`/range family and the tsc `()`/`[]` family, at
  // token level with a head the grammar accepts, plus the numeric git-diff
  // prefix skip. The space and verbal clauses are refused (§2.3), so their
  // rows are deliberately absent; the space-bearing bracket forms
  // (`foo (339, 12)`) split into two tokens before this grammar sees them,
  // which is a stated limit. The last two rows are Tortie's own head rule.
  const vsRows: [string, string][] = [
    ['a/b:339', 'a/b@339'],
    ['a/b:339:12', 'a/b@339'],
    ['a/b:339:12-789', 'a/b@339'],
    ['a/b:339-341', 'a/b@339'],
    ['a/b(339)', 'a/b@339'],
    ['a/b(339,12)', 'a/b@339'],
    ['a/b(339:12)', 'a/b@339'],
    ['a/b[339]', 'a/b@339'],
    ['a/b[339,12]', 'a/b@339'],
    // upstream's rule that git's numeric diff prefixes are never line numbers
    ['1/foo', '1/foo@'],
    // ...and the head rule that keeps a timestamp out while a bare filename
    // carries its suffix like any path.
    ['Makefile:339', 'Makefile@339'],
    ['14:23:07', '14:23:07@']
  ];
  readings['vscode-rows'] = vsRows
    .map(([token, want]) => {
      const d = spans.stripDecoration(token);
      return `${d.target}@${d.line === undefined ? '' : String(d.line)}` === want
        ? '1'
        : '0';
    })
    .join('');

  // The bare-filename shape grammar, pure, over the families research 115 §5
  // measured: file-shaped names in, versions, words and dotfiles out.
  readings['bare-file-shaped'] = [
    'README.md',
    'funnel.mts',
    'Makefile',
    'Dockerfile',
    '1.2.3',
    'v0.102.0',
    'foo',
    '.env',
    'x.y',
    'github.com',
    'a-b_c.txt',
    'TS2304'
  ]
    .map((t) => (spans.bareFileShaped(t) ? '1' : '0'))
    .join('');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify(readings)}\n`);
