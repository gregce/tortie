# gmux build backlog (queued rounds)

Working queue maintained by the orchestrating session. Reference screenshots are real files — builders must Read them.

## IMMEDIATE — Phase 9.2 bugfixes (standalone commit as soon as Phase 9's workflow finishes)

**Bug A (P0, user-hit): agent sessions die at launch — "zsh:1: command not found: codex", pane dead status 127** (ref shot: media_xcreHz54fc/CleanShot 2026-08-09 at 22.13.56@2x.png).
**Root cause:** gmux.app spawns the tmux server with the GUI launchd environment (PATH=/usr/bin:/bin:...). Agent CLIs live in ~/.local/bin (verified: /Users/gdc/.local/bin/{claude,codex}); non-interactive `zsh -c` doesn't source .zshrc, so PATH never gains them.
**Fix at source (all three, durable for every current + future agent):**
1. Login-shell PATH capture in main at boot: spawn `$SHELL -lic 'printf %s "$PATH"'` once (with timeout + fallback), cache it, and inject via tmux server env (set-environment -g PATH) BEFORE any session is created, so everything inside panes (agents spawning git/node/etc.) sees the user's real PATH.
2. Absolute-binary resolution at create time: resolve argv[0] against the captured PATH + registry extraDirs (~/.local/bin, /opt/homebrew/bin, /usr/local/bin, ~/.bun/bin, npm-global); store the RESOLVED absolute path in manifest argv AND resume_argv (restore must survive PATH drift too). Friendly create-time error in the modal if an agent binary is not found ("codex not found — install or set path in Settings") instead of a dead pane.
3. Dead-pane UX: when a pane dies with 127 at spawn, surface the not-found explanation + a "Fix in Settings" affordance, not a raw tmux corpse.
(Phase 10's detection service reuses the same resolver — single source of truth.)

**Bug C (user-hit): prompt glyphs render as weird underscores** (ref shot: media_orEGAZVlDU/CleanShot 2026-08-09 at 22.16.39@2x.png — the zsh theme's `➜` U+279C arrow and `✗` dirty marker render as `_`).
**Root cause to confirm, then fix at source:** the xterm.js font stack lacks coverage for those codepoints and the WebGL atlas doesn't do system font fallback the way native terminals do. Diagnose live: `printf '➜ ✗ ● ▲ λ '` in a pane; check document.fonts.check() for each family in the terminal fontFamily; compare WebGL vs DOM renderer. Fix: ship a terminal font stack with real glyph coverage — either verify a macOS-native stack (Menlo/Monaco + fallbacks) renders these, or bundle a wide-coverage mono (e.g. JetBrains Mono, OFL) as the default terminal font (keep it a token/config so users can change it). Acceptance: robbyrussell zsh prompt renders arrow + dirty marker correctly in a fresh pane; no tofu/underscore stand-ins for common prompt glyphs (➜ ✗ ● λ). Nerd Font powerline glyphs (U+E0B0…) are OPTIONAL — note behavior but don't block on them.

**Bug B (user-hit): double-clicking in a terminal flips its status to "needs input" (ref shot: media_oJjYL2tyXS/CleanShot 2026-08-09 at 22.12.19@2x.png).
**Root cause:** src/renderer/state/status-detector.ts maps ANY BEL (0x07) in the output stream → NEEDS_INPUT immediately. With tmux `mouse on`, xterm forwards clicks as mouse escape sequences; zsh's ZLE beeps on un-decodable input; the BEL echoes back and the user's own click raises the attention flag.
**Fix at source (both parts):**
1. BEL → needs_input ONLY for agent sessions (agent kind !== 'shell'); shell beeps (tab-completion, ZLE) must never demand attention.
2. Add noteUserInput(sessionId) to the detector, called from the term input path (where keystrokes/mouse reports are written to the pty); any BEL within ~2000ms after user input to that session is self-inflicted → ignored (applies to agent sessions too). Export the window constant for tests; extend status-detector unit tests: shell+BEL → no needs_input; agent+BEL after user input → no flip; agent+BEL cold → needs_input.

## Phase 10 — agent launching + interaction round (launches when Phase 9 lands)

Spec inputs: docs/research/11-agent-registry.md (12 agents), user screenshots below.

1. **Native agent launching** for every agent in the registry (claude, codex, cursor, gemini, droid, deepseek, antigravity, muse, qwen, pi; cursoride/copilotide are capture-only, excluded from launch): registry module in main, launch argv + resume strategy per agent wired into manifest/agents.ts.
2. **Detection + Settings surface**: probe PATH + registry extraDirs for each agent binary; Settings panel section listing detected CLIs with path + version; re-scan button.
3. **Assignable hotkeys**: ⌘T stays generic new-terminal; user-assignable per-agent shortcuts (record-shortcut UI in Settings, persisted, registered as menu accelerators, e.g. ⌘⇧C → new Claude session in active project).
4. **Drag-to-split multiplexing**: drag session tab onto terminal area → split (horizontal/vertical from hover position); drop-zone half "lights up" in accent blue (user ref: CleanShot 2026-08-09 at 21.50.55@2x.png in /Users/gdc/Library/Application Support/CleanShot/media/media_UHETSdh05D/). Up to a reasonable grid (e.g. 2x3). Drag pane back to tab strip to pop out. Each pane remains its own tmux session — durability unchanged.
5. **Draggable project tabs** (user ref: media_cWSQ48lD7j/CleanShot 2026-08-09 at 22.06.05@2x.png): reorder project tabs by drag along the top bar; order persisted.
6. **Reorderable sidebar sections** (user ref: media_Ncoe1XIPhD/CleanShot 2026-08-09 at 22.06.54@2x.png — VS Code dragging GRAPH section): drag sidebar sections (Changes / Graph-History / etc.) to reorder within the pane; order persisted per view.
7. **Full branch management**: view ALL branches — local AND remote — in a proper branch UI (current indicator, ahead/behind, click local → checkout, click remote → create tracking local + checkout, refresh/fetch affordance). Extends Phase 9's branch menu; git service needs refs/remotes enumeration + tracking-checkout.
8. **Per-agent launch-flag presets**: INSPECT each installed CLI's --help (claude, codex, gemini, droid, amp, etc. — run `<bin> --help` for every detected agent) to catalog its autonomy/convenience flags (claude `--dangerously-skip-permissions`, codex `--yolo` / sandbox/approval flags, gemini's yolo/auto-accept equivalent, and any model/profile flags worth surfacing). Registry gains flagPresets: [{flag, label, description, danger: bool}]. UX: toggles in the create-session modal (danger-styled for permission-skipping flags, off by default) + per-agent defaults configurable in Settings ("always launch codex with --yolo"). Presets must compose with resume argv (flags recorded in manifest resume_argv where the CLI requires them on resume too — verify per CLI).

## Phase 11 — Pierre swap (spec ready: docs/research/12-pierre-diffs.md)
@pierre/diffs 1.3.5 replaces all diff viewing (Monaco stays editor-only); @pierre/trees 1.0.0-beta.6 replaces react-arborist; theme bridge from gmux tokens (shadow DOM); delete ~505 LOC per inventory.

## Phase 12 — SpecStory bundling (research: docs/research/13-specstory-integration.md)
Bundle specstory-cli into gmux.app; per-session capture toggle (watch-wrap preserving resume argv); sync-at-session-end affordance; Settings: cloud login status / device auth / last sync.

## STANDING GUARDRAILS — apply to EVERY phase from 10 onward (integrators enforce before commit)
User-mandated: no messy growth or duplication accrual.
1. **One preload bridge.** The base/full/complete/depth wrapper generations in src/preload/index.ts are a smell — the NEXT phase that touches preload collapses them into a single typed invoke bridge (one generic per-channel map derived from src/shared/ipc.ts). No phase may add a new "generation"; append channels to the one map.
2. **Organize by domain, not accretion (TS best practices, no hard line cap):** one module = one responsibility, small deliberate export surface. Split when a file mixes unrelated domains or needs section comments to navigate — the signal is cohesion, not a line number. The named offenders (store.ts, main/ipc.ts, app.css, 700-line SCM components) fail the cohesion test, which is why Phase 13 splits them.
3. **No duplicated resolution/config logic.** tmux binary/config resolution goes in ONE module (src/main/tmux/resolve.ts) consumed by supervisor AND attach host. Same rule generally: search for an existing helper before writing one (grep first).
4. **Integrator dup-scan before commit:** quick pass for copy-paste blocks introduced by parallel builders (same 10+ line block in 2+ files → extract).

## Phase 13 — refactor & consolidation pass (after Phase 12; Pierre deletions land first so this is done once)
User-identified growth pressure to resolve (line counts as of Phase 9-in-flight):
- store.ts ~950 lines → split into per-domain zustand slices (sessions, projects, git, editor, ui) with a composed store; no behavior change.
- main/ipc.ts ~1,019 lines → per-domain registrars (sessions.ipc.ts, git.ipc.ts, fs.ipc.ts, ui.ipc.ts) composed in one registerAll.
- app.css ~1,528 lines → colocate per-component styles; keep tokens.css + a small global layer only.
- SCM components > 700 lines → decompose (header/branch menu, groups, history, hover card as separate files).
- Preload: collapse the four wrapper generations into the single typed bridge (if not already done under guardrail 1).
- tmux resolve dedup (if not already done under guardrail 3).
- Dead-code sweep after Pierre swap (knip or ts-prune run; delete unreferenced exports, unused CSS, orphaned assets).
- Gate: full test/smoke battery green; zero behavior changes intended — snapshot screenshots before/after must match except where CSS colocation shifts nothing visible.

## Phase 14 — FINAL: current version installed for daily use
After all phases: npm run package from HEAD; quit any running gmux instance (user-coordinated, never kill silently); install fresh gmux.app to /Applications (replace old copy); relaunch; verify version/commit hash in About matches HEAD; confirm sessions survived the swap via tmux reattach (the whole point). BUILD-STATUS.md updated to final state.
