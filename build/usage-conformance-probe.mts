/**
 * usage-conformance-probe.mts. The SHIPPING usage domain, run under node and
 * printed as JSON for build/conformance-usage.mjs to judge (Phase 374).
 *
 * It imports the shipping modules rather than a copy, so the gate is testing
 * what the app does. It launches no Electron, opens no window, starts no tmux
 * server, opens no keychain, makes no request and reads nothing under the
 * person's home: the credential reader, the transport, the login resolver and
 * the received folder are all recorders in memory, and every token, account and
 * number is invented here.
 *
 * `P374_USAGE_DIR` points it at an ABLATED copy of the domain, which is how the
 * gate watches its own rules go red. The copy must be a SIBLING of `usage/`
 * under `src/main/`, because the domain imports `../proc/guarded`.
 *
 * WHAT IT STARTS. `/bin/sh`, with `spawnSync`, over the generated status line
 * script and the command string that runs it, in a scratch directory it makes
 * and removes, and since Phase 375 `/bin/dash` beside it over the committed
 * address corpus (build/fixtures/p375/addresses.json). Nothing it starts
 * outlives the call that started it.
 *
 * PHASE 375 PLANTS AN ADDRESS. The received file carries one as `e`, so the
 * gate reads where it goes in the payload a window is handed (G10, G12), and
 * the corpus is run to read which tokens the script keeps (G12).
 */

import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = process.env['P374_USAGE_DIR'] ?? 'src/main/usage';
const at = (name: string): string => pathToFileURL(resolve(DIR, name)).href;

const shared = (await import(
  pathToFileURL(resolve('src/shared/usage.ts')).href
)) as typeof import('../src/shared/usage');
const providers = (await import(at('providers.ts'))) as typeof import('../src/main/usage/providers');
const serviceMod = (await import(at('service.ts'))) as typeof import('../src/main/usage/service');
const receive = (await import(
  at('antigravity/receive.ts')
)) as typeof import('../src/main/usage/antigravity/receive');
const script = (await import(
  at('antigravity/script.ts')
)) as typeof import('../src/main/usage/antigravity/script');

type Settings = Parameters<typeof serviceMod.createUsageService>[0]['settings'] extends () => infer S
  ? S
  : never;

const HASH = 'f'.repeat(64);
/** Phase 375: the address the received file carries, invented. */
const PLANTED = 'planted.p375@example.invalid';
const NOW = Date.UTC(2031, 0, 10, 12, 0, 0);
const TOKENS = { claude: 'P374-CLAUDE-TOKEN', codex: 'P374-CODEX-TOKEN' } as const;
const ACCOUNT = 'P374-CODEX-ACCOUNT';

interface Seen {
  requests: { host: string; path: string; headers: Record<string, string> }[];
  keychain: number;
  files: string[];
  logins: string[];
  receiver: string[];
  logs: { event: string; fields: Record<string, unknown> }[];
}

function world(): {
  seen: Seen;
  credentials: Parameters<typeof serviceMod.createUsageService>[0]['credentials'];
} {
  const seen: Seen = {
    requests: [],
    keychain: 0,
    files: [],
    logins: [],
    receiver: [],
    logs: []
  };
  return {
    seen,
    credentials: {
      keychain: async () => {
        seen.keychain += 1;
        return JSON.stringify({
          claudeAiOauth: { accessToken: TOKENS.claude, subscriptionType: 'max' }
        });
      },
      readText: async (path: string) => {
        seen.files.push(path);
        return JSON.stringify({
          OPENAI_API_KEY: null,
          tokens: { access_token: TOKENS.codex, account_id: ACCOUNT }
        });
      },
      env: {},
      home: '/p374-home'
    }
  };
}

const FILE = {
  id: 's',
  text: JSON.stringify({
    v: 1,
    h: HASH,
    e: PLANTED,
    p: 'Example Plan',
    q: {
      'gemini-5h': { f: 0.75, r: '2031-01-10T15:00:00Z', d: null, a: false },
      'gemini-weekly': { f: 0.5, r: null, d: null, a: false },
      '3p-5h': { f: 0.9, r: null, d: null, a: false },
      '3p-weekly': { f: 1, r: null, d: null, a: false }
    }
  }),
  mtimeMs: NOW
};

