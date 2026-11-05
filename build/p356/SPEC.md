# Phase 356 — a dropped Apple ticket lookup fails a whole release — SPEC

Written by the spec step on 2026-11-05 in `/private/var/tmp/tortie-wt/wt-p356`, a detached worktree at origin/main
`5a71791d` ("docs(backlog): queue 356, a dropped Apple ticket lookup no longer fails a release"). **`git diff 5a71791d`
in the worktree must be exactly Phase 356's delta**, this file included. origin/main moves while the phase runs (Phase
353 lands beside it, and docs commits); nobody here rebases, pulls or merges. The charter is `docs/BACKLOG.md`
"## Phase 356" (`:44546-44614`), binding as written with its mechanism, its proof and its refusals, corrected by §0
where the tree and the measurements disagree with it. Started on his word of 2026-11-05: "ok fix that flake issue
please". His standing rulings bind: no regression against today; just enough words; nothing released, tagged,
version-bumped, archived or uploaded, and no CI run started (no tag, no dispatch, no rerun).

| | |
| --- | --- |
| Subject | `fix(release): retry Apple's ticket lookup instead of failing the release` (the entry's) |
| First body line | `Phase 356: a dropped ticket lookup no longer fails a release` |
| Semver | None a person meets: no CHANGELOG item (the entry) |
| Lane | Build: Spec → Build (ONE builder) → Verify (Tier 2) → [Fix once → Reverify] → Commit |
| Tier | **2**: invisible to a person and starts only Apple's own tools, so the gates are the evidence and the verifier re-derives; its attack is on the one risk that matters, a copy with NO ticket getting through (the entry) |
| The fix | One module, `build/stapler.mjs`, reads stapler by its exit status AND its words (§2.3): `0` ok; `65` with stapler's no-ticket words missing; `68` with the URL session's error words a lookup that did not answer; anything else failed. Only a lookup is tried again: at most 4 tries, waiting 10, 30 and 60 s, no try starting past 150 s; the first try waits as stapler always did and each retry is stopped at 120 s (the fix round, §As built) |
| Its callers | `verify-signed.mjs`'s two `xcrun stapler` calls (three readings: the loose app, an inner copy, the DMG) and `release.yml`'s DMG step |
| The self-test | `node build/stapler.mjs --self-test`, inside `npm run build` and as `gate:stapler` (classified pure): 30 recorded answers (25 measured here, verbatim), 14 sequences, 26 ablations each red on the clause it breaks |
| Menus | **No change.** No surface is added, renamed or removed |
| Contract | **No change.** No channel, schema, `gmux.*` key, `GMUX_*` name or smoke mode; `docs/audits/contract-baseline.txt` does not move |
| `HELPER_USER_FLOOR` | **Unchanged.** Nothing here reaches `build/electron-run.mjs` |
| CHANGELOG | **None** (the entry's Semver) |

## 0. What the entry got wrong at this tree (the tree and the measurements win; each correction binds the builder)

1. **The parent is `5a71791d`, not `9e48f505`.** The two differ only in `docs/BACKLOG.md` (+71 lines, the entry), and
   both files in play are byte-identical at both (`build/verify-signed.mjs` blob `53fedbfa`, `.github/workflows/release.yml`
   blob `ac9ae51a`). Every "parent" below is `5a71791d`.
2. **`verify-signed.mjs` has two `xcrun stapler` calls, not three.** `:269` is inside `verifyApp` and is reached three
   times (the loose app with `stapleMode` `'required'`, the ZIP's app and the mounted DMG's app with `'inner'`); `:316`
   is the DMG. The entry's "three sites" are the three readings: the loose app, an inner copy, the DMG. The citations
   `:268-281`, `:316-318`, `release.yml:150-175` and `:189-200` are right.
3. **A dropped lookup does not read `NSURLErrorDomain` on this Mac.** Every lookup the network denial produced, 34 of 34
   over two profiles (§2.2, §2.3), reads `error is Error Domain=NSPOSIXErrorDomain Code=1 "Operation not permitted"`,
   then `CloudKit's response is inconsistent with expections: (null)` (Apple's typo), then `The validate action failed!
   Error 68.` or `The staple and validate action failed! Error 68.`, exit 68. `NSURLErrorDomain Code=-1005` is the
   CI's words (the entry's quote). A rule reading `NSURLErrorDomain` alone misreads all 7 measured lookup shapes as
   failed (§2.6, ablation X7). The entry's rule as written ("Error 68 with a CloudKit or NSURLErrorDomain lookup
   failure") reads every measured answer right, but only through the CloudKit sentence; this spec reads the error line
   instead, both domains, with exit 68 (D3).
4. **"Apple's words for a copy with no ticket" are two sentences, and exit 65 is also something else.** `validate`
   prints `<name> does not have a ticket stapled to it.` and exits 65 with no `Error 65.` line, and it never asks the
   network: the same words online and denied, 15 of 15. `staple` asks Apple and prints `CloudKit query for <name>
   (2/<hash>) failed due to "Record not found".` then `Could not find base64 encoded ticket in response for 2/<hash>`
   then `The staple and validate action failed! Error 65.`. A ticket that is not this copy's, and a ticket cut short,
   also exit 65 but print `Processing: <path>` and nothing else (8 of 8): that is neither a ticket nor no ticket, and it
   reads failed (D4).
5. **A staple with the network denied cannot tell a missing ticket from a lookup.** Stapling a copy Apple never
   notarized reads exit 68 with the lookup words when Apple cannot be asked (§2.3). It is a lookup, it is tried again,
   and it ends a FAIL, never a PASS; online the same copy reads missing at once.
6. **stapler writes everything to stdout.** stderr was empty in 84 of 84 logged runs. The module reads the two
   concatenated, as `tryRun` does today (`verify-signed.mjs:95-98`).
7. **The CI's words are not public.** GitHub's job log API answered 403 without a credential (measured), and the spec
   step reads no credential. The two CI answers in the fixtures are CONSTRUCTED from the entry's quoted words set in the
   measured shape, and are owed verbatim by the main session (§11).
8. **`gh release download` refused** without a credential (exit 4, "gh auth login") under a scratch `HOME`. The assets
   were fetched without one from the same public release URLs with `curl`, and each matched the release's own
   `latest-mac.yml` sha512 (§2.1).
9. **The unsigned package asks github.com for Electron.** With the network denied, `npm run package --
   -c.mac.identity=null` failed at `packaging … electron=43.3.0` with `getaddrinfo ENOTFOUND github.com` (no request
   left the Mac), although 43.3.0's zip was in the scratch `HOME`'s `Library/Caches/electron`. Which file it wanted is
   not measured (electron-builder 26.15.3 keeps its own download cache under `electron-builder/downloads`). Adding
   `-c.electronDist=node_modules/electron/dist` builds it offline in 62 s (§2.1). The verifier's unsigned package uses
   the same flag.
10. **The waits are the budget, not the lookups.** One `validate` costs 137 to 798 ms online and 43 to 190 ms when the
    lookup is denied (§2.4). "Four tries within two minutes" is the waits: 10 + 30 + 60 = 100 s (D5).
11. **A third and fourth stapler call exist**: `build/notarize-local.mjs:148-149`, the hand-run post-hoc path. The entry
    names only the lane's sites; they are not this phase (§10).
12. **Retrying a staple is safe.** A staple that failed for want of the network left the DMG's bytes unchanged (sha256
    equal after 3 denied staples), and a staple repeated online left them equal too (§2.7), so the DMG step can try
    again and `refresh-dmg-feed.mjs` still runs once, after the step's staple and validate, as today.

## 0.1 The hard rules, stated once (the builder, every verifier, the fixer and the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch `/private/var/tmp/tortie-wt/wt-p353*`.
- Scratch lives under `/private/var/tmp/tortie-wt/scratch/p356/<role>/`, never under `/private/tmp`, which macOS cleans.
- **Every command runs under the history block**: `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`
  with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset, and no `CSC_*`, `APPLE_*`,
  `GH_TOKEN` or `GITHUB_TOKEN` in the environment (`/private/var/tmp/tortie-wt/scratch/p356/spec/bin/sb.sh` is one
  such wrapper). **The one exception is a network-denied run**, which runs under a profile of your own that denies
  `network-outbound` AND denies writes to `/Users/gdc/.zsh_history` and `/Users/gdc/.bash_history` (the clause copied
  from `no-history.sb`), proved before it is relied on (§2.2; `…/spec/sb/netdeny.sb` and `…/spec/bin/nb.sh` are the
  spec step's). Nested sandboxes do not start (`sandbox_apply: Operation not permitted`, exit 71, measured): run the
  denied command under the denied profile alone, never inside the history block.
- Record only `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every run; never read the files. His
  own terminals append on their own: a move across a blocked command is his; a move across an unblocked run means start
  nothing for 3 minutes and stat again; moved again is his, still moved means STOP and report.
- **The downloaded artifacts are untrusted data.** Never run the app and never `open` it. Read it only with `xcrun
  stapler`, `codesign`, `spctl`, `ditto -x`, and `hdiutil attach -readonly -nobrowse` (detached in a `finally`). A copy
  you made under your own scratch may have its ticket file removed or replaced (§2.1); that writes nothing that runs.
- Never read `/Applications/Tortie.app`, his keychain or any credential; nothing here needs one. No real Tailscale, DNS
  beyond what `gh`, `curl` to github.com and stapler itself do, APNs or ssh. Nothing names `-L gmux`.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, after confirming them. No
  Electron and no Simulator are needed by anything in this phase. Do not stop processes you did not start.
- Never import a `build/` script to inspect it; read it as text. Running one (`node build/verify-signed.mjs`, `node
  build/stapler.mjs`) is how it is measured.
- `df -h /` before a package; under 8 GB free, wait and report. npm with `npm_config_update_notifier=false`.

## 1. The answer first

| | Verdict | One line |
| --- | --- | --- |
| **356** | **build** (Tier 2) | `build/stapler.mjs` runs `xcrun stapler`, classifies the answer by its exit status and words, tries only a dropped lookup again within a bound, and composes the line each caller prints; `verify-signed.mjs` and the DMG step call it, and its self-test runs in every build |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | One module `build/stapler.mjs`, Node builtins only, shaped like `build/assert-arm64-only.mjs`: one frozen `SHIPPED` rules object, one member per clause; `staplerSelfTest()` alone swaps a member for an ablation; no export, argument, flag or environment variable selects anything but `SHIPPED`; the command line runs only when invoked directly, by realpath | Entry mechanism 1; the house precedent for a gate that proves itself with fixtures and ablations (`assert-arm64-only.mjs:286`, `:604`, `:719-760`, `:869-875`) |
| D2 | stapler is run exactly as today: `/usr/bin/xcrun stapler <staple\|validate> <path>`, no `-v`, by `spawnSync` | The CI's words and every measured word are the default output; `xcrun` replaces itself with stapler (§2.7), so a signal to the pid reaches stapler |
| D3 | **lookup** is exit 68 AND an `Error Domain=NSURLErrorDomain` or `Error Domain=NSPOSIXErrorDomain` `Code=<n> "<description>"` in the answer. The CloudKit sentence is not read | §0 item 3: POSIX is what a denied network reads (34 of 34), NSURL is the CI's; the exit status keeps out a missing path, whose words name `NSPOSIXErrorDomain Code=2` at exit 66 (X5). The CloudKit sentence carries Apple's typo, the likeliest words to change, and came with the error line in 34 of 34 |
| D4 | **missing** is exit 65 AND stapler's no-ticket words (`validate`'s sentence or `staple`'s `"Record not found"`); a 65 without them is **failed** | §0 item 4: the wrong and cut tickets are 65 with no words (X2) |
| D5 | **The bound**: 4 tries; waits of 10, 30 and 60 s before tries 2, 3 and 4; no try starts more than 150 s after the first began; each try stopped (SIGTERM) at 120 s, and a stopped try is failed, never retried | Measured cost (§2.4): the tries are under a second, so the waits are the budget, 100 s, "four tries within two minutes" (the entry); 150 s keeps that for tries that are slow; 120 s is far past the slowest answer measured (798 ms) and twice the URL session's documented 60 s default request timeout (not measured here), and bounds a stapler that never answers, which today waits for the job's 60 minutes (the entry's "no unbounded wait") |
| D6 | **The verdict is the last try's.** A lookup then a missing ticket reads missing; a lookup then an ok reads ok | A retry is a new answer; the first one was the dropped lookup |
| D7 | **The readings**: ok PASS (after a retry, "took N tries in S s"); missing WARN on an inner copy in today's words byte for byte, FAIL with stapler's last line on the loose app and the DMG, as today; lookup FAIL "Apple's ticket lookup did not answer after N tries in S s: <the error words>" on every copy; failed FAIL "exit N, <stapler's last line>" (or why there was no answer) on every copy | Entry mechanism 2, its words; §5 |
| D8 | **A failed answer on an inner copy FAILs**, where today any nonzero inner answer WARNs "no ticket in this copy" | That WARN states a fact only the missing class shows (a wrong or cut ticket is a ticket, §2.3). The lane fails both ways; only a hand-run post-hoc check moves, from passing with a false warning to failing on an answer nobody has measured as no ticket. Q1 |
| D9 | A RETRY line per retry, and a PASS line, carry no word stapler chose: the RETRY names the domain and code only | The lane fails on any `WARN` in the gate's log (`release.yml:198`): a passing run whose log quoted stapler's description could trip it. FAIL lines quote stapler, as today |
| D10 | `verify-signed.mjs`: both calls go through the module; `pass`, `warn`, `fail` and the summary are untouched; a `RETRY` line is printed and not counted | Entry mechanism 2; the smallest edit (§4.5) |
| D11 | `release.yml`: the DMG step's two `xcrun stapler` lines become `node build/stapler.mjs staple "$dmg"` and `… validate "$dmg"` with a three-line comment; "Release gates on the signed artifacts" is not edited | Entry mechanism 3; the zero-warnings rule stays (refusal) |
| D12 | The self-test reads `build/fixtures/stapler/answers.json`: the 25 measured answers copied verbatim from the spec step's logs, 5 constructed ones each named for what it was built from, and 14 sequences whose expected values are literal numbers and words, never the module's constants | Entry mechanism 4; the arm64 rule that fixtures spell their own expectations |
| D13 | The self-test runs inside `npm run build` (after `conformance-harnessprobes`, before `contract-inventory --check`) and as `npm run gate:stapler`, classified `pure` in `build/verification-checks.mjs`; `CLAUDE.md`'s sentence on gates inside the build names it | Every lane runs `npm run build` (`gates`, `compat`, `durability`, and `release.yml:94` before anything irreversible); a gate in no battery is documentation (the `gate:contract` comment, `verification-checks.mjs:1178-1185`) |
| D14 | No vitest file | Nothing under `src/` moves; the self-test is the test, as for `gate:arm64` |
| D15 | ONE builder, `release`, owns every file (§8.1) | One domain, eight files |

## 2. What the spec step measured, how, and the numbers

Everything ran under the history block or the network-denied profile (§0.1), with a scratch `HOME`. Scratch:
`/private/var/tmp/tortie-wt/scratch/p356/spec/` (`bin/` the instruments, `sb/` the profiles, `dl/` the downloads, `x/`
the copies, `pkg/wt/` the clone that built the unsigned package, `rel-real/` a release folder of the real artifacts,
`logs/` every run as JSON lines, `fixtures/measured.json` the answers D12 commits). Machine: macOS 15.7.9 (24G830), Xcode
26.3 (17C529), stapler `/Applications/Xcode.app/Contents/Developer/usr/bin/stapler` through `/usr/bin/xcrun`, node
22.23.1. The CI's runner image and its Xcode are not known here (§0 item 7).

### 2.1 The inputs

| Input | How | Facts |
| --- | --- | --- |
| The published 0.114.0 DMG and ZIP | `curl -fsSL --proto =https` from `https://github.com/gregce/tortie/releases/download/v0.114.0/` into the empty `dl/` (gh refused, §0 item 8), with `latest-mac.yml` | DMG 165,662,318 bytes, sha256 `1a664faa…094d86`; ZIP 164,725,246 bytes, sha256 `7f6524d2…589951`; both sha512 equal to the published `latest-mac.yml` (releaseDate `2026-11-05T16:32:09.639Z`) |
| The app in the ZIP | `ditto -x -k` into the empty `x/zip/` | `Contents/CodeResources`, 2,178 bytes, is the stapled ticket (sha256 `78069e55…5a4e`) |
| The app on the DMG | `hdiutil attach -nobrowse -readonly -mountpoint`, detached in the instrument's `finally` | |
| **No ticket, signed and notarized** | `cp -Rc` of the ZIP's app, `Contents/CodeResources` removed | `codesign --verify --deep --strict` exit 0: the ticket sits outside the seal. This is the post-hoc flow's copy |
| **No ticket, unsigned** | a `cp -Rc` clone of the worktree (`.git` pointer removed), `CSC_IDENTITY_AUTO_DISCOVERY=false`, every `CSC_*`/`APPLE_*`/`GH_TOKEN` unset, the scratch `HOME` holding copies of `~/Library/Caches/electron` (43.3.0's zip) and `~/Library/Caches/electron-builder`, under the network-denied profile: `npm run package -- -c.mac.identity=null -c.electronDist=node_modules/electron/dist` | exit 0, 62 s, "skipped macOS code signing reason=identity explicitly is set to null"; the app's executable is `adhoc,linker-signed`, no `CodeResources`; DMG 164,973,668 bytes sha256 `caee646c…c65d`, ZIP 164,596,699 bytes sha256 `f36875a2…d61d`. Without `-c.electronDist`: exit 1 at 74 s, §0 item 9 |
| A DMG never signed or notarized | `hdiutil create -srcfolder` of a folder holding one text file | 16,860 bytes |
| A ticket that is not the copy's | the unsigned app with the ZIP app's `CodeResources` copied in | |
| A ticket cut short | the no-ticket copy with the first 100 bytes of the ticket as its `CodeResources` | |
| Bad inputs | a path that does not exist; a copy of the ZIP; a text file; a plain folder | |

### 2.2 The network-denied profiles, proved before any stapler run relied on them

`sb/netdeny.sb` is `(allow default)`, `(deny network-outbound)` and `no-history.sb`'s two write denials;
`sb/netdeny-ip.sb` denies only `(remote ip)`, so the local DNS socket still answers. `bin/prove-netdeny.mjs` opens a
TCP server on 127.0.0.1 and a unix-socket server under the scratch in its own process, connects to each from itself and
from a child `/usr/bin/nc -v` (stapler runs as a child too), and closes both in a `finally`
(`logs/prove-netdeny.jsonl`):

| Profile | TCP, this process | unix socket, this process | TCP, child `nc` | unix socket, child `nc` |
| --- | --- | --- | --- | --- |
| history block only (the control) | connected | connected | exit 0, "succeeded!" | exit 0 |
| `netdeny.sb` | `EPERM` | `EPERM` | exit 1, "connectx … failed: Operation not permitted" | exit 1 |
| `netdeny-ip.sb` | `EPERM` | connected | exit 1, "Operation not permitted" | exit 0 |

### 2.3 stapler's answers (84 logged runs, `logs/*.jsonl`; stderr empty in 84 of 84)

| Class | Exit | The words (stdout) | Inputs that gave it | Runs |
| --- | --- | --- | --- | --- |
| ok, validate | 0 | `Processing: <path>` / `The validate action worked!` | the DMG, the ZIP's app, the DMG's app, each online; a re-stapled copy | 11 |
| ok, staple | 0 | `Processing: <path>` twice / `The staple and validate action worked!` | a copy of the DMG, twice; the no-ticket signed copy (then it validates) | 3 |
| missing, validate | 65 | `Processing: <path>` / `<name> does not have a ticket stapled to it.` | the no-ticket signed copy, the unsigned app, the unsigned DMG, the hdiutil DMG; **online and denied alike** | 15 |
| missing, staple | 65 | `Processing:` / `CloudKit query for <name> (2/<hash>) failed due to "Record not found".` / `Could not find base64 encoded ticket in response for 2/<hash>` / `The staple and validate action failed! Error 65.` | the unsigned app and the hdiutil DMG, online | 4 |
| lookup | 68 | `Processing:` / `error is Error Domain=NSPOSIXErrorDomain Code=1 "Operation not permitted" UserInfo={…}` (three physical lines) / `CloudKit's response is inconsistent with expections: (null)` / `The validate action failed! Error 68.` or `The staple and validate action failed! Error 68.` | every stapled copy validated or stapled denied, both profiles; the no-ticket copy, the unsigned app and the hdiutil DMG **stapled** denied | 34 |
| failed: a ticket that is not this copy's, a cut ticket | 65 | `Processing: <path>` and nothing else | online and denied alike | 8 |
| failed: no such path | 66 | `File <path> does not exist. Error Domain=NSCocoaErrorDomain Code=260 "…" UserInfo={…, NSUnderlyingError=0x… {Error Domain=NSPOSIXErrorDomain Code=2 "No such file or directory"}}`, no `Processing:` line | validate and staple, online and denied | 4 |
| failed: unsupported | 66 | `Processing:` / `Stapler is incapable of working with ZIP archive files.` (`Plain Text Document files.`, `Folder files.`) | the ZIP, a text file, a folder | 5 |

The 34 lookups are identical but for the path and the task UUID: 5 validates each of the DMG, the ZIP's app and the
DMG's app under `netdeny.sb`, 3 each under `netdeny-ip.sb`, and 10 staples (3 of a DMG copy, 3 of the no-ticket copy,
2 each of the unsigned app and the hdiutil DMG). Every exit 68 carried both the
`NSPOSIXErrorDomain` line and the CloudKit sentence; no other exit carried the CloudKit sentence; 4 answers at exit 66
carried an `Error Domain=NSPOSIXErrorDomain` (the missing path). Where a last line ends `Error N.`, N is the exit status
(38 of 38); `validate`'s missing, the wrong and cut tickets and the 66s print no `Error N.` line. One lookup, verbatim (`logs/netdeny.jsonl`,
the DMG, run 1):

```
Processing: /private/var/tmp/tortie-wt/scratch/p356/spec/dl/Tortie-0.114.0-arm64.dmg
error is Error Domain=NSPOSIXErrorDomain Code=1 "Operation not permitted" UserInfo={_NSURLErrorFailingURLSessionTaskErrorKey=LocalDataTask <80852FA2-AB94-460D-8C49-3A8DF1BFE707>.<1>, _kCFStreamErrorDomainKey=1, _kCFStreamErrorCodeKey=1, _NSURLErrorRelatedURLSessionTaskErrorKey=(
    "LocalDataTask <80852FA2-AB94-460D-8C49-3A8DF1BFE707>.<1>"
), _NSURLErrorNWPathKey=satisfied (Path is satisfied), interface: en0[802.11], ipv4, dns, uses wifi}
CloudKit's response is inconsistent with expections: (null)
The validate action failed! Error 68.
```

The CI's, as the entry quotes it: `NSURLErrorDomain Code=-1005 "The network connection was lost."`, the URL
`api.apple-cloudkit.com/database/1/com.apple.gk.ticket-delivery/production/public/records/lookup`, `The validate action
failed! Error 68.` and `The staple and validate action failed! Error 68.`. NSError's description is always `Error
Domain=<domain> Code=<n> "<description>" UserInfo={…}`, so the CI's line holds `Error Domain=NSURLErrorDomain
Code=-1005 "The network connection was lost."`, which is what D3 reads.

### 2.4 What one stapler call costs (ms; min, median, max)

| | Runs | ms |
| --- | --- | --- |
| validate, online, ok | 11 | 137, 162, 798 (the 798 is the first call of the session) |
| staple, online, ok | 3 | 207, 277, 334 |
| staple, online, missing | 4 | 116, 130, 190 |
| validate, exit 65 (no network asked; the 15 missing and the 8 wrong and cut tickets) | 23 | 13, 62, 116 |
| lookup, denied (validate 24, staple 10) | 34 | 21, 65, 190 |
| exit 66 | 9 | 11, 15, 15 |

`Atomics.wait` on the main thread slept 253 ms for 250 (the module's sleep, §4.1).

### 2.5 The parent's gate over the three inputs (`node build/verify-signed.mjs --expect-notarized --artifacts`, the worktree's own file, cwd a release folder of each input, `TMPDIR` under the scratch)

| Input | Network | The stapler lines, in order (loose app, ZIP's app, DMG, DMG's app) | Summary | Exit | s |
| --- | --- | --- | --- | --- | --- |
| real 0.114.0 (`rel-real/`) | online | `PASS  stapler validate (app)`, `PASS …(app)`, `PASS  stapler validate (Tortie-0.114.0-arm64.dmg)`, `PASS …(app)` | `verify-signed: PASS` | 0 | 16 |
| real 0.114.0 | denied | `FAIL  stapler validate (app) — The validate action failed! Error 68.`, **`WARN  stapler validate (app) — no ticket in this copy — …`**, `FAIL  stapler validate (Tortie-0.114.0-arm64.dmg) — The validate action failed! Error 68.`, **`WARN … no ticket in this copy — …`** | `verify-signed: FAIL (2) with 2 warning(s)` | 1 | 9 |
| unsigned package (`pkg/wt/release/`) | online | `FAIL … (app) — Tortie.app does not have a ticket stapled to it.`, `WARN … no ticket in this copy — …`, `FAIL … (Tortie-0.114.0-arm64.dmg) — Tortie-0.114.0-arm64.dmg does not have a ticket stapled to it.`, `WARN … no ticket in this copy — …` | `verify-signed: FAIL (20) with 2 warning(s)` | 1 | 8 |
| unsigned package | denied | the same four lines, byte for byte | `FAIL (20) with 2 warning(s)` | 1 | 3 |

The second row is the defect, reproduced: two copies that carry a ticket read "no ticket". With the temporary folder
names masked, the real artifacts' online and denied logs differ in those four stapler lines and the summary only, and
the unsigned package's two logs in their timing line only. Logs: `logs/parent-real-{online,netdeny}.log`,
`logs/parent-unsigned-{online,netdeny}.log`. No image stayed attached.

### 2.6 The design, checked before it is specified (`bin/proto-classify.mjs`, `bin/proto-policy.mjs`; not product code)

The classes of §4.2 read all 30 answers of §4.3 as recorded. Each classification ablation of §4.4 turns at least one
(`logs/proto-classify.txt`): X1 turns 18; X2 the wrong and cut tickets; X3 the 5 validate missing answers; X4 the 2
staple missing answers; X5 the missing path; X6 the constructed 68 with no error words; **X7 (the entry's
`NSURLErrorDomain` taken alone) all 7 measured lookup shapes**; X8 the two CI answers; and the entry's literal rule
("Error 68." and "CloudKit" or "NSURLErrorDomain") only the constructed 68 that keeps the CloudKit sentence. The 14
sequences of §4.3 were run over a fake clock with the bound of D5 and the readings of D7 (`logs/proto-policy.jsonl`);
§4.3's expected values are those outputs.

### 2.7 Small facts the design leans on

- **`xcrun` replaces itself with stapler**: `lsof -p <the pid spawn started as /usr/bin/xcrun> -d txt` read
  `…/usr/bin/stapler` 5 of 5 and 3 of 3 times while it ran, and never `xcrun` (`bin/m-xcrun-exec.mjs`). A per-try
  timeout's SIGTERM reaches stapler.
- `spawnSync` on its timeout returns `status` null, `signal` `SIGTERM`, `error.code` `ETIMEDOUT`, empty stdout and
  stderr; on a missing program `status` null, `signal` null, `error.code` `ENOENT` and no stdout or stderr (measured).
- Three denied staples left the DMG copy's sha256 `1a664faa…` unchanged; two online re-staples left it equal too.

## 3. The tree at this head (what the builder starts from)

| What | Where, at `5a71791d` |
| --- | --- |
| The gate | `build/verify-signed.mjs`: header `:1-54` (item 8 `:51`), `tryRun` `:95-98` (stdout and stderr merged, `status ?? 1`), the `stapleMode` docblock `:109-120`, step 8 `:267-282` (the call `:269`, PASS `:271`, WARN `:273-278`, FAIL `:280`), the ZIP `:298-311` (`'inner'` `:304`), the DMG validate `:315-319` (the call `:316`), the mount `:320-331` (`'inner'` `:326`), the summary `:345-347` |
| The lane | `.github/workflows/release.yml`: job `timeout-minutes: 60` `:45`, `npm run build` `:94`, "The DMG gets its own ticket" `:150-175` (`timeout-minutes: 20` `:151`, `set -euxo pipefail` `:157`, notarytool `:165-169`, `xcrun stapler staple` `:170`, `xcrun stapler validate` `:171`, `refresh-dmg-feed.mjs` `:175`), "Release gates on the signed artifacts" `:189-201` (the `WARN` grep `:198-201`) |
| Scripts | `package.json`: `build` `:15` (the anchor `node build/conformance-harnessprobes.mjs && node build/contract-inventory.mjs --check`, once), the gate scripts `:322-334` (`gate:arm64` `:334`), `verify:signed` `:336` |
| Classification | `build/verification-checks.mjs`: `pure` `:234-239`, the build gates `:1119-1211`, `verify:signed` `:1219`; `build/assert-hermetic-checks.mjs:170-187` (every `gate:` script needs an entry) |
| Words | `CLAUDE.md:298-305` (the gates inside `npm run build`) |
| The precedent | `build/assert-arm64-only.mjs`: `SHIPPED` `:286`, `FIXTURES` `:551`, `ABLATIONS` `:604`, `selfTest` `:719-760`, `main` `:829`, `invokedDirectly` `:869-875` |
| Not this phase | `build/notarize-local.mjs:148-149`; `build/refresh-dmg-feed.mjs` |

## 4. The design (builder `release`)

### 4.1 `build/stapler.mjs`

A header in the file's own voice (what it reads, the four classes and the bound with their reasons from §2, where it
runs, that it proves itself), then:

- **Exports, exactly three.**
  - `askStapler(action, path, { onAnswer, onRetry } = {})`: runs stapler under `SHIPPED`; `action` is `'staple'` or
    `'validate'`, anything else throws. `onAnswer(answer, n)` after try n; `onRetry(note, n)` before the wait for try
    n + 1. Returns `{ action, path, verdict, tries, seconds, last }`, `seconds` the whole call's, rounded.
  - `staplerReading(result, where)`, `where` `'required'` or `'inner'` (`verify-signed.mjs`'s own two `stapleMode`
    values): `{ level: 'PASS' | 'WARN' | 'FAIL', detail: string | null }`.
  - `staplerSelfTest()`: `{ answers, sequences, ablations, problems }`. It alone reads
    `build/fixtures/stapler/answers.json` (by `new URL('./fixtures/stapler/answers.json', import.meta.url)`); importing
    the module reads no file and prints nothing.
- **The live runner**: `spawnSync('/usr/bin/xcrun', ['stapler', action, path], { encoding: 'utf8', timeout:
  rules.tryLimitMs, killSignal: 'SIGTERM' })`, returned as `{ status, signal, stdout: r.stdout ?? '', stderr:
  r.stderr ?? '', error: r.error ? (r.error.code ?? String(r.error)) : null }`. The environment is inherited, as
  `xcrun stapler` inherits it in the step today; the module reads no `process.env` and prints none of it.
- **The sleep**: `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)`; **the clock**:
  `performance.now()`. The self-test hands the loop a fake runner, sleep and clock; the exports hand it these.
- **The loop** (one function over `rules` and those three): for n = 1, 2, …: run; classify; stop unless the verdict is
  retried (P1) and n < `tries` (P2); take `waitsMs[n − 1]`; stop if the time spent plus that wait passes `budgetMs`
  (P4); otherwise `onRetry`, sleep, again. The verdict is `classify(rules.pick(answers))` (P6).
- **The command line** (only when invoked directly, by realpath as `assert-arm64-only.mjs:869-875` does):
  - `node build/stapler.mjs staple|validate <path>`: prints each try's stdout to stdout and stderr to stderr as it
    comes (the step's log shows stapler's words as today), a RETRY line before each wait, then the final line
    (`where` `'required'`, §5). Exit 0 on PASS, 1 otherwise.
  - `node build/stapler.mjs --self-test`: the green line, or the problems; exit 0 or 1.
  - Anything else: `stapler: give staple or validate and one path, or --self-test`, exit 2.

### 4.2 The clauses (`SHIPPED`, one member each; the words are the measured ones of §2.3)

Classification, in this order: K1, then P5's stop, then K3, then K2, else K4.

| Clause | Rule |
| --- | --- |
| K1 ok | `status === 0` |
| K2 missing | `status === 65` and (`/^.+ does not have a ticket stapled to it\.$/m` or `/failed due to "Record not found"\.$/m`) over stdout + stderr |
| K3 lookup | `status === 68` and `/Error Domain=(NSURLErrorDomain\|NSPOSIXErrorDomain) Code=(-?\d+) "([^"\n]*)"/` over stdout + stderr; its match is the lookup's words, its groups the domain and code |
| K4 failed | everything else, an answer with no exit status included |
| P1 | only a lookup is tried again |
| P2 | at most `tries` = 4 tries |
| P3 | `waitsMs` = 10000, 30000, 60000, before tries 2, 3 and 4 |
| P4 | `budgetMs` = 150000: no try starts more than 150 s after the first began |
| P5 | `tryLimitMs` = 120000 per try; a try that ended on that timeout (`error === 'ETIMEDOUT'`) reads `stoppedVerdict` = `'failed'` |
| P6 | `pick` = the last answer |
| R1 | ok: PASS, detail null after one try, `took N tries in S s` after more |
| R2 | missing: `inner` WARN with `innerWords`, byte for byte today's (`verify-signed.mjs:275-277`); `required` FAIL with stapler's last line, as today (`r.output.trim().split('\n').pop()`) |
| R3 | lookup: FAIL `Apple's ticket lookup did not answer after N tries in S s: <K3's match>`, for both |
| R4 | failed: FAIL for both: `exit N, <last line>`; a stopped try `stapler gave no answer in 120 s and was stopped`; another signal `stapler ended on <signal>`; no start `stapler did not start (<code>)` |
| R5 | the RETRY note is `Apple's ticket lookup did not answer (<domain> <code>); try N of 4 in W s`. No reading but R2's `inner` WARN contains `WARN`; no note and no PASS detail carries a word stapler chose |

