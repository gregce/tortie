/**
 * Phase 353, entry Phase 354 mechanism 2 (build/p353/SPEC.md D354-4, Q9's default): NO CONVERSATION IS LOST BY THE
 * MOVE. A row created before this phase in a folder tmux reads (a `#` it expands, or a final `;`) ran its pane in
 * HOME, or in another folder, and its agent filed the conversation there; pi, measured, opens an EMPTY session under
 * the same id from any other folder (its registry note), qwen refuses. So a restore hands tmux such a row's folder
 * EXACTLY as recorded, today's `-c` byte for byte, and the pane comes back where it ran. Every other row, and every
 * row this build creates (its contract says `folderHeld`), starts in its folder.
 *
 * Held here: `folderAsRecordedFor`'s table, written by hand from its four clauses (no marker; a folder the rule
 * changes; not a shell; a resume to arm); and the SHIPPING `restoreSessionInTmux` handing `createSession` exactly
 * that, whichever folder it hands (the recorded one or, when that is gone, the project's).
 *
 * tmux and the snapshots are recorders (this is about the decision); the folders are real, under a scratch folder.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManifestSessionRecord } from '../../manifest';

const scratch = mkdtempSync(join(tmpdir(), 'gmux-p354-restore-'));

/** Every input `createSession` was handed, and every `send-keys` the restore issued. */
const creates: Array<Record<string, unknown>> = [];
const sent: string[][] = [];
/** The snapshot the restore will find, or none. */
let snapshot: string | null = null;

vi.mock('../../tmux', async () => {
  const errors = await vi.importActual<typeof import('../../tmux/errors')>('../../tmux/errors');
  return {
    ...errors,
    installUserPath: () => Promise.resolve(process.env['PATH'] ?? ''),
    createSession: (input: Record<string, unknown>) => {
      creates.push({ ...input });
      return Promise.resolve({ sessionId: '$354', tmuxName: 'p354', createdAt: 0, attached: false, windows: 1 });
    },
    execTmux: (args: string[]) => {
      sent.push([...args]);
      return Promise.resolve('');
    },
    managedPaneEnv: () => ({})
  };
});

vi.mock('../snapshots', () => ({
  resolveSnapshot: () => (snapshot === null ? null : { path: snapshot, rejected: 0 })
}));

const { folderAsRecordedFor, restoreSessionInTmux } = await import('../restore');

const BS = String.fromCharCode(92);
const U = '019a0000-0000-7000-8000-000000000354';
const PI = '/opt/p354/bin/pi';

const folder = (...parts: string[]): string => {
  const at = join(scratch, ...parts);
  mkdirSync(at, { recursive: true });
  return at;
};
const PROJECT = folder('proj');
const HASH = folder('proj', 'C#Tools');
const HASH_PARENT = folder('proj', 'C#', 'app');
const BSEMI = folder('proj', `semi${BS};`);
const PLAIN = folder('proj', 'plain');
const MID_SEMI = folder('proj', 'a;b');

/** What the row's recovery contract says, by the build that wrote it. */
function contract(agent: string, held: boolean): NonNullable<ManifestSessionRecord['agentContract']> {
  return {
    v: 1,
    at: 1,
    bin: agent === 'shell' ? '/bin/zsh' : PI,
    requiresOriginalCwd: agent === 'pi',
    bareResumeIsDangerous: false,
    resumeStrategy: agent === 'shell' ? 'none' : 'flag-uuid',
    resumeTemplate: agent === 'shell' ? [] : ['--session-id', '<sessionId>'],
    resumeExtrasPosition: 'trailing',
    idCapture: agent === 'shell' ? 'none' : 'preassigned',
    sessionStore: '',
    cwdReal: '',
    projectReal: PROJECT,
    captureRouteVerified: true,
    flagsVerifiedVersion: null,
    flagsVerifiedAgainst: 'never',
    ...(held ? { folderHeld: true as const } : {})
  };
}

function row(over: Partial<ManifestSessionRecord> & { held?: boolean | 'none' } = {}): ManifestSessionRecord {
  const { held = false, ...patch } = over;
  const agent = (patch.agent ?? 'pi') as string;
  const base: ManifestSessionRecord = {
    id: 'p354-row',
    name: 'p354 row',
    tmuxName: 'p354-row',
    projectPath: PROJECT,
    cwd: HASH,
    agent: agent as ManifestSessionRecord['agent'],
    status: 'restorable',
    createdAt: 1,
    lastSeen: 2,
    argv: agent === 'shell' ? ['/bin/zsh'] : [PI, '--session-id', U],
    ...(agent === 'shell' ? {} : { resumeArgv: [PI, '--session-id', U], agentSessionId: U }),
    ...(held === 'none' ? {} : { agentContract: contract(agent, held) })
  };
  return { ...base, ...patch };
}

