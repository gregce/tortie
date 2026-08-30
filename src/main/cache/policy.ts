/**
 * The Chromium cache policy (Phase 166).
 *
 * WHAT WAS MEASURED BEFORE THIS WAS WRITTEN. Research 69, at
 * docs/research/69-cache-attribution.md, ran the shipped shape, where every
 * app resource is a `file:` URL and every project image is a `gmux-asset:`
 * URL, through thirty launches, five simulated version changes and five
 * openings of a document carrying 49 MB of local images. The HTTP cache and the code cache held zero bytes after every
 * one of them. Chromium's file loader and Electron's custom scheme loader
 * bypass the HTTP cache, and V8 writes a code cache entry only for http(s)
 * scripts unless a scheme declares `codeCache: true`, which none of Tortie's
 * schemes do. The packaged app therefore cannot have written the 1.14 GB the
 * audit found. The dev shape, where the renderer is served by vite over http,
 * is the one shape that writes: about 21 MB per fresh page, about 7 MB per
 * dependency re-optimization, and about 330 KB per hot edit, and the old
 * entries are never invalidated, so an agent rewriting renderer files under an
 * open dev window is what fills a profile.
 *
 * THE POLICY, AND WHY IT IS THIS NARROW. Nothing here deletes anything.
 * There is no cache clear, no retirement pass and no timer, because the
 * shipped shape has nothing to retire and the Phase 152 lesson forbids a
 * cleanup whose cost has not been measured. The one act is a ceiling on the
 * HTTP cache in the dev shape, through Chromium's own `--disk-cache-size`
 * switch, which Electron reads into the network context's
 * `http_cache_max_size` before the first browser context exists. Chromium
 * then evicts by its own rules inside that budget, on its own thread, as it
 * already does at its default ceiling. In every other shape the switch is not
 * appended and Chromium's defaults stand: 1,280 MiB for the HTTP cache and
 * 320 MiB for the code cache on this volume size (net/disk_cache/cache_util.cc
 * at Chrome 150, and both drop when the volume has under about 32 GB free).
 *
 * The code cache has no ceiling of its own here because none can be set:
 * Electron returns size 0 from GetGeneratedCodeCacheSettings, meaning
 * Chromium's heuristic, and no switch or API reaches it. The report line
 * says so instead of pretending.
 *
 * THE ONE ABSOLUTE. `<userData>/gmux` holds the manifest, arch.db, the
 * snapshots and the logs. It is durable state and this module never names
 * it, never reads it and cannot reach it. This module imports no file system
 * API at all, which build/assert-cache-policy-never-deletes.mjs pins.
 */

/** 1 MiB, so the numbers below read as the units Chromium's source uses. */
const MIB = 1024 * 1024;

/**
 * The dev shape ceiling. A fresh dev page is about 21 MB of vite modules, so
 * this keeps about six generations warm while ending the unbounded growth.
 */
export const DEV_HTTP_CACHE_CEILING_BYTES = 128 * MIB;

/**
 * What Chromium chooses on its own when no switch is given and the volume has
 * more than about 32 GB free. Reported, never applied, so a person reading
 * the diagnostics knows where the growth stops by itself.
 */
export const CHROMIUM_DEFAULT_HTTP_CACHE_CEILING_BYTES = 1280 * MIB;

/** The code cache ceiling Chromium picks by itself. Nothing can set it. */
export const CHROMIUM_CODE_CACHE_CEILING_BYTES = 320 * MIB;

/** The Chromium switch name. Bytes, and it applies to the HTTP cache only. */
export const DISK_CACHE_SIZE_SWITCH = 'disk-cache-size';

/**
 * The probe override, honoured in the dev shape only. A 128 MiB ceiling takes
 * hundreds of hot edits to reach, so a probe that must prove the switch
 * reaches Chromium sets this to a few MiB and watches the cache stop there.
 * It selects a number and nothing else. It is not for people.
 */
export const CEILING_OVERRIDE_ENV = 'GMUX_HTTP_CACHE_CEILING_BYTES';

export type CachePolicyMode = 'dev-ceiling' | 'chromium-default';

