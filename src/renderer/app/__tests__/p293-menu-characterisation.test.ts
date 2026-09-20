/**
 * Phase 293 — the session menu, recorded as it SHIPPED, before the rewrite.
 *
 * WHY THIS FILE WAS WRITTEN FIRST. Phase 293 rewrites `sessionMenuItems` and
 * `closeSession` to READ one gates predicate (`sessionActionGates` in
 * ../../state/resume.ts) instead of deriving each gate in place, and it gives
 * the policy an optional host. A rewrite like that can move a row's PRESENCE
 * onto the fact that used to decide only whether it is ENABLED, and a parity
 * test between the two arms of the new code would pass, because both arms would
 * share the regression. So the policy's answers were recorded from the PARENT
 * commit (origin/main ac011d9d, session-actions.tsx sha256 9cce73c4…bc6e) and
 * written down below as LITERALS. Nothing in this file is a snapshot a later
 * run can regenerate: every expectation is text a person can read and a diff
 * can show.
 *
 * WHAT IS RECORDED. For every status (7) × where the session runs (this Mac, a
 * machine that offers Restore, a machine that refuses it and is not answering)
 * × restore material and none × captured by SpecStory and not × a handback
 * record and none, under all four environments (`canDiscard` × `shellPathReady`),
 * each item's label, order, glyph, hint, sublabel, `disabled` and
 * `destructive`, and what its `run` calls with no host. That is 168 rows of
 * four columns, 672 menus.
 *
 * HOW TO READ IT. `ROWS` is the vocabulary: one literal per distinct item.
 * `SHAPES` names each distinct menu as an ordered list of rows. `TABLE` says
 * which shape each combination draws under each environment, the columns being
 *   [ canDiscard+ready, canDiscard+waiting, noDiscard+ready, noDiscard+waiting ].
 *
 * THE ONE NAMED DIFFERENCE. At the parent a `discarded` row was neither
 * `unknown` nor ended, so the policy offered it `Rename` and `End session…`.
 * Nothing called the policy with one. The sheet's Past tab is the first caller,
 * and Phase 293 gives `discarded` its own arm: the identity rows and
 * `Copy directory path`, nothing else. `DISCARDED_AT_PARENT` below is what the
 * parent answered, kept as the record, and `DISCARDED_NOW` is what is asserted.
 * `closeSession` moved the same way: for a `discarded` row it called
 * `endSession` at the parent (which then found no such session and did
 * nothing), and it calls nothing now. Every other row of this file is
 * unchanged across the rewrite.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Session, SessionMachine, SessionStatus } from '@shared/types';

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

/** Everything a `run` reached, in order. Emptied before each press. */
const calls: string[] = [];

// The clipboard only. Node's own `navigator` carries the `userAgent` that
// xterm reads at import time, and replacing the whole object takes it away.
vi.stubGlobal('navigator', {
  userAgent: globalThis.navigator?.userAgent ?? 'node',
  platform: 'MacIntel',
  clipboard: {
    writeText: (text: string) => {
      calls.push(`clipboard(${text})`);
      return Promise.resolve();
    }
  }
});

// The glyph cache is filled by a canvas in the running app and is empty under
// node, where `menuGlyph` answers no key at all. The NAME is what this file
// records, so the stand-in answers the name where the app answers the bitmap.
vi.mock('../../icons/codicon-menu-icon', async (original) => {
  const real = await original<typeof import('../../icons/codicon-menu-icon')>();
  return {
    ...real,
    menuGlyph: (name: string) => ({
      icon: { dataUrl: `glyph:${name}`, template: true }
    })
  };
});
vi.mock('../../context/open-session', () => ({
  openSessionContext: (session: Session) => {
    calls.push(`openSessionContext(${session.id})`);
  }
}));
vi.mock('../../overview/open-overview', () => ({
  openOverviewForSession: (id: string, projectPath: string) => {
    calls.push(`openOverviewForSession(${id},${projectPath})`);
    return Promise.resolve();
  }
}));

const { useApp } = await import('../../state/store');
const { sessionMenuItems, closeSession } = await import('../session-actions');

// ---------------------------------------------------------------------------
// The axes
// ---------------------------------------------------------------------------

const STATUSES: readonly SessionStatus[] = [
  'running',
  'needs_input',
  'idle',
  'exited',
  'restorable',
  'unknown',
  'discarded'
];
const WHERES = ['local', 'remote', 'remote-refused'] as const;
const MATERIALS = ['none', 'material'] as const;
const CAPTURES = ['plain', 'captured'] as const;
const HANDBACKS = ['none', 'left'] as const;
/** The four columns of every table row, in this order. */
const ENVS = [
  { canDiscard: true, shellPathReady: true },
  { canDiscard: true, shellPathReady: false },
  { canDiscard: false, shellPathReady: true },
  { canDiscard: false, shellPathReady: false }
] as const;

