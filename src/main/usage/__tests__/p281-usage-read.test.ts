/**
 * The Claude meter reads the item Claude Code reads (Phase 281).
 *
 * FOUR THINGS ARE PROVED HERE, and research 126 §7.2 is the charter for each.
 *
 *  (a) TWO ITEMS, ONE NAME. `security` answers a lookup with the FIRST item
 *      that matches what it was asked. On the operator's machine a stray item
 *      under another account sat before Claude Code's own under the same
 *      service name (§2.4), so a lookup by service alone landed on the stray
 *      and the meter said signed out. A first-match model is used twice, once
 *      as a function (the credentials domain's `first-match-security.ts`,
 *      which its own Phase 281 test runs too) and once as a program the
 *      SHIPPING `keychainReader` runs, and the two are checked against each
 *      other. The parent's service-only argv lands on the stray; the shipping
 *      read lands on the vendor row and answers ok, for the default login, a
 *      Tortie login directory, and a `CLAUDE_CONFIG_DIR` in Tortie's own
 *      environment.
 *  (b) BRANCH B. With `CLAUDE_CONFIG_DIR` set and no scoped item for it, a
 *      usable credential under the plain name answers missing and never ok,
 *      because a Claude Code session under that directory never reads the
 *      plain item (§5).
 *  (c) A MISS IS NOT A FAILURE. The shipping `keychainReader` over programs
 *      that exit 44, 36 and 1, one that cannot be spawned, one that is
 *      cancelled and one that never answers: only 44 is null, every other one
 *      throws, and through the usage service a throw keeps the previous number
 *      under the stale state while 44 draws signed out. A LOCKED KEYCHAIN HAS
 *      ANSWERED THREE WAYS on this machine, and each is a row here: 36 per the
 *      vendor's own lock test; a child that never answers, which the Phase 281
 *      keychain verifier measured for a `-w` read of a locked scratch keychain
 *      in an Aqua session (nothing printed, no exit until killed), driven
 *      through the usage service too; and exit 152 at once, measured twice in
 *      Phase 281.1 on a locked scratch keychain in an Aqua session, its own
 *      row. The deadline is one route, not the route, and every route but 44
 *      keeps the numbers.
 *  (d) A PAYLOAD `security` PRINTS AS HEX is decoded rather than parsed as hex
 *      (§2.7). PHASE 281.1 WIDENED THE ROWS to what the real program was
 *      MEASURED to print as hex, being any byte outside 0x20-0x7E: a tab, an
 *      accented letter and an emoji. `JSON.stringify` keeps a non-ASCII
 *      character raw inside a string and a tab indent puts a raw tab between
 *      tokens, and the Phase 281 decoder handed each back as the hex string
 *      itself, so the meter read `missing`. The hex each program prints is
 *      computed HERE from the payload, never by the predicate under test.
 *
 * WHAT THIS FILE STARTS. Tiny `/bin/sh` programs it writes into its own
 * temporary directory, removed in an `afterAll`. Each records the argv it was
 * given to a file beside it, so the argv asserted is the argv the shipping
 * reader really spawned. Every program exits on its own at once except two
 * sleepers, and each sleeper is ended by the shipping reader (a cancel, the
 * deadline) and then killed by pid in a `finally` whatever happened, and the
 * `afterAll` kills every pid this file ever recorded once more. Nothing here
 * runs `/usr/bin/security`, opens a keychain, reads anything under a home,
 * asks the operating system for a user name or reads this machine's
 * environment: every environment is a literal, every account is a synthetic
 * `p281-*` name, and every token is a synthetic word.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import type { UsageSettings } from '@shared/settings';
import {
  firstMatchSecurity,
  type KeychainRow
} from '../../credentials/__tests__/first-match-security';
import { decodeKeychainPayload } from '../../credentials/security-print';
import {
  CLAUDE_KEYCHAIN_SERVICE,
  keychainReader,
  readClaudeCredential,
  type CredentialDeps,
  type CredentialResult
} from '../credentials';
import type { LoginAccountDeps } from '../login-accounts';
import { readLoginPresence } from '../login-accounts';
import { USAGE_POLL_MS, createUsageService } from '../service';
import { forbiddenReceiver } from './p374-receiver';
import type { UsageResponse } from '../transport';

// ---------------------------------------------------------------------------
// The synthetic world
// ---------------------------------------------------------------------------

/** What `USER` holds in every environment below, so the vendor account. */
const VENDOR = 'p281-vendor';
/** The stray item's account. Never the vendor rule's answer. */
const STRAY = 'p281-stray';
/** Another person's account, for branch B. */
const OTHER = 'p281-other';

