/**
 * Phase 375, the address the Antigravity status line script keeps beside the
 * hash (build/p375/SPEC.md §7.1 rows A1 to A6, D1 to D3, D11), RUN rather than
 * read: the generated text under `/bin/sh` (bash 3.2) and `/bin/dash`, through
 * the generated command string, as agy runs it.
 *
 * HERMETIC. One temporary userData whose folder name holds a space, an
 * apostrophe, `#`, `;` and é, invented addresses (build/fixtures/p375 and
 * build/fixtures/p374), no network, no agent and nothing under a home. Every
 * child is waited on or killed and waited on.
 *
 * Every expectation is composed here from SPEC D2 and `node:crypto`, which
 * share no code with the script's awk and openssl: the raw top level token is
 * found by a scanner of this file's own, the kept `e` by D2's rule over it, and
 * the hash by sha256 of the salt and that token.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const world = vi.hoisted(() => ({ userData: '', on: true as unknown }));
vi.mock('electron', () => ({ app: { getPath: () => world.userData } }));
vi.mock('../../../settings/store', () => ({ getSettings: () => ({ usage: { antigravity: world.on } }) }));
vi.mock('../../../log', () => {
  const no = (): undefined => undefined;
  return { getLog: () => ({ info: no, warn: no, error: no, debug: no }) };
});

const { antigravityStatusCommand, antigravityStatusScript } = await import('../script');
const { antigravityUsageDir, bootAntigravityUsage, clearAntigravityUsage, forgetAntigravitySession, resetAntigravityFolderForTests } = await import('../folder');

const root = realpathSync(mkdtempSync(join(tmpdir(), 'tortie-p375-script-')));
afterAll(() => rmSync(root, { recursive: true, force: true }));
world.userData = join(root, "user data it's #1; é");
mkdirSync(join(world.userData, 'gmux'), { recursive: true });
const dir = antigravityUsageDir();
const tmp = join(root, 'tmp');
const home = join(root, 'home');
for (const d of [dir, tmp, home]) mkdirSync(d, { recursive: true, mode: 0o700 });
const SID = '11111111-2222-4333-8444-555555555555';
const SALT = '0123456789abcdef0123456789abcdef';
const SCRIPT = join(dir, 'status.sh');
const SLOT = join(dir, `${SID}.json`);
const TEXT = antigravityStatusScript({ dir, salt: SALT });
const COMMAND = antigravityStatusCommand(SCRIPT);
const SHELLS = ['/bin/sh', '/bin/dash'];
const ENV: NodeJS.ProcessEnv = { PATH: '/usr/bin:/bin', GMUX_MANAGED: '1', GMUX_SESSION_ID: SID, TMPDIR: tmp, HOME: home };

const FIX = join(process.cwd(), 'build', 'fixtures');
const jsonOf = (path: string): any => JSON.parse(readFileSync(join(FIX, path), 'utf8'));
interface Case {
  name: string;
  raw: string;
  want: string | null;
}
const CORPUS = (jsonOf('p375/addresses.json') as { cases: Case[] }).cases;
const caseNamed = (name: string): Case => {
  const found = CORPUS.find((c) => c.name === name);
  if (found === undefined) throw new Error(`no corpus case is called ${name}`);
  return found;
};

beforeEach(() => {
  resetAntigravityFolderForTests();
  world.on = true;
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  for (const name of readdirSync(dir)) rmSync(join(dir, name), { recursive: true, force: true });
  writeFileSync(SCRIPT, TEXT);
  chmodSync(SCRIPT, 0o700);
  writeFileSync(SLOT, '{}\n', { mode: 0o600 });
});

interface Ran {
  rc: number | null;
  out: string;
  line: string;
}

function run(sh: string, payload: string, env: NodeJS.ProcessEnv = ENV): Ran {
  const r = spawnSync(sh, ['-c', COMMAND], { input: payload, env, timeout: 20_000 });
  return {
    rc: r.status,
    out: `${r.stdout.toString()}${r.stderr.toString()}`,
    line: existsSync(SLOT) && statSync(SLOT).isFile() ? readFileSync(SLOT, 'utf8') : '(none)'
  };
}

/** The kept line's own shape: the hash, then `e`, then Phase 374's tail. */
const LINE = /^\{"v":1,"h":"([0-9a-f]{64})","e":(null|"[^"\\]*"),(.*)\n$/s;

/** What the line keeps as `e`, decoded: the address, null, or 'none' for no write. */
function keptOf(line: string): string | null {
  if (line === '{}\n') return 'none';
  const m = LINE.exec(line);
  if (m === null) throw new Error(`not the shape: ${line.slice(0, 120)}`);
  return m[2] === 'null' ? null : (JSON.parse(m[2] ?? '') as string);
}

/**
 * The raw text of the LAST top level `email` value, or undefined when the last
 * one is not a string (or there is none). A scanner of this file's own over
 * JSON text: keys are compared as written, as SPEC D2 says the raw token is.
 */
function topEmailToken(raw: string): string | undefined {
  let depth = 0;
  let key: string | null = null;
  let wantKey = false;
  let token: string | undefined;
  for (let i = 0; i < raw.length; ) {
    const c = raw[i] ?? '';
    if (c === '"') {
      let j = i + 1;
      while (j < raw.length && raw[j] !== '"') j += raw[j] === '\\' ? 2 : 1;
      const str = raw.slice(i, j + 1);
      if (depth === 1 && wantKey) {
        key = str.slice(1, -1);
        wantKey = false;
      } else if (depth === 1 && key === 'email') token = str;
      i = j + 1;
      continue;
    }
    if (c === '{' || c === '[') {
      if (depth === 1 && key === 'email') token = undefined;
      depth += 1;
      if (depth === 1) wantKey = c === '{';
    } else if (c === '}' || c === ']') depth -= 1;
    else if (c === ',' && depth === 1) wantKey = true;
    else if (depth === 1 && key === 'email' && !wantKey && /[-0-9a-z]/.test(c)) token = undefined;
    i += 1;
  }
  return token;
}

/** SPEC D2 over a raw token: the token itself when plain, else `null`, as JSON text. */
function keptE(token: string): string {
  if (token.includes('\n') || token.length > 256) return 'null';
  if (!/^"[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+"$/.test(token)) return 'null';
  const at = token.indexOf('@');
  return at >= 2 && at <= 65 ? token : 'null';
}

const hashOf = (token: string): string => createHash('sha256').update(`${SALT}${token.replace(/\n/g, '')}`).digest('hex');

/** Every name in the three folders but the script, and every byte of each. */
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

describe('A1: the address corpus under /bin/sh and /bin/dash', () => {
  it('A1: holds the cases the spec names, every address an invented one', () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(40);
    for (const c of CORPUS) {
      // What follows the last `@` of every address-like run is an example host, or nothing at all.
      for (const m of c.raw.matchAll(/[^"\s:,{}\\]*@[^"\s,{}\\]*/g)) {
        const host = m[0].slice(m[0].lastIndexOf('@') + 1);
        expect([c.name, m[0], host === '' || host === 'example' || /(^|\.)ex(a|ä)mple\.(invalid|com)\.?$/i.test(host)]).toEqual([c.name, m[0], true]);
      }
    }
  });

  for (const sh of SHELLS) {
    it(`A1: ${sh}: exit 0, no output, one file, and the kept e exactly the case's want`, () => {
      for (const c of CORPUS) {
        writeFileSync(SLOT, '{}\n');
        const r = run(sh, c.raw);
        expect([c.name, r.rc, r.out]).toEqual([c.name, 0, '']);
        expect([c.name, readdirSync(dir).sort()]).toEqual([c.name, [`${SID}.json`, 'status.sh'].sort()]);
        expect([c.name, keptOf(r.line)]).toEqual([c.name, c.want]);
        if (r.line !== '{}\n') expect([c.name, typeof JSON.parse(r.line)]).toEqual([c.name, 'object']);
      }
      expect(readdirSync(tmp)).toEqual([]);
      expect(readdirSync(home)).toEqual([]);
    }, 120_000);
  }
});

