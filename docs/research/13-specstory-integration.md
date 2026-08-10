# Phase 12 synthesis — bundling specstory-cli into gmux

Synthesized from `12-specstory-cli-surface.md` (D1, CLI surface), `specstory-d2-bundling-integration.md` (D2, bundling mechanics), `specstory-d3-detection-launch.md` (D3, detection/launch), `11-agent-registry.md` (manifest argv shapes), and `09-reboot-survival.md` (manifest schema + Appendix F bundled-tmux signing recipe). Source of truth for all CLI claims: `/Users/gdc/getspecstory/specstory-cli` at v2.8.0 (branch `muse-provider`); installed probe binary: Homebrew 2.5.0; latest release: 2.7.0.

The two integration modes Phase 12 ships:

- **(a) Wrap** — session created with capture ON runs its agent under `specstory run`, which execs the agent with inherited stdio (no PTY interposition anywhere — zero pty deps in `go.mod`) and captures by fs-watching the agent's own session store. The tmux pane's TTY reaches the agent untouched.
- **(b) Sync** — every capture-enabled session runs a one-shot `specstory sync` in the session cwd when it ends, which is also the correctness backstop for the CLI's exit-path flush caveat (§1.4).

---

## 1. Verified CLI surface

### 1.1 Wrap argv templates per agent

The wrapper command shape gmux composes from the manifest (`argv` / `resume_argv` per agent, 09-reboot-survival.md §B.4):

```
Fresh:   specstory run <provider> --no-version-check -c "<original argv, shell-quoted>"
Resume:  specstory run <provider> --no-version-check -c "<original non-session flags>" --resume <id>
```

Verified mechanics (D1 §1):

- `-c/--command` replaces the whole agent invocation and **requires the provider positional** (`main.go:316-329`). The string is re-split quote/escape-aware by `spi.SplitCommandLine` (`spi/cmdline.go:23`); `~` expands on argv[0] only.
- `--resume <id>` is read by `run` (`main.go:427-433,486`) and handed to the provider, which appends its own resume syntax **after** the custom args — provider-appropriate translation is the CLI's job (`claude_code_exec.go:94-97`; codex maps to the `resume <id>` subcommand, `codex_cli_exec.go:247-260`). `--resume` composes with `-c`.
- **Always pass `--no-version-check`**: without it every invocation does a blocking 2.5 s GitHub HEAD and prints an "Update Available!" box into the pane (`version_update.go:24-84`, `main.go:1614`). Add `--silent` if the wrapped pane should look byte-identical to an unwrapped agent (suppresses startup chrome, auth warning, exit deep link).
- **Never omit the provider**: `specstory run` with no arg picks `ListIDs()[0]` alphabetically = `antigravity` on this branch (D3 §1), not claude.

Per-agent table (provider IDs from the v2.8.0 registry; manifest argv from `11-agent-registry.md`):

| Agent | Provider ID | Fresh wrap | Resume wrap (child argv the provider builds) | Exit code through wrapper |
|---|---|---|---|---|
| Claude Code | `claude` | `specstory run claude --no-version-check -c "claude --session-id <uuid>"` | `specstory run claude --no-version-check --resume <uuid>` → child `claude --resume <uuid>` | exact (`os.Exit(code)`, `claude_code_exec.go:129-134`) |
| Codex CLI | `codex` | `specstory run codex --no-version-check -c "codex"` | `specstory run codex --no-version-check --resume <id>` → child `codex resume <id>` (subcommand) | **collapses to 1** |
| Cursor CLI | `cursor` | `specstory run cursor --no-version-check -c "cursor-agent"` | `--resume <id>` → child `cursor-agent --resume <id>` | exact (`cursor_cli_exec.go:138`) |
| Gemini CLI | `gemini` | `specstory run gemini --no-version-check -c "gemini"` | `--resume <id>` → child `gemini --resume <id>` (dedupes if already present) | exact (`gemini_exec.go:92`) |
| Factory Droid | `droid` | `specstory run droid --no-version-check -c "droid"` | `--resume <id>` → child `droid --resume <id>` | **collapses to 1** |
| DeepSeek TUI | `deepseek` | `specstory run deepseek --no-version-check -c "deepseek"` | `--resume <id>` → child `deepseek --resume <id>` | **collapses to 1** |
| Antigravity | `antigravity` | `specstory run antigravity --no-version-check -c "agy"` | `--resume <id>` → child `agy --conversation <id>` | **collapses to 1** |
| Muse Code | `muse` | `specstory run muse --no-version-check -c "muse"` | `--resume <id>` → child `muse resume <id>` (subcommand) | exact (`muse_exec.go:96`) |
| Shell session | — | not wrapped (no provider) | — | — |

