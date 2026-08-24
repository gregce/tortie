/**
 * How each agent's one shot output is read (Phase 138.1).
 *
 * Phase 138 shipped one reader, and it read claude's `stream-json`. Every
 * other agent prints a different shape, so the parse is now a field on the
 * recipe and lives here beside the row that names it. Nothing in this file
 * spawns anything. It takes the bytes a child already wrote and says what
 * they mean.
 *
 * EVERY READER WAS WRITTEN AGAINST A REAL CAPTURED RUN rather than against a
 * help page. The shape each one expects is quoted in the comment above it, so
 * a later round can tell an upgrade from a mistake.
 *
 * A reader never throws. A shape it does not recognise comes back with
 * `sawResult` false, which the caller turns into the `bad-output` outcome and
 * a row a person can read.
 */

/**
 * The live rate window, when the agent reports one. Only claude does, and
 * gate one proved that message arrives on every invocation before the result.
 * Every other reader returns null here, so folding under those agents rests
 * on the three failure rule alone. That is a stated limit.
 */
export interface FoldRateWindow {
  status: string;
  limitType: string;
  utilization: number;
  resetsAtMs: number | null;
}

/** What one reader got out of one child's output. */
export interface FoldReading {
  /** The candidate sentence. Null when the output carried none. */
  text: string | null;
  /** True when the CLI said the run itself failed. */
  isError: boolean;
  /** The CLI's own short name for the error shape, when it gave one. */
  subtype: string | null;
  /** The HTTP status the CLI reported, when it reported one. */
  apiErrorStatus: number | null;
  /** What the CLI said this cost. Recorded for diagnostics and never drawn. */
  costUsd: number | null;
  /** The rate window, when this agent reports one. */
  window: FoldRateWindow | null;
  /** True when the reader found the record that carries the answer. */
  sawResult: boolean;
}

/** One reader. It is given stdout and it never throws. */
export type FoldReader = (stdout: string) => FoldReading;

const EMPTY: FoldReading = {
  text: null,
  isError: false,
  subtype: null,
  apiErrorStatus: null,
  costUsd: null,
  window: null,
  sawResult: false
};

function blank(): FoldReading {
  return { ...EMPTY };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Milliseconds from either an epoch seconds number or an ISO string. */
function asResetMs(value: unknown): number | null {
  const num = asNumber(value);
  if (num !== null) return num > 1e11 ? num : num * 1_000;
  const text = asString(value);
  if (text === null) return null;
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Every line that parses as a JSON object, in order. Anything else is dropped. */
function jsonLines(stdout: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const line of stdout.split('\n')) {
    const text = line.trim();
    if (text === '' || !text.startsWith('{')) continue;
    try {
      const record = asRecord(JSON.parse(text));
      if (record !== null) out.push(record);
    } catch {
      continue;
    }
  }
  return out;
}

/**
 * The whole of stdout as one JSON value, ignoring any notice printed before
 * it. grok pretty prints its answer over many lines, so the line reader above
 * cannot see it.
 */
function wholeJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  for (const opener of ['{', '[']) {
    const start = trimmed.indexOf(opener);
    if (start < 0) continue;
    const closer = opener === '{' ? '}' : ']';
    const end = trimmed.lastIndexOf(closer);
    if (end <= start) continue;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      continue;
    }
  }
  return null;
}

/** Join the text parts of a content array, which is the pi and cursor shape. */
function joinContent(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const parts: string[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (record === null) continue;
    if (record['type'] !== 'text') continue;
    const text = asString(record['text']);
    if (text !== null) parts.push(text);
  }
  return parts.length === 0 ? null : parts.join('');
}

// ---------------------------------------------------------------------------
// claude
// ---------------------------------------------------------------------------

/**
 * The window, read out of whichever member carries it.
 *
 * MEASURED ON 2026-08-23 rather than guessed. The CLI writes the message as
 * `{"type":"rate_limit_event","rate_limit_info":{"status":"allowed_warning",
 * "resetsAt":1788076800,"rateLimitType":"seven_day","utilization":0.36}}`, so
 * the payload is nested under `rate_limit_info` and its keys are camel case.
 * The snake case names and the outer position are kept beside them because a
 * CLI upgrade may move it back, and reading both costs one property lookup.
 */
function readRateWindow(
  message: Record<string, unknown>
): FoldRateWindow | null {
  const event =
    asRecord(message['rate_limit_info']) ??
    asRecord(message['rate_limit_event']) ??
    message;
  const status = asString(event['status']);
  if (status === null) return null;
  return {
    status,
    limitType:
      asString(event['rateLimitType']) ??
      asString(event['limit_type']) ??
      asString(event['limitType']) ??
      '',
    utilization:
      asNumber(event['utilization']) ?? asNumber(event['used_percent']) ?? 0,
    resetsAtMs:
      asResetMs(event['resetsAt']) ??
      asResetMs(event['resets_at']) ??
      asResetMs(event['unified_rate_limit_reset']) ??
      null
  };
}

/**
 * claude's `--output-format stream-json`.
 *
 * Two lines matter. The `rate_limit_event` carries the live window state, and
 * the `result` carries the sentence, the error shape and the reported cost.
 * Every other line is ignored, including every line that is not JSON at all,
 * because a CLI is free to print a notice.
 */
export const readClaudeStream: FoldReader = (stdout) => {
  const out = blank();
  for (const message of jsonLines(stdout)) {
    const type = asString(message['type']);
    if (
      type === 'rate_limit_event' ||
      message['rate_limit_info'] !== undefined ||
      message['rate_limit_event'] !== undefined
    ) {
      const window = readRateWindow(message);
      if (window !== null) out.window = window;
      if (type === 'rate_limit_event') continue;
    }
    if (type !== 'result') continue;
    out.sawResult = true;
    out.text = asString(message['result']);
    out.isError = message['is_error'] === true;
    out.subtype = asString(message['subtype']);
    out.apiErrorStatus =
      asNumber(message['api_error_status']) ??
      asNumber(message['apiErrorStatus']);
    out.costUsd =
      asNumber(message['total_cost_usd']) ?? asNumber(message['totalCostUsd']);
  }
  return out;
};

