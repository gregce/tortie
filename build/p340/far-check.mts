/**
 * far-check.mts. Phase 340's far check DRIVEN in the pinned tsx, for
 * `conformance:machines` (conditions 127 and 137) and `probe:p340:script`
 * (build/p340/SPEC.md §9.1 and §9.3).
 *
 * WHY THIS FILE RUNS THE SHELLS RATHER THAN PRINTING THE TEXT. The reader is
 * the subject as much as the script is: a harness that parsed the answer with
 * its own copy of the reader would prove the copy (the Phase 336 lesson about
 * far texts, applied to the reader). So the SHIPPING `CHECK_SCRIPT` is handed
 * to real shells by build/p340/script-arms.mjs's `runArms`, imported here, and
 * every answer is read by the SHIPPING `parseCheckAnswer` and
 * `classifyCheckOutput`, then normalised to one small view the plain-node
 * graders compare. A later edit to either is what the arms run next time.
 *
 * THE VIEW. `{ malformed, klass, candidates, typedMissing, version,
 * versionKind }`: `klass` is what `classifyCheckOutput` answers; the rest is
 * the facts `parseCheckAnswer` read, the version through the shipping
 * `parseTmuxVersion` and `MACHINE_VERSION_PATTERN`, and its kind through the
 * shipping `decideRemoteVersionGate` (D8: measured, unmeasured, not-read for
 * `vskip=install`, unreadable), unless connection-test.ts exports its own
 * composer of the view (`checkViewOf`), which is then used instead.
 *
 * MODES. `--gate` runs condition 127's matrix (`/bin/sh`, `/bin/dash` and
 * `/bin/ksh` inside `/bin/zsh`) and reads the recorded buffers condition 137
 * needs; `--full` runs §9.3's whole matrix; `--texts` runs no shell at all.
 * Every mode prints ONE JSON line. A module that will not load is carried as a
 * `loadErrors` entry with the reason, never as an empty answer, so a tree
 * where one builder's half has not landed fails with a sentence naming it.
 *
 * WHAT IT STARTS: the shells script-arms.mjs names, with `spawnSync` and a
 * 20 s deadline, over trees under one mkdtemp in /private/tmp removed in a
 * `finally`, each with an environment built from nothing (scratch HOME and
 * ZDOTDIR, HISTFILE=/dev/null, no TERM_SESSION_ID); and, in `--gate` mode
 * only, the SHIPPING `startMachineTest` over a FAKE ssh (driveRunner below), a
 * `/bin/sh` script in its own mkdtemp that writes its argv and prints a canned
 * block, which node-pty starts and which exits by itself, each test awaited to
 * its end or cancelled at 15 s. No real ssh, no tmux, no Electron.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { fullMatrix, gateMatrix, runArms } from './script-arms.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const mode = process.argv.includes('--full') ? 'full' : process.argv.includes('--texts') ? 'texts' : 'gate';

const loadErrors: Record<string, string> = {};
async function load(key: string, rel: string): Promise<Record<string, unknown> | null> {
  const path = join(repoRoot, rel);
  if (!existsSync(path)) {
    loadErrors[key] = `${rel} is not there`;
    return null;
  }
  try {
    return (await import(pathToFileURL(path).href)) as Record<string, unknown>;
  } catch (err) {
    loadErrors[key] = `${rel} did not load: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`;
    return null;
  }
}
type Fn = (...args: unknown[]) => unknown;
const fnOf = (mod: Record<string, unknown> | null, name: string, key: string): Fn | null => {
  if (mod === null) return null;
  if (typeof mod[name] !== 'function') {
    loadErrors[`${key}.${name}`] = `${key} exports no function ${name}`;
    return null;
  }
  return mod[name] as Fn;
};

const checkMod = await load('check-script', 'src/main/machines/check-script.ts');
const testMod = await load('connection-test', 'src/main/machines/connection-test.ts');
const quoteMod = await load('command', 'src/main/restore/command.ts');
const versionMod = await load('version', 'src/main/tmux/version.ts');
const sharedMod = await load('shared-machines', 'src/shared/machines.ts');

const parseCheckAnswer = fnOf(checkMod, 'parseCheckAnswer', 'check-script');
const composeCheckCommand = fnOf(checkMod, 'composeCheckCommand', 'check-script');
const classifyCheckOutput = fnOf(testMod, 'classifyCheckOutput', 'connection-test');
const shellQuoteArgv = fnOf(quoteMod, 'shellQuoteArgv', 'command');
const parseTmuxVersion = fnOf(versionMod, 'parseTmuxVersion', 'version');
const decideRemoteVersionGate = fnOf(versionMod, 'decideRemoteVersionGate', 'version');
const checkViewOf = testMod !== null && typeof testMod['checkViewOf'] === 'function' ? (testMod['checkViewOf'] as Fn) : null;
const CHECK_SCRIPT = typeof checkMod?.['CHECK_SCRIPT'] === 'string' ? (checkMod['CHECK_SCRIPT'] as string) : null;
const LOGIN_PATH_PROBE = typeof checkMod?.['LOGIN_PATH_PROBE'] === 'string' ? (checkMod['LOGIN_PATH_PROBE'] as string) : null;
const FOLDERS = Array.isArray(checkMod?.['REMOTE_TMUX_INSTALL_FOLDERS']) ? (checkMod['REMOTE_TMUX_INSTALL_FOLDERS'] as string[]) : null;
const PATTERN = typeof sharedMod?.['MACHINE_VERSION_PATTERN'] === 'string' ? new RegExp(sharedMod['MACHINE_VERSION_PATTERN'] as string) : null;
if (checkMod !== null && CHECK_SCRIPT === null) loadErrors['check-script.CHECK_SCRIPT'] = 'check-script.ts exports no CHECK_SCRIPT string';
if (checkMod !== null && LOGIN_PATH_PROBE === null) loadErrors['check-script.LOGIN_PATH_PROBE'] = 'check-script.ts exports no LOGIN_PATH_PROBE string';
if (checkMod !== null && FOLDERS === null) loadErrors['check-script.REMOTE_TMUX_INSTALL_FOLDERS'] = 'check-script.ts exports no REMOTE_TMUX_INSTALL_FOLDERS list';

/**
 * The class `classifyCheckOutput` answers, whatever shape it answers in. The
 * typed path the check carried is handed on (Phase 340's fix round: with one,
 * the reader takes the one block that names it past blocks something else
 * printed), as the runner hands it.
 */
