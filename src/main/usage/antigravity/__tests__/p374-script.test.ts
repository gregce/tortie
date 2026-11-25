/**
 * Phase 374, the Antigravity status line script (build/p374/SPEC.md §7.1 rows
 * L8 and S1 to S5), RUN rather than read: the generated text under `/bin/sh`
 * (bash 3.2) and `/bin/dash`, through the generated command string, as agy
 * runs it.
 *
 * HERMETIC. One temporary folder, a made-up address and made-up numbers, no
 * network, no agent and nothing under a home. Every child is waited on.
 *
 * The expected line is composed here from `JSON.parse` and `node:crypto`, which
 * share no code with the script's awk and openssl.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ANTIGRAVITY_BUCKET_IDS,
  antigravitySettingsJson,
  antigravityShellLine,
  antigravityStatusCommand,
  antigravityStatusScript,
  carriesAntigravityStatusLine,
  isAntigravityStatusRun,
  saltOf
} from '../script';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'tortie-p374-script-')));
/** A folder whose name holds what breaks a careless quote. */
const dir = join(root, "d it's #1; é");
const tmp = join(root, 'tmp');
const home = join(root, 'home');
for (const d of [dir, tmp, home]) mkdirSync(d, { recursive: true });
const SID = '11111111-2222-4333-8444-555555555555';
const SALT = '0123456789abcdef0123456789abcdef';
const SCRIPT = join(dir, 'status.sh');
const SLOT = join(dir, `${SID}.json`);
const TEXT = antigravityStatusScript({ dir, salt: SALT });
const COMMAND = antigravityStatusCommand(SCRIPT);
const SHELLS = ['/bin/sh', '/bin/dash'];
const ENV: NodeJS.ProcessEnv = {
  PATH: '/usr/bin:/bin',
  GMUX_MANAGED: '1',
  GMUX_SESSION_ID: SID,
  TMPDIR: tmp,
  HOME: home
};
const ADDRESS = 'person@example.com';

afterAll(() => rmSync(root, { recursive: true, force: true }));

beforeEach(() => {
  for (const name of readdirSync(dir)) rmSync(join(dir, name), { recursive: true, force: true });
  writeFileSync(SCRIPT, TEXT);
  chmodSync(SCRIPT, 0o700);
  writeFileSync(SLOT, '{}\n', { mode: 0o600 });
});

/** A payload in the recorded shape, with invented values. */
function honest(): Record<string, any> {
  return {
    agent_state: 'working',
    conversation_id: '99999999-8888-4777-8666-555555555555',
    conversation_title: 'he said "quota": {"gemini-5h": {"remaining_fraction": 0.01}} \\ and other@example.com',
    context_window: { context_window_size: 1000000, current_usage: null, remaining_percentage: 100, used_percentage: 0 },
    cwd: '/tmp/x',
    email: ADDRESS,
    exceeds_200k_tokens: null,
    model: { display_name: 'Gemini "3"', id: 'g' },
    plan_tier: 'Google AI Example',
    product: 'antigravity',
    quota: {
      '3p-5h': { remaining_fraction: 1, reset_time: '2031-01-02T23:00:00Z', reset_in_seconds: 17999 },
      '3p-weekly': { remaining_fraction: 1, reset_time: '2031-01-09T23:00:00Z', reset_in_seconds: 604799 },
      'gemini-5h': { remaining_fraction: 0.71234567, reset_time: '2031-01-02T20:00:00Z', reset_in_seconds: 9903 },
      'gemini-weekly': { remaining_fraction: 0.8123456, reset_time: '2031-01-09T10:00:00Z', reset_in_seconds: 596703 }
    },
    sandbox: { enabled: false },
    terminal_width: 120,
    version: '1.5.16',
    workspace: { current_dir: '/tmp/x', project_dir: '/tmp/x' }
  };
}

interface Ran {
  rc: number | null;
  out: string;
  line: string;
}

function run(sh: string, payload: string | Buffer, env: NodeJS.ProcessEnv = ENV, command = COMMAND): Ran {
  const r = spawnSync(sh, ['-c', command], { input: payload, env, timeout: 20_000 });
  return {
    rc: r.status,
    out: `${r.stdout.toString()}${r.stderr.toString()}`,
    line: existsSync(SLOT) && statSync(SLOT).isFile() ? readFileSync(SLOT, 'utf8') : '(none)'
  };
}

/** The hash the kept line must hold: the salt, then the RAW token of the address. */
const hashOf = (rawToken: string): string => createHash('sha256').update(`${SALT}${rawToken}`).digest('hex');

/** The kept line for a payload object, by `JSON.parse` alone. */
function expected(p: Record<string, any>, rawMail = JSON.stringify(p['email'])): string {
  const q: string[] = [];
  for (const id of ANTIGRAVITY_BUCKET_IDS) {
    const b = p['quota'][id];
    if (b === undefined) continue;
    q.push(
      `"${id}":{"f":${String(b.remaining_fraction ?? 'null')},"r":${b.reset_time === undefined ? 'null' : JSON.stringify(b.reset_time)},` +
        `"d":${b.disabled === undefined ? 'null' : String(b.disabled)},"a":${String(b.remaining_amount !== undefined)}}`
    );
  }
  return `{"v":1,"h":"${hashOf(rawMail)}","p":${p['plan_tier'] === undefined ? 'null' : JSON.stringify(p['plan_tier'])},"q":{${q.join(',')}}}\n`;
}

