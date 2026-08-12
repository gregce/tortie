# Tortie build backlog — REOPENED at Phase 18

**Phases 1–17 shipped. Tortie is installed at /Applications/Tortie.app (Phase 17, 2026-08-12).**
Everything above Phase 18 is HISTORY and is kept because each entry records the root cause, the
reference screenshots and the decisions behind a phase — that context is why later agents got things
right. How this queue is run: docs/method/HOW-WE-BUILT-THIS.md and HOW-WE-DROVE-THIS.md.

**ACTIVE QUEUE, rewritten 2026-08-12. Run it in this order and do not reshuffle without asking.**

The repository now exists at github.com/gregce/tortie. It is private until the operator decides
otherwise, and docs/research/34 lists what would become public.

| # | Phase | State | Gated on |
| --- | --- | --- | --- |
| 1 | **18** chrome layout constraints | SHIPPED `6fd9ff9` | — |
| 2 | **18.5** book icon, specstory settings, provider vocabulary, single instance lock, launch flag, stale docs | ✅ SHIPPED 2026-08-12 | — |
| 3 | **18.55** zoom does not reach the search view, user reported | ✅ SHIPPED 2026-08-12 | — |
| 4 | **18.6** home screen: open, create and clone | ✅ SHIPPED 2026-08-12 | — |

**Decided for Phase 18.6, 2026-08-12.** The wordmark is **TORTIE.sh**, set as research 35 specifies:
capitals for the name, lowercase for the suffix, 28 px on 32, weight 600 with the suffix at 400.
Research 35 raised it as an open question because the domain served nothing when checked. The
operator owns tortie.sh, which answers the objection. The site returning 404 today is a deployment
matter and not a reason to change the application.
The About panel and the installer keep saying **Tortie**, because that is the application's name and
the wordmark is a wordmark. Revisit only if the operator asks.
| 4 | **19** durability, with the harness that proves it | SPECCED BELOW | **18.6 landing first** |
| 5 | **20** the verified backup ring | queued | Phase 19 |
| 6 | **21** versioned agent recovery contracts, as one migration with resume provenance | queued | Phase 20 |
| — | **Release lane** version scheme, changelog, four CI lanes, compatibility number | ready to start | nothing. Touches no source file, so it runs beside any phase |
| — | Release lane, second half: signing, notarization, the updater | blocked | the operator's App Store Connect issuer identifier |

**Why 19 waits for 18.6.** Both touch `src/renderer/state/store.ts`. Phase 19's restart fix would be
written against a file that 18.6 then rewrites. Doing the renderer work together, then the main
process durability work, means each is written once.

**Research, all complete unless marked.** 26 durability assessment, 27 release and updates, 28 remote
sessions, 29 the Context sidebar, 30 specstory distribution, 31 extensibility, 33 the durability
reconciliation which supersedes 26 and 28, 34 the OSS survey which decides how Phase 19 gets built,
and **35 the home screen, still running**.

**Decisions those documents settled, so no later round re-litigates them.** Do not build remote
session infrastructure, ever. Do not build an extension system that loads third party code. Keep
bundling specstory rather than downloading it at runtime. Use semver rather than CalVer, because the
updater throws on anything else.

**Carried forward, deliberately not done** (see BUILD-STATUS.md for the full list):
- Delete monaco-editor — re-decided at Phase 15.5 against today's evidence: Pierre `/edit` is still
  experimental at 1.3.5 with the API liable to shift. Trigger to revisit: `/edit` reaches GA.
- Notarization (Developer ID enrolment), and the operator's own acceptance run: docs/ACCEPTANCE.md.

**To add new work:** append a `## Phase N — <title>` section with the root cause (not just the
symptom), the reference screenshots as real paths, the verification tier, and what must NOT regress.
Then record it in the execution order below.

---


**EXECUTION ORDER (user-approved 2026-08-10) — batch in this order, do not reshuffle without asking:**
1. **Batch A** (running): 12.7 durability ✅ · 12.8 nits · 12.85 Tortie iconography
2. **13.5 ALONE** — universal resume. Core promise; touches registry + manifest + restore, so it gets the tree to itself. Spec lands from docs/research/22-resume-audit.md.
3. **12.9 + 12.10 together** ✅ shipped (cb8c172) — both are tree work, and 12.10's drag-to-attach conflicts with 12.9's drag-to-move; they must be designed as one interaction.
4. **12.11 + 12.12 together** ✅ shipped — UI polish (per-pane zoom; shared agent grid, sessions-position toggle, ⌘9-to-last, hold-⌘ tab hints). 12.12 item 5 left a standing contract: `src/shared/keymap.ts` is the ONLY shortcut list, enforced by `src/shared/__tests__/keymap-single-source.test.ts` — every later phase adds shortcuts there and nowhere else.
5. **14** search ✅ shipped — the last parity work; **scope is now capped per CLAUDE.md**: everything from here goes to durability, the agent layer, correctness and consolidation unless the user asks otherwise.
6. **15** SpecStory bundling ✅ shipped — specstory-cli 2.8.0 rides inside gmux.app (signed, bundled-first resolution), per-session capture wraps BOTH argv and resume_argv, a session-end sync backstops the flush tmux's SIGHUP skips, and Settings → SpecStory owns the device sign-in. · **16** refactor · **16.5** Tortie rename + migration · **17** final install.
Research is already complete for 13.5, 14 and 15 — those are spec-complete and can start the moment their slot opens.

Working queue maintained by the orchestrating session. Reference screenshots are real files — builders must Read them.

## Phase 9.2 bugfixes ✅ SHIPPED (de31057, 86c8f01)

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

## Phase 10 — agent launching + interaction round ✅ SHIPPED (6f34bd2, 38571b1)

Spec inputs: docs/research/11-agent-registry.md (12 agents), user screenshots below.

1. **Native agent launching** for every agent in the registry (claude, codex, cursor, gemini, droid, deepseek, antigravity, muse, qwen, pi; cursoride/copilotide are capture-only, excluded from launch): registry module in main, launch argv + resume strategy per agent wired into manifest/agents.ts.
2. **Detection + Settings surface**: probe PATH + registry extraDirs for each agent binary; Settings panel section listing detected CLIs with path + version; re-scan button.
3. **Assignable hotkeys**: ⌘T stays generic new-terminal; user-assignable per-agent shortcuts (record-shortcut UI in Settings, persisted, registered as menu accelerators, e.g. ⌘⇧C → new Claude session in active project).
4. **Drag-to-split multiplexing**: drag session tab onto terminal area → split (horizontal/vertical from hover position); drop-zone half "lights up" in accent blue (user ref: CleanShot 2026-08-09 at 21.50.55@2x.png in /Users/gdc/Library/Application Support/CleanShot/media/media_UHETSdh05D/). Up to a reasonable grid (e.g. 2x3). Drag pane back to tab strip to pop out. Each pane remains its own tmux session — durability unchanged.
5. **Draggable project tabs** (user ref: media_cWSQ48lD7j/CleanShot 2026-08-09 at 22.06.05@2x.png): reorder project tabs by drag along the top bar; order persisted.
6. **Reorderable sidebar sections** (user ref: media_Ncoe1XIPhD/CleanShot 2026-08-09 at 22.06.54@2x.png — VS Code dragging GRAPH section): drag sidebar sections (Changes / Graph-History / etc.) to reorder within the pane; order persisted per view.
7. **Full branch management**: view ALL branches — local AND remote — in a proper branch UI (current indicator, ahead/behind, click local → checkout, click remote → create tracking local + checkout, refresh/fetch affordance). Extends Phase 9's branch menu; git service needs refs/remotes enumeration + tracking-checkout.
8. **Per-agent launch-flag presets**: INSPECT each installed CLI's --help (claude, codex, gemini, droid, amp, etc. — run `<bin> --help` for every detected agent) to catalog its autonomy/convenience flags (claude `--dangerously-skip-permissions`, codex `--yolo` / sandbox/approval flags, gemini's yolo/auto-accept equivalent, and any model/profile flags worth surfacing). Registry gains flagPresets: [{flag, label, description, danger: bool}]. UX: toggles in the create-session modal (danger-styled for permission-skipping flags, off by default) + per-agent defaults configurable in Settings ("always launch codex with --yolo"). Presets must compose with resume argv (flags recorded in manifest resume_argv where the CLI requires them on resume too — verify per CLI).

## Phase 11 — Pierre swap ✅ SHIPPED (spec: docs/research/12-pierre-diffs.md)
@pierre/diffs 1.3.5 replaced all diff viewing (Monaco is editor-only); @pierre/trees 1.0.0-beta.6 replaced react-arborist; theme bridge from gmux tokens (shadow DOM, src/renderer/pierre/theme-bridge.ts).
Carried into later phases: **Diff mode is read-only** (edit is one toggle away in File mode) — revisit when `@pierre/diffs/edit` leaves beta. Folder rows lost their material folder icons: @pierre/trees renders a chevron in the leading icon slot and has no per-folder icon surface (see DESIGN-SPEC S3B).
Deferred (revisit in Phase 16 refactor): delete monaco-editor (98 MB node_modules, ~43 MB of built assets, ~480 LOC), blocked on Pierre `/edit` GA or a CodeMirror 6 swap.

## Phase 12 — dogfood round 2 ✅ SHIPPED (7499d98 perf, a7a9a7b, 20d7a70)

