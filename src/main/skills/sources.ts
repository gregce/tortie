/**
 * The source layer: the three HTTP reads that have to happen BEFORE anything is
 * installed.
 *
 * ## Why this is not in the CLI wrapper
 *
 * Every write goes through the bundled `skills` CLI. None of these is a write.
 * `skills find` is not used for discovery because it has no `--json` and it
 * posts the user's query string to a third party, so discovery is
 * `GET skills.sh/api/search` directly. The audit endpoint has no CLI surface at
 * all. And the body read is Tortie's own, because requirement 4 of this phase
 * says the executable-content scan is SHOWN BEFORE the install control, and the
 * only way to scan a `SKILL.md` before installing it is to read it before
 * installing it.
 *
 * ## The three calls
 *
 *   search   GET <api>/api/search?q=&limit=[&owner=]
 *            {"query","searchType","count","skills":[{id,skillId,name,installs,source}]}
 *   audit    GET <download>/audit?source=<owner/repo>&skills=<a,b>
 *            {"<slug>":{"ath":{risk,analyzedAt},"socket":{risk,alerts,score,…},…}}
 *   preview  GitHub: one tree listing to find the SKILL.md, one raw read to get
 *            it, and one commit read so the card can name what it resolved.
 *
 * Both hosts honour the CLI's own overrides, `SKILLS_API_URL` and
 * `SKILLS_DOWNLOAD_URL`, so bring-your-own-source costs nothing here. The
 * GitHub calls honour `GH_TOKEN` / `GITHUB_TOKEN` from the recovered login
 * environment, which is both how a private source is reached and how the
 * unauthenticated rate limit stops being 60 an hour.
 *
 * ## Four rules
 *
 * 1. **Nothing here executes anything.** These are reads. The scan that runs
 *    over the body is a regular expression in the renderer.
 * 2. **Every failure is a sentence, never a throw.** A refused fetch is a state
 *    the preview card renders, and a preview that could not be read is a HARD
 *    refusal in the install gate: Tortie does not install what it could not
 *    read.
 * 3. **Every response is bounded.** A deadline per call and a byte cap per
 *    body, because these are third-party endpoints and one that never answers
 *    must not hold a modal open forever.
 * 4. **Nothing here is trusted text.** Names, descriptions and bodies are
 *    attacker-controlled and are rendered as plain text by the surface that
 *    shows them. This module does no parsing of markdown and no HTML at all.
 */

import { skillsEnv, type SkillsEnvOptions } from './resolve';

// ---------------------------------------------------------------------------
// Bounds
// ---------------------------------------------------------------------------

/** One call's deadline. The CLI's own audit client uses about three seconds. */
const CALL_TIMEOUT_MS = 8_000;
/** A SKILL.md that big is not a skill. Reading more buys the reader nothing. */
const MAX_BODY_BYTES = 512 * 1024;
/** The tree listing of a large monorepo. Beyond this the source is not previewable. */
const MAX_JSON_BYTES = 4 * 1024 * 1024;
/** Search results shown at once. The panel is a sidebar, not a storefront. */
export const SEARCH_LIMIT_DEFAULT = 10;

export const SKILLS_API_DEFAULT = 'https://skills.sh';
export const SKILLS_DOWNLOAD_DEFAULT = 'https://add-skill.vercel.sh';
const GITHUB_API = 'https://api.github.com';
const GITHUB_RAW = 'https://raw.githubusercontent.com';

/** `owner/repo`, and nothing that could climb out of it. */
const OWNER_REPO = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

// ---------------------------------------------------------------------------
// Wire shapes
// ---------------------------------------------------------------------------
//
// DECLARED IN `src/shared/skills.ts` and re-exported here, the same way the
// plan, the refusal and the result are. All of them cross IPC, and one
// declaration is what stops the two ends drifting.

export type {
  SkillAuditResult,
  SkillPreviewResult,
  SkillScannerResult,
  SkillSearchHit,
  SkillSearchResult
} from '@shared/skills';

