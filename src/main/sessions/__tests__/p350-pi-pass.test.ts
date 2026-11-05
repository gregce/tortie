/**
 * Phase 350 — the pi arm of the inline switch pass, over a real manifest
 * (build/p350/SPEC.md §4.2 step 3, D3, D13, D14, D19, D20).
 *
 * The rows are M2's eight (§2.2) and five more the attack names: a row with an
 * id and no resume argv, a wrapped one, one whose resume argv carries another
 * conversation, a person's own `--tui-mode regular` after the id, and rows of
 * three other agents carrying the same two words. Each is graded at each floor
 * reading BYTE FOR BYTE: the resume argv written, the verdict, and the raw
 * column bytes of every row read through a second connection, so "untouched"
 * is a statement about the file. Then: the second pass writes nothing; the
 * latch is the arm's own; one column and nothing else is ever written; a throw
 * is that row's alone; no line names an argv token or the version the scan
 * read; and the composers' callers name the floor as D20 says (the harvest and
 * the admission driven over a planted scan, the rest read as text).
 *
 * THE FIX ROUND adds what the verifiers' attacks found: every row is judged by
 * the floor of ITS OWN binary, so a row recorded against a second pi install
 * (R13, R14) is never moved, and a person's own leading `--tui-mode regular`
 * (an agents.json template that starts with it, O1 and O2) is never taken out
 * as if it were Tortie's; a pass that read no row's floor leaves the latch
 * open; and the admission composes the token only for the very file the scan
 * read, as it is now.
 *
 * HERMETIC. One temp `ManifestStore`, removed in `afterEach`. The one scan is
 * a planted table whose pi binary is a `/bin/sh` shim in a scratch folder over
 * a faked login-shell PATH, so no agent on this Mac can answer. No tmux server
 * is contacted and no agent store is read.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { plantNpmPi } from '../../agents/__tests__/pi-install';

const scratch = mkdtempSync(join(tmpdir(), 'gmux-p350-pass-'));
const binDir = join(scratch, 'bin');
const extraDir = join(scratch, 'extra');
mkdirSync(binDir, { recursive: true });
mkdirSync(extraDir, { recursive: true });

vi.mock('../../tmux/resolve', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux/resolve')>();
  return {
    ...actual,
    getUserPath: () => Promise.resolve(binDir),
    extraBinDirs: () => [extraDir]
  };
});

// Nothing in this file may talk to a tmux server.
vi.mock(import('../../tmux'), async (importOriginal) => ({
  ...(await importOriginal()),
  setSessionOption: () => Promise.resolve(),
  execTmux: () => Promise.resolve('')
}));

import { getRegistryEntry, PI_INLINE_ARGS, PI_INLINE_FLOOR } from '../../agents/registry';
import {
  listDetectedAgents,
  piInlineFloorFor,
  piOwnResumeArgv,
  resetAgentTableSource,
  resetDetectionCache,
  setAgentTableSource
} from '../../agents/detection';
import { forgetConversationClaims } from '../../manifest/harvest';
import { ManifestStore, type ManifestSessionRecord } from '../../manifest/store';
import { wrapArgv } from '../../specstory';
import { admitConfirmedConversationId, type IdHarvestDeps } from '../id-harvest';
import {
  repairInlineSwitches,
  repairPiInline,
  repairPiInlineOnce,
  resetInlineRepairForTests,
  resetPiInlineRepairForTests,
  type InlineRepairOutcome,
  type PiPassReaders
} from '../inline-repair';
import { composeResumeArgv } from '../resume-argv';

// The literals this phase is about, spelled here on purpose, so a moved
// constant turns this file red rather than moving with it.
const TOK = ['--tui-mode', 'regular'];
const PI = '/Users/x/.npm-global/bin/pi';
/** A SECOND pi install on this Mac, whose version no scan read (the fix round). */
const OTHER_PI = '/opt/homebrew/bin/pi';
const FAR_PI = '/far/bin/pi';
const U = '019a0000-0000-7000-8000-000000000001';
const OTHER = '019a0000-0000-7000-8000-0000000000ff';
const SPECSTORY = '/Applications/Tortie.app/Contents/Resources/specstory/bin/specstory';
const NOW = 1_700_000_000_000;
type Reading = 'holds' | 'below' | 'unread';
/**
 * The pass's readers at one reading: the floor reads `floor` for {@link PI}, the
 * file the scan read pi's version from, and `unread` for every other binary;
 * the row's own composition is `own` (none of the person's own leads with the
 * token unless a case plants an agents.json template that does).
 */