"N tries" reads "1 try" for one. A reading the composer cannot make (an ablated rule asking for words an answer lacks)
throws, and the self-test reads a throw as red. In the table `\|` is the table's escape; the regexes hold a plain `|`.

### 4.3 `build/fixtures/stapler/answers.json` (new)

`{ "measuredOn": "<§2's machine line>", "answers": [ … ], "sequences": [ … ] }`. An answer: `id`, `source`, `action`,
`status`, `signal`, `error`, `stdout`, `stderr`, `ms`, `verdict`, `owns`. A sequence: `id`, `action`, `answers` (ids,
the last repeated if asked again), `ms` (each try's fake cost, the last repeated; absent is 0), `verdict`, `tries`,
`waitsMs`, `limitsMs` (the limit each try was handed), `seconds`, `required` and `inner` (`{ level, detail }`),
`notes`, `owns`.

**The 25 measured answers** are `/private/var/tmp/tortie-wt/scratch/p356/spec/fixtures/measured.json` (16,841 bytes,
sha256 `c3bb46db648ac84b82325da2c3c4e1b0373c11d08de43bf1aba6fa5682c299db`), copied with `error: null` and `owns`
added, every other field byte for byte. Their ids: `ok-validate-dmg`, `ok-validate-zip-app`, `ok-validate-dmg-app`,
`ok-staple-dmg`, `ok-staple-unstapled-app`; `missing-validate-unstapled-app`, `missing-validate-unstapled-app-denied`,
`missing-validate-unsigned-app`, `missing-validate-unsigned-dmg`, `missing-validate-plain-dmg`,
`missing-staple-unsigned-app`, `missing-staple-plain-dmg`; `lookup-validate-dmg`, `lookup-validate-zip-app`,
`lookup-validate-dmg-app`, `lookup-validate-zip-app-ip`, `lookup-staple-dmg`, `lookup-staple-unstapled-app`,
`lookup-staple-unsigned-app`; `failed-wrong-ticket`, `failed-broken-ticket`, `failed-no-such-path`, `failed-zip`,
`failed-text`, `failed-folder`.

**The 5 constructed answers**, each `source` saying what it was built from:

| id | action, status, signal, error | stdout (stderr empty) | verdict |
| --- | --- | --- | --- |
| `ci-lookup-staple` | staple, 68, null, null | `Processing: /Users/runner/work/tortie/tortie/release/Tortie-0.113.0-arm64.dmg\nerror is Error Domain=NSURLErrorDomain Code=-1005 "The network connection was lost." UserInfo={NSErrorFailingURLStringKey=https://api.apple-cloudkit.com/database/1/com.apple.gk.ticket-delivery/production/public/records/lookup}\nCloudKit's response is inconsistent with expections: (null)\nThe staple and validate action failed! Error 68.\n` | lookup |
| `ci-lookup-validate` | validate, 68, null, null | the same with `Processing: /var/folders/runner/T/tortie-verify-zip-0114a1/Tortie.app` first and `The validate action failed! Error 68.` last | lookup |
| `c-68-no-error-words` | validate, 68, null, null | `lookup-validate-dmg`'s stdout with its three-line `error is Error Domain=…}` removed: `Processing: /private/var/tmp/tortie-wt/scratch/p356/spec/dl/Tortie-0.114.0-arm64.dmg\nCloudKit's response is inconsistent with expections: (null)\nThe validate action failed! Error 68.\n` | failed |
| `c-stopped` | validate, null, `SIGTERM`, `ETIMEDOUT` | empty (§2.7's timeout shape) | failed |
| `c-not-started` | validate, null, null, `ENOENT` | empty (§2.7's missing-program shape) | failed |

The `source` of both `ci-` answers: "constructed: the CI's words as docs/BACKLOG.md Phase 356 quotes them (0.113.0 run
39521413998 attempt 1, the DMG step; 0.114.0 run 42059523260 attempt 1, the ZIP's app), set in the shape measured here;
the job logs need a credential (403 measured); owed verbatim, build/p356/SPEC.md §11".

**`owns`**: every `ok-*` `["K1"]`; every `missing-*` `["K2"]`; every `lookup-*` and `ci-*` `["K1", "K3"]`;
`failed-wrong-ticket` `["K1", "K2", "K4"]`; `failed-broken-ticket` `["K2", "K4"]`; `failed-no-such-path` `["K3", "K4"]`;
`failed-zip` `["K1", "K4"]`; `failed-text` and `failed-folder` `["K4"]`; `c-68-no-error-words` `["K3"]`; `c-stopped`
`["P5"]`; `c-not-started` `["K4"]`.

**The 14 sequences** (`action` validate unless named; every `limitsMs` is 120000 once per try; `inner` equals
`required` unless given; `W` is today's WARN words, §5):

| id | answers (ms) | verdict | tries | waitsMs | s | required | notes | owns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `s-ok` | `ok-validate-dmg` | ok | 1 | — | 0 | PASS, null | — | P5 |
| `s-ok-on-2nd` | `lookup-validate-dmg`, `ok-validate-dmg` | ok | 2 | 10000 | 10 | PASS `took 2 tries in 10 s` | `…(NSPOSIXErrorDomain 1); try 2 of 4 in 10 s` | P3 P6 R1 R5 |
| `s-ok-on-4th` | `lookup-validate-zip-app` ×3, `ok-validate-zip-app` | ok | 4 | 10000, 30000, 60000 | 100 | PASS `took 4 tries in 100 s` | three, `try 2 of 4 in 10 s`, `try 3 of 4 in 30 s`, `try 4 of 4 in 60 s` | P2 P3 |
| `s-lookup-always` | `lookup-validate-zip-app` | lookup | 4 | 10000, 30000, 60000 | 100 | FAIL `Apple's ticket lookup did not answer after 4 tries in 100 s: Error Domain=NSPOSIXErrorDomain Code=1 "Operation not permitted"` | the same three | P2 P3 R3 |
| `s-staple-ok-on-2nd` (staple) | `lookup-staple-dmg`, `ok-staple-dmg` | ok | 2 | 10000 | 10 | PASS `took 2 tries in 10 s` | `…(NSPOSIXErrorDomain 1); try 2 of 4 in 10 s` | R1 |
| `s-ci-staple-ok-on-2nd` (staple) | `ci-lookup-staple`, `ok-staple-dmg` | ok | 2 | 10000 | 10 | PASS `took 2 tries in 10 s` | `Apple's ticket lookup did not answer (NSURLErrorDomain -1005); try 2 of 4 in 10 s` | K3 |
| `s-missing` | `missing-validate-unstapled-app` | missing | 1 | — | 0 | FAIL `Tortie.app does not have a ticket stapled to it.`; inner WARN `W` | — | P1 R2 |
| `s-lookup-then-missing` | `lookup-validate-zip-app`, `missing-validate-unstapled-app` | missing | 2 | 10000 | 10 | as `s-missing` | one, `try 2 of 4 in 10 s` | P1 P6 |
| `s-missing-staple` (staple) | `missing-staple-unsigned-app` | missing | 1 | — | 0 | FAIL `The staple and validate action failed! Error 65.`; inner WARN `W` | — | R2 |
| `s-failed` | `failed-wrong-ticket` | failed | 1 | — | 0 | FAIL `exit 65, Processing: /private/var/tmp/tortie-wt/scratch/p356/spec/x/wrong/Tortie.app` | — | P1 R4 |
| `s-lookup-then-failed` | `lookup-validate-dmg`, `failed-zip` | failed | 2 | 10000 | 10 | FAIL `exit 66, Stapler is incapable of working with ZIP archive files.` | one, `try 2 of 4 in 10 s` | P1 P6 |
| `s-stopped` | `c-stopped` | failed | 1 | — | 0 | FAIL `stapler gave no answer in 120 s and was stopped` | — | P5 |
| `s-not-started` | `c-not-started` | failed | 1 | — | 0 | FAIL `stapler did not start (ENOENT)` | — | R4 |
| `s-slow-lookups` | `lookup-validate-dmg` (60000 each) | lookup | 2 | 10000 | 130 | FAIL `Apple's ticket lookup did not answer after 2 tries in 130 s: Error Domain=NSPOSIXErrorDomain Code=1 "Operation not permitted"` | one, `try 2 of 4 in 10 s` | P4 |

Every note begins `Apple's ticket lookup did not answer (` and every `NSPOSIXErrorDomain 1` note is the measured
denial's; the exact strings are `logs/proto-policy.jsonl`'s.

### 4.4 The self-test and the 26 ablations

`staplerSelfTest()` (pure: reads the JSON, spawns nothing, sleeps nothing): (1) the file's shape: ids unique, every
verdict one of the four, every sequence's answers present, every `owns` a clause of §4.2; (2) under `SHIPPED`, every
answer classifies as recorded and every sequence matches every recorded field; (3) R5 over every sequence and both
`where`s, by shape: a note matches `^Apple's ticket lookup did not answer \((NSURLErrorDomain|NSPOSIXErrorDomain)
-?\d+\); try \d+ of \d+ in \d+ s$`, a PASS detail is null or matches `^took \d+ tries in \d+ s$`, and only a missing
`inner` reading contains `WARN`; (4) each ablation: every id it names must own its clause (else a problem, as
`assert-arm64-only.mjs:741-747`), then the suite runs under `{ ...SHIPPED, ...change }` and every named fixture must
read red (a throw is red). Green line: `stapler self-test: 30 answers read as recorded, 14 sequences as written, 26
ablations each red on the clause it breaks`.

| Arm | Clause | Change (one member, or the members of one clause) | Must turn red |
| --- | --- | --- | --- |
| X1 | K1 | ok unless the words say no ticket | `lookup-validate-dmg`, `failed-wrong-ticket`, `failed-zip`, `ci-lookup-validate` |
| X2 | K2 | missing on exit 65 alone | `failed-wrong-ticket`, `failed-broken-ticket` |
| X3 | K2 | missing without `validate`'s sentence | `missing-validate-unstapled-app`, `missing-validate-unsigned-app`, `missing-validate-plain-dmg` |
| X4 | K2 | missing without `"Record not found"` | `missing-staple-unsigned-app`, `missing-staple-plain-dmg` |
| X5 | K3 | lookup on the words without exit 68 | `failed-no-such-path` |
| X6 | K3 | lookup on exit 68 without the words | `c-68-no-error-words` |
| X7 | K3 | `NSURLErrorDomain` alone (the entry taken literally) | the 7 measured `lookup-*` |
| X8 | K3 | `NSPOSIXErrorDomain` alone | `ci-lookup-staple`, `ci-lookup-validate`, `s-ci-staple-ok-on-2nd` |
| X9 | K4 | missing on any exit but 0 (the parent's reading) | `failed-wrong-ticket`, `failed-zip`, `c-not-started` |
| X10 | P1 | a missing ticket tried again | `s-missing`, `s-lookup-then-missing` |
| X11 | P1 | a failed answer tried again | `s-failed`, `s-lookup-then-failed` |
| X12 | P2 | five tries (`tries` 5, `waitsMs` 10000, 30000, 60000, 1000) | `s-lookup-always` |
| X13 | P2 | three tries | `s-ok-on-4th`, `s-lookup-always` |
| X14 | P3 | no waits (0, 0, 0) | `s-ok-on-2nd`, `s-ok-on-4th`, `s-lookup-always` |
| X15 | P4 | no budget (`Infinity`) | `s-slow-lookups` |
| X16 | P5 | no per-try limit (`undefined`) | `s-ok`, `s-stopped` |
| X17 | P5 | a stopped try read as a lookup | `c-stopped`, `s-stopped` |
| X18 | P6 | the first try's verdict | `s-ok-on-2nd`, `s-lookup-then-missing`, `s-lookup-then-failed` |
| X19 | R1 | ok after a retry says nothing of the tries | `s-ok-on-2nd`, `s-staple-ok-on-2nd` |
| X20 | R2 | a missing inner copy reads FAIL | `s-missing`, `s-missing-staple` |
| X21 | R2 | today's words with the first `—` made `-` | `s-missing` |
| X22 | R3 | a lookup on an inner copy reads WARN in today's words (the parent's reading) | `s-lookup-always` |
| X23 | R3 | a lookup reads PASS | `s-lookup-always` |
| X24 | R4 | a failed inner copy reads WARN in today's words | `s-failed`, `s-not-started` |
| X25 | R5 | the RETRY note quotes stapler's description | `s-ok-on-2nd` |
| X26 | R5 | ok after a retry reads WARN | `s-ok-on-2nd` |

### 4.5 `build/verify-signed.mjs`

1. `import { askStapler, staplerReading } from './stapler.mjs';` beside the other imports.
2. Two helpers beside `pass`, `fail`, `warn`: `retry(name, note)` prints `` `  RETRY ${name} — ${note}` `` and counts
   nothing; `report(name, { level, detail })` calls `pass`, `warn` or `fail` with `detail ?? undefined`.
3. Step 8 (`:267-282`) becomes: `const name = 'stapler validate (app)';` then `report(name,
   staplerReading(askStapler('validate', app, { onRetry: (note) => retry(name, note) }), stapleMode));`.
4. The DMG (`:315-319`): the same with `` `stapler validate (${basename(dmg)})` `` and `'required'`.
5. Header item 8 (`:51`) gains: through `build/stapler.mjs` (Phase 356), a ticket lookup Apple drops is tried again,
   four tries within two minutes, and one that never answers is a FAIL in its own words; a copy with no ticket reads as
   before. The `stapleMode` docblock gains one sentence: WARN means no ticket and only that; a lookup that never
   answers, or an answer that is neither a ticket nor no ticket, FAILs on every copy.
6. Nothing else: `tryRun`, the other seven checks, the summary and the exit status are byte for byte.

### 4.6 `.github/workflows/release.yml`

In "The DMG gets its own ticket", `:170-171` become:

```
          # Apple's ticket lookup can drop its connection (Error 68).
          # build/stapler.mjs tries only that again, four tries within two
          # minutes, and fails on anything else, a missing ticket included.
          node build/stapler.mjs staple "$dmg"
          node build/stapler.mjs validate "$dmg"
```

Nothing else in the file moves: every other line of that step, every other step, every `uses:` pin and the `WARN` grep
are byte for byte. The step's 20 minutes hold notarytool's wait and two calls' worst case (§9.2's budget row).

