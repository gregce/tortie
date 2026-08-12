/**
 * SpecStory status + auth actions for Settings → SpecStory (Phase 15,
 * research docs/research/13-specstory-integration.md §3.4).
 *
 * WHERE IT LIVES. Under src/main/specstory, with the capture stream whose
 * answers it reports. It spent Phase 15 under src/main/settings — its only
 * consumer is the Settings window, and writing it there is what let two
 * parallel builders finish without touching the same folder twice — and
 * Phase 16 (L2) moved it back verbatim once that blocker was fifteen phases
 * gone. Only the imports, this paragraph and the filename changed.
 *
 * HOW IT READS THE TRUTH — and every piece of it is BORROWED, not rebuilt:
 *
 *   account   src/main/specstory/auth.ts — the one cached reader of
 *             `~/.specstory/cli/auth.json`, evaluated by the shared rule in
 *             src/shared/specstory-status.ts (which mirrors the CLI's own
 *             `cloud.IsAuthenticated`). There IS no `specstory whoami` to
 *             call, and a spawn per render would be absurd for a fact that
 *             changes twice a year.
 *   binary    the capture stream's resolver (src/main/specstory/resolve.ts),
 *             which caches its answer for the app's life; Settings therefore
 *             reports the exact binary a capture would run, and re-resolves
 *             only when a caller passes `refresh`.
 *   paths     `specstoryAuthPath()` / `specstoryEnv()`, same module. This file
 *             carried its own copies of both through the parallel build; they
 *             are gone. Two answers to "where is auth.json" is a bug waiting
 *             for the day they disagree, and a spawn env assembled here could
 *             have written to a different home than the reader reads.
 *
 * SIGN-IN WITHOUT A SESSION TO CLEAN UP. `specstory login` is interactive, but
 * only in the sense that a human must fetch a 6-character code from a browser:
 * it reads that code with `bufio.NewReader(os.Stdin)` (pkg/cmd/login.go:105),
 * so a pipe drives it exactly as a TTY does. gmux therefore runs the device
 * flow inside the Settings row — instead of spawning a durable tmux session
 * for a thirty-second errand and leaving its corpse in the session list. The
 * private API (`/api/v1/device-login`) stays entirely inside the CLI, which is
 * the coupling the research warned against reimplementing. The child's
 * lifetime — one process for the whole flow, because the CLI opens the browser
 * itself — lives in ./login.ts; that file's header has the measured
 * reason it is shaped that way.
 *
 * VERIFICATION OVERRIDE. `GMUX_SPECSTORY_HOME` stands in for `$HOME` for both
 * halves — the auth.json gmux reads and the `HOME` a spawned CLI writes to.
 * It exists so the signed-out state can be photographed and the login/logout
 * paths exercised against a scratch config, and it is the reason no
 * verification of this section has to touch the user's real cloud session.
 * It is implemented ONCE, in src/main/specstory/resolve.ts, so the reader and
 * the writer cannot be pointed at different directories.
 */

import type { IpcMain } from 'electron';
import type {
  SpecStoryAuthActionResult,
  SpecStoryBinaryInfo,
  SpecStoryLoginStart,
  SpecStoryStatus
} from '@shared/specstory-status';
import {
  defaultCaptureAgents,
  distillCliMessage,
  normalizeSpecStoryDeviceCode
} from '@shared/specstory-status';
import { runGuarded } from '../proc/guarded';
import { handle } from '../typed-ipc';
import { invalidateAuthCache, readAuthFacts } from './auth';
import { captureMatrix, resetProviderCache, type CaptureMatrix } from './capture';
import {
  cancelLoginSession,
  startLoginSession,
  submitLoginCode
} from './login';
import {
  NO_VERSION_CHECK,
  resetSpecstoryResolutionCache,
  resolveSpecstory,
  specstoryAuthPath,
  specstoryEnv
} from './resolve';

/** The CLI's own precedence: SPECSTORY_CLOUD_URL, else production. */
function cloudBaseUrl(): string {
  const override = process.env['SPECSTORY_CLOUD_URL'];
  return override !== undefined && override.length > 0
    ? override.replace(/\/+$/, '')
    : 'https://cloud.specstory.com';
}

// ---------------------------------------------------------------------------
// Binary resolution
// ---------------------------------------------------------------------------

/** What the resolver found: the copy that runs, and every copy that does not. */
export interface SpecStoryBinaryReading {
  /** The copy a capture would run; null when there is none. */
  active: SpecStoryBinaryInfo | null;
  /**
   * Every OTHER copy found. There is rarely none: this Mac has three, at
   * 2.5.0, 2.6.0 and 2.8.0 (docs/research/30 §0.2), and the one that wins
   * `command -v` in the user's own terminal is the OLDEST of them. A Settings
   * panel that shows a single version cannot be reconciled with that.
   */
  others: SpecStoryBinaryInfo[];
}

