#!/usr/bin/env node
/**
 * `npm run ablation:p316` — the attack on `conformance:ios` (Phases 316.2 and
 * 316.3, build/p316/SPEC.md §4 S2 and S3).
 *
 * A GREEN GATE IS ONLY EVIDENCE IF IT CAN GO RED. `conformance:ios` reads the
 * phone app as text for nineteen refusals, (a) to (s), and every one of them is
 * a line a later round can add in a hurry: a colour typed straight into a
 * screen, a sentence in a `Text`, a `URLSession` outside the door client, a
 * DEBUG seam that leaked into Release, a second ATS exception, a background
 * mode, a VPN entitlement, a web view, the person's words run through
 * markdown, a screenshot, a vector edited by hand, a sum on a number the door
 * sends that traps (k1 and k2 are the two the reverify of 2026-09-23 ended
 * the app with, put back exactly as they shipped), and from Phase 316.3 the
 * tailnet node's: TailscaleKit imported by a second file or by a test, the
 * node handed out of Node.swift, an ephemeral node, a background task, a build
 * phase that builds, its state backed up or kept in Caches, a Keychain item
 * that can leave the phone, a privacy manifest missing or wrong, and the
 * tailnet key logged, aliased, stored or typed in. 316.3's fix round added the
 * shapes its verification walked past the gate with: a background mode spelled
 * `~iphone`, `-iphoneos` or `~ipad`, or injected by an xcconfig; a scoped
 * NetworkExtension import, `@import` in Objective-C, `#import` in a header,
 * `-framework` in OTHER_LDFLAGS or an xcconfig; code coverage on;
 * `performExpiringActivity` and a background URLSession; the raw code, which
 * carries the key, kept in the Keychain, logged or bound to a name the rule
 * does not watch; and a value holding the key with its redacting mirror taken
 * out. Phase 316.4 added the first TestFlight build's: the brand master
 * shipped as the icon with its alpha channel, the icon laid on another ground
 * or given a transparent colour, a second picture or a dark appearance in the
 * icon set, a build naming no icon, asset symbols compiled into the app, his
 * team in Debug or on a second target, another team, Release signed by hand
 * or as a distribution identity, a profile named, the bundle id or the build
 * number moved in Release alone, the Home Screen name changed, and the team
 * set by an xcconfig. THIS SCRIPT PLANTS EACH ONE
 * IN A CLONE OF THE SHIPPING TREE AND PROVES IT REDDENS THE RULE THAT OWNS IT.
 *
 * THE DELTA RULE. The base is run first. An arm passes only when its own rule
 * was GREEN at the base and is RED with the plant, so a rule that was already
 * red proves nothing and says so. An arm whose anchor is gone from the tree
 * FAILS BY NAME — it never skips — because an ablation that quietly stops
 * applying is how a gate's proof rots.
 *
 * IT NEVER WRITES INTO THE WORKING TREE. Several builders work in one worktree
 * during a phase, so the plants go into a CLONE: `cp -Rc` (APFS clonefile) of
 * `ios/`, `src/`, the brand master rule (r) reads, and every entry of
 * `build/` but `vendor/` under
 * `/private/tmp/p316-ablation-<pid>`, with `package.json` and the tsconfigs
 * copied and `node_modules` and `build/vendor` symlinked (the vendored
 * framework and its Go cache are never copied, and an arm whose file resolves
 * under `build/vendor/` fails by name rather than write through the link), and
 * the clone's OWN `build/conformance-ios.mjs` run there, so rule (j) checks the
 * clone's own vectors against the clone's own sources. Each planted file is put
 * back (a planted NEW file is removed, a removed one written back) and its
 * sha256 checked against the working tree's before the next arm; the clone is
 * removed in a `finally` and on SIGINT, SIGTERM and SIGHUP; and the run ends by
 * asserting the working tree's own bytes never moved.
 *
 * It starts nothing but `conformance:ios` (one plain node, and the pinned tsx
 * for rule (j)). No Xcode, no Simulator, no Electron, no socket, nothing under
 * the person's home.
 *
 *   node build/p316/ablation-ios.mjs
 *   P316_ONLY=a1,h node build/p316/ablation-ios.mjs     named arms only
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32 } from 'node:zlib';
import { decodePng } from '../png-read.mjs';
import { ICON_MASTER, ICON_PATH, encodeRgbPng, flatten, groundOf } from './app-icon.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p316-ablation]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------------------
// The arms. Each names its rule, the file it plants into (relative to the
// clone), and an edit that must CHANGE that file or the arm fails by name.
// ---------------------------------------------------------------------------

const APP = 'ios/Tortie';
/** The first app Swift file under a screens directory, found rather than named. */
const aScreen = (root) => {
  const dir = join(root, APP, 'Screens');
  const names = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.swift')).sort() : [];
  return names.length === 0 ? null : `${APP}/Screens/${names[0]}`;
};
const aTest = (root) => {
  for (const d of ['ios/TortieUITests', 'ios/TortieTests']) {
    const dir = join(root, d);
    const names = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.swift')).sort() : [];
    if (names.length > 0) return `${d}/${names[0]}`;
  }
  return null;
};
/** The first app Swift file whose text matches `re`. */
const fileMatching = (root, re) => {
  const out = [];
  const walk = (dir) => {
    for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.swift')) out.push(p);
    }
  };
  walk(join(root, APP));
  const hit = out.sort().find((p) => re.test(readFileSync(p, 'utf8')));
  return hit === undefined ? null : relative(root, hit).split(sep).join('/');
};
const append = (text) => (src) => `${src}${src.endsWith('\n') ? '' : '\n'}${text}`;

const NODE = `${APP}/Tailnet/Node.swift`;
const PBX = 'ios/Tortie.xcodeproj/project.pbxproj';
const INFO = `${APP}/Info.plist`;
const ICON = ICON_PATH;
const ICON_SET_CONTENTS = `${APP}/Assets.xcassets/AppIcon.appiconset/Contents.json`;

/** The app's own privacy manifest, found rather than named. */
const appManifest = (root) => {
  const out = [];
  const walk = (dir) => {
    for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'PrivacyInfo.xcprivacy') out.push(p);
    }
  };
  walk(join(root, APP));
  return out.length === 0 ? null : relative(root, out.sort()[0]).split(sep).join('/');
};

/**
 * TailscaleKit's manifest's committed source, in the gate's order: a
 * `.xcprivacy` under build/ (not build/vendor/), else the pin, else the
 * script. Relative to `root`, or null.
 */
function frameworkManifestSource(root) {
  const found = [];
  const walk = (dir) => {
    for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (p !== join(root, 'build', 'vendor') && e.name !== 'node_modules') walk(p);
      } else if (e.name.endsWith('.xcprivacy')) found.push(p);
    }
  };
  walk(join(root, 'build'));
  if (found.length > 0) return relative(root, found.sort()[0]).split(sep).join('/');
  for (const name of ['build/tailscalekit-release.json', 'build/build-tailscalekit.mjs']) if (existsSync(join(root, name))) return name;
  return null;
}

/** A Background Modes or NetworkExtensions capability, as the project file records one. */
const capability = (id) => (src) =>
  src.replace(
    /(CreatedOnToolsVersion = [^;]+;)/,
    `$1\n\t\t\t\t\t\tSystemCapabilities = {\n\t\t\t\t\t\t\t${id} = {\n\t\t\t\t\t\t\t\tenabled = 1;\n\t\t\t\t\t\t\t};\n\t\t\t\t\t\t};`
  );

