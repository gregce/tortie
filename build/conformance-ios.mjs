#!/usr/bin/env node
/**
 * conformance-ios.mjs, `npm run conformance:ios`. The iPhone app's refusals,
 * read as TEXT in plain node (Phase 316.2, build/p316/SPEC.md §4 S2).
 *
 * WHY IT IS TEXT. This runs inside `npm run build` on every commit, and most
 * machines that build Tortie have no Xcode and never will. So it compiles
 * nothing and runs no Swift: it reads `ios/` the way `conformance:pocket` reads
 * `src/main/pocket/`, with a small Swift lexer of its own (comments, nested
 * block comments, string literals with interpolation and raw delimiters) so a
 * rule is never satisfied or broken by prose. What the Swift DOES is `test:ios`
 * and `probe:p316`'s; what the Swift may NEVER contain is this file's.
 *
 * THE RULES, exactly as S2 lists them, one ablation each in
 * build/p316/ablation-ios.mjs (`npm run ablation:p316`):
 *
 *   (a) `Style/Tokens.swift` maps each name to the hex `tokens.css` holds for
 *       that name in its DARK base (the first `:root` block; the phone is dark
 *       only), and no colour literal is written anywhere else in the app.
 *   (b) No user-visible string literal outside `Style/Copy.swift`: nothing
 *       inside a `Text`, `Label`, `Button`, `Section`, `.navigationTitle`,
 *       `.accessibilityLabel` or their kin, and no sentence anywhere else.
 *   (c) `URLSession`, `URLRequest`, `NWConnection`, `ProxyConfiguration`,
 *       `loopback(` and `tailscaleSession(` appear only in
 *       `Door/DoorClient.swift` (S3 widens this to `Tailnet/Node.swift`), the
 *       client names `https` and no `http` literal exists in the app, and a
 *       SOCKS proxy it builds never fails over to a direct connection.
 *   (d) Both DEBUG seams — the direct loopback transport and the pairing
 *       payload injection — exist and sit inside `#if DEBUG`: no launch
 *       argument is read, no loopback literal is written and no `Debug` or
 *       `Loopback` declaration is made outside one.
 *   (e) `Info.plist` has EXACTLY the one ATS exception of SPEC §3.2
 *       (`100.64.0.0/10` → `NSExceptionAllowsInsecureHTTPLoads`), no
 *       `NSAllowsArbitraryLoads` of any kind and no `UIBackgroundModes`, and
 *       the project injects neither through an `INFOPLIST_KEY_` setting.
 *   (f) No `import NetworkExtension`, no `NEVPNManager` or tunnel provider, no
 *       `com.apple.developer.networking.*` key and no VPN string.
 *   (g) Nothing fetched is ever run as code: no `JSContext`, `WKWebView`,
 *       `dlopen`, `evaluateJavaScript` or their kin.
 *   (h) `askText`, the person's own words, reaches only `Text(verbatim:` —
 *       never markdown, never a `LocalizedStringKey`.
 *   (i) Every UI test plan has screenshots off and attachments `keepNever`,
 *       every scheme tests through a plan, and no test takes a screenshot.
 *   (j) `build/p316/vectors.mjs --check` matches.
 *   (k) No trapping arithmetic on a number the door sends (his ruling of
 *       2026-09-23, after the reverify ended the app twice with `Int.max`):
 *       every whole number of the door's answers is decoded through a bound
 *       (0 to `Number.MAX_SAFE_INTEGER`), `DoorNumber` in `Door/Contract.swift`
 *       is the one place one is added or subtracted, with the
 *       overflow-reporting forms, and every other arithmetic operator in the
 *       app is proved off the integers by its own text or NAMED, with why, in
 *       `ARITHMETIC_NAMED`. Why it names every operator rather than looking for
 *       the door's is written at the rule.
 *
 * Every rule also proves its own scanner on texts it holds, before it reads a
 * file, so a scanner that stopped finding is never taken for a clean tree.
 *
 * WHAT IT REFUSES TO DO. It spawns only the pinned tsx, through
 * build/p316/vectors.mjs, for (j). It needs no Xcode, starts no Simulator,
 * opens no socket and reads nothing under the person's home.
 *
 *   node build/conformance-ios.mjs
 *   node build/conformance-ios.mjs --root <dir>   read <dir>/ios and <dir>/src/renderer/styles/tokens.css
 *   node build/conformance-ios.mjs --json         end with one CONFORMANCE_IOS:{…} line
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const argv = process.argv.slice(2);
const rootAt = argv.indexOf('--root');
const ROOT = rootAt !== -1 && argv[rootAt + 1] !== undefined ? resolve(argv[rootAt + 1]) : REPO;
const JSON_OUT = argv.includes('--json');
const IOS = join(ROOT, 'ios');
const APP = join(IOS, 'Tortie');
const TAG = '[conformance:ios]';

// ---------------------------------------------------------------------------
// A Swift lexer, just enough of one
// ---------------------------------------------------------------------------

/**
 * Lex Swift source into:
 *   code     the source with every comment blanked to spaces (newlines kept),
 *            so every offset still points at the same line;
 *   bare     `code` with every string literal's CONTENTS blanked too, so a
 *            token rule never matches inside a string;
 *   strings  every string literal: `{ start, end, value, interpolated, holes }`,
 *            where `value` is its static text with each interpolation replaced
 *            by U+FFFC and the common escapes decoded, and `holes` is where each
 *            interpolation's CODE sits (`{ start, end }`, rule k reads it).
 *
 * It knows `//`, nested `/* *\/`, `"…"`, `"""…"""`, raw `#"…"#` of any depth,
 * escapes, and `\(…)` interpolation holding its own strings and parentheses.
 */
