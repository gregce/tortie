/**
 * Resume honesty (Phase 13.5, docs/research/22-resume-audit.md §4).
 *
 * The bug these tests encode is not a rendering bug — it is a TRUTH bug. Four
 * of the user's live sessions (muse-1, qwen-1, pi-1, pi1) carried no resume
 * command and the UI said nothing about it, so a reboot was the first time
 * anyone found out. Every case below is therefore about what the interface
 * CLAIMS, not about how it looks: an unknown state must never read as a
 * promise, "capturing" must never read as armed, and a plain shell must never
 * be described as having lost something it never had.
 */

import { describe, expect, it } from 'vitest';
import type { Session } from '@shared/types';
import {
  restoreActionCopy,
  restoreSummary,
  resumeMarkLabel,
  resumeNote,
  resumeReadiness
} from '../resume';

/**
 * `Session.agent` is typed against the FROZEN three-value AgentKind while the
 * registry has launched ten agents through it since (src/shared/types.ts
 * "INTEGRATOR note"). The rows this feature exists for — muse, qwen, pi —
 * only exist at runtime, so the tests have to write them the way the manifest
 * does.
 */
const as = (id: string): Session['agent'] => id as Session['agent'];

function session(over: Partial<Session> = {}): Session {
  return {
    id: 'sid',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'running',
    createdAt: 0,
    ...over
  };
}

describe('resumeReadiness', () => {
  it('reads the strategy main recorded, not the renderer guessing', () => {
    expect(
      resumeReadiness(
        session({ resumeCapture: 'armed', resumeArgv: ['claude', '-r', 'u'] })
      )
    ).toBe('conversation');
    expect(resumeReadiness(session({ resumeCapture: 'capturing' }))).toBe(
      'capturing'
    );
    expect(resumeReadiness(session({ resumeCapture: 'unavailable' }))).toBe(
      'directory'
    );
    expect(
      resumeReadiness(session({ agent: 'shell', resumeCapture: 'none' }))
    ).toBe('none');
  });

  it('never lets a harvest in flight read as a kept promise', () => {
    // 'capturing' is the state muse/qwen sat in with nothing behind it. It
    // says what a reboot RIGHT NOW would give you, which is the directory.
    const s = session({ agent: as('muse'), resumeCapture: 'capturing' });
    expect(resumeReadiness(s)).not.toBe('conversation');
    expect(resumeMarkLabel(resumeReadiness(s))).not.toBeNull();
  });

  it('refuses to promise a conversation an armed row cannot type', () => {
    // An 'armed' row with no argv has nothing to put in the pane; saying
    // "conversation" there is exactly the lie this phase exists to remove.
    expect(resumeReadiness(session({ resumeCapture: 'armed' }))).toBe(
      'directory'
    );
    expect(
      resumeReadiness(session({ resumeCapture: 'armed', resumeArgv: [] }))
    ).toBe('directory');
  });

  it('falls back to the recorded argv on rows written before the field', () => {
    expect(
      resumeReadiness(session({ resumeArgv: ['claude', '--resume', 'u'] }))
    ).toBe('conversation');
    expect(resumeReadiness(session({ agent: as('qwen') }))).toBe('directory');
    expect(resumeReadiness(session({ agent: 'shell' }))).toBe('none');
  });
});

describe('resumeMarkLabel', () => {
  it('marks only the exception — never the promise, never a shell', () => {
    expect(resumeMarkLabel('conversation')).toBeNull();
    expect(resumeMarkLabel('none')).toBeNull();
    expect(resumeMarkLabel('capturing')).toBe('no conversation id yet');
    expect(resumeMarkLabel('directory')).toBe('directory only');
  });
});