### 4.7 `package.json`, `build/verification-checks.mjs`, `CLAUDE.md`

- `package.json`: `"gate:stapler": "node build/stapler.mjs --self-test",` after `"gate:arm64"` (`:334`); in `build`
  (`:15`), the anchor `node build/conformance-harnessprobes.mjs && node build/contract-inventory.mjs --check` (asserted
  to occur once) becomes `node build/conformance-harnessprobes.mjs && node build/stapler.mjs --self-test && node
  build/contract-inventory.mjs --check`.
- `build/verification-checks.mjs`: before `adapter('verify:signed', …)` (`:1219`), a `// PHASE 356.` comment in the
  file's voice (how the lane reads stapler, the four classes, the bound, the recorded answers, that it spawns nothing
  and runs inside npm run build) and `pure('gate:stapler'),`.
- `CLAUDE.md:298-300`: `` `conformance:harnessprobes` and `gate:contract`. `` becomes `` `conformance:harnessprobes`,
  `gate:stapler` and `gate:contract`. ``, and after `` `conformance:harnessprobes` is Phase 335's. `` add: ``
  `gate:stapler` is Phase 356's: the release lane's reading of Apple's stapler, held to recorded answers. `` No table
  row: the gate runs in every build.

## 5. Words (every line the phase prints, verbatim)

