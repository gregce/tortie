/**
 * The YAML subset that `SKILL.md` frontmatter actually uses.
 *
 * The Agent Skills spec allows `name`, `description`, `license`,
 * `compatibility`, `metadata`, `allowed-tools`, and agents have added
 * `argument-hint`, `user-invokable`, `disable-model-invocation`, `paths`,
 * `args` and `hooks` on top. Read across every `SKILL.md` on this machine that
 * is: scalars, quoted scalars, folded and literal block scalars, flow
 * sequences, nested maps two levels deep, and sequences of maps.
 *
 * This is a subset parser and it says so rather than pretending otherwise: it
 * does not do anchors, aliases, tags, multi-document streams or complex keys.
 * Frontmatter that uses any of those is reported as a problem instead of being
 * silently half-read, because a skill the panel shows with the wrong
 * description is worse than one it shows as broken.
 *
 * The alternative was a dependency. `yaml` is not in the tree, `js-yaml` is
 * only there transitively through the build tooling, and adding either during
 * a parallel build would put a lockfile change in the middle of four builders.
 * Integration seam: this file exposes one function, so swapping the engine
 * later is a one-line change with the tests already written.
 */

export type YamlValue = string | number | boolean | null | YamlValue[] | YamlMap;
export interface YamlMap {
  [key: string]: YamlValue;
}

export interface YamlHeadResult {
  value: YamlMap;
  /** 1-based line inside the document, and a sentence, when it would not parse. */
  problem: { line: number; message: string } | null;
}

interface Line {
  /** 1-based, relative to the text handed in. */
  number: number;
  indent: number;
  text: string;
}

/**
 * Anchors, aliases, tags, directives and a second document. Frontmatter that
 * uses any of them is reported instead of half-read, because the panel showing
 * a skill with the wrong description is worse than showing it as broken.
 */
const UNSUPPORTED = /^(?:%|---|\.\.\.|&\S|\*\S|!!)/;

function scanLines(text: string): Line[] {
  const out: Line[] = [];
  const raw = text.split('\n');
  for (let i = 0; i < raw.length; i += 1) {
    const line = raw[i] ?? '';
    const stripped = line.replace(/\r$/, '');
    const indent = stripped.length - stripped.trimStart().length;
    out.push({ number: i + 1, indent, text: stripped });
  }
  return out;
}

/** Blank, or a line whose first non-space character starts a comment. */
function isSkippable(line: Line): boolean {
  const body = line.text.trim();
  return body === '' || body.startsWith('#');
}

/** Strip a trailing `# comment`, respecting quotes. */
function stripComment(value: string): string {
  let quote: string | null = null;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '#' && (i === 0 || value[i - 1] === ' ')) return value.slice(0, i);
  }
  return value;
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

/** Split a flow collection body on commas that are not inside a nested one. */
function splitFlow(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '[' || char === '{') depth += 1;
    else if (char === ']' || char === '}') depth -= 1;
    else if (char === ',' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  const tail = body.slice(start).trim();
  if (tail !== '' || parts.length > 0) parts.push(tail);
  return parts.map((part) => part.trim()).filter((part) => part !== '');
}

function parseScalar(input: string): YamlValue {
  const value = stripComment(input).trim();
  if (value === '') return null;
  if (value.startsWith('[') && value.endsWith(']')) {
    return splitFlow(value.slice(1, -1)).map(parseScalar);
  }
  if (value.startsWith('{') && value.endsWith('}')) {
    const map: YamlMap = {};
    for (const pair of splitFlow(value.slice(1, -1))) {
      const cut = pair.indexOf(':');
      if (cut < 0) continue;
      map[unquote(pair.slice(0, cut).trim())] = parseScalar(pair.slice(cut + 1));
    }
    return map;
  }
  if (value.startsWith('"') || value.startsWith("'")) return unquote(value);
  if (value === 'true' || value === 'True') return true;
  if (value === 'false' || value === 'False') return false;
  if (value === 'null' || value === 'Null' || value === '~') return null;
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (/^-?\d*\.\d+$/.test(value)) return Number.parseFloat(value);
  return value;
}