/**
 * How Settings learns which copy of specstory a capture would run.
 *
 * The wiring (see {@link defaultSpecStoryStatusDeps}) delegates to the capture
 * stream's own resolver, so Settings and a real capture can never name
 * different binaries. The interface stays because it is the TEST SEAM — it is
 * what lets this registrar be exercised without a CLI on the machine.
 *
 * There is deliberately no second resolver behind it any more. This file
 * carried one through the parallel build ("bundled candidates, then PATH"),
 * which is the same rule src/main/specstory/resolve.ts implements — and a
 * fallback that can name a DIFFERENT binary than the one a capture will spawn
 * is worse than a Settings panel that says "not available" for the seconds a
 * real failure lasts.
 *
 * Each half owns its own cache, and `refresh` — the Settings re-check button —
 * drops both: the resolution and the provider probe are cached separately, and
 * a re-check that dropped only the first would re-resolve to an upgraded
 * binary and still report the old one's provider list.
 */
export interface SpecStoryStatusDeps {
  /** Resolve the binary a capture would run, and everything else on disk. */
  resolveBinary(refresh: boolean): Promise<SpecStoryBinaryReading>;
  /** Capturable agents, blocked agents with reasons, and the probed providers. */
  captureMatrix(refresh: boolean): Promise<CaptureMatrix> | CaptureMatrix;
}

let binaryCache: SpecStoryBinaryReading | null = null;

