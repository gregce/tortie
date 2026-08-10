# SpecStory Branch Deltas — Provider Knowledge Not on `main` (Dimension 2)

Research date: 2026-08-09. Source repo: `/Users/gdc/getspecstory` (read-only; working tree = `muse-provider`).
All quotes taken via `git show <branch>:<path>` or direct reads of the checked-out `muse-provider` tree.

## 1. Branch topology (the headline)

`main` is the *stale release line* (last commit `25a957a`, 2026-05-19, changelog tops out at **v1.13.0 2026-05-18**). `dev` is the live integration line (354 commits ahead of main, changelog at **v2.8.0 2026-08-07**). Releases v2.0.0–v2.8.0 exist only on `dev` and its descendants. Any "diff vs main" is dominated by the dev delta; the true per-provider deltas are vs `dev`.

| Branch | vs main | vs dev | Status |
|---|---|---|---|
| `dev` | +354 / -0 | — | Live integration branch |
| `muse-provider` | +359 / -0 | **+5 / -0** | **In-flight** (PR #269, per commit d27c3a7 message). Adds the Muse Code provider. |
| `qwen-provider-support` | +358 / -0 | **+4 / -0** | **In-flight** (PR #268, per commit dc537d4 message). Adds the Qwen Code provider. |
| `feat/antigravity-cli-provider` | +3 / -0 | +0 / -351 | **Merged into dev** (all 3 commits reachable from dev); NOT on main. Dev then evolved it heavily (+2,455/-457 lines beyond the branch tip in `pkg/providers/antigravitycli` + format doc). |
| `feat/deepseek-provider` | +3 / -12 | +3 / -366 | **Stale / merged-in-substance.** The base commit `78b7287 feat: add DeepSeek TUI provider` (KiBlazer, PR #218) IS in main. The 3 tip commits (`ed297e4`, `f74d4b9`, `a31dc7a`) are review fixes that were re-applied on dev as `6c6f211 Fix DeepSeek provider review issues` + renames (`git cherry` shows no patch-equivalents because the provider dir was renamed `providers/deepseek` → `providers/deepseektui` on dev via `a1c596c`). Nothing on this branch is needed anymore; dev's deepseektui is a superset (dev adds reconstruct.go, watcher.go, +3,475 lines the branch lacks). |
| `origin/feat/pi-provider` | +241 / -0 | **+19 / -0** | **In-flight, remote-only.** Adds a Pi agent provider (v1: read-only — no run/watch/resume). |
| `origin/review/pr218-deepseek-fixes` | — | — | Same 3 commits as feat/deepseek-provider tip; historical review branch. |

Provider registry deltas (`specstory-cli/pkg/spi/factory/registry.go`):

- **main registers 6 providers**: `claude`, `cursor`, `codex`, `gemini`, `droid`, `deepseek` (main registry lines 61–82).
- **dev registers 12+**: those six **plus** `cursoride`, `copilotide` + variants (`copilotide-insiders`, `copilotide-vscodium`, `copilotide-vscodium-insiders` — `pkg/providers/copilotide/provider.go:35,43,54,62`), and `antigravity` (dev registry line 116).
- **muse-provider adds** `muse` (branch registry diff: `r.providers["muse"] = museProvider`).
- **qwen-provider-support adds** `qwen` (branch registry diff: `r.providers["qwen"] = qwenProvider`).
- **feat/pi-provider adds** `pi` (branch registry diff: `r.providers["pi"] = piProvider`).

So the full provider roster gmux should plan for = main 6 + dev's cursoride/copilotide×4/antigravity + branch-only muse, qwen, pi.

---

## 2. MUSE provider — exists ONLY on `muse-provider` (dev+5)

Commits: `a372601` (phase A: format doc) → `15cfba6` (phase B: parser/markdown) → `137a085` (phase C: provider/watcher/exec/reconstruction/wiring) → `9156a77` (phase E: verification fixes) → `d27c3a7` (stream-id settling fix from PR #269 review).

New package: `specstory-cli/pkg/providers/musecode/` (~5,051 insertions vs dev). New doc: `specstory-cli/docs/MUSE-FORMAT.md`.

### Identity & binary
- Display name: `"Muse Code"` — `pkg/providers/musecode/provider.go:33-35`.
- Registry ID: `muse`. Meta's terminal coding agent, "powered by Muse Spark models" — `docs/MUSE-FORMAT.md:3`. Upstream repo cited as `https://github.com/facebook/muse-code` (README diff).
- Default binary: `muse` on PATH — `muse_exec.go:23-30` (`getDefaultMuseCommand`... `return "muse"`).
- Config override: `muse_cmd = "muse"` under `[providers]` — `pkg/config/config.go` diff (`MuseCmd string \`toml:"muse_cmd"\`` + `case "muse": return c.Providers.MuseCmd`).
- Version check: `muse --version` — `provider.go:58`. Version floor **0.1.0+** ("verified empirically against Muse Code 0.1.0 (build 427a430436)" — `MUSE-FORMAT.md:3`; README table says `0.1.0+`).
- TUI accent color: `#0866FF` "Meta blue" — `pkg/cmd/session_tui_browser.go` diff.

### Session store (on disk)
`MUSE-FORMAT.md:5-18`:
```
~/.local/share/muse/sessions/YYYY/MM/DD/<session-id>/
├── session.jsonl        # the transcript (append-only event log)
├── cron.db / goals.db   # not transcripts
├── tool-outputs/        # spill dir for large tool outputs
└── subagent/<subagent-id>/session.jsonl   # one transcript per spawned subagent
```
- XDG-aware: `XDG_DATA_HOME` wins when set, else `~/.local/share/muse/sessions` — `path_utils.go:50-60` (`GetMuseSessionsDir`).
- Config lives at `~/.config/muse/` (auth.json, settings.json, trust.json) — `MUSE-FORMAT.md:17`.
- Store is **global and date-sharded like Codex, NOT project-scoped**: project association = `workspace_root` inside the first (metadata) record of each transcript — `MUSE-FORMAT.md:16`, `provider.go:143-147` ("this is a content question ... rather than a 'does a directory exist' question").
- Detection reads only the first 256KB of each transcript to find `workspace_root` (`path_utils.go:33-37` `maxHeaderBytes`).
- Session lookup by ID is a glob, no file reads: `sessions/*/*/*/<sessionID>/session.jsonl` — `path_utils.go:229-231`.
- Subagent transcripts (`subagent/` path segment) are never independent sessions — `path_utils.go:101-107` (`IsSubagentTranscript`), pruned during walks (`path_utils.go:88-90`).

### Launch / resume
- Launch: exec `muse` interactively with inherited stdio — `muse_exec.go:78-83`.
- Resume: **subcommand, not flag**: `muse resume <session-uuid>` — `muse_exec.go:19-20`: "`resumeSubcommand` is how Muse Code continues a session: `muse resume <id>`, a subcommand rather than a flag (like Codex, unlike Qwen's --resume)". Also `muse --last` and headless `muse exec "<prompt>"` exist (`MUSE-FORMAT.md:18`).
- `ensureResumeArgs` (`muse_exec.go:48-67`) splices the id after an existing `resume` subcommand or appends `resume <id>`.
- Cross-agent resume target: **yes** — `reconstruct.go` emits a minimal event-sourced transcript ("metadata record plus run started/assistant/terminal chains with monotonic sequences and microsecond timestamps" — commit `137a085` message); `SupportsReconstruction() == true` (`reconstruct.go:179-181`).

### Transcript format (what a native reader must know)
- Event-sourced JSONL; each line is an envelope `{schema_version, id, stream:{kind,id}, sequence, recorded_at, record_type, payload_type, payload}` — `MUSE-FORMAT.md:20-38`.
- `recorded_at` is **microseconds** since epoch — `MUSE-FORMAT.md:40`.
- **Critical filter**: only records whose `stream.id` equals the session id are the session's own conversation; subagent task-runs are recorded in the parent file under a different stream id and must be excluded — `MUSE-FORMAT.md:41`.
- Session id settling order (fix in `d27c3a7`): directory name (authoritative, store is `<session-id>/session.jsonl`) → metadata record's stream → first held-back record's stream → filename stem.
- Conversation = `payload_type: runtime.session`, `payload.kind: "run"`; one exchange per `run_id`, opened by event `started` (`{prompt}` = user message), closed by `terminal`. Other event kinds: `reasoning_committed` (usually empty text — reasoning is encrypted for Meta provider), `assistant_message_committed`, `assistant_tool_calls_committed` (args is a **JSON string**), `tool_result_batch_committed` (fold by `tool_call_id`; `bash` result text is itself a JSON object string with `exit_code`/`output`), `model_completed` (usage tokens), `todo_snapshot_updated` — `MUSE-FORMAT.md:52-66`.
- Watcher: bounded trailing date window, `watchWindowDays = 7` (+today ⇒ up to 8 date dirs watched), explicitly citing "the Codex fd-exhaustion lesson, changelog v2.6.0" — `watcher.go:33-44`, `MUSE-FORMAT.md:84`.

---

## 3. QWEN provider — exists ONLY on `qwen-provider-support` (dev+4)

Commits: `b8512bc` (full provider with resume) → `6f6a674` (empirical hardening: compaction/slash-commands/subagents/version floor) → `2fe6994` (tool-render polish) → `dc537d4` (PR #268 review fixes).

New package: `specstory-cli/pkg/providers/qwencode/` (~3,690 insertions vs dev).

### Identity & binary
- Display name: `"Qwen Code"` — `pkg/providers/qwencode/provider.go:34-35` (via `git show qwen-provider-support:...`).
- Registry ID: `qwen`. Upstream: `https://github.com/QwenLM/qwen-code` ("QwenLM's Gemini CLI fork" — commit `b8512bc`).
- Default binary: `qwen` on PATH — `qwen_exec.go:20-25`.
- Config override: `qwen_cmd = "qwen"` under `[providers]` — config.go diff (`QwenCmd`, `case "qwen"`).
- Version check: `qwen --version`. Version floor **0.21.0+** (changelog diff), empirically verified: "npm installs of qwen-code 0.21.0 and 0.20.1 both write the identical JSONL envelope... Versions before ~0.21.x omit the provenance field, which the parser already treats as a real record" — commit `6f6a674`.
- TUI accent color: `#615CED` violet — session_tui_browser.go diff.

### Session store (on disk)
- `~/.qwen/projects/<sanitized-cwd>/chats/<session-id>.jsonl` — `docs/PROVIDER-SPI.md` diff row; `path_utils.go:72-78` (`GetQwenProjectsDir` → `~/.qwen/projects`).
- **Project-scoped by sanitized cwd**: `SanitizeQwenCwd` (`path_utils.go:54-70`) — "every character outside [a-zA-Z0-9] becomes '-'. Example: /Users/alice/my app -> -Users-alice-my-app. This mirrors Qwen Code's own sanitizeCwd, which applies the replacement to the process cwd verbatim (no symlink resolution)." Discovery tries the canonical (symlink-resolved) path first, raw absolute path as fallback (`candidateProjectDirNames`, `path_utils.go:86-100`).
- One session = one JSONL file; **`qwen --resume`/`--continue` appends to the same file** — no cross-file merging (unlike Gemini CLI's split session files) — `jsonl_parser.go` QwenSession doc comment.
- A `.runtime.json` file churns next to transcripts and is ignored by the watcher (commit `b8512bc`).

### Launch / resume
- Launch: exec `qwen` interactively with inherited stdio — `qwen_exec.go:74-96`.
- Resume: **flag**: `qwen --resume <session-id>` (also `-r`; `--resume=` form repaired in place) — `qwen_exec.go:39-70` (`ensureResumeArgs`).
- Cross-agent resume target: **yes** — `reconstruct.go:114-116` `SupportsReconstruction() == true`; reconstruction writes a uuid/parentUuid-chained JSONL to `~/.qwen/projects/<sanitized-cwd>/chats/<new-uuid>.jsonl` (`reconstruct.go:75-78, 83-108`) that "`qwen --resume <id>` accepts (verified empirically against Qwen Code 0.21.7)" — commit `b8512bc`.

### Transcript format
- Each line: envelope `{uuid, parentUuid, sessionId, timestamp, type, subtype, provenance, cwd, version, gitBranch, model}` wrapping a Gemini-style `message` (`role` user/model, typed `parts`: text / thought / functionCall / functionResponse), plus `toolCallResult` and `usageMetadata` — `jsonl_parser.go:44-115` type docs.
- Record types: `user` (provenance `real_user`; subtype `mid_turn_user_message`; system-injected notifications skipped), `assistant`, `tool_result`, `system` (skipped — includes subtype `slash_command` and `chat_compression`).
- Empirical findings (commit `6f6a674`): subagent delegations do NOT create separate files (inline functionCall/tool_result in parent); compaction appends a `chat_compression` system record and never rewrites the file (append-only holds); slash commands never appear as user turns.
- Watcher: fsnotify await-chain `~/.qwen → projects → <sanitized-cwd> → chats` so fresh installs are picked up — `watcher.go:66-70`.

---

## 4. ANTIGRAVITY provider — merged into `dev`, absent from `main`

The `feat/antigravity-cli-provider` branch (3 commits: `7b205db` Add provider, `8cadb3f` Map sessions to projects from logs, `4ebeccb` review fixes) is fully contained in dev; dev then substantially evolved it (tool-rendering rewrite, SPI update, min-version bump `5ff98dc`, Windows path handling `f9d3e73`, cwd 3rd-level fallback `195266a`, and the 553-line `docs/ANTIGRAVITY-FORMAT.md` which does NOT exist on the feat branch). **No knowledge exists only on the feat branch — dev supersedes it.**

Key facts (dev / muse-provider tree):
- Registry ID `antigravity`, display "Antigravity CLI" (Google). Version floor **1.1.5+** — `docs/ANTIGRAVITY-FORMAT.md:9-10`.
- Default binary: **`agy`** ("an `antigravity` alias exists but is not normally on PATH") — `pkg/providers/antigravitycli/antigravity_exec.go:14-17`. Config key `antigravity_cmd = "agy"`.
- `agy --version` prints a bare semver — `provider.go:34`.
- Data root: `~/.gemini/antigravity-cli/` — **shares `~/.gemini/` with Gemini CLI but never overlaps** — `path_utils.go:13-18`. Project mapping: `~/.gemini/config/projects/<projectId>.json` maps projectId → workspace path (`ANTIGRAVITY-FORMAT.md` §1 tree).
- Transcripts parsed from `brain/<conversationId>/.system_generated/logs/transcript_full.jsonl` (primary; fallback `transcript.jsonl`) — `path_utils.go:19-34, 83-102`.
- Resume: `agy --conversation <id>` (`resumeFlag = "--conversation"`; `-c` = most recent) — `antigravity_exec.go:18-22`, `ensureResumeArgs`.
- **Cannot be a resume TARGET**: `SupportsReconstruction() == false` — `reconstruct.go:23-39`: "On resume, `agy` rebuilds conversation state from the per-conversation SQLite store (conversations/<id>.db, protobuf step payloads) — NOT from the plaintext transcript this provider parses". gmux should treat antigravity as launch/observe/resume-native-sessions only; cross-agent reconstruction INTO antigravity is impossible today.

---

## 5. DEEPSEEK provider — on `main` AND `dev`; the feat branch is dead history

- Shipped in **v1.13.0** (main changelog: "supports DeepSeek TUI (i.e. `deepseek-tui`) for sessions created from DeepSeek TUI version `0.8.39` or higher... Thank you to KiBlazer for the contribution (PR #218)").
- `feat/deepseek-provider` tip commits (`ed297e4` tool_use_id matching/formatted markdown/deterministic timestamps, `f74d4b9` analytics/test parity, `a31dc7a` ProviderInfo.ID → "deepseek-tui") were folded into dev via `6c6f211`/rename `a1c596c`; branch dir is the old `pkg/providers/deepseek/`, dev's is `pkg/providers/deepseektui/`. The branch is 12 behind main and adds nothing dev lacks — dev's version is +3,475 lines richer (adds `reconstruct.go`, `watcher.go`, provider/exec tests).
- Dev facts gmux needs: registry ID `deepseek`; default command **`deepseek`** — `pkg/providers/deepseektui/provider.go:19` (`defaultCommand = "deepseek"`); config `deepseek_cmd`; store `~/.deepseek/sessions/*.json` — `path_utils.go:15-31`; resume flag `--resume <id>` — `deepseek_exec.go:39-60`; **is** a cross-agent resume target on dev (`reconstruct.go:97-99` `SupportsReconstruction() == true` — "so `deepseek --resume <id>` can continue the conversation", `reconstruct.go:22`). Note main's copy has NO reconstruct/watch parity — dev only.

---

## 6. BONUS: `origin/feat/pi-provider` — unreleased provider, remote branch only (dev+19)

Commits `b10e137 feat(cli): add Pi agent provider` … `3da71a2` (19 total, incl. two dev merges). Package `pkg/providers/piagent/` (~3,005 insertions). Registered as `pi`.

- Store: `~/.pi/agent/sessions/--<encoded-cwd>--/<timestamp>_<uuid>.jsonl` — PROVIDER-SPI.md diff row.
- Cwd encoding mirrors pi's session-manager.js: strip one leading `/` or `\`, replace every `/ \ :` with `-`, wrap in `--…--` (e.g. `/Users/jane/proj` → `--Users-jane-proj--`) — `piagent/path_utils.go:55-71` (`EncodeCwd`).
- Env overrides honored: `PI_CODING_AGENT_DIR` (sessions under `<dir>/sessions/--<encoded-cwd>--/`) and `PI_CODING_AGENT_SESSION_DIR` (**flat** layout — files directly in the dir, scoping must filter by header cwd) — `path_utils.go:11-40`.
- **v1 scope is read-only**: "pi: %s not yet supported for the pi provider (v1 supports sync, list, search, reindex, check, and detect)" — `provider.go:27`; `ExecAgentAndWatch` (`specstory run pi`), `WatchAgent`, `ReconstructSession`, `NativeSessionPath` all return not-supported (`provider.go:160-177`). So pi sessions can be detected/parsed but pi cannot yet be launched, watched, or used as a resume source/target through SpecStory.
- Transcript features handled: compaction entries (`firstKeptEntryId` read from top level; latest compaction wins), branching, `bashExecution` details, v1 legacy format (testdata fixtures: `compaction.jsonl`, `branching.jsonl`, `v1_legacy.jsonl`, etc.).

---

## 7. Resume-target matrix (as of these branches)

`specstory resume` reconstructs cross-agent via each provider's `ReconstructSession` (`pkg/cmd/resume.go:80` — "Resuming into a different agent reconstructs the conversation into that agent's native format first"). Providers implementing `ReconstructSession` on dev + branches: claudecode, codexcli, cursorcli, cursoride, copilotide, geminicli, droidcli, deepseektui, **musecode** (branch), **qwencode** (branch), antigravitycli (stub — declines).

| Agent | Launch (source) | Native resume arg | Resume target (reconstruct into) |
|---|---|---|---|
| claude / cursor / codex / gemini / droid | main+dev | (per provider) | yes (dev) |
| deepseek (`deepseek`) | main+dev | `--resume <id>` | yes (dev only) |
| antigravity (`agy`) | dev | `--conversation <id>` | **no** (SQLite/protobuf store) |
| cursoride / copilotide×4 | dev | opens IDE, watch until Ctrl-C | yes (dev) |
| muse (`muse`) | muse-provider branch | `muse resume <uuid>` (subcommand) | yes |
| qwen (`qwen`) | qwen branch | `--resume <id>` | yes |
| pi (`pi`) | feat/pi-provider branch | — (not yet) | no (v1) |

## 8. Actionable notes for gmux

1. Treat `dev` (not `main`) as the authority for provider knowledge; main is 3 months stale and lacks antigravity, cursoride, copilotide, and all v2.x resume/search/index machinery (`session.db` via `specstory reindex`, resume TUI, cloud resume, secret redaction — all dev-only).
2. Muse and Qwen are fully-built but **unmerged** (PRs #269 / #268); if gmux ships native muse/qwen support before those merge, the branch code above is the only reference — especially Muse's stream-id filter and Qwen's cwd sanitization, which are the two easy-to-get-wrong parts.
3. Antigravity can never be a reconstruction target with current knowledge — gmux's "resume in X" UI should grey it out as a target, mirroring `SupportsReconstruction()`.
4. Watch-implementation lesson encoded twice (Codex fix `0047fd6`/`47a9874`, Muse `watchWindowDays=7`): never fsnotify-watch a whole date-sharded history tree — bound to a trailing window.
5. `feat/deepseek-provider` and `feat/antigravity-cli-provider` are historical; do not mine them — dev supersedes both.