type Where = (typeof WHERES)[number];
type Material = (typeof MATERIALS)[number];
type Capture = (typeof CAPTURES)[number];
type Handback = (typeof HANDBACKS)[number];

/** 17 August 2026, 14:32 local time. Built from parts so it is not UTC bound. */
const WHEN = new Date(2026, 7, 17, 14, 32, 0).getTime();

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: true,
  restoreReason: null
};
const STUDIO_REFUSED: SessionMachine = {
  ...STUDIO,
  answering: false,
  canRestore: false,
  restoreReason: 'Studio did not answer.'
};

function sessionFor(
  status: SessionStatus,
  where: Where,
  material: Material,
  capture: Capture
): Session {
  return {
    id: 'sess-1',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status,
    createdAt: 0,
    ...(material === 'material'
      ? {
          hasSavedScrollback: true,
          resumeArgv: ['/usr/local/bin/claude', '--resume', 'c0ffee'],
          agentSessionId: 'c0ffee',
          savedOutputAt: WHEN
        }
      : {}),
    ...(capture === 'captured'
      ? {
          capture: {
            provider: 'claude',
            bin: '/opt/specstory',
            exitCodeApproximate: false
          }
        }
      : {}),
    ...(where === 'remote' ? { machine: STUDIO } : {}),
    ...(where === 'remote-refused' ? { machine: STUDIO_REFUSED } : {})
  };
}

/** Every store verb a row can reach answers by writing its own call down. */
function spyStore(): void {
  const verb =
    (name: string) =>
    (...args: unknown[]): undefined => {
      calls.push(`${name}(${args.map((a) => JSON.stringify(a)).join(',')})`);
      return undefined;
    };
  useApp.setState({
    setRenaming: verb('setRenaming'),
    restoreSession: verb('restoreSession') as never,
    restartSession: verb('restartSession') as never,
    resumeInPlace: verb('resumeInPlace') as never,
    openSavedOutput: verb('openSavedOutput'),
    removeSession: verb('removeSession') as never,
    endSession: verb('endSession'),
    // A copy row toasts after the clipboard answers. The toast is not the
    // verb, so it is kept out of the record.
    toast: (() => undefined) as never
  });
}

function setEnv(env: (typeof ENVS)[number], handback: Handback): void {
  useApp.setState({
    shellPathReady: env.shellPathReady,
    canDiscard: () => env.canDiscard,
    handbacks:
      handback === 'left' ? { 'sess-1': { state: 'left', leftAt: 0 } } : {}
  });
}

/** One item as one line: only the fields it carries, in one fixed order. */
function describeItem(item: ReturnType<typeof sessionMenuItems>[number]): string {
  if (item === 'sep') return '---';
  const glyph = item.icon?.dataUrl.replace(/^glyph:/, '');
  calls.length = 0;
  item.run();
  const ran = calls.join(';');
  return [
    item.label,
    ...(glyph !== undefined ? [`glyph=${glyph}`] : []),
    ...(item.hint !== undefined ? [`hint=${item.hint}`] : []),
    ...(item.disabled !== undefined ? [`disabled=${String(item.disabled)}`] : []),
    ...(item.destructive !== undefined
      ? [`destructive=${String(item.destructive)}`]
      : []),
    ...(item.sublabel !== undefined ? [`sub=${item.sublabel}`] : []),
    ...(ran.length > 0 ? [`run=${ran}`] : [])
  ].join(' | ');
}

// ---------------------------------------------------------------------------
// THE RECORD. Literal on purpose. Do not regenerate it from the code.
// ---------------------------------------------------------------------------

