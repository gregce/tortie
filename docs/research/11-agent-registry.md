# 11 — The gmux Agent Registry (synthesized from SpecStory)

> **SUPERSEDED IN PART — read `docs/research/22-resume-audit.md` first.** Every
> `resume` claim in this document was re-audited hands-on on 2026-08-10/11 and
> **nine of the ten launchable rows were wrong**, two of them fatally (pi's "no
> resume mechanics exist" and deepseek's `--resume`, which is a subcommand and
> exits RC=2). The root cause is structural and worth naming before you read
> another line: **this document was mined from specstory-cli, which is a
> CAPTURE tool.** It knows where each agent WRITES its transcript and has never
> needed to resume anything, so its store paths are trustworthy and its
> *absences* prove nothing. The store halves below are still good; the resume
> halves are corrected in research 22 and in `src/main/agents/registry.ts`.

**Sources:** the three mining reports over `/Users/gdc/getspecstory` (read-only; working tree = `muse-provider`):
`docs/research/11-specstory-provider-inventory.md` (providers), `docs/research/11-specstory-branch-deltas.md` (branch deltas), `docs/research/specstory-d3-detection-launch.md` (detection + launch mechanics).
SpecStory ground truth lives in `specstory-cli/pkg/spi/` (SPI), `pkg/spi/factory/registry.go:52-126` (registry), `pkg/providers/*` (per-agent), and `docs/PROVIDER-SPI.md` / `SESSION-PORTABILITY.md` / `MUSE-FORMAT.md` / `ANTIGRAVITY-FORMAT.md`.

---

## 1. Narrative summary

### What SpecStory supports, and how much to trust each entry

SpecStory's CLI wraps every agent the same way: it **execs the agent with inherited stdio (no PTY anywhere — zero pty deps in go.mod)** and captures sessions entirely by **watching the agent's on-disk store in parallel**. That is exactly the right shape for gmux: the terminal side is gmux's tmux pane; everything SpecStory knows is the *around-the-terminal* knowledge — binary locations, version identity probes, resume argv, and session-store path math.

| Agent | SpecStory status | Confidence for gmux |
|---|---|---|
| **claude** (Claude Code) | main (v1.13.0) + dev; full exec/watch/reconstruct | **HIGH** — richest provider, multi-location probe, resume `--resume <uuid>` |
| **cursor** (Cursor CLI) | main + dev; full | **HIGH** — SQLite store, md5(cwd) dir, `FORCE_COLOR=1` quirk |
| **codex** (Codex CLI) | main + dev; full | **HIGH** — 7-step binary probe, `codex resume <id>` subcommand, `CODEX_HOME` honored |
| **gemini** (Gemini CLI) | main + dev; full | **HIGH** — 3-tier project-dir resolution (`.project_root` marker → sha256 legacy → scan) |
| **droid** (Factory Droid) | main + dev; full | **HIGH** — Claude-identical dash-encoding, sidecar `.settings.json` token usage |
| **deepseek** (DeepSeek TUI) | main = read/launch only; **dev adds reconstruct + watcher** (+3,475 lines, dir renamed `providers/deepseek` → `providers/deepseektui`) | **HIGH** — flat global store, workspace inside `metadata.workspace` |
| **antigravity** (`agy`) | **dev-only**, not on main (branch `feat/antigravity-cli-provider` merged into dev, then evolved +2,455/−457) | **MEDIUM** — launch/resume solid; project attribution is fragile log-regex scraping; **cannot be a cross-agent resume target** |
| **cursoride** (Cursor IDE) | dev-only | **MEDIUM** — IDE, not a terminal CLI; resume = row-insert into global `state.vscdb` |
| **copilotide** ×4 (VS Code / Insiders / VSCodium / VSCodium-Insiders Copilot chat) | dev-only; variants registered only if that app has chats | **MEDIUM** — IDE watcher; there is **no Copilot CLI provider** in SpecStory |
| **muse** (Muse Code) | **branch-only**: `muse-provider` = dev+5, in-flight PR #269 | **MEDIUM** — complete (exec, `muse resume <id>` subcommand, reconstruct target, MUSE-FORMAT.md), just unmerged |
| **qwen** (Qwen Code) | **branch-only**: `qwen-provider-support` = dev+4, in-flight PR #268 | **MEDIUM** — verified against qwen 0.21.7; empirical floor 0.21.0+ (pre-0.21 omits `provenance`) |
| **pi** (Pi) | **remote-only** `origin/feat/pi-provider` = dev+19, unreleased; **specstory-cli's v1 provider is READ-ONLY** — its run/watch/resume return "not yet supported". That is a fact about specstory-cli, **not about pi**. | **HIGH** (corrected 2026-08-11) — binary is `pi`, `pi -v` prints 0.84.1, and `pi --session-id <id>` is an idempotent launch-and-resume verified end-to-end in tmux |