import type {
  SkillAuditResult,
  SkillPreviewResult,
  SkillScannerResult,
  SkillSearchHit,
  SkillSearchResult
} from '@shared/skills';

// ---------------------------------------------------------------------------
// Fetching, bounded
// ---------------------------------------------------------------------------

export interface SourceContext {
  readonly env?: SkillsEnvOptions;
  /** Verification seam: shorten the per-call deadline. Never lengthen it. */
  readonly shortenTimeoutMs?: number;
  /** Injected by the tests. Production uses the global fetch. */
  readonly fetchImpl?: typeof fetch;
}

interface Fetched {
  ok: boolean;
  status: number;
  text: string;
  problem: string | null;
}

async function get(
  url: string,
  headers: Record<string, string>,
  maxBytes: number,
  context: SourceContext
): Promise<Fetched> {
  const call = context.fetchImpl ?? globalThis.fetch;
  if (typeof call !== 'function') {
    return { ok: false, status: 0, text: '', problem: 'This build cannot make network requests.' };
  }
  const timeout =
    context.shortenTimeoutMs === undefined
      ? CALL_TIMEOUT_MS
      : Math.min(CALL_TIMEOUT_MS, Math.max(1, context.shortenTimeoutMs));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await call(url, { headers, signal: controller.signal, redirect: 'follow' });
    const text = await response.text();
    if (text.length > maxBytes) {
      return {
        ok: false,
        status: response.status,
        text: '',
        problem: `${url} answered with more than ${Math.round(maxBytes / 1024)} KB, so Tortie stopped reading it.`
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        text,
        problem: `${url} answered ${response.status}.`
      };
    }
    return { ok: true, status: response.status, text, problem: null };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      text: '',
      problem: aborted
        ? `${url} did not answer within ${Math.round(timeout / 1000)} seconds.`
        : `${url} could not be reached. ${err instanceof Error ? err.message : String(err)}`
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** The base the user's own environment points at, or the published default. */
async function bases(context: SourceContext): Promise<{ api: string; download: string; token: string | null }> {
  const env = await skillsEnv(context.env ?? {});
  const strip = (value: string | undefined, fallback: string): string =>
    value !== undefined && value.length > 0 ? value.replace(/\/+$/, '') : fallback;
  const token = env['GH_TOKEN'] ?? env['GITHUB_TOKEN'] ?? null;
  return {
    api: strip(env['SKILLS_API_URL'], SKILLS_API_DEFAULT),
    download: strip(env['SKILLS_DOWNLOAD_URL'], SKILLS_DOWNLOAD_DEFAULT),
    token: token !== null && token.length > 0 ? token : null
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * `GET <api>/api/search`. The documented `/api/v1/*` endpoints need a Vercel
 * OIDC token and answer 401; this is the one the CLI itself uses, and it is
 * unauthenticated.
 */
export async function searchSkills(
  query: string,
  options: { limit?: number; owner?: string } = {},
  context: SourceContext = {}
): Promise<SkillSearchResult> {
  const q = query.trim();
  if (q === '') return { query: q, hits: [], problem: null };

  const { api } = await bases(context);
  const limit = Math.min(50, Math.max(1, options.limit ?? SEARCH_LIMIT_DEFAULT));
  const url = new URL(`${api}/api/search`);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit));
  if (options.owner !== undefined && options.owner.length > 0) {
    url.searchParams.set('owner', options.owner);
  }

  const answer = await get(url.toString(), { accept: 'application/json' }, MAX_JSON_BYTES, context);
  if (!answer.ok) return { query: q, hits: [], problem: answer.problem };

  const parsed = parseJson(answer.text);
  const rows = (parsed as { skills?: unknown })?.skills;
  if (!Array.isArray(rows)) {
    return {
      query: q,
      hits: [],
      problem: 'The search service answered in a shape Tortie does not recognise.'
    };
  }

  const hits: SkillSearchHit[] = [];
  for (const row of rows) {
    if (typeof row !== 'object' || row === null) continue;
    const record = row as Record<string, unknown>;
    const name = typeof record['name'] === 'string' ? record['name'] : null;
    const source = typeof record['source'] === 'string' ? record['source'] : null;
    if (name === null || source === null || !OWNER_REPO.test(source)) continue;
    hits.push({
      id: typeof record['id'] === 'string' ? record['id'] : `${source}/${name}`,
      name,
      source,
      installs: typeof record['installs'] === 'number' ? record['installs'] : null
    });
  }
  return { query: q, hits, problem: null };
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

/**
 * `GET <download>/audit`. Four independent scanners, free and unauthenticated.
 *
 * An absent scanner is absent from the response and must render as "not
 * scanned" rather than as safe. 36.82 per cent of 3,984 scanned skills carried
 * a flaw, so silence is not evidence of anything.
 */
export async function auditSkills(
  source: string,
  skills: readonly string[],
  context: SourceContext = {}
): Promise<SkillAuditResult> {
  if (!OWNER_REPO.test(source)) {
    return { records: {}, problem: `Tortie can only ask a scanner about an owner/repo source, and this one is "${source}".` };
  }
  const { download } = await bases(context);
  const url = new URL(`${download}/audit`);
  url.searchParams.set('source', source);
  if (skills.length > 0) url.searchParams.set('skills', skills.join(','));

  const answer = await get(url.toString(), { accept: 'application/json' }, MAX_JSON_BYTES, context);
  if (!answer.ok) return { records: {}, problem: answer.problem };

  const parsed = parseJson(answer.text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { records: {}, problem: 'The scanner service answered in a shape Tortie does not recognise.' };
  }

  const records: SkillAuditResult['records'] = {};
  for (const [slug, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
    const scanners: Record<string, SkillScannerResult> = {};
    for (const [scanner, result] of Object.entries(value as Record<string, unknown>)) {
      if (typeof result !== 'object' || result === null) continue;
      const row = result as Record<string, unknown>;
      if (typeof row['risk'] !== 'string') continue;
      scanners[scanner] = {
        risk: row['risk'],
        ...(typeof row['alerts'] === 'number' ? { alerts: row['alerts'] } : {}),
        ...(typeof row['score'] === 'number' ? { score: row['score'] } : {}),
        ...(typeof row['analyzedAt'] === 'string' ? { analyzedAt: row['analyzedAt'] } : {})
      };
    }
    if (Object.keys(scanners).length > 0) records[slug] = scanners;
  }
  return { records, problem: null };
}

// ---------------------------------------------------------------------------
// The body, so the scan can run before the control
// ---------------------------------------------------------------------------

interface TreeEntry {
  path: string;
  type: string;
}

function githubHeaders(token: string | null): Record<string, string> {
  return {
    accept: 'application/vnd.github+json',
    'user-agent': 'Tortie',
    ...(token !== null ? { authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Pick the SKILL.md that belongs to one named skill.
 *
 * The CLI walks `skills/`, `.agents/skills/` and the per-agent directories to
 * depth 3, plus manifest-declared paths. Rather than reproducing that walk, the
 * whole tree is listed once and the entry whose PARENT DIRECTORY is the skill's
 * name is taken, which is the rule the spec itself fixes: a skill's `name` must
 * match its directory.
 */
/**
 * The roots the CLI itself walks, in its own order, then everything else.
 *
 * Nothing here is a guess about a specific agent. It is the list research 29
 * measured the CLI walking, and it exists so that a repository shipping
 * `skills/<name>/SKILL.md` and `examples/<name>/SKILL.md` previews the one the
 * install would actually take.
 */
const SOURCE_ROOTS: readonly string[] = ['skills/', '.agents/skills/', '.claude/skills/'];

function rootRank(path: string): number {
  const at = SOURCE_ROOTS.findIndex((root) => path.startsWith(root));
  return at === -1 ? SOURCE_ROOTS.length : at;
}

export function pickSkillFile(
  entries: readonly TreeEntry[],
  skill: string
): string | null {
  const candidates = entries
    .filter((entry) => entry.type === 'blob')
    .map((entry) => entry.path)
    .filter((path) => path.endsWith('/SKILL.md') || path === 'SKILL.md');
  const exact = candidates.filter((path) => {
    const parts = path.split('/');
    return (parts[parts.length - 2] ?? '') === skill;
  });
  // Shallowest first, then by which root it sits under. Two copies at the same
  // depth are common — a repository that ships `skills/<name>/SKILL.md` and an
  // `examples/<name>/SKILL.md` beside it — and the CLI walks the declared roots,
  // so an alphabetical tie-break would have picked the example.
  const ordered = (exact.length > 0 ? exact : candidates).sort(
    (a, b) =>
      a.split('/').length - b.split('/').length ||
      rootRank(a) - rootRank(b) ||
      a.localeCompare(b)
  );
  return ordered[0] ?? null;
}

/**
 * Read one skill out of a GitHub source, without installing it.
 *
 * Only `owner/repo` is supported, and that limit is stated rather than worked
 * around. A git URL or a local directory returns a problem, and the install
 * gate turns a preview it could not read into a REFUSAL. Tortie does not
 * install what it has not read.
 */
export async function previewSkill(
  source: string,
  skill: string,
  context: SourceContext = {}
): Promise<SkillPreviewResult> {
  const empty: SkillPreviewResult = {
    source,
    name: skill,
    body: null,
    path: null,
    commit: null,
    scriptCount: 0,
    files: [],
    problem: null
  };

  if (!OWNER_REPO.test(source)) {
    return {
      ...empty,
      problem: `Tortie can only read a skill before installing it when its source is an owner/repo on GitHub. This one is "${source}".`
    };
  }

  const { token } = await bases(context);
  const headers = githubHeaders(token);

  const tree = await get(
    `${GITHUB_API}/repos/${source}/git/trees/HEAD?recursive=1`,
    headers,
    MAX_JSON_BYTES,
    context
  );
  if (!tree.ok) {
    return {
      ...empty,
      problem: `Tortie could not list ${source} to read ${skill} before installing it. ${tree.problem ?? ''}`.trim()
    };
  }

  const parsed = parseJson(tree.text) as { tree?: unknown } | null;
  const rows = Array.isArray(parsed?.tree) ? (parsed.tree as unknown[]) : [];
  const entries: TreeEntry[] = rows
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .filter((row) => typeof row['path'] === 'string' && typeof row['type'] === 'string')
    .map((row) => ({ path: row['path'] as string, type: row['type'] as string }));

  const file = pickSkillFile(entries, skill);
  if (file === null) {
    return { ...empty, problem: `Tortie did not find a SKILL.md for ${skill} in ${source}.` };
  }

  const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '';
  const files = entries
    .filter((entry) => entry.type === 'blob')
    .map((entry) => entry.path)
    .filter((path) => (dir === '' ? true : path.startsWith(`${dir}/`)))
    .map((path) => (dir === '' ? path : path.slice(dir.length + 1)));
  const scriptCount = files.filter((path) => path.startsWith('scripts/')).length;

  const raw = await get(
    `${GITHUB_RAW}/${source}/HEAD/${file}`,
    { accept: 'text/plain', 'user-agent': 'Tortie', ...(token !== null ? { authorization: `Bearer ${token}` } : {}) },
    MAX_BODY_BYTES,
    context
  );
  if (!raw.ok) {
    return {
      ...empty,
      path: file,
      files,
      scriptCount,
      problem: `Tortie could not read ${file} from ${source}. ${raw.problem ?? ''}`.trim()
    };
  }

  // The commit is provenance, not a gate. A source that read fine but whose
  // commit could not be resolved still previews; the card says the commit is
  // unknown rather than hiding the whole thing.
  let commit: string | null = null;
  const head = await get(
    `${GITHUB_API}/repos/${source}/commits/HEAD`,
    headers,
    MAX_JSON_BYTES,
    context
  );
  if (head.ok) {
    const sha = (parseJson(head.text) as { sha?: unknown } | null)?.sha;
    if (typeof sha === 'string') commit = sha;
  }

  return {
    source,
    name: skill,
    body: raw.text,
    path: file,
    commit,
    scriptCount,
    files,
    problem: null
  };
}
