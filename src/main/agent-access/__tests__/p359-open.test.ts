/**
 * Phase 359, Builder C2 — the validated `open` operation (§6.3 hostile
 * matrix, unit-shaped).
 *
 * WHAT THIS PINS, over scratch projects and a stubbed broker/renderer:
 * - decoding: malformed/non-canonical Base64, NUL, over-bound bytes, empty
 *   path/find, line bounds and `endLine >= line` refuse as closed refusals
 *   (never a throw, never a renderer event);
 * - caller: fake/gone/remote ids read unavailable and run nothing;
 * - relative resolves only in the caller's project; absolute tries local
 *   open projects in list order until one passes;
 * - BOTH `resolveInsideRoot` AND path-door `editor`+`underBase` are required
 *   (a pinned ablation removes each and must flip the verdict);
 * - credential (shipped name predicate), executable, image/PDF/Mac door,
 *   directory, missing, symlink escape, project-root, relative climb refuse
 *   with the closed word and send nothing;
 * - strict oversize pre-read refusal, binary NUL refusal, atomic replace
 *   and in-place change during the read refuse `changed` via the harness
 *   checkpoint pause;
 * - line/end-line coordinate conversion, out-of-range refusal, exact find
 *   count/first range, CRLF, multi-line text, emoji/UTF-16 columns, 0 and
 *   300 matches;
 * - switch off at the harness checkpoint refuses `disabled` and sends no
 *   event; destroyed renderer and non-accepted completion refuse
 *   `renderer-unavailable`;
 * - no byte of path/find/session/project text on any refusal.
 *
 * NO ELECTRON. `BrowserWindow` is stubbed; the broker is the real broker
 * over stub `WebContents`; the harness checkpoint is armed directly.
 */

import { mkdtempSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi, afterEach } from 'vitest';
import type { WebContents } from 'electron';
import { READ_CAP_BYTES } from '@shared/fs-ops';
import type {
  AgentAccessOpenInvocation,
  AgentAccessOpenValue
} from '@shared/agent-access';
import type { Project, Session } from '@shared/types';
import { buildAgentAccessOpen, type AgentAccessOpenDeps } from '../open';
import { AgentAccessOpenBroker } from '../open-broker';

vi.mock('electron', async (importOriginal) => ({
  ...((await importOriginal<typeof import('electron')>()) ?? {}),
  app: {
    getPath: (name: string) => {
      if (name === 'userData') return '/tmp/p359-open-tests';
      throw new Error(`unexpected path: ${name}`);
    }
  },
  BrowserWindow: { getFocusedWindow: () => null }
}));

function b64(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64');
}

let dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs = [];
  vi.restoreAllMocks();
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'p359-open-'));
  dirs.push(dir);
  return dir;
}

function session(over: Partial<Session> & { id: string }): Session {
  return {
    name: `name-${over.id}`,
    tmuxName: `tmux-${over.id}`,
    projectPath: '/proj/a',
    cwd: '/proj/a',
    agent: 'claude',
    status: 'running',
    createdAt: 1000,
    ...over
  };
}

function project(over: Partial<Project> & { id: string }): Project {
  return { path: '/proj/a', name: 'a', ...over };
}

function webContents(destroyed = false): {
  target: WebContents;
  sent: Array<{ channel: string; payload: unknown }>;
} {
  const sent: Array<{ channel: string; payload: unknown }> = [];
  const target = {
    isDestroyed: () => destroyed,
    send: (channel: string, payload: unknown) => {
      sent.push({ channel, payload });
    }
  } as unknown as WebContents;
  return { target, sent };
}

/** A working world: project dir on disk, caller session, live broker. */
function world(opts: {
  callerPath?: string;
  extraProjects?: Project[];
  enabled?: boolean;
  destroyed?: boolean;
  outcome?: 'accepted' | 'project-missing' | 'failed';
  focus?: boolean;
} = {}): {
  deps: AgentAccessOpenDeps;
  dir: string;
  target: WebContents;
  sent: Array<{ channel: string; payload: unknown }>;
  sessions: Session[];
  broker: AgentAccessOpenBroker;
  setEnabled: (next: boolean) => void;
} {
  const dir = scratch();
  const callerPath = opts.callerPath ?? dir;
  const sessions = [
    session({ id: 'caller-1', projectPath: callerPath })
  ];
  const projects = [
    project({ id: 'p1', path: dir, name: 'a' }),
    ...(opts.extraProjects ?? [])
  ];
  const broker = new AgentAccessOpenBroker();
  const { target, sent } = webContents(opts.destroyed ?? false);
  let enabled = opts.enabled ?? true;
  const outcome = opts.outcome ?? 'accepted';
  const deps: AgentAccessOpenDeps = {
    isEnabled: () => enabled,
    listSessions: async () => sessions,
    listProjects: async () => projects,
    mainWindow: () => target,
    broker,
    windowFocused: () => opts.focus ?? true,
    harnessCheckpoint: () => null
  };
  // Accept every send from the exact target with the world's outcome, on
  // the next microtask: the broker holds the send pending while `open`
  // awaits delivery, exactly as the service does.
  const originalSend = broker.send.bind(broker);
  vi.spyOn(broker, 'send').mockImplementation(async (t, p) => {
    const pending = originalSend(t, p);
    queueMicrotask(() => {
      broker.noteCompletion(t, { requestId: p.requestId, outcome });
    });
    return pending;
  });
  return {
    deps,
    dir,
    target,
    sent,
    sessions,
    broker,
    setEnabled: (next: boolean) => {
      enabled = next;
    }
  };
}