**Not providers, despite appearances:** `opencode`, `amp`, `aider` exist only in SpecStory's skills matrix (`pkg/skills/agents.go:94,123`) and provenance-ignore lists — SpecStory cannot launch, watch, or resume them. "Copilot" in SpecStory means *Copilot chat inside VS Code* (an IDE watcher), never a `copilot` terminal binary.

### Branch-only provider picture (as of 2026-08-09)

- **main is stale** (25a957a, 2026-05-19, v1.13.0; 6 providers: claude, cursor, codex, gemini, droid, deepseek). **dev is the live line** (+354 commits, v2.8.0 2026-08-07) and adds cursoride, copilotide×4, antigravity, plus deepseek reconstruct/watch.
- **muse**: PR #269 (`muse-provider`, dev+5). **qwen**: PR #268 (`qwen-provider-support`, dev+4). Both expected to land; gmux should treat them as first-class.
- **antigravity**: on dev, not main; resume works via `agy --conversation <id>` but `SupportsReconstruction()==false` (agy resumes from protobuf-in-SQLite `conversations/<id>.db`, not the plaintext transcript).
- **deepseek**: shipped on main for read/launch; dev's copy is the one to model (adds reconstruct + watcher).
- **pi**: bonus discovery; unreleased and read-only *in specstory-cli v1*. pi ITSELF has the simplest resume in the set — `pi --session-id <id>` both creates and resumes, so launch argv === resume argv (research 22 §1.3).

### Cross-cutting mechanics gmux must internalize

1. **Five cwd→store encodings.** claude/droid: dash-encode the *case-correct realpath* (`[^a-zA-Z0-9-]`→`-`, leading dash). qwen: character substitution (`[^a-zA-Z0-9]`→`-`) on the **realpath** — NOT a hash and NOT verbatim; a symlinked launch dir keys on its target (corrected, research 22 §1.3). cursor: `md5hex(verbatim cwd, no trailing slash)` — one-way; you cannot recover a cwd from the dir name. gemini (current): the cwd **basename** plus a `.project_root` marker holding the absolute path, so dir → cwd IS recoverable; gemini (legacy): `sha256(canonical cwd)`. **Always canonicalize first.**
2. **Resume is a *subcommand* for codex, muse and DEEPSEEK** (`codex resume <id>`, `muse resume <id>`, `deepseek resume <id>` — `deepseek --resume <id>` exits RC=2, corrected); a **flag** for claude/cursor/gemini/droid/qwen (`--resume <id>`); a *different flag* for antigravity (`--conversation <id>`); and for **pi** the same `--session-id <id>` it launches with.
3. **Global vs per-project stores.** codex/deepseek/antigravity/muse/pi stores are global; project identity lives *inside* the session file (codex: line-1 `session_meta.cwd`; muse: `workspaceRoot` in first record; deepseek: `metadata.workspace`; antigravity: scraped logs — brittle).
4. **Session-ID capture is asynchronous.** SpecStory learns the new session's ID from the store watcher's *first callback* (`lastRunSessionID`, `main.go:475-482`), never from the terminal stream. gmux's detection service needs the same watcher, bounded like SpecStory's (7-day fsnotify window on date-sharded stores — the Codex fd-exhaustion lesson). **CORRECTED (research 22 §2.12): claude is not alone in allowing pre-assignment.** claude, gemini and pi all pre-assign by flag (`--session-id`), and cursor pre-assigns by side command (`cursor-agent create-chat`) — four of ten, not one. specstory harvests every id asynchronously, so nothing in its code distinguishes "there is no id yet" from "there is no way to pre-assign an id"; this document inherited that flattening, and gmux's `buildLaunchSpec` then defaulted the flattened agents into a store-watch branch nobody had implemented.
5. **No semver gating anywhere** — version commands are *identity probes* (`claude -v` output must contain "(Claude Code)"; droid strips ANSI and takes the last line; codex tries `--version` then `-V`). The "floors" (qwen 0.21.0+, antigravity 1.1.5+, deepseek 0.8.39+, muse 0.1.0+) are documented/empirical, not enforced.
6. **Env is inherited wholesale**; the sole injection is `FORCE_COLOR=1` for cursor-agent. Honored overrides: `CODEX_HOME`, `XDG_DATA_HOME` (muse), `PI_CODING_AGENT_DIR`/`PI_CODING_AGENT_SESSION_DIR` (pi).
7. **User command override precedence** (worth mirroring in gmux settings): explicit `-c` argv → per-provider config key (`[providers] <id>_cmd` in TOML) → detected default; tokenized with quote/escape support and tilde-expansion on argv[0].
8. **Registry default quirk to avoid:** SpecStory's bare `specstory run` picks the *alphabetically first* provider id (`main.go:341-348`) — which is `antigravity` on dev — even though `GetDefault()` returns claude. gmux must default explicitly (claude).

