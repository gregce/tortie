/**
 * Phase 293 — the panel under a row, and the batch confirmation, as drawn.
 *
 * The vitest environment is node, so what is read here is static markup from
 * react-dom/server over rows built by the REAL projection. What a person sees
 * is the probe's photograph; this file holds the words, the structure the
 * probe reads, and the rules a later round could break without noticing:
 *
 *  - initial focus never goes to a destructive button (adversary 1's first
 *    correct item, pinned here);
 *  - the rename field is a plain `.input`, never the shared `RenameInput`;
 *  - a busy panel disables every button it has;
 *  - the End and Remove words are the shipped confirmations', byte for byte;
 *  - the batch list shrinks and never grows, and names nothing it did not
 *    name when it opened;
 *  - `null` is never drawn, and no element stamps `data-session-id`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { OverviewSessionActivity } from '@shared/overview';
import type { Session, SessionMachine } from '@shared/types';

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve()
    },
    setSessionsPosition: () => Promise.resolve()
  }
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

/**
 * A server render reads the store's INITIAL state, so seeding the real store
 * changes nothing on the page. This runs the same selector over the real
 * initial state with the seed laid over it, which is what the real hook
 * returns on a server render; every other member of the store is the real one.
 */
const seed = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('../../state/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../state/store')>();
  const real = actual.useApp;
  const hook = (selector: (state: unknown) => unknown): unknown =>
    selector({ ...real.getInitialState(), ...seed.state });
  return { ...actual, useApp: Object.assign(hook, real) };
});
vi.mock('../session-manager-panels.css', () => ({}));

const { InlinePanel, panelInitialFocus } = await import('../InlinePanel');
const { BatchPanel, batchConfirmView } = await import('../BatchPanel');
const { buildManageProjection } = await import('../projection');
const copy = await import('../copy');
const { exactTime } = await import('../format');
const {
  bareRestartConfirm,
  bareRestoreConfirm,
  endSessionConfirm,
  removeSessionConfirm
} = await import('../../state/resume');
type ManageRow = import('../projection').ManageRow;
type SessionSheetInline = import('../../state/session-manager-slice').SessionSheetInline;
type SessionSheetInlineKind = import('../../state/session-manager-slice').SessionSheetInlineKind;
type SessionSheetBatch = import('../../state/session-manager-slice').SessionSheetBatch;

const STUDIO: SessionMachine = {
  id: 'm1',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: true,
  restoreReason: null
};

const WHEN = new Date(2026, 7, 17, 14, 32, 0).getTime();

function sess(id: string, over: Partial<Session> = {}): Session {
  return {
    id,
    name: `name-${id}`,
    tmuxName: `tmux-${id}`,
    projectPath: '/w/one',
    cwd: '/w/one',
    agent: 'claude',
    status: 'running',
    createdAt: WHEN,
    ...over
  };
}

/** Rows as the sheet draws them, from the REAL projection. */
function rowsFor(
  sessions: Session[],
  activity: Record<string, OverviewSessionActivity> = {}
): Map<string, ManageRow> {
  const projection = buildManageProjection({
    sessions,
    pastSessions: [],
    projects: [],
    machineStates: [{ id: 'm1', label: 'Studio' } as never],
    handbacks: {},
    activity,
    restoringIds: {},
    shellPathReady: true,
    canRestore: true,
    canDiscard: true
  });
  const rows = new Map<string, ManageRow>();
  for (const group of projection.managed) for (const row of group.rows) rows.set(row.id, row);
  return rows;
}

function panel(
  row: ManageRow,
  inline: Omit<SessionSheetInline, 'id'>,
  groupLabel?: string
): string {
  const html = renderToStaticMarkup(
    <table>
      <tbody>
        <InlinePanel
          row={row}
          inline={{ id: row.id, ...inline }}
          {...(groupLabel === undefined ? {} : { groupLabel })}
        />
      </tbody>
    </table>
  );
  expect(html).not.toContain('data-session-id');
  expect(html).not.toMatch(/>null</);
  return html;
}