`verify-signed.mjs` (two spaces, the level, then the name column at the ninth character as today):

```
  PASS  stapler validate (app)
  PASS  stapler validate (app) — took 2 tries in 10 s
  RETRY stapler validate (app) — Apple's ticket lookup did not answer (NSURLErrorDomain -1005); try 2 of 4 in 10 s
  WARN  stapler validate (app) — no ticket in this copy — the archive was cut before the staple (post-hoc flow). Offline first launch from this artifact prompts; the inline notarization path staples before packaging.
  FAIL  stapler validate (app) — Tortie.app does not have a ticket stapled to it.
  FAIL  stapler validate (app) — Apple's ticket lookup did not answer after 4 tries in 100 s: Error Domain=NSURLErrorDomain Code=-1005 "The network connection was lost."
  FAIL  stapler validate (app) — exit 65, Processing: /…/Tortie.app
  FAIL  stapler validate (app) — stapler gave no answer in 120 s and was stopped
  FAIL  stapler validate (app) — stapler did not start (ENOENT)
  FAIL  stapler validate (Tortie-0.114.0-arm64.dmg) — Tortie-0.114.0-arm64.dmg does not have a ticket stapled to it.
```

The WARN line is today's byte for byte, and is printed only for a missing inner copy. The command line prints the same
lines with `stapler staple (<file name>)` or `stapler validate (<file name>)` as the name, after stapler's own words for
each try; `stapler: give staple or validate and one path, or --self-test` (exit 2); the self-test's green line (§4.4)
or `stapler self-test: N problems:` and one indented line each. No CHANGELOG item, no surface word.

## 6. What moves on purpose, parent → HEAD (each named in the builder's report)

| Scenario | Parent `5a71791d` | HEAD |
| --- | --- | --- |
| A lookup drops once, then answers | loose app or DMG: FAIL `…Error 68.`; inner copy: WARN "no ticket"; the DMG step: exit 68; the lane fails | PASS `took 2 tries in 10 s` after one RETRY line; the lane goes on |
| A lookup never answers | the same, at once | FAIL `Apple's ticket lookup did not answer after 4 tries in 100 s: …` on every copy, 0 WARN; the lane fails about 100 s later per call |
| A copy with no ticket | loose app and DMG FAIL with stapler's sentence; inner WARN "no ticket" | **the same lines, byte for byte**, online or denied |
| A ticket that is not the copy's, or cut | loose FAIL `Processing: …`; inner WARN "no ticket" | FAIL `exit 65, Processing: …` on every copy (D8, Q1) |
| A stapler that never returns | waits for the job's 60 minutes | FAIL at 120 s, `stapler gave no answer in 120 s and was stopped` |
| `npm run build`, `npm run gate:checks` | | the self-test runs (a few ms); one more check script classified |

