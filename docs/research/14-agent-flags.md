# 14 — Agent CLI launch-flag catalog (field notes)

**Companion module:** `src/main/agents/flags.ts` (Phase 10 item 8).
**Method:** ran `<bin> --help` / `--version` (plus resume/exec subcommand help) for every agent CLI installed on this machine — help output only, stdin `/dev/null`, `TERM=dumb`, 20 s hard timeout, no session ever started. Date: **2026-08-09**.
**Provenance rule:** a flag is marked **VERIFIED** only if it appeared verbatim in help output captured on this machine, against the exact version listed below. Anything sourced from research docs / BACKLOG but absent from the installed build's help is marked **RESEARCH** and must not be silently appended to an argv.

## 1. Detection snapshot (this machine)

| binary | installed | path | version seen |
|---|---|---|---|
| claude | yes | ~/.local/bin/claude | 2.1.226 (Claude Code) |
| codex | yes | ~/.local/bin/codex | codex-cli 0.147.0 |
| gemini | yes | ~/.npm-global/bin/gemini | 0.54.0 |
| cursor-agent | yes | ~/.local/bin/cursor-agent | 2025.09.18-7ae6800 |
| droid | **NO** | — | — (catalog left empty; populate on detection) |
| deepseek | yes | ~/.npm-global/bin/deepseek | v0.8.26 (npm wrapper, Hmbown/DeepSeek-TUI) |
| agy (antigravity) | yes | ~/.local/bin/agy | 1.0.2 |
| muse | yes | ~/.local/bin/muse | Muse Code 0.1.0 (0.1.0-R708.1) |
| qwen | yes | ~/.local/bin/qwen | 0.21.7 |
| pi | yes | ~/.npm-global/bin/pi | 0.79.1 |
| amp *(non-registry)* | yes | ~/.local/bin/amp | 0.0.1760564853-ge9bf1d |
| opencode *(non-registry)* | yes | ~/.opencode/bin/opencode | 1.18.14 |
| copilot *(non-registry)* | yes | ~/.npm-global/bin/copilot | GitHub Copilot CLI 1.0.78 |
| aider | **NO** | — | — (not cataloged) |

## 2. Per-CLI findings

### claude 2.1.226
- **Autonomy:** `--dangerously-skip-permissions` (danger); `--allow-dangerously-skip-permissions` (danger — makes bypass *available*, not default); `--permission-mode <acceptEdits|auto|bypassPermissions|manual|dontAsk|plan>`.
- **Resume semantics:** `--resume` is a root flag; presets share its argv. Research 02 (registry §3.6): `--resume` does **not** restore launch flags → **re-pass required**, and the manifest already records extras into resume_argv. Marked `required-verified` (option-table composition + research doc).
- Worth noting: `--session-id <uuid>` pre-assignment still present (manifest cornerstone); `--model`, `--effort <low..max>` are value flags for a future picker.

### codex 0.147.0
- **Autonomy:** `--dangerously-bypass-approvals-and-sandbox` (danger, "EXTREMELY DANGEROUS" verbatim); `--sandbox <read-only|workspace-write|danger-full-access>`; `--ask-for-approval <untrusted|on-request|never>`; `--approve-for-me` (auto-review approvals in workspace-write sandbox); `--search`.
- **`--yolo` is GONE from this build's `--help`** (BACKLOG claims it; it was historically an alias for the long bypass flag). Marked RESEARCH. Same for `--full-auto` — absent in 0.147.0.
- **Resume semantics:** `codex resume --help` **re-lists the full option set** (-s, -a, --approve-for-me, --dangerously-bypass-…) → **verified** that presets ride the resume argv; options are per-invocation so they must be re-passed. Options are accepted after the subcommand (`codex resume [OPTIONS] [SESSION_ID]`), so appending works.