/** A string shaped like a real Tailscale key, built from parts so no file of this tree holds one. */
const REAL_SHAPED = ['tskey-auth-kQ7Rz', 'CN', 'TRL-', 'Zx8Yw7Vu6Ts5Rq4P'].join('');

/** Remove the `#if DEBUG` line opening the first region whose body matches `re`, and its `#endif`. */
function unguard(re) {
  return (src) => {
    const lines = src.split('\n');
    for (let k = 0; k < lines.length; k += 1) {
      if (lines[k].trim() !== '#if DEBUG') continue;
      let depth = 0;
      let end = -1;
      for (let j = k; j < lines.length; j += 1) {
        const t = lines[j].trim();
        if (/^#if\b/.test(t)) depth += 1;
        else if (/^#endif\b/.test(t)) {
          depth -= 1;
          if (depth === 0) {
            end = j;
            break;
          }
        }
      }
      if (end === -1) continue;
      if (!re.test(lines.slice(k + 1, end).join('\n'))) continue;
      const kept = lines.filter((_, i) => i !== k && i !== end);
      return kept.join('\n');
    }
    return src;
  };
}

const ARMS = [
  {
    id: 'a1',
    rule: 'a',
    what: 'one hex digit of a token changed in Tokens.swift',
    file: () => `${APP}/Style/Tokens.swift`,
    edit: (src) => src.replace(/0x([0-9a-fA-F]{5})([0-9a-fA-F])/, (_, head, last) => `0x${head}${last.toLowerCase() === 'f' ? '0' : 'f'}`)
  },
  {
    id: 'a2',
    rule: 'a',
    what: 'a colour typed straight into a screen',
    file: aScreen,
    edit: append('let p316AblationColour = Color(red: 1, green: 0, blue: 0)\n')
  },
  {
    id: 'a3',
    rule: 'a',
    what: 'a named system colour in a modifier',
    file: aScreen,
    edit: append('func p316AblationTint(_ v: some View) -> some View { v.foregroundStyle(.white) }\n')
  },
  {
    id: 'b1',
    rule: 'b',
    what: 'a string literal drawn through Text in a screen',
    file: aScreen,
    edit: append('let p316AblationText = Text("Everything is fine")\n')
  },
  {
    id: 'b2',
    rule: 'b',
    what: 'a sentence written outside Copy.swift, away from any Text',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: append('let p316AblationWhy = "Your Mac said no to this."\n')
  },
  {
    id: 'c1',
    rule: 'c',
    what: 'a URLSession outside the door client',
    file: aScreen,
    edit: append('let p316AblationSession = URLSession.shared\n')
  },
  {
    id: 'c2',
    rule: 'c',
    what: 'the door client building http',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.split('"https"').join('"http"')
  },
  {
    id: 'd1',
    rule: 'd',
    what: 'the direct loopback transport taken out of #if DEBUG',
    file: () => `${APP}/Door/Transport.swift`,
    edit: unguard(/\b(struct|class|enum|actor)\s+\w*(Loopback|Debug|Direct)\w*/)
  },
  {
    id: 'd2',
    rule: 'd',
    what: 'the pairing payload injection taken out of #if DEBUG',
    file: (root) => fileMatching(root, /#if DEBUG[\s\S]*?(ProcessInfo\s*\.\s*processInfo|CommandLine\s*\.|launchArguments)[\s\S]*?#endif/),
    edit: unguard(/ProcessInfo\s*\.\s*processInfo|CommandLine\s*\.|launchArguments/)
  },
  {
    id: 'e1',
    rule: 'e',
    what: 'NSAllowsArbitraryLoads added to the ATS dictionary',
    file: () => `${APP}/Info.plist`,
    edit: (src) => src.replace(/(<key>NSAppTransportSecurity<\/key>\s*<dict>)/, '$1\n\t\t<key>NSAllowsArbitraryLoads</key>\n\t\t<true/>')
  },
  {
    id: 'e2',
    rule: 'e',
    what: 'a background mode added',
    file: () => `${APP}/Info.plist`,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>UIBackgroundModes</key>\n\t<array>\n\t\t<string>fetch</string>\n\t</array>')
  },
  {
    id: 'e3',
    rule: 'e',
    what: 'a second ATS exception domain',
    file: () => `${APP}/Info.plist`,
    edit: (src) =>
      src.replace(
        /(<key>NSExceptionDomains<\/key>\s*<dict>)/,
        '$1\n\t\t\t<key>192.0.2.0/24</key>\n\t\t\t<dict>\n\t\t\t\t<key>NSExceptionAllowsInsecureHTTPLoads</key>\n\t\t\t\t<true/>\n\t\t\t</dict>'
      )
  },
  {
    id: 'e4',
    rule: 'e',
    what: 'a background mode injected by a build setting the plist does not show',
    file: () => 'ios/Tortie.xcodeproj/project.pbxproj',
    edit: (src) => src.replace(/(\n(\s*)INFOPLIST_FILE = )/, '\n$2INFOPLIST_KEY_UIBackgroundModes = fetch;$1')
  },
  {
    id: 'f1',
    rule: 'f',
    what: 'import NetworkExtension',
    file: aScreen,
    edit: (src) => `import NetworkExtension\n${src}`
  },
  {
    id: 'f2',
    rule: 'f',
    what: 'a networking entitlement',
    file: () => `${APP}/Tortie.entitlements`,
    edit: (src) => {
      const entry = '\t<key>com.apple.developer.networking.networkextension</key>\n\t<array>\n\t\t<string>packet-tunnel-provider</string>\n\t</array>\n';
      return src.includes('<dict/>') ? src.replace('<dict/>', `<dict>\n${entry}</dict>`) : src.replace('<dict>', `<dict>\n${entry}`);
    }
  },
  {
    id: 'g',
    rule: 'g',
    what: 'a web view that could run what the door sends',
    file: aScreen,
    edit: append('import WebKit\nlet p316AblationWeb = WKWebView()\n')
  },
  {
    id: 'h',
    rule: 'h',
    what: 'the ask drawn as markdown',
    file: (root) => fileMatching(root, /Text\s*\(\s*verbatim\s*:[^)\n]*askText/),
    edit: (src) => src.replace(/Text\s*\(\s*verbatim\s*:\s*([^)\n]*askText)\s*\)/, 'Text(try! AttributedString(markdown: $1))')
  },
  {
    id: 'i1',
    rule: 'i',
    what: 'screenshots switched back on in the test plan',
    file: () => 'ios/Tortie.xctestplan',
    edit: (src) => src.replace(/("uiTestingScreenshotsEnabled"\s*:\s*)false/, '$1true')
  },
  {
    id: 'i2',
    rule: 'i',
    what: 'a test that takes a screenshot',
    file: aTest,
    edit: append('import XCTest\nfunc p316Ablation(_ app: XCUIApplication) { _ = app.screenshot() }\n')
  },
  {
    id: 'j',
    rule: 'j',
    what: 'a vector edited by hand',
    file: () => 'ios/TortieTests/Fixtures/vectors.json',
    edit: (src) => src.replace(/"([0-9a-f])([0-9a-f]{31,})"/, (_, first, rest) => `"${first === '0' ? '1' : '0'}${rest}"`)
  },
  // (k), his ruling of 2026-09-23: the two sums the reverify trapped with
  // `Int.max`, put back as they shipped, then the three halves of the rule.
  {
    id: 'k1',
    rule: 'k',
    what: "the list's shipped trap put back: `others.count + max(0, answer.othersOmitted)`",
    file: () => `${APP}/Screens/ListScreen.swift`,
    edit: (src) =>
      src.replace(
        /guard let otherCount = DoorNumber\.sum\(others\.count, answer\.othersOmitted\) else \{\s*throw DoorFailure\.malformed\s*\}/,
        'let otherCount = others.count + max(0, answer.othersOmitted)'
      )
  },
  {
    id: 'k2',
    rule: 'k',
    what: "the session's shipped trap put back: `counts.user + replies`, a sum that names no door field",
    file: () => `${APP}/Screens/ActivityCells.swift`,
    edit: (src) => src.replace(/let total = try together\(counts\.user, replies\)/, 'let total = counts.user + replies')
  },
  {
    id: 'k3',
    rule: 'k',
    what: 'the paging sum taken bare: `heldLast.index + 1`',
    file: () => `${APP}/Door/Contract.swift`,
    edit: (src) => src.replace(/DoorNumber\.sum\(heldLast\.index, 1\)/, 'Optional(heldLast.index + 1)')
  },
  {
    id: 'k4',
    rule: 'k',
    what: 'a door number decoded with no bound',
    file: () => `${APP}/Door/Contract.swift`,
    edit: (src) => src.replace(/othersOmitted = try c\.doorNumber\(forKey: \.othersOmitted\)/, 'othersOmitted = try c.decode(Int.self, forKey: .othersOmitted)')
  },
  {
    id: 'k5',
    rule: 'k',
    what: 'the one checked helper adding bare',
    file: () => `${APP}/Door/Contract.swift`,
    edit: (src) => src.replace(/\ba\.addingReportingOverflow\(b\)/, '(a + b, false)')
  },

  // PHASE 316.3, the tailnet node (build/p316/SPEC.md §4 S3). (c) widened.
  {
    id: 'c3',
    rule: 'c',
    what: 'the node sending a request itself, past the pin and the cap',
    file: () => NODE,
    edit: append('func p316AblationSend(_ s: URLSession, _ r: URLRequest) async throws { _ = try await s.data(for: r) }\n')
  },
  {
    id: 'c4',
    rule: 'c',
    what: 'a third network file beside the node',
    file: () => `${APP}/Tailnet/Relay.swift`,
    create: true,
    edit: () => 'import Foundation\nlet p316AblationSession = URLSession(configuration: .ephemeral)\n'
  },
  // (e) and (f), widened: the two plants the SPEC names, in the places S3 is
  // tempted, and the answers that are his.
  {
    id: 'e5',
    rule: 'e',
    what: 'the Background Modes capability turned on in the project',
    file: () => PBX,
    edit: capability('com.apple.BackgroundModes')
  },
  {
    id: 'e6',
    rule: 'e',
    what: 'the local network usage string taken out',
    file: (root) => (/NSLocalNetworkUsageDescription/.test(readFileSync(join(root, INFO), 'utf8')) ? INFO : PBX),
    edit: (src) =>
      src
        .replace(/[ \t]*<key>NSLocalNetworkUsageDescription<\/key>\s*<string>[^<]*<\/string>\s*\n?/, '')
        .replace(/[ \t]*INFOPLIST_KEY_NSLocalNetworkUsageDescription = (?:"(?:[^"\\]|\\.)*"|[^;]*);\n?/g, '')
  },
  {
    id: 'e7',
    rule: 'e',
    what: 'the export-compliance answer written by an agent',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>')
  },
  {
    id: 'f3',
    rule: 'f',
    what: 'import NetworkExtension in the node',
    file: () => NODE,
    edit: (src) => `import NetworkExtension\n${src}`
  },
  {
    id: 'f4',
    rule: 'f',
    what: 'the NetworkExtensions capability turned on in the project',
    file: () => PBX,
    edit: capability('com.apple.NetworkExtensions.iOS')
  },
  // (l) the node is started only in Node.swift.
  {
    id: 'l1',
    rule: 'l',
    what: 'TailscaleKit imported by a screen',
    file: aScreen,
    edit: (src) => `import TailscaleKit\n${src}`
  },
  {
    id: 'l2',
    rule: 'l',
    what: "TailscaleKit re-exported from the node, so every file has its names",
    file: () => NODE,
    edit: (src) => src.replace(/^import TailscaleKit$/m, '@_exported import TailscaleKit')
  },
  {
    id: 'l3',
    rule: 'l',
    what: 'an ephemeral node',
    file: () => NODE,
    // Every occurrence: the first one in Node.swift is in its header comment,
    // which the gate rightly does not read.
    edit: (src) => src.replace(/\bephemeral:\s*false\b/g, 'ephemeral: true')
  },
  {
    id: 'l4',
    rule: 'l',
    what: 'the node renamed',
    file: () => NODE,
    edit: (src) => src.split('"tortie-phone"').join('"tortie-phone-p316"')
  },
  {
    id: 'l5',
    rule: 'l',
    what: 'a background task keeping the node warm',
    file: () => NODE,
    edit: append('func p316AblationKeepAwake() { _ = UIApplication.shared.beginBackgroundTask { } }\n')
  },
  {
    id: 'l6',
    rule: 'l',
    what: 'the node handed out of its file',
    file: () => NODE,
    edit: append('var p316AblationNode: TailscaleNode? = nil\n')
  },
  {
    id: 'l7',
    rule: 'l',
    what: 'a test importing TailscaleKit, so it could start a node of its own',
    file: aTest,
    edit: (src) => `import TailscaleKit\n${src}`
  },
  {
    id: 'l8',
    rule: 'l',
    what: 'a build phase that builds the framework instead of checking for it',
    file: () => PBX,
    edit: (src) => src.replace(/shellScript = "/, 'shellScript = "make -C ../build/vendor/tailscalekit ios-fat\\n')
  },
  {
    id: 'l9',
    rule: 'l',
    what: 'the framework embedded without being signed on copy',
    file: () => PBX,
    edit: (src) => src.replace(/(TailscaleKit\.xcframework in Embed Frameworks \*\/ = \{[^\n]*?)CodeSignOnCopy, /, '$1')
  },
  // (m) the node's state.
  {
    id: 'm1',
    rule: 'm',
    what: "the node's state put into his backups",
    file: () => NODE,
    edit: (src) => src.replace(/\bisExcludedFromBackup = true\b/, 'isExcludedFromBackup = false')
  },
  {
    id: 'm2',
    rule: 'm',
    what: "the node's state kept in Caches, which iOS may empty",
    file: () => NODE,
    edit: (src) => src.replace(/\.applicationSupportDirectory\b/, '.cachesDirectory')
  },
  {
    id: 'm3',
    rule: 'm',
    what: 'the exclusion built and never applied',
    file: () => NODE,
    edit: (src) => src.split('.setResourceValues(').join('.p316AblationSkipped(')
  },
  // (n) the Keychain.
  {
    id: 'n1',
    rule: 'n',
    what: 'the pairing kept with an accessibility that can leave the phone',
    file: () => `${APP}/Door/Keys.swift`,
    edit: (src) => src.split('kSecAttrAccessibleWhenUnlockedThisDeviceOnly').join('kSecAttrAccessibleWhenUnlocked')
  },
  {
    id: 'n2',
    rule: 'n',
    what: 'the pairing synchronised to his other devices',
    file: () => `${APP}/Door/Keys.swift`,
    edit: (src) => src.replace(/(kSecAttrSynchronizable as String:\s*)kCFBooleanFalse/, '$1kCFBooleanTrue')
  },
  {
    id: 'n3',
    rule: 'n',
    what: 'a second Keychain writer that never says ThisDeviceOnly',
    file: aScreen,
    edit: append('func p316AblationStash(_ d: Data) { _ = SecItemAdd([kSecClass as String: kSecClassGenericPassword, kSecValueData as String: d] as CFDictionary, nil) }\n')
  },
  // (o) the privacy manifests.
  {
    id: 'o1',
    rule: 'o',
    what: "the app's own manifest deleted",
    file: appManifest,
    remove: true
  },
  {
    id: 'o2',
    rule: 'o',
    what: "the app's manifest saying it tracks",
    file: appManifest,
    edit: (src) => src.replace(/(<key>NSPrivacyTracking<\/key>\s*)<false\/>/, '$1<true/>')
  },
  {
    id: 'o3',
    rule: 'o',
    what: "TailscaleKit's file-timestamp reason changed from the one he took (C617.1)",
    file: frameworkManifestSource,
    edit: (src) => src.split('C617.1').join('DDA9.1')
  },
  {
    id: 'o4',
    rule: 'o',
    what: "TailscaleKit's SystemBootTime category dropped for another",
    file: frameworkManifestSource,
    edit: (src) => src.split('NSPrivacyAccessedAPICategorySystemBootTime').join('NSPrivacyAccessedAPICategoryDiskSpace')
  },
  {
    id: 'o5',
    rule: 'o',
    what: "the app's manifest taken out of the app target by a membership exception",
    file: () => PBX,
    edit: (src) => src.replace(/(membershipExceptions = \()/, '$1\n\t\t\t\tPrivacyInfo.xcprivacy,')
  },
  {
    id: 'o6',
    rule: 'o',
    what: "the app calling a required-reason API its manifest does not declare",
    file: aScreen,
    edit: append('let p316AblationModes = UITextInputMode.activeInputModes\n')
  },
  {
    id: 'o7',
    rule: 'o',
    what: "TailscaleKit's manifest left with no committed source",
    file: frameworkManifestSource,
    edit: (src) => {
      try {
        const pin = JSON.parse(src);
        delete pin.privacy;
        return `${JSON.stringify(pin, null, 2)}\n`;
      } catch {
        return src.split('NSPrivacyAccessedAPITypes').join('p316Ablation');
      }
    }
  },
  // (p) the tailnet key.
  {
    id: 'p1',
    rule: 'p',
    what: 'the key kept in the pairing record',
    file: () => `${APP}/Door/Keys.swift`,
    edit: (src) => src.replace(/(\n(\s*)let exchangeSeed: String\n)/, '$1$2let tk: String?\n')
  },
  {
    id: 'p2',
    rule: 'p',
    what: 'the key logged',
    file: () => `${APP}/Door/Pairing.swift`,
    edit: append('func p316AblationLog(_ o: PairingOffer) { print(o.tailnetKey ?? "none") }\n')
  },
  {
    id: 'p3',
    rule: 'p',
    what: 'the key written to a file through an alias',
    file: () => `${APP}/Door/Pairing.swift`,
    edit: append('func p316AblationKeep(_ o: PairingOffer, _ url: URL) throws { let saved = o.tailnetKey; try saved?.write(to: url, atomically: true, encoding: .utf8) }\n')
  },
  {
    id: 'p4',
    rule: 'p',
    what: 'a key typed into the app',
    file: () => `${APP}/Door/Pairing.swift`,
    edit: append('let p316AblationKey = "tskey-auth-kP316ablation"\n')
  },
  {
    id: 'p5',
    rule: 'p',
    what: 'a string shaped like a real key in a test',
    file: aTest,
    edit: append(`// ${REAL_SHAPED}\n`)
  },
  {
    id: 'p6',
    rule: 'p',
    what: "the node's key parameter kept in UserDefaults",
    file: () => NODE,
    edit: (src) => src.replace(/guard let key else/, 'let p316AblationCopy = key; UserDefaults.standard.set(p316AblationCopy, forKey: "k"); guard let key else')
  },
  {
    id: 'p7',
    rule: 'p',
    what: 'a second use of the key on the line KEY_NAMED names',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace(/key: pending\.offer\.tailnetKey\)/, 'key: pending.offer.tailnetKey ?? pending.offer.tailnetKey)')
  },
  // Phase 316.3's fix round: every shape the verification walked past the
  // gate with, planted in the shipping tree.
  {
    id: 'e8',
    rule: 'e',
    what: 'a background mode spelled for the iPhone (UIBackgroundModes~iphone)',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>UIBackgroundModes~iphone</key>\n\t<array>\n\t\t<string>fetch</string>\n\t</array>')
  },
  {
    id: 'e9',
    rule: 'e',
    what: 'a background mode spelled for iOS (UIBackgroundModes-iphoneos)',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>UIBackgroundModes-iphoneos</key>\n\t<array>\n\t\t<string>audio</string>\n\t</array>')
  },
  {
    id: 'e10',
    rule: 'e',
    what: 'a background mode spelled for the iPad (UIBackgroundModes~ipad)',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>UIBackgroundModes~ipad</key>\n\t<array>\n\t\t<string>fetch</string>\n\t</array>')
  },
  {
    id: 'e11',
    rule: 'e',
    what: 'a background mode injected by an xcconfig',
    file: () => `${APP}/P316Ablation.xcconfig`,
    create: true,
    edit: () => 'INFOPLIST_KEY_UIBackgroundModes = fetch\n'
  },
  {
    id: 'e12',
    rule: 'e',
    what: 'an iPhone spelling of the ATS dictionary beside the checked one',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>NSAppTransportSecurity~iphone</key>\n\t<dict>\n\t\t<key>NSExceptionDomains</key>\n\t\t<dict/>\n\t</dict>')
  },
  {
    id: 'f5',
    rule: 'f',
    what: 'a scoped import of one NetworkExtension enum',
    file: aScreen,
    edit: (src) => `import enum NetworkExtension.NEVPNStatus\n${src}`
  },
  {
    id: 'f6',
    rule: 'f',
    what: 'a scoped import of the hotspot manager, and a use, which links the framework',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => `import class NetworkExtension.NEHotspotConfigurationManager\n${src}\nlet p316AblationHotspot = NEHotspotConfigurationManager.shared\n`
  },
  {
    id: 'f7',
    rule: 'f',
    what: '@import NetworkExtension; in a new Objective-C file',
    file: () => `${APP}/Tailnet/P316Ablation.m`,
    create: true,
    edit: () => '@import NetworkExtension;\n\nvoid p316AblationLink(void) {}\n'
  },
  {
    id: 'f8',
    rule: 'f',
    what: 'its header imported by a new header',
    file: () => `${APP}/Tailnet/P316Ablation.h`,
    create: true,
    edit: () => '#import <NetworkExtension/NetworkExtension.h>\n'
  },
  {
    id: 'f9',
    rule: 'f',
    what: 'the framework linked by OTHER_LDFLAGS in the project',
    file: () => PBX,
    edit: (src) => src.replace(/(\n(\s*)INFOPLIST_FILE = )/, '\n$2OTHER_LDFLAGS = "-framework NetworkExtension";$1')
  },
  {
    id: 'f10',
    rule: 'f',
    what: 'the framework linked by an xcconfig',
    file: () => `${APP}/P316AblationLink.xcconfig`,
    create: true,
    edit: () => 'OTHER_LDFLAGS = -framework NetworkExtension\n'
  },
  {
    id: 'f11',
    rule: 'f',
    what: 'a NetworkExtension class looked up by its name',
    file: aScreen,
    edit: append('let p316AblationClass: AnyClass? = NSClassFromString("NEVPNManager")\n')
  },
  {
    id: 'i3',
    rule: 'i',
    what: 'code coverage turned back on in the test plan',
    file: () => 'ios/Tortie.xctestplan',
    edit: (src) => src.replace(/"codeCoverage"\s*:\s*false/, '"codeCoverage" : true')
  },
  {
    id: 'i4',
    rule: 'i',
    what: 'a build setting that instruments every build',
    file: () => PBX,
    edit: (src) => src.replace(/(\n(\s*)INFOPLIST_FILE = )/, '\n$2CLANG_COVERAGE_MAPPING = YES;$1')
  },
  {
    id: 'l10',
    rule: 'l',
    what: 'performExpiringActivity stretching the node past the background',
    file: () => NODE,
    edit: (src) => src.replace(/func settle\(\) async \{/, 'func settle() async {\n        ProcessInfo.processInfo.performExpiringActivity(withReason: "p316") { _ in }')
  },
  {
    id: 'l11',
    rule: 'l',
    what: 'a background URLSession in the door client',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace(/URLSessionConfiguration\.ephemeral/, 'URLSessionConfiguration.background(withIdentifier: "p316")')
  },
  {
    id: 'c5',
    rule: 'c',
    what: "the door client's configuration made .default, with a cache and a cookie jar",
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace(/URLSessionConfiguration\.ephemeral/, 'URLSessionConfiguration.default')
  },
  {
    id: 'p8',
    rule: 'p',
    what: "the code-as-read's mirror taken out inside the parse",
    file: () => `${APP}/Door/Pairing.swift`,
    edit: (src) => src.replace(/\n\s*var customMirror: Mirror \{ Mirror\(self, children: \[:\], displayStyle: \.struct\) \}\n(\s*\}\n)/, '\n$1')
  },
  {
    id: 'p9',
    rule: 'p',
    what: "the offer's mirror taken out, so print(offer) and dump(offer) repeat the key",
    file: () => `${APP}/Door/Pairing.swift`,
    edit: (src) => src.replace(/\n\s*var customMirror: Mirror \{ Mirror\(self, children: \["address"[^\n]*\n/, '\n')
  },
  {
    id: 'p10',
    rule: 'p',
    what: "the start's mirror taken out, so print(start) and dump(start) repeat the key",
    file: () => NODE,
    edit: (src) => src.replace(/\n\s*var customMirror: Mirror \{\n\s*Mirror\(self, children: \["hostName"[^\n]*\n\s*\}\n/, '\n')
  },
  {
    id: 'p11',
    rule: 'p',
    what: "the pairing model's mirror taken out, so dump(model) repeats the last code",
    file: () => `${APP}/Screens/PairingScreen.swift`,
    edit: (src) => src.replace(/extension PairingModel: CustomReflectable \{\n[^\n]*\n\}\n/, '')
  },
  {
    id: 'p12',
    rule: 'p',
    what: 'the raw code, which carries the key, kept in the Keychain under its own account',
    file: () => `${APP}/Screens/PairingScreen.swift`,
    edit: (src) => src.replace(/\n(\s*)spent = payload\n/, '\n$1spent = payload\n$1try? KeychainSecretStore().write(Data(payload.utf8), account: "p316-last-code")\n')
  },
  {
    id: 'p13',
    rule: 'p',
    what: 'the raw code logged',
    file: () => `${APP}/Screens/PairingScreen.swift`,
    edit: (src) => src.replace(/\n(\s*)spent = payload\n/, '\n$1spent = payload\n$1print(payload)\n')
  },
  {
    id: 'p14',
    rule: 'p',
    what: "the camera's code bound to a name the rule does not watch",
    file: () => `${APP}/Screens/PairingScreen.swift`,
    edit: (src) => src.replace(/guard let code = metadataObjects/, 'guard let scanned = metadataObjects').replace(/onCode\?\(code\)/, 'onCode?(scanned)')
  },
  // Phase 316.3's HARDENING ROUND (his ruling of 2026-09-23, "Harden, then
  // land"): every shape the reverify walked past the gate with, and the
  // switch that turns Tailscale's own logs off (rule q).
  {
    id: 'e13',
    rule: 'e',
    what: 'UIBackgroundModes spelled with a character reference (UIBackground&#77;odes), which CoreFoundation decodes',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>UIBackground&#77;odes</key>\n\t<array>\n\t\t<string>fetch</string>\n\t</array>')
  },
  {
    id: 'e14',
    rule: 'e',
    what: 'a second ATS dictionary spelled with references, allowing arbitrary loads',
    file: () => INFO,
    edit: (src) => src.replace(/(\n<\/dict>\n<\/plist>)/, '\n\t<key>NSAppTransport&#83;ecurity</key>\n\t<dict>\n\t\t<key>NSAllows&#65;rbitraryLoads</key>\n\t\t<true/>\n\t</dict>$1')
  },
  {
    id: 'e15',
    rule: 'e',
    what: 'UIBackgroundModes in a CDATA section',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key><![CDATA[UIBackgroundModes]]></key>\n\t<array>\n\t\t<string>fetch</string>\n\t</array>')
  },
  {
    id: 'e16',
    rule: 'e',
    what: 'the Release configuration built from a second plist',
    file: () => PBX,
    edit: (src) => {
      let n = 0;
      return src.replace(/INFOPLIST_FILE = Tortie\/Info\.plist;/g, (m) => (++n === 2 ? 'INFOPLIST_FILE = Tortie/Release/Info.plist;' : m));
    }
  },
  {
    id: 'e17',
    rule: 'e',
    what: 'Info.plist preprocessed, with a macro that spells UIBackgroundModes',
    file: () => PBX,
    edit: (src) => src.replace(/(\n(\s*)INFOPLIST_FILE = Tortie\/Info\.plist;)/, '\n$2INFOPLIST_PREPROCESS = YES;\n$2INFOPLIST_OTHER_PREPROCESSOR_FLAGS = "-DP316BG=UIBackgroundModes";$1')
  },
  {
    id: 'e18',
    rule: 'e',
    what: 'the app generating its Info.plist, with a background mode as a build setting',
    file: () => PBX,
    edit: (src) => src.replace(/GENERATE_INFOPLIST_FILE = NO;/, 'GENERATE_INFOPLIST_FILE = YES;\n\t\t\t\tINFOPLIST_KEY_UIBackgroundModes = fetch;')
  },
  {
    id: 'e19',
    rule: 'e',
    what: 'a build setting written into a key, which Xcode expands as it copies the file',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>$(P316_ABLATION_KEY)</key>\n\t<true/>')
  },
  {
    id: 'e20',
    rule: 'e',
    what: 'a key written twice, which CoreFoundation reads once as its last value',
    file: () => INFO,
    edit: (src) => src.replace(/(\t<key>UIUserInterfaceStyle<\/key>\n\t<string>Dark<\/string>\n)/, '$1\t<key>UIUserInterfaceStyle</key>\n\t<string>Light</string>\n')
  },
  {
    id: 'f12',
    rule: 'f',
    what: 'NetworkExtension imported with the module in backticks',
    file: () => `${APP}/Door/Transport.swift`,
    edit: (src) => src.replace('import Foundation', 'import `NetworkExtension`\nimport Foundation')
  },
  {
    id: 'f13',
    rule: 'f',
    what: 'NEPacket, which the prefix list never named, used in the app',
    file: aScreen,
    edit: append('let p316AblationPacket: Any.Type = NEPacket.self\n')
  },
  {
    id: 'f14',
    rule: 'f',
    what: 'a remote Swift package added to the project',
    file: () => PBX,
    edit: (src) => src.replace(/(\/\* Begin XCBuildConfiguration section \*\/)/, '/* Begin XCRemoteSwiftPackageReference section */\n\t\t316A0000000000000000F001 /* XCRemoteSwiftPackageReference "p316" */ = {\n\t\t\tisa = XCRemoteSwiftPackageReference;\n\t\t\trepositoryURL = "https://example.invalid/p316";\n\t\t};\n/* End XCRemoteSwiftPackageReference section */\n\n$1')
  },
  {
    id: 'c6',
    rule: 'c',
    what: 'URLSession.shared in the door client',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('return try await exchange.run(session.dataTask(with: request))', 'return try await exchange.run(URLSession.shared.dataTask(with: request))')
  },
  {
    id: 'c7',
    rule: 'c',
    what: 'the session built from configuration: .default',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('configuration: Self.configuration(route, limits: limits),', 'configuration: .default,')
  },
  {
    id: 'c8',
    rule: 'c',
    what: 'a configuration typed URLSessionConfiguration = .default',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('let configuration = URLSessionConfiguration.ephemeral', 'let p316Ablation: URLSessionConfiguration = .default\n        _ = p316Ablation\n        let configuration = URLSessionConfiguration.ephemeral')
  },
  {
    id: 'c9',
    rule: 'c',
    what: "the client's own builder returning .default",
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace(/\n(\s*)return configuration\n/, '\n$1return .default\n')
  },
  {
    id: 'l12',
    rule: 'l',
    what: 'significant-change location monitoring, which relaunches the app',
    file: () => `${APP}/Tailnet/P316AblationWake.swift`,
    create: true,
    edit: () => 'import CoreLocation\n\nenum P316AblationWake {\n    static let manager = CLLocationManager()\n    static func arm() { manager.startMonitoringSignificantLocationChanges() }\n}\n'
  },
  {
    id: 'l13',
    rule: 'l',
    what: 'TailscaleKit imported in backticks by a test',
    file: () => 'ios/TortieTests/TailnetNodeTests.swift',
    edit: (src) => src.replace('import Foundation', 'import Foundation\n@testable import `TailscaleKit`')
  },
  {
    id: 'p15',
    rule: 'p',
    what: "a code read by Core Image's QR reader and bound to a name the rule does not watch",
    file: () => `${APP}/Screens/P316AblationStill.swift`,
    create: true,
    edit: () => 'import CoreImage\n\nenum P316AblationStill {\n    static func read(_ feature: CIQRCodeFeature) -> String? {\n        let raw = feature.messageString\n        return raw\n    }\n}\n'
  },
  {
    id: 'p16',
    rule: 'p',
    what: 'a code arriving by a deep link, kept in a file',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace(/(WindowGroup\s*\{)/, '$1\n            EmptyView().onOpenURL { url in try? url.absoluteString.write(to: FileManager.default.temporaryDirectory.appendingPathComponent("p316"), atomically: true, encoding: .utf8) }')
  },
  {
    id: 'p17',
    rule: 'p',
    what: 'a code read from the pasteboard under a name the rule does not watch',
    file: () => `${APP}/Screens/PairingScreen.swift`,
    edit: (src) => src.replace(/\n(\s*)spent = payload\n/, '\n$1spent = payload\n$1let p316Pasted = UIPasteboard.general.string\n$1_ = p316Pasted\n')
  },
  {
    id: 'p18',
    rule: 'p',
    what: "a code read from Vision's payloadData and bound to a name the rule does not watch",
    file: () => `${APP}/Screens/P316AblationVision.swift`,
    create: true,
    edit: () => 'import Vision\n\nenum P316AblationVision {\n    static func read(_ o: VNBarcodeObservation) -> Data? {\n        let raw = o.payloadData\n        return raw\n    }\n}\n'
  },
  {
    id: 'q1',
    rule: 'q',
    what: "the node started with no switch before it, so its logs would go to log.tailscale.com",
    file: () => NODE,
    edit: (src) => src.replace(/\n\s*guard TailnetLogs\.off\(\) else \{ throw TailnetLogsStillOn\(\) \}\n/, '\n')
  },
  {
    id: 'q2',
    rule: 'q',
    what: "the switch asked and its answer dropped",
    file: () => NODE,
    edit: (src) => src.replace('guard TailnetLogs.off() else { throw TailnetLogsStillOn() }', '_ = TailnetLogs.off()')
  },
  {
    id: 'q3',
    rule: 'q',
    what: 'the wrapper answering true whatever the switch said',
    file: () => NODE,
    edit: (src) => src.replace('tailscale_no_logs_no_support() == 0', '_ = tailscale_no_logs_no_support()\n        return true')
  },
  {
    id: 'q4',
    rule: 'q',
    what: 'the switch turned on in DEBUG builds only',
    file: () => NODE,
    edit: (src) => src.replace(/\n(enum TailnetLogs \{[\s\S]*?\n\})\n/, '\n#if DEBUG\n$1\n#else\nenum TailnetLogs {\n    static func off() -> Bool { true }\n}\n#endif\n')
  },
  {
    id: 'q5',
    rule: 'q',
    what: "the vendoring script no longer setting tailscaled's own switch",
    file: () => 'build/build-tailscalekit.mjs',
    edit: (src) => src.replace("'\\tenvknob.SetNoLogsNoSupport()\\n' +", "'\\t_ = envknob.Bool(\"TS_NO_LOGS_NO_SUPPORT\")\\n' +")
  },
  {
    id: 'q6',
    rule: 'q',
    what: 'a node started through the C API, around the switch',
    file: () => NODE,
    edit: (src) => src.replace('    func forgetKey() async {', '    func p316Ablation() { _ = tailscale_up(tailscale_new()) }\n\n    func forgetKey() async {')
  },
  // Phase 316.4's integrator: the switch's second cost, a tailnet that
  // requires network flow logs, told apart from a refused key (rule q4).
  {
    id: 'q7',
    rule: 'q',
    what: 'the flow logs refusal reworded, so no built slice holds the words the node reads',
    file: () => NODE,
    edit: (src) => src.replace('static let flowLogsRefusal = "tailnet requires logging to be enabled"', 'static let flowLogsRefusal = "tailnet requires network flow logs"')
  },
  {
    id: 'q8',
    rule: 'q',
    what: "the live node's up() passing TailscaleKit's error through, so flow logs read as a refused key",
    file: () => NODE,
    edit: (src) => src.replace(/\} catch TailscaleError\.internalError\(let message\) where TailnetFlowLogsRequired\.said\(message\) \{\n\s*throw TailnetFlowLogsRequired\(\)\n\s*\}/, '} catch {\n            throw error\n        }')
  },
  {
    id: 'q9',
    rule: 'q',
    what: 'the join drawing a tailnet that requires flow logs as a refused key',
    file: () => NODE,
    edit: (src) => src.replace('            if error is TailnetFlowLogsRequired { throw TailnetRefusal.flowLogsRequired }\n', '')
  },
  // Phase 316.4, the first TestFlight build (rules r and s). An arm marked
  // `bytes` edits the file's bytes rather than its text, because a PNG is not
  // text.
  {
    id: 'r1',
    rule: 'r',
    what: 'the brand master itself shipped as the icon, alpha channel and all',
    file: () => ICON,
    bytes: true,
    edit: () => readFileSync(join(REPO, ICON_MASTER))
  },
  {
    id: 'r2',
    rule: 'r',
    what: 'the icon laid on the dark base\'s --bg-canvas instead of the ground the script names',
    file: () => ICON,
    bytes: true,
    edit: () => {
      const master = decodePng(readFileSync(join(REPO, ICON_MASTER)));
      return encodeRgbPng(master.width, master.height, flatten(master, groundOf(readFileSync(join(REPO, 'src', 'renderer', 'styles', 'tokens.css'), 'utf8'), { base: 'dark', token: '--bg-canvas' })));
    }
  },
  {
    id: 'r3',
    rule: 'r',
    what: 'an opaque icon given a transparent colour (a tRNS chunk after its header)',
    file: () => ICON,
    bytes: true,
    edit: (buf) => {
      const at = 8 + 12 + buf.readUInt32BE(8);
      const body = Buffer.from([0, 245, 0, 247, 0, 250]);
      const head = Buffer.alloc(8);
      head.writeUInt32BE(body.length, 0);
      head.write('tRNS', 4, 'latin1');
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0);
      return Buffer.concat([buf.subarray(0, at), head, body, crc, buf.subarray(at)]);
    }
  },
  {
    id: 'r4',
    rule: 'r',
    what: "the script's ground moved to another token and the icon not made again",
    file: () => 'build/p316/app-icon.mjs',
    edit: (src) => src.replace("export const ICON_GROUND = Object.freeze({ base: 'light', token: '--bg-canvas' });", "export const ICON_GROUND = Object.freeze({ base: 'light', token: '--bg-surface' });")
  },
  {
    id: 'r5',
    rule: 'r',
    what: 'a dark appearance named in the icon set',
    file: () => ICON_SET_CONTENTS,
    edit: (src) => src.replace('"images" : [', '"images" : [\n    {\n      "appearances" : [ { "appearance" : "luminosity", "value" : "dark" } ],\n      "idiom" : "universal",\n      "platform" : "ios",\n      "size" : "1024x1024"\n    },')
  },
  {
    id: 'r6',
    rule: 'r',
    what: 'a second picture dropped into the icon set',
    file: () => `${APP}/Assets.xcassets/AppIcon.appiconset/AppIcon-dark.png`,
    create: true,
    edit: () => 'not an icon\n'
  },
  {
    id: 'r7',
    rule: 'r',
    what: 'the Release build naming no icon',
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000073 \/\* Release \*\/ = \{[\s\S]*?)\n\t*ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;/, '$1')
  },
  {
    id: 'r8',
    rule: 'r',
    what: 'asset symbols generated into the app',
    file: () => PBX,
    edit: (src) => src.replace('ASSETCATALOG_COMPILER_GENERATE_ASSET_SYMBOLS = NO;', 'ASSETCATALOG_COMPILER_GENERATE_ASSET_SYMBOLS = YES;')
  },
  {
    id: 's1',
    rule: 's',
    what: 'his team written into the app\'s Debug configuration',
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000072 \/\* Debug \*\/ = \{[\s\S]*?)DEVELOPMENT_TEAM = "";/, '$1DEVELOPMENT_TEAM = 4GRQMF5T5U;')
  },
  {
    id: 's2',
    rule: 's',
    what: "a second team, on the unit tests' Release configuration",
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000075 \/\* Release \*\/ = \{[\s\S]*?)DEVELOPMENT_TEAM = "";/, '$1DEVELOPMENT_TEAM = 4GRQMF5T5U;')
  },
  {
    id: 's3',
    rule: 's',
    what: 'another team in Release',
    file: () => PBX,
    edit: (src) => src.replace('DEVELOPMENT_TEAM = 4GRQMF5T5U;', 'DEVELOPMENT_TEAM = P316ABLATE;')
  },
  {
    id: 's4',
    rule: 's',
    what: 'Release signed by hand again',
    file: () => PBX,
    edit: (src) => src.replace('CODE_SIGN_STYLE = Automatic;', 'CODE_SIGN_STYLE = Manual;')
  },
  {
    id: 's5',
    rule: 's',
    what: 'a distribution identity written into Release',
    file: () => PBX,
    edit: (src) => src.replace('CODE_SIGN_IDENTITY = "Apple Development";', 'CODE_SIGN_IDENTITY = "Apple Distribution";')
  },
  {
    id: 's6',
    rule: 's',
    what: 'a provisioning profile named in Release',
    file: () => PBX,
    edit: (src) => src.replace('DEVELOPMENT_TEAM = 4GRQMF5T5U;', 'DEVELOPMENT_TEAM = 4GRQMF5T5U;\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "Tortie App Store";')
  },
  {
    id: 's7',
    rule: 's',
    what: 'the bundle id changed in Release, which the first upload makes permanent',
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000073 \/\* Release \*\/ = \{[\s\S]*?)PRODUCT_BUNDLE_IDENTIFIER = com\.itavero\.tortie\.phone;/, '$1PRODUCT_BUNDLE_IDENTIFIER = com.itavero.tortie.phone2;')
  },
  {
    id: 's8',
    rule: 's',
    what: 'Release a build ahead of Debug',
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000073 \/\* Release \*\/ = \{[\s\S]*?)CURRENT_PROJECT_VERSION = 1;/, '$1CURRENT_PROJECT_VERSION = 2;')
  },
  {
    id: 's9',
    rule: 's',
    what: 'the Home Screen name changed in Info.plist',
    file: () => INFO,
    edit: (src) => src.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)Tortie(<\/string>)/, '$1Tortie Phone$2')
  },
  {
    id: 's10',
    rule: 's',
    what: 'the team set by a new xcconfig',
    file: () => 'ios/P316AblationSigning.xcconfig',
    create: true,
    edit: () => 'DEVELOPMENT_TEAM = 4GRQMF5T5U\n'
  }
];