The one scenario slower than today is a lookup that never answers: it fails after the bound instead of at once, and
it fails either way. Nothing reads better at the parent.

## 7. The gates that move

- `gate:stapler` (new), inside `npm run build`.
- `gate:checks` (`build/assert-hermetic-checks.mjs`): one more `gate:` script, classified.
- Unchanged and run: `npm run typecheck`, `npm run build` (`gate:electron`, `gate:background`, `gate:simulator`,
  `gate:knownhosts`, `gate:checks`, `conformance:ios`, `gate:onlyadd`, `conformance:harnessprobes`, `gate:contract`
  inside it), `npm run gate:contract`. `gate:background` must not read `spawnSync` as a starter it has to end; the
  builder reports what it said.

## 8. Builder, files, and the brief

### 8.1 The files (one builder; a file not in this list is not edited, and a builder that must edit one stops and names it)

| Builder | Files |
| --- | --- |
| **release** | `build/stapler.mjs` (new); `build/fixtures/stapler/answers.json` (new); `build/verify-signed.mjs`; `.github/workflows/release.yml`; `package.json`; `build/verification-checks.mjs`; `CLAUDE.md`; this SPEC's "§As built" |

`git diff --stat 5a71791d` at the end: those paths and this SPEC, nothing else (`out/` is ignored).

### 8.2 The brief (the workflow hands it to the builder)

> THIS IS A BUILD. Build Phase 356 exactly as build/p356/SPEC.md §0, §1.1 and §4 say, in the files of §8.1 only. (1)
> New build/stapler.mjs in assert-arm64-only.mjs's shape: frozen SHIPPED with one member per clause of §4.2 (the regexes
> and constants exactly), the loop, the readings and the notes of §4.2 and §5, exactly three exports (askStapler,
> staplerReading, staplerSelfTest), the live runner and sleep of §4.1, the command line of §4.1 run only when invoked
> directly by realpath, no process.env read, no relative import. (2) New build/fixtures/stapler/answers.json: the 25
> answers of /private/var/tmp/tortie-wt/scratch/p356/spec/fixtures/measured.json byte for byte (check its sha256
> c3bb46db… first), error null, owns as §4.3; the 5 constructed answers and the 14 sequences of §4.3 exactly (the notes
> from /private/var/tmp/tortie-wt/scratch/p356/spec/logs/proto-policy.jsonl). (3) The 26 ablations of §4.4 in the
> module, each naming the fixtures it must turn. (4) build/verify-signed.mjs §4.5; .github/workflows/release.yml §4.6;
> package.json, build/verification-checks.mjs and CLAUDE.md §4.7. Nothing under src/ or ios/. Run, each with its exit
> code: `node --check build/stapler.mjs`; `node build/stapler.mjs --self-test` (the green line of §4.4); `npm run
> gate:stapler`; `npm run typecheck`; `npm run build`; `npm run gate:checks`; `npm run gate:contract`; `npm test` under
> the history block with a scratch HOME (name the four /bin/ps and five FSEvents native failures Phase 355 recorded,
> nothing else red); §9.1's arms in a scratch clone; and §9.1's live runs. Under the history block with a scratch HOME;
> the denied runs under your own network-denied profile (§0.1). Do NOT start a release, tag, dispatch or rerun, and do
> not launch an Electron app. Report every file changed, every command with its exit code and numbers, the history
> stats, and what you could not run and why. Hard rules: SPEC §0.1.

## 9. The proof, run rather than read

### 9.1 What the builder runs before it returns

**The self-test's own integrity**, each alone in a `cp -Rc` clone of the worktree under the builder's scratch (`.git`
pointer removed, `node_modules` real), each file restored by sha256 before the next, the clone removed by its literal
path: B1 one byte of `lookup-validate-dmg`'s `NSPOSIXErrorDomain` changed → red on that answer and on every sequence
using it; B2 `s-missing`'s inner detail with one character changed → red; B3 X5 naming `ok-validate-dmg`, which does
not own K3 → red as a stranger; B4 `answers.json` missing one answer a sequence uses → red on the file's shape. B0, no
change → green.

**Live, against the real tool**: `node build/stapler.mjs validate <a copy of the real DMG>` online (PASS, exit 0, under
2 s) and under the denied profile (four stapler answers echoed, three RETRY lines, FAIL `…after 4 tries in 100 s: Error
Domain=NSPOSIXErrorDomain Code=1 "Operation not permitted"`, exit 1, 100 to 102 s); `node build/verify-signed.mjs
--expect-notarized --artifacts` with cwd a copy of `/private/var/tmp/tortie-wt/scratch/p356/spec/rel-real` online (exit
0, the four stapler lines PASS with no detail). The full denied gate is the verifier's.

### 9.2 The verifier (Tier 2): the gates, the parent measured, and at least one method the builder did not use

A parent at `5a71791d` is `git show 5a71791d:<path>` of `build/verify-signed.mjs` and `build/sign-nested-binaries.cjs`
(which it requires beside itself) into a scratch `build/` folder, and of `.github/workflows/release.yml`; no parent
worktree is needed. Inputs: the spec step's `dl/`, `rel-real/` and `pkg/wt/release/` may be reused after re-checking
their sha256 against §2.1 (they are inputs, not evidence), or rebuilt the same way.

- **Gates**: `npm run typecheck`, `npm run build`, `npm run gate:stapler`, `npm run gate:checks`, `npm run
  gate:contract`, each with its exit code.
- **Measure the parent commit, live**: both builds' `verify-signed.mjs --expect-notarized --artifacts` over the real
  artifacts online and denied, and over the unsigned package online and denied, and both builds' DMG step (the parent's
  two `xcrun stapler` lines, HEAD's two `node build/stapler.mjs` lines) over a copy of the real DMG online and denied
  and over the unsigned DMG online. Expected at HEAD: §6's table; the real artifacts online four PASS with no detail,
  exit 0; denied four sites each three RETRY lines and the lookup FAIL, 0 WARN, `FAIL (4)`, exit 1, about 410 s; the
  unsigned package every stapler line byte-identical to the parent's (§2.5) but the temporary folder names; the DMG
  step denied exit 1 after about 100 s per call with the copy's sha256 unchanged, online exit 0.
- **Attack (the independent method; the risk is a copy with no ticket getting through)**: (1) hostile answers added to
  `answers.json` in a scratch clone, each with the verifier's own expected class from §4.2, run through the clone's
  self-test: the missing sentence beside the lookup words at exit 68; the missing sentence at exit 0; the lookup words
  for `kCFErrorDomainCFNetwork` at 68; `NSURLErrorDomain Code=-1005` with no quoted description; CRLF line ends; the
  sentence on stderr; a description containing `WARNING`; a 1 MB answer; and a sequence whose last answer is missing
  after three lookups. State every disagreement. (2) A property over every sequence of one and two answers drawn from
  the 30 (930 sequences, generated into the clone): none reads PASS unless the last answer it ASKED exited 0, and none
  reads WARN unless that answer is a missing ticket read for an inner copy. (3) A copy with no ticket under the denied network reads missing at HEAD,
  never lookup (validate never asks the network). (4) Fake `APPLE_ID`, `APPLE_APP_PWD` and `APPLE_TEAM_ID` canaries in
  the command line's environment appear nowhere in its output, and `process.env` appears nowhere in the module.
- **Re-derive**: a classifier of the verifier's own, written from §4.2's table without importing the module, over the
  30 committed answers: 30 of 30 agree; and the 14 sequences' tries, waits, seconds and words recomputed by its own loop.
- **The lane, read**: `release.yml` at both builds parsed with `node_modules/js-yaml`: the same steps by name in the
  same order; the DMG step's `run` is the parent's with exactly `:170-171` replaced by §4.6's five lines; every other
  step's `run` and every `uses:` byte for byte; no `xcrun stapler` left in the lane.
- **Budget**: the worst case in CI, written out: 4 sites in the gate and 2 in the DMG step; a dropped lookup that never
  answers costs about 100 s a call (6 calls about 10 minutes against the job's 60 and the step's 20); tries slow to
  fail are cut by the 150 s budget (a call at most 150 s plus one try's 120 s).
- **Stated limits**: an ok after a retry cannot be driven with the real stapler (a sandbox cannot give a running
  process its network back), so that path is held by the recorded answers and the clone; the CI's own words are
  constructed until the main session's verbatim lines replace them (§11).
- **No regression against today**: §6's table filled from the runs, parent and HEAD side by side. Expected: no
  scenario worse but a never-answering lookup failing later.

### 9.3 At the end, once

No disk image of the run attached (`hdiutil info`), no process of the run left, the history stats. No Electron, no
lock slot.

## 10. What is NOT in this phase

- The entry's refusals, whole: no change to notarization, signing, the identity, the entitlements or
  `electron-builder.yml`; the zero-warnings rule stays (a copy with no ticket still fails the lane); no retry of
  `notarytool`, `codesign` or `spctl`, no retry of a missing ticket, no unbounded wait; no release, tag or rerun (the
  next release proves it in CI).
- Not `build/notarize-local.mjs`'s two stapler calls (`:148-149`): the hand-run post-hoc path, watched by a person.
- Not `refresh-dmg-feed.mjs`, not "Release gates on the signed artifacts", not stapler's `-v`.
- No knob for the tries, the waits or the budget: no flag or environment variable selects anything but `SHIPPED`.
- Not the CloudKit sentence as evidence (D3). No vitest file, no CHANGELOG item, nothing under `src/` or `ios/`.

## 11. For the main session at landing

- **The CI's words, owed.** `gh run view 39521413998 --repo gregce/tortie --attempt 1 --log-failed` (and attempts 2 to
  4) and `gh run view 42059523260 --repo gregce/tortie --attempt 1 --log-failed`; take each stapler answer (from its
  `Processing:` line to its `Error 68.` line), strip each line's `job<TAB>step<TAB>timestamp ` prefix, and put them in
  `build/fixtures/stapler/answers.json` as `ci-…` answers verbatim (`source` naming the run and attempt), beside or in
  place of the two constructed ones; then `npm run gate:stapler`. A CI answer that does not read lookup is a defect in
  the classifier: stop and report.
- The running log line and "→ LANDED" on the entry. No CHANGELOG item, so no link to add.
- Q1 to him.
- Scratch to remove after landing: `/private/var/tmp/tortie-wt/scratch/p356/` (this step's is 7.4 GB as `du` counts
  it, most of it APFS clones of the downloads, the app copies and the package clone), and any verifier parent files.

## 12. Questions for him (the main session asks; the build proceeds on the default)

- **Q1.** A stapler answer that is neither a ticket, no ticket nor a dropped lookup (measured: a ticket that belongs to
  another build, a ticket cut short) now fails the check on the copies inside the ZIP and the DMG, where today it warns
  "no ticket in this copy". A release fails either way; only a check run by hand on a release notarized after
  packaging now fails instead of passing with a warning. Keep it failing (the default), or keep today's warning?

## 13. The spec step's commands, exit codes and numbers