function classOf(stdout: string, exit: number, typed: string | null): string | null {
  if (classifyCheckOutput === null) return null;
  try {
    const got = classifyCheckOutput(stdout, exit, typed) as unknown;
    if (typeof got === 'string') return got;
    if (got !== null && typeof got === 'object') {
      const o = got as Record<string, unknown>;
      for (const key of ['class', 'klass', 'cls', 'kind']) if (typeof o[key] === 'string') return o[key] as string;
    }
    return `unreadable answer ${JSON.stringify(got)?.slice(0, 80)}`;
  } catch (err) {
    return `threw: ${err instanceof Error ? err.message : String(err)}`;
  }
}

interface View {
  malformed: boolean;
  none: boolean;
  klass: string | null;
  candidates: string[] | null;
  typedMissing: boolean | null;
  version: string | null;
  versionKind: string | null;
}

/** The shipping reader's answer for one buffer, normalised. */
function viewOf(stdout: string, exit: number, typed: string | null = null): View {
  const klass = classOf(stdout, exit, typed);
  let parsed: unknown = null;
  try {
    parsed = parseCheckAnswer === null ? null : parseCheckAnswer(stdout, typed);
  } catch (err) {
    parsed = `threw: ${err instanceof Error ? err.message : String(err)}`;
  }
  if (parsed === 'malformed') {
    return { malformed: true, none: false, klass, candidates: null, typedMissing: null, version: null, versionKind: null };
  }
  if (parsed === null || typeof parsed !== 'object') {
    return { malformed: false, none: parsed === null, klass, candidates: null, typedMissing: null, version: null, versionKind: typeof parsed === 'string' ? parsed : null };
  }
  const facts = parsed as { candidates?: { source: string; path: string }[]; typedMissing?: boolean; version?: string | null; vskip?: string | null };
  const candidates = (facts.candidates ?? []).map((c) => `${c.source} ${c.path}`);
  if (checkViewOf !== null) {
    try {
      const v = checkViewOf(parsed) as { version?: string | null; versionKind?: string | null };
      return { malformed: false, none: false, klass, candidates, typedMissing: facts.typedMissing ?? null, version: v.version ?? null, versionKind: v.versionKind ?? null };
    } catch {
      /* fall through to the derivation below */
    }
  }
  let version: string | null = null;
  let versionKind: string | null = null;
  if (candidates.length === 1) {
    if (facts.vskip === 'install') versionKind = 'not-read';
    else {
      const raw = facts.version ?? null;
      version = raw === null || parseTmuxVersion === null ? null : ((parseTmuxVersion(raw) as string | null) ?? null);
      if (version === null || (PATTERN !== null && !PATTERN.test(version))) versionKind = 'unreadable';
      else {
        const gate = decideRemoteVersionGate === null ? null : (decideRemoteVersionGate(version) as { kind?: string } | null);
        versionKind = gate?.kind === 'measured' ? 'measured' : 'unmeasured';
      }
    }
  }
  return { malformed: false, none: false, klass, candidates, typedMissing: facts.typedMissing ?? null, version, versionKind };
}

