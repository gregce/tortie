/**
 * The logins contract (Phase 202): which of a person's vendor sign ins a new
 * session runs under, and which one the usage meter reads.
 *
 * WHAT A LOGIN IS, in one sentence. A login is a DIRECTORY that the vendor's
 * own CLI wrote a credential into, and Tortie's whole part in it is pointing
 * one environment variable at that directory when it launches a session.
 * Tortie never writes a credential, never refreshes one, never rotates one
 * and never signs anybody out.
 *
 * THE DEFAULT LOGIN IS THE PERSON'S OWN, at the vendor's own default
 * location, and it is READ ONLY FOREVER. It is not in the store file, it
 * cannot be removed, it cannot be renamed, and it is what every session
 * before this phase ran under. Every other login is a directory under
 * `<userData>/gmux/logins/<provider>/<id>/` that Tortie created empty and the
 * vendor CLI filled in when the person signed in there.
 *
 * NOTHING IN THIS FILE IS A SECRET AND NOTHING IN IT MAY BECOME ONE. A login
 * is a NAME on the wire and in the manifest row; the directory is derived
 * from the name at launch and at read, and never stored beside a session.
 * That is the same rule `envPassthrough` follows, for the same reason: a path
 * replayed verbatim out of a database is how a credential location outlives
 * the decision that chose it.
 *
 * THE MECHANISM CAME FROM ORCA and the fork is deliberate. orca keeps one
 * directory per account (`ClaudeManagedAccount.managedAuthPath` in
 * `src/shared/managed-account-types.ts`) and previews an inactive account by
 * patching `CLAUDE_CONFIG_DIR` (`claude-managed-usage-panel.ts`). Its own
 * ACTIVE switch writes the keychain instead, so as not to fork claude's
 * session context. Tortie takes the fork orca avoided, because Tortie may
 * never write the person's credential store, and the price is written down
 * where it is paid: see `docs/research/72-subscription-usage.md` section 10.8
 * and the limits in the Phase 202 backlog entry.
 */

/** The two providers a login can belong to. Both are the person's own sign in. */
export type LoginProviderId = 'claude' | 'codex';

export const LOGIN_PROVIDERS: readonly LoginProviderId[] = ['claude', 'codex'];

/**
 * The one environment variable per provider that points a process at a login.
 *
 * `CLAUDE_CONFIG_DIR` moves claude's whole world with it, being the keychain
 * item's scope, the conversation store under `projects/`, the person's own
 * history, skills, plugins and agents. That is exactly why research 72
 * section 10.8 refused it as the lever for the STATUS LINE, where only one
 * key had to move. Here the whole world moving is the point: a second login
 * is a second world.
 *
 * `CODEX_HOME` does the same for codex, and codex's conversation store lives
 * under it, which is why the harvest reads the session's own login directory
 * rather than Tortie's process environment.
 */
export const LOGIN_ENV_NAME: Record<LoginProviderId, string> = {
  claude: 'CLAUDE_CONFIG_DIR',
  codex: 'CODEX_HOME'
};

/**
 * What the vendor's own sign in command is, per provider.
 *
 * COMPILED IN, AND THAT IS THE WHOLE OF REFUSAL 8 HERE. No configuration
 * file, no overlay row and no settings value reaches these two arrays. Add
 * login composes exactly this argv after the binary Tortie already resolved
 * for that agent, launches it as one ordinary session in the person's own
 * terminal, and reads nothing at all until the vendor has written a file or a
 * keychain item of its own.
 *
 * Read from orca's `claude-login-session.ts`, which runs
 * `claude auth login --claudeai`, and from `codex login`.
 */
export const LOGIN_SIGN_IN_ARGV: Record<LoginProviderId, readonly string[]> = {
  claude: ['auth', 'login', '--claudeai'],
  codex: ['login']
};

/**
 * The name the default login is drawn under.
 *
 * It is RESERVED: no login a person adds may take it, because a manifest row
 * carrying this name means the vendor's own default location and nothing
 * else. That reservation is the reason a login is stored by name at all.
 */
export const DEFAULT_LOGIN_NAME = 'Default';

/** The longest name a login may have. A name is a label, not a sentence. */
export const LOGIN_NAME_MAX = 32;

