/**
 * Phase 331 — the boot pass that brings recorded rows across to the inline
 * switches, over a real manifest.
 *
 * The property list this file exists for, in the order the phase is judged on
 * (build/p331/SPEC.md §2.4.5 and §2.4.7): a pre-phase Codex resume argv gains
 * the pair once and only the pair; a row already right is BYTE IDENTICAL, read
 * as raw column bytes through a second connection rather than through the
 * store's own decoder; a captured row is re-wrapped or left alone and never
 * armed bare; a Codex row on another machine keeps its far `argv[0]`; a local
 * Claude row gains the variable unless its env already names it with any value;
 * a Claude row elsewhere and every row of every other agent are never touched;
 * each write is one patch of one field; the second pass writes nothing; a
 * throw is that row's alone; and in `resumeIdHarvests` the pass runs after
 * Phase 215's repair, before the claim seeding, once per process.
 *
 * WHAT THIS FILE CANNOT SHOW. It never restores anything, so it cannot show
 * that the argv it writes brings Codex back inline. That is `probe:p331`'s arm
 * (d) and the full `conformance:resume`, both run by the verifiers.
 *
 * Nothing here opens a Codex store: Phase 215's repair is replaced by a
 * recorder, because R18 asks only WHEN it runs relative to this pass. No tmux
 * server is contacted and no home directory is read.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock, type MockInstance } from 'vitest';

const events = vi.hoisted(() => [] as string[]);

// R18. Phase 215's repair opens codex's own store; here it only says it ran.
vi.mock('../codex-repair', () => ({
  repairCodexResumeIds: vi.fn(() => {
    events.push('codex-repair');
    return [];
  })
}));

// Nothing in this file may talk to a tmux server. Only the two verbs the
// harvest's write path could reach are replaced.
vi.mock(import('../../tmux'), async (importOriginal) => ({
  ...(await importOriginal()),
  setSessionOption: () => Promise.resolve(),
  execTmux: () => Promise.resolve('')
}));

import {
  AGENT_REGISTRY,
  CLAUDE_INLINE_ENV,
  CODEX_SCROLLBACK_ARGS
} from '../../agents/registry';
import {
  buildRecoveryContract,
  conversationClaimant,
  SESSION_CONTRACT_VERSION,
  type ResumeProvenance
} from '../../manifest';
import { forgetConversationClaims } from '../../manifest/harvest';
import { ManifestStore, type ManifestSessionRecord } from '../../manifest/store';
import { wrapArgv, type WrapInput } from '../../specstory';
import type { SpecstoryCaptureRecord } from '../../specstory/capture';
import { repairCodexResumeIds } from '../codex-repair';
import { resumeIdHarvests, type IdHarvestDeps } from '../id-harvest';
import {
  repairInlineSwitches,
  repairInlineSwitchesOnce,
  resetInlineRepairForTests,
  type InlineRepairOutcome,
  type InlineRepairStore
} from '../inline-repair';

// ---------------------------------------------------------------------------
// The literals this phase is about, spelled here on purpose so a moved
// constant turns this file red rather than moving with it
// ---------------------------------------------------------------------------

const PAIR = ['-c', 'tui.fullscreen_transcript=false'];
const VARIABLE = 'CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN';

const CODEX = '/usr/local/bin/codex';
const FAR_CODEX = '/home/far/.local/bin/codex';
const CLAUDE = '/usr/local/bin/claude';
const SPECSTORY = '/Applications/Tortie.app/Contents/Resources/specstory/bin/specstory';
const ID = '019a0c00-0000-7000-8000-000000000001';
const MACHINE = 'build-box';
const NOW = 1_700_000_000_000;

let dir: string;
let dbPath: string;
let store: ManifestStore;
let order = 0;
let consoleLines: string[];
let quiet: MockInstance[];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'p331-inline-repair-'));
  dbPath = join(dir, 'manifest.db');
  store = new ManifestStore(dbPath);
  order = 0;
  events.length = 0;
  vi.mocked(repairCodexResumeIds).mockClear();
  resetInlineRepairForTests();
  forgetConversationClaims();
  consoleLines = [];
  const capture = (...args: unknown[]): void => {
    consoleLines.push(args.map(String).join(' '));
  };
  quiet = [
    vi.spyOn(console, 'warn').mockImplementation(capture),
    vi.spyOn(console, 'log').mockImplementation(capture)
  ];
});

afterEach(() => {
  for (const spy of quiet) spy.mockRestore();
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/** One row, inserted in order so `listSessions` returns them as written. */
function insert(id: string, patch: Partial<ManifestSessionRecord> = {}): ManifestSessionRecord {
  order += 1;
  return store.insertSession({
    id,
    name: `name-${id}`,
    tmuxName: id,
    projectPath: '/w',
    cwd: '/w',
    agent: 'codex',
    status: 'restorable',
    createdAt: NOW + order,
    lastSeen: NOW + order,
    argv: [CODEX, '--yolo'],
    ...patch
  });
}

/** A Codex row written BEFORE this phase: no pair anywhere. */
function prePhaseCodex(id: string, patch: Partial<ManifestSessionRecord> = {}): void {
  insert(id, {
    agentSessionId: ID,
    argv: [CODEX, '--yolo'],
    resumeArgv: [CODEX, 'resume', ID, '--yolo'],
    ...patch
  });
}

function claudeRow(id: string, patch: Partial<ManifestSessionRecord> = {}): void {
  insert(id, {
    agent: 'claude',
    agentSessionId: ID,
    argv: [CLAUDE, '--session-id', ID],
    resumeArgv: [CLAUDE, '--resume', ID],
    ...patch
  });
}