function at(floor: Reading, own: readonly string[] = []): PiPassReaders {
  return { floorFor: (bin) => (bin === PI ? floor : 'unread'), ownResume: () => own };
}
const HERE = dirname(fileURLToPath(import.meta.url));
const SESSIONS = join(HERE, '..');

let dir: string;
let dbPath: string;
let store: ManifestStore;
let order = 0;
let lines: string[];
let quiet: MockInstance[];

beforeEach(() => {
  dir = mkdtempSync(join(scratch, 'db-'));
  dbPath = join(dir, 'manifest.db');
  store = new ManifestStore(dbPath);
  order = 0;
  resetPiInlineRepairForTests();
  resetInlineRepairForTests();
  forgetConversationClaims();
  lines = [];
  const capture = (...args: unknown[]): void => {
    lines.push(args.map(String).join(' '));
  };
  quiet = [
    vi.spyOn(console, 'warn').mockImplementation(capture),
    vi.spyOn(console, 'log').mockImplementation(capture),
    vi.spyOn(console, 'info').mockImplementation(capture)
  ];
});

afterEach(() => {
  for (const spy of quiet) spy.mockRestore();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  store.close();
  rmSync(dir, { recursive: true, force: true });
  resetDetectionCache();
  resetAgentTableSource();
});

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

// ---------------------------------------------------------------------------
// The rows
// ---------------------------------------------------------------------------

function insert(id: string, patch: Partial<ManifestSessionRecord>): void {
  order += 1;
  store.insertSession({
    id,
    name: `name-${id}`,
    tmuxName: id,
    projectPath: '/w',
    cwd: '/w',
    agent: 'pi' as ManifestSessionRecord['agent'],
    status: 'restorable',
    createdAt: NOW + order,
    lastSeen: NOW + order,
    argv: [PI],
    ...patch
  });
}

/** A row whose launch argv is its resume argv, as every pi row's is. */
function piRow(id: string, argv: string[], patch: Partial<ManifestSessionRecord> = {}): void {
  insert(id, { argv, resumeArgv: argv, agentSessionId: U, ...patch });
}

const WRAPPED = (() => {
  const argv = wrapArgv({ bin: SPECSTORY, provider: 'pi', inner: [PI, '--session-id', U], noCloud: true });
  if (argv === null) throw new Error('the fixture could not be wrapped');
  return argv;
})();

/** Every planted row, by name. */
function plantAll(): void {
  piRow('R1', [PI, '--session-id', U]);
  piRow('R2', [PI, '--session-id', U, '--model', 'm']);
  piRow('R3', [PI, '--session-id', U, '--tui-mode', 'fullscreen']);
  piRow('R4', [PI, ...TOK, '--session-id', U, '--model', 'm']);
  piRow('R5', [PI, ...TOK, '--session-id', U, '--tui-mode', 'fullscreen']);
  piRow('R6', [FAR_PI, '--session-id', U], { machineId: 'mac-pro' });
  piRow('R6b', [FAR_PI, ...TOK, '--session-id', U], { machineId: 'mac-pro' });
  piRow('R7', [PI, '--session-id', U], { status: 'discarded' });
  insert('R8', { argv: [PI] });
  insert('R9', { argv: [PI, '--session-id', U], agentSessionId: U });
  insert('R10', { argv: WRAPPED, resumeArgv: WRAPPED, agentSessionId: U });
  piRow('R11', [PI, '--session-id', OTHER]);
  piRow('R12', [PI, '--session-id', U, ...TOK]);
  // THE FIX ROUND: two rows recorded against a second pi install, one of them
  // with the token. No scan read that file, so the pass never moves either.
  piRow('R13', [OTHER_PI, '--session-id', U]);
  piRow('R14', [OTHER_PI, ...TOK, '--session-id', U, '--model', 'm']);
  // Three other agents carrying the same two words in the same place.
  insert('C1', { agent: 'codex', argv: ['/usr/local/bin/codex', ...TOK], resumeArgv: ['/usr/local/bin/codex', ...TOK, 'resume', U], agentSessionId: U });
  insert('C2', { agent: 'claude', argv: ['/usr/local/bin/claude', ...TOK], resumeArgv: ['/usr/local/bin/claude', '--resume', U], agentSessionId: U });
  insert('C3', { agent: 'omp' as ManifestSessionRecord['agent'], argv: ['/usr/local/bin/omp', ...TOK], resumeArgv: ['/usr/local/bin/omp', ...TOK, '--resume', U], agentSessionId: U });
}

