/**
 * Phase 342 (build/p342/SPEC.md D4, D6, D7, D9, and its fix round). The set-up
 * on a server that refuses a row, driven through the SHIPPING
 * `ensureRemoteServer` over a recording exec plane that answers tmux's own
 * refusal words from a table (the measured shapes of §14 M5).
 *
 *  - `history-limit` is written FIRST (D4), and the read-back walks
 *    `SERVER_OPTIONS` in its own order, a skipped row left out and a fallback
 *    row compared with its fallback.
 *  - A refusal is read only in tmux's seven shapes (D6): an optional row is
 *    skipped and recorded, `mode-style` falls back once and a refused fallback
 *    is a skip, a row Tortie cannot do without stops the call with
 *    `RemoteTmuxRefused` and NOTHING is sent after it, and a failure in any
 *    other words throws exactly as it always did.
 *  - A refusal the server's row lacks is expected; any other is not (D7).
 *  - A born server is asked `#{version}` before any option and refused on a
 *    disagreement with the version the program said (D9); with nothing to
 *    compare with, the re-read notes the version and records the pair.
 *  - THE FIX ROUND: a required row the server took and read back as another
 *    single-line value is refused as sentence (1); an `exit-empty` refusal on
 *    the boot line is that row's refusal; every required refusal is recorded
 *    in the leaf for the create, and a set-up that holds every row clears it.
 *
 * Nothing here runs a command, reads a file or opens a connection.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteMachineContext } from '../context';

vi.mock('electron', () => ({
  app: { getPath: () => '/nonexistent', isReady: () => true, isPackaged: false },
  BrowserWindow: { getAllWindows: () => [] }
}));

vi.mock('../../settings/store', () => ({
  getSettings: () => ({ scrollbackLines: 25_000 })
}));

const plane = vi.hoisted(() => ({
  calls: [] as string[][],
  /** The server answers the list, or (an Error) says there is none. */
  noServer: false,
  /** The version the server prints. */
  version: '3.6a',
  /** Rows the server refuses, in tmux's own words. */
  refuse: new Set<string>(),
  /** The fallback value mode-style takes, when refused. */
  fallbackTakes: 'bg=default,fg=default',
  /** A row that is taken but read back as this value. */
  notKept: new Map<string, string>(),
  /** The values set so far. */
  set: new Map<string, string>(),
  /** A failure in other words, thrown on this row. */
  breakOn: null as string | null,
  /**
   * PHASE 342'S SECOND FIX ROUND. Rows whose write fails with tmux's
   * catch-all code in words tmux never uses (a wrapper's policy line).
   */
  otherWords: new Set<string>(),
  /** When true, that failure carries a class the taxonomy placed. */
  otherWordsClassed: false,
  born: false
}));

vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => {
    const argv = [...args];
    plane.calls.push(argv);
    const verb = argv[0] ?? '';
    const refusal = (code: string, message: string, detail: string) =>
      Promise.reject(gmuxErrorHere(code as 'UNKNOWN', message, detail));
    if (verb === 'list-sessions') {
      if (plane.noServer && !plane.born) return refusal('TMUX_UNREACHABLE', 'The Tortie session server is not running.', 'no server running on /tmp/tmux-501/p342');
      return Promise.resolve('$0\n');
    }
    if (verb === 'start-server') {
      if (plane.refuse.has('exit-empty')) return refusal('UNKNOWN', 'p342: tmux start-server failed', 'invalid option: exit-empty');
      plane.born = true;
      return Promise.resolve('');
    }
    if (verb === 'display-message') return Promise.resolve(`${plane.version}\n`);
    if (verb === 'set-environment') return Promise.resolve('');
    if (verb === 'set-option') {
      const name = argv[2] ?? '';
      const value = argv[3] ?? '';
      if (plane.breakOn === name) return refusal('TMUX_UNREACHABLE', 'Tortie could not reach p342.', 'Connection closed by remote host');
      if (plane.otherWords.has(name)) {
        const err = gmuxErrorHere('UNKNOWN', 'p342: tmux set-option failed', 'policy: that option is not allowed here');
        return Promise.reject(plane.otherWordsClassed ? noteClassHere(err, 'refused') : err);
      }
      if (plane.refuse.has(name) && !(name === 'mode-style' && value === plane.fallbackTakes)) {
        const words =
          name === 'mode-style'
            ? `invalid style: ${value}`
            : ['remain-on-exit', 'status', 'extended-keys'].includes(name)
              ? `unknown value: ${value}`
              : name === 'mouse'
                ? `bad value: ${value}`
                : `invalid option: ${name}`;
        return refusal('UNKNOWN', `p342: tmux set-option failed`, words);
      }
      plane.set.set(name, value);
      return Promise.resolve('');
    }
    if (verb === 'show-options') {
      const name = argv[2] ?? '';
      const kept = plane.notKept.get(name);
      if (kept !== undefined) return Promise.resolve(`${kept}\n`);
      return Promise.resolve(`${plane.set.get(name) ?? ''}\n`);
    }
    return Promise.resolve('');
  }
}));