beforeEach(() => {
  creates.length = 0;
  sent.length = 0;
  snapshot = null;
});

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe('folderAsRecordedFor: four clauses, every answer written by hand (D354-4)', () => {
  const table: Array<[string, ManifestSessionRecord, boolean]> = [
    ['a pi row created before this phase in C#Tools, with a resume', row(), true],
    ['the same row created by this build (its contract says folderHeld)', row({ held: true }), false],
    ['a pi row with no contract at all, in C#Tools, with a resume', row({ held: 'none' }), true],
    ['a shell row created before this phase in C#Tools', row({ agent: 'shell' }), false],
    // A shell keeps no conversation, even when its row carries a command to arm (a planted or an older row).
    ['a shell row before this phase in C#Tools that carries a resume argv', row({ agent: 'shell', resumeArgv: ['/bin/zsh', '-l'] }), false],
    ['a pi row before this phase in C#Tools with no resume to arm', row({ resumeArgv: [] }), false],
    ['a codex row before this phase in C#Tools never harvested', row({ agent: 'codex', resumeArgv: [] }), false],
    // tmux kept `C#/app` at the parent (`#/` is no alias), so its raw folder IS its folder: true, and harmless.
    ['a claude row before this phase in C#/app, with a resume', row({ agent: 'claude', cwd: HASH_PARENT }), true],
    ['a pi row before this phase in semi\\;, with a resume', row({ cwd: BSEMI }), true],
    ['a pi row before this phase in a plain folder', row({ cwd: PLAIN }), false],
    ['a pi row before this phase in a;b, a ; that is not last', row({ cwd: MID_SEMI }), false],
    ['a far row with no folder named', row({ cwd: '', machineId: 'studio' }), false],
    ['a far row before this phase in C#Tools, with a resume', row({ cwd: '/srv/C#Tools', machineId: 'studio' }), true],
    ['a far row this build created in C#Tools', row({ cwd: '/srv/C#Tools', machineId: 'studio', held: true }), false]
  ];
  for (const [name, rec, want] of table) {
    it(`${name}: ${String(want)}`, () => {
      expect(folderAsRecordedFor(rec)).toBe(want);
    });
  }
});

describe('the shipping restore hands createSession exactly that', () => {
  it('a pre-fix row comes back in its folder as recorded, and a row this build made in its folder held back', async () => {
    const before = await restoreSessionInTmux(row());
    expect(before.kind).toBe('armed');
    expect(creates[0]?.['cwd']).toBe(HASH);
    expect(creates[0]?.['folderAsRecorded']).toBe(true);

    creates.length = 0;
    await restoreSessionInTmux(row({ held: true }));
    expect(creates[0]?.['cwd']).toBe(HASH);
    expect('folderAsRecorded' in (creates[0] ?? {})).toBe(false);
  });

  it('every other row is handed no folderAsRecorded at all', async () => {
    for (const rec of [row({ agent: 'shell' }), row({ resumeArgv: [] }), row({ cwd: PLAIN }), row({ cwd: MID_SEMI })]) {
      creates.length = 0;
      await restoreSessionInTmux(rec);
      expect(creates).toHaveLength(1);
      expect('folderAsRecorded' in (creates[0] ?? {}), rec.cwd).toBe(false);
    }
  });

  it("the decision is the row's, so it holds for the project's folder when the recorded one is gone", async () => {
    // claude finds its conversation from any folder, so the restore may fall back to the project; its row recorded
    // it may (requiresOriginalCwd false), and the pre-fix row still comes back exactly as today's restore would.
    const gone = join(scratch, 'proj', 'C#Gone');
    const rec = row({ agent: 'claude', cwd: gone, agentContract: { ...contract('claude', false), requiresOriginalCwd: false } });
    await restoreSessionInTmux(rec);
    expect(creates[0]?.['cwd']).toBe(PROJECT);
    expect(creates[0]?.['folderAsRecorded']).toBe(true);
  });
});

describe('the remote restore asks the same decision of the same row', () => {
  /** A file's code with its comments taken out, so prose cannot answer a question about code. */
  const codeOf = (rel: string): string =>
    readFileSync(join(__dirname, '..', '..', rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

  it('hands remoteCreateArgs folderAsRecorded exactly when folderAsRecordedFor answers true for the record, once', () => {
    const code = codeOf('machines/remote-restore.ts');
    expect(code).toContain("import { folderAsRecordedFor } from '../restore/restore';");
    const call = code.slice(code.indexOf('remoteCreateArgs({'), code.indexOf('});', code.indexOf('remoteCreateArgs({')));
    expect(call).toContain('cwd: record.cwd,');
    expect(call).toContain('...(folderAsRecordedFor(record) ? { folderAsRecorded: true as const } : {}),');
    expect(code.split('folderAsRecordedFor(').length - 1).toBe(1);
  });

  it('and the local restore asks it once, of the row it restores', () => {
    const code = codeOf('restore/restore.ts');
    expect(code).toContain('...(folderAsRecordedFor(rec) ? { folderAsRecorded: true as const } : {})');
    // The declaration and the one call.
    expect(code.split('folderAsRecordedFor(').length - 1).toBe(2);
  });
});
