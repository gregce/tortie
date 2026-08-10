# Phase 12 research — Dimension 1: the specstory-cli surface gmux will drive

Source: `/Users/gdc/getspecstory/specstory-cli` (branch `muse-provider`, source version **v2.8.0** per `changelog.md:3`).
Installed binary: `/opt/homebrew/bin/specstory` v2.5.0 (`brew tap specstoryai/tap && brew install specstory`, README.md:71-78). Single static Go binary (cobra + fang).

## 1. The wrap/capture mode is `specstory run`, not `watch`

Two distinct capture modes exist; gmux wants both:

- **`specstory run [provider-id]`** (alias `r`) — *launches* the agent wrapped, watches its session store, writes markdown + cloud-syncs in real time. `main.go:261-495` (`createRunCommand`).
- **`specstory watch [provider-id]`** (alias `w`) — *does not launch anything*; monitors the cwd for agent activity from any/all providers. `watch.go:64-70`: "Unlike 'run', this command does not launch a coding agent - it only monitors for agent activity."

Provider IDs (v2.8.0): `antigravity, claude, codex, cursor, cursoride, deepseek, droid, gemini, muse` + auto-registered `copilotide*` variants.

### How `run` execs the underlying agent

**No PTY interposition, no output scraping.** The agent inherits specstory's stdio directly — `claude_code_exec.go:113-117`:

```go
cmd := exec.Command(claudeCmd, customArgs...)
cmd.Stdin = os.Stdin
cmd.Stdout = os.Stdout
cmd.Stderr = os.Stderr
```

Same pattern in `codex_cli_exec.go:272-274`, gemini, cursor, droid, deepseek, muse. Inside a tmux pane the agent gets the pane's tty unchanged — TUI rendering, mouse, resize all behave exactly as an unwrapped agent. Capture happens by **filesystem-watching the agent's own session store** (Claude: `~/.claude/projects/<encoded-cwd>/*.jsonl`, `claudecode/path_utils.go:54`), via a watcher started before exec (`claudecode/provider.go:397-413`: `SetWatcherCallback` → `WatchForProjectDir()` → `ExecuteClaude(...)` blocks until exit).

Default claude discovery order (`claude_code_exec.go:28-56`): `~/.local/bin/claude` → `claude` on PATH → `~/.claude/local/claude` → bare `claude`.

### Exit codes — mostly preserved, with one caveat

- Claude: non-zero child exit → `os.Exit(exitCode)` — exact propagation. `claude_code_exec.go:129-134`:
  ```go
  if exitErr, ok := err.(*exec.ExitError); ok {
      exitCode := exitErr.ExitCode()
      ...
      os.Exit(exitCode)
  }
  ```
  Same for cursor (`cursor_cli_exec.go:138`), gemini (`gemini_exec.go:92`), muse (`muse_exec.go:96`).
- Codex/droid/deepseek/antigravity: child failure is returned as a wrapped error → specstory exits **1**, not the child's code (`codex_cli_exec.go:277-281` + `main.go:1741`).
- **Caveat:** the `os.Exit(exitCode)` path bypasses main's deferred final cloud flush (`main.go:1617-1626`, `cloud.Shutdown`), so a non-zero agent exit can drop the tail of debounced cloud syncs. Mitigation is exactly gmux's plan (b): run `specstory sync --silent --no-version-check` at session end.
- General exit codes: 0 ok; 1 any command error; **2 reserved for `check` failures** (`main.go:1716`, `main.go:1741`).

### Passthrough syntax — gmux resume flags THROUGH the wrapper (verified)

Two routes, both land in the agent's argv:

1. **Native resume flag**: `specstory run claude --resume <uuid>`. `main.go:427-433` reads `--resume` and passes it to `provider.ExecAgentAndWatch(cwd, customCmd, resumeSessionID, ...)` (`main.go:486`). The Claude provider validates UUID shape (36 chars w/ dashes, `claudecode/provider.go:383-391`) and `parseClaudeCommand` appends it to the agent argv — `claude_code_exec.go:94-97`:
   ```go
   if resumeSessionId != "" {
       args = append(args, "--resume", resumeSessionId)
   }
   ```
   Codex maps it to the subcommand form `codex resume <id>` (`codex_cli_exec.go:247-260`) — provider-appropriate translation is the CLI's job, which is ideal for gmux's per-agent `resume_argv`.

