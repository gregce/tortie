/**
 * The logins store (Phase 202): the durable set of logins Tortie knows, which
 * one each provider's new sessions run under, and the directory a name
 * resolves to.
 *
 * THE FILE. `<root>/logins.json`, written only by this module, holding names,
 * ids and one chosen name per provider. It holds NO PATH, NO TOKEN AND NO
 * CREDENTIAL OF ANY KIND, and it never will: a login's directory is DERIVED
 * from its id, so there is no field a person or an agent could edit to point
 * Tortie at somebody else's directory. The id itself is checked against
 * {@link LOGIN_ID_RE} on the way out of the file as well as on the way in,
 * and a row that fails is dropped WHOLE with the field and the reason named,
 * which is the standing rule for every file an agent can write.
 *
 * THE DEFAULT LOGIN IS NOT IN THE FILE. It is the vendor's own location, it
 * is what everything did before this phase, it is listed first, it cannot be
 * removed, it cannot be renamed, and no function in this module can compose a
 * path to it. `resolveLoginDir` answers `null` for it, and a `null` directory
 * means "add no variable to the pane and read the default location", which is
 * exactly the behaviour that shipped in Phase 181.
 *
 * NOTHING HERE IMPORTS ELECTRON. The root is a parameter, so
 * `npm run conformance:logins` runs these rules under plain node.
 */

import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import type { LoginProviderId, LoginRow, LoginsSnapshot } from '@shared/logins';
import {
  DEFAULT_LOGIN_NAME,
  LOGIN_PROVIDERS,
  defaultLoginRow,
  sameLoginName,
  sanitizeLoginName
} from '@shared/logins';
import {
  LOGIN_ID_RE,
  isOwnedLoginDir,
  loginDirIn,
  loginDirOnDisk,
  loginProviderRootIn,
  loginsFileIn
} from './dirs';

/** One added login as the file records it. Names and ids, and nothing else. */
export interface StoredLogin {
  provider: LoginProviderId;
  /** Sixteen hex characters, minted here, and the directory's own name. */
  id: string;
  name: string;
  /** Epoch ms the directory was created. Ordering only. */
  createdAt: number;
}

/** The file's whole shape. */
export interface LoginsFile {
  v: 1;
  /** The chosen login NAME per provider. Absent or null means the default. */
  chosen: Partial<Record<LoginProviderId, string | null>>;
  logins: StoredLogin[];
}

/** What a read produced, plus every row it refused and why. */
export interface LoginsFileRead {
  file: LoginsFile;
  problems: string[];
}

function emptyFile(): LoginsFile {
  return { v: 1, chosen: {}, logins: [] };
}

function isProvider(raw: unknown): raw is LoginProviderId {
  return LOGIN_PROVIDERS.includes(raw as LoginProviderId);
}

/**
 * The file, sanitized row by row.
 *
 * A ROW IS DROPPED WHOLE OR KEPT WHOLE. There is no half login: a row whose
 * id is not an id has no directory, and a row whose name is not a name cannot
 * be chosen, so keeping either half would put a login on a menu that no
 * launch could ever resolve. Every drop names the field and the reason, and
 * those sentences reach the person on the Settings page rather than a log.
 *
 * A file that does not parse at all reads as no added logins, which is what
 * every install before this phase has, and the problem says so.
 */