vi.mock('../remote-path', () => ({
  captureRemotePath: () => {
    plane.calls.push(['capture-path']);
    return Promise.resolve('/usr/bin:/bin');
  }
}));

const { gmuxError: gmuxErrorHere } = await import('../../errors');
const { noteMachineClass: noteClassHere } = await import('../errors');
const { ensureRemoteServer, RemoteTmuxRefused } = await import('../remote-server');
const { SERVER_OPTIONS } = await import('../../tmux/server-options');
const leaf = await import('../far-tmux');
const { MACHINE_TMUX_TOO_OLD_HEADLINE, MACHINE_TMUX_DISAGREES_HEADLINE } = await import('../errors');

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'p342-setup',
  sshBin: '/usr/bin/ssh',
  host: '127.0.0.1',
  user: null,
  port: 2222,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p342-unit',
  controlPath: '/tmp/tortie-501/m-p342',
  hostKeys: { tortie: '/t/known-machines', user: '/u/person' }
};

const sets = () => plane.calls.filter((c) => c[0] === 'set-option').map((c) => `${c[2]} ${c[3]}`);
const verbs = () => plane.calls.map((c) => c[0]);
const LIST_ORDER = SERVER_OPTIONS.map((row) => row.name);

beforeEach(() => {
  plane.calls.length = 0;
  plane.noServer = false;
  plane.version = '3.6a';
  plane.refuse = new Set();
  plane.fallbackTakes = 'bg=default,fg=default';
  plane.notKept = new Map();
  plane.set = new Map();
  plane.breakOn = null;
  plane.otherWords = new Set();
  plane.otherWordsClassed = false;
  plane.born = false;
  leaf.resetFarTmuxForTests();
});

describe('a warm server that takes everything (the control)', () => {
  it('writes history-limit first and reads back in the list order, refusing nothing', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.6a');
    const r = await ensureRemoteServer(CTX);
    expect(sets()[0]).toBe('history-limit 25000');
    expect(sets().map((s) => s.split(' ')[0])).toEqual(['history-limit', ...LIST_ORDER.filter((n) => n !== 'history-limit')]);
    expect(r.options.map((o) => o.name)).toEqual(LIST_ORDER);
    expect(r.refused).toEqual([]);
    expect(r.disagreed).toEqual([]);
    expect(leaf.farSettingsRefusal(CTX.machineId)).toBeNull();
    // A warm server is never asked its version.
    expect(verbs()).not.toContain('display-message');
  });
});

