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
 *       `Door/DoorClient.swift` and, from Phase 316.3, `Tailnet/Node.swift`;
 *       the client names `https` and no `http` literal exists in the app; a
 *       SOCKS proxy either file builds never fails over to a direct
 *       connection; and only the door client SENDS (`.data(for:`, a task, an
 *       `NWConnection(`), because the pin, the cap and the timeout are there.
 *       The node configures a route and hands it over; it asks nothing. Every
 *       `URLSessionConfiguration` the app builds is `.ephemeral` (316.3's fix
 *       round: never `.default`, never `.background(withIdentifier:)`), and
 *       from the hardening round however it is spelled: no
 *       `URLSession.shared`, every `configuration:` argument `.ephemeral` or
 *       the door client's own builder, and every value typed
 *       `URLSessionConfiguration` `.ephemeral`, a builder's `return` included.
 *   (d) Both DEBUG seams — the direct loopback transport and the pairing
 *       payload injection — exist and sit inside `#if DEBUG`: no launch
 *       argument is read, no loopback literal is written and no `Debug` or
 *       `Loopback` declaration is made outside one.
 *   (e) `Info.plist` has EXACTLY the one ATS exception of SPEC §3.2
 *       (`100.64.0.0/10` → `NSExceptionAllowsInsecureHTTPLoads`), no
 *       `NSAllowsArbitraryLoads` of any kind and no `UIBackgroundModes`, and
 *       the project injects neither through an `INFOPLIST_KEY_` setting.
 *       From Phase 316.3 also: no Background Modes capability in the project
 *       and no `BGTaskSchedulerPermittedIdentifiers`; the local network usage
 *       string, one sentence (research 128 §2, SPEC §4 S3); and NO
 *       `ITSAppUsesNonExemptEncryption`, because that answer is a legal one
 *       and his (SPEC §6 decision 7), so no agent writes it. Keys are read
 *       by the name CFBundle folds them to (316.3's fix round:
 *       `UIBackgroundModes~iphone` and `-iphoneos` are background modes on a
 *       phone), and an xcconfig is read for the same injected keys. From the
 *       hardening round (his ruling of 2026-09-23, "Harden, then land"):
 *       EVERY property list under ios/ is read by CoreFoundation itself
 *       (`plutil -convert json`), never by a reader of this file's, so a key
 *       spelled `UIBackground&#77;odes` is what the device reads it as; a key
 *       is written plainly (no reference, no CDATA, no `$(…)`, never twice);
 *       every configuration of the app builds from `Tortie/Info.plist` with
 *       `GENERATE_INFOPLIST_FILE = NO`, in the project and in any xcconfig;
 *       and nothing preprocesses Info.plist or generates a refused key into it
 *       (`INFOPLIST_PREPROCESS` and its kin, `INFOPLIST_KEY_*`).
 *   (f) No `import NetworkExtension` in any spelling (scoped imports too), no
 *       NetworkExtension class by any of Apple's `NE…` prefixes, in code or in
 *       a string, no `com.apple.developer.networking.*` key, no
 *       NetworkExtensions capability in the project, no VPN string, and, in
 *       every project, plist, xcconfig, C, Objective-C and header file, not
 *       the framework's name at all (`@import`, `#import <…/…>`,
 *       `-framework` in OTHER_LDFLAGS): 316.3's fix round, after a scoped
 *       import linked the framework with this rule green. The hardening round
 *       takes the module in backticks, refuses every `NE` + capital + letter
 *       name in Swift code and strings rather than a list of prefixes, and
 *       refuses a Swift package in the project, whose sources no rule reads.
 *       A link flag assembled from build settings (`$(A)$(B)`) is text no
 *       rule can read, so `test:ios` reads the BUILT app's load commands.
 *   (g) Nothing fetched is ever run as code: no `JSContext`, `WKWebView`,
 *       `dlopen`, `evaluateJavaScript` or their kin.
 *   (h) `askText`, the person's own words, reaches only `Text(verbatim:` —
 *       never markdown, never a `LocalizedStringKey`.
 *   (i) Every UI test plan has screenshots off, attachments `keepNever` and
 *       code coverage off, every scheme tests through a plan, no test takes a
 *       screenshot, and no build setting instruments a build (316.3's fix
 *       round: a plan that left coverage to its default instrumented every
 *       `xcodebuild build` through the scheme, Release included; an archive
 *       was measured not instrumented, in the reverify).
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
 *   PHASE 316.3, the tailnet node inside the app (SPEC §4 S3, research 128).
 *   S3's text calls these (k) to (n); the overflow round took (k) first, so
 *   they are (l) to (p), in S3's order, with the key rule the brief added,
 *   and (q), which the hardening round added for his ruling on the logs:
 *
 *   (l) The node is started only in `Tailnet/Node.swift`: no other Swift file
 *       under ios/ (app or test) imports TailscaleKit or names
 *       `TailscaleNode`, nothing is `@_exported`, and every declaration there
 *       that names `TailscaleNode` is private, so the node cannot leave the
 *       file. It is `tortie-phone`, configured with `ephemeral: false`
 *       written out, and nothing keeps the app running in the background
 *       (no background task, no `BGTaskScheduler`, no
 *       `performExpiringActivity`, no background URLSession, no fetch
 *       interval, and from the hardening round no Core Location monitoring,
 *       which relaunches an app with no background mode). The project takes the
 *       framework from `build/vendor/tailscalekit/`, embeds it signed on copy,
 *       and its build phases only CHECK for it: none fetches or builds.
 *   (m) The node's state lives in Application Support/`tailnet`, never in
 *       Caches, tmp, Documents or a shared container, and it is excluded from
 *       backup in the same body that creates it.
 *   (n) Every Keychain item is `ThisDeviceOnly`, every file that writes one
 *       says so, and nothing is synchronised to his other devices.
 *   (o) Both privacy manifests exist and declare the categories: the app's
 *       own (every required-reason API its Swift names, derived from the
 *       text), and TailscaleKit's, whose committed source declares
 *       FileTimestamp C617.1 and SystemBootTime 35F9.1 (SPEC §3.6, §6
 *       decision 8). When the vendored framework is built here, every slice
 *       holds the same manifest at its root.
 *   (p) The tailnet key (`tk`) is never written anywhere. Text cannot follow
 *       a value (rule k's lesson), so every mention of the key's name in the
 *       app is proved by its shape to be a declaration, a label, a check, a
 *       nil test, a hand-off into another key-named place or the join itself
 *       (`authKey:` in Node.swift), or it is NAMED in `KEY_NAMED` with why; no
 *       encodable type holds a key field; no key literal is written in the
 *       app; and no file under ios/ or build/p316/ holds a string shaped like
 *       a real key unless it says it is made up (`p316`). From 316.3's fix
 *       round the RAW CODE is held to the same clauses under the names it
 *       travels by (`KEY_NAMES_IN`), each place a code enters binds it to one
 *       of them, and every type holding the key or the code mirrors itself
 *       without it, so `print`, `dump` and interpolation of a whole value,
 *       which read it through its mirror, never repeat it. The places a code
 *       enters (`CODE_SOURCES`) are an OPEN list, widened in the hardening
 *       round to Core Image, Vision's data, a deep link and the pasteboard.
 *
 *   (q) Tailscale's own diagnostic logs are off before every start (his
 *       ruling of 2026-09-23, "Turn them off"). The pinned build adds one
 *       export, `tailscale_no_logs_no_support()`
 *       (build/build-tailscalekit.mjs, NO_LOGS_PATCH); the node asks it only
 *       through a wrapper that checks it answered 0, outside every `#if`, and
 *       every `TailscaleNode(` is guarded by that wrapper before it, in the
 *       same block; nothing calls the C API to start a node itself; the
 *       script still patches the switch in; and each built slice, when it is
 *       here, declares it and holds it in its symbol table. From Phase 316.4,
 *       the switch's second cost: a tailnet that requires network flow logs
 *       turns such a node off, and the backend's words for it are named once
 *       in Node.swift, turned into their own error by the live node's up(),
 *       told apart from a refused key by the join, and held in every built
 *       slice, so the pairing names flow logs rather than the key.
 *
 *   PHASE 316.4, the first TestFlight build (SPEC §4 S4):
 *
 *   (r) The app icon is the brand master
 *       (docs/brand/tortie/master/tortie-master-1024.png) laid over one opaque
 *       ground, the light base's `--bg-canvas`, named by
 *       build/p316/app-icon.mjs and read from tokens.css. It is an 8-bit RGB
 *       PNG with no alpha channel and no transparent colour, because App
 *       Store Connect refuses an icon that has one. Every pixel is checked
 *       against the arithmetic by this file's own code. The catalog holds
 *       that one icon and nothing else, every configuration of the app names
 *       it, and none generates asset symbols.
 *   (s) His team, 4GRQMF5T5U, is written once, in the app's Release
 *       configuration, with automatic signing as Apple Development. Every
 *       Debug configuration is ad hoc with no team. No profile is named, and
 *       no xcconfig sets a signing or identity setting. The app is
 *       `com.itavero.tortie.phone`, one version in Debug and Release, and
 *       Info.plist takes the bundle id and both versions from the project and
 *       shows "Tortie".
 *
 * Every rule also proves its own scanner on texts it holds, before it reads a
 * file, so a scanner that stopped finding is never taken for a clean tree.
 *
 * WHAT IT REFUSES TO DO. It spawns only the pinned tsx, through
 * build/p316/vectors.mjs, for (j), and /usr/bin/plutil, which every Mac has,
 * to read a property list (e, o, s). It decodes the icon and the master in
 * node (r). It needs no Xcode, no Go and no vendored
 * framework (rules o and q read the built framework only when it is there),
 * starts no Simulator, opens no socket and reads nothing under the person's
 * home.
 *
 *   node build/conformance-ios.mjs
 *   node build/conformance-ios.mjs --root <dir>   read <dir>/ios, <dir>/build, <dir>/src/renderer/styles/tokens.css and <dir>/docs/brand/tortie/master
 *   node build/conformance-ios.mjs --json         end with one CONFORMANCE_IOS:{…} line
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
import { decodePng } from './png-read.mjs';

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
// Property lists, read by CoreFoundation
// ---------------------------------------------------------------------------
//
// 316.3's HARDENING ROUND (his ruling of 2026-09-23, "Harden, then land"). The
// gate read Info.plist with a reader of its own, and the reverify built an app
// whose Info.plist spelled `UIBackground&#77;odes` and
// `NSAppTransport&#83;ecurity` with this rule green: that reader decoded five
// named entities and no character reference, while CoreFoundation, which is
// what Xcode and the phone read the file with, decoded both, and the running
// app's own Info.plist held `UIBackgroundModes` and `NSAllowsArbitraryLoads`.
// So every property list is now read by CoreFoundation itself, through
// `/usr/bin/plutil -convert json`, which every Mac has without Xcode. What a
// rule sees is what the device reads, key for key; a list CoreFoundation cannot
// turn into JSON (a date, a data blob, a CDATA key) is a finding, never a
// guess. The file's own SPELLING is held separately (rulePlistSpelling), so
// what a person reads in the file is also what the device reads.

const PLUTIL = '/usr/bin/plutil';