/** Every byte Tortie's script left anywhere it could. */
function everything(): string {
  const out: string[] = [];
  for (const d of [dir, tmp, home]) {
    for (const name of readdirSync(d)) {
      if (join(d, name) === SCRIPT) continue;
      out.push(name, readFileSync(join(d, name), 'utf8'));
    }
  }
  return out.join('\n');
}

describe('L8: the --settings value', () => {
  it('holds exactly statusLine with three keys, over a path with a space, an apostrophe, #, ; and é', () => {
    const value = JSON.parse(antigravitySettingsJson(SCRIPT)) as Record<string, any>;
    expect(Object.keys(value)).toEqual(['statusLine']);
    expect(Object.keys(value['statusLine']).sort()).toEqual(['command', 'stack_with_default', 'type']);
    expect(value['statusLine'].type).toBe('command');
    expect(value['statusLine'].stack_with_default).toBe(true);
    expect(value['statusLine'].command).toBe(COMMAND);
  });

  it('the command is this one string, whole', () => {
    const path = `'${SCRIPT.replace(/'/g, `'\\''`)}'`;
    expect(COMMAND).toBe(`trap 'exit 0' 0; exec >/dev/null 2>&1; [ -r ${path} ] && . ${path}; exit 0`);
  });

  it('the command it names runs the script, as agy would run it', () => {
    for (const sh of SHELLS) {
      writeFileSync(SLOT, '{}\n');
      const command = (JSON.parse(antigravitySettingsJson(SCRIPT)) as Record<string, any>)['statusLine'].command as string;
      const r = run(sh, JSON.stringify(honest()), ENV, command);
      expect([sh, r.rc, r.out]).toEqual([sh, 0, '']);
      expect(r.line).toBe(expected(honest()));
    }
  });
});

describe('L9: a plain create stays one line for the person’s own shell', () => {
  const bin = join(root, 'bin');
  const zdot = join(root, 'zdot');
  mkdirSync(bin, { recursive: true });
  mkdirSync(zdot, { recursive: true });
  const agy = join(bin, 'agy');
  writeFileSync(agy, '#!/bin/sh\nprintf "%s\\036" "$#" "$P374_MARK" "$@"\n');
  chmodSync(agy, 0o755);
  writeFileSync(join(zdot, '.zshenv'), 'export P374_MARK="from the file"\n');
  const asked = (shell: string, line: string): string[] => {
    const r = spawnSync(shell, ['-c', line], { env: { PATH: `${bin}:/usr/bin:/bin`, HOME: home, ZDOTDIR: zdot }, encoding: 'utf8' });
    expect([shell, r.status, r.stderr]).toEqual([shell, 0, '']);
    return r.stdout.split('\x1e').slice(0, -1);
  };
  const paths = [SCRIPT, '/Users/p/Library/Application Support/Tortie/gmux/antigravity-usage/status.sh', '/a!b\\c"d$e`f%g~{h}*?\tz\n#;&|\u{1F42F}/status.sh'];

  it('every shell on this Mac hands agy the two words, byte for byte, whatever the path holds', () => {
    for (const shell of ['/bin/sh', '/bin/bash', '/bin/zsh', '/bin/dash', '/bin/ksh', '/bin/csh', '/bin/tcsh']) {
      if (!existsSync(shell)) continue;
      for (const path of paths) {
        const json = antigravitySettingsJson(path);
        const got = asked(shell, antigravityShellLine('agy', ['--settings', json]));
        expect([shell, path, got[0], got.slice(2)]).toEqual([shell, path, '2', ['--settings', json]]);
        expect((JSON.parse(got[3] ?? '') as any).statusLine.command).toBe(antigravityStatusCommand(path));
      }
    }
  });

  it('the value holds nothing any shell reads inside single quotes, and only ASCII', () => {
    for (const path of paths) {
      const json = antigravitySettingsJson(path);
      expect(json).toMatch(/^[\x20-\x7e]+$/);
      expect(json).not.toMatch(/['!]/);
      // A backslash is only ever the one of a \\u escape, so no shell meets two.
      expect(json.replace(/\\u[0-9a-f]{4}/g, '')).not.toContain('\\');
    }
  });

  it('zsh reads the person’s file for it as it does for the bare name', () => {
    const bare = asked('/bin/zsh', 'agy');
    const line = asked('/bin/zsh', antigravityShellLine('agy', ['--settings', antigravitySettingsJson(SCRIPT)]));
    expect([bare[1], line[1]]).toEqual(['from the file', 'from the file']);
    expect(bare[0]).toBe('0');
  });
});

describe('L10: a run told from a tool, by its command line as ps prints it', () => {
  const real = '/Users/p/Library/Application Support/Tortie/gmux/antigravity-usage/status.sh';
  const command = antigravityStatusCommand(real);
  it('the run, and the agy that carries the flag, in the shapes ps prints them', () => {
    for (const sh of ['sh', '/bin/sh', 'bash', '-sh']) expect([sh, isAntigravityStatusRun(`${sh} -c ${command}`)]).toEqual([sh, true]);
    const json = antigravitySettingsJson(real);
    for (const agy of [`agy --settings ${json}`, `/x/agy --settings ${json} --model m`]) expect(carriesAntigravityStatusLine(agy)).toBe(true);
  });
  it('and nothing else', () => {
    for (const other of ['', 'sleep 25', 'sh -c sleep 25', `cat ${real}`, `sh -c cat ${real}`, command, `sh -c ${command} ; sleep 9`, `sh -c true; ${command}`, `node x ${command}`, `sh -c ${command.replace('exit 0;', 'exit 1;')}`]) {
      if (other.startsWith('sh -c ') && other.slice(6) === command) continue;
      expect([other, isAntigravityStatusRun(other)]).toEqual([other, false]);
    }
    for (const other of ['', 'agy', 'agy --settings /x.json', `agy --settings ${JSON.stringify({ statusLine: { type: 'command', command: 'mine' } })}`, `cat ${real}`]) {
      expect([other, carriesAntigravityStatusLine(other)]).toEqual([other, false]);
    }
  });
});

/** One payload and what it must leave: an exact line, or `unchanged`. */
type Row = [name: string, payload: string | Buffer, want: string | 'unchanged'];

function rows(): Row[] {
  const p = (edit: (d: Record<string, any>) => void): Record<string, any> => {
    const d = honest();
    edit(d);
    return d;
  };
  const j = (edit: (d: Record<string, any>) => void): string => JSON.stringify(p(edit));
  const g5 = (edit: (b: Record<string, any>) => void) => (d: Record<string, any>): void => edit(d['quota']['gemini-5h']);
  const line = (edit: (d: Record<string, any>) => void, rawMail?: string): string => {
    const d = p(edit);
    return expected(d, rawMail);
  };
  const kept = (field: string, value: string): string => {
    const base = expected(honest());
    const re = new RegExp(`("gemini-5h":\\{[^}]*"${field}":)([^,}]+)`);
    return base.replace(re, `$1${value}`);
  };
  const deep = `${JSON.stringify(honest()).slice(0, -1)},"z":${'['.repeat(100)}${']'.repeat(100)}}`;
  const odd = 'a"b\\c\né@example.com';
  return [
    ['honest', JSON.stringify(honest()), expected(honest())],
    ['epoch zero reset', j(g5((b) => (b['reset_time'] = '1970-01-01T00:00:00Z'))), line(g5((b) => (b['reset_time'] = '1970-01-01T00:00:00Z')))],
    ['Go zero reset', j(g5((b) => (b['reset_time'] = '0001-01-01T00:00:00Z'))), line(g5((b) => (b['reset_time'] = '0001-01-01T00:00:00Z')))],
    ['NaN', JSON.stringify(honest()).replace('0.71234567', 'NaN'), kept('f', 'null')],
    ['1e309', JSON.stringify(honest()).replace('0.71234567', '1e309'), kept('f', '1e309')],
    ['-3', JSON.stringify(honest()).replace('0.71234567', '-3'), kept('f', '-3')],
    ['007, which is not a JSON number', JSON.stringify(honest()).replace('0.71234567', '007'), kept('f', 'null')],
    ['.5, which is not a JSON number', JSON.stringify(honest()).replace('0.71234567', '.5'), kept('f', 'null')],
    ['a string fraction', j(g5((b) => (b['remaining_fraction'] = '0.5'))), kept('f', 'null')],
    ['an object fraction', j(g5((b) => (b['remaining_fraction'] = { x: 0.5 }))), kept('f', 'null')],
    ['a 30 digit fraction', JSON.stringify(honest()).replace('0.71234567', `0.${'1'.repeat(30)}`), kept('f', 'null')],
    ['disabled', j(g5((b) => (b['disabled'] = true))), kept('d', 'true')],
    ['disabled false', j(g5((b) => (b['disabled'] = false))), kept('d', 'false')],
    ['disabled null', j(g5((b) => (b['disabled'] = null))), expected(honest())],
    ['disabled 1', j(g5((b) => (b['disabled'] = 1))), kept('d', 'true')],
    ['disabled "false"', j(g5((b) => (b['disabled'] = 'false'))), kept('d', 'true')],
    ['disabled {}', j(g5((b) => (b['disabled'] = {}))), kept('d', 'true')],
    ['an amount', j(g5((b) => (b['remaining_amount'] = '5'))), kept('a', 'true')],
    ['an amount of zero', j(g5((b) => (b['remaining_amount'] = 0))), kept('a', 'true')],
    ['an object amount', j(g5((b) => (b['remaining_amount'] = { units: 3 }))), kept('a', 'true')],
    ['a null amount', j(g5((b) => (b['remaining_amount'] = null))), expected(honest())],
    [
      'an amount alone',
      j((d) => (d['quota']['gemini-5h'] = { remaining_amount: '5' })),
      expected(honest()).replace(/"gemini-5h":\{[^}]*\}/, '"gemini-5h":{"f":null,"r":null,"d":null,"a":true}')
    ],
    ['no address', j((d) => delete d['email']), 'unchanged'],
    ['a null address', j((d) => (d['email'] = null)), 'unchanged'],
    ['an empty address', j((d) => (d['email'] = '')), 'unchanged'],
    ['an object address', j((d) => (d['email'] = { email: ADDRESS })), 'unchanged'],
    ['a string address then an object one', `${JSON.stringify(honest()).slice(0, -1)},"email":{"a":"${ADDRESS}"}}`, 'unchanged'],
    ['an address nested under workspace alone', j((d) => { delete d['email']; d['workspace']['email'] = ADDRESS; }), 'unchanged'],
    ['an odd address', JSON.stringify(p((d) => (d['email'] = odd))), line((d) => (d['email'] = odd))],
    ['an address over 512 characters', j((d) => (d['email'] = `${'x'.repeat(600)}@example.com`)), 'unchanged'],
    ['an address as the plan', j((d) => (d['plan_tier'] = ADDRESS)), expected(honest()).replace('"p":"Google AI Example"', '"p":null')],
    ['a plan of 60 characters', j((d) => (d['plan_tier'] = 'x'.repeat(60))), expected(honest()).replace('"p":"Google AI Example"', '"p":null')],
    ['an object plan', j((d) => (d['plan_tier'] = { tier: 'x' })), expected(honest()).replace('"p":"Google AI Example"', '"p":null')],
    ['an address as a reset', j(g5((b) => (b['reset_time'] = ADDRESS))), kept('r', 'null')],
    ['letters as a reset', j(g5((b) => (b['reset_time'] = 'person'))), kept('r', 'null')],
    ['a third id and one differing by case', j((d) => { d['quota'][ADDRESS] = { remaining_fraction: 0.1 }; d['quota']['Gemini-5h'] = { remaining_fraction: 0.2 }; }), expected(honest())],
    ['a nested workspace.quota and a nested bucket', j((d) => { d['workspace']['quota'] = { 'gemini-5h': { remaining_fraction: 0.01 } }; d['quota']['gemini-5h']['sub'] = { remaining_fraction: 0.02 }; }), expected(honest())],
    [
      'a duplicate quota takes the last, whole',
      `${JSON.stringify(honest()).slice(0, -1)},"quota":{"gemini-5h":{"remaining_fraction":0.5}}}`,
      expected(honest()).replace(/"q":\{.*\}\}\n$/, '"q":{"gemini-5h":{"f":0.5,"r":null,"d":null,"a":false}}}\n')
    ],
    [
      'a duplicate bucket takes the last, whole',
      JSON.stringify(honest()).replace('"sandbox"', '"_":0,"sandbox"').replace(/("gemini-weekly":\{[^}]*\})/, '$1,"gemini-5h":{"remaining_fraction":0.25}'),
      expected(honest()).replace(/"gemini-5h":\{[^}]*\}/, '"gemini-5h":{"f":0.25,"r":null,"d":null,"a":false}')
    ],
    ['a quota that is not an object', j((d) => (d['quota'] = [{ 'gemini-5h': { remaining_fraction: 0.1 } }])), 'unchanged'],
    ['a quota with none of the four', j((d) => (d['quota'] = { 'other-5h': { remaining_fraction: 0.1 } })), 'unchanged'],
    ['an empty quota', j((d) => (d['quota'] = {})), 'unchanged'],
    ['a null quota', j((d) => (d['quota'] = null)), 'unchanged'],
    ['an array at the top', `[${JSON.stringify(honest())}]`, 'unchanged'],
    ['only the last brace missing', JSON.stringify(honest()).slice(0, -1), 'unchanged'],
    ['a bucket under another top level key', j((d) => { d['other'] = { 'gemini-5h': { remaining_fraction: 0.01, reset_time: '2030-01-01T00:00:00Z' } }; }), expected(honest())],
    ['buckets under another top level key alone', j((d) => { d['other'] = d['quota']; delete d['quota']; d['conversation_title'] = '"quota"'; }), 'unchanged'],
    ['a bucket that is an array', j((d) => (d['quota']['gemini-5h'] = [0.5, { remaining_fraction: 0.5 }])), expected(honest()).replace(/"gemini-5h":\{[^}]*\},/, '')],
    [
      'an array whose key could be another object’s',
      JSON.stringify(p((d) => { d['quota'] = [{ remaining_fraction: 0.5 }]; })).replace('"plan_tier"', '"first":{"gemini-5h":0},"plan_tier"'),
      'unchanged'
    ],
    ['an array around the quota', j((d) => (d['quota'] = [d['quota']])), 'unchanged'],
    ['truncated', JSON.stringify(honest()).slice(0, -40), 'unchanged'],
    ['two objects', `${JSON.stringify(honest())}${JSON.stringify(honest())}`, 'unchanged'],
    ['trailing junk', `${JSON.stringify(honest())} x`, 'unchanged'],
    ['pretty printed', JSON.stringify(honest(), null, 2), expected(honest())],
    ['CRLF', JSON.stringify(honest(), null, 1).replace(/\n/g, '\r\n'), expected(honest())],
    ['empty', '', 'unchanged'],
    ['garbage', Buffer.from('\x00\x01{{{"quota"'), 'unchanged'],
    ['64 KB', j((d) => (d['pad'] = 'x'.repeat(65_536))), 'unchanged'],
    ['15 KB of quotes', j((d) => (d['pad'] = '"\\'.repeat(3000))), expected(honest())],
    ['100 deep', deep, 'unchanged'],
    ['a shell in the title', j((d) => (d['conversation_title'] = `$(touch ${join(root, 'pwn')}) \`id\` %s %n ' " ; rm`)), expected(honest())]
  ];
}