function captureRecord(
  provider: string,
  agentArgv: string[]
): SpecstoryCaptureRecord {
  return {
    enabled: true,
    bin: SPECSTORY,
    binVersion: '2.8.0',
    provider,
    exitCodeFidelity: 'exact',
    agentArgv,
    noCloud: true
  };
}

function wrapped(provider: string, inner: string[]): string[] {
  const input: WrapInput = { bin: SPECSTORY, provider, inner, noCloud: true };
  const argv = wrapArgv(input);
  if (argv === null) throw new Error('the fixture could not be wrapped');
  return argv;
}

// ---------------------------------------------------------------------------
// Reading what is on disk
// ---------------------------------------------------------------------------

/**
 * Every row's raw column bytes, through a SECOND connection, so "byte
 * identical" is a statement about the file and not about the store's decoder.
 */
function rawRows(): Map<string, string> {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const rows = db
      .prepare('SELECT * FROM sessions ORDER BY created_at ASC')
      .all() as Record<string, unknown>[];
    return new Map(rows.map((row) => [String(row['id']), JSON.stringify(row)]));
  } finally {
    db.close();
  }
}

/** The digest the spec names: the whole decoded state of every row. */
function digest(): string {
  return JSON.stringify(store.listSessions());
}

function outcomeFor(outcomes: InlineRepairOutcome[], id: string): InlineRepairOutcome | undefined {
  return outcomes.find((o) => o.sessionId === id);
}

function verdictOf(outcomes: InlineRepairOutcome[], id: string): string {
  return outcomeFor(outcomes, id)?.verdict ?? 'no-outcome';
}

function countPairs(argv: readonly string[]): number {
  let n = 0;
  for (let i = 1; i + 1 < argv.length; i += 1) {
    if (argv[i] === PAIR[0] && argv[i + 1] === PAIR[1]) n += 1;
  }
  return n;
}

/** Which write a call was: one of the pass's two one-column statements, or the whole-row patch it must never use. */
type WriteKind = 'resumeArgv' | 'env' | 'updateSession';

/**
 * A spy on the real store's writes that still writes: the two one-column
 * statements the pass uses since Phase 331's fix round, and `updateSession`,
 * which it must never call (it writes every column back from the decoded row).
 * Every call lands in ONE recorder as `(id, kind)`.
 */
function spyOnWrites(): Mock<(id: string, kind: WriteKind) => void> {
  const writes = vi.fn<(id: string, kind: WriteKind) => void>();
  const argv = store.setResumeArgvColumn.bind(store);
  const env = store.setEnvColumn.bind(store);
  const whole = store.updateSession.bind(store);
  vi.spyOn(store, 'setResumeArgvColumn').mockImplementation((id, value) => {
    events.push(`update:${id}`);
    writes(id, 'resumeArgv');
    argv(id, value);
  });
  vi.spyOn(store, 'setEnvColumn').mockImplementation((id, value) => {
    events.push(`update:${id}`);
    writes(id, 'env');
    env(id, value);
  });
  vi.spyOn(store, 'updateSession').mockImplementation((id, patch, opts) => {
    events.push(`update:${id}`);
    writes(id, 'updateSession');
    return whole(id, patch, opts);
  });
  return writes;
}

// ---------------------------------------------------------------------------
// The argv arm
// ---------------------------------------------------------------------------