/** Undo React's text escaping, so a sentence is compared as a person reads it. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

function buttons(html: string): string[] {
  return [...html.matchAll(/<button[^>]*>/g)].map((m) => m[0]);
}

// ---------------------------------------------------------------------------

describe('the panel under a row', () => {
  const rows = rowsFor([
    sess('x'),
    sess('r', { machine: STUDIO }),
    sess('e', { status: 'exited', resumeArgv: ['/b/claude', '--resume', 'c'], agentSessionId: 'c' }),
    sess('c', {
      status: 'exited',
      resumeArgv: ['/b/claude', '--resume', 'c'],
      agentSessionId: 'c',
      capture: { provider: 'claude', bin: '/b', exitCodeApproximate: false }
    })
  ]);
  const row = (id: string): ManageRow => rows.get(id)!;

  it('is a whole table row under its session on Managed, spanning seven columns', () => {
    const html = panel(row('x'), { kind: 'end' });
    expect(html).toMatch(
      /<tr class="sm-inline-row" data-manage-inline="x" data-kind="end"><td colSpan="7"><div class="sm-inline"/
    );
  });

  it('is a block under its row on Past, which is not a table', () => {
    const past = { ...row('e'), tab: 'past' as const };
    const html = renderToStaticMarkup(
      <InlinePanel row={past} inline={{ id: 'e', kind: 'details' }} />
    );
    expect(html).toMatch(/^<div class="sm-inline-row sm-inline-row-past" data-manage-inline="e" data-kind="details">/);
  });

  it('says the SHIPPED End words, byte for byte, on this Mac and on a machine', () => {
    for (const id of ['x', 'r']) {
      const words = endSessionConfirm(row(id).session);
      const read = text(panel(row(id), { kind: 'end' }));
      expect(read).toContain(words.title);
      expect(read).toContain(words.body);
      expect(read).toContain(words.confirmLabel);
    }
  });

  it('says the SHIPPED Remove words, and its button is the destructive one', () => {
    const words = removeSessionConfirm(row('e').session);
    const html = panel(row('e'), { kind: 'remove' });
    expect(text(html)).toContain(words.title);
    expect(text(html)).toContain(words.body);
    const destructive = buttons(html).filter((b) => b.includes('btn-destructive'));
    expect(destructive).toHaveLength(1);
  });

  it('asks before opening a closed project’s tab, in the words by what comes back', () => {
    const read = text(panel(row('e'), { kind: 'restore-open' }, 'one'));
    expect(read).toContain(copy.restoreOpenHeading('one'));
    expect(read).toContain(copy.restoreOpenBody('continues'));
    expect(read).toContain(copy.RESTORE_OPEN_CONFIRM);
    const html = panel(row('e'), { kind: 'restore-open' }, 'one');
    expect(buttons(html).some((b) => b.includes('btn-destructive'))).toBe(false);
  });

  it('names the folder the way the projection does when no label is handed in', () => {
    expect(text(panel(row('e'), { kind: 'restore-open' }))).toContain(
      copy.restoreOpenHeading('one')
    );
  });

  it('draws the two bare confirmations as shipped, and neither is destructive', () => {
    const restore = bareRestoreConfirm(row('c').session);
    const restart = bareRestartConfirm(row('c').session);
    const a = panel(row('c'), { kind: 'restore-bare', options: { withoutCapture: true } });
    const b = panel(row('c'), { kind: 'restart-bare', options: { withoutCapture: true } });
    expect(text(a)).toContain(restore.title);
    expect(text(a)).toContain(restore.body);
    expect(text(b)).toContain(restart.title);
    expect(text(b)).toContain(restart.body);
    for (const html of [a, b]) {
      expect(buttons(html).some((one) => one.includes('btn-destructive'))).toBe(false);
    }
  });

  it('a busy panel disables every button it has', () => {
    for (const kind of ['end', 'remove', 'restore-open', 'failed', 'rename'] as const) {
      const html = panel(row('x'), {
        kind,
        busy: true,
        ...(kind === 'failed' ? { retry: 'end' as const, message: 'no' } : {})
      });
      for (const b of buttons(html)) expect(b, `${kind}: ${b}`).toContain('disabled');
      expect(html).toContain('aria-busy="true"');
    }
  });

  it('a failed panel says the failing layer’s sentence verbatim, with Close and Retry', () => {
    const html = panel(row('x'), { kind: 'failed', retry: 'end', message: 'Machine is not ready.' });
    const read = text(html);
    expect(read).toContain(copy.INLINE_FAILED_HEADING.end);
    expect(read).toContain('Machine is not ready.');
    expect(read).not.toContain(copy.RESTORE_STILL_HERE);
    expect(read).toContain(copy.CLOSE);
    expect(read).toContain(copy.RETRY);
  });

  it('a failed restore adds that the saved session is still here', () => {
    for (const retry of ['restore', 'restore-bare'] as const) {
      const read = text(panel(row('e'), { kind: 'failed', retry, message: 'gone' }));
      expect(read).toContain(copy.INLINE_FAILED_HEADING[retry]);
      expect(read).toContain(`gone ${copy.RESTORE_STILL_HERE}`);
    }
  });

  it('the rename field is a plain .input with the name in it, and its failure line is announced', () => {
    const html = panel(row('x'), { kind: 'rename', message: 'Name taken.' });
    expect(html).toMatch(/<input[^>]*class="input sm-rename-input"[^>]*maxLength="120"[^>]*value="name-x"/);
    expect(text(html)).toContain(copy.renameLabel('name-x'));
    expect(html).toMatch(/<p class="sm-inline-error" role="alert">Name taken.<\/p>/);
    // An unchanged name cannot be saved.
    const save = buttons(html).find((b) => b.includes('btn-primary'))!;
    expect(save).toContain('disabled');
  });

  it('Details states the facts and the help line, and never prints null', () => {
    const activity: Record<string, OverviewSessionActivity> = {
      x: {
        sessionId: 'x',
        coverage: 'partial',
        reason: 'ask-only',
        userMessages: 4,
        agentMessages: null,
        lastMessageAt: WHEN,
        lastMessageBy: 'you',
        lastMessageClock: 'message',
        readAt: null
      }
    };
    const local = rowsFor([sess('x')], activity).get('x')!;
    const read = text(panel(local, { kind: 'details' }));
    expect(read).toContain(exactTime(WHEN));
    expect(read).toContain(copy.detailsMessages(activity.x!, 'claude', false));
    expect(read).toContain('replies not recorded');
    expect(read).toContain(copy.detailsLastMessage(activity.x!, 'claude'));
    expect(read).toContain(copy.RECOVERY_FRESH);
    expect(read).toContain(copy.DETAILS_HELP);

    const remote = text(panel(row('r'), { kind: 'details' }));
    expect(remote).toContain(`/w/one · Studio`);
    expect(remote).toContain(copy.detailsMessages(null, 'claude', true));

    const zero = rowsFor([sess('z', { createdAt: 0 })]).get('z')!;
    expect(text(panel(zero, { kind: 'details' }))).toContain(
      `${copy.DETAILS_FACTS.created} ${copy.DASH}`
    );
  });

  it('the saved output is drawn inside the panel, over the store’s one copy', () => {
    const read = text(panel(row('x'), { kind: 'output' }));
    expect(read).toContain(copy.savedOutputHeading('name-x'));
    expect(read).toContain('Tortie has no saved output for this session.');
  });

  it('every panel carries the close icon with its label', () => {
    for (const kind of ['details', 'rename', 'output', 'end', 'remove'] as const) {
      expect(panel(row('x'), { kind })).toContain(`aria-label="${copy.INLINE_CLOSE_LABEL}"`);
    }
  });
});

describe('initial focus never goes to a destructive button', () => {
  const KINDS: SessionSheetInlineKind[] = [
    'details',
    'rename',
    'output',
    'end',
    'remove',
    'restore-open',
    'restore-bare',
    'restart-bare',
    'failed'
  ];

  it('goes to the field, a failed panel’s Close, or the close icon, by kind', () => {
    expect(Object.fromEntries(KINDS.map((k) => [k, panelInitialFocus(k)]))).toEqual({
      details: 'close-icon',
      rename: 'input',
      output: 'close-icon',
      end: 'close-icon',
      remove: 'close-icon',
      'restore-open': 'close-icon',
      'restore-bare': 'close-icon',
      'restart-bare': 'close-icon',
      failed: 'close-button'
    });
  });

  const inline = readFileSync(join(__dirname, '..', 'InlinePanel.tsx'), 'utf8');
  const batch = readFileSync(join(__dirname, '..', 'BatchPanel.tsx'), 'utf8');

  it('gives no destructive or primary button a focus ref, and uses no autoFocus', () => {
    for (const source of [inline, batch]) {
      expect(source).not.toMatch(/autoFocus/);
      for (const m of source.matchAll(/<button[\s\S]*?>/g)) {
        const tag = m[0];
        if (/btn-destructive|btn-primary|confirm\.destructive/.test(tag)) {
          // Done is the one primary that takes the keyboard: it is the only
          // thing left to press once a batch has reported.
          if (tag.includes('doneRef')) continue;
          expect(tag, tag).not.toMatch(/ref=/);
        }
      }
    }
    // The three focus targets are the close icon, a secondary Close and the field.
    expect(inline).toMatch(/ref=\{closeButtonRef\}\s*className="btn btn-secondary"/);
    expect(inline).toMatch(/ref=\{closeIconRef\}\s*className="icon-btn sm-panel-icon"/);
    expect(batch).toMatch(/ref=\{cancelRef\}\s*className="icon-btn sm-panel-icon"/);
  });

  it('the rename field is never the shared RenameInput', () => {
    // Read as code: the file's own header says why, by name.
    const code = inline.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/RenameInput|useRenameDraft/);
    expect(code).toMatch(/className="input sm-rename-input"/);
  });

  it('draws no DOM menu and raises no stacked confirm', () => {
    for (const source of [inline, batch]) {
      expect(source).not.toMatch(/role="menu"|popover|setConfirm\(|data-session-id/);
    }
  });
});

// ---------------------------------------------------------------------------

describe('the batch confirmation', () => {
  const all = [
    sess('a', { name: 'alpha' }),
    sess('b', { name: 'beta', machine: STUDIO }),
    sess('c', { name: 'gamma' }),
    sess('n', { name: 'never-named' })
  ];

  function confirm(
    named: string[],
    over: Partial<SessionSheetBatch> = {}
  ): SessionSheetBatch {
    return {
      runId: 0,
      phase: 'confirm',
      named: named.map((id) => ({ id, where: id === 'b' ? 'one · Studio' : 'one' })),
      skippedAtOpen: { ended: 0, unreachable: 0 },
      targets: [],
      outcomes: {},
      stopRequested: false,
      ...over
    };
  }

  function draw(batch: SessionSheetBatch, sessions: Session[]): string {
    seed.state = { sessions, machineStates: [{ id: 'm1', label: 'Studio' }] };
    try {
      const html = renderToStaticMarkup(
        <BatchPanel batch={batch} rowsById={rowsFor(sessions)} />
      );
      expect(html).not.toContain('data-session-id');
      expect(html).not.toMatch(/>null</);
      return html;
    } finally {
      seed.state = {};
    }
  }

  function targets(html: string): string[] {
    return [...html.matchAll(/data-batch-target="([^"]+)"/g)].map((m) => m[1]!);
  }

  it('names every named session, with where it is and its state', () => {
    const html = draw(confirm(['a', 'b']), all);
    expect(html).toMatch(/<section class="sm-batch" data-phase="confirm" aria-labelledby="sm-batch-title">/);
    expect(targets(html)).toEqual(['a', 'b']);
    const read = text(html);
    expect(read).toContain(copy.batchHeading(2));
    expect(read).toContain('alpha one · Working');
    expect(read).toContain('beta one · Studio · Working');
    expect(read).toContain(copy.batchBody(true));
    expect(read).toContain(copy.batchConfirmLabel(2));
  });

  it('never names a session it did not name when it opened, however eligible', () => {
    // `n` is live, drawn and eligible, and was not named.
    const html = draw(confirm(['a']), all);
    expect(targets(html)).toEqual(['a']);
    expect(text(html)).toContain(copy.batchHeading(1));
  });

  it('shrinks when a named session ends, and counts it under its present reason', () => {
    const now = all.map((one) => (one.id === 'c' ? { ...one, status: 'exited' as const } : one));
    const html = draw(confirm(['a', 'c'], { skippedAtOpen: { ended: 1, unreachable: 0 } }), now);
    expect(targets(html)).toEqual(['a']);
    const read = text(html);
    expect(read).toContain(copy.batchHeading(1));
    expect(read).toContain(copy.batchSkippedLine({ ended: 2, unreachable: 0, gone: 0 }));
    expect(read).toContain(copy.batchBody(false));
    expect(read).not.toContain(copy.batchBody(true));
  });

  it('counts a named session that is no longer drawn as no longer here', () => {
    const html = draw(confirm(['a', 'c']), all.filter((one) => one.id !== 'c'));
    expect(text(html)).toContain(copy.batchSkippedLine({ ended: 0, unreachable: 0, gone: 1 }));
  });

  it('disables its destructive button at zero, and takes the keyboard on its cancel icon', () => {
    const now = all.map((one) => ({ ...one, status: 'exited' as const }));
    const html = draw(confirm(['a']), now);
    const confirmButton = buttons(html).find((b) => b.includes('btn-destructive'))!;
    expect(confirmButton).toContain('disabled');
    expect(html).toContain(`aria-label="${copy.BATCH_CANCEL_LABEL}"`);
  });

  it('reads the drawn rows from a Map or a record alike', () => {
    const rows = rowsFor(all);
    const known = (id: string): boolean => id === 'm1';
    const fromMap = batchConfirmView(confirm(['a', 'b']), rows, known);
    const fromRecord = batchConfirmView(confirm(['a', 'b']), Object.fromEntries(rows), known);
    expect(fromRecord.still.map((one) => one.id)).toEqual(fromMap.still.map((one) => one.id));
    expect(fromMap.still.map((one) => one.id)).toEqual(['a', 'b']);
  });

  it('a session on a machine this run holds no row for leaves the list as unreachable', () => {
    const view = batchConfirmView(confirm(['a', 'b']), rowsFor(all), () => false);
    expect(view.still.map((one) => one.id)).toEqual(['a']);
    expect(view.left).toEqual({ ended: 0, unreachable: 1, gone: 0 });
  });
});

describe('the batch while it runs, and its report', () => {
  const all = [sess('a', { name: 'alpha' }), sess('b', { name: 'beta' }), sess('c', { name: 'gamma' })];

  function running(over: Partial<SessionSheetBatch>): SessionSheetBatch {
    return {
      runId: 7,
      phase: 'running',
      named: all.map((one) => ({ id: one.id, where: 'one' })),
      skippedAtOpen: { ended: 0, unreachable: 0 },
      targets: ['a', 'b', 'c'],
      outcomes: { a: { state: 'ended' }, b: { state: 'ending' }, c: { state: 'pending' } },
      stopRequested: false,
      ...over
    };
  }

  function draw(batch: SessionSheetBatch): string {
    seed.state = { sessions: all };
    try {
      return renderToStaticMarkup(<BatchPanel batch={batch} rowsById={new Map()} />);
    } finally {
      seed.state = {};
    }
  }

  it('says each target’s outcome and offers Stop, and nothing else', () => {
    const html = draw(running({}));
    expect(html).toContain('data-phase="running"');
    const read = text(html);
    expect(read).toContain(copy.batchRunningHeading(3));
    expect(html).toContain('data-batch-target="a" data-outcome="ended"');
    expect(html).toContain('data-batch-target="b" data-outcome="ending"');
    expect(read).toContain('alpha');
    expect(read).toContain('Ended');
    expect(read).toContain('Ending…');
    expect(buttons(html)).toHaveLength(1);
    expect(read).toContain(copy.BATCH_STOP);
  });

  it('reports every target with its outcome, and one Done', () => {
    const html = draw(
      running({
        phase: 'done',
        outcomes: {
          a: { state: 'ended' },
          b: { state: 'failed', message: 'Machine is not ready.' },
          c: { state: 'skipped', reason: 'gone' }
        }
      })
    );
    const read = text(html);
    expect(read).toContain(copy.batchDoneHeading(1, 3));
    expect(read).toContain('Not ended. Machine is not ready.');
    expect(read).toContain('No longer here');
    expect(html).toContain('data-reason="gone"');
    expect(buttons(html)).toHaveLength(1);
    expect(read).toContain(copy.BATCH_DONE);
  });

  it('draws a target that left every list with no name rather than its identifier', () => {
    seed.state = { sessions: [] };
    try {
      const html = renderToStaticMarkup(
        <BatchPanel batch={running({ phase: 'done', outcomes: { a: { state: 'skipped', reason: 'gone' } } })} rowsById={new Map()} />
      );
      expect(text(html)).not.toMatch(/\balpha\b/);
      expect(html).not.toMatch(/<strong>a<\/strong>/);
    } finally {
      seed.state = {};
    }
  });
});