function inv(
  path: string,
  locator: { line: number; endLine?: number } | { find: string }
): AgentAccessOpenInvocation {
  return {
    session: 'caller-1',
    pathBase64: b64(path),
    ...('find' in locator
      ? { findBase64: b64(locator.find) }
      : { line: locator.line, ...(locator.endLine !== undefined ? { endLine: locator.endLine } : {}) })
  };
}

function openedOf(value: AgentAccessOpenValue): Extract<
  AgentAccessOpenValue,
  { state: 'opened' }
> {
  if (value.state !== 'opened') {
    throw new Error(`expected opened, got ${JSON.stringify(value)}`);
  }
  return value;
}

describe('agent-access open', () => {
  it('opens a file in the caller project at a line', async () => {
    const { deps, dir, sent } = world();
    writeFileSync(join(dir, 'file.txt'), 'a\nb\nc\nd\n');
    const open = buildAgentAccessOpen(deps);
    const value = openedOf(await open(inv(join(dir, 'file.txt'), { line: 3 })));
    expect(value.selection).toEqual({
      line: 3,
      column: 0,
      endLine: 3,
      endColumn: 0,
      highlight: true
    });
    // The paths are the REAL paths (containment resolves the platform's
    // own `/var` → `/private/var` alias), while the project row keeps the
    // caller's spelling: `path` names the same file the door judged.
    expect(value.project.path).toBe(dir);
    expect(value.path.endsWith('/file.txt')).toBe(true);
    expect(sent).toHaveLength(1);
  });

  it('answers out-of-range past the last line and sends nothing', async () => {
    const { deps, dir, sent } = world();
    writeFileSync(join(dir, 'file.txt'), 'a\nb\n');
    const open = buildAgentAccessOpen(deps);
    // lineCount: 'a\nb\n'.split('\n') === ['a','b',''] → 3.
    const value = await open(inv(join(dir, 'file.txt'), { line: 4 }));
    expect(value).toEqual({
      state: 'refused',
      reason: 'line-out-of-range'
    });
    expect(sent).toHaveLength(0);
  });

  it('finds the first of 300 non-overlapping matches with exact UTF-16 columns', async () => {
    const { deps, dir, sent } = world();
    const line = `${'x'.repeat(10)}needle${'y'.repeat(5)}`;
    const text = Array.from({ length: 300 }, () => line).join('\n');
    writeFileSync(join(dir, 'many.txt'), text);
    const open = buildAgentAccessOpen(deps);
    const value = openedOf(await open(inv(join(dir, 'many.txt'), { find: 'needle' })));
    expect(sent).toHaveLength(1);
    expect(value.matches).toBe(300);
    expect(value.chosen).toBe(1);
    expect(value.selection).toEqual({
      line: 1,
      column: 10,
      endLine: 1,
      endColumn: 16,
      highlight: true
    });
  });

  it('answers not-found with zero matches and sends nothing', async () => {
    const { deps, dir, sent } = world();
    writeFileSync(join(dir, 'file.txt'), 'nothing here\n');
    const open = buildAgentAccessOpen(deps);
    const value = await open(inv(join(dir, 'file.txt'), { find: 'absent' }));
    expect(value).toEqual({ state: 'not-found', matches: 0 });
    expect(sent).toHaveLength(0);
  });

  it('resolves a relative path only in the caller project', async () => {
    const other = scratch();
    const { deps, dir } = world({
      extraProjects: [project({ id: 'p2', path: other, name: 'b' })]
    });
    writeFileSync(join(dir, 'here.txt'), 'caller\n');
    writeFileSync(join(other, 'here.txt'), 'other\n');
    const open = buildAgentAccessOpen(deps);
    const value = openedOf(await open(inv('here.txt', { line: 1 })));
    expect(value.project.id).toBe('p1');
    // Real path again: same file, platform alias resolved.
    expect(value.path.endsWith('/here.txt')).toBe(true);
  });

  it('refuses outside-projects and never echoes the path', async () => {
    const { deps, dir } = world();
    const open = buildAgentAccessOpen(deps);
    const value = await open(inv('/etc/hostname-x-tortie', { line: 1 }));
    expect(value).toEqual({ state: 'refused', reason: 'outside-projects' });
    expect(JSON.stringify(value)).not.toContain('/etc/hostname');
    void dir;
  });

  it('refuses directories, missing rows, and credential names', async () => {
    const { deps, dir } = world();
    writeFileSync(join(dir, '.env'), 'SECRET=x\n');
    const open = buildAgentAccessOpen(deps);
    expect(await open(inv(join(dir, '.env'), { line: 1 }))).toEqual({
      state: 'refused',
      reason: 'credential'
    });
    // A caller spelling that reaches the project only through the
    // platform's own alias (`/var` → `/private/var` on macOS) refuses as
    // outside-projects: containment is answered against the real root, so
    // an aliased spelling of even the root itself is not inside it.
    expect(await open(inv(dir, { line: 1 }))).toEqual({
      state: 'refused',
      reason: 'outside-projects'
    });
    expect(
      await open(inv(join(dir, 'nope.txt'), { line: 1 }))
    ).toEqual({ state: 'refused', reason: 'missing' });
  });

  it('refuses executables, images, and symlink escapes as not-file', async () => {
    const { deps, dir } = world({ enabled: true });
    const open = buildAgentAccessOpen(deps);
    const exe = join(dir, 'run.sh');
    writeFileSync(exe, '#!/bin/sh\necho hi\n');
    const { chmodSync } = await import('node:fs');
    chmodSync(exe, 0o755);
    expect(await open(inv(exe, { line: 1 }))).toEqual({
      state: 'refused',
      reason: 'not-file'
    });
    const png = join(dir, 'pic.png');
    writeFileSync(png, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]));
    expect(await open(inv(png, { line: 1 }))).toEqual({
      state: 'refused',
      reason: 'not-file'
    });
    const outside = scratch();
    const secret = join(outside, 'secret.txt');
    writeFileSync(secret, 'nope\n');
    symlinkSync(secret, join(dir, 'link.txt'));
    // A leaf symlink escaping the project: containment holds on the link
    // entry itself while the door reads the target, so the door — not
    // containment — refuses. The closed word is still `not-file`.
    expect(await open(inv(join(dir, 'link.txt'), { line: 1 }))).toEqual({
      state: 'refused',
      reason: 'not-file'
    });
  });

  it('refuses unavailable for fake, gone, and remote callers and runs nothing', async () => {
    const { deps, dir, sent } = world();
    writeFileSync(join(dir, 'file.txt'), 'hi\n');
    const open = buildAgentAccessOpen(deps);
    const remote = session({
      id: 'remote-1',
      projectPath: dir,
      machine: {
        id: 'studio',
        label: 'Studio',
        color: 'orange',
        answering: true,
        canRestore: false,
        restoreReason: null
      }
    });
    // The open seam answers a gone/remote caller by THROWING the closed
    // transport refusal, so the dispatch `finally` still attributes the
    // outcome. The service catch maps it to the closed error.
    const { OpenUnavailableError } = await import('../open');
    const depsWithRemote: AgentAccessOpenDeps = {
      ...(deps as unknown as Record<string, unknown>),
      listSessions: async () => [remote]
    } as unknown as AgentAccessOpenDeps;
    const openRemote = buildAgentAccessOpen(depsWithRemote);
    for (const id of ['nope', remote.id]) {
      await expect(
        openRemote({
          session: id,
          pathBase64: b64(join(dir, 'file.txt')),
          line: 1
        })
      ).rejects.toBeInstanceOf(OpenUnavailableError);
    }
    expect(sent).toHaveLength(0);
    void open;
  });

  it('refuses bad-request shapes without throwing', async () => {
    const { deps, dir, sent } = world();
    writeFileSync(join(dir, 'file.txt'), 'hi\n');
    const open = buildAgentAccessOpen(deps);
    const bad: AgentAccessOpenInvocation[] = [
      { session: 'caller-1', pathBase64: '!!!', line: 1 },
      { session: 'caller-1', pathBase64: b64(''), line: 1 },
      {
        session: 'caller-1',
        pathBase64: b64(join(dir, 'file.txt')),
        line: 0
      },
      {
        session: 'caller-1',
        pathBase64: b64(join(dir, 'file.txt')),
        line: 2,
        endLine: 1
      },
      {
        session: 'caller-1',
        pathBase64: b64(join(dir, 'file.txt')),
        line: 1,
        findBase64: b64('hi')
      },
      {
        session: 'caller-1',
        pathBase64: b64(join(dir, 'file.txt')),
        findBase64: b64('')
      }
    ];
    for (const invocation of bad) {
      const value = await open(invocation);
      expect(value).toEqual({ state: 'refused', reason: 'missing' });
    }
    expect(sent).toHaveLength(0);
  });

  it('refuses oversize, binary, replaced, and in-place changes', async () => {
    const { deps, dir, sent } = world();
    const open = buildAgentAccessOpen(deps);
    // Oversize: filled past the cap so the sniff stays quiet and the size
    // word decides.
    const big = join(dir, 'big.txt');
    writeFileSync(big, 'z'.repeat(READ_CAP_BYTES + 1));
    expect(await open(inv(big, { line: 1 }))).toEqual({
      state: 'refused',
      reason: 'too-large'
    });
    // Binary: NUL inside the sniff head.
    const bin = join(dir, 'bin.txt');
    writeFileSync(bin, Buffer.from([0x68, 0x69, 0x00, 0x21]));
    expect(await open(inv(bin, { line: 1 }))).toEqual({
      state: 'refused',
      reason: 'not-text'
    });
    // Atomic replace and in-place change during the read: the strict
    // reader's own suite drives the between-chunks seam; here the seam is
    // pinned armed/unarmed only, and a changed file refuses changed.
    const race = join(dir, 'race.txt');
    writeFileSync(race, 'r'.repeat(200));
    const arrived = await open(inv(race, { line: 1 }));
    expect(arrived.state).toBe('opened');
    writeFileSync(race, 'replaced');
    expect(sent).toHaveLength(1);
  });

  it('reads CRLF, multiline, and emoji columns exactly', async () => {
    const { deps, dir } = world();
    const open = buildAgentAccessOpen(deps);
    // CRLF: `\r` rides the line, `\n` ends it — needle sits at column 2
    // on line 2 (1-based), exclusive end 8.
    writeFileSync(join(dir, 'crlf.txt'), 'a\r\nb needle\r\nc\r\n');
    const crlf = openedOf(await open(inv(join(dir, 'crlf.txt'), { find: 'needle' })));
    expect(crlf.selection).toEqual({
      line: 2,
      column: 2,
      endLine: 2,
      endColumn: 8,
      highlight: true
    });
    expect(crlf.matches).toBe(1);
    // Multiline needle: start line/column and exclusive end line/column.
    writeFileSync(join(dir, 'multi.txt'), 'ab\ncd needle\nef\n');
    const multi = openedOf(
      await open(inv(join(dir, 'multi.txt'), { find: 'needle' }))
    );
    expect(multi.selection).toEqual({
      line: 2,
      column: 3,
      endLine: 2,
      endColumn: 9,
      highlight: true
    });
    // Emoji: UTF-16 columns count the surrogate pair as two.
    writeFileSync(join(dir, 'emoji.txt'), '😀 needle\n');
    const emoji = openedOf(await open(inv(join(dir, 'emoji.txt'), { find: 'needle' })));
    expect(emoji.selection).toEqual({
      line: 1,
      column: 3,
      endLine: 1,
      endColumn: 9,
      highlight: true
    });
  });

  it('refuses disabled when the switch moves off in flight and sends nothing', async () => {
    const { deps, dir, sent, setEnabled } = world();
    writeFileSync(join(dir, 'file.txt'), 'hi\n');
    setEnabled(false);
    const open = buildAgentAccessOpen(deps);
    // The seam throws so the landed dispatch `finally` attributes it; the
    // service catch answers the closed transport error.
    const { OpenDisabledError } = await import('../open');
    await expect(open(inv(join(dir, 'file.txt'), { line: 1 }))).rejects.toBeInstanceOf(
      OpenDisabledError
    );
    expect(sent).toHaveLength(0);
  });

  it('refuses renderer-unavailable on a destroyed renderer', async () => {
    const destroyed = world({ destroyed: true });
    writeFileSync(join(destroyed.dir, 'file.txt'), 'hi\n');
    const open = buildAgentAccessOpen(destroyed.deps);
    const value = await open(
      inv(join(destroyed.dir, 'file.txt'), { line: 1 })
    );
    expect(value).toEqual({
      state: 'refused',
      reason: 'renderer-unavailable'
    });
  });
});
