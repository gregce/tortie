/**
 * The pane environment rescue (Phase 71, M4).
 *
 * NOTHING HERE RUNS A COMMAND. The exec plane is replaced by a function that
 * records the argv it was handed and answers with text a machine would have
 * printed, which is the same instrument `./remote-sessions.test.ts` uses and for
 * the same reason: every property below is about what Tortie SENDS and what it
 * refuses to send, and a test that let a command through to find out would be
 * the defect it is testing for.
 *
 * The property the whole file exists for is the last one: a session whose pane
 * stamp names an id nobody issued is never adopted, however plausible the stamp
 * looks.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteMachineContext } from '../context';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'popos',
  sshBin: '/usr/bin/ssh',
  host: 'pop-os.tail1a2b.ts.net',
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p71-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

/** Every argv the plane was handed, in order. */
let sent: string[][] = [];
/** What each verb answers with, keyed by the verb. */
let answers: Record<string, string | Error> = {};
/** The connection generation the memo is keyed by. */
let generation = 1;

vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  machineGeneration: () => ({ generation, remotePath: '/usr/bin:/bin' })
}));

vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => {
    sent.push([...args]);
    const answer = answers[args[0] ?? ''];
    if (answer instanceof Error) return Promise.reject(answer);
    return Promise.resolve(answer ?? '');
  }
}));

const {
  clearIssuedRemoteId,
  foreignRemoteIds,
  forgetForeignMemo,
  issuedRemoteIdsFor,
  noteIssuedRemoteId,
  paneEnvProbeArgs,
  parsePaneEnvId,
  rescueNeeded,
  rescueRemoteRow,
  resetRescueForTests
} = await import('../pane-env-rescue');

const OURS = '0d1f6f2e-70a1-4a1c-9f2f-5c0b1a2d3e4f';
const STRANGER = 'ffffffff-70a1-4a1c-9f2f-5c0b1a2d3e4f';

function issueOurs(): void {
  noteIssuedRemoteId({
    id: OURS,
    machineId: 'popos',
    name: 'the rescue',
    agent: 'claude',
    projectPath: '/srv/repo',
    cwd: '/srv/repo',
    issuedAt: 1_700_000_000_000
  });
}

beforeEach(() => {
  sent = [];
  answers = {};
  generation = 1;
  resetRescueForTests();
});

afterEach(() => {
  resetRescueForTests();
});

// ---------------------------------------------------------------------------
// The issued set
// ---------------------------------------------------------------------------