/** Every row's raw column bytes, through a SECOND connection. */
function rawRows(): Map<string, Record<string, unknown>> {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const rows = db.prepare('SELECT * FROM sessions').all() as Record<string, unknown>[];
    return new Map(rows.map((row) => [String(row['id']), row]));
  } finally {
    db.close();
  }
}

function resumeOf(id: string): string[] | undefined {
  return store.getSession(id)?.resumeArgv;
}

function verdicts(outcomes: InlineRepairOutcome[]): Record<string, string> {
  return Object.fromEntries(outcomes.map((o) => [o.sessionId, o.verdict]));
}

/** What every row's resume argv must read after a pass at each reading. */
const AFTER: Record<'holds' | 'below' | 'unread', Record<string, string[] | undefined>> = {
  holds: {
    R1: [PI, ...TOK, '--session-id', U],
    R2: [PI, ...TOK, '--session-id', U, '--model', 'm'],
    R3: [PI, ...TOK, '--session-id', U, '--tui-mode', 'fullscreen'],
    R4: [PI, ...TOK, '--session-id', U, '--model', 'm'],
    R5: [PI, ...TOK, '--session-id', U, '--tui-mode', 'fullscreen'],
    R7: [PI, ...TOK, '--session-id', U],
    R12: [PI, ...TOK, '--session-id', U, ...TOK]
  },
  below: {
    R1: [PI, '--session-id', U],
    R2: [PI, '--session-id', U, '--model', 'm'],
    R3: [PI, '--session-id', U, '--tui-mode', 'fullscreen'],
    R4: [PI, '--session-id', U, '--model', 'm'],
    R5: [PI, '--session-id', U, '--tui-mode', 'fullscreen'],
    R7: [PI, '--session-id', U],
    R12: [PI, '--session-id', U, ...TOK]
  },
  unread: {}
};

const VERDICTS: Record<'holds' | 'below' | 'unread', Record<string, string>> = {
  holds: {
    R1: 'rewritten',
    R2: 'rewritten',
    R3: 'rewritten',
    R4: 'already-right',
    R5: 'already-right',
    R7: 'rewritten',
    R8: 'no-id',
    R9: 'no-resume-argv',
    R10: 'unreadable',
    R11: 'recorded-differs',
    R12: 'rewritten',
    R13: 'no-floor',
    R14: 'no-floor'
  },
  below: {
    R1: 'already-right',
    R2: 'already-right',
    R3: 'already-right',
    R4: 'rewritten',
    R5: 'rewritten',
    R7: 'already-right',
    R8: 'no-id',
    R9: 'no-resume-argv',
    R10: 'unreadable',
    R11: 'recorded-differs',
    R12: 'already-right',
    R13: 'no-floor',
    R14: 'no-floor'
  },
  unread: {
    R1: 'no-floor',
    R2: 'no-floor',
    R3: 'no-floor',
    R4: 'no-floor',
    R5: 'no-floor',
    R7: 'no-floor',
    R8: 'no-id',
    R9: 'no-resume-argv',
    R10: 'unreadable',
    R11: 'no-floor',
    R12: 'no-floor',
    R13: 'no-floor',
    R14: 'no-floor'
  }
};

// ---------------------------------------------------------------------------
// The arm, at each reading
// ---------------------------------------------------------------------------

