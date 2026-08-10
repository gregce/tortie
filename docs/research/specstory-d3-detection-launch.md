# SpecStory dimension 3 — agent CLI detection + launch mechanics

Source of truth: `/Users/gdc/getspecstory` (working tree = branch `muse-provider`; `mac-app` and `qwen-provider-support` branches read via `git show`). All paths below are relative to `specstory-cli/` unless prefixed otherwise.

## 1. The provider registry: which agents exist and their IDs

`pkg/spi/factory/registry.go:52-126` (`registerAll`) is the single registration point. On `muse-provider` the registered IDs are:

| ID | Provider pkg | Human name | Kind |
|---|---|---|---|
| `claude` | `providers/claudecode` | Claude Code | CLI |
| `cursor` | `providers/cursorcli` | Cursor CLI (`cursor-agent`) | CLI |
| `codex` | `providers/codexcli` | Codex CLI | CLI |
| `gemini` | `providers/geminicli` | Gemini CLI | CLI |
| `droid` | `providers/droidcli` | Factory Droid CLI | CLI |
| `cursoride` | `providers/cursoride` | Cursor IDE | IDE (DB watcher) |
| `copilotide` (+3 variants) | `providers/copilotide` | VS Code Copilot IDE | IDE (file watcher) |
| `deepseek` | `providers/deepseektui` | DeepSeek TUI | CLI |
| `antigravity` | `providers/antigravitycli` | Antigravity CLI | CLI |
| `muse` | `providers/musecode` | Muse Code | CLI |

- Copilot IDE variants are conditionally registered: stock VS Code always; `copilotide-insiders`, `copilotide-vscodium`, `copilotide-vscodium-insiders` only when their data dir already holds ≥1 Copilot chat — `registry.go:89-110`: *"the alternative distributions register only when they hold at least one Copilot chat, so merely having Insiders or VSCodium installed doesn't add provider entries"*. Variant table (ID, data dir, launcher command, macOS bundle) is `providers/copilotide/provider.go:24-68` (`code`, `code-insiders`, `codium`, `codium-insiders`).
- Branch `qwen-provider-support` adds `qwen` (`providers/qwencode`, binary `qwen`, PATH-only detection, `--resume <id>` flag) — `git show qwen-provider-support:specstory-cli/pkg/spi/factory/registry.go:121`.
- Lookup is case-insensitive (`registry.go:145-170`). `GetDefault()` returns `claude` (`registry.go:203-207`), **but** `specstory run` with no arg uses `ListIDs()[0]` — alphabetically sorted (`main.go:341-348`, `registry.go:188-200`) — which on this branch is `antigravity`, not `claude`. Quirk/regression worth knowing if gmux mirrors "default agent" semantics.

## 2. The SPI contract that encodes detection + launch