describe('a refusal the row lacks (D6, D7)', () => {
  it('3.2a: allow-passthrough and copy-mode-position-format skipped, mode-style falls back, all expected', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.2a');
    plane.refuse = new Set(['allow-passthrough', 'copy-mode-position-format', 'mode-style']);
    const r = await ensureRemoteServer(CTX);
    expect(r.refused).toEqual([
      { name: 'allow-passthrough', expected: true, outcome: 'skipped' },
      { name: 'copy-mode-position-format', expected: true, outcome: 'skipped' },
      { name: 'mode-style', expected: true, outcome: 'fallback' }
    ]);
    expect(sets()).toContain('mode-style noattr,bg=default,fg=default');
    expect(sets()).toContain('mode-style bg=default,fg=default');
    // The skipped rows are not read back; the fallback row is, against its fallback.
    const names = r.options.map((o) => o.name);
    expect(names).toEqual(LIST_ORDER.filter((n) => n !== 'allow-passthrough' && n !== 'copy-mode-position-format'));
    expect(r.options.find((o) => o.name === 'mode-style')).toEqual({
      name: 'mode-style',
      wanted: 'bg=default,fg=default',
      observed: 'bg=default,fg=default',
      agrees: true
    });
    expect(r.disagreed).toEqual([]);
  });

  it('a refusal the row does not lack is recorded as unexpected', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.7c');
    plane.refuse = new Set(['allow-passthrough']);
    const r = await ensureRemoteServer(CTX);
    expect(r.refused).toEqual([{ name: 'allow-passthrough', expected: false, outcome: 'skipped' }]);
  });

  it('a refused fallback is a skip, and never expected', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.3a');
    plane.refuse = new Set(['copy-mode-position-format', 'mode-style']);
    plane.fallbackTakes = 'nothing';
    const r = await ensureRemoteServer(CTX);
    expect(r.refused.find((x) => x.name === 'mode-style')).toEqual({ name: 'mode-style', expected: false, outcome: 'skipped' });
    expect(r.options.map((o) => o.name)).not.toContain('mode-style');
  });

  it('a version with no row expects nothing', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.9z');
    plane.refuse = new Set(['copy-mode-position-format']);
    const r = await ensureRemoteServer(CTX);
    expect(r.refused).toEqual([{ name: 'copy-mode-position-format', expected: false, outcome: 'skipped' }]);
  });
});

describe('a row Tortie cannot do without, refused (D6, D10)', () => {
  it('stops the set-up with RemoteTmuxRefused, history-limit already written, nothing sent after it', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.7c');
    plane.refuse = new Set(['remain-on-exit']);
    const err = await ensureRemoteServer(CTX).catch((one: unknown) => one);
    expect(err).toBeInstanceOf(RemoteTmuxRefused);
    const refused = err as InstanceType<typeof RemoteTmuxRefused>;
    expect(refused.refusal).toEqual({ kind: 'required', name: 'remain-on-exit', purpose: 'failed-screen', version: '3.7c', lines: 25_000 });
    expect(refused.headline).toBe(MACHINE_TMUX_TOO_OLD_HEADLINE);
    expect(refused.detail).toBe("tmux 3.7c would not keep a session's screen when its program fails, so Tortie will not start sessions there.");
    expect(refused.message).toBe(refused.detail);
    expect(refused.born).toBe(false);
    const all = sets();
    expect(all[0]).toBe('history-limit 25000');
    expect(all[all.length - 1]).toBe('remain-on-exit failed');
    expect(verbs()).not.toContain('show-options');
    // Recorded for the create, keyed by the server version.
    expect(leaf.farSettingsRefusal(CTX.machineId)).toEqual({
      server: '3.7c',
      name: 'remain-on-exit',
      sentence: refused.detail
    });
    expect(() => leaf.assertFarSettingsHeld(CTX.machineId)).toThrow();
  });

  it('every one of the four required rows is refused that way, by its own purpose', async () => {
    const want: Record<string, string> = {
      'history-limit': 'keep 25,000 lines of each session',
      'exit-empty': 'keep running with no session open',
      'remain-on-exit': "keep a session's screen when its program fails",
      mouse: 'leave scrolling to Tortie'
    };
    for (const [name, purpose] of Object.entries(want)) {
      plane.calls.length = 0;
      plane.set = new Map();
      plane.born = false;
      leaf.resetFarTmuxForTests();
      leaf.noteFarServerVersion(CTX.machineId, '3.6');
      plane.refuse = new Set([name]);
      plane.noServer = name === 'exit-empty';
      const err = await ensureRemoteServer(CTX).catch((one: unknown) => one);
      expect(err, name).toBeInstanceOf(RemoteTmuxRefused);
      expect((err as InstanceType<typeof RemoteTmuxRefused>).detail, name).toBe(`tmux 3.6 would not ${purpose}, so Tortie will not start sessions there.`);
    }
  });

  it('a later set-up that holds every row clears the recorded refusal', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.7c');
    plane.refuse = new Set(['mouse']);
    await ensureRemoteServer(CTX).catch(() => undefined);
    expect(leaf.farSettingsRefusal(CTX.machineId)).not.toBeNull();
    plane.refuse = new Set();
    plane.calls.length = 0;
    await ensureRemoteServer(CTX);
    expect(leaf.farSettingsRefusal(CTX.machineId)).toBeNull();
    expect(() => leaf.assertFarSettingsHeld(CTX.machineId)).not.toThrow();
  });

  it('a failure in any other words throws as it always did, and is no refusal', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.7c');
    plane.breakOn = 'mouse';
    const err = await ensureRemoteServer(CTX).catch((one: unknown) => one);
    expect(err).not.toBeInstanceOf(RemoteTmuxRefused);
    expect((err as Error).name).toBe('GmuxError');
    expect(leaf.farSettingsRefusal(CTX.machineId)).toBeNull();
  });
});