export interface CachePolicy {
  /** The ceiling this launch applies, or null when Chromium's default stands. */
  readonly httpCacheCeilingBytes: number | null;
  readonly mode: CachePolicyMode;
  /** One sentence a person can read in the log or the diagnostics report. */
  readonly reason: string;
}

/** The dev shape: an unpackaged launch whose renderer is served over http. */
export function isDevShape(env: NodeJS.ProcessEnv, isPackaged: boolean): boolean {
  return !isPackaged && (env['ELECTRON_RENDERER_URL'] ?? '') !== '';
}

/**
 * The override, when it is a whole positive number of bytes. Anything else,
 * including an empty string, a sign, a decimal point or a unit suffix, is
 * ignored so a typo can never set a ceiling of zero.
 */
export function parseCeilingOverride(raw: string | undefined): number | null {
  if (raw === undefined || !/^[1-9][0-9]{0,15}$/.test(raw)) return null;
  return Number(raw);
}

function mib(bytes: number): string {
  const whole = bytes / MIB;
  return `${Number.isInteger(whole) ? whole : whole.toFixed(2)} MiB`;
}

/**
 * Decide the policy for one launch. Pure: reads the record it is handed and
 * returns a value, so the unit test and the diagnostics report get the same
 * answer the boot got.
 */
export function cachePolicyFor(env: NodeJS.ProcessEnv, isPackaged: boolean): CachePolicy {
  if (!isDevShape(env, isPackaged)) {
    return {
      httpCacheCeilingBytes: null,
      mode: 'chromium-default',
      reason: isPackaged
        ? 'the packaged app serves every resource over file: and gmux-asset:, which Chromium never stores, so its default ceiling stands and is never reached'
        : 'the renderer is loaded from the built files, which Chromium never stores, so its default ceiling stands and is never reached'
    };
  }
  const override = parseCeilingOverride(env[CEILING_OVERRIDE_ENV]);
  const ceiling = override ?? DEV_HTTP_CACHE_CEILING_BYTES;
  const source =
    override === null
      ? `${mib(ceiling)} on the http cache`
      : `${mib(ceiling)} on the http cache from ${CEILING_OVERRIDE_ENV}`;
  return {
    httpCacheCeilingBytes: ceiling,
    mode: 'dev-ceiling',
    reason: `the renderer is served by the vite dev server over http, the one shape Chromium stores, so ${source}; the code cache cannot be capped and stays at Chromium's ${mib(CHROMIUM_CODE_CACHE_CEILING_BYTES)}`
  };
}

/** The slice of Electron's `app` this module touches. Structural, for tests. */
export interface CacheSwitchTarget {
  readonly isPackaged: boolean;
  readonly commandLine: {
    appendSwitch(name: string, value?: string): void;
  };
}

/** One line, whatever happened. */
export interface CachePolicyLog {
  info(msg: string, fields?: Record<string, unknown>): void;
}

/**
 * Apply the policy to one launch. Must run before `app.whenReady` resolves,
 * because Chromium reads the switch when it creates the first browser
 * context and never again. It appends one switch in the dev shape and
 * nothing in any other, and it writes exactly one log line either way, so
 * the app log always says what the cache ceiling was for this run.
 */
export function applyCachePolicy(
  app: CacheSwitchTarget,
  log: CachePolicyLog,
  env: NodeJS.ProcessEnv = process.env
): CachePolicy {
  const policy = cachePolicyFor(env, app.isPackaged);
  if (policy.mode === 'dev-ceiling' && policy.httpCacheCeilingBytes !== null) {
    app.commandLine.appendSwitch(DISK_CACHE_SIZE_SWITCH, String(policy.httpCacheCeilingBytes));
  }
  log.info(`cache policy: ${policy.mode}, ${policy.reason}`, {
    mode: policy.mode,
    httpCacheCeilingBytes: policy.httpCacheCeilingBytes,
    chromiumDefaultHttpCacheCeilingBytes: CHROMIUM_DEFAULT_HTTP_CACHE_CEILING_BYTES,
    codeCacheCeilingBytes: CHROMIUM_CODE_CACHE_CEILING_BYTES
  });
  return policy;
}
