/**
 * THE PROOF that a session starts in the folder it was asked to (Phase 353, entry Phase 354; build/p353/SPEC.md
 * §2.6 M354a, M354c, M354e, D354-1, D354-3), through REAL tmux. Opt-in, because it starts tmux servers:
 *
 *   GMUX_ARG_IT=1 npx vitest run p354-create.integration
 *
 * It is the spec step's M354 rig in committed form. Every create goes through the SHIPPING `createSession`
 * composition (src/main/tmux/sessions.ts) with only its transport replaced: `execTmux` runs the real tmux binary on
 * a scratch socket, under a scratch `TMUX_TMPDIR`, a scratch `HOME` and `SHELL=/bin/sh`, as `spawnTmux` does through
 * `execFile` with no shell. Each of §2.6's 45 names (44 folders, each in its own parent so no twin exists by
 * accident, and a link whose own name ends in `\;`) is created on the vendored 3.7b and Homebrew's 3.6a, each under
 * `-f /dev/null` and under a copy of resources/gmux-tmux.conf, 180 cells, and graded by the pane's own `pwd -P` and
 * by `#{pane_current_path}`:
 *
 *  - HEAD (the folder held back, `tmuxFolderArgument`): 0 of 180 anywhere but the folder;
 *  - TODAY (the same function's `folderAsRecorded` arm, which hands `-c` exactly as every create did before this
 *    phase, and holds back nothing else these creates carry): the parent's 118 of 180, being 30 names on 3.7b and
 *    29 on 3.6a, the names §2.6 lists, so a rig that could not see tmux read a folder reads red here.
 *
 * And three arms the rule exists for: the `#(` job (a folder named `j#(echo … >> p354-jobs.log)`, a harmless echo
 * into the scratch, with the asking client kept alive 2 s by a chained `run-shell`, which is when the parent's
 * folder ran it), never run at HEAD while today's argument runs it; the launch flag `flag;` followed by
 * `display-message -p P354-INJECTED`, which today's argv runs on the server and HEAD hands the pane as four
 * arguments; and `-e P354_V=val;`, which today fails the create and HEAD hands the pane as `val;`.
 *
 * `GMUX_TMUX_BIN` names one build instead of both. SAFETY: its own sockets (`p354it-…`), never `-L gmux`; every
 * server ended by `kill-server` and its socket file removed in `afterAll`; nothing under a real home is read.
 */

import { execFile, spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const run = promisify(execFile);
const enabled = process.env['GMUX_ARG_IT'] === '1';
const REPO = resolve(__dirname, '../../../..');
const BS = String.fromCharCode(92);

/** The server the next tmux call is aimed at, and the folder its client runs in. */
interface Server {
  readonly bin: string;
  readonly version: string;
  readonly conf: 'null' | 'gmux';
  readonly confPath: string;
  readonly sock: string;
}
let current: Server | null = null;
let clientCwd = '';
/** When set, the shipping argv gets `; run-shell 'sleep 2'` after it, so the asking client lives for 2 s. */
let keepClient = false;
/** Every stdout the shipping create got back, last first read. */
let lastStdout = '';

const root = enabled ? realpathSync(mkdtempSync(join(tmpdir(), 'gmux-p354-it-'))) : '';
const home = join(root, 'home');
/**
 * The scratch `TMUX_TMPDIR`, kept SHORT: a socket path is limited to 104 bytes on macOS, and a scratch `TMPDIR` can
 * be long. Under `/private/var/tmp` where it exists (never `/private/tmp`, which macOS cleans), removed in `afterAll`.
 */
const tt = enabled ? mkdtempSync(join(existsSync('/private/var/tmp') ? '/private/var/tmp' : tmpdir(), 'p354t-')) : '';
const env = (): NodeJS.ProcessEnv => ({
  PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  HOME: home,
  SHELL: '/bin/sh',
  LANG: 'en_US.UTF-8',
  TMUX_TMPDIR: tt,
  HISTFILE: '/dev/null'
});

async function tmux(server: Server, args: readonly string[], cwd = home): Promise<string> {
  const { stdout } = await run(server.bin, ['-L', server.sock, '-f', server.confPath, ...args], { env: env(), cwd, timeout: 20_000 });
  return stdout;
}

vi.mock('../supervisor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../supervisor')>();
  return {
    ...actual,
    // The shipping composition's one transport, aimed at the scratch server.
    execTmux: async (args: string[]) => {
      if (current === null) throw new Error('no scratch server is current');
      const sent = keepClient && args[0] === 'new-session' ? [...args, ';', 'run-shell', 'sleep 2'] : args;
      const stdout = await tmux(current, sent, clientCwd === '' ? home : clientCwd);
      if (args[0] === 'new-session') lastStdout = stdout;
      return stdout;
    }
  };
});