describe('the fix round: a required row taken but not kept, and the boot line', () => {
  it('a required row that reads back as another single-line value is refused as sentence (1)', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.7c');
    plane.notKept = new Map([['history-limit', '2000']]);
    const err = await ensureRemoteServer(CTX).catch((one: unknown) => one);
    expect(err).toBeInstanceOf(RemoteTmuxRefused);
    expect((err as InstanceType<typeof RemoteTmuxRefused>).refusal).toMatchObject({ kind: 'required', name: 'history-limit', purpose: 'history' });
    expect(leaf.farSettingsRefusal(CTX.machineId)?.name).toBe('history-limit');
  });

  it('an empty, failed or multi-line read-back stops nothing and is reported as before', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.7c');
    plane.notKept = new Map([['history-limit', ''], ['mouse', 'off\nbanner']]);
    const r = await ensureRemoteServer(CTX);
    expect(r.disagreed.map((o) => o.name).sort()).toEqual(['history-limit', 'mouse']);
    expect(leaf.farSettingsRefusal(CTX.machineId)).toBeNull();
  });

  it('an optional row not kept is reported, never refused', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.7c');
    plane.notKept = new Map([['status', 'on']]);
    const r = await ensureRemoteServer(CTX);
    expect(r.disagreed.map((o) => o.name)).toEqual(['status']);
    expect(leaf.farSettingsRefusal(CTX.machineId)).toBeNull();
  });

  it('exit-empty refused on the boot line is that row\'s refusal, sentence (1)', async () => {
    plane.noServer = true;
    plane.refuse = new Set(['exit-empty']);
    // Prepare noted the program's version before the set-up, as it does.
    leaf.noteFarServerVersion(CTX.machineId, '3.7c');
    const err = await ensureRemoteServer(CTX, { version: '3.7c' }).catch((one: unknown) => one);
    expect(err).toBeInstanceOf(RemoteTmuxRefused);
    expect((err as InstanceType<typeof RemoteTmuxRefused>).detail).toBe('tmux 3.7c would not keep running with no session open, so Tortie will not start sessions there.');
    expect(verbs()).not.toContain('display-message');
    expect(sets()).toEqual([]);
    expect(leaf.farSettingsRefusal(CTX.machineId)?.name).toBe('exit-empty');
  });
});

/**
 * PHASE 342'S SECOND FIX ROUND. A row Tortie cannot do without whose write
 * FAILED in words tmux never uses. The verifier measured a wrapper refusing
 * `remain-on-exit` with its own policy line: Prepare said "could not reach",
 * the chip stayed Ready because the PATH was captured before the options, and
 * a create started a session on a server whose `remain-on-exit` read `off`.
 * The row is read back once: a server holding ANOTHER value is that row's
 * refusal, sentence (1), recorded for the create; anything else is thrown as
 * it came, and nothing is recorded, because the words prove nothing.
 */
