/**
 * The detail surface — public surface of the module.
 *
 * The view imports `ContextDetail`. The pure modules are exported because the
 * install flow, the hover card and the tests all read the same rules, and a
 * second copy of the secrets pattern or the audit sentence is exactly what the
 * growth guardrails forbid.
 *
 * Note what is NOT here. The trigger sentence is derived in main and rides on
 * `SkillPayload.trigger`, so this directory reads it and does not re-derive it.
 * The §4 types come from `../model`, which is the context stream's single
 * import point for them.
 */

export { ContextDetail } from './ContextDetail';
export type { ContextDetailMode, ContextDetailProps } from './ContextDetail';
export { CATEGORY_LABEL, DetailHeaderCard } from './DetailHeaderCard';
export type {
  AgentPrecedenceNote,
  DetailHeaderCardProps
} from './DetailHeaderCard';
export { CategoryRows } from './category-rows';
export type { CategoryRowsProps, McpCheckResult } from './category-rows';
export { PreviewCard } from './PreviewCard';
export type { PreviewCardProps } from './PreviewCard';

export {
  auditSentence,
  formatScanDate,
  isElevatedRisk,
  latestScanDate,
  missingScanners,
  riskRank,
  worstRisk
} from './audit';
export {
  checkPlanShape,
  formatCommandLine,
  formatShortCommand,
  quote
} from './command-line';
export type { PlanProblem } from './command-line';
export {
  commandFindings,
  executableClause,
  hasExecutableContent,
  hookFindings,
  scanPreview,
  scanRan,
  scanSkillBody,
  scriptFindings,
  whatRunsSentence
} from './executable-scan';
export {
  INSTALL_CONTROL_POSITION,
  PREVIEW_SECTION_ORDER,
  previewSections
} from './preview-sections';
export type {
  PreviewLine,
  PreviewSection,
  PreviewSectionId
} from './preview-sections';
export {
  blastRadiusSentence,
  driftSentence,
  reloadCommandFor,
  reloadLines
} from './reload-sentence';
export {
  hiddenValuesSentence,
  isSecretKey,
  MASK,
  maskEnv,
  maskFragment,
  maskInlineAssignment
} from './secrets';
export type { MaskedPair } from './secrets';

export type {
  AgentReload,
  AuditRecord,
  AuditRisk,
  InstallOperation,
  InstallPlan,
  InstallTarget,
  PinRecord,
  PreviewSubject,
  ScannerResult,
  SessionContext,
  TokenEstimate
} from './model';