async function resolveBinaryInfo(
  deps: SpecStoryStatusDeps,
  refresh: boolean
): Promise<SpecStoryBinaryReading> {
  if (binaryCache !== null && !refresh) return binaryCache;
  binaryCache = await deps.resolveBinary(refresh);
  return binaryCache;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

async function buildStatus(
  deps: SpecStoryStatusDeps,
  refresh: boolean
): Promise<SpecStoryStatus> {
  const binaries = await resolveBinaryInfo(deps, refresh);
  const matrix = await deps.captureMatrix(refresh);
  return {
    binary: binaries.active,
    otherBinaries: binaries.others,
    auth: readAuthFacts(),
    captureAgents: matrix.supported,
    blockedCaptureAgents: matrix.blocked,
    providers: matrix.providers,
    providerSource: matrix.providerSource,
    loginUrl: `${cloudBaseUrl()}/cli-login`,
    authPath: specstoryAuthPath()
  };
}

// ---------------------------------------------------------------------------
// Auth actions
// ---------------------------------------------------------------------------

/** `specstory logout` is a one-shot: revoke, delete the file, exit. */
const LOGOUT_TIMEOUT_MS = 30_000;

/**
 * Begin the device flow: start ONE `specstory login`, which opens the browser
 * itself and then blocks reading its stdin. gmux does NOT open the page too —
 * see src/main/specstory/login.ts for the double-tab this avoids.
 */
async function beginLogin(
  deps: SpecStoryStatusDeps
): Promise<SpecStoryLoginStart> {
  const url = `${cloudBaseUrl()}/cli-login`;
  const status = await buildStatus(deps, false);
  if (status.binary === null) return { url, opened: false };
  const start = startLoginSession(status.binary.path, await specstoryEnv());
  return { url, opened: start.started };
}

/**
 * Finish it: the code goes to the CLI that is already waiting for it. A
 * rejected code leaves that CLI at its next prompt, so `ok: false` here is an
 * invitation to retype rather than a dead end.
 */
async function finishLogin(
  deps: SpecStoryStatusDeps,
  rawCode: string
): Promise<SpecStoryAuthActionResult> {
  const code = normalizeSpecStoryDeviceCode(rawCode);
  if (code === null) {
    return {
      ok: false,
      message: 'That is not a 6-character code — check the browser page.',
      status: await buildStatus(deps, false)
    };
  }

  const outcome = await submitLoginCode(code, () => {
    invalidateAuthCache();
    return readAuthFacts().signedIn;
  });
  invalidateAuthCache();
  const after = await buildStatus(deps, false);
  if (outcome.ok) return { ok: true, message: null, status: after };
  if (outcome.expired) {
    return {
      ok: false,
      message: 'That sign-in has closed — press Sign in to start again.',
      status: after
    };
  }
  const detail = outcome.message ?? 'SpecStory rejected the code.';
  return {
    ok: false,
    message: `${detail} Codes expire quickly — get a fresh one and try again.`,
    status: after
  };
}

async function signOut(
  deps: SpecStoryStatusDeps
): Promise<SpecStoryAuthActionResult> {
  const status = await buildStatus(deps, false);
  if (status.binary === null) {
    return { ok: false, message: 'SpecStory is not available in this build.', status };
  }
  // `--force` IS REQUIRED, and it is not a shortcut. Without it `logout` asks
  // the terminal to type "yes" (pkg/cmd/logout.go:52-66) and a spawn with no
  // stdin gets EOF, so the CLI aborts and the user stays signed in while gmux
  // reports nothing useful — MEASURED, in exactly that shape, before this flag
  // was added: the row kept saying "Signed in as …" under the red line
  // "Failed to read confirmation: EOF." The confirmation still happens; it
  // happens in the Settings row, where the user already pressed Sign out
  // twice, which is the whole reason a second prompt in a pipe is nonsense.
  const run = await runGuarded(
    status.binary.path,
    ['logout', '--force', NO_VERSION_CHECK],
    { timeoutMs: LOGOUT_TIMEOUT_MS, env: await specstoryEnv() }
  );
  invalidateAuthCache();
  const after = await buildStatus(deps, false);
  if (!after.auth.signedIn) return { ok: true, message: null, status: after };
  return {
    ok: false,
    message:
      distillCliMessage(run.stdout, run.stderr) ??
      'SpecStory could not sign out — try again.',
    status: after
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * THE wiring: the capture stream's own resolver and its own capturable-agent
 * list, so Settings can only ever name the binary a capture would actually
 * run. Both are cached inside src/main/specstory — asking twice is cheap, and
 * asking THEM rather than re-deriving is what keeps the two answers identical.
 *
 * Each half degrades on its own. A resolver that throws leaves the section
 * saying "SpecStory isn't available" (true enough — nothing would capture);
 * a provider probe that throws falls back to the verified §1.1 table, so the
 * capture-defaults list is still drawn.
 */
export function defaultSpecStoryStatusDeps(): SpecStoryStatusDeps {
  return {
    resolveBinary: async (refresh) => {
      if (refresh) resetSpecstoryResolutionCache();
      try {
        const { active, copies } = await resolveSpecstory();
        return {
          active:
            active === null
              ? null
              : { path: active.path, version: active.version, source: active.source },
          others: copies
            .filter((c) => c.path !== active?.path)
            .map((c) => ({ path: c.path, version: c.version, source: c.source }))
        };
      } catch {
        // The resolver never rejects by contract ("no specstory" is
        // `active: null`), so this is the impossible branch. It reports
        // "not available", which is the truthful reading — NOT a second
        // resolution that could name a binary a capture would not use.
        return { active: null, others: [] };
      }
    },
    captureMatrix: async (refresh) => {
      // Each half of the re-check drops its OWN cache. The provider list is
      // cached separately from the resolution, and dropping only the latter
      // was the shape that let a `brew upgrade` while Tortie is open
      // re-resolve to the new binary and still report the OLD binary's
      // provider list (docs/research/30 §4.7 gap 1). A re-check that
      // half-checks is worse than none: the user now believes the number.
      if (refresh) resetProviderCache();
      try {
        const matrix = await captureMatrix();
        if (matrix.supported.length > 0 || matrix.blocked.length > 0) return matrix;
      } catch {
        /* fall through to the table below */
      }
      // The probe stream threw, or answered nothing at all. The renderer still
      // gets a list — the measured §1.1 table — and is told it is a fallback.
      return {
        supported: defaultCaptureAgents(),
        blocked: [],
        providers: [],
        providerSource: 'fallback'
      };
    }
  };
}

/**
 * Register `specstory:*`. Called by registerSettingsIpc; pass `deps` to hand
 * the real resolver in without touching anything else.
 */
export function registerSpecStoryStatusIpc(
  ipc: IpcMain,
  deps: SpecStoryStatusDeps = defaultSpecStoryStatusDeps()
): void {
  handle(ipc, 'specstory:status', (_e, refresh) =>
    buildStatus(deps, refresh === true)
  );

  handle(ipc, 'specstory:beginLogin', () => beginLogin(deps));

  handle(ipc, 'specstory:submitCode', (_e, code) => finishLogin(deps, code));

  // Cancel is a real verb, not a UI state: it kills the `specstory login` the
  // Sign in button started, so closing the row cannot leave a process sitting
  // on a pipe for ten minutes.
  handle(ipc, 'specstory:cancelLogin', () => {
    cancelLoginSession();
  });

  handle(ipc, 'specstory:signOut', () => signOut(deps));
}