describe('a required row whose write failed in other words (the second fix round)', () => {
  const ROE = "tmux 3.6 would not keep a session's screen when its program fails, so Tortie will not start sessions there.";
  const afterWrite = (name: string): string[][] => {
    const at = plane.calls.findIndex((c) => c[0] === 'set-option' && c[2] === name);
    return at === -1 ? [] : plane.calls.slice(at + 1);
  };

  it('a server that holds another value: sentence (1), recorded, and only the one read sent after', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.6');
    plane.otherWords = new Set(['remain-on-exit']);
    plane.notKept = new Map([['remain-on-exit', 'off']]);
    const err = await ensureRemoteServer(CTX).catch((one: unknown) => one);
    expect(err).toBeInstanceOf(RemoteTmuxRefused);
    const refused = err as InstanceType<typeof RemoteTmuxRefused>;
    expect(refused.refusal).toEqual({ kind: 'required', name: 'remain-on-exit', purpose: 'failed-screen', version: '3.6', lines: 25_000 });
    expect(refused.headline).toBe(MACHINE_TMUX_TOO_OLD_HEADLINE);
    expect(refused.detail).toBe(ROE);
    expect(afterWrite('remain-on-exit')).toEqual([['show-options', '-gv', 'remain-on-exit']]);
    expect(leaf.farSettingsRefusal(CTX.machineId)).toEqual({ server: '3.6', name: 'remain-on-exit', sentence: ROE });
    expect(() => leaf.assertFarSettingsHeld(CTX.machineId)).toThrow();
  });

  it('a server that holds the wanted value: the failure is thrown as it came, nothing recorded', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.6');
    plane.otherWords = new Set(['remain-on-exit']);
    plane.notKept = new Map([['remain-on-exit', 'failed']]);
    const err = await ensureRemoteServer(CTX).catch((one: unknown) => one);
    expect(err).not.toBeInstanceOf(RemoteTmuxRefused);
    expect((err as Error).name).toBe('GmuxError');
    expect(leaf.farSettingsRefusal(CTX.machineId)).toBeNull();
  });

  it('a read that answers nothing: the failure is thrown as it came, nothing recorded (the stated residual)', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.6');
    plane.otherWords = new Set(['remain-on-exit']);
    const err = await ensureRemoteServer(CTX).catch((one: unknown) => one);
    expect(err).not.toBeInstanceOf(RemoteTmuxRefused);
    expect(leaf.farSettingsRefusal(CTX.machineId)).toBeNull();
  });

  it('a failure a taxonomy class placed is never read back: it proved nothing about the option', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.6');
    plane.otherWords = new Set(['remain-on-exit']);
    plane.otherWordsClassed = true;
    plane.notKept = new Map([['remain-on-exit', 'off']]);
    const err = await ensureRemoteServer(CTX).catch((one: unknown) => one);
    expect(err).not.toBeInstanceOf(RemoteTmuxRefused);
    expect(afterWrite('remain-on-exit')).toEqual([]);
    expect(leaf.farSettingsRefusal(CTX.machineId)).toBeNull();
  });

  it('an optional row refused in other words is thrown as it came and never read back, as today', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.6');
    plane.otherWords = new Set(['allow-passthrough']);
    plane.notKept = new Map([['allow-passthrough', 'off']]);
    const err = await ensureRemoteServer(CTX).catch((one: unknown) => one);
    expect(err).not.toBeInstanceOf(RemoteTmuxRefused);
    expect(afterWrite('allow-passthrough')).toEqual([]);
    expect(leaf.farSettingsRefusal(CTX.machineId)).toBeNull();
  });

  it('the route is asked before the read: a confirm of changed details that landed stops it unsent', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.6');
    plane.otherWords = new Set(['remain-on-exit']);
    plane.notKept = new Map([['remain-on-exit', 'off']]);
    const stillRouted = () => !plane.calls.some((c) => c[0] === 'set-option' && c[2] === 'remain-on-exit');
    const err = await ensureRemoteServer(CTX, { stillRouted }).catch((one: unknown) => one);
    expect((err as Error).name).toBe('RemoteServerSetUpStopped');
    expect(afterWrite('remain-on-exit')).toEqual([]);
    expect(leaf.farSettingsRefusal(CTX.machineId)).toBeNull();
  });
});