/** `|`, `>`, `|-`, `>+` and friends. Returns null when this is not one. */
function blockScalarStyle(rest: string): { fold: boolean; chomp: string } | null {
  const match = /^([|>])([-+]?)\d*$/.exec(rest.trim());
  if (!match) return null;
  return { fold: match[1] === '>', chomp: match[2] ?? '' };
}

class Parser {
  private index = 0;
  problem: { line: number; message: string } | null = null;

  constructor(private readonly lines: Line[]) {}

  private peek(): Line | null {
    while (this.index < this.lines.length) {
      const line = this.lines[this.index];
      if (!line) return null;
      if (isSkippable(line)) {
        this.index += 1;
        continue;
      }
      return line;
    }
    return null;
  }

  private fail(line: number, message: string): void {
    if (!this.problem) this.problem = { line, message };
  }

  private readBlockScalar(indent: number, style: { fold: boolean; chomp: string }): string {
    const parts: string[] = [];
    let contentIndent = -1;
    while (this.index < this.lines.length) {
      const line = this.lines[this.index];
      if (!line) break;
      const isBlank = line.text.trim() === '';
      if (!isBlank && line.indent <= indent) break;
      if (!isBlank && contentIndent < 0) contentIndent = line.indent;
      parts.push(isBlank ? '' : line.text.slice(contentIndent < 0 ? 0 : contentIndent));
      this.index += 1;
    }
    while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
    const joined = style.fold ? foldLines(parts) : parts.join('\n');
    return style.chomp === '+' ? `${joined}\n` : style.chomp === '-' ? joined : `${joined}\n`;
  }

  /** A block at `indent`: either a sequence of `- ` items or a mapping. */
  parseBlock(indent: number): YamlValue {
    const first = this.peek();
    if (!first || first.indent < indent) return null;
    return first.text.trimStart().startsWith('- ') || first.text.trim() === '-'
      ? this.parseSequence(first.indent)
      : this.parseMapping(first.indent);
  }

  private parseSequence(indent: number): YamlValue[] {
    const items: YamlValue[] = [];
    for (;;) {
      const line = this.peek();
      if (!line || line.indent !== indent) break;
      const body = line.text.trimStart();
      if (!body.startsWith('- ') && body !== '-') break;
      const rest = body === '-' ? '' : body.slice(2).trim();
      this.index += 1;
      if (rest === '') {
        items.push(this.parseBlock(indent + 1) ?? null);
        continue;
      }
      // `- key: value` opens a map whose first key sits at indent + 2.
      const inlineKey = /^([^\s:][^:]*):(\s|$)/.exec(rest);
      if (inlineKey && !rest.startsWith('[') && !rest.startsWith('{')) {
        const map: YamlMap = {};
        const key = unquote((inlineKey[1] ?? '').trim());
        const value = rest.slice((inlineKey[1] ?? '').length + 1).trim();
        map[key] = value === '' ? (this.parseBlock(indent + 2) ?? null) : parseScalar(value);
        const more = this.parseMappingInto(map, indent + 2);
        items.push(more);
        continue;
      }
      items.push(parseScalar(rest));
    }
    return items;
  }

  private parseMapping(indent: number): YamlMap {
    return this.parseMappingInto({}, indent);
  }

