/**
 * Phase 73 — the pure half of connected-only harvest.
 *
 * It is pure, so it is tested exhaustively. Every case here is a decision the
 * live half is not allowed to make for itself: which directories are asked for,
 * which lines of a listing are candidates, what the first bytes of a record
 * say, and which candidate wins with how strong a claim.
 *
 * WHAT THIS FILE CANNOT SHOW. It sends nothing to any machine, so it cannot
 * show that a real machine answers, that a listing of a real store parses, or
 * that a real muse record carries the pane Tortie expects. `build/probe-remote-harvest.mjs`
 * drives all three against a scratch sign in server, and the new steps of
 * `GMUX_SMOKE=remote-sessions` drive them again in a real Electron process
 * against a real manifest.
 */

import { describe, expect, it } from 'vitest';
import {
  confirmRemoteCandidate,
  decideRemoteHarvest,
  parseMachineFacts,
  parseRemoteListing,
  remoteHarvestKey,
  remoteHarvestRoots,
  remoteHarvestsId,
  remoteKeyConfidence,
  rootOfRemotePath,
  REMOTE_HARVEST_AGENTS,
  type RemoteCandidate,
  type RemoteConfirmVerdict,
  type RemoteHarvestFacts
} from '../remote';

const FACTS: RemoteHarvestFacts = {
  home: '/home/greg',
  env: {},
  platform: 'Linux'
};

/** A listing line, composed the way the far side prints one. */
function line(seconds: number, bytes: number, path: string): string {
  return `${String(seconds)} ${String(bytes)} ${path}`;
}

describe('parseMachineFacts', () => {
  it('reads the four names the script prints', () => {
    const facts = parseMachineFacts(
      'home=/home/greg\ncodex_home=/home/greg/.codex\nxdg_data_home=/home/greg/.local/share\nuname=Linux'
    );
    expect(facts).toEqual({
      home: '/home/greg',
      env: {
        CODEX_HOME: '/home/greg/.codex',
        XDG_DATA_HOME: '/home/greg/.local/share'
      },
      platform: 'Linux'
    });
  });

  it('drops an empty value rather than storing it', () => {
    // An empty CODEX_HOME has to fall back to $HOME/.codex. A stored empty
    // string would compose "/sessions", which is a directory on the far side's
    // root that nobody's agent writes to.
    const facts = parseMachineFacts('home=/home/greg\ncodex_home=\nuname=Darwin');
    expect(facts?.env).toEqual({});
  });

  it('refuses an answer with no usable home', () => {
    expect(parseMachineFacts('uname=Linux')).toBeNull();
    expect(parseMachineFacts('home=not-absolute')).toBeNull();
    expect(parseMachineFacts('')).toBeNull();
  });

  it('ignores a line a login file printed', () => {
    const facts = parseMachineFacts(
      'MOTD=welcome to the box\nhome=/home/greg\nuname=Linux'
    );
    expect(facts?.home).toBe('/home/greg');
    expect(facts?.env).toEqual({});
  });
});

describe('which agents a connection may ask about', () => {
  it('names four, and they are the four whose record carries its own owner', () => {
    expect([...REMOTE_HARVEST_AGENTS].sort()).toEqual([
      'codex',
      'deepseek',
      'muse',
      'pi'
    ]);
  });

  it('refuses qwen and antigravity, whose keys need the far side process table', () => {
    expect(remoteHarvestsId('qwen')).toBe(false);
    expect(remoteHarvestsId('antigravity')).toBe(false);
    expect(remoteHarvestRoots('qwen', '/work', FACTS)).toBeNull();
    expect(remoteHarvestRoots('antigravity', '/work', FACTS)).toBeNull();
  });

  it('refuses an agent that pre-assigns its id', () => {
    expect(remoteHarvestsId('claude')).toBe(false);
    expect(remoteHarvestRoots('claude', '/work', FACTS)).toBeNull();
  });
});

