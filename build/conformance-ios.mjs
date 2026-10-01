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
 *   (c) THE ONE NETWORK FILE (Phase 330: an ordinary pinned TLS client over
 *       Network.framework). `NWConnection`, `NWParameters`, `NWEndpoint`,
 *       `NWProtocolTLS`/`TCP`, `sec_protocol_options_*`, `sec_identity_create`
 *       and `import Network` appear only in `Door/DoorClient.swift`; there is
 *       NO `URLSession`, `URLRequest`, `URLSessionConfiguration` or
 *       `ProxyConfiguration` anywhere in the app, nor a lower-level socket
 *       (`CFStream…ToHost`, `getStreamsToHost`, `socket(`); no `http://`
 *       literal exists; and only the door client SENDS (`NWConnection(`,
 *       `.send(content:`, a URL task), because the pin, the identity, the caps
 *       and the timeout are there.
 *   (d) The five DEBUG seams exist and sit inside `#if DEBUG`: the pairing
 *       payload (`-TortieDebugPairingPayload`), the forget
 *       (`-TortieDebugForgetPairing`), the still attention dot
 *       (`-TortieDebugStill`), from Phase 330 the door endpoint
 *       (`-TortieDebugDoorEndpoint`), which takes `127.0.0.1` and nothing else,
 *       and from Phase 316.5 the alert address (`-TortieDebugPushToken`), which
 *       a DEBUG build presents instead of asking Apple for one.
 *       No launch argument is read, no `-TortieDebug…` argument, loopback
 *       literal or `Debug`/`Loopback` declaration is written outside one. The
 *       last clause also holds the client key store's `softwareKeyDebugSeam`
 *       (Phase 330, after his ruling of 2026-09-29), a field a test sets so
 *       the software path runs on a Simulator that has a Secure Enclave; it is
 *       no launch argument, so nothing outside a test can set it.
 *   (e) `Info.plist` has NO `NSAppTransportSecurity` and NO
 *       `NSLocalNetworkUsageDescription` (Phase 330: the client is
 *       Network.framework, which ATS does not govern, and it dials the Mac's
 *       public name and nothing on the local network), by the name CFBundle
 *       folds a key to, in any property list under ios/ and in any
 *       `INFOPLIST_KEY_` setting. Still no `NSAllowsArbitraryLoads` of any
 *       kind, no `UIBackgroundModes`, no Background Modes capability, no
 *       `BGTaskSchedulerPermittedIdentifiers` and no
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
 *   PHASE 316.3 added (l) to (q) for the tailnet node the app carried. PHASE
 *   330 took the node out (build/p330/SPEC.md §6.4): (l), (m) and (q) became
 *   ONE rule (l), (m) and (q) are retired with their fixtures, and (n), (o)
 *   and (p) are read for what the app now holds:
 *
 *   (l) No Tailscale in the phone. No `ios/Tortie/Tailnet` directory; no
 *       Swift file under ios/, app or test, imports TailscaleKit in any
 *       spelling or names `TailscaleKit`, `TailscaleNode` or a `tailscale_`
 *       symbol in its code; nothing is `@_exported`; the project names no
 *       TailscaleKit, no `.xcframework` and no `vendor:tailscalekit`, and no
 *       build phase fetches or builds anything; and nothing keeps the app
 *       running in the background (no background task, no `BGTaskScheduler`,
 *       no `performExpiringActivity`, no background URLSession, no fetch
 *       interval, no Core Location monitoring, which relaunches an app with
 *       no background mode), a clause carried from the old (l) rather than
 *       dropped with the node.
 *   (n) Every Keychain item is `ThisDeviceOnly`, every file that writes one
 *       says so, and nothing is synchronised to his other devices. From Phase
 *       330, the CLIENT KEY (SPEC §4.7.1): made by `SecKeyCreateRandomKey`,
 *       permanent and tagged under `tortie.client.`, in the Secure Enclave
 *       only when `SecureEnclave.isAvailable`; and every pairing attempt that
 *       ends without being paired deletes its key by its tag. It is
 *       THISDEVICEONLY BY CONSTRUCTION ON BOTH PATHS (restated after his
 *       ruling of 2026-09-29): the enclave path's access control names
 *       `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` with `.privateKeyUsage`
 *       and is made inside the `if` on `SecureEnclave.isAvailable` and nowhere
 *       else; the software key says `kSecAttrAccessible:
 *       kSecAttrAccessibleWhenUnlockedThisDeviceOnly` itself, in the function
 *       that makes it. The fix round refused an access control with no flags
 *       for a reason that was FALSE, and that clause is gone: a software key
 *       made under one read back `aku`, and the `dk` it was blamed for was the
 *       ENCLAVE key's own attribute, because the Simulator has a Secure
 *       Enclave (the reverify's experiment, iOS 18.3.1 and 26.3.1). The
 *       enclave key reads back the token `com.apple.setoken` and an access
 *       control of `cku`, After First Unlock This Device Only, which he
 *       accepted; `test:ios` holds both paths.
 *   (o) The app's own privacy manifest exists and declares every
 *       required-reason API its Swift names, derived from the text. It is the
 *       bundle's only one: no framework of anybody else's ships.
 *   (p) No tailnet key anywhere: no `tk`, `tailnetKey` or `authKey` in any
 *       Swift under ios/, and no `tskey-` in any file under ios/. THE CODE AND
 *       ITS ONE-SHOT SECRET ARE KEPT NOWHERE: text cannot follow a value (rule
 *       k's lesson), so every mention of `secret`, `ps` or of a name the raw
 *       code travels under (`KEY_NAMES_IN`) is proved by its shape to be a
 *       declaration, a label, a nil test, a comparison with a watched value or
 *       a hand-off into another watched place, or it is NAMED in `KEY_NAMED`
 *       with where it goes; every place a code enters (`CODE_SOURCES`, an
 *       OPEN list) binds it to a watched name; no encodable type holds a
 *       watched field; and every type holding one mirrors itself without it,
 *       so `print`, `dump` and interpolation never repeat it. No file under
 *       ios/ or build/p316/ holds a string shaped like a real Tailscale key.
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
 *       shows "Tortie". Since Phase 316.5 every configuration says build
 *       `PHONE_BUILD` (3), the one this round uploads.
 *
 *   PHASE 330, the phone off the tailnet (build/p330/SPEC.md §6.4):
 *
 *   (t) The client is pinned mutual TLS 1.3 to a public name. Every paired
 *       read presents a local identity (`sec_protocol_options_set_local_identity`,
 *       the signed path passing `door.identity`, which `PairedDoor` holds
 *       non-optional) and `POST /pair` is the one exchange with none; the
 *       verify block compares `DoorPin` to the pin and completes with that
 *       answer, never `true`; TLS 1.3 is the minimum and nothing names an
 *       older version or a maximum; every `NWParameters` is `NWParameters(tls:`;
 *       the code's host is a `.ts.net` name and its port 8443 or 10000, checked
 *       by the parse; the hand-written reader requires one `Content-Length`
 *       and refuses any `Transfer-Encoding`, and the writer writes
 *       `Connection: close`; and build/p316/hostile-door.mjs names the eight
 *       HTTP arms (chunked, no length, two lengths, over 2 MiB, a 20 KiB header,
 *       not HTTP/1.1, early close, a 200 that is not JSON), each ending in a
 *       sentence Copy.swift holds.
 *   (u) No Release configuration defines DEBUG: not in
 *       `SWIFT_ACTIVE_COMPILATION_CONDITIONS`, `OTHER_SWIFT_FLAGS` or
 *       `GCC_PREPROCESSOR_DEFINITIONS`, in the project or any xcconfig, and the
 *       scheme archives Release (316.4's owed item 2: an optimised build hides
 *       the seam's names from `strings`, so a DEBUG Release would ship the
 *       seams with every other gate green; `test:ios --read-app` reads the
 *       built binary for the seams' argument strings).
 *   (v) The phone always draws a sentence (his no-key finding): `DoorWords`'
 *       `pairingSentence` returns a non-optional `String` for every
 *       `PairingFailure` case and `stepSentence` one for every `PairingStep`
 *       case, neither answering nil or an empty string, and `PairingModel`'s
 *       `line` is a non-optional `String` that is never assigned nil or empty.
 *
 *   PHASE 316.5, the alert (build/p3165/SPEC.md §6.4, research 136 §9):
 *
 *   (w) `aps-environment` = `development` is the app's ONLY entitlement, read
 *       by CoreFoundation, named by both app configurations and no other
 *       target; three targets; no `SystemCapabilities` or `com.apple.Push`;
 *       no `remote-notification` anywhere under ios/; and the topic and team
 *       the Mac signs alerts for (src/main/alerts/key-file.ts) are the app's.
 *   (x) The alert's refusals: `registerForRemoteNotifications` once, in the
 *       `#else` of `#if DEBUG` in Alerts/SystemAlerts.swift; one question; the
 *       notification center named in that file and App/AppDelegate.swift
 *       alone; `userInfo` read by `AlertTap.parse` alone; the environment
 *       `.development` under DEBUG and `.production` in its `#else`; `apt` and
 *       `ape` declared by the presentation and its record alone; no badge
 *       write, service extension, background delivery, print or log; no test
 *       naming the registration; and iOS asked about alerts only for a Mac
 *       that says it can send (the pairing's pending arm, behind its word; the
 *       screen's closure; the launch check behind a guard on `macSends`).
 *
 * Every rule also proves its own scanner on texts it holds, before it reads a
 * file, so a scanner that stopped finding is never taken for a clean tree.
 *
 * WHAT IT REFUSES TO DO. It spawns only the pinned tsx, through
 * build/p316/vectors.mjs, for (j), and /usr/bin/plutil, which every Mac has,
 * to read a property list (e, o, s). It decodes the icon and the master in
 * node (r). It needs no Xcode, starts no Simulator, opens no socket and reads
 * nothing under the person's home.
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
const PAIRING = APP_FILE('Door/Pairing.swift');
const KEYS = APP_FILE('Door/Keys.swift');
const DOOR_WORDS = APP_FILE('Screens/DoorWords.swift');
const PAIRING_SCREEN = APP_FILE('Screens/PairingScreen.swift');
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

/**
 * Rule (c). The network types, which only the door client may name: since
 * Phase 330 it is Network.framework, so its types and the TLS options it sets.
 * A lower-level socket or stream opened anywhere else would be a second network
 * user with no pin, no identity and no caps.
 */
const NETWORK_TOKENS = [
  /\bNWConnection\b/,
  /\bNWParameters\b/,
  /\bNWEndpoint\b/,
  /\bNWProtocol(?:TLS|TCP|UDP|QUIC|WebSocket|Framer)\b/,
  /\bNWListener\b/,
  /\bNWBrowser\b/,
  /\bsec_protocol_options_\w+/,
  /\bsec_identity_create\b/,
  /\bimport\s+(?:(?:struct|class|enum|protocol|typealias|func|let|var|actor)\s+)?`?Network`?(?![A-Za-z0-9_])/,
  /\bCFStreamCreatePairWithSocketToHost\b/,
  /\bgetStreamsToHost\b/,
  /\bstreamTask\s*\(/,
  /(?<![A-Za-z0-9_.])socket\s*\(\s*(?:AF_|PF_|Int32\s*\()/
];

/**
 * Rule (c). The URL loading system, which NO app file may name (Phase 330:
 * the door client is Network.framework, and the ephemeral-configuration rules
 * 316.3 wrote for URLSession are this one refusal now).
 */
const URL_LOADING = [/\bURLSession\b/, /\bURLSessionConfiguration\b/, /\bURLRequest\b/, /\bProxyConfiguration\b/, /\bURLCredential\b/];

/** Rule (c), over one app file that is not the door client: no network type. */
export function ruleNetworkOnlyInClient(name, source) {
  const { bare } = lexSwift(source);
  const findings = [];
  for (const re of NETWORK_TOKENS) {
    for (const m of bare.matchAll(new RegExp(re.source, 'g'))) {
      findings.push(`${name}:${String(lineOf(bare, m.index))} names ${m[0].trim().replace(/\s*\($/, '(')}, and only Door/DoorClient.swift may`);
    }
  }
  return findings;
}

/** Rule (c), over every app file, the door client included: no URL loading at all. */
export function ruleNoUrlLoading(name, source) {
  const { bare } = lexSwift(source);
  const findings = [];
  for (const re of URL_LOADING) {
    for (const m of bare.matchAll(new RegExp(re.source, 'g'))) {
      findings.push(`${name}:${String(lineOf(bare, m.index))} names ${m[0]}; the door client is Network.framework with its own pin and identity, and nothing in the app uses the URL loading system (Phase 330)`);
    }
  }
  return findings;
}

/**
 * What SENDS a request. A request made anywhere but the door client would skip
 * the pin, the identity, the 2 MiB cap and the 15 s timeout.
 */
const SENDS = [
  /\.\s*data\s*\(\s*(?:for|from)\s*:/,
  /\.\s*(?:dataTask|uploadTask|downloadTask|streamTask|webSocketTask)\s*\(/,
  /\.\s*(?:upload|download|bytes)\s*\(\s*(?:for|from|with)\s*:/,
  /\bNWConnection\s*\(/,
  /\.\s*send\s*\(\s*content\s*:/
];

/** Rule (c), over one app file that is not the door client: it sends nothing. */
export function ruleSendsOnlyFromClient(name, source) {
  const { bare } = lexSwift(source);
  const findings = [];
  for (const re of SENDS) {
    for (const m of bare.matchAll(new RegExp(re.source, 'g'))) {
      findings.push(`${name}:${String(lineOf(bare, m.index))} sends a request itself (${m[0].replace(/\s+/g, '')}); only Door/DoorClient.swift sends, with the pin, the identity, the cap and the timeout`);
    }
  }
  return findings;
}

/** Rule (c), the scheme half, over every app file: no plain-text scheme is written. */
export function ruleHttpsOnly(name, source) {
  const { bare, strings } = lexSwift(source);
  const findings = [];
  for (const s of strings) {
    if (/^http$/i.test(s.value) || /\bhttp:\/\//i.test(s.value) || /^ws$/i.test(s.value) || /\bws:\/\//i.test(s.value)) {
      findings.push(`${name}:${String(lineOf(bare, s.start))} writes ${JSON.stringify(s.value.slice(0, 40))}; the door is spoken to over TLS 1.3 and nothing else`);
    }
  }
  return findings;
}

const LAUNCH_READS = [/\bProcessInfo\s*\.\s*processInfo\s*\.\s*(arguments|environment)\b/, /\bCommandLine\s*\.\s*(arguments|unsafeArgv|argc)\b/, /\blaunchArguments\b/];

/** The five DEBUG seams' launch arguments (Phase 330 added the door endpoint, Phase 316.5 the alert address). */
export const DEBUG_SEAM_ARGUMENTS = ['-TortieDebugPairingPayload', '-TortieDebugForgetPairing', '-TortieDebugStill', '-TortieDebugDoorEndpoint', '-TortieDebugPushToken'];

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
    if (/(^|[^0-9])127\.0\.0\.1\b|\blocalhost\b|^::1$|\b0\.0\.0\.0\b/.test(s.value)) {
      if (at(s.start)) (seams.loopback ??= []).push({ name, value: s.value });
      else findings.push(`${name}:${String(lineOf(bare, s.start))} writes the loopback address ${JSON.stringify(s.value)} outside #if DEBUG`);
    }
    // A seam's argument is a DEBUG build's alone: written outside #if DEBUG,
    // a Release build would carry the name a launch could hand it.
    if (/^-TortieDebug/.test(s.value)) {
      if (at(s.start)) (seams.arguments ??= []).push({ name, value: s.value, line: lineOf(bare, s.start) });
      else findings.push(`${name}:${String(lineOf(bare, s.start))} writes the DEBUG seam argument ${JSON.stringify(s.value)} outside #if DEBUG`);
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

/**
 * The keys rule (e) pins exactly; a modified spelling of one would stand
 * beside the pinned value, unread. Since Phase 330 none: the two it pinned
 * (the ATS dictionary and the local network string) are refused outright, by
 * the name CFBundle reads, which refuses every spelling of them.
 */
const PINNED_PLIST_KEYS = new Set([]);

/** What CFBundle reads a key as, said after its path when that is not its spelling. */
const readAs = (k) => (plistBaseKey(k.key) === k.key ? '' : ` (read as ${plistBaseKey(k.key)} at run time)`);

/**
 * Why a key, by the name CFBundle reads it as, is refused wherever it is
 * written, or null. The list rule (e) holds in Info.plist, in every other
 * property list under ios/, and in every `INFOPLIST_KEY_` build setting.
 */
export function refusedPlistKey(base) {
  if (base === 'NSAppTransportSecurity') return 'the door client is Network.framework over TLS 1.3 with its own pin, which App Transport Security does not govern, so there is nothing for an exception to allow (Phase 330, research 132 §9 condition 8)';
  if (base === 'NSExceptionDomains') return 'an App Transport Security exception belongs to a dictionary the app does not carry (Phase 330)';
  if (base === 'NSLocalNetworkUsageDescription') return 'the phone dials the Mac\'s public name and nothing on the network it is on, so iOS has nothing to ask (Phase 330)';
  if (/^NSAllowsArbitraryLoads/.test(base)) return 'NSAllowsArbitraryLoads stays refused (SPEC §3.2)';
  if (base === 'UIBackgroundModes') return 'the app has no background mode, ever (SPEC §4.0, §7)';
  if (base === 'BGTaskSchedulerPermittedIdentifiers') return 'the app reads while it is on the screen, and nothing is scheduled to run it in the background (guideline 2.5.4)';
  if (base === 'NSAllowsLocalNetworking') return 'ATS already allows loopback and nothing else local is dialled';
  if (base === 'ITSAppUsesNonExemptEncryption') return 'the export-compliance answer is a legal one and his (SPEC §6 decision 7), so no agent writes it';
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
      const why = refusedPlistKey(base) ?? (PINNED_PLIST_KEYS.has(base) ? 'rule (e) pins it in Info.plist' : null);
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
  if (plist === null || typeof plist !== 'object' || Array.isArray(plist)) return ['Info.plist is not a dictionary'];
  for (const k of plistKeys(plist)) {
    // Compared by the name CFBundle reads, never by the spelling, so
    // `NSAppTransportSecurity~iphone` is the ATS dictionary on an iPhone.
    const base = plistBaseKey(k.key);
    const at = `${k.path}${readAs(k)}`;
    const why = refusedPlistKey(base);
    if (why !== null) findings.push(`Info.plist carries ${at}; ${why}`);
    if (base !== k.key && PINNED_PLIST_KEYS.has(base)) {
      findings.push(`Info.plist carries ${at}; a platform or device spelling of a key this rule pins would be read in place of the one it checked`);
    }
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
    for (const m of bare.matchAll(new RegExp(re.source, 'g'))) findings.push(`${name}:${String(lineOf(bare, m.index))} names ${m[0]}; the phone is an ordinary TLS client, never a VPN (research 128 §3)`);
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
  { file: 'Door/Contract.swift', line: 'turns = turns.filter { $0.index < first.index } + page.turns', ops: 1, why: 'an ARRAY of turns joined to a page of them; the indexes inside are compared, never added' },
  { file: 'Door/Contract.swift', line: 'turns = page.turns + turns', ops: 1, why: 'an ARRAY of turns joined to the ones held' },
  { file: 'Screens/ListScreen.swift', line: 'for row in answer.rows + answer.others where !seen.insert(row.sessionId).inserted {', ops: 1, why: 'two ARRAYS of rows joined to look for a session listed twice' },
  { file: 'Screens/ListScreen.swift', line: 'RowView(row: row, last: endsList && offset == rows.count - 1) { open(row) }', ops: 1, why: 'the count of an array the phone holds, less one, compared with an offset into it; never a door number' },
  { file: 'Door/DoorClient.swift', line: 'queue.asyncAfter(deadline: .now() + timeout, execute: timer)', ops: 1, why: 'the phone\'s own clock, a DispatchTime, plus its own 15 s TimeInterval: the whole exchange\'s deadline, never a door number' },
  { file: 'Door/Pairing.swift', line: 'date.timeIntervalSince1970 * 1000 < expiresAt', ops: 1, why: 'the phone\'s own clock, a Double, in milliseconds' },
  { file: 'Door/Pairing.swift', line: 'pairedAt: (now().timeIntervalSince1970 * 1000).rounded(.down),', ops: 1, why: 'the phone\'s own clock, a Double, in milliseconds' },
  { file: 'Door/Pairing.swift', line: 'guard out.utf16.count + String(character).utf16.count <= labelMaxUTF16 else { break }', ops: 1, why: 'the length of the label this phone is composing, checked against its 64 before a character is added' },
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
// Rule (l): no Tailscale in the phone (Phase 330; (l), (m) and (q) of 316.3)
// ---------------------------------------------------------------------------
//
// Phase 316.3 carried a tailnet node inside the app, and rules (l), (m) and (q)
// held the one file that could start it, its state directory and its logs.
// Phase 330 took it out: the phone reaches the Mac's public name as an
// ordinary pinned TLS client. So the three became this one, which holds that
// the node stays out, and the background clause of the old (l), which is about
// the app and not the node, is carried rather than dropped with it.

/** Where the node lived, relative to the app folder. It is not there now. */
export const TAILNET_DIR = 'Tailnet';

// The module in backticks too (the hardening round: backticks are how Swift
// escapes any identifier).
const IMPORT_TAILSCALEKIT = /(?:^|[^\w.])import\s+(?:(?:struct|class|enum|protocol|typealias|func|let|var|actor)\s+)?`?TailscaleKit(?![A-Za-z0-9_])/g;
/** A Tailscale name in Swift code: the framework, its node, or a C symbol of libtailscale. */
const TAILSCALE_NAMES = /\bTailscaleKit\b|\bTailscaleNode\b|\btailscale_\w+|\bTsnet\w+/g;
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

/**
 * Rule (l), over every Swift file under ios/ (`{ name, source }`, names
 * relative to ios/, so app files start `Tortie/`), the project's text (or
 * null), every xcconfig and whether the app folder still holds `Tailnet/`.
 */
export function ruleNoTailscale(files, pbxproj, xcconfigs = [], tailnetDirExists = false) {
  const findings = [];
  const said = { files: files.length, phases: 0 };
  if (tailnetDirExists) findings.push(`ios/Tortie/${TAILNET_DIR}/ exists; the phone carries no tailnet node since Phase 330, and the folder it lived in is gone`);
  for (const f of files) {
    const { bare } = lexSwift(f.source);
    const at = (m) => `ios/${f.name}:${String(lineOf(bare, m.index))}`;
    const isApp = f.name.startsWith('Tortie/');
    if (f.name.startsWith(`Tortie/${TAILNET_DIR}/`)) findings.push(`ios/${f.name} is in ${TAILNET_DIR}/, which the phone no longer has`);
    for (const m of bare.matchAll(/@_exported\b/g)) {
      findings.push(`${at(m)} re-exports a module with @_exported, which would carry another module's names into files that never import it`);
    }
    for (const m of bare.matchAll(IMPORT_TAILSCALEKIT)) {
      findings.push(`${at(m)} imports TailscaleKit; the phone joins no tailnet and carries no Tailscale (Phase 330)`);
    }
    for (const m of bare.matchAll(TAILSCALE_NAMES)) {
      findings.push(`${at(m)} names ${m[0]}; the phone joins no tailnet and carries no Tailscale (Phase 330)`);
    }
    if (isApp) {
      for (const re of BACKGROUND_KEEPALIVE) {
        for (const m of bare.matchAll(new RegExp(re.source, 'g'))) {
          findings.push(`${at(m)} names ${m[0].replace(/\s+/g, ' ')}; the app reads while it is on the screen and nothing keeps it running in the background (guideline 2.5.4)`);
        }
      }
    }
  }
  const sources = [...(typeof pbxproj === 'string' ? [{ name: 'project.pbxproj', text: pbxproj }] : []), ...xcconfigs.map((x) => ({ name: x.name, text: xcconfigBare(x.text) }))];
  for (const src of sources) {
    for (const m of src.text.matchAll(/TailscaleKit|\.xcframework\b|vendor:tailscalekit|build\/vendor\//g)) {
      findings.push(`${src.name}:${String(lineOf(src.text, m.index))} names ${m[0]}; the phone carries no framework of Tailscale's and no vendored build (Phase 330)`);
    }
  }
  if (typeof pbxproj === 'string') {
    const scripts = [...pbxproj.matchAll(/\bshellScript\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/g)].map((m) => unescapePbx(m[1]));
    said.phases = scripts.length;
    for (const script of scripts) {
      const bad = BUILDS_OR_FETCHES.exec(shellCommands(script));
      if (bad !== null) findings.push(`a shell build phase in project.pbxproj runs ${bad[1]}; no build phase fetches or builds anything`);
    }
  }
  return { findings, said };
}

// ---------------------------------------------------------------------------
// Rule (n): the Keychain, and the client key (Phase 330)
// ---------------------------------------------------------------------------

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
 * Does the `{` that most closely holds `at` open an `if` whose condition reads
 * `SecureEnclave.isAvailable`, directly or through the name `guardName` it was
 * bound to, and does not negate it? Only the condition after the block's own
 * `if` is read, so a binding earlier in the function never stands in for it.
 */
function insideEnclaveIf(bare, at, guardName) {
  let opener = innermostOpener(bare, at);
  while (opener !== -1 && bare[opener] !== '{') opener = innermostOpener(bare, opener);
  if (opener === -1) return false;
  let h = opener - 1;
  while (h >= 0 && !';{}'.includes(bare[h])) h -= 1;
  const head = bare.slice(h + 1, opener);
  const ifAt = head.search(/\bif\b(?![\s\S]*\bif\b)/);
  if (ifAt === -1) return false;
  const condition = head.slice(ifAt + 2);
  const names = ['SecureEnclave\\s*\\.\\s*isAvailable\\b', ...(guardName === undefined ? [] : [`\\b${guardName}\\b`])];
  const reads = names.some((n) => new RegExp(n).test(condition));
  const negates = names.some((n) => new RegExp(`!\\s*\\(?\\s*${n}`).test(condition));
  return reads && !negates;
}

/**
 * Rule (n), the client key (build/p330/SPEC.md §4.7.1), over the files that
 * make one (`SecKeyCreateRandomKey`) and the pairing flow's source. The key is
 * permanent and tagged under `tortie.client.`; it is ThisDeviceOnly BY
 * CONSTRUCTION ON BOTH PATHS (his ruling of 2026-09-29): the enclave path's
 * access control is ThisDeviceOnly with `.privateKeyUsage` and is made inside
 * the `if` on `SecureEnclave.isAvailable` alone, and the software key says its
 * own accessibility; the Secure Enclave is asked for only when
 * `SecureEnclave.isAvailable`; and every attempt that ends without being
 * paired deletes its key by its tag.
 */
export function ruleClientKey(files, pairingName, pairingSource) {
  const findings = [];
  const said = { makers: 0 };
  for (const f of files) {
    const { bare, strings } = lexSwift(f.source);
    const makes = [...bare.matchAll(/\bSecKeyCreateRandomKey\s*\(/g)];
    if (makes.length === 0) continue;
    said.makers += 1;
    const at = (i) => `${f.name}:${String(lineOf(bare, i))}`;
    const guardName = /\blet\s+([A-Za-z_]\w*)\s*=\s*SecureEnclave\s*\.\s*isAvailable\b/.exec(bare)?.[1];
    const access = [...bare.matchAll(/\bSecAccessControlCreateWithFlags\s*\(/g)];
    if (access.length === 0) findings.push(`${at(makes[0].index)} makes a key with no SecAccessControlCreateWithFlags, so nothing says it is ThisDeviceOnly or that the enclave may only use it`);
    for (const a of access) {
      const close = closeParen(bare, a.index + a[0].length - 1);
      const call = bare.slice(a.index, close === -1 ? bare.length : close + 1);
      if (!/\bkSecAttrAccessibleWhenUnlockedThisDeviceOnly\b/.test(call)) findings.push(`${at(a.index)} makes an access control that is not kSecAttrAccessibleWhenUnlockedThisDeviceOnly`);
      if (!/\.\s*privateKeyUsage\b/.test(call)) findings.push(`${at(a.index)} makes an access control without .privateKeyUsage for the Secure Enclave path`);
      // THE ACCESS CONTROL IS THE ENCLAVE PATH'S ALONE (restated after his
      // ruling of 2026-09-29). Each path names its ThisDeviceOnly once: the
      // enclave key's is this access control (read back `cku` on the
      // Simulator's enclave, which he accepted), the software key's is its own
      // kSecAttrAccessible (read back `aku`). An access control made where the
      // software path also reaches it, which is the shape before the fix round
      // (`enclave ? .privateKeyUsage : []`), puts the software key's class in a
      // second place. It was NOT a leak: a software key under a flag-less
      // access control read back `aku` too (the reverify's experiment); the
      // `dk` once blamed on it was the enclave key's own attribute.
      if (!insideEnclaveIf(bare, a.index, guardName)) findings.push(`${at(a.index)} makes an access control outside the if on SecureEnclave.isAvailable; the access control is the enclave path's alone and the software key says its own accessibility, so each path names its ThisDeviceOnly once (build/p330/SPEC.md §4.7.1)`);
    }
    // THE SOFTWARE PATH SAYS ITS ACCESSIBILITY ITSELF, in the function that
    // makes the key (the certificate's own add elsewhere in the file does not
    // count for it).
    const maker = bare.slice(0, makes[0].index).lastIndexOf('func ');
    const makerBody = maker === -1 ? '' : bodyAfter(bare, maker);
    if (!/\bkSecAttrAccessible\s+as\s+String\s*(?:\]\s*=|:)\s*kSecAttrAccessibleWhenUnlockedThisDeviceOnly\b/.test(makerBody)) {
      findings.push(`${at(makes[0].index)} makes a client key whose software path does not say kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly, so a phone with no Secure Enclave keeps a key that is not this device's only`);
    }
    if (!/\bkSecAttrIsPermanent\b[^,\n]*\btrue\b/.test(bare)) findings.push(`${at(makes[0].index)} makes a client key that is not kSecAttrIsPermanent: true, so no identity can be made of it`);
    if (!/\bkSecAttrApplicationTag\b/.test(bare)) findings.push(`${at(makes[0].index)} makes a client key with no kSecAttrApplicationTag, so it cannot be deleted by its tag`);
    if (!strings.some((s) => s.value === 'tortie.client.')) findings.push(`${f.name} never names the client key tag prefix "tortie.client."`);
    const enclave = [...bare.matchAll(/\bkSecAttrTokenIDSecureEnclave\b/g)];
    if (enclave.length === 0) findings.push(`${at(makes[0].index)} never asks for the Secure Enclave, so a device that has one keeps its client key in software`);
    if (!/\bSecureEnclave\s*\.\s*isAvailable\b/.test(bare)) findings.push(`${at(makes[0].index)} asks for the Secure Enclave without asking SecureEnclave.isAvailable`);
    for (const e of enclave) {
      // The enclave token is set inside an `if` whose condition was read from
      // SecureEnclave.isAvailable (by name or directly).
      if (!insideEnclaveIf(bare, e.index, guardName)) findings.push(`${at(e.index)} sets kSecAttrTokenIDSecureEnclave outside an if on SecureEnclave.isAvailable`);
    }
  }
  if (said.makers === 0) findings.push('no app file makes a client key (SecKeyCreateRandomKey), so the phone has nothing to present (Phase 330)');
  if (pairingSource === null) findings.push(`${pairingName} does not exist, so nothing deletes a client key an attempt made`);
  else {
    const { bare } = lexSwift(pairingSource);
    const run = /\bfunc\s+run\s*\(/.exec(bare);
    const body = run === null ? '' : bodyAfter(bare, run.index);
    if (!/\bif\s+case\s+\.failed\s*=\s*\w+\s*\{\s*[\w.]*clientKeys\s*\.\s*delete\s*\(\s*tag\s*:/.test(body)) {
      findings.push(`${pairingName}'s run(_:) does not delete the attempt's client key by its tag on every ending that is not paired`);
    }
  }
  return { findings, said };
}

// ---------------------------------------------------------------------------
// Rule (o): the app's own privacy manifest
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Rule (p): no tailnet key, and the code and its one-shot secret kept nowhere
// ---------------------------------------------------------------------------

/** A tailnet key's names (Phases 316.3 and 316.4). None may appear under ios/ now. */
const TAILNET_KEY_NAMES = /(?<![A-Za-z0-9_$])(?:tailnetKey|tk|authKey)(?![A-Za-z0-9_$])/g;

/** The one-shot secret's names: the QR's `ps` and the offer's `secret`. */
const KEY_NAMES = ['secret', 'ps'];
const KEY_ALT = KEY_NAMES.join('|');

/**
 * THE NAMED ONES for rule (p): every mention of the one-shot secret, or of the
 * raw code that carries it, whose shape does not prove it goes nowhere. Same
 * shape as ARITHMETIC_NAMED: `line` is the line with its comments removed,
 * trimmed and its spaces collapsed; `uses` how many mentions on such lines in
 * that file the entry covers; `why` where it goes from there.
 */
export const KEY_NAMED = [
  // The raw code: each hand-off from one watched name to another, and the
  // parse that reads it.
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
    why: "the parse decodes the code into Wire, which holds `ps` for the checks below it, is never Encodable, and mirrors itself without it (rule p's holders); the secret leaves Wire only as the offer's `secret`"
  },
  // The one-shot secret: decoded, measured, and handed to the two derivations
  // that are its only readers.
  {
    file: 'Door/Pairing.swift',
    line: 'let secret = Base64URL.decode(wire.ps), (16...64).contains(secret.count),',
    uses: 2,
    why: "the parse decodes `ps` into the offer's `secret` (bound on the same line, a declaration) and measures it: a count, nothing kept"
  },
  {
    file: 'Door/Pairing.swift',
    line: 'inputKeyMaterial: SymmetricKey(data: secret),',
    uses: 2,
    why: "the secret's two readers, HKDF-SHA256 for the seal key and for the window's challenge; each derived value lives in the call and is never kept"
  }
];

/**
 * The files where the raw code travels under another name, and that name.
 * Text cannot follow a value from a caller into a callee, so a hand-off into
 * one of these files is NAMED above, and inside them the parameter is held to
 * every clause the secret's own names are.
 *
 * THE RAW CODE CARRIES THE ONE-SHOT SECRET (`ps`), so every name the code
 * travels under before it is parsed is watched here, WHOLE: `payload.utf8` is
 * the code, not a field of it. Where the code enters is CODE_SOURCES, and each
 * one must be bound to a watched name in the statement that reads it, so the
 * set is closed: a code can leave a watched name only by a shape the rule
 * proves or a NAMED line.
 */
export const KEY_NAMES_IN = {
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

/** What one mention of a watched name does, or null when its text does not prove it goes nowhere. */
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
  if (new RegExp(`[(,]\\s*(?:${alt})\\s*:\\s*$`).test(head)) return 'handed to a watched place';
  if (new RegExp(`(?:^|[^=!<>+\\-*/%&|^.?\\w])(?:(?:let|var)\\s+)?(?:[A-Za-z_][A-Za-z0-9_]*\\s*\\.\\s*)*(?:${alt})\\s*(?::\\s*[A-Za-z_][A-Za-z0-9_?!.<>\\[\\] ]*)?=\\s*$`).test(head)) {
    return 'bound to a watched place';
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

/** Rule (p), the tailnet key half, over any text file under ios/: no tailnet key's name or shape. */
export function ruleNoTailnetKey(name, text) {
  const findings = [];
  if (name.endsWith('.swift')) {
    const { bare, strings } = lexSwift(text);
    for (const m of bare.matchAll(TAILNET_KEY_NAMES)) findings.push(`${name}:${String(lineOf(bare, m.index))} names ${m[0]}; the phone holds no tailnet key since Phase 330`);
    for (const s of strings) if (/^(?:tk|tailnetKey)$/.test(s.value)) findings.push(`${name}:${String(lineOf(bare, s.start))} writes the field name ${JSON.stringify(s.value)}; the code carries no tailnet key since Phase 330`);
  } else {
    for (const m of text.matchAll(/\btailnetKey\b|"tk"\s*:/g)) findings.push(`${name}:${String(lineOf(text, m.index))} holds ${m[0]}; the code carries no tailnet key since Phase 330`);
  }
  for (const m of text.matchAll(/tskey-/g)) findings.push(`${name}:${String(lineOf(text, m.index))} holds tskey-; no key of Tailscale's is anywhere under ios/ since Phase 330`);
  return findings;
}

/**
 * Rule (p), the secret half, over every app file (`{ name, source }`, names
 * relative to the app folder) and the named table.
 */
export function ruleSecretKept(files, named = KEY_NAMED, namesIn = KEY_NAMES_IN) {
  const findings = [];
  const said = { mentions: 0, proved: 0, named: 0, holders: 0, sources: 0 };
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
        continue;
      }
      const line = lineOf(view, m.index);
      const text = (codeLines[line - 1] ?? '').trim().replace(/\s+/g, ' ');
      const key = `${f.name}\u0000${text}`;
      if (!unexplained.has(key)) unexplained.set(key, { file: f.name, text, line, count: 0 });
      unexplained.get(key).count += 1;
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
            `${bound === null ? '' : `; it is bound to ${bound[1]}`}; the code carries the one-shot secret, so it enters only under a watched name`
        );
      }
    }
  }

  // The values that hold it mirror themselves without it. A stored field (or
  // an enum case's value) named by the secret, or by the code in that file,
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
        `${d.file}:${String(lineOf(d.bare, d.open))} ${d.kind} ${d.name} holds ${field[1] ?? field[2]} and declares no customMirror, so print, dump or interpolation of a ${d.name} would repeat the one-shot secret or the code; declare a customMirror without it`
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
      findings.push(`${d.file}:${String(lineOf(d.bare, d.open + 1 + m.index))} gives the encodable ${d.name} a field ${m[1]}, so the one-shot secret or the code could be written wherever ${d.name} is; it is kept nowhere`);
    }
  }
  const used = new Set();
  for (const u of unexplained.values()) {
    const entry = named.find((n) => n.file === u.file && n.line === u.text);
    if (entry === undefined) {
      findings.push(`${u.file}:${String(u.line)} uses the one-shot secret, or the code that carries it, in a way this rule cannot prove goes nowhere (${JSON.stringify(u.text.slice(0, 90))}); keep it to a nil test, a comparison with a watched value or a hand-off into a watched place, or name the line in KEY_NAMED with where it goes`);
      continue;
    }
    used.add(entry);
    if (entry.uses !== u.count) {
      findings.push(`${u.file}:${String(u.line)} mentions the secret or the code ${String(u.count)} time(s) on lines reading ${JSON.stringify(u.text)}, and KEY_NAMED names ${String(entry.uses)}; a new use on a named line is not named`);
      continue;
    }
    said.named += u.count;
  }
  for (const entry of named) {
    if (!used.has(entry)) findings.push(`KEY_NAMED names ${entry.file} ${JSON.stringify(entry.line)}, which no longer mentions the secret or the code in a way this rule needs named; take the entry out`);
  }
  return { findings, said };
}

// ---------------------------------------------------------------------------
// Rule (t): pinned mutual TLS 1.3 to a public name (Phase 330)
// ---------------------------------------------------------------------------
//
// build/p330/SPEC.md §4.12 and §6.4 (t). What the phone's one network file
// promises the door, held as text: the Mac destroys a connection whose client
// key is not a paired phone's before its HTTP parser sees a byte, so every
// paired read must present the phone's identity; the pin replaces the chain,
// so the verify block must answer the pin's question and nothing else; TLS 1.3
// keeps the client certificate off Funnel's relay; the code names a public
// name and a Funnel port, never an address; and the hand-written reader holds
// the door to what it writes (an explicit length, never a stream). What the
// Swift DOES is test:ios's (P330TransportTests on the Simulator) and the macOS
// harness's; the hostile answers are hostile-door.mjs's.

/** The eight HTTP arms (t) requires build/p316/hostile-door.mjs to name. */
export const HOSTILE_HTTP_ARMS = ['chunked', 'no-length', 'two-lengths', 'over-cap', 'huge-header', 'not-http11', 'early-close', 'not-json'];

/**
 * The body of the function declared at `at` (its parameter list skipped, so a
 * default closure in it is not taken for the body), or of the closure whose
 * `{` follows `at`; '' when there is none.
 */
function bodyAfter(bare, at) {
  let from = at;
  if (/^\s*(?:(?:private|fileprivate|static|mutating|nonisolated)\s+)*func\b/.test(bare.slice(at, at + 80))) {
    const paren = bare.indexOf('(', at);
    const closed = paren === -1 ? -1 : closeParen(bare, paren);
    if (closed !== -1) from = closed;
  }
  const open = bare.indexOf('{', from);
  if (open === -1) return '';
  const close = matchForward(bare, open);
  return close === -1 ? '' : bare.slice(open, close + 1);
}

/**
 * Rule (t), pure over the door client's source, the pairing flow's, the keys',
 * every app file, hostile-door.mjs's text (or null) and Copy.swift's.
 */
export function ruleClientTransport({ client, pairing, keys, files = [], hostile, copy }) {
  const findings = [];
  const said = { exchanges: 0, identityCalls: 0, arms: [] };
  if (client === null) return { findings: ['Door/DoorClient.swift does not exist, so the phone has no client this rule can read'], said };
  const c = lexSwift(client);
  const at = (i) => `Door/DoorClient.swift:${String(lineOf(c.bare, i))}`;

  // (t1) A local identity on every paired connection; `POST /pair` alone has none.
  if (!/\bsec_protocol_options_set_local_identity\s*\(/.test(c.bare)) findings.push('Door/DoorClient.swift never sets a local identity, so no connection presents the phone\'s client certificate and the door refuses every paired read');
  const exchangeDecl = /\bfunc\s+exchange\s*\(/.exec(c.bare);
  const calls = [...c.bare.matchAll(/(?<!func\s)\bexchange\s*\(/g)].filter((m) => exchangeDecl === null || m.index !== exchangeDecl.index + exchangeDecl[0].indexOf('exchange'));
  said.exchanges = calls.length;
  const presentAt = /\bfunc\s+present\s*\(/.exec(c.bare);
  const presentBody = presentAt === null ? '' : bodyAfter(c.bare, presentAt.index);
  const presentStart = presentAt === null ? -1 : c.bare.indexOf(presentBody, presentAt.index);
  let nils = 0;
  for (const call of calls) {
    const close = closeParen(c.bare, c.bare.indexOf('(', call.index));
    const args = c.bare.slice(call.index, close === -1 ? c.bare.length : close + 1);
    const identity = /\bidentity\s*:\s*([^,)]+)/.exec(args)?.[1]?.trim();
    if (identity === undefined) {
      findings.push(`${at(call.index)} calls exchange( without naming identity:, so a connection could go out with no decision about what it presents`);
      continue;
    }
    if (identity === 'nil') {
      nils += 1;
      const inPresent = presentStart !== -1 && call.index > presentStart && call.index < presentStart + presentBody.length;
      if (!inPresent) findings.push(`${at(call.index)} opens a connection with identity: nil outside present(_:to:); only POST /pair presents no certificate`);
    } else said.identityCalls += 1;
  }
  if (nils !== 1) findings.push(`Door/DoorClient.swift opens ${String(nils)} connection(s) with identity: nil; exactly one does, POST /pair`);
  const signedAt = /\bfunc\s+signedGet\b/.exec(c.bare);
  if (signedAt === null || !/\bidentity\s*:\s*door\s*\.\s*identity\b/.test(bodyAfter(c.bare, signedAt.index))) {
    findings.push('Door/DoorClient.swift\'s signedGet does not open its connection with identity: door.identity, so a signed read could go out with no certificate');
  }
  if (keys === null || !/\blet\s+identity\s*:\s*ClientIdentity\s*$/m.test(lexSwift(keys).bare)) {
    findings.push('Door/Keys.swift\'s PairedDoor does not hold `let identity: ClientIdentity`, non-optional, so a paired door could have nothing to present');
  }

  // (t2) The verify block compares the pin and completes with that answer.
  const verify = /\bsec_protocol_options_set_verify_block\s*\(/.exec(c.bare);
  if (verify === null) findings.push('Door/DoorClient.swift sets no verify block, so the door\'s key is never compared with the pin');
  else {
    const block = bodyAfter(c.bare, verify.index);
    const pinned = /\blet\s+(\w+)\s*=\s*DoorPin\s*\.\s*(?:matches|of)\s*\(/.exec(block);
    if (pinned === null) findings.push(`${at(verify.index)} the verify block never asks DoorPin, so it answers without the pin`);
    const completes = [...block.matchAll(/\bcomplete\s*\(\s*([^)]*)\)/g)].map((m) => m[1].trim());
    if (completes.length === 0) findings.push(`${at(verify.index)} the verify block never completes`);
    for (const arg of completes) {
      if (pinned === null || arg !== pinned[1]) findings.push(`${at(verify.index)} the verify block completes with ${JSON.stringify(arg)}, not the pin's answer; only the pinned key is the door`);
    }
  }

  // (t3) TLS 1.3 at the least; nothing older, no maximum; TLS on every parameter set.
  if (!/\bsec_protocol_options_set_min_tls_protocol_version\s*\([^)]*\.\s*TLSv13\s*\)/.test(c.bare)) findings.push('Door/DoorClient.swift does not set TLS 1.3 as the minimum; under 1.2 the phone\'s certificate crosses the relay in the clear');
  for (const f of files) {
    const { bare } = lexSwift(f.source);
    for (const m of bare.matchAll(/\.\s*(?:TLSv1[012]|DTLSv1[02]?)\b|\btls_protocol_version_(?:TLSv1[012]|DTLSv1[02]?)\b|\bsec_protocol_options_set_max_tls_protocol_version\b|\bkTLSProtocol1[12]?\b|\bkSSLProtocol\w*/g)) {
      findings.push(`${f.name}:${String(lineOf(bare, m.index))} names ${m[0].replace(/\s+/g, '')}; the door is spoken to over TLS 1.3 and nothing older`);
    }
    for (const m of bare.matchAll(/\bNWParameters\s*(?:\.\s*(\w+)|\(\s*(tls\s*:\s*nil|dtls|quic)?)/g)) {
      if (m[1] !== undefined || (m[2] !== undefined && m[2] !== '')) findings.push(`${f.name}:${String(lineOf(bare, m.index))} builds NWParameters ${m[0].replace(/\s+/g, '')}; every connection is NWParameters(tls:) with the door's TLS`);
    }
  }
  if (!/\bNWParameters\s*\(\s*tls\s*:\s*\w+/.test(c.bare)) findings.push('Door/DoorClient.swift builds no NWParameters(tls:), so no connection is TLS');

  // (t4) A public name and a Funnel port, never an address.
  if (!/\bstatic\s+let\s+publicPorts\s*:\s*Set<Int>\s*=\s*\[\s*8443\s*,\s*10000\s*\]/.test(c.bare)) findings.push('Door/DoorClient.swift does not declare publicPorts: Set<Int> = [8443, 10000], the ports Funnel publishes Tortie on');
  if (!c.strings.some((x) => x.value === '.ts.net')) findings.push('Door/DoorClient.swift never names the ".ts.net" suffix a Mac\'s public name ends in');
  if (pairing === null) findings.push('Door/Pairing.swift does not exist, so nothing checks the code\'s host');
  else {
    const pb = lexSwift(pairing).bare;
    const parse = /\bstatic\s+func\s+parse\s*\(/.exec(pb);
    const body = parse === null ? '' : bodyAfter(pb, parse.index);
    if (!/\bDoorEndpoint\s*\.\s*isPublicName\s*\(\s*wire\s*\.\s*host\s*\)/.test(body)) findings.push('Door/Pairing.swift\'s parse does not ask DoorEndpoint.isPublicName(wire.host), so a code could name an address');
    if (!/\bDoorEndpoint\s*\.\s*publicPorts\s*\.\s*contains\s*\(\s*wire\s*\.\s*port\s*\)/.test(body)) findings.push('Door/Pairing.swift\'s parse does not ask DoorEndpoint.publicPorts.contains(wire.port)');
  }
  for (const f of files) {
    const { bare, strings } = lexSwift(f.source);
    for (const m of bare.matchAll(/\bisIPv4Literal\b|\boctets\b/g)) findings.push(`${f.name}:${String(lineOf(bare, m.index))} names ${m[0]}; the door is a public name and never an address (Phase 330)`);
    for (const x of strings) if (/^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(x.value)) findings.push(`${f.name}:${String(lineOf(bare, x.start))} writes the tailnet address ${JSON.stringify(x.value)}; the phone reaches no tailnet (Phase 330)`);
  }

  // (t5) The reader requires one Content-Length and refuses any Transfer-Encoding; the writer closes.
  for (const [value, what] of [['content-length', 'the Content-Length it requires'], ['transfer-encoding', 'the Transfer-Encoding it refuses'], ['close', 'Connection: close']]) {
    if (!c.strings.some((x) => x.value === value)) findings.push(`Door/DoorClient.swift never names ${JSON.stringify(value)}, ${what}`);
  }
  if (!/\bif\s+found\s*\[\s*DoorHTTP\s*\.\s*Read\s*\.\s*transferEncoding\s*\]\s*!=\s*nil\s*\{\s*throw\s+DoorFailure\s*\.\s*malformed\s*\}/.test(c.bare)) {
    findings.push('Door/DoorClient.swift\'s reader does not refuse a Transfer-Encoding as malformed; the door never streams');
  }
  if (!/\bguard\s+let\s+(\w+)\s*=\s*found\s*\[\s*DoorHTTP\s*\.\s*Read\s*\.\s*contentLength\s*\]\s*,\s*\1\s*\.\s*count\s*==\s*1\s*,\s*let\s+\w+\s*=\s*DoorHTTP\s*\.\s*length\s*\(\s*\1\s*\[\s*0\s*\]\s*\)\s*else\s*\{\s*throw\s+DoorFailure\s*\.\s*malformed\s*\}/.test(c.bare)) {
    findings.push('Door/DoorClient.swift\'s reader does not require exactly one Content-Length read through DoorHTTP.length, refusing anything else as malformed');
  }
  const lengthAt = /\bstatic\s+func\s+length\s*\([^)]*\)\s*->\s*Int\?/.exec(c.bare);
  if (lengthAt === null || !/\bDoorNumber\s*\.\s*isCount\s*\(/.test(bodyAfter(c.bare, lengthAt.index))) findings.push('Door/DoorClient.swift\'s DoorHTTP.length does not take the length through DoorNumber.isCount (rule k)');
  if ([...c.bare.matchAll(/\bNWConnection\s*\(/g)].length !== 1) findings.push('Door/DoorClient.swift makes a connection in more than one place (or none); one exchange, one connection, one request');

  // (t6) The hostile door names the eight HTTP arms, each ending in a Copy sentence.
  if (hostile === null) findings.push('build/p316/hostile-door.mjs does not exist, so no hostile HTTP answer is served to the phone');
  else {
    const copyWords = new Set(copy === null ? [] : [...copy.matchAll(/\bstatic\s+let\s+([A-Za-z0-9_]+)\s*=\s*"/g)].map((m) => m[1]));
    for (const arm of HOSTILE_HTTP_ARMS) {
      const row = new RegExp(`(?:^|\\n)\\s*(?:'${arm}'|${arm.replace(/-/g, '_')}):\\s*\\{([^\\n]*)\\}`).exec(hostile);
      if (row === null) {
        findings.push(`build/p316/hostile-door.mjs names no HTTP arm ${JSON.stringify(arm)}`);
        continue;
      }
      said.arms.push(arm);
      if (!/\braw:\s*true\b/.test(row[1])) findings.push(`hostile-door.mjs's ${arm} is not written as raw HTTP bytes (raw: true)`);
      if (!/\bends:\s*'sentence'/.test(row[1])) findings.push(`hostile-door.mjs's ${arm} does not end in a sentence`);
      const expect = /\bexpect:\s*\[([^\]]*)\]/.exec(row[1])?.[1] ?? '';
      const words = [...expect.matchAll(/'([A-Za-z0-9_]+)'/g)].map((m) => m[1]);
      if (words.length === 0) findings.push(`hostile-door.mjs's ${arm} names no Copy sentence it must end in`);
      for (const w of words) if (!copyWords.has(w)) findings.push(`hostile-door.mjs's ${arm} expects Copy.${w}, which Copy.swift does not hold`);
    }
  }
  return { findings, said };
}

// ---------------------------------------------------------------------------
// Rule (u): no Release configuration defines DEBUG (316.4's owed item 2)
// ---------------------------------------------------------------------------

/** The settings that define a Swift or C condition. */
const CONDITION_SETTINGS = ['SWIFT_ACTIVE_COMPILATION_CONDITIONS', 'OTHER_SWIFT_FLAGS', 'GCC_PREPROCESSOR_DEFINITIONS', 'OTHER_CFLAGS'];

/** Does a setting's value define DEBUG, in any of the spellings Xcode passes on? */
export function definesDebug(value) {
  return /(?:^|[\s("',])(?:-D\s*)?DEBUG(?:=\S*)?(?=$|[\s)"',])/.test(value);
}

/**
 * Rule (u), over the project, every xcconfig under ios/ and every scheme
 * (`{ name, text }`). No Release configuration, the project's or a target's,
 * defines DEBUG; no xcconfig does at all (which configuration takes an xcconfig
 * is the project's to say, and none here needs one to); and every scheme
 * archives Release.
 */
export function ruleNoDebugInRelease(pbxproj, xcconfigs = [], schemes = []) {
  const findings = [];
  const said = { release: 0, schemes: 0 };
  if (typeof pbxproj !== 'string') return { findings: ['project.pbxproj cannot be read, so no Release configuration can be read'], said };
  for (const c of allConfigurations(pbxproj).filter((x) => x.name === 'Release')) {
    said.release += 1;
    for (const setting of CONDITION_SETTINGS) {
      for (const a of settingAssignments(c.settings, setting)) {
        if (definesDebug(a.value)) findings.push(`${c.owner === 'the project' ? "the project's" : `${c.owner}'s`} Release configuration sets ${setting}${a.conditions} = ${JSON.stringify(a.value)}, which defines DEBUG, so every #if DEBUG seam would ship`);
      }
    }
    // An array value spans lines: read the whole assignment's parentheses too.
    for (const m of c.settings.matchAll(new RegExp(`\\b(${CONDITION_SETTINGS.join('|')})(\\[[^\\]]*\\])?\\s*=\\s*\\(([^)]*)\\)`, 'g'))) {
      if (definesDebug(m[3])) findings.push(`${c.owner === 'the project' ? "the project's" : `${c.owner}'s`} Release configuration sets ${m[1]} to a list holding DEBUG`);
    }
  }
  if (said.release === 0) findings.push('project.pbxproj has no Release configuration this rule can read');
  for (const x of xcconfigs) {
    const text = xcconfigBare(x.text);
    for (const setting of CONDITION_SETTINGS) {
      for (const a of settingAssignments(text, setting)) {
        if (definesDebug(a.value)) findings.push(`${x.name} sets ${setting}${a.conditions} = ${JSON.stringify(a.value)}, which defines DEBUG; an xcconfig can be any configuration's base, Release's included`);
      }
    }
  }
  for (const sch of schemes) {
    said.schemes += 1;
    const archive = /<ArchiveAction\b[^>]*\bbuildConfiguration\s*=\s*"([^"]*)"/.exec(sch.text)?.[1];
    if (archive !== undefined && archive !== 'Release') findings.push(`${sch.name} archives the ${archive} configuration; the archive he uploads is Release, where no seam exists`);
    const profile = /<ProfileAction\b[^>]*\bbuildConfiguration\s*=\s*"([^"]*)"/.exec(sch.text)?.[1];
    if (profile !== undefined && profile !== 'Release') findings.push(`${sch.name} profiles the ${profile} configuration`);
  }
  return { findings, said };
}

// ---------------------------------------------------------------------------
// Rule (v): the phone always draws a sentence (his no-key finding)
// ---------------------------------------------------------------------------

/** The cases of `enum <name>` in a Swift source, in order. */
export function enumCases(source, name) {
  const { bare } = lexSwift(source);
  const at = new RegExp(`\\benum\\s+${name}\\b[^{]*\\{`).exec(bare);
  if (at === null) return null;
  const open = at.index + at[0].length - 1;
  const close = matchForward(bare, open);
  const body = bare.slice(open + 1, close === -1 ? bare.length : close);
  const out = [];
  let depth = 0;
  for (const line of body.split('\n')) {
    if (depth === 0) {
      const m = /^\s*case\s+(.+)$/.exec(line);
      if (m !== null) for (const part of m[1].split(',')) out.push(part.trim().replace(/\(.*$/, '').trim());
    }
    for (const ch of line) depth += ch === '{' ? 1 : ch === '}' ? -1 : 0;
  }
  return out.filter((c) => /^[A-Za-z_]\w*$/.test(c));
}

/**
 * Rule (v), pure over DoorWords.swift, PairingScreen.swift and Pairing.swift.
 * `pairingSentence` and `stepSentence` return a non-optional String for every
 * case of their enums, never nil or an empty string; PairingModel's `line` is a
 * non-optional String, and every assignment to it is a sentence.
 */
export function rulePairingSentence(words, screen, pairing) {
  const findings = [];
  const said = { failures: 0, steps: 0, assignments: 0 };
  if (words === null || screen === null || pairing === null) return { findings: ['DoorWords.swift, PairingScreen.swift or Pairing.swift does not exist, so what the pairing screen draws cannot be read'], said };
  const w = lexSwift(words);
  for (const [fn, enumName, key] of [['pairingSentence', 'PairingFailure', 'failures'], ['stepSentence', 'PairingStep', 'steps']]) {
    const decl = new RegExp(`\\bstatic\\s+func\\s+${fn}\\s*\\(\\s*for\\s+\\w+\\s*:\\s*${enumName}\\s*\\)\\s*->\\s*([^{]+)\\{`).exec(w.bare);
    if (decl === null) {
      findings.push(`Screens/DoorWords.swift declares no ${fn}(for: ${enumName})`);
      continue;
    }
    if (decl[1].trim() !== 'String') findings.push(`Screens/DoorWords.swift's ${fn} returns ${decl[1].trim()}; it returns String, so every case draws a sentence`);
    const body = bodyAfter(w.bare, decl.index);
    const bodyStart = w.bare.indexOf(body, decl.index);
    for (const m of body.matchAll(/\breturn\s+nil\b/g)) findings.push(`Screens/DoorWords.swift:${String(lineOf(w.bare, bodyStart + m.index))} ${fn} returns nil`);
    for (const x of w.strings) {
      if (x.start > bodyStart && x.start < bodyStart + body.length && x.value.trim() === '') findings.push(`Screens/DoorWords.swift:${String(lineOf(w.bare, x.start))} ${fn} returns an empty string`);
    }
    if (/\bdefault\s*:/.test(body)) findings.push(`Screens/DoorWords.swift's ${fn} has a default, so a new ${enumName} case would draw a line nobody chose`);
    const cases = enumCases(pairing, enumName) ?? [];
    if (cases.length === 0) findings.push(`Door/Pairing.swift declares no enum ${enumName} this rule can read`);
    said[key] = cases.length;
    for (const cs of cases) {
      if (!new RegExp(`\\bcase\\b[^:]*\\.${cs}\\b[^:]*:\\s*return\\s+(?:Copy|DoorWords)\\s*\\.`).test(body)) findings.push(`Screens/DoorWords.swift's ${fn} draws no Copy sentence for .${cs}`);
    }
  }
  const sc = lexSwift(screen);
  if (!/\bprivate\s*\(\s*set\s*\)\s*var\s+line\s*:\s*String\s*=\s*(?:Copy|DoorWords)\s*\./.test(sc.bare)) findings.push('Screens/PairingScreen.swift\'s line is not `private(set) var line: String` starting as a sentence; an optional line is how the phone once drew nothing');
  for (const m of sc.bare.matchAll(/(?<![\w.])line\s*=(?!=)\s*([^\n]*)/g)) {
    said.assignments += 1;
    if (!/^(?:Copy|DoorWords)\s*\./.test(m[1].trim())) findings.push(`Screens/PairingScreen.swift:${String(lineOf(sc.bare, m.index))} assigns line = ${m[1].trim().slice(0, 40)}; every line is a Copy sentence or DoorWords', never nil or empty`);
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

/**
 * The build this round uploads: 1.0.0 (3) (Phase 316.5, build/p3165/SPEC.md
 * §5.7). 1.0.0 (2) is Phase 330's and is archived, so a build that did not
 * move would be refused by App Store Connect as a duplicate. The round that
 * uploads the next build moves this with the project, in the same commit.
 */
export const PHONE_BUILD = '3';

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
  // The build this round uploads, in every configuration that says one.
  for (const c of configs) {
    for (const a of settingAssignments(c.settings, 'CURRENT_PROJECT_VERSION')) {
      if (a.conditions !== '' || a.value !== PHONE_BUILD) {
        findings.push(`${c.owner === 'the project' ? "the project's" : `${c.owner}'s`} ${c.name} configuration sets CURRENT_PROJECT_VERSION${a.conditions} = ${JSON.stringify(a.value)}; this round uploads build ${PHONE_BUILD}, and every configuration says it`);
      }
    }
  }
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
// Rules (w) and (x): the alert (Phase 316.5, build/p3165/SPEC.md §5.6, §5.7, §6.4)
// ---------------------------------------------------------------------------
//
// (w) THE ENTITLEMENT. The alert needs `aps-environment`, and it is the app's
// ONLY entitlement: exactly `development` in the file (Xcode's own spelling;
// his TestFlight export re-signs it for production, SPEC §3 row 4), named by
// both of the app's configurations and by no other target, spelled nowhere
// else (no `SystemCapabilities` block, no `com.apple.Push` line: Xcode derives
// the capability from the file, and a second spelling is a second place to
// disagree). Three targets and no fourth: a Notification Service Extension
// would be one. No `remote-notification` string anywhere under ios/, because
// that is the background mode that wakes an app for a silent push, and this
// app has no background mode (rule e). And the topic and team the Mac signs
// every alert with (src/main/alerts/key-file.ts) are the app's own bundle id
// and his team, because a provider token for another topic reaches no phone.
//
// (x) THE ALERT'S REFUSALS. The phone asks Apple for its address in exactly
// one place, `registerForRemoteNotifications` in the `#else` of `#if DEBUG` in
// Alerts/SystemAlerts.swift, so a DEBUG build, which is every Simulator run,
// never asks Apple for anything, and no test names it or the class that calls
// it. The question is asked in one place (`requestAuthorization(`). Only
// Alerts/SystemAlerts.swift and App/AppDelegate.swift name the
// UserNotifications framework. A payload is read by `AlertTap.parse` alone,
// which the delegate hands it. The environment the phone presents is
// `.development` under `#if DEBUG` and `.production` in its `#else`. The wire
// names `apt` and `ape` are declared once each for the presentation
// (Door/Pairing.swift's `Inner`) and once each for the Keychain record that
// keeps what was presented (Door/Keys.swift's `Record`, SPEC §5.6.2), and
// nowhere else, so no second path can carry the address. And nothing writes
// the badge (the Mac owns it), no service extension or background delivery
// exists, and nothing prints or logs, so a token or a payload never reaches a
// log.
//
// AND iOS IS ASKED ABOUT ALERTS ONLY FOR A MAC THAT CAN SEND ONE (research 136
// section 9, which binds Phase 316.5 over build/p316/SPEC.md:660). Alerts are
// the Apple push key holder's alone, so a phone pairing with any other Mac is
// never asked a question for alerts that cannot arrive. The pairing asks
// (`askForAlerts()`) once, inside the arm that reads the Mac's `pending`
// answer and behind an `if` on the word that answer carries; the app hands
// `askForPairing()` to the pairing, inside the closure it passes, and calls it
// nowhere else; and the launch check reads `authorization()` and
// `currentAddress()` only in a function that has first read the kept
// pairing's `macSends` in a guard, so a phone paired with a Mac that could not
// send asks iOS nothing and registers with Apple for nothing.

/** The app's one entitlements file, relative to ios/ (SRCROOT). */
export const ENTITLEMENTS_FILE = 'Tortie/Tortie.entitlements';
/** Everything it holds, as CoreFoundation reads it. */
export const ENTITLEMENTS = Object.freeze({ 'aps-environment': 'development' });
/** Where the Mac keeps the topic and team it signs alerts with (Phase 316.5). */
export const KEY_FILE_TS = 'src/main/alerts/key-file.ts';

/**
 * For each line (1-based), whether it sits inside the `#else` arm of `#if
 * DEBUG` and inside no active DEBUG arm: what a Release build compiles and a
 * DEBUG build does not.
 */
export function releaseLines(code) {
  const out = [false];
  const stack = [];
  for (const raw of code.split('\n')) {
    const t = raw.trim();
    let m;
    if ((m = /^#if\s+(.*)$/.exec(t)) !== null) stack.push({ cond: m[1].replace(/\s+/g, ''), arm: 'if' });
    else if (/^#elseif\b/.test(t)) {
      if (stack.length > 0) stack[stack.length - 1].arm = 'elseif';
    } else if (/^#else\b/.test(t)) {
      if (stack.length > 0) stack[stack.length - 1].arm = 'else';
    } else if (/^#endif\b/.test(t)) stack.pop();
    const debug = stack.some((f) => (f.cond === 'DEBUG' && f.arm === 'if') || (f.cond === '!DEBUG' && f.arm === 'else'));
    out.push(!debug && stack.some((f) => f.cond === 'DEBUG' && f.arm === 'else'));
  }
  return out;
}

/** A TypeScript text with its comments blanked, strings left in place (enough for a const's value). */
function tsBare(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
}

/** Every `NAME = '<value>'` in a TypeScript text, comments out. */
function tsConstValues(text, name) {
  return [...tsBare(text).matchAll(new RegExp(`\\b${name}\\s*(?::\\s*string\\s*)?=\\s*(['"\`])([^'"\`\\n]*)\\1`, 'g'))].map((m) => m[2]);
}

/**
 * Rule (w). `entitlements` is Tortie.entitlements as CoreFoundation reads it
 * (null when it cannot be read); `entitlementFiles` every `.entitlements` file
 * under ios/, relative to the root; `iosText` every text file under ios/ as
 * `{ name, text }`; `keyFile` the text of src/main/alerts/key-file.ts or null.
 */
export function ruleEntitlement({ entitlements, pbxproj, xcconfigs = [], entitlementFiles = [], iosText = [], keyFile = null }) {
  const findings = [];
  const said = { targets: 0, named: 0, files: iosText.length };
  if (entitlements === null || typeof entitlements !== 'object' || Array.isArray(entitlements)) {
    findings.push(`${ENTITLEMENTS_FILE} cannot be read as a dictionary, so the app's entitlements cannot be said`);
  } else {
    const keys = Object.keys(entitlements).sort();
    if (keys.join() !== Object.keys(ENTITLEMENTS).join()) {
      findings.push(`${ENTITLEMENTS_FILE} holds ${JSON.stringify(keys)}; it holds aps-environment and nothing else (SPEC §5.7): no networking, no VPN, no time-sensitive or critical alert, no keychain group`);
    }
    for (const [key, value] of Object.entries(ENTITLEMENTS)) {
      if (key in entitlements && entitlements[key] !== value) {
        findings.push(`${ENTITLEMENTS_FILE} sets ${key} to ${JSON.stringify(entitlements[key])}; it is ${JSON.stringify(value)}, Xcode's own spelling, and his TestFlight export re-signs it for production`);
      }
    }
  }
  const wantFile = `ios/${ENTITLEMENTS_FILE}`;
  if (entitlementFiles.length !== 1 || entitlementFiles[0] !== wantFile) {
    findings.push(`ios/ holds ${JSON.stringify(entitlementFiles)} as entitlements files; it holds ${wantFile} alone`);
  }
  if (typeof pbxproj !== 'string') {
    findings.push('project.pbxproj cannot be read, so which target names an entitlements file cannot be said');
  } else {
    const kinds = [...pbxproj.matchAll(/\bisa\s*=\s*(PBX\w*Target);/g)].map((m) => m[1]);
    said.targets = kinds.length;
    if (kinds.length !== 3 || kinds.some((k) => k !== 'PBXNativeTarget')) {
      findings.push(`project.pbxproj holds ${String(kinds.length)} target(s) (${[...new Set(kinds)].join(', ') || 'none'}); it holds three native targets, the app and its two test bundles, and a Notification Service Extension would be a fourth`);
    }
    const apps = appConfigurations(pbxproj);
    const appIds = new Set(apps.map((c) => c.id));
    if (apps.length !== 2) findings.push(`the app has ${String(apps.length)} configuration(s) this rule can read, not Debug and Release`);
    for (const c of apps) {
      if (onlyValue(c.settings, 'CODE_SIGN_ENTITLEMENTS') !== ENTITLEMENTS_FILE) {
        findings.push(`the app's ${c.name} configuration does not set CODE_SIGN_ENTITLEMENTS = ${ENTITLEMENTS_FILE} once and plainly, so that build carries no aps-environment or another file's`);
      } else said.named += 1;
    }
    for (const c of allConfigurations(pbxproj)) {
      if (appIds.has(c.id)) continue;
      for (const a of settingAssignments(c.settings, 'CODE_SIGN_ENTITLEMENTS')) {
        findings.push(`${c.owner === 'the project' ? "the project's" : `${c.owner}'s`} ${c.name} configuration sets CODE_SIGN_ENTITLEMENTS${a.conditions} = ${JSON.stringify(a.value)}; only the app names an entitlements file`);
      }
    }
    const inConfigurations = allConfigurations(pbxproj).reduce((n, c) => n + settingAssignments(c.settings, 'CODE_SIGN_ENTITLEMENTS').length, 0);
    if (settingAssignments(pbxproj, 'CODE_SIGN_ENTITLEMENTS').length !== inConfigurations) {
      findings.push('project.pbxproj sets CODE_SIGN_ENTITLEMENTS outside any build configuration this rule reads');
    }
    for (const m of pbxproj.matchAll(/\bSystemCapabilities\b|\bcom\.apple\.Push\b/g)) {
      findings.push(`project.pbxproj:${String(lineOf(pbxproj, m.index))} names ${m[0]}; Xcode derives the push capability from ${ENTITLEMENTS_FILE}, and a second spelling is a second place to disagree`);
    }
  }
  for (const x of xcconfigs) {
    for (const a of settingAssignments(xcconfigBare(x.text), 'CODE_SIGN_ENTITLEMENTS')) {
      findings.push(`${x.name} sets CODE_SIGN_ENTITLEMENTS${a.conditions}; the entitlements file is the project's, where this rule reads it`);
    }
  }
  for (const f of iosText) {
    for (const m of f.text.matchAll(/remote-notification/gi)) {
      findings.push(`${f.name}:${String(lineOf(f.text, m.index))} says ${JSON.stringify(m[0])}, the background mode a silent push wakes an app with; the app has no background mode and asks for no silent push`);
    }
  }
  if (keyFile === null) {
    findings.push(`${KEY_FILE_TS} does not exist, so the topic and team the Mac signs every alert with cannot be held to the app's`);
  } else if (typeof pbxproj === 'string') {
    const topics = tsConstValues(keyFile, 'PHONE_APP_TOPIC');
    const teams = tsConstValues(keyFile, 'PHONE_APP_TEAM');
    const apps = appConfigurations(pbxproj);
    const bundleIds = [...new Set(apps.map((c) => onlyValue(c.settings, 'PRODUCT_BUNDLE_IDENTIFIER')))];
    const releaseTeam = apps.filter((c) => c.name === 'Release').map((c) => onlyValue(c.settings, 'DEVELOPMENT_TEAM'));
    if (topics.length !== 1) findings.push(`${KEY_FILE_TS} sets PHONE_APP_TOPIC ${String(topics.length)} time(s); it is written once`);
    else if (bundleIds.length !== 1 || topics[0] !== bundleIds[0] || topics[0] !== PHONE_BUNDLE_ID) {
      findings.push(`${KEY_FILE_TS}'s PHONE_APP_TOPIC is ${JSON.stringify(topics[0])} and the app is ${JSON.stringify(bundleIds.length === 1 ? bundleIds[0] : bundleIds)}; an alert whose apns-topic is not the app's bundle id reaches no phone`);
    }
    if (teams.length !== 1) findings.push(`${KEY_FILE_TS} sets PHONE_APP_TEAM ${String(teams.length)} time(s); it is written once`);
    else if (teams[0] !== RELEASE_TEAM || releaseTeam.length !== 1 || releaseTeam[0] !== teams[0]) {
      findings.push(`${KEY_FILE_TS}'s PHONE_APP_TEAM is ${JSON.stringify(teams[0])} and the app's Release team is ${JSON.stringify(releaseTeam)} (${RELEASE_TEAM}); a provider key only reaches the app its team signs`);
    }
  }
  return { findings, said };
}

/** What no file of the app ever names, in its code, and why. */
const ALERT_NEVER_CODE = [
  [/\bapplicationIconBadgeNumber\b/, 'writes the badge, which is the Mac\'s (build/p314/SPEC.md §1.2 row 6)'],
  [/\bsetBadgeCount\b/, 'writes the badge, which is the Mac\'s (build/p314/SPEC.md §1.2 row 6)'],
  [/\bUNNotificationServiceExtension\b/, 'is a Notification Service Extension, which the app does not have'],
  [/\bdidReceiveRemoteNotification\b/, 'is the background delivery handler; the app has no background mode'],
  [/\bprint\s*\(/, 'prints, and a token, a payload or a userInfo could reach a log'],
  [/\bdebugPrint\s*\(/, 'prints, and a token, a payload or a userInfo could reach a log'],
  [/\bdump\s*\(/, 'dumps, and a token, a payload or a userInfo could reach a log'],
  [/\bNSLog\b/, 'logs, and a token, a payload or a userInfo could reach a log'],
  [/\bos_log\b/, 'logs, and a token, a payload or a userInfo could reach a log'],
  [/\bLogger\s*\(/, 'makes a logger, and a token, a payload or a userInfo could reach a log']
];
/** What no string of the app ever holds, and why. */
const ALERT_NEVER_STRING = [
  [/content-available/, 'asks for a silent push, which wakes an app in the background'],
  [/mutable-content/, 'hands the alert to a service extension, which the app does not have'],
  [/\bdidReceiveRemoteNotification\b/, 'names the background delivery handler'],
  [/\bapplicationIconBadgeNumber\b|\bsetBadgeCount\b/, 'names a badge write, which is the Mac\'s']
];

/** The files rule (x) reads by name, relative to the app folder. */
export const ALERT_FILES = Object.freeze({
  system: 'Alerts/SystemAlerts.swift',
  delegate: 'App/AppDelegate.swift',
  alerts: 'Alerts/Alerts.swift',
  pairing: 'Door/Pairing.swift',
  keys: 'Door/Keys.swift',
  screen: 'Screens/PairingScreen.swift',
  app: 'App/TortieApp.swift'
});

/** The `{ … }` body of the innermost function around `index` in `bare`, as [open, close], or null. */
function enclosingFunction(bare, index) {
  let best = null;
  for (const m of bare.matchAll(/\bfunc\s+\w+[^{]*\{/g)) {
    const open = m.index + m[0].length - 1;
    if (open > index) break;
    const close = matchForward(bare, open);
    if (close !== -1 && close > index) best = [open, close];
  }
  return best;
}

/** The `{ … }` body of the first `<kind> <name>` in `bare`, as [open, close], or null. */
function declBody(bare, kind, name) {
  const at = new RegExp(`\\b${kind}\\s+${name}\\b[^{]*\\{`).exec(bare);
  if (at === null) return null;
  const open = at.index + at[0].length - 1;
  const close = matchForward(bare, open);
  return [at.index, close === -1 ? bare.length : close];
}

/**
 * Rule (x), over the app's Swift (`files`, `{ name, source }` named relative
 * to the app folder) and the tests' (`tests`, named relative to ios/).
 */
export function ruleAlerts(files, tests = []) {
  const findings = [];
  const said = { registrations: 0, asks: 0, unFiles: new Set(), userInfo: 0, arms: 0, fields: 0, flowAsks: 0, pairingAsks: 0, launchReads: 0 };
  const lexedFiles = files.map((f) => ({ ...f, lx: lexSwift(f.source) }));
  const byName = new Map(lexedFiles.map((f) => [f.name, f]));
  const at = (f, index) => `${f.name}:${String(lineOf(f.lx.bare, index))}`;

  // (1) The one registration, in the #else of #if DEBUG in SystemAlerts.swift.
  const registrations = [];
  for (const f of lexedFiles) {
    for (const m of f.lx.bare.matchAll(/\bregisterForRemoteNotifications\b/g)) registrations.push({ f, index: m.index, code: true });
    for (const s of f.lx.strings) if (/\bregisterForRemoteNotifications\b/.test(s.value)) registrations.push({ f, index: s.start, code: false });
  }
  said.registrations = registrations.length;
  if (registrations.length !== 1) {
    findings.push(`the app names registerForRemoteNotifications ${String(registrations.length)} time(s)${registrations.length > 0 ? ` (${registrations.map((r) => at(r.f, r.index)).join(', ')})` : ''}; it is named once, in ${ALERT_FILES.system}, so the phone asks Apple for its address in one place`);
  }
  for (const r of registrations) {
    if (r.f.name !== ALERT_FILES.system || !r.code) {
      findings.push(`${at(r.f, r.index)} names registerForRemoteNotifications${r.code ? '' : ' in a string'}; only ${ALERT_FILES.system} asks Apple for the phone's address`);
      continue;
    }
    if (releaseLines(r.f.lx.code)[lineOf(r.f.lx.bare, r.index)] !== true) {
      findings.push(`${at(r.f, r.index)} registers with Apple outside the #else of #if DEBUG, so a DEBUG build, which is every Simulator run, would ask Apple for a token`);
    }
  }

  // (2) The one question.
  const asks = lexedFiles.flatMap((f) => [...f.lx.bare.matchAll(/\brequestAuthorization\s*\(/g)].map((m) => ({ f, index: m.index })));
  said.asks = asks.length;
  if (asks.length !== 1 || asks[0].f.name !== ALERT_FILES.system) {
    findings.push(`the app asks requestAuthorization( ${String(asks.length)} time(s)${asks.length > 0 ? ` (${asks.map((a) => at(a.f, a.index)).join(', ')})` : ''}; it asks once, in ${ALERT_FILES.system}, at pairing`);
  }

  // (3) The framework, in two files.
  for (const f of lexedFiles) {
    const names = [...f.lx.bare.matchAll(/\bUN[A-Z][a-z]\w*/g), ...f.lx.bare.matchAll(/\bimport\s+(?:(?:struct|class|enum|protocol|typealias|func|let|var)\s+)?UserNotifications\b/g)];
    if (names.length === 0) continue;
    said.unFiles.add(f.name);
    if (f.name === ALERT_FILES.system || f.name === ALERT_FILES.delegate) continue;
    for (const m of names) findings.push(`${at(f, m.index)} names ${m[0].replace(/\s+/g, ' ')}; only ${ALERT_FILES.system} and ${ALERT_FILES.delegate} speak to the notification center`);
  }

  // (4) A payload is read by AlertTap.parse alone, which the delegate hands it.
  let handed = 0;
  for (const f of lexedFiles) {
    const allowed = [];
    if (f.name === ALERT_FILES.alerts) {
      const parse = /\bstatic\s+func\s+parse\s*\(/.exec(f.lx.bare);
      const tap = declBody(f.lx.bare, 'enum', 'AlertTap');
      if (parse !== null && tap !== null && parse.index > tap[0] && parse.index < tap[1]) {
        const open = f.lx.bare.indexOf('{', parse.index);
        const close = open === -1 ? -1 : matchForward(f.lx.bare, open);
        if (close !== -1) allowed.push([parse.index, close]);
      }
    }
    if (f.name === ALERT_FILES.delegate) {
      for (const m of f.lx.bare.matchAll(/\bAlertTap\s*\.\s*parse\s*\(/g)) {
        const open = m.index + m[0].length - 1;
        const close = closeParen(f.lx.bare, open);
        if (close === -1) continue;
        allowed.push([open, close]);
        if (/\buserInfo\b/.test(f.lx.bare.slice(open, close))) handed += 1;
      }
    }
    for (const m of f.lx.bare.matchAll(/\buserInfo\b/g)) {
      said.userInfo += 1;
      if (!allowed.some(([a, b]) => m.index > a && m.index < b)) {
        findings.push(`${at(f, m.index)} reads userInfo; a notification's payload is read by AlertTap.parse alone (${ALERT_FILES.alerts}), which ${ALERT_FILES.delegate} hands it`);
      }
    }
  }
  if (handed !== 1) findings.push(`${ALERT_FILES.delegate} hands a notification's userInfo to AlertTap.parse ${String(handed)} time(s); it hands it once, from didReceive, so a tap opens what it names`);

  // (5) The environment is the build's.
  const alerts = byName.get(ALERT_FILES.alerts);
  const env = alerts === undefined ? null : declBody(alerts.lx.bare, 'enum', 'PushEnvironment');
  if (env === null) findings.push(`${ALERT_FILES.alerts} declares no enum PushEnvironment`);
  else {
    const body = alerts.lx.bare.slice(env[0], env[1]);
    const debug = debugLines(alerts.lx.code);
    const release = releaseLines(alerts.lx.code);
    const decls = [...body.matchAll(/\bstatic\s+(?:let|var)\s+current\b([^\n]*)/g)];
    const arms = { debug: [], release: [] };
    for (const d of decls) {
      const line = lineOf(alerts.lx.bare, env[0] + d.index);
      const value = /=\s*\.(\w+)\s*$/.exec(d[1].trim())?.[1] ?? null;
      if (debug[line] === true) arms.debug.push(value);
      else if (release[line] === true) arms.release.push(value);
      else findings.push(`${ALERT_FILES.alerts}:${String(line)} declares PushEnvironment.current outside #if DEBUG and its #else`);
    }
    said.arms = decls.length;
    if (arms.debug.length !== 1 || arms.debug[0] !== 'development') {
      findings.push(`${ALERT_FILES.alerts}'s PushEnvironment.current under #if DEBUG is ${JSON.stringify(arms.debug)}; it is .development once, because every DEBUG build is ad hoc and Apple's development environment's`);
    }
    if (arms.release.length !== 1 || arms.release[0] !== 'production') {
      findings.push(`${ALERT_FILES.alerts}'s PushEnvironment.current in the #else of #if DEBUG is ${JSON.stringify(arms.release)}; it is .production once, because the app he uploads is re-signed for production`);
    }
  }

  // (6) The wire names, declared for the presentation and the record alone.
  const homes = { [ALERT_FILES.pairing]: 'Inner', [ALERT_FILES.keys]: 'Record' };
  for (const f of lexedFiles) {
    for (const m of f.lx.bare.matchAll(/\b(?:let|var|case)\s+(apt|ape)\b/g)) {
      said.fields += 1;
      const home = homes[f.name];
      const body = home === undefined ? null : declBody(f.lx.bare, 'struct', home);
      if (body === null || m.index < body[0] || m.index > body[1]) {
        findings.push(`${at(f, m.index)} declares ${m[1]}; the alert address's wire names are declared by ${ALERT_FILES.pairing}'s Inner (the presentation) and ${ALERT_FILES.keys}'s Record (what the Keychain keeps) and nowhere else`);
      }
    }
    if (homes[f.name] === undefined) {
      for (const m of f.lx.bare.matchAll(/\b(apt|ape)\b/g)) findings.push(`${at(f, m.index)} names ${m[1]}, the alert address's wire name, outside the presentation and its record`);
    }
    for (const s of f.lx.strings) {
      if (/\bap[te]\b/.test(s.value)) findings.push(`${at(f, s.start)} writes ${JSON.stringify(s.value.slice(0, 40))}; the alert address is sealed by the presentation's own encoder and never spelled by hand`);
    }
  }
  for (const [file, home] of Object.entries(homes)) {
    const f = byName.get(file);
    const body = f === undefined ? null : declBody(f.lx.bare, 'struct', home);
    const inside = body === null ? [] : [...f.lx.bare.slice(body[0], body[1]).matchAll(/\b(?:let|var)\s+(apt|ape)\b/g)].map((m) => m[1]).sort();
    if (inside.join() !== 'ape,apt') findings.push(`${file}'s ${home} declares ${JSON.stringify(inside)}; it declares apt and ape once each`);
  }

  // (7) No badge, no extension, no background delivery, no print, no log.
  for (const f of lexedFiles) {
    for (const [re, why] of ALERT_NEVER_CODE) {
      for (const m of f.lx.bare.matchAll(new RegExp(re.source, 'g'))) findings.push(`${at(f, m.index)} names ${m[0].replace(/\s*\($/, '(')}, which ${why}`);
    }
    for (const s of f.lx.strings) {
      for (const [re, why] of ALERT_NEVER_STRING) if (re.test(s.value)) findings.push(`${at(f, s.start)} writes ${JSON.stringify(s.value.slice(0, 40))}, which ${why}`);
    }
  }

  // (8) iOS is asked about alerts only for a Mac that can send one (research 136 section 9).
  const pairing = byName.get(ALERT_FILES.pairing);
  const asksInFlow = pairing === undefined ? [] : [...pairing.lx.bare.matchAll(/\baskForAlerts\s*\(\s*\)/g)];
  said.flowAsks = asksInFlow.length;
  if (asksInFlow.length !== 1) {
    findings.push(`${ALERT_FILES.pairing} calls askForAlerts() ${String(asksInFlow.length)} time(s); it asks once, in the arm that reads the Mac's pending answer, behind the word that answer carries`);
  }
  for (const m of asksInFlow) {
    const bare = pairing.lx.bare;
    const arms = [...bare.matchAll(/\bcase\s+\.pending\s*\(\s*let\s+(\w+)\s*\)\s*:/g)].filter((a) => a.index < m.index);
    const arm = arms.at(-1);
    const armEnd = arm === undefined ? -1 : bare.slice(arm.index + arm[0].length).search(/\bcase\s+\.|\bdefault\s*:/);
    const inArm = arm !== undefined && (armEnd === -1 || m.index < arm.index + arm[0].length + armEnd);
    if (!inArm) {
      findings.push(`${at(pairing, m.index)} asks for alerts outside the arm that reads the Mac's pending answer, so a Mac that cannot send could have its phone asked`);
      continue;
    }
    const between = bare.slice(arm.index + arm[0].length, m.index);
    if (!new RegExp(`\\bif\\s+${arm[1]}\\b`).test(between)) {
      findings.push(`${at(pairing, m.index)} asks for alerts with no \`if ${arm[1]}\` before it in the pending arm, so it asks whatever the Mac said about sending`);
    }
  }
  const pairingAsks = lexedFiles.flatMap((f) => [...f.lx.bare.matchAll(/\.\s*askForPairing\s*\(/g)].map((m) => ({ f, index: m.index })));
  said.pairingAsks = pairingAsks.length;
  if (pairingAsks.length !== 1) {
    findings.push(`the app calls askForPairing() ${String(pairingAsks.length)} time(s)${pairingAsks.length > 0 ? ` (${pairingAsks.map((a) => at(a.f, a.index)).join(', ')})` : ''}; it is called once, inside the closure ${ALERT_FILES.screen} hands the pairing as askForAlerts`);
  }
  for (const a of pairingAsks) {
    let inside = false;
    if (a.f.name === ALERT_FILES.screen) {
      for (const c of a.f.lx.bare.matchAll(/\baskForAlerts\s*:\s*\{/g)) {
        const open = c.index + c[0].length - 1;
        const close = matchForward(a.f.lx.bare, open);
        if (a.index > open && (close === -1 || a.index < close)) inside = true;
      }
    }
    if (!inside) findings.push(`${at(a.f, a.index)} calls askForPairing() outside the closure the pairing asks through, so iOS could be asked before the Mac says it can send`);
  }
  const launchReads = lexedFiles.flatMap((f) => [...f.lx.bare.matchAll(/\.\s*(currentAddress|authorization)\s*\(/g)].map((m) => ({ f, index: m.index, name: m[1] })));
  said.launchReads = launchReads.length;
  for (const r of launchReads) {
    const body = r.f.name === ALERT_FILES.app ? enclosingFunction(r.f.lx.bare, r.index) : null;
    const before = body === null ? '' : r.f.lx.bare.slice(body[0], r.index);
    if (r.f.name !== ALERT_FILES.app || !/\bguard\b[^{]*\bmacSends\b/.test(before)) {
      findings.push(`${at(r.f, r.index)} reads ${r.name}() with no guard on the kept pairing's macSends before it in ${ALERT_FILES.app}, so a phone paired with a Mac that cannot send could be asked, or registered with Apple`);
    }
  }

  // No test asks Apple, or asks through the class that does.
  for (const t of tests) {
    const { bare } = lexSwift(t.source);
    for (const m of bare.matchAll(/\bregisterForRemoteNotifications\b|\bSystemPushAddressing\b|\brequestAuthorization\s*\(/g)) {
      findings.push(`${t.name}:${String(lineOf(bare, m.index))} names ${m[0].replace(/\s*\($/, '(')}; a test runs in a Simulator, which never asks Apple for a token, and in the Release test host it would`);
    }
  }
  return { findings, said: { ...said, unFiles: [...said.unFiles].sort() } };
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
  expect('(c) catches URLSession anywhere in the app', ruleNoUrlLoading('F', 'let s = URLSession.shared\n').length > 0);
  expect('(c) catches URLSession in the door client too', ruleNoUrlLoading('Door/DoorClient.swift', 'let r = URLRequest(url: u)\n').length > 0);
  expect('(c) catches a proxy configuration', ruleNoUrlLoading('F', 'var p = ProxyConfiguration(socksv5Proxy: e)\n').length > 0);
  expect('(c) catches NWConnection outside the client', ruleNetworkOnlyInClient('F', 'let c: NWConnection? = nil\n').length > 0);
  expect('(c) catches the TLS options outside the client', ruleNetworkOnlyInClient('F', 'sec_protocol_options_set_verify_block(o, { _, _, c in c(true) }, q)\n').length > 0);
  expect('(c) catches import Network outside the client', ruleNetworkOnlyInClient('F', 'import Network\n').length > 0);
  expect('(c) catches a stream to a host outside the client', ruleNetworkOnlyInClient('F', 'Stream.getStreamsToHost(withName: h, port: p, inputStream: &i, outputStream: &o)\n').length > 0);
  expect('(c) leaves import NetworkExtension to rule (f)', ruleNetworkOnlyInClient('F', 'import NetworkExtension\n').length === 0);
  expect('(c) leaves a comment naming NWConnection alone', ruleNetworkOnlyInClient('F', '// NWConnection lives in DoorClient.swift\nlet x = 1\n').length === 0);
  expect('(c) catches an http literal', ruleHttpsOnly('F', 'c.scheme = "http"\n').length > 0);
  const seams = { injection: [], transport: [], debugDecls: [] };
  expect('(d) catches a launch argument read outside DEBUG', ruleDebugSeams('F', 'let a = ProcessInfo.processInfo.arguments\n', seams).length > 0);
  expect('(d) leaves one inside DEBUG alone', ruleDebugSeams('F', '#if DEBUG\nlet a = ProcessInfo.processInfo.arguments\n#endif\n', seams).length === 0);
  expect('(d) catches a loopback literal outside DEBUG', ruleDebugSeams('F', 'let h = "127.0.0.1"\n', seams).length > 0);
  expect('(d) catches a Loopback type outside DEBUG', ruleDebugSeams('F', 'struct DirectLoopbackTransport {}\n', seams).length > 0);
  expect('(d) catches a seam argument written outside DEBUG', ruleDebugSeams('F', 'let a = "-TortieDebugDoorEndpoint"\n', seams).length > 0);
  const seamsIn = { injection: [], transport: [], debugDecls: [] };
  expect('(d) collects a seam argument and its loopback inside DEBUG', ruleDebugSeams('F', '#if DEBUG\nlet a = "-TortieDebugDoorEndpoint"\nlet h = "127.0.0.1"\n#endif\n', seamsIn).length === 0 && seamsIn.arguments?.length === 1 && seamsIn.loopback?.length === 1);
  const okPlist = {
    NSCameraUsageDescription: 'Tortie uses the camera only to read the pairing code your Mac shows.',
    UIUserInterfaceStyle: 'Dark'
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
  expect('(e) accepts a plist with no ATS and no local network string', rulePlist(okPlist, pbxApp()).length === 0);
  expect('(e) catches the ATS dictionary brought back', rulePlist({ ...okPlist, NSAppTransportSecurity: { NSExceptionDomains: { 'ts.net': { NSIncludesSubdomains: true } } } }, pbxApp()).length > 0);
  expect('(e) catches arbitrary loads', rulePlist({ ...okPlist, NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } }, pbxApp()).length > 0);
  expect('(e) catches the local network string brought back', rulePlist({ ...okPlist, NSLocalNetworkUsageDescription: 'Tortie reaches your Mac directly.' }, pbxApp()).length > 0);
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

  // (c), the sends.
  expect('(c) catches a request sent from a screen', ruleSendsOnlyFromClient('Screens/F.swift', 'let (d, _) = try await s.data(for: r)\n').length > 0);
  expect('(c) catches a task made outside the client', ruleSendsOnlyFromClient('F', 'let t = s.dataTask(with: r)\n').length > 0);
  expect('(c) catches an NWConnection made outside the client', ruleSendsOnlyFromClient('F', 'let c = NWConnection(host: h, port: p, using: .tls)\n').length > 0);
  expect('(c) catches a send outside the client', ruleSendsOnlyFromClient('F', 'c.send(content: d, completion: .idempotent)\n').length > 0);
  expect("(c) leaves a string's data(using:) alone", ruleSendsOnlyFromClient('F', 'let d = "x".data(using: .utf8)\n').length === 0);
  // (e), widened at 316.3; the two keys refused at 330.
  const pbxOk = pbxApp();
  expect('(e) catches the local network string injected by a build setting', ruleInfoPlistSource(pbxApp('        INFOPLIST_KEY_NSLocalNetworkUsageDescription = "Tortie reaches your Mac directly.";\n')).findings.length > 0);
  expect('(e) catches an ATS exception in another plist', refusedPlistKey(plistBaseKey('NSAppTransportSecurity~iphone')) !== null);
  expect('(e) catches the export-compliance key an agent may not write', rulePlist({ ...okPlist, ITSAppUsesNonExemptEncryption: false }, pbxOk).length > 0);
  expect('(e) catches a background task identifier', rulePlist({ ...okPlist, BGTaskSchedulerPermittedIdentifiers: ['x'] }, pbxOk).length > 0);
  expect('(e) catches the Background Modes capability in the project', rulePlist(okPlist, `${pbxOk} SystemCapabilities = { com.apple.BackgroundModes = { enabled = 1; }; };`).length > 0);
  expect('(f) catches the NetworkExtensions capability in the project', ruleNoVpn('project.pbxproj', 'SystemCapabilities = { com.apple.NetworkExtensions.iOS = { enabled = 1; }; };').length > 0);

  // (l) no Tailscale in the phone.
  const lRun = (files = [], pbx = null, xc = [], dir = false) => ruleNoTailscale([{ name: 'Tortie/Screens/F.swift', source: 'let x = 1\n' }, ...files], pbx, xc, dir).findings;
  expect('(l) passes an app with no Tailscale in it', lRun().length === 0);
  expect('(l) catches the Tailnet folder back', lRun([], null, [], true).length > 0);
  expect('(l) catches a file in Tailnet/', lRun([{ name: 'Tortie/Tailnet/Node.swift', source: 'let y = 2\n' }]).length > 0);
  expect('(l) catches TailscaleKit imported by a screen', lRun([{ name: 'Tortie/Screens/G.swift', source: 'import TailscaleKit\n' }]).length > 0);
  expect('(l) catches TailscaleKit imported by a test', lRun([{ name: 'TortieTests/T.swift', source: '@testable import TailscaleKit\n' }]).length > 0);
  expect('(l) catches a single symbol imported from TailscaleKit', lRun([{ name: 'Tortie/Screens/G.swift', source: 'import class TailscaleKit.TailscaleNode\n' }]).length > 0);
  expect('(l) catches TailscaleKit imported in backticks', lRun([{ name: 'TortieTests/T.swift', source: '@testable import `TailscaleKit`\n' }]).length > 0);
  expect('(l) catches TailscaleNode named', lRun([{ name: 'Tortie/Screens/G.swift', source: 'var n: TailscaleNode?\n' }]).length > 0);
  expect('(l) catches a tailscale_ symbol called', lRun([{ name: 'Tortie/Door/G.swift', source: 'let h = tailscale_new()\n' }]).length > 0);
  expect('(l) leaves TailscaleKit named in a comment or a string alone', lRun([{ name: 'Tortie/Screens/G.swift', source: '// no TailscaleKit\nlet s = "TailscaleKit"\n' }]).length === 0);
  expect('(l) catches @_exported', lRun([{ name: 'Tortie/Screens/G.swift', source: '@_exported import Foundation\n' }]).length > 0);
  expect('(l) catches a background task', lRun([{ name: 'Tortie/App/A.swift', source: 'let t = UIApplication.shared.beginBackgroundTask { }\n' }]).length > 0);
  expect('(l) catches a scheduled background refresh', lRun([{ name: 'Tortie/App/A.swift', source: 'import BackgroundTasks\nlet s = BGTaskScheduler.shared\n' }]).length > 0);
  expect('(l) catches the framework back in the project', lRun([], '316C1 /* TailscaleKit.xcframework */ = {isa = PBXFileReference; path = ../build/vendor/tailscalekit/TailscaleKit.xcframework; };').length > 0);
  expect('(l) catches any xcframework in the project', lRun([], '316C1 /* Other.xcframework */ = {isa = PBXFileReference; path = Other.xcframework; };').length > 0);
  expect('(l) catches a build phase that builds', lRun([], 'shellScript = "make -C ../x ios-fat\\n";').length > 0);
  expect('(l) catches a build phase that runs make by its full path', lRun([], 'shellScript = "have=$(/usr/bin/make -C x)\\n";').length > 0);
  expect('(l) leaves a build phase that only reads alone', lRun([], 'shellScript = "want=$(/usr/bin/plutil -extract v raw -o - \\"$f\\")\\n";').length === 0);
  expect('(l) catches the vendoring named in an xcconfig', lRun([], null, [{ name: 'X.xcconfig', text: 'FRAMEWORK_SEARCH_PATHS = ../build/vendor/tailscalekit\n' }]).length > 0);

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

  // (n) the client key (Phase 330).
  const mintOk = [
    'struct K {',
    '    func mint() throws {',
    '        let tag = "tortie.client." + x',
    '        let enclave = SecureEnclave.isAvailable',
    '        var p: [String: Any] = [kSecAttrIsPermanent as String: true, kSecAttrApplicationTag as String: Data(tag.utf8)]',
    '        if enclave {',
    '            guard let access = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, .privateKeyUsage, nil) else { throw E() }',
    '            p[kSecAttrAccessControl as String] = access',
    '        } else {',
    '            p[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly',
    '        }',
    '        var a: [String: Any] = [kSecPrivateKeyAttrs as String: p]',
    '        if enclave {',
    '            a[kSecAttrTokenID as String] = kSecAttrTokenIDSecureEnclave',
    '        }',
    '        _ = SecKeyCreateRandomKey(a as CFDictionary, nil)',
    '    }',
    '}',
    ''
  ].join('\n');
  const runOk = 'final class F {\n    func run(_ p: P) async -> O {\n        let outcome = await attempt(p)\n        if case .failed = outcome {\n            store.clientKeys.delete(tag: p.clientKey.tag)\n        }\n        return outcome\n    }\n}\n';
  const ckRun = (src, run = runOk) => ruleClientKey([{ name: 'Door/Keys.swift', source: src }], 'Door/Pairing.swift', run).findings;
  expect('(n) passes a client key made ThisDeviceOnly, tagged, in the enclave when it is there', ckRun(mintOk).length === 0);
  expect('(n) catches the enclave path without privateKeyUsage', ckRun(mintOk.replace('ThisDeviceOnly, .privateKeyUsage, nil', 'ThisDeviceOnly, [], nil')).length > 0);
  expect('(n) catches an access control that can leave the phone', ckRun(mintOk.replace('kSecAttrAccessibleWhenUnlockedThisDeviceOnly, .privateKeyUsage', 'kSecAttrAccessibleWhenUnlocked, .privateKeyUsage')).length > 0);
  const sharedAccess = '        guard let shared = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, enclave ? .privateKeyUsage : [], nil) else { throw E() }\n        p[kSecAttrAccessControl as String] = shared\n';
  expect('(n) catches the shape before the fix round: one access control for both paths, made outside the enclave’s if', ckRun(mintOk.replace('        if enclave {\n            guard let access', `${sharedAccess}        if enclave {\n            guard let access`)).length > 0);
  expect('(n) catches an access control made on the software path', ckRun(mintOk.replace('        } else {\n', `        } else {\n            p[kSecAttrAccessControl as String] = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, .privateKeyUsage, nil)\n`)).length > 0);
  expect('(n) catches an access control under a negated enclave', ckRun(mintOk.replace('        if enclave {\n            guard let access', '        if !enclave {\n            guard let access')).length > 0);
  expect('(n) does not take an earlier binding of isAvailable for the block’s own if', ckRun(mintOk.replace('        if enclave {\n            guard let access', '        if tag.isEmpty {\n            guard let access')).length > 0);
  expect('(n) no longer refuses a flag-less access control inside the enclave’s if (the fix round’s reason was false)', ckRun(mintOk.replace('.privateKeyUsage, nil)', 'enclave ? .privateKeyUsage : [], nil)')).length === 0);
  expect('(n) catches a software path that names no accessibility of its own', ckRun(mintOk.replace('            p[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly\n', '            p[kSecAttrLabel as String] = "k"\n')).length > 0);
  expect('(n) does not take the certificate’s own accessibility for the key’s', ckRun(`${mintOk.replace('            p[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly\n', '            p[kSecAttrLabel as String] = "k"\n')}struct C {\n    func adopt() {\n        let q: [String: Any] = [kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]\n        _ = SecItemAdd(q as CFDictionary, nil)\n    }\n}\n`).length > 0);
  expect('(n) catches the enclave asked for without asking whether it is there', ckRun(mintOk.replace('        if enclave {\n            a[kSecAttrTokenID as String] = kSecAttrTokenIDSecureEnclave\n        }\n', '        a[kSecAttrTokenID as String] = kSecAttrTokenIDSecureEnclave\n')).length > 0);
  expect('(n) catches a key that is not permanent', ckRun(mintOk.replace('kSecAttrIsPermanent as String: true', 'kSecAttrIsPermanent as String: false')).length > 0);
  expect('(n) catches a key with no tag', ckRun(mintOk.replace(', kSecAttrApplicationTag as String: Data(tag.utf8)', '')).length > 0);
  expect('(n) catches an attempt that keeps its key when it fails', ckRun(mintOk, runOk.replace('            store.clientKeys.delete(tag: p.clientKey.tag)\n', '')).length > 0);
  expect('(n) catches no client key made at all', ckRun('let x = 1\n').length > 0);

  // (o) the app's own manifest, the bundle's only one.
  const reasons = (cat, r) => ({ NSPrivacyAccessedAPIType: cat, NSPrivacyAccessedAPITypeReasons: [r] });
  const appOk = { NSPrivacyTracking: false, NSPrivacyTrackingDomains: [], NSPrivacyCollectedDataTypes: [], NSPrivacyAccessedAPITypes: [] };
  expect('(o) passes a manifest that tracks nothing and uses no required-reason API', ruleManifest('M', appOk, {}).findings.length === 0);
  expect('(o) catches tracking', ruleManifest('M', { ...appOk, NSPrivacyTracking: true }, {}).findings.length > 0);
  expect('(o) catches a category the app uses and does not declare', ruleManifest('M', appOk, { NSPrivacyAccessedAPICategoryUserDefaults: null }).findings.length > 0);
  expect('(o) catches a reason from another category', ruleManifest('M', { ...appOk, NSPrivacyAccessedAPITypes: [reasons('NSPrivacyAccessedAPICategoryFileTimestamp', '35F9.1')] }, {}).findings.length > 0);
  expect('(o) catches an unknown category', ruleManifest('M', { ...appOk, NSPrivacyAccessedAPITypes: [reasons('NSPrivacyAccessedAPICategoryMadeUp', 'C617.1')] }, {}).findings.length > 0);
  expect('(o) catches collected data', ruleManifest('M', { ...appOk, NSPrivacyCollectedDataTypes: [{ x: 1 }] }, {}).findings.length > 0);
  expect('(o) reads the app\'s required-reason uses from its text', requiredCategories([{ name: 'F', source: 'let u = ProcessInfo.processInfo.systemUptime\nlet d = UserDefaults.standard\n' }]).size === 2);
  expect('(o) leaves a required-reason name in a comment alone', requiredCategories([{ name: 'F', source: '// UserDefaults is never used\nlet x = 1\n' }]).size === 0);
  expect('(o) reads a manifest written as XML', ruleManifest('M', readPlistText('<plist version="1.0"><dict><key>NSPrivacyTracking</key><false/><key>NSPrivacyAccessedAPITypes</key><array/></dict></plist>\n'), {}).findings.length === 0);

  // (p) no tailnet key; the code and its one-shot secret kept nowhere.
  const offerOk = [
    'struct PairingOffer: Sendable, Equatable, CustomReflectable {',
    '    let secret: Data',
    '    var customMirror: Mirror { Mirror(self, children: [:]) }',
    '    private struct Wire: Decodable, CustomReflectable {',
    '        let ps: String',
    '        var customMirror: Mirror { Mirror(self, children: [:]) }',
    '    }',
    '    static func parse(_ payload: String) throws -> PairingOffer {',
    '        guard let wire = decoded(payload) else { throw E() }',
    '        guard let secret = decode(b64: wire.ps) else { throw E() }',
    '        return PairingOffer(secret: secret)',
    '    }',
    '    static func key(secret: Data) -> SymmetricKey { derive(secret: secret) }',
    '}',
    ''
  ].join('\n');
  const offerNamed = [
    { file: 'Door/Pairing.swift', line: 'guard let wire = decoded(payload) else { throw E() }', uses: 1, why: 'x' },
    { file: 'Door/Pairing.swift', line: 'guard let secret = decode(b64: wire.ps) else { throw E() }', uses: 1, why: 'x' }
  ];
  const pRun = (offer, named = offerNamed, extra = []) => ruleSecretKept([{ name: 'Door/Pairing.swift', source: offer }, ...extra], named).findings;
  expect('(p) passes a secret that is parsed and handed to its derivation', pRun(offerOk).length === 0);
  expect('(p) catches the secret logged', pRun(`${offerOk}func log(_ o: PairingOffer) { print(o.secret) }\n`).length > 0);
  expect('(p) catches the secret interpolated into a string', pRun(`${offerOk}func say(_ o: PairingOffer) -> String { "s \\(o.secret)" }\n`).length > 0);
  expect('(p) catches the secret through an alias', pRun(`${offerOk}func keep(_ o: PairingOffer) { let saved = o.secret; store(saved) }\n`).length > 0);
  expect('(p) catches the secret written to a file', pRun(`${offerOk}func keep(_ o: PairingOffer, _ u: URL) throws { try o.secret.write(to: u) }\n`).length > 0);
  expect('(p) catches the secret handed to a place that is not watched', pRun(`${offerOk}func keep(_ o: PairingOffer) { stash(value: o.secret) }\n`).length > 0);
  expect('(p) accepts a nil test', pRun(`${offerOk}func has(_ o: PairingOffer?) -> Bool { o?.secret != nil }\n`).length === 0);
  expect('(p) catches an encodable type holding the secret', pRun(offerOk.replace('private struct Wire: Decodable', 'private struct Wire: Codable')).length > 0);
  expect('(p) catches an encodable extension over a type holding the secret', pRun(`${offerOk}extension PairingOffer: Encodable {}\n`).length > 0);
  expect('(p) catches a struct holding the secret with no mirror', pRun(offerOk.replace('    var customMirror: Mirror { Mirror(self, children: [:]) }\n    private', '    private')).length > 0);
  expect('(p) catches a nested type holding the secret with no mirror', pRun(offerOk.replace('        var customMirror: Mirror { Mirror(self, children: [:]) }\n', '')).length > 0);
  expect('(p) catches a mirror that repeats the secret', pRun(offerOk.replace('var customMirror: Mirror { Mirror(self, children: [:]) }', 'var customMirror: Mirror { Mirror(self, children: ["s": secret]) }')).length > 0);
  expect('(p) accepts a named line and refuses one that grew', pRun(offerOk.replace('decode(b64: wire.ps)', 'decode(b64: wire.ps + wire.ps)')).length > 0);
  expect('(p) refuses a stale named entry', pRun(offerOk, [...offerNamed, { file: 'Door/Pairing.swift', line: 'gone(o.secret)', uses: 1, why: 'x' }]).length > 0);
  const madeUp = `tskey-auth-kQ7Rz${'CN'}TRL-Zx8Yw7Vu6Ts5Rq4P`;
  expect('(p) catches a string shaped like a real key', ruleNoRealKey('F', `// ${madeUp}\n`).length > 0);
  expect('(p) leaves a made-up key that says p316 alone', ruleNoRealKey('F', `let k = "tskey-auth-kP316X${'CN'}TRL-p316notarealkey00"\n`).length === 0);
  expect('(p) never repeats the key it found', !ruleNoRealKey('F', madeUp).join('').includes('Zx8Yw7'));
  expect('(p) catches a tailnet key named in Swift', ruleNoTailnetKey('F.swift', 'let tailnetKey: String? = nil\n').length > 0);
  expect('(p) catches tk read from a code', ruleNoTailnetKey('F.swift', 'let k = fields["tk"]\n').length > 0);
  expect('(p) catches tskey- in any file', ruleNoTailnetKey('F.json', '{ "k": "tskey-auth-kx" }').length > 0);
  expect('(p) catches tk in a fixture', ruleNoTailnetKey('F.json', '{"tk": "x"}').length > 0);
  expect('(p) leaves a word that holds tk alone', ruleNoTailnetKey('F.swift', 'let tkt = 1 // tk\n').length === 0);

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
  // (l) the other ways to stay up.
  expect('(l) catches performExpiringActivity', lRun([{ name: 'Tortie/Door/G.swift', source: 'ProcessInfo.processInfo.performExpiringActivity(withReason: "t") { _ in }\n' }]).length > 0);
  expect('(l) catches a background URLSession', lRun([{ name: 'Tortie/Door/C.swift', source: 'let c = URLSessionConfiguration.background(withIdentifier: "x")\n' }]).length > 0);
  expect('(l) catches a background fetch interval', lRun([{ name: 'Tortie/App/A.swift', source: 'UIApplication.shared.setMinimumBackgroundFetchInterval(60)\n' }]).length > 0);
  // (p) the code that carries the secret, and the values that hold it.
  const pIn = (extra) => ruleSecretKept([{ name: 'Door/Pairing.swift', source: offerOk }, ...extra], offerNamed).findings;
  const screen = (body) => ({ name: 'Screens/PairingScreen.swift', source: `final class M: CustomReflectable {\n    private var spent: String?\n    nonisolated var customMirror: Mirror { Mirror(self, children: [:]) }\n${body}\n}\n` });
  expect('(p) accepts a code compared, bound and handed to a watched label', pIn([screen('    func read(_ payload: String) {\n        guard payload != spent else { return }\n        spent = payload\n        stop(payload: payload)\n    }')]).length === 0);
  expect('(p) catches the raw code written to the Keychain', pIn([screen('    func read(_ payload: String) {\n        try? store.write(Data(payload.utf8), account: "last")\n    }')]).length > 0);
  expect('(p) catches the raw code printed', pIn([screen('    func read(_ payload: String) {\n        print(payload)\n    }')]).length > 0);
  expect('(p) catches the raw code under an alias', pIn([screen('    func read(_ payload: String) {\n        let raw = payload\n        keep(raw)\n    }')]).length > 0);
  expect('(p) accepts a closure that names its code', pIn([screen('    func scan() {\n        onCode { code in\n            spent = code\n        }\n    }')]).length === 0);
  expect('(p) catches a class holding the code with no mirror', pIn([{ name: 'Screens/PairingScreen.swift', source: 'final class M {\n    private var spent: String?\n}\n' }]).length > 0);
  expect('(p) accepts the mirror declared in an extension', pIn([{ name: 'Screens/PairingScreen.swift', source: 'final class M {\n    private var spent: String?\n}\nextension M: CustomReflectable {\n    nonisolated var customMirror: Mirror { Mirror(self, children: [:]) }\n}\n' }]).length === 0);
  expect('(p) catches an enum case carrying the secret with no mirror', pIn([{ name: 'Door/Keys.swift', source: 'enum Step {\n    case present(secret: Data)\n}\n' }]).length > 0);
  expect('(p) catches a description that repeats the secret', pIn([{ name: 'Door/Keys.swift', source: 'extension PairingOffer: CustomStringConvertible {\n    var description: String { "PairingOffer \\(secret)" }\n}\n' }]).length > 0);
  const camera = (bind) => ({ name: 'Screens/PairingScreen.swift', source: `final class S {\n    func out(_ objects: [AVMetadataObject]) {\n        guard let ${bind} = objects\n            .compactMap({ ($0 as? AVMetadataMachineReadableCodeObject)?.stringValue })\n            .first else { return }\n        _ = ${bind} == nil\n    }\n}\n` });
  expect('(p) accepts the camera reading bound to a watched name across a chain', pIn([camera('code')]).length === 0);
  expect('(p) catches the camera reading bound to a name it does not watch', pIn([camera('raw')]).length > 0);
  expect('(p) catches the launch code bound to a name it does not watch', pIn([{ name: 'App/TortieApp.swift', source: 'func launch() {\n    let raw = PairingDebugSeam.injectedPayload()\n    _ = raw\n}\n' }]).length > 0);
  expect('(p) accepts the launch code bound to a watched name', pIn([{ name: 'App/TortieApp.swift', source: 'func launch() {\n    var launchCode: String?\n    launchCode = PairingDebugSeam.injectedPayload()\n    _ = launchCode == nil\n}\n' }]).length === 0);
  expect('(p) does not read the seam\'s own declaration as a source', pIn([{ name: 'Door/Keys.swift', source: 'enum Seam {\n    static func injectedPayload(_ a: [String]) -> String? { nil }\n}\n' }]).length === 0);

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
  // (l) Core Location's relaunches.
  expect('(l) catches significant-change location monitoring', lRun([{ name: 'Tortie/Door/W.swift', source: 'import CoreLocation\nlet m = CLLocationManager()\nfunc arm() { m.startMonitoringSignificantLocationChanges() }\n' }]).length > 0);
  expect('(l) catches region monitoring', lRun([{ name: 'Tortie/Door/W.swift', source: 'func arm(_ m: CLLocationManager, _ r: CLRegion) { m.startMonitoring(for: r) }\n' }]).length > 0);
  expect('(l) catches visit monitoring and CLMonitor', lRun([{ name: 'Tortie/Door/W.swift', source: 'func arm(_ m: CLLocationManager) async { m.startMonitoringVisits(); _ = await CLMonitor("x") }\n' }]).length > 0);
  // (p) the other ways a code comes in.
  const reader = (body) => ({ name: 'Screens/StillReader.swift', source: `enum StillReader {\n${body}\n}\n` });
  expect("(p) catches Core Image's QR reader bound to an unwatched name", pIn([reader('    static func read(_ f: CIQRCodeFeature) { let raw = f.messageString; keep(raw) }')]).length > 0);
  expect("(p) catches Vision's payloadData bound to an unwatched name", pIn([reader('    static func read(_ o: VNBarcodeObservation) { let raw = o.payloadData; keep(raw) }')]).length > 0);
  expect('(p) catches a deep link whose code goes nowhere watched', pIn([{ name: 'App/TortieApp.swift', source: 'struct V {\n    var body: some View { EmptyView().onOpenURL { url in keep(url) } }\n}\n' }]).length > 0);
  expect('(p) catches the pasteboard read', pIn([reader('    static func read() { let raw = UIPasteboard.general.string; keep(raw) }')]).length > 0);
  expect('(p) accepts a deep link bound to a watched name', pIn([{ name: 'App/TortieApp.swift', source: 'struct V {\n    var body: some View { EmptyView().onOpenURL { code in _ = code == nil } }\n}\n' }]).length === 0);

  // (t) pinned mutual TLS 1.3 to a public name.
  const clientOk = [
    'struct DoorEndpoint {',
    '    static let publicPorts: Set<Int> = [8443, 10000]',
    '    static let nameSuffix = ".ts.net"',
    '}',
    'enum DoorHTTP {',
    '    enum Read {',
    '        static let contentLength = "content-length"',
    '        static let transferEncoding = "transfer-encoding"',
    '    }',
    '    static let close = "close"',
    '    static func length(_ text: String) -> Int? {',
    '        guard let number = Int(text), DoorNumber.isCount(number) else { return nil }',
    '        return number',
    '    }',
    '}',
    'final class DoorClient {',
    '    func present(_ p: Data, to door: DoorEndpoint) async throws -> PairAnswer {',
    '        let reply = try await exchange(method: "POST", target: "/pair", headers: [], body: p, door: door, identity: nil)',
    '        return try decode(reply)',
    '    }',
    '    private func signedGet(_ target: String, door: PairedDoor) async throws -> DoorReply {',
    '        try await exchange(method: "GET", target: target, headers: [], body: nil, door: door.endpoint, identity: door.identity)',
    '    }',
    '    func exchange(method: String, target: String, headers: [(String, String)], body: Data?, door: DoorEndpoint, identity: ClientIdentity?) async throws -> DoorReply {',
    '        let c = NWConnection(to: e, using: try Self.parameters(identity: identity))',
    '        return try await run(c)',
    '    }',
    '    static func parameters(identity: ClientIdentity?) throws -> NWParameters {',
    '        let tls = NWProtocolTLS.Options()',
    '        let options = tls.securityProtocolOptions',
    '        sec_protocol_options_set_min_tls_protocol_version(options, .TLSv13)',
    '        sec_protocol_options_set_verify_block(options, { _, trust, complete in',
    '            let matched = DoorPin.matches(sec_trust_copy_ref(trust).takeRetainedValue(), pin: pin)',
    '            complete(matched)',
    '        }, queue)',
    '        if let identity { sec_protocol_options_set_local_identity(options, sec_identity_create(identity.identity)!) }',
    '        return NWParameters(tls: tls, tcp: NWProtocolTCP.Options())',
    '    }',
    '}',
    'struct Reader {',
    '    mutating func read(_ found: [String: [String]]) throws {',
    '        if found[DoorHTTP.Read.transferEncoding] != nil { throw DoorFailure.malformed }',
    '        guard let lengths = found[DoorHTTP.Read.contentLength], lengths.count == 1,',
    '              let length = DoorHTTP.length(lengths[0]) else { throw DoorFailure.malformed }',
    '        _ = length',
    '    }',
    '}',
    ''
  ].join('\n');
  const pairingOk = 'struct PairingOffer {\n    static func parse(_ payload: String) throws -> PairingOffer {\n        guard DoorEndpoint.isPublicName(wire.host),\n              DoorEndpoint.publicPorts.contains(wire.port) else { throw E() }\n        return x\n    }\n}\n';
  const keysOk2 = 'struct PairedDoor {\n    let identity: ClientIdentity\n}\n';
  const armLine = (name) => `  ${name.includes('-') ? `'${name}'` : name}: { what: 'x', ends: 'sentence', list: true, raw: true, at: 'list-failure', expect: ['answerUnreadable'] },`;
  const hostileOk = `export const HOSTILE_ARMS = Object.freeze({\n${HOSTILE_HTTP_ARMS.map(armLine).join('\n')}\n});\n`;
  const copyOk = 'enum Copy {\n    static let answerUnreadable = "Tortie could not read your Mac’s answer."\n}\n';
  const tRun = ({ client = clientOk, pairing = pairingOk, keys = keysOk2, hostile = hostileOk, copy = copyOk } = {}) =>
    ruleClientTransport({ client, pairing, keys, files: [{ name: 'Door/DoorClient.swift', source: client }], hostile, copy }).findings;
  expect('(t) passes a pinned client with an identity on every paired read', tRun().length === 0);
  expect('(t) catches no local identity', tRun({ client: clientOk.replace('        if let identity { sec_protocol_options_set_local_identity(options, sec_identity_create(identity.identity)!) }\n', '') }).length > 0);
  expect('(t) catches a signed read with no identity', tRun({ client: clientOk.replace('identity: door.identity)', 'identity: nil)') }).length > 0);
  expect('(t) catches an exchange that names no identity', tRun({ client: clientOk.replace(', door: door.endpoint, identity: door.identity)', ', door: door.endpoint)') }).length > 0);
  expect('(t) catches a paired door whose identity is optional', tRun({ keys: 'struct PairedDoor {\n    let identity: ClientIdentity?\n}\n' }).length > 0);
  expect('(t) catches a verify block that completes true', tRun({ client: clientOk.replace('complete(matched)', 'complete(true)') }).length > 0);
  expect('(t) catches a verify block that never asks the pin', tRun({ client: clientOk.replace('let matched = DoorPin.matches(sec_trust_copy_ref(trust).takeRetainedValue(), pin: pin)', 'let matched = true') }).length > 0);
  expect('(t) catches TLS 1.2 as the minimum', tRun({ client: clientOk.replace('.TLSv13)', '.TLSv12)') }).length > 0);
  expect('(t) catches a maximum version set', tRun({ client: clientOk.replace('        return NWParameters(', '        sec_protocol_options_set_max_tls_protocol_version(options, .TLSv13)\n        return NWParameters(') }).length > 0);
  expect('(t) catches parameters with no TLS', tRun({ client: clientOk.replace('return NWParameters(tls: tls, tcp: NWProtocolTCP.Options())', 'return NWParameters.tcp') }).length > 0);
  expect('(t) catches another port set', tRun({ client: clientOk.replace('[8443, 10000]', '[8443, 10000, 443]') }).length > 0);
  expect('(t) catches a parse that takes any host', tRun({ pairing: pairingOk.replace('DoorEndpoint.isPublicName(wire.host),', '!wire.host.isEmpty,') }).length > 0);
  expect('(t) catches an IPv4 test back in the app', tRun({ client: `${clientOk}func isIPv4Literal(_ t: String) -> Bool { true }\n` }).length > 0);
  expect('(t) catches Transfer-Encoding taken', tRun({ client: clientOk.replace('        if found[DoorHTTP.Read.transferEncoding] != nil { throw DoorFailure.malformed }\n', '') }).length > 0);
  expect('(t) catches Content-Length not required once', tRun({ client: clientOk.replace('lengths.count == 1,', '!lengths.isEmpty,') }).length > 0);
  expect('(t) catches a length not read through DoorNumber', tRun({ client: clientOk.replace('guard let number = Int(text), DoorNumber.isCount(number) else { return nil }', 'guard let number = Int(text) else { return nil }') }).length > 0);
  expect('(t) catches a second connection made', tRun({ client: clientOk.replace('        return try await run(c)\n', '        let d = NWConnection(to: e, using: .tcp)\n        return try await run(c)\n') }).length > 0);
  expect('(t) catches a hostile arm gone', tRun({ hostile: hostileOk.replace(armLine('early-close'), '') }).length > 0);
  expect('(t) catches a hostile arm that ends in no sentence', tRun({ hostile: hostileOk.replace(`'not-json': { what: 'x', ends: 'sentence'`, `'not-json': { what: 'x', ends: 'drawn'`) }).length > 0);
  expect('(t) catches a hostile arm expecting a word Copy lacks', tRun({ copy: 'enum Copy {}\n' }).length > 0);
  expect('(t) catches no hostile door', tRun({ hostile: null }).length > 0);

  // (u) no DEBUG in Release.
  const adHocU = '        CODE_SIGN_IDENTITY = "-";\n';
  const schemeOk = { name: 'Tortie.xcscheme', text: '<ArchiveAction buildConfiguration = "Release" revealArchiveInOrganizer = "YES">\n</ArchiveAction>\n' };
  const pbxU = (projectRelease, appRelease) =>
    [
      '    CCCC00000001 /* Tortie */ = {',
      '      isa = PBXNativeTarget;',
      '      buildConfigurationList = CCCC00000002 /* Build configuration list for PBXNativeTarget "Tortie" */;',
      '      productType = "com.apple.product-type.application";',
      '    };',
      '    CCCC00000002 /* Build configuration list for PBXNativeTarget "Tortie" */ = {\n      isa = XCConfigurationList;\n      buildConfigurations = (\n        CCCC00000003 /* Debug */,\n        CCCC00000004 /* Release */,\n      );\n    };',
      '    CCCC00000010 /* Build configuration list for PBXProject "Tortie" */ = {\n      isa = XCConfigurationList;\n      buildConfigurations = (\n        CCCC00000011 /* Debug */,\n        CCCC00000012 /* Release */,\n      );\n    };',
      '    CCCC00000003 /* Debug */ = {\n      isa = XCBuildConfiguration;\n      buildSettings = {\n        SWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";\n      };\n      name = Debug;\n    };',
      `    CCCC00000004 /* Release */ = {\n      isa = XCBuildConfiguration;\n      buildSettings = {\n${appRelease}      };\n      name = Release;\n    };`,
      '    CCCC00000011 /* Debug */ = {\n      isa = XCBuildConfiguration;\n      buildSettings = {\n        GCC_PREPROCESSOR_DEFINITIONS = (\n          "DEBUG=1",\n          "$(inherited)",\n        );\n      };\n      name = Debug;\n    };',
      `    CCCC00000012 /* Release */ = {\n      isa = XCBuildConfiguration;\n      buildSettings = {\n${projectRelease}      };\n      name = Release;\n    };`,
      ''
    ].join('\n');
  const uRun = (projectRelease = adHocU, appRelease = adHocU, xc = [], schemes = [schemeOk]) => ruleNoDebugInRelease(pbxU(projectRelease, appRelease), xc, schemes).findings;
  expect('(u) passes DEBUG in Debug alone', uRun().length === 0);
  expect('(u) catches DEBUG in the app\'s Release conditions', uRun(adHocU, '        SWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";\n').length > 0);
  expect('(u) catches -DDEBUG in Release OTHER_SWIFT_FLAGS', uRun(adHocU, '        OTHER_SWIFT_FLAGS = "-D DEBUG";\n').length > 0);
  expect('(u) catches DEBUG=1 in the project\'s Release preprocessor list', uRun('        GCC_PREPROCESSOR_DEFINITIONS = (\n          "DEBUG=1",\n          "$(inherited)",\n        );\n').length > 0);
  expect('(u) catches DEBUG in Release for one SDK', uRun(adHocU, '        "SWIFT_ACTIVE_COMPILATION_CONDITIONS[sdk=iphoneos*]" = DEBUG;\n').length > 0);
  expect('(u) catches an xcconfig defining DEBUG', uRun(adHocU, adHocU, [{ name: 'R.xcconfig', text: 'SWIFT_ACTIVE_COMPILATION_CONDITIONS = $(inherited) DEBUG\n' }]).length > 0);
  expect('(u) leaves DEBUGGING and NDEBUG alone', uRun(adHocU, '        GCC_PREPROCESSOR_DEFINITIONS = "NDEBUG=1 P330_DEBUGGING=0";\n').length === 0);
  expect('(u) catches a scheme that archives Debug', uRun(adHocU, adHocU, [], [{ name: 'S.xcscheme', text: '<ArchiveAction buildConfiguration = "Debug" revealArchiveInOrganizer = "YES">' }]).length > 0);

  // (v) the phone always draws a sentence.
  const pairingEnums = 'enum PairingFailure: Error {\n    case badCode\n    case cancelled\n}\nenum PairingStep: Equatable {\n    case presenting\n    case findingName\n}\n';
  const wordsOk = 'enum DoorWords {\n    static func pairingSentence(for failure: PairingFailure) -> String {\n        switch failure {\n        case .badCode: return Copy.pairNotACode\n        case .cancelled: return Copy.notPaired\n        }\n    }\n    static func stepSentence(for step: PairingStep) -> String {\n        switch step {\n        case .presenting: return Copy.pairReaching\n        case .findingName: return Copy.pairNameNotYet\n        }\n    }\n}\n';
  const screenOk = 'final class PairingModel {\n    private(set) var line: String = Copy.notPaired\n    func read() {\n        line = DoorWords.stepSentence(for: .presenting)\n    }\n    func stop(_ f: PairingFailure) {\n        line = DoorWords.pairingSentence(for: f)\n    }\n}\n';
  const vRun = (words = wordsOk, screen = screenOk, pairing = pairingEnums) => rulePairingSentence(words, screen, pairing).findings;
  expect('(v) passes a sentence for every failure and step', vRun().length === 0);
  expect('(v) catches pairingSentence made optional again', vRun(wordsOk.replace('(for failure: PairingFailure) -> String {', '(for failure: PairingFailure) -> String? {').replace('case .cancelled: return Copy.notPaired', 'case .cancelled: return nil')).length > 0);
  expect('(v) catches a failure with no sentence', vRun(wordsOk, screenOk, pairingEnums.replace('    case cancelled\n', '    case cancelled\n    case nameNotFound\n')).length > 0);
  expect('(v) catches a step with no sentence', vRun(wordsOk.replace('        case .findingName: return Copy.pairNameNotYet\n', '        default: return Copy.pairReaching\n')).length > 0);
  expect('(v) catches an empty sentence', vRun(wordsOk.replace('case .cancelled: return Copy.notPaired', 'case .cancelled: return ""')).length > 0);
  expect('(v) catches line = nil', vRun(wordsOk, screenOk.replace('        line = DoorWords.stepSentence(for: .presenting)\n', '        line = nil\n')).length > 0);
  expect('(v) catches line made optional', vRun(wordsOk, screenOk.replace('private(set) var line: String = Copy.notPaired', 'private(set) var line: String? = Copy.notPaired')).length > 0);
  expect('(v) reads an enum\'s cases one or several to a line', (enumCases('enum E {\n    case a, b\n    case c(Int)\n    func f() { switch self { case .a: break } }\n}\n', 'E') ?? []).join() === 'a,b,c');

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
  const identity = `        CURRENT_PROJECT_VERSION = ${PHONE_BUILD};\n        MARKETING_VERSION = 1.0.0;\n        PRODUCT_BUNDLE_IDENTIFIER = com.itavero.tortie.phone;\n`;
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
  expect('(s) catches versions that disagree', sRun(pbxSign({ appRelease: his + identity.replace(`CURRENT_PROJECT_VERSION = ${PHONE_BUILD};`, 'CURRENT_PROJECT_VERSION = 4;') })).length > 0);
  const nextBuild = (text) => text.replace(`CURRENT_PROJECT_VERSION = ${PHONE_BUILD};`, 'CURRENT_PROJECT_VERSION = 4;');
  expect('(s) catches the app at a build this round does not upload, even when Debug and Release agree', sRun(pbxSign({ appDebug: adHoc + nextBuild(identity), appRelease: his + nextBuild(identity) })).length > 0);
  expect('(s) catches a test bundle at another build', sRun(pbxSign({ testRelease: `${adHoc}        CURRENT_PROJECT_VERSION = 2;\n` })).length > 0);
  expect('(s) accepts a test bundle at this build', sRun(pbxSign({ testRelease: `${adHoc}        CURRENT_PROJECT_VERSION = ${PHONE_BUILD};\n` })).length === 0);
  expect('(s) catches a marketing version that is not three numbers', sRun(pbxSign({ appDebug: adHoc + identity.replace('1.0.0', '1.0'), appRelease: his + identity.replace('1.0.0', '1.0') })).length > 0);
  expect('(s) catches a Debug configuration signed with an identity', sRun(pbxSign({ projectRelease: adHoc }).replace(/(BBBB00000011 \/\* Debug \*\/ = \{[\s\S]*?)CODE_SIGN_IDENTITY = "-";/, '$1CODE_SIGN_IDENTITY = "Apple Development";')).length > 0);
  expect('(s) catches a display name that is not Tortie', sRun(pbxSign(), [], { ...plistOk, CFBundleDisplayName: 'gmux' }).length > 0);
  expect('(s) catches a bundle id written into Info.plist', sRun(pbxSign(), [], { ...plistOk, CFBundleIdentifier: 'com.itavero.tortie.phone' }).length > 0);

  // (w) The entitlement: the (s) project with the app naming the file in both
  // configurations and a UI test target, which makes the three.
  const entitled = `        CODE_SIGN_ENTITLEMENTS = ${ENTITLEMENTS_FILE};\n`;
  const uiTarget = [
    '    BBBB00000020 /* TortieUITests */ = {',
    '      isa = PBXNativeTarget;',
    '      buildConfigurationList = BBBB00000021 /* Build configuration list for PBXNativeTarget "TortieUITests" */;',
    '      productType = "com.apple.product-type.bundle.ui-testing";',
    '    };',
    list('BBBB00000021', 'PBXNativeTarget', 'TortieUITests', 'BBBB00000022', 'BBBB00000023'),
    conf('BBBB00000022', 'Debug', adHoc),
    conf('BBBB00000023', 'Release', adHoc)
  ].join('\n');
  const pbxW = (over = {}) => pbxSign({ appDebug: adHoc + identity + entitled, appRelease: his + identity + entitled, tail: uiTarget, ...over });
  const keyFileOk = `export const PHONE_APP_TOPIC = '${PHONE_BUNDLE_ID}';\nexport const PHONE_APP_TEAM = '${RELEASE_TEAM}';\n`;
  const wIn = { entitlements: { 'aps-environment': 'development' }, pbxproj: pbxW(), entitlementFiles: [`ios/${ENTITLEMENTS_FILE}`], iosText: [{ name: 'ios/Tortie/Info.plist', text: '<plist/>' }], keyFile: keyFileOk };
  const wRun = (over = {}) => ruleEntitlement({ ...wIn, ...over }).findings;
  expect('(w) accepts aps-environment alone, named by the app twice, three targets, and the Mac signing for this app', wRun().length === 0);
  expect('(w) catches a second entitlement', wRun({ entitlements: { 'aps-environment': 'development', 'com.apple.developer.usernotifications.time-sensitive': true } }).length > 0);
  expect('(w) catches no entitlement', wRun({ entitlements: {} }).length > 0);
  expect('(w) catches production written into the file', wRun({ entitlements: { 'aps-environment': 'production' } }).length > 0);
  expect('(w) catches a file it cannot read', wRun({ entitlements: null }).length > 0);
  expect('(w) catches a second entitlements file', wRun({ entitlementFiles: [`ios/${ENTITLEMENTS_FILE}`, 'ios/TortieTests/T.entitlements'] }).length > 0);
  expect('(w) catches Release naming no entitlements file', wRun({ pbxproj: pbxW({ appRelease: his + identity }) }).length > 0);
  expect('(w) catches a test target naming one', wRun({ pbxproj: pbxW({ testRelease: `${adHoc}        CODE_SIGN_ENTITLEMENTS = T.entitlements;\n` }) }).length > 0);
  expect('(w) catches a fourth target, a service extension', wRun({ pbxproj: `${pbxW()}\n    BBBB00000030 /* Service */ = {\n      isa = PBXNativeTarget;\n      productType = "com.apple.product-type.app-extension";\n    };` }).length > 0);
  expect('(w) catches a SystemCapabilities block', wRun({ pbxproj: `${pbxW()}\n    SystemCapabilities = {\n      com.apple.Push = {\n        enabled = 1;\n      };\n    };` }).length > 0);
  expect('(w) catches an xcconfig naming an entitlements file', wRun({ xcconfigs: [{ name: 'E.xcconfig', text: `CODE_SIGN_ENTITLEMENTS = ${ENTITLEMENTS_FILE}\n` }] }).length > 0);
  expect('(w) catches remote-notification anywhere under ios/', wRun({ iosText: [{ name: 'ios/Tortie/Info.plist', text: '<string>remote-notification</string>' }] }).length > 0);
  expect('(w) catches the topic moved', wRun({ keyFile: keyFileOk.replace(PHONE_BUNDLE_ID, `${PHONE_BUNDLE_ID}.other`) }).length > 0);
  expect('(w) catches another team', wRun({ keyFile: keyFileOk.replace(RELEASE_TEAM, 'ABCDE12345') }).length > 0);
  expect('(w) catches the key file gone', wRun({ keyFile: null }).length > 0);
  expect('(w) leaves a topic in a comment alone and reads the one const', wRun({ keyFile: `// PHONE_APP_TOPIC = 'x'\n${keyFileOk}` }).length === 0);

  // (x) The alert's refusals, over a minimal app that keeps every one.
  const xApp = {
    [ALERT_FILES.system]:
      'import UserNotifications\nfinal class SystemPushAddressing {\n  func ask() async { _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert]) }\n  #if DEBUG\n  func address() {}\n  #else\n  func address() { UIApplication.shared.registerForRemoteNotifications() }\n  #endif\n}\n',
    [ALERT_FILES.delegate]: 'import UserNotifications\nfinal class AppDelegate {\n  func tap(_ r: UNNotificationResponse) { AlertInbox.shared.post(AlertTap.parse(r.notification.request.content.userInfo)) }\n}\n',
    [ALERT_FILES.alerts]:
      'enum PushEnvironment {\n  case development, production\n  #if DEBUG\n  static let current: PushEnvironment = .development\n  #else\n  static let current: PushEnvironment = .production\n  #endif\n}\nenum AlertTap {\n  case list\n  static func parse(_ userInfo: [AnyHashable: Any]) -> AlertTap { _ = userInfo["tortie"]; return .list }\n}\n',
    [ALERT_FILES.pairing]:
      'private struct Inner: Encodable {\n  let apt: String?\n  let ape: String?\n}\nfinal class Flow {\n  func run(askForAlerts: () async -> Int?) async {\n    switch answer {\n    case .pending(let sends):\n      if sends, !asked { _ = await askForAlerts() }\n    case .refused:\n      break\n    }\n  }\n}\n',
    [ALERT_FILES.keys]: 'private struct Record: Codable {\n  let apt: String?\n  let ape: String?\n}\n',
    [ALERT_FILES.screen]: 'final class Model {\n  func read() async { _ = await door.pair(p, askForAlerts: { await alerts.askForPairing() }) { _ in } }\n}\n',
    [ALERT_FILES.app]: 'final class AppModel {\n  func check() async {\n    guard kept.macSends else { return }\n    let a = await alerts.authorization()\n    let c = a == .authorized ? await alerts.currentAddress() : nil\n  }\n}\n'
  };
  const xRun = (edits = {}, tests = []) =>
    ruleAlerts(
      Object.entries({ ...xApp, ...edits }).filter(([, source]) => source !== null).map(([name, source]) => ({ name, source })),
      tests
    ).findings;
  const xEdit = (file, from, to) => {
    const text = xApp[file];
    if (!text.includes(from)) selfFailures.push(`(x) fixture: ${file} holds no ${JSON.stringify(from)}`);
    return { [file]: text.replace(from, to) };
  };
  expect('(x) accepts the app that keeps every refusal', xRun().length === 0);
  expect('(x) catches the registration in the #if DEBUG arm', xRun(xEdit(ALERT_FILES.system, '  func address() {}\n  #else\n  func address() { UIApplication.shared.registerForRemoteNotifications() }', '  func address() { UIApplication.shared.registerForRemoteNotifications() }\n  #else\n  func address() {}')).length > 0);
  expect('(x) catches the registration outside #if DEBUG', xRun(xEdit(ALERT_FILES.system, '  #endif\n}', '  #endif\n  func again() { UIApplication.shared.registerForRemoteNotifications() }\n}')).length > 0);
  expect('(x) catches the registration in another file', xRun(xEdit(ALERT_FILES.delegate, '}\n', '  func r() { UIApplication.shared.registerForRemoteNotifications() }\n}\n')).length > 0);
  expect('(x) catches a second question', xRun(xEdit(ALERT_FILES.delegate, '}\n', '  func q() { UNUserNotificationCenter.current().requestAuthorization(options: []) { _, _ in } }\n}\n')).length > 0);
  expect('(x) catches the notification center named in a screen', xRun({ 'Screens/ListScreen.swift': 'let c = UNUserNotificationCenter.current()\n' }).length > 0);
  expect('(x) catches userInfo read in a screen', xRun({ 'Screens/ListScreen.swift': 'func f(_ n: UNNotification) { _ = n.request.content.userInfo }\n' }).length > 0);
  expect('(x) catches the delegate handing the tap nowhere', xRun(xEdit(ALERT_FILES.delegate, 'AlertInbox.shared.post(AlertTap.parse(r.notification.request.content.userInfo))', 'AlertInbox.shared.post(.list)')).length > 0);
  expect('(x) catches production under DEBUG', xRun(xEdit(ALERT_FILES.alerts, 'static let current: PushEnvironment = .development', 'static let current: PushEnvironment = .production')).length > 0);
  expect('(x) catches development in the #else', xRun(xEdit(ALERT_FILES.alerts, 'static let current: PushEnvironment = .production', 'static let current: PushEnvironment = .development')).length > 0);
  expect('(x) catches apt declared outside the presentation and its record', xRun({ 'Screens/ListScreen.swift': 'struct Sneak { let apt: String }\n' }).length > 0);
  expect('(x) catches apt spelled by hand in a string', xRun({ 'Screens/ListScreen.swift': 'let k = "apt"\n' }).length > 0);
  expect('(x) catches the record without ape', xRun(xEdit(ALERT_FILES.keys, '  let ape: String?\n', '')).length > 0);
  for (const [name, line] of [
    ['setBadgeCount', 'center.setBadgeCount(0)'],
    ['applicationIconBadgeNumber', 'UIApplication.shared.applicationIconBadgeNumber = 0'],
    ['print(', 'print(token)'],
    ['NSLog', 'NSLog("%@", token)'],
    ['Logger(', 'let log = Logger()'],
    ['didReceiveRemoteNotification', 'func application(_ a: UIApplication, didReceiveRemoteNotification u: [AnyHashable: Any]) {}'],
    ['content-available', 'let k = "content-available"']
  ]) {
    expect(`(x) catches ${name}`, xRun({ 'Screens/ListScreen.swift': `${line}\n` }).length > 0);
  }
  expect('(x) catches a test naming the class that registers', xRun({}, [{ name: 'TortieTests/T.swift', source: 'let s = SystemPushAddressing.shared\n' }]).length > 0);
  expect('(x) catches the pairing asking outside the pending arm', xRun(xEdit(ALERT_FILES.pairing, '    switch answer {', '    _ = await askForAlerts()\n    switch answer {')).length > 0);
  expect('(x) catches the pairing asking whatever the Mac said', xRun(xEdit(ALERT_FILES.pairing, 'if sends, !asked { _ = await askForAlerts() }', 'if !asked { _ = await askForAlerts() }')).length > 0);
  expect('(x) catches the pairing asking twice', xRun(xEdit(ALERT_FILES.pairing, 'if sends, !asked { _ = await askForAlerts() }', 'if sends, !asked { _ = await askForAlerts(); _ = await askForAlerts() }')).length > 0);
  expect('(x) catches the screen asking before it presents', xRun(xEdit(ALERT_FILES.screen, 'func read() async { _ = await door.pair(p, askForAlerts: { await alerts.askForPairing() })', 'func read() async { _ = await alerts.askForPairing(); _ = await door.pair(p, askForAlerts: { nil })')).length > 0);
  expect('(x) catches the launch check reading iOS with no guard on macSends', xRun(xEdit(ALERT_FILES.app, '    guard kept.macSends else { return }\n', '')).length > 0);
  expect('(x) catches iOS read outside the launch check', xRun({ 'Screens/ListScreen.swift': 'func f() async { _ = await alerts.authorization() }\n' }).length > 0);
}

// ---------------------------------------------------------------------------
// Run the rules over the tree
// ---------------------------------------------------------------------------

/** Every rule this gate holds. (m) and (q) were retired in Phase 330 with the tailnet node; (w) and (x) are Phase 316.5's. */
export const RULE_IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'x'];

const results = {};
const record = (id, title, findings, said) => {
  results[id] = { ok: findings.length === 0, title, findings, said };
};
const missing = (path) => (existsSync(path) ? [] : [`${rel(path)} does not exist`]);

if (!existsSync(IOS) || !statSync(IOS).isDirectory()) {
  for (const id of RULE_IDS) record(id, 'the app', [`${rel(IOS)} does not exist, so there is no app to read`], '');
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
      if (p !== DOOR_CLIENT) f.push(...ruleSendsOnlyFromClient(rel(p), read(p)));
      f.push(...ruleNoUrlLoading(rel(p), read(p)));
      f.push(...ruleHttpsOnly(rel(p), read(p)));
    }
    record(
      'c',
      'the network is DoorClient.swift, Network.framework over TLS, and only the client sends',
      f,
      `NWConnection, NWParameters, NWEndpoint, NWProtocolTLS, sec_protocol_options_* and import Network only in Door/DoorClient.swift; no URLSession, URLRequest, URLSessionConfiguration or ProxyConfiguration in ${String(appSwift.length)} app files; every send from Door/DoorClient.swift; no http:// literal`
    );
  }
  // (d)
  {
    const seams = { injection: [], transport: [], debugDecls: [] };
    const f = [...missing(TRANSPORT)];
    for (const p of appSwift) f.push(...ruleDebugSeams(rel(p), read(p), seams));
    if (existsSync(TRANSPORT) && !seams.transport.some((s) => s.startsWith(rel(TRANSPORT)))) {
      f.push(`${rel(TRANSPORT)} holds no transport type inside #if DEBUG, so the door endpoint seam is missing or unguarded`);
    }
    if (seams.injection.length === 0) f.push('no launch argument is read inside #if DEBUG anywhere, so the pairing payload injection the Simulator needs is missing');
    const argued = seams.arguments ?? [];
    for (const want of DEBUG_SEAM_ARGUMENTS) {
      if (!argued.some((a) => a.value === want)) f.push(`no app file names the DEBUG seam ${want} inside #if DEBUG, so that seam is missing or unguarded`);
    }
    const endpoint = argued.find((a) => a.value === '-TortieDebugDoorEndpoint');
    if (endpoint !== undefined) {
      const loop = (seams.loopback ?? []).filter((l) => l.name === endpoint.name);
      if (loop.length === 0 || loop.some((l) => l.value !== '127.0.0.1')) f.push(`${endpoint.name} holds the door endpoint seam without "127.0.0.1" as the one host it takes`);
      const { bare } = lexSwift(read(join(ROOT, endpoint.name)));
      if (!/==\s*loopbackHost\b|==\s*"127\.0\.0\.1"/.test(bare)) f.push(`${endpoint.name}'s door endpoint seam never compares the host it is handed with 127.0.0.1`);
    }
    record('d', `the ${['none', 'one', 'two', 'three', 'four', 'five', 'six'][DEBUG_SEAM_ARGUMENTS.length] ?? String(DEBUG_SEAM_ARGUMENTS.length)} DEBUG seams exist and sit inside #if DEBUG`, f, `transport seam at ${seams.transport.join(', ') || 'nowhere'}; injection read at ${seams.injection.join(', ') || 'nowhere'}; ${String(argued.length)} seam argument(s) inside #if DEBUG (${[...new Set(argued.map((a) => a.value))].join(', ')})`);
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
      'Info.plist has no ATS key, no local network string and no background mode',
      f,
      `no NSAppTransportSecurity and no NSLocalNetworkUsageDescription, by the name CFBundle reads; ${String(lists)} property list(s) read by CoreFoundation, every key written plainly; ${String(configurations)} app configuration(s), each built from ${APP_INFO_PLIST} with nothing generated or preprocessed into it`
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

  // Every Swift file under ios/, named relative to ios/, for (l); the app's
  // own, named relative to the app folder, for (p) as for (k).
  const iosSwift = [...appSwift, ...testSwift].map((p) => ({ name: relative(IOS, p).split(sep).join('/'), source: read(p) }));
  const appFiles = appSwift.map((p) => ({ name: rel(p), source: read(p) }));
  const pbxPath = join(IOS, 'Tortie.xcodeproj', 'project.pbxproj');
  const pbx = existsSync(pbxPath) ? read(pbxPath) : null;
  const xcconfigsAll = allText.filter((q) => q.endsWith('.xcconfig')).map((q) => ({ name: rel(q), text: read(q) }));

  // (l)
  {
    const r = ruleNoTailscale(iosSwift, pbx, xcconfigsAll, existsSync(join(APP, TAILNET_DIR)));
    const f = [...r.findings];
    if (pbx === null) f.push(`${rel(pbxPath)} does not exist, so the project cannot be read for a framework or a build phase`);
    record(
      'l',
      'no Tailscale in the phone, and nothing keeps it running in the background',
      f,
      `no ios/Tortie/${TAILNET_DIR}/; ${String(r.said.files)} Swift file(s) under ios/ import and name no TailscaleKit, TailscaleNode or tailscale_ symbol, and nothing is @_exported; the project and ${String(xcconfigsAll.length)} xcconfig(s) name no TailscaleKit, .xcframework or vendored build; ${String(r.said.phases)} build phase(s), none of which fetches or builds; no background task, schedule or monitoring in the app`
    );
  }
  // (n)
  {
    const r = ruleKeychain(appFiles);
    const k = ruleClientKey(appFiles, rel(PAIRING), existsSync(PAIRING) ? read(PAIRING) : null);
    record(
      'n',
      'every Keychain item is ThisDeviceOnly and never synchronised, and the client key is the enclave\'s where there is one',
      [...r.findings, ...k.findings],
      `${String(r.said.adds)} SecItemAdd call(s); ${String(r.said.thisDevice)} ThisDeviceOnly accessibility value(s) named, and no other; ${String(k.said.makers)} file(s) make a client key, ThisDeviceOnly by construction on both paths (the enclave's access control with .privateKeyUsage, made only inside the if on SecureEnclave.isAvailable; the software key's own kSecAttrAccessible), in the Secure Enclave only when it is available; every attempt that ends unpaired deletes its key by its tag`
    );
  }
  // (o)
  {
    const f = [];
    const said = [];
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
    record('o', "the app's own privacy manifest exists and declares every category its Swift uses", f, said.join('; '));
  }
  // (p)
  {
    const files = appSwift.map((p) => ({ name: relative(APP, p).split(sep).join('/'), source: read(p) }));
    const r = ruleSecretKept(files);
    const f = [...r.findings];
    for (const p of allText) f.push(...ruleNoTailnetKey(rel(p), read(p)));
    const scanned = [...allText, ...walk(join(ROOT, 'build', 'p316'), (n) => /\.(mjs|mts|ts|js|json|md|swift|txt)$/.test(n))];
    for (const p of scanned) f.push(...ruleNoRealKey(rel(p), read(p)));
    record(
      'p',
      'no tailnet key anywhere, and the code and its one-shot secret are kept nowhere',
      f,
      `${String(allText.length)} files under ios/ name no tk, tailnetKey or authKey and hold no tskey-; ${String(r.said.mentions)} mention(s) of the one-shot secret, or of the code that carries it, in the app: ${String(r.said.proved)} proved by their shape, ${String(r.said.named)} named in ${String(KEY_NAMED.length)} entries; ` +
        `${String(r.said.sources)} place(s) a code enters, each bound to a watched name; ${String(r.said.holders)} type(s) holding it, each mirroring itself without it; ` +
        `no encodable type holds it, and ${String(scanned.length)} files under ios/ and build/p316/ hold nothing shaped like a real key`
    );
  }

  // Phase 316.4. Every xcconfig under ios/, for (r), (s) and (u).
  const xcconfigs = xcconfigsAll;
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
  // (t)
  {
    const hostilePath = join(ROOT, 'build', 'p316', 'hostile-door.mjs');
    const r = ruleClientTransport({
      client: existsSync(DOOR_CLIENT) ? read(DOOR_CLIENT) : null,
      pairing: existsSync(PAIRING) ? read(PAIRING) : null,
      keys: existsSync(KEYS) ? read(KEYS) : null,
      files: appFiles,
      hostile: existsSync(hostilePath) ? read(hostilePath) : null,
      copy: existsSync(COPY_SWIFT) ? read(COPY_SWIFT) : null
    });
    record(
      't',
      'the client is pinned mutual TLS 1.3 to a public name, and reads HTTP by hand, bounded',
      r.findings,
      `a local identity on every paired connection (${String(r.said.identityCalls)} exchange(s) with one, and POST /pair alone with none); the verify block completes with DoorPin's answer; TLS 1.3 the minimum and nothing older; a .ts.net name at 8443 or 10000, checked by the parse; one Content-Length required, Transfer-Encoding refused, Connection: close; hostile-door.mjs names ${String(r.said.arms.length)} HTTP arm(s) (${r.said.arms.join(', ')}), each ending in a Copy sentence`
    );
  }
  // (u)
  {
    const schemes = allText.filter((q) => q.endsWith('.xcscheme')).map((q) => ({ name: rel(q), text: read(q) }));
    const r = ruleNoDebugInRelease(pbx, xcconfigs, schemes);
    record('u', 'no Release configuration defines DEBUG', r.findings, `${String(r.said.release)} Release configuration(s) and ${String(xcconfigs.length)} xcconfig(s) define no DEBUG in ${CONDITION_SETTINGS.join(', ')}; ${String(r.said.schemes)} scheme(s) archive Release`);
  }
  // (v)
  {
    const r = rulePairingSentence(existsSync(DOOR_WORDS) ? read(DOOR_WORDS) : null, existsSync(PAIRING_SCREEN) ? read(PAIRING_SCREEN) : null, existsSync(PAIRING) ? read(PAIRING) : null);
    record('v', 'the phone always draws a sentence', r.findings, `pairingSentence draws a Copy sentence for each of ${String(r.said.failures)} PairingFailure case(s) and stepSentence for each of ${String(r.said.steps)} PairingStep case(s), never nil or empty; PairingModel's line is a non-optional String, assigned a sentence ${String(r.said.assignments)} time(s)`);
  }
  // (w)
  {
    const f = [];
    const path = join(IOS, ...ENTITLEMENTS_FILE.split('/'));
    let entitlements = null;
    try {
      entitlements = existsSync(path) ? readPlistFile(path) : null;
    } catch (err) {
      f.push(`${rel(path)} could not be read: ${String(err?.message ?? err)}`);
    }
    const keyPath = join(ROOT, ...KEY_FILE_TS.split('/'));
    const r = ruleEntitlement({
      entitlements,
      pbxproj: pbx,
      xcconfigs,
      entitlementFiles: allText.filter((q) => q.endsWith('.entitlements')).map(rel).sort(),
      iosText: allText.map((q) => ({ name: rel(q), text: read(q) })),
      keyFile: existsSync(keyPath) ? read(keyPath) : null
    });
    f.push(...r.findings);
    record(
      'w',
      'aps-environment is the app\'s only entitlement, and the Mac signs for this app',
      f,
      `${ENTITLEMENTS_FILE} is exactly {"aps-environment":"development"}, named by ${String(r.said.named)} app configuration(s) and no other target; ${String(r.said.targets)} targets; no SystemCapabilities, no com.apple.Push; no remote-notification in ${String(r.said.files)} files under ios/; ${KEY_FILE_TS}'s topic and team are ${PHONE_BUNDLE_ID} and ${RELEASE_TEAM}`
    );
  }
  // (x)
  {
    const files = appSwift.map((p) => ({ name: relative(APP, p).split(sep).join('/'), source: read(p) }));
    const tests = testSwift.map((p) => ({ name: relative(IOS, p).split(sep).join('/'), source: read(p) }));
    const r = ruleAlerts(files, tests);
    record(
      'x',
      'the alert\'s refusals',
      r.findings,
      `registerForRemoteNotifications ${String(r.said.registrations)} time(s), in the #else of #if DEBUG in ${ALERT_FILES.system}; requestAuthorization ${String(r.said.asks)} time(s); UserNotifications named in ${r.said.unFiles.join(' and ') || 'no file'}; ` +
        `userInfo read ${String(r.said.userInfo)} time(s), inside AlertTap.parse or handed to it; PushEnvironment.current .development under DEBUG and .production in its #else (${String(r.said.arms)} arms); apt and ape declared ${String(r.said.fields)} time(s), by Inner and Record; ` +
        `iOS asked only for a Mac that says it can send: askForAlerts() ${String(r.said.flowAsks)} time(s) in the pending arm behind its word, askForPairing() ${String(r.said.pairingAsks)} time(s) inside the closure the pairing asks through, ${String(r.said.launchReads)} launch read(s) behind a guard on macSends; ` +
        `no badge write, service extension, background delivery, print or log in ${String(files.length)} app files, and no test of ${String(tests.length)} names the registration`
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
  process.stdout.write(`${TAG} FAIL. The phone app breaks a refusal build/p316/SPEC.md §4 S2 to S4 or build/p330/SPEC.md §6.4 names, or a scanner here stopped working.\n`);
  process.exit(1);
}
process.stdout.write(`${TAG} PASS. ${String(Object.keys(results).length)} rules over ${String(appSwift.length)} app files, ${String(testSwift.length)} test files and ${String(allText.length)} files under ios/; every scanner proved on its own fixtures first.\n`);