describe('the pi arm over the planted rows, byte for byte', () => {
  for (const floor of ['holds', 'below', 'unread'] as const) {
    it(`at a floor that reads ${floor}`, () => {
      plantAll();
      const before = rawRows();
      const outcomes = repairPiInline(store, at(floor));

      // Exactly the local pi rows were read, and every one answered.
      expect(verdicts(outcomes)).toEqual(VERDICTS[floor]);
      expect(outcomes.every((o) => o.arm === 'pi' && o.agent === 'pi')).toBe(true);

      const after = rawRows();
      for (const [id, row] of before) {
        const want = AFTER[floor][id];
        const moved = VERDICTS[floor][id] === 'rewritten';
        if (!moved) {
          // Untouched: every column's bytes, read through a second connection.
          expect(after.get(id), id).toEqual(row);
          continue;
        }
        expect(resumeOf(id), id).toEqual(want);
        // ONE column moved, and only that one.
        const { resume_argv: _was, ...restBefore } = row;
        const { resume_argv: _now, ...restAfter } = after.get(id) ?? {};
        expect(restAfter, id).toEqual(restBefore);
      }
      // The rows the arm writes nothing to keep their resume argv as planted,
      // and a row it leaves already-right reads what the table says.
      for (const [id, want] of Object.entries(AFTER[floor])) {
        expect(resumeOf(id), id).toEqual(want);
      }
    });
  }

  it("never touches another machine's pi row, nor any other agent's, whatever their argv holds", () => {
    plantAll();
    const before = rawRows();
    for (const floor of ['holds', 'below'] as const) {
      const outcomes = repairPiInline(store, at(floor));
      for (const id of ['R6', 'R6b', 'C1', 'C2', 'C3']) {
        expect(outcomes.some((o) => o.sessionId === id), `${floor} ${id}`).toBe(false);
        expect(rawRows().get(id), `${floor} ${id}`).toEqual(before.get(id));
      }
    }
  });

  it('writes nothing on a second pass, at either reading', () => {
    plantAll();
    repairPiInline(store, at('holds'));
    const once = rawRows();
    const again = repairPiInline(store, at('holds'));
    expect(again.filter((o) => o.verdict === 'rewritten')).toEqual([]);
    expect(rawRows()).toEqual(once);

    repairPiInline(store, at('below'));
    const down = rawRows();
    const downAgain = repairPiInline(store, at('below'));
    expect(downAgain.filter((o) => o.verdict === 'rewritten')).toEqual([]);
    expect(rawRows()).toEqual(down);
  });

  it('round trips: below then holds gives back what holds alone gives', () => {
    plantAll();
    repairPiInline(store, at('holds'));
    const held = rawRows();
    repairPiInline(store, at('below'));
    repairPiInline(store, at('holds'));
    for (const id of ['R1', 'R2', 'R3', 'R4', 'R5', 'R7']) {
      expect(rawRows().get(id)?.['resume_argv'], id).toEqual(held.get(id)?.['resume_argv']);
    }
  });

  it('writes through setResumeArgvColumn alone: never the env column, never the whole row', () => {
    plantAll();
    const argv = vi.spyOn(store, 'setResumeArgvColumn');
    const env = vi.spyOn(store, 'setEnvColumn');
    const whole = vi.spyOn(store, 'updateSession');
    repairPiInline(store, at('holds'));
    expect(argv).toHaveBeenCalledTimes(5);
    expect(env).not.toHaveBeenCalled();
    expect(whole).not.toHaveBeenCalled();
  });

  it("one row's throw is that row's alone, and it keeps its bytes", () => {
    plantAll();
    const real = store.setResumeArgvColumn.bind(store);
    vi.spyOn(store, 'setResumeArgvColumn').mockImplementation((id, value) => {
      if (id === 'R2') throw new Error(JSON.stringify({ code: 'MANIFEST_WRITE_FAILED' }));
      real(id, value);
    });
    const before = rawRows();
    const outcomes = repairPiInline(store, at('holds'));
    expect(verdicts(outcomes)['R2']).toBe('threw');
    expect(rawRows().get('R2')).toEqual(before.get('R2'));
    expect(resumeOf('R3')).toEqual(AFTER.holds['R3']);
    expect(lines.some((line) => line.includes('"name-R2"') && line.includes('MANIFEST_WRITE_FAILED'))).toBe(true);
  });

  it("Phase 331's own pass reads no pi row (M2: 0 outcomes, 0 writes)", () => {
    plantAll();
    const before = rawRows();
    const outcomes = repairInlineSwitches(store);
    expect(outcomes.filter((o) => o.agent === 'pi')).toEqual([]);
    for (const id of ['R1', 'R4', 'R7', 'R12']) expect(rawRows().get(id), id).toEqual(before.get(id));
  });
});