describe('remoteKeyConfidence — the rule behind the one armed agent', () => {
  it('keeps exact only for a key that is a true identity', () => {
    expect(remoteHarvestKey('muse')).toBe('tmux-pane');
    expect(remoteKeyConfidence('muse')).toBe('exact');
  });

  it('drops a folder key to weak, whatever it is worth locally', () => {
    // codex's own descriptor rates cwd-newest as 'exact', because the local
    // watcher is bounded by a spawn instant it observed. Nothing observed a
    // spawn here.
    expect(remoteHarvestKey('codex')).toBe('cwd-newest');
    expect(remoteKeyConfidence('codex')).toBe('weak');
    expect(remoteKeyConfidence('deepseek')).toBe('weak');
    expect(remoteKeyConfidence('pi')).toBe('weak');
  });
});

describe('remoteHarvestRoots', () => {
  it('builds codex roots from the far side own home', () => {
    const plan = remoteHarvestRoots('codex', '/work/proj', FACTS);
    expect(plan?.roots).toEqual([
      '/home/greg/.codex/sessions',
      '/home/greg/.codex/archived_sessions'
    ]);
    expect(plan?.maxDepth).toBe(4);
  });

  it('honours the far side own CODEX_HOME', () => {
    const plan = remoteHarvestRoots('codex', '/work/proj', {
      ...FACTS,
      env: { CODEX_HOME: '/srv/codex' }
    });
    expect(plan?.roots[0]).toBe('/srv/codex/sessions');
  });

  it('honours the far side own XDG_DATA_HOME for muse', () => {
    expect(remoteHarvestRoots('muse', '/work', FACTS)?.roots).toEqual([
      '/home/greg/.local/share/muse/sessions'
    ]);
    expect(
      remoteHarvestRoots('muse', '/work', {
        ...FACTS,
        env: { XDG_DATA_HOME: '/data' }
      })?.roots
    ).toEqual(['/data/muse/sessions']);
  });

  it('keys pi on the folder ON THAT MACHINE', () => {
    const plan = remoteHarvestRoots('pi', '/work/proj', FACTS);
    expect(plan?.roots).toEqual([
      '/home/greg/.pi/agent/sessions/--work-proj--'
    ]);
    expect(plan?.maxDepth).toBe(0);
  });

  it('gives deepseek both of its roots', () => {
    expect(remoteHarvestRoots('deepseek', '/work', FACTS)?.roots).toEqual([
      '/home/greg/.codewhale/sessions',
      '/home/greg/.deepseek/sessions'
    ]);
  });
});

describe('parseRemoteListing', () => {
  const root = '/home/greg/.codex/sessions/2026/08/18';
  const uuid = '11111111-2222-4333-8444-555555555555';
  const rollout = `${root}/rollout-2026-08-18T09-00-00-${uuid}.jsonl`;

  it('turns a line into a candidate with the descriptor own identify', () => {
    const at = Date.UTC(2026, 7, 18, 9, 0, 0);
    const [candidate] = parseRemoteListing(
      'codex',
      [line(Math.floor(at / 1000), 4096, rollout)],
      at - 1000
    );
    expect(candidate?.sessionId).toBe(uuid);
    expect(candidate?.bytes).toBe(4096);
    expect(candidate?.path).toBe(rollout);
  });

  it('drops a path the descriptor does not recognise, and the empty word', () => {
    expect(
      parseRemoteListing(
        'codex',
        [line(1, 1, `${root}/notes.txt`), 'none', '', 'garbage'],
        0
      )
    ).toEqual([]);
  });

  it('keeps a path that holds a space', () => {
    const spaced = `/home/greg/my store/.codex/sessions/rollout-2026-08-18T09-00-00-${uuid}.jsonl`;
    const [candidate] = parseRemoteListing('codex', [line(2, 3, spaced)], 0);
    expect(candidate?.path).toBe(spaced);
  });

  it('drops a record whose name and write time are both before the floor', () => {
    const old =
      `${root}/rollout-2020-01-01T09-00-00-${uuid}.jsonl`;
    const at = Date.UTC(2020, 0, 1);
    expect(
      parseRemoteListing('codex', [line(Math.floor(at / 1000), 10, old)], Date.now())
    ).toEqual([]);
  });

  it('lets the file own write time re-admit a record whose name is older', () => {
    // The filename instant is 2026-08-18T09:00 local. A write time of now is
    // enough on its own for codex, because a filename time can lag the write.
    const now = Date.now();
    const kept = parseRemoteListing(
      'codex',
      [line(Math.floor(now / 1000), 10, rollout)],
      now - 1000
    );
    expect(kept).toHaveLength(1);
  });

  it('lets pi filename instant settle the question on its own', () => {
    // pi's filename instant IS the session start. A resume rewrites the file's
    // mtime, so a months old conversation would otherwise look like it started
    // with this session, and being the earliest candidate it would win.
    const old = '/home/greg/.pi/agent/sessions/--work--/2026-01-01T00-00-00-000Z_11111111-2222-4333-8444-555555555555.jsonl';
    const now = Date.now();
    expect(
      parseRemoteListing('pi', [line(Math.floor(now / 1000), 10, old)], now - 1000)
    ).toEqual([]);
  });

  it('keeps one candidate per conversation id, newest path first', () => {
    const archived = `/home/greg/.codex/archived_sessions/rollout-2026-08-18T09-00-00-${uuid}.jsonl`;
    const rows = parseRemoteListing(
      'codex',
      [line(100, 1, rollout), line(200, 2, archived)],
      0
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.path).toBe(archived);
  });
});