describe('the issued set', () => {
  it('holds what a create asked for, per machine', () => {
    issueOurs();
    expect(issuedRemoteIdsFor('popos').map((one) => one.id)).toEqual([OURS]);
    expect(issuedRemoteIdsFor('attic')).toEqual([]);
  });

  it('forgets an id whose create finished and whose stamp landed', () => {
    issueOurs();
    clearIssuedRemoteId(OURS);
    expect(issuedRemoteIdsFor('popos')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The decision, pure
// ---------------------------------------------------------------------------

describe('rescueNeeded', () => {
  const none: ReadonlySet<string> = new Set();

  it('is true only for a row carrying no id stamp', () => {
    expect(rescueNeeded({ gmuxId: '', tmuxId: '$4' }, none)).toBe(true);
    expect(rescueNeeded({ gmuxId: OURS, tmuxId: '$4' }, none)).toBe(false);
  });

  it('never re-probes a session already proven foreign', () => {
    expect(rescueNeeded({ gmuxId: '', tmuxId: '$4' }, new Set(['$4']))).toBe(
      false
    );
  });
});

describe('parsePaneEnvId', () => {
  it('reads the line tmux prints when the variable is set', () => {
    expect(parsePaneEnvId(`GMUX_SESSION_ID=${OURS}\n`)).toBe(OURS);
  });

  it('reads an explicitly unset variable as no stamp', () => {
    expect(parsePaneEnvId('-GMUX_SESSION_ID\n')).toBeNull();
  });

  it('reads an empty answer as no stamp', () => {
    expect(parsePaneEnvId('')).toBeNull();
    expect(parsePaneEnvId('GMUX_SESSION_ID=\n')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The rescue
// ---------------------------------------------------------------------------

describe('rescueRemoteRow', () => {
  it('re-binds a session whose stamp names an id THIS run issued', async () => {
    issueOurs();
    answers['show-environment'] = `GMUX_SESSION_ID=${OURS}\n`;

    const found = await rescueRemoteRow(CTX, '$4');
    expect(found?.id).toBe(OURS);

    expect(sent[0]).toEqual(['show-environment', '-t', '$4']);
    // All four stamps, in the order the one list declares them.
    expect(sent.slice(1)).toEqual([
      ['set-option', '-t', '$4', '@gmux-id', OURS],
      ['set-option', '-t', '$4', '@gmux-agent', 'claude'],
      ['set-option', '-t', '$4', '@gmux-name', 'the rescue'],
      ['set-option', '-t', '$4', '@gmux-project', '/srv/repo']
    ]);
  });

  /**
   * THE PROPERTY THIS WHOLE FILE EXISTS FOR. A session carrying a stamp that
   * names nothing this run issued is NOT OURS. It is never adopted, never shown
   * and never killed, and the tmux safety rule does not bend for a rescue.
   */
  it('never adopts a stamp naming an id nobody issued', async () => {
    issueOurs();
    answers['show-environment'] = `GMUX_SESSION_ID=${STRANGER}\n`;

    expect(await rescueRemoteRow(CTX, '$9')).toBeNull();
    // One read, and no set-option at all.
    expect(sent).toEqual([['show-environment', '-t', '$9']]);
  });

  /**
   * THE LINE ITSELF, pinned.
   *
   * The variable is deliberately NOT named on it. Naming it makes tmux exit non
   * zero for the ordinary case, being a session that is not ours, the exec plane
   * turns that into a thrown error, the memo below is never written and the same
   * session is probed again on every list. The measurements are in the module
   * header. This assertion is what stops a later edit from putting the name back
   * for tidiness.
   */
  it('asks for the whole environment and never names the variable', () => {
    expect(paneEnvProbeArgs('$7')).toEqual(['show-environment', '-t', '$7']);
    expect(paneEnvProbeArgs('$7')).not.toContain('GMUX_SESSION_ID');
  });

  /**
   * The answer for a foreign session is the whole session environment, which on
   * a real machine is several lines and none of them ours. It is a DEFINITIVE
   * answer, so it settles the session and costs one exec ever.
   */
  it('settles a foreign session from the whole environment, once', async () => {
    issueOurs();
    answers['show-environment'] =
      '-DISPLAY\n-KRB5CCNAME\nSSH_AUTH_SOCK=/private/tmp/x/Listeners\n-WINDOWID\n';

    expect(await rescueRemoteRow(CTX, '$3')).toBeNull();
    expect(await rescueRemoteRow(CTX, '$3')).toBeNull();
    expect(sent).toHaveLength(1);
    expect(foreignRemoteIds('popos').has('$3')).toBe(true);
  });

  it('never adopts a session carrying no stamp at all', async () => {
    issueOurs();
    answers['show-environment'] = '-GMUX_SESSION_ID\n';
    expect(await rescueRemoteRow(CTX, '$9')).toBeNull();
    expect(sent).toHaveLength(1);
  });

  /**
   * A pane's environment is fixed at create and a `$-id` is never reused inside
   * one server's life, so one probe settles one session. Without this a busy
   * machine would cost one exec per foreign session per refresh.
   */
  it('spends one exec per foreign session and never a second', async () => {
    issueOurs();
    answers['show-environment'] = `GMUX_SESSION_ID=${STRANGER}\n`;

    await rescueRemoteRow(CTX, '$9');
    await rescueRemoteRow(CTX, '$9');
    expect(sent).toHaveLength(1);
    expect(foreignRemoteIds('popos').has('$9')).toBe(true);
    expect(rescueNeeded({ gmuxId: '', tmuxId: '$9' }, foreignRemoteIds('popos'))).toBe(
      false
    );
  });

  /**
   * A server that was born again is a different server: its `$-id`s start over
   * at `$0`, so a memo carried across that boundary would refuse to probe a
   * session that has nothing to do with the one it remembers.
   */
  it('starts the memo again when the machine gets a new generation', async () => {
    issueOurs();
    answers['show-environment'] = `GMUX_SESSION_ID=${STRANGER}\n`;
    await rescueRemoteRow(CTX, '$9');
    expect(sent).toHaveLength(1);

    generation = 2;
    await rescueRemoteRow(CTX, '$9');
    expect(sent).toHaveLength(2);
  });

  it('forgetForeignMemo clears one machine by hand', async () => {
    issueOurs();
    answers['show-environment'] = `GMUX_SESSION_ID=${STRANGER}\n`;
    await rescueRemoteRow(CTX, '$9');
    forgetForeignMemo('popos');
    expect(foreignRemoteIds('popos').has('$9')).toBe(false);
  });

  /**
   * A machine that did not answer proves nothing about the session, so it must
   * NOT be memoised. Memoising it would turn one dropped link into a session
   * Tortie never looks at again.
   */
  it('does not memoise a session the machine failed to answer for', async () => {
    issueOurs();
    answers['show-environment'] = new Error('ssh: connect timed out');

    expect(await rescueRemoteRow(CTX, '$4')).toBeNull();
    expect(foreignRemoteIds('popos').has('$4')).toBe(false);

    answers['show-environment'] = `GMUX_SESSION_ID=${OURS}\n`;
    expect((await rescueRemoteRow(CTX, '$4'))?.id).toBe(OURS);
  });

  /**
   * The pane environment is the identity that survived the interrupted create,
   * so a stamp that will not stick does not undo the match. The next pass writes
   * them again.
   */
  it('keeps the match when a re-stamp fails', async () => {
    issueOurs();
    answers['show-environment'] = `GMUX_SESSION_ID=${OURS}\n`;
    answers['set-option'] = new Error('no such session');

    expect((await rescueRemoteRow(CTX, '$4'))?.id).toBe(OURS);
  });

  /**
   * The issued set is per machine. An id issued for one machine is not ours on
   * another, because a stranger could stamp any string they liked.
   */
  it('judges against the ids issued for THIS machine only', async () => {
    noteIssuedRemoteId({
      id: OURS,
      machineId: 'attic',
      name: 'elsewhere',
      agent: 'claude',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      issuedAt: 1_700_000_000_000
    });
    answers['show-environment'] = `GMUX_SESSION_ID=${OURS}\n`;

    expect(await rescueRemoteRow(CTX, '$4')).toBeNull();
  });
});
