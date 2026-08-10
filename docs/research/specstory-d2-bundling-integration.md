# SpecStory dimension 2 — bundling + integration mechanics

Source of truth: `/Users/gdc/getspecstory` (working tree = branch `muse-provider`, read-only). Paths below are relative to `specstory-cli/` unless prefixed. Installed CLI probed: Homebrew `specstory` 2.5.0 at `/opt/homebrew/bin/specstory`. Companion docs: `11-specstory-provider-inventory.md` (dimension 1), `specstory-d3-detection-launch.md` (dimension 3), `09-reboot-survival.md` Appendix F (bundled-tmux signing pattern this doc leans on).

## 1. How the CLI is built and distributed

**Language/toolchain.** Pure Go, one binary. `go.mod:8` — `go 1.26.5`; module `github.com/specstoryai/getspecstory/specstory-cli` (`go.mod:1`). SQLite is the pure-Go driver, not cgo: `go.mod:33` — `modernc.org/sqlite v1.56.0 // Pure Go SQLite database driver`.

**Release build.** GoReleaser v2, `/.goreleaser.yml`:

- `CGO_ENABLED=0` (`.goreleaser.yml:7`) → the only dynamic dependency is libSystem; no cgo, no bundled dylibs, no terminfo, nothing.
- Targets `darwin`/`linux` × `amd64`/`arm64` (`:8-13`); binary named `specstory` (`:14`), built from `./specstory-cli/main.go` (`:15-16`).
- `ldflags: -s -w -X main.version={{.Version}} -X …analytics.apiKey={{.Env.POSTHOG_API_KEY}}` (`:17-20`) — version and the PostHog key are injected at release time. A from-source build gets `version = "dev"` and an empty analytics key (relevant if gmux ever builds its own copy: "dev" also disables the update check, `pkg/utils/version_update.go:14`).

**Release pipeline.** `/.github/workflows/release.yml` — fires on tag `specstory-cli/v*` (`:4-6`), runs GoReleaser (`:27-34`), then updates the Homebrew tap `specstoryai/homebrew-tap` with per-platform sha256s (`:100-153`, via `/scripts/update-homebrew-formula.sh`). Artifacts per release: `SpecStoryCLI_{Darwin,Linux}_{x86_64,arm64}.{tar.gz,zip}` + checksums (`.goreleaser.yml:22-40`).

**Sizes** (latest release v2.7.0, GitHub API, 2026-08-09):

| artifact | compressed | unpacked |
|---|---|---|
| `SpecStoryCLI_Darwin_arm64.tar.gz` | 16.3 MB | ~43 MB (2.5.0 arm64 binary = 42,615,570 B) |
| `SpecStoryCLI_Darwin_x86_64.tar.gz` | 17.2 MB | ~45 MB |

(Unstripped dev build in the worktree is 60.7 MB — release `-s -w` matters.)

**Install paths today.** `/install.sh:1-58` curls the latest GitHub release tarball into `/usr/local/bin` (sudo if needed). Homebrew: `brew install specstoryai/tap/specstory` → `/opt/homebrew/bin/specstory` symlink into the Cellar. Docs: `docs/HOMEBREW-SETUP.md`, `docs/CLI-RELEASE.md`.

**Signing status of upstream binaries: none.** The Homebrew-installed 2.5.0 binary is only linker-signed ad hoc:

```
Identifier=a.out
CodeDirectory … flags=0x20002(adhoc,linker-signed)
Signature=adhoc
TeamIdentifier=not set
```

So a bundled copy **must be re-signed** by gmux's pipeline — the upstream signature cannot ride along into a notarized app (and `codesign --force` will happily replace an adhoc signature).

## 2. What bundling into gmux.app requires

