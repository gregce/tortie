/**
 * The source layer: the reads that happen before anything is installed.
 *
 * Every test injects its own `fetch`, so nothing here touches the network. What
 * is being checked is the shape of the request Tortie makes and the honesty of
 * what it does with the answer, because both endpoints are third-party and both
 * feed a control that decides whether someone else's code runs.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../resolve', () => ({
  skillsEnv: vi.fn(async () => ({ PATH: '/usr/bin' }) as NodeJS.ProcessEnv)
}));

import { auditSkills, pickSkillFile, previewSkill, searchSkills } from '../sources';

interface Call {
  url: string;
  headers: Record<string, string>;
}

function fakeFetch(
  answers: Record<string, { status?: number; body: string }>,
  calls: Call[] = []
): typeof fetch {
  return (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const match = Object.keys(answers).find((key) => url.startsWith(key));
    const answer = match === undefined ? null : answers[match];
    if (answer === undefined || answer === null) {
      return { ok: false, status: 404, text: async () => 'not found' } as Response;
    }
    const status = answer.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => answer.body
    } as Response;
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('search', () => {
  it('asks skills.sh/api/search with the query and a limit', async () => {
    const calls: Call[] = [];
    const answer = await searchSkills(
      'postgres',
      { limit: 2 },
      {
        fetchImpl: fakeFetch(
          {
            'https://skills.sh/api/search': {
              body: JSON.stringify({
                query: 'postgres',
                count: 1,
                skills: [
                  {
                    id: 'a',
                    name: 'supabase-postgres-best-practices',
                    source: 'supabase/agent-skills',
                    installs: 343376
                  }
                ]
              })
            }
          },
          calls
        )
      }
    );
    expect(calls[0]?.url).toContain('https://skills.sh/api/search?q=postgres');
    expect(calls[0]?.url).toContain('limit=2');
    expect(answer.hits).toEqual([
      {
        id: 'a',
        name: 'supabase-postgres-best-practices',
        source: 'supabase/agent-skills',
        installs: 343376
      }
    ]);
    expect(answer.problem).toBeNull();
  });

  it('drops a row whose source is not an owner/repo', async () => {
    const answer = await searchSkills(
      'x',
      {},
      {
        fetchImpl: fakeFetch({
          'https://skills.sh/api/search': {
            body: JSON.stringify({
              skills: [
                { id: 'a', name: 'ok', source: 'o/r' },
                { id: 'b', name: 'bad', source: '../../etc' },
                { id: 'c', name: 'worse', source: 'https://evil/x' }
              ]
            })
          }
        })
      }
    );
    expect(answer.hits.map((h) => h.name)).toEqual(['ok']);
  });

  it('reports a shape it does not recognise rather than an empty list', async () => {
    const answer = await searchSkills(
      'x',
      {},
      {
        fetchImpl: fakeFetch({
          'https://skills.sh/api/search': { body: '"not an object"' }
        })
      }
    );
    expect(answer.hits).toEqual([]);
    expect(answer.problem).toContain('shape Tortie does not recognise');
  });

  it('names the endpoint when it cannot be reached', async () => {
    const answer = await searchSkills(
      'x',
      {},
      {
        fetchImpl: (async () => {
          throw new Error('offline');
        }) as unknown as typeof fetch
      }
    );
    expect(answer.problem).toContain('https://skills.sh/api/search');
    expect(answer.problem).toContain('offline');
  });
});

describe('the audit', () => {
  it('asks for one source and the named skills', async () => {
    const calls: Call[] = [];
    const answer = await auditSkills(
      'supabase/agent-skills',
      ['a', 'b'],
      {
        fetchImpl: fakeFetch(
          {
            'https://add-skill.vercel.sh/audit': {
              body: JSON.stringify({
                a: {
                  socket: { risk: 'safe', alerts: 0, score: 90, analyzedAt: '2026-04-16' },
                  snyk: { risk: 'low' }
                }
              })
            }
          },
          calls
        )
      }
    );
    expect(calls[0]?.url).toContain('source=supabase%2Fagent-skills');
    expect(calls[0]?.url).toContain('skills=a%2Cb');
    expect(answer.records['a']?.['socket']).toEqual({
      risk: 'safe',
      alerts: 0,
      score: 90,
      analyzedAt: '2026-04-16'
    });
  });

  /**
   * An absent scanner must never render as safe. 36.82 per cent of 3,984
   * scanned skills carried a flaw, so silence is not evidence of anything.
   */
  it('leaves an unscanned skill absent rather than inventing a verdict', async () => {
    const answer = await auditSkills('o/r', ['nobody-looked'], {
      fetchImpl: fakeFetch({
        'https://add-skill.vercel.sh/audit': { body: '{}' }
      })
    });
    expect(answer.records['nobody-looked']).toBeUndefined();
    expect(answer.problem).toBeNull();
  });

  it('refuses a source that is not an owner/repo', async () => {
    const answer = await auditSkills('/etc/passwd', [], {});
    expect(answer.problem).toContain('owner/repo');
  });
});