describe('S1: the script over hostile payloads', () => {
  for (const sh of SHELLS) {
    it(`${sh}: exit 0, no output, the kept line exactly, and no address byte left anywhere`, () => {
      for (const [name, payload, want] of rows()) {
        writeFileSync(SLOT, '{}\n');
        const r = run(sh, payload);
        expect([name, r.rc, r.out]).toEqual([name, 0, '']);
        expect([name, r.line]).toEqual([name, want === 'unchanged' ? '{}\n' : want]);
        if (want !== 'unchanged') expect([name, typeof JSON.parse(r.line)]).toEqual([name, 'object']);
        const left = everything();
        for (const byte of ['@', 'example.com', 'person', 'other', 'conversation', '/tmp/x', '99999999']) expect([name, byte, left.includes(byte)]).toEqual([name, byte, false]);
      }
      expect(existsSync(join(root, 'pwn'))).toBe(false);
      expect(readdirSync(tmp)).toEqual([]);
      expect(readdirSync(home)).toEqual([]);
      expect(readdirSync(dir).sort()).toEqual([`${SID}.json`, 'status.sh'].sort());
    }, 120_000);

    it(`${sh}: two accounts read as two hashes, one account as one, and the hash is salted`, () => {
      const one = run(sh, JSON.stringify(honest())).line;
      writeFileSync(SLOT, '{}\n');
      const again = run(sh, JSON.stringify(honest())).line;
      const other = honest();
      other['email'] = 'second@example.com';
      const two = run(sh, JSON.stringify(other)).line;
      expect(again).toBe(one);
      expect(JSON.parse(two).h).not.toBe(JSON.parse(one).h);
      expect(JSON.parse(one).h).not.toBe(createHash('sha256').update(JSON.stringify(ADDRESS)).digest('hex'));
    });

    it(`${sh}: it writes only for a managed session, only at the place main made, and never through a folder`, () => {
      const payload = JSON.stringify(honest());
      const outside = join(root, 'outside.json');
      writeFileSync(outside, '{}\n');
      for (const env of [
        { ...ENV, GMUX_SESSION_ID: '../outside' },
        { ...ENV, GMUX_MANAGED: undefined },
        { ...ENV, GMUX_MANAGED: '0' },
        { ...ENV, GMUX_SESSION_ID: undefined },
        { ...ENV, GMUX_SESSION_ID: '../../x' },
        { ...ENV, GMUX_SESSION_ID: `${SID}/..` },
        { ...ENV, GMUX_SESSION_ID: SID.replace('1', 'G') },
        { ...ENV, GMUX_SESSION_ID: '00000000-2222-4333-8444-555555555555' }
      ]) {
        const r = run(sh, payload, env);
        expect([r.rc, r.out, r.line]).toEqual([0, '', '{}\n']);
      }
      expect(readFileSync(outside, 'utf8')).toBe('{}\n');
      rmSync(SLOT);
      expect(run(sh, payload)).toEqual({ rc: 0, out: '', line: '(none)' });
      expect(readdirSync(dir)).toEqual(['status.sh']);
      mkdirSync(SLOT);
      expect(run(sh, payload)).toEqual({ rc: 0, out: '', line: '(none)' });
      expect(readdirSync(SLOT)).toEqual([]);
    });

    it(`${sh}: an environment that fights it changes nothing it says`, () => {
      for (const extra of [
        { OPENSSL_CONF: '/nonexistent' },
        { TMPDIR: '/nonexistent' },
        { LC_ALL: 'xx_YY' },
        { LANG: 'tr_TR.UTF-8' },
        { PATH: '' },
        { IFS: '0' },
        { tt_p: 'x', tt_m: 'y', tt_k: 'z', tt_h: 'w' },
        { SHELLOPTS: 'allexport:errexit:noclobber' }
      ]) {
        writeFileSync(SLOT, '{}\n');
        const r = run(sh, JSON.stringify(honest()), { ...ENV, ...extra });
        expect([extra, r.rc, r.out, r.line]).toEqual([extra, 0, '', expected(honest())]);
      }
    });

    it(`${sh}: the file it leaves is private to this user`, () => {
      run(sh, JSON.stringify(honest()));
      expect(statSync(SLOT).mode & 0o777).toBe(0o600);
    });

    it(`${sh}: a folder it may not write leaves the file as it was, quietly`, () => {
      chmodSync(dir, 0o500);
      try {
        expect(run(sh, JSON.stringify(honest()))).toEqual({ rc: 0, out: '', line: '{}\n' });
      } finally {
        chmodSync(dir, 0o700);
      }
    });
  }
});

