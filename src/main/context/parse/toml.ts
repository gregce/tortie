/**
 * The TOML subset that `~/.codex/config.toml` and `~/.deepseek/config.toml`
 * use.
 *
 * The operator's `config.toml` is 9,710 lines, and three of the five
 * categories live inside it: `[mcp_servers.<name>]`, `[plugins."<n>@<mkt>"]`
 * and `[hooks.state."<plugin>@<mkt>:hooks/<file>.json:<event>:<i>:<j>"]` with
 * a `trusted_hash`. It also holds 2,000 `[projects."…"]` tables Tortie has no
 * use for, so this parser is written to walk the whole file cheaply rather
 * than to be complete.
 *
 * Supported: table headers, array-of-table headers, dotted and quoted keys,
 * basic and literal strings, multi-line strings, integers, floats, booleans,
 * arrays and inline tables. Dates come back as their source string, because
 * nothing here needs a Date and turning one into an object would be a lie
 * about how much this parser understands.
 *
 * Writing TOML is explicitly deferred (research 29 §13.3). This file reads.
 */

export type TomlValue = string | number | boolean | TomlValue[] | TomlTable;
export interface TomlTable {
  [key: string]: TomlValue;
}

export interface TomlResult {
  value: TomlTable;
  /** The first line that would not parse. The rest of the file is still read. */
  problem: { line: number; message: string } | null;
}

function isBareKeyChar(char: string): boolean {
  return /[A-Za-z0-9_-]/.test(char);
}

/** Read one key, bare or quoted, starting at `i`. */
function readKey(text: string, i: number): { key: string; next: number } | null {
  const quote = text[i];
  if (quote === '"' || quote === "'") {
    let out = '';
    let j = i + 1;
    while (j < text.length) {
      const char = text[j];
      if (char === undefined) break;
      if (quote === '"' && char === '\\') {
        out += unescapeBasic(text[j + 1] ?? '');
        j += 2;
        continue;
      }
      if (char === quote) return { key: out, next: j + 1 };
      out += char;
      j += 1;
    }
    return null;
  }
  let j = i;
  let out = '';
  while (j < text.length && isBareKeyChar(text[j] ?? '')) {
    out += text[j];
    j += 1;
  }
  return out === '' ? null : { key: out, next: j };
}

/** A dotted key path: `a.b."c d"`. */
function readKeyPath(text: string, start: number): { path: string[]; next: number } | null {
  const path: string[] = [];
  let i = start;
  for (;;) {
    while (text[i] === ' ' || text[i] === '\t') i += 1;
    const key = readKey(text, i);
    if (!key) return null;
    path.push(key.key);
    i = key.next;
    while (text[i] === ' ' || text[i] === '\t') i += 1;
    if (text[i] !== '.') return { path, next: i };
    i += 1;
  }
}

function unescapeBasic(char: string): string {
  switch (char) {
    case 'n':
      return '\n';
    case 't':
      return '\t';
    case 'r':
      return '\r';
    case '"':
      return '"';
    case '\\':
      return '\\';
    case '0':
      return '\0';
    default:
      return char;
  }
}

interface ValueRead {
  value: TomlValue;
  next: number;
}

function readString(text: string, i: number): ValueRead | null {
  const quote = text[i];
  if (quote !== '"' && quote !== "'") return null;
  const triple = text.slice(i, i + 3) === quote.repeat(3);
  if (triple) {
    const close = text.indexOf(quote.repeat(3), i + 3);
    if (close < 0) return null;
    let body = text.slice(i + 3, close);
    if (body.startsWith('\n')) body = body.slice(1);
    else if (body.startsWith('\r\n')) body = body.slice(2);
    return { value: quote === '"' ? unescapeAll(body) : body, next: close + 3 };
  }
  let out = '';
  let j = i + 1;
  while (j < text.length) {
    const char = text[j];
    if (char === undefined || char === '\n') return null;
    if (quote === '"' && char === '\\') {
      out += unescapeBasic(text[j + 1] ?? '');
      j += 2;
      continue;
    }
    if (char === quote) return { value: out, next: j + 1 };
    out += char;
    j += 1;
  }
  return null;
}

function unescapeAll(body: string): string {
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === '\\') {
      out += unescapeBasic(body[i + 1] ?? '');
      i += 1;
      continue;
    }
    out += body[i];
  }
  return out;
}

function skipSpace(text: string, i: number): number {
  let j = i;
  while (j < text.length) {
    const char = text[j];
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      j += 1;
      continue;
    }
    if (char === '#') {
      while (j < text.length && text[j] !== '\n') j += 1;
      continue;
    }
    break;
  }
  return j;
}