describe('picking the SKILL.md out of a tree', () => {
  const tree = [
    { path: 'README.md', type: 'blob' },
    { path: 'skills/find-skills/SKILL.md', type: 'blob' },
    { path: 'skills/find-skills/scripts/run.sh', type: 'blob' },
    { path: 'examples/find-skills/SKILL.md', type: 'blob' },
    { path: 'skills/other/SKILL.md', type: 'blob' },
    { path: 'skills', type: 'tree' }
  ];

  it('takes the file whose parent directory is the skill name', () => {
    expect(pickSkillFile(tree, 'other')).toBe('skills/other/SKILL.md');
  });

  it('prefers the shallowest copy when a name appears twice', () => {
    expect(pickSkillFile(tree, 'find-skills')).toBe('skills/find-skills/SKILL.md');
  });

  it('returns null when there is no SKILL.md at all', () => {
    expect(pickSkillFile([{ path: 'README.md', type: 'blob' }], 'x')).toBeNull();
  });
});

describe('reading a skill before installing it', () => {
  const tree = JSON.stringify({
    tree: [
      { path: 'skills/demo/SKILL.md', type: 'blob' },
      { path: 'skills/demo/scripts/setup.sh', type: 'blob' },
      { path: 'skills/demo/references/x.md', type: 'blob' }
    ]
  });

  it('returns the body, the files and the resolved commit', async () => {
    const answer = await previewSkill('o/r', 'demo', {
      fetchImpl: fakeFetch({
        'https://api.github.com/repos/o/r/git/trees/HEAD': { body: tree },
        'https://raw.githubusercontent.com/o/r/HEAD/skills/demo/SKILL.md': {
          body: '---\nname: demo\n---\nHello.'
        },
        'https://api.github.com/repos/o/r/commits/HEAD': {
          body: JSON.stringify({ sha: 'abc123' })
        }
      })
    });
    expect(answer.problem).toBeNull();
    expect(answer.body).toContain('Hello.');
    expect(answer.path).toBe('skills/demo/SKILL.md');
    expect(answer.commit).toBe('abc123');
    expect(answer.files).toEqual(['SKILL.md', 'scripts/setup.sh', 'references/x.md']);
    expect(answer.scriptCount).toBe(1);
  });

  /**
   * The install gate turns "could not read it" into a REFUSAL. Tortie does not
   * install what it has not read, so every one of these has to come back with a
   * sentence and a null body rather than with an empty success.
   */
  it('says so when the source is not an owner/repo', async () => {
    const answer = await previewSkill('/tmp/local-dir', 'demo', {});
    expect(answer.body).toBeNull();
    expect(answer.problem).toContain('owner/repo on GitHub');
  });

  it('says so when the tree cannot be listed', async () => {
    const answer = await previewSkill('o/r', 'demo', {
      fetchImpl: fakeFetch({
        'https://api.github.com/repos/o/r/git/trees/HEAD': {
          status: 403,
          body: 'rate limited'
        }
      })
    });
    expect(answer.body).toBeNull();
    expect(answer.problem).toContain('could not list o/r');
  });

  it('says so when the repository has no SKILL.md for that name', async () => {
    const answer = await previewSkill('o/r', 'missing', {
      fetchImpl: fakeFetch({
        'https://api.github.com/repos/o/r/git/trees/HEAD': {
          body: JSON.stringify({ tree: [] })
        }
      })
    });
    expect(answer.body).toBeNull();
    expect(answer.problem).toContain('did not find a SKILL.md');
  });

  it('still previews when only the commit could not be resolved', async () => {
    const answer = await previewSkill('o/r', 'demo', {
      fetchImpl: fakeFetch({
        'https://api.github.com/repos/o/r/git/trees/HEAD': { body: tree },
        'https://raw.githubusercontent.com/o/r/HEAD/skills/demo/SKILL.md': {
          body: 'Hello.'
        }
      })
    });
    expect(answer.body).toBe('Hello.');
    expect(answer.commit).toBeNull();
    expect(answer.problem).toBeNull();
  });

  it('stops rather than buffering an answer beyond its cap', async () => {
    const huge = 'x'.repeat(600 * 1024);
    const answer = await previewSkill('o/r', 'demo', {
      fetchImpl: fakeFetch({
        'https://api.github.com/repos/o/r/git/trees/HEAD': { body: tree },
        'https://raw.githubusercontent.com/o/r/HEAD/skills/demo/SKILL.md': {
          body: huge
        }
      })
    });
    expect(answer.body).toBeNull();
    expect(answer.problem).toContain('stopped reading');
  });
});