/** The committed, invented recordings and payloads (build/p374/make-fixtures.mjs), whose expectations share no code with this file. */
const FIXTURES = join(process.cwd(), 'build', 'fixtures', 'p374');
const jsonOf = (name: string): any => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

describe('S1: the committed recording and the committed hostile payloads', () => {
  for (const sh of SHELLS) {
    it(`${sh}: every run of both recordings holds what that run must hold, and writes exactly when it must`, () => {
      const want = jsonOf('expect.json');
      for (const which of ['launch', 'resume']) {
        writeFileSync(SLOT, '{}\n');
        const runs = readFileSync(join(FIXTURES, `${which}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
        expect(runs).toHaveLength(want[which].runs);
        let writes = 0;
        for (const [i, one] of runs.entries()) {
          const before = statSync(SLOT, { bigint: true }).ino;
          const r = run(sh, JSON.stringify(one.payload));
          const wrote = statSync(SLOT, { bigint: true }).ino !== before;
          if (wrote) writes += 1;
          const held = want[which].perRun[i];
          expect([which, held.run, r.rc, r.out, wrote]).toEqual([which, held.run, 0, '', held.wrote]);
          if (held.held === null) expect([which, held.run, r.line]).toEqual([which, held.run, '{}\n']);
          else expect([which, held.run, r.line.replace(/^\{"v":1,"h":"[0-9a-f]{64}",/, '')]).toEqual([which, held.run, `${held.held}\n`]);
        }
        expect([which, writes]).toEqual([which, want[which].writes]);
      }
    }, 120_000);

    it(`${sh}: every hostile payload leaves its line, or nothing`, () => {
      for (const one of jsonOf('hostile.json').payloads) {
        if (one.close === false) continue;
        writeFileSync(SLOT, '{}\n');
        const r = run(sh, one.raw.replace('@@PAD@@', 'x'.repeat(65_536)));
        expect([one.name, r.rc, r.out]).toEqual([one.name, 0, '']);
        // A payload that says nothing of its line is no expectation.
        expect([one.name, one.tail === null || typeof one.tail === 'string']).toEqual([one.name, true]);
        if (one.tail === null) expect([one.name, r.line]).toEqual([one.name, '{}\n']);
        else expect([one.name, r.line.replace(/^\{"v":1,"h":"[0-9a-f]{64}",/, '')]).toEqual([one.name, `${one.tail}\n`]);
        expect([one.name, everything().includes('@')]).toEqual([one.name, false]);
      }
    }, 120_000);
  }

  it('standard input that never closes is one waiting process, gone at once when it is killed', async () => {
    // The fourth pipe is inherited by whatever the run starts and by nothing it redirects, so `close` waits for all of it.
    const child = spawn('/bin/sh', ['-c', COMMAND], { env: ENV, stdio: ['pipe', 'pipe', 'pipe', 'pipe'] });
    try {
      child.stdin.on('error', () => undefined);
      child.stdin.write(JSON.stringify(honest()).slice(0, 300));
      await new Promise((r) => setTimeout(r, 300));
      expect(child.exitCode).toBeNull();
      const ended = new Promise<void>((resolve) => child.on('close', () => resolve()));
      const from = Date.now();
      child.kill('SIGKILL');
      await ended;
      expect(Date.now() - from).toBeLessThan(5000);
      expect([child.exitCode, child.signalCode]).toEqual([null, 'SIGKILL']);
      expect(readFileSync(SLOT, 'utf8')).toBe('{}\n');
      expect(readdirSync(dir).sort()).toEqual([`${SID}.json`, 'status.sh'].sort());
    } finally {
      if (child.exitCode === null) child.kill('SIGKILL');
    }
  });
});

describe('S2: the command string over every way the script can be broken', () => {
  const shells: Array<[string, string[]]> = [
    ['/bin/sh', []],
    ['/bin/dash', []],
    ['/bin/ksh', []],
    ['/bin/bash', ['--posix']],
    ['/bin/zsh', ['--emulate', 'sh']]
  ];
  const broken: Array<[string, (path: string) => void]> = [
    ['missing', () => undefined],
    ['a syntax error', (p) => writeFileSync(p, 'if then (\n')],
    ['exit 3', (p) => writeFileSync(p, 'exit 3\n')],
    ['a folder', (p) => mkdirSync(p)],
    ['unreadable', (p) => { writeFileSync(p, 'exit 7\n'); chmodSync(p, 0o000); }],
    ['set -eu and a failure', (p) => writeFileSync(p, 'set -eu\nfalse\n')],
    ['an unset name under set -u', (p) => writeFileSync(p, 'set -u\n: "$nothing_is_named_this"\n')],
    ['output on both', (p) => writeFileSync(p, 'echo said; echo said >&2\n')],
    ['return 5', (p) => writeFileSync(p, 'return 5\n')]
  ];
  it('answers 0 and says nothing in every one', () => {
    for (const [sh, args] of shells) {
      if (!existsSync(sh)) continue;
      for (const [name, plant] of broken) {
        const path = join(dir, 'broken it\'s.sh');
        rmSync(path, { recursive: true, force: true });
        plant(path);
        const r = spawnSync(sh, [...args, '-c', antigravityStatusCommand(path)], { input: '{}', env: ENV });
        expect([sh, name, r.status, r.stdout.toString() + r.stderr.toString()]).toEqual([sh, name, 0, '']);
        if (existsSync(path)) chmodSync(path, 0o700);
      }
    }
  }, 60_000);
});

describe('S2: a write that cannot land', () => {
  // A file size limit of nothing refuses the write as a full disk does, at the write and not at the open.
  const full = (sh: string): ReturnType<typeof spawnSync> =>
    spawnSync(sh, ['-c', 'trap "" XFSZ; ulimit -f 0; exec "$0" -c "$1"', sh, COMMAND], { input: JSON.stringify(honest()), env: ENV, timeout: 20_000 });
  for (const sh of ['/bin/sh', '/bin/dash', '/bin/zsh']) {
    it(`${sh}: answers 0, says nothing, keeps the old line and leaves no temporary file`, () => {
      const before = expected({ ...honest(), plan_tier: 'Older' });
      writeFileSync(SLOT, before);
      for (let i = 0; i < 3; i += 1) {
        const r = full(sh);
        expect([sh, r.status, String(r.stdout) + String(r.stderr)]).toEqual([sh, 0, '']);
        expect(readFileSync(SLOT, 'utf8')).toBe(before);
        expect(readdirSync(dir).sort()).toEqual([`${SID}.json`, 'status.sh'].sort());
      }
      // The limit is what refused it: the same run without it lands.
      expect(run(sh, JSON.stringify(honest())).line).toBe(expected(honest()));
    });
  }
});

describe('S3: it keys on content and never on a clock or a countdown', () => {
  for (const sh of SHELLS) {
    it(`${sh}: a payload whose countdown moved writes nothing; a changed fraction or reset writes`, () => {
      run(sh, JSON.stringify(honest()));
      const before = statSync(SLOT, { bigint: true });
      for (const left of [9902, 9000, 1]) {
        const p = honest();
        for (const b of Object.values(p['quota']) as any[]) b.reset_in_seconds = left;
        p['agent_state'] = `state ${String(left)}`;
        expect(run(sh, JSON.stringify(p)).rc).toBe(0);
        expect(statSync(SLOT, { bigint: true }).ino).toBe(before.ino);
        expect(statSync(SLOT, { bigint: true }).mtimeNs).toBe(before.mtimeNs);
      }
      const p = honest();
      p['quota']['gemini-5h'].remaining_fraction = 0.71234566;
      expect(run(sh, JSON.stringify(p)).line).toBe(expected(p));
      expect(statSync(SLOT, { bigint: true }).ino).not.toBe(before.ino);
      const q = honest();
      q['quota']['3p-5h'].reset_time = '2031-01-03T01:00:00Z';
      expect(run(sh, JSON.stringify(q)).line).toBe(expected(q));
    });

    it(`${sh}: replaying an alternation holds the last payload at every step`, () => {
      const [a, b] = [honest(), honest()];
      b['quota']['gemini-5h'].remaining_fraction = 0.70812345;
      for (const p of [a, b, a, b, b, a]) expect(run(sh, JSON.stringify(p)).line).toBe(expected(p));
    });
  }
});

describe('S4: killed at any step', () => {
  it('200 SIGKILLs of the sh across a whole run never leave a partial file, an output or a waiting process', async () => {
    let out = '';
    let killed = 0;
    let ran = 0;
    let wroteThenKilled = 0;
    let slowestEnd = 0;
    for (let i = 0; i < 200; i += 1) {
      const p = honest();
      p['quota']['gemini-5h'].remaining_fraction = Number(`0.5${String(1000 + i)}1`);
      // Four pipes: the last is inherited by whatever the run starts, so `close` comes only once all of it has gone.
      const child = spawn(SHELLS[i % 2] ?? '/bin/sh', ['-c', COMMAND], { env: ENV, stdio: ['pipe', 'pipe', 'pipe', 'pipe'] });
      const ended = new Promise<void>((resolve) => child.on('close', () => resolve()));
      child.stdout?.on('data', (d: Buffer) => (out += d.toString()));
      child.stderr?.on('data', (d: Buffer) => (out += d.toString()));
      child.stdin?.on('error', () => undefined);
      child.stdin?.end(JSON.stringify(p));
      await new Promise((r) => setTimeout(r, (i % 40) / 2));
      const from = Date.now();
      child.kill('SIGKILL');
      await ended;
      slowestEnd = Math.max(slowestEnd, Date.now() - from);
      // A kill that landed on a run already over ended nothing. What it DIED of is the reading, and never that it was sent.
      if (child.signalCode === 'SIGKILL') {
        killed += 1;
        if (readFileSync(SLOT, 'utf8').includes(String(p['quota']['gemini-5h'].remaining_fraction))) wroteThenKilled += 1;
      } else {
        expect([child.exitCode, child.signalCode]).toEqual([0, null]);
        ran += 1;
      }
      const text = readFileSync(SLOT, 'utf8');
      expect(text.endsWith('\n') && text.split('\n').length === 2).toBe(true);
      expect(() => JSON.parse(text)).not.toThrow();
    }
    expect(out).toBe('');
    expect(killed).toBeGreaterThan(20);
    expect(killed + ran).toBe(200);
    // Some were cut before the line landed; a run is not only ever caught after it.
    expect(killed - wroteThenKilled).toBeGreaterThan(5);
    // No process of a killed run outlives it.
    expect(slowestEnd).toBeLessThan(5000);
    // What a kill can leave is one temporary name, and it holds no address.
    for (const name of readdirSync(dir)) {
      expect([`${SID}.json`, 'status.sh'].includes(name) || new RegExp(`^${SID}\\.json\\.\\d+\\.tmp$`).test(name)).toBe(true);
    }
    expect(everything().includes('@')).toBe(false);
  }, 120_000);
});

describe('S5: the text itself', () => {
  it('parses under sh and dash', () => {
    for (const sh of SHELLS) expect(spawnSync(sh, ['-n', SCRIPT]).status).toBe(0);
  });

  it('names no other program, no clock, no network, no home and no here-document, and starts nothing in the background', () => {
    const bare = TEXT.split('\n').filter((l) => !l.startsWith('#')).join('\n');
    for (const word of ['curl', 'cat', 'sed', 'grep', 'date', 'sleep', 'eval', 'cd', 'nohup', 'trap', 'tee', 'python', 'perl', 'node', 'security', 'http']) {
      expect([word, new RegExp(`(?<![\\w$])${word}(?![\\w])`).test(bare)]).toEqual([word, false]);
    }
    expect(bare).not.toMatch(/<</);
    expect(bare).not.toContain('`');
    expect(bare).not.toContain('$HOME');
    expect(bare).not.toMatch(/(^|\s)~\//m);
    // A single `&` that is not `&&` is a background child.
    expect(bare.replace(/&&/g, '')).not.toContain('&');
    const paths = [...bare.replaceAll(dir.replace(/'/g, `'\\''`), '').matchAll(/(?<![\w./^[])\/(?:[a-z]+\/)+[a-z]+/g)].map((m) => m[0]);
    expect([...new Set(paths)].sort()).toEqual(['/bin/mv', '/bin/rm', '/usr/bin/awk', '/usr/bin/openssl']);
    expect(bare.match(/\brm\b.*/g)).toEqual(['rm -f "$tt_t"']);
    expect(TEXT).not.toContain('reset_in_seconds');
  });

  it('unsets every name it uses, and stops exporting, before it reads a byte; and checks the hash and the place last', () => {
    const bare = TEXT.split('\n').filter((l) => !l.startsWith('#')).join('\n');
    const unset = new Set((/^unset (.*)$/m.exec(bare)?.[1] ?? '').split(' '));
    for (const [, name] of bare.matchAll(/\b(tt_[a-z])\b/g)) expect([name, unset.has(name as string)]).toEqual([name, true]);
    expect(bare.startsWith('unset ')).toBe(true);
    expect(bare.split('\n').slice(1, 3)).toEqual(['set +a', 'umask 077']);
    expect(bare).toContain('while IFS= read -r tt_l || [ -n "$tt_l" ]; do');
    expect(bare).toContain('[ ${#tt_p} -le 16384 ] || exit 0');
    expect(bare).toContain('[ ${#tt_h} -eq 64 ] || exit 0');
    expect(bare).toContain('>"$tt_t" && [ -f "$tt_f" ] && /bin/mv -f "$tt_t" "$tt_f" && exit 0\n/bin/rm -f "$tt_t"\nexit 0\n');
  });

  it('carries its salt where it can be read back, and takes no other shape of one', () => {
    expect(saltOf(TEXT)).toBe(SALT);
    expect(saltOf('#!/bin/sh\ntt_k=\n')).toBeNull();
    for (const salt of ['', 'x', SALT.toUpperCase(), `${SALT}0`, "';id;'"]) {
      expect(() => antigravityStatusScript({ dir, salt })).toThrow();
    }
  });
});