describe('A1: a raw line break and the address (the fix round)', () => {
  const PLAIN = '"email":"p375-plain@example.invalid"';
  const withEmail = (field: string): string => {
    const raw = caseNamed('plain').raw;
    expect(raw).toContain(PLAIN);
    return raw.replace(PLAIN, field);
  };
  // Invalid JSON every one (JSON forbids a raw line break in a string), so these stay out of the
  // committed corpus, which conformance:usage G12 judges against JSON.parse. Each `want` is D2's.
  const LINES: [string, string, string | null][] = [
    ['a break inside the address', '"email":"a\nb.p375@example.invalid"', null],
    ['a blank line inside the address', '"email":"a\n\nb.p375@example.invalid"', null],
    ['a break just before its closing quote', '"email":"a.p375@example.invalid\n"', null],
    ['a break before its opening quote and after its closing one', '"email":\n"lf.p375@example.invalid"\n', 'lf.p375@example.invalid'],
    ['a broken first email, then a plain one', '"email":"x\ny.p375@example.invalid","email":"second.p375@example.invalid"', 'second.p375@example.invalid'],
    ['a plain first email, then a broken one', '"email":"first.p375@example.invalid","email":"x\ny.p375@example.invalid"', null]
  ];
  for (const sh of SHELLS) {
    it(`A1: ${sh}: a break strictly inside the last top level email refuses it, and nothing else does`, () => {
      for (const [name, field, want] of LINES) {
        writeFileSync(SLOT, '{}\n');
        const r = run(sh, withEmail(field));
        expect([name, r.rc, r.out, keptOf(r.line)]).toEqual([name, 0, '', want]);
      }
    });
  }
});

