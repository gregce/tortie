/**
 * Nothing that could be a credential leaves this reader.
 *
 * These are not hypothetical inputs. Research 29 §2.6 found a live API key in
 * an `env` block in `~/.cursor/mcp.json` on the operator's machine, a provider
 * key in `~/.qwen/settings.json` and another in `~/.deepseek/config.toml`. A
 * regression here paints a working credential onto a screen that may be being
 * shared, so the assertions are about ABSENCE: the value is not in the result
 * anywhere, not merely hidden behind a flag.
 */

import { describe, expect, it } from 'vitest';
import { scanContext } from '../scan';
import { createMemoryContextFs } from '../port';
import { isSecretKey, MASK, maskArgs, maskInline, maskUrl } from '../secrets';

const HOME = '/home/t';
const ENV = { HOME } as Record<string, string>;
const LIVE_KEY = 'sk-proj-AbCdEf0123456789AbCdEf0123456789';

describe('isSecretKey', () => {
  it.each([
    'API_KEY',
    'apiKey',
    'GITHUB_TOKEN',
    'token',
    'DB_PASSWORD',
    'CLIENT_SECRET',
    'credentials',
    'AUTH'
  ])('treats %s as a credential', (key) => {
    expect(isSecretKey(key)).toBe(true);
  });

  it.each(['KEYBOARD', 'KEYMAP', 'NODE_PATH', 'HOME', 'PORT'])(
    'does not treat %s as a credential',
    (key) => {
      expect(isSecretKey(key)).toBe(false);
    }
  );
});

/**
 * The connection-string shapes, which are the ones that leaked.
 *
 * A password in a URL's userinfo is the CANONICAL way an MCP server is given a
 * database. The MCP quickstart's own example passes a Postgres connection
 * string as an argument to a stdio server, so it never reaches `payload.url`
 * and never went through `maskUrl`. All four of these rendered their password
 * in full until userinfo masking moved into `maskInline`.
 */
describe('URL userinfo, wherever it appears', () => {
  it.each([
    ['postgresql://admin:S3cretPass@db.internal:5432/app', 'S3cretPass'],
    ['mongodb+srv://user:P%40ssw0rd@cluster0.mongodb.net/', 'P%40ssw0rd'],
    ['https://svc:tok_abc123XYZ@api.vendor.com/sse', 'tok_abc123XYZ'],
    ['redis://default:AVerySecretPassword@redis.internal:6379', 'AVerySecretPassword']
  ])('hides the password in %s', (raw, secret) => {
    expect(maskInline(raw)).not.toContain(secret);
    expect(maskUrl(raw)).not.toContain(secret);
    expect(maskArgs(['--db', raw]).join(' ')).not.toContain(secret);
    expect(maskInline(`connect with ${raw} at boot`)).not.toContain(secret);
  });

  it('renders the mask readably rather than percent-encoded', () => {
    expect(maskUrl('https://user:pw@example.com/mcp')).toBe(
      `https://${MASK}@example.com/mcp`
    );
    expect(maskInline('https://user:pw@example.com/mcp')).toBe(
      `https://${MASK}@example.com/mcp`
    );
  });

  it('is idempotent, so a value masked twice is unchanged', () => {
    const once = maskInline('https://a:b@host/x');
    expect(maskInline(once)).toBe(once);
  });

  it('leaves a URL with no userinfo alone', () => {
    expect(maskInline('see https://example.com/docs')).toBe(
      'see https://example.com/docs'
    );
  });

  it('still masks a credential query parameter beside the userinfo', () => {
    expect(maskUrl('https://u:p@host/v1?api_key=abc123def')).toBe(
      `https://${MASK}@host/v1?api_key=${MASK}`
    );
  });
});