/** The product's own quoting, with a fixture's interpreter and folders in place of the compiled ones. */
const compose = (innerArgv: string[], typed: string | null, folders: string[]): string => {
  if (shellQuoteArgv === null || CHECK_SCRIPT === null || LOGIN_PATH_PROBE === null) throw new Error('the shipping check did not load');
  return shellQuoteArgv([...innerArgv, '-c', CHECK_SCRIPT, 'tortie-check', typed ?? '', LOGIN_PATH_PROBE, folders.join(':')]) as string;
};

const texts =
  CHECK_SCRIPT === null || LOGIN_PATH_PROBE === null || FOLDERS === null
    ? null
    : {
        bytes: Buffer.byteLength(CHECK_SCRIPT),
        script: CHECK_SCRIPT,
        loginProbe: LOGIN_PATH_PROBE,
        folders: FOLDERS,
        composedNull: composeCheckCommand === null ? null : composeCheckCommand(null),
        composedTyped: composeCheckCommand === null ? null : composeCheckCommand('/opt/odd place/tmux'),
        recomposedNull: shellQuoteArgv === null ? null : shellQuoteArgv(['/bin/sh', '-c', CHECK_SCRIPT, 'tortie-check', '', LOGIN_PATH_PROBE, FOLDERS.join(':')]),
        recomposedTyped: shellQuoteArgv === null ? null : shellQuoteArgv(['/bin/sh', '-c', CHECK_SCRIPT, 'tortie-check', '/opt/odd place/tmux', LOGIN_PATH_PROBE, FOLDERS.join(':')])
      };

/**
 * The recorded buffers condition 137 reads, each with the class it must have.
 * Hand-built from the script's own line shapes, plus the adversary's real ssh
 * bytes, read from the one copy of them in the tree
 * (src/main/machines/__tests__/fixtures/p340-ssh-capture.json, which the
 * main-side tests read too), with its `$R` placeholder made an absolute root,
 * because the strict reader refuses a relative candidate.
 */
