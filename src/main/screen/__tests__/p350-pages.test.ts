/**
 * Phase 350, the Mac's page offer and its grace (build/p350/SPEC.md §4.3, D6,
 * D9, D23, D24), driven against the SHIPPING src/main/screen/compose.ts and
 * src/main/screen/keys.ts, and, for the grace's effect, the SHIPPING
 * `SessionActivityMonitor` over fake tmux output, as the spec's M5 measured it
 * over a real pane (§2.5).
 *
 *  - THE OFFER (D6): `pages` is the literal `true` exactly when the screen is
 *    the alternate screen and takes keys, on this Mac and on another machine,
 *    and the key is ABSENT otherwise, never `false`; the paste flag beside it
 *    is what it was; and the two screens' revisions differ, so a picture's
 *    `pages` can change only with its revision (§0.1 item 12).
 *  - THE GRACE'S CALL (D9, D23): `noteRepaint` once, after `noteUserInput` and
 *    before the nudge, for a write of exactly one `PPage` or `NPage` that
 *    typed, here and on another machine; never for another key, a text, a
 *    refused write, a write that typed nothing, or a page that is not alone
 *    (refused at step 1); a clock that throws types the same keys and answers
 *    done; a verb built without the clock types the same keys.
 *  - A PAGE ONLY ON THE ALTERNATE SCREEN (the fix round): a page against a
 *    fresh screen whose program has left full screen since the phone's
 *    picture is refused `changed` with nothing typed, no funnel and no grace,
 *    here and on another machine; any other key there is typed as before.
 *  - THE GRACE'S EFFECT (M5 arms A, B and D): an idle session read from its
 *    screen, paged from the phone and redrawn by its program, never reads
 *    `running` with the grace and does without it (today's verb), and a
 *    numbered question drawn a second after a graced page still reads
 *    `needs_input` at its second sighting, inside the grace.
 *
 * Nothing here starts a process: the core, the control client, the watcher and
 * tmux's answers are fakes, and the monitor's registry folder is a scratch
 * directory removed after each case.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POCKET_SCREEN_KEY_NAMES, POCKET_WRITE_SENTENCES, type PocketKeyItem } from '@shared/ipc/pocket';
import { REPLY_FAILED } from '@shared/reply-copy';
import { LIFECYCLE_SESSION_CHANGED } from '@shared/lifecycle-words';
import { SCREEN_KEY_CHARACTER, SCREEN_NOT_TYPABLE, SCREEN_QUESTION_MOVED } from '@shared/screen-copy';
import type { Session, SessionStatus } from '@shared/types';
import { SessionActivityMonitor, type ActivitySession } from '../../activity/monitor';
import { parseProcTable } from '../../activity/process';
import { REFLOW_GRACE_MS } from '../../activity/state-machine';
import type { PocketKeysInput, PocketReplyOutcome } from '../../pocket/routes';
import { createQuestionIds, type QuestionIds } from '../../reply/question-id';
import { composeScreen } from '../compose';
import { createScreenKeys, type ScreenKeysDeps } from '../keys';
import type { ScreenDisplay, ScreenReading } from '../read';
import { readingRevisionOf } from '../watch';

const ALLOWED = (): boolean => true;
const DONE: PocketReplyOutcome = { outcome: 'done' };

/** One reading of a screen as `readFresh` answers it: 80x24 on a pane, the alternate screen unless told. */
function readingOf(styled: string, over: Partial<ScreenDisplay> = {}): ScreenReading {
  const display: ScreenDisplay = {
    paneId: '%5',
    cols: 80,
    rows: 24,
    cursorX: 0,
    cursorY: 0,
    cursorVisible: true,
    alternate: true,
    history: 11,
    ...over
  };
  const displayLine = [
    display.paneId,
    display.cols,
    display.rows,
    display.cursorX,
    display.cursorY,
    display.cursorVisible ? 1 : 0,
    display.alternate ? 1 : 0,
    display.history
  ].join('\t');
  return { styled, display, displayLine, steady: true };
}

