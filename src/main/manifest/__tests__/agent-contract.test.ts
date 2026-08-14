/**
 * Migration 008 — the recovery contract, the resume provenance, and the
 * compatibility numbers that ship with them (Phase 21).
 *
 * ## What is actually being tested
 *
 * The defect is not a crash. It is a lie: restore asked the LIVE REGISTRY
 * whether an agent's resume needs its original directory, and the `catch`
 * under that call answered `false` for any id the registry no longer launches.
 * For pi, `false` opens a new empty session under the recorded id, the pane
 * looks resumed, and the conversation is gone.
 *
 * So the assertions here are about what the ROW says, and specifically about
 * three things a test can get wrong by being agreeable:
 *
 *  1. A row written before this migration must come back with NOTHING, not
 *     with a default. `false` is a wrong answer wearing the shape of a right
 *     one.
 *  2. A contract must survive a round trip through an unrelated write. The
 *     update path rewrites every column, and a codec that rebuilt a subset
 *     would erase a newer build's fields on the first rename.
 *  3. The contract must not be rewritable. It records what was true at create,
 *     and a later write that replaced it would destroy the only evidence of
 *     what the session actually launched under.
 *
 * Every case runs against a real on-disk SQLite file with the real migration
 * list.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import {
  MANIFEST_APPLICATION_ID,
  MANIFEST_MIGRATION_NAMES,
  MANIFEST_MIN_COMPATIBLE_VERSION,
  MANIFEST_SCHEMA_VERSION,
  ManifestStore,
  type ManifestSessionRecord
} from '../store';
import {
  UNRECORDED_PROVENANCE,
  isUnrecordedProvenance,
  parseAgentContract,
  parseResumeProvenance,
  provenanceOf,
  serializeResumeProvenance
} from '../contract';
import {
  DatabaseTooNewError,
  assertDatabaseUsableAt,
  readSchemaStateAt
} from '../../db/schema-version';
import type { AgentRecoveryContract, ResumeProvenance } from '../agents';

let dir: string;
let dbPath: string;
let store: ManifestStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-agent-contract-'));
  dbPath = join(dir, 'manifest.db');
  store = new ManifestStore(dbPath);
});

afterEach(() => {
  try {
    store.close();
  } catch {
    /* a test that closed it itself */
  }
  rmSync(dir, { recursive: true, force: true });
});

/** A pi shaped contract: the agent whose wrong answer is silent. */
function piContract(): AgentRecoveryContract {
  return {
    v: 1,
    at: 1_700_000_000_000,
    bin: '/opt/homebrew/bin/pi',
    requiresOriginalCwd: true,
    bareResumeIsDangerous: false,
    resumeStrategy: 'flag-uuid',
    resumeTemplate: ['--session-id', 'SESSION_ID_SLOT'],
    resumeExtrasPosition: 'trailing',
    idCapture: 'preassigned',
    sessionStore: '~/.pi/sessions',
    cwdReal: '/Users/x/work/repo',
    projectReal: '/Users/x/work/repo',
    captureRouteVerified: false,
    flagsVerifiedVersion: '0.79.1',
    flagsVerifiedAgainst: 'other-version'
  };
}

function provenance(): ResumeProvenance {
  return {
    v: 1,
    source: 'store-harvest',
    confidence: 'grace-accepted',
    at: 1_700_000_001_000,
    cwd: '/Users/x/work/repo',
    key: 'cwd-newest',
    keyConfidence: 'exact',
    viaGraceTimer: true,
    rivals: 2,
    storePath: '/Users/x/.codex/sessions/rollout.jsonl'
  };
}

function insert(
  id: string,
  patch: Partial<ManifestSessionRecord> = {}
): ManifestSessionRecord {
  const now = Date.now();
  return store.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath: '/p',
    cwd: '/p',
    agent: 'claude',
    status: 'running',
    createdAt: now,
    lastSeen: now,
    argv: ['claude'],
    ...patch
  });
}

// ---------------------------------------------------------------------------
// The migration itself
// ---------------------------------------------------------------------------

