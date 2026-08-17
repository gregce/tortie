/**
 * The sealed record of what a person agreed to, shared by every confirm gate.
 *
 * ## Why this file exists (Phase 68)
 *
 * Phase 23 built one confirm gate, for a configured agent, and the record layer
 * lived inside `./confirm.ts`. Phase 68 adds a second gate, for a machine a
 * person may sign in to. Two gates could each have their own record file, and
 * that would be two files with their own subtly different failure modes for the
 * same question. So the record layer moved out here and both gates use it. The
 * functions below are the Phase 23 ones, moved with their reasoning intact. The
 * only change is that the fallback algorithm name is passed in, because the two
 * gates hash different things and neither one owns the other's name.
 *
 * **No refusal sentence moved.** Every sentence a person reads when a gate
 * refuses stays in the module that owns that gate, which is `./confirm.ts` for
 * agents and `../machines/confirm.ts` for machines. That is what keeps
 * `build/assert-bundle-refusals.mjs` pointing at the file the sentence is in.
 *
 * ## One file, two key spaces
 *
 * A machine's record key carries a prefix, `machine:`, and an agent's does not.
 * The prefix is in the record key and in the hash input, so a machine called
 * `pop-os` and a configured agent called `pop-os` can never share a
 * confirmation. Each gate reads the whole map, changes its own key, and writes
 * the whole map back, so a write by one gate keeps the other gate's rows.
 *
 * ## What the seal is for, and what it is not
 *
 * The hash says which bytes were agreed to. The seal says that Tortie is the
 * one who recorded the agreement. Neither one is enough on its own: an agent
 * process can compute a sha256, and a seal over a value nobody pinned would
 * approve whatever the file says next. `./seal.ts` holds the mechanism and the
 * honest statement of what a replay of an old file can still do.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';
import { openSealedText, sealText } from './seal';

/** What Tortie recorded when a person agreed to one row. */
export interface ConfirmRecord {
  /** The record key, which for a machine carries its prefix. */
  readonly id: string;
  /** The hash of the execution bearing fields at the moment of the agreement. */
  readonly hash: string;
  readonly algorithm: string;
  /** Epoch ms. */
  readonly at: number;
  /** The exact lines the person read. Never a summary of them. */
  readonly lines: readonly string[];
}

/**
 * The parsed file, and whether the seal could be read.
 *
 * `sealKnown` false means the app is not ready or the OS keystore is
 * unavailable, so nothing is confirmed YET and the caller must ask again rather
 * than remember the safe answer for the whole run.
 */
export interface ConfirmRecordState {
  readonly rows: Record<string, ConfirmRecord>;
  readonly sealKnown: boolean;
}

interface ConfirmFile {
  version: 1;
  confirmations: Record<string, ConfirmRecord>;
  /** Covers the id and hash of every confirmation above. See ./seal. */
  seal?: string;
}

const SEAL_PREFIX = 'gmux-config-confirm-v1:';

const EMPTY_FILE: ConfirmFile = { version: 1, confirmations: {} };

/**
 * `<userData>/gmux/config-confirmations.json`, a SIBLING of the configuration
 * directory and never inside it.
 *
 * The configuration directory is the thing an agent writes. Putting the record
 * of what a person approved inside it would let the same write that adds a row
 * add its own approval. The seal already refuses a forged record, so this is
 * the second of two answers to the same question rather than the only one, and
 * two cheap answers are the right number for the file that decides whether a
 * program runs.
 *
 * The inner `gmux/` directory is one of the identifiers live data is bound to
 * (CLAUDE.md, Phase 16.5). It stays `gmux` and is not "finished off".
 */
export function confirmPath(): string {
  return join(app.getPath('userData'), 'gmux', 'config-confirmations.json');
}

/** One sealed line per confirmation. Sorted, so it seals to one text. */
function sealedLines(rows: Record<string, ConfirmRecord>): string[] {
  return Object.values(rows)
    .map((row) => `${row.id}\u0000${row.hash}`)
    .sort();
}

