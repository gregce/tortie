/**
 * The machine context (Phase 168): where Tortie stands on this Mac.
 *
 * One machine wide `ps` is taken per capture already (the ownership walk
 * reads it); this module reads the SAME table again, groups every process
 * Tortie does not own into its app, and ranks Tortie among those groups by
 * resident memory. Resident is the ruler because it is the one number the
 * table carries for every process on the machine; the hover says so.
 *
 * THE DESIGN DECISION, made in the Phase 168 charter: the other apps'
 * names appear on the report's face and are EXCLUDED from the copied text,
 * so a pasted report never describes the rest of the machine. This module
 * only produces the data; ./report-text.ts keeps the exclusion and the
 * unit tests on both sides pin it.
 *
 * A group's name is the first `.app` bundle on the command's path, which
 * folds an app's helpers into it (every Chrome helper lives under
 * `Google Chrome.app`), and the binary's basename otherwise. Never a path.
 *
 * Pure over the parsed table; no spawn of its own.
 */

import type { DiagnosticsMachineApp, DiagnosticsMachineContext } from '@shared/ipc';
import type { ProcRow } from '../proc/ps';
import { binaryOf } from './owned-processes';

const APP_BUNDLE = /\/([^/]+)\.app\//;

/** The app a command line belongs to: bundle name, else binary basename. */
export function appNameOf(command: string): string {
  const bundle = APP_BUNDLE.exec(command);
  if (bundle !== null) return bundle[1] ?? '';
  const binary = binaryOf(command);
  return binary === '' ? 'unknown' : binary;
}

export interface MachineContextInput {
  /** The one machine wide ps table the capture already read. */
  rows: Iterable<ProcRow>;
  /**
   * Every pid Tortie owns: the app tree, the session server, the clients,
   * the agents and their children, the strays. None of them may enter
   * another group, or an agent would sit above Tortie as a stranger.
   */
  ownedPids: ReadonlySet<number>;
  /** What Tortie itself weighs: the Tortie table's resident total. */
  tortieRssBytes: number;
  /** How many names above Tortie the face may show. Default 3. */
  aboveLimit?: number;
}

/**
 * Group, rank, and answer. Null when the table was empty, which is the
 * ps failed case; the face then draws no sentence rather than a wrong one.
 */
export function buildMachineContext(
  input: MachineContextInput
): DiagnosticsMachineContext | null {
  const limit = input.aboveLimit ?? 3;
  const groups = new Map<string, number>();
  let sawAny = false;
  for (const row of input.rows) {
    sawAny = true;
    if (input.ownedPids.has(row.pid)) continue;
    const name = appNameOf(row.command);
    groups.set(name, (groups.get(name) ?? 0) + row.rssKb * 1024);
  }
  if (!sawAny) return null;
  const above: DiagnosticsMachineApp[] = [];
  for (const [name, rssBytes] of groups) {
    if (rssBytes > input.tortieRssBytes) above.push({ name, rssBytes });
  }
  above.sort((a, b) => b.rssBytes - a.rssBytes);
  return {
    rank: above.length + 1,
    appCount: groups.size + 1,
    tortieRssBytes: input.tortieRssBytes,
    above: above.slice(0, limit)
  };
}
