/**
 * Where Tortie's configuration directory is, and the only place that decides.
 *
 * ```
 * <userData>/gmux/config/
 *   agents.json          the file the user writes
 *   agents.schema.json   the generated JSON Schema, written by Tortie
 *   README.md            the guide, written by Tortie
 *   examples/            the worked examples, written by Tortie
 * ```
 *
 * ## Why it is inside `gmux/` and not next to settings.json
 *
 * `settings.json` sits directly in `<userData>`. The configuration directory
 * sits one level in, under `<userData>/gmux/`, which is where the skill pins
 * and the dropped image store already live. That inner directory name is one
 * of the identifiers live data is bound to, so it stays `gmux` and is not
 * "finished off" by a later rename. CLAUDE.md carries the full list and the
 * reasons.
 *
 * ## Tortie writes here, and nothing else does
 *
 * Research 31 section 6.3 rule 9. Tortie creates this directory and writes the
 * schema, the guide and the examples into it. It never writes `agents.json`
 * itself, because that file is the user's. Nothing in Tortie writes outside
 * this directory on account of a configuration file.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import {
  AGENT_OVERLAY_FILENAME,
  AGENT_OVERLAY_SCHEMA_FILENAME
} from '@shared/agent-overlay';

/**
 * The configuration directory.
 *
 * `userDataOverride` exists for the tests and for a harness that runs with its
 * own `--user-data-dir`. Nothing in the product passes it.
 */
export function configDir(userDataOverride?: string): string {
  const root = userDataOverride ?? app.getPath('userData');
  return join(root, 'gmux', 'config');
}

/** The examples directory Tortie writes on first creation. */
export function configExamplesDir(userDataOverride?: string): string {
  return join(configDir(userDataOverride), 'examples');
}

/** `<userData>/gmux/config/agents.json`. */
export function agentOverlayPath(userDataOverride?: string): string {
  return join(configDir(userDataOverride), AGENT_OVERLAY_FILENAME);
}

/** `<userData>/gmux/config/agents.schema.json`. */
export function agentOverlaySchemaPath(userDataOverride?: string): string {
  return join(configDir(userDataOverride), AGENT_OVERLAY_SCHEMA_FILENAME);
}

/**
 * Create the configuration directory when it is not there.
 *
 * Returns the path either way. It never throws, because a userData directory
 * Tortie cannot write to is a problem for the whole application rather than
 * something the agent table should crash on. A caller that needs to know gets
 * `false`.
 */
export function ensureConfigDir(userDataOverride?: string): {
  path: string;
  ready: boolean;
} {
  const path = configDir(userDataOverride);
  try {
    mkdirSync(path, { recursive: true });
    return { path, ready: true };
  } catch {
    return { path, ready: false };
  }
}
