/**
 * Harness only (Phase 143). Writes version chains into an isolated profile's
 * overview store, so a probe can photograph the story a session told without
 * asking any model anything.
 *
 * WHY IT EXISTS. The story panel draws the chain of sentences the fold wrote
 * for one session. Every shape the entry asks to see needs a chain that no
 * screenshot launch can produce. A chain of three needs three folds. A chain
 * of two hundred needs two hundred of them. A run of identical sentences, a
 * switch of model partway and a refused version that leaves a hole behind it
 * each need the model to answer in a particular way, which is not something a
 * probe can arrange and never something it should pay for.
 *
 * So this module writes the rows through the SHIPPED path, being
 * `overviewStore().appendSummary`. There is no raw SQL here and there is none
 * anywhere else in the phase. The version numbers and the parents are still
 * the store's own, computed the way a real fold computes them, so a chain
 * seeded here is a chain a real fold could have written. The caller hands over
 * only what `appendSummary` already takes from the fold, being the turn range,
 * the text, the verdict, the harness and the model, which is why one path
 * builds every fixture the entry asks for.
 *
 * TWO REFUSALS, both hard, and both the same two ./fold-seed.ts carries.
 *
 *  1. The launch must be an isolated harness launch (GMUX_SMOKE or GMUX_SHOT).
 *     A seed variable left in a shell profile must never write into a person's
 *     real store.
 *  2. The profile directory must sit under the harness directory the runner
 *     handed us. A launch that points GMUX_SUMMARY_SEED at the app while using
 *     the real profile is refused even when GMUX_SHOT is set.
 */

import { app } from 'electron';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { overviewStore } from '../overview';
import { getGmuxCore } from '../sessions';
import { isInside } from './fold-stub';
import { isIsolatedLaunch } from './launch-gate';

/** The three verdicts the table allows, mirrored so the spec is typed. */
type SummarySeedVerdict = 'kept' | 'refused' | 'failed';

/** One version, in the order the caller wants it appended. */
interface SummarySeedVersion {
  /** First turn index this version covers. */
  fromTurn: number;
  /** Last turn index this version covers. */
  toTurn: number;
  /** The sentence. Null on any verdict that is not kept, which the store allows. */
  text?: string | null;
  /** Defaults to kept, which is the only verdict that carries a sentence. */
  verdict?: SummarySeedVerdict;
  /** Why it was refused or why it failed. Null on a kept version. */
  reason?: string | null;
  /** Overrides the chain's harness for this one version. */
  harness?: string;
  /** Overrides the chain's model for this one version, which is the model switch. */
  model?: string;
  /** The map version at the time. Presentation never reads it. */
  providerMapVersion?: number;
  /** The fold's own cache key. Never drawn, and derived when the caller leaves it out. */
  inputHash?: string;
  /** Epoch milliseconds. The moment the fold finished, and the clock the row draws. */
  writtenAt?: number;
}

/** One session's chain, named the way the probe names it. */
interface SummarySeedChain {
  /** The manifest session name, which ./overview-seed.ts wrote a row for. */
  name: string;
  /** The harness for every version that does not name its own. */
  harness?: string;
  /** The model for every version that does not name its own. */
  model?: string;
  /** Appended oldest first, so the store's version numbers count upward. */
  versions: SummarySeedVersion[];
}

/** What the probe asks for, read from the file GMUX_SUMMARY_SEED names. */
interface SummarySeedSpec {
  /** The harness for every chain that does not name its own. */
  harness?: string;
  /** The model for every chain that does not name its own. */
  model?: string;
  chains: SummarySeedChain[];
}

/** One chain's outcome, printed for the probe to read. */
interface SummarySeedOutcome {
  name: string;
  sessionId: string;
  /** How many versions the store now holds for this session. */
  written: number;
  /** How many of them carry a sentence a person can read. */
  kept: number;
  firstVersion: number;
  lastVersion: number;
}

/** The one line the probe parses out of the harness output. */
const MARKER = '[gmux-summary-seed]';

/** The defaults, so a chain of two hundred does not have to spell them out. */
const DEFAULT_HARNESS = 'claude';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Why this seed may not run, or null when it may.
 *
 * The two refusals live in one pure function so a test can drive both with an
 * environment record and a profile path rather than with an Electron.
 */
export function summarySeedRefusal(
  env: NodeJS.ProcessEnv,
  userDataDir: string
): string | null {
  if (!isIsolatedLaunch(env)) {
    return 'GMUX_SUMMARY_SEED refused: this launch is not an isolated harness launch.';
  }
  const harnessDir = env['GMUX_HARNESS_DIR'] ?? '';
  if (harnessDir === '' || !isInside(userDataDir, harnessDir)) {
    return (
      'GMUX_SUMMARY_SEED refused: the profile directory is not under the harness ' +
      'directory, so this could be a real profile.'
    );
  }
  return null;
}

/** The fold's own cache key, derived when the caller leaves it out. */
function derivedHash(sessionId: string, at: number): string {
  return createHash('sha256').update(`${sessionId} ${String(at)}`).digest('hex');
}

/** Called by dispatchHarness in the GMUX_SHOT branch, after the fold seed. */
export async function seedSummaries(): Promise<void> {
  const file = process.env['GMUX_SUMMARY_SEED'] ?? '';
  if (file === '') return;
  const refusal = summarySeedRefusal(process.env, app.getPath('userData'));
  if (refusal !== null) throw new Error(refusal);

  const spec = JSON.parse(await readFile(file, 'utf8')) as SummarySeedSpec;
  const core = await getGmuxCore();
  const store = overviewStore();
  const rows = core.manifest.listSessions();
  const outcomes: SummarySeedOutcome[] = [];

  for (const chain of spec.chains) {
    const row = rows.find((candidate) => candidate.name === chain.name);
    if (row === undefined) {
      // A silent skip would let the probe photograph an empty story and call
      // it a chain, so this is an error rather than a warning.
      throw new Error(
        `GMUX_SUMMARY_SEED names the session "${chain.name}", and the manifest ` +
          'holds no session by that name.'
      );
    }
    const harness = chain.harness ?? spec.harness ?? DEFAULT_HARNESS;
    const model = chain.model ?? spec.model ?? DEFAULT_MODEL;
    let first = 0;
    let last = 0;
    let kept = 0;
    chain.versions.forEach((version, index) => {
      const verdict = version.verdict ?? 'kept';
      const writtenAt = version.writtenAt ?? Date.now();
      const stored = store.appendSummary({
        sessionId: row.id,
        fromTurn: version.fromTurn,
        toTurn: version.toTurn,
        text: verdict === 'kept' ? (version.text ?? null) : null,
        verdict,
        reason: version.reason ?? null,
        harness: version.harness ?? harness,
        model: version.model ?? model,
        providerMapVersion: version.providerMapVersion ?? 1,
        inputHash: version.inputHash ?? derivedHash(row.id, writtenAt + index),
        writtenAt
      });
      if (index === 0) first = stored.version;
      last = stored.version;
      if (verdict === 'kept') kept += 1;
    });
    outcomes.push({
      name: chain.name,
      sessionId: row.id,
      written: chain.versions.length,
      kept,
      firstVersion: first,
      lastVersion: last
    });
  }

  console.log(`${MARKER} ${JSON.stringify({ outcomes })}`);
}
