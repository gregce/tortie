# Phase 374 — "the meter reads the Antigravity plan from agy's own status line" — SPEC

Written by the spec step on 2026-11-24 in `/private/var/tmp/tortie-wt/wt-p374`, a detached worktree at origin/main
`6ebc22e6` (its code is 0.116.0's). **`git diff 6ebc22e6` in the worktree must be exactly Phase 374's delta**, this file
included. origin/main may move; nobody here rebases, pulls or merges; the main session moves the tree at landing. The
charter is `docs/BACKLOG.md` "## Phase 374" (`:45611`), bound as written except where §0.1 says the tree or a
measurement wins. Research 146 binds (its §16 was written after the entry), and research 72 §4 and §5 stand whole.
His answers of 2026-11-24: build it, OFF until he turns it on, with one line in Settings that Google was asked and has
not answered; read the PRESENCE of `statusLine` in agy's settings file and nothing else of it; NO Gemini row ("yes its
fine we can skip gemini"); the Gemini models' group on the face, Claude and GPT on the card. His standing rulings bind:
**no regression against today** (a scenario worse than the parent is a defect: fix it or drop the part, and name which);
Tortie never ends a session on its own; just enough words; no tmux vocabulary in anything a person reads; nothing
released, tagged, version-bumped, archived or uploaded; refusals 1, 5 and 8; his session count is allowed
(`build/electron-run.mjs`'s read-only census around a launch that names `tmuxSocket`).

| | |
| --- | --- |
| Subject | `feat(usage): read the Antigravity plan from its status line` (the entry's) |
| First body line | `Phase 374: the meter reads the Antigravity plan` (the entry's) |
| Semver | Minor. Parts (a) and (b) are ONE build and ONE commit. No release: that waits for his word |
| Lane | Build: Spec → Build (FOUR builders, disjoint files) → Integrate → Verify (two lenses) → [Fix once → Reverify] → Commit |
| Tier | **3**: a command in his agent's sessions, where a mistake stops a session from starting or draws in his conversation; and the provider table is part of the domain that reads credentials. Two independent methods at least, one an attack (§10) |
| The cure | (a) One compiled entry per provider, so a third provider can never become Codex. (b) An inline `--settings` on the spawned argv of a NEW Antigravity session and on nothing else, a `sh` script that writes one 0600 file and posts nothing, and a reader that ages it |
| Menus | **No row added, renamed or removed.** The meter and Settings then Agents gain a row; no menu names a meter |
| Contract | **Does not move.** No channel, schema, `GMUX_*` name, smoke mode, `gmux.*` key or notice kind. `usage:read` answers a wider shape (a third row, two optional-by-null fields), which is not a contract line. `gate:contract` must read byte for byte, and a diff there is a finding |
| `HELPER_USER_FLOOR` | **193 → 194** (`build/assert-electron-teardown.mjs:702`): `build/p374/probe-p374.mjs` reaches `build/electron-run.mjs` (obligation 1). Phase 371 raises it too: the main session reconciles |
| CHANGELOG | One item under `## Unreleased`, `### Added` (§5). The brief said Fixed; the entry and the answer schema say Added, and nothing was broken |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer, the reverifier)

- **NO REAL AGENT AND NOTHING OF HIS ACCOUNT.** `agy` and `gemini` are never run, not even for a version. NEVER open,
  list, stat or copy anything under `~/.gemini`, an Antigravity profile, his keychain (`security` is never run) or any
  credential store. A test that needs agy's settings file writes a fixture under a scratch HOME and hands that home in.
  No request to any Google host; no network at all. Every agy in a test or a probe is a stand-in under its bare name on
  a closed PATH; every other probed row is hidden (`hiddenAgentsBesides(['antigravity'])`) and `agents:list` read back
  (`standInsOnlyVerdict`, exit 2 otherwise). An app run has a scratch profile AND a scratch HOME.
- **THE REPOSITORY IS PUBLIC.** Nothing committed says which plan he has or how much of it he uses. A fixture made from
  `/private/var/tmp/tortie-ops/keep/p373` (READ ONLY) has its times shifted to a fixed epoch, its fractions replaced by
  invented ones that keep only the SHAPE (which run changes, which alternates), no plan tier, no path, no clock date.
- NEVER commit, stage or stash here or in any checkout of his. `/Users/gdc/gmux` READ ONLY. Never touch `wt-p371`, its
  parent or `wt-docs`. The parent is `/private/var/tmp/tortie-wt/wt-p374-parent` (`6ebc22e6`, built:
  `parent-build.log` ends `exit 0`); nobody edits or installs anything in it. No dependency moves; never `npm install`.
  Electron 45.3.4, node 22.23.1 at `/Users/gdc/.nvm/versions/node/v22.23.1/bin`.
- Scratch is `/private/var/tmp/tortie-wt/scratch/p374/<role>/`, never `/private/tmp`; a probe's `TMPDIR` points there.
- `-L gmux` is named only by `build/electron-run.mjs`'s census, with `list-sessions`. Never `pkill`, `killall`, a `pgrep`
  pattern or a negative pid; end only pids you started, each read again by `ps -p <pid> -o command=` right before its
  signal, in a `finally`; leftovers at the end 0. Do not stop his Tortie (a bare `Tortie`, pid 50568 that day), his tmux
  server, his other Claude sessions or his tools. Never an Apple Event, `osascript` against an app, or `open`.
- Never open his live Tortie profile, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, any conversation store or a crash report.
- **His shell history is never written by us.** What does not launch an Electron or need `/bin/ps` runs under
  `zsh /private/var/tmp/tortie-ops/sb.sh <dir> "<command>"` (the four `/bin/ps` native tests cannot pass inside it: name
  them). What needs `/bin/ps` or Electron runs outside with HOME and ZDOTDIR in scratch, `HISTFILE=/dev/null`,
  `SHELL=/bin/sh`, `TERM_SESSION_ID` and `TERM_PROGRAM` unset. NEVER Electron under `sandbox-exec`. Record only
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after. A move across an unblocked run: start nothing for 3
  minutes, stat again; still moving while nothing of yours runs is his; otherwise STOP and report.
- The lock: `zsh /private/var/tmp/tortie-ops/lock.sh try p374-<role>`, released in a trap. Every Electron run holds one.
- `smoke`, `smoke:t1`, `smoke:t3` and packaging are the main session's. `conformance:resume:capture` and
  `conformance:resume` start real agents and are NOT run. No Simulator. Never import a `build/` script to inspect it.
- An app run launched with `program: 'app'` (the shim needs `node` on the PATH you closed; the spec step's first run
  died on exactly that) and `--use-mock-keychain`, `GMUX_PROBES=1`, the usage fixture installed before any meter is on.

## 0.1 What the tree and the measurements give (each binds)

1. **Every file:line the entry cites is where it says**, with three drifts: `claudeTapDecision` is
   `src/main/activity/hooks.ts:789`, `withClaudeSettingsFlag` `:965` (exact); the recorded splice in `create-local.ts` is
   `:679-686`; the spawn composition is `:787`.
2. **The compiler sees 6 places and is blind to the worst one.** With the union and the settings widened in a scratch
   copy, `tsc -b` objects at exactly `src/main/usage/ipc.ts:106`, `src/renderer/app/usage-copy.ts:20` and `:26`,
   `src/renderer/app/UsageMeter.tsx:277`, `:509`, `:521`, `:528`, and at 19 `UsageSettings` literals in seven test files
   (`p181-service`, `p1812-plan`, `p182-tap`, `p200-shutdown`, `p202-login-meter`, `p281-usage-read` under
   `src/main/usage/__tests__`, `p1812-usage-bar-row` under `src/renderer/settings/__tests__`). It says NOTHING of
   `src/main/usage/service.ts:334`, `:353`, `:378`.
3. **The Codex fall-through is reproduced** (vitest, scratch copy of the parent, both arms): with only `antigravity: true`,
   `read()` and `refresh()` each read `/Users/example/.codex/auth.json`, sent one request to
   `chatgpt.com/backend-api/wham/usage` with the Codex bearer, and answered `provider: antigravity, state: ok, 7%, plan:
   pro` while `codex` read `off`.
4. **What the compiler cannot see, found by reading**: `sanitizeUsageSettings` (`settings.ts:314`, drops a new switch),
   `emptyUsageProvider` and every snapshot literal in tests, `UsageMeter.tsx:394-408` (Choose login drawn per group with
   no provider test), `:243` (`sessionsElsewhere`, safe: a row with no login equals a null login), the one refresh
   control for all rows, the `USAGE_STALE_MARK` words ("Last read failed", false for a row nobody asks for),
   `UsageGroup.tsx`'s two rows, THREE false sentences and not two (below), `src/renderer/state/usage.ts`'s reconcile,
   `p1812-plan.test.ts` (pins the call sites of `usagePlanWord`), the drives `src/renderer/app/p1812-usage-drive.ts`,
   `p202-logins-drive.ts`, `p203-account-drive.ts`, and the probes that flip `{ claude, codex }` (a partial patch is
   sanitized to `antigravity: false`, so they stay right).
5. **A third Settings sentence becomes false**: `USAGE_ABOUT_KEPT` ("Nothing is stored. Numbers stay in memory until
   you quit", `usage-copy.ts:75-76`), because the script's file is a store. The entry names `:72` and `:78` only.
6. **The parent's argvs, through the shipping composers** (`resolveLaunchSpec`, `spawnArgvFor`, `wrapArgv`,
   `registryResumeArgv`, `buildArmedCommand`; binary `/Users/example/.local/bin/agy`):

   | Path | argv or line at the parent |
   | --- | --- |
   | create, recorded | `[<abs>/agy, …extras]`, `resumeArgv` absent, `idCapture: store-harvest`, no env |
   | create, spawned | `[agy, …extras]`; `[<abs>/agy, …extras]` when the name is not the file |
   | restore and typed resume (81 characters) | `<abs>/agy --conversation <uuid>` typed at a shell, no Return; with extras they follow the id |
   | resume in place | the same line, through `composeLocalArmedText`, at most 1,000 characters |
   | Restart | a create: new id, extras recovered from the recorded argv (`recoverLaunchExtras`), no conversation id |
   | captured create, recorded | `/opt/specstory run antigravity --no-version-check --silent -c "<abs>/agy …"`; spawned with `agy` inside the `-c` |

7. **`bareNameSpawnRuns` has exactly one allowed caller** (`conformance:agents` 11.11, `build/conformance-agents.mjs:3695`),
   `piInlineFloorFor`. This phase adds a second, so that clause moves on purpose (D7), and only its caller list.
8. **The meter's rectangles at the parent** (one app run through the helper, fixture rows Claude `37% 5h · 12% wk` and
   Codex `41% 5h · 9% wk`, agents all hidden and read back; a CLONED third row `4% 5h · 2% wk` beside it in the live DOM):

   | Placement | two rows | with a cloned third |
   | --- | --- | --- |
   | dock foot, 200 px | meter 187 × 49, rows 155 × 16 at y 858, 878; refresh 20 × 20 | meter 187 × 69; rows at 838, 858, 878; bar 50.4 px |
   | dock foot, 160 px | meter 147 × 49, rows 115 × 16, bars 18 px, text 92.6 px wide beginning at 1335 | meter 147 × 69, text 78.6 px, no row over the edge of its text at the parent's own width |
   | rail (mini) | meter 47 × 43, rows 31 × 11 | meter 47 × 58 |
   | strip, 1440 | meter 326.2 × 20, rows 152.6 and 145.6 | meter 472.7 × 20, third 138.6 |
   | strip, 960 | compact, 326.2 | **the strip leaves compact: the app chose `mini`** |

   **So 146 §9's "three rows stay compact at 960 (393 of 412 px)" holds only for his numbers of that day** (Codex drew
   one window). With three rows of two windows each the strip needs 472.7 px and the app's own rule goes to bars at 960.
   That happens only with the new switch on; it is the existing rule (`usage-fit.ts`) and is not changed. At 160 px the
   text reaches 1,427.6 of a row ending 1,406 at the PARENT (the 92.6 px text overhangs the refresh control's column),
   so the app run compares HEAD's first two rows with the parent's and requires equality, not a fit.
9. **`src/main/agents/detection.ts` memoizes ONE scan per process** (`scanPromise`); only Settings' re-scan runs another.
   agy replaces its own file often, so "none until the next scan" would stop every new session from reporting until
   Tortie restarts. D8 answers it.
10. **`releaseSessionResources` (`core.ts:4014`) is the one place both removals pass**, and `startHookChannel`
    (`:1808`, called at `:1613`) is where the boot sweep of the Claude hook files runs; it returns early when hooks are off.
11. **The payload carries `null`s** (`context_window.current_usage`, `exceeds_200k_tokens`), an `email` at the top level
    only, and the four ids of 146 §4. The reset TIMES are constant between asks (the 42 runs: floor noise of one second
    only); a FULL bucket's reset moves with each ask. At a launch the Gemini buckets alternate between two server values
    at one reset time, up to 0.4 of a point apart, and the last run of the resume carried the higher one.
12. **His zsh history** read `751864 1795559147` at this step's start and `751928 1795563175` from 18:32:55, before this
    step started anything but file reads (its first test ran at 18:35); it did not move again. His bash history read
    `23166 1790702242` throughout.

## 1. The answer first

A NEW Antigravity session on this Mac, with the switch on, is spawned as `agy --settings '<inline JSON>' …`; the manifest
records `agy …` exactly as the parent does. The JSON holds `statusLine` (type, command, `stack_with_default`) and nothing
else. agy runs the command; the command sources one generated `sh` script in the same process, which reads the payload
with the shell's own `read`, cuts it with one `/usr/bin/awk` JSON reader, hashes the address with a salt in
`/usr/bin/openssl`, and replaces one 0600 file when what it keeps changed. It prints nothing and answers 0 always. Main
reads that folder while the switch is on and a window is in front, ages it at compose time, and draws a third row.

### 1.1 The decisions, each with its reason

| | Decision | From |
| --- | --- | --- |
| D1 | **One compiled table** `USAGE_PROVIDER_TABLE` in new `src/main/usage/providers.ts`, `satisfies Record<UsageProviderId, UsageProviderEntry>`. An entry is a `fetch` (login, host, path, headers, credential reader, parser) or a `receiver` with NO other field. `service.ts` asks the entry; the three ternaries go. A missing member is a compile error | entry (a) 1 |
| D2 | **`LoginProviderId` stays two.** `USAGE_LOGIN_PROVIDER: Record<UsageProviderId, LoginProviderId \| null>` and `usageLoginProvider(p)` in `src/shared/usage.ts`, a lookup and never a comparison. `ipc.ts:106` and the four `UsageMeter.tsx` sites go through it; null draws no login line, no Choose login, asks no login file | entry (a) 2 |
| D3 | **Inline JSON, not a file.** Accepted (146 §16); there is no file to lose between the create and the launch. The pane equals the pane without it, row for row (146 §16) | entry 4, 146 §16 |
| D4 | **The flag goes on at the spawn alone**, straight after argv[0], on the array `spawnArgvFor` returned, after the row is written. Nothing recorded, so an older Tortie, a Restart, a restore and `recoverLaunchExtras` never see it | entry 4 |
| D5 | **NO SPLICE ON A TYPED LINE** (a restore, a resume in place). Today's line is 81 characters; with the inline JSON it is about 400, four rows at 120 columns, and it stays in the person's shell history, where a later agy (older, replaced, or after Tortie is gone) meets it when they press Up. That is worse than today and it breaks "never meets it", so the splice leaves that path. The launch guard therefore needs nothing on a typed resume. The row says why it waits (D20). The entry's item 4 said "at spawn and at restore": corrected | new, entry 6 |
| D6 | **Floor 1.4.10, read of the very file the pane runs.** `probedVersionFor('antigravity', binPath, spawnedBy)` in `detection.ts`: this Mac's last RESOLVED scan read a version, the file it read is the same file now (real path, dev, inode, size, mtime, ctime), and a bare name spawn resolves to that file (`bareNameSpawnRuns`). Then the row's `runtime.kind` is `binary` and the real file's base name is `agy` (a version manager's shim or dispatcher is another file), and the version, parsed WHOLE by `parseSpecStoryVersionOutput`, is at least 1.4.10. Anything else: no splice. Reads only, never a spawn | entry 5; pi's floor |
| D7 | `conformance:agents` 11.11 admits a second caller of `bareNameSpawnRuns`, named, and adds that `probedVersionFor` is not asked by any of the pi decisions. Moved on purpose, in the commit body | §0.1.7 |
| D8 | **A changed file is read again, once, after the create.** When the splice is refused because the scan read another file (or no scan resolved), the create, after it answered, starts `rereadAgent('antigravity')`: the same `--version` probe the scan runs, for that one row, at most once per file identity. THAT session has no flag; the next has. Without it every agy update stops the meter until Tortie restarts. With the switch off nothing starts. It is in `agents/`, not in the usage domain, and it is no timed start. Question 2 | new |
| D9 | **Stand aside** when any token of the composed argv matches `^--?settings(=\|$)` or `^--?gemini[-_]dir(=\|$)`; when the session is captured; when it is on another machine (that path never reaches the line); when agy's settings own a status line (D10); when the guard holds (D11) | entry 5; `gemini_dir` is new (it moves the settings file) |
| D10 | **The presence check** reads `<home>/.gemini/antigravity-cli/settings.json` at each create with the switch on and never otherwise: absent (ENOENT) → not owned. A regular file of at most 256 KiB that parses as a JSON object: `statusLine` absent or null, or an object whose `enabled === false` → not owned. EVERYTHING ELSE (any other value, a link that does not resolve, a folder, a FIFO, unreadable, larger, not JSON, not an object) → owned, no splice. `lstat`/`stat` before open, `O_NONBLOCK`. Answers one boolean; nothing else of the file is kept, logged or sent. It is the only file under his home this phase's code ever reads. A workspace's own settings are not read (his word covers one file); stated | entry 5, his answer 3 |
| D11 | **The launch guard.** A spliced session whose process ends within 10 s of its spawn with an exit code 1 to 127 and no signal (a Ctrl-C is 130 and is not it) writes that file's identity to `guard.json` in the folder and logs one line. While the identity stands, no splice. It survives a Tortie restart. Heard from `reapDeadSession`'s own facts; it ends nothing and sets no status | entry 6 |
| D12 | **The command string** is `trap 'exit 0' 0; [ -r '<script>' ] && . '<script>' >/dev/null 2>&1; exit 0`. SOURCED, so the pid agy kills is the pid that reads: a SIGKILL ends the only thing that can wait. Exit 0 for a missing, unreadable, folder, syntax error, `exit 3`, `set -eu; false` script under `/bin/sh` (bash 3.2), `/bin/dash`, `/bin/ksh`, `bash --posix` and zsh as sh, measured (§2.2). The path is quoted by `shellQuote` and the whole by `JSON.stringify` | entry 7 |
| D13 | **The script has a JSON reader and it is awk.** §2.1 weighs it. No payload is ever written to disk, no here-document or here-string (bash 3.2 writes a temporary file for one), no argv holds payload text, no variable holding it is exported (they are `unset` first, so an inherited export cannot carry them) | entry 7, §2.1 |
| D14 | **What it keeps**: `{"v":1,"h":<64 hex>,"p":<plan word or null>,"q":{<id>:{"f","r","d","a"}}}` on ONE line, for the four compiled ids only, matched exactly. `f` a JSON number token or null; `r` a reset token of `[0-9TZ:.+-]` or null; `d` true, false or null (anything odd is true); `a` whether a `remaining_amount` was there. Never `reset_in_seconds`. The charsets are what stops an address: no kept field but the plan word can hold letters, and the plan word refuses `@` and `.` | entry 7 |
| D15 | **THE ACCOUNT** is sha256 of a 32 hex salt and the RAW JSON string token of the top level `email`, made in the script through a pipe. No `email` string, no write at all. The salt is 16 random bytes in the script file itself, kept when the script is regenerated. The hash tells two accounts apart on this Mac and is not claimed to hide one from the person's own user | entry 7, 10 |
| D16 | **It writes only where Tortie made a place.** At the splice main creates `<sid>.json` holding `{}` (0600). The script exits when that regular file is absent, so a removed session's file is never recreated and a forged id has no slot. It compares the composed line with the file's first line through the shell's `read`; equal → nothing. Different → `<sid>.json.<pid>.tmp` by the builtin `printf`, then `/bin/mv -f`. It keys on no clock | entry 7 |
| D17 | **Reading.** Off: the folder is never opened. On: `read()`, `refresh()` and a 5 s pulse in main that runs only while the service is open, the switch is on and some window is focused; the pulse lists the folder only when the folder's mtime moved or the minute did. Not an FSEvents watch, so Phase 365 does not bind. At most 512 names, 4 KiB a file, a regular file by `lstat`; an id not in the known set is dropped and counted once in one log line | entry 8 |
| D18 | **The newest file whole.** The file with the newest mtime (never later than now) is the reading, all four buckets of it, and its hash is the account. Nothing is merged across files, so two accounts are never mixed and a bucket it does not name is not drawn. The reading held in memory stays until a newer file replaces it, so removing the session it came from does not bring back an older one; after a relaunch the newest file left speaks, with its age | entry 10 |
| D19 | **The alternation keeps the LAST payload**, exactly. Method 2's bar is 0 runs where the held number differs from the last payload, and nobody here knows which of the two server values is right. Nothing reads a change: no log, no notice, no status, no count; the drawn percent may step by one at a launch. Because the fraction is compared exactly and the reset time is a kept field, an alternation is a write and the age restarts, which is true: agy asks its server at launch | entry 8, 146 §16 |
| D20 | **States.** `off`; `waiting` (nothing received, or every drawn window voided) with `waitingFor`: `session`, `own-status-line`, `version`, `captured`, `start-failed`, `unwritable`, being the LAST launch decision of this process and `session` before any; `no-windows` (the newest reading names nothing drawable); `ok`; `stale`. Never `signed-out`, `expired`, `api-key` or `unavailable` | entry 11 |
| D21 | **Age** is the newest file's mtime. Older than `USAGE_STALE_MS` (30 min) reads `stale`, decided at COMPOSE time, and the card says the age instead of "Last read failed". A window is void when its reset passed, or when the reading is older than the window is long (5 h, 7 d), so an old full bucket cannot be drawn for a month | entry 9; the second half is new |
| D22 | **A number is drawn only from 0 ≤ f ≤ 1, finite, not disabled, no amount**: used = 100 × (1 − f) through `clampUsagePercent`. −3, 1.5, 1e309, a string, null draw nothing (the clamp alone would draw −3 as a FULL bar). At f = 1 the reset is dropped. `boundUsageReset` stays the one bound | entry 8, the attack |
| D23 | **`second`**: `{ label: 'Claude and GPT', fiveHour, sevenDay } \| null` on the snapshot, drawn on the card alone. It has no bar and no face | entry 11, his answer 4 |
| D24 | **The broadcast never moves Claude's or Codex's row.** The pulse sends the rows the windows were last ANSWERED (read, refresh or tap), switched-off ones emptied, with only Antigravity's replaced; before any answer it sends nothing | no regression |
| D25 | **Off deletes.** When `run()` finds the switch off and this process had it on, and at boot with it off, the folder's own names (`status.sh`, `*.json`, `*.tmp`) are removed and the folder with them. Running spliced sessions then find no script and answer 0 in 3 ms. Turning it on again reports from the next new session | new: "every byte written is the parent's" with the switch off |
| D26 | **Lifetimes.** `releaseSessionResources` removes the session's file; the boot sweep removes files whose id has no row (a removed row counts as none) and every `.tmp`. An ended session's file stays, because its number is still the newest truth. Nothing is joined at shutdown: the pulse is cleared in `shutdown()` and a later read answers what is held | entry 12 |
| D27 | **The refresh control is absent when every drawn row is a receiver** (the full density draws no button; compact and mini draw the same box with no press). With another row drawn it stays and asks only for that one | entry 11 |
| D28 | **An older Tortie** drops the key and its next write turns the switch off; it never opens the folder; running sessions go on writing one small file each, which the next newer boot sweeps | entry, 146 §9 |
| D29 | **Refusal 8 stands.** The switch selects a compiled script; no settings field names a command, a path or a program, and `settings.json` cannot name one. Refusal 5 stands: nothing here calls a status setter | charter |

## 2. What the spec step measured, how, and the numbers

Instruments kept in `/private/var/tmp/tortie-wt/scratch/p374/spec/`: `script/cut.awk`, `script/d it's/status.sh` (the
prototype), `script/cmd-*` (the command strings), `script/{bench,kill,hostile,left}.py`, `run.sh`, `env.sh`, `t.sh`;
`app/rects.mjs` and `app/rects.json`; `union/` (the widened copy) and `union-tsc.log`. **They are evidence, not the
build**; the launch builder writes the shipping script from §4.2 and may start from the prototype. This Mac: macOS 15.7.9,
arm64, 12 cores, `/bin/sh` is bash 3.2.57, awk 20200816, LibreSSL 3.3.6.

### 2.1 Which program reads the JSON

| Candidate | quiet p50 / max (load 5) | 30 spinners, p50 / max (load 12 to 30) | Verdict |
| --- | --- | --- | --- |
| **sh + one awk + openssl + mv** (the whole run, a change written) | 10.7 / 20.9 ms | 28.8 / 38.7 ms | chosen. awk parses 1.2 KB in 2 ms |
| the same, unchanged | 8.8 / 18.8 | 23.9 / 37.1 | |
| the same under dash | 9.2 / 25.8 | 23.4 / 38.2 | |
| the same, md5 for sha256 | 11.5 / 18.6 | 28.9 / 57.1 | no faster |
| plutil, two extractions alone | 12.8 / 20.0 | 36.6 / 71.3 | reads the nulls on 15.7.9; whether macOS 13's does was not checked; two runs and still needs the hash and the compare |
| perl, JSON::PP and Digest::SHA alone | 12.7 / 26.3 | 25.6 / 32.0 | one process, but its exit code is the command's, `PERL5OPT` reaches it, and Apple says it will leave the system |
| osascript JXA, one parse | 14.2 / 33.9 | 31.1 / 42.2 | loads the scripting frameworks in his session on every run |
| jq | not timed | | not on macOS before 15 |
| python3 | not timed | | not there without the developer tools |

**The floor (macOS 13) was not checked**: this Mac is 15.7.9. `sh`, `awk`, `openssl` and `mv` are in every macOS this step
knows of, each is called by absolute path, and a missing or different one fails CLOSED (an empty or odd hash or cut
writes nothing and answers 0). "No parser at all" was weighed and refused: the smallest textual cut of the quota block
cannot tell the block from a bucket-looking string in `conversation_title`, and the whole payload on disk with the address
removed needs a JSON reader to find the address anyway. 300 ms is agy's overlap; the slowest of 700 runs at 30 spinners
was 57 ms.

### 2.2 The command string and the kill

- Seven breakages × five shells through D12's string: exit 0 and no output in every one but a script that signals its own
  pid (the kill agy does, not ours).
- 800 runs killed by SIGKILL of the `sh` alone at 0 to 20 ms (329 died in flight): 0 partial or invalid files, no output,
  0 processes left after 0, 20, 50, 100, 300 ms, 5 leftover `.tmp` holding the hash and never the address (swept). 60 overlapped pairs (the first killed as the
  second starts): the older value landed last 0 times. **Stated limit**: the first run's `mv` is its one child with an
  effect, so under a starved scheduler it could land after the second's; the next run writes the truth again.
- Standard input held open with half a payload: 1 process in the group, gone at once on SIGKILL of the `sh`.
- Missing script: 3.4 ms quiet, 9.8 ms at 30 spinners.
- `OPENSSL_CONF`, `TMPDIR`, `LC_ALL`, `LANG`, `PERL5OPT`, an empty `PATH`, a read-only folder, a folder where the file
  should be, an absent slot: exit 0, no output. An exported `SHELLOPTS=xtrace` traces the command string itself on
  stderr, as it does every script on that Mac; stated.
- The JSON through a real tmux 3.7b as one argv element arrives byte for byte (a path holding a space and an apostrophe).

### 2.3 The hostile payloads, under sh and dash

36 payloads: every one exit 0, at most 25 ms, no output (but for the exported `xtrace` of §2.2), and the file never held the address, escaped, quoted, in UTF-8,
in the title, as the plan, as a reset or as a bucket id. A two word `plan_tier` is kept as the plan, whatever it says, as Claude's and Codex's plan words are; stated. Wrote nothing: no address, null or object address, an array at
the top, truncated, two objects, trailing junk, empty, garbage, 64 KB, 100 deep. Wrote the real block: a title holding a
quoted bucket and another address, a nested `workspace.quota`, a third id and one differing by case (dropped), pretty
printed, CRLF, 15 KB of quotes. `1e309` is kept as a token and is Infinity to main (D22 draws nothing); NaN and a string
fraction become null; a duplicate key takes the last. **One change to the prototype**: its number test lets `007`
through, which would make the kept line unparseable; the shipping one is `-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][-+]?[0-9]+)?`.

### 2.4 Commands

| Command | Exit | Reading |
| --- | --- | --- |
| `tsc -b` in the widened copy (sb.sh), load 4.5 | 2 | §0.1.2 |
| vitest `p374-fallthrough` in the copy (sb.sh) | 0 | §0.1.3 |
| vitest `p374-argv-parent` (sb.sh) | 1 | §0.1.6; its third row throws in `recoverLaunchExtras` for want of an electron app, as the stub gives none |
| `bench.py quiet 100`, `bench.py load 100 30 5` (spinners ended, 0 left) | 0, 0 | §2.1 |
| `kill.py`, `left.py`, `hostile.py`, `run.sh`, `env.sh`, `t.sh` | 0 | §2.2, §2.3 |
| `app/go.sh` (one Electron, the lock, harness-socket) | 1 then 0 | first run: the shim found no node on the closed PATH; second: §0.1.8; 0 Electrons left |

## 3. The files, at this head

New: `src/main/usage/providers.ts`; `src/main/usage/antigravity/{script,folder,launch,own-status-line,receive}.ts`;
`build/conformance-usage.mjs`, `build/usage-conformance-probe.mts`; `build/p374/{probe-p374.mjs,stand-in.mjs,ablation.mjs,
fixtures/**}`; `build/fixtures/p374/**`; tests. Changed: §9.1.

## 4. The design, item by item

### 4.1 The usage domain (builder `usage`)

- `src/shared/usage.ts`: `'antigravity'` third in the union and in `USAGE_PROVIDERS`; `'waiting'` in `UsageState`;
  `UsageWaitingFor`; `second` and `waitingFor` on the snapshot (null in `emptyUsageProvider`); `USAGE_RECEIVERS` and
  `USAGE_LOGIN_PROVIDER`, two `Record<UsageProviderId, …>`, with `usageIsReceiver(p)` and `usageLoginProvider(p)`. The
  import of `LoginProviderId` is type only. `src/shared/settings.ts`: the third switch, read `=== true`, default false.
- `providers.ts` as D1. `service.ts`: `fetchProvider` takes the entry; `run()` branches on `entry.kind` BEFORE the login
  lines, so a receiver reads no login, claims no slot, sets no `lastAttemptAt`, has no retry. `deps.logins` takes
  `LoginProviderId`. New dep `receiver: { read(): AntigravityReading | null; clear(): void; waiting(): UsageWaitingFor }`
  and new method `pulse(): boolean` (false when it should stop). Composing a receiver row is pure over the held reading
  and `now`. `lastAnswered` is set by `run()` and by a tap's broadcast; the pulse broadcasts as D24 and only when its row
  changed. `shutdown` is the parent's plus nothing to join.
- `antigravity/receive.ts`, pure: `parseAntigravityFile(text): AntigravityReading | null` (v 1, one object, hash 64 hex,
  each field checked again; unknown ids ignored), `newestReading(files, now)`, `antigravityRow(reading, now)`.
- `ipc.ts`: builds the receiver over `folder.ts` and `launch.ts`'s `antigravityWaiting`; owns the one `setInterval` (5 s,
  `unref`), armed when `run()` finds the switch on, cleared when `pulse()` answers false and in the disposal. Focus is
  `BrowserWindow.getAllWindows().some((w) => w.isFocused())` behind a dep, so no test needs Electron.