describe('confirmRemoteCandidate', () => {
  it('matches a muse record on the pane the far side own list reported', () => {
    const head = [
      JSON.stringify({ payload_type: 'session.open' }),
      JSON.stringify({
        payload_type: 'runtime.session.route_facts',
        payload: { record: { tmux_pane: '$4:@4.%5' } }
      })
    ].join('\n');
    expect(
      confirmRemoteCandidate('muse', head, { cwd: '/work', remotePaneKey: '$4' })
    ).toBe('match');
    expect(
      confirmRemoteCandidate('muse', head, { cwd: '/work', remotePaneKey: '$40' })
    ).toBe('mismatch');
  });

  it('refuses to fall back to a folder for muse', () => {
    // A folder match wearing an identity key would record 'exact' for evidence
    // that is worth 'weak'. That is the one mistake this rung is arranged to
    // avoid, so the answer is unknown and no claim is made at all.
    const head = JSON.stringify({
      payload_type: 'runtime.session.route_facts',
      payload: { record: { workspace_root: '/work', pid: 1234 } }
    });
    expect(
      confirmRemoteCandidate('muse', head, { cwd: '/work', remotePaneKey: '$4' })
    ).toBe('unknown');
  });

  it('answers unknown for muse when no pane was reported', () => {
    const head = JSON.stringify({
      payload_type: 'runtime.session.route_facts',
      payload: { record: { tmux_pane: '$4:@4.%5' } }
    });
    expect(confirmRemoteCandidate('muse', head, { cwd: '/work' })).toBe('unknown');
  });

  it('matches codex on the folder in line 1', () => {
    const head = JSON.stringify({ payload: { cwd: '/work/proj' } });
    expect(confirmRemoteCandidate('codex', head, { cwd: '/work/proj' })).toBe('match');
    expect(confirmRemoteCandidate('codex', head, { cwd: '/other' })).toBe('mismatch');
  });

  it('matches deepseek on metadata.workspace', () => {
    const head = JSON.stringify({ metadata: { workspace: '/work/proj' } });
    expect(confirmRemoteCandidate('deepseek', head, { cwd: '/work/proj' })).toBe(
      'match'
    );
  });

  it('matches pi only on a line that says it is a session', () => {
    expect(
      confirmRemoteCandidate('pi', JSON.stringify({ type: 'session', cwd: '/w' }), {
        cwd: '/w'
      })
    ).toBe('match');
    expect(
      confirmRemoteCandidate('pi', JSON.stringify({ type: 'turn', cwd: '/w' }), {
        cwd: '/w'
      })
    ).toBe('unknown');
  });

  it('answers unknown for bytes that were cut short', () => {
    expect(confirmRemoteCandidate('codex', '{"payload":{"cwd":"/wo', { cwd: '/wo' })).toBe(
      'unknown'
    );
    expect(confirmRemoteCandidate('deepseek', '{"metadata":{"wor', { cwd: '/w' })).toBe(
      'unknown'
    );
  });

  it('answers unknown for every agent nobody measured', () => {
    // The default arm is the safety property. An agent added to the table later
    // cannot produce a match, so it cannot produce a claim.
    const head = JSON.stringify({ payload: { cwd: '/work' } });
    for (const agent of ['qwen', 'antigravity', 'claude', 'gemini'] as const) {
      expect(confirmRemoteCandidate(agent, head, { cwd: '/work' })).toBe('unknown');
    }
  });
});