export function readLoginsFile(root: string): LoginsFileRead {
  const path = loginsFileIn(root);
  const problems: string[] = [];
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return { file: emptyFile(), problems };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    problems.push(
      'logins.json is not valid JSON, so no added logins were read. Add a ' +
        'login again to rewrite it.'
    );
    return { file: emptyFile(), problems };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    problems.push('logins.json is not an object, so no added logins were read.');
    return { file: emptyFile(), problems };
  }
  const obj = parsed as Record<string, unknown>;
  const out = emptyFile();
  const rows = obj['logins'];
  const seen = new Set<string>();
  if (Array.isArray(rows)) {
    for (const raw of rows) {
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        problems.push('A login row was not an object and was dropped.');
        continue;
      }
      const row = raw as Record<string, unknown>;
      const provider = row['provider'];
      if (!isProvider(provider)) {
        problems.push(
          `A login row named provider ${JSON.stringify(row['provider'])}, ` +
            'which is not claude or codex, and was dropped.'
        );
        continue;
      }
      const id = row['id'];
      if (typeof id !== 'string' || !LOGIN_ID_RE.test(id)) {
        problems.push(
          `A ${provider} login row has an id that is not sixteen hex ` +
            'characters, so it names no directory Tortie owns. It was dropped.'
        );
        continue;
      }
      const name = sanitizeLoginName(row['name']);
      if (name === null) {
        problems.push(
          `A ${provider} login row has a name Tortie cannot use, so it was ` +
            `dropped. A name is up to 32 letters, digits, spaces, dots, ` +
            `hyphens or underscores, and cannot be ${DEFAULT_LOGIN_NAME}.`
        );
        continue;
      }
      const key = `${provider}:${name.toLowerCase()}`;
      if (seen.has(key)) {
        problems.push(
          `Two ${provider} logins are both named ${name}. The second was dropped.`
        );
        continue;
      }
      // SECOND GUARD, and it is the one that stands in front of a path. The
      // id already passed its shape test, so the spelling half can only fail
      // if a later round changes that shape; it is here because the cost of
      // the check is nothing and the cost of missing it is a directory
      // outside the root.
      //
      // THE DISK HALF IS THE ONE THAT CATCHES A LINK, added by the Phase 202
      // fix round after the verifier planted one. A spelled path cannot say
      // whether the thing at the end of it is a directory Tortie owns or a
      // symlink to somebody else's, and every surface below this line trusts
      // the row: the list, the choice, the launch and the meter. So the row
      // is dropped HERE, once, and none of them ever sees it. A folder that
      // is merely GONE is not dropped, because a chosen login whose folder
      // the person deleted has to fall back to the default and name itself.
      if (loginDirOnDisk(root, provider, loginDirIn(root, provider, id)) === 'escapes') {
        problems.push(
          `The ${provider} login ${JSON.stringify(name)} names a folder that ` +
            'is not one Tortie owns, being a link or not a folder at all. It ' +
            'was dropped and nothing in it was read.'
        );
        continue;
      }
      seen.add(key);
      const createdAt = row['createdAt'];
      out.logins.push({
        provider,
        id,
        name,
        createdAt: typeof createdAt === 'number' && Number.isFinite(createdAt)
          ? createdAt
          : 0
      });
    }
  }
  const chosen = obj['chosen'];
  if (chosen !== null && typeof chosen === 'object' && !Array.isArray(chosen)) {
    const bag = chosen as Record<string, unknown>;
    for (const provider of LOGIN_PROVIDERS) {
      const value = bag[provider];
      if (value === undefined || value === null) continue;
      const name = sanitizeLoginName(value);
      if (name === null) {
        problems.push(
          `The chosen ${provider} login is not a name Tortie can use, so the ` +
            'default is used.'
        );
        continue;
      }
      if (!out.logins.some((l) => l.provider === provider && sameLoginName(l.name, name))) {
        problems.push(
          `The chosen ${provider} login ${name} is not one Tortie knows, so ` +
            'the default is used.'
        );
        continue;
      }
      out.chosen[provider] = name;
    }
  }
  out.logins.sort((a, b) => a.createdAt - b.createdAt);
  return { file: out, problems };
}

/**
 * Write the file, atomically.
 *
 * The temporary file is in the same directory so the rename is a rename
 * rather than a copy, and the whole write is one durable step: a reader that
 * arrives mid write sees the old file or the new one, never half of either.
 */
export function writeLoginsFile(root: string, file: LoginsFile): void {
  mkdirSync(root, { recursive: true });
  const path = loginsFileIn(root);
  const tmp = join(root, `.logins.${process.pid.toString(36)}.tmp`);
  writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600
  });
  renameSync(tmp, path);
}

/**
 * Does a credential exist for this directory right now?
 *
 * FILE ONLY, and this is not the whole answer on macOS. A second claude login
 * lives in a keychain item named for its directory rather than in a file, so
 * `present` for claude is completed by the credential reader, which asks the
 * keychain. This function is the cheap half and it never opens the keychain,
 * so listing logins spawns nothing.
 */
function credentialFilePresent(
  root: string,
  provider: LoginProviderId,
  dir: string
): boolean {
  // THE OWNERSHIP QUESTION IS ASKED BEFORE THE FILE ONE. A row that escapes
  // is already dropped by the reader, so this is the second guard rather than
  // the first, and it is here because `existsSync` follows a link: without
  // it, the cheapest surface in the domain would be the one that reaches out
  // of Tortie's data to look for somebody else's credential.
  if (loginDirOnDisk(root, provider, dir) !== 'ok') return false;
  const file =
    provider === 'claude' ? join(dir, '.credentials.json') : join(dir, 'auth.json');
  try {
    return existsSync(file);
  } catch {
    return false;
  }
}

