# Phase 333.2 — "Where do I get the phone app?" — the Mac says it — SPEC

Written at `2a4d1ec5` in `/private/tmp/wt-p3332` (origin/main, with Phase 316.5's alerts and Phase 332.1's name check
progress landed, both on `src/renderer/settings/PhoneSection.tsx`). The charter is the Phase 333.2 entry
(`docs/BACKLOG.md:37427`), research 136 §5 (the asset row "A Mac line naming where to get the phone app") and §9 (alerts
stay his alone). Every file the entry cites was re-read at this head; §3 lists what moved.

| | |
| --- | --- |
| Subject | `feat(pocket): Settings then Phone names where to get the phone app` |
| First body line | `Phase 333.2: the Mac names tortie.sh/iphone` |
| Semver | Patch, unreleased (no release before 333.7, and none until the phone works) |
| Lane | Build: Spec → Build (ONE builder) → Verify → [Fix → Reverify] → Commit |
| Tier | **2**: a rendered surface with no new state. One app run; the independent method is **the parent measurement** |
| Menus | **No change.** `Pair a Phone…` stays at `src/main/menu.ts:615` |

## 1. The answer first

1. **One string moves.** `SCAN_LINE` (`src/renderer/settings/PhoneSection.tsx:83`) becomes, as the entry drafted it and his
   defaults of 2026-09-30 take it, **`Scan it with Tortie on your iPhone, from tortie.sh/iphone.`** Text only: no link, no
   button, no store badge, no QR for the store, no Apple logo. It is drawn where it is drawn today, under the pairing
   code (`:629`, inside `.phone-qr-side`), and nowhere else.
2. **Item 2 is already done, by Phase 316.5. This phase builds nothing for it.** A Mac with no alert key shows no alert
   switch: `pushSwitchShown` (`PhoneSection.tsx:412-414`) answers `status.pushKeyId !== null || status.pushAlerts`, and
   the switch row (`[data-phone-alerts]`, `:890-913`) is drawn only when it is true. `pushKeyId` is main's fact
   (`PocketStatus.pushKeyId`, `src/shared/ipc/pocket.ts:529`, filled by `this.deps.alerts?.keyId()` at
   `src/main/pocket/ipc.ts:760`), so the renderer works nothing out again. Unit-tested at
   `src/renderer/settings/__tests__/p316-phone-section.test.tsx:723-764` (no key: no switch, no caption, no sentence;
   key kept: switch; alerts already on with no key: switch, so it can be turned off). No field is added and the
   `gate:contract` baseline does not move. The app run (§6, arm K) still reads it live at both builds, because the
   entry's proof names it and it costs two presses.
3. **A new small probe, `probe:p3332`**, one Electron at the parent and one at HEAD, reads every rectangle and every word
   of Settings then Phone at rest, with the code showing at 640, 760 and 1200 pixels wide, and through Choose… and
   Forget of a scratch key. `HELPER_USER_FLOOR` rises from 159 to 160.
4. **CHANGELOG: no new item and no word changed.** The follow-up docs commit appends this commit's link to the existing
   iPhone app item (§9.4).

What a person notices: with the code on the screen, the line under it says where the phone app comes from. Nothing else
on any face of the sheet moves, apart from that line and its column growing wider (§6.6 has the numbers).

## 2. The tree at this head, re-read

| What | Where, at `2a4d1ec5` |
| --- | --- |
| `SCAN_LINE` | `src/renderer/settings/PhoneSection.tsx:83`, `'Scan it with Tortie on your iPhone.'` |
| Drawn | `:629`, the first `<p className="phone-line">` in `.phone-qr-side`, in the `showing` stage (`:625-646`) |
| `CODE_PRIVATE` | `:85`, drawn at `:630` under the scan line |
| `PUSH_LABEL` | `:205`; the switch row `:890-913` behind `pushSwitchShown(status)` |
| `pushSwitchShown` | `:412-414` |
| The key row | `:862-889`, drawn whenever `status !== null` (`Apple push key`, `Not chosen.` or `Key <id>`, Choose…, Forget) |
| `ALERTS_GROUP` label | drawn always, above the key row |
| The code's layout | `src/renderer/settings/phone-section.css:53` `.phone-showing` (row, `flex-wrap: wrap`, gap `--space-6`), `:63` `.phone-qr`, `:70` `.phone-qr-side` (column, `align-items: flex-start`) |
| The code's width | `src/renderer/settings/phone/Qr.tsx:36-41`, `QR_TARGET_PX` 320 rounded down to whole pixels a module |
| Settings window | `src/main/settings/window.ts:60-63`, 760 wide by default, `minWidth` 640; `settings.css` nav 200, content padding 24, section `max-width: 560px` |
| The unit pin | `src/renderer/settings/__tests__/p316-phone-section.test.tsx:513-523`, `expect(SCAN_LINE).toBe(...)` at `:520` |
| `Pair a Phone…` | `src/main/menu.ts:615` |
| The iPhone CHANGELOG item | `CHANGELOG.md:12` |
| `HELPER_USER_FLOOR` | `build/assert-electron-teardown.mjs:369`, 159; the gate reads 159 callers today (measured: `node build/assert-electron-teardown.mjs`, exit 0) |

## 3. Where the entry is wrong or stale at this head

1. **Line numbers.** `SCAN_LINE` is at `:83`, not `:75`; `PUSH_LABEL` at `:205`, not `:97`; the switch at `:890-913`,
   not `:603` and `:613`. Phases 316.5 and 332.1 moved them.
2. **"The alert switch is drawn for every Mac."** No longer true: 316.5's `pushSwitchShown` hides it without a key (§1
   item 2).