async function ask(
  on: { claude: boolean; codex: boolean; antigravity: boolean },
  arm: 'read' | 'refresh',
  files = [FILE]
): Promise<{ seen: Seen; snapshot: unknown; states: Record<string, string> }> {
  const { seen, credentials } = world();
  const note =
    <T,>(what: string, answer: T) =>
    (): T => {
      seen.receiver.push(what);
      return answer;
    };
  const service = serviceMod.createUsageService({
    credentials,
    transport: async (req) => {
      seen.requests.push({ host: req.host, path: req.path, headers: req.headers });
      return {
        status: 200,
        body:
          req.host === 'api.anthropic.com'
            ? JSON.stringify({ five_hour: { utilization: 32 } })
            : JSON.stringify({
                plan_type: 'pro',
                email: 'someone@example.com',
                rate_limit: {
                  primary_window: {
                    limit_window_seconds: 604800,
                    reset_after_seconds: 10,
                    used_percent: 7
                  }
                }
              }),
        retryAfterAt: null
      };
    },
    settings: () => ({ ...on, bar: 'five-hour' }) as Settings,
    logins: (provider) => {
      seen.logins.push(provider);
      return { name: null, dir: null };
    },
    receiver: {
      read: () => {
        seen.receiver.push('read');
        return receive.newestReading(files, NOW);
      },
      clear: note('clear', undefined),
      opened: () => false,
      waiting: () => 'session' as const,
      mtime: note('mtime', NOW as number | null),
      focused: note('focused', true)
    },
    now: () => NOW,
    log: (event, fields) => seen.logs.push({ event, fields })
  });
  const snapshot = await service[arm]();
  service.pulse();
  const states: Record<string, string> = {};
  for (const row of snapshot.providers) states[row.provider] = row.state;
  return { seen, snapshot, states };
}

