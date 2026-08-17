/**
 * The manifest schema: the migrations list and the three compatibility
 * numbers (Phase 42 stage 6 split out of ./store.ts, byte-for-byte semantics).
 *
 * EVERYTHING IN THIS FILE IS IMMOVABLE. The migrations, their names, the
 * application id, the schema version and the minimum compatible version are
 * the contract between every build of Tortie that has ever opened a manifest
 * and every build that ever will. The contract inventory
 * (build/contract-inventory.mjs) byte-compares the schema this file produces
 * on every stage of the cleanup.
 */

import {
  addColumnIfMissing,
  type SqliteMigration
} from '../db/sqlite';
import type { SchemaIdentity } from '../db/schema-version';

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

export const MIGRATIONS: readonly SqliteMigration[] = [
  {
    name: '001-initial',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id               TEXT PRIMARY KEY,
          name             TEXT NOT NULL,
          tmux_name        TEXT NOT NULL,
          project_path     TEXT NOT NULL,
          cwd              TEXT NOT NULL,
          agent            TEXT NOT NULL,
          agent_session_id TEXT,
          argv             TEXT NOT NULL,
          resume_argv      TEXT,
          env              TEXT,
          status           TEXT NOT NULL DEFAULT 'running',
          created_at       INTEGER NOT NULL,
          last_seen        INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_project
          ON sessions(project_path);
        CREATE INDEX IF NOT EXISTS idx_sessions_tmux_name
          ON sessions(tmux_name);
        CREATE TABLE IF NOT EXISTS projects (
          id   TEXT PRIMARY KEY,
          path TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL
        );
      `);
    }
  },
  {
    // Phase 8 (§6.6 exit-code truth): the exit status of the session's
    // process, read from tmux's dead-pane status before the reap. NULL for
    // live sessions, user-killed sessions, and rows written before this
    // migration.
    name: '002-exit-code',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'exit_code', 'INTEGER');
    }
  },
  {
    // Phase 12.7 (research 21 §7): exit_code is WEXITSTATUS only — a process
    // that dies BY a signal reports an EMPTY #{pane_dead_status} and puts the
    // signal in #{pane_dead_signal}, so every non-self-mapping agent used to
    // vanish with no recorded cause at all. pane_pid rides along: captured at
    // create, it is what lets a post-mortem correlate against `ps` history.
    name: '003-death-forensics',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'exit_signal', 'TEXT');
      addColumnIfMissing(db, 'sessions', 'pane_pid', 'INTEGER');
    }
  },
  {
    // Phase 13.5 (research 22 §4): whether this session's CONVERSATION comes
    // back, not just its directory. Derivable from resumeArgv for the armed
    // case, but not for the other two the user needs to see: a harvest still
    // in flight, and a harvest that gave up. NULL for pre-existing rows.
    name: '004-resume-capture',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'resume_capture', 'TEXT');
    }
  },
  {
    // Phase 15 (research 13 §3.1): SpecStory capture, as JSON, on the sessions
    // that asked for it. NULL — the value every pre-existing row gets — is
    // "not captured", which is exactly what those sessions were.
    //
    // It is one column rather than four because the fields are meaningless
    // apart: a provider without the binary that has it, or a binary without
    // the unwrapped agent argv, cannot compose anything.
    name: '005-specstory-capture',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'specstory', 'TEXT');
    }
  },
  {
    // Phase 19 item 6: what the last restore of this session ACHIEVED. The
    // restore path computed whether the scrollback was replayed and whether
    // the resume was armed, then discarded both and wrote 'running', so a
    // restore whose two stages had failed read as a healthy session.
    //
    // One JSON column rather than three, for the same reason `specstory` is
    // one: the fields are meaningless apart. A failure string without the
    // kind it belongs to cannot be rendered, and a kind without its failure
    // strings cannot tell "this shell had no conversation" from "this
    // session's conversation could not be armed".
    //
    // NULL — what every pre-existing row gets — reads as "never restored",
    // which is what those rows are.
    name: '006-restore-outcome',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'restore', 'TEXT');
    }
  },
  {
    // Phase 19 item 7: the restore journal, in the manifest.
    //
    // WHY IT IS A TABLE IN THIS DATABASE AND NOT A FILE OF ITS OWN. A second
    // durability domain can disagree with the first, and detecting exactly
    // that disagreement is the reason the journal exists. If the journal is a
    // file, "the journal and the manifest disagree" has two possible causes,
    // being a real interrupted restore or a torn journal file, and no way to
    // tell them apart. In the same database the intent row and the row it is
    // about commit under the same transaction machinery, so a disagreement
    // means what it says.
    //
    // WHAT `outcome IS NULL` MEANS AT THE NEXT LAUNCH. Tortie stopped between
    // starting a restore and finishing it. `tmux_id` tells the next launch
    // whether a tmux session was created before it stopped. Neither field is
    // taken as proof on its own: the resolution asks tmux what is actually
    // there and compares. See restore/journal.ts.
    //
    // better-sqlite3 is synchronous, so the intent row is written before the
    // first side effect with no `await` between them and therefore no window.
    // An async journal would put that window back.
    name: '007-restore-attempts',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS restore_attempts (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT    NOT NULL,
          started_at INTEGER NOT NULL,
          -- Filled the instant tmux new-session returns. NULL means no
          -- session was created, or Tortie stopped before it could be
          -- recorded, and only tmux can say which.
          tmux_id     TEXT,
          -- NULL means the attempt never finished. Otherwise a
          -- RestoreResultKind.
          outcome     TEXT,
          finished_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_restore_attempts_open
          ON restore_attempts(outcome) WHERE outcome IS NULL;
      `);
    }
  },
  {
    // Phase 21: what was TRUE about the agent when the session was created.
    //
    // WHAT IT FIXES. `restore/restore.ts` asked the LIVE REGISTRY whether an
    // agent's resume needs its original directory, and the `catch` under that
    // call answered `false` for any id the registry no longer launches. For a
    // pi shaped agent `false` is the worst possible wrong answer: the restore
    // opens a NEW EMPTY session under the recorded id, the pane looks resumed,
    // and the conversation is gone. The registry describes the software that
    // is installed right now. Restore is asking about the past.
    //
    // WHY THREE COLUMNS AND NOT ONE. They are written at different moments and
    // they answer different questions. `agent_contract` is written once, with
    // the row, before the process exists, and is never rewritten.
    // `resume_provenance` is written whenever the conversation id is, which is
    // at create for a pre-assigned agent and seconds later for a harvested
    // one. `agent_version` is a scalar because it is the field that gets asked
    // about on its own, by the drift check and by a support answer, and it is
    // deliberately not repeated inside the contract JSON.
    //
    // WHY IT CARRIES G6 AS WELL. Research 33 §2.1 requires it. Both halves are
    // "persist what the capture actually knew", both land on this table, and
    // two migrations on a manifest are two chances to be wrong. G7, spatial
    // state, is a third migration on this same table and is NOT here.
    //
    // WHAT AN EXISTING ROW GETS. NULL, in all three, and nothing is
    // backfilled. A row created before Tortie kept a contract has no contract,
    // and filling one in from today's registry would be the same guess this
    // migration exists to remove. Unknown is a real answer.
    //
    // BREAKING, NOT ADDITIVE, and the two words mean different things here.
    // The SQL shape is additive: three nullable columns, no table rebuild, no
    // rename, and research 27 §4.2 measured that an older build's INSERT keeps
    // working against exactly this shape. The COMPATIBILITY STATEMENT is
    // breaking, because research 27 §4.3 sets a stricter rule than SQLite's
    // tolerance: bump the minimum whenever a new column is REQUIRED for
    // correct restore, even where SQLite would let an old build write without
    // it. An older build creating sessions in this manifest would leave
    // `agent_contract` NULL and produce exactly the rows this phase exists to
    // stop producing. So MANIFEST_MIN_COMPATIBLE_VERSION moves with
    // MANIFEST_SCHEMA_VERSION. See ../db/schema-version.ts.
    name: '008-agent-recovery-contract',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'agent_version', 'TEXT');
      addColumnIfMissing(db, 'sessions', 'agent_contract', 'TEXT');
      addColumnIfMissing(db, 'sessions', 'resume_provenance', 'TEXT');
    }
  },
  {
    // Phase 22 (research 29 §8.2): what the agent's CONFIGURATION was when
    // this session launched. The skills, MCP servers, hooks, plugins and
    // instruction files that had resolved for this agent in this directory at
    // that moment, each with a content hash.
    //
    // WHAT IT ANSWERS. No agent records what context it loaded. Research 29
    // §8.1 read 443 `system` records across a 12 MB Claude Code session and
    // not one carries a manifest of it. Tortie owns the launch, so it is the
    // only thing on the machine that can know, and the question it lets a user
    // answer is "why did that agent not use the skill I just wrote".
    //
    // ADDITIVE, NOT BREAKING, and that is a decision rather than a default.
    // Migration 008 was breaking under the rule in research 27 §4.3, which
    // says to bump the minimum whenever a new column is REQUIRED for correct
    // restore. This column is required for nothing. It is advisory by design:
    // a missing snapshot must never fail a launch, block a restore or change a
    // resume argument, and no code on the restore path reads it. An older
    // build inserting a session into this manifest leaves `context_snapshot`
    // NULL, and NULL is not a wrong answer here, it is the true one. That
    // session really did launch without Tortie recording what it loaded, and
    // the readout has a sentence that says exactly that. So
    // MANIFEST_SCHEMA_VERSION moves to 9 and
    // MANIFEST_MIN_COMPATIBLE_VERSION stays at 8.
    //
    // The test of that claim is not the SQL shape, which was additive for 008
    // as well. It is whether an old build writing a NULL here produces a row
    // the new build reads WRONGLY. It does not: it produces a row the new
    // build reads as unrecorded, which is what it is.
    //
    // ONE COLUMN AND NOT A TABLE. Research 29 §12 puts it on the session row,
    // and pruning is the reason to keep it there. Rule 4 of §8.2 is that
    // deleting a snapshot is always safe, and a column is deleted with its
    // session by `deleteSession` with no second delete to write, no foreign
    // key to declare and no orphan to sweep. Its size is capped in
    // ./context-snapshot.ts, because an unbounded advisory blob inside a
    // durability-critical database is a hazard whatever its typical size.
    name: '009-context-snapshot',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'context_snapshot', 'TEXT');
    }
  },
  {
    // Phase 29 (research 39 section 9, first amendment): WHEN this row was
    // removed. `last_seen` means "last confirmed alive in tmux", so it cannot
    // order a removal list honestly: a row that sat ended for 5 days and was
    // then removed by accident would sort below rows removed 3 days earlier.
    // Written only by the tombstone write in markSessionRemoved. NULL on every
    // live row and on every row written before this migration, and NULL is the
    // true answer for both: the session was never removed.
    //
    // ADDITIVE, NOT BREAKING, by the rule in research 27 section 4.3. The test
    // is whether an old build writing NULL here produces a row the new build
    // reads WRONGLY. It cannot. No build older than this one writes
    // status = 'discarded' (the comment at the reconcile guard said "nothing
    // writes it yet" until today), so every discarded row is written by a
    // build that also stamps removed_at in the same statement. A row an old
    // build creates carries NULL, and the new build reads NULL as "never
    // removed", which is what that row is. So MANIFEST_SCHEMA_VERSION moves to
    // 10 and MANIFEST_MIN_COMPATIBLE_VERSION stays at 8.
    name: '010-removed-at',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'removed_at', 'INTEGER');
    }
  },
  {
    // Phase 33 (research 41 section 8): the environment variable NAMES this
    // session's agent row asked Tortie to read from the login shell, as a JSON
    // array. NAMES ONLY. No value ever reaches this column, this table or this
    // file, which is the exact failure of option B in that research and the
    // reason the column holds a list of names instead of a set of pairs.
    //
    // WHY IT IS PERSISTED AT ALL. Restore must not ask the live registry what
    // a session was launched with. That is the Phase 21 lesson and migration
    // 008 exists for it. A restore reads the names off the row, runs the same
    // login shell probe again, and injects whatever the shell says NOW. So a
    // rotated key is picked up by the restore rather than replayed from a
    // stale copy, and a fresh pane and a restored pane see the same
    // environment.
    //
    // ADDITIVE, NOT BREAKING, by the rule in research 27 section 4.3. The test
    // is whether an old build writing NULL here produces a row the new build
    // reads WRONGLY. It cannot. No build older than this one can create a
    // passthrough session, because no build older than this one reads the
    // field that names the variables, so NULL on a row an old build wrote is
    // the true answer for that row. The other direction is a degraded launch
    // rather than a misread: an old build restoring a row this build created
    // spawns the pane without the injection, which is exactly what every pane
    // did before this phase. The agent inside it fails to reach its provider
    // and says so. Nothing is lost and nothing is misreported. So
    // MANIFEST_SCHEMA_VERSION moves to 11 and MANIFEST_MIN_COMPATIBLE_VERSION
    // stays at 8.
    //
    // WRITTEN ONCE, AT CREATE. `ManifestSessionPatch` excludes it for the same
    // reason it excludes `removedAt`: the names are part of what the person
    // confirmed for this launch, and a later patch route would let some other
    // caller widen the set without anybody agreeing to it.
    name: '011-env-passthrough',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'env_passthrough', 'TEXT');
    }
  },
  {
    // Phase 48 (research 47 sections 6 and 7): the last thing the pane
    // printed before it died.
    //
    // WHAT IT FIXES. Three of the seven reproduced failure modes are an agent
    // that starts and then exits, so no static check can predict them. For
    // those the pane already prints the reason and Tortie destroys it about
    // one second later, replacing it with "Session ended unexpectedly
    // (exit 1)". The text is taken from the snapshot the reaper already
    // captures, so nothing new is spawned and nothing new is read.
    //
    // ADDITIVE, NOT BREAKING, by the rule in research 27 section 4.3. The
    // test is whether an old build writing NULL here produces a row the new
    // build reads WRONGLY. It cannot. NULL means "no last words were
    // recorded", which is exactly true of every row written before this
    // migration and of every session that died with an empty pane. Nothing on
    // the restore path reads it and no launch depends on it. So
    // MANIFEST_SCHEMA_VERSION moves to 12 and MANIFEST_MIN_COMPATIBLE_VERSION
    // stays at 8.
    //
    // CAPPED AT 500 BYTES, and never parsed. An unbounded blob of agent
    // output inside a durability critical database is a hazard whatever its
    // typical size, and parsing agent error text is a maintenance burden with
    // no upside.
    name: '012-exit-detail',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'exit_detail', 'TEXT');
    }
  },
  {
    // Phase 71 (research 51 sections 4.3 and 4.4): WHICH MACHINE this session
    // runs on.
    //
    // WHAT IT FIXES. Every reconcile decision this file supports was written
    // for one machine. `unreachableFlips` took a list of rows and a snapshot
    // instant and judged all of them together, because there was only ever one
    // socket for them to be on. With more than one machine that is a defect
    // waiting: a link to a machine that dropped would write 'unknown' on rows
    // running on this Mac, and a person would be told Tortie cannot see
    // sessions it is looking straight at. The column is what lets the judgement
    // be per machine, and the reconcile now takes a machine id and moves only
    // that machine's rows.
    //
    // BACKFILLED TO 'local', NOT LEFT NULL. Every row that exists when this
    // migration runs was created by a build that could only create sessions on
    // this Mac, so 'local' is not a default, it is the measured truth about
    // every one of them. The read side still treats NULL as 'local' as well,
    // because `/usr/bin/sqlite3 .recover` rebuilds from the FINAL schema and
    // can produce a row that has the column and never saw the UPDATE.
    //
    // ADDITIVE, NOT BREAKING, by the rule in research 27 section 4.3. The test
    // is whether an old build writing NULL here produces a row the new build
    // reads WRONGLY. It cannot. The new build reads NULL as 'local', and every
    // row an older build writes IS local, because no build older than this one
    // can create a session anywhere else. So MANIFEST_SCHEMA_VERSION moves to
    // 13 and MANIFEST_MIN_COMPATIBLE_VERSION stays at 8.
    //
    // WHAT A DOWNGRADE DOES, stated plainly. A build at schema 12 opens this
    // manifest, is allowed to write it because 12 is at or above the minimum of
    // 8, and ignores the column entirely. Every row it reads it treats as a
    // session on this Mac. That is correct today and ONLY today, because every
    // value in the column is 'local' in this release.
    //
    // THE LINE THAT KEEPS IT CORRECT IS EXECUTABLE, not written down. The first
    // build that writes any other value changes the downgrade story completely:
    // an older build would read a remote row as local and could recreate the
    // session on this Mac. So `./sessions-repository.ts` REFUSES that write
    // today, under the refusal id `manifest.machine-id-nonlocal`. The build
    // that records a real machine id moves MANIFEST_MIN_COMPATIBLE_VERSION to
    // 13 and deletes that refusal in the same commit.
    name: '013-machine-id',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'machine_id', 'TEXT');
      db.exec("UPDATE sessions SET machine_id = 'local' WHERE machine_id IS NULL");
    }
  }
];