### 4.2 The launch, the script and the folder (builder `launch`)

- `script.ts`, pure: `antigravityStatusScript({ dir, salt })`, `antigravityStatusCommand(path)`,
  `antigravitySettingsJson(path)`, `saltOf(scriptText)`. The script in order: `unset` its names; `umask 077`;
  `LC_ALL=C` exported; `GMUX_MANAGED` is 1; `GMUX_SESSION_ID` is `[0-9a-f-]+`; the slot is a regular file; read with
  `IFS= read -r` to at most 16,384 characters; a `case` on `"quota"`; awk; hash; compare; write. No here-document, no
  backtick, no `eval`, no `&`, no `sleep`, no `date`, no `curl`, no name outside `/usr/bin/awk`, `/usr/bin/openssl`,
  `/bin/mv` and builtins, no `$HOME`, no `cd`. The awk keeps a state machine over the WHOLE document and prints only when
  it closed cleanly; its program holds no apostrophe.
- `folder.ts`: `<userData>/gmux/antigravity-usage/`, 0700: `status.sh` (0700, written by temporary name and rename, only
  when its bytes differ), `<uuid>.json` (0600), `guard.json` (0600). `openSlot(id)`, `listFiles()`, `folderMtime()`,
  `forgetAntigravitySession(id)`, `bootAntigravityUsage(knownIds)`, `clearAntigravityUsage()`. Every deletion is by a name
  this file composed or matched (`status.sh`, `guard.json`, `^[0-9a-f-]{36}\.json(\.\d+\.tmp)?$`, `status.sh.<pid>.tmp`),
  and the folder is removed with `rmdir`, which refuses a folder holding anything else.