describe('a born server is asked its version before any option (D9)', () => {
  it('refuses a server that runs as another version than its program said, sending zero options', async () => {
    plane.noServer = true;
    plane.version = '3.2a';
    leaf.noteFarServerVersion(CTX.machineId, '3.7c');
    const err = await ensureRemoteServer(CTX, { version: '3.7c' }).catch((one: unknown) => one);
    expect(err).toBeInstanceOf(RemoteTmuxRefused);
    const refused = err as InstanceType<typeof RemoteTmuxRefused>;
    expect(refused.refusal).toEqual({ kind: 'disagrees', said: '3.7c', ran: '3.2a' });
    expect(refused.headline).toBe(MACHINE_TMUX_DISAGREES_HEADLINE);
    expect(refused.detail).toBe('It says 3.7c and runs as 3.2a, so Tortie will not use it.');
    expect(refused.born).toBe(true);
    expect(verbs()).toEqual(['list-sessions', 'start-server', 'display-message']);
    expect(sets()).toEqual([]);
    // The machine is now known by the version its server RUNS.
    expect(leaf.farServerVersion(CTX.machineId)).toBe('3.2a');
    // THE SECOND FIX ROUND: and the disagreement is remembered by it.
    expect(leaf.farDisagreementOf(CTX.machineId)).toEqual({ said: '3.7c', ran: '3.2a' });
  });

  it('with nothing to compare with (a restore or a create), the re-read notes the version and records the pair', async () => {
    plane.noServer = true;
    plane.version = '3.4';
    plane.refuse = new Set(['copy-mode-position-format', 'mode-style']);
    const r = await ensureRemoteServer(CTX);
    expect(r.born).toBe(true);
    expect(verbs().slice(0, 3)).toEqual(['list-sessions', 'start-server', 'display-message']);
    expect(leaf.farServerVersion(CTX.machineId)).toBe('3.4');
    expect(leaf.farPairOf(CTX.machineId)).toEqual({ server: '3.4', program: '3.4', kind: 'measured' });
    // The refusals were judged against the server's own row, noted by the re-read.
    expect(r.refused.every((x) => x.expected)).toBe(true);
  });

  it('a stale pair refusal about the server that is gone stops counting after the re-read', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.5a');
    leaf.noteFarPair(CTX.machineId, '3.5a', '3.6b');
    expect(leaf.farPairRefusal(CTX.machineId)).not.toBeNull();
    plane.noServer = true;
    plane.version = '3.6b';
    await ensureRemoteServer(CTX);
    expect(leaf.farPairRefusal(CTX.machineId)).toBeNull();
    expect(leaf.farPairOf(CTX.machineId)).toEqual({ server: '3.6b', program: '3.6b', kind: 'server-only' });
  });

  it('a born server that agrees with its program is set up as any other', async () => {
    plane.noServer = true;
    plane.version = '3.7c';
    leaf.noteFarDisagreement(CTX.machineId, '3.7c', '3.7c');
    leaf.noteFarServerVersion(CTX.machineId, '3.2a');
    leaf.noteFarDisagreement(CTX.machineId, '3.7c', '3.2a');
    const r = await ensureRemoteServer(CTX, { version: '3.7c' });
    expect(r.born).toBe(true);
    expect(sets()[0]).toBe('history-limit 25000');
    // THE SECOND FIX ROUND: a server that agrees with its program clears a
    // disagreement remembered before.
    expect(leaf.farDisagreementOf(CTX.machineId)).toBeNull();
  });
});

/**
 * Phase 340.1's rule kept across the new reads (SPEC §4.1): the route is asked
 * after EVERY command, the born server's version read and a fallback write
 * among them, so a confirm of changed details that lands between two of them
 * stops the set-up at the next one rather than after the last.
 */
describe('the route is asked after the new reads too', () => {
  it('stops right after the born re-read when the route was retired by then', async () => {
    plane.noServer = true;
    plane.version = '3.6a';
    let asked = 0;
    const stillRouted = () => {
      asked += 1;
      // The boot's own question answers yes; the one after the version read, no.
      return !plane.calls.some((c) => c[0] === 'display-message');
    };
    const err = await ensureRemoteServer(CTX, { stillRouted }).catch((one: unknown) => one);
    expect((err as Error).name).toBe('RemoteServerSetUpStopped');
    const at = plane.calls.findIndex((c) => c[0] === 'display-message');
    expect(at).toBeGreaterThan(-1);
    // Nothing after the version read: no PATH capture, no option.
    expect(plane.calls.slice(at + 1)).toEqual([]);
    expect(asked).toBeGreaterThanOrEqual(2);
  });

  it('stops right after a fallback write when the route was retired by then', async () => {
    leaf.noteFarServerVersion(CTX.machineId, '3.3a');
    plane.version = '3.3a';
    plane.refuse = new Set(['copy-mode-position-format', 'mode-style']);
    const stillRouted = () => !plane.calls.some((c) => c[0] === 'set-option' && c[2] === 'mode-style' && c[3] === 'bg=default,fg=default');
    const err = await ensureRemoteServer(CTX, { stillRouted }).catch((one: unknown) => one);
    expect((err as Error).name).toBe('RemoteServerSetUpStopped');
    const last = plane.calls[plane.calls.length - 1] ?? [];
    expect(last.slice(0, 4)).toEqual(['set-option', '-g', 'mode-style', 'bg=default,fg=default']);
  });
});