/**
 * `PRAGMA application_id` for the manifest: the ASCII bytes of "TRTE".
 *
 * Set once and never changed. It is what lets `file`, a forensic tool, or
 * Tortie itself tell a manifest from some other SQLite database that happens
 * to be at the same path. A wrong file is then refused rather than migrated,
 * and a migration that adds Tortie's columns to somebody else's database is a
 * change nothing can undo.
 */
export const MANIFEST_APPLICATION_ID = 0x54525445;

/**
 * The schema version this build writes into `PRAGMA user_version`.
 *
 * It is the count of migrations, which is the same as the number on the last
 * one. Keep it that way: a number that has to be reasoned about is a number
 * that gets set wrong under time pressure.
 */
export const MANIFEST_SCHEMA_VERSION = 13;

/**
 * The oldest schema version whose code may still write this manifest.
 *
 * IT IS 8, WHICH IS TWO BEHIND THE SCHEMA VERSION, and the gap is the point.
 * Migration 008 is breaking by the rule in research 27 §4.3. A build at schema
 * 7 can open this file and can insert sessions into it, and every session it
 * inserted would carry a NULL `agent_contract`. Those rows restore by asking
 * the live registry, which is the defect Phase 21 removes, and for pi the
 * visible result is an empty session that looks resumed. SQLite would allow
 * that write. This number is what stops it.
 *
 * Migrations 009, 010, 011, 012 and 013 are ADDITIVE by that same rule, so each
 * moved MANIFEST_SCHEMA_VERSION and left this number alone. `context_snapshot`
 * is advisory: nothing on the restore path reads it, and a build at schema 8
 * writing NULL into it produces a session with no record of what it loaded,
 * which is exactly what that session is. `removed_at` (Phase 29) cannot be
 * needed by a row an older build writes, because no older build writes
 * status 'discarded' at all. `env_passthrough` (Phase 33) cannot be needed by
 * a row an older build writes either, because no older build reads the
 * configuration field that names those variables. Reasoning is at migrations
 * 009, 010 and 011.
 *
 * `exit_detail` (Phase 48, migration 012) is additive for the plainest reason
 * of the four. NULL means "no last words were recorded". That is true of every
 * row written before the migration, true of every session that died with an
 * empty pane, and true of every row an older build writes. Nothing on the
 * restore path reads the column and no launch depends on it. An older build
 * opening this manifest simply shows the exit code it always showed. Reasoning
 * is at migration 012.
 *
 * `machine_id` (Phase 71, migration 013) is additive because every value in the
 * column is `local` in this release, and a build at schema 12 that ignores the
 * column reads every row as a session on this Mac, which is what every row is.
 * That reasoning holds only while the column holds one value, so the sessions
 * repository REFUSES to write any other one, and the build that lifts that
 * refusal moves this number to 13 in the same commit. Reasoning is at migration
 * 013.
 *
 * The honest limit of leaving this at 8 across migration 010, stated so it is
 * checked rather than discovered: a build at schema 8 or 9 opened against
 * this manifest shows tombstoned rows in its session list, labeled "removed",
 * and its Remove verb hard deletes such a row. That is a degraded surface in
 * a build the user has moved off, not a misread, and the minimum exists to
 * stop misreads.
 *
 * The honest limit across migration 011 is the same shape. A build older than
 * this one restoring a passthrough session starts the pane without the
 * variables the row names. The agent then fails to reach its provider, which
 * is a degraded launch a person can see and act on, and it is exactly what
 * every launch did before Phase 33.
 *
 * The older limit still holds too: a build that shipped before the refusal
 * existed has no code to read this number, so it will still open the file.
 * The protection starts with the first build that carries it.
 */
