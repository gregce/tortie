# SpecStory Provider Inventory (Dimension 1)

Source of truth: `/Users/gdc/getspecstory/specstory-cli` (working tree = branch `muse-provider`; main compared via `git show`). All paths below are repo-relative to `specstory-cli/` unless absolute. Line refs are from the muse-provider working tree as of 2026-08-09.

## 0. Framework facts gmux needs

- **SPI interface**: `pkg/spi/provider.go` L61–154. Every provider implements: `Name()`, `Check(customCommand)` (version probe), `DetectAgent(projectPath)`, `GetAgentChatSession(s)`, `ListAgentChatSessions`, `ExecAgentAndWatch(projectPath, customCommand, resumeSessionID, debugRaw, cb)` (launch+watch, blocks until agent exits), `WatchAgent(ctx,…)` (watch only), `ReconstructSession`/`NativeSessionPath`/`SupportsReconstruction` (cross-agent resume), `ListAllAgentChatSessions` (global enumeration for the index).
- **Registry**: `pkg/spi/factory/registry.go` `registerAll()` L52–126. IDs on muse-provider: `claude, cursor, codex, gemini, droid, cursoride, copilotide` (+ `copilotide-insiders`, `copilotide-vscodium`, `copilotide-vscodium-insiders` registered only when that variant has ≥1 Copilot chat, L102–110), `deepseek, antigravity, muse`. Default provider = claude (L203–207).
- **Branch deltas**: `main` registry has only `claude, cursor, codex, gemini, droid, deepseek` (`git show main:…/registry.go` L62–82). muse-provider adds `cursoride`, `copilotide`×4, `antigravity`, `muse` + a shared `pkg/providers/vscode/` helper package (launcher/mint/workspace). Branch `qwen-provider-support` adds `qwen` (`pkg/providers/qwencode/`, registered as `"qwen"`).
- **Launch entrypoint**: `specstory run [provider-id] [-c/--command "<custom argv>"] [--resume <sessionID>] [--output-dir …] [--no-cloud-sync] [--debug-raw]` — `main.go` L306 (`Use: "run [provider-id]"`), flags L1559–1576. `-c` requires a provider arg (L316–322).
- **Resume entrypoint**: `specstory resume [agent] [--session <specstory:// uri | permalink | uuid>]` — `pkg/cmd/resume.go` L73–174. Cross-agent resume = `ReconstructSession` (neutral SessionData → native bytes) + write to `NativeSessionPath` + `plan.to.ExecAgentAndWatch(cwd, "", resumeSessionID, …)` (resume.go L299). Same-agent resume passes the native session id straight through.
- **Sessions index**: `~/.specstory/sessions.db` (`pkg/sessionindex/store.go` L105–107), rebuilt by `specstory reindex` via each provider's `ListAllAgentChatSessions`. Design: `docs/SESSIONS-DB.md`.
- **Neutral session format**: `pkg/spi/schema/session-data-v1.json` + `docs/SPI-SESSION-DATA-SCHEMA.md`; portability design `docs/SESSION-PORTABILITY.md`; picker `docs/RESUME-TUI.md`.
- **No ADDING-A-PROVIDER.md exists** (never did, per `git log --all --diff-filter=A`). The actual map is `docs/PROVIDER-SPI.md`.
- **NOT providers**: `opencode`, `amp`, `aider`, GitHub Copilot **CLI**. opencode/amp appear only in the skills-install matrix (`pkg/skills/agents.go` L94, L123); `.aider` only in a provenance ignore list (`pkg/provenance/fswatcher.go` L37). "copilot" support = Copilot chat inside VS Code (copilotide), an IDE watcher, not a CLI wrap.
- **Exit-code quirk**: claudecode/cursorcli/geminicli/musecode call `os.Exit(childExitCode)` when the child exits nonzero (e.g. `claude_code_exec.go` L130–134) — SpecStory mirrors the agent's exit code.
- **Custom command parsing**: all providers split `-c` strings with `spi.SplitCommandLine` (quoted-arg aware, `pkg/spi/cmdline.go`) and expand a leading `~`.

## 1. Provider matrix (launch / detect / resume / version)