// ---------------------------------------------------------------------------
// The clone
// ---------------------------------------------------------------------------

let scratch = null;
const cleanup = () => {
  if (scratch !== null) {
    rmSync(scratch, { recursive: true, force: true });
    scratch = null;
  }
};
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    cleanup();
    process.exit(1);
  });
}

/** A digest of every file under the working tree's ios/ plus tokens.css. */
function treeDigest() {
  const h = createHash('sha256');
  const walk = (dir) => {
    for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)) : []) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) h.update(relative(REPO, p)).update(readFileSync(p));
    }
  };
  walk(join(REPO, 'ios'));
  h.update(readFileSync(join(REPO, 'src', 'renderer', 'styles', 'tokens.css')));
  h.update(ICON_MASTER).update(readFileSync(join(REPO, ICON_MASTER)));
  const source = frameworkManifestSource(REPO);
  if (source !== null) h.update(source).update(readFileSync(join(REPO, source)));
  return h.digest('hex');
}

function buildClone() {
  scratch = mkdtempSync('/private/tmp/p316-ablation-');
  const clone = (from, to) => {
    const r = spawnSync('cp', ['-Rc', from, to], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`cp -Rc ${relative(REPO, from)} failed: ${String(r.stderr).trim()}`);
  };
  for (const name of ['ios', 'src']) clone(join(REPO, name), join(scratch, name));
  // Rule (r) lays the brand master over its ground, so the clone holds it.
  mkdirSync(join(scratch, dirname(ICON_MASTER)), { recursive: true });
  clone(join(REPO, ICON_MASTER), join(scratch, ICON_MASTER));
  // build/, but never build/vendor/: the vendored framework and, while a
  // build runs, 1.43 GiB of Go cache. The gate only READS the built framework,
  // so the clone links to it, and no arm may plant under it (see run).
  spawnSync('mkdir', [join(scratch, 'build')]);
  for (const name of readdirSync(join(REPO, 'build'))) {
    if (name === 'vendor') continue;
    clone(join(REPO, 'build', name), join(scratch, 'build', name));
  }
  if (existsSync(join(REPO, 'build', 'vendor'))) symlinkSync(join(REPO, 'build', 'vendor'), join(scratch, 'build', 'vendor'));
  for (const name of readdirSync(REPO)) {
    if (name === 'package.json' || /^tsconfig.*\.json$/.test(name)) copyFileSync(join(REPO, name), join(scratch, name));
  }
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
}

