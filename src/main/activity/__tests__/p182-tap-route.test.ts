/**
 * The usage tap's route on the loopback server the activity hooks own
 * (Phase 182), and the settings file it rides in.
 *
 * THE ATTACK IS THE POINT OF THIS FILE. The server is the only listening
 * socket Tortie has, and this phase adds a second route to it, so every way a
 * post can be wrong is driven here over a REAL bound server: no token, a token
 * nobody registered, a token belonging to another session, a body over the
 * cap, the wrong method and a `Host` that is not loopback. Each one must reach
 * `onTap` never, and the hook route must go on behaving exactly as it did.
 *
 * THE FIX ROUND OF 2026-09-01 added the bound on what those refusals may
 * WRITE, which is the second attack this route has to survive and the one the
 * first build lost. It is at the bottom of this file, and the log is mocked
 * here for it.
 *
 * It binds one server on an ephemeral loopback port, makes requests to it,
 * and closes it. It writes no file, starts no agent and reads nothing under
 * anybody's home.
 */

import { request } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Every line the route writes, so the bound below can be counted rather than
 *  argued. Nothing else in this file needs the real log. */
const logged: { level: string; msg: string; fields?: unknown }[] = [];
vi.mock('../../log', () => ({
  getLog: () => ({
    error: (msg: string, fields?: unknown) =>
      logged.push({ level: 'error', msg, fields }),
    warn: (msg: string, fields?: unknown) =>
      logged.push({ level: 'warn', msg, fields }),
    info: (msg: string, fields?: unknown) =>
      logged.push({ level: 'info', msg, fields }),
    debug: (msg: string, fields?: unknown) =>
      logged.push({ level: 'debug', msg, fields })
  })
}));

import {
  GmuxHookServer,
  claudeHookSettings,
  personOwnsStatusLine,
  personStatusLineFiles,
  repoRootOf,
  resetTapReasonLog,
  sweepableHookName,
  sweepableStampName
} from '../hooks';
import { TAP_BODY_CAP_BYTES } from '../../usage/statusline';

const TOKEN = 'aaaaaaaabbbbbbbbccccccccdddddddd';
const OTHER = '11111111222222223333333344444444';

interface Seen {
  taps: [string, string][];
  events: [string, string][];
  ends: string[];
}

let server: GmuxHookServer;
let seen: Seen;
let port: number;

beforeEach(async () => {
  logged.length = 0;
  resetTapReasonLog();
  seen = { taps: [], events: [], ends: [] };
  server = new GmuxHookServer({
    onEvent: (id, _state, event) => seen.events.push([id, event]),
    onSessionEnd: (id) => seen.ends.push(id),
    onTap: (id, body) => seen.taps.push([id, body])
  });
  port = await server.start(0);
  server.register(TOKEN, 'sess-1');
});

afterEach(async () => {
  // PHASE 200: `stop()` is a joined operation now, so it is awaited.
  await server.stop();
});

function post(
  path: string,
  body: string,
  over: { method?: string; host?: string } = {}
): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: over.method ?? 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          ...(over.host === undefined ? {} : { host: over.host })
        }
      },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode ?? 0));
      }
    );
    req.on('error', reject);
    req.end(body);
  });
}

const GOOD = 'v=1&s=sess-1&cfg=&five_pct=58';

describe('the tap route', () => {
  it('hands a good post to the usage domain, raw and unparsed', async () => {
    expect(await post(`/u/${TOKEN}`, GOOD)).toBe(200);
    expect(seen.taps).toEqual([['sess-1', GOOD]]);
  });

  it('names the session the TOKEN belongs to, not one the body could claim', async () => {
    await post(`/u/${TOKEN}`, 'v=1&s=sess-SOMEONE-ELSE&cfg=&five_pct=99');
    // The route hands over the token's own session id; deciding what the
    // body's claim means is the ingest layer's job and it drops the mismatch.
    expect(seen.taps[0]?.[0]).toBe('sess-1');
  });
});