0. **P0 REGRESSION — large diffs take ~23 SECONDS to open** (user-hit: "the big changeset isn't opening well"). MEASURED by the Phase 11.1 verifier's own probe harness (keep it: /private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/vperf/, probe2.mjs + out-*.json):
   - big file (contentH 400,016px ≈ 20k lines): **openMs 22,954 / 23,372 / 22,093** across three runs — a hard hang on open.
   - mixed: 179 ms · small: 115 ms. Scrolling is FINE once open (median 17 ms) — virtualization works for scroll; the defect is the initial parse/highlight/layout pass, not scrolling.
   - Rendered lines varied 150 → 2000 between probe variants with contentH unchanged, so measure where the 23 s actually goes (Shiki highlight of the whole file? full-file diff computation? layout of a 400k-px container?) before optimizing.
   - Required: open a 20k-line diff in **under ~1 s** to first paint. Likely levers: highlight only the visible window (Shiki per-chunk, tied to the virtualizer), defer/streaming parse, a size threshold that degrades to plain (unhighlighted) diff with a "syntax highlighting off for large files" note like VS Code does, and skipping word-level intra-line diffing above a threshold. Must not regress the good scroll numbers.
   - This is a Phase 11 regression (Monaco's diff opened big files fine) — treat as the first item of the phase and verify with the same probe harness before/after.
   - **ROOT CAUSE IS OUR INTEGRATION, NOT THE LIBRARY** (user's read, confirmed against the installed d.ts): @pierre/diffs ships a whole large-content toolkit we are not using. src/renderer/editor/PierreDiff.tsx currently renders `MultiFileDiff` with a hand-driven `Virtualizer` (see its own header comment "We drive the virtualizer ourselves"), `lineDiffType: 'word'` on every line, and full-file Shiki highlighting — all eager. Available and unused in `node_modules/@pierre/diffs/dist/index.d.ts`:
     - **`VirtualizedFileDiff`** (+ `VirtualizedFile`, `VIRTUALIZED_FILE_DIFF_LAYOUT_CHECKPOINT_INTERVAL`, `VirtualFileMetrics`) — the purpose-built virtualized diff path.
     - **`WorkerPoolManager`** (`File` constructor takes one: dist/components/File.d.ts:87) — offload parse/highlight to workers.
     - **`ForceDiffPlainTextOptions` / `ForceFilePlainTextOptions`** — the library's own large-file "skip highlighting" lever; **`DEFAULT_TOKENIZE_MAX_LENGTH`** — tokenization cap.
     - **`RenderRange` / `DEFAULT_RENDER_RANGE` / `RenderWindow` / `hydratePartialDiff` / `queueRender`/`dequeueRender`** — incremental/windowed rendering.
     - **`FileStream` / `ShikiStreamTokenizer` / `CodeToTokenTransformStream`** — streaming tokenization.
     FIRST ACTION for the implementer: read Pierre's dist type definitions + README and adopt the library's intended large-content path (most likely `VirtualizedFileDiff` + a `WorkerPoolManager` + plain-text force above a threshold) rather than hand-optimizing around `MultiFileDiff`. Re-check whether driving our own Virtualizer is still necessary for the focus-ring/scroll-container requirement, or whether the virtualized component supports an external scroller properly.

1. **Terminal context menu + copy** (ref: media_FbKT7DkZBH/CleanShot 2026-08-10 at 10.13.33@2x.png — VS Code's terminal menu). Right-click in ANY session (shell or agent) → native menu: New Terminal, Split Terminal, **Copy (⌘C)**, Copy as HTML, Paste (⌘V), Select All (⌘A), Clear (⌘K). Copy must work on the xterm selection (people copy a LOT from terminals); ⌘C with a selection copies, without a selection sends SIGINT (standard terminal behavior — do not break ⌘C-as-interrupt). Menu goes through the existing ui:popupMenu native bridge.
2. **Terminal screenshot / capture**: research an approach (package or built-in) for capturing a terminal's visible viewport AND a specified-height region beyond the viewport (CleanShot-style long scrolling capture) WITHOUT dumping the whole scrollback. Likely path: render selected scrollback range to an offscreen canvas via xterm's buffer API or serialize+re-render (see @xterm/addon-serialize / addon-image), or Electron capturePage on a temporarily-expanded offscreen terminal. Deliver: capture visible / capture last N lines / capture selection → PNG to clipboard + save. Only build if a sane approach exists; report if not.
3. **Git push/pull + remotes** (VS Code parity): push, pull, fetch with ahead/behind affordances in the SCM header; visible list of remotes (name + URL) and which the current branch tracks; sync action; auth failure surfaced as a real message.
4. **BUG — historical commit diffs render incorrectly**: viewing a diff from a past commit in history does not show the correct diff (VS Code shows parent→commit for that commit's files). Diagnose at source (likely the Open Changes path passes working-copy/HEAD contents instead of commit^:path vs commit:path) and fix so any commit's changes render exactly like VS Code, including renames/additions/deletions and multi-file commits.
5. **Multi-file accumulation in the editor pane**: clicking files accumulates them as editor tabs (VS Code model) instead of replacing the single open file. Tab strip with close, ⌘W closes tab, dirty dots, preview-vs-pinned semantics (single-click preview italic, double-click/edit pins), ⌘⌥←/→ or ⌃Tab navigation. Applies to both file and diff views.
6. **Markdown rich preview + minimap** (ref: media_oure5z0IGi/CleanShot 2026-08-10 at 10.25.09@2x.png): .md files get a rich rendered preview mode (toggle preview/source/side-by-side; GFM incl. tables, task lists, code fences with syntax highlighting, links open externally, images resolve relative to the file). ALL files get a togglable minimap showing scroll position. NOTE: minimap is a Monaco feature — decide and document the interaction with the deferred Monaco deletion (if Monaco stays for editing, use its minimap; if CodeMirror swap happens later, minimap must be re-provided). Preview should NOT depend on Monaco.
7. **Inviting empty state** (ref: media_8DJOn9eaXm/CleanShot 2026-08-10 at 10.26.08@2x.png — current state is too bare): redesign the no-sessions-in-project state to showcase ALL supported agents (icons + names from the registry, installed ones actionable, not-installed ones visibly secondary), with clear instructions on what a session is and how to start one. Impeccable onboard.md treatment — this is the first thing a user sees in a new project.

8. **Drag-and-drop an image into an agent prompt**: when a session is focused, dropping an image file onto the terminal inserts a reference to it **at the cursor**, using the best convention the target agent supports, per-agent, with a universal fallback.
   - Per-agent strategy table in the registry (`imageDropStrategy`): (a) **native image attach** where the agent supports it — e.g. Claude Code's `[Image #N]` attachment, which appears when an image arrives via the CLIPBOARD, so the likely mechanism is Electron `clipboard.writeImage()` + synthesizing the agent's paste keybinding into the pty (VERIFY hands-on: does Claude Code's ctrl+V read the system clipboard when running under tmux? tmux/pty may intercept — test before committing to it); (b) **fallback for every other agent**: insert the absolute POSIX path, shell-escaped/quoted (spaces, quotes, unicode), which every CLI can read.
   - Insertion lands at the cursor naturally by writing the text to the pty as if typed (the agent's own line editor places it) — do NOT try to reposition the cursor.
   - Electron mechanics: `webUtils.getPathForFile(file)` in the preload (File.path was REMOVED in Electron 32+ — do not use it); drops without a real path (browser drags, raw image data) get written to a temp file under userData first, then referenced. Multiple files → multiple references, space-separated. Non-image files: same path-insert behavior (useful for any file).
   - UX: dropping shows a subtle accent drop overlay on the focused pane (reuse the split drop-zone treatment, distinct copy: "Drop to attach"), only for the pane under the pointer; non-focused panes accept the drop and focus themselves first. Respect prefers-reduced-motion.
   - **Clipboard-first (user directive): prefer the native clipboard/image-attach path wherever the agent supports it** — the path expansion is the FALLBACK, not the default. If the clipboard route works for an agent (verified hands-on), that agent uses it; only agents where it demonstrably does not work fall back to inserting the escaped path.
   - **⌘V image paste, not just drag-and-drop**: an image already on the system clipboard must attach the same way when pasted into a focused agent session (same strategy table, same insertion semantics). Drag-drop and paste share one code path.
   - Verify per agent (claude, codex, gemini, droid, amp, cursor-agent…) what actually works; record VERIFIED vs assumed in the registry, and default any unverified agent to the path fallback.

## Phase 12.2 — BUG: renaming a session grabs the drag handle ✅ SHIPPED (239a188)
Symptom: starting a rename makes the row/tab immediately grabbed and movable, so typing/selecting in the rename box is fought by the drag.
USER-CONFIRMED SCOPE: happens ONLY via right-click → Rename. **fn+F2 rename works perfectly.** That asymmetry is the tell.
ROOT CAUSE: `src/renderer/app/split/pointer-drag.ts:36` documents itself "Call from a React onPointerDown (**primary button only**)" — but NO caller enforces it. A right-click fires pointerdown with `e.button === 2`, which starts a surface drag; the native context menu then opens over the armed drag, the user picks Rename, and the drag is still tracking the pointer. F2 never goes through pointerdown, which is exactly why it is unaffected.
Fix (at the source, so no caller can reintroduce it):
1. **Enforce primary-button-only inside `startSurfaceDrag` itself** (pointer-drag.ts): bail unless `e.button === 0` (and ignore non-primary `pointerType === 'mouse'` buttons generally). Belt and braces: also add `if (e.button !== 0) return;` to the three call sites — src/renderer/app/split/surface-dnd.ts:237, src/renderer/app/SessionDock.tsx:187, src/renderer/app/TerminalRegion.tsx:276 — and audit src/renderer/app/Titlebar.tsx:63 + src/renderer/app/split/SplitSurface.tsx:64,226 for the same defect (project tabs and split handles will have it too — a right-click on a project tab probably arms a tab drag as well).
2. Make `setRenaming(id)` ABORT any in-flight drag (expose a cancel from pointer-drag.ts) — cheap insurance for any other path that arms a drag before a rename begins.
3. Add the missing `renaming` guard to SessionDock.tsx:187 and TerminalRegion.tsx:276 for parity with surface-dnd.ts (which already has it).
Tests: unit — startSurfaceDrag ignores button 1/2; setRenaming cancels an active drag. Probe — right-click → Rename on a dock row, a strip tab, a right-list row, and a project tab: input appears, nothing moves, typing and text selection work; then confirm left-drag reorder and fn+F2 both still work.

## Phase 12.3 — scrollback in AGENT panes + visible scrollbar ✅ SHIPPED (e08c20c)
**USER-CONFIRMED EVIDENCE (2026-08-10, screenshot media_?/shell-3):** the scrollbar appears and scrolling works in SHELL panes; it is absent and non-functional in AGENT panes. That asymmetry is the whole diagnosis.
MECHANISM: a shell draws in the NORMAL buffer → xterm has real scrollback → scrollbar + wheel work. An agent TUI switches to the ALTERNATE screen and enables mouse tracking → (i) the alternate screen has no scrollback by definition, (ii) content drawn there never enters tmux's history either, so `copy-mode` alone will NOT recover an alt-screen agent's transcript, and (iii) the wheel is delivered to the app (as arrow keys / SGR mouse reports), which the agent reads as input-history navigation — exactly the user's "it thinks I'm focused in the input box".
NOT the cause (both ruled out by inspection, do not chase): the Phase-12 image-drop router (listens only to dragover/dragleave/dragend/drop/paste; overlay is pointer-events:none and unmounted unless a drag is armed), and the tmux mouse setting (still `off`, unchanged since Phase 8.1).
THE WORK — determine per agent, EMPIRICALLY, which of these is true and implement accordingly:
 (a) the agent runs in the alternate screen and owns its own transcript scrolling → gmux must make the agent's OWN scroll work (forward wheel as the app expects; verify claude/codex actually scroll their transcript on wheel, and if they use keys instead, map wheel → those keys) and surface the affordance;
 (b) the agent writes to the normal buffer → tmux history exists → wheel drives `copy-mode -e` over the real 50k-line history;
 (c) hybrid (TUI in alt screen but transcript echoed to normal buffer) → prefer (b).
Whichever path each agent takes, THESE ARE NON-NEGOTIABLE:
1. Wheel/trackpad scrolling reveals prior output in agent panes — the user must be able to read long output again. This is the acceptance test; a pane where the wheel does nothing (or navigates prompt history) is a FAIL.
2. **The translucent scrollbar is always present in every pane type**, including agent panes — minimally visible when scrolled to the bottom so the affordance is discoverable, thicker on hover, draggable to scrub, themed from tokens, prefers-reduced-motion honored. Where the scroll surface is the agent's own transcript, the bar reflects that; where it is tmux history, it reflects that.
3. Typing always returns to live output; selection and copy (Phase 12 item 1) keep working; an inner mouse-tracking app (vim, a picker) still receives its own wheel events.
4. Keyboard parity (⇧PageUp/PageDown or the documented map) and a line in the ⌘/ overlay.
**MUST-NOT-REGRESS CHECKLIST (copy-mode introduces these hazards — handle each explicitly):**
- **Typing while scrolled must reach the AGENT, not copy-mode.** In copy-mode, keys are copy-mode commands (`q` quits, `/` searches, `g`/`G` jump). Any keystroke while scrolled must first cancel copy-mode (`send-keys -X cancel`) and then deliver that SAME keystroke to the pane — the first character must NOT be swallowed or interpreted. Test literally: scroll up, type `q`, then `hello` — the agent's prompt must contain `qhello`.
- **Image drop AND ⌘V must work while scrolled.** Both go through term.paste → pty; in copy-mode that would be interpreted as commands. The drop/paste pipeline must cancel copy-mode first, then paste, and Claude must still produce `[Image #N]`. Test a drop while scrolled up mid-transcript.
- **Everything else that writes to the pty** (hotkey-launched actions, menu Paste, resume arming, send-keys from restore) must go through the same cancel-then-write helper — one helper, not a copy-paste of the cancel logic in each caller (guardrail: grep before writing a second one).
- **The scrollbar must not steal input.** The overlay is `pointer-events: none` except its own thumb/track hit area; text selection by drag in the terminal, right-click menu, click-to-focus, and the split drag-and-drop system must all behave exactly as before. Verify selection + copy while scrolled up too.
- **Focus and status must not lie.** Entering/leaving copy-mode must not flip the session's activity status (Phase 13 reads `pane_in_mode` — make sure copy-mode is not read as "working"), and must not steal focus from the pane.
- **Nothing regresses when NOT scrolled.** At the live bottom the pane must behave byte-identically to today: same typing latency, same selection, same mouse-app passthrough.

VERIFY on: a claude pane with a long transcript, a codex pane, a plain shell, and vim-inside-a-shell. Screenshot the scrollbar at rest in an agent pane as proof.
Symptom: clicking into a session and scrolling does nothing useful — the wheel is delivered to the agent's TUI ("it thinks I'm focused in the input box"). Scrolling back through prior responses used to work.
**CORRECTION TO A VERIFIER CLAIM (do not act on it as written):** the Phase-12 functional verifier reported "resources/gmux-tmux.conf:27 sets `set -g mouse on`". That is a MISREAD — line 27 is inside the comment block explaining what `mouse on` *would* do; the real directive is line 38, `set -g mouse off`, and `git log -- resources/gmux-tmux.conf` shows no change since Phase 8.1 (e850011), well before Phase 12. Do NOT flip tmux mouse mode on the strength of that finding.
What the verifier's on-the-wire measurement (ESC[?1000h/1002h/1006h) actually shows: the AGENT TUI inside the pane enables mouse tracking, tmux (correctly, with mouse off) passes the request through to the attach client, and xterm.js therefore forwards wheel events to the app. Combined with the attach client living in the alternate buffer, that is the whole bug. Also ruled out by inspection: the Phase-12 image-drop router (src/renderer/terminal/drop/router.ts) listens ONLY to dragover/dragleave/dragend/drop/paste — no wheel, scroll, or pointer handlers — so the drag-and-drop feature is NOT the cause.

ARCHITECTURAL FACT that frames the fix (already noted in src/renderer/terminal/terminal-menu.ts:133): `tmux attach` puts the CLIENT in the ALTERNATE buffer, so xterm.js has NO scrollback of its own for a tmux-attached pane — the real 50k-line history lives server-side in tmux, reachable only via copy-mode. resources/gmux-tmux.conf sets `mouse off` by design (so tmux never steals clicks/selection), which leaves wheel events going to whatever app is inside the pane.
REQUIRED BEHAVIOR:
1. **Wheel always scrolls the session's scrollback.** On wheel-up in a tmux-attached pane, enter tmux copy-mode (`copy-mode -e`) and scroll by the wheel delta; continue scrolling within copy-mode; wheel-down at the bottom exits copy-mode cleanly back to live output. Typing must also exit copy-mode (never trap the user). Shift/modifier behavior per terminal convention.
2. **Respect apps that legitimately own the mouse**: if the app INSIDE the pane has mouse tracking enabled AND is itself an alt-screen app (a picker, vim, a menu), forward the wheel to it instead of hijacking. Determine the inner app's mouse/alt state from tmux (`#{alternate_on}`, `#{mouse_any_flag}` / pane flags) — do NOT infer from the attach client's own alt-buffer state, which is always on.
3. **Always-visible translucent scrollbar on the right**, gmux-drawn (xterm's own scrollbar is useless here since the client is in the alt buffer): reflects position within tmux's history when in copy-mode, and sits **minimally visible at the bottom when fully scrolled down** so the affordance is discoverable. Fades/thins at rest, thickens on hover, draggable to scrub. Themed from tokens; honors prefers-reduced-motion.
4. **Clicking into prior output text keeps scroll working** — a click in the output area must not leave the pane in a state where the wheel is swallowed; selection and copy (Phase 12 item 1) must continue to work alongside copy-mode.
5. Keyboard parity: ⇧PageUp/PageDown and ⌘↑/↓ (or the documented map) scroll the same history; document in the ⌘/ overlay.
VERIFY: on a claude pane with a long transcript, a codex pane, and a plain shell — wheel up reveals prior output in all three; the scrollbar is visible at rest and tracks position; typing returns to live; selection+copy still work; an inner mouse-tracking app (e.g. run `vim` or an agent picker) still receives its own wheel events. Also confirm no interaction with Phase 12's drop router, capture, or right-click menu.

## Phase 12.5 — Shift+Enter newline in the prompt, for EVERY supported CLI ✅ SHIPPED (spec: docs/research/20-shift-enter.md)
SHIPPED as a single LF (0x0a): `keys/index.ts` holds the branch. Both follow-ups the owning workflow could not make itself (the files belonged to other streams that day) landed in **Phase 12.6**:
- **⌘/ overlay** — `{ keys: ['⇧↩'], action: 'New line in the prompt (Enter still sends)' }` sits in the "Sessions" group next to the ⇧⇞/⇧⇟ row, so the gesture is discoverable.
- **Registry merge** — the table is `AgentRegistryEntry.multilineKey` beside `imageDrop` (`DEFAULT_MULTILINE_KEY`, `multilineKeyTable()`), served over `agents:multilineKeys` and cached in the renderer by `src/renderer/terminal/keys/multiline.ts`, which is now only that cache. The registry header carries the CSI-u / `ESC CR` traps; the per-agent matrix is asserted in src/main/agents/__tests__/registry.test.ts.
User ask: pressing Shift+Enter should expand the agent's prompt box to a new line instead of submitting — for all supported CLIs, not just Claude.
WHY IT DOESN'T WORK TODAY (confirm in research): a terminal sends a bare `CR` for both Enter and Shift+Enter unless the modifier is encoded. That is precisely why Claude Code ships `/terminal-setup` to patch iTerm2/VS Code keymaps. gmux owns its terminal, so it can do this natively and correctly — no user setup, no editing anyone's config.
Design constraints:
- Likely mechanism: an xterm `attachCustomKeyEventHandler` (or keybinding layer) that maps Shift+Enter to whatever sequence the TARGET AGENT understands — commonly `ESC CR` (\x1b\r, i.e. meta-enter) or CSI-u `ESC[13;2u`. resources/gmux-tmux.conf already sets `extended-keys on`, so CSI-u should survive tmux — VERIFY that end to end on the wire, and check whether xterm 6 needs its keyboard-protocol mode enabled.
- **Per-agent mapping in the registry** (`multilineKey`), same pattern as imageDrop/activitySignal: verified sequence per agent, with a sane default for unknown agents and a documented fallback if an agent has no multiline support at all (do NOT silently submit — if we cannot produce a newline, leave Enter behavior untouched rather than breaking submit).
- Must not break: plain Enter still submits everywhere; ⌥Enter / ⌃J and any existing agent multiline binding keep working; shells are unaffected (Shift+Enter in zsh should behave as it does today); copy-mode cancel-then-write helper from 12.3 applies if the pane is scrolled.
- Discoverability: mention it in the ⌘/ shortcuts overlay.
VERIFY per CLI, hands-on in scratch sessions: press Shift+Enter and confirm a NEWLINE appears in the prompt (not a submit) for claude and codex at minimum, then every other installed agent; for agents not installed, record the sequence from their docs/source and mark UNVERIFIED. Matrix in the research doc: agent x {sequence, verified?, fallback}.

## Phase 12.4 — teach the preview/pinned tab model from the explorer (small UX) ✅ SHIPPED (877153c)
SHIPPED: tree rows (src/renderer/tree/FileTree.tsx) and SCM rows (src/renderer/scm/ScmSection.tsx) both offer "Open" / "Open in New Tab" through the native ui:popupMenu bridge; the italic preview tab explains itself in its tooltip and its accessible name (src/renderer/editor/EditorTabs.tsx); and the first use of the verb teaches the double-click once, ever. The "show this once" mechanism was extracted, not copied — `src/renderer/app/one-time-tip.ts`, a catalog of tip text keyed by id behind a `gmux.tipShown.<id>` flag written BEFORE the toast, with unreadable/unwritable storage counting as already-shown so a tip that cannot be remembered can never nag.
Two hand-offs the commit named, deliberately left to whoever next owned the files:
- **Fold App.tsx's `gmux.quitToastShown` into the catalog** — the first-quit toast is the mechanism's original and was still an inline copy of the flag dance. DONE in Phase 12.6: it is the `quit-hold` tip, `showOneTimeTip` returns whether it actually toasted so ⌘Q only holds when there is something to read, and the legacy flag is still honored so nobody who has seen it sees it again.
- **Open verbs on history commit-file rows** (src/renderer/scm/HistorySection.tsx) — STILL OPEN: those rows have click/double-click but no context menu at all. Give them the same "Open" / "Open in New Tab" pair (and the same tip) so files open identically everywhere, and unify with search results when Phase 14 lands its result-open path.

Problem: Phase 12 shipped VS Code's preview-tab model (single-click = reusable italic preview slot, double-click or edit = kept tab) and it is completely invisible — a user single-clicking through files sees one tab recycling and assumes multi-file opening is broken.
Build:
1. **Tree row context menu gains open verbs** (native, through the existing ui:popupMenu bridge, on src/renderer/tree row right-click): "Open" (preview, current behavior) and **"Open in New Tab"** (opens KEPT/pinned immediately). Keep the menu short — these sit above the existing items with a separator.
2. **Teach the shortcut once, then stop**: the first time "Open in New Tab" is used, show a one-time toast — "Tip: double-clicking a file opens it in a new tab too." — persisted so it never appears again (same one-time pattern as the first-quit toast from Phase 8.3). Do NOT bake the hint into the menu label permanently.
3. **Make the preview state self-explanatory**: the italic preview tab gets a tooltip explaining it ("Preview — double-click the tab or start editing to keep it"), and double-clicking the TAB itself pins it (VS Code parity) if that is not already wired.
4. Same verbs where they make sense on SCM rows and (later) search results, so the model is consistent everywhere files open — coordinate with Phase 14's result-open path.
Verify: right-click a tree row → both verbs present and correct; "Open in New Tab" pins; the tip appears exactly once ever; single-click still recycles the preview slot; double-click on a row and on a tab both pin.

## Phase 13 — accurate per-agent activity detection — SHIPPED 2026-08-10
**Landed** as `src/main/activity/*` (monitor + panes/process/screen/claude-registry/oracles/hooks); the renderer byte detector and `statusOverrides` are DELETED. Implementation notes, the three places the design was sharpened, and the live acceptance evidence are in docs/research/18-agent-activity.md §9. Residue for a later pass: codex hooks were deliberately not built (they need a `--dangerously-bypass-hook-trust` banner and codex's title oracle is already exact), and the qwen/gemini/pi/droid rows of the acceptance matrix are floor-verified by stand-in rather than live.

## Phase 13 — accurate per-agent activity detection ✅ SHIPPED (69bd2ac, 1c18539) — spec retained below
Symptom (ref shot: media_88j9nVkcw0/CleanShot 2026-08-10 at 14.34.35@2x.png): claude-1 sits at an idle prompt yet the tab reads "working" permanently.
ROOT CAUSE — **CORRECTED BY RESEARCH (docs/research/18-agent-activity.md §1; my earlier "TUIs redraw constantly" premise was measured FALSE — idle claude/codex/qwen/gemini/agy/pi emit ZERO bytes).** Two defects compose:
(a) the renderer byte detector can only see the VISIBLE pane (status-detector.ts:25 says so in its own header; unwatch() leaves the last status standing), and
(b) `statusOverrides` in src/renderer/state/store.ts:974 is a STICKY renderer override never cleared while a session lives, and it takes priority over main — which already computes the right answer and cannot displace it. Live proof: the user's claude-1 has reported `idle` in claude's own state file for 4h18m while the tab reads "working".
Also inverted today: BEL is NOT a needs-input signal — 133/133 BELs captured off the wire were OSC string terminators, and codex emits ~10/s WHILE WORKING.

THE DESIGN IS SETTLED — implement docs/research/18-agent-activity.md (all signals measured, zero injection required):
- **claude** → `~/.claude/sessions/<pid>.json` publishes `status: busy|shell|idle|waiting` + `waitingFor`. MAPPING TRAPS (research found these; the probes' naive mapping is wrong): the file's `tmux` field session NAME goes stale on rename — map ONLY by `%N` pane id or pane_pid/subtree; older claude builds omit `status`; some entries have `"tmux": null`.
- **codex** → `#{pane_title}` is a full 3-state oracle (`work` / `⠙ work` / `[ ! ] Action Required | work`), read in the poll gmux already runs.
- **shell** → `#{keypad_flag}` + `#{alternate_on}` (zsh's ZLE sets DECKPAM at every prompt) — exact, works detached.
- **Universal floor (agents with no oracle)** → tiered, highest verdict wins: T1 always-on 1 Hz `list-panes -a` reading `window_activity` (NEVER `session_activity` — it tracks clients and froze at attach), pane_title, keypad_flag, alternate_on, pane_in_mode, pane_dead; T2 only when ambiguous, one `ps -axo pid=,ppid=,time=,stat=` snapshot with subtree Δ(TIME)/Δt ≥ 5% over 2 consecutive ticks (do NOT narrow ps to specific pids — measured SLOWER on macOS); plus setsid'd-tool-child detection, normalized capture-pane hash with K-tick memory, and one generic needs-input dialog regex.
- **Hooks are an upgrade, not the mechanism**: claude hooks via `--settings <path>` (merges with user+project, HTTP type = no subprocess) default ON for latency; codex hooks default OFF (they require a `--dangerously-bypass-hook-trust` banner).
- **Where it runs**: MAIN process, as an upgrade to the existing `pollSessionStatus()` (src/main/ipc.ts:445). **DELETE the renderer byte detector and `statusOverrides`** — do not tune them. Measured cost: 1 exec/s, 2.75 ms CPU for 16 live panes = 0.28% of one core.

Supporting detail (already researched, do not re-derive):
1. **Agent-native hooks (deterministic, preferred where they exist)**: Claude Code hooks — UserPromptSubmit → working, Stop / SubagentStop → idle, Notification → needs input; Codex `notify`. gmux should AUTO-INJECT these per session (settings/env scoped to the session, never mutating the user's global config without consent) and receive them over a small local channel. This was scoped in Phase 10 v1 ("hook auto-injection for deterministic NEEDS_INPUT") and never landed — land it now.
2. **Process-tree truth (universal, agent-agnostic)**: the pane PID from tmux (`#{pane_pid}`) → CPU-time delta of the process subtree sampled on an interval. A thinking/streaming agent burns CPU; one blocked on input is ~0%. Also `#{pane_current_command}` transitions and whether a child process is running. This is the floor that works for agents with no hooks (muse, qwen, droid, pi...).
3. **Normalized screen-content hashing**: hash the visible `capture-pane` content with volatile regions (spinner glyph, elapsed timer, token counter) masked out; unchanged over N samples → not working. Complements 2 and works while detached.
4. **OSC 133 prompt marks** for shell sessions (command start/end) — exact for plain shells.
Requirements: works for hidden/detached sessions (move detection main-side off the renderer byte stream); per-agent capability recorded in the registry (hooks vs process vs hash) with VERIFIED markers; no false "needs input" (respect the Phase 9.2 self-inflicted-input rule); cheap (sampling must not burn CPU itself — this is a battery-powered laptop).
**UNIVERSALITY IS A REQUIREMENT, NOT A NICE-TO-HAVE (user directive):** this must work for EVERY CLI in the registry — claude, codex, cursor(-agent), gemini, droid, deepseek, antigravity, muse, qwen, pi — plus plain shells. Per-agent oracles are an optimization on top; the universal floor must be good enough to ship as the ONLY signal for any agent, and must be proven so.
- Registry gains `activitySignal` per agent: `oracle:<name>` | `floor`, with a VERIFIED/UNVERIFIED marker and date. Default is `floor` until a hands-on check upgrades it.
- The code path must be AGENT-AGNOSTIC by construction: the floor runs for every session and an oracle merely supersedes it. Never gate detection on an allowlist — a newly installed CLI gmux has never seen must report correctly on first launch.
- **Verify the floor per agent** for every CLI installed on this machine; for the rest use a behavioural stand-in reproducing the same shape (CPU-burning child = working, blocking read at a prompt = idle, y/n prompt = needs input). Record results in the registry and a table in docs/research/18-agent-activity.md.
- **Known hazard already measured: muse emits ~1 output/s and deepseek-tui ~6 per 15 s WHILE IDLE.** The normalized screen-hash (volatile regions masked) and the CPU threshold must both be tuned so those two idle correctly; if not installable, simulate a 1 Hz animating TUI and prove the floor still reports idle.
- Adding a future agent's oracle must mean ONE oracle module + one registry line — no state-machine changes.
ACCEPTANCE ADDITION: the verifier reports a matrix — every registry agent x {working, idle, needs-input} x {attached, hidden} — each cell marked verified-live, verified-by-stand-in, or not-applicable. No blank cells.

Acceptance: with claude idle at its prompt the tab reads idle within ~2 s; submit a prompt → working within ~1 s; agent asks a question → needs input promptly; a long tool run stays working; a hidden session's status is correct when revealed; verified on at least claude + codex + a plain shell, with the fallback path exercised on an agent that has no hooks.

## Phase 12.7 — durability hardening from the SIGTERM forensics ✅ SHIPPED 2026-08-10 (docs/research/21-sigterm-forensics.md)
SHIPPED, all three defects, with `npm run smoke:identity` (GMUX_SMOKE=identity) as the standing regression test — it stages the reproduced repro live: gmux renames its own session, a foreign session takes the freed name, and gmux must keep its own, ignore the stranger, kill only what it owns, and record an external SIGTERM as a signal.
- **F3**: agents launch by BARE name (`claude …`), the manifest keeps the absolute path for restore. Verified live: `pgrep -f "$(command -v claude)"` matched 2 processes (both sessions launched by the OLD code) and NOT the freshly created one. Panes now carry `GMUX_MANAGED=1` + `GMUX_SESSION_ID=<uuid>`, asserted by having the pane itself echo them.
- **F1**: `reconcile()` takes `{tmuxId, tmuxName, gmuxId}` and claims rows by `@gmux-id` only (`GMUX_SESSION_ID` is the second source; a `$-id` proven foreign is memoized so it is probed once). It returns the id→`$-id` bindings the caller's `liveIds` map is built from, so there is ONE matching algorithm. Every `?? rec.tmuxName` fallback is gone — kill, reap, snapshot, scroll and attach all require a proven binding.
- **F2**: `#{pane_dead_signal}` is in the poll format and persists to a new `exit_signal` column (migration 003, with `pane_pid` captured at create); a death also writes one audit line to the app log. The UI names it: "Session terminated by SIGTERM (external)", with INT/QUIT deliberately not blamed on the outside world.
DEFERRED from the research, deliberately: the rotating `deaths.log` (§7 — the manifest row plus the log line cover the diagnosis today), F4's daemonization assertions, and the `GMUX_TMUX_SOCKET` override (§9.2) that would make harnesses genuinely isolated — worth its own item, since every smoke here shares the user's live socket and manifest.

### Original spec
Context: the exit-143 death was an EXTERNAL targeted `kill -TERM`, not gmux (10 experiments, zero reproductions; tmux server is PPID 1 in its own session/pgid; `kill-session` sends SIGHUP → 129, so 143 structurally excludes gmux). gmux's banner was faithful reporting. But the investigation surfaced three real defects — these are the deliverable. NOTE: touches src/main/ipc.ts + manifest, so run AFTER Phase 13 lands or hand to that integrator.
**F3 — stop making durable agents uniquely killable (the product-shaped bug).** gmux launches agents with an absolute `argv[0]`, so `pkill -f "$(command -v claude)"` matches EXACTLY the durable gmux session and misses every ephemeral one (verified live: 1 of 5 claude processes matched, and it was the user's durable one). The absolute path existed to fix Phase 9.2 Bug A, which is ALREADY solved independently by injecting the login-shell PATH into the tmux server env (src/main/index.ts:561-565). Fix: launch as the BARE name, keep the resolved absolute path in the manifest for restore, and re-point the `GMUX_SMOKE=agent` assertion at the manifest record instead of the launch argv. Also stamp `GMUX_SESSION_ID=<uuid>` and `GMUX_MANAGED=1` into the pane env at create (src/main/ipc.ts:719) so durable agents are positively identifiable to tooling and humans.
**F1 — identity, not names.** Bind sessions by `@gmux-id`, not by name: batch-read it via `list-sessions -F '#{session_id} #{@gmux-id}'` in GmuxCore.refresh() (src/main/ipc.ts:399-445); change manifest/store.ts:531 reconcile() to take {tmuxName, gmuxId} pairs and claim rows by gmuxId first; DELETE the `?? rec.tmuxName` fallbacks at src/main/ipc.ts:225, :550, :823 — a session not in liveIds is not ours, so flip the row to 'restorable' and KILL NOTHING.
**F2 — make the next occurrence diagnosable.** Add `#{pane_dead_signal}` to the poll format (src/main/ipc.ts:495), parse at :508-518, thread deadSignal into reapDeadSession and persist via a new `exit_signal` column (src/main/manifest/store.ts); capture `#{pane_pid}` at create through the existing `new-session -P -F`. Then LABEL it honestly in the UI: src/renderer/app/TerminalRegion.tsx:757 and split/SplitSurface.tsx:151 should say "Session terminated by SIGTERM (external)" rather than the ambiguous "exit 143".
Verify: a durable claude session no longer matches `pkill -f "$(command -v claude)"` (run the pgrep check, do NOT run pkill); env markers present in the pane; a deliberately externally-killed zz scratch session records its signal and shows the honest label; reconcile with a stale row marks restorable and kills nothing.

## Phase 12.8 — three dogfood nits ✅ SHIPPED (5301247, 24104bd)
1. **Replace two agent icons.** Sources: `/Users/gdc/Downloads/qwen.svg` -> `src/renderer/assets/agents/qwen.svg`, and `/Users/gdc/Downloads/meta-icon.svg` (the Meta infinity mark) -> `src/renderer/assets/agents/muse.svg`. They CANNOT be copied as-is: qwen.svg is 200x200 with radial gradients + white fills; meta-icon.svg is 256x171 (wide, non-square) with linear gradients and #0081FB. The existing system is a 24x24 viewBox, single monochrome path, `fill="currentColor"`, rendered crisply at 16px (verified at 3x zoom in Phase 10). Work: flatten each to a recognizable monochrome silhouette, normalize to a 24x24 square viewBox with the Meta mark CENTERED (never stretched — its native aspect is 3:2), keep strokes/counters legible at 16px, and verify at 16px AND 3x zoom in every surface an agent icon appears (tab strip, right dock, create modal, attention overlay, empty state, Settings, hotkey rows). If a monochrome flatten loses the mark's identity, say so and propose keeping brand color for that one rather than shipping mush.
2. **BUG — the SESSIONS chevron dropdown only offers 3 agents** (ref shot: media_pWjxHbNnNe — "Claude Code / Codex / Shell"). It must list EVERY supported agent, exactly like the create modal does: driven from the registry with detection state (installed = actionable, not-installed = disabled with the same quiet treatment used elsewhere), correct AgentIcon per row, in both the top-strip and right-dock orientations. Root-cause it — the dropdown is almost certainly a hardcoded array rather than a registry read; delete the hardcoded list, do not extend it.
3. **Multi-select staging/discarding in the SCM Changes list** (ref shot: media_4wrv5WZbyA — today only one file at a time). VS Code parity: click selects; shift-click selects a RANGE; cmd-click toggles individual rows; cmd-A selects all within the group; the row actions and the native context menu then apply to the WHOLE selection (Stage / Unstage / Discard / Open diff), with the discard confirmation naming the count ("Discard changes in 4 files?"). Selection must be keyboard-reachable (shift+arrows extends), survive a git:changed refresh where the files still exist, and clear sensibly when they do not. Applies to every resource group (Staged / Changes / Untracked / Merge).

## Phase 12.10 — image preview + tree-to-agent drag ✅ SHIPPED (cb8c172)
1. **Preview every common image type in the editor pane.** Today images cannot open at all: `fs:readFile` refuses binary content (src/main/fs/ipc.ts:82) and the tab shows "gmux edits text files only". Add a real image viewer for png, jpg/jpeg, gif (animated), webp, avif, bmp, ico, tiff where the platform supports it, and svg.
   - New main-side channel returning bytes/data-URL (append-only to src/shared/ipc.ts) with a SIZE CAP and a friendly over-cap state; never route images through the text path.
   - Viewer: fit-to-pane by default, actual-size toggle, zoom (scroll/⌘+/⌘-/⌘0) and pan when zoomed, a transparency checkerboard, and a quiet metadata line (dimensions, file size, type). Honors prefers-reduced-motion; no animation beyond the image's own.
   - **SVG is both an image and text** — preview by default with a Source toggle, mirroring the markdown Preview/Source pattern already built in Phase 12.
   - Git-aware, matching the rest of the app: a modified image should offer a before/after comparison against HEAD (side-by-side or a swipe) rather than silently showing only the working copy. If that proves expensive, ship preview first and note the diff as deferred — do not fake it.
   - Tabs behave like any other: preview/pinned semantics, ⌘W, the tab strip.
2. **Drag an image FROM THE TREE onto an agent session -> attach it**, reusing the Phase 12 image-drop pipeline exactly (bracket-paste of the absolute path -> Claude's `[Image #N]`; escaped path for other agents; per-agent `imageDrop` strategy). No second implementation of attach.
   - **INTERACTION CONFLICT with Phase 12.9 (tree drag-and-drop moves files) — resolve it explicitly:** a drag that STARTS in the tree means MOVE when dropped on a tree node/folder/root, and ATTACH when dropped on a terminal pane. The two drop-target families must be mutually exclusive and visibly distinct: the existing move affordance for tree targets, and the accent "Drop to attach" overlay (Phase 12 item 8) for panes. Neither may arm while the pointer is over the other's territory.
   - Works for any file, not just images (non-images insert the escaped path, same as a Finder drag) — but the overlay copy should say "attach" for images and "insert path" otherwise, matching the per-agent copy already shipped.
   - Dropping onto a SPLIT pane targets the pane under the pointer and focuses it first; while the pane is scrolled, the write goes through the shared cancel-copy-mode-then-write helper (12.3), not a new path.
Verify: open a png, a transparent png, an animated gif, a large jpg (over the cap), an svg (both modes), and a modified image if the HEAD comparison ships; drag an image from the tree onto a claude pane -> `[Image #N]`; drag the same file onto a folder in the tree -> it MOVES and does not attach; drag onto a shell pane -> quoted path; confirm the two overlays never appear simultaneously.

## Phase 12.11 — per-pane zoom ✅ SHIPPED (f343c1b)
Goal: ⌘+ / ⌘- / ⌘0 enlarge text where the user is working — ideally scoped to the FOCUSED region (an agent session, the session dock, the explorer, the SCM sidebar, the editor), with universal zoom as the acceptable fallback if per-region proves messy.
TWO MECHANISMS — a terminal does not zoom like a panel:
1. **Terminal panes = real terminal zoom.** Change xterm `options.fontSize` (not CSS scaling — CSS-scaled terminals go blurry and break cell math), then re-fit and PUSH THE NEW SIZE TO TMUX (resize-pane / the existing resize path) so rows/cols match. Consequence to accept and document: the agent's viewport genuinely changes and it will redraw at the new width — that is what every terminal does, but it must not corrupt scroll position or the tmux pane geometry.
2. **Panels (explorer, SCM, session dock, editor chrome) = CSS `zoom` on the panel container** (Chromium supports it; prefer it over transform:scale, which breaks layout flow and hit-testing). Monaco has its own font-size API — use it for the editor text rather than zooming the editor container.
Scope + behavior: zoom applies to the focused region, tracked off the focus model we already have (activity-bar view / terminal focus / editor focus); ⌘0 resets the focused region, ⌘⇧0 resets everything; levels persist per region (and per orientation for the dock) in settings; sensible min/max with a quiet toast or status hint at the limits.
HAZARDS — verify each, they are why this is not a one-liner:
- **12.3's scrollbar measures pixel metrics** (the research specifically warned to MEASURE cell height, never compute it). Any zoom must trigger a re-measure, or the scrollbar thumb and scroll math drift.
- **Split sizing and the drag/drop overlays compute rects**; CSS `zoom` changes pointer coordinate mapping. Verify drag-to-split, the drop-to-attach overlay, tab reorder and scrollbar dragging all still hit correctly at 150% and 75%.
- Terminal zoom + tmux resize must not disturb a SCROLLED pane's position, and must not be mistaken for activity by Phase 13's detector.
- Settings already promises a terminal font family/size control (DESIGN.md §9.7 / DESIGN-SPEC S13, flagged unbuilt in the Phase 11 design verification): reconcile — zoom should be a per-pane MULTIPLIER over that base size, not a competing setting, and the docs must stop promising what does not exist.
FALLBACK (only if per-region is genuinely messy): universal `webContents.setZoomLevel` for the whole window, ⌘0 to reset — but say so explicitly and note terminals will still need their own font-size path to stay crisp.
Verify: zoom an agent pane (text grows, tmux geometry follows, agent redraws cleanly, scrollbar still accurate, scroll position preserved); zoom the explorer and SCM independently; ⌘0 and ⌘⇧0; drag-to-split and drop-to-attach at 150% and 75%; persistence across relaunch.

## Phase 12.12 — shared agent grid, sessions toggle, cmd+9, keymap reference ✅ SHIPPED (f343c1b)
1. **Unify the ⌘T "New session" agent grid with the empty state's** (refs: modal media_ZFo6nDFygm vs the better empty state media_gAobYLR8AA). The empty state is the target: roomier tiles, per-tile inline status labels ("not installed" on Droid, "early" on Pi) instead of a single caption below the grid, generous hit areas, and a dashed recessive outline on unavailable agents. The modal today is cramped and pushes "Droid not found" into a caption that only describes one agent. Extract ONE shared AgentGrid component used by both surfaces (guardrail: do not clone the markup — the two drifting apart is exactly how this happened), parameterized only by density if the modal genuinely needs to be tighter. Keep the modal's own concerns (name field, directory picker, flag presets) around it.
2. **Inline toggle for sessions position** (refs: right dock media_imnRxiesrg, top strip media_V8W4UFhMBx). Switching currently requires the View menu. Put a small control in the SESSIONS header beside + and the chevron: a single icon button that swaps between Top and Right, with a tooltip naming the destination ("Move sessions to the top"). Present in BOTH orientations, keyboard reachable, and it must stay in sync with the View menu's radio items (one source of truth in the store — no second piece of state). Also add the verb to the chevron menu for discoverability.
3. **⌘9 should jump to the LAST project, not the ninth.** ⌘1…⌘9 already exists and already follows visual tab order (App.tsx:228 -> setActiveProjectByIndex; Titlebar.tsx:10 documents it) — the only defect is that with more than nine projects the tail is unreachable. Adopt the browser convention: ⌘1-⌘8 = positions 1-8, ⌘9 = LAST project regardless of count. Update the ⌘/ overlay wording accordingly ("⌘1…⌘8 switch to project, ⌘9 last project"). ⌃Tab MRU cycling already covers the middle.
4. **Hint that ⌘1…⌘9 exists — the user did not know until told.** Adopt the Arc/Chrome gesture: while the ⌘ key is HELD, each project tab reveals its index (1-8, and 9 on the last tab); release and they vanish. No permanent numbers — the hint appears exactly when the hand is already on the key, which is the quiet-until-useful posture ZEN-OF-TORTIE asks for. Details: fade in/out fast (respect prefers-reduced-motion — no transition then), render at low contrast so it never competes with the tab label, do not reflow the tab (reserve or overlay the glyph, never push text), suppress while a tab is being dragged or renamed, and clear the state if the window loses focus while ⌘ is down (otherwise the numbers stick). Also add the tab's own shortcut to its hover tooltip as a fallback for anyone who never holds ⌘.

5. **A proper keyboard map + explainer in Settings.** Today shortcuts live in two hand-maintained places — the ⌘/ overlay and Settings' per-agent recorder — which is exactly why the ⇧↩ row went missing when 12.5 shipped.
   - **ONE source of truth.** Define the whole keymap as data (id, keys, action, group, scope, assignable?, source: built-in | user-assigned) in a single module; the ⌘/ overlay, the Settings map, the tooltips, and the native menu accelerators all RENDER from it. Adding a shortcut anywhere must be a one-line data change — no second list may exist after this phase.
   - **The Settings surface**: grouped by domain (Sessions · Projects · Terminal & scrolling · Editor & files · Git · Views & layout), a shared Keycap component rendering real ⌘⇧⌥⌃↩⇥ glyphs consistently (not ad-hoc text), filter-as-you-type, and a short plain-language line per shortcut explaining what it does — this is the explainer, not just a table. Assignable rows (the per-agent session shortcuts from Phase 10) stay editable in place with their recorder; built-ins are shown but not editable.
   - **Conflict surfacing**: if a user-assigned agent shortcut collides with a built-in, say so on the row rather than silently letting one win.
   - Include the things people never discover: ⌘1…⌘8 / ⌘9-last, ⌃Tab MRU, ⇧⇞/⇧⇟ scrollback, ⇧↩ newline, ⌘⌥←/→, split focus, ⌘/ itself.
   - Impeccable treatment — this is a reference people read, so typography and rhythm matter more than density; it should be pleasant to scan, not a spreadsheet.
Verification tier: 2 (single-subsystem UI; one screenshot of the unified grid in both surfaces, one probe that the toggle and ⌘9 behave, no full sweep).

## Phase 12.85 — Tortie iconography ✅ SHIPPED (349a5a0)
Product philosophy: docs/ZEN-OF-TORTIE.md. Assets: docs/brand/tortie/ (production-ready — do NOT regenerate; the README records the master SHA and forbids wrapping the mark in a rounded square, badge, or any outer chrome).
1. **App/dock icon** -> `docs/brand/tortie/macos/Tortie.icns` replaces build/icon.icns in electron-builder.yml. Verify in the packaged .app (Dock, Finder, cmd-Tab) at every size — the mark is freestanding, so check it reads at 16px in Finder lists.
2. **Menu-bar presence** -> a macOS status item using `menu-bar/TortieTemplate.png` + `@2x`. Electron must mark the NativeImage as a template image (`setTemplateImage(true)`) so macOS tints it for light/dark and highlight states. Content per the Zen doc's "What needs me now?": the menu lists sessions needing input across ALL projects (reuse the attention-overlay data), plus Show app / New Session / Quit. NO counters or activity feeds — "a number that rises on its own is not a signal, it is noise in a nicer font."
3. **Understated in-window presence** — ONE place only, quiet: candidates are the no-projects empty state or a small mark in the titlebar's leading area. Pick one, low contrast, never animated. Propose with a screenshot before adding a second location.
Verify: icon at all sizes incl. Retina; template image tints correctly in both menu-bar appearances; the status menu reflects real attention state; the in-window mark holds at 1x and 2x without disturbing layout.

## Phase 12.9 — project + file management ✅ SHIPPED (8c32c00 foundations, cb8c172)
Use the library's own features rather than hand-rolling — read the installed @pierre/trees docs/types first and confirm each API exists at 1.0.0-beta.6 before designing around it.
1. **Create NEW projects, not just open existing ones.** Today cmd+O (open folder) is the only path. Add "New Project…": pick a parent directory + name, create the folder, optionally `git init` (checkbox, default on), add it as a project tab and focus it, and offer to start a session in it immediately. Also surface "Open Folder…" and "New Project…" together in the + tab menu and the no-projects empty state.
2. **File operations from the tree via CONTEXT MENU COMPOSITION.** Pierre exposes `composition.contextMenu` + a React `renderContextMenu` prop with trigger modes (right-click / trigger button / both). **Wire it to our EXISTING native menu bridge (ui:popupMenu) — do NOT adopt Shadcn or any DOM-drawn menu; DESIGN.md §3 forbids it.** Actions: New File, New Folder (inline-rename the new row on create, VS Code-style), Rename, Duplicate, Reveal in Finder, Copy Path / Copy Relative Path, and Delete.
   - **Delete goes to the macOS Trash via `shell.trashItem`, never `rm`/unlink** — recoverable by construction, with a confirmation naming the item(s).
   - New main-side IPC (append-only to src/shared/ipc.ts): fs:createFile, fs:createFolder, fs:rename, fs:move, fs:trash. All must reject paths outside the project root, refuse to touch `.git/`, and surface real errors (EEXIST, EPERM, ENOTEMPTY) as friendly toasts.
   - Multi-select from Phase 12.8 (if that lands first) should apply here too where it makes sense (trash several files at once).
3. **Drag and drop to move files/folders**: set `dragAndDrop: true`; support dropping onto folders, flattened folders, and the root; drop targets auto-open on hover (library behavior — verify). Pass a `canDrag` callback that LOCKS `.git/` and anything outside the project root. The library disables dragging while search is active — confirm that holds. Moves go through fs:move; a move that would overwrite must prompt, never clobber silently.
4. **Search / filter by name in the tree**: use the library's search field with its three `fileTreeSearchMode` options; pick a default and document why in DESIGN-SPEC (likely: show matches with their ancestor folders). **Scope boundary — do not duplicate Phase 14:** this is a fast NAME filter inside the explorer only. Phase 14 owns ⌘P fuzzy-open across the project and ⌘⇧F content search. Keep them visually and conceptually distinct, and make sure the tree filter does not accidentally become a second quick-open.
Interactions to get right: every mutation must be reflected by the existing @parcel/watcher + git decorations without a manual refresh; operations must not fight agents writing files concurrently (no long locks, no full-tree rebuilds); renames of open editor tabs should follow the file (tab identity is path-keyed — check src/renderer/editor/tab-identity.ts); and a rename/move of a tracked file must leave git status sane (plain fs rename is correct — git infers the rename).
Verify: create a project from scratch (with and without git init) and start a session in it; create/rename/duplicate/trash files and folders incl. nested; drag a file into a folder, into a flattened folder, and to the root; attempt a locked drag (.git) and an out-of-root drop and confirm both are refused; trash something and restore it from Finder; filter the tree and confirm dragging is disabled during search; confirm decorations and open tabs stay correct throughout.

## Phase 13.5 — universal RESUME ✅ SHIPPED (90f9d46, a3dd057, b9b737d, 2951a60)
**Why this is P1, not a nit:** gmux's promise is that a session comes back WITH ITS CONVERSATION. Today only claude delivers that. The user's live manifest shows muse-1, qwen-1, pi-1 and pi1 with NO resume command armed — after a reboot they return as bare directories. Phase 13 made STATUS universal; resume is still claude-first.
**The registry is factually wrong and the whole resume column is suspect.** registry.ts claims "No resume mechanics exist (pi v1)"; pi in fact ships `pi --session <path|id>` (deterministic, by full or partial UUID), plus `-c/--continue`, `-r/--resume` (interactive picker), `--fork`, `--no-session`, with JSONL sessions under `~/.pi/agent/sessions/` keyed by working directory and entries carrying id + parentId. ROOT CAUSE of the bad data: the registry was synthesized from specstory-cli, a CAPTURE tool — it knows where transcripts are STORED, not how to RESUME them. Do not trust any resume entry that has not been re-verified hands-on.
Work (drive it from the audit doc, which lands before this phase):
1. **Correct every registry resume entry** — template, capture strategy (pre-assign like claude's `--session-id` vs post-spawn harvest like codex's rollout watch vs none), and session-store path. Delete the false pi claim.
2. **Actually capture the id at launch for every agent that supports it** — today only claude's resume_argv is populated. Harvesting agents need their store watched after spawn (exact path derivation and observed latency are in the audit doc); pre-assignable agents get the id generated up front. An interactive picker is NOT acceptable as the recorded resume — record it only as a labelled fallback.
3. **Compose with launch flags**, per agent: claude's `--resume` does not restore launch flags (we already re-append them); verify and handle the equivalent for each other agent rather than assuming.
4. **UI honesty (required, not optional):** before a reboot the user must be able to SEE which sessions will return with their conversation and which will only return to their directory — a quiet per-session indicator plus a line in the restore bar ("3 of 6 will resume their conversation"). Discovering this after a reboot is the failure mode this phase exists to prevent.
5. **BUILD A DETERMINISTIC RESUME-CONFORMANCE HARNESS — the primary deliverable, not a side test.** `npm run conformance:resume` drives every installed agent through GMUX'S OWN code path (not hand-typed commands — the whole point is to test our capture, not the CLI's docs):
   for each agent: create a session via gmux's real create path in a scratch cwd -> plant a UNIQUE marker turn (a nonce string the agent must echo, nothing that does work) -> assert gmux CAPTURED a session id into the manifest (this is where muse/qwen silently fail today) -> kill the tmux session to simulate the reboot -> restore via gmux's recorded resume_argv -> assert the nonce is present in the restored transcript -> clean up.
   Output a per-agent PASS/FAIL/SKIP(not installed) table with the captured id and the exact resume argv used. Runs on the private socket with zz-prefixed sessions only.
   Why it must be permanent: (a) it makes every registry resume claim executable instead of asserted; (b) agent CLIs change under us — the original research already flagged codex rollout-format drift breaking old sessions after upgrades — and this catches it the day it happens rather than the day the user reboots; (c) adding a new agent becomes "write the conformance case", which is the honest bar for claiming support.
   Wire it into the phase gates (and note in BUILD-STATUS which agents are covered live vs skipped).
6. Extend `smoke:t3` so restore is asserted for a NON-claude agent too, not just claude — otherwise this regresses silently.
Verification tier: 3 (durability, core promise, and a user-reported correctness error).

## Phase 13.7 — configurable scrollback limits + diagnostics ✅ SHIPPED inside Batch D (2d75408; src/main/scrollback, src/main/diagnostics, ScrollbackSection.tsx)
Ships BEFORE the final install. Closes a gap open since day one: docs/research/01-durability-layer.md listed "scrollback memory footprint at scale (20 sessions x 50k lines)" as UNMEASURED, and both current numbers — tmux `history-limit 50000` and the renderer's ~10,000-line xterm cap — were chosen as generous guesses, never benchmarked.
**MEASURED (docs/research/23-scrollback-limits.md) — use these, do not re-derive:**
- Cost model, validated to <=1 byte across 12 content shapes: `bytes/line = 40 + 5*stored_cells + 23*extended_cells`. Plain ASCII @162 cols = 850 B; **truecolour @162 = 4,576 B — 5.4x, and truecolour is the COMMON case for agent output**; 256-palette colour is FREE; a blank line is 40 B.
- **THE BINDING CONSTRAINT IS NOT MEMORY, IT IS SCROLL LATENCY, AND IT BLOCKS THE WHOLE SERVER.** `scrollPaneTo` (the scrollbar drag, scroll.ts:157) is one `send-keys -X -N <delta> scroll-up` at ~21 us/line, dead linear: 10k -> 238 ms, 50k -> 1,053 ms, 200k -> 3,155 ms. tmux is single-threaded, so during a deep drag a concurrent client stalled **1,170 ms** — the same class of call the 1 Hz activity poll makes. **This is a live defect in the already-shipped Phase 12.3 scrollbar**: dragging to the top of a deep pane can stall status detection and every other session's tmux traffic. 13.7 must fix it (chunk the scroll and yield, cap per-drag delta, or seek by absolute position) and prove the poll is not starved during a full-height drag.
- Recommended: history-limit **default 25,000 (down from 50,000)**, min 1,000, max 100,000 — the ceiling set by latency, not RAM.
**DIAGNOSTICS DECISION (the research made the Zen argument and won it): NO ambient number anywhere.** Three on-demand surfaces plus two rare event-triggered toasts, assembled entirely from existing UI — no new nav section, no new panel, no status bar (DESIGN-SPEC.md:34 says v1 has none). Follow the doc's exact surfaces.

1. **Make both configurable in Settings**, with the measured cost curve turned into honest UI: each choice shows its estimated memory cost ("~X MB per busy session"), and states plainly that changing scrollback depth affects NEW sessions only — tmux applies history-limit at pane creation, so existing panes keep the depth they were born with. Include whatever remediation actually exists for existing sessions (per the research) rather than implying there is one.
2. **Keep the two caps conceptually separate in the UI** — tmux history is what scrolling and capture can REACH; the renderer cap is only what is pre-loaded into the visible terminal on reattach. The research must confirm they are genuinely independent; if so, say so in the copy so nobody thinks lowering one loses history.
3. **Understated diagnostics.** Per-session: scrollback lines used vs limit, approximate memory. Global: tmux server RSS, app RSS, snapshot disk usage in userData, free disk.
   **HARD CONSTRAINT — ZEN-OF-TORTIE forbids a dashboard**: "No counters, no activity feeds, no progress theatre. A number that rises on its own is not a signal, it is noise in a nicer font." So: diagnostics are AVAILABLE, not ambient — an on-demand per-session info popover plus a Settings > Diagnostics panel — and they surface proactively ONLY when a threshold is actually crossed (a session near its scrollback limit, snapshots over N GB, low free disk), with copy written in the product's voice. No permanent readout unless the research argues one against that text and wins.
4. **Cheap sampling**: reuse the existing 1 Hz all-sessions poll (src/main/activity, ~2.75 ms for 16 panes) rather than adding a second timer; expensive samples (RSS, disk) are lazy/on-open. Hard cost budget stated and measured.
Verification tier: 2, except any change to the tmux conf or capture paths, which is Tier 3 (durability-adjacent).

## Phase 13.8 — process identity + PATH-probe leak ✅ SHIPPED inside Batch D (2d75408; src/main/proc, build/after-pack.cjs)
Triggered by the user searching Activity Monitor for "gmux" and finding only *Cursor's* extension host (named for the open folder). Two distinct problems, both verified on this machine 2026-08-10.
1. ~~**BUG (P1, leaking now): the login-shell PATH probe never dies.**~~ **DONE in Phase 13.5.1** (`src/main/tmux/resolve.ts`) — it was pulled forward because it stopped being a leak and became a deadlock: `captureLoginShellPath()` could hang FOREVER, and it wedged 13.5's conformance harness for 9 minutes with zero cases started. execFile's callback fires on stdio CLOSE and its `timeout` SIGTERMs only the direct child; this machine's `zsh -lic` forks a copy of itself that inherits stdout, so the pipe never closed and every `resolveBinary()` caller — session create, agent detection, the harness — blocked behind it. Three changes: settle on the MARKERS rather than on close (which also turned "hang 3 s then use the fallback PATH" into "capture the user's real PATH in ~890 ms" on this machine — the leak was costing correctness, not just time), an independent deadline that resolves whatever the child does, and `spawn(..., { detached: true })` so the probe owns its process group and can be killed as a group. It has to be spawn: **execFile forwards only a whitelist of options and silently DROPS `detached`** — verified here, the probe kept gmux's own pgid, where `kill(-pid)` would have signalled the app itself. Regression test reproduces the fork (`resolve.test.ts` — "shell that forks a stdout-holding child"), and asserts both that the promise settles AND that the fork is dead afterwards. NOTE: five orphaned probes from earlier app launches (oldest 12 h) were still alive on this machine when the fix landed; they predate it and were deliberately left alone rather than pkill'd.
2. **Make every gmux-owned process self-identifying.**
   - **Dev mode** (`npm run dev`): the binary is `node_modules/.../Electron`, so nothing says gmux. Set `app.setName('gmux')` / `process.title` early in main, and name the utility/attach-host processes explicitly, so a dev run is greppable as gmux too. Document what dev mode can and cannot rename (renderer helpers come from the Electron.app bundle and may resist renaming — say so honestly rather than pretending).
   - **Packaged app**: verify in the real .app that the main process shows as `gmux` and that electron-builder renamed the helper bundles (`gmux Helper`, `gmux Helper (Renderer)`, `gmux Helper (GPU)`) rather than leaving `Electron Helper`. If they are not renamed, fix the build config.
   - **Child processes gmux spawns** should be attributable: the tmux server already is (`tmux -L gmux -f .../gmux-tmux.conf`) and the attach clients read as `tmux -L gmux attach …` — keep that. NOTE THE TENSION WITH 12.7: agents now launch by BARE NAME so they are not uniquely `pkill`-able, which also makes them less identifiable; the compensation is the `GMUX_SESSION_ID` / `GMUX_MANAGED` env markers. Do not undo 12.7 — instead make the DIAGNOSTICS surface (Phase 13.7) able to list gmux-owned pids so the user has a supported way to see them.
   - Name any worker/utility processes (search worker, tree-sitter pool from Phase 14) so a future CPU spike is attributable to the right subsystem.
3. Sweep for other leaks while in here: any spawned child with a timeout that is not killed, and any temp file/scratch server left behind (a leaked research server on socket `-L zzraise` was also observed — verify gmux itself leaves nothing).
Verification tier: 3 for the leak fix (resource leak, user-visible), 1 for the naming.

## Phase 14 — deep file + code search (spec from docs/research/19-search.md) — SHIPPED 2026-08-11
Delivered: ⌘P quick open (fuzzysort gate → VS Code fuzzyScorer rerank, one resident worker), ⌘⇧F streaming content search (vendored ripgrep 15.0.0, NDJSON on the main thread), ⌘⇧O go to symbol (web-tree-sitter, six WASM grammars, indexed per project in the existing SQLite db). Items 1-3 built; **item 4 (replace-in-files) deferred** — the engine streams a replace PREVIEW for free, but nothing writes. AST/structural search evaluated and declined per the parity guardrail.
Verified from the PACKAGED .app, not just `out/`: ⌘P panel in 52 ms with 5.1 ms median keystroke round trips through the unpacked ripgrep; ⌘⇧F view in 8 ms, first row at 160 ms, cancel-on-retype clean; ⌘⇧O palette in 41 ms, 387-file index built from the extraResources WASM grammars with honest progress copy. Both main-process workers load straight from inside app.asar (measured; see electron.vite.config.ts).
User ask: find things fast in the file explorer — deep FILE search and CODE (content) search, using the best 2026 ecosystem libraries rather than hand-rolling.
Scope to design in research, then build:
1. **Quick open (⌘P)**: fuzzy file-path search across the active project (and optionally all open projects), ranked like VS Code's, instant on large repos, keyboard-first, honoring .gitignore + sensible excludes.
2. **Project-wide content search (⌘⇧F)**: a Search view in the activity bar — query, match count, per-file grouped results with context lines, click-to-open at the exact line, toggles for case / whole word / regex, include+exclude globs, and streaming results (never a frozen UI on a big repo).
3. **Structural/code-aware search** where it earns its place: symbol search (go to symbol in project), and evaluate AST-level querying (tree-sitter queries / ast-grep) as a power option — recommend only if it justifies the weight.
4. **Replace-in-files** if it falls out cheaply and safely (preview + undo); otherwise defer explicitly.
Constraints: results must feel instant on a 50k-file repo; no indexing daemon that burns battery unless it clearly wins; must work with the existing Pierre tree + editor tab model; MIT/Apache licensing; and it must integrate with the search-open path used by the SCM/tree (one open-file bus).

## Phase 14.2 — filter-field and explorer-header nits ✅ SHIPPED inside Batch D (2d75408; src/renderer/controls)
1. **The magnifier icon overlaps the placeholder text** in filter inputs (ref: media_cCNxQGXzlY — the glyph sits on top of the "F" in "Filter shortcuts"). The input needs left padding that accounts for the leading icon, not just an absolutely-positioned glyph over unpadded text. **Fix it in the SHARED input component, not per-instance** — it affects at least the Settings keyboard filter (12.12) and the explorer file filter (12.9), and any future filter will inherit the same bug otherwise. Check every filter/search field in the app after the fix, incl. the Phase 14 search view's query box.
2. **Too little space between the explorer header and the filter field** (ref: media_PYbOpnUjQ5 — the field is crammed against the EXPLORER title bar). Give it the spacing the token scale calls for, and check the same header/field rhythm in the SCM and Search views so the three panes agree.
3. **Explorer header gains three actions** (VS Code parity, and all three are things the user reaches for constantly now that file operations exist): **New File**, **New Folder**, and **Collapse All Folders**. Icons from codicons, matching the existing header accessory treatment; tooltips; keyboard reachable; New File/New Folder create inline-renaming rows in the current folder (reusing the 12.9 create flow, not a second implementation); Collapse All collapses every expanded folder in one action and is a no-op (disabled, not error) when nothing is expanded.
Verification tier: 1 for the spacing and icon padding (screenshot each affected field before/after), 2 for the three header actions (one probe each; confirm New File/New Folder reuse the 12.9 flow rather than duplicating it).

## Phase 14.5 — true git log graph: lanes + local/origin divergence — SHIPPED 2026-08-11 (spec: docs/research/24-git-graph.md)
Scope justification (required by CLAUDE.md's parity guardrail): agents branch, commit and merge constantly, often across worktrees — "what has converged, and am I behind origin?" is supervision of AGENT work, not IDE furniture. It passes the test; structural search and LSP still do not.
Today the history pane draws every commit as a flat single-column row. Two asks:
1. **Divergence between local and origin** (ref: media_0Vi1Ch95fr — `main` and `origin/main` pills pinned to DIFFERENT commits, which instantly says "1 unpushed"). Ref badges positioned on their own commits; HEAD emphasised; remote refs visually distinct from local; tags distinct again. Per-commit unpushed/unpulled shading, and the ahead/behind summary in the branch header that already exists. **Honesty requirement:** being "up to date" against a week-old remote ref is a lie — surface last-fetch age rather than implying freshness.
2. **True multi-lane topology** (ref: media_ZqhpfGRGSk — merges, concurrent lanes, colour carrying lane identity). **DECIDED BY RESEARCH (docs/research/24-git-graph.md) — build it ourselves, no dependency.** Port **VS Code's swimlane fold** (MIT, ~90 lines); budget ~250 lines of layout + ~120 of SVG. **LICENSE CORRECTION: mhutchie/vscode-git-graph is NOT MIT** — its LICENSE denies derivative works and GitHub reports NOASSERTION, so it may not be ported or copied; it is also the wrong shape (whole-graph multi-row polylines in one SVG, which cannot be row-virtualized). A library would additionally force a foreign palette, which the tokens rule forbids.
Data layer (measured 2026-08-11 on getspecstory, 752 commits / 132 refs): ONE command replaces service.log() — `git log -z --topo-order --decorate=full --max-count=<N> --format=%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%D%x1f%s <SCOPE>` — with a user-selectable scope on the History header: "This branch + upstream" (default), "All local branches", "Everything". **Never `--all`.** Also delete the `ahead === 0 && behind === 0` guard at HistorySection.tsx:81-82, which currently suppresses the divergence UI outright. Handle the awkward cases explicitly: octopus merges, parents outside the loaded window, and lane churn when a new page loads — **lanes must not reshuffle under the user's eyes as they scroll**.
Constraints: lane colours come from OUR tokens with a documented cycling rule, colour is never the only signal (DESIGN.md), the pane can be ~300px so the graph must degrade gracefully rather than clip, and NOTHING already shipped may regress — the hover card, native context menu, copy-SHA, click-to-open and virtualization all stay.
Verification tier: 2, except the topology correctness itself which is Tier 3-style evidence: the rendered lanes must be diffed against `git log --graph --oneline` ground truth on a repo with real merge history (getspecstory has one), not eyeballed.

## Phase 14.7 — View-menu orientation radios are a second source of truth (user-hit) ✅ SHIPPED
**SHIPPED RESULT — a FIFTH defect was found by measurement, and it was the biggest one.** The four below are all real and all fixed, but none of them explains why "Sessions on Top" never showed a ✓. That was Electron itself: **assigning `checked = false` to a radio MenuItem MARKS it** (Electron 43 / macOS 15, confirmed two ways at once — `AXMenuItemMarkChar` on the live menu bar and the JS getter, which agreed at every step; scratch probe, not inference). The old sync ran `top.checked = !right; rightItem.checked = right`, so syncing to Top ended by writing `false` to Right and left RIGHT marked; syncing to Right was correct only by accident (it wrote `true` last). The rule is now in code and pinned by a test whose fake reproduces the real semantics: **mark the winner, never unmark the loser.**
Also landed: main caches the last position the store announced and builds the template from it (a rebuild can no longer reset the radios); the executeJavaScript/localStorage pull is deleted; `setSessionsPosition` is a REQUIRED bridge method (no feature detection); the store pushes on every change and once on load; menu-action delivery prefers a visible non-Settings window and warns instead of no-oping; ids/labels/actions live in `src/shared/sessions-position.ts` so the radios, the inline toggle and the ˅ row read one table.
Verified live at Tier 2 against a scratch-profile instance (own `--user-data-dir`, driven over CDP + AppleScript): 8/8 — UI toggle → ✓ follows; menu radio → dock moves, both directions; a real recorded hotkey (rebuildAppMenu) leaves the radios alone; relaunch comes back honest. **Note for future AppleScript verification: a dev Electron app reports to System Events as process "Electron" — address the instance by `unix id`, or the script drives the user's own running gmux.**
Symptoms (refs: media_JBgs5xzfee menu, media_2y93N6A6Es right dock, media_xwjoMylc3g top strip): the View menu's "Sessions on Top / on Right" items **(1) do not always work** and **(2) do not reflect what the in-UI toggle did**. The inline toggle and dock/strip themselves work well — the menu is what drifts.
DIAGNOSIS (read-only, at HEAD 2d75408) — FOUR defects compose, all in src/main/menu.ts:
1. **The template hardcodes the radio state**: `MENU_ID_SESSIONS_TOP` is built with `checked: true` and RIGHT with `checked: false` (menu.ts:305-318). Every `applyMenu()` — and `rebuildAppMenu()` calls it whenever a hotkey changes (settings:set) — therefore RESETS the radios to Top, then re-syncs asynchronously. Between those two moments the menu is lying, and if the resync fails it stays wrong.
2. **The sync is a PULL that races a PUSH.** `syncOrientationRadios()` (menu.ts) reads the renderer's localStorage via `executeJavaScript`, fired only on `did-finish-load` and inside `applyMenu()`. Meanwhile store.ts:1007 `setSessionOrientation` PUSHES to main over a **feature-detected** bridge whose own comment admits "an older preload just keeps the once-per-load sync it always had". Two mechanisms, one of them optional, no single authority.
3. **Per-window sync mutates one app-wide menu**: `applyMenu()` loops every window and each calls `markSessionsPosition(...)` on the single application menu — last window wins. The Settings window is excluded by name, but any other window is not.
4. **String sniffing**: `markSessionsPosition(typeof raw === 'string' && raw.includes('right'))` — a substring test on raw JSON, with a silent default to Top on any parse/read failure. Also investigate why the click sometimes does nothing: `sendMenuAction('sessions-top'|'sessions-right')` presumably targets a focused/main window — if focus is on another window (or none), the action is dropped, which is the "doesn't always work" half.
FIX — ONE source of truth, main never guesses:
- The RENDERER store is the authority. It pushes orientation to main on every change AND once on load; main **never reads localStorage** and never string-sniffs. Remove the executeJavaScript pull entirely.
- Main keeps the last-known orientation in a variable and builds the template FROM it, so a rebuild cannot reset the radios.
- Make the push path non-optional (it is our own preload — drop the feature detection, or fail loudly rather than silently degrading).
- Fix action delivery so a menu click always reaches the right window; if no eligible window exists, say so rather than no-op.
- The ˅ chevron menu verb, the inline toggle and the View radios must all be provably one value — add a test.
Verification tier: 2, but prove BOTH directions live: toggle in the UI → menu checkmark follows; choose in the menu → dock/strip moves; then change a hotkey (forcing rebuildAppMenu) and confirm the radios did NOT reset; then relaunch and confirm persistence.

## Phase 15 — SpecStory bundling ✅ SHIPPED (77e4434, 3f064d1)
Bundle specstory-cli into gmux.app; per-session capture toggle (watch-wrap preserving resume argv); sync-at-session-end affordance; Settings: cloud login status / device auth / last sync.

## STANDING GUARDRAILS — apply to EVERY phase from 10 onward (integrators enforce before commit)
User-mandated: no messy growth or duplication accrual.
1. **One preload bridge.** The base/full/complete/depth wrapper generations in src/preload/index.ts are a smell — the NEXT phase that touches preload collapses them into a single typed invoke bridge (one generic per-channel map derived from src/shared/ipc.ts). No phase may add a new "generation"; append channels to the one map.
2. **Organize by domain, not accretion (TS best practices, no hard line cap):** one module = one responsibility, small deliberate export surface. Split when a file mixes unrelated domains or needs section comments to navigate — the signal is cohesion, not a line number. The named offenders (store.ts, main/ipc.ts, app.css, 700-line SCM components) fail the cohesion test, which is why Phase 13 splits them.
3. **No duplicated resolution/config logic.** tmux binary/config resolution goes in ONE module (src/main/tmux/resolve.ts) consumed by supervisor AND attach host. Same rule generally: search for an existing helper before writing one (grep first).
4. **Integrator dup-scan before commit:** quick pass for copy-paste blocks introduced by parallel builders (same 10+ line block in 2+ files → extract).

## Phase 15.5 — codebase re-baseline ✅ SHIPPED (81a1658 → docs/research/25-codebase-context.md)
**Why this exists (user directive):** Phase 16's spec was written when the tree was much smaller and names stale figures (`store.ts ~950 lines`, `main/ipc.ts ~1,019`, `app.css ~1,528`). Twelve phases have landed since, adding whole domains that did not exist when it was specced — search, symbols, quickopen, scrollback, diagnostics, proc, graph, image, drop, zoom, keymap, controls. Refactoring from that map would tidy the wrong files and miss the real accretion. Re-derive the baseline first; write it to docs/research/25-codebase-context.md.
Must produce:
1. **The domain model AS IT NOW IS** — every module grouped by the domain it actually serves (not the folder it happens to sit in), with each domain's public surface and its dependents. Name the boundaries that are real and the ones that leak.
2. **Measured cohesion, not line counts** — for each large or central file, what distinct responsibilities does it hold? A cohesive 700-line domain module is fine; a 300-line file mixing three domains is not (CLAUDE.md's rule). Rank by "how many unrelated things must a reader hold at once", and say which files genuinely warrant splitting versus which merely look big.
3. **Real duplication, found post-hoc** — many parallel agents wrote here. Scan for repeated logic (10+ line clones, parallel implementations of the same concept, second sources of truth). Two are already known: the View-menu orientation drift (Phase 14.7) and the earlier preload-wrapper generations. Find the rest; the guardrails were added mid-project and cannot have caught what preceded them.
4. **Did the guardrails hold?** Verify empirically: is there exactly ONE typed preload bridge; is the keymap genuinely single-source (grep for any hand-written shortcut list); is tmux binary/config resolution in exactly one module; does every file-open path go through the one open-file bus (tree, SCM, search, quick-open)?
5. **Dead code and orphans** — post-Pierre, post-search, post-Batch-D. Run knip/ts-prune, then verify by hand before condemning anything (a "dead" export may be used by a smoke harness or the packaged path only).
6. **The Monaco question, re-decided against today's facts** — is Pierre's `/edit` GA yet? What exactly does deleting monaco-editor cost and save now (node_modules weight, built assets, LOC, and what capability is lost)? Recommend, do not assume the earlier answer.
7. **A PRIORITIZED refactor plan for Phase 16** — ordered by reader-pain-per-unit-of-risk, with an explicit "do not touch" list for anything durability-critical (tmux, manifest, restore, activity) unless the change is provably behaviour-preserving.
Read-only; no src changes. Runs AFTER Phase 15 lands so the baseline is final.

## Phase 16 — refactor & consolidation ✅ SHIPPED (ec5ded2 defects, b650966, 07969f7) — drove from docs/research/25-codebase-context.md, NOT the stale figures below; after Phase 15.5; Pierre deletions land first so this is done once)
User-identified growth pressure to resolve (line counts as of Phase 9-in-flight):
- store.ts ~950 lines → split into per-domain zustand slices (sessions, projects, git, editor, ui) with a composed store; no behavior change.
- main/ipc.ts ~1,019 lines → per-domain registrars (sessions.ipc.ts, git.ipc.ts, fs.ipc.ts, ui.ipc.ts) composed in one registerAll.
- app.css ~1,528 lines → colocate per-component styles; keep tokens.css + a small global layer only.
- SCM components > 700 lines → decompose (header/branch menu, groups, history, hover card as separate files).
- Preload: collapse the four wrapper generations into the single typed bridge (if not already done under guardrail 1).
- tmux resolve dedup (if not already done under guardrail 3).
- Dead-code sweep after Pierre swap (knip or ts-prune run; delete unreferenced exports, unused CSS, orphaned assets). Phase 11 already took the swap-orphaned ones (fileIcon.ts, the 122 material folder icons, decorations render logic, arborist CSS).
- Pre-existing dup-scan hits Phase 11 left alone (all predate the swap): `app/split/surface-dnd.ts` self-dup, the `deriveSurfaces` import block in SessionDock/TerminalRegion, the end-session button JSX in SplitSurface/TerminalRegion, the `section-toggle` header JSX across HistorySection/ScmSection/BranchesView, `app.css` 36px row rule, `scm.css` text rule, and the `handle<C>` IPC wrapper duplicated in main/fs/ipc.ts + main/git/ipc.ts.
- **electron-builder `files` should become an allowlist.** The denylist has to name each renderer-only package; ~4 MB of transitive strays (@types/*, micromark-util-*, unist-*, oniguruma-parser, regex, plus monaco's marked/dompurify and material-icon-theme's chroma-js) still ship. Since main only requires node-pty, better-sqlite3 and @parcel/watcher at runtime, `!node_modules/**` + three re-includes is both smaller and self-maintaining. Gate it on the packaged-app smoke, not just `out/`.
- **material-icon-theme is a build-time-only dep** (read by `src/renderer/icons/generate-file-icons.mjs`, whose output is committed) but sits in `dependencies` and ships 6 MB into the asar — move it to devDependencies.
- Gate: full test/smoke battery green; zero behavior changes intended — snapshot screenshots before/after must match except where CSS colocation shifts nothing visible.

## Phase 16.5 — rename gmux -> Tortie ✅ SHIPPED (8346d64 migration, 3e54812, 09b216e)
Sequenced here deliberately: it is invasive, so do it once on a settled codebase. Philosophy + naming: docs/ZEN-OF-TORTIE.md.
Rename productName, appId (com.specstory.gmux -> com.specstory.tortie), window title, menus, About, README/BUILD-STATUS and user-facing copy. Internal identifiers stay unless they leak to the user.
**MIGRATION HAZARDS — each can destroy the user's work if handled carelessly:**
- **userData path.** Electron derives it from the app name, so a rename points the app at a NEW EMPTY DIRECTORY: manifest, snapshots, settings, hotkeys and one-time-toast flags all appear to vanish and durable sessions become unrecoverable. On first launch, if old gmux userData exists and the new one does not, MIGRATE it (copy, verify, leave the original as a backup — never move-and-pray). Land this first in the phase and test against a populated manifest.
- **tmux socket name.** `-L gmux` is internal and never user-visible. **Do NOT rename it** — that orphans every live session at upgrade. If ever renamed, the app must read the old socket, adopt its sessions, then write to the new one.
- **Bundle id change resets macOS grants.** Full Disk Access/TCC granted to gmux.app does NOT carry to Tortie.app, and the SMAppService login item is registered under the old bundle id. Re-register it and tell the user once, plainly, that macOS will ask again — never fail silently.
- **The recorded specstory bin path in EVERY captured manifest row** (found by the Phase 15 verifier): captured sessions store an ABSOLUTE path to the bundled binary, e.g. `/Applications/gmux.app/Contents/Resources/bin/specstory`. Renaming the app invalidates that path for every captured session AT ONCE — measured behaviour is the restored pane printing "No such file or directory" and exiting 127, so **the conversation does not come back**. Phase 15.1 added re-resolution on a missing bin; VERIFY it covers the rename case specifically (old path gone, new path present) as part of this phase's migration test, and include a captured session in the populated-manifest upgrade fixture.
- Agent env markers (GMUX_SESSION_ID / GMUX_MANAGED from Phase 12.7) may be referenced by tooling: keep them, or emit both old and new names for one release.
- **The recorded SpecStory bin path in every captured manifest row.** A captured session stores the ABSOLUTE `specstory.bin` it launched under (`/Applications/gmux.app/Contents/Resources/bin/specstory`) inside both `argv` and the wrapped `resume_argv`. Renaming the app invalidates it for EVERY captured row at once; the armed resume then answers "No such file or directory", exits 127, and the conversation does not come back. Phase 15.1 heals this at restore time (`armableResumeArgv` in src/main/restore/restore.ts re-resolves and re-wraps, else arms the bare agent) — verify that path against a populated manifest during the rename rather than assuming it, and consider rewriting the recorded paths in the userData migration.
Verify: upgrade from a POPULATED gmux install — manifest, sessions, settings, hotkeys all present under the new name; live tmux sessions still adopted; login item works; and a clean install with no prior data also works.

## Phase 17 — FINAL: current version installed for daily use ✅ SHIPPED 2026-08-12
After all phases: npm run package from HEAD; quit any running gmux instance (user-coordinated, never kill silently); install fresh gmux.app to /Applications (replace old copy); relaunch; verify version/commit hash in About matches HEAD; confirm sessions survived the swap via tmux reattach (the whole point). BUILD-STATUS.md updated to final state.

Landed: `/Applications/Tortie.app` packaged from HEAD and verified before it replaced anything (bundle id, four renamed helper bundles, specstory Mach-O signed at `Resources/bin/specstory` and re-checked off the mounted DMG, `gmux-tmux.conf`, tree-sitter wasm, unpacked ripgrep, packaged-app smoke exit 0 twice). The About panel now carries the build commit — `src/main/build-info.ts` + a `define` in `electron.vite.config.ts`, so About reads `0.0.1 (<sha>)` with `-dirty` when the tree was edited; that was the one piece of the phase brief the code had left a TODO for (`menu.ts`: "this is also where Phase 17's commit stamp will go"). The switchover was the durability proof: 44 live sessions and 40 manifest rows before, the whole gate battery run against the live socket with the sessions up and the id list byte-identical afterwards, the old app quit through its own quit path, and all 44 still alive after. **BUILD-STATUS.md is the final state; docs/ACCEPTANCE.md is the script the user runs from their own seat.** Everything still outstanding is named in BUILD-STATUS §6 (deferred, each with the condition that reopens it) and §7 (known limitations) rather than here.

---

## Phase 18 — chrome layout constraints ✅ SHIPPED 2026-08-12 (user-reported; spec + fix round retained below)

The window's three resizable regions each carry a constraint that made sense when they were built
alone and is wrong now that all three are used together. All six items below are ONE phase because
they share a single geometry model: `shell-body` is a flex row of
`ActivityBar · Sidebar · TerminalRegion · EditorPanel · SessionDock` (`src/renderer/app/App.tsx:1023–1028`),
and every symptom here is a consequence of what that row permits.

**Reference screenshots (real paths — builders must Read them):**
- `/Users/gdc/Library/Application Support/CleanShot/media/media_lTnQxayxmd/CleanShot 2026-08-12 at 11.25.50@2x.png`
  — an open file clipping the session tab strip: three tabs and a `>` overflow chevron where ten
  sessions exist.
- `/Users/gdc/Library/Application Support/CleanShot/media/media_lOeh3xrbWv/CleanShot 2026-08-12 at 11.27.47@2x.png`
  — the right-docked session list at its current fixed width, 10 sessions.

### Item 1 — the sidebar cannot be made wide, and cannot be dragged shut
**Root cause:** `setSidebarWidth` hard-clamps to `[220, 400]` px
(`src/renderer/state/store.ts:1054`), a constant pair with no relation to window width. So a
1440 px window gives the explorer at most 28% and never less than 220 px, and the ONLY way to hide
it is the activity-bar icon.
**Wanted:** any first-class left view (explorer, search, SCM today; **the Context sidebar from
docs/research/29 tomorrow — build this generically, not per-view**) expands rightward to **at least
50% of the window**, and when dragged below the minimum it **snaps to hidden**, in the same state
the activity-bar toggle produces (so re-clicking the icon restores it, and the icon's selected
state stays truthful). Max must be a fraction of the live window, re-evaluated on resize, not a
constant.

### Item 2 — an open file cannot fill the window
**Root cause:** `MAX_FRACTION = 0.65` (`src/renderer/editor/EditorPanel.tsx:55`) caps the editor
split at 65% of the centre region, enforced in both the initial width and the drag handler
(`:274`, `:278`, `:303`).
**Wanted:** drag the divider left to expand the editor past that cap, **plus a subtle top-bar
action that instantly fills the chrome** — collapsing the left sidebar and the session dock if they
are open — and a way back that restores the previous layout exactly (remember the pre-fill widths;
do not restore to defaults). This is a focus mode, not a new window: no new concepts, no modal.

### Item 3 — an open file clips the session tabs (the bad UX in shot 1)
**Root cause — structural, not cosmetic:** the top session strip is rendered INSIDE
`TerminalRegion` (`src/renderer/app/TerminalRegion.tsx:753`, `orientation === 'top' ? strip : dock`),
and `TerminalRegion` is a flex SIBLING of `EditorPanel`. The editor's width is therefore subtracted
directly from the strip's, so opening a file at the 65% cap leaves the tab strip ~35% of the window
and it overflows into a chevron. Session tabs are the app's primary navigation; the file viewer is
secondary, and today the secondary thing evicts the primary one.
**Wanted:** opening a file must not cost session tabs their room. Decide the fix in the spec stage —
the two candidates are (a) hoist the strip out of `TerminalRegion` so it spans the full width above
both regions, or (b) make the filling editor an overlay rather than a flex sibling. **(a) changes
terminal geometry and therefore tmux pane size — see the tier note.**

### Item 4 — right-docked sessions cannot be collapsed (shot 2)
**Root cause:** `setRightListWidth` clamps to `[160, 320]` (`src/renderer/state/store.ts:1072`)
with no collapsed state in the model at all.
**Wanted:** collapse the dock fully to the right edge, leaving a narrow rail of **agent icons** that
reveals **name plus useful status on hover** (status dot and attention state already exist per
session — reuse them, invent no new signals). Hover reveal must not steal focus from a terminal and
must obey the standing rule that "needs input" is never triggered by the user's own input.

### Item 5 — pointer drift: a grabbed divider does not stay under the cursor
**Root cause — two different bugs with the same symptom.**
(a) The sidebar resizer is **delta-accumulating**: `setSidebarWidth(startW + (ev.clientX - startX))`
(`src/renderer/app/Sidebar.tsx:187`) recomputes from the grab origin, but the setter clamps. Drag
past the clamp and reverse, and the edge no longer tracks the cursor for the rest of that drag —
the clamped travel is lost. This gets worse under Item 1's wider range, so it must be fixed with it.
(b) The editor divider is **absolute but offset-blind**: `window.innerWidth - e.clientX`
(`src/renderer/editor/EditorPanel.tsx:305`) treats the cursor as the edge, ignoring where inside the
handle the user actually grabbed, so the panel jumps by up to the handle's width the instant a drag
starts.
**Wanted, for every divider in the app (sidebar, editor, dock, splits):** record the grab offset at
pointerdown, drive width from `clientX − grabOffset`, clamp the RESULT only, and use pointer capture
so the drag survives the cursor leaving the handle. One shared helper — grep before writing a second.
**Prove it with a number:** cursor-to-edge delta in px across a drag that hits both clamps, before
and after. "Feels better" is not a result.

**ACCEPTANCE CRITERION — no unexpected cursor jump, stated exactly (user, 2026-08-12).** The edge
stays welded to the point the user grabbed, for the whole drag. Three separate conditions, all
required, because they fail independently:
1. **No jump at grab.** The cursor-to-edge delta on the FIRST move sample must equal the delta at
   rest, within 1 px. This is bug (b): grabbing the handle anywhere but its exact centre currently
   teleports the edge to the cursor. Measure the first sample specifically — a max/mean across the
   whole drag can hide a one-frame jump.
2. **No drift in free travel.** Away from the clamps, the delta must stay within 1 px of its
   value at grab for every sample.
3. **Clamps must not create catch-up.** While clamped the cursor and edge MUST diverge — the edge
   physically cannot move — and that is correct, not a defect. What is a defect is the edge failing
   to **re-engage the instant the cursor returns within range**. With an absolute mapping there is
   no lost travel to recover; with today's delta-accumulating sidebar there is, and the edge trails
   the cursor by however far it was dragged past the clamp. Test explicitly: drag 200 px past a
   clamp, reverse, and assert the edge starts moving on the first sample back inside the range.
Report the three numbers per divider. Any of the three failing is a FAIL, not a nit.

### Item 6 — audit user-visible text for the old name
Per CLAUDE.md, "user-visible copy is the only place the name may appear, and there it is always
Tortie". A scan of `src/renderer` and `src/main` on 2026-08-12 found **no `gmux` in rendered strings
already** — every hit was prose in comments or one of the protected identifier strands. So this item
is **an evidenced audit, not a find-and-replace**: drive the real app and enumerate what a user can
actually read — window and Settings chrome, About, native menus, the ⌘K palette, empty states,
tooltips, toasts, confirm dialogs, error and diagnostics surfaces, notifications, Dock/app menu, and
the packaged bundle's Info.plist strings — and produce the evidence that none of them say gmux.
**NEVER rename**, per CLAUDE.md: the tmux socket `-L gmux`, `resources/gmux-tmux.conf`, the
`@gmux-*` session options, `GMUX_SESSION_ID`/`GMUX_MANAGED`, the inner `<userData>/gmux/`,
`window.gmux`, `gmux-asset:`, `gmux.*` localStorage keys, `gmux-*` CSS classes. Renaming any of the
first five strands sessions that are running right now. One legitimate exception to decide in the
spec: Diagnostics / copy-debug-info may print the literal `tmux -L gmux …` command, because that is
a command the user would type, not a product name.

### Verification tier — per item, deliberately mixed
- **Items 1, 2, 4, 6 → Tier 2.** Layout and copy: gates, a targeted probe of the thing changed, and
  a screenshot READ (not just captured) at the sizes that matter. Item 4 needs a hover-state capture.
- **Items 3 and 5 → Tier 3-lite, and this is the deliberate part.** Item 3's candidate (a) moves the
  region hierarchy, which changes the terminal's box and therefore the tmux pane size for every live
  session — a wrong answer resizes real work. Verify against ground truth outside the app:
  `tmux -L gmux display -p '#{pane_width}x#{pane_height}'` before and after, at several window
  widths and in both orientations. Item 5 ships with the measured cursor-to-edge delta above.
- Drive it per docs/method/HOW-WE-DROVE-THIS.md: isolated `--user-data-dir` on every launch, CDP
  with real `PointerEvent` sequences for the drags, the timer-throttling flags, and the operator's
  live sessions listed before and after and diffed.

### What must NOT regress
- The 45 live sessions on the private socket, and their pane geometry.
- The activity-bar toggle and `sidebarVisible` staying ONE truth with the new drag-to-hide — no
  second source (the Phase 14.7 lesson: View-menu radios, header toggle and UI must all read one value).
- Orientation switching top↔right, and the persisted widths in `gmux.*` localStorage keys (keys keep
  their names; only their permitted RANGES change — write a migration for out-of-range stored values).
- ⌘1–⌘9 project switching, ⌘J attention, per-pane zoom, and the editor's preview/pinned tab model.
- `src/shared/keymap.ts` remains the only shortcut list if Item 2's fill action gets a shortcut.

### Fix round (2026-08-12) — three verifiers, five findings, all fixed at source

**F1 (BLOCKING) — the terminal reached 12px, i.e. a live pane reflowed to 2 columns.**
`TERMINAL_FLOOR` had been written as a term inside one function instead of a budget across the
whole row. Two holes composed: `sidebarMaxWidth` reserved the activity bar and the floor but
**not the dock** (its own comment said it "deliberately does not know about" the dock — the spec's
prose, which said the term bites "below ~976px", only comes out if you reserve a 200px dock, so
the prose was right and the code had dropped it), and `editorMaxWidth` floored at `EDITOR_MIN`
so a min-wins clamp handed the editor its 320px out of a 332px row.

The budget is now three rules that compose to one invariant — *the terminal is laid out at 0
(`display:none`) or at ≥ 240px, never between*:
1. `sidebarMaxWidth(window, reservedRight)` reserves the activity bar, the **rendered dock width**
   and the floor. The 50% ceiling is untouched at every window ≥ ~976px with a default dock.
2. `editorIsOverlay(window, workArea)` — a row that cannot seat `EDITOR_MIN + TERMINAL_FLOOR`
   does not get a split; the editor uses the overlay it already uses on narrow windows, which
   **covers** the terminal (`position:absolute` in `.work-row`) instead of shrinking it. Provably
   unreachable in `top` orientation, so it can never cover the hoisted session strip (item 3).
3. `clampEditorWidth` is the one clamp in the file where **max wins over min**, so the arithmetic
   is safe even if a caller's condition is wrong. The editor's minimum is a comfort; the
   terminal's floor is a promise about work in flight.

Re-measured with the verifier's own driver (`squeeze.mjs`), same controls, real OS window sizes,
`tmux -L gmux` for ground truth:

| window | sidebar | dock | before | after |
|---|---|---|---|---|
| 1400 | 700 | 320 | terminal 12px → **tmux 2x43** | overlay, terminal 332px → **tmux 40x43** |
| 1440 | 720 | 320 | 32px → **2x43** | 352px → **43x43** |
| 1500 | 750 | 320 | 62px → 4x43 | 382px → 47x43 |
| 1600 | 800 | 320 | 112px → 11x43 | 432px → 54x43 |

**F2 — no executable invariant.** `chrome-geometry.test.ts` gains `terminalLayoutWidth()` driven
over a 2000+ cell grid (window × orientation × dock × sidebar × editor × fill), plus the four
squeeze rows replayed. Falsified before trusted: reverting the two formulas fails 5 tests; the
first failure it reports is a 232px terminal at a 960px window **with no editor open at all**,
which is a case nobody had measured.

**F3 / Failure Set 2 — dragging a region shut destroyed the chosen width.** `onMove` clamped every
sample to `min` and persisted it, so a 400px sidebar dragged shut stored 220, and the stored value
depended on the pointer's sampling rate. Snapping now rewinds to the pre-drag width before
collapsing: one gesture, one outcome. Pinned by `resizeStep()`, a pure function the hook actually
calls, tested for both regions in both directions. Re-measured live: sidebar at 800 → drag shut →
activity-bar click → **800** (was 220).

**F4 — the sessions-position control vanished with the dock collapsed.** It now sits at the foot of
the 48px rail, mirroring the activity bar's settings gear at the window's other 48px edge; the two
bookends answer their own placement the same way. Verified live: on the rail it is present, labelled
"Move sessions to the top", third in tab order, and clicking it moves the sessions (orientation →
`top`, strip 1034px) without expanding the dock first.

**Failure Set 3 — the name audit had a false negative that hid a live string.** Its JSX regex could
not see text between two interpolations, so `ImageView.tsx:314` ("gmux previews images up to 32 MB")
passed 4/4 while being on screen. The scanner is now a TypeScript AST walk; two further strings
(`supervisor.ts`, `TerminalPane.tsx`) were fixed by hand because a legitimate TECHNICAL pattern
exempts them and always will. Full write-up and the falsification table:
docs/research/32-phase18-name-audit.md §7.

No protected identifier strand was touched. Live sessions: **44 before, 44 after, byte-identical.**

### SHIPPED — what actually landed, per item

All six items landed. One geometry model now owns every limit in the window's three resizable
regions: `src/renderer/state/chrome-geometry.ts`. Nothing in it is a magic constant any more —
each number is either a floor with a reason or a fraction of the LIVE window.

| # | Wanted | Landed | Where |
|---|---|---|---|
| 1 | Left view to ≥50% of the live window; drag below min snaps to hidden | Yes. `sidebarMaxWidth()` = 50% of the live window, re-evaluated every move and on resize, reserving the activity bar, the rendered dock and the terminal floor. Drag-to-hide calls the activity bar's OWN toggle, so there is one truth and one stored width | `chrome-geometry.ts`, `app/Sidebar.tsx`, `state/store.ts` |
| 2 | Editor past the 0.65 cap + a subtle fill action with exact restore | Yes. `MAX_FRACTION` deleted; ceiling is `workArea − TERMINAL_FLOOR` (872px at the 1440 default, vs 723 before). **Fill the window** = ⇧⌘B, View menu, and a `screen-full` button in the editor's tab row. Fill writes nothing, so leaving it restores the prior layout byte-for-byte | `editor/EditorPanel.tsx`, `shared/keymap.ts`, `main/menu.ts`, `app/App.tsx` |
| 3 | An open file must not clip the session tabs | Yes, by candidate **(a)** — the strip is hoisted out of `TerminalRegion` and spans the whole work area above both regions. Measured at 1440 with a file open: strip 1112px (was 590px), terminal 612px, editor 500px, editor tab row 36px BELOW the strip | `app/SessionStrip.tsx`, `app/work-area.css`, `app/TerminalRegion.tsx` |
| 4 | Dock collapses to a rail of agent icons with hover status | Yes. 48px rail, agent icons, hover card portalled to `document.body` (`aria-hidden`, `pointer-events:none`) reading name · agent · state · age. The sessions-position control moved to the foot of the rail | `app/SessionRail.tsx`, `app/session-rail.css` |
| 5 | One divider helper; no pointer drift; prove it with numbers | Yes. `controls/resizer.ts` is the single implementation for all four dividers: grab offset from the PANEL's own rect, absolute mapping every move, clamp the result only, pointer capture, Esc-cancel, keyboard separator | `controls/resizer.ts` |
| 6 | Evidenced audit that no user-visible text says "gmux" | Yes, and it found three live strings the first scan missed. The scanner is now a TypeScript AST walk and ships as a test | `docs/research/32-phase18-name-audit.md`, `renderer/__tests__/user-visible-name.test.ts` |

**Item 5, the three acceptance numbers.** Final tree, real Electron over CDP, isolated
`--user-data-dir`, throttling flags on, real `PointerEvent` sequences, 1440×887. Every drag runs
past its clamp and back:

| divider | orientation | grab offset | 1. first-sample delta | 2. free-travel max / mean | 3. re-engage after the clamp |
|---|---|---|---|---|---|
| sidebar | top | −2 px | **0 px** | **0 / 0** over 21 samples | 262 px past the clamp → **0 px** on the first sample back in range |
| editor | top | +2 px | **0 px** | **0 / 0** over 22 samples | 604 px past → **0 px** |
| editor | right | +2 px | **0 px** | **0 / 0** over 18 samples | 710 px past → **0 px** |
| dock | right | +1 px | **0 px** | **0 / 0** over 18 samples | 281 px past → **0 px** |

All three conditions pass on all four dividers. Before: the sidebar lost every pixel of clamped
travel for the rest of the gesture, and the editor divider in `right` orientation jumped by the
session dock's whole width the instant it was grabbed.

**Item 3's decision and its consequence.** Candidate (a) was chosen, which moves the region
hierarchy and therefore the terminal's box — the one change in this phase that could resize real
work. It does not: a Phase 17 build and the Phase 18 build were driven side by side over 12 cells
(3 window widths × 2 orientations × sidebar shown/hidden) and **every cell is byte-identical**,
including `tmux -L gmux` pane geometry (e.g. 1440/top/280: `144x43`, mount `1112x826@y74` in both).
Across 66 measured cells the app-to-tmux ratio held constant at 7.50 px per column and 18.51 px per
row. Fill mode gives the terminal `display:none`, never `width:0`, so xterm's `Math.max(2, …)` can
never reflow a live pane to 2 columns.

### What is NOT true

- **The Context view (docs/research/29) does not exist yet.** Item 1 is generic by CONSTRUCTION —
  the resize and the snap live on the sidebar host, not on Explorer/Search/SCM — but that
  genericity has not been exercised against a second kind of view, because there isn't one.
- **The editor now covers the terminal instead of splitting it on narrow rows.** `editorIsOverlay()`
  is the fix for the F1 blocker: a work row that cannot seat 320 + 240 px gets no split at all. On
  a small window with a wide sidebar and dock, opening a file now overlays where it used to split.
  This is deliberate — the terminal is laid out at 0 or at ≥240px, never between — but it is a
  behaviour change, not just a limit change. Proven unreachable in `top` orientation, so it can
  never cover the hoisted strip.
- **One anomalous drift run, unexplained.** An early run of the `right`-orientation drift probe
  showed the editor panel AHEAD of the cursor (max |delta| 85 px in free travel). Five subsequent
  runs across three probe shapes on fresh profiles all returned 0 px. In both anomalous samples the
  panel was ahead of the cursor, never behind, which is the signature of buffered CDP input on a
  contended machine rather than of the app. Recorded rather than dismissed.
- **`docs/research/33-durability-reconciliation.md` is NOT part of this commit.** It was written by
  a concurrent research workflow and belongs to the durability queue, not to Phase 18.
- Fill mode is remembered for the session only; it is an override that writes nothing, so quitting
  in fill mode reopens unfilled. That was the design decision that buys exact restore.

### Gates on the final tree

| gate | result |
|---|---|
| `npm run typecheck` | clean, both projects, zero errors |
| `npm run build` | `✓ built in 20.78s` (main 360ms, preload 13ms, renderer 20.78s) |
| `npm run test` | **124 passed, 1 skipped (125 files); 1575 passed, 2 skipped (1577 tests)** |
| `npm run smoke:t1` | `5/5 PASS (create)`, `6/6 PASS (verify)` |
| `npm run smoke:t3` | `6/6 PASS (t3-prep)`, `3/3 PASS (t3-verify)` — a claude AND a pi restore shape |

`conformance:resume:capture` not required: no file under `agents/registry.ts`, `manifest/harvest/**`,
`manifest/agents.ts` or `restore/**` changed in this phase.

**Safety.** 44 sessions on the private socket before this phase and 44 after, `diff` empty. Every
app launch used its own `--user-data-dir` under the scratchpad. No session created, killed, renamed
or adopted; `tmux -L gmux` only; no `pkill` at any point; `/Applications/Tortie.app` untouched and
still running.

---

## Phase 18.5 — small work that does not wait on R34 (2026-08-12) ✅ SHIPPED

Six items. None of them touches a file that Phase 19, 20 or 21 will touch, so this phase can run
while the OSS survey (R34, docs/research/34) is still deciding how the durability phases get built.
Every item has a written spec already. Nothing here is designed in this phase.

**What must NOT be touched by this phase**, because the durability phases own them:
`src/main/sessions/core.ts`, `src/main/restore/**`, `src/main/db/sqlite.ts`, `src/main/migrate/**`,
`src/main/manifest/**`, `src/main/tmux/supervisor.ts`, and `src/shared/types.ts`.

### Item 1 — the book icon replaces the cloud glyph
Spec: docs/research/30-specstory-distribution.md section 4.4, which carries the baked 24 by 24 path.
`SettingsApp.tsx:39` currently renders `icon: 'cloud'` through `Codicon`. The rail needs to accept
either a codicon name or a brand SVG, rendered through the existing `InlineSvg`.
This also removes a collision. `cloud` is already the git remote branch glyph at
`scm/ref-badges.tsx:229` and `scm/BranchesView.tsx:380`. Those two stay on `cloud`, which is correct
there. Monochrome is the vendor's own treatment and the white path is dropped rather than recoloured,
for the reasons measured in section 4.3. File the asset at `src/renderer/assets/brand/`, not under
`assets/agents/`, because SpecStory is not a launchable agent. Tier 1.

### Item 2 — Settings tells the truth about which specstory it is using
Spec: docs/research/30 sections 3.1 and 4.7. Three separate gaps, all with the data already computed.
1. There are three copies of specstory on this machine at three different versions. Settings shows
   one binary and says nothing about the others. Show the chosen path and version, and list the
   others found.
2. `captureSupportFor()` computes a precise reason an agent cannot be captured, and the UI discards
   it, so the agent simply does not appear. Render the row disabled with the reason instead.
3. The provider probe is cached for the whole app run, so upgrading specstory while Tortie is open
   leaves the list stale. `resetProviderCache()` already exists and is commented as the seam for a
   re-check button. Wire a button to it. Tier 2.

### Item 3 — an unknown provider id is no longer discarded in silence
Spec: docs/research/30 sections 3.2 and 3.5. `parseProviderIds()` keeps only ids Tortie has a row
for, so a provider SpecStory adds that Tortie has never heard of vanishes with no trace. Today that
is `qwen`. Open the vocabulary and surface the unknown id honestly rather than dropping it.
If this needs a registry row, note that CLAUDE.md requires `conformance:resume:capture` on any commit
under `agents/registry.ts`. It costs about 16 seconds and no agent turns. Tier 2.

### Item 4 — a second copy of the app can no longer start
Spec: docs/research/27-release-and-updates.md section 2.7. There is no single instance lock anywhere
in `src/main/`, verified by grep. Electron provides `app.requestSingleInstanceLock()`. Every updater
ends by relaunching, so this must exist before any update ever ships. Focus the existing window on a
second launch. Tier 2.

### Item 5 — an agent can no longer disarm the launch confirmation
Spec: docs/research/31-extensions.md section 5.4. `sanitizeSettings` correctly filters
`launchDefaults` against `catalogedFlags(id)`, so arbitrary argv cannot be injected. But
`quickCreate` at `renderer/state/store.ts` bypasses the create sheet and applies launch defaults
directly, so an agent that can write settings.json makes every later hotkey create for that agent run
with its safety flag on, silently and durably. `dangerAcknowledged` is never read at launch, so
validating it would fix nothing. The fix belongs at the launch path or at the settings write
boundary. Tier 2, and it is small but it is not cosmetic.

### Item 6 — two stale claims in our own documentation
Spec: docs/research/27 section 1.1. `BUILD-STATUS.md` section 6 and the header of
`electron-builder.yml` both state that only an Apple Development certificate exists. A Developer ID
Application certificate has been on this machine since June and is valid to 2031. That stale claim
was the only recorded blocker on notarization. Correct both, and state what is actually still
missing, which is the App Store Connect issuer identifier. Tier 1.

### Verification
Items 1 and 6 are Tier 1, so gates plus one screenshot read for the icon. Items 2, 3, 4 and 5 are
Tier 2, so gates plus a targeted probe of the thing changed and one screenshot read where there is
something to see. Item 4 needs a real second launch against an isolated user data directory. Item 5
needs a probe proving that a written settings file cannot cause a launch with the flag set.

### What must not regress
The 44 live sessions and their pane geometry. The two SCM uses of the `cloud` glyph. The existing
capture behaviour for the six providers that work today. Phase 18's layout work, which touched
`renderer/state/store.ts` and is only three commits old.

### What actually landed, shipped 2026-08-12

All six items landed. Two verifiers ran independently of the builders and both returned a pass.
Nothing was deferred out of the phase.

| Item | What landed | Tier and evidence |
|---|---|---|
| 1 book icon | `src/renderer/assets/brand/specstory.svg`, 356 bytes, the path baked in research 30 section 4.4. The Settings rail entry is now a union of a codicon name or a bundled SVG, rendered through the existing `InlineSvg`, which `renderer/icons/index.ts` now exports. | Tier 1 plus a screenshot read. Measured glyph box 11.0 by 16.0 logical pixels against a designed 11.10 by 16.00, so it is not stretched. |
| 2 which specstory won | The Settings card names the winning copy with its version and its path, lists every other copy found with its own version, gives a re-check button, and draws a capture row that cannot work as disabled with the reason on it. | Tier 2. Driven live. Three copies on this Mac at 2.5.0, 2.6.0 and 2.8.0, and the card named all three. |
| 3 unknown provider id | `SpecstoryProviderId` is a `string` guarded by shape rather than an eight member allowlist, so an id the CLI reports and Tortie has no row for is surfaced instead of dropped. A discovered row is marked as unverified for exit code reporting. | Tier 2, plus `conformance:resume:capture` because `agents/registry.ts` changed. |
| 4 single instance lock | `app.requestSingleInstanceLock()` in `src/main/index.ts`, taken above the rename migration. A refused copy prints one line and calls `app.exit(0)`. The holder brings its window forward. Harness launches are exempt, and `GMUX_ALLOW_SECOND_INSTANCE=1` is the escape hatch. | Tier 2. A real second launch was run against an isolated profile. A holder killed with SIGKILL leaves the lock files behind and the next launch still starts. |
| 5 launch confirmation | A danger preset written into settings.json by anything other than the Settings window is stripped in main before any renderer sees it. The check sits at the settings read boundary in `src/main/settings/store.ts`, so it covers `quickCreate`, the per-agent hotkey and the ⌘T pre-checks at once. | Tier 2, plus a new test suite at `src/main/settings/__tests__/danger-seal.test.ts`. |
| 6 stale doc claims | The `electron-builder.yml` header and BUILD-STATUS section 6 both said only an Apple Development certificate exists. A Developer ID Application certificate has been here since June and is valid to 2031. Both were rewritten, and both now name the one thing still missing. | Tier 1. Re-measured with `security find-identity -v -p codesigning` at integration time. |

**What is still not true.** Notarization has never run from this machine, and it still cannot. The
App Store Connect key is on disk but the issuer id is not, and notarytool needs both. Nothing in this
phase changed the signing configuration itself, so `identity: null` still stands and the packaged app
still will not launch on another Mac. Item 1 also left the book mark heavier than the codicons beside
it, measured at about twice their ink over the same box. It reads correctly and it is not stretched,
but it does draw the eye. Research 30 section 4.5 has the inset variant if the operator wants it
toned down.

### Gates on the final tree

| gate | result |
|---|---|
| `npm run typecheck` | clean, both projects, zero errors |
| `npm run build` | `✓ built in 19.77s` |
| `npm run test` | **126 passed, 1 skipped (127 files); 1610 passed, 2 skipped (1612 tests)**, up from 1575 at Phase 18 |
| `npm run smoke:t1` | `5/5 PASS (create)`, `6/6 PASS (verify)` |
| `npm run smoke:t3` | `6/6 PASS (t3-prep)`, `3/3 PASS (t3-verify)`, a claude and a pi restore shape |
| `npm run conformance:resume:capture` | `6 PASS · 0 FAIL · 0 BLOCKED · 4 SKIP in 16.8s` |

`conformance:resume:capture` was required here, because item 3 changed `src/main/agents/registry.ts`.

**Safety.** 46 sessions on the private socket before the phase and 46 after, and `diff` on the two
lists is empty. That is 45 live sessions plus `gmux-control`, and every harness boot logged all 45 as
having no manifest row and ignored them. Every app launch used its own `--user-data-dir` under the
scratchpad. No session was
created, killed, renamed or adopted. Only `tmux -L gmux` was used. `pkill` was never run.
`/Applications/Tortie.app` was left alone and is still running.

---

## Phase 18.55 — zoom does not reach the search view ✅ SHIPPED 2026-08-12 (user reported)

### What landed
The zoom region now comes from the sidebar view's own identifier, so a view added later is zoomable
on the day it ships. The specification below is kept as written, because it names the root cause.

- **`src/renderer/state/sidebar-views.ts` is new.** It owns the sidebar's view identity as data:
  `SIDEBAR_VIEW_IDS`, the `SidebarViewId` type derived from it, `SIDEBAR_VIEW_LABELS`,
  `SIDEBAR_VIEW_DEFAULT` and `isSidebarViewId`. It imports nothing, because `zoom/regions.ts` is a
  pure module and `state/store.ts` pulls in the bridge, the settings presets and the context menu.
- **`src/renderer/state/store.ts` re-exports the type**, so every existing
  `import type { SidebarViewId } from '../state/store'` keeps working untouched.
- **`ZOOM_REGIONS` is now `['terminal', ...SIDEBAR_VIEW_IDS, 'sessions', 'editor']`**, which makes
  `ZoomRegionId` a superset of `SidebarViewId` by construction. The labels are assembled from the
  three non-view regions plus `SIDEBAR_VIEW_LABELS`, and `defaultZoomLevels()` is built from the
  region list rather than typed out.
- **The two way branch in `focus.ts` is gone.** It is now
  `if (view !== null) return sidebarZoomRegion(view.view)`, which narrows the `data-view` attribute
  and falls back to `SIDEBAR_VIEW_DEFAULT`. The rule is still a pure function of the `closest` probe,
  so the whole decision table is still testable without a layout engine.
- **The CSS rule is `.sidebar-view[data-view='search'] > :not(.view-header)`.** Search is the only
  view with no `.sidebar-rest`, because the results list is itself the scroller. Naming the band as
  the exception means the query block, the summary, the results list and all four empty states follow
  one level.
- **The guard is in `zoom/__tests__/regions.test.ts`.** It asserts, for every member of
  `SIDEBAR_VIEW_IDS`, that the view has a region, a label matching the rail's own label, a custom
  property and a rule in `zoom.css` that reads it. Adding a fourth view with no CSS fails only that
  guard, which was checked by mutation.

### Measured proof, Tier 3, independent verifier
The verifier reverted the fix, rebuilt, and reproduced the user's report over CDP: `--zoom-search`
did not exist, two presses of the zoom chord with focus in the results list moved `--zoom-scm` from
1 to 1.25, and the readout said "Source control 110%" while the user was looking at Search. On the
fixed build the same script moved `--zoom-search` from 1 to 1.25 with `--zoom-scm` unchanged at 1,
and the readout said "Search 110%". Screenshots at 75%, 100% and 175% show the rows, the summary and
the sticky footer scaling together while the 36 px header band stays fixed. The virtualizer was the
risk, and it was measured rather than assumed: with `zoom` on the scroller, `clientHeight`,
`scrollTop` and `scrollHeight` all stay in the element's own coordinate space, so the render window
arithmetic stays correct. No regression in the explorer, source control, editor, terminal or session
dock, and the image viewer still handles the chord itself.

---

### The specification, as written before the phase

Runs immediately after Phase 18.5 and before Phase 18.6. It is small, it is self contained, and it
touches none of the files the other phases own.

**Symptom.** You cannot zoom the search pane. Per pane zoom shipped in Phase 12.11 and is meant to be
first class in every pane.

**Root cause, and it is worse than the symptom.** The mapping from a focused element to a zoom region
in `src/renderer/zoom/focus.ts` is a two way branch rather than a lookup:

```ts
const view = closest('.sidebar-view');
if (view !== null) return view.view === 'explorer' ? 'explorer' : 'scm';
```

The sidebar hosts three views. `SidebarViewId` in the renderer store is `'scm' | 'explorer' |
'search'`. Anything that is not the explorer therefore resolves to source control. So zooming while
search is focused does not do nothing. **It silently zooms the source control pane instead**, and
changes a level the user did not ask to change.

The region list itself is the second half of the cause. `ZOOM_REGIONS` in
`src/renderer/zoom/regions.ts` has five members and `search` is not one of them, so there is no
`--zoom-search` custom property in `zoom.css` and no label for the readout.

This is drift rather than an oversight in one place. Search arrived in Phase 14, after zoom shipped in
12.11, and the zoom side was never extended. The comment directly above the branch says the ordering
"is the part that can silently rot", which is exactly what happened.

**The fix must be structural, because the Context sidebar is next.** A third branch would work today
and break again when Context lands as a fourth view. Derive the zoom region from the sidebar view
identifier so that any first class view added later is zoomable by construction. Add `search` to the
region list, its custom property, its label and its CSS rule.

**Add the guard that would have caught this.** A test asserting that every member of `SidebarViewId`
has a zoom region, a label and a custom property. Without it the same defect returns with Context.

**Verification: Tier 3.** CLAUDE.md gives a user reported bug proof rather than assurance. Drive the
real application, focus each sidebar view in turn, press the zoom chord, and read the resulting
`--zoom-*` custom properties from the running renderer. Screenshot the search pane at more than one
level and read the image. Then the part that proves the real defect: zoom the search view and assert
the source control level **did not move**.

**What must not regress.** Zoom in the explorer, source control, editor, terminal and the right hand
session dock. The chord itself, which the image viewer and the editor legitimately handle themselves.
Phase 18's layout work, since the sidebar was rebuilt three commits ago.

---

## Phase 19 — durability, with the harness that proves it (2026-08-12)

**Do not start this until Phase 18.6 has landed.** Item 8 below edits `restartSession` in
`src/renderer/state/store.ts`, and Phase 18.6 rewrites that file to add the home screen and the clone
action. Writing item 8 first means writing it twice. Phase 18.6 is itself gated on research 35
returning and on Phase 18.5 committing, so the chain is 18.5, then 18.6, then this.

Thirteen items. Every one of them fixes behaviour that is wrong at HEAD. None of them adds a feature
you can see.

Specifications: docs/research/33-durability-reconciliation.md for the ranked queue and the defects,
and docs/research/34-phase19-oss-survey.md for how each one gets built. Read 34 before writing any
code, because it overturns three things earlier documents assert.

**Line numbers in the research documents are stale.** Phase 18 rewrote the renderer state and Phase
18.5 is editing further. Find each defect by its symbol name rather than by the line it was on.

### Order matters, and it is not the order the research ranked them in
R33 ranked the crash harness eleventh. It goes first here. Several items below cannot be proven
without killing the app, and building the proof after the fix means the fix ships unverified. The
harness is affordable because half of it already exists as the `GMUX_SMOKE` pattern.

### Part 1, the two tools everything else uses

**Item 1, the general fault harness.** Nothing anywhere kills the app. Every existing harness quits
politely, so the crash safety story is untested, and crash safety is what the product is sold on. One
harness that kills the app at a random moment and relaunches covers seven rows of the fault matrix at
once. Design in research 34.
Two traps, both measured. **Playwright cannot drive Electron 43.** It times out on the current
release and on today's alpha, and the identical script works against Electron 35, so do not reach for
it. **SIGTERM is not a crash in Electron.** It runs the full graceful quit and honours a cancel, and
a Node level handler never fires because Chromium owns the signal. Only SIGKILL is a crash. A harness
built on SIGTERM tests the happy path and proves nothing. Extend `GMUX_SMOKE` instead. Tier 3.

**Item 2, the durable write module.** About 70 lines, in one module, owned by one place. Snapshots
need it now and the backup ring needs it in Phase 20, so two copies of the most safety critical code
in the product is the failure to avoid.
Do not add a dependency. Five candidate libraries were read from their published tarballs rather than
their documentation, and all five stop at flushing the file and renaming it. The best of them meets
two of the seven requirements.
Two facts change the sequence from the textbook one. **`fs.fsync()` on macOS already performs the
strong flush**, because libuv escalates it, so no native module is needed. And **flushing does not
prove the write succeeded**. On a full disk the write failed, the flush reported success, the rename
reported success, and a zero byte file was published. An explicit size and hash check between writing
and renaming is therefore a required step, not a refinement. Tier 3.

### Part 2, the fixes that need those tools

**Item 3, power loss safe snapshots.** `snapshots.ts` writes to a fixed temporary name and renames,
with no flush, no hash, no generation and a destructive replace. A badly timed power cut can leave
neither the old copy nor the new one. Use the module from item 2 and keep more than one generation.
Carry the capsule metadata that Phase 20's reconstruction will need, because reconstruction cannot be
built later without it. Tier 3.

**Item 4, the silent disk full.** `snapshotAllSessions` catches the out of space error and emits a
console warning. Protection stops and the user is told nothing, so they quit believing their
scrollback was saved. Emit one notice through the channel in item 9. Tier 2.

**Item 5, database integrity and quarantine.** There is no integrity check anywhere before the
manifest is opened, so SQLite opens a damaged file and writes over the copy the user still needs. Add
the check, and set the damaged file aside rather than overwriting it. For the last resort repair path
use `/usr/bin/sqlite3 .recover`, which is already on macOS, adds nothing to the bundle and adds
nothing to signing. Tier 3.

### Part 3, independent and mostly small

**Item 6, restore reports success falsely.** The restore path computes whether the transcript was
replayed and whether the resume was armed, then discards both and writes `running`. A restore where
both stages failed reads as healthy.
`SessionStatus` in `src/shared/types.ts` is five string literals today. Three separate queue entries
across Phase 19 and later phases all need to change it. **Design the full member set once, in this
phase, even if this phase's code can only produce some of them.** Touching that union in three
separate migrations of meaning is the outcome to avoid. Tier 2.

**Item 7, the restore journal.** The attempt is not recorded before it is acted on, so a crash part
way through a restore neither resumes nor rolls back. Journal it in the manifest rather than in a
separate file, because a second durability domain can disagree with the first, and detecting exactly
that disagreement is the reason the journal exists. Tier 3, verified by item 1.

**Item 8, restart discards before creating.** `restartSession` calls discard before create, and drops
the launch flags and the capture choice on the way. If create fails you have lost the session and its
settings. Nothing may be discarded until the replacement exists. Tier 3.

**Item 9, the notice channel.** Four separate items post messages to a surface that does not exist.
Extend the existing scrollback notice event with one kind per degraded state. Keep it quiet. Per the
Zen document this is a notice, not a dashboard. Tier 2.

**Item 10, the migration failure path.** When the data migration fails it returns a failed status, but
the notice the user would see is gated on success, so nothing is said. The app boots anyway and
creates the directory that makes every later launch report that the target already has data. The
state is permanent, even after the original cause is fixed. Proven by probe in research 33.
Fix this before Phase 20 reuses that module as the backup engine, or the backup engine inherits it.
Tier 2.

**Item 11, sleep and wake.** No power event is wired anywhere in the app. Force a capture when the
machine suspends, and clear the terminal texture atlas on resume, which is the same public function
VS Code calls from the same event. About 40 lines. This is not the full checkpoint scheduler, which
is a later phase and a larger piece of work. Tier 2.

**Item 12, claims about protection it has not observed.** Tortie must not assert that an off device
backup exists without having checked. On the one machine we can measure, automatic backups are off,
the last snapshot reference is four months old and the destination will not mount. Tier 1.

**Item 13, the config path inside the bundle.** The tmux supervisor passes a config path that lives
inside the application bundle, which an update replaces. On a cold start with that file missing, tmux
silently starts a server with a scrollback of 2000 lines instead of 25000, and exits zero with no
error. Assert the path exists and read back the value tmux actually set. Tier 2.

### Not in this phase, and why
The single instance lock and the launch flag defect were both in the earlier plan and both landed in
Phase 18.5. Do not build either a second time.
The adaptive checkpoint scheduler, the background host process and the full authority matrix are all
larger and sit later.

### What must not regress
The 44 live sessions, their pane geometry and their scrollback depth. The existing restore path for
both a claude shaped and a non claude shaped session, which `smoke:t3` covers. Phase 18's layout work
and Phase 18.5's six items, both of which are recent. The protected identifiers in CLAUDE.md, none of
which this phase has any reason to touch.

### Gates
The usual battery, plus `npm run conformance:resume:capture` if anything under `agents/registry.ts`,
`manifest/harvest/**`, `manifest/agents.ts` or `restore/**` changes, which items 6 and 7 will.

---

## Phase 18.6 — the home screen, and cloning a repository ✅ SHIPPED 2026-08-12

### What landed
| Item | State | Evidence |
| --- | --- | --- |
| The home screen, one 460 px column | shipped | `src/renderer/app/HomeScreen.tsx`, `home-screen.css`. Copy matches research 35 §1.11 word for word, read off the pixels. |
| The TORTIE.sh lockup | shipped | Measured in the running renderer. 28 px on 32, weight 600 with the suffix at 400, letter spacing 1.68 px and 0.56 px, wordmark 142.82 px against the specified 143, lockup 206.82 px against 207. `getAnimations()` returns 0, so the screen is still. |
| Centring, the operator's acceptance criterion | shipped | deltaX = 0.0 px at 960, 1440 and 1920. The column top is 224 px at 1440x900 in the five recent, three recent and no recent states, so the mark does not move. |
| Up to five recent projects, three in a short window | shipped | `src/main/recents/`, a JSON file at `<userData>/recents.json` at version 1. It survives a quit and a relaunch. The section label stays visible when rows are hidden. |
| Open Recent and Clone Repository… in the native File menu | shipped | Read out of Electron's own `Menu.getApplicationMenu()` in the running main process. |
| Cloning, spawning the system git | shipped | `src/main/projects/clone.ts`, `clone-parse.ts`, `src/shared/clone-url.ts`. No git package was added. |
| One progress bar per git phase | shipped | `src/renderer/state/clone.ts` keeps the current phase's own number and drops it when the phase word changes. There is no overall percentage and no byte denominator. |
| Two new tokens and no more | shipped | `--text-brand: 28px` and `--lh-brand: 32px`. The diff of tokens.css is those two lines and a comment. |

### The Tier 3 clone proofs, each one measured
| Requirement | Result |
| --- | --- |
| A public clone succeeds and opens as a project | octocat/Hello-World in 437 ms through the real dialog. `.git` on disk, the dialog closed itself, the tab reads "Hello-World", and the project reached `projects.list()` and the recents file. |
| A private clone succeeds using the keychain | github.com/gregce/tortie in 1,396 ms, driven through `CloneEngine`. 108 commits and 2 remote branches, so it is a full clone and not a shallow one. `HOME` was the real `/Users/gdc` and `GIT_CONFIG_NOSYSTEM` was never set. |
| A private clone with no credential fails readably rather than hanging | The same repository, with `HOME` pointed at an empty directory and `GIT_CONFIG_NOSYSTEM=1`, failed in 118 ms with "could not read Username for 'https://github.com': terminal prompts disabled". Nothing hung and nothing was stored. |
| Cancelling leaves nothing behind | A clone of nodejs/node was cancelled 1.5 s in. The temporary directory `.tortie-clone-euEotW` existed during the clone. After the cancel the parent folder was empty, the final folder was never created, and the terminal frame reported `cancelled: true`. |
| A destination that already exists is refused before anything is written | The dialog refused with "'Hello-World' already exists in that folder.", stayed editable, and wrote nothing. Zero `.tortie-clone-*` directories were left. |

### A defect found by the verifier and fixed inside the phase
A failed address check left `checkedAddress` at null, so every mousedown in the dialog blurred the
address field, re-ran the check, and unmounted the `[Show details]` button before the mouseup landed.
The user could never open the details. One bad address cost 10 network round trips. The fix records
the string that was answered, so a repeat blur is a no operation. The same probe now spends 1 round
trip, three real clicks on `[Show details]` spend 0, and the raw git stderr appears on the first
click. Four regression tests were added.

### What is not true
- The tortie.sh site returns 404 today. That is a deployment matter and the operator knows it.
- The status dot and the count badge on recent projects were cut, along with the synthesized overall
  progress bar, the byte denominator and the submodule controls. These were cut for the reasons
  recorded below and are not oversights.
- The clone dialog was driven over CDP rather than by a person, so the feel of the progress bar under
  a slow network is unmeasured. Only the numbers it prints were checked.
- No clone was tested against a non GitHub host. The URL rules cover GitLab, Bitbucket and a bare SSH
  host by unit test only.

### Gates at the commit
`npm run typecheck` clean. `npm run build` in 20.98 s. `npm test` 131 files passed and 1 skipped,
1,690 tests passed and 2 skipped. `npm run smoke:t1` 5/5 create and 6/6 verify, tmux and manifest
both clean. `conformance:resume:capture` was not required, because nothing under `agents/registry.ts`,
`manifest/harvest/**`, `manifest/agents.ts` or `restore/**` is touched.
The operator's live tmux sessions were counted before and after the whole phase. 41 both times, with
byte identical name lists. Every clone went under the scratchpad. Their git config, keychain and
credentials were read and never written.

### The specification, kept for the record

Full specification in docs/research/35-home-screen.md, which carries the wireframes, the exact copy,
the eleven URL rules and the ten failure messages. Read it before building. This entry records the
decisions and the boundaries.

Runs after Phase 18.55. Both edit `src/renderer/state/store.ts`, and Phase 19 waits on this one for
the same reason.

### Decided by the operator, 2026-08-12
1. **The wordmark is TORTIE.sh.** Research 35 raised this as an open question because the domain
   served nothing when probed. The operator owns tortie.sh, which answers it. The site returning 404
   today is a deployment matter, not a reason to change the application. About and the installer keep
   saying Tortie.
2. **Cloning spawns the system git.** This overturns the operator's earlier preference for adopting a
   package, and they chose it after seeing the measurements. Do not add a git dependency. The reasons
   each candidate failed are in research 35 and are not to be re-litigated without new evidence.

### The screen
A single column 460 px wide, centred in the window, contents left aligned inside it. In order: the
brand lockup, the promise sentence, three action rows, up to five recent projects, one drop hint.

Actions are rows rather than cards. A card layout forces one action to look primary, and DESIGN.md
forbids marking a primary with an accent fill at rest. Clone also needs a sentence rather than a
label, because it does not exist in the product yet.

The left alignment deliberately breaks the centred empty state family in the design specification,
because the screen now contains a list and a centred list has no stable left edge. That break is
recorded rather than slipped in.

Recent projects live in a JSON file under the user data directory. **Not the manifest**, which holds
session restore state and must not carry disposable data. Cap at five, dropping to three in a short
window.

### Cloning
The command, the environment and the sequence are specified exactly in research 35. The parts that
will be got wrong if skimmed:

- **Four credential switches are needed, not one.** `GIT_TERMINAL_PROMPT=0` on its own is beaten by
  two other mechanisms, both proven by measurement.
- **`HOME` must be real.** The same private clone went from succeeding in 603 ms to failing when only
  `HOME` changed.
- **Never suppress the system git configuration.** The macOS keychain helper is configured there and
  nowhere else, so suppressing it breaks every private clone.
- **Full clone, not shallow.** A depth of one left 1 commit and 2 branches on a repository that has
  36,770 and 372.
- Clone into a temporary sibling directory and rename it into place, so a failure leaves nothing
  half formed where the project should be.
- Cancel with the polite signal on a child that is not detached, and cancel again on quit. Never the
  hard kill, which leaves the repository mid write.
- A preflight runs before the clone, and **not when the dialog opens**, because that would fire a
  network call and a keychain prompt at whatever happened to be on the clipboard.

**Progress is one bar per git phase, showing that phase's own number, reset when the phase changes.**
There is no overall percentage and no byte denominator. Git prints a cumulative byte figure and never
a total, so a denominator would be invented. A synthesized overall bar was cut because its weighting
would have spread the last fifteen percent over 192 of 505 frames.

### Cut, and not to be added back without a reason
The status dot and the count badge on recent projects. This is the one place the draft crossed the
Zen document: a number that rises on its own, on a screen where the user cannot act on it, with
motion on the state DESIGN.md says must be still. The menu bar already carries that information
completely. Also cut: the synthesized progress bar, the byte denominator, a hardcoded sentence
claiming nothing was left on disk, and the submodule controls in the dialog.

### Centring, added by the operator 2026-08-12 after seeing a build in progress
Reference: `/Users/gdc/Library/Application Support/CleanShot/media/media_bKSpvfcoXM/CleanShot 2026-08-12 at 16.49.00@2x.png`.
In that build the column sits well left of the window's centre with a large empty area below it. The
operator's instruction is that the finished screen must be **well centred**. This is an acceptance
criterion, not a preference, and both conditions below are measurable.

**Horizontal.** The column's horizontal centre must equal the window's horizontal centre, within 2 px.
Measure it by reading the bounding rectangle out of the running renderer at three window widths, being
960, 1440 and 1920. Research 35 already says the column is centred horizontally with its contents left
aligned inside it, so a build that is off centre is a defect against the specification rather than a
new requirement.

**Vertical, and this one needs a decision rather than a rule.** Research 35 anchored the column near
the top deliberately, so the mark sits at the same height on the first launch and the hundredth. That
reasoning is sound and must not be thrown away by simply centring the column, because then the whole
screen would move up and down as recent projects appear and disappear.
Resolve it this way: choose the top offset so that **the tallest state is vertically centred**, and let
every shorter state keep that same top edge. Research 35 measured the three heights as 490 px with five
recents, 434 px with three and 296 px with none. So the offset is computed from 490, and the mark never
moves.
Optical centring slightly above the true middle is acceptable if it reads better, but the amount must
be stated as a number in the code with a one line reason, not left as an unexplained constant.

**What the verifier must report.** The measured window centre and column centre at each of the three
widths, and the top edge of the column in the empty, three recent and five recent states, showing it
does not move.

### Verification
Tier 2 for the screen, being gates plus screenshot reads at a wide and a narrow window, including the
first launch state with no recents. **The centring criterion above is part of this tier and a failure
on it is a failure of the phase.**
**Tier 3 for cloning**, because it writes to the filesystem and touches credentials. Prove each of
these against a real repository: a public clone succeeds and opens as a project; a private clone
succeeds using the keychain; a private clone with no credential fails with a readable message rather
than hanging; cancelling leaves nothing behind; and a destination that already exists is refused
before anything is written.

### What must not regress
The promise sentence, which is the only line on the screen that says why Tortie exists. Dropping a
folder onto the window, and the open shortcut. The other full window states that share this file.
Phase 18's layout work, Phase 18.5's six items and Phase 18.55's zoom fix, all of which are recent.