| id | display name | binary (default argv[0]) | launch argv | resume argv | version probe | session store | reconstruct target? |
|---|---|---|---|---|---|---|---|
| claude | Claude Code | `~/.local/bin/claude` → PATH `claude` → `~/.claude/local/claude` → `claude` | `claude [custom args]`, inherited stdio | append `--resume <sessionID>` | `claude -v`, output must contain "Claude Code" | `~/.claude/projects/<dash-encoded realpath cwd>/<sessionID>.jsonl` | yes |
| cursor | Cursor CLI | PATH `cursor-agent` → `~/.cursor/bin/cursor-agent` → `~/.local/bin/cursor-agent` → `cursor-agent` | `cursor-agent [custom args]`, env `FORCE_COLOR=1`, SIGINT/SIGTERM forwarded | append `--resume <sessionID>` | `cursor-agent --version` | `~/.cursor/chats/<md5hex(canonical abs cwd)>/<sessionID>/store.db` (SQLite) | yes |
| codex | Codex CLI | `$HOMEBREW_PREFIX/bin/codex` → `brew --prefix`/bin/codex → `/opt/homebrew/bin/codex` → `$NVM_BIN/codex` → `npm bin -g`/codex → `$NVM_DIR/versions/node/current/bin/codex` → `codex` | `codex [custom args]` | subcommand: `codex [custom args] resume <sessionID>` | `codex --version`, fallback `codex -V` | `$CODEX_HOME/sessions` or `~/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl` (global, cwd inside file) | yes |
| gemini | Gemini CLI | PATH `gemini` (bare fallback `gemini`) | `gemini [custom args]` | append `--resume <sessionID>` (respects existing `--resume/-r/--resume=`) | `gemini --version` | `~/.gemini/tmp/<projectDir>/chats/session-*.json` (+ `logs.json`) | yes |
| droid | Factory Droid CLI | `droid` | `droid [custom args]` | append `--resume <sessionID>` | `droid --version` (LookPath first) | `~/.factory/sessions/<dash-encoded cwd>/<sessionID>.jsonl` + `<sessionID>.settings.json` | yes |
| deepseek | DeepSeek TUI | `deepseek` | `deepseek [custom args]` | append `--resume <sessionID>` | `deepseek --version` | `~/.deepseek/sessions/<uuid>.json` (global; project via `metadata.workspace`) | yes |
| antigravity | Antigravity CLI | `agy` (alias `antigravity` exists but not normally on PATH) | `agy [custom args]` | append `--conversation <conversationID>` (`-c` = most-recent, unused) | `agy --version` (bare semver) | `~/.gemini/antigravity-cli/brain/<convID>/.system_generated/logs/transcript_full.jsonl` | **no** |
| muse | Muse Code | PATH `muse` (bare fallback `muse`) | `muse [custom args]` | subcommand: `muse resume <sessionID>` | `muse --version` | `$XDG_DATA_HOME/muse/sessions` or `~/.local/share/muse/sessions/YYYY/MM/DD/<sessionID>/session.jsonl` | yes |
| qwen (branch only) | Qwen Code | PATH `qwen` (bare fallback `qwen`) | `qwen [custom args]` | append `--resume <sessionID>` | `qwen --version` | `~/.qwen/projects/<sanitized cwd>/chats/<sessionID>.jsonl` | yes (branch) |
| cursoride | Cursor IDE | IDE; opened via `cursor` shell command | `cursor <canonical projectPath>` (non-blocking; watch runs until Ctrl-C) | reconstruct writes directly into global `state.vscdb`; user opens Agents panel | no binary probe — Check = global DB exists | `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` (`cursorDiskKV` key `composerData:<id>`) | yes |
| copilotide | VS Code Copilot IDE | IDE; `code` shell command (variants: `code-insiders`, `codium`, `codium-insiders`) | `code <canonical projectPath>` via shared `vscode.OpenApp` | reconstruct writes `chatSessions/<id>.json` + index row in workspace `state.vscdb`; VS Code must fully restart | none by design (Check = workspaceStorage dir exists; no subprocess) | `~/Library/Application Support/<Code|Code - Insiders|VSCodium|VSCodium - Insiders>/User/workspaceStorage/<wsID>/chatSessions/<sessionID>.jsonl|.json` | yes |

## 2. Per-provider detail with file/line refs

### claude (`pkg/providers/claudecode/`)
- Binary resolution order: `claude_code_exec.go` L28–56.
- Launch/resume: `parseClaudeCommand` appends `--resume <id>` (L74–99); `ExecuteClaude` inherits stdio, mirrors exit code (L102–140).
- Version: `provider.go` L163–259 — runs `claude -v`, requires "Claude Code" in output; rich error taxonomy (`buildCheckErrorMessage` L112–160).
- Store: `~/.claude/projects/<encoded>/…`; encoding regex `[^a-zA-Z0-9-]` → `-`, forced leading `-`, on the **symlink-resolved** realpath (`path_utils.go` L15–26, L33–55, L85–134). Example: `/Users/sean/My Projects(1)/app` → `-Users-sean-My-Projects-1--app`.
- Watch: fsnotify on project dir, only `*.jsonl` (`watcher.go` L263, L328). Session id = filename stem (uuid).
- Reconstruct: `<newID>.jsonl` (`reconstruct.go` L104); `NativeSessionPath` = `resolveClaudeProjectDir` (dir need not exist, `path_utils.go` L33–55).

