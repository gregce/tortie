/**
 * THE HALF HE CAN FEEL: the rows that are already wrong.
 *
 * Phase 215. Refusing sub agents at the harvest stops the next row being
 * written wrong and touches none of the rows already on disk. On 2026-09-05 the
 * operator rebooted, went to restore, and codex refused
 * `01a0696a-75d1-7af1-8f22-de5903c5ebeb` with `cannot resume an unloaded
 * multi-agent v2 sub-agent through its parent; resume the parent first`. That
 * id is in his manifest right now, and so are three more.
 *
 * WHAT IT DOES, once per boot, over codex rows only:
 *
 *  - reads the row's stored id and asks whether it is a DERIVED stream, the
 *    vendor's own `state_5.sqlite` first and the rollout's line 1 second;
 *  - if it is, WALKS `parent_thread_id` to a thread it has PROVED exists on
 *    disk and is not itself derived, rather than taking one hop, because
 *    `depth` is a field the vendor writes and nothing promises it is 1;
 *  - rewrites the id, the resume argv and the provenance note in ONE durable
 *    write.
 *
 * WHAT IT NEVER DOES, and these are the rules the phase is judged on:
 *
 *  - NO ROW IS EVER EMPTIED. Every failure path leaves the stored id exactly
 *    as it is and reports it. A wrong id a person can see beats a row that
 *    quietly emptied, because the first can be resumed by hand and the second
 *    cannot be recovered at all.
 *  - A row already naming a real session is BYTE IDENTICAL afterwards. It is
 *    not rewritten, not re-provenanced and not touched.
 *  - A cycle, a self reference, a chain past the bound, a parent that is not
 *    on disk and a derived record that names no parent anywhere all LEAVE THE
 *    ROW ALONE. Two records in his store are the last of those, being
 *    0.125.0-alpha.3 rollouts carrying `source.subagent` with no
 *    `thread_spawn` inside it.
 *  - NOTHING IS WRITTEN TO HIS AGENT STORE. This module opens codex's files
 *    read only and writes the manifest and nothing else.
 *  - NO OTHER AGENT IS TOUCHED. The row filter is `agent === 'codex'` and the
 *    stated reason is that only codex has a proved wrong row on his disk.
 *
 * IT IS IDEMPOTENT BY CONSTRUCTION rather than by a flag: after a repair the
 * row's id is a thread that is not derived, so the same predicate answers
 * `already a session` and the second pass writes nothing. Measured on a copy of
 * his live manifest: pass 1 moved 4, pass 2 moved 0, and a digest over every
 * row after each pass is identical.
 *
 * IT IS SYNCHRONOUS on purpose. It is the FIRST pass of `resumeIdHarvests`,
 * ahead of the boot rescue arming any watch, so a repaired row is never then
 * rescued against the id it just left. The whole cost is one indexed query per
 * row against a database that is already open, plus, only when that database
 * cannot answer, ONE directory walk of the rollout store: 25,994 files over
 * 209 directories measured at 161 ms cold and 16 ms warm on his own tree.
 *
 * A STATED LIMIT, and it is not a defect this phase introduced. Two rows can
 * end up naming one conversation, and one such pair already exists on his
 * disk. `agent_session_id` carries no uniqueness constraint, the boot loop in
 * ./id-harvest.ts already warns in those words, and a repair that refused to
 * move whenever the parent was already held would leave the exact row he
 * reported unrepaired, because another row in the same folder already holds
 * that parent. So the move happens and the duplicate is said out loud.
 */