- `own-status-line.ts`: D10, `agyOwnsStatusLine(home)`.
- `launch.ts`: `antigravityMeterArgs({ sessionId, binPath, version, identity, argv, captured, home })` answers
  `['--settings', json]` or `[]`, records `waitingFor`, opens the slot, notes the spliced launch. Never throws: any
  failure is `[]`. `noteAntigravityDeath(id, exitCode, signal)`; `antigravityWaiting()`.
- `detection.ts`: `probedVersionFor` (D6) and `rereadAgent(id)` (D8, through `detectOne`, no new `execProbe(` and the
  Phase 335 hold still in front of it). `create-local.ts`: after `spawnArgvFor`, for `input.agent === 'antigravity'` only,
  `[argv0, ...meter, ...rest]`; the reread after the answer, through `afterSpawn`'s guard or before it, never an
  unguarded statement (`conformance:createanswer`). Nothing awaited is added before the spawn. `core.ts`: one line in
  `reapDeadSession`, one in `releaseSessionResources`, one at the top of `startHookChannel`, each inside what is there.

### 4.3 The face and Settings (builder `face`)

- `UsageMeter.tsx`: D2's narrowing; the Choose login button only where `usageLoginProvider` answers; the card's group for
  the second group after the face's two windows, each line `Claude and GPT 3% 5h, Resets in 2h 1m`; D27; `AgentIcon`
  takes `antigravity` already. `usage-copy.ts`: §5. `state/usage.ts`: no change but the type (the reconcile reads
  `USAGE_PROVIDERS`). The bar window setting applies as it is.