/**
 * Every login, default first per provider, in the order the surfaces draw.
 *
 * IT IS THE CHEAP HALF and it stays. It opens no keychain, spawns nothing and
 * reads no vendor file, so it is what any path that must start no process
 * calls. `present` here is the FILE answer, which on macOS is always false for
 * a claude login, and `email` is always null.
 *
 * NO SURFACE MAY DRAW THIS DIRECTLY, which is the Phase 203 rule.
 * {@link listLoginsAsking} is what `logins:list` answers with, and the whole
 * of the first defect was that the menu drew the half answer and said
 * `Not signed in yet` about a login that had been signed into.
 */
export function listLogins(root: string): LoginsSnapshot {
  const { file, problems } = readLoginsFile(root);
  const logins: LoginRow[] = [];
  for (const provider of LOGIN_PROVIDERS) {
    const chosen = file.chosen[provider] ?? null;
    logins.push(defaultLoginRow(provider, chosen === null, true));
    for (const row of file.logins) {
      if (row.provider !== provider) continue;
      const dir = loginDirIn(root, provider, row.id);
      logins.push({
        provider,
        name: row.name,
        isDefault: false,
        chosen: sameLoginName(chosen, row.name),
        present: credentialFilePresent(root, provider, dir),
        email: null,
        // THE CHEAP LIST OPENS NOTHING, so it cannot answer either of these.
        // No surface draws this list; ./ipc.ts answers with the whole one.
        kept: false,
        restores: false
      });
    }
  }
  return { logins, problems, at: Date.now() };
}

/**
 * What a caller with a credential reader answers about one login (Phase 203).
 *
 * `dir` is null for the person's own default sign in, which is the vendor's
 * own location and the one directory this module can never compose. That is
 * why the question is asked of the CALLER: the answer needs the two vendor
 * directory names and a home directory, and `npm run conformance:logins`
 * refuses any file in this domain that can name one of them.
 */
export type LoginFactsAsk = (
  provider: LoginProviderId,
  dir: string | null,
  /**
   * The login's own id, or null for the person's own default location
   * (Phase 204). The caller needs it to name the entry in the store Tortie
   * owns, and this module still composes no path to a credential of any kind.
   */
  id: string | null
) => Promise<{
  present: boolean;
  email: string | null;
  /** Tortie holds this account's credential in its own store (Phase 204). */
  kept: boolean;
  /** Choosing this login would put that credential back (Phase 204). */
  restores: boolean;
}>;

/**
 * The same list, with the WHOLE question asked (Phase 203).
 *
 * This is what `logins:list` answers with, so `present` is the keychain half
 * as well as the file half and every row carries the address the vendor's own
 * file names for it. The first defect the operator reported was exactly the
 * absence of this function: the list asked for a file macOS never writes, so
 * a login he had really signed into said `Not signed in yet` for ever.
 *
 * A FOLDER THAT IS GONE IS NEVER ASKED ABOUT. Removing a login deletes the
 * folder and leaves the scoped keychain item behind, so asking would answer
 * `present` for a directory that is not there. A gone folder answers absent
 * and not known, and the resolver falls back to the default as it always did.
 *
 * ONE FAILED ANSWER IS ONE HONEST ROW. An ask that rejects leaves that row
 * absent and not known rather than failing the whole list, because a surface
 * with no list at all is worse than a surface with one modest row.
 */
