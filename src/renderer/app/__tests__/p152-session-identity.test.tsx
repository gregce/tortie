/**
 * Phase 152 — a session says which one it is, and where it lives on disk.
 *
 * THE ONE THING THESE TESTS EXIST TO HOLD. A Tortie session carries two
 * identifiers and copying the wrong one resumes nothing, so the rows are never
 * allowed to become interchangeable: each names whose identifier it is, the
 * agent's conversation id leads, and Tortie's own id is the labelled secondary.
 *
 * The rest is the honest limit, measured in Phases 141 and 138.1 rather than
 * assumed. A row that would copy something Tortie does not have is drawn
 * disabled with the reason under it, and nothing here ever writes an empty
 * string to the clipboard.
 *
 * The vitest environment is node, so this reads the composed rows and the
 * composed tooltip rather than pixels. What a person sees is the phase's own
 * app run.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Session, SessionMachine, SessionRecordAbsence } from '@shared/types';

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {}
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});
vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
  void fn;
  return 0;
});

const written: string[] = [];
// The clipboard only. Node's own `navigator` carries the `userAgent` that
// xterm reads at import time, and replacing the whole object takes it away.
vi.stubGlobal('navigator', {
  userAgent: globalThis.navigator?.userAgent ?? 'node',
  platform: 'MacIntel',
  clipboard: {
    writeText: (text: string) => {
      written.push(text);
      return Promise.resolve();
    }
  }
});

const {
  COPY_CONVERSATION_ID,
  COPY_RECORD_PATH,
  COPY_TORTIE_SESSION_ID,
  conversationIdOf,
  conversationTooltipLine,
  noRecordPathNote,
  sessionIdentityItems
} = await import('../session-identity');
const { sessionMenuItems, sessionTooltip } = await import('../session-actions');
const { statusVisual } = await import('../status');

const CONVERSATION = '3f2a1b8c-0000-4000-8000-0000000091d4';
const RECORD = '/Users/gdc/.claude/projects/-Users-gdc-gmux/3f2a1b8c.jsonl';

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: true,
  restoreReason: null
};

/**
 * `AgentKind` is the frozen union of three, and a live session carries any
 * installed agent's id, which `resumeReadiness` in ../../state/resume.ts states
 * in the same words. `droid` below is one of those, so it is named through this
 * alias rather than by widening the shared type.
 */
const DROID = 'droid' as Session['agent'];