describe('decideRemoteHarvest', () => {
  const make = (path: string, orderTs: number): RemoteCandidate => ({
    path,
    mtimeMs: orderTs,
    bytes: 10,
    sessionId: path.slice(-4),
    orderTs
  });

  const verdicts = (
    entries: [string, RemoteConfirmVerdict][]
  ): Map<string, RemoteConfirmVerdict> => new Map(entries);

  it('gives muse a confirmed claim rated exact', () => {
    const a = make('/store/aaaa', 100);
    const winner = decideRemoteHarvest('muse', [a], verdicts([[a.path, 'match']]));
    expect(winner?.key).toBe('tmux-pane');
    expect(winner?.keyConfidence).toBe('exact');
    expect(winner?.strength).toBe('confirmed');
    expect(winner?.rivals).toBe(1);
  });

  it('gives codex a matched claim rated weak, even with one candidate', () => {
    const a = make('/store/aaaa', 100);
    const winner = decideRemoteHarvest('codex', [a], verdicts([[a.path, 'match']]));
    expect(winner?.strength).toBe('matched');
    expect(winner?.keyConfidence).toBe('weak');
  });

  it('picks the earliest match and counts everything not ruled out', () => {
    const a = make('/store/aaaa', 300);
    const b = make('/store/bbbb', 100);
    const c = make('/store/cccc', 200);
    const winner = decideRemoteHarvest(
      'codex',
      [a, b, c],
      verdicts([
        [a.path, 'match'],
        [b.path, 'match'],
        [c.path, 'unknown']
      ])
    );
    expect(winner?.candidate.path).toBe('/store/bbbb');
    // Three were in play. An unclassified record could equally be this
    // session's, and understating that is the one direction the number may not
    // fail in.
    expect(winner?.rivals).toBe(3);
  });

  it('does not count a record the read ruled out', () => {
    const a = make('/store/aaaa', 100);
    const b = make('/store/bbbb', 200);
    const winner = decideRemoteHarvest(
      'codex',
      [a, b],
      verdicts([
        [a.path, 'match'],
        [b.path, 'mismatch']
      ])
    );
    expect(winner?.rivals).toBe(1);
  });

  it('writes nothing when nothing confirmed, because there is no grace timer', () => {
    const a = make('/store/aaaa', 100);
    expect(decideRemoteHarvest('codex', [a], verdicts([[a.path, 'unknown']]))).toBeNull();
    expect(decideRemoteHarvest('codex', [a], new Map())).toBeNull();
    expect(decideRemoteHarvest('codex', [], new Map())).toBeNull();
  });

  it('breaks a tie on the path, so two runs give one answer', () => {
    const a = make('/store/bbbb', 100);
    const b = make('/store/aaaa', 100);
    const winner = decideRemoteHarvest(
      'muse',
      [a, b],
      verdicts([
        [a.path, 'match'],
        [b.path, 'match']
      ])
    );
    expect(winner?.candidate.path).toBe('/store/aaaa');
  });

  it('answers null for an agent this rung may not ask about', () => {
    const a = make('/store/aaaa', 100);
    expect(decideRemoteHarvest('qwen', [a], verdicts([[a.path, 'match']]))).toBeNull();
  });
});

describe('rootOfRemotePath', () => {
  it('names the longest root that holds the path', () => {
    expect(
      rootOfRemotePath('/home/g/.codex/archived_sessions/x.jsonl', [
        '/home/g/.codex/sessions',
        '/home/g/.codex/archived_sessions'
      ])
    ).toBe('/home/g/.codex/archived_sessions');
  });

  it('falls back to the first root rather than answering nothing', () => {
    expect(rootOfRemotePath('/elsewhere/x', ['/a', '/b'])).toBe('/a');
    expect(rootOfRemotePath('/elsewhere/x', [])).toBe('');
  });
});
