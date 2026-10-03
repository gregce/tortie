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
 *       `PHONE_BUILD`, the one this round uploads: 4 since Phase 316.6, 5
 *       since Phase 317.
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
 *   PHASE 316.6, the tab bar, Settings and the rendered conversation
 *   (build/p3166/SPEC.md §6). Six rules widen and two are new:
 *
 *   (a) also: `UITabBar…`, `UITabBarAppearance`, `badgeBackgroundColor`,
 *       `badgeTextAttributes` and `.appearance()` are named in
 *       `Style/Tokens.swift` alone, the badge's ground is set from
 *       `Token.statusAttentionBadgeBg` and its words from
 *       `Token.statusAttentionBadgeFg` and nothing else, and
 *       `TabBarLook.apply()` is called once, from `App/TortieApp.swift`.
 *   (b) also: `Tab` is a drawn call; exactly three `Tab(` in
 *       `App/TortieApp.swift`, `Copy.needsInput`, `Copy.sessions` and
 *       `Copy.settings` in that order with `bell`, `list.bullet` and
 *       `gearshape`, and none elsewhere; nothing hides the tab bar; and no
 *       `@AppStorage`, `@SceneStorage` or `UserDefaults` there, because the
 *       app opens on Needs input every launch and stores no tab.
 *   (k) also: ONE named scope, `ARITHMETIC_SCOPES`, the renderer
 *       (`Markdown/**` and `Screens/MarkdownView.swift`), whose operators
 *       need no line entry because its only input is a String; valid only
 *       while (y)'s y9 holds, it must still match an operator, and a door
 *       field is red inside it as everywhere.
 *   (n) also: `SecItemDelete(` only in `KeychainSecretStore.remove` and
 *       `KeychainClientKeys.delete`; the record removed only by
 *       `PairingStore`; a client key deleted outside its store only by
 *       `PairingStore.forget` and `PairingFlow.run`'s failed ending; the
 *       store's `forget()` from its four callers alone and `door.forget()`
 *       only in the DEBUG forget seam; the record removed BEFORE any key,
 *       with `try`; and `LiveDoor.unpair` calling `try store.forget()` in a
 *       `do` whose `catch` answers `.kept`, then asking `store.holdsRecord`.
 *   (s) the build is 4 (`PHONE_BUILD`); 5 since Phase 317, below.
 *   (x) also: `unregisterForRemoteNotifications` once, in the `#else` of
 *       `#if DEBUG` in `Alerts/SystemAlerts.swift`; `forgetAddress()` once,
 *       in `AppModel.unpair`'s `.forgotten` arm after `door.unpair()`; and
 *       no test names the unregister. The launch-read clause also holds
 *       `readAlertPermission`, behind its guard on `macSends`.
 *   (y) THE RENDERER'S BOUNDS: Foundation alone in the parser (y1); one
 *       `enum MarkdownCaps` of the thirteen pinned integer literals, each read
 *       once, where the SPEC says (y2); nothing in the renderer throws,
 *       traps, force-unwraps or names an unsafe API (y3), or matches a
 *       regular expression (y4); every recursion takes `depth` and passes
 *       `depth: depth + 1`, and Blocks.swift compares it with
 *       `MarkdownCaps.depth` (y5); `AttributedString(markdown:` once, in
 *       `Markdown/Inline.swift`, with exactly its three options (y6); nothing
 *       localizes a string anywhere in the app (y7); every `Text(` in
 *       MarkdownView.swift is verbatim, a symbol or an AttributedString (y8);
 *       and the renderer names no door type (y9). The ruled round of
 *       2026-10-01 adds THE AGENT'S OWN NUMBERS (difference D17): an ordered
 *       item carries the digits its marker wrote, as a String, never a counted
 *       number (y10, Rendered.swift), the marker keeps them from its own bytes
 *       (y11, Blocks.swift) and the mark drawn is that number (y12); and THE
 *       PAGE COST: an answer whose blocks, items and cells (y14) are more than
 *       `MarkdownCaps.pieces` takes `Inline.asWritten` and no blocks (y13),
 *       which removes every link and image address through the one parse
 *       (y15), and is drawn by `WrittenView` exactly as `28d89295`'s
 *       `AnswerText` drew every answer (y16). MARKDOWN OFF, his ruling of
 *       2026-10-02: y2 pins `MarkdownCaps.pieces` at 0, so EVERY answer takes
 *       y13's written path and y16's drawing; the parser and every clause
 *       above stay, held as they were, for the later phase that switches
 *       markdown back on by moving that pin.
 *   (z) NOTHING FETCHED, AND ONE WAY OUT: no `AsyncImage`,
 *       `NSAttributedString`, document type or `contentsOf:` outside DEBUG
 *       (z1); no in-app browser, sign-in sheet, preview, `canOpenURL` or
 *       SwiftUI `Link(` (z2); `OpenURLAction` and `openURL` only in
 *       `Markdown/Links.swift`, and `UIApplication.shared.open(` only there and
 *       in `Screens/SettingsScreen.swift` (z3); the one action asks
 *       `LinkPolicy.opens(` before it stages and the closure that opens asks
 *       again (z4); Settings opens iOS's own notification settings alone
 *       (z5); and `LinkPolicy.opens`, with the LinkPolicy helpers it reaches,
 *       names "https", `.user`, `.password`, `.port`, "xn--" and
 *       `MarkdownCaps.linkBytes` (z6).
 *
 *   PHASE 317, End from the phone behind Face ID (build/p317/SPEC.md §6.3).
 *   (aa) is left for Phase 316.7, so either order of landing works. Three
 *   rules are new and four widen:
 *
 *   (ab) THE WRITE. `"POST"` only in `present` and `signedPost`; `signedPost`
 *        called by `DoorClient.end` alone, once (the fix round took the
 *        unpair write out, and with it its caller, its body and its route);
 *        `WriteId.fresh` the one source of a write id (16 bytes of
 *        `SecRandomCopyBytes`), called once, bound to a local and never kept
 *        on a type; the body built in `signedPost` alone with `.sortedKeys`
 *        and exactly its keys (`batch,session,write`); the writer's
 *        `end(` called once in the app, in `EndRunner.run`, with no `while`
 *        or `repeat` around a write; `handed` set once, in `send()`, as the
 *        statement just before `connection.send` and after `withheld` is
 *        asked; `withheld` set once, by a write's cancellation, only while
 *        `handed` is false; `WriteResult.of` classifying by `handed`; and an
 *        answer accepted only with the sent id echoed, or `""` with `refused`
 *        and `malformed` (F2, F14).
 *   (ac) THE OWNER CHECK. `import LocalAuthentication` and `LAContext` in
 *        `App/OwnerCheck.swift` alone; one `evaluatePolicy(` call, with
 *        `.deviceOwnerAuthentication`; the biometrics-only policy only as
 *        `canEvaluatePolicy`'s argument in `kind()` (a question that picks the
 *        glyph and authenticates nothing: the fix round, after the verify
 *        drew Face ID's mark on a phone that would ask for the passcode),
 *        asked in a guard answering `.passcode` BEFORE `kind()` reads
 *        `biometryType`, and no reuse window anywhere; a new `LAContext()` in `confirm`; `DeviceOwnerCheck`
 *        the one conformer; every `run` of a runner inside the `.confirmed`
 *        case of a switch on `confirm(`; nothing in Settings, the pairing,
 *        the conversation, `DoorWords.swift`, `Door/` or an unpair names the
 *        check; no string that could key a stored Face ID setting; and
 *        Info.plist's `NSFaceIDUsageDescription` is FACE_ID_USAGE, word for
 *        word, and in rule (e)'s PINNED_PLIST_KEYS, so a device spelling of
 *        it or an `INFOPLIST_KEY_` that generates one is refused. And (the
 *        tests round, after the reverify's ablation B4 left every gate
 *        green) the ONE element identified `ID.sessionEnd` is a `Button` in
 *        `Screens/EndBar.swift` whose own modifier chain holds
 *        `.disabled(row == .off)` over `EndBarDrawing.Row`'s two cases, so an
 *        End drawn off cannot be pressed and reads off (`ruleEndPressOff`).
 *   (ad) THE LIST THAT ONLY SHRINKS, AND NOTHING SENT AFTER THE APP LEFT.
 *        `EndRunner.targets` a `let`, never grown; one loop over it with ONE
 *        awaited write per turn; `stopRequested` read before each write, the
 *        first included, and never set false; every `EndRunner(` bound,
 *        registered, and only then the owner check asked; `AppModel.wentAway`
 *        stopping every runner `register(_:)` keeps (its `stop()`, or both
 *        halves of it: `stopRequested` set AND its task cancelled); and
 *        nothing in `Screens/EndBar.swift`,
 *        `Screens/EndBatch.swift` or the write path persists a write or a
 *        target. `(l)` stands whole: no background task finishes a write.
 *   (t)  also: every `connect(` names `identity:`, and `signedPost` hands it
 *        `door.identity`, so the writes present the client certificate too;
 *        and hostile-door.mjs names the nine write arms of SPEC §7.5 EH, each
 *        `write: true` with its `posts:` counted, ending in a sentence under
 *        End, back on the list, or drawn with no press possible, in Copy
 *        words or the door's own POCKET_WRITE_SENTENCES.
 *   (v)  also: `DoorWords.endSentence(for:)` returns a non-optional `String`
 *        for every `WriteResult` case, never nil, `""` or a default; and
 *        `EndModel`'s and `EndBatchModel`'s `line` is assigned only nil or a
 *        Copy or DoorWords sentence.
 *   (k)  reads EndBar.swift and EndBatch.swift like every app file: they hold
 *        no arithmetic operator today (the counts are `.count` and Copy's
 *        composers), so the table names none of theirs, and an arm plants one.
 *   (s)  the build is 5 (`PHONE_BUILD`), and its "not uploaded" fixtures 6.
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
/** Phase 317: the door's write sentences, which (t) holds the hostile write arms to. */
const POCKET_TS = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
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
  '(?<![A-Za-z0-9_.])(Text|Label|Button|Toggle|Link|Tab|TextField|SecureField|Section|Picker|Menu|NavigationLink|ProgressView|Stepper|LabeledContent|ContentUnavailableView|ShareLink|GroupBox|DisclosureGroup|LocalizedStringKey)\\s*\\(' +
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
 * beside the pinned value, unread. Since Phase 330 the two it pinned (the ATS
 * dictionary and the local network string) are refused outright, by the name
 * CFBundle reads, which refuses every spelling of them. Since Phase 317 it
 * pins Face ID's purpose string (rule ac reads its words): a
 * `NSFaceIDUsageDescription~iphone` would be read on a phone in place of the
 * one checked, and an `INFOPLIST_KEY_NSFaceIDUsageDescription` would generate
 * one the file does not show.
 */
export const PINNED_PLIST_KEYS = new Set(['NSFaceIDUsageDescription']);

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
  { file: 'Screens/Pieces.swift', line: 'max(0, lineHeight - UIFont.systemFont(ofSize: size, weight: weight.uiWeight).lineHeight)', ops: 1, why: 'two CGFloat line heights of the phone\'s own type scale' },
  // Phase 316.6: the day this iPhone paired, `PairedClock.date` (SPEC §5.3.1).
  { file: 'Screens/SettingsScreen.swift', line: 'Date(timeIntervalSince1970: epochMs / 1000).formatted(date: .abbreviated, time: .omitted)', ops: 1, why: 'a Double (`epochMs: Double`, the pairing\'s own pairedAt) divided: floating point never traps' }
];

/**
 * THE ONE NAMED SCOPE (Phase 316.6, build/p3166/SPEC.md §6.1 (k)). The
 * markdown renderer is a line parser, and a parser is index arithmetic: dozens
 * of lines of `i + 1` and `count - 1`. Naming each would bury the table. So an
 * operator in a file this scope covers needs no line entry, because the
 * renderer's only input is a `String` and every integer in it is a count or a
 * position inside at most `MarkdownCaps.answerBytes` bytes, so no sum
 * approaches `Int.max`. THREE THINGS HOLD IT, read on every run:
 *
 *   - it is valid only while rule (y)'s clause y9 holds, that the renderer
 *     names no door type, decoder or connection (`rendererBoundary`): a
 *     renderer that names `PocketTurn` could hold a door number, and then
 *     every operator in it needs its own reason again, so the scope is waived
 *     for that run and its operators read as unexplained;
 *   - it must still match at least one operator, or it is a stale waiver;
 *   - an operand naming a door number field is red inside it, as everywhere.
 */