**The canonical worked example** (Claude, manifest `argv = ["claude","--model","opus"]`, pre-assigned session UUID per 09 §B.4):

```bash
# fresh launch, capture ON:
specstory run claude --no-version-check \
  -c "claude --model opus --session-id 550e8400-e29b-41d4-a716-446655440000"

# resume after reboot — the manifest resume_argv 'claude --resume <uuid>' becomes:
specstory run claude --no-version-check \
  -c "claude --model opus" --resume 550e8400-e29b-41d4-a716-446655440000
# → specstory execs: claude --model opus --resume 550e8400-…
```

Rules gmux's argv composer must encode:

1. **Strip `--session-id` from the `-c` string on resume wraps** — the resume ID rides `--resume`; carrying both flags to claude is an unprobed combination (risk §4.6). Keep all other original launch flags in `-c` because `--resume` does not restore them (`--mcp-config`/`--add-dir`/etc., 11-agent-registry note).
2. Claude's `--resume` value is pre-validated by specstory as a 36-char UUID (`claudecode/provider.go:383-391`) — non-UUID ids error before exec.
3. Exit codes: claude/cursor/gemini/muse propagate exactly; codex/droid/deepseek/antigravity collapse to 1. gmux's pane-exit handling must not interpret the wrapped exit status for the second group (§4.2).
4. Auth is **not** required to run — unauthenticated wrap still writes local markdown (warning suppressed by `--silent`).

### 1.2 Sync at session end

```bash
# precise (session ID known — Claude's pre-assigned UUID):
cd <session-cwd> && specstory sync <provider> -s <sessionID> --silent --no-version-check

# cwd-wide fallback (ID unknown / codex-style post-hoc IDs):
cd <session-cwd> && specstory sync --silent --no-version-check
```

- **cwd is the addressing scheme** — output dir, project identity, and provider store mapping are all cwd-derived (`main.go:392-401`). Run it with the session's cwd, always.
- `-s` is repeatable; other flags: `--print` (requires `-s`), `--only-cloud-sync` (requires auth), `--no-cloud-sync`, `--output-dir`, `--only-stats`. **No `--json`** on sync; exit 0/1.
- Works unauthenticated (local markdown only). When authenticated it gzip-PUTs `/api/v1/projects/{pid}/sessions/{sid}` (`cloud/sync.go:927-933`).
- This is a **correctness backstop, not just a nicety**: the `os.Exit(code)` mirror path on non-zero agent exit skips main's deferred cloud flush (`main.go:1617-1626`), and tmux `kill-pane` (SIGHUP) is unhandled by `run` — both can drop the debounced cloud tail; a later `sync` recovers it from the intact native store.

### 1.3 Auth commands + token locations

- **`specstory login`** — interactive only: opens `https://cloud.specstory.com/cli-login`, then blocks reading a **6-character device code from stdin** (`cmd/login.go:75-110`, max 5 attempts) → `POST /api/v1/device-login` → 10-year refresh JWT; 1-hour access JWT lazily refreshed via `/api/v1/device-refresh`. Cannot be driven headlessly — gmux runs it in a pane (§3.4). Already-logged-in prints email + exits 0.
- **`specstory logout`** — best-effort server revoke, then deletes `auth.json` unconditionally. Safe to spawn headless.
- **Tokens**: `~/.specstory/cli/auth.json`, mode 0600 (`utils/path_utils.go:200-206`):

```json
{ "cloud_refresh": { "token": "…", "as": "user@email", "createdAt": "…", "expiresAt": "…(+10y)", "lastValidAt": "…" },
  "cloud_access":  { "token": "…", "updatedAt": "…", "expiresAt": "…(+1h)" } }
```

- **There is no `whoami`/`status` command** (full list: check/help/list/login/logout/reindex/resume/run/search/skills/sync/version/watch). The parseable status surface is the file itself (§3.4).
- Escape hatches: hidden persistent `--cloud-token <refresh>` (session-only auth, built for the VS Code VSIX, `main.go:1537-1538`); `SPECSTORY_CLOUD_URL` env override.