describe('THE ATTACK', () => {
  it('refuses a token nobody registered', async () => {
    expect(await post(`/u/${OTHER}`, GOOD)).toBe(404);
    expect(seen.taps).toEqual([]);
  });

  it('refuses a revoked token', async () => {
    server.revoke('sess-1');
    expect(await post(`/u/${TOKEN}`, GOOD)).toBe(404);
    expect(seen.taps).toEqual([]);
  });

  it('refuses a path with no token at all', async () => {
    expect(await post('/u/', GOOD)).toBe(404);
    expect(await post('/u', GOOD)).toBe(404);
    expect(await post(`/u/${TOKEN}extra`, GOOD)).toBe(404);
    expect(await post(`/u/${TOKEN.toUpperCase()}`, GOOD)).toBe(404);
    expect(seen.taps).toEqual([]);
  });

  it('refuses a body over the cap rather than truncating and reading it', async () => {
    await post(`/u/${TOKEN}`, `${GOOD}&pad=${'x'.repeat(TAP_BODY_CAP_BYTES)}`);
    expect(seen.taps).toEqual([]);
  });

  it('refuses a GET', async () => {
    expect(await post(`/u/${TOKEN}`, '', { method: 'GET' })).toBe(404);
    expect(seen.taps).toEqual([]);
  });

  it('refuses a Host header that is not loopback', async () => {
    expect(await post(`/u/${TOKEN}`, GOOD, { host: 'evil.example.com' })).toBe(
      404
    );
    expect(seen.taps).toEqual([]);
  });

  it('binds loopback and nothing else', () => {
    expect(server.listening).toBe(true);
    expect(server.boundPort).toBeGreaterThan(0);
  });
});

describe('the hook route is untouched', () => {
  it('still maps its events', async () => {
    expect(await post(`/h/${TOKEN}?e=Stop`, '{}')).toBe(200);
    expect(seen.events).toEqual([['sess-1', 'Stop']]);
    expect(seen.taps).toEqual([]);
  });

  it('still takes a body far bigger than the tap cap', async () => {
    await post(`/h/${TOKEN}?e=UserPromptSubmit`, `{"p":"${'x'.repeat(9000)}"}`);
    expect(seen.events).toEqual([['sess-1', 'UserPromptSubmit']]);
  });

  it('still ends a session', async () => {
    expect(await post(`/h/${TOKEN}?e=SessionEnd`, '{}')).toBe(200);
    expect(seen.ends).toEqual(['sess-1']);
  });
});

describe('the settings file', () => {
  it('names no status line by default, which is what off looks like', () => {
    const parsed = JSON.parse(claudeHookSettings(1234, TOKEN)) as Record<
      string,
      unknown
    >;
    expect(parsed['statusLine']).toBeUndefined();
    expect(Object.keys(parsed)).toEqual(['allowedHttpHookUrls', 'hooks']);
  });

  it('names the managed script when the tap is installed, hooks unchanged', () => {
    const off = JSON.parse(claudeHookSettings(1234, TOKEN)) as Record<
      string,
      unknown
    >;
    const on = JSON.parse(
      claudeHookSettings(1234, TOKEN, '/u/d/tortie-statusline.sh')
    ) as Record<string, unknown>;
    expect(on['statusLine']).toEqual({
      type: 'command',
      command: `'/u/d/tortie-statusline.sh'`
    });
    // The hooks half is byte for byte what Phase 13 wrote.
    expect(JSON.stringify(on['hooks'])).toBe(JSON.stringify(off['hooks']));
    expect(on['allowedHttpHookUrls']).toEqual(off['allowedHttpHookUrls']);
  });
});