### cursor (`pkg/providers/cursorcli/`)
- Binary: `cursor_cli_exec.go` L33–58. Launch: L88–140, sets `FORCE_COLOR=1`, forwards signals, `os.Exit(code)` on child failure. Resume `--resume <id>` appended.
- Version: `provider.go` L106 `cursor-agent --version`.
- Store: `~/.cursor/chats/<ProjectHash>/<sessionID>/store.db`; `ProjectHash = md5hex(spi.GetCanonicalPath(abs(cwd)))` (`path_utils.go` L13–44). store.db tables: `blobs` (message blobs, DAG-sorted via `dag_sort.go`), `meta` (key `'0'` = hex-encoded JSON with `createdAt`) — `sqlite_reader.go` L94–165.
- md5 is one-way: reindex recovers cwd by hashing every *other* provider's known cwds (`RecoverOriginCwds`, `path_utils.go` L66–121).
- Reconstruct: `Filename = <newID>/store.db` (`reconstruct.go` L152).

### codex (`pkg/providers/codexcli/`)
- Binary discovery cascade: `codex_cli_exec.go` L41–131 (HOMEBREW_PREFIX, `brew --prefix`, `/opt/homebrew/bin/codex`, NVM_BIN, `npm bin -g`, NVM_DIR, bare).
- Launch: L246–285. Resume is a **subcommand**: `codex resume <sessionID>` (L254).
- Version: tries `--version` then `-V` (L167–207).
- Store: `$CODEX_HOME/sessions` else `~/.codex/sessions` (`path_utils.go` L10–18), date-sharded `YYYY/MM/DD/rollout-<2006-01-02T15-04-05>-<uuid>.jsonl`. First JSONL line is `type:"session_meta"` with payload `{id, timestamp, cwd}` — project matching is by that `cwd` (`agent_session.go` L26–33, L147–177). Global scan for reindex walks all rollouts (`provider.go` L1143).
- Reconstruct: filename `rollout-<ts>-<newID>.jsonl` (`reconstruct.go` L96); path `~/.codex/sessions/YYYY/MM/DD/<filename>` dated today (L105–122).

### gemini (`pkg/providers/geminicli/`)
- Binary: PATH `gemini` (`gemini_exec.go` L23–30). Launch/resume: `ensureResumeArgs` appends `--resume <id>` unless already present (L43–60).
- Version: `provider.go` L51.
- Store: `~/.gemini/tmp/<projectDir>/`; projectDir resolution strategies in order (`path_utils.go` L110–197): (1) `<basename>` dir with matching `.project_root` file (Gemini CLI ≥0.30), (2) legacy `sha256hex(canonical abs path)` dir (L40–67), (3) full scan of every `.project_root` (handles `my-project-1` suffixes). Sessions: `chats/session-*.json`; filename formats `session-<YYYY-MM-DDTHH-MM>-<8char>.json` (new) / `session-<uuid>.json` (old) (`json_parser.go` L141–174); multi-file sessions merged (`FindSessions` L320+); command history in `logs.json` (L416).
- Reconstruct: `session-<YYYY-MM-DDTHH-MM>-<newID[:8]>.json` (`reconstruct.go` L76–81); `NativeSessionPath` **creates** `~/.gemini/tmp/<name>/` with `.project_root` + `chats/` for unseen projects (L86–103).

### droid (`pkg/providers/droidcli/`)
- Binary const `droid` (`provider.go` L21). Launch/resume: `droid_exec.go` L34–66, appends `--resume <id>`.
- Version: `provider.go` L36–60 (`--version` after LookPath).
- Store: `~/.factory/sessions/<encoded cwd>/<sessionID>.jsonl`; **same dash-encoding convention as Claude Code** incl. leading dash, canonical path (`path_utils.go` L17–51, consts L70–71). Companion `<sessionID>.settings.json` carries token usage (`path_utils.go` L150–158, `parser.go` L198–204). Session ID = filename stem (`parser.go` L188).
- Reconstruct: `<newID>.jsonl` (`reconstruct.go` L82).