export async function listLoginsAsking(
  root: string,
  ask: LoginFactsAsk
): Promise<LoginsSnapshot> {
  const { file, problems } = readLoginsFile(root);
  const asked = async (
    provider: LoginProviderId,
    dir: string | null,
    id: string | null
  ): Promise<{
    present: boolean;
    email: string | null;
    kept: boolean;
    restores: boolean;
  }> => {
    try {
      return await ask(provider, dir, id);
    } catch {
      return { present: false, email: null, kept: false, restores: false };
    }
  };
  const logins: LoginRow[] = [];
  for (const provider of LOGIN_PROVIDERS) {
    const chosen = file.chosen[provider] ?? null;
    const own = await asked(provider, null, null);
    logins.push(defaultLoginRow(provider, chosen === null, own.present, own.email));
    for (const row of file.logins) {
      if (row.provider !== provider) continue;
      const dir = loginDirIn(root, provider, row.id);
      const facts =
        loginDirOnDisk(root, provider, dir) === 'ok'
          ? await asked(provider, dir, row.id)
          : { present: false, email: null, kept: false, restores: false };
      logins.push({
        provider,
        name: row.name,
        isDefault: false,
        chosen: sameLoginName(chosen, row.name),
        present: facts.present,
        email: facts.email,
        kept: facts.kept,
        // A LOGIN ALREADY CHOSEN PUTS NOTHING BACK, because the store it runs
        // under is the store it is already running under.
        restores: facts.restores && !sameLoginName(chosen, row.name)
      });
    }
  }
  return { logins, problems, at: Date.now() };
}

/** What a name resolves to at a launch and at a read. */
export interface ResolvedLogin {
  /**
   * The login the caller actually gets, or null for the default location.
   * This is what goes on the manifest row and what the meter reports.
   */
  name: string | null;
  /** The directory to point the provider's variable at, or null for default. */
  dir: string | null;
  /**
   * TRUE when a name was asked for and could not be honoured, so the default
   * was used instead. The caller says one sentence about it; nothing fails.
   */
  fellBack: boolean;
  /** The name that was asked for and could not be honoured. */
  asked: string | null;
}

/**
 * One name to one directory, and the fallback that never fails a launch.
 *
 * `name` null asks for the default and always gets it. A name Tortie does not
 * know, or one whose directory is gone, falls back to the DEFAULT with
 * `fellBack` set, because the alternative answers are both worse: refusing
 * would leave a person unable to restore a session, and recreating an empty
 * directory would start a session silently signed out.
 *
 * ONE RESOLVER FOR THE LAUNCH AND FOR THE METER, deliberately. If the two
 * could disagree the meter would draw one login's numbers over another
 * login's sessions, which is the research 72 rule this phase inherits: never
 * lie across accounts.
 */
export function resolveLoginDir(
  root: string,
  provider: LoginProviderId,
  name: string | null
): ResolvedLogin {
  if (name === null || sameLoginName(name, DEFAULT_LOGIN_NAME)) {
    return { name: null, dir: null, fellBack: false, asked: null };
  }
  const { file } = readLoginsFile(root);
  const row = file.logins.find(
    (l) => l.provider === provider && sameLoginName(l.name, name)
  );
  if (row === undefined) {
    return { name: null, dir: null, fellBack: true, asked: name };
  }
  const dir = loginDirIn(root, provider, row.id);
  // NOT `existsSync`, and the Phase 202 fix round is why: `existsSync`
  // FOLLOWS a link, so it answered true for a directory outside Tortie's own
  // data and handed it to a launch. `loginDirOnDisk` refuses a link and every
  // other shape that is not a real owned directory, and answers `absent` for
  // the ordinary case this fallback was written for.
  if (loginDirOnDisk(root, provider, dir) !== 'ok') {
    return { name: null, dir: null, fellBack: true, asked: name };
  }
  return { name: row.name, dir, fellBack: false, asked: name };
}

/** The chosen login's name for one provider, or null for the default. */
export function chosenLoginFor(
  root: string,
  provider: LoginProviderId
): string | null {
  return readLoginsFile(root).file.chosen[provider] ?? null;
}

/**
 * The directory NEW sessions of a provider launch under, and the meter reads.
 *
 * It is the chosen login run through {@link resolveLoginDir}, so a chosen
 * login whose directory somebody deleted answers the default with `fellBack`
 * rather than a directory that is not there.
 */
export function effectiveLogin(
  root: string,
  provider: LoginProviderId
): ResolvedLogin {
  return resolveLoginDir(root, provider, chosenLoginFor(root, provider));
}

/** What an add, a choose or a remove answers. */
export type LoginChange =
  | { ok: true; snapshot: LoginsSnapshot; name: string; dir: string | null }
  | { ok: false; reason: string };

