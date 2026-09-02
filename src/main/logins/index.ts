/**
 * The logins domain barrel (Phase 202).
 *
 * A login is a directory the vendor's own CLI signed into. This domain owns
 * where those directories are, which one each provider's new sessions run
 * under, and nothing else. It writes no credential, reads no token, and
 * spawns nothing.
 */

export {
  LOGIN_ID_RE,
  isOwnedLoginDir,
  loginDirIn,
  loginProviderRootIn,
  loginsFileIn
} from './dirs';
export { registerLoginsIpc } from './ipc';
export { ensureLoginsRoot, loginsRoot } from './paths';
export { loginEnvForSession } from './session';
export {
  addLogin,
  chooseLogin,
  chosenLoginFor,
  effectiveLogin,
  listLogins,
  listLoginsAsking,
  readLoginsFile,
  removeLogin,
  resolveLoginDir,
  writeLoginsFile,
  type LoginChange,
  type LoginFactsAsk,
  type LoginsFile,
  type ResolvedLogin,
  type StoredLogin
} from './store';