function sess(over: Partial<Session> = {}): Session {
  return {
    id: 'a3d9f1e2-0000-4000-8000-00000000abcd',
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

interface Item {
  label: string;
  disabled?: boolean;
  sublabel?: string;
  run: () => void;
}

function rowsOf(session: Session): Item[] {
  return sessionIdentityItems(session) as unknown as Item[];
}

function row(session: Session, label: string): Item {
  const found = rowsOf(session).find((one) => one.label === label);
  if (found === undefined) throw new Error(`no row labelled ${label}`);
  return found;
}

// ---------------------------------------------------------------------------
// The two identifiers, and the rule that they are not interchangeable
// ---------------------------------------------------------------------------

describe('the three identifier rows', () => {
  it('leads with the agent’s conversation id and puts Tortie’s own last', () => {
    expect(rowsOf(sess({ agentSessionId: CONVERSATION })).map((x) => x.label)).toEqual([
      COPY_CONVERSATION_ID,
      COPY_RECORD_PATH,
      COPY_TORTIE_SESSION_ID
    ]);
  });

  it('names whose identifier each one is, so neither can be mistaken', () => {
    expect(COPY_CONVERSATION_ID).toContain("agent's");
    expect(COPY_TORTIE_SESSION_ID).toContain("Tortie's");
    expect(COPY_CONVERSATION_ID).not.toBe(COPY_TORTIE_SESSION_ID);
  });

  /**
   * PHASE 152 pinned this row as untouched, including the absence of a grey
   * second line, and left the question of whether it should have one to the
   * phase after it.
   *
   * PHASE 153 ANSWERED IT THE OTHER WAY and this check now pins the answer.
   * The reason is at `copyDirectoryPathItem`: a session's cwd is not always
   * the project's folder, and the surfaces that notice say a session is
   * somewhere else without ever saying where, so the tab cannot be relied on
   * to answer what this row copies. What has NOT changed, and is still checked
   * here, is the label and the clipboard bytes.
   */
  it('shows the folder it will copy, and copies the absolute path', () => {
    written.length = 0;
    const one = sess({ cwd: '/repo/worktrees/auth' });
    const item = (sessionMenuItems(one, 'x') as unknown as Item[]).find(
      (x) => x.label === 'Copy directory path'
    );
    expect(item).toBeDefined();
    expect(item?.disabled).toBeUndefined();
    expect(item?.sublabel).toBe('/repo/worktrees/auth');
    item?.run();
    expect(written).toEqual(['/repo/worktrees/auth']);
  });

  /**
   * The `~` form is drawn and the absolute path is copied, which is the rule
   * `recordPathItem` already states for the same reason: `~` is the readable
   * form and an absolute path is the one a terminal and an editor can open.
   */
  it('draws the home folder as ~ and still copies it in full', () => {
    written.length = 0;
    const one = sess({ cwd: '/Users/someone/code/tortie' });
    const item = (sessionMenuItems(one, 'x') as unknown as Item[]).find(
      (x) => x.label === 'Copy directory path'
    );
    expect(item?.sublabel).toBe('~/code/tortie');
    item?.run();
    expect(written).toEqual(['/Users/someone/code/tortie']);
  });

  it('sits directly above Copy directory path, so the copy verbs are one block', () => {
    const labels = sessionMenuItems(
      sess({ agentSessionId: CONVERSATION, recordPath: RECORD }),
      'x'
    )
      .filter((one): one is Exclude<typeof one, 'sep'> => one !== 'sep')
      .map((one) => one.label);
    const first = labels.indexOf(COPY_CONVERSATION_ID);
    expect(first).toBeGreaterThan(-1);
    expect(labels.slice(first, first + 4)).toEqual([
      COPY_CONVERSATION_ID,
      COPY_RECORD_PATH,
      COPY_TORTIE_SESSION_ID,
      'Copy directory path'
    ]);
  });
});

// ---------------------------------------------------------------------------
// What each row shows and what each row copies
// ---------------------------------------------------------------------------

describe('what the rows show and copy', () => {
  it('shows the conversation id in full under the label and copies it exactly', () => {
    written.length = 0;
    const item = row(sess({ agentSessionId: CONVERSATION }), COPY_CONVERSATION_ID);
    expect(item.disabled).toBeUndefined();
    expect(item.sublabel).toBe(CONVERSATION);
    item.run();
    expect(written).toEqual([CONVERSATION]);
  });

  it('shows Tortie’s own id and copies it, on every session', () => {
    written.length = 0;
    const one = sess();
    const item = row(one, COPY_TORTIE_SESSION_ID);
    expect(item.disabled).toBeUndefined();
    expect(item.sublabel).toBe(one.id);
    item.run();
    expect(written).toEqual([one.id]);
  });

  /**
   * The grey line is the readable form and the clipboard is the absolute one.
   * A person reads `~/...` and pastes something a terminal can open.
   */
  it('shows the record path with ~ and copies the absolute path', () => {
    written.length = 0;
    const item = row(
      sess({ agentSessionId: CONVERSATION, recordPath: RECORD }),
      COPY_RECORD_PATH
    );
    expect(item.disabled).toBeUndefined();
    expect(item.sublabel).toBe('~/.claude/projects/-Users-gdc-gmux/3f2a1b8c.jsonl');
    item.run();
    expect(written).toEqual([RECORD]);
  });
});

// ---------------------------------------------------------------------------
// The honest limit
// ---------------------------------------------------------------------------

describe('a row that would copy something Tortie does not have', () => {
  it('never writes an empty string to the clipboard', () => {
    written.length = 0;
    const shapes: Partial<Session>[] = [
      { agent: 'shell' },
      { agent: 'claude' },
      { agent: 'claude', agentSessionId: '' },
      { agent: 'claude', recordPath: '' },
      { agent: 'claude', machine: STUDIO, recordAbsence: 'remote' },
      { agent: DROID, agentSessionId: CONVERSATION, recordAbsence: 'no-store' }
    ];
    for (const shape of shapes) {
      for (const item of rowsOf(sess(shape))) item.run();
    }
    expect(written).not.toContain('');
    for (const text of written) expect(text.length).toBeGreaterThan(0);
  });

  it('offers the conversation id disabled, with the reason, on a shell', () => {
    const item = row(sess({ agent: 'shell' }), COPY_CONVERSATION_ID);
    expect(item.disabled).toBe(true);
    expect(item.sublabel).toBe('A shell session has no conversation.');
  });

  it('offers the record path disabled, with the reason, on a shell', () => {
    const item = row(
      sess({ agent: 'shell', recordAbsence: 'shell' }),
      COPY_RECORD_PATH
    );
    expect(item.disabled).toBe(true);
    expect(item.sublabel).toBe('A shell session keeps no record on disk.');
  });

  it('offers the conversation id disabled when the agent has written none yet', () => {
    const item = row(sess({ agent: 'claude' }), COPY_CONVERSATION_ID);
    expect(item.disabled).toBe(true);
    expect(item.sublabel).toBe('Tortie has no conversation id for this session.');
  });

  /**
   * One sentence per measured reason, and every one of them is a fact rather
   * than a fault. The names come from `SessionRecordAbsence` in shared types,
   * so a value added there without a sentence fails to compile rather than
   * reaching a person as a blank line.
   */
  it('has a different sentence for every reason there is no record', () => {
    const cases: [SessionRecordAbsence, Partial<Session>, string][] = [
      ['shell', { agent: 'shell' }, 'A shell session keeps no record on disk.'],
      [
        'remote',
        { machine: STUDIO },
        'The record is on Studio, not on this Mac.'
      ],
      ['no-id', {}, 'Tortie needs the conversation id to find the record.'],
      [
        'not-yet',
        { agentSessionId: CONVERSATION },
        'Tortie found no record for this conversation on disk.'
      ],
      ['no-store', { agent: DROID }, 'Droid keeps no record Tortie can read.'],
      [
        'unsupported',
        { agent: DROID },
        'Tortie does not know where Droid keeps its records.'
      ]
    ];
    const seen = new Set<string>();
    for (const [absence, shape, sentence] of cases) {
      const one = sess({ ...shape, recordAbsence: absence });
      expect(noRecordPathNote(one, absence), absence).toBe(sentence);
      expect(row(one, COPY_RECORD_PATH).disabled, absence).toBe(true);
      expect(row(one, COPY_RECORD_PATH).sublabel, absence).toBe(sentence);
      seen.add(sentence);
    }
    expect(seen.size).toBe(cases.length);
  });

  /**
   * A session on another machine keeps its record over there. The row says so
   * rather than offering a path this Mac would have had to guess at.
   */
  it('never offers a record path for a session on another machine', () => {
    const item = row(
      sess({ agentSessionId: CONVERSATION, machine: STUDIO, recordAbsence: 'remote' }),
      COPY_RECORD_PATH
    );
    expect(item.disabled).toBe(true);
    expect(item.sublabel).toContain('Studio');
  });
});

// ---------------------------------------------------------------------------
// The tooltip
// ---------------------------------------------------------------------------

describe('the hover tooltip', () => {
  const visual = statusVisual('running', sess());

  it('names the conversation id and keeps the sentence it already carried', () => {
    const text = sessionTooltip(
      sess({ agentSessionId: CONVERSATION, resumeCapture: 'armed', resumeArgv: ['claude'] }),
      visual,
      undefined,
      0
    );
    const lines = text.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('auth');
    expect(lines[1]).toBe(`Conversation ${CONVERSATION}`);
    expect(lines[2]).toBe('Its conversation comes back after a restart.');
  });

  it('draws no conversation line when there is no conversation id', () => {
    for (const one of [sess({ agent: 'shell' }), sess({ agent: 'claude' })]) {
      const text = sessionTooltip(one, visual, undefined, 0);
      expect(text).not.toContain('Conversation ');
    }
  });

  /**
   * ONE FUNCTION decides it, being `conversationIdOf`, and both the tooltip
   * line and the menu row call it. That is the lesson Phase 141 paid for, and
   * the fix round is what joined them: each carried its own copy of the same
   * test before. The tooltip never says a session has an id the rows would
   * refuse to copy, and never withholds one the rows offer.
   */
  it('agrees with the menu row about whether there is an id at all', () => {
    for (const one of [
      sess({ agent: 'shell' }),
      sess({ agent: 'claude' }),
      sess({ agent: 'claude', agentSessionId: '' }),
      sess({ agent: 'claude', agentSessionId: CONVERSATION })
    ]) {
      const has = conversationIdOf(one) !== null;
      const line = conversationTooltipLine(one);
      const offered = row(one, COPY_CONVERSATION_ID).disabled !== true;
      expect(line !== null, one.agentSessionId ?? 'none').toBe(has);
      expect(offered, one.agentSessionId ?? 'none').toBe(has);
      if (line !== null) expect(line).toContain(one.agentSessionId ?? '');
    }
  });

  /** An empty string is absent, so nothing ever copies an empty id. */
  it('treats an empty conversation id as no conversation id', () => {
    expect(conversationIdOf(sess({ agentSessionId: '' }))).toBeNull();
    expect(conversationIdOf(sess())).toBeNull();
    expect(conversationIdOf(sess({ agentSessionId: CONVERSATION }))).toBe(CONVERSATION);
  });

  /** Three short lines is still a tooltip. */
  it('stays short enough to remain a tooltip', () => {
    const text = sessionTooltip(
      sess({ agentSessionId: CONVERSATION, resumeCapture: 'armed', resumeArgv: ['claude'] }),
      visual,
      undefined,
      0
    );
    expect(text.split('\n').length).toBeLessThanOrEqual(3);
    for (const line of text.split('\n')) expect(line.length).toBeLessThan(100);
  });
});