/** The kept line's head, and the `e` beside it, in the one shape the script writes. */
const E_AT_HEAD = /^(\{"v":1,"h":"[0-9a-f]{64}","e":)(null|"[^"\\]*"),/;

/**
 * The raw text of the LAST top level `email` value, or undefined when that one
 * is not a string. Keys are compared as written, as SPEC D2's raw token is.
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

const out: Record<string, unknown> = {};
try {
  // 1. The table and the two lookups.
  const table = providers.USAGE_PROVIDER_TABLE as unknown as Record<
    string,
    Record<string, unknown>
  >;
  out['providers'] = [...shared.USAGE_PROVIDERS];
  out['table'] = Object.fromEntries(
    Object.entries(table).map(([key, entry]) => [
      key,
      {
        keys: Object.keys(entry).sort(),
        kind: entry['kind'],
        login: entry['login'] ?? null,
        host: entry['host'] ?? null,
        path: entry['path'] ?? null
      }
    ])
  );
  out['lookups'] = Object.fromEntries(
    shared.USAGE_PROVIDERS.map((p) => [
      p,
      { login: shared.usageLoginProvider(p), receiver: shared.usageIsReceiver(p) }
    ])
  );
  // 2. Whose token each entry's own reader finds and its own headers carry.
  const issued: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(table)) {
    if (entry['kind'] !== 'fetch') continue;
    const fetchEntry = entry as unknown as import('../src/main/usage/providers').UsageFetchEntry;
    const { seen, credentials } = world();
    const cred = await fetchEntry.credential(credentials, null);
    const headers = cred.kind === 'ok' ? JSON.stringify(fetchEntry.headers(cred)) : '';
    issued[key] = {
      host: fetchEntry.host,
      carries: Object.entries(TOKENS)
        .filter(([, token]) => headers.includes(token))
        .map(([owner]) => owner),
      keychain: seen.keychain,
      files: seen.files
    };
  }
  out['issued'] = issued;
  // 3. Every set of switches, over both doors.
  const runs: unknown[] = [];
  for (const claude of [false, true]) {
    for (const codex of [false, true]) {
      for (const antigravity of [false, true]) {
        for (const arm of ['read', 'refresh'] as const) {
          const on = { claude, codex, antigravity };
          const { seen, states } = await ask(on, arm);
          runs.push({
            on,
            arm,
            hosts: seen.requests.map((r) => r.host),
            requests: seen.requests,
            keychain: seen.keychain,
            files: seen.files,
            logins: seen.logins,
            receiver: [...new Set(seen.receiver)],
            states,
            logs: seen.logs
          });
        }
      }
    }
  }
  out['runs'] = runs;
  // 4. The whole payload a window is handed, for the words it may not hold.
  const whole = await ask({ claude: true, codex: true, antigravity: true }, 'read');
  out['payload'] = JSON.stringify(whole.snapshot);
  out['payloadHoldsMark'] = JSON.stringify(whole.snapshot).includes(HASH);
  out['planted'] = PLANTED;
  // 5. The script, its command and its settings value.
  const root = mkdtempSync(join(tmpdir(), 'p374-conformance-'));
  try {
    const dir = join(root, "sla sh's");
    mkdirSync(dir, { mode: 0o700 });
    const salt = '0123456789abcdef0123456789abcdef';
    const path = join(dir, 'status.sh');
    const text = script.antigravityStatusScript({ dir, salt });
    writeFileSync(path, text, { mode: 0o700 });
    const command = script.antigravityStatusCommand(path);
    out['script'] = { text, command, salt: script.saltOf(text), dir };
    out['settings'] = JSON.parse(script.antigravitySettingsJson(path)) as unknown;
    const parse = spawnSync('/bin/sh', ['-n', path], { encoding: 'utf8', timeout: 10_000 });
    out['scriptParses'] = parse.status;
    const sid = '00000000-0000-4000-8000-000000000001';
    const slot = join(dir, `${sid}.json`);
    const ADDRESS = 'someone@example.com';
    const base = {
      email: ADDRESS,
      plan_tier: 'Example Plan',
      cwd: '/Users/p374/secret-folder',
      conversation_title: '"quota":{"gemini-5h":{"remaining_fraction":0.01}} other@example.com',
      quota: {
        'gemini-5h': {
          remaining_fraction: 0.75,
          reset_time: '2031-01-10T15:00:00Z',
          reset_in_seconds: 100
        },
        'gemini-weekly': { remaining_fraction: 0.5, reset_in_seconds: 5 }
      }
    };
    const bucket = (b: unknown): unknown => ({ ...base, quota: { 'gemini-5h': b } });
    const payloads: [string, string][] = [
      ['the ordinary payload', JSON.stringify(base)],
      ['an address as the reset', JSON.stringify(bucket({ remaining_fraction: 0.5, reset_time: ADDRESS }))],
      ['an address as the plan', JSON.stringify({ ...base, plan_tier: ADDRESS })],
      ['an address as the fraction', JSON.stringify(bucket({ remaining_fraction: ADDRESS }))],
      ['an address as a bucket id', JSON.stringify({ ...base, quota: { ...base.quota, [ADDRESS]: { remaining_fraction: 0.5 } } })],
      ['a fraction that is not a JSON number', JSON.stringify(bucket({ remaining_fraction: 0.5 })).replace('0.5', '007')],
      ['an amount', JSON.stringify(bucket({ remaining_fraction: 0.5, remaining_amount: 3 }))],
      ['disabled', JSON.stringify(bucket({ remaining_fraction: 1, disabled: true }))],
      ['no address', JSON.stringify({ ...base, email: undefined })],
      ['an address that is an object', JSON.stringify({ ...base, email: { a: ADDRESS } })],
      ['a truncated payload', JSON.stringify(base).slice(0, -3)],
      ['trailing junk', `${JSON.stringify(base)} {}`],
      ['nothing', '']
    ];
    out['scriptRuns'] = payloads.map(([what, payload]) => {
      for (const name of readdirSync(dir)) if (name !== 'status.sh') rmSync(join(dir, name));
      writeFileSync(slot, '{}\n', { mode: 0o600 });
      const run = spawnSync('/bin/sh', ['-c', command], {
        input: payload,
        encoding: 'utf8',
        timeout: 10_000,
        env: { PATH: '/usr/bin:/bin', TMPDIR: root, GMUX_MANAGED: '1', GMUX_SESSION_ID: sid }
      });
      const held = readdirSync(dir)
        .filter((name) => name !== 'status.sh')
        .map((name) => [name, readFileSync(join(dir, name), 'utf8')] as const);
      // Phase 375: the one place an address may stand, the `e` of the slot line
      // in exactly the shape the line begins with, is taken out before the search.
      const all = held
        .map(([name, body]) => `${name}\n${name === `${sid}.json` ? body.replace(E_AT_HEAD, '$1"KEPT",') : body}`)
        .join('\n');
      const kept = readFileSync(slot, 'utf8');
      const e = E_AT_HEAD.exec(kept);
      return {
        what,
        status: run.status,
        output: `${run.stdout ?? ''}${run.stderr ?? ''}`,
        kept: kept.trim(),
        e: e === null ? null : (JSON.parse(e[2] ?? 'null') as unknown),
        names: held.map(([name]) => name).sort(),
        leaks: ['@', 'example.com', 'secret-folder', '"email"', 'reset_in_seconds'].filter((w) =>
          all.includes(w)
        )
      };
    });
    out['scriptAddress'] = ADDRESS;
    const gone = spawnSync(
      '/bin/sh',
      ['-c', script.antigravityStatusCommand(join(root, 'absent', 'status.sh'))],
      { input: '{}', encoding: 'utf8', timeout: 10_000, env: { PATH: '' } }
    );
    out['missingScript'] = {
      status: gone.status,
      output: `${gone.stdout ?? ''}${gone.stderr ?? ''}`
    };
    // 6. Phase 375, G12 (a): the committed address corpus under /bin/sh and
    // /bin/dash, with what the shared shape says of each decoded address.
    const corpus = JSON.parse(readFileSync(resolve('build/fixtures/p375/addresses.json'), 'utf8')) as {
      cases: { name: string; raw: string; want: string | null }[];
    };
    // The gate leaves it out (`P375_CORPUS=0`) for a copy whose edit cannot reach the reader.
    if (process.env['P375_CORPUS'] !== '0') out['corpus'] = corpus.cases.map((c) => {
      const token = topEmailToken(c.raw);
      let decoded: unknown;
      try {
        decoded = (JSON.parse(c.raw) as Record<string, unknown>)['email'];
      } catch {
        decoded = undefined;
      }
      const kept: Record<string, unknown> = {};
      for (const sh of ['/bin/sh', '/bin/dash']) {
        for (const name of readdirSync(dir)) if (name !== 'status.sh') rmSync(join(dir, name));
        writeFileSync(slot, '{}\n', { mode: 0o600 });
        const r = spawnSync(sh, ['-c', command], {
          input: c.raw,
          encoding: 'utf8',
          timeout: 10_000,
          env: { PATH: '/usr/bin:/bin', TMPDIR: root, GMUX_MANAGED: '1', GMUX_SESSION_ID: sid }
        });
        const line = readFileSync(slot, 'utf8');
        const m = E_AT_HEAD.exec(line);
        kept[sh] = {
          status: r.status,
          output: `${r.stdout ?? ''}${r.stderr ?? ''}`,
          files: readdirSync(dir).length,
          e: line === '{}\n' ? 'none' : m === null ? 'odd' : (JSON.parse(m[2] ?? 'null') as unknown)
        };
      }
      return {
        name: c.name,
        want: c.want,
        accepted: shared.usageAddress(decoded),
        decoded: typeof decoded === 'string' ? decoded : null,
        backslash: token === undefined ? null : token.includes('\\'),
        kept
      };
    });
    // 7. G12 (f): the command and the settings value, before and after a
    // service that holds an address, for the same script path.
    const settingsBefore = script.antigravitySettingsJson(path);
    const commandBefore = script.antigravityStatusCommand(path);
    const holding = await ask({ claude: false, codex: false, antigravity: true }, 'read');
    out['argv'] = {
      held: JSON.stringify(holding.snapshot).includes(PLANTED),
      settingsBefore,
      settingsAfter: script.antigravitySettingsJson(path),
      commandBefore,
      commandAfter: script.antigravityStatusCommand(path)
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
} catch (err) {
  out['error'] = err instanceof Error ? `${err.message}` : String(err);
}
process.stdout.write(`${JSON.stringify(out)}\n`);