3. **Mechanism 2, "the alerts group is not drawn".** It is the alert SWITCH that a keyless Mac must not show, which is
   research 136 §9's own word ("A Mac with no key shows no alert switch"). The Alerts group stays, because its key row
   and Choose… are the only way a Mac ever gets a key. 316.5 built it that way on purpose (`build/p3165/SPEC.md`, "§As
   built", the Settings → Phone row).
4. **"If 316.5's status does not already carry it, this phase adds one field and regenerates `gate:contract`'s
   baseline."** It carries it (`pushKeyId`). No contract line moves.
5. **"The two checklists name it, so each moves."** Only `build/p330/CHECKLIST.md` moves. `build/p316/CHECKLIST.md`
   (`:117`, `:231`) is the record of the 316.4 build, copied into the Phase 316 entry (`docs/BACKLOG.md:33603`): its row
   11 has him paste a tailnet key into a field Phase 330 removed, and the line it quotes ("… The phone must join and
   pair before this code shuts.") has been gone since Phase 330. Editing one sentence inside a flow that no longer
   exists would make it match no build at all. It is left as it is.
6. **"`conformance:phonecopy` runs, because `Copy.swift` quotes `PhoneSection.tsx` words by owner."** `Copy.swift`
   quotes four of them (`PHONE_TITLE`, `BTN_PAIR`, `BTN_TRY_AGAIN`, `CODE_EXPIRED`) and not `SCAN_LINE`, and the phone
   mock under `docs/design/phone/` draws no Mac sheet (no "Scan it" anywhere in it). The gate judges nothing this phase
   moves. It runs anyway because it costs a second.
7. **"The door forced to loopback."** Since Phase 330 the door is published through Tailscale Funnel; the run uses
   Phase 330's stand-in Tailscale and Phase 332's DNS stand-in, as `probe:p330` and `probe:p3321` do.
8. **"Every rectangle in the section equal except the two named"** (the scan line's text and the switch's presence).
   The switch's presence is EQUAL at both builds, because 316.5 is in the parent. What differs is the scan line's text
   and two WIDTHS: the line itself and its column (§6.6). Heights and positions do not move at any width a person can
   give the window, for any public name up to about 66 characters. One layout change exists beyond that, for very long
   public names in a wide window, and §6.7 measures it.
9. **"`HELPER_USER_FLOOR` rises only if a new probe script is added."** One is added (§6.1 says why no existing probe
   could take the arms), so it rises, 159 to 160.
10. **The gate list** omits `conformance:pocket:hostile`, which `CLAUDE.md` pairs with `conformance:pocket` for
    `PhoneSection.tsx`. It is added (§7).

## 4. The words, and every reader of `SCAN_LINE`

### 4.1 The edit

```ts
/**
 * Where the phone app comes from (Phase 333.2, research 136 §5): words only,
 * never a link, a button or a badge. tortie.sh/iphone is the site's redirect,
 * which 333.7 makes on launch day; no Mac release carries this line before it.
 */
export const SCAN_LINE = 'Scan it with Tortie on your iPhone, from tortie.sh/iphone.';
```

ONE single-quoted literal on ONE line, ASCII comma and full stop, lowercase host, no scheme: `probe:p330`'s
`stringConst` (`build/p330/probe-p330.mjs:200`) and this phase's own probe both read the constant out of the source text
with a regular expression, and a concatenation or a template would break neither on purpose but is not needed.

### 4.2 Every reader, and what happens to it

A grep of the whole tree for `SCAN_LINE`, `Scan it with` and `tortie.sh` (excluding `node_modules`, `out`, `vendor`):

| Reader | Disposition |
| --- | --- |
| `src/renderer/settings/PhoneSection.tsx:83`, `:629` | The edit (§4.1). The draw site does not change |
| `src/renderer/settings/__tests__/p316-phone-section.test.tsx:519-520` | MOVES: the pin becomes the new words; new assertions in §4.3 |
| `build/p330/probe-p330.mjs:242` (`SPEC_WORDS.SCAN_LINE`) | MOVES: the fallback becomes the new words, with a one-line comment naming Phase 333.2. The probe reads the constant from the SOURCE first (`wordsFrom`, `:264-291`; A3 waits for `WORDS.scanLine` at `:1369`), so this fallback is used only when the source loses the constant; left stale it would make A3 wait 60 s for words nobody draws. `W = wordsFrom('', '', '')` (`:502`) feeds the grader fixtures, and no fixture reads `scanLine`, so `--grader-self-test` is unaffected and is run to show it |
| `build/p330/CHECKLIST.md:61` and `:213` | MOVES: §9.3 has the text |
| `build/p316/CHECKLIST.md:117`, `:231` | STAYS (§3 item 5) |
| `docs/BACKLOG.md:33603`, `:33717` | STAYS: the Phase 316 entry's copy of the 316.4 checklist, history |
| `docs/BACKLOG.md:37454-37467` | The entry itself; the main session's follow-up docs commit marks it landed |
| `docs/research/136-the-phone-in-peoples-hands.md:185` | STAYS: a dated record ("State at `984b3163`") |
| `build/p330/SPEC.md:739`, `:768`; `build/p316/SPEC.md:777`; `build/p3321/SPEC.md:1049` | STAY: specs of landed phases |
| `ios/Tortie/Style/Copy.swift` | Does not quote it (§3 item 6). Its own scan words (`pairStepScan`, `:178`) are the phone's and do not move |
| `docs/design/phone/*.html` | Does not draw it |
| `src/**` other than the two files above | Nothing. `tortie.sh` appears nowhere under `src/` today, so this is the first |

**What `conformance:phonecopy` will judge**: the `/// Mac:` and `/// Names:` lines of `Copy.swift` against
`PhoneSection.tsx` (`PHONE_TITLE`, `BTN_PAIR`, `BTN_TRY_AGAIN`, `CODE_EXPIRED`), all unchanged, so it reads exactly what
it reads at the parent. Its `--self-test` ablations include one over `PhoneSection.tsx` (`BTN_PAIR`), which this edit
does not touch.

### 4.3 The unit test (`p316-phone-section.test.tsx`)

- `:520` becomes `expect(SCAN_LINE).toBe('Scan it with Tortie on your iPhone, from tortie.sh/iphone.');`
- **New, beside it: "names where the phone app comes from in words, never a link (Phase 333.2)".** In the `showing`
  draw (`draw({ offer: offer(), view: pairing() })`): the first `<p class="phone-line">…</p>` inside the
  `phone-qr-side` block holds exactly `SCAN_LINE` and no element; `SCAN_LINE` contains `tortie.sh/iphone`, and contains
  no `://`, no `TestFlight`, no `App Store`; the scan line is still the first line of that block and `CODE_PRIVATE` the
  second.
- **New: "the sheet draws no link in any face".** Over every face the file's own fixtures already draw (door off,
  naming, ready, the unreadable line, showing, match, waiting, the confirm lines, the approval block, with and without a
  key, with the alerts on), the markup holds no `<a` and no `href=`. This is the hostile half of "text only": a later
  round that turns the words into a link fails here.

## 5. Item 2, decided

Built by 316.5, read at this head, and NOT rebuilt (§1 item 2). The builder makes no edit for it. The verifier reads it
live in arm K at both builds (§6.4) and names the lines above in its verdict. If arm K shows a switch with no key at
HEAD, that is a regression of 316.5 found by this phase's run, reported, not fixed here.

## 6. The app run: `probe:p3332`

### 6.1 Why a new probe rather than an arm in an existing one

- `probe:p3321` is the closest sibling (Settings then Phone, the stand-ins, a parent and a HEAD), but its header refuses
  the one press this phase needs: "NO PHONE, and Pair is NEVER pressed". The scan line exists only while the code shows.
- `probe:p330` presses Pair and waits for the scan line (A3), but `P330_PARENT_CHECKOUT` reads arm 1 alone, its graders
  demand a breaking fixture for every clause across a 1,000-plus line probe that his checklist cites, and adding a
  rectangle side-by-side would change Phase 330's probe contract for a one-string phase.
- `probe:p332` reaches the code at a parent, but around a 300 s resolver miss and two launches (about 15 minutes at
  HEAD); `probe:p313` and `probe:p316` drive phones and Simulators.

So `build/p3332/probe-p3332.mjs`: one launch per build, about two minutes each (not yet measured).

**It must not import another probe.** `build/p3321/probe-p3321.mjs`, `build/p330/probe-p330.mjs` and
`build/p332/probe-p332.mjs` start their run at module top level (only `--grader-self-test` exits before it), so importing
one launches an Electron. Import only libraries: `build/electron-run.mjs` (`withElectron`, `withoutDevRenderer`),
`build/cdp-client.mjs` (`wsConnect`, `cdpEval`), `build/cdp-target.mjs` (`pickRendererTarget`),
`build/probe-graders.mjs` (`gradeFixtures`), `build/p330/tailscale-standin.mjs`, `build/p332/dns-standin.mjs`,
`build/p314/apns-stand-in.mjs` (`startApnsStandIn`), `build/hidden-agents.mjs`. The attach and launch functions follow
`probe-p3321.mjs:994-1090` and `:1207-1281` (its `attachMain`, `attachSettings`, `pocket`, `status`, `waitStatus`,
`click`, `linesReady`, `allowDoor`, `launchOptions`, `launch`), copied because they close over that file's constants;
the builder names the copied blocks in the as-built so the duplicated-block scan reads them as deliberate.

### 6.2 The world, and what it refuses

- `CHECKOUT = P3332_PARENT_CHECKOUT || ROOT`; refuse (exit 2) when `<CHECKOUT>/out/main/index.js` is missing.
- Scratch world `RUN = P3332_RUN || /private/tmp/p3332-probe-<pid>`, refused unless under `/private/tmp/`: `home/`,
  `harness/` with `profile/` INSIDE it (the alerts override requires it), `standin/` outside the profile. Socket
  `gmux-p3332-<pid>`, never `gmux`.
- **Tailscale**: `makeStandin({ dir: STANDIN_DIR, scenario: { ...DEFAULT_SCENARIO } })`, `preflightStandin` before the
  launch, `watchForRealTailscale` sampling every second, `endStandinProcesses(STANDIN_DIR, 1_500)` in the `finally`.
- **DNS**: ONE `makeDnsStandin({ name: NAME, mode: 'record' })` in the probe's own process, NAME the stand-in's
  `p330-mac.tail00000.ts.net`; its `preflight` and `loopbackOnlyServers` before the launch; `GMUX_POCKET_NAME_SERVERS`
  set to its `servers`; closed in the `finally`. Main's UDP sampled with `lsof -a -p <main> -iUDP -n -P -F n` every
  2 s, any peer not `127.0.0.1` failing the run at once and ending the app (p3321's `stopIfLeaked` shape).
- **Agents**: `writeHiddenAgents(PROFILE, 'p3332')` and `hiddenAgentsPrecheck({ checkout: CHECKOUT, prefix: 'p3332',
  home: HOME, userPath: process.env.PATH })` before EACH launch (refuse on `ok: false`), then `AGENTS_LIST_EXPR` read back
  through the main window and `hiddenAgentsScanVerdict` before any arm. gemini, qwen, agy and grok are never started.
- **Alerts**: a scratch P-256 key, `generateKeyPairSync('ec', { namedCurve: 'prime256v1' })`, exported PKCS8 PEM, written
  `0600` as `<HARNESS>/alerts/AuthKey_P3332SCRAT.p8` (directory `0700`), deleted in the `finally` AND by a
  `process.once('exit')` net, as `probe-p316.mjs:2155-2163` does. Apple is `startApnsStandIn({ publicKey, topic:
  'com.itavero.tortie.phone', devices: {} })` in-process; `<HARNESS>/alerts/alerts.json` is `{ origins: apns.origins,
  keyFile }`, `0600`; `GMUX_HARNESS_ALERTS=<HARNESS>/alerts`. The stand-in is closed in the `finally`. His key is never
  read; nothing reads his keychain (`--use-mock-keychain`).
- **Launch**: `withElectron` with `userDataDir: PROFILE`, `cwd: CHECKOUT`, `tmuxSocket: SOCKET`, args
  `--remote-debugging-port=0 --use-mock-keychain --disable-backgrounding-occluded-windows --disable-renderer-backgrounding
  --disable-background-timer-throttling`, env through `withoutDevRenderer` with the inherited `CLAUDECODE`/`CLAUDE_*`
  names stripped, `HOME`, `GMUX_TMUX_SOCKET`, `GMUX_PROBES=1`, `GMUX_LOG_FILE=1`, `GMUX_SPECSTORY_NO_CLOUD=1`,
  `GMUX_CONFIG_ROOT=<PROFILE>/gmux/config`, `GMUX_HARNESS_DIR=HARNESS`,
  `GMUX_TAILSCALE_BIN=standin.binPath`, `GMUX_POCKET_NAME_SERVERS`, `GMUX_HARNESS_ALERTS`; `graceMs` 8,000,
  `ceilingMs` 600,000.
- **The sheet's network**: the Settings target is connected with `wsConnect(url, { collect:
  ['Network.requestWillBeSent'] })` and `Network.enable` is sent at attach.
- It never runs `pkill`, `killall` or a pattern, signals no process of the app's (the helper owns the app's teardown),
  installs nothing, spends no token, binds and dials nothing but `127.0.0.1`, photographs nothing and never calls
  `npm run shot`. Every visual claim is a rectangle, a computed value or a label.

### 6.3 The reader

ONE `cdpEval` on the Settings page, after a frame (`Promise.race` of `requestAnimationFrame` and a 50 ms timer, the
occlusion trap p3321 names). For `section[aria-label="Phone"]` and EVERY element under it, except the descendants of
`svg.phone-qr` (the code's modules are a random secret; the `svg` itself is read):

- `key`: the path from the section, each step `tag` + sorted classes + sorted `data-phone-*` attributes with their values
  + `#n`, the index among earlier siblings with the same step. Two builds with the same structure give the same keys.