### deepseek (`pkg/providers/deepseektui/`)
- Binary const `deepseek`, versionFlag `--version` (`provider.go` L19–20). Launch/resume: `deepseek_exec.go` L40–82 (`--resume <id>`, repairs bare/empty flags).
- Store: `~/.deepseek/sessions/<uuid>.json` (`path_utils.go` L15–16); flat, not project-sharded; single-JSON schema `{schema_version, metadata{id,title,created_at,updated_at,message_count,total_tokens,model,workspace,mode}, messages[], system_prompt}` (`agent_session.go` L28–62). Project match = `metadata.workspace` vs projectPath. Direct lookup by `<uuid>.json` (`path_utils.go` L80–92).
- Reconstruct: `<newID>.json` (`reconstruct.go` L80).

### antigravity (`pkg/providers/antigravitycli/`)
- Binary `agy`; resume flag `--conversation <id>` (`antigravity_exec.go` L14–22, L67–92). Version `agy --version` → bare semver (`provider.go` L33–69). providerID `antigravity` (provider.go L19), display name "Antigravity CLI" (`agent_session.go` L28).
- Store: `~/.gemini/antigravity-cli/` (shares `~/.gemini` root with Gemini CLI but disjoint subtree): `brain/<conversationId>/.system_generated/logs/transcript_full.jsonl` (primary; fallback `transcript.jsonl` with double-encoded tool args), interactive index `history.jsonl`, async task output `…/logs/tasks/task-<step>.log` (`path_utils.go` L14–35, L47–110).
- Project attribution (no cwd in transcript): scrape agy's own logs for conversationId→projectId (regexes valid for agy 1.0.2–1.1.x, brittle by design), join to `~/.gemini/config/projects/<id>.json`, plus `conversation_summaries.db`; fallback = paths touched by tools (`project_mapping.go` L17–45). Format doc: `docs/ANTIGRAVITY-FORMAT.md`.
- **SupportsReconstruction = false** (`reconstruct.go` L37–38): can only resume its own sessions, cannot be a cross-agent target.

### muse (`pkg/providers/musecode/`)
- Binary `muse`; resume is a **subcommand** `muse resume <id>` (`muse_exec.go` L20, L48–67). Version `muse --version` (`provider.go` L58).
- Store: `$XDG_DATA_HOME/muse/sessions` else `~/.local/share/muse/sessions`, sharded `YYYY/MM/DD/<sessionID>/session.jsonl`; `subagent/` subdirs hold per-subagent transcripts and are pruned from enumeration; workspace root read from the first metadata line (≤256KiB header read) (`path_utils.go` L24–60, glob L230). Format doc: `docs/MUSE-FORMAT.md`.
- Reconstruct: `Filename = <newID>/session.jsonl` under today's shard (`reconstruct.go` L140–146, L158–176).

### qwen (branch `qwen-provider-support`, `pkg/providers/qwencode/`)
- Binary `qwen`; resume `--resume <id>` (`qwen_exec.go`); version `qwen --version` (`provider.go` L59); display name "Qwen Code" (L35).
- Store: `~/.qwen/projects/<SanitizeQwenCwd(cwd)>/chats/<sessionID>.jsonl` (+ ignored `<sessionID>.runtime.json` siblings). Sanitizer: every char outside `[a-zA-Z0-9]` → `-`, applied to the raw cwd (**no** symlink resolution, **no** forced leading dash — differs from Claude/droid) (`path_utils.go` `SanitizeQwenCwd`; `jsonl_parser.go` L114–127, L227–247). Records are self-describing envelopes `{uuid, parentUuid, sessionId, timestamp, type, cwd, version}` (L20–48); resumed sessions append to the same file.

### cursoride (`pkg/providers/cursoride/`)
- IDE provider. Check = global DB exists, no version (`provider.go` L33–48). DBs: macOS `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`, Linux `~/.config/Cursor/User/globalStorage/state.vscdb`; workspaceStorage under the same `User/` (`path_utils.go` L25–27, L52–59).
- Session data: `cursorDiskKV` rows keyed `composerData:<composerID>`; composer discovery via `ItemTable` keys `composer.composerData` (Cursor 2 `allComposers` / Cursor 3 `selectedComposerIds`) and `workbench.panel.composerChatViewPane*` (`database.go` L47–70, L120, L201–235).
- ExecAgentAndWatch: opens IDE via `cursor <path>` (shared `vscode.OpenApp`), best-effort, then watches `state.vscdb`/`-wal`/`-shm` until Ctrl-C (no child process to wait on) (`provider.go` L457–480, `watcher.go` L47, L267).
- Resume: `ReconstructSession` INSERT OR REPLACEs a `composerData:` row (+ index entry) directly in the global DB inside one transaction (`database.go` L325–341, `reconstruct.go` L30); user is told "open the Agents panel" (`provider.go` L466–468).