  private parseMappingInto(map: YamlMap, indent: number): YamlMap {
    for (;;) {
      const line = this.peek();
      if (!line || line.indent !== indent) break;
      const body = line.text.trimStart();
      if (body.startsWith('- ')) break;
      if (UNSUPPORTED.test(body)) {
        this.fail(line.number, 'This frontmatter uses YAML that Tortie does not read.');
        this.index += 1;
        continue;
      }
      const match = /^((?:"[^"]*")|(?:'[^']*')|(?:[^:]+)):(\s.*|)$/.exec(body);
      if (!match) {
        this.fail(line.number, 'This frontmatter line is not a key and a value.');
        this.index += 1;
        continue;
      }
      const key = unquote((match[1] ?? '').trim());
      const rest = (match[2] ?? '').trim();
      this.index += 1;
      if (UNSUPPORTED.test(rest)) {
        this.fail(line.number, 'This frontmatter uses YAML that Tortie does not read.');
        continue;
      }
      const style = blockScalarStyle(rest);
      if (style) {
        map[key] = this.readBlockScalar(indent, style);
        continue;
      }
      map[key] = rest === '' ? (this.parseBlock(indent + 1) ?? null) : parseScalar(rest);
    }
    return map;
  }
}

/** Join folded-scalar lines: a blank line is a paragraph break, the rest join with a space. */
function foldLines(parts: string[]): string {
  let out = '';
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i] ?? '';
    if (part === '') {
      out += '\n';
      continue;
    }
    if (out === '' || out.endsWith('\n')) out += part;
    else out += ` ${part}`;
  }
  return out;
}

/** Parse a YAML mapping. Anything that is not a mapping yields an empty one. */
export function parseYamlHead(text: string): YamlHeadResult {
  const parser = new Parser(scanLines(text));
  const value = parser.parseBlock(0);
  if (value !== null && (typeof value !== 'object' || Array.isArray(value))) {
    return { value: {}, problem: { line: 1, message: 'This frontmatter is not a set of keys.' } };
  }
  return { value: (value as YamlMap | null) ?? {}, problem: parser.problem };
}

// ---------------------------------------------------------------------------
// Frontmatter framing
// ---------------------------------------------------------------------------

export interface Frontmatter {
  data: YamlMap;
  /** Everything after the closing `---`. */
  body: string;
  /** 1-based line in the FILE where the body starts, so a finding can cite it. */
  bodyStartLine: number;
  problem: { line: number; message: string } | null;
}

/**
 * Split a `SKILL.md` into its frontmatter and its body. A file with no
 * frontmatter is not an error: several agents accept a bare markdown skill,
 * and the reader falls back to the directory name.
 */
export function parseFrontmatter(text: string): Frontmatter {
  const withoutBom = text.startsWith('﻿') ? text.slice(1) : text;
  if (!/^---\s*(\r?\n|$)/.test(withoutBom)) {
    return { data: {}, body: withoutBom, bodyStartLine: 1, problem: null };
  }
  const lines = withoutBom.split('\n');
  let close = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (/^(---|\.\.\.)\s*\r?$/.test(lines[i] ?? '') || /^(---|\.\.\.)\s*$/.test(lines[i] ?? '')) {
      close = i;
      break;
    }
  }
  if (close < 0) {
    return {
      data: {},
      body: withoutBom,
      bodyStartLine: 1,
      problem: { line: 1, message: 'The frontmatter block is never closed.' }
    };
  }
  const head = lines.slice(1, close).join('\n');
  const parsed = parseYamlHead(head);
  return {
    data: parsed.value,
    body: lines.slice(close + 1).join('\n'),
    bodyStartLine: close + 2,
    // The head started on line 2 of the file, so shift the parser's line back.
    problem: parsed.problem ? { ...parsed.problem, line: parsed.problem.line + 1 } : null
  };
}

// ---------------------------------------------------------------------------
// Small readers, so callers never hand-check a YamlValue's shape
// ---------------------------------------------------------------------------

export function yamlString(value: YamlValue | undefined): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

export function yamlBoolean(value: YamlValue | undefined): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

/** A list, a whitespace/comma separated string, or a single value. */
export function yamlList(value: YamlValue | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => yamlString(item)).filter((item): item is string => item !== null);
  }
  const single = yamlString(value);
  if (!single) return [];
  return single
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

export function yamlMap(value: YamlValue | undefined): YamlMap | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
