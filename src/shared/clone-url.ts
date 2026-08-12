/**
 * The rules that turn a string a person pasted into an address Tortie can
 * clone (Phase 18.6, research 35 §3.4).
 *
 * SHARED for the same reason `project-create.ts` is shared: the dialog and
 * the main process must apply ONE set of rules. Four of the nine forms a
 * person realistically pastes are refused by git if they are passed straight
 * through, so normalising is not optional, and the dialog has to do it
 * BEFORE the preflight rather than after. Rule 10 is the case that forces
 * the sharing: the Repository field is prefilled from the clipboard, and a
 * `user:password@` in that clipboard must be gone before the string reaches
 * the field, not merely before it reaches git.
 *
 * WHY THIS IS HAND WRITTEN rather than assembled from a package. The two
 * obvious candidates each fail on a case Tortie must handle. `hosted-git-info`
 * returns null for a self hosted host. `git-url-parse` throws on the bare
 * `github.com/owner/repo` form, which is exactly what a person copies out of
 * a chat message. Research 35 §3.2 records the survey and the verdict.
 *
 * Everything here is pure. No filesystem, no network, no Electron.
 */

/**
 * What a pasted string resolved to. `url` is always https and never carries
 * a password.
 */
export interface NormalizedCloneUrl {
  /** The https URL Tortie will actually clone. */
  url: string;
  /** Host for the copy in error messages, e.g. "github.com". */
  host: string;
  /** Second to last path segment, when the path has one. */
  owner?: string;
  /** Last path segment without `.git`, when the path has two or more. */
  repo?: string;
  /** Suggested folder name: the last path segment without `.git`. */
  suggestedName: string;
  /** The input was an scp, ssh:// or git:// address and was rewritten. */
  rewrittenFromSsh?: boolean;
  /** A `user:password@` was removed from the input. */
  strippedCredential?: boolean;
}

/** Shown when a string cannot be read as a repository address at all. */
export const CLONE_BAD_URL_MESSAGE =
  'That does not look like a repository address. It should start with https:// or git@.';

/** Shown under the field when rule 3 or rule 4 rewrote the address. */
export const CLONE_REWRITTEN_FROM_SSH_NOTE =
  'Tortie will use https for this address.';

/** Shown under the field when rule 10 removed a password. */
export const CLONE_STRIPPED_CREDENTIAL_NOTE =
  'Tortie ignored the sign in details in that address.';

/**
 * Path segments that mean "this is a web page about the repository, not the
 * repository". The bare `-` is GitLab, whose web URLs put `/-/tree/main`
 * after the project path.
 */
const WEB_PAGE_SEGMENTS: ReadonlySet<string> = new Set([
  'tree',
  'blob',
  'pull',
  'pulls',
  'issues',
  'commit',
  'commits',
  'releases',
  'wiki',
  'actions',
  'compare',
  '-'
]);

/** `owner/repo` and nothing else: the form people copy out of a chat. */
const SHORTHAND = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

/** The scp form git accepts, e.g. `git@github.com:owner/repo.git`. */
const SCP = /^[^/@]+@([^:/]+):(.+)$/;

/** `ssh://` or `git://`, which we rewrite to https rather than refuse. */
const SSH_OR_GIT_SCHEME = /^(?:ssh|git):\/\//i;

/** Any scheme at all, so rule 5 only fires on a string that has none. */
const ANY_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;

/** Drop a leading `user@` from a host-and-path string. */
function withoutUserInfo(hostAndPath: string): string {
  const at = hostAndPath.indexOf('@');
  const slash = hostAndPath.indexOf('/');
  if (at === -1) return hostAndPath;
  if (slash !== -1 && slash < at) return hostAndPath;
  return hostAndPath.slice(at + 1);
}

/**
 * Apply research 35 §3.4's eleven rules and return what the string resolves
 * to, or null when it cannot be a repository address.
 *
 * Rules 2 to 5 are alternatives and the first one that matches wins. Rules 6
 * to 11 then run on the result of that, every time. Rule 2 deliberately
 * expands to `https://github.com/<owner>/<repo>` and lets rule 11 add the
 * suffix, so a pasted `owner/repo.git` does not become `repo.git.git`.
 */