### copilotide (`pkg/providers/copilotide/` + shared `pkg/providers/vscode/`)
- Variant table (`provider.go` L34–68): `copilotide`/VS Code/`Code`/`code`/"Visual Studio Code"; `copilotide-insiders`/`Code - Insiders`/`code-insiders`; `copilotide-vscodium`/`VSCodium`/`codium`; `copilotide-vscodium-insiders`/`VSCodium - Insiders`/`codium-insiders`. Name = `<AppName> Copilot IDE` (L91–92). Non-stock variants only register when `HasAnyChatSessions(DataDirName)` (registry.go L102–110).
- Store: `<config root>/<DataDirName>/User/workspaceStorage/<workspaceID>/chatSessions/<sessionID>.jsonl` (preferred) or `.json` (`path_utils.go` L15–27, L81–83; `loader.go` L90–94). Workspace↔project match via `workspaceStorage/<id>/workspace.json` folder URI (`provider.go` L420, L462–475; `vscode/workspace.go`).
- Check: storage dir presence only; deliberately no `code --version` subprocess (`provider.go` L96–126).
- Launch: `vscode.OpenApp(appName, variant.Command, custom, projectPath)` — canonicalizes path, non-blocking spawn, `ErrCLIMissing` when the shell command isn't installed (`vscode/launcher.go` L44–79).
- Resume: reconstructed session file + a `chat.ChatSessionStore.index` entry in the workspace `state.vscdb`; **VS Code must be fully quit and restarted** (reload is insufficient) (`reconstruct.go` L57–64); never-opened projects get a minted workspace entry (`vscode/mint.go`, `NewProvider` comment L64–70).

## 3. Session-store cheat sheet for gmux detection (scan these paths)

```
~/.claude/projects/<dash-enc cwd>/<uuid>.jsonl                        # claude
~/.cursor/chats/<md5(cwd)>/<uuid>/store.db                            # cursor-agent
~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl   ($CODEX_HOME honored)  # codex (cwd inside session_meta line 1)
~/.gemini/tmp/<name|sha256(cwd)>/chats/session-*.json (+.project_root)# gemini
~/.factory/sessions/<dash-enc cwd>/<uuid>.jsonl (+ .settings.json)    # droid
~/.deepseek/sessions/<uuid>.json               (workspace in metadata)# deepseek
~/.gemini/antigravity-cli/brain/<convID>/.system_generated/logs/transcript_full.jsonl  # antigravity
~/.local/share/muse/sessions/YYYY/MM/DD/<id>/session.jsonl ($XDG_DATA_HOME honored)    # muse
~/.qwen/projects/<sanitized cwd>/chats/<id>.jsonl                     # qwen (branch)
~/Library/Application Support/Cursor/User/globalStorage/state.vscdb   # cursor IDE (composerData:<id>)
~/Library/Application Support/<Code|Code - Insiders|VSCodium|VSCodium - Insiders>/User/workspaceStorage/<ws>/chatSessions/<id>.{jsonl,json}  # copilot IDE
```

## 4. Gotchas encoded in SpecStory that gmux must not re-learn the hard way

1. Three distinct cwd→dirname encodings: Claude/droid (dash-encode **realpath**, leading dash), qwen (dash-encode raw cwd, alnum-only whitelist, no leading-dash guarantee), cursor (md5 of canonical path), gemini (basename + `.project_root` marker, sha256 legacy).
2. Codex and muse resume via **subcommand** (`resume <id>`); everyone else via a flag (`--resume`, antigravity `--conversation`).
3. Codex/deepseek/antigravity/muse stores are global (not project-keyed); project identity comes from inside the session file (or, for antigravity, scraped logs).
4. macOS case-insensitivity: every hash/encoding uses `spi.GetCanonicalPath` first; gmux must canonicalize the same way or hashes won't match.
5. Cursor CLI watcher must tolerate SQLite WAL churn; Cursor IDE session writes land in `state.vscdb-wal` and the file disappears on last-connection close.
6. Antigravity is resume-source-only (`SupportsReconstruction() == false`); its project mapping depends on log-line regexes that Google may break at any release.
7. Copilot IDE resumed sessions are invisible until VS Code fully restarts (in-memory index flushed on shutdown).
8. `CODEX_HOME` and `XDG_DATA_HOME` env overrides are honored (codex, muse); everything else is hard-anchored to `$HOME`.
