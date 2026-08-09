# 09 — Reboot Survival: The Full P1 Recipe

**Dimension:** End-to-end durable named terminal sessions for gmux — surviving app restarts, app crashes, and machine reboots.
**Date researched:** 2026-08-09. All release/maintenance claims verified against live sources as of this date.

---

## TL;DR

There are **three distinct failure tiers**, and no single tool solves all three:

| Tier | What dies | What survives | Mechanism |
|---|---|---|---|
| **T1: gmux quits/crashes** | The GUI, its attached tmux clients | tmux server, all PTYs, all agent processes, full scrollback | tmux server + reattach by session name |
| **T2: tmux server dies** (rare: kill, crash, socket loss) | PTYs, processes, in-memory scrollback | Agent conversation files on disk; gmux manifest | Manifest-driven recreate + agent `--resume` |
| **T3: machine reboots** | Everything in memory: PTYs, processes, tmux server | Agent conversation files, gmux manifest, (optionally) captured scrollback text | Manifest-driven recreate + agent `--resume`, auto-triggered at login |

**Recommendation in one paragraph:** Run a user-level tmux server (`exit-empty off`, socket in `~/Library/Application Support/gmux/`, not `/tmp`) that gmux spawns as its own child on first launch. Every gmux terminal is a named tmux session; gmux embeds a real terminal view running `tmux attach -t <name>` and uses a parallel control-mode client (`tmux -C`) for event notifications. That alone solves T1 perfectly — processes, names, and scrollback all survive gmux restarts and crashes. For T2/T3, do **not** adopt tmux-resurrect (dormant since Aug 2024, and its process-sniffing heuristics are exactly the wrong tool when gmux already *knows* what it launched). Instead, gmux owns a **session manifest**: for every named session it records `{name, project, cwd, argv, env, agent-type, agent-session-id}` at spawn time — including pre-assigning Claude Code's session UUID via `claude --session-id <uuid>` so resume is deterministic. On cold boot (login item via `SMAppService`), gmux recreates each tmux session with `new-session -d -s <name> -c <cwd>`, backfills saved scrollback as inert text, and offers/auto-runs the agent's resume command (`claude --resume <uuid>`, `codex resume <id>`, per the 02-agent-resume matrix). Conversation state survives reboot because the agents persist it to disk themselves; the manifest is what reconnects names → projects → conversations.

---

## Part A — Tier 1: Surviving app restart/crash (the mux server layer)

### A.1 The tmux server model

tmux's architecture is exactly the shape gmux needs: *"a session is displayed on screen by a client and all sessions are managed by a single server. The server and each client are separate processes which communicate through a socket"* (tmux(1), verified against tmux 3.6a man page locally). Each pane is its own pseudo-terminal (`pty(4)`). Kill the client (or the whole GUI app embedding it) and the server, PTYs, child processes, and scrollback are untouched. *"Each session is persistent and will survive accidental disconnection … or intentional detaching."*

