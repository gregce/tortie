/**
 * Conformance harnesses — executable versions of the claims the registry
 * makes about agent CLIs.
 *
 * Today there is one: resume conformance (Phase 13.5 item 5). It exists
 * because "this agent can be resumed" was prose for nine agents and wrong for
 * two of them, and prose does not fail CI.
 *
 * Shape, four files, one responsibility each:
 *   ./cases    per-agent data the registry does not carry (bypass flags, the
 *              pattern libraries, the two prompts)
 *   ./pane     driving a tmux pane that contains a TUI, and reading it back
 *   ./scratch  the sessions the harness owns — and the kill guard
 *   ./report   result shapes, nonce algebra, table + JSON rendering (pure)
 *   ./resume   the run itself
 */

export { runResumeConformance } from './resume';

export { CONF_PREFIX, SCRATCH_ROOT } from './scratch';

export {
  containsJoined,
  containsToken,
  exitCodeFor,
  makeNonce,
  normalizeForToken,
  renderDetail,
  renderSummary,
  renderTable,
  type AgentConformanceResult,
  type ConformanceRun,
  type ConformanceStage,
  type ConformanceVerdict,
  type RecallStrength
} from './report';

export {
  ARGV_REJECTED_PATTERNS,
  BYPASS_FLAGS,
  INTERACTIVE_GATE_PATTERNS,
  SELECTED_AFFIRMATIVE,
  TRUST_DIALOG_PATTERNS,
  assertBypassFlagsAreCataloged,
  firstMatch,
  plantPrompt,
  recallPrompt
} from './cases';