const { createSession } = await import('../sessions');

/** §2.6's corpus, in the order M354a ran it. Each name is a folder in its own parent; `C#/app` is a nested pair. */
const NAMES = [
  'plain', 'C#/app', 'C#Tools', '#Sales', 'notes#Home', 'a#{b}', 'a#{b', 'x##y', 'C##Tools',
  'F#', 'F##', 'x#[y', 'x#[y]z', 'x##[y', 'x###[y', 'a#[b#Sc]d', '#T', '#S', '#H', '#D', '#F',
  '#I', '#P', '#W', '#h', '#,x', '#}x', 'a#xb', 'a#Ab', '100%', '%Y', '~x', 'a;b',
  'semi;', `semi${BS};`, `semi${BS}${BS};`, ';', `${BS};`, `a${BS}b`, `a${BS}`, 'j#(unclosed',
  'j#(echo p353job >> p353-jobs.log)', '#{?pane_dead,dead,live}', 'a#{E:HOME}b'
];
const LINK = `link${BS}; -> real`;

/**
 * The names TODAY's `-c` puts anywhere but their folder, WRITTEN BY HAND from §2.6 ("30: every `#` before
 * `{ ( # , }`, before `D F H I P S T W h`, a final `#` (3.7b only), `C##Tools`, `F##`, an unclosed `#{` or `#(`,
 * `#{?…}`, `#{E:…}`, and every name ending in `;`, `\;` or `\\;`, the link").
 */
const TODAY_WRONG = new Set([
  'C#Tools', '#Sales', 'notes#Home', 'a#{b}', 'a#{b', 'x##y', 'C##Tools', 'F##', '#T', '#S', '#H', '#D', '#F',
  '#I', '#P', '#W', '#h', '#,x', '#}x', 'semi;', `semi${BS};`, `semi${BS}${BS};`, ';', `${BS};`, 'j#(unclosed',
  'j#(echo p353job >> p353-jobs.log)', '#{?pane_dead,dead,live}', 'a#{E:HOME}b', LINK
]);
/** A final `#` is dropped by 3.7b (and 3.7c) and kept by 3.6a (§2.6, Phase 349's M1). */
const dropsFinalHash = (version: string): boolean => /^3\.7/.test(version);

interface Folder {
  readonly name: string;
  readonly full: string;
  readonly real: string;
}

function plantCorpus(): Folder[] {
  const made = NAMES.map((name, i) => {
    const parent = join(root, 'dirs', String(i));
    mkdirSync(join(parent, name), { recursive: true });
    return { name, full: join(parent, name), real: realpathSync(join(parent, name)) };
  });
  const lparent = join(root, 'dirs', 'L');
  mkdirSync(join(lparent, 'real'), { recursive: true });
  symlinkSync(join(lparent, 'real'), join(lparent, `link${BS};`));
  made.push({ name: LINK, full: join(lparent, `link${BS};`), real: realpathSync(join(lparent, 'real')) });
  return made;
}

/** The builds this run measures: `GMUX_TMUX_BIN`, or the vendored 3.7b and Homebrew's 3.6a. */
function builds(): string[] {
  const named = (process.env['GMUX_TMUX_BIN'] ?? '').trim();
  if (named !== '') return [named];
  return [join(REPO, 'build', 'vendor', 'tmux', 'bin', 'tmux'), '/opt/homebrew/bin/tmux'].filter((bin) => existsSync(bin));
}

const servers: Server[] = [];

/**
 * What a run read, said on stderr and, when `P354_IT_REPORT` names a file, appended to it as one JSON line, so a
 * verifier can re-derive the counts from the cells rather than from this file's verdict.
 */
function report(line: string, data: Record<string, unknown>): void {
  process.stderr.write(`[p354] ${line}\n`);
  const to = (process.env['P354_IT_REPORT'] ?? '').trim();
  if (to !== '') appendFileSync(to, `${JSON.stringify({ line, ...data })}\n`);
}

async function serverFor(bin: string, conf: 'null' | 'gmux'): Promise<Server> {
  const version = (spawnSync(bin, ['-V'], { encoding: 'utf8', env: env() }).stdout ?? '').trim().replace(/^tmux\s+/, '');
  const confPath = conf === 'null' ? '/dev/null' : join(root, 'gmux-tmux.conf');
  const sock = `p354it-${version.replace(/[^0-9a-z]/gi, '')}-${conf}-${String(servers.length)}`;
  const server: Server = { bin, version, conf, confPath, sock };
  servers.push(server);
  await tmux(server, ['new-session', '-d', '-s', 'keep', '--', '/bin/sh', '-c', 'exec sleep 900']);
  return server;
}

