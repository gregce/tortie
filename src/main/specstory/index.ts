/**
 * SpecStory capture — the public surface of src/main/specstory.
 *
 * Five responsibilities, five modules:
 *  - resolve.ts  WHICH specstory binary, and where its state lives
 *  - auth.ts     is this Mac signed in to SpecStory Cloud (auth.json, cached)
 *  - wrap.ts     the argv composer (pure), including specstory's own quoting
 *  - capture.ts  whether an agent CAN be captured here, and the wrap+record
 *  - sync.ts     the session-end flush, its queue, and its honest failures
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
  captureSupportFor,
  parseProviderIds,
  resetProviderCache,
  wrapWithRecord,
  specstoryRowFor,
  wrapForCapture,
  type CaptureSupport,
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