Scratch `/private/var/tmp/tortie-wt/scratch/p356/spec/`. Every command ran under the history block with the scratch
`HOME` and `ZDOTDIR`, or under `sb/netdeny*.sb` where marked denied, except where a row says otherwise. The rows are
grouped by instrument, not in the order they ran.

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `stat` of the two history files (outside, by rule) | — | `742199 1793890717`, `23166 1790702242` |
| 2 | `git`, `grep`, `awk`, `sed`, `ls`, `cat` and Read of the entry, the method, `build/p355/SPEC.md`, the files in play, `electron-builder.yml`, `package.json`, `verification-checks.mjs`, `assert-hermetic-checks.mjs`, `assert-arm64-only.mjs`, `CLAUDE.md` | 0 | HEAD `5a71791d`, clean. **The 11 commands after row 1 ran under the block with his `HOME`**, before the wrapper existed: read-only `git`, `grep`, `awk`, `sed`, `ls`, `cat`, `df`, `mkdir` of the scratch, and `node --version`, `gh --version`, `sw_vers`, `xcrun --find stapler`, `xcode-select -p`; row 1's `stat` printed one `date` outside |
| 3 | `ls` and `grep` of `/private/var/tmp/tortie-wt/scratch/release-0114/run-watch*.log` (the main session's) | 0 | `gh run watch` output only: no stapler words |
| 4 | wrote `bin/sb.sh`, `bin/nb.sh`, `sb/netdeny.sb`, `sb/netdeny-ip.sb` (the Write tool) | — | |
| 5 | `chmod +x` of the two wrappers | 0 | **the first `chmod` ran outside the block**, then again inside; a nested `sandbox-exec` → `sandbox_apply: Operation not permitted`, 71 |
| 6 | `bin/prove-netdeny.mjs` under the block, `netdeny.sb`, `netdeny-ip.sb`, twice (the second with `nc -v`) | 0 each | §2.2 |
| 7 | `gh release download v0.114.0 …` | **4** | "gh auth login": no credential |
| 8 | `curl` ×3 from the release's public URLs; `openssl dgst -sha512`, `shasum -a 256` | 0 | §2.1, equal to `latest-mac.yml` |
| 9 | `ditto -x -k` of the ZIP | 0 | |
| 10 | `bin/m-stapler.mjs` online, denied, IP-denied: the DMG, the ZIP's app, the mounted DMG's app (3, 5, 3 each) | 0 each | §2.3; 33 runs; detached each time |
| 11 | `cp -Rc` copies, `rm` of a copy's `CodeResources`, `codesign --verify --deep --strict` ×2 | 0 | |
| 12 | `bin/m-stapler.mjs`: no-ticket validate, staples online and denied | 0 each | 17 runs |
| 13 | `shasum` of the DMG copies; `hdiutil create` | 0 | unchanged bytes; 16,860 bytes |
| 14 | `bin/m-stapler.mjs`: the hdiutil DMG, a missing path, the ZIP, a text file, a folder, online and denied | 0 each | 17 runs |
| 15 | `cp -c`/`cp -Rc` of `~/Library/Caches/electron/85f2b742…/electron-v43.3.0-darwin-arm64.zip` and `~/Library/Caches/electron-builder` into the scratch `HOME`; `cp -Rc` of the worktree, its `.git` pointer removed | 0 | `df -h /` 45 GiB free |
| 16 | **one `date +%s` ran outside the block**; then `npm run package -- -c.mac.identity=null` in the clone, denied | **1** | 74 s, `getaddrinfo ENOTFOUND github.com`, no request left |
| 17 | `npm run package -- -c.mac.identity=null -c.electronDist=node_modules/electron/dist`, denied | 0 | 62 s; §2.1 |
| 18 | `bin/m-stapler.mjs`: the unsigned package, online and denied | 0 each | 9 runs |
| 19 | `bin/m-xcrun-exec.mjs` ×2 (online validates, `lsof`) | 0 | §2.7 |
| 20 | the parent's `verify-signed.mjs` over `rel-real/` and `pkg/wt/release/`, online and denied | 0, 1, 1, 1 | §2.5; 16, 9, 8, 3 s |
| 21 | `hdiutil info` | 0 | no image of this step attached |
| 22 | `git diff --stat 9e48f505 5a71791d`; `git hash-object`; `git rev-parse` of the two blobs | 0 | §0 item 1 |
| 23 | `bin/m-stapler.mjs`: a ticket that is not the copy's, a cut ticket, online and denied | 0 each | 8 runs |
| 24 | `curl` of the job log API without a credential | 0 | **403** |
| 25 | `bin/pick-fixtures.mjs` | 0 | 25 answers, sha256 `c3bb46db…` |
| 26 | `bin/proto-classify.mjs`; `bin/proto-policy.mjs` (edited once by `python3 -I`) | 0 | §2.6 |
| 27 | `spawnSync` timeout, missing program and `Atomics.wait` | 0 | §2.4, §2.7 |
| 28 | Write of this SPEC; history `stat`; `df` | — | |

**History**: `~/.zsh_history` `742199 1793890717` and `~/.bash_history` `23166 1790702242` at the start, around every
run and at the end: never moved. **Left behind**: no process, no attached image, no lock slot; the scratch folder
(§11). **Not run, and why**: no app launch and no Simulator (nothing here needs one); no CI run; the CI's own words
(the job logs need a credential); an ok after a retry against the real stapler (§9.2's stated limit); nothing of his
read beyond the two caches copied in row 15 and the main session's run-watch logs.

## §As built (the builder, 2026-11-05)

Built in `/private/var/tmp/tortie-wt/wt-p356` at `5a71791d`; nothing committed, staged or stashed. Scratch
`/private/var/tmp/tortie-wt/scratch/p356/builder/`: `bin/sb.sh` the history block, `bin/nb.sh` with `sb/netdeny.sb` the
builder's own network-denied profile (no-history.sb's two write denials copied in), `logs/` every run. Node 22.23.1.

### The files (§8.1, and nothing else)

| File | Change | sha256 |
| --- | --- | --- |
| `build/stapler.mjs` | new, 634 lines | `c67893c57bafa8e9…` |
| `build/fixtures/stapler/answers.json` | new, 908 lines, 32,275 bytes: 30 answers (25 measured, 5 constructed), 14 sequences | `2be3e159c601600c…` |
| `build/verify-signed.mjs` | +25 −18: the import; `retry` and `report` beside `pass`, `fail`, `warn`; step 8 and the DMG validate through the module; header item 8; one sentence in the `stapleMode` docblock | `671a45b9e71a3c3f…` |
| `.github/workflows/release.yml` | +5 −2: §4.6's five lines for `:170-171` | `1b905c5aa1942611…` |
| `package.json` | +2 −1: `gate:stapler` after `gate:arm64`; the `build` anchor, which occurred once | |
| `build/verification-checks.mjs` | +9: the `// PHASE 356.` comment and `pure('gate:stapler')` before `verify:signed` | |
| `CLAUDE.md` | +3 −2: `gate:stapler` in the sentence on gates inside `npm run build`, and its one line | |
| this SPEC | this section | |

`git diff --numstat 5a71791d`: `release.yml` 5/2, `CLAUDE.md` 3/2, `verification-checks.mjs` 9/0, `verify-signed.mjs`
25/18, `package.json` 2/1; untracked `build/stapler.mjs`, `build/fixtures/stapler/`, `build/p356/`. Nothing under `src/`
or `ios/`.

### Where the spec named the clause and left the shape (the builder's decisions)

1. `SHIPPED`'s members: K1 `ok`; K2 `missing`; K3 `lookup`, which returns K3's match or null; K4 `otherwise`, the verdict
   of everything else; P1 `retried`; P2 `tries`; P3 `waitsMs`; P4 `budgetMs`; P5 `tryLimitMs` and `stoppedVerdict`; P6
   `pick`; R1 `okReading`; R2 `missingReading` and `innerWords`; R3 `lookupReading`; R4 `failedReading`; R5 `retryNote`
   and `retriedOkLevel`. So X9 is `{ otherwise: 'missing' }`, K4's own member, and X26 is `{ retriedOkLevel: 'WARN' }`,
   because R5 is the clause that keeps an ok after retries a PASS. X12 changes `tries` and `waitsMs`, as its row says.
2. R4 for an answer with an exit and no words reads `exit N` alone, not `exit N, ` (no measured answer has one).
3. The file's shape (§4.4 (1)) also refuses an id an answer and a sequence share, an answer a sequence asks for under
   another action, and a level outside PASS, WARN, FAIL. A shape problem ends the self-test before the suite (B4).
4. `1 problem:` in the singular, as `assert-arm64-only.mjs` writes it.
5. `staplerReading` throws for a `where` that is neither `required` nor `inner`; `askStapler` throws for an empty or
   non-string path.
6. The command line's `staple` and `validate` do not run the self-test first: §4.1 does not ask it, and every lane's
   `npm run build` does.
7. The clock is the global `performance.now()`, as `build/assert-door-only-adds.mjs` uses it.
8. The fixtures file was written by the builder's `bin/make-answers.mjs`: it checks `measured.json`'s sha256 first,
   copies the 25 answers field by field with `error: null` and `owns` added, refuses to write when a literal typed from
   §4.3 disagrees with `logs/proto-policy.jsonl`, and reads the file back (every measured field equal, every measured
   stdout present verbatim).

### Corrections found while building

- `fixtures/measured.json` is **16,847 bytes**; §4.3's 16,841 is its character count (`pick-fixtures.mjs` printed
  `text.length`, and the three curly quotes in `failed-no-such-path` are 3 bytes each). The sha256 `c3bb46db…` matched.
- The live denied validate reads `after 4 tries in 101 s` (100.67 s wall); in the gate the four readings were 100, 100,
  101 and 101 s. §9.1's literal "in 100 s" is the fake clock's; the words and the bound hold.
- The denied gate over the real artifacts took **459 s**, not about 410. The four stapler readings are 402 s of it. The
  parent's own denied gate over the same inputs, run straight after, took **56 s** (the spec step measured 9 s), with
  the load average at 47 (Phase 353 beside), so the other 57 s are the machine, not the module.
- **A real dropped lookup happened online**, 2026-11-05 13:22 local, in the final online gate over `rel-real`: the loose
  app's first validate read `NSURLErrorDomain -1005`, the CI's own code. The gate printed `RETRY stapler validate (app)
  — Apple's ticket lookup did not answer (NSURLErrorDomain -1005); try 2 of 4 in 10 s`, then `PASS  stapler validate
  (app) — took 2 tries in 17 s`, and `verify-signed: PASS`, exit 0, 43 s. That is the path §9.2 says cannot be driven
  with the real stapler, met by chance, and it shows K3 reading a real `Error Domain=NSURLErrorDomain Code=-1005 "…"`
  line, which only the constructed CI answers had shown. The gate does not echo stapler's words, so that answer's text
  was not kept. The parent fails the loose app on any nonzero answer, so this run would have failed there.

### Commands, exit codes and numbers (under `bin/sb.sh` unless marked denied, which is `bin/nb.sh`)

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `node bin/make-answers.mjs build/fixtures/stapler/answers.json` | 0 | 30 answers, 14 sequences, 32,275 bytes |
| 2 | `node --check build/stapler.mjs` | 0 | |
| 3 | `node build/stapler.mjs --self-test` | 0 | `stapler self-test: 30 answers read as recorded, 14 sequences as written, 26 ablations each red on the clause it breaks`; 36 to 61 ms with node's own start |
| 4 | `node build/stapler.mjs`, and `… verify x` | 2, 2 | `stapler: give staple or validate and one path, or --self-test` |
| 5 | `npm run gate:stapler` | 0 | the green line |
| 6 | `npm run typecheck`, twice | 0, 0 | 25 s, then 2 s |
| 7 | `npm run build`, twice | 0, 0 | 57 s, 58 s; the self-test green after `conformance:harnessprobes`, then `contract-inventory: OK` |
| 8 | `npm run gate:checks` | 0 | 278 check scripts classified, 84 of them pure |
| 9 | `npm run gate:contract` | 0 | the baseline byte for byte; it does not move |
| 10 | `gate:background`, `gate:electron`, `gate:simulator`, `gate:knownhosts`, `gate:docker` | 0 each | `gate:background`: 576 files read, 3 starters, 32 of 32 fixtures; with the module taken out of a clone, 575 read and still 3: `spawnSync` is not read as a starter (B7) |
| 11 | `npm test`, twice | 1, 1 | 82 s, 73 s; 1,175 files (5 failed, 1,168 passed, 2 skipped), 22,161 tests (9 failed, 22,138 passed, 14 skipped). The nine are Phase 355's by name: `ps.native.test.ts` twice, `process-table.native.test.ts` and `p269-env-names.test.ts` (`/bin/ps`); `store-watch.native.test.ts` once and `repo-watcher.native.test.ts` four times (FSEvents). Nothing else red |
| 12 | `gh release download v0.114.0 --repo gregce/tortie --pattern 'Tortie-0.114.0-arm64.*' --dir builder/dl` | **4** | "gh auth login"; the empty folder stayed empty. No curl: the inputs are APFS clones of the spec step's downloads, sha256 equal to §2.1 and sha512 equal to the release's `latest-mac.yml` |
| 13 | `bin/prove-netdeny.mjs`, under the block, then denied | 0, 0 | the block: TCP and unix socket connected in process, child `nc` exit 0 both; denied: `EPERM` both in process, `nc` exit 1 both (`connectx … Operation not permitted`) |
| 14 | `ditto -x -k` of the ZIP, `rm` of its `Contents/CodeResources` (2,178 bytes), `codesign --verify --deep --strict` | 0 | the signed copy with no ticket (TeamIdentifier 4GRQMF5T5U, runtime) |

| Live | Command | Network | Exit | Words | s |
| --- | --- | --- | --- | --- | --- |
| L1 | `node build/stapler.mjs validate <a copy of the real DMG>` | online | 0 | stapler's two lines, then `PASS  stapler validate (dmg-on.dmg)` | 0.26 |
| L2 | the same, another copy | denied | 1 | four answers echoed; three RETRY lines `(NSPOSIXErrorDomain 1); try 2, 3, 4 of 4 in 10, 30, 60 s`; `FAIL … after 4 tries in 101 s: Error Domain=NSPOSIXErrorDomain Code=1 "Operation not permitted"`; the copy's sha256 unchanged | 100.67 |
| L3, L3b | `… validate` the signed copy with its ticket removed, and the unsigned package's app | online | 1, 1 | `FAIL  stapler validate (Tortie.app) — Tortie.app does not have a ticket stapled to it.`, one try, no RETRY | 0.08 |
| L4, L4b | L3 and L3b | denied | 1, 1 | the same words; validate never asks the network | 0.08 |
| L9 | `… staple <a copy of the real DMG>` | online | 0 | `PASS  stapler staple (dmg-staple.dmg)`; sha256 `1a664faa…` before and after | 0.33 |
| L5 | `verify-signed.mjs --expect-notarized --artifacts`, cwd a clone of `rel-real` | online | 0 | four stapler PASS lines, no detail; masked, **byte for byte the spec step's parent log** | 18 |
| L6 | the same, cwd a clone of `pkg/wt/release` | online | 1 | FAIL, WARN, FAIL, WARN, `FAIL (20) with 2 warning(s)`; masked, **byte for byte the parent's** | 7 |
| L7 | L5 | denied | 1 | 12 RETRY lines, the four lookup FAILs (100, 100, 101, 101 s), **0 WARN**, `FAIL (4)`; against P7 the masked diff is those four readings and the summary alone | 459 |
| L8 | L6 | denied | 1 | masked, **byte for byte the parent's denied log** | 3 |
| P7 | the parent's gate (`git show 5a71791d:`, blob `53fedbfa`) over L7's inputs | denied | 1 | `FAIL … Error 68.`, `WARN … no ticket`, `FAIL … Error 68.`, `WARN … no ticket`, `FAIL (2) with 2 warning(s)`: the defect, again | 56 |
| L5′ | L5 on the final tree | online | 0 | the real dropped lookup above: one RETRY, `PASS … took 2 tries in 17 s`, the other three PASS | 43 |

