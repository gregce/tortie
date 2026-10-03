/**
 * Phase 317. The End words moved to src/shared/lifecycle-words.ts, BYTE FOR
 * BYTE (build/p317/SPEC.md D9, §5.2, §7.2), because the phone draws the Mac's
 * own confirmation for a session and main composes it, and main cannot import
 * the renderer.
 *
 * WHAT THIS HOLDS, and where each expected value came from:
 *
 *  - The three End bodies, the title and the press, frozen here as the PARENT
 *    spelled them (`git show 551312f7:src/renderer/state/resume.ts`, lines
 *    994-1007), never read from the code under test. A word changed in the
 *    move reads red with the body it changed.
 *  - Remove's words, the same way (`:1016-1022`).
 *  - `resumeReadiness`, which decides which End body a local row gets, over
 *    the rows that tell its arms apart.
 *  - THE EQUALITIES, READ AS TEXT. `SESSION_NOT_FOUND` is the verb's own words
 *    spelled once more for the door, so it is held equal to the three literals
 *    main throws, read out of their source files (`core.ts`, `tmux/errors.ts`,
 *    `tmux/sessions.ts`), so none can drift. `LIFECYCLE_SESSION_CHANGED` is
 *    held equal to the session manager's own `SESSION_CHANGED` literal, a
 *    second spelling of one sentence that Phase 317 left where it is.
 *  - ONE DEFINITION EACH: the renderer's two words modules hand out the shared
 *    file's own objects, so the sheet, the menus and the phone cannot say two
 *    things.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Session, SessionMachine } from '@shared/types';
import * as words from '@shared/lifecycle-words';
import {
  END_FAILED,
  END_UNREACHABLE_TITLE,
  LIFECYCLE_SESSION_CHANGED,
  SESSION_NOT_FOUND,
  endSessionConfirm,
  removeSessionConfirm,
  resumeReadiness
} from '@shared/lifecycle-words';
import * as resume from '../../renderer/state/resume';
import * as copy from '../../renderer/session-manager/copy';

const ROOT = join(__dirname, '..', '..', '..');

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'blue',
  answering: true,
  canRestore: true,
  restoreReason: null
};

function session(over: Partial<Session> = {}): Session {
  return {
    id: 'sid',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'running',
    createdAt: 1,
    ...over
  } as Session;
}

// The parent's words, copied from 551312f7's resume.ts and never from the code
// under test.
const PARENT_REMOTE_BODY =
  'This stops what is running in it on Studio. Tortie saves a copy of what it printed first, so you can read that copy here afterwards. Bringing it back always returns the folder, and it returns the conversation only when Tortie recorded one for this agent.';
const PARENT_LOCAL_CONVERSATION_BODY =
  'This stops what is running in it. The scrollback and the conversation are saved first, so you can restore this session later.';
const PARENT_LOCAL_BODY =
  'This stops what is running in it. The scrollback is saved first, so you can restore this session later.';

describe('Phase 317: the End confirmation, byte for byte as the parent said it', () => {
  it('a session on another machine', () => {
    expect(endSessionConfirm(session({ machine: STUDIO, resumeArgv: ['/bin/claude', '--resume', 'x'] }))).toEqual({
      title: "End 'auth'?",
      body: PARENT_REMOTE_BODY,
      confirmLabel: 'End session'
    });
  });

  it('a local session whose conversation is recorded', () => {
    expect(endSessionConfirm(session({ resumeCapture: 'armed', resumeArgv: ['/bin/claude', '--resume', 'x'] }))).toEqual({
      title: "End 'auth'?",
      body: PARENT_LOCAL_CONVERSATION_BODY,
      confirmLabel: 'End session'
    });
  });

  it('a local session with no conversation recorded, and a plain shell', () => {
    for (const row of [session({ resumeCapture: 'capturing' }), session({ agent: 'shell' as Session['agent'] })]) {
      expect(endSessionConfirm(row)).toEqual({
        title: "End 'auth'?",
        body: PARENT_LOCAL_BODY,
        confirmLabel: 'End session'
      });
    }
  });

  it('the title carries the session name as it is, with the ASCII quotes', () => {
    expect(endSessionConfirm(session({ name: "it's 2 of 3" })).title).toBe("End 'it's 2 of 3'?");
  });

  it("Remove's words, byte for byte", () => {
    expect(removeSessionConfirm(session())).toEqual({
      title: "Remove 'auth'?",
      body: 'It moves to Past Sessions and you can restore it from there.',
      confirmLabel: 'Remove'
    });
  });

  it('resumeReadiness: every arm the End body reads', () => {
    const argv = ['/bin/claude', '--resume', 'x'];
    expect(resumeReadiness(session({ resumeCapture: 'armed', resumeArgv: argv }))).toBe('conversation');
    expect(resumeReadiness(session({ resumeCapture: 'armed' }))).toBe('directory');
    expect(resumeReadiness(session({ resumeCapture: 'capturing' }))).toBe('capturing');
    expect(resumeReadiness(session({ resumeCapture: 'unavailable' }))).toBe('directory');
    expect(resumeReadiness(session({ resumeCapture: 'none' }))).toBe('none');
    expect(resumeReadiness(session({ resumeArgv: argv }))).toBe('conversation');
    expect(resumeReadiness(session({ agent: 'shell' as Session['agent'] }))).toBe('none');
    expect(resumeReadiness(session())).toBe('directory');
  });
});

describe('Phase 317: the sentences, and the two the door adds', () => {
  it('each sentence, byte for byte', () => {
    expect(LIFECYCLE_SESSION_CHANGED).toBe('This session changed. Nothing was done.');
    expect(END_UNREACHABLE_TITLE).toBe('Tortie cannot see whether this session is running, so it cannot end it.');
    expect(SESSION_NOT_FOUND).toBe('Session not found.');
    expect(END_FAILED).toBe('Tortie could not end this session.');
  });

  it("SESSION_NOT_FOUND is the verb's own words, read as text in the three places main throws them", () => {
    const throwers = [
      ['src/main/sessions/core.ts', /throw gmuxError\('SESSION_NOT_FOUND', '([^']*)', sessionId\)/],
      ['src/main/tmux/errors.ts', /return gmuxError\('SESSION_NOT_FOUND', '([^']*)', text\)/],
      ['src/main/tmux/sessions.ts', /throw gmuxError\('SESSION_NOT_FOUND', '([^']*)', target\)/]
    ] as const;
    for (const [file, pattern] of throwers) {
      const said = [...readFileSync(join(ROOT, file), 'utf8').matchAll(new RegExp(pattern.source, 'g'))].map((m) => m[1]);
      expect(said.length, `${file} throws SESSION_NOT_FOUND with a literal`).toBeGreaterThan(0);
      for (const one of said) expect(one, file).toBe(SESSION_NOT_FOUND);
    }
  });

  it("LIFECYCLE_SESSION_CHANGED is the session manager's own SESSION_CHANGED literal, read as text", () => {
    const text = readFileSync(join(ROOT, 'src/renderer/session-manager/copy.ts'), 'utf8');
    const literal = /export const SESSION_CHANGED = '([^']*)';/.exec(text)?.[1];
    expect(literal).toBe(LIFECYCLE_SESSION_CHANGED);
    expect(copy.SESSION_CHANGED).toBe(LIFECYCLE_SESSION_CHANGED);
  });

  it('lifecycle-words.ts imports ./types and nothing else, so main and the renderer can both read it', () => {
    const text = readFileSync(join(ROOT, 'src/shared/lifecycle-words.ts'), 'utf8');
    const specifiers = [...text.matchAll(/^import[^;]*?from '([^']+)';/gm)].map((m) => m[1]);
    expect(specifiers).toEqual(['./types']);
  });
});

describe("Phase 317: one definition each, handed out by the renderer's words modules", () => {
  it("resume.ts re-exports the shared file's own End and Remove words", () => {
    expect(resume.endSessionConfirm).toBe(words.endSessionConfirm);
    expect(resume.removeSessionConfirm).toBe(words.removeSessionConfirm);
    expect(resume.resumeReadiness).toBe(words.resumeReadiness);
    expect(resume.LIFECYCLE_SESSION_CHANGED).toBe(words.LIFECYCLE_SESSION_CHANGED);
  });

  it("the session manager's copy.ts re-exports the shared END_UNREACHABLE_TITLE, and spells it nowhere", () => {
    expect(copy.END_UNREACHABLE_TITLE).toBe(words.END_UNREACHABLE_TITLE);
    const text = readFileSync(join(ROOT, 'src/renderer/session-manager/copy.ts'), 'utf8');
    expect(text).not.toContain(words.END_UNREACHABLE_TITLE);
    expect(text).toMatch(/export \{ END_UNREACHABLE_TITLE \} from '@shared\/lifecycle-words';/);
  });

  it('neither renderer module declares a moved word again', () => {
    for (const file of ['src/renderer/state/resume.ts', 'src/renderer/session-manager/copy.ts']) {
      const text = readFileSync(join(ROOT, file), 'utf8');
      for (const name of [
        'endSessionConfirm',
        'removeSessionConfirm',
        'resumeReadiness',
        'LIFECYCLE_SESSION_CHANGED',
        'END_UNREACHABLE_TITLE',
        'LifecycleConfirm',
        'ResumeReadiness'
      ]) {
        expect(text, `${file} declares ${name}`).not.toMatch(
          new RegExp(`(?:function|const|interface|type)\\s+${name}\\b`)
        );
      }
    }
  });
});