function parse(raw: unknown, defaultAlgorithm: string): ConfirmFile {
  if (raw === null || typeof raw !== 'object') {
    return { ...EMPTY_FILE, confirmations: {} };
  }
  const obj = raw as Record<string, unknown>;
  const seal = obj['seal'];
  const rows = obj['confirmations'];
  const out: Record<string, ConfirmRecord> = {};
  if (rows !== null && typeof rows === 'object' && !Array.isArray(rows)) {
    for (const [key, value] of Object.entries(rows as Record<string, unknown>)) {
      if (value === null || typeof value !== 'object') continue;
      const row = value as Record<string, unknown>;
      const hash = row['hash'];
      if (typeof hash !== 'string' || hash.length === 0) continue;
      out[key] = {
        id: typeof row['id'] === 'string' ? row['id'] : key,
        hash,
        algorithm:
          typeof row['algorithm'] === 'string' ? row['algorithm'] : defaultAlgorithm,
        at: typeof row['at'] === 'number' ? row['at'] : 0,
        lines: Array.isArray(row['lines'])
          ? row['lines'].filter((l): l is string => typeof l === 'string')
          : []
      };
    }
  }
  return {
    version: 1,
    confirmations: out,
    ...(typeof seal === 'string' ? { seal } : {})
  };
}

/**
 * Read the record, and drop every row the seal does not cover.
 *
 * A row in the file that the seal does not name was not written by Tortie. It
 * is dropped whole, exactly the way the settings sanitiser drops a value it
 * cannot account for, and the row reads afterwards as "never confirmed" rather
 * than as "approved". That is the safe direction: the cost is that a person is
 * asked again, and the alternative cost is a program running that nobody agreed
 * to.
 *
 * THIS RE-READS THE FILE ON EVERY CALL, AND THAT IS DELIBERATE. Caching the
 * answer was the first version of this function and it was wrong. The author of
 * the file this reads is a process that runs while Tortie runs, so a cache
 * means the record is read once at some point in the run and every launch
 * afterwards is decided against a copy of a file that has since been rewritten.
 * Three of this module's own adversarial tests failed against the cached
 * version and pass against no cache at all, which is the whole argument. The
 * cost is one small JSON parse and one keystore call per launch, against a
 * launch that already starts a tmux pane and a CLI. Do not put the cache back.
 *
 * @param defaultAlgorithm the algorithm name a record with no `algorithm` field
 *        is read as. It is passed in because two gates share this file and
 *        neither one owns the other's name.
 */
export function readConfirmRecords(defaultAlgorithm: string): ConfirmRecordState {
  const path = confirmPath();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    // Missing or corrupt. Nothing is confirmed, which disables nothing that
    // was already running and approves nothing. It is never repaired in place.
  }
  const file = parse(parsed, defaultAlgorithm);
  const opened = openSealedText(SEAL_PREFIX, file.seal);
  if (opened === null) {
    // Not known yet. Answer safely now and ask again on the next read.
    return { rows: {}, sealKnown: false };
  }
  let covered: Set<string>;
  try {
    const list: unknown = opened.length === 0 ? [] : JSON.parse(opened);
    covered = new Set(
      Array.isArray(list) ? list.filter((l): l is string => typeof l === 'string') : []
    );
  } catch {
    covered = new Set();
  }
  const rows: Record<string, ConfirmRecord> = {};
  for (const [key, row] of Object.entries(file.confirmations)) {
    if (!covered.has(`${row.id}\u0000${row.hash}`)) continue;
    rows[key] = row;
  }
  return { rows, sealKnown: true };
}

/**
 * Write the whole map, sealed.
 *
 * Returns false when the OS keystore could not seal it, and in that case
 * nothing is written at all. A confirmation the next load would refuse would
 * make the product lie about what it will do.
 */
export function writeConfirmRecords(rows: Record<string, ConfirmRecord>): boolean {
  const seal = sealText(SEAL_PREFIX, JSON.stringify(sealedLines(rows)));
  if (Object.keys(rows).length > 0 && seal === undefined) return false;
  const file: ConfirmFile = {
    version: 1,
    confirmations: rows,
    ...(seal !== undefined ? { seal } : {})
  };
  const path = confirmPath();
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  renameSync(tmp, path); // atomic on the same volume
  return true;
}
