/**
 * The TypeScript shape of keep-map.json.
 *
 * The map is DATA. Every provider specific fact, being the predicates, the
 * field paths, the text transforms, the drop rules, the turn boundary and the
 * watermark kind, is a value in that file and never a branch in the engine.
 * A vendor change edits the JSON, not the code. Research 63 wrote the map and
 * this port keeps its shape, with the additions section 6 of the Phase 137
 * spec names, being per provider `version`, `skipWorthIt`, `meta`, `paths`,
 * drop rule `marks`, `marksIfNoAnswer` and `noticeFrom`, the codex
 * `turnFallback` block and the record level `marksRecords` block.
 */

/**
 * One predicate over a record, in the small expression language expr.ts
 * evaluates. The key is the operator name and the value its arguments.
 */
export type MapPredicate = Record<string, unknown>;

/** Where a slot's text comes from. */
export interface TextSpec {
  /** One string field, by dotted path. */
  field?: string;
  /** A parts array, by dotted path. Every kept part's `take` is joined. */
  parts?: string;
  /** Like `parts`, and a plain string value is taken whole. */
  stringOrParts?: string;
  /** Keep a part only when this predicate passes over the part. */
  partWhen?: MapPredicate;
  /** Drop a part when this predicate passes over the part. */
  dropPartWhen?: MapPredicate;
  /** The field read from each part. A dotted path is allowed. Default `text`. */
  take?: string;
  /** The joiner between parts. Default a newline. */
  join?: string;
  /** The first spec in the list that yields text wins. */
  firstOf?: TextSpec[];
}

/** Where a slot's clock comes from. */
export interface TimeSpec {
  path: string;
  format: 'iso' | 'epoch-ms' | 'epoch-us' | 'cursor-timestamp-tag';
}

/** One text transform, applied in order before the drop rules run. */
export interface TransformOp {
  op:
    | 'between'
    | 'cutAt'
    | 'afterMarker'
    | 'afterLast'
    | 'stripPrefix'
    | 'stripSuffix'
    | 'stripLines'
    | 'commandEcho';
  open?: string;
  close?: string;
  keepWholeIfMissing?: boolean;
  marker?: string;
  onlyIfStartsWith?: string[];
  minLength?: number;
  prefixes?: string[];
  suffixes?: string[];
  nameTag?: string;
  argsTag?: string;
  dropCommands?: string[];
}

/** One drop rule. The reason is part of the data so a count can name it. */
export interface DropRule {
  reason: string;
  when: MapPredicate;
  /**
   * When the rule fires inside an open turn, mark that turn interrupted.
   * claude's interrupt marker and codex's turn_aborted carry this.
   */
  marks?: 'interrupted';
  /**
   * Like `marks`, and the mark only lands if the turn closes with no answer.
   * pi's narration rule and deepseek's unfinished turn rule carry this,
   * because both fire on records inside turns that often go on to answer.
   */
  marksIfNoAnswer?: 'interrupted';
  /**
   * Store the dropped text as the open turn's notice. claude's `<synthetic>`
   * answers carry the CLI's own words, e.g. a usage limit, and the page shows
   * them as a note about the session and never as what the agent said.
   */
  noticeFrom?: '_text';
}

/** One slot, being the ask side or the answer side. */
export interface SlotCfg {
  when: MapPredicate;
  text: TextSpec;
  time: TimeSpec | null;
  transform?: TransformOp[];
  drop?: DropRule[];
}

/** One raw byte prefilter rule, tested before JSON.parse. */
export interface PrefilterRule {
  class?: string;
  head: string;
  rejectHead?: string[];
  requireAnywhere?: string[];
  rejectAnywhere?: string[];
}

export interface Prefilter {
  headBytes?: number;
  rules: PrefilterRule[];
}

/** The turn boundary block. */
export interface TurnCfg {
  open: 'ask' | MapPredicate;
  close?: 'nextAskOr' | 'sameElement' | MapPredicate;
  alsoCloseWhen?: MapPredicate;
  pick?: 'last-answer-before-close' | 'close-answer-else-last-answer' | 'same-element';
  answerFrom?: TextSpec;
  dropTurnsWithNoAsk?: boolean;
  carry?: Record<string, string>;
  /**
   * muse only. When the close record's carried stopReason is non null the
   * turn is interrupted and the reason is its notice.
   */
  reasonMeansInterrupted?: boolean;
  reason?: string;
}