/** A full-screen program's view, as numbered rows from `top`. */
function viewOf(top: number, rows = 24): string {
  return Array.from({ length: rows }, (_, i) => `pager line ${String(top + i).padStart(4, '0')}`).join('\n');
}

// ---------------------------------------------------------------------------
// THE OFFER (D6)
// ---------------------------------------------------------------------------

describe('the page offer, composed (D6)', () => {
  const extra = (typable: boolean, local: boolean): { turn: string; status: SessionStatus; typable: boolean; local: boolean } => ({
    turn: '0123456789abcdef-3',
    status: 'idle',
    typable,
    local
  });
  const screenOf = (alternate: boolean, typable: boolean, local: boolean): Record<string, unknown> => {
    const composed = composeScreen(readingOf(viewOf(1), { alternate }), extra(typable, local));
    if (composed === 'large') throw new Error('an 80x24 screen composed as large');
    return composed.screen as unknown as Record<string, unknown>;
  };

  it('is the literal true on the alternate screen that takes keys, on this Mac and on another machine', () => {
    for (const local of [true, false]) {
      const screen = screenOf(true, true, local);
      expect(screen['pages'], `local ${String(local)}`).toBe(true);
      expect(screen['alternate']).toBe(true);
      // The alternate screen holds no history the phone may page (Phase 337.1 D3).
      expect(screen['depth']).toBeNull();
      expect(screen['space']).toBeNull();
    }
  });

  it('is ABSENT, never false, on the normal screen, and on a screen that takes no keys', () => {
    for (const [alternate, typable, local] of [
      [false, true, true],
      [false, true, false],
      [true, false, true],
      [true, false, false],
      [false, false, true],
      [false, false, false]
    ] as const) {
      const screen = screenOf(alternate, typable, local);
      const what = `alternate ${String(alternate)}, typable ${String(typable)}, local ${String(local)}`;
      expect('pages' in screen, what).toBe(false);
      expect(JSON.stringify(screen), what).not.toContain('"pages"');
    }
  });

  it('leaves the paste flag as it was: on this Mac, on a screen that takes keys, whatever the screen', () => {
    expect(screenOf(true, true, true)['paste']).toBe(true);
    expect(screenOf(false, true, true)['paste']).toBe(true);
    expect('paste' in screenOf(true, true, false)).toBe(false);
    expect('paste' in screenOf(true, false, true)).toBe(false);
  });

  it('rides inside the byte count the composer holds under the cap', () => {
    const composed = composeScreen(readingOf(viewOf(1)), extra(true, true));
    if (composed === 'large') throw new Error('large');
    expect(composed.bytes).toBe(Buffer.byteLength(JSON.stringify(composed.screen), 'utf8'));
    expect(JSON.stringify(composed.screen)).toContain('"pages":true');
  });

  it('changes only with the revision: the two screens are two revisions, the display line naming the alternate screen', () => {
    const alt = readingOf(viewOf(1), { alternate: true });
    const normal = readingOf(viewOf(1), { alternate: false });
    const turn = '0123456789abcdef-3';
    expect(readingRevisionOf('s1', alt, turn, false, true)).not.toBe(readingRevisionOf('s1', normal, turn, false, true));
    // And the same screen read twice is the same revision, so a picture that offers pages keeps offering them.
    expect(readingRevisionOf('s1', alt, turn, false, true)).toBe(readingRevisionOf('s1', readingOf(viewOf(1), { alternate: true }), turn, false, true));
  });
});

// ---------------------------------------------------------------------------
// THE GRACE'S CALL (D9, D23), over the shipping keys verb
// ---------------------------------------------------------------------------

const ID = 'p350';
const PANE = '%5';

interface Rig {
  deps: ScreenKeysDeps;
  turns: QuestionIds;
  lines: string[];
  events: string[];
  repainted: string[];
  spawned: (readonly string[])[];
  set: {
    screen(text: string): void;
    row(row: Session): void;
    connected(on: boolean): void;
    reject(match: (line: string) => boolean): void;
    remote(answer: 'carriage' | 'unreachable'): void;
    spawnFails(fails: boolean): void;
    /** Whether the fresh read is the alternate screen (the fix round). */
    alternate(on: boolean): void;
  };
}