const LOGIN_DIR = '/p281/logins/claude/0011223344556677';
const CONFIG_DIR = '/p281/cfg';
const HOME = '/p281/home';

/** This file's own spelling of a scoped name, so the expected value is not the code under test. */
function scoped(dir: string): string {
  const digest = createHash('sha256').update(dir.normalize('NFC'), 'utf8').digest('hex');
  return `Claude Code-credentials-${digest.slice(0, 8)}`;
}

const PLAIN = 'Claude Code-credentials';

const credential = (token: string, plan = 'max'): string =>
  JSON.stringify({ claudeAiOauth: { accessToken: token, subscriptionType: plan } });

/** What the stray holds: bytes that are not a `claudeAiOauth` credential. */
const NOT_A_CREDENTIAL = JSON.stringify({ p281: 'an item that holds no claude login' });

const okWith = (token: string, plan = 'max'): CredentialResult => ({
  kind: 'ok',
  token,
  accountId: null,
  plan
});

/** The argv the shipping reader spawns, written out here rather than imported. */
const shippingArgv = (service: string, account: string): string[] => [
  'find-generic-password',
  '-a',
  account,
  '-s',
  service,
  '-w'
];

// ---------------------------------------------------------------------------
// The first-match model, as a function
// ---------------------------------------------------------------------------

/**
 * What `security find-generic-password` answers over an ordered set of items,
 * being the credentials domain's `first-match-security.ts`, the one model both
 * domains' Phase 281 tests run over.
 *
 * A lookup names a service, and may name an account. The FIRST row matching
 * everything the lookup named is the answer, which is the behaviour research
 * 126 §8.4 calls undocumented and §2.4 measured landing on the stray. No match
 * is exit 44, errSecItemNotFound. `-w` prints the payload and one newline.
 * Only lookups are asked here, so the rows are never changed.
 */
function firstMatch(rows: KeychainRow[], argv: readonly string[]): { code: number; stdout: string } {
  return firstMatchSecurity(rows).answer(argv);
}

/** A keychain seam that forwards the shipping argv into the model. */
function modelKeychain(rows: KeychainRow[], calls: string[][]): CredentialDeps['keychain'] {
  return async (service, account) => {
    const argv = shippingArgv(service, account);
    calls.push(argv);
    const answer = firstMatch(rows, argv);
    if (answer.code === 0) return decodeKeychainPayload(answer.stdout);
    if (answer.code === 44) return null;
    throw new Error('p281: the model could not answer');
  };
}

/** The PARENT's shape: the account is dropped and the lookup is by service alone. */
function serviceOnlyKeychain(rows: KeychainRow[], calls: string[][]): CredentialDeps['keychain'] {
  return async (service) => {
    const argv = ['find-generic-password', '-s', service, '-w'];
    calls.push(argv);
    const answer = firstMatch(rows, argv);
    return answer.code === 0 ? decodeKeychainPayload(answer.stdout) : null;
  };
}

function credentialDeps(
  keychain: CredentialDeps['keychain'],
  env: Record<string, string | undefined>,
  files: string[] = []
): CredentialDeps {
  return {
    keychain,
    readText: async (path) => {
      files.push(path);
      return null;
    },
    env,
    home: HOME
  };
}

// ---------------------------------------------------------------------------
// The programs, written into this file's own directory
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join(tmpdir(), 'p281-usage-read-'));
/** Every pid a sleeper reported, ended again in the afterAll whatever happened. */
const sleeperPids = new Set<number>();

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** SIGKILL the pid's group and the pid. An already ended one is ESRCH, caught. */
function endPid(pid: number): void {
  for (const target of [-pid, pid]) {
    try {
      process.kill(target, 'SIGKILL');
    } catch {
      // Already gone, which is the outcome wanted.
    }
  }
}