/** Where one create's pane really started: its own `pwd -P` and tmux's `#{pane_current_path}`, or why neither. */
async function startOne(
  server: Server,
  n: number,
  folder: Folder,
  composition: 'head' | 'today'
): Promise<'folder' | string> {
  const out = join(root, 'out', `${server.sock}-${composition}-${String(n)}.txt`);
  current = server;
  clientCwd = home;
  let id: string;
  try {
    const info = await createSession({
      displayName: `p354-${composition}-${String(n)}`,
      cwd: folder.full,
      env: { GMUX_MANAGED: '1', P354_OUT: out },
      argv: ['/bin/sh', '-c', 'pwd -P > "$P354_OUT"; exec sleep 60'],
      ...(composition === 'today' ? { folderAsRecorded: true as const } : {})
    });
    id = info.sessionId;
  } catch (err) {
    return `create failed: ${String((err as { stderr?: string }).stderr ?? (err as Error).message).split('\n')[0]}`;
  }
  // The shell's `>` creates the file before `pwd -P` writes its line, so a
  // file that merely exists can still be empty: wait for the line itself
  // (measured by the integrator on 2026-11-05, a 3.6a cell read `pwd -P ""`
  // with the pane in its folder while the machine was loaded).
  const written = (): boolean => existsSync(out) && readFileSync(out, 'utf8').includes('\n');
  for (let k = 0; k < 200 && !written(); k += 1) await new Promise((r) => setTimeout(r, 25));
  const pwdP = existsSync(out) ? readFileSync(out, 'utf8').split('\n')[0] : null;
  const pane = (await tmux(server, ['display-message', '-p', '-t', id, '#{pane_current_path}']).catch(() => '')).replace(/\n$/, '');
  await tmux(server, ['kill-session', '-t', id]).catch(() => undefined);
  if (pwdP === folder.real && pane === folder.real) return 'folder';
  return `elsewhere: pwd -P ${JSON.stringify(pwdP)}, pane ${JSON.stringify(pane)}`;
}

afterAll(() => {
  for (const server of servers) {
    spawnSync(server.bin, ['-L', server.sock, 'kill-server'], { env: env(), timeout: 10_000 });
    rmSync(join(tt, `tmux-${String(process.getuid?.() ?? 501)}`, server.sock), { force: true });
  }
  if (root !== '') rmSync(root, { recursive: true, force: true });
  if (tt !== '') rmSync(tt, { recursive: true, force: true });
});