- **Status 2026:** tmux is very actively maintained — latest release **3.7b (July 1, 2026)**; 3.6 line still maintained (3.6b May 20, 2026). Repo pushed to the day this was researched. License: **ISC** (permissive, fork-friendly). Sources: [tmux releases](https://github.com/tmux/tmux/releases), [3.6b tag](https://github.com/tmux/tmux/releases/tag/3.6b), [Wikipedia release history](https://en.wikipedia.org/wiki/Tmux), GitHub API (license: ISC, pushed_at 2026-08-09).

**Server lifetime mechanics gmux must control:**

- `exit-empty [on | off]` — *"If enabled (the default), the server will exit when there are no active sessions."* Set **off** in gmux's server config so the server lingers even if the user closes every session (cheap insurance; also makes `tmux start-server` meaningful).
- `exit-unattached [on | off]` — leave **off** (default): the server must keep running when no client (i.e., no gmux window) is attached. This is the whole point.
- `destroy-unattached [off | on | keep-last | keep-group]` — must be **off** (default). If ever set on, detached sessions get destroyed — the anti-feature for gmux.
- `tmux start-server` exists precisely for "server without sessions"; the man page notes it's only useful with `exit-empty` off or a command sequence.
- **Socket location:** default is a directory under `/tmp` (`/tmp/tmux-<uid>/default`), overridable with `TMUX_TMPDIR` or `-S socket-path`. **macOS gotcha:** macOS's periodic /tmp cleanup can delete a long-lived server's socket file; the server keeps running but becomes unreachable. tmux(1) documents the escape hatch: *"If the socket is accidentally removed, the SIGUSR1 signal may be sent to the tmux server process to recreate it."* ([tmux(1)](https://man7.org/linux/man-pages/man1/tmux.1.html)) gmux should sidestep this class of bug entirely: run with a **dedicated socket** at `TMUX_TMPDIR=~/Library/Application Support/gmux/` (also isolates gmux's server from the user's personal tmux and personal `~/.tmux.conf` — pair it with `-f gmux-tmux.conf` for full config isolation).

### A.2 Named sessions and attach semantics

- Create: `tmux new-session -d -s <name> -c <cwd> [command]`. `-A` makes it "attach if exists, else create" (idempotent — useful for reconnect races).
- Attach: `attach-session [-dErx] -t <name>` — *"target-session must already exist"*; `-d` detaches other clients (gmux won't normally need it; multiple clients per session are fine and size via `ignore-size`/`refresh-client -C`).
- Client flags on attach matter for a GUI: `-f no-output` (control-mode client that doesn't want the output firehose), `ignore-size`, `no-detach-on-destroy`.
- Session **names persist inside the server**, survive detach/reattach, and are enumerable (`tmux ls -F '#{session_name}'`) — so after a gmux crash, reconciliation is: list server sessions, match against manifest, reattach views.
- `detach-on-destroy` and `%sessions-changed`/`%session-renamed` control-mode notifications let gmux track renames done from inside the terminal too.

### A.3 Scrollback: retention and backfill

- Retention: `history-limit <lines>` (session/global option) — set generously (e.g., 50k–100k) in gmux's dedicated conf; agents are chatty.
- Backfill after reattach: **`capture-pane`** is the workhorse. Verified semantics from tmux 3.6a man page:
  - `capture-pane -p -t <pane>` prints to stdout; `-e` includes *"escape sequences for text and background attributes"* (colors survive); `-J` *"preserves trailing spaces and joins any wrapped lines"*; `-C` octal-escapes non-printables.
  - Ranges: `-S`/`-E` line numbers where *"zero is the first line of the visible pane and negative numbers are lines in the history. '-' to -S is the start of the history."* So **full history + visible screen = `capture-pane -p -e -J -S - -t <pane>`**.
  - This is how gmux paints scrollback into its terminal widget instantly on reattach instead of showing an empty screen (and it's also the T3 scrollback-snapshot primitive — see B.4).
- Alternative/live option: `pipe-pane -o 'cat >> file'` streams pane output to a file continuously — an option if gmux ever wants crash-proof scrollback without polling, at the cost of managing log growth.

### A.4 Control mode: gmux's programmatic channel

tmux **control mode** (`tmux -C`; `-CC` is the iTerm2-style variant) is a *"simple text-only protocol"*: client writes commands terminated by newlines; each command yields a `%begin … %end/%error` block with `(time, command-number, flags)` headers; asynchronous **notifications** are interleaved but *"a notification will never occur inside an output block."* (tmux(1) CONTROL MODE, verified locally on 3.6a.)

Notifications gmux cares about (full list verified from man page): `%output pane-id value` (octal-escaped output), `%extended-output` (when `pause-after` flow control is set, includes buffer age; `%pause`/`%continue` manage backpressure), `%layout-change`, `%window-add`/`%window-close`/`%window-renamed`, `%session-changed`/`%session-renamed`/`%sessions-changed`, `%client-detached`, `%exit`, `%subscription-changed` (with `refresh-client -B` — subscribe to any format expression and get pushed updates, e.g. `pane_current_command` changes for "agent is running/idle" badges). `refresh-client -C WxH` sets the control client's notion of size.

**Two viable frontend integration patterns:**

1. **Terminal-embeds-tmux (recommended, simpler):** each gmux pane hosts a real terminal emulator widget running a plain PTY with `tmux attach -t <name>` (status line off in gmux's conf). tmux does redraw/scrollback; gmux additionally keeps ONE control-mode client (`tmux -C attach -f no-output`) as an event bus for session lists, renames, layout state, and exit detection. This is how most tmux GUI wrappers work and avoids reimplementing a terminal state machine over `%output`.
2. **iTerm2-style (`-CC`) full integration:** gmux renders windows/panes natively and consumes `%output` per pane. Maximum control (native tabs = tmux windows), significantly more work (you own flow control via `pause-after`, resize via `refresh-client -C`, octal unescaping). iTerm2 is the proof it works; budget accordingly.

### A.5 The zellij alternative for T1

zellij (Rust, **MIT**, very active — v0.44.3 May 13 2026, 0.44.0 "Remote Sessions, Windows Support, CLI Automation" Mar 23 2026; repo pushed Aug 5 2026; ~35k stars) has the same detach/attach server model: `zellij ls`, `zellij attach <name>`. Sources: [releases](https://github.com/zellij-org/zellij/releases), [CHANGELOG](https://github.com/zellij-org/zellij/blob/main/CHANGELOG.md), GitHub API.

For T1 it works equivalently, but for **embedding in an app** it is weaker than tmux: there is no equivalent of control mode's documented notification protocol (zellij's automation story is CLI actions and WASM plugins), so a gmux frontend would drive it blind or via plugin IPC. Where zellij shines is T3 (native serialization — see B.3).

---

## Part B — Tiers 2/3: Surviving server death and machine reboot

After a reboot the PTYs and processes are **gone, unrecoverable by anyone**. Everything in this tier is *reconstruction*: rebuild the layout, restart the programs, and — uniquely possible with coding agents — restore the *conversation* because Claude Code/Codex persist transcripts to disk themselves (`~/.claude/projects/…/*.jsonl`, `$CODEX_HOME/sessions/YYYY/MM/DD/*.jsonl`). The only question is who remembers *what to relaunch where*. Three candidate owners: tmux-resurrect, zellij serialization, or gmux itself.

### B.1 tmux-resurrect internals (study it, don't adopt it)

**Status 2026: effectively dormant.** Last push **2024-08-13** (GitHub API), ~13k stars, ~300 open issues, MIT. tmux-continuum: last push **2024-08-02**, MIT. Neither has had a commit in ~2 years as of Aug 2026. They still work (tmux's interfaces are stable), but this is maintenance-mode community software. Sources: [tmux-resurrect](https://github.com/tmux-plugins/tmux-resurrect), [tmux-continuum](https://github.com/tmux-plugins/tmux-continuum), GitHub API `pushed_at`.

**What it saves** ([README](https://github.com/tmux-plugins/tmux-resurrect)): all sessions/windows/panes and their order, per-pane cwd, exact layouts, active/alternate session+window, focus, grouped sessions; optionally vim/nvim sessions, pane contents, shell history.

**Save file format** (verified from [save.sh](https://github.com/tmux-plugins/tmux-resurrect/blob/master/scripts/save.sh)): plaintext, tab-delimited, one line per object, in `~/.tmux/resurrect/` (configurable) with a `last` symlink to the newest save (`ln -fs`):

```
pane\t#{session_name}\t#{window_index}\t#{window_active}\t:#{window_flags}\t#{pane_index}\t#{pane_title}\t:#{pane_current_path}\t#{pane_active}\t#{pane_current_command}\t:#{full_command}
window\t#{session_name}\t#{window_index}\t:#{window_name}\t#{window_active}\t:#{window_flags}\t#{window_layout}\t#{automatic_rename}
state\t#{client_session}\t#{client_last_session}
```

`full_command` comes from a pluggable *save_command_strategy* script given the pane PID (default strategy shells out to `ps` for the full argv). Pane text, when `@resurrect-capture-pane-contents 'on'`, is captured via `tmux capture-pane` per pane and archived.

**The allowlist — resurrect's core design choice** ([restoring_programs.md](https://github.com/tmux-plugins/tmux-resurrect/blob/master/docs/restoring_programs.md)): by default only `vi vim nvim emacs man less more tail top htop irssi weechat mutt` are relaunched. Users extend via `@resurrect-processes`, with a mini-language: quoted entries for commands with args (`'some_program "git log"'`), `~foo` = *"restore full process if the string is found ANYWHERE in the process name"*, `"~cmd->display cmd"` substitutes the restore command, trailing ` *` preserves original arguments, `:all:` restores everything (documented as dangerous). To make agents restart under resurrect you'd write e.g. `set -g @resurrect-processes '"~claude->claude --continue" "~codex->codex resume --last"'` — note you *cannot* express "resume the specific session that was in this pane"; only a static command per program name. **This is the fundamental ceiling**: resurrect infers state from `ps` at save time and replays static strings; it cannot know Claude's session UUID.

**Restore mechanics** (verified from [restore.sh](https://github.com/tmux-plugins/tmux-resurrect/blob/master/scripts/restore.sh)): recreate hierarchy with `new-session -d -s`, `new-window -d -t <sess>:<idx> -c <dir>`, `split-window -t … -c <dir>`; then `select-layout -t <sess>:<win> "$window_layout"`; pane contents restored by launching the pane as `cat '<contents file>'; exec <default command>` (old text becomes inert scrollback above a fresh shell — the correct trick, gmux should copy it); programs relaunched effectively as keystrokes into the pane; panes that already exist are registered and skipped to avoid double-restore; finally `switch-client -t` restores the previously active session. Known operational sharp edges from the field: capture-pane-contents interacts badly with `default-command` containing `&&`/`||`, and stale/corrupt `last` saves are a recurring failure mode ([community guide](https://github.com/Kaito34/tmux-restore-guide), [fix write-up](https://joeywrites.dev/posts/fixing-broken-tmux-resurrect-save/)).

**tmux-continuum** adds cadence + autoboot: background save every **15 minutes** by default (runs via a hook embedded in `status-right`, so the status line must be on — a real constraint if gmux hides tmux's status line), `@continuum-restore 'on'` triggers restore *"exclusively on tmux server start"*, and `@continuum-boot 'on'` auto-starts tmux at login — on macOS by generating a **launchd LaunchAgent plist** that opens Terminal.app/iTerm (options: `iterm`, `fullscreen`, `kiosk`) ([automatic_start.md](https://github.com/tmux-plugins/tmux-continuum/blob/master/docs/automatic_start.md)). Documented macOS caveat: on first boot the osascript-driven launch trips a TCC prompt — the script must be added under **System Settings → Privacy & Security → Accessibility** or auto-start silently fails ([README](https://github.com/tmux-plugins/tmux-continuum)). On Linux the analog is a systemd unit that starts only the server.

### B.2 What resurrect teaches gmux

1. Layout serialization via `#{window_layout}` + `select-layout` is trivial and rock-solid — steal it.
2. `cat saved-scrollback; exec $SHELL` is the right way to resurrect dead scrollback as inert text.
3. Process *inference* (ps-sniffing + allowlist pattern matching) is the fragile 80%. gmux doesn't need to infer — it *launched* the process and can record ground truth.
4. Autosave via status-line hook and restore-on-server-start are hacks around not owning a daemon. gmux IS the daemon owner; it can snapshot on every session mutation, not on a 15-minute timer.

### B.3 zellij native serialization (the built-in competitor)

Verified from [official docs](https://zellij.dev/documentation/session-resurrection.html) and issues:

- **On by default.** Every session is serialized **every 1 second** to human-readable **KDL layout files** in the cache dir — on macOS `~/Library/Caches/…/zellij/<version>/session_info/<session-name>/` (`session-layout.kdl`, `session-metadata.kdl`, `initial_contents_*`). Note: cache path ignores `$XDG_CACHE_HOME` on macOS ([#5071](https://github.com/zellij-org/zellij/issues/5071)), and the path is **per-zellij-version** — upgrades orphan old sessions.
- **What's captured:** tab/pane layout, cwd, and the command running in each pane. Optional: `pane_viewport_serialization true` (visible text) and `scrollback_lines_to_serialize` (0 = all). Disable-able via `session_serialization false`.
- **Restore flow:** dead sessions show as `EXITED` in `zellij ls` / the session-manager; `zellij attach <name>` resurrects. **It does re-exec commands, but not immediately:** each command pane shows a *"Press ENTER to run…"* banner (guarding against replaying `rm -rf`); `zellij attach --force-run-commands` skips the banner.
- **Caveats (2025–2026, all confirmed open/recent):**
  - Command discovery reads the process table and *"can sometimes be inaccurate"* (wrapper commands); mitigation is a user-supplied `post_command_discovery_hook`.
  - Wrong child captured when a pane's shell has multiple children — last in `ps` wins ([#4873](https://github.com/zellij-org/zellij/issues/4873), 2026).
  - Quoting bugs: pipes/strings serialize into commands with wrong arguments ([#2925](https://github.com/zellij-org/zellij/issues/2925)).
  - Inconsistent restores: missing tabs, first pane dropping to `$HOME` ([#4129](https://github.com/zellij-org/zellij/issues/4129)); resurrection broken on fresh macOS brew install ([#4412](https://github.com/zellij-org/zellij/issues/4412)); serialization silently stopping ([#4536](https://github.com/zellij-org/zellij/issues/4536)).

**Assessment:** the *architecture* (continuous serialization to readable files, owned by the server) is the right one — but it has the same disease as resurrect: it *infers* commands from the process table, so it would restore `claude` but never `claude --resume <the-right-uuid>`. And its ergonomics for an embedding GUI are weaker than tmux control mode. Good prior art; not the mechanism.

### B.4 The gmux manifest: doing better than both

gmux has an unfair advantage neither tool has: **it is the launcher.** It doesn't need to sniff `ps` — it knows the argv, cwd, env, and (for Claude Code) even the conversation UUID *before the process starts*.

**Manifest record — one per named session** (SQLite or JSON at `~/Library/Application Support/gmux/manifest.db`):

```jsonc
{
  "name": "auth-refactor",             // the durable user-facing name (= tmux session name)
  "project": "/Users/gdc/src/webapp",  // gmux project tab this belongs to
  "cwd": "/Users/gdc/src/webapp",      // pane cwd at last snapshot (poll pane_current_path)
  "argv": ["claude", "--session-id", "550e8400-…"],  // exact original launch command
  "env": {"ANTHROPIC_MODEL": "…"},     // the *delta* gmux applied, not the whole env
  "agent": "claude-code",              // null for plain shells
  "agent_session_id": "550e8400-…",    // the resume key (see below)
  "window_layout": "b25f,80x24,0,0,2", // #{window_layout} snapshot for multi-pane sessions
  "created_at": "…", "last_seen": "…",
  "status": "running | exited | awaiting-restore"
}
```

**Capturing `agent_session_id` per agent** (details in `02-agent-resume.md`; the load-bearing facts verified here):

- **Claude Code:** best-in-class. gmux *pre-assigns* the UUID: `--session-id` = *"Use a specific session ID for the conversation (must be a valid UUID)"*; resume with `--resume <id-or-name>` (v2.1.223+ even searches across projects), `--continue`/`-c` = most recent in cwd, `--fork-session` to branch instead of overwrite, `--name` for human-readable session names. Transcripts live under `~/.claude/projects/<cwd-slug>/<uuid>.jsonl`. Source: [official CLI reference](https://code.claude.com/docs/en/cli-reference). Belt-and-braces: a `SessionStart` hook can also report the live session id.
- **Codex CLI:** no pre-assignment; `codex resume <SESSION_ID>` / `codex resume --last` (*"skip the picker and resume the most recent chat from the current working directory"*), `--all` widens beyond cwd. Rollout files under `$CODEX_HOME/sessions/YYYY/MM/DD/*.jsonl[.zst]` (may be zstd-compressed; archived sessions move to a sibling `archived_sessions/` subdir — codex-rs `rollout/src/list.rs`) — gmux captures the id post-hoc by watching for the newest rollout created after spawn (cwd-matched, matching both extensions), or settles for `resume --last` scoped to the pane's cwd. Source: [Codex CLI reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli) (formerly developers.openai.com/codex/cli/reference, now 308-redirected).
- **Unknown/plain shells:** record argv + cwd only; restore = fresh shell in cwd (+ optional inert scrollback).

**Snapshot cadence:** event-driven, not timed — update the manifest on session create/rename/close (control-mode notifications `%sessions-changed`, `%session-renamed`, `%window-close`), and refresh `cwd`/`window_layout` on a slow poll or `refresh-client -B` subscription. Optionally snapshot scrollback text per pane (`capture-pane -e -J -S -`) on a timer and on `applicationWillTerminate` — this is the only piece that is inherently lossy at crash time (accept last-N-minutes loss, exactly like VS Code's revive).

**Cold-boot restore algorithm:**

1. Login item starts gmux (or a tiny `gmux-agentd` helper) — see Part C.
2. gmux starts its tmux server: `TMUX_TMPDIR=~/Library/Application Support/gmux tmux -f gmux-tmux.conf start-server` (as a **child of gmux.app**, for TCC reasons — C.2).
3. Reconcile: `tmux ls` (empty after reboot) vs manifest rows with `status != exited`.
4. For each row: `tmux new-session -d -s <name> -c <cwd>`; re-split from `window_layout` + `select-layout` if multi-pane; if scrollback snapshot exists, launch pane as `cat <snapshot>; exec $SHELL` (resurrect's trick).
5. Re-launch the agent **via its resume form**, not original argv: `claude --resume <agent_session_id>` (Claude), `codex resume <id>` / `codex resume --last` (Codex). Policy switch per user preference: *auto-resume* (send immediately) vs *armed* (zellij-style: type the command into the pane unexecuted, or show a "Resume" button in gmux chrome — safer default, since replaying an agent that was mid-tool-call warrants a human glance).
6. Mark rows `running`; anything that fails to spawn surfaces in the UI as `awaiting-restore` with the exact command shown.

**Why this beats resurrect/zellij:** deterministic resume of the *specific conversation* (not "some claude"); no ps-sniffing false positives; no allowlist mini-language; snapshot on mutation instead of 15-minute timer; names/projects/agent-ids are first-class instead of reverse-engineered.

### B.5 Comparison table

| Capability | tmux-resurrect + continuum | zellij native | **gmux manifest (recommended)** |
|---|---|---|---|
| Layout + cwd restore | Yes (tab-file + select-layout) | Yes (KDL, some flakiness #4129) | Yes (same tmux primitives) |
| Running-command restore | Static allowlist patterns, ps-sniffed | ps-sniffed, ENTER-to-run banner | Ground-truth argv recorded at spawn |
| **Agent conversation restore** | No (can't know session id) | No (can't know session id) | **Yes — `--resume <recorded id>`** |
| Scrollback text after reboot | Optional capture-pane archive | Optional viewport/scrollback serialization | Optional capture-pane snapshots |
| Save cadence | 15 min (status-line hook) | 1 s continuous | Event-driven + timed text snapshots |
| Autostart at login (macOS) | launchd plist + osascript Terminal (TCC Accessibility prompt) | None built-in | SMAppService login item (gmux owns it) |
| Maintenance (Aug 2026) | Dormant (last push Aug 2024) | Active (v0.44.3, May 2026) | You |
| License | MIT / MIT | MIT | — |

---

## Part C — macOS specifics

### C.1 Autostart at login

- **LaunchAgents run at login** (per-user), LaunchDaemons at boot (root, no GUI context — wrong tool: agents need the user's env, keychain, TCC identity). The raw plist route: `~/Library/LaunchAgents/com.gmux.agent.plist` with `RunAtLoad=true` pointing at a headless `gmux-agentd` that starts the tmux server and performs B.4's restore, so restoration happens even if the user doesn't open the GUI immediately.
- **Modern API (macOS 13+):** `SMAppService.agent(plistName:)` / `SMAppService.loginItem` — registers the agent from inside gmux.app with user-visible management in System Settings → Login Items. Prefer this over hand-installed plists; it also keeps TCC attribution tied to the app bundle.
- What continuum does here (osascript telling Terminal.app to open — triggering an **Accessibility/Automation TCC prompt** that silently kills autostart if declined) is a cautionary tale, not a pattern to copy. gmux needs no AppleScript: it starts its own server directly.

### C.2 TCC / Full Disk Access — the gotcha that will bite agents

macOS TCC gates `~/Documents`, `~/Desktop`, `~/Downloads`, etc. by **responsible process** — the app/binary that owns the process tree. Verified failure modes from the field:

- Terminal.app's children (including tmux and agents) inherit Terminal's FDA grant ([lapcatsoftware analysis](https://lapcatsoftware.com/articles/FullDiskAccess.html)), but a **launchd-spawned** process tree does *not* inherit any terminal app's grant — the responsible process is the agent binary/launchd context, and file access fails or prompts oddly ([nunn.au launchd/TCC write-up](https://nunn.au/2023/11/28/tcc-launchd-woes), [Apple dev forums](https://developer.apple.com/forums/thread/661178)).
- Directly on-point prior art: **cmux** (a gmux-like agent-multiplexer app) hit exactly this — `ls ~/Documents` inside its sessions returning *"Operation not permitted"* on macOS Tahoe while the same command works in Terminal ([manaflow-ai/cmux#2866](https://github.com/manaflow-ai/cmux/issues/2866), open as of Aug 2026).
- Extra wrinkle: the tmux *server* daemonizes, so TCC may attribute its children to the tmux binary itself rather than whatever launched it; the classic workaround users discover is dragging `/opt/homebrew/bin/tmux` into the FDA list.

**gmux design consequences:**

1. Have **gmux.app itself spawn the tmux server** as a child (both at login via SMAppService and at app launch) so the responsible process is gmux.app; ask the user for FDA **once** for gmux.app with a first-run explainer.
2. Ship a **first-run TCC self-test**: from inside a gmux-spawned tmux pane, attempt to stat a file in `~/Documents`; if denied, walk the user through granting FDA to gmux.app (and, as fallback for stubborn attribution, to the bundled tmux binary).
3. Bundle a pinned tmux binary inside gmux.app (ISC license permits it) — stable path for TCC grants, no Homebrew drift.
4. Test on each macOS major — TCC attribution semantics have changed repeatedly (11.4 broke helper-tool FDA: [mjtsai round-up](https://mjtsai.com/blog/2021/06/01/macos-11-4-breaks-full-disk-access-for-helper-tools/); Tahoe changed behavior again per the cmux issue).

### C.3 Sleep vs reboot

- **Sleep is a non-event** for local sessions: processes, PTYs, tmux server, and scrollback all survive; agents mid-turn simply pause (their HTTP request may time out and retry). No gmux action needed beyond tolerating a burst of `%output` on wake. (Anything over SSH inside a pane may drop — that's the remote host's problem, out of scope.)
- **Reboot kills everything**, including the "silent" reboots from macOS software updates. macOS's "Reopen windows when logging back in" restores *app windows*, never terminal child processes — this is precisely the gap the manifest fills.
- The tmux server is a plain background process; App Nap doesn't suspend it in practice (it's not an app bundle), and no `caffeinate` is needed for T1.

### C.4 Socket hygiene (repeat, because it will otherwise cost a debugging day)

Default socket in `/tmp` + macOS periodic cleanup ⇒ "server alive but unreachable" after ~3 days of uptime; recovery is `pkill -USR1 tmux` (documented in [tmux(1)](https://man7.org/linux/man-pages/man1/tmux.1.html)). gmux avoids the whole class: `TMUX_TMPDIR` under `~/Library/Application Support/gmux/`.

---

## Part D — Prior art: VS Code's terminal persistence (the design gmux is generalizing)

Verified from [VS Code docs](https://code.visualstudio.com/docs/terminal/advanced) and [source](https://github.com/microsoft/vscode/blob/main/src/vs/platform/terminal/common/terminal.ts):

- **Architecture:** terminals are owned by a separate **pty host process**, not the window/renderer — the exact separation tmux provides gmux. The pty host is health-monitored and auto-restarts (though a pty-host *crash* historically lost terminals — [#117548](https://github.com/microsoft/vscode/issues/117548) — because unlike tmux, the PTYs live *in* the pty host; gmux's tmux server is that same single-point-of-failure, hence T2 handling).
- **Process reconnection** (window reload): renderer reattaches to still-running PTYs. Source constants: `LocalReconnectConstants.GraceTime = 60000` (*"If there is no reconnection within this time-frame, consider the connection permanently closed"*) and `ShortGraceTime = 6000` (*"Maximal grace time between the first and the last reconnection"*). Remote adds a 3-hour reconnection window (`--reconnection-grace-time`). ⇒ gmux equivalent: tmux's grace period is **infinite** — strictly better; no grace-period engineering needed for T1.
- **Process revive** (app restart — the processes died): buffer text is serialized (xterm.js serialize addon), and on relaunch *"a terminal's content is restored and the process is relaunched using its original environment"* — restored text is visually marked as history. Settings: `terminal.integrated.enablePersistentSessions`, `persistentSessionScrollback`, `persistentSessionReviveProcess`. ⇒ This *is* the manifest approach in miniature: VS Code revives the shell but has no idea what was running in it. gmux goes one level deeper by reviving the **agent conversation** via recorded resume ids.

**Lesson:** VS Code needed two different mechanisms (reconnect vs revive) with different guarantees. gmux should present the same honest distinction in UX: after app restart "your sessions were never interrupted"; after reboot "restored: layout + conversation; the process itself is a fresh resume."

---

## Part E — The lifecycle spec (normative)

Legend: ✅ preserved bit-for-bit · 🔁 reconstructed (equivalent, not identical) · ⚠️ best-effort/lossy · ❌ gone.

### E.0 Create
`gmux new "auth-refactor" --project webapp --agent claude` ⇒ manifest row written (UUID pre-generated) → `tmux new-session -d -s auth-refactor -c ~/src/webapp` → pane runs `claude --session-id <uuid>` → gmux embeds view via `tmux attach -t auth-refactor`; control-mode client watches events.

### E.1 gmux quits or crashes → relaunch
- Agent process & PTY: ✅ (kept alive by tmux server; agent kept working while gmux was gone)
- Scrollback: ✅ (server memory; backfilled into the widget via `capture-pane -p -e -J -S -`)
- Names/layout: ✅ (server state; reconciled against manifest on launch)
- Shell env of running shells: ✅ (processes never died)
- Conversation: ✅ (process never died)
- gmux actions on relaunch: start-or-ping server → `tmux ls` → reattach views → done. **Zero data loss, by construction.**

### E.2 tmux server dies (T2 — rare)
- Processes/PTYs/scrollback in server memory: ❌
- Conversation: ✅ on disk (agent's own persistence)
- Recovery: identical to E.3 (manifest restore), minus the login-item trigger. Scrollback: ⚠️ only up to last snapshot.

### E.3 Machine reboot → login
- Agent processes, PTYs: ❌ (unrecoverable, by physics)
- Session names, project mapping, cwd, argv, agent ids: ✅ (manifest on disk)
- Layout: 🔁 (`window_layout` + `select-layout`)
- Scrollback: ⚠️ inert text up to last snapshot, `cat`-ed above a fresh shell (attributes preserved via `-e` if the widget re-renders them)
- Shell env (exports, venvs, ssh-agent state accumulated interactively): ❌ fresh shell (document this honestly; VS Code has the same hole)
- **Conversation: ✅** — `claude --resume <uuid>` / `codex resume <id>` reloads full history from the agent's own files. In-flight tool executions at the moment of reboot: ⚠️ the transcript survives; the interrupted tool call's side effects are the agent's/user's to reconcile on resume.
- Trigger: SMAppService login item → gmux/agentd runs B.4 algorithm → sessions appear either auto-resumed or "armed" awaiting one click/ENTER (user preference; armed is the safer default).

### E.4 Sleep/wake
Everything ✅; no action.

---

## Acceptance tests (the mechanism is only real if these pass)

1. Start agent in named session; `kill -9` gmux; relaunch → same PTY (verify agent PID unchanged), full scrollback, name intact.
2. Quit gmux for 30 min while agent works → relaunch shows output produced while detached (server scrollback, not snapshot).
3. Reboot mid-conversation → after login, session `auth-refactor` exists in cwd with prior scrollback text visible and `claude --resume <uuid>` armed; running it shows the full prior conversation.
4. Reboot with 12 sessions across 3 projects → all 12 restored under correct project tabs, correct cwds, correct agent resume ids; total restore < 5 s.
5. TCC test: agent in restored session can read `~/Documents` after the one-time gmux.app FDA grant (regression-test per macOS major).
6. Socket longevity: server up 7+ days → still reachable (dedicated `TMUX_TMPDIR` proves out).
7. Kill tmux server (`tmux kill-server`) → gmux detects via control-client `%exit`, offers manifest restore (T2 path).

---

## Bottom line for gmux

1. **T1 via tmux, non-negotiable and boring:** dedicated tmux server (bundled ISC-licensed binary, own socket dir under `~/Library/Application Support/gmux/`, own conf: `exit-empty off`, big `history-limit`, status off). One embedded terminal per named session running `tmux attach -t <name>`; one control-mode client as event bus; `capture-pane -p -e -J -S -` for instant backfill. This alone delivers the killer feature for every app-restart/crash case with zero loss.
2. **T3 via a gmux-owned manifest, not resurrect/zellij:** record `{name, project, cwd, argv, env, agent, agent_session_id}` at spawn (pre-assign Claude's UUID with `--session-id`; harvest Codex's rollout id). On login (SMAppService), recreate sessions with resurrect's *primitives* (new-session/select-layout/`cat snapshot; exec $SHELL`) but relaunch agents with their **recorded resume commands**. Default to zellij-style "armed, one keypress to resume"; offer full auto-resume as a setting.
3. **Steal designs, not dependencies:** resurrect (dormant since 2024) contributes the layout/scrollback tricks; zellij contributes continuous-serialization + ENTER-to-run UX; VS Code contributes the reconnect-vs-revive honesty. None of the three can restore the *conversation* — the manifest can, and that's gmux's differentiator.
4. **Budget real time for macOS TCC:** spawn the tmux server from gmux.app so TCC attributes agents to gmux; one-time FDA grant with a first-run self-test; regression-test each macOS release (cmux#2866 shows this failure shipping in a competitor today).
5. **Be honest in UX about the tiers:** "never interrupted" (app restart) vs "restored" (reboot: layout + conversation real; process fresh; interactive shell env gone). VS Code drew the same line; users accept it when it's labeled.

---

## Appendix F — Building and shipping tmux inside a signed gmux.app

Every other link in the P1 chain cites prior art; this one needs its own, because iTerm2 — the reference tmux GUI — does **not** bundle tmux (it drives whatever tmux the user or remote host provides, which is exactly why it carries 1.8→3.7 version-compat code). The closest named precedent for the *pattern* is **Postgres.app**, which ships the entire PostgreSQL server — daemonizing CLI binaries plus their dylibs, under `Contents/Versions` — in a Developer ID-signed, notarized Mac app: its build scripts `codesign --force --timestamp --options runtime` every nested binary and dylib, then `xcrun notarytool submit --wait` + `xcrun stapler staple` the DMG ([PostgresApp `buildscripts/01-build.sh` + `02-notarize.sh`](https://github.com/PostgresApp/PostgresApp/tree/master/buildscripts)). **VimR** does the same for a bundled CLI (the Neovim binary + runtime; releases are "Universal signed and notarized" — [qvacua/vimr](https://github.com/qvacua/vimr)). gmux's single ISC-licensed tmux binary is a strictly smaller instance of both.

**F.1 Linkage — static libevent/ncurses, dynamic libSystem.** tmux needs libevent and a terminfo library (ncurses). Fully static executables are not supported on macOS (libSystem must be linked dynamically), so the shipping shape is: libevent and ncurses built from source as static archives (`--enable-static`; ncurses with `--with-termlib` if the tinfo split is wanted) and linked into a tmux whose only dynamic dependencies are Apple system dylibs — a long-standard recipe with one-script builds on record ([mbreese's static-tmux script](https://gist.github.com/mbreese/b0630195e57874c87ef3611d059d1bc2), [pistol's gist](https://gist.github.com/pistol/5069697), [tessus's variant](https://gist.github.com/tessus/5e118d44261a6ab2f198)). Static-linking the deps beats the alternative — relocating the Homebrew bottle by rewriting its libevent/ncurses install names to `@executable_path/../Frameworks` with `install_name_tool` — because relocation leaves three Mach-Os to sign instead of one, invalidates the existing signatures (mandatory re-sign), and inherits Homebrew's build flags; it remains acceptable for Phase 0's throwaway spike bundle. Either way the binary lands in `Contents/MacOS/` (or `Contents/Helpers/`) per Apple's bundle-layout rules ([Placing content in a bundle](https://developer.apple.com/documentation/bundleresources/placing-content-in-a-bundle)), at the pinned path Part C.2's FDA fallback grant targets.

**F.2 Terminfo.** Two directions to cover. *Outward* (the TERM the attach client presents): xterm.js advertises `xterm-256color`, present in every macOS terminfo database — no action needed. *Inward* (what panes see): `gmux-tmux.conf` sets `default-terminal "tmux-256color"`. Since macOS 14 (Sonoma) the system database at `/usr/share/terminfo` is ncurses-6.0-based and ships a `tmux-256color` entry, so on gmux's supported floor (macOS 14+; current is Tahoe) relying on the system database requires zero bundling. On macOS 13 and earlier the entry is missing (the system ncurses was 5.7-era) — the classic breakage Homebrew's tmux formula papered over by overriding `default-terminal` ([Homebrew/homebrew-core#103368](https://github.com/Homebrew/homebrew-core/issues/103368); full history and the `tic -x` fix in [gpanders' definitive guide](https://gpanders.com/blog/the-definitive-guide-to-using-tmux-256color-on-macos/)). Belt-and-braces against OS drift: compile the entry at build time (`/usr/bin/tic -x -o`) into `Contents/Resources/terminfo` and spawn the tmux server — and hence its panes — with `TERMINFO_DIRS=<bundled>:/usr/share/terminfo`. Note the statically linked ncurses has its terminfo search path compiled in, so either configure it (`--with-default-terminfo-dir=/usr/share/terminfo`, `--with-terminfo-dirs`) or rely on the exported `TERMINFO_DIRS`, which is runtime-controlled and version-proof.

**F.3 Signing and notarizing a nested daemonizing CLI.** Notarization requires every Mach-O in the bundle to be Developer ID-signed with hardened runtime and a secure timestamp; a missed nested binary is the canonical rejection ("The executable does not have the hardened runtime enabled" — [Apple: Resolving common notarization issues](https://developer.apple.com/documentation/security/resolving-common-notarization-issues)). Signing is inside-out: nested binary first, app last. tmux needs **no entitlements**: no JIT, no unsigned executable memory, and hardened-runtime library validation is satisfied because the statically linked binary loads only Apple system dylibs — contrast Postgres.app, which must carry `com.apple.security.cs.disable-library-validation` and `allow-unsigned-executable-memory` ([postgres.entitlements](https://github.com/PostgresApp/PostgresApp/blob/master/buildscripts/postgres.entitlements)) so third-party Postgres extensions can load, a problem gmux does not have. That tmux daemonizes (forks and outlives its parent) is irrelevant to codesign — signature validity is checked at exec of the signed binary — but it is exactly why the binary must live at one stable signed path: TCC attributes the daemon's children to that binary (Part C.2). In gmux's electron-builder pipeline this is configuration, not scripting: `hardenedRuntime: true` is the default, the `mac.binaries` option exists precisely to list "embedded CLIs, helper tools" for signing, and notarization submits the whole .app, covering the nested code ([electron.build mac config](https://www.electron.build/docs/mac/), [notarization](https://www.electron.build/docs/features/code-signing/notarization/)).
