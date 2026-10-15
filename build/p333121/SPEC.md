# Phase 333.12.1 — "can we make this screen and text more sleek and to the point like how we redesigned the connection screen": the phone's Allow, one line per fact — SPEC

Written by the spec step on 2026-10-15 in `/private/tmp/wt-p333121`, a detached worktree at origin/main `576f1908`
("docs(backlog): 333.12 landed, 333.12.2 queued"). **The parent is `576f1908`**: its source is Phase 333.12's landing
commit `786ee1c6` byte for byte (`git diff --stat 786ee1c6 576f1908` names `CHANGELOG.md` and `docs/BACKLOG.md` alone,
§12 M1), so every `file:line` below holds at both. `git diff 576f1908` in this worktree must be exactly this phase.

**The spec step MEASURED before it wrote** (§12 holds every command, exit code and number). It drove the SHIPPING
`describePocketDoor` and `pocketExecutionHash` at `576f1908` through the pinned tsx with a stand-in `electron` (a
scratch userData, no keychain, nothing forked) over three compositions (a first setup, a moved public name with one
phone and alerts on, a route waiting) and read every line, its length and the rows it wraps to at the three widths the
Settings window draws; it moved each of the fifteen hashed facts alone and read whether the hash, today's lines and the
drafted face move, once with the draft read literally and once with this file's composer (§2.3). It took no lock slot,
started no Electron, no Simulator, no agent and no model turn, read nothing under `~/.ssh`, `~/.claude`, `~/.codex`,
`~/Keys`, his keychain or his live Tortie profile, and `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read
`737736 1792023873` and `23166 1790702242` at its start, around every tsx run and at its end: neither file moved.

**What it found, in one paragraph.** Today's block is seven lines on a first setup and eight with one phone, 522 to
727 characters of 11 px monospace, two warnings of 170 and 200 characters, and Allow; at the default 760 by 560 window
the step body is 464 px wide and the block is about 380 px tall on a first setup and about 420 px while a route waits
(estimated from the CSS, §2.2), which is why 333.12's fix round saw it push Pair below the fold. Every hashed fact is
already on a line (`describePocketDoor` names all fifteen moves of §2.3), so Details holding those lines byte for byte
loses nothing a person could read. The approved face says eight of the fifteen moves; the seven it does not are the
tailnet, start-with-Tortie, a phone's three keys, its alert address and its environment, which today's lines and
Details name. Read
literally, the draft's "by Tailscale" would not move when the program moves between `/usr/local/bin/tailscale` and
`/opt/homebrew/bin/tailscale`; this file's composer names the program by its app's name only for the app under
`/Applications`, and by its full path otherwise, so that move shows on the face (D4).

Read with it, whole: `docs/BACKLOG.md` "## Phase 333.12.1" (`:42347-42424`), the two faces he approved drawn there;
`build/p33312/SPEC.md` §1.1 D5, D6, D13 (as built: `routesOffered`), D23, §5.9, §6.1 (SU6, AR7, AR11, AR12) and its
fix round; `src/renderer/settings/PhoneSection.tsx`, `src/renderer/settings/phone/steps.ts`,
`src/renderer/settings/phone-section.css`, `src/renderer/settings/ConnectionTestView.tsx` (the connection screen's
Details, which he named), `src/shared/ipc/pocket.ts`, `src/main/pocket/ipc.ts` (`status()`), `src/main/pocket/pairing.ts`
(`describePocketDoor`, `NORMALIZE`, `WRITE_CLAUSES`); `build/conformance-pocket.mjs` SU6, AR7, AR11, AR12;
`build/ablation-p313.mjs`; `build/p33312/probe-p33312.mjs` (H4, H7, H9); the three probes that read the block's text,
`build/p317/probe-p317.mjs:1285`, `build/p318/probe-p318.mjs:1767`, `build/p337/probe-p337.mjs:2855`.

**His word.** 2026-10-15: "can we make this screen and text more sleek and to the point like how we redesigned the
connection screen, etc?", then, on the design drawn in the entry, **"ok i like your proposed design, ship it."** This
REPLACES his ruling 2 of Phase 333.1 ("Keep today's block": SU6, build/p3331/SPEC.md D18, build/p33312/SPEC.md SU6),
which held every hashed line and both warnings at rest with nothing behind a disclosure. And, the same day, **lighter
checking** for Tier 2 phases: one verifier, no separate probe review, then a fix round and an independent reverify; on a
second needs_work the main session decides.

**The order of authority.** His word, then the backlog entry, then the main session's task text, then this file. The
tree at `576f1908` overrides any picture of it here. §Attack, at the end, records what this file's own attack changed.

---

## 0. The hard rules, stated once

- **Nothing a person allows moves.** No change to what Allow does, to `PocketExecutionFields`, `NORMALIZE`,
  `POCKET_EXECUTION_HASH_ALGORITHM` (`sha256-pocket-exec-v3`), `describePocketDoor`'s lines, the routes, the allowed,
  offered, served or waiting sets, or the three confirm paths (`confirmDoor`, the pairing Allow, the two narrowings).
  `confirmLines` and `confirmHash` are what they are at `576f1908`, byte for byte; only where they are drawn moves.
- **No IPC channel, no phone code.** `PocketStatus` gains one field (`confirmFace`), which is not in the contract
  inventory, so `docs/audits/contract-baseline.txt` does not move (`gate:contract`). Nothing under `ios/` is edited.
- **Do not edit the files the phases beside this one own**: `ios/**` and `build/p316/**` (345), the terminal path files
  `src/shared/path-spans.ts`, `src/renderer/terminal/path-links.ts`, `build/conformance-pathdoors.mjs` (347.1),
  `build/assert-door-only-adds.mjs` and `build/p33311/**` (333.11.2). Not `src/main/harness/push-seam.ts` either (it owes
  `probe:p314`, which spends model turns). `package.json`, `build/verification-checks.mjs`, `CHANGELOG.md` and `CLAUDE.md`
  are left to the main session at landing (§11), because three phases run at once.
- Nobody commits, stages or stashes. `/Users/gdc/gmux` is read only; every command begins
  `cd /private/tmp/wt-p333121 &&` or works in the role's scratch,
  `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p333121/<role>/`. Heredoc
  delimiters are quoted. Install nothing.
- Never `-L gmux` and never the default tmux server. Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end
  only pids you started, by pid. His keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex` and live Tortie
  profile are never read. **No model turn**; never start gemini, qwen, agy or grok (`build/hidden-agents.mjs` before
  every launch).
- **His shell history**: before and after every command that starts a shell or the app, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`. His own sessions may move it, so a move ACROSS one of your commands is
  the stop. Every shell a test starts runs with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and `TERM_SESSION_ID`
  unset.
- **No real Tailscale, DNS or APNs**: the stand-ins `probe:p33312` uses (`build/p330/tailscale-standin.mjs` behind
  `GMUX_TAILSCALE_BIN`, preflighted by sha256 and sampled; `build/p332/dns-standin.mjs` behind `GMUX_POCKET_NAME_SERVERS`).
  This phase's app run keeps alerts off and needs no APNs stand-in. No screenshot: a visual claim is a rectangle, a word or
  a number read.
- **Builders and the integrator launch no Electron.** Every Electron goes through `build/electron-run.mjs` inside
  `build/harness-socket.mjs`, killed in a `finally`; the one new script that reaches it raises `HELPER_USER_FLOOR` 174 to
  175 in the same commit.
- **THE LOCK** has three slots: `zsh /private/tmp/tortie-ops/lock.sh try p333121` (prints the slot or exits 1; retry every
  60 s in a NEW command), released with `zsh /private/tmp/tortie-ops/lock.sh release <dir>` on the same command line.
  **Disk**: `df -h /` before any parent build or package; under 8 GB free, wait and report.
- **Tokens only, native menus, just enough words, no tmux vocabulary** (CLAUDE.md's UI rules). **Menus: none change.**
  Details is a control inside the sheet, not a menu; no surface is added, renamed or removed (`Pair a Phone…` and
  `Settings…` stand as they are).

---

## 1. The answer first

The confirm block in Settings then Phone becomes a FACE and DETAILS:

1. **Main composes the face** (`PocketStatus.confirmFace`) in `status()` with ONE pure composer in
   `src/shared/ipc/pocket.ts`, `pocketConfirmFace`, from the SAME proposal `confirmLines` and `confirmHash` come from and the
   same two route lists the answer carries. The composer's input type names only the five facts the face may say; the
   rest is Details' by construction.
2. **A first setup or a moved field** (`Read, then allow`, `Changed since you allowed it`) draws four labelled rows,
   `Reachable at`, `Your phone can`, `Phones`, `Alerts`, then any waiting routes as `New: …` lines, then Allow at the right,
   then Details.
3. **Only routes waiting on a published door** draws each as `New: <title>` and its one sentence, Allow on the first one's
   line, then Details. A route the title table has no row for draws `New: <its id>` and no sentence.
4. **Details** is a native `<details>`, shut at rest and at every mount, `Details` on its summary, holding today's block
   less Allow: `confirmLines` byte for byte, `POCKET_CONFIRM_WARNING`, `pocketDoorHonesty(status.routesOffered)` and, while
   Funnel asks approval, `POCKET_FUNNEL_RIGHT_WARNING`.
5. Nothing else moves: the step rows keep their states, Allow records exactly what it records today, and the pairing card
   is untouched.

Estimated from the CSS at the default window (§2.2): the first-setup block goes from about 380 px to about 166 px, and
the waiting block from about 420 px to about 54 px. The app run measures both beside the parent (§7).

### 1.1 The decisions, each with its reason

| # | Decision | From |
| --- | --- | --- |
| D1 | **Main composes the face, the sheet draws it.** `PocketStatus.confirmFace: PocketConfirmFace` (required), answered by `status()` as `pocketConfirmFace(proposal, routesOffered, routesWaiting, gate.state)`, where `proposal` is the one `this.proposal(` const `describePocketDoor(` is handed. The sheet reads strings and composes none: the program's path is not on the status, the sheet "spells no predicate main owns" (`steps.ts` header), and one proposal makes the face, the lines and the hash one drawing | entry mechanism 1; build/p33312/SPEC.md §Attack A14 |
| D2 | **The face's input names five facts and no other**: `PocketFaceFacts` is exactly `funnelProgram`, `publicName`, `publicPort`, `phones` (each `id`, `label`) and `pushAlerts`. `PocketExecutionFields` is assignable to it, so main hands the proposal itself; the tailnet, `bindAtLaunch`, the route ids, each key and each alert address cannot reach the face and are named in Details alone | entry mechanism 1 ("a field the hash covers that the face does not name … is named in Details") |
| D3 | **The words** (§3.1), each a named constant in `src/shared/ipc/pocket.ts`, kept to the approved drafts' length: `Reachable at` · `Your phone can` · `Phones` · `Alerts` · `none yet` · `through Apple, never what an agent asks` · `off` · `New` · `Details` (the summary, `DISCLOSE_DETAILS` in `PhoneSection.tsx`, the connection screen's own word) | his approved drawing; CLAUDE.md "Just enough words" |
| D4 | **The program on the face**: for `/Applications/<Name>.app/Contents/MacOS/<x>`, `<Name>` ("Tailscale" for the app Tortie looks at first); for any other path, the FULL path. Read literally the draft's "by Tailscale" is the basename, and a move between `/usr/local/bin/tailscale` and `/opt/homebrew/bin/tailscale` (two programs, refusal 8 read literally) moved nothing on the face (§2.3, measured) | §Attack A2; `pairing.ts:237-245` ("a different program answering at a different path is a different process starting") |
| D5 | **`Your phone can`** is over `routesOffered` less `routesWaiting` (what this Allow grants and the door already serves, so a waiting route is said once, as `New`), through `POCKET_FACE_CLAUSES: Readonly<Record<PocketRouteId, string \| null>>`: the six reads say `see your sessions`, `keys` `type into them`, `choose` `answer questions`, `say` `send a message`, `end` `end a session`, `pair` nothing (null); clauses in the table's key order, each once, joined by `, ` (the draft has no "and"). Keyed by EVERY route, so a phase that adds a route cannot compile until it writes the face's words, as `POCKET_HONESTY_ADDED` and `WRITE_CLAUSES` already make it write theirs. `WRITE_CLAUSES` stays main's and Details' (an id's clause is its meaning, `route-ledger.ts`); shared cannot import main, and the approved words are shorter. No clause at all reads `do nothing` (unreachable: the eleven are always allowed) | entry mechanism 1; §Attack A3, A9 |
| D6 | **Rows are empty while the agreement on record holds** (`state === 'confirmed'`): every fact but the waiting routes is what the person already allowed, so only the waiting routes are new (the approved waiting face is one line). For `never`, `changed` and `unknown`, the four rows. The sheet's layout follows `confirmFace.rows.length` and no other field | the approved waiting face; D1 |
| D7 | **The waiting routes' words**: `POCKET_NEW_ROUTE_WORDS: Readonly<Partial<Record<Exclude<PocketRouteId, LegacyAllowedRouteId>, PocketNewRouteWords>>>`, `{ title, sentence }` per route, ADD-ONLY (a row is never edited or removed, only added; stated in its doc, held by type to the routes that can wait), EMPTY today: no route of this build can wait, and 346 adds Start's row (`start a session from your phone` / `Your phone could start Claude Code or Codex in a project here.`). A waiting route with a row draws `New: <title>` and its sentence; with none, `New: <id>` and no sentence, never nothing. The composer takes the table as an optional fifth argument for the tests; main passes four | entry mechanism 2; the task ("an id fallback") |
| D8 | **`New` lines are drawn on the moved-field face too**: a `changed` door with a route waiting asks ONE Allow over lines that name both (333.12 D5), so the face says both: the four rows, then `New: …` | 333.12 §4.3 ("one Allow agrees to both") |
| D9 | **Details**: the house disclosure, a native `<details className="set-disclosure phone-confirm-details" data-phone-confirm-details>` with `<summary>{DISCLOSE_DETAILS}</summary>` first, UNCONTROLLED and with no `open` attribute, so it is shut at rest and every time the block mounts, and nothing remembers it. It sits after Allow, as drawn. Keyboard: Tab from Allow reaches the summary (DOM order), Enter or Space opens it (Chromium's own `<summary>`), and `.set-disclosure > summary:focus-visible` (`settings.css:1450`) draws the ring. It is the same control as step 1's What's this? and the connection screen's Details (`ConnectionTestView.tsx:483`) | entry mechanism 3; the task ("a native control, keyboard reachable, closed at rest") |
| D10 | **The warnings fold into Details**, after the lines and in today's order: `POCKET_CONFIRM_WARNING`, then `pocketDoorHonesty(status.routesOffered)`, then `POCKET_FUNNEL_RIGHT_WARNING` under `funnel.asksApproval` with its `data-phone-funnel-right`. The face says their substance in its own short words (`Your phone can …`; `never what an agent asks`) and draws no warning: the approval face already keeps the Funnel right behind "What this allows" (`steps.ts:236-241`) | entry mechanism 3; "Just enough words" |
| D11 | **One Allow, one place in the markup**, laid out by `data-phone-confirm-face`: `whole` (rows drawn) stacks the face, then Allow at the block's right edge, then Details; `new` (no rows) puts the `New` lines on the left and Allow on the right of the first one's line, then Details. Allow keeps `data-phone-action="confirm-door"`, `btn btn-primary`, `disabled={busy \|\| status.state === 'opening'}` and `props.onConfirmDoor` exactly | his approved drawing; SU6's one confirm press; §Attack A13 |
| D12 | **The face uses no `<li>` and no `set-config-warning`**: rows are a `<dl>` of `<dt>`/`<dd>`, `New` lines are `<p>`. So every reader of the hashed lines (`li`) or the warnings (`p.set-config-warning`) in `[data-phone-confirm]` reads Details alone, and `probe:p33312` H4 and H7 read what they read today with no edit | §Attack A12 |
| D13 | **The step rows do not move**: `steps.ts`'s arms, states, keys and `routesWait` are unchanged in code (AR12 stays green); three comments that say "today's block" are rewritten | entry mechanism 4 |
| D14 | **The three probes that read the block's `innerText`** (`probe:p317` W1, `probe:p318` R0, `probe:p337` S0 and SB0) read `textContent`: a shut `<details>`'s content is not rendered, so it is not in `innerText`, and those clauses grade the honesty sentence and the route and write lines that now sit in Details. One expression each (§5.6). They are not re-run in this phase: `probe:p333121`'s RD arm evaluates that reading on the drawn block at both builds | §Attack A7 |
| D15 | **`probe:p3331` is neither edited nor run.** Its R row's "its words byte-equal to the parent's" compares the block's `innerText` with 333.1's parent `cb8d52a6` under his ruling 2, which his ruling of 2026-10-15 retires; it reads false at every head from this one on, by design. `probe:p333121` measures this surface beside its own parent. Stated for the main session (§11) | his ruling of 2026-10-15; lighter checking (one app run) |
| D16 | **The app run is a new probe, `probe:p333121`** (`build/p333121/probe-p333121.mjs`): four builds (`576f1908`, `576f1908` planted with `build/p33312/plant.mjs`, HEAD, HEAD planted), two scratch profiles, four launches, the parent world first. Not arms of `probe:p33312`, whose parent is `v0.111.1` and whose six launches measure 333.12's update, not this face | entry proof; lighter checking |
| D17 | **Alerts stay off in the app run** (no APNs stand-in, no scratch key): the face's alerts-on words are proved in `p333121-face.test.ts` and in AF2's driven half | Tier 2 budget |
| D18 | **Tier 2 with lighter checking**: a rendered surface with no new state. The independent method is the attack (each hashed fact moved alone, by the verifier's own mover; a waiting route with no title row), because these are the words refusal 8 rests on | the entry; his ruling of 2026-10-15 |
| D19 | **No CHANGELOG, `CLAUDE.md`, `package.json` or `build/verification-checks.mjs` edit by any builder or the integrator**; the main session writes them at landing from §11 | three phases at once |

---

## 2. Today's block, measured (method: the code, its tests and the shipping functions)

### 2.1 The block at `576f1908`

Drawn by `stepPiece`'s `case 'confirm':` (`src/renderer/settings/PhoneSection.tsx:825-855`) on two arms of step 2:
the listening arm while `routesWait(status)` (`steps.ts:363-371`, the state `Published`) and the needs-confirm arm
(`steps.ts:373-380`, `Read, then allow` or `Changed since you allowed it`). Its markup, in order:

| # | Element | Class and size (from the CSS) | Holds |
| --- | --- | --- | --- |
| 1 | `<div data-phone-confirm>` | `.phone-block`: column, gap `--space-3` (6 px); padding 0 inside a step (`phone-section.css:138-141`) | the block |
| 2 | `<ul>` | `.set-config-lines` (`settings.css:1361-1376`): gap `--space-2` (4 px); each `<li>` `--font-mono`, `--text-xs` 11 px, `--lh-sm` 18 px, `overflow-wrap: anywhere` | `confirmLines`, one `<li>` each (`Lines`, `PhoneSection.tsx:497-505`) |
| 3 | `<p>` | `.set-config-warning` (`settings.css:1378-1383`): `--text-sm` 12 px / 18 px, `--text-secondary`, margin 0 in a block | `POCKET_CONFIRM_WARNING` (170 characters) |
| 4 | `<p>` | the same | `pocketDoorHonesty(status.routesOffered)` (200 characters for the eleven: `POCKET_DOOR_HONESTY`) |
| 5 | `<p data-phone-funnel-right>` | the same, only under `funnel.asksApproval` | `POCKET_FUNNEL_RIGHT_WARNING` (102 characters) |
| 6 | `<div class="set-config-actions">` | margin-top `--space-2` (4 px) | Allow, `.btn` 28 px tall (`globals.css:127`) |

**The widths.** The Settings nav is 200 px (`settings.css:16-17`), the content pads 24 px (`:62-66`) up to 560 px
(`:71`), a step pads 12 px each side (`phone-section.css:62-66`) and indents its body 16 + 8 px (`:124-130`). So the
body is **464 px at the default 760 px window** (`src/main/settings/window.ts:60`), **344 px at the 640 px minimum**
(`:63`) and 512 px from 808 px up.

### 2.2 Its lines, and the face over the same facts (`spec/measure.mts`, §12 M2)

Driven through the SHIPPING `describePocketDoor` at `576f1908`. Heights are ESTIMATES from the CSS above with 6.6 px a
monospace character and 6.2 px a UI character; the app run measures them (§7, N2, C1, W1).

| Composition | Lines | Characters | Today at 464 / 344 / 512 px | The face at 464 / 344 / 512 px |
| --- | --- | --- | --- | --- |
| first setup, `never`, no phone, alerts off | 7 | 522 | ~380 / ~452 / ~362 | ~166 / ~184 / ~166 |
| a moved public name, one phone, alerts on | 8 | 727 | ~438 / ~546 / ~402 | ~166 / ~184 / ~166 |
| the eleven confirmed, `probe` waiting, one phone | 8 | 650 | ~420 / ~510 / ~384 | ~54 / ~54 / ~54 |

The lines of the first setup, verbatim (the others differ only where §2.3 says):

```
L1 (103) Answers on the internet at https://mac.tail0000.ts.net:8443, through Tailscale Funnel on example.github
L2 ( 70) Publishes it with /Applications/Tailscale.app/Contents/MacOS/Tailscale
L3 ( 35) Starts answering when Tortie starts
L4 (115) Answers these and nothing else: blocked, choose, end, keys, pair, say, screen, scrollback, session, sessions, turns
L5 (142) Lets an allowed phone end a session, answer a numbered question, send a session one message and type into any session as you would at this Mac
L6 ( 38) Tells your phone nothing through Apple
L7 ( 19) Allows no phone yet
```

With a phone: `Allows the phone "Greg’s iPhone", key 409b 1b81 9db1 72a2 0226 454c` (67) and, with an alert address,
`Alerts for "Greg’s iPhone" go through Apple (production), device 271a413b` (73); alerts on:
`Tells your phone through Apple when a session starts waiting on you, never what it asks, and nothing while this Mac sleeps`
(122).

### 2.3 Each line's hashed facts, and where each goes

| Line (`pairing.ts:441-491`) | Hashed facts (`NORMALIZE`, `pairing.ts:295-319`) | The face | Details |
| --- | --- | --- | --- |
| `Answers on the internet at https://…:…, through Tailscale Funnel on …` | `publicName`, `publicPort`, `tailnet` | `Reachable at <name>:<port>` | the line, with the tailnet |
| `Publishes it with <program>` | `funnelProgram` | `, by <app name, or full path>` (D4) | the line, the full path |
| `Starts answering when Tortie starts` / `Answers only after you turn it on` | `bindAtLaunch` | — | the line |
| `Answers these and nothing else: …` | `routes` | `Your phone can …` (D5) and `New: …` (D7) | the line, every id |
| `Lets an allowed phone …` | `routes` (the writes) | `Your phone can …` | the line, `WRITE_CLAUSES` |
| `Tells your phone through Apple …` / `… nothing through Apple` | `pushAlerts` | `Alerts  through Apple, never what an agent asks` / `off` | the line |
| `Allows the phone "<label>", key <fingerprint>` / `Allows no phone yet` | each phone's `label`, `signingKey`, `exchangeKey`, `clientKey` (`id` is `phoneIdOf(signingKey)`, `:1200`) | `Phones  <labels, in id order>` / `none yet` | the line, each fingerprint |
| `Alerts for "<label>" go through Apple (<env>), device <8 hex>` | each phone's `pushToken`, `pushEnvironment` | — | the line |
| `POCKET_CONFIRM_WARNING`, the honesty sentence, the Funnel right | none (words) | their substance, short (D10) | each, whole |

**Each fact moved alone** (`spec/moves.mts` and `spec/moves2.mts`, §12 M3 and M4), on one phone with an alert address
and alerts on: of fifteen moves (the program at the same name and at the app, the tailnet, the name, the port,
start-with-Tortie, a waiting route, alerts, a phone's label, each of its three keys, its alert address, its environment,
a second phone of the same label), **the hash moves fifteen times and today's lines move fifteen times**. The draft read
literally (basename) moves the face 6 times; this file's composer moves it **8** times: the program at another path of
the same name, the program at the app, the name, the port, a waiting route (as `New`), alerts, a phone's label, and a
second phone of the same label. The seven that move Details alone: the tailnet, start-with-Tortie, a phone's three keys, its alert address and its environment. Question 1 (§13).

---

## 3. The two faces, exact

### 3.1 The words

| Constant (`src/shared/ipc/pocket.ts`) | Value | Drawn |
| --- | --- | --- |
| `POCKET_FACE_REACH` | `Reachable at` | the first row's label |
| `POCKET_FACE_CAN` | `Your phone can` | the second row's label |
| `POCKET_FACE_PHONES` | `Phones` | the third row's label |
| `POCKET_FACE_ALERTS` | `Alerts` | the fourth row's label |
| `POCKET_FACE_NO_PHONE` | `none yet` | `Phones` with no phone |
| `POCKET_FACE_CAN_NOTHING` | `do nothing` | `Your phone can` with no clause (unreachable) |
| `POCKET_FACE_ALERTS_ON` | `through Apple, never what an agent asks` | `Alerts` with `pushAlerts` |
| `POCKET_FACE_ALERTS_OFF` | `off` | `Alerts` without |
| `POCKET_FACE_NEW` | `New` | `New: <title or id>` |
| `DISCLOSE_DETAILS` (`PhoneSection.tsx`, beside `BTN_ALLOW`) | `Details` | the summary |

`Reachable at`'s value is `<publicName>:<publicPort>, by <program>` (`, by …` left off when the program is empty).
`Your phone can` over the eleven reads `see your sessions, type into them, answer questions, send a message, end a session`
(82 characters, two rows at 464 px). None of the words says beta, TestFlight, remote desktop, mirror, stream or SSH (SU9),
and none is tmux's.

### 3.2 A first setup, or a moved field

```
2  Publish this Mac                                    Read, then allow     (or: Changed since you allowed it)
     Reachable at    mac.tail0000.ts.net:8443, by Tailscale
     Your phone can  see your sessions, type into them, answer questions,
                     send a message, end a session
     Phones          none yet                    (or: Greg’s iPhone, …)
     Alerts          off                         (or: through Apple, never what an agent asks)
     New: <title>                                (only on a moved field with a route waiting, D8)
     <its sentence>
                                                                      [Allow]
     ▸ Details
```

### 3.3 Only routes waiting, on a published door

```
2  Publish this Mac                                           Published
     New: start a session from your phone                     [Allow]
     Your phone could start Claude Code or Codex in a project here.
     ▸ Details
```

In THIS build no route can wait (the eleven are always allowed), so the only waiting face anyone can draw is a plant's,
and a route with no row draws `New: probe` and no sentence (the attack's own reading, §7 W1).

### 3.4 Details, opened

```
     ▾ Details
     Answers on the internet at https://mac.tail0000.ts.net:8443, through Tailscale Funnel on example.github
     Publishes it with /Applications/Tailscale.app/Contents/MacOS/Tailscale
     … every confirmLines line, byte for byte, in order …
     This lets a phone you allow ask this Mac what your sessions are doing, over the internet. …
     A phone you allow can see what any session’s terminal shows and what it printed before, …
     Approving Funnel lets any device signed in to your tailnet publish to the internet, not only this Mac.   (asksApproval only)
```

### 3.5 The markup and the rectangles the run reads

`[data-phone-confirm]` (`.phone-block.phone-confirm`, `data-phone-confirm-face="whole" | "new"`) holds, in order:

1. `.phone-confirm-head`: in `whole` a column (gap 6 px); in `new` a row (`justify-content: space-between`,
   `align-items: flex-start`, gap 12 px). It holds `.phone-confirm-face` (a column, gap 6 px) with
   - the `<dl class="phone-face" data-phone-face>` in `whole`: a grid, `grid-template-columns: max-content minmax(0, 1fr)`,
     column gap `--space-5` (12 px), row gap `--space-2` (4 px); each `<dt data-phone-face-label="<key>">` 12/18 px
     `--text-secondary`, each `<dd data-phone-face-value="<key>">` 12/18 px `--text-primary`, `overflow-wrap: anywhere`,
     margin 0;
   - `<div class="phone-face-added" data-phone-face-added>` when a route waits: per route
     `<div class="phone-face-new" data-phone-face-new="<id>">` holding `<p class="phone-face-title">` (12/18 px,
     `--text-primary`) and, when there is one, `<p class="phone-face-sentence">` (12/18 px, `--text-secondary`), gap 2 px;

   and `.set-config-actions.phone-confirm-actions` (margin-top 0; in `whole` full width with `justify-content: flex-end`,
   so Allow's right edge is the block's).
2. The `<details>` of D9 (margin-top 0 in the block, `.set-config-warning` inside it margin-top `--space-3`).

Every value is a token (`--space-1` to `--space-5`, `--text-sm`, `--lh-sm`, `--text-primary`, `--text-secondary`). No
colour literal, no new token.

---

## 4. Why refusal 8 still holds

Allow records the proposal's hash only when the renderer hands back `current.confirmLines` and `current.confirmHash`
unsliced (SU6's last clause, unchanged), and those lines are in the DOM, in Details, byte for byte, one press or one
Tab-and-Enter away, before Allow is pressed. The face is composed from that same proposal, can only name the five facts of
`PocketFaceFacts`, and is never handed back. A fact that moves moves the hash and today's lines (fifteen of fifteen,
§2.3), so a door that changed still reads `Changed since you allowed it` and still refuses until Allow. What moves is that
seven of those facts are read in Details rather than on the face; Question 1 asks him whether that face should say what
changed.

---

## 5. The mechanism, file by file

Write the lines given here as written: the gates builder anchors its ablations on them (§6.2), and the integrator
re-anchors any arm whose `from` no longer matches exactly once.

### 5.1 `src/shared/ipc/pocket.ts` (builder **face**; append-only)

1. `PocketStatus` (`:883`) gains, right after `confirmHash: string;` (`:934`):
   ```ts
   /**
    * The confirm block's face (Phase 333.12.1, build/p333121/SPEC.md D1): the few facts a person reads before Allow,
    * composed in main by {@link pocketConfirmFace} from the SAME proposal {@link confirmLines} and {@link confirmHash}
    * come from. Its rows are empty while the agreement on record holds every fact but the waiting routes. Every
    * hashed fact is in {@link confirmLines}, which the sheet draws behind Details.
    */
   confirmFace: PocketConfirmFace;
   ```
2. After `POCKET_ALLOWED_NOT_SAVED` (`:1200`), a section `// The confirm block's face (Phase 333.12.1)` declaring, in
   this order: `PocketFaceRowKey = 'reach' | 'can' | 'phones' | 'alerts'`; `PocketFaceRow { readonly key; readonly label:
   string; readonly value: string }`; `PocketFaceNew { readonly id: PocketRouteId; readonly title: string; readonly
   sentence: string | null }`; `PocketConfirmFace { readonly rows: readonly PocketFaceRow[]; readonly added: readonly
   PocketFaceNew[] }`; `PocketFaceFacts` exactly as D2 (`phones: readonly { readonly id: string; readonly label: string }[]`);
   `PocketNewRouteWords { readonly title: string; readonly sentence: string }`; `PocketNewRouteTable` as D7; the nine
   word constants of §3.1 (exported); `POCKET_FACE_CLAUSES` (exported, frozen, keys in this order: `blocked`, `session`,
   `turns`, `sessions`, `screen`, `scrollback`, `keys`, `choose`, `say`, `end`, `pair`); `POCKET_NEW_ROUTE_WORDS`
   (exported, `Object.freeze({})`, its doc saying ADD-ONLY and that 346 adds Start's row); and:
   ```ts
   /** The program as the face names it (D4): the app's name under /Applications, else the whole path. */
   export function pocketFaceProgram(path: string): string {
     const app = /^\/Applications\/([^/]+)\.app\/Contents\/MacOS\/[^/]+$/.exec(path);
     return app === null ? path : (app[1] ?? path);
   }

   export function pocketConfirmFace(
     facts: PocketFaceFacts,
     offered: readonly PocketRouteId[],
     waiting: readonly PocketRouteId[],
     state: PocketStatus['confirmState'],
     words: PocketNewRouteTable = POCKET_NEW_ROUTE_WORDS
   ): PocketConfirmFace {
     const table: Readonly<Record<string, PocketNewRouteWords | undefined>> = words;
     const added = waiting.map((id) => {
       const row = table[id];
       return { id, title: `${POCKET_FACE_NEW}: ${row?.title ?? id}`, sentence: row?.sentence ?? null };
     });
     if (state === 'confirmed') return { rows: [], added };
     const clauses: Readonly<Record<string, string | null | undefined>> = POCKET_FACE_CLAUSES;
     const can: string[] = [];
     for (const id of Object.keys(clauses)) {
       const clause = clauses[id];
       if (clause === null || clause === undefined || can.includes(clause)) continue;
       if (!offered.some((r) => r === id) || waiting.some((r) => r === id)) continue;
       can.push(clause);
     }
     const program = pocketFaceProgram(facts.funnelProgram);
     const labels = [...facts.phones].sort((a, b) => (a.id < b.id ? -1 : 1)).map((p) => p.label);
     return {
       rows: [
         { key: 'reach', label: POCKET_FACE_REACH, value: `${facts.publicName}:${String(facts.publicPort)}${program === '' ? '' : `, by ${program}`}` },
         { key: 'can', label: POCKET_FACE_CAN, value: can.length === 0 ? POCKET_FACE_CAN_NOTHING : can.join(', ') },
         { key: 'phones', label: POCKET_FACE_PHONES, value: labels.length === 0 ? POCKET_FACE_NO_PHONE : labels.join(', ') },
         { key: 'alerts', label: POCKET_FACE_ALERTS, value: facts.pushAlerts ? POCKET_FACE_ALERTS_ON : POCKET_FACE_ALERTS_OFF }
       ],
       added
     };
   }
   ```
   Pure, no import added to the file, no clock, nothing localized. `POCKET_DOOR_HONESTY`, `pocketDoorHonesty`,
   `POCKET_HONESTY_ADDED` and every other line of the file are unchanged.

### 5.2 `src/main/pocket/ipc.ts` (builder **face**)

In `status()` (`:933-1018`) and nowhere else:

1. Right after `const offered = describePocketDoor(proposal);` (`:946`), two consts, each the expression the answer
   carries today:
   ```ts
       // PHASE 333.12 (D6) and its fix round, named once since Phase 333.12.1, because the face is composed over the
       // same two lists the answer carries.
       const routesOffered = servedRoutesOf(proposal.routes, pocketRouteIds());
       const routesWaiting = waitingRoutesOf(fields.routes, pocketRouteIds(), gate.state === 'confirmed' || gate.state === 'changed');
   ```
2. In the answer, after `confirmHash: offered.hash,` (`:992`):
   ```ts
         // THE FACE (Phase 333.12.1, D1): from the SAME proposal the lines and the hash come from.
         confirmFace: pocketConfirmFace(proposal, routesOffered, routesWaiting, gate.state),
   ```
   and `routesWaiting: waitingRoutesOf(…)` (`:1007`) and `routesOffered: servedRoutesOf(…)` (`:1010`) become the
   shorthand `routesWaiting,` and `routesOffered,` in their places, their comments kept.
3. `pocketConfirmFace` is imported where `ipc.ts` imports the rest of the shared contract. Nothing else in the file moves.

### 5.3 `src/renderer/settings/PhoneSection.tsx` (builder **face**)

1. Beside `BTN_ALLOW` (`:115`): `export const DISCLOSE_DETAILS = 'Details';` with a one-line comment (the connection
   screen's word). `BTN_ALLOW`, `ALERTS_GROUP`, `PHONES_GROUP` and every word the phone quotes stay byte for byte
   (`conformance:phonecopy`'s needles).
2. `case 'confirm':` (`:825-855`) becomes exactly:
   ```tsx
       case 'confirm':
         // THE FACE AND DETAILS (his ruling of 2026-10-15, build/p333121/SPEC.md D1 to D12): main's few lines
         // (`confirmFace`, from the proposal the lines and the hash come from), Allow, and every hashed line with
         // the warnings behind Details, shut at rest. With no rows only routes wait, and Allow sits on their line.
         return status === null ? null : (
           <div
             key={key}
             className="phone-block phone-confirm"
             data-phone-confirm
             data-phone-confirm-face={status.confirmFace.rows.length > 0 ? 'whole' : 'new'}
           >
             <div className="phone-confirm-head">
               <div className="phone-confirm-face">
                 {status.confirmFace.rows.length === 0 ? null : (
                   <dl className="phone-face" data-phone-face>
                     {status.confirmFace.rows.map((row) => (
                       <React.Fragment key={row.key}>
                         <dt data-phone-face-label={row.key}>{row.label}</dt>
                         <dd data-phone-face-value={row.key}>{row.value}</dd>
                       </React.Fragment>
                     ))}
                   </dl>
                 )}
                 {status.confirmFace.added.length === 0 ? null : (
                   <div className="phone-face-added" data-phone-face-added>
                     {status.confirmFace.added.map((route) => (
                       <div key={route.id} className="phone-face-new" data-phone-face-new={route.id}>
                         <p className="phone-face-title">{route.title}</p>
                         {route.sentence === null ? null : <p className="phone-face-sentence">{route.sentence}</p>}
                       </div>
                     ))}
                   </div>
                 )}
               </div>
               <div className="set-config-actions phone-confirm-actions">
                 <button
                   type="button"
                   className="btn btn-primary"
                   // Never while a read is under way: the lines may be about to move.
                   disabled={busy || status.state === 'opening'}
                   data-phone-action="confirm-door"
                   onClick={props.onConfirmDoor}
                 >
                   {BTN_ALLOW}
                 </button>
               </div>
             </div>
             <details className="set-disclosure phone-confirm-details" data-phone-confirm-details>
               <summary>{DISCLOSE_DETAILS}</summary>
               <Lines lines={status.confirmLines} />
               <p className="set-config-warning">{POCKET_CONFIRM_WARNING}</p>
               <p className="set-config-warning">{pocketDoorHonesty(status.routesOffered)}</p>
               {status.funnel.asksApproval ? (
                 <p className="set-config-warning" data-phone-funnel-right>
                   {POCKET_FUNNEL_RIGHT_WARNING}
                 </p>
               ) : null}
             </details>
           </div>
         );
   ```
3. The `case 'disclosure':` comment (`:813`, "Never the confirm block's home") becomes "The house disclosure, SHUT
   (§5.4.1). The confirm block's own Details is drawn in `case 'confirm'`." The header's ruling-2 sentence (`:19`) says
   the confirm block is a face, Allow and Details since Phase 333.12.1. `confirmDoor` (`:1279`) and `onConfirmDoor` are
   unchanged.

### 5.4 `src/renderer/settings/phone-section.css` (builder **face**)

The comment at `:136-137` ("the confirm block byte for byte, his ruling 2") becomes "the confirm block's face and Details
(Phase 333.12.1)". After the steps' rules, a section `/* the confirm block's face (Phase 333.12.1) */` with the rules of
§3.5: `.phone-confirm-head`, `.phone-confirm[data-phone-confirm-face='new'] .phone-confirm-head`, `.phone-confirm-face`,
`.phone-face`, `.phone-face > dt, .phone-face > dd`, `.phone-face > dt`, `.phone-face > dd`, `.phone-face-added`,
`.phone-face-new`, `.phone-face-title, .phone-face-sentence`, `.phone-face-title`, `.phone-face-sentence`,
`.phone-confirm-head > .phone-confirm-actions` (margin-top 0; `align-self: stretch` and `justify-content: flex-end` in
`whole`; `flex: none` in `new`), `.phone-block > .phone-confirm-details` (margin-top 0, `align-self: stretch`),
`.phone-confirm-details > .set-config-warning` (margin `var(--space-3) 0 0`). Specificity: every override of a house
rule is two classes deep, so its order against `settings.css` does not decide it.

### 5.5 `src/renderer/settings/phone/steps.ts` (builder **face**; comments only)

`:120` ("step 2 draws today's confirm block under Published"), `:181` ("Today's `[data-phone-confirm]` block, whole, at
rest (his ruling 2, D18)") and `:364` ("draws today's confirm block") say "the confirm block (main's face, Allow and
Details, Phase 333.12.1)". No code line moves (AR12, AR12a and AR12b read code).

### 5.6 The three probes that read the block's text (builder **probe**)

In each, the one expression that reads `[data-phone-confirm]` changes `b.innerText` to `b.textContent`, with a comment
saying a shut `<details>`'s content is not rendered and so not in `innerText` (Phase 333.12.1, D14):
`build/p317/probe-p317.mjs:1285`, `build/p318/probe-p318.mjs:1767`, `build/p337/probe-p337.mjs:2855`. Their comment that
the block draws the honesty sentence "inside `[data-phone-confirm]` alone" (`probe-p317.mjs:1274-1277`) says "inside its
Details". Their graders, fixtures and self-tests do not move (they grade `includes(…)`, which `textContent` satisfies:
every graded needle is one text node's whole text).

---

## 6. The gates that move, on purpose (builder **gates**)

### 6.1 `conformance:pocket` (`build/conformance-pocket.mjs`)

Each row of `RULES` with owner `build/p333121/SPEC.md D…`, read with the TypeScript parser as the file's other rules are,
comments blanked, counting what it checked (a zero where something must be is red), spawning nothing.

| Id | Owner | The rule |
| --- | --- | --- |
| **SU6** (rewritten; title and owner replaced: "his ruling of 2026-10-15, replacing ruling 2") | D9 to D12 | THE CONFIRM BLOCK IS A FACE AND DETAILS: exactly one element of the sheet's surface carries `data-phone-confirm`, and it sits inside no `<details>`; it holds exactly one `<details>`, carrying `data-phone-confirm-details` and NO `open` attribute, whose first element child is a `<summary>` drawing `DISCLOSE_DETAILS`; inside that `<details>`, and nowhere else in the block: `Lines` handed `status.confirmLines` unsliced and unmapped, `POCKET_CONFIRM_WARNING`, `pocketDoorHonesty(status.routesOffered)` (never the bare constant) and `POCKET_FUNNEL_RIGHT_WARNING` under `funnel.asksApproval`; the block's one `confirm-door` press is in the block and NOT inside the `<details>`; outside the `<details>` the block reads `status.confirmFace`; `confirmDoor` hands `linesRead: current.confirmLines` and `hashRead: current.confirmHash`, unsliced and unmapped (that clause unchanged) |
| **AF1** | D1, D2 | THE FACE IS MAIN'S, FROM THE PROPOSAL: `pocketConfirmFace` is declared once, in `src/shared/ipc/pocket.ts`; its first parameter is typed `PocketFaceFacts`, which declares exactly `funnelProgram`, `publicName`, `publicPort`, `phones` (whose element type declares exactly `id` and `label`) and `pushAlerts`; `PocketStatus` declares `confirmFace: PocketConfirmFace`, required; under `src/main/**` (tests excepted) it is called exactly once, inside `status()`, with exactly four arguments: the same identifier `describePocketDoor(` is handed there, which is the one const initialised from `this.proposal(`, then `routesOffered`, `routesWaiting` and `gate.state`, where those two names are consts of `status()` initialised to `servedRoutesOf(<that proposal>.routes, pocketRouteIds())` and `waitingRoutesOf(fields.routes, pocketRouteIds(), …)`; the answer carries `confirmFace` from that call |
| **AF2** | D3 to D8 | THE FACE SAYS EACH FACT ONCE, DRIVEN: transpiled in memory (as AR7 drives `pocketDoorHonesty`), `pocketConfirmFace` answers, for `never`, `changed` and `unknown`, the rows `reach`, `can`, `phones`, `alerts` in that order with the four labels of §3.1; `reach` is `<name>:<port>, by Tailscale` for `/Applications/Tailscale.app/Contents/MacOS/Tailscale` and `, by /opt/homebrew/bin/tailscale` for that path; `can` over the eleven is exactly `see your sessions, type into them, answer questions, send a message, end a session` and leaves out a route that waits; `phones` is the labels in `id` order joined by `, `, or `none yet`; `alerts` is `through Apple, never what an agent asks` or `off`; for `confirmed` the rows are empty; a waiting route with a row in the table handed in reads `New: <title>` and its sentence, and with none `New: <id>` and `null`, in the order handed in; the declared types: `POCKET_FACE_CLAUSES` `Readonly<Record<PocketRouteId, string \| null>>` and `POCKET_NEW_ROUTE_WORDS` `PocketNewRouteTable`, which is `Readonly<Partial<Record<Exclude<PocketRouteId, LegacyAllowedRouteId>, PocketNewRouteWords>>>`; the composer and its helpers name no imported identifier, no `Date`, no `process` and no `toLocale` |
| **AF3** | D1, D12 | THE SHEET DRAWS THE FACE AND COMPOSES NONE: outside its `<details>` the confirm block draws text only through `row.label`, `row.value`, the added route's `title` and `sentence` (each read from `status.confirmFace`) and `BTN_ALLOW`, and no JSX text and no string literal is drawn as a child; it holds no `<li>`, `<ul>` or `set-config-warning` outside the `<details>`; its layout is chosen from `status.confirmFace.rows.length` and no other field; no file under `src/renderer` that is not a test names `pocketConfirmFace`, `pocketFaceProgram`, `POCKET_FACE_CLAUSES`, `POCKET_NEW_ROUTE_WORDS` or any `POCKET_FACE_` constant |
| **AF4** | §2.3, §4 | DETAILS NAMES EVERY HASHED FACT: `describePocketDoor` reads `fields.<key>` for every key of `NORMALIZE`, and `phone.<member>` for every member `NORMALIZE`'s `phones` emits but `id` (which is `phoneIdOf(signingKey)`); a key added to `NORMALIZE` without a read here is red. Its DRIVEN half is `p333121-face.test.ts` F3, the `face` check |

**Widened, on purpose:**

- **AR11**: `routesOffered` and `routesWaiting` may be answered by shorthand (or by name) from ONE const of `status()`
  initialised to exactly today's expression (the rule reads the const's initializer where it read the property), as
  `describePocketDoor(`'s argument already may be. Every other clause of AR11 is unchanged.

**Unchanged and must stay green**: SU2, SU7, SU9 (the new words say none of its words), AR7 (the one
`pocketDoorHonesty(status.routesOffered)` call is still inside the block), AR12 (no code line of `steps.ts` moves), X12,
Z15, Z30 and the rest.

### 6.2 `ablation:p313` (`build/ablation-p313.mjs`)

A new driven check joins `CHECKS` after `phone`:
`['face', ['node_modules/vitest/vitest.mjs', 'run', '--no-cache', 'src/main/pocket/__tests__/p333121-face.test.ts'], { tag: 'face', relative: true }]`,
and the header gains a PHASE 333.12.1 paragraph with the new count. The arms name their files by the constants the file
already declares: `SHARED` (`src/shared/ipc/pocket.ts`), `IPC`, `PAIRING`, `PHONE_SECTION`.

| Arm | Rule (alsoRed) | File | What it breaks (`from` → `to`) |
| --- | --- | --- | --- |
| SU19 (re-purposed) | SU6 (`steps`) | `PHONE_SECTION` | the confirm warning moved OUT of Details, to the head's front (a regex move of the `{POCKET_CONFIRM_WARNING}` `<p>` line to before `<div className="phone-confirm-head">`) |
| SU20 (re-purposed) | SU6 (`steps`) | `PHONE_SECTION` | the honesty `<p>` moved out of Details the same way; its `why` says `probe:p317` W1, `p318` R0 and `p337` S0 read it in the block |
| SU6a | SU6 (`phone`, `steps`) | `PHONE_SECTION` | `data-phone-confirm-details>` → `data-phone-confirm-details open>`: Details open at rest |
| SU6b | SU6 (`steps`) | `PHONE_SECTION` | the `phone-confirm-actions` div moved inside the `<details>` (regex): Allow behind Details |
| SU6c | SU6 (`steps`) | `PHONE_SECTION` | `<Lines lines={status.confirmLines} />` → `<Lines lines={status.confirmLines.slice(0, 3)} />` |
| SU6d | SU6 (`steps`) | `PHONE_SECTION` | `{status.funnel.asksApproval ? (` → `{true ? (` |
| AR11e (re-anchored) | AR11 (`allowed`) | `IPC` | `    const routesOffered = servedRoutesOf(proposal.routes, pocketRouteIds());` → `    const routesOffered = this.servedRoutes();` |
| AF1a | AF1 | `IPC` | `pocketConfirmFace(proposal, routesOffered, routesWaiting, gate.state)` → `pocketConfirmFace(fields, routesOffered, routesWaiting, gate.state)` |
| AF1b | AF1 | `IPC` | the same → `pocketConfirmFace(proposal, this.servedRoutes(), routesWaiting, gate.state)` |
| AF1c | AF1 (`allowed`) | `IPC` | the same → `pocketConfirmFace(proposal, routesOffered, routesWaiting, 'never')`: rows on a waiting face |
| AF2a | AF2 (`face`, `allowed`) | `SHARED` | `row?.title ?? id` → `row?.title ?? ''`: the id fallback dropped |
| AF2b | AF2 (`face`) | `SHARED` | `if (!offered.some((r) => r === id) \|\| waiting.some((r) => r === id)) continue;` → `if (!offered.some((r) => r === id)) continue;` |
| AF2c | AF2 (`face`) | `SHARED` | `[...facts.phones].sort((a, b) => (a.id < b.id ? -1 : 1))` → `[...facts.phones]` |
| AF2d | AF2 (`face`) | `SHARED` | `return app === null ? path : (app[1] ?? path);` → `return path.slice(path.lastIndexOf('/') + 1);` (the draft read literally, §Attack A2) |
| AF3a | AF3 | `PHONE_SECTION` | `<dd data-phone-face-value={row.key}>{row.value}</dd>` → `<dd data-phone-face-value={row.key}>{row.key === 'reach' ? status.publicName : row.value}</dd>` |
| AF3b | AF3 (`steps`) | `PHONE_SECTION` | the same `<dd …>` → `<li data-phone-face-value={row.key}>{row.value}</li>`: the face read as a hashed line |
| AF4a | AF4 (`face`) | `PAIRING` | ``  lines.push(`Publishes it with ${fields.funnelProgram}`);\n`` → `''` |
| AF4b | `face` | `PAIRING` | the alert line's `, device ${pushTokenDigest(…).slice(0, 8)}` removed (regex): a moved alert address moves neither the face nor Details, which only the driven F3 can see (AF4's text rule still finds `phone.pushToken` read) |

Every arm restores its file by sha256 in its `finally`, as the harness does. Arms whose file moved and whose anchor must
still match once (re-run, not edited): SU21, SU6w, AR7a, AR7d, AR11a, AR11b, AR11d, AR12a, AR12b.

---

## 7. The app run: `probe:p333121` (builder **probe**)

### 7.1 What it is and what it refuses

`build/p333121/probe-p333121.mjs`, run as
`node build/harness-socket.mjs --fresh gmux-p333121 'node build/p333121/probe-p333121.mjs'` (the `probe:p333121`
package script the main session adds at landing). It is built from `probe:p33312`'s pieces, imported where that file
exports them behind its `isMain` guard (`checkoutProblems`, `socketPathOf`, `secretHits`, `questionsProblems`), with
`build/p33312/plant.mjs`'s `readMarker` and `markerProblems`, and it copies the launch, attach, status, click and
pairing helpers of that probe's `run()` (`probe-p33312.mjs:1129-1510`), because `run()` is not exported. Supplied, and nothing
else: the Tailscale stand-in behind ONE scratch wrapper for the whole run, named by `GMUX_TAILSCALE_BIN`, preflighted by sha256 before every
launch and sampled every second (a real Tailscale under the app or run as a command fails the run; one a process outside
the run owns is reported by pid); `build/p332/dns-standin.mjs` in the probe's own process named by
`GMUX_POCKET_NAME_SERVERS`, main's UDP sampled with `lsof` (any peer not 127.0.0.1 fails the run); ONE
`build/p316/node-phone.mjs` phone (label `p333121 phone`); `build/hidden-agents.mjs` before every launch and `agents:list`
read back. No APNs stand-in, no scratch key, no agent and no session: nothing blocks and no token is spent. ONE Electron
at a time through `withElectron`, killed in its `finally`; every stand-in pid ended by pid in the `finally`; the scratch
socket file unlinked by its exact name after the server is ended (tmux 3.7b leaves it).

It refuses, exit 2, before anything starts: any of the four checkouts missing, without `out/main/index.js`, or with an
`out/` older than its `src/`; a planted checkout without `plant.mjs`'s marker, or an unplanted one with it; a stand-in
that fails its preflight. His two history files are read (`stat -f '%z %m'`, read only) at its start and end; a move fails
the run and says so.

### 7.2 The four builds

| Name | Env | What |
| --- | --- | --- |
| PARENT | `P333121_PARENT_CHECKOUT` | `576f1908`, extracted by `git -C /private/tmp/wt-p333121 archive 576f1908 \| tar -x -C <dir>` (no worktree is added, so `/Users/gdc/gmux/.git` is not written), `node_modules` and `build/vendor` copied in with `cp -Rc`, built with `node node_modules/electron-vite/bin/electron-vite.js build` |
| PARENT_PLANTED | `P333121_PARENT_PLANTED` | a second such copy, `node build/p33312/plant.mjs <dir>` (shape head: the ledger exists at `576f1908`), built the same way |
| HEAD | this worktree | `npm run build` |
| HEAD_PLANTED | `P333121_HEAD_PLANTED` | a `cp -Rc` of this worktree without `out/` and `release/`, planted, built with the bundler alone |

### 7.3 The launches and the arms

Two worlds, each a scratch profile and the same scratch HOME; the parent's world first, never two Electrons at once; the
stand-in's scenario is put back to its default name at the start of each world, and the DNS stand-in answers both the
default and the moved name (as `probe:p33312`'s `questionsProblems` names them). Per world, with the build pair `(B, B_PLANTED)` = `(PARENT, PARENT_PLANTED)` then `(HEAD, HEAD_PLANTED)`:

- **L1 at B**: the switch on through `window.gmux.pocket.setDoor({ on: true })`; wait for `confirmable` lines naming the
  stand-in's name; read **N**; press Allow by a click on the real `[data-phone-confirm] [data-phone-action="confirm-door"]`;
  pair the phone through the pairing card (the code, the presentation, Allow); then move the name (H9's way: the stand-in's
  `dnsName` moved, SIGINT to the stand-in's own Funnel child by pid after re-reading its command line names
  `tailscale-standin.mjs`); read **C**; press Allow.
- **L2 at B_PLANTED** (no press first): the door publishes with `probe` waiting; read **W**; press Allow.

Every reading is taken from outside the app's own reports: `window.gmux.pocket.status()` and the Settings page's DOM over
CDP, the stand-ins' own logs. Each arm is graded at HEAD; the parent's reading of the same moment is recorded beside it
and graded only where a clause says so. Widths: the window's own (760 px) for every arm, and N again at 640 px and 1200 px
through `Emulation.setDeviceMetricsOverride` (as `probe:p3332` does), then the override cleared.

| Arm | Clauses (HEAD unless named) |
| --- | --- |
| **N1** the first-setup face | step 2 reads `Read, then allow` (`data-phone-step-state="confirm"`); exactly one `[data-phone-confirm]`, `data-phone-confirm-face="whole"`; the four `dt` texts are `Reachable at`, `Your phone can`, `Phones`, `Alerts` in order; the four `dd` texts equal THIS FILE'S OWN composition from `status.publicName`, `status.publicPort` and the wrapper's path by D4's rule (re-implemented here, not imported), the literal `see your sessions, type into them, answer questions, send a message, end a session`, `none yet` and `off`; no `[data-phone-face-new]`; `status.confirmFace` equal to the drawn words |
| **N2** the rectangles | at 760, 640 and 1200 px: every `dt`'s left edge equal (±0.5 px); every `dd`'s left edge equal and at least the widest `dt`'s right edge + 12 px (−0.5); every `dd` inside the block; Allow's right edge the block's right edge (±1 px) and its top at or below the `dl`'s bottom; the summary's top at or below Allow's bottom; the block's `scrollWidth` ≤ its `clientWidth`; at 760 px the block's height is LESS than the parent's block's height in the same arm |
| **N3** shut at rest | `details.open === false`; the `<details>`' height equals its summary's (±1 px); the block's `innerText` holds no `confirmLines` line, no `POCKET_CONFIRM_WARNING` and no honesty sentence; its `textContent` holds every one (RD's reading) |
| **N4** the keyboard, and Details byte for byte | Allow focused (`.focus()`); ONE trusted Tab (`Input.dispatchKeyEvent`, keyDown and keyUp, `Tab`, 9) puts `document.activeElement` on the `<summary>`; ONE trusted Enter (`Enter`, 13, `text: '\r'`) opens it (`details.open === true`); then, with `status()` read before and after the DOM read and equal: every `li` in the `<details>` by `textContent` equals `status.confirmLines` in order, byte for byte; the `p.set-config-warning` texts are `[POCKET_CONFIRM_WARNING, POCKET_DOOR_HONESTY]` (and the Funnel right when `asksApproval`); both equal the PARENT block's `li` and warning texts in the same arm (the lines name no phone yet, so they are byte-equal across builds) |
| **N5** Allow | the click; within 10 s no `[data-phone-confirm]`, `confirmState` `confirmed`, step 2 `published` |
| **C1** the moved-name face | `confirmState` `changed`; step 2 `Changed since you allowed it`; face `whole`; `Reachable at`'s `dd` names the moved name and the port; `Phones`' `dd` is `p333121 phone`; `Alerts` `off`; at 760 px the block is shorter than the parent's |
| **C2** Details | opened by the keyboard as N4; the `li`s equal `confirmLines` byte for byte and the first names the moved name; against the parent's block: the same line count and every line equal once each `key xxxx xxxx xxxx xxxx xxxx xxxx` is masked (the two worlds' phones differ) |
| **C3** Allow | the click; within 10 s no block, `confirmed`, published at the moved name |
| **W1** the waiting face (the attack: no title row) | published with no press; `confirmed`; `routesWaiting` `['probe']`; step 2 `Published`; one block, `data-phone-confirm-face="new"`; no `dl`; exactly one `[data-phone-face-new="probe"]` whose `.phone-face-title` text is `New: probe` and which holds no `.phone-face-sentence`; Allow's vertical range overlaps the title's and its right edge is the block's (±1 px); the block is shorter than the parent's (the parent draws today's whole block under `Published`) |
| **W2** Details | opened by the keyboard; the `li`s equal `confirmLines` byte for byte; the route line names `probe`; the honesty text is `POCKET_DOOR_HONESTY` (no route has an added clause) |
| **W3** Allow | the click; within 10 s `routesWaiting` `[]`, no block, still published, the door and Funnel pids unchanged |
| **RD** the three probes' reading | on N's block before its Allow, at BOTH builds: `textContent` holds the route line, the write line (`Lets an allowed phone …`) and the honesty sentence; `innerText` holds them at the parent and NOT at HEAD; and each of `build/p317/probe-p317.mjs`, `build/p318/probe-p318.mjs` and `build/p337/probe-p337.mjs`, read as text, reads `[data-phone-confirm]` through `.textContent` and names no `.innerText` in that expression |
| **RUN** | the preflights at every launch, no real Tailscale sampled, nothing forbidden at the stand-in, main's UDP to 127.0.0.1 alone, the renamed agents read back at every launch, no Electron or stand-in of this run left (`ps -Ao pid,ppid,rss,comm` as CLAUDE.md counts it), the socket file gone, his two history files unmoved, and `app.log` holding no one-shot secret and no PEM line |

### 7.4 What it writes, and its self-test

`out/p333121/probe-p333121.json`: per arm a verdict, a sentence, and the words, rectangles and lines it compared, never a
key, a secret or a signature. `P333121_KEEP=1` keeps the scratch world and writes `rederive/` (every status, every DOM
reading) for the verifier's own reader; `P333121_ARMS` picks arms (L1 is always run, and every launch an arm depends on).
Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or an arm was unreadable, which is never a pass.
`node build/p333121/probe-p333121.mjs --grader-self-test` grades recorded fixtures for every arm, each clause red on its
own break and green on its honest reading, and starts nothing; never through `npm run`, which hands the flag to
`harness-socket.mjs`. Cost: not yet measured; budget 6 to 10 minutes (four launches, one pairing, one name move).

### 7.5 One checklist row for him (`build/p333121/CHECKLIST.md`, new, builder **probe**)

Settings then Phone on a Mac whose door is on and not yet allowed: four short lines and Allow, Details shut; open
Details, read today's lines, press Allow. Two rows: the first-setup face, and after his next update that adds a phone
feature (346), the one `New:` line.

---

## 8. Builders, disjoint files, and the seams

Three builders. Every file is in exactly one list. None is a file 345, 347.1 or 333.11.2 owns. Each builder runs
`npm run typecheck` and the vitest files it owns (scratch `HOME`, `ZDOTDIR`, `HISTFILE=/dev/null`, `TERM_SESSION_ID`
unset) before it returns, and launches no Electron.

| Builder | Owns | Task |
| --- | --- | --- |
| **face** | `src/shared/ipc/pocket.ts`; `src/main/pocket/ipc.ts`; `src/renderer/settings/PhoneSection.tsx`; `src/renderer/settings/phone-section.css`; `src/renderer/settings/phone/steps.ts` (comments only); `src/main/pocket/__tests__/p333121-face.test.ts` (new); `src/main/pocket/__tests__/p33312-allowed-routes.test.ts`; `src/main/pocket/__tests__/ipc.test.ts` (only if a row reads `status()`'s whole shape); `src/renderer/settings/__tests__/p316-phone-section.test.tsx`; `src/renderer/settings/__tests__/p3331-steps.test.tsx` | §5.1 to §5.5 and the tests of §9.2 rows F1 to F9 |
| **gates** | `build/conformance-pocket.mjs`; `build/ablation-p313.mjs` | §6: SU6 rewritten, AF1 to AF4, AR11 widened, the `face` check, the eighteen arms of §6.2 |
| **probe** | `build/p333121/probe-p333121.mjs` (new); `build/p333121/CHECKLIST.md` (new); `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 174 → 175, that one line); `build/p317/probe-p317.mjs`; `build/p318/probe-p318.mjs`; `build/p337/probe-p337.mjs` | §5.6 and §7. Writes the probe and its self-test; never runs the probe |

**The seams, exact** (built at once; the integrator reconciles):

1. `PocketStatus.confirmFace: PocketConfirmFace`, `PocketConfirmFace`, `PocketFaceRow`, `PocketFaceNew`,
   `PocketFaceFacts`, `PocketNewRouteTable`, `PocketNewRouteWords`, `pocketConfirmFace`, `pocketFaceProgram`,
   `POCKET_FACE_CLAUSES`, `POCKET_NEW_ROUTE_WORDS` and the nine `POCKET_FACE_*` words from `src/shared/ipc/pocket.ts`
   (face) ← AF1 to AF3 (gates) and the probe's CDP reading of `status()` (probe).
2. In `ipc.ts`'s `status()`: the consts `routesOffered` and `routesWaiting` and the line
   `confirmFace: pocketConfirmFace(proposal, routesOffered, routesWaiting, gate.state),` (face) ← AF1, AR11, AR11e, AF1a
   to AF1c (gates).
3. The DOM: `data-phone-confirm`, `data-phone-confirm-face`, `data-phone-face`, `data-phone-face-label`,
   `data-phone-face-value`, `data-phone-face-added`, `data-phone-face-new`, `data-phone-confirm-details`, the classes
   `phone-confirm-head`, `phone-confirm-face`, `phone-face-title`, `phone-face-sentence`, `phone-confirm-actions`, and
   `DISCLOSE_DETAILS` exported from `PhoneSection.tsx` (face) ← SU6, AF3 and the arms (gates), every arm of §7.3 (probe).
4. `src/main/pocket/__tests__/p333121-face.test.ts` (face) ← the `face` check (gates).
5. The three probes' `.textContent` expression (probe) ← RD (probe).

---

## 9. The proof, run rather than read

### 9.1 The battery (the integrator, then the committer at landing)

`npm run typecheck`; `npm run build` (which runs `gate:electron` at the floor 175, `gate:background`, `gate:checks`,
`gate:onlyadd`, `conformance:ios` with `vectors.mjs --check`, and `contract-inventory --check`); the whole vitest with a
scratch `HOME`; `conformance:pocket`; `conformance:pocket:hostile`; `conformance:machines` (`src/renderer/settings/**`
moved); `conformance:phonecopy` (`PhoneSection.tsx` moved); `ablation:p313` over the moved arms only (§6.2's eighteen and
the nine re-run, through `P313_ONLY`; the whole run takes about an hour and is not owed by this phase); `gate:contract`
(must read no diff); `gate:checks`; `gate:electron`; `gate:background`; the self-tests of `probe:p333121`, `probe:p317`,
`probe:p318` and `probe:p337`; and `git diff --stat 576f1908`, naming only this phase's files. `npm run package` and the
Electron smokes are not the integrator's.

### 9.2 What the face builder's tests must show (driven, not read)

`p333121-face.test.ts` (new; `vi.mock('electron')` as `pairing.test.ts` does, so `describePocketDoor` and
`pocketExecutionHash` are the shipping ones):

| Row | Shows |
| --- | --- |
| F1 | the four rows over the eleven, for `never`, `changed` and `unknown`, alerts on and off, zero, one and two phones (two in `id` order whatever order they are handed in), the app's path (`by Tailscale`), `/opt/homebrew/bin/tailscale` (the whole path) and `''` (no `, by`) |
| F2 | `confirmed`: no rows, and `added` for the waiting list in its order; no table row: `New: probe`, `null`; a table row handed as the fifth argument: `New: <title>` and its sentence; `can` leaves out a waiting route that has a clause (a test table cast over `keys`) |
| F3 | EVERY HASHED FACT MOVES DETAILS: the fifteen moves of §2.3, each alone on a `changed` composition, move `pocketExecutionHash` and `describePocketDoor(…).lines`; the face moves for exactly the eight §2.3 names (a table in the test, so a face that starts or stops saying one is red here) |
| F4 | the face says nothing private: over a phone with keys and an alert address, no face value holds the tailnet, a fingerprint, a device digest, a key or the token |
| F5 | `POCKET_FACE_CLAUSES` has a key for every `POCKET_ROUTE_IDS` id and no other; `POCKET_NEW_ROUTE_WORDS` is empty and frozen |

`p33312-allowed-routes.test.ts`, through the SHIPPING `PocketHost` and its existing rig:

| Row | Shows |
| --- | --- |
| F6 | in C3 (a first setup): `status().confirmFace.rows` names the proposal's name and port and `none yet`; `added` empty |
| F7 | in C4 (a route waits): `confirmFace.rows` empty and `added` `[{ id: 'probe', title: 'New: probe', sentence: null }]` |
| F8 | in C11b (`changed` with a route waiting): four rows and `New: probe` |

The renderer tests:

| Row | Shows |
| --- | --- |
| F9 | `p3331-steps.test.tsx`: the test "draws today's confirm block byte for byte, and never inside a disclosure" becomes "draws the face and Details": for the same five compositions, the `<details>` holds, after `<summary>Details</summary>`, exactly today's markup of the lines and the warnings (the reference function keeps `cb8d52a6`'s list and warnings verbatim, less Allow), has no `open`, and is the block's last child; the block is in no `<details>`; Allow is outside the `<details>`; a published door with a route waiting draws `data-phone-confirm-face="new"` and no `<dl>`; `p316-phone-section.test.tsx`: every status fixture carries a `confirmFace`, the page still holds `POCKET_CONFIRM_WARNING` and `POCKET_DOOR_HONESTY` (in Details), the source still reads `{pocketDoorHonesty(status.routesOffered)}`, and the three `phone` rows of 333.12's fix round still pass |

### 9.3 The verifier: Tier 2, lighter checking

One verifier, no separate probe review. It runs the battery once (catching a red one), then spends its time on:

- **The app run.** `probe:p333121` once, under THE LOCK, with all four builds made as §7.2 says (`df -h /` first) and
  `P333121_KEEP=1`; it re-derives N1's, C1's and W1's words from `rederive/` with its own reader, and feeds each grader it
  relies on a broken fixture of its own.
- **The attack, independent of the builders.** Its OWN field mover (not F3) over the shipping `describePocketDoor`,
  `pocketExecutionHash` and `pocketConfirmFace`: each hashed fact moved alone and in pairs, on a `never` and a `changed`
  composition, each must move the hash and Details, and the face exactly where §2.3 says. A hostile fixture: a title row
  planted into `POCKET_NEW_ROUTE_WORDS` in a `cp -Rc` clone (cast over `probe`) draws `New: <title>` and its sentence
  through `renderToStaticMarkup` of the shipping `PhoneView`; a title holding markup is drawn as text; 64 phones of 64
  characters keep every `dd` inside the block at 640 px (`N2`'s rule over its own render).
- **At least three ablations of its own**, in a clone, each red on a gate or a test.
- **Count once at the end**: `ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`,
  and his two history files.

Then the fix round if needs_work, and an independent reverify; on a second needs_work the main session decides.

---

## 10. What is NOT in this phase

- **No change to what Allow does**, to the hash, the fields, the routes, the sets, the three confirm paths or the
  narrowings; `confirmLines` and `confirmHash` are byte for byte today's.
- **No change to the pairing card** (`stage === 'match'`, its lines and warning), and no phone code.
- **No row in `POCKET_NEW_ROUTE_WORDS`**: Start's title and sentence are 346's.
- **No "what changed" marking** on the moved-field face (Question 1); no per-route choice at Allow.
- **No remembered Details state**: no `open` prop, no store, no `localStorage`.
- **No new IPC channel, no menu change, no new token, no colour literal.**
- **No edit to `probe:p3331` or `probe:p33312`** (D15, D12), and no edit to `push-seam.ts`.
- **No release on its own**: it ships with 346 in the Mac release that carries Start; no CHANGELOG line by a builder.

---

## 11. For the main session at landing

- **`package.json`**: `"probe:p333121": "node build/harness-socket.mjs --fresh gmux-p333121 'node build/p333121/probe-p333121.mjs'"`.
- **`build/verification-checks.mjs`**: `electron('probe:p333121')` beside `electron('probe:p33312')`, in the same commit
  as the package script, or `gate:checks` reads red.
- **`HELPER_USER_FLOOR`**: 175 here; reconcile with any script 345 or 333.11.2 added.
- **`CLAUDE.md`**: in the `conformance:pocket` row, one sentence: "Since Phase 333.12.1 the confirm block is main's face
  and Details (his ruling of 2026-10-15, replacing ruling 2): SU6 holds the hashed lines and both warnings inside one shut
  `<details>` byte for byte with Allow outside it, AF1 to AF4 hold the face to one composer over the proposal, its words,
  a sheet that composes none of it and a Details that names every hashed fact"; its ablation count gains the fifteen new
  arms (two more re-purposed, one re-anchored). In the probes table, a `probe:p333121` row from §7 with the verify's measured cost; in the `probe:p3331` row,
  "since Phase 333.12.1 its R row's block-text clause reads the retired ruling 2 and is false at every later head"; in
  the `probe:p317`, `probe:p318` and `probe:p337` rows nothing, unless the verify's RD arm reads otherwise.
- **`CHANGELOG.md`** under `## Unreleased`: "Settings then Phone asks for Allow in a few short lines, with the full detail
  one click away." It ships with 346.
- **After landing**: the running-log line, and the scratch clean-up (this worktree, `scratchpad/p333121/**`, the four
  probe checkouts).

---

## 12. What the spec step measured, how, and the numbers

All under `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p333121/spec/`
(`spec/` below), every tsx run with `HOME` and `ZDOTDIR` set to `spec/home`, `HISTFILE=/dev/null`, `TERM_SESSION_ID`
unset, `electron` mapped to `spec/electron-stub.ts` (a scratch userData, a seal that never touches the keychain, a fork
that throws) through `spec/tsconfig.json`, and the pinned tsx `/private/tmp/wt-p333121/node_modules/tsx/dist/cli.mjs`.
No lock slot. `df -h /`: 81 GiB free.

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| M1 | `git -C /private/tmp/wt-p333121 diff --stat 786ee1c6 576f1908`; `git status --short` | 0, 0 | 2 files (`CHANGELOG.md`, `docs/BACKLOG.md`): the parent's source is the landing commit's; the tree clean |
| M2 | `node <tsx> --tsconfig tsconfig.json measure.mts` (and `measure-w.mts` at `P333121_BODY` 464, 344, 512) | 0 (×4) | §2.2: 7, 8 and 8 lines; 522, 727 and 650 characters; warnings 170 and 200, the Funnel right 102; heights as tabled |
| M3 | `node <tsx> --tsconfig tsconfig.json moves.mts` (the draft read literally: the program's basename) | 0 | 15 moves: hash 15, Details 15, face 6; 9 move Details alone, among them the program between `/usr/local/bin` and `/opt/homebrew/bin` |
| M4 | `node <tsx> --tsconfig tsconfig.json moves2.mts` (this file's composer) | 0 | 15 moves: hash 15, Details 15, face 8; the 7 that move Details alone are the tailnet, start-with-Tortie, a phone's three keys, its alert address and its environment |
| M5 | the battery's package scripts read from `package.json` | 0 | `typecheck`, `build`, `test`, `conformance:pocket`, `conformance:pocket:hostile`, `conformance:machines`, `conformance:phonecopy`, `ablation:p313` (with `P313_ONLY`), `gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:onlyadd` all present; `HELPER_USER_FLOOR` reads 174 (`build/assert-electron-teardown.mjs:496`) |

**Read, not run**: every `[data-phone-confirm]` reader under `build/` and `src/` (14 files, three of them SPECs; §5.6,
D12, D15 name what each probe reads); the arms of `ablation-p313.mjs` on `PhoneSection.tsx`, `steps.ts` and `status()` (§6.2); `RENDERER_FACING`'s
token rule (`conformance-pocket.mjs:2019-2027`: none of the new member names is token-like); the contract inventory's
sections (`PocketStatus` is not in it).

**His shell history.** `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `737736 1792023873` and
`23166 1790702242` at the start, before and after each of M2 to M4, and at the end. Neither moved.

---

## 13. Questions for him

1. **Saying what changed.** On `Changed since you allowed it`, seven facts move Details and leave the four lines as they
   were: the tailnet, start-with-Tortie, a phone's keys, its alert address and its environment (§2.3). A phone's keys and
   alert address move only through the pairing card's own Allow, start-with-Tortie only through his own switch, and the
   tailnet moves the name with it, so the face's state word and Details carry those. Recommended: as built. The
   alternative, a later phase: main reads the record's own lines and the face draws one `Changed:` line naming the facts
   that moved.

---

## §Attack — the spec step's own attack, and what it changed

| # | Attack | What it changed |
| --- | --- | --- |
| A1 | "Compose the face in the renderer from the status." The program's path is not on the status; the sheet would spell facts main owns (`steps.ts`'s header, 333.12 §Attack A14); and two composers could disagree with the lines | D1: main composes it from the one proposal |
| A2 | "`by Tailscale` is the program's basename." Measured: a move between `/usr/local/bin/tailscale` and `/opt/homebrew/bin/tailscale` moved the hash and Details and left the face as it was (M3) | D4: the app's name under `/Applications`, else the full path; measured after (M4) |
| A3 | "Take the face's clauses from `WRITE_CLAUSES`, as the entry says." Shared cannot import main; the approved words are shorter; an id's clause is its meaning and is never edited (`route-ledger.ts`) | D5: a face table keyed by every route; `WRITE_CLAUSES` stays Details' |
| A4 | "The waiting face needs no Details: his drawing shows none." That Allow records the whole proposal; a person must be able to read every line it records before it answers the internet (refusal 8) | D9: Details on both faces (the entry's mechanism 3) |
| A5 | "Open Details when the door changed." The entry and the task say shut at rest; the state word says it changed | §13 Q1 |
| A6 | "A route with no title row can be left off." A person would allow a route the face never named | D7: `New: <id>`; W1 reads it in the app |
| A7 | "Nothing else reads the block's words." `probe:p317` W1, `probe:p318` R0 and `probe:p337` S0 and SB0 read its `innerText`, which a shut `<details>` leaves out | D14: `textContent`; RD proves it at both builds |
| A8 | "Re-run `probe:p3331`: `PhoneSection.tsx` triggers it." Its block-text clause is his ruling 2 against 333.1's parent and reads false by design | D15: stated, not run; `probe:p333121` measures this surface |
| A9 | "`Your phone can` over everything offered." On a moved field with a route waiting the face would say the new route twice | D5: offered less waiting |
| A10 | "Rows on the waiting face too." The approved waiting face is one line; every other fact is what he already allowed | D6 |
| A11 | "Remember whether Details was open." Shut at rest means shut whenever the block appears | D9: uncontrolled, no `open`, no store |
| A12 | "Draw the face as a list, like the lines." `probe:p33312` H4 reads every `li` and every `p.set-config-warning` in the block as the hashed lines and the warnings | D12: `dl`, `dt`, `dd` and `p` |
| A13 | "Two Allow buttons, one per layout." SU6 holds one press; two JSX places invite one to drift | D11: one place, laid out by `data-phone-confirm-face` |
| A14 | "`type into them` understates `as you would at this Mac`." It is his approved word; the whole clause and the honesty sentence stay one press away in Details, and the pairing card is unchanged | kept, stated |

---

## §As built

Written by the integrator, then the fix round if there is one.

### The integrator, 2026-10-15 (14:32 to 14:45)

**The seams needed no reconciling.** The three builders wrote §5, §6 and §7 as specified and each ran against the
others' files before returning: every `from` anchor of §6.2 matched exactly once in the face builder's lines (the
gates builder's run and this one's, below), the probe's self-test reads the face builder's names in the tree, and no
file moved after a builder's report. Nothing was re-anchored. Builder decisions beyond the text, kept as built:

- **face**: F8 is not "in C11b" (C11b's fields already hold `probe`, so nothing waits there); it builds a `changed`
  door with a route waiting as C9's second row does, a record over port 10000 on `updatedWithAWaitingRoute()`, and
  reads four rows and `New: probe`. `ipc.test.ts` was not edited (no row reads `status()`'s whole shape). The header
  sentence "the confirm at Allow is never inside one" became "Details holds the hashed lines; Allow is never inside a
  disclosure", because it had become false.
- **gates**: AF3 also requires each part of the face (a row's label and value, a waiting route's title and sentence,
  Allow) to be DRAWN outside Details, because a sheet that drew only Allow stayed green while the layout attribute
  still read `status.confirmFace` (its own mutation found it); SU6 requires `DISCLOSE_DETAILS` declared once as
  `'Details'`; AF2 also requires one `POCKET_FACE_CLAUSES` key per route id and both face tables frozen; AF3's layout
  literals are exactly `'whole'` and `'new'`. Rules 148 to 152.
- **probe**: D4 re-implemented by path segments (`programName`), checked against the tree's `pocketFaceProgram` over
  14 paths in its self-test; stand-in strays between launches ended by pid and reported, not graded; `isMain` moved
  last in the file so `run()` never meets an unset module const; extra refusals, each exit 2: a parent that already
  draws the face or a head that does not, a planted copy whose sheet files differ from its twin or are not `planPlant`
  over it, and an `out/` older than `phone-section.css`, `settings.css`, `StepsCard.tsx` or `SettingsApp.tsx`.

**The integrator's own edits, and why** (the task text, which outranks D19 and §11 here, asked for the first two):

| File | Edit | From |
| --- | --- | --- |
| `CHANGELOG.md` | under `## Unreleased`, a new `### Changed` between `### Added` and `### Fixed`, one item: "Settings then Phone asks for Allow in a few short lines, with the full detail one click away", no full stop and no link | the entry's words; the file's own rule (each commit once under Added, Changed or Fixed; a reworded surface is a change); `786ee1c6` wrote its items the same way and the follow-up docs commit adds the link |
| `CLAUDE.md` | one sentence appended to the `conformance:pocket` row, after the ablation sentence, so its "533 in all" stays 333.12's count and the new sentence says 548 | §11's sentence, with the count measured: `grep -cE "^    n: '"` reads 548 at HEAD and 533 at `576f1908` |
| `build/p333121/SPEC.md` | this section | the task |

Left to the main session at landing, as §11 says: `package.json`'s `probe:p333121`, its `build/verification-checks.mjs`
entry (in the same commit, or `gate:checks` reads red), the `probe:p333121` and `probe:p3331` rows of CLAUDE.md's
probes table (the probe's cost is the verifier's to measure), and `HELPER_USER_FLOOR` against any script 345 or
333.11.2 added (175 here).

**The face, driven through the shipping composer** (the pinned tsx, scratch HOME, exit 0): a first setup at the app's
path reads `Reachable at` `mac.tail0000.ts.net:8443, by Tailscale`, `Your phone can` `see your sessions, type into
them, answer questions, send a message, end a session`, `Phones` `none yet`, `Alerts` `off`, `added` empty; a
`changed` door at `/opt/homebrew/bin/tailscale` with phones `b`/`Two` and `a`/`One` handed in that order, alerts on
and `probe` waiting reads `…, by /opt/homebrew/bin/tailscale`, `One, Two`, `through Apple, never what an agent asks`
and `New: probe` with a null sentence; `confirmed` with `probe` waiting reads no rows and `New: probe`. Those are the
two faces he approved.

**The battery** (`cd /private/tmp/wt-p333121`; every command that runs a test or a shell with `HOME` and `ZDOTDIR` at
`scratchpad/p333121/integrator/home`, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset):

| Command | Exit | Numbers |
| --- | --- | --- |
| `git diff --stat 576f1908` | 0 | 14 tracked files before the integrator, 16 after (`CHANGELOG.md`, `CLAUDE.md`); 1,501 insertions, 135 deletions; untracked `build/p333121/{SPEC.md,probe-p333121.mjs,CHECKLIST.md}` and `src/main/pocket/__tests__/p333121-face.test.ts`. Nothing staged |
| `npm run typecheck` | 0 | 2 s (incremental); boundaries 0 violations over 1,429 files, 0 runtime cycles over 1,426 |
| `df -h /`; `npm run build` | 0 | 78 GiB free; 44 s; `gate:electron` 175 users against the floor 175, `gate:background` 19 of 19 fixtures, `gate:simulator`, `gate:docker`, `gate:knownhosts`, `gate:checks` 270 check scripts, `conformance:ios` 50 rules, `gate:onlyadd` PASS (11 routes, 158 requests replayed), `conformance:harnessprobes` 6 clauses and 16 ablations, `contract-inventory --check` byte for byte |
| `npm test` | 0 | 76 s; 1,135 files passed and 2 skipped of 1,137; 21,207 tests passed and 14 skipped of 21,221 |
| vitest over the five phase files (`p333121-face`, `p33312-allowed-routes`, `ipc`, `p316-phone-section`, `p3331-steps`) | 0 | 2 s; 5 files, 359 tests (31, 17, 135, 113, 63) |
| `npm run conformance:pocket` | 0 | 8 s; PASS, 152 rules, 20,725 checks in 7.14 s; SU6 21 checks, AF1 16, AF2 19, AF3 10, AF4 18, AR7 21, AR11 19, AR12 9 |
| `npm run conformance:pocket:hostile` | 0 | 17 s; PASS in 16.85 s, 279 arms |
| `npm run conformance:machines` | 0 | 32 s; PASS |
| `npm run conformance:phonecopy` | 0 | 2 s; phonecopy OK, every self-test mutation red and the control green |
| `P313_ONLY=SU19,…,AF4b node build/ablation-p313.mjs` (§6.2's eighteen and the nine re-run) | 0 | 259 s; base 11 checks green; 27 of 27 red on the rule that owns each, every clone file restored by sha256, the worktree never written. Beyond its own rule: SU19 and SU20 also AF3 and `steps`; SU6b also AF3; AR11a and AR11e also AF1 and `allowed`; AR7d also `phone`; AF2a also `allowed` and `face`; AF4b's own rule is `face` |
| `npm run gate:contract` | 0 | the inventory byte for byte; the baseline does not move |
| `npm run gate:checks` | 0 | 270 check scripts classified, 53 `tsxCli()` callers against the floor 53, 1,137 test files reach no home past HOME |
| `npm run gate:electron` | 0 | 561 files, 175 reach the helper, floor 175 |
| `npm run gate:background` | 0 | 563 files, 3 start a process they do not wait for, each ended in a `finally`; 19 of 19 fixtures |
| `node build/p333121/probe-p333121.mjs --grader-self-test` | 0 | 13 graders, 75 clauses, 188 checks, nothing started |
| `node build/p317/probe-p317.mjs --grader-self-test` | 0 | 13 graders, 61 clauses |
| `node build/p318/probe-p318.mjs --grader-self-test` | 0 | 25 graders, 80 clauses |
| `node build/p337/probe-p337.mjs --grader-self-test` | 0 | 24 graders, 99 clauses |
| `grep -n textContent … \| grep data-phone-confirm`; `grep -n 'HELPER_USER_FLOOR = '` | 0 | `probe-p317.mjs:1289`, `probe-p318.mjs:1770`, `probe-p337.mjs:2858` read `b.textContent`; `assert-electron-teardown.mjs:496` reads 175 |

**One accident, stated.** At about 14:36 a `node -e 'import("./build/ablation-p313.mjs")'`, meant to count the
harness's entries, RAN it instead: the whole harness, in its own clone `/private/tmp/p313-ablation-42212-kh8UHr`,
with the session's real HOME rather than the scratch one. Its SIGTERM handler could not run while it sat in a
synchronous spawn, so after 2 min 30 s it was ended by its own pid with SIGKILL; the one child left, a hostile-client
run, finished by itself within 10 s; then no process named the clone and it was removed. It wrote nothing in the
worktree (the harness hashes the worktree and writes only its clone, and `git status` read the same files after),
it overlapped `npm test`, which had its own scratch HOME and passed, and his history files did not move across it.
The 27-arm run above is the one this section counts.

**Counted once, at the end** (14:44): `ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep
-v defunct` reads 5 lines, the same 5 the gates builder counted before this step; this step started no Electron. No
`p313-ablation-*` clone is left. No lock slot was taken, no Simulator, agent or model turn.

**His shell history.** `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `737736 1792023873` and
`23166 1790702242` at 14:32, before and after every command above that started a shell or a test, and at the end:
neither file moved.
