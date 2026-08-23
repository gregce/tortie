/**
 * Harness only (Phase 137). Inserts manifest rows for the Catch Me Up
 * photograph probe, read from the JSON file named by GMUX_OVERVIEW_SEED.
 *
 * WHY IT EXISTS. The overview page draws one line per session in the open
 * project, and the probe that photographs it needs sessions whose agent logs
 * are the committed fixtures. Creating real sessions would launch real
 * agents, which a probe never does. So the probe writes rows straight into
 * the ISOLATED profile's manifest, status 'restorable', argv the bare agent
 * name, and the page reads them the way it reads any restorable row.
 *
 * It is the second harness entry that writes manifest rows, after
 * ./durability.ts, and it uses the same insertSession the product uses.
 *
 * TWO REFUSALS, both hard.
 *
 *  1. The launch must be an isolated harness launch (GMUX_SMOKE or
 *     GMUX_SHOT). A seed variable left in a shell profile must never write
 *     into a person's real manifest.
 *  2. The profile directory must sit under the harness directory the runner
 *     handed us. A launch that points GMUX_OVERVIEW_SEED at the app while
 *     using the real profile is refused even when GMUX_SHOT is set.
 */

import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { ManifestSessionRecord } from '../manifest';
import { getGmuxCore } from '../sessions';
import { isIsolatedLaunch } from './launch-gate';

interface OverviewSeedRow {
  name: string;
  agent: string;
  agentSessionId: string | null;
  cwd: string;
  createdAt: number;
}

function real(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

/** Called by dispatchHarness in the GMUX_SHOT branch, before runShot. */
export async function seedOverviewSessions(): Promise<void> {
  const file = process.env['GMUX_OVERVIEW_SEED'] ?? '';
  if (file === '') return;
  if (!isIsolatedLaunch(process.env)) {
    throw new Error('GMUX_OVERVIEW_SEED refused: this launch is not an isolated harness launch.');
  }
  const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
  const userData = real(app.getPath('userData'));
  if (harnessDir === '' || !userData.startsWith(real(harnessDir))) {
    throw new Error(
      'GMUX_OVERVIEW_SEED refused: the profile directory is not under the harness directory, ' +
        'so this could be a real profile.'
    );
  }
  const rows = JSON.parse(await readFile(file, 'utf8')) as OverviewSeedRow[];
  const core = await getGmuxCore();
  for (const row of rows) {
    const record: ManifestSessionRecord = {
      id: randomUUID(),
      name: row.name,
      tmuxName: row.name,
      projectPath: row.cwd,
      cwd: row.cwd,
      agent: row.agent as ManifestSessionRecord['agent'],
      status: 'restorable',
      createdAt: row.createdAt,
      argv: [row.agent],
      lastSeen: row.createdAt
    };
    if (row.agentSessionId !== null) record.agentSessionId = row.agentSessionId;
    core.manifest.insertSession(record);
  }
}