---

## 2. THE REGISTRY

Machine-readable. Conventions: `~` = user home; `<...>` = template slot; `$VAR` = environment variable; `"UNVERIFIED"` marks fields SpecStory's code did not answer. Extra fields beyond the requested schema: `status` (where the provider lives in SpecStory's branch topology), `kind` (`cli` = tmux-launchable, `ide` = app watcher, not launchable in a pane), and `reconstructionTarget` (can cross-agent resume *write into* this store). `iconKey` maps to `src/renderer/assets/agents/<key>.svg`; `null` = no logo shipped yet. `defaultHotkeyHint` values are **gmux proposals** (mnemonic letters), not SpecStory-derived.

```json
{
  "$schema": "gmux-agent-registry-v1",
  "generatedFrom": "specstory-cli @ /Users/gdc/getspecstory (main, dev, muse-provider, qwen-provider-support, feat/pi-provider), 2026-08-09",
  "sharedRules": {
    "cwdCanonicalization": "Always resolve cwd via case-correct realpath (spi.GetCanonicalPath) before any store-path math; qwen is the sole provider hashing the verbatim (non-realpathed) cwd.",
    "commandOverridePrecedence": ["user-supplied argv (settings)", "per-agent custom command (mirror SpecStory TOML [providers] <id>_cmd)", "detected default from pathProbe"],
    "sessionIdCapture": "Async, from a store watcher's first new-file callback after launch; bound date-sharded watchers to a ~7-day window (SpecStory's Codex fd-exhaustion lesson).",
    "ptyNote": "SpecStory runs agents with inherited stdio and no PTY; all knowledge here is PTY-agnostic and transfers directly to gmux tmux panes.",
    "versionCmds": "Identity probes only — SpecStory enforces no semver floors; floors in notes are documented/empirical minimums."
  },
  "agents": [
    {
      "id": "claude",
      "displayName": "Claude Code",
      "kind": "cli",
      "status": "shipped-main",
      "binaries": ["claude"],
      "detect": {
        "pathProbe": ["~/.local/bin/claude", "$PATH", "~/.claude/local/claude", "claude (bare fallback)"],
        "extraDirs": ["~/.claude/projects/"],
        "versionCmd": "claude -v  # identity probe: output must contain \"(Claude Code)\""
      },
      "launch": {
        "argv": ["claude"],
        "quirks": ["inherit-stdio exec", "wrapper mirrors child exit code via os.Exit", "gmux may pre-assign the session UUID with --session-id <uuid> (gmux FINAL-REPORT plan; UNVERIFIED in SpecStory code)"]
      },
      "resume": {
        "strategy": "flag-uuid",
        "argv": ["claude", "--resume", "<sessionId>"],
        "sessionStore": "~/.claude/projects/<dashEncode(realpath(cwd))>/<sessionId>.jsonl",
        "notes": "dashEncode: [^a-zA-Z0-9-] -> '-', leading dash included; encoding is lossy. SpecStory pre-validates the UUID before resuming (claudecode/provider.go:383-391). --resume does not restore launch flags (--mcp-config/--add-dir/--settings) — record full original argv. Warmup-only sessions write no watcher callback."
      },
      "reconstructionTarget": true,
      "iconKey": "claude",
      "defaultHotkeyHint": "c"
    },
    {
      "id": "cursor",
      "displayName": "Cursor CLI",
      "kind": "cli",
      "status": "shipped-main",
      "binaries": ["cursor-agent"],
      "detect": {
        "pathProbe": ["$PATH", "~/.cursor/bin", "~/.local/bin"],
        "extraDirs": ["~/.cursor/chats/"],
        "versionCmd": "cursor-agent --version"
      },
      "launch": {
        "argv": ["cursor-agent"],
        "env": { "FORCE_COLOR": "1" },
        "quirks": ["inherit-stdio exec with signal forwarding", "wrapper mirrors child exit code"]
      },
      "resume": {
        "strategy": "flag-uuid",
        "argv": ["cursor-agent", "--resume", "<sessionId>"],
        "sessionStore": "~/.cursor/chats/<md5hex(canonicalCwd)>/<sessionId>/store.db",
        "notes": "store.db is SQLite (tables: blobs, meta). md5 is one-way — a cwd can never be recovered from the dir name; SpecStory reverse-matches by hashing cwds known from other providers. SpecStory dedupes/repairs user-supplied --resume flags."
      },
      "reconstructionTarget": true,
      "iconKey": "cursor",
      "defaultHotkeyHint": "u"
    },
    {
      "id": "codex",
      "displayName": "Codex CLI",
      "kind": "cli",
      "status": "shipped-main",
      "binaries": ["codex"],
      "detect": {
        "pathProbe": ["$HOMEBREW_PREFIX/bin/codex", "$(brew --prefix)/bin/codex", "/opt/homebrew/bin/codex", "$NVM_BIN/codex", "$(npm bin -g)/codex", "$NVM_DIR/versions/node/*/bin/codex", "codex (bare fallback)"],
        "extraDirs": ["$CODEX_HOME/sessions/", "~/.codex/sessions/"],
        "versionCmd": "codex --version  # falls back to: codex -V"
      },
      "launch": {
        "argv": ["codex"],
        "quirks": ["inherit-stdio exec", "each probed path validated executable (mode & 0o111)", "honors CODEX_HOME for store location"]
      },
      "resume": {
        "strategy": "flag-uuid",
        "argv": ["codex", "resume", "<sessionId>"],
        "sessionStore": "${CODEX_HOME:-~/.codex}/sessions/<YYYY>/<MM>/<DD>/rollout-<timestamp>-<uuid>.jsonl",
        "notes": "Resume is a SUBCOMMAND, not a flag. Store is global + date-sharded; project attribution via line-1 session_meta{id,timestamp,cwd}. SpecStory watches with a 7-day fsnotify window plus the resume-pinned day dir. Rollout format has drifted upstream before (codex#21761) — pin adapter tests to CLI versions."
      },
      "reconstructionTarget": true,
      "iconKey": "codex",
      "defaultHotkeyHint": "x"
    },
    {
      "id": "gemini",
      "displayName": "Gemini CLI",
      "kind": "cli",
      "status": "shipped-main",
      "binaries": ["gemini"],
      "detect": {
        "pathProbe": ["$PATH"],
        "extraDirs": ["~/.gemini/tmp/"],
        "versionCmd": "gemini --version"
      },
      "launch": {
        "argv": ["gemini"],
        "quirks": ["inherit-stdio exec", "wrapper mirrors child exit code"]
      },
      "resume": {
        "strategy": "flag-uuid",
        "argv": ["gemini", "--resume", "<sessionId>"],
        "sessionStore": "~/.gemini/tmp/<projectDir>/chats/session-*.json",
        "notes": "projectDir resolution is 3-tier: basename + .project_root marker file -> legacy sha256(canonicalCwd) -> full scan of all .project_root files. Filenames: session-<YYYY-MM-DDTHH-MM>-<8char>.json or session-<uuid>.json. Cross-agent reconstruction creates the project dir + .project_root if the cwd was never seen."
      },
      "reconstructionTarget": true,
      "iconKey": "gemini",
      "defaultHotkeyHint": "g"
    },
    {
      "id": "droid",
      "displayName": "Factory Droid CLI",
      "kind": "cli",
      "status": "shipped-main",
      "binaries": ["droid"],
      "detect": {
        "pathProbe": ["$PATH"],
        "extraDirs": ["~/.factory/sessions/"],
        "versionCmd": "droid --version  # strip ANSI, take last line"
      },
      "launch": {
        "argv": ["droid"],
        "quirks": ["inherit-stdio exec"]
      },
      "resume": {
        "strategy": "flag-uuid",
        "argv": ["droid", "--resume", "<sessionId>"],
        "sessionStore": "~/.factory/sessions/<dashEncode(realpath(cwd))>/<sessionId>.jsonl",
        "notes": "Identical dash-encoding convention to Claude Code. Sidecar <sessionId>.settings.json carries token usage."
      },
      "reconstructionTarget": true,
      "iconKey": "droid",
      "defaultHotkeyHint": "d"
    },
    {
      "id": "deepseek",
      "displayName": "DeepSeek TUI",
      "kind": "cli",
      "status": "shipped-main (read/launch); dev adds reconstruct+watch",
      "binaries": ["deepseek"],
      "detect": {
        "pathProbe": ["$PATH"],
        "extraDirs": ["~/.deepseek/sessions/"],
        "versionCmd": "deepseek --version  # documented floor 0.8.39+, not enforced"
      },
      "launch": {
        "argv": ["deepseek"],
        "quirks": ["inherit-stdio exec"]
      },
      "resume": {
        "strategy": "flag-uuid",
        "argv": ["deepseek", "--resume", "<sessionId>"],
        "sessionStore": "~/.deepseek/sessions/<sessionId>.json",
        "notes": "Flat GLOBAL store (not per-project); project identity via metadata.workspace inside the file. Schema: {schema_version, metadata{id,title,...,workspace,mode}, messages[], system_prompt}. Model the dev-branch copy (providers/deepseektui), which is +3,475 lines richer than main's."
      },
      "reconstructionTarget": true,
      "iconKey": "deepseek",
      "defaultHotkeyHint": "k"
    },
    {
      "id": "antigravity",
      "displayName": "Antigravity CLI",
      "kind": "cli",
      "status": "dev-only (not on main)",
      "binaries": ["agy"],
      "detect": {
        "pathProbe": ["$PATH"],
        "extraDirs": ["~/.gemini/antigravity-cli/"],
        "versionCmd": "agy --version  # bare semver output; documented floor 1.1.5+, not enforced"
      },
      "launch": {
        "argv": ["agy"],
        "quirks": ["inherit-stdio exec", "an 'antigravity' alias exists but is not normally on PATH — probe 'agy'", "shares ~/.gemini root with Gemini CLI: keep detection dirs distinct"]
      },
      "resume": {
        "strategy": "flag-uuid",
        "argv": ["agy", "--conversation", "<conversationId>"],
        "sessionStore": "~/.gemini/antigravity-cli/brain/<conversationId>/.system_generated/logs/transcript_full.jsonl",
        "notes": "Resume flag is --conversation, NOT --resume. Fallback transcript: transcript.jsonl; index: history.jsonl. Project attribution scrapes agy log files with fragile regexes -> ~/.gemini/config/projects/<id>.json. NOT a cross-agent resume target: agy resumes from protobuf-in-SQLite conversations/<id>.db, not the plaintext transcript. specstory-mac also excludes it as a resume target."
      },
      "reconstructionTarget": false,
      "iconKey": null,
      "defaultHotkeyHint": "a"
    },
    {
      "id": "muse",
      "displayName": "Muse Code",
      "kind": "cli",
      "status": "branch-only (muse-provider = dev+5, PR #269 in flight)",
      "binaries": ["muse"],
      "detect": {
        "pathProbe": ["$PATH"],
        "extraDirs": ["$XDG_DATA_HOME/muse/sessions/", "~/.local/share/muse/sessions/"],
        "versionCmd": "muse --version  # documented floor 0.1.0+, not enforced"
      },
      "launch": {
        "argv": ["muse"],
        "quirks": ["inherit-stdio exec", "wrapper mirrors child exit code", "honors XDG_DATA_HOME for store location"]
      },
      "resume": {
        "strategy": "flag-uuid",
        "argv": ["muse", "resume", "<sessionId>"],
        "sessionStore": "${XDG_DATA_HOME:-~/.local/share}/muse/sessions/<YYYY>/<MM>/<DD>/<sessionId>/session.jsonl",
        "notes": "Resume is a SUBCOMMAND, not a flag. Store is global + date-sharded (Codex-style); project association via workspace_root/workspaceRoot in the first metadata record. Event-sourced JSONL with microsecond timestamps; MUST filter by stream.id to exclude subagent task-streams (subagent/ dirs pruned). SpecStory bounds its watcher to 7 days. Format doc: specstory-cli/docs/MUSE-FORMAT.md."
      },
      "reconstructionTarget": true,
      "iconKey": null,
      "defaultHotkeyHint": "m"
    },
    {
      "id": "qwen",
      "displayName": "Qwen Code",
      "kind": "cli",
      "status": "branch-only (qwen-provider-support = dev+4, PR #268 in flight)",
      "binaries": ["qwen"],
      "detect": {
        "pathProbe": ["$PATH"],
        "extraDirs": ["~/.qwen/projects/"],
        "versionCmd": "qwen --version  # empirical floor 0.21.0+ (pre-0.21 omits 'provenance'), not enforced"
      },
      "launch": {
        "argv": ["qwen"],
        "quirks": ["inherit-stdio exec", "verified against qwen 0.21.7"]
      },
      "resume": {
        "strategy": "flag-uuid",
        "argv": ["qwen", "--resume", "<sessionId>"],
        "sessionStore": "~/.qwen/projects/<sanitize(cwd)>/chats/<sessionId>.jsonl",
        "notes": "sanitize: every non-[a-zA-Z0-9] -> '-' applied to the VERBATIM cwd (no realpath, no leading-dash rule) — differs from claude/droid encoding. Resume appends to the same file; compaction/slash-commands/subagents all stay inline in one append-only file. Ignore sibling .runtime.json."
      },
      "reconstructionTarget": true,
      "iconKey": null,
      "defaultHotkeyHint": "q"
    },
    {
      "id": "pi",
      "displayName": "Pi",
      "kind": "cli",
      "status": "remote-branch-unreleased (origin/feat/pi-provider = dev+19; SpecStory v1 is READ-ONLY)",
      "binaries": ["pi (UNVERIFIED — registry id is 'pi'; binary name not confirmed in mining reports)"],
      "detect": {
        "pathProbe": ["UNVERIFIED"],
        "extraDirs": ["$PI_CODING_AGENT_SESSION_DIR", "$PI_CODING_AGENT_DIR", "~/.pi/agent/sessions/"],
        "versionCmd": "UNVERIFIED"
      },
      "launch": {
        "argv": ["pi", "--session-id", "<sessionId>"],
        "quirks": ["CORRECTED 2026-08-11: the binary is `pi` and bare launch works. specstory-cli's provider being read-only says nothing about pi's own launch/resume surface, which is documented in `pi --help` and in its shipped docs/sessions.md."]
      },
      "resume": {
        "strategy": "flag-uuid",
        "argv": ["--session-id", "<sessionId>"],
        "sessionStore": "~/.pi/agent/sessions/--<encodedCwd>--/<timestamp>_<uuid>.jsonl",
        "notes": "CORRECTED 2026-08-11 (was strategy 'none', argv []). --session-id both CREATES and RESUMES, so launch argv === resume argv. cwd is load-bearing: from the wrong directory it silently opens a NEW EMPTY session under the same id. Env overrides honored: PI_CODING_AGENT_DIR, PI_CODING_AGENT_SESSION_DIR (the latter is the SESSION dir; PI_CODING_AGENT_DIR is the config dir and sessions live one level down)."
      },
      "reconstructionTarget": false,
      "iconKey": null,
      "defaultHotkeyHint": null
    },
    {
      "id": "cursoride",
      "displayName": "Cursor IDE",
      "kind": "ide",
      "status": "dev-only",
      "binaries": ["cursor"],
      "detect": {
        "pathProbe": [],
        "extraDirs": ["~/Library/Application Support/Cursor/User/globalStorage/state.vscdb"],
        "versionCmd": null
      },
      "launch": {
        "argv": ["cursor", "<canonicalProjectPath>"],
        "quirks": ["non-blocking app open (not a tmux-pane process); SpecStory watches until Ctrl-C", "detection is store-existence (state.vscdb), no binary/version probe"]
      },
      "resume": {
        "strategy": "session-file-harvest",
        "argv": ["cursor", "<canonicalProjectPath>"],
        "sessionStore": "~/Library/Application Support/Cursor/User/globalStorage/state.vscdb  # cursorDiskKV key composerData:<id> + ItemTable composer.composerData",
        "notes": "Resume = INSERT a composerData row into the global SQLite state.vscdb, then open Cursor; user manually opens the Agents panel. Not launchable in a tmux pane — surface as an 'open in IDE' action or exclude from gmux v1."
      },
      "reconstructionTarget": true,
      "iconKey": "cursor",
      "defaultHotkeyHint": null
    },
    {
      "id": "copilotide",
      "displayName": "VS Code Copilot (chat in IDE)",
      "kind": "ide",
      "status": "dev-only; 4 variants (copilotide, -insiders, -vscodium, -vscodium-insiders) registered only if that app has chats",
      "binaries": ["code", "code-insiders", "codium", "codium-insiders"],
      "detect": {
        "pathProbe": [],
        "extraDirs": [
          "~/Library/Application Support/Code/User/workspaceStorage/",
          "~/Library/Application Support/Code - Insiders/User/workspaceStorage/",
          "~/Library/Application Support/VSCodium/User/workspaceStorage/",
          "~/Library/Application Support/VSCodium - Insiders/User/workspaceStorage/"
        ],
        "versionCmd": null
      },
      "launch": {
        "argv": ["<code|code-insiders|codium|codium-insiders>", "<projectPath>"],
        "quirks": ["app open via vscode.OpenApp, not a pane process", "detection is workspaceStorage dir existence — deliberately no subprocess", "this is Copilot chat inside VS Code; SpecStory has NO standalone Copilot CLI provider"]
      },
      "resume": {
        "strategy": "session-file-harvest",
        "argv": ["<app>", "<projectPath>"],
        "sessionStore": "~/Library/Application Support/<Code|Code - Insiders|VSCodium|VSCodium - Insiders>/User/workspaceStorage/<workspaceHash>/chatSessions/<sessionId>.{jsonl,json}",
        "notes": "Resume = write the chatSessions file + a chat.ChatSessionStore.index row into the workspace's state.vscdb; requires a FULL VS Code restart to appear. Workspace matched via workspace.json folder URI. specstory-mac excludes copilotide as a resume target."
      },
      "reconstructionTarget": true,
      "iconKey": "githubcopilot",
      "defaultHotkeyHint": null
    }
  ],
  "nonProviders": {
    "amp": "skills matrix only (pkg/skills/agents.go:123) — no launch/watch/resume knowledge in SpecStory; gmux ships amp.svg but has no mechanics to drive it",
    "opencode": "skills matrix only (pkg/skills/agents.go:94)",
    "aider": "skills matrix + provenance-ignore only",
    "copilot-cli": "does not exist in SpecStory — 'copilot' means Copilot chat in VS Code (copilotide)"
  }
}
```