export const MANIFEST_MIN_COMPATIBLE_VERSION = 8;

/** The three numbers, paired with the file they describe. */
export const MANIFEST_SCHEMA_IDENTITY: SchemaIdentity = {
  label: 'session list',
  applicationId: MANIFEST_APPLICATION_ID,
  version: MANIFEST_SCHEMA_VERSION,
  minCompatible: MANIFEST_MIN_COMPATIBLE_VERSION
};

// The migration count and MANIFEST_SCHEMA_VERSION are the same fact stated
// twice, so a migration added without moving the version has to fail here.
//
// It throws at module load rather than in a test, because the failure it
// prevents is a file that lies about which schema it is at, and a file that
// lies about that is a file the refusal cannot protect. MIGRATIONS is a static
// array in this file, so the only way to reach this line is a mistake made
// while editing it, and then every test and every launch stops at once with
// the sentence that says what to change.
if (MIGRATIONS.length !== MANIFEST_SCHEMA_VERSION) {
  throw new Error(
    `MANIFEST_SCHEMA_VERSION is ${String(MANIFEST_SCHEMA_VERSION)} and there ` +
      `are ${String(MIGRATIONS.length)} migrations. They are the same number. ` +
      'Set the version to the migration count, and decide whether the new ' +
      'migration is additive or breaking: additive leaves ' +
      'MANIFEST_MIN_COMPATIBLE_VERSION alone, breaking moves it too. See ' +
      '../db/schema-version.ts.'
  );
}

/**
 * Every migration name this build will apply, in order.
 *
 * Read by the pre-migration copy (./ring-schedule.ts), which opens the manifest
 * READ ONLY before the store is constructed and asks which of these the file has
 * no bookkeeping row for. It is derived from `MIGRATIONS` rather than written out
 * again, so a migration added above cannot be missed here.
 */
export const MANIFEST_MIGRATION_NAMES: readonly string[] = MIGRATIONS.map(
  (m) => m.name
);
