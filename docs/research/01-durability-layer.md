# gmux research 01 — The terminal-session durability layer

**Dimension:** the thing that keeps a *named* terminal session (and the live process inside it — a running Claude Code / Codex CLI agent) alive independent of any GUI, so the gmux app can crash, restart, or be quit without killing the agents.

**Researched:** August 2026. All release/maintenance facts verified against GitHub/APIs and primary docs as of 2026-08-09.

---

## 1. What "durable" actually means on macOS — three distinct tiers

Before comparing tools, it is critical to decompose P1, because no single tool covers all tiers and vendors routinely blur them:

| Tier | Event | Can a mux keep the *process* alive? | Mechanism |
|---|---|---|---|
| T1 | gmux app quits/crashes/updates | **Yes** | Mux server is a separate daemon process; GUI just detaches/reattaches |
| T2 | macOS user logs out (no reboot) | **Mostly no** (by default) | loginwindow tears down the user's session processes at logout; LaunchAgents are stopped at logout too. Only a root LaunchDaemon (running with `UserName` set, outside the Aqua session) survives — workable but awkward (no Aqua services, locked keychain, different env). In practice nobody does this for local dev |
| T3 | Machine reboots | **No — impossible** | Processes cannot survive a reboot. "Reboot survival" always means: *serialize state → on boot, re-create sessions and re-run commands* (tmux-resurrect, zellij serialization, or app-level logic) |

Key consequence for gmux: **T1 is what the mux buys you and it buys it completely.** T3 is *never* process survival — it is a restore-by-relaunch story, and because gmux knows exactly which agent ran in each session (and agents have first-class resume: `claude --resume <session-id>`, `codex resume`), gmux can implement T3 restore itself far more reliably than any generic plugin that tries to guess running commands from `ps`. T2 is a corner case (logout-without-reboot is rare for this persona); treat it as T3.