The masks are the scratch folder's role name and the temporary folders' six random characters, nothing else.

### The self-test's own integrity (§9.1), in a `cp -Rc` clone

The clone took 8 s, its `.git` pointer removed and `node_modules` real. Each arm's file was put back from the worktree
and checked by sha256 before the next, and the clone was removed by its literal path. Run twice, the second against the
final module (`c67893c5…`) and fixtures (`2be3e159…`), with the same readings.

| Arm | Change | Exit | What it said |
| --- | --- | --- | --- |
| B0 | none | 0 | the green line |
| B1 | one byte of `lookup-validate-dmg`'s `NSPOSIXErrorDomain` (`n` to `N`) | 1 | 24 problems: the answer `read failed, recorded lookup`, and the fields of the three sequences using it, `s-ok-on-2nd`, `s-lookup-then-failed` and `s-slow-lookups` |
| B2 | `s-missing`'s inner detail, `no` to `No` | 1 | 1 problem, `s-missing inner read …` |
| B3 | X5 also naming `ok-validate-dmg` | 1 | `X5 (K3: lookup on the words without exit 68) names ok-validate-dmg, not a fixture of K3` |
| B4 | `ok-staple-dmg` removed from the file | 1 | the file's shape, twice: `s-staple-ok-on-2nd` and `s-ci-staple-ok-on-2nd` ask for it |
| B5, the builder's | X7's change renamed to a member no rule reads | 1 | `X7 (…) left lookup-validate-dmg, … lookup-staple-unsigned-app reading as written` |
| B6, the builder's | the shipped third wait made 61 s | 1 | 10 problems, on `s-ok-on-4th` and `s-lookup-always` |
| B7, the builder's | `gate:background` with the module and without it | 0, 0 | 576 and 575 files read, 3 starters both ways |
| B8, the builder's | a copy printing every fixture each ablation turned | 0 | X1 29, X2 3, X3 7, X4 3, X5 1, X6 9, X7 14, X8 3, X9 11, X10 3, X11 4, X12 8, X13 8, X14 8, X15 1, X16 14, X17 2, X18 6, X19 4, X20 3, X21 3, X22 2, X23 2, X24 4, X25 8, X26 4: each turns every fixture it names, and more |

### §6, as far as the builder ran it

| Scenario | Parent `5a71791d` | HEAD |
| --- | --- | --- |
| A lookup drops once, then answers | any nonzero loose-app answer FAILs | L5′: one RETRY, `PASS … took 2 tries in 17 s`, the gate PASS |
| A lookup never answers | P7: FAIL, WARN "no ticket", FAIL, WARN; 56 s | L7: four lookup FAILs, 0 WARN; 459 s. L2: one call, 100.67 s |
| A copy with no ticket | §2.5's logs | L6 and L8 byte for byte, online and denied; L3 to L4b FAIL with stapler's sentence, one try |
| The real artifacts online | §2.5's log | L5 byte for byte |

No scenario reads worse at HEAD but a lookup that never answers, which fails about 100 s later per call (§6).

### History, what is left, what was not run

- **History**: `~/.zsh_history` `742199 1793890717` and `~/.bash_history` `23166 1790702242` at the start, around every
  run and at the end; never moved.