- `UsageGroup.tsx`: a third row, with its note line always drawn while the row is there. No LoginsBlock for it.

### 4.4 The probe, its stand-in, the recordings and the ablation run (builder `proof`): §7.3, §8

## 5. Words

Face: label `Antigravity`; agent label `Antigravity CLI`.

| Where | Words |
| --- | --- |
| waiting, `session` | `Shows after a new Antigravity session starts.` |
| waiting, `own-status-line` | `Your own Antigravity status line or settings are in use.` |
| waiting, `version` | `Needs Antigravity CLI 1.4.10 or later.` |
| waiting, `captured` | `A session SpecStory captures does not report its plan.` |
| waiting, `start-failed` | `Antigravity did not start with it, so it waits for the next Antigravity update.` |
| waiting, `unwritable` | `Tortie could not write its status line script.` |
| stale | `Last reported 42m ago` (`Nm`, `Nh`, `Nd`; the parent's `Last read failed` stays for the others) |
| Settings caption | `Reads the plan numbers the Antigravity CLI gives its own status line, in sessions you start after this is on. Nothing is asked of Google.` |
| Settings note, always | `Google was asked whether this is allowed and has not answered.` |
| `USAGE_ABOUT_WHERE` | `Claude and Codex ask only the vendor that issued your login. Both addresses are built in and no setting changes them. Antigravity asks nobody.` |
| `USAGE_ABOUT_KEPT` | `Claude and Codex numbers stay in memory until you quit. Antigravity's stay in Tortie's own folder until you turn it off or remove the session. No part of a login reaches a log or a file.` |
| `USAGE_ABOUT_WHEN` | `Claude and Codex ask every fifteen minutes, and only while this window is in front. The refresh control asks now. Antigravity updates as its sessions work.` |

`USAGE_ABOUT_READONLY` and `USAGE_OFF_NOTE` stay true and stay. No word says credits, a promise of service, tmux or Gemini.

**The CHANGELOG item** (`## Unreleased`, `### Added`, no link; the follow-up docs commit adds it):

> - The usage meter can show your Antigravity plan beside Claude and Codex: turn it on in Settings then Agents, and an Antigravity session you start on this Mac afterwards fills it in. Restored sessions, sessions SpecStory captures and sessions on another machine do not report, and Google has not said whether showing it is allowed

## 6. What moves on purpose

The three Settings sentences; `conformance:agents` 11.11's caller list; `p1812-plan.test.ts`'s list of `usagePlanWord`
call sites (one more, the receiver's plan); the pinned snapshot arrays of two rows in existing tests become three. With
the switch off: every argv, every file and every request is the parent's (the arm of §8 that says so is `OFF`).

## 7. The gates

### 7.1 Rows (vitest), each red under its own ablation in `ablation:p374`

| Row | Claim | Ablation |
| --- | --- | --- |
| U1 | a switched-on receiver sends nothing, reads no credential and no file but its own, on `read` and `refresh` | the entry made a Codex `fetch` |
| U2 | Claude and Codex: requests, headers, rows equal the parent's over the existing fixtures with the third switch on and off | a receiver counted in `lastAttemptAt` |
| U3 | `usageLoginProvider('antigravity')` is null and the logins dep is never asked for it | the lookup answers `codex` |
| U4 | compose ages: ok at 29 min, stale at 31, 5 h void by age, weekly by age, passed reset void, all void → waiting | staleness moved into `applyOutcome` |
| U5 | −3, 1.5, 1e309, null, string, disabled at 1.0, amount only → no window; f = 1 → 0 % and no reset | the range check out; the disabled check out |
| U6 | newest file whole; another hash drops all; no hash ignored; a future mtime is now; removal keeps the held one | merge per bucket |
| U7 | A, B, A, B, A alternation: held equals the last payload at every step, no log line, one broadcast per change | a sticky lowest |
| U8 | the pulse broadcasts Claude's and Codex's last answered rows, nothing before an answer, emptied when off | compose() broadcast |
| U9 | off reads no folder; off after on clears it; shutdown then a read answers what is held and opens nothing | the read above the switch test |
| U10 | an older settings reader drops the key; a newer file read by this sanitizer keeps only `true` | `Boolean(x)` |
| L1 | off, or any other agent: the spawned argv is the parent's array, element for element, over create, captured, shell | splice unconditional |
| L2 | on: `[agy, '--settings', json, …rest]`, the row's argv and resumeArgv without it, `recoverLaunchExtras` unchanged | splice before the row |
| L3 | restore, resume in place and Restart compose the parent's lines with the switch on | splice in `buildArmedCommand` |
| L4 | below, unread, another file, replaced since the scan, a shim named `mise`, a script, a bare name that resolves elsewhere: none | each clause out, one at a time |
| L5 | `--settings`, `--settings=x`, `-settings`, `--gemini_dir x`: none | the single dash spelling out |
| L6 | the presence table: 12 file shapes of D10 | `enabled: false` read as owned; a parse failure read as absent |
| L7 | guard: exit 1 at 3 s sets it and logs once; 130, 0, a signal, 11 s do not; a new identity clears it; it survives a new process | the window out |
| L8 | the JSON holds exactly `statusLine` with three keys, over a path with a space, an apostrophe, `#`, `;` and é | a fourth key |
| S1 | the script over the payloads of §2.3 and the committed recording, under sh and dash: exit 0, no output, the kept line, no address byte in the folder or TMPDIR | the charset of `r` widened; `email` at any depth; the title's bucket read |
| S2 | the command string over §2.2's breakages: exit 0, no output | the trap out; `exit 0` out |
| S3 | an unchanged payload with a moving `reset_in_seconds` writes nothing (inode equal); a changed fraction writes | the countdown kept |
| S4 | 200 SIGKILLs across the run: never a partial file | write in place |
| S5 | the script text names no forbidden word (§4.2's list), and `sh -n`, `dash -n` pass | a here-document in |
| F1 | boot sweep, removal, off: exactly the named files go, a stranger's file and the folder holding it stay | `rm -rf` of the folder |
| R1 | the meter draws three rows, no login line or control for Antigravity, the second group on the card alone | the null check out |
| R2 | every `waitingFor` has its words; stale says the age for a receiver and the parent's mark for the others | |
| R3 | the refresh control is absent only when all drawn rows are receivers | |
| R4 | Settings draws the row, its caption and the Google line, default off; the copy rules test | |

### 7.2 `conformance:usage` (`build/conformance-usage.mjs` + `build/usage-conformance-probe.mts`; pinned tsx; no Electron, no network, no keychain, no home)

G1 one table, keyed by every member of `UsageProviderId`, read with the TypeScript parser. G2 no `?:`, `if`, `switch` or
`===`/`!==` on a value typed `UsageProviderId` under `src/main/usage/` (`login-accounts.ts`'s three are on
`LoginProviderId` and named). G3 off means no read, per provider, DRIVEN. G4 every `fetch` entry's host is in the frozen
pair and belongs to its own reader; no other host string in the domain. G5 a `receiver` entry has only `kind`; nothing
under `antigravity/` names `http`, `https`, `net`, `fetch`, `spawn`, `exec`, `child_process`, `keychain`, `security`, a
host or a credential path, and the one path under a home is D10's, in one file. G6 no refresh, no credential write, no
vendor program in the domain. G7 DRIVEN: the widened table with every switch on sends exactly the parent's two requests.
G8 the splice: one caller of `antigravityMeterArgs`, after `insertSession`, on the spawned array; no `--settings` in
`restore/**`, `resume-in-place.ts`, `restart/**` from this domain. G9 the script text: §4.2's refusals over the GENERATED
script, and the kept keys' charsets. G10 no name in the snapshot, the log calls or the IPC map holds a hash or an address.
G11 `LoginProviderId` is two members. Ablations inside the gate, each red on its own rule beside an unedited control, **the
Codex fall-through first** (G1/G7), at least two a rule, over sibling copies removed in a `finally`.

**The row for CLAUDE.md** (integrator): `| src/main/usage/**, src/shared/usage.ts, UsageSettings in src/shared/settings.ts, the antigravity splice in src/main/sessions/create-local.ts, probedVersionFor and rereadAgent in src/main/agents/detection.ts | conformance:usage | <measured> s, spawns only the pinned tsx and /bin/sh | A usage token goes only to the vendor that issued it … (G1 to G11 in one sentence each) |`, and `probe:p374`'s row.

### 7.3 `ablation:p374` (`build/p374/ablation.mjs`): a `cp -Rc` clone under its own scratch, one clause edited per arm, the row that owns it required red and every file restored by sha256. `gate:checks` (the exit-after-writes rule) reads every gate it names.

### 7.4 Path-triggered, in the battery

`conformance:usage`, `conformance:agents`, `conformance:harnessprobes`, `conformance:installs`, `conformance:logins`,
`conformance:credentials`, `conformance:createanswer`, `conformance:stoppedlist`, `conformance:shellenv`,
`conformance:terminal`, `conformance:machines` (it reads all of `src/renderer/settings/`), `conformance:samefolder`,
`conformance:endtree`, `conformance:pocket` (unchanged), `conformance:choices`, `conformance:ownwords`, `gate:electron`,
`gate:background`, `gate:checks`, `gate:contract`, `gate:onlyadd`, `gate:cache-policy`, `conformance:diagnostic`.
NOT run: `conformance:resume:capture`, `conformance:resume`.

## 8. The app run: `probe:p374` (builder `proof`)

`node build/harness-socket.mjs --fresh gmux-p374 'node build/p374/probe-p374.mjs'`, the parent FIRST
(`P374_PARENT_CHECKOUT`, a BUILT `6ebc22e6`, exit 2 otherwise), one Electron at a time in the standard form (`tmuxSocket`
named, `program: 'app'`), scratch profile, HOME and ZDOTDIR, `/private/var/tmp`, the usage fixture installed before any
switch. `--grader-self-test` grades `build/p374/fixtures/graders.json` and starts nothing; `--preflight` and
`--list-graders` start nothing; `P374_ARMS`, `P374_KEEP`, `P374_OUT_DIR`.

**The stand-in** is `build/p374/stand-in.mjs` behind an `exec -a agy` wrapper on the closed PATH (`build/p321`'s shape),
answering `--version` from a file, refusing an unknown `--settings` top level key with exit 1, running the command it was
given with `sh -c` and a closed stdin as agy does (kill the previous at 300 ms, kill at 5 s, an error block on a non zero
exit), replaying the committed recording, repainting as `build/p321` does, and logging argv, the pid, every run's exit and
its milliseconds. A second flavour runs it `setsid`.

| Arm | Need at HEAD (parent beside it) |
| --- | --- |
| OFF | every spawned and recorded argv (create, captured off, restore's typed line, resume in place, Restart) equal to the parent's byte for byte; no file under `antigravity-usage`; no run |
| ON | create spliced straight after the name, the row's argv the parent's; the row draws the recording's LAST numbers, within 6 s of a write; the card's second group; no login line |
| FLOOR | 1.4.9; unread; replaced after the scan (that session none, the next one spliced, exactly one `--version` more); a wrapper script; a bare name that resolves elsewhere |
| ASIDE | his `--settings` in three spellings; a scratch settings file with `statusLine` (none), with `enabled: false` (spliced), unreadable, huge, a FIFO (none, and the create answers within the parent's time) |
| CAP | a captured session: none, and the words (a stand-in SpecStory only) |
| GUARD | the stand-in exits 1: one dead session, one log line, the next create unspliced and alive, a new file spliced again |
| TYPED | restore, resume in place and Restart with the switch on: the typed lines the parent's, the Restart's create spliced |
| STATUS | 100 script runs at 300 ms over an idle agy, both flavours: `running` for none of them |
| ACCT | sign out, sign in as another: nothing of the first drawn after the second's first file; no address byte anywhere under the profile, HOME or TMPDIR |
| LIFE | app closed while the stand-in runs, reopened: the last number, with its age; remove, boot sweep, off |
| RECT | three rows at 1440, 960, the dock at 200 and 160, the rail: the first two rows equal §0.1.8's parent reading at the dock and the rail, and the strip's choice printed |
| RUN | no request left (the fixture counts), agents hidden, every stand-in gone, history unmoved, Electrons 0 |

## 9. Builders, disjoint files

### 9.1 The table (a builder that must edit a file not in its list stops and names it)

| Builder | Files |
| --- | --- |
| `usage` | `src/shared/usage.ts`, `src/shared/settings.ts`, `src/shared/ipc/usage.ts` (comments), `src/main/usage/{providers,service,ipc,index,endpoints}.ts`, `src/main/usage/antigravity/receive.ts`, `src/main/usage/__tests__/**`, `src/shared/__tests__/p1812-usage-plan-and-bar.test.ts`, `build/conformance-usage.mjs`, `build/usage-conformance-probe.mts` |
| `launch` | `src/main/usage/antigravity/{script,folder,launch,own-status-line}.ts`, `src/main/usage/antigravity/__tests__/**`, `src/main/agents/detection.ts` and its tests, `src/main/sessions/{create-local,core}.ts`, new `src/main/sessions/__tests__/p374-*.test.ts`, `build/conformance-agents.mjs` (11.11's caller list and its fixtures only) |
| `face` | `src/renderer/app/{UsageMeter.tsx,usage-copy.ts,usage-meter.css}`, `src/renderer/state/usage.ts`, `src/renderer/settings/{UsageGroup.tsx,usage-copy.ts}`, `src/renderer/app/{p1812-usage-drive,p202-logins-drive,p203-account-drive}.ts`, their tests (`p181*`, `p1811*`, `p1812*`, `p202*`, `p203*`, `p204*`, `p219*` under `src/renderer`), new `p374-*` there |
| `proof` | `build/p374/{probe-p374.mjs,stand-in.mjs,ablation.mjs,make-fixtures.mjs,fixtures/**}`, `build/fixtures/p374/**` |
| integrator | `CLAUDE.md`, `CHANGELOG.md`, `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs` (the floor), `build/background-fixtures.mjs` only if a new shape needs it, `docs/audits/contract-baseline.txt` only if a diff is explained (none expected), this SPEC's §As built |

### 9.2 The seams, exactly

`AntigravityReading = { hash: string; plan: string | null; at: number; buckets: Partial<Record<AntigravityBucketId, { f: number | null; r: number | null; disabled: boolean; amount: boolean }>> }` (`receive.ts`, exported).
`folder.ts`: `listAntigravityFiles(): { id: string; text: string; mtimeMs: number }[]`, `antigravityFolderMtime(): number | null`,
`clearAntigravityUsage(): void`, `bootAntigravityUsage(ids: () => Iterable<string>): void`, `forgetAntigravitySession(id: string): void`.
`launch.ts`: `antigravityMeterArgs(input): readonly string[]`, `noteAntigravityDeath(id, exitCode, signal): void`,
`antigravityWaiting(): UsageWaitingFor`. `detection.ts`: `probedVersionFor(id, bin, spawn?): { version: string; real: string; identity: FileIdentity } | null`,
`rereadAgent(id): Promise<void>`. `usage` writes against these; until `launch` lands it keeps a local stub in its tests only.

### 9.3 Briefs

Each: this is a BUILD, write code and tests; read §0, your rows of §1.1, §4 and §7; run your vitest and the gates of §7.4
that your files trigger under sb.sh; report every file, decision (entry, spec or new), command with exit code, load and
history stats. `usage` begins with the fall-through test red at the parent's shape. `launch` begins with the script and
S1 to S5 (the prototype is at `…/spec/script/`), then the splice. `face` draws nothing the words of §5 do not hold.
`proof` writes the redacted recording first (`make-fixtures.mjs` reads the kept files, shifts and replaces, and REFUSES to
write a value it did not invent) and commits its output, never the reader's input.

## 10. The proof (Tier 3)

- **Lens A, Method 1 and 2.** The parent: a widened union at the parent asks chatgpt.com (run), the same edit in HEAD's
  table does not compile, and the gate is shown red on it. Side by side of Claude's and Codex's rows at both builds.
  Re-derive: a reader of its own, sharing no code, over the committed recording: every drawn percent and reset, 0 runs
  where the held number is not the last payload's (the Claude 15 s clock scores 2), app open, closed, restarted.
- **Lens B, the attack.** Make a session fail to start; a number cross accounts; a full bar from a spent or disabled
  bucket; an unchanged file read as fresh; an address land on disk (its own payloads, not §2.3's); a spliced flag reach
  the manifest, a typed line, a backup or an older build; an agy killed mid write; a folder replaced by a link; a
  settings file that changes between check and spawn; Claude's row moved by a pulse. Timing at 30 spinners, its own way.
- The fix round runs once; then an independent reverify re-runs the failed items LIVE.

## 11. The integrator's commands (in order; each with exit code and PASS line)

1. Edit the integrator files (§9.1): package.json entries `conformance:usage`, `ablation:p374`, `probe:p374`;
   classify all three (`pure`, `ablation`'s type, `electron`); the floor 194; CLAUDE.md's rows; the CHANGELOG item.
2. `zsh /private/var/tmp/tortie-ops/sb.sh <wt> "npm run typecheck"`
3. `npm run build` (sb.sh)
4. `npx`-free `node node_modules/vitest/vitest.mjs run` whole (sb.sh; name the four `/bin/ps` natives)
5. `npm run conformance:usage`, then every gate of §7.4
6. `node build/p374/probe-p374.mjs --grader-self-test`, then `--preflight` (never through `npm run … -- --flag`)
7. `npm run ablation:p374`
8. under a lock slot: `P374_PARENT_CHECKOUT=/private/var/tmp/tortie-wt/wt-p374-parent npm run probe:p374`
9. `node build/contract-inventory.mjs` (byte for byte), `git diff --stat 6ebc22e6`, history stats, Electrons 0, `df -h /`

## 12. What is NOT in this phase

Everything the entry refuses, and: no splice on a typed line (D5); no read of a workspace's agy settings; no merging of
two sessions' numbers; no FSEvents watch; no change to `usage-fit.ts`; no `title` command; no Gemini row; no edit of the
Claude tap; no new IPC channel; no phone; no correction of the registry's `screen` record (146 §11's `alt 0` reading,
`conformance:resume:capture` owns it).

## 13. For the main session at landing

Battery, smokes and the unsigned package; reconcile `HELPER_USER_FLOOR` and any CLAUDE.md row with Phase 371; the
follow-up docs commit writes the log line and the CHANGELOG link, and removes the scratch. Tell him: what resumed
sessions do not do, what a first bad launch looks like, and that the two leftovers in agy's own folder (146 §16) are his.

## 14. Questions for him (the build proceeds on the defaults)

1. A session you restore or resume does not feed the meter, because the command Tortie types would grow from one row to
   four and stay in your shell history. A session you start, or Restart, does. Default: yes, leave resumed ones out.
2. When Antigravity has updated itself, Tortie asks it for its version once, after the next session starts, so the
   session after that reports. It is the same question Tortie's agent scan already asks. Default: yes.
3. With three meters on, the top strip of a narrow window shows bars without numbers sooner than with two. Default: leave.
4. Turning the switch off deletes the kept numbers. Default: yes.

## §As built (the integrator, 2026-11-24)

### Seams reconciled, and what moved from this spec

| | What | Where it comes from |
| --- | --- | --- |
| 1 | **Two sentences of §5 were reworded, and the shipped words win.** `p181-usage-copy.test.ts` bans a standalone "it" in this copy and it passes at the parent, so the test was kept and the words moved: `start-failed` reads `Antigravity did not start with the status line, so this row waits for the next Antigravity update.`; `USAGE_ABOUT_KEPT` reads `Claude and Codex numbers stay in memory until you quit. Antigravity's stay in Tortie's own folder until you turn that meter off or remove the session. No part of a login reaches a log or a file.` | the face builder; ruled by the integrator |
| 2 | `build/p374/probe-p374.mjs`'s inherited-variable test named a bare prefix that the contract inventory read as a new env name (119 to 120). It is `GMUX_USAGE_FIXTURE` now, and the contract reads byte for byte | two builders |
| 3 | U9's first row could not go red: the service catches what its folder throws. `forbiddenReceiver(asked)` writes down every ask and the row requires none; arm U9a now names both rows and both go red | the proof builder's finding |
| 4 | The probe's stand-in is a clang-compiled launcher (D6 refuses a script); SpecStory is a stand-in in an application folder of the run's own; LIFE reads the stale age over a file aged while the app was closed (D18); "within the parent's time" is the parent's own FIFO create plus a stated margin | the proof builder |
| 5 | `probedVersionFor` answers one field more, `native`; a file nobody has read waits for `session`, not `version`; the guard is held in memory too; the receiver port has `mtime()` and `focused()`; until something is held every look lists the folder; a zero or Go-zero reset voids its window; a reset must be one exact instant with a zone | the launch and usage builders |

Integrator files: `package.json` (`conformance:usage`, `ablation:p374`, `probe:p374`), `build/verification-checks.mjs` (pure,
pure with vitest's needs, electron), `HELPER_USER_FLOOR` 193 to 194, two CLAUDE.md rows, the CHANGELOG item under
`## Unreleased`, `### Added`. `build/background-fixtures.mjs` and `docs/audits/contract-baseline.txt` did not move.

### The battery (node 22.23.1; sb.sh unless it says otherwise; the load is the 1 minute average as each began)

| Command | Exit | Reading | Load |
| --- | --- | --- | --- |
| `npm run typecheck` | 0 | 0 boundary violations over 8,355 imports, 0 cycles over 5,113 edges; 6 s | 18 |
| `npm run build` | 0 | every step, the contract byte for byte; 53 s | 17 |
| vitest whole, run 1 | 1 | 23,914 passed, 6 failed; 83 s | 11 |
| vitest whole, run 2 | 1 | 23,915 passed, 5 failed; 103 s | 12 |
| the three `/bin/ps` files, outside the block, scratch HOME | 0 | 10 of 10 | 27 |
| `preview/protocol.test.ts` with `TMPDIR` behind a link | 0 | 36 of 36 | 10 |
| `p282-keystroke-in-transit`, alone, three times | 0, 0, 0 | 8 of 8 each | 10 |
| `conformance:usage`, twice | 0, 0 | 11 rules, 40 of 40 ablations; 14 s, 14 s | 23, 20 |
| `conformance:agents` / `harnessprobes` / `installs` | 0 | 6 s / 1 s / under 1 s | 15 |
| `conformance:logins` / `credentials` | 0 | 26 s / 47 s | 14, 12 |
| `conformance:createanswer` / `stoppedlist` | 0 | 81 / 283 ablations; 1 s / 6 s | 11, 10 |
| `conformance:shellenv` / `terminal` | 0 | 2 s / 1 s | 10 |
| `conformance:machines` / `samefolder` / `endtree` | 0 | 48 s / 3 s / 2 s | 10, 61, 56 |
| `conformance:pocket` | 0 | 192 rules, 25,985 checks; 31 s | 56 |
| `conformance:choices` / `ownwords` / `diagnostic` | 0 | 2 s / 3 s / 1 s | 53, 58, 58 |
| `conformance:phonecopy` / `handback` / `manager` | 0 | not in §7.4; 3 s / 1 s / 3 s | 58, 55, 55 |
| `gate:electron` | 0 | 194 against a floor of 194 | 51 |
| `gate:background` / `checks` / `contract` / `onlyadd` / `cache-policy` / `knownhosts` | 0 | contract byte for byte | 46 to 49 |
| `probe:p374 --grader-self-test`, `--preflight` (node, outside) | 0, 0 | 12 graders, 131 needs and clauses | 10 |
| `npm run ablation:p374` | 0 | 96 arms over 28 rows, controls green before and after; 206 s | 44 rising to 233 |
| `npm run ablation:p331`, its detection and create arms | 0 | 24 arms (P22 to P47), each red on its owner, controls green; 220 s | 24 |
| `npm run probe:p374` (outside the block, a lock slot) | **1** | 11 arms passed, **STATUS failed**; 371.8 s | 181 falling to 11 |

The five that fail whole under the block are the block's: `process-table.native` (1), `ps.native` (2), `p269-env-names`' survivor
row (1), which need `/bin/ps`, and `preview/protocol.test.ts` (1), which needs a `TMPDIR` behind a link. Run 1's sixth,
`p282-keystroke-in-transit` ("nothing is held at write#1"), is a file and a surface this phase does not touch; it passed in
run 2 and in three runs alone, so it is read as a timing failure of a loaded machine and not looked into.

### The app run, arm by arm (parent first, seven launches)

- **ON**: 42 runs sent and 42 logged, every one exit 0, 0 bytes out, 0 bytes err, 0 error blocks, 14 ms p50 and 59 ms longest;
  the kept line the recording's last; the face `30% 5h · 37% wk`; a moved number drawn 3,547 ms after its write; a window
  behind for 11.5 s moved nothing; the second group on the card, no login control.
- **OFF, FLOOR, ASIDE, CAP, GUARD, TYPED, ACCT, LIFE**: passed.
- **RECT**: the first two rows are the parent's in the dock, at 160 and in the rail; the strip is compact at 1440 and mini at
  960 with three rows, and compact at 960 with two at the parent (§0.1.8).
- **RUN**: 7 launches and 7 scans held to the stand-in, 14 socket samples with no peer, 0 hits of the flag in any store, 0
  left, 0 Electrons, the census "no change", both histories unmoved.
- **STATUS FAILED, its `setsid` flavour alone, and it is NOT fixed here.** 100 runs at 300 ms over an idle stand-in agy:
  plain 0 of 134 samples working; runs leading a session of their own **12 of 135 working** (p50 12 ms, longest 26 ms, load
  about 89). The parent, in the same run, with a person's OWN status line run the same way and no Tortie flag: **24 of 135
  working** (p50 6 ms, longest 21 ms, load about 180). So the mechanism is today's (`hasToolChild` counts any descendant
  session leader without `+` as strong evidence of work, for every agent), and the switch adds runs to a session that had
  none. The builder's three runs read it once at a load of 88 and twice not, at 10 to 15 and 15 to 104, so a pass of that
  clause means only that no poll met a run.
  WHAT IS NOT KNOWN is whether agy starts its status line command in a session of its own. Research 146 read that agy ends
  a run by SIGKILL of the `sh` alone while its children live on, which is how a Go program ends a plain child; that is
  consistent with a plain child (the flavour that read idle in every run) and does not prove it. Three ways on, for the verifiers and the
  main session: a reading of `stat` for one status line child on his word; a change to the status reading for this row
  (outside this phase's files, and it triggers `conformance:choices`, `conformance:ownwords` and `ablation:p328`); or the
  limit stated and the clause graded beside the parent's. None was taken here: the spec asks for `running` in none of them.

### Stated, not fixed

- A `usage:read` that picks up a newer file answers the window that asked and tells no other; one main window draws the meter.
- A second account signed in inside one session, whose payload has no quota, leaves the first account's file until it ages.
- "Native" means the file does not begin with `#!`; a wrapper named `agy` with no shebang passes.
- `conformance:agents`' row in CLAUDE.md still says 11.11's comparison is "asked once"; the second named caller is written in
  `conformance:usage`'s row, because the spec names two rows and no third.
- macOS 13 was not checked; this Mac is 15.7.9.

### Not run

`smoke`, `smoke:t1`, `smoke:t3`, `smoke:remote`, `smoke:machines` and packaging (the main session's);
`conformance:resume:capture` and `conformance:resume` (real agents); any real agy.

### Hygiene

His histories read `751928 1795563175` and `23166 1790702242` at the start, before and after each unblocked run, and at
the end. Electrons and processes of this step left: 0 (the five Electron lines of `wt-p371` are Phase 371's). Lock slot
released. No socket file of this phase under `/private/tmp/tmux-501`. Disk 31 GB free.

### The fix round (2026-11-24, once)

What moved from the decisions above. These win over D4, D11, D12, D13, D25, §2.2 and §4.2 where they differ.

| | Finding | What was done | Owned by |
| --- | --- | --- | --- |
| F1 | Major. On a full disk the run printed the kept line, the salted hash in it, and left a `.tmp` each time | The command is `trap 'exit 0' 0; exec >/dev/null 2>&1; [ -r '<s>' ] && . '<s>'; exit 0`: both outputs closed for the WHOLE run. A write that did not land is removed by `/bin/rm -f`, the fourth program, reached only then | L8, S2 (`a write that cannot land`, sh, dash and zsh, the write refused by `ulimit -f 0`), S5, G9; arms S2b, S2d, S2e |
| F2 | Major. A plain create went from one argv element to three, so tmux started agy itself and agy lost what the person's shell reads for `-c` (`~/.zshenv`, a fish or csh file) | A program with nothing after it stays ONE element: `agy --settings '<json>'` (`antigravityShellLine`), the program spelled as before. The value holds no character any shell reads inside single quotes (an apostrophe, `!`, each backslash escape and all non-ASCII written as `\uXXXX`), so no shell need be known. With flags of the person's own the argv was several elements already and stays so | L2, L9, G8; arms L9a to L9e |
| F3 | F2's own edge: a shell that reads a file first may put another folder ahead on the PATH | On that road every OTHER agy the scan found must be at the floor (`ProbedVersion.copies`, the scan's own `shadowed`), else no flag and the words `Needs Antigravity CLI 1.4.10 or later.` A path, or an argv with flags, is not asked | L4; arms L4j to L4l |
| F4 | Major and minor. A status line run that leads a session of its own read as a tool, so the app run could not pass | `src/main/activity/status-line-runs.ts` and `readStatusRuns` in the monitor. Asked only of an Antigravity session and a session leader under it: one whose command line is Tortie's run (both ends word for word) is not a tool; and, when its parent is an agy that shows Tortie's flag, neither is one that has gone, is ending, or is still the copy of that parent. The table that session is judged by then reads it without its `s`. `process.ts` and `state-machine.ts` did not move. A leader found to be a tool is asked about once | A1 (the shipping monitor), L10; arms A1a to A1i, L10a to L10c; `probe:p374` STATUS |
| F5 | Minor. Any early exit blamed the flag and there was no way back inside a run | Off forgets the bad start held in memory as well as the file. The words name no cause: `A new Antigravity session ended at once, so this row waits for the next Antigravity update, or until this meter is turned off and on.` The guard still holds whatever flags were on the argv, because a person whose launch defaults carry flags would otherwise lose every session to a bad flag | L7, R2; arms L7g, L7h |
| F6 | Nit. Off before any read kept the folder until the next boot | A create that made a place counts as having been on (`UsageReceiverPort.opened`) | U9; arm U9e |
| F7 | Nits. CLAUDE.md's `conformance:agents`, `conformance:usage` and `probe:p374` rows | Corrected. The probe's row says to run the whole probe by its node command, because npm's update notifier asked its registry in both lenses' runs | |
| F8 | Minor. The 3,134 ms run | Stated below. ON now prints every run over 300 ms with its time and the load | |

A read-back of the temporary file before the rename was built, shown redundant under sh, dash, zsh and ksh on two full volumes,
and taken out. The probe's stand-in shows its whole argv to `ps` in the STATUS arm (`keep-args`), as a real agy's does: without
it the first whole run of this round read the setsid flavour working in 24 of 135 samples and 17 of 22 held, because the
stand-in hid its flag on purpose, and the rule then also took a run by its own line alone.

**Measured.** Full volumes (30 MB images, `hdiutil`, detached and deleted), the shipping command, 4 runs each under sh, dash,
zsh and ksh: 0 bytes out, 0 `.tmp` left and the old line kept on APFS, ExFAT and HFS+ in every cell that met the full disk; with the new
`rm` out, 4 `.tmp` in 4 runs (APFS) and 8 names (ExFAT); with the old redirection, 928 bytes printed by 4 runs under sh on ExFAT. (FAT32 could not be made
at that size.) Real tmux 3.7b and Homebrew's 3.6a, a compiled agy that logs its environment, default-shell zsh, bash, sh,
tcsh, ksh and dash, zsh and csh reading a file that exports a proxy and a marker: the one line saw exactly what `[agy]` saw in all 12
(zsh and tcsh both variables), the JSON arrived byte for byte, the pane's process and current command were the parent's; three
elements saw neither. `ps -o command=` over real runs (`sh`, `/bin/sh`, bash, zsh, a folder holding a space, an apostrophe and
é) is told as a run in every one.

| Command | Exit | Reading | Load before |
| --- | --- | --- | --- |
| `npm run typecheck`, `npm run build` (final tree) | 0 | the contract byte for byte; 60 s together | 9 |
| vitest whole, twice | 1, 1 | 23,933 passed and 6 failed; final tree 23,934 and 5. The five are the block's (named above). The sixth, `guarded.test.ts`, passed alone | 60, 16 |
| `npm run ablation:p374`, whole, the final tree | 0 | 121 arms over 31 rows, 347 s. Before it: one run red on L7g, whose clause was redundant and was made one; one at 120 arms, PASS, 301 s | 15 |
| `ablation:p328` / `p312` / `p321` / `p3251` | 0 | 10 of 10; every arm red on its owner; 61 of 61; 171, 74, 134, 245 s (the first three before F4's last edit, which is in `status-line-runs.ts` alone) | 15, 13, 8, 28 |
| `conformance:usage` | 0 | 11 rules, 42 of 42; 16 s | 10 |
| `conformance:agents` `createanswer` `choices` `ownwords` `endtree` `shellenv` `logins` `credentials` `stoppedlist` `harnessprobes` `installs` `terminal` `machines` `samefolder` `pocket` `diagnostic` `handback` `manager` `phonecopy` | 0 each | | 10 to 78 |
| `gate:checks` `electron` (194) `background` `contract` `onlyadd` `cache-policy` `knownhosts` | 0 each | | 23 to 33 |
| `probe:p374 --grader-self-test` | 0 | 12 graders, 168 needs and clauses | 28 |
| `probe:p374` whole, parent first (node, outside the block, a slot) | 1 | 11 passed, STATUS failed for the stand-in's hidden flag; 384 s | 15 falling to 12 |
| `probe:p374` whole, parent first, the final tree | **0** | **12 arms passed**; 393 s | 7 rising to 16 |
| `probe:p374`, OFF, ON and STATUS again beside the whole ablation | 0 | 4 passed with RUN; 220 s | about 12 |

STATUS in the passing run: plain 0 of 135 samples working and 0 of 22 with one run held (`S+`); a session of its own 0 of 134
and 0 of 22 (`Ss`), 100 runs of 100 exited 0 each, p50 10 and 13 ms, longest 34 and 72. The parent, a person's own status line led by
a session of its own: 12 of 135 and 19 of 22. ON: 42 runs, 0 killed by the next, p50 11 ms, longest 55; the pane was started as
one line. No run over 300 ms in any of this round's three ON arms.

**What is still worse than the parent, with the switch on and only then.**

1. `pkill -f` on Tortie's data folder path matches an Antigravity session carrying the flag, as it already matches a Claude Code
   session with hook settings. The commit body says it.
2. One session can be lost to a bad flag before the guard holds (D11). On a plain create that includes a shell file that makes
   `agy` an alias, a function or a file the scan never found.
3. In a flagged session, a tool that ends inside the few milliseconds between the process table and the question about it is not
   evidence of work for that one tick. A tool that is still there is.
4. Lens B read one run of 3,134 ms and 9 killed by the next in one ON arm of three, at a load of 10 to 37, against a longest of
   57 ms in §2.1, 162 ms in its 800 timed runs and 72 ms here; lens A read 2,090 ms at a load of 175. agy draws a permanent error block at 5 s. Nothing was drawn in any
   run. A machine that stalls longer than that would.
5. A strip at 960 px with three rows shows bars (§0.1.8). Each tick with a session leader under an Antigravity session costs two
   one-process `ps` reads, until that leader is found to be a tool.

Not worse, and stated: a window whose reset has passed is drawn `Resets now` until the next minute turns, 40 s measured and up to about
65; a file dated ahead of the clock reads as just reported once per process; an agent that can write the folder can draw any
percent and plan word, and a planted `status.sh` runs inside agy until the next create writes it again, as the Claude script does;
a second, older agy on the PATH keeps a plain create from reporting.

**Not known, and only a real agy answers it**: that agy decodes `'` in `--settings` (any JSON reader does, and the recorded
launches used a value with none); how it starts the run, which no longer matters to the status; macOS 13.

**Not run.** The main session's smokes and package; any real agy; `conformance:resume*`; `probe:p353:status` (its paths did not
move). fish is not on this Mac: the value is shown to hold nothing its single quotes read. The whole-probe reading of a
`~/.zshenv` inside the app: an unblocked Electron's shell is `/bin/sh` here, so it was read through tmux itself.

**Hygiene.** His histories read `751928 1795563175` and `23166 1790702242` at the start, around every unblocked run and at the
end. No process, mount, socket or Electron of this round left; the lock slot released.