describe('A2: every line is Phase 374’s line with e after the hash', () => {
  for (const sh of SHELLS) {
    it(`A2: ${sh}: every hostile payload of Phase 374 leaves {"v":1,"h":H,"e":X,<its tail>}, or nothing where it left nothing`, () => {
      for (const one of jsonOf('p374/hostile.json').payloads as { name: string; close: boolean; tail: string | null; raw: string }[]) {
        if (one.close === false) continue;
        const raw = one.raw.replace('@@PAD@@', 'x'.repeat(65_536));
        writeFileSync(SLOT, '{}\n');
        const r = run(sh, raw);
        expect([one.name, r.rc, r.out]).toEqual([one.name, 0, '']);
        if (one.tail === null) {
          expect([one.name, r.line]).toEqual([one.name, '{}\n']);
          continue;
        }
        const token = topEmailToken(raw);
        expect([one.name, typeof token]).toEqual([one.name, 'string']);
        expect([one.name, r.line]).toEqual([one.name, `{"v":1,"h":"${hashOf(token ?? '')}","e":${keptE(token ?? '')},${one.tail}\n`]);
      }
    }, 120_000);

    it(`A2: ${sh}: every run of both recordings holds the writer's own address beside its own numbers`, () => {
      const want = jsonOf('p374/expect.json');
      for (const which of ['launch', 'resume']) {
        writeFileSync(SLOT, '{}\n');
        const runs = readFileSync(join(FIX, 'p374', `${which}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { payload: unknown });
        let token = '';
        for (const [i, one] of runs.entries()) {
          const raw = JSON.stringify(one.payload);
          const before = statSync(SLOT, { bigint: true }).ino;
          const r = run(sh, raw);
          const held = want[which].perRun[i] as { run: number; wrote: boolean; held: string | null };
          const wrote = statSync(SLOT, { bigint: true }).ino !== before;
          expect([which, held.run, r.rc, r.out, wrote]).toEqual([which, held.run, 0, '', held.wrote]);
          if (wrote) token = topEmailToken(raw) ?? '';
          if (held.held === null) expect([which, held.run, r.line]).toEqual([which, held.run, '{}\n']);
          else expect([which, held.run, r.line]).toEqual([which, held.run, `{"v":1,"h":"${hashOf(token)}","e":${keptE(token)},${held.held}\n`]);
        }
      }
    }, 120_000);
  }
});

describe('A3: the bound is the one Phase 374 counted', () => {
  for (const sh of SHELLS) {
    it(`A3: ${sh}: 16,384 compact is read, 16,385 is not, the same 16,384 over many lines is read, and CRLF counts as the parent counts it`, () => {
      const at = caseNamed('a compact payload of exactly the cap');
      const over = caseNamed('one byte over the cap');
      const lines = caseNamed('the same broken over many lines, its bytes past the cap');
      const crlf = caseNamed('the same with CRLF');
      expect([at.raw.length, over.raw.length, lines.raw.replace(/\n/g, '').length]).toEqual([16_384, 16_385, 16_384]);
      expect(lines.raw.length).toBeGreaterThan(16_384);
      for (const [c, kept] of [[at, 'cap.p375@example.invalid'], [over, 'none'], [lines, 'cap.p375@example.invalid'], [crlf, 'none']] as const) {
        writeFileSync(SLOT, '{}\n');
        const r = run(sh, c.raw);
        expect([c.name, r.rc, r.out, keptOf(r.line)]).toEqual([c.name, 0, '', kept]);
      }
      // A short payload with carriage returns is read whole, as Phase 374 read it.
      const short = JSON.stringify(JSON.parse(at.raw.replace(/"conversation_title":"t+",/, '')), null, 1).replace(/\n/g, '\r\n');
      writeFileSync(SLOT, '{}\n');
      expect(keptOf(run(sh, short).line)).toBe('cap.p375@example.invalid');
    });
  }
});

describe('A3: a line break anywhere, and blank lines by the ten thousand (the fix round)', () => {
  for (const sh of SHELLS) {
    it(`A3: ${sh}: a break or a blank line at any place leaves the compact payload's line, e null only for one inside the address`, () => {
      const compact = caseNamed('apostrophe').raw;
      const token = '"o\'brien.p375@example.invalid"';
      const from = compact.indexOf(token);
      expect(from).toBeGreaterThan(0);
      const to = from + token.length;
      writeFileSync(SLOT, '{}\n');
      const whole = run(sh, compact).line;
      expect(keptOf(whole)).toBe("o'brien.p375@example.invalid");
      const nulled = whole.replace(`"e":${token},`, '"e":null,');
      // Every 9th place, and every place in and around the address.
      const places: number[] = [];
      for (let i = 1; i < compact.length; i += 1) if (i % 9 === 0 || (i >= from - 2 && i <= to + 2)) places.push(i);
      let inside = 0;
      for (const i of places) {
        for (const brk of ['\n', '\n\n']) {
          writeFileSync(SLOT, '{}\n');
          const r = run(sh, compact.slice(0, i) + brk + compact.slice(i));
          const inToken = i > from && i < to;
          if (inToken) inside += 1;
          expect([i, JSON.stringify(brk), r.rc, r.out, r.line]).toEqual([i, JSON.stringify(brk), 0, '', inToken ? nulled : whole]);
        }
      }
      expect(inside).toBeGreaterThan(50);
    }, 240_000);

    it(`A3: ${sh}: 60,000 blank lines write the compact line and cost no more than Phase 374's own loop over them`, () => {
      const compact = caseNamed('plain').raw;
      const blank = `{${'\n'.repeat(60_000)}${compact.slice(1)}`;
      // Phase 374's loop, by value (8d58c391), and nothing after it.
      const loop374 = 'tt_p=\ntt_l=\nwhile IFS= read -r tt_l || [ -n "$tt_l" ]; do\n  tt_p=$tt_p$tt_l\n  tt_l=\n  [ ${#tt_p} -le 16384 ] || exit 0\ndone\nexit 0\n';
      const ms = (f: () => unknown): number => {
        const t0 = process.hrtime.bigint();
        f();
        return Number(process.hrtime.bigint() - t0) / 1e6;
      };
      const head: number[] = [];
      const base: number[] = [];
      const ref: number[] = [];
      let wrote = '';
      for (let k = 0; k < 3; k += 1) {
        writeFileSync(SLOT, '{}\n');
        head.push(ms(() => (wrote = run(sh, blank).line)));
        writeFileSync(SLOT, '{}\n');
        base.push(ms(() => run(sh, compact)));
        ref.push(ms(() => spawnSync(sh, ['-c', loop374], { input: blank, env: ENV, timeout: 60_000 })));
      }
      writeFileSync(SLOT, '{}\n');
      expect(wrote).toBe(run(sh, compact).line);
      const mid = (a: number[]): number => [...a].sort((x, y) => x - y)[1] ?? 0;
      expect([sh, mid(head) - mid(base) <= 2 * mid(ref) + 150]).toEqual([sh, true]);
    }, 240_000);
  }
});

describe('A4: killed at any step with an address in the payload', () => {
  it('A4: 200 SIGKILLs never leave a partial slot, and a left .tmp is empty or one whole line, which every way out removes', async () => {
    let killed = 0;
    let out = '';
    for (let i = 0; i < 200; i += 1) {
      const raw = caseNamed('plain').raw.replace(/"remaining_fraction":[0-9.]+/, `"remaining_fraction":0.5${String(1000 + i)}1`);
      const child = spawn(SHELLS[i % 2] ?? '/bin/sh', ['-c', COMMAND], { env: ENV, stdio: ['pipe', 'pipe', 'pipe', 'pipe'] });
      const ended = new Promise<void>((resolve) => child.on('close', () => resolve()));
      child.stdout?.on('data', (d: Buffer) => (out += d.toString()));
      child.stderr?.on('data', (d: Buffer) => (out += d.toString()));
      child.stdin?.on('error', () => undefined);
      child.stdin?.end(raw);
      await new Promise((r) => setTimeout(r, (i % 40) / 2));
      child.kill('SIGKILL');
      await ended;
      if (child.signalCode === 'SIGKILL') killed += 1;
      const text = readFileSync(SLOT, 'utf8');
      expect(text === '{}\n' || LINE.test(text)).toBe(true);
    }
    expect(out).toBe('');
    expect(killed).toBeGreaterThan(20);
    for (const name of readdirSync(dir)) {
      if (name === 'status.sh' || name === `${SID}.json`) continue;
      expect(name).toMatch(new RegExp(`^${SID}\\.json\\.\\d+\\.tmp$`));
      const left = readFileSync(join(dir, name), 'utf8');
      expect(left === '' || LINE.test(left)).toBe(true);
    }
    // Every way out of the folder takes such a write, address and all, and a stranger's file stays.
    const whole = `{"v":1,"h":"${'a'.repeat(64)}","e":"left.p375@example.invalid","p":null,"q":{}}\n`;
    const plant = (): string => {
      const at = join(dir, `${SID}.json.4242.tmp`);
      writeFileSync(at, whole, { mode: 0o600 });
      return at;
    };
    writeFileSync(join(dir, 'notes.txt'), 'mine\n');
    let at = plant();
    forgetAntigravitySession(SID);
    expect([existsSync(at), existsSync(SLOT), existsSync(join(dir, 'notes.txt'))]).toEqual([false, false, true]);
    writeFileSync(SLOT, whole, { mode: 0o600 });
    at = plant();
    bootAntigravityUsage(() => [SID]);
    expect([existsSync(at), existsSync(SLOT), existsSync(join(dir, 'notes.txt'))]).toEqual([false, true, true]);
    at = plant();
    clearAntigravityUsage();
    expect([existsSync(at), existsSync(SLOT), readdirSync(dir)]).toEqual([false, false, ['notes.txt']]);
    expect(readFileSync(join(dir, 'notes.txt'), 'utf8')).toBe('mine\n');
  }, 120_000);
});

describe('A5: a write that cannot land', () => {
  const full = (sh: string, payload: string): ReturnType<typeof spawnSync> =>
    spawnSync(sh, ['-c', 'trap "" XFSZ; ulimit -f 0; exec "$0" -c "$1"', sh, COMMAND], { input: payload, env: ENV, timeout: 20_000 });
  for (const sh of ['/bin/sh', '/bin/dash', '/bin/zsh']) {
    it(`A5: ${sh}: with an address, answers 0, says nothing, keeps the old line, leaves no .tmp and the address nowhere`, () => {
      writeFileSync(SLOT, '{}\n');
      run(sh, caseNamed('apostrophe').raw);
      const before = readFileSync(SLOT, 'utf8');
      expect(keptOf(before)).toBe("o'brien.p375@example.invalid");
      for (let i = 0; i < 3; i += 1) {
        const r = full(sh, caseNamed('plain').raw);
        expect([sh, r.status, String(r.stdout) + String(r.stderr)]).toEqual([sh, 0, '']);
        expect(readFileSync(SLOT, 'utf8')).toBe(before);
        expect(readdirSync(dir).sort()).toEqual([`${SID}.json`, 'status.sh'].sort());
        expect(everything().includes('p375-plain')).toBe(false);
      }
      // The limit is what refused it: the same run without it lands.
      expect(keptOf(run(sh, caseNamed('plain').raw).line)).toBe('p375-plain@example.invalid');
    });
  }
});

describe('A6: the text itself', () => {
  const bare = TEXT.split('\n').filter((l) => !l.startsWith('#')).join('\n');
  it('A6: parses under sh and dash', () => {
    for (const sh of SHELLS) expect([sh, spawnSync(sh, ['-n', SCRIPT]).status]).toEqual([sh, 0]);
  });

  it('A6: unsets tt_c with the rest before it reads a byte, and exports no tt_ name', () => {
    const first = bare.split('\n')[0] ?? '';
    expect(first.startsWith('unset ')).toBe(true);
    expect(first.split(' ')).toContain('tt_c');
    expect(first.split(' ')).toContain('tt_q');
    expect(bare.indexOf('tt_c=0')).toBeGreaterThan(bare.indexOf(first));
    expect(bare.indexOf('tt_q=\n')).toBeGreaterThan(bare.indexOf(first));
    expect(bare).not.toMatch(/^[ \t]*export\b[^\n]*\btt_/m);
    expect(bare).not.toMatch(/\bset\s+-a\b/);
  });

  it('A6: still names the four programs and no other, and the reader holds no apostrophe', () => {
    const paths = [...bare.replaceAll(dir.replace(/'/g, `'\\''`), '').matchAll(/(?<![\w./^[])\/(?:[a-z]+\/)+[a-z]+/g)].map((m) => m[0]);
    expect([...new Set(paths)].sort()).toEqual(['/bin/mv', '/bin/rm', '/usr/bin/awk', '/usr/bin/openssl']);
    const start = bare.indexOf("/usr/bin/awk '") + "/usr/bin/awk '".length;
    const end = bare.indexOf("')\n", start);
    const program = bare.slice(start, end);
    expect(program).toContain('sprintf("%c",39)');
    expect(program).not.toContain("'");
    for (const word of [/getline/, /system/, /ENVIRON/, /close/, /print[ \t]*>/, /(?<!s)printf/]) expect([String(word), word.test(program)]).toEqual([String(word), false]);
  });
});