### 1.4 Other surfaces gmux uses

- **`specstory watch [provider] --json`** — monitors cwd without launching anything; emits one NDJSON object per markdown save: `{timestamp, action: created|updated, session_id, provider, markdown_size, total_user_prompts, agent_activity, markdown_file, …}` (`watch.go:253-268`). Per-project sidecar alternative + capture-indicator feed.
- **`specstory list --json`** — all cwd sessions across providers. **`specstory check [provider]`** — install/config validation, exit **2** on failure (only non-0/1 code in the CLI), human output only.
- Filesystem footprint per capture-enabled project: `<cwd>/.specstory/history/*.md`, `.specstory/cli/config.toml` (inert commented default), `.specstory/.project.json` (git_id preferred over workspace_id); user-global `~/.specstory/{cli/auth.json, cli/config.toml, sessions.db}`. Secret redaction of markdown + cloud payloads is ON by default — leave it.

---

## 2. Bundling plan

### 2.1 Build/copy strategy

- **Do not build from source** — a from-source build gets `version="dev"` and an empty analytics key. Copy the official GoReleaser artifact `SpecStoryCLI_Darwin_arm64.tar.gz` (~16 MB compressed → ~43 MB binary) from the pinned GitHub release into the build. gmux is arm64-only (`electron-builder.yml` `mac.target.arch: [arm64]`), so exactly one binary; if universal ever happens, prefer per-arch app builds over `lipo`.
- Pure Go 1.26.5, `CGO_ENABLED=0`, pure-Go SQLite (`modernc.org/sqlite`) — the only dynamic dep is libSystem. No dylibs, no terminfo, no support files.
- **Placement**: `extraResources` → `Contents/Resources/bin/specstory`, resolved via `process.resourcesPath` — same mechanism as `gmux-tmux.conf`. One stable path (TCC attribution + signing config key off it, same rule Appendix F pins for tmux).
- Record the bundled version in gmux build metadata so Settings can display it without spawning anything.

### 2.2 Signing (parallel to the Appendix F bundled-tmux recipe)

Upstream binaries are only `adhoc,linker-signed` (`TeamIdentifier=not set`) — the upstream signature cannot ride into a notarized app; gmux **must re-sign**. But this is the *easy subset* of the F.3 recipe:

| Appendix F step (tmux) | specstory equivalent |
|---|---|
| F.1 static-link libevent/ncurses | not needed — CGO-free Go already links only Apple dylibs |
| F.2 terminfo bundling | not needed — no terminal library at all |
| F.3 inside-out Developer ID + hardened runtime + timestamp; nested binary listed in `mac.binaries`; notarize the .app | identical: **one line in `mac.binaries`** when the deferred signing pass lands; **zero entitlements** (no JIT, no unsigned-exec-memory; library validation trivially satisfied) |

Today's packaging is `identity: null`, `hardenedRuntime: false` — nothing blocks a Phase-12 spike: drop the binary in `extraResources` and it runs as-is. `codesign --force` happily replaces the adhoc signature later.

### 2.3 Bundled-vs-installed resolution order

**Policy: prefer the user's installed CLI when present and ≥ the bundled version; else use the bundled copy.**

