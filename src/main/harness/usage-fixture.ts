/**
 * Harness only (Phase 202). Answers the usage meter from a FILE instead of
 * from the vendor, and refuses the keychain outright, so a probe can drive the
 * whole login matrix without a token and without a request.
 *
 * WHY IT EXISTS. Everything Phase 202 has to prove about the meter is about
 * WHICH LOGIN it reads: that a switch is followed within one poll, that a
 * second login's numbers are the second login's, that a stale snapshot is
 * marked, and that a post from another login is dropped. None of that needs a
 * real subscription, and driving it against one would spend the operator's own
 * quota on every re-run and put his token in a process the probe owns.
 *
 * SO THE PROBE'S APP READS NO CREDENTIAL OF HIS AT ALL. The keychain answer is
 * refused, and the only credentials that exist are synthetic files the probe
 * wrote into directories the probe made. His keychain item and `~/.codex` are
 * never opened by a launch that carries this knob.
 *
 * TWO REFUSALS, both hard, and both the ones ./fold-stub.ts carries.
 *
 *  1. The launch must be an isolated harness launch (GMUX_SMOKE or GMUX_SHOT).
 *     A `GMUX_USAGE_FIXTURE` left in a shell profile must never reach a
 *     person's real app: it would draw numbers nobody's vendor served.
 *  2. The profile directory must sit under the harness directory the runner
 *     handed us.
 *
 * When either fires the override is not installed and the meter reads the
 * vendor exactly as it always does.
 *
 * THE FILE'S SHAPE. One object, keyed by provider, then by the login DIRECTORY
 * the read was made for, with the empty string standing for the default login:
 *
 * ```json
 * { "claude": { "": { "status": 200, "body": { … } },
 *               "/tmp/x/logins/claude/aa": { "status": 200, "body": { … } } } }
 * ```
 *
 * A directory the file does not name answers 404, which the service reads as
 * unavailable. Nothing in the file can name a HOST: the two destinations are
 * still the frozen constants in src/main/usage/endpoints.ts and this override
 * never sees them, because it replaces the transport rather than its address.
 */

import { app } from 'electron';
import { readFileSync } from 'node:fs';
import { setUsageHarnessOverride } from '../usage/ipc';
import {
  defaultLoginAccountDeps,
  setLoginAccountDeps
} from '../usage/login-accounts';
import type { UsageRequest, UsageResponse } from '../usage/transport';
import { isInside } from './fold-stub';
import { isIsolatedLaunch } from './launch-gate';

/** The knob's own path, or null when this launch may not use it. */
export function usageFixturePath(
  env: NodeJS.ProcessEnv,
  userDataDir: string
): string | null {
  const path = env['GMUX_USAGE_FIXTURE'] ?? '';
  if (path === '') return null;
  // THE FIRST REFUSAL, in its three terms. `GMUX_PROBES=1` is here beside the
  // two isolated modes because the Phase 202 probe drives a WINDOW rather than
  // a screenshot: it opens the app, chooses logins and reads the card, which
  // no `GMUX_SHOT` run can do, and `GMUX_SMOKE` owns the process and exits.
  // It is the exact term `probesRequested` reads for arming the drives, so a
  // launch that gets this fixture is a launch that got the drive that uses it.
  if (!isIsolatedLaunch(env) && env['GMUX_PROBES'] !== '1') return null;
  const harnessDir = env['GMUX_HARNESS_DIR'] ?? '';
  if (harnessDir === '') return null;
  if (!isInside(userDataDir, harnessDir)) return null;
  return path;
}

/**
 * Which login a request was made for, read back out of the request itself.
 *
 * THE TRANSPORT NEVER SEES A DIRECTORY, and this is the honest way round that:
 * the fixture keys on the bearer the credential reader found, and the probe
 * writes a DIFFERENT synthetic bearer into each login's own credentials file.
 * So the arm the fixture answers for is decided by which file was read, which
 * is exactly the thing under test.
 */
function keyOf(req: UsageRequest): string {
  const auth = req.headers['authorization'] ?? req.headers['Authorization'] ?? '';
  return auth.replace(/^Bearer\s+/, '');
}

/** Install the override. Called once from the boot, before the first read. */
export function installUsageFixture(): void {
  const path = usageFixturePath(process.env, app.getPath('userData'));
  if (path === null) return;
  // SAID OUT LOUD, because the probe has to be able to WAIT for it. A run that
  // turned a meter on before this line would ask the person's own keychain,
  // and a probe cannot tell that apart from a fixture that answered nothing.
  // So the probe reads this line off the child's output and refuses to arm a
  // meter until it has. It names no token: the fixture holds none.
  console.log('[gmux] usage fixture installed, the vendor is a file');
  // PHASE 203. The login list asks the keychain too, so the same refusal is
  // installed there. Under this knob a probe's app opens NO keychain at all,
  // for the meter or for the list, and the only credentials that exist are the
  // synthetic files the probe wrote into directories the probe made. Every
  // other seam stays the shipped one, so what the list reads is real files
  // through the real reader.
  setLoginAccountDeps({ ...defaultLoginAccountDeps(), keychainHas: async () => false });
  setUsageHarnessOverride({
    // NO KEYCHAIN, EVER, under this knob. A miss is what the reader is
    // designed for: it falls through to the credentials file, which is the
    // only place a fixture login has anything.
    keychain: async () => null,
    transport: async (req: UsageRequest): Promise<UsageResponse> => {
      let bag: Record<string, { status?: number; body?: unknown }> = {};
      try {
        const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
        if (parsed !== null && typeof parsed === 'object') {
          bag = parsed as Record<string, { status?: number; body?: unknown }>;
        }
      } catch {
        bag = {};
      }
      // A VENDOR THAT ANSWERS SLOWLY, which is the one thing a probe cannot
      // arrange from outside and the one the stale rule is about: the moment
      // between a person choosing a login and the new numbers landing. The
      // delay is a number in the same file, so the probe can open that window
      // as wide as it needs and close it again.
      const delayMs = Number((bag as Record<string, unknown>)['__delayMs'] ?? 0);
      if (Number.isFinite(delayMs) && delayMs > 0) {
        await new Promise<void>((r) => setTimeout(r, Math.min(delayMs, 10_000)));
      }
      const row = bag[keyOf(req)];
      if (row === undefined) {
        return { status: 404, body: '', retryAfterAt: null };
      }
      return {
        status: row.status ?? 200,
        body: JSON.stringify(row.body ?? {}),
        retryAfterAt: null
      };
    }
  });
}