afterAll(() => {
  for (const pid of sleeperPids) endPid(pid);
  rmSync(scratch, { recursive: true, force: true });
});

interface Program {
  bin: string;
  dir: string;
  /** Every argv this program was run with, in order. */
  argv(): string[][];
}

/**
 * A `/bin/sh` program in a directory of its own. Its first two lines append
 * its argv to `argv` beside it, one run per line and the arguments separated
 * by the unit separator, so an argument holding a space survives.
 */
function writeProgram(name: string, body: string): Program {
  const dir = join(scratch, name);
  mkdirSync(dir, { recursive: true });
  const bin = join(dir, 'security');
  writeFileSync(
    bin,
    [
      '#!/bin/sh',
      'here=$(dirname "$0")',
      `printf '%s\\037' "$@" >> "$here/argv"`,
      `printf '\\n' >> "$here/argv"`,
      body,
      ''
    ].join('\n'),
    'utf8'
  );
  chmodSync(bin, 0o755);
  return {
    bin,
    dir,
    argv: () => {
      const file = join(dir, 'argv');
      if (!existsSync(file)) return [];
      return readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => line !== '')
        .map((line) => line.split('\u001f').slice(0, -1));
    }
  };
}

/** The first-match model again, as a program, reading its rows from a file. */
const FIRST_MATCH_BODY = [
  "service=''",
  "account=''",
  'with_account=0',
  'with_payload=0',
  'while [ $# -gt 0 ]; do',
  '  case "$1" in',
  '    -s) service=$2; shift 2 ;;',
  '    -a) account=$2; with_account=1; shift 2 ;;',
  '    -w) with_payload=1; shift ;;',
  '    *) shift ;;',
  '  esac',
  'done',
  "tab=$(printf '\\t')",
  'while IFS="$tab" read -r row_service row_account row_file; do',
  '  [ "$row_service" = "$service" ] || continue',
  '  if [ "$with_account" = 1 ] && [ "$row_account" != "$account" ]; then continue; fi',
  `  if [ "$with_payload" = 1 ]; then cat "$here/$row_file"; printf '\\n'; fi`,
  '  exit 0',
  'done < "$here/rows"',
  'exit 44'
].join('\n');

function writeFirstMatchProgram(name: string, rows: KeychainRow[]): Program {
  const program = writeProgram(name, FIRST_MATCH_BODY);
  const lines = rows.map((row, i) => {
    writeFileSync(join(program.dir, `payload-${String(i)}`), row.payload, 'utf8');
    return `${row.service}\t${row.account}\tpayload-${String(i)}`;
  });
  writeFileSync(join(program.dir, 'rows'), `${lines.join('\n')}\n`, 'utf8');
  return program;
}

/** A program that reports its pid and then never answers. */
const SLEEPER_BODY = [`printf '%s' "$$" > "$here/pid"`, 'exec sleep 30'].join('\n');

/**
 * The sleeper's pid, once it has written it. Polled on `setImmediate` and the
 * real clock, so it works under fake timers too, and bounded at five seconds.
 */