describe('the latch is the arm\'s own', () => {
  it("runs once, then reads nothing, apart from Phase 331's latch", () => {
    plantAll();
    const first = repairPiInlineOnce(store, at('holds'));
    expect(first?.filter((o) => o.verdict === 'rewritten').length).toBe(5);
    const list = vi.spyOn(store, 'listSessions');
    expect(repairPiInlineOnce(store, at('below'))).toBeNull();
    expect(list).not.toHaveBeenCalled();
    // Phase 331's pass is not latched by it, and its latch does not hold this.
    expect(repairInlineSwitches(store)).toBeDefined();
    resetPiInlineRepairForTests();
    expect(repairPiInlineOnce(store, at('holds'))).not.toBeNull();
  });

  it('a store that throws on its read leaves the latch open', () => {
    vi.spyOn(store, 'listSessions').mockImplementationOnce(() => {
      throw new Error('locked');
    });
    expect(() => repairPiInlineOnce(store, at('holds'))).toThrow('locked');
    plantAll();
    expect(repairPiInlineOnce(store, at('holds'))).not.toBeNull();
  });

  it("a pass that read no row's floor leaves the latch open, and moved nothing", () => {
    plantAll();
    const before = rawRows();
    const unread = repairPiInlineOnce(store, at('unread'));
    expect(unread?.some((o) => o.verdict === 'no-floor')).toBe(true);
    expect(rawRows()).toEqual(before);
    // A later pass that does read the floor still runs, and then latches.
    const held = repairPiInlineOnce(store, at('holds'));
    expect(held?.filter((o) => o.verdict === 'rewritten').length).toBe(5);
    expect(repairPiInlineOnce(store, at('holds'))).toBeNull();
  });

  it('a pass with no pi row on this Mac to read latches', () => {
    insert('C1', { agent: 'codex', argv: ['/usr/local/bin/codex'] });
    expect(repairPiInlineOnce(store, at('unread'))).toEqual([]);
    expect(repairPiInlineOnce(store, at('holds'))).toBeNull();
  });
});

describe('each row is judged by its own binary (the fix round)', () => {
  it('a row recorded against a second pi install is never moved, at any reading of the scanned one', () => {
    plantAll();
    const before = rawRows();
    for (const floor of ['holds', 'below'] as const) {
      const outcomes = repairPiInline(store, at(floor));
      for (const id of ['R13', 'R14']) {
        expect(verdicts(outcomes)[id], `${floor} ${id}`).toBe('no-floor');
        expect(rawRows().get(id), `${floor} ${id}`).toEqual(before.get(id));
      }
    }
  });

  it('the floor is asked for the binary each row records, and for nothing else', () => {
    plantAll();
    const asked: string[] = [];
    repairPiInline(store, {
      floorFor: (bin) => {
        asked.push(bin);
        return 'holds';
      },
      ownResume: () => []
    });
    expect([...new Set(asked)].sort()).toEqual([OTHER_PI, PI].sort());
  });
});

describe("a person's own leading --tui-mode regular is theirs (the fix round)", () => {
  // An agents.json row whose resume.template is ['--tui-mode', 'regular',
  // '--session-id', <sessionId>]: the person's own composition leads with it.
  const OWN = [PI, ...TOK, '--session-id', U];

  it("below the floor: one copy is the person's and stays; of two, the first is Tortie's and comes out", () => {
    piRow('O1', [PI, ...TOK, '--session-id', U]);
    piRow('O2', [PI, ...TOK, ...TOK, '--session-id', U]);
    const before = rawRows();
    const outcomes = repairPiInline(store, at('below', OWN));
    expect(verdicts(outcomes)).toEqual({ O1: 'already-right', O2: 'rewritten' });
    expect(rawRows().get('O1')).toEqual(before.get('O1'));
    expect(resumeOf('O2')).toEqual([PI, ...TOK, '--session-id', U]);
  });

  it('at the floor: either is already inline and moves nothing', () => {
    piRow('O1', [PI, ...TOK, '--session-id', U]);
    piRow('O2', [PI, ...TOK, ...TOK, '--session-id', U]);
    const before = rawRows();
    expect(verdicts(repairPiInline(store, at('holds', OWN)))).toEqual({ O1: 'already-right', O2: 'already-right' });
    expect(rawRows()).toEqual(before);
  });

  it("with no agents.json row, the same leading words are Tortie's and come out below the floor", () => {
    piRow('O1', [PI, ...TOK, '--session-id', U]);
    expect(verdicts(repairPiInline(store, at('below')))).toEqual({ O1: 'rewritten' });
    expect(resumeOf('O1')).toEqual([PI, '--session-id', U]);
  });

  it("a row whose own launch flags come first and lead with the words keeps the person's copy; only Tortie's comes out (the fix round)", () => {
    // An agents.json row that puts a person's launch flags BEFORE the template
    // (resumeExtrasPosition 'leading'), read through the SHIPPING reader. The
    // launch argv records the flags after the id, where launchArgvFor puts them.
    const pi = getRegistryEntry('pi');
    setAgentTableSource(() => [{ ...pi, resume: { ...pi.resume, resumeExtrasPosition: 'leading' } }]);
    try {
      // L1: recorded with no token of Tortie's; the leading pair is the person's.
      insert('L1', { argv: [PI, '--session-id', U, ...TOK, '--model', 'm'], resumeArgv: [PI, ...TOK, '--model', 'm', '--session-id', U], agentSessionId: U });
      // L2: Tortie's copy before the person's own.
      insert('L2', { argv: [PI, ...TOK, '--session-id', U, ...TOK], resumeArgv: [PI, ...TOK, ...TOK, '--session-id', U], agentSessionId: U });
      // L3: Tortie's copy, and the person's leading flags are something else.
      insert('L3', { argv: [PI, ...TOK, '--session-id', U, '--model', 'm'], resumeArgv: [PI, ...TOK, '--model', 'm', '--session-id', U], agentSessionId: U });
      const outcomes = repairPiInline(store, { floorFor: (bin) => (bin === PI ? 'below' : 'unread'), ownResume: piOwnResumeArgv });
      expect(verdicts(outcomes)).toEqual({ L1: 'already-right', L2: 'rewritten', L3: 'rewritten' });
      expect(resumeOf('L1')).toEqual([PI, ...TOK, '--model', 'm', '--session-id', U]);
      expect(resumeOf('L2')).toEqual([PI, ...TOK, '--session-id', U]);
      expect(resumeOf('L3')).toEqual([PI, '--model', 'm', '--session-id', U]);
    } finally {
      resetAgentTableSource();
    }
  });
});