function rowOf(status: SessionStatus, machine?: string): Session {
  return { id: ID, status, agent: 'opencode', ...(machine === undefined ? {} : { machine: { id: machine } }) } as unknown as Session;
}

function rig(): Rig {
  const turns = createQuestionIds('0123456789abcdef');
  const lines: string[] = [];
  const events: string[] = [];
  const repainted: string[] = [];
  const spawned: (readonly string[])[] = [];
  let screen = viewOf(1);
  let row: Session = rowOf('idle');
  let connected = true;
  let reject: (line: string) => boolean = () => false;
  let remoteAnswer: 'carriage' | 'unreachable' = 'carriage';
  let spawnFails = false;
  let alternate = true;
  let clock = 1_000;
  const core = {
    listSessions: (): Session[] => [row],
    tmuxIdOf: (): string => '$3',
    manifest: { getSession: (id: string) => (id === ID ? { status: 'idle' as SessionStatus } : undefined) },
    control: {
      get connected(): boolean {
        return connected;
      },
      sendCommand: (command: string): Promise<string[]> => {
        lines.push(command);
        events.push('line');
        return reject(command) ? Promise.reject(new Error('no such pane')) : Promise.resolve([]);
      }
    },
    activity: { noteUserInput: (): void => undefined }
  };
  const deps: ScreenKeysDeps = {
    core: () => core as never,
    turns,
    watch: {
      readFresh: async () => {
        events.push('read');
        await Promise.resolve();
        return readingOf(screen, { paneId: PANE, alternate });
      },
      nudge: () => {
        events.push('nudge');
      }
    },
    noteUserInput: () => {
      events.push('funnel');
    },
    noteRepaint: (id) => {
      events.push('repaint');
      repainted.push(id);
    },
    typeRemote: () => {
      events.push('remote');
      return remoteAnswer;
    },
    run: (args) => {
      events.push('spawn');
      spawned.push([...args]);
      return spawnFails ? Promise.reject(new Error('no server')) : Promise.resolve('');
    },
    now: () => clock,
    sleep: (ms) => {
      clock += ms;
      return Promise.resolve();
    }
  };
  return {
    deps,
    turns,
    lines,
    events,
    repainted,
    spawned,
    set: {
      screen: (text) => {
        screen = text;
      },
      row: (next) => {
        row = next;
      },
      connected: (on) => {
        connected = on;
      },
      reject: (match) => {
        reject = match;
      },
      remote: (answer) => {
        remoteAnswer = answer;
      },
      spawnFails: (fails) => {
        spawnFails = fails;
      },
      alternate: (on) => {
        alternate = on;
      }
    }
  };
}

/** The phone's picture of the screen, by the shipping composer. */
function pictureOf(r: Rig, styled: string, status: SessionStatus): { turn: string; dialog: string | null } {
  const turn = r.turns.current(ID).id;
  const composed = composeScreen(readingOf(styled, { paneId: PANE }), { turn, status, typable: true });
  if (composed === 'large') throw new Error('large');
  return { turn, dialog: composed.screen.dialog };
}

function input(keys: PocketKeyItem[], picture: { turn: string; dialog: string | null }): PocketKeysInput {
  return { sessionId: ID, keys, turn: picture.turn, dialog: picture.dialog };
}

let r: Rig;
beforeEach(() => {
  r = rig();
});