2. **Custom command string**: `specstory run claude -c "claude --resume <uuid> --dangerously-skip-permissions"`. `-c/--command` replaces the whole agent invocation; requires the provider arg (`main.go:316-329`). Parsed by `spi.SplitCommandLine` (`spi/cmdline.go:23`) — supports double/single quotes and backslash escapes; `~` expanded on argv[0] only (`claude_code_exec.go:88-90`). `--resume` composes with `-c` (appended after custom args).

**gmux mapping:** manifest `argv = ["claude", "--model", "opus"]` becomes
`specstory run claude --no-version-check -c "claude --model opus"`, and `resume_argv` becomes the same plus `--resume <uuid>` (or embed the resume flags inside `-c` yourself — both verified paths).

### Other `run` behavior gmux should know

- Real-time autosave: markdown + cloud sync happen live via the watcher callback during the session (`main.go:449-483`), not just at exit.
- `--output-dir <dir>`: markdown goes **directly** in that dir (no `history/` subfolder) — `path_utils.go:127-134`. Default: `<cwd>/.specstory/history` (`path_utils.go:12,115-134`).
- Side effects in cwd on run/sync/watch: creates `.specstory/`, `.specstory/history/`, an inert commented `.specstory/cli/config.toml` (`config.go:501-527` `EnsureDefaultProjectConfig`), and `.specstory/.project.json` project identity (`docs/PROJECT-IDENTITY.md`; `workspace_id` = hash of cwd, `git_id` = hash of normalized origin URL, git_id preferred — `project_identity.go:298-316`).
- Auth is **not** required to run; unauthenticated prints a warning unless `--silent` or `--no-cloud-sync` (`cmd/utils.go:73-89`).
- Quiet/scripted flags gmux should always pass: `--no-version-check` (kills a stdout update banner printed on *every* invocation after a 2.5s-timeout GitHub HEAD check — `main.go:1614`, `utils/version_update.go:66-84`, `docs/CLI-VERSION-CHECK.md`) and optionally `--silent`.
- Secret redaction of markdown + cloud payloads is ON by default; `--no-redact-secrets` disables.
- Config precedence: flags > `./.specstory/cli/config.toml` > `~/.specstory/cli/config.toml` (`config.go:4-5`). Per-provider custom commands can also live in config (`main.go:374-377` `GetProviderCmd`).

## 2. `specstory watch` — the no-argv-change alternative

`watch.go:39-319`. Monitors cwd for all (or one) provider's activity; agent runs separately. Key for gmux: **`--json` emits one JSON object per session update** (`watch.go:253-268`, flag registered `watch.go:313`):

```json
{"timestamp":"...","action":"created|updated","session_id":"...","start_time":"...","end_time":"...","provider":"claude","markdown_size":1234,"total_user_prompts":2,"agent_activity":5,"markdown_file":".../.specstory/history/....md"}
```

Stops on SIGINT/SIGTERM (`watch.go:174-176`). cwd-scoped — one watcher per project directory covers every gmux session in that project, so gmux could run the agent with its own untouched argv and keep a single `specstory watch --json` sidecar per project instead of wrapping each pane. Trade-off: `run` gives per-pane wrap and exact exit-code semantics; `watch` gives zero argv interference and a machine-readable event stream for the capture indicator.

## 3. `specstory sync` — end-of-session batch

`main.go:500-596`. Creates/updates markdown for **all sessions associated with the cwd** (providers map cwd → their own session stores; Claude: `~/.claude/projects/<encoded-cwd>`), and cloud-syncs them if authenticated.

- Flags: `-s/--session <id>` (repeatable), `--print` (stdout, requires `-s`, `main.go:583-586`), `--only-stats`, `--only-cloud-sync` (requires auth — `main.go:240-243`), `--no-cloud-sync`, `--output-dir`, `--silent`, `--providers`.
- No `--json` on sync; human-readable stats + cloud summary + deep link `https://cloud.specstory.com/projects/<projectID>` (or `.../sessions/<sessionID>` after a `run`) printed at exit — `main.go:1680-1695`.
- Exit codes: 0 / 1 (errors returned through cobra → `main.go:1741`).
- Works unauthenticated (local markdown only, warning printed).
- gmux end-of-session hook: `specstory sync --silent --no-version-check` in the session cwd.

Cloud mechanics (`pkg/cloud/sync.go`): gzip'd `PUT /api/v1/projects/{projectID}/sessions/{sessionID}` with Bearer access token (`sync.go:927-933`), size-based skip via `GET .../sessions/sizes` (`sync.go:305-322`), debounced during autosave, flushed by `cloud.Shutdown` (`sync.go:1230`).

## 4. Auth — device-code flow, tokens, status surface