// ---------------------------------------------------------------------------
// codex
// ---------------------------------------------------------------------------

/**
 * codex's `--json`, being JSONL. Captured on 2026-08-23:
 * `{"type":"item.completed","item":{"id":"item_0","type":"agent_message",
 * "text":"They renamed a config file."}}` followed by
 * `{"type":"turn.completed","usage":{...}}`.
 *
 * The usage record carries token counts and NO dollar figure, so `costUsd`
 * is null for every codex fold. That is the CLI's own limit and it is stated
 * on the row in recipes.ts rather than papered over with an estimate.
 */
export const readCodexJson: FoldReader = (stdout) => {
  const out = blank();
  for (const message of jsonLines(stdout)) {
    const type = asString(message['type']);
    if (type === 'item.completed') {
      const item = asRecord(message['item']);
      if (item === null || item['type'] !== 'agent_message') continue;
      out.text = asString(item['text']);
      out.sawResult = true;
      continue;
    }
    if (type === 'turn.failed' || type === 'error') {
      out.sawResult = true;
      out.isError = true;
      const error = asRecord(message['error']) ?? message;
      out.subtype = asString(error['type']) ?? asString(error['message']);
      out.apiErrorStatus = asNumber(error['status']) ?? asNumber(error['code']);
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// cursor
// ---------------------------------------------------------------------------

/**
 * cursor's `--output-format json`, being one object. Captured on 2026-08-23:
 * `{"type":"result","subtype":"success","is_error":false,"duration_ms":3563,
 * "result":"They changed the name of a configuration file.",
 * "usage":{"inputTokens":2741,"outputTokens":9,"cacheReadTokens":19415}}`.
 *
 * The record names its own fields the way claude's result record does, and it
 * carries no dollar figure, so `costUsd` is null for every cursor fold.
 */
export const readCursorJson: FoldReader = (stdout) => {
  const out = blank();
  const record = asRecord(wholeJson(stdout));
  if (record === null) return out;
  if (record['result'] === undefined && record['type'] !== 'result') return out;
  out.sawResult = true;
  out.text = asString(record['result']) ?? joinContent(record['content']);
  out.isError = record['is_error'] === true;
  const subtype = asString(record['subtype']);
  out.subtype = subtype === 'success' ? null : subtype;
  return out;
};

// ---------------------------------------------------------------------------
// grok
// ---------------------------------------------------------------------------

/**
 * grok's `--output-format json`, being one PRETTY PRINTED object, which is
 * why this reader parses the whole of stdout rather than one line at a time.
 * Captured on 2026-08-23:
 * `{"text":"They renamed a configuration file.","stopReason":"end_turn",
 * "usage":{"input_tokens":14203,...},"total_cost_usd":0.00543116}`.
 *
 * grok is the only agent besides claude that reports what a run cost.
 */
export const readGrokJson: FoldReader = (stdout) => {
  const out = blank();
  const record = asRecord(wholeJson(stdout));
  if (record === null) return out;
  const error = asRecord(record['error']);
  if (error !== null) {
    out.sawResult = true;
    out.isError = true;
    out.subtype = asString(error['type']) ?? asString(error['message']);
    out.apiErrorStatus = asNumber(error['status']) ?? asNumber(error['code']);
    return out;
  }
  const text = asString(record['text']) ?? joinContent(record['content']);
  if (text === null) return out;
  out.sawResult = true;
  out.text = text;
  out.costUsd =
    asNumber(record['total_cost_usd']) ?? asNumber(record['totalCostUsd']);
  const stop = asString(record['stopReason']);
  if (stop !== null && stop !== 'end_turn' && stop !== 'stop') {
    out.subtype = stop;
  }
  return out;
};

// ---------------------------------------------------------------------------
// pi
// ---------------------------------------------------------------------------

/**
 * pi's `--mode json`, being NDJSON. Captured on 2026-08-23: the answer, the
 * token counts and the cost all sit on the `turn_end` record, as
 * `{"type":"turn_end","message":{"role":"assistant","content":[{"type":
 * "text","text":"..."}],"usage":{"input":89,"output":13,"cost":{"total":
 * 0.000050025}}}}`. The assistant's own `message_end` carries the same
 * fields and is read as the fallback.
 *
 * pi reports the cost of a fold to nine decimal places, which is the finest
 * figure any of the five recipes gives.
 */
export const readPiNdjson: FoldReader = (stdout) => {
  const out = blank();
  for (const record of jsonLines(stdout)) {
    const type = asString(record['type']);
    if (type === 'error' || record['error'] !== undefined) {
      const error = asRecord(record['error']) ?? record;
      out.sawResult = true;
      out.isError = true;
      out.subtype = asString(error['type']) ?? asString(error['message']);
      out.apiErrorStatus = asNumber(error['status']) ?? asNumber(error['code']);
      continue;
    }
    if (type !== 'turn_end' && type !== 'message_end') continue;
    const message = asRecord(record['message']);
    if (message === null || message['role'] !== 'assistant') continue;
    const text = joinContent(message['content']);
    if (text === null) continue;
    out.sawResult = true;
    out.isError = false;
    out.text = text;
    const usage = asRecord(message['usage']);
    const cost = usage === null ? null : asRecord(usage['cost']);
    out.costUsd = cost === null ? null : asNumber(cost['total']);
  }
  return out;
};
