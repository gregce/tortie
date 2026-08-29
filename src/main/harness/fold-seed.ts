/**
 * Harness only (Phase 138). Sets the fold choice in an isolated profile and
 * drives one real fold per named session, so a probe can photograph the
 * project view with the fold on and with it off.
 *
 * WHY IT EXISTS. The entry's first run rather than read proof is a photograph
 * of the project view in both states. Getting there needs two things a probe
 * cannot reach from outside the app. The choice is sealed, so it can only be
 * written by the process that holds the key. And a fold runs only when a
 * session finishes a turn, which nothing in a screenshot launch does.
 *
 * So this module writes the choice through the SHIPPED settings path, which
 * means the seal is a real seal and `getSettings()` reads it back through the
 * same check a person's launch uses, and then calls the live scheduler's own
 * `noteTurnBoundary`. Everything after that is the shipped path: the settle
 * timer, the store read, the composer, the spawn, the ten refusals and the
 * one append. The binary is the stub from ./fold-stub.ts, so the whole run
 * spends nothing and can be run again for nothing.
 *
 * TWO REFUSALS, both hard, and both the same two ./overview-seed.ts carries.
 *
 *  1. The launch must be an isolated harness launch (GMUX_SMOKE or GMUX_SHOT).
 *     A seed variable left in a shell profile must never write a person's real
 *     settings file, because this value decides that a program runs.
 *  2. The profile directory must sit under the harness directory the runner
 *     handed us. A launch that points GMUX_FOLD_SEED at the app while using
 *     the real profile is refused even when GMUX_SHOT is set.
 */

import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { overviewStore } from '../overview';
import { getGmuxCore } from '../sessions';
import { getSettings, updateSettings } from '../settings/store';
import { seedRefusal } from './seed-gate';

/** What the probe asks for, read from the file GMUX_FOLD_SEED names. */
interface FoldSeedSpec {
  /** The agent that writes the line, or null for None. */
  agentId: string | null;
  /** A model that agent's recipe offers, or null for None. */
  model: string | null;
  /** The project to open, so a boundary is not dropped for a closed project. */
  projectPath?: string;
  /** Session names whose turn boundary is fired once each. */
  boundaries?: string[];
  /** How long to wait for every named session to hold a row. */
  waitMs?: number;
}

/** One session's outcome, printed for the probe to read. */
interface FoldSeedOutcome {
  name: string;
  sessionId: string;
  verdict: string | null;
  reason: string | null;
  fromTurn: number | null;
  toTurn: number | null;
  text: string | null;
}

/** The one line the probe parses out of the harness output. */
const MARKER = '[gmux-fold-seed]';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Why this seed may not run, or null when it may.
 *
 * The two refusals live in one pure function so a test can drive both with an
 * environment record and a profile path rather than with an Electron.
 */
export function foldSeedRefusal(
  env: NodeJS.ProcessEnv,
  userDataDir: string
): string | null {
  return seedRefusal('GMUX_FOLD_SEED', env, userDataDir);
}

/** Called by dispatchHarness in the GMUX_SHOT branch, after the stub is installed. */
export async function seedFold(): Promise<void> {
  const file = process.env['GMUX_FOLD_SEED'] ?? '';
  if (file === '') return;
  const refusal = foldSeedRefusal(process.env, app.getPath('userData'));
  if (refusal !== null) throw new Error(refusal);

  const spec = JSON.parse(await readFile(file, 'utf8')) as FoldSeedSpec;
  const core = await getGmuxCore();

  // The project has to be open, because the entry refuses a fold for a session
  // whose project is closed. The shot drive opens it later for the renderer,
  // and the scheduler reads the manifest, so the row goes in here.
  if (spec.projectPath !== undefined) {
    core.manifest.upsertProject({
      id: randomUUID(),
      path: spec.projectPath,
      name: basename(spec.projectPath)
    });
  }

  // The shipped write, which is what makes the seal real.
  updateSettings({ fold: { agentId: spec.agentId, model: spec.model } });
  const readBack = getSettings().fold;
  const wanted = spec.agentId !== null && spec.model !== null;
  const got = readBack.agentId !== null && readBack.model !== null;
  if (wanted && !got) {
    throw new Error(
      'GMUX_FOLD_SEED could not keep the choice. The OS keystore refused to ' +
        'seal it, so the fold would never run and the probe would photograph ' +
        'the wrong thing.'
    );
  }

  const names = spec.boundaries ?? [];
  const outcomes: FoldSeedOutcome[] = [];
  if (names.length > 0) {
    const rows = core.manifest.listSessions();
    const targets = names.flatMap((name) => {
      const row = rows.find((candidate) => candidate.name === name);
      return row === undefined ? [] : [{ name, id: row.id }];
    });
    for (const target of targets) core.fold.noteTurnBoundary(target.id);

    const store = overviewStore();
    const deadline = Date.now() + (spec.waitMs ?? 25_000);
    const done = new Set<string>();
    while (done.size < targets.length && Date.now() < deadline) {
      for (const target of targets) {
        if (done.has(target.id)) continue;
        if (store.latestSummary(target.id) !== null) done.add(target.id);
      }
      if (done.size < targets.length) await wait(250);
    }
    for (const target of targets) {
      const row = store.latestSummary(target.id);
      outcomes.push({
        name: target.name,
        sessionId: target.id,
        verdict: row?.verdict ?? null,
        reason: row?.reason ?? null,
        fromTurn: row?.fromTurn ?? null,
        toTurn: row?.toTurn ?? null,
        text: row?.text ?? null
      });
    }
  }

  console.log(
    `${MARKER} ${JSON.stringify({
      choice: readBack,
      counts: core.fold.counts(),
      outcomes
    })}`
  );
}