/** One run of the CLONE's own conformance:ios. */
function runGate() {
  const r = spawnSync(process.execPath, [join(scratch, 'build', 'conformance-ios.mjs'), '--json'], {
    cwd: scratch,
    encoding: 'utf8',
    timeout: 180_000
  });
  const line = String(r.stdout ?? '').split('\n').find((l) => l.startsWith('CONFORMANCE_IOS:'));
  if (line === undefined) return { ok: false, rules: null, why: `the gate printed no verdict (exit ${String(r.status)}): ${String(r.stderr ?? '').trim().slice(-300)}` };
  const parsed = JSON.parse(line.slice('CONFORMANCE_IOS:'.length));
  return { ok: true, rules: parsed.rules, scannerFixturesFailed: parsed.scannerFixturesFailed };
}

/** One arm's verdict, as a delta against the base. */
function judge(arm, base, got, relPath) {
  if (!got.ok) return { arm, verdict: 'FAIL', why: got.why };
  const wasGreen = base.rules[arm.rule]?.ok === true;
  const nowRed = got.rules[arm.rule]?.ok === false;
  const collateral = Object.entries(got.rules)
    .filter(([k, v]) => k !== arm.rule && !v.ok && base.rules[k]?.ok === true)
    .map(([k]) => k);
  if (wasGreen && nowRed) {
    return { arm, verdict: 'red', why: `(${arm.rule}) went red${collateral.length > 0 ? `; also red: ${collateral.join(', ')}` : ''}`, file: relPath };
  }
  return {
    arm,
    verdict: 'FAIL',
    why: !wasGreen ? `(${arm.rule}) was already red at the base, so this arm proves nothing` : `(${arm.rule}) stayed GREEN with the plant in ${relPath}: that clause of the rule is not asserted`,
    file: relPath
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const only = (process.env['P316_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
const arms = only.length === 0 ? ARMS : ARMS.filter((a) => only.includes(a.id));
const before = treeDigest();
let failed = 0;
const rows = [];
try {
  buildClone();
  const base = runGate();
  if (!base.ok) throw new Error(base.why);
  const baseRed = Object.entries(base.rules).filter(([, v]) => !v.ok).map(([k]) => k);
  say(`base: ${baseRed.length === 0 ? 'every rule green' : `red at the base: ${baseRed.join(', ')}`}${base.scannerFixturesFailed > 0 ? `; ${String(base.scannerFixturesFailed)} scanner fixture(s) failed` : ''}`);
  if (base.scannerFixturesFailed > 0) failed += 1;

  for (const arm of arms) {
    const relPath = arm.file(scratch);
    if (relPath === null) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: 'no file in the tree to plant into; the arm has lost its anchor' });
      continue;
    }
    const path = join(scratch, relPath);
    if (relPath === 'build/vendor' || relPath.startsWith('build/vendor/')) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: `${relPath} is under build/vendor/, which the clone LINKS to the working tree; no arm plants there` });
      continue;
    }
    if (arm.create === true) {
      if (existsSync(path)) {
        failed += 1;
        rows.push({ arm, verdict: 'FAIL', why: `${relPath} already exists, so planting it as a new file proves nothing` });
        continue;
      }
      writeFileSync(path, arm.edit(''));
      let got;
      try {
        got = runGate();
      } finally {
        rmSync(path, { force: true });
      }
      if (existsSync(path)) {
        failed += 1;
        rows.push({ arm, verdict: 'FAIL', why: `the planted ${relPath} was not removed from the clone` });
        continue;
      }
      rows.push(judge(arm, base, got, relPath));
      if (rows[rows.length - 1].verdict !== 'red') failed += 1;
      continue;
    }
    if (!existsSync(path)) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: `${relPath} does not exist; the arm has lost its anchor` });
      continue;
    }
    const original = readFileSync(path);
    // A `bytes` arm edits the file's bytes (a PNG); every other arm its text.
    const edited = arm.remove === true ? null : arm.bytes === true ? arm.edit(original) : arm.edit(original.toString('utf8'));
    if (arm.bytes === true ? edited !== null && Buffer.compare(edited, original) === 0 : edited === original.toString('utf8')) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: `the edit changed nothing in ${relPath}; its anchor is gone, so this rule is no longer proved` });
      continue;
    }
    if (edited === null) rmSync(path);
    else writeFileSync(path, edited);
    let got;
    try {
      got = runGate();
    } finally {
      writeFileSync(path, original);
    }
    const back = sha(readFileSync(path));
    const worktree = existsSync(join(REPO, relPath)) ? sha(readFileSync(join(REPO, relPath))) : null;
    if (back !== sha(original) || (worktree !== null && worktree !== back)) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: `${relPath} was not put back byte for byte in the clone` });
      continue;
    }
    rows.push(judge(arm, base, got, relPath));
    if (rows[rows.length - 1].verdict !== 'red') failed += 1;
  }
} catch (err) {
  failed += 1;
  say(`the run threw: ${String(err?.message ?? err)}`);
} finally {
  cleanup();
}