describe('migration 008', () => {
  it('adds exactly three columns to sessions', () => {
    const raw = new Database(dbPath, { readonly: true });
    try {
      const names = (
        raw.pragma('table_info(sessions)') as { name: string }[]
      ).map((c) => c.name);
      expect(names).toContain('agent_version');
      expect(names).toContain('agent_contract');
      expect(names).toContain('resume_provenance');
    } finally {
      raw.close();
    }
  });

  it('is the eighth migration, and the schema version counts it', () => {
    expect(MANIFEST_MIGRATION_NAMES).toHaveLength(MANIFEST_SCHEMA_VERSION);
    expect(MANIFEST_MIGRATION_NAMES[7]).toBe('008-agent-recovery-contract');
  });

  it('is declared BREAKING, so the minimum moved to 8 with it', () => {
    // The SQL shape is additive and the compatibility statement is not. See
    // research 27 §4.3: bump the minimum whenever a new column is required for
    // correct restore, even where SQLite would let an old build write without
    // it. `agent_contract` is that column.
    //
    // THE NUMBER IS LITERAL, AND IT USED TO BE `MANIFEST_SCHEMA_VERSION`.
    // Written that way it only said "008 is breaking" for as long as 008 was
    // the last migration. Phase 22 added 009, which is ADDITIVE and therefore
    // moved the version and not the minimum, and the old form failed as though
    // that were a defect. The claim this case exists to keep is that migration
    // 008 raised the floor to 8, and 8 is how you write it.
    expect(MANIFEST_MIN_COMPATIBLE_VERSION).toBe(8);
  });

  it('stamps the three numbers on the file it migrated', () => {
    store.close();
    expect(readSchemaStateAt(dbPath)).toMatchObject({
      applicationId: MANIFEST_APPLICATION_ID,
      userVersion: MANIFEST_SCHEMA_VERSION,
      minCompatible: MANIFEST_MIN_COMPATIBLE_VERSION
    });
  });

  it('runs again over a database that already has the columns', () => {
    // `/usr/bin/sqlite3 .recover` rebuilds from the FINAL schema and can lose
    // the migrations bookkeeping, which is how a rebuilt manifest became
    // permanently unopenable once before.
    store.close();
    const raw = new Database(dbPath);
    try {
      raw.prepare('DELETE FROM migrations').run();
    } finally {
      raw.close();
    }
    const reopened = new ManifestStore(dbPath);
    reopened.close();
  });
});

// ---------------------------------------------------------------------------
// What a row that predates the migration gets
// ---------------------------------------------------------------------------