Doc: `specstory-cli/docs/CLOUD-AUTH.md` (the DEVICE-AUTH content; no file named DEVICE-AUTH.md exists at repo root).

- **`specstory login`** (`cmd/login.go:30-220`): opens browser to `https://cloud.specstory.com/cli-login`, then **blocks reading a 6-character device code from stdin** (`login.go:105-110`), normalizes it, `POST /api/v1/device-login` with device metadata → **10-year refresh JWT**; access JWT (1 h) refreshed via `POST /api/v1/device-refresh` with `Authorization: Bearer <refresh>` (CLOUD-AUTH.md "Cloud Access Token Refresh Flow"). Interactive — gmux should run it in a terminal pane; it cannot be driven headlessly.
  - Already-logged-in short-circuit prints "You're already logged in!" + email + login time and exits 0 (`login.go:41-70`).
- **Tokens live at `~/.specstory/cli/auth.json`**, 0600 (`utils/path_utils.go:200-206`). Structure (`cloud/auth.go:39-59` + CLOUD-AUTH.md example):
  ```json
  {"cloud_refresh":{"token":"...","as":"user@email","createdAt":"...","expiresAt":"...","lastValidAt":"..."},
   "cloud_access":{"token":"...","updatedAt":"...","expiresAt":"..."}}
  ```
- **No `whoami`/`status` command exists** (full command list: check/help/list/login/logout/reindex/resume/run/search/skills/sync/version/watch). The machine-parseable status surface for gmux's settings UI is **reading `auth.json` directly**: logged-in ⇔ file exists with `cloud_refresh`; identity = `cloud_refresh.as`; mirrors `cloud.IsAuthenticated()` (`auth.go:220-260`) and `AuthenticatedAs()` (`auth.go:555-576`).
- **`specstory logout`**: `GET /api/v1/device-logout` then deletes `auth.json` unconditionally (CLOUD-AUTH.md "Cloud Logout").
- Hidden root flag **`--cloud-token <refreshToken>`** — session-only auth bypassing login, built for the VS Code VSIX (`main.go:49`, `main.go:1537-1538`, verified at startup `main.go:219-229`). An option if gmux ever wants to inject credentials itself.
- 401 handling: warning suggests `specstory logout` + `specstory login` (`cmd/utils.go:76-80`).

## 5. Other machine-readable surfaces useful to gmux

- **`specstory list --json`** — all sessions for the cwd across providers as JSON (session metadata + `"provider"` field); `list.go:66,102`.
- **`specstory check [provider]`** — validates config + agent installs; exit **2** on failure (`main.go:1710-1717`); human output only. Good for a one-time "is claude visible to specstory" probe at settings time.
- `specstory version` — plain text.

## 6. Where files land (summary)

| Artifact | Path | Source |
|---|---|---|
| Markdown history | `<cwd>/.specstory/history/*.md` | `path_utils.go:12,127-134` |
| Custom output dir | `<dir>` itself (no subdir) | `path_utils.go:129-131` |
| Debug log (`--log`) | `<cwd>/.specstory/debug/debug.log` | `path_utils.go:135-148` |
| Project identity | `<cwd>/.specstory/.project.json` | `docs/PROJECT-IDENTITY.md` |
| Project config | `<cwd>/.specstory/cli/config.toml` | `config.go:4,357` |
| User config | `~/.specstory/cli/config.toml` | `config.go:5,352` |
| Auth tokens | `~/.specstory/cli/auth.json` (0600) | `path_utils.go:206` |
| Live session index | sessions.db via `NewLiveIndexer(cwd)` | `main.go:446-448` |

## 7. Integration recipe implied for gmux

1. **Session-create toggle ON** → rewrite manifest argv: `[specstory, run, <provider>, --no-version-check, -c, "<original argv joined+quoted>"]`; resume: append `--resume <id>` (claude-style) — specstory translates per provider. Exit codes preserved for claude/cursor/gemini/muse; codex degrades to 1.
2. **Capture indicator** → either the wrap is the indicator (argv inspection), or run a per-project `specstory watch --json` sidecar and light the indicator on JSON events for that session_id.
3. **Session end (toggle OFF or crash)** → `specstory sync --silent --no-version-check` in the session cwd; also compensates for the os.Exit defer-skip caveat.
4. **Settings surface** → parse `~/.specstory/cli/auth.json` for status/email; "Log in" button opens a gmux terminal running `specstory login`; "Log out" runs `specstory logout`.
5. **Bundling** → single Go binary; gmux can ship it (Electron resources) or depend on brew install; `which specstory` + `specstory version` for detection, `check` (exit 2) for health.