function readValue(text: string, start: number, depth: number): ValueRead | null {
  if (depth > 24) return null;
  let i = start;
  while (text[i] === ' ' || text[i] === '\t') i += 1;
  const char = text[i];
  if (char === undefined) return null;
  if (char === '"' || char === "'") return readString(text, i);
  if (char === '[') {
    const items: TomlValue[] = [];
    let j = skipSpace(text, i + 1);
    while (j < text.length && text[j] !== ']') {
      const item = readValue(text, j, depth + 1);
      if (!item) return null;
      items.push(item.value);
      j = skipSpace(text, item.next);
      if (text[j] === ',') j = skipSpace(text, j + 1);
    }
    return { value: items, next: j + 1 };
  }
  if (char === '{') {
    const table: TomlTable = {};
    let j = i + 1;
    while (j < text.length) {
      while (text[j] === ' ' || text[j] === '\t') j += 1;
      if (text[j] === '}') return { value: table, next: j + 1 };
      const key = readKeyPath(text, j);
      if (!key) return null;
      j = key.next;
      while (text[j] === ' ' || text[j] === '\t') j += 1;
      if (text[j] !== '=') return null;
      const item = readValue(text, j + 1, depth + 1);
      if (!item) return null;
      setPath(table, key.path, item.value);
      j = item.next;
      while (text[j] === ' ' || text[j] === '\t') j += 1;
      if (text[j] === ',') j += 1;
    }
    return null;
  }
  // Bare token: boolean, number, or a date left as a string.
  let j = i;
  while (j < text.length && !'\n\r,]}#'.includes(text[j] ?? '')) j += 1;
  const token = text.slice(i, j).trim();
  if (token === '') return null;
  if (token === 'true') return { value: true, next: j };
  if (token === 'false') return { value: false, next: j };
  if (/^[+-]?\d[\d_]*$/.test(token)) {
    return { value: Number.parseInt(token.replace(/_/g, ''), 10), next: j };
  }
  if (/^[+-]?(\d[\d_]*)?\.\d[\d_]*([eE][+-]?\d+)?$/.test(token) || /^[+-]?\d+[eE][+-]?\d+$/.test(token)) {
    return { value: Number.parseFloat(token.replace(/_/g, '')), next: j };
  }
  return { value: token, next: j };
}

function setPath(root: TomlTable, path: string[], value: TomlValue): void {
  let table = root;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (key === undefined) return;
    const existing = table[key];
    if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
      table = existing;
      continue;
    }
    if (Array.isArray(existing)) {
      const last = existing[existing.length - 1];
      if (last && typeof last === 'object' && !Array.isArray(last)) {
        table = last;
        continue;
      }
    }
    const fresh: TomlTable = {};
    table[key] = fresh;
    table = fresh;
  }
  const leaf = path[path.length - 1];
  if (leaf !== undefined) table[leaf] = value;
}

function tableAt(root: TomlTable, path: string[], asArray: boolean): TomlTable {
  let table = root;
  for (let i = 0; i < path.length; i += 1) {
    const key = path[i];
    if (key === undefined) break;
    const last = i === path.length - 1;
    const existing = table[key];
    if (last && asArray) {
      const list = Array.isArray(existing) ? existing : [];
      const fresh: TomlTable = {};
      list.push(fresh);
      table[key] = list;
      return fresh;
    }
    if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
      table = existing;
      continue;
    }
    if (Array.isArray(existing)) {
      const tail = existing[existing.length - 1];
      if (tail && typeof tail === 'object' && !Array.isArray(tail)) {
        table = tail;
        continue;
      }
    }
    const fresh: TomlTable = {};
    table[key] = fresh;
    table = fresh;
  }
  return table;
}

export function parseToml(text: string, fileLabel: string): TomlResult {
  const root: TomlTable = {};
  let current = root;
  let problem: TomlResult['problem'] = null;
  let line = 1;
  let i = 0;

  const fail = (message: string): void => {
    if (!problem) problem = { line, message: `${fileLabel} ${message}` };
  };
  const advanceTo = (target: number): void => {
    for (let j = i; j < target && j < text.length; j += 1) if (text[j] === '\n') line += 1;
    i = Math.max(i, target);
  };
  const skipLine = (): void => {
    while (i < text.length && text[i] !== '\n') i += 1;
    if (i < text.length) {
      i += 1;
      line += 1;
    }
  };

  while (i < text.length) {
    const char = text[i];
    if (char === '\n') {
      line += 1;
      i += 1;
      continue;
    }
    if (char === ' ' || char === '\t' || char === '\r') {
      i += 1;
      continue;
    }
    if (char === '#') {
      skipLine();
      continue;
    }
    if (char === '[') {
      const isArray = text[i + 1] === '[';
      const key = readKeyPath(text, i + (isArray ? 2 : 1));
      if (!key) {
        fail('has a table header Tortie could not read.');
        skipLine();
        continue;
      }
      let j = key.next;
      while (text[j] === ' ' || text[j] === '\t') j += 1;
      const closer = isArray ? ']]' : ']';
      if (text.slice(j, j + closer.length) !== closer) {
        fail('has a table header Tortie could not read.');
        skipLine();
        continue;
      }
      current = tableAt(root, key.path, isArray);
      advanceTo(j + closer.length);
      continue;
    }
    const key = readKeyPath(text, i);
    if (!key) {
      fail('has a line that is not a key and a value.');
      skipLine();
      continue;
    }
    let j = key.next;
    while (text[j] === ' ' || text[j] === '\t') j += 1;
    if (text[j] !== '=') {
      fail('has a line that is not a key and a value.');
      skipLine();
      continue;
    }
    const value = readValue(text, j + 1, 0);
    if (!value) {
      fail('has a value Tortie could not read.');
      skipLine();
      continue;
    }
    setPath(current, key.path, value.value);
    advanceTo(value.next);
  }
  return { value: root, problem };
}

// ---------------------------------------------------------------------------
// Shape readers
// ---------------------------------------------------------------------------

export function tomlTable(value: TomlValue | undefined): TomlTable | null {
  return value !== undefined && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

export function tomlString(value: TomlValue | undefined): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function tomlBoolean(value: TomlValue | undefined): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export function tomlStringArray(value: TomlValue | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
