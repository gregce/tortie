/**
 * The alerts' harness override (Phase 316.5, build/p3165/SPEC.md §5.2.4): a
 * harness launch aims the phone alerts at Phase 314's loopback stand-in and
 * chooses a scratch key without a panel, and NOTHING ELSE CAN.
 *
 * ## The shape
 *
 * `GMUX_HARNESS_ALERTS=<dir>` names a directory holding one file,
 * `<dir>/alerts.json`, read ONCE:
 *
 *     { "origins": { "development": "http://127.0.0.1:<port>",
 *                    "production":  "http://127.0.0.1:<port>" },
 *       "keyFile": "<dir>/AuthKey_P3165SCRAT.p8" }
 *
 * `keyFile` may be absent or null. Every other key, a missing origin, and an
 * origin or a key file of any other shape REFUSE THE WHOLE FILE: a half-read
 * override is an arm a probe cannot name.
 *
 * ## The refusals
 *
 * The push seam's own four, read through the push seam's ONE function rather
 * than written again, so they cannot drift apart: an isolated launch or an
 * armed probe run; a harness directory holding the profile; `<dir>` inside it;
 * and Chromium's mock keychain. Then every origin must be the push seam's one
 * origin shape (`isSeamOrigin`: `http://127.0.0.1:<port>` and nothing else),
 * and `keyFile`, when present, an absolute path inside `GMUX_HARNESS_DIR`, so
 * the override reads no file of the person's.
 *
 * In every ordinary launch the variable is unset and this answers null on its
 * first line. And a harness launch with NO override can reach nothing either:
 * the one sender in `../alerts/index.ts` is built with `allowRemote` false in
 * every harness launch, so it refuses Apple's hosts before any socket.
 *
 * `./push-seam.ts` is imported, never edited: editing it would owe
 * `probe:p314`, whose real agents this phase may not start.
 */

import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { ApnsEnvironment } from '../push/apns';
import { isInside } from './fold-stub';
import { isSeamOrigin, pushSeamDir } from './push-seam';

/** The one file the override reads, inside its directory. */
export const ALERTS_OVERRIDE_FILE = 'alerts.json';

export interface AlertsHarnessOverride {
  readonly origins: Readonly<Record<ApnsEnvironment, string>>;
  readonly keyFile: string | null;
}

/**
 * Read one override file's text against the harness directory, or null when
 * any of it is refused. Exported for `__tests__/alerts-override.test.ts`.
 */
export function parseAlertsOverride(text: string, harnessDir: string): AlertsHarnessOverride | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const top = parsed as Record<string, unknown>;
  for (const name of Object.keys(top)) {
    if (name !== 'origins' && name !== 'keyFile') return null;
  }

  const origins = top['origins'];
  if (origins === null || typeof origins !== 'object' || Array.isArray(origins)) return null;
  const o = origins as Record<string, unknown>;
  if (Object.keys(o).sort().join(',') !== 'development,production') return null;
  const development = o['development'];
  const production = o['production'];
  if (!isSeamOrigin(development) || !isSeamOrigin(production)) return null;

  const named = top['keyFile'];
  let keyFile: string | null = null;
  if (named !== undefined && named !== null) {
    if (typeof named !== 'string' || named.length === 0) return null;
    if (harnessDir === '' || !isAbsolute(named) || !isInside(named, harnessDir)) return null;
    keyFile = named;
  }

  return { origins: { development, production }, keyFile };
}

/**
 * The override this launch may use, or null. `mockKeychain` is a FUNCTION so a
 * launch whose variable is unset asks Electron nothing at all.
 */
export function alertsHarnessOverride(
  env: NodeJS.ProcessEnv,
  userDataDir: string,
  mockKeychain: () => boolean
): AlertsHarnessOverride | null {
  if ((env['GMUX_HARNESS_ALERTS'] ?? '') === '') return null;
  // THE PUSH SEAM'S FOUR REFUSALS, through its one function.
  const dir = pushSeamDir({ ...env, GMUX_HARNESS_PUSH: env['GMUX_HARNESS_ALERTS'] ?? '' }, userDataDir, mockKeychain);
  if (dir === null) return null;
  let text: string;
  try {
    text = readFileSync(join(dir, ALERTS_OVERRIDE_FILE), 'utf8');
  } catch {
    return null;
  }
  return parseAlertsOverride(text, env['GMUX_HARNESS_DIR'] ?? '');
}