import { openSync, readSync, closeSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import type { LaunchableAgentId } from '@shared/types';
import { getLog } from '../log';
import { loginEnvForSession } from '../logins';
import {
  codexDerivedRecord,
  codexParentThreadId,
  codexStateFor,
  DESCRIPTORS,
  SESSION_CONTRACT_VERSION,
  type CodexStateReader,
  type ManifestSessionRecord,
  type ManifestStore,
  type ResumeProvenance
} from '../manifest';
import { agentExtrasOf } from './launch-plan';
import { composeResumeArgv } from './resume-argv';

const sessionsLog = getLog('sessions');

/**
 * How many parent hops a walk may take.
 *
 * EIGHT, and the number is a measurement rather than caution. Over his 521
 * derived records the deepest real chain is THREE hops (491 resolve in 1, 25 in
 * 2, 3 in 3) and the vendor's own declared `depth` agrees exactly. Eight is
 * 2.6x that, each hop is one bounded head read of a file already in the page
 * cache, so a generous bound costs nothing while a bound of 3 would silently
 * stop repairing the day codex nests deeper.
 *
 * THE BOUND IS A REFUSAL, NEVER A TRUNCATION. A walk that reaches it leaves
 * the row exactly as it is; it never writes the last id it happened to reach.
 */
const MAX_PARENT_HOPS = 8;

/** Why a row was left alone, or that it was not. */
export type CodexRepairVerdict =
  /** The stored id names a thread that is not derived. Untouched. */
  | 'already-a-session'
  /** Rewritten to the thread that spawned it. */
  | 'repaired'
  /** Neither the store nor a rollout could say. Untouched. */
  | 'cannot-tell'
  /** Derived, and no rollout for it or its chain is on disk. Untouched. */
  | 'rollout-missing'
  /** Derived, and it names no parent in either place. Untouched. */
  | 'no-parent-named'
  /** The chain came back to something it had already visited. Untouched. */
  | 'cycle'
  /** The chain is deeper than MAX_PARENT_HOPS. Untouched. */
  | 'over-bound'
  /** A parent was named and its rollout is not on disk. Untouched. */
  | 'parent-missing'
  /** The registry could not compose a resume argv for it. Untouched. */
  | 'no-resume-argv';

export interface CodexRepairOutcome {
  /** The manifest row. */
  sessionId: string;
  name: string;
  /** The id the row held before this pass. Never empty on a reported row. */
  before: string;
  /** The id it holds after. Equal to `before` on every verdict but repaired. */
  after: string;
  hops: number;
  verdict: CodexRepairVerdict;
  /** Which voice said the stored id was derived, for the record. */
  saidBy: 'store' | 'rollout' | 'neither';
}

export interface CodexRepairOptions {
  /** Test hook. Defaults to os.homedir(). */
  home?: string;
  /** Test hook. Defaults to process.env. */
  env?: NodeJS.ProcessEnv;
  /** Test hook. Defaults to Date.now. */
  now?: () => number;
}

/**
 * Repair every codex row whose stored id names a sub agent thread.
 *
 * Returns one outcome per codex row that HELD an id, whether it moved or not,
 * because the rows that were left alone are the half a person has to be told
 * about.
 */
export function repairCodexResumeIds(
  manifest: ManifestStore,
  options: CodexRepairOptions = {}
): CodexRepairOutcome[] {
  const now = options.now ?? Date.now;
  const home = options.home ?? homedir();
  const baseEnv = options.env ?? process.env;

  const rows = manifest
    .listSessions()
    .filter(
      (rec) => rec.agent === 'codex' && (rec.agentSessionId ?? '').length > 0
    );
  if (rows.length === 0) return [];

  const homes = new Map<string, CodexHomeReader>();
  const readerFor = (rec: ManifestSessionRecord): CodexHomeReader => {
    // PHASE 202. A row launched under a second login wrote its rollouts under
    // that login's CODEX_HOME, so the repair looks where that session's own
    // agent wrote rather than in the default store.
    const loginEnv = loginEnvForSession(rec.agent, rec.login);
    const env = loginEnv ?? baseEnv;
    const codexHome = env['CODEX_HOME'] ?? join(home, '.codex');
    let reader = homes.get(codexHome);
    if (reader === undefined) {
      reader = makeCodexHomeReader(codexHome, home, env);
      homes.set(codexHome, reader);
    }
    return reader;
  };

  const outcomes: CodexRepairOutcome[] = [];
  for (const rec of rows) {
    const before = rec.agentSessionId ?? '';
    const outcome = repairOne(manifest, rec, before, readerFor(rec), now);
    outcomes.push(outcome);
  }
  report(outcomes);
  return outcomes;
}

// ---------------------------------------------------------------------------
// One row
// ---------------------------------------------------------------------------

function repairOne(
  manifest: ManifestStore,
  rec: ManifestSessionRecord,
  before: string,
  reader: CodexHomeReader,
  now: () => number
): CodexRepairOutcome {
  const left = (
    verdict: CodexRepairVerdict,
    saidBy: CodexRepairOutcome['saidBy'],
    hops = 0
  ): CodexRepairOutcome => ({
    sessionId: rec.id,
    name: rec.name,
    before,
    after: before,
    hops,
    verdict,
    saidBy
  });

  const first = reader.classify(before);
  if (first.verdict === 'session') return left('already-a-session', first.saidBy);
  if (first.verdict === 'unknown') {
    return left(first.onDisk ? 'cannot-tell' : 'rollout-missing', 'neither');
  }

  // THE WALK. Visited is compared lower case, so a cycle spelled in two cases
  // is caught by the SET rather than by the counter.
  const visited = new Set<string>([before.toLowerCase()]);
  let cursor = before;
  let hops = 0;
  for (;;) {
    const parent = reader.parentOf(cursor);
    if (parent === null) return left('no-parent-named', first.saidBy, hops);
    if (visited.has(parent.toLowerCase())) return left('cycle', first.saidBy, hops);
    hops += 1;
    if (hops > MAX_PARENT_HOPS) return left('over-bound', first.saidBy, hops);
    const step = reader.classify(parent);
    // A parent nothing on disk can vouch for is not a parent this repair will
    // write. Proving it exists is the whole difference between a repair and a
    // guess.
    if (!step.onDisk) return left('parent-missing', first.saidBy, hops);
    if (step.verdict === 'session') {
      return write(manifest, rec, before, parent, hops, first.saidBy, reader, now);
    }
    if (step.verdict === 'unknown') {
      // Its rollout is there and neither voice can classify it. Refusing to
      // walk past a record nobody can read is the same rule as the bound.
      return left('cannot-tell', first.saidBy, hops);
    }
    visited.add(parent.toLowerCase());
    cursor = parent;
  }
}

function write(
  manifest: ManifestStore,
  rec: ManifestSessionRecord,
  before: string,
  after: string,
  hops: number,
  saidBy: CodexRepairOutcome['saidBy'],
  reader: CodexHomeReader,
  now: () => number
): CodexRepairOutcome {
  const composed = composeResumeArgv(
    rec,
    rec.agent as LaunchableAgentId,
    after,
    agentExtrasOf(rec)
  );
  const left = (verdict: CodexRepairVerdict): CodexRepairOutcome => ({
    sessionId: rec.id,
    name: rec.name,
    before,
    after: before,
    hops,
    verdict,
    saidBy
  });
  // NEVER AN ID-LESS ARGV, and never an id with no argv either: if the
  // composition refuses, the row keeps the id and the argv it already had.
  if (composed === null) return left('no-resume-argv');
  if (composed.captureLost) {
    sessionsLog.warn(
      `codex resume for "${rec.name}" could not keep SpecStory capture; ` +
        'the armed command runs the agent directly.'
    );
  }

  const at = now();
  const prior = rec.resumeProvenance;
  const provenance: ResumeProvenance = {
    ...(prior ?? {
      v: SESSION_CONTRACT_VERSION,
      source: 'boot-rescue',
      confidence: 'weak',
      at,
      cwd: rec.cwd
    }),
    // The record that now carries the id, when it is known.
    ...(reader.rolloutOf(after) !== null
      ? { storePath: reader.rolloutOf(after) as string }
      : {}),
    // NOT 'exact', WHATEVER THE ROW USED TO SAY. The old claim was made about
    // an id that turned out to be unresumable, and the new one inherits
    // exactly the evidence the old one had: a folder both threads share and a
    // time. What the vendor's own edge table proves is which thread SPAWNED
    // that one, not which pane either belongs to. Rows can now name one
    // conversation twice, which is a state the boot loop below already warns
    // about, and a row that says 'exact' about that would be the same
    // overstatement this phase exists to end.
    confidence: 'weak',
    keyConfidence: 'weak',
    repairedFrom: before,
    repairedAt: at,
    repairedHops: hops,
    repairedBy: 'codex-subagent'
  };
  // ONE durable write: the id, the argv built from it and the note that says
  // where the id moved from, in one transaction.
  manifest.setAgentSessionId(rec.id, after, composed.argv, provenance);
  return {
    sessionId: rec.id,
    name: rec.name,
    before,
    after,
    hops,
    verdict: 'repaired',
    saidBy
  };
}

// ---------------------------------------------------------------------------
// One codex home: the store, the rollout index, and the two voices
// ---------------------------------------------------------------------------

interface Classification {
  verdict: 'session' | 'derived' | 'unknown';
  /** TRUE when a rollout for this id is on disk. */
  onDisk: boolean;
  saidBy: CodexRepairOutcome['saidBy'];
}

interface CodexHomeReader {
  classify(id: string): Classification;
  parentOf(id: string): string | null;
  rolloutOf(id: string): string | null;
}

function makeCodexHomeReader(
  codexHome: string,
  home: string,
  env: NodeJS.ProcessEnv
): CodexHomeReader {
  const state: CodexStateReader | null = codexStateFor(codexHome);
  // The descriptor's own roots, so the repair and the harvest never disagree
  // about where codex writes. `roots` is pure and takes no context this needs.
  const descriptor = DESCRIPTORS.codex;
  const roots =
    descriptor?.roots({ cwd: '/', sinceTs: 0 }, { home, env: { ...env, CODEX_HOME: codexHome } }) ??
    [join(codexHome, 'sessions'), join(codexHome, 'archived_sessions')];

  let index: Map<string, string> | null = null;
  const rolloutOf = (id: string): string | null => {
    const key = id.toLowerCase();
    // THE STORE NAMES THE FILE, so the common path never walks a directory.
    const stated = state?.thread(id)?.rolloutPath ?? null;
    if (stated !== null && fileExists(stated)) return stated;
    // Only now is the walk worth its 161 ms, and it happens at most once per
    // codex home per boot.
    index ??= buildRolloutIndex(roots);
    return index.get(key) ?? null;
  };

  const records = new Map<string, Record<string, unknown> | null>();
  const recordOf = (id: string): Record<string, unknown> | null => {
    const key = id.toLowerCase();
    const cached = records.get(key);
    if (cached !== undefined) return cached;
    const path = rolloutOf(id);
    const parsed = path === null ? null : readFirstJsonLineSync(path);
    records.set(key, parsed);
    return parsed;
  };

  return {
    rolloutOf,
    classify: (id): Classification => {
      // THE STORE FIRST, because it is the vendor STATING the answer rather
      // than Tortie inferring it from a file's first line.
      const stated = state?.derived(id) ?? 'unknown';
      if (stated === 'derived') {
        return { verdict: 'derived', onDisk: rolloutOf(id) !== null, saidBy: 'store' };
      }
      // THEN THE ROLLOUT, and it is asked even when the store said `session`,
      // because a refusal by EITHER is a refusal. Over his 25,972 records the
      // store never calls a derived record a session, and the rollout catches
      // two the store says nothing about.
      const record = recordOf(id);
      if (record === null) {
        // A file that is there but cannot be READ, being a .zst, an empty
        // one that has not been flushed, or a line 1 that is not JSON, is
        // `unknown` WITH the file present. It is a different sentence from a
        // rollout that is gone, and both leave the row alone.
        return {
          verdict: stated === 'session' ? 'session' : 'unknown',
          onDisk: rolloutOf(id) !== null,
          saidBy: stated === 'session' ? 'store' : 'neither'
        };
      }
      if (codexDerivedRecord([record])) {
        return { verdict: 'derived', onDisk: true, saidBy: 'rollout' };
      }
      return { verdict: 'session', onDisk: true, saidBy: stated === 'session' ? 'store' : 'rollout' };
    },
    parentOf: (id): string | null => {
      // `thread_spawn_edges` states it. His 519 edges agree with the rollouts
      // on every one of the 519 parents, with zero disagreements.
      const stated = state?.parent(id) ?? null;
      if (stated !== null) return stated;
      const record = recordOf(id);
      // AND THE NESTED FIELD, not just the top level one: 115 of his 521
      // derived records name their parent ONLY inside
      // `source.subagent.thread_spawn.parent_thread_id`, which is 22 per cent.
      return record === null ? null : codexParentThreadId(record);
    }
  };
}

/** Every rollout uuid under these roots, mapped to its path. */
function buildRolloutIndex(roots: readonly string[]): Map<string, string> {
  const found = new Map<string, string>();
  const ROLLOUT =
    /^rollout-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-([0-9a-fA-F-]{36})\.jsonl(\.zst)?$/;
  const walk = (dir: string, depth: number): void => {
    // The store is `<root>/<YYYY>/<MM>/<DD>/`, so four is already generous,
    // and a bound is what stops a symlinked loop in somebody's store.
    if (depth > 5) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      const uuid = ROLLOUT.exec(basename(full))?.[1];
      // FIRST WINS, and the roots are walked in the descriptor's order, so a
      // live rollout is preferred over an archived copy of the same id.
      if (uuid !== undefined && !found.has(uuid.toLowerCase())) {
        found.set(uuid.toLowerCase(), full);
      }
    }
  };
  for (const root of roots) walk(root, 0);
  return found;
}

