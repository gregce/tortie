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
 * It binds one server on an ephemeral loopback port, makes requests to it,
 * and closes it. It writes no file, starts no agent and reads nothing under
 * anybody's home.
 */

import { request } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  GmuxHookServer,
  claudeHookSettings,
  personOwnsStatusLine,
  personStatusLineFiles
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
  seen = { taps: [], events: [], ends: [] };
  server = new GmuxHookServer({
    onEvent: (id, _state, event) => seen.events.push([id, event]),
    onSessionEnd: (id) => seen.ends.push(id),
    onTap: (id, body) => seen.taps.push([id, body])
  });
  port = await server.start(0);
  server.register(TOKEN, 'sess-1');
});

afterEach(() => {
  server.stop();
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