describe.skipIf(!enabled)('every session starts in the folder it was asked to, through real tmux', () => {
  let corpus: Folder[] = [];
  beforeAll(() => {
    mkdirSync(home, { recursive: true });
    mkdirSync(join(root, 'out'), { recursive: true });
    copyFileSync(join(REPO, 'resources', 'gmux-tmux.conf'), join(root, 'gmux-tmux.conf'));
    corpus = plantCorpus();
  });

  it('reads the 45 names on every build and both configurations: HEAD 0 wrong, today exactly the names §2.6 lists', async () => {
    const found = builds();
    expect(found.length, 'no tmux build to measure: set GMUX_TMUX_BIN, or build the vendored 3.7b').toBeGreaterThan(0);
    expect(corpus).toHaveLength(45);

    const lines: string[] = [];
    const readings: Array<{ version: string; conf: string; name: string; head: string; today: string }> = [];
    let headWrong = 0;
    let todayWrong = 0;
    let cells = 0;
    for (const bin of found) {
      for (const conf of ['null', 'gmux'] as const) {
        const server = await serverFor(bin, conf);
        let n = 0;
        for (const folder of corpus) {
          n += 1;
          cells += 1;
          const head = await startOne(server, n, folder, 'head');
          const today = await startOne(server, n, folder, 'today');
          readings.push({ version: server.version, conf, name: folder.name, head, today });
          if (head !== 'folder') {
            headWrong += 1;
            lines.push(`HEAD ${server.version}/${conf} ${JSON.stringify(folder.name)}: ${head}`);
          }
          if (today !== 'folder') todayWrong += 1;
          // Today's reading, cell for cell, against §2.6's list. Only 3.6a and 3.7b were measured there.
          if (server.version === '3.6a' || server.version === '3.7b') {
            const wrongToday = TODAY_WRONG.has(folder.name) || (folder.name === 'F#' && dropsFinalHash(server.version));
            if (wrongToday !== (today !== 'folder')) {
              lines.push(`TODAY ${server.version}/${conf} ${JSON.stringify(folder.name)}: ${today}, and §2.6 reads it ${wrongToday ? 'elsewhere' : 'in its folder'}`);
            }
          }
        }
      }
    }
    report(`${String(cells)} cells on ${found.join(', ')}: HEAD ${String(headWrong)} anywhere but the folder, today ${String(todayWrong)}`, { cells, headWrong, todayWrong, lines, readings });
    expect(lines).toEqual([]);
    expect(headWrong).toBe(0);
    if (found.length === 2) expect(todayWrong).toBe(118);
  }, 900_000);

  it("runs no #( job at HEAD while the asking client lives, where today's folder runs it", async () => {
    const results: string[] = [];
    for (const bin of builds()) {
      const server = await serverFor(bin, 'null');
      const dir = join(root, 'dirs', 'J', 'j#(echo p354job >> p354-jobs.log)');
      mkdirSync(dir, { recursive: true });
      for (const composition of ['head', 'today'] as const) {
        const cwd = join(root, 'jobs', `${server.sock}-${composition}`);
        mkdirSync(cwd, { recursive: true });
        current = server;
        clientCwd = cwd;
        keepClient = true;
        try {
          const info = await createSession({
            displayName: `p354-job-${composition}`,
            cwd: dir,
            argv: ['/bin/sh', '-c', 'exec sleep 30'],
            ...(composition === 'today' ? { folderAsRecorded: true as const } : {})
          });
          await new Promise((r) => setTimeout(r, 1_500));
          await tmux(server, ['kill-session', '-t', info.sessionId]).catch(() => undefined);
        } finally {
          keepClient = false;
          clientCwd = '';
        }
        // A job writes beside the client that asked for it; look under the whole scratch run folder for any.
        const ran = existsSync(join(cwd, 'p354-jobs.log'));
        results.push(`${server.version} ${composition}: ${ran ? 'job ran' : 'no job'}`);
      }
    }
    report(results.join(' | '), { results });
    for (const line of results) {
      if (line.endsWith('head: job ran')) throw new Error(`HEAD ran the folder's job: ${line}`);
    }
    // Today's argument runs it, or this arm could not see a job and proves nothing.
    expect(results.filter((line) => line.includes('today: job ran'))).toHaveLength(builds().length);
    expect(results.filter((line) => line.includes('head: no job'))).toHaveLength(builds().length);
    expect(readdirSync(join(root, 'dirs', 'J'))).toEqual(['j#(echo p354job >> p354-jobs.log)']);
  }, 120_000);

  it('hands a launch flag ending in ; and -e NAME=val; to the pane as typed, running nothing on the server', async () => {
    const problems: string[] = [];
    for (const bin of builds()) {
      const server = await serverFor(bin, 'null');
      const injected = 'P354-INJECTED';
      const printArgs = 'printf "V=%s\\n" "$P354_V" > "$P354_OUT"; printf "%s\\n" "$@" >> "$P354_OUT"; exec sleep 30';
      const argv = ['/bin/sh', '-c', printArgs, 'sh', 'flag;', 'display-message', '-p', injected];

      // HEAD: the shipping composition.
      const out = join(root, 'out', `${server.sock}-argv-head.txt`);
      current = server;
      const info = await createSession({ displayName: 'p354-argv-head', cwd: home, env: { P354_V: 'val;', P354_OUT: out }, argv });
      for (let k = 0; k < 80 && !existsSync(out); k += 1) await new Promise((r) => setTimeout(r, 25));
      const pane = existsSync(out) ? readFileSync(out, 'utf8').trim().split('\n') : null;
      if (lastStdout.includes(injected)) problems.push(`${server.version} HEAD: the server ran display-message (${JSON.stringify(lastStdout)})`);
      if (JSON.stringify(pane) !== JSON.stringify(['V=val;', 'flag;', 'display-message', '-p', injected])) {
        problems.push(`${server.version} HEAD: the pane read ${JSON.stringify(pane)}`);
      }
      await tmux(server, ['kill-session', '-t', info.sessionId]).catch(() => undefined);

      // TODAY: the parent's composition of the same create, by hand, so this arm is seen to read the danger.
      const todayOut = join(root, 'out', `${server.sock}-argv-today.txt`);
      const todayArgs = (pairs: string[]): string[] => [
        'new-session', '-d', '-P', '-F', '#{session_id}', '-s', `p354-argv-today-${String(pairs.length)}`, '-c', home,
        ...pairs.flatMap((p) => ['-e', p]), '--', ...argv
      ];
      const flagged = await tmux(server, todayArgs([`P354_OUT=${todayOut}`]));
      if (!flagged.includes(injected)) problems.push(`${server.version} TODAY: the server did not run display-message, so this arm reads nothing (${JSON.stringify(flagged)})`);
      const refused = await tmux(server, todayArgs(['P354_V=val;', `P354_OUT=${todayOut}`])).then(
        () => 'created',
        (err: { stderr?: string }) => String(err.stderr ?? '')
      );
      if (refused === 'created') problems.push(`${server.version} TODAY: -e P354_V=val; did not fail the create, so this arm reads nothing`);
    }
    expect(problems).toEqual([]);
  }, 120_000);
});