/** The vocabulary: every distinct item the parent policy produced. */
const ROWS = {
  rename:
    'Rename | glyph=edit | hint=F2 | run=setRenaming("target:sess-1")',
  restore:
    'Restore | glyph=history | disabled=false | run=restoreSession("sess-1")',
  'restore.waiting':
    'Restore | glyph=history | disabled=true | run=restoreSession("sess-1")',
  restart:
    'Restart | glyph=debug-restart | run=restartSession("sess-1")',
  bareRestore:
    'Restore without saving history | glyph=history | disabled=false | sub=The conversation comes back. SpecStory stops saving this session. | run=restoreSession("sess-1",{"withoutCapture":true})',
  'bareRestore.waiting':
    'Restore without saving history | glyph=history | disabled=true | sub=The conversation comes back. SpecStory stops saving this session. | run=restoreSession("sess-1",{"withoutCapture":true})',
  bareRestart:
    'Restart without saving history | glyph=debug-restart | sub=A fresh session with the same name and directory, and no saving. | run=restartSession("sess-1",{"withoutCapture":true})',
  resume:
    'Resume conversation | glyph=terminal | sub=The command goes on your prompt. You press Enter. | run=resumeInPlace("sess-1")',
  loaded:
    'Show what it loaded… | glyph=layers | run=openSessionContext(sess-1)',
  'loaded.remote':
    'Show what it loaded… | glyph=layers | disabled=true | sub=Tortie has no record of what this session loaded, because that record is only kept for sessions on this Mac.',
  output:
    'Show saved output… | glyph=output | run=openSavedOutput("sess-1")',
  'output.none':
    'Show saved output… | glyph=output | disabled=true | sub=Tortie has no saved output for this session.',
  catchUp:
    'Catch me up… | glyph=comment | run=openOverviewForSession(sess-1,/repo)',
  review:
    'Review changes on Studio | glyph=git-compare | sub=Tortie reads the folder on that machine. It changes nothing there.',
  'review.silent':
    'Review changes on Studio | glyph=git-compare | disabled=true | sub=Studio did not answer, so there is nothing to read yet.',
  conversationId:
    "Copy the agent's conversation id | glyph=copy | sub=c0ffee | run=clipboard(c0ffee)",
  'conversationId.none':
    "Copy the agent's conversation id | glyph=copy | disabled=true | sub=Tortie has no conversation id for this session.",
  'recordPath.none':
    "Copy the agent's record path | glyph=copy | disabled=true | sub=Tortie found no record for this conversation on disk.",
  tortieId:
    "Copy Tortie's session id | glyph=copy | sub=sess-1 | run=clipboard(sess-1)",
  directoryPath:
    'Copy directory path | glyph=copy | sub=/repo | run=clipboard(/repo)',
  remove:
    'Remove | glyph=close | disabled=false | destructive=true | run=removeSession("sess-1")',
  'remove.refused':
    'Remove | glyph=close | disabled=true | destructive=true | run=removeSession("sess-1")',
  end:
    'End session… | glyph=close | destructive=true | run=endSession("sess-1")'
} as const;

type RowName = keyof typeof ROWS | 'sep';