- **Left behind**: no process (every command ran in the foreground and returned; `/bin/ps` does not start under the
  block, so it was not read), no image attached (`hdiutil info` names nothing of the builder's), no lock slot; the
  clone is removed. The rest of the scratch (APFS clones of the downloads, `rel-real`, the unsigned package and the
  copies) is for §11's removal.
- **Not run, and why**: no Electron, Simulator, package build or CI run (none is needed; the unsigned package is the
  spec step's, sha256 equal to §2.1); no denied staple and no DMG step at either build (the verifier's, §9.2); the CI's
  verbatim words (they need a credential, §11).
- **Q1** stands on its default: a failed answer on an inner copy FAILs (D8). No live run met one; `s-failed`,
  `s-not-started` and X24 hold it.

### The fix round (2026-11-05, 14:09 to 14:40, the fixer, at `5a71791d` plus the uncommitted phase)

The verifier answered `needs_work`: one major, which was a scenario worse than the parent, and four nits. The fix ran
once. **The part that regressed is dropped**: the 120 s stop on the FIRST try, which the parent never had. The stop on a
try after the first stays, because a retry runs only after an answer the parent has already failed on. Nits 1 and 2 are
fixed; nits 3 and 4 are not done, for the reasons below. Scratch, tools and every log:
`/private/var/tmp/tortie-wt/scratch/p356/fixer/` (`bin/sb.sh` the history block, `bin/nb.sh` with `sb/netdeny.sb` the
fixer's own network-denied profile, `tools/`, `plans/`, `logs/`). Nothing was committed, staged or stashed;
`/Users/gdc/gmux` was not written; nothing names `-L gmux`; no Electron, Simulator, lock slot, package build or CI run.
Where this section's numbers differ from §As built's, this section's stand.

#### What each finding got

| Finding | Sev. | What the fix did (source) |
| --- | --- | --- |
| A stapler answer that takes more than 120 s and then succeeds FAILs at HEAD and PASSes at the parent | major | **Dropped for the first try**: `SHIPPED.firstTryLimitMs` is `null`, and the live runner spawns a try that has no limit with `verify-signed.mjs`'s own `tryRun` options, `{ encoding: 'utf8' }`, so a late first answer reads exactly as at the parent. A try after it is still stopped at 120 s and is failed (`tryLimitMs`, `stoppedVerdict`). A retry runs only after a lookup, where the parent has already failed the loose app, the DMG and the DMG step, or warned on an inner copy, which the lane's grep fails; so the stop cannot cut anything the parent would have passed. This is the verifier's (b), narrowed to the try that regressed (new). Not (a): a 60-minute stop never fires in CI, but on a hand run it still cuts an answer the parent waits for. Not (c): it needs his word, and dropping is the no-regression default |
| The self-test's R5 check is red on a FAIL that quotes a description holding `WARN` | nit | R5 now reads the level only: no reading but a missing inner copy is a `WARN`. A FAIL may quote stapler whatever it said, and it ends the step before the grep (the verifier's first option). It is held by a constructed answer, `c-lookup-warning-words` (the verifier's h07: `NSURLErrorDomain Code=-1001 "WARNING: the request timed out."`), and `s-warning-words-always`, which X25 now also names (new) |
| The live runner's timeout and the budget's `>` drift unseen | nit | `s-budget-edge`: a lookup costing 0 s and then 110 s a try, whose third try starts at exactly 150 s (3 tries in 260 s, where `>=` reads 2 tries in 120 s), and X28, the budget 1 ms short (the verifier's fix). The header now says the retry's stop is held by a live run, and this round ran one: F8, F10 and the M6 mutant, F12 (the verifier's fix, both halves) |
| A POSIX error at exit 68 that is not a network error is retried | nit | Not done (the verifier: none needed). A list of POSIX codes would rest on codes nobody has measured at exit 68, and a wrong guess turns a dropped connection back into a failed release. It FAILs either way |
| An answer over 1 MiB reads `stapler ended on SIGTERM` | nit | Not done (the verifier: optional). It FAILs, as at the parent; naming ENOBUFS needs a fixture of a spawnSync answer that no run here has measured |

#### What this round supersedes in §1.1 to §6

- **D5, §4.1's live runner and §4.2's P5.** P5 is now: the first try has no limit, as stapler always ran; a try after
  it is stopped at 120 s (SIGTERM) and is failed, never tried again. `SHIPPED` gains `firstTryLimitMs: null`; the loop
  hands try 1 that and tries 2 to 4 `tryLimitMs`; the live runner passes `{ encoding: 'utf8' }` for no limit and
  `{ encoding: 'utf8', timeout, killSignal: 'SIGTERM' }` for one. P4's 150 s is unchanged, and it now also meets a long
  first try: a first lookup that took more than 140 s reads `after 1 try` (`s-slow-first-lookup`), a reading nothing
  could reach while every try ended by 120 s.
- **§4.3.** 31 answers (one more constructed, `c-lookup-warning-words`) and 18 sequences. Every `limitsMs` now starts
  with `null`. `s-stopped`, a first try stopped, which can no longer happen, is now `s-lookup-then-stopped`: a lookup,
  then a retry that would have answered ok after 125 s, stopped at 120 s (FAIL, 2 tries, 130 s). New: `s-slow-ok` (the
  verifier's S2: ok after 125 s, PASS, 1 try, 125 s), `s-budget-edge`, `s-warning-words-always` and
  `s-slow-first-lookup` (FAIL `…after 1 try in 145 s: …`). The file is 1,067 lines and 36,774 bytes, sha256
  `f03f817d…`. It was written by `tools/edit-answers.mjs`, `-2` and `-3`, which refuse a file that is not in
  `JSON.stringify(…, null, 2)` form and check that no answer before them moved; every expected value in them is a
  literal worked out by hand, not the module's output.
- **§4.4.** The fake runner stops a try whose recorded cost passes the limit it was handed and answers the file's own
  `c-stopped`, as spawnSync's timeout does; the file's shape accepts a `null` limit and requires `c-stopped`; R5 reads
  the level. X16 is now "no limit on a try after the first" (`tryLimitMs: null`, red on `s-lookup-then-stopped`), X17
  names `s-lookup-then-stopped`, X25 also names `s-warning-words-always`, and two arms are new: **X27**, the first try
  stopped at 120 s too, which is the regression put back (red on `s-ok`, `s-slow-ok` and `s-slow-first-lookup`), and
  **X28**, the budget 1 ms short (red on `s-budget-edge`). The green line is `stapler self-test: 31 answers read as
  recorded, 18 sequences as written, 28 ablations each red on the clause it breaks`.
- **§5.** No line changes. `stapler gave no answer in 120 s and was stopped` is now printed only for a retry.
- **§6.** "A stapler that never returns" now reads: the first try waits as at the parent, for the step's 20 or the
  job's 60 minutes; a retry that never returns FAILs at 120 s, where the parent had already failed. "Nothing reads
  better at the parent" holds again (the table below).
- **`build/verification-checks.mjs`.** Its Phase 356 comment says the first try runs as stapler always ran, and counts
  28 ablations.

#### Files the fix round touched

`build/stapler.mjs` (now 658 lines, sha256 `72cf37a5…`), `build/fixtures/stapler/answers.json`,
`build/verification-checks.mjs` (the comment alone; `0d021567…`) and this SPEC. Not `build/verify-signed.mjs`,
`.github/workflows/release.yml`, `package.json` or `CLAUDE.md`, whose words still hold. `git diff --numstat 5a71791d`:
`release.yml` 5/2, `CLAUDE.md` 3/2, `verification-checks.mjs` 10/0, `verify-signed.mjs` 25/18, `package.json` 2/1;
untracked `build/stapler.mjs`, `build/fixtures/stapler/`, `build/p356/`. Nothing under `src/` or `ios/`.

The module moved four times in the round, and each run below names the version it read: `e916b43d…` (F3 to F12 and the
first mutation run), `b0836dac…` (the battery, G2), `8a648954…` (the final mutations and arms, and F13 to F19) and the
final `72cf37a5…` (F20's HEAD run and G3). They differ in one doc comment of the loop, then X27's list, then one header
paragraph's line breaks with the same words; each step was checked by rebuilding the earlier text from the later file
and hashing it (`tools/revert-comment.mjs`, `revert-x27.mjs`, `revert-reflow.mjs`). All four hold the same `LIVE`,
`ask`, `classify`, replay and readings.

#### Commands, exit codes and numbers (under `bin/sb.sh` unless marked denied, which is `bin/nb.sh`)

**Inputs.** `gh release download v0.114.0 --repo gregce/tortie --pattern 'Tortie-0.114.0-arm64.*' --dir fixer/dl`: exit
**4**, `gh auth login`, the folder left empty. The inputs are APFS clones of the spec step's downloads: DMG 165,662,318
bytes, sha256 `1a664faa…094d86`; ZIP 164,725,246 bytes, `7f6524d2…589951`; each sha512 equal to the release's
`latest-mac.yml`. `ditto -x -k` of the ZIP: `Contents/CodeResources` 2,178 bytes, `78069e55…5a4e`. The unsigned package
is the spec step's, after its sha256 (`caee646c…c65d`, `f36875a2…d61d`). The signed copy with its ticket removed passes
`codesign --verify --deep --strict` (exit 0). The parent is `git show 5a71791d:` of `verify-signed.mjs` (blob
`53fedbfa`), `sign-nested-binaries.cjs` and `release.yml` (blob `ac9ae51a`) into the scratch; the pre-fix build is a
copy of the builder's module (`c67893c5…`), fixtures and gate.

**The denied profile, proved first** (`tools/prove-netdeny.mjs`): under the block, TCP and a unix socket connected in
process and a child `nc` exited 0 for both; under `sb/netdeny.sb`, `EPERM` for both in process and `nc` exited 1 for
both (`connectx to 127.0.0.1 port 58212 (tcp) failed: Operation not permitted`).

**The stand-in** (`tools/fake-xcrun.mjs`, reached as `$DEVELOPER_DIR/usr/bin/xcrun`) answers each stapler call from a
plan by the call's count, and runs Apple's own stapler when the plan says so; it refuses anything else, and nothing
asked it for notarytool. Proved first (`tools/smoke-fake.mjs`): `/usr/bin/xcrun` reached it, and the pid spawn started
was the pid that answered (30044), so a spawnSync timeout's SIGTERM reaches it. Without `DEVELOPER_DIR`, `xcrun --find
stapler` names Xcode's. The gate rows below are the loose app alone (`--expect-notarized`, cwd a release folder of the
real artifacts). "First answer after 125 s" is a 125 s sleep and then Apple's real stapler.

| # | Run (`tools/side.mjs`, each group at once) | Build | Exit | s | What it printed |
| --- | --- | --- | --- | --- | --- |
| F1 | the gate, first answer after 125 s | parent | 0 | 129.3 | `PASS  stapler validate (app)` |
| F2 | the same | pre-fix | 1 | 124.06 | `FAIL  stapler validate (app) — stapler gave no answer in 120 s and was stopped`: the verifier's S2, reproduced |
| F3 | the same | HEAD | 0 | 149.86 | `PASS  stapler validate (app)`, no detail (the battery ran beside it) |
| F4 | the command line, `validate` a real DMG copy, first answer after 125 s | pre-fix | 1 | 120.04 | FAIL, stopped |
| F5 | the parent DMG step's line, `xcrun stapler validate`, the same plan | parent | 0 | 125.38 | `The validate action worked!` |
| F6 | F4 | HEAD | 0 | 125.46 | `PASS  stapler validate (s14h.dmg)` |
| F7 | the command line, `staple`, the same plan | HEAD | 0 | 125.57 | `PASS  stapler staple (st14h.dmg)` |
| F8 | the command line, a dropped lookup (real stapler's `NSURLErrorDomain -1005` answer, which the verifier kept in `verify/logs/real-dropped-lookup-D6.txt`, its path and action made the run's own), then a retry whose answer is ok after 125 s | HEAD | 1 | 130.09 | `RETRY … (NSURLErrorDomain -1005); try 2 of 4 in 10 s`, then `FAIL … stapler gave no answer in 120 s and was stopped`: the live runner's stop on a retry, live |
| F9 | the parent DMG step's line, F8's plan | parent | 68 | 0.04 | `The validate action failed! Error 68.` |
| F10 | the gate, F8's plan | HEAD | 1 | 154.57 | RETRY, FAIL stopped, `verify-signed: FAIL (1)` |
| F11 | the gate, F8's plan | parent | 1 | 24.56 | `FAIL  stapler validate (app) — The validate action failed! Error 68.`, `FAIL (1)` |
| F12 | F8 with the M6 mutant (the live runner's timeout dropped, which leaves the self-test green), kept in `fixer/mut6/` | mutant | 0 | 135.43 | RETRY, then `PASS … took 2 tries in 135 s`: the live run catches what the self-test does not |

Every DMG copy's sha256 stayed `1a664faa…`, F7's stapled copy included. The stand-in logged 16 pids over 13 plans; 0
are alive (`tools/pids-left.mjs`, signal 0 only).

Apple's real stapler (no stand-in; the wrapper unsets `DEVELOPER_DIR`), `tools/real.sh`:

| # | Run | Network | Exit | s | What it printed |
| --- | --- | --- | --- | --- | --- |
| F13 | `node build/stapler.mjs validate` a real DMG copy | online | 0 | 1 | stapler's two lines, `PASS  stapler validate (cli-online.dmg)`; the copy's sha256 unchanged |
| F14 | the same, another copy | denied | 1 | 101 | four answers echoed, three RETRY lines `(NSPOSIXErrorDomain 1); try 2, 3, 4 of 4 in 10, 30, 60 s`, `FAIL … after 4 tries in 101 s: Error Domain=NSPOSIXErrorDomain Code=1 "Operation not permitted"`; the copy's sha256 unchanged |
| F15 | the command line, the signed copy with its ticket removed; `xcrun stapler validate` of it | online | 1; 65 | 0; 0 | `FAIL  stapler validate (Tortie.app) — Tortie.app does not have a ticket stapled to it.`, one try, no RETRY; stapler's own sentence |
| F16 | F15 | denied | 1; 65 | 1; 0 | the same words: validate never asks the network |
| F17 | the gate over the real artifacts (`--artifacts`), HEAD, then the parent | online | 0, 0 | 14, 14 | four `PASS` stapler lines each, no detail; masked, byte-identical (3,561 bytes) |
| F18 | the gate over the unsigned package, HEAD, then the parent | online | 1, 1 | 5, 3 | `FAIL`, `WARN`, `FAIL`, `WARN`, `FAIL (20) with 2 warning(s)`; masked, byte-identical (4,659 bytes) |
| F19 | F17 | denied | 1, 1 | 419, 12 | HEAD: 12 RETRY lines, four FAILs `Apple's ticket lookup did not answer after 4 tries in 101, 101, 101 and 100 s: Error Domain=NSPOSIXErrorDomain Code=1 "Operation not permitted"`, 0 WARN, `FAIL (4)`. The parent: `FAIL … Error 68.`, `WARN … no ticket in this copy …`, `FAIL … Error 68.`, `WARN … no ticket …`, `FAIL (2) with 2 warning(s)`: the defect, again. Masked, the diff is those four readings and the summary alone |
| F20 | F18 | denied | 1, 1 | 8, 3 | masked, byte-identical (4,659 bytes); HEAD's stapler lines equal its online ones |

The mask is `tools/mask.sh`: the six random characters of the gate's two temporary folders, nothing else.

**Self-test and gates.**

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| G1 | `node --check build/stapler.mjs` and `node build/stapler.mjs --self-test`, after each of the three fixture edits | 0 each | 30 answers, 16 sequences, 28 ablations; then 31, 17, 28; then 31, 18, 28 |
| G2 | the battery, `tools/gates.sh`, on `b0836dac…`: `node --check`, `--self-test`, `npm run gate:stapler`, `npm run typecheck`, `npm run build`, `npm run gate:checks`, `npm run gate:contract`, `npm test` | 0, 0, 0, 0, 0, 0, 0, **1** | typecheck 2 s; build 54 s; npm test 80 s; every reading as G3's |
| G3 | the same battery on the final tree (`72cf37a5…`, `f03f817d…`, `0d021567…`), `tools/gates-final.sh` | 0, 0, 0, 0, 0, 0, 0, **1** | typecheck 3 s (1,435 production files, 8,188 imports, 0 violations; 5,003 runtime edges, 0 cycles); build 78 s, the self-test's green line inside it after `conformance:harnessprobes`, then `contract-inventory: OK`; gate:checks 278 check scripts classified, 84 pure; gate:contract byte for byte; npm test 108 s, 1,175 files (5 failed, 1,168 passed, 2 skipped), 22,161 tests (9 failed, 22,138 passed, 14 skipped). The nine are Phase 355's by name: `ps.native.test.ts` twice, `process-table.native.test.ts` and `p269-env-names.test.ts` (`/bin/ps`); `store-watch.native.test.ts` once and `repo-watcher.native.test.ts` four times (FSEvents). Nothing else red, and no test names the module or its fixtures |

**Mutations of the module** (`tools/mutate.mjs` on `8a648954…`: each alone in a copy beside the committed fixtures, its
text required to occur once, the worktree's sha256 unchanged after; the first run, on `e916b43d…`, read the same but
21 problems each for M9 and M10, before `s-slow-first-lookup` was added):

| Mutation | Exit | What the self-test said |
| --- | --- | --- |
| M0, none | 0 | the green line |
| M3, the budget test `>` made `>=` (the verifier's M3) | 1 | 7 problems, every one `s-budget-edge` |
| M6, the live runner's timeout dropped (the verifier's M6) | 0 | the green line, as the header says; F12 is its proof |
| M9, `firstTryLimitMs: 120_000`, the regression put back | 1 | 26 problems |
| M10, the loop handing every try `tryLimitMs`, the builder's loop | 1 | 26 problems |
| M11, the fake runner never stopping a try | 1 | 4 problems, every one `s-lookup-then-stopped`, which reads `PASS … took 2 tries in 135 s` |
| M12, R5 reading the words again, the builder's check | 1 | 2 problems, `s-warning-words-always`, required and inner |
| M13, a retry stopped at 110 s | 1 | 14 problems |

**The self-test's own integrity** (`tools/fixture-arms.mjs` on `8a648954…`: §9.1's arms and three of the fixer's,
each alone in a copy, both worktree files' sha256 unchanged after):

| Arm | Exit | What it said |
| --- | --- | --- |
| B0, no change | 0 | the green line |
| B1, one byte of `lookup-validate-dmg`'s `NSPOSIXErrorDomain` | 1 | 42 problems: the answer read failed, and the fields of the six sequences that ask for it |
| B2, `s-missing`'s inner detail, `no` to `No` | 1 | 1 problem |
| B3, X5 also naming `ok-validate-dmg` | 1 | `X5 (…) names ok-validate-dmg, not a fixture of K3` |
| B4, `ok-staple-dmg` removed | 1 | the file's shape, twice |
| B5, `c-stopped` removed | 1 | the file's shape: `c-stopped, what spawnSync answers for a try it stopped, is not an answer` |
| B6, `s-slow-ok`'s first limit written `120000` | 1 | 1 problem |
| B7, a limit written as text | 1 | the file's shape: `s-ok has no usable limitsMs` |

#### No regression against today (the verifier's rows; the one that was worse is the first)

| Scenario | Today | This build after the fix | Worse |
| --- | --- | --- | --- |
| A stapler answer that is ok only after 125 s, through the gate | PASS, exit 0 (F1, 129 s) | PASS, exit 0 (F3); before the fix FAIL at 124 s (F2) | no |
| The same through the DMG step's two lines | exit 0 (F5, 125 s) | PASS, exit 0, `validate` (F6) and `staple` (F7); before the fix FAIL at 120 s (F4) | no |
| A dropped lookup, then a retry slower than 120 s | FAIL `Error 68.` at once (F9 exit 68 in 0.04 s; F11 in 24.6 s) | RETRY, then FAIL stopped after 130 s (F8, F10) | no: the parent had failed on the first answer |
| A stapler that never answers | the first try waits for the step's 20 or the job's 60 minutes | the first try the same; a retry FAILs at 120 s | no |
| The real artifacts, online | four PASS (F17) | byte-identical once masked (F17) | no |
| The lookup never answers (denied), through the gate | FAIL `Error 68.` twice and a false WARN "no ticket" twice, `FAIL (2) with 2 warning(s)`, 12 s (F19) | 12 RETRY, four FAILs in their own words, 0 WARN, `FAIL (4)`, 419 s (F19) | no: it fails either way, later by the bound |
| No ticket: the unsigned package, online and denied | FAIL, WARN, FAIL, WARN; `FAIL (20) with 2 warning(s)` | byte-identical (F18, F20) | no |
| No ticket: the signed copy with its ticket removed | stapler's sentence, exit 65 | FAIL with the same sentence, one try, online and denied (F15, F16) | no |
| The verifier's other rows | as its table | untouched: P5 is the only shipped clause that moved | no |

#### History, what is left, what was not run

- **History**: `~/.zsh_history` `742199 1793890717` and `~/.bash_history` `23166 1790702242` at the start, around every
  run and at the end (30 readings in `logs/hist.log`, and the opening one); never moved. Five commands ran outside the
  block by mistake, none touching a history file: the opening `stat`, `ls` of the scratch folders and `cat` of
  `no-history.sb`; the first two readings (`stat` alone); a `grep`, `sleep` and `cat` loop that waited on the battery's
  summary; one `sed -i` of the fixer's own `tools/real.sh`; and a loop that waited on the denied run with only its
  `grep` and `cat` inside the block, which was stopped and started again inside it. The readings around each did not
  move.
- **Left behind**: no process (every run returned; the stand-in's 16 pids are gone), no disk image of the run attached
  (`hdiutil info` names nothing under the fixer's scratch), no lock slot. The mutation and arm copies are removed; the
  M6 mutant (`mut6/`) is kept for the reverifier. The rest of the scratch (APFS clones of the downloads, the release
  folders, the DMG copies) is for §11's removal.
- **Not run, and why**: no Electron, Simulator, package build or CI run (none is needed); the DMG step's whole script
  (its two lines are the module's command line, run in F6 to F8 and F13 to F16, and the step's text did not move); the
  parent against a stapler that never answers (it would never return); a hung REAL stapler (it cannot be produced
  here), so whether Apple's stapler ends on SIGTERM is not measured (the stand-in does); the CI's own words (§11). The
  verifier's real `-1005` answer (`/private/var/tmp/tortie-wt/scratch/p356/verify/logs/real-dropped-lookup-D6.txt`, a
  staple, real stapler on this Mac) is there for the main session to add beside §11's.
