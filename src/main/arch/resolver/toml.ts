/**
 * The TOML lexer both packaging readers share (Phase 157).
 *
 * WHY THIS MODULE EXISTS. `Cargo.toml` is TOML and `pyproject.toml` is TOML,
 * and Phase 157's Rust and Python arms were built in parallel, so each one
 * arrived with its own hand written scanner. The duplicate scan found the same
 * quote tracking loop written NINE times across the two files, and
 * `stripComment` written twice at eight identical lines. Everything lexical is
 * here now, and each reader keeps only the part that is about ITS OWN format's
 * shape: which tables and which keys it wants.
 *
 * ONE BEHAVIOUR MOVED WHEN THEY MERGED, and it moved in the safe direction.
 * The Rust side's comment stripper did not understand `\"`, so a Cargo value
 * such as `description = "a \"#\" sign"` lost its tail. The Python side's did.
 * The escape aware one is what survived, so the Rust reader gained a correction
 * rather than losing one.
 *
 * WHAT THIS IS NOT. It is not a TOML parser and it must never become one. It
 * handles a quoted string, an array of quoted strings, a single line inline
 * table of quoted strings and a dotted key path. Multi line basic strings,
 * escapes beyond `\"`, and nested inline tables are not handled, and a value a
 * reader cannot read is DROPPED rather than guessed at. Adding a package to
 * parse TOML properly is refused by CLAUDE.md's third party code rules and by
 * this phase's own "no new npm package".
 *
 * THIS MODULE IS A LEAF. It imports nothing at all.
 */

/**
 * A `#` comment removed, but never one inside a quoted string.
 *
 * The escape rule is `\"` inside a basic string only, which is TOML's own rule
 * and is the one difference between the two scanners this replaced.
 */
export function stripTomlComment(line: string): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote !== null) {
      if (ch === '\\' && quote === '"') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '#') return line.slice(0, i);
  }
  return line;
}

/**
 * A table name or key path split into its segments, quotes taken off each.
 *
 * The split is on dots OUTSIDE a quoted segment, which is TOML's own rule and
 * is not a nicety: Poetry writes `"ruamel.yaml" = "*"` and a naive split on
 * every dot turns that one dependency into a table nobody reads. That was a
 * real defect in the first build of the Python reader and this is where its fix
 * lives now.
 */
export function splitKeyPath(raw: string): string[] {
  const out: string[] = [];
  let quote: string | null = null;
  let from = 0;
  for (let i = 0; i <= raw.length; i += 1) {
    const ch = i === raw.length ? '.' : raw[i];
    if (quote !== null) {
      if (ch === '\\' && quote === '"') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch !== '.') continue;
    out.push(unquote(raw.slice(from, i).trim()));
    from = i + 1;
  }
  return out.filter((segment) => segment.length > 0);
}

/** One matched pair of quotes taken off a segment, or the segment unchanged. */
export function unquote(piece: string): string {
  const first = piece[0];
  if (
    piece.length >= 2 &&
    (first === '"' || first === "'") &&
    piece[piece.length - 1] === first
  ) {
    return piece.slice(1, -1);
  }
  return piece;
}

/** Every quoted string in one stretch of TOML, in the order they appear. */
export function stringLiterals(text: string): string[] {
  const out: string[] = [];
  let quote: string | null = null;
  let start = 0;
  let buffer = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote === null) {
      if (ch === '"' || ch === "'") {
        quote = ch;
        start = i + 1;
        buffer = '';
      }
      continue;
    }
    if (ch === '\\' && quote === '"') {
      buffer += text.slice(start, i) + (text[i + 1] ?? '');
      i += 1;
      start = i + 1;
      continue;
    }
    if (ch === quote) {
      out.push(buffer + text.slice(start, i));
      quote = null;
      buffer = '';
    }
  }
  return out;
}

/** Split on commas that are not inside a quoted string. Empty pieces are dropped. */
export function splitTopLevelCommas(text: string): string[] {
  const out: string[] = [];
  let quote: string | null = null;
  let from = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote !== null) {
      if (ch === '\\' && quote === '"') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ',') {
      out.push(text.slice(from, i));
      from = i + 1;
    }
  }
  out.push(text.slice(from));
  return out.filter((piece) => piece.trim().length > 0);
}

/**
 * The bracket depth after reading `text`, starting from `start`.
 *
 * An array may run over several lines, so a reader keeps pulling lines in until
 * this returns to zero.
 */
export function bracketDepth(text: string, start: number): number {
  let depth = start;
  let quote: string | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote !== null) {
      if (ch === '\\' && quote === '"') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '[') depth += 1;
    else if (ch === ']') depth -= 1;
  }
  return depth;
}

/**
 * The index of the first `needle` outside quotes, brackets and braces, or -1.
 *
 * Used to find the `=` that begins a value without tripping over one inside a
 * quoted key or inside an inline table.
 */
export function indexOfTopLevel(line: string, needle: string): number {
  let quote: string | null = null;
  let depth = 0;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i] ?? '';
    if (quote !== null) {
      if (ch === '\\' && quote === '"') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '[' || ch === '{') depth += 1;
    else if (ch === ']' || ch === '}') depth -= 1;
    else if (depth === 0 && ch === needle) return i;
  }
  return -1;
}

/** Whether every bracket and brace outside a quoted string is closed. */
export function balanced(value: string): boolean {
  let quote: string | null = null;
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (quote !== null) {
      if (ch === '\\' && quote === '"') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '[' || ch === '{') depth += 1;
    else if (ch === ']' || ch === '}') depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0 && quote === null;
}