### gemini 0.54.0
- **Autonomy:** `-y/--yolo` (danger, "Automatically accept all actions"); `--approval-mode <default|auto_edit|yolo|plan>`; `-s/--sandbox`; `--skip-trust` (suppresses the workspace-trust dialog — convenient inside gmux panes, but silently extends trust).
- **Resume semantics:** `-r/--resume <latest|index>` is a root flag; presets compose syntactically (yargs option table); no combined example in help → `required-unverified`.
- Also present: `--session-id <uuid>` (pre-assign UUID) — new vs the registry notes.

### cursor-agent 2025.09.18
- **Autonomy:** `-f/--force` (danger — "Force allow commands unless explicitly denied"). That's the whole autonomy surface in this build's help.
- **Resume semantics:** `--resume [chatId]` root flag; the bare `cursor-agent resume` subcommand documents **no options** ("Resume the latest chat session"), so use the flag form when presets are active → `required-unverified`.

### droid — NOT INSTALLED
- Empty catalog (`helpVerifiedVersion: null`). The registry (11-agent-registry) records launch/resume argv only, no autonomy flags, so there is no RESEARCH claim to carry either. Populate when the detection service finds a binary.

### deepseek v0.8.26 (Hmbown/DeepSeek-TUI npm wrapper)
- **Autonomy:** `--approval-policy <?>` and `--sandbox-mode <?>` exist in `--help` but with **no documented value lists** (codex-derived design ⇒ values are *probably* codex-shaped). Composed presets (`--approval-policy never`, `--sandbox-mode danger-full-access`) therefore marked RESEARCH. `--skip-onboarding` VERIFIED.
- **Resume semantics:** `deepseek resume --help` shows only `[ARGS]...` pass-through to the TUI binary → `required-unverified`.
- Installed 0.8.26 is **below** the registry's documented 0.8.39+ floor (floors aren't enforced anywhere; noting for adapter tests).

### agy 1.0.2 (antigravity)
- **Autonomy:** `--dangerously-skip-permissions` (danger — "Auto-approve all tool permission requests without prompting") VERIFIED; `--sandbox` VERIFIED (safety-increasing). Help prints to **stderr**.
- **Resume semantics:** `--conversation <id>` is a root flag (confirms the registry: NOT `--resume`); presets share the argv; no combined example → `required-unverified`.
- Installed 1.0.2 predates the registry's documented 1.1.5+ floor.

### muse 0.1.0 (R708.1)
- **Autonomy (help has a dedicated "Safety" section; approval + sandbox ON by default):** `--yolo` (danger — "Disable approval and sandboxing and trust this workspace for this run"); `--approval-mode <untrusted|on-request|never>`; `--disable-approval`; `--disable-sandbox`; `--sandbox-network <restricted|enabled|proxy-only>`; `--trust-workspace` (loads workspace skills/rules; not persisted).
- **Resume semantics:** `muse resume --help` states root options "**may appear on either side of `resume`**" → **verified** composition with the subcommand; per-run flags must be re-passed.

### qwen 0.21.7
- **Surprise: NO autonomy flag in this build's help.** Despite being gemini-derived (BACKLOG expects a yolo equivalent), 0.21.7's `--help` lists only `-m/--fallback-model/-p/-i/--safe-mode/-s(--sandbox)/-o/-c/-r/-v/-h`. `--yolo` / `--approval-mode` marked RESEARCH-absent; do not surface until a build documents them.
- **Resume semantics:** `-r/--resume <id>` + `-c/--continue` root flags → `required-unverified`.