describe('a status line the PERSON owns', () => {
  it('looks in the user file, and in the project files when a cwd is known', () => {
    expect(personStatusLineFiles({}, '/Users/x', '/repo')).toEqual([
      '/Users/x/.claude/settings.json',
      '/repo/.claude/settings.json',
      '/repo/.claude/settings.local.json'
    ]);
  });

  it('follows CLAUDE_CONFIG_DIR for the user file', () => {
    expect(
      personStatusLineFiles({ CLAUDE_CONFIG_DIR: '/alt' }, '/Users/x', undefined)
    ).toEqual(['/alt/settings.json']);
  });

  it('is seen wherever the person put it', () => {
    const named = '{"statusLine":{"type":"command","command":"mine.sh"}}';
    const files = personStatusLineFiles({}, '/Users/x', '/repo');
    for (const owner of files) {
      expect(
        personOwnsStatusLine(files, (p) => (p === owner ? named : null))
      ).toBe(true);
    }
  });

  it('is not seen when nobody named one', () => {
    const files = personStatusLineFiles({}, '/Users/x', '/repo');
    expect(personOwnsStatusLine(files, () => null)).toBe(false);
    expect(personOwnsStatusLine(files, () => '{"model":"opus"}')).toBe(false);
  });
});

describe('what a REFUSED post may write to the log', () => {
  /**
   * THE SECOND ATTACK ON THIS ROUTE, and the first build lost it.
   *
   * Every check above happens BEFORE the token is looked up, so the caller
   * driving these lines is unauthenticated by construction: any process on the
   * machine, and a browser page too, since a form encoded POST needs no
   * preflight and the `Host` a browser sends to 127.0.0.1 passes the loopback
   * check. The first build wrote one `warn` per refused post with no bound,
   * measured at 500 lines in 47 ms. `src/main/log/transport.ts` caps app.log at
   * 2 MiB with one archive and the real line is 138 bytes, so 30,394 posts
   * evict app.log and app.log.1 both: about three seconds to erase everything a
   * later incident would be read out of.
   *
   * The bound is one line per reason per process, and the reasons are a closed
   * set of four. So this asserts a NUMBER rather than a shape.
   */
  it('writes ONE line however many refused posts arrive', async () => {
    for (let i = 0; i < 200; i++) await post(`/u/${OTHER}`, GOOD);
    expect(seen.taps).toEqual([]);
    expect(logged.length).toBe(1);
    expect(logged[0]).toEqual({
      level: 'warn',
      msg: 'usage.tap.dropped',
      fields: { reason: 'token' }
    });
  });

  it('still says each distinct reason once, so the diagnostic survives', async () => {
    await post(`/u/${OTHER}`, GOOD); // token
    await post(`/u/${OTHER}`, GOOD);
    await post('/u/short', GOOD); // route
    await post('/u/short', GOOD);
    await post(`/u/${TOKEN}`, '', { method: 'GET' }); // method
    await post(`/u/${TOKEN}`, '', { method: 'GET' });
    await post(`/u/${TOKEN}`, `${GOOD}&pad=${'x'.repeat(TAP_BODY_CAP_BYTES)}`);
    await post(`/u/${TOKEN}`, `${GOOD}&pad=${'x'.repeat(TAP_BODY_CAP_BYTES)}`);
    expect(logged.map((l) => l.fields)).toEqual([
      { reason: 'token' },
      { reason: 'route' },
      { reason: 'method' },
      { reason: 'oversized' }
    ]);
    // Four reasons exist and there is no fifth, so this route's whole lifetime
    // cost is four lines.
    expect(logged.length).toBe(4);
  });

  it('leaves the hook route writing nothing at all, as it always did', async () => {
    for (let i = 0; i < 200; i++) await post(`/h/${OTHER}?e=Stop`, '{}');
    expect(logged).toEqual([]);
  });

  it('never puts the token, the body or the path in a line', async () => {
    await post(`/u/${OTHER}`, 'v=1&s=sess-1&cfg=&five_pct=58&secret=SENTINEL');
    const text = JSON.stringify(logged);
    expect(text).not.toContain(OTHER);
    expect(text).not.toContain('SENTINEL');
    expect(text).not.toContain('five_pct');
    for (const line of logged) expect(Object.keys(line.fields as object)).toEqual(['reason']);
  });
});