---

## 3. Gaps + recommendations for gmux Phase 10

### Gaps (things the mining could not fully answer, or that gmux must add itself)

1. **Missing logos** in `src/renderer/assets/agents/`: **muse, qwen, antigravity, pi** have no SVG (present: amp, claude, codex, cursor, deepseek, droid, gemini, githubcopilot — note it is `codex.svg`, not `openai.svg`). cursoride can reuse `cursor.svg`; copilotide maps to `githubcopilot.svg`. `amp.svg` exists for an agent SpecStory cannot drive.
2. ~~**Pi is a stub**~~ **DELETED (research 22 §2.12).** The claim was false and it cost the user four un-resumable sessions. pi's binary is `pi`, its version command is `pi -v`, and `pi --session-id <id>` is a verified idempotent launch-and-resume. The sentence being corrected described *specstory-cli's provider*, not pi.
3. **Claude `--session-id` pre-assignment** appears nowhere in SpecStory's code because SpecStory always harvests IDs asynchronously — keep the observation, drop the doubt: it is verified end-to-end against claude itself (the uuid gmux passes becomes the store filename).
4. **Antigravity is structurally weaker** than the rest: project attribution scrapes `agy` logs with regexes SpecStory itself calls fragile, and its transcript cannot seed a resume (protobuf-in-SQLite is the real state). Expect breakage across `agy` releases.
5. **No enforced version floors anywhere** — gmux gets identity probes only. Record the agent CLI version per manifest row (already planned) and pin per-agent adapter tests to CLI versions (Codex rollout drift, codex#21761, is the precedent).
6. **`--resume` does not restore launch flags** — no longer an assumption: MEASURED on claude, codex, muse and qwen (research 22 §3.4 rule 3), inconclusive on cursor and pi, so gmux re-appends the original extras for every agent. The manifest keeps the full original argv.
7. **IDE providers don't fit tmux panes**: decide whether cursoride/copilotide appear in gmux at all (as "open in IDE" actions) or are dropped from v1; they are included in the registry so the decision is explicit.

### Recommendations for the Phase-10 build

**Agent registry module** — ship the JSON above as data (`src/shared/agentRegistry.json` or generated TS), with a thin per-agent adapter interface mirroring SpecStory's SPI: `probeBinary()`, `identityCheck(versionOutput)`, `launchArgv(custom?)`, `resumeArgv(sessionId)`, `sessionStoreDir(cwd)` (the four encodings live here, behind a mandatory case-correct-realpath canonicalizer), `parseSessionMeta(file)` (for global stores: extract cwd/workspace to attribute sessions to project tabs). Codex/muse subcommand-resume vs flag-resume is just data (`resume.argv` templates), no special casing.

**Detection service** — two tiers, exactly like SpecStory + specstory-mac:
- *Active probe* (on demand / settings screen): walk `detect.pathProbe` with executable-bit validation, then run `versionCmd` as an identity check. PATH-only agents are one `LookPath`.
- *Passive tripwire* (cheap, always-on): FSEvents/fsnotify over the union of `detect.extraDirs` (specstory-mac's ProviderRoots pattern, 8 store roots) — an agent whose store grows is installed *and in use*, which is stronger signal than a binary on PATH. Bound date-sharded watchers (codex, muse) to a 7-day window. This same watcher doubles as the async session-ID harvester for the manifest (first new file after a gmux-launched pane spawns = that pane's session).

**Settings surface** — per agent: enabled toggle, custom command override (string, tokenized with quote/escape + tilde expansion — mirror SpecStory's `[providers] <id>_cmd` precedence), detected-path + version readout, store-dir override where the agent honors env (`CODEX_HOME`, `XDG_DATA_HOME`, `PI_CODING_AGENT_*`), and resume policy (armed-not-auto default per FINAL-REPORT). Default agent must be explicit (claude) — never alphabetical (SpecStory's `specstory run` bare-invocation bug picks `antigravity`).

**Sequencing**: wave 1 = the five main-line HIGH-confidence CLIs (claude, cursor, codex, gemini, droid) + deepseek; wave 2 = antigravity, muse, qwen (watch PRs #268/#269 for merge — their session formats are already documented in `MUSE-FORMAT.md` and verified vs qwen 0.21.7); wave 3 = pi (when upstream implements run) and the IDE pair (if kept). Commission muse/qwen/antigravity/pi SVGs before wave 2.