export function lexSwift(source) {
  const n = source.length;
  const code = source.split('');
  const bare = source.split('');
  const strings = [];
  const blank = (arr, from, to) => {
    for (let k = from; k < to; k += 1) if (arr[k] !== '\n') arr[k] = ' ';
  };
  let i = 0;

  /** Read one string literal starting at `i` (at its first `#` or `"`). Returns its end. */
  const readString = (start) => {
    let j = start;
    let hashes = 0;
    while (source[j] === '#') {
      hashes += 1;
      j += 1;
    }
    const multi = source.startsWith('"""', j);
    j += multi ? 3 : 1;
    const contentStart = j;
    const close = `${multi ? '"""' : '"'}${'#'.repeat(hashes)}`;
    const escape = `\\${'#'.repeat(hashes)}`;
    let value = '';
    let interpolated = 0;
    const holes = [];
    while (j < n) {
      if (source.startsWith(close, j)) {
        const end = j + close.length;
        strings.push({ start, end, contentStart, contentEnd: j, value, interpolated, holes });
        blank(bare, contentStart, j);
        return end;
      }
      if (source.startsWith(escape, j)) {
        const after = source[j + escape.length];
        if (after === '(') {
          // Interpolation: skip a balanced expression, strings inside it read too.
          let k = j + escape.length + 1;
          let depth = 1;
          while (k < n && depth > 0) {
            const c = source[k];
            if (c === '"' || (c === '#' && /^#+"/.test(source.slice(k, k + 8)))) {
              k = readString(k);
              continue;
            }
            if (c === '(') depth += 1;
            else if (c === ')') depth -= 1;
            k += 1;
          }
          value += '\uFFFC';
          interpolated += 1;
          holes.push({ start: j + escape.length + 1, end: k - 1 });
          j = k;
          continue;
        }
        const map = { n: '\n', t: '\t', r: '\r', '0': '\0', '"': '"', "'": "'", '\\': '\\' };
        if (after === 'u' && source[j + escape.length + 1] === '{') {
          const endBrace = source.indexOf('}', j);
          value += String.fromCodePoint(Number.parseInt(source.slice(j + escape.length + 2, endBrace), 16) || 0xfffd);
          j = endBrace + 1;
          continue;
        }
        value += map[after] ?? after ?? '';
        j += escape.length + 1;
        continue;
      }
      value += source[j];
      j += 1;
    }
    strings.push({ start, end: n, contentStart, contentEnd: n, value, interpolated, holes });
    blank(bare, contentStart, n);
    return n;
  };

  while (i < n) {
    const c = source[i];
    if (c === '/' && source[i + 1] === '/') {
      let j = i;
      while (j < n && source[j] !== '\n') j += 1;
      blank(code, i, j);
      blank(bare, i, j);
      i = j;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      let depth = 0;
      let j = i;
      while (j < n) {
        if (source[j] === '/' && source[j + 1] === '*') {
          depth += 1;
          j += 2;
          continue;
        }
        if (source[j] === '*' && source[j + 1] === '/') {
          depth -= 1;
          j += 2;
          if (depth === 0) break;
          continue;
        }
        j += 1;
      }
      blank(code, i, j);
      blank(bare, i, j);
      i = j;
      continue;
    }
    if (c === '"' || (c === '#' && /^#+"/.test(source.slice(i, i + 8)))) {
      i = readString(i);
      continue;
    }
    i += 1;
  }
  return { code: code.join(''), bare: bare.join(''), strings };
}

const lineOf = (text, at) => text.slice(0, at).split('\n').length;

/** The index of the `)` closing the `(` at `open`, over `bare` text, or -1. */
function closeParen(bare, open) {
  let depth = 0;
  for (let i = open; i < bare.length; i += 1) {
    if (bare[i] === '(') depth += 1;
    else if (bare[i] === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * For each line (1-based), whether it sits inside an ACTIVE `#if DEBUG`
 * branch: the `#if DEBUG` arm itself, or the `#else` arm of `#if !DEBUG`. A
 * `#else` of `#if DEBUG` is NOT inside. Nesting is followed.
 */
export function debugLines(code) {
  const lines = code.split('\n');
  const inside = [false];
  const stack = [];
  for (let k = 0; k < lines.length; k += 1) {
    const t = lines[k].trim();
    let m;
    if ((m = /^#if\s+(.*)$/.exec(t)) !== null) {
      const cond = m[1].replace(/\s+/g, '');
      stack.push({ cond, arm: 'if' });
    } else if (/^#elseif\b/.test(t)) {
      if (stack.length > 0) stack[stack.length - 1].arm = 'elseif';
    } else if (/^#else\b/.test(t)) {
      if (stack.length > 0) stack[stack.length - 1].arm = 'else';
    } else if (/^#endif\b/.test(t)) {
      stack.pop();
    }
    const active = stack.some((f) => (f.cond === 'DEBUG' && f.arm === 'if') || (f.cond === '!DEBUG' && f.arm === 'else'));
    inside.push(active);
  }
  return inside;
}

// ---------------------------------------------------------------------------
// A property list reader, just enough of one (XML plists as Xcode writes them)
// ---------------------------------------------------------------------------

export function parsePlist(xml) {
  const text = xml.replace(/<!--[\s\S]*?-->/g, '');
  let i = text.indexOf('<plist');
  if (i === -1) throw new Error('no <plist> element');
  i = text.indexOf('>', i) + 1;
  const tokens = [];
  const re = /<(\/?)([A-Za-z]+)\s*(\/?)>|([^<]+)/g;
  re.lastIndex = i;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[4] !== undefined) {
      if (m[4].trim() !== '') tokens.push({ kind: 'text', value: m[4] });
      continue;
    }
    tokens.push({ kind: m[1] === '/' ? 'close' : m[3] === '/' ? 'empty' : 'open', tag: m[2] });
  }
  let p = 0;
  const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const value = () => {
    const t = tokens[p++];
    if (t === undefined) throw new Error('the plist ended early');
    if (t.kind === 'empty') {
      if (t.tag === 'true') return true;
      if (t.tag === 'false') return false;
      if (t.tag === 'dict') return {};
      if (t.tag === 'array') return [];
      if (t.tag === 'string') return '';
      throw new Error(`unknown empty element <${t.tag}/>`);
    }
    if (t.kind !== 'open') throw new Error(`unexpected ${t.kind} ${t.tag ?? ''}`);
    if (t.tag === 'dict') {
      const out = {};
      for (;;) {
        const k = tokens[p];
        if (k?.kind === 'close' && k.tag === 'dict') {
          p += 1;
          return out;
        }
        if (k?.kind !== 'open' || k.tag !== 'key') throw new Error('a dict entry has no <key>');
        p += 1;
        const name = tokens[p]?.kind === 'text' ? unescape(tokens[p++].value) : '';
        if (tokens[p++]?.tag !== 'key') throw new Error('an unclosed <key>');
        if (Object.prototype.hasOwnProperty.call(out, name)) throw new Error(`the key ${name} appears twice in one dict`);
        out[name] = value();
      }
    }
    if (t.tag === 'array') {
      const out = [];
      while (!(tokens[p]?.kind === 'close' && tokens[p].tag === 'array')) out.push(value());
      p += 1;
      return out;
    }
    const inner = tokens[p]?.kind === 'text' ? unescape(tokens[p++].value) : '';
    const close = tokens[p++];
    if (close?.kind !== 'close' || close.tag !== t.tag) throw new Error(`<${t.tag}> is not closed`);
    if (t.tag === 'integer' || t.tag === 'real') return Number(inner);
    return inner;
  };
  return value();
}

/** Every key anywhere in a parsed plist, with its path. */
function plistKeys(value, path = []) {
  const out = [];
  if (Array.isArray(value)) value.forEach((v, k) => out.push(...plistKeys(v, [...path, String(k)])));
  else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.push({ key: k, path: [...path, k].join(' → '), value: v });
      out.push(...plistKeys(v, [...path, k]));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The tree
// ---------------------------------------------------------------------------

function walk(dir, keep, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'build' || e.name === 'DerivedData' || e.name === 'xcuserdata') continue;
      walk(path, keep, out);
    } else if (keep(e.name, path)) out.push(path);
  }
  return out;
}

const rel = (path) => relative(ROOT, path).split(sep).join('/');
const read = (path) => readFileSync(path, 'utf8');
const lexCache = new Map();
const lexed = (path) => {
  if (!lexCache.has(path)) lexCache.set(path, lexSwift(read(path)));
  return lexCache.get(path);
};

const appSwift = walk(APP, (n) => n.endsWith('.swift'));
const testSwift = [...walk(join(IOS, 'TortieTests'), (n) => n.endsWith('.swift')), ...walk(join(IOS, 'TortieUITests'), (n) => n.endsWith('.swift'))];
const allText = walk(IOS, (n) => /\.(swift|plist|entitlements|pbxproj|xcscheme|xctestplan|json|strings|xcprivacy)$/.test(n));
const APP_FILE = (name) => join(APP, ...name.split('/'));
const TOKENS_SWIFT = APP_FILE('Style/Tokens.swift');
const COPY_SWIFT = APP_FILE('Style/Copy.swift');
const DOOR_CLIENT = APP_FILE('Door/DoorClient.swift');
const TRANSPORT = APP_FILE('Door/Transport.swift');
const CONTRACT = APP_FILE('Door/Contract.swift');
const INFO_PLIST = APP_FILE('Info.plist');
const TOKENS_CSS = join(ROOT, 'src', 'renderer', 'styles', 'tokens.css');

// ---------------------------------------------------------------------------
// The rules. Each returns a list of findings, and each is pure over its inputs
// so the fixtures below can drive it without a file.
// ---------------------------------------------------------------------------

/** The dark base: every `--name: #hex;` in the first `:root {` block. */
export function darkTokens(css) {
  const at = css.search(/(^|\n):root\s*\{/);
  if (at === -1) return new Map();
  const open = css.indexOf('{', at);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const block = css.slice(open + 1, end).replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Map();
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim().toLowerCase());
  return out;
}

const kebab = (name) => `--${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Za-z])([0-9])/g, '$1-$2').toLowerCase()}`;

/** Rule (a), the table half: each hex in Tokens.swift against tokens.css. */
export function ruleTokensTable(tokensSwift, css) {
  const findings = [];
  const dark = darkTokens(css);
  if (dark.size === 0) return { findings: ['tokens.css has no first :root block to read'], mapped: 0, distinct: 0 };
  const lines = tokensSwift.split('\n');
  const { code } = lexSwift(tokensSwift);
  const codeLines = code.split('\n');
  let mapped = 0;
  const hexes = new Set();
  lines.forEach((raw, k) => {
    const c = codeLines[k] ?? '';
    const hexes6 = [...c.matchAll(/0x([0-9a-fA-F]{6})\b|"#?([0-9a-fA-F]{6})"/g)];
    if (hexes6.length === 0) return;
    if (hexes6.length > 1) {
      findings.push(`Tokens.swift:${String(k + 1)} writes ${String(hexes6.length)} colours on one line; one name, one colour`);
      return;
    }
    const value = `#${(hexes6[0][1] ?? hexes6[0][2]).toLowerCase()}`;
    const ident =
      /\bcase\s+\.?([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(c)?.[1] ??
      /\b(?:let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\b/.exec(c)?.[1] ??
      /^\s*\.([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(c)?.[1] ??
      null;
    const said = /--[a-z0-9-]+/.exec(raw.slice(c.length > 0 ? 0 : 0))?.[0] ?? null;
    if (ident === null) {
      findings.push(`Tokens.swift:${String(k + 1)} writes ${value} with no name it belongs to`);
      return;
    }
    const token = kebab(ident);
    if (said !== null && said !== token) {
      findings.push(`Tokens.swift:${String(k + 1)} names ${ident} but its comment says ${said}; a name is its token's name`);
      return;
    }
    const want = dark.get(token);
    if (want === undefined) {
      findings.push(`Tokens.swift:${String(k + 1)} names ${ident}, and tokens.css's dark base has no ${token}`);
      return;
    }
    if (want !== value) {
      findings.push(`Tokens.swift:${String(k + 1)} gives ${ident} ${value}, and tokens.css's dark base holds ${want} for ${token}`);
      return;
    }
    mapped += 1;
    hexes.add(value);
  });
  if (mapped === 0) findings.push('Tokens.swift maps no colour at all, so the rule would assert nothing');
  return { findings, mapped, distinct: hexes.size };
}

const NAMED_COLOURS = 'red|orange|yellow|green|mint|teal|cyan|blue|indigo|purple|pink|brown|white|gray|grey|black|primary|secondary|accentColor';
const COLOUR_PATTERNS = [
  [/\bColor\s*\(\s*(?:red|hue|white|\.sRGB|\.displayP3|\.linearSRGB|uiColor|cgColor|UIColor|hex|"|#)/, 'a Color built from components or a name'],
  [/\bUIColor\s*\(/, 'a UIColor'],
  [/\bUIColor\s*\.\s*[a-z]/, 'a UIColor system colour'],
  [/\bCGColor\s*\(/, 'a CGColor'],
  [/#colorLiteral\s*\(/, 'a colour literal'],
  [/\b0x[0-9a-fA-F]{6}\b/, 'a hex colour'],
  [new RegExp(`\\bColor\\s*\\.\\s*(?:${NAMED_COLOURS})\\b`), 'a SwiftUI named colour'],
  [
    new RegExp(
      `\\.(?:foregroundColor|foregroundStyle|background|tint|fill|stroke|accentColor|listRowBackground|shadow|border)\\s*\\(\\s*\\.(?:${NAMED_COLOURS})\\b`
    ),
    'a SwiftUI named colour'
  ]
];

/** Rule (a), the other half: no colour literal in one non-Tokens file. */
export function ruleNoColourLiteral(name, source) {
  const { bare, strings } = lexSwift(source);
  const findings = [];
  for (const [re, what] of COLOUR_PATTERNS) {
    const g = new RegExp(re.source, 'g');
    for (const m of bare.matchAll(g)) findings.push(`${name}:${String(lineOf(bare, m.index))} writes ${what}, and only Style/Tokens.swift may`);
  }
  for (const s of strings) {
    if (/^#?[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(s.value)) findings.push(`${name}:${String(lineOf(bare, s.start))} writes a hex colour as a string`);
  }
  return findings;
}

/** The SwiftUI calls whose string arguments a person reads or hears. */
const VISIBLE_CALLS = new RegExp(
  '(?<![A-Za-z0-9_.])(Text|Label|Button|Toggle|Link|TextField|SecureField|Section|Picker|Menu|NavigationLink|ProgressView|Stepper|LabeledContent|ContentUnavailableView|ShareLink|GroupBox|DisclosureGroup|LocalizedStringKey)\\s*\\(' +
    '|\\.(navigationTitle|navigationSubtitle|accessibilityLabel|accessibilityHint|accessibilityValue|help|alert|confirmationDialog|badge|searchable|toolbarTitleMenu)\\s*\\(' +
    '|\\b(NSLocalizedString|String\\s*\\(\\s*localized)\\s*[(:]',
  'g'
);

/** A static text that reads as a sentence or a phrase a person reads. */
function soundsLikeCopy(value) {
  const text = value.replace(/\uFFFC/g, ' ').trim();
  const words = text.split(/\s+/).filter((w) => /[A-Za-z]{2,}/.test(w));
  if (words.length >= 2 && /[.?!…:]$/.test(text)) return true;
  return words.length >= 3 && /^[A-Z]/.test(text);
}

/** Rule (b), over one app file that is not Copy.swift. */
export function ruleNoVisibleLiteral(name, source) {
  const { bare, strings } = lexSwift(source);
  const findings = [];
  const flagged = new Set();
  for (const m of bare.matchAll(VISIBLE_CALLS)) {
    const open = bare.indexOf('(', m.index + m[0].length - 1);
    const close = bare[open] === '(' ? closeParen(bare, open) : -1;
    if (close === -1) continue;
    for (const s of strings) {
      if (s.start <= open || s.end > close) continue;
      if (s.value === '') continue;
      const before = bare.slice(Math.max(open, s.start - 16), s.start);
      if (/\b(systemName|systemImage|image|named|id)\s*:\s*$/.test(before)) continue;
      flagged.add(s.start);
      findings.push(`${name}:${String(lineOf(bare, s.start))} draws the literal ${JSON.stringify(s.value.slice(0, 60))} through ${m[1] ?? m[2] ?? m[3]}; a drawn word lives in Style/Copy.swift`);
    }
  }
  for (const s of strings) {
    if (flagged.has(s.start) || !soundsLikeCopy(s.value)) continue;
    const before = bare.slice(Math.max(0, s.start - 40), s.start);
    if (/\b(fatalError|precondition|preconditionFailure|assert|assertionFailure)\s*\([^()]*$/.test(before)) continue;
    findings.push(`${name}:${String(lineOf(bare, s.start))} writes ${JSON.stringify(s.value.slice(0, 60))}, which reads as copy; a word a person reads lives in Style/Copy.swift`);
  }
  return findings;
}

const NETWORK_TOKENS = [/\bURLSession\b/, /\bURLRequest\b/, /\bNWConnection\b/, /\bProxyConfiguration\b/, /\bloopback\s*\(/, /\btailscaleSession\s*\(/];

/** Rule (c), over one app file that is not the door client: no network type. */
export function ruleNetworkOnlyInClient(name, source) {
  const { bare } = lexSwift(source);
  const findings = [];
  for (const re of NETWORK_TOKENS) {
    for (const m of bare.matchAll(new RegExp(re.source, 'g'))) {
      findings.push(`${name}:${String(lineOf(bare, m.index))} names ${m[0].replace(/\s*\($/, '(')}, and only Door/DoorClient.swift may`);
    }
  }
  return findings;
}

/** Rule (c), the scheme half, over every app file. */
export function ruleHttpsOnly(name, source, isClient) {
  const { bare, strings } = lexSwift(source);
  const findings = [];
  for (const s of strings) {
    if (/^http$/i.test(s.value) || /\bhttp:\/\//i.test(s.value) || /^ws$/i.test(s.value) || /\bws:\/\//i.test(s.value)) {
      findings.push(`${name}:${String(lineOf(bare, s.start))} writes ${JSON.stringify(s.value.slice(0, 40))}; the door client builds https URLs only (SPEC §3.2)`);
    }
  }
  if (isClient) {
    if (!strings.some((s) => s.value === 'https')) findings.push(`${name} never names the https scheme`);
    if (/\bProxyConfiguration\s*\(/.test(bare) && !/\ballowFailover\s*=\s*false\b/.test(bare)) {
      findings.push(`${name} builds a proxy and never sets allowFailover = false, so a failed proxy could send a packet to the tailnet range directly`);
    }
  }
  return findings;
}

const LAUNCH_READS = [/\bProcessInfo\s*\.\s*processInfo\s*\.\s*(arguments|environment)\b/, /\bCommandLine\s*\.\s*(arguments|unsafeArgv|argc)\b/, /\blaunchArguments\b/];

/** Rule (d), over one app file. `seams` collects what the DEBUG regions hold. */
export function ruleDebugSeams(name, source, seams) {
  const { code, bare, strings } = lexSwift(source);
  const inside = debugLines(code);
  const findings = [];
  const at = (offset) => inside[lineOf(bare, offset)] === true;
  for (const re of LAUNCH_READS) {
    for (const m of bare.matchAll(new RegExp(re.source, 'g'))) {
      if (at(m.index)) seams.injection.push(`${name}:${String(lineOf(bare, m.index))}`);
      else findings.push(`${name}:${String(lineOf(bare, m.index))} reads a launch argument outside #if DEBUG, so a Release build could be handed a pairing`);
    }
  }
  for (const m of bare.matchAll(/\bUserDefaults\b[^\n]*/g)) {
    const key = strings.find((s) => s.start > m.index && s.start < m.index + m[0].length);
    if (key !== undefined && /debug|p316|payload|pairing/i.test(key.value)) {
      if (at(m.index)) seams.injection.push(`${name}:${String(lineOf(bare, m.index))}`);
      else findings.push(`${name}:${String(lineOf(bare, m.index))} reads the defaults key ${JSON.stringify(key.value)} outside #if DEBUG`);
    }
  }
  for (const s of strings) {
    if (/(^|[^0-9])127\.0\.0\.1\b|\blocalhost\b|^::1$|\b0\.0\.0\.0\b/.test(s.value) && !at(s.start)) {
      findings.push(`${name}:${String(lineOf(bare, s.start))} writes the loopback address ${JSON.stringify(s.value)} outside #if DEBUG`);
    }
  }
  for (const m of bare.matchAll(/\b(struct|class|enum|actor|protocol|func|extension|typealias|case|var|let)\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
    if (!/Debug|Loopback/.test(m[2])) continue;
    if (at(m.index)) {
      if (/Loopback|Transport/.test(m[2]) && /^(struct|class|enum|actor)$/.test(m[1])) seams.transport.push(`${name}:${String(lineOf(bare, m.index))}`);
      if (/Debug/.test(m[2])) seams.debugDecls.push(`${name}:${String(lineOf(bare, m.index))}`);
    } else {
      findings.push(`${name}:${String(lineOf(bare, m.index))} declares ${m[2]} outside #if DEBUG`);
    }
  }
  return findings;
}

/** Rule (e), over the parsed Info.plist and the project file. */
export function rulePlist(plist, pbxproj) {
  const findings = [];
  const ats = plist?.NSAppTransportSecurity;
  if (ats === undefined) findings.push('Info.plist has no NSAppTransportSecurity, so the one exception SPEC §3.2 measured is missing');
  else {
    const top = Object.keys(ats);
    if (top.length !== 1 || top[0] !== 'NSExceptionDomains') findings.push(`NSAppTransportSecurity holds ${JSON.stringify(top)}; it holds NSExceptionDomains and nothing else`);
    const domains = ats.NSExceptionDomains ?? {};
    const names = Object.keys(domains);
    if (names.length !== 1 || names[0] !== '100.64.0.0/10') findings.push(`NSExceptionDomains holds ${JSON.stringify(names)}; it holds exactly "100.64.0.0/10"`);
    const one = domains['100.64.0.0/10'];
    if (one !== undefined) {
      const keys = Object.keys(one);
      if (keys.length !== 1 || keys[0] !== 'NSExceptionAllowsInsecureHTTPLoads' || one.NSExceptionAllowsInsecureHTTPLoads !== true) {
        findings.push(`the 100.64.0.0/10 exception holds ${JSON.stringify(one)}; it holds NSExceptionAllowsInsecureHTTPLoads = true and nothing else`);
      }
    }
  }
  for (const k of plistKeys(plist)) {
    if (/^NSAllowsArbitraryLoads/.test(k.key)) findings.push(`Info.plist carries ${k.path}; NSAllowsArbitraryLoads stays refused (SPEC §3.2)`);
    if (k.key === 'UIBackgroundModes') findings.push(`Info.plist carries ${k.path}; the app has no background mode, ever (SPEC §4.0, §7)`);
    if (k.key === 'NSAllowsLocalNetworking') findings.push(`Info.plist carries ${k.path}; ATS already allows loopback and nothing else local is dialled`);
  }
  if (typeof pbxproj === 'string') {
    for (const m of pbxproj.matchAll(/INFOPLIST_KEY_(UIBackgroundModes|NSAppTransportSecurity\w*)|NSAllowsArbitraryLoads\w*/g)) {
      findings.push(`project.pbxproj names ${m[0]}, which would put a key into the built Info.plist that the file does not show`);
    }
    if (!/INFOPLIST_FILE\s*=\s*"?Tortie\/Info\.plist"?\s*;/.test(pbxproj)) findings.push('project.pbxproj does not build the app from Tortie/Info.plist, so this rule would be reading a file the app never uses');
  }
  return findings;
}

const VPN_TOKENS = [/\bimport\s+NetworkExtension\b/, /\bNEVPNManager\b/, /\bNETunnelProvider\w*/, /\bNEPacketTunnel\w*/, /\bNEAppProxy\w*/, /\bNEDNSProxy\w*/, /com\.apple\.developer\.networking\./];

/** Rule (f), over one file of any kind under ios/. */
export function ruleNoVpn(name, source) {
  const findings = [];
  const swift = name.endsWith('.swift');
  const { bare, strings } = swift ? lexSwift(source) : { bare: source, strings: [] };
  for (const re of VPN_TOKENS) {
    for (const m of bare.matchAll(new RegExp(re.source, 'g'))) findings.push(`${name}:${String(lineOf(bare, m.index))} names ${m[0]}; the phone carries a node, never a VPN (research 128 §3)`);
  }
  if (swift) {
    for (const s of strings) if (/\bvpn\b/i.test(s.value)) findings.push(`${name}:${String(lineOf(bare, s.start))} writes a VPN string`);
  } else {
    for (const m of source.matchAll(/<(?:string|key)>([^<]*\bvpn\b[^<]*)<\/(?:string|key)>/gi)) findings.push(`${name} carries the VPN string ${JSON.stringify(m[1])}`);
  }
  return findings;
}

const CODE_RUNNERS = [/\bJSContext\b/, /\bJSValue\b/, /\bJavaScriptCore\b/, /\bWKWebView\b/, /\bimport\s+WebKit\b/, /\bdlopen\b/, /\bdlsym\b/, /\bevaluateJavaScript\b/, /\bNSExpression\b/];

/** Rule (g), over one app file. */
export function ruleNothingRunsAsCode(name, source) {
  const { bare } = lexSwift(source);
  const findings = [];
  for (const re of CODE_RUNNERS) {
    for (const m of bare.matchAll(new RegExp(re.source, 'g'))) findings.push(`${name}:${String(lineOf(bare, m.index))} names ${m[0]}; nothing the door sends is ever run as code`);
  }
  return findings;
}

/** Rule (h), over one app file. Counts the honest draws into `drawn`. */
export function ruleAskVerbatim(name, source, drawn) {
  const { bare } = lexSwift(source);
  const findings = [];
  for (const m of bare.matchAll(/\baskText\b/g)) {
    const after = bare.slice(m.index + m[0].length, m.index + m[0].length + 16);
    if (/^\s*\.\s*(isEmpty|count)\b/.test(after)) continue;
    // The innermost unclosed `(` before the use.
    let depth = 0;
    let open = -1;
    for (let k = m.index - 1; k >= 0; k -= 1) {
      if (bare[k] === ')') depth += 1;
      else if (bare[k] === '(') {
        if (depth === 0) {
          open = k;
          break;
        }
        depth -= 1;
      }
    }
    const head = open === -1 ? '' : bare.slice(Math.max(0, open - 24), open);
    const between = open === -1 ? '' : bare.slice(open + 1, m.index);
    if (/\bText\s*$/.test(head) && /^\s*verbatim\s*:\s*(?:[A-Za-z_][A-Za-z0-9_]*\s*\??\s*\.\s*)*$/.test(between)) {
      drawn.push(`${name}:${String(lineOf(bare, m.index))}`);
      continue;
    }
    findings.push(`${name}:${String(lineOf(bare, m.index))} uses askText outside Text(verbatim:), and the ask is plain text, never markdown (his ruling)`);
  }
  return findings;
}

/** Rule (i), over one parsed test plan. */
export function ruleTestPlan(name, plan) {
  const findings = [];
  const d = plan?.defaultOptions ?? {};
  if (d.uiTestingScreenshotsEnabled !== false) findings.push(`${name} does not set uiTestingScreenshotsEnabled to false`);
  for (const k of ['systemAttachmentLifetime', 'userAttachmentLifetime']) {
    if (d[k] !== 'keepNever') findings.push(`${name} sets ${k} to ${JSON.stringify(d[k])}, not "keepNever"`);
  }
  if (d.preferredScreenCaptureFormat === 'video') findings.push(`${name} asks for screen recording`);
  for (const c of Array.isArray(plan?.configurations) ? plan.configurations : []) {
    const o = c?.options ?? {};
    if (o.uiTestingScreenshotsEnabled === true) findings.push(`${name}'s configuration ${JSON.stringify(c?.name)} turns screenshots back on`);
    for (const k of ['systemAttachmentLifetime', 'userAttachmentLifetime']) {
      if (o[k] !== undefined && o[k] !== 'keepNever') findings.push(`${name}'s configuration ${JSON.stringify(c?.name)} sets ${k} to ${JSON.stringify(o[k])}`);
    }
    if (o.preferredScreenCaptureFormat === 'video') findings.push(`${name}'s configuration ${JSON.stringify(c?.name)} asks for screen recording`);
  }
  return findings;
}

const PHOTOGRAPHS = [/\.screenshot\s*\(/, /\bXCUIScreen\b/, /\bXCTAttachment\s*\(\s*(screenshot|image|uniformTypeIdentifier)/, /\bUIGraphicsImageRenderer\b/, /\bdrawHierarchy\b/];

/** Rule (i), the other half: no test takes a photograph. */
export function ruleNoPhotograph(name, source) {
  const { bare } = lexSwift(source);
  const findings = [];
  for (const re of PHOTOGRAPHS) {
    for (const m of bare.matchAll(new RegExp(re.source, 'g'))) findings.push(`${name}:${String(lineOf(bare, m.index))} takes a photograph (${m[0].trim()}); a visual claim is a frame or a label`);
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Rule (k): no trapping arithmetic on a number the door sends
// ---------------------------------------------------------------------------
//
// HIS RULING, 2026-09-23: "No trapping arithmetic anywhere on a number the
// door sends." Swift's `+` and `-` on an `Int` trap on overflow, and the
// reverify ended the app twice with one: `othersOmitted = Int.max` on the
// list's refresh, and `userMessages = Int.max` on opening a session.
//
// WHY THIS RULE NAMES EVERY OPERATOR RATHER THAN THE DOOR'S. Text cannot follow
// a value. The session's defect was `counts.user + replies`, where `counts` is
// a tuple a helper built from `userMessages` and `replies` was bound from it:
// no door field is named on that line, and a rule that looked for one passed
// the defect. So (k) reads it the other way round. EVERY arithmetic operator
// in the app (`+ - * / %`, their compound and wrapping forms, and a prefix `-`
// on anything but a literal) must be one of:
//
//   - inside `DoorNumber`, which may hold none of its own and must take its
//     sum and difference with `addingReportingOverflow` and
//     `subtractingReportingOverflow`;
//   - proved not to be integer arithmetic by its own text: an operand that is
//     a string literal, a `String(…)` / `Double(…)` / `Float(…)` / `CGFloat(…)`
//     call, a string constant declared `static let NAME = "…"` (in the same
//     file, or `Copy.NAME`), or a floating literal, since Swift adds no String
//     to an Int and no Double to an Int; or both operands integer literals,
//     which the compiler folds and would refuse to overflow;
//   - or NAMED in `ARITHMETIC_NAMED` below, by file and line, with how many
//     operators the line holds and why none of them is on a door number. Each
//     entry must still match exactly that many, so the table cannot rot and a
//     new operator on a line it names is not waved through.
//
// And whatever the table says, an operand naming a door number field
// (`.othersOmitted`, `.index`, …, derived from Contract.swift's own decoders
// below, never listed here) is red, so the table cannot launder the defect.
//
// The decode half: every whole-number field of the door's answers is decoded
// through `doorNumber(forKey:)` or `nullableDoorNumber(forKey:)`, which refuse
// a number outside 0...Number.MAX_SAFE_INTEGER; no `Int.self` is decoded in
// Contract.swift anywhere else; and `DoorNumber.largest` is JavaScript's own
// `Number.MAX_SAFE_INTEGER`, read here, not typed twice.
//
// WHAT IT DOES NOT READ, stated rather than claimed away: a range (`a...b`
// traps when a > b), a subscript, `Int(…)` of a Double, `abs`, `prefix(n)` or
// `repeating:count:` on a door number; an operator passed as a function
// (`reduce(0, +)`, which has no operand on either side and so yields no site); and
// arithmetic written as a method (`advanced(by:)`, `distance(to:)`). There is none in the app today (the
// fix round's audit, build/p316/SPEC.md §As built — 316.2, "the overflow
// round"), and the decode bound keeps every door number a non-negative count,
// which is what those need.

const DOOR_NUMBER_FLOOR = 5;
const ARITH_OPS = new Set(['+', '-', '*', '/', '%', '+=', '-=', '*=', '/=', '%=', '&+', '&-', '&*', '&+=', '&-=', '&*=']);
const OP_CHARS = new Set('/=-+!*%<>&|^~?'.split(''));
const isIdentChar = (c) => c !== undefined && /[A-Za-z0-9_$]/.test(c);

/**
 * THE NAMED ONES. Every arithmetic operator in the app that its own text does
 * not prove is not integer arithmetic. `line` is the line with its comments
 * removed, trimmed and its spaces collapsed; `ops` how many operators on such
 * lines in that file this entry covers.
 */
export const ARITHMETIC_NAMED = [
  { file: 'App/TortieApp.swift', line: 'foregroundTick += 1', ops: 1, why: 'the app counts its own returns to the foreground, one per return' },
  { file: 'Screens/ListScreen.swift', line: 'generation += 1', ops: 2, why: 'the list model numbers its own reads, one per read' },
  { file: 'Screens/SessionScreen.swift', line: 'generation += 1', ops: 1, why: 'the session model numbers its own reads, one per read' },
  { file: 'Screens/ConversationScreen.swift', line: 'generation += 1', ops: 1, why: 'the conversation model numbers its own reads, one per read' },
  { file: 'Door/Pairing.swift', line: 'attempts += 1', ops: 1, why: 'pairing counts its own presentations, one every 2 s inside a window of minutes' },
  { file: 'Door/Contract.swift', line: 'turns = turns.filter { $0.index < first.index } + page.turns', ops: 1, why: 'an ARRAY of turns joined to a page of them; the indexes inside are compared, never added' },
  { file: 'Door/Contract.swift', line: 'turns = page.turns + turns', ops: 1, why: 'an ARRAY of turns joined to the ones held' },
  { file: 'Screens/ListScreen.swift', line: 'for row in answer.rows + answer.others where !seen.insert(row.sessionId).inserted {', ops: 1, why: 'two ARRAYS of rows joined to look for a session listed twice' },
  { file: 'Screens/ListScreen.swift', line: 'RowView(row: row, last: endsList && offset == rows.count - 1) { open(row) }', ops: 1, why: 'the count of an array the phone holds, less one, compared with an offset into it; never a door number' },
  { file: 'Door/DoorClient.swift', line: 'return Base64URL.encode(Data(SHA256.hash(data: SPKI.p256Header + point)))', ops: 1, why: 'two Data values joined into a key' },
  { file: 'Door/DoorClient.swift', line: 'guard data.count + chunk.count <= cap else {', ops: 1, why: 'bytes held plus bytes arrived, both sizes of memory this process holds, checked against the 2 MiB cap before the append' },
  { file: 'Door/Pairing.swift', line: 'date.timeIntervalSince1970 * 1000 < expiresAt', ops: 1, why: 'the phone\'s own clock, a Double, in milliseconds' },
  { file: 'Door/Pairing.swift', line: 'pairedAt: (now().timeIntervalSince1970 * 1000).rounded(.down),', ops: 1, why: 'the phone\'s own clock, a Double, in milliseconds' },
  { file: 'Door/Pairing.swift', line: 'guard out.utf16.count + String(character).utf16.count <= labelMaxUTF16 else { break }', ops: 1, why: 'the length of the label this phone is composing, checked against its 64 before a character is added' },
  { file: 'Door/Pairing.swift', line: 'guard let flag = arguments.firstIndex(of: payloadArgument), arguments.indices.contains(flag + 1) else {', ops: 1, why: 'DEBUG only: an index into the launch arguments, which the test runner passes' },
  { file: 'Door/Pairing.swift', line: 'return arguments[flag + 1]', ops: 1, why: 'DEBUG only: the same index, checked on the line above' },
  { file: 'Door/Signing.swift', line: 'standard.reserveCapacity(text.utf8.count + 3)', ops: 1, why: 'the length of a string being padded for base64, plus the padding' },
  { file: 'Door/Signing.swift', line: 'switch standard.utf8.count % 4 {', ops: 1, why: 'a string length, modulo a literal: never traps' },
  { file: 'Door/Signing.swift', line: 'guard chars.count % 2 == 0 else { return nil }', ops: 1, why: 'a string length, modulo a literal: never traps' },
  { file: 'Door/Signing.swift', line: 'var out = Data(capacity: chars.count / 2)', ops: 1, why: 'a string length halved: never traps' },
  { file: 'Door/Signing.swift', line: 'guard let high = nibble(chars[index]), let low = nibble(chars[index + 1]) else { return nil }', ops: 1, why: 'a position inside a hex string whose even length the line above checked' },
  { file: 'Door/Signing.swift', line: 'index += 2', ops: 1, why: 'the same position, moving two characters at a time' },
  { file: 'Door/Signing.swift', line: 'case UInt8(ascii: "0")...UInt8(ascii: "9"): return c - UInt8(ascii: "0")', ops: 1, why: 'a byte already inside the case\'s range, less that range\'s first byte' },
  { file: 'Door/Signing.swift', line: 'case UInt8(ascii: "a")...UInt8(ascii: "f"): return c - UInt8(ascii: "a") + 10', ops: 2, why: 'a byte already inside the case\'s range, less its first byte, plus ten: at most 15' },
  { file: 'Door/Signing.swift', line: 'case UInt8(ascii: "A")...UInt8(ascii: "F"): return c - UInt8(ascii: "A") + 10', ops: 2, why: 'a byte already inside the case\'s range, less its first byte, plus ten: at most 15' },
  { file: 'Door/Signing.swift', line: 'header + raw', ops: 1, why: 'two Data values joined into a key' },
  { file: 'Door/Signing.swift', line: 'guard spki.count == header.count + rawCount, spki.prefix(header.count) == header else { return nil }', ops: 1, why: 'the lengths of a fixed header and a fixed key size' },
  { file: 'Door/Signing.swift', line: '.map { String(head[$0..<($0 + 4)]) }', ops: 1, why: 'a stride over the 24 hex digits of a fingerprint, four at a time' },
  { file: 'Door/Signing.swift', line: 'String(Int64((date.timeIntervalSince1970 * 1000).rounded(.down)))', ops: 1, why: 'the phone\'s own clock, a Double, in milliseconds' },
  { file: 'Screens/ConversationScreen.swift', line: 'let now = Date(timeIntervalSince1970: epochMs / 1000)', ops: 1, why: 'a Double (`epochMs: Double`) divided: floating point never traps' },
  { file: 'Screens/ListScreen.swift', line: 'Date(timeIntervalSince1970: epochMs / 1000).formatted(date: .omitted, time: .shortened)', ops: 1, why: 'a Double (`epochMs: Double`) divided: floating point never traps' },
  { file: 'Screens/Pieces.swift', line: 'max(0, lineHeight - UIFont.systemFont(ofSize: size, weight: weight.uiWeight).lineHeight)', ops: 1, why: 'two CGFloat line heights of the phone\'s own type scale' }
];

/**
 * The source with comments blanked and every string's STATIC text blanked,
 * but the code inside each `\(…)` kept, so an operator is read wherever the
 * compiler reads one and nowhere else.
 */
export function arithmeticView(source) {
  const { code, strings } = lexSwift(source);
  const out = code.split('');
  for (const s of strings) {
    for (let k = s.contentStart; k < s.contentEnd; k += 1) {
      if (out[k] === '\n') continue;
      if (s.holes.some((h) => k >= h.start && k < h.end)) continue;
      out[k] = ' ';
    }
  }
  return { view: out.join(''), code, strings };
}

const CLOSER_OF = { '(': ')', '[': ']', '{': '}' };
const OPENER_OF = { ')': '(', ']': '[', '}': '{' };

function matchForward(text, open) {
  const want = CLOSER_OF[text[open]];
  let depth = 0;
  for (let k = open; k < text.length; k += 1) {
    if (text[k] === text[open]) depth += 1;
    else if (text[k] === want) {
      depth -= 1;
      if (depth === 0) return k;
    }
  }
  return -1;
}

function matchBack(text, close) {
  const want = OPENER_OF[text[close]];
  let depth = 0;
  for (let k = close; k >= 0; k -= 1) {
    if (text[k] === text[close]) depth += 1;
    else if (text[k] === want) {
      depth -= 1;
      if (depth === 0) return k;
    }
  }
  return -1;
}

/** The expression that ends just before `at`: a chain of names, calls, subscripts, strings and a trailing closure. */
function leftOperand(view, at, strings) {
  let p = at - 1;
  while (p >= 0 && /\s/.test(view[p])) p -= 1;
  const end = p + 1;
  while (p >= 0) {
    const c = view[p];
    if (c === ')' || c === ']' || c === '}') {
      const o = matchBack(view, p);
      if (o < 0) break;
      p = o - 1;
      if (c === '}') {
        // A trailing closure belongs to the call before it.
        let q = p;
        while (q >= 0 && view[q] === ' ') q -= 1;
        if (isIdentChar(view[q]) || view[q] === ')') p = q;
      }
      continue;
    }
    if (c === '"' || c === '#') {
      const s = strings.find((x) => x.end === p + 1);
      if (s === undefined) break;
      p = s.start - 1;
      continue;
    }
    if (isIdentChar(c)) {
      p -= 1;
      continue;
    }
    if (c === '.' && view[p - 1] !== '.') {
      p -= 1;
      continue;
    }
    if ((c === '?' || c === '!') && (isIdentChar(view[p - 1]) || view[p - 1] === ')' || view[p - 1] === ']')) {
      p -= 1;
      continue;
    }
    break;
  }
  return view.slice(p + 1, end).trim();
}

/** The expression that starts just after `at`, with any prefix operator glued to it. */
function rightOperand(view, at, strings) {
  let p = at;
  while (p < view.length && /\s/.test(view[p])) p += 1;
  const start = p;
  while (p < view.length && /[-!&~+]/.test(view[p]) && view[p + 1] !== undefined && !/\s/.test(view[p + 1])) p += 1;
  while (p < view.length) {
    const c = view[p];
    if (c === '(' || c === '[' || (c === '{' && p > start)) {
      const close = matchForward(view, p);
      if (close < 0) break;
      p = close + 1;
      continue;
    }
    if (c === '"' || c === '#') {
      const s = strings.find((x) => x.start === p);
      if (s === undefined) break;
      p = s.end;
      continue;
    }
    if (isIdentChar(c)) {
      p += 1;
      continue;
    }
    if (c === '.' && view[p + 1] !== '.') {
      p += 1;
      continue;
    }
    if ((c === '?' || c === '!') && p > start && (isIdentChar(view[p - 1]) || view[p - 1] === ')' || view[p - 1] === ']')) {
      p += 1;
      continue;
    }
    break;
  }
  return view.slice(start, p).trim();
}

/** Every arithmetic operator in a view: `{ at, op, kind, left, right }`. */
export function arithmeticSites(view, strings) {
  const sites = [];
  let i = 0;
  while (i < view.length) {
    const c = view[i];
    if (c === '.' && view[i + 1] === '.') {
      // `...` and `..<`: a range, read by nothing here (see the header).
      let j = i;
      while (j < view.length && (view[j] === '.' || OP_CHARS.has(view[j]))) j += 1;
      i = j;
      continue;
    }
    if (!OP_CHARS.has(c)) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < view.length && OP_CHARS.has(view[j])) j += 1;
    const op = view.slice(i, j);
    const before = view[i - 1];
    const after = view[j];
    const leftBound = before !== undefined && !/[\s(\[{,;:]/.test(before);
    const rightBound = after !== undefined && !/[\s)\]},;:]/.test(after);
    if (ARITH_OPS.has(op)) {
      if (leftBound === rightBound) {
        const left = leftOperand(view, i, strings);
        const right = rightOperand(view, j, strings);
        if (left !== '' && right !== '') sites.push({ at: i, op, kind: 'binary', left, right });
      } else if (op === '-' && !leftBound && rightBound) {
        const right = rightOperand(view, j, strings);
        if (right !== '' && !/^[0-9]/.test(right)) sites.push({ at: i, op, kind: 'prefix', left: '', right });
      }
    }
    i = j;
  }
  return sites;
}

/** `static let NAME = "…"`: the names a file declares as string constants. */
function stringConstants(code) {
  return new Set([...code.matchAll(/\bstatic\s+let\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*String\s*)?=\s*#*"/g)].map((m) => m[1]));
}

function wholeCall(text, names) {
  const m = new RegExp(`^(?:${names})\\s*\\(`).exec(text);
  if (m === null) return false;
  return matchForward(text, m[0].length - 1) === text.length - 1;
}

/** Why an operand proves the operator is not integer arithmetic, or null. */
function notInteger(operand, local, copy) {
  if (/^#*"/.test(operand)) return 'a string literal';
  if (wholeCall(operand, 'String')) return 'a String(…)';
  if (wholeCall(operand, 'Double|Float|CGFloat')) return 'a floating value';
  if (/^[0-9][0-9_]*\.[0-9][0-9_]*(?:[eE][-+]?[0-9]+)?$|^[0-9][0-9_]*[eE][-+]?[0-9]+$/.test(operand)) return 'a floating literal';
  const bare = /^([A-Za-z_][A-Za-z0-9_]*)$/.exec(operand)?.[1];
  if (bare !== undefined && local.has(bare)) return 'a string constant';
  const qualified = /^Copy\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(operand)?.[1];
  if (qualified !== undefined && copy.has(qualified)) return 'a string constant';
  return null;
}

const INT_LITERAL = /^(?:0x[0-9a-fA-F_]+|0o[0-7_]+|0b[01_]+|[0-9][0-9_]*)$/;
const shown = (site) => (site.kind === 'prefix' ? `${site.op}${site.right}` : `${site.left} ${site.op} ${site.right}`);

/** An operand's text with every closure body taken out, so a comparison inside a closure is not read as the operand. */
const withoutClosures = (text) => {
  let out = text;
  let from = 0;
  for (;;) {
    const open = out.indexOf('{', from);
    if (open === -1) return out;
    const close = matchForward(out, open);
    if (close === -1) return out;
    out = `${out.slice(0, open)}{}${out.slice(close + 1)}`;
    from = open + 2;
  }
};

/**
 * Rule (k), pure over `files` (`{ name, source }`, names relative to the app
 * folder), the contract's name among them, and the named table.
 */
export function ruleDoorArithmetic(files, contractName, named = ARITHMETIC_NAMED) {
  const findings = [];
  const said = { fields: [], proved: 0, named: 0, sites: 0, helperAt: null };
  const contract = files.find((f) => f.name === contractName);
  if (contract === undefined) return { findings: [`${contractName} does not exist, so no door number is decoded through a bound`], said };

  // (k1) The decode half.
  const c = arithmeticView(contract.source);
  const bareContract = lexSwift(contract.source).bare;
  const bodies = [];
  for (const m of bareContract.matchAll(/\bfunc\s+(doorNumber|nullableDoorNumber)\s*\(/g)) {
    const open = bareContract.indexOf('{', m.index);
    const close = open === -1 ? -1 : matchForward(bareContract, open);
    if (close === -1) continue;
    bodies.push({ name: m[1], open, close });
    if (!/\bDoorNumber\s*\.\s*isCount\s*\(/.test(bareContract.slice(open, close))) {
      findings.push(`${contractName}:${String(lineOf(bareContract, m.index))} ${m[1]} does not ask DoorNumber.isCount, so it decodes a number with no bound`);
    }
  }
  for (const want of ['doorNumber', 'nullableDoorNumber']) {
    if (!bodies.some((b) => b.name === want)) findings.push(`${contractName} declares no ${want}(forKey:), so a door number has no bounded decoder`);
  }
  for (const m of bareContract.matchAll(/\bU?Int(?:8|16|32|64)?\s*\.\s*self\b/g)) {
    if (bodies.some((b) => m.index > b.open && m.index < b.close)) continue;
    findings.push(`${contractName}:${String(lineOf(bareContract, m.index))} decodes ${m[0].replace(/\s+/g, '')} outside doorNumber(forKey:) and nullableDoorNumber(forKey:), so that number has no bound`);
  }
  const fields = new Set();
  for (const m of bareContract.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*try\s+c\s*\.\s*(?:nullableDoorNumber|doorNumber)\s*\(\s*forKey\s*:\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)) {
    fields.add(m[1]);
  }
  said.fields = [...fields].sort();
  if (fields.size < DOOR_NUMBER_FLOOR) {
    findings.push(`only ${String(fields.size)} door number field(s) decoded through the bound (${said.fields.join(', ') || 'none'}); the floor is ${String(DOOR_NUMBER_FLOOR)}, so the scanner stopped finding them or a field lost its bound`);
  }
  for (const m of bareContract.matchAll(/^\s*(?:public\s+|internal\s+)?(?:let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(U?Int(?:8|16|32|64)?)\??\s*$/gm)) {
    if (!fields.has(m[1])) findings.push(`${contractName}:${String(lineOf(bareContract, m.index))} declares the whole number ${m[1]}: ${m[2]} and never decodes it through doorNumber(forKey:)`);
  }

  // (k2) The helper.
  const helper = /\benum\s+DoorNumber\s*\{/.exec(c.view);
  let helperSpan = null;
  if (helper === null) findings.push(`${contractName} declares no enum DoorNumber, the one checked helper`);
  else {
    const open = c.view.indexOf('{', helper.index);
    const close = matchForward(c.view, open);
    helperSpan = { open, close };
    said.helperAt = `${contractName}:${String(lineOf(c.view, helper.index))}`;
    const body = c.view.slice(open, close);
    for (const call of ['addingReportingOverflow', 'subtractingReportingOverflow']) {
      if (!new RegExp(`\\.\\s*${call}\\s*\\(`).test(body)) findings.push(`DoorNumber never calls ${call}, so its arithmetic can trap`);
    }
    const largest = /\bstatic\s+let\s+largest\s*=\s*([0-9_]+)\b/.exec(body)?.[1]?.replace(/_/g, '') ?? null;
    if (largest !== String(Number.MAX_SAFE_INTEGER)) {
      findings.push(`DoorNumber.largest is ${String(largest)}, and JavaScript's Number.MAX_SAFE_INTEGER, the largest whole number main's JSON writes exactly, is ${String(Number.MAX_SAFE_INTEGER)}`);
    }
  }
  const declared = files.filter((f) => /\benum\s+DoorNumber\b/.test(lexSwift(f.source).bare));
  if (declared.length > 1) findings.push(`enum DoorNumber is declared in ${declared.map((f) => f.name).join(' and ')}; there is one checked helper`);

  // (k3) Every operator.
  const copyFile = files.find((f) => f.name === 'Style/Copy.swift');
  const copy = copyFile === undefined ? new Set() : stringConstants(lexSwift(copyFile.source).code);
  // A door field is read as a member (`answer.othersOmitted`) anywhere, and as
  // a bare name (`index`) only inside the contract, where it is the field.
  const alternatives = [...fields].join('|');
  const memberRe = fields.size === 0 ? null : new RegExp(`\\.\\s*(${alternatives})\\b(?!\\s*\\()`);
  const bareRe = fields.size === 0 ? null : new RegExp(`(?:^|[^A-Za-z0-9_$.])(${alternatives})\\b(?!\\s*\\()`);
  const unexplained = new Map();
  for (const f of files) {
    const { view, code, strings } = f === contract ? c : arithmeticView(f.source);
    const local = stringConstants(code);
    const codeLines = code.split('\n');
    for (const site of arithmeticSites(view, strings)) {
      said.sites += 1;
      const line = lineOf(view, site.at);
      const inHelper = f === contract && helperSpan !== null && site.at > helperSpan.open && site.at < helperSpan.close;
      if (inHelper) {
        findings.push(`${f.name}:${String(line)} DoorNumber itself uses a bare \`${site.op}\`; its arithmetic is addingReportingOverflow and subtractingReportingOverflow only`);
        continue;
      }
      const door =
        memberRe === null
          ? undefined
          : [site.left, site.right]
              .map((o) => withoutClosures(o))
              .map((o) => memberRe.exec(o)?.[1] ?? (f === contract ? bareRe.exec(o)?.[1] : undefined))
              .find((x) => x !== undefined);
      if (door !== undefined) {
        findings.push(`${f.name}:${String(line)} \`${shown(site)}\` is arithmetic on the door number ${door}; take it through DoorNumber.sum or DoorNumber.difference, which cannot trap`);
        continue;
      }
      const why = notInteger(site.left, local, copy) ?? notInteger(site.right, local, copy);
      if (why !== null || (site.kind === 'binary' && INT_LITERAL.test(site.left) && INT_LITERAL.test(site.right))) {
        said.proved += 1;
        continue;
      }
      const text = (codeLines[line - 1] ?? '').trim().replace(/\s+/g, ' ');
      const key = `${f.name}\u0000${text}`;
      if (!unexplained.has(key)) unexplained.set(key, { file: f.name, text, line, ops: [], sites: [] });
      unexplained.get(key).sites.push(site);
    }
  }
  const used = new Set();
  for (const [key, u] of unexplained) {
    const entry = named.find((n) => n.file === u.file && n.line === u.text);
    if (entry === undefined) {
      const s = u.sites[0];
      findings.push(`${u.file}:${String(u.line)} \`${shown(s)}\` is arithmetic this rule cannot prove is off the door's numbers; take it through DoorNumber, or name it in ARITHMETIC_NAMED with why`);
      continue;
    }
    used.add(entry);
    if (entry.ops !== u.sites.length) {
      findings.push(`${u.file}:${String(u.line)} holds ${String(u.sites.length)} arithmetic operator(s) on lines reading ${JSON.stringify(u.text)}, and ARITHMETIC_NAMED names ${String(entry.ops)}; a new operator on a named line is not named`);
      continue;
    }
    said.named += u.sites.length;
    void key;
  }
  for (const entry of named) {
    if (!used.has(entry)) findings.push(`ARITHMETIC_NAMED names ${entry.file} ${JSON.stringify(entry.line)}, which no longer holds an operator this rule reads; take the entry out`);
  }
  return { findings, said };
}

// ---------------------------------------------------------------------------
// The scanners, proved on texts this file holds, before any file is read
// ---------------------------------------------------------------------------

const selfFailures = [];
const expect = (what, ok) => {
  if (!ok) selfFailures.push(what);
};
{
  const lx = lexSwift('let a = "x // not a comment" // a comment with a "quote"\n/* outer /* inner */ still */ let b = #"raw \\(no) "quote""#\nlet c = "a\\(f("in")) b"\n');
  expect('the lexer reads a // inside a string as the string', lx.strings[0]?.value === 'x // not a comment');
  expect('the lexer blanks a comment holding a quote', !lx.code.includes('quote"') || lx.code.indexOf('quote"') > lx.code.indexOf('#"'));
  expect('the lexer follows nested block comments', !lx.code.includes('still'));
  expect('the lexer reads a raw string whole', lx.strings.some((s) => s.value === 'raw \\(no) "quote"'));
  expect('the lexer replaces an interpolation holding a string', lx.strings.some((s) => s.value === 'a\uFFFC b' && s.interpolated === 1));
  const lines = debugLines('a\n#if DEBUG\nb\n#else\nc\n#endif\n#if !DEBUG\nd\n#else\ne\n#endif\n');
  expect('the DEBUG tracker reads the #if DEBUG arm as inside', lines[3] === true);
  expect('the DEBUG tracker reads the #else of #if DEBUG as outside', lines[5] === false);
  expect('the DEBUG tracker reads the #else of #if !DEBUG as inside', lines[10] === true);
  expect('the DEBUG tracker reads the #if !DEBUG arm as outside', lines[8] === false);
  const pl = parsePlist('<plist version="1.0"><dict><key>A</key><dict><key>B</key><true/></dict><key>C</key><array><string>x</string></array></dict></plist>');
  expect('the plist reader reads nested dicts and arrays', pl.A.B === true && pl.C[0] === 'x');
  expect('(a) catches a hex outside Tokens.swift', ruleNoColourLiteral('F', 'let c = Color(red: 1, green: 0, blue: 0)\n').length > 0);
  expect('(a) catches a named colour in a modifier', ruleNoColourLiteral('F', 'x.foregroundStyle(.white)\n').length > 0);
  expect('(a) leaves a token alone', ruleNoColourLiteral('F', 'x.foregroundStyle(Tokens.textPrimary)\n').length === 0);
  expect('(a) leaves a hex in a comment alone', ruleNoColourLiteral('F', '// 0x0e0f13 is --bg-sidebar\nlet x = 1\n').length === 0);
  expect('(b) catches a literal in Text', ruleNoVisibleLiteral('F', 'Text("Hello")\n').length > 0);
  expect('(b) catches a literal in an interpolated Text', ruleNoVisibleLiteral('F', 'Text("\\(n) more")\n').length > 0);
  expect('(b) leaves an SF Symbol name alone', ruleNoVisibleLiteral('F', 'Label(Copy.sessions, systemImage: "gearshape")\n').length === 0);
  expect('(b) leaves an identifier alone', ruleNoVisibleLiteral('F', 'x.accessibilityIdentifier("row-name")\n').length === 0);
  expect('(b) catches a sentence outside a Text', ruleNoVisibleLiteral('F', 'let why = "Your Mac did not answer."\n').length > 0);
  expect('(c) catches URLSession outside the client', ruleNetworkOnlyInClient('F', 'let s = URLSession.shared\n').length > 0);
  expect('(c) leaves URLSessionConfiguration alone', ruleNetworkOnlyInClient('F', 'let c: URLSessionConfiguration\n').length === 0);
  expect('(c) catches an http literal', ruleHttpsOnly('F', 'c.scheme = "http"\n', false).length > 0);
  const seams = { injection: [], transport: [], debugDecls: [] };
  expect('(d) catches a launch argument read outside DEBUG', ruleDebugSeams('F', 'let a = ProcessInfo.processInfo.arguments\n', seams).length > 0);
  expect('(d) leaves one inside DEBUG alone', ruleDebugSeams('F', '#if DEBUG\nlet a = ProcessInfo.processInfo.arguments\n#endif\n', seams).length === 0);
  expect('(d) catches a loopback literal outside DEBUG', ruleDebugSeams('F', 'let h = "127.0.0.1"\n', seams).length > 0);
  expect('(d) catches a Loopback type outside DEBUG', ruleDebugSeams('F', 'struct DirectLoopbackTransport {}\n', seams).length > 0);
  const okPlist = { NSAppTransportSecurity: { NSExceptionDomains: { '100.64.0.0/10': { NSExceptionAllowsInsecureHTTPLoads: true } } } };
  expect('(e) accepts the one exception', rulePlist(okPlist, 'INFOPLIST_FILE = Tortie/Info.plist;').length === 0);
  expect('(e) catches arbitrary loads', rulePlist({ ...okPlist, NSAppTransportSecurity: { ...okPlist.NSAppTransportSecurity, NSAllowsArbitraryLoads: true } }, 'INFOPLIST_FILE = Tortie/Info.plist;').length > 0);
  expect('(e) catches a background mode', rulePlist({ ...okPlist, UIBackgroundModes: ['fetch'] }, 'INFOPLIST_FILE = Tortie/Info.plist;').length > 0);
  expect('(e) catches a background mode injected by the project', rulePlist(okPlist, 'INFOPLIST_FILE = Tortie/Info.plist; INFOPLIST_KEY_UIBackgroundModes = fetch;').length > 0);
  expect('(f) catches NetworkExtension', ruleNoVpn('F.swift', 'import NetworkExtension\n').length > 0);
  expect('(f) leaves a comment about a VPN alone', ruleNoVpn('F.swift', '// no VPN profile\nlet x = 1\n').length === 0);
  expect('(g) catches a web view', ruleNothingRunsAsCode('F', 'let w = WKWebView()\n').length > 0);
  const drawn = [];
  expect('(h) accepts Text(verbatim: turn.askText)', ruleAskVerbatim('F', 'Text(verbatim: turn.askText)\n', drawn).length === 0 && drawn.length === 1);
  expect('(h) catches the ask as markdown', ruleAskVerbatim('F', 'Text(try! AttributedString(markdown: turn.askText))\n', []).length > 0);
  expect('(h) catches the ask as a localized key', ruleAskVerbatim('F', 'Text(LocalizedStringKey(turn.askText))\n', []).length > 0);
  expect('(i) catches screenshots on', ruleTestPlan('P', { defaultOptions: { uiTestingScreenshotsEnabled: true, systemAttachmentLifetime: 'keepNever', userAttachmentLifetime: 'keepNever' } }).length > 0);
  expect('(i) catches a screenshot taken in a test', ruleNoPhotograph('T', 'let s = app.screenshot()\n').length > 0);
  const contractOk = [
    'extension KeyedDecodingContainer {',
    '    func doorNumber(forKey key: Key) throws -> Int {',
    '        let n = try decode(Int.self, forKey: key)',
    '        guard DoorNumber.isCount(n) else { throw Refused() }',
    '        return n',
    '    }',
    '    func nullableDoorNumber(forKey key: Key) throws -> Int? {',
    '        guard let n = try nullable(Int.self, forKey: key) else { return nil }',
    '        guard DoorNumber.isCount(n) else { throw Refused() }',
    '        return n',
    '    }',
    '}',
    'enum DoorNumber {',
    '    static let largest = 9_007_199_254_740_991',
    '    static func isCount(_ n: Int) -> Bool { n >= 0 && n <= largest }',
    '    static func sum(_ a: Int, _ b: Int) -> Int? { let (v, o) = a.addingReportingOverflow(b); return o ? nil : v }',
    '    static func difference(_ a: Int, _ b: Int) -> Int? { let (v, o) = a.subtractingReportingOverflow(b); return o ? nil : v }',
    '}',
    'struct Answer {',
    '    let othersOmitted: Int',
    '    let userMessages: Int?',
    '    let agentMessages: Int?',
    '    let turnCount: Int',
    '    let index: Int',
    '    var id: Int { index }',
    '}',
    'extension Answer {',
    '    init(from decoder: Decoder) throws {',
    '        let c = try decoder.container(keyedBy: CodingKeys.self)',
    '        othersOmitted = try c.doorNumber(forKey: .othersOmitted)',
    '        userMessages = try c.nullableDoorNumber(forKey: .userMessages)',
    '        agentMessages = try c.nullableDoorNumber(forKey: .agentMessages)',
    '        turnCount = try c.doorNumber(forKey: .turnCount)',
    '        index = try c.doorNumber(forKey: .index)',
    '    }',
    '}',
    ''
  ].join('\n');
  const kRun = (screen, contract = contractOk, named = []) =>
    ruleDoorArithmetic(
      [
        { name: 'Door/Contract.swift', source: contract },
        { name: 'Screens/F.swift', source: screen }
      ],
      'Door/Contract.swift',
      named
    ).findings;
  expect('(k) passes a contract whose numbers are bounded and a screen with no arithmetic', kRun('let x = 1\n').length === 0);
  expect('(k) catches the shipped list defect, a sum on a door field', kRun('let n = others.count + max(0, answer.othersOmitted)\n').length > 0);
  expect('(k) catches the shipped session defect, a sum on an alias no field is named on', kRun('let t = counts.user + replies\n').length > 0);
  expect('(k) catches a prefix minus on a name', kRun('let y = -count\n').length > 0);
  expect('(k) catches a wrapping sum', kRun('let z = a &+ b\n').length > 0);
  expect('(k) catches a compound sum', kRun('total += step\n').length > 0);
  expect('(k) catches arithmetic inside an interpolation', kRun('let s = "at \\(page.index + 1)"\n').length > 0);
  expect('(k) leaves a string joined to a literal alone', kRun('let s = "row-" + id\n').length === 0);
  expect('(k) leaves a String(…) joined alone', kRun('let s = String(n) + tail\n').length === 0);
  expect('(k) leaves a floating literal alone', kRun('let x = size * 0.04\n').length === 0);
  expect('(k) leaves literals folded alone', kRun('static let cap = 2 * 1024 * 1024\n').length === 0);
  expect('(k) leaves an arrow, a range, a comparison and a negative literal alone', kRun('func f(a: Int) -> Int { _ = 0...a; _ = a == 1; return max(0, -1) }\n').length === 0);
  expect('(k) leaves a + in a string and in a comment alone', kRun('let s = "a + b" // c + d\n').length === 0);
  expect('(k) accepts a named line', kRun('let t = counts.user + replies\n', contractOk, [{ file: 'Screens/F.swift', line: 'let t = counts.user + replies', ops: 1, why: 'x' }]).length === 0);
  expect('(k) refuses a named line with an operator more than it names', kRun('let t = counts.user + replies + more\n', contractOk, [{ file: 'Screens/F.swift', line: 'let t = counts.user + replies + more', ops: 1, why: 'x' }]).length > 0);
  expect('(k) refuses an entry that no longer matches', kRun('let x = 1\n', contractOk, [{ file: 'Screens/F.swift', line: 'gone += 1', ops: 1, why: 'x' }]).length > 0);
  expect('(k) never lets a named line launder a door field', kRun('let n = answer.othersOmitted + 1\n', contractOk, [{ file: 'Screens/F.swift', line: 'let n = answer.othersOmitted + 1', ops: 1, why: 'x' }]).length > 0);
  expect('(k) catches a bare door field inside the contract', kRun('let x = 1\n', contractOk.replace('var id: Int { index }', 'var next: Int { index + 1 }')).length > 0);
  expect('(k) catches the helper adding bare', kRun('let x = 1\n', contractOk.replace('a.addingReportingOverflow(b)', '(a + b, false)')).length > 0);
  expect('(k) catches a door number decoded with no bound', kRun('let x = 1\n', contractOk.replace('try c.doorNumber(forKey: .othersOmitted)', 'try c.decode(Int.self, forKey: .othersOmitted)')).length > 0);
  expect('(k) catches a whole-number field never bounded', kRun('let x = 1\n', contractOk.replace('    let index: Int\n', '    let index: Int\n    let extra: Int\n')).length > 0);
  expect('(k) catches a bound that is not Number.MAX_SAFE_INTEGER', kRun('let x = 1\n', contractOk.replace('9_007_199_254_740_991', '9_223_372_036_854_775_807')).length > 0);
  expect('(k) catches a bounded decoder that asks no bound', kRun('let x = 1\n', contractOk.replace('        guard DoorNumber.isCount(n) else { throw Refused() }\n        return n\n    }\n    func nullableDoorNumber', '        return n\n    }\n    func nullableDoorNumber')).length > 0);
}

// ---------------------------------------------------------------------------
// Run the rules over the tree
// ---------------------------------------------------------------------------

const results = {};
const record = (id, title, findings, said) => {
  results[id] = { ok: findings.length === 0, title, findings, said };
};
const missing = (path) => (existsSync(path) ? [] : [`${rel(path)} does not exist`]);

if (!existsSync(IOS) || !statSync(IOS).isDirectory()) {
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']) record(id, 'the app', [`${rel(IOS)} does not exist, so there is no app to read`], '');
} else {
  const others = appSwift.filter((p) => p !== TOKENS_SWIFT);
  // (a)
  {
    const f = [...missing(TOKENS_SWIFT), ...missing(TOKENS_CSS)];
    let table = { findings: [], mapped: 0, distinct: 0 };
    if (f.length === 0) table = ruleTokensTable(read(TOKENS_SWIFT), read(TOKENS_CSS));
    f.push(...table.findings);
    for (const p of others) f.push(...ruleNoColourLiteral(rel(p), read(p)));
    record('a', 'Tokens.swift is tokens.css, and no colour is written anywhere else', f, `${String(table.mapped)} names mapped to ${String(table.distinct)} distinct hexes of the dark base; ${String(others.length)} other files hold no colour literal`);
  }
  // (b)
  {
    const f = [...missing(COPY_SWIFT)];
    const files = appSwift.filter((p) => p !== COPY_SWIFT);
    for (const p of files) f.push(...ruleNoVisibleLiteral(rel(p), read(p)));
    record('b', 'no drawn string outside Copy.swift', f, `${String(files.length)} app files read`);
  }
  // (c)
  {
    const f = [...missing(DOOR_CLIENT)];
    for (const p of appSwift) {
      if (p !== DOOR_CLIENT) f.push(...ruleNetworkOnlyInClient(rel(p), read(p)));
      f.push(...ruleHttpsOnly(rel(p), read(p), p === DOOR_CLIENT));
    }
    record('c', 'the network is DoorClient.swift, https only', f, 'URLSession, URLRequest, NWConnection, ProxyConfiguration, loopback( and tailscaleSession( only in Door/DoorClient.swift');
  }
  // (d)
  {
    const seams = { injection: [], transport: [], debugDecls: [] };
    const f = [...missing(TRANSPORT)];
    for (const p of appSwift) f.push(...ruleDebugSeams(rel(p), read(p), seams));
    if (existsSync(TRANSPORT) && !seams.transport.some((s) => s.startsWith(rel(TRANSPORT)))) {
      f.push(`${rel(TRANSPORT)} holds no transport type inside #if DEBUG, so the direct loopback seam is missing or unguarded`);
    }
    if (seams.injection.length === 0) f.push('no launch argument is read inside #if DEBUG anywhere, so the pairing payload injection the Simulator needs is missing');
    record('d', 'both DEBUG seams exist and sit inside #if DEBUG', f, `transport seam at ${seams.transport.join(', ') || 'nowhere'}; injection read at ${seams.injection.join(', ') || 'nowhere'}`);
  }
  // (e)
  {
    const f = [...missing(INFO_PLIST)];
    const pbx = join(IOS, 'Tortie.xcodeproj', 'project.pbxproj');
    f.push(...missing(pbx));
    if (f.length === 0) {
      try {
        f.push(...rulePlist(parsePlist(read(INFO_PLIST)), read(pbx)));
      } catch (err) {
        f.push(`Info.plist could not be read: ${String(err?.message ?? err)}`);
      }
      for (const p of allText.filter((q) => q.endsWith('.plist') && q !== INFO_PLIST)) {
        const t = read(p);
        if (/NSAllowsArbitraryLoads|UIBackgroundModes/.test(t)) f.push(`${rel(p)} carries NSAllowsArbitraryLoads or UIBackgroundModes`);
      }
    }
    record('e', 'Info.plist has exactly the one ATS exception and no background mode', f, 'NSAppTransportSecurity → NSExceptionDomains → 100.64.0.0/10 → NSExceptionAllowsInsecureHTTPLoads = true, and nothing else');
  }
  // (f)
  {
    const f = [];
    for (const p of allText) f.push(...ruleNoVpn(rel(p), read(p)));
    record('f', 'no NetworkExtension, no VPN', f, `${String(allText.length)} files under ios/ read`);
  }
  // (g)
  {
    const f = [];
    for (const p of appSwift) f.push(...ruleNothingRunsAsCode(rel(p), read(p)));
    record('g', 'nothing fetched is run as code', f, `${String(appSwift.length)} app files read`);
  }
  // (h)
  {
    const drawn = [];
    const f = [];
    for (const p of appSwift) if (p !== CONTRACT) f.push(...ruleAskVerbatim(rel(p), read(p), drawn));
    if (drawn.length === 0) f.push('the ask is never drawn through Text(verbatim:), so the conversation screen does not draw it at all or draws it another way');
    record('h', 'askText reaches only Text(verbatim:', f, `${String(drawn.length)} draw(s) at ${drawn.join(', ')}`);
  }
  // (i)
  {
    const f = [];
    const plans = allText.filter((p) => p.endsWith('.xctestplan'));
    if (plans.length === 0) f.push('no .xctestplan exists under ios/');
    for (const p of plans) {
      try {
        f.push(...ruleTestPlan(rel(p), JSON.parse(read(p))));
      } catch (err) {
        f.push(`${rel(p)} is not JSON: ${String(err?.message ?? err)}`);
      }
    }
    for (const s of allText.filter((p) => p.endsWith('.xcscheme'))) {
      const t = read(s);
      if (!/<TestAction\b/.test(t)) continue;
      const refs = [...t.matchAll(/<TestPlanReference\s+reference\s*=\s*"container:([^"]+)"/g)].map((m) => m[1]);
      if (refs.length === 0) f.push(`${rel(s)} tests without a test plan, so the plan's screenshot switch does not apply`);
      for (const r of refs) if (!existsSync(join(IOS, r))) f.push(`${rel(s)} names the test plan ${r}, which does not exist`);
      if (/<Testables>\s*<TestableReference/.test(t)) f.push(`${rel(s)} lists testables of its own beside the plan`);
    }
    for (const p of testSwift) f.push(...ruleNoPhotograph(rel(p), read(p)));
    record('i', 'the UI test plan has screenshots off', f, `${String(plans.length)} plan(s), ${String(testSwift.length)} test file(s) read`);
  }
  // (j)
  {
    // The ROOT's own emitter over the ROOT's own sources, so a clone the
    // ablation made is judged against itself and never against this tree.
    const emitter = join(ROOT, 'build', 'p316', 'vectors.mjs');
    const r = existsSync(emitter)
      ? spawnSync(process.execPath, [emitter, '--check'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 })
      : { status: 1, stdout: '', stderr: `${rel(emitter)} does not exist` };
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').filter((l) => l.trim() !== '');
    record('j', 'vectors.mjs --check matches', r.status === 0 ? [] : [out.slice(-3).join(' ') || `vectors.mjs exited ${String(r.status)}`], out[out.length - 1] ?? '');
  }
  // (k)
  {
    const files = appSwift.map((p) => ({ name: relative(APP, p).split(sep).join('/'), source: read(p) }));
    const r = ruleDoorArithmetic(files, 'Door/Contract.swift');
    record(
      'k',
      'no trapping arithmetic on a number the door sends',
      r.findings,
      `${String(r.said.fields.length)} door numbers decoded through the bound (${r.said.fields.join(', ')}); the one checked helper at ${String(r.said.helperAt)}; ` +
        `${String(r.said.sites)} arithmetic operators in ${String(files.length)} app files: ${String(r.said.proved)} proved off the integers by their own text, ${String(r.said.named)} named in ${String(ARITHMETIC_NAMED.length)} entries, none on a door number`
    );
  }
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

let red = selfFailures.length > 0;
for (const f of selfFailures) process.stderr.write(`${TAG} SCANNER FIXTURE FAILED: ${f}\n`);
for (const id of Object.keys(results).sort()) {
  const r = results[id];
  if (r.ok) process.stdout.write(`ok   (${id}) ${r.title}. ${r.said}\n`);
  else {
    red = true;
    process.stdout.write(`FAIL (${id}) ${r.title}:\n`);
    for (const f of r.findings.slice(0, 25)) process.stdout.write(`       - ${f}\n`);
    if (r.findings.length > 25) process.stdout.write(`       … and ${String(r.findings.length - 25)} more\n`);
  }
}
if (JSON_OUT) {
  const brief = Object.fromEntries(Object.entries(results).map(([id, r]) => [id, { ok: r.ok, findings: r.findings.length }]));
  process.stdout.write(`CONFORMANCE_IOS:${JSON.stringify({ rules: brief, scannerFixturesFailed: selfFailures.length })}\n`);
}
if (red) {
  process.stdout.write(`${TAG} FAIL. The phone app breaks a refusal build/p316/SPEC.md §4 S2 names, or a scanner here stopped working.\n`);
  process.exit(1);
}
process.stdout.write(`${TAG} PASS. ${String(Object.keys(results).length)} rules over ${String(appSwift.length)} app files, ${String(testSwift.length)} test files and ${String(allText.length)} files under ios/; every scanner proved on its own fixtures first.\n`);