describe('the lines it writes', () => {
  it('one sentence naming every verdict with its count, and no argv token or read version', () => {
    plantAll();
    repairPiInline(store, at('holds'));
    const sentence = lines.find((line) => line.includes('the pi inline token pass gave'));
    expect(sentence).toBeDefined();
    expect(sentence).toContain(`gave 5 pi row(s) on this Mac the inline token and took it out of 0, below pi ${PI_INLINE_FLOOR}`);
    expect(sentence).toContain(
      'Verdicts: rewritten 5, already-right 2, no-id 1, no-resume-argv 1, unreadable 1, recorded-differs 1, no-floor 2.'
    );
    // One warning per row a person should know about, none for the rest.
    const warned = lines.filter((line) => line.includes('left session'));
    expect(warned).toHaveLength(2);
    expect(warned.some((line) => line.includes('"name-R10"') && line.includes('unreadable'))).toBe(true);
    expect(warned.some((line) => line.includes('"name-R11"') && line.includes('recorded-differs'))).toBe(true);

    // After that pass all seven rows that carry their own id lead with it.
    lines.length = 0;
    repairPiInline(store, at('below'));
    expect(lines.some((line) => line.includes(`gave 0 pi row(s) on this Mac the inline token and took it out of 7, below pi ${PI_INLINE_FLOOR}`))).toBe(true);

    lines.length = 0;
    repairPiInline(store, at('unread'));
    const unread = lines.find((line) => line.includes('the pi inline token pass'));
    expect(unread).toContain('moved no pi row on this Mac, because no pi version was read for the binary any of them names');
    expect(unread).toContain('no-floor 10');
    // `no-floor` is warned about in no line.
    expect(lines.filter((line) => line.includes('left session') && line.includes('no-floor'))).toEqual([]);
  });

  it('every line it ever wrote names no argv token, no id and no version', () => {
    plantAll();
    for (const floor of ['holds', 'below', 'unread'] as const) repairPiInline(store, at(floor));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      for (const token of [...TOK, '--session-id', U, OTHER, PI, OTHER_PI, FAR_PI, '--model', 'fullscreen', '1.4.0', '0.99.2']) {
        expect(line.includes(token), `${line} names ${token}`).toBe(false);
      }
    }
  });

  it('says nothing at all when there is no pi row on this Mac', () => {
    insert('C1', { agent: 'codex', argv: ['/usr/local/bin/codex'] });
    piRow('R6', [FAR_PI, '--session-id', U], { machineId: 'mac-pro' });
    expect(repairPiInline(store, at('holds'))).toEqual([]);
    expect(lines.filter((line) => line.includes('pi inline token'))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// D20: the composers' callers name the floor
// ---------------------------------------------------------------------------

/** The version file the pi shim prints. */
const versionFile = join(scratch, 'pi-version');
/** The shim's bytes; a reinstall writes others at the same path. */
const SHIM_TEXT = `#!/bin/sh\n/bin/cat '${versionFile}'\n`;
/**
 * The pi binary the scan resolves and reads, and the one the admission's rows
 * record: planted as npm lays pi out, a link on the scratch PATH to its
 * package's `dist/cli.js`, because since his ruling of 2026-11-02 (R1) the
 * floor holds only inside pi's own package.
 */
const SHIM = plantNpmPi(scratch, SHIM_TEXT, { binName: 'p350pass-pi' }).bin;
/** A second pi install, in a package of its own, the scan never resolves, so no version of it is ever read. */
const SECOND = plantNpmPi(join(scratch, 'second'), SHIM_TEXT).bin;

/** Answer the one scan with pi at `band`, so `piInlineFloorFor(SHIM)` reads it. */
async function scanReads(band: string | null): Promise<void> {
  for (const name of ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_PROBES', 'GMUX_UPDATE_REHEARSAL']) vi.stubEnv(name, undefined);
  resetDetectionCache();
  setAgentTableSource(() =>
    band === null
      ? []
      : [{ ...getRegistryEntry('pi'), binaries: ['p350pass-pi'], extraProbeDirs: [], storeDirs: [] }]
  );
  writeFileSync(versionFile, `${band ?? ''}\n`);
  await listDetectedAgents();
}

function deps(): IdHarvestDeps {
  return {
    manifest: store,
    liveIds: new Map(),
    idCaptureWatches: new Map(),
    isDisposed: () => false,
    broadcastSessions: () => undefined
  };
}

describe('the floor at the composers (D20)', () => {
  it('composeResumeArgv hands the floor to the one composer', () => {
    insert('A', { argv: [PI] });
    const rec = store.getSession('A');
    if (rec === undefined) throw new Error('no row');
    expect(composeResumeArgv(rec, 'pi', U, [], true)?.argv).toEqual([PI, ...TOK, '--session-id', U]);
    expect(composeResumeArgv(rec, 'pi', U, [], false)?.argv).toEqual([PI, '--session-id', U]);
    expect(composeResumeArgv(rec, 'pi', U, [])?.argv).toEqual([PI, '--session-id', U]);
  });

  for (const [band, token] of [
    ['1.4.0', true],
    ['0.84.0', true],
    ['0.83.0', false],
    [null, false]
  ] as const) {
    it(`the admission composes the token exactly when the scan reads pi at the floor (${String(band)})`, async () => {
      await scanReads(band);
      expect(piInlineFloorFor(SHIM)).toBe(band === null ? 'unread' : token ? 'holds' : 'below');
      insert('A', { argv: [SHIM, '--model', 'm'] });
      const rec = store.getSession('A');
      if (rec === undefined) throw new Error('no row');
      expect(admitConfirmedConversationId(deps(), rec, U, NOW)).toBe('written');
      expect(resumeOf('A')).toEqual(
        token ? [SHIM, ...TOK, '--session-id', U, '--model', 'm'] : [SHIM, '--session-id', U, '--model', 'm']
      );
    });
  }

  it('the admission composes no token for a row that records another pi install, though the scanned one holds', async () => {
    await scanReads('1.4.0');
    expect(piInlineFloorFor(SHIM)).toBe('holds');
    expect(piInlineFloorFor(SECOND)).toBe('unread');
    insert('A', { argv: [SECOND, '--model', 'm'] });
    const rec = store.getSession('A');
    if (rec === undefined) throw new Error('no row');
    expect(admitConfirmedConversationId(deps(), rec, U, NOW)).toBe('written');
    expect(resumeOf('A')).toEqual([SECOND, '--session-id', U, '--model', 'm']);
  });

  it('nor for the scanned file once it has been rewritten since the scan read it', async () => {
    await scanReads('1.4.0');
    expect(piInlineFloorFor(SHIM)).toBe('holds');
    try {
      writeFileSync(SHIM, `${SHIM_TEXT}# reinstalled\n`);
      expect(piInlineFloorFor(SHIM)).toBe('unread');
      insert('A', { argv: [SHIM, '--model', 'm'] });
      const rec = store.getSession('A');
      if (rec === undefined) throw new Error('no row');
      expect(admitConfirmedConversationId(deps(), rec, U, NOW)).toBe('written');
      expect(resumeOf('A')).toEqual([SHIM, '--session-id', U, '--model', 'm']);
    } finally {
      writeFileSync(SHIM, SHIM_TEXT);
    }
  });

  it("the admission composes no token for a version manager's shim the scan read at 1.4.0 (his ruling of 2026-11-02, R1)", async () => {
    // A shim is ONE file outside pi's package whose dispatcher picks pi's version by folder; the scan's
    // reading of it says nothing of the pi a pinned project runs, so it reads unread and composes as today.
    const shim = join(binDir, 'p350pass-shim');
    writeFileSync(shim, SHIM_TEXT, { mode: 0o755 });
    for (const name of ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_PROBES', 'GMUX_UPDATE_REHEARSAL']) vi.stubEnv(name, undefined);
    resetDetectionCache();
    setAgentTableSource(() => [{ ...getRegistryEntry('pi'), binaries: ['p350pass-shim'], extraProbeDirs: [], storeDirs: [] }]);
    writeFileSync(versionFile, '1.4.0\n');
    const scan = await listDetectedAgents();
    expect(scan.agents.find((a) => a.id === 'pi')?.version).toBe('1.4.0');
    expect(piInlineFloorFor(shim)).toBe('unread');
    insert('A', { argv: [shim, '--model', 'm'] });
    const rec = store.getSession('A');
    if (rec === undefined) throw new Error('no row');
    expect(admitConfirmedConversationId(deps(), rec, U, NOW)).toBe('written');
    expect(resumeOf('A')).toEqual([shim, '--session-id', U, '--model', 'm']);
  });

  it("the harvest and the admission both ask the floor with pi's own name, and the two Codex paths say false", () => {
    const harvest = readFileSync(join(SESSIONS, 'id-harvest.ts'), 'utf8');
    // The fix round: each asks the floor of the binary its resume runs.
    expect(harvest.split("=== 'pi' && piInlineFloorFor(resumeBinOf(rec, ").length - 1).toBe(2);
    const repair = readFileSync(join(SESSIONS, 'codex-repair.ts'), 'utf8');
    expect(repair).toMatch(/agentExtrasOf\(rec\),\s*false\s*\)/);
    const pass = readFileSync(join(SESSIONS, 'inline-repair.ts'), 'utf8');
    expect(pass).toContain("composeResumeArgv(rec, 'codex', id, agentExtrasOf(rec), false)");
    expect(pass).toContain("registryResumeArgv('codex', id, own, recorded[0], false)");
  });

  it('a create reads the version ONCE, before the launch is composed, and asks the floor of the binary it runs', () => {
    const create = readFileSync(join(SESSIONS, 'create-local.ts'), 'utf8');
    const reads = create.split('deps.cachedAgentVersion(input.agent)').length - 1;
    expect(reads).toBe(1);
    const readAt = create.indexOf('const agentVersion = deps.cachedAgentVersion(input.agent);');
    const composeAt = create.indexOf('await resolveLaunchSpec(');
    expect(readAt).toBeGreaterThan(-1);
    expect(composeAt).toBeGreaterThan(readAt);
    const call = create.slice(composeAt, create.indexOf(');', composeAt));
    // The fix round: the floor of the binary this create resolved, the one the row records.
    // The second ruled round: as the pane will run it, spawned by its bare name from the
    // PATH the one writer installed and the folder the create hands tmux.
    expect(call).toMatch(/=== 'pi' && piInlineFloorFor\(binPath, spawnedBy\) === 'holds'/);
    expect(create).toContain('const panePath = await tmux.installUserPath();');
    expect(create).toContain('const spawnedBy = bareName === undefined ? undefined : { name: bareName, path: panePath, folder: cwd };');
    expect(create.indexOf('const spawnedBy =')).toBeLessThan(composeAt);
    // The row records the version read from that same scan.
    expect(create.slice(composeAt)).toMatch(/newSessionRecord\(\{[\s\S]*?\n\s*agentVersion,\n/);
  });

  it('the far callers pass the literal false: no pi on another machine is handed the token (D2)', () => {
    const MACHINES = join(SESSIONS, '..', 'machines');
    const far = readFileSync(join(MACHINES, 'remote-sessions.ts'), 'utf8');
    expect(far).toContain('return launchArgvFor(entry, extraArgs, undefined, agentSessionId, false);');
    expect(far).toMatch(/resumeArgvFor\(\s*entry,\s*agentSessionId,\s*input\.extraArgs \?\? \[\],\s*bin,\s*false\s*\)/);
    const record = readFileSync(join(MACHINES, 'remote-record.ts'), 'utf8');
    expect(record).toMatch(/ownLaunchFlags\(input\.agent, record\.argv\),\s*record\.argv\[0\],\s*false\s*\)/);
  });

  it('the token pair is spelled once, in the registry', () => {
    expect([...PI_INLINE_ARGS]).toEqual(TOK);
    for (const file of ['inline-repair.ts', 'create-local.ts', 'id-harvest.ts', 'core.ts']) {
      const text = readFileSync(join(SESSIONS, file), 'utf8');
      expect(text.includes("'--tui-mode'"), file).toBe(false);
    }
  });
});