`pkg/spi/provider.go:61-154` — every provider implements:
- `Check(customCommand string) CheckResult` — install/version probe. `CheckResult{Success, Version, Location, ErrorMessage}` (`provider.go:12-17`).
- `DetectAgent(projectPath, helpOutput) bool` — "has this agent ever been used in this project dir" (session-store probe, not binary probe).
- `ExecAgentAndWatch(projectPath, customCommand, resumeSessionID, debugRaw, sessionCallback)` — launch interactive + watch session store; blocks until agent exit (`provider.go:97-106`).
- `WatchAgent(ctx, ...)` — watch without launching.
- `ReconstructSession` / `NativeSessionPath` / `SupportsReconstruction` — cross-agent resume (write a foreign session into this agent's native store, then launch with its resume flag).

Custom command strings are parsed by a shared shell-like tokenizer `spi.SplitCommandLine` (`pkg/spi/cmdline.go:23-80` — quotes, backslash escapes, whitespace splitting).

## 3. How binaries are FOUND (per agent)

Two tiers exist. The three oldest providers do multi-location probing; everything newer is PATH-only via `exec.LookPath`.

### Multi-location probing

**Claude Code** — `providers/claudecode/claude_code_exec.go:22-56` `getDefaultClaudeCommand()`, in order:
1. `~/.local/bin/claude` (preferred native install)
2. `claude` on PATH (`exec.LookPath`) — note it returns the bare string `"claude"`, not the resolved path, so PATH resolution happens again at exec time
3. `~/.claude/local/claude` (legacy npm install)
4. bare `"claude"` fallback

**Codex CLI** — `providers/codexcli/codex_cli_exec.go:40-131`:
1. Homebrew: `$HOMEBREW_PREFIX/bin/codex` if env set; else `brew --prefix` subprocess → `<prefix>/bin/codex`; else hard fallback `/opt/homebrew/bin/codex` (`findHomebrewCodex`, lines 53-90)
2. npm/nvm: `$NVM_BIN/codex`; else `npm bin -g` subprocess → `<bin>/codex`; else `$NVM_DIR/versions/node/current/bin/codex` (`findNpmCodex`, lines 92-131)
3. bare `"codex"`
Each candidate is validated with an executability check (`isExecutable`, lines 157-165: exists, not dir, mode `&0o111 != 0`).

**Cursor CLI** — `providers/cursorcli/cursor_cli_exec.go:25-59`:
1. `cursor-agent` on PATH
2. `~/.cursor/bin/cursor-agent`
3. `~/.local/bin/cursor-agent`
4. bare `"cursor-agent"`

### PATH-only (LookPath, bare-name fallback)

- **Gemini**: `gemini` (`providers/geminicli/gemini_exec.go:21-30`)
- **Droid**: `droid` (`providers/droidcli/provider.go:21` `const defaultFactoryCommand = "droid"`; Check LookPaths it at `provider.go:42`)
- **DeepSeek**: `deepseek` (`providers/deepseektui/provider.go:19`, Check at `provider.go:43`)
- **Antigravity**: `agy` — `providers/antigravitycli/antigravity_exec.go:14-22`: *"The installed binary is `agy` (an `antigravity` alias exists but is not normally on PATH)"*
- **Muse**: `muse` (`providers/musecode/muse_exec.go:22-30`)
- **Qwen** (branch): `qwen`

### IDE launchers

- **Cursor IDE**: launcher binary `cursor` on PATH; **detection** is not the binary at all but the SQLite global DB `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` (`providers/cursoride/path_utils.go:25-27`, `provider.go:33-88` Check opens the DB).
- **Copilot IDE**: launcher `code`/`code-insiders`/`codium`/`codium-insiders`; detection = existence of `~/Library/Application Support/<DataDirName>/User/workspaceStorage` (`providers/copilotide/path_utils.go:24-27`, Check at `provider.go:96-131` — deliberately spawns **no** subprocess: *"Check also gates provider availability in latency-sensitive paths ... so no subprocess is spawned and no version is reported"* lines 122-127).

### Custom-command override chain

Priority for the actual command line: `-c/--command` flag → per-provider config `[providers] <id>_cmd` in TOML (`pkg/config/config.go:111-148` template, `ProvidersConfig` struct lines 254-268, `GetProviderCmd` lines 965-1000, wired in `main.go:371-374`) → provider default detection above. Tilde in the first token is expanded (each `parse*Command`, e.g. `claude_code_exec.go:86-89`).

## 4. Install/version checks (`specstory check`, `Check()`)

`pkg/cmd/check.go:40-108` — `specstory check [provider]` checks all registered providers (or a `--providers` subset) plus TOML config validity; success prints Version + resolved Location. Per-provider mechanics:

| Agent | Probe | Output validation |
|---|---|---|
| claude | `claude -v` (`claudecode/provider.go:180`) | stdout must contain `"(Claude Code)"` (`provider.go:226-246`) — guards against a different `claude` binary |
| cursor | `cursor-agent --version` (`cursorcli/provider.go:106`) | any non-empty output accepted (`provider.go:152-172`) |
| codex | tries `--version` then `-V` (`codexcli/codex_cli_exec.go:167-207` `runCodexVersionCommand`) | non-empty output; errors bucketed not_found/permission_denied/no_output |
| gemini | `gemini --version` (`geminicli/provider.go:51`) | none — trimmed stdout is the version |
| droid | `droid --version` (`droidcli/provider.go:40-62`) | strips `\r` + ANSI escapes, takes **last non-empty line** as version (`sanitizeDroidVersion`/`extractDroidVersion`, `provider.go:274-294`) — droid's version output is noisy |
| deepseek | `deepseek --version` (`deepseektui/provider.go:37-62`, flag const line 20) | classify-only |
| antigravity | `agy --version` (`antigravitycli/provider.go:33-60`) | *"prints a bare semver such as '1.1.3'"* (comment line 34) |
| muse | `muse --version` (`musecode/provider.go:58`) | none |
| cursoride | open SQLite `state.vscdb` — no subprocess, no version | — |
| copilotide | stat `workspaceStorage` dir — no subprocess, no version | — |

**There is no minimum-version gating anywhere** — checks are existence/identity probes, not semver comparisons. Error classification is uniform: `exec.ErrNotFound` → `not_found`, `os.ErrPermission` → `permission_denied`, else `unknown` (e.g. `claudecode/provider.go:193-205`, `codexcli/codex_cli_exec.go:210-239`).

## 5. How `specstory run <agent>` launches (command line, env, PTY)

Command wiring: `main.go:261-495` `createRunCommand`. Flow: resolve provider → custom cmd fallback to config → `SetupOutputConfig` → project identity → provenance engine + FS watcher → `NewLiveIndexer` (sessions.db) → autosave callback → `provider.ExecAgentAndWatch(cwd, customCmd, resumeSessionID, debugRaw, sessionCallback)` (`main.go:486`). Flags: `-c/--command`, `--resume <id>`, `--output-dir`, `--debug-dir`, `--no-cloud-sync`, `--only-cloud-sync`, hidden `--provenance` (`main.go:1559-1566`).

### The critical architectural fact: NO PTY

SpecStory never allocates a pseudo-terminal. Every CLI provider does:

```go
cmd := exec.Command(agentBin, args...)
cmd.Stdin = os.Stdin
cmd.Stdout = os.Stdout
cmd.Stderr = os.Stderr
```

(`claudecode/claude_code_exec.go:112-117`, `codexcli/codex_cli_exec.go:271-274`, `cursorcli/cursor_cli_exec.go:101-106`, `geminicli/gemini_exec.go:73-78`, `droidcli/droid_exec.go:41-44`, `deepseektui/deepseek_exec.go:47-50`, `antigravitycli/antigravity_exec.go:57-60`, `musecode/muse_exec.go:78-83`.) `grep -rn pty` over `pkg/` + `go.mod` finds nothing; there is no creack/pty dependency. The agent's TUI works because specstory itself is running in a real terminal and hands its fds straight through. **Session capture never comes from the terminal stream — it comes exclusively from watching the agent's own on-disk session store in parallel.** For gmux this means: give each agent a tmux pane (the PTY) and replicate only the store-watching side; there is no stdout parsing to port.

### Env

Inherited wholesale from the parent. Only exception: Cursor CLI appends `FORCE_COLOR=1` (`cursorcli/cursor_cli_exec.go:108-109` — "Ensure cursor-agent runs with proper terminal settings"). Codex store location honors `$CODEX_HOME` when watching (`codexcli/path_utils.go:11-18`).

### Exit/signal handling quirks

- claude/gemini/muse: on child non-zero exit, specstory **mirrors the exit code via `os.Exit(code)`** (`claude_code_exec.go:130-134`, `gemini_exec.go:89-93`, `muse_exec.go:92-97`).
- cursor: installs its own SIGINT/SIGTERM handler, forwards Interrupt to the child, waits 2s, force-kills on failure (`cursor_cli_exec.go:119-158`).
- droid/deepseek/antigravity: plain `command.Run()` error return.

### ExecAgentAndWatch shape (CLI agents)

Uniform pattern (`claudecode/provider.go:375-425`, `codexcli/provider.go:375-422`, etc.): set watcher callback → start store watcher **before** exec (so the new session file's first write is caught) → exec agent (blocks) → stop watcher. IDE providers instead open the app and block on Ctrl-C: `cursoride/provider.go:457-505` and `copilotide/provider.go:338-406`, both via the shared launcher `providers/vscode/launcher.go:43-79` `OpenApp` — LookPath the IDE CLI (`cursor`, `code`, …), canonicalize the project path (*"launching with the user's typed spelling ... would mint a second workspace entry"*, lines 27-31), spawn detached without waiting, return `ErrCLIMissing` with user guidance to run "Shell Command: Install 'cursor' command" when the shell command isn't installed (`cursoride/provider.go:474-477`).

## 6. Resume flag construction (per-agent quirks)

Resume ID is appended to the parsed command by each provider:

| Agent | Resume syntax | Where | Quirks |
|---|---|---|---|
| claude | `--resume <uuid>` appended | `claude_code_exec.go:93-98` | Pre-validated: must be 36 chars containing `-` (UUID) or ExecAgentAndWatch errors (`claudecode/provider.go:383-391`) |
| codex | `resume <id>` **subcommand**, appended after custom args | `codex_cli_exec.go:249-260` | Not a flag |
| cursor | `--resume <id>` | `cursor_cli_exec.go:94-98` | |
| gemini | `--resume <id>` via `ensureResumeArgs` | `gemini_exec.go:43-60` | Skips append if user's custom cmd already has `--resume`/`-r`/`--resume=` |
| droid | `--resume <id>` | `droid_exec.go:49-66` | Same dedupe |
| deepseek | `--resume <id>` | `deepseek_exec.go:57-82` | Smarter dedupe: fills a bare `--resume`, repairs empty `--resume=` in place |
| antigravity | `--conversation <id>` | `antigravity_exec.go:19-22, 67-92` | *"`-c` (most recent) is the alternative the CLI offers but we always target a known id"* |
| muse | `resume <id>` subcommand | `muse_exec.go:19-20, 48-67` | *"a subcommand rather than a flag (like Codex, unlike Qwen's --resume)"* |
| qwen (branch) | `--resume <id>` | `qwencode/qwen_exec.go:43-70` | |
| cursoride / copilotide | no flag — session is **reconstructed into the IDE's store first**, then the IDE is opened; user finds it in the Agents/Chat panel | `cursoride/provider.go:462-468`, `copilotide/provider.go:343-352` | |

Cross-agent resume (`pkg/cmd/resume.go:226-370`): same-agent → native resume in place with the existing ID; cross-agent → load source SessionData, `ReconstructSession` into target's native store (durable+atomic write, `writeReconstructedSession` lines 530+, plus `waitForSessionFileVisible` lines 588+ so the launch doesn't race the write), then `ExecAgentAndWatch(cwd, "", newNativeID, ...)` — resume launches never pass a custom command (`resume.go:299`). Session addressing for `--session` accepts `specstory://projects/<pid>/sessions/<sid>`, https permalinks, or bare UUID (`pkg/cmd/session_uri.go:17-56`).

## 7. Session-ID capture at launch

There is no handshake with the agent — the ID is discovered from the store watcher's first callback:

- `main.go:67-68, 475-482`: `lastRunSessionID` is set from every `sessionCallback(session)`; on exit it powers the deep link `https://cloud.specstory.com/projects/<projectID>/sessions/<sessionID>` (`main.go:1684-1689`).
- Claude: watcher targets `~/.claude/projects/<encoded-cwd>/` (encoding: symlink-resolved cwd, every char outside `[a-zA-Z0-9-]` → `-`, leading dash — `claudecode/path_utils.go:12-26`). If the project dir doesn't exist yet it watches the parent for its creation, and if `~/.claude/projects` itself is missing it arms `WatchForClaudeSetup()` (`claudecode/watcher.go:119-135, 164-178, 466+`). New `<sessionID>.jsonl` file appears → parsed → callback.
- Codex: sessions land in `$CODEX_HOME/sessions/YYYY/MM/DD/*.jsonl` for **all** projects mixed; the watcher hierarchically watches the date tree, and attributes a session to the project by reading the `cwd` recorded in the session-meta line and comparing to the launch dir (`codexcli/watcher.go:82-131`, `processCodexSessionFile` lines 600-635). Resume pins the old day-directory so an old session stays watched (`watcher.go:98-122`); only a trailing 7-day window is fsnotify-watched to cap kqueue fd usage (`watchWindowDays`, lines 159-176).
- Warmup filtering: Claude sessions that contain only warmup/synthetic messages produce **no callback** (`claudecode/watcher.go:603-622`), so gmux should not expect an ID the instant the process starts — only after the first real user message is persisted.
- Multi-provider watch dedupes by content fingerprint keyed `providerID + "/" + sessionID` (`pkg/utils/watch_agents.go:42-99`).

## 8. specstory-mac: how the Mac app enumerates/detects agents (branch `mac-app`)

The app never reimplements provider logic — it drives the **bundled CLI binary**:

- `Provider.swift` (`specstory-mac/SpecStoryKit/Sources/SpecStoryKit/Provider.swift`): enum of 8 CLI-registry IDs (`antigravity, claude, codex, copilotide, cursor, cursoride, deepseek, droid, gemini` — no muse yet on that branch), with a normalizing `init?(providerID:)` that maps display names ("Claude Code", "Codex Cli", "Factory Droid CLI") back to IDs. `copilotide.watchableByCLI == false` (capture goes through the VS Code extension).
- Health checks = shell out: `specstory check --providers <id> --silent`, healthy iff exit code 0, 30s timeout (`AppModel+Providers.swift` `refreshProviderStatuses`).
- Binary location: `BinaryLocator.swift` — `SPECSTORY_BIN` env override, else bundled `Resources/bin/specstory_darwin_<arch>` verified against a sha256 `manifest.json`.
- Passive detection: `SessionTripwire.swift` — an **FSEvents tripwire over the 8 provider session-store roots** (`ProviderRoots.swift`): `~/.gemini/antigravity-cli/brain`, `~/.claude/projects`, `$CODEX_HOME/sessions` (live `getenv`, not ProcessInfo cache), `~/.cursor/chats`, `~/Library/Application Support/Cursor/User/globalStorage`, `~/.deepseek/sessions`, `~/.factory/sessions`, `~/.gemini/tmp`. *"Detection only: it reports that an agent wrote something, and never parses provider files. Missing roots are skipped and re-checked on a slow timer so agents installed later still get picked up."* It also decodes Claude/Droid-style encoded project dirs back to real paths by walking the filesystem (`ClaudeStyleProjectDirectory.decode`, since the dash encoding is lossy).
- Watch fleet: `WatchSupervisor.swift` — one `specstory watch --json` child per project path, LRU-capped, serial-queue callbacks, generation-tagged restart on config/auth change, crash respawn with a 3s delay/60s error window.
- Resume from the app: `AppModel+Resume.swift` — resume targets are `[claude, codex, cursor, gemini, deepseek, droid]` (*"Antigravity is source-only; Cursor IDE sessions resume through the Cursor CLI"*; copilotide/antigravity map to claude, cursoride maps to cursor). It composes `<cli> resume <agent> --session specstory://projects/<pid>/sessions/<sid>`, preferring a user-installed CLI (`/opt/homebrew/bin/specstory`, `/usr/local/bin/specstory`, `~/.local/bin/specstory`) over the bundled path, then lands the command in a real terminal via `TerminalLauncher.swift`: AppleScript into iTerm2 (if running or default ssh:// handler) else Terminal.app; on TCC denial, falls back to pasteboard + opening the terminal app. Tokens must never ride the command string (comment at top of TerminalLauncher).

## 9. Direct implications for gmux

1. **PTY is gmux's job, not SpecStory's.** SpecStory is fd-passthrough; capture is 100% store-watching. gmux's tmux panes already supply the PTY — porting means: per-agent binary resolution (§3), per-agent launch+resume argv construction (§5/§6), and store watchers for session-ID capture (§7) — or simply shelling out to `specstory run/resume` the way specstory-mac does (§8), which is the battle-tested integration surface.
2. **Binary resolution table to replicate** (defaults): `~/.local/bin/claude` → PATH → `~/.claude/local/claude`; brew/npm probing for `codex`; PATH → `~/.cursor/bin` → `~/.local/bin` for `cursor-agent`; plain PATH for `gemini`, `droid`, `deepseek`, `agy`, `muse`, `qwen`; IDE stores (not binaries) for cursoride/copilotide.
3. **Resume argv is the whole per-agent quirk surface**: flag vs subcommand vs `--conversation`, plus claude's UUID pre-validation and the IDE "reconstruct-then-open" pattern. No agent needs special env except cursor's `FORCE_COLOR=1`; codex needs `$CODEX_HOME` respected when locating sessions.
4. **Session-ID capture is asynchronous and can be silent** (warmup-only Claude sessions). Design gmux's "session detected" state to arrive from a watcher event, not from launch.
5. **No version gating exists** — a gmux `check` equivalent only needs LookPath + `--version` + identity sniff (claude's `"(Claude Code)"` substring is the one real identity check).
6. The Mac app's FSEvents tripwire over 8 store roots + `check --providers <id> --silent` health probe is a proven, cheap "which agents does this user actually use" detector gmux can copy verbatim.