/**
 * A login name a person typed, or null when it is not one this app will use.
 *
 * WHAT IT LETS THROUGH: a short label a person recognises, starting with a
 * letter or a digit, holding letters, digits, spaces, underscores, hyphens
 * and dots, at most thirty two characters.
 *
 * WHAT IT REFUSES, and why each half is here. A leading dot or slash, so a
 * name can never read as a relative path in a message. A path separator, so a
 * name can never be mistaken for the directory it is not. The reserved
 * default name, in any case, so nothing a person adds can claim to be their
 * own default sign in. Anything longer than the cap, which is what refuses a
 * pasted token or a pasted path outright.
 *
 * IT IS NOT A DIRECTORY NAME. The directory is derived from an id Tortie
 * mints, never from this string, so a name that passed this filter still
 * cannot decide where anything is written.
 */
export function sanitizeLoginName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim();
  if (name.length === 0 || name.length > LOGIN_NAME_MAX) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/.test(name)) return null;
  if (name.toLowerCase() === DEFAULT_LOGIN_NAME.toLowerCase()) return null;
  return name;
}

/** Two login names are the same login when they read the same to a person. */
export function sameLoginName(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * A name for a login Tortie mints for an account it just kept (Phase 204).
 *
 * WHY A NAME IS MINTED AT ALL. When the account in a store changes, the
 * account that was there is captured into a login of Tortie's own, and that
 * login needs the one thing every login has, being a name, because the name is
 * the reserved manifest key a session's row carries. There is no rename in
 * this phase or the two before it, so the name is chosen once and never
 * changes even when the address it came from moves.
 *
 * THE ADDRESS ITSELF CANNOT BE THE NAME. {@link sanitizeLoginName} has no at
 * sign in its alphabet, deliberately, so a name can never read as an address
 * on a surface that is really drawing a label. So the name is composed from
 * the parts of the address that are already in that alphabet, being the local
 * part and the first label of the domain, joined by a dot.
 *
 * `taken` are the names already in use for this provider, compared the way a
 * person reads them. A collision gets a number, and a name that cannot be made
 * at all answers null so the caller can fall back to a plain one.
 */
export function loginNameFromEmail(
  email: unknown,
  taken: readonly string[] = []
): string | null {
  if (typeof email !== 'string') return null;
  const at = email.indexOf('@');
  if (at <= 0) return null;
  const clean = (part: string): string =>
    part.replace(/[^A-Za-z0-9._-]/g, '').replace(/^[._-]+/, '');
  const local = clean(email.slice(0, at));
  const domain = clean(email.slice(at + 1).split('.')[0] ?? '');
  if (local === '') return null;
  const stem = domain === '' ? local : `${local}.${domain}`;
  for (let n = 1; n <= 99; n++) {
    const suffix = n === 1 ? '' : ` ${String(n)}`;
    const name = sanitizeLoginName(
      `${stem.slice(0, LOGIN_NAME_MAX - suffix.length)}${suffix}`
    );
    if (name === null) return null;
    if (!taken.some((t) => sameLoginName(t, name))) return name;
  }
  return null;
}

/**
 * The plain name for a kept account whose address makes no name (Phase 204).
 *
 * It is the fallback and nothing else: an address that is all punctuation, or
 * a store that named no address at all, still gets a login rather than being
 * dropped, because dropping it is exactly the account loss this phase exists
 * to stop.
 */
export function nextKeptLoginName(taken: readonly string[] = []): string | null {
  for (let n = 1; n <= 99; n++) {
    const name = sanitizeLoginName(`Kept ${String(n)}`);
    if (name === null) return null;
    if (!taken.some((t) => sameLoginName(t, name))) return name;
  }
  return null;
}

/**
 * One login as every surface sees it.
 *
 * THERE IS NO PATH ON THIS SHAPE, deliberately. A renderer never needs to
 * know where a credential lives, and a value a renderer never sees is a value
 * that cannot reach a screenshot, a log line or a report.
 */
export interface LoginRow {
  provider: LoginProviderId;
  /** The name, which is the whole identity of a login on every surface. */
  name: string;
  /** TRUE for the vendor's own default location. Exactly one row per provider. */
  isDefault: boolean;
  /** TRUE when new sessions of this provider launch under this login. */
  chosen: boolean;
  /**
   * TRUE when a credential really exists for this login right now.
   *
   * FALSE IS NOT AN ERROR. A login added a moment ago is empty until the
   * person finishes the vendor's own sign in, and Tortie reads nothing until
   * the scoped keychain item or the file exists. On macOS a second claude
   * login lives in a keychain item named for its directory rather than in a
   * file, so this answer is "the item or the file", not "the file".
   *
   * PHASE 203 MADE THIS THE WHOLE QUESTION. Until then it was the FILE half
   * alone, and on macOS the file half is always false, so every added claude
   * login read as never signed in for ever. `src/main/usage/login-accounts.ts`
   * answers the keychain half, asking for the item's attributes and never for
   * its payload.
   */
  present: boolean;
  /**
   * The address the vendor's own file names for this login, or null when it
   * names none (Phase 203).
   *
   * NULL IS AN ORDINARY ANSWER. A login added a moment ago has no
   * `oauthAccount` in its `.claude.json` yet, because the address appears once
   * the account has taken a turn, so a freshly signed in login honestly has no
   * address and the row says the account is not known yet.
   *
   * IT IS THE PERSON'S OWN DATA. It is drawn and it is never sent: it reaches
   * no request, no log line, no manifest row and no argv. It is on this shape
   * rather than a path for the same reason nothing else here is a path.
   */
  email: string | null;
  /**
   * TRUE when Tortie holds this account's own credential in its own store
   * (Phase 204).
   *
   * IT IS NOT `present`, AND THE DIFFERENCE IS THE WHOLE FEATURE. `present`
   * says the vendor's store for this login has a credential in it right now.
   * `kept` says Tortie has a copy of the account, so choosing this login can
   * put it back. A login promoted from an account somebody signed out of has
   * `present` false and `kept` true, and it must never read as never signed
   * in, which is the Phase 203 defect in a new shape.
   *
   * IT IS A BOOLEAN AND IT WILL NEVER BE ANYTHING ELSE. No credential, no
   * digest and no length reaches a renderer.
   */
  kept: boolean;
  /**
   * TRUE when choosing this login will put its kept account back into the
   * store it runs under (Phase 204).
   *
   * It is what the one short line on the card and the menu is composed from,
   * so a person reads what a switch will do BEFORE it happens rather than
   * after. False for the login already chosen, for the person's own default
   * location, which Tortie never writes, and for a login whose store already
   * holds its account.
   */
  restores: boolean;
}

/** Every login Tortie knows, in the order the surfaces draw them. */
export interface LoginsSnapshot {
  /** Default first per provider, then the added ones oldest first. */
  logins: LoginRow[];
  /**
   * Anything in the store file that was dropped, one sentence each, naming
   * the field and the reason. An invalid row is dropped WHOLE and never
   * partially merged, which is the standing rule for every file a person or
   * an agent can write.
   */
  problems: string[];
  /** Milliseconds since epoch this snapshot was composed. */
  at: number;
}

/**
 * The default login of a provider, as a row.
 *
 * `email` defaults to null, which is what a seed answers before main has read
 * anything, and `DEFAULT_LOGIN_NAME` is still the row's NAME because the name
 * is the reserved manifest key. What changed in Phase 203 is that the name is
 * no longer what a person is shown: `loginAccountLabel` in ./login-copy.ts
 * draws the address, or the phrase that says whose sign in this is.
 */
export function defaultLoginRow(
  provider: LoginProviderId,
  chosen: boolean,
  present: boolean,
  email: string | null = null
): LoginRow {
  return {
    provider,
    name: DEFAULT_LOGIN_NAME,
    isDefault: true,
    chosen,
    present,
    email,
    // THE PERSON'S OWN LOCATION IS NEVER A WRITE TARGET, so choosing it puts
    // nothing back and its row says nothing about a switch. Tortie does keep a
    // rolling copy of what it holds, which is what lets an account he leaves
    // be offered back, but that copy belongs to the login promoted from it and
    // never to this row.
    kept: false,
    restores: false
  };
}

/** Which login a provider's new sessions run under, out of a snapshot. */
export function chosenLoginName(
  snapshot: LoginsSnapshot,
  provider: LoginProviderId
): string {
  const row = snapshot.logins.find((l) => l.provider === provider && l.chosen);
  return row?.name ?? DEFAULT_LOGIN_NAME;
}

/**
 * Which provider an agent id belongs to, or null.
 *
 * ONLY TWO AGENTS HAVE A LOGIN in this phase, and they are the two the meter
 * reads. Every other agent launches exactly as it did before: no variable is
 * added to its pane, no column is written on its row, and nothing about it
 * changes.
 */
export function loginProviderForAgent(agent: string): LoginProviderId | null {
  if (agent === 'claude') return 'claude';
  if (agent === 'codex') return 'codex';
  return null;
}