describe('resumeNote', () => {
  it('names the agent and what the user can do about it', () => {
    const note = resumeNote(session({ agent: as('pi'), resumeCapture: 'capturing' }));
    expect(note).toContain('Pi');
    expect(note).toContain('first message');
  });

  it('says gmux has not captured it — never blames the agent', () => {
    // Audit §4.5: under the corrected registry no installed agent lacks
    // resume, so "directory only" is gmux's missing work, not the CLI's.
    const note = resumeNote(session({ agent: as('qwen'), resumeCapture: 'unavailable' }));
    expect(note).toContain('Tortie never recorded');
    expect(note).not.toMatch(/qwen (cannot|does not|has no)/i);
  });

  /**
   * The user's pi-1 and pi1 rows read "gmux never captured a conversation id
   * for this session" — true, and it taught them nothing about what to do.
   * A dead-end state has to name its repair.
   */
  it('tells the user what repairs an unrecoverable row', () => {
    const note = resumeNote(session({ agent: as('pi'), resumeCapture: 'unavailable' }));
    expect(note).toContain('a new Pi session in this folder');
    expect(note).toContain('armed from the moment it starts');
  });

  it('is specific where the limitation is specific', () => {
    expect(
      resumeNote(session({ agent: as('antigravity'), resumeCapture: 'unavailable' }))
    ).toContain('nothing on disk');
    expect(
      resumeNote(session({ agent: as('droid'), resumeCapture: 'unavailable' }))
    ).toContain('no verified way');
  });

  it('says nothing at all about a plain shell', () => {
    expect(resumeNote(session({ agent: 'shell', resumeCapture: 'none' }))).toBeNull();
  });
});

describe('restoreSummary', () => {
  const armed = (n: number): Session[] =>
    Array.from({ length: n }, (_, i) =>
      session({ id: `a${i}`, resumeCapture: 'armed', resumeArgv: ['claude'] })
    );
  const folder = (n: number): Session[] =>
    Array.from({ length: n }, (_, i) =>
      session({ id: `f${i}`, agent: as('qwen'), resumeCapture: 'unavailable' })
    );

  it('states the split before the user presses Restore all', () => {
    expect(restoreSummary([...armed(4), ...folder(2)])).toBe(
      '6 saved sessions — 4 will resume their conversation, 2 return to their directory'
    );
  });

  it('agrees in number so the line never reads as boilerplate', () => {
    expect(restoreSummary([...armed(1), ...folder(1)])).toBe(
      '2 saved sessions — 1 will resume its conversation, 1 returns to its directory'
    );
  });

  it('says so plainly when every session, or none, comes back whole', () => {
    expect(restoreSummary(armed(3))).toBe(
      '3 saved sessions — all will resume their conversation'
    );
    expect(restoreSummary(folder(3))).toBe(
      '3 saved sessions — none has a conversation to resume'
    );
  });

  it('counts a harvest still in flight with the folders, not the promises', () => {
    expect(
      restoreSummary([...armed(1), session({ resumeCapture: 'capturing' })])
    ).toBe('2 saved sessions — 1 will resume its conversation, 1 returns to its directory');
  });
});

describe('restoreActionCopy', () => {
  it('promises the armed conversation, and that nothing runs unasked', () => {
    const copy = restoreActionCopy(
      session({ status: 'restorable', resumeCapture: 'armed', resumeArgv: ['claude'] })
    );
    expect(copy).toContain('resume command');
    expect(copy).toContain('press Enter');
  });

  it('says the conversation will not come back, why, and what repairs it', () => {
    const copy = restoreActionCopy(
      session({ agent: as('qwen'), status: 'restorable', resumeCapture: 'unavailable' })
    );
    expect(copy).toContain('will not come back');
    expect(copy).toContain('never recorded a conversation id');
    // Audit §4.4: the sentence has to leave the user with something to DO.
    expect(copy).toContain('a new Qwen session in this folder');
  });

  it('offers a plain shell no apology for a conversation it never had', () => {
    const copy = restoreActionCopy(
      session({ agent: 'shell', status: 'restorable', resumeCapture: 'none' })
    );
    expect(copy).toContain('same directory');
    expect(copy).not.toContain('conversation');
  });
});