describe('a row written before the contract existed', () => {
  it('comes back with nothing rather than with a default', () => {
    insert('old');
    store.close();

    // Exactly what an older build leaves behind: the row is there and the
    // three columns are NULL.
    const raw = new Database(dbPath);
    try {
      raw
        .prepare(
          'UPDATE sessions SET agent_version = NULL, agent_contract = NULL, ' +
            'resume_provenance = NULL'
        )
        .run();
    } finally {
      raw.close();
    }

    store = new ManifestStore(dbPath);
    const back = store.getSession('old');
    expect(back?.agentVersion).toBeUndefined();
    expect(back?.agentContract).toBeUndefined();
    expect(back?.resumeProvenance).toBeUndefined();
    // The one thing that must never happen: `requiresOriginalCwd: false`
    // appearing from nowhere. That is the permissive answer, and for pi it is
    // an empty session that looks resumed.
    expect(back?.agentContract?.requiresOriginalCwd).toBeUndefined();
  });

  it('reads as unrecorded provenance, which is a real answer', () => {
    insert('old');
    const back = store.getSession('old');
    const p = provenanceOf(back?.resumeProvenance);
    expect(isUnrecordedProvenance(p)).toBe(true);
    expect(p.confidence).toBe('unknown');
    expect(p).toBe(UNRECORDED_PROVENANCE);
  });

  it('never writes the unrecorded placeholder back as a record', () => {
    // If it were written, "nothing was recorded" would become a record and the
    // two would stop being distinguishable a launch later.
    expect(serializeResumeProvenance(UNRECORDED_PROVENANCE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Round trips
// ---------------------------------------------------------------------------

describe('the contract in the row', () => {
  it('round-trips through SQLite unchanged', () => {
    const contract = piContract();
    insert('pi', { agentVersion: '0.84.1', agentContract: contract });
    store.close();
    store = new ManifestStore(dbPath);

    const back = store.getSession('pi');
    expect(back?.agentVersion).toBe('0.84.1');
    expect(back?.agentContract).toEqual(contract);
    expect(back?.agentContract?.requiresOriginalCwd).toBe(true);
  });

  it('survives an unrelated write to the same row', () => {
    const contract = piContract();
    insert('pi', { agentVersion: '0.84.1', agentContract: contract });
    store.renameSession('pi', 'renamed', 'renamed');
    expect(store.getSession('pi')?.agentContract).toEqual(contract);
    expect(store.getSession('pi')?.agentVersion).toBe('0.84.1');
  });

  it('keeps a field this build does not know about', () => {
    // A newer build's field must survive an older build touching the row for
    // an unrelated reason. A codec that rebuilt a known subset would erase it.
    insert('pi', { agentContract: piContract() });
    store.close();
    const raw = new Database(dbPath);
    try {
      const stored = raw
        .prepare<[string], { agent_contract: string }>(
          'SELECT agent_contract FROM sessions WHERE id = ?'
        )
        .get('pi');
      const augmented = {
        ...(JSON.parse(stored?.agent_contract ?? '{}') as Record<string, unknown>),
        somethingFromTheFuture: 'keep me'
      };
      raw
        .prepare<[string, string]>(
          'UPDATE sessions SET agent_contract = ? WHERE id = ?'
        )
        .run(JSON.stringify(augmented), 'pi');
    } finally {
      raw.close();
    }

    store = new ManifestStore(dbPath);
    store.renameSession('pi', 'renamed', 'renamed');
    store.close();

    const check = new Database(dbPath, { readonly: true });
    try {
      const row = check
        .prepare('SELECT agent_contract FROM sessions WHERE id = ?')
        .get('pi') as { agent_contract: string };
      expect(JSON.parse(row.agent_contract)).toMatchObject({
        somethingFromTheFuture: 'keep me',
        requiresOriginalCwd: true
      });
    } finally {
      check.close();
    }
    store = new ManifestStore(dbPath);
  });

  it('cannot be rewritten once it is there', () => {
    insert('pi', { agentContract: piContract() });
    const impostor: AgentRecoveryContract = {
      ...piContract(),
      requiresOriginalCwd: false
    };
    store.updateSession('pi', { agentContract: impostor });
    expect(store.getSession('pi')?.agentContract?.requiresOriginalCwd).toBe(true);
  });

  it('can still be given one when the row has none', () => {
    insert('repair');
    store.updateSession('repair', { agentContract: piContract() });
    expect(store.getSession('repair')?.agentContract?.requiresOriginalCwd).toBe(
      true
    );
  });
});

describe('the provenance in the row', () => {
  it('round-trips, grace timer and rival count included', () => {
    insert('codex', { resumeProvenance: provenance() });
    store.close();
    store = new ManifestStore(dbPath);
    const back = store.getSession('codex')?.resumeProvenance;
    expect(back).toEqual(provenance());
    expect(back?.viaGraceTimer).toBe(true);
    expect(back?.rivals).toBe(2);
    expect(back?.confidence).toBe('grace-accepted');
  });

  it('is written in the SAME commit as the id it describes', () => {
    insert('codex', { resumeCapture: 'capturing' });
    const after = store.setAgentSessionId(
      'codex',
      'conv-1',
      ['codex', 'resume', 'conv-1'],
      provenance()
    );
    expect(after.agentSessionId).toBe('conv-1');
    expect(after.resumeCapture).toBe('armed');
    expect(after.resumeProvenance?.confidence).toBe('grace-accepted');

    const back = store.getSession('codex');
    expect(back?.resumeProvenance?.confidence).toBe('grace-accepted');
  });

  it('is replaceable, because a later capture is a stronger statement', () => {
    insert('codex', { resumeProvenance: provenance() });
    const stronger: ResumeProvenance = {
      ...provenance(),
      source: 'boot-rescue',
      confidence: 'exact',
      viaGraceTimer: false
    };
    store.setResumeProvenance('codex', stronger);
    expect(store.getSession('codex')?.resumeProvenance).toEqual(stronger);
  });
});

// ---------------------------------------------------------------------------
// The codecs, on values nobody meant to write
// ---------------------------------------------------------------------------

describe('a column that cannot be read', () => {
  it('drops a contract whole rather than keeping half of one', () => {
    expect(parseAgentContract('not json')).toBeUndefined();
    expect(parseAgentContract('[1,2]')).toBeUndefined();
    expect(parseAgentContract('null')).toBeUndefined();
    // No `requiresOriginalCwd` means the contract cannot answer the question
    // it exists for, so it is not a contract.
    expect(parseAgentContract(JSON.stringify({ v: 1 }))).toBeUndefined();
    // And it must not be defaulted into existence.
    expect(
      parseAgentContract(JSON.stringify({ v: 1, requiresOriginalCwd: 'yes' }))
    ).toBeUndefined();
  });

  it('drops a provenance with no confidence', () => {
    expect(
      parseResumeProvenance(JSON.stringify({ v: 1, source: 'store-harvest' }))
    ).toBeUndefined();
  });

  it('keeps a source this build has never heard of', () => {
    // Rejecting it whole would turn "recorded as something I do not know" into
    // "nothing was recorded", which is a stronger and falser claim.
    const p = parseResumeProvenance(
      JSON.stringify({ v: 2, source: 'quantum-entanglement', confidence: 'exact' })
    );
    expect(p?.source).toBe('quantum-entanglement');
  });

  it('survives a corrupted column on the read path', () => {
    insert('bad');
    store.close();
    const raw = new Database(dbPath);
    try {
      raw
        .prepare("UPDATE sessions SET agent_contract = 'zzz', resume_provenance = '{'")
        .run();
    } finally {
      raw.close();
    }
    store = new ManifestStore(dbPath);
    const back = store.getSession('bad');
    expect(back?.agentContract).toBeUndefined();
    expect(back?.resumeProvenance).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The standing downgrade probe (research 27 §4.6)
// ---------------------------------------------------------------------------

describe('what the PREVIOUS release does with this manifest', () => {
  /**
   * The column list `insertSession` used at schema 7, copied verbatim.
   *
   * This is the standing test research 27 §4.6 asks for, and it converts "is
   * this migration additive?" from a judgement in a review into a red test.
   * It is the SQL half of the question. The compatibility half is the
   * assertion two tests down, and the two answers differ on purpose.
   *
   * Do not update this list when a migration adds a column. Its whole value is
   * that it is frozen at the previous release.
   */
  const SCHEMA_7_COLUMNS = [
    'id',
    'name',
    'tmux_name',
    'project_path',
    'cwd',
    'agent',
    'agent_session_id',
    'argv',
    'resume_argv',
    'env',
    'status',
    'created_at',
    'last_seen',
    'exit_code',
    'exit_signal',
    'pane_pid',
    'resume_capture',
    'specstory',
    'restore'
  ] as const;

  it('can still insert a session, because the SQL shape is additive', () => {
    store.close();
    const old = new Database(dbPath);
    try {
      const placeholders = SCHEMA_7_COLUMNS.map(() => '?').join(', ');
      const values = SCHEMA_7_COLUMNS.map((c) =>
        c === 'created_at' || c === 'last_seen' ? Date.now() : c
      );
      expect(() => {
        old
          .prepare(
            `INSERT INTO sessions (${SCHEMA_7_COLUMNS.join(', ')}) ` +
              `VALUES (${placeholders})`
          )
          .run(...values);
      }).not.toThrow();
    } finally {
      old.close();
    }
    store = new ManifestStore(dbPath);
  });

  it('can still SELECT *, and the extra columns are simply ignored', () => {
    insert('a', { agentVersion: '2.1.228', agentContract: piContract() });
    store.close();
    const old = new Database(dbPath, { readonly: true });
    try {
      const rows = old.prepare('SELECT * FROM sessions').all() as Record<
        string,
        unknown
      >[];
      expect(rows).toHaveLength(1);
      // Three from migration 008, one from 009, one from 010 (Phase 29's
      // removed_at). The point of the case is that an old build's `SELECT *`
      // neither throws nor mis-reads the row it gets, so the number moves
      // with every additive migration after this one and is deliberately
      // spelled out rather than hidden behind a constant.
      expect(Object.keys(rows[0] ?? {})).toHaveLength(
        SCHEMA_7_COLUMNS.length + 3 + 1 + 1
      );
    } finally {
      old.close();
    }
    store = new ManifestStore(dbPath);
  });

  it('is refused all the same, because the row it would write is a bad row', () => {
    // The two assertions above are why SQLite would ALLOW the write. This one
    // is why Tortie does not. A schema 7 build inserting here leaves
    // `agent_contract` NULL, and a NULL contract is a session that falls back
    // to asking the live registry on the restore path. That is the defect
    // Phase 21 removes, and for pi it is an empty session that looks resumed.
    store.close();
    const asSchema7 = {
      label: 'session list',
      applicationId: MANIFEST_APPLICATION_ID,
      version: 7,
      minCompatible: 7
    };
    let thrown: unknown;
    try {
      assertDatabaseUsableAt(dbPath, asSchema7);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(DatabaseTooNewError);
    store = new ManifestStore(dbPath);
  });
});