Evidence on the T2 point: LaunchAgents stop at logout by design ([Apple community discussion](https://discussions.apple.com/thread/2736676), [launchd-dev thread](https://launchd-dev.macosforge.narkive.com/TQhmrgxX/facing-problem-with-launch-daemon-on-logout)). The equivalent Linux problem (tmux killed with the login session's systemd scope) is well documented, e.g. [agent-deck issue #958](https://github.com/asheshgoplani/agent-deck/issues/958) and [Arch forums](https://bbs.archlinux.org/viewtopic.php?id=294348); macOS has no `loginctl enable-linger` equivalent for the Aqua session.

Scrollback is a fourth axis: the mux server holds pane history in RAM (tmux `history-limit`), so scrollback survives T1 detach/reattach for free; surviving T3 requires explicit serialization (tmux-resurrect's `@resurrect-capture-pane-contents`, zellij's `scrollback_lines_to_serialize`) or gmux persisting its own render buffer.

---

## 2. Candidates at a glance

| Project | What it is | License | Latest release | Activity (verified) | macOS | Panes/windows | External control API | Reboot-restore story |
|---|---|---|---|---|---|---|---|---|
| **tmux** | Full multiplexer, client-server | ISC (GitHub API) | **3.7b, 2026-07-01** ([releases](https://github.com/tmux/tmux/releases)) | Very active — last commit 2026-08-07 | First-class (Homebrew) | Yes | **CLI + formats + control mode (`-CC`)** — best in class | tmux-resurrect / continuum (plugins) or app-level |
| **zellij** | Rust multiplexer, batteries included | MIT (GitHub API) | **v0.44.3, 2026-05-13** ([releases](https://github.com/zellij-org/zellij/releases)) | Very active; 0.44.0 (2026-03) added remote sessions, Windows, CLI automation ([news](https://zellij.dev/news/)) | Yes | Yes | CLI (`zellij action …`), plugins, web client. **No control mode — open feature request** ([#3965](https://github.com/zellij-org/zellij/issues/3965)) | **Built-in serialization/resurrection** ([docs](https://zellij.dev/documentation/session-resurrection.html)) — with reliability caveats (§4) |
| **GNU screen** | The original multiplexer | GPL-3.0+ | 5.0.1, 2025-05-12 ([announcement](https://lists.gnu.org/archive/html/screen-users/2025-05/msg00005.html)) | Maintained but slow; 5.0.1 was a security release for 6 CVEs ([SUSE audit](https://security.opensuse.org/2025/05/12/screen-security-issues.html)) | Yes | Yes (weaker) | `screen -X` stuffing only; no formats, no control mode | None built in |
| **shpool** | "tmux, then aim lower" — session persistence only, no multiplexing (Google-originated, Rust) | Apache-2.0 ([repo](https://github.com/shell-pool/shpool)) | **v0.11.0, 2026-06-12** (GitHub API) | Active | "Functional, some tests don't pass"; Linux is primary; [Homebrew tap](https://github.com/shell-pool/homebrew-shpool) | **No** | CLI (`shpool list` has JSON output) | None (restore buffer on reattach only) |
| **dtach** | Tiny detach-only tool (socket = session) | GPL-2.0 | v0.9, 2016 | Dormant | Compiles | No | Socket path conventions only | None |
| **abduco** | dtach redone by the dvtm author | ISC | 0.6, 2017; **last commit 2020-04-30** (GitHub API) | **Unmaintained** despite README claims ([repo](https://github.com/martanne/abduco)) | Compiles | No | Socket dir conventions | None |
| **zmx** | New (2025–26) minimal attach/detach tool by neurosnap/pico.sh | MIT (GitHub API); v0.7.0 | Active — pushed 2026-08-05 ([zmx.sh](https://zmx.sh/)) | Young | macOS + Linux binaries | No (delegates windowing to the OS — same philosophy as gmux) | CLI; can send commands without attaching | Restores terminal state/output on reattach; no reboot story |
| **wezterm-mux-server** | WezTerm's Rust mux daemon | MIT | Last *tagged* release 20240203 ([discussion #6775](https://github.com/wezterm/wezterm/discussions/6775)); nightlies only since | Commits continue (last 2026-08-05) but explicitly a spare-time project; stale-project concerns filed by users ([#7451](https://github.com/wezterm/wezterm/issues/7451)) | Yes | Yes (domains/tabs/panes) | Custom versioned binary PDU codec, in-tree crates (`mux`, `codec`, `wezterm-mux-server-impl`) — not a stable public protocol ([architecture](https://deepwiki.com/wezterm/wezterm/2.2-multiplexer-architecture)) | `wezterm.mux` Lua on startup; no process resurrection |
| **mosh** | Roaming/latency layer for *remote* shells | GPL-3.0 | 1.4.0, Oct 2022 ([announcement](https://mailman.mit.edu/pipermail/mosh-devel/2022-October/001621.html)); commits trickle (last 2026-03-06) | Semi-dormant | Yes | No | No | N/A — solves a different problem (§9) |

---

## 3. tmux — the deep dive

### 3.1 Named sessions and the CLI as an API

tmux's server is a per-user daemon that owns every session/window/pane PTY. Everything gmux needs is a one-liner against a dedicated socket (isolate gmux from the user's personal tmux with `-L gmux`):

```bash
tmux -L gmux new-session -d -s "acme-api/claude-1" -c ~/src/acme-api 'claude'
tmux -L gmux list-sessions -F '#{session_name}|#{session_created}|#{session_attached}'
tmux -L gmux rename-session -t "acme-api/claude-1" "acme-api/claude-auth-bug"
tmux -L gmux send-keys -t "acme-api/claude-1" 'git status' Enter
tmux -L gmux capture-pane -t "acme-api/claude-1" -p -e -J -S -50000   # full history w/ colors
tmux -L gmux kill-session -t "acme-api/claude-1"
```

The **format system** (`-F '#{...}'`, ~300 variables, filters, conditionals) makes list/inspect operations machine-readable without parsing human output. Session names are stable, user-visible, first-class — exactly P1's "named" requirement. IDs (`$n` sessions, `@n` windows, `%n` panes) are immutable handles; best practice is to address by ID and treat names as display metadata ([Control Mode wiki, best-practices section](https://github.com/tmux/tmux/wiki/Control-Mode)). tmux also has **user options** (`set -t @pane @gmux-agent 'claude'`) — arbitrary key/value storage *on the server itself*, per session/window/pane, which gmux can use to tag sessions with agent type, project path, and agent session-ID so the durable state lives with the durable process.

Maintenance: extremely healthy. 3.6 (Jan 2026) added pane scrollbars, theme (dark/light mode) reporting ([linuxiac](https://linuxiac.com/tmux-3-6-update-adds-scrollbars-new-theme-mode/)); 3.7b shipped 2026-07-01; commits within the last week. License ISC — fork/embed-friendly.

### 3.2 Control mode (`tmux -C` / `-CC`) — the integration API, in detail

Control mode turns a tmux *client* into a text protocol endpoint: the client sends ordinary tmux commands as lines of text; tmux replies with guarded output blocks and pushes asynchronous `%`-prefixed notifications. It was designed by George Nachman specifically so iTerm2 could render tmux windows/panes as native UI ([tmux wiki: Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode)) — i.e., *exactly* the gmux architecture: GUI renders, tmux persists.

**Session bootstrap:** `tmux -L gmux -CC new-session -A -s name` (attach-or-create). `-C` leaves the tty in canonical mode (good for testing by hand); `-CC` disables echo/canonical mode and emits `\033P1000p` (DCS) on entry and `%exit` + ST on exit. From a GUI you spawn `tmux -CC attach -t name` on a PTY you own and speak the protocol over it.

**Command/response framing.** Every command's output is bracketed:

```
%begin <epoch-seconds> <cmd-number> <flags>
...output (or error text)...
%end   <epoch-seconds> <cmd-number> <flags>     # success
%error <epoch-seconds> <cmd-number> <flags>     # failure
```

Responses are strictly ordered by command number, so a client keeps a FIFO of pending commands and pairs them up — simple and reliable.

**Asynchronous notifications** (the live-update feed gmux would consume):

| Notification | Meaning |
|---|---|
| `%output %<pane> <data>` | Pane produced output. Data is **octal-escaped**: bytes < 0x20 and `\` become `\ooo` (older tmuxes escaped all non-ASCII too — handle both). Data is terminal escape sequences re-emitted by tmux for the client's declared TERM |
| `%extended-output %<pane> <age-ms> ... : <data>` | Replaces `%output` when flow control is on; includes how far behind the client is |
| `%pause %<pane>` / `%continue %<pane>` | Flow control (below) |
| `%layout-change @<window> <layout> <visible-layout> <flags>` | Window layout string changed (client re-parses the layout string to reposition panes) |
| `%window-add @w`, `%window-close @w`, `%window-renamed @w name`, `%window-pane-changed @w %p` | Window lifecycle |
| `%session-changed $s name`, `%sessions-changed`, `%session-renamed`, `%session-window-changed $s @w` | Session lifecycle |
| `%pane-mode-changed %p` | e.g. pane entered copy mode |
| `%subscription-changed name ... : value` | Push update for a format subscription (below) |
| `%exit [reason]` | Control client is done (detached, killed, server exit) |

**Flow control / pause mode** (tmux ≥3.2, added *for* iTerm2): `refresh-client -f pause-after=N` switches to `%extended-output`; if the client falls >N seconds behind on a pane, the server sends `%pause` and stops streaming that pane instead of buffering unboundedly or stalling the whole server; the client resumes with `refresh-client -A '%p:continue'` (and on resume replays via history). Without this, a slow GUI reading a fire-hosing agent pane was the classic control-mode failure mode. gmux must enable this.

**Format subscriptions**: `refresh-client -B 'name:type:format'` pushes `%subscription-changed` whenever a format's value changes (rate-limited to 1/s) — e.g. subscribe to `#{pane_current_command}`/`#{pane_current_path}` across all panes (`%*`) to drive gmux's sidebar without polling.

**Sizing**: a control client declares its size with `refresh-client -C WxH`. With `window-size latest` (tmux ≥2.9) each window sizes to the most recently active client, which removed most of the historical "all windows are the size of the smallest client" pain; iTerm2 still documents that all windows in one tmux client share a grid-cell geometry, causing occasional gaps in split layouts ([iTerm2 docs](https://iterm2.com/documentation-tmux-integration.html)).

**History replay on attach**: there is no notification that dumps existing pane content; the client attaches, walks windows/panes (`list-windows -F`, `list-panes -F`), then issues `capture-pane -p -e -J -S -<lines>` per pane to rebuild scrollback, then applies `%output` deltas. This is exactly what iTerm2 does. It works, but it's a burst of round-trips per attach — fine locally, noticeable over SSH.

**Known pain points** (from iTerm2's tracker and the wiki):

1. **Octal escaping bloat + reassembly** — every control byte costs 4 bytes on the wire; UTF-8 sequences can be split across `%output` lines, so the unescaper must operate on a byte stream, not line-at-a-time. Manageable, purely local cost.
2. **No version/capability negotiation** — the protocol is unversioned; clients sniff the tmux version and feature-gate (iTerm2 carries compatibility code across tmux 1.8→3.7). For gmux this evaporates: **bundle a pinned tmux binary** inside the app and target exactly one version.
3. **tmux is a terminal-in-the-middle** — it parses app output into its own grid and re-emits. Sequences tmux doesn't model are dropped or need `allow-passthrough`; kitty-protocol extras aren't fully supported (extended keys / CSI u via the `extended-keys` option are). For ANSI-standard agent CLIs (Claude Code, Codex CLI) this is a non-issue in practice — millions of agent-hours run inside tmux today.
4. **Performance under massive output** — historical complaints ([iTerm2 #7899](https://gitlab.com/gnachman/iterm2/-/issues/7899), [#8953](https://gitlab.com/gnachman/iterm2/-/issues/8953)) predate pause mode; with `pause-after` + capture-pane replay this is solved architecture, but gmux should still throttle rendering per pane.
5. **Attach race quirks** — e.g. iTerm2 occasionally failing to open a window on `-CC` attach ([iTerm2 #11174](https://gitlab.com/gnachman/iterm2/-/issues/11174)); the class of bug exists, plan integration tests.

**Who consumes control mode besides iTerm2?** Honest answer: **iTerm2 is the only production-grade consumer.** Everything else is small or experimental: an Emacs client ([csheaff/tmux-control](https://github.com/csheaff/tmux-control), renders via Eat), assorted write-ups; trzsz's "tmuxcc" page is documentation *of iTerm2*, not an independent client ([trzsz.github.io/tmuxcc](https://trzsz.github.io/tmuxcc)). The big ecosystems drive tmux via the plain CLI instead: [libtmux/tmuxp](https://github.com/tmux-python/libtmux) (Python, subprocess+formats), the crop of tmux MCP servers (e.g. [nickgnd/tmux-mcp](https://glama.ai/mcp/servers/@nickgnd/tmux-mcp)), and agent managers like claude-squad (§11). Implication: the protocol is stable and proven (iTerm2 has bet on it for a decade) but you are writing your own client — budget ~2–4 weeks for a robust control-mode client library (iTerm2's is open source, GPL-2, readable as a reference; a clean-room Swift/Rust implementation is not large: framing, unescaping, layout-string parsing, notification dispatch).

**A pragmatic hybrid** many tools use and gmux should consider: **don't use `-CC` for rendering at all.** Run one *regular* `tmux attach -t <session>` per gmux terminal view inside a PTY, and let gmux's embedded terminal emulator render it like any terminal app (with `status off`, `prefix None`, mouse off — tmux becomes invisible); use the plain CLI + a single lightweight `-C` control client only for *events and metadata* (session lists, `%sessions-changed`, subscriptions). This gets full fidelity rendering with ~10% of the protocol work; the cost is one tmux client process per visible pane (cheap) and scrollback living in tmux rather than the GUI (solvable via `capture-pane` import or tmux's own copy mode). iTerm2 chose full `-CC` because it wanted tmux windows to *be* native tabs; gmux controls its own layout anyway.

### 3.3 tmux-resurrect + tmux-continuum (the T3 story)

- [tmux-resurrect](https://github.com/tmux-plugins/tmux-resurrect) (MIT): saves sessions/windows/panes, names, layouts, cwd per pane, and optionally pane contents (`@resurrect-capture-pane-contents`) to text files; restores by re-creating everything and **re-running whitelisted programs** (`set -g @resurrect-processes 'ssh psql "~claude"'` — `~` = match by prefix). It does *not* checkpoint process state; it re-launches commands.
- [tmux-continuum](https://github.com/tmux-plugins/tmux-continuum) (MIT): auto-saves every 15 min and auto-restores on server start; on macOS it can auto-start tmux at login via a generated LaunchAgent.
- Maintenance reality check (GitHub API `pushed_at`): resurrect last pushed **2024-08-13**, continuum **2024-08-02** — dormant since Aug 2024. They are feature-complete and universally used, but effectively in maintenance-freeze — fine to borrow ideas from, risky to depend on for a product.
- Verdict for gmux: **use the technique, not the plugin.** Resurrect must *guess* what was running via process inspection; gmux *knows* (it launched `claude` itself, and can capture the Claude Code session UUID). Store `{name, project, cwd, agent, agent-session-id, layout}` in gmux's own store (or tmux user options mirrored to disk), and on boot re-create sessions and run `claude --resume <id>` / `codex resume`. This is strictly more reliable than any generic solution — and it's the actual P1 "ideal" behavior.

### 3.4 tmux on macOS specifics

- Install: Homebrew, or **bundle a static-ish tmux + libevent inside gmux.app** (recommended: version pinning kills the protocol-skew problem; ISC license permits it).
- `reattach-to-user-namespace` is **no longer needed** — pasteboard access from tmux works on modern macOS/tmux ([historical context](https://github.com/sirupsen/tmux-MacOSX-pasteboard)).
- Server lifetime: survives gmux quitting (T1) by construction. Dies on GUI logout (T2) and reboot (T3) — see §1. A LaunchAgent (`KeepAlive`, `RunAtLoad`) that runs `tmux -L gmux start-server` plus gmux's restore step at login gives "reboot survival" UX; continuum does the same trick.
- One sharp edge: upgrading the tmux binary does not upgrade a running server — clients and server must speak the same internal version; a bundled tmux on its own socket (`-L gmux`) sidesteps collisions with a user's Homebrew tmux entirely.
- Server crash = all sessions die. Rare, but it's the reason to *also* persist restore metadata continuously (gmux-side), not only rely on the living server.

---

## 4. zellij

- MIT, very active: v0.44.3 (2026-05-13); 0.43 (Aug 2025) added a **web client** (serve sessions to a browser over HTTP/WS); 0.44 (Mar 2026) added remote sessions ("web client everywhere"), Windows support, CLI automation ([zellij.dev/news](https://zellij.dev/news/), [releases](https://github.com/zellij-org/zellij/releases)).
- **Session serialization/resurrection is built in and on by default**: every session is periodically serialized (KDL layout) to the cache dir; `zellij ls` shows dead sessions marked EXITED; `zellij attach <name>` resurrects them ([docs](https://zellij.dev/documentation/session-resurrection.html)). What's restored: tab/pane layout, cwds, and *the command that ran in each command-pane*; commands are **not auto-re-run** by default — resurrected command panes wait for Enter per pane (or `--force-run-commands` to re-run all, with the docs' own warning about destructive commands). Viewport/scrollback serialization is opt-in: `pane_viewport_serialization true`, `scrollback_lines_to_serialize N` ([options](https://zellij.dev/documentation/options.html)).
- **Maturity caveats (2026):** command detection "is not perfect — it often doesn't work well with command wrappers" (their words; a `post_command_discovery_hook` was added so users can rewrite mis-detected commands); open reliability issues include inconsistent serialization/resurrection ([#4129](https://github.com/zellij-org/zellij/issues/4129)) and resurrection breakage reports as recent as Jan 2026 ([#4641](https://github.com/zellij-org/zellij/issues/4641) area); dead-session cache management is a recurring annoyance ([discussion #4971](https://github.com/zellij-org/zellij/discussions/4971)). Important scoping: a shell pane resurrects as a *shell*, not the `claude` conversation that was running under it — so for gmux's purposes zellij's built-in resurrection still doesn't remove the need for app-level `claude --resume` logic.
- **The disqualifier for gmux's architecture: no control mode.** There is no protocol by which an external GUI can subscribe to pane output and render sessions in its own UI. That's an open, unassigned feature request (opened Feb 2025, no linked PRs as of Aug 2026): [#3965](https://github.com/zellij-org/zellij/issues/3965). External surface today = CLI (`zellij ls`, `attach`, `kill-session`, `action rename-session`, `action write-chars`, `run`, `pipe`), WASM plugins (run *inside* zellij), and the new web client (renders zellij's *own* UI in a browser — not embeddable primitives). A gmux-on-zellij would have to run `zellij attach` inside its own terminal emulator with zellij's chrome hidden — workable (this is cmux's plan, §11) but you're driving the mux through its TUI, with strictly less introspection than tmux formats give you.
- Rendering-fidelity note: zellij supports the kitty keyboard protocol (tmux does not, beyond CSI u extended-keys), one of the reasons cmux picked it ([cmux #1663](https://github.com/manaflow-ai/cmux/issues/1663)).

## 5. GNU screen

GPL-3.0+; v5.0.1 (2025-05-12) was a security release after SUSE's audit found six CVEs, several *introduced by* the 5.0.0 rewrite of multi-user/setuid code ([SUSE writeup](https://security.opensuse.org/2025/05/12/screen-security-issues.html), [Phoronix](https://www.phoronix.com/news/GNU-Screen-5.0.1)). Named sessions (`screen -S`), detach/attach work fine, but the automation surface is `screen -X stuff …` and `-Q` queries — no format system, no event stream, no control mode; scripting a GUI on top means scraping. No built-in restore. Slow-moving project. **No reason to choose it over tmux in 2026** for this use case; the GPL also complicates any embed/fork ambitions.

## 6. dtach, abduco, zmx (the minimalists)

- [dtach](https://github.com/crigler/dtach) (GPL-2.0, v0.9 2016, dormant): attach/detach on a socket, nothing else — no scrollback preservation (reattach redraws only what the program repaints), no session listing beyond your own socket-dir convention.
- [abduco](https://github.com/martanne/abduco) (ISC): nicer dtach with a session list; **last commit 2020-04-30 — unmaintained** despite the README's "actively maintained" claim.
- [zmx](https://zmx.sh/) ([repo](https://github.com/neurosnap/zmx), MIT, v0.7.0, actively pushed Aug 2026): the modern entrant with exactly gmux's philosophy — persistence only, "let your windowing be handled by your OS." Restores terminal state and output on reattach, multiple simultaneous clients, can send input to a detached session. Attractive minimalism, but: single-maintainer, young, no event/subscription API, no rich introspection, no reboot story. Worth watching, not worth betting the killer feature on today.

The structural problem with all detach-only tools for gmux: **the session state (scrollback, size handling, redraw) lives in whatever redraw trick the tool uses**, not in a server-side grid you can query. tmux gives gmux `capture-pane`, formats, and events; these give you a socket.

## 7. shpool

[shell-pool/shpool](https://github.com/shell-pool/shpool) — Apache-2.0, Rust, Google-originated ("think tmux, then aim... lower"). Named sessions (`shpool attach main`), `shpool list` (JSON available), daemon auto-spawn (no systemd needed — relevant on macOS), sessions-only (no panes/windows — fine, gmux does layout). Reattach restores the screen or last-N-lines from a restore buffer (`session_restore_mode`), which is weaker than tmux's full queryable history. Actively maintained: **v0.11.0, 2026-06-12** (GitHub API). But macOS is explicitly second-tier: "mac currently still has a few tests which don't pass" (README). No event stream, no output-subscription protocol — gmux would attach a PTY per session and scrape, same as with zellij, with less ecosystem around it. **A credible plan B if tmux ever felt too heavy; not plan A for a Mac-first product.**

## 8. wezterm-mux-server

WezTerm's mux daemon does real client-server multiplexing with domains (local, SSH, TLS) and would in principle let a GUI render remote panes natively — the architecture is genuinely close to what gmux wants ([multiplexer architecture](https://deepwiki.com/wezterm/wezterm/2.2-multiplexer-architecture)). MIT-licensed Rust crates: `mux` (windows/tabs/panes/domains singleton), `codec` (LEB128-framed, *versioned-in-lockstep* PDUs — client and server must match versions), `wezterm-mux-server(-impl)`.

Why it's not the pick:

1. **The protocol is private.** It's an internal codec with no stability guarantee; version skew between client and server is simply unsupported. Consuming it means vendoring wezterm's crates (they're in-tree, largely unpublished) and inheriting a very large codebase's compile graph — realistic only if gmux itself were a Rust app willing to embed half of wezterm.
2. **Maintenance risk.** No tagged stable release since **2024-02-03**; the maintainer confirms it's a spare-time project and points users at nightlies ([discussion #6775](https://github.com/wezterm/wezterm/discussions/6775)); "is this project dead?" issues appear ([#7451](https://github.com/wezterm/wezterm/issues/7451)); known mux-server hangs under load ([#7692](https://github.com/wezterm/wezterm/issues/7692)). Commits do continue (last 2026-08-05), but this is one busy person's hobby vs tmux's 20-year multi-committer track record.
3. No resurrection story (mux server persistence is T1-only; `wezterm.mux` Lua can script startup layouts but nothing serializes running sessions).

## 9. mosh (and friends) — wrong layer, worth stating why

[mosh](https://mosh.org/) (GPL-3.0) solves *network* problems for **remote** shells: UDP-based state-sync (SSP), client roaming/IP changes, predictive local echo. It explicitly does **not** provide: named sessions, detach/reattach from a different client, multiple sessions, or scrollback — scrollback is famously absent because the protocol syncs only the visible screen ([issue #122](https://github.com/mobile-shell/mosh/issues/122)); their own advice is "run tmux inside mosh." Release cadence: 1.4.0 in Oct 2022 was the first release in five years ([announcement](https://mailman.mit.edu/pipermail/mosh-devel/2022-October/001621.html)); sporadic commits since (last 2026-03-06). For gmux — a *local-first* Mac app — mosh is irrelevant to P1. If gmux later adds "attach to sessions on my devbox," the durability still comes from tmux *on the remote host*; mosh (or Eternal Terminal) would merely be the transport underneath `tmux -CC attach`. iTerm2's tmux integration runs fine over plain ssh today.

---

## 10. Head-to-head for the gmux architecture ("GUI renders, mux persists")

| Requirement | tmux | zellij | screen | shpool | dtach/abduco/zmx | wezterm mux |
|---|---|---|---|---|---|---|
| Named sessions, create/list/rename/kill from a GUI process | ✅ CLI+formats, atomic, machine-readable | ✅ CLI (less introspection) | ⚠️ scrape-y | ✅ CLI+JSON | ⚠️ DIY conventions | ⚠️ `wezterm cli`, private protocol |
| Survive GUI quit/crash (T1) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Event stream → GUI (output, session/window changes) | ✅ **control mode**: `%output`, notifications, subscriptions, flow control | ❌ (open issue [#3965](https://github.com/zellij-org/zellij/issues/3965)) | ❌ | ❌ | ❌ | ⚠️ private PDU protocol |
| Scrollback held server-side + queryable | ✅ `history-limit` + `capture-pane -e -J -S` | ⚠️ internal; serialize-to-disk opt-in | ⚠️ | ⚠️ restore buffer | ❌ | ✅ internal, not queryable externally |
| Reboot restore primitives (T3) | ✅ resurrect/continuum precedent; better done app-level | ✅ built-in serialization (caveats §4) | ❌ | ❌ | ❌ | ❌ |
| Proven as an embedded backend for a GUI | ✅ **iTerm2, 10+ years** | ❌ (cmux attempting now) | ❌ | ❌ | ❌ | ⚠️ only inside wezterm itself |
| License for bundling/forking | ✅ ISC | ✅ MIT | ⚠️ GPL-3 | ✅ Apache-2 | GPL-2 / ISC / MIT | ✅ MIT |
| Maintenance health (Aug 2026) | ✅✅ | ✅✅ | ⚠️ | ✅ | ❌ / ❌ / young | ⚠️ |

## 11. Prior art — people building gmux-shaped things, and what they chose

- **[claude-squad](https://github.com/smtg-ai/claude-squad)** (Go TUI, AGPL-3.0): manages multiple Claude Code/Codex/Gemini/Aider agents; **uses tmux** for isolated durable sessions + git worktrees per agent. Validates tmux-as-agent-substrate; note the AGPL if reading its code.
- **[cmux](https://github.com/manaflow-ai/cmux/issues/1663)** (Ghostty-based GUI multiplexer): hit exactly gmux's P1 gap ("live terminal processes are not restored" across ⌘Q) and is, as of March 2026, integrating **zellij** underneath — one deterministic zellij session per pane, `on_force_close "detach"`, `zellij attach --create`, serialization for reboot. Their tmux-vs-zellij tradeoff table (resurrection built-in, kitty keyboard protocol, KDL layouts) is worth reading; note they render by attaching inside their own terminal, *not* via a control protocol (zellij has none). Status: open/in-progress — evidence the zellij path is plausible but unproven.
- **[agent-deck](https://github.com/asheshgoplani/agent-deck)**: another agent-session manager on tmux; their issue #958 is a good catalog of session-lifetime footguns (Linux-side, but the same "who owns the mux server's lifetime" thinking applies).
- The tmux-MCP-server ecosystem (multiple implementations on glama.ai) shows agents themselves increasingly assume tmux CLI semantics.

Pattern: **everyone building durable agent sessions in 2025–2026 lands on tmux or zellij; the ones that need external programmatic rendering land on tmux.**

---

## Bottom line for gmux

**Recommendation: tmux as the durability layer — bundled, pinned, on a private socket (`tmux -L gmux`), with gmux-owned reboot restore. Nothing else satisfies P1 end-to-end.**

Concretely:

1. **Bundle a pinned tmux** (ISC license allows it) inside gmux.app; run every agent session as a named tmux session on a dedicated `gmux` socket. Never touch the user's own tmux. This eliminates control-mode version skew — the #1 historical pain of `-CC` clients.
2. **T1 (app restart) is then free and total**: gmux relaunches, `tmux -L gmux list-sessions -F ...`, reattaches. Scrollback intact server-side (`history-limit 50000`+), fetch with `capture-pane -e -J -p`.
3. **Integration style — start hybrid, graduate to control mode.** Phase 1: each visible terminal = a PTY running plain `tmux attach -t <session>` with all tmux chrome disabled (status off, prefix none), rendered by gmux's embedded terminal view — full fidelity for near-zero protocol work; plus one background `-C` client for events (`%sessions-changed`, format subscriptions on `#{pane_current_command}`, `#{pane_current_path}` to power sidebar/status). Phase 2 (if/when gmux wants tmux panes as first-class native views, lazy attach, or remote hosts): implement the full `-CC` client — framing (`%begin/%end/%error`), octal-unescape as a byte stream, notification dispatch, **always `refresh-client -f pause-after=…`** for flow control, `capture-pane` replay on attach. iTerm2 proves a decade of production viability; budget the client library as real work (weeks, not days).
4. **T3 (reboot) is gmux's job, not the mux's**: persist `{session name, project, cwd, agent, agent-session-id, layout}` continuously (mirror into tmux user options `@gmux-*` so the server is self-describing); LaunchAgent starts the tmux server at login; gmux re-creates sessions and re-runs `claude --resume <id>` / `codex resume`. This beats tmux-resurrect (dormant since 2023, guesses processes) and beats zellij's built-in resurrection (which restores a *shell*, not the agent conversation). Offer "restore on launch" as a prompt, cmux-style, and never auto-re-run destructive commands.
5. **T2 (logout without reboot)**: document it as equivalent to reboot (restore path). Don't build the root-LaunchDaemon contortion unless users demand it.
6. **Watch, but don't adopt:** zellij (if [#3965](https://github.com/zellij-org/zellij/issues/3965) control mode ever ships, re-evaluate — its built-in serialization is genuinely nice), zmx (right philosophy, too young), shpool (plan B, mac second-tier). **Rejected:** screen (no API, GPL, CVE-driven maintenance), dtach/abduco (unmaintained, no state), wezterm mux (private lockstep protocol, spare-time maintenance risk), mosh (different layer entirely — reconsider only for a future remote-host feature, and even then it sits *under* tmux, not instead of it).

The one-sentence version: **tmux is the only layer that is simultaneously alive (3.7b, July 2026), liberally licensed, battle-tested as a GUI backend (iTerm2), scriptable enough for a product (formats + user options + control mode), and honest about reboots — which gmux solves better than any plugin because it knows the agents' own resume commands.**