- `r`: `{ x, y, w, h }` of `getBoundingClientRect()` minus the section's `x` and `y` (scroll-invariant), to 0.01.
- `t`: `textContent.trim()` for an element with no element children, else null; plus `aria-checked`, `aria-label`,
  `disabled` for buttons.

And beside the map: `innerWidth`, the section's `scrollWidth` and `clientWidth`, `stage` (the Pair card's
`data-phone-stage`), `qrModules` (`data-qr-modules` or null), `scanKey` (the first `p.phone-line` in `.phone-qr-side`) and
`sideKey` (`.phone-qr-side`), `qrKey`, the scan line's computed `line-height`, whether the section holds any `a` or
`[href]`, and `beside` = the side's left edge is at or right of the code's right edge (minus 0.5).

### 6.4 The arms, ONE launch per build, the same script at both

- **R, at rest.** After attach, wait for `[data-phone-action="pair"]` enabled and `[data-phone-key]` drawn; read once.
- **S, the code.** Press the sheet's own **Pair** (`[data-phone-action="pair"]`) with the door off; wait for main's
  `linesReady` and press the sheet's **Allow** (`[data-phone-action="confirm-door"]`), as `probe:p330` A3 does; wait up
  to 75 s for `[data-phone-stage="showing"]` (main's `pairable`, then the code on its own, with no other press). Read at
  the window's own width (760). Then `Emulation.setDeviceMetricsOverride({ width, height: 560, deviceScaleFactor: 0,
  mobile: false })` for 640 (the window's minimum) and 1200 (the section at its 560 cap), reading each after
  `innerWidth === width` (else that width is UNREADABLE); then **wide**: still at 1200, set the code's `style.width` to
  `243px` (the narrowest a three-pixel-module code is, version 14, §6.7), read, restore the style;
  `Emulation.clearDeviceMetricsOverride`; read once more at 760 and require it equal to the first 760 read (a sanity
  read, not graded in CMP). Then press **Cancel** (`[data-phone-action="cancel-pairing"]`). All inside the code's
  three minutes.
- **K, the key.** The door still on: read (`k0`: `Not chosen.`, no `[data-phone-alerts]`). Press **Choose…**
  (`[data-phone-action="choose-key"]`; in a harness launch with the override the file panel never opens and main
  answers the override's file); wait for main's `pushKeyId === 'P3332SCRAT'` and the key line `Key P3332SCRAT`; read
  (`k1`). Press **Forget** (`[data-phone-action="forget-key"]`); wait for `pushKeyId === null`; read (`k2`). The alert
  switch is never pressed. Then `setDoor({ on: false })` through the bridge and wait for `off`.
- **CMP, HEAD only**, against `out/p3332/probe-p3332-parent.json`.
- **RUN**, both builds, in the `finally`.

The parent writes `out/p3332/probe-p3332-parent.json`, HEAD `out/p3332/probe-p3332-head.json` (under ROOT, the tree the
probe file lives in), each holding every raw map, so a verifier can re-derive without the grader. HEAD prints the side by
side: for each reading, the scan line's and the column's rectangles at both builds, how many rectangles were compared,
how many were equal, and `beside` at both.

### 6.5 The graders (pure functions of a reading; `--grader-self-test` shows every clause red on its own break)

The probe's words are SPELLED IN THE PROBE, never read from the tree, so a constant that drifts is caught rather than
agreed with: `PARENT_SCAN = 'Scan it with Tortie on your iPhone.'`, `HEAD_SCAN = 'Scan it with Tortie on your iPhone,
from tortie.sh/iphone.'`, `CODE_PRIVATE = 'Do not show this code on a shared screen.'`, `KEY_NONE = 'Not chosen.'`,
`KEY_KEPT = 'Key P3332SCRAT'`, `PUSH_LABEL = 'Alert my phone when a session waits'`.