async function sleeperPid(program: Program): Promise<number> {
  const file = join(program.dir, 'pid');
  const until = Date.now() + 5_000;
  while (Date.now() < until) {
    if (existsSync(file)) {
      const pid = Number(readFileSync(file, 'utf8'));
      if (Number.isInteger(pid) && pid > 0) {
        sleeperPids.add(pid);
        return pid;
      }
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error('p281: the sleeper never reported its pid');
}

/** Real timers: wait for a pid to be gone, bounded. */
async function gone(pid: number): Promise<boolean> {
  const until = Date.now() + 3_000;
  while (Date.now() < until) {
    if (!alive(pid)) return true;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  return !alive(pid);
}

async function flushIo(turns = 20): Promise<void> {
  for (let i = 0; i < turns; i += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

// ---------------------------------------------------------------------------
// (a) Two items, one name
// ---------------------------------------------------------------------------

interface Case {
  name: string;
  slug: string;
  env: Record<string, string | undefined>;
  loginDir: string | null;
  service: string;
}

const CASES: Case[] = [
  {
    name: 'the default login',
    slug: 'default',
    env: { USER: VENDOR },
    loginDir: null,
    service: PLAIN
  },
  {
    name: 'a Tortie login directory',
    slug: 'login',
    env: { USER: VENDOR },
    loginDir: LOGIN_DIR,
    service: scoped(LOGIN_DIR)
  },
  {
    name: 'CLAUDE_CONFIG_DIR set in Tortie own environment',
    slug: 'config-dir',
    env: { USER: VENDOR, CLAUDE_CONFIG_DIR: CONFIG_DIR },
    loginDir: null,
    service: scoped(CONFIG_DIR)
  }
];

/** The stray FIRST, then the vendor's own item, under the one name. */
const rowsFor = (service: string): KeychainRow[] => [
  { service, account: STRAY, payload: NOT_A_CREDENTIAL },
  { service, account: VENDOR, payload: credential('P281-VENDOR-TOKEN') }
];

describe('(a) two items under one name, the stray first', () => {
  for (const c of CASES) {
    it(`${c.name}: service alone lands on the stray, the shipping read on the vendor row`, async () => {
      const rows = rowsFor(c.service);

      // THE PARENT'S ARGV lands on the stray, and the reader over that shape
      // says missing, which is the sign in line the operator saw.
      expect(firstMatch(rows, ['find-generic-password', '-s', c.service, '-w'])).toEqual({
        code: 0,
        stdout: `${NOT_A_CREDENTIAL}\n`
      });
      const parentCalls: string[][] = [];
      expect(
        await readClaudeCredential(
          credentialDeps(serviceOnlyKeychain(rows, parentCalls), c.env),
          c.loginDir
        )
      ).toEqual({ kind: 'missing' });

      // THE SHIPPING READ asks the one name under the vendor account.
      const calls: string[][] = [];
      expect(
        await readClaudeCredential(credentialDeps(modelKeychain(rows, calls), c.env), c.loginDir)
      ).toEqual(okWith('P281-VENDOR-TOKEN'));
      expect(calls).toEqual([shippingArgv(c.service, VENDOR)]);
    });

    it(`${c.name}: the same, through the shipping keychainReader over a first-match program`, async () => {
      const rows = rowsFor(c.service);
      const program = writeFirstMatchProgram(`first-match-${c.slug}`, rows);

      // The program and the function are one model: asked the parent's way,
      // the program lands on the stray too.
      const direct = spawnSync(program.bin, ['find-generic-password', '-s', c.service, '-w'], {
        encoding: 'utf8',
        timeout: 5_000
      });
      expect(direct.status).toBe(0);
      expect(direct.stdout).toBe(`${NOT_A_CREDENTIAL}\n`);

      const reader = keychainReader(program.bin);
      const out = await readClaudeCredential(
        { ...credentialDeps(reader.keychain, c.env), cancel: reader.cancel },
        c.loginDir
      );
      expect(out).toEqual(okWith('P281-VENDOR-TOKEN'));
      // What the shipping reader SPAWNED, read back from the program, and it
      // is exactly what the function model was handed above.
      expect(program.argv()).toEqual([
        ['find-generic-password', '-s', c.service, '-w'],
        shippingArgv(c.service, VENDOR)
      ]);
    });
  }

  it('the vendor account comes from the user name seam when USER is unset', async () => {
    const rows = rowsFor(PLAIN);
    const calls: string[][] = [];
    const deps: CredentialDeps = {
      ...credentialDeps(modelKeychain(rows, calls), {}),
      osUserName: () => VENDOR
    };
    expect(await readClaudeCredential(deps)).toEqual(okWith('P281-VENDOR-TOKEN'));
    expect(calls).toEqual([shippingArgv(PLAIN, VENDOR)]);
  });
});

// ---------------------------------------------------------------------------
// (b) Branch B: no plain name after a scoped one
// ---------------------------------------------------------------------------

describe('(b) CLAUDE_CONFIG_DIR set, no scoped item for it, a usable plain item', () => {
  const ENV = { USER: VENDOR, CLAUDE_CONFIG_DIR: CONFIG_DIR };

  for (const holder of [OTHER, VENDOR]) {
    it(`answers missing and never ok when the plain item is under ${holder}`, async () => {
      const rows: KeychainRow[] = [
        { service: PLAIN, account: holder, payload: credential('P281-PLAIN-TOKEN') }
      ];
      // THE CONTROL. The plain item IS usable and the model does answer it, so
      // the missing below is the reader's refusal and not a dead fixture.
      expect(firstMatch(rows, ['find-generic-password', '-s', PLAIN, '-w']).code).toBe(0);
      expect(firstMatch(rows, shippingArgv(PLAIN, holder)).code).toBe(0);

      const calls: string[][] = [];
      const files: string[] = [];
      const out = await readClaudeCredential(
        credentialDeps(modelKeychain(rows, calls), ENV, files),
        null
      );
      expect(out).toEqual({ kind: 'missing' });
      expect(out.kind).not.toBe('ok');
      expect(calls).toEqual([shippingArgv(scoped(CONFIG_DIR), VENDOR)]);
      expect(files).toEqual([`${CONFIG_DIR}/.credentials.json`]);
    });
  }

  it('presence says no credential too, and never asks the plain name', async () => {
    const rows: KeychainRow[] = [
      { service: PLAIN, account: OTHER, payload: credential('P281-PLAIN-TOKEN') }
    ];
    const asked: string[][] = [];
    const deps: LoginAccountDeps = {
      keychainHas: async (service, account) => {
        const argv = ['find-generic-password', '-a', account, '-s', service];
        asked.push(argv);
        return firstMatch(rows, argv).code === 0;
      },
      exists: async () => false,
      readText: async () => null,
      env: ENV,
      home: HOME,
      now: () => 1_000
    };
    expect(await readLoginPresence(deps, 'claude', null)).toBe(false);
    expect(asked).toEqual([
      ['find-generic-password', '-a', VENDOR, '-s', scoped(CONFIG_DIR)]
    ]);
  });
});

// ---------------------------------------------------------------------------
// (c) A miss is not a failure, through the shipping keychainReader
// ---------------------------------------------------------------------------

const FAILED = 'the keychain item could not be read';
const UNREADABLE = 'the Claude keychain item could not be read';

describe('(c) the miss and failure split, over programs the shipping reader spawns', () => {
  const EXITS: { code: number; answer: 'null' | 'throw'; what: string }[] = [
    { code: 44, answer: 'null', what: 'no such item' },
    { code: 36, answer: 'throw', what: 'a locked keychain where no unlock prompt can be shown' },
    { code: 152, answer: 'throw', what: 'a locked keychain answering at once, as measured in Phase 281.1' },
    { code: 1, answer: 'throw', what: 'any other failure' }
  ];

  for (const row of EXITS) {
    it(`exit ${String(row.code)} (${row.what}) ${row.answer === 'null' ? 'is null, and missing' : 'THROWS, and is never missing'}`, async () => {
      const program = writeProgram(`exit-${String(row.code)}`, `exit ${String(row.code)}`);
      const reader = keychainReader(program.bin);

      const asked = reader.keychain(PLAIN, VENDOR);
      if (row.answer === 'null') {
        await expect(asked).resolves.toBeNull();
      } else {
        await expect(asked).rejects.toThrow(FAILED);
      }

      // And through the credential reader, which derives the service and the
      // account itself.
      const files: string[] = [];
      const read = readClaudeCredential(credentialDeps(reader.keychain, { USER: VENDOR }, files));
      if (row.answer === 'null') {
        await expect(read).resolves.toEqual({ kind: 'missing' });
      } else {
        await expect(read).rejects.toThrow(UNREADABLE);
      }
      expect(files).toEqual([`${HOME}/.claude/.credentials.json`]);

      // `-a` with the vendor account, and `-s` naming the one vendor service,
      // on every run the program saw.
      expect(program.argv()).toEqual([shippingArgv(PLAIN, VENDOR), shippingArgv(PLAIN, VENDOR)]);
    });
  }

  it('a program that cannot be spawned THROWS', async () => {
    const reader = keychainReader(join(scratch, 'no-such-program'));
    await expect(reader.keychain(PLAIN, VENDOR)).rejects.toThrow(FAILED);
    await expect(
      readClaudeCredential(credentialDeps(reader.keychain, { USER: VENDOR }))
    ).rejects.toThrow(UNREADABLE);
  });

  it('an empty account is refused before anything is spawned', async () => {
    const program = writeProgram('refused', 'exit 0');
    const reader = keychainReader(program.bin);
    await expect(reader.keychain(PLAIN, '')).rejects.toThrow();
    expect(program.argv()).toEqual([]);
  });

  it('a cancelled read THROWS, and its child is gone', async () => {
    const program = writeProgram('cancelled', SLEEPER_BODY);
    let pid: number | null = null;
    try {
      const reader = keychainReader(program.bin);
      const asked = reader.keychain(PLAIN, VENDOR);
      pid = await sleeperPid(program);
      expect(alive(pid)).toBe(true);
      expect(reader.cancel()).toBe(1);
      await expect(asked).rejects.toThrow(FAILED);
      expect(await gone(pid)).toBe(true);
      expect(program.argv()).toEqual([shippingArgv(PLAIN, VENDOR)]);
    } finally {
      if (pid !== null) endPid(pid);
    }
  }, 15_000);

  it('a child that never answers, one route a locked keychain has taken in a GUI session, is ended at the SHIPPING deadline, and the read THROWS', async () => {
    // The deadline is not shortened: the reader's five seconds are driven on a
    // fake clock, so the shipping constant is what is measured. Only the two
    // timer functions are faked; the child, its pipes and `Date` are real.
    const program = writeProgram('never-answers', SLEEPER_BODY);
    let pid: number | null = null;
    let outcome: 'pending' | 'null' | 'value' | 'threw' = 'pending';
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const reader = keychainReader(program.bin);
      const asked = reader.keychain(PLAIN, VENDOR).then(
        (value) => {
          outcome = value === null ? 'null' : 'value';
        },
        () => {
          outcome = 'threw';
        }
      );
      pid = await sleeperPid(program);
      vi.advanceTimersByTime(4_999);
      await flushIo();
      expect(outcome).toBe('pending');
      expect(alive(pid)).toBe(true);
      vi.advanceTimersByTime(1);
      await asked;
      expect(outcome).toBe('threw');
      // The escalation after the grace, so the group is SIGKILLed as well.
      vi.advanceTimersByTime(1_000);
    } finally {
      vi.useRealTimers();
    }
    try {
      expect(pid).not.toBeNull();
      if (pid !== null) expect(await gone(pid)).toBe(true);
      expect(program.argv()).toEqual([shippingArgv(PLAIN, VENDOR)]);
    } finally {
      if (pid !== null) endPid(pid);
    }
  }, 15_000);
});

describe('(c) through the usage service, a fake transport and an injected clock', () => {
  const NOW = 1_790_000_000_000;
  const CLAUDE_BODY = JSON.stringify({
    five_hour: { utilization: 12, resets_at: new Date(NOW + 3_600_000).toISOString() },
    seven_day: { utilization: 34, resets_at: new Date(NOW + 86_400_000).toISOString() }
  });
  const ON: UsageSettings = { claude: true, codex: false, antigravity: false, bar: 'five-hour' };

  /** A program whose answer is a file the test rewrites between reads. */
  function switchable(name: string): Program & { answer(mode: string): void } {
    const program = writeProgram(
      name,
      [
        'mode=$(cat "$here/mode")',
        'case "$mode" in',
        `  ok) cat "$here/payload"; printf '\\n'; exit 0 ;;`,
        `  hang) printf '%s' "$$" > "$here/pid"; exec sleep 30 ;;`,
        '  *) exit "$mode" ;;',
        'esac'
      ].join('\n')
    );
    writeFileSync(join(program.dir, 'payload'), credential('P281-VENDOR-TOKEN'), 'utf8');
    return {
      ...program,
      answer: (mode) => writeFileSync(join(program.dir, 'mode'), mode, 'utf8')
    };
  }

  function meter(bin: string): {
    service: ReturnType<typeof createUsageService>;
    tick(ms: number): void;
    sent(): number;
  } {
    let now = NOW;
    let sent = 0;
    const reader = keychainReader(bin);
    const service = createUsageService({
      credentials: {
        ...credentialDeps(reader.keychain, { USER: VENDOR }),
        cancel: reader.cancel
      },
      transport: async (): Promise<UsageResponse> => {
        sent += 1;
        return { status: 200, body: CLAUDE_BODY, retryAfterAt: null };
      },
      settings: () => ON,
      logins: () => ({ name: null, dir: null }),
      receiver: forbiddenReceiver(),
      now: () => now,
      log: () => undefined
    });
    return {
      service,
      tick: (ms) => {
        now += ms;
      },
      sent: () => sent
    };
  }

  const claudeRow = (snap: Awaited<ReturnType<ReturnType<typeof createUsageService>['read']>>) => {
    const row = snap.providers.find((p) => p.provider === 'claude');
    if (row === undefined) throw new Error('p281: no claude row');
    return row;
  };

  for (const failure of ['36', '152', '1', 'unspawnable']) {
    it(`${failure === 'unspawnable' ? 'a program that cannot be spawned' : `exit ${failure}`} keeps the previous number under the stale state`, async () => {
      const program = switchable(`service-${failure}`);
      program.answer('ok');
      const m = meter(program.bin);

      const first = claudeRow(await m.service.read());
      expect(first.state).toBe('ok');
      expect(first.fiveHour?.percent).toBe(12);
      expect(m.sent()).toBe(1);

      if (failure === 'unspawnable') rmSync(program.bin);
      else program.answer(failure);
      m.tick(USAGE_POLL_MS);

      const second = claudeRow(await m.service.read());
      expect(second.state).toBe('stale');
      expect(second.fiveHour?.percent).toBe(12);
      // Nothing was sent: there was no credential to send.
      expect(m.sent()).toBe(1);
      const runs = failure === 'unspawnable' ? 1 : 2;
      expect(program.argv()).toEqual(
        Array.from({ length: runs }, () => shippingArgv(PLAIN, VENDOR))
      );
    });
  }

  it('a read held past the SHIPPING deadline, one route a locked keychain has taken in a GUI session, keeps the previous number under the stale state', async () => {
    const program = switchable('service-held');
    program.answer('ok');
    const m = meter(program.bin);

    const first = claudeRow(await m.service.read());
    expect(first.state).toBe('ok');
    expect(first.fiveHour?.percent).toBe(12);

    program.answer('hang');
    m.tick(USAGE_POLL_MS);
    let pid: number | null = null;
    let second: ReturnType<typeof claudeRow> | null = null;
    // Only the two timer functions are faked, so the reader's own five second
    // deadline is what ends the child; the child, its pipes and Date are real.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const reading = m.service.read();
      pid = await sleeperPid(program);
      vi.advanceTimersByTime(4_999);
      await flushIo();
      expect(alive(pid)).toBe(true);
      vi.advanceTimersByTime(1);
      second = claudeRow(await reading);
      // The escalation after the grace, so the group is SIGKILLed as well.
      vi.advanceTimersByTime(1_000);
    } finally {
      vi.useRealTimers();
    }
    try {
      expect(second?.state).toBe('stale');
      expect(second?.fiveHour?.percent).toBe(12);
      // Nothing was sent: there was no credential to send.
      expect(m.sent()).toBe(1);
      expect(pid).not.toBeNull();
      if (pid !== null) expect(await gone(pid)).toBe(true);
      expect(program.argv()).toEqual([shippingArgv(PLAIN, VENDOR), shippingArgv(PLAIN, VENDOR)]);
    } finally {
      if (pid !== null) endPid(pid);
    }
  }, 15_000);

  it('exit 44 draws signed out and clears the numbers', async () => {
    const program = switchable('service-44');
    program.answer('ok');
    const m = meter(program.bin);

    expect(claudeRow(await m.service.read()).state).toBe('ok');
    program.answer('44');
    m.tick(USAGE_POLL_MS);

    const second = claudeRow(await m.service.read());
    expect(second.state).toBe('signed-out');
    expect(second.fiveHour).toBeNull();
    expect(program.argv()).toEqual([shippingArgv(PLAIN, VENDOR), shippingArgv(PLAIN, VENDOR)]);
  });
});

// ---------------------------------------------------------------------------
// (d) A payload printed as hex
// ---------------------------------------------------------------------------

describe('(d) a payload security prints as hex', () => {
  /**
   * Payloads the real `security` was measured to print as hex (Phase 281.1,
   * scratch keychain, 2026-09-17), each holding the character named and
   * otherwise a credential the meter must read. `JSON.stringify` keeps a tab,
   * an accented letter and an emoji raw, so each is what a real credential
   * with such an MCP server name holds.
   */
  const ROWS: { slug: string; what: string; payload: string }[] = [
    {
      slug: 'newline',
      what: 'a newline',
      payload: JSON.stringify(
        { claudeAiOauth: { accessToken: 'P281-HEX-TOKEN', subscriptionType: 'pro' } },
        null,
        1
      )
    },
    {
      slug: 'tab',
      what: 'a tab (0x09), outside 0x20-0x7E, as tab indentation puts one in',
      payload: JSON.stringify(
        { claudeAiOauth: { accessToken: 'P281-HEX-TOKEN', subscriptionType: 'pro' } },
        null,
        '\t'
      ).replace(/\n/g, '')
    },
    {
      slug: 'accent',
      what: 'an accented letter, whose UTF-8 bytes are all above 0x7F',
      payload: JSON.stringify({
        claudeAiOauth: { accessToken: 'P281-HEX-TOKEN', subscriptionType: 'pro' },
        mcpOAuth: { 'p281-caf\u00e9': 'x' }
      })
    },
    {
      slug: 'emoji',
      what: 'an emoji in an mcpOAuth key',
      payload: JSON.stringify({
        claudeAiOauth: { accessToken: 'P281-HEX-TOKEN', subscriptionType: 'pro' },
        mcpOAuth: { 'p281-\u{1F422}': 'x' }
      })
    }
  ];

  for (const row of ROWS) {
    it(`holding ${row.what} is decoded by the shipping reader and reads ok`, async () => {
      // eslint-disable-next-line no-control-regex
      expect(row.payload).toMatch(/[^\u0020-\u007e]/);
      const program = writeProgram(`hex-${row.slug}`, `cat "$here/hex"\nprintf '\\n'\nexit 0`);
      const hex = Buffer.from(row.payload, 'utf8').toString('hex');
      writeFileSync(join(program.dir, 'hex'), hex, 'utf8');

      // What the program prints is the hex printing, which JSON cannot read.
      const direct = spawnSync(program.bin, shippingArgv(PLAIN, VENDOR), {
        encoding: 'utf8',
        timeout: 5_000
      });
      expect(direct.stdout).toBe(`${hex}\n`);

      const reader = keychainReader(program.bin);
      expect(await reader.keychain(PLAIN, VENDOR)).toBe(row.payload);
      expect(await readClaudeCredential(credentialDeps(reader.keychain, { USER: VENDOR }))).toEqual(
        okWith('P281-HEX-TOKEN', 'pro')
      );
    });
  }

  it('a payload with a trailing space is printed raw and read back with the space', async () => {
    // 0x20 is inside the printable range: measured raw, and a trim would lose it.
    const payload = `${credential('P281-SPACE-TOKEN', 'pro')} `;
    const program = writeProgram('raw-space', `cat "$here/raw"\nprintf '\\n'\nexit 0`);
    writeFileSync(join(program.dir, 'raw'), payload, 'utf8');
    const reader = keychainReader(program.bin);
    expect(await reader.keychain(PLAIN, VENDOR)).toBe(payload);
    expect(await readClaudeCredential(credentialDeps(reader.keychain, { USER: VENDOR }))).toEqual(
      okWith('P281-SPACE-TOKEN', 'pro')
    );
  });
});

describe('the fixture itself', () => {
  it('spells the plain name the shipping constant spells', () => {
    // So a rename of the plain name fails here rather than leaving every row
    // above asking a name the shipping reader no longer uses.
    expect(CLAUDE_KEYCHAIN_SERVICE).toBe(PLAIN);
  });
});