/**
 * Add a login: mint an id, create the empty directory, record the name.
 *
 * NOTHING IS SIGNED IN HERE AND NOTHING IS READ. This creates an empty
 * directory and a row. The vendor's own CLI is what fills it, in one ordinary
 * session the person starts and completes themselves, which is how refusal 8
 * holds: a configuration change on its own has not started anything, and the
 * person confirms the sign in in their own terminal.
 *
 * IT DOES NOT CHOOSE THE NEW LOGIN. A login with no credential in it would
 * launch every new session signed out, so choosing is a second act, and the
 * card offers it once the sign in has actually written something.
 */
export function addLogin(
  root: string,
  provider: LoginProviderId,
  rawName: unknown
): LoginChange {
  const name = sanitizeLoginName(rawName);
  if (name === null) {
    return {
      ok: false,
      reason:
        `That is not a name Tortie can use. Use up to 32 letters, digits, ` +
        `spaces, dots, hyphens or underscores, and not ${DEFAULT_LOGIN_NAME}.`
    };
  }
  const { file } = readLoginsFile(root);
  if (
    file.logins.some(
      (l) => l.provider === provider && sameLoginName(l.name, name)
    )
  ) {
    return { ok: false, reason: `There is already a ${provider} login named ${name}.` };
  }
  let id = '';
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = randomBytes(8).toString('hex');
    if (file.logins.some((l) => l.id === candidate)) continue;
    if (existsSync(loginDirIn(root, provider, candidate))) continue;
    id = candidate;
    break;
  }
  if (id === '') return { ok: false, reason: 'Tortie could not name a new folder.' };
  const dir = loginDirIn(root, provider, id);
  // THE GUARD BEFORE THE MKDIR. The id was minted a line ago and cannot fail
  // this, which is the point: the check is in front of every write, so a
  // later round that changes how an id is made cannot reach outside the root.
  if (!isOwnedLoginDir(root, provider, dir)) {
    return { ok: false, reason: 'Tortie refused a folder outside its own data.' };
  }
  try {
    mkdirSync(loginProviderRootIn(root, provider), { recursive: true });
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  } catch (err) {
    return { ok: false, reason: `Tortie could not create the folder: ${(err as Error).message}` };
  }
  file.logins.push({ provider, id, name, createdAt: Date.now() });
  writeLoginsFile(root, file);
  return { ok: true, snapshot: listLogins(root), name, dir };
}

/**
 * Choose which login a provider's NEW sessions run under.
 *
 * IT SENDS NOTHING TO ANY RUNNING PROCESS. A session keeps the login it
 * started with, for its whole life, and the meter says so when they differ.
 * `null` chooses the default.
 */
export function chooseLogin(
  root: string,
  provider: LoginProviderId,
  rawName: string | null
): LoginChange {
  const { file } = readLoginsFile(root);
  if (rawName === null || sameLoginName(rawName, DEFAULT_LOGIN_NAME)) {
    delete file.chosen[provider];
    writeLoginsFile(root, file);
    return {
      ok: true,
      snapshot: listLogins(root),
      name: DEFAULT_LOGIN_NAME,
      dir: null
    };
  }
  const name = sanitizeLoginName(rawName);
  if (name === null) return { ok: false, reason: 'That is not a login Tortie knows.' };
  const row = file.logins.find(
    (l) => l.provider === provider && sameLoginName(l.name, name)
  );
  if (row === undefined) {
    return { ok: false, reason: `Tortie has no ${provider} login named ${name}.` };
  }
  file.chosen[provider] = row.name;
  writeLoginsFile(root, file);
  return {
    ok: true,
    snapshot: listLogins(root),
    name: row.name,
    dir: loginDirIn(root, provider, row.id)
  };
}

/**
 * Remove a login: delete the Tortie owned directory and forget the name.
 *
 * THE DEFAULT CAN NEVER BE REMOVED, and this is the refusal that protects the
 * person's own sign in. The default has no row and no id, so there is nothing
 * to name here; the check is explicit anyway, because a refusal a reader can
 * see is worth more than one that follows from the data shape.
 *
 * NOTHING OUTSIDE THE ROOT IS EVER DELETED. The directory is composed from
 * the row's id and then put through {@link isOwnedLoginDir} again, and a
 * failure there means nothing is deleted at all.
 *
 * SESSIONS THAT NAMED IT ARE NOT TOUCHED. A running one keeps running under
 * the directory it already opened; a stopped one restores under the default
 * and says so. Neither is rewritten here, because the manifest row carries a
 * NAME and re-resolution at restore is what answers this.
 */