describe('the grace, stamped by the keys verb (D9, D23)', () => {
  it('the two page keys are the contract’s last two names, so the 35 keep their index (D24)', () => {
    expect(POCKET_SCREEN_KEY_NAMES).toHaveLength(37);
    expect(POCKET_SCREEN_KEY_NAMES.indexOf('PPage')).toBe(35);
    expect(POCKET_SCREEN_KEY_NAMES.indexOf('NPage')).toBe(36);
  });

  for (const page of ['PPage', 'NPage'] as const) {
    it(`a lone ${page} that typed: the act as any named key, then the funnel, then the grace once, then the nudge`, async () => {
      const verb = createScreenKeys(r.deps);
      const answer = await verb.keys(input([{ k: page }], pictureOf(r, viewOf(1), 'idle')), ALLOWED);
      expect(answer).toEqual(DONE);
      expect(r.lines).toEqual([`copy-mode -q -t ${PANE}`, `send-keys -t ${PANE} ${page}`]);
      expect(r.repainted).toEqual([ID]);
      expect(r.events).toEqual(['read', 'line', 'line', 'funnel', 'repaint', 'nudge']);
    });
  }

  it('no grace for any other key, alone, or for text, or BSpace beside text', async () => {
    for (const keys of [
      [{ k: 'Up' }],
      [{ k: 'Down' }],
      [{ k: 'Enter' }],
      [{ k: 'Escape' }],
      [{ k: 'C-c' }],
      [{ k: 'BSpace' }],
      [{ t: 'q' }],
      [{ k: 'BSpace' }, { t: 'x' }]
    ] as PocketKeyItem[][]) {
      const fresh = rig();
      const verb = createScreenKeys(fresh.deps);
      const answer = await verb.keys(input(keys, pictureOf(fresh, viewOf(1), 'idle')), ALLOWED);
      expect(answer, JSON.stringify(keys)).toEqual(DONE);
      expect(fresh.events, JSON.stringify(keys)).toContain('funnel');
      expect(fresh.repainted, JSON.stringify(keys)).toEqual([]);
    }
  });

  it('a page beside anything else is refused at step 1: nothing read, nothing typed, no grace', async () => {
    for (const keys of [
      [{ k: 'PPage' }, { t: 'x' }],
      [{ t: 'x' }, { k: 'NPage' }],
      [{ k: 'BSpace' }, { k: 'PPage' }],
      [{ k: 'PPage' }, { k: 'PPage' }],
      [{ k: 'PPage' }, { k: 'NPage' }]
    ] as PocketKeyItem[][]) {
      const fresh = rig();
      const answer = await createScreenKeys(fresh.deps).keys(input(keys, pictureOf(fresh, viewOf(1), 'idle')), ALLOWED);
      expect(answer, JSON.stringify(keys)).toEqual({ outcome: 'refused', reason: 'character', sentence: SCREEN_KEY_CHARACTER });
      expect(fresh.events, JSON.stringify(keys)).toEqual([]);
      expect(fresh.repainted).toEqual([]);
    }
  });

  it('a page against a question that moved since the picture: changed, nothing typed, no grace', async () => {
    const picture = pictureOf(r, viewOf(1), 'needs_input');
    r.set.row(rowOf('needs_input'));
    r.turns.bump(ID, 'desk');
    const answer = await createScreenKeys(r.deps).keys(input([{ k: 'PPage' }], picture), ALLOWED);
    expect(answer).toEqual({ outcome: 'refused', reason: 'changed', sentence: SCREEN_QUESTION_MOVED });
    expect(r.lines).toEqual([]);
    expect(r.repainted).toEqual([]);
    expect(r.events).not.toContain('funnel');
  });

  it('a page against a fresh screen that left full screen: changed, nothing typed, no funnel, no grace (the fix round)', async () => {
    // The phone drew the full-screen picture; its program has since left it.
    const picture = pictureOf(r, viewOf(1), 'idle');
    r.set.alternate(false);
    r.set.screen('p350 % ');
    for (const page of ['PPage', 'NPage'] as const) {
      const answer = await createScreenKeys(r.deps).keys(input([{ k: page }], picture), ALLOWED);
      expect(answer, page).toEqual({ outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED });
    }
    expect(r.lines).toEqual([]);
    expect(r.events.filter((e) => e !== 'read')).toEqual([]);
    expect(r.repainted).toEqual([]);
    // On another machine too: the carriage is never asked.
    const far = rig();
    far.set.row(rowOf('idle', 'm1'));
    far.set.alternate(false);
    const farAnswer = await createScreenKeys(far.deps).keys(input([{ k: 'PPage' }], pictureOf(far, viewOf(1), 'idle')), ALLOWED);
    expect(farAnswer).toEqual({ outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED });
    expect(far.events).not.toContain('remote');
    // Any other key on that screen is typed as before.
    expect(await createScreenKeys(r.deps).keys(input([{ k: 'Up' }], pictureOf(r, 'p350 % ', 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.lines).toEqual([`copy-mode -q -t ${PANE}`, `send-keys -t ${PANE} Up`]);
  });

  it('a page whose door stopped before the act: stopped, nothing typed, no grace', async () => {
    const answer = await createScreenKeys(r.deps).keys(input([{ k: 'NPage' }], pictureOf(r, viewOf(1), 'idle')), () => false);
    expect(answer).toEqual({ outcome: 'refused', reason: 'stopped', sentence: POCKET_WRITE_SENTENCES.stopped });
    expect(r.lines).toEqual([]);
    expect(r.repainted).toEqual([]);
  });

  it('a page to a session that takes no keys: unreachable, nothing read, no grace', async () => {
    r.set.row(rowOf('exited'));
    const answer = await createScreenKeys(r.deps).keys(input([{ k: 'PPage' }], pictureOf(r, viewOf(1), 'idle')), ALLOWED);
    expect(answer).toEqual({ outcome: 'refused', reason: 'unreachable', sentence: SCREEN_NOT_TYPABLE });
    expect(r.events).toEqual([]);
  });

  it('a page whose key line was rejected typed nothing: failed, and no funnel and no grace', async () => {
    r.set.reject((line) => line.startsWith('send-keys'));
    const answer = await createScreenKeys(r.deps).keys(input([{ k: 'PPage' }], pictureOf(r, viewOf(1), 'idle')), ALLOWED);
    expect(answer).toEqual({ outcome: 'failed', sentence: REPLY_FAILED });
    expect(r.repainted).toEqual([]);
    expect(r.events).not.toContain('funnel');
  });

  it('a page whose copy-mode line alone was rejected still typed: the grace is stamped', async () => {
    r.set.reject((line) => line.startsWith('copy-mode'));
    const answer = await createScreenKeys(r.deps).keys(input([{ k: 'PPage' }], pictureOf(r, viewOf(1), 'idle')), ALLOWED);
    expect(answer).toEqual(DONE);
    expect(r.repainted).toEqual([ID]);
  });

  it('with the control client down, ONE spawned list: the grace when it ran, none when it failed', async () => {
    r.set.connected(false);
    expect(await createScreenKeys(r.deps).keys(input([{ k: 'PPage' }], pictureOf(r, viewOf(1), 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.spawned).toEqual([['copy-mode', '-q', '-t', PANE, ';', 'send-keys', '-t', PANE, 'PPage']]);
    expect(r.repainted).toEqual([ID]);
    const down = rig();
    down.set.connected(false);
    down.set.spawnFails(true);
    expect(await createScreenKeys(down.deps).keys(input([{ k: 'NPage' }], pictureOf(down, viewOf(1), 'idle')), ALLOWED)).toEqual({
      outcome: 'failed',
      sentence: REPLY_FAILED
    });
    expect(down.repainted).toEqual([]);
  });

  it('on another machine: the carriage took it, the grace; it did not, unreachable and no grace', async () => {
    r.set.row(rowOf('idle', 'm1'));
    expect(await createScreenKeys(r.deps).keys(input([{ k: 'PPage' }], pictureOf(r, viewOf(1), 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.repainted).toEqual([ID]);
    expect(r.lines).toEqual([]);
    const far = rig();
    far.set.row(rowOf('idle', 'm1'));
    far.set.remote('unreachable');
    expect(await createScreenKeys(far.deps).keys(input([{ k: 'NPage' }], pictureOf(far, viewOf(1), 'idle')), ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'unreachable',
      sentence: SCREEN_NOT_TYPABLE
    });
    expect(far.repainted).toEqual([]);
  });

  it('a clock that throws types the same keys and answers done, and the nudge still runs', async () => {
    const verb = createScreenKeys({
      ...r.deps,
      noteRepaint: () => {
        r.events.push('repaint-threw');
        throw new Error('the monitor is gone');
      }
    });
    expect(await verb.keys(input([{ k: 'PPage' }], pictureOf(r, viewOf(1), 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.lines).toEqual([`copy-mode -q -t ${PANE}`, `send-keys -t ${PANE} PPage`]);
    expect(r.events.slice(-3)).toEqual(['funnel', 'repaint-threw', 'nudge']);
  });

  it('a funnel that throws does not take the grace away', async () => {
    const verb = createScreenKeys({
      ...r.deps,
      noteUserInput: () => {
        throw new Error('the funnel is gone');
      }
    });
    expect(await verb.keys(input([{ k: 'NPage' }], pictureOf(r, viewOf(1), 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.repainted).toEqual([ID]);
  });

  it('a verb built with no clock types the same keys and answers done', async () => {
    const { noteRepaint: _dropped, ...rest } = r.deps;
    void _dropped;
    const verb = createScreenKeys(rest);
    expect(await verb.keys(input([{ k: 'PPage' }], pictureOf(r, viewOf(1), 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.lines).toEqual([`copy-mode -q -t ${PANE}`, `send-keys -t ${PANE} PPage`]);
    expect(r.repainted).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// THE GRACE'S EFFECT (M5), the shipping monitor over fake tmux output
// ---------------------------------------------------------------------------

/** One fake pane, in the order PANE_FORMAT emits (as src/main/activity/__tests__/monitor.test.ts writes it). */
interface FakePane {
  tmuxId: string;
  paneId: string;
  panePid: number;
  /** Epoch SECONDS, as tmux reports. */
  activity: number;
  alternate?: boolean;
}

/** The desk: the shipping monitor, ticked on a fake clock over one pane. */
class Desk {
  now = 1_800_000_000_000;
  panes: FakePane[] = [];
  sessions: ActivitySession[] = [];
  readonly captures = new Map<string, string>();
  readonly statuses: Array<[string, SessionStatus]> = [];
  readonly claudeDir = mkdtempSync(join(tmpdir(), 'p350-claude-reg-'));
  readonly monitor: SessionActivityMonitor;

  constructor() {
    this.monitor = new SessionActivityMonitor({
      sessions: () => this.sessions,
      exec: (async (args: readonly string[]) => {
        if (args[0] !== 'list-panes') throw new Error(`unexpected ${String(args[0])}`);
        return this.panes
          .map((p) =>
            [
              p.tmuxId,
              p.paneId,
              String(p.panePid),
              '1',
              '0',
              '',
              '',
              String(p.activity),
              '0',
              p.alternate === true ? '1' : '0',
              '0',
              '0',
              '25000',
              'opencode',
              ''
            ].join('\t')
          )
          .join('\n');
      }) as never,
      run: async (args: readonly string[]) => this.captures.get(args[args.indexOf('-t') + 1] ?? '') ?? '',
      readProc: async () => parseProcTable('', this.now),
      readWitness: async () => ({ found: false, stat: '', ppid: null }),
      readCommand: async () => null,
      readChildren: async () => [],
      claudeSessionsDir: this.claudeDir,
      onStatus: (id, status) => this.statuses.push([id, status]),
      onActivity: () => undefined,
      onDead: () => undefined,
      now: () => this.now
    });
  }

  async tick(seconds = 1): Promise<void> {
    this.now += seconds * 1000;
    await this.monitor.tick();
  }

  /** The pane produced output right now. */
  touch(): void {
    for (const pane of this.panes) pane.activity = Math.floor(this.now / 1000);
  }

  last(sessionId: string): SessionStatus | undefined {
    for (let i = this.statuses.length - 1; i >= 0; i -= 1) {
      const row = this.statuses[i];
      if (row?.[0] === sessionId) return row[1];
    }
    return undefined;
  }

  cleanup(): void {
    rmSync(this.claudeDir, { recursive: true, force: true });
  }
}

const DIALOG = readFileSync(join(__dirname, '..', '..', 'activity', '__tests__', 'fixtures', 'claude-permission-prompt.txt'), 'utf8');

describe('the grace, end to end over the shipping monitor (M5)', () => {
  let desk: Desk;
  beforeEach(() => {
    desk = new Desk();
    // A session read from its screen alone (the floor: droid carries no
    // native channel), settled idle on the alternate screen.
    desk.sessions = [{ id: ID, tmuxId: '$3', agent: 'droid', cwd: '/p350' }];
    desk.panes = [{ tmuxId: '$3', paneId: PANE, panePid: 300, activity: Math.floor(desk.now / 1000) - 4 * 3600, alternate: true }];
    desk.captures.set(PANE, viewOf(1));
  });
  afterEach(() => {
    desk.cleanup();
  });

  /** The keys verb over a core whose session is this desk's, its funnel and (with the grace) its clock the monitor's own. */
  function pager(withGrace: boolean): { keys: (key: 'PPage' | 'NPage') => Promise<PocketReplyOutcome> } {
    const keysRig = rig();
    const verb = createScreenKeys({
      ...keysRig.deps,
      watch: {
        readFresh: async () => readingOf(desk.captures.get(PANE) ?? '', { paneId: PANE }),
        nudge: () => undefined
      },
      noteUserInput: (id) => desk.monitor.noteUserInput(id),
      noteRepaint: withGrace ? (id) => desk.monitor.noteGeometryChange(id) : undefined
    });
    return {
      keys: async (key) => {
        const picture = pictureOf(keysRig, desk.captures.get(PANE) ?? '', 'idle');
        return verb.keys(input([{ k: key }], picture), ALLOWED);
      }
    };
  }

  /** Ticks until the session reads idle, then two quiet ticks more, so a case starts from rest. */
  async function settle(): Promise<void> {
    for (let i = 0; i < 12 && desk.last(ID) !== 'idle'; i += 1) await desk.tick();
    await desk.tick();
    await desk.tick();
    expect(desk.last(ID)).toBe('idle');
    desk.statuses.length = 0;
  }

  /** The program pages its own view: its next screen, and output now. */
  function redraw(top: number): void {
    desk.captures.set(PANE, viewOf(top));
    desk.touch();
  }

  it('without the grace (today’s verb), one page reads as work: the redraw is scored running', async () => {
    await settle();
    expect(await pager(false).keys('PPage')).toEqual(DONE);
    redraw(21);
    for (let i = 0; i < 6; i += 1) await desk.tick();
    expect(desk.statuses.map(([, status]) => status)).toContain('running');
  });

  it('with the grace, one page never reads as work: no status moves for the 6 s after it', async () => {
    await settle();
    const pagedAt = desk.now;
    expect(await pager(true).keys('PPage')).toEqual(DONE);
    redraw(21);
    for (let i = 0; i < 6; i += 1) await desk.tick();
    expect(desk.now - pagedAt).toBeGreaterThan(REFLOW_GRACE_MS);
    expect(desk.statuses.map(([, status]) => status)).not.toContain('running');
    expect(desk.last(ID) ?? 'idle').toBe('idle');
  });

  it('a page and back with the grace: neither reads as work', async () => {
    await settle();
    const pages = pager(true);
    expect(await pages.keys('PPage')).toEqual(DONE);
    redraw(21);
    await desk.tick();
    await desk.tick();
    expect(await pages.keys('NPage')).toEqual(DONE);
    redraw(1);
    for (let i = 0; i < 6; i += 1) await desk.tick();
    expect(desk.statuses.map(([, status]) => status)).not.toContain('running');
  });

  it('a numbered question drawn a second after a graced page reads needs_input at its second sighting, inside the grace', async () => {
    await settle();
    const pagedAt = desk.now;
    expect(await pager(true).keys('PPage')).toEqual(DONE);
    // A second later the program draws a numbered question, and the desk ticks.
    desk.now += 1_000;
    desk.captures.set(PANE, DIALOG);
    desk.touch();
    await desk.monitor.tick();
    expect(desk.last(ID)).not.toBe('needs_input');
    await desk.tick();
    expect(desk.last(ID)).toBe('needs_input');
    // Caught at its second sighting, two seconds after the page: still inside the grace.
    expect(desk.now - pagedAt).toBe(2_000);
    expect(desk.now - pagedAt).toBeLessThan(REFLOW_GRACE_MS);
  });
});
