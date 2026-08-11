/**
 * IS THIS MAC SIGNED IN TO SPECSTORY CLOUD — read from the file, once, cached.
 *
 * ## Why it is a file and not a spawn
 *
 * specstory-cli has no `whoami` and no `status` command (the full verb list is
 * check/help/list/login/logout/reindex/resume/run/search/skills/sync/version/
 * watch). Its own `cloud.IsAuthenticated()` reads `~/.specstory/cli/auth.json`
 * and nothing else, so gmux reads the same file and applies the same rule —
 * which lives in @shared/specstory-status because the Settings renderer draws
 * conclusions from the same facts. A subprocess per render, for a fact that
 * changes about twice a year, would be absurd.
 *
 * ## Why it lives HERE and not in settings/
 *
 * It was written under src/main/settings, next to its first caller. Two
 * callers later that was the wrong home: the session-end sync
 * (./sync.ts) needs the same answer to decide whether a flush could have
 * reached the cloud, and importing it from settings/ made
 * `specstory → settings → specstory` a real import cycle. The auth file is a
 * fact about SpecStory, not about the Settings window, so it sits beside the
 * resolver that owns every other "where does SpecStory keep its state"
 * question — {@link specstoryAuthPath} is the only path computation, including
 * the GMUX_SPECSTORY_HOME verification override.
 */

import { readFileSync, statSync } from 'node:fs';
import type { SpecStoryAuthFacts } from '@shared/specstory-status';
import { evaluateSpecStoryAuth, signedOutFacts } from '@shared/specstory-status';
import { specstoryAuthPath } from './resolve';

interface AuthCache {
  path: string;
  mtimeMs: number;
  size: number;
  facts: SpecStoryAuthFacts;
}

let authCache: AuthCache | null = null;
/** The last parsed auth.json, kept so an expiry re-check needs no read. */
let cachedRaw: unknown = null;

function reEvaluateCached(nowMs: number): SpecStoryAuthFacts {
  const facts = evaluateSpecStoryAuth(cachedRaw, nowMs);
  if (authCache !== null) authCache.facts = facts;
  return facts;
}

/** Drop the cache — used after login/logout, which rewrite the file. */
export function invalidateAuthCache(): void {
  authCache = null;
  cachedRaw = null;
}

/**
 * Current account facts. A missing file is the normal signed-out state, an
 * unreadable or malformed one is treated the same way the CLI treats it —
 * signed out — because a token we cannot parse is a token we cannot use.
 *
 * Cached against the file's mtime+size, so a re-read after an action costs one
 * stat when nothing moved.
 */
export function readAuthFacts(nowMs: number = Date.now()): SpecStoryAuthFacts {
  const path = specstoryAuthPath();
  let stat: { mtimeMs: number; size: number };
  try {
    const s = statSync(path);
    stat = { mtimeMs: s.mtimeMs, size: s.size };
  } catch {
    authCache = null;
    return signedOutFacts();
  }
  // The cached evaluation is re-run rather than reused: `signedIn` depends on
  // the clock, and an access token expires while the file sits still.
  if (
    authCache !== null &&
    authCache.path === path &&
    authCache.mtimeMs === stat.mtimeMs &&
    authCache.size === stat.size
  ) {
    return authCache.facts.signedIn === false
      ? authCache.facts
      : reEvaluateCached(nowMs);
  }
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    parsed = null;
  }
  cachedRaw = parsed;
  const facts = evaluateSpecStoryAuth(parsed, nowMs);
  authCache = { path, ...stat, facts };
  return facts;
}