export function removeLogin(
  root: string,
  provider: LoginProviderId,
  rawName: string
): LoginChange {
  if (sameLoginName(rawName, DEFAULT_LOGIN_NAME)) {
    return {
      ok: false,
      reason: 'The default login is your own and Tortie never removes it.'
    };
  }
  const name = sanitizeLoginName(rawName);
  if (name === null) return { ok: false, reason: 'That is not a login Tortie knows.' };
  const { file } = readLoginsFile(root);
  const index = file.logins.findIndex(
    (l) => l.provider === provider && sameLoginName(l.name, name)
  );
  if (index < 0) {
    return { ok: false, reason: `Tortie has no ${provider} login named ${name}.` };
  }
  const row = file.logins[index];
  if (row === undefined) {
    return { ok: false, reason: `Tortie has no ${provider} login named ${name}.` };
  }
  const dir = loginDirIn(root, provider, row.id);
  if (!isOwnedLoginDir(root, provider, dir)) {
    return {
      ok: false,
      reason: 'Tortie refused to remove a folder outside its own data.'
    };
  }
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    return { ok: false, reason: `Tortie could not remove the folder: ${(err as Error).message}` };
  }
  file.logins.splice(index, 1);
  if (sameLoginName(file.chosen[provider] ?? null, row.name)) {
    delete file.chosen[provider];
  }
  writeLoginsFile(root, file);
  return { ok: true, snapshot: listLogins(root), name: row.name, dir: null };
}

/**
 * Every directory under a provider's root that no row in the file names
 * (Phase 206).
 *
 * ## WHY THIS EXISTS
 *
 * The Phase 203 verifier found the operator's own disk holding two claude
 * login directories while `logins.json` held one row. The second was a login
 * he had added and removed the same day, and its scoped keychain item was
 * still there holding a whole credential of his. Remove deleted the row and
 * not the rest. Phase 206 chose to FINISH THE REMOVAL rather than adopt the
 * stray back onto the menu, because a row the person deleted should not come
 * back by itself and a credential nobody can reach is worse than one they can.
 *
 * ## THE IDS ARE READ RAW, AND THAT IS THE POINT
 *
 * {@link readLoginsFile} DROPS a row whose name collides with an earlier one,
 * whose name is unusable or whose folder is a link. Every one of those rows is
 * still a row the person added, so sweeping on the sanitized list would delete
 * a live login's folder and its credential because some other row shares its
 * name. So this reads the ids out of the file itself, and a directory is a
 * stray only when NO row anywhere in the file names it.
 *
 * ## A FILE THIS CANNOT READ AUTHORISES NOTHING
 *
 * An absent file, a file that is not JSON, and a file whose `logins` is not an
 * array all answer NO strays rather than "every directory is a stray". Tortie
 * cannot tell a removal from a lost file, and the two answers differ by the
 * person's credentials.
 */
export function strayLoginIds(root: string, provider: LoginProviderId): string[] {
  let rows: unknown;
  try {
    const parsed: unknown = JSON.parse(readFileSync(loginsFileIn(root), 'utf8'));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return [];
    }
    rows = (parsed as Record<string, unknown>)['logins'];
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];
  const known = new Set<string>();
  for (const raw of rows) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const id = (raw as Record<string, unknown>)['id'];
    if (typeof id === 'string') known.add(id);
  }
  let entries: string[];
  try {
    entries = readdirSync(loginProviderRootIn(root, provider));
  } catch {
    return [];
  }
  return entries.filter((name) => LOGIN_ID_RE.test(name) && !known.has(name));
}

/**
 * Delete one stray's directory, whatever shape it is (Phase 206).
 *
 * THE OWNERSHIP RULE IS ASKED FIRST, in this function, which is the standing
 * rule for every delete in this domain and what `npm run conformance:logins`
 * reads by matching braces.
 *
 * `rmSync` acts on the LINK and never on what it points at, which is what
 * makes a stray that is a symbolic link safe to finish: the entry inside
 * Tortie's own data goes and the directory somebody aimed it at is untouched.
 * That was measured rather than assumed.
 */
export function removeStrayLoginDir(
  root: string,
  provider: LoginProviderId,
  id: string
): boolean {
  if (!LOGIN_ID_RE.test(id)) return false;
  const dir = loginDirIn(root, provider, id);
  if (!isOwnedLoginDir(root, provider, dir)) return false;
  try {
    rmSync(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}