**Cost.** +43 MB uncompressed / ~16 MB on the DMG for arm64. gmux currently ships arm64-only (`/Users/gdc/gmux/electron-builder.yml` `mac.target.arch: [arm64]`), so exactly one binary. If a universal build ever happens: GoReleaser publishes separate arches; `lipo -create` the two into a ~88 MB universal Mach-O, or keep per-arch app builds (electron-builder's default) and pick the matching tarball per build — prefer the latter.

**Placement.** Same mechanism already used for `gmux-tmux.conf`: `extraResources` (`electron-builder.yml:31-35`) → `Contents/Resources/bin/specstory`, resolved in main via `process.resourcesPath`. Appendix F's bundle-layout note (09-reboot-survival.md F.1) says Apple's convention for executables is `Contents/MacOS`/`Contents/Helpers` (use `extraFiles` to target those); in practice notarization accepts signed executables under `Resources` too — what matters is **one stable path** (TCC attribution + signing config both key off it), the same rule Appendix F pins for tmux.

**Signing.** Strictly *easier* than the Appendix F tmux case, which is already the easy case:

- Pure-Go, CGO-free binary → links only Apple system dylibs → hardened-runtime library validation is trivially satisfied; **no entitlements** (no JIT, no unsigned-executable-memory — Go ≥1.11 needs none of that).
- electron-builder: list it under `mac.binaries` so it gets Developer ID + hardened runtime + timestamp in the inside-out signing pass; notarization of the .app covers it (identical to the plan of record for bundled tmux, 09-reboot-survival.md F.3).
- Today's gmux packaging is `identity: null`, `hardenedRuntime: false` (`electron-builder.yml:52-53`) — i.e. nothing blocks a Phase-0 spike: drop the binary into `extraResources` and it runs as-is on this machine. The signing work lands with the already-deferred "real packaging" pass, as one more line in `binaries`.

**Version pinning inside the binary.** GoReleaser injects the version; gmux's bundled copy self-identifies via `specstory --version` → `2.7.0 (SpecStory)`. Record the bundled version in gmux's build metadata so the settings surface can display it without spawning anything.

## 3. Bundled vs installed: fallback strategy

Facts that shape the policy:

- **Upstream cadence is fast** (2.5.0 → 2.7.0 in ~2 weeks; provider matrix actively growing on `muse-provider`). A gmux-pinned copy will lag capture-quality/provider fixes between gmux releases.
- **The CLI nags about updates by itself**: every non-`dev` invocation does a **blocking** HTTP HEAD to `https://github.com/specstoryai/getspecstory/releases/latest` with a 2.5 s timeout (`pkg/utils/version_update.go:24-38`, called from `main.go:1614`) and prints a boxed "Update Available!" banner into the terminal when versions differ (`version_update.go:67-84`). For a *pinned bundled copy* this is pure noise plus up to 2.5 s of startup latency per session.
  - Kill it per-invocation with the persistent `--no-version-check` flag (`main.go:1536`; early-parsed at `main.go:1369` so it works before cobra) — **gmux must always pass this** when spawning the bundled copy. The config-file equivalent (`[version_check] enabled=false`, `~/.specstory/cli/config.toml`) also exists but is user-global — it would silence the user's own CLI too; the flag is the right tool.
- **Both copies are interchangeable on shared state** (§4): same config, same auth, same output conventions. Swapping which binary runs is invisible to data.

**Recommended policy:** *prefer the user's installed CLI when it is present and at least the bundled version; otherwise use the bundled one.*

1. Resolve `specstory` like the manifest resolves agents (login-shell PATH probe, d3 doc §5): probe `specstory --no-version-check --version`, parse `X.Y.Z (SpecStory)`.
2. If found and semver ≥ bundled version → use it (user gets brew's faster update cadence; matches how gmux treats agents themselves — it wraps what the user installs).
3. Else → `<Resources>/bin/specstory`. Zero-install default: the SpecStory toggle works on a machine that has never heard of SpecStory.
4. Record the **resolved absolute path + version** in the session manifest next to `argv`/`resume_argv` (09-reboot-survival.md §manifest) so restore-after-reboot replays the same binary, and a mid-flight brew upgrade can't change semantics of an already-armed resume command.

Auto-update tension: do **not** self-update the bundled copy in place (would break the app signature seal — any file under gmux.app is sealed by notarization). The bundled copy only updates with gmux releases; the PATH-preference rule is what gives users a faster lane.

## 4. Config/token paths — a bundled copy shares everything, by construction

All state hangs off `os.UserHomeDir()` and the **cwd**, never off the binary's own location — so bundled and installed copies are indistinguishable to state:

| what | path | source |
|---|---|---|
| auth tokens | `~/.specstory/cli/auth.json`, written `0600` | `pkg/utils/path_utils.go:200-206`; `pkg/cloud/auth.go:784` |
| user config | `~/.specstory/cli/config.toml` | `pkg/config/config.go:352-370` |
| project config | `./.specstory/cli/config.toml` (overrides user; flags override both) | `pkg/config/config.go:2-5` |
| sessions index | `~/.specstory/sessions.db` (+ `-wal`/`-shm`) | `pkg/sessionindex/store.go:105-111` |
| markdown output | `./.specstory/history/` relative to cwd | `config.toml` `[local_sync]` docs; `main.go` `--output-dir` default |
| debug logs | `./.specstory/debug/` | `[logging]` block |

**Conflict analysis (bundled vs installed running concurrently):**

- `auth.json` — one login serves both; that's the *feature*. Access token (1 h TTL, `auth.go:48-53`) is lazily refreshed from the refresh token (10 y TTL, `auth.go:39-46`) under a per-process mutex with a 2-minute cooldown (`auth.go:119-125`); two processes refreshing concurrently just means one redundant refresh — the file is small, written whole. Low risk, no coordination needed from gmux.
- `sessions.db` — explicitly a **derived cache** over the native session stores ("it can be deleted and rebuilt", `pkg/sessionindex/store.go:1-6`; `docs/SESSIONS-DB.md`), opened WAL + busy_timeout. Version skew between a newer bundled CLI and an older installed one degrades to re-indexing, not corruption.
- `config.toml` — BurntSushi decode ignores unknown keys; a newer CLI writing `[resume]`/`[skills]` blocks (as 2.5.0 already does) doesn't break an older one.

**Token escape hatches gmux probably won't need but should know exist:**

- Hidden persistent flag `--cloud-token <refresh-token>` uses a session-only token, bypassing `auth.json` entirely (declared `main.go:1537-1538`, "used by VSC VSIX"; plumbing `pkg/cloud/auth.go:113-117`). If gmux ever wants its own token store, this is the sanctioned seam.
- Cloud target override: `SPECSTORY_CLOUD_URL` env or hidden `--cloud-url` flag; default `https://cloud.specstory.com` (`pkg/cloud/sync.go:663-678`).

## 5. Programmatic status — what gmux can read without spawning the CLI

**Login status (settings surface).** Read `~/.specstory/cli/auth.json` directly. Shape (`pkg/cloud/auth.go:39-59`):

```json
{ "cloud_refresh": { "token": "…", "as": "user@email", "createdAt": "…", "expiresAt": "…(+10y)", "lastValidAt": "…" },
  "cloud_access":  { "token": "…", "updatedAt": "…", "expiresAt": "…(+1h)" } }
```

The CLI's own notion of "logged in" (`IsAuthenticated`, `auth.go:220-270`): file exists ∧ (`cloud_access` token unexpired ∨ `cloud_refresh.token` non-empty — an expired access token still counts because refresh is lazy). `AuthenticatedAs()` = (`cloud_refresh.as`, `cloud_refresh.createdAt`) (`auth.go:555-576`). gmux: parse the JSON in main, show `as` as "Signed in to SpecStory Cloud as …", watch the file (@parcel/watcher is already a main-process dep) to react to login/logout done elsewhere. File is `0600` — same-user Electron main reads it fine.

**Login/logout actions.** `specstory login` is inherently interactive: opens the browser to `<cloud>/cli-login` and loops reading a **6-character code from stdin** (`pkg/cmd/login.go:75-110`, max 5 attempts). So the settings surface's "Sign in" button should open a terminal (a gmux tmux pane/window running `specstory login`) rather than trying to drive it headlessly. `specstory logout` just deletes `auth.json` + best-effort server-side revoke (`pkg/cloud/auth.go:661-700`) — safe to spawn headless, or gmux can simply delete the file it already knows how to read (the CLI treats missing file as logged out). Re-implementing the device-login API (`/api/v1/device-login`, `auth.go:316`) in gmux is possible but couples to a private API — not recommended.

**Per-session capture indicator.** Three independent feeds, strongest first:

1. **`specstory watch --json`** — streaming NDJSON, one object per markdown save: `{timestamp, action: "created"|"updated", session_id, start_time, end_time, provider, markdown_size, total_user_prompts, agent_activity, markdown_file}` (`pkg/cmd/watch.go:253-269`; flag declared `:315`; initial-scan noise suppressed `:200-218`). If gmux runs capture in watch mode (§6c) it gets the indicator for free off stdout.
2. **`~/.specstory/sessions.db`** — plain SQLite (gmux main already ships better-sqlite3): `sessions(agent, session_id PK, project_id, updated_at, native_path, origin_cwd, user_turns, total_turns, …)` (`pkg/sessionindex/store.go:210-232`). Kept live by `run`/`watch`/`sync` via the LiveIndexer (`watch.go:196-198`). Open read-only; it's WAL so concurrent reads are safe.
3. **`<project>/.specstory/history/*.md` mtimes** — dumbest possible "capture happened" signal, no dependencies.

And on process exit, `run`/`sync` print a deep link `https://cloud.specstory.com/projects/<projectID>/sessions/<sessionID>` when cloud sync ran (`main.go:1685-1692`) — pane-visible, also parseable if gmux ever scrapes.

## 6. Wiring the two requested modes into gmux argv

(Launch grammar detail is dimension 3's; this is the bundling-relevant shape.)

- **(a) "Capture" toggle at session creation** — manifest argv becomes
  `[<resolved-specstory>, "run", <provider-id>, "--no-version-check", "-c", "<original agent argv as one string>"]`; resume_argv `[…, "run", <provider-id>, "--no-version-check", "--resume", <session-id>]`. Note `-c` **requires** the provider-id positional (`main.go:316-328`); the `-c` string is re-split quoted-arg-aware (`spi.SplitCommandLine`) so gmux's fully-controlled argv survives. Providers append their resume flag *after* custom args (e.g. `claude_code_exec.go:93-96`), so Claude's pre-assigned `--session-id <uuid>` in the `-c` string composes with a later `--resume`.
- **(b) Sync when the session ends** — `specstory sync <provider> -s <sessionID> --no-version-check` (one-shot; flags `main.go:1540-1557`: `-s` repeatable, `--no-cloud-sync`, `--only-cloud-sync`, `--only-stats`, `--print`). **Must run with cwd = the project directory** — output dir, project identity, and provider store mapping are all cwd-derived (`main.go:392-401`). gmux knows both cwd and (for Claude) the pre-assigned session UUID, so end-of-session sync is a precise single-session call, not a whole-provider sweep.
- **(c) Alternative worth considering: watch-mode sidecar.** `specstory watch [provider] --json` "does not launch a coding agent — it only monitors" (`pkg/cmd/watch.go:64-70`): one hidden process per *project* captures every agent session in that cwd regardless of how it was launched, leaves agent argv completely untouched (agent exit codes, signals, and resume flows unmodified), and doubles as the capture-indicator feed (§5.1). Cost: a long-running process gmux must supervise, and per-project rather than per-session granularity.

Useful hygiene flags for any gmux-spawned invocation: `--no-version-check` (always, §3), optionally `--silent` (suppresses all non-error chrome incl. the update banner and auth warning — persistent, early-parsed `main.go:1364-1368`), `--no-usage-analytics` if the user opts out in gmux settings. Secret redaction of saved/synced markdown is ON by default (betterleaks, `go.mod:18`); `--no-redact-secrets` exists (`main.go:1557`) — leave it alone.

## 7. Behavior inside tmux

Short version: **transparent by construction.**

- **No PTY interposition anywhere.** There is no pty library in `go.mod` at all, and `run` wires the child directly to the CLI's own stdio: `cmd.Stdin = os.Stdin; cmd.Stdout = os.Stdout; cmd.Stderr = os.Stderr` (`pkg/providers/claudecode/claude_code_exec.go:112-117`; same pattern across providers, d1 doc §1). Inside a gmux tmux pane the agent TUI therefore owns the pane tty *directly* — SIGWINCH/resize, mouse reporting, alternate screen, cursor queries all flow agent↔tmux untouched. SpecStory never sees, buffers, or re-encodes a byte of terminal traffic.
- **Capture is filesystem-based, not terminal-based**: fsnotify (`go.mod:22`) on each provider's native session store (`~/.claude/projects/…`, etc.). tmux cannot affect it.
- **Exit codes are mirrored** — nonzero child exit → `os.Exit(sameCode)` (`claude_code_exec.go:130-134`), so gmux's pane-exit watchers see the agent's real status through the wrapper.
- **Signals**: `run` uses `signal.NotifyContext(SIGINT, SIGTERM)` (`main.go:404`) and spawns the child in the same process group, so a pane Ctrl-C reaches the agent normally while specstory does a final save/cloud flush on the way out (`cloud.Shutdown(CloudSyncTimeout)` in main's exit defer). tmux `kill-pane` (SIGHUP) is the only unhandled signal — worst case the final debounce flush is skipped; the native store is still intact and a later `sync` recovers it (the cache/derived-data principle of §4).
- **No tmux special-casing, no known issues encoded**: `grep -ri tmux` over `specstory-cli/` matches zero Go/docs sources (only an unrelated `.specstory/history` transcript).
- The interactive TUIs (`resume` picker, session browser) are standard bubbletea/lipgloss (`go.mod:14-16`) — well-behaved under tmux; only relevant if gmux surfaces `specstory resume` in a pane.
- Cosmetic only: `run`/`watch` print startup chrome (auth warning, watch banner) and an exit deep-link into the pane; `--silent` removes all of it if the wrapped session should look byte-identical to an unwrapped agent.