function recordedBuffers(): { id: string; text: string; exit: number; typed?: string; want: { parsed: 'facts' | 'malformed' | 'none'; klassNot?: string; klass?: string; candidates?: string[] } }[] {
  const block = (lines: string[]) => ['__TORTIE_CHECK__', ...lines, '__TORTIE_CHECK__', ''].join('\r\n');
  const head = ['user=p340', 'os=Darwin', 'login=read'];
  const one = (path: string) => [...head, `cand=install ${path}`, 'count=1', 'vskip=install', `__TORTIE_PATH__${path}__TORTIE_PATH__`];
  const honest = block(one('/opt/homebrew/bin/tmux'));
  // A WHOLE, well-formed block naming /evil/tmux (the adversary's T1 bytes), so
  // only the count of markers refuses it: a reader of the last block, or of
  // the first, would take it.
  const evil = block(['user=evil', 'os=Darwin', 'login=read', 'cand=login /evil/tmux', 'count=1', 'version=tmux 3.6a', '__TORTIE_PATH__/evil/tmux__TORTIE_PATH__']);
  const out: ReturnType<typeof recordedBuffers> = [
    { id: 'honest-one-install', text: honest, exit: 0, want: { parsed: 'facts', klass: 'ok', candidates: ['install /opt/homebrew/bin/tmux'] } },
    // T1: the outer shell's EXIT trap printed a whole block AFTER the script.
    // The control: the hostile block ALONE is one the reader takes, so the two
    // refusals below are the marker count's and nothing else's.
    { id: 'evil-alone-is-well-formed', text: evil, exit: 0, want: { parsed: 'facts', klass: 'ok', candidates: ['login /evil/tmux'] } },
    { id: 'T1-block-after', text: `${honest}${evil}`, exit: 0, want: { parsed: 'malformed', klass: 'unknown' } },
    // M6': a login file printed a whole block BEFORE the script.
    { id: 'M6p-block-before', text: `${evil}${honest}`, exit: 0, want: { parsed: 'malformed', klass: 'unknown' } },
    { id: 'three-markers', text: `${honest}__TORTIE_CHECK__\r\n`, exit: 0, want: { parsed: 'malformed', klass: 'unknown' } },
    {
      id: 'count-disagrees',
      text: block([...head, 'cand=login /a/tmux', 'cand=install /b/tmux', 'count=1']),
      exit: 0,
      want: { parsed: 'malformed', klass: 'unknown' }
    },
    {
      id: 'count-says-two-for-one',
      text: block([...head, 'cand=install /b/tmux', 'count=2', 'vskip=install', '__TORTIE_PATH__/b/tmux__TORTIE_PATH__']),
      exit: 0,
      want: { parsed: 'malformed', klass: 'unknown' }
    },
    { id: 'relative-candidate', text: block([...head, 'cand=login tmux', 'count=1', 'version=tmux 3.6a', '__TORTIE_PATH__tmux__TORTIE_PATH__']), exit: 0, want: { parsed: 'malformed', klass: 'unknown' } },
    { id: 'quote-in-candidate', text: block(one("/opt/it's/tmux")), exit: 0, want: { parsed: 'malformed', klass: 'unknown' } },
    {
      id: 'pair-differs',
      text: block([...head, 'cand=install /opt/homebrew/bin/tmux', 'count=1', 'vskip=install', '__TORTIE_PATH__/evil/tmux__TORTIE_PATH__']),
      exit: 0,
      want: { parsed: 'malformed', klass: 'unknown' }
    },
    // The far side did not run Tortie's check: today's legacy pair alone may never answer ok.
    { id: 'legacy-pair-only', text: '__TORTIE_PATH__/usr/bin/tmux__TORTIE_PATH__\r\n', exit: 0, want: { parsed: 'none', klassNot: 'ok' } }
  ];
  // THE FIX ROUND: a check whose path was typed reads the ONE block naming
  // exactly that path, past whole blocks something else printed (the
  // verifiers' S10, which the parent added by typing the path). Each refusal
  // beside it is the clause that keeps that reading narrow.
  const T = '/opt/p340/odd/tmux';
  const typedBlock = (path: string, version: string) =>
    block([...head, `cand=typed ${path}`, 'count=1', `version=${version}`, `__TORTIE_PATH__${path}__TORTIE_PATH__`]);
  out.push(
    { id: 'typed-past-block-before', text: `${evil}${typedBlock(T, 'tmux 3.6a')}`, exit: 0, typed: T, want: { parsed: 'facts', klass: 'ok', candidates: [`typed ${T}`] } },
    { id: 'typed-past-block-after', text: `${typedBlock(T, 'tmux 3.6a')}${evil}`, exit: 0, typed: T, want: { parsed: 'facts', klass: 'ok', candidates: [`typed ${T}`] } },
    { id: 'typed-two-naming', text: `${typedBlock(T, 'tmux 3.9z')}${typedBlock(T, 'tmux 3.6a')}`, exit: 0, typed: T, want: { parsed: 'malformed', klass: 'unknown' } },
    { id: 'typed-other-path', text: `${evil}${typedBlock('/opt/p340/other/tmux', 'tmux 3.6a')}`, exit: 0, typed: T, want: { parsed: 'malformed', klass: 'unknown' } },
    { id: 'typed-odd-markers', text: `${typedBlock(T, 'tmux 3.6a')}__TORTIE_CHECK__\r\n`, exit: 0, typed: T, want: { parsed: 'malformed', klass: 'unknown' } },
    // The control: with no typed path nothing is read past a refused buffer.
    { id: 'untyped-past-block', text: `${evil}${typedBlock(T, 'tmux 3.6a')}`, exit: 0, want: { parsed: 'malformed', klass: 'unknown' } }
  );
  const CAPTURE = 'src/main/machines/__tests__/fixtures/p340-ssh-capture.json';
  const ROOT_FOR_R = '/private/tmp/p340-capture';
  try {
    const cap = JSON.parse(readFileSync(join(repoRoot, CAPTURE), 'utf8')) as Record<string, { status: number; chunks: { text: string }[] }>;
    const text = (k: string) => (cap[k]?.chunks ?? []).map((c) => c.text).join('').replaceAll('$R', ROOT_FOR_R);
    if (text('firstSeenAnsweredYes') === '' || text('known') === '') throw new Error('it holds no firstSeenAnsweredYes or no known capture');
    out.push({ id: 'capture-first-seen-yes', text: text('firstSeenAnsweredYes'), exit: 0, want: { parsed: 'facts', klass: 'ok', candidates: [`install ${ROOT_FOR_R}/inst/tmux`] } });
    out.push({ id: 'capture-known', text: text('known'), exit: 0, want: { parsed: 'facts', klass: 'ok', candidates: [`install ${ROOT_FOR_R}/inst/tmux`] } });
  } catch (err) {
    loadErrors['capture'] = `${CAPTURE} did not read: ${err instanceof Error ? err.message : String(err)}`;
  }
  return out;
}