/**
 * The codex vintage fallback, Phase 137 defect 4. cli 0.87 and earlier writes
 * no task_started and no task_complete, so the boundary is the next ask and
 * the answer is the last agent_message before it.
 */
export interface TurnFallback {
  mode: 'ask-to-ask';
  /** Dotted path on the meta record that holds the CLI version. */
  cliVersionField: string;
  /** Run the fallback up front when the version is below this. */
  whenBelow: string;
}

/**
 * A record that never becomes an ask or an answer and still marks the open
 * turn, e.g. codex's `<turn_aborted>` response_item. Evaluated before the
 * provider filter, because the filter usually excludes the record's type.
 */
export interface MarksRecordRule {
  when: MapPredicate;
  text?: TextSpec;
  startsWith?: string;
  marks: 'interrupted';
}

/** One tool call source for the path index. */
export interface PathsFrom {
  /** A parts array on the record, by dotted path. */
  parts?: string;
  /** Or one string field on the record. */
  field?: string;
  partWhen?: MapPredicate;
  /** The field read from each kept part. A dotted path is allowed. */
  take?: string;
  source: 'command' | 'tool';
}

/** The path index block, section 6.5 of the spec. */
export interface PathsCfg {
  /** An extra prefilter rule so tool call lines survive the byte skip. */
  prefilter?: PrefilterRule;
  when: MapPredicate;
  from: PathsFrom[];
}

/** Where the session's model and branch are read from. */
export interface MetaCfg {
  /** Dotted path on a KEPT answer record. */
  model?: string;
  /** Dotted path on a KEPT ask record. */
  branch?: string;
}

export interface JoinCfg {
  resolve?: string;
  cwdField?: string;
  sessionIdField?: string;
  metaRecord?: MapPredicate;
  reject?: MapPredicate;
  [extra: string]: unknown;
}

export interface WatermarkCfg {
  kind?: string;
  invalidateOn?: string[];
  [extra: string]: unknown;
}

export interface RootBlobCfg {
  encoding: string;
  entryPrefixHex: string;
  digestBytes: number;
}

export interface OpenCfg {
  mode: string;
  immutable: boolean;
  reason?: string;
  checkWalFirst?: boolean;
}

export interface ProviderMapEntry {
  /** Bumped when the provider's rules change, so stored watermarks retire. */
  version: number;
  status: string;
  container: 'jsonl' | 'json-doc' | 'sqlite-cursor' | 'sqlite-cursoride' | 'none';
  store?: string;
  launchable?: boolean;
  join?: JoinCfg;
  watermark?: WatermarkCfg;
  prefilter?: Prefilter;
  /**
   * False switches the raw byte skip off for this provider. Research 63
   * section 17 measured the skip at 0.58x for gemini, 0.72x for deepseek and
   * 0.94x for copilotide, so for those three it is a loss.
   */
  skipWorthIt?: boolean;
  filter?: MapPredicate;
  ask?: SlotCfg;
  answer?: SlotCfg;
  turn?: TurnCfg;
  turnFallback?: TurnFallback;
  marksRecords?: MarksRecordRule[];
  quirks?: string[];
  honest?: string;
  docStopAt?: string;
  messagesPath?: string;
  unwrap?: string;
  turnPerElement?: boolean;
  open?: OpenCfg;
  rootBlob?: RootBlobCfg;
  blobProbeBytes?: number;
  bubbleKey?: string;
  orderPath?: string[];
  paths?: PathsCfg;
  meta?: MetaCfg;
  unverifiedShape?: unknown;
}

export interface KeepMap {
  mapVersion: number;
  note?: string;
  slots: string[];
  providers: Record<string, ProviderMapEntry>;
}

/** The name the rest of the reader uses for one provider's block. */
export type ProviderMap = ProviderMapEntry;
