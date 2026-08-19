/**
 * SpecStory capture — the public surface of src/main/specstory.
 *
 * Seven responsibilities, seven modules:
 *  - resolve.ts    WHICH specstory binary, and where its state lives
 *  - auth.ts       is this Mac signed in to SpecStory Cloud (auth.json, cached)
 *  - wrap.ts       the argv composer (pure), including specstory's own quoting
 *  - capture.ts    whether an agent CAN be captured here, and the wrap+record
 *  - sync.ts       the session-end flush, its queue, and its honest failures
 *  - status-ipc.ts what Settings → SpecStory asks, and the auth actions
 *  - login.ts      the device sign-in, as one long-lived child process
 *
 * Phase 16 (L2) moved the last two here from src/main/settings/, where a
 * parallel-build collision had parked them: two builders could not write the
 * same folder at once. That blocker is fifteen phases old.
 *
 * Everything about "where does SpecStory keep its state" — the auth path, the
 * spawn env, the GMUX_SPECSTORY_HOME verification override — is answered by
 * resolve.ts alone. Settings imports those answers rather than recomputing
 * them; a second `~/.specstory/cli/auth.json` in this codebase is a bug.
 */

export {
  NO_VERSION_CHECK,
  cloudDisabledByEnv,
  bundledSpecstoryPath,
  bundledSpecstoryVersion,
  parseSpecStoryVersionOutput,
  resetSpecstoryResolutionCache,
  resolveSpecstory,
  specstoryAuthPath,
  specstoryEnv,
  specstoryHome,
  specstoryProbeCwd,
  type SpecstoryBinary,
  type SpecstoryResolution,
  type SpecstorySource
} from './resolve';

export { invalidateAuthCache, readAuthFacts } from './auth';

export {
  canWrapArgv,
  isWrappedArgv,
  specstoryQuoteArg,
  specstoryQuoteArgv,
  specstorySplitCommandLine,
  unwrapArgv,
  wrapArgv,
  type WrapInput
} from './wrap';

export {
  availableProviders,
  capturableAgents,
  CAPTURE_NOT_ON_ANOTHER_MACHINE,
  captureMatrix,
  captureRefusedOnMachine,
  captureSupportFor,
  parseProviderIds,
  parseProviderList,
  providerCatalog,
  providerIdFor,
  resetProviderCache,
  wrapWithRecord,
  specstoryRowFor,
  wrapForCapture,
  type CaptureMatrix,
  type CaptureSupport,
  type ProbedProvider,
  type ProviderCatalog,
  type SpecstoryCaptureRecord,
  type WrapResult
} from './capture';

export {
  SYNC_QUIT_TIMEOUT_MS,
  SYNC_TIMEOUT_MS,
  SyncQueue,
  syncArgv,
  syncSession,
  type SyncOutcome,
  type SyncRequest
} from './sync';

export {
  defaultSpecStoryStatusDeps,
  registerSpecStoryStatusIpc,
  type SpecStoryStatusDeps
} from './status-ipc';