export function normalizeCloneUrl(raw: string): NormalizedCloneUrl | null {
  // Rule 1. Trim, including the trailing newline a paste often carries.
  const trimmed = String(raw ?? '').trim();
  if (trimmed.length === 0) return null;

  let candidate = trimmed;
  let rewrittenFromSsh = false;

  const scp = SCP.exec(candidate);
  if (SHORTHAND.test(candidate)) {
    // Rule 2. GitHub shorthand. Assuming GitHub for a bare owner/repo is a
    // product decision, and the dialog states it by showing the resolved URL.
    candidate = `https://github.com/${candidate}`;
  } else if (scp !== null) {
    // Rule 3. The scp form, rewritten to https with the username dropped.
    candidate = `https://${scp[1] ?? ''}/${(scp[2] ?? '').replace(/^\/+/, '')}`;
    rewrittenFromSsh = true;
  } else if (SSH_OR_GIT_SCHEME.test(candidate)) {
    // Rule 4. The same rewrite for an explicit ssh:// or git:// scheme.
    candidate = `https://${withoutUserInfo(candidate.replace(SSH_OR_GIT_SCHEME, ''))}`;
    rewrittenFromSsh = true;
  } else if (!ANY_SCHEME.test(candidate)) {
    // Rule 5. No scheme, but a dot before the first slash, e.g.
    // `github.com/owner/repo`. Without this git reads it as a local path.
    const firstSlash = candidate.indexOf('/');
    if (firstSlash <= 0 || !candidate.slice(0, firstSlash).includes('.')) {
      return null;
    }
    candidate = `https://${candidate}`;
  }

  // Rule 6. Parse, and refuse anything that is not http or https after the
  // rewrites above. `file:` is refused by the same check.
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'https:' && protocol !== 'http:') return null;
  if (parsed.hostname.length === 0) return null;

  // Rule 7. The query string and the fragment are page state, not address.
  parsed.search = '';
  parsed.hash = '';

  // Rule 10. Remove any user:password. Dropped, never stored, never logged
  // and never rendered. Done here, before the caller ever sees the string.
  const strippedCredential = parsed.username !== '' || parsed.password !== '';
  parsed.username = '';
  parsed.password = '';

  // Rule 8. A trailing slash falls out of the empty-segment filter.
  let segments = parsed.pathname.split('/').filter((s) => s.length > 0);

  // Rule 9. Cut a web page suffix. Only from index 2 onward: a repository
  // may legitimately be called `tree`, and `/owner/tree` is two segments.
  if (segments.length >= 3) {
    const cut = segments.findIndex(
      (s, i) => i >= 2 && WEB_PAGE_SEGMENTS.has(s.toLowerCase())
    );
    if (cut !== -1) segments = segments.slice(0, cut);
  }
  if (segments.length === 0) return null;

  const lastRaw = segments[segments.length - 1] ?? '';
  const bare = lastRaw.endsWith('.git') ? lastRaw.slice(0, -4) : lastRaw;
  if (bare.length === 0) return null;

  // Rule 11. Optional for GitHub, required by some servers.
  segments[segments.length - 1] = `${bare}.git`;
  parsed.pathname = `/${segments.join('/')}`;

  const owner = segments.length >= 2 ? segments[segments.length - 2] : undefined;

  return {
    url: parsed.toString(),
    host: parsed.host,
    ...(owner !== undefined ? { owner } : {}),
    ...(segments.length >= 2 ? { repo: bare } : {}),
    suggestedName: decodeSegment(bare),
    ...(rewrittenFromSsh ? { rewrittenFromSsh: true } : {}),
    ...(strippedCredential ? { strippedCredential: true } : {})
  };
}

/**
 * A folder name is for a human and a filesystem, so `my%20repo` in the URL
 * becomes `my repo` on disk. A segment that does not decode is used as it is
 * rather than failing the whole parse.
 */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