describe('masking free text', () => {
  it('hides a provider key wherever it appears', () => {
    expect(maskInline(`run --key ${LIVE_KEY} now`)).not.toContain(LIVE_KEY);
    expect(maskInline(`export GITHUB_TOKEN=ghp_0123456789abcdefghij`)).toBe(
      `export GITHUB_TOKEN=${MASK}`
    );
  });

  it('hides the value after a credential flag, in both spellings', () => {
    expect(maskArgs(['--api-key', LIVE_KEY, '--port', '8080'])).toEqual([
      '--api-key',
      MASK,
      '--port',
      '8080'
    ]);
    expect(maskArgs([`--token=${LIVE_KEY}`])).toEqual([`--token=${MASK}`]);
  });

  it('strips userinfo and credential query parameters from a URL', () => {
    expect(maskUrl('https://user:hunter2@example.com/mcp')).not.toContain('hunter2');
    expect(maskUrl(`https://example.com/mcp?api_key=${LIVE_KEY}&page=2`)).toContain('page=2');
    expect(maskUrl(`https://example.com/mcp?api_key=${LIVE_KEY}`)).not.toContain(LIVE_KEY);
  });
});

describe('the reader never returns an env value', () => {
  it('keeps the keys, drops the values, and counts what it hid', async () => {
    const result = await scanContext(
      { cwd: null, agent: 'cursor', categories: ['mcp'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${HOME}/.cursor/mcp.json`]: JSON.stringify({
              mcpServers: {
                ads: {
                  command: 'npx',
                  args: ['adwords-mcp'],
                  env: { DEVELOPER_TOKEN: LIVE_KEY, ACCOUNT_ID: 'acct-77341-not-secret' }
                }
              }
            })
          }
        })
      }
    );
    const [entry] = result.entries;
    expect(entry?.payload).toMatchObject({
      envKeys: ['ACCOUNT_ID', 'DEVELOPER_TOKEN'],
      hiddenValueCount: 2
    });
    // Every env value is absent, not merely hidden: an ordinary one goes too,
    // because the model has no field a value could sit in.
    expect(JSON.stringify(result)).not.toContain(LIVE_KEY);
    expect(JSON.stringify(result)).not.toContain('acct-77341-not-secret');
  });

  it('masks a key passed on the command line instead of in env', async () => {
    const result = await scanContext(
      { cwd: null, agent: 'cursor', categories: ['mcp'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${HOME}/.cursor/mcp.json`]: JSON.stringify({
              mcpServers: { s: { command: 'server', args: ['--api-key', LIVE_KEY] } }
            })
          }
        })
      }
    );
    expect(JSON.stringify(result)).not.toContain(LIVE_KEY);
    expect(result.entries[0]?.payload).toMatchObject({ args: ['--api-key', MASK] });
  });

  it('masks a token inside a hook command', async () => {
    const result = await scanContext(
      { cwd: null, agent: 'claude', categories: ['hook'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${HOME}/.claude/settings.json`]: JSON.stringify({
              hooks: {
                Stop: [
                  {
                    hooks: [
                      { type: 'command', command: `curl -H "Authorization: ${LIVE_KEY}" https://x` }
                    ]
                  }
                ]
              }
            })
          }
        })
      }
    );
    expect(JSON.stringify(result)).not.toContain(LIVE_KEY);
  });

  it('masks a provider key sitting in a TOML config next to the servers', async () => {
    const result = await scanContext(
      { cwd: null, agent: 'codex', categories: ['mcp'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${HOME}/.codex/config.toml`]:
              `api_key = "${LIVE_KEY}"\n\n[mcp_servers.docs]\ncommand = "docs"\nargs = []\n\n` +
              `[mcp_servers.docs.env]\nOPENAI_API_KEY = "${LIVE_KEY}"\n`
          }
        })
      }
    );
    expect(JSON.stringify(result)).not.toContain(LIVE_KEY);
    expect(result.entries[0]?.payload).toMatchObject({
      envKeys: ['OPENAI_API_KEY'],
      hiddenValueCount: 1
    });
  });
});