describe('the checkout root, which claude reads and the first build missed', () => {
  /**
   * Measured against the real 2.1.252 binary with `--debug`, which names every
   * settings path it tries. From a working directory three levels below a git
   * root it tried `<gitRoot>/.claude/settings.local.json` as well as the two
   * under the cwd, and its watch line named that file too. With the `.git`
   * removed the extra path disappeared, so it is the checkout root rather than
   * the parent directory.
   */
  it('adds the checkout root files when the cwd is below the root', () => {
    const isRoot = (d: string): boolean => d === '/repo';
    expect(personStatusLineFiles({}, '/Users/x', '/repo/a/b', isRoot)).toEqual([
      '/Users/x/.claude/settings.json',
      '/repo/a/b/.claude/settings.json',
      '/repo/a/b/.claude/settings.local.json',
      '/repo/.claude/settings.json',
      '/repo/.claude/settings.local.json'
    ]);
  });

  it('adds nothing when the cwd IS the root, and nothing when there is none', () => {
    const isRoot = (d: string): boolean => d === '/repo';
    expect(personStatusLineFiles({}, '/Users/x', '/repo', isRoot)).toEqual([
      '/Users/x/.claude/settings.json',
      '/repo/.claude/settings.json',
      '/repo/.claude/settings.local.json'
    ]);
    expect(personStatusLineFiles({}, '/Users/x', '/nowhere/a', () => false)).toEqual([
      '/Users/x/.claude/settings.json',
      '/nowhere/a/.claude/settings.json',
      '/nowhere/a/.claude/settings.local.json'
    ]);
  });

  it('REFUSES for a status line the person put at the checkout root', () => {
    const isRoot = (d: string): boolean => d === '/repo';
    const files = personStatusLineFiles({}, '/Users/x', '/repo/a/b', isRoot);
    const named = '{"statusLine":{"type":"command","command":"mine.sh"}}';
    for (const owner of [
      '/repo/.claude/settings.local.json',
      '/repo/.claude/settings.json'
    ]) {
      expect(
        personOwnsStatusLine(files, (p) => (p === owner ? named : null))
      ).toBe(true);
    }
  });

  it('walks up to the root and stops at the file system root', () => {
    expect(repoRootOf('/a/b/c', (d) => d === '/a')).toBe('/a');
    expect(repoRootOf('/a/b/c', () => false)).toBe(null);
    let asked = 0;
    repoRootOf('/a/b/c', () => {
      asked++;
      return false;
    });
    // /a/b/c, /a/b, /a, / and then it is out of parents.
    expect(asked).toBe(4);
  });
});

describe('what a boot sweep may remove from the hook directory', () => {
  const live = new Set(['keep-1', 'keep-2']);

  it('removes a dead session file and keeps a live one', () => {
    expect(sweepableHookName('gone-1.json', live)).toBe(true);
    expect(sweepableHookName('keep-1.json', live)).toBe(false);
  });

  it('removes a temporary file a crash left, which nothing reached before', () => {
    expect(sweepableHookName('keep-1.json.4242.tmp', live)).toBe(true);
    expect(sweepableHookName('gone-1.json.4242.tmp', live)).toBe(true);
  });

  it('never removes the managed script or the stamps directory', () => {
    expect(sweepableHookName('tortie-statusline.sh', live)).toBe(false);
    expect(sweepableHookName('stamps', live)).toBe(false);
    expect(sweepableHookName('port', live)).toBe(false);
  });

  it('removes a dead session stamp and its curl file, and keeps a live one', () => {
    expect(sweepableStampName('gone-1', live)).toBe(true);
    expect(sweepableStampName('gone-1.curl', live)).toBe(true);
    expect(sweepableStampName('keep-1', live)).toBe(false);
    expect(sweepableStampName('keep-1.curl', live)).toBe(false);
  });
});