| Grader | Clauses |
| --- | --- |
| **R** | `stage start`; `Pair drawn`; `the key row drawn` (`[data-phone-key]`, text `KEY_NONE`); `no switch without a key` (no `[data-phone-alerts]`); `no link` (no `a`, no `[href]` in the section); `inside the section` (`scrollWidth <= clientWidth`) |
| **S** | `stage showing` at every width; `the scan line's words` (`HEAD_SCAN` at HEAD, `PARENT_SCAN` at the parent, exactly); `text only` (the scan line is a `P` with no element child, and no `a`, `[href]` or `button` in the section holds `tortie.sh`); `the private line after it` (the next `p.phone-line` is `CODE_PRIVATE`); `one line at every width` (scan `h <= line-height + 0.5` at 640, 760 and 1200); `inside the section at every width` (no element's right edge past the section's width + 0.5, `scrollWidth <= clientWidth`); `the same code at every width` (`qrModules` equal across the readings) |
| **K** | `no switch before a key`; `the key kept` (`KEY_KEPT`, and main's `pushKeyId`); `the switch with a key` (`[data-phone-alerts]` drawn, its label `PUSH_LABEL`, `aria-checked="false"`, enabled with the door on); `no switch after Forget` (`KEY_NONE`, no `[data-phone-alerts]`); `no new Allow` (main's `confirmState` the same in k0, k1, k2) |
| **CMP** | `the parent reading is the parent's` (its `atParent` true, its checkout not ROOT, its S words `PARENT_SCAN`); `the same elements` (identical key sets, reading for reading); `rest unchanged` (R maps equal: every rectangle within 0.5 and every text equal); `only the scan line and its column widen` (at 640, 760 and 1200: the keys whose rectangle differs by more than 0.5 are EXACTLY `scanKey` and `sideKey`, each differing in `w` alone, HEAD's scan `w` greater than the parent's, HEAD's column `w` within 0.5 of HEAD's scan `w`); `the words unchanged but the scan line` (every text equal except the scan line's, `[data-phone-countdown]` and `[data-phone-name-time]`, which are clocks); `the same placement at every real width` (`beside` equal at 640, 760, 1200); `the key arm unchanged` (k0, k1, k2 maps equal at both builds) |
| **RUN** | `the Tailscale preflight`; `the DNS preflight, loopback alone`; `the hidden agents resolve nowhere` (precheck and scan); `no real Tailscale` (findings 0, samples > 0); `no forbidden argv`; `UDP to 127.0.0.1 alone` (leaks 0, samples > 0); `every DNS question an A, RD 0, for the name` (`nameQuestionProblems` empty, total > 0); `the sheet asked nothing off the Mac` (no collected `Network.requestWillBeSent` URL with an `http`, `https`, `ws` or `wss` host other than `127.0.0.1`, `localhost` or `[::1]`, and none naming `tortie.sh`); `nothing reached Apple's stand-in` (`requests.length` 0 and both `connections` 0); `app.log holds no key and no name` (no `-----BEGIN`, no line of the PEM body, no NAME, no `203.0.113.10`); `the key file is gone`; `every stand-in ended` (`left` empty, DNS and APNs stand-ins closed); `no Electron left` (p3321's census, `Electron`, `Tortie$`, `chrome_crashpad`, by the launches' pids or the profile path) |

**The wide reading is reported, not failed** (§6.7): CMP prints `beside` for it at both builds and the verifier names it.

Before the first arm a precondition, not a clause: `innerWidth` 760 and `qrModules` equal at both builds. If either
differs, CMP is UNREADABLE (exit 2) with that sentence, because the two builds were not laid out alike for a reason
outside this phase.

Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or an arm could not be READ, which is never a
pass. Self-test output names graders and clauses, as p3321's does.

### 6.6 The prediction, re-derived by a different engine

CoreText (`NSString.size(withAttributes:)`, `NSFont.systemFont(ofSize: 12)`, which is `--font-ui` at `--text-sm`),
measured for this SPEC with a nine-line Swift script:

| String | Width |
| --- | --- |
| `Scan it with Tortie on your iPhone.` | 192.82 |
| `Scan it with Tortie on your iPhone, from tortie.sh/iphone.` | 318.49 |
| `Do not show this code on a shared screen.` | 240.41 |
| `Shuts in 2:59` (monospaced 12) | 96.43 |

The stand-in's 25-character name makes a version 13 code, 77 modules with the quiet zone, 4 px each: 308 px. The code's
block has `min(560, W − 248) − 26` px of content (W the window width: nav 200, padding 2 × 24, card border 2, block
padding 2 × 12).

- At **760**: 486 px. The column beside the code would need 308 + 16 + 240.4 = 564.4 at the parent, so it already sits
  UNDER the code there, on its own line. At HEAD it is still under the code, and 318.5 < 486, so the scan line is one
  line.
- At **640**: 366 px, and 318.5 < 366: still one line, 47.5 px to spare.
- At **1200**: 534 px; beside would need 564.4 at the parent and 642.5 at HEAD: under at both.

So at every real width the only rectangles that move are the scan line (about 192.8 → 318.5) and `.phone-qr-side`
(about 240.4 → 318.5), in width alone; x, y and h of everything are unchanged. CMP's rule is that, exactly. The verifier
holds the probe's widths to these within 2 px.

For his own name (`gregs-macbook-pro.tail2ddfe1.ts.net`, 35 characters) the code is also version 13 (byte mode at medium
holds 331 bytes; the payload is about 265 bytes plus the name), so his sheet behaves as the stand-in's does.

### 6.7 The one layout change beyond widths, measured rather than assumed

Public names longer than about 66 characters make a version 14 to 16 code at 3 px a module, 243 to 267 px wide. At the
parent such a code leaves room for the 240.4 px column beside it once the window is wider than about 774 to 798 px; at
HEAD the 318.5 px column never fits beside any code (243 + 16 + 318.5 = 577.5 > 534). So for those names in a wide
window, HEAD moves the words from beside the code to under it, the face every shorter name already has at every width,
and the block grows by about the column's height plus 16 px. The **wide** reading in S forces a 243 px code at 1200 to
measure exactly this at both builds. Predicted: parent `beside` true, HEAD false.

The decision: **accepted, and named** in the commit body and the verdict, because the new face is the one every
ordinary name already gets, nothing is cut off and nothing overflows; a CSS change to keep the parent's beside-layout
(capping the column, or letting it shrink) would wrap the new line onto two lines at every width, which is worse for
everyone. If the operator rules otherwise it is a follow-up, not this phase.

## 7. The gates

**The builder** (no Electron, no lock), each with its exit code and the numbers it prints:

```
npm run -s typecheck
npx vitest run src/renderer/settings          # then the full: npm test
node build/p3332/probe-p3332.mjs --grader-self-test
node build/p330/probe-p330.mjs --grader-self-test
npm run -s conformance:pocket
npm run -s conformance:pocket:hostile
npm run -s conformance:phonecopy
npm run -s build                              # gate:electron must read 160 of a floor of 160; gate:checks, gate:background,
                                              # gate:contract (no line moves) run inside it
```

Plus the duplicated-block scan over `build/p3332/probe-p3332.mjs` against `build/p3321/probe-p3321.mjs`, with the copied
blocks named.

**The verifier** (THE LOCK, §8): `npm run smoke:t1`, the two probe runs, and the battery once (typecheck, build, test,
the three conformance gates).

**Path-triggered runs, decided.** `CLAUDE.md` lists `PhoneSection.tsx` among the triggers of `probe:p313` and
`probe:p330`. Neither app run is made: this phase moves one string, `probe:p313` reads no word it moves, and
`probe:p330` reads it only through `wordsFrom` from the source, which its `--grader-self-test` exercises; `probe:p3332`
drives the moved line in the real app at both builds. Tier 2's budget is one app run, and this is it. `ablation:p313`
is not run: no `conformance:pocket` clause reads `SCAN_LINE`. `conformance:pocket`'s `T1` loopback rule reads paths
matching `pocket|p313|p330|p332`, which does not cover `build/p3332/`; it is not widened here, because the new probe
calls no `listen`, `bind` or `connect` of its own (its sockets are the DNS and APNs stand-ins' own, in their own files,
and CDP on 127.0.0.1).

## 8. The verifier

**Tier 2. Independent method: the parent measurement** (`probe:p3332` at `2a4d1ec5`, then at HEAD, compared by CMP).
The governing rule asks for one thing the builder did not do; the builder launches no Electron, so both runs are that.
Recommended beside it, cheap: **re-derive** the CMP from the two JSON reports with a reader of the verifier's own
(not the probe's grader), and hold the measured widths to §6.6's CoreText numbers by a measurement of its own.

1. **The parent checkout, written outside his repository.**
   ```
   git clone --quiet --no-checkout /Users/gdc/gmux /private/tmp/p3332-parent
   git -C /private/tmp/p3332-parent checkout --quiet --detach 2a4d1ec5
   cp -Rc /private/tmp/wt-p3332/node_modules /private/tmp/p3332-parent/
   cp -Rc /private/tmp/wt-p3332/build/vendor /private/tmp/p3332-parent/build/
   (cd /private/tmp/p3332-parent && npm run -s build)
   ```
   The clone reads his repository and writes only under `/private/tmp/p3332-parent`; nothing is committed, staged or
   stashed anywhere. Removed at the end with `rm -rf /private/tmp/p3332-parent`.
2. **THE LOCK.** Phone phases go first: while
   `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/electron.phone-wait` holds any
   file, do not take it. Then `mkdir <scratchpad>/electron.lock && echo p3332 > <scratchpad>/electron.lock/owner`; on
   failure wait 60 s and retry in a NEW command, for up to 240 minutes. Release with `rm -rf <scratchpad>/electron.lock`
   on the SAME command line as the work.
3. **Under the lock, in this order** (a build after the parent run could empty `out/`, so nothing builds between them):
   `npm run -s smoke:t1` at HEAD; then
   `P3332_PARENT_CHECKOUT=/private/tmp/p3332-parent node build/p3332/probe-p3332.mjs`; then
   `node build/p3332/probe-p3332.mjs`. Each exit code recorded.
4. **Count once, at the end**: `ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`,
   each line traced to a run of its own or not; `tmux -L gmux-p3332-<pid> ls` answers no server; the key file and the
   scratch world are gone.
5. **The verdict names**: the scan line's words read live at both builds; every reading's compared and equal counts; the
   two moved widths at 640, 760 and 1200 against §6.6; the wide reading's `beside` at both builds (§6.7); arm K at both
   builds with `pushSwitchShown`'s lines (§1 item 2); RUN's network and APNs clauses; and that nothing requested
   `tortie.sh`.

## 9. The builder: ONE builder owns every file

### 9.1 Files, complete

| File | Change |
| --- | --- |
| `src/renderer/settings/PhoneSection.tsx` | §4.1, and nothing else |
| `src/renderer/settings/__tests__/p316-phone-section.test.tsx` | §4.3 |
| `build/p330/probe-p330.mjs` | `SPEC_WORDS.SCAN_LINE` to the new words, with `// Phase 333.2 moved the scan line (build/p3332/SPEC.md).` |
| `build/p330/CHECKLIST.md` | §9.3 |
| `build/p3332/probe-p3332.mjs` | NEW, §6 |
| `build/p3332/SPEC.md` | the builder appends `## §As built — 333.2` |
| `package.json` | `"probe:p3332": "node build/p3332/probe-p3332.mjs",` directly after `probe:p3321` (`:99`) |
| `build/verification-checks.mjs` | `electron('probe:p3332')` directly after `electron('probe:p3321')` (`:667`), with §9.2's comment |
| `build/assert-electron-teardown.mjs` | `HELPER_USER_FLOOR` 159 → **160**, with §9.2's paragraph above it |
| `CLAUDE.md` | a `probe:p3332` row directly after `probe:p3321`'s in "Probes and app runs" (§9.2) |
| `CHANGELOG.md` | NOT edited in the phase commit (§9.4) |

Not touched: `docs/BACKLOG.md` (the main session's follow-up docs commit), `build/p316/CHECKLIST.md`, any SPEC of a
landed phase, `src/shared/**`, `ios/**`, `docs/design/**`, `build/conformance-pocket.mjs`, `build/p3321/**`,
`build/p332/**`, `build/p330/tailscale-standin.mjs`, `build/p314/**`, `build/hidden-agents.mjs`.

### 9.2 The shared-file text

`build/assert-electron-teardown.mjs`, after the Phase 332.1 paragraph:

```
 * PHASE 333.2 RAISED IT FROM 159 TO 160, for build/p3332/probe-p3332.mjs
 * (`probe:p3332`), the scan line that names where the phone app comes from,
 * read at the parent and at HEAD: ONE Electron per build through the helper,
 * on a scratch profile, a scratch HOME and the socket gmux-p3332-<pid>, with
 * one build/p332/dns-standin.mjs and Phase 314's APNs stand-in in the probe's
 * own process on 127.0.0.1, closed in its `finally`, a scratch key deleted
 * there, and the stand-in Tailscale's pids ended by pid there.
```

`build/verification-checks.mjs`:

```
  // PHASE 333.2's app run, and the parent measurement: Settings then Phone's
  // scan line names tortie.sh/iphone, in words. ONE Electron per build through
  // build/electron-run.mjs's withElectron, on a scratch profile, a scratch HOME
  // and the socket gmux-p3332-<pid>, with build/p330/tailscale-standin.mjs
  // behind its preflight and sampler, ONE build/p332/dns-standin.mjs and
  // build/p314/apns-stand-in.mjs IN THE PROBE'S OWN PROCESS on 127.0.0.1, a
  // scratch P-256 key under GMUX_HARNESS_ALERTS deleted in the `finally`, and
  // build/hidden-agents.mjs before the launch. It presses the sheet's own Pair,
  // Allow, Cancel, Choose… and Forget and reads every rectangle of the section.
  // No phone, no agent, no token. `--grader-self-test` grades recorded fixtures
  // and starts nothing. P3332_PARENT_CHECKOUT reads the same arms at a parent.
  electron('probe:p3332'),
```

`CLAUDE.md`, the probes table:

```
| `probe:p3332` | `SCAN_LINE` and the code's face (`.phone-showing`, `.phone-qr-side`) in `src/renderer/settings/PhoneSection.tsx` and `phone-section.css`, `pushSwitchShown`, or `build/p3332/**` | about 2 min a build, not yet measured; ONE Electron per build, the parent's first (`P3332_PARENT_CHECKOUT`), on a scratch profile, HOME and socket `gmux-p3332-<pid>`; the Tailscale stand-in behind its preflight and sampler, ONE `build/p332/dns-standin.mjs` and Phase 314's APNs stand-in in the probe's own process, main's UDP sampled with `lsof`, a scratch P-256 key under `GMUX_HARNESS_ALERTS` deleted in the `finally`, `build/hidden-agents.mjs` before the launch. It presses the sheet's own Pair and Allow until the code shows, reads every rectangle and word of Settings then Phone at rest, at 640, 760 and 1200 pixels and with a 243 px code, then Choose… and Forget; at HEAD every rectangle equals the parent's but the scan line's and its column's widths. No phone, no agent, no token, no request off the Mac. `--grader-self-test` starts nothing. Verifiers only, under the lock |
```

### 9.3 `build/p330/CHECKLIST.md`

- `:61`: `"Scan it with Tortie on your iPhone." and` becomes `"Scan it with Tortie on your iPhone, from tortie.sh/iphone."
  (that address opens nothing until launch day) and`, the rest of the row unchanged.
- `:213`: the quoted line becomes the new words, `SCAN_LINE` and `CODE_PRIVATE` get the line numbers they have AFTER
  §4.1's edit (read them; the comment moves `CODE_PRIVATE` down), and the row ends `Driven against the stand-in by
  probe:p330 A3, and side by side with the parent by probe:p3332 S`.

### 9.4 The CHANGELOG, decided

No new item and no word changed, in the operator's style and on research 136 §11.5 and Phase 333.7's mechanism 8:

- The line adds nothing a person can do before 333.7: `tortie.sh/iphone` answers 404 until launch day, and no Mac release
  carries this commit before then.
- The iPhone item (`CHANGELOG.md:12`) already says "scan the code", and its last clause, "and the app is on TestFlight
  rather than the App Store", is the one that says where the app is. 333.7 changes it to "and the app is a public beta
  on TestFlight, linked from tortie.sh", in words and on his word. Writing it now would put a claim about a public link
  into the file before the link exists.
- Every commit appears once: the follow-up docs commit that writes the running-log line appends
  `` ([`<hash8>`](https://github.com/gregce/tortie/commit/<hash8>)) `` after the item's last link, as `9d1a3001`'s link
  was added to the same item with no word changed.

## 10. What is NOT in this phase

- No link, button, badge, QR or Apple logo for the store in the sheet; the line is not made selectable.
- No change to when the line is drawn: only under the code, as today.
- No alert behaviour change and no edit for item 2 (316.5 did it).
- No contract field, no `gate:contract` baseline change, no menu change.
- No request to `tortie.sh`, by anything, in any run.
- No CSS change, so the long-name face of §6.7 is accepted rather than worked around.
- No release, no tag, no CHANGELOG word.
- No edit to `build/p316/CHECKLIST.md`, research 136, or any landed SPEC.

## 11. Open concerns handed to the verifier

1. **The wide reading (§6.7)** is the one placement change. Confirm its two readings and say in the verdict whether you
   judge it worse; the default is that it is not.
2. **CoreText against Chromium.** §6.6's widths are CoreText's; Chromium shapes the same face and should agree within a
   pixel or two. A difference larger than 2 px means a different font reached the page, and the 640 margin (47.5 px)
   should be re-read before trusting "one line at every width".
3. **A person without the app** reads the line while a three-minute code counts down; installing through TestFlight can
   outlast it, and Pair again gives a new code (`CODE_EXPIRED` says so). Not changed here; worth a sentence if you see it
   bite.
4. **`out/` and the order of runs** (§8 step 3): a build between the parent run and the HEAD run can remove the parent's
   report, which CMP then reads as UNREADABLE, never as a pass.

## §As built — 333.2

Built by the one builder in `/private/tmp/wt-p3332` at `2a4d1ec5`. **This was a restarted workflow.** An earlier run of this
builder had already made most of the edits below in the worktree, and then stopped before it ran the gates or wrote this
section. This run read every one of those edits against §4 and §9 before keeping it. It then changed the probe in six
places (listed below) and the checklist in one, ran every builder gate in §7, and ablated every unit-test clause.
Nothing was committed, staged or stashed. No Electron was launched, and nothing made a request off the Mac.

### Files changed (8 modified, 1 new; `git diff --stat`: 140 insertions, 6 deletions, plus the new probe)

| File | What |
| --- | --- |
| `src/renderer/settings/PhoneSection.tsx` | §4.1 exactly: the JSDoc, and `SCAN_LINE` = `'Scan it with Tortie on your iPhone, from tortie.sh/iphone.'`, now at `:88` (`CODE_PRIVATE` `:90`, drawn at `:634`). Nothing else |
| `src/renderer/settings/__tests__/p316-phone-section.test.tsx` | The pin (`:520`) gets the new words. New test `:524`, "names where the phone app comes from in words, never a link (Phase 333.2)". New `describe` `:1317`, "the sheet draws no link in any face", which checks 23 faces (no `<a`, no `href=`) plus "reached the scan line" (the two `showing` faces draw it). The file has 79 tests at the parent and 104 at HEAD, so 25 are new |
| `build/p330/probe-p330.mjs` | `SPEC_WORDS.SCAN_LINE` gets the new words, with `// Phase 333.2 moved the scan line (build/p3332/SPEC.md).` |
| `build/p330/CHECKLIST.md` | `:61` and `:213` as §9.3 says. `:213` names `SCAN_LINE` `:88` and `CODE_PRIVATE` `:90` |
| `build/p3332/probe-p3332.mjs` | NEW, 1,325 lines, §6 |
| `build/p3332/SPEC.md` | this section |
| `package.json` | `"probe:p3332"`, directly after `probe:p3321` |
| `build/verification-checks.mjs` | §9.2's comment and `electron('probe:p3332')`, directly after `electron('probe:p3321')` |
| `build/assert-electron-teardown.mjs` | §9.2's paragraph. **`HELPER_USER_FLOOR` 159 → 160** |
| `CLAUDE.md` | §9.2's `probe:p3332` row, directly after `probe:p3321`'s |
| `CHANGELOG.md`, `docs/BACKLOG.md` | NOT edited (§9.4) |

### Decisions, and where each comes from

1. **Item 2 is already built, so nothing was added for it** (§1 item 2, §5). Phase 316.5 built it, and the code at this
   head shows that:
   - `pushSwitchShown` (`PhoneSection.tsx:417-419`) answers `pushKeyId !== null || pushAlerts`.
   - The switch row `[data-phone-alerts]` (`:896`) is drawn only behind it.
   - Three tests cover it in `describe('the Apple push key (Phase 316.5, research 136)')` (now at `:737`): with no key there
     is no switch, with a key kept there is a switch, and with alerts already on and no key there is a switch, so it can
     be turned off.

   The probe's arm K reads this live at both builds.
2. **The probe imports no other probe** (§6.1). It imports `electron-run`, `cdp-client`, `cdp-target`, `probe-graders`,
   `hidden-agents`, `p330/tailscale-standin`, `p332/dns-standin` and `p314/apns-stand-in`, all of them libraries.
3. **Changes to the earlier run's probe.** None of these changes a clause or a word the probe grades:
   - **S waits until Cancel can be pressed** before its first reading, not only until the code shows. **K waits until
     Choose… can be pressed** before `k1` and `k2`. Every button on the sheet is `disabled={busy}`. Main's broadcast can
     redraw the key row while the Choose… press is still running (`onChooseKey` in `PhoneSection.tsx`). So a reading
     taken then would differ between the builds in a button's `disabled`, and CMP's "the words unchanged but the scan
     line" would fail for a reason that has nothing to do with this phase.
   - **The sheet's network and exceptions are read in the inner `finally`.** In the earlier run they were read after the
     last arm, so a run that threw part way left `urls` empty while `networkRead` was true. RUN would then have passed
     requests nobody graded.
   - **CMP treats an arm that the PARENT could not read as missing.** That makes CMP UNREADABLE. Before this change it
     only looked at HEAD's arms, and a parent S that was UNREADABLE but had left a partial reading would have been graded.
   - **An `exit` net ends the stand-in Tailscale's processes** with `endStandinProcesses(STANDIN_DIR, 500)`. This is in
     addition to the `finally`, for a run the helper ends with `process.exit`. It is synchronous and works by pid, and it
     signals only processes whose command line names the stand-in file.
   - **The self-test has two more rows**, so a clock's key is recognised in the form the live DOM draws. React draws a
     bare `data-*` attribute as `="true"`, so the live key reads `p.phone-countdown[data-phone-countdown=true]#0`.
     `isClockKey` already accepted that form, and the self-test now shows it.
4. **`build/p330/CHECKLIST.md:213` keeps the table's backticks** around `probe:p330` and `probe:p3332`. §9.3's text has
   none, but every other row in that table uses them, and so did this row before the edit. This is the one difference
   from the SPEC's text, and it changes formatting only.
5. **`build/p316/CHECKLIST.md`, research 136 and the landed SPECs are left as they are** (§3 item 5, §4.2).

### Commands, exit codes and numbers (all at this tree, no Electron)

| Command | Exit | What it printed |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | import boundaries: 1,384 production files, 7,839 imports, 0 violations. No runtime cycles: 4,759 edges, 0 SCCs. shared-types OK |
| `npx vitest run src/renderer/settings` | 0 | 35 files, 798 tests passed |
| `npx vitest run …/p316-phone-section.test.tsx` | 0 | 104 tests (79 at the parent's file, measured in the scratch copy) |
| `npm test` | 0 | 1,028 files passed, 1 skipped; 18,051 tests passed, 7 skipped; 52.7 s |
| `node build/p3332/probe-p3332.mjs --grader-self-test` | 0 | 5 graders, 38 clauses, each shown red on its own break; 95 `ok` lines, 0 `FAIL` |
| `node build/p330/probe-p330.mjs --grader-self-test` | 0 | 14 graders, 103 clauses; 123 `ok`, 0 `FAIL` |
| `npm run -s conformance:pocket` | 0 | 53 rules, 12,422 checks, 2.95 s |
| `npm run -s conformance:pocket:hostile` | 0 | 96 arms, 0.57 s |
| `npm run -s conformance:phonecopy` | 0 | `Copy.swift`: 63 words, 34 judged against their Mac owner (floor 30), 4 Mac controls (floor 3). 7 screens, 162 segments, 34 owned rules (floor 34). 16 self-test ablations behaved. It judges no `SCAN_LINE` (§3 item 6) |
| `npm run -s build` | 0 (41 s) | **gate:electron: 505 files read, 160 reach the helper, against a floor of 160.** gate:background: 507 files, 4 starters, each ended in a `finally`, 19 of 19 fixtures. gate:simulator PASS. gate:checks: 248 check scripts classified. conformance:ios PASS, 22 rules. **contract-inventory OK byte for byte** (no contract line moved) |

`npm run build` replaced `out/`. That is harmless here, because no parent report exists yet. A verifier must still build
nothing between its two probe runs (§8 step 3).

### The unit tests' clauses, each shown to fail (in a scratch copy, never the worktree)

These ran in a scratch copy of `src/` and the configs, with `node_modules` linked, under
`<scratchpad>/p3332/builder/abl`. Each ablation edits `PhoneSection.tsx` there, runs the test file, and then restores
it. The restore was checked by sha256, and the copy matches the worktree byte for byte. All 13 ablations made the
expected tests fail:

| Ablation | Failed, first message |
| --- | --- |
| the parent's words back | the pin (`toBe`) and the new test (`to contain 'tortie.sh/iphone'`) |
| `https://` in the words | the new test, `not to contain '://'` |
| TestFlight named | `not to match /TestFlight/i` |
| the App Store named | `not to match /App Store/i` |
| the scan line made an `<a href>` | the new test (`toBe` SCAN_LINE) and "holds no <a and no href=: showing" |
| the scan line wrapped in a `<span>` | the new test, `'<span>Scan it…' to be 'Scan it…'` |
| the private line drawn first | the new test, first line `to be` SCAN_LINE |
| a line between the scan line and the private line | the new test, second line `to be` CODE_PRIVATE |
| an element above the scan line in its column | the new test, `expected 66 to be 27` (the scan line is not the column's first child) |
| the column's class renamed | the new test, `expected -1 to be greater than or equal to 0` |
| the scan line not drawn | the pin test, the new test and "reached the scan line" |
| an `<a href>` in the key row | 22 face tests (every face with a status), e.g. "door off", "with no key", "showing" |
| an `href=` on a `span` | 22 face tests, `not to contain 'href='` |

### The reader, run over both builds' real markup (no Electron)

`SECTION_READER` was read out of the probe's source text and run with `vm` over a small fake DOM of my own (a parse5
tree; the rectangles are made up). The DOM held three faces, `rest`, `showing` and `k1`. Each face's markup came from
`PhoneView` rendered by vitest, in the scratch copy, at the parent's `PhoneSection.tsx` and at HEAD's.

- At both builds the key sets are identical in all three faces (26, 30 and 33 elements).
- The ONLY element whose text differs is `… > div.phone-qr-side#0 > p.phone-line#0`.
- `scanKey` is the same at both builds.
- `scanText` reads the parent's words at the parent and HEAD's at HEAD.

The rectangles in this run were made up, so it proves nothing about geometry. Geometry is the verifier's app run.

### The duplicated-block scan (≥ 10 identical trimmed lines, my own scanner)

Against `build/p3321/probe-p3321.mjs` there are 8 runs, 174 of 1,325 lines. Each one is copied on purpose (§6.1), because
it closes over the probe's own constants:

1. `grade(id, reading)`
2. `udpPeerOf`/`udpOf`
3. `arm`/`cannotRead`
4. the UDP sampler (`udp`, `sampleUdp`, the timer, `stopIfLeaked`, the head of `waitFor`)
5. `INHERITED_CLAUDE`, `devtoolsPort`, `targets`, `attachMain`
6. `pocket`, `status`, `waitStatus`, `click`, `linesReady`, `allowDoor`
7. `launchOptions`' args and env
8. `launch`'s `withElectron` body (`rec`, `appPidNow`)

The census in the `finally` (`commandOfPid`, `ours`) is p3321's too. At 7 lines it is under the threshold.
`attachSettings` is p3321's as well, with `Network` collected.

The other probes overlap too: `probe-p332.mjs` in 7 runs (140 lines), `probe-p330.mjs` in 2 runs (35 lines), and
`probe-p316.mjs` not at all. `grade` is now word for word the same in p332, p3321 and p3332, so it is a candidate for
`build/probe-graders.mjs`. That would mean editing files this builder does not own, so it is named here and not done.

### What I could not do, and why

- **No app run.** Builders launch no Electron, so arms R, S, K, CMP and RUN have not been run. Neither has
  `smoke:t1`. The probe's live path is checked only three ways: by the self-test, by the dry reader run above, and by
  reading its library calls against each library's exports and return shapes. Those are `withElectron`'s handle
  (`pid`, `appPid`, `text`), `wsConnect` `collect` and `events()`, the stand-ins' `preflight`, `servers`, `log`,
  `closed`, `close`, `requests`, `connections`, `origins`, `readLog` and `samples`, and `hiddenAgentsPrecheck` and
  `hiddenAgentsScanVerdict`'s `{ ok, said }`.
- **§6.6's CoreText widths were not measured again.** That is the verifier's step (§8).
- **The probe's timing is not measured.** "About two minutes a build" is still a guess.

### What the entry or this SPEC got wrong (beyond §3)

- §9.3's replacement text for `:213` leaves out the backticks the table uses everywhere else (decision 4).
- §6.3 says "sorted `data-phone-*` attributes with their values". The live DOM draws a bare attribute's value as `true`,
  so a key reads `[data-phone-countdown=true]` and not `[data-phone-countdown]`. Every reader here accepts both forms,
  and a verifier re-deriving keys should expect the `=true` form.

## §As built — 333.2, the integrator

Reconciled at `2a4d1ec5` in `/private/tmp/wt-p3332`, one builder, so there was nothing to merge. No Electron was launched,
nothing was committed, staged or stashed, and nothing made a request off the Mac. The integrator edited this section and
no other file.

### Reconcile

- **Every spelling of the scan line, grepped** (`Scan it with`, `SCAN_LINE`, `scanLine`, `tortie.sh`; `node_modules`, `out`
  and `vendor` left out). The old words remain only where §4.2 says they stay: `docs/BACKLOG.md:33603` and the entry itself,
  `docs/research/136-the-phone-in-peoples-hands.md:185`, `build/p316/CHECKLIST.md:117`, `build/p316/SPEC.md:777`,
  `build/p330/SPEC.md:768`, and the probe's own `PARENT_SCAN`. Everything that should have moved has moved:
  `PhoneSection.tsx:88`, the pin at `p316-phone-section.test.tsx:520`, `probe-p330.mjs:243`, and `CHECKLIST.md:61` and `:213`.
  `ios/` and `docs/design/` hold no copy.
- **`probe:p330` still reads the new words from the source.** Its own `literalAt`, `concatAt` and `stringConst`, lifted
  out of the file and run with `vm` over the new `PhoneSection.tsx`, return `"Scan it with Tortie on your iPhone, from
  tortie.sh/iphone."`. So A3 waits for the words the sheet draws, and the `SPEC_WORDS` fallback is never reached.
- **The bundle**: after `npm run build`, `out/renderer/assets/settings-*.js` is the one file holding `from
  tortie.sh/iphone.`, and the phrase `Scan it with Tortie on your iPhone` occurs once in `out/`. No `http://tortie.sh` or
  `https://tortie.sh` appears anywhere under `out/` or `src/`.
- **Item 2 is confirmed from the code, and nothing was built for it.** `pushSwitchShown` (`PhoneSection.tsx:417-419`)
  returns `status.pushKeyId !== null || status.pushAlerts`. The switch row `[data-phone-alerts]` is drawn only behind it
  (`:895`). `pushKeyId` is main's fact (`src/shared/ipc/pocket.ts:529`, filled at `src/main/pocket/ipc.ts:760`). The tests
  are in `describe('the Apple push key …')` at `:737`.
- **The duplicated-block scan, by another method.** I used a scanner of my own: windows of 10 non-blank lines that are not
  bare punctuation, looked up in every `build/**` script. It finds 7 runs and 129 lines. Every run is in
  `probe-p3321.mjs`, `probe-p332.mjs` or `probe-p330.mjs`, and each is one of the copies the builder named (`grade`,
  `arm`/`cannotRead` and the self-test's `failures`, the UDP sampler, the attach block, the `pocket`…`allowDoor` block,
  `launchOptions`' args, and `launch`'s body). No other file shares a block with the new probe.
- **`conformance:pocket` read 12,429 checks here and 12,422 in the builder's log.** The whole difference is `U5`: 8 checks
  here against 1 there. `U5` reads the built `out/main/pocket-door.js` and is skipped when `out/` is absent, and the
  builder ran it before its build. No rule changed.

### Commands, exit codes and numbers (no Electron)

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 1,384 production files, 7,839 imports, 0 violations; 4,759 runtime edges, 0 SCCs; shared-types OK |
| `npx vitest run src/renderer/settings` | 0 | 35 files, 798 tests |
| `npx vitest run …/p316-phone-section.test.tsx` | 0 | 104 tests |
| `npm run -s conformance:pocket` | 0 | 53 rules, 12,429 checks, 2.62 s |
| `npm run -s conformance:pocket:hostile` | 0 | 96 arms, 0.43 s |
| `npm run -s conformance:phonecopy` (this script is `--self-test`) | 0 | `phonecopy OK`, every self-test ablation red, and the control green |
| `npm run -s conformance:ios` | 0 | 22 rules, 23 app files, 18 test files, 50 files under `ios/` |
| `npm run -s gate:contract` | 0 | the inventory matches the baseline byte for byte |
| `npm run -s gate:checks` | 0 | 248 check scripts classified |
| `npm run -s gate:electron` | 0 | 505 files read, **160 reach the helper against a floor of 160** |
| `npm run -s gate:background` | 0 | 507 files, 4 starters, each ended in a `finally`; 19 of 19 fixtures |
| `node build/p3332/probe-p3332.mjs --grader-self-test` | 0 | 5 graders, 38 clauses; 95 `ok`, 0 `FAIL` |
| `node build/p330/probe-p330.mjs --grader-self-test` | 0 | 14 graders, 103 clauses; 123 `ok`, 0 `FAIL` |
| `npm run -s build` (once) | 0 (32 s) | gate:electron 160 of 160, gate:background 19 of 19, gate:simulator PASS, known-hosts PASS, hermetic checks 248, conformance:ios 22 rules, contract-inventory byte-identical |
| `npm test` | 0 (84 s) | 1,028 files passed and 1 skipped; 18,051 tests passed and 7 skipped |

After the build there is no `out/p3332/` and no `/private/tmp/p3332-*`, so no stale parent report can be read by CMP.

### Open concerns for the verifier

1. **The probe has never run live.** The R, S, K, CMP and RUN arms, and `smoke:t1`, are all yours, under the lock. The
   order in §8 step 3 matters: `smoke:t1` runs `npm run build` itself, so it must come BEFORE the parent run. Build
   nothing between the parent run and the HEAD run, or CMP reads UNREADABLE. The parent clone needs its own `out/`
   (`npm run -s build` inside `/private/tmp/p3332-parent`).
2. **First-run timings are guesses.** S allows 45 s for main's door lines and 75 s for the code after Allow. K allows 20 s
   for Choose… and for Forget. If an arm reads UNREADABLE on time alone, say so. Do not loosen a clause to make it pass.
3. **Keys carry `=true` for bare attributes.** Expect `[data-phone-countdown=true]` and `[data-phone-name-time=true]` in
   the live keys (as built, §6.3). If you re-derive CMP from the two JSON reports with a reader of your own, treat those
   two as clocks. On the ready face after Cancel the name block (`[data-phone-name]`, "Took N min") can be drawn in k0 to
   k2 at both builds, and its time line is a clock.
4. **The wide reading (§6.7)** is reported and not failed. Name both `beside` values, and say whether you judge it worse.
5. **CoreText against Chromium (§6.6, §11.2).** Hold the two moved widths at 640, 760 and 1200 to within 2 px of the
   predicted 192.82 → 318.49 for the line and 240.41 → 318.49 for its column. The 640 margin (47.5 px) is the reason
   "one line" holds.
6. **RUN's network clause sees only requests after the attach.** Requests made while the page loaded are not collected.
   That is acceptable here, because the line is a text node with no link, and the unit test proves no face draws an
   `<a` or an `href=`. Say so if you rely on it.
7. **Stale line numbers in the same checklist, outside this phase's two rows.** `build/p330/CHECKLIST.md:212` cites
   `DOOR_OPENING` `:61` and `doorListening` `:103`, which sit at `:71` and `:233` both at the parent and here. That
   row was already stale before this phase, and §9.3 assigns only `:61` and `:213`, so I left it as it is. It is a
   follow-up for whoever next edits the checklist.
8. **`grade` is now the same, word for word, in `probe-p332.mjs`, `probe-p3321.mjs` and this probe.** It is a candidate
   for `build/probe-graders.mjs` in a later round. That would edit files this phase does not own, so it is named here
   and not done.
9. **The commit body has to say that no release carries this before 333.7.** `tortie.sh/iphone` opens nothing until then.
   CHANGELOG.md and docs/BACKLOG.md are untouched (§9.4).