function plutilJson(args, input) {
  const r = spawnSync(PLUTIL, ['-convert', 'json', '-o', '-', '--', ...args], { input, encoding: 'utf8', timeout: 30_000, maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`${PLUTIL} could not be started (${r.error.message}); conformance:ios reads every property list through CoreFoundation's plutil, which every Mac has`);
  if (r.status !== 0) throw new Error(`CoreFoundation cannot read it as JSON: ${`${r.stderr ?? ''}${r.stdout ?? ''}`.trim().split('\n').pop()}`);
  return JSON.parse(r.stdout);
}

/** A property list file as CoreFoundation reads it. Throws with plutil's own words. */
export function readPlistFile(path) {
  return plutilJson([path]);
}

/** A property list's text as CoreFoundation reads it (the self-test's fixtures, a literal in a script). */
export function readPlistText(text) {
  return plutilJson(['-'], text);
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

/**
 * A plist key's name without Apple's platform and device modifiers
 * (`UIBackgroundModes-iphoneos`, `UIBackgroundModes~iphone`,
 * `UIBackgroundModes-iphoneos~ipad`). CFBundle folds a modified key into the
 * plain one at run time, so `UIBackgroundModes~iphone` IS a background mode on
 * an iPhone (316.3's verification read `fetch` back from the running app's
 * own Info.plist with this rule green). Every trailing modifier is taken off,
 * so a refused key is never spelled past the rule.
 */
export function plistBaseKey(key) {
  return key.replace(/(?:[-~][A-Za-z0-9]+)+$/, '');
}

/** An xcconfig's text with its `//` comments taken out. */
const xcconfigBare = (text) => text.replace(/\/\/.*$/gm, '');

/**
 * A C, Objective-C or module map text with its comments blanked (newlines
 * kept) and its string literals left in place, so a rule reads what the
 * compiler reads.
 */
function cFamilyBare(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== c && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

const C_FAMILY = /\.(?:m|mm|h|hh|hpp|c|cc|cpp|cxx|modulemap)$/;

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
// Phase 316.3's fix round added the C family, module maps and xcconfig files:
// `@import NetworkExtension;` in a `.m`, `#import <NetworkExtension/…>` in a
// `.h` and `OTHER_LDFLAGS = -framework NetworkExtension` in an xcconfig each
// linked the framework with rule (f) green, because no such file was read.
const allText = walk(IOS, (n) => /\.(swift|plist|entitlements|pbxproj|xcscheme|xctestplan|json|strings|xcprivacy|xcconfig|m|mm|h|hh|hpp|c|cc|cpp|cxx|modulemap)$/.test(n));
const APP_FILE = (name) => join(APP, ...name.split('/'));
const TOKENS_SWIFT = APP_FILE('Style/Tokens.swift');
const COPY_SWIFT = APP_FILE('Style/Copy.swift');
const DOOR_CLIENT = APP_FILE('Door/DoorClient.swift');
const TRANSPORT = APP_FILE('Door/Transport.swift');
const CONTRACT = APP_FILE('Door/Contract.swift');
const NODE = APP_FILE('Tailnet/Node.swift');
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

/** Rule (c), over one app file that is neither the door client nor the node: no network type. */
export function ruleNetworkOnlyInClient(name, source) {
  const { bare } = lexSwift(source);
  const findings = [];
  for (const re of NETWORK_TOKENS) {
    for (const m of bare.matchAll(new RegExp(re.source, 'g'))) {
      findings.push(`${name}:${String(lineOf(bare, m.index))} names ${m[0].replace(/\s*\($/, '(')}, and only Door/DoorClient.swift and Tailnet/Node.swift may`);
    }
  }
  return findings;
}

/**
 * What SENDS a request. The node may name the network types (it configures
 * the route the door client dials through), but a request made anywhere but
 * the door client would skip the pin, the 2 MiB cap and the 15 s timeout.
 */
const SENDS = [
  /\.\s*data\s*\(\s*(?:for|from)\s*:/,
  /\.\s*(?:dataTask|uploadTask|downloadTask|streamTask|webSocketTask)\s*\(/,
  /\.\s*(?:upload|download|bytes)\s*\(\s*(?:for|from|with)\s*:/,
  /\bNWConnection\s*\(/
];

/** Rule (c), over one app file that is not the door client: it sends nothing. */
export function ruleSendsOnlyFromClient(name, source) {
  const { bare } = lexSwift(source);
  const findings = [];
  for (const re of SENDS) {
    for (const m of bare.matchAll(new RegExp(re.source, 'g'))) {
      findings.push(`${name}:${String(lineOf(bare, m.index))} sends a request itself (${m[0].replace(/\s+/g, '')}); only Door/DoorClient.swift sends, with the pin, the cap and the timeout, and the node only carries`);
    }
  }
  return findings;
}

/**
 * Rule (c), the scheme half, over every app file. `role` is 'client' for the
 * door client, 'node' for the tailnet node and anything else otherwise (a
 * boolean `true` still means the client).
 */
export function ruleHttpsOnly(name, source, role) {
  const { bare, strings } = lexSwift(source);
  const findings = [];
  const client = role === true || role === 'client';
  for (const s of strings) {
    if (/^http$/i.test(s.value) || /\bhttp:\/\//i.test(s.value) || /^ws$/i.test(s.value) || /\bws:\/\//i.test(s.value)) {
      findings.push(`${name}:${String(lineOf(bare, s.start))} writes ${JSON.stringify(s.value.slice(0, 40))}; the door client builds https URLs only (SPEC §3.2)`);
    }
  }
  if (client && !strings.some((s) => s.value === 'https')) findings.push(`${name} never names the https scheme`);
  if ((client || role === 'node') && /\bProxyConfiguration\s*\(/.test(bare) && !/\ballowFailover\s*=\s*false\b/.test(bare)) {
    findings.push(`${name} builds a proxy and never sets allowFailover = false, so a failed proxy could send a packet to the tailnet range directly`);
  }
  return findings;
}

/** The argument text after a `label:` at `from` (just past the colon), to the next `,` or `)` at its own depth. */
function argumentAt(bare, from) {
  let depth = 0;
  let k = from;
  for (; k < bare.length; k += 1) {
    const c = bare[k];
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) break;
      depth -= 1;
    } else if (c === ',' && depth === 0) break;
  }
  return bare.slice(from, k).trim();
}

/** The functions a door client declares that return a URLSessionConfiguration: its own configuration builders. */
export function configurationFunctions(clientSource) {
  const { bare } = lexSwift(clientSource);
  return [...bare.matchAll(/\bfunc\s+([A-Za-z_]\w*)\s*(?:<[^>{]*>)?\s*\([^{]*?\)\s*(?:throws\s*)?->\s*URLSessionConfiguration\b/g)].map((m) => m[1]);
}

/**
 * Rule (c), the configuration half, over one app file. Every session the app
 * builds is `.ephemeral`: no cache, no cookie jar, no credential store on
 * disk, and never a background session that iOS runs after the app has left
 * (316.3's verification planted `.background(withIdentifier:)` in the door
 * client with every rule green). `role` as for ruleHttpsOnly.
 *
 * The hardening round (the reverify made three more with this rule green,
 * none of them naming the type): `URLSession.shared` (a shared cache, cookie
 * jar and credential store); `URLSession(configuration: .default, …)`, an
 * implicit member; and `let c: URLSessionConfiguration = .default`, a typed
 * one. So `URLSession.shared` is refused, every `configuration:` argument is
 * `.ephemeral` or a call to one of the door client's own configuration
 * builders (`clientBuilders`, which must themselves return only ephemeral
 * ones), and every value TYPED URLSessionConfiguration, a builder's own
 * `return .x` included, is `.ephemeral`.
 */
export function ruleEphemeralOnly(name, source, role, clientBuilders = []) {
  const { bare } = lexSwift(source);
  const findings = [];
  const at = (i) => `${name}:${String(lineOf(bare, i))}`;
  let ephemeral = 0;
  for (const m of bare.matchAll(/\bURLSessionConfiguration\s*(?:\.\s*([A-Za-z_]\w*)|\()/g)) {
    if (m[1] === 'ephemeral') {
      ephemeral += 1;
      continue;
    }
    findings.push(`${at(m.index)} builds a URLSessionConfiguration ${m[1] === undefined ? 'by its initialiser' : `as .${m[1]}`}; the door client's is .ephemeral and nothing else`);
  }
  for (const m of bare.matchAll(/\bURLSession\s*\.\s*shared\b/g)) {
    findings.push(`${at(m.index)} uses URLSession.shared, which keeps a cache, cookies and credentials; the door client builds its own ephemeral session`);
  }
  const builders = clientBuilders.map((b) => b.replace(/[^A-Za-z0-9_]/g, '')).filter((b) => b !== '');
  const builderCall = builders.length === 0 ? null : new RegExp(`^(?:(?:Self|DoorClient)\\s*\\.\\s*)?(?:${builders.join('|')})\\s*\\(`);
  for (const m of bare.matchAll(/[(,]\s*configuration\s*:(?!:)/g)) {
    const arg = argumentAt(bare, m.index + m[0].length).replace(/\s+/g, ' ');
    if (/^(?:URLSessionConfiguration\s*)?\.\s*ephemeral$/.test(arg)) continue;
    if (builderCall !== null && builderCall.test(arg) && matchForward(arg, arg.indexOf('(')) === arg.length - 1) continue;
    findings.push(`${at(m.index)} passes configuration: ${JSON.stringify(arg.slice(0, 60))}; a session is built from .ephemeral or the door client's own builder${builders.length === 0 ? '' : ` (${builders.join(', ')})`}, and nothing else`);
  }
  for (const m of bare.matchAll(/:\s*URLSessionConfiguration\s*[?!]?\s*(?:=\s*|\{\s*(?:return\s+)?)\.\s*([A-Za-z_]\w*)/g)) {
    if (m[1] !== 'ephemeral') findings.push(`${at(m.index)} types a URLSessionConfiguration as .${m[1]}; the door client's is .ephemeral and nothing else`);
  }
  for (const m of bare.matchAll(/->\s*URLSessionConfiguration\s*[?!]?\s*(?:where\b[^{]*)?\{/g)) {
    const open = m.index + m[0].length - 1;
    const close = matchForward(bare, open);
    const body = bare.slice(open + 1, close === -1 ? bare.length : close);
    for (const r of body.matchAll(/(?:^\s*|\breturn\s+)\.\s*([A-Za-z_]\w*)/g)) {
      if (r[1] !== 'ephemeral') findings.push(`${at(open + 1 + r.index)} returns .${r[1]} as a URLSessionConfiguration; the door client's is .ephemeral and nothing else`);
    }
  }
  if ((role === true || role === 'client') && ephemeral === 0) findings.push(`${name} never builds its configuration as URLSessionConfiguration.ephemeral`);
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

/** The keys rule (e) pins exactly; a modified spelling of one would stand beside the pinned value, unread. */
const PINNED_PLIST_KEYS = new Set(['NSAppTransportSecurity', 'NSExceptionDomains', 'NSLocalNetworkUsageDescription']);

/** What CFBundle reads a key as, said after its path when that is not its spelling. */
const readAs = (k) => (plistBaseKey(k.key) === k.key ? '' : ` (read as ${plistBaseKey(k.key)} at run time)`);

/**
 * Why a key, by the name CFBundle reads it as, is refused wherever it is
 * written, or null. The list rule (e) holds in Info.plist, in every other
 * property list under ios/, and in every `INFOPLIST_KEY_` build setting.
 */
export function refusedPlistKey(base) {
  if (/^NSAllowsArbitraryLoads/.test(base)) return 'NSAllowsArbitraryLoads stays refused (SPEC §3.2)';
  if (base === 'UIBackgroundModes') return 'the app has no background mode, ever (SPEC §4.0, §7)';
  if (base === 'BGTaskSchedulerPermittedIdentifiers') return 'the node is up while the app is, and nothing is scheduled to run it in the background (research 128 §2, guideline 2.5.4)';
  if (base === 'NSAllowsLocalNetworking') return 'ATS already allows loopback and nothing else local is dialled';
  if (base === 'ITSAppUsesNonExemptEncryption') return 'the export-compliance answer for an app carrying WireGuard is a legal one and his (SPEC §6 decision 7), so no agent writes it';
  return null;
}

/** The build settings Xcode preprocesses Info.plist with: a macro can spell any key the file does not show. */
const INFOPLIST_PREPROCESSING = /\bINFOPLIST_(?:PREPROCESS|PREFIX_HEADER|PREPROCESSOR_DEFINITIONS|OTHER_PREPROCESSOR_FLAGS)\b/g;

/**
 * Every assignment of a build setting in a project file or an xcconfig, with
 * its conditions (`INFOPLIST_FILE[sdk=iphoneos*]`) and its value unquoted.
 * `text` has its comments out already for an xcconfig.
 */
export function settingAssignments(text, name) {
  const out = [];
  const re = new RegExp(`(?:^|[\\s{;"])"?(${name})((?:\\[[^\\]\\n]*\\])*)"?\\s*=\\s*("(?:[^"\\\\]|\\\\.)*"|[^;\\n]*)`, 'g');
  for (const m of text.matchAll(re)) {
    out.push({ at: m.index, setting: m[1], conditions: m[2], value: m[3].trim().replace(/;$/, '').trim().replace(/^"|"$/g, '').replace(/\\(.)/g, '$1') });
  }
  return out;
}

/** The text of the pbxproj object with this id: its `{ … }`, quotes respected. */
function pbxObject(pbx, id) {
  const head = new RegExp(`(?:^|\\n)\\s*${id}\\b[^=\\n]*=\\s*\\{`).exec(pbx);
  if (head === null) return null;
  const open = head.index + head[0].length - 1;
  let depth = 0;
  for (let i = open; i < pbx.length; i += 1) {
    const c = pbx[i];
    if (c === '"') {
      i += 1;
      while (i < pbx.length && pbx[i] !== '"') i += pbx[i] === '\\' ? 2 : 1;
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return pbx.slice(open, i + 1);
    }
  }
  return null;
}

/**
 * Every build configuration of every application target in the project:
 * `{ id, name, settings }`. The app is the target whose product type is an
 * application; its configurations are the ones its configuration list names.
 */
export function appConfigurations(pbx) {
  const out = [];
  for (const t of pbx.matchAll(/(?:^|\n)\s*(\w+)\s*\/\*[^*]*\*\/\s*=\s*\{\s*isa\s*=\s*PBXNativeTarget;/g)) {
    const target = pbxObject(pbx, t[1]);
    if (target === null || !/productType\s*=\s*"com\.apple\.product-type\.application"/.test(target)) continue;
    const listId = /buildConfigurationList\s*=\s*(\w+)/.exec(target)?.[1];
    const list = listId === undefined ? null : pbxObject(pbx, listId);
    const ids = list === null ? [] : [.../buildConfigurations\s*=\s*\(([^)]*)\)/.exec(list)?.[1].matchAll(/\b(\w{6,})\b\s*\/\*/g) ?? []].map((m) => m[1]);
    for (const id of ids) {
      const body = pbxObject(pbx, id);
      if (body === null) continue;
      out.push({ id, name: /\bname\s*=\s*"?([^";]+)"?\s*;\s*\}$/.exec(body)?.[1] ?? id, settings: body });
    }
  }
  return out;
}

/** The app's own Info.plist, relative to ios/ (SRCROOT). */
const APP_INFO_PLIST = 'Tortie/Info.plist';

/**
 * Rule (e), the SOURCE half, over the project file and every xcconfig under
 * ios/: the app is built from Tortie/Info.plist in every configuration, with
 * nothing generated or preprocessed into it. 316.3's reverify built a Release
 * app from a second plist (INFOPLIST_FILE on one configuration) and another
 * from a macro (INFOPLIST_PREPROCESS) that spelled `UIBackgroundModes`, both
 * with this rule green.
 */
export function ruleInfoPlistSource(pbxproj, xcconfigs = []) {
  const findings = [];
  const said = { configurations: 0 };
  const sources = [{ name: 'project.pbxproj', text: pbxproj }, ...xcconfigs.map((x) => ({ name: x.name, text: xcconfigBare(x.text) }))];
  for (const s of sources) {
    for (const a of settingAssignments(s.text, 'INFOPLIST_FILE')) {
      if (a.value !== APP_INFO_PLIST) {
        findings.push(`${s.name} sets INFOPLIST_FILE${a.conditions} to ${JSON.stringify(a.value)} (at ${String(lineOf(s.text, a.at))}); every configuration builds the app from ${APP_INFO_PLIST}, the one file this rule reads`);
      }
    }
    for (const m of s.text.matchAll(INFOPLIST_PREPROCESSING)) {
      findings.push(`${s.name} names ${m[0]} (at ${String(lineOf(s.text, m.index))}), so a macro could write a key into the built Info.plist that the file does not show`);
    }
    for (const m of s.text.matchAll(/\bINFOPLIST_KEY_([A-Za-z0-9_]+)/g)) {
      const base = plistBaseKey(m[1]);
      const why = refusedPlistKey(base) ?? (PINNED_PLIST_KEYS.has(base) && base !== 'NSLocalNetworkUsageDescription' ? 'rule (e) pins it in Info.plist' : null);
      if (why !== null) findings.push(`${s.name} names INFOPLIST_KEY_${m[1]} (at ${String(lineOf(s.text, m.index))}), which would put ${base} into the built Info.plist that the file does not show; ${why}`);
    }
    for (const m of s.text.matchAll(/NSAllowsArbitraryLoads\w*/g)) {
      if (!/INFOPLIST_KEY_$/.test(s.text.slice(Math.max(0, m.index - 13), m.index))) findings.push(`${s.name} names ${m[0]} (at ${String(lineOf(s.text, m.index))}); NSAllowsArbitraryLoads stays refused (SPEC §3.2)`);
    }
    if (s.name !== 'project.pbxproj') {
      for (const a of settingAssignments(s.text, 'GENERATE_INFOPLIST_FILE')) {
        if (!/^NO$/i.test(a.value)) findings.push(`${s.name} sets GENERATE_INFOPLIST_FILE${a.conditions} to ${a.value}, so Xcode could write keys into the app's Info.plist that no file shows`);
      }
    }
  }
  const apps = appConfigurations(pbxproj);
  said.configurations = apps.length;
  if (apps.length === 0) findings.push('project.pbxproj has no application target this rule can read, so it cannot say which Info.plist the app is built from');
  for (const c of apps) {
    const file = settingAssignments(c.settings, 'INFOPLIST_FILE');
    if (!file.some((a) => a.conditions === '' && a.value === APP_INFO_PLIST)) {
      findings.push(`the app's ${c.name} configuration does not set INFOPLIST_FILE = ${APP_INFO_PLIST}, so it could be built from a plist this rule never reads`);
    }
    const generate = settingAssignments(c.settings, 'GENERATE_INFOPLIST_FILE');
    if (!generate.some((a) => a.conditions === '' && a.value === 'NO') || generate.some((a) => a.value !== 'NO')) {
      findings.push(`the app's ${c.name} configuration does not set GENERATE_INFOPLIST_FILE = NO everywhere, so Xcode could merge INFOPLIST_KEY_ settings into the app's Info.plist`);
    }
  }
  return { findings, said };
}

/**
 * Rule (e), the SPELLING half, over one property list file's text and what
 * CoreFoundation read from it: a key is written plainly, so the name a person
 * reads in the file is the name the device reads. No character or entity
 * reference in a key (`UIBackground&#77;odes` is UIBackgroundModes to
 * CoreFoundation), no build setting in a key (Xcode expands `$(…)` while it
 * copies the file), and no key spelled twice (CoreFoundation keeps the last).
 */
export function rulePlistSpelling(name, text, cf) {
  const findings = [];
  if (typeof text !== 'string' || !/<plist\b/.test(text)) return findings;
  const bare = text.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '));
  let spelled = 0;
  for (const m of bare.matchAll(/<key>([\s\S]*?)<\/key>/g)) {
    spelled += 1;
    const at = `${name}:${String(lineOf(bare, m.index))}`;
    if (/[&<]/.test(m[1])) findings.push(`${at} spells the key ${JSON.stringify(m[1].slice(0, 60))} with a reference or markup; a key is written plainly, so what the file shows is what the device reads`);
    if (/\$[({]/.test(m[1])) findings.push(`${at} writes a build setting into the key ${JSON.stringify(m[1].slice(0, 60))}; Xcode expands it while it copies the file, so the device would read a key the file does not show`);
  }
  let read = 0;
  const count = (v) => {
    if (Array.isArray(v)) v.forEach(count);
    else if (v !== null && typeof v === 'object') {
      for (const x of Object.values(v)) {
        read += 1;
        count(x);
      }
    }
  };
  count(cf);
  if (spelled > read) findings.push(`${name} spells ${String(spelled)} keys and CoreFoundation reads ${String(read)}: a key written twice in one dictionary is read once, as its LAST value, so the file shows a value the device never reads`);
  return findings;
}

/**
 * Rule (e), over Info.plist as CoreFoundation reads it, the project file and
 * every xcconfig under ios/ (`{ name, text }`), since an xcconfig a project
 * names sets build settings just as the project does.
 */
export function rulePlist(plist, pbxproj, xcconfigs = []) {
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
    // Compared by the name CFBundle reads, never by the spelling.
    const base = plistBaseKey(k.key);
    const at = `${k.path}${readAs(k)}`;
    const why = refusedPlistKey(base);
    if (why !== null) findings.push(`Info.plist carries ${at}; ${why}`);
    // A modified spelling of a key this rule pins exactly, or of anything
    // inside the ATS dictionary, would be read on the device beside (or over)
    // the one value the rule checked.
    if (base !== k.key && (PINNED_PLIST_KEYS.has(base) || k.path.startsWith('NSAppTransportSecurity'))) {
      findings.push(`Info.plist carries ${at}; a platform or device spelling of a key this rule pins would be read in place of the one it checked`);
    }
  }
  // Phase 316.3: the node's direct path to a Mac on the same Wi-Fi is a local
  // network send, so iOS asks, and the app says why in one sentence
  // (research 128 §2). In the plist itself: the hardening round requires
  // GENERATE_INFOPLIST_FILE = NO, under which an INFOPLIST_KEY_ setting never
  // reaches the built file.
  const localWhy = plist?.NSLocalNetworkUsageDescription;
  if (typeof localWhy !== 'string' || localWhy.trim() === '') {
    findings.push('Info.plist has no NSLocalNetworkUsageDescription, so the prompt the node\'s direct path raises would go unexplained (SPEC §4 S3, research 128 §2)');
  } else if (!/^[^\s].*[.]$/.test(localWhy.trim()) || /[.!?]\s+\S/.test(localWhy.trim().slice(0, -1)) || localWhy.length > 200) {
    findings.push(`NSLocalNetworkUsageDescription is ${JSON.stringify(localWhy.slice(0, 80))}; it is one sentence, at most 200 characters, ending in a full stop`);
  }
  if (typeof pbxproj === 'string') {
    findings.push(...ruleInfoPlistSource(pbxproj, xcconfigs).findings);
    for (const m of pbxproj.matchAll(/\bcom\.apple\.BackgroundModes\b/g)) {
      findings.push(`project.pbxproj turns on the Background Modes capability (${m[0]}); the app has no background mode, ever`);
    }
  }
  return findings;
}

/**
 * NetworkExtension's classes. The fix round listed Apple's prefixes (`NEVPN…`,
 * `NETunnel…`, …) and the reverify linked the framework with `NEPacket`, which
 * the list lacked; so the hardening round refuses the SHAPE, every `NE`
 * followed by a capital and a letter, in code and inside a string (which is
 * how `NSClassFromString` reaches one). Nothing in the app is named that way,
 * and a comment is blanked before the rule reads.
 */
const NE_CLASS = /\bNE[A-Z][A-Za-z]\w*/;

const VPN_TOKENS = [
  // Every spelling of the import, plain, attributed (`@preconcurrency`,
  // `@_exported`, `@_implementationOnly`), SCOPED (`import class
  // NetworkExtension.NEHotspotConfigurationManager` links the framework just
  // as the plain import does: 316.3's verification built one and `otool -L`
  // named it, with this rule green), and with the module in backticks
  // (`import \`NetworkExtension\``, which the reverify linked with this rule
  // green: backticks are how Swift escapes any identifier).
  /\bimport\s+(?:(?:typealias|struct|class|enum|protocol|let|var|func|actor)\s+)?`?NetworkExtension(?![A-Za-z0-9_])/,
  NE_CLASS,
  /com\.apple\.developer\.networking\./,
  // The capability as the project file records it (Phase 316.3).
  /\bcom\.apple\.NetworkExtensions\b/
];

/**
 * A Swift package in the project (the hardening round). Its sources are never
 * under ios/, so no rule here reads them, and one of them could link
 * NetworkExtension, run a background task or keep the key: the reverify added
 * a remote package with this rule green. The app takes no package.
 */
const SWIFT_PACKAGES = /\bXC(?:Remote|Local)SwiftPackageReference\b|\bXCSwiftPackageProductDependency\b/;

/**
 * Rule (f), outside Swift: the framework's own name anywhere a compiler or a
 * linker reads it. `@import NetworkExtension;`, `#import
 * <NetworkExtension/NetworkExtension.h>`, `-framework NetworkExtension` in
 * OTHER_LDFLAGS (as a string or an array), a file reference to
 * `NetworkExtension.framework`: every one of them spells the name, and no
 * project, plist, xcconfig, header or Objective-C file of this app has a
 * reason to.
 */
const NE_NAME = /\bNetworkExtension\b/;

/** Rule (f), over one file of any kind under ios/. */
export function ruleNoVpn(name, source) {
  const findings = [];
  const swift = name.endsWith('.swift');
  const bareOf = () => {
    if (swift) return lexSwift(source);
    if (C_FAMILY.test(name)) return { bare: cFamilyBare(source), strings: [] };
    if (name.endsWith('.xcconfig')) return { bare: xcconfigBare(source), strings: [] };
    return { bare: source, strings: [] };
  };
  const { bare, strings } = bareOf();
  for (const re of swift ? VPN_TOKENS : [...VPN_TOKENS, NE_NAME]) {
    for (const m of bare.matchAll(new RegExp(re.source, 'g'))) findings.push(`${name}:${String(lineOf(bare, m.index))} names ${m[0]}; the phone carries a node, never a VPN (research 128 §3)`);
  }
  if (!swift) {
    for (const m of bare.matchAll(new RegExp(SWIFT_PACKAGES.source, 'g'))) {
      findings.push(`${name}:${String(lineOf(bare, m.index))} adds a Swift package (${m[0]}), whose sources are outside ios/ and read by no rule here, so it could link NetworkExtension unseen; the app takes no package`);
    }
  }
  if (swift) {
    for (const s of strings) {
      if (/\bvpn\b/i.test(s.value)) findings.push(`${name}:${String(lineOf(bare, s.start))} writes a VPN string`);
      if (NE_NAME.test(s.value) || NE_CLASS.test(s.value)) findings.push(`${name}:${String(lineOf(bare, s.start))} writes a NetworkExtension name into a string, which is how a class is looked up without an import`);
    }
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
  // Phase 316.3's fix round: a plan that leaves code coverage on instruments
  // every `xcodebuild build` through the scheme, Release included (the
  // verification found __llvm_prf sections and the profile runtime's setenv in
  // a Release device binary), so it is written off here. Not an archive: the
  // reverify archived with coverage on and found no section, so the sentence
  // says `xcodebuild build` and no more (the hardening round).
  if (d.codeCoverage !== false) findings.push(`${name} does not set codeCoverage to false, so every \`xcodebuild build\` through the scheme is instrumented`);
  for (const c of Array.isArray(plan?.configurations) ? plan.configurations : []) {
    const o = c?.options ?? {};
    if (o.codeCoverage !== undefined && o.codeCoverage !== false) findings.push(`${name}'s configuration ${JSON.stringify(c?.name)} turns code coverage back on`);
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
// Rules (l) to (p): the tailnet node (Phase 316.3, build/p316/SPEC.md §4 S3)
// ---------------------------------------------------------------------------
//
// NO AGENT-RUN NODE EVER CONTACTS TAILSCALE'S SERVERS, AND NO AGENT HOLDS A
// REAL KEY. These rules are the text half of that: the one file that can
// start a node, what it is called, where its state lives and that the state
// is never backed up, that nothing it keeps can leave the phone, that the
// library's use of required-reason APIs is declared, and that the key he mints
// by hand is never written down. What the node DOES is `test:ios` and
// `probe:p316`'s.

/** The node's file, relative to ios/. */
export const NODE_REL = 'Tortie/Tailnet/Node.swift';
/** The node's name on his tailnet (SPEC §4 S3 B (c)). */
export const NODE_HOSTNAME = 'tortie-phone';
/** Where the project takes the framework from (SPEC §4 S3 A and B). */
export const VENDORED_XCFRAMEWORK = '../build/vendor/tailscalekit/TailscaleKit.xcframework';

// The module in backticks too (the hardening round: backticks are how Swift
// escapes any identifier, and rule f's import pattern missed them).
const IMPORT_TAILSCALEKIT = /(?:^|[^\w.])import\s+(?:(?:struct|class|enum|protocol|typealias|func|let|var|actor)\s+)?`?TailscaleKit(?![A-Za-z0-9_])/g;
const BACKGROUND_KEEPALIVE = [
  /\bbeginBackgroundTask\b/,
  /\bBGTaskScheduler\b/,
  /\bimport\s+BackgroundTasks\b/,
  /\bBG(?:AppRefresh|Processing|ContinuedProcessing|HealthResearch)Task(?:Request)?\b/,
  /\bBGContinuedProcessing\w*/,
  /\.\s*backgroundTask\s*\(/,
  // Phase 316.3's fix round: the other ways to keep running after the app
  // leaves the screen, each planted in the node or the door client by the
  // verification with this rule green.
  /\bperformExpiringActivity\b/,
  /\.\s*background\s*\(\s*withIdentifier\b/,
  /\bbackgroundSessionConfiguration\w*/,
  /\bsessionSendsLaunchEvents\b/,
  /\bsetMinimumBackgroundFetchInterval\b/,
  /\ballowsBackgroundLocationUpdates\b/,
  // The hardening round: Core Location's monitoring RELAUNCHES an app that is
  // not running, with no background mode (the reverify planted
  // significant-change monitoring with this rule green).
  /\bstartMonitoringSignificantLocationChanges\b/,
  /\bstartMonitoringVisits\b/,
  /\bstartMonitoringLocationPushes\b/,
  /\bstartMonitoring\s*\(\s*for\b/,
  /\bCLMonitor\b/,
  /\bCLBackgroundActivitySession\b/
];

/** The innermost `(`, `[` or `{` still open at `at`, or -1. */
function innermostOpener(text, at) {
  let depth = 0;
  for (let k = at - 1; k >= 0; k -= 1) {
    const c = text[k];
    if (c === ')' || c === ']' || c === '}') depth += 1;
    else if (c === '(' || c === '[' || c === '{') {
      if (depth === 0) return k;
      depth -= 1;
    }
  }
  return -1;
}

/** What the `{` at `open` opens: 'type' for a type or extension body, 'body' for anything else. */
function braceKind(text, open) {
  let h = open - 1;
  while (h >= 0 && !';{}'.includes(text[h])) h -= 1;
  const header = text.slice(h + 1, open);
  if (/\b(?:class|struct|actor|enum|extension|protocol)\s+[A-Za-z_]/.test(header) && !/\b(?:func|init|deinit|subscript|let|var|get|set|willSet|didSet)\b|=/.test(header)) {
    return 'type';
  }
  return 'body';
}

/** Where `at` sits: at file level, in a type's own body, or inside a function or closure body. */
function scopeOf(text, at) {
  let k = at;
  for (;;) {
    const open = innermostOpener(text, k);
    if (open === -1) return 'file';
    if (text[open] === '{') return braceKind(text, open);
    k = open;
  }
}

/** The `{` of the outermost function or closure body holding `at` (the member's own body), or -1. */
function memberBody(text, at) {
  let k = at;
  let found = -1;
  for (;;) {
    const open = innermostOpener(text, k);
    if (open === -1) return found;
    if (text[open] === '{') {
      if (braceKind(text, open) === 'type') return found;
      found = open;
    }
    k = open;
  }
}

/** A pbxproj string's value, unescaped. */
const unescapePbx = (s) => s.replace(/\\(.)/g, (_, c) => (c === 'n' ? '\n' : c === 't' ? '\t' : c));

/** A shell script with its comment lines and the insides of its quotes taken out, so only commands are left. */
function shellCommands(script) {
  return script
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .map((l) => l.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""').replace(/\s#.*$/, ''))
    .join('\n');
}

/** A command that fetches or builds, by bare name or full path (`/usr/bin/make`, `/opt/homebrew/bin/go`). */
const BUILDS_OR_FETCHES = /(?:^|[\s;&|(`])(?:[\w.~-]*\/)*(curl|wget|git|go|gomobile|make|xcodebuild|xcrun|swift|npm|npx|node|pip3?|brew|ssh|scp|rsync|sh|bash|zsh)(?=$|[\s;&|)`])/m;

/** Rule (l), the project half: the framework is the vendored build, embedded signed, and only checked for. */
export function ruleVendoredFramework(pbxproj) {
  const findings = [];
  const said = { phases: 0 };
  const refs = [...pbxproj.matchAll(/\{\s*isa\s*=\s*PBXFileReference;[^{}]*\}/g)].filter((m) => /TailscaleKit/.test(m[0]));
  if (refs.length === 0) findings.push('project.pbxproj references no TailscaleKit.xcframework, so the app carries no node, or not the vendored one');
  for (const r of refs) {
    const path = /\bpath\s*=\s*"?([^";]+?)"?\s*;/.exec(r[0])?.[1] ?? null;
    if (path !== VENDORED_XCFRAMEWORK) {
      findings.push(`project.pbxproj takes TailscaleKit from ${String(path)}; it comes from ${VENDORED_XCFRAMEWORK}, built from pinned source by npm run vendor:tailscalekit`);
    }
  }
  const embeds = [...pbxproj.matchAll(/\/\*\s*TailscaleKit\.xcframework in Embed Frameworks\s*\*\/\s*=\s*\{[^\n]*\}\s*;/g)];
  if (embeds.length === 0) findings.push('project.pbxproj never embeds TailscaleKit.xcframework, so the app would launch without its node');
  for (const e of embeds) {
    if (!/\bCodeSignOnCopy\b/.test(e[0])) {
      findings.push('project.pbxproj embeds TailscaleKit.xcframework without CodeSignOnCopy, so the framework, and the privacy manifest written into it, are not sealed with the app (research 128 §2: injecting a manifest is a signing step)');
    }
  }
  const scripts = [...pbxproj.matchAll(/\bshellScript\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/g)].map((m) => unescapePbx(m[1]));
  said.phases = scripts.length;
  if (!scripts.some((s) => /\bvendor:tailscalekit\b/.test(s))) {
    findings.push('no build phase names npm run vendor:tailscalekit, so a missing framework would be a wall of linker errors rather than one sentence (SPEC §4 S3 B)');
  }
  for (const s of scripts) {
    const bad = BUILDS_OR_FETCHES.exec(shellCommands(s));
    if (bad !== null) {
      findings.push(`a shell build phase in project.pbxproj runs ${bad[1]}; the build only CHECKS that the vendored framework is there, and never fetches or builds anything (SPEC §4 S3 B)`);
    }
  }
  return { findings, said };
}

/**
 * Rule (l), over every Swift file under ios/ (`{ name, source }`, names
 * relative to ios/, so app files start `Tortie/`).
 */
export function ruleNodeOnly(files, nodeRel = NODE_REL) {
  const findings = [];
  const said = { imports: 0, constructs: 0, configs: 0, privateDecls: 0 };
  const node = files.find((f) => f.name === nodeRel);
  if (node === undefined) findings.push(`ios/${nodeRel} does not exist, so the node has no file of its own`);
  for (const f of files) {
    const { bare } = lexSwift(f.source);
    const isNode = f === node;
    const isApp = f.name.startsWith('Tortie/');
    const at = (m) => `ios/${f.name}:${String(lineOf(bare, m.index))}`;
    for (const m of bare.matchAll(/@_exported\b/g)) {
      findings.push(`${at(m)} re-exports a module with @_exported, which would carry TailscaleKit's names into files that never import it`);
    }
    for (const m of bare.matchAll(IMPORT_TAILSCALEKIT)) {
      if (isNode) said.imports += 1;
      else findings.push(`${at(m)} imports TailscaleKit; only ${nodeRel} may, so no other file, and no test, can start a node`);
    }
    if (!isNode) {
      for (const m of bare.matchAll(/\bTailscaleNode\b/g)) findings.push(`${at(m)} names TailscaleNode; the node lives in ${nodeRel} and nowhere else`);
    }
    if (isApp) {
      for (const re of BACKGROUND_KEEPALIVE) {
        for (const m of bare.matchAll(new RegExp(re.source, 'g'))) {
          findings.push(`${at(m)} names ${m[0].replace(/\s+/g, ' ')}; the node is up while the app is and stops when it leaves the screen, and nothing keeps it running in the background (research 128 §2, guideline 2.5.4)`);
        }
      }
      for (const m of bare.matchAll(/\bephemeral\s*[:=]\s*true\b/g)) {
        findings.push(`${at(m)} makes the node ephemeral; it never is, because an ephemeral node vanishes and his one-off key cannot bring it back (research 128 §8 (v))`);
      }
    }
  }
  if (node === undefined) return { findings, said };

  const { bare, code, strings } = lexSwift(node.source);
  const inside = debugLines(code);
  const where = (offset) => `ios/${nodeRel}:${String(lineOf(bare, offset))}`;
  if (said.imports === 0) findings.push(`ios/${nodeRel} does not import TailscaleKit, so it starts no node and this rule would assert nothing`);
  said.constructs = [...bare.matchAll(/\bTailscaleNode\s*\(/g)].length;
  if (said.constructs === 0) findings.push(`ios/${nodeRel} never constructs a TailscaleNode, so this rule would assert nothing`);

  // The node cannot leave the file: a declaration naming its type at file or
  // type level is private (never `private(set)`, whose getter is not), or
  // sits inside a type that is.
  const privateHead = /\b(?:private|fileprivate)\b(?!\s*\()/;
  const insidePrivateType = (offset) => {
    let k = offset;
    for (;;) {
      const open = innermostOpener(bare, k);
      if (open === -1) return false;
      if (bare[open] === '{' && braceKind(bare, open) === 'type') {
        let h = open - 1;
        while (h >= 0 && !';{}'.includes(bare[h])) h -= 1;
        if (privateHead.test(bare.slice(h + 1, open))) return true;
      }
      k = open;
    }
  };
  for (const m of bare.matchAll(/\bTailscaleNode\b/g)) {
    if (/^\s*[.(]/.test(bare.slice(m.index + 'TailscaleNode'.length))) continue;
    if (scopeOf(bare, m.index) === 'body') continue;
    const decl = [...bare.slice(0, m.index).matchAll(/\b(?:let|var|func|init|subscript|typealias|case)\b/g)].pop();
    const lineStart = decl === undefined ? 0 : bare.lastIndexOf('\n', decl.index) + 1;
    const head = decl === undefined ? '' : bare.slice(lineStart, decl.index);
    if (privateHead.test(head) || insidePrivateType(m.index)) {
      said.privateDecls += 1;
      continue;
    }
    findings.push(`${where(m.index)} declares something of type TailscaleNode that is not private, so the node could be handed out of ${nodeRel} and started elsewhere`);
  }

  // Its name, written once, outside DEBUG, and never another name.
  const named = strings.some((s) => s.value === NODE_HOSTNAME && s.interpolated === 0 && inside[lineOf(bare, s.start)] !== true);
  if (!named) findings.push(`ios/${nodeRel} never writes the hostname "${NODE_HOSTNAME}" outside #if DEBUG (SPEC §4 S3 B (c))`);
  for (const h of bare.matchAll(/\bhost[Nn]ame\s*[:=](?![:=])/g)) {
    let v = h.index + h[0].length;
    while (/\s/.test(bare[v] ?? '')) v += 1;
    const literal = strings.find((s) => s.start === v);
    if (literal !== undefined && literal.value !== NODE_HOSTNAME) {
      findings.push(`${where(h.index)} names the node ${JSON.stringify(literal.value)}; it is ${JSON.stringify(NODE_HOSTNAME)}`);
    }
  }

  // Every TailscaleKit Configuration( is made with ephemeral: false written out.
  for (const c of bare.matchAll(/\bConfiguration\s*\(/g)) {
    const open = c.index + c[0].length - 1;
    const close = closeParen(bare, open);
    if (close === -1) continue;
    said.configs += 1;
    if (!/\bephemeral\s*:\s*false\b/.test(bare.slice(open, close + 1))) {
      findings.push(`${where(c.index)} configures the node without ephemeral: false written out; it is never ephemeral, and saying so is what keeps an upstream default from changing it`);
    }
  }
  if (said.configs === 0) findings.push(`ios/${nodeRel} makes no TailscaleKit Configuration(, so the node's name and whether it is ephemeral cannot be read`);
  return { findings, said };
}

/** Where the node's state must never be kept, and why each is wrong. */
const STATE_ELSEWHERE = [
  /\.\s*(?:cachesDirectory|documentDirectory|documentsDirectory|temporaryDirectory|downloadsDirectory|itemReplacementDirectory|sharedPublicDirectory)\b/,
  /\bNSTemporaryDirectory\s*\(/,
  /\bNSHomeDirectory\s*\(/,
  /\bcontainerURL\s*\(\s*forSecurityApplicationGroupIdentifier\b/
];

/** Rule (m): the node's state directory, over the node's source (or null) and every app file. */
export function ruleStateDirectory(nodeName, nodeSource, appFiles) {
  const findings = [];
  const said = { creates: 0 };
  for (const f of appFiles) {
    const { bare } = lexSwift(f.source);
    for (const m of bare.matchAll(/\bisExcludedFromBackup\s*=\s*false\b|\.\s*setResourceValue\s*\(\s*false\s*,\s*forKey\s*:\s*(?:URLResourceKey\s*)?\.\s*isExcludedFromBackupKey/g)) {
      findings.push(`${f.name}:${String(lineOf(bare, m.index))} puts something back into his backups; the node's state is never backed up`);
    }
  }
  if (nodeSource === null) return { findings: [...findings, `${nodeName} does not exist, so the node's state has no directory this rule can read`], said };
  const { bare, code, strings } = lexSwift(nodeSource);
  const inside = debugLines(code);
  const where = (offset) => `${nodeName}:${String(lineOf(bare, offset))}`;
  if (!/\.\s*applicationSupportDirectory\b/.test(bare)) {
    findings.push(`${nodeName} never names .applicationSupportDirectory; the node's state lives in Application Support/tailnet/ (SPEC §4 S3 B (b))`);
  }
  if (!strings.some((s) => s.value === 'tailnet' && s.interpolated === 0 && inside[lineOf(bare, s.start)] !== true)) {
    findings.push(`${nodeName} never names the folder "tailnet" outside #if DEBUG`);
  }
  for (const re of STATE_ELSEWHERE) {
    for (const m of bare.matchAll(new RegExp(re.source, 'g'))) {
      findings.push(`${where(m.index)} names ${m[0].replace(/\s+/g, '')}; the node's state is never kept where iOS purges it, backs it up or shares it, because losing it costs him a second hand-minted key (research 128 §8)`);
    }
  }
  const excludes =
    (/\bisExcludedFromBackup\s*=\s*true\b/.test(bare) && /\.\s*setResourceValues\s*\(/.test(bare)) ||
    /\.\s*setResourceValue\s*\(\s*true\s*,\s*forKey\s*:\s*(?:URLResourceKey\s*)?\.\s*isExcludedFromBackupKey\s*\)/.test(bare);
  if (!excludes) {
    findings.push(`${nodeName} never sets isExcludedFromBackup = true through setResourceValues, so the node's state would go into his backups and could be restored onto another phone`);
  }
  for (const m of bare.matchAll(/\bcreateDirectory\s*\(/g)) {
    said.creates += 1;
    const open = memberBody(bare, m.index);
    const close = open === -1 ? bare.length : matchForward(bare, open);
    if (!/\.\s*setResourceValues?\s*\(/.test(bare.slice(m.index, close === -1 ? bare.length : close))) {
      findings.push(`${where(m.index)} creates a directory and does not exclude it from backup after, in the same body, so a state directory deleted while the app runs would come back included`);
    }
  }
  if (said.creates === 0) findings.push(`${nodeName} never creates the state directory, so its exclusion from backup would be set on a folder that may not exist`);
  return { findings, said };
}

const ACCESSIBLE_THIS_DEVICE = new Set([
  'kSecAttrAccessibleWhenUnlockedThisDeviceOnly',
  'kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly',
  'kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly'
]);

/** Rule (n), over every app file: every Keychain item is this device's only. */
export function ruleKeychain(files) {
  const findings = [];
  const said = { adds: 0, thisDevice: 0 };
  for (const f of files) {
    const { bare } = lexSwift(f.source);
    const at = (offset) => `${f.name}:${String(lineOf(bare, offset))}`;
    let named = 0;
    for (const m of bare.matchAll(/\bkSecAttrAccessible[A-Za-z]+\b/g)) {
      if (ACCESSIBLE_THIS_DEVICE.has(m[0])) {
        named += 1;
        continue;
      }
      findings.push(`${at(m.index)} names ${m[0]}; every Keychain item is ThisDeviceOnly, readable only on this phone and never restored onto another (SPEC §4 S2 A, S3 C)`);
    }
    said.thisDevice += named;
    const writes = [...bare.matchAll(/\bSecItem(Add|Update)\s*\(/g)];
    said.adds += writes.filter((w) => w[1] === 'Add').length;
    if (writes.length > 0 && named === 0) {
      findings.push(`${at(writes[0].index)} writes a Keychain item and this file never names a ThisDeviceOnly accessibility, so the item takes a default that can follow a backup to another phone`);
    }
    for (const m of bare.matchAll(/\bkSecAttrSynchronizableAny\b|\bkSecAttrSynchronizable\b[^,\n]*/g)) {
      if (m[0] === 'kSecAttrSynchronizableAny' || /\b(?:true|kCFBooleanTrue)\b/.test(m[0])) {
        findings.push(`${at(m.index)} lets a Keychain item synchronise to his other devices; nothing of the pairing leaves this phone`);
      }
    }
    for (const m of bare.matchAll(/\bNSUbiquitousKeyValueStore\b|\bimport\s+CloudKit\b/g)) {
      findings.push(`${at(m.index)} names ${m[0]}, which carries what it holds to his other devices; nothing of the pairing leaves this phone`);
    }
  }
  if (said.adds === 0) findings.push('no app file calls SecItemAdd, so this rule found no Keychain write to hold: the scanner stopped finding, or the pairing is kept somewhere else');
  return { findings, said };
}

/**
 * Apple's five required-reason categories and the reasons each admits
 * (https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api).
 */
export const PRIVACY_REASONS = {
  NSPrivacyAccessedAPICategoryFileTimestamp: ['DDA9.1', 'C617.1', '3B52.1', '0A2A.1'],
  NSPrivacyAccessedAPICategorySystemBootTime: ['35F9.1', '8FFB.1', '3D61.1'],
  NSPrivacyAccessedAPICategoryDiskSpace: ['85F4.1', 'E174.1', '7D9E.1', 'B728.1'],
  NSPrivacyAccessedAPICategoryActiveKeyboards: ['3EC4.1', '54BD.1'],
  NSPrivacyAccessedAPICategoryUserDefaults: ['CA92.1', '1C8F.1', 'C56D.1', 'AC6B.1']
};

/**
 * What TailscaleKit's manifest must declare: SPEC §3.6 measured `_stat`,
 * `_fstat`, `_lstat` (FileTimestamp) and `_mach_absolute_time`
 * (SystemBootTime) in the device framework's undefined symbols, all from the
 * Go runtime, and his decision 8 took C617.1 (files in the app's container)
 * and 35F9.1 (elapsed time) for them.
 */
export const FRAMEWORK_DECLARES = {
  NSPrivacyAccessedAPICategoryFileTimestamp: 'C617.1',
  NSPrivacyAccessedAPICategorySystemBootTime: '35F9.1'
};

/** The app's own Swift, read for each required-reason API, so its manifest is judged against what the app calls. */
const REQUIRED_REASON_USES = [
  ['NSPrivacyAccessedAPICategoryUserDefaults', /\bUserDefaults\b|\bNSUserDefaults\b|@AppStorage\b/],
  [
    'NSPrivacyAccessedAPICategoryFileTimestamp',
    /\.\s*(?:creationDate|modificationDate|contentModificationDate|fileModificationDate|contentAccessDate|attributeModificationDate)(?:Key)?\b|\battributesOfItem\s*\(|\b(?:stat|fstat|lstat|fstatat|getattrlist|getattrlistbulk|fgetattrlist|getattrlistat)\s*\(/
  ],
  ['NSPrivacyAccessedAPICategorySystemBootTime', /\bsystemUptime\b|\bmach_absolute_time\s*\(/],
  ['NSPrivacyAccessedAPICategoryDiskSpace', /\bvolume(?:Available|Total)Capacity\w*|\bsystemFreeSize\b|\bsystemSize\b|\b(?:statfs|statvfs|fstatfs|fstatvfs)\s*\(/],
  ['NSPrivacyAccessedAPICategoryActiveKeyboards', /\bactiveInputModes\b/]
];

/** The categories the app's own code uses, each with the first place it does. */
export function requiredCategories(files) {
  const out = new Map();
  for (const f of files) {
    const { bare } = lexSwift(f.source);
    for (const [cat, re] of REQUIRED_REASON_USES) {
      if (out.has(cat)) continue;
      const m = re.exec(bare);
      if (m !== null) out.set(cat, `${f.name}:${String(lineOf(bare, m.index))} (${m[0].trim()})`);
    }
  }
  return out;
}

const MANIFEST_KEYS = new Set(['NSPrivacyTracking', 'NSPrivacyTrackingDomains', 'NSPrivacyCollectedDataTypes', 'NSPrivacyAccessedAPITypes']);

/**
 * Rule (o), one privacy manifest. `need` maps each category it must declare
 * to the reason it must carry, or to null when any of Apple's will do.
 */
export function ruleManifest(label, plist, need) {
  const findings = [];
  const declared = new Map();
  if (plist === null || typeof plist !== 'object' || Array.isArray(plist)) return { findings: [`${label} is not a dictionary`], declared };
  if (plist.NSPrivacyTracking !== false) findings.push(`${label} does not set NSPrivacyTracking to false; Tortie tracks nobody`);
  for (const k of ['NSPrivacyTrackingDomains', 'NSPrivacyCollectedDataTypes']) {
    if (plist[k] === undefined) continue;
    if (!Array.isArray(plist[k]) || plist[k].length > 0) findings.push(`${label} holds ${k} ${JSON.stringify(plist[k]).slice(0, 80)}; Tortie contacts no tracking domain and collects nothing`);
  }
  for (const k of Object.keys(plist)) if (!MANIFEST_KEYS.has(k)) findings.push(`${label} holds ${k}, which is not a privacy manifest key`);
  const types = plist.NSPrivacyAccessedAPITypes;
  if (!Array.isArray(types)) findings.push(`${label} has no NSPrivacyAccessedAPITypes array`);
  for (const t of Array.isArray(types) ? types : []) {
    const cat = t?.NSPrivacyAccessedAPIType;
    const reasons = t?.NSPrivacyAccessedAPITypeReasons;
    if (typeof cat !== 'string' || !Object.prototype.hasOwnProperty.call(PRIVACY_REASONS, cat)) {
      findings.push(`${label} declares the category ${JSON.stringify(cat)}, which is not one of Apple's five`);
      continue;
    }
    if (declared.has(cat)) findings.push(`${label} declares ${cat} twice`);
    if (!Array.isArray(reasons) || reasons.length === 0) {
      findings.push(`${label} declares ${cat} with no reason`);
      continue;
    }
    for (const r of reasons) {
      if (!PRIVACY_REASONS[cat].includes(r)) findings.push(`${label} gives ${cat} the reason ${JSON.stringify(r)}, which Apple does not list for that category`);
    }
    declared.set(cat, reasons);
  }
  for (const [cat, reason] of Object.entries(need)) {
    const got = declared.get(cat);
    if (got === undefined) findings.push(`${label} does not declare ${cat}`);
    else if (reason !== null && !got.includes(reason)) findings.push(`${label} declares ${cat} without the reason ${reason}`);
  }
  return { findings, declared };
}

/**
 * TailscaleKit's manifest is written into the framework by
 * build/build-tailscalekit.mjs, under build/vendor/, which git ignores. The
 * gate reads its COMMITTED source, in this order: one `.xcprivacy` file under
 * build/ (not build/vendor/); else the pin, `build/tailscalekit-release.json`'s
 * `privacy.categories`, which is what the script renders into every slice (its
 * tracking, domain and collected-data fields are the script's own constants,
 * held by its --self-test and by the built product below); else the one
 * literal plist inside the script. Returns `{ label, plist }`,
 * `{ label, problem }`, or null when there is none.
 */
export function frameworkManifestSource(root) {
  const buildDir = join(root, 'build');
  const found = [];
  const look = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (p === join(buildDir, 'vendor') || e.name === 'node_modules') continue;
        look(p);
      } else if (e.name.endsWith('.xcprivacy')) found.push(p);
    }
  };
  look(buildDir);
  const relOf = (p) => relative(root, p).split(sep).join('/');
  const parsed = (label, text) => {
    try {
      return { label, plist: readPlistText(text) };
    } catch (err) {
      return { label, problem: `it could not be read as a plist: ${String(err?.message ?? err)}` };
    }
  };
  if (found.length > 1) return { label: found.map(relOf).join(' and '), problem: 'two committed sources for one manifest; there is one' };
  if (found.length === 1) return parsed(relOf(found[0]), readFileSync(found[0], 'utf8'));
  const pinPath = join(buildDir, 'tailscalekit-release.json');
  if (existsSync(pinPath)) {
    const label = `${relOf(pinPath)} privacy.categories`;
    let pin;
    try {
      pin = JSON.parse(readFileSync(pinPath, 'utf8'));
    } catch (err) {
      return { label, problem: `the pin is not JSON: ${String(err?.message ?? err)}` };
    }
    const categories = pin?.privacy?.categories;
    if (categories === null || typeof categories !== 'object' || Array.isArray(categories)) {
      return { label, problem: 'the pin holds no privacy.categories object, so the manifest the script writes has no source' };
    }
    return {
      label,
      plist: {
        NSPrivacyTracking: false,
        NSPrivacyTrackingDomains: [],
        NSPrivacyCollectedDataTypes: [],
        NSPrivacyAccessedAPITypes: Object.entries(categories).map(([cat, reasons]) => ({ NSPrivacyAccessedAPIType: cat, NSPrivacyAccessedAPITypeReasons: reasons }))
      }
    };
  }
  const script = join(buildDir, 'build-tailscalekit.mjs');
  if (!existsSync(script)) return null;
  const text = readFileSync(script, 'utf8');
  const at = text.search(/<\?xml|<plist\b/);
  const end = at === -1 ? -1 : text.indexOf('</plist>', at);
  if (at === -1 || end === -1 || !text.includes('NSPrivacyAccessedAPITypes')) return null;
  const body = text.slice(at, end + '</plist>'.length);
  if (body.includes('${')) return { label: relOf(script), problem: 'its manifest is assembled from pieces this gate cannot read; keep its categories in the pin or write it as one literal plist' };
  return parsed(`${relOf(script)} (the plist it writes)`, body.replace(/\\n/g, '\n').replace(/\\t/g, '\t'));
}

/** Every `TailscaleKit.framework` directory inside a built xcframework. */
function frameworkSlices(xcframework) {
  const out = [];
  const look = (dir, depth) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!e.isDirectory()) continue;
      const p = join(dir, e.name);
      if (e.name === 'TailscaleKit.framework') out.push(p);
      else if (depth < 3) look(p, depth + 1);
    }
  };
  look(xcframework, 0);
  return out;
}

const KEY_NAMES = ['tailnetKey', 'tk', 'authKey'];
const KEY_ALT = KEY_NAMES.join('|');

/**
 * THE NAMED ONES for rule (p): every mention of the key's name in the app
 * whose shape does not prove it goes nowhere. Same shape as ARITHMETIC_NAMED:
 * `line` is the line with its comments removed, trimmed and its spaces
 * collapsed; `uses` how many mentions on such lines in that file the entry
 * covers; `why` where the key goes from there. Empty at 316.2's head, because
 * every mention there is proved by its shape.
 */
export const KEY_NAMED = [
  {
    file: 'App/TortieApp.swift',
    line: 'try await client.transport.prepareToPair(host: pending.offer.address.host, key: pending.offer.tailnetKey)',
    uses: 1,
    why: "the pairing hands the code's key to its transport's prepareToPair(host:key:), whose `key` KEY_NAMES_IN reads as the key in Door/Transport.swift (the default does nothing with it) and Tailnet/Node.swift (the join, which ends it as TailscaleKit's authKey: and keeps it in no property, file or store)"
  },
  // The raw code (Phase 316.3's fix round): each hand-off from one watched
  // name to another, and the parse that reads it.
  {
    file: 'App/TortieApp.swift',
    line: 'let offer = try PairingOffer.parse(payload)',
    uses: 1,
    why: 'the code goes to its one reader, PairingOffer.parse(_ payload:) in Door/Pairing.swift, where `payload` is watched and read only by the lines named below'
  },
  {
    file: 'App/TortieApp.swift',
    line: 'return launchCode',
    uses: 1,
    why: "takeLaunchCode() hands the DEBUG launch code once to RootView's `if let code = app.takeLaunchCode()` in this file, where `code` is watched"
  },
  {
    file: 'App/TortieApp.swift',
    line: 'await app.pairing.read(code)',
    uses: 1,
    why: 'the launch code goes to PairingModel.read(_ payload:) in Screens/PairingScreen.swift, where `payload` is watched'
  },
  {
    file: 'Screens/PairingScreen.swift',
    line: 'Task { await model.read(code) }',
    uses: 1,
    why: "the camera's code goes to PairingModel.read(_ payload:) in this file, where `payload` is watched"
  },
  {
    file: 'Screens/PairingScreen.swift',
    line: 'onCode?(code)',
    uses: 1,
    why: 'the scanner hands what the camera read to onCode, the closure PairingScreen passes in this file, whose `code` is watched and goes to read(_:)'
  },
  {
    file: 'Door/Pairing.swift',
    line: 'guard !payload.isEmpty, payload.utf8.count <= maxPayloadBytes,',
    uses: 2,
    why: 'the parse measures the code before it decodes it: a Bool and a count, nothing kept'
  },
  {
    file: 'Door/Pairing.swift',
    line: 'let wire = try? JSONDecoder().decode(Wire.self, from: Data(payload.utf8)) else {',
    uses: 1,
    why: "the parse decodes the code into Wire, which holds `tk` for the checks below it, is never Encodable, and describes and mirrors itself without it (rule p's holders); the key leaves Wire only as the offer's tailnetKey"
  }
];

/**
 * The files where the key travels under another name, and that name. Text
 * cannot follow a value from a caller into a callee, so a hand-off into one of
 * these files is NAMED above, and inside them the parameter is held to every
 * clause the key's own names are.
 *
 * THE RAW CODE IS THE KEY TOO (Phase 316.3's fix round). The QR text carries
 * `tk`, so every name the code travels under before it is parsed is watched
 * here as the key is, WHOLE: `payload.utf8` is the code, not a field of it.
 * 316.3's verification wrote the raw code to the Keychain under an account of
 * its own with this rule green, because only the key's own names were read.
 * Where the code enters is CODE_SOURCES, and each one must be bound to a
 * watched name in the statement that reads it, so the set is closed: a code
 * can leave a watched name only by a shape the rule proves or a NAMED line.
 */
export const KEY_NAMES_IN = {
  'Door/Transport.swift': ['key'],
  'Tailnet/Node.swift': ['key'],
  'Door/Pairing.swift': ['payload'],
  'Screens/DoorWords.swift': ['payload'],
  'Screens/PairingScreen.swift': ['payload', 'spent', 'code'],
  'App/TortieApp.swift': ['payload', 'launchCode', 'code']
};

/**
 * Where a raw pairing code enters the app: the camera's reading of a machine
 * readable code (AVFoundation, or Vision's `payloadStringValue` and
 * `payloadData`), Core Image's QR reader (`CIQRCodeFeature.messageString`), a
 * deep link (`onOpenURL`), the pasteboard (`UIPasteboard`, read or written)
 * and the DEBUG launch argument. Each must be bound, in the statement that
 * reads it, to a name KEY_NAMES_IN watches in that file; a deep link binds its
 * closure's own parameter. THE LIST IS OPEN: it names every way this app, or
 * the reverify of 2026-09-23, read a code, and a new way to read one (a file
 * importer, a share extension, a text field) is added here in the same commit.
 */
const CODE_SOURCES = /\bAVMetadataMachineReadableCodeObject\b|\bpayloadStringValue\b|\bpayloadData\b|\bmessageString\b|\bUIPasteboard\b|\bonOpenURL\b|(?<!\bfunc\s+)\binjectedPayload\s*\(/g;

/** The start of the member chain that ends at `at` (`wire.tk` starts at `wire`). */
function chainStart(view, at) {
  let p = at;
  for (;;) {
    let q = p - 1;
    while (q >= 0 && /[ \t]/.test(view[q])) q -= 1;
    if (view[q] !== '.' || view[q - 1] === '.') return p;
    q -= 1;
    while (q >= 0 && /[ \t]/.test(view[q])) q -= 1;
    while (q >= 0 && (view[q] === '?' || view[q] === '!')) q -= 1;
    if (view[q] === ')' || view[q] === ']') {
      const o = matchBack(view, q);
      if (o < 0) return p;
      q = o - 1;
    } else if (!isIdentChar(view[q])) return p;
    while (q >= 0 && isIdentChar(view[q])) q -= 1;
    p = q + 1;
  }
}

/** What one mention of a key name does, or null when its text does not prove it goes nowhere. */
export function keyMentionRole(view, at, name, alt = KEY_ALT) {
  const before = view.slice(0, at);
  const after = view.slice(at + name.length);
  const member = /(?:^|[^.])\.\s*$/.test(before);
  if (!member) {
    if (/\b(?:let|var|case)\s+$/.test(before)) return 'declared';
    if (/^\s*:(?!:)/.test(after)) {
      if (/[(,]\s*$/.test(before)) return 'a label';
      if (/[(,]\s*[A-Za-z_][A-Za-z0-9_]*\s+$/.test(before)) return 'a parameter';
    }
  }
  // A postfix `?` or `!` is attached to the name; a spaced `!` is `!=`.
  if (/^[?!]?\s*=(?!=)/.test(after)) return 'assigned to';
  const head = view.slice(0, chainStart(view, at));
  if (/^[?!]?\s*\.\s*map\s*\(\s*(?:[A-Za-z_][A-Za-z0-9_]*\s*\.\s*)?isTailnetKey\s*\)/.test(after)) return 'checked';
  if (/\bisTailnetKey\s*\(\s*$/.test(head)) return 'checked';
  if (/^[?!]?\s*[!=]=\s*nil\b/.test(after) || /\bnil\s*[!=]=\s*$/.test(head)) return 'tested for nil';
  // Compared with another watched value, which is how the screen tells a
  // spent code from a new one: a Bool, nothing kept (Phase 316.3's fix round).
  if (new RegExp(`^[?!]?\\s*[!=]=\\s*(?:${alt})(?![A-Za-z0-9_$])`).test(after) || new RegExp(`(?<![A-Za-z0-9_$.])(?:${alt})\\s*[!=]=\\s*$`).test(head)) {
    return 'compared with a watched value';
  }
  // A closure's own parameter (`{ code in`): a declaration.
  if (!member && /\{\s*(?:\[[^\]]*\]\s*)?\(?\s*(?:[A-Za-z_][A-Za-z0-9_]*\s*,\s*)*$/.test(before) && /^\s*(?:,\s*[A-Za-z_][A-Za-z0-9_]*\s*)*\)?\s*in\b/.test(after)) {
    return 'declared';
  }
  if (new RegExp(`[(,]\\s*(?:${alt})\\s*:\\s*$`).test(head)) return 'handed to a key-named place';
  if (new RegExp(`(?:^|[^=!<>+\\-*/%&|^.?\\w])(?:(?:let|var)\\s+)?(?:[A-Za-z_][A-Za-z0-9_]*\\s*\\.\\s*)*(?:${alt})\\s*(?::\\s*[A-Za-z_][A-Za-z0-9_?!.<>\\[\\] ]*)?=\\s*$`).test(head)) {
    return 'bound to a key-named place';
  }
  return null;
}

/** Built from parts, so this file does not hold the shape it looks for. */
const REAL_KEY_SHAPE = new RegExp(`tskey-[a-z]+-[A-Za-z0-9]+${'CN'}${'TRL'}-[A-Za-z0-9]{8,}`, 'g');

/** Rule (p), the shape half, over any text file: a string shaped like a real key that does not say it is made up. */
export function ruleNoRealKey(name, text) {
  const findings = [];
  for (const m of text.matchAll(REAL_KEY_SHAPE)) {
    if (/p316/i.test(m[0])) continue;
    findings.push(`${name}:${String(lineOf(text, m.index))} holds a string shaped like a real Tailscale key (not repeated here); no agent holds a real key, and a made-up one in this tree says so by carrying p316`);
  }
  return findings;
}

/**
 * Rule (p), over every app file (`{ name, source }`, names relative to the
 * app folder) and the named table.
 */
export function ruleTailnetKey(files, named = KEY_NAMED, nodeName = 'Tailnet/Node.swift', namesIn = KEY_NAMES_IN) {
  const findings = [];
  const said = { mentions: 0, proved: 0, named: 0, joins: 0, holders: 0, sources: 0 };
  const extensions = [];
  const unexplained = new Map();
  const encodable = new Set();
  const decls = [];
  for (const f of files) {
    const { view, code, strings } = arithmeticView(f.source);
    const { bare } = lexSwift(f.source);
    const codeLines = code.split('\n');
    const alt = [...KEY_NAMES, ...(namesIn[f.name] ?? [])].join('|');
    for (const m of view.matchAll(new RegExp(`(?<![A-Za-z0-9_$])(${alt})(?![A-Za-z0-9_$])`, 'g'))) {
      said.mentions += 1;
      const role = keyMentionRole(view, m.index, m[1], alt);
      if (role !== null) {
        said.proved += 1;
        if (f.name === nodeName && m[1] === 'authKey' && role === 'a label') said.joins += 1;
        continue;
      }
      const line = lineOf(view, m.index);
      const text = (codeLines[line - 1] ?? '').trim().replace(/\s+/g, ' ');
      const key = `${f.name}\u0000${text}`;
      if (!unexplained.has(key)) unexplained.set(key, { file: f.name, text, line, count: 0 });
      unexplained.get(key).count += 1;
    }
    for (const s of strings) {
      if (/^tskey/i.test(s.value) && s.value !== 'tskey-auth-') {
        findings.push(`${f.name}:${String(lineOf(view, s.start))} writes a tailnet key into the app's source; the only key is the one he mints, carried in the pairing code`);
      }
    }
    for (const m of bare.matchAll(/\b(struct|class|enum|actor)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:<[^>{]*>)?\s*(:[^{]*)?\{/g)) {
      const open = m.index + m[0].length - 1;
      decls.push({ file: f.name, kind: m[1], name: m[2], bare, open, close: matchForward(bare, open) });
      if (/\b(?:Codable|Encodable)\b/.test(m[3] ?? '')) encodable.add(m[2]);
    }
    for (const m of bare.matchAll(/\bextension\s+([A-Za-z_][A-Za-z0-9_.]*)\s*(?::\s*([^{]*))?\{/g)) {
      if (/\b(?:Codable|Encodable)\b/.test(m[2] ?? '')) encodable.add(m[1].split('.').pop());
      const open = m.index + m[0].length - 1;
      extensions.push({ name: m[1].split('.').pop(), bare, open, close: matchForward(bare, open) });
    }

    // Where a raw code enters: bound, in the statement that reads it, to a
    // name this file watches.
    const watched = namesIn[f.name] ?? [];
    for (const m of bare.matchAll(CODE_SOURCES)) {
      said.sources += 1;
      const lines = bare.slice(0, m.index).split('\n');
      let k = lines.length - 1;
      while (k > 0 && /^\s*\./.test(lines[k])) k -= 1;
      const statement = lines.slice(k).join('\n');
      // A deep link hands its code to its closure, whose parameter is the name.
      const closure = m[0] === 'onOpenURL' ? /^\s*(?:\(\s*perform\s*:\s*)?\{\s*(?:\[[^\]]*\]\s*)?\(?\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:[,):]|\bin\b)/.exec(bare.slice(m.index + m[0].length)) : null;
      const bound =
        m[0] === 'onOpenURL'
          ? closure
          : /\b(?:let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::[^=\n]*)?=(?!=)/.exec(statement) ?? /^\s*(?:self\s*\.\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)/.exec(statement);
      if (bound === null || !watched.includes(bound[1])) {
        findings.push(
          `${f.name}:${String(lineOf(bare, m.index))} reads a pairing code (${m[0].replace(/\s*\($/, '(')}) without binding it to a name KEY_NAMES_IN watches in this file (${watched.join(', ') || 'none'})` +
            `${bound === null ? '' : `; it is bound to ${bound[1]}`}; the code carries the tailnet key, so it enters only under a watched name`
        );
      }
    }
  }

  // The values that hold it mirror themselves without it. A stored field (or
  // an enum case's value) named by the key, or by the code in that file,
  // makes its type a holder, and a holder declares `customMirror`, in its
  // body or an extension of it. That one member is what every door reads: a
  // value with no description is printed, interpolated, described and
  // reflected through `Mirror(reflecting:)`, which honours it, and `dump`
  // walks it; a type nested in another is read through its own; and a key
  // named inside it, or inside a description a holder does declare, is a
  // mention the proof above reads like any other. Measured, not assumed: in
  // the macOS harness, taking a description out leaked nothing and taking the
  // mirror out failed the tests (Phase 316.3's fix round, after the
  // verification printed a whole offer with this rule green).
  const atDepthZero = (body, index) => [...body.slice(0, index)].reduce((n, c) => n + (c === '{' ? 1 : c === '}' ? -1 : 0), 0) === 0;
  const declares = (member, name, own) => {
    const re = new RegExp(`\\bvar\\s+${member}\\b`, 'g');
    const inBody = (b) => [...b.matchAll(re)].some((m) => atDepthZero(b, m.index));
    if (inBody(own)) return true;
    return extensions.some((x) => x.name === name && x.close !== -1 && inBody(x.bare.slice(x.open + 1, x.close)));
  };
  for (const d of decls) {
    if (d.close === -1) continue;
    const body = d.bare.slice(d.open + 1, d.close);
    const alt = [...KEY_NAMES, ...(namesIn[d.file] ?? [])].join('|');
    const field = [...body.matchAll(new RegExp(`\\b(?:let|var)\\s+(${alt})\\b|\\bcase\\s+[A-Za-z_][A-Za-z0-9_]*\\s*\\([^)]*?(?<![A-Za-z0-9_$])(${alt})\\s*:`, 'g'))].find((m) => atDepthZero(body, m.index));
    if (field === undefined) continue;
    said.holders += 1;
    if (!declares('customMirror', d.name, body)) {
      findings.push(
        `${d.file}:${String(lineOf(d.bare, d.open))} ${d.kind} ${d.name} holds ${field[1] ?? field[2]} and declares no customMirror, so print, dump or interpolation of a ${d.name} would repeat the tailnet key; declare a customMirror without it`
      );
    }
  }
  for (const d of decls) {
    if (!encodable.has(d.name) || d.close === -1) continue;
    const body = d.bare.slice(d.open + 1, d.close);
    const alt = [...KEY_NAMES, ...(namesIn[d.file] ?? [])].join('|');
    for (const m of body.matchAll(new RegExp(`\\b(?:let|var)\\s+(${alt})\\b`, 'g'))) {
      const depth = [...body.slice(0, m.index)].reduce((n, c) => n + (c === '{' ? 1 : c === '}' ? -1 : 0), 0);
      if (depth !== 0) continue;
      findings.push(`${d.file}:${String(lineOf(d.bare, d.open + 1 + m.index))} gives the encodable ${d.name} a field ${m[1]}, so the tailnet key could be written wherever ${d.name} is; it is kept nowhere`);
    }
  }
  const used = new Set();
  for (const u of unexplained.values()) {
    const entry = named.find((n) => n.file === u.file && n.line === u.text);
    if (entry === undefined) {
      findings.push(`${u.file}:${String(u.line)} uses the tailnet key, or the code that carries it, in a way this rule cannot prove goes nowhere (${JSON.stringify(u.text.slice(0, 90))}); keep it to a check, a nil test, a comparison with a watched value or a hand-off into a watched place, or name the line in KEY_NAMED with where it goes`);
      continue;
    }
    used.add(entry);
    if (entry.uses !== u.count) {
      findings.push(`${u.file}:${String(u.line)} mentions the key ${String(u.count)} time(s) on lines reading ${JSON.stringify(u.text)}, and KEY_NAMED names ${String(entry.uses)}; a new use on a named line is not named`);
      continue;
    }
    said.named += u.count;
  }
  for (const entry of named) {
    if (!used.has(entry)) findings.push(`KEY_NAMED names ${entry.file} ${JSON.stringify(entry.line)}, which no longer mentions the key in a way this rule needs named; take the entry out`);
  }
  if (files.some((f) => f.name === nodeName) && said.joins === 0) {
    findings.push(`${nodeName} never hands the key to TailscaleKit as authKey:, so the node joins with nothing, or the key reaches it some way this rule does not read`);
  }
  return { findings, said };
}

// ---------------------------------------------------------------------------
// Rule (q): Tailscale's own diagnostic logs, off before every start
// ---------------------------------------------------------------------------
//
// HIS RULING, 2026-09-23: "Turn them off." tsnet uploads the node's own logs
// to log.tailscale.com unless TS_NO_LOGS_NO_SUPPORT reads true when a node
// starts, and an app cannot set that variable for itself (Go copied the
// environment when the library loaded). So the pinned build adds one export,
// `tailscale_no_logs_no_support()` (build/build-tailscalekit.mjs,
// NO_LOGS_PATCH), and the node calls it through one wrapper whose answer it
// checks, before every start, in every build. This rule holds each clause of
// that as text; `test:ios` holds that the built framework answers it, and the
// hardening round's Simulator run that a started node sent nothing to a log
// host.

/** The C switch the pinned build adds. */
export const NO_LOGS_SWITCH = 'tailscale_no_logs_no_support';

/** For each line (1-based), whether it sits inside ANY `#if` region, whatever its condition. */
export function conditionalLines(code) {
  const lines = code.split('\n');
  const inside = [false];
  let depth = 0;
  for (const line of lines) {
    const t = line.trim();
    if (/^#if\b/.test(t)) depth += 1;
    else if (/^#endif\b/.test(t)) depth = Math.max(0, depth - 1);
    inside.push(depth > 0 || /^#if\b/.test(t));
  }
  return inside;
}

/**
 * Rule (q), over the node's source (or null), every other app file
 * (`{ name, source }`) and the vendoring script (`{ text, patch }`, its text
 * and its exported NO_LOGS_PATCH, or null).
 */
export function ruleLogsOff(nodeName, nodeSource, appFiles, script) {
  const findings = [];
  const said = { wrappers: [], starts: 0, gated: 0, flowLogsWords: null };
  for (const f of appFiles) {
    const { bare } = lexSwift(f.source);
    for (const m of bare.matchAll(/\btailscale_(?:new|start|up|loopback|listen|dial)\s*\(/g)) {
      findings.push(`${f.name}:${String(lineOf(bare, m.index))} calls ${m[0].replace(/\s*\($/, '(')} itself; a node is started only through TailscaleNode, after the logs switch`);
    }
  }
  if (nodeSource === null) return { findings: [...findings, `${nodeName} does not exist, so no node turns Tailscale's logs off`], said };
  const { code, bare } = lexSwift(nodeSource);
  const conditional = conditionalLines(code);
  const where = (i) => `${nodeName}:${String(lineOf(bare, i))}`;

  // (q1) The switch is called only inside wrappers that CHECK its answer.
  const wrappers = [];
  for (const m of bare.matchAll(new RegExp(`\\b${NO_LOGS_SWITCH}\\s*\\(`, 'g'))) {
    const open = memberBody(bare, m.index);
    let h = open - 1;
    while (h >= 0 && !';{}'.includes(bare[h])) h -= 1;
    const head = open === -1 ? '' : bare.slice(h + 1, open);
    const fn = /\bfunc\s+([A-Za-z_]\w*)\s*\(\s*\)\s*->\s*Bool\s*$/.exec(head.trim())?.[1];
    const checked = new RegExp(`^${NO_LOGS_SWITCH}\\s*\\(\\s*\\)\\s*==\\s*0\\b`).test(bare.slice(m.index));
    if (fn === undefined || !checked) {
      findings.push(`${where(m.index)} calls ${NO_LOGS_SWITCH}() outside a function that returns whether it answered 0, so its answer could go unread`);
      continue;
    }
    if (conditional[lineOf(bare, m.index)] === true) {
      findings.push(`${where(m.index)} turns the logs off inside an #if, so some build would start a node with its logs on; every build, device and Simulator, Debug and Release`);
      continue;
    }
    // The type the wrapper is declared in, read from the `{` that holds it.
    const typeOpen = innermostOpener(bare, open);
    let t = typeOpen - 1;
    while (t >= 0 && !';{}'.includes(bare[t])) t -= 1;
    const owner = typeOpen === -1 ? null : (/\b(?:enum|struct|class|actor|extension)\s+([A-Za-z_]\w*)/.exec(bare.slice(t + 1, typeOpen))?.[1] ?? null);
    wrappers.push({ fn, owner });
  }
  said.wrappers = wrappers.map((w) => (w.owner === null ? w.fn : `${w.owner}.${w.fn}`));
  if (wrappers.length === 0) findings.push(`${nodeName} never asks ${NO_LOGS_SWITCH}() and checks that it answered 0, so every node it starts uploads its logs to log.tailscale.com`);

  // (q2) Every start is gated by a wrapper, before it, in its own body.
  for (const m of bare.matchAll(/\bTailscaleNode\s*\(/g)) {
    said.starts += 1;
    const open = memberBody(bare, m.index);
    const before = open === -1 ? '' : bare.slice(open, m.index);
    // A guard in the same block as the start, or one enclosing it: from the
    // guard to the start the nesting never falls below the guard's own, so a
    // guard in a sibling branch does not count.
    const dominates = (at) => {
      let depth = 0;
      for (let k = at; k < before.length; k += 1) {
        if (before[k] === '{') depth += 1;
        else if (before[k] === '}') {
          depth -= 1;
          if (depth < 0) return false;
        }
      }
      return true;
    };
    const gate = wrappers.some((w) =>
      [...before.matchAll(new RegExp(`\\bguard\\s+(?:${w.owner === null ? 'Self' : w.owner}\\s*\\.\\s*)?${w.fn}\\s*\\(\\s*\\)\\s*else\\s*\\{`, 'g'))].some((g) => {
        const elseClose = matchForward(before, g.index + g[0].length - 1);
        return elseClose !== -1 && dominates(elseClose + 1);
      })
    );
    if (!gate) {
      findings.push(`${where(m.index)} starts a node (TailscaleNode) with no guard on the logs switch before it in the same body, so this node's logs could go to log.tailscale.com`);
      continue;
    }
    if (conditional[lineOf(bare, m.index)] === true) {
      findings.push(`${where(m.index)} starts a node inside an #if; the gate holds in every build only if the start is in every build`);
      continue;
    }
    said.gated += 1;
  }
  if (said.starts === 0) findings.push(`${nodeName} starts no node, so this rule would assert nothing`);

  // (q3) The switch is in the pinned build: the vendoring script patches it
  // in, and its patch, read as DATA from the script itself, still exports a
  // function that sets tailscaled's own switch and answers what tsnet reads.
  if (script === null) findings.push('build/build-tailscalekit.mjs does not exist, so nothing puts the logs switch into TailscaleKit');
  else {
    const patch = Array.isArray(script.patch) ? script.patch : [];
    const go = patch.filter((e) => e?.file === 'tailscale.go').map((e) => String(e.text)).join('');
    const c = patch.filter((e) => e?.file === 'tailscale.c').map((e) => String(e.text)).join('');
    for (const [clause, ok] of [
      ['imports envknob', /\t"tailscale\.com\/envknob"\n/.test(go)],
      [
        "exports TsnetNoLogsNoSupport, which sets tailscaled's own switch and answers 0 only when tsnet reads it true",
        /\/\/export TsnetNoLogsNoSupport\nfunc TsnetNoLogsNoSupport\(\) C\.int \{\n\tenvknob\.SetNoLogsNoSupport\(\)\n\tif !envknob\.NoLogsNoSupport\(\) \{\n\t\treturn -1\n\t\}\n\treturn 0\n\}/.test(go)
      ],
      ['wraps it in C', new RegExp(`int ${NO_LOGS_SWITCH}\\(void\\) \\{\\n\\treturn TsnetNoLogsNoSupport\\(\\);\\n\\}`).test(c)],
      ['declares it in the header Swift reads', patch.some((e) => e?.file === 'swift/TailscaleKit/TailscaleKit.h' && String(e.text).includes(`extern int ${NO_LOGS_SWITCH}(void);`))],
      ['applies the patch after it unpacks', /\bapplyNoLogsPatch\s*\(\s*srcDir\b/.test(script.text)]
    ]) {
      if (!ok) findings.push(`build/build-tailscalekit.mjs no longer ${clause}, so TailscaleKit has no working logs switch`);
    }
  }

  // (q4) Phase 316.4, the switch's second cost (SPEC "Owed to S4" item 2). A
  // tailnet that requires network flow logs takes the key and then turns a
  // node whose logs are off OFF, and tsnet's Up fails with the backend's own
  // words (tailscale.com v1.94.1 ipn/ipnlocal/local.go 1771-1785). Without a
  // clause of its own that failure is drawn as a refused key, and a new key
  // fails the same way. The node writes the words once, as a plain literal
  // (`flowLogsRefusal`, returned in `said.flowLogsWords` so the caller can
  // hold every built slice to it), turns exactly TailscaleKit's error that
  // carries them into TailnetFlowLogsRequired, and the join maps that to its
  // own refusal rather than to keyRefused.
  const { strings } = lexSwift(nodeSource);
  const words = /\bstatic\s+let\s+flowLogsRefusal\s*=\s*"/.exec(bare);
  const literal = words === null ? undefined : strings.find((s) => s.start >= words.index + words[0].length - 1 && s.start <= words.index + words[0].length);
  said.flowLogsWords = literal !== undefined && !literal.interpolated && literal.value.trim().length >= 12 ? literal.value : null;
  if (said.flowLogsWords === null) {
    findings.push(`${nodeName} does not name the backend's flow logs refusal as one plain literal of at least 12 characters (static let flowLogsRefusal = "…"), so a tailnet that requires flow logs reads as a refused key`);
  }
  if (!/\bcatch\s+TailscaleError\s*\.\s*internalError\s*\(\s*let\s+(\w+)\s*\)\s*where\s+TailnetFlowLogsRequired\s*\.\s*said\s*\(\s*\1\s*\)\s*\{\s*throw\s+TailnetFlowLogsRequired\s*\(\s*\)\s*\}/.test(bare)) {
    findings.push(`${nodeName} no longer turns TailscaleKit's internalError carrying the flow logs refusal into TailnetFlowLogsRequired in the live node's up(), so that refusal reads as a refused key`);
  }
  if (!/\bstatic\s+func\s+said\s*\(\s*_\s+\w+\s*:\s*String\?\s*\)\s*->\s*Bool\s*\{\s*\w+\s*\?\s*\.\s*contains\s*\(\s*TailnetRules\s*\.\s*flowLogsRefusal\s*\)\s*\?\?\s*false\s*\}/.test(bare)) {
    findings.push(`${nodeName}'s TailnetFlowLogsRequired.said no longer asks only whether the backend's words contain TailnetRules.flowLogsRefusal`);
  }
  if (!/\bif\s+error\s+is\s+TailnetFlowLogsRequired\s*\{\s*throw\s+TailnetRefusal\s*\.\s*flowLogsRequired\s*\}\s*throw\s+TailnetRefusal\s*\.\s*keyRefused\b/.test(bare)) {
    findings.push(`${nodeName}'s join no longer tells TailnetFlowLogsRequired apart, just before a refused key, so a tailnet that requires flow logs reads as a refused key`);
  }
  return { findings, said };
}

// ---------------------------------------------------------------------------
// Rules (r) and (s): the first TestFlight build (Phase 316.4, SPEC §4 S4)
// ---------------------------------------------------------------------------
//
// (r) THE APP ICON. App Store Connect refuses an app icon that has an alpha
// channel, and the brand master has one (SPEC §3.9). So the icon is the master
// laid over ONE opaque ground, a token Tortie already uses, and it is written
// as RGB. build/p316/app-icon.mjs makes it. This rule does not trust that
// file's encoder. It reads the PNG's own chunks for the channel, then decodes
// the icon and the master and checks every pixel against the arithmetic with
// its own code. The ground comes from tokens.css through the ROOT's own
// app-icon.mjs, so an ablation clone is judged by its own choice. The catalog
// holds the icon and nothing else. A colour set would be a colour written
// outside Tokens.swift (rule a), and an image set would be a picture no rule
// reads. The project names the icon in every configuration of the app and
// generates no asset symbols, so every Swift file compiled into the app is one
// this gate reads.
//
// (s) SIGNING AND IDENTITY. The archive he uploads is signed by HIS team, and
// nothing an agent builds is. So his team is written exactly once in the
// project, in the app's Release configuration, with automatic signing (Xcode
// picks the profile, and the Organizer picks the distribution identity when he
// exports). Every Debug configuration is ad hoc with no team, which is what
// the Simulator arm runs (SPEC §3.8). No profile is named, and no xcconfig
// sets a signing or identity setting where this rule does not read it. The
// app's bundle id is the one he registered, which cannot change after the
// first upload (SPEC §6 decision 6). Its two versions agree between Debug and
// Release. Info.plist takes all three from the project, and it shows the name
// "Tortie" (CLAUDE.md: user-visible copy always says Tortie). Every agent
// build overrides the team away on its own command line
// (build/simulator-run.mjs AD_HOC_SETTINGS, or CODE_SIGNING_ALLOWED=NO), so
// this rule is about what the project hands HIM.

/** His team: Gregory Ceccarelli, the team whose Developer ID signs Tortie for the Mac (electron-builder.yml's header). */
export const RELEASE_TEAM = '4GRQMF5T5U';

/** The bundle id he registered (SPEC §6 decision 6). It cannot change after the first upload. */
export const PHONE_BUNDLE_ID = 'com.itavero.tortie.phone';

/** The asset catalog, relative to the app folder, and the one set it holds. */
const ICON_CATALOG = 'Assets.xcassets';
const ICON_SET = 'AppIcon.appiconset';
const ICON_NAME = 'AppIcon';

/**
 * A PNG's own facts, read from its chunk list and never from a decoder:
 * `{ width, height, bitDepth, colorType, interlace, chunks }`, or
 * `{ problem }` when the bytes are not a whole PNG.
 */
export function pngFacts(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) return { problem: 'is not a PNG' };
  const chunks = [];
  let ihdr = null;
  let off = 8;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    if (off + 12 + len > buf.length) return { problem: `ends inside its ${type} chunk` };
    chunks.push(type);
    if (type === 'IHDR' && len >= 13) ihdr = buf.subarray(off + 8, off + 8 + len);
    off += 12 + len;
    if (type === 'IEND') break;
  }
  if (ihdr === null || chunks[0] !== 'IHDR') return { problem: 'has no IHDR chunk first' };
  if (chunks[chunks.length - 1] !== 'IEND') return { problem: 'has no IEND chunk' };
  return { width: ihdr.readUInt32BE(0), height: ihdr.readUInt32BE(4), bitDepth: ihdr[8], colorType: ihdr[9], interlace: ihdr[12], chunks };
}

const ALPHA_TYPES = { 3: 'a palette, which can carry a transparent colour', 4: 'grey with an alpha channel', 6: 'RGB with an alpha channel' };

/**
 * Rule (r), the picture: `iconBuf` is an 8-bit RGB PNG with no alpha channel
 * and no transparent colour, `side` × `side`, and every pixel is the master
 * (`masterBuf`, straight RGBA) laid over `ground` (`[r, g, b]`):
 * round((m·a + g·(255 − a)) / 255) per channel.
 */
export function ruleIconImage(name, iconBuf, masterName, masterBuf, ground, side = 1024) {
  const findings = [];
  const facts = pngFacts(iconBuf);
  if (facts.problem !== undefined) return [`${name} ${facts.problem}`];
  if (facts.width !== side || facts.height !== side) findings.push(`${name} is ${String(facts.width)} × ${String(facts.height)}; the icon App Store Connect takes is ${String(side)} × ${String(side)}`);
  if (facts.colorType !== 2) {
    findings.push(`${name} is PNG colour type ${String(facts.colorType)}${ALPHA_TYPES[facts.colorType] === undefined ? '' : `, ${ALPHA_TYPES[facts.colorType]}`}; the icon is RGB with no alpha channel (colour type 2), because App Store Connect refuses an icon that has one (SPEC §3.9)`);
  }
  if (facts.chunks.includes('tRNS')) findings.push(`${name} carries a tRNS chunk, which makes a colour of it transparent; the icon is opaque`);
  if (facts.bitDepth !== 8) findings.push(`${name} is ${String(facts.bitDepth)} bits a channel; the icon is 8`);
  if (facts.interlace !== 0) findings.push(`${name} is interlaced; the icon is written plainly`);
  if (findings.length > 0) return findings;
  let master;
  let icon;
  try {
    master = decodePng(masterBuf);
    icon = decodePng(iconBuf);
  } catch (err) {
    return [`${name} or ${masterName} cannot be decoded: ${String(err?.message ?? err)}`];
  }
  if (master.width !== side || master.height !== side) return [`${masterName} is ${String(master.width)} × ${String(master.height)}, so the icon cannot be the master at ${String(side)} × ${String(side)}`];
  let wrong = 0;
  let first = null;
  for (let p = 0; p < side * side; p += 1) {
    const a = master.data[p * 4 + 3];
    for (let c = 0; c < 3; c += 1) {
      if (icon.data[p * 4 + c] !== Math.round((master.data[p * 4 + c] * a + ground[c] * (255 - a)) / 255)) {
        wrong += 1;
        if (first === null) first = `(${String(p % side)}, ${String(Math.floor(p / side))})`;
        break;
      }
    }
  }
  if (wrong > 0) {
    const hex = `#${ground.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    findings.push(`${name} differs from ${masterName} laid over ${hex} at ${String(wrong)} pixel(s), the first at ${String(first)}; the icon is the master on its ground and nothing else (node build/p316/app-icon.mjs --write makes it)`);
  }
  return findings;
}

/**
 * Rule (r), the catalog and the project. `catalog` is what the tree holds:
 * `{ entries, rootContents, setEntries, setContents }`, each Contents.json
 * parsed (or `undefined` when it is missing, `null` when it is not JSON).
 */
export function ruleIconCatalog(catalog, iconFile, pbxproj, xcconfigs = []) {
  const findings = [];
  const said = { configurations: 0 };
  if (catalog === null) {
    findings.push(`ios/Tortie/${ICON_CATALOG} does not exist, so the app ships with no icon and App Store Connect refuses the upload`);
  } else {
    const extra = catalog.entries.filter((e) => e !== 'Contents.json' && e !== ICON_SET);
    if (extra.length > 0) findings.push(`ios/Tortie/${ICON_CATALOG} holds ${JSON.stringify(extra)}; it holds the app icon and nothing else (a colour lives only in Tokens.swift, rule a)`);
    if (!catalog.entries.includes('Contents.json') || catalog.rootContents === undefined) findings.push(`ios/Tortie/${ICON_CATALOG} has no Contents.json`);
    else if (catalog.rootContents === null) findings.push(`ios/Tortie/${ICON_CATALOG}/Contents.json is not JSON`);
    if (!catalog.entries.includes(ICON_SET)) findings.push(`ios/Tortie/${ICON_CATALOG} holds no ${ICON_SET}`);
    else {
      const setExtra = catalog.setEntries.filter((e) => e !== 'Contents.json' && e !== iconFile);
      if (setExtra.length > 0) findings.push(`${ICON_SET} holds ${JSON.stringify(setExtra)}; it holds its Contents.json and ${iconFile}, and nothing else`);
      if (!catalog.setEntries.includes(iconFile)) findings.push(`${ICON_SET} holds no ${iconFile}`);
      const images = catalog.setContents?.images;
      const want = { filename: iconFile, idiom: 'universal', platform: 'ios', size: '1024x1024' };
      const one = Array.isArray(images) && images.length === 1 ? images[0] : null;
      const same = one !== null && typeof one === 'object' && Object.keys(one).length === Object.keys(want).length && Object.entries(want).every(([k, v]) => one[k] === v);
      if (catalog.setContents === undefined) findings.push(`${ICON_SET} has no Contents.json`);
      else if (catalog.setContents === null) findings.push(`${ICON_SET}/Contents.json is not JSON`);
      else if (!same) {
        findings.push(`${ICON_SET}/Contents.json names ${JSON.stringify(images ?? null)}; it names exactly one image, ${JSON.stringify(want)}, the single size App Store Connect takes, with no other appearance`);
      }
    }
  }
  if (typeof pbxproj === 'string') {
    const apps = appConfigurations(pbxproj);
    said.configurations = apps.length;
    for (const c of apps) {
      const icon = settingAssignments(c.settings, 'ASSETCATALOG_COMPILER_APPICON_NAME');
      if (!icon.some((a) => a.conditions === '' && a.value === ICON_NAME) || icon.some((a) => a.value !== ICON_NAME)) {
        findings.push(`the app's ${c.name} configuration does not set ASSETCATALOG_COMPILER_APPICON_NAME = ${ICON_NAME} and nothing else, so that build has no icon`);
      }
      const symbols = settingAssignments(c.settings, 'ASSETCATALOG_COMPILER_GENERATE_ASSET_SYMBOLS');
      if (!symbols.some((a) => a.conditions === '' && a.value === 'NO') || symbols.some((a) => a.value !== 'NO')) {
        findings.push(`the app's ${c.name} configuration does not set ASSETCATALOG_COMPILER_GENERATE_ASSET_SYMBOLS = NO, so Xcode compiles a Swift file into the app that no rule here reads`);
      }
    }
    for (const m of pbxproj.matchAll(/membershipExceptions\s*=\s*\(([^)]*)\)/g)) {
      if (/Assets\.xcassets/.test(m[1])) findings.push('project.pbxproj takes Assets.xcassets out of the app target with a membership exception, so the app would ship with no icon');
    }
  }
  const sources = [...(typeof pbxproj === 'string' ? [{ name: 'project.pbxproj', text: pbxproj }] : []), ...xcconfigs.map((x) => ({ name: x.name, text: xcconfigBare(x.text) }))];
  for (const s of sources) {
    for (const a of settingAssignments(s.text, 'ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES')) {
      if (a.value !== '') findings.push(`${s.name} names alternate app icons (${a.value}); the app has one icon, the one this rule reads`);
    }
    for (const a of settingAssignments(s.text, 'ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS')) {
      if (/^YES$/i.test(a.value)) findings.push(`${s.name} sets ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS = YES; the app has one icon, the one this rule reads`);
    }
    if (s.name !== 'project.pbxproj') {
      for (const setting of ['ASSETCATALOG_COMPILER_APPICON_NAME', 'ASSETCATALOG_COMPILER_GENERATE_ASSET_SYMBOLS']) {
        for (const a of settingAssignments(s.text, setting)) findings.push(`${s.name} sets ${setting}${a.conditions}; the icon settings are the project's, where this rule reads them`);
      }
    }
  }
  return { findings, said };
}

/**
 * Every build configuration in the project, whoever owns it:
 * `{ id, name, owner, settings }`, `owner` being the target's name or
 * `the project`.
 */
export function allConfigurations(pbx) {
  const out = [];
  for (const l of pbx.matchAll(/(?:^|\n)\s*(\w+)\s*\/\*\s*Build configuration list for (PBXNativeTarget|PBXProject) "([^"]*)"\s*\*\/\s*=\s*\{/g)) {
    const list = pbxObject(pbx, l[1]);
    if (list === null) continue;
    const ids = [.../buildConfigurations\s*=\s*\(([^)]*)\)/.exec(list)?.[1].matchAll(/\b(\w{6,})\b\s*\/\*/g) ?? []].map((m) => m[1]);
    for (const id of ids) {
      const body = pbxObject(pbx, id);
      if (body === null) continue;
      out.push({ id, name: /\bname\s*=\s*"?([^";]+)"?\s*;\s*\}$/.exec(body)?.[1] ?? id, owner: l[2] === 'PBXProject' ? 'the project' : l[3], settings: body });
    }
  }
  return out;
}

/** The one unconditional value a configuration gives a setting, or null when it gives none, several, or a conditional one. */
function onlyValue(settings, name) {
  const all = settingAssignments(settings, name);
  return all.length === 1 && all[0].conditions === '' ? all[0].value : null;
}

/**
 * Rule (s), over the project, every xcconfig under ios/ and Info.plist as
 * CoreFoundation reads it.
 */
export function ruleSigning(pbxproj, xcconfigs = [], plist = null) {
  const findings = [];
  const said = { configurations: 0, debug: 0 };
  if (typeof pbxproj !== 'string') return { findings: ['project.pbxproj cannot be read, so who signs the app cannot be said'], said };
  const configs = allConfigurations(pbxproj);
  said.configurations = configs.length;
  const apps = appConfigurations(pbxproj);
  const appRelease = apps.filter((c) => c.name === 'Release');
  if (apps.length === 0) findings.push('project.pbxproj has no application target this rule can read');
  if (appRelease.length !== 1) findings.push(`the app has ${String(appRelease.length)} Release configuration(s); it has one, the one he archives`);

  // His team, once, in the app's Release configuration.
  const teams = settingAssignments(pbxproj, 'DEVELOPMENT_TEAM');
  const named = teams.filter((a) => a.value !== '');
  for (const a of named) {
    if (a.value !== RELEASE_TEAM) findings.push(`project.pbxproj names the team ${JSON.stringify(a.value)} (at ${String(lineOf(pbxproj, a.at))}); the one team the project names is his, ${RELEASE_TEAM}`);
  }
  if (named.length !== 1) findings.push(`project.pbxproj names a team ${String(named.length)} time(s); his team is written once, in the app's Release configuration, and every other configuration names none`);
  for (const c of appRelease) {
    if (onlyValue(c.settings, 'DEVELOPMENT_TEAM') !== RELEASE_TEAM) findings.push(`the app's Release configuration does not set DEVELOPMENT_TEAM = ${RELEASE_TEAM} once and plainly, so the archive he uploads is not signed by his team`);
    if (onlyValue(c.settings, 'CODE_SIGN_STYLE') !== 'Automatic') findings.push("the app's Release configuration does not sign automatically, so Xcode would not make the profile his archive needs");
    if (onlyValue(c.settings, 'CODE_SIGN_IDENTITY') !== 'Apple Development') {
      findings.push(`the app's Release configuration sets CODE_SIGN_IDENTITY to ${JSON.stringify(settingAssignments(c.settings, 'CODE_SIGN_IDENTITY').map((a) => `${a.conditions}${a.value}`))}; under automatic signing it is "Apple Development", once, and the Organizer picks the distribution identity when he exports`);
    }
  }

  // Every Debug configuration: ad hoc, no team (SPEC §3.8).
  for (const c of configs.filter((x) => x.name === 'Debug')) {
    said.debug += 1;
    const who = c.owner === 'the project' ? "the project's" : `${c.owner}'s`;
    if (onlyValue(c.settings, 'DEVELOPMENT_TEAM') !== '') findings.push(`${who} Debug configuration does not set DEVELOPMENT_TEAM = "" once and plainly; Debug names no team`);
    if (onlyValue(c.settings, 'CODE_SIGN_STYLE') !== 'Manual') findings.push(`${who} Debug configuration does not set CODE_SIGN_STYLE = Manual; Debug signs ad hoc`);
    if (onlyValue(c.settings, 'CODE_SIGN_IDENTITY') !== '-') findings.push(`${who} Debug configuration does not set CODE_SIGN_IDENTITY = "-"; Debug signs ad hoc`);
  }
  if (said.debug === 0) findings.push('project.pbxproj has no Debug configuration, so the ad hoc build the Simulator runs cannot be read');

  // No profile named: automatic signing picks it, and it is a thing of his account.
  for (const setting of ['PROVISIONING_PROFILE', 'PROVISIONING_PROFILE_SPECIFIER']) {
    for (const a of settingAssignments(pbxproj, setting)) {
      if (a.value !== '') findings.push(`project.pbxproj names ${setting}${a.conditions} = ${JSON.stringify(a.value)} (at ${String(lineOf(pbxproj, a.at))}); automatic signing picks the profile, and the repository names nothing of his account but the team`);
    }
  }
  // Nothing an xcconfig sets where this rule does not read it.
  for (const x of xcconfigs) {
    const text = xcconfigBare(x.text);
    for (const setting of ['DEVELOPMENT_TEAM', 'CODE_SIGN_STYLE', 'CODE_SIGN_IDENTITY', 'PROVISIONING_PROFILE', 'PROVISIONING_PROFILE_SPECIFIER', 'PRODUCT_BUNDLE_IDENTIFIER', 'MARKETING_VERSION', 'CURRENT_PROJECT_VERSION']) {
      for (const a of settingAssignments(text, setting)) findings.push(`${x.name} sets ${setting}${a.conditions}; the signing and identity settings are the project's, where this rule reads them`);
    }
  }

  // The app's identity.
  const versions = { MARKETING_VERSION: new Set(), CURRENT_PROJECT_VERSION: new Set() };
  for (const c of apps) {
    if (onlyValue(c.settings, 'PRODUCT_BUNDLE_IDENTIFIER') !== PHONE_BUNDLE_ID) {
      findings.push(`the app's ${c.name} configuration does not set PRODUCT_BUNDLE_IDENTIFIER = ${PHONE_BUNDLE_ID} once and plainly; that is the id he registered, and it cannot change after the first upload`);
    }
    for (const setting of Object.keys(versions)) {
      const v = onlyValue(c.settings, setting);
      if (v === null) findings.push(`the app's ${c.name} configuration does not set ${setting} once and plainly`);
      else versions[setting].add(v);
    }
  }
  for (const [setting, values] of Object.entries(versions)) {
    if (values.size > 1) findings.push(`the app's configurations disagree on ${setting} (${JSON.stringify([...values])}); Debug and Release are one version`);
  }
  for (const v of versions.MARKETING_VERSION) if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(v)) findings.push(`MARKETING_VERSION is ${JSON.stringify(v)}; it is three whole numbers, like 1.0.0`);
  for (const v of versions.CURRENT_PROJECT_VERSION) if (!/^[1-9]\d*$/.test(v)) findings.push(`CURRENT_PROJECT_VERSION is ${JSON.stringify(v)}; it is a whole number from 1, one more for every upload`);
  if (plist !== null) {
    const want = {
      CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
      CFBundleShortVersionString: '$(MARKETING_VERSION)',
      CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
      CFBundleDisplayName: 'Tortie'
    };
    for (const [key, value] of Object.entries(want)) {
      if (plist[key] !== value) findings.push(`Info.plist sets ${key} to ${JSON.stringify(plist[key] ?? null)}; it is ${JSON.stringify(value)}`);
    }
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
  const pl = readPlistText('<plist version="1.0"><dict><key>A</key><dict><key>B</key><true/></dict><key>C</key><array><string>x</string></array></dict></plist>');
  expect('CoreFoundation reads nested dicts and arrays', pl.A.B === true && pl.C[0] === 'x');
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
  const okPlist = {
    NSAppTransportSecurity: { NSExceptionDomains: { '100.64.0.0/10': { NSExceptionAllowsInsecureHTTPLoads: true } } },
    NSLocalNetworkUsageDescription: 'Tortie reaches your Mac directly when both are on this network.'
  };
  // A project with one application target, built from Tortie/Info.plist in
  // both configurations with nothing generated (the hardening round reads the
  // configurations, not one line).
  const appConfig = (id, name, extra = '') =>
    `    ${id} /* ${name} */ = {\n      isa = XCBuildConfiguration;\n      buildSettings = {\n        GENERATE_INFOPLIST_FILE = NO;\n        INFOPLIST_FILE = Tortie/Info.plist;\n${extra}      };\n      name = ${name};\n    };`;
  const pbxApp = (debugExtra = '', releaseExtra = '') =>
    [
      '    AAAA00000001 /* Tortie */ = {',
      '      isa = PBXNativeTarget;',
      '      buildConfigurationList = AAAA00000002 /* Build configuration list for PBXNativeTarget "Tortie" */;',
      '      name = Tortie;',
      '      productType = "com.apple.product-type.application";',
      '    };',
      '    AAAA00000002 /* Build configuration list for PBXNativeTarget "Tortie" */ = {',
      '      isa = XCConfigurationList;',
      '      buildConfigurations = (',
      '        AAAA00000003 /* Debug */,',
      '        AAAA00000004 /* Release */,',
      '      );',
      '    };',
      appConfig('AAAA00000003', 'Debug', debugExtra),
      appConfig('AAAA00000004', 'Release', releaseExtra),
      ''
    ].join('\n');
  expect('(e) accepts the one exception', rulePlist(okPlist, pbxApp()).length === 0);
  expect('(e) catches arbitrary loads', rulePlist({ ...okPlist, NSAppTransportSecurity: { ...okPlist.NSAppTransportSecurity, NSAllowsArbitraryLoads: true } }, pbxApp()).length > 0);
  expect('(e) catches a background mode', rulePlist({ ...okPlist, UIBackgroundModes: ['fetch'] }, pbxApp()).length > 0);
  expect('(e) catches a background mode injected by the project', rulePlist(okPlist, pbxApp('        INFOPLIST_KEY_UIBackgroundModes = fetch;\n')).length > 0);
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

  // (c), widened at 316.3.
  expect('(c) catches a request sent from the node', ruleSendsOnlyFromClient('Tailnet/Node.swift', 'let (d, _) = try await s.data(for: r)\n').length > 0);
  expect('(c) catches a task made outside the client', ruleSendsOnlyFromClient('F', 'let t = s.dataTask(with: r)\n').length > 0);
  expect('(c) catches an NWConnection made outside the client', ruleSendsOnlyFromClient('F', 'let c = NWConnection(host: h, port: p, using: .tls)\n').length > 0);
  expect("(c) leaves a string's data(using:) alone", ruleSendsOnlyFromClient('F', 'let d = "x".data(using: .utf8)\n').length === 0);
  expect('(c) holds the node to allowFailover = false', ruleHttpsOnly('N', 'var p = ProxyConfiguration(socksv5Proxy: e)\n', 'node').length > 0);
  // (e), widened at 316.3.
  const pbxOk = pbxApp();
  expect('(e) catches a missing local network string', rulePlist({ NSAppTransportSecurity: okPlist.NSAppTransportSecurity }, pbxOk).length > 0);
  expect(
    '(e) does not take the local network string from a build setting, which GENERATE_INFOPLIST_FILE = NO never merges',
    rulePlist({ NSAppTransportSecurity: okPlist.NSAppTransportSecurity }, pbxApp('        INFOPLIST_KEY_NSLocalNetworkUsageDescription = "Tortie reaches your Mac directly.";\n')).length > 0
  );
  expect('(e) catches a local network string of two sentences', rulePlist({ ...okPlist, NSLocalNetworkUsageDescription: 'One thing. Another thing.' }, pbxOk).length > 0);
  expect('(e) catches the export-compliance key an agent may not write', rulePlist({ ...okPlist, ITSAppUsesNonExemptEncryption: false }, pbxOk).length > 0);
  expect('(e) catches a background task identifier', rulePlist({ ...okPlist, BGTaskSchedulerPermittedIdentifiers: ['x'] }, pbxOk).length > 0);
  expect('(e) catches the Background Modes capability in the project', rulePlist(okPlist, `${pbxOk} SystemCapabilities = { com.apple.BackgroundModes = { enabled = 1; }; };`).length > 0);
  expect('(f) catches the NetworkExtensions capability in the project', ruleNoVpn('project.pbxproj', 'SystemCapabilities = { com.apple.NetworkExtensions.iOS = { enabled = 1; }; };').length > 0);

  // (l)
  const nodeOk = [
    'import Foundation',
    'import TailscaleKit',
    '',
    'final class TailnetNode {',
    '    static let hostName = "tortie-phone"',
    '    private var node: TailscaleNode?',
    '    private func make(_ dir: URL, key: String?) throws -> TailscaleNode {',
    '        let config = Configuration(hostName: Self.hostName, path: dir.path, authKey: key, controlURL: kDefaultControlURL, ephemeral: false)',
    '        let made: TailscaleNode = try TailscaleNode(config: config, logger: nil)',
    '        return made',
    '    }',
    '    func start(key: String?) async throws {',
    '        let dir = try prepare()',
    '        let n = try make(dir, key: key)',
    '        try await n.up()',
    '        node = n',
    '    }',
    '    private func prepare() throws -> URL {',
    '        let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)',
    '        var dir = base.appendingPathComponent("tailnet", isDirectory: true)',
    '        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)',
    '        var values = URLResourceValues()',
    '        values.isExcludedFromBackup = true',
    '        try dir.setResourceValues(values)',
    '        return dir',
    '    }',
    '}',
    ''
  ].join('\n');
  const lRun = (node, others = []) =>
    ruleNodeOnly([{ name: NODE_REL, source: node }, { name: 'Tortie/Screens/F.swift', source: 'let x = 1\n' }, ...others]).findings;
  expect('(l) passes a node that is private, named, never ephemeral and alone', lRun(nodeOk).length === 0);
  expect('(l) catches a missing node file', ruleNodeOnly([{ name: 'Tortie/Screens/F.swift', source: 'let x = 1\n' }]).findings.length > 0);
  expect('(l) catches TailscaleKit imported by a screen', lRun(nodeOk, [{ name: 'Tortie/Screens/G.swift', source: 'import TailscaleKit\n' }]).length > 0);
  expect('(l) catches TailscaleKit imported by a test', lRun(nodeOk, [{ name: 'TortieTests/T.swift', source: '@testable import TailscaleKit\n' }]).length > 0);
  expect('(l) catches a single symbol imported from TailscaleKit', lRun(nodeOk, [{ name: 'Tortie/Screens/G.swift', source: 'import class TailscaleKit.TailscaleNode\n' }]).length > 0);
  expect('(l) leaves TailscaleKit named in a comment alone', lRun(nodeOk, [{ name: 'Tortie/Screens/G.swift', source: '// import TailscaleKit is Node.swift\'s\nlet y = 2\n' }]).length === 0);
  expect('(l) catches @_exported', lRun(nodeOk.replace('import TailscaleKit', '@_exported import TailscaleKit')).length > 0);
  expect('(l) catches a node that can leave the file', lRun(nodeOk.replace('private var node: TailscaleNode?', 'var node: TailscaleNode?')).length > 0);
  expect('(l) catches private(set), whose getter is not private', lRun(nodeOk.replace('private var node: TailscaleNode?', 'private(set) var node: TailscaleNode?')).length > 0);
  expect('(l) catches a function handing the node out', lRun(nodeOk.replace('private func make(', 'func make(')).length > 0);
  expect('(l) catches an ephemeral node', lRun(nodeOk.replace('ephemeral: false', 'ephemeral: true')).length > 0);
  expect('(l) catches ephemeral left to the default', lRun(nodeOk.replace(', ephemeral: false', '')).length > 0);
  expect('(l) catches another hostname', lRun(nodeOk.replace('"tortie-phone"', '"tortie-phone-2"')).length > 0);
  expect('(l) catches a hostname literal passed straight in', lRun(nodeOk.replace('hostName: Self.hostName', 'hostName: "my-phone"')).length > 0);
  expect('(l) catches a background task', lRun(nodeOk.replace('try await n.up()', 'try await n.up(); _ = UIApplication.shared.beginBackgroundTask { }')).length > 0);
  expect('(l) catches a scheduled background refresh', lRun(nodeOk, [{ name: 'Tortie/App/A.swift', source: 'import BackgroundTasks\nlet s = BGTaskScheduler.shared\n' }]).length > 0);
  expect('(l) catches TailscaleNode named outside the node', lRun(nodeOk, [{ name: 'Tortie/Screens/G.swift', source: 'var n: TailscaleNode?\n' }]).length > 0);
  expect('(l) catches a node file that constructs no node', lRun(nodeOk.split('try TailscaleNode(').join('try Other(')).length > 0);
  expect(
    '(l) accepts the node held by a member of a private type',
    lRun(`${nodeOk}private struct Live {\n    let node: TailscaleNode\n    func up() async throws { try await node.up() }\n}\n`).length === 0
  );
  expect('(l) catches the node held by a member of a type that is not private', lRun(`${nodeOk}struct Live {\n    let node: TailscaleNode\n}\n`).length > 0);
  const pbxFramework = [
    `316C1 /* TailscaleKit.xcframework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.xcframework; name = TailscaleKit.xcframework; path = ${VENDORED_XCFRAMEWORK}; sourceTree = SOURCE_ROOT; };`,
    '316C3 /* TailscaleKit.xcframework in Embed Frameworks */ = {isa = PBXBuildFile; fileRef = 316C1 /* TailscaleKit.xcframework */; settings = {ATTRIBUTES = (CodeSignOnCopy, RemoveHeadersOnCopy, ); }; };',
    'shellScript = "# a comment that says make and go\\nif [ ! -f \\"${SRCROOT}/../build/vendor/tailscalekit/TailscaleKit.xcframework/Info.plist\\" ]; then\\n  echo \\"error: Run npm run vendor:tailscalekit, then build again.\\"\\n  exit 1\\nfi\\n";'
  ].join('\n');
  expect('(l) passes the vendored framework, signed on copy, only checked for', ruleVendoredFramework(pbxFramework).findings.length === 0);
  expect('(l) catches the framework taken from elsewhere', ruleVendoredFramework(pbxFramework.replace(VENDORED_XCFRAMEWORK, '../Frameworks/TailscaleKit.xcframework')).findings.length > 0);
  expect('(l) catches the framework embedded unsigned', ruleVendoredFramework(pbxFramework.replace('CodeSignOnCopy, ', '')).findings.length > 0);
  expect('(l) catches a build phase that builds the framework', ruleVendoredFramework(pbxFramework.replace('shellScript = "', 'shellScript = "make -C ../libtailscale/swift ios-fat\\n')).findings.length > 0);
  expect('(l) catches a build phase that fetches', ruleVendoredFramework(pbxFramework.replace('shellScript = "', 'shellScript = "cd .. && npm run vendor:tailscalekit\\n')).findings.length > 0);
  expect('(l) catches a build phase that runs make by its full path', ruleVendoredFramework(pbxFramework.replace('shellScript = "', 'shellScript = "have=$(/usr/bin/make -C x ios-fat)\\n')).findings.length > 0);
  expect('(l) leaves plutil reading the pin alone', ruleVendoredFramework(pbxFramework.replace('shellScript = "', 'shellScript = "want=$(/usr/bin/plutil -extract commit raw -o - \\"$pin\\")\\n')).findings.length === 0);

  // (m)
  const mRun = (node, app = []) => ruleStateDirectory('Node.swift', node, app).findings;
  expect('(m) passes state in Application Support, excluded where it is created', mRun(nodeOk).length === 0);
  expect('(m) catches state that is backed up', mRun(nodeOk.replace('values.isExcludedFromBackup = true', 'values.isExcludedFromBackup = false')).length > 0);
  expect('(m) catches state kept in Caches', mRun(nodeOk.replace('.applicationSupportDirectory', '.cachesDirectory')).length > 0);
  expect('(m) catches state in the temporary directory', mRun(nodeOk.replace('let base = try', 'let tmp = NSTemporaryDirectory(); let base = try')).length > 0);
  expect('(m) catches an exclusion that is never applied', mRun(nodeOk.replace('try dir.setResourceValues(values)', 'try dir.checkResourceIsReachable()')).length > 0);
  expect('(m) catches a directory created where it is not excluded', mRun(nodeOk.replace('    func start(key: String?) async throws {\n', '    func start(key: String?) async throws {\n        try FileManager.default.createDirectory(at: URL(fileURLWithPath: ""), withIntermediateDirectories: true)\n')).length > 0);
  expect('(m) accepts the NSURL form of the exclusion', mRun(nodeOk.replace('var values = URLResourceValues()\n        values.isExcludedFromBackup = true\n        try dir.setResourceValues(values)', 'try (dir as NSURL).setResourceValue(true, forKey: .isExcludedFromBackupKey)')).length === 0);
  expect('(m) catches an app file taking the exclusion off', mRun(nodeOk, [{ name: 'F', source: 'v.isExcludedFromBackup = false\n' }]).length > 0);

  // (n)
  const keysOk = 'q[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly\nlet s = SecItemAdd(q as CFDictionary, nil)\nlet d: [String: Any] = [kSecAttrSynchronizable as String: kCFBooleanFalse as Any]\n';
  const nRun = (...sources) => ruleKeychain(sources.map((source, k) => ({ name: `F${String(k)}`, source }))).findings;
  expect('(n) passes a ThisDeviceOnly write that never synchronises', nRun(keysOk).length === 0);
  expect('(n) catches an accessibility that can leave the phone', nRun(keysOk.replace('WhenUnlockedThisDeviceOnly', 'WhenUnlocked')).length > 0);
  expect('(n) catches the deprecated Always', nRun(keysOk.replace('WhenUnlockedThisDeviceOnly', 'AlwaysThisDeviceOnly')).length > 0);
  expect('(n) catches a synchronised item', nRun(keysOk.replace('kCFBooleanFalse', 'kCFBooleanTrue')).length > 0);
  expect('(n) catches a synchronised item set by subscript', nRun(`${keysOk}q[kSecAttrSynchronizable as String] = true\n`).length > 0);
  expect('(n) catches a second writer that names no accessibility', nRun(keysOk, 'let s = SecItemAdd([kSecValueData as String: d] as CFDictionary, nil)\n').length > 0);
  expect('(n) catches iCloud key-value storage', nRun(keysOk, 'let k = NSUbiquitousKeyValueStore.default\n').length > 0);
  expect('(n) catches no Keychain write at all', nRun('let x = 1\n').length > 0);

  // (o)
  const reasons = (cat, r) => ({ NSPrivacyAccessedAPIType: cat, NSPrivacyAccessedAPITypeReasons: [r] });
  const fwOk = {
    NSPrivacyTracking: false,
    NSPrivacyTrackingDomains: [],
    NSPrivacyCollectedDataTypes: [],
    NSPrivacyAccessedAPITypes: [reasons('NSPrivacyAccessedAPICategoryFileTimestamp', 'C617.1'), reasons('NSPrivacyAccessedAPICategorySystemBootTime', '35F9.1')]
  };
  expect('(o) passes the framework manifest the measurement asks for', ruleManifest('M', fwOk, FRAMEWORK_DECLARES).findings.length === 0);
  expect('(o) catches tracking', ruleManifest('M', { ...fwOk, NSPrivacyTracking: true }, FRAMEWORK_DECLARES).findings.length > 0);
  expect('(o) catches a missing category', ruleManifest('M', { ...fwOk, NSPrivacyAccessedAPITypes: [fwOk.NSPrivacyAccessedAPITypes[0]] }, FRAMEWORK_DECLARES).findings.length > 0);
  expect('(o) catches another reason than the one decided', ruleManifest('M', { ...fwOk, NSPrivacyAccessedAPITypes: [reasons('NSPrivacyAccessedAPICategoryFileTimestamp', 'DDA9.1'), fwOk.NSPrivacyAccessedAPITypes[1]] }, FRAMEWORK_DECLARES).findings.length > 0);
  expect('(o) catches a reason from another category', ruleManifest('M', { ...fwOk, NSPrivacyAccessedAPITypes: [reasons('NSPrivacyAccessedAPICategoryFileTimestamp', '35F9.1')] }, {}).findings.length > 0);
  expect('(o) catches an unknown category', ruleManifest('M', { ...fwOk, NSPrivacyAccessedAPITypes: [reasons('NSPrivacyAccessedAPICategoryMadeUp', 'C617.1')] }, {}).findings.length > 0);
  expect('(o) catches collected data', ruleManifest('M', { ...fwOk, NSPrivacyCollectedDataTypes: [{ x: 1 }] }, {}).findings.length > 0);
  expect('(o) reads the app\'s required-reason uses from its text', requiredCategories([{ name: 'F', source: 'let u = ProcessInfo.processInfo.systemUptime\nlet d = UserDefaults.standard\n' }]).size === 2);
  expect('(o) leaves a required-reason name in a comment alone', requiredCategories([{ name: 'F', source: '// UserDefaults is never used\nlet x = 1\n' }]).size === 0);
  const fwXml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0"><dict><key>NSPrivacyTracking</key><false/><key>NSPrivacyAccessedAPITypes</key><array>' +
    '<dict><key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryFileTimestamp</string><key>NSPrivacyAccessedAPITypeReasons</key><array><string>C617.1</string></array></dict>' +
    '<dict><key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategorySystemBootTime</string><key>NSPrivacyAccessedAPITypeReasons</key><array><string>35F9.1</string></array></dict>' +
    '</array></dict></plist>\n';
  expect('(o) reads a manifest written as XML', ruleManifest('M', readPlistText(fwXml), FRAMEWORK_DECLARES).findings.length === 0);

  // (p)
  const offerOk = [
    'struct PairingOffer: Sendable, Equatable, CustomReflectable {',
    '    static let tailnetKeyPrefix = "tskey-auth-"',
    '    let tailnetKey: String?',
    '    var customMirror: Mirror { Mirror(self, children: [:]) }',
    '    private struct Wire: Decodable, CustomReflectable {',
    '        let tk: String?',
    '        var customMirror: Mirror { Wire.empty(self) }',
    '    }',
    '    static func parse(_ wire: Wire) throws -> PairingOffer {',
    '        guard wire.tk.map(isTailnetKey) ?? true else { throw E() }',
    '        return PairingOffer(',
    '            tailnetKey: wire.tk',
    '        )',
    '    }',
    '    static func isTailnetKey(_ key: String) -> Bool { key.hasPrefix(tailnetKeyPrefix) }',
    '}',
    ''
  ].join('\n');
  const nodeJoin = 'final class N {\n    func start(tailnetKey: String?) {\n        guard let tailnetKey else { return }\n        let c = Configuration(hostName: "tortie-phone", authKey: tailnetKey, ephemeral: false)\n    }\n}\n';
  const pRun = (offer, named = [], extra = []) =>
    ruleTailnetKey([{ name: 'Door/Pairing.swift', source: offer }, { name: 'Tailnet/Node.swift', source: nodeJoin }, ...extra], named).findings;
  expect('(p) passes a key that is parsed, checked and handed to the join', pRun(offerOk).length === 0);
  expect('(p) catches the key logged', pRun(`${offerOk}func log(_ o: PairingOffer) { print(o.tailnetKey ?? "") }\n`).length > 0);
  expect('(p) catches the key interpolated into a string', pRun(`${offerOk}func say(_ o: PairingOffer) -> String { "key \\(o.tailnetKey ?? "")" }\n`).length > 0);
  expect('(p) catches the key through an alias', pRun(`${offerOk}func keep(_ o: PairingOffer) { let saved = o.tailnetKey; store(saved) }\n`).length > 0);
  expect('(p) catches the key handed to a place that is not key-named', pRun(`${offerOk}func keep(_ o: PairingOffer) { stash(value: o.tailnetKey) }\n`).length > 0);
  expect('(p) catches a comparison that is not a nil test', pRun(`${offerOk}func same(_ o: PairingOffer, _ k: String) -> Bool { o.tailnetKey != k }\n`).length > 0);
  expect('(p) accepts a nil test', pRun(`${offerOk}func has(_ o: PairingOffer) -> Bool { o.tailnetKey != nil }\n`).length === 0);
  expect('(p) catches an encodable type holding the key', pRun(offerOk.replace('private struct Wire: Decodable', 'private struct Wire: Codable')).length > 0);
  expect('(p) catches an encodable extension over a type holding the key', pRun(`${offerOk}extension PairingOffer: Encodable {}\n`).length > 0);
  expect('(p) catches a key literal in the app', pRun(`${offerOk}let k = "tskey-auth-kP316abc"\n`).length > 0);
  expect('(p) accepts a named line and refuses one that grew', (() => {
    const line = 'func keep(_ o: PairingOffer) { hand(o.tailnetKey) }';
    const ok = pRun(`${offerOk}${line}\n`, [{ file: 'Door/Pairing.swift', line, uses: 1, why: 'x' }]).length === 0;
    const grew = pRun(`${offerOk}func keep(_ o: PairingOffer) { hand(o.tailnetKey); hand(o.tailnetKey) }\n`, [{ file: 'Door/Pairing.swift', line: 'func keep(_ o: PairingOffer) { hand(o.tailnetKey); hand(o.tailnetKey) }', uses: 1, why: 'x' }]).length > 0;
    return ok && grew;
  })());
  expect('(p) refuses a stale named entry', pRun(offerOk, [{ file: 'Door/Pairing.swift', line: 'gone(o.tailnetKey)', uses: 1, why: 'x' }]).length > 0);
  expect('(p) catches a node that never joins with the key', ruleTailnetKey([{ name: 'Door/Pairing.swift', source: offerOk }, { name: 'Tailnet/Node.swift', source: 'let x = 1\n' }]).findings.length > 0);
  const nodeKey = 'actor N {\n    func join(key: String?) async throws {\n        guard let key else { throw E() }\n        let c = Configuration(hostName: "tortie-phone", authKey: key, ephemeral: false)\n    }\n}\n';
  const kIn = (node) => ruleTailnetKey([{ name: 'Door/Pairing.swift', source: offerOk }, { name: 'Tailnet/Node.swift', source: node }], [], 'Tailnet/Node.swift', { 'Tailnet/Node.swift': ['key'] }).findings;
  expect('(p) follows the key under its parameter name inside the node', kIn(nodeKey).length === 0);
  expect('(p) catches the parameter written somewhere inside the node', kIn(nodeKey.replace('guard let key else', 'let copy = key; stash(copy); guard let key else')).length > 0);
  expect('(p) reads key as nothing special outside the files that carry it', ruleTailnetKey([{ name: 'Door/Pairing.swift', source: `${offerOk}func other(key: String) { stash(key) }\n` }, { name: 'Tailnet/Node.swift', source: nodeKey }], [], 'Tailnet/Node.swift', { 'Tailnet/Node.swift': ['key'] }).findings.length === 0);
  const madeUp = `tskey-auth-kQ7Rz${'CN'}TRL-Zx8Yw7Vu6Ts5Rq4P`;
  expect('(p) catches a string shaped like a real key', ruleNoRealKey('F', `// ${madeUp}\n`).length > 0);
  expect('(p) leaves a made-up key that says p316 alone', ruleNoRealKey('F', `let k = "tskey-auth-kP316X${'CN'}TRL-p316notarealkey00"\n`).length === 0);
  expect('(p) never repeats the key it found', !ruleNoRealKey('F', madeUp).join('').includes('Zx8Yw7'));

  // Phase 316.3's fix round: the shapes the verification walked past (e),
  // (f), (l), (c) and (p) with, and the coverage (i) now refuses.
  // (e) Apple's key modifiers.
  expect('(e) reads UIBackgroundModes~iphone as UIBackgroundModes', rulePlist({ ...okPlist, 'UIBackgroundModes~iphone': ['fetch'] }, pbxOk).length > 0);
  expect('(e) reads UIBackgroundModes-iphoneos as UIBackgroundModes', rulePlist({ ...okPlist, 'UIBackgroundModes-iphoneos': ['audio'] }, pbxOk).length > 0);
  expect('(e) reads a platform and a device modifier together', rulePlist({ ...okPlist, 'BGTaskSchedulerPermittedIdentifiers-iphoneos~ipad': ['x'] }, pbxOk).length > 0);
  expect('(e) reads NSAllowsArbitraryLoads~iphone inside ATS', rulePlist({ ...okPlist, NSAppTransportSecurity: { ...okPlist.NSAppTransportSecurity, 'NSAllowsArbitraryLoads~iphone': true } }, pbxOk).length > 0);
  expect('(e) catches a device spelling of the ATS dictionary beside the checked one', rulePlist({ ...okPlist, 'NSAppTransportSecurity~iphone': { NSAllowsLocalNetworking: false } }, pbxOk).length > 0);
  expect('(e) leaves a modifier on a key it does not pin alone', rulePlist({ ...okPlist, 'UISupportedInterfaceOrientations~ipad': ['UIInterfaceOrientationPortrait'] }, pbxOk).length === 0);
  expect('(e) catches a background mode injected by an xcconfig', rulePlist(okPlist, pbxOk, [{ name: 'X.xcconfig', text: 'INFOPLIST_KEY_UIBackgroundModes = fetch\n' }]).length > 0);
  expect('(e) leaves an xcconfig comment alone', rulePlist(okPlist, pbxOk, [{ name: 'X.xcconfig', text: '// INFOPLIST_KEY_UIBackgroundModes is refused\n' }]).length === 0);
  expect('(e) catches an xcconfig naming another Info.plist', rulePlist(okPlist, pbxOk, [{ name: 'X.xcconfig', text: 'INFOPLIST_FILE = Other.plist\n' }]).length > 0);
  // The hardening round: what CoreFoundation reads, and every configuration.
  const cfPlist = (keys) => `<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">\n<dict>\n${keys}</dict>\n</plist>\n`;
  const entity = cfPlist('  <key>UIBackground&#77;odes</key>\n  <array>\n    <string>fetch</string>\n  </array>\n');
  const entityRead = readPlistText(entity);
  expect('(e) reads UIBackground&#77;odes as CoreFoundation does, as UIBackgroundModes', Array.isArray(entityRead.UIBackgroundModes) && rulePlist({ ...okPlist, ...entityRead }, pbxOk).length > 0);
  const atsRead = readPlistText(cfPlist('  <key>NSAppTransport&#83;ecurity</key>\n  <dict>\n    <key>NSAllows&#x41;rbitraryLoads</key>\n    <true/>\n  </dict>\n'));
  expect('(e) reads a second ATS dictionary spelled with references as the one ATS dictionary', rulePlist({ ...okPlist, ...atsRead }, pbxOk).length > 0);
  expect('(e) refuses a key spelled with a character reference', rulePlistSpelling('P', entity, entityRead).length > 0);
  expect('(e) refuses a key that holds a build setting', rulePlistSpelling('P', cfPlist('  <key>$(P316BG)</key>\n  <true/>\n'), { '$(P316BG)': true }).length > 0);
  const twice = cfPlist('  <key>A</key>\n  <true/>\n  <key>A</key>\n  <false/>\n');
  expect('(e) refuses a key spelled twice, which CoreFoundation reads once as its last value', rulePlistSpelling('P', twice, readPlistText(twice)).length > 0);
  const plain = cfPlist('  <key>A</key>\n  <true/>\n  <!-- <key>B</key> in a comment -->\n');
  expect('(e) leaves a plain file, and a key in a comment, alone', rulePlistSpelling('P', plain, readPlistText(plain)).length === 0);
  const cdata = cfPlist('  <key><![CDATA[UIBackgroundModes]]></key>\n  <true/>\n');
  expect('(e) reads a key in a CDATA section as CoreFoundation does, and refuses its spelling', readPlistText(cdata).UIBackgroundModes === true && rulePlistSpelling('P', cdata, readPlistText(cdata)).length > 0);
  expect('(e) a key with a comment inside is refused by CoreFoundation, and the refusal reaches the rule', (() => {
    try {
      readPlistText(cfPlist('  <key>UIBack<!-- p316 -->groundModes</key>\n  <true/>\n'));
      return false;
    } catch {
      return true;
    }
  })());
  const src = (pbx, xc = []) => ruleInfoPlistSource(pbx, xc).findings;
  expect('(e) accepts both app configurations built from Tortie/Info.plist', src(pbxOk).length === 0);
  expect('(e) catches one configuration built from another plist', src(pbxOk.replace(/(AAAA00000004[\s\S]*?)INFOPLIST_FILE = Tortie\/Info\.plist;/, '$1INFOPLIST_FILE = Tortie/Release/Info.plist;')).length > 0);
  expect('(e) catches another plist named for one SDK only', src(pbxApp('', '        "INFOPLIST_FILE[sdk=iphoneos*]" = Other.plist;\n')).length > 0);
  expect('(e) catches a configuration that names no Info.plist', src(pbxOk.replace(/(AAAA00000004[\s\S]*?)\s*INFOPLIST_FILE = Tortie\/Info\.plist;/, '$1')).length > 0);
  expect('(e) catches the app generating its Info.plist', src(pbxOk.replace(/(AAAA00000003[\s\S]*?)GENERATE_INFOPLIST_FILE = NO;/, '$1GENERATE_INFOPLIST_FILE = YES;')).length > 0);
  expect('(e) catches Info.plist preprocessing', src(pbxApp('        INFOPLIST_PREPROCESS = YES;\n        INFOPLIST_OTHER_PREPROCESSOR_FLAGS = "-DP316BG=UIBackgroundModes";\n')).length > 0);
  expect('(e) catches Info.plist preprocessing in an xcconfig', src(pbxOk, [{ name: 'X.xcconfig', text: 'INFOPLIST_PREPROCESS = YES\n' }]).length > 0);
  expect('(e) catches a refused key generated for one SDK', src(pbxApp('        "INFOPLIST_KEY_UIBackgroundModes[sdk=iphoneos*]" = fetch;\n')).length > 0);
  expect('(e) accepts an xcconfig naming Tortie/Info.plist', src(pbxOk, [{ name: 'X.xcconfig', text: 'INFOPLIST_FILE = Tortie/Info.plist\n' }]).length === 0);
  expect('(e) catches an xcconfig generating the Info.plist', src(pbxOk, [{ name: 'X.xcconfig', text: 'GENERATE_INFOPLIST_FILE = YES\n' }]).length > 0);
  expect('(e) catches a project with no application target', src('INFOPLIST_FILE = Tortie/Info.plist;').length > 0);
  // (f) every shape of NetworkExtension.
  expect('(f) catches a scoped enum import', ruleNoVpn('F.swift', 'import enum NetworkExtension.NEVPNStatus\n').length > 0);
  expect('(f) catches a scoped class import', ruleNoVpn('F.swift', 'import class NetworkExtension.NEHotspotConfigurationManager\n').length > 0);
  expect('(f) catches a NetworkExtension class used without an import', ruleNoVpn('F.swift', 'let m = NEHotspotConfigurationManager.shared\n').length > 0);
  expect('(f) catches a NetworkExtension class looked up by name', ruleNoVpn('F.swift', 'let c: AnyClass? = NSClassFromString("NEVPNManager")\n').length > 0);
  expect('(f) catches @import in Objective-C', ruleNoVpn('T.m', '@import NetworkExtension;\n').length > 0);
  expect('(f) catches #import of its header', ruleNoVpn('T.h', '#import <NetworkExtension/NetworkExtension.h>\n').length > 0);
  expect('(f) leaves an Objective-C comment alone', ruleNoVpn('T.m', '// @import NetworkExtension; is refused\n/* NetworkExtension */\nvoid f(void) {}\n').length === 0);
  expect('(f) catches the framework linked by OTHER_LDFLAGS', ruleNoVpn('project.pbxproj', 'OTHER_LDFLAGS = "-framework NetworkExtension";').length > 0);
  expect('(f) catches the framework linked by OTHER_LDFLAGS as an array', ruleNoVpn('project.pbxproj', 'OTHER_LDFLAGS = (\n"-weak_framework",\nNetworkExtension,\n);').length > 0);
  expect('(f) catches the framework linked by an xcconfig', ruleNoVpn('L.xcconfig', 'OTHER_LDFLAGS = -framework NetworkExtension\n').length > 0);
  expect('(f) leaves an xcconfig comment alone', ruleNoVpn('L.xcconfig', '// never -framework NetworkExtension\nSWIFT_VERSION = 5.0\n').length === 0);
  expect('(f) leaves a Swift comment about NetworkExtension alone', ruleNoVpn('F.swift', '// never a NetworkExtension\nlet x = 1\n').length === 0);
  // (i) coverage.
  const planOk = { defaultOptions: { codeCoverage: false, uiTestingScreenshotsEnabled: false, systemAttachmentLifetime: 'keepNever', userAttachmentLifetime: 'keepNever' } };
  expect('(i) accepts a plan with coverage off', ruleTestPlan('P', planOk).length === 0);
  expect('(i) catches a plan that leaves coverage to its default', ruleTestPlan('P', { defaultOptions: { ...planOk.defaultOptions, codeCoverage: undefined } }).length > 0);
  expect('(i) catches a configuration turning coverage back on', ruleTestPlan('P', { ...planOk, configurations: [{ name: 'c', options: { codeCoverage: true } }] }).length > 0);
  // (c) the configuration.
  expect('(c) accepts an ephemeral configuration in the client', ruleEphemeralOnly('C', 'let c = URLSessionConfiguration.ephemeral\n', 'client').length === 0);
  expect('(c) catches a background session configuration', ruleEphemeralOnly('C', 'let c = URLSessionConfiguration.background(withIdentifier: "x")\n', 'client').length > 0);
  expect('(c) catches a default configuration', ruleEphemeralOnly('C', 'let c = URLSessionConfiguration.default\nlet d = URLSessionConfiguration.ephemeral\n', 'client').length > 0);
  expect('(c) catches a client with no ephemeral configuration', ruleEphemeralOnly('C', 'let x = 1\n', 'client').length > 0);
  // (l) the other ways to stay up.
  expect('(l) catches performExpiringActivity', lRun(nodeOk.replace('try await n.up()', 'try await n.up(); ProcessInfo.processInfo.performExpiringActivity(withReason: "t") { _ in }')).length > 0);
  expect('(l) catches a background URLSession', lRun(nodeOk, [{ name: 'Tortie/Door/C.swift', source: 'let c = URLSessionConfiguration.background(withIdentifier: "x")\n' }]).length > 0);
  expect('(l) catches a background fetch interval', lRun(nodeOk, [{ name: 'Tortie/App/A.swift', source: 'UIApplication.shared.setMinimumBackgroundFetchInterval(60)\n' }]).length > 0);
  // (p) the code that carries the key, and the values that hold it.
  const pIn = (extra) => ruleTailnetKey([{ name: 'Door/Pairing.swift', source: offerOk }, { name: 'Tailnet/Node.swift', source: nodeJoin }, ...extra], []).findings;
  const screen = (body) => ({ name: 'Screens/PairingScreen.swift', source: `final class M: CustomReflectable {\n    private var spent: String?\n    nonisolated var customMirror: Mirror { Mirror(self, children: [:]) }\n${body}\n}\n` });
  expect('(p) accepts a code compared, bound and handed to a watched label', pIn([screen('    func read(_ payload: String) {\n        guard payload != spent else { return }\n        spent = payload\n        stop(payload: payload)\n    }')]).length === 0);
  expect('(p) catches the raw code written to the Keychain', pIn([screen('    func read(_ payload: String) {\n        try? store.write(Data(payload.utf8), account: "last")\n    }')]).length > 0);
  expect('(p) catches the raw code printed', pIn([screen('    func read(_ payload: String) {\n        print(payload)\n    }')]).length > 0);
  expect('(p) catches the raw code under an alias', pIn([screen('    func read(_ payload: String) {\n        let raw = payload\n        keep(raw)\n    }')]).length > 0);
  expect('(p) accepts a closure that names its code', pIn([screen('    func scan() {\n        onCode { code in\n            spent = code\n        }\n    }')]).length === 0);
  expect('(p) catches a class holding the code with no mirror', pIn([{ name: 'Screens/PairingScreen.swift', source: 'final class M {\n    private var spent: String?\n}\n' }]).length > 0);
  expect('(p) accepts the mirror declared in an extension', pIn([{ name: 'Screens/PairingScreen.swift', source: 'final class M {\n    private var spent: String?\n}\nextension M: CustomReflectable {\n    nonisolated var customMirror: Mirror { Mirror(self, children: [:]) }\n}\n' }]).length === 0);
  expect('(p) catches a struct holding the key with no mirror', pRun(offerOk.replace('    var customMirror: Mirror { Mirror(self, children: [:]) }\n    private', '    private')).length > 0);
  expect('(p) catches a nested type holding the key with no mirror', pRun(offerOk.replace('        var customMirror: Mirror { Wire.empty(self) }\n', '')).length > 0);
  expect('(p) catches an enum case carrying the key with no mirror', pIn([{ name: 'Tailnet/Node.swift', source: `${nodeJoin}enum Step {\n    case join(authKey: String)\n}\n` }]).length > 0);
  expect('(p) catches a mirror that repeats the key', pRun(offerOk.replace('var customMirror: Mirror { Mirror(self, children: [:]) }', 'var customMirror: Mirror { Mirror(self, children: ["k": tailnetKey as Any]) }')).length > 0);
  expect('(p) catches a description that repeats the key', pRun(`${offerOk}extension PairingOffer: CustomStringConvertible {\n    var description: String { "PairingOffer \\(tailnetKey ?? "")" }\n}\n`).length > 0);
  const camera = (bind) => ({ name: 'Screens/PairingScreen.swift', source: `final class S {\n    func out(_ objects: [AVMetadataObject]) {\n        guard let ${bind} = objects\n            .compactMap({ ($0 as? AVMetadataMachineReadableCodeObject)?.stringValue })\n            .first else { return }\n        _ = ${bind} == nil\n    }\n}\n` });
  expect('(p) accepts the camera reading bound to a watched name across a chain', pIn([camera('code')]).length === 0);
  expect('(p) catches the camera reading bound to a name it does not watch', pIn([camera('raw')]).length > 0);
  expect('(p) catches the launch code bound to a name it does not watch', pIn([{ name: 'App/TortieApp.swift', source: 'func launch() {\n    let raw = PairingDebugSeam.injectedPayload()\n    _ = raw\n}\n' }]).length > 0);
  expect('(p) accepts the launch code bound to a watched name', pIn([{ name: 'App/TortieApp.swift', source: 'func launch() {\n    var launchCode: String?\n    launchCode = PairingDebugSeam.injectedPayload()\n    _ = launchCode == nil\n}\n' }]).length === 0);
  expect('(p) does not read the seam\'s own declaration as a source', pIn([{ name: 'Door/Pairing.swift', source: `${offerOk}enum Seam {\n    static func injectedPayload(_ a: [String]) -> String? { nil }\n}\n` }]).length === 0);

  // The hardening round: every shape the reverify walked past (c), (f), (l)
  // and (p) with.
  // (f) the import in backticks, every NE class, and packages.
  expect('(f) catches the module in backticks', ruleNoVpn('F.swift', 'import `NetworkExtension`\n').length > 0);
  expect('(f) catches a scoped import with the module in backticks', ruleNoVpn('F.swift', 'import class `NetworkExtension`.NEHotspotConfigurationManager\n').length > 0);
  expect('(f) catches NEPacket, which no prefix list named', ruleNoVpn('F.swift', 'let p = NEPacket(data: Data(), protocolFamily: 2)\n').length > 0);
  expect('(f) catches any NE class looked up by its name', ruleNoVpn('F.swift', 'let c: AnyClass? = NSClassFromString("NEFlowMetaData")\n').length > 0);
  expect('(f) leaves NEVER in a comment alone', ruleNoVpn('F.swift', '// NEVER a VPN\nlet x = 1\n').length === 0);
  expect('(f) catches a remote Swift package', ruleNoVpn('project.pbxproj', '316A1 /* XCRemoteSwiftPackageReference "x" */ = {isa = XCRemoteSwiftPackageReference; repositoryURL = "https://example.invalid/x"; };').length > 0);
  expect('(f) catches a local Swift package', ruleNoVpn('project.pbxproj', '316A2 /* XCLocalSwiftPackageReference "x" */ = {isa = XCLocalSwiftPackageReference; relativePath = ../x; };').length > 0);
  // (l) the import in backticks, and Core Location's relaunches.
  expect('(l) catches TailscaleKit imported in backticks by a test', lRun(nodeOk, [{ name: 'TortieTests/T.swift', source: '@testable import `TailscaleKit`\n' }]).length > 0);
  expect('(l) catches significant-change location monitoring', lRun(nodeOk, [{ name: 'Tortie/Tailnet/W.swift', source: 'import CoreLocation\nlet m = CLLocationManager()\nfunc arm() { m.startMonitoringSignificantLocationChanges() }\n' }]).length > 0);
  expect('(l) catches region monitoring', lRun(nodeOk, [{ name: 'Tortie/Tailnet/W.swift', source: 'func arm(_ m: CLLocationManager, _ r: CLRegion) { m.startMonitoring(for: r) }\n' }]).length > 0);
  expect('(l) catches visit monitoring and CLMonitor', lRun(nodeOk, [{ name: 'Tortie/Tailnet/W.swift', source: 'func arm(_ m: CLLocationManager) async { m.startMonitoringVisits(); _ = await CLMonitor("x") }\n' }]).length > 0);
  // (c) every session is ephemeral, however it is spelled.
  const client = 'enum C {\n    static func configuration(_ r: Int) -> URLSessionConfiguration {\n        let c = URLSessionConfiguration.ephemeral\n        return c\n    }\n    func go() {\n        let s = URLSession(configuration: Self.configuration(1), delegate: nil, delegateQueue: nil)\n        _ = s\n    }\n}\n';
  const cRun = (src) => ruleEphemeralOnly('C', src, 'client', configurationFunctions(src));
  expect("(c) accepts the client's own builder and .ephemeral", cRun(client).length === 0 && cRun(client.replace('Self.configuration(1)', '.ephemeral')).length === 0);
  expect('(c) finds the client\'s builders by their return type', configurationFunctions(client).join() === 'configuration');
  expect('(c) catches URLSession.shared', cRun(client.replace('_ = s', '_ = URLSession.shared.dataTask(with: URL(string: "https://x")!)')).length > 0);
  expect('(c) catches configuration: .default', cRun(client.replace('Self.configuration(1)', '.default')).length > 0);
  expect('(c) catches a configuration passed under another name', cRun(client.replace('Self.configuration(1)', 'other')).length > 0);
  expect('(c) catches a typed .default', cRun(client.replace('let c = URLSessionConfiguration.ephemeral', 'let d: URLSessionConfiguration = .default\n        let c = URLSessionConfiguration.ephemeral')).length > 0);
  expect("(c) catches a builder that returns .default", cRun(client.replace('return c', 'return .default')).length > 0);
  expect('(c) catches a computed property typed .default', cRun(`${client}var p: URLSessionConfiguration { .default }\n`).length > 0);
  // (p) the other ways a code comes in.
  const reader = (body) => ({ name: 'Screens/StillReader.swift', source: `enum StillReader {\n${body}\n}\n` });
  expect("(p) catches Core Image's QR reader bound to an unwatched name", pIn([reader('    static func read(_ f: CIQRCodeFeature) { let raw = f.messageString; keep(raw) }')]).length > 0);
  expect("(p) catches Vision's payloadData bound to an unwatched name", pIn([reader('    static func read(_ o: VNBarcodeObservation) { let raw = o.payloadData; keep(raw) }')]).length > 0);
  expect('(p) catches a deep link whose code goes nowhere watched', pIn([{ name: 'App/TortieApp.swift', source: 'struct V {\n    var body: some View { EmptyView().onOpenURL { url in keep(url) } }\n}\n' }]).length > 0);
  expect('(p) catches the pasteboard read', pIn([reader('    static func read() { let raw = UIPasteboard.general.string; keep(raw) }')]).length > 0);
  expect('(p) accepts a deep link bound to a watched name', pIn([{ name: 'App/TortieApp.swift', source: 'struct V {\n    var body: some View { EmptyView().onOpenURL { code in _ = code == nil } }\n}\n' }]).length === 0);

  // (q) Tailscale's own logs, off before every start.
  const logsNode = [
    'import TailscaleKit',
    'enum TailnetLogs {',
    '    static func off() -> Bool {',
    '        tailscale_no_logs_no_support() == 0',
    '    }',
    '}',
    'private struct Engine {',
    '    func start() throws -> Any {',
    '        guard TailnetLogs.off() else { throw E() }',
    '        return try TailscaleNode(config: c, logger: nil)',
    '    }',
    '}',
    'enum TailnetRules {',
    '    static let flowLogsRefusal = "tailnet requires logging to be enabled"',
    '}',
    'struct TailnetFlowLogsRequired: Error {',
    '    static func said(_ message: String?) -> Bool {',
    '        message?.contains(TailnetRules.flowLogsRefusal) ?? false',
    '    }',
    '}',
    'actor Node {',
    '    func join() throws {',
    '        do { try up() } catch {',
    '            if error is TailnetFlowLogsRequired { throw TailnetRefusal.flowLogsRequired }',
    '            throw TailnetRefusal.keyRefused',
    '        }',
    '    }',
    '}',
    'private struct Running {',
    '    func up() async throws {',
    '        do {',
    '            try await node.up()',
    '        } catch TailscaleError.internalError(let message) where TailnetFlowLogsRequired.said(message) {',
    '            throw TailnetFlowLogsRequired()',
    '        }',
    '    }',
    '}',
    ''
  ].join('\n');
  const goPatch = '//export TsnetNoLogsNoSupport\nfunc TsnetNoLogsNoSupport() C.int {\n\tenvknob.SetNoLogsNoSupport()\n\tif !envknob.NoLogsNoSupport() {\n\t\treturn -1\n\t}\n\treturn 0\n}\n';
  const scriptOk = {
    text: 'applyNoLogsPatch(srcDir, log);',
    patch: [
      { file: 'tailscale.go', text: '\t"tailscale.com/envknob"\n' },
      { file: 'tailscale.go', text: goPatch },
      { file: 'tailscale.c', text: 'int tailscale_no_logs_no_support(void) {\n\treturn TsnetNoLogsNoSupport();\n}\n' },
      { file: 'swift/TailscaleKit/TailscaleKit.h', text: 'extern int tailscale_no_logs_no_support(void);\n' }
    ]
  };
  const qRun = (node, others = [], script = scriptOk) => ruleLogsOff('N.swift', node, others, script).findings;
  expect('(q) passes a node whose every start is guarded by the checked switch', qRun(logsNode).length === 0);
  expect('(q) catches a start with no guard', qRun(logsNode.replace('        guard TailnetLogs.off() else { throw E() }\n', '')).length > 0);
  expect('(q) catches the switch called and its answer dropped', qRun(logsNode.replace('        guard TailnetLogs.off() else { throw E() }\n', '        _ = TailnetLogs.off()\n')).length > 0);
  expect('(q) catches a wrapper that does not check the answer', qRun(logsNode.replace('tailscale_no_logs_no_support() == 0', '_ = tailscale_no_logs_no_support(); return true')).length > 0);
  expect('(q) catches the switch only in DEBUG', qRun(logsNode.replace('enum TailnetLogs {', '#if DEBUG\nenum TailnetLogs {').replace('    }\n}\nprivate struct', '    }\n}\n#endif\nprivate struct')).length > 0);
  expect('(q) catches a guard in a branch the start is not in', qRun(logsNode.replace('        guard TailnetLogs.off() else { throw E() }\n', '        if flag {\n            guard TailnetLogs.off() else { throw E() }\n        }\n')).length > 0);
  expect('(q) accepts a guard that encloses the start', qRun(logsNode.replace('        return try TailscaleNode(config: c, logger: nil)\n', '        if flag {\n            return try TailscaleNode(config: c, logger: nil)\n        }\n        throw E()\n')).length === 0);
  expect('(q) catches a node started with the C API itself', qRun(logsNode, [{ name: 'F.swift', source: 'let h = tailscale_new()\n_ = tailscale_up(h)\n' }]).length > 0);
  expect('(q) catches a patch that no longer sets the switch', qRun(logsNode, [], { ...scriptOk, patch: scriptOk.patch.map((e) => ({ ...e, text: e.text.replace('envknob.SetNoLogsNoSupport()', '_ = envknob.Bool("x")') })) }).length > 0);
  expect('(q) catches a patch that answers 0 whatever tsnet reads', qRun(logsNode, [], { ...scriptOk, patch: scriptOk.patch.map((e) => ({ ...e, text: e.text.replace('\t\treturn -1\n', '\t\treturn 0\n') })) }).length > 0);
  expect('(q) catches a script that never applies its patch', qRun(logsNode, [], { ...scriptOk, text: '// applyNoLogsPatch is not called' }).length > 0);
  expect('(q) catches no vendoring script', qRun(logsNode, [], null).length > 0);
  expect('(q) catches a node file with no start at all', qRun('enum TailnetLogs {\n    static func off() -> Bool { tailscale_no_logs_no_support() == 0 }\n}\n').length > 0);
  // (q4) The flow logs refusal, Phase 316.4.
  expect('(q4) reads the flow logs words from the fixture', ruleLogsOff('N.swift', logsNode, [], scriptOk).said.flowLogsWords === 'tailnet requires logging to be enabled');
  expect('(q4) catches the words gone', qRun(logsNode.replace('    static let flowLogsRefusal = "tailnet requires logging to be enabled"\n', '')).length > 0);
  expect('(q4) catches the words built by interpolation', qRun(logsNode.replace('"tailnet requires logging to be enabled"', '"tailnet requires \\(what)"')).length > 0);
  expect('(q4) catches the words cut too short to mean anything', qRun(logsNode.replace('"tailnet requires logging to be enabled"', '"tailnet"')).length > 0);
  expect('(q4) catches the live up() no longer turning the error into its own', qRun(logsNode.replace(' where TailnetFlowLogsRequired.said(message)', '')).length > 0);
  expect('(q4) catches the live up() throwing something else for it', qRun(logsNode.replace('            throw TailnetFlowLogsRequired()\n', '            throw E()\n')).length > 0);
  expect('(q4) catches said() answering true for everything', qRun(logsNode.replace('message?.contains(TailnetRules.flowLogsRefusal) ?? false', 'true')).length > 0);
  expect('(q4) catches the join drawing it as a refused key', qRun(logsNode.replace('            if error is TailnetFlowLogsRequired { throw TailnetRefusal.flowLogsRequired }\n', '')).length > 0);
  expect('(q4) catches the join telling it apart only AFTER a refused key', qRun(logsNode.replace('            if error is TailnetFlowLogsRequired { throw TailnetRefusal.flowLogsRequired }\n            throw TailnetRefusal.keyRefused\n', '            throw TailnetRefusal.keyRefused\n            if error is TailnetFlowLogsRequired { throw TailnetRefusal.flowLogsRequired }\n')).length > 0);
  expect('(q4) does not take a word inside a comment for the catch', qRun(logsNode.replace('        } catch TailscaleError.internalError(let message) where TailnetFlowLogsRequired.said(message) {\n            throw TailnetFlowLogsRequired()\n        }\n', '        } catch {}\n        // catch TailscaleError.internalError(let message) where TailnetFlowLogsRequired.said(message) { throw TailnetFlowLogsRequired() }\n')).length > 0);

  // (r) The icon. Two-pixel pictures written here with filter 0, so the rule
  // is proved on bytes whose every field this block chose.
  const png = (w, h, colorType, pixels, extra = []) => {
    const part = (type, body) => {
      const head = Buffer.alloc(8);
      head.writeUInt32BE(body.length, 0);
      head.write(type, 4, 'latin1');
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0);
      return Buffer.concat([head, body, crc]);
    };
    const channels = colorType === 6 ? 4 : 3;
    const rows = [];
    for (let y = 0; y < h; y += 1) rows.push(Buffer.from([0, ...pixels.slice(y * w * channels, (y + 1) * w * channels)]));
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = colorType;
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), part('IHDR', ihdr), ...extra.map(([t, b]) => part(t, b)), part('IDAT', deflateSync(Buffer.concat(rows))), part('IEND', Buffer.alloc(0))]);
  };
  // A master of one opaque pixel, one clear pixel, one half-clear pixel and one clear coloured pixel.
  const masterPx = [33, 42, 43, 255, 0, 0, 0, 0, 200, 100, 50, 128, 10, 20, 30, 0];
  const paper = [245, 247, 250];
  const flat = (g) => [0, 1, 2, 3].flatMap((p) => [0, 1, 2].map((c) => Math.round((masterPx[p * 4 + c] * masterPx[p * 4 + 3] + g[c] * (255 - masterPx[p * 4 + 3])) / 255)));
  const masterPng = png(2, 2, 6, masterPx);
  const iconOk = png(2, 2, 2, flat(paper));
  const rImg = (icon) => ruleIconImage('I.png', icon, 'M.png', masterPng, paper, 2);
  expect('(r) reads a PNG\'s colour type from its own header', pngFacts(iconOk).colorType === 2 && pngFacts(masterPng).colorType === 6);
  expect('(r) accepts the master laid over its ground', rImg(iconOk).length === 0);
  expect('(r) catches the master itself, which has an alpha channel', rImg(masterPng).length > 0);
  expect('(r) catches an opaque icon still written with an alpha channel', rImg(png(2, 2, 6, flat(paper).flatMap((v, i) => (i % 3 === 2 ? [v, 255] : [v])))).length > 0);
  expect('(r) catches a transparent colour in an RGB icon', rImg(png(2, 2, 2, flat(paper), [['tRNS', Buffer.from([0, 245, 0, 247, 0, 250])]])).length > 0);
  expect('(r) catches the master laid over another ground', rImg(png(2, 2, 2, flat([19, 20, 23]))).length > 0);
  expect('(r) catches one channel of one pixel off by one', rImg(png(2, 2, 2, flat(paper).map((v, i) => (i === 7 ? v + 1 : v)))).length > 0);
  expect('(r) catches an icon of another size', ruleIconImage('I.png', iconOk, 'M.png', masterPng, paper, 4).length > 0);
  expect('(r) catches bytes that are not a PNG', rImg(Buffer.from('not a png')).length > 0);
  const setOk = { images: [{ filename: 'AppIcon.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }], info: { author: 'xcode', version: 1 } };
  const catalogOk = { entries: ['AppIcon.appiconset', 'Contents.json'], rootContents: { info: {} }, setEntries: ['AppIcon.png', 'Contents.json'], setContents: setOk };
  const iconSettings = '        ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;\n        ASSETCATALOG_COMPILER_GENERATE_ASSET_SYMBOLS = NO;\n';
  const rCat = (catalog, pbx = pbxApp(iconSettings, iconSettings), xc = []) => ruleIconCatalog(catalog, 'AppIcon.png', pbx, xc).findings;
  expect('(r) accepts the one icon named in both configurations', rCat(catalogOk).length === 0);
  expect('(r) catches no catalog at all', rCat(null).length > 0);
  expect('(r) catches a colour set in the catalog', rCat({ ...catalogOk, entries: [...catalogOk.entries, 'AccentColor.colorset'] }).length > 0);
  expect('(r) catches a second picture in the set', rCat({ ...catalogOk, setEntries: [...catalogOk.setEntries, 'AppIcon-dark.png'] }).length > 0);
  expect('(r) catches a dark appearance named in the set', rCat({ ...catalogOk, setContents: { ...setOk, images: [...setOk.images, { appearances: [{ appearance: 'luminosity', value: 'dark' }], idiom: 'universal', platform: 'ios', size: '1024x1024' }] } }).length > 0);
  expect('(r) catches the set naming another file', rCat({ ...catalogOk, setContents: { ...setOk, images: [{ ...setOk.images[0], filename: 'Other.png' }] } }).length > 0);
  expect('(r) catches a configuration that names no icon', rCat(catalogOk, pbxApp(iconSettings, '        ASSETCATALOG_COMPILER_GENERATE_ASSET_SYMBOLS = NO;\n')).length > 0);
  expect('(r) catches asset symbols generated into the app', rCat(catalogOk, pbxApp(iconSettings, '        ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;\n')).length > 0);
  expect('(r) catches alternate icons', rCat(catalogOk, `${pbxApp(iconSettings, iconSettings)}ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = "Other";\n`).length > 0);
  expect('(r) catches an xcconfig naming another icon', rCat(catalogOk, pbxApp(iconSettings, iconSettings), [{ name: 'X.xcconfig', text: 'ASSETCATALOG_COMPILER_APPICON_NAME = Other\n' }]).length > 0);

  // (s) Signing and identity: a project of an app and a test target, each
  // with Debug and Release, and the project's own two.
  const conf = (id, name, body) => `    ${id} /* ${name} */ = {\n      isa = XCBuildConfiguration;\n      buildSettings = {\n${body}      };\n      name = ${name};\n    };`;
  const adHoc = '        CODE_SIGN_IDENTITY = "-";\n        CODE_SIGN_STYLE = Manual;\n        DEVELOPMENT_TEAM = "";\n';
  const identity = '        CURRENT_PROJECT_VERSION = 1;\n        MARKETING_VERSION = 1.0.0;\n        PRODUCT_BUNDLE_IDENTIFIER = com.itavero.tortie.phone;\n';
  const his = `        CODE_SIGN_IDENTITY = "Apple Development";\n        CODE_SIGN_STYLE = Automatic;\n        DEVELOPMENT_TEAM = ${RELEASE_TEAM};\n`;
  const list = (id, kind, owner, a, b) => `    ${id} /* Build configuration list for ${kind} "${owner}" */ = {\n      isa = XCConfigurationList;\n      buildConfigurations = (\n        ${a} /* Debug */,\n        ${b} /* Release */,\n      );\n    };`;
  const pbxSign = ({ appDebug = adHoc + identity, appRelease = his + identity, testRelease = adHoc, projectRelease = adHoc, tail = '' } = {}) =>
    [
      '    BBBB00000001 /* Tortie */ = {',
      '      isa = PBXNativeTarget;',
      '      buildConfigurationList = BBBB00000002 /* Build configuration list for PBXNativeTarget "Tortie" */;',
      '      productType = "com.apple.product-type.application";',
      '    };',
      '    BBBB00000009 /* TortieTests */ = {',
      '      isa = PBXNativeTarget;',
      '      buildConfigurationList = BBBB0000000A /* Build configuration list for PBXNativeTarget "TortieTests" */;',
      '      productType = "com.apple.product-type.bundle.unit-test";',
      '    };',
      list('BBBB00000002', 'PBXNativeTarget', 'Tortie', 'BBBB00000003', 'BBBB00000004'),
      list('BBBB0000000A', 'PBXNativeTarget', 'TortieTests', 'BBBB0000000B', 'BBBB0000000C'),
      list('BBBB00000010', 'PBXProject', 'Tortie', 'BBBB00000011', 'BBBB00000012'),
      conf('BBBB00000003', 'Debug', appDebug),
      conf('BBBB00000004', 'Release', appRelease),
      conf('BBBB0000000B', 'Debug', adHoc),
      conf('BBBB0000000C', 'Release', testRelease),
      conf('BBBB00000011', 'Debug', adHoc),
      conf('BBBB00000012', 'Release', projectRelease),
      tail
    ].join('\n');
  const plistOk = { CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)', CFBundleShortVersionString: '$(MARKETING_VERSION)', CFBundleVersion: '$(CURRENT_PROJECT_VERSION)', CFBundleDisplayName: 'Tortie' };
  const sRun = (pbx, xc = [], pl = plistOk) => ruleSigning(pbx, xc, pl).findings;
  expect('(s) finds every configuration and whose it is', allConfigurations(pbxSign()).map((c) => `${c.owner}:${c.name}`).join() === 'Tortie:Debug,Tortie:Release,TortieTests:Debug,TortieTests:Release,the project:Debug,the project:Release');
  expect('(s) accepts his team once, in the app\'s Release, and ad hoc everywhere else', sRun(pbxSign()).length === 0);
  expect('(s) catches his team in Debug', sRun(pbxSign({ appDebug: his + identity })).length > 0);
  expect('(s) catches a second team on another target', sRun(pbxSign({ testRelease: `        DEVELOPMENT_TEAM = ${RELEASE_TEAM};\n` })).length > 0);
  expect('(s) catches another team in Release', sRun(pbxSign({ appRelease: his.replace(RELEASE_TEAM, 'ABCDE12345') + identity })).length > 0);
  expect('(s) catches no team in Release', sRun(pbxSign({ appRelease: adHoc + identity })).length > 0);
  expect('(s) catches Release signed by hand', sRun(pbxSign({ appRelease: his.replace('Automatic', 'Manual') + identity })).length > 0);
  expect('(s) catches a distribution identity written into Release', sRun(pbxSign({ appRelease: his.replace('Apple Development', 'Apple Distribution') + identity })).length > 0);
  expect('(s) catches a conditional identity beside the plain one', sRun(pbxSign({ appRelease: `${his}        "CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "iPhone Distribution";\n${identity}` })).length > 0);
  expect('(s) catches a profile named', sRun(pbxSign({ appRelease: `${his}        PROVISIONING_PROFILE_SPECIFIER = "Tortie App Store";\n${identity}` })).length > 0);
  expect('(s) accepts an empty profile specifier, which Xcode writes', sRun(pbxSign({ appRelease: `${his}        PROVISIONING_PROFILE_SPECIFIER = "";\n${identity}` })).length === 0);
  expect('(s) catches a team set by an xcconfig', sRun(pbxSign(), [{ name: 'S.xcconfig', text: `DEVELOPMENT_TEAM = ${RELEASE_TEAM}\n` }]).length > 0);
  expect('(s) leaves an xcconfig comment alone', sRun(pbxSign(), [{ name: 'S.xcconfig', text: `// DEVELOPMENT_TEAM = ${RELEASE_TEAM}\n` }]).length === 0);
  expect('(s) catches another bundle id', sRun(pbxSign({ appRelease: his + identity.replace('com.itavero.tortie.phone;', 'com.itavero.tortie.phone2;') })).length > 0);
  expect('(s) catches versions that disagree', sRun(pbxSign({ appRelease: his + identity.replace('CURRENT_PROJECT_VERSION = 1;', 'CURRENT_PROJECT_VERSION = 2;') })).length > 0);
  expect('(s) catches a marketing version that is not three numbers', sRun(pbxSign({ appDebug: adHoc + identity.replace('1.0.0', '1.0'), appRelease: his + identity.replace('1.0.0', '1.0') })).length > 0);
  expect('(s) catches a Debug configuration signed with an identity', sRun(pbxSign({ projectRelease: adHoc }).replace(/(BBBB00000011 \/\* Debug \*\/ = \{[\s\S]*?)CODE_SIGN_IDENTITY = "-";/, '$1CODE_SIGN_IDENTITY = "Apple Development";')).length > 0);
  expect('(s) catches a display name that is not Tortie', sRun(pbxSign(), [], { ...plistOk, CFBundleDisplayName: 'gmux' }).length > 0);
  expect('(s) catches a bundle id written into Info.plist', sRun(pbxSign(), [], { ...plistOk, CFBundleIdentifier: 'com.itavero.tortie.phone' }).length > 0);
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
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's']) record(id, 'the app', [`${rel(IOS)} does not exist, so there is no app to read`], '');
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
    const builders = existsSync(DOOR_CLIENT) ? configurationFunctions(read(DOOR_CLIENT)) : [];
    for (const p of appSwift) {
      if (p !== DOOR_CLIENT && p !== NODE) f.push(...ruleNetworkOnlyInClient(rel(p), read(p)));
      if (p !== DOOR_CLIENT) f.push(...ruleSendsOnlyFromClient(rel(p), read(p)));
      f.push(...ruleHttpsOnly(rel(p), read(p), p === DOOR_CLIENT ? 'client' : p === NODE ? 'node' : 'other'));
      f.push(...ruleEphemeralOnly(rel(p), read(p), p === DOOR_CLIENT ? 'client' : 'other', builders));
    }
    record(
      'c',
      'the network is DoorClient.swift and the node, https only, and only the client sends',
      f,
      `URLSession, URLRequest, NWConnection, ProxyConfiguration, loopback( and tailscaleSession( only in Door/DoorClient.swift and Tailnet/Node.swift; every request sent from Door/DoorClient.swift, through an .ephemeral configuration and no other: no URLSession.shared, and every configuration: argument .ephemeral or the client's own builder (${builders.join(', ') || 'none'})`
    );
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
    let lists = 0;
    let configurations = 0;
    if (f.length === 0) {
      const xcconfigs = allText.filter((q) => q.endsWith('.xcconfig')).map((q) => ({ name: rel(q), text: read(q) }));
      configurations = ruleInfoPlistSource(read(pbx), xcconfigs).said.configurations;
      // EVERY property list under ios/, read by CoreFoundation (the
      // hardening round): Info.plist whole, and every other one for the keys
      // refused anywhere, and each one's spelling.
      for (const p of allText.filter((q) => /\.(?:plist|entitlements|xcprivacy)$/.test(q))) {
        let cf;
        try {
          cf = readPlistFile(p);
        } catch (err) {
          f.push(`${rel(p)} could not be read: ${String(err?.message ?? err)}`);
          continue;
        }
        lists += 1;
        const text = read(p);
        f.push(...rulePlistSpelling(rel(p), text, cf));
        if (p === INFO_PLIST) {
          f.push(...rulePlist(cf, read(pbx), xcconfigs));
          continue;
        }
        for (const k of plistKeys(cf)) {
          const why = refusedPlistKey(plistBaseKey(k.key));
          if (why !== null) f.push(`${rel(p)} carries ${k.path}${readAs(k)}; ${why}`);
        }
      }
    }
    record(
      'e',
      'Info.plist has exactly the one ATS exception and no background mode',
      f,
      `NSAppTransportSecurity → NSExceptionDomains → 100.64.0.0/10 → NSExceptionAllowsInsecureHTTPLoads = true, and nothing else; ${String(lists)} property list(s) read by CoreFoundation, every key written plainly; ${String(configurations)} app configuration(s), each built from ${APP_INFO_PLIST} with nothing generated or preprocessed into it`
    );
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
      if (/\bcodeCoverageEnabled\s*=\s*"YES"/.test(t)) f.push(`${rel(s)} turns code coverage on in its test action`);
    }
    for (const p of allText.filter((q) => q.endsWith('.pbxproj') || q.endsWith('.xcconfig'))) {
      const t = p.endsWith('.xcconfig') ? xcconfigBare(read(p)) : read(p);
      for (const m of t.matchAll(/\b(?:CLANG_COVERAGE_MAPPING|CLANG_INSTRUMENT_FOR_OPTIMIZATION_PROFILING|CLANG_ENABLE_CODE_COVERAGE)\s*=\s*"?YES\b|-(?:fprofile-instr-generate|fcoverage-mapping|profile-generate|profile-coverage-mapping)\b/g)) {
        f.push(`${rel(p)}:${String(lineOf(t, m.index))} turns on ${m[0]}, which instruments the build`);
      }
    }
    for (const p of testSwift) f.push(...ruleNoPhotograph(rel(p), read(p)));
    record('i', 'the UI test plan has screenshots off and no build is instrumented', f, `${String(plans.length)} plan(s) with code coverage off, ${String(testSwift.length)} test file(s) read`);
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

  // Phase 316.3. Every Swift file under ios/, named relative to ios/, for
  // (l); the app's own, named relative to the app folder, for (p) as for (k).
  const iosSwift = [...appSwift, ...testSwift].map((p) => ({ name: relative(IOS, p).split(sep).join('/'), source: read(p) }));
  const appFiles = appSwift.map((p) => ({ name: rel(p), source: read(p) }));
  const pbxPath = join(IOS, 'Tortie.xcodeproj', 'project.pbxproj');
  const pbx = existsSync(pbxPath) ? read(pbxPath) : null;

  // (l)
  {
    const r = ruleNodeOnly(iosSwift);
    const f = [...r.findings];
    let phases = 0;
    if (pbx === null) f.push(`${rel(pbxPath)} does not exist, so the framework the node comes from cannot be read`);
    else {
      const v = ruleVendoredFramework(pbx);
      f.push(...v.findings);
      phases = v.said.phases;
    }
    record(
      'l',
      'the node is started only in Tailnet/Node.swift, as tortie-phone, never ephemeral, never in the background',
      f,
      `TailscaleKit imported ${String(r.said.imports)} time(s), only by ${NODE_REL}; ${String(r.said.constructs)} TailscaleNode( construction(s) there, ${String(r.said.privateDecls)} private declaration(s) of its type, ` +
        `${String(r.said.configs)} TailscaleKit Configuration( with ephemeral: false written out, the hostname "${NODE_HOSTNAME}" and no other; the framework from ${VENDORED_XCFRAMEWORK}, signed on copy, ${String(phases)} build phase(s) that only check`
    );
  }
  // (m)
  {
    const r = ruleStateDirectory(rel(NODE), existsSync(NODE) ? read(NODE) : null, appFiles);
    record('m', 'the node\'s state is in Application Support/tailnet and excluded from backup', r.findings, `${String(r.said.creates)} place(s) create the state directory, each excluding it from backup in the same body`);
  }
  // (n)
  {
    const r = ruleKeychain(appFiles);
    record('n', 'every Keychain item is ThisDeviceOnly and never synchronised', r.findings, `${String(r.said.adds)} SecItemAdd call(s); ${String(r.said.thisDevice)} ThisDeviceOnly accessibility value(s) named, and no other`);
  }
  // (o)
  {
    const f = [];
    const said = [];
    // The app's own.
    const appManifests = walk(APP, (n) => n === 'PrivacyInfo.xcprivacy');
    if (appManifests.length === 0) f.push(`${rel(APP)} holds no PrivacyInfo.xcprivacy, so the app's own manifest is missing (SPEC §4 S3 B)`);
    if (appManifests.length > 1) f.push(`${rel(APP)} holds ${String(appManifests.length)} PrivacyInfo.xcprivacy files; the app has one`);
    const uses = requiredCategories(appFiles.map((x) => ({ name: x.name, source: x.source })));
    for (const p of appManifests.slice(0, 1)) {
      try {
        const r = ruleManifest(rel(p), readPlistFile(p), Object.fromEntries([...uses.keys()].map((c) => [c, null])));
        f.push(...r.findings);
        said.push(`${rel(p)} declares ${[...r.declared.keys()].map((c) => c.replace('NSPrivacyAccessedAPICategory', '')).join(', ') || 'no category'}, and the app's own Swift uses ${[...uses.keys()].map((c) => c.replace('NSPrivacyAccessedAPICategory', '')).join(', ') || 'none'}`);
      } catch (err) {
        f.push(`${rel(p)} could not be read: ${String(err?.message ?? err)}`);
      }
    }
    if (pbx !== null && appManifests.length === 1) {
      const synced = /isa\s*=\s*PBXFileSystemSynchronizedRootGroup;[^}]*\bpath\s*=\s*Tortie;/.test(pbx);
      if (synced) {
        for (const m of pbx.matchAll(/membershipExceptions\s*=\s*\(([^)]*)\)/g)) {
          if (/PrivacyInfo\.xcprivacy/.test(m[1])) f.push('project.pbxproj takes PrivacyInfo.xcprivacy out of the app target with a membership exception, so the app would ship without its manifest');
        }
      } else if (!/PrivacyInfo\.xcprivacy in Resources/.test(pbx)) {
        f.push('project.pbxproj copies no PrivacyInfo.xcprivacy into the app, so the app would ship without its manifest');
      }
    }
    // TailscaleKit's: the committed source, then the built product when it is here.
    const source = frameworkManifestSource(ROOT);
    let sourceDeclared = null;
    if (source === null) {
      f.push("TailscaleKit's privacy manifest has no committed source: no .xcprivacy under build/ (outside build/vendor/), no privacy.categories in build/tailscalekit-release.json and no literal plist in build/build-tailscalekit.mjs (SPEC §4 S3 A, §3.6)");
    } else if (source.problem !== undefined) {
      f.push(`${source.label}: ${source.problem}`);
    } else {
      const r = ruleManifest(source.label, source.plist, FRAMEWORK_DECLARES);
      f.push(...r.findings);
      sourceDeclared = r.declared;
      said.push(`${source.label} declares ${[...r.declared].map(([c, rs]) => `${c.replace('NSPrivacyAccessedAPICategory', '')} ${rs.join('/')}`).join(', ')}`);
    }
    const xcframework = join(ROOT, 'build', 'vendor', 'tailscalekit', 'TailscaleKit.xcframework');
    if (!existsSync(xcframework)) said.push('the framework is not built here, so its slices were not read');
    else {
      const slices = frameworkSlices(xcframework);
      if (slices.length === 0) f.push(`${rel(xcframework)} holds no TailscaleKit.framework, so the built product cannot be read; run npm run vendor:tailscalekit again`);
      for (const s of slices) {
        const m = join(s, 'PrivacyInfo.xcprivacy');
        if (!existsSync(m)) {
          f.push(`${rel(s)} has no PrivacyInfo.xcprivacy at its root, and an app carrying it would be refused at upload (ITMS-91053); run npm run vendor:tailscalekit again`);
          continue;
        }
        try {
          const r = ruleManifest(rel(m), readPlistFile(m), FRAMEWORK_DECLARES);
          f.push(...r.findings);
          const flat = (d) => JSON.stringify([...d].map(([c, rs]) => [c, [...rs].sort()]).sort());
          if (sourceDeclared !== null && flat(r.declared) !== flat(sourceDeclared)) f.push(`${rel(m)} declares other categories or reasons than its committed source; run npm run vendor:tailscalekit again`);
        } catch (err) {
          f.push(`${rel(m)} could not be read: ${String(err?.message ?? err)}`);
        }
      }
      said.push(`${String(slices.length)} built slice(s) each holding the same manifest at its root`);
    }
    record('o', 'both privacy manifests exist and declare the categories', f, said.join('; '));
  }
  // (p)
  {
    const files = appSwift.map((p) => ({ name: relative(APP, p).split(sep).join('/'), source: read(p) }));
    const r = ruleTailnetKey(files);
    const f = [...r.findings];
    const scanned = [...allText, ...walk(join(ROOT, 'build', 'p316'), (n) => /\.(mjs|mts|ts|js|json|md|swift|txt)$/.test(n))];
    for (const p of scanned) f.push(...ruleNoRealKey(rel(p), read(p)));
    record(
      'p',
      'the tailnet key is never written anywhere',
      f,
      `${String(r.said.mentions)} mention(s) of the key's name, or of the code that carries it, in the app: ${String(r.said.proved)} proved by their shape (${String(r.said.joins)} of them authKey: in Tailnet/Node.swift), ${String(r.said.named)} named in ${String(KEY_NAMED.length)} entries; ` +
        `${String(r.said.sources)} place(s) a code enters, each bound to a watched name; ${String(r.said.holders)} type(s) holding it, each mirroring itself without it; ` +
        `no encodable type holds it, no key literal in the app, and ${String(scanned.length)} files under ios/ and build/p316/ hold nothing shaped like a real key`
    );
  }
  // (q)
  {
    const scriptPath = join(ROOT, 'build', 'build-tailscalekit.mjs');
    let script = null;
    if (existsSync(scriptPath)) {
      let patch = null;
      try {
        // The ROOT's own script, so a clone the ablation made is judged by its own patch.
        patch = (await import(pathToFileURL(scriptPath).href)).NO_LOGS_PATCH ?? null;
      } catch {
        patch = null;
      }
      script = { text: read(scriptPath), patch };
    }
    const r = ruleLogsOff(rel(NODE), existsSync(NODE) ? read(NODE) : null, appFiles, script);
    const f = [...r.findings];
    const said = [];
    // The built product, when it is here: each slice declares the switch in
    // the header Swift reads and holds it in its binary's symbol table.
    const xcframework = join(ROOT, 'build', 'vendor', 'tailscalekit', 'TailscaleKit.xcframework');
    if (!existsSync(xcframework)) said.push('the framework is not built here, so its slices were not read');
    else {
      const slices = frameworkSlices(xcframework);
      for (const sl of slices) {
        const header = join(sl, 'Headers', 'TailscaleKit.h');
        const binary = join(sl, 'TailscaleKit');
        if (!existsSync(header) || !read(header).includes(`extern int ${NO_LOGS_SWITCH}(void);`)) f.push(`${rel(sl)}'s header does not declare ${NO_LOGS_SWITCH}; run npm run vendor:tailscalekit again`);
        const bytes = existsSync(binary) ? readFileSync(binary) : Buffer.alloc(0);
        for (const symbol of [`_${NO_LOGS_SWITCH}`, '_TsnetNoLogsNoSupport']) {
          if (bytes.indexOf(Buffer.from(`${symbol}\0`)) === -1) f.push(`${rel(binary)} holds no symbol ${symbol}, so it is not the build that turns the logs off; run npm run vendor:tailscalekit again`);
        }
        // (q4) The backend's flow logs refusal, as Node.swift names it, is in
        // the Go the slice was built from, so a pin that rewords it is refused
        // here rather than drawn on his phone as a refused key.
        if (r.said.flowLogsWords !== null && bytes.indexOf(Buffer.from(r.said.flowLogsWords)) === -1) {
          f.push(`${rel(binary)} does not hold the words ${JSON.stringify(r.said.flowLogsWords)} that ${rel(NODE)} reads as the flow logs refusal, so on this build that refusal would read as a refused key`);
        }
      }
      said.push(`${String(slices.length)} built slice(s) declaring it and holding _${NO_LOGS_SWITCH} and _TsnetNoLogsNoSupport${r.said.flowLogsWords === null ? '' : ' and the flow logs refusal\'s words'}`);
    }
    record(
      'q',
      "Tailscale's own diagnostic logs are off before every start",
      f,
      `${NO_LOGS_SWITCH}() asked only by ${r.said.wrappers.join(', ') || 'nothing'}, which checks it answered 0, outside every #if; ${String(r.said.gated)} of ${String(r.said.starts)} node start(s) guarded by it before, in the same block; build/build-tailscalekit.mjs patches it into the pinned source; a tailnet that requires flow logs is its own refusal; ${said.join('; ')}`
    );
  }

  // Phase 316.4. Every xcconfig under ios/, for (r) and (s).
  const xcconfigs = allText.filter((q) => q.endsWith('.xcconfig')).map((q) => ({ name: rel(q), text: read(q) }));
  // (r)
  {
    const f = [];
    let said = '';
    // The ROOT's own derivation, so a clone the ablation made is judged by its own choice of ground.
    const scriptPath = join(ROOT, 'build', 'p316', 'app-icon.mjs');
    let icon = null;
    if (!existsSync(scriptPath)) f.push(`${rel(scriptPath)} does not exist, so nothing says which ground the icon is laid on`);
    else {
      try {
        icon = await import(pathToFileURL(scriptPath).href);
      } catch (err) {
        f.push(`${rel(scriptPath)} cannot be loaded: ${String(err?.message ?? err)}`);
      }
    }
    const iconFile = icon?.ICON_PATH === undefined ? 'AppIcon.png' : icon.ICON_PATH.split('/').pop();
    const catalogDir = join(APP, ICON_CATALOG);
    const setDir = join(catalogDir, ICON_SET);
    const json = (path) => {
      if (!existsSync(path)) return undefined;
      try {
        return JSON.parse(read(path));
      } catch {
        return null;
      }
    };
    const listing = (dir) => (existsSync(dir) ? readdirSync(dir).filter((n) => n !== '.DS_Store').sort() : []);
    const catalog = existsSync(catalogDir)
      ? { entries: listing(catalogDir), rootContents: json(join(catalogDir, 'Contents.json')), setEntries: listing(setDir), setContents: json(join(setDir, 'Contents.json')) }
      : null;
    const c = ruleIconCatalog(catalog, iconFile, pbx, xcconfigs);
    f.push(...c.findings);
    if (icon !== null) {
      const iconPath = join(ROOT, ...icon.ICON_PATH.split('/'));
      const masterPath = join(ROOT, ...icon.ICON_MASTER.split('/'));
      if (!iconPath.startsWith(setDir + sep)) f.push(`${rel(scriptPath)} writes the icon to ${icon.ICON_PATH}, outside ${rel(setDir)}`);
      f.push(...missing(iconPath), ...missing(masterPath), ...missing(TOKENS_CSS));
      if (existsSync(iconPath) && existsSync(masterPath) && existsSync(TOKENS_CSS)) {
        let ground = null;
        try {
          ground = icon.groundOf(read(TOKENS_CSS));
        } catch (err) {
          f.push(String(err?.message ?? err));
        }
        if (ground !== null) {
          f.push(...ruleIconImage(rel(iconPath), readFileSync(iconPath), rel(masterPath), readFileSync(masterPath), ground, icon.ICON_SIDE));
          said = `${rel(iconPath)} is ${rel(masterPath)} laid over ${icon.ICON_GROUND.token} of the ${icon.ICON_GROUND.base} base (#${ground.map((v) => v.toString(16).padStart(2, '0')).join('')}), pixel for pixel, RGB with no alpha channel; `;
        }
      }
    }
    record('r', 'the app icon is the brand master on one opaque ground, with no alpha channel', f, `${said}the catalog holds that icon alone, and ${String(c.said.configurations)} app configuration(s) name it and generate no asset symbols`);
  }
  // (s)
  {
    let plist = null;
    const f = [];
    try {
      plist = existsSync(INFO_PLIST) ? readPlistFile(INFO_PLIST) : null;
    } catch (err) {
      f.push(`${rel(INFO_PLIST)} could not be read: ${String(err?.message ?? err)}`);
    }
    if (plist === null && f.length === 0) f.push(`${rel(INFO_PLIST)} does not exist`);
    const r = ruleSigning(pbx, xcconfigs, plist);
    f.push(...r.findings);
    record(
      's',
      "the Release build is signed by his team alone, and every Debug build by nobody",
      f,
      `DEVELOPMENT_TEAM = ${RELEASE_TEAM} once, in the app's Release configuration, signed automatically as Apple Development with no profile named; ${String(r.said.debug)} Debug configuration(s) ad hoc with no team, of ${String(r.said.configurations)}; the app is ${PHONE_BUNDLE_ID}, one version in Debug and Release, and Info.plist takes all three from the project and shows "Tortie"`
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
  process.stdout.write(`${TAG} FAIL. The phone app breaks a refusal build/p316/SPEC.md §4 S2 or S3 names, or a scanner here stopped working.\n`);
  process.exit(1);
}
process.stdout.write(`${TAG} PASS. ${String(Object.keys(results).length)} rules over ${String(appSwift.length)} app files, ${String(testSwift.length)} test files and ${String(allText.length)} files under ios/; every scanner proved on its own fixtures first.\n`);