for (const row of rows) {
  process.stdout.write(`${row.verdict === 'red' ? 'ok  ' : 'FAIL'} ${row.arm.id.padEnd(3)} (${row.arm.rule}) ${row.arm.what}: ${row.why}\n`);
}
const after = treeDigest();
if (after !== before) {
  failed += 1;
  say('THE WORKING TREE MOVED during the run. This script never writes there, so another builder did, and these readings are of a moving tree; run it again.');
}
const rulesProved = new Set(rows.filter((r) => r.verdict === 'red').map((r) => r.arm.rule));
if (only.length === 0) {
  for (const rule of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's']) {
    if (!rulesProved.has(rule)) {
      failed += 1;
      say(`rule (${rule}) has no arm that turned it red, so nothing here proves it can fail`);
    }
  }
}
if (failed > 0) {
  say(`FAIL: ${String(failed)} problem(s). ${String(rows.filter((r) => r.verdict === 'red').length)} of ${String(arms.length)} arms red on their own rule.`);
  process.exit(1);
}
say(
  `PASS: ${String(arms.length)} of ${String(arms.length)} arms red on the rule that owns them, ` +
    `${only.length === 0 ? 'every rule (a) to (s) proved able to fail' : 'the named arms only (a full run is what proves every rule)'}, the clone removed, the working tree unmoved.`
);