describe('the argv arm: Codex', () => {
  it('a codex row written before this phase gains the pair once and keeps --yolo', () => {
    // The constant is the one this file spells, so a changed switch reads red
    // here as well as in the registry's own pins.
    expect([...CODEX_SCROLLBACK_ARGS]).toEqual(PAIR);
    prePhaseCodex('pre');

    const outcomes = repairInlineSwitches(store);

    expect(outcomeFor(outcomes, 'pre')).toMatchObject({
      arm: 'argv-here',
      verdict: 'rewritten',
      agent: 'codex'
    });
    const after = store.getSession('pre');
    expect(after?.resumeArgv).toEqual([CODEX, 'resume', ID, ...PAIR, '--yolo']);
    expect(countPairs(after?.resumeArgv ?? [])).toBe(1);
    // The launch argv is the create's record and never moves.
    expect(after?.argv).toEqual([CODEX, '--yolo']);
  });

  it("a pre-phase codex row carrying the person's own =true keeps it after the pair, so it still wins", () => {
    // Codex takes the LATER of two -c values for one key, so the person's own
    // opt-out must trail the pair on the rewritten argv exactly as on a create.
    prePhaseCodex('own-true', {
      argv: [CODEX, '-c', 'tui.fullscreen_transcript=true'],
      resumeArgv: [CODEX, 'resume', ID, '-c', 'tui.fullscreen_transcript=true']
    });

    const outcomes = repairInlineSwitches(store);

    expect(verdictOf(outcomes, 'own-true')).toBe('rewritten');
    expect(store.getSession('own-true')?.resumeArgv).toEqual([
      CODEX,
      'resume',
      ID,
      ...PAIR,
      '-c',
      'tui.fullscreen_transcript=true'
    ]);
  });

  it('a codex row whose resume argv was shaped differently, or cannot be read back, is reported and never rewritten', () => {
    // An older build that did not re-append the launch flags: the composition
    // would ADD --yolo as well as the pair, which is more than this pass does.
    insert('shaped-differently', {
      agentSessionId: ID,
      argv: [CODEX, '--yolo'],
      resumeArgv: [CODEX, 'resume', ID]
    });
    // Captured, and the recorded wrap's own words differ from the record's (no
    // --no-cloud-sync where the record says the session is cloud free).
    insert('wrap-words-differ', {
      agentSessionId: ID,
      argv: wrapped('codex', [CODEX, '--yolo']),
      resumeArgv: [SPECSTORY, 'run', 'codex', '--no-version-check', '--silent', '-c', `${CODEX} resume ${ID} --yolo`],
      specstory: captureRecord('codex', [CODEX, '--yolo'])
    });
    // Captured, and armed bare by some earlier path: the composition is
    // wrapped, which is a different shape rather than two inserted tokens.
    insert('wrapped-vs-bare', {
      agentSessionId: ID,
      argv: wrapped('codex', [CODEX, '--yolo']),
      resumeArgv: [CODEX, 'resume', ID, '--yolo'],
      specstory: captureRecord('codex', [CODEX, '--yolo'])
    });
    // A wrap whose inner command is missing altogether.
    insert('unreadable-wrap', {
      agentSessionId: ID,
      argv: wrapped('codex', [CODEX, '--yolo']),
      resumeArgv: [SPECSTORY, 'run', 'codex', '--no-version-check', '--silent', '-c'],
      specstory: captureRecord('codex', [CODEX, '--yolo'])
    });
    const before = rawRows();
    const writes = spyOnWrites();

    const outcomes = repairInlineSwitches(store);

    expect(verdictOf(outcomes, 'shaped-differently')).toBe('recorded-differs');
    expect(verdictOf(outcomes, 'wrap-words-differ')).toBe('recorded-differs');
    expect(verdictOf(outcomes, 'wrapped-vs-bare')).toBe('recorded-differs');
    expect(verdictOf(outcomes, 'unreadable-wrap')).toBe('unreadable');
    expect(writes).not.toHaveBeenCalled();
    expect(rawRows()).toEqual(before);
    // Each is said once, by name.
    for (const id of ['shaped-differently', 'wrap-words-differ', 'wrapped-vs-bare', 'unreadable-wrap']) {
      expect(consoleLines.filter((l) => l.includes(`"name-${id}"`))).toHaveLength(1);
    }
  });

  it('a codex row already carrying the pair, leading or trailing, is byte identical', () => {
    // Trailing: what a create at this build records, then its harvest.
    insert('trailing', {
      agentSessionId: ID,
      argv: [CODEX, ...PAIR, '--yolo'],
      resumeArgv: [CODEX, 'resume', ID, ...PAIR, '--yolo']
    });
    // Leading: the pair before the subcommand, which Codex accepts too.
    insert('leading', {
      agentSessionId: ID,
      argv: [CODEX, '--yolo'],
      resumeArgv: [CODEX, ...PAIR, 'resume', ID, '--yolo']
    });
    const before = rawRows();
    const writes = spyOnWrites();

    const outcomes = repairInlineSwitches(store);

    expect(verdictOf(outcomes, 'trailing')).toBe('already-right');
    expect(verdictOf(outcomes, 'leading')).toBe('already-right');
    expect(writes).not.toHaveBeenCalled();
    expect(rawRows()).toEqual(before);
  });

  it('a pre-phase codex row whose own flags already end with the pair is byte identical', () => {
    // The person put the pair in their own flags before Tortie did. It counts,
    // and the row is not given a second one.
    insert('own-pair', {
      agentSessionId: ID,
      argv: [CODEX, '--yolo', ...PAIR],
      resumeArgv: [CODEX, 'resume', ID, '--yolo', ...PAIR]
    });
    const before = rawRows();

    const outcomes = repairInlineSwitches(store);

    expect(verdictOf(outcomes, 'own-pair')).toBe('already-right');
    expect(rawRows()).toEqual(before);
    expect(countPairs(store.getSession('own-pair')?.resumeArgv ?? [])).toBe(1);
  });

  it('a captured codex row is re-wrapped with the pair inside the capture command', () => {
    const capture = captureRecord('codex', [CODEX, '--yolo']);
    insert('captured', {
      agentSessionId: ID,
      argv: wrapped('codex', [CODEX, '--yolo']),
      resumeArgv: wrapped('codex', [CODEX, 'resume', ID, '--yolo']),
      specstory: capture,
      resumeCapture: 'armed'
    });
    const beforeRow = store.getSession('captured');

    const outcomes = repairInlineSwitches(store);

    expect(verdictOf(outcomes, 'captured')).toBe('rewritten');
    const after = store.getSession('captured');
    const resume = after?.resumeArgv ?? [];
    // The wrapper's own words are unchanged, and specstory's own -c is still
    // the first -c in the argv, so the inner command is one quoted token.
    expect(resume.slice(0, -1)).toEqual(beforeRow?.resumeArgv?.slice(0, -1));
    expect(resume.indexOf('-c')).toBe(resume.length - 2);
    expect(resume.at(-1)).toBe(
      `${CODEX} resume ${ID} -c tui.fullscreen_transcript=false --yolo`
    );
    expect(resume).toEqual(wrapped('codex', [CODEX, 'resume', ID, ...PAIR, '--yolo']));
    // The capture record, the launch argv and the capture state never move.
    expect(after?.specstory).toEqual(capture);
    expect(after?.argv).toEqual(beforeRow?.argv);
    expect(after?.resumeCapture).toBe('armed');
  });

  it('a captured row whose wrap cannot be rebuilt is left exactly as it is', () => {
    // An EMPTY element cannot survive specstory's splitter, so `canWrapArgv`
    // refuses the recomposition and the composer answers `captureLost`.
    const capture = captureRecord('codex', [CODEX, '--model', '']);
    // Wrapped by an older build, which lost the empty element on the way in.
    insert('lost-wrapped', {
      agentSessionId: ID,
      argv: [SPECSTORY, 'run', 'codex', '--no-version-check', '--silent', '--no-cloud-sync', '-c', `${CODEX} --model`],
      resumeArgv: [SPECSTORY, 'run', 'codex', '--no-version-check', '--silent', '--no-cloud-sync', '-c', `${CODEX} resume ${ID} --model`],
      specstory: capture
    });
    // Armed BARE by the harvest, which is what it does when capture is lost.
    // The pass must not write it again, bare or otherwise.
    insert('lost-bare', {
      agentSessionId: ID,
      argv: [SPECSTORY, 'run', 'codex', '--no-version-check', '--silent', '--no-cloud-sync', '-c', `${CODEX} --model`],
      resumeArgv: [CODEX, 'resume', ID, '--model', ''],
      specstory: capture
    });
    const before = rawRows();
    const writes = spyOnWrites();

    const outcomes = repairInlineSwitches(store);

    expect(verdictOf(outcomes, 'lost-wrapped')).toBe('capture-lost');
    expect(verdictOf(outcomes, 'lost-bare')).toBe('capture-lost');
    expect(writes).not.toHaveBeenCalled();
    expect(rawRows()).toEqual(before);
    // Each is said, by name and verdict, and with no argv token.
    const warned = consoleLines.filter((l) => l.includes('capture-lost'));
    expect(warned).toHaveLength(2);
    expect(warned.some((l) => l.includes('"name-lost-wrapped"'))).toBe(true);
    expect(warned.some((l) => l.includes('"name-lost-bare"'))).toBe(true);
    for (const line of consoleLines) {
      expect(line).not.toContain(ID);
      expect(line).not.toContain('--model');
      expect(line).not.toContain(CODEX);
    }
  });

  it('a codex row on another machine has its tail recomposed and keeps its far argv[0]', () => {
    insert('far', {
      machineId: MACHINE,
      agentSessionId: ID,
      argv: [FAR_CODEX, '--yolo'],
      resumeArgv: [FAR_CODEX, 'resume', ID, '--yolo']
    });
    // No session on another machine is captured today, and a row claiming to
    // be one is not guessed at.
    insert('far-captured', {
      machineId: MACHINE,
      agentSessionId: ID,
      argv: [FAR_CODEX, '--yolo'],
      resumeArgv: [FAR_CODEX, 'resume', ID, '--yolo'],
      specstory: captureRecord('codex', [FAR_CODEX, '--yolo'])
    });
    const before = rawRows();

    const outcomes = repairInlineSwitches(store);

    expect(outcomeFor(outcomes, 'far')).toMatchObject({
      arm: 'argv-elsewhere',
      verdict: 'rewritten'
    });
    const after = store.getSession('far');
    expect(after?.resumeArgv).toEqual([FAR_CODEX, 'resume', ID, ...PAIR, '--yolo']);
    expect(after?.resumeArgv?.[0]).toBe(FAR_CODEX);
    expect(after?.machineId).toBe(MACHINE);
    expect(verdictOf(outcomes, 'far-captured')).toBe('unreadable');
    expect(rawRows().get('far-captured')).toBe(before.get('far-captured'));
  });

  it('a codex row whose resume argv names another binary is left alone', () => {
    // Hand edited, or written by a build that resolved another install. The
    // pass recomposes from the row's own recorded binary and never from
    // today's PATH, so the two disagree and the row is left.
    insert('other-bin', {
      agentSessionId: ID,
      argv: [CODEX, '--yolo'],
      resumeArgv: ['/opt/elsewhere/bin/codex', 'resume', ID, '--yolo']
    });
    const before = rawRows();

    const outcomes = repairInlineSwitches(store);

    expect(verdictOf(outcomes, 'other-bin')).toBe('binary-differs');
    expect(rawRows()).toEqual(before);
  });

  it('a row with no conversation id, and a row with no resume argv, are left alone', () => {
    insert('no-id', { argv: [CODEX, '--yolo'] });
    insert('empty-id', { agentSessionId: '', argv: [CODEX, '--yolo'] });
    insert('no-resume', { agentSessionId: ID, argv: [CODEX, '--yolo'] });
    insert('empty-resume', { agentSessionId: ID, argv: [CODEX, '--yolo'], resumeArgv: [] });
    const before = rawRows();
    const writes = spyOnWrites();

    const outcomes = repairInlineSwitches(store);

    expect(verdictOf(outcomes, 'no-id')).toBe('no-id');
    expect(verdictOf(outcomes, 'empty-id')).toBe('no-id');
    expect(verdictOf(outcomes, 'no-resume')).toBe('no-resume-argv');
    expect(verdictOf(outcomes, 'empty-resume')).toBe('no-resume-argv');
    expect(writes).not.toHaveBeenCalled();
    expect(rawRows()).toEqual(before);
    // The pass never arms a row that was not armed.
    expect(store.getSession('no-resume')?.resumeArgv).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The env arm
// ---------------------------------------------------------------------------

describe('the env arm: Claude Code, on this Mac only', () => {
  it('a local claude row with no env gains a one-key record', () => {
    expect({ ...CLAUDE_INLINE_ENV }).toEqual({ [VARIABLE]: '1' });
    claudeRow('bare');
    expect(store.getSession('bare')?.env).toBeUndefined();

    const outcomes = repairInlineSwitches(store);

    expect(outcomeFor(outcomes, 'bare')).toMatchObject({ arm: 'env', verdict: 'rewritten' });
    expect(store.getSession('bare')?.env).toEqual({ [VARIABLE]: '1' });
    expect(Object.keys(store.getSession('bare')?.env ?? {})).toEqual([VARIABLE]);
  });

  it('a local claude row with other env keys keeps them and gains the variable', () => {
    claudeRow('keys', {
      env: { CLAUDE_CONFIG_DIR: '/w/.claude-two', ANTHROPIC_BASE_URL: 'http://127.0.0.1:9' }
    });
    // A claude patched by the person's agents.json with its own launch: the
    // row's env is the patch's, and the pass, which reads no patch, adds to it.
    claudeRow('patched', { env: { P331_PATCH_ENV: 'from-the-patch' } });

    const outcomes = repairInlineSwitches(store);

    expect(verdictOf(outcomes, 'keys')).toBe('rewritten');
    const env = store.getSession('keys')?.env ?? {};
    expect(Object.keys(env)).toEqual(['CLAUDE_CONFIG_DIR', 'ANTHROPIC_BASE_URL', VARIABLE]);
    expect(env).toEqual({
      CLAUDE_CONFIG_DIR: '/w/.claude-two',
      ANTHROPIC_BASE_URL: 'http://127.0.0.1:9',
      [VARIABLE]: '1'
    });
    expect(verdictOf(outcomes, 'patched')).toBe('rewritten');
    expect(store.getSession('patched')?.env).toEqual({
      P331_PATCH_ENV: 'from-the-patch',
      [VARIABLE]: '1'
    });
  });

  it('a claude row whose env holds "0" is byte identical', () => {
    // "0" is the person's own opt-out, and it wins.
    claudeRow('zero', { env: { [VARIABLE]: '0' } });
    // "1" with another key needs no write either.
    claudeRow('one', { env: { OTHER: 'x', [VARIABLE]: '1' } });
    const before = rawRows();
    const writes = spyOnWrites();

    const outcomes = repairInlineSwitches(store);

    expect(verdictOf(outcomes, 'zero')).toBe('already-right');
    expect(verdictOf(outcomes, 'one')).toBe('already-right');
    expect(writes).not.toHaveBeenCalled();
    expect(rawRows()).toEqual(before);
    expect(store.getSession('zero')?.env).toEqual({ [VARIABLE]: '0' });
  });

  it('a claude row on another machine is byte identical', () => {
    // A compiled launch.env never travels to another machine, so a remote
    // Claude stays as it is today.
    claudeRow('far-claude', { machineId: MACHINE, argv: ['/home/far/.local/bin/claude'] });
    claudeRow('far-claude-env', { machineId: MACHINE, env: { OTHER: 'x' } });
    const before = rawRows();

    const outcomes = repairInlineSwitches(store);

    expect(outcomeFor(outcomes, 'far-claude')).toBeUndefined();
    expect(outcomeFor(outcomes, 'far-claude-env')).toBeUndefined();
    expect(rawRows()).toEqual(before);
    expect(store.getSession('far-claude')?.env).toBeUndefined();
  });

  it('a SpecStory-wrapped claude row gains the variable and keeps its argv', () => {
    const capture = captureRecord('claude', [CLAUDE, '--session-id', ID]);
    claudeRow('wrapped-claude', {
      argv: wrapped('claude', [CLAUDE, '--session-id', ID]),
      resumeArgv: wrapped('claude', [CLAUDE, '--resume', ID]),
      specstory: capture
    });
    const before = store.getSession('wrapped-claude');

    const outcomes = repairInlineSwitches(store);

    expect(verdictOf(outcomes, 'wrapped-claude')).toBe('rewritten');
    const after = store.getSession('wrapped-claude');
    // The pane's env is what restore sets, and the wrapper's child inherits it.
    expect(after?.env).toEqual({ [VARIABLE]: '1' });
    expect(after?.argv).toEqual(before?.argv);
    expect(after?.resumeArgv).toEqual(before?.resumeArgv);
    expect(after?.specstory).toEqual(capture);
  });
});

// ---------------------------------------------------------------------------
// Every other row
// ---------------------------------------------------------------------------

describe('every other agent', () => {
  it('every row of every other agent is byte identical', () => {
    const others = [
      ...AGENT_REGISTRY.map((entry) => entry.id).filter(
        (id) => id !== 'codex' && id !== 'claude'
      ),
      'shell'
    ];
    // The eleven other launchable agents, the two capture-only IDE rows and a
    // shell. A floor, so a shrinking list cannot pass this in silence.
    expect(others.length).toBeGreaterThanOrEqual(14);
    for (const agent of others) {
      // Rows shaped to tempt each arm: an env without the claude variable, a
      // resume argv without the pair, and an argv carrying `-c` at argv[1].
      insert(`row-${agent}`, {
        agent: agent as ManifestSessionRecord['agent'],
        agentSessionId: ID,
        argv: [`/usr/local/bin/${agent}`, '-c', 'something'],
        resumeArgv: [`/usr/local/bin/${agent}`, 'resume', ID],
        env: { OTHER: 'x' }
      });
      insert(`bare-${agent}`, {
        agent: agent as ManifestSessionRecord['agent'],
        argv: [`/usr/local/bin/${agent}`]
      });
    }
    const before = rawRows();
    const writes = spyOnWrites();

    const outcomes = repairInlineSwitches(store);

    // Never read past agent and machineId: no outcome, no write, same bytes.
    expect(outcomes).toEqual([]);
    expect(writes).not.toHaveBeenCalled();
    expect(rawRows()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// The pass's own rules
// ---------------------------------------------------------------------------

/** Every row of §2.4.7's table, in one manifest. */
function plantTheHostileTable(): void {
  prePhaseCodex('pre');
  insert('trailing', {
    agentSessionId: ID,
    argv: [CODEX, ...PAIR, '--yolo'],
    resumeArgv: [CODEX, 'resume', ID, ...PAIR, '--yolo']
  });
  insert('leading', {
    agentSessionId: ID,
    argv: [CODEX, '--yolo'],
    resumeArgv: [CODEX, ...PAIR, 'resume', ID, '--yolo']
  });
  insert('own-pair', {
    agentSessionId: ID,
    argv: [CODEX, '--yolo', ...PAIR],
    resumeArgv: [CODEX, 'resume', ID, '--yolo', ...PAIR]
  });
  insert('captured', {
    agentSessionId: ID,
    argv: wrapped('codex', [CODEX, '--yolo']),
    resumeArgv: wrapped('codex', [CODEX, 'resume', ID, '--yolo']),
    specstory: captureRecord('codex', [CODEX, '--yolo'])
  });
  insert('lost-bare', {
    agentSessionId: ID,
    argv: [SPECSTORY, 'run', 'codex', '--no-version-check', '--silent', '--no-cloud-sync', '-c', `${CODEX} --model`],
    resumeArgv: [CODEX, 'resume', ID, '--model', ''],
    specstory: captureRecord('codex', [CODEX, '--model', ''])
  });
  insert('far', {
    machineId: MACHINE,
    agentSessionId: ID,
    argv: [FAR_CODEX, '--yolo'],
    resumeArgv: [FAR_CODEX, 'resume', ID, '--yolo']
  });
  insert('other-bin', {
    agentSessionId: ID,
    argv: [CODEX, '--yolo'],
    resumeArgv: ['/opt/elsewhere/bin/codex', 'resume', ID, '--yolo']
  });
  insert('shaped-differently', {
    agentSessionId: ID,
    argv: [CODEX, '--yolo'],
    resumeArgv: [CODEX, 'resume', ID]
  });
  insert('unreadable-wrap', {
    agentSessionId: ID,
    argv: wrapped('codex', [CODEX, '--yolo']),
    resumeArgv: [SPECSTORY, 'run', 'codex', '--no-version-check', '--silent', '-c'],
    specstory: captureRecord('codex', [CODEX, '--yolo'])
  });
  insert('no-id', { argv: [CODEX, '--yolo'] });
  insert('empty-resume', { agentSessionId: ID, resumeArgv: [] });
  insert('discarded', {
    status: 'discarded',
    agentSessionId: ID,
    argv: [CODEX],
    resumeArgv: [CODEX, 'resume', ID]
  });
  claudeRow('bare');
  claudeRow('keys', { env: { CLAUDE_CONFIG_DIR: '/w/.claude-two' } });
  claudeRow('zero', { env: { [VARIABLE]: '0' } });
  claudeRow('far-claude', { machineId: MACHINE });
  claudeRow('wrapped-claude', {
    argv: wrapped('claude', [CLAUDE, '--session-id', ID]),
    resumeArgv: wrapped('claude', [CLAUDE, '--resume', ID]),
    specstory: captureRecord('claude', [CLAUDE, '--session-id', ID])
  });
  insert('cursor', {
    agent: 'cursor' as ManifestSessionRecord['agent'],
    agentSessionId: ID,
    argv: ['/usr/local/bin/cursor-agent'],
    resumeArgv: ['/usr/local/bin/cursor-agent', '--resume', ID],
    env: { FORCE_COLOR: '1' }
  });
  insert('shell', { agent: 'shell', argv: ['/bin/zsh', '-l'] });
}

describe('the pass', () => {
  it('two passes: the second writes nothing and the digests are equal', () => {
    plantTheHostileTable();
    const writes = spyOnWrites();

    const first = repairInlineSwitches(store);
    const firstWrites = writes.mock.calls.length;
    const afterFirst = digest();
    const rawAfterFirst = rawRows();
    // The rows the table says move, and no other.
    expect(
      first.filter((o) => o.verdict === 'rewritten').map((o) => o.sessionId).sort()
    ).toEqual(['bare', 'captured', 'discarded', 'far', 'keys', 'pre', 'wrapped-claude']);
    expect(firstWrites).toBe(7);

    const second = repairInlineSwitches(store);

    expect(writes.mock.calls.length).toBe(firstWrites);
    expect(second.some((o) => o.verdict === 'rewritten')).toBe(false);
    expect(digest()).toBe(afterFirst);
    expect(rawRows()).toEqual(rawAfterFirst);
    // Every row the first pass wrote now reads as already right.
    for (const id of ['bare', 'captured', 'discarded', 'far', 'keys', 'pre', 'wrapped-claude']) {
      expect(verdictOf(second, id)).toBe('already-right');
    }
  });

  it('each write is one patch of resumeArgv or env alone, and the id and the contract never move', () => {
    const provenance: ResumeProvenance = {
      v: SESSION_CONTRACT_VERSION,
      source: 'store-harvest',
      confidence: 'exact',
      at: NOW,
      cwd: '/w'
    };
    const contract = (agent: 'codex' | 'claude', bin: string) =>
      buildRecoveryContract(agent, {
        bin,
        cwdReal: '/w',
        projectReal: '/w',
        agentVersion: null,
        at: NOW
      });
    prePhaseCodex('pre', {
      agentContract: contract('codex', CODEX),
      resumeProvenance: provenance,
      resumeCapture: 'armed'
    });
    insert('far', {
      machineId: MACHINE,
      agentSessionId: ID,
      argv: [FAR_CODEX, '--yolo'],
      resumeArgv: [FAR_CODEX, 'resume', ID, '--yolo'],
      agentContract: contract('codex', FAR_CODEX),
      resumeProvenance: provenance,
      resumeCapture: 'armed'
    });
    claudeRow('bare', {
      agentContract: contract('claude', CLAUDE),
      resumeProvenance: provenance,
      resumeCapture: 'armed'
    });
    const kept = (rec: ManifestSessionRecord | undefined) => ({
      agentSessionId: rec?.agentSessionId,
      argv: rec?.argv,
      agentContract: rec?.agentContract,
      resumeCapture: rec?.resumeCapture,
      resumeProvenance: rec?.resumeProvenance,
      specstory: rec?.specstory,
      status: rec?.status,
      machineId: rec?.machineId
    });
    const before = new Map(store.listSessions().map((r) => [r.id, kept(r)]));
    const writes = spyOnWrites();

    repairInlineSwitches(store);

    expect(writes).toHaveBeenCalledTimes(3);
    const ids = writes.mock.calls.map((call) => call[0]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const call of writes.mock.calls) {
      // One of the two one-column statements, never the whole-row patch.
      expect(call[1] === 'resumeArgv' || call[1] === 'env').toBe(true);
    }
    expect(writes.mock.calls.map((call) => call[1]).sort()).toEqual(['env', 'resumeArgv', 'resumeArgv']);
    for (const rec of store.listSessions()) {
      expect(kept(rec)).toEqual(before.get(rec.id));
    }
  });

  it('a row carrying a column this build cannot read keeps those bytes when the pass writes it', () => {
    // Phase 331's fix round. The verifier planted rows like these and measured
    // `updateSession` writing the refused columns back NULL, normalised or
    // replaced, because it re-encodes the whole row from what it decoded.
    prePhaseCodex('odd-codex');
    claudeRow('odd-claude');
    claudeRow('whole-row'); // the control: the same bytes, written the old way
    const raw = new Database(dbPath);
    try {
      const plant = raw.prepare(
        'UPDATE sessions SET specstory = ?, restore = ?, agent_contract = ?, resume_provenance = ?, context_snapshot = ? WHERE id = ?'
      );
      for (const id of ['odd-codex', 'odd-claude', 'whole-row']) {
        plant.run('{"enabled":tru', '[1,2]', '{"v":999,"future":true}', 'not json', '{"v":-1}', id);
      }
    } finally {
      raw.close();
    }
    const before = rawRows();
    const columnsOf = (json: string | undefined): Record<string, unknown> =>
      JSON.parse(json ?? '{}') as Record<string, unknown>;
    const without = (json: string | undefined, column: string): Record<string, unknown> => {
      const row = columnsOf(json);
      delete row[column];
      return row;
    };

    const outcomes = repairInlineSwitches(store);

    expect(verdictOf(outcomes, 'odd-codex')).toBe('rewritten');
    expect(verdictOf(outcomes, 'odd-claude')).toBe('rewritten');
    const after = rawRows();
    // The target column moved, and ONLY it: every refused byte is still there.
    expect(JSON.parse(String(columnsOf(after.get('odd-codex'))['resume_argv']))).toEqual([CODEX, 'resume', ID, ...PAIR, '--yolo']);
    expect(without(after.get('odd-codex'), 'resume_argv')).toEqual(without(before.get('odd-codex'), 'resume_argv'));
    expect(JSON.parse(String(columnsOf(after.get('odd-claude'))['env']))).toEqual({ [VARIABLE]: '1' });
    expect(without(after.get('odd-claude'), 'env')).toEqual(without(before.get('odd-claude'), 'env'));
    expect(columnsOf(after.get('odd-claude'))['specstory']).toBe('{"enabled":tru');

    // The control, and the reason this pass does not use it: the whole-row
    // patch writes the same env and loses the refused columns.
    store.updateSession('whole-row', { env: { [VARIABLE]: '1' } });
    const lost = columnsOf(rawRows().get('whole-row'));
    expect(lost['specstory']).toBeNull();
    expect(lost['agent_contract']).toBeNull();
  });

  it('a write that throws half way leaves every other row as it was', () => {
    prePhaseCodex('first');
    prePhaseCodex('second');
    prePhaseCodex('third');
    claudeRow('claude-after');
    const before = rawRows();
    let calls = 0;
    const throwing: InlineRepairStore = {
      listSessions: () => store.listSessions(),
      setEnvColumn: (id, env) => store.setEnvColumn(id, env),
      setResumeArgvColumn: (id, argv) => {
        calls += 1;
        if (calls === 2) {
          // A manifest error's detail can carry anything, and none of it may
          // reach the log.
          throw new Error(
            JSON.stringify({ code: 'INVALID_INPUT', message: 'x', detail: 'P331-SECRET-DETAIL' })
          );
        }
        store.setResumeArgvColumn(id, argv);
      }
    };

    const outcomes = repairInlineSwitches(throwing);

    expect(verdictOf(outcomes, 'first')).toBe('rewritten');
    expect(outcomeFor(outcomes, 'second')).toMatchObject({ arm: 'argv-here', verdict: 'threw' });
    expect(verdictOf(outcomes, 'third')).toBe('rewritten');
    expect(verdictOf(outcomes, 'claude-after')).toBe('rewritten');
    // The row whose write threw keeps exactly what it had.
    expect(rawRows().get('second')).toBe(before.get('second'));
    expect(store.getSession('second')?.resumeArgv).toEqual([CODEX, 'resume', ID, '--yolo']);
    // Said by name and verdict, with a one-word reason and nothing else.
    const threw = consoleLines.filter((l) => l.includes('exactly as it is: threw'));
    expect(threw).toHaveLength(1);
    // The count line says one row was left for it, and says nothing else.
    expect(consoleLines.some((l) => l.includes('threw 1'))).toBe(true);
    expect(threw[0]).toContain('"name-second"');
    expect(threw[0]).toContain('INVALID_INPUT');
    for (const line of consoleLines) {
      expect(line).not.toContain('P331-SECRET-DETAIL');
      expect(line).not.toContain(ID);
      expect(line).not.toContain('--yolo');
      expect(line).not.toContain('tui.fullscreen_transcript');
    }
  });

  it('resumeIdHarvests runs the pass after the codex repair and still runs the rescue when the pass throws', () => {
    const deps: IdHarvestDeps = {
      manifest: store,
      liveIds: new Map(),
      idCaptureWatches: new Map(),
      isDisposed: () => false,
      broadcastSessions: () => undefined
    };
    const CLAUDE_ID = '0b1c0000-0000-4000-8000-000000000002';
    const plant = (): void => {
      prePhaseCodex('pre');
      claudeRow('claude', { agentSessionId: CLAUDE_ID, argv: [CLAUDE, '--session-id', CLAUDE_ID] });
      // A codex row whose process is gone and which never got an id: the
      // rescue gives it no watch (codex's store cannot be correlated after
      // exit) and says 'unavailable', which is the rescue running.
      insert('orphan', { argv: [CODEX], resumeCapture: 'capturing' });
    };

    // --- 1. the order, and the pass really runs ---
    plant();
    spyOnWrites();
    resumeIdHarvests(deps);

    expect(vi.mocked(repairCodexResumeIds)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(repairCodexResumeIds)).toHaveBeenCalledWith(store);
    expect(events[0]).toBe('codex-repair');
    expect(events.slice(1).every((e) => e.startsWith('update:'))).toBe(true);
    expect(events).toContain('update:pre');
    expect(store.getSession('pre')?.resumeArgv).toEqual([CODEX, 'resume', ID, ...PAIR, '--yolo']);
    expect(store.getSession('claude')?.env).toEqual({ [VARIABLE]: '1' });
    expect(conversationClaimant(CLAUDE_ID)).toBe('claude');
    expect(store.getSession('orphan')?.resumeCapture).toBe('unavailable');

    // --- 2. a pass whose read throws stops nothing that follows it ---
    store.close();
    rmSync(dir, { recursive: true, force: true });
    dir = mkdtempSync(join(tmpdir(), 'p331-inline-repair-'));
    dbPath = join(dir, 'manifest.db');
    store = new ManifestStore(dbPath);
    const deps2: IdHarvestDeps = { ...deps, manifest: store };
    resetInlineRepairForTests();
    forgetConversationClaims();
    events.length = 0;
    vi.mocked(repairCodexResumeIds).mockClear();
    plant();
    const before = rawRows();
    const reads = vi.spyOn(store, 'listSessions');
    // The mocked repair reads nothing, so the FIRST read is the pass's own.
    reads.mockImplementationOnce(() => {
      throw new Error('the disk went away');
    });

    expect(() => resumeIdHarvests(deps2)).not.toThrow();

    expect(vi.mocked(repairCodexResumeIds)).toHaveBeenCalledTimes(1);
    // The pass wrote nothing: the codex row is as it was.
    expect(rawRows().get('pre')).toBe(before.get('pre'));
    // The claim seeding still read the rows, and the rescue still ran.
    expect(reads.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(conversationClaimant(CLAUDE_ID)).toBe('claude');
    expect(store.getSession('orphan')?.resumeCapture).toBe('unavailable');
    expect(consoleLines.some((l) => l.includes('the inline switch pass did not finish'))).toBe(true);
    // The latch stayed unset, so the next refresh tries again.
    const retried = repairInlineSwitchesOnce(store);
    expect(retried).not.toBeNull();
    expect(verdictOf(retried ?? [], 'pre')).toBe('rewritten');
  });

  it('the pass runs once per process', () => {
    prePhaseCodex('pre');
    const reads = vi.spyOn(store, 'listSessions');

    const first = repairInlineSwitchesOnce(store);
    expect(first).not.toBeNull();
    expect(verdictOf(first ?? [], 'pre')).toBe('rewritten');
    const readsAfterFirst = reads.mock.calls.length;
    expect(readsAfterFirst).toBe(1);

    // A row that would be rewritten, planted after the pass: the second call
    // reads nothing and so leaves it.
    prePhaseCodex('later');
    const second = repairInlineSwitchesOnce(store);

    expect(second).toBeNull();
    expect(reads.mock.calls.length).toBe(readsAfterFirst);
    expect(store.getSession('later')?.resumeArgv).toEqual([CODEX, 'resume', ID, '--yolo']);
  });
});
