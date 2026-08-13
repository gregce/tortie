/**
 * JSON with comments and trailing commas, which is what several of these
 * files actually are.
 *
 * `~/.cursor/mcp.json`, `~/.gemini/settings.json`, `.mcp.json` and
 * `~/.claude/settings.json` are documented as JSON and edited by hand, and
 * Amp and OpenCode ship `.jsonc` variants outright. `JSON.parse` on a file
 * with one `//` line in it throws, and a thrown parse blanks a section of the
 * panel for a reason the user cannot see. So comments and trailing commas are
 * removed before parsing, in a pass that respects string literals.
 *
 * The failure carries a LINE, because §11 item 4 wants
 * ".mcp.json could not be read — line 12" to open the editor at that line.
 */

export interface JsoncResult<T = unknown> {
  value: T | null;
  problem: { line: number; message: string } | null;
}

/** Replace comments with spaces (so byte offsets survive) and drop trailing commas. */
export function stripJsonc(text: string): string {
  const out = text.split('');
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inLine) {
      if (char === '\n') inLine = false;
      else out[i] = ' ';
      continue;
    }
    if (inBlock) {
      if (char === '*' && next === '/') {
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 1;
        inBlock = false;
      } else if (char !== '\n') {
        out[i] = ' ';
      }
      continue;
    }
    if (inString) {
      if (char === '\\') i += 1;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '/' && next === '/') {
      out[i] = ' ';
      out[i + 1] = ' ';
      i += 1;
      inLine = true;
      continue;
    }
    if (char === '/' && next === '*') {
      out[i] = ' ';
      out[i + 1] = ' ';
      i += 1;
      inBlock = true;
      continue;
    }
  }
  // A trailing comma before `}` or `]`, with only whitespace between.
  return out.join('').replace(/,(\s*[}\]])/g, ' $1');
}

/** 1-based line for a character offset. */
function lineAt(text: string, offset: number): number {
  let line = 1;
  const limit = Math.min(offset, text.length);
  for (let i = 0; i < limit; i += 1) if (text[i] === '\n') line += 1;
  return line;
}

/**
 * The line a parse failed on, which §11 needs so the message can open the
 * editor at it.
 *
 * V8 has said this three different ways. Older runtimes report
 * `at position 39`, some report `line 4 column 3`, and Node 24 reports
 * neither: its message quotes a window of the source around the failure and
 * says `… is not valid JSON`. All three are read, and the last one is located
 * by finding that window in the text. A wrong line is better than no line
 * here, and no line is what a reader that only knew the first two forms would
 * produce on the runtime this app actually ships.
 */
function lineFromError(error: unknown, text: string): number {
  const message = error instanceof Error ? error.message : String(error);
  const direct = /line (\d+)/i.exec(message);
  if (direct && direct[1]) return Number.parseInt(direct[1], 10);
  const position = /position (\d+)/i.exec(message);
  if (position && position[1]) return lineAt(text, Number.parseInt(position[1], 10));
  const window = /"([\s\S]*)" is not valid JSON/.exec(message);
  const snippet = window?.[1]?.replace(/^\.\.\./, '').replace(/\.\.\.$/, '');
  if (snippet && snippet.length > 3) {
    const offset = text.indexOf(snippet);
    if (offset >= 0) return lineAt(text, offset);
  }
  return 1;
}

export function parseJsonc<T = unknown>(text: string, fileLabel: string): JsoncResult<T> {
  if (text.trim() === '') return { value: null, problem: null };
  // Strict JSON first. `~/.claude.json` is 1.17 MB on this machine and the
  // comment stripper walks it character by character, so paying for that pass
  // on a file that has no comments in it is most of the cost of a refresh.
  try {
    return { value: JSON.parse(text) as T, problem: null };
  } catch {
    // Fall through to the tolerant path.
  }
  const stripped = stripJsonc(text);
  if (stripped.trim() === '') return { value: null, problem: null };
  try {
    return { value: JSON.parse(stripped) as T, problem: null };
  } catch (error) {
    return {
      value: null,
      problem: {
        line: lineFromError(error, stripped),
        message: `${fileLabel} could not be read.`
      }
    };
  }
}

// ---------------------------------------------------------------------------
// Shape readers — callers never hand-check `unknown`
// ---------------------------------------------------------------------------

export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * Follow a dotted path, and also accept the DOTTED KEY as a literal. Amp
 * writes `"amp.mcpServers"` as one key inside `settings.json` rather than
 * nesting an object, so a reader that only walks nested objects finds nothing.
 */
export function dig(root: JsonRecord | null, path: string): unknown {
  if (!root) return undefined;
  if (path in root) return root[path];
  let current: unknown = root;
  for (const part of path.split('.')) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[part];
  }
  return current;
}