1. Probe login-shell PATH for `specstory`; run `specstory --no-version-check --version`, parse `X.Y.Z (SpecStory)`.
2. Installed semver ≥ bundled → use installed (user rides brew's faster cadence; matches how gmux treats agents — it wraps what the user installs).
3. Else → `<Resources>/bin/specstory`. Zero-install default: the capture toggle works on a machine that has never heard of SpecStory.
4. **Record resolved absolute path + version in the session manifest** next to `argv`/`resume_argv`, so restore-after-reboot replays the same binary and a mid-flight brew upgrade can't change the semantics of an armed resume command.
5. **Never self-update the bundled copy** — any file under gmux.app is sealed by notarization. Bundled copy updates only with gmux releases.

### 2.4 Config sharing verdict: share everything, by construction

All CLI state keys off `$HOME` and cwd, never binary location — bundled and installed copies are indistinguishable to state. One login serves both (`~/.specstory/cli/auth.json`); concurrent access-token refresh is mutex+cooldown-guarded, worst case one redundant refresh; `sessions.db` is a documented derived cache (WAL, "can be deleted and rebuilt") — version skew degrades to reindex, not corruption; TOML decode ignores unknown keys. **No config forking, no coordination needed from gmux.** Do not set `[version_check] enabled=false` in the user-global config (it would silence the user's own CLI) — the per-invocation `--no-version-check` flag is the right tool.

---

## 3. UX integration spec (Phase 12)

### 3.1 Create-session modal (S6) — capture toggle

Add one row to the ⌘T modal between Directory and the buttons:

```
│ ◉ Capture with SpecStory                    [switch]  │  h:28
│    saves this session to .specstory/history           │  caption 11px --text-muted
│    + syncs to SpecStory Cloud (signed in as g@s.com)  │  (second clause only when authed)
```

- **Visibility**: hidden for Shell sessions (no provider) and for agents outside the provider table §1.1. Everything else always shows it — bundling means specstory is always resolvable.
- **Default**: OFF on first-ever use (capture writes `.specstory/` into the user's repo and, when signed in, uploads transcripts — neither should happen by surprise). After the first flip, **per-agent memory**: persist `specstory.captureDefault.<agentId>` and prefill from it — same "sticky last choice" pattern as the modal's other fields. The ˅ quick-create menu (§DESIGN-SPEC S4) inherits the per-agent default silently.
- **Effect on create**: manifest gains `specstory: {enabled, bin, bin_version, provider_id}`; spawned argv is the §1.1 wrap instead of the bare agent argv; `resume_argv` is stored in wrapped form too (composed at restore time from the recorded `bin`).

### 3.2 Per-session capture badge

- **Where**: session row (sessions band + sidebar list) and the identity strip — a small SpecStory glyph after the agent icon, following the icon-discipline rule (agent identity surfaces only).
- **States**:
  - *armed* (glyph at `--text-muted`): session launched wrapped, no capture event yet. This is a real state — Claude warmup-only sessions produce **no** watcher callback until the first real user message (D3 §7).
  - *capturing* (glyph at `--text-secondary`, brief accent pulse on each save): capture events observed.
  - *sync-pending/offline* (dot overlay): local markdown written but cloud sync unavailable (not signed in / network).
- **Feed** (no new protocol needed): poll-free option is one `specstory watch --json` sidecar per capture-enabled *project* — NDJSON per save, keyed by `session_id`, doubles as the exact per-session activity signal; specstory-mac runs exactly this fleet (WatchSupervisor: LRU-capped, crash-respawn). Cheaper v1: read `~/.specstory/sessions.db` (plain SQLite, WAL — gmux main already ships better-sqlite3, open read-only) on a slow tick + `<project>/.specstory/history` mtime watch via @parcel/watcher. Ship the v1 feed; keep the sidecar in the back pocket — do not run `watch` and `run` designs simultaneously per project (double capture pipelines, §4.9).
- Tooltip: "Capturing with SpecStory · <n> saves · last 2m ago" (+ "Open in SpecStory Cloud" when a deep link exists).

### 3.3 Session-end sync: auto, silent, no prompt

- On session end (pane process exit, session close, and the control-client `%exit`/restore paths), for every manifest row with `specstory.enabled`: spawn `specstory sync <provider> -s <agent_session_id> --silent --no-version-check` with cwd = session cwd (drop `-s` when no ID was captured). Fire-and-forget, off the UI thread; also run it during T2/T3 restore reconciliation for rows that died uncleanly — this is the flush backstop (§1.2).
- **No prompt.** The user opted in at creation; a per-session-end modal is pure friction. Failure → standard §6.11 toast ("SpecStory sync failed — will retry on next session end"), success → silent; the session row context menu gains "Open in SpecStory Cloud" when authed (deep link `https://cloud.specstory.com/projects/<pid>/sessions/<sid>`).
- App-quit path: `applicationWillTerminate` already snapshots scrollback; enqueue syncs the same way, best-effort with a short timeout.

### 3.4 Settings section

New "SpecStory" group in Settings (settings-gear, ⌘,):

- **Account** — status parsed **directly from `~/.specstory/cli/auth.json`** (no CLI spawn; there is no whoami command). Logged-in ⇔ file exists ∧ (`cloud_access` token unexpired ∨ `cloud_refresh.token` non-empty) — mirrors `cloud.IsAuthenticated()` (`auth.go:220`). Display: "Signed in as `cloud_refresh.as` · since `createdAt`" or "Not signed in — sessions save locally only". Watch the file with @parcel/watcher so login/logout done in any terminal updates the pane live.
- **Sign in** — button opens a gmux terminal session in the current project running `<resolved-specstory> login`. The device flow is inherently interactive (browser + 6-char code typed into the pane) and *works inside gmux precisely because gmux's panes are real TTYs*; the pane closes on success and the watched auth.json flips the status line. Do not reimplement `/api/v1/device-login` (private API coupling).
- **Sign out** — spawn `specstory logout` headless (server-side revoke + file delete); deleting auth.json directly is equivalent but skips revocation.
- **Binary** — "Using: /opt/homebrew/bin/specstory 2.7.0 (installed)" or "bundled 2.7.0", from the §2.3 resolver; a "check" affordance runs `specstory check --providers <ids> --silent` (healthy ⇔ exit 0 — exactly specstory-mac's health probe).
- **Last sync** — most recent `updated_at` for the project's sessions from `sessions.db` (read-only better-sqlite3).
- **Defaults** — the per-agent capture defaults from §3.1, editable here.

---

## 4. Risks + UNVERIFIED items for hands-on probing in Phase 12

Verified-in-source but **not yet run under gmux** — the Phase 12 spike checklist:

1. **TTY fidelity under tmux** — transparent *by construction* (no PTY interposition; fd passthrough; fsnotify capture; zero tmux mentions in the codebase) but UNVERIFIED hands-on. Probe: wrapped claude in a gmux pane — resize/SIGWINCH, mouse, alternate screen, Ctrl-C, paste bracketing vs an unwrapped control pane.
2. **Exit-code passthrough into gmux's exit detection** — source says exact for claude/cursor/gemini/muse, collapses to 1 for codex/droid/deepseek/antigravity. Probe both groups; make manifest `status` logic ignore wrapped exit codes for the collapse group.
3. **kill-pane / SIGHUP tail loss** — `run` handles SIGINT/SIGTERM but not SIGHUP; final debounced cloud flush is skipped. Confirm the §3.3 sync recovers everything from the native store after a hard `kill-pane`.
4. **`-c` re-splitting of gnarly argv** — `SplitCommandLine` handles quotes/backslashes, but gmux argv can contain embedded JSON (`--mcp-config '{"…"}'`). Probe round-tripping; if lossy, fall back to per-provider config `[providers] <id>_cmd` or drop to unwrapped + watch-sidecar for that session.
5. **Version gap** — everything verified against source v2.8.0 (`muse-provider`, unreleased); latest release 2.7.0; local brew 2.5.0. Before pinning the bundled release, re-verify the load-bearing flags (`-c` + `--resume` composition, `--no-version-check`, `watch --json`, provider list — `muse` may not exist in the bundled release).
6. **`--session-id` + `--resume` collision** — D2 claims they compose; safer to strip `--session-id` from resume wraps (§1.1 rule 1). Probe claude's actual behavior with both flags.
7. **`specstory login` browser-open from a gmux pane** — the tmux server is spawned from Electron (launchd-ish env); confirm the CLI's browser open works from that context, and that the fallback (printed URL, user opens manually) is acceptable.
8. **Warmup-silent sessions** — capture badge must tolerate a wrapped session that never emits a capture event (Claude warmup filtering). UX handles it via the *armed* state; verify no false "capture broken" impressions.
9. **Double-capture hazard** — a user's own `specstory watch`/specstory-mac fleet plus gmux's wrap on the same project. Multi-provider watch dedupes by `providerID/sessionID` fingerprint upstream; verify no duplicate cloud sessions when both run.
10. **Repo side effects** — first wrapped run creates `.specstory/{history,cli/config.toml,.project.json}` in the project; teams without `.specstory` gitignore conventions will see untracked files. Consider a first-enable callout; do NOT auto-edit the user's .gitignore.
11. **Resolver spoofing/staleness** — PATH-preferred binary is whatever the user has; a broken/ancient installed copy wins only if its version parses ≥ bundled. Keep the manifest-recorded path+version as the audit trail; probe the resolver against a deliberately broken PATH shim.
12. **Signing pass remains deferred** — spike ships unsigned (`identity: null` today); the `mac.binaries` line + notarization must land with the bundled-tmux packaging pass or the DMG fails notarization on this Mach-O.