function fileExists(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * Line 1 of a JSONL file, parsed, or null.
 *
 * The synchronous twin of ./manifest/harvest/stores.ts's reader, and it is
 * synchronous for the reason at the top of this file: this pass runs before
 * any watch is armed. Bounded at 256 KiB, opened with 'r', and a truncated or
 * unparseable line is null rather than a guess, which leaves the row alone.
 */
function readFirstJsonLineSync(path: string): Record<string, unknown> | null {
  if (path.endsWith('.zst')) return null; // cannot be read without a zstd dep
  let fd: number | null = null;
  try {
    fd = openSync(path, 'r');
    const buffer = Buffer.alloc(256 * 1024);
    const read = readSync(fd, buffer, 0, buffer.length, 0);
    if (read === 0) return null;
    const text = buffer.subarray(0, read).toString('utf8');
    const newline = text.indexOf('\n');
    if (newline === -1) return null;
    const parsed: unknown = JSON.parse(text.slice(0, newline));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        /* already gone */
      }
    }
  }
}

/** Say what happened, because the rows left alone are the half to be told. */
function report(outcomes: readonly CodexRepairOutcome[]): void {
  const moved = outcomes.filter((o) => o.verdict === 'repaired');
  const stuck = outcomes.filter(
    (o) => o.verdict !== 'repaired' && o.verdict !== 'already-a-session'
  );
  for (const o of moved) {
    sessionsLog.info(
      `codex resume id for "${o.name}" was a sub agent thread. ` +
        `${o.before} -> ${o.after} (${o.hops} hop(s), said by the ${o.saidBy}). ` +
        'The row records where it moved from.'
    );
  }
  for (const o of stuck) {
    sessionsLog.warn(
      `codex resume id ${o.before} for "${o.name}" looks like a sub agent ` +
        `thread and was LEFT EXACTLY AS IT IS: ${o.verdict}. Nothing was ` +
        'cleared, so the id can still be resumed by hand.'
    );
  }
}