### pi 0.79.1 — registry corrections
The registry marks pi's binary/version/launch **UNVERIFIED** and resume "none" (SpecStory v1 is read-only). Verified here on the ground:
- Binary **`pi`** exists (0.79.1); `pi --help` and `pi --version` work; default is interactive TUI.
- **Resume EXISTS in the CLI itself:** `-c/--continue`, `-r/--resume` (picker), `--session <path|id>`, `--session-id <id>` ("use exact project session ID, creating it if missing" — i.e. pre-assignment!), `--fork <path|id>`, `--session-dir <dir>`, `--no-session`.
- **No approval/permission system in help at all** — pi's safety lever is tool selection: presets ship the help's own read-only example `--tools read,grep,find,ls`, plus `--no-session`.
- Env confirmations: `PI_CODING_AGENT_DIR`, `PI_CODING_AGENT_SESSION_DIR` both listed.
- → Phase 10 registry owner: pi can graduate from "detect+browse only" to launch+resume-capable per this build's help (session-store watcher knowledge still comes from the SpecStory branch).

### Non-registry, installed anyway (BACKLOG names amp explicitly)
- **amp:** `--dangerously-allow-all` (danger) VERIFIED; **resume verified** — `amp threads continue --help` re-lists it under "Global options". Resume form is the `threads continue [threadId]` subcommand. Also settable persistently via `amp.dangerouslyAllowAll` in settings.json.
- **opencode:** `--auto` (danger — help itself says "dangerous!") VERIFIED; resume via `-c/--continue` / `-s/--session <id>` / `--fork` root flags → `required-unverified`.
- **copilot (GitHub Copilot CLI 1.0.78):** exists as a real terminal CLI on this machine even though SpecStory's "copilot" means only VS Code Copilot chat. `--yolo` == `--allow-all-tools --allow-all-paths --allow-all-urls` (all four VERIFIED, danger); `--autopilot`/`--mode`, `--no-ask-user` convenience; granular `--allow-tool/--deny-tool` patterns. **Resume composition verified verbatim in help:** `$ copilot --allow-all-tools --resume`. Also `--session-id <uuid>` pre-assignment for new sessions.

## 3. Cross-CLI resume rule (for the create modal + manifest)

Every cataloged CLI treats these flags as **per-invocation** — no CLI persists a launch flag into its session store. So any preset toggled at create time must be recorded in the manifest's `resume_argv` too (gmux already does this for extras per research 02). Verification grades, per CLI:

| CLI | presets on resume argv | how proven |
|---|---|---|
| codex | **verified** | `codex resume --help` re-lists all preset flags |
| muse | **verified** | "root options may appear on either side of `resume`" |
| amp | **verified** | global options listed under `threads continue --help` |
| copilot | **verified** | literal help example `--allow-all-tools --resume` |
| claude | required (research 02: `--resume` restores nothing) | root-flag composition + research doc |
| gemini, qwen, cursor-agent, agy, opencode, pi | required-unverified | flag+resume are root options on one argv; no explicit combined example |
| deepseek | required-unverified | `resume [ARGS]...` opaque pass-through |
| droid | unverified | not installed |

Practical consequence for `flags.ts` consumers: `appendPresets()` appends tokens at the END of the argv, which is valid for both flag-resume (`claude --resume <id> --danger…`) and subcommand-resume (`codex resume <id> --danger…`) shapes.

## 4. Drift watchlist

1. **codex `--yolo` / `--full-auto` removed** by 0.147.0 (BACKLOG still cites `--yolo`) — keep the long `--dangerously-bypass-approvals-and-sandbox` as the canonical danger preset; re-check aliases on version change.
2. **qwen 0.21.7 has no yolo/approval-mode** — the gemini-derived autonomy surface has (at least temporarily) vanished; re-probe on update.
3. **deepseek approval/sandbox value lists undocumented** — composed values stay RESEARCH until a build documents them (`deepseek sandbox` subcommand may reveal policy vocabulary later).
4. Version floors vs installed: agy 1.0.2 < 1.1.5 floor, deepseek 0.8.26 < 0.8.39 floor (floors are documentary, not enforced — but pin adapter tests to versions per registry gap #5).
5. **pi grew launch/resume flags** ahead of SpecStory upstream — registry entry is now stale on that axis.

Raw help captures lived in the session scratchpad (`help/*.txt`); every load-bearing line is quoted or paraphrased above, and re-running the probe is one `--help` per binary.