export const ARITHMETIC_SCOPES = [
  {
    label: 'Markdown/** and Screens/MarkdownView.swift',
    covers: (name) => name.startsWith('Markdown/') || name === 'Screens/MarkdownView.swift',
    why: "the markdown renderer: its only input is a String, and every integer in it is a count or a position inside at most MarkdownCaps.answerBytes bytes, so no sum approaches Int.max; valid only while (y)'s y9 holds"
  }
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
export function ruleDoorArithmetic(files, contractName, named = ARITHMETIC_NAMED, scopes = ARITHMETIC_SCOPES) {
  const findings = [];
  const said = { fields: [], proved: 0, named: 0, sites: 0, helperAt: null, scoped: 0 };
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
  // THE SCOPES, each judged before any operator is: valid only while every
  // file it covers names no door type (y9), and counted so a scope that
  // covers nothing is said.
  const scopeState = scopes.map((scope) => {
    const covered = files.filter((f) => scope.covers(f.name));
    const crossing = covered.flatMap((f) => rendererBoundary(f.source).map((b) => `${f.name}:${String(b.line)} names ${b.name}`));
    return { scope, covered: covered.length, crossing, operators: 0 };
  });
  for (const s of scopeState) {
    if (s.crossing.length > 0) {
      findings.push(`ARITHMETIC_SCOPES's ${s.scope.label} holds only while the renderer names no door type (rule y9), and ${s.crossing.slice(0, 3).join('; ')}, so its operators are not waived this run`);
    }
  }
  const scopeOf = (name) => scopeState.find((s) => s.scope.covers(name)) ?? null;
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
      const scoped = scopeOf(f.name);
      if (scoped !== null && scoped.crossing.length === 0) {
        scoped.operators += 1;
        said.scoped += 1;
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
  for (const s of scopeState) {
    if (s.crossing.length === 0 && s.operators === 0) {
      findings.push(`ARITHMETIC_SCOPES's ${s.scope.label} covers ${String(s.covered)} file(s) and no operator this rule reads; a scope that waives nothing is stale, take it out`);
    }
  }
  said.scopes = scopeState.map((s) => ({ label: s.scope.label, files: s.covered, operators: s.operators, valid: s.crossing.length === 0 }));
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
export function ruleClientTransport({ client, pairing, keys, files = [], hostile, copy, writeSentences = null }) {
  const findings = [];
  const said = { exchanges: 0, identityCalls: 0, arms: [], writeArms: [], connects: 0 };
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
  // Phase 317 (SPEC §6.3 (t) widened): every SIGNED request presents the
  // identity, the write path included. The writes reach the connection through
  // `connect(`, under `exchange(`, so every call of it names `identity:`, and
  // signedPost hands it the paired door's.
  for (const call of c.bare.matchAll(/(?<!func\s)\bconnect\s*\(/g)) {
    said.connects += 1;
    const close = closeParen(c.bare, c.bare.indexOf('(', call.index));
    const args = c.bare.slice(call.index, close === -1 ? c.bare.length : close + 1);
    if (!/\bidentity\s*:/.test(args)) findings.push(`${at(call.index)} calls connect( without naming identity:, so a write could go out with no decision about what it presents`);
  }
  const signedPostAt = /\bfunc\s+signedPost\b/.exec(c.bare);
  if (signedPostAt !== null && !/\bidentity\s*:\s*door\s*\.\s*identity\b/.test(bodyAfter(c.bare, signedPostAt.index))) {
    findings.push('Door/DoorClient.swift\'s signedPost does not open its connection with identity: door.identity, so a write could go out with no certificate and the door would cut it');
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
    // Phase 317: EH's write arms, each ending where it names, in a line
    // Copy.swift or the door's own POCKET_WRITE_SENTENCES holds, with the
    // POSTs a press may send counted.
    const doorKeys = new Set(writeSentences ?? []);
    if (writeSentences === null) findings.push('src/shared/ipc/pocket.ts declares no POCKET_WRITE_SENTENCES this rule can read, so no write arm\'s door sentence can be checked');
    const listOf = (row, key) => [...(new RegExp(`\\b${key}:\\s*\\[([^\\]]*)\\]`).exec(row)?.[1] ?? '').matchAll(/'([A-Za-z0-9_]+)'/g)].map((m) => m[1]);
    for (const arm of HOSTILE_WRITE_ARMS) {
      const row = new RegExp(`(?:^|\\n)\\s*'${arm}':\\s*\\{([^\\n]*)\\}`).exec(hostile);
      if (row === null) {
        findings.push(`build/p316/hostile-door.mjs names no write arm ${JSON.stringify(arm)}`);
        continue;
      }
      said.writeArms.push(arm);
      if (!/\bwrite:\s*true\b/.test(row[1])) findings.push(`hostile-door.mjs's ${arm} is not marked write: true`);
      if (!/\bposts:\s*\d+\b/.test(row[1])) findings.push(`hostile-door.mjs's ${arm} does not say how many POSTs a press sends (posts:), so one POST per press cannot be held`);
      const ends = /\bends:\s*'([^']*)'/.exec(row[1])?.[1] ?? null;
      if (ends === null || !WRITE_ARM_ENDS.has(ends)) findings.push(`hostile-door.mjs's ${arm} ends in ${JSON.stringify(ends)}, not a sentence under End, the list, Pairing, or a drawn End that cannot be pressed`);
      if (!/\bat:\s*'[a-z0-9-]+'/.test(row[1])) findings.push(`hostile-door.mjs's ${arm} does not say where it ends (at:)`);
      const expected = listOf(row[1], 'expect');
      const door = listOf(row[1], 'door');
      const never = listOf(row[1], 'never');
      if (ends === 'sentence' && expected.length + door.length === 0) findings.push(`hostile-door.mjs's ${arm} ends in a sentence and names none it may be`);
      for (const w of [...expected, ...never]) if (!copyWords.has(w)) findings.push(`hostile-door.mjs's ${arm} names Copy.${w}, which Copy.swift does not hold`);
      for (const k of door) if (!doorKeys.has(k)) findings.push(`hostile-door.mjs's ${arm} expects the door's ${k} sentence, which POCKET_WRITE_SENTENCES does not hold`);
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
 * The build this round uploads: 1.0.0 (5) (Phase 317, build/p317/SPEC.md
 * §4.3, §5.8.8). 1.0.0 (4) is Phase 316.6's, (3) Phase 316.5's and (2) Phase
 * 330's, so a build that did not move would be refused by App Store Connect
 * as a duplicate. The round that uploads the next build moves this with the
 * project, in the same commit (6 if Phase 316.7 lands first, SPEC §4.2 item 4).
 */
export const PHONE_BUILD = '5';

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
// Phase 316.6: the tab bar, Settings, Unpair and the rendered conversation
// (build/p3166/SPEC.md §6)
// ---------------------------------------------------------------------------
//
// THE DECLARATIONS A RULE PLACES A CALL IN. Several clauses below are about
// WHERE a name is called (only `KeychainSecretStore.remove` deletes a Keychain
// item; `forgetAddress()` only in `AppModel.unpair`'s `.forgotten` arm), so
// they read every type and function body by matching braces over the bare
// text, and place a call in the innermost of each.

/** Every type declaration with a body, over bare text: `{ kind, name, at, open, close }`. */
export function typeSpans(bare) {
  const out = [];
  for (const m of bare.matchAll(/\b(struct|class|enum|actor|extension|protocol)\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)/g)) {
    if (/^(?:func|var|let|init|subscript|static|override|final|private|public|internal|fileprivate)$/.test(m[2])) continue;
    if (/\bimport\s+$/.test(bare.slice(Math.max(0, m.index - 12), m.index))) continue;
    const open = bare.indexOf('{', m.index + m[0].length);
    if (open === -1) continue;
    const between = bare.slice(m.index + m[0].length, open);
    if (/[;}]/.test(between)) continue;
    const close = matchForward(bare, open);
    out.push({ kind: m[1], name: m[2], at: m.index, open, close: close === -1 ? bare.length : close });
  }
  return out;
}

/**
 * Every function declaration, over bare text: `{ name, at, paramsOpen,
 * paramsClose, params, bodyOpen, bodyClose }`, `bodyOpen` -1 for a
 * requirement with no body. The body is the first `{` after the parameter
 * list unless the signature ends first (a `}`, a `;`, or a new line whose
 * next token does not continue a signature).
 */
export function funcSpans(bare) {
  const out = [];
  for (const m of bare.matchAll(/\bfunc\s+([A-Za-z_]\w*)\s*(?:<[^>{(]*>)?\s*\(/g)) {
    const paramsOpen = m.index + m[0].length - 1;
    const paramsClose = closeParen(bare, paramsOpen);
    if (paramsClose === -1) continue;
    let bodyOpen = -1;
    for (let k = paramsClose + 1; k < bare.length; k += 1) {
      const c = bare[k];
      if (c === '{') {
        bodyOpen = k;
        break;
      }
      if (c === '}' || c === ';') break;
      if (c === '\n') {
        const next = /^\s*(\S+)/.exec(bare.slice(k + 1))?.[1] ?? '';
        if (!/^(?:->|throws|rethrows|async|where|\{)/.test(next)) break;
      }
    }
    const bodyClose = bodyOpen === -1 ? -1 : matchForward(bare, bodyOpen);
    out.push({ name: m[1], at: m.index, paramsOpen, paramsClose, params: bare.slice(paramsOpen + 1, paramsClose), bodyOpen, bodyClose: bodyClose === -1 ? bare.length : bodyClose });
  }
  return out;
}

/** The innermost span holding `index`, by `open`/`close` or `bodyOpen`/`bodyClose`. */
function innermost(spans, index) {
  let best = null;
  for (const s of spans) {
    const open = s.bodyOpen ?? s.open;
    const close = s.bodyClose ?? s.close;
    if (open === -1 || index <= open || index >= close) continue;
    if (best === null || open > (best.bodyOpen ?? best.open)) best = s;
  }
  return best;
}

/**
 * The bodies a statement can sit in for "the same function": every func, every
 * init and every computed property (`var body: some View {`), over bare text.
 */
function declSpans(bare) {
  const out = funcSpans(bare).filter((f) => f.bodyOpen !== -1);
  for (const m of bare.matchAll(/\binit\s*[?!]?\s*\(/g)) {
    const paren = m.index + m[0].length - 1;
    const closed = closeParen(bare, paren);
    if (closed === -1) continue;
    const open = bare.indexOf('{', closed);
    if (open === -1 || /[;}]/.test(bare.slice(closed, open))) continue;
    out.push({ name: 'init', at: m.index, bodyOpen: open, bodyClose: matchForward(bare, open) });
  }
  for (const m of bare.matchAll(/\bvar\s+([A-Za-z_]\w*)\s*:\s*[^={}\n]+\{/g)) {
    const open = m.index + m[0].length - 1;
    out.push({ name: m[1], at: m.index, bodyOpen: open, bodyClose: matchForward(bare, open) });
  }
  return out;
}

/** The arguments of a call's parentheses, split at their own commas. */
function topLevelArgs(text) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let k = 0; k < text.length; k += 1) {
    const c = text[k];
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') depth -= 1;
    else if (c === ',' && depth === 0) {
      out.push(text.slice(from, k).trim());
      from = k + 1;
    }
  }
  out.push(text.slice(from).trim());
  return out.filter((a) => a !== '');
}

/** The right side of an assignment, from just past its `=` to the end of its statement. */
function rightSide(bare, from) {
  let depth = 0;
  for (let k = from; k < bare.length; k += 1) {
    const c = bare[k];
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return bare.slice(from, k);
      depth -= 1;
    } else if ((c === '\n' || c === ';') && depth === 0) return bare.slice(from, k);
  }
  return bare.slice(from);
}

/** Tarjan's strongly connected components of a name graph; a cycle is a component of two or more, or one that calls itself. */
function cyclesOf(nodes, edges) {
  const index = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const out = [];
  let counter = 0;
  const visit = (v) => {
    index.set(v, counter);
    low.set(v, counter);
    counter += 1;
    stack.push(v);
    onStack.add(v);
    for (const w of edges.get(v) ?? []) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
    }
    if (low.get(v) === index.get(v)) {
      const component = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      if (component.length > 1 || (edges.get(v) ?? new Set()).has(v)) out.push(new Set(component));
    }
  };
  for (const v of nodes) if (!index.has(v)) visit(v);
  return out;
}

// ---- (a), widened: the badge's colour reaches UIKit's tab bar from Tokens.swift

/** The one file that names the tab bar's UIKit look (and the one that writes a colour). */
export const TAB_BAR_FILE = 'Style/Tokens.swift';
const TAB_BAR_NAMES = [
  [/\bUITabBar\w*/g, "UIKit's tab bar or its appearance"],
  [/\bbadgeBackgroundColor\b/g, "a badge's ground"],
  [/\bbadgeTextAttributes\b/g, "a badge's words"],
  [/\.\s*appearance\s*\(\s*\)/g, 'a UIKit appearance proxy']
];
/** The badge's two colours and the token each is set from: the Mac's count badge, tokens.css --status-attention-badge-bg and -fg. */
export const BADGE_COLOURS = Object.freeze({ badgeBackgroundColor: 'statusAttentionBadgeBg', badgeTextAttributes: 'statusAttentionBadgeFg' });

/** Every colour token an expression names: `Token.x`, `Tokens.x`, or an implicit `.x` of a token's shape. */
function tokensNamed(text) {
  const out = new Set();
  for (const m of text.matchAll(/\bTokens?\s*\.\s*([A-Za-z_]\w*)/g)) out.add(m[1]);
  for (const m of text.matchAll(/(?<![\w.])\.\s*(status[A-Z]\w*|accent|error|graphLane\d+|bg[A-Z]\w*|border\w*|text[A-Z]\w*)\b/g)) out.add(m[1]);
  return out;
}

/**
 * Rule (a), the tab bar's look (SPEC §5.1.6, §6.1 (a)). SwiftUI sets no badge
 * colour, so the badge's two colours reach UIKit's tab bar through
 * `UITabBarAppearance`; and `Style/Tokens.swift` is the one file that writes
 * a colour, so `UITabBar…`, `badgeBackgroundColor`, `badgeTextAttributes`
 * and `.appearance()` are named there alone, each badge colour is set from its
 * token and nothing else, and `TabBarLook.apply()` is called once, from
 * `App/TortieApp.swift`. Files are named relative to the app folder.
 */
export function ruleTabBarLook(files) {
  const findings = [];
  const said = { ground: 0, words: 0, applied: 0 };
  for (const f of files) {
    const { bare } = lexSwift(f.source);
    for (const m of bare.matchAll(/\bTabBarLook\s*\.\s*apply\s*\(/g)) {
      said.applied += 1;
      if (f.name !== 'App/TortieApp.swift') findings.push(`${f.name}:${String(lineOf(bare, m.index))} calls TabBarLook.apply(); it is called once, from App/TortieApp.swift, before the first TabView exists`);
    }
    if (f.name === TAB_BAR_FILE) continue;
    for (const [re, what] of TAB_BAR_NAMES) {
      for (const m of bare.matchAll(re)) findings.push(`${f.name}:${String(lineOf(bare, m.index))} names ${m[0].replace(/\s+/g, '')} (${what}); the tab bar's look is set in ${TAB_BAR_FILE} alone, the one file that writes a colour`);
    }
  }
  const tokens = files.find((f) => f.name === TAB_BAR_FILE);
  if (tokens === undefined) return { findings: [...findings, `${TAB_BAR_FILE} does not exist, so nothing sets the badge's colour`], said };
  const { bare } = lexSwift(tokens.source);
  for (const m of bare.matchAll(/\b(badgeBackgroundColor|badgeTextAttributes)\s*=(?!=)/g)) {
    const want = BADGE_COLOURS[m[1]];
    let rhs = rightSide(bare, m.index + m[0].length);
    const alias = /^\s*([a-z_]\w*)\s*$/.exec(rhs)?.[1];
    if (alias !== undefined) {
      const bound = new RegExp(`\\b(?:let|var)\\s+${alias}\\b[^=\\n]*=(?!=)`).exec(bare);
      if (bound !== null) rhs = rightSide(bare, bound.index + bound[0].length);
    }
    const named = tokensNamed(rhs);
    if (m[1] === 'badgeBackgroundColor') said.ground += 1;
    else said.words += 1;
    if (!named.has(want) || named.size !== 1) {
      findings.push(`${TAB_BAR_FILE}:${String(lineOf(bare, m.index))} sets ${m[1]} from ${named.size === 0 ? 'no token' : [...named].map((n) => `Token.${n}`).join(' and ')}; it is Token.${want}, the Mac's count badge (${kebab(want)}), and nothing else`);
    }
  }
  if (said.ground === 0) findings.push(`${TAB_BAR_FILE} never sets badgeBackgroundColor, so the Needs input badge is iOS's red and not the Mac's ${kebab(BADGE_COLOURS.badgeBackgroundColor)}`);
  if (said.words === 0) findings.push(`${TAB_BAR_FILE} never sets badgeTextAttributes, so the badge's number is not the Mac's ${kebab(BADGE_COLOURS.badgeTextAttributes)}`);
  if (said.applied !== 1) findings.push(`TabBarLook.apply() is called ${String(said.applied)} time(s) in the app; it is called once, from App/TortieApp.swift, before the first TabView exists`);
  return { findings, said };
}

// ---- (b), widened: three tabs, the bar never hidden, no tab stored

/** The file that builds the tabs, relative to the app folder. */
export const TAB_FILE = 'App/TortieApp.swift';
/** The three tabs, in order: each one's Copy word and its SF Symbol (SPEC §5.1.1). */
export const TABS = Object.freeze([
  { copy: 'needsInput', image: 'bell' },
  { copy: 'sessions', image: 'list.bullet' },
  { copy: 'settings', image: 'gearshape' }
]);

/**
 * Rule (b), the tab bar (SPEC §6.1 (b)): exactly three `Tab(` in
 * `App/TortieApp.swift`, labelled `Copy.needsInput`, `Copy.sessions` and
 * `Copy.settings` in that order with `bell`, `list.bullet` and `gearshape`,
 * and none anywhere else; nothing hides the tab bar
 * (`.toolbar(.hidden, for: .tabBar)`, `.toolbarVisibility(.hidden, for:
 * .tabBar)`), because the bar stays on a pushed session; and no
 * `@AppStorage`, `@SceneStorage` or `UserDefaults` in `App/TortieApp.swift`,
 * because the app opens on Needs input every launch and stores no tab.
 */
export function ruleTabs(files) {
  const findings = [];
  const said = { tabs: 0 };
  const app = files.find((f) => f.name === TAB_FILE);
  if (app === undefined) findings.push(`${TAB_FILE} does not exist, so there is no tab bar to read`);
  for (const f of files) {
    const { bare, strings } = lexSwift(f.source);
    const at = (i) => `${f.name}:${String(lineOf(bare, i))}`;
    const calls = [...bare.matchAll(/(?<![A-Za-z0-9_.])Tab\s*\(/g)];
    if (f.name !== TAB_FILE) {
      for (const c of calls) findings.push(`${at(c.index)} builds a Tab; the three tabs are built in ${TAB_FILE}, and there is no fourth`);
    } else {
      said.tabs = calls.length;
      if (calls.length !== TABS.length) {
        findings.push(`${TAB_FILE} builds ${String(calls.length)} Tab(s); the app has three, Needs input, Sessions and Settings, and no fourth (a fourth would be search, Past Sessions or machines, which Phase 316 refuses)`);
      }
      calls.forEach((c, k) => {
        const want = TABS[k];
        if (want === undefined) return;
        const open = c.index + c[0].length - 1;
        const close = closeParen(bare, open);
        const args = topLevelArgs(bare.slice(open + 1, close === -1 ? bare.length : close));
        const first = (args[0] ?? '').replace(/\s+/g, '');
        if (first !== `Copy.${want.copy}`) findings.push(`${at(c.index)}: tab ${String(k + 1)} is labelled ${first.trim() === '' || /^"\s*"$/.test(first) ? 'with a literal' : first}; it is Copy.${want.copy}`);
        const image = strings.find((s) => s.start > open && (close === -1 || s.end <= close) && /\bsystemImage\s*:\s*$/.test(bare.slice(Math.max(open, s.start - 24), s.start)));
        if (image?.value !== want.image) findings.push(`${at(c.index)}: tab ${String(k + 1)} draws the symbol ${JSON.stringify(image?.value ?? null)}; it is ${JSON.stringify(want.image)}`);
      });
    }
    for (const m of bare.matchAll(/\.\s*(toolbar|toolbarVisibility)\s*\(/g)) {
      const open = m.index + m[0].length - 1;
      const close = closeParen(bare, open);
      const args = bare.slice(open + 1, close === -1 ? bare.length : close);
      if (/\.\s*hidden\b/.test(args) && /\.\s*tabBar\b/.test(args)) findings.push(`${at(m.index)} hides the tab bar; it stays on a pushed session, so a session is one tap from Needs input (SPEC §5.1.1)`);
    }
    if (f.name === TAB_FILE) {
      for (const m of bare.matchAll(/@AppStorage\b|@SceneStorage\b|\bUserDefaults\b/g)) findings.push(`${at(m.index)} names ${m[0]}; the app opens on Needs input every launch and stores no tab`);
    }
  }
  return { findings, said };
}

// ---- (n), widened: who deletes a pairing item, and in what order

/**
 * Rule (n), the deleters (SPEC §5.4, §6.1 (n)), over the app's Swift named
 * relative to the app folder. `SecItemDelete(` only in `Door/Keys.swift`,
 * inside `KeychainSecretStore.remove` and `KeychainClientKeys.delete`;
 * `secrets.remove(` only inside `PairingStore`; `.delete(tag:` outside
 * `KeychainClientKeys` only in `PairingStore.forget` and `PairingFlow.run`'s
 * failed ending; the store's `forget()` called only by `PairingStore.load`,
 * `PairingStore.forgetOnFreshInstall`, `LiveDoor.forget` and
 * `LiveDoor.unpair`, and `door.forget()` only inside `#if DEBUG` in
 * `AppModel.launch` (the forget seam); in `PairingStore.forget` the record's
 * `try secrets.remove(Self.account)` comes before any `delete(tag:`, because
 * the record holds both private halves, so a failed removal has touched
 * nothing; and `LiveDoor.unpair` calls `try store.forget()` inside a `do`
 * whose `catch` answers `.kept`, never `try?`, then asks `store.holdsRecord`.
 */
export function ruleDeleters(files) {
  const findings = [];
  const said = { secItemDeletes: 0, recordRemoves: 0, keyDeletes: 0, storeForgets: 0, doorForgets: 0 };
  for (const f of files) {
    const lx = lexSwift(f.source);
    const bare = lx.bare;
    const types = typeSpans(bare);
    const funcs = funcSpans(bare).filter((fn) => fn.bodyOpen !== -1);
    const place = (i) => ({ type: innermost(types, i)?.name ?? null, fn: innermost(funcs, i)?.name ?? null });
    const at = (i) => `${f.name}:${String(lineOf(bare, i))}`;
    const said2 = (p) => `${p.type ?? 'no type'}.${p.fn ?? 'no function'}`;
    for (const m of bare.matchAll(/\bSecItemDelete\s*\(/g)) {
      said.secItemDeletes += 1;
      const p = place(m.index);
      const ok = f.name === 'Door/Keys.swift' && ((p.type === 'KeychainSecretStore' && p.fn === 'remove') || (p.type === 'KeychainClientKeys' && p.fn === 'delete'));
      if (!ok) findings.push(`${at(m.index)} calls SecItemDelete in ${said2(p)}; a Keychain item is deleted only by Door/Keys.swift's KeychainSecretStore.remove and KeychainClientKeys.delete`);
    }
    for (const m of bare.matchAll(/\bsecrets\s*\.\s*remove\s*\(/g)) {
      said.recordRemoves += 1;
      const p = place(m.index);
      if (p.type !== 'PairingStore') findings.push(`${at(m.index)} removes a pairing record in ${said2(p)}; only PairingStore removes one`);
    }
    for (const m of bare.matchAll(/\.\s*delete\s*\(\s*tag\s*:/g)) {
      said.keyDeletes += 1;
      const p = place(m.index);
      const ok = p.type === 'KeychainClientKeys' || (p.type === 'PairingStore' && p.fn === 'forget') || (f.name === 'Door/Pairing.swift' && p.type === 'PairingFlow' && p.fn === 'run');
      if (!ok) findings.push(`${at(m.index)} deletes a client key in ${said2(p)}; outside KeychainClientKeys only PairingStore.forget and PairingFlow.run's failed ending delete one`);
    }
    const debug = debugLines(lx.code);
    for (const m of bare.matchAll(/(?<![\w$])(?:([A-Za-z_]\w*(?:\s*\??\s*\.\s*[A-Za-z_]\w*)*)\s*\??\s*\.\s*)?forget\s*\(\s*\)/g)) {
      if (/\bfunc\s+$/.test(bare.slice(Math.max(0, m.index - 12), m.index))) continue;
      const receiver = (m[1] ?? '').replace(/[\s?]+/g, '');
      const p = place(m.index);
      if (receiver === 'door') {
        said.doorForgets += 1;
        const ok = f.name === 'App/TortieApp.swift' && p.type === 'AppModel' && p.fn === 'launch' && debug[lineOf(bare, m.index)] === true;
        if (!ok) findings.push(`${at(m.index)} calls door.forget() in ${said2(p)}; the DEBUG forget seam is called only inside #if DEBUG in AppModel.launch, and Unpair is door.unpair()`);
        continue;
      }
      said.storeForgets += 1;
      const ok =
        (p.type === 'PairingStore' && (p.fn === 'load' || p.fn === 'forgetOnFreshInstall') && (receiver === '' || receiver === 'self')) ||
        (p.type === 'LiveDoor' && (p.fn === 'forget' || p.fn === 'unpair') && receiver === 'store');
      if (!ok) findings.push(`${at(m.index)} calls ${receiver === '' ? '' : `${receiver}.`}forget() in ${said2(p)}; the store's forget() is called only by PairingStore.load, PairingStore.forgetOnFreshInstall, LiveDoor.forget and LiveDoor.unpair`);
    }
  }
  // The order inside PairingStore.forget.
  const keys = files.find((f) => f.name === 'Door/Keys.swift');
  if (keys === undefined) findings.push('Door/Keys.swift does not exist, so the order of deletion cannot be read');
  else {
    const bare = lexSwift(keys.source).bare;
    const store = typeSpans(bare).find((t) => t.name === 'PairingStore' && t.kind !== 'extension');
    const forget = store === undefined ? undefined : funcSpans(bare).find((fn) => fn.name === 'forget' && fn.bodyOpen > store.open && fn.bodyClose <= store.close);
    if (forget === undefined) findings.push('Door/Keys.swift declares no PairingStore.forget() with a body');
    else {
      const body = bare.slice(forget.bodyOpen, forget.bodyClose);
      const record = /\btry\s+secrets\s*\.\s*remove\s*\(\s*Self\s*\.\s*account\s*\)/.exec(body);
      const firstKey = /\.\s*delete\s*\(\s*tag\s*:/.exec(body);
      if (record === null) findings.push('PairingStore.forget does not remove the record with `try secrets.remove(Self.account)`, so a removal that fails is not seen and "Nothing was changed." could be false');
      else if (firstKey !== null && firstKey.index < record.index) findings.push(`Door/Keys.swift:${String(lineOf(bare, forget.bodyOpen + firstKey.index))} deletes a client key before the record; the record goes FIRST, because it holds both private halves, so a failed removal has touched nothing (SPEC §5.4)`);
    }
  }
  // LiveDoor.unpair: the store's error is seen, never swallowed.
  const app = files.find((f) => f.name === 'App/TortieApp.swift');
  if (app === undefined) findings.push('App/TortieApp.swift does not exist, so LiveDoor.unpair cannot be read');
  else {
    const bare = lexSwift(app.source).bare;
    const live = typeSpans(bare).find((t) => t.name === 'LiveDoor' && t.kind !== 'extension');
    const unpair = live === undefined ? undefined : funcSpans(bare).find((fn) => fn.name === 'unpair' && fn.bodyOpen > live.open && fn.bodyClose <= live.close);
    if (unpair === undefined) findings.push('App/TortieApp.swift declares no LiveDoor.unpair(), so Unpair has nothing that reports whether the record went');
    else {
      const body = bare.slice(unpair.bodyOpen, unpair.bodyClose + 1);
      if (/\btry\s*[?!]\s*(?:self\s*\.\s*)?store\s*\.\s*forget\s*\(/.test(body)) findings.push(`App/TortieApp.swift:${String(lineOf(bare, unpair.at))} LiveDoor.unpair swallows the store's error with try? or try!; it calls try store.forget() inside a do whose catch answers .kept`);
      if (!/\bdo\s*\{[^{}]*\btry\s+(?:self\s*\.\s*)?store\s*\.\s*forget\s*\(\s*\)[^{}]*\}\s*catch\b[^{]*\{[^{}]*\.\s*kept\b/.test(body)) {
        findings.push(`App/TortieApp.swift:${String(lineOf(bare, unpair.at))} LiveDoor.unpair does not call try store.forget() inside a do whose catch answers .kept, so a record that would not go could read as forgotten`);
      }
      if (!/\bstore\s*\.\s*holdsRecord\b/.test(body)) findings.push(`App/TortieApp.swift:${String(lineOf(bare, unpair.at))} LiveDoor.unpair never asks store.holdsRecord, so a forget that answered and left the record would read as forgotten`);
    }
  }
  return { findings, said };
}

// ---- (x), widened: Unpair stops Apple taking alerts for this install

/**
 * Rule (x), Unpair's half (SPEC §5.4, §6.1 (x)), over the app's Swift named
 * relative to the app folder and the tests' named relative to ios/:
 * `unregisterForRemoteNotifications` exactly once in the app, in
 * `Alerts/SystemAlerts.swift`, inside the `#else` of `#if DEBUG`, so a DEBUG
 * build, which is every Simulator run, never speaks to Apple in either
 * direction; `forgetAddress()` called exactly once, in `AppModel.unpair`'s
 * `.forgotten` arm, after `door.unpair()`, so only a pairing that really went
 * unregisters; and no test names `unregisterForRemoteNotifications`.
 */
export function ruleForgetAddress(files, tests = []) {
  const findings = [];
  const said = { unregisters: 0, forgets: 0 };
  const unregisters = [];
  for (const f of files) {
    const lx = lexSwift(f.source);
    for (const m of lx.bare.matchAll(/\bunregisterForRemoteNotifications\b/g)) unregisters.push({ f, lx, index: m.index, code: true });
    for (const s of lx.strings) if (/\bunregisterForRemoteNotifications\b/.test(s.value)) unregisters.push({ f, lx, index: s.start, code: false });
  }
  said.unregisters = unregisters.length;
  if (unregisters.length !== 1) findings.push(`the app names unregisterForRemoteNotifications ${String(unregisters.length)} time(s); it is named once, in ${ALERT_FILES.system}, in the #else of #if DEBUG`);
  for (const u of unregisters) {
    const where = `${u.f.name}:${String(lineOf(u.lx.bare, u.index))}`;
    if (u.f.name !== ALERT_FILES.system || !u.code) findings.push(`${where} names unregisterForRemoteNotifications${u.code ? '' : ' in a string'}; only ${ALERT_FILES.system} unregisters`);
    else if (releaseLines(u.lx.code)[lineOf(u.lx.bare, u.index)] !== true) findings.push(`${where} unregisters outside the #else of #if DEBUG, so a DEBUG build, which is every Simulator run, would speak to Apple`);
  }
  const calls = [];
  for (const f of files) {
    const lx = lexSwift(f.source);
    for (const m of lx.bare.matchAll(/\bforgetAddress\s*\(/g)) {
      if (/\bfunc\s+$/.test(lx.bare.slice(Math.max(0, m.index - 12), m.index))) continue;
      calls.push({ f, bare: lx.bare, index: m.index });
    }
  }
  said.forgets = calls.length;
  if (calls.length !== 1) findings.push(`the app calls forgetAddress() ${String(calls.length)} time(s); it is called once, in AppModel.unpair's .forgotten arm`);
  for (const c of calls) {
    const where = `${c.f.name}:${String(lineOf(c.bare, c.index))}`;
    const fn = innermost(funcSpans(c.bare).filter((x) => x.bodyOpen !== -1), c.index);
    const type = innermost(typeSpans(c.bare), c.index);
    if (c.f.name !== 'App/TortieApp.swift' || type?.name !== 'AppModel' || fn?.name !== 'unpair') {
      findings.push(`${where} calls forgetAddress() in ${type?.name ?? 'no type'}.${fn?.name ?? 'no function'}; only AppModel.unpair unregisters, once the record went`);
      continue;
    }
    const before = c.bare.slice(fn.bodyOpen, c.index);
    const door = /\bdoor\s*\.\s*unpair\s*\(\s*\)/.exec(before);
    if (door === null) findings.push(`${where} calls forgetAddress() before door.unpair() has answered, so an Unpair that kept the record would still unregister`);
    const arms = [...before.matchAll(/\bcase\s+\.\s*(\w+)\b|\bdefault\s*:/g)];
    const last = arms.at(-1);
    const compared = last === undefined && /==\s*\.\s*forgotten\b/.test(before);
    if (!compared && (last === undefined || last[1] !== 'forgotten')) findings.push(`${where} calls forgetAddress() outside the .forgotten arm of door.unpair()'s answer, so it runs whether or not the record went`);
  }
  for (const t of tests) {
    const { bare } = lexSwift(t.source);
    for (const m of bare.matchAll(/\bunregisterForRemoteNotifications\b/g)) {
      findings.push(`${t.name}:${String(lineOf(bare, m.index))} names unregisterForRemoteNotifications; a test runs in a Simulator, and in the Release test host it would speak to Apple`);
    }
  }
  return { findings, said };
}

// ---- (y) THE RENDERER'S BOUNDS (SPEC §5.5, §6.2) ----------------------------

/** The renderer's files, relative to the app folder (SPEC §5.5.1). */
export const RENDERER_FILES = Object.freeze(['Markdown/Caps.swift', 'Markdown/Blocks.swift', 'Markdown/Inline.swift', 'Markdown/Rendered.swift', 'Markdown/Links.swift', 'Screens/MarkdownView.swift']);
/** Whether a file, relative to the app folder, is the renderer's. */
export const isRenderer = (name) => name.startsWith('Markdown/') || name === 'Screens/MarkdownView.swift';
/** The thirteen caps, each its pinned value and the one file that reads it (SPEC §5.5.3; `pieces` since the ruled round). */
export const MARKDOWN_CAPS = Object.freeze({
  answerBytes: { value: 32_768, readIn: 'Markdown/Blocks.swift' },
  blocks: { value: 400, readIn: 'Markdown/Blocks.swift' },
  depth: { value: 8, readIn: 'Markdown/Blocks.swift' },
  inlineBytes: { value: 8_192, readIn: 'Markdown/Inline.swift' },
  tableRows: { value: 50, readIn: 'Markdown/Blocks.swift' },
  tableColumns: { value: 64, readIn: 'Markdown/Blocks.swift' },
  cellCharacters: { value: 4_096, readIn: 'Markdown/Blocks.swift' },
  cells: { value: 1_000, readIn: 'Markdown/Blocks.swift' },
  fenceLines: { value: 4_096, readIn: 'Markdown/Blocks.swift' },
  lineCharacters: { value: 4_096, readIn: 'Markdown/Blocks.swift' },
  listNumberDigits: { value: 9, readIn: 'Markdown/Blocks.swift' },
  linkBytes: { value: 2_048, readIn: 'Markdown/Links.swift' },
  // The ruled round of 2026-10-01: an answer past it is drawn as written (y13).
  // MARKDOWN OFF, his ruling of 2026-10-02 ("Ship tabs + Settings, markdown
  // off"): 0, so every answer is past it and drawn as written, exactly as
  // 28d89295 drew it. A later phase that draws the conversation lazily moves
  // this pin when it switches markdown back on.
  pieces: { value: 0, readIn: 'Markdown/Rendered.swift', why: "markdown is off by his ruling of 2026-10-02 ('Ship tabs + Settings, markdown off'): every answer is drawn as written until a later phase that draws the conversation lazily moves this pin" }
});
/** The modules each renderer file may import (y1). MarkdownView.swift draws, and is held by y8 instead. */
const RENDERER_IMPORTS = { 'Markdown/Links.swift': ['Foundation', 'SwiftUI', 'UIKit'] };
/** What the renderer may never name (y9): the boundary rule (k)'s scope rests on. */
const RENDERER_BOUNDARY = /\b\w*(?:Pocket|Door)\w*|\bCodable\b|\bDecodable\b|\bJSONDecoder\b|\bURLSession\w*|\bNWConnection\b/g;

/** Every name in one source the renderer may never name (y9), with its line. */
export function rendererBoundary(source) {
  const { bare } = lexSwift(source);
  return [...bare.matchAll(RENDERER_BOUNDARY)].map((m) => ({ name: m[0], line: lineOf(bare, m.index) }));
}

const RENDERER_TRAPS = [
  [/\b(?:re)?throws\b/g, 'a throwing declaration'],
  [/\b(?:fatalError|precondition|preconditionFailure|assert|assertionFailure)\s*\(/g, 'a call that traps'],
  [/\w*Unsafe\w*|\bunsafe\w*/g, 'an unsafe name']
];
const RENDERER_REGEX = [/\bNSRegularExpression\b/g, /\bRegex\w*/g, /#\//g, /\.\s*regularExpression\b/g, /\bwholeMatch\s*\(/g, /\bfirstMatch\s*\(\s*of\b/g, /\bmatches\s*\(\s*of\b/g, /\bNSPredicate\b/g];
const LOCALIZED = [/\bLocalizedStringKey\b/g, /\bLocalizedStringResource\b/g, /\bText\s*\(\s*\.\s*init\s*\(/g, /\bString\s*\(\s*format\s*:/g, /\bString\s*\(\s*localized\s*:/g, /\bNSLocalizedString\b/g];
/** The one parse's options, exactly (SPEC §5.5.4). */
export const INLINE_OPTIONS = Object.freeze({ allowsExtendedAttributes: 'false', interpretedSyntax: '.inlineOnlyPreservingWhitespace', failurePolicy: '.returnPartiallyParsedIfPossible' });

/** The names a file binds to an `AttributedString` (y8): a typed let, var or parameter, a constructed value, or the `.text` segment's payload. */
function attributedNames(bare) {
  const out = new Set(['attributed']);
  for (const re of [
    /\b(?:let|var)\s+(\w+)\s*:\s*AttributedString\b/g,
    /[(,]\s*(?:\w+\s+)?(\w+)\s*:\s*AttributedString\b/g,
    /\b(?:let|var)\s+(\w+)\s*=\s*AttributedString\s*\(/g,
    /\.\s*text\s*\(\s*let\s+(\w+)\s*\)/g,
    /\bcase\s+let\s+\.\s*text\s*\(\s*(\w+)\s*\)/g
  ]) {
    for (const m of bare.matchAll(re)) out.add(m[1]);
  }
  return out;
}

/**
 * Rule (y), over the app's Swift named relative to the app folder (SPEC
 * §6.2). y1 Foundation alone in the parser's files (Links.swift: Foundation,
 * SwiftUI, UIKit); y2 one `enum MarkdownCaps`, in Caps.swift, of exactly the
 * thirteen pinned integer literals, each read exactly once, in the file the SPEC
 * names; y3 nothing in the renderer that throws, traps or force-unwraps, and
 * no unsafe name; y4 no regular expression; y5 every function in a call
 * cycle, and every view type that builds itself, takes `depth` and passes
 * `depth: depth + 1`, and Blocks.swift compares depth with MarkdownCaps.depth;
 * y6 `AttributedString(markdown:` exactly once in the app, in Inline.swift,
 * with exactly the three pinned options, and no `.full` or bare `.inlineOnly`;
 * y7 nothing localizes a string anywhere in the app, so `%@` draws as written;
 * y8 every `Text(` in MarkdownView.swift is verbatim, a symbol or an
 * AttributedString Inline.swift built; y9 the renderer names no door type;
 * y10 to y12 the agent's own numbers and y13 to y16 the page cost (the ruled
 * round of 2026-10-01, said in the file's header).
 */
export function ruleRenderer(files) {
  const findings = [];
  const said = { files: 0, caps: 0, reads: 0, cycles: 0, viewCycles: 0, parses: 0, texts: 0 };
  const lexedFiles = files.map((f) => ({ ...f, lx: lexSwift(f.source) }));
  const byName = new Map(lexedFiles.map((f) => [f.name, f]));
  const renderer = lexedFiles.filter((f) => isRenderer(f.name));
  said.files = renderer.length;
  const at = (f, i) => `${f.name}:${String(lineOf(f.lx.bare, i))}`;
  for (const want of RENDERER_FILES) if (!byName.has(want)) findings.push(`${want} does not exist, so the renderer this rule bounds is not all there (SPEC §5.5.1)`);

  // y1: Foundation alone.
  for (const f of renderer) {
    if (f.name === 'Screens/MarkdownView.swift') continue;
    const allowed = RENDERER_IMPORTS[f.name] ?? ['Foundation'];
    for (const m of f.lx.bare.matchAll(/(?:^|\n)[ \t]*(?:@\w+[ \t]+)*import[ \t]+(?:(?:struct|class|enum|protocol|typealias|func|let|var|actor)[ \t]+)?`?([A-Za-z_]\w*)/g)) {
      if (!allowed.includes(m[1])) findings.push(`${at(f, m.index + m[0].indexOf('import'))} imports ${m[1]}; ${f.name} imports ${allowed.join(', ')} and nothing else (y1)`);
    }
  }

  // y2: the caps, declared once, each read once.
  const declared = lexedFiles.flatMap((f) => [...f.lx.bare.matchAll(/\benum\s+MarkdownCaps\b/g)].map((m) => ({ f, index: m.index })));
  if (declared.length !== 1 || declared[0].f.name !== 'Markdown/Caps.swift') {
    findings.push(`enum MarkdownCaps is declared ${String(declared.length)} time(s)${declared.length > 0 ? ` (${declared.map((d) => at(d.f, d.index)).join(', ')})` : ''}; it is declared once, in Markdown/Caps.swift (y2)`);
  }
  const caps = byName.get('Markdown/Caps.swift');
  const span = caps === undefined ? undefined : typeSpans(caps.lx.bare).find((t) => t.kind === 'enum' && t.name === 'MarkdownCaps');
  if (span !== undefined) {
    const body = caps.lx.bare.slice(span.open + 1, span.close);
    const lets = [...body.matchAll(/\bstatic\s+let\s+(\w+)\s*(?::\s*Int\s*)?=\s*([0-9][0-9_]*)\s*(?=\n|;|$)/g)];
    const decls = [...body.matchAll(/\b(?:static\s+)?(?:let|var|func|case|init|subscript|struct|enum|class|typealias)\b/g)];
    if (decls.length !== lets.length) findings.push(`MarkdownCaps declares ${String(decls.length - lets.length)} thing(s) beside its static let integer literals; it holds the thirteen caps and nothing else (y2)`);
    const got = new Map(lets.map((m) => [m[1], Number(m[2].replace(/_/g, ''))]));
    said.caps = got.size;
    for (const [name, cap] of Object.entries(MARKDOWN_CAPS)) {
      if (!got.has(name)) findings.push(`MarkdownCaps has no static let ${name}; it is ${String(cap.value)} (SPEC §5.5.3, y2)`);
      else if (got.get(name) !== cap.value) findings.push(`MarkdownCaps.${name} is ${String(got.get(name))}; the pinned cap is ${String(cap.value)}${cap.why === undefined ? '' : `, because ${cap.why}`} (y2)`);
    }
    for (const name of got.keys()) if (!Object.hasOwn(MARKDOWN_CAPS, name)) findings.push(`MarkdownCaps.${name} is not one of the thirteen pinned caps (y2)`);
  }
  const reads = new Map();
  for (const f of lexedFiles) {
    if (f.name === 'Markdown/Caps.swift') continue;
    for (const m of f.lx.bare.matchAll(/\bMarkdownCaps\b(\s*\.\s*(\w+))?/g)) {
      if (m[2] === undefined || m[2] === 'self' || m[2] === 'Type') {
        findings.push(`${at(f, m.index)} takes MarkdownCaps as a value or a type; a cap is read by its name, at its one site (y2)`);
        continue;
      }
      said.reads += 1;
      if (!reads.has(m[2])) reads.set(m[2], []);
      reads.get(m[2]).push({ f, index: m.index });
    }
  }
  for (const [name, cap] of Object.entries(MARKDOWN_CAPS)) {
    const r = reads.get(name) ?? [];
    if (r.length !== 1) findings.push(`MarkdownCaps.${name} is read ${String(r.length)} time(s)${r.length > 0 ? ` (${r.map((x) => at(x.f, x.index)).join(', ')})` : ''}; each cap is read at exactly one site, in ${cap.readIn} (y2)`);
    else if (r[0].f.name !== cap.readIn) findings.push(`${at(r[0].f, r[0].index)} reads MarkdownCaps.${name}; it is read in ${cap.readIn} (y2)`);
  }
  for (const name of reads.keys()) if (!Object.hasOwn(MARKDOWN_CAPS, name)) findings.push(`MarkdownCaps.${name} is read, and it is not one of the thirteen pinned caps (y2)`);

  // y3, y4: nothing that throws, traps, force-unwraps or matches a pattern.
  for (const f of renderer) {
    const bare = f.lx.bare;
    for (const [re, what] of RENDERER_TRAPS) for (const m of bare.matchAll(re)) findings.push(`${at(f, m.index)} writes ${m[0].replace(/\s+/g, '')}, ${what}; the renderer never throws, traps or reaches for unsafe memory (y3)`);
    for (const m of bare.matchAll(/([\w)\]])!(?!=)/g)) {
      const word = /\b(try|as)$/.exec(bare.slice(Math.max(0, m.index - 2), m.index + 1))?.[1];
      findings.push(`${at(f, m.index)} writes ${word === undefined ? 'a postfix !, a force unwrap' : `${word}!`}; the renderer never force-unwraps, so no byte an agent wrote can end the app (y3)`);
    }
    for (const re of RENDERER_REGEX) for (const m of bare.matchAll(re)) findings.push(`${at(f, m.index)} writes ${m[0].replace(/\s+/g, '')}, a regular expression; the block parser reads lines character by character, so no pattern can run away (y4)`);
  }

  // y5: every recursion takes a depth and passes one more.
  for (const f of renderer) {
    const bare = f.lx.bare;
    const types = typeSpans(bare);
    const typeNames = new Set(types.map((t) => t.name));
    const funcs = funcSpans(bare).filter((fn) => fn.bodyOpen !== -1);
    const names = new Set(funcs.map((fn) => fn.name));
    const calls = [];
    for (const fn of funcs) {
      const body = bare.slice(fn.bodyOpen, fn.bodyClose);
      for (const m of body.matchAll(/(?<![\w$])((?:self|Self|[A-Z]\w*)\s*\.\s*)?([a-z_]\w*)\s*\(/g)) {
        if (!names.has(m[2])) continue;
        if (/\bfunc\s+$/.test(body.slice(Math.max(0, m.index - 12), m.index))) continue;
        if (m[1] === undefined && /[.?]\s*$/.test(body.slice(Math.max(0, m.index - 2), m.index))) continue;
        if (m[1] !== undefined && !/^(?:self|Self)$/.test(m[1].replace(/[\s.]/g, '')) && !typeNames.has(m[1].replace(/[\s.]/g, ''))) continue;
        const open = fn.bodyOpen + m.index + m[0].length - 1;
        const close = closeParen(bare, open);
        calls.push({ from: fn.name, to: m[2], at: open, args: close === -1 ? '' : bare.slice(open + 1, close) });
      }
    }
    const edges = new Map();
    for (const c of calls) {
      if (!edges.has(c.from)) edges.set(c.from, new Set());
      edges.get(c.from).add(c.to);
    }
    const cycles = cyclesOf([...names], edges);
    said.cycles += cycles.length;
    for (const cycle of cycles) {
      for (const fn of funcs.filter((x) => cycle.has(x.name))) {
        if (!/(?:^|,)\s*depth\s*:/.test(fn.params)) findings.push(`${at(f, fn.at)} ${fn.name} calls itself, directly or through ${[...cycle].join(', ')}, and takes no depth:; every recursion takes depth and passes depth + 1 (y5)`);
      }
      for (const c of calls.filter((x) => cycle.has(x.from) && cycle.has(x.to))) {
        if (!/\bdepth\s*:\s*depth\s*\+\s*1\b/.test(c.args)) findings.push(`${at(f, c.at)} ${c.from} calls ${c.to} again without depth: depth + 1, so the recursion is not bounded by MarkdownCaps.depth (y5)`);
      }
    }
    if (f.name === 'Markdown/Blocks.swift' && cycles.length > 0) {
      if (!/\bdepth\s*(?:<|<=|>|>=|==|!=)\s*MarkdownCaps\s*\.\s*depth\b|\bMarkdownCaps\s*\.\s*depth\s*(?:<|<=|>|>=|==|!=)\s*depth\b/.test(bare)) {
        findings.push(`${f.name} recurses (${cycles.map((c) => [...c].join(', ')).join('; ')}) and never compares depth with MarkdownCaps.depth, so a container nested past the cap still opens (y5)`);
      }
    }
    if (f.name === 'Screens/MarkdownView.swift') {
      const views = types.filter((t) => t.kind === 'struct');
      const viewNames = new Set(views.map((t) => t.name));
      const builds = [];
      for (const t of views) {
        const body = bare.slice(t.open, t.close);
        for (const m of body.matchAll(/(?<![\w$.])([A-Z]\w*)\s*\(/g)) {
          if (!viewNames.has(m[1])) continue;
          const open = t.open + m.index + m[0].length - 1;
          const close = closeParen(bare, open);
          builds.push({ from: t.name, to: m[1], at: open, args: close === -1 ? '' : bare.slice(open + 1, close) });
        }
      }
      const vEdges = new Map();
      for (const b of builds) {
        if (!vEdges.has(b.from)) vEdges.set(b.from, new Set());
        vEdges.get(b.from).add(b.to);
      }
      const vCycles = cyclesOf([...viewNames], vEdges);
      said.viewCycles += vCycles.length;
      for (const cycle of vCycles) {
        for (const t of views.filter((x) => cycle.has(x.name))) {
          if (!/\b(?:let|var)\s+depth\s*:\s*Int\b/.test(bare.slice(t.open, t.close))) findings.push(`${at(f, t.at)} ${t.name} builds itself, directly or through ${[...cycle].join(', ')}, and holds no depth: Int (y5)`);
        }
        for (const b of builds.filter((x) => cycle.has(x.from) && cycle.has(x.to))) {
          if (!/\bdepth\s*:\s*depth\s*\+\s*1\b/.test(b.args)) findings.push(`${at(f, b.at)} ${b.from} builds ${b.to} again without depth: depth + 1 (y5)`);
        }
      }
    }
  }

  // y6: the one inline parse, with exactly its three options.
  const parses = lexedFiles.flatMap((f) => [...f.lx.bare.matchAll(/\bAttributedString\s*(?:\.\s*init\s*)?\(\s*markdown\s*:/g)].map((m) => ({ f, index: m.index })));
  said.parses = parses.length;
  if (parses.length !== 1 || parses[0].f.name !== 'Markdown/Inline.swift') {
    findings.push(`the app parses markdown with AttributedString(markdown: ${String(parses.length)} time(s)${parses.length > 0 ? ` (${parses.map((p) => at(p.f, p.index)).join(', ')})` : ''}; it is the app's ONE parse, in Markdown/Inline.swift (y6)`);
  }
  for (const f of lexedFiles) {
    const bare = f.lx.bare;
    for (const m of bare.matchAll(/\bNSAttributedString\s*(?:\.\s*init\s*)?\(\s*markdown\b/g)) findings.push(`${at(f, m.index)} parses markdown with NSAttributedString; the one parse is Inline.swift's (y6)`);
    for (const m of bare.matchAll(/\.\s*(?:allowsExtendedAttributes|interpretedSyntax|failurePolicy|languageCode|appliesSourcePositionAttributes)\s*=(?!=)/g)) findings.push(`${at(f, m.index)} changes a markdown parsing option after it is made; the options are the three pinned, once (y6)`);
    for (const m of bare.matchAll(/\.\s*inlineOnly\b/g)) findings.push(`${at(f, m.index)} names .inlineOnly, which drops the agent's spaces and line breaks; the syntax is .inlineOnlyPreservingWhitespace (y6)`);
    if (/\bMarkdownParsingOptions\b|\binterpretedSyntax\b|\bmarkdown\s*:/.test(bare)) {
      for (const m of bare.matchAll(/\.\s*full\b/g)) findings.push(`${at(f, m.index)} names .full in a file that parses markdown; SwiftUI draws none of .full's intents and nothing caps its parse (y6)`);
    }
    const builders = [...bare.matchAll(/\b(?:MarkdownParsingOptions|init)\s*\(/g)].filter((m) => {
      const open = m.index + m[0].length - 1;
      const close = closeParen(bare, open);
      return /\binterpretedSyntax\s*:/.test(bare.slice(open, close === -1 ? bare.length : close)) || m[0].startsWith('MarkdownParsingOptions');
    });
    if (f.name !== 'Markdown/Inline.swift') {
      for (const b of builders) findings.push(`${at(f, b.index)} makes markdown parsing options; they are made once, in Markdown/Inline.swift (y6)`);
      continue;
    }
    if (builders.length !== 1) findings.push(`${f.name} makes markdown parsing options ${String(builders.length)} time(s); it makes them once, with exactly ${Object.keys(INLINE_OPTIONS).join(', ')} (y6)`);
    for (const b of builders) {
      const open = b.index + b[0].length - 1;
      const close = closeParen(bare, open);
      const args = topLevelArgs(bare.slice(open + 1, close === -1 ? bare.length : close)).map((a) => /^(\w+)\s*:\s*([\s\S]*)$/.exec(a)).filter((m) => m !== null);
      const got = Object.fromEntries(args.map((m) => [m[1], m[2].replace(/\s+/g, '')]));
      if (JSON.stringify(Object.keys(got).sort()) !== JSON.stringify(Object.keys(INLINE_OPTIONS).sort())) findings.push(`${at(f, b.index)} makes options with ${JSON.stringify(Object.keys(got))}; exactly ${Object.keys(INLINE_OPTIONS).join(', ')} (y6)`);
      for (const [label, value] of Object.entries(INLINE_OPTIONS)) {
        if (got[label] !== undefined && got[label] !== value) findings.push(`${at(f, b.index)} sets ${label}: ${got[label]}; it is ${value} (y6)`);
      }
    }
  }

  // y7: nothing localizes a string anywhere in the app.
  for (const f of lexedFiles) {
    for (const re of LOCALIZED) for (const m of f.lx.bare.matchAll(re)) findings.push(`${at(f, m.index)} writes ${m[0].replace(/\s+/g, '')}; nothing in the app localizes or formats a string, so an agent's %@ draws as written (y7)`);
  }

  // y8: every Text in MarkdownView.swift is verbatim, a symbol or an AttributedString.
  const view = byName.get('Screens/MarkdownView.swift');
  if (view !== undefined) {
    const bare = view.lx.bare;
    const attributed = attributedNames(bare);
    for (const m of bare.matchAll(/(?<![\w$.])Text\s*\(/g)) {
      said.texts += 1;
      const open = m.index + m[0].length - 1;
      const close = closeParen(bare, open);
      const inside = bare.slice(open + 1, close === -1 ? bare.length : close).trim();
      if (/^verbatim\s*:/.test(inside) || /^Image\s*\(\s*systemName\s*:/.test(inside)) continue;
      const last = /^(?:[A-Za-z_]\w*\s*\.\s*)*([A-Za-z_]\w*)$/.exec(inside)?.[1];
      if (last !== undefined && attributed.has(last)) continue;
      findings.push(`${at(view, m.index)} draws Text(${inside.slice(0, 40)}); every Text in MarkdownView.swift is Text(verbatim:, Text(Image(systemName: or Text of an AttributedString Inline.swift built (y8)`);
    }
  }

  // y10 to y16: the ruled round of 2026-10-01 (build/p3166/SPEC.md "As built,
  // the ruled round"). y10 to y12, THE AGENT'S OWN NUMBERS (difference D17):
  // an ordered item draws the digits the agent wrote, never a counted number.
  // y13 to y16, THE PAGE COST: an answer whose parse holds more pieces than
  // MarkdownCaps.pieces is drawn as the build before this one drew it.
  const rendered = byName.get('Markdown/Rendered.swift');
  const blocksFile = byName.get('Markdown/Blocks.swift');
  const inline = byName.get('Markdown/Inline.swift');
  const drawing = byName.get('Screens/MarkdownView.swift');
  const spanBody = (f, kind, name) => {
    const t = typeSpans(f.lx.bare).find((x) => x.kind === kind && x.name === name);
    return t === undefined ? null : { text: f.lx.bare.slice(t.open + 1, t.close), at: t.at };
  };
  const funcBody = (f, name) => {
    const fn = funcSpans(f.lx.bare).find((x) => x.name === name && x.bodyOpen !== -1);
    return fn === undefined ? null : { text: f.lx.bare.slice(fn.bodyOpen + 1, fn.bodyClose), at: fn.at };
  };
  const callArgs = (f, callee) => [...f.lx.bare.matchAll(new RegExp(`(?<![\\w$.])${callee}\\s*\\(`, 'g'))].map((m) => {
    const open = m.index + m[0].length - 1;
    const close = closeParen(f.lx.bare, open);
    const args = topLevelArgs(f.lx.bare.slice(open + 1, close === -1 ? f.lx.bare.length : close));
    return { index: m.index, args: Object.fromEntries(args.map((a) => /^(\w+)\s*:\s*([\s\S]*)$/.exec(a)).filter((x) => x !== null).map((x) => [x[1], x[2].replace(/\s+/g, ' ').trim()])) };
  });
  if (rendered !== undefined) {
    // y10: the item's number is the one the parse kept, a String, never counted.
    const item = spanBody(rendered, 'struct', 'RenderedItem');
    if (item === null) findings.push('Markdown/Rendered.swift declares no struct RenderedItem, so nothing holds an item\'s number (y10)');
    else if (!/\blet\s+number\s*:\s*String\s*\?/.test(item.text)) findings.push(`${at(rendered, item.at)} RenderedItem's number is not a String?: an ordered item draws the digits the agent wrote, never a counted Int (D17, y10)`);
    const made = callArgs(rendered, 'RenderedItem');
    if (made.length === 0) findings.push('Markdown/Rendered.swift makes no RenderedItem, so no item reaches the screen with its number (y10)');
    for (const c of made) {
      if (c.args.number !== 'item.number') findings.push(`${at(rendered, c.index)} makes a RenderedItem with number: ${c.args.number ?? '(none)'}; it is item.number, the digits the agent wrote, never a counted one (D17, y10)`);
    }
    // y13: past MarkdownCaps.pieces, the answer as written and no blocks.
    const bare = rendered.lx.bare;
    if (!/\bif\s+(?:Self\s*\.\s*)?pieces\s*\([^()]*\)\s*>\s*MarkdownCaps\s*\.\s*pieces\s*\{/.test(bare)) findings.push('Markdown/Rendered.swift never asks `if pieces(…) > MarkdownCaps.pieces {` and nothing more, so a page of answers past the cap is drawn as blocks again (y13)');
    const asWritten = [...bare.matchAll(/\bInline\s*\.\s*asWritten\s*\(/g)];
    if (asWritten.length !== 1) findings.push(`Markdown/Rendered.swift calls Inline.asWritten ${String(asWritten.length)} time(s); it is the one path an answer past MarkdownCaps.pieces takes (y13)`);
    for (const c of callArgs(rendered, 'self\\s*\\.\\s*init')) {
      const writes = /\bInline\s*\.\s*asWritten\s*\(/.test(c.args.written ?? '');
      if (writes && c.args.blocks !== '[]') findings.push(`${at(rendered, c.index)} draws an answer as written AND as blocks (${c.args.blocks ?? '(none)'}); past MarkdownCaps.pieces there are no blocks at all (y13)`);
      if (!writes && c.args.written !== 'nil') findings.push(`${at(rendered, c.index)} makes an answer of blocks with written: ${c.args.written ?? '(none)'}; it is nil (y13)`);
    }
    // y14: a piece is a block, a list item or a table cell.
    const pieces = funcBody(rendered, 'pieces');
    if (pieces === null) findings.push('Markdown/Rendered.swift has no func pieces, so nothing counts what an answer would draw (y14)');
    else {
      const counts = [[/\bfor\s+\w+\s+in\s+items\s*\{\s*count\s*\+=\s*containerPieces\s*\+/, 'every list item as the container it is'], [/\bcase\s+\.quote\b[^:]*:\s*count\s*\+=\s*containerPieces\s*-\s*1\b/, 'a quote as the container it is'], [/\.\s*header\s*\.\s*count\b/, 'the header\'s cells'], [/\.\s*rows\b/, 'the body rows\' cells'], [/\bcount\s*\+=\s*1\b/, 'every block'], [/\bcase\s+\.code\b[^:]*:\s*count\s*\+=\s*scrollPieces\s*-\s*1\b/, 'a code block as the scroll it is'], [/\bcase\s+\.table\b[^:]*:\s*count\s*\+=\s*scrollPieces\s*-\s*1\b/, 'a table as the scroll it is']];
      for (const [re, what] of counts) if (!re.test(pieces.text)) findings.push(`${at(rendered, pieces.at)} pieces does not count ${what}; a piece is a block, a list item or a table cell, each one view (y14)`);
    }
  }
  if (blocksFile !== undefined) {
    // y11: the marker keeps the digits as written, and the item carries them.
    const bare = blocksFile.lx.bare;
    if (!/\bnumber\s*=\s*String\s*\(\s*decoding\s*:\s*bytes\s*\[/.test(bare)) findings.push('Markdown/Blocks.swift never keeps a list marker\'s digits from its own bytes, so 007 or a leading digit the agent wrote can be lost (D17, y11)');
    const items = callArgs(blocksFile, 'MarkdownItem');
    if (items.length === 0) findings.push('Markdown/Blocks.swift makes no MarkdownItem (y11)');
    for (const c of items) if (!/^\w+\.number$/.test(c.args.number ?? '')) findings.push(`${at(blocksFile, c.index)} makes a MarkdownItem with number: ${c.args.number ?? '(none)'}; it is its marker's written number (D17, y11)`);
  }
  if (drawing !== undefined) {
    // y12: the mark drawn is the item's own number.
    const bare = drawing.lx.bare;
    const marks = [...bare.matchAll(/\bCopy\s*\.\s*orderedMark\s*\(\s*([^()]*?)\s*\)/g)];
    if (marks.length === 0) findings.push('Screens/MarkdownView.swift draws no Copy.orderedMark, so no ordered item shows its number (y12)');
    for (const m of marks) {
      const bound = new RegExp(`\\bif\\s+let\\s+${m[1].replace(/[^\w]/g, '')}\\s*=\\s*item\\s*\\.\\s*number\\b`).test(bare);
      if (m[1] !== 'item.number' && !bound) findings.push(`${at(drawing, m.index)} draws Copy.orderedMark(${m[1]}); the mark is item.number, the digits the agent wrote (D17, y12)`);
    }
    // y16: an answer as written is drawn EXACTLY as the build before this one drew it.
    if (!/\bif\s+let\s+\w+\s*=\s*answer\s*\.\s*written\b/.test(bare)) findings.push('Screens/MarkdownView.swift never draws answer.written, so an answer past MarkdownCaps.pieces draws nothing (y16)');
    const parentFace = 'Text(attributed).font(Face.body.font).foregroundStyle(Tokens.textPrimary).lineSpacing(Face.body.spacing).fixedSize(horizontal:false,vertical:true).frame(maxWidth:.infinity,alignment:.leading)';
    const writtenView = spanBody(drawing, 'struct', 'WrittenView');
    if (writtenView === null) findings.push('Screens/MarkdownView.swift declares no WrittenView, the one way an answer as written is drawn (y16)');
    else {
      const body = /\bvar\s+body\s*:\s*some\s+View\s*\{([\s\S]*)\}\s*$/.exec(writtenView.text)?.[1]?.replace(/\s+/g, '') ?? '';
      if (body !== parentFace) findings.push(`${at(drawing, writtenView.at)} WrittenView draws ${body.slice(0, 90) || '(nothing)'}; it is the parent's AnswerText exactly: ${parentFace} (y16)`);
    }
  }
  if (inline !== undefined) {
    // y15: as written, every link and image address removed, through the one parse.
    const fn = funcBody(inline, 'asWritten');
    if (fn === null) findings.push('Markdown/Inline.swift has no func asWritten, so an answer past MarkdownCaps.pieces has no way to be drawn (y15)');
    else {
      const aliases = (attr) => [attr, ...[...inline.lx.bare.matchAll(new RegExp(`typealias\\s+(\\w+)\\s*=\\s*[\\w.]*\\b${attr}\\b`, 'g'))].map((m) => m[1])];
      const removes = (attr) => aliases(attr).some((name) => new RegExp(`\\[\\s*(?:[\\w.]*\\.)?${name}\\s*\\.\\s*self\\s*\\]\\s*=\\s*nil\\b`).test(fn.text));
      if (!removes('LinkAttribute')) findings.push(`${at(inline, fn.at)} asWritten keeps a link: the answer as written is the parent's, every link removed, so nothing in it can be pressed (y15)`);
      if (!removes('ImageURLAttribute')) findings.push(`${at(inline, fn.at)} asWritten keeps an image address: every image address is removed, so nothing can ever fetch it (y15)`);
      if (/\bAttributedString\s*\(\s*markdown\s*:/.test(fn.text) || !/\bparsed\s*\(/.test(fn.text)) findings.push(`${at(inline, fn.at)} asWritten does not go through the one parse with its three options (y15)`);
    }
  }

  // y9: the boundary (k)'s scope rests on.
  for (const f of renderer) {
    for (const b of rendererBoundary(f.source)) findings.push(`${f.name}:${String(b.line)} names ${b.name}; the renderer's only input is a String, and it names no door type, decoder or connection (y9)`);
  }
  return { findings, said };
}

// ---- (z) NOTHING FETCHED, AND ONE WAY OUT (SPEC §5.5.5, §6.3) --------------

/** The one file that may open an address an answer wrote, relative to the app folder. */
export const LINKS_FILE = 'Markdown/Links.swift';
/** The one other file that may hand iOS an address: iOS's own notification settings. */
export const SETTINGS_FILE = 'Screens/SettingsScreen.swift';
const FETCHERS = [
  [/\bAsyncImage\b/g, 'loads an image from an address'],
  [/\bNSAttributedString\b/g, 'is the attributed string that imports HTML'],
  [/\bDocumentType\b|\bdocumentType\b/g, 'names a document type, which is how HTML is imported']
];
const WAYS_OUT = /\bSFSafariViewController\b|\bSafariServices\b|\bASWebAuthenticationSession\b|\bAuthenticationServices\b|\bQLPreviewController\b|\bQuickLook\w*|\bUIDocumentInteractionController\b|\bcanOpenURL\b|(?<![\w$.])Link\s*\(/g;
const OPENS = /\bUIApplication\s*\.\s*shared\s*\.\s*open\s*\(/g;
const CONTROL_HEAD = /\b(?:if|guard|else|for|while|switch|do|repeat|catch|defer)\b[^{};]*$/;

/** Where the closure or function holding `index` begins: the nearest `{` outward that is not an if, guard, loop or switch block. */
function closureStart(bare, index) {
  let k = innermostOpener(bare, index);
  while (k !== -1) {
    if (bare[k] === '{') {
      let h = k - 1;
      while (h >= 0 && !';{}\n'.includes(bare[h])) h -= 1;
      const head = bare.slice(h + 1, k);
      if (!CONTROL_HEAD.test(head)) return k;
    }
    k = innermostOpener(bare, k);
  }
  return 0;
}

/**
 * Rule (z), over the app's Swift named relative to the app folder (SPEC
 * §6.3). z1 nothing is fetched: no `AsyncImage`, `NSAttributedString`,
 * document type, or `contentsOf:` initialiser outside a DEBUG arm; z2 no
 * in-app browser, sign-in sheet, preview, document hand-off, `canOpenURL` or
 * SwiftUI `Link(`; z3 `OpenURLAction` and `openURL` only in Links.swift, and
 * `UIApplication.shared.open(` only there and in SettingsScreen.swift; z4 the
 * one `OpenURLAction` asks `LinkPolicy.opens(` before it stages, and the
 * closure that opens asks it again before the one open; z5 Settings opens
 * only iOS's own notification settings; z6 `LinkPolicy.opens` names "https",
 * `.user`, `.password`, `.port`, "xn--" and `MarkdownCaps.linkBytes`.
 */
export function ruleOneWayOut(files) {
  const findings = [];
  const said = { actions: 0, opens: 0, settingsOpens: 0 };
  const lexedFiles = files.map((f) => ({ ...f, lx: lexSwift(f.source) }));
  const at = (f, i) => `${f.name}:${String(lineOf(f.lx.bare, i))}`;
  for (const f of lexedFiles) {
    const bare = f.lx.bare;
    const debug = debugLines(f.lx.code);
    for (const [re, why] of FETCHERS) for (const m of bare.matchAll(re)) findings.push(`${at(f, m.index)} names ${m[0]}, which ${why}; nothing an answer names is fetched (z1)`);
    for (const m of bare.matchAll(/(?:\b[A-Z]\w*(?:\s*\.\s*[A-Z]\w*)*\s*(?:\.\s*init\s*)?|\.\s*init\s*)\(\s*contentsOf\s*:/g)) {
      if (debug[lineOf(bare, m.index)] === true) continue;
      findings.push(`${at(f, m.index)} builds a value with contentsOf:, which can load an address; outside a DEBUG arm nothing is (z1)`);
    }
    for (const m of bare.matchAll(WAYS_OUT)) findings.push(`${at(f, m.index)} names ${m[0].replace(/\s+/g, '')}; the one way out of the app is Links.swift's alert, and Safari or the app that owns the address opens it, never a view inside Tortie (z2)`);
    for (const m of bare.matchAll(/\bOpenURLAction\b|\bopenURL\b/g)) {
      if (f.name !== LINKS_FILE) findings.push(`${at(f, m.index)} names ${m[0]}; the one OpenURLAction, and the openURL it answers, are Links.swift's (z3)`);
    }
    for (const m of bare.matchAll(OPENS)) {
      if (f.name === LINKS_FILE) said.opens += 1;
      else if (f.name === SETTINGS_FILE) said.settingsOpens += 1;
      else findings.push(`${at(f, m.index)} calls UIApplication.shared.open(; only Links.swift, after his press, and Settings, with iOS's own notification settings, hand iOS an address (z3)`);
    }
  }
  const links = lexedFiles.find((f) => f.name === LINKS_FILE);
  if (links === undefined) findings.push(`${LINKS_FILE} does not exist, so no link has its one way out (z4)`);
  else {
    const bare = links.lx.bare;
    const actions = [...bare.matchAll(/\bOpenURLAction\s*(?:\(\s*(?:handler\s*:\s*)?)?\{/g)];
    said.actions = actions.length;
    if (actions.length !== 1) findings.push(`${LINKS_FILE} makes ${String(actions.length)} OpenURLAction(s); there is ONE (z3)`);
    for (const a of actions) {
      const open = a.index + a[0].length - 1;
      const close = matchForward(bare, open);
      const body = bare.slice(open, close === -1 ? bare.length : close);
      const ask = /\bLinkPolicy\s*\.\s*opens\s*\(/.exec(body);
      const stage = /(?<![=!<>])=(?!=)|\.\s*handled\b/.exec(body);
      if (ask === null) findings.push(`${at(links, a.index)} the OpenURLAction never asks LinkPolicy.opens(, so any address an answer wrote is staged (z4)`);
      else if (stage !== null && stage.index < ask.index) findings.push(`${at(links, a.index)} the OpenURLAction stages the address before it asks LinkPolicy.opens( (z4)`);
      if (!/\.\s*discarded\b/.test(body)) findings.push(`${at(links, a.index)} the OpenURLAction never answers .discarded, so a refused address is handed back to the system (z4)`);
    }
    for (const m of bare.matchAll(OPENS)) {
      const from = closureStart(bare, m.index);
      if (!/\bLinkPolicy\s*\.\s*opens\s*\(/.test(bare.slice(from, m.index))) findings.push(`${at(links, m.index)} opens an address without asking LinkPolicy.opens( again in the closure that opens it (z4)`);
    }
    if (said.opens === 0) findings.push(`${LINKS_FILE} never calls UIApplication.shared.open(, so Open opens nothing (z4)`);
    // z6
    const policy = typeSpans(bare).find((t) => t.name === 'LinkPolicy' && t.kind !== 'extension');
    const own = policy === undefined ? [] : funcSpans(bare).filter((fn) => fn.bodyOpen > policy.open && fn.bodyClose <= policy.close && fn.bodyOpen !== -1);
    const opens = own.find((fn) => fn.name === 'opens');
    if (opens === undefined) findings.push(`${LINKS_FILE} declares no LinkPolicy.opens with a body (z6)`);
    else {
      // The body opens runs: its own, and that of every LinkPolicy function
      // it names (a helper called, or handed as a predicate), followed
      // through, because a clause asked in a helper opens calls is asked.
      const reached = [opens];
      for (let k = 0; k < reached.length; k += 1) {
        const text = bare.slice(reached[k].bodyOpen, reached[k].bodyClose);
        for (const fn of own) if (!reached.includes(fn) && new RegExp(`(?<![\\w$.])${fn.name}\\b`).test(text)) reached.push(fn);
      }
      const body = reached.map((fn) => bare.slice(fn.bodyOpen, fn.bodyClose)).join('\n');
      const strings = links.lx.strings.filter((s) => reached.some((fn) => s.start > fn.bodyOpen && s.end <= fn.bodyClose)).map((s) => s.value);
      const wants = [
        ['"https"', strings.includes('https')],
        ['.user', /\.\s*user\b/.test(body)],
        ['.password', /\.\s*password\b/.test(body)],
        ['.port', /\.\s*port\b/.test(body)],
        ['"xn--"', strings.some((s) => s.includes('xn--'))],
        ['MarkdownCaps.linkBytes', /\bMarkdownCaps\s*\.\s*linkBytes\b/.test(body)]
      ];
      for (const [name, ok] of wants) if (!ok) findings.push(`${LINKS_FILE}:${String(lineOf(bare, opens.at))} LinkPolicy.opens never names ${name}, so that clause of the policy is not asked (z6)`);
    }
  }
  const settings = lexedFiles.find((f) => f.name === SETTINGS_FILE);
  if (settings !== undefined) {
    const bare = settings.lx.bare;
    const decls = declSpans(bare);
    for (const m of bare.matchAll(OPENS)) {
      const d = innermost(decls, m.index);
      const body = d === null ? '' : bare.slice(d.bodyOpen, d.bodyClose);
      if (!/\bUIApplication\s*\.\s*openNotificationSettingsURLString\b/.test(body)) findings.push(`${at(settings, m.index)} opens an address not made from UIApplication.openNotificationSettingsURLString in the same function; Settings opens iOS's own notification settings and nothing else (z5)`);
    }
  }
  return { findings, said };
}

// ---------------------------------------------------------------------------
// Phase 317: the write, the owner check, and the list that only shrinks
// (build/p317/SPEC.md §6.3 (ab), (ac), (ad))
// ---------------------------------------------------------------------------
//
// End is the first thing the phone does that changes anything on the Mac, so
// three rules hold its shape as text, the way (n) holds who deletes a pairing
// item. What they read is WHERE a name is said and in what order, with the
// type and function spans above, over comment-blanked text; what the Swift
// DOES with it is test:ios's (P317WriteTransportTests, EndBatchTests) and
// probe:p316's `end` arms.
//
// (ab) THE WRITE. `"POST"` only in `present` (POST /pair) and `signedPost`;
//      `signedPost` called by `end` alone; `WriteId.fresh` the
//      one source of a write id, 16 bytes of `SecRandomCopyBytes`, bound to a
//      local and never kept; the body encoded in `signedPost` alone, with
//      sorted keys and exactly its keys; the writer's `end(` called ONCE in
//      the app, in `EndRunner.run`, and no `while` or `repeat` around a write;
//      `handed` set in `send()` alone, as the statement just before
//      `connection.send`, after a check of `withheld`; a write's cancellation
//      sets `withheld` only while `handed` is false; the result classified by
//      `handed`; and an answer accepted only with the sent id echoed, or `""`
//      with `refused` and `malformed` (F2, F14).
// (ac) THE OWNER CHECK. `import LocalAuthentication` and `LAContext` in
//      `App/OwnerCheck.swift` alone; ONE `evaluatePolicy(` call, with
//      `.deviceOwnerAuthentication`; the biometrics-only policy only as the
//      first argument of a `canEvaluatePolicy(` in `OwnerCheck.swift`'s
//      `kind()`, and the reuse window nowhere; a new `LAContext(` inside
//      `confirm`; `DeviceOwnerCheck`
//      the one conformer; every `run` of a runner inside the `case .confirmed`
//      of a switch on `confirm(` in the same function; nothing in Settings,
//      the pairing, the conversation, Door/ or an unpair names the check; no
//      string that could key a stored Face ID setting; and Info.plist's
//      `NSFaceIDUsageDescription` pinned to its words (and to rule e's
//      PINNED_PLIST_KEYS, so no device spelling of it is read instead).
// (ad) THE LIST THAT ONLY SHRINKS, AND NOTHING SENT AFTER THE APP LEFT.
//      `EndRunner.targets` a `let`, never grown; one awaited write per turn of
//      ONE loop over it; `stopRequested` read before each, the first
//      included, and never set false; every `EndRunner(` made at the press,
//      registered, and only then the owner check asked; `AppModel.wentAway()`
//      stops every registered runner (which sets `stopRequested` and cancels
//      its task); and nothing persists a write or a target (F2).

/** The one file that names LocalAuthentication (SPEC §5.8.2). */
export const OWNER_CHECK_FILE = 'App/OwnerCheck.swift';
/** The End bar and the runner (SPEC §5.8.3). */
export const END_BAR_FILE = 'Screens/EndBar.swift';
/** End these (SPEC §5.8.4). */
export const END_BATCH_FILE = 'Screens/EndBatch.swift';
/** Info.plist's Face ID purpose string, pinned (SPEC §5.8.2, research 136 §13). */
export const FACE_ID_USAGE = 'Tortie asks for Face ID before it ends a session on your Mac.';
/** Where nothing may name the owner check: reading, pairing, Settings, the door (his ruling: "Only for End"). */
export const OWNER_CHECK_ABSENT = Object.freeze(['Screens/SettingsScreen.swift', 'Screens/PairingScreen.swift', 'Screens/ConversationScreen.swift', 'Screens/DoorWords.swift']);
/** What persists anything; none of it may sit in End's files or the write path. */
const PERSISTS = /\bUserDefaults\b|@AppStorage\b|@SceneStorage\b|\bSecItemAdd\b|\bSecItemUpdate\b|\bFileManager\b|\.\s*write\s*\(\s*to\s*:|\bNSKeyedArchiver\b|\bcreateFile\b|\bNSUbiquitousKeyValueStore\b/g;

/** One Swift file of `files` by name, lexed, or null. */
function lexedFile(files, name) {
  const f = files.find((x) => x.name === name);
  if (f === undefined) return null;
  const lx = lexSwift(f.source);
  return { name, source: f.source, ...lx, types: typeSpans(lx.bare), funcs: funcSpans(lx.bare).filter((fn) => fn.bodyOpen !== -1) };
}

/** The functions of a lexed file named `name`, inside the type named `type` when one is given. */
function funcsNamed(file, name, type = null) {
  return file.funcs.filter((fn) => fn.name === name && (type === null || innermost(file.types, fn.at)?.name === type));
}

const bodyText = (file, fn) => file.bare.slice(fn.bodyOpen, fn.bodyClose + 1);
const placeOf = (file, i) => ({ type: innermost(file.types, i)?.name ?? null, fn: innermost(file.funcs, i)?.name ?? null });
const atLine = (file, i) => `${file.name}:${String(lineOf(file.bare, i))}`;
/** Is the match at `i` the name of a declaration (`func NAME(`), not a call? */
const isDecl = (bare, i) => /\bfunc\s+$/.test(bare.slice(Math.max(0, i - 12), i));

/** The members of a struct's body at its own depth: `let NAME:` or `var NAME:`. */
function storedFields(bare, type) {
  const body = bare.slice(type.open + 1, type.close);
  const out = [];
  let depth = 0;
  for (const line of body.split('\n')) {
    if (depth === 0) {
      const m = /^\s*(?:(?:private|fileprivate|internal|public)(?:\s*\(\s*set\s*\))?\s+)*(?:let|var)\s+([A-Za-z_]\w*)\s*:/.exec(line);
      if (m !== null) out.push(m[1]);
    }
    for (const ch of line) depth += ch === '{' ? 1 : ch === '}' ? -1 : 0;
  }
  return out;
}

/**
 * The writer's `end(`: a member call with a `batch:` argument and no `door:`
 * (the client's own `end(_:batch:door:)` takes the door), in every app file.
 */
function writerEndCalls(lexedFiles) {
  const out = [];
  for (const file of lexedFiles) {
    for (const m of file.bare.matchAll(/\.\s*end\s*\(/g)) {
      // A member call has an expression before its dot; `.end(session:batch:)`
      // after a `(` or a `,` is the route's enum case, not a call of the writer.
      if (!/[\w)\]?!]\s*$/.test(file.bare.slice(Math.max(0, m.index - 40), m.index))) continue;
      const open = m.index + m[0].length - 1;
      const close = closeParen(file.bare, open);
      const args = file.bare.slice(open + 1, close === -1 ? file.bare.length : close);
      if (!/\bbatch\s*:/.test(args) || /\bdoor\s*:/.test(args)) continue;
      out.push({ file, at: m.index, args });
    }
  }
  return out;
}

/** Rule (ab), pure over the app's Swift files (`{ name, source }`, named relative to the app folder). */
export function ruleWrite(files) {
  const findings = [];
  const said = { posts: 0, signedPosts: 0, freshIds: 0, writerEnds: 0, handed: 0, withheld: 0 };
  const client = lexedFile(files, 'Door/DoorClient.swift');
  if (client === null) return { findings: ['Door/DoorClient.swift does not exist, so the phone has no write path this rule can read'], said };
  const all = files.map((f) => lexedFile(files, f.name));
  const fnOf = (name, type = null) => funcsNamed(client, name, type)[0] ?? null;

  // (ab1) "POST" only in present( and signedPost(.
  for (const file of all) {
    for (const s of file.strings) {
      if (s.value !== 'POST') continue;
      said.posts += 1;
      const p = placeOf(file, s.start);
      if (file.name !== 'Door/DoorClient.swift' || (p.fn !== 'present' && p.fn !== 'signedPost')) findings.push(`${atLine(file, s.start)} writes "POST" in ${p.fn ?? 'no function'}; a POST is sent only by present (POST /pair) and signedPost (the write)`);
    }
  }
  // (ab2) signedPost( called by end( alone, once.
  const signedPost = fnOf('signedPost');
  if (signedPost === null) findings.push('Door/DoorClient.swift declares no signedPost(route:door:limits:) with a body, so the write has no one path');
  const callers = { end: 0 };
  for (const file of all) {
    for (const m of file.bare.matchAll(/\bsignedPost\s*\(/g)) {
      if (isDecl(file.bare, m.index)) continue;
      said.signedPosts += 1;
      const p = placeOf(file, m.index);
      if (file.name === 'Door/DoorClient.swift' && p.type === 'DoorClient' && p.fn === 'end') callers[p.fn] += 1;
      else findings.push(`${atLine(file, m.index)} calls signedPost in ${p.type ?? 'no type'}.${p.fn ?? 'no function'}; only DoorClient.end calls it`);
    }
  }
  for (const [name, n] of Object.entries(callers)) if (n !== 1) findings.push(`DoorClient.${name} calls signedPost ${String(n)} time(s); each write is one call of the one path`);
  // (ab3) WriteId.fresh: the one source, 16 random bytes, bound to a local.
  for (const file of all) {
    for (const m of file.bare.matchAll(/\bWriteId\s*\.\s*fresh\s*\(/g)) {
      said.freshIds += 1;
      const p = placeOf(file, m.index);
      if (file.name !== 'Door/DoorClient.swift' || p.fn !== 'signedPost') findings.push(`${atLine(file, m.index)} makes a write id in ${p.fn ?? 'no function'}; WriteId.fresh() is called by signedPost alone, once per write`);
      const lead = file.bare.slice(Math.max(0, m.index - 80), m.index);
      if (!/\b(?:guard\s+)?let\s+[A-Za-z_]\w*\s*=\s*$/.test(lead)) findings.push(`${atLine(file, m.index)} does not bind WriteId.fresh() to a local let; a write id is made for one call and never kept`);
    }
  }
  if (said.freshIds !== 1) findings.push(`WriteId.fresh() is called ${String(said.freshIds)} time(s) in the app; it is called once, in signedPost, so one call is one id`);
  const writeIdFile = all.find((file) => file.types.some((t) => t.name === 'WriteId' && t.kind !== 'extension'));
  if (writeIdFile === undefined) findings.push('no app file declares WriteId, the one source of a write id');
  else {
    const t = writeIdFile.types.find((x) => x.name === 'WriteId' && x.kind !== 'extension');
    const fresh = writeIdFile.funcs.find((fn) => fn.name === 'fresh' && fn.at > t.open && fn.at < t.close);
    const typeBody = writeIdFile.bare.slice(t.open, t.close + 1);
    const freshBody = fresh === undefined ? '' : bodyText(writeIdFile, fresh);
    const sixteen = /\b16\b/.test(freshBody) || (/\bbyteCount\b/.test(freshBody) && /\bstatic\s+let\s+byteCount\s*=\s*16\b/.test(typeBody));
    if (fresh === undefined || !/\bSecRandomCopyBytes\s*\(/.test(freshBody) || !sixteen) findings.push(`${writeIdFile.name}'s WriteId.fresh does not take 16 bytes from SecRandomCopyBytes; a write id is 128 bits from the system's random source`);
    if (/\bstatic\s+var\b/.test(typeBody)) findings.push(`${writeIdFile.name}'s WriteId holds a static var, so an id could be kept between writes`);
  }
  for (const file of all) {
    for (const t of file.types.filter((x) => x.kind !== 'extension' && x.kind !== 'protocol')) {
      for (const m of file.bare.slice(t.open, t.close).matchAll(/\b(?:var|let)\s+[A-Za-z_]\w*\s*:\s*WriteId\b/g)) findings.push(`${atLine(file, t.open + m.index)} keeps a WriteId in ${t.name}; a write id is never stored`);
    }
  }
  // (ab4) The body, encoded in signedPost alone, with exactly its keys, sorted.
  for (const file of all) {
    for (const m of file.bare.matchAll(/\b(EndBody)\s*\(/g)) {
      if (/\b(?:struct|class|enum)\s+$/.test(file.bare.slice(Math.max(0, m.index - 10), m.index))) continue;
      const p = placeOf(file, m.index);
      if (file.name !== 'Door/DoorClient.swift' || p.fn !== 'signedPost') findings.push(`${atLine(file, m.index)} builds a ${m[1]} in ${p.fn ?? 'no function'}; a write's body is made in signedPost alone`);
    }
  }
  if (signedPost !== null) {
    const body = bodyText(client, signedPost);
    if (!/\.\s*sortedKeys\b/.test(body)) findings.push('signedPost does not encode the body with .sortedKeys, so its bytes would not be the ones the Mac and the vectors expect');
    if (!/\bEndBody\s*\(/.test(body)) findings.push('signedPost does not build an EndBody, so the write is encoded somewhere else');
    if (/\b(?:while|repeat)\b/.test(body)) findings.push('signedPost holds a while or repeat; a write is sent once and never retried');
  }
  for (const [name, want] of [['EndBody', 'batch,session,write']]) {
    const t = client.types.find((x) => x.name === name && x.kind === 'struct');
    if (t === undefined) {
      findings.push(`Door/DoorClient.swift declares no struct ${name}`);
      continue;
    }
    const fields = storedFields(client.bare, t).sort().join(',');
    if (fields !== want) findings.push(`Door/DoorClient.swift's ${name} holds ${fields || 'nothing'}; the Mac reads exactly ${want} and refuses any other key`);
  }
  for (const name of ['end']) {
    const fn = fnOf(name, 'DoorClient');
    if (fn !== null && /\b(?:while|repeat|for)\b/.test(bodyText(client, fn))) findings.push(`DoorClient.${name} loops; a write is one call and never retried`);
  }
  // (ab5) The writer's end( once, in EndRunner.run, in a for and never a while.
  const ends = writerEndCalls(all);
  said.writerEnds = ends.length;
  for (const e of ends) {
    const p = placeOf(e.file, e.at);
    if (p.type !== 'EndRunner' || p.fn !== 'run') findings.push(`${atLine(e.file, e.at)} calls the writer's end( in ${p.type ?? 'no type'}.${p.fn ?? 'no function'}; the app's one call of it is EndRunner.run`);
  }
  if (ends.length !== 1) findings.push(`the writer's end( is called ${String(ends.length)} time(s) in the app; exactly once, in EndRunner.run, so every End, single or batch, is one runner`);
  const bar = all.find((f) => f.name === END_BAR_FILE) ?? null;
  const run = bar === null ? null : funcsNamed(bar, 'run', 'EndRunner')[0] ?? null;
  if (run !== null && /\b(?:while|repeat)\b/.test(bodyText(bar, run))) findings.push(`${END_BAR_FILE}'s EndRunner.run holds a while or repeat; it is one pass over its targets, and a write is never retried`);
  // (ab6) handed: set in send() alone, just before connection.send, after a withheld check.
  const handedSets = [...client.bare.matchAll(/(?<![\w.])handed\s*=(?!=)\s*([^\n;]*)/g)].filter((m) => !/\b(?:var|let)\s+$/.test(client.bare.slice(Math.max(0, m.index - 8), m.index)));
  said.handed = handedSets.length;
  if (handedSets.length !== 1) findings.push(`Door/DoorClient.swift sets handed ${String(handedSets.length)} time(s); once, in send(), just before the bytes are handed`);
  for (const m of handedSets) {
    const p = placeOf(client, m.index);
    if (p.fn !== 'send' || m[1].trim() !== 'true') findings.push(`${atLine(client, m.index)} sets handed = ${m[1].trim()} in ${p.fn ?? 'no function'}; only send() sets it, to true`);
    else {
      const next = client.bare.slice(m.index + m[0].length).replace(/^\s*[;\n]\s*/, '').trimStart();
      if (!/^connection\s*\.\s*send\s*\(/.test(next)) findings.push(`${atLine(client, m.index)} is not the statement just before connection.send; a cancel between them would read .notSent for bytes that may have left`);
      const inSend = innermost(client.funcs, m.index);
      const before = inSend === null ? '' : client.bare.slice(inSend.bodyOpen, m.index);
      if (!/\bguard\s+!\s*withheld\b|\bif\s+withheld\b/.test(before)) findings.push(`${atLine(client, m.index)} hands the bytes without asking withheld first, so a handshake that completes after the app left would send a withheld write`);
    }
  }
  // (ab7) withheld: set by a write's cancellation, only while handed is false.
  const withheldSets = [...client.bare.matchAll(/(?<![\w.])withheld\s*=(?!=)\s*([^\n;]*)/g)].filter((m) => !/\b(?:var|let)\s+$/.test(client.bare.slice(Math.max(0, m.index - 8), m.index)));
  said.withheld = withheldSets.length;
  if (withheldSets.length !== 1) findings.push(`Door/DoorClient.swift sets withheld ${String(withheldSets.length)} time(s); once, in a write's cancellation`);
  for (const m of withheldSets) {
    const fn = innermost(client.funcs, m.index);
    const before = fn === null ? '' : client.bare.slice(fn.bodyOpen, m.index);
    if (m[1].trim() !== 'true' || !/\bguard\s+!\s*handed\s+else\b|\bif\s+!\s*handed\b/.test(before)) findings.push(`${atLine(client, m.index)} sets withheld without asking handed first; a write whose bytes were handed ends by its answer, never by the cancel`);
  }
  // (ab8) Classified by handed; the echo, or "" with refused and malformed.
  const resultFile = all.find((file) => file.types.some((t) => t.name === 'WriteResult' && t.kind === 'enum'));
  if (resultFile === undefined) findings.push('no app file declares enum WriteResult, what is true of a write');
  else {
    const t = resultFile.types.find((x) => x.name === 'WriteResult' && x.kind === 'enum');
    const of = resultFile.funcs.find((fn) => fn.name === 'of' && fn.at > t.open && fn.at < t.close);
    if (of === undefined) findings.push(`${resultFile.name}'s WriteResult has no static func of, so nothing classifies an exchange's end`);
    else {
      const body = bodyText(resultFile, of);
      if (!/\.\s*handed\b/.test(body) || !/\.\s*notSent\b/.test(body) || !/\.\s*noAnswer\b/.test(body)) findings.push(`${resultFile.name}'s WriteResult.of does not classify by handed into .notSent and .noAnswer; .notSent must mean the bytes never left`);
      // The members it reads on the answer, followed, so the empty echo's terms are read wherever they are spelled.
      let echo = body;
      for (const m of body.matchAll(/\banswer\s*\.\s*([A-Za-z_]\w*)\b/g)) {
        for (const file of all) {
          for (const d of file.bare.matchAll(new RegExp(`\\bvar\\s+${m[1]}\\s*:\\s*Bool\\s*\\{`, 'g'))) {
            const open = d.index + d[0].length - 1;
            echo += file.bare.slice(open, matchForward(file.bare, open) + 1);
          }
        }
      }
      if (!/\bwrite\s*==\s*sent\b/.test(body)) findings.push(`${resultFile.name}'s WriteResult.of never compares the answer's write with the id it sent; any other echo is no answer`);
      if (!/\bisEmpty\b|==\s*""/.test(echo) || !/\.\s*refused\b/.test(echo) || !/\.\s*malformed\b/.test(echo)) findings.push(`${resultFile.name}'s WriteResult.of does not accept the empty echo only with refused and malformed (F14)`);
    }
  }
  return { findings, said };
}

/** Rule (ac), pure over the app's Swift files and Info.plist as CoreFoundation reads it (or null). */
export function ruleOwnerCheck(files, plist) {
  const findings = [];
  const said = { evaluations: 0, conformers: [], runs: 0 };
  const all = files.map((f) => lexedFile(files, f.name));
  const owner = all.find((f) => f.name === OWNER_CHECK_FILE) ?? null;
  if (owner === null) findings.push(`${OWNER_CHECK_FILE} does not exist, so nothing asks iOS before an End is sent`);
  for (const file of all) {
    for (const m of file.code.matchAll(/^\s*(?:@\w+\s+)*import\s+(?:(?:struct|class|enum|protocol|typealias|func|let|var)\s+)?`?LocalAuthentication\b/gm)) {
      if (file.name !== OWNER_CHECK_FILE) findings.push(`${atLine(file, m.index)} imports LocalAuthentication; ${OWNER_CHECK_FILE} is the one file that does`);
    }
    for (const m of file.bare.matchAll(/\bLAContext\b/g)) if (file.name !== OWNER_CHECK_FILE) findings.push(`${atLine(file, m.index)} names LAContext; only ${OWNER_CHECK_FILE} does`);
    for (const m of file.bare.matchAll(/\btouchIDAuthenticationAllowableReuseDuration\b/g)) findings.push(`${atLine(file, m.index)} names ${m[0]}; an earlier match never stands in for a press`);
    // The biometrics-only policy is ASKED about, never evaluated: only as the
    // first argument of canEvaluatePolicy( inside OwnerCheck.swift's kind(),
    // where it picks the glyph (the fix round; the verify's E3).
    for (const m of file.bare.matchAll(/\bdeviceOwnerAuthenticationWithBiometrics\b/g)) {
      const p = placeOf(file, m.index);
      const call = /\bcanEvaluatePolicy\s*\(\s*\.\s*$/.exec(file.bare.slice(Math.max(0, m.index - 40), m.index));
      if (file.name !== OWNER_CHECK_FILE || p.fn !== 'kind' || call === null) findings.push(`${atLine(file, m.index)} names deviceOwnerAuthenticationWithBiometrics in ${p.fn ?? 'no function'}; End asks with the passcode behind biometry, and the biometrics-only policy is only ASKED, as canEvaluatePolicy's first argument in ${OWNER_CHECK_FILE}'s kind()`);
    }
    for (const m of file.bare.matchAll(/\bevaluatePolicy\s*\(/g)) {
      if (isDecl(file.bare, m.index)) continue;
      said.evaluations += 1;
      const close = closeParen(file.bare, m.index + m[0].length - 1);
      const first = topLevelArgs(file.bare.slice(m.index + m[0].length, close === -1 ? file.bare.length : close))[0] ?? '';
      if (file.name !== OWNER_CHECK_FILE) findings.push(`${atLine(file, m.index)} evaluates a policy outside ${OWNER_CHECK_FILE}`);
      if (!/^\.\s*deviceOwnerAuthentication$/.test(first.trim())) findings.push(`${atLine(file, m.index)} evaluates ${first.trim() || 'nothing'}; the one policy is .deviceOwnerAuthentication`);
    }
    for (const t of file.types.filter((x) => x.kind !== 'protocol' && x.kind !== 'extension')) {
      const head = file.bare.slice(t.at, t.open);
      if (/:\s*[^{]*\bOwnerCheck\b/.test(head)) said.conformers.push(t.name);
    }
    for (const t of file.types.filter((x) => x.kind === 'extension')) {
      if (/:\s*[^{]*\bOwnerCheck\b/.test(file.bare.slice(t.at, t.open))) said.conformers.push(`extension ${t.name}`);
    }
    // No string that could key a stored Face ID setting (the glyph `faceid` is an SF Symbol, not a key).
    for (const s of file.strings) if (/faceID|[Bb]iometr|ownerCheck/.test(s.value)) findings.push(`${atLine(file, s.start)} writes ${JSON.stringify(s.value)}; nothing stores a Face ID setting, and there is no switch (his ruling)`);
  }
  if (said.evaluations !== 1) findings.push(`the app evaluates a policy ${String(said.evaluations)} time(s); once, in DeviceOwnerCheck.confirm`);
  if (said.conformers.join() !== 'DeviceOwnerCheck') findings.push(`the app's OwnerCheck conformers are ${said.conformers.join(', ') || 'none'}; DeviceOwnerCheck is the one, and a test hands in its own`);
  if (owner !== null) {
    const confirm = funcsNamed(owner, 'confirm')[0] ?? null;
    if (confirm === null || !/\bLAContext\s*\(\s*\)/.test(bodyText(owner, confirm))) findings.push(`${OWNER_CHECK_FILE}'s confirm makes no new LAContext() of its own, so one press's match could stand in for another`);
    // THE GLYPH SAYS WHAT iOS WILL ASK FOR (the fix round, the verify's E3):
    // kind() reads biometryType only after a guard on the biometrics-only
    // QUESTION that answers the lock when iOS would not ask for a biometry,
    // because biometryType names the hardware whatever is enrolled.
    const kind = funcsNamed(owner, 'kind')[0] ?? null;
    if (kind === null) findings.push(`${OWNER_CHECK_FILE} declares no kind(), so the End bar's glyph has nothing to say`);
    else {
      const body = bodyText(owner, kind);
      const asked = /\bguard\s+[\w.]*\bcanEvaluatePolicy\s*\(\s*\.\s*deviceOwnerAuthenticationWithBiometrics\b[^{}]*\belse\s*\{\s*return\s+\.passcode\s*\}/.exec(body);
      const read = /\bbiometryType\b/.exec(body);
      if (read !== null && (asked === null || asked.index > read.index)) findings.push(`${OWNER_CHECK_FILE}'s kind() reads biometryType without first asking canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, …) in a guard that answers .passcode, so it draws the hardware's mark on a phone that will ask for the passcode (the verify's E3)`);
    }
  }
  // Every run of a runner sits in the .confirmed case of a switch on confirm(.
  for (const file of all) {
    const runners = new Set([...file.bare.matchAll(/\blet\s+([A-Za-z_]\w*)\s*=\s*EndRunner\s*\(/g)].map((m) => m[1]));
    for (const m of file.bare.matchAll(/(?<![\w.])([A-Za-z_]\w*)\s*\.\s*run\s*(?:\(|\{)/g)) {
      if (!runners.has(m[1])) continue;
      said.runs += 1;
      const fn = innermost(file.funcs, m.index);
      const before = fn === null ? '' : file.bare.slice(fn.bodyOpen, m.index);
      const sw = [...before.matchAll(/\bswitch\s+await\s+[^{\n]*\bconfirm\s*\(/g)].pop();
      const tail = sw === undefined ? '' : before.slice(sw.index);
      const lastCase = [...tail.matchAll(/\bcase\s+\.\s*([A-Za-z_]\w*)\b|\bdefault\s*:/g)].pop();
      if (lastCase === undefined || lastCase[1] !== 'confirmed') findings.push(`${atLine(file, m.index)} runs ${m[1]} outside the .confirmed case of a switch on the owner check; only a match sends anything`);
    }
  }
  if (said.runs === 0) findings.push('no runner is run anywhere in the app, so End sends nothing or sends it another way');
  // Nothing outside End names the check.
  for (const file of all) {
    if (OWNER_CHECK_ABSENT.includes(file.name) || file.name.startsWith('Door/')) {
      for (const m of file.bare.matchAll(/\bOwnerCheck\b|\bownerCheck\b|\bconfirm\s*\(\s*reason\s*:/g)) findings.push(`${atLine(file, m.index)} names ${m[0].replace(/\s+/g, '')}; Face ID guards the End press and nothing else ("Only for End")`);
    }
    for (const fn of file.funcs.filter((x) => /unpair/i.test(x.name))) {
      for (const m of bodyText(file, fn).matchAll(/\bownerCheck\b|\bconfirm\s*\(\s*reason\s*:/g)) findings.push(`${file.name}'s ${fn.name} names ${m[0].replace(/\s+/g, '')}; Unpair asks no owner check ("Only for End")`);
    }
  }
  // Info.plist's purpose string.
  if (plist === null || typeof plist !== 'object') findings.push('Info.plist cannot be read, so its Face ID purpose string cannot be');
  else if (plist.NSFaceIDUsageDescription !== FACE_ID_USAGE) findings.push(`Info.plist's NSFaceIDUsageDescription is ${JSON.stringify(plist.NSFaceIDUsageDescription ?? null)}; it is ${JSON.stringify(FACE_ID_USAGE)}, and iOS refuses Face ID to an app without one`);
  return { findings, said };
}

/**
 * Rule (ac), widened by Phase 317's tests round: THE END PRESS SAYS OFF WHEN
 * IT IS DRAWN OFF. The fix round made the press a plain `Button` holding its
 * words alone, `.disabled(row == .off)`, after the verify read an End drawn
 * off as ENABLED to XCUITest (and so to VoiceOver) on the unreachable offer.
 * The reverify's ablation B4 took that modifier out and left vitest,
 * conformance:pocket, its hostile client and this gate all green, so it is
 * held here: in Screens/EndBar.swift, the ONE element the app identifies
 * `ID.sessionEnd` is a `Button` whose own modifier chain holds
 * `.disabled(<row> == .off)` (or `.off == <row>`, or `!= .on` either way),
 * where `<row>` is the function's parameter of type `EndBarDrawing.Row`, whose
 * cases are exactly `on` and `off`, so `== .off` is every row not drawn on.
 * Pure over the app's Swift files.
 */
export function ruleEndPressOff(files) {
  const findings = [];
  const said = { presses: 0, chain: [] };
  const all = files.map((f) => lexedFile(files, f.name));
  const ID_RE = /\.\s*accessibilityIdentifier\s*\(\s*ID\s*\.\s*sessionEnd\s*\)/g;
  const sites = [];
  for (const file of all) for (const m of file.bare.matchAll(ID_RE)) sites.push({ file, at: m.index });
  said.presses = sites.length;
  if (sites.length !== 1) findings.push(`${String(sites.length)} element(s) in the app are identified ID.sessionEnd; the End press is one, in ${END_BAR_FILE}`);
  const bar = all.find((f) => f.name === END_BAR_FILE) ?? null;
  if (bar === null) return { findings: [...findings, `${END_BAR_FILE} does not exist, so the End press cannot be read`], said };
  const cases = enumCases(bar.source, 'Row');
  if (cases === null || [...cases].sort().join() !== 'off,on') findings.push(`${END_BAR_FILE}'s EndBarDrawing.Row has the cases ${JSON.stringify(cases)}; this rule reads \`== .off\` as every row not drawn on, which holds only while they are exactly on and off`);
  const site = sites.find((s) => s.file === bar) ?? null;
  if (site === null) return { findings: [...findings, `${END_BAR_FILE} identifies no element ID.sessionEnd, so the End press cannot be read`], said };
  const fn = innermost(bar.funcs, site.at);
  if (fn === null) return { findings: [...findings, `${atLine(bar, site.at)} identifies the End press outside any function`], said };
  const param = /([A-Za-z_]\w*)\s*:\s*EndBarDrawing\s*\.\s*Row\b/.exec(bar.bare.slice(fn.at, fn.bodyOpen))?.[1] ?? null;
  if (param === null) findings.push(`${END_BAR_FILE}'s ${fn.name} takes no EndBarDrawing.Row, so whether its press is off cannot be read`);
  // Every Button in that function, its closures skipped and its own modifier
  // chain read; the press is the one whose chain identifies ID.sessionEnd.
  const text = bar.bare;
  let press = null;
  for (const m of bodyText(bar, fn).matchAll(/\bButton\s*(?=[({])/g)) {
    let k = fn.bodyOpen + m.index + m[0].length;
    if (text[k] === '(') {
      const close = closeParen(text, k);
      if (close === -1) continue;
      k = close + 1;
    }
    // Its trailing closures: the action, then `label:`.
    for (;;) {
      const brace = /^\s*(?:label\s*:\s*)?\{/.exec(text.slice(k));
      if (brace === null) break;
      const close = matchForward(text, k + brace[0].length - 1);
      if (close === -1) break;
      k = close + 1;
    }
    const chain = [];
    for (;;) {
      const mod = /^\s*\.\s*([A-Za-z_]\w*)\s*\(/.exec(text.slice(k));
      if (mod === null) break;
      const open = k + mod[0].length - 1;
      const close = closeParen(text, open);
      if (close === -1) break;
      chain.push({ name: mod[1], args: text.slice(open + 1, close).replace(/\s+/g, ' ').trim(), at: k });
      k = close + 1;
    }
    if (chain.some((c) => c.at <= site.at && site.at < k)) press = chain;
  }
  if (press === null) findings.push(`${atLine(bar, site.at)} identifies ID.sessionEnd on something that is not a Button's own modifier chain, so the press cannot be read`);
  else {
    said.chain = press.map((c) => c.name);
    const off = param === null ? [] : [`${param} == .off`, `.off == ${param}`, `${param} != .on`, `.on != ${param}`];
    const disabled = press.filter((c) => c.name === 'disabled');
    if (!disabled.some((c) => off.includes(c.args))) findings.push(`${END_BAR_FILE}'s End press carries ${disabled.length === 0 ? 'no .disabled' : disabled.map((c) => `.disabled(${c.args})`).join(' and ')}; it is .disabled(${param ?? 'row'} == .off), so a row drawn off cannot be pressed and reads off to XCUITest and VoiceOver (the reverify's B4)`);
  }
  return { findings, said };
}

/** Rule (ad), pure over the app's Swift files. */
export function ruleShrinks(files) {
  const findings = [];
  const said = { runners: 0, registered: 0, loops: 0 };
  const all = files.map((f) => lexedFile(files, f.name));
  const bar = all.find((f) => f.name === END_BAR_FILE) ?? null;
  const runnerType = bar === null ? undefined : bar.types.find((t) => t.name === 'EndRunner' && t.kind === 'class');
  if (runnerType === undefined) findings.push(`${END_BAR_FILE} declares no class EndRunner, so End has no list fixed at the confirm`);
  else {
    const body = bar.bare.slice(runnerType.open, runnerType.close + 1);
    // (ad1) targets: a let, never grown.
    if (!/\blet\s+targets\s*:\s*\[\s*String\s*\]/.test(body)) findings.push(`${END_BAR_FILE}'s EndRunner.targets is not \`let targets: [String]\`; the list is fixed at the confirm`);
    for (const m of body.matchAll(/\btargets\s*(?:\.\s*(?:append|insert|replaceSubrange)\s*\(|\+=|=(?!=))/g)) {
      const line = body.slice(Math.max(0, body.lastIndexOf('\n', m.index)), m.index + m[0].length);
      if (/\bself\s*\.\s*targets\s*=\s*$/.test(line) && innermost(bar.funcs, runnerType.open + m.index) === null) continue;
      findings.push(`${atLine(bar, runnerType.open + m.index)} grows or replaces EndRunner.targets; the list only shrinks`);
    }
    // (ad2) One loop over targets, one awaited write per turn.
    const run = bar.funcs.find((fn) => fn.name === 'run' && fn.at > runnerType.open && fn.at < runnerType.close);
    if (run === undefined) findings.push(`${END_BAR_FILE}'s EndRunner has no run`);
    else {
      const runBody = bodyText(bar, run);
      const loops = [...runBody.matchAll(/\bfor\s+([A-Za-z_]\w*)\s+in\s+(?:self\s*\.\s*)?targets\s*\{/g)];
      said.loops = loops.length;
      if (loops.length !== 1) findings.push(`EndRunner.run has ${String(loops.length)} loop(s) over targets; one pass, in order`);
      else {
        const open = loops[0].index + loops[0][0].length - 1;
        const loop = runBody.slice(open, matchForward(runBody, open) + 1);
        const awaits = [...loop.matchAll(/\bawait\b/g)].length;
        const write = /\.\s*end\s*\([^)]*\bbatch\s*:/.exec(loop);
        if (write === null) findings.push('EndRunner.run\'s loop makes no write');
        if (awaits !== 1) findings.push(`EndRunner.run's loop awaits ${String(awaits)} time(s); one awaited write per target`);
        const stopRead = /\bif\s+stopRequested\b|\bguard\s+!\s*stopRequested\b/.exec(loop);
        if (stopRead === null || (write !== null && stopRead.index > write.index)) findings.push('EndRunner.run does not read stopRequested before each write, the first included; a stop during the owner check must stop the first write too');
      }
      if (/(?<![\w.])targets\s*\[/.test(runBody)) findings.push('EndRunner.run indexes targets; it walks them in order, once');
    }
    // (ad3) stopRequested never set false after true; stop() sets it and cancels the task.
    const stop = bar.funcs.find((fn) => fn.name === 'stop' && fn.at > runnerType.open && fn.at < runnerType.close);
    const stopBody = stop === undefined ? '' : bodyText(bar, stop);
    if (!/\bstopRequested\s*=\s*true\b/.test(stopBody) || !/\btask\s*\??\s*\.\s*cancel\s*\(\s*\)/.test(stopBody)) findings.push(`${END_BAR_FILE}'s EndRunner.stop does not set stopRequested and cancel its task; the cancel is what withholds a write not yet handed`);
  }
  for (const file of all) {
    for (const m of file.bare.matchAll(/(?<![\w])(?:[A-Za-z_]\w*\s*\??\s*\.\s*)?stopRequested\s*=\s*([^=\n;}][^\n;}]*)/g)) {
      if (/\b(?:var|let)\s+$/.test(file.bare.slice(Math.max(0, m.index - 8), m.index))) continue;
      if (m[1].trim() !== 'true') findings.push(`${atLine(file, m.index)} sets stopRequested = ${m[1].trim()}; once true it stays true`);
    }
  }
  // (ad4) Every runner made at the press: made, registered, then the owner check.
  for (const file of all) {
    for (const m of file.bare.matchAll(/\blet\s+([A-Za-z_]\w*)\s*=\s*EndRunner\s*\(/g)) {
      said.runners += 1;
      const fn = innermost(file.funcs, m.index);
      const after = fn === null ? '' : file.bare.slice(m.index, fn.bodyClose);
      const reg = new RegExp(`\\bregister\\s*\\(\\s*${m[1]}\\s*\\)`).exec(after);
      const confirm = /\bconfirm\s*\(\s*reason\s*:/.exec(after);
      if (reg !== null) said.registered += 1;
      if (reg === null || confirm === null || reg.index > confirm.index) findings.push(`${atLine(file, m.index)} makes a runner that is not registered before the owner check is asked; a trip to the background during Face ID must stop it before it sends`);
    }
    for (const m of file.bare.matchAll(/\bEndRunner\s*\(/g)) {
      if (/\blet\s+[A-Za-z_]\w*\s*=\s*$/.test(file.bare.slice(Math.max(0, m.index - 60), m.index))) continue;
      if (/\b(?:class|struct)\s+$/.test(file.bare.slice(Math.max(0, m.index - 8), m.index))) continue;
      findings.push(`${atLine(file, m.index)} makes an EndRunner without binding it, so it cannot be registered`);
    }
  }
  if (said.runners === 0) findings.push('nothing in the app makes an EndRunner');
  // (ad5) AppModel.wentAway stops every registered runner.
  const app = all.find((f) => f.name === 'App/TortieApp.swift') ?? null;
  const model = app === null ? undefined : app.types.find((t) => t.name === 'AppModel' && t.kind === 'class');
  if (model === undefined) findings.push('App/TortieApp.swift declares no class AppModel');
  else {
    // The class and its extensions (the registry conformance may be one).
    const modelSpans = app.types.filter((t) => t.name === 'AppModel' && (t.kind === 'class' || t.kind === 'extension'));
    const inModel = (name) => app.funcs.find((fn) => fn.name === name && modelSpans.some((s) => fn.at > s.open && fn.at < s.close));
    const away = inModel('wentAway');
    const register = inModel('register');
    if (away === undefined) findings.push('AppModel has no wentAway(), so nothing stops a write when the app leaves');
    if (register === undefined) findings.push('AppModel has no register(_:), so a runner made at the press is kept nowhere');
    if (away !== undefined && register !== undefined) {
      const awayBody = bodyText(app, away);
      const kept = /\b([A-Za-z_]\w*)\s*(?:\.\s*(?:append|insert)\s*\(|\[[^\]]+\]\s*=)/.exec(bodyText(app, register))?.[1] ?? null;
      const loopOver = kept === null ? null : new RegExp(`\\bfor\\s+([A-Za-z_]\\w*)\\s+in\\s+(?:self\\s*\\.\\s*)?${kept}(?:\\s*\\.\\s*values)?\\s*\\{`).exec(awayBody);
      const loopBody = loopOver === null ? '' : awayBody.slice(loopOver.index + loopOver[0].length - 1, loopOver.index + loopOver[0].length - 1 + matchForward(awayBody.slice(loopOver.index + loopOver[0].length - 1), 0) + 1);
      const r = loopOver === null ? null : loopOver[1];
      // Each runner is stopped: its stop(), or the two things stop() does,
      // stopRequested set AND its task cancelled (the cancel is what withholds).
      const stops =
        (r !== null && (new RegExp(`\\b${r}\\s*\\.\\s*stop\\s*\\(\\s*\\)`).test(loopBody) ||
          (new RegExp(`\\b${r}\\s*\\.\\s*stopRequested\\s*=\\s*true\\b`).test(loopBody) && new RegExp(`\\b${r}\\s*\\.\\s*task\\s*\\??\\s*\\.\\s*cancel\\s*\\(\\s*\\)`).test(loopBody)))) ||
        (kept !== null && new RegExp(`\\b${kept}(?:\\s*\\.\\s*values)?\\s*\\.\\s*forEach\\s*\\{\\s*\\$0\\s*\\.\\s*stop\\s*\\(\\s*\\)`).test(awayBody));
      if (!stops) findings.push(`AppModel.wentAway does not stop every runner register(_:) keeps${kept === null ? '' : ` in ${kept}`}; a write not yet handed must be withheld when the app leaves`);
    }
  }
  // (ad7) Nothing persists a write or a target.
  for (const name of [END_BAR_FILE, END_BATCH_FILE]) {
    const file = all.find((f) => f.name === name);
    if (file === undefined) {
      findings.push(`${name} does not exist`);
      continue;
    }
    for (const m of file.bare.matchAll(PERSISTS)) findings.push(`${atLine(file, m.index)} names ${m[0].replace(/\s+/g, '')}; nothing persists a write or a target, so nothing can be sent again after a relaunch`);
  }
  const client = all.find((f) => f.name === 'Door/DoorClient.swift') ?? null;
  if (client !== null) {
    const spans = [...['signedPost', 'end'].flatMap((n) => funcsNamed(client, n)), ...client.types.filter((t) => ['WriteId', 'WriteResult', 'EndBody', 'WriteRoute'].includes(t.name)).map((t) => ({ bodyOpen: t.open, bodyClose: t.close }))];
    for (const s of spans) {
      for (const m of client.bare.slice(s.bodyOpen, s.bodyClose + 1).matchAll(PERSISTS)) findings.push(`${atLine(client, s.bodyOpen + m.index)} names ${m[0].replace(/\s+/g, '')} in the write path; nothing persists a write`);
    }
  }
  return { findings, said };
}

// ---- (v), widened: End's line is always a sentence (SPEC §5.8.3, §6.3) -----

/** The classes whose `line` is the one line under End's bars. */
export const END_LINE_TYPES = Object.freeze(['EndModel', 'EndBatchModel']);

/**
 * Rule (v)'s End half, pure over DoorWords.swift's source (or null) and the
 * app's Swift files: `DoorWords.endSentence(for:)` answers a non-optional
 * `String` for every `WriteResult` case, never nil, never an empty string and
 * with no default; and every assignment to `line` in EndModel and
 * EndBatchModel is nil or a Copy or DoorWords sentence, never `""`.
 */
export function ruleEndSentence(words, files) {
  const findings = [];
  const said = { cases: 0, assignments: 0 };
  if (words === null) return { findings: ['Screens/DoorWords.swift does not exist, so what End\'s line says cannot be read'], said };
  const w = lexSwift(words);
  const decl = /\bstatic\s+func\s+endSentence\s*\(\s*for\s+\w+\s*:\s*WriteResult\s*\)\s*->\s*([^{]+)\{/.exec(w.bare);
  if (decl === null) findings.push('Screens/DoorWords.swift declares no endSentence(for: WriteResult)');
  else {
    if (decl[1].trim() !== 'String') findings.push(`Screens/DoorWords.swift's endSentence returns ${decl[1].trim()}; it returns String, so every write result draws a sentence`);
    const body = bodyAfter(w.bare, decl.index);
    const bodyStart = w.bare.indexOf(body, decl.index);
    for (const m of body.matchAll(/\breturn\s+nil\b/g)) findings.push(`Screens/DoorWords.swift:${String(lineOf(w.bare, bodyStart + m.index))} endSentence returns nil`);
    for (const x of w.strings) if (x.start > bodyStart && x.start < bodyStart + body.length && x.value.trim() === '') findings.push(`Screens/DoorWords.swift:${String(lineOf(w.bare, x.start))} endSentence returns an empty string`);
    if (/\bdefault\s*:/.test(body)) findings.push("Screens/DoorWords.swift's endSentence has a default, so a new WriteResult case would draw a line nobody chose");
    const client = files.find((f) => f.name === 'Door/DoorClient.swift');
    const cases = client === undefined ? [] : enumCases(client.source, 'WriteResult') ?? [];
    if (cases.length === 0) findings.push('Door/DoorClient.swift declares no enum WriteResult this rule can read');
    said.cases = cases.length;
    for (const cs of cases) if (!new RegExp(`\\bcase\\s+\\.${cs}\\b`).test(body)) findings.push(`Screens/DoorWords.swift's endSentence draws nothing for .${cs}`);
  }
  for (const f of files) {
    const lx = lexSwift(f.source);
    for (const t of typeSpans(lx.bare).filter((x) => END_LINE_TYPES.includes(x.name) && x.kind === 'class')) {
      const text = lx.bare.slice(t.open, t.close + 1);
      for (const m of text.matchAll(/(?:^|[^\w.?])(?:self\s*\??\s*\.\s*)?line\s*=(?!=)\s*([^\n;]*)/g)) {
        said.assignments += 1;
        const rhs = m[1].trim();
        const at = `${f.name}:${String(lineOf(lx.bare, t.open + m.index + 1))}`;
        const strings = lx.strings.filter((x) => x.start > t.open + m.index && x.start < t.open + m.index + m[0].length);
        if (strings.some((x) => x.value === '') || (rhs !== 'nil' && !/\b(?:Copy|DoorWords)\s*\./.test(rhs))) findings.push(`${at} assigns ${t.name}.line = ${rhs.slice(0, 50)}; its line is nil or a Copy or DoorWords sentence, never empty`);
      }
    }
  }
  return { findings, said };
}

/** Phase 317's write arms (build/p317/SPEC.md §7.5 EH), as (t) requires build/p316/hostile-door.mjs to name them. */
export const HOSTILE_WRITE_ARMS = Object.freeze([
  'write-other-id',
  'write-malformed-empty',
  'write-unknown-outcome',
  'write-cut',
  'write-late',
  'write-404',
  'write-malformed',
  'write-cut-reread-refused',
  'write-unreachable-offer'
]);
/**
 * How a write arm may end: a sentence under End, back to the list, on Pairing
 * (a re-read the door refused, whose own consequence is Pairing: the fix
 * round, after the verify's EH), or drawn with no press possible.
 */
const WRITE_ARM_ENDS = new Set(['sentence', 'back-to-list', 'pairing', 'drawn']);

/** The keys of POCKET_WRITE_SENTENCES in src/shared/ipc/pocket.ts's text, or null when it declares none. */
export function writeSentenceKeys(pocketTs) {
  if (typeof pocketTs !== 'string') return null;
  const at = /\bexport\s+const\s+POCKET_WRITE_SENTENCES\s*=\s*\{/.exec(pocketTs);
  if (at === null) return null;
  const open = at.index + at[0].length - 1;
  const close = pocketTs.indexOf('}', open);
  return [...pocketTs.slice(open + 1, close === -1 ? pocketTs.length : close).matchAll(/(?:^|[\s,{])([A-Za-z_]\w*)\s*:/g)].map((m) => m[1]);
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
      named,
      []
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
  // Phase 317: the write arms, each ending where it names (SPEC §7.5 EH).
  const writeArmLine = (name, rest = "ends: 'sentence', write: true, posts: 1, at: 'session-end-line', expect: ['answerUnreadable'], door: ['unreadable'], never: []") => `  '${name}': { what: 'x', ${rest} },`;
  const hostileOk = `export const HOSTILE_ARMS = Object.freeze({\n${HOSTILE_HTTP_ARMS.map(armLine).join('\n')}\n${HOSTILE_WRITE_ARMS.map((a) => writeArmLine(a)).join('\n')}\n});\n`;
  const copyOk = 'enum Copy {\n    static let answerUnreadable = "Tortie could not read your Mac’s answer."\n}\n';
  const tRun = ({ client = clientOk, pairing = pairingOk, keys = keysOk2, hostile = hostileOk, copy = copyOk, writeSentences = ['busy', 'unreadable'] } = {}) =>
    ruleClientTransport({ client, pairing, keys, files: [{ name: 'Door/DoorClient.swift', source: client }], hostile, copy, writeSentences }).findings;
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
  expect('(s) catches versions that disagree', sRun(pbxSign({ appRelease: his + identity.replace(`CURRENT_PROJECT_VERSION = ${PHONE_BUILD};`, 'CURRENT_PROJECT_VERSION = 6;') })).length > 0);
  const nextBuild = (text) => text.replace(`CURRENT_PROJECT_VERSION = ${PHONE_BUILD};`, 'CURRENT_PROJECT_VERSION = 6;');
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

  // ---- Phase 316.6 (build/p3166/SPEC.md §6): every new clause, proved first --
  // (a), widened: the tab bar's look.
  const tokensLookOk = [
    '@MainActor',
    'enum TabBarLook {',
    '    static func apply() {',
    '        let item = UITabBarItemAppearance()',
    '        for state in [item.normal, item.selected] {',
    '            state.badgeBackgroundColor = Token.statusAttentionBadgeBg.uiColor',
    '            state.badgeTextAttributes = [.foregroundColor: Token.statusAttentionBadgeFg.uiColor]',
    '        }',
    '        let look = UITabBarAppearance()',
    '        look.stackedLayoutAppearance = item',
    '        UITabBar.appearance().standardAppearance = look',
    '    }',
    '}',
    ''
  ].join('\n');
  const appApplies = 'struct TortieApp {\n    init() { TabBarLook.apply() }\n}\n';
  const aLook = (tokens = tokensLookOk, app = appApplies, extra = []) => ruleTabBarLook([{ name: 'Style/Tokens.swift', source: tokens }, { name: 'App/TortieApp.swift', source: app }, ...extra]).findings;
  expect('(a) accepts the badge set from its two tokens in Tokens.swift, applied once from the app', aLook().length === 0);
  expect('(a) catches UITabBar.appearance() in the app file', aLook(tokensLookOk, `${appApplies}func f() { _ = UITabBar.appearance() }\n`).length > 0);
  expect("(a) catches the badge's ground set from statusAttention", aLook(tokensLookOk.replace('Token.statusAttentionBadgeBg.uiColor', 'Token.statusAttention.uiColor')).length > 0);
  expect("(a) catches the badge's words set from another token", aLook(tokensLookOk.replace('Token.statusAttentionBadgeFg.uiColor', 'Token.textPrimary.uiColor')).length > 0);
  expect("(a) catches the badge's words set from two tokens", aLook(tokensLookOk.replace('.foregroundColor: Token.statusAttentionBadgeFg.uiColor]', '.foregroundColor: Token.statusAttentionBadgeFg.uiColor, .backgroundColor: Token.bgSurface.uiColor]')).length > 0);
  expect('(a) catches a badge colour never set', aLook(tokensLookOk.replace(/\n\s*state\.badgeTextAttributes[^\n]*/, '')).length > 0);
  expect('(a) catches the look never applied', aLook(tokensLookOk, 'struct TortieApp {}\n').length > 0);
  expect('(a) catches the look applied from a screen', aLook(tokensLookOk, appApplies, [{ name: 'Screens/ListScreen.swift', source: 'func f() { TabBarLook.apply() }\n' }]).length > 0);
  expect('(a) follows a local binding to the token it names', aLook(tokensLookOk.replace('state.badgeBackgroundColor = Token.statusAttentionBadgeBg.uiColor', 'let ground = Token.statusAttentionBadgeBg.uiColor\n            state.badgeBackgroundColor = ground')).length === 0);
  expect('(a) leaves a comment naming UITabBar alone', aLook(tokensLookOk, `${appApplies}// UITabBar.appearance() is Tokens.swift's\n`).length === 0);

  // (b), widened: the three tabs.
  const tabsOk = [
    'struct RootView: View {',
    '    var body: some View {',
    '        TabView(selection: $app.tab) {',
    '            Tab(Copy.needsInput, systemImage: "bell", value: AppTab.needsInput) { NavigationStack(path: $app.waitingPath) { ListScreen() } }',
    '                .badge(app.waitingBadge)',
    '            Tab(Copy.sessions, systemImage: "list.bullet", value: AppTab.sessions) { NavigationStack(path: $app.sessionsPath) { ListScreen() } }',
    '            Tab(Copy.settings, systemImage: "gearshape", value: AppTab.settings) { NavigationStack { SettingsScreen(app: app) } }',
    '        }',
    '    }',
    '}',
    ''
  ].join('\n');
  const bTabs = (app = tabsOk, extra = []) => ruleTabs([{ name: 'App/TortieApp.swift', source: app }, ...extra]).findings;
  expect('(b) accepts the three tabs in order, with their words and symbols', bTabs().length === 0);
  expect('(b) leaves the tabs to (b)\'s literal half, which reads Tab now', ruleNoVisibleLiteral('F', tabsOk).length === 0 && ruleNoVisibleLiteral('F', 'let t = Tab("Needs input", systemImage: "bell", value: 1) {}\n').length > 0);
  expect('(b) catches a literal tab label', bTabs(tabsOk.replace('Tab(Copy.needsInput,', 'Tab("Needs input",')).length > 0);
  expect('(b) catches a fourth tab', bTabs(tabsOk.replace('        }\n    }\n}', '            Tab(Copy.sessions, systemImage: "magnifyingglass", value: AppTab.sessions) { EmptyView() }\n        }\n    }\n}')).length > 0);
  expect('(b) catches the tabs out of order', bTabs(tabsOk.replace('Tab(Copy.sessions, systemImage: "list.bullet"', 'Tab(Copy.settings, systemImage: "list.bullet"')).length > 0);
  expect('(b) catches another symbol', bTabs(tabsOk.replace('"bell"', '"bell.fill"')).length > 0);
  expect('(b) catches a tab built outside the app file', bTabs(tabsOk, [{ name: 'Screens/ListScreen.swift', source: 'let t = Tab(Copy.sessions, systemImage: "x", value: 1) { EmptyView() }\n' }]).length > 0);
  expect('(b) catches the bar hidden on a pushed screen', bTabs(tabsOk, [{ name: 'Screens/SessionScreen.swift', source: 'func f(_ v: some View) -> some View { v.toolbar(.hidden, for: .tabBar) }\n' }]).length > 0);
  expect('(b) catches the bar hidden by toolbarVisibility', bTabs(tabsOk, [{ name: 'Screens/SessionScreen.swift', source: 'func f(_ v: some View) -> some View { v.toolbarVisibility(.hidden, for: .navigationBar, .tabBar) }\n' }]).length > 0);
  expect('(b) leaves the navigation bar hidden alone', bTabs(tabsOk, [{ name: 'Screens/ListScreen.swift', source: 'func f(_ v: some View) -> some View { v.toolbar(.hidden, for: .navigationBar) }\n' }]).length === 0);
  expect('(b) catches the tab kept in @AppStorage', bTabs(`${tabsOk}struct Kept { @AppStorage("tab") var tab = 0 }\n`).length > 0);
  expect('(b) catches the tab kept in UserDefaults', bTabs(`${tabsOk}func keep() { UserDefaults.standard.set(1, forKey: "tab") }\n`).length > 0);

  // (k), the one named scope.
  const kScope = (renderer, extra = []) => ruleDoorArithmetic([{ name: 'Door/Contract.swift', source: contractOk }, { name: 'Markdown/Blocks.swift', source: renderer }, ...extra], 'Door/Contract.swift', []).findings;
  expect("(k) waives the renderer's own index arithmetic under its one named scope", kScope('func f(_ i: Int) -> Int { i + 1 }\n').length === 0);
  expect('(k) still catches a door field inside the scope', kScope('func f(_ t: (index: Int, x: Int)) -> Int { t.index + 1 }\n').length > 0);
  expect('(k) waives nothing once the renderer names a door type (y9)', kScope('typealias T = PocketTurn\nfunc f(_ i: Int) -> Int { i + 1 }\n').length > 0);
  expect("(k) an operator in a renderer that names a door type needs its own name again", kScope('typealias T = PocketTurn\nfunc f(_ i: Int) -> Int { i + 1 }\n').some((x) => /cannot prove is off the door/.test(x)));
  expect('(k) catches a scope that covers no operator', kScope('let x = 1\n').length > 0);
  expect('(k) still catches an unnamed operator outside the scope', kScope('func f(_ i: Int) -> Int { i + 1 }\n', [{ name: 'Screens/SettingsScreen.swift', source: 'func g(_ a: Int, _ b: Int) -> Int { a + b }\n' }]).length > 0);

  // (n), widened: the deleters and their order.
  const nKeys = [
    'struct KeychainClientKeys: ClientKeyStore {',
    '    func delete(tag: String) {',
    '        SecItemDelete(key as CFDictionary)',
    '        SecItemDelete(certificate as CFDictionary)',
    '    }',
    '}',
    'struct KeychainSecretStore: SecretStore {',
    '    func write(_ data: Data, account: String) throws {',
    '        try remove(account)',
    '    }',
    '    func remove(_ account: String) throws {',
    '        let status = SecItemDelete(query(account) as CFDictionary)',
    '    }',
    '}',
    'final class PairingStore: Sendable {',
    '    func load() -> PairedDoor? {',
    '        if (try? secrets.read(Self.formerAccount)) != nil {',
    '            try? secrets.remove(Self.formerAccount)',
    '        }',
    '        try? forget()',
    '        return nil',
    '    }',
    '    func forget() throws {',
    '        try secrets.remove(Self.account)',
    '        try? secrets.remove(Self.formerAccount)',
    '        for tag in clientKeys.tags() {',
    '            clientKeys.delete(tag: tag)',
    '        }',
    '    }',
    '    var holdsRecord: Bool { true }',
    '    func forgetOnFreshInstall(_ mark: InstallMark) -> Bool {',
    '        do {',
    '            try forget()',
    '        } catch {',
    '            return true',
    '        }',
    '        return true',
    '    }',
    '}',
    ''
  ].join('\n');
  const nFlow = 'final class PairingFlow: Sendable {\n    func run(_ p: P) async -> O {\n        if case .failed = outcome {\n            store.clientKeys.delete(tag: pending.clientKey.tag)\n        }\n        return outcome\n    }\n}\n';
  const nApp = [
    'final class AppModel {',
    '    static func launch() -> AppModel {',
    '        let door = LiveDoor(store: .keychain, transport: t)',
    '        #if DEBUG',
    '        if PairingDebugSeam.forgetRequested() { door.forget() }',
    '        #endif',
    '        return AppModel(door: door)',
    '    }',
    '}',
    'struct LiveDoor: PhoneDoor {',
    '    func forget() {',
    '        try? store.forget()',
    '    }',
    '    func unpair() -> UnpairOutcome {',
    '        do { try store.forget() } catch { return .kept }',
    '        return store.holdsRecord ? .kept : .forgotten',
    '    }',
    '}',
    ''
  ].join('\n');
  const nDel = (edits = {}) =>
    ruleDeleters(
      Object.entries({ 'Door/Keys.swift': nKeys, 'Door/Pairing.swift': nFlow, 'App/TortieApp.swift': nApp, ...edits })
        .filter(([, v]) => v !== null)
        .map(([name, source]) => ({ name, source }))
    ).findings;
  expect('(n) accepts the deleters where they are, the record first, and an unpair that sees its error', nDel().length === 0);
  expect('(n) catches SecItemDelete in a screen', nDel({ 'Screens/ListScreen.swift': 'func f(_ q: CFDictionary) { _ = SecItemDelete(q) }\n' }).length > 0);
  expect('(n) catches SecItemDelete in another function of the store', nDel({ 'Door/Keys.swift': nKeys.replace('    var holdsRecord: Bool { true }', '    func wipe() { SecItemDelete(q as CFDictionary) }\n    var holdsRecord: Bool { true }') }).length > 0);
  expect('(n) catches the record removed outside PairingStore', nDel({ 'App/TortieApp.swift': `${nApp}struct Wiper {\n    func wipe() { try? secrets.remove("pairing-v2") }\n}\n` }).length > 0);
  expect('(n) catches a client key deleted from a screen', nDel({ 'Screens/SettingsScreen.swift': 'func f() { store.clientKeys.delete(tag: t) }\n' }).length > 0);
  expect('(n) catches the keys deleted before the record', nDel({ 'Door/Keys.swift': nKeys.replace('        try secrets.remove(Self.account)\n        try? secrets.remove(Self.formerAccount)\n        for tag in clientKeys.tags() {\n            clientKeys.delete(tag: tag)\n        }\n', '        for tag in clientKeys.tags() {\n            clientKeys.delete(tag: tag)\n        }\n        try secrets.remove(Self.account)\n        try? secrets.remove(Self.formerAccount)\n') }).length > 0);
  expect('(n) catches the record removed with try?', nDel({ 'Door/Keys.swift': nKeys.replace('        try secrets.remove(Self.account)\n', '        try? secrets.remove(Self.account)\n') }).length > 0);
  expect('(n) catches unpair through try? store.forget()', nDel({ 'App/TortieApp.swift': nApp.replace('do { try store.forget() } catch { return .kept }', 'try? store.forget()') }).length > 0);
  expect('(n) catches an unpair that never forgets', nDel({ 'App/TortieApp.swift': nApp.replace('do { try store.forget() } catch { return .kept }', '_ = store') }).length > 0);
  expect('(n) catches an unpair that never asks whether the record is still there', nDel({ 'App/TortieApp.swift': nApp.replace('return store.holdsRecord ? .kept : .forgotten', 'return .forgotten') }).length > 0);
  expect('(n) catches no unpair at all', nDel({ 'App/TortieApp.swift': nApp.replace(/ {4}func unpair\(\)[\s\S]*?\n {4}\}\n/, '') }).length > 0);
  expect('(n) catches door.forget() outside #if DEBUG', nDel({ 'App/TortieApp.swift': nApp.replace('        #if DEBUG\n', '').replace('        #endif\n', '') }).length > 0);
  expect('(n) catches the store forgotten by the app model', nDel({ 'App/TortieApp.swift': nApp.replace('        return AppModel(door: door)', '        try? PairingStore.keychain.forget()\n        return AppModel(door: door)') }).length > 0);
  expect('(n) leaves forgetOnFreshInstall( alone, a different name', nDel({ 'App/TortieApp.swift': nApp.replace('        let door = LiveDoor', '        PairingStore.keychain.forgetOnFreshInstall(mark)\n        let door = LiveDoor') }).length === 0);

  // (x), widened: Unpair's unregister and its one caller.
  const fxSystem = 'final class SystemPushAddressing {\n  func forgetAddress() async {\n    #if DEBUG\n    #else\n    UIApplication.shared.unregisterForRemoteNotifications()\n    #endif\n  }\n}\n';
  const fxApp = [
    'final class AppModel {',
    '    func unpair() {',
    '        guard root == .reading else { return }',
    '        switch door.unpair() {',
    '        case .kept:',
    '            settingsLine = Copy.unpairFailed',
    '        case .forgotten:',
    '            settingsLine = nil',
    '            forgetting = Task { await alerts.forgetAddress() }',
    '            lostPairing()',
    '        }',
    '    }',
    '}',
    ''
  ].join('\n');
  const xFa = (edits = {}, tests = []) =>
    ruleForgetAddress(
      Object.entries({ 'Alerts/SystemAlerts.swift': fxSystem, 'App/TortieApp.swift': fxApp, 'Alerts/Alerts.swift': 'protocol PushAddressing {\n    func forgetAddress() async\n}\n', ...edits }).map(([name, source]) => ({ name, source })),
      tests
    ).findings;
  expect('(x) accepts one unregister in the #else and one forgetAddress() in the .forgotten arm', xFa().length === 0);
  expect('(x) catches the unregister outside the #else', xFa({ 'Alerts/SystemAlerts.swift': fxSystem.replace('    #if DEBUG\n    #else\n', '').replace('    #endif\n', '') }).length > 0);
  expect('(x) catches the unregister in the #if DEBUG arm', xFa({ 'Alerts/SystemAlerts.swift': fxSystem.replace('    #if DEBUG\n    #else\n    UIApplication', '    #if DEBUG\n    UIApplication').replace('    #endif', '    #else\n    #endif') }).length > 0);
  expect('(x) catches a second unregister', xFa({ 'App/TortieApp.swift': `${fxApp}func again() { UIApplication.shared.unregisterForRemoteNotifications() }\n` }).length > 0);
  expect('(x) catches forgetAddress() before door.unpair()', xFa({ 'App/TortieApp.swift': fxApp.replace('            forgetting = Task { await alerts.forgetAddress() }\n', '').replace('        switch door.unpair() {', '        forgetting = Task { await alerts.forgetAddress() }\n        switch door.unpair() {') }).length > 0);
  expect('(x) catches forgetAddress() in the .kept arm', xFa({ 'App/TortieApp.swift': fxApp.replace('            forgetting = Task { await alerts.forgetAddress() }\n', '').replace('            settingsLine = Copy.unpairFailed\n', '            settingsLine = Copy.unpairFailed\n            forgetting = Task { await alerts.forgetAddress() }\n') }).length > 0);
  expect('(x) catches forgetAddress() in a .forgotten arm that comes before door.unpair()', xFa({ 'App/TortieApp.swift': fxApp.replace('        switch door.unpair() {\n        case .kept:\n            settingsLine = Copy.unpairFailed\n        case .forgotten:\n            settingsLine = nil\n            forgetting = Task { await alerts.forgetAddress() }\n            lostPairing()\n        }\n', '        switch outcome {\n        case .kept:\n            break\n        case .forgotten:\n            forgetting = Task { await alerts.forgetAddress() }\n        }\n        _ = door.unpair()\n') }).length > 0);
  expect('(x) catches forgetAddress() called twice', xFa({ 'App/TortieApp.swift': fxApp.replace('            lostPairing()\n', '            lostPairing()\n            forgetting = Task { await alerts.forgetAddress() }\n') }).length > 0);
  expect('(x) catches a test naming the unregister', xFa({}, [{ name: 'TortieTests/T.swift', source: 'func f() { UIApplication.shared.unregisterForRemoteNotifications() }\n' }]).length > 0);
  expect('(x) leaves registerForRemoteNotifications to its own clause', xFa({ 'Alerts/SystemAlerts.swift': `${fxSystem}// registerForRemoteNotifications\n` }).length === 0);

  // (y) and (z): a whole renderer that keeps every bound.
  const capsOk = ['import Foundation', 'enum MarkdownCaps {', ...Object.entries(MARKDOWN_CAPS).map(([n, c]) => `    static let ${n} = ${String(c.value)}`), '}', ''].join('\n');
  const blocksOk = [
    'import Foundation',
    'enum MarkdownBlocks {',
    '    static func parse(_ answer: String) -> MarkdownDocument {',
    '        let cut = answer.utf8.count > MarkdownCaps.answerBytes',
    '        return MarkdownDocument(blocks: blocks(lines(answer), depth: 0), cut: cut)',
    '    }',
    '    static func blocks(_ lines: [Substring], depth: Int) -> [MarkdownBlock] {',
    '        var out: [MarkdownBlock] = []',
    '        if depth < MarkdownCaps.depth, out.count < MarkdownCaps.blocks {',
    '            out.append(.quote(blocks(lines, depth: depth + 1)))',
    '        }',
    '        let caps = [MarkdownCaps.tableRows, MarkdownCaps.tableColumns, MarkdownCaps.cellCharacters, MarkdownCaps.cells, MarkdownCaps.fenceLines, MarkdownCaps.lineCharacters, MarkdownCaps.listNumberDigits]',
    '        _ = caps',
    '        return out',
    '    }',
    '    static func lines(_ s: String) -> [Substring] { s.split(separator: "x") }',
    '    static func item(_ bytes: [UInt8], marker: ListMarker) -> MarkdownItem {',
    '        let number = String(decoding: bytes[0..<1], as: UTF8.self)',
    '        _ = number',
    '        return MarkdownItem(task: nil, bullet: marker.written, number: marker.number, blocks: [])',
    '    }',
    '}',
    ''
  ].join('\n');
  const inlineOk = [
    'import Foundation',
    'enum Inline {',
    '    typealias LinkKey = AttributeScopes.FoundationAttributes.LinkAttribute',
    '    typealias ImageKey = AttributeScopes.FoundationAttributes.ImageURLAttribute',
    '    private static func parsed(_ source: String) -> AttributedString? {',
    '        let options = AttributedString.MarkdownParsingOptions(allowsExtendedAttributes: false, interpretedSyntax: .inlineOnlyPreservingWhitespace, failurePolicy: .returnPartiallyParsedIfPossible)',
    '        return try? AttributedString(markdown: source, options: options)',
    '    }',
    '    static func render(_ source: String) -> InlineText {',
    '        guard source.utf8.count <= MarkdownCaps.inlineBytes else { return InlineText(segments: [.text(AttributedString(source))]) }',
    '        guard let drawn = parsed(source) else { return InlineText(segments: [.text(AttributedString(source))]) }',
    '        return InlineText(segments: [.text(drawn)])',
    '    }',
    '    static func asWritten(_ answer: String) -> AttributedString {',
    '        guard var drawn = parsed(answer) else { return AttributedString(answer) }',
    '        let opened = drawn.runs.map { $0.range }',
    '        for range in opened {',
    '            drawn[range][LinkKey.self] = nil',
    '            drawn[range][ImageKey.self] = nil',
    '        }',
    '        return drawn',
    '    }',
    '}',
    ''
  ].join('\n');
  const renderedOk = [
    'import Foundation',
    'struct RenderedAnswer: Equatable, Sendable {',
    '    let blocks: [RenderedBlock]',
    '    let cut: Bool',
    '    let written: AttributedString?',
    '    init(_ answer: String) {',
    '        let document = MarkdownBlocks.parse(answer)',
    '        if Self.pieces(document.blocks, depth: 0) > MarkdownCaps.pieces {',
    '            self.init(blocks: [], cut: document.cut, written: Inline.asWritten(answer))',
    '        } else {',
    '            self.init(blocks: Self.drawn(document.blocks), cut: document.cut, written: nil)',
    '        }',
    '    }',
    '    init(blocks: [RenderedBlock], cut: Bool, written: AttributedString?) {',
    '        self.blocks = blocks',
    '        self.cut = cut',
    '        self.written = written',
    '    }',
    '    static func drawn(_ blocks: [MarkdownBlock]) -> [RenderedBlock] { blocks.map { _ in RenderedBlock() } }',
    '    static func item(_ item: MarkdownItem) -> RenderedItem { RenderedItem(n: 0, number: item.number, blocks: []) }',
    '    static func pieces(_ blocks: [MarkdownBlock], depth: Int) -> Int {',
    '        var count = 0',
    '        for block in blocks {',
    '            count += 1',
    '            switch block {',
    '            case .list(_, _, let items):',
    '                for item in items { count += containerPieces + pieces(item.blocks, depth: depth + 1) }',
    '            case .quote(let inner): count += containerPieces - 1',
    '                count += pieces(inner, depth: depth + 1)',
    '            case .table(let table): count += scrollPieces - 1',
    '                count += table.header.count + table.rows.count',
    '            case .code: count += scrollPieces - 1',
    '            default: break',
    '            }',
    '        }',
    '        return count',
    '    }',
    '}',
    'struct RenderedItem: Equatable, Sendable {',
    '    let n: Int',
    '    let number: String?',
    '    let blocks: [RenderedBlock]',
    '}',
    ''
  ].join('\n');
  const linksOk = [
    'import Foundation',
    'import SwiftUI',
    'import UIKit',
    'enum LinkPolicy {',
    '    static func opens(_ url: URL) -> Bool {',
    '        guard url.scheme == "https", url.user == nil, url.password == nil, url.port == nil else { return false }',
    '        guard let host = url.host, !host.hasPrefix("xn--") else { return false }',
    '        return url.absoluteString.utf8.count <= MarkdownCaps.linkBytes',
    '    }',
    '}',
    'struct LinkGate: ViewModifier {',
    '    @State private var staged: URL?',
    '    func body(content: Content) -> some View {',
    '        content',
    '            .environment(\\.openURL, OpenURLAction { url in',
    '                guard LinkPolicy.opens(url) else { return .discarded }',
    '                staged = url',
    '                return .handled',
    '            })',
    '            .alert(Text(verbatim: staged?.absoluteString ?? ""), isPresented: shown) {',
    '                Button(Copy.cancel, role: .cancel) {}',
    '                Button(Copy.open) {',
    '                    if let url = staged, LinkPolicy.opens(url) { UIApplication.shared.open(url) }',
    '                }',
    '            }',
    '    }',
    '}',
    ''
  ].join('\n');
  const viewOk = [
    'import SwiftUI',
    'struct MarkdownView: View {',
    '    let answer: RenderedAnswer',
    '    let scope: String',
    '    var body: some View {',
    '        if let written = answer.written { WrittenView(attributed: written) } else { BlockView(block: answer.blocks[0], depth: 0) }',
    '    }',
    '}',
    'struct WrittenView: View {',
    '    let attributed: AttributedString',
    '    var body: some View {',
    '        Text(attributed)',
    '            .font(Face.body.font)',
    '            .foregroundStyle(Tokens.textPrimary)',
    '            .lineSpacing(Face.body.spacing)',
    '            .fixedSize(horizontal: false, vertical: true)',
    '            .frame(maxWidth: .infinity, alignment: .leading)',
    '    }',
    '}',
    'struct ItemMark: View {',
    '    let item: RenderedItem',
    '    var body: some View {',
    '        if let number = item.number { Text(verbatim: Copy.orderedMark(number)) } else { Text(verbatim: item.bullet) }',
    '    }',
    '}',
    'struct BlockView: View {',
    '    let block: RenderedBlock',
    '    let depth: Int',
    '    var body: some View {',
    '        switch block {',
    '        case .quote(let inner):',
    '            ForEach(inner) { b in BlockView(block: b, depth: depth + 1) }',
    '        case .paragraph(let text):',
    '            line(text)',
    '        default:',
    '            Text(verbatim: "")',
    '        }',
    '    }',
    '    func line(_ text: InlineText) -> Text {',
    '        text.segments.reduce(Text(verbatim: "")) { sum, segment in',
    '            switch segment {',
    '            case .text(let run): return sum + Text(run)',
    '            case .image(let alt): return sum + Text(Image(systemName: "photo")) + Text(verbatim: alt)',
    '            }',
    '        }',
    '    }',
    '}',
    ''
  ].join('\n');
  const settingsOk = 'struct SettingsScreen: View {\n    var body: some View {\n        Button(Copy.notifications) {\n            if let url = URL(string: UIApplication.openNotificationSettingsURLString) { UIApplication.shared.open(url) }\n        }\n    }\n}\n';
  const yFiles = (edits = {}) =>
    Object.entries({
      'Markdown/Caps.swift': capsOk,
      'Markdown/Blocks.swift': blocksOk,
      'Markdown/Inline.swift': inlineOk,
      'Markdown/Rendered.swift': renderedOk,
      'Markdown/Links.swift': linksOk,
      'Screens/MarkdownView.swift': viewOk,
      'Screens/SettingsScreen.swift': settingsOk,
      'App/DebugLaunch.swift': '#if DEBUG\nlet d = try? Data(contentsOf: f)\n#endif\n',
      ...edits
    })
      .filter(([, v]) => v !== null)
      .map(([name, source]) => ({ name, source }));
  const yRun = (edits) => ruleRenderer(yFiles(edits)).findings;
  const zRun = (edits) => ruleOneWayOut(yFiles(edits)).findings;
  const yKept = yRun();
  expect(`(y) accepts a renderer that keeps every bound${yKept.length > 0 ? `: ${yKept[0]}` : ''}`, yKept.length === 0);
  const zKept = zRun();
  expect(`(z) accepts one way out, asked twice, and Settings opening iOS's own settings${zKept.length > 0 ? `: ${zKept[0]}` : ''}`, zKept.length === 0);
  expect('(y) catches a renderer file gone', yRun({ 'Markdown/Rendered.swift': null }).length > 0);
  expect('(y1) catches SwiftUI imported by the parser', yRun({ 'Markdown/Blocks.swift': `import SwiftUI\n${blocksOk}` }).length > 0);
  expect('(y1) catches a scoped import into the parser', yRun({ 'Markdown/Inline.swift': `import struct SwiftUI.Text\n${inlineOk}` }).length > 0);
  expect('(y1) catches WebKit imported by Links.swift', yRun({ 'Markdown/Links.swift': `import WebKit\n${linksOk}` }).length > 0);
  expect('(y2) catches a cap read twice', yRun({ 'Markdown/Blocks.swift': `${blocksOk}let again = MarkdownCaps.blocks\n` }).length > 0);
  expect('(y2) catches a cap read in another file', yRun({ 'Markdown/Inline.swift': inlineOk.replace('MarkdownCaps.inlineBytes', '8_192'), 'Markdown/Blocks.swift': `${blocksOk}let inline = MarkdownCaps.inlineBytes\n` }).length > 0);
  expect('(y2) catches a cap at another value', yRun({ 'Markdown/Caps.swift': capsOk.replace('static let answerBytes = 32768', 'static let answerBytes = 65536') }).length > 0);
  expect('(y2) catches markdown switched back on: MarkdownCaps.pieces put back to the ruled round\'s 26', yRun({ 'Markdown/Caps.swift': capsOk.replace(`static let pieces = ${String(MARKDOWN_CAPS.pieces.value)}`, 'static let pieces = 26') }).some((f) => f.includes('markdown is off')));
  expect('(y2) catches a thirteenth member', yRun({ 'Markdown/Caps.swift': capsOk.replace(/\}\n$/, '    static var extra = 1\n}\n') }).length > 0);
  expect('(y2) catches a second enum MarkdownCaps', yRun({ 'Markdown/Rendered.swift': `${renderedOk}enum MarkdownCaps {}\n` }).length > 0);
  expect('(y2) catches a cap never read', yRun({ 'Markdown/Links.swift': linksOk.replace('MarkdownCaps.linkBytes', '2_048') }).length > 0);
  expect('(y2) catches the caps taken as a value', yRun({ 'Markdown/Blocks.swift': `${blocksOk}let all = MarkdownCaps.self\n` }).length > 0);
  expect('(y3) catches a force unwrap', yRun({ 'Markdown/Blocks.swift': `${blocksOk}let forced = Int("1")!\n` }).length > 0);
  expect('(y3) catches try!', yRun({ 'Markdown/Blocks.swift': `${blocksOk}let tried = try! f()\n` }).length > 0);
  expect('(y3) catches as!', yRun({ 'Markdown/Blocks.swift': `${blocksOk}let cast = x as! Int\n` }).length > 0);
  expect('(y3) catches a throwing function', yRun({ 'Markdown/Rendered.swift': `${renderedOk}func g() throws {}\n` }).length > 0);
  expect('(y3) catches fatalError', yRun({ 'Screens/MarkdownView.swift': `${viewOk}func h() -> Int { fatalError("x") }\n` }).length > 0);
  expect('(y3) catches an unsafe name', yRun({ 'Markdown/Inline.swift': `${inlineOk}func u(_ d: Data) { d.withUnsafeBytes { _ in } }\n` }).length > 0);
  expect('(y3) leaves a != and a prefix ! alone', yRun({ 'Markdown/Blocks.swift': `${blocksOk}let fine = 1 != 2 && !false\n` }).length === 0);
  expect('(y4) catches a Regex', yRun({ 'Markdown/Blocks.swift': `${blocksOk}let r = try? Regex("a")\n` }).length > 0);
  expect('(y4) catches NSRegularExpression', yRun({ 'Markdown/Blocks.swift': `${blocksOk}let r = try? NSRegularExpression(pattern: "a")\n` }).length > 0);
  expect('(y4) catches a regex literal', yRun({ 'Markdown/Blocks.swift': `${blocksOk}let r = #/a+/#\n` }).length > 0);
  expect('(y4) catches a range of a pattern', yRun({ 'Markdown/Inline.swift': `${inlineOk}func m(_ s: String) -> Bool { s.range(of: "a", options: .regularExpression) == nil }\n` }).length > 0);
  expect('(y5) catches a recursion passing depth: depth', yRun({ 'Markdown/Blocks.swift': blocksOk.replace('depth: depth + 1', 'depth: depth') }).length > 0);
  expect('(y5) catches a recursion that takes no depth', yRun({ 'Markdown/Rendered.swift': `${renderedOk}func walk(_ n: Int) -> Int { walk(n) }\n` }).length > 0);
  expect('(y5) catches a mutual recursion without depth', yRun({ 'Markdown/Rendered.swift': `${renderedOk}func a(_ n: Int) -> Int { b(n) }\nfunc b(_ n: Int) -> Int { a(n) }\n` }).length > 0);
  expect('(y5) catches a mutual recursion with depth', yRun({ 'Markdown/Rendered.swift': `${renderedOk}func a(_ n: Int, depth: Int) -> Int { b(n, depth: depth + 1) }\nfunc b(_ n: Int, depth: Int) -> Int { a(n, depth: depth + 1) }\n` }).length === 0);
  expect('(y5) catches the depth never compared with its cap', yRun({ 'Markdown/Blocks.swift': blocksOk.replace('if depth < MarkdownCaps.depth,', 'if MarkdownCaps.depth > 0,') }).length > 0);
  expect('(y5) catches a view that builds itself without depth + 1', yRun({ 'Screens/MarkdownView.swift': viewOk.replace('BlockView(block: b, depth: depth + 1)', 'BlockView(block: b, depth: depth)') }).length > 0);
  expect('(y5) catches a view that builds itself and holds no depth', yRun({ 'Screens/MarkdownView.swift': viewOk.replace('    let depth: Int\n', '').replace('BlockView(block: answer.blocks[0], depth: 0)', 'BlockView(block: answer.blocks[0])').replace('BlockView(block: b, depth: depth + 1)', 'BlockView(block: b)') }).length > 0);
  expect('(y5) leaves another file\'s member call by the same name alone', yRun({ 'Markdown/Rendered.swift': `${renderedOk}func render(_ s: String) -> Int { s.render() }\n` }).length === 0);
  expect('(y6) catches a second parse', yRun({ 'Screens/AnswerText.swift': 'let parsed = try? AttributedString(markdown: "x")\n' }).length > 0);
  expect('(y6) catches the full syntax', yRun({ 'Markdown/Inline.swift': inlineOk.replace('.inlineOnlyPreservingWhitespace', '.full') }).length > 0);
  expect('(y6) catches the whitespace dropped', yRun({ 'Markdown/Inline.swift': inlineOk.replace('.inlineOnlyPreservingWhitespace', '.inlineOnly') }).length > 0);
  expect('(y6) catches extended attributes on', yRun({ 'Markdown/Inline.swift': inlineOk.replace('allowsExtendedAttributes: false', 'allowsExtendedAttributes: true') }).length > 0);
  expect('(y6) catches a fourth option', yRun({ 'Markdown/Inline.swift': inlineOk.replace('failurePolicy: .returnPartiallyParsedIfPossible)', 'failurePolicy: .returnPartiallyParsedIfPossible, languageCode: nil)') }).length > 0);
  expect('(y6) catches an option changed after it is made', yRun({ 'Markdown/Inline.swift': `${inlineOk}func o(_ x: inout AttributedString.MarkdownParsingOptions) { x.allowsExtendedAttributes = true }\n` }).length > 0);
  expect('(y6) catches options made in another file', yRun({ 'Screens/SessionScreen.swift': 'let o = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)\n' }).length > 0);
  expect('(y7) catches a localized key anywhere', yRun({ 'Screens/ListScreen.swift': 'let t = Text(LocalizedStringKey(x))\n' }).length > 0);
  expect('(y7) catches String(format:)', yRun({ 'Style/Copy.swift': 'let s = String(format: "%d", n)\n' }).length > 0);
  expect('(y7) catches Text(.init(', yRun({ 'Screens/MarkdownView.swift': `${viewOk}func k(_ s: String) -> Text { Text(.init(s)) }\n` }).length > 0);
  expect('(y8) catches Text of a plain String', yRun({ 'Screens/MarkdownView.swift': `${viewOk}func cell(_ c: InlineText) -> Text { Text(c.plain) }\n` }).length > 0);
  expect('(y8) accepts Text of a typed AttributedString', yRun({ 'Screens/MarkdownView.swift': `${viewOk}func run(_ a: AttributedString) -> Text { Text(a) }\n` }).length === 0);
  expect('(y9) catches a door type in the renderer', yRun({ 'Markdown/Rendered.swift': `${renderedOk}typealias T = PocketTurn\n` }).length > 0);
  expect('(y9) catches a decoder in the renderer', yRun({ 'Markdown/Blocks.swift': `${blocksOk}let decoder = JSONDecoder()\n` }).length > 0);
  expect('(y9) leaves a door type outside the renderer alone', yRun({ 'Screens/SessionScreen.swift': 'let t: PocketTurn? = nil\n' }).length === 0);
  expect('(y10) catches a counted number', yRun({ 'Markdown/Rendered.swift': renderedOk.replace('number: item.number', 'number: String(start + offset)') }).length > 0);
  expect('(y10) catches the number kept as an Int', yRun({ 'Markdown/Rendered.swift': renderedOk.replace('    let number: String?', '    let number: Int?') }).length > 0);
  expect('(y10) catches no RenderedItem made', yRun({ 'Markdown/Rendered.swift': renderedOk.replace('RenderedItem(n: 0, number: item.number, blocks: [])', 'nil') }).length > 0);
  expect('(y11) catches the digits parsed into an Int and written back', yRun({ 'Markdown/Blocks.swift': blocksOk.replace('let number = String(decoding: bytes[0..<1], as: UTF8.self)', 'let number = String(start)') }).length > 0);
  expect('(y11) catches an item made with a counted number', yRun({ 'Markdown/Blocks.swift': blocksOk.replace('number: marker.number,', 'number: String(index + 1),') }).length > 0);
  expect('(y12) catches a mark drawn from a count', yRun({ 'Screens/MarkdownView.swift': viewOk.replace('Copy.orderedMark(number)', 'Copy.orderedMark(String(item.n))') }).length > 0);
  expect('(y12) catches no ordered mark drawn', yRun({ 'Screens/MarkdownView.swift': viewOk.replace('Copy.orderedMark(number)', 'number') }).length > 0);
  expect('(y13) catches the cap loosened', yRun({ 'Markdown/Rendered.swift': renderedOk.replace('> MarkdownCaps.pieces {', '> MarkdownCaps.pieces * 4 {') }).length > 0);
  expect('(y13) catches the cap asked of something else', yRun({ 'Markdown/Rendered.swift': renderedOk.replace('if Self.pieces(document.blocks, depth: 0) > MarkdownCaps.pieces {', 'if document.blocks.count > MarkdownCaps.pieces {') }).length > 0);
  expect('(y13) catches an answer as written that also keeps its blocks', yRun({ 'Markdown/Rendered.swift': renderedOk.replace('self.init(blocks: [], cut: document.cut, written: Inline.asWritten(answer))', 'self.init(blocks: Self.drawn(document.blocks), cut: document.cut, written: Inline.asWritten(answer))') }).length > 0);
  expect('(y13) catches blocks that also carry a written answer', yRun({ 'Markdown/Rendered.swift': renderedOk.replace('cut: document.cut, written: nil)', 'cut: document.cut, written: AttributedString(answer))') }).length > 0);
  expect('(y14) catches the cells not counted', yRun({ 'Markdown/Rendered.swift': renderedOk.replace('count += table.header.count + table.rows.count', 'count += 0') }).length > 0);
  expect('(y14) catches a code block counted as one piece', yRun({ 'Markdown/Rendered.swift': renderedOk.replace("case .code: count += scrollPieces - 1", 'case .code: break') }).length > 0);
  expect('(y14) catches the items not counted', yRun({ 'Markdown/Rendered.swift': renderedOk.replace('for item in items { count += containerPieces + pieces(item.blocks, depth: depth + 1) }', '_ = items') }).length > 0);
  expect('(y14) catches an item counted as one piece', yRun({ 'Markdown/Rendered.swift': renderedOk.replace('for item in items { count += containerPieces + pieces(item.blocks, depth: depth + 1) }', 'for item in items { count += 1 + pieces(item.blocks, depth: depth + 1) }') }).length > 0);
  expect('(y14) catches a quote counted as one piece', yRun({ 'Markdown/Rendered.swift': renderedOk.replace('case .quote(let inner): count += containerPieces - 1', 'case .quote(let inner): count += 0') }).length > 0);
  expect('(y15) catches a link kept as written', yRun({ 'Markdown/Inline.swift': inlineOk.replace('            drawn[range][LinkKey.self] = nil\n', '') }).length > 0);
  expect('(y15) catches an image address kept as written', yRun({ 'Markdown/Inline.swift': inlineOk.replace('            drawn[range][ImageKey.self] = nil\n', '') }).length > 0);
  expect('(y15) catches a key aliased to another attribute', yRun({ 'Markdown/Inline.swift': inlineOk.replace('typealias LinkKey = AttributeScopes.FoundationAttributes.LinkAttribute', 'typealias LinkKey = AttributeScopes.FoundationAttributes.InlinePresentationIntentAttribute') }).length > 0);
  expect('(y15) catches as written parsed outside the one parse', yRun({ 'Markdown/Inline.swift': inlineOk.replace('guard var drawn = parsed(answer) else', 'guard var drawn = Optional(AttributedString(answer)) else') }).length > 0);
  expect('(y16) catches the as-written text not fixed vertically', yRun({ 'Screens/MarkdownView.swift': viewOk.replace("    '            .fixedSize(horizontal: false, vertical: true)',\n", '').replace('            .fixedSize(horizontal: false, vertical: true)\n', '') }).length > 0);
  expect('(y16) catches the as-written text in another face', yRun({ 'Screens/MarkdownView.swift': viewOk.replace('.font(Face.body.font)', '.font(Face.small.font)') }).length > 0);
  expect('(y16) catches answer.written never drawn', yRun({ 'Screens/MarkdownView.swift': viewOk.replace('if let written = answer.written { WrittenView(attributed: written) } else { BlockView(block: answer.blocks[0], depth: 0) }', 'BlockView(block: answer.blocks[0], depth: 0)') }).length > 0);
  expect('(z1) catches AsyncImage', zRun({ 'Screens/MarkdownView.swift': `${viewOk}func image(_ u: URL) -> some View { AsyncImage(url: u) }\n` }).length > 0);
  expect('(z1) catches an HTML import', zRun({ 'Screens/X.swift': 'let s = try? NSAttributedString(data: d, options: [.documentType: NSAttributedString.DocumentType.html], documentAttributes: nil)\n' }).length > 0);
  expect('(z1) catches contentsOf: outside DEBUG', zRun({ 'Screens/X.swift': 'let d = try? Data(contentsOf: u)\n' }).length > 0);
  expect('(z1) leaves append(contentsOf:) alone', zRun({ 'Screens/X.swift': 'func f() { var a: [Int] = []; a.append(contentsOf: [1]) }\n' }).length === 0);
  expect('(z2) catches SFSafariViewController', zRun({ 'Markdown/Links.swift': `${linksOk}func s(_ u: URL) -> Any { SFSafariViewController(url: u) }\n` }).length > 0);
  expect('(z2) catches a SwiftUI Link', zRun({ 'Screens/MarkdownView.swift': `${viewOk}func l(_ u: URL) -> some View { Link(Copy.open, destination: u) }\n` }).length > 0);
  expect('(z2) catches canOpenURL', zRun({ 'Markdown/Links.swift': `${linksOk}func c(_ u: URL) -> Bool { UIApplication.shared.canOpenURL(u) }\n` }).length > 0);
  expect('(z2) leaves NavigationLink and ShareLink to their own rules', zRun({ 'Screens/X.swift': 'let n = NavigationLink(value: r) { EmptyView() }\n' }).length === 0);
  expect('(z3) catches openURL in Settings', zRun({ 'Screens/SettingsScreen.swift': `${settingsOk}struct P: View {\n    @Environment(\\.openURL) private var open\n    var body: some View { EmptyView() }\n}\n` }).length > 0);
  expect('(z3) catches UIApplication.shared.open in a screen', zRun({ 'Screens/ConversationScreen.swift': 'func o(_ u: URL) { UIApplication.shared.open(u) }\n' }).length > 0);
  expect('(z3) catches a second OpenURLAction', zRun({ 'Markdown/Links.swift': `${linksOk}let again = OpenURLAction { _ in .discarded }\n` }).length > 0);
  expect('(z4) catches the Open press without its second ask', zRun({ 'Markdown/Links.swift': linksOk.replace('if let url = staged, LinkPolicy.opens(url) {', 'if let url = staged {') }).length > 0);
  expect('(z4) catches the action staging before it asks', zRun({ 'Markdown/Links.swift': linksOk.replace('                guard LinkPolicy.opens(url) else { return .discarded }\n                staged = url\n', '                staged = url\n                guard LinkPolicy.opens(url) else { return .discarded }\n') }).length > 0);
  expect('(z4) catches an action that never discards', zRun({ 'Markdown/Links.swift': linksOk.replace('return .discarded', 'return .systemAction') }).length > 0);
  expect('(z5) catches Settings opening another address', zRun({ 'Screens/SettingsScreen.swift': `${settingsOk}func other() { UIApplication.shared.open(URL(fileURLWithPath: "/")) }\n` }).length > 0);
  for (const [what, from, to] of [
    ['the scheme clause', 'url.scheme == "https", ', ''],
    ['the user clause', ', url.user == nil', ''],
    ['the password clause', ', url.password == nil', ''],
    ['the port clause', ', url.port == nil', ''],
    ['the IDN clause', ', !host.hasPrefix("xn--")', ''],
    ['the length clause', 'url.absoluteString.utf8.count <= MarkdownCaps.linkBytes', 'true']
  ]) {
    if (!linksOk.includes(from)) selfFailures.push(`(z6) fixture: Links.swift holds no ${JSON.stringify(from)}`);
    expect(`(z6) catches ${what} removed from LinkPolicy.opens`, zRun({ 'Markdown/Links.swift': linksOk.replace(from, to) }).length > 0);
  }
  const helped = linksOk.replace('enum LinkPolicy {\n', 'enum LinkPolicy {\n    private static func plain(_ h: String) -> Bool { !h.hasPrefix("xn--") }\n');
  expect('(z6) follows a LinkPolicy helper that opens calls', zRun({ 'Markdown/Links.swift': helped.replace(', !host.hasPrefix("xn--")', ', plain(host)') }).length === 0);
  expect('(z6) follows a LinkPolicy helper handed as a predicate', zRun({ 'Markdown/Links.swift': helped.replace('guard let host = url.host, !host.hasPrefix("xn--")', 'guard let host = url.host, [host].allSatisfy(plain)') }).length === 0);
  expect('(z6) does not take a helper opens never reaches', zRun({ 'Markdown/Links.swift': helped.replace(', !host.hasPrefix("xn--")', '') }).length > 0);

  // ---- Phase 317: (ab), (ac), (ad), and (t) and (v) widened ---------------
  // One small app in the shape SPEC §5.8 names, every clause green on it, and
  // one edit per clause that must turn its rule red.
  const W_CLIENT = [
    'final class DoorClient {',
    '    func end(_ sessionId: String, batch: Bool, door: PairedDoor) async -> WriteResult {',
    '        await signedPost(route: .end(session: sessionId, batch: batch), door: door, limits: limits)',
    '    }',
    '    func present(_ p: Data, door: DoorEndpoint) async throws -> DoorReply {',
    '        try await exchange(method: "POST", target: "/pair", headers: [], body: p, door: door, identity: nil)',
    '    }',
    '    private func signedPost(route: WriteRoute, door: PairedDoor, limits: DoorLimits) async -> WriteResult {',
    '        guard let id = WriteId.fresh() else { return .notSent(.notPaired) }',
    '        let body: Data',
    '        do {',
    '            let encoder = JSONEncoder()',
    '            encoder.outputFormatting = [.sortedKeys]',
    '            switch route {',
    '            case .end(let session, let batch):',
    '                body = try encoder.encode(EndBody(batch: batch, session: session, write: id))',
    '            }',
    '        } catch {',
    '            return .notSent(.notPaired)',
    '        }',
    '        let ended = await connect(method: "POST", target: route.target, body: body, door: door.endpoint, identity: door.identity, write: true)',
    '        return WriteResult.of(ended, verb: route.verb, sent: id)',
    '    }',
    '}',
    'struct EndBody: Encodable {',
    '    let batch: Bool',
    '    let session: String',
    '    let write: String',
    '}',
    'enum WriteId {',
    '    static let byteCount = 16',
    '    static func fresh() -> String? {',
    '        var bytes = [UInt8](repeating: 0, count: byteCount)',
    '        guard SecRandomCopyBytes(kSecRandomDefault, byteCount, &bytes) == errSecSuccess else { return nil }',
    '        return Hex.encode(bytes)',
    '    }',
    '}',
    'enum WriteResult: Equatable {',
    '    case answered(PocketWriteAnswer)',
    '    case notTaken',
    '    case noAnswer',
    '    case notSent(DoorFailure)',
    '    static func of(_ end: ExchangeEnd, verb: PocketWriteAnswer.Verb, sent: String) -> WriteResult {',
    '        switch end.result {',
    '        case .failure(let error):',
    '            guard end.handed else { return .notSent(error as? DoorFailure ?? .notPaired) }',
    '            return .noAnswer',
    '        case .success(let reply):',
    '            guard let answer = try? JSONDecoder().decode(PocketWriteAnswer.self, from: reply.body),',
    '                  answer.write == sent || answer.echoesNoId else { return .noAnswer }',
    '            return .answered(answer)',
    '        }',
    '    }',
    '}',
    'extension PocketWriteAnswer {',
    '    var echoesNoId: Bool {',
    '        write.isEmpty && outcome == .refused && reason == .malformed',
    '    }',
    '}',
    'private final class DoorExchange {',
    '    private var handed = false',
    '    private var withheld = false',
    '    private func cancelled() {',
    '        if write {',
    '            guard !handed else { return }',
    '            withheld = true',
    '        }',
    '        finish(.failure(DoorFailure.cancelled))',
    '    }',
    '    private func send() {',
    '        guard !withheld, result == nil else { return }',
    '        handed = true',
    '        connection.send(content: request, completion: .contentProcessed { _ in })',
    '    }',
    '}',
    ''
  ].join('\n');
  const W_BAR = [
    'protocol EndRunnerRegistry: AnyObject {',
    '    func register(_ runner: EndRunner)',
    '}',
    'final class EndRunner {',
    '    let targets: [String]',
    '    let batch: Bool',
    '    private let writer: any DoorWriting',
    '    var stopRequested = false',
    '    var task: Task<Void, Never>?',
    '    init(targets: [String], batch: Bool, writer: any DoorWriting) {',
    '        self.targets = targets',
    '        self.batch = batch',
    '        self.writer = writer',
    '    }',
    '    func stop() {',
    '        stopRequested = true',
    '        task?.cancel()',
    '    }',
    '    func run(_ report: (String, EndStep) -> Void) async {',
    '        for id in targets {',
    '            if stopRequested {',
    '                report(id, .notRun)',
    '                continue',
    '            }',
    '            let result = await writer.end(id, batch: batch)',
    '            report(id, .wrote(result))',
    '            if Self.stops(after: result) { stopRequested = true }',
    '        }',
    '    }',
    '}',
    'final class EndModel {',
    '    private(set) var line: String?',
    '    func press(_ confirm: PocketEndConfirm) {',
    '        let runner = EndRunner(targets: [sessionId], batch: false, writer: writer)',
    '        registry?.register(runner)',
    '        let task = Task { [weak self] in',
    '            switch await ownerCheck.confirm(reason: confirm.confirmLabel) {',
    '            case .confirmed:',
    '                await runner.run { _, _ in }',
    '            case .notConfirmed:',
    '                self?.line = Copy.endNotConfirmed',
    '            case .needsPasscode:',
    '                self?.line = nil',
    '            }',
    '        }',
    '        runner.task = task',
    '    }',
    '}',
    ''
  ].join('\n');
  const W_BATCH = [
    'final class EndBatchModel {',
    '    private(set) var line: String?',
    '    func press(_ confirm: BatchConfirm) {',
    '        let runner = EndRunner(targets: confirm.targets, batch: true, writer: setup.writer)',
    '        setup.registry.register(runner)',
    '        let task = Task { [weak self] in',
    '            switch await ownerCheck.confirm(reason: confirm.confirmLabel) {',
    '            case .confirmed:',
    '                await runner.run { _, _ in }',
    '            case .notConfirmed, .needsPasscode:',
    '                self?.line = Copy.endNotConfirmed',
    '            }',
    '        }',
    '        runner.task = task',
    '    }',
    '}',
    ''
  ].join('\n');
  const W_OWNER = [
    'import Foundation',
    'import LocalAuthentication',
    'protocol OwnerCheck: Sendable {',
    '    func kind() -> OwnerKind',
    '    func confirm(reason: String) async -> OwnerAnswer',
    '}',
    'struct DeviceOwnerCheck: OwnerCheck {',
    '    func kind() -> OwnerKind {',
    '        let context = LAContext()',
    '        var error: NSError?',
    '        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else { return .none }',
    '        var biometryError: NSError?',
    '        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &biometryError) else { return .passcode }',
    '        return context.biometryType == .faceID ? .faceID : .passcode',
    '    }',
    '    func confirm(reason: String) async -> OwnerAnswer {',
    '        let context = LAContext()',
    '        do {',
    '            return try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) ? .confirmed : .notConfirmed',
    '        } catch {',
    '            return .notConfirmed',
    '        }',
    '    }',
    '}',
    ''
  ].join('\n');
  const W_APP = [
    'final class AppModel: EndRunnerRegistry {',
    '    private var runners: [ObjectIdentifier: EndRunner] = [:]',
    '    func register(_ runner: EndRunner) {',
    '        runners[ObjectIdentifier(runner)] = runner',
    '    }',
    '    func wentAway() {',
    '        for runner in runners.values {',
    '            runner.stop()',
    '        }',
    '    }',
    '    func unpair() {',
    '        switch door.unpair() {',
    '        case .kept:',
    '            settingsLine = Copy.unpairFailed',
    '        case .forgotten:',
    '            lostPairing()',
    '        }',
    '    }',
    '}',
    ''
  ].join('\n');
  const W_SETTINGS = 'struct SettingsScreen: View {\n    var body: some View { Text(Copy.settings) }\n}\n';
  const wFiles = (edits = {}) =>
    [
      ['Door/DoorClient.swift', W_CLIENT],
      [END_BAR_FILE, W_BAR],
      [END_BATCH_FILE, W_BATCH],
      [OWNER_CHECK_FILE, W_OWNER],
      ['App/TortieApp.swift', W_APP],
      ['Screens/SettingsScreen.swift', W_SETTINGS]
    ]
      .map(([name, source]) => ({ name, source: typeof edits[name] === 'function' ? edits[name](source) : source }))
      // An edit that answers null takes the file away.
      .filter((f) => f.source !== null);
  const wPlist = { NSCameraUsageDescription: 'x', NSFaceIDUsageDescription: FACE_ID_USAGE };
  const abRun = (edits) => ruleWrite(wFiles(edits)).findings;
  const acRun = (edits, plist = wPlist) => ruleOwnerCheck(wFiles(edits), plist).findings;
  const adRun = (edits) => ruleShrinks(wFiles(edits)).findings;
  const C = 'Door/DoorClient.swift';
  const swap = (name, from, to) => ({ [name]: (s) => {
    if (!s.includes(from)) throw new Error(`self-test edit anchor missing in ${name}: ${from}`);
    return s.replace(from, to);
  } });
  expect('(ab) passes the write in the shape SPEC §5.8.1 names', abRun().length === 0);
  expect('(ac) passes the owner check in the shape SPEC §5.8.2 names', acRun().length === 0);
  expect('(ad) passes the runner in the shape SPEC §5.8.4 names', adRun().length === 0);
  // (ab)
  expect('(ab) catches a POST written outside present and signedPost', abRun(swap(C, '    func present(', '    func other() async { _ = "POST" }\n    func present(')).length > 0);
  expect('(ab) catches signedPost called by something other than end', abRun(swap(C, '    func present(', '    func again(door: PairedDoor) async { _ = await signedPost(route: .end(session: "x", batch: false), door: door, limits: limits) }\n    func present(')).length > 0);
  expect('(ab) catches a second write id made', abRun(swap(C, '        return WriteResult.of(ended', '        _ = WriteId.fresh()\n        return WriteResult.of(ended')).length > 0);
  expect('(ab) catches a write id taken from fewer than 16 random bytes', abRun(swap(C, 'static let byteCount = 16', 'static let byteCount = 8')).length > 0);
  expect('(ab) catches a write id kept on a type', abRun(swap(C, '    private var handed = false', '    private var lastWrite: WriteId\n    private var handed = false')).length > 0);
  expect('(ab) catches a body without sorted keys', abRun(swap(C, '            encoder.outputFormatting = [.sortedKeys]\n', '')).length > 0);
  expect('(ab) catches a fourth key in the end body', abRun(swap(C, '    let write: String\n}\nenum WriteId', '    let write: String\n    let face: Bool\n}\nenum WriteId')).length > 0);
  expect('(ab) catches the removed unpair write coming back as a second caller', abRun(swap(C, '    func present(', '    func unpair(door: PairedDoor) async -> WriteResult {\n        await signedPost(route: .end(session: "", batch: false), door: door, limits: limits)\n    }\n    func present(')).length > 0);
  expect('(ab) catches a second call of the writer\'s end', abRun(swap(END_BATCH_FILE, '        runner.task = task', '        Task { _ = await setup.writer.end("x", batch: true) }\n        runner.task = task')).length > 0);
  expect('(ab) catches a retry around a write', abRun(swap(END_BAR_FILE, '            let result = await writer.end(id, batch: batch)', '            var result = await writer.end(id, batch: batch)\n            while result == .noAnswer { result = .notTaken }')).length > 0);
  expect('(ab) catches handed set in the send\'s completion', abRun(swap(C, '        handed = true\n        connection.send(content: request, completion: .contentProcessed { _ in })', '        connection.send(content: request, completion: .contentProcessed { _ in self.handed = true })')).length > 0);
  expect('(ab) catches a statement between handed and the send', abRun(swap(C, '        handed = true\n', '        handed = true\n        ready = true\n')).length > 0);
  expect('(ab) catches the bytes handed without asking withheld', abRun(swap(C, '        guard !withheld, result == nil else { return }\n', '        guard result == nil else { return }\n')).length > 0);
  expect('(ab) catches a cancel that withholds bytes already handed', abRun(swap(C, '            guard !handed else { return }\n', '')).length > 0);
  expect('(ab) catches a result not classified by handed', abRun(swap(C, '            guard end.handed else { return .notSent(error as? DoorFailure ?? .notPaired) }\n', '')).length > 0);
  expect('(ab) catches an answer taken without its echo', abRun(swap(C, 'answer.write == sent || answer.echoesNoId', 'answer.echoesNoId')).length > 0);
  expect('(ab) catches an empty echo taken with any outcome (F14)', abRun(swap(C, 'write.isEmpty && outcome == .refused && reason == .malformed', 'write.isEmpty')).length > 0);
  // (ac)
  expect('(ac) catches LocalAuthentication imported outside OwnerCheck.swift', acRun(swap('Screens/SettingsScreen.swift', 'struct SettingsScreen', 'import LocalAuthentication\nstruct SettingsScreen')).length > 0);
  expect('(ac) catches the biometrics-only policy', acRun(swap(OWNER_CHECK_FILE, 'context.evaluatePolicy(.deviceOwnerAuthentication,', 'context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,')).length > 0);
  expect('(ac) catches the biometrics-only policy asked outside kind()', acRun(swap(OWNER_CHECK_FILE, '        let context = LAContext()\n        do {', '        let context = LAContext()\n        var e: NSError?\n        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &e)\n        do {')).length > 0);
  expect('(ac) catches kind() reading biometryType with no biometrics-only question (the verify\'s E3)', acRun(swap(OWNER_CHECK_FILE, '        var biometryError: NSError?\n        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &biometryError) else { return .passcode }\n', '')).length > 0);
  expect('(ac) catches kind() asking the biometrics-only question and ignoring its answer', acRun(swap(OWNER_CHECK_FILE, '        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &biometryError) else { return .passcode }', '        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &biometryError)')).length > 0);
  expect('(ac) catches the biometrics-only policy named in kind() but not as a question', acRun(swap(OWNER_CHECK_FILE, '        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &biometryError) else { return .passcode }', '        let policy = LAPolicy.deviceOwnerAuthenticationWithBiometrics\n        guard context.canEvaluatePolicy(policy, error: &biometryError) else { return .passcode }')).length > 0);
  expect('(ac) catches a reuse window', acRun(swap(OWNER_CHECK_FILE, '        let context = LAContext()\n        do {', '        let context = LAContext()\n        context.touchIDAuthenticationAllowableReuseDuration = 10\n        do {')).length > 0);
  expect('(ac) catches a second evaluation', acRun(swap(OWNER_CHECK_FILE, '        return context.biometryType', '        _ = try? await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "x")\n        return context.biometryType')).length > 0);
  expect('(ac) catches a context kept rather than made per press', acRun(swap(OWNER_CHECK_FILE, '    func confirm(reason: String) async -> OwnerAnswer {\n        let context = LAContext()', '    func confirm(reason: String) async -> OwnerAnswer {\n        let context = Self.shared')).length > 0);
  expect('(ac) catches a second conformer in the app', acRun(swap(OWNER_CHECK_FILE, 'struct DeviceOwnerCheck', 'struct AlwaysYes: OwnerCheck {}\nstruct DeviceOwnerCheck')).length > 0);
  expect('(ac) catches a run outside the confirmed case', acRun(swap(END_BAR_FILE, '        runner.task = task\n', '        Task { await runner.run { _, _ in } }\n        runner.task = task\n')).length > 0);
  expect('(ac) catches the owner check named in Settings', acRun(swap('Screens/SettingsScreen.swift', 'var body', 'let ownerCheck: any OwnerCheck\n    var body')).length > 0);
  expect('(ac) catches the owner check asked by Unpair', acRun(swap('App/TortieApp.swift', '        switch door.unpair() {', '        Task { _ = await ownerCheck.confirm(reason: "x") }\n        switch door.unpair() {')).length > 0);
  expect('(ac) catches a stored Face ID switch', acRun(swap('App/TortieApp.swift', '    func wentAway() {', '    let key = "faceIDOnEnd"\n    func wentAway() {')).length > 0);
  expect('(ac) catches the purpose string missing', acRun({}, { NSCameraUsageDescription: 'x' }).length > 0);
  expect('(ac) catches the purpose string reworded', acRun({}, { ...wPlist, NSFaceIDUsageDescription: 'Tortie uses Face ID.' }).length > 0);
  expect('(ac) PINNED_PLIST_KEYS holds the purpose string, so rule (e) refuses its device spellings', PINNED_PLIST_KEYS.has('NSFaceIDUsageDescription') && rulePlist({ ...okPlist, 'NSFaceIDUsageDescription~iphone': 'x' }, pbxApp()).length > 0);
  // (ac), the tests round: the End press is off when its row is drawn off.
  const W_PRESS = [
    'struct EndBarDrawing: Equatable {',
    '    enum Row: Equatable {',
    '        case on',
    '        case off',
    '    }',
    '    let row: Row?',
    '}',
    'struct EndBar: View {',
    '    @State private var asking = false',
    '    private func row(_ row: EndBarDrawing.Row, drawing: EndBarDrawing) -> some View {',
    '        HStack(spacing: Frame.rowGap) {',
    '            Image(systemName: drawing.glyph)',
    '                .accessibilityIdentifier(ID.sessionEndGlyph(drawing.glyph))',
    '            Button {',
    '                guard drawing.confirm != nil else { return }',
    '                asking = true',
    '            } label: {',
    '                Words(drawing.label, .body, row == .on ? Tokens.error : Tokens.textMuted)',
    '                    .frame(height: EndFrame.rowHeight)',
    '            }',
    '            .buttonStyle(.plain)',
    '            .disabled(row == .off)',
    '            .accessibilityIdentifier(ID.sessionEnd)',
    '        }',
    '    }',
    '}',
    ''
  ].join('\n');
  const pressRun = (edit = (x) => x, extra = []) => ruleEndPressOff([{ name: END_BAR_FILE, source: edit(W_PRESS) }, ...extra]).findings;
  const pressSwap = (from, to) => (src) => {
    if (!src.includes(from)) throw new Error(`self-test edit anchor missing in the End press: ${from}`);
    return src.replace(from, to);
  };
  expect('(ac) passes the End press in the shape the fix round left it', pressRun().length === 0);
  expect('(ac) passes the press off spelled the other way round', pressRun(pressSwap('.disabled(row == .off)', '.disabled(.off == row)')).length === 0 && pressRun(pressSwap('.disabled(row == .off)', '.disabled(row != .on)')).length === 0);
  expect('(ac) passes the press with Button(action:) and its label in a closure', pressRun(pressSwap('            Button {\n                guard drawing.confirm != nil else { return }\n                asking = true\n            } label: {', '            Button(action: { asking = true }) {')).length === 0);
  expect('(ac) catches the press with no .disabled (the reverify\'s B4)', pressRun(pressSwap('            .disabled(row == .off)\n', '')).length > 0);
  expect('(ac) catches the press disabled when ON', pressRun(pressSwap('.disabled(row == .off)', '.disabled(row == .on)')).length > 0);
  expect('(ac) catches the press disabled never', pressRun(pressSwap('.disabled(row == .off)', '.disabled(false)')).length > 0);
  expect('(ac) catches .disabled moved onto the glyph beside the press', pressRun((s) => pressSwap('            .disabled(row == .off)\n', '')(s).replace('                .accessibilityIdentifier(ID.sessionEndGlyph(drawing.glyph))', '                .disabled(row == .off)\n                .accessibilityIdentifier(ID.sessionEndGlyph(drawing.glyph))')).length > 0);
  expect('(ac) catches .disabled on the row around the press, not the press itself', pressRun((s) => pressSwap('            .disabled(row == .off)\n', '')(s).replace('        HStack(spacing: Frame.rowGap) {', '        HStack(spacing: Frame.rowGap) {').replace('        }\n    }\n}\n', '        }\n        .disabled(row == .off)\n    }\n}\n')).length > 0);
  expect('(ac) catches the End press identified twice', pressRun(undefined, [{ name: 'Screens/SessionScreen.swift', source: 'struct S: View {\n    var body: some View { Button {} label: { Text(Copy.x) }.accessibilityIdentifier(ID.sessionEnd) }\n}\n' }]).length > 0);
  expect('(ac) catches the End press identified on something that is not a Button', pressRun(pressSwap('            Button {\n                guard drawing.confirm != nil else { return }\n                asking = true\n            } label: {', '            Group {')).length > 0);
  expect('(ac) catches a third Row case, which == .off would leave pressable', pressRun(pressSwap('        case off\n', '        case off\n        case dim\n')).length > 0);
  // (ad)
  expect('(ad) catches targets made a var', adRun(swap(END_BAR_FILE, '    let targets: [String]', '    var targets: [String]')).length > 0);
  expect('(ad) catches targets grown in the runner', adRun(swap(END_BAR_FILE, '    func stop() {', '    func add(_ id: String) { targets.append(id) }\n    func stop() {')).length > 0);
  expect('(ad) catches a second await in the loop', adRun(swap(END_BAR_FILE, '            report(id, .wrote(result))', '            report(id, .wrote(result))\n            await Task.yield()')).length > 0);
  expect('(ad) catches stopRequested read after the first write', adRun(swap(END_BAR_FILE, '            if stopRequested {\n                report(id, .notRun)\n                continue\n            }\n            let result = await writer.end(id, batch: batch)', '            let result = await writer.end(id, batch: batch)\n            if stopRequested {\n                report(id, .notRun)\n                continue\n            }')).length > 0);
  expect('(ad) catches stopRequested set back to false', adRun(swap(END_BAR_FILE, '    func stop() {', '    func resume() { stopRequested = false }\n    func stop() {')).length > 0);
  expect('(ad) catches a stop that does not cancel its task', adRun(swap(END_BAR_FILE, '        stopRequested = true\n        task?.cancel()', '        stopRequested = true')).length > 0);
  expect('(ad) catches a runner made after the owner check', adRun(swap(END_BAR_FILE, '        let runner = EndRunner(targets: [sessionId], batch: false, writer: writer)\n        registry?.register(runner)\n        let task = Task { [weak self] in\n            switch await ownerCheck.confirm(reason: confirm.confirmLabel) {\n            case .confirmed:\n', '        let task = Task { [weak self] in\n            switch await ownerCheck.confirm(reason: confirm.confirmLabel) {\n            case .confirmed:\n                let runner = EndRunner(targets: [sessionId], batch: false, writer: writer)\n                registry?.register(runner)\n')).length > 0);
  expect('(ad) catches a runner never registered', adRun(swap(END_BATCH_FILE, '        setup.registry.register(runner)\n', '')).length > 0);
  expect('(ad) catches wentAway that stops no runner', adRun(swap('App/TortieApp.swift', '        for runner in runners.values {\n            runner.stop()\n        }\n', '')).length > 0);
  // The shape the app ships (Phase 317's build): the registry in an extension
  // of AppModel, and wentAway doing what stop() does, both halves.
  const W_APP_EXT = [
    'final class AppModel {',
    '    private var liveRunners: [EndRunner] = []',
    '    func wentAway() {',
    '        for runner in liveRunners {',
    '            runner.stopRequested = true',
    '            runner.task?.cancel()',
    '        }',
    '    }',
    '}',
    'extension AppModel: EndRunnerRegistry {',
    '    func register(_ runner: EndRunner) {',
    '        liveRunners.append(runner)',
    '    }',
    '}',
    ''
  ].join('\n');
  expect('(ad) passes a registry in an AppModel extension and a wentAway that does what stop() does', adRun({ 'App/TortieApp.swift': () => W_APP_EXT }).length === 0);
  expect('(ad) catches a wentAway that sets stopRequested and cancels no task', adRun({ 'App/TortieApp.swift': () => W_APP_EXT.replace('            runner.task?.cancel()\n', '') }).length > 0);
  expect('(ad) catches a wentAway that stops another list than the one register keeps', adRun({ 'App/TortieApp.swift': () => W_APP_EXT.replace('for runner in liveRunners {', 'for runner in otherRunners {') }).length > 0);
  expect('(ad) catches a target persisted', adRun(swap(END_BATCH_FILE, '        setup.registry.register(runner)', '        setup.registry.register(runner)\n        UserDefaults.standard.set(confirm.targets, forKey: "t")')).length > 0);
  expect('(ad) catches a write persisted in the write path', adRun(swap(C, '        return WriteResult.of(ended', '        try? body.write(to: URL(fileURLWithPath: "/tmp/w"))\n        return WriteResult.of(ended')).length > 0);
  // (t), widened: the write path presents the identity, and the write arms.
  const tWrite = (edit = (s) => s) => tRun({ client: clientOk.replace('    func exchange(', `    func connect(identity: ClientIdentity?) {}\n    private func signedPost() async {\n        ${edit('let ended = await connect(method: "POST", identity: door.identity)')}\n    }\n    func exchange(`) });
  expect('(t) passes a write path that presents the identity', tWrite().length === 0);
  expect('(t) catches a write that presents no identity', tWrite((s) => s.replace('identity: door.identity', 'identity: nil')).length > 0);
  expect('(t) catches a write that names no identity', tWrite((s) => s.replace(', identity: door.identity', '')).length > 0);
  const hostileWrites = (edit = (s) => s) => edit(hostileOk);
  const tArms = (hostile, sentences = ['busy', 'unreadable']) => tRun({ hostile, writeSentences: sentences });
  expect('(t) passes the write arms when each ends in a line it names', tArms(hostileWrites()).length === 0);
  expect('(t) catches a write arm gone', tArms(hostileWrites((s) => s.replace(writeArmLine('write-cut'), ''))).length > 0);
  expect('(t) catches a write arm that counts no POST', tArms(hostileWrites((s) => s.replace(`'write-404': { what: 'x', ends: 'sentence', write: true, posts: 1`, `'write-404': { what: 'x', ends: 'sentence', write: true`))).length > 0);
  expect('(t) catches a write arm expecting a door sentence the door does not say', tArms(hostileWrites(), ['busy']).length > 0);
  expect('(t) passes a write arm that ends on Pairing (a re-read the door refused)', tArms(hostileWrites((s) => s.replace(`'write-cut-reread-refused': { what: 'x', ends: 'sentence'`, `'write-cut-reread-refused': { what: 'x', ends: 'pairing'`))).length === 0);
  expect('(t) catches a write arm that ends nowhere', tArms(hostileWrites((s) => s.replace(`'write-late': { what: 'x', ends: 'sentence'`, `'write-late': { what: 'x', ends: 'somewhere'`))).length > 0);
  // Every clause once more ON ITS OWN: each edit below breaks one clause and
  // no other, so a clause switched off in this file turns its own case red
  // (the meta-ablation in the phase's proof switched each off in turn).
  const W = END_BAR_FILE;
  const B = END_BATCH_FILE;
  const O = OWNER_CHECK_FILE;
  const APPF = 'App/TortieApp.swift';
  const drop = (name) => ({ [name]: () => null });
  /** Several edits to ONE file, in order (two `swap`s spread over one key keep only the last). */
  const swaps = (name, pairs) => ({ [name]: (s) => pairs.reduce((acc, [from, to]) => {
    if (!acc.includes(from)) throw new Error(`self-test edit anchor missing in ${name}: ${from}`);
    return acc.replace(from, to);
  }, s) });
  const one = (what, run, edits) => expect(`${what}, on its own`, run(edits).length > 0);
  one('(ab) catches a WriteId that keeps a static var', abRun, swap(C, '    static let byteCount = 16', '    static let byteCount = 16\n    static var last = ""'));
  one('(ab) catches an EndBody built outside signedPost', abRun, swap(W, '    func stop() {', '    func p() { _ = EndBody(batch: true, session: "x", write: "y") }\n    func stop() {'));
  one('(ab) catches signedPost building no EndBody', abRun, swap(C, '                body = try encoder.encode(EndBody(batch: batch, session: session, write: id))', '                body = try encoder.encode(["write": id])'));
  one('(ab) catches signedPost looping', abRun, swap(C, '        let ended = await connect(', '        while false {}\n        let ended = await connect('));
  one('(ab) catches no EndBody struct', abRun, swap(C, 'struct EndBody: Encodable {', 'struct EndBodyRenamed: Encodable {'));
  one('(ab) catches DoorClient.end looping', abRun, swap(C, '        await signedPost(route: .end(session: sessionId, batch: batch), door: door, limits: limits)', '        for _ in 0..<1 {}\n        return await signedPost(route: .end(session: sessionId, batch: batch), door: door, limits: limits)'));
  one('(ab) catches the one writer end moved out of EndRunner.run', abRun, {
    ...swap(W, '            let result = await writer.end(id, batch: batch)', '            let result = await self.send(id)'),
    ...swap(B, '    func press(_ confirm: BatchConfirm) {', '    func elsewhere(_ w: any DoorWriting) async { _ = await w.end("x", batch: true) }\n    func press(_ confirm: BatchConfirm) {')
  });
  one('(ab) catches the writer end called twice inside EndRunner.run', abRun, swap(W, '            report(id, .wrote(result))', '            report(id, .wrote(result))\n            _ = await writer.end(id, batch: batch)'));
  one('(ab) catches handed set once, outside send', abRun, swaps(C, [
    ['        guard !withheld, result == nil else { return }\n        handed = true\n        connection.send(', '        guard !withheld, result == nil else { return }\n        mark()\n        connection.send('],
    ['    private func cancelled() {', '    private func mark() {\n        handed = true\n    }\n    private func cancelled() {']
  ]));
  one('(ab) catches handed set false in send', abRun, swap(C, '        handed = true\n        connection.send(', '        handed = false\n        connection.send('));
  one('(ab) catches signedPost called twice by end', abRun, swap(C, '        await signedPost(route: .end(session: sessionId, batch: batch), door: door, limits: limits)', '        _ = await signedPost(route: .end(session: sessionId, batch: batch), door: door, limits: limits)\n        return await signedPost(route: .end(session: sessionId, batch: batch), door: door, limits: limits)'));
  one('(ab) catches the one write id made outside signedPost', abRun, swaps(C, [
    ['        guard let id = WriteId.fresh() else { return .notSent(.notPaired) }', '        guard let id = Self.newId() else { return .notSent(.notPaired) }'],
    ['    private func signedPost(', '    static func newId() -> String? {\n        let id = WriteId.fresh()\n        return id\n    }\n    private func signedPost(']
  ]));
  one('(ab) catches a write id not bound to a local', abRun, swap(C, '        guard let id = WriteId.fresh() else { return .notSent(.notPaired) }', '        guard let id = [WriteId.fresh()].first ?? nil else { return .notSent(.notPaired) }'));
  one('(ab) catches a second write id bound in signedPost', abRun, swap(C, '        let body: Data\n', '        let spare = WriteId.fresh()\n        let body: Data\n'));
  one('(ab) catches no WriteId', abRun, swap(C, 'enum WriteId {', 'enum WriteIdent {'));
  one('(ab) catches withheld set twice', abRun, swap(C, '        finish(.failure(DoorFailure.cancelled))', '        if !handed {\n            withheld = true\n        }\n        finish(.failure(DoorFailure.cancelled))'));
  one('(ab) catches no enum WriteResult', abRun, swap(C, 'enum WriteResult: Equatable {', 'enum WriteOutcome: Equatable {'));
  one('(ab) catches WriteResult with no classifier', abRun, swap(C, '    static func of(_ end: ExchangeEnd,', '    static func classify(_ end: ExchangeEnd,'));
  one('(ac) catches no OwnerCheck.swift', acRun, drop(O));
  one('(ac) catches LAContext named outside OwnerCheck.swift', acRun, swap(W, '    func stop() {', '    let context: LAContext? = nil\n    func stop() {'));
  one('(ac) catches the one evaluation moved out of OwnerCheck.swift', acRun, {
    ...swap(O, '            return try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) ? .confirmed : .notConfirmed', '            return try await Elsewhere.ask(context, reason) ? .confirmed : .notConfirmed'),
    ...swap(W, '    func stop() {', '    func ask(_ c: OwnerContext, _ r: String) async throws -> Bool { try await c.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: r) }\n    func stop() {')
  });
  one('(ac) catches an evaluation under another policy', acRun, swap(O, 'context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)', 'context.evaluatePolicy(policy, localizedReason: reason)'));
  one('(ac) catches no runner run at all', acRun, { ...swap(W, '                await runner.run { _, _ in }', '                await runner.go { _, _ in }'), ...swap(B, '                await runner.run { _, _ in }', '                await runner.go { _, _ in }') });
  expect('(ac) catches an Info.plist that cannot be read, on its own', acRun({}, null).length > 0);
  one('(ad) catches no EndRunner class', adRun, swap(W, 'final class EndRunner {', 'final class EndQueue {'));
  one('(ad) catches an EndRunner with no run', adRun, swap(W, '    func run(_ report: (String, EndStep) -> Void) async {', '    func go(_ report: (String, EndStep) -> Void) async {'));
  one('(ad) catches two loops over the targets', adRun, swap(W, '        for id in targets {', '        for id in targets { _ = id }\n        for id in targets {'));
  one('(ad) catches a loop that writes nothing', adRun, swap(W, '            let result = await writer.end(id, batch: batch)', '            let result = await writer.send(id)'));
  one('(ad) catches the run indexing its targets', adRun, swap(W, '        for id in targets {', '        _ = targets[0]\n        for id in targets {'));
  one('(ad) catches an EndRunner made and never bound', adRun, swap(B, '        let task = Task { [weak self] in', '        _ = EndRunner(targets: [], batch: true, writer: setup.writer)\n        let task = Task { [weak self] in'));
  one('(ad) catches no runner made anywhere', adRun, { ...swap(W, 'let runner = EndRunner(', 'let runner = makeRunner('), ...swap(B, 'let runner = EndRunner(', 'let runner = makeRunner(') });
  one('(ad) catches no AppModel', adRun, swap(APPF, 'final class AppModel: EndRunnerRegistry {', 'final class AppState: EndRunnerRegistry {'));
  one('(ad) catches an AppModel with no wentAway', adRun, swap(APPF, '    func wentAway() {', '    func leaving() {'));
  one('(ad) catches an AppModel with no register', adRun, swap(APPF, '    func register(_ runner: EndRunner) {', '    func keep(_ runner: EndRunner) {'));
  one('(ad) catches no EndBatch.swift', adRun, drop(B));
  expect('(t) catches a connect( that names no identity beside a signedPost that does, on its own', tWrite((s) => `${s}\n        connect(method: "GET")`).length > 0);
  expect('(t) catches no POCKET_WRITE_SENTENCES to read, on its own', tArms(hostileWrites((s) => s.split("door: ['unreadable']").join('door: []')), null).length > 0);
  expect('(t) catches a write arm not marked write, on its own', tArms(hostileWrites((s) => s.replace(`'write-404': { what: 'x', ends: 'sentence', write: true,`, `'write-404': { what: 'x', ends: 'sentence', write: false,`))).length > 0);
  expect('(t) catches a write arm that says nowhere it ends, on its own', tArms(hostileWrites((s) => s.replace(`'write-404': { what: 'x', ends: 'sentence', write: true, posts: 1, at: 'session-end-line',`, `'write-404': { what: 'x', ends: 'sentence', write: true, posts: 1,`))).length > 0);
  expect('(t) catches a sentence arm naming no sentence, on its own', tArms(hostileWrites((s) => s.replace(`'write-404': { what: 'x', ends: 'sentence', write: true, posts: 1, at: 'session-end-line', expect: ['answerUnreadable'], door: ['unreadable'],`, `'write-404': { what: 'x', ends: 'sentence', write: true, posts: 1, at: 'session-end-line', expect: [], door: [],`))).length > 0);
  expect('(t) catches a write arm naming a Copy word Copy.swift lacks, on its own', tArms(hostileWrites((s) => s.replace(`'write-404': { what: 'x', ends: 'sentence', write: true, posts: 1, at: 'session-end-line', expect: ['answerUnreadable']`, `'write-404': { what: 'x', ends: 'sentence', write: true, posts: 1, at: 'session-end-line', expect: ['answerUnreadable', 'vanished']`))).length > 0);
  // (v), widened: End's line is always a sentence.
  const vWords = 'enum DoorWords {\n    static func endSentence(for result: WriteResult) -> String {\n        switch result {\n        case .answered(let answer):\n            return answer.sentence ?? Copy.answerUnreadable\n        case .notTaken:\n            return Copy.endNotTaken\n        case .noAnswer:\n            return Copy.endNoAnswer\n        case .notSent(let failure):\n            return sentence(for: failure)\n        }\n    }\n}\n';
  const vRun2 = (words = vWords, files = wFiles()) => ruleEndSentence(words, files).findings;
  expect('(v) passes an End line that is always a sentence', vRun2().length === 0);
  expect('(v) catches endSentence made optional', vRun2(vWords.replace('-> String {', '-> String? {')).length > 0);
  expect('(v) catches a WriteResult case with no sentence', vRun2(vWords.replace('        case .noAnswer:\n            return Copy.endNoAnswer\n', '')).length > 0);
  expect('(v) catches an empty End line', vRun2(vWords, wFiles(swap(END_BAR_FILE, 'self?.line = Copy.endNotConfirmed', 'self?.line = ""'))).length > 0);
  expect('(v) catches an End line that is not a sentence', vRun2(vWords, wFiles(swap(END_BATCH_FILE, 'self?.line = Copy.endNotConfirmed', 'self?.line = String(describing: confirm)'))).length > 0);
  const vDecl = 'static func endSentence(for result: WriteResult) -> String {';
  expect('(v) catches no endSentence, on its own', vRun2(vWords.replace(vDecl, 'static func endLine(for result: WriteResult) -> String {')).length > 0);
  expect('(v) catches endSentence returning nil, on its own', vRun2(vWords.replace('            return Copy.endNotTaken', '            return nil')).length > 0);
  expect('(v) catches endSentence returning an empty string, on its own', vRun2(vWords.replace('            return Copy.endNotTaken', '            return ""')).length > 0);
  expect('(v) catches endSentence with a default, on its own', vRun2(vWords.replace('        case .notTaken:\n            return Copy.endNotTaken\n', '        default:\n            return Copy.endNotTaken\n        case .notTaken:\n            return Copy.endNotTaken\n')).length > 0);
  expect('(v) catches no enum WriteResult to read, on its own', vRun2(vWords, wFiles(swap(C, 'enum WriteResult: Equatable {', 'enum WriteOutcome: Equatable {'))).length > 0);
}

// ---------------------------------------------------------------------------
// Run the rules over the tree
// ---------------------------------------------------------------------------

/**
 * Every rule this gate holds. (m) and (q) were retired in Phase 330 with the
 * tailnet node; (w) and (x) are Phase 316.5's; (y) and (z) are Phase 316.6's;
 * (ab), (ac) and (ad) are Phase 317's, and (aa) is left for Phase 316.7
 * (build/p317/SPEC.md §4.3), so either order of landing works.
 */
export const RULE_IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'ab', 'ac', 'ad'];

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
    // Phase 316.6: the badge's colour reaches UIKit's tab bar from here alone.
    const look = ruleTabBarLook(appSwift.map((p) => ({ name: relative(APP, p).split(sep).join('/'), source: read(p) })));
    f.push(...look.findings);
    record(
      'a',
      'Tokens.swift is tokens.css, no colour is written anywhere else, and the tab bar\'s badge is the Mac\'s',
      f,
      `${String(table.mapped)} names mapped to ${String(table.distinct)} distinct hexes of the dark base; ${String(others.length)} other files hold no colour literal; the tab bar's UIKit look named in ${TAB_BAR_FILE} alone, the badge's ground set ${String(look.said.ground)} and its words ${String(look.said.words)} time(s), each from its token, applied ${String(look.said.applied)} time(s)`
    );
  }
  // (b)
  {
    const f = [...missing(COPY_SWIFT)];
    const files = appSwift.filter((p) => p !== COPY_SWIFT);
    for (const p of files) f.push(...ruleNoVisibleLiteral(rel(p), read(p)));
    // Phase 316.6: three tabs, the bar never hidden, no tab stored.
    const tabs = ruleTabs(appSwift.map((p) => ({ name: relative(APP, p).split(sep).join('/'), source: read(p) })));
    f.push(...tabs.findings);
    record('b', 'no drawn string outside Copy.swift, and three tabs', f, `${String(files.length)} app files read; ${String(tabs.said.tabs)} Tab(s) in ${TAB_FILE}, Copy.needsInput, Copy.sessions and Copy.settings with bell, list.bullet and gearshape; nothing hides the tab bar, and no tab is stored`);
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
        `${String(r.said.sites)} arithmetic operators in ${String(files.length)} app files: ${String(r.said.proved)} proved off the integers by their own text, ${String(r.said.named)} named in ${String(ARITHMETIC_NAMED.length)} entries, ${String(r.said.scoped)} under the one named scope (${(r.said.scopes ?? []).map((x) => `${x.label}: ${String(x.files)} file(s), ${String(x.operators)} operator(s)${x.valid ? '' : ', WAIVED for naming a door type'}`).join('; ')}), none on a door number`
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
    // Phase 316.6: who deletes a pairing item, and in what order (Unpair).
    const d = ruleDeleters(appSwift.map((p) => ({ name: relative(APP, p).split(sep).join('/'), source: read(p) })));
    record(
      'n',
      'every Keychain item is ThisDeviceOnly and never synchronised, the client key is the enclave\'s where there is one, and only Unpair and a failed pairing delete one',
      [...r.findings, ...k.findings, ...d.findings],
      `${String(r.said.adds)} SecItemAdd call(s); ${String(r.said.thisDevice)} ThisDeviceOnly accessibility value(s) named, and no other; ${String(k.said.makers)} file(s) make a client key, ThisDeviceOnly by construction on both paths (the enclave's access control with .privateKeyUsage, made only inside the if on SecureEnclave.isAvailable; the software key's own kSecAttrAccessible), in the Secure Enclave only when it is available; every attempt that ends unpaired deletes its key by its tag; SecItemDelete ${String(d.said.secItemDeletes)} time(s), in KeychainSecretStore.remove and KeychainClientKeys.delete alone; the record removed only by PairingStore (${String(d.said.recordRemoves)}), a client key deleted outside its store only by PairingStore.forget and PairingFlow.run (${String(d.said.keyDeletes)}); the store's forget() ${String(d.said.storeForgets)} time(s) from its four callers and the DEBUG seam ${String(d.said.doorForgets)}; the record goes before any key, and LiveDoor.unpair sees the store's error`
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
      copy: existsSync(COPY_SWIFT) ? read(COPY_SWIFT) : null,
      writeSentences: writeSentenceKeys(existsSync(POCKET_TS) ? read(POCKET_TS) : null)
    });
    record(
      't',
      'the client is pinned mutual TLS 1.3 to a public name, and reads HTTP by hand, bounded',
      r.findings,
      `a local identity on every paired connection (${String(r.said.identityCalls)} exchange(s) with one, and POST /pair alone with none; ${String(r.said.connects)} connect( call(s) naming one, the writes' with the paired door's); the verify block completes with DoorPin's answer; TLS 1.3 the minimum and nothing older; a .ts.net name at 8443 or 10000, checked by the parse; one Content-Length required, Transfer-Encoding refused, Connection: close; hostile-door.mjs names ${String(r.said.arms.length)} HTTP arm(s) (${r.said.arms.join(', ')}), each ending in a Copy sentence, and ${String(r.said.writeArms.length)} write arm(s), each ending where it names, in a Copy sentence or the door's own`
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
    // Phase 317: End's line too.
    const e = ruleEndSentence(existsSync(DOOR_WORDS) ? read(DOOR_WORDS) : null, appSwift.map((p) => ({ name: relative(APP, p).split(sep).join('/'), source: read(p) })));
    record(
      'v',
      'the phone always draws a sentence',
      [...r.findings, ...e.findings],
      `pairingSentence draws a Copy sentence for each of ${String(r.said.failures)} PairingFailure case(s) and stepSentence for each of ${String(r.said.steps)} PairingStep case(s), never nil or empty; PairingModel's line is a non-optional String, assigned a sentence ${String(r.said.assignments)} time(s); endSentence draws a sentence for each of ${String(e.said.cases)} WriteResult case(s), and End's two lines are assigned nil or a sentence ${String(e.said.assignments)} time(s), never empty`
    );
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
    // Phase 316.6: Unpair unregisters, once, in Release, after the record went.
    const u = ruleForgetAddress(files, tests);
    record(
      'x',
      'the alert\'s refusals',
      [...r.findings, ...u.findings],
      `registerForRemoteNotifications ${String(r.said.registrations)} time(s), in the #else of #if DEBUG in ${ALERT_FILES.system}; requestAuthorization ${String(r.said.asks)} time(s); UserNotifications named in ${r.said.unFiles.join(' and ') || 'no file'}; ` +
        `userInfo read ${String(r.said.userInfo)} time(s), inside AlertTap.parse or handed to it; PushEnvironment.current .development under DEBUG and .production in its #else (${String(r.said.arms)} arms); apt and ape declared ${String(r.said.fields)} time(s), by Inner and Record; ` +
        `iOS asked only for a Mac that says it can send: askForAlerts() ${String(r.said.flowAsks)} time(s) in the pending arm behind its word, askForPairing() ${String(r.said.pairingAsks)} time(s) inside the closure the pairing asks through, ${String(r.said.launchReads)} launch read(s) behind a guard on macSends; ` +
        `no badge write, service extension, background delivery, print or log in ${String(files.length)} app files, and no test of ${String(tests.length)} names the registration; ` +
        `unregisterForRemoteNotifications ${String(u.said.unregisters)} time(s), in the #else of #if DEBUG in ${ALERT_FILES.system}, and forgetAddress() ${String(u.said.forgets)} time(s), in AppModel.unpair's .forgotten arm after door.unpair()`
    );
  }
  // Phase 316.6: (y) and (z), over the app named relative to its folder.
  const appNamed = appSwift.map((p) => ({ name: relative(APP, p).split(sep).join('/'), source: read(p) }));
  // (y)
  {
    const r = ruleRenderer(appNamed);
    record(
      'y',
      "the renderer's bounds",
      r.findings,
      `${String(r.said.files)} renderer file(s); Foundation alone in the parser; MarkdownCaps's ${String(r.said.caps)} caps each read once (${String(r.said.reads)} read(s)); nothing throws, traps, force-unwraps or matches a pattern; ${String(r.said.cycles)} call cycle(s) and ${String(r.said.viewCycles)} view cycle(s), each passing depth + 1; AttributedString(markdown: ${String(r.said.parses)} time(s), with exactly its three options; nothing localized; ${String(r.said.texts)} Text(s) in MarkdownView.swift, each verbatim, a symbol or an AttributedString; no door type; an ordered item's mark is the number the agent wrote (D17), kept from its marker's own bytes; MarkdownCaps.pieces is ${String(MARKDOWN_CAPS.pieces.value)}${MARKDOWN_CAPS.pieces.value === 0 ? ' (markdown off, his ruling of 2026-10-02), so EVERY answer is' : ' blocks, items and cells, and an answer past it is'} drawn as written, every link and image address removed, exactly as 28d89295's AnswerText drew it`
    );
  }
  // (z)
  {
    const r = ruleOneWayOut(appNamed);
    record(
      'z',
      'nothing fetched, and one way out',
      r.findings,
      `no AsyncImage, NSAttributedString, document type or contentsOf: outside DEBUG; no in-app browser, sign-in sheet, preview, canOpenURL or Link; ${String(r.said.actions)} OpenURLAction in ${LINKS_FILE}, asking LinkPolicy.opens before it stages, and ${String(r.said.opens)} open(s) there asking it again; ${String(r.said.settingsOpens)} open(s) in ${SETTINGS_FILE}, of iOS's own notification settings; LinkPolicy.opens names https, the user part, the password, the port, xn-- and MarkdownCaps.linkBytes`
    );
  }
  // Phase 317: (ab), (ac) and (ad), over the app named relative to its folder.
  // (ab)
  {
    const r = ruleWrite(appNamed);
    record(
      'ab',
      'the write: one signed path, one id per write, handed only once withheld is asked, and never retried',
      r.findings,
      `"POST" ${String(r.said.posts)} time(s), in present and signedPost alone; signedPost called ${String(r.said.signedPosts)} time(s), by DoorClient.end alone; WriteId.fresh() ${String(r.said.freshIds)} time(s), 16 random bytes bound to a local; the body encoded with sorted keys and exactly its keys in signedPost alone; the writer's end( ${String(r.said.writerEnds)} time(s), in EndRunner.run, never in a while; handed set ${String(r.said.handed)} time(s), in send() just before connection.send and after withheld is asked; withheld set ${String(r.said.withheld)} time(s), only while handed is false; the result classified by handed, and an answer taken only with its id echoed or "" with refused and malformed`
    );
  }
  // (ac)
  {
    let plist = null;
    try {
      plist = existsSync(INFO_PLIST) ? readPlistFile(INFO_PLIST) : null;
    } catch {
      plist = null;
    }
    const r = ruleOwnerCheck(appNamed, plist);
    // Phase 317's tests round: the press says off when it is drawn off.
    const p = ruleEndPressOff(appNamed);
    record(
      'ac',
      'the owner check: Face ID, Touch ID or the passcode, on the End press and nothing else',
      [...r.findings, ...p.findings],
      `the End press, ${String(p.said.presses)} element identified ID.sessionEnd, is a Button whose own chain (${p.said.chain.join(', ')}) holds .disabled(row == .off) over EndBarDrawing.Row's two cases; LocalAuthentication and LAContext in ${OWNER_CHECK_FILE} alone; ${String(r.said.evaluations)} evaluatePolicy( call, with .deviceOwnerAuthentication and a new LAContext in confirm; the biometrics-only policy only asked, in kind(), and no reuse window; the conformer(s) ${r.said.conformers.join(', ') || 'none'}; ${String(r.said.runs)} run(s) of a runner, each inside the .confirmed case of a switch on confirm(; nothing in Settings, the pairing, the conversation, Door/ or an unpair names the check, and no string could key a stored Face ID setting; Info.plist's NSFaceIDUsageDescription is ${JSON.stringify(FACE_ID_USAGE)}`
    );
  }
  // (ad)
  {
    const r = ruleShrinks(appNamed);
    record(
      'ad',
      'the list only shrinks, and nothing is sent after the app left',
      r.findings,
      `EndRunner.targets a let, never grown; ${String(r.said.loops)} loop over it with one awaited write per turn and stopRequested read before each, the first included, and never set false; ${String(r.said.runners)} runner(s) made at the press, ${String(r.said.registered)} registered before the owner check is asked; AppModel.wentAway stops every registered runner (stopRequested set and its task cancelled); nothing in ${END_BAR_FILE}, ${END_BATCH_FILE} or the write path persists a write or a target`
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