/**
 * THE RUNNER, DRIVEN (conditions 130 and 138). The SHIPPING `startMachineTest`
 * is handed a FAKE ssh: a `/bin/sh` script under one mkdtemp that writes the
 * argv it was given one element per line and prints a canned check block, as
 * a machine would. So the sheet `finish` composes, and the argv the spawn was
 * handed, are what the product makes, with no machine anywhere.
 *
 * THE FAKE IS PROVED BEFORE ANYTHING STARTS. `resolveSsh` falls back to
 * `/usr/bin/ssh` when `GMUX_SSH_BIN` does not name an executable file, and a
 * real ssh would read the person's `~/.ssh/config` through the account record.
 * So the shipping `resolveSsh` is asked first with the exact input the runner
 * gets, and anything but the fake refuses the whole drive, recorded as a load
 * error, with nothing started. The host is under `.invalid` (RFC 2606), which
 * never resolves, as a second fence. Each test is awaited to its end event, or
 * cancelled through `cancelLiveMachineTest` at a 15 s deadline, and the scratch
 * directory is removed in a `finally`.
 */
async function driveRunner(): Promise<Record<string, unknown>> {
  const { mkdtempSync, writeFileSync: write, chmodSync: chmod, readFileSync: read, rmSync: rm, realpathSync: real } = await import('node:fs');
  const carriage = await load('carriage', 'src/main/machines/carriage.ts');
  const confirm = await load('confirm', 'src/main/machines/confirm.ts');
  const resolveSsh = fnOf(carriage, 'resolveSsh', 'carriage');
  const start = fnOf(testMod, 'startMachineTest', 'connection-test');
  const cancelLive = fnOf(testMod, 'cancelLiveMachineTest', 'connection-test');
  const describe = fnOf(confirm, 'describeMachine', 'confirm');
  const hashOf = fnOf(confirm, 'machineExecutionHash', 'confirm');
  if (resolveSsh === null || start === null || cancelLive === null || describe === null || hashOf === null) return { ran: false };
  const scratch = real(mkdtempSync(join('/private/tmp', `p340-runner-${String(process.pid)}-`)));
  try {
    const fake = join(scratch, 'ssh');
    const argvLog = join(scratch, 'argv');
    const blockFile = join(scratch, 'block');
    write(fake, `#!/bin/sh\n: > '${argvLog}'\nfor a in "$@"; do printf '%s\\n' "$a" >> '${argvLog}'; done\ncat '${blockFile}'\nexit 0\n`, { mode: 0o755 });
    chmod(fake, 0o755);
    const env = { GMUX_SSH_BIN: fake, PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: scratch, HISTFILE: '/dev/null', LC_ALL: 'C' };
    const resolved = resolveSsh({ packaged: false, env }) as { path: string | null };
    if (resolved.path !== fake) {
      loadErrors['runner'] = `the fake ssh did not resolve (resolveSsh answered ${JSON.stringify(resolved.path)}), so nothing was started`;
      return { ran: false };
    }
    const SHEET_ID = 'p340-sheet';
    const base = { host: 'p340-sheet.invalid', user: null, port: null, remoteTmuxPath: null } as Record<string, unknown>;
    const hostKeys = { tortie: join(scratch, 'known-machines'), user: join(scratch, 'known_hosts') };
    const block = (lines: string[]) => ['__TORTIE_CHECK__', 'user=p340', 'os=Darwin', 'login=read', ...lines, '__TORTIE_CHECK__', ''].join('\n');
    const one = (source: string, path: string, version: string | null) => [
      `cand=${source} ${path}`,
      'count=1',
      version === null ? 'vskip=install' : `version=${version}`,
      `__TORTIE_PATH__${path}__TORTIE_PATH__`
    ];
    const KEY = join(scratch, 'Tortie Data', 'keys', 'machine-p340');
    const scenarios: { id: string; typed: string | null; lines: string[]; mode: 'draft' | 'saved'; identityFile: string | null; path: string; accepts: string | null }[] = [
      { id: 'measured', typed: null, lines: one('login', '/opt/p340/login/tmux', 'tmux 3.6a'), mode: 'draft', identityFile: null, path: '/opt/p340/login/tmux', accepts: null },
      { id: 'unmeasured', typed: '/opt/p340/odd/tmux', lines: one('typed', '/opt/p340/odd/tmux', 'tmux 3.9z'), mode: 'draft', identityFile: null, path: '/opt/p340/odd/tmux', accepts: '3.9z' },
      { id: 'not-read', typed: null, lines: one('install', '/opt/homebrew/bin/tmux', null), mode: 'draft', identityFile: null, path: '/opt/homebrew/bin/tmux', accepts: null },
      { id: 'unmeasured-saved', typed: '/opt/p340/odd/tmux', lines: one('typed', '/opt/p340/odd/tmux', 'tmux 3.9z'), mode: 'saved', identityFile: null, path: '/opt/p340/odd/tmux', accepts: null },
      { id: 'with-key', typed: null, lines: one('login', '/opt/p340/login/tmux', 'tmux 3.6a'), mode: 'draft', identityFile: KEY, path: '/opt/p340/login/tmux', accepts: null }
    ];
    const out: Record<string, unknown>[] = [];
    for (const s of scenarios) {
      write(blockFile, block(s.lines));
      write(argvLog, '');
      const fields = { ...base, remoteTmuxPath: s.typed };
      let ended: Record<string, unknown> | null = null;
      const done = new Promise<void>((resolveDone) => {
        const timer = setTimeout(() => {
          cancelLive();
          resolveDone();
        }, 15_000);
        start({
          fields,
          sheetId: SHEET_ID,
          keyPath: null,
          identityFile: s.identityFile,
          mode: s.mode,
          packaged: false,
          env,
          hostKeys,
          emit: (event: { kind: string; outcome?: Record<string, unknown> }) => {
            if (event.kind !== 'end') return;
            ended = event.outcome ?? null;
            clearTimeout(timer);
            resolveDone();
          }
        });
      });
      await done;
      const argv = read(argvLog, 'utf8').split('\n').filter((l) => l !== '');
      const sheet = (ended as Record<string, unknown> | null)?.['sheet'] as Record<string, unknown> | null | undefined;
      const rowFields = { ...fields, remoteTmuxPath: s.path };
      out.push({
        id: s.id,
        cls: (ended as Record<string, unknown> | null)?.['class'] ?? null,
        sheet: sheet === null || sheet === undefined ? null : { hash: sheet['hash'], lines: sheet['lines'], acceptedTmuxVersion: sheet['acceptedTmuxVersion'] ?? null, versionHonesty: sheet['versionHonesty'] ?? null },
        wantHash: s.accepts === null ? (describe(SHEET_ID, rowFields) as { hash: string }).hash : hashOf(SHEET_ID, { ...rowFields, acceptedTmuxVersion: s.accepts }),
        baseHash: (describe(SHEET_ID, rowFields) as { hash: string }).hash,
        wantAccepts: s.accepts,
        identityFile: s.identityFile,
        identityArgs: argv.filter((a) => a.startsWith('IdentityFile=')),
        identitiesOnly: argv.filter((a) => a.includes('IdentitiesOnly')),
        argvCount: argv.length,
        lastArg: argv[argv.length - 1] ?? null
      });
    }
    return { ran: true, scenarios: out, scratchPrefix: scratch };
  } finally {
    rm(scratch, { recursive: true, force: true });
  }
}

const ready = Object.keys(loadErrors).length === 0;
const result: Record<string, unknown> = { id: 'p340-far-check', mode, loadErrors, texts };
if (ready && mode !== 'texts') {
  try {
    result['rows'] = runArms({ compose, view: viewOf, matrix: mode === 'full' ? fullMatrix() : gateMatrix() });
  } catch (err) {
    loadErrors['runArms'] = `the arms threw: ${err instanceof Error ? err.message : String(err)}`;
    result['rows'] = [];
  }
  if (mode === 'gate') {
    result['recorded'] = recordedBuffers().map((one) => ({ id: one.id, want: one.want, view: viewOf(one.text, one.exit, one.typed ?? null) }));
    try {
      result['runner'] = await driveRunner();
    } catch (err) {
      loadErrors['runner'] = `the runner drive threw: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
} else {
  result['rows'] = [];
}
// The exit waits for the write to drain: stdout is a pipe, a pipe's writes are
// asynchronous, and an exit straight after a large write cut the full
// matrix's JSON short (measured: 143 rows, the reader saw no line at all).
// The runner's timers are cleared; the exit makes sure a stray handle never
// keeps the gate waiting.
process.stdout.write(`${JSON.stringify(result)}\n`, () => process.exit(0));