/** Every distinct menu, as an ordered list of rows. */
const SHAPES: Record<string, readonly RowName[]> = {
  M01: ['rename', 'loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'end'],
  M02: ['rename', 'loaded', 'output', 'catchUp', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'end'],
  M03: ['rename', 'resume', 'loaded', 'output', 'catchUp', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'end'],
  M04: ['rename', 'restore', 'loaded.remote', 'output.none', 'catchUp', 'review', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'end'],
  M05: ['rename', 'restore.waiting', 'loaded.remote', 'output.none', 'catchUp', 'review', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'end'],
  M06: ['rename', 'restore', 'loaded.remote', 'output', 'catchUp', 'review', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'end'],
  M07: ['rename', 'restore.waiting', 'loaded.remote', 'output', 'catchUp', 'review', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'end'],
  M08: ['rename', 'loaded.remote', 'output.none', 'catchUp', 'review.silent', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'end'],
  M09: ['rename', 'loaded.remote', 'output', 'catchUp', 'review.silent', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'end'],
  M10: ['rename', 'restart', 'loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M11: ['rename', 'restart', 'loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M12: ['rename', 'restart', 'bareRestart', 'loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M13: ['rename', 'restart', 'bareRestart', 'loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M14: ['rename', 'restore', 'restart', 'loaded', 'output', 'catchUp', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M15: ['rename', 'restore.waiting', 'restart', 'loaded', 'output', 'catchUp', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M16: ['rename', 'restore', 'restart', 'loaded', 'output', 'catchUp', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M17: ['rename', 'restore.waiting', 'restart', 'loaded', 'output', 'catchUp', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M18: ['rename', 'restore', 'restart', 'bareRestore', 'bareRestart', 'loaded', 'output', 'catchUp', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M19: ['rename', 'restore.waiting', 'restart', 'bareRestore.waiting', 'bareRestart', 'loaded', 'output', 'catchUp', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M20: ['rename', 'restore', 'restart', 'bareRestore', 'bareRestart', 'loaded', 'output', 'catchUp', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M21: ['rename', 'restore.waiting', 'restart', 'bareRestore.waiting', 'bareRestart', 'loaded', 'output', 'catchUp', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M22: ['rename', 'restore', 'loaded.remote', 'output.none', 'catchUp', 'review', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M23: ['rename', 'restore.waiting', 'loaded.remote', 'output.none', 'catchUp', 'review', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M24: ['rename', 'restore', 'loaded.remote', 'output.none', 'catchUp', 'review', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M25: ['rename', 'restore.waiting', 'loaded.remote', 'output.none', 'catchUp', 'review', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M26: ['rename', 'restore', 'loaded.remote', 'output', 'catchUp', 'review', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M27: ['rename', 'restore.waiting', 'loaded.remote', 'output', 'catchUp', 'review', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M28: ['rename', 'restore', 'loaded.remote', 'output', 'catchUp', 'review', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M29: ['rename', 'restore.waiting', 'loaded.remote', 'output', 'catchUp', 'review', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M30: ['rename', 'loaded.remote', 'output.none', 'catchUp', 'review.silent', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M31: ['rename', 'loaded.remote', 'output.none', 'catchUp', 'review.silent', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M32: ['rename', 'loaded.remote', 'output', 'catchUp', 'review.silent', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M33: ['rename', 'loaded.remote', 'output', 'catchUp', 'review.silent', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M34: ['rename', 'restore', 'restart', 'loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M35: ['rename', 'restore.waiting', 'restart', 'loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M36: ['rename', 'restore', 'restart', 'loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M37: ['rename', 'restore.waiting', 'restart', 'loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M38: ['rename', 'restore', 'restart', 'bareRestore', 'bareRestart', 'loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M39: ['rename', 'restore.waiting', 'restart', 'bareRestore.waiting', 'bareRestart', 'loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove'],
  M40: ['rename', 'restore', 'restart', 'bareRestore', 'bareRestart', 'loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M41: ['rename', 'restore.waiting', 'restart', 'bareRestore.waiting', 'bareRestart', 'loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath', 'sep', 'remove.refused'],
  M42: ['loaded', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath'],
  M43: ['loaded', 'output', 'catchUp', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath'],
  M44: ['loaded.remote', 'output.none', 'catchUp', 'conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath'],
  M45: ['loaded.remote', 'output', 'catchUp', 'conversationId', 'recordPath.none', 'tortieId', 'directoryPath'],
  // PHASE 293, the named difference. What a removed row draws NOW: what
  // identifies it, and nothing that acts. P01 has no recorded conversation.
  P01: ['conversationId.none', 'recordPath.none', 'tortieId', 'directoryPath'],
  P02: ['conversationId', 'recordPath.none', 'tortieId', 'directoryPath']
};

/**
 * Which menu each combination draws. Key: status, where, material, capture,
 * handback. Columns: canDiscard+ready, canDiscard+waiting, noDiscard+ready,
 * noDiscard+waiting.
 */
const TABLE: Record<string, readonly string[]> = {
  'running local none plain none': ['M01', 'M01', 'M01', 'M01'],
  'running local none plain left': ['M01', 'M01', 'M01', 'M01'],
  'running local none captured none': ['M01', 'M01', 'M01', 'M01'],
  'running local none captured left': ['M01', 'M01', 'M01', 'M01'],
  'running local material plain none': ['M02', 'M02', 'M02', 'M02'],
  'running local material plain left': ['M03', 'M03', 'M03', 'M03'],
  'running local material captured none': ['M02', 'M02', 'M02', 'M02'],
  'running local material captured left': ['M03', 'M03', 'M03', 'M03'],
  'running remote none plain none': ['M04', 'M05', 'M04', 'M05'],
  'running remote none plain left': ['M04', 'M05', 'M04', 'M05'],
  'running remote none captured none': ['M04', 'M05', 'M04', 'M05'],
  'running remote none captured left': ['M04', 'M05', 'M04', 'M05'],
  'running remote material plain none': ['M06', 'M07', 'M06', 'M07'],
  'running remote material plain left': ['M06', 'M07', 'M06', 'M07'],
  'running remote material captured none': ['M06', 'M07', 'M06', 'M07'],
  'running remote material captured left': ['M06', 'M07', 'M06', 'M07'],
  'running remote-refused none plain none': ['M08', 'M08', 'M08', 'M08'],
  'running remote-refused none plain left': ['M08', 'M08', 'M08', 'M08'],
  'running remote-refused none captured none': ['M08', 'M08', 'M08', 'M08'],
  'running remote-refused none captured left': ['M08', 'M08', 'M08', 'M08'],
  'running remote-refused material plain none': ['M09', 'M09', 'M09', 'M09'],
  'running remote-refused material plain left': ['M09', 'M09', 'M09', 'M09'],
  'running remote-refused material captured none': ['M09', 'M09', 'M09', 'M09'],
  'running remote-refused material captured left': ['M09', 'M09', 'M09', 'M09'],
  'needs_input local none plain none': ['M01', 'M01', 'M01', 'M01'],
  'needs_input local none plain left': ['M01', 'M01', 'M01', 'M01'],
  'needs_input local none captured none': ['M01', 'M01', 'M01', 'M01'],
  'needs_input local none captured left': ['M01', 'M01', 'M01', 'M01'],
  'needs_input local material plain none': ['M02', 'M02', 'M02', 'M02'],
  'needs_input local material plain left': ['M03', 'M03', 'M03', 'M03'],
  'needs_input local material captured none': ['M02', 'M02', 'M02', 'M02'],
  'needs_input local material captured left': ['M03', 'M03', 'M03', 'M03'],
  'needs_input remote none plain none': ['M04', 'M05', 'M04', 'M05'],
  'needs_input remote none plain left': ['M04', 'M05', 'M04', 'M05'],
  'needs_input remote none captured none': ['M04', 'M05', 'M04', 'M05'],
  'needs_input remote none captured left': ['M04', 'M05', 'M04', 'M05'],
  'needs_input remote material plain none': ['M06', 'M07', 'M06', 'M07'],
  'needs_input remote material plain left': ['M06', 'M07', 'M06', 'M07'],
  'needs_input remote material captured none': ['M06', 'M07', 'M06', 'M07'],
  'needs_input remote material captured left': ['M06', 'M07', 'M06', 'M07'],
  'needs_input remote-refused none plain none': ['M08', 'M08', 'M08', 'M08'],
  'needs_input remote-refused none plain left': ['M08', 'M08', 'M08', 'M08'],
  'needs_input remote-refused none captured none': ['M08', 'M08', 'M08', 'M08'],
  'needs_input remote-refused none captured left': ['M08', 'M08', 'M08', 'M08'],
  'needs_input remote-refused material plain none': ['M09', 'M09', 'M09', 'M09'],
  'needs_input remote-refused material plain left': ['M09', 'M09', 'M09', 'M09'],
  'needs_input remote-refused material captured none': ['M09', 'M09', 'M09', 'M09'],
  'needs_input remote-refused material captured left': ['M09', 'M09', 'M09', 'M09'],
  'idle local none plain none': ['M01', 'M01', 'M01', 'M01'],
  'idle local none plain left': ['M01', 'M01', 'M01', 'M01'],
  'idle local none captured none': ['M01', 'M01', 'M01', 'M01'],
  'idle local none captured left': ['M01', 'M01', 'M01', 'M01'],
  'idle local material plain none': ['M02', 'M02', 'M02', 'M02'],
  'idle local material plain left': ['M03', 'M03', 'M03', 'M03'],
  'idle local material captured none': ['M02', 'M02', 'M02', 'M02'],
  'idle local material captured left': ['M03', 'M03', 'M03', 'M03'],
  'idle remote none plain none': ['M04', 'M05', 'M04', 'M05'],
  'idle remote none plain left': ['M04', 'M05', 'M04', 'M05'],
  'idle remote none captured none': ['M04', 'M05', 'M04', 'M05'],
  'idle remote none captured left': ['M04', 'M05', 'M04', 'M05'],
  'idle remote material plain none': ['M06', 'M07', 'M06', 'M07'],
  'idle remote material plain left': ['M06', 'M07', 'M06', 'M07'],
  'idle remote material captured none': ['M06', 'M07', 'M06', 'M07'],
  'idle remote material captured left': ['M06', 'M07', 'M06', 'M07'],
  'idle remote-refused none plain none': ['M08', 'M08', 'M08', 'M08'],
  'idle remote-refused none plain left': ['M08', 'M08', 'M08', 'M08'],
  'idle remote-refused none captured none': ['M08', 'M08', 'M08', 'M08'],
  'idle remote-refused none captured left': ['M08', 'M08', 'M08', 'M08'],
  'idle remote-refused material plain none': ['M09', 'M09', 'M09', 'M09'],
  'idle remote-refused material plain left': ['M09', 'M09', 'M09', 'M09'],
  'idle remote-refused material captured none': ['M09', 'M09', 'M09', 'M09'],
  'idle remote-refused material captured left': ['M09', 'M09', 'M09', 'M09'],
  'exited local none plain none': ['M10', 'M10', 'M11', 'M11'],
  'exited local none plain left': ['M10', 'M10', 'M11', 'M11'],
  'exited local none captured none': ['M12', 'M12', 'M13', 'M13'],
  'exited local none captured left': ['M12', 'M12', 'M13', 'M13'],
  'exited local material plain none': ['M14', 'M15', 'M16', 'M17'],
  'exited local material plain left': ['M14', 'M15', 'M16', 'M17'],
  'exited local material captured none': ['M18', 'M19', 'M20', 'M21'],
  'exited local material captured left': ['M18', 'M19', 'M20', 'M21'],
  'exited remote none plain none': ['M22', 'M23', 'M24', 'M25'],
  'exited remote none plain left': ['M22', 'M23', 'M24', 'M25'],
  'exited remote none captured none': ['M22', 'M23', 'M24', 'M25'],
  'exited remote none captured left': ['M22', 'M23', 'M24', 'M25'],
  'exited remote material plain none': ['M26', 'M27', 'M28', 'M29'],
  'exited remote material plain left': ['M26', 'M27', 'M28', 'M29'],
  'exited remote material captured none': ['M26', 'M27', 'M28', 'M29'],
  'exited remote material captured left': ['M26', 'M27', 'M28', 'M29'],
  'exited remote-refused none plain none': ['M30', 'M30', 'M31', 'M31'],
  'exited remote-refused none plain left': ['M30', 'M30', 'M31', 'M31'],
  'exited remote-refused none captured none': ['M30', 'M30', 'M31', 'M31'],
  'exited remote-refused none captured left': ['M30', 'M30', 'M31', 'M31'],
  'exited remote-refused material plain none': ['M32', 'M32', 'M33', 'M33'],
  'exited remote-refused material plain left': ['M32', 'M32', 'M33', 'M33'],
  'exited remote-refused material captured none': ['M32', 'M32', 'M33', 'M33'],
  'exited remote-refused material captured left': ['M32', 'M32', 'M33', 'M33'],
  'restorable local none plain none': ['M34', 'M35', 'M36', 'M37'],
  'restorable local none plain left': ['M34', 'M35', 'M36', 'M37'],
  'restorable local none captured none': ['M38', 'M39', 'M40', 'M41'],
  'restorable local none captured left': ['M38', 'M39', 'M40', 'M41'],
  'restorable local material plain none': ['M14', 'M15', 'M16', 'M17'],
  'restorable local material plain left': ['M14', 'M15', 'M16', 'M17'],
  'restorable local material captured none': ['M18', 'M19', 'M20', 'M21'],
  'restorable local material captured left': ['M18', 'M19', 'M20', 'M21'],
  'restorable remote none plain none': ['M22', 'M23', 'M24', 'M25'],
  'restorable remote none plain left': ['M22', 'M23', 'M24', 'M25'],
  'restorable remote none captured none': ['M22', 'M23', 'M24', 'M25'],
  'restorable remote none captured left': ['M22', 'M23', 'M24', 'M25'],
  'restorable remote material plain none': ['M26', 'M27', 'M28', 'M29'],
  'restorable remote material plain left': ['M26', 'M27', 'M28', 'M29'],
  'restorable remote material captured none': ['M26', 'M27', 'M28', 'M29'],
  'restorable remote material captured left': ['M26', 'M27', 'M28', 'M29'],
  'restorable remote-refused none plain none': ['M30', 'M30', 'M31', 'M31'],
  'restorable remote-refused none plain left': ['M30', 'M30', 'M31', 'M31'],
  'restorable remote-refused none captured none': ['M30', 'M30', 'M31', 'M31'],
  'restorable remote-refused none captured left': ['M30', 'M30', 'M31', 'M31'],
  'restorable remote-refused material plain none': ['M32', 'M32', 'M33', 'M33'],
  'restorable remote-refused material plain left': ['M32', 'M32', 'M33', 'M33'],
  'restorable remote-refused material captured none': ['M32', 'M32', 'M33', 'M33'],
  'restorable remote-refused material captured left': ['M32', 'M32', 'M33', 'M33'],
  'unknown local none plain none': ['M42', 'M42', 'M42', 'M42'],
  'unknown local none plain left': ['M42', 'M42', 'M42', 'M42'],
  'unknown local none captured none': ['M42', 'M42', 'M42', 'M42'],
  'unknown local none captured left': ['M42', 'M42', 'M42', 'M42'],
  'unknown local material plain none': ['M43', 'M43', 'M43', 'M43'],
  'unknown local material plain left': ['M43', 'M43', 'M43', 'M43'],
  'unknown local material captured none': ['M43', 'M43', 'M43', 'M43'],
  'unknown local material captured left': ['M43', 'M43', 'M43', 'M43'],
  'unknown remote none plain none': ['M44', 'M44', 'M44', 'M44'],
  'unknown remote none plain left': ['M44', 'M44', 'M44', 'M44'],
  'unknown remote none captured none': ['M44', 'M44', 'M44', 'M44'],
  'unknown remote none captured left': ['M44', 'M44', 'M44', 'M44'],
  'unknown remote material plain none': ['M45', 'M45', 'M45', 'M45'],
  'unknown remote material plain left': ['M45', 'M45', 'M45', 'M45'],
  'unknown remote material captured none': ['M45', 'M45', 'M45', 'M45'],
  'unknown remote material captured left': ['M45', 'M45', 'M45', 'M45'],
  'unknown remote-refused none plain none': ['M44', 'M44', 'M44', 'M44'],
  'unknown remote-refused none plain left': ['M44', 'M44', 'M44', 'M44'],
  'unknown remote-refused none captured none': ['M44', 'M44', 'M44', 'M44'],
  'unknown remote-refused none captured left': ['M44', 'M44', 'M44', 'M44'],
  'unknown remote-refused material plain none': ['M45', 'M45', 'M45', 'M45'],
  'unknown remote-refused material plain left': ['M45', 'M45', 'M45', 'M45'],
  'unknown remote-refused material captured none': ['M45', 'M45', 'M45', 'M45'],
  'unknown remote-refused material captured left': ['M45', 'M45', 'M45', 'M45']
};

/**
 * What the PARENT answered for a `discarded` row: the live menu, `Rename` and
 * `End session…` included, because the status fell through to the last arm.
 */
const DISCARDED_AT_PARENT: Record<string, readonly string[]> = {
  'discarded local none plain none': ['M01', 'M01', 'M01', 'M01'],
  'discarded local none plain left': ['M01', 'M01', 'M01', 'M01'],
  'discarded local none captured none': ['M01', 'M01', 'M01', 'M01'],
  'discarded local none captured left': ['M01', 'M01', 'M01', 'M01'],
  'discarded local material plain none': ['M02', 'M02', 'M02', 'M02'],
  'discarded local material plain left': ['M03', 'M03', 'M03', 'M03'],
  'discarded local material captured none': ['M02', 'M02', 'M02', 'M02'],
  'discarded local material captured left': ['M03', 'M03', 'M03', 'M03'],
  'discarded remote none plain none': ['M04', 'M05', 'M04', 'M05'],
  'discarded remote none plain left': ['M04', 'M05', 'M04', 'M05'],
  'discarded remote none captured none': ['M04', 'M05', 'M04', 'M05'],
  'discarded remote none captured left': ['M04', 'M05', 'M04', 'M05'],
  'discarded remote material plain none': ['M06', 'M07', 'M06', 'M07'],
  'discarded remote material plain left': ['M06', 'M07', 'M06', 'M07'],
  'discarded remote material captured none': ['M06', 'M07', 'M06', 'M07'],
  'discarded remote material captured left': ['M06', 'M07', 'M06', 'M07'],
  'discarded remote-refused none plain none': ['M08', 'M08', 'M08', 'M08'],
  'discarded remote-refused none plain left': ['M08', 'M08', 'M08', 'M08'],
  'discarded remote-refused none captured none': ['M08', 'M08', 'M08', 'M08'],
  'discarded remote-refused none captured left': ['M08', 'M08', 'M08', 'M08'],
  'discarded remote-refused material plain none': ['M09', 'M09', 'M09', 'M09'],
  'discarded remote-refused material plain left': ['M09', 'M09', 'M09', 'M09'],
  'discarded remote-refused material captured none': ['M09', 'M09', 'M09', 'M09'],
  'discarded remote-refused material captured left': ['M09', 'M09', 'M09', 'M09']
};

/**
 * What a `discarded` row answers NOW, and what this file asserts. No machine,
 * no capture, no handback and no environment moves it: a removed session is
 * offered nothing that acts, whatever else is true of it.
 */
const DISCARDED_NOW: Record<string, readonly string[]> = {
  'discarded local none plain none': ['P01', 'P01', 'P01', 'P01'],
  'discarded local none plain left': ['P01', 'P01', 'P01', 'P01'],
  'discarded local none captured none': ['P01', 'P01', 'P01', 'P01'],
  'discarded local none captured left': ['P01', 'P01', 'P01', 'P01'],
  'discarded local material plain none': ['P02', 'P02', 'P02', 'P02'],
  'discarded local material plain left': ['P02', 'P02', 'P02', 'P02'],
  'discarded local material captured none': ['P02', 'P02', 'P02', 'P02'],
  'discarded local material captured left': ['P02', 'P02', 'P02', 'P02'],
  'discarded remote none plain none': ['P01', 'P01', 'P01', 'P01'],
  'discarded remote none plain left': ['P01', 'P01', 'P01', 'P01'],
  'discarded remote none captured none': ['P01', 'P01', 'P01', 'P01'],
  'discarded remote none captured left': ['P01', 'P01', 'P01', 'P01'],
  'discarded remote material plain none': ['P02', 'P02', 'P02', 'P02'],
  'discarded remote material plain left': ['P02', 'P02', 'P02', 'P02'],
  'discarded remote material captured none': ['P02', 'P02', 'P02', 'P02'],
  'discarded remote material captured left': ['P02', 'P02', 'P02', 'P02'],
  'discarded remote-refused none plain none': ['P01', 'P01', 'P01', 'P01'],
  'discarded remote-refused none plain left': ['P01', 'P01', 'P01', 'P01'],
  'discarded remote-refused none captured none': ['P01', 'P01', 'P01', 'P01'],
  'discarded remote-refused none captured left': ['P01', 'P01', 'P01', 'P01'],
  'discarded remote-refused material plain none': ['P02', 'P02', 'P02', 'P02'],
  'discarded remote-refused material plain left': ['P02', 'P02', 'P02', 'P02'],
  'discarded remote-refused material captured none': ['P02', 'P02', 'P02', 'P02'],
  'discarded remote-refused material captured left': ['P02', 'P02', 'P02', 'P02']
};

/**
 * What `closeSession` called for each status at the PARENT, local, no material.
 * `discarded` fell into the arm for a live session.
 */
const CLOSES_AT_PARENT: Record<SessionStatus, string> = {
  running: 'endSession("sess-1")',
  needs_input: 'endSession("sess-1")',
  idle: 'endSession("sess-1")',
  exited: 'removeSession("sess-1")',
  restorable: 'removeSession("sess-1")',
  unknown: '',
  discarded: 'endSession("sess-1")'
};

/** What it calls NOW. One status moved, and it is the named one. */
const CLOSES: Record<SessionStatus, string> = {
  ...CLOSES_AT_PARENT,
  discarded: ''
};

/**
 * The asserted `discarded` rows.
 *
 * THE RECORD OF THE SWITCH, measured on 2026-09-19 over a pristine export of
 * the parent commit (ac011d9d, session-actions.tsx sha256 9cce73c4…bc6e), in a
 * scratch directory and never in the worktree:
 *
 *  - with this constant set to `DISCARDED_AT_PARENT` and `CLOSES` set to
 *    `CLOSES_AT_PARENT`, the untouched policy answered 177 of 178 green. The
 *    one red is `moved the × for a discarded row and for no other status`,
 *    which asks for a difference and is red by construction when there is
 *    none;
 *  - with the two constants as they stand below, the same untouched policy
 *    answered 153 green and 25 red, the 25 being the 24 `discarded` rows and
 *    the `discarded` × and no other;
 *  - over the rewritten policy, as they stand below, 178 of 178 green.
 */
const DISCARDED: Record<string, readonly string[]> = DISCARDED_NOW;

// ---------------------------------------------------------------------------
// The assertions
// ---------------------------------------------------------------------------

function expectedMenu(shape: string): string[] {
  const rows = SHAPES[shape];
  if (rows === undefined) throw new Error(`no shape named ${shape}`);
  return rows.map((name) => (name === 'sep' ? '---' : ROWS[name]));
}

function comboKey(
  status: SessionStatus,
  where: Where,
  material: Material,
  capture: Capture,
  handback: Handback
): string {
  return `${status} ${where} ${material} ${capture} ${handback}`;
}

describe('the session menu, as it shipped before Phase 293', () => {
  it('records every combination exactly once', () => {
    const wanted: string[] = [];
    for (const status of STATUSES)
      for (const where of WHERES)
        for (const material of MATERIALS)
          for (const capture of CAPTURES)
            for (const handback of HANDBACKS)
              wanted.push(comboKey(status, where, material, capture, handback));
    expect([...Object.keys(TABLE), ...Object.keys(DISCARDED)].sort()).toEqual(
      [...wanted].sort()
    );
    expect(wanted.length).toBe(168);
  });

  for (const status of STATUSES)
    for (const where of WHERES)
      for (const material of MATERIALS)
        for (const capture of CAPTURES)
          for (const handback of HANDBACKS) {
            const key = comboKey(status, where, material, capture, handback);
            it(key, () => {
              spyStore();
              const shapes = status === 'discarded' ? DISCARDED[key] : TABLE[key];
              expect(shapes, `no row for ${key}`).toBeDefined();
              ENVS.forEach((env, column) => {
                setEnv(env, handback);
                const session = sessionFor(status, where, material, capture);
                const got = sessionMenuItems(session, 'target:sess-1').map(
                  describeItem
                );
                expect(
                  got,
                  `${key} canDiscard=${String(env.canDiscard)} ` +
                    `shellPathReady=${String(env.shellPathReady)}`
                ).toEqual(expectedMenu(shapes![column]!));
              });
            });
          }
});

describe('the one named difference', () => {
  it('moved every discarded row, and moved it the same way', () => {
    expect(Object.keys(DISCARDED_NOW).sort()).toEqual(
      Object.keys(DISCARDED_AT_PARENT).sort()
    );
    for (const key of Object.keys(DISCARDED_AT_PARENT)) {
      for (const shape of DISCARDED_AT_PARENT[key]!) {
        // The parent offered a removed session the two verbs that act on a
        // running one.
        expect(SHAPES[shape]).toContain('rename');
        expect(SHAPES[shape]).toContain('end');
      }
      for (const shape of DISCARDED_NOW[key]!) {
        const rows = SHAPES[shape]!;
        expect(rows).not.toContain('rename');
        expect(rows).not.toContain('end');
        // Nothing that acts, nothing that goes anywhere, no separator.
        expect(rows.every((name) => /^(conversationId|recordPath|tortieId|directoryPath)/.test(name))).toBe(true);
      }
    }
  });

  it('moved the × for a discarded row and for no other status', () => {
    const moved = STATUSES.filter(
      (status) => CLOSES[status] !== CLOSES_AT_PARENT[status]
    );
    expect(moved).toEqual(['discarded']);
  });
});

describe('the × on a row, as it shipped before Phase 293', () => {
  for (const status of STATUSES) {
    it(`${status}: ${CLOSES[status] === '' ? 'calls nothing' : CLOSES[status]}`, () => {
      spyStore();
      setEnv(ENVS[0], 'none');
      calls.length = 0;
      closeSession(sessionFor(status, 'local', 'none', 'plain'));
      expect(calls.join(';')).toBe(CLOSES[status]);
    });
  }
});
