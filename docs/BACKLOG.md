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
| 1 | **18** chrome layout constraints | SHIPPED `bfa67d7` | — |
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
| 4 | **19** durability, with the harness that proves it | ✅ SHIPPED 2026-08-12 | — |
| 5 | **20** the verified backup ring | ✅ SHIPPED 2026-08-13 | Phase 19 ✅ |
| 5b | **20.5** file preview beyond markdown, starting with HTML | ✅ SHIPPED 2026-08-13 | Phase 20 ✅ |
| 6 | **21** versioned agent recovery contracts, as one migration with resume provenance | ✅ SHIPPED 2026-08-13 | Phase 20 ✅ |
| 7 | **22** the Context sidebar, with installing enabled | ✅ SHIPPED 2026-08-13 | — |
| 8 | **23** Tortie Config, configuration not code, plus the authoring prompt | ✅ SHIPPED 2026-08-13 | 22 ✅, and **never before 21** ✅ |
| — | ~~**25** downloads and usage measurement~~ | **DEFERRED 2026-08-12 by the operator.** Spec kept below and stays valid. Note it must ship IN a released build, so reopening it after a release means the first cohort is unmeasurable |
| 9 | **25.5** the DeepSeek CLI renamed itself and detection is broken | ✅ SHIPPED 2026-08-13 | nothing. Small, and can run beside any phase |
| 9b | **26** Context sidebar dogfood round, user reported | ✅ SHIPPED 2026-08-13 | 25.5 ✅ |
| 10 | **Release lane (Phase 27)** Itavero identity, signing, notarization, version scheme, four CI lanes | ✅ SHIPPED 2026-08-13 | after Phase 25.5 ✅ |
| 11 | **24** self update | ✅ SHIPPED 2026-08-13 | the release lane ✅. The app is now signed, so this is unblocked |
| — | ~~Release lane, second half: signing, notarization, the updater~~ | signing and notarization shipped with Phase 27. The updater is Phase 24 | the issuer identifier was never needed. Notarization uses the Apple ID, the team id and an app specific password, the deadreckon shape |
| 12 | **28** process observability after the lid close diagnosis | ✅ SHIPPED `e9a8731` | — |
| 13 | **29** session history: browse and restore removed sessions | ✅ SHIPPED 2026-08-14 | spec is docs/research/39-session-history.md |
| 14 | **30** skill removal through the skills CLI | ✅ SHIPPED `f33599b` | — |
| 15 | **32** the antigravity claim race (operator hit it live, 2026-08-14) | ✅ SHIPPED `ecdfcad` | — |
| 16 | **31** updater honesty after the operator's first live update (operator reported, 2026-08-14) | ✅ SHIPPED `aa4e456` + `a63ec76` | Phase 24 ✅ |

**The wave plan, recorded 2026-08-14, operator approved.** Phases run in parallel when their file
domains are disjoint, never more than 3 build workflows at once. Every phase commit moves the
version: minor for a feat subject, patch for a fix, nothing for docs, chore, test or ci. The
version on main states what accumulated even when no release is tagged. The next release is
0.20.0, cut on the operator's word once Phase 36 lands, because 36 closes the last known defect
in the shipping build.

| Wave | Phases | Gated on |
| --- | --- | --- |
| A, landed and released as 0.20.2 | **36** quit crash (`3c09245` + `3d1d70c`), **29** session history (`d08ab00`), **37** inline naming (`7c0ae02`) | — |
| cleanup, landed | **42** the architecture cleanup, 9 stage commits `ba6a090` to `a1c7e1e` plus ledger `e28c53f` | 36 and 38 landed |
| 1 | **47** explorer and git pane nits (fix), **35** uniform logging (feat), **33** env passthrough (feat, ✅ landed this commit) | 42 pushed |
| 2 | **34** the CodeWhale race (fix, ✅ landed this commit), **40** selection and calm focus (fix, ✅ landed this commit), **39** Open With (feat, ✅ landed this commit), **43** updater wreckage recovery (fix, PULLED FORWARD, ✅ landed this commit) | wave 1 slots free |
| 3 | **41** bundled tmux 3.7b (feat, ✅ landed this commit), **46** Runs in the SCM view (feat, ✅ landed `1eeddea`) | wave 2 slots free |

## The release plan, decided 2026-08-15

Phases accumulate on main with the version moving per commit type. A release is cut only at a
breakpoint, and the breakpoints are chosen by the rule below rather than by the calendar.

Releases are named by CONTENT, not by a predicted number. The version on main moves with
every commit, so the number a release carries is whatever main holds when the operator cuts it.
As of 2026-08-15 main is at 0.22.0 after Phases 35 and 33, so the release below called 0.21.0
will in fact be cut at 0.22.0 or higher.

| Release | Contents | The story it tells |
| --- | --- | --- |
| **The first**, after wave 2 lands | 47, 35, 33, 34, 40, 39 and 43 | Tortie explains itself and gets out of your way. Every item is either a defect the operator reported or a diagnostic that makes the next failure legible. Nothing changes how sessions live or how the app starts |
| **The second**, bundled tmux alone | 41 | A fresh Mac runs Tortie with nothing installed first. It travels alone because it changes which binary owns every session at the next cold start, and a warm server on an older tmux is the one hazard that must be unambiguously attributable |
| **The third** | 46, plus the herdr study recommendations if the operator green lights them, especially the versioned resume contracts | Tortie shows you your CI and stops guessing about resumes |

**The rule that generates a breakpoint.** Cut a release when all three are true.

1. The changelog tells one story in a sentence. If nobody can summarize it, nobody can debug it
   either.
2. No Tier 3 phase in it landed inside the soak window. Durability work runs on the operator's
   machine for a day before it reaches anyone else's.
3. It contains at most one phase that touches how sessions live or how the app boots, so a
   regression has one suspect rather than several.

**Why Phase 43 moved forward into wave 2.** A fix to the update path only protects the updates
that come after the version carrying it. Shipping the updater recovery in the first release means the bundled tmux release,
the riskiest delivery in the queue, lands on a build that can heal its own updater state. The
operator hit that exact wreckage by hand on 2026-08-15.

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
3. **12.9 + 12.10 together** ✅ shipped (39cfa4f) — both are tree work, and 12.10's drag-to-attach conflicts with 12.9's drag-to-move; they must be designed as one interaction.
4. **12.11 + 12.12 together** ✅ shipped — UI polish (per-pane zoom; shared agent grid, sessions-position toggle, ⌘9-to-last, hold-⌘ tab hints). 12.12 item 5 left a standing contract: `src/shared/keymap.ts` is the ONLY shortcut list, enforced by `src/shared/__tests__/keymap-single-source.test.ts` — every later phase adds shortcuts there and nowhere else.
5. **14** search ✅ shipped — the last parity work; **scope is now capped per CLAUDE.md**: everything from here goes to durability, the agent layer, correctness and consolidation unless the user asks otherwise.
6. **15** SpecStory bundling ✅ shipped — specstory-cli 2.8.0 rides inside gmux.app (signed, bundled-first resolution), per-session capture wraps BOTH argv and resume_argv, a session-end sync backstops the flush tmux's SIGHUP skips, and Settings → SpecStory owns the device sign-in. · **16** refactor · **16.5** Tortie rename + migration · **17** final install.
Research is already complete for 13.5, 14 and 15 — those are spec-complete and can start the moment their slot opens.

Working queue maintained by the orchestrating session. Reference screenshots are real files — builders must Read them.

## Phase 9.2 bugfixes ✅ SHIPPED (86ecd36, d9336d7)

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

## Phase 10 — agent launching + interaction round ✅ SHIPPED (0d43f16, 9522e6b)

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

## Phase 12 — dogfood round 2 ✅ SHIPPED (611d74c perf, d3ee863, 539e76d)

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

## Phase 12.2 — BUG: renaming a session grabs the drag handle ✅ SHIPPED (c638575)
Symptom: starting a rename makes the row/tab immediately grabbed and movable, so typing/selecting in the rename box is fought by the drag.
USER-CONFIRMED SCOPE: happens ONLY via right-click → Rename. **fn+F2 rename works perfectly.** That asymmetry is the tell.
ROOT CAUSE: `src/renderer/app/split/pointer-drag.ts:36` documents itself "Call from a React onPointerDown (**primary button only**)" — but NO caller enforces it. A right-click fires pointerdown with `e.button === 2`, which starts a surface drag; the native context menu then opens over the armed drag, the user picks Rename, and the drag is still tracking the pointer. F2 never goes through pointerdown, which is exactly why it is unaffected.
Fix (at the source, so no caller can reintroduce it):
1. **Enforce primary-button-only inside `startSurfaceDrag` itself** (pointer-drag.ts): bail unless `e.button === 0` (and ignore non-primary `pointerType === 'mouse'` buttons generally). Belt and braces: also add `if (e.button !== 0) return;` to the three call sites — src/renderer/app/split/surface-dnd.ts:237, src/renderer/app/SessionDock.tsx:187, src/renderer/app/TerminalRegion.tsx:276 — and audit src/renderer/app/Titlebar.tsx:63 + src/renderer/app/split/SplitSurface.tsx:64,226 for the same defect (project tabs and split handles will have it too — a right-click on a project tab probably arms a tab drag as well).
2. Make `setRenaming(id)` ABORT any in-flight drag (expose a cancel from pointer-drag.ts) — cheap insurance for any other path that arms a drag before a rename begins.
3. Add the missing `renaming` guard to SessionDock.tsx:187 and TerminalRegion.tsx:276 for parity with surface-dnd.ts (which already has it).
Tests: unit — startSurfaceDrag ignores button 1/2; setRenaming cancels an active drag. Probe — right-click → Rename on a dock row, a strip tab, a right-list row, and a project tab: input appears, nothing moves, typing and text selection work; then confirm left-drag reorder and fn+F2 both still work.

## Phase 12.3 — scrollback in AGENT panes + visible scrollbar ✅ SHIPPED (6ef60e0)
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
**CORRECTION TO A VERIFIER CLAIM (do not act on it as written):** the Phase-12 functional verifier reported "resources/gmux-tmux.conf:27 sets `set -g mouse on`". That is a MISREAD — line 27 is inside the comment block explaining what `mouse on` *would* do; the real directive is line 38, `set -g mouse off`, and `git log -- resources/gmux-tmux.conf` shows no change since Phase 8.1 (96cbc61), well before Phase 12. Do NOT flip tmux mouse mode on the strength of that finding.
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

## Phase 12.4 — teach the preview/pinned tab model from the explorer (small UX) ✅ SHIPPED (c19719a)
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

## Phase 13 — accurate per-agent activity detection ✅ SHIPPED (4c6f2ea, 81a40d1) — spec retained below
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

## Phase 12.8 — three dogfood nits ✅ SHIPPED (a58458e, 4973e42)
1. **Replace two agent icons.** Sources: `/Users/gdc/Downloads/qwen.svg` -> `src/renderer/assets/agents/qwen.svg`, and `/Users/gdc/Downloads/meta-icon.svg` (the Meta infinity mark) -> `src/renderer/assets/agents/muse.svg`. They CANNOT be copied as-is: qwen.svg is 200x200 with radial gradients + white fills; meta-icon.svg is 256x171 (wide, non-square) with linear gradients and #0081FB. The existing system is a 24x24 viewBox, single monochrome path, `fill="currentColor"`, rendered crisply at 16px (verified at 3x zoom in Phase 10). Work: flatten each to a recognizable monochrome silhouette, normalize to a 24x24 square viewBox with the Meta mark CENTERED (never stretched — its native aspect is 3:2), keep strokes/counters legible at 16px, and verify at 16px AND 3x zoom in every surface an agent icon appears (tab strip, right dock, create modal, attention overlay, empty state, Settings, hotkey rows). If a monochrome flatten loses the mark's identity, say so and propose keeping brand color for that one rather than shipping mush.
2. **BUG — the SESSIONS chevron dropdown only offers 3 agents** (ref shot: media_pWjxHbNnNe — "Claude Code / Codex / Shell"). It must list EVERY supported agent, exactly like the create modal does: driven from the registry with detection state (installed = actionable, not-installed = disabled with the same quiet treatment used elsewhere), correct AgentIcon per row, in both the top-strip and right-dock orientations. Root-cause it — the dropdown is almost certainly a hardcoded array rather than a registry read; delete the hardcoded list, do not extend it.
3. **Multi-select staging/discarding in the SCM Changes list** (ref shot: media_4wrv5WZbyA — today only one file at a time). VS Code parity: click selects; shift-click selects a RANGE; cmd-click toggles individual rows; cmd-A selects all within the group; the row actions and the native context menu then apply to the WHOLE selection (Stage / Unstage / Discard / Open diff), with the discard confirmation naming the count ("Discard changes in 4 files?"). Selection must be keyboard-reachable (shift+arrows extends), survive a git:changed refresh where the files still exist, and clear sensibly when they do not. Applies to every resource group (Staged / Changes / Untracked / Merge).

## Phase 12.10 — image preview + tree-to-agent drag ✅ SHIPPED (39cfa4f)
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

## Phase 12.11 — per-pane zoom ✅ SHIPPED (6b7fc5d)
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

## Phase 12.12 — shared agent grid, sessions toggle, cmd+9, keymap reference ✅ SHIPPED (6b7fc5d)
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

## Phase 12.85 — Tortie iconography ✅ SHIPPED (d95d0e9)
Product philosophy: docs/ZEN-OF-TORTIE.md. Assets: docs/brand/tortie/ (production-ready — do NOT regenerate; the README records the master SHA and forbids wrapping the mark in a rounded square, badge, or any outer chrome).
1. **App/dock icon** -> `docs/brand/tortie/macos/Tortie.icns` replaces build/icon.icns in electron-builder.yml. Verify in the packaged .app (Dock, Finder, cmd-Tab) at every size — the mark is freestanding, so check it reads at 16px in Finder lists.
2. **Menu-bar presence** -> a macOS status item using `menu-bar/TortieTemplate.png` + `@2x`. Electron must mark the NativeImage as a template image (`setTemplateImage(true)`) so macOS tints it for light/dark and highlight states. Content per the Zen doc's "What needs me now?": the menu lists sessions needing input across ALL projects (reuse the attention-overlay data), plus Show app / New Session / Quit. NO counters or activity feeds — "a number that rises on its own is not a signal, it is noise in a nicer font."
3. **Understated in-window presence** — ONE place only, quiet: candidates are the no-projects empty state or a small mark in the titlebar's leading area. Pick one, low contrast, never animated. Propose with a screenshot before adding a second location.
Verify: icon at all sizes incl. Retina; template image tints correctly in both menu-bar appearances; the status menu reflects real attention state; the in-window mark holds at 1x and 2x without disturbing layout.

## Phase 12.9 — project + file management ✅ SHIPPED (5e39605 foundations, 39cfa4f)
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

## Phase 13.5 — universal RESUME ✅ SHIPPED (7a47257, 3a14699, d8f1208, eca4c7b)
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

## Phase 13.7 — configurable scrollback limits + diagnostics ✅ SHIPPED inside Batch D (aa7b8d2; src/main/scrollback, src/main/diagnostics, ScrollbackSection.tsx)
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

## Phase 13.8 — process identity + PATH-probe leak ✅ SHIPPED inside Batch D (aa7b8d2; src/main/proc, build/after-pack.cjs)
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

## Phase 14.2 — filter-field and explorer-header nits ✅ SHIPPED inside Batch D (aa7b8d2; src/renderer/controls)
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
DIAGNOSIS (read-only, at HEAD aa7b8d2) — FOUR defects compose, all in src/main/menu.ts:
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

## Phase 15 — SpecStory bundling ✅ SHIPPED (e930530, 1db2853)
Bundle specstory-cli into gmux.app; per-session capture toggle (watch-wrap preserving resume argv); sync-at-session-end affordance; Settings: cloud login status / device auth / last sync.

## STANDING GUARDRAILS — apply to EVERY phase from 10 onward (integrators enforce before commit)
User-mandated: no messy growth or duplication accrual.
1. **One preload bridge.** The base/full/complete/depth wrapper generations in src/preload/index.ts are a smell — the NEXT phase that touches preload collapses them into a single typed invoke bridge (one generic per-channel map derived from src/shared/ipc.ts). No phase may add a new "generation"; append channels to the one map.
2. **Organize by domain, not accretion (TS best practices, no hard line cap):** one module = one responsibility, small deliberate export surface. Split when a file mixes unrelated domains or needs section comments to navigate — the signal is cohesion, not a line number. The named offenders (store.ts, main/ipc.ts, app.css, 700-line SCM components) fail the cohesion test, which is why Phase 13 splits them.
3. **No duplicated resolution/config logic.** tmux binary/config resolution goes in ONE module (src/main/tmux/resolve.ts) consumed by supervisor AND attach host. Same rule generally: search for an existing helper before writing one (grep first).
4. **Integrator dup-scan before commit:** quick pass for copy-paste blocks introduced by parallel builders (same 10+ line block in 2+ files → extract).

## Phase 15.5 — codebase re-baseline ✅ SHIPPED (f923079 → docs/research/25-codebase-context.md)
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

## Phase 16 — refactor & consolidation ✅ SHIPPED (bfc3c85 defects, ab42553, ae6a1b7) — drove from docs/research/25-codebase-context.md, NOT the stale figures below; after Phase 15.5; Pierre deletions land first so this is done once)
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

## Phase 16.5 — rename gmux -> Tortie ✅ SHIPPED (53fa1e4 migration, 09cb853, cda2b1a)
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

## Release lane — signing and notarization, following deadreckon (2026-08-12) ✅ SHIPPED 2026-08-13 as Phase 27

Shipped in full. The identity is `com.itavero.tortie`, the version is 0.18.0 with a hand-written
CHANGELOG.md, the app is signed with the Developer ID and the hardened runtime, notarization was
accepted by Apple (submission 0130dfee-75ac-4c89-be79-50d876cedbb8, 77 s), and
`build/verify-signed.mjs` gates the DMG, the ZIP and the loose app. Four CI lanes exist under
`.github/workflows/`. The CI lanes are unproven until the first push runs them. The rest of this
section is the record of the decisions as they were made.

The operator instruction is to use the same keys and the same bundle identifier approach as
`/Users/gdc/deadreckon`, which already ships signed and notarized macOS builds. Read that repository
before building this. The relevant files are `.github/workflows/release.yml` and
`release/trust/sign-macos-artifacts.mjs`.

**This removes the blocker we recorded.** Research 27 said the one missing credential was the App
Store Connect issuer identifier. Deadreckon does not use the App Store Connect key at all. It calls
`xcrun notarytool` with an Apple ID, a team identifier and an app specific password. Nothing else is
required, so notarization is unblocked today.

### What deadreckon does, and what Tortie copies
| Piece | Deadreckon | What Tortie does |
| --- | --- | --- |
| Certificate | A p12 imported into a temporary keychain in CI | Same. Do not reuse the login keychain in CI |
| Notarization credentials | `--apple-id`, `--team-id`, `--password` with an app specific password | Same |
| Secrets | `APPLE_CERT_P12`, `APPLE_CERT_PWD`, `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_APP_PWD` | Same five names, so both repositories stay consistent |
| Signing helper | One script that signs every native executable, submits the assembled payload, then repacks the exact archive that gets checksummed | Tortie already has `build/after-pack.cjs` doing the per binary signing. Extend it rather than adding a second path |
| Bundle prefix | `com.itavero`, giving `com.itavero.deadreckon` | **Decision needed, see below** |

### DECIDED 2026-08-12: Tortie ships under Itavero, not SpecStory
The operator instruction is that Tortie belongs to Itavero, their personal LLC, and lives under their
`gregce` GitHub account rather than the SpecStory organisation. So the vendor identity changes.

| Field | From | To |
| --- | --- | --- |
| Bundle identifier | `com.specstory.tortie` | `com.itavero.tortie` |
| package.json author | `SpecStory` | Itavero |
| Nested binary identifiers | `com.specstory.tortie.specstory` | Derived automatically, no edit needed |

**The distinction that must never be lost, and it is exactly parallel to the gmux rule in CLAUDE.md.**
Tortie's own vendor identity becomes Itavero. **The SpecStory integration stays SpecStory**, because
that is a separate product Tortie talks to. That means `specstory-cli` and its bundled binary, the
`src/main/specstory/` module, the Settings section, the book mark and every capture path keep their
names. A later cleanup agent must not "finish off" this rename by sweeping through those.

**Why this is smaller than it looks, verified in the code rather than assumed.**
- The data directory follows `app.setName`, which is Tortie, and **not** the bundle identifier. The
  comment at `src/main/index.ts:101` states it and `app.getPath('userData')` confirms it. So the
  manifest, the snapshots, the hooks and the dropped images all stay exactly where they are. **No
  data migration is required.** Your sessions are not at risk.
- The nested binary identifier is built from `context.packager.appInfo.id` at
  `build/sign-nested-binaries.cjs:61` and `:93`, so it follows the change with no edit.
- The private tmux socket, the manifest and every running session are unaffected, because none of
  them is keyed to the bundle identifier.

**What genuinely changes, and it is already handled.**
- macOS keys permission grants to the bundle identifier, so anything previously granted starts empty
  and macOS asks again once per permission.
- The login item is registered through SMAppService, which keys on the bundle identifier. Phase 16.5
  built `reconcileLoginItem()` in `src/main/restore/login-item.ts` for precisely this case, and a one
  time notice already exists in `src/main/migrate/notice.ts`. **Reuse both. Do not write a second
  path.** Research 33 found a defect in that notice's failure gating, which Phase 19 item 10 is
  fixing, so land this after Phase 19.

**Do it now rather than later.** The cost rises the moment a signed build has been installed anywhere
other than this machine, because from then on it is a migration for other people too.

Also update the identity line in CLAUDE.md, README.md and BUILD-STATUS.md, all of which currently
name `com.specstory.tortie` as the product identifier.

### Going public, decided 2026-08-12, and the short list that comes first
The operator has decided the repository at `github.com/gregce/tortie` becomes **public**. That unlocks
the GitHub update feed for Phase 24 and takes continuous integration from about 55 dollars a month to
zero.

Four things to settle before flipping it, in order of how much they matter. A scan of every tracked
file on 2026-08-12 found **no API keys, no private keys and no tokens**, so none of this is urgent
remediation. It is housekeeping and one judgement call.

| # | Item | What it is | Recommendation |
| --- | --- | --- | --- |
| 1 | **No LICENSE file** | A public repository with no licence means nobody may legally use, copy or contribute to it. `package.json` already says MIT, so the file is missing rather than the decision | Add MIT, matching what package.json already declares |
| 2 | **The bb teardown in research 31** | `docs/research/31-extensions.md` contains a detailed analysis of `/Users/gdc/bb`, including its line counts, an internal design document that admits an open permission question, and the two migration filenames that created and dropped its marketplace table. It is fair technical analysis and it is also more than bb has published about itself | **The operator decides.** It concerns a third party product. The options are to publish as is, to redact the internal specifics while keeping the architectural lesson, or to keep that one document out of the public tree |
| 3 | **Apple identifiers** | The team identifier and the App Store Connect key identifier appear in three files. The team identifier is readable from any signed application, and the key identifier is one part of a three part credential whose key file is not in the repository | Low risk. Leave them, or redact for tidiness |
| 4 | **Local paths** | 96 markdown files contain `/Users/gdc` paths, which reveals the username and the names of other local repositories | Cosmetic. Leave them, since the research documents are more useful with real paths |

Also worth knowing rather than acting on. 103 commit messages carry the private session URL in a
trailer. Rewriting history to remove it would be more disruptive than the exposure warrants, and the
URL is not accessible to anyone else.

Attribution is already handled. The codicon set is CC-BY-4.0 and is credited in the About panel.
Confirm that credit satisfies the licence once a LICENSE file exists and the surrounding terms are
clear.

### Order
This lane touches no source file outside `build/` and `.github/`, so it runs beside any phase without
a collision. It is the one piece of parallel capacity currently unused.

---

## Phase 19 — durability, with the harness that proves it ✅ SHIPPED 2026-08-12

All thirteen items landed, and a fix round closed fifteen more defects that the verifiers found.
Nothing here adds a feature you can see. Every item was behaviour that was wrong at HEAD.

### What landed, item by item
| Item | State | Evidence |
| --- | --- | --- |
| 1, the general fault harness | shipped | `build/fault-harness.mjs` and `src/main/fault/`. It kills the app with SIGKILL, relaunches it and reports what survived as JSON. The default battery is 16 cases and 32 launches. `npm run smoke:fault` on the final tree: 16 of 16 pass in 67.6 s. SIGTERM appears nowhere in it. |
| 2, the durable write module | shipped | `src/main/durable/`, no new dependency. Stage, size check, flush, read back and hash, rename, then one directory flush per directory per batch. 382 lines of tests in `write.test.ts`, driven through a probe filesystem that fails one call at a time. |
| 3, power loss safe snapshots | shipped | `src/main/restore/snapshots.ts`. Bodies are never overwritten. Each capture writes the next generation, the ring keeps several, and a completion record names the ones a reader can trust. The capsule carries the whole recipe, so Phase 20 can rebuild a session from it. |
| 4, the silent disk full | shipped | `snapshotAllSessions` posts a `snapshot-failed` notice (`src/main/sessions/core.ts:351`). The user is told the capture did not happen rather than quitting in the belief that it did. |
| 5, database integrity and quarantine | shipped | `src/main/db/integrity.ts`, `recover.ts` and `digest.ts`. The manifest is checked before it is opened, a damaged file is set aside rather than written over, and the last resort repair is `/usr/bin/sqlite3 .recover`, which is already on macOS and adds nothing to signing. |
| 6, restore reports success falsely | shipped | `restoredStatus` in `src/main/sessions/core.ts` derives the stored status from the restore result, and `running` is unreachable from it. The rules are in `src/shared/restore-status.ts`, used by main, by the notice channel and by the renderer. `SESSION_STATUSES` is one list of seven members in `src/shared/types.ts`, designed once, with the type derived from it. |
| 7, the restore journal | shipped | `src/main/restore/journal.ts`, in the manifest and not in a second file. Driven at all five restore stages with a real SIGKILL and a real relaunch. No duplicate session and no duplicate row in any of the five. |
| 8, restart discards before creating | shipped | `src/main/restart/restart.ts`, in main rather than in the renderer. It reads the old row, creates the replacement, kills the old tmux session and only then discards. The launch flags and the capture choice come across. A create that throws leaves the row, the snapshot and the hook settings untouched. |
| 9, the notice channel | shipped | `src/shared/notice.ts` and `src/main/notice/`. Seven degraded kinds on the existing `scrollback:notice` event, each posted from one place. It is a notice and not a dashboard. |
| 10, the migration failure path | shipped | `src/main/migrate/notice.ts` and `userdata.ts`. A failed migration tells the user, keeps the original as the backup and stays armed for the next attempt. `smoke:migrate` gained stage 10, which fails a migration on purpose and then retries it. |
| 11, sleep and wake | shipped | `src/main/power/index.ts`. Suspend forces a capture, and resume clears the terminal glyph atlas through the same public call VS Code makes from the same event. `npm run smoke:power` PASS: the capture wrote in 103 ms, the marker is in it and the capsule reason reads `system-sleep`. |
| 12, claims about protection it has not observed | shipped | `src/main/diagnostics/off-device.ts`. It answers by checking, and it answers "unknown" when the check cannot answer. `tmutil latestbackup` exits 0 with no backup, so reading the exit code alone was the false claim this module prevents. |
| 13, the config path inside the bundle | shipped | `assertConfUsable` in `src/main/tmux/supervisor.ts` now tests readability as well as presence, and `verifyHistoryLimitWith` reads back the depth tmux actually set. `exit-empty` is re-asserted at every boot through `BOOT_SERVER_OPTIONS`. |

### The two faults that cost the user work, and what was measured
**A full disk.** The old sequence published a zero byte file over a good snapshot and reported
success at every step. That was measured on a 6 MB sparse APFS image filled to ENOSPC, not reasoned
about: `write` returned ENOSPC, `fsync` returned OK, `rename` returned OK, the directory flush
returned OK, and what stood under the final name was 0 bytes against an intended 524,288 (research
34 §3.1). The new sequence checks the size and the hash between writing and renaming, so it reports
the failure and publishes nothing. The cost at the operator's real shape of 43 files at 25 KB is
104 ms at the chosen concurrency of 32, against 3.99 ms for the old `writeFile` and `rename`. The
integrity half of that is 2 ms of the total. Quit already spends 0.9 s to 1.9 s in `capture-pane`.

**A power cut in the middle of a write.** `point-snapshot.after-write` in the fault harness sends
SIGKILL between the write and the rename. The run leaves a staged `.part` file and no published
body for that session, the other sessions keep theirs, and the relaunch finds every manifest row
present and every live session alive. Bodies are never overwritten, so the generation before the
torn one is still readable. The old code had one generation and a destructive replace, which is the
shape where neither the old copy nor the new one survives.

### The fault matrix rows the harness now covers
Rows are from research 33 §7, which scored the matrix at 2 covered, 6 partial, 20 unexercised.

| Row | What it is | Covered by |
| --- | --- | --- |
| 1 to 4 | kill the creator at each create boundary | `create.before-declaration`, `create.after-declaration`, `create.after-spawn`, `create.after-launch-record` |
| 9 | kill during a checkpoint write | `snapshot.before-write` and `snapshot.after-write` |
| 12 | kill during each restore stage | all five of `restore.before-spawn`, `after-spawn`, `after-replay`, `after-arm`, `after-status-write` |
| 17 | Electron crash, main and renderer together | every case. The workload opens a real renderer, so the SIGKILL takes both down |
| 22 | manifest corruption | item 5, driven on a scratch manifest of 40 rows with page 2 smashed |
| 24 | disk full | item 2, driven on a real APFS image filled to ENOSPC |

Twelve named points, three random moments and one control run. The random moments are drawn from
the intervals the control run recorded fault points in, because a uniform draw across the whole run
lands in the workload's own waiting 84.7 per cent of the time and reached one state eight times out
of eight.

### What is not true
- The snapshot completion record is a JSON file beside the bodies and not a manifest row. Research
  34 step 9 says it belongs in the manifest. This is a recorded deviation and not an oversight, the
  reasoning is in the header of `src/main/restore/snapshots.ts`, and Phase 20 owns the move.
- No real machine suspend was triggered. Item 11 is driven through the `PowerMonitorLike` seam, so
  the capture, the bridge and the dispose are real and the delivery of the macOS event is not.
- The cold start history limit repair fires only when the conf disappears between the check and
  `start-server`. That race is exercised through its injected seam rather than through a whole app
  run. What is proven in a real run is the `exit-empty` repair.
- Matrix rows 5, 6, 8, 13, 14, 15, 16, 19, 20, 21, 23, 25, 27, 28 and 29 are still uncovered or
  partial. This phase moved the score, it did not finish the matrix.

### Gates at the commit
`npm run typecheck` clean on both projects in 3.8 s. `npm run build` clean in 19.0 s. `npm test`
155 files passed and 1 skipped, 2,060 tests passed and 2 skipped, 0 failed. `npm run smoke:t1` 5/5
create and 6/6 verify. `npm run smoke:t3` PASS on both shapes, claude and pi each restored with
replayed scrollback and an armed, unexecuted resume. `npm run conformance:resume:capture` 6 PASS,
0 FAIL, 0 BLOCKED, 4 SKIP in 16.7 s, required because `restore/**` changed. `npm run smoke:fault`
16 of 16 in 67.6 s. `npm run smoke:power` PASS. `npm run smoke:migrate` 11 of 11.
The operator's live tmux sessions were listed before the gates and after them. Nine both times, with
identical name lists. No `pkill` was run at any point. Every harness ran on its own socket, and each
one ended its own server.

### The specification, kept for the record

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

### The fix round, and what it changed
Three verifiers returned `needs_work`. Two of them found the same defect and it was the worst thing
this phase produced. Everything below landed in the fix round.

**The one that destroyed live sessions.** `src/main/power/smoke.ts` ran `tmux kill-server` from its
own failure path and checked the socket name afterwards, on the line that unlinks the socket file. A
harness that had already printed "refusing to run" then ended the server it was refusing to touch.
Both verifiers reproduced it on decoy servers, and the operator's 48 live sessions were destroyed the
same evening. There are now two independent refusals. `execTmux` refuses `kill-server` on socket
`gmux` for every caller in the product, and `teardownHarnessServer` checks the socket before it sends
anything. The power harness also tears nothing down when the isolation guard is what threw.

**Every smoke harness moved off the operator's server.** Only `smoke:power` and the fault harness had
their own socket. `smoke:t1`, `smoke:t3`, `smoke:capture`, `smoke:migrate`, `smoke:identity`,
`smoke:procid` and `conformance:resume` all created and killed sessions on socket `gmux`, beside the
operator's live agents. Each has its own socket now, and `build/harness-socket.mjs` ends that server
afterwards.

**The recovery path published a manifest the app could not open, permanently.**
`/usr/bin/sqlite3 .recover` rebuilds from the final schema while the `migrations` bookkeeping table
can come back holding one row, so the migration runner re-ran an early step and threw `duplicate
column name: exit_code` on every launch. Two changes close it from both ends. The column migrations
are idempotent, and `recoverDatabase` will not publish a rebuild that the real `ManifestStore` cannot
open.

**The other nine.** The prune took ring slots from recorded generations and gave them to crash
orphans. The capsule carried nothing Phase 20 can rebuild a session from. A healthy manifest in an
unwritable directory was reported to the user as damaged. The wreck was opened read-write during
recovery. The quarantine toast was cut off mid-sentence. The sleep capture recorded its reason as
`app-quit`. The migration failure dialog carried an em dash. Item 6 stored the truth about a restore
and showed it to nobody. `assertConfUsable` did not test readability, and `exit-empty` was never
repaired.

**Deliberately not done, and recorded rather than hidden.** The snapshot completion record is still a
JSON file beside the bodies rather than a manifest row, which is a deviation from research 34 step 9.
The reasoning is written into the header of `src/main/restore/snapshots.ts`. Phase 20 owns the move.

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

---

## Phase 22 — the Context sidebar, with installing enabled ✅ SHIPPED 2026-08-13

**The record of what actually landed is at the end of this file, under "Phase 22, what shipped".**
The specification below is kept because it carries the decisions, and it is history now.

Full specification in docs/research/29-context-sidebar.md, 2,681 lines, which carries the per agent
substrate matrix, the scope model, the wireframes at three widths and the final copy. Build from that
document. **Read its section 13 first**, because the operator changed its staging.

Runs before the release lane. It is the largest remaining feature and the only queued work that makes
Tortie more than a good shell.

### Why this belongs in Tortie, since the scope guardrail requires the question answered
The agent registry already answers how a session starts, being the binary, the arguments, the resume
arguments, the icon and the launch flags. **Nothing in Tortie answers what a session can do once it
starts.** That lives entirely in sidecar configuration and is invisible from inside the app today.
This is agent layer work, not IDE furniture. Two of the eight tabs in the reference panel, being
Tools and Overview, are refused rather than copied.

### The operator decision, 2026-08-12
Research 29 staged this as a local view first and the source layer one phase later. **That staging is
superseded. Installing ships with the view, in this phase.**

The reason for the original staging is not withdrawn. It is converted into requirements, and these
are not negotiable within the phase:
1. The install path gets its **own independent verifier at Tier 3**, separate from the verifier for
   the view.
2. **Pin and re-check is required, not optional.** Record the resolved hash at install, re-hash on
   refresh, and a changed hash disables the item and asks again. Shipping install without this ships
   the risk without the control.
3. Nothing installs without a human confirming it, and the confirm shows the full command line.
4. The executable-content scan runs and is shown **before** the install control, not after.

**The risk the operator has accepted, stated plainly so nobody rediscovers it.** A SKILL.md body can
carry executable placeholders that run before the model ever sees the file. The documented incident
corpus is 1,184 malicious skills on one hub, and 36.82% of 3,984 scanned skills carrying a flaw with
13.4% critical, and it includes the registry this document recommends as the default.

### The hardest part of the build, and it is not the interface
There is one real standard and eleven bespoke filesystems. Agent Skills standardises the file and
nothing else, not the location, not the scopes and not who wins a collision. **There are at least
seven mutually incompatible precedence models across twelve agents, and two of them run in opposite
directions inside one product**, because in Claude Code project settings beat personal settings while
personal skills beat project skills. A panel that draws one scope axis and orders it once will be
wrong about half of what it shows. Research 29 section 2 has the verified matrix. Use it rather than
inferring.

### Sources
skills.sh for skills, chosen because it is the only source in the survey that hands a third party
client a free unauthenticated content audit that can be rendered before the install control. The
official MCP registry for servers, with Smithery second. Plugins go through each agent's own CLI.
**Hooks get no marketplace, and that is a refusal rather than a gap.** Bring your own source is first
class, meaning a local directory, a private repository or an alternate registry base address.

### The skills CLI, and how it is distributed (operator decision, 2026-08-12)

The operator asked that `npx skills` be the single interface for all skill management, and that Tortie
shell out to it invisibly. Four investigations measured `skills@1.5.22` on 2026-08-12, three of them
building the case and one attacking it. This section is what a builder implements from.

**The decision, first.** Every skill operation that changes state goes through the `skills` CLI, with
no exceptions. Tortie never creates a skill directory, never creates or removes a symlink in an agent
directory, and never edits a lock file by hand. The CLI is bundled and pinned inside the app rather
than fetched through `npx`, which the operator's own instruction left open. **One operation departs
from the instruction, and it is the local list.** Tortie reads the installed set from the filesystem.

**Why the list departs.** Two facts decide it, and either one alone would decide it.

1. `skills list --json` returns seven fields, being `name`, `path`, `scope`, `agents`, `source`,
   `sourceUrl` and `sourceType`. Verified by running it. It does not return the description, which
   research 29 section 5 puts on every row of the panel. It does not return the `skillFolderHash`,
   which requirement 2 above depends on. Both of those live on disk. So a CLI-driven view still has to
   read the files, and it has paid for a process spawn and gained nothing.
2. It is about 120 times slower.

| Path | Median | Entries | Descriptions | Hashes |
|---|---|---|---|---|
| Direct filesystem read, in process | **2.3 to 2.8 ms** | 36 | 35 | 21 |
| `skills ls -g --json`, system node | 329 to 390 ms | 28 | 0 | 0 |
| `skills ls -g --json`, Electron node with `ELECTRON_RUN_AS_NODE=1` | 290 to 379 ms | 28 | 0 | 0 |
| Same, first run after boot, cold page cache | 7.1 s, measured once | 28 | 0 | 0 |
| `npx skills@1.5.22 ls -g --json`, warm cache, default flags | 270 to 390 ms on top of the row above, plus one request to `registry.npmjs.org` | | | |

Electron's Node and system Node are inside each other's spread, so the runtime choice does not change
the cost. The 329 ms is the directory walk itself, and it grows with the number of agent directories
rather than the number of skills. The operator's machine has 27 of them.

**This departure does not create a second source of truth, and that is why it is safe.** `skills list`
is itself a filesystem walk. It reads no lock file and it holds no knowledge that the files do not.
Tortie reading the same directories is the same walk with the frontmatter kept, not a reimplementation
of the CLI's resolution model. Every operation that could make two views disagree is a write, and
every write goes through the CLI.

Three further reasons the read stays local. A skill with broken frontmatter is dropped from the CLI's
output entirely rather than flagged, and a broken skill is exactly what the panel should show. Global
and project scope are two separate invocations. `skills find` has no `--json` at all and it sends the
user's query string to `add-skill.vercel.sh/t`, so discovery uses `GET skills.sh/api/search` instead,
which research 29 section 3.2 already measured returning clean JSON.

#### The spawn contract, shared by every CLI call

- Executable: `process.execPath`, which is the Electron binary in a packaged app.
- First argument: `<resourcesPath>/skills-cli/node_modules/skills/bin/cli.mjs`.
- Environment: `ELECTRON_RUN_AS_NODE=1` on every call, without exception. Nothing runs without it.
- Environment, inherited: pass the recovered login-shell environment through, not a scrubbed one. The
  CLI reads 31 variables and several of them move the directories it writes to. `CLAUDE_CONFIG_DIR`,
  `CODEX_HOME`, `GROK_HOME`, `VIBE_HOME`, `HERMES_HOME` and `AUTOHAND_HOME` relocate an agent's
  configuration directory. `XDG_STATE_HOME` moves the global lock file from `~/.agents/.skill-lock.json`
  to `$XDG_STATE_HOME/skills/.skill-lock.json`. `GH_TOKEN`, `GITHUB_TOKEN`, `GH_HOST` and
  `GIT_SSH_COMMAND` are how a private source is reached. **Tortie's filesystem reader must resolve
  those same variables**, or the view and the CLI will point at different directories on any machine
  where one is set. None of them is set on the operator's machine today, so a bug here would not show
  up in local testing.
- Environment, added: `DO_NOT_TRACK=1` only when the user's usage-data switch is off. `SKILLS_API_URL`
  and `SKILLS_DOWNLOAD_URL` only when the user has configured their own source.
- Working directory: the project root for project scope, and the user's home directory for global scope.
- Standard streams: `['ignore', 'pipe', 'pipe']`. Never allocate a pseudo-terminal. With `-y` and the
  flags below fully specified, the CLI completes without prompting.
- Success is the exit code, never the text. Measured exit codes are 0 for success, 0 for removing a
  skill that does not exist, and 1 for a bad source, a bad skill name, a bad agent name or an unknown
  command. Only two outputs are ever parsed, being `list --json` and `--version`. Everything else is
  box-drawing characters and ANSI escapes.

#### The exact command for every skill operation

| Operation | How Tortie does it |
|---|---|
| Probe a copy of the CLI | `--version`, which prints a bare version string and exits 0 |
| List installed skills, global | Direct filesystem read. Not the CLI. |
| List installed skills, project | Direct filesystem read under the project root. Not the CLI. |
| Search for something to install | `GET https://skills.sh/api/search?q=<query>&limit=<n>`, with `&owner=<owner>` when the user filters. Not the CLI. |
| Show the safety scan before the install control | `GET https://add-skill.vercel.sh/audit?source=<owner/repo>&skills=<a,b>`. Not the CLI. |
| Enumerate the skills a source contains | `skills add <source> -l` |
| Install, global | `skills add <source> -g -y -s <name> [<name>…] -a <agent> [<agent>…]` |
| Install, project | `skills add <source> -y -s <name> [<name>…] -a <agent> [<agent>…]`, with the working directory at the project root |
| Remove a skill everywhere | `skills remove -g -y -s <name>` |
| Remove a skill from one agent that uses symlinks | `skills remove -g -y -s <name> -a <agent>` |
| Update one skill | `skills update -g -y <name>` |
| Update every global skill | `skills update -g -y` |
| Restore a project's skills from its lock file | `skills experimental_install`, with the working directory at the project root |
| Read the pin for a skill | Direct read of the lock file. Not the CLI. |

Three argument traps, all read out of the parser at `dist/cli.mjs` line 5045. A builder who does not
know them will write a command that runs successfully and does the wrong thing.

1. **The source must come immediately after `add`.** `-s` and `-a` are variadic and greedily consume
   every following argument that does not begin with `-`. A source placed after either flag is
   swallowed as a skill name or an agent name.
   **Measured in Phase 22 against the bundled CLI at 1.5.22, and it is half of what was written
   here.** `add -g -y -s find-skills vercel-labs/skills -a claude-code codex` exits 1 with "Missing
   required argument: source", so this trap is loud rather than silent. Trap 2 below is the silent
   one, and it did exit 0 with the `-s` filter discarded. Both shapes are refused before a spawn by
   `checkPlanShape` in `src/renderer/context/surface/command-line.ts`, which returns
   `["missing-source"]` and `["equals-form"]`.
2. **Never use the `--flag=value` form.** The parser matches exact flag tokens only, so `--skill=foo`
   matches nothing, begins with `-` so it is not treated as a source, and is silently discarded. The
   command then runs with a wider meaning than intended.
3. **`-a '*'` works for `add` and fails for `remove`.** `removeCommand` has no wildcard branch, so it
   reports `Invalid agents: *` and exits 1. Use `--all` where an everything operation is wanted, and
   an explicit agent list otherwise.

#### What the CLI cannot do, and what Tortie does instead

| Thing the panel might want | Status, and the substitute |
|---|---|
| Ask whether an update exists without applying it | Not possible. `check` is a plain alias for `update` in the dispatch switch. The panel offers an update action, not an update indicator. |
| Report which skills an update run skipped | Unreliable. When at least one skill is checkable and none has an update, the CLI prints "All global skills are up to date" and returns at line 6568, before it reaches the skipped list at line 6621. Tortie reads the lock itself and shows which skills carry no pin. On the operator's machine 10 of 25 canonical skills have no lock entry at all, so this is the common case rather than an edge. |
| Enable a skill for exactly one agent | Do not offer it. With one target directory the CLI switches from a symlink to a full copy, and re-adding from the canonical path with two or more targets is a silent no-op that reports success. |
| Disable a skill for one agent that reads the shared directory | Not possible, and this is correct rather than a defect. Research 29 section 2.7 verified that 10 of 12 agents read `~/.agents/skills` directly. One canonical directory serves all of them, so the only per-agent toggle that means anything is for the agents that need a symlink, of which Claude Code is the one that matters here. Show those agents as covered by the shared directory and give them no toggle. |
| Give a description or a content hash for an installed skill | Not possible. Both are read from disk. |
| MCP servers, plugins, hooks and subagents | Out of scope for this CLI entirely. There is no MCP management anywhere in it. The other four categories keep the design in research 29 and this decision does not widen to them. |

#### Distribution: bundle the npm package, do not use npx

The package is pure JavaScript. A search of the installed tree for `.node`, `.dylib`, `.so`, `.wasm`
and `binding.gyp` returns zero hits across all 8 packages, so unlike the specstory binary it adds no
nested Mach-O, no `mac.binaries` row, no `build/sign-nested-binaries.cjs` row and no new signing work.
The constraint that decided research 30 does not apply here, and that was checked rather than assumed.
Electron 43.3.0 ships Node 24.18.1 and the package declares `"engines": { "node": ">=22.20.0" }`, so
Electron's own runtime satisfies it. This was proven live. With `node`, `npm` and `npx` all absent from
`PATH`, an Electron process with `ELECTRON_RUN_AS_NODE=1` installed a skill, produced the canonical
copy plus one symlink per agent, and then ran `skills update` through the CLI's own child re-spawn and
applied the update. The re-spawn at line 6588 calls `spawnSync(process.execPath, …)` and the child
inherits the environment, so `ELECTRON_RUN_AS_NODE` carries into it and no injection is needed.

| Option | Verdict | Deciding reason |
|---|---|---|
| Bundle the npm package, run under Electron's Node | **chosen** | 5.5 MB installed, or 2.3 MB after trimming documentation and type files, and it still ran after the trim. No native code, so no new signing obligation. Works with no Node on the machine and no network for the local view. |
| `npx` on demand | rejected | It needs Node on the machine, which a user running native-binary agents may not have. Warm `npx` with an exact pinned version still issues `GET registry.npmjs.org/skills` on every call, confirmed under `npm_config_loglevel=http`. With the registry unreachable, npm's default retry policy takes 70 seconds to fail. An unpinned `npx skills` can change its output shape between two app launches, and the CLI publishes roughly every 5 to 8 days. |
| Bundle a compiled binary | rejected | There is nothing to compile. Building one would manufacture the nested Mach-O that the chosen option avoids, and take 2.3 MB to tens of megabytes. |

`ELECTRON_RUN_AS_NODE` is a standing constraint on this design. There is no `electronFuses` key in
`electron-builder.yml` and no `@electron/fuses` in the repository today, so the fuse is not disabled.
Turning on the `runAsNode` fuse as a hardening measure would break every skill write silently. Anyone
who proposes it must read this line first.

#### The pin, and the process that keeps it from rotting

The pin lives in `build/skills-release.json`, in the same shape as `build/specstory-release.json`. It
holds the version, the registry `integrity` string, the `shasum` and a `compatBand`, which is the
version range the resolver below enforces. Keeping the band in the pin file stops the two from drifting
into separate files. For 1.5.22, read live on 2026-08-12, the integrity string is
`sha512-cHiLjwZEawWFvudIqeeMZlvZayTLbRouydMbblyrdiyH7ZLbqUrSrEEr+Tg+X265iztRlVMsyOYRwpD5JxBsvg==` and
the shasum is `ec0a7897ba2ef06e01f3b41007886f3a92cf4d05`. 1.5.22 is also `latest` today.

`build/fetch-skills.cjs` runs from the existing `beforePack` hook next to `ensureSpecstoryBinary`. It
installs with `--omit=dev --ignore-scripts` into `build/vendor/skills`, verifies the result against the
pin, applies the trim and writes a version sidecar so the resolver can name the bundled version without
spawning anything. `--ignore-scripts` is not optional, because 8 packages with no native build step
have no legitimate reason to run an install script inside our build. The tree ships as
`extraResources`, for the same reason the specstory binary does, being one stable path outside the
asar. **The vendored tree must keep a directory literally named `node_modules`**, because `dist/cli.mjs`
imports `yaml` and `tar` by bare name and Node walks up looking for that exact directory name. Renaming
it produces `ERR_MODULE_NOT_FOUND` at run time and passes every check at pack time.

Three triggers keep the pin current, and each one is a gate rather than an intention.

1. A check in the release lane runs `npm view skills version` and fails the job when the published
   version falls outside `compatBand`, or when it is more than four minor releases ahead of the pin.
2. A version bump is an ordinary Tier 2 change. Change the fields, re-vendor, run
   `npm run typecheck && npm run build && npm run smoke:t1`, and add one probe that `skills list --json`
   still parses into the seven expected fields.
3. A `compatBand` change is Tier 3 with an independent verifier, because widening the band is what lets
   an unreviewed CLI version drive writes into the user's agent directories.

#### The lock file guard, and its direction, which is the opposite of what it looks like

A newer lock is safe. A CLI at schema 3 reading a lock at schema 99 preserves the version, preserves
unknown top-level keys and preserves unknown fields inside each skill entry. Measured in an isolated
home. **An older lock is the destructive one.** `readSkillLock` at `dist/cli.mjs` line 3490 reads
`if (parsed.version < CURRENT_VERSION) return createEmptyLockFile()`, with `CURRENT_VERSION = 3`. One
`skills add` against a lock at version 2 destroyed three tracked entries and left one. The skill
folders survive on disk, but every `source` and `skillFolderHash` in the discarded entries is gone, and
a skill with no hash can never be checked for an update again.

So the rule is this. Before any write, read the global lock at the path the CLI would use, which honours
`XDG_STATE_HOME` and otherwise is `~/.agents/.skill-lock.json`. If its `version` is **below** what the
bundled CLI writes, do not run the write. Tell the user that Tortie's bundled skills CLI is newer than
the tool that last wrote their file, and that continuing would drop the update pins. The same rule
applies to the project lock, `skills-lock.json` at the project root, which has its own version counter
currently at 1 and the same discard behaviour at line 911. The operator's lock is at version 3 today
with 15 tracked skills, which is the version the pinned CLI writes, so nothing is at risk right now.
The guard is for the next pin bump, which is when it fires.

#### Resolution across copies, and what offline means

The bundled copy is the default. A copy found on the recovered login `PATH` wins only when its version
is at or above the pin and below the next major version. A user who needs a newer CLI is therefore not
blocked by a Tortie release, and a version whose output Tortie has never parsed is never silently
trusted. Candidates are deduplicated by real path and capped at 8, the same shape as `candidatePaths`
in `src/main/specstory/resolve.ts`. Settings reports every copy found and its version, the way it
already does for specstory. There is no `skills` on the operator's `PATH` today, so this is insurance
and it changes nothing on day one. **Say so plainly in Settings.** A fix published upstream on a Tuesday
waits for a Tortie release unless the user installs their own copy, and the panel must not imply that
it heals itself.

Offline behaviour splits cleanly by operation, because the bundled copy needs no network to exist.

| Operation | With no network |
|---|---|
| The local list | Works. It is a filesystem read and it makes no request. |
| The pin shown on each row | Works. It is a lock file read. |
| `skills --version` probe | Works. |
| Search and the safety scan | Fail. Both are HTTP. The section shows the local list with one line saying discovery needs a connection. |
| Install and update | Fail, because they fetch the skill from its source. This is inherent to the operation and not a property of how the CLI is distributed. |

#### Failure design, because a wrapped CLI that breaks quietly is worse than no wrap

Five failures, each with what the user sees and what the panel still does. Every one of them keeps the
Skills section readable, because the local list never depends on the CLI.

| Failure | What Tortie does |
|---|---|
| The bundled CLI is missing or will not start | The list still renders from disk. Every write control is disabled with one line saying skill installing is unavailable in this build, and Settings names the path that was tried. This is the packaging-mistake case and it must be loud. |
| A command exits non-zero | Show the failure with the exact command line that was run and the last lines of stderr, in the same place the confirmation showed that command line before it ran. Never report success from parsed text. Nothing in the panel changes state until the exit code is 0 and a fresh filesystem read confirms it. |
| A command hangs | Time out at 120 seconds for `add` and `update`, and at 15 seconds for `--version` and `-l`. Kill the child, say the command was stopped, and re-read from disk so the panel shows what actually landed rather than what was asked for. |
| The output format changes under us | Only two outputs are parsed. If `list --json` ever needs to be parsed and does not yield an array of objects carrying `name` and `path`, treat it as a failed probe rather than an empty list, because an empty list looks like the user has no skills. If `--version` does not parse as a version, the copy is not a candidate. A copy outside `compatBand` is reported in Settings by name and version and is not used. |
| There is no network | Per the table above. The panel says which operations need a connection in one line, and does not disable the whole section. |

Two rules bind all five. The panel never shows a state it has not re-read from disk, so the filesystem
is the only thing that decides what a row says. Every failure names the command that produced it,
because a hidden subprocess that fails without naming itself is unfixable by the person looking at it.

**Telemetry.** Reads send nothing, confirmed by intercepting `fetch`, `http.request`, `https.request`
and `dns.lookup` around `list`, `ls --json` and `--version`. `skills find` sends the user's query
string, which is the second reason discovery uses the search API directly. Install, remove and update
send the source and the target agents to `add-skill.vercel.sh/t`, and `add` separately calls
`add-skill.vercel.sh/audit` for the risk panel. Research 29 section 3.2 already decided the policy,
being leave it on, disclose it in one line, and honour a single switch that exports `DO_NOT_TRACK=1`
to every child process.

**What is not verified, so nobody inherits it as settled.** No packaged `.app` has been built with the
vendored tree in it, and every Electron measurement used the development binary at
`node_modules/electron/dist`. Nothing has been run under a hardened runtime with a real Developer ID,
because `identity: null` today and no notarization round trip has ever run on this machine. The claim
is narrow, being that the vendored tree adds no new Mach-O so it adds no new signing obligation.
Everything measured is macOS arm64 on one machine. Whether Zed, Warp, Replit and GitHub Copilot
actually load a skill from the shared directory is unchecked in both directions, because they are in
the CLI's universal set and not in research 29's verified table.

### The session connection, kept quiet
A transcript does not record what context it loaded, verified at 443 system records across a 12 MB
session with none carrying a manifest. But Tortie owns the launch, so it is the only thing on the
machine that can know. Record the resolved set at launch, measured at about 15 ms.
Four rules keep this away from durability. It is advisory and must never fail a launch, block a
restore or change a resume argument. It is written once at launch and never updated for a live
session. A restore re-snapshots. Deleting it is always safe.

### Live reload is registry data, not prose
The table of what a running session picks up changed underneath the research while it was being
written, when hooks moved from needing a restart to being reloaded live. Each agent and category pair
carries one of three values in the registry, being live, next session, or unknown. **Unknown is a
first class value with its own honest sentence.** Guessing here is worse than saying nothing.

### Verification
Tier 2 for the view, being gates plus screenshot reads at the three responsive widths and a check
that the scope and precedence display matches the verified matrix for at least three agents with
different models.
**Tier 3 for the install path, with its own verifier.** Prove by doing: an install from the default
source succeeds and the item appears with the correct scope; the confirm shows the real command line;
a changed hash on refresh disables the item and asks again; a removal leaves nothing behind; and an
install is refused when the executable-content scan finds something, rather than warning after the
fact. Every test uses a scratch directory and must never write to the operator's own agent
configuration.
Add `conformance:context`, the cheap capture gate that keeps the substrate matrix executable rather
than documented.
Five checks come from the CLI decision above and all five are Tier 3, because each one can destroy
data the user did not ask Tortie to touch or hide a failure from them.
- **Packaging is a gate, not an assumption.** Build the real `.app` and run the vendored CLI out of
  `Contents/Resources` with `ELECTRON_RUN_AS_NODE=1`. `out/` passing proves nothing here, which is the
  same trap research 19 section 7.2 recorded for the tree-sitter wasm files.
- **The lock guard runs in both directions.** A lock at a higher version must be written back
  unchanged with its unknown keys intact. A lock at a lower version must stop the write and show the
  sentence, and the verifier must confirm no entry was lost.
- **A single-agent enable is refused.** Prove the panel never issues an `add` with one target
  directory, because that call silently produces a full copy instead of a symlink.
- **Every failure is visible and named.** Drive all five rows of the failure table. Rename the
  vendored tree so the CLI is missing. Force a non-zero exit with a bad source. Force a timeout.
  Feed a `list --json` that is not an array of objects. Cut the network. In every case the local list
  must still render, the message must name the command that was run, and no row may claim a state
  that a fresh filesystem read does not support.
- **The command shapes are exact.** Assert the argument order and the flag form for every row of the
  command table, because a source placed after `-s` is swallowed and a `--flag=value` form is dropped
  without an error. A wrong shape here exits 0 and does the wrong thing, so a passing exit code is not
  evidence.

### What must not regress
Explorer, source control and search stay first class and unchanged. The activity bar and the sidebar
geometry from Phase 18. Zoom, which Phase 18.55 made derive from the view list, so **the Context view
must be zoomable the day it ships with no extra work**. If it is not, the derivation is wrong and
that is a defect in this phase.
Never build a rail badge counting context, an ambient notification when a file changes under a
running session, or any surface that is featured or trending. Research 29 section 13.4 lists these
and the reasons.

---

## Phase 23 — Tortie Config: configuration, not code ✅ SHIPPED 2026-08-13

**The record of what actually landed is at the end of this file, under "Phase 23, what shipped".**
The specification below is kept because it carries the decisions, and it is history now.

The outcome of docs/research/31-extensions.md, which examined bb, Zed and pi, wrote four competing
architectures and had three adversaries attack each one. Eleven of the twelve reviews came back fatal.
The verdict was that **Tortie never loads third party code into any of its processes**, and instead
opens the declarative tables it already ships as data.

Scope, the boundary and the staged rungs are in research 31 sections 6 and 7. Build from there.

Runs after Phase 22, and it must not start before Phase 21.

### Step zero, and it is not optional: re-baseline before designing anything
Research 31 was written on 2026-08-12, **before** Phases 18.5, 18.55, 18.6, 19, 20 and 21 landed.
Every one of those touched something this phase depends on. The agent registry gained rows. The
manifest gained columns. The renderer state was rewritten twice. The settings sanitiser changed. The
restore path changed shape.

So the first agent in this phase does what Phase 15.5 did before the refactor. **Read the code as it
is and write down where it differs from research 31**, then hand that to the builders. Specifically
re-check: the registry entry shape and its field list, the manifest schema and its migration count,
the settings sanitiser and where it is called, `renderer/state/agents.ts` and whether the mirror
defect described in research 31 C2 is still there, the token list and its current count, and the
keymap source and its current count. Research 31 quotes numbers for several of these. **Treat every
one of them as stale until re-measured.**

### What ships
The smallest useful version is one file, being `<userData>/gmux/config/agents.json`, user scope only,
launch and resume only, behind the confirm gate. Everything after that is additive.

| Step | What | Tier |
| --- | --- | --- |
| C1 | The overlay type, a generated JSON Schema, worked examples, load and validate and merge, the confirm gate bound to a row hash, and `conformance:agents` | 3 |
| C2 | The renderer registry mirror, which nothing type checks today and which a user supplied agent makes an immediate defect rather than a latent one | 2 |
| C3 | Theme overlays over the colour tokens, validated against the token list | 2 |
| C4 | Keymap overlays that rebind existing command ids and cannot introduce new ones | 2 |
| C5 | Project scope, being a separate smaller type with its own trust gate | 3 |
| C6 | The import boundary test, the content security policy test, and the refusals written into CLAUDE.md | 1 |

### The boundary, quoted because it is the whole design
> Configuration selects from choices the compiled world already contains, or names an executable the
> user has personally confirmed.

Fields that can cause a program to run, being the arguments, the binary, the resume template, the
environment and the identifier capture, require a human confirming once, **out of band of any agent
turn**, with the confirmation bound to a hash of that row. Change the row and it asks again.

The merge is read at boot, on an explicit reload, and on a file watcher debounce. **Never on the path
that creates a session and never on the path that restores one.**

An invalid row is dropped whole and surfaces as a visible error naming the field and the reason. Never
partially merged, never silently dropped, never a crash.

The project file is a **different and smaller type**, not a filtered view of the user one. It carries
no field that can hold arguments, a binary, an environment variable or a path outside the project. A
repository the user clones cannot cause a process to start.

### Why the confirm gate is not theatre, stated so a later round does not remove it for convenience
Every product cited as precedent for trusting configuration has a human as the only routine writer of
that configuration. Tortie runs many agent processes at once under one user account, several
deliberately with their safeguards off, all able to write to the home directory. A configuration
directory Tortie reads and an agent can write is an increase in privilege rather than a convenience.

### The authoring story, added by the operator 2026-08-12
Research 31's lesson from pi was **publish the contract, not the toolkit**. Tortie's users have twelve
coding agents one keystroke away, so making authoring cheap is already solved. What is scarce is a
contract an agent can read without guessing.

So this phase ships an **authoring prompt** as a real deliverable, not a documentation afterthought.
It must be good enough that a user opens a session in the configuration directory, pastes the prompt,
says what they want, and gets a valid file. Requirements:
1. It is written for an agent to act on and for a human to read. One document, not two.
2. It states the contract, points at the generated JSON Schema by path, and carries the worked
   examples from C1.
3. It states the confirm gate plainly, so an agent that writes an execution bearing field tells the
   user a confirmation is coming rather than appearing to have failed.
4. It states what configuration **cannot** do, so an agent does not attempt the impossible and produce
   a broken file.
5. It is validated the way the schema is. **A worked example that does not load is a defect.** Add a
   test that parses every example in the prompt against the schema.

### Discoverability, and the operator constraint on it
The operator's instruction is that this is discoverable **subtly**, and that the guidance itself must
not be baked into the application chrome.

So the guide lives on disk, next to the thing it describes, and the application's footprint is one
affordance. When Tortie first creates the configuration directory it writes the guide, the schema and
the examples into it. In the app, a single item reveals that folder. Recommended placement is the
existing Settings surface or the application menu, decided at the spec stage. **Do not build a
configuration editor, a template gallery or an onboarding flow.** The file is one click away and the
agents are already here.

**Do not merge this with the Context sidebar.** Phase 22 manages what agents can do, meaning skills,
servers and hooks. This manages Tortie itself. They are different things with different trust models
and a shared surface would blur both.

### Verification
C1 and C5 are Tier 3. C1 because it touches the registry, resume and the launch path, and because
universality across agents is claimed. C5 because it introduces a new trust boundary.
C1 needs the full battery plus `conformance:resume:capture`, plus **a per agent matrix proving a
synthetic thirteenth agent launches, resumes and restores across a real quit**, plus an adversarial
verifier proving an unconfirmed row cannot start a process.
C5 needs an adversarial verifier proving a hostile project file cannot alter arguments, name a binary,
set an environment variable or start anything, and that the trust gate survives a restart and a
project rename.

### What must not regress
The twelve compiled agents keep working with no configuration file present, which is the ordinary
case. Resume and restore for every one of them. The settings sanitiser, which stays the authority for
what it already covers. The single keymap source, which C4 must extend rather than bypass.

### Ordering
Must not start before Phase 21. Restore currently asks the live registry for `requiresOriginalCwd`
rather than the manifest, and its error path returns the permissive answer. That is latent today
because the registry always holds all twelve agents. **A user added agent that later leaves the file
makes it immediate**, and for one agent the failure is a silent empty session that looks resumed.

### The fix round (2026-08-13)
Two verifiers drove the real app and returned needs_work. Between them they found eight defects. All
eight are fixed, and each one has the exact failing probe re-run against it.

| # | What was wrong | What was done |
| --- | --- | --- |
| 1 | Main registered `config:rows`, `config:confirm` and `config:forget` and nothing could reach them. The preload had no `config` member and there was no renderer surface, so every configured row was stuck at "never confirmed" for ever. The only way to confirm one was a Node inspector attached to main. | Added the `config` member to `src/preload/index.ts` and a real surface at Settings, then Agents, in `src/renderer/settings/ConfiguredAgents.tsx`. It shows every row, its state, the exact lines, the honesty sentence, an "Enable <name>" button and a "Withdraw confirmation" button. |
| 2 | An invalid row reached `console.warn` and nothing else, so "dropped whole and surfaced visibly" was half done. | The same surface draws every dropped row in red, naming the field and the reason, with a "Check the file again" button. |
| 3 | `extraProbeDirs` was honoured by detection and ignored by launch. An agent showed as installed and then threw `AGENT_NOT_FOUND`. The shipped example `02-resume-with-a-flag.json` was one of these. | `resolveBinary` takes the entry's dirs, and the create path passes them. Then a driver run found the second half: tmux resolves a bare argv[0] against the SERVER environment and ignores the per-pane `-e PATH`, so the pane still died with status 1. argv[0] now stays absolute for exactly the case where the login-shell PATH cannot find the binary. F3 is untouched for every other agent, and a driver run proves `claude` still starts by bare name. |
| 4 | The picker offered an unconfirmed configured agent with the same chip and the same enabled state as Claude Code. A person picked it, typed a name, pressed Create and got a modal error. | `DetectedAgent` carries `configState`, stamped onto every scan by the `agents:*` registrar. The tile is drawn unpickable and marked "confirm first", the caption under the board says where to fix it, and `defaultAgentChoice` will never select one. |
| 5 | The confirm sheet printed `Also runs by itself: --session-id` for every `pre-assign` row. Tortie does not run that flag by itself. A false line on the consent screen is a defect rather than a typo. | `describeExecution` renders a `pre-assign` flag as `Adds to the start command`, and keeps the side-command wording for `pre-assign-cmd`. The hash did not move, so nobody is asked again. |
| 6 | C6's refusals were only in a research document. | Research 31 section 6.7's eight permanent refusals are now a section of CLAUDE.md, with the reason the confirm gate is not theatre written next to them. |
| 7 | `findOrphanedClients` matched the hardcoded `TMUX_SOCKET` while the server it spared came from the ACTIVE socket. A verifier hit that state and SIGTERMed the operator's real `-L gmux` server, destroying 36 live sessions. | The matcher keys on `activeTmuxSocket()`, refuses to signal any tmux SERVER on any socket, and matches the socket name whole. The last of those is a second defect the new test found: `-L gmux` matched `-L gmux-verifa` as a substring. |
| 8 | `npm run shot` returned before `initAgentOverlay`, so no screenshot of any Phase 23 behaviour was obtainable. | The shot harness awaits the boot read. The confirm surface and the gated picker are both captured in this round. |

Added along the way: a build-time reachability gate in `build/assert-bundle-refusals.mjs`. It fails
the build when a `config:*` channel is registered in main and is not in the preload bundle, or when
the confirm surface's copy is in no renderer bundle. Defect 1 was invisible to every unit test,
because each half was correct on its own and only the artifacts hold the join.

---

## Phase 24 — self update (2026-08-12) ✅ SHIPPED 2026-08-13

Specification in docs/research/27-release-and-updates.md section 5, which canvassed six options and
carries the mechanism, the interface, the failure envelope and the honest answer about rollback.

**Runs after the release lane, and cannot run before it.** Section 5 opens by saying everything in it
is downstream of the signature. The installed app has no signature at all today, which makes its
designated requirement a literal hash of this exact build, and the updater verifies every update
against that. **No future build can satisfy a hash of a past one.** Signing is not a step before
updates. Signing is the update feature.

### The mechanism
`electron-updater` 6.x, publishing a ZIP and a manifest, with Squirrel doing the install underneath.
On macOS the library fetches the manifest, downloads the ZIP, stands up a loopback HTTP server on a
random port behind basic auth with a per run random password, and points Electron's own updater at
that. It is a feed client in front of the thing that performs the security check.

Delta updates work on macOS, contrary to most search results. They landed in 6.2.0 and re-landed in
6.3.0, and the build already emits the block map files they need. Staged rollout works, bucketed by a
stored identifier so a user never flaps in and out of a rollout.

**Write the integration against the version 26 interface and keep it in ONE module.** Version 27 is a
breaking release and is close. It renames two of the exact calls this phase makes. Confining it to
one file makes that migration one file rather than a search.

### The feed, decided 2026-08-12
**The repository will be public**, by operator decision. So the GitHub provider against GitHub
Releases is the feed, with no token on any user's machine and no separate hosting to run.

Two consequences follow, and both are improvements.
Electron's free hosted feed becomes available as a fallback, since it requires a public repository.
Research 27 rejects it as the primary choice because it has no delta updates, no staged rollout and no
channels, but it is worth recording as the thing to fall back to if the provider ever becomes a
problem.
And continuous integration becomes free. Research 27 priced a private repository at about 55 dollars a
month for the runner minutes at the planned volumes, because macOS runners carry a ten times
multiplier. A public repository is zero.

### When it checks, and what the user is told
Thirty seconds after launch, never at launch, because boot is when restore is replaying scrollback and
re-adopting sessions. Then every six hours while running, because sessions are long lived and the app
may go days without a relaunch. And whenever the user asks.

**The announcement is one menu item and nothing else.** No toast, no modal, no badge, no counter.

```
Tortie
  About Tortie
  Update to 0.19.0 — installs when you quit      ← appears only when staged
  Check for Updates…
```

Only a check the user asked for may report success or a failure, because only then is somebody
waiting for an answer. A failed background check writes to the log and says nothing.
Settings may carry a fuller line for a user who goes looking. Settings is a place you go rather than a
thing that shouts. **Do not show release notes in a window. If they matter they are a link.**

### Installing
On quit, automatically. That is only defensible because of what Tortie is, and research 27 measured it
rather than assuming it. The tmux server runs a binary from outside the bundle, the manifest and the
snapshots live in the user data directory, nothing has been written inside the bundle since install,
and a running process survives its bundle being moved aside and deleted.
**So replacing the application does not touch the work.** That property should be stated in the
release notes for the first self updating build, because no other class of desktop application can
say it.

### Four things must be true before the first update ships
| Requirement | State |
| --- | --- |
| A single instance lock, since every updater relaunches | **Shipped in Phase 18.5** |
| The tmux config path assertion and the scrollback read back | Phase 19 item 13 |
| A Developer ID signature, hardened runtime, notarized and stapled | The release lane |
| `codesign --verify --deep --strict` as a release gate | The release lane |

**This phase adds a fifth: the post update self check.** On the first boot after the version changes,
verify the bundle's runtime resources actually resolve, being the tmux config, the bundled specstory
binary, the unpacked search binary and the tree-sitter files. Surface one quiet failure if any is
missing. This is the single case in the whole design where something should rise above the surface,
because it is a failure rather than news.

### Rollback, stated honestly
There is none, and no macOS updater has one. If a release is bad the answer is another release, plus a
halt script that stops the manifest serving the bad version to anyone who has not taken it yet. Build
the halt script in this phase, because the moment it is needed is the moment there is no time to write
it.

### Verification
**Tier 3**, and it is the highest risk phase in the queue, because a wrong answer replaces the
application on a machine holding live work.
Prove by doing, on a real machine with real sessions: an end to end update installed over a running
copy, **twice**, with the session identifier list byte identical afterwards. An interrupted download
resuming or failing cleanly. A corrupted artifact refused rather than installed. The post update self
check firing when a bundled resource is removed. And the first cold start after an update confirming
the scrollback limit is the configured value rather than the silent default.

### What must not regress
The live sessions and their scrollback depth, which is the whole point. The single instance lock. The
bundled specstory signature surviving the swap. The login item, which is keyed to the bundle
identifier and which the release lane changes to Itavero in the same window of time.

### One interaction worth knowing
An update check is a request from an installed copy, so it is a rough count of active installs as a
side effect. Research 37 on telemetry is examining whether that is a legitimate measure or a sneaky
one. **Do not build any counting on top of the update check in this phase.** Whatever 37 concludes
gets designed on its own terms.

---

## Phase 25 — downloads and usage measurement (2026-08-12)

Specification in docs/research/37-telemetry.md. **Read its section 1 first**, because the operator
changed its staging. The document recommended shipping downloads only and gating usage behind a 240
install trigger. The operator wants both from the first public release, and the reason is sound:
instrumentation cannot be applied retroactively, so a product that ships uninstrumented can never
learn anything about its first hundred users.

Runs **before the release lane**, because it has to be in the build that gets released.

### What the operator gets
Two questions answered, and nothing else. **How many active users there are**, daily, weekly and
monthly, with a return rate curve. **How long they spend in Tortie**, honestly defined.

### Part 1, downloads, which needs no code in the application
| Source | What it gives |
| --- | --- |
| GitHub release asset counts | Per asset, so the DMG count is new downloads and the ZIP count is applied auto updates. That split arrives free from the normal build output |
| A Homebrew tap the operator owns | 30, 90 and 365 day counts refreshed daily. The published analytics API covers third party taps, which the documentation does not say and research 37 confirmed by fetching the file |
| The update manifest, which is a release asset | Every update check increments a counter already being read |

All three need the repository public, which is decided. A scheduled job appends one row per asset per
day to a file in the repository, because the GitHub counter is a running total with no history.
**Read it no more than once a day.** Research 37 measured the counter frozen across an eleven minute
window on an asset taking 23,273 downloads in 29 hours, so a faster poll produces noise rather than
resolution.
Accept that a Homebrew count is public from day one, including when it reads four.

### Part 2, usage, which is one event per install per day
Seven fields, about 190 bytes, no event name because a name is a string field.

```
v, install, day, app, os, open_s, focus_s
```

Distinct install and day values give the active user counts and the retention curve from a single
event type. The app version is there so a fall in actives can be told apart from a bad release. The
operating system version is the only input to deciding when to drop support for a macOS version.

**Two time numbers, because one would be dishonest.** `open_s` is seconds with the process running
and the machine awake, and the clock stops on suspend. `focus_s` is seconds with a window holding
focus. The normal state of this product is an unfocused window with an agent working behind it, so a
single number would either flatter or understate depending on which one it was.
State what both exclude, in the privacy page and in the code: time after the window is closed while
tmux sessions keep running, time while the machine is asleep, and any notion of work done. An agent
running three hours behind an unfocused window adds 10,800 to one number and 0 to the other, and
neither says whether that was productive.

### Refusals, which are permanent and not preferences
Nothing describing what a person did inside Tortie. No feature usage, no agent launched, no panel
opened, no project or session counts, no funnels.
**No error or failure events, ever.** This one is structural. The most likely leak in the whole design
imports nothing and passes any reachability test:
`catch (e) { post({ error: String(e) }) }` yields a message containing an absolute repository path.
So the guarantee sits at the encoder rather than at the import list. Four string fields with fixed
forms, everything else a bounded integer, and **one committed test asserting the entire serialised
body against a single regular expression**, so any free text field fails the build.
The Worker must not read the location fields the platform attaches to every request. Research 37
verified they are present on all plans and cannot be switched off, so not reading them is the control.

### The endpoint
A Cloudflare Worker the operator owns, serving the update manifest and recording the ping in the same
request. No vendor. PostHog is free at this scale so cost was never the argument. The argument is that
a product analytics platform bought to store one number per install per day also installs the ability
to answer the behavioural questions just refused.
Aptabase was the obvious first guess for a desktop application and fails on question one, because its
own documentation states it cannot report monthly active users.

### Consent
A forced choice on first run with no pre-selected answer. Not silently on, and not a setting the user
must discover. A settings switch, a reset button for the identifier, and a local log viewer so a user
can read exactly what was sent.
The identifier is a version 4 UUID in a plain readable file, never derived from hardware, a hostname,
a username or a path, and resettable by deleting the file.

### Three rules that must appear as comments in the code
Each is a real failure that has happened to other people.
1. **The request is never awaited** on any path that leads to a window appearing or the app quitting.
   A machine behind a captive portal hangs on DNS, and a flush wired into quit turns a dead endpoint
   into an application that will not quit.
2. **The Worker needs an uptime check.** A Worker returning errors for a week produces a chart reading
   "actives fell to zero", and the first reading of that chart is churn rather than an outage.
3. **Nothing is queued to disk beyond the current day.** A backlog of pings is user data sitting on a
   machine for no benefit.

### Two defects to close in this phase, both verified 2026-08-12
1. **Tortie already sends repository paths to PostHog through a subprocess.** `WRAP_FLAGS` in
   `src/main/specstory/wrap.ts` omits `--no-usage-analytics`, and the bundled specstory binary carries
   posthog-go. Capture is off by default so this is not firing today, and it is the operator's own
   product reporting to itself, but the claim that Tortie sends nothing is false while it stands, and
   that claim belongs in a public privacy page.
2. **The updater sends a stable per install identifier to GitHub by default.** Decide in writing what
   happens to it when Phase 24 lands, rather than discovering it later.

### Verification
Tier 2 for the client, because it touches no durability path and cannot lose user data.
**Tier 3 for exactly one thing**, which is proving with a network sink that the bytes on the wire match
the schema exactly. That is the claim the entire design rests on, so it gets evidence rather than
assurance. Also Tier 3 for the specstory wrap fix, with the same network sink proof.

### What must not regress
The content security policy, which today prevents the renderer reaching any network host and which is
why the renderer holding the project tree and terminal buffers cannot leak. The main process posts and
holds none of that. Keep it that way.

---

## Phase 25.5 — the DeepSeek CLI renamed itself and detection is broken ✅ SHIPPED 2026-08-13

Found by research 38 while surveying licences, unrelated to licensing, and verified twice.

**The defect.** `deepseek-tui` at version 0.8.47 publishes an **empty bin field**, so installing it
installs no executable at all. The successor package is `codewhale` at 0.9.6, which installs two
binaries named `codewhale` and `codew`. Tortie's registry probes `binaries: ['deepseek']`.

**Why nobody noticed.** Detection works on this machine only because an older 0.8.26 is still
installed from before the rename. **A fresh install today is not detected**, and every existing
DeepSeek session in the manifest records a binary path that a new machine will not have.

### What to do
Probe for the new names as well as the old one, oldest last, so an existing install keeps working and
a new one is found. Decide at the spec stage whether the registry entry keeps the id `deepseek` and
gains new binary names, or whether the display name changes too. **The id is the safer thing to keep**,
because it is written into every manifest row for a DeepSeek session and into the SpecStory provider
mapping.

Check the rest of the registry while you are there. If one agent renamed its package without anyone
noticing, another may have. Research 30 measured five of nine installed agents drifting in three days,
so this is the second finding of the same kind and the phase should say whether it is a pattern.

### The wider question this raises, worth one paragraph rather than a phase
Tortie has no mechanism that would have caught this. There is a version drift check specified in
research 30 as part of Phase 21, but it compares versions of a binary it already found. **A binary
that disappears entirely, because the package renamed, is a different failure and nothing looks for
it.** Say in the phase report whether the Phase 21 drift work covers it, and if not, what would.

### Verification
Tier 2, plus the resume conformance capture, which CLAUDE.md requires for any commit touching
`agents/registry.ts` and which costs about 16 seconds and no agent turns.
Prove detection against a machine state where the old binary is absent. The obvious way is a scratch
`PATH` that excludes it, since removing the operator's installed copy is not acceptable.

### What must not regress
Existing DeepSeek sessions in the manifest, which record the old binary. Their resume must still work
where that binary is still present. SpecStory capture for DeepSeek, which maps on the provider id.

---

## Phase 20 — the verified backup ring ✅ SHIPPED 2026-08-13

Sources: docs/research/33-durability-reconciliation.md entry 8, which merges G2 steps 2 to 4 with B2
and M10, and docs/research/34-phase19-oss-survey.md section 2 for how SQLite copies are made safely.

**The manifest is the only single file whose loss is total across every project.** There is one copy
of it today. If it goes, every session is stranded, because Tortie correctly refuses to adopt a
session it has no record of. The processes keep running and the app cannot reach them. That happened
in a different form on 2026-08-12, when a harness defect killed the tmux server, and the reason the
sessions were recoverable at all is that the manifest survived.

### What Phase 19 already did, so this phase does not redo it
| Already landed | Where |
| --- | --- |
| The content hash that replaces row count comparison | `src/main/db/digest.ts`, measured at 0.30 ms |
| Integrity check and quarantine before opening | `src/main/db/integrity.ts` |
| Last resort repair through the system sqlite3 | `src/main/db/recover.ts` |
| Durable writes with a size and hash check before the rename | `src/main/durable/` |
Research 33 lists the content hash as this phase's mandatory first step. **It is done.** Confirm it
rather than repeat it.

### What this phase builds
1. **Generalise the copy engine out of `migrate/userdata.ts` into `manifest/recovery.ts`.** The
   `VACUUM INTO` from a read only connection already exists and has been run against real user data.
   Research 33 is explicit that this is scheduling rather than new code. Do not write a second copy
   path from scratch.
2. **The ring.** Several verified generations rather than one copy. Each is produced by `VACUUM INTO`,
   which reads through the write ahead log and therefore yields one consistent file. That matters
   here: the manifest is 68 KB while its log is currently 2.5 MB, so a plain file copy of the three
   files would capture three different instants and produce exactly the torn copy this machinery
   exists to avoid.
3. **The pruning invariant, from research 33.** Pruning is a separate transaction and can never remove
   the current generation and its last verified predecessor together. **Prove it by interrupting the
   prune and asserting at least one verified predecessor survives.**
4. **`synchronous=FULL` on critical commits only**, not globally. Record the before and after latency
   for every commit promoted, because this is a durability and speed trade and the number is the
   argument.
5. **Reconstruction.** Rebuild a manifest from the snapshot capsules and the `@gmux-id` stamps on live
   tmux sessions, into an empty manifest. **It requires an explicit human decision and must never run
   automatically**, because a wrong reconstruction adopts sessions that are not ours, and the identity
   rule exists precisely to prevent that.

### One defect Phase 19 found in this area, to confirm rather than assume
Phase 19's fix round reported that the system sqlite3 recovery rebuilds from the final schema, so a
recovered manifest arrives with every column present while its migrations table can come back holding
one row. The migration runner then concluded an early migration had not run and its `ALTER TABLE`
threw on a duplicate column. **Confirm that is fixed at HEAD before building on the recovery path**,
and say so with evidence either way.

### What this phase does not do
No off device copy. The ring sits on the same disk as the thing it copies, so it does nothing about a
failed drive or a stolen machine. Exporting a verified copy is a later and separate item, deliberately
gated behind this one, because exporting unverified generations converts an integrity gap into a
portable one.
No scrollback backup. Snapshots are a different mechanism and Phase 19 hardened them.

### Verification
**Tier 3 throughout.** This is the code that protects everything else.
Prove by doing: interrupt the prune and assert a verified predecessor survives; corrupt a fixture
manifest and restore from a generation into a temporary root; reconstruct into an empty manifest from
capsules and tmux stamps and assert **foreign sessions are untouched**; and measure the latency of
every commit promoted to `FULL`.
Extend the Phase 19 fault harness rather than writing a second one. It already kills the app with
SIGKILL at named points and it is the tool for proving a ring survives a crash mid write.

### SAFETY, and this is not boilerplate after what happened today
On 2026-08-12 a Phase 19 harness ran `tmux kill-server` against the operator's live socket from a
failure path that had already refused to run, and destroyed their working sessions. Phase 19 shipped
two independent refusals and moved every harness onto its own socket. **Inherit those. Never weaken
them, never add a code path that sends `kill-server` to socket `gmux`, and never run a harness that
resolves to the operator's socket.** Nine sessions remain and they are not replaceable.

### What must not regress
The manifest itself, which is the point. The integrity gate, quarantine and durable writes Phase 19
just landed. Restore for both a claude shaped and a non claude shaped session. The identity rule,
which reconstruction must not weaken in order to make reconstruction easier. Research 33 names that as
one of five things a well meaning cleanup must not re-litigate.

### Fix round, 2026-08-13, from Verifier B's needs_work

Verifier B found one defect and named two things that were not true. All three are fixed, and each
one was re-measured with the check that found it.

**The defect. The acknowledgement refusal was in the source and not in the shipped bundle.**
`applyReconstruction` refuses to run unless the caller passes the exact acknowledgement sentence.
Rollup deleted that `if` statement from `out/main/index.js`. Rollup tracks the value of a parameter
when a function has exactly one call site it can see, there was one call site, it passed the
constant, so rollup proved the branch dead. Nothing misbehaved, because the one caller was correct.
What was false was the claim. Vitest runs the TypeScript source, so no test in this repository could
see it.

At the start of this round the state was worse than the report. `GMUX_SMOKE=reconstruct` was never
wired into `src/main/index.ts`, so the whole reconstruction module was absent from the bundle and all
eight of its refusals were gone.

| What was wrong | What fixed it | How it was re-measured |
| --- | --- | --- |
| The acknowledgement refusal is not in the bundle | Two more call sites, one of which builds its argument at runtime, plus the menu door below | `node build/assert-bundle-refusals.mjs`: 17 refusals present, and the `if` statement is back in the bundle text |
| No gate can see this class of defect | `build/assert-bundle-refusals.mjs`, run by `npm run build`, so `npm run package` cannot skip it. It checks each refusal is in its source file AND in the built bundle | It failed on the broken bundle, naming all eight missing fragments. It fails again when one refusal is deleted from a good bundle by hand |
| A person has no way to reach reconstruction | `src/main/manifest/reconstruct-operator.ts` and the app menu item "Rebuild the Session List…", which surveys, shows the plan in a native dialog, and applies only after the person confirms | The reconstruct smoke now clicks the real menu item. Cancel showed one box and wrote nothing. Confirm showed two boxes and rebuilt 2 rows. The live manifest stayed byte identical |
| The rebuild was written as `manifest.db` inside the profile, and `migrate/userdata.ts` copies every `*.db` it walks | `RECONSTRUCTION_BODY_NAME` is `manifest.db.rebuilt`, the same choice `recovery.ts` made for the ring bodies and documented one file away | The smoke asserts no file in the output folder ends in `.db`, and a unit test pins the name |
| `GMUX_SMOKE=reconstruct` had no dispatch, so `npm run smoke:reconstruct` could not run | The dispatch and the import in `src/main/index.ts` | The harness runs and passes on socket `gmux-smoke-reconstruct` |

**The asar was opened this time.** Verifier B said they confirmed `out/main/index.js` rather than a
built `.asar`. `npm run package:dir` was run, `out/main/index.js` was extracted from
`release/mac-arm64/Tortie.app/Contents/Resources/app.asar`, and the two files are byte identical at
815,934 bytes. Every refusal and the menu item are in it.

**Operator sessions.** 37 before, 37 after. The `#{session_id} #{session_name} #{session_created}`
listings differ by nothing. No harness in this round resolved to socket `gmux`.

**What is still not true.** The menu door cannot include a candidate that has no launch recipe. Such
a candidate needs a name, a project root, a working directory and an agent typed in by hand, and a
message box has nowhere to type them. Those candidates are counted in the dialog with the reason, and
the survey and apply API can still write them. A later round can give them a form.

### SHIPPED 2026-08-13. What landed

Every item in the spec above landed. The five things a person now has that they did not have
yesterday are listed here, each with the file that owns it.

| Item | What landed | Where |
| --- | --- | --- |
| 1. One copy engine | `VACUUM INTO` from a read only connection was generalised out of `migrate/userdata.ts`. There is one copy path and both callers use it | `src/main/manifest/recovery.ts`, `src/main/migrate/userdata.ts` |
| 2. The ring | Five verified generations beside the manifest, taken at launch, every 5 minutes at most, on sleep, on quit and before a migration. A take is skipped when the content hash has not changed | `src/main/manifest/recovery.ts`, `src/main/manifest/ring-schedule.ts` |
| 3. The pruning invariant | Pruning is its own step and stops as soon as the newest generation and its last verified predecessor are both protected. Proved by a real SIGKILL inside the unlink loop | `src/main/manifest/recovery.ts` `pruneGenerations`, `build/fault-harness.mjs` |
| 4. `synchronous=FULL` on five commits | The five session writes whose loss strands a live agent commit with `F_FULLFSYNC`. Every other write stays at `NORMAL`. Both pragmas are raised and lowered around the one transaction | `src/main/db/sqlite.ts` `durableTransaction`, `src/main/manifest/store.ts` |
| 5. Reconstruction | Rebuilds a session list from the snapshot capsules and the `@gmux-id` stamps on live tmux sessions, into a new file in a directory a person names. Reached through the menu item "Rebuild the Session List…" | `src/main/manifest/reconstruct.ts`, `src/main/manifest/reconstruct-operator.ts` |

**The recovery ordering, which no builder owned and which decides whether any of this helps.** When
the manifest is missing or fails its integrity check, the newest verified generation is put back
BEFORE the store is constructed. Phase 19's `.recover` page walk stays the last resort, because a
page walk returns whatever it could read and cannot say what is missing, while a generation was
proved complete table by table when it was taken. A damaged file is quarantined and never deleted.
The file is `src/main/manifest/boot.ts`.

**The Phase 19 recovery defect named above is fixed at HEAD, and it is now pinned.** A manifest
rebuilt by the system `sqlite3 .recover` arrives with the final schema and a migrations table holding
one row, and the migration runner then re-ran an early step whose `ALTER TABLE` threw on a duplicate
column. Every column migration goes through `addColumnIfMissing`, and
`src/main/db/__tests__/recover-migrations.test.ts` rebuilds a real recovered database and asserts the
runner completes.

**One correction to research 34, made by this phase.** Section 3.2 recorded as unverified the claim
that `integrity_check` throws rather than returning a row on a damaged file. It is verified now.
Smashing the cell pointer array on a table root page produces that throw. The earlier injection was
too weak rather than the claim being wrong. Research 34 §3.2 and its gaps list are corrected.

### What is NOT true after Phase 20

- **The ring is on the same disk as the thing it copies.** It does nothing about a failed drive, a
  stolen machine or a deleted profile directory. Exporting a verified copy off the device is a later
  and separate item, deliberately gated behind this one.
- **The ring spans minutes to a day, not weeks.** Five generations are taken at most every 5 minutes
  and only when the content changed, so a busy hour leaves the oldest generation about twenty minutes
  old. Damage that goes unnoticed for longer than the span is copied into every generation in turn.
- **Reconstruction cannot include a candidate with no launch recipe from the menu.** That candidate
  needs a name, a project root, a working directory and an agent typed in by hand, and a message box
  has nowhere to type them. The dialog counts them and gives the reason. The survey and apply API can
  still write them.
- **Putting a rebuilt manifest into place is still a manual copy.** Reconstruction writes
  `manifest.db.rebuilt` into a directory a person names and refuses any path in the live manifest's
  directory. Nobody automated the last step, on purpose.
- **One agent is unproven this round, and it is not this phase's doing.** The full
  `npm run conformance:resume` roundtrip ran with real turns: 8 PASS, 0 FAIL, 1 BLOCKED, 1 SKIP in
  187.2 s. `gemini` is the BLOCKED row and its CLI answered "This request failed", which is the
  agent's own service and not Tortie. `droid` is the SKIP row and is not installed on this machine.

## Phase 20.5, the HTML preview ✅ SHIPPED 2026-08-13

Spec: docs/research/39-file-preview.md and its part 2. Verification tier 3, because this renders
content the user did not write inside the application that holds their source and their sessions.

### What landed

An `.html` or `.htm` tab now carries the same segmented control markdown and SVG already had, which
is Preview, Source and Split. Preview shows the page. Source is Monaco. Split puts them side by side.

| Piece | Where |
| --- | --- |
| The eligibility gate and the refusal list, shared by main and the renderer | `src/shared/preview-types.ts` |
| The read-only `gmux-preview:` handler, containment, the request budget | `src/main/preview/protocol.ts` |
| The parse5 anchor rewrite that makes an external link inert | `src/main/preview/anchors.ts` |
| `preview:url` and `preview:stats`, the only two questions the renderer may ask | `src/main/preview/ipc.ts` |
| The frame, the blank state and the line that says what was refused | `src/renderer/editor/html/` |
| The build-time gate that asserts the containment strings survive bundling | `build/assert-preview-containment.mjs` |

### The decisions, and the measurements behind them

**Source is the default, not Preview.** Of 1,052 HTML files tracked in 233 repositories on this
machine, 63 percent render blank or nearly blank without JavaScript. 884 contain a script element and
535 reference an external address. A preview that opens blank looks broken rather than safe, so the
tab opens in Source and the reader chooses Preview.

**The frame attribute is exactly `sandbox=""`.** Neither `allow-scripts` nor `allow-same-origin` is
present, and a test asserts the literal string in the source rather than the rendered DOM, because
the failure that happens is a later refactor widening the attribute by one keyword. With
`allow-same-origin` a probe read the parent bridge and 9,196 bytes of /etc/passwd. With
`allow-scripts` 11 of 11 probes reached a local sink, because the sandbox attribute has never been a
network control.

**Containment resolves the real path on both sides.** A prefix check over joined paths was measured
serving the real /etc/passwd through a symlink named `docs/notes.html`. The handler calls `realpath`
on the request and on the root, and asks the type question a second time after resolution, so a
symlink named `logo.png` pointing at `id_rsa` is refused on the name it resolves to.

**One directive was added to the application policy, `frame-src gmux-preview:`, and it is a net
tightening.** `frame-src` was unset and fell back to `default-src 'self'`, so the renderer could
frame its own files. It now frames one read-only scheme and not its own origin, and there were zero
iframe and zero webview elements in the renderer before this phase. Research 37 section 8.1 still
holds: a `fetch()` from the renderer to a live local sink returns "Failed to fetch" and the sink logs
nothing.

**Nothing inside a previewed page can reach the main process.** An earlier draft routed external
links through a main process open call, and a one pixel nested iframe fired it with an attacker
chosen address on load, with no script and no click, accepting a file address as readily as a web
one. That path was removed. External anchors lose their `href` and keep the address in `title`, so
they are visible and inert.

**Zero new runtime dependencies.** parse5 was already present transitively and is now a direct
dependency. The rewrite needs a real parse, because a regex is fooled by an `href` inside a comment.

### What never gets a preview, and it is a refusal rather than a backlog item

`NEVER_PREVIEW` in `src/shared/preview-types.ts` holds six rules with the reason written beside each
one: dotenv files in every spelling, key material by extension, SSH key files by name, Java and
Spring properties files, netrc files and htpasswd files. Every one of them is already refused by the
extension allowlist, which is exactly why the list is written down in the file somebody would edit to
add a line. Tracked in git on this machine: 79 `.env.*`, 10 `.env`, 8 `.key`, 8 named `id_rsa`, 6
`.pem`, 2 `.cer` and 1 `.keystore`. Eligibility is granted by extension and is never inferred from
content, because a private key in JSON Web Key form is valid JSON and content sniffing would hand it
a rendered view.

### What the verifiers tried and could not do

Two independent verifiers drove the built app, one of them 22 launches with a local HTTP sink
listening on 127.0.0.1:8721. Across every hostile run the sink logged 0 requests. A page carrying a
remote script, a remote stylesheet, a preload font, an `@font-face`, a favicon, a prefetch, a
preconnect, a CSS background image, a tracking pixel, `srcset`, `picture`, a nested iframe, video,
poster, audio, object, embed, track, a form action, `fetch`, XHR, WebSocket and `sendBeacon` produced
0 arrivals, each refused with a named directive. A `base` tag was refused by `base-uri 'none'`. A
meta refresh was refused because `allow-scripts` is not set. `javascript:`, `data:` and `blob:`
frames were refused. Seven real mouse clicks delivered through the debugger navigated nothing, while
the control click on a legitimate same-project link did navigate, which proves the clicks arrived.
Script injected over the debugger, which bypasses the script lock entirely, found `window.gmux`,
`require`, `process` and `module` all undefined, an origin of "null", and `SecurityError` on
`window.parent.gmux`, `document.cookie`, `localStorage` and `indexedDB`.

### What is NOT true after Phase 20.5

- **A page that needs JavaScript still shows nothing.** That is the design and it is why Source is
  the default. The blank state is titled "Nothing to show without JavaScript" and it names the count.
- **Only HTML got a preview.** Mermaid, PDF and CSV are deferred to their own phases, and each needs
  its own decision about where its content runs. None of them is one line away from being added.
- **`.xhtml` is deliberately absent** from the allowlist. A browser parses it as XML, the anchor
  rewrite uses an HTML parser, and showing a quietly reshaped document is worse than showing source.
- **The request budget is a cost bound and not a containment boundary.** It is 1,000 requests per
  minted URL and it resets when the renderer asks for a new one.
- **Two preview tabs on one project share a token**, so they share one counter. Every mint counts a
  generation up, and main answers null rather than the wrong counts, which makes the renderer print
  nothing rather than a wrong line.

---

## Phase 21, versioned agent recovery contracts ✅ SHIPPED 2026-08-13

Sources: docs/research/33-durability-reconciliation.md section 2.1, which is items A8 and G6 and
requires that they land as ONE migration. docs/research/30-specstory-distribution.md section 2 for
the measured drift. docs/research/27-release-and-updates.md section 4 for the compatibility numbers.

### The defect this closes

Restore asked the LIVE REGISTRY whether an agent can find its conversation from a different folder.
The registry is a live object. A release changes it, a user added agent file changes it, and a
deleted entry removes it. The `catch` around that lookup returned `false`, which means "go ahead and
restore into a different folder", for any agent id the registry no longer launches.

For a pi shaped agent `false` is the answer that loses the conversation. pi does not complain when it
cannot find a session under the id it was given. It starts a new empty one under the same id. The
user sees a restored pane, the scrollback replays, and the conversation behind it is gone.

### What the migration persists

One migration, `008-agent-recovery-contract`, adding three nullable TEXT columns to `sessions`.

| Column | What it holds | Which research item |
| --- | --- | --- |
| `agent_version` | the agent version at launch, read from the detection cache so no subprocess runs on the create path | A8 |
| `agent_contract` | `requiresOriginalCwd`, the resume strategy and template, the id capture route, the session store shape, the binary, and the conformance stamp | A8 |
| `resume_provenance` | where the conversation id came from, how confident the capture was, and the directory it was captured in | G6 |

G7, spatial state, is a third migration on the same table and it was deliberately left out.

### What restore now obeys

The ladder in `originalCwdRule`, in `src/main/restore/restore.ts`.

| Rung | Condition | Answer |
| --- | --- | --- |
| 1 | the agent is `shell` | nothing to resume, so nothing to protect |
| 2 | the row recorded a contract | use the row and stop, because a registry that changed its mind does not get a vote on a session that already exists |
| 3 | no contract, and the registry still launches this id | ask the registry, which is every row created before the migration and is still the best answer available |
| 4 | no contract, and the registry does not launch this id | refuse, where the old code returned the permissive `false` |

The display name is the one thing restore still asks a live object for. It is cosmetic and its
fallback is the bare agent id, which is a true thing to show rather than a wrong one.

### The compatibility decision went breaking, and why

`application_id` is now 1414681669, the ASCII bytes of "TRTE". `user_version` is 8.
`min_compatible_version` is 8. All three were 0 or unset before this phase.

Research 27 section 4.2 measured that the SQL shape here is additive. Three nullable columns, no
table rebuild, no rename, and an older build's `INSERT` still runs. That was confirmed against the
real schema rather than against the table in the document. A schema 7 column list inserted into the
migrated file without throwing and left `agent_contract` NULL.

Research 27 section 4.3 sets the stricter rule that decided it. Bump the minimum whenever a new
column is REQUIRED for correct restore, even where SQLite would let an old build write without it.
These columns are exactly that. An old build writing NULL into `agent_contract` produces a row that
looks like a pre migration row forever, and rung 3 of the ladder then guesses for a session that had
a recorded answer. The quiet success is the hazard, so the refusal is the answer.

**Consequence the operator will meet.** Once a build carrying this migration opens their manifest,
the older installed Tortie refuses to open it and says so on a screen with Quit and Reveal Data
Folder. Their sessions keep running in the private tmux server, because Tortie does not own those
processes. A refusal costs visibility and not work.

### The drift, recorded per session rather than only in a document

Research 30 re-probed every installed agent three days after the flag catalogue was written and five
of nine had drifted. Every load bearing flag survived that time, so nothing broke. Nothing in the
build would have told the user if one had.

The contract now carries `flagsVerifiedVersion`, the version the catalogue was written against, and
`flagsVerifiedAgainst`, which is `this-version`, `other-version`, `never` or `unknown`. The
conformance report also records a version per agent and a top level `versions` block, so a passing
report can say which build it passed against. It could not before.

Measured on 2026-08-13, all three agents driven read `other-version`.

| Agent | version at launch | flags verified against | reads |
| --- | --- | --- | --- |
| claude | 2.1.231 (Claude Code) | 2.1.226 (Claude Code) | other-version |
| pi | 0.84.1 | 0.79.1 | other-version |
| qwen | 0.21.9 | 0.21.7 | other-version |

claude read 2.1.229 earlier the same day and 2.1.231 by the evening, which is the drift happening
during the phase that measures it.

### The question Phase 25.5 asked, answered here

Phase 25.5 asks whether this drift work covers a binary that disappears entirely, because a package
renamed itself. **It does not, and the code is honest about it rather than wrong.** The comparison
needs a version, and a version needs a binary that detection found. When there is no binary the
contract records `flagsVerifiedAgainst: 'unknown'`, which is a true statement and not a false pass.

What Phase 21 does give that case is the last rung of the ladder. A session whose agent id no longer
launches is now refused instead of restored into the permissive answer. That protects the existing
sessions of a renamed agent. It does not find the rename. Finding it needs a probe for the new
binary names, and that stays Phase 25.5's job.

### Four defects the verifier found, and how they were fixed

| Defect | Fix |
| --- | --- |
| a crash during the keepsake copy left a torn file that was kept forever and reported as good | verify the occupant opens before honouring `already-kept`, and write to `*.partial` then rename on top after it verifies |
| the refusal protected the data and presented it as loss | `manifest/refusal.ts` decides and holds the words, `notice/refusal-screen.ts` shows them, wired before the window is created |
| the stamp and the migration were two transactions | `runMigrations` takes a `seal` that runs inside the last applied step's transaction |
| the harvest watch tests flaked | `decide()` no longer runs while the first listing is still registering what it found |

Before the keepsake fix, 60 SIGKILL boots left 1 unreadable copy at 0 bytes. After it, 60 boots left
0 unreadable copies and 4 partials under a name nothing reads.

### Verification, at Tier 3

Durability, restore and a migration on the sessions table are all Tier 3 by the table in CLAUDE.md.

| Gate | Result |
| --- | --- |
| `npm run typecheck` | clean, both projects |
| `npm run build` | clean, and 21 durability refusals are in the bundle |
| `npx vitest run` | 180 files passed, 1 skipped. 2457 tests passed, 2 skipped, 0 failed. Four consecutive runs |
| `npm run smoke:t1` | PASS, 6 of 6 |
| `npm run smoke:t3` | PASS, both shapes. claude armed `--resume`, pi armed `--session-id` |
| `npm run smoke:fault` | PASS, 20 cases |
| `npm run smoke:migrate` | PASS, 11 of 11 |
| `npm run smoke:refusal` | PASS, Quit and Reveal both work and the file is byte identical |
| `npm run conformance:resume:capture` | PASS, 6 PASS, 0 FAIL, 0 BLOCKED, 4 SKIP in 17.4 s |

Against a copy of the operator's real manifest, never the file itself. Before: 38 sessions, 7
migrations, `user_version` 0, no `meta` table. After: 38 sessions, 8 migrations, `user_version` 8,
`min_compatible_version` 8, integrity ok. All 19 pre-existing columns for all 38 rows were dumped
before and after and `diff` reported no difference. All three new columns are NULL on all 38 rows.

113 SIGKILL trials at delays from 8 ms to 90 ms all left a file that was integrity ok, held 38 rows,
carried 8 migrations and both numbers. Never half.

Operator sessions before: 37. Operator sessions after: 37. Socket `-L gmux` was listed and never
written to. No `pkill`. No `kill-server`.

### What is NOT true after Phase 21

- **No row created before this migration gained a contract.** Nothing is backfilled, and that is
  deliberate. Filling one in from today's registry is the same guess the phase removes, and afterwards
  it would be indistinguishable from a contract that was genuinely recorded. Those rows keep using
  rung 3 of the ladder.
- **A build that shipped before this migration has no refusal in it.** It will still open a newer
  manifest and write NULLs. The protection starts with the first build carrying this code and runs
  forward. There is no way to fix that backwards.
- **Nothing looks for an agent whose package renamed itself.** See the Phase 25.5 answer above.
- **The dialog was never photographed.** `screencapture` returned a black frame because the process
  has no screen recording permission, and System Events could not enumerate the Electron windows
  without accessibility permission. `npm run smoke:refusal` asserts what was drawn instead, including
  that two boxes exist so Reveal does not dismiss the screen, and that there is no "Open anyway".
- **`flagsVerifiedAgainst` is information and not a verdict.** `other-version` means the catalogue
  was written against a different build, not that resume is broken. Every load bearing flag survived
  the drift research 30 measured.
- **Capture mode asserts the manifest only.** No turn was planted and no conversation was proven.
  The full `npm run conformance:resume` roundtrip is the one that proves a conversation comes back.

---

## Phase 22, what shipped ✅ 2026-08-13

The fourth sidebar view is in the app, and installing shipped with it as the operator decided. The
specification is above and in docs/research/29-context-sidebar.md. The command shapes came from
research 36. This entry records what landed, what was proven and what is still not true.

### What a person can now see and do

| Thing | Where it is | State |
| --- | --- | --- |
| Five sections, being skills, MCP servers, hooks, plugins and instructions | the Context view in the left rail | reads the real files on disk |
| Filter the whole view to one agent | the view header | works, and it changes the order and the wording, not only the rows |
| Open a row and read its detail | the editor area, as a tab | works, including the file it came from |
| Install a skill from a GitHub source | the install sheet, opened from the skills section | works, and every write goes through the bundled skills CLI |
| Remove and Update a skill | the row context menu | works, skills only |
| Re-check an installed skill against its pin | every refresh of the view | works, and a changed file switches the row off |
| See what one session loaded at launch | the session context menu, "Show what it loaded…" | works, and the header pill shows the session name |

### The precedence work, and the four agents proven in the running app

There is one standard and eleven bespoke layouts, and at least seven precedence models across twelve
agents. Two of them run in opposite directions inside Claude Code, because project settings beat
personal settings while personal skills beat project skills. The panel therefore takes the order and
the sentence from the registry per agent, in `precedenceReadoutFor`, derived from the declared
location ranks. Nothing in a component states a rule.

Four agents were read out of the running app and each said something different.

| Agent | What the skills section says |
| --- | --- |
| gemini | "This project" is drawn first, and the project copy wins |
| codex | both copies stay, and neither one is discarded |
| cursor | Tortie has not established which copy wins |
| claude | the personal copy wins over the project copy |

The three models that name no winner, being `no-override`, `cli-reported` and `unknown`, now carry
the registry's own sentence in the detail card. Before the fix round they crossed the bridge and no
renderer code read them.

`npm run conformance:context` is the new gate on this. It reports 38 agent-and-category pairs across
10 agents, and it fails if any declared pair is missing a model, an order or a live reload answer.

### What the install path refuses

The scan runs before the install control is drawn, at child index 2 against the control at index 8,
read out of the running DOM. Two findings are hard and cannot be cleared.

| Finding | Behaviour | Why it is hard or soft |
| --- | --- | --- |
| `executable-content` | hard refusal, the button is disabled | the file body can run with the user's permissions before any model reads it |
| `not-scanned` | hard refusal, the button is disabled | Tortie could not read the file, so it has nothing to judge |
| `audit-risk` | soft, the user acknowledges it | a scanner rating is somebody else's judgement, and "nobody scanned this" is the common case |

A real skill shipping 8 files under `scripts/` was refused in the app, with the reason on screen. The
whole command line is still shown with a copy control, so a person who wants that skill runs it in
their own terminal and owns the decision there.

Three more refusals sit in front of a write. A plan whose rebuilt command line differs from the one
shown is refused, because a command line the user did not see is not one they approved. A source that
is not `owner/repo` is refused with the reason. An install naming a single agent, or the wildcard
agent on remove, throws rather than running.

The build now asserts 5 skills-write refusals in the main bundle, beside the 21 durability refusals
Phase 19 put there.

### Pin and re-check, and the evidence

`src/main/skills/pins.ts` writes Tortie's own sha256 of the installed folder on the success path
only. Every refresh re-hashes and compares, in `context:skillPins`.

The lock file's `skillFolderHash` is a 40 character git tree id and Tortie's hash is 64 characters.
Wiring the re-check to the lock would have reported "changed" for every GitHub skill forever, so it
is never compared against.

The proof was driven in the app. One HTML comment was appended to an installed skill, the view was
refreshed, and the row struck itself through with the sentence naming what Tortie did and did not do.
It is switched off in Tortie's list, it is still on disk, the agents still load it, and removing it is
the thing that stops that.

### The launch snapshot is advisory, and the proof

The snapshot is written once at launch, a restore writes a new one, and deleting it is always safe.
It never fails a launch, never blocks a restore and never changes a resume argument. `smoke:t3`
passed both restore shapes, claude and pi, each coming back with replayed scrollback and an armed
unexecuted resume, with the snapshot present. `smoke:fault` passed 20 cases with every invariant
holding, which includes kills before the snapshots are written.

### Gates, on the final tree

| Gate | Result |
| --- | --- |
| `typecheck` | clean, both projects |
| `build` | passes, with 21 durability refusals and 5 skills-write refusals asserted, and the preview containment check |
| `test` | 208 files passed, 1 skipped. 2,874 tests passed, 2 skipped |
| `smoke:t1` | PASS, 6/6 on verify |
| `smoke:t3` | PASS, both restore shapes |
| `smoke:fault` | PASS, 20 cases |
| `smoke:migrate` | PASS, and the migrated manifest reports migrations=9 |
| `conformance:context` | PASS, 38 pairs across 10 agents |
| `conformance:resume:capture` | 6 PASS, 0 FAIL, 0 BLOCKED, 4 SKIP in 17.0 s |
| `package:dir` | passes, and afterPack reports "skills 1.5.22 runs from Contents/Resources/skills-cli under the packed Electron with no node on PATH" |

Operator tmux sessions: 37 before, 37 after, and the two lists are identical. No `pkill` was used.
Every app launch used its own `--user-data-dir`. Every write test ran with `HOME` under the
scratchpad, and the operator's real agent configuration was never modified.

### What is still not true

- `Disable` and `Check connection…` are not offered. The first means editing an agent's own settings
  file. The second means starting somebody else's MCP server. Neither is built.
- The write verbs are skills only. The skills CLI has no MCP, hook, plugin or instruction management
  in it, so nothing else can be installed, removed or updated from Tortie.
- Only an `owner/repo` GitHub source can be previewed, so only such a source can be installed from
  the sheet. A git URL and a local directory are both refused with the reason.
- Tortie cannot stop an agent loading a file that is on disk. A changed pin switches the row off in
  Tortie's own list and says so, and removing the skill is the only thing that stops the agent.
- The preview's description is the first line of the fetched body, because the search API returns no
  description. The licence always reads "unknown".
- The usage-data switch was not added to settings, so the bundled CLI keeps its own default.
- An update run can report success for skills it never checked, which is a CLI limitation recorded in
  research 36. The check command is a plain alias for update, so the panel offers an action rather
  than an indicator.
- The full `npm run conformance:resume` roundtrip was not run in this phase. Capture mode asserts the
  manifest and plants no turn.

### One safety fix that belongs to Phase 19's family

A `GMUX_SHOT` launch was a harness launch for the single instance check and not for the tmux socket
override, so a shot run that created a session put it beside the operator's 37 live ones while
printing that the override had been ignored. `activeTmuxSocket` now honours `GMUX_SHOT`, which is
what `index.ts` always meant. There is a test for it. This is the same class of mistake that
destroyed the operator's sessions on 2026-08-12.

---

## Phase 23, what shipped ✅ 2026-08-13

Tortie now reads one configuration file, being `agents.json` in the configuration folder. It can add
an agent the build never heard of, and it can patch one it ships. **No third party code runs in any
Tortie process**, and none ever will, because the eight permanent refusals from research 31 section
6.7 are now a section of CLAUDE.md next to the tmux safety rules.

### What a person can now change without a rebuild

| Thing | Where | State |
| --- | --- | --- |
| Add a thirteenth agent, with its binary, its launch arguments, its resume template and its id capture | `agents.json` in the configuration folder | works, and it launches, resumes and restores |
| Rename a compiled agent, or point it at a different binary or directory | the same file, using an id the build already ships | works |
| Open the folder, with the guide, the schema and six examples already in it | the Tortie menu, "Open Configuration Folder" | works, and it writes the folder if it is not there |
| Confirm what a configured row will run, and withdraw that agreement | Settings, then Agents | works, and it is the only surface that can do it |
| Read why a row was refused, naming the field and the reason | the same surface, in red | works |

The file is read at boot, on an explicit reload, and on a file watcher with a debounce. It is never
read on the path that creates a session and never on the path that restores one. A test asserts the
second half by importing the create path and the restore path and failing if either reaches the
configuration modules.

### What the re-baseline found, and it is the reason this phase did not follow research 31 literally

Research 31 was written on 2026-08-12. 330 files under `src/` changed between its commit and the
start of this phase. Five of its concrete instructions were stale, and one of them would have
produced a build that could not work.

| Research 31 item | What was true on the day | What was done |
| --- | --- | --- |
| P0, complete the manifest before C1 | already shipped, by Phase 21 and migration 008 | deleted from the plan |
| G4, the import boundary test file list | wrong. `src/main/manifest/agents.ts` is on the create path and **must** read the overlay | the forbidden list was re-derived by measurement |
| C6, a content security policy test | already shipped, by Phase 20.5's `assert-preview-containment.mjs` | the existing gate was extended rather than duplicated |
| C4, keymap overlays that rebind existing command ids | not buildable. There is no command dispatch layer to rebind | cut |
| the `dangerAcknowledged` bug to file "this week" | already fixed, by the Phase 18.5 danger seal | the seal was reused as the confirm gate's own mechanism |

### The thirteenth agent, proved in the running application

A verifier wrote one row into `agents.json` naming a script that records its own argv, then drove the
real app with its own `--user-data-dir` and its own tmux socket. No Tortie source file was edited at
any point in that run.

| Step | Evidence |
| --- | --- |
| it appears | `agentsList()` returned 13 agents, and the new session sheet drew a "Tortie Verifier" chip beside Claude Code |
| a row added while the app ran | the watcher picked it up in under 2.5 s, and the next scan returned 15 ids |
| it launches | tmux itself reported `.../bin/tortiever --verifier --session-id 6f8d5b43-…`, and the process recorded the same argv, its cwd, `GMUX_SESSION_ID`, `GMUX_MANAGED=1` and the row's own environment variable from its own side |
| the manifest row carries the Phase 21 contract | `agent_contract` came back with all 15 fields, every value taken from the row rather than from a compiled agent, and `resume_provenance` read `preassigned`/`exact` |
| it restores across a real quit | the app was quit, the tmux session was gone, the row reported `restorable`, and `restore` returned `armed` with the replayed scrollback and the unexecuted resume line on the prompt |
| the armed line is executable | pressing Enter with `send-keys` started the agent again with `--resume 6f8d5b43-…`, in the original cwd |

### What the confirm gate refuses

Six refusals are asserted in the built main bundle at build time, beside the 21 durability refusals
from Phase 19 and the 5 skills-write refusals from Phase 22.

| Case | What happens |
| --- | --- |
| a row nobody confirmed | the launch throws and names the row. Nothing is started |
| a confirmed row whose execution bearing fields changed | the state moves to `changed` and the launch throws. The hash moved, so it asks again |
| a row that changed while the confirm sheet was open | the confirmation is refused |
| a confirmation call without the exact acknowledgement constant | refused, and no file is written at all |
| a record forged with a correct hash, or sealed by another key | refused, and the real confirmation beside it is untouched |
| a launch asked for from inside the configuration read | refused. A configuration change never starts anything on its own |

Seven fields can cause a program to run, being `binaries`, `extraProbeDirs`, `launch.argv`,
`launch.env`, `versionProbe`, `resume.template` and `resume.idCapture`. The hash covers those and
nothing else, so renaming an agent does not ask again. `npm run conformance:agents` proves that in
both directions.

The seal is the Phase 18.5 danger seal, moved into `src/main/config/seal.ts` and reused rather than
reinvented. `safeStorage` encrypts the record under a key the macOS keychain holds against Tortie's
own identity, so another process running as the same user cannot forge it. `npm run smoke:config`
exercises all of this against the real keychain in a real Electron process.

### The type is hand written and narrow

`src/shared/agent-overlay.ts` declares 10 fields on a row. The registry entry carries 23. The
internal type is not re-exported and never will be, which is research 31 section 6.6 and bb's lesson
about freezing 65 prop types into a public contract and deleting it the next day. Tortie's own
honesty vocabulary, being `status`, `confidence`, `unverified`, `reconstructionTarget` and
`specstory`, means nothing when a user writes it, so none of it is in the file.

An invalid row is dropped whole. It never partially merges, it never disappears quietly and it never
crashes the read. The error names the field and the reason, e.g. `agents[2].binaries[0] is a
relative path (relative/path/x). A path must be absolute or start with ~/…`.

### The authoring prompt, and whether it works

It works. The guide, the generated schema and six worked examples are written into the folder the
first time Tortie creates it, and again after an update when the bytes differ. They also ride in the
packaged app at `Contents/Resources/config/`.

A verifier pasted the prompt from the guide into a coding agent, gave it a description of a CLI it
had never seen, and the agent wrote a file with a new agent and a patch of a compiled one. That file
validates against the shipped `agents.schema.json` and loads through the runtime validator with zero
problems. The agent also wrote itself a `notes` field recording which fields it had not measured,
which is what the guide asks for.

A test parses every example in the guide against the schema, so a worked example that does not load
fails the build.

### Gates, on the final tree

| Gate | Result |
| --- | --- |
| `typecheck` | clean, both projects |
| `build` | passes, asserting 21 durability refusals, 5 skills-write refusals, 6 config confirm-gate refusals, 3 reachable config channels and the preview containment check |
| `test` | 215 files passed, 1 skipped. 3,079 tests passed, 2 skipped |
| `smoke:t1` | PASS, 6/6 on verify |
| `smoke:t3` | PASS, both restore shapes, claude and pi |
| `smoke:config` | PASS, against the real macOS keychain, and no process was started at any point in the run |
| `smoke:fault` | PASS, 20 cases, every invariant held |
| `smoke:migrate` | PASS, 11/11 |
| `conformance:agents` | PASS. 12 compiled rows, 10 launchable, 11 in the table including one of configuration origin |
| `conformance:context` | PASS, 38 pairs across 10 agents |
| `conformance:resume:capture` | 6 PASS, 0 FAIL, 0 BLOCKED, 4 SKIP in 16.4 s |
| `package` | passes, and `Contents/Resources/config/` carries the guide, the schema and all six examples |

### The fix round found a durability defect that had nothing to do with configuration

`findOrphanedClients` matched the hardcoded socket name while the server it spared came from the
active socket. A verifier reached that state and SIGTERMed the operator's real `-L gmux` server,
destroying 36 live sessions. The matcher now keys on `activeTmuxSocket()`, refuses to signal any
tmux **server** on any socket, and matches the socket name whole rather than as a substring. That
last part is a second defect the new test found, because `-L gmux` matched `-L gmux-verifa`.

This is the third time this class of mistake has cost the operator work. It is in the same family as
Phase 19's harness and Phase 22's `GMUX_SHOT` socket override.

### What is still not true

- **Project scope did not ship, and that was the plan.** C5 introduces a second trust boundary and
  research 31 gates it behind the confirm gate existing first. It now does.
- **Theme overlays did not ship.** C3 was cut for time after C1 grew a confirm surface it did not
  originally have.
- **Keymap overlays are cut, not deferred.** There is no command dispatch layer to rebind, so C4 as
  written cannot be built. Any future attempt needs that layer first.
- The overlay covers launch and resume only. Nothing in a configuration file can implement, replace,
  decorate or intercept Explorer, SCM, search, the terminal, the tab spine, the manifest, the tmux
  layer or the Context view, and nothing in it can set a session's status.
- `Session.agent` and `CreateSessionInput.agent` are still the narrow `AgentKind` union, a gap open
  since Phase 10. A wider string flows at runtime, which is how cursor and gemini already launch, so
  a configured agent rides the create bridge untyped. Closing it is a separate round.
- `settings/store.ts` still holds its own private copy of the seal. Migrating it is three call sites
  and no behaviour change, and it was held rather than churned.
- A `resume.idCapture.mode` of `none` inside a `resume` block is still accepted, and it describes a
  command Tortie can never fill. The guide warns against it. The validator does not refuse it.
- The seal does not stop replay. Someone holding an old sealed record, from a time the person really
  did agree, can put it back. Closing that needs a second secret kept outside the file.
- The full `npm run conformance:resume` roundtrip was not run. Capture mode asserts the manifest and
  plants no turn.

Operator tmux sessions: 15 before this integration and 15 after, read only with `list-sessions` on
the `gmux` socket. The count is 15 rather than 37 because of the defect above. The operator's own app
restored 14 of them from the 46 manifest rows at 10:30, which is the durability layer doing exactly
what it exists for. No `pkill` was used at any point. Every app launch in this phase used its own
`--user-data-dir` and its own tmux socket.

---

## Phase 26 — Context sidebar dogfood round (user reported, 2026-08-13) ✅ SHIPPED 2026-08-13

The operator used Phase 22's Context sidebar for a morning and found four defects. Per CLAUDE.md,
bugs the operator personally reports get proof rather than assurance, so the interface items are
Tier 2 with screenshot reads and the error item is Tier 3.

Reference screenshots, real paths, builders must Read them:
- /Users/gdc/Library/Application Support/CleanShot/media/media_rmrbxMNs8O/CleanShot 2026-08-13 at 11.55.01@2x.png
  which shows the skills section and the naming warning row.
- /Users/gdc/Library/Application Support/CleanShot/media/media_LqnQpdFHgN/CleanShot 2026-08-13 at 11.55.34@2x.png
  which shows the install preview sheet at full length.

### Item 1 — opening a global skill throws a raw git error the user cannot dismiss
**Symptom.** Opening the skill at ~/.claude/skills/benchmark-against-a-named-exemplar/SKILL.md
produced a raw error titled "Error occurred in handler for 'git:showHead'" carrying a GmuxError JSON
body, and the operator could not close the broken surface.
**Root cause, read from the code.** src/main/context/detail-host.ts states the design: a context
detail tab IS a file tab. File tabs assume they live inside the project repository. loadHead in
src/renderer/editor/tab-io.ts then calls git.showHead with a path that is not relative to the
repository, because a global skill lives under the home directory, and GitService.assertRelPath
correctly refuses the absolute path. Two further failures compound it. The catch in loadHead toasts
the raw error text instead of a sentence a person can read. And the failed state left the operator
with no way to dismiss it.
**Fix at the source, not the symptom.** A file outside the active repository must never enter the
diff path at all. Open it as a plain file with no diff offered, decided where the tab is created
rather than recovered after git refuses. Any error a person can see must be a sentence, never a JSON
body or a stack. And every failed tab state must be closable. Tier 3, because the operator hit it:
drive the real app, open a global skill, confirm it opens plain, confirm no git call is made for it,
and confirm a deliberately broken tab can always be closed.

### Item 2 — finding a new skill requires a right click
**Wanted, and the operator named the pattern to follow.** The global filter field stays where it is,
above the sections, filtering everything by name. The skill search is a separate entry box that
lives INSIDE the skills section, the way the commit message box lives inside the source control
pane (ScmSection, DESIGN-SPEC S3: sticky section header, then the box, then the rows). Typing there
searches the registry and pressing return opens results. The two boxes never share a surface, so
filtering what is installed can never silently become a network search. Reuse the S3 in-section box
anatomy rather than inventing a second shape. Tier 2.

### Item 3 — "Enable for…" opens the wrong surface
**Symptom.** The row verb "Enable for…" opens the install search sheet.
**Root cause.** src/renderer/context/actions.ts routes Enable for through the same sheet as install,
because research 36 found the skills CLI re-runs add to widen agents. The plumbing is right and the
surface is wrong.
**Wanted.** "Enable for…" shows the agents this skill IS enabled for, as checkboxes over the detected
fleet, pre-checked from disk, with the same disabled-with-reason treatment the install sheet already
has for agents the CLI cannot target. Confirming re-runs add through the existing plumbing. No
search field anywhere in that surface. Tier 2.

### Item 4 — the install preview needs a redesign, losing nothing
**Symptom.** The preview sheet at media_LqnQpdFHgN scrolls well past one screen before the decision.
**The constraint the operator set, 2026-08-13: no information may be lost.** Every fact the sheet
shows today survives the redesign. What runs, where it comes from, the licence, the scan verdict
with its date and all four scanners, the cost, every agent with its reason when it cannot be
targeted, and the full command line. Hiding a fact behind a collapse that a person would have to
know to open counts as losing it for the decision, so the redesign is layout work, not triage.
**The problem is arrangement, not volume.** Today it is one narrow column where every section gets a
full-width band, so seven short facts cost seven screens of scroll. Redesign so the decision fits:
use the width (the sheet is a modal and can be wide, e.g. two columns, with the facts on one side
and WHO GETS IT plus the command on the other), tighten the vertical rhythm, and put the confirm
within reach of the scan verdict. Invoke the impeccable skill for this design, and prove the result
with a screenshot read showing every fact from the current sheet present in the new one.
**The operator also asked to explore rendering the preview inside the Context panel rather than a
modal.** Assess it honestly: the panel is 220 to 400 px wide, and no-information-lost is now the
bar the panel version must also clear. If it cannot, keep the modal and say so with the measured
reason. Tier 2 with screenshot reads at both widths.

### What must not regress
The four install requirements from Phase 22: scan before the control, pin and re-check, human
confirm with the real command, refusals that cannot be cleared. The precedence readouts. Zoom in the
Context view. The 5 skills-write refusals in the bundle gate.

### Shipped 2026-08-13
All four items landed in one commit, and none of the Phase 22 install requirements regressed.
- A file outside the active repository opens as a plain file and never enters the diff path. The
  verifier drove the real app, opened a global skill, and logged zero git calls for it. A failed
  tab shows one sentence and can always be closed.
- The skill search is an entry box inside the skills section, following the commit box anatomy.
  The global filter stays above the sections and never searches the network.
- "Enable for…" shows the detected fleet as checkboxes, pre-checked from disk, with the
  disabled-with-reason rows. Confirming re-runs add and removes nothing.
- The preview reads as two columns above one control. The no-loss audit found all 28 facts from
  the old sheet in the new one, none behind a disclosure. At a 900 px window the content went from
  1171 px to 987 px and the scan-verdict-to-confirm span went from 538 px to 336 px, so the
  decision now fits one screen. The preview stays a modal. At the 300 px panel tier that span
  measures 960 px against a 760 px viewport, so the verdict and the confirm can never share a
  screen there under the no-loss rule.

---

## Phase 26.1 — align the Enable for picker and tighten its reasons (user reported, 2026-08-13) ✅ SHIPPED 2026-08-13

The operator screenshotted the "Enable copywriting for..." dialog and asked for aligned
checkboxes and fixed spacing. The agent rows now lay out on the same fixed grid the install
sheet fleet uses, so the checkbox columns align instead of drifting with label length. The
dialog widens to 560px so three columns fit. The disabled row reasons render as one block
with a small fixed gap and no stacked paragraph margins. Agents that share the same reason
are named together in one sentence, and no fact is dropped. Tier 1 with a driven capture on
an isolated socket. Measured checkbox columns at x 465, 640 and 816 on every row.

---

## Phase 26.2 — naming disagreements, handled by ownership (user decided, 2026-08-13) ✅ SHIPPED 2026-08-13

Reference screenshots:
- /Users/gdc/Library/Application Support/CleanShot/media/media_Sy0AfdClVM/CleanShot 2026-08-13 at 13.37.18@2x.png
  shows the red banner row the bundled case currently takes at the top of the skills section.
- /Users/gdc/Library/Application Support/CleanShot/media/media_1NvnD7c2Sf area screenshots show the
  hover and detail surfaces where the quiet note belongs.

**The defect.** A skill whose folder name and frontmatter name disagree gets a red error banner row
in the skills section. For the case that triggered this, the skill ships inside Antigravity's own
installation under ~/.gemini/antigravity-cli/builtin/, so the user cannot act on it. Red demands an
action that does not exist, and the banner spends a full row of a 220 to 400 px panel on it.

**The operator decision.** Severity and placement follow ownership.
1. **Bundled or vendor owned: no row in the skills section at all.** The inconsistency appears only
   in the hover card and the detail view, as one quiet informational sentence that names the owner,
   e.g. "This inconsistency is inside Antigravity's own installation. Tortie will not edit vendor
   files." Secondary text token, no error icon, no red.
2. **User owned** (~/.claude/skills, ~/.agents/skills, project skills): the warning stays visible in
   the section, and becomes actionable. State the two fixes plainly, being rename the folder to
   match the name, or edit the name to match the folder, with an Open Folder affordance beside it.
3. **Everywhere, replace the category sentence with the consequence**, drawn from the per agent
   verdicts the resolver already keeps (src/main/context/resolve.ts keeps every verdict when agents
   disagree): "claude will call this antigravity_guide, gemini will call it antigravity-guide."
4. **No one click fix.** Research 36 drew the line that Tortie never hand edits skill files or
   directories, and this phase does not cross it. Reopen only if the operator asks after living with
   the guided fix.

**Grounding, already verified in the code.** Ownership is computed in the same module that produces
the warning (agent-context.ts carries bundled on the entry), so conditioning severity on it needs no
new plumbing. The per agent name verdicts already exist in the resolver.

**Verification.** Tier 2. Drive the real app with an isolated HOME containing one bundled shaped
inconsistency and one user owned inconsistency. Screenshot the section, the hover and the detail for
both, crop and read: the bundled one must take no section row and show the quiet note on hover, the
user owned one must show the actionable warning with both fixes and Open Folder. Confirm the
consequence sentence names real agents from the registry rather than a hardcoded pair.

**Item added by the operator, 2026-08-13: the skill name gets more room.**
Reference: /Users/gdc/Library/Application Support/CleanShot/media/media_Sy0AfdClVM sibling shot at
13.40, showing names crushed to about ten characters while summaries keep most of a wide row.
Root cause, read from context.css around line 337: the name is flex 0 1 auto with a 40 px floor, so
when a row overflows, name and summary shrink proportionally to their natural widths. A long summary
has a huge natural width, so it keeps hundreds of pixels while the name hits its floor. The comment
above that rule says the summary gives way first, and the flex arithmetic does the opposite, so the
code disagrees with its own comment.
The fix: the name renders whole up to a generous cap that scales with the pane (a ch based cap, not
a pixel constant), the summary truncates first, and the name only truncates when the name alone
cannot fit the row. Prove it with a screenshot read at a wide pane and at 300 px: at the wide pane
every name in the operator's screenshot renders whole.

**What must not regress.** The hover card and detail surfaces from Phase 22, the section counts
(bundled entries are already excluded from counts and must stay excluded), and the no secret
rendering rule. The 24 px row rhythm and the three width tiers, including T3 where the summary
moves to the hover card.

**Shipped 2026-08-13.** All three items landed, verified by driving the real dev build with an
isolated HOME on the harness socket.
- A bundled naming mismatch takes no row in the skills section. Its note is one secondary-token
  sentence on the hover card and the detail view, with no error icon. It names the owner and says
  Tortie will not edit vendor files.
- A user owned mismatch keeps the visible warning and states both fixes, being rename the folder
  or edit the name in SKILL.md, with an Open Folder button in the section, the hover card and the
  detail header. No one click fix exists.
- The consequence sentence is built from the resolver's live verdicts, e.g. "claude and cursor
  will call this gov_style" for a ~/.claude/skills case and antigravity alone for the vendor case.
  7 unit tests pin the composition.
- The skill name renders whole up to a ch based cap that scales with the pane. At 400 px and
  300 px no name was cut while every long summary truncated. At 220 px the T3 tier held and only
  names longer than the row alone were cut. Row height stayed 24 px at every width.
- Section counts still exclude bundled entries, and zoom still reaches the Context view.

---

## Phase 26.3 — an ended session can be restored, not only restarted (user requested, 2026-08-13) ✅ SHIPPED 2026-08-13

**The request.** When a session ends, the surface offers Restart, which is a fresh session with the
same name and directory, and Close. The operator wants a third verb: Restore, which brings the
session back entirely, meaning replayed scrollback and the agent's own resume command armed, exactly
what reboot restore already does.

**The plumbing exists, the state does not reach it.** `restoreSession` in the renderer store already
restores any row whose status is `restorable`, and the whole Phase 19 to 21 restore machinery sits
behind it. But an ended session never becomes restorable today. Two paths to check at spec time:
1. **Manual end.** The `endSession` confirm says "its scrollback will be discarded", and the row is
   discarded with it. To restore later, ending must first capture a snapshot capsule and preserve
   the row with its resume argv, which is exactly what the Phase 19 capture and Phase 20 capsule
   machinery are for. The confirm copy then changes, because the promise "this cannot be undone"
   stops being true.
2. **Natural exit.** A session whose process ended carries status `exited` with the row intact.
   Decide whether `exited` rows with a capsule and a resume argv simply offer Restore, which may be
   nearly free.

**Scope guard.** Reuse `restoreSession` and the existing capsule write. Do not build a second
restore path. The Phase 21 rule holds: restore obeys the manifest row, and the honest status model
from Phase 19 applies, so a restore whose replay or arming fails must say so, never claim `running`.

**One design question to settle at spec time, not silently.** Ending a session kills a live
process. Restore does not resurrect the process state, only the conversation and the scrollback.
The verb copy must say what comes back, e.g. "Restore replays the scrollback and arms the agent's
resume", so nobody thinks a long-running build they killed resumes mid-compile.

**Verification.** Tier 3, because it touches end, capture and restore, and the operator asked for
it personally. Prove by driving: end an agent session manually, restore it, and confirm the
scrollback replayed and the resume argv is armed and unexecuted, for a claude shape and a pi shape.
Confirm a plain shell restores as a shell in the right directory. Confirm the fault harness still
passes, and run conformance:resume:capture since restore paths are touched.

**What must not regress.** The Phase 19 restart fix, where nothing is discarded until the
replacement exists. The honest restore statuses. The 24 px surfaces that carry the verbs.

**Shipped 2026-08-13.** An ended session now offers Restore beside Restart and Remove. Manual end
captures a snapshot capsule and preserves the row before tmux kills anything, which the fault
harness proved with a real crash between the capture and the kill. The session survived. Restore
goes through the existing `restoreSession` path, obeys the manifest row, and leaves an exited row
exited when it fails. Live drives restored a claude shape and a pi shape with the resume command
armed and unexecuted, and a plain shell in its recorded directory. The end confirm no longer says
"cannot be undone" on any end path, including the group end. Tier 3 verified, one fix round.

---

## Phase 28. Process observability after the lid close diagnosis (2026-08-14) ✅ SHIPPED 2026-08-14 (`e9a8731`)

**The event.** On 2026-08-14 the operator closed the laptop lid. On wake, the GPU driver dropped
the Chromium GPU helper's graphics context. Chromium ended that helper on purpose with code 34 and
respawned it in under 1 second. No work was lost. The diagnosis found two gaps in Tortie. The main
process had no listener for helper or renderer death, so a packaged build would hold no record that
the event ever happened. And a terminal pane that loses its WebGL context falls back to the DOM
renderer silently and permanently, because nothing retries the WebGL addon until the pane remounts.
This phase closes exactly those two gaps and nothing more.

**What shipped.**
- src/main/diagnostics/process-gone.ts listens for `child-process-gone` and `render-process-gone`
  on the app and logs one `[gmux]` line per death. The line carries the process type, the reason
  and the exit code. The exit code on these events is the raw wait status. When it is a positive
  multiple of 256 the line also carries the decoded code, e.g. `exitCode=8704 realCode=34`. The
  module logs and does nothing else. The renderer listener is registered on the app rather than
  per window, so one registration covers every window.
- A pane in src/renderer/terminal/TerminalPane.tsx now logs one line when it falls back to the DOM
  renderer at context loss. On each `power:resume` broadcast it retries the WebGL addon once, with
  the same try catch shape the initial creation uses, and logs whether the retry succeeded. A
  failed retry leaves the pane on the DOM renderer and the next wake tries again. A pane whose
  initial WebGL creation failed is not retried, because it never had a context to lose.
- One harness knob, `GMUX_SHOT_POWER_RESUME=1`, makes a shot instance send the wake broadcast on
  the same channel a real resume uses, so a verifier can reach the retry without putting the
  machine to sleep. The knob waits 4 seconds before the broadcast, because xterm's WebGL addon
  holds a lost context for 3 seconds hoping the browser restores it, and only then reports the
  loss. Shot mode only, no product behavior.

**Tier and evidence.** Item 1 ran at Tier 1 plus one live kill. Item 2 ran at Tier 2 with one
targeted probe and one screenshot read.
- Probe A drove a real pane in an isolated harness instance on socket gmux-p28-shot, forced the
  context loss through `WEBGL_lose_context`, and sent the wake broadcast. The harness output shows
  the loss line, then `webgl restored after wake`, and the screenshot shows the pane still drawing
  its prompt after the round trip.
- Probe B started a second isolated instance and killed exactly its own GPU helper, found as the
  `--type=gpu-process` child of that instance's main process, with signal 9. The harness output
  shows `[gmux] helper process gone: type=GPU reason=killed exitCode=9 name=GPU`. The instance
  survived and completed its capture.
- 7 unit tests pin both line shapes and the decode rule, including 8704 decoding to 34.
- Gates on the final tree: typecheck, build, the full test battery, smoke:t1 and
  assert-bundle-refusals, all green. The battery ran with 2 workers because the machine sat at
  load average 36 with 16 live operator sessions, and the real git integration tests time out at
  5 seconds under that load. They pass alone and with 2 workers.
- Not verified, stated plainly. The retry failure branch never ran live, because a healthy GPU
  grants the new context. A real renderer death was not observed live. Nothing here persists
  stdout in a packaged build. The lines go to the same stream the rest of main already uses.

---

## Phase 29 — session history: browse and restore removed sessions (user requested, 2026-08-14) ✅ SHIPPED 2026-08-14 (`d08ab00`)

**Specification.** docs/research/39-session-history.md. The research holds the verified facts, the
three competing designs, the adversarial verdicts and the winning interaction in full.

**The request.** A user who removes a session cannot get back to it today, even though the
manifest stored its conversation id. The operator wants to browse what past sessions were, by
name, and restore one, whether the removal was a mistake or a choice.

**The root cause.** Remove ends in `deleteSession` (`src/main/manifest/store.ts:1614`), a hard SQL
DELETE. Every field a restore needs dies with the row. The status alphabet already reserves
`'discarded'` as the tombstone for a reversible remove (`src/shared/types.ts:53`), and reconcile
already refuses to resurrect such a row (`store.ts:1867`), but nothing writes it. On the operator
machine 25 sessions were removed in about 2 days, and every removed non-shell row carried a
conversation id and a resume argv when it was removed. The only durable survivors of a removal
today are the SpecStory markdown and the agent's own transcript store, and neither is a
restorable session.

**What ships.**
- Migration 010 adds one nullable `removed_at` column. `last_seen` means "last confirmed alive in
  tmux", so it cannot order a removal list honestly.
- `discardSession` (`src/main/sessions/core.ts:2447`) writes `status = 'discarded'` and
  `removed_at` instead of deleting. It still releases the conversation claim. It still deletes
  the snapshot generations and the hook settings file, so restore returns the conversation and
  not the screen, and the panel says so.
- Restart (`src/main/restart/restart.ts:123`) and failed-create cleanup (`core.ts:2242`) keep the
  hard delete. A tombstoned restart leftover would put two rows with one name and one
  conversation id in play.
- A prune at manifest open hard deletes discarded rows whose `removed_at` is older than 90 days,
  through the existing `deleteSession`. There is no Delete Forever verb.
- A "Past Sessions…" item at the bottom of the Session menu opens a panel shaped like the create
  modal. Rows come from every project, newest first by `removed_at`, with a search field for name
  and project. Each row states before the click whether Restore continues the conversation or
  starts fresh, computed from `agent_session_id` and `resume_argv` both being present.
- Restore runs the Phase 26.3 path. The first build task is proving that path accepts a row
  arriving from `'discarded'` and re-acquires the conversation claim that removal released
  (`src/main/manifest/harvest/watch.ts:161`). No design traced this, and it is the one unknown
  that could force rework.
- The Remove confirm stays. Its copy becomes "Remove 'name'? It moves to Past Sessions and you
  can restore it from there."

**Refusals that bind the build.**
- No reopen shortcut. Restoring starts a process, and the user reads the name first.
- No badge and no count anywhere. Nothing notifies.
- No backfill from the backup ring or the keepsake file. Rows removed before this ships stay
  unrecoverable.
- Discarded rows never appear in the session list. They never appear in search or in Context.
  They never signal.

**Verification.** Split tier, stated per CLAUDE.md. The data layer is Tier 3, because it touches
the manifest and the restore path.
- Drive a real cycle in a live shot instance. Remove an agent session, find it in Past Sessions,
  restore it, and prove the resume command is armed and unexecuted, for a claude shape and a
  non-claude shape.
- Prove the prune with a row whose `removed_at` is set 91 days back, and prove a row at 89 days
  survives.
- Run `conformance:resume:capture` and `conformance:agents`, because restore and manifest code is
  touched.
The browse surface is Tier 2, one targeted probe and one screenshot read of the panel.

**What must not regress.**
- Phase 26.3 Restore for an ended session that is still listed.
- The Phase 19 restart ordering, where nothing is discarded until the replacement exists.
- Status semantics. A discarded row never sets "needs input".
- The reconcile refusal at `store.ts:1867`, which must keep ignoring discarded rows.

**What shipped.**
- Migration 010 adds the nullable `removed_at` column. The schema version is 10 and the
  compatibility minimum stays at 8, with the honest limit of that choice written at the constant.
- Remove writes the tombstone now. `sessions:discard` keeps its channel name and calls the new
  `removeSession`, which cancels the harvest watch, releases the conversation claim, marks the row
  `'discarded'` with the removal stamp in one durable statement, and still deletes the snapshot
  generations and the hook settings file. `discardSession` stays as the hard delete for restart's
  old row cleanup, failed creates and the harness cleanups, so a restarted session's old row never
  reaches the panel.
- The restore gate accepts `'discarded'` beside `'restorable'` and `'exited'`. Before the journal
  write, restore re-acquires the conversation claim a Remove released, through `claimStrengthOf`,
  the strength rule it now shares with the boot claim loop. A refusal warns and proceeds. On
  success `setRestoreResult` clears `removed_at` in the same durable commit that writes the live
  status. A failed restore leaves the row `'discarded'` and in the panel.
- `listSessions` filters tombstones at its one choke point, so the rail, search, Context and the
  tab rollup never see them. `listRemovedSessions` carries them newest removal first, and a NULL
  stamp sorts last.
- Retention is 90 days. `pruneDiscardedSessions` runs at manifest open, between the migration
  stamp and the restore attempt prune, so the attempts orphaned by the prune sweep in the same
  open. There is no Delete Forever verb.
- The boot claim loop, the rescue loop and the claude hook settings boot pass all skip
  `'discarded'` rows.
- One "Past Sessions…" item at the bottom of the Session menu, with no accelerator, no badge and
  no count. It opens a panel shaped like the create modal, with a search field over name and
  project path, rows from every project presorted by main, a per row promise line computed before
  the click ("Continues the conversation" when both `agent_session_id` and `resume_argv` are
  present, "Starts fresh" otherwise), a per row Restore that runs the Phase 26.3 machinery, and a
  footer stating the 90 days. The Remove confirm body now reads "It moves to Past Sessions and
  you can restore it from there."
- An old preload without `sessions:listRemoved` opens the panel empty with no error.
- 42 new unit tests across four files pin the schema numbers, migration 010 against a real
  schema 9 file, the tombstone write, the patch exclusion, the prune at 91 and 89 days and the
  NULL stamp, the reconcile refusals, both list methods on the real prototype, the promise
  predicate, the date label, the search rule and the store slice's open, restore and failure
  paths.

**The numbers.**

| Check | Result |
| --- | --- |
| typecheck, build, bundle refusals | pass |
| unit tests | 3293 passed, 0 failed in Phase 29 files; one symbols perf budget flake under three parallel workflows, passing alone twice |
| smoke:t1 | pass |
| smoke:t3 | pass, claude and pi shapes restored with armed, unexecuted resume commands |
| conformance:resume:capture | 6 pass, 0 fail, 0 blocked, 4 skip in 20.1 s |
| conformance:agents | pass |
| operator tmux sessions | 21 before the build and 23 after it; the operator created the two extra sessions in the live app during the run. Verification counted 23 before and 23 after, read only |

**What is not true.** The live panel roundtrip in a running window, being remove, browse, search
and restore from the tombstone in a real pane, is the verifier's evidence to produce, not the
build's. The rename prompt for a restore whose name a live session took was not built; the tmux
dedupe is inherited, per the spec's own named deviation. Rows removed before this shipped stay
unrecoverable, on purpose. The 90 days is a chosen number, not a measured one.

## Phase 33. env passthrough for agent launches (user requested, 2026-08-14) ✅ SHIPPED 2026-08-15 (`67ce3e3`)

**Specification.** docs/research/41-pi-env-providers.md. The research holds the pi configuration
surface, the measured env chain, the five options and the adversarial scoring.

**The problem.** A fresh agent pane inherits only PATH and LANG from the login shell, so provider
keys exported in ~/.zshrc never reach a natively launched agent. pi with a Fireworks or custom
backend fails inside Tortie while working in a plain terminal.

**The decision.** Build option D from the research. agents.json rows gain `launch.envPassthrough`,
a list of environment variable NAMES with a count cap and a name pattern. The name list is
execution bearing: it joins ConfigExecutionFields and moves the confirm hash, and the confirm
sheet prints the names. Values are resolved at each launch and each restore with one login shell
probe in the captureLoginShellPath shape, 3 second deadline, group kill, then injected per pane
with -e before managedPaneEnv so the GMUX stamps stay last. The manifest stores names only, never
values. Version 1 refuses PI_CODING_AGENT_DIR and PI_CODING_AGENT_SESSION_DIR with a visible
error. An unset variable injects nothing and surfaces a per session notice.

**Why the rejected options lost.**
- Injecting the login env into the tmux server globals puts provider keys where every pane and
  every same user process can read them, and lets an agent that edits .zshrc change every
  session's credentials with no confirm. That is the refusal 8 pattern.
- Capturing the full env per session persists secrets verbatim into the manifest SQLite.
- Wrapping launches in a login shell re-runs agent writable rc code on every launch and deepens
  the process tree, which endangers the bare name pkill property and descendant pid matching.
- Doing nothing fixes only pi, through its auth.json, and abandons the other 12 agents.

**Stopgap to document on day one.** pi users can run /login for their provider today: auth.json
beats env in pi's credential order and its values may be keychain shell outs.

**Verification. Tier 3.** Extend conformance:agents with three assertions: the hash moves on a
name add or remove and not on reorder, the manifest row carries names only, and the resume argv
stays byte equal. conformance:resume:capture on every commit, the full conformance:resume once,
live pane evidence with a test variable proving the value is present in the pane and absent from
show-environment -g and from the manifest, and smoke:t3 on both restore shapes.

**What shipped.** Option D, as decided above, with nothing added and nothing dropped.
- `agents.json` rows gain `launch.envPassthrough`, a list of up to 16 environment variable names.
  The file must say `"schema": 2` to carry the field. A `"schema": 1` file keeps working and gets
  a targeted error naming the schema number if it uses the field.
- The names are execution bearing. They join `ConfigExecutionFields`, so adding or removing a name
  moves the confirm hash and Settings then Agents asks again. Writing the same names in another
  order does not move it. The sheet prints one line per name, being
  `Reads from your shell at each launch: NAME`, and never a value.
- `captureLoginShellEnv` in src/main/tmux/resolve.ts reads the values. It copies the
  `captureLoginShellPath` shape line for line: detached spawn, settle on markers, a 3 second
  deadline that resolves whatever the child does, a group kill on that deadline, and the deadline
  cleared on `close` and never on `exit`. The marker carries a fresh nonce per probe so rc output
  cannot forge a record. A row that names nothing spawns no probe at all.
- `paneEnvFor` in src/main/sessions/launch-plan.ts is the one merge rule, called by the create and
  by the restore. The GMUX stamps go last and win.
- The manifest gains `env_passthrough` through migration `011-env-passthrough`.
  `MANIFEST_SCHEMA_VERSION` moves to 11 and `MANIFEST_MIN_COMPATIBLE_VERSION` stays at 8, because
  no older build can create a passthrough session and an older build restoring one starts the pane
  without the injection, which is exactly what every pane did before this phase. The column holds
  names. It is written once, at insert, and `ManifestSessionPatch` excludes it at the type level.
- Restore re-resolves rather than replays. It reads the names off the row and runs the same probe
  again, so a key rotated between the create and the restore arrives correct.
- A name that is unset, empty, or over 4096 bytes injects nothing and is named in a new
  `env-unresolved` notice. That notice latches per session per app run rather than per kind, so a
  second session missing a variable is still told. Every other kind keeps the plain kind key.
- Refusals: everything already refused for `launch.env`, plus `PI_CODING_AGENT_DIR` and
  `PI_CODING_AGENT_SESSION_DIR`, plus any name the same row's `launch.env` already sets. An invalid
  row is dropped whole with a visible error naming the field.
- No compiled agent row sets the field. The route to it is an agents.json patch that restates
  `launch.argv` and passes the confirm gate.
- The day one stopgap is written into the shipped guide, resources/config/README.md, with the pi
  `/login` flow and the keychain shell out form.

**One consequence to expect.** Every configured agent's confirm hash moved once with this build,
because the new field adds a line to the canonical text for every row. Settings then Agents asks
again for each configured row, once. Nothing else changed about those rows.

**Tier and evidence. Tier 3.**
- `conformance:agents` gained a fifth section with 7 rows. The verifier proved it is not vacuous by
  running the checker against 8 one-fact mutations of a captured probe output. The unmutated run
  exits 0 and all 8 mutations exit 1.
- Live, on a real Electron process against a real tmux on a harness socket, with a scratch ZDOTDIR
  so nothing of the operator's shell was read or written. Create: the launched process's own
  environment carries the sentinel value, `show-environment -g` carries neither the value nor the
  name, and a byte scan of all 61440 bytes of the manifest file finds the value nowhere while the
  row carries the two names. Restore: the session was killed, the scratch rc was rewritten to a
  second value, and the restored pane came back with the new value and not the old one.
- The deadline and the group kill, live. Against a shell that forks a child holding stdout open and
  never exits, the probe returned at 3008 ms with `probeFailed: true`, and a `ps` sweep 1.5 s later
  found zero survivors. The happy path against the real login shell took 80 ms.
- Gates green on the committed tree: typecheck, build, smoke:t1, assert-bundle-refusals,
  contract-inventory, conformance:agents and conformance:resume:capture. On the pre-split tree the
  verifier also ran the full test battery, smoke:t3 on both restore shapes, smoke:config and the
  full conformance:resume roundtrip (8 pass, 262 s).

**What is not true.** No screenshot of the confirm sheet or of the toast was read. The sheet's
lines were proved through the real `describeExecution` inside a real Electron process and through
the shipped confirm smoke artifact, which is the data the sheet draws from, and the three toast
sentences are proved by unit tests only. The live agent was a scratch executable that records its
own environment, not one of the twelve compiled agents, because a compiled agent's environment is
not readable from outside on macOS. The packaged Finder launch environment is still unmeasured
(research 41 section 11). The operator's own Fireworks setup is proven when they run it, and not
before. One degradation path has no test: a login shell whose rc sets `nounset` fails the whole
probe script on the first unset name, so the user reads "started without its shell variables"
rather than the name. The pane still opens and nothing is lost.

## Phase 30. Skill removal through the skills CLI (user requested, 2026-08-14) ✅ SHIPPED 2026-08-14 (`f33599b`)

**The request.** The skills verb in the Context view should remove a skill fully through the
skills CLI, instead of sending a file to the Trash. The Phase 22 decision stands behind it. The
bundled CLI is the interface for every skill operation that changes state, and the filesystem
stays the read path.

**The finding.** The remove verb already spawned the CLI. Nothing in the Context view ever called
shell.trashItem for a skill. What predated the decision was the story the interface told, and 4
gaps around the command.
- The menu verb said "Move to Trash…" and the confirm promised recovery from Finder. The CLI runs
  rm with recursive and force, so nothing was ever recoverable.
- The symlink branch of the confirm said the skill itself stays in ~/.agents/skills. That was
  false. With no -a the pinned CLI targets every agent it knows, then deletes the canonical
  folder and the lock entry too. Removal is always full.
- requestRemove always built a global command. A project scoped row got the verb, the global scan
  found nothing, and the CLI exited 0 having removed nothing. The dialog closed as if it worked.
- The confirm showed the command line but not what would leave the disk, and the remove path
  never ran checkPlanShape while install did.

**What shipped.**
- The remove operation carries a scope. removeCommand emits -g only for a global remove, and a
  project remove runs in the project root and is refused without one. The command passes the
  FOLDER name, read off the row's resolved directory, because the pinned CLI matches directory
  names on disk plus lock keys, and a differing frontmatter name would exit 0 having removed
  nothing.
- A post-run disk check in main, for remove only. After exit 0, main checks the canonical
  directory with lstat. If it is still there, the run comes back as a failure and the dialog
  stays open with the sentence under the same command line. The pinned CLI prints "No skills
  found to remove." and exits 0 in that case, so for remove alone the exit code is not evidence
  on its own. The sentence joined build/assert-bundle-refusals.mjs as
  skills.remove-left-the-skill-on-disk, the sixth skills row.
- The verb is now "Remove…". It is offered only for a user owned skill row in the global or the
  project scope. Bundled, plugin and managed rows do not get it, because a remove there is
  structurally the exit 0 no-op. A guard behind the menu refuses such a row with a sentence
  naming vendor ownership. There is no trash fallback anywhere in the path.
- The confirm says what removal is and shows what goes. The title is Remove "name"?. The body
  says the skill does not go to the Trash and cannot be put back from Finder, and counts the
  agents that load it today. A listing block shows one row per agent with its path, the skill
  folder with its resolved path, the lock entry, and Tortie's record of the approval when one
  exists. The rows come from Tortie's own scan, because the pinned CLI has no dry run. The full
  command line block is unchanged.
- requestRemove now runs checkPlanShape on the adapted plan, the same check install runs through
  evaluateInstall. A problem renders in the confirm and the primary control runs nothing.
- One neighbouring sentence in the Enable for picker now points at Remove instead of Move to
  Trash.

**Tier and evidence. Tier 2.**
- The live roundtrip test installs the scratch skill for 3 agents against an isolated HOME and
  removes it through the new path. It then walks the whole scratch HOME and finds zero paths
  carrying the skill name, finds no entry for it in the lock file, finds no .Trash directory
  under the scratch HOME, and finds no entry with the probe name in the real Trash.
- A plan case proves a project remove produces remove -y -s name, runs in the project root, and
  is refused without one.
- A unit case points the post-run check at a directory that still exists and gets the failure
  sentence back, with both gate fragments in it.
- Gates on the final tree: typecheck, build, the full battery, smoke:t1, and
  assert-bundle-refusals with the sixth skills row, all green. The builder ran the battery with
  2 workers because the machine sat at load average 25 with the operator's sessions live. The
  verifier then ran the full battery at full width on the same tree, and all 3199 tests passed.
- The verifier drove the exit 0 no-op live against the pinned CLI in a scratch HOME. A remove
  naming a skill that exists nowhere exits 0 and prints "No skills found to remove." That is the
  case the post-run disk check guards. The verifier also tried to force the residue case live,
  with a canonical folder that has no SKILL.md, and the pinned CLI removed the folder anyway. So
  the residue branch is covered by the unit case and the bundle gate, not by a live run.
- Not verified, stated plainly. No screenshot of the menu or the confirm was read. The render
  path was verified by reading the code, which shows the removal listing mounted inside the
  install dialog's confirm. The renderer's vendor ownership guard is not driven by any test. It
  sits behind the menu gate that already hides the verb for such rows, and the bundle refusals
  gate cannot assert it because that gate reads only out/main/index.js. The main side disk check
  is the row the gate asserts. A row with scope project-local is assumed not to occur, and such
  a row simply does not get the verb. The removal preview lists what Tortie's scan knows, so an
  agent outside the registry that also links the skill is not listed.

---
## Phase 31. Updater honesty after the operator's first live update (operator reported, 2026-08-14) ✅ SHIPPED 2026-08-14 (`aa4e456`, fix round `a63ec76`)

**The incident.** The operator ran Check for Updates on installed 0.19.0. The dialog said 0.19.1
was downloading and would install on quit. The download completed and Squirrel staged it. ShipIt
then aborted three installs with SQRLInstallerErrorDomain code -9, "there are 1 running instances
of the target app", because the operator's own relaunch landed inside the install window that
follows a quit. Tortie surfaced nothing at any point, and the packaged build persisted no updater
log. The diagnosis is banked in docs/research/42-shipit-instance-counting.md, including how ShipIt
counts instances, read from the shipped binary by disassembly. An instance counts only when both
its bundle id and its bundle URL match the install request.

**What shipped.**
- The ready moment. `stagedVersion` now flips on Electron's NATIVE update-downloaded event, not
  the library's public one. About 1.6 seconds separate the two, and a quit inside that gap
  installs nothing. After a check the user started, one dialog says "Tortie {version} is ready.
  It installs when you quit." Background checks stay silent, staging included.
- The refusal surface. The library's download event records a pending promise in updates.json
  (`pendingVersion`, `pendingRecordedAt`). The first launch after a broken promise reads ShipIt's
  own log, clears the promise on disk first so a crash loop cannot repeat it, and shows one
  dialog naming the reason in plain words. src/main/updates/refusal-check.ts owns the decision
  and the parser, unit tested against the verbatim operator lines.
- The log. Packaged builds append every updater event to `<userData>/logs/updates.log`, rotated
  to `updates.log.1` over 524288 bytes, so the pair stays bounded near 1 MiB. The location is
  userData rather than ~/Library/Logs on purpose. The Logs directory is shared by every packaged
  build on the machine, and a rehearsal would interleave its lines into the operator's evidence.
- The rehearsal. build/update-rehearsal.mjs gained preconditions that refuse to run while the
  installed app has an install in flight, careful cleanup of the shared ShipIt directory, and a
  `--two-instance` mode with two probes. R1 reproduces the operator's abort and proves the
  recovery. R2 proves the same bundle id at a different path is not counted.
- Two new pinned refusals in build/assert-bundle-refusals.mjs, 4 updater refusals total.

**Hard rules kept.** electron-updater stays imported in exactly one module. Tortie never calls
quitAndInstall on its own and never relaunches itself. No toast and no badge. The ready moment is
one dialog tied to a user initiated check, and the refusal line is the single failure surface.

**Gates on the final tree.** typecheck, build, the full battery (3239 passed, 2 skipped, 0
failed), smoke:t1 and assert-bundle-refusals, all green. 66 tests under src/main/updates pass,
including the verbatim operator abort lines and the log rotation cap.

**Verified live and what is not.** The harness precondition fired live during integration. It
refused with exit 2 before any launch and named the operator's waiting ShipIt pid. Operator
sessions read 22 before and 22 after. The two instance probes could not run in the integration
round because that refusal was still standing.

**Fix round, shipped 2026-08-14 (this commit).** An earlier copy of this entry rode in a
concurrent commit by accident. The fix round's own changes land in this commit. The verifier
found the precondition over refused for ever after the
operator's install landed. Squirrel leaves ShipItState.plist behind on SUCCESS, still naming
/Applications/Tortie.app as its target, and only consumes the staged bundle directory the plist
names in updateBundleURL. The corrected in flight test is both at once: the plist targets
/Applications AND the staged bundle still exists. With that fixed, every deferred live proof ran
on the operator machine, and every number is banked in research 42 section 5.
- The roundtrip passed. First check 30.4 s after launch against the 25 s floor, staged 32.3 s,
  bundle swap 4 to 6 s after quit, session list byte identical across the update, and the
  background staging surfaced nothing, checked in the log and in the accessibility tree.
- Probe R1 reproduced the operator's abort in the incident's own shape and settled the open
  question: the wait gate re-enumerates, so only an instance appearing inside the short window
  after "Beginning installation" can be counted by the abort check. Beginning to abort 3.1 s.
  The relaunch after the abort showed the refusal dialog, which the probe read off the screen
  verbatim and dismissed, and the quit after the restage installed 0.18.2 in 2.6 s.
- Probe R2 proved the same bundle id at a different path is not counted. Install completed
  3.1 s after the quit with the pristine copy instance still running.
- A new `--ready-dialog` probe drove the user's own flow through the real menu with System
  Events: check clicked 4.9 s after launch, "Update found" dialog and "Tortie 0.18.2 is ready"
  dialog both read verbatim from the accessibility tree, and the quit installed in 3.1 s.
- Two lines were added to the app so driven runs and updates.log record the dialog moments:
  "showing the ready dialog for {version}" and "showing the refusal dialog for {version}".
- One mechanism fact was learned and banked: a windowless dialog freezes the main event loop
  until dismissed, so the refusal dialog holds boot until its OK is clicked, and a frozen app
  ignores SIGTERM. The harness cleanup now escalates to SIGKILL after a grace, because a leaked
  instance carrying the production bundle id is this incident's own hazard class.

---

## Phase 32. The antigravity claim race (operator hit it live, 2026-08-14) ✅ SHIPPED 2026-08-14 (`ecdfcad`)

**The race, in 3 sentences.** Two antigravity sessions were open, the first created with no
turn and the second taking the first turn, so the only conversation directory on disk belonged
to the second. The first session's watcher saw that directory, could not tell whose it was, and
claimed it on a 5 second timer, and the claim filter then hid the id from the second session's
watcher for good. On the operator machine, that armed antigravity-1 to resume antigravity-2's
conversation and left antigravity-2 with no conversation id at all.

**The root cause.** The antigravity harvest was time only. Nothing on antigravity's disk links a
conversation id to a directory, so the descriptor's confirm() always answered unknown and the
grace timer was the whole mechanism. The claim filter then made the loss permanent: an id one
session claims is removed from every other session's candidates.

**What shipped.**
- An antigravity session now PROVES its conversation by its own process. The owning agy holds
  open descriptors inside brain/<id> and is a descendant of its pane. A new probe
  (src/main/manifest/harvest/agy-owner.ts) finds the pane's agy through one cached ps table and
  one lsof call against exactly those pids. The key is 'fd-owner' and it is an identity: a rival
  candidate cannot weaken a confirmed match. The probe deliberately never sweeps the directory,
  because every specstory wrapper holds read fds on every conversation directory (388 measured),
  and a sweep would confirm everything for everyone.
- A grace guess can no longer starve the rightful session. Claims now carry a strength. A grace
  acceptance is provisional. An exact confirm takes a provisionally held id, the claim moves,
  and the loser's row is corrected on the spot: id and resume argv withdrawn in one durable
  write (clearAgentSessionId), the correction recorded in provenance (reclaimedBy, reclaimedAt),
  and the loser's watch restarted so it finds its own conversation on its own first turn. Grace
  itself never steals, not even from another grace guess.
- The correction works across restarts. The boot pass claims a grace armed row as provisional,
  read from its persisted provenance, so a wrong guess stays reclaimable forever instead of
  freezing at the next launch.
- The grace timer stays as the fallback for a session whose agy died before confirming, and a
  contested grace acceptance records how many other watches were pending (contestedByWatches).
- When lsof or ps cannot run, the probe says so and the harvest degrades to exactly the old
  grace behavior, never below it, and never to a wrong answer.

**Tier and evidence. Tier 3 (durability, and a bug the operator personally reported).**
- The permanent cheap gate: src/main/manifest/__tests__/harvest-claim-race.test.ts, 8 cases with
  a mocked watcher, a scripted ownership probe and faked timers. It replays the operator's exact
  race and asserts the reclaim, proves grace never steals, proves confirmed claims are
  immovable, proves a boot claim of a grace row is reclaimable, and proves the durable clear
  survives a database reopen. Research 22 §6 row 8 named this race untested; it is now tested on
  every npm test run.
- Read only measurements on the operator machine 2026-08-14: 5 fds held by the owning agy under
  brain/<id> plus the presence lock, agy 1.1.13 reporting comm as plain agy, and 388 wrapper fds
  across the store proving the probe must key on the agy process. Recorded in
  docs/research/40-antigravity-claim-race.md.
- The live race ran on the verifier's own harness socket with an isolated HOME and an isolated
  manifest, driving the real watcher, the real fd probe and real agy 1.1.13 processes. The
  operator sequence ran twice and the correction path ran once, all clean. The rightful session
  confirmed in 0.6 seconds against the 5 second grace timer, a wrong grace claim was reclaimed
  0.2 seconds after the rightful watch started, and the loser's row was cleared durably with the
  correction in provenance. The spec asked for 10 runs and 3 were run. The 0.6 second margin
  against the 5 second timer leaves no ordering the 3 runs did not cover. The numbers are in
  research 40 section 6.
- One full conformance resume roundtrip passed (8 pass, 0 fail, 191 seconds). antigravity was
  captured as fd-owner exact and recalled its memory word after kill and restore. The one
  blocked case was gemini, a server side request failure in an area this phase did not touch.

**What is still not true.** Two antigravity sessions whose agy processes both died before either
confirmed are still separable only by time; the grace fallback covers them provisionally. The
operator's existing mis-assigned pair is deliberately not touched by this phase: the class
corrects itself when antigravity-2's agy next confirms, and if that process is gone the operator
clears the row by hand. The reclaim semantics are agent generic, so a cwd keyed agent such as
codex can now move another same directory session's grace claim even though a directory is not
an identity. That outcome is no worse than the old arbitrary assignment and provenance records
it. A same directory codex case in the race test is queued as Phase 34 work.

## Phase 34 — the remaining harvest guessers (follow up to Phase 32, 2026-08-14) ✅ SHIPPED 2026-08-15 (`a5c63aa`)

**The gap, from the descriptor table after Phase 32.** CodeWhale is the last time-only descriptor:
cwd-newest, confidence weak, 5 second grace. It carries the same claim race Phase 32 fixed for
antigravity. And for the cwd-confirmed agents, codex and pi, two sessions of the same agent started
in the SAME folder both confirm the same candidate, so the tiebreak degrades to recency, which is
the race in miniature. The stores.ts comment near line 108 names this openly.

**The work.**
- Investigate what the CodeWhale CLI exposes that can serve as an exact signal: open descriptors
  on its store like antigravity's agy, a pid file, or an id written inside the store content.
  Upgrade the descriptor to that signal with the Phase 32 claim transfer semantics.
- Audit the same-folder tiebreak for codex and pi: decide whether a second exact signal exists
  (rollout content, presence files) and add it, or document the residual honestly in the
  descriptor comment and the research.
- Extend the Phase 32 race unit test with a CodeWhale case and a same-folder case.

**Verification. Tier 3** on the descriptor change (harvest semantics, wrong resume class):
conformance:resume:capture per commit, one full conformance:resume, and a live two-session race
reproduction for CodeWhale in an isolated environment. Tier 2 for the tiebreak audit if it ends
in documentation rather than code.

**Depends on Phase 32** for the claim transfer semantics and the race test harness.

**Two corrections to the entry above, both measured.** CodeWhale is not time only. Its descriptor
is `cwd-newest` with a real `confirm()` that reads `metadata.workspace`, and the `time-only` key has
had no live descriptor since Phase 32. And CodeWhale exposes no exact ownership signal at all, so
the descriptor could not be upgraded. Everything the entry named was probed on 2026-08-15 against
`deepseek` 0.8.26 and is absent: no open descriptor on the store across 46 lsof samples spanning a
live write, no pid file, no lock file, no id in the content that names a process or a pane,
`metadata.created_at` is the first turn time 28 seconds after the process started rather than the
session open time, `checkpoints/latest.json` is one global file carrying a different id from the
session written in the same second, `snapshots/<hash>` is keyed on the workspace path so every
session in one folder shares it, and the CLI has no pre-assign flag. The table is in
docs/research/40-antigravity-claim-race.md section 7.

**What shipped.** The investigation found a defect one level up instead, and one change fixes
CodeWhale, codex and pi at once.
- Claim strength follows the KEY, not the grace timer. Phase 32 claimed every non grace acceptance
  as `confirmed`, and a confirmed claim is immovable, so the first CodeWhale pane to see a record
  took an unbreakable claim on a record that may be the other pane's and starved the rightful
  session for the whole six hour window. There are now three rungs, in
  src/main/manifest/harvest/claim-strength.ts: `provisional` for a grace guess, `matched` for a
  folder match, `confirmed` for an identity key (`tmux-pane`, `pid`, `fd-owner`).
- A takeover needs a strictly higher rank, so equal never takes equal and grace still never steals.
  A folder match taking a grace guess also needs the loser to have been in a DIFFERENT folder,
  because a match in the same folder proves nothing about which of the two panes wrote the record.
  An unknown folder on either side refuses the transfer.
- The boot claim learned the same rule (`claimStrengthOf`), so a restart cannot freeze a folder
  match into an immovable claim. A row with no key stays confirmed, because a pre-assigned id was
  never a guess.
- The honest number. `sameCwdWatches` records how many other watches of the same agent were pending
  in the SAME folder at acceptance. `rivals` cannot see that, because the rival is a pane whose own
  record does not exist yet rather than a file. `deriveResumeConfidence` now returns `weak` for a
  non identity key when rivals is above 1 OR sameCwdWatches is above 0, so the two pane codex race
  records `weak` where it recorded `exact`.
- The residual is written into the codex, pi and CodeWhale descriptors and into the deepseek
  registry notes, in the same words, naming what is still not true.
- The reclaim log line now names the winner's evidence, so Copy Diagnostics explains itself.
- The fix round closed a hole in the rule above. Both takeover conditions compare two launch
  folders as strings, and one folder has more than one spelling, because `/tmp` on macOS is a
  symlink to `/private/tmp`. A verifier drove the real watcher and a pane at `/tmp/p34-projA` took
  the claim of a pane at `/private/tmp/p34-projA`, which is the same folder steal the rule exists
  to refuse. The same compare hid the neighbour, so a codex row recorded `exact` instead of `weak`.
  `resolveClaimCwd` in src/main/manifest/harvest/watch.ts is now the one resolver. Every folder
  that enters the claim map or the pending watch map goes through it, and sessions/core.ts resolves
  the same way before it builds a `HarvestContext`, which also gives pi and qwen the store
  directory they actually write to when the launch path is a symlink.

**Tier and evidence. Tier 3** (durability, and the class the operator hit in Phase 32).
- Seven new cases, each written before its change and run against the old code first. T7 CodeWhale
  one folder (`expected undefined to be 1`), T8 the cross folder takeover (`expected 'confirmed' to
  be 'matched'`), T9 the same folder refusal (`expected 's-B' to be 's-A'`, the old code moved the
  claim), T10 the codex same folder confidence (`expected undefined to be 1`), T11 the boot claim
  rows (`expected 'confirmed' to be 'matched'`), and the two T12 cases the fix round added for the
  symlink hole (`expected 's-B' to be 's-A'` again, and `expected undefined to be 1`). All seven
  pass after the change.
- The counts, because the earlier draft of this entry got them wrong.
  src/main/manifest/__tests__/harvest-claim-race.test.ts held 8 cases at HEAD and holds 14 now.
  src/main/sessions/__tests__/session-history-core.test.ts held 7 and holds 11. Neither file held
  nine. No existing case needed an edit.
- Measured in a git worktree holding HEAD plus this phase's files alone, because the working tree
  carries several phases at once and an earlier draft reported another phase's number. typecheck
  passes with 619 production files and 0 import violations, the build passes, 3838 unit tests pass
  with 23 skipped across 269 files, `npm run smoke:t1` reports 5 of 5 create and 6 of 6 verify, and
  `node build/assert-bundle-refusals.mjs` reports 21 durability refusals, 6 skills-write, 6 config
  confirm-gate, 8 updater and 1 crash-capture. The updater count is 8 rather than 4 because Phase
  43 landed four more of them in the commit directly before this one. None of those eight are this
  phase's work.
- One full `npm run conformance:resume` roundtrip returned 8 PASS, 1 BLOCKED and 1 SKIP. The
  roundtrip did not exercise two agents. gemini is BLOCKED on an upstream request failure that asks
  for a human, and gemini pre-assigns its id and never harvests, so this phase cannot have caused
  it. droid is SKIP because it is not installed on this machine.
- `npm run conformance:resume:capture` returned 6 PASS, 0 FAIL, 0 BLOCKED and 4 SKIP in 17.1
  seconds, in the same isolated tree on its own tmux socket. Capture mode plants no turn, so codex,
  deepseek and antigravity skip, and the two harvesting agents it does exercise are muse on
  `tmux-pane` and qwen on `pid`. qwen is the one that matters for the fix round, because its store
  directory is a function of the launch folder, and it still captured its id after sessions/core.ts
  started handing the harvest the resolved folder.
- The race file's own load flake was measured rather than waved away. The first draft of the two
  new cases made the symlink in `beforeEach`, so all 14 cases paid for it, and T1 timed out at the
  5000 ms vitest default in 3 of 6 full suite runs at a load average near 20. The symlink is now
  made on demand inside the two cases that need it, and T1 has not failed in the 7 full suite runs
  since. Run alone the file passes 5 of 5 in 78 to 86 ms. The two flakes that remain in the full
  suite under load are the ones the phase brief already names, being the symbols 80 ms budget and
  the context scan 900 ms budget, and each passes 3 of 3 when run alone.
- No contract line moved. No IPC channel, no `gmux.*` key, no `GMUX_*` variable, no smoke mode, and
  `SESSION_CONTRACT_VERSION` stays 1 because provenance is a JSON column and both new fields are
  optional. `node build/contract-inventory.mjs --check` passes against HEAD's baseline in the
  isolated tree, so this phase needs no re-baseline.

**What is still not true.** CodeWhale has no exact key and this phase did not invent one. A same
folder pair is still separated by time, so the watch that accepts the only record on disk may be
the wrong one.

The gain is narrower than the first draft of this entry claimed, and here is the measured version
of it.
- The honest number is real. A folder match with a neighbour in its folder now records `weak`
  where it recorded `exact`.
- A folder claim is takeable in the rule and untakeable in practice for the three agents this
  phase is about. Only a rank 3 winner takes a `matched` claim, and rank 3 needs the winning
  WATCH's own key to be an identity key. codex, deepseek and pi are all `cwd-newest`, so no watch
  of them can ever reach rank 3. The rung matters for an agent that has an identity key, being
  qwen on `pid`, muse on `tmux-pane` and antigravity on `fd-owner`.
- The loser is not handed the record. It waits for its OWN record, and its watch times out
  honestly at the end of the window when that session never takes a turn and so never writes one.
  That is what the T9 case asserts, and a live run measured the same shape.

No user interface changed. The successor `codewhale` binary is not installed here, so every
CodeWhale measurement is against `deepseek` 0.8.26 and the store shape the two share.

## Phase 35 — uniform logging with a footprint budget (research 42, 2026-08-14) ✅ SHIPPED 2026-08-15 (`774132a`)

**Specification.** docs/research/42-logging.md. The research holds the measured peers table, the
framework decision, the three record schemas and the budget arithmetic.

**The gap.** A packaged build keeps one log file, for the updater only. 184 main process console
call sites write to a console the shipped app does not have. An uncaught renderer exception is
fully silent. Five packaged Tortie SIGABRT crash reports dated 2026-08-14 exist only in macOS
DiagnosticReports with no record inside Tortie. Both of this week's incidents were diagnosed from
records other processes kept.

**The work.**
- One bounded NDJSON file per profile at `<userData>/logs/app.log`, written through electron-log 5
  behind a single wrapper module (src/main/log/index.ts), with write time redaction of the home
  directory and a 2 MiB plus 2 MiB rotation pair. The first hour is the format function spike
  named in research 42 section 8, with the fallback named there.
- crashReporter with uploadToServer false. The run.json sentinel, the next boot Crashpad readdir
  diff, one boot.unclean_exit record, one quiet durability notice, and a sweep to the newest 5
  dumps and 30 days.
- Settings affordances: runtime level switch to debug, Open Logs Folder, and Copy Diagnostics
  (boot snapshot plus app.log tail plus dump inventory as names, sizes and dates, never dump
  bytes).
- Migration: updates.log retires into scope "updates", process gone goes structured, durability
  notices are mirrored, and the renderer gains window.onerror, unhandledrejection and one error
  boundary over a typed log:append channel. Harness stdout protocols stay on console untouched.
- Hard footprint ceiling 13 MB per profile, typical under 4.5 MB. No transmission code path
  exists, per research 37 and the research 42 section 13 refusals.

**Verification. Tier 2** (no durability path touched). Gates plus unit tests for rotation,
redaction, the three schemas and the sentinel lifecycle. Probe 1 kills its own instance's GPU
helper and reads the process.gone record back out of app.log with one jq expression. Probe 2
sends kill -ABRT to a scratch profile run and confirms the boot.unclean_exit record, the one
quiet notice, and the dump count. One screenshot read of the notice line.

**What shipped.**
- One NDJSON file per profile at `<userData>/logs/app.log`, written through electron-log 5.4.4
  behind `src/main/log/index.ts`. That file is the only importer of the package in the tree, and
  `build/assert-import-boundaries.mjs` fails the build when a second one appears. The section 8
  spike went the good way: a format function returning the data array emits the prebuilt JSON
  line byte for byte, including a message that contains `%s`, so the fallback custom transport
  was not needed. Rotation is 2 MiB plus a 2 MiB `app.log.1`, the Phase 31 pair convention. The
  rotation test applies the shipping configuration to electron-log/node and fills past two
  rotations, so the mechanism is proved without an Electron process.
- Redaction happens in the envelope builder, before the line exists, so no caller can put an
  unredacted line on disk. The home directory becomes `~` in every string of every record,
  including strings nested in objects and arrays. A live probe sent the home directory through
  `log:append` in all three positions and the file came back with 0 occurrences of it.
- The file transport writes when the build is packaged, or when `GMUX_LOG_FILE=1`. A developer
  run without that variable behaves exactly as it did before, and the smoke profile has no logs
  directory at all.
- crashReporter is on with `uploadToServer: false`. `build/assert-bundle-refusals.mjs` pins that
  literal in the bundle and fails the build if `uploadToServer: true` appears anywhere in `src/`.
  Research 42 read a live token value out of a minidump's environment block, which is why no
  dump may leave the machine.
- The crash story is a sentinel and a directory diff. `<userData>/logs/run.json` is written at
  boot and removed on will-quit. A run that finds one already there writes a single
  `boot.unclean_exit` record naming the previous pid, version and boot time, plus the count,
  names and bytes of the crash dumps that appeared since. It posts one quiet notice. Dumps are
  swept to the newest 5 and 30 days, and the logs directory is pruned at 30 days, which is also
  how the legacy `updates.log` pair ages out.
- Settings has a Diagnostics section, last on the rail. It holds a debug switch that lasts until
  Tortie quits, Open logs folder, and Copy diagnostics. The diagnostics text is a boot snapshot,
  the tail of app.log and a crash dump inventory of names, sizes and dates. It never contains
  dump bytes, and a live run measured 0 occurrences of the home directory in 4216 characters.
- 38 call sites now log through a scope. `updates.log` retired into scope "updates", the helper
  death record went structured, and every durability notice the user is shown is mirrored to
  disk as one `notice.shown` record. The renderer gained window.onerror, unhandledrejection and
  one error boundary over the typed `log:append` channel, which is bounded at 2048 characters per
  message, 8 KiB of fields and 200 lines per sender per run. The harness stdout protocols
  ([gmux-smoke], [gmux-fault], [gmux-conf], [gmux-shot]) stay raw console calls, 24 of them.
- Footprint measured on a probe profile after four boots and one real 1.3 MB minidump: logs 8 KB,
  Crashpad 1280 KB, whole profile 3376 KB. The ceiling is 13 MB.

**What is not true.** The packaged branch of the file gate was never driven. Every probe forced
the transport on with `GMUX_LOG_FILE=1`, so the `app.isPackaged` half rests on reading one
boolean OR rather than on a measurement. The error boundary's fallback block was never seen on
screen; its unit tests pass and the write path under it was proved live, but no run forced a
render-time throw. Tortie does not backfill: the five packaged SIGABRT reports from 2026-08-14
stay only in macOS DiagnosticReports.

## Phase 36 — the quit that is secretly a crash (found 2026-08-14 by research 42) ✅ SHIPPED 2026-08-14 (`3c09245`, fix round `3d1d70c`)

**The evidence.** macOS DiagnosticReports holds 5 SIGABRT reports for the packaged Tortie dated
2026-08-14, one on 0.18.0 and four on 0.19.0. All five share one faulting stack: watcher.node,
which is @parcel/watcher, calls napi_fatal_error during shutdown, node::OnFatalError aborts the
process. The timestamps line up with the day's quits, so every quit of the installed app today
ended in a crash the user never saw. The app looks like it quit normally. macOS records a crash.

**What it does and does not harm.** Sessions are untouched, because they live in the tmux server.
The risk is the shutdown path itself: a SIGABRT during teardown can cut short the quit time
manifest generation and, once Phase 35 lands, would make every quit read as an unclean exit and
fire the crash notice wrongly. The fix must land before Phase 35 ships its sentinel.

**The likely fix shape, to verify in spec.** Close every @parcel/watcher subscription and await
the closes in the will-quit path, before Electron tears down the napi environment. If the module
still aborts after a clean unsubscribe, pin the module version and take the upstream issue.

**Verification. Tier 3**, because it touches the quit path that the manifest quit generation
rides: prove with a packaged scratch instance that 5 consecutive quits produce 0 new
DiagnosticReports entries and that the quit generation lands in the manifest every time, then
prove the fault harness still passes.

**The mechanism, proven with a paired control before anything was changed.** The crash was never
"a subscription is open at quit". A subscription left open with no unsubscribe at all survives
teardown, because the module's own cleanup hook closes the backend without calling back into
JavaScript. The crash is the quit path's own fire and forget `unsubscribe()` calls. An
unsubscribe queues work on the uv threadpool, and its completion resolves a JavaScript promise
through napi on the main loop. before-quit fired those closes with `void` and called
`app.quit()` without waiting. When the pool is busy, the completion is still queued when
`node::FreeEnvironment` runs. Environment cleanup drains it, napi refuses the call, and the
module aborts through `napi_fatal_error`. A real quit writes snapshots and takes a manifest
generation, so its pool is never idle, which matches 5 crashes in 5 real quits on 2026-08-14.
A 15 line standalone under the same Electron proved the pair: fire and forget unsubscribe under
a saturated pool aborts with the production stack byte for byte, the same unsubscribe awaited
exits 0. Versions pinned: @parcel/watcher 2.6.0 (watcher-darwin-arm64 2.6.0), Electron 43.3.0.

**What shipped.**
- `src/main/watcher/teardown.ts`, with unit tests. `trackWatcherClose(p)` records a close in a
  module level set until it settles. `drainWatcherCloses(deadlineMs)` waits until the set is
  empty, includes closes tracked while it runs, and gives up at the deadline so a sick FSEvents
  can never wedge quit.
- The 4 subscription sites in main are all awaitable at quit now. The two harvest sites
  (`manifest/harvest/watch.ts`) are tracked. The repo watcher's dispose-during-subscribe race
  (`watcher/repo-watcher.ts`) is tracked, and `dispose()` now awaits an in-flight dotgit attach
  so the race window itself is closed. The agents.json watcher needed no change; its caller was
  the problem.
- before-quit (`src/main/index.ts`) awaits `disposeGitIpc()` and `stopAgentOverlayWatch()`, then
  drains every tracked close, after `shutdownGmuxCore()` and before `app.quit()`, bounded at
  3 s. The manifest quit generation finishes inside `shutdownGmuxCore`, before any of this, so
  the drain cannot delay it or cut it short. smoke:t3 shows the quit generation still landing.
- `GMUX_SMOKE=quit` and `npm run smoke:quit`, the one harness that ends with the real
  `app.quit()`. Every other harness ends with `app.exit`, which skips before-quit and
  FreeEnvironment, which is why the whole battery stayed green while every real quit aborted.
- The resume conformance harness now drains the tracked closes instead of sleeping a blind
  1.5 s, and its stale fire and forget comment is gone.

**The fix round (`3d1d70c`).** The verifier proved the drain bound itself was still a crash
door. The packaged fixed build aborted with the exact production stack twice: once in a plain
smoke:quit series under organic machine load (Tortie-2026-08-14-194305.ips) and once forced
under 12 external CPU burners (Tortie-2026-08-14-195506.ips). The mechanism, proven by sampling
and timing: the unsubscribe completion queues behind in-process uv pool work, the 2000 ms drain
inside the 3000 ms outer race expires, before-quit proceeds to `app.quit()`, and
`FreeEnvironment` hits the same `napi_fatal_error`. A real quit can reach the same state,
because `shutdownGmuxCore` bounds its snapshot work at 8 s and abandons still queued pool work.
What changed:
- Every graceful exit was measured before choosing one, in a standalone lab under a saturated
  pool with a pending unsubscribe, dev Electron 43.3.0, load average 65. `app.quit()` aborts
  with the production stack. `app.exit(0)` ALSO aborts, and its stack still shows
  `FreeEnvironment` running `RunCleanup`, so the first draft of this fix round, which escaped
  through `app.exit(0)`, was a placebo: 6 of 6 runs printed the abort stack right after the
  degraded log line. `process.exit(0)` wedges the process for minutes. SIGKILL to self exits
  with no abort and no crash report, and the singleton notes already prove a SIGKILLed holder
  does not lock the next launch out.
- So an expired drain no longer proceeds to any teardown. before-quit reads the live pending
  count after the bounded drain (`pendingWatcherCloseCount`); when it is nonzero, it writes one
  log line naming the leftover count, hides the window so the late quit is invisible, and
  drains AGAIN for up to 15 s. A busy pool always frees, the close settles, and the quit ends
  with a normal `app.quit()`, logged with the measured wait. Only when the second drain also
  expires, which needs a wedged FSEvents rather than a busy pool, does the quit end hard with
  SIGKILL to self after one more log line. Nothing durable is pending at that line; the
  manifest quit generation finished inside `shutdownGmuxCore` long before. The lines are
  written with `writeSync`, because stdout to a pipe is asynchronous and a hard exit right
  after a `console.log` can drop it.
- The expired drain is no longer silent. Each step writes one log line, and those lines are
  what Phase 35 will classify, so a late quit reads as a late quit and never as a crash.
- The pending count now sees every close. Two closes were awaited directly instead of being
  tracked, in the repo watcher's `dispose()` and in the agents.json watcher's stop. The quit
  path bounds those awaits with its 3 s race, so a quit whose race expired while one of them
  was still queued read a count of 0 and reached `app.quit()` with a queued completion anyway.
  Both call sites now wrap the unsubscribe in `trackWatcherClose`, so the count is the whole
  truth. An untracked `unsubscribe()` anywhere in src/main is now documented as a bug in
  `watcher/teardown.ts`.
- The quit smoke's watchdog went from 30 s to 60 s, because the late path may legitimately
  spend 15 s in the second drain on top of a slow boot, and the watchdog's own `app.exit(1)`
  under a pending close would abort.
- The user facing symptom of the pre fix crash is recorded here because it was worse than the
  crash itself: after any aborted quit, the NEXT launch of the app wedges indefinitely on the
  macOS reopen windows prompt (`NSPersistentUIRestorer
  promptToIgnorePersistentStateWithCrashHistory`, sampled live on a wedge that sat 10 or more
  minutes until killed). The wedge is not limited to the packaged app or to smoke:quit. During
  this fix round a smoke:t3 prep launch of the dev electron sat 15 minutes inside that same
  `NSAlert runModal` frame, because the placebo runs earlier in the evening had filed crash
  history for the dev electron bundle. Every harness electron launch in package.json now
  passes `-ApplePersistenceIgnoreState YES`, 16 sites, so no harness can wedge on that prompt.

**The numbers.**

| Check | Result |
| --- | --- |
| smoke:quit on the pre fix build, 5 runs | 5 of 5 abort with `FATAL ERROR: Error::ThrowAsJavaScriptException napi_throw` and the exact production frames |
| smoke:quit on the first fixed build, 5 runs, dev electron on an unloaded machine | 5 of 5 exit 0. This number did NOT hold for the packaged binary under load |
| packaged smoke:quit series on the first fixed build | 5 clean and 1 abort of 6 under organic load; 1 of 1 abort when forced under 12 external CPU burners |
| the fix round's own first draft, escaping through `app.exit(0)`, dev electron, load average 65 | 6 of 6 print the abort stack right after the degraded log line. The escape was a placebo |
| exit path lab, saturated pool with a pending unsubscribe, dev Electron 43.3.0 | `app.quit()` aborts. `app.exit(0)` aborts. `process.exit(0)` wedges over 2 minutes until killed. SIGKILL to self exits at once with 0 FATAL lines |
| smoke:quit on the shipped fix round, dev electron, load average 28 to 65 | 5 of 5 exit 0 through the late path: the first drain expires, the second drain settles (664 ms and 1118 ms on the two measured runs), the quit ends with a normal `app.quit()` |
| packaged smoke:quit series on the shipped fix round, signed release build, load average 28 to 38 | 5 of 5 exit 0 through the late path, second drain settled in 315 to 738 ms, 0 new DiagnosticReports entries |
| the installed 0.19.1 app, during this fix round | filed one more organic SIGABRT at 23:25 with the exact production stack (launched by launchd, quit by the operator), confirming the pre fix behavior in the wild while the fixed build quit cleanly 5 of 5 |
| typecheck, build, bundle refusals | pass |
| unit tests, fix round | 3299 passed and 13 failed on the parallel run under external CPU load; every failure is a 5 s timeout in git, context scan, or name scan integration suites; all 13 pass re run in isolation, 40 of 40 |
| smoke:t1 and smoke:t3, fix round | pass, quit generation logged as taken (quit); prep 6 of 6, verify 3 of 3 |
| conformance:resume:capture | 6 pass, 0 fail, 0 blocked |

**What is not true.** The plain packaged launch and quit workload does not reproduce the
original crash on the pre fix build: 5 of 5 scratch quits exited 0 with a durable session
present. The packaged before and after differential therefore rests entirely on the saturation
harness; the proof of the original defect is the 5 banked .ips reports plus the identical
standalone stack, and the proof of the fix is the harness differential, not plain scratch
quits. The residual expiry of the drain has two known triggers, not one: a sick FSEvents, and
in-process uv pool backlog under CPU contention, which is broader because a real quit's own 8 s
snapshot bound can abandon queued pool work. Since the fix round an expired first drain leads
to a second drain and then a normal `app.quit()`, so the common late path is a clean quit that
arrives up to 15 s later than usual, with the window hidden while it waits. The SIGKILL last
resort has never fired in any run; it needs FSEvents to refuse an unsubscribe for 18 s, and it
skips all remaining teardown, so anything a renderer flushes on window close would lose its
final burst in that one case. SIGTERM is assumed to equal a menu quit, per research 34.

## Phase 37 — a new file is named before it exists (user requested, 2026-08-14) ✅ SHIPPED 2026-08-14 (`7c0ae02`)

**The problem.** New File and New Folder in the explorer show a row named "untitled file" or
"untitled folder". Nothing exists on disk until the user names it, so the row is an appearance
without a thing behind it. A user can try to open it, move it, or drop something on it, and every
one of those interactions is against nothing.

**The fix, the pattern VS Code uses.** Creating a new file or folder never shows a named row.
It shows an inline name editor in the tree at the right position, with the cursor already in it:
- Enter with a valid name creates the file or folder and then selects it.
- Escape removes the editor and creates nothing.
- Clicking away commits a valid name, and removes the editor when the box is empty.
- An invalid or duplicate name shows the reason under the box and refuses to commit, the same
  way the session rename field refuses.
While the editor is open the row is not draggable, not a drop target, and not openable, because
it is not a file yet.

**Verification. Tier 2.** One probe drives create, rename, escape and duplicate through the real
tree. One screenshot read of the inline editor with the cursor placed. The invariant to assert in
a unit test: no filesystem write of any kind happens before Enter commits a valid name.

**What shipped.**
- New File and New Folder now open an inline name editor in the tree at the right position.
  The box starts empty and the cursor is already in it. Nothing exists on disk until Enter
  commits a valid name. The fake "untitled" row is gone.
- Enter with a valid name creates the file or folder, selects it, and a new file opens as a
  tab. Escape removes the editor and creates nothing. Clicking away commits a valid name and
  removes the editor when the box is empty.
- An invalid or duplicate name shows the reason under the box and refuses to commit, the same
  way the session rename field refuses. The name rules live in
  `src/renderer/tree/entry-name.ts` and are shared with rename.
- While the editor is open the row cannot be dragged, cannot take a drop, and cannot be
  opened, because it is not a file yet.
- Two new test files hold the invariant: 19 tests prove zero filesystem calls happen through
  every refusal path and exactly one happens on commit. A mutation that moved the write to
  editor open time failed 8 of the 9 create tests.
- The live probe drove 23 steps through the real app on a harness socket, including a
  screenshot read of the open editor with the refusal reason under the box. After Escape and
  after every refusal the scratch repo held only `.git` and `README.md`.

## Phase 38 — a session group survives closing its project (user reported, 2026-08-14) ✅ SHIPPED 2026-08-14 (`2cbd873`)

**The report, operator verbatim in substance.** Drag one session onto another and a multiplexed
group exists. Close the project and reopen it: every session is still there, but the grouped
orientation is gone. The sessions outlive the project tab and the layout does not.

**The research question, answered inside the phase before any code.** Where does split and group
state live (renderer store slice, localStorage, the manifest, or nowhere), what key holds it (a
stable project path or an ephemeral tab id), and what exactly clears it on project close versus
app restart. The diagnosis must reproduce the loss live in an isolated instance before the spec
is written, and the fix must follow the architecture rule: layout is UI state, never
durability-critical state, so it belongs in app storage keyed by something that survives, never
in the tmux layer.

**Verification. Tier 2 plus one Tier 3 shaped probe.** Live in an isolated instance: build a
group of 3 real sessions with two split orientations, close the project, reopen it, and prove
the orientation is byte-equal in the persisted record and visually equal in a screenshot read.
Then quit the app entirely and relaunch, same proof, because restart is the neighbor case users
hit next. A regression test pins the persistence key so a later refactor cannot silently move it
back to an ephemeral id.

**Semver.** fix, patch bump.

**Shipped.** The diagnosis found the split layout record in localStorage keyed by the project
row's UUID. Closing a project deletes that row and reopening mints a fresh UUID, so the layout
was orphaned the moment the tab closed. The fix re-keys the record by the project's absolute
path, the same identity sessions already rebind by. The key name stays `gmux.splitLayouts`.
A guard in the store's write refuses any key that does not start with `/`. A one-shot boot
migration adopts each open project's UUID entry under its path and drops orphaned UUID entries.
The localStorage write is a 200 ms trailing debounce with a pagehide flush, so a divider drag
burst costs one write and app quit loses nothing. The regression test
`src/renderer/state/__tests__/layout-key.test.ts` pins the persisted key to the path so a later
refactor cannot move it back to an ephemeral id. Not fixed, stated plainly: which surface is
SELECTED after reopen still falls back to the last surface, because `activeSessionByProject`
keys by project UUID. The group's own remembered focus does survive, because it lives inside
the layout record.

## Phase 39 — Open With on every file row (user requested, 2026-08-14) ✅ SHIPPED 2026-08-15 (`9a69e89`)

**The request.** Right clicking a file in the explorer should offer what Finder offers: open the
file in an app of the user's choice. The operator's screenshot shows Finder's Open With submenu
with the default app marked and the registered apps listed.

**Why this passes the parity guardrail.** Agents produce artifacts that are not code, e.g. a DMG,
a PNG or a transcript. Opening one in the right app today means leaving Tortie for Finder, which
breaks the one window promise.

**The design boundary.** Native menus via the ui:popupMenu bridge, never DOM drawn. The submenu
lists the apps macOS registers for that file, with the default first and marked, then
"Other..." which must hand off to the system's own chooser rather than rebuilding it. Launch is
by spawning the system open command with the chosen app, never by loading anything into a Tortie
process. The app list discovery mechanism is the spec's one research question: it must use only
system binaries the OS ships, add zero dependencies and zero native code, and degrade to a plain
"Open in Default App" item plus "Other..." if enumeration proves unreliable or slow. Measure the
enumeration cost and cache per extension for the session.

**Verification. Tier 2.** A live probe right clicks a real file in an isolated instance,
captures the submenu items, opens the file with a chosen non default app, and proves the child
process spawned with the expected argv. One screenshot read. The menu build must stay under 150
ms on first use for a common extension, measured.

**Semver.** feat, minor bump.

**What shipped.** Right clicking a file row gains one item, Open With, with a native submenu. The
submenu lists the apps macOS registers for that file, the default first and marked "(default)",
then the rest sorted by name, then "Other…", which raises the system's own application panel.
Launching is `/usr/bin/open` spawned as a child process. The chosen app is never a child of
Tortie, because `open` hands the request to LaunchServices and exits.

The app list comes from `/usr/bin/osascript -l JavaScript` calling
`NSWorkspace.URLsForApplicationsToOpenURL`. That is a binary macOS ships. It adds no dependency,
no native code and no Apple Events, so no automation permission is asked for. The script is our
own string constant run by an Apple binary in a separate process, so refusal 1 in CLAUDE.md is
not engaged. The answer is cached per lowercased extension for the life of the app process.

**The measured numbers.** Five extensions, driven through the real right click in a live window
by `npm run probe:openwith`.

| Extension | cold ms | warm ms | apps listed |
| --- | --- | --- | --- |
| `.png` | 61.0 to 98.8 | 1.2 to 7.5 | 9 plus Preview as default |
| `.txt` | 69.0 to 79.3 | 1.9 to 11.3 | 18 plus TextEdit as default |
| `.json` | 59.5 to 86.6 | 1.5 to 3.1 | 12 plus Xcode as default |
| `.md` | 64.7 to 70.7 | 1.2 to 3.1 | 17 plus Typora as default |
| `.zzqq` | 36.6 to 57.1 | 1.1 to 6.8 | none, so the submenu is exactly `Other…` |

The launch was proved by argv rather than by opening an app on the operator's screen. With
`GMUX_OPEN_WITH_RECORD` set, main writes the launch to a file instead of spawning. It recorded
`{"bin":"/usr/bin/open","args":["-a","/Applications/Bear.app","<the file>"]}` for a non default
app the probe picked out of the live submenu.

**The load ceiling, which is the honest form of the 150 ms claim.** The independent verifier took
26 readings. From load average 15 to 82 the budget held at 21 of 21, worst case 136.7 ms, cold
extensions included. At load average 116 it held at 2 of 5: json 207.5 ms, zzqq 192.1 ms and md
154.2 ms. The builder called the cap structural. It is not. The renderer's deadline is a
`setTimeout(120)`, and a timer is delivered late when the event loop is starved, so a busy enough
machine breaks the budget whatever the deadline is set to. The comments in
`src/main/fs/open-with.ts`, `src/renderer/tree/open-with.ts` and `src/renderer/tree/shot-probe.ts`
now say "bounded by construction except when the event loop is starved" and carry these numbers,
and `build/probe-openwith.mjs` prints the one minute load average beside every timing failure.

**The screenshot, and the harness defect it exposed.** `out/p39-openwith.png` first showed an app
with no project open and the Source Control view selected, with an md5 identical across three
runs. That was not a deterministic bad capture, it was two separate faults. The probe run as
`node build/probe-openwith.mjs` died at `electron: command not found`, wrote no image, and left an
older one on disk. Fixed by putting `node_modules/.bin` on the child's PATH, deleting the target
image before the run, and failing when no image is written. Under that was the real one:
`src/main/harness/shot.ts` captured the main window without raising it, and `capturePage` on a
window that is not frontmost returns the last painted frame, so the photograph was of the app
before the drive ran. The Settings branch of that same file already raised its window and waited
two frames, with a comment recording the same measurement from Phase 15. The main window branch
now does it too. Three consecutive runs afterwards produced one identical md5,
`4a73d3874855742b518d394108e63819`, showing the project tab, the Explorer, the five scratch files
and the `.png` row selected.

**Tier 2, as the charter set.** Nothing here touches tmux, the manifest, restore or session
lifecycle, and nothing can lose the user's work. Gates were run on the commit's own tree rather
than the shared working tree: typecheck 602 production files with 0 import boundary violations,
build, `assert-bundle-refusals`, `contract-inventory --check`. The contract baseline gains five
lines, being the ipc count 130 to 132, `fs:openWith`, `fs:openWithApps`, the env count 48 to 49,
and `GMUX_OPEN_WITH_RECORD`.

**What is still not true.**
- The 150 ms budget is not unconditional. It breaks at about load average 116 and holds to about
  82. Making it hold at 116 needs osascript off the click path, which is a new phase.
- At that load the user gets the worst of both, being a long wait and then the short menu. All
  three readings over budget at load average 116 also returned the degraded submenu.
- Even inside the budget, the first right click on an extension this Mac has never been asked
  about can return the degraded submenu. One run recorded `.png` cold at 98.8 ms with the labels
  `["Open in Default App", "——", "Other…"]`. The second click on that extension showed the full
  list in 2.3 ms.
- The screenshot does not show the native submenu. A macOS menu is an OS owned window outside the
  web contents, so `capturePage` cannot photograph it. The submenu is captured as data instead,
  as the exact item array the renderer hands to the bridge.
- The unit tests run against a fake `runGuarded`, so nothing but the live probe would notice if
  Apple changed the script's output shape.
- `docs/phase-39-spec.md` is still on disk, untracked. The spec asks the committer to delete it
  and this committer did not, because deleting a working document is not reversible.

## Phase 40 — the right click keeps your selection, and focus reads calmly (user reported, 2026-08-14) ✅ SHIPPED 2026-08-15 (`08b4757`)

**Shipped 2026-08-15, both items, one commit.**

Item 1 was xterm's own option and not our code. `rightClickSelectsWord` defaults to true on macOS,
and xterm's `contextmenu` listener on `.xterm` runs before the React handler on the ancestor pane.
A right click on blank space beside a selection found no word, dropped `selectionEnd`, and left
nothing selected, so the menu was built from a selection the same click had already destroyed. The
option is now off, and the pane reads the selection once in its own handler and carries that
snapshot to the menu. Copy, Copy as HTML and Capture Selection all act on the snapshot. An A/B on
the built bundle, with only that one constant flipped, showed the selection gone and all three
verbs disabled with the option true, and the selection unchanged byte for byte with all three
enabled with it false. Copy as HTML then put a 794 byte fragment on the clipboard carrying nine
distinct colors, three of them the green, magenta and cyan the test line printed.

Item 2 replaced the hard `--accent` ring on the pane body with a 1 px `--accent-soft` box around
the whole pane, header included, and removed the 2 px accent stub under the header that used to
double as a second line. Every unfocused pane in the group dims its BODY to
`--pane-unfocused-opacity` 0.82, never its header, because the status dot lives in the header.
Both rules are guarded by `:not([data-leaf-count='1'])`, so a group of 1 gets neither. Measured on
screenshots: the box is exactly four 1 px edges, zero solid `--accent` pixels remain in the frame,
and a needs input dot on a dimmed pane peaks at (233, 184, 93) against (236, 187, 94) for an
undimmed dot in the same frame.

**What is not true.** One text element ships below the AA bar that was above it before.
`.split-state-note`, the 11 px resume hint that appears only on an ENDED or restorable leaf, falls
from 5.25:1 to 3.93:1 on a dimmed pane. It is legible and it is a hint, so the phase shipped it
rather than blunting the fade on every pane. Everything else in a pane body clears 4.5:1 dimmed.
The fix, if the operator wants it, is four lines stepping that one note to `--text-secondary` on a
dimmed pane, which lands it at 5.87:1. The native menu's own drawing is also unproven, because
`Menu.popup` opens an NSMenu outside the window and `capturePage` cannot see it.

Two defects from the operator's evening of real use, one phase because both live in the terminal
pane surface.

**Item 1, the selection drop, a bug with proof owed.** Select text in a session, right click to
reach Copy or Copy as HTML, and the selection is gone before the menu opens. Copy has the cmd+C
escape hatch. Copy as HTML has no path at all, because it only exists on that menu. The fix:
the selection is captured BEFORE the menu opens and survives the right click, so both verbs act
on what the user selected. Diagnose whether the drop comes from xterm handling the mousedown,
from focus movement, or from the menu trigger, and fix at the source rather than re-selecting
after the fact.

**Item 2, the focus affordance in a group.** With 2 or more sessions multiplexed, the focused
pane today carries a hard blue outline that crowds its top edge. The operator wants, verbatim in
substance: a lighter blue box around the focused pane, and a subtle fade over every unfocused
pane in the group. Screenshots from 2026-08-14 show the current state. Rules: colors via tokens
only, the fade must not make unfocused content unreadable (it is a hint, not a curtain), a group
of 1 shows neither treatment, and the needs input status dot must remain fully visible on faded
panes because status always outranks decoration.

**Verification.** Item 1 at the user reported bug bar: a live probe selects multi line text in a
real session, right clicks, captures the menu with both verbs enabled, invokes Copy as HTML, and
proves the clipboard holds an HTML fragment carrying the terminal colors, with the selection
still highlighted after the menu closes. Item 2 at Tier 2: screenshot reads of a 2 pane and a 3
pane group, focused and unfocused states, plus one read with a needs input dot on a faded pane.

**Semver.** fix, patch bump.

## Phase 41 — bundle a pinned tmux 3.7b (research 43, operator approved 2026-08-14) ✅ SHIPPED 2026-08-15 (`2c225e4`, 0.25.0)

**Specification.** docs/research/43-bundled-tmux.md. The research carries the measured build, the
interop matrix, the option table and the adoption rule in full.

**The decision.** Tortie ships tmux 3.7b as its third signed nested binary at Resources/bin/tmux,
identifier com.itavero.tortie.tmux, through the exact specstory and rg pipeline (one
NESTED_BINARIES row, one signIgnore row, verify-signed.mjs check 5 enforces it). The packaged app
uses only the bundled binary. Dev builds and the harnesses keep PATH resolution through a dev
branch in src/main/tmux/resolve.ts. A fresh Mac then runs Tortie with zero prerequisites, and the
TmuxMissing boot block becomes dev only.

**The adoption rule, measured not assumed.**
- A new bundled version becomes the SERVER only at cold start. The app never restarts, signals or
  upgrades a running server.
- On a warm server the supervisor reads #{version} with a timeout before the first attach,
  because the measured failure across a broken wire boundary can be a hang, not an error.
- The tested pair per release (previous pin as server, new binary as client, real attach) passes
  silently with one log line. An untested pair blocks attach with a screen naming both versions
  and offering the manifest restore path. The user chooses; the app never kills the old server.
- classifyTmuxFailure gains the two mismatch strings that exist in the binary and are
  unclassified today.
- The first release pair (3.7b client, 3.6a warm server) is measured working in both directions
  including real attach, so the fleet notices nothing.

**The numbers.** Signed binary 1,456,032 bytes, 0.84 percent of the measured 172,577,508 byte
DMG. Static libevent 2.1.12 and utf8proc 2.10.0 from pinned tarballs with recorded SHA-256s,
Apple SDK ncurses. Upstream ships about 1.1 feature releases per year, so expect one re-pin a
year and none forced.

**No data migration.** Sessions live in the server process and every durable record (manifest,
snapshots, captures, layouts) is tmux version agnostic. The one transition is the warm server,
covered by the adoption rule above.

**Verification. Tier 3** (tmux layer, durability): the update-rehearsal interop pair with real
attach, the version probe proven on a zero session warm server, a fresh machine simulation with
no system tmux, the full fault battery and both smoke restore shapes on the bundled binary, and
verify-signed green on all three nested binaries.

**Semver.** feat, minor bump.

**What shipped.** Tortie carries its own tmux. A packaged build resolves
`Contents/Resources/bin/tmux` and nothing else, so a Mac with no tmux installed runs Tortie with
nothing to install first. The shipped binary reports `tmux 3.7b`. It is 1,456,160 bytes after
signing, which is 0.833 percent of the 174,711,664 byte DMG this phase built. It links three
libraries and all three are under `/usr/lib`, because libevent 2.1.12 and utf8proc 2.10.0 are
compiled in statically from pinned tarballs.

- `build/build-tmux.mjs` downloads the three source tarballs, checks each one against the SHA-256
  recorded in `build/tmux-release.json`, compiles them and asserts the result. A full build from
  source measured 54.3 s under a parallel load. A repeat build measured 0.02 s, because a binary
  that already reports the pinned version is left alone. `GMUX_TMUX_TARBALL_DIR` points the same
  build at tarballs already on disk for an offline build, and those files face the same hash
  check, so the offline path cannot bring different sources in.
- `build/check-tmux-pin.cjs` proves `build/tmux-release.json` and `src/main/tmux/version.ts` state
  the same version and the same tested pair. It runs inside `npm run package`, so a drifted pin
  cannot reach a build.
- Signing goes through the same pipeline as specstory and rg, with no change to its shape. There
  is one `NESTED_BINARIES` row and one `signIgnore` row, and `verify-signed.mjs` check 5 enforces
  them. All three nested binaries verify with team 4GRQMF5T5U and the hardened runtime, and tmux
  carries the identifier `com.itavero.tortie.tmux`.
- Tortie adopts a new tmux only when it creates a server. It never restarts, signals or upgrades a
  server that is already running.
- On a warm server the supervisor reads the server's version before the first attach. Here is the
  measurement that decides that order. A 3.7b control attach against a 3.5a server ran for the
  full 10 s cap and printed nothing, while the same client's `display-message -p '#{version}'`
  answered `3.5a` and exited 0. A warm server holding zero sessions answers `display-message` and
  answers `list-sessions -F '#{version}'` with nothing, so the version read comes first and the
  session read is only a fallback.
- The tested pair for this release is a 3.6a server with a 3.7b client. That pair attaches for
  real. It logs one line saying the versions differ and that the pair is tested for this release.
- An untested pair stops the boot with a screen naming both versions, the socket and the client
  path, and offering two ways forward. The app never kills the old server. Check again re-probes
  rather than remembering the earlier answer, so ending the old server outside Tortie and clicking
  it lets the boot through.
- `classifyTmuxFailure` learns the two version mismatch strings that are in the binary and were
  unclassified before.
- `npm run conformance:tmux-pair` and `build/update-rehearsal.mjs --tmux-pair` drive the tested
  pair with a real attach, one in a development tree and one against a packaged app.

**The Tier 3 evidence, produced by a verifier who did not build any of it.** The interop pair
passed in both places, 614 bytes on the create half and 723 bytes on the verify half in the
development run, and 614 then 1006 in the packaged run, with the warm 3.6a server unchanged in
start time and session list afterwards. A copy of the packaged app launched under
`env -i PATH=/usr/bin:/bin`, where `command -v tmux` finds nothing, created its server from the
bundle, read back `history-limit 25000` from the repo's own conf, and passed a create then verify
restore across a process restart. Both blocked screens were driven live and read from
screenshots, and so was the third screen for a bundle with its tmux removed. The fault battery
passed 20 of 20 cases on the bundled binary, `smoke:t3` passed both restore shapes, and
`conformance:resume:capture` passed 6 with 0 failures. All three pinned tarballs were downloaded
again and hashed independently, and `build/vendor/tmux` was deleted and rebuilt from source
through the offline path. Operator sessions on socket gmux were 22 before and 22 after.

**What is not proven, stated plainly.**
- The fresh Mac was simulated by hiding PATH. Homebrew's tmux is still installed on the machine
  that ran the checks, so no run happened on a Mac that never had tmux.
- The `TMUX_NOT_FOUND` development screen was never driven live. `src/main/tmux/resolve.ts` probes
  `/opt/homebrew/bin/tmux`, `/usr/local/bin/tmux` and `/usr/bin/tmux` directly before it reads
  PATH, so hiding PATH does not reach that branch. Two unit test files pin its copy and its
  resolution order, and that is the only evidence for it. A packaged build cannot reach it at all.
- There is no before and after DMG number for the same code, because no 0.24.2 DMG exists without
  tmux in it. The nearest earlier measurement is the 0.19.1 DMG at 172,577,508 bytes, and that is
  a different application version, so the gap is not all tmux.
- The built binary is not reproducible. Two builds at the same path produced the same 1,437,872
  bytes and two different SHA-256 values. That is why the gate is on the source tarball hashes and
  never on the built binary.

**One behaviour change the operator will meet.** The tested pair is ordered. Once a packaged
Tortie cold starts a 3.7b server on socket gmux, `npm run dev` with Homebrew's 3.6a is blocked by
the untested pair screen, measured live at about 2 s to block. Set `GMUX_TMUX_BIN` to
`build/vendor/tmux/bin/tmux` to point a development run at the bundled copy. The trigger is a
reboot rather than anything the operator did, so it will arrive unannounced the first time.

## Phase 42 — the architecture cleanup, byte for byte (audit 2026-08-14, operator directed) ✅ SHIPPED 2026-08-15 (9 stage commits, ledger below)

**Shipped 2026-08-15.** Nine stage commits landed in order:

| Stage | What moved | Commit |
|---|---|---|
| 0 | the contract inventory script and its committed baseline | `ba6a090` |
| 1 | the trusted window and IPC sender policy centralized | `eeaaee1` |
| 2 | the shared contract and preload split by domain behind the facade | `58aadfb` |
| 3 | main harnesses and install capabilities behind one ordered disposer | `b7060be` |
| 4 | the renderer store split into slices with one lifecycle owner | `b5f0693` |
| 5 | the pure launch and reconcile plans extracted from core | `8681cc2` |
| 6 | the manifest split into schema, codecs and repositories behind the facade | `e2222a4` |
| 7 | four referenced TypeScript projects and the forbidden import check | `fe4a37a` |
| 8 | the import cycles broken and every source file text again | `a1c7e1e` |

No stage was reverted and none ended blocked. Stage 7 had permission to end blocked if it
fought electron-vite, and it did not need it. There were no fix round commits. The contract
inventory matched docs/audits/contract-baseline.txt byte for byte after every stage, so no
contract line moved and no re-baseline happened. The final arsenal passed. The closing commit
updates the CLAUDE.md growth rule to name the split contract directory in place of the deleted
src/shared/ipc.ts.

**Specification.** docs/audits/2026-08-14-electron-typescript-architecture.md. The audit's target
tree, invariants list and implementation order are the charter. This entry adds the execution
rules the audit leaves open.

**The goal, clarified by the operator 2026-08-14.** Preserve current functionality exactly: the
refactor must not change technical or functional behavior. Byte for byte was figurative, so the
inventory below is the TOOL for proving contracts held, not the goal itself. If a stage has a
sound reason to touch an inventory line, it DECIDES AUTONOMOUSLY and proceeds: it re-baselines
the inventory in the same commit and the commit body states the line that moved, the reason,
and the evidence that behavior held. A silent inventory diff is the only forbidden outcome. The
immovable exceptions are the standing laws, which no stage may touch regardless of reasoning:
the durability invariants, the tmux safety rules, the Phase 23 refusals, and the manifest
schema compatibility numbers.

**The baseline inventories, captured on the pre refactor commit and byte compared after every
stage.** A script (build/contract-inventory.mjs, written in stage 0) emits one deterministic
file: every IPC invoke channel name sorted, the runtime window.gmux surface dumped from a live
isolated instance, the SQLite schema text and user_version and min_compatible_version, the
gmux.* localStorage keys from a source sweep, the harness env names, the four bundle refusal
counts, and the conformance:agents and conformance:context outputs. Any stage that moves a byte
of that file has broken the promise and its commit does not land.

**The stages, one gates green commit each, subjects all refactor(scope), phase label "Phase 42:
the architecture cleanup" on every body, NO version bumps (the semver rule exempts refactor).**
One commit per stage is a deliberate deviation from one commit per phase, because eight
bisectable steps beat one 5,000 line diff when hunting a regression.
- Stage 0: the inventory script plus its baseline fixture, committed before any move.
- Stages 1 to 8: the audit's implementation order, each with the audit's named protection
  suites green plus the inventory byte compare. Stage 1's Settings window policy extension is a
  deliberate hardening; the verifier drives Settings live (open, edit a setting, close) to prove
  no visible change. Stage 7 (project references) may end blocked with evidence if it fights
  electron-vite; record and continue. Stage 8 includes the agy-owner.ts NUL cleanup so that file
  becomes text again.
- Closing: update the CLAUDE.md growth rule that names src/shared/ipc.ts to name the split
  contract while keeping the one bridge rule, and state why in the commit.

**Execution rules.**
- Runs ALONE. No other phase workflow may build while 42 is in flight; the queue resumes on the
  new seams when it lands.
- Only the committer role commits. Builders and verifiers never commit.
- Full battery per stage (typecheck, build, test, smoke:t1, assert-bundle-refusals). The final
  stage adds the whole arsenal: smoke:t3, the fault battery, conformance:resume:capture, one full
  conformance:resume roundtrip, conformance:agents, conformance:context, a packaged build with
  verify-signed, and a live behavioral pass driving sessions, git, search, context and settings.
- Any stage that cannot reach green in one fix round REVERTS ITS OWN commit and records why,
  rather than leaving the tree between shapes. Reverting a not yet pushed refactor commit is the
  one sanctioned use of git revert in this phase.

**Ordering.** After Phases 36 and 38 land and push, before Phase 35, which then lands its
logging into the new composition root instead of the 2231 line index.ts.

**Verification. Tier 3 overall**: the refactor touches durability orchestration files, and the
operator was promised byte for byte.

**Semver.** refactor, no bump.

## Phase 43 — the updater recovers from its own wreckage (operator hit it live, 2026-08-15) ✅ SHIPPED 2026-08-15 (`cb07b37`)

**The incident.** The operator's 0.19.1 tried to self update to 0.20.2. ShipIt crash looped: 3
install attempts inside 18 seconds, each dying about 2 seconds after Beginning installation,
because the staged bundle its state file pointed at did not exist and its staging directory was
empty. The persisted attempt counter then tripped "Too many attempts to install, aborting
update" and the update died silently. The app stayed at 0.19.1 with no surface saying anything.
The orchestrator recovered by hand: delete ShipItState.plist, the update.* staging directories,
the com.itavero.tortie.ShipIt defaults domain, and the tortie-updater pending cache.

**The work.**
- Diagnose WHY the staged bundle vanished between staging and install (the download completed
  and staging was recorded; suspects include the pending cache being cleared by a second check,
  quarantine, or a race between two ShipIt spawns; the ShipIt stderr log and the Phase 31
  disassembly notes are the starting evidence).
- The Phase 31 refusal line on next launch learns the two remaining silent shapes: "Too many
  attempts" and a staged bundle missing at install time. Copy names the reason and the remedy.
- A recovery verb, not a manual ritual: when the next launch detects exhausted or wrecked
  updater state, Tortie offers one action that clears the Squirrel state and the pending cache
  and re-arms the check, the exact sequence the orchestrator ran by hand. It never touches a
  healthy staged update.

**Verification. Tier 3** (the operator personally hit it, and it touches the update path):
reproduce the wreck in an isolated instance by deleting the staged bundle after staging and
exhausting the counter, prove the refusal line names it and the recovery verb heals it, then
prove a healthy staged update is untouched by the recovery path.

**Semver.** fix, patch bump.

**The diagnosis, and it is settled.** docs/research/46-updater-wreckage.md holds it with the
evidence quoted. Two facts make the wreck. First, every update check that runs after a download has
finished stages the update again. electron-updater clears its own download guard as soon as the
first cycle ends, and `validateDownloadedPath` then finds the zip already cached and re-stages from
it without downloading anything. Second, every Squirrel staging deletes the update directories the
earlier stagings left behind. The selector `removeUpdateDirectoriesInStorageURL:excludingURL:` has
two call sites in the shipped Squirrel binary, and the one on the staging path excludes only the
directory it has just created. So the second staging deleted the bundle the pending install was
waiting on. The installer failed with `SQRLInstallerErrorDomain Code=-1`, launchd relaunched it, and
Squirrel saved that it had given up after 3 attempts. That saved count makes every later install
fail at once until someone clears it. The operator's log shows the two stagings 5.609 s apart and
the give up 17.628 s after the second one.

**What shipped.** Four items.

- **Tortie stops checking for updates once it has handed one to the installer in this run.** That is
  the cause, closed. A second check in the same run would delete the copy the installer is waiting
  on. The menu item is not dead afterwards. A check made after the staging answers with the ordinary
  install prompt and never reaches the library.
- **The launch after a failed install names the reason and the remedy.** Phase 31 could say only
  that another copy was running. It now also says that the prepared copy was gone from disk, and it
  says when the installer has saved that it gave up, with the number of tries it counted in the log.
  A give up now outranks the reason in every shape, so no dialog tells a person to quit and wait for
  an install that cannot happen.
- **One action clears what the installer saved.** It removes `ShipItState.plist`, every `update.*`
  staging directory, the `com.itavero.tortie.ShipIt` preferences domain and the updater's pending
  download, then re-arms the check and runs one. That is the exact sequence the orchestrator ran by
  hand on 2026-08-15. It keeps `ShipIt_stderr.log`, `ShipIt_stdout.log` and `update.zip`, because the
  log is the evidence the next incident is read from and the zip only makes the next download
  smaller. It refuses on five conditions, and the first two are the ones that matter: a healthy
  staged update on disk, and a state file that names a different copy of Tortie. The health is read
  again at click time and never carried from launch. The action is reachable from the dialog and
  from a `Repair Updates…` item in the Tortie menu, which is drawn only while a wreck is standing.
- **The diagnosis is banked** in docs/research/46-updater-wreckage.md, so the next agent inherits it.

**Tier 3, and every probe passed.** The gates ran in a tree holding HEAD plus this phase's files
alone, because the shared working tree carries two other phases at the same time. typecheck passes
at 618 production files, 3183 imports and 0 import boundary violations. The build passes. 3828 unit
tests pass with 23 skipped and 0 failures in 28.40 s, so no flake had to be argued away.
`npm run smoke:t1` reports 6 of 6. `node build/assert-bundle-refusals.mjs` reports 21 durability, 6
skills-write, 6 config confirm-gate, 8 updater and 1 crash-capture. `node build/contract-inventory.mjs --check`
matches the baseline byte for byte. 154 of those unit tests are in `src/main/updates`, and they
include the 8 combinations of the rehearsal gate, the 7 health rules, the 5 recovery refusals and
the verbatim body of every dialog.

- **P2, wreck and heal in a scratch state root.** The dialog was read off the accessibility tree and
  matched the pinned copy with the version 0.18.2 and the attempt count 3. The clear finished 0.3 s
  after the click. The state file, the staging directories, the defaults domain and the pending
  download were gone, and `ShipIt_stderr.log` and `update.zip` were kept. The launch after the
  repair was quiet and drew no `Repair Updates…` item.
- **P3, a healthy staged update is never touched.** Leg A showed no dialog, no menu item, and a
  recursive listing with sizes that was byte identical after the run. Leg B created the staged
  bundle while the wreck dialog sat on the screen, and the click produced the pinned refusal
  "Tortie is not clearing the updater state, because the update it prepared is still on disk and
  ready to install." and removed nothing.
- **P4, no second staging.** "Detected this as an install request" lines for the run: 1. The
  2026-08-15 incident had 2. Two further user checks 3 seconds apart each answered with the install
  prompt, neither reached the library, and the quit installed 0.18.2 in 2.6 s.
- **P5, the plain roundtrip.** First check 30.4 s after launch against a 25 s floor, staged at
  32.4 s, the bundle swapped at the quit, the relaunched app read 0.18.2, and the session list after
  the relaunch was byte identical to the list before the quit.
- **P6, the real wreck against real Squirrel.** The staged bundle was removed by hand at 32.9 s, the
  quit produced `Code=-1` and then "Too many attempts to install, aborting update" 7.1 s later after
  2 resume lines, the relaunch showed the 4.3 dialog verbatim, the click cleared the real state file,
  the real staging directories, the real defaults domain and the real pending cache, and the
  repaired updater installed 0.18.2 2.6 s after the next quit. The first attempt at this probe
  failed its own cleanup check with 2 scratch pids still alive after a 10 s grace. The rerun passed.
- Operator sessions on socket `gmux` read 21 before and 21 after every probe and 21 after the gates.

**The fix round, named rather than hidden.** The first cut was verified and came back needs_work,
and three of the findings were app defects.

1. The recovery deleted a healthy staged update when the two bundle paths disagreed as strings. The
   state file said `/var/folders/...` and `process.execPath` came back as `/private/var/folders/...`,
   the state read as another application's, the verdict fell to `unknown`, and `unknown` proceeded.
   `sameBundleOnDisk` now resolves both sides through their symlinks, and `recoveryPlan` refuses
   outright on a state file that parses and names another bundle. The live proof is P3 leg B.
2. A whole clear reported itself as partial on any machine whose preferences domain was already
   gone. On macOS 15.7.9 `defaults delete` on an absent domain exits 1 and prints
   "Domain (com.itavero.tortie.ShipIt) not found.", and only the older wording "does not exist" was
   accepted. Both wordings are accepted now, and any other failure is confirmed by reading the
   domain back.
3. The launch after a successful repair showed a false alarm, because the kept `ShipIt_stderr.log`
   still had the give up line as its newest terminal line. A successful clear now writes
   `tortie-repair.json` into the ShipIt directory with the epoch milliseconds of the clear, and every
   log line stamped at or before that moment is skipped.

**Contract lines added, and why.** Two, and nothing was removed. `GMUX_UPDATE_STATE_ROOT` takes the
env count from 50 to 51. It points the updater at a scratch copy of Squirrel's state and is honoured
only under the three conditions that already gate `TORTIE_UPDATE_FEED`, so the isolated probes can
wreck and heal without going near the operator's real files. `updater=4` becomes `updater=8` in the
bundle refusals, for the no second staging refusal, the refusal to clear a ready update, and the two
sentences that name the new failure shapes. No IPC channel, no `gmux.*` key and no smoke mode was
added.

**What is still not true.**
- Item 0 stops a second staging inside one run. It does not stop one across two runs. A launch that
  stages, quits without installing, and launches again will stage again, and that second staging
  deletes the first staged bundle. The recovery verb is what answers that case.
- The Phase 31 sentence "It installs the next time you quit" survives for the one case where the log
  says nothing inside the window and the installer has not given up. It can still be wrong there.
- `tortie-repair.json` is the only thing the repair adds. A user who deletes it by hand gets the old
  false alarm once on the next launch.
- The attempt limit of 3 is Squirrel's number, read out of the log rather than owned by this
  codebase. When no attempt line is inside the window the copy drops the number.
- Whether Electron rebuilds `SQRLUpdater` on every `setFeedURL` was not read out of Electron's own
  binary. Nothing in the design depends on the answer, because the staging call site has no guard at
  all.
- The `Repair Updates…` item was seen on screen in the first verification round, after a "Not Now"
  on a standing wreck. The fix round's probes drove the pending record path and the healthy path, and
  in both the item was correctly absent, so its presence was not re-observed after the fix round.
- P6 uses the real ShipIt directory, which is shared with the installed `/Applications/Tortie.app`.
  It ran only because the Phase 31 precondition proved no install was in flight first. It leaves that
  directory holding a 343 byte `ShipItState.plist` from its own completed install, a 34 byte
  `tortie-repair.json`, and a `ShipIt_stderr.log` that grew from 70,935 to 87,471 bytes. The state
  file names a directory that install consumed, which health rule 4 reads as `unknown`.
- `release/mac-arm64/Tortie.app` is a 0.18.1 rehearsal build, which is the harness's normal end
  state. `release/` is gitignored.

## Phase 44 — Catch Me Up, the structural digest (research 44) HELD 2026-08-15 by the operator, pending more thinking; do not build until they say so

**Specification.** docs/research/44-session-digests.md, Phase A. A per session Catch Me Up verb
opens a digest computed on demand from the SpecStory capture, keyed by agent_session_id: turns,
tool calls, files edited, the last user ask, the tail of the last agent statement, every line
linking into the capture, computed in under 22 ms, nothing stored. The same digest enriches the
existing needs input jump overlay. No capture means the live manifest facts plus the sentence
"no transcript record exists for this session". Staleness always shown as of the capture's last
in file timestamp; mtime never trusted alone. Nothing badges, pushes, or sets status. Stretch:
parse update_plan inputs as a substance line for headless codex sessions. **Tier 2** plus a
fixture matrix over real captures from every agent with captures on disk. **Semver:** feat.

## Phase 45 — Catch Me Up, the model summary opt in (research 44) HELD 2026-08-15 by the operator, pending more thinking; do not build until they say so

**Specification.** docs/research/44-session-digests.md, Phase B. Behind the same verb, an opt in
model written summary produced by one shot of an agent CLI the user confirmed through the Phase
23 gate, off by default, on demand only (measured $0.03 to $0.05 and 15 to 19 s per ask), cached
under userData/gmux with the two staleness keys. Model prose is boxed and labeled with agent,
model, time and cost, never mixed with structural facts, never sets or implies status. Settings
copy states where the transcript goes, including the cross vendor case. **Depends on Phase 44.**
**Tier 3 on the execution gate** (confirm hash moves for every execution bearing field, at most
2 live invocations as evidence with spend stated), Tier 2 on the UI. **Semver:** feat.

## Phase 46 — Runs, GitHub Actions in the SCM view (research 45, operator approved 2026-08-15) ✅ SHIPPED 2026-08-15 (`1eeddea`)

**Specification.** docs/research/45-actions-in-scm.md. A fourth SCM section named Runs, shipped
collapsed, rendered only for repos with a github.com origin: the latest 10 runs for the current
branch, jobs and steps on expand. A push arms a bounded watch: discovery by pushed SHA via gh
run list --commit every 5 seconds with a 120 second give up, then 5 second polling until every
run for the SHA completes, 30 minute cap, one poller per repo, watch state never durable. Data
path is the gh CLI spawned READ ONLY with an argv allowlist unit test (run list, run view, auth
status). Zero mutations and zero presence outside the panel in version 1; no live log streaming
promised because the API cannot deliver it; row verbs are Open on GitHub and Copy URL through
the native menu bridge. Degrade ladder with quiet copy: gh absent, logged out, rate limited, no
github remote, offline. **Tier 2** plus one live probe on a real push to gregce/tortie, which
also closes the one unverified claim, mid run step visibility. **Semver:** feat.

**What shipped.** The SCM view has a fourth section named Runs. It is drawn only when `origin`
points at github.com, so a repository on any other host still shows three sections and no empty
fourth one. It ships collapsed, and nothing spawns until the user opens it. Open it and it lists
the latest 10 runs for the checked out branch. Each row carries the workflow name, the commit
subject, the age and the duration. Expand a row and it reads that run's jobs and steps.

- The data path is the gh CLI spawned read only. `src/main/actions/argv.ts` is the only place a
  gh argv is built, and `assertReadOnlyArgv` checks it before a process exists. Three verbs are
  allowed: `auth status`, `run list` and `run view`. `--repo` is always explicit, so gh never
  guesses the repository from a working directory. A value that begins with a dash is refused,
  because a branch name is user data and git allows a name such as `--upload-pack=evil`. A run id
  must be a positive integer. No shell is involved at any point.
- A push arms a bounded watch. Main already watches each repository's refs, and a watch arms only
  when the remote tracking ref moved and now points at local HEAD. A tracking ref that moved to
  anything else came from a fetch or from somebody else's push, and it arms nothing. Discovery
  runs `gh run list --commit` every 5 seconds and gives up after 120 seconds. After that the
  poller re reads each discovered run every 5 seconds until every one of them reports `completed`,
  with a hard cap of 30 minutes from the arm. Discovery counts wall clock rather than ticks, so a
  machine that slept is not owed the missed tries. There is one poller per repository, and the
  watch state is in memory only, so quitting ends it and a restart never resumes it.
- Version 1 mutates nothing. There is no rerun, no cancel, no approve and no dispatch. The two row
  verbs are Open on GitHub and Copy run URL. Both are reads, and both are drawn by the native menu
  bridge through the store's `setMenu`.
- Version 1 has no presence outside the panel. There is no badge, no toast when a run finishes, no
  dock count, no system notification and nothing that writes a session status. The one toast in
  the phase confirms the user's own Copy verb, and it has the same shape as the History section's
  copy toast.
- The degrade ladder is five quiet lines. gh missing says "Runs need the GitHub CLI. Install gh to
  see them here." Logged out says "Sign in with gh auth login to see runs." A rate limit says
  "GitHub is limiting requests. Runs will refresh when the limit resets." Offline says "Could not
  reach GitHub." No github.com remote draws no section at all.
- No live log streaming is offered, because the GitHub API cannot deliver a running step's output.

**Tier 2, plus the live probe the entry asked for, and the unverified claim is now closed.**
- The gates ran in a tree holding HEAD plus this phase's files alone, because the shared working
  tree carries four other phases at the same time. typecheck passes at 615 production files, 3164
  imports and 0 import boundary violations. The build passes.
  `node build/assert-bundle-refusals.mjs` reports 21 durability, 6 skills-write, 6 config
  confirm-gate, 4 updater and 1 crash-capture. `npm run smoke:t1` reports 5/5 create and 6/6
  verify on its own scratch socket. 3737 unit tests pass with 23 skipped.
- The one test failure in that run is the symbols 80 ms budget at 137.5 ms, at a load average of
  30.2. It passed 3 of 3 isolation runs, 40 tests each, and this phase touches no file under
  `src/main/symbols`.
- This phase adds 91 tests across 5 files. The allowlist has a test that fails when a fourth verb
  is added.
  The verifier added `run cancel` to `GH_ALLOWED_VERBS` and got
  `expected [ 'auth status', 'run list', ...(2) ] to have a length of 3 but got 4`, then restored
  the file.
- The mid run probe closed research 45 section 7's first bullet. Run 21 of the gates workflow was
  in progress on `main` while the verifier drove the app with an isolated profile. gh reported the
  job `gates` as `in_progress` with steps 1 and 2 completed, step 3 in progress and steps 4 to 16
  pending. The panel said "gates has been running for 1 minute 37 seconds", drew four green checks
  with their durations, one blue spinner on "Run npm test" reading "has been running for 36
  seconds", and five muted circles below it. Mid run job and step progress is visible and it moves.
  That is measured now rather than inferred.
- The section is fourth. The live DOM read returned `["changes","history","branches","runs"]` and
  10 rows for branch `main`. Expanding one run read its jobs in 750 ms and drew 1 job and 10 steps.
- Three degrade rungs were driven in the app. Logged out used the real gh binary with `GH_CONFIG_DIR`
  pointed at an empty scratch directory, which left the operator's own gh config untouched, and the
  panel drew the sign in line with no rows and no header icon. gh missing used
  `GMUX_GH_BIN=/nonexistent/p46/gh`. A scratch repository with a gitlab.com origin produced no
  section and the order `["changes","history","branches"]`.
- The arming path was driven without a push. In a read only clone the verifier rewound
  `refs/remotes/origin/main` and moved it back to the tip local HEAD already sat on, which is byte
  for byte what a push leaves on disk. Main logged `watching a push` and the panel showed
  "Watching for a run to start after your push."

**Contract lines added, and why.** Six lines were added and none were removed. `actions:runs`, `actions:jobs`,
`actions:observe` and `actions:release` are the four read channels, taking the invoke channel count
from 132 to 136. `GMUX_GH_BIN` names an alternative gh binary for probes and takes the env count
from 49 to 50. `gmux.scm.runsCollapsed.` is the per repository collapsed state and takes the
localStorage key count from 33 to 34.

**What is still not true.**
- A step whose gh status is `pending` gets the catch-all sentence, e.g.
  `Run npm run build reports the state "pending".` `STATUS_WORDS` in `src/main/actions/parse.ts`
  narrows only `queued`, `in_progress` and `completed`, so `pending` falls to `unknown`. On an in
  progress run most steps carry it, so this is the tooltip a user meets most often. The glyph is
  right and nothing lies, but the sentence should read as "has not started". This is a copy nit and
  it is open.
- The native context menu was never opened live. An OS menu is modal and blocks the harness, and
  one probe that dispatched a real `contextmenu` event hung past 5 minutes and was killed. Open on
  GitHub and Copy run URL are verified by reading the two call sites and by `setMenu` being the
  only path, not by driving.
- "Watching this push. Checking every 5 seconds." was never seen on screen. The run for the armed
  sha had already finished, so the machine went from arm to discovering to complete. The 5 second
  polling lane and the 30 minute cap are proven by unit tests only.
- No real push to gregce/tortie was made, by design, because the phase was driven read only. The
  github.com side of a push, and so the discovery of a brand new run appearing from nothing, was
  not exercised.
- gh's exit code on a rate limited response is still unmeasured. Research 45 said so and this phase
  did not close it. `classifyGhFailure` finds a rate limit by the words "rate limit" in stderr
  before it looks at the exit code, and a miss falls to the last rung. The rate limited rung and
  the offline rung were not driven in the app, so 3 of the 5 rungs were observed live.
- One measurement disagrees with research 45. `gh auth status --hostname github.com` with an empty
  config directory exits 1 here, not 4. `classifyGhFailure` caught it through the logged out
  pattern and the panel showed the right line, so the exit 4 branch is covered by a unit test only.
- The allowlist's guard against a fourth verb is an array length assertion. With `run cancel` in
  the array, `run cancel --repo o/r` would pass `assertReadOnlyArgv`. The length assertion does
  fire, so the sanction holds today, but it rests on one number a future editor could change
  alongside the array.

## Phase 47 — explorer and git pane nits (user requested, 2026-08-15) ✅ SHIPPED 2026-08-15 (`53e919d`)

Four small items, one phase. Runs FIRST after Phase 42 lands.

**Item 1, gitignored entries grey out.** Anything the repository ignores renders dimmed in the
file tree, the VS Code convention. Detection comes from git itself (porcelain v2 already feeds
the tree's status colors; ignored entries need --ignored or check-ignore, and the spec measures
which is affordable on a large tree before choosing). Dimming is a token color, never a literal,
and an ignored file stays fully clickable and openable; grey means ignored, not disabled.

**Item 2, clicking a result never clears the filter.** Filter the tree, click a file or folder,
and today the filter clears. It must hold: only the clear affordance in the filter box or the
filter toggle icon clears it. Clicking a result opens the file or expands the folder with the
filter still applied.

**Item 3, a density knob.** The tree library (@pierre/trees) already supports adjustable row
density; expose it as a small control in the explorer pane header (compact and comfortable at
minimum, whatever the library natively names). The choice persists per user in a gmux.*
localStorage key and applies without a reload.

**Verification. Tier 2.** One live probe: a scratch repo with a .gitignore covering a file and a
folder, screenshot read of the dimming; filter, click a result, prove the filter text and the
filtered view survive; toggle density, screenshot read both states, relaunch, prove persistence.
The known must-not-regress: tree drag to terminal, inline naming from Phase 37, and git status
colors all still work with each item, checked in the same probe.

**Item 4, the graph gutter gets a compact option.** In the history and graph section, commit
text today sits pushed far right because the gutter reserves width for the widest possible lane
count. The operator's reference is VS Code's Graph view, where text hugs the lanes. Add a small
toggle in the pane header next to the filter: compact keeps the gutter tight to the lanes
actually present in view, wide keeps today's fixed reservation. The choice persists in a gmux.*
localStorage key. The vendored VS Code graph layout algorithm is NOT modified; only the gutter
width the renderer grants it is. Reference screenshots from 2026-08-15 are the operator's
message of that date.

**Verification for item 4.** Screenshot reads of the same repository in both modes, one with 1
lane and one with 4 plus lanes, proving compact hugs the lanes and wide matches today, and that
ref pills and dates still degrade per the Phase 12 rules rather than clipping.

**Semver.** fix, patch bump (items 2 and 4 correct defects of the surface; the set rides as one fix).

**What shipped.**
- Ignored entries are dimmed in the file tree. The answer comes from git itself, through a new
  `git:checkIgnore` channel that runs `git check-ignore -z --stdin` over the paths the tree has
  actually loaded. The spec measured both routes on this repository. Adding `--ignored` to the
  frozen status call cost 0.218 s and a 1.45 MB payload of 25,305 rows on every refresh.
  `check-ignore` over 5,000 paths cost 0.140 s and answered only what was asked, so it won.
  The tree never asks inside a directory it already knows is ignored, so expanding
  `node_modules` costs no further call. Dimming uses the existing `--git-ignored` token and
  adds no color literal. An ignored row is still clickable, openable and a drop target. Grey
  means ignored, not disabled.
- The name filter survives clicking a result. Two guards in FileTree hold it: the library's
  blur-close is swallowed at the shadow boundary, and the unconditional close the library
  performs inside a row click or Enter is undone in the same gesture. Escape, the header
  toggle, the new clear button, and starting a rename or a create all still close the filter,
  because each of those is a deliberate filter-aimed gesture. The clear button is new, sits at
  the right edge of the field, and reads "Clear the filter".
- The Explorer header has a sixth button, row spacing. It opens a native menu with the three
  densities @pierre/trees ships, being Compact at 24 px, Default at 30 px and Relaxed at 36 px.
  The choice persists under `gmux.treeDensity`. The default is Compact, which keeps today's
  24 px rows. The one deliberate visual change for a user who never touches the knob is the
  item's horizontal padding, which moves from 8 px to 6.4 px, because the feature now speaks
  the library's own names end to end.
- The History header has a compact gutter toggle. In compact mode each row's graph column is
  as wide as the lanes that row actually draws, so subjects hug the lanes the way VS Code's
  Graph view does. Wide mode is the default and is unchanged. The vendored layout and fold were
  not touched. Only the width the renderer grants each row changed, through one new pure helper
  `rowColumns` in gmux's own geometry.ts. The choice persists under `gmux.scm.graphGutter`.
- Verification, Tier 2 as the entry set. The verifier drove the real app seven times on harness
  sockets with an isolated user-data-dir each time, and staged nothing. On a scratch repo the
  tree reported `ignored` on the two ignored directories and the one ignored file, and did not
  report it on `keep.log`, which is tracked and matches `*.log`. On this repository eight root
  entries came back ignored and `check-ignore` over 5,000 paths took 0.048 s. The filter probe
  ran 31 steps and all 31 passed, and a filtered view of 3 rows was byte-identical after
  clicking a result. Row heights measured 24 px and 36 px in the running app, and the relaunched
  app drew 36 px rows from the stored key alone. In the graph, ink extent measured with
  `getBBox` was identical row for row in both modes, which is the proof the layout did not move,
  and no row drew ink past its granted width. At a 220 px sidebar no pill, age or subject
  clipped in either mode. Tree drag to terminal, Phase 37 inline naming (9 of 9 steps) and the
  status colors all still work.
- Contract lines added, three: `git:checkIgnore`, `gmux.treeDensity` and `gmux.scm.graphGutter`.
- What is not true. The step from picking Relaxed in the native menu to the tree re-keying was
  not driven live, because Electron's contextBridge is frozen and the menu pick cannot be
  intercepted from the renderer. Both row heights and the persistence across a relaunch were
  measured. A density change loses selection, scroll position and an open filter, because the
  model rebuilds; expansion state survives. The filter reopen refuses if more than 200 ms
  separates the pointer press from the library's close, so a click delayed by a paint stall
  falls back to the old behavior of closing.


**A gate that could not be run, recorded honestly.** `npm run conformance:resume:capture`
hung on this machine and produced no output in 200 s, against a documented cost of
about 16 s. It was run twice, once on this phase's tree and once as a control on the
0.24.3 tree, which carries no tmux change at all. It hung identically on both, so this
phase did not cause it and the hang is a pre-existing condition on this machine. That
gate is required by CLAUDE.md only for commits under `agents/registry.ts`,
`manifest/harvest/**`, `manifest/agents.ts` or `restore/**`, and this phase touches none
of them. `smoke:t3` covers the restore path and it passed on the exact committed tree,
on both a claude and a non-claude shape.

**RESOLVED 2026-08-16, and the harness was never broken.** The hang was a queued macOS
keychain alert. A probe the evening before launched the dev Electron with HOME redirected
into a scratch directory, where no login keychain exists, so Chromium's safe-storage layer
made macOS pop "A keychain cannot be found to store ...". Keychain prompts queue
system-wide behind one modal, the operator was away, and from then on every process that
touched the keychain blocked in line behind the unanswered dialog. conformance:resume:capture
is the one gate that spawns real agent CLIs, and claude reads its OAuth credentials from the
keychain at boot, which is why this gate hung on every tree while smoke:t1 and smoke:t3,
which spawn no real agent, kept passing. The operator cancelled the queued dialogs the next
morning and the gate passed unchanged in 18.1 s, 6 PASS and 0 FAIL, which is the experiment
that confirmed the cause. The fix that prevents a recurrence is in the commit that carries
this paragraph: every harness launch now runs Chromium with --use-mock-keychain, so no probe
can touch a keychain or pop that dialog again, and build/harness-socket.mjs prints one hint
naming this failure mode when a harness runs long.

## Phase 47.1 - the ignored dimming strobe (operator reported against 0.24.2) SHIPPED 2026-08-15 (`3bbc3e6`, 0.24.3)

**The report.** "the greyed out files in the tree will flash white which is VERY
distracting", and "it feels like a strobe".

**The mechanism.** `FilesSection.tsx` called `invalidateIgnored()` from the
`onRepoChanged` handler, so every `git:changed` reached it, and `forget()` in
`ignored.ts` ran `set({ ignored: NONE, epoch: +1 })`. That emptied the RENDERED
set before fetching the replacement, so `treeGitLane` emitted no ignored entries
and every dimmed row repainted bright for the 13 ms to 30 ms the git spawn took.
`INVALIDATE_MIN_MS` was 2000, so under a constant writer it strobed on a fixed
two second period.

**Measured before and after.** 84 bad frames of 3601 painted over 31.0 s in 15
episodes exactly 2000 ms apart, against 0 of 3601, 0 of 4802 and 0 of 4802 with
2000 extra ignored paths. A project switch leaked nothing, 0 of 2120 frames in
both directions. Removing a rule dropped the dimming in 2383 ms and restoring it
took 9399 ms, both inside the new 10 s floor.

**What the fix is.** Stale while revalidate. The rendered set is never emptied
to refresh it, only `reset` empties it, and that is leaving the repository. A
revalidation REPLACES so a path that stopped being ignored can leave, while an
ordinary sync MERGES because it only ever learns about paths nobody had asked
about. `INVALIDATE_MIN_MS` rose from 2000 to 10000, since the floor no longer
has a visual cost and its only job is to bound how often git is asked.

**A library defect the fix has to work around.** `@pierre/trees` builds
`ignoredInheritanceCache` once per mount with `useMemo(..., [])` and never
clears it, so a directory rendered before its ignored answer arrives is cached
as "not under an ignored directory" for the life of the tree. The blanking used
to hide this, because asking about every path every 2 s gave every row an
explicit entry. `coveredByIgnored` now does that deliberately.

**Three things left open, and none of them is a regression.**
1. `src/main/git/service.ts` maps "nothing is ignored", "git refused" and "git
   could not run" onto the same empty list, so a refusal would clear the dimming
   until the next successful read. Fixing it needs an IPC contract change.
2. A revalidation with zero loaded paths settles on the empty set. Three lines,
   and unreachable from the app today.
3. A pending invalidate timer survives a project switch, costing the next
   project one unneeded `git check-ignore`.

---

# Recorded, not queued (2026-08-15)

Four phases below have a written specification and no place in the queue. The operator asked for
them to be recorded rather than scheduled. Do not build any of them without being told to. Two of
them additionally require the operator to accept a new principle first, and that is stated on the
entry.

Phase 48 was pulled out of this section and built on 2026-08-15. Three remain unqueued.

Both research documents behind them had no backlog entry at all until now, which meant the
decisions lived only in a chat session. That is the gap this section closes.

## Phase 48 — the launch preflight and the exit text (research 47, parts A and B) ✅ SHIPPED 2026-08-15 (this commit, 0.25.1)

**Specification.** docs/research/47-agent-installs.md, sections 2, 6, 7 and row A and B of section
12. This is the incident the operator hit on a second Mac, where `claude` was found, launched and
died with no explanation.

Part A is PATH truth. `PATH_CAPTURE_TIMEOUT_MS` moves from 3000 ms to 10,000 ms, matching what VS
Code allows its own shell probe. Five timed captures on the operator's machine measured 2837,
3077, 3089, 3145 and 3511 ms, so four of five miss the current budget and fall back to a PATH that
cannot find a version managed node. Two comments are corrected in the same commit, because both
credit the wrong line for how a pane gets its PATH. The load bearing line is
`process.env['PATH'] = userPath` at supervisor.ts:558, not the `set-environment -g PATH` the
comment at supervisor.ts:545 names, and that was measured twice by two independent investigations.
A comment that wrong is a trap for whoever next tunes boot latency.

Part B is the preflight and the exit text. A new `src/main/agents/health.ts` reads the first two
bytes of the resolved file before anything spawns. If they are `#!`, it parses the interpreter,
expands a `/usr/bin/env X` form, and resolves `X` against the same PATH the pane will get. Measured
at 0.137 to 1.358 ms per agent, so it can sit on the launch path where a `--version` probe never
could, the worst measured case for that being 11,084 ms. It fails open: over 250 ms or any throw
returns `unknown` and the launch proceeds, because a health check that can stop a working agent is
worse than the bug it was written for. Alongside it, an `exitDetail` column carries the last five
non-empty lines the pane printed, taken from the snapshot the reaper already captures, capped at
500 bytes, shown verbatim and never parsed. The exit 127 branch at TerminalRegion.tsx is deleted,
because it currently tells the user the agent could not be found when in fact the agent was found
and its interpreter was not, and then prints the npm command that produced the problem.

**Tier 3**, because the operator reported it. The evidence that closes it is the seven reproduced
failure modes from section 2.1 re-run against the new build, as a per mode table showing the
sentence each one now produces. No mode may produce a bare exit code. **Semver:** fix.

### What shipped

Part A landed as written. `PATH_CAPTURE_TIMEOUT_MS` is 10,000 ms, `captureLoginShellPath` reports
one `info` line naming the source, the wall clock, the directory count, the budget and the merged
PATH itself, and `userPathEpoch()` counts the captures so a cache can key on them. The two comments
that credited `set-environment -g PATH` for a pane's PATH now credit
`process.env['PATH'] = userPath`, in supervisor.ts and in sessions/core.ts.

Part B landed as written, with one deviation. `src/main/agents/health.ts` reads the first two bytes
of the resolved file before anything spawns, parses the interpreter when they are `#!`, expands
`/usr/bin/env`, and resolves the name against the same PATH the pane will get. Only
`interpreter-missing` blocks. The deviation is that `AGENT_INTERPRETER_MISSING` carries its `detail`
as two lines, being the absolute path and then the interpreter name, so the create sheet can name
the program in its two ways forward without reading a fact out of a prose sentence. Migration
`012-exit-detail` adds the column, `exitDetailFrom` keeps the last five non-empty lines within 500
bytes, `clearExitCause` deletes it with the rest of the cause, and the exit 127 branch in
TerminalRegion.tsx is gone.

### The evidence the committer produced

Gates, all on the committed tree: typecheck, build, `npm test` at 3973 passed and 23 skipped over
279 files with no flake, `smoke:t1` create and verify both PASS, `assert-bundle-refusals`,
`contract-inventory --check` OK byte for byte, and `conformance:agents` PASS. The six test files
this phase adds or changes carry 120 tests.

Three live probes, on scratch sockets `gmux-p48-live` and `gmux-p48-lived`, each with its own
`--user-data-dir`, driving the real app through `GMUX_SHOT` with a controlled `$SHELL` that prints
a PATH of the probe's choosing. Operator sessions on `-L gmux` were 22 before and 22 after.

| Probe | Result |
| --- | --- |
| Mode 1, `#!/usr/bin/env <absent>` | Refused before launch. `AGENT_INTERPRETER_MISSING`, the state B sentence, preflight cost 1.515 ms |
| Mode 7, `#!/usr/local/bin/<removed>` | Refused before launch. Same code, the absolute interpreter named, cost 0.313 ms |
| `Start it anyway` | The same argv the check refused was accepted and a session was created |
| Mode 3, a shim that starts and exits 1 | Manifest row carried `exitDetail`. The app drew "claude stopped right after it started", then "The session ended within 5 seconds of starting. It exited with code 1.", then the pane's own two lines in the monospace block, then the restart note. Screenshot read |
| The Part A log line | Read live in the `smoke:t1` run: "login-shell PATH capture: login shell, 1227 ms, 46 directories, budget 10000 ms" |

### What is not true

- **The full seven mode matrix was not re-run by the committer.** Modes 1, 3 and 7 were driven
  live, plus `Start it anyway` and the two Part A items above. Modes 2, 4, 5 and 6 were not
  reproduced in this run. Modes 2 and 6 share mode 1's code path exactly, and modes 4 and 5 share
  mode 3's, so the claim for them is an inference from a shared path and not a measurement.
- **The state B block in the create sheet was not photographed.** The payload that feeds it was
  proven live, twice. The block itself was read in the source.
- **No screenshot of state A was taken**, and the `Try again` action was not driven.
- **The second Mac was never observed.** Every reproduction is a shim in a scratch directory.
- The larger PATH budget costs a machine whose login shell never prints 7 more seconds before the
  first session can be created. That cost was reasoned about and was not measured in this round.
- The `onLoginPath` equality defect at core.ts and `VERSION_PROBE_TIMEOUT_MS` are untouched. Both
  are Phase 49.

### The fix round, 2026-08-15, same commit

The independent verifier died on an API error part way through its response, so the phase reached a
pass verdict by default rather than by proof. Two verifiers were run again afterwards and both found
real defects. Fifteen were reported. Eleven were fixed here, three were declined with a reason and
one was a documentation error that is corrected above and in the code.

| # | Defect | Fix |
| --- | --- | --- |
| 1 | The 250 ms timer released the caller but nothing cancelled the blocked `open`, so every launch against a file whose open hangs leaked one libuv threadpool thread for good. Measured at `UV_THREADPOOL_SIZE=2`, one of four creates returned. Once the pool was gone the app could not quit | `strandedInspections` in health.ts. One stranded read is tolerated, and while one is outstanding every later check answers `unknown` without opening anything. The pool always keeps at least three threads. Proved with a real FIFO |
| 2 | State B was unreachable for claude on a fresh boot, which is the operator's own machine. detection.ts merged stderr into the identity test, so a broken shim's "No such file or directory" failed the `(Claude Code)` check and the tile read "not installed". claude is the only one of twelve rows with an `identitySubstring` | The identity claim now needs stdout. A program that could not run at all is no longer called an impostor. Driven live on a fresh profile, before and after |
| 3 | `Try again` silently switched the agent to shell, and the third click created a session named shell-1 | The settle hop runs for the first settle only. A person's own pick and an on-screen refusal both freeze the selection |
| 4 | tmux's own `Pane is dead (...)` banner was stored as the pane's last words and shown under "The last thing it printed was:". It also broke the UI rule against the word "Pane" and consumed one of the five lines | `DEAD_PANE_BANNER` drops it before the slice and before the cap. The two literal banner forms were captured from tmux 3.6a on this machine |
| 5 | A single-line error of 451 bytes or more was discarded whole and replaced by the banner alone | Fixed by the banner drop. A 451 character message is now kept |
| 6 | The "no last words" case never happened, so the block always drew, with nothing in it that the agent said | Fixed by the banner drop. Proved live: a silent exit draws no block, no lead and no note |
| 7 | A healthy agent killed from outside was told a restart would not help | `exitDetailNote` branches on the signal, including the 128+n exit codes |
| 8 | `exitDetail` went stale on a row that died twice, because the reaper omitted the field when it had nothing and the reconcile flip did not clear the cause | The reaper always states the answer and `null` means nothing, which needed the patch type to allow a removal. The reconcile flip now passes `clearExitCause` |
| 9 | The health cache could block a working agent after an in place upgrade that kept the size and the mtime, e.g. `cp -p` | The key gains the inode and `ctimeMs` |
| 10 | A file whose first two bytes are 0x23 0x21 by accident was blocked, with an unreadable interpreter name | The shebang must be printable ASCII, otherwise `unknown` |
| 11 | `#!./node` was blocked although the kernel resolves it | A relative path containing a slash answers `unknown` |
| 12 | A cached `interpreter-missing` answer reported the first caller's path, and the sheet prints that path | `binPath` is overwritten on a cache hit, as `elapsedMs` already was |
| 13 | `#!/usr/bin/env --split-string=node` named no program | The long form and the attached `-S` form are both read |

Declined, with the reason:

- **Suppressing the block when the last words are only a TUI redraw.** It would have to read the
  bytes, and this feature's whole contract is that no branch reads them. It would also hide a
  genuine crash message from an agent that prints one and then dies by `SIGABRT`, which is what a
  node out of memory abort does. The note branch fixes the false sentence, which was the actual
  harm.
- **Blocking `#!node`.** No kernel resolves a bare name in a shebang, so `ok` is technically the
  wrong answer. Both `ok` and `unknown` launch, so nothing a person can see is different.
- **Setting `remain-on-exit-format` in resources/gmux-tmux.conf.** The operator's server is already
  running with tmux's default, so the recogniser is needed either way, and a second source of the
  banner would only add a shape to match.

The Part A justification does not reproduce. The commit body recorded five captures at 2837, 3077,
3089, 3145 and 3511 ms. Two later runs of the same probe on the same machine and the same shell
measured 1165, 1069, 1082, 1050 and 1074 ms and 1110, 1090, 1080, 1070 and 1110 ms, so 0 of 10
missed the old 3000 ms budget. Two live boot lines read 1227 ms and 1183 ms. The 10,000 ms budget
stays, because the cost of a miss is the bug this phase exists for, but the recorded reason is
corrected here and on `PATH_CAPTURE_TIMEOUT_MS` itself.

Gates after the fix round: typecheck, build, `npm test` at 3998 passed and 23 skipped over 280
files, `smoke:t1` create and verify both PASS, `smoke:t3` both halves PASS covering a claude and a
non-claude restore, `assert-bundle-refusals`, `contract-inventory --check` OK byte for byte, and
`conformance:agents` PASS. Operator sessions on `-L gmux` were 22 before and 22 after.

Still not true after the fix round:

- The one stranded threadpool thread is bounded and is not recovered until the mount answers.
- Modes 2, 4, 5 and 6 of the seven were still not driven.
- The signal death note was proved by unit test on the three cases, not by killing a live agent.
- `conformance:resume:capture` hangs on this machine, on this tree and on trees without this work,
  so it did not run. That is not a Phase 48 finding.

## Phase 49 — the install map, precedence and probe budgets (research 47, parts C, D and E) ✅ SHIPPED 2026-08-16 (`bf6e9e2`, 0.27.0)

**Queue position, decided 2026-08-16.** It runs before the grok build phase on purpose: this phase
creates the AgentInstallInfo shape on every registry row, and grok's new row should be born with
one rather than patched afterwards. It runs after the 0.26.0 release so the release is not held by
it.

**Specification.** docs/research/47-agent-installs.md, sections 3, 5, 8, 9 and 10. `AgentInstallInfo`
lands on all twelve registry rows, holding the provider's own first listed install command as a
display string, the page it was read from and the date it was read. Nothing in it is ever run, and
`npm run conformance:installs` asserts that shape in about 1 s while spawning nothing. The failure
copy shows the command with a copy button and says out loud that Tortie does not run install
commands. Arming the command in a pane was rejected, because any process that can reach the
`-L gmux` socket could send Enter to it. `AGENT_INSTALL_COMMANDS` is deleted.

Precedence gains a collect-all resolution so Settings can name shadowed copies, which matters
because section 3.2 found three live shadowing hazards on the operator's own machine, including a
gemini that `npm install -g` keeps upgrading and that never runs. It also fixes a real defect at
core.ts:2096, where the code tests `onLoginPath` for null when it should compare it against `abs`.
When those differ the manifest records one file and the pane runs another. `VERSION_PROBE_TIMEOUT_MS`
moves from 4000 ms to 10,000 ms and the probe is asserted unreachable from the create path.

**Tier 2** for the surfaces, **Tier 3** for the bare name invariant, which needs a `smoke:t3` case
proving a session created with a shadowed binary launches the file the manifest recorded.
**Semver:** feat.

## Phase 50 — Tortie speaks outside its own window (research 48, survivors 1, 2 and 4) RECORDED 2026-08-15, NOT QUEUED, AND BLOCKED ON A ZEN DECISION

**This one cannot be built until the operator accepts a new principle.** The sentence, from research
48 section 10, is: Tortie may speak outside its own window, and only for the signals that already
rise above the surface inside it. A second, narrower sentence rides with it: Tortie records whether
the human has seen an event, which makes the human's own attention an input to what Tortie draws.
Both point the same way, which is that Tortie begins to model the human's attention and not only
the sessions' state. That is the thing to accept or refuse, rather than the notification itself.

**Specification.** docs/research/48-what-people-want.md, sections 9.1, 9.2 and 9.4. One macOS
notification when a session crosses into a state that already rises above the surface inside the
app, being needs input, failed or finished. It reports the state and never sets one. Clicking it
focuses that session. An unread mark per session, cleared when the human looks. A refused provider
becomes one more trigger rather than a feature of its own.

The form that must be refused is written into the spec, not left to review: no badge, no count, no
inbox, no history, no sound unless the user turns it on, and a per session mute. Nothing may
accumulate. Note that `'app:setBadgeCount'` already exists in the type surface at
src/shared/ipc/app.ts with nothing calling it, and Phase 29 refused it in plain words, so the spec
has to refuse it again in writing.

**Tier 3**, because it claims to work across agents and four of twelve activity rows are floor
verified by stand-in rather than against the real binary. **The kill condition is written down:** a
measured false ping rate above zero on the agents with exact oracles means ship nothing. A wrong
silence costs the user some waiting. A wrong ping costs them their attention. **Semver:** feat.

## Phase 51 — `tortie .` from the shell (research 48, survivor 3) ✅ SHIPPED 2026-08-16 (`051558e`, 0.28.0)

**Specification.** docs/research/48-what-people-want.md, section 9.3. An optional shell command that
opens a folder as a project tab in the running window. It opens a folder and does nothing else.

**Two things must be honest in any proposal that picks this up.** First, this is an operator hunch
and not a corpus finding. The document's own best source was struck, because 599 people were
complaining that Cursor changed a default rather than asking for this. Second, the cap belongs in
the proposal rather than in a later review: the moment anyone adds a flag such as
`tortie --agent claude .`, any process on the machine can start an agent in any directory, which is
the exact shape refusal 8 exists to prevent.

**Check this before it gets built.** There is no `setAsDefaultProtocolClient`, no `open-file` handler
and no `open-url` handler anywhere under `src/main`, so `open -a Tortie <folder>` costs zero code
today and may already be half true. Somebody should try it first.

**Tier 2.** Gates, one probe that a second launch with a path argument opens the right project tab,
and one probe of the PATH install and its removal. **Semver:** feat.

## Also recorded, with no phase written

Three research documents have no phase and no entry, and the operator has not asked for one.
Recorded here so they are findable rather than forgotten.

| Research | Size | What it holds | Why there is no phase |
| --- | --- | --- | --- |
| docs/research/28-remote-sessions.md | 1201 lines | Remote sessions, and the durability that would have to come first | Never queued. The largest piece of unscheduled thinking in the repository |
| docs/research/38-agent-licences.md | 672 lines | The licence of every agent harness and what each means for shipping publicly | Written before going public, which then happened. It is a reference, not work |
| docs/research/46-herder-study.md | 320 lines | A study of another tool | A study. It was never meant to produce a phase |

---

# The Arch work, from research 49, COMPLETED 2026-08-16: The Standing Contract

**The first verdict from this research is superseded, and the record says why.** The 2026-08-15
draft reached synthesis with only one of four designs delivered, because three architects died on
API errors, and it recommended an extractor-first ladder gated on a median cross-group edge count
of 8 against a measured 7. The operator ordered the competition completed. All four designs were
then delivered and attacked, and all three judges independently chose a different design, The
Standing Contract, with margins of 5 to 8 points over each judge's own second choice. The old
phases 53 to 57 ladder and its edge-count gate are dead. Phase 52 had already been withdrawn by
the operator on 2026-08-16, because it would have maintained his AS-BUILT markdown files, which
are his pre-feature workaround and not a thing to keep alive.

**The winning shape, from docs/research/49-arch-pane.md at 1531 lines.** Architectural promises
live as plain JSON in `docs/arch/` inside the user's repository, written by the user or by an
agent the user launches. Tortie's own compiled code checks every promise deterministically on
every change burst, about 0.5 s on a repository this size, and says which promises hold, which
broke at exactly which line, and which it cannot check. The verdicts surface first where the
operator already looks, the pre-commit gate and the SCM view. A fifth sidebar view is the browse
and repair surface. The canvas ships LAST, as an editor tab, generated on demand, and gated on an
observed usage number rather than promised. The gate is the product; the picture is an output of
it. The first slice adds ZERO npm packages and Tortie spends ZERO tokens on it forever. Optional
narration runs on the user's own agent, modelled at $0 to $29.88 per run with prices verified
live. The wall, voice and collaborators from the north star are refused under the charter and
section 12 says so.

**ONE DECISION BLOCKS SLICE 1: the Zen addition in research 49 section 8.2**, one new section,
two new refusal bullets and one clause, endorsed by all three judges as the minimum honest change,
presented as a single accept or reject. Two sequencing conditions ride with acceptance: the argv
defense from section 4.7 lands before the "nothing Tortie draws ever starts a process" bullet
becomes true rather than aspirational, and the accepted-divergence visibility rule ships in the
same phase as the words.

| # | Slice, recorded NOT queued | Contents | Blocked on |
| --- | --- | --- | --- |
| 63 | The contract without the canvas, HELD 2026-08-16 by the operator AFTER acceptance, his words being that SSH is immediately valuable; the Zen acceptance stands recorded, the build resumes on his word from workflow run wf_70ed709c-c02 | The docs/arch format with schema and validator, the arch IPC domain, import captures with the manifest-aware resolver for TS, JS and Go, the five checkers with the argv defense and hostile fixture, the fifth sidebar view through the full registration cascade including the View menu item, the teaching empty state with the corpus-seeded prompt, conformance:arch, divergence rows in the SCM view. Tier 3 checkers, Tier 2 UI. Zero new packages | NOTHING. The operator ACCEPTED the Zen addition on 2026-08-16, with two riders: the addition's text lands inside Phase 63's own commit so its two sequencing conditions hold, being the argv defense before the nothing-starts-a-process bullet is true and the accepted-divergence visibility rule in the same phase as the words; and README.md is NOT touched, the Zen lives in docs/ZEN-OF-TORTIE.md only |
| 64 | The aiming verb | The payload composer with byte-deterministic proof, delivery through tmux load-buffer with bracketed paste restricted to registry-launched sessions, per-agent matrix at Tier 3, the computed level 2 module view. This is the north star's point-and-riff sentence made textual | 63 |
| 65 | The refresh loop | The delta prompt scoped to drifted claims, the session-change diff view from verdict deltas, the headless narration confirm sheet | 63 |
| 66 | The canvas | An arch EditorMode arm on @xyflow/react 12.11.3 plus @dagrejs/dagre 3.1.1, both MIT, both verified free of eval, wasm and native code so the CSP stands. Gated FIRST on the CSS zoom spike and SECOND on an observed usage number from slices 1 to 3, e.g. 20 composed payloads or gate catches in a month | 64 and 65 in use, plus the number |
| later | Flows at level 3, SCIP absorption, the Louvain regroup as a diff, Rust and Python resolver arms, a JSON Canvas one-way export | Each its own decision |

## Phase 58 — the update ring: progress above the gear instead of dialogs (operator requested 2026-08-16) ✅ SHIPPED 2026-08-16 (this commit, 0.26.0)

### What shipped

The ring landed as specified. `src/main/updates/journey.ts` holds the transition table, and
`ringFromJourney` hides every journey the user did not start until it reaches ready. The
`UpdateRing` component sits in the activity bar directly above the gear, draws all six states from
tokens only, and opens its menu through the ui:popupMenu bridge on every path. Four dialogs are
gone. They are the downloading dialog, the ready dialog, the failed check dialog and the staged
outcome prompt. The Phase 31 refusal dialog and the staged menu item stayed, as the entry required.
"Restart and update now" calls the updater's own install path and adds no relaunch logic. Three
contract lines were added and re-baselined in this commit, being updates:repair,
updates:restartNow and updates:whyFailed.

The verifier drove a real staged update through build/update-rehearsal.mjs on an isolated profile
and an isolated download cache. The ring was photographed in downloading, ready and failed states.
A dialog sweep polled once per second across the manual journey and saw no dialog. A background
check drew nothing through 27 polls until the staged event landed. The restart rehearsal came back
on the new version in 4.7 s with exactly 1 install request, and Squirrel's own log named the
swapped bundle. The rehearsal probes ride in this commit so they are not lost.

What is not true. The home view has no activity bar, so a manual check with no project open shows
no ring and gives no feedback until the staged menu item appears. The three menu actions were
verified through the same bridge calls the menu items dispatch, not through a click on the open
native menu, because an NSMenu popup is invisible to the accessibility tree on this machine. The
item words themselves were photographed and the dispatch is covered by 32 renderer unit tests.

**The operator's words.** "When you check for updates and have the process download, you are
confronted with many screens and then you have to wait and then something shows and then make
another choice to install on quit, which then will relaunch the app. Instead, I think it would be
nice, similar to how when you clone a git repo, there is status of what its happening shown to you
and you know where you are in the upgrade process. Ideally this would not be all the modals that we
have today but perhaps a small circular indicator with actions that could live right above the gear
settings icon in the left nav bar."

**What ships.** One small circular indicator in the activity bar, directly above the settings gear,
that carries the whole manual update journey. Its states, in order:

- hidden, which is the state almost all of the time
- checking, an indeterminate ring, shown only after a check the user started
- downloading, a determinate ring filled by real progress from the updater's download events
- staging, the short window while the OS updater verifies and stages
- ready, a calm filled state that stays until the user acts or quits
- failed, a quiet error state that never pulses

Hovering names the stage in words, e.g. "Downloading 0.26.0, 41 percent". Clicking opens a NATIVE
menu through the ui:popupMenu bridge, never a DOM menu, whose items depend on the state: when
ready, "Restart and update now" and "Install when you quit" and nothing else; when failed, "Why it
failed" and "Repair updates", which reuses the Phase 43 surfaces. "Restart and update now" calls
the updater's own quitAndInstall and adds no relaunch logic of its own, because the App Still
Running incident came from racing that window.

**What is removed.** The dialog after a user-started check and the ready dialog. The ring replaces
both. The refusal dialog from Phase 31 STAYS, because a failed install explaining itself at the
next launch is a launch-time surface with no ring on screen yet. The staged menu item under the
Tortie menu STAYS, because a menu line is not a modal and it is where Check for Updates lives.

**Background checks stay silent** until they reach ready, exactly as today. The ring must never
animate for a check the user did not start. Nothing badges, nothing counts, nothing notifies, and
the needs-input status semantics are untouched.

**Mechanics.** The updates:state channel already carries UpdateUiState to the Settings row; it
gains the download progress fields and a restart-now action rather than any parallel channel. If
the contract inventory moves, the new lines are declared in the commit body per house rule. The
update ENGINE, being Phase 24's updater.ts state machine with Phase 43's handedToInstaller
discipline, does not change. Only surfaces change.

**Tier 3**, because it touches the update path and the operator personally asked. The verifier
drives a REAL staged update end to end against a local feed through build/update-rehearsal.mjs, on
an isolated profile AND isolated cache directories, never the operator's ~/Library/Caches, per the
Phase 43 incident. Evidence: the ring photographed in downloading, ready and failed states with the
window raised first; proof no dialog appears on a manual check; proof a background check draws
nothing until ready; and one full restart-and-update-now rehearsal that comes back on the new
version. **Semver:** feat, minor, so the release this rides in becomes 0.26.0.

## Phase 60 — three interaction nits before 0.26.0 (operator reported 2026-08-16) ✅ SHIPPED 2026-08-16 (this commit, 0.26.1)

**The operator's three reports, in his words and bound as the charter.**

**1. Drag and drop dies when the dock collapses.** "When I am in the mode where the sessions are
collapsed on the right I can't drag and drop them onto the current session or off it like I can
when it is in this mode and they are expanded. This should be fixed." The dock is
src/renderer/app/SessionDock.tsx and collapse is the dockCollapsed app state; the collapsed rail
draws icon-only rows. Whatever drag surface the expanded rows carry, the collapsed rows must carry
the same: dragging a collapsed session icon into the work area joins it to the current group, and
dragging a pane out to the rail detaches it, exactly as in expanded mode. Note the keyboard flag is
disabled when collapsed at SessionDock.tsx:321; the fix must not regress that choice, only add the
pointer path.

**2. Restoring a past session whose project is not open.** "When you are looking at past sessions
and you restore a session, you might not have the project that that session is related to open. If
it is not open in your pane, it should ask you first if you want to open it" rather than silently
restoring. Surfaces: src/renderer/app/PastSessionsModal.tsx and src/renderer/app/resume.ts. The
ask is a NATIVE dialog per the UI rules, it names the project by its folder name and path, and it
offers exactly two ways forward: open the project and restore the session into it, or cancel and
change nothing. No third button. If the project folder no longer exists on disk, say that instead
and offer only cancel. A restore into an open project behaves exactly as today, with no new dialog.

**3. The View menu tells the truth about the views.** "We should ensure that Explorer, Search,
Source Control and Context are included with their hotkeys." Today src/main/menu.ts lists Explorer
and Source Control only, at lines 473 to 474. Search and Context already have keymap ids
(view.search, view.context in src/shared/keymap.ts) with accelerators; add the two menu items using
those existing accels through the same item() helper, in the activity bar's own order: Explorer,
Search, Source Control, Context. Also fix the doubled Toggle Full Screen visible in the menu today:
the template carries role togglefullscreen at menu.ts:496 AND macOS injects its own item, so the
menu shows two. Keep exactly one, whichever the spec judges native-correct.

**And the standing rule the operator asked for.** "Going forward the top menu is minded and
appropriately updated to reflect what is changing in Tortie." This phase adds one line to the UI
rules in CLAUDE.md: a phase that adds, renames or removes a user-facing surface updates the native
menus in the same commit, and the phase brief says what changed there. The rule ships in this
phase's commit so it binds every later one.

**Tier 2, with one live probe per nit and a screenshot each**, because these are single-subsystem
UI changes; the restore ask touches the restore ENTRY only, never the restore mechanics, so Tier 3
machinery is not pulled in. Probes: a real drag of a collapsed session icon into the work area and
back out, driven in the running app; a restore attempted from Past Sessions with the project
closed, showing the ask, then accepting it and landing in the restored session; the View menu read
back with all four views and their accelerators, and exactly one Toggle Full Screen. The dialog
copy follows the writing rules. **Semver:** fix, patch. Phase 58 shipped 0.26.0 on its own, so
this phase ships as 0.26.1. One finding from the live probes is recorded in the fix round: the
spec first believed macOS injects its own full screen item into any menu titled View, so the fix
dropped the template role on darwin. Measurement in the running app showed no injection and a
dead shortcut. The role is now emitted on every platform and the menu carries exactly one item.

## Phase 59 — grok build, the thirteenth compiled agent (research 50, operator requested 2026-08-16) ✅ SHIPPED 2026-08-16 (`b8c59f4`, 0.29.0)

**Specification.** docs/research/50-grok-build.md, all of section 3, is the spec of record. The
short shape: grok pre-assigns session ids with `--session-id` and resumes strictly by id from any
directory, both PROVEN live with content recall, so there is no harvest guessing and no identity
race to design around. It is the easiest add since pi. Detection probes only the name `grok` and
NEVER `agent`, which Cursor also claims and which is a stale 1.0.3 on the operator's own machine.

**Five questions must close before the registry row is committed**, and the research prices each:
the dead-id resume behavior (one turn, the unspent budget), offline behavior of the remote
fallback (zero tokens, sandbox-exec), the idle animation and tab title (zero turns, one
observation), the version probe form (a read of detection.ts), and the SpaceX brand policy read.
Questions 4, 6 and 7 close inside the phase at no extra cost.

**The icon carries a finding the operator must rule on.** His instruction is the SpaceX mark, and
the mechanical work is one vendored SVG plus one LOGOS row. But research 38's own standard gives
every shipped mark a READ brand policy and a verdict, no SpaceX policy has been read, and whether
the rocket company's mark and grok-build's "SpaceXAI" copyright holder are the same owner is
unestablished. Research 38 also ordered two mitigations that are STILL UNBUILT for the twelve
marks already shipping: the NOTICE marks line and the README disclaimer. So this phase ships both
of those mitigations for ALL thirteen marks, reads one SpaceX brand or media policy and records
the research 38 style row, and only then lands grok.svg. A design note rides along: the mark is a
wide wordmark and may be illegible at 16 px, so the Tier 1 screenshot decides between the full
wordmark and a crop to the X letterform.

**Tier 3**, because resume claims are executable: conformance:agents, conformance:resume:capture
with grok in GMUX_CONF_AGENTS, and one live roundtrip. **Runs after Phase 49** so the row is born
with its AgentInstallInfo. **Semver:** feat, minor.

**Shipped.** The verifier found one blocking defect and a fix round closed it before this
commit. grok 1.0.4 runs the turn but never paints the reply while the first-run "Help improve
Grok" banner is on screen, so the live roundtrip timed out twice at 150 s. The row's launch.env
now carries GROK_PRIVACY_NOTICE_ROLLOUT=0, which keeps the banner out of Tortie panes without
touching any sharing choice. Research 50 §8 records the mechanism. After the fix the roundtrip
passed in 26.9 s with content recall. The rebase onto Phase 49 added the row's AgentInstallInfo
from research 50 §3.12 and pinned x.ai in the installs gate.

## Phase 61 — Finder opens things INTO Tortie (operator requested 2026-08-16) ✅ SHIPPED 2026-08-16 (`6982ae4`, 0.30.0)

**The operator's words.** "Allow it to open markdown, html and other source files AND folders that
it natively supports. Opening binaries that aren't images should not be supported." The request
came from a Finder screenshot where the Open With menu for README.md listed 22 apps and not
Tortie.

**What ships.** Tortie appears in Finder's Open With menu, and receives what is opened.

- FOLDERS open as a project tab, through the pending-open machinery Phase 51 built, cold and warm.
- FILES Tortie can natively show, being markdown, HTML, source and text files, and images, open
  the right project and the file. The project is the nearest enclosing git repository root above
  the file, or the file's parent folder when no repository exists. The file opens in the editor or
  its viewer.
- BINARIES THAT ARE NOT IMAGES are NOT declared, so Finder does not offer Tortie for them. One can
  still arrive by force through Other in the Open With chooser; that opens the project and shows
  the existing no-viewer state for the file, with one log line, and never errors modally.
- THE CAP from Phase 51 carries over verbatim: an arriving path opens a project and a file and can
  NEVER start an agent, select an agent or run a command.

**Mechanics.** CFBundleDocumentTypes reach Info.plist through the packaging configuration, with
the folder type declared by its UTI and the file types by extension, role Viewer so Tortie never
seizes anyone's default. One module owns the openable-extension list, derived from what the app
can actually display per research 39 part 2, and a unit test asserts the packaging declaration and
that module agree, so the two can never drift. Main gains one open-file event handler feeding the
same pending-open path as Phase 51; macOS delivers both files and folders through it.

**Verification honesty, decided up front.** The Finder menu itself only reflects PACKAGED,
LaunchServices-registered apps, and the verifier must NEVER register a development build carrying
com.itavero.tortie with lsregister, because that would fight the operator's installed app for file
associations. So the phase proves: the built Info.plist carries exactly the declared types and not
one more, asserted on a package:dir build; the open-file delivery proven live by opening files and
folders against a DEV instance with an explicit app target, which macOS delivers regardless of
registration; the git-root project choice, the parent-folder fallback, the image path, the forced
non-image binary path and the cap, each driven live with a screenshot. The operator's acceptance
step, stated rather than implied: after the next release installs, right-click a markdown file in
Finder and see Tortie in Open With. **Tier 2** with those live probes. **Semver:** feat, minor,
0.30.0.

## Research 51 — many machines, one calm window (operator requested 2026-08-16) ✅ DELIVERED 2026-08-16, docs/research/51-remote-machines.md, NOTHING QUEUED FROM IT

**The verdict, recorded.** The thin design wins: Tortie drives each remote machine's OWN tmux over
plain /usr/bin/ssh, control mode for events and ssh -t for panes, and installs NOTHING remotely.
The federated far-side-Tortie design is rejected for now on the residency contradiction and its
falsified safety claims, with its groundwork overlap recorded. The standing law that Tortie never
builds remote infrastructure for RENTED compute stands untouched; this is about machines the
operator owns on his own tailnet, which research 28 always named first choice.

**The ladder is M0 to M6 in section 6, and nothing below M0 ships before it.** 

**Conversation continuity, the operator's stated destination (2026-08-16).** His words: when
connected, Tortie should have the ability to continue a remote conversation from another machine,
fully locally if needed. That is what the remote work builds toward if this ladder is greenlit,
and it sharpens rung M6 or becomes its own rung M7, decided in the greenlight brief. The
mechanism, from the manifest discussion that produced this note:

- While a machine is connected, harvest extends from reading conversation IDS to a READ-ONLY sync
  of the agent-native conversation stores themselves, copied home to the Mac. Harvest already
  knows every agent's store path; this is a difference of degree, not architecture.
- With the content home, a dead or unreachable machine loses only the tail since the last sync,
  and for agents whose registry row carries reconstructionTarget true, Tortie can REPLANT the
  conversation into a fresh store locally or on another machine and continue it there. Tortie
  already distinguishes continues-the-conversation from starts-fresh in Past Sessions, and this
  reuses that honesty: a replanted conversation is a reconstruction, never sold as a byte-perfect
  resume.
- The promise is stated as last-sync staleness, exactly the way capsules already state capture
  time. Sync freshness is bounded by connectivity and the copy discipline needs measurement
  before any promise, because agent stores can be large and chatty.

**Two constraints the operator set.** This capability must NOT rely on SpecStory; it rides
Tortie's own harvest reading agent-native stores, so nothing installs remotely and the capture
path has no second product in it. And as reference only, the SpecStory source at
/Users/gdc/getspecstory (specstory-cli/pkg/providers, one package per agent including grokbuild)
may be studied for how it locates and tails each agent's store across all thirteen, because that
is measured prior art on the exact per-agent file shapes this sync must read. M0 fixes a live
LOCAL defect that four machines would multiply by four: the unknown status has no producer, and
refresh() still flips every non-exited row to restorable on TMUX_UNREACHABLE, reading a dropped
link as a dead process. Both adversaries agreed M0 is unconditional and first. Restore stays
REFUSED for every remote row until M5's fault matrix runs green against a real tailnet machine.
Nine open questions are priced in section 7, with the tmux dialect measurement gating M2. Queue
nothing from this ladder without the operator's word.

**The operator's words.** "What's the best terminal emulator etc out there when running multiple
agents on multiple machines? I have been using four machines over tailscale where all of them run
inside tmux and I access them from the terminal on my mac, which feels very clunky." He wants to
think through what "with intuitive menus, options to connect to SSH that are very friendly in the
same way we already handle minimizing tmux complexity from the user" could look like, "and still
provide similar guarantees for session durability etc, which is important," toward "a killer
design."

**The base it builds on, rather than redoing.** docs/research/28-remote-sessions.md already ran
this question once at 1201 lines with a substrate survey, a build-versus-buy call and a phased
plan, and it was never queued. The world moved since it was written: Phase 41 bundled a pinned
tmux client, the tested wire-pair discipline exists, the attach host was reshaped in Phase 42, and
Phases 48 and 49 built the launch preflight and the install map. The research DISTILLS 28 first,
marks what its conclusions survive and what changed, then designs against the operator's concrete
scenario: 4 machines, tailscale, tmux everywhere, one Mac in front.

**What it must answer.** The competitive field today for multi-machine agent work; how a remote
machine becomes a first class thing in Tortie with the same identity rules, being sessions
addressed by id and never adopted when unmarked; what durability honestly means when the server is
remote, including partition, reconnect, two Torties against one remote server, and where the
manifest's truth ends; the friendly SSH surface, profiles, keys and tailscale specifics, with the
same no-vocabulary discipline that hides tmux today; and a phase ladder with costs. Deliverable is
docs/research/51-remote-machines.md in the house style with a verdict table and a what-is-not-true
section. Nothing is built from it without the operator's word.

## Phase 62 — a minimal theme system: highlight schemes and a contrast lift (operator requested 2026-08-16) ✅ SHIPPED 2026-08-16 (`c8508ec`, 0.31.0)

**The operator's words.** "Build a minimal theme system into settings that allows for the color
scheme of the highlighting to be changed BUT also to enable brightening of contrast etc as on some
less vivid displays some of tortie is quite muted. This would supplement the brightness
capabilities on the mac and make it easier to see with sharpness tortie in its full glory. Where an
external approach can be used and it retains or minimizes custom code, please investigate but then
build a candidate solution." His message referenced an image that did not arrive; the charter
reads "the highlighting" as the selection and focus highlight family, and the token mechanism
covers any color family if he meant a different one.

**What ships.** An Appearance section in Settings with two controls and nothing else.

- HIGHLIGHT SCHEME: a small set of preset accent schemes for the selection and focus highlight
  family, applied by overriding the existing custom properties in
  src/renderer/styles/tokens.css at runtime. Presets only, no free color picker, because minimal
  is the operator's word. The default preset is byte-identical to today.
- CONTRAST: a stepped control, Normal, Raised, High. Raised and High transform the token palette
  perceptually, lifting lightness contrast and chroma so muted surfaces separate on dim displays.
  Normal changes nothing: a user who never opens the section sees today's exact colors.

**The external approach, per the assemble rule.** The spec stage investigates and picks the
smallest maintained color library for the perceptual math, e.g. culori, MIT, tree shakeable, OKLCH
transforms, against colorjs.io, and vendors nothing hand rolled beyond the token override wiring.
The library runs at build or in the renderer as a compiled dependency, which the charter permits
and Phase 23 does not forbid. Settings persistence rides the existing settings store, and any new
gmux.* key or channel is declared with the baseline re-based in the same commit.

**What must stay true.** All colors via tokens with no literals introduced, asserted by the
existing discipline. The terminal's own xterm theme is OUT of scope for this phase except the
selection highlight if it shares a token. Status semantics and every other UI rule untouched. The
native menus gain nothing, because Settings sections are not menu surfaces, and the CLAUDE.md
menu rule is therefore not triggered.

**Tier 2.** Screenshots of each preset and each contrast step with the window raised; a byte
assertion that Normal plus the default preset renders today's tokens exactly; persistence across a
relaunch; and the drift test that the preset definitions cover every token they claim to.
**Semver:** feat, minor, 0.31.0.

## Phase 62.1 — the recorded nits round (operator ordered 2026-08-16) ✅ SHIPPED 2026-08-17 (a3dcb53, 0.31.3, gates green)

Three small reports left behind by shipped phases, fixed as one sub-phase per house style.

1. FROM PHASE 58: a manual Check for Updates started from the home screen gives no feedback,
because the home view has no activity bar and therefore no ring. Give the home screen the
smallest calm signal of the journey without building an activity bar there; the spec decides the
mechanism and the Zen decides its volume. Background checks stay invisible as always.
2. FROM PHASE 60: prove on a packaged build that the View menu shows exactly one Toggle Full
Screen, which measurement predicts, and only if two are ever found, guard at runtime. The
operator's original doubled-item screenshot was never reproduced and this closes the question.
3. FROM PHASE 61: a multi-file open could leave focus on the first file instead of the last, seen
once in three verifier runs. The last opened file wins the tab, made reliable.

**Tier 2**, one live probe per nit with a screenshot. **Semver:** fix, patch.

**What shipped, nit 1.** The home screen now carries one line of muted text directly under the
TORTIE.sh lockup. It names what the update journey is doing, in the same words the activity bar
ring uses. It is text only. There is no button, no menu and no motion on any path. The words moved
into one module, src/renderer/app/update-words.ts, and the ring's hover recomposes its sentence
from those same words, so the two surfaces cannot drift apart. The slot is reserved at 24 px in
every state, whether or not it is showing words, so the column never shifts when the words appear.
The tallest home state is 514 px now instead of 490 px, and the centring rule in home-screen.css is
otherwise unchanged. Main still decides what is visible, so a background check stays silent here
exactly as it does on the ring, and a background journey that reaches ready still shows. The live
probe drove the packaged app: the slot existed and was silent before any check, it read "Checking
for updates" 11 ms after Check for Updates was clicked, and "The update check failed." 66 ms after
that, against a dead feed. Screenshot out/p62.1-home-update-line.png.

**What shipped, nit 2, and this entry's own prediction was wrong.** The operator was right and
Phase 60 was wrong. On a packaged build the View menu carried TWO rows named "Toggle Full Screen",
one bound to the globe key plus F and one bound to control-command-F. The doubling was reproduced
on four launches from four fresh profiles and photographed each time. Phase 60 missed it because it
counted rows through the macOS accessibility interface, and that interface lists only one of the
two rows when the app declares `{ role: 'togglefullscreen' }`. It reported 15 rows while 16 were on
screen. So the guard branch written above is the branch that applied. The guard is not a runtime
filter, because Electron can neither see nor remove the row macOS adds. Instead the app now
declares NO VISIBLE full screen row. macOS adds its own "Enter Full Screen" on the globe key plus
F, and the app keeps a HIDDEN item that carries control-command-F with
`acceleratorWorksWhenHidden`, so the chord the operator has been pressing since Phase 60 still
works and was photographed working. Four shapes were measured on the packaged build. Declaring the
role gives two rows, declaring a plain visible item gives two rows, declaring nothing gives one,
and this hidden item gives one. The candidate remedy the spec named, launching with
`-NSFullScreenMenuItemEverywhere NO`, left both rows on screen, and so did the `0` form. The
committer re-ran build/probe-fullscreen-menu.mjs against the packaged build and read the
photograph with his own eyes: 15 rows on screen, one full screen row, named "Enter Full Screen" on
the globe key plus F. Screenshot out/p62.1-view-menu.png. The comment Phase 60 left in
src/main/menu.ts said the opposite of all of this and is replaced by the measurement.

**What shipped, nit 3.** A multi-file open now leaves focus on the last file every time. Every
pending shell open runs on one promise chain in src/renderer/state/shell-open.ts, so one delivery
finishes before the next one starts and emit order matches arrival order. Before this, a first file
whose project was not open yet waited on `addProjectPath` while the second file overtook it, and
the editor activates whichever open arrives last. Ten of ten probe rounds passed: both tabs
present, b.md active, the pane showing the second file's marker, and all of it still true after a
2000 ms settle. Screenshot out/p62.1-last-file-wins.png.

**What is not true.**

- The View menu no longer shows the words "Toggle Full Screen". The visible row is macOS's own
  "Enter Full Screen" on the globe key plus F. Control-command-F still works, and no menu row
  displays that chord any more.
- A dev build gets no macOS row at all, so in dev the View menu has no full screen row and only the
  chord works. A dev build is therefore not evidence about this question, which is exactly how
  Phase 60 went wrong.
- The home line's downloading, staging and ready stages are proven by unit tests and by the shared
  words module, not driven live. The live probe drove checking and failed only. The Phase 58
  rehearsal harness edits package.json and overwrites the packaged app, so it was not run inside
  the worktree this commit was staged from.
- The coalescing path in nit 3 was never exercised live. The main-side line "a newer shell open
  replaced a pending one" appeared zero times in ten rounds, because the pending slot was always
  taken before the second file arrived. That path has unit coverage only.
- The original race in nit 3 has no deterministic witness. Ten green rounds plus the ordering unit
  tests are the evidence, and a run that used to fail about once in three is not proof by itself.

## Phases 67 to 73 — the remote ladder, M0 to M6 given their phase names (operator greenlit 2026-08-16) QUEUED IN ORDER

The operator's word: build M0 to M6, referred to by phase numbers for consistency.
docs/research/51-remote-machines.md is the specification of record for every rung, its section 6
table maps rung to phase, and its section 4.6 durability promises are binding copy. STANDING
SAFETY FOR THE WHOLE LADDER: no workflow ever connects to the operator's real machines
unattended. All remote verification runs against a scratch sshd on 127.0.0.1 on a high port with
keys generated in the scratchpad, which is a real ssh carriage with none of his fleet in it. The
measurements that genuinely need his four machines, the tmux dialect survey and the M5 fault
matrix on a real tailnet machine, are recorded as owed and run only when he is present.

| Phase | Was | Contents, from research 51 section 6 | Tier |
| --- | --- | --- | --- |
| 67 | M0 | ✅ SHIPPED 2026-08-17 (95aa770, 0.31.2, gates green), section below. `unknown` gets its producer at a per-machine reconcile boundary; restore and input refused while unreachable; the machine-level Unreachable presentation. Fixes the live LOCAL defect where refresh() flips every non-exited row to restorable on TMUX_UNREACHABLE. The local socket adopts the boundary immediately, decided per the operator's standing autonomy preference, because the local bug IS the point | 3 |
| 68 | M1 | ✅ SHIPPED 2026-08-17 (this commit, 0.32.0, gates green), section below. machines.json behind the confirm gate and seal, conformance:machines, the Settings surface, the tailscale picker from a pinned absolute path, the one visible connection test | 2 plus the gate |
| 69 | M2 | ✅ SHIPPED 2026-08-17 (4c86bea, 0.33.0, gates green), section below. MachineContext replaces the singleton; the exec plane over ssh with at-least-once discipline; remote server boot with -f /dev/null plus BOOT_SERVER_OPTIONS asserted; PATH capture ordered before first mutation; the version probe and refusal screen with remedy; error taxonomy golden files; keepalives from measurement. The dialect posture is a TESTED LIST that starts from locally measured versions and fails closed, so an unmeasured version is refused with the upgrade remedy, and his four machines join the list after the measurement he attends | 3 |
| 70 | M3 | ✅ SHIPPED 2026-08-17 (17f1dea, 0.34.0, gates green), section below. Attach over ssh -t in node-pty; create, kill and rename remote; the machine badge; session list by exec polling; restore REFUSED for every remote row with a visible coming label; the vocabulary audit. First visible operator value | 3 |
| 71 | M4 | ✅ SHIPPED 2026-08-17 (this commit, 0.35.0, gates green), section below. The control plane per machine replaces polling; per-machine reconcile; the machine_id migration; the section 4.4 case table live; pane-env rescue over the exec plane; the partition harness in the spirit of smoke:fault, driven by killing the scratch sshd mid-flight. **Plus the hole Phase 70's verifier measured and Phase 70 did not close.** A confirmed machine that does not answer when Tortie starts shows nothing at all in the main window. A row exists only after a poll, a poll starts only after a prepare, and a machine that is asleep never prepares, so the person is not told that the machine exists, that it did not answer, or that their sessions there are untouched. The per-machine reconcile is where a row that survives a launch comes from, so the fix belongs here | 3 |
| 72 | M5 | ✅ SHIPPED 2026-08-17 (this commit, 0.36.0, gates green), section below. Remote restore enabled behind the fault matrix; per machine program capture; the saved output panel; provenance gated resume arming; the forget-machine record. The ten row matrix runs green against the scratch sshd, and the real tailnet repetition is OWED and recorded. **Plus four defects the fix round found and closed**, being restore refused for ever after the far side's own session server died, the local reconcile writing `restorable` onto every remote row, the saved output surface being unreachable because nothing produced `savedOutputAt`, and no remote session ever being copied twice because the skip rule read `#{session_activity}`, which does not move for a session nobody is attached to | 3 |
| 73 | M6 | Connected-only harvest polling; the remote env value probe with the traced byte path; image upload; the read-only remote review answer through existing diff surfaces; and the conversation-continuity groundwork from the ladder note, being connected-time read-only sync of agent-native stores with the promise stated as last-sync staleness. Cross-machine reconstruction into target agents lands here if provable against the scratch sshd, else it is recorded as Phase 74 | 3 |

Phases 67 and 62.1 run in parallel in isolated worktrees because their files are disjoint; 68
through 73 run strictly in order, each gated on the one before, each landed and pushed before the
next launches. **Semver:** 67 is a fix, patch; 68 through 73 are feats, minor each.

## The eight open GitHub issues, assessed against the code on 2026-08-17

All eight were opened by `aronchick` on 2026-08-17 and all were read against the real tree at
`b660df9` by eight independent assessors and one adversarial critic. **Three of the eight rest on a
claim the code contradicts, and one more is understated.** Those findings come first, because they
change what is worth building.

| Issue | The claim | What the code says |
| --- | --- | --- |
| 4 | A person cannot get a work surface until the New Session sheet is submitted | False. THREE create paths already skip the sheet. The menu beside the plus button calls `quickCreate` in `src/renderer/state/sessions-slice.ts`, the no-sessions board starts an agent on one click at `src/renderer/app/EmptyStates.tsx:139`, and a per-agent chord recorded in Settings creates and focuses a session with no dialog at `src/renderer/settings/integration.ts:32`. The issue is written against a limit that does not exist |
| 6 | The folder chosen in New Project is the project folder, so its name should fill Name | False. The field is labelled "Create it in" and it selects a PARENT. `src/main/projects/create.ts:79` joins parent to name, so building the request would suggest `/Users/me/src/src`. The issue also says no single folder-to-name rule exists. One does, at `src/main/sessions/core.ts:2836`, and every route reaches it |
| 3 | Tortie needs a model comparison against IDE, terminal and agent workspace patterns | Already written. `docs/research/10-multi-project-ux.md` compares eleven products, names the two archetypes, records the decision and records the condition that would falsify it. Only the smaller half of the issue, whether to rename the create verb, is genuinely open |
| 2 | Control plus digit is free for session shortcuts | Understated rather than false. The shipped xterm build maps key codes 51 to 55 to control characters, so Control 3 already sends ESC and Control 4 through Control 8 send FS, GS, RS, US and DEL. Six of the ten requested chords already do something in every live session, and ESC is how an agent is cancelled |

Two smaller corrections. Issue 1 says the design history removed a Settings font control in favour of
zoom. `docs/DESIGN-SPEC.md:601` withdrew the SIZE stepper and conditionally sanctioned the FAMILY
picker, so the half the issue most wants is the half already rejected. Issue 1 also assumes zoom
arithmetic would have to change. It already takes the base as an argument at
`src/renderer/zoom/regions.ts:151`, so none moves.

**The consolidated verdict.**

| # | Short name | Verdict | Tier | Where it goes |
| --- | --- | --- | --- | --- |
| 8 | A Tortie shell is not a login shell, so completions break | BUG | 3 | Phase 74 |
| 6 | New Project naming, the two real defects only | NIT | 1 and 2 | Phase 74 |
| 5 | The SpecStory sign-in tab stays open | EXTERNAL | 1 | Phase 74, caption only |
| 3 | What the unit of work is, and what the create verb is called | DESIGN | n/a | Phase 75, research |
| 4 | An immediate work surface on the New Tab chord | DESIGN | 3 | Blocked by 75 |
| 2 | A positional shortcut that reaches a session | DESIGN | 2 to 3 | Blocked by 75 |
| 7 | A filter field in the shortcuts overlay | DESIGN | 2 | Blocked on one measurement, below |
| 1 | Font family and base size in Settings | DESIGN | 2 to 3 | Blocked on one operator decision, below |

**Issue 7 is not in the batch, and the reason is a measurement.** The whole case for the filter is
that about 60 rows overflow the sheet. `src/renderer/styles/app.css:1436` gives the shipped overlay
three columns, `max-height: 78vh` and `width: min(880px, ...)`. Sixty rows in six groups is about 20
rows per column at 26 px, so roughly 680 px in total. At 78 vh that fits any window taller than about
870 px, and a 14 inch MacBook Pro gives 982 logical pixels. On the operator's own machine the overlay
does not scroll unless several per-agent chords are assigned. Measure that on his window before
building anything. If it does not overflow, the honest answer is that the filter is IDE parity work
and the scope guardrail refuses it. Two further facts if it is ever built: `nameOrChordMatches` and
`filterForReading` in `src/renderer/settings/KeyboardSection.tsx` already solve the exact ordering
problem and should be lifted into `src/shared/keymap.ts` rather than a second scorer being created,
and `docs/DESIGN-SPEC.md:526` still describes a 640 px two-column overlay while the code ships 880 px
and three columns, so the spec and the code already disagree.

**Issue 1 is blocked on one sentence from the operator.** Where does the font list come from. The
three choices are a short fixed list of faces the design vouches for, a free-text field with a safe
fallback, or a Chromium permission-gated enumeration. There is no font enumeration anywhere in the
repository today, so this is a new capability rather than a wiring job. Nothing else about the issue
is hard.

## Phase 74 — the small-issue batch: login shells, project naming, sign-in copy, NOT QUEUED

**Closes issues 8 and 5, and the two real defects behind issue 6.** It does not close issue 6 as
written, because the name suggestion the issue asks for would produce a wrong path.

**Subject:** `fix(shell): a shell session starts as a login shell, and New Project names honestly`
**First body line:** `Phase 74: the small-issue batch`
**Semver:** patch. Every item is a fix.
**Tier per item, not promoted to the maximum.**

| Item | Tier | Reason |
| --- | --- | --- |
| Issue 8, login shell parity | 3 | It reaches `src/main/restore/restore.ts` and the manifest's shell argv, and a user reported it |
| Issue 6, the root-folder fallback | 2 | One line in main's `addProject`, plus a new preload channel |
| Issue 6, the picker message, and issue 5's caption | 1 | Copy with no new state |

**The decision a builder must not invent, with its answer.** Add `-l` to the shell argv at both
spawn sites and gate the restore-side change on `agent === 'shell'`. The flag matches what tmux does
on its no-command branch and what Terminal.app does, and it is two call sites rather than a list of
variable names someone has to keep current. The gate matters because `src/main/restore/restore.ts`
opens a holder shell for EVERY session, so an ungated change would run `.zprofile` for agent restores
too, which is the shape Phase 33 already rejected at `docs/BACKLOG.md:3378`. Phase 33 gave two
reasons against a login shell. The first, that it re-runs agent-writable rc code, applies to agent
launches and is contained by the gate. The second, that it deepens the process tree and endangers the
bare-name `pkill` property, does not apply at all, because `zsh -l` execs in place and adds no
process. Say both in the phase brief so a reviewer does not stop the round. Rejected alternatives:
passing no argv and letting tmux start `default-shell` as a login shell, which is rejected because
tmux would pick `default-shell` rather than `$SHELL` and the manifest row would carry no argv that
restart and history both read; and copying `FPATH` and friends into the pane, which is rejected
because it fixes only the names somebody lists.

**A second defect found in the same lines, and it must be decided in this phase.**
`src/main/restore/restore.ts:775` passes `argv: [shell]` and never reads `rec.argv`, so a restored
shell session ALREADY loses every extra flag it was launched with. On that one path the manifest is
not the source of truth that CLAUDE.md says it is. Builder A is editing exactly those lines, so
either read `rec.argv` for shell rows, which is the correct shape, or record in the commit that the
divergence is knowingly kept and why. Do not leave it unmentioned.

**A frozen contract must not be edited.** `src/shared/ipc/base.ts` is marked FROZEN and says existing
declarations must not be changed and new ones may be appended. The picker message needs a channel
that takes an argument, and `projects:pickDirectory` takes none. APPEND a new channel. Do not widen
the frozen one. `src/renderer/app/HomeScreen.tsx:222` already documents this constraint in a comment.

**Builder split, disjoint, with every file each builder actually needs.**

| Builder | Owns | Item |
| --- | --- | --- |
| A | `src/main/manifest/agents.ts`, `src/main/restore/restore.ts`, `src/main/restart/extras.ts` and their tests | 8 |
| B | `src/main/ipc.ts`, `src/shared/ipc/base.ts` append only, `src/preload/projects.ts`, `src/main/sessions/core.ts`, `src/renderer/app/NewProjectModal.tsx` | 6 |
| C | `src/renderer/settings/SpecStorySection.tsx` | 5 |

Builder A reads `src/main/sessions/core.ts` and does not edit it. Builder B owns it.

**Native menus.** No item adds, renames or removes a user-facing surface, so no menu changes. The
brief says this out loud so a reviewer does not go looking for a missing menu edit.

**Probes.** Drive a real shell session and complete a path, reading the pane bytes and showing the
`_eza` autoload errors are gone and the existing directory lists. Create a shell session with an
extra flag, quit, relaunch, and read the restored pane's argv, quoting the bytes. Pick a root folder
in New Project and show the fallback name rather than an empty field. Read the picker message and the
SpecStory caption by screenshot.

## Phase 75 — research: the unit of work, and what a session digit counts, NOT QUEUED

**The question it answers.** Is a project still the primary unit of work in Tortie, and if so what is
the create verb called and which chord reaches a session by position. Issues 3, 4 and 2 are all
unbuildable until this is written, and issue 4 in particular cannot start because nobody has decided
whether an unstarted session may exist at all.

**Artifact.** `docs/research/52-unit-of-work.md`.

**The six questions it must answer.**

1. Does the project stay the primary unit, or does a session become primary with the directory as a property.
2. Is the create verb renamed, and if so what does it become across the File menu, the tray, the terminal menu, the create sheet title and the two toasts in `App.tsx`.
3. May an unstarted session exist, meaning a visible surface with no manifest row and no tmux session. Answer yes or no plainly, because issue 4 is unbuildable until this is answered.
4. Which modifier carries a positional session shortcut, given that Control 3 through Control 8 already send ESC, FS, GS, RS, US and DEL into every live session.
5. Does a session digit count surfaces or sessions. `deriveSurfaces` in `src/renderer/state/layout.ts:162` makes these different lists as soon as one split group is open.
6. Who owns the zoom-reset chord. It is `view.zoomReset` today, shipped in Phase 12.11 and written into `DESIGN.md:301`.

**It measures ONE thing, and the reason the other candidates were cut.** Read the operator's manifest,
read only, and check whether the falsification condition in `docs/research/10-multi-project-ux.md`
section 9 has been reached, being more than five concurrent agents per project on one repository.
That condition is the only recorded test for whether the model should move, and if it has not fired
the honest answer to question 1 is that the model stays.

| Candidate measurement | Kept or cut | Deciding reason |
| --- | --- | --- |
| The falsification check against research 10 section 9 | KEPT | One manifest read, and it is the only recorded test that can move the answer |
| A per-agent matrix of what Control 3 through Control 8 do to each of the thirteen agents | CUT | The one line in the shipped xterm bundle already decides it. Any chord Tortie intercepts is taken from every agent at once, so the matrix would only measure how much it hurts. Record the grep as evidence and answer question 4 in a sentence. Thirteen agents times six chords is 78 live probes, which is Tier 3 driving inside a document phase |
| Counting surfaces against sessions in the operator's window | CUT | `deriveSurfaces` already shows the lists differ only when a split group is open, and every session surface draws from surfaces. The zero-cost answer is to count surfaces, and no measurement changes it |

**The options it must weigh, with every rejected one recorded and a deciding reason on each.** For
question 1 the options are keeping projects primary and changing nothing, keeping projects primary
while renaming the create verb and adding a direct new-work entry, and making sessions primary with
the project path becoming a property. The third touches the manifest schema on a NOT NULL column plus
restore, so its cost must be stated in files rather than adjectives. For question 4 the options are
Control plus digit, moving projects elsewhere to free Command plus digit, Command Option plus digit,
Control Option plus digit, and shipping no positional session shortcut at all.

**What it explicitly does NOT do.** It writes no code and opens no pull request. It does not touch
the manifest schema or any migration. It does not re-derive the eleven-product comparison in
`docs/research/10-multi-project-ux.md`, it cites that and extends it only where these questions are
not already answered. It does not decide fonts, the SpecStory sign-in, project naming or the
shortcuts filter. It runs no tmux command against the default server, and any live probe uses
`-L gmux` only.

## Phase 76 — appearance and discoverability, NOT QUEUED and BLOCKED ON ONE DECISION

This exists so that every open issue has a home. It covers issues 1 and 7, which Phase 74 does not
touch and Phase 75 does not answer. Neither can start today, and the reasons are different.

**Issue 7, the shortcuts overlay filter, now has a measured trigger rather than a preference.** The
whole case for it was that the sheet overflows. It was measured on 2026-08-17 against the real
layout and the operator's real display, and the answer has a condition in it.

| Case | Overlay height | Available at 78vh on a 1512 by 982 display | Result |
| --- | --- | --- | --- |
| The 60 built-in shortcuts alone | 677 px | 733 px | Fits, 56 px spare |
| Plus 13 per-agent chords, one per compiled agent | 807 px | 733 px | Overflows by 74 px |

The numbers come from 60 rows carrying a `keys` field across 7 section headings, three balanced
columns at `columns: 3`, a 26 px `.shortcut-row`, an 11 px heading on a 16 px line with a 6 px
margin, and 16 px between groups. They are computed from the tokens and the counts, not read from a
rendered window, so they are close rather than exact. **The build condition is therefore: build the
filter when per-agent chords are in normal use, and not before.** Until then the scope guardrail
refuses it, because a list that fits on screen does not need a search field and Tortie is not a
VS Code reimplementation.

Two things bind whenever it is built. First, do not add a second scoring implementation.
`nameOrChordMatches` and `filterForReading` in `src/renderer/settings/KeyboardSection.tsx` already
solve the exact ordering problem, and the comment above the second one describes it. Lift both into
`src/shared/keymap.ts` and call them from both surfaces, which deletes a duplicate instead of
creating a dependency. Second, `docs/DESIGN-SPEC.md:526` still describes a 640 px two column overlay
while the code ships 880 px and three columns, so the spec and the code already disagree and whoever
edits section S8 fixes that in the same commit.

**Issue 1, fonts, is blocked on one sentence from the operator and nothing else.** Where does the
font list come from. There is no font enumeration anywhere in the repository today, so this is a new
capability rather than a wiring job.

| Option | What it costs |
| --- | --- |
| A short fixed list of faces the design vouches for | Smallest. No new capability, and every name is one the design already trusts |
| A free-text field with a safe fallback | Small. The person can name anything, and an unavailable name must not produce blank or broken text |
| A Chromium permission-gated enumeration of installed fonts | Largest. It is a new capability, it asks the person for permission, and it reads the font list off their machine |

Two facts correct the issue as written. `docs/DESIGN-SPEC.md:601` withdrew the SIZE stepper and
conditionally sanctioned the FAMILY picker, so the half the issue most wants is the half already
rejected and reversing that needs its own reason. And zoom already takes the base size as an
argument at `src/renderer/zoom/regions.ts:151`, so it stays a multiplier with no arithmetic moving.

**Issue 2 has no phase of its own on purpose.** The chord decision and the rename decision land
together, so whatever phase implements Phase 75's answer implements issue 2 as well. Splitting them
would mean deciding the same thing twice.

**Coverage, so nothing is homeless.**

| Issue | Home |
| --- | --- |
| 8 zsh completion | Phase 74 |
| 5 SpecStory sign-in tab | Phase 74, caption only. The real fix is in SpecStory Cloud |
| 6 project naming | Phase 74, the two real defects. Closed as written |
| 3 session model | Phase 75. Closed on GitHub, the open half tracked here |
| 4 immediate work surface | Phase 75 answers its blocking question. Closed on GitHub |
| 2 number shortcuts | Folded into whatever implements Phase 75 |
| 7 shortcuts filter | This phase, on the measured condition above |
| 1 fonts | This phase, on one decision from the operator |

## The two audits, verified against the tree on 2026-08-17

Six assessors read `docs/audits/2026-08-16-electron-typescript-architecture.md` and
`docs/audits/2026-08-17-performance-and-simplification.md` against `2867223`, and one adversarial
critic checked their work and re-measured every load-bearing claim. **Both audits have drifted.**
Every named finding still holds in mechanism. Twelve counted figures moved, and five claims are
wrong about the code rather than merely out of date.

**Counted figures that moved.**

| Figure | Audit said | Measured at 2867223 |
| --- | --- | --- |
| Production TypeScript files | 639 | 691 |
| Production imports | 3,299 | 3,648 |
| Production lines outside tests | 155,161 | 173,363 |
| Invoke channels | 144 | 157 |
| `src/main/sessions/core.ts` | 2,822 lines | 3,192 lines |
| `createSession` span | about 384 lines | 410 lines |
| Manifest schema version | 12 | 13 |
| Harness dispatcher modes | 20 | 24 |
| Eager renderer JS main chunk | 3,240,081 bytes | 3,265,154 bytes |

**Five claims are wrong about the code, not just old.**

| Claim | What the code says |
| --- | --- |
| The Finder-open cycle is three files | It has FIVE members. `shell-open.ts:97` dynamically imports `../editor/store`, which reaches `tab-io.ts:25` and back to `state/store`. A full graph walk finds five cyclic components across 691 files |
| The cycle guard fixed the editor-store cycle | The forbidden edge is gone and the two files are back in one cyclic component through a specifier a string scan cannot see. `source-scan.test.ts:15` says so itself, being "string scans of the one forbidden specifier per file, not a graph walk". The guard reports a repair that no longer holds |
| Fix 1 step 5, start packaged tmux from its bundle path | Already true since Phase 41. `resolve.ts:734` returns the bundle path and never reads PATH |
| Fix 3, a hidden project's dirty badge consumes the warm status | No visible surface consumes a hidden project's status. `ActivityBar.tsx:186` returns 0 without an active project |
| Fix 5, thirteen executable probes can run | Two registry entries are `kind: 'ide'` and return before any subprocess, and an unresolved binary never probes. The ceiling is eleven |

**A stale comment in the code blocks a judgement.** `src/main/tmux/supervisor.ts:422` explains the
PATH read by saying a tmux in an exotic login-shell directory should still be found. That is false
for a packaged build and TRUE for a development build, where `resolve.ts:785` does resolve tmux
against PATH. Anyone deciding whether the `await getUserPath()` can move will read that comment and
stop. Correct it without deleting the development-build truth.

**Neither audit mentions `src/main/machines`, and that is our own doing.** The domain is 24
production files and 9,603 lines, it is on the boot path through `void initMachines()` at
`src/main/index.ts:463` and `void core.signInToConfirmedMachines()` at `core.ts:740`, and its
largest file `remote-sessions.ts` is 1,446 lines, which is bigger than both `src/shared/types.ts`
and `src/renderer/app/App.tsx`, the two files the architecture audit named as split targets. The
performance audit's subsystem table has no row for it and its idle table omits the remote poll. The
remote ladder built exactly the shape the audits warn about, in the weeks after they were written.
Nothing is broken. It is unmapped, and the next audit refresh owns it.

## Phase 80.1 — session focus mode, the build (operator queued 2026-08-17) QUEUED

The build the research in `docs/research/53-session-focus-mode.md` earned. Section 9 of that
document is the charter and a builder does not re-litigate section 0, which already decided the
product, the unit, the engine, the flight, the glow and the persistence question with a reason on
each row.

**What a person gets.** One chord grows the session they are in, including a split group of up to
six leaves, until only that work remains. The title bar, activity bar, sidebar, editor and session
strip recede, and a soft wash in the session's own status colour fills the space they leave. The
same chord, Escape, or a View menu item puts every region back exactly as it was. Sessions keep
running throughout and the window is still one window.

**The sentence that is the whole design, quoted from the research.** Nothing animates the live
terminal's layout box while it is attached. DESIGN.md section 5 forbids animation over live output,
and `work-area.css` forbids width transitions because every animated frame is a ResizeObserver fit
and every fit is a tmux resize. So the flight runs on a STILL COPY and swaps to the live hosts once,
at the end.

**Decided already, do not re-open.**

| Question | Decision |
| --- | --- |
| Product | In-window focus of the active surface, not macOS full screen and not a second window |
| Unit | The whole surface including every split leaf, never one leaf pulled out of a group |
| Engine | The Web Animations API that Chromium already ships. No new package. GSAP refused on licence, Motion refused as weight for one tween |
| Flight | Still copy, First Last Invert Play, then one live swap |
| Glow | A status wash on the vacated chrome, never a halo on the terminal |
| Persistence | Never. Editor fill already proved a mode you cannot see the exit from at launch is a trap |
| Duration | `--dur-panel` at 200 ms with `--ease-out`, inside the existing 250 ms cap |

**Subject:** `feat(sessions): one chord gives a session the whole window`
**First body line:** `Phase 80.1: session focus mode, the build`
**Semver:** minor.
**Tier 2 for enter and leave. Tier 3 for one claim only**, being that a live multiplexed surface
receives no resize until the flight ends. That claim is the reason the still copy exists, so it is
the claim that gets driven.

**A FENCE, because Phase 78 is in flight.** Phase 78, the font presets, owns
`src/renderer/styles/tokens.css`. If this phase needs a new token for the wash alpha, it waits for
78 to land or it uses an existing token. It must not edit that file concurrently. Everything else it
needs is unowned.

**Files a builder should expect.** `src/renderer/state/chrome-slice.ts` for the memento,
`src/renderer/app/App.tsx` and the work area for the layer, a new small module such as
`src/renderer/app/session-focus.ts` for the copy and the flight and the swap, `src/shared/keymap.ts`
and `src/main/menu.ts` for the chord and the row, and one sentence in DESIGN.md section 5.

**What must not be touched.** tmux, the manifest, and the rule that hidden sessions stay detached.
Window full screen and its single packaged row, which Phase 62.1 measured and fixed. Editor fill's
meaning: the two modes may both be on, focus owns the session and fill owns the file, and if both
would hide the same chrome then one memento stack is enough with last in first out, and the builder
writes that down and tests it. Activity status rules.

**The chord is chosen at build time** against `src/shared/keymap.ts` and the operator's own recorded
per-agent hotkeys. The research notes Shift-Command-C is free. The CLAUDE.md menu rule applies
because a View row is added, so the native menus change in the same commit.

**Proof the phase must produce, from section 9 of the research.**

1. Enter and leave restore sidebar width, dock width, editor width and strip orientation byte for byte, unless the person moved them.
2. During the 200 ms flight `sessions.resize` is NOT called, and after the swap it is called exactly once per visible leaf. This is the Tier 3 item.
3. A two leaf split stays two leaves and both stay attached.
4. A restorable selected session does not enter the mode.
5. Reduced motion is instant, with no flight.
6. Control-Command-F still toggles window full screen and a packaged build still shows exactly one full screen row.
7. Screenshots of enter, of the settled focus, and of leave, read by eye.

## Phase 79 — the Machines screen tells you what to do (operator reported 2026-08-17) ✅ SHIPPED 2026-08-17 (3e1ba07, 0.36.1, gates green, CI green)

**What landed, and the two places the plan below was wrong.** All seven items shipped. The stale
sentence is gone and a test named RETIRED_CLAIMS fails if any string in the copy file makes that
claim again while the rung that disproves it is still in main. The empty state is a heading, one
sentence and one button. The Tailscale panel has three states and the missing one shows `brew
install --cask tailscale` in mono with a copy button, in the agent scan's shape. The tailnet list
draws the tailnet name where Tailscale reports no hostname, and a device that cannot host a session
stays in the list, dimmed, with its button disabled and the words "Cannot run a session" on it.
That is the phase picking the mark rather than the omission. Every one of the fourteen outcome
classes has a remedy or an explicit null, and the refused remedy names System Settings, General,
Sharing and Remote Login. The version gate is drawn above the test button rather than after it.

The first thing the plan got wrong is defect two. Main was not masking a `missing` source in a way
the renderer could see, because `readTailnetMachines` returns early with `source: 'missing'`
whenever the path is null, so the line that relabels it was already unreachable for that value. The
pre-phase renderer did draw a sentence when the binary was null. What was actually absent is the
install command, the copy affordance and the reason Tortie wants Tailscale, and all three are
renderer work. The one word main edit still shipped, because a line that relabels a resolved source
is a hazard, but it is a tidy rather than the cure.

The second is the probe instruction. Pointing `GMUX_TAILSCALE_BIN` at a path that does not exist
cannot produce the not-installed state on this Mac, because `resolveTailscale` ignores an override
that is not an executable file and falls through to a pinned list, and two of the three pinned
paths hold a program here. The verifier produced the state by denying the Electron process read
access to those three paths with `sandbox-exec`. The operator's Tailscale was never removed, moved
or altered.

**What is not true.** No ssh key is generated or installed for a person, which is Phase 79.1 and
runs after 72. Tortie still cannot turn on Remote Login, and no phase will. The remedy sentence is
the whole answer there.

The operator photographed the Machines section twice and said it is a wall of text that does not
tell a person what to do, and asked for the shape Tortie already uses for the agent scan. Checking
it turned up three defects nobody reported.

**DEFECT ONE, THE SCREEN IS LYING.** `src/renderer/settings/machines-copy.ts:62` says "You cannot
open a session on a machine yet. Opening sessions comes later." Phase 70 shipped remote sessions
today at 0.34.0. The sentence has been false since it landed, and it went stale because it sits in a
block nobody re-reads.

**DEFECT TWO, TORTIE CANNOT TELL YOU TO INSTALL TAILSCALE.**
`src/main/machines/tailscale.ts:282` reads `source: resolution.source === 'missing' ? 'pinned' :
resolution.source`. The wire type at `src/shared/ipc/machines.ts:118` declares `'missing'` as a
value and main overwrites it before sending, so the renderer can never learn that Tailscale is
absent. A person without Tailscale gets an empty list and no explanation. This is a one word fix in
main and it is the only main-side edit in this phase.

**DEFECT THREE, THE TAILNET LIST SHOWS "localhost".** Two of the operator's rows render as
`localhost` because Tailscale reports no hostname for an iOS device and the code falls back to a raw
field. The wire already carries `os` and `online` per row, at `machines.ts:106` and `:107`, so
nothing is missing to fix it.

**THE FOURTH THING IS NOT A DEFECT AND IT MATTERS MOST.** The operator could not use the feature at
all, because macOS ships with Remote Login off and his ssh returned "Connection refused". Tortie
classified that correctly and said "Something is at that address and it is not accepting connections
on this port." That is diagnostically perfect and practically useless. **The taxonomy is a diagnosis
and it should be a remedy.**

**Subject:** `fix(machines): the setup screen says what to do next`
**First body line:** `Phase 79: the Machines screen tells you what to do`
**Semver:** patch.
**Tier 2.** One renderer surface plus a one word main fix, proven with a screenshot of each state.

### The shape to copy, which the operator named

The agent scan in Settings already solves this problem. It shows a scanned-state header with a
Re-scan action, one row per agent, and for a missing agent it shows "Not installed" beside the
install command in mono with a copy affordance. Machines gets the same treatment for Tailscale and
for each machine.

### What ships

1. **Delete the stale sentence** and add a test that fails if the intro copy claims something the
shipped rungs contradict. The test names the sentence and the rung that disproves it.

2. **The empty state is one line and one button.** A heading, one sentence, and Add a machine.
"Check the file again" appears only once at least one machine exists, because there is no file to
check before that.

3. **Tortie says it is wired for Tailscale, and says how to get it.** This is the operator's
request and it has two states, in the agent scan's shape.

| Tailscale state | What the person sees |
| --- | --- |
| Installed | The path it reads, the count of machines found, and when it last looked, with a Look again action |
| Not installed | "Tailscale is not installed" and the install command `brew install --cask tailscale` in mono with a copy affordance, plus the one line that says why Tortie wants it |

The why line is short and honest: Tortie asks Tailscale which machines you own, so you pick a name
rather than typing an address, and Tailscale carries the connection. A person can still add a
machine by typing an address, so Tailscale is the easy path rather than the only one. Say that,
because otherwise the missing state reads as a hard requirement.

4. **The honesty text moves to where it decides something.** Nothing is deleted, because every line
is true and load bearing. The sealing sentence goes on the confirm sheet at the moment of agreement.
The line that Tortie never adopts running work goes on a machine row. The rest goes behind one
disclosure.

5. **The tailnet list becomes readable.** A device with no hostname shows its tailnet name rather
than `localhost`. A device that cannot host a session, meaning an iOS device, is either omitted or
clearly marked as unable to host, and the phase picks one and says which. An offline device is
de-emphasised rather than listed at equal weight. The operator's own list has four rows of which
exactly one is usable, and the screen currently gives all four the same prominence.

6. **Every error class gains a remedy line**, keyed off `MachineTestClass` in renderer copy.

| Class | The remedy |
| --- | --- |
| `refused` | On that Mac, open System Settings, then General, then Sharing, and turn on Remote Login. macOS ships with it off |
| `auth-refused` | That machine did not accept your sign in. Your key may not be on it yet |
| `not-resolved` | Pick the machine from your tailnet list rather than typing an address |
| `no-program` | The machine answered and has no tmux on it. Install it there, then test again |

7. **Say the version gate before it bites.** Tortie has measured tmux 3.6a and 3.7b and refuses
anything else. Today a person learns that after adding a machine. The Add flow says it before the
test runs.

### What is deliberately NOT in this phase

**Generating and installing an ssh key.** The operator asked for it and it is right. It needs a main
action to run `ssh-keygen`, a password prompt inside the visible connection test, and a new IPC
channel. `src/shared/ipc/machines.ts` and `src/main/machines/**` are inside Phase 72's blast radius,
so building it now means a merge in the directory that decides whether remote work is safe. Recorded
as Phase 79.1, runs after 72 lands.

**Turning on Remote Login for the person.** Tortie cannot and no phase will change it. It needs
`sudo` on a machine Tortie cannot reach, because reaching it is the thing being enabled. The remedy
line is the whole answer.

### The fence

Phase 72 owns `src/main/machines/**`, `src/main/sessions/core.ts`, `src/main/restore/**` and
`src/main/manifest/**`. This phase makes exactly ONE main edit, being the one word at
`src/main/machines/tailscale.ts:282` that stops masking `'missing'`. Nothing else in main is touched.
Every remedy is keyed off the class the renderer already receives, so main classifies and the
renderer advises, which is the better split anyway.

### Builder split

| Builder | Owns |
| --- | --- |
| A | `src/renderer/settings/machines-copy.ts` and its tests, being the stale sentence, the remedies, the Tailscale copy and the moved honesty text |
| B | `src/renderer/settings/MachinesSection.tsx`, `AddMachine.tsx`, `MachineRow.tsx`, `machines.css` and their tests, being the empty state, the Tailscale panel in the agent-scan shape, the tailnet list and the disclosure |
| C | `src/main/machines/tailscale.ts` one word only, plus its test |

### Probes

Photograph the empty state and confirm it is one line and one button. Photograph the Tailscale panel
in both states, and produce the not-installed state by pointing the resolver at a path that does not
exist rather than by removing the operator's Tailscale. Photograph the tailnet list and confirm no
row reads `localhost` and that the four rows are not equally prominent. Drive a real failing
connection against a port with nothing listening, read the refused remedy on screen and quote it.
Photograph the confirm sheet and confirm the sealing sentence is on it. Read every new string against
the writing rules including no em or en dashes. Prove no file under `src/main/sessions/`,
`src/main/restore/`, `src/main/manifest/` or `src/shared/ipc/` was edited, and that the only
`src/main/machines/` change is the one word, and say so explicitly.

## Phase 78 — three font presets, and the screenshot that must keep matching (operator requested 2026-08-17) ✅ SHIPPED 2026-08-17 (7b429d5, 0.36.0, gates green, CI green)

Closes GitHub issue 1 for the work area only. Six researchers surveyed nine products and one
adversarial critic re-measured every number by downloading both font releases and parsing their
glyph tables. The critic reproduced every byte figure and every licence claim, and returned
needs_work on four points, all of which are answered below.

**The design spec already sanctioned this with a condition, and the condition is the design.**
`docs/DESIGN-SPEC.md:601` withdrew the font SIZE stepper "not deferred again", because per-region
zoom already answers size and a Settings field would be a second answer fighting the first. The same
line says the `--font-terminal` token "remains the family lever" and that "if a family picker is
ever built it sets that token, and zoom stays a multiplier over whatever base size it implies". So
this phase builds a FAMILY picker that sets that token, and ships NO size control. The issue asked
for both. The size half is refused, and the refusal is older than the issue.

**Three presets, in the shape of the shipped highlight and contrast presets.**

| Preset | Source | Licence | Bytes shipped | The one reason it earns a slot |
| --- | --- | --- | --- | --- |
| System, the default | already on the machine, resolves to Menlo | named only | 0 | A person who never opens the section sees exactly today, byte identical |
| JetBrains Mono 2.304 | bundled, regular and bold woff2 | SIL OFL 1.1, no reserved name | 186,752 | The only bundleable face measured that covers the whole glyph gauntlet, and it sits on the same grid at 0.6000 em advance against Menlo's 0.6021, so letterforms change and the cell does not |
| Source Code Pro 2.042 | bundled, regular and bold woff2 | SIL OFL 1.1, reserved name "Source" | 153,720 as shipped, corrected from the 148,544 written here before the build | x-height 0.4860 em against Menlo's 0.5469, which is 11 percent smaller, and it is the only measured candidate that gives a quieter page at the same pixel size |

Total shipped bytes 340,472 as measured on the four files that shipped, corrected from the 335,296
written here before the build. The Source Code Pro figure above named the WOFF2 built from the TTF
release while the file list named the WOFF2 built from the OTF release. The OTF pair is what shipped,
because that is what the file list named, and it is 5,176 bytes larger. For scale the app already ships `codicon.ttf` twice, at 149,508 and
140,956 bytes. Fonts are assets rather than JavaScript, so they do not enter the eager JS budget the
performance audit tracks, but they are still bytes and the phase reports them.

**Every preset is a stack ending in Menlo**, for example `'JetBrains Mono', Menlo, monospace`,
because both bundled faces sit within 0.35 percent of Menlo's advance so a fallback glyph lands
inside the cell.

**THE BLOCKING FIX, and the operator chose it.** Bundling a face silently breaks the terminal
screenshot export. `src/renderer/terminal/capture/rasterize.ts` serialises the terminal into an SVG
inside a `data:` URL, and that SVG is an isolated document. Chromium does not apply the host page's
`@font-face` rules inside it and fetches nothing from it, which is exactly why the canvas is never
tainted. So a bundled face is not available to the rasteriser and two things go wrong with no error.
The exported PNG draws in Menlo while the screen draws in the chosen face. Worse,
`letterSpacingCorrection` at `rasterize.ts:33` computes the cell correction against the chosen
face's advance on the main document and then applies it to text the SVG renders in Menlo, so the
correction becomes WRONG rather than merely absent. The operator chose to fix it: inline the selected
face as a base64 `@font-face` inside a `<style>` element within the foreignObject. For JetBrains Mono
Regular that is 92,164 bytes of woff2 becoming about 122,900 bytes of base64 in each capture. The CSP
already permits it, at `src/renderer/index.html:19` and `src/renderer/settings/index.html:10`, both
carrying `font-src 'self' data:`. When the System preset is chosen, inline nothing and keep today's
path exactly.

**Four corrections the critic required, all binding.**

1. **Menlo is not a blanket safety net.** Only Menlo REGULAR covers the gauntlet. Menlo Bold has
0 of 128 box drawing characters. Menlo Italic is missing the check, cross, arrow and warning marks.
Menlo Bold Italic fails both ways. Monaco renders comments in italic commonly, so this is reachable.
State the fallback claim as what it is, being that Menlo Regular is the safe upright last resort.
2. **Source Code Pro is missing three marks** and the recommendation table must say so rather than
hiding it behind a box-and-block rule. It lacks the cross at U+2717, the arrow at U+279C and the
warning at U+26A0. When one falls back to Menlo inside a Source Code Pro line, the fallback glyph
carries an x-height 12.5 percent taller than its neighbours. The advance matches so the grid holds,
and the size mismatch shows. Keep the preset and state the cost.
3. **Menlo Bold's missing box drawing does not show**, because the terminal draws all 128 box
characters itself in `@xterm/addon-webgl` 0.19.0, along with 32 block elements, 19 powerline
codepoints and 31 legacy computing glyphs. That is also why no bundled face is needed for box,
block or powerline coverage. A font buys letterforms and nothing else here.
4. **`'SF Pro Text'` in `src/renderer/styles/tokens.css:124` has never matched anything.** The critic
checked 2,166 registered families on this machine and there is no such family. It is harmless because
`-apple-system` matches first, and it misleads the next reader. Delete it.

**NO SIDEBAR FONT CONTROL, and this is a deliberate refusal of half the issue.** The macOS system
interface font is correct. It is the only value that keeps tracking the system face across releases
and gets the system's own optical sizing at the 11 px to 15 px sizes the tree uses. VS Code has
closed four separate requests for a UI font setting without shipping one, and GitHub Desktop's
Appearance pane carries theme, date format, time format, number format and diff tab size with no
typography field. Zed is the only surveyed exception and it bundles its own sans at 822,124 bytes.
Say this in the issue rather than deferring it. If the operator later wants the density the request
is probably really about, the control that fits the existing shape is a three step interface text
size scaling the `--text-*` and `--lh-*` tokens, beside contrast. That is a preset. A font list for
chrome is a picker.

**What this phase does NOT fix, recorded so nobody expects it.** Agent spinners are braille. No
monospace face on this machine has any of the 256 braille codepoints, none of the eight measured
candidates has any, and neither does the Nerd Font symbols file. `Apple Braille.ttf` has all 256, so
macOS is drawing spinners from it today at a width the terminal grid did not plan for. No font preset
changes that. The fix is an xterm.js upgrade and it belongs in its own phase.

**Subject:** `feat(appearance): three font presets for the work area`
**First body line:** `Phase 78: three font presets, and the screenshot that must keep matching`
**Semver:** minor.
**Tier 2 for the preset itself, and Tier 3 for the rasteriser**, because a wrong cell correction
silently corrupts an export a person may rely on.

**Builder split, disjoint.**

| Builder | Owns | Item |
| --- | --- | --- |
| A | the font assets, `src/renderer/styles/tokens.css`, the `@font-face` declarations, the terminal and Monaco font wiring | the presets and the token |
| B | `src/renderer/settings/AppearanceSection.tsx`, the settings store rows, the preset data and its tests | the Settings surface |
| C | `src/renderer/terminal/capture/rasterize.ts`, `src/renderer/terminal/capture/index.ts` and their tests | the screenshot fix |

**Probes.** Photograph the Appearance section showing three presets. Switch to each and photograph
the terminal, reading the letterforms by eye. Export a terminal screenshot under each preset and
compare the PNG against the screen, proving they match rather than asserting it. Measure the cell
geometry under each preset and show the grid did not move. Prove zoom still multiplies over the
chosen base. Prove the System preset is byte identical to today by comparing a capture before and
after the change.

**WHAT SHIPPED, and every number below was measured on this build rather than predicted.**

1. A **Font** group in Settings, Appearance, under Contrast. One select, three options, in the order
System, JetBrains Mono and Source Code Pro. There is no size field and no range input on the section.
The preset is persisted as `workAreaFont` in main's `settings.json`, beside the two Phase 62
appearance fields.
2. A preset writes two custom properties and nothing else, being `--font-terminal` and the new
`--font-editor`. `--font-editor` was added with a value byte identical to `--font-mono`, and Monaco,
the Pierre diff and the markdown preview's code now read it. `--font-mono` did not move, so the
sidebar and the rest of the chrome did not move.
3. System writes no override. Three exports from the current build and from a build of `9d5d0eb`
under System came out at 120,219 bytes each with sha256
`c5679653a01396f42976c07620c24122485008868a60fe9a3e5a7d6b686076cd`, so an untouched install renders
what it rendered before. Under System both bundled families are declared and both report unloaded, so
that install fetches no font bytes.
4. The screenshot export keeps matching the screen, which is the reason this phase was Tier 3. The
capture path inlines the chosen face as a base64 `@font-face` inside the SVG's own `<style>`. Three
runs, each a fresh isolated user data directory on its own harness socket, each driving the real
rasteriser. Percent of ink differing, export in the row and screen in the column: system against the
three screens 15.20, 19.82 and 34.50; jetbrains-mono 25.01, 5.64 and 35.33; source-code-pro 28.85,
29.95 and 15.78. The diagonal is the minimum of its row and of its column in all three, so each
export matches its own screen better than it matches either other face.
5. The bold member is inlined only when the serialized capture holds a bold run. That keeps the
common JetBrains Mono capture at 123,032 extra bytes instead of 249,296, and the common Source Code
Pro capture at 101,945 instead of 205,254.
6. The grid did not move. Advance per em measured in a real renderer against the shipped files is
Menlo 0.60205, JetBrains Mono 0.6000 and Source Code Pro 0.6000, so both bundled faces are 0.34
percent narrower than Menlo. Live geometry was 147 by 42 under all three presets and all three
exported PNGs are 2246 by 336 device pixels. Over a 60 character ruler line the export advances 15.02
device pixels per character and the screen advances 15.00, a whole-span difference of one device
pixel in 899, or 0.11 percent.
7. Zoom still multiplies. Real chords at the terminal logged "terminal font 13 to 19.5" at 1.5 and
"13 to 11.7" at 0.9, and `--font-terminal` still named the chosen preset after zooming both ways.
8. The four correction points the critic required were re-measured rather than carried. `'SF Pro
Text'` does not resolve on this machine and it is deleted from `--font-ui`. Menlo Bold is missing
U+2500 and Menlo Italic is missing the cross, the arrow and the warning. Source Code Pro regular and
bold are missing U+2717, U+279C and U+26A0, and the Settings card says so in plain words. Menlo's
x-height is 0.5469 em against Source Code Pro's 0.4860 em, a ratio of 1.1252, which is where the
card's 12.5 percent comes from.

**What is NOT true after this phase, stated so nobody expects it.**

- Braille spinners are unchanged. No monospace face on this Mac has any of the 256 braille
  codepoints, so macOS still draws them from `Apple Braille.ttf`. That fix is an xterm.js upgrade and
  it is not this phase.
- There is no sidebar or interface font control, and there is no size control anywhere. Both halves
  were refused on purpose and the reasons are above.
- The woff2 glyph tables were not decoded. Every coverage answer above is a rendering test in a real
  renderer, not a `cmap` read.
- The packaged application was not launched. `electron-builder` produced an `app.asar` holding
  `/NOTICE` with sha256 `b1e87cde314b4b940d772a02c0638ca83d31dc0d30afcc0638c6a6ef8b5e2e36`, identical
  to the repository file, and all four woff2 files under `/out/renderer/assets/`. The pack then failed
  after the asar was sealed because the verification worktree symlinks `node_modules`, which is a
  worktree problem and not a font problem.
- One residual race is measured and left. After a preset change `--font-terminal` moves at 8 ms while
  `document.fonts.check` for the new family stayed false until 1,252 ms in one run. A capture started
  inside that window computes its cell correction from the old face. The error is bounded by the 0.34
  percent advance difference, about 0.026 css pixels per character. It is recorded in the nits round.

## Phase 77 — the quit and suspend contract, NOT QUEUED and BLOCKED ON PHASE 72

**This may not run while Phase 72 is in flight.** Builder A owns all 3,192 lines of
`src/main/sessions/core.ts` and Builder C owns `sessions-slice.ts`. Phase 72, remote restore, needs
both, plus `restore/**` and `manifest/**`. Running them together guarantees a merge in the two most
durability-critical files in the tree. Launch this only after 72 is pushed with gates green.

**Subject:** `fix(lifecycle): suspend takes a generation, and shutdown finishes before the slot clears`
**First body line:** `Phase 77: the quit and suspend contract`
**Semver:** patch. Three items repair defects, three change internal shape only, and no user-facing
surface is added, renamed or removed, so the native menu rule does not apply.

**The admissible test the operator set.** He asked for no user or technical behaviour change. An
item qualifies only if it is a REPAIR, meaning the code does not do what its own contract says, or
INTERNAL ONLY, meaning shape changes and observable behaviour does not. Everything that alters
durable side effects, adds a persisted input or changes a failure mode was excluded and is listed
below with its reason.

| # | Item | Category | Tier |
| --- | --- | --- | --- |
| 1 | Suspend takes a manifest generation. `ring-schedule.ts:418` documents `onSuspend` as the suspend handler and nothing calls it | REPAIR | 3 |
| 2 | `shutdownGmuxCore` keeps the singleton until dispose returns. `core.ts:3170` clears it before an 8,000 ms race, so `getGmuxCore()` boots a second core for that whole window | REPAIR | 3 |
| 3 | Quick open and symbol disposal are awaited. `capabilities.ts:294` and `:295` fire both with `void` | REPAIR | 3 |
| 5 | Remove the two ghost invoke channels, `projects:rename` and `app:setBadgeCount`, which have no preload or main implementation | INTERNAL ONLY | 1 |
| 6 | Correct the stale PATH comment at `supervisor.ts:422` | INTERNAL ONLY | 1 |
| 7 | Refresh both audits with the measured figures above and add a `src/main/machines` row | INTERNAL ONLY | 1 |

**Item 4 was dropped on purpose.** It filtered Restore all to local rows. Phase 72 enables remote
restore and would delete the filter, the two assertions pinning it and `refuseRemoteRestore` at
`core.ts:1436`. A two-line change that the next rung reverts is not worth a fourth builder and a
screenshot read. Phase 72 closes it instead.

**Four decisions a builder must not invent.**

1. **When `shutdownPromise` is cleared, and this one is load bearing.** It must be cleared once the
shutdown settles. `src/main/harness/durability.ts` boots and shuts down FOUR times in one process
and `src/main/fault/harness.ts` does it twice. A promise that is never reset makes cycles two
through four join a settled promise, return instantly, and skip the snapshot pass, the capture
drain, the quit ring take and `core.dispose()`. The harnesses that exist to prove durability would
silently stop proving it and no gate would go red. No harness file may be edited to accommodate the
fix.
2. **The corrected PATH comment keeps the development-build truth.** The PATH read at
`resolve.ts:785` is live in a dev build. Only the packaged branch at `:734` skips it.
3. **Item 3's justification is the live worker at environment teardown, not the database close.**
`persistence.close()` is `this.db.close()` and nothing else, and the database runs WAL with
`synchronous = NORMAL`, so every committed row is already durable and the next open recovers the
WAL. Missing the close leaks a handle in an exiting process. The real argument is that a live
`worker_threads` Worker at teardown is the same class of abort Phase 36 fixed, and it is unmeasured.
4. **Item 1 consumes recovery ring generations.** The ring holds five, at `recovery.ts:325`, and its
comment reasons about that span being five times the gap between takes. Suspend skips the five
minute floor at `ring-schedule.ts:403`, so a person who closes a lid several times a day shortens
the span. Say it in the commit and prove the ring still holds a generation older than the current
session after several simulated suspends.

**Builder split, disjoint, with every file each builder needs.**

| Builder | Owns | Items |
| --- | --- | --- |
| A | `src/main/sessions/core.ts`, `src/main/power/index.ts`, `src/main/power/smoke.ts`, `src/main/manifest/ring-schedule.ts`, `src/main/index.ts` and their tests | 1, 2 |
| B | `src/main/capabilities.ts`, `src/main/symbols/ipc.ts`, `src/main/quickopen/ipc.ts`, `src/main/tmux/supervisor.ts` and their tests | 3, 6 |
| C | `src/shared/ipc/app.ts`, `docs/audits/contract-baseline.txt`, both audit documents | 5, 7 |

Builder A needs `src/main/power/smoke.ts` because its own `captureAll` at `:164` carries the comment
"The same argument the real suspend handler passes, so what this harness proves is what the app
does". If only the production path gains the ring take, that comment becomes false and the demanded
`GMUX_SMOKE=power` evidence cannot show a generation file.

**Gates.** The full battery plus `npm run smoke:quit`, which exists as a script and is in neither
the current proof lists nor the integrator battery. A Tier 3 change to `shutdownGmuxCore` that never
drives the real quit harness has not been verified. Item 5 re-bases the contract baseline in the
same commit, moving the invoke count from 157 to 155.

**Proof per item.** Item 1 needs one suspend reaching both the scrollback capture and the ring take,
plus the ring-span check. Item 2 needs a delayed shutdown with `getGmuxCore()` called during it,
proving `GmuxCore.boot()` does not run again, plus all four durability harness cycles still doing
real teardown. Item 3 needs worker termination settled before the disposer returns, and a measured
normal-case quit latency before and after, because `index.ts:614` defers the quit with the window
still on screen and a 2,000 ms bound can hold it there.

**What is deliberately left for later.**

| Left out | Why, and what would make it admissible |
| --- | --- |
| Performance fix 1, the PATH cache | It introduces a persisted launch input that did not exist, which the audit itself lists as its own attack. Admissible only as its own phase with a threat model for the cache as a launch input |
| Performance fix 4, Restore all in parallel | It changes the order and nature of durable side effects and changes a failure mode. The serial loop exists because parallel session creation races name dedupe. Needs its own Tier 3 round with a fault-injection matrix |
| Performance fix 2, the JS split | Internal only and genuinely admissible, but it is a wide renderer edit that shares no file with this round. It goes second so a lifecycle repair is not held up by a bundler question |
| Performance fix 3, git fan-out | Admissible, and one of its two supporting claims was found wrong, so it needs its own re-measurement first |
| Performance fix 5, the agent scan | Admissible, but there are five always-reachable trigger sites rather than the one the audit names, so the change is wider than written |
| The renderer cycle, the exact bridge type, the TypeScript config split | All admissible and all internal only, but every one is a wide shape-only edit across many renderer files and none repairs a defect. They form the second half |

## Phase 73.1 — the second recorded nits round, NOT QUEUED

Small things that shipped phases left behind, collected as they were found so none is lost. None
blocks a rung. This round runs after 73, or earlier if the operator asks for it.

| From | The nit |
| --- | --- |
| 68 | The connection test transcript shows Tortie's own parsing marker to the person, reading `__TORTIE_PATH__/opt/homebrew/bin/tmux__TORTIE_PATH__`. It is honest, because those are the remote program's own bytes under a header that says so, but a person should not read our internal marker |
| 68 | Three probe screenshots driven through the bridge rather than the controls are byte identical, md5 `9267afdf432e8a93225941ef047651a7`, so their captions claim more than the images show |
| 70 | `npm run smoke:remote` CANNOT be run from a clean checkout. It reads `p69-carriage.json` from its own root `${TMPDIR}gmux-p70-remote`, and that file records the path of an ssh-agent socket the exec plane probe started. The npm script never exports `SSH_AUTH_SOCK`, so ssh authenticates with nothing, `tmux -V` returns no bytes, and the gate fails with a version-unmeasured refusal that looks like a product defect and is not one. Measured on 2026-08-17: the same gate failed three times and then passed 11 of 11 with only `SSH_AUTH_SOCK` exported to the socket named in the carriage. The fix is for the script to read the carriage and export the socket itself |
| 70 | The exec plane probe leaves its scratch sshd running when it exits. Three were listening at once after three runs, on ports 37534 and two others. They are harmless and cost nothing measurable, but they accumulate for anyone who runs the gate repeatedly |
| 69, 70 | Two gates read two different config roots and the difference is not written anywhere a person would look. `smoke:execplane` reads `${TMPDIR}gmux-p69-exec` and `smoke:remote` reads `${TMPDIR}gmux-p70-remote`, so pointing the probe at the wrong one produces a refused connection to a dead port. Name the root each gate reads in its own script header |
| all probes | `build/probe-home-update-line.mjs`, `build/probe-fullscreen-menu.mjs` and `build/update-rehearsal.mjs` call `screencapture` with no window target, so any of them photographs the whole screen when the app is not frontmost. This happened on 2026-08-17 during Phase 70's verification and caught the operator's own desktop including private browser content; the files were deleted immediately, never read further and nothing from them was reported. Capture the app window by id instead |
| 69 | The prepared block states the same fact twice on one screen, once in main's sentence and once in the honesty line under it. It is honest and repetitive, and it was left as it is |
| 67 | The same outage sentence prints twice on one screen, in the condition bar and in the pane overlay, about six hundred pixels apart. Neither surface is wrong alone, so the round that fixes it must decide which one owns the message |
| 70 | The two outage surfaces now say different amounts. Phase 70 added the machine's own label to the condition bar and left the pane overlay alone, so the bar names the machine and the overlay still says a machine. The round that decides which surface owns the message decides this at the same time |
| 70 | The quiet badge's sentence, naming the machine that did not answer, is in the badge's title and its aria-label and in no visible text. A verifier read the quiet screen's body text and found it 0 times. A person who does not hover reads the generic bar sentence and never the machine specific one. It is a deliberate tooltip and it is recorded here rather than called wrong |
| 70 | Nothing refuses a machine whose address resolves back to this Mac. In every probe the far side IS this Mac, and `sessions.list()` returned the one local session twice, once from the manifest with no machine and once from the remote poll carrying the machine. It cannot happen in production, because a machine's own tmux server never holds this Mac's session ids, and it would happen to a person who added their own Mac as a machine |
| 46.1 | At the 220 px minimum sidebar the commit subject squeezes to about one character and an ellipsis |
| 46.1 | On the hover card a failed jobs read is indistinguishable from a run that was never expanded |
| 46.1 | The hover card closes on the runs body's own scroll only, so an outer container scrolling moves the rows without closing it. The History card behaves the same way |
| 46.1 | The copy button reads `Run URL` rather than `Copy` when `run.number` is 0 |
| 78 | `'SF Mono'` does not resolve on this machine either, measured the same way that proved `'SF Pro Text'` does not, being that it measures identically to a family name that does not exist. Phase 78 deleted the dead name from `--font-ui` and left this one at the head of both `--font-mono` and the System value of `--font-terminal`, under a comment calling the stack verified. Nothing draws wrong, because the next entry matches, and the comment misleads the next reader |
| 78 | A capture started in the first second after a preset change measures its cell correction against the old face. `--font-terminal` moves at 8 ms and `document.fonts.check` for the new family stayed false until 1,252 ms in one measured run. The error is bounded by the 0.34 percent advance difference, about 0.026 css pixels per character, so it is far smaller than the defect Phase 78 removed. The fix is for the capture path to await the named face rather than `document.fonts.ready` |
| 78 | `src/renderer/terminal/capture/index.ts` now holds two `no FontFaceSet outside a browser` comments that differ by one character, because Phase 78 wrote its new one without an em dash and left the older one alone |
| orchestrator | A fence that is too tight blocks the phase it was meant to protect. Phase 79 deleted a user-facing sentence, and `build/assert-bundle-refusals.mjs` asserts that named sentences reach the shipped bundles, so the build gate failed on a file no builder was allowed to edit. A fence must name every file the change reaches, not only the files the feature lives in |
| orchestrator | A research figure was written into a phase entry without measuring the files. The Phase 78 charter said the bundled fonts were 335,296 bytes and the four files measure 340,472. The committer caught it. A number in a charter is checked against the thing it describes before a builder reads it |

## Phase 46.1 — the Runs pane reads clearly (operator reported 2026-08-16) ✅ SHIPPED 2026-08-17 (d1ce49f, 0.31.1, gates green)

The operator's reports against the shipped Runs section, from a screenshot of real use.

1. THE TIME READS WRONG. A collapsed run row shows "3h 5m 24s", which scans as one duration. The
first figure is when the run happened and the second is how long it took; make that unmistakable
before expanding, e.g. "3h ago" set apart from the duration, with the exact copy under the
writing rules.
2. HOVER FOR DETAIL. Hovering a run row shows the fuller story the way hovering a git commit in
History already does, and that existing hover is the pattern to mirror: the full commit subject,
the branch, the run number, the trigger, the absolute start time, the duration, and per-job
status, all from data the gh calls already return. No new gh verbs.
3. OPEN ON GITHUB. A run can be opened directly at its Actions page, through the native menu per
the UI rules, and the URL comes from the run data already held.
4. THE DOUBLED JOB NAME. A one-job workflow shows "gates" on the run row and "gates" again as the
only child, wasting a level; when a workflow has exactly one job, collapse that level so steps
nest directly under the run row and shift left accordingly. Multi-job runs keep the job level.
Spacing and styling improve without significant change, the operator's words.

**Tier 2.** Probes: the collapsed row photographed with the disambiguated time; the hover card
photographed and its fields checked against the gh payload; Open on GitHub proven to produce the
exact run URL, without asserting the browser; a one-job run photographed with steps directly
nested and a multi-job fixture keeping its level. **Semver:** fix, patch.

**What shipped.** All four reports landed and the verifier proved each one against the live app
and against the gh payload for run 36 of gregce/tortie. The row now reads `4h ago · 5m 24s`, with
the middle dot hidden from screen readers. The row's OS tooltip is gone, because the hover card
replaces it. The card mirrors the History commit card exactly, being a 600 ms open, a 100 ms close
grace, a body portal, the same 8 px anchor and the same upward flip. Its timers live in a new hook,
src/renderer/scm/hover-timing.ts, and its strings live in a new pure module,
src/renderer/scm/run-card-format.ts. Open on GitHub and Copy run URL were already on the run row's
native menu, and the card's footer now carries the same two verbs. A run with exactly one job draws
no job row, so its steps sit at the indent the job row held, and a multi-job run is unchanged.

**One deviation from the spec.** When gh sends no run number the copy button reads `Run URL`
instead of the word `Copy` the spec named. It is a label rather than a sentence, and `#0` would be
wrong. It is pinned by test in run-card-format.test.ts.

**What is not true.** No actor is shown anywhere, because gh's run list payload has no field that
names a person and this phase did not widen RUN_LIST_FIELDS. There is no keyboard path to the card,
which is also true of the History card it mirrors. The card never reads jobs, so a run that was
never expanded shows only the line `Expand the run to load its jobs.`, and a jobs read that failed
shows that same line even though the expanded row itself still shows its error. The card closes on
the runs body's own scroll only, so an outer container scrolling would move the rows without
closing it, which is the History card's behavior too. HistorySection still runs its own inline
copy of the hover timers, so hover-timing.ts has exactly one consumer until a later consolidation.

## Phase 72 — M5, remote restore, earned (research 51, M5) ✅ SHIPPED 2026-08-18 (this commit, 0.37.0, gates green)

The M5 rung of the remote ladder. Phase 70 refused Restore for every session on another machine and
said so in one sentence. This rung offers it, behind five conditions that all have to hold at once,
and it declines to bring the conversation back because Tortie has never collected one for a session
on another machine. It also gives a remote session a durable row, records where THAT machine keeps
the program the session runs, keeps a copy of what the session printed on this Mac, and keeps a
record of what Tortie last knew when a person removes a machine.

**A SECOND FIX ROUND, and what the merge decided.** The first re-verify closed sixteen of the
seventeen problems and left one open, being the saved output surface. `listSessions` merges two
lists. The manifest loop projected a remote row and added its id to `covered` without stamping
`savedOutputAt`, and the loop below it, which is the loop that stamps, skips every covered id. So
the panel was unreachable for every remote session that HAS a manifest row, which is every remote
session this build creates, while the copies sat on disk the whole time. The manifest arm now
stamps it. `src/main/sessions/__tests__/saved-output-reach.test.ts` holds it, and it was proven by
reverting the fix and watching two of its five tests fail.

The merge onto 0.36.1 also settled problem 9 in Phase 79's favour rather than this phase's. Both
rungs independently fixed the same false sentence. Phase 72 rewrote `HONESTY_NO_SESSIONS_YET` into
a true one. Phase 79 deleted the constant outright and added a RETIRED_CLAIMS table that fails when
any string still makes a claim a shipped rung has disproved. Nothing consumed the constant, so the
deletion stands and the rewrite was dropped. The stronger of the two answers survived.

**What is NOT true of this rung.** Every number here comes from a scratch sign in server on this
Mac over the loopback address. That reproduces a hung pipe and it says nothing about packet loss,
roaming, or a laptop closing its lid. The real tailnet repetition is OWED and needs the operator
present. Nobody has photographed the saved output panel, the refused verb or the Past Sessions
record on the tree that shipped; the evidence for those is the driven matrix and the tests.

**The gate is five conditions and the first one that fails is the sentence a person reads.**
`src/main/machines/restore-gate.ts` is a pure table with six arms, in this order: the machine is
still in the machines file, the row's recorded machine is the machine being restored on, Tortie has
signed in to it in this run, Tortie has a route to it right now, a list from it completed in this
run and it answered the last time Tortie asked, and that machine's own last completed list does NOT
hold this session. The last one is the double run guard, and it is the one failure research 28 ranks
as destroying work.

**What shipped, in seven parts.**

1. Remote restore, in `src/main/machines/remote-restore.ts`. It asks the gate, checks that the row
belongs to the machine in hand, re-asserts that machine's own session server and reads its program
list before any mutation, asks the machine one more time whether it is holding the session, creates
with both identity variables on the line itself, stamps the four session options and reads them
back. Measured against the scratch machine: 304 ms for a shell session and 441 ms in the fault
matrix, with 4 of 4 stamps and 2 of 2 pane variables reading back byte for byte.
2. Per machine program capture, in `src/main/machines/remote-argv.ts`. The manifest rule is that
`argv[0]` is an absolute path, and a path read on this Mac names nothing on another computer, so the
machine is asked where IT keeps the program, through its own login shell inside a marker pair. The
answer goes into the row and into the recovery record, both bound to that row's machine. It goes on
no command line: the launch stays by bare name on both sides. `smoke:remote` step 10a proves it end
to end, recording `claude` at `/Users/gdc/.local/bin/claude` on the scratch machine and bringing the
session back from that row.
3. The durable row for a remote session, written before the create line, the same order a local
create uses. `MANIFEST_MIN_COMPATIBLE_VERSION` moves from 8 to 13 and the refusal Phase 71 left in
`sessions-repository.ts` is deleted, because this is the build that records a real machine.
4. Saved output, in `src/main/machines/remote-capsule.ts`. It reads a screen on another machine with
the same flags a local capture uses, through the same durable ring, and the copy stays on this Mac.
The panel is `src/renderer/app/SavedOutputModal.tsx` and every view of it says when the copy was
taken and that it is not live.
5. The arming gate, in `src/main/machines/resume-arming.ts`. A local row arms for every input, by
construction and with a test over every combination. A remote row takes the `not-collected` arm every
time, because no producer writes a remote conversation id in this release.
6. The forget-machine record, in `src/main/machines/tombstone.ts`, migration `014-machine-tombstone`,
`user_version` 13 to 14. Removing a machine sends nothing to it, writes one record per row saying
what Tortie last knew and when, closes the connection and stops the saving.
7. The ten row fault matrix, `npm run smoke:matrix`, against two scratch machines with their own
session servers. The script owns the machines and the faults, the app owns the moments and writes
facts, and the script grades. It is the gate: a red run ships restore refused.

**The matrix, green, with a number on every row.**

| # | Research 28 section 6.3 | What was measured |
| --- | --- | --- |
| 1 | Transport loss on a healthy host | Every row on the cut machine read `unknown` 196 ms after the cut and never `restorable` or `exited`. 0 restores offered, 0 copies taken on that machine while it was down. The row on the other machine and the row on this Mac each took exactly one status the whole time |
| 2 | Host unreachable at launch | The app started with the machine down, holding a row a previous run created. 1 row on screen, reading `unknown`, carrying a 151 character sentence, offering no Restore. 0 sessions created on this Mac. The row's name, folder, machine, program and create time were byte identical before and after, and the only column that moved was the status, from `idle` to `unknown` |
| 3 | Two clients, one remote session | A second profile listed 1 session of Tortie's on that machine, wrote 0 manifest rows for it, offered 0 restores and sent 0 kills. The first client's session list was 61440 bytes before and 61440 after |
| 4 | Restore against an unreachable host | Refused with the `unseen` sentence, 0 processes started, and the session list byte identical across the attempt. The sample is taken after every row has gone `unknown` and immediately before the restore |
| 5 | Clock skew | The machine reported session times 172,794,519 ms ahead, which is 48 hours less the run's own elapsed time. The copy Tortie saved is stamped 30,052 ms BEHIND this Mac's clock rather than two days ahead of it, and no row moved status in the 30 s that followed |
| 6 | Version mismatch | The machine reported `0.0-made-up`. Create, attach and restore were all refused, 0 servers were started on it and 0 settings were written |
| 7 | Remote reboot | The machine's own session server was ended by the one pid the supervisor recorded. The row became restorable 5,386 ms later, having read `unknown` on the way and never `exited`. The restore took 337 ms, and 4 of 4 identity marks and 2 of 2 environment values read back from the machine byte for byte |
| 8 | Untrusted remote bytes | The supervisor typed a bell, four escape sequences and 4096 random bytes into a session from the machine's own side. The copy on this Mac holds 5,685 characters including 9 escape bytes and reads back through its own hash. What a person is shown is 5,644 characters with 0 escape bytes and 0 control bytes, and the session list row holds 0 |
| 9 | Capture cadence at scale | 30 sessions on one link, all printing. Three driven passes wrote 6, 8 and 8 copies, which is 22 against a bound of 8 per pass and a cap of 24 over three. With the printing stopped the passes settled 8, 6, 8, 0 and the pass after that wrote 0. Over 300 s of wall clock with 10 rounds of printing the cadence produced 51 copies |
| 10 | Move with a dirty tree, translated | A person removed a machine holding 34 sessions. 34 rows became a record of what Tortie last knew, 0 commands were sent to the machine, 0 rows claim the work ended, and the machine still held all 34 sessions when the supervisor looked afterwards |

Every number above is from the clean shell run, being
`env -i PATH=... HOME=... SHELL=/bin/zsh TMPDIR=... npm run smoke:matrix` on the committed tree. The
run from an ordinary shell on the same tree gave the same verdict and the same shape of numbers: row
7 took 5,487 ms to restorable and 356 ms to restore against 5,386 ms and 337 ms, and row 9 wrote 7, 8
and 7 copies per pass against 6, 8 and 8. The operator's own server held 32 sessions before and after
every leg of both runs, with `history-limit` and `exit-empty` unchanged.

**The fix round found sixteen things and every one of them is closed.** The four that were durability
or truth, rather than harness defects, are first.

- **Restore was refused for ever after the far side's own session server died, which is the one case
restore exists for.** The gate asked whether the live connection was up, and that connection is
opened only after a read proves the far side's server is already running, because opening it against
a machine with no server would create one carrying none of Tortie's settings. So a machine whose
server died could never satisfy that arm. Matrix row 7 measured it twice: the row became restorable
in about 5.1 s and the restore was then refused, with 0 of 4 stamps read back. The fact is now
whether Tortie has a ROUTE to the machine, over either plane, and a completed list is a route. Row 7
now reads `becameRestorable` in 5.5 s, a restore in 441 ms, 4 of 4 stamps and 2 of 2 pane variables.
- **The local reconcile wrote a false status onto every remote row.** `reconcileManifest` compared
every manifest row against THIS Mac's own session list, found the remote ones absent from a list that
could never have held them, and wrote `restorable`. That is the value the next launch believes before
any machine answers, so a person came back to Tortie offering to bring back work that had been
running the whole time. Rows whose machine is not this Mac are now left alone, and four tests in
`src/main/manifest/__tests__/reconcile.test.ts` hold it.
- **The whole saved output surface was unreachable.** `Session.savedOutputAt` had two readers and no
producer, so the menu item was permanently disabled on every row and the line pointing at the copy
never drew. It is produced in `toSession` for a manifest row and in `SessionCore.listSessions` for a
feed row that has none.
- **No session on any machine was ever copied more than once.** The pass skipped a row whose
`#{session_activity}` stamp had not moved since the last copy, and that stamp does not do what the
rule assumed. MEASURED 2026-08-17 with tmux 3.6a, twice: a detached session was made to print 4096
bytes, and the stamp read 1787023590 before, 1787023590 after and 1787023590 three seconds later.
The same test with a control client attached to another session on the same server gave the same
answer. `#{history_size}` moved from 0 to 48 in both, so the printing did happen. tmux moves that
stamp for a session somebody is attached to, and every session Tortie copies is one nobody is
attached to. So the first pass took a copy of whatever the screen held seconds after the create and
every pass after it skipped the session for ever. The rule is gone. The read still happens, bounded
at eight per pass by the link, and whether to PUBLISH is decided on the bytes: the ring is asked to
skip a body identical to the newest one it already holds. Matrix rows 5, 8 and 9 all measured zero
copies before this was found and all three now measure real ones.

The rest were the phase's own surfaces and harnesses.

- A concurrent double press of Restore on a remote row was guarded by nothing Tortie decided. The
in flight guard sat below the remote branch, so both presses passed the gate and both composed a
create, and only the far side's own rule about duplicate session names refused the second. The window
is several seconds wide because the restore re-asserts the machine's session server inside it. The
guard is now the first thing the branch does.
- `resumeArmingVerdict` had no production caller and the restore printed its sentence unconditionally.
It is asked now, once, and its answer is what the outcome carries. Its rules also moved: it used to
ask whether the row had a resume command before anything else, and every remote row this build writes
has none, so every remote row answered "nothing to say" and the arm that tells a person their
conversation is not coming back was reached by no row at all.
- Settings then Machines still said "You cannot open a session on a machine yet". That has been false
since Phase 70. It now names what a session on a machine does and does not carry.
- `npm test` was red on the committed tree, at
`src/renderer/app/__tests__/unreachable-presentation.test.tsx`, because the phase added a third item
to the menu an unreachable row gets and the test still expected two.
- `npm run smoke:remote` exited 1 at step 8c, before it reached any restore, so the phase shipped
with no end to end restore proof in any gate. The harness confirmed and prepared a machine it never
added to the machines file, so every refusal came back as "you removed this machine".
- Per machine program capture was exercised by nothing, because every session any harness created was
a plain shell, whose argv is empty by construction. `smoke:remote` step 10a now creates a session with
a real agent and brings it back.
- Matrix row 4 could not pass as written. Its before sample was taken before the link was cut, and
cutting the link writes `unknown` on every row on that machine by design, so the two samples always
differed. The sample is taken after the rows have gone unknown and immediately before the restore.
- Matrix row 2 could not pass as written either, for the same reason in a different place. It asked
for the row not to be written at all, and a machine Tortie cannot see writes `unknown` durably on
purpose. It now grades the row's identity, which must not move, and the status, which must read
`unknown`.
- Matrix rows 5 and 9 passed over zero events. Row 5 asserted something about a saved copy with
`capsuleCapturedAtMs: 0`, and row 9 asserted a cap with 0 saves in 300 s. Both now fail on zero, and
both were made to produce real events.
- The matrix cold leg did not reproduce a launch. It never read the machines file, so the row told a
person "you removed this machine from Tortie" about a machine nobody removed.
- Tortie composes NO argv for a session created as a plain shell, so every `extraArgs` the matrix
handed one was dropped and every one of its sessions sat idle. Rows 8 and 9 were grading copies of a
shell prompt. The supervisor types into those sessions from the machine's own side now, which is also
the honest shape of the case.
- The supervisor's own lookup of which pane belongs to which session used a tab between its two
fields, and the clean shell run is what caught it. MEASURED 2026-08-18 with tmux 3.6a: the same
`list-panes -a -F` prints `$0 \t %0` from a shell with a locale in it and `$0 _ %0` from one started
with `env -i`. So under the clean shell the lookup found no pane, typed into nothing, and rows 5, 8
and 9 graded a screen nobody had made print, with only the first run's numbers to show it. A space
separates the two fields now, neither identifier can hold one, and the supervisor fails the run
outright when a request to make sessions print reaches none of them.
- The vocabulary audit named `src/main/machines/tombstone.ts`, which holds no copy, and did not name
the two sentences the restore prints. Those sentences moved into `./remote-copy.ts`, which is where
every sentence main prints about a session on another machine lives, and the audit now also reads
`src/renderer/settings/machines-copy.ts`, which is where the tombstone sentences are composed.

**Contract lines this commit moves, and the reason for each.** `docs/audits/contract-baseline.txt` is
regenerated in the same commit and the diff is exactly these eight lines.

| Line | From | To | Reason |
| --- | --- | --- | --- |
| `[ipc.invoke.channels]` | 157 | 158 | `scrollback:saved`, the newest verified copy's text and its capture time for one session |
| `[sqlite.identity] user_version` | 13 | 14 | Migration `014-machine-tombstone` |
| `[sqlite.identity] min_compatible_version` | 8 | 13 | A build at schema 12 reads a remote row as a session on this Mac, and its restore would recreate that session HERE. Phase 71 wrote this instruction at `schema.ts:378` |
| `[sqlite.migrations]` | 13 | 14 | `014-machine-tombstone` |
| `[sqlite.schema]` sessions | — | `machine_tombstone TEXT` | What Tortie last knew about a session on a machine a person removed |
| `[harness.smoke.modes]` | 24 | 25 | `remote-matrix`, the app half of the ten row matrix |
| `[bundle.refusals] durability` | 24 | 23 | `manifest.machine-id-nonlocal` is deleted, because this is the build that records a real machine |
| `[bundle.refusals] machines` | 13 | 16 | `machine.restore-refused` is retired because its sentence is now false. Added: `machine.restore-unseen`, `machine.restore-wrong-machine`, `machine.restore-forgotten`, `machine.resume-not-collected` |

**What is not true.**

The real tailnet repetition is OWED. Every number in this rung comes from a scratch sign in server on
this Mac over the loopback address. That reproduces a hung pipe. It says nothing about packet loss,
roaming, or a laptop closing its lid. It needs the operator present and it is not done.

The operator's four machines were not contacted and their tmux versions are still unmeasured, so all
four are still refused.

The saved output is not put back into the recreated session on the other machine. Three mechanisms
could do it and all three are refused, which `REPLAY_IS_NOT_ATTEMPTED` states in full. The restore
result and the panel both say it to the person.

No conversation comes back. Every remote row records `remote-not-collected` and the arming gate takes
that arm every time. The arm that says yes has no producer in this release, and the restore logs a
warning if it is ever reached, because nothing types a command into a pane on another machine yet.

Cross Mac double run is still open. Research 51 section 7 question 6 has no answer here. A second Mac
restoring the same session is refused by nothing on the far side, and matrix row 3 proves only that
the second Mac never adopts and never kills.

No harvest, no remote environment value probe, no image upload, no remote review, no conversation
store sync. Those are M6.

The capture cadence numbers are chosen rather than measured. What IS measured is what they produce,
and matrix row 9 prints the copies one pass writes with thirty sessions listed.

Matrix row 9 does not measure "one capture in flight at a time". That is a property inside one
process and the harness watches from outside. A unit test holds it.

Matrix row 6 asks for a restore of a row that does not exist, because no session can be created on a
machine whose version nobody measured. What it measures is that restore starts nothing, not that it
read the version.

No screenshot was taken in this fix round. The saved output panel, the refused verb and the Past
Sessions record are held by unit tests and by the matrix's own numbers, and a person has not looked
at any of the three with their own eyes on this tree.

The live probes the phase brief lists as items 1 to 6 were driven by the harnesses rather than by a
person in the window. `smoke:remote` covers items 1, 3 and 6 and the matrix covers items 2 and 5.
Item 4, reading the capture time in the panel by eye, was not done.

## Phase 71 — the control plane and the partition harness (research 51, M4) ✅ SHIPPED 2026-08-17 (this commit, 0.35.0, gates green)

The M4 rung of the remote ladder. Phase 70 asked every machine for its list on a timer, at 5,000 ms
while the window was in front and 30,000 ms behind it. A timer is a guess about when something
happened. This rung opens one live connection per machine, so the machine tells Tortie that a session
was created, killed or renamed and the list is read because something happened. It also gives each
machine its own reconcile, gives the manifest a column saying which machine a row runs on, turns
research 51 section 4.4's case table from prose into code, and adds a harness that cuts the link to a
machine while the app is in the middle of a sentence and grades what the app says.

**The measurement came first, and it is written down.** `docs/research/52-control-mode-dialect.md`
holds it, and nothing in it was read from documentation. The probe opens two children of the SAME
tmux program, one local and one over a real connection, and compares their bytes. Both versions
Tortie has measured for the exec plane matched on 8 of 8 comparable steps, being 3.6a at
`/opt/homebrew/bin/tmux` and 3.7b in the copy Tortie ships. Two numbers on that page decide the
carriage and both are measured rather than chosen. The `-u` flag changes not one byte of a control
stream, 106 bytes with it and 106 identical bytes without it, so it is not on this carriage while the
attach carriage still carries it. The keepalive pair `ServerAliveInterval=5` with
`ServerAliveCountMax=3` ends a control child 0.1 s after the far side is killed and 19.1 s to 19.5 s
after the far side is frozen. A version with no control measurement is not refused. That machine
keeps working on the timer feed and the app says so, under the pinned refusal id
`machine.control-dialect-unmeasured`.

**What shipped, in eight parts.**

1. One connection per machine, in `src/main/machines/control-plane.ts`. The carriage is the CONTROL
row of research 51 section 4.1 with one flag more, being `-f /dev/null`, for the reason Phase 70
recorded for the ATTACH row: `-C new-session -A` creates a server when none is running, and a server
born that way would otherwise read the other machine's own configuration file. It is composed by the
same module the exec plane and the attach plane use, because a second composer is a second place a
keepalive can be dropped. A machine with forty sessions has one connection, and the first command it
sends is `refresh-client -f no-output`, so no pane output ever crosses it. The precheck before the
connection is one cheap read over the exec plane and never a local `ensureServer()`, which is the
rule research 51 section 3 states and the reason is that a sleeping machine would otherwise start a
tmux server on THIS Mac on every backoff step.
2. The poll is gone while a connection is up, and it returns the moment one drops. A machine carries
one feed and never two. The harness measures it on a running machine: over 20,000 ms with nothing
happening, the connected machine's feed issued 0 lists and no timer was armed at any of the 80
readings, where the Phase 70 cadence would have issued 4.
3. Reconcile is per machine. `src/main/sessions/reconcile-plan.ts` and `src/main/sessions/core.ts`
now take a machine id and move only that machine's rows. Before this rung one judgement covered every
row, because there was only ever one socket for them to be on, so a link that dropped would have
written `unknown` on rows running on this Mac and told a person Tortie cannot see sessions it is
looking straight at.
4. The `machine_id` column, migration `013-machine-id`, `user_version` 12 to 13. Every existing row
is backfilled to `local`, which is not a default but the measured truth about every one of them,
because no build older than this one could create a session anywhere else. `NULL` reads as `local` as
well, because `sqlite3 .recover` rebuilds from the final schema. `MANIFEST_MIN_COMPATIBLE_VERSION`
stays 8, so a build at schema 12 still opens the file. What keeps that honest is executable rather
than written down: `src/main/manifest/sessions-repository.ts` refuses to write any value other than
`local` today, under the pinned refusal id `manifest.machine-id-nonlocal`, and the build that records
a real machine id moves the minimum to 13 and deletes that refusal in the same commit.
5. Research 51 section 4.4's case table is code, in `src/main/machines/status-truth.ts`. It is pure.
It runs no command, opens no database and arms no timer. It takes one machine level event and returns
one verdict, and its two callers are the per machine feed and the local reconcile. Condition 25 of
`conformance:machines` prints the table on every run: `listed` per row and no restore, `absent`
restorable, `transport-lost` unknown, `woke` unknown, `no-server` restorable, `control-exit` per row.
No arm offers restore in this release and no arm produces `needs input`.
6. The pane environment rescue, over the exec plane. A create whose answer was lost still leaves a
session on the far side carrying its identity, and the rescue is what re-binds it. The probe is
`show-environment -t <id>` with no variable named, because naming the variable makes tmux exit non
zero whenever a session is not ours, and that answer used to be read as a machine that did not answer
and was never remembered. A session that is not ours is now remembered once and costs one command for
the life of that server.
7. A machine that has not answered is on the screen. Main composes the sentence in
`src/main/machines/machine-state.ts` and the renderer stores it in `src/renderer/state/machines-slice.ts`
and draws it. With a project open it is the condition bar with the machine's badge beside it. With no
project open it is above the empty board, which is the whole window in that state. The sentence is
"Tortie could not reach <machine>. Sessions you started there are not shown here, and Tortie did not
end any of them." It never says the sessions are running and it never says they ended, because
nothing proved either.
8. The two Phase 67 drift sites read status through one expression. `machineUnreachable`,
`unreachableMachines`, the drop target's three refusals and the Restore All bar all read
`effectiveStatusOf` now, and that bar also excludes any row carrying a machine, because restore is
refused for those in main and in the menu alike. The guard is a source assertion in
`src/renderer/app/__tests__/status-seam.test.ts`, and it is source shape rather than behaviour for a
measured reason: `effectiveStatusOf` is `return session.status`, and reverting all four sites left the
whole suite green.

**What a person can now do.** They see a session on another machine appear, change its name or
disappear as it happens, rather than up to 5 seconds later. When the link to a machine drops, every
row on that machine dims and says Tortie cannot see it, no row says it ended, Restore is not offered
and typing into it is refused, and rows on every other machine and on this Mac do not move. When the
link comes back the rows come back on their own, with no restart of Tortie. When they start Tortie
and a machine they confirmed is asleep, the window says so, with a project open or without one. What
they still cannot do is bring back a session that ended on another machine, and the app says so where
the verb would have been.

**What the partition harness measured**, `npm run smoke:partition`, on the committer's own run
against two scratch machines. Both are a real `/usr/sbin/sshd` on 127.0.0.1 on a high port, each with
its own sessions directory, and the harness proves that isolation over a real connection before it
measures anything. The link to machine `one` is cut five times and machine `two` is never touched.

| Moment | Samples | Rows on the cut machine | Rows on the other machine | Rows on this Mac | Time to unknown | Restore |
| --- | --- | --- | --- | --- | --- | --- |
| connected and idle | 16 | 1 | 1 | 1 | 196 ms | refused |
| a list in the air | 17 | 1 | 1 | 1 | 45 ms | refused |
| between a create and its stamp | 17 | 2 | 1 | 1 | 172 ms | refused |
| a terminal attached and receiving | 17 | 2 | 1 | 1 | 114 ms | refused |
| the link coming back | 3 | 2 | 1 | 1 | n/a | refused |

No row on the cut machine ever read `restorable` or `exited` while the link was down, no row on the
other machine changed status, and no row on this Mac changed status. In the create case the far side
held 1 interrupted session and the pane environment rescue re-bound it. In the attach case 672 bytes
had arrived through main before the cut. The rows came back 489 ms after the link returned with no
restart of Tortie, and the ssh child count was 0 before the run and 0 after. The operator's own server
held 28 sessions with `history-limit` 25000 and `exit-empty` off before the run and the same three
after.

**Gates, from the committer's own runs on the committed tree.** `typecheck` read 688 production files
and 3,642 imports with 0 boundary violations. `build` finished with 24 durability refusals and 13
machine refusals in the bundle. `test` ran 338 files and 5,002 tests in 25.95 s with 23 skipped and
one failure, the known load flake in `src/main/symbols/__tests__/store.test.ts`, which asks a three
letter query over 100,000 symbols to answer inside 80 ms and measured 118.78 ms while eleven other
test files ran beside it. It was not dismissed on its name. That file was run alone twice and passed
15 of 15 both times in 178 ms. `smoke:t1` passed 5 of 5 and then 6 of 6. `smoke:t3` restored a claude
session and a pi session, each with its replayed scrollback and its armed, unexecuted resume line.
`assert-bundle-refusals`, `contract-inventory --check`, `conformance-machines` at 25 conditions and
`conformance:agents` all passed. `smoke:remote` passed 11 of 11 from a clean shell. `smoke:partition`
passed all five moments twice. The first of those two runs printed PASS and then hung, which is the
last item in the fix list below; the second ran on the committed tree and returned 0 on its own.

**Seven contract lines were added and the baseline was re-based in this commit.** They are the invoke
channel `machines:state`, which is how the renderer asks main for the link state at boot, moving that
count from 155 to 156; `user_version` 12 to 13 and the migration `013-machine-id`, moving that count
from 12 to 13; the `machine_id TEXT` column on the `sessions` table; the harness smoke mode
`partition`, moving that count from 23 to 24; and two bundle refusals, being durability 23 to 24 for
`manifest.machine-id-nonlocal` and machines 12 to 13 for `machine.control-dialect-unmeasured`. No
`gmux.*` key and no `GMUX_*` environment name was added. `machines:stateChanged` adds no line,
because the inventory tracks invoke channels and not event channels.

**The native menus did not change**, and that is deliberate rather than forgotten. This rung adds no
verb a person can invoke. It adds one sentence, one badge state and one column, and the menu items
for a remote row are the ones Phase 70 already fixed, being Restore and Restart removed with the
coming label in their place.

**The verifier returned needs_work and here is what the fix round changed.** The verdict is recorded
because the gate that failed was this rung's own.

- `smoke:partition` failed for three reasons and all three are fixed. The kill that cuts the link ran
`ps` without `-A`, which on macOS lists only the caller's own terminal processes, so the sshd children
holding every open connection were invisible and the kill ended the listener alone. The verifier
measured the control child still alive 120 s after that cut, and 0.0 s after the same cut with the
flag. The second reason is that the first all-unknown sample was read out of the samples already
taken rather than waited for, so a number the harness already had was reported as absent. The third
is that the scratch machine used the same tmux socket as the app's own local server, so the one local
session was also a remote row, the set of local rows was empty, and the isolation invariant ran over
zero rows while printing a 0 that a reader would take as zero changes. The harness now runs two
scratch machines from one shared module, `build/scratch-machine.mjs`, each with its own sessions
directory, and the table above has a row count for the other machine and for this Mac.
- The pane environment rescue probed the same foreign session on every list pass, without end. The
probe no longer names the variable, so tmux answers with exit 0 and a session that is not ours is
remembered once.
- A machine that could not be reached at all was reported as running an unmeasured version, and the
log said the program on it would not report its version. Tortie never reached the machine, so it
learned nothing about any program on it. The unreachable read now returns its own class and the
sentence says that nothing was learned about any program on it.
- The guard for the drift sites did not exist, and a behavioural test cannot catch that class of
drift. It is a source assertion now, which is the instrument
`src/main/sessions/__tests__/unreachable-boundary.test.ts` already uses.
- The startup statement did not render with no project open. It renders in both branches now.
- `smoke:remote` could not prove anything from a clean checkout, because it read a carriage file an
earlier probe had to leave behind. It starts its own scratch machine now, through
`build/with-scratch-machine.mjs`, and it ran all 11 of its steps from a clean shell.
- `smoke:migrate` grew a step, 11 of 12, which builds a manifest at schema 12 and watches the app's
own process migrate it to 13. The verifier's migration evidence against a copy of the operator's real
manifest ran under vitest rather than in the app.
- The harness printed its whole report, printed PASS, and then never returned. Electron leaves a
crash handler behind that holds the write end of both pipes, so the read ends never closed and two
live handles kept the process alive with nothing left to do. The pipes are dropped when the app is
gone and the exit is explicit. Measured by the committer: the run before the fix was still alive
7 minutes 42 seconds after PASS and had to be ended by hand.

**What is not true.**

No remote session gets a manifest row. The `machine_id` column exists and every value in it is
`local`, and the refusal in the sessions repository is what keeps that true.

No remote restore. The refusal stays in main, the menu removal stays, both bundle refusals stay, and
the coming label is exactly what Phase 70 shipped. There is no capsule replay, no provenance gated
resume arming, no forget-machine tombstone, no harvest and no image upload, which are M5 and M6.

The set of issued session ids the rescue reads lives in memory for one run. A create interrupted in a
previous run is not rescued by this one.

The operator's four machines were not contacted. Every number here is loopback against a scratch
sshd on 127.0.0.1 on a high port, with keys generated in the run's own directory. Their tmux versions
are unmeasured for both planes and every one of them is refused today.

Nothing here measured a real tailnet, so research 51 section 7 questions 3 and 7 stay open. The
19.1 s to notice a frozen link is loopback against a stopped far side, which reproduces a hung pipe
and says nothing about roaming or real packet loss.

A remote row's status still comes from `#{session_activity}` and no remote row ever says
`needs input`, which is question 5 and it stays open.

The screenshot reads for the startup statement were driven and read by the verifier, on the tree
before the fix round, and the committer did not repeat them. With one project open they read the bar
and the badge and both were correct. With no project open the window said nothing about the machine,
which is the defect the fix round closed, and the proof that it is closed is a source assertion in
`src/renderer/app/__tests__/unreachable-presentation.test.tsx` rather than a second screenshot.

The one place a person still cannot see the machine specific sentence without hovering is the badge
title, which Phase 70 recorded and this rung did not change.

## Phase 70 — a session runs on another machine, and a person types into it (research 51, M3) ✅ SHIPPED 2026-08-17 (17f1dea, 0.34.0, gates green)

The M3 rung of the remote ladder, and the first one a person can see. Phase 69 gave Tortie a way to
run one tmux command on another machine and read its answer. This rung uses that to start a session
there, to list what is there, to rename it and to end it, and it opens a real terminal on it. The
terminal is one ssh client on this Mac carrying one tmux client on the other machine. Nothing of
Tortie's is installed on that machine, and nothing about a session that lives there is written on
this Mac.

**What shipped, in six parts.**

1. Attach over ssh, in the terminal a person already uses. `src/main/attach/attach-plan.ts` is a new
module that composes the program and the argument list for both kinds of machine and starts nothing.
The local shape is byte for byte what the attach host composed inline at `b660df9`, and the gate
proves that across eight session names. The remote shape is
`ssh -t <the nine carriage options> <host> '<that machine's tmux> -L <socket> -f /dev/null -u
attach-session -t =<name>'`. It carries one flag more than the ATTACH row in research 51 section 4.1
shows, being `-f /dev/null`, so that a verb which creates a server by accident cannot make one that
reads that machine's own configuration file. The `=` before the name is an exact match, because a
bare name matches on a prefix and a prefix match on another machine would stream a stranger's
session into the person's tab.
2. Create, kill and rename on a machine, over the Phase 69 exec plane. The verb ledger grew by
three, being `new-session`, `kill-session` and `rename-session`, each with the reason running it
twice is safe written into the row. Identity rides on the `new-session` line itself as pane
environment, so a create whose answer was lost still leaves a session Tortie can recognise. Kill and
rename are refused unless the target is a row Tortie read from that machine's own list, and the
refusal says so. `kill-server`, `attach-session`, `send-keys` and `respawn-pane` are still absent
from the ledger and the gate fails if any of them appears.
3. The list, by asking that machine every 5 seconds while the window is in front and every 30
seconds when it is not. One format string carries ten fields, every one wrapped in tmux's own
quoting and separated by a single space. Research 51 section 4.3 describes a tab separated format,
and tabs were measured to come back as underscores over a connection with no locale, which is Bug C
from Phase 9.2 in a new place. The format also carries one field more than that section lists, being
the name the far side actually holds, because picking a new name that does not collide needs it.
4. The machine badge, in the machine's own label and colour, on four surfaces and no others, being
the session dock row, the rail hover card, the identity strip and the tab. A session on this Mac
draws no badge at all. A badge dims when the last completed check of that machine got no answer, and
its sentence then says the machine did not answer. It never says the session ended, because nothing
proved that.
5. Restore, refused in two places. Main refuses the verb for any remote row and names the reason.
The renderer removes Restore and Restart from the menu for such a row and draws a label saying that
bringing a session back on another machine is coming in a later release. Both refusals are pinned in
the shipped bundle by `build/assert-bundle-refusals.mjs`, which is why the machine refusal count
moved from 10 to 12.
6. The vocabulary audit, as a test that reads the copy. It strips comments, imports and module
paths, takes every remaining string from the machine copy module and the four surfaces that draw it,
and fails on a word from the transport layer. It cannot judge a sentence, so a person still read
every changed string by eye, and this section is where that reading is recorded.

**What a person can now do.** Create a session on a machine they confirmed once, type into it, watch
it in the list, rename it and end it. Quit Tortie and start it again, and the session is still
running on that machine with its name, its agent and its project tab, because all four of those are
stamped on the far side and nothing had to be restored. What they cannot do is bring a remote
session back after it ends, and the app says so where the verb would have been.

**What the live probe measured**, `node build/probe-remote-attach.mjs`, thirteen steps, all green,
against a real `/usr/sbin/sshd` on 127.0.0.1 on a high port with keys generated in the run's own
directory. The composed attach argument list was 29 arguments with 9 of 9 carriage options present.
The first bytes from the other machine arrived 31 ms after the spawn, 559 of them. A command typed
here ran there and its output came back in 751 ms. The far side reported 1 client attached. A resize
to 100 by 30 was read back from that machine as 100 by 30. Killing the client on this Mac ended the
terminal here 21 ms later with exit 0, and that machine still listed the session with the marker
still in its scrollback. Attaching again redrew the marker 20 ms later in 848 bytes. Freezing three
processes on the far side ended the terminal here after 20.0 s with exit 255, against the 19.3 s
Phase 69 measured for the same keepalive pair on the exec plane. After the far side was resumed the
session was still listed and a fresh attach redrew the marker in 20 ms. The operator's own server was
read before and after and both reads were identical, being 28 sessions, `history-limit` 25000 and
`exit-empty` off.

**What the shipped bundle proved**, `npm run smoke:remote`, eleven steps, all green, inside a real
Electron process against the built bundle. A machine nobody confirmed refuses Create and starts no
ssh process. A machine whose details moved after the confirmation refuses Create the same way.
Writing and re-reading the machines file started 0 processes, which is refusal 8 measured rather
than asserted. A machine reporting version `0.0-p69-made-up` refuses Create, and the refusal names
the versions Tortie has measured, being 3.6a and 3.7b. A create on a confirmed and measured machine
landed, and all four stamps plus both pane environment variables read back byte for byte from the
far side. The poll reported 1 row of Tortie's and 0 that are not, and its projection carried the
name, the agent, the folder and the machine. A rename landed on the far side and the name stamp
moved with it. A kill aimed at a session no list reported was refused and sent nothing. The bound
kill removed the session from the machine. Restore on the ended row was refused. After the whole
create, rename and kill there were 0 database files in the profile, which is the no-manifest promise
counted in bytes rather than in writes. The operator's own server held 28 sessions before the run
and 28 after.

**Phase 69's plane is unchanged, and two of the three things that made its gate unrepeatable are
fixed.** The confirmation sealed in step 2 used to stay in the harness root, so an unconfirmed
machine was already confirmed on the next run, and the scratch tmux server used to stay up, so a step
that measures a server being born found one already there. The harness now drops its own
confirmations before step 1, and `build/harness-socket.mjs` grew a `--fresh` flag that ends the
server on that socket before the harness as well as after. The flag refuses the socket names `gmux`
and `default` the same way the rest of that script does, so it reaches nothing new.
`npm run smoke:remote` runs through the same wrapper for the same reason. The third piece of state is
still not cleared, and the committer met it. `build/probe-execplane.mjs` writes `p69-carriage.json`
into the harness root and leaves a scratch sshd running for the harness to use. When that sshd is
gone and the file is not, the harness reads a dead port and fails at step 3, with `ssh-keyscan`
reporting a refused connection. There are two ways round it. Run `npm run probe:execplane` first,
which writes a fresh file and leaves a live sshd, or delete the harness root, which makes the harness
skip the steps that need a machine and say on screen that it skipped them. The committer ran the
probe first and got 9 of 9. Clearing a stale carriage file on its own belongs to Phase 71.

**Gates, from the committer's own runs on the committed tree.** `typecheck` read 682 production files
and 3589 imports with 0 boundary violations. `build` finished in 20.9 s. `test` ran 327 files and
4828 tests with 23 skipped and 0 failures, so no flake had to be dismissed. `smoke:t1` passed 5 of 5
and then 6 of 6, with 679 bytes on the re-attach. `smoke:t3` restored a claude session and a pi
session, each with its replayed scrollback and its armed, unexecuted resume line.
`assert-bundle-refusals` counted 12 machine refusals in the bundle. `contract-inventory --check`
matched the baseline byte for byte. `conformance-machines` and `conformance:agents` both passed.
`probe:execplane` passed 18 steps, `smoke:execplane` passed 9 of 9 and `smoke:remote` passed 11 of
11, all against a scratch sshd on 127.0.0.1 on a high port. The seven test files this rung adds or
grows hold 116 tests. The conformance gate grew by six conditions, covering the local attach argument
list against `b660df9`, the shape of a remote attach, the three new ledger verbs and the four that
must stay off it, the shape of a remote create, the list format, and the import rule. The import rule
is narrower than an earlier draft of this paragraph claimed, and the exact wording matters because it
is the rule that keeps a native binding out of the manifest's reach. Condition 24 fails when a
production file under `src/main/machines/` names node-pty and is not `connection-test.ts`, when any
file under `src/main/machines/` imports anything under `src/main/attach/`, when `attach-plan.ts`
imports outside its allowed list, or when a second file under `src/main/attach/` names node-pty. So
`connection-test.ts` is a permitted exception rather than a violation, and exactly two production
files may name node-pty at all.

**Two contract lines were added and the baseline was re-based in this commit.** The harness smoke
mode `remote-sessions` is the Electron harness above, and the count of modes moved from 22 to 23.
The machine refusal count moved from 10 to 12, for `machine.restore-refused` and
`machine.remote-target-unbound`, so a later rollup cannot delete a refusal that production reaches
rarely. No IPC channel, no `gmux.*` key and no `GMUX_*` environment name was added.

**What is not true.**

A machine that does not answer when Tortie starts shows nothing at all in the main window. This is
the one product hole the verifier found, and it was measured rather than reasoned about. The scratch
sshd was killed between two launches, and at the next launch the sign-in got a result that was not
`prepared`, marked the machine quiet and moved on, so no poll ever started and no row ever existed.
The condition bar keys off rows whose status is unknown, and with no rows it drew nothing. A person
who quits Tortie with an agent running on a machine and starts it again while that machine is asleep
is told nothing, not that the machine exists, not that it did not answer, and not that their sessions
there are untouched. The machine's row is still in Settings and then Machines, and pressing Prepare
there says what happened, so the fact is reachable and it is not on the screen the person is looking
at. The same machine going quiet WHILE Tortie runs behaves correctly, and that was proved separately.
The fix belongs to Phase 71, because a row that survives a launch is what the per-machine reconcile
produces, and it is recorded on that row of the ladder.

The version gate refuses create and attach through one function, `readyRemoteContext`, and only the
create half was driven live with its exact sentence read. The attach half cannot be driven in this
rung. Attach reaches that gate only after a row comes from a poll, a poll starts only after a
machine prepares, and a machine on an unmeasured version never prepares, so there is no row to
attach to. The refusal is one function shared by both paths and the test suite covers it, and the
live measurement is of create alone.

No machine of the operator's was contacted. Every measurement here is against a scratch sshd on
127.0.0.1, and his four machines are still refused because nobody has measured their tmux versions.

The 5 second and 30 second poll intervals were chosen rather than measured, and the create sheet
says so to the person. Nobody has measured what they cost over a tailnet with real packet loss.

The 20.0 s to notice a frozen link was measured on loopback against a stopped far side. That
reproduces a hung pipe and says nothing about roaming or real packet loss, so research 51 section 7
question 3 stays open. Interactive attach latency over a real tailnet is unmeasured, which is
question 7 and it stays open too.

A remote row's status is `running` or `idle`, read from one field, `#{session_activity}`. It is
evidence that the session printed something. It is not the local attention verdict and no remote row
ever says `needs input`, which is question 5 and is why the create sheet says Tortie cannot yet tell
a person when a session on another machine is waiting for them.

A remote session that ends while Tortie is not running leaves no trace on this Mac. Past Sessions
never holds a remote row. There is no saved scrollback, no resume command, no launch snapshot, no
install map, no SpecStory capture and no image drop for a remote session. Restore is refused for
every remote row and no date is attached to when it arrives.

Nothing refuses a machine whose address resolves back to this Mac. In every probe the far side is
this Mac on a scratch socket, so the machine's tmux server is also the server holding the local
session, and `sessions.list()` returned that one session twice, once from the manifest with no
machine and once from the poll carrying the machine. It cannot happen in production, because a
machine's own tmux server never holds this Mac's session ids. It would happen to a person who added
their own Mac as a machine, and it is on the 73.1 list.

The quiet badge's sentence, which names the machine that did not answer, is in the badge's title and
its aria-label and in no visible text. A person who does not hover reads the generic bar sentence and
never the machine specific one.

The vocabulary audit found one word a person could read two ways, and it was kept on purpose. The
poll honesty line in `src/renderer/app/machine-copy.ts` says "while this window is in front", and
`window` there means the application window and not a tmux window. The shipped Home screen already
says "Drop a folder anywhere in this window to open it.", so the word already carries that meaning in
this product. Every other string was read by eye and no transport word reached one.

The screenshot set was driven and read by the verifier rather than by the fix round, so the screen
evidence in this section is what they reported, and the numbers above are from the committer's own
runs of the probe, the harnesses and the gates.

No control plane, no per-machine reconcile, no `machine_id` column, no pane environment rescue, no
partition harness, no remote restore, no capsule replay and no harvest landed here. Those are
Phases 71 and 72, and the verb ledger refuses most of them in code rather than in prose.

## Phase 69 — the exec plane speaks to a machine's own tmux (research 51, M2) ✅ SHIPPED 2026-08-17 (4c86bea, 0.33.0, gates green)

The M2 rung of the remote ladder. Until this rung Tortie had one implicit place to run a tmux
command and every command went to it. It now has a `MachineContext`, this Mac is one of them, a
confirmed machine is another, and one function composes the command for both. A remote command is
`/usr/bin/ssh` carrying a fixed list of options, one reused connection per machine, and that
machine's own tmux on the far end. Nothing of Tortie's is installed there.

**What shipped, in six parts.**

1. `MachineContext` replaces the singleton. `src/main/machines/context.ts` holds a registry keyed by
machine id, with `local` as one key. `getTmuxContext` and `resetTmuxContext` are now names for that
registry's own functions, and `execTmux` is the local key's name for one door, `execOn` in
`src/main/machines/exec-plane.ts`. The 59 existing callers keep their signature, because every one
of them is attach, create, kill, capture, reconcile or restore, and each of those belongs to M3 or
later. The local composition is proven byte for byte rather than asserted:
`npm run conformance:machines` compares what `tmuxCommand` composes against a golden taken from
`ab94847`'s `tmuxArgs` across twelve argument vectors, and it matched on 12 of 12.
2. The exec plane. Nine options on every command, being `BatchMode=yes`, `ConnectTimeout=10`,
`StrictHostKeyChecking=yes`, the two identity record files with Tortie's own first,
`ControlMaster=auto`, `ControlPath`, `ControlPersist=60s`, `ServerAliveInterval=5` and
`ServerAliveCountMax=3`. `StrictHostKeyChecking=yes` is stronger than Phase 68 promised, and it is
what makes the plane unable to add a line to any identity record file. First contact stays with the
one visible connection test, where a person is watching. The connection Tortie keeps open is named
by a hash of the machine's execution hash and the user id, measured at 70 bytes of a 100 byte
budget, in a directory created mode 700.
3. At-least-once, made mechanical. A machine can sleep after it ran a command and before its answer
arrives, so every command that crosses to a machine must be safe to run twice. That promise is a
table in code rather than a paragraph. Seven verbs are on the ledger, each with the reason running
it twice is safe. A verb that is not on it is refused before anything is sent, and that is what
keeps `new-session`, `kill-session`, `kill-server`, `rename-session`, `attach-session`, `send-keys`
and `respawn-pane` out of this release in code rather than in prose.
4. The remote server boot, and one option list both boots read. A machine's server is created with
`-f /dev/null`, so that machine's own configuration file is never read, and so it comes up with none
of the options Tortie depends on. `src/main/tmux/server-options.ts` now holds all twelve, the local
boot selects its five by field, and a test plus the gate compare the list against
`resources/gmux-tmux.conf` in both directions. The five the local boot re-asserts, their order and
their scope flag are what they were at `ab94847`.
5. The PATH capture, ordered before the first mutating command. A command over a connection runs a
non-login shell, so the machine's own login files are never read and its program search list is
short. Tortie reads that list over the machine's login shell and writes it into the remote server
environment. The ordering is enforced by the door rather than documented, and the refusal names what
was not started.
6. The version probe and a list that fails closed. Tortie reads the version over the plane before it
starts anything, and refuses a version it has not measured. Two versions are on the list, being
3.6a and 3.7b, both measured on 2026-08-17 against the exec plane and neither measured against
control mode. Every row carries `control: false`, so M4 has to measure before it opens a control
connection.

**One new thing a person can do.** Settings then Machines has a Prepare this machine button. It is
enabled for a confirmed row, it says what it will do before it does it, and it is the first thing
Tortie ever starts on another computer. It opens no session.

**What the live probe measured**, `node build/probe-execplane.mjs`, eighteen steps, all green,
against a real `/usr/sbin/sshd` on 127.0.0.1 on a high port with keys generated in the run's own
directory. The first command against a machine with no server came back in 49 ms with exit 1 and was
classified `no-server`. The second command over the same shared connection took 9 ms against the
first command's 49 ms, with 2 processes holding that connection. The boot order read
`start-server` at position 2, the program search list at 3, and the first `set-option` at 5. All 12
options were read back from the machine and 12 of 12 held the value Tortie asked for. The scratch
server was then ended and booted again, and 12 of 12 held again, which is what proves the re-assert
runs on every no-server detection rather than only the first. The keepalive pairs were measured by
freezing the far side: (5,3) errored after 19.8 s, (10,3) after 39.6 s, and (15,3) after 59.6 s, all
three with the message `mux_client_request_session: read from master failed: Broken pipe`, and all
three recovered after the far side was resumed. The pair (5,3) is what shipped, because 19.8 s is
the only measured detection time at or under 20 s. All seven ledger verbs were run twice and the
machine's full option and environment state was byte equal after one run and after two, at 955
bytes. Eight taxonomy golden files were captured from real program output. Tortie's own identity
record file was 289 bytes after first contact and 289 bytes after the whole run, and the person's
own file was 1229 bytes before and 1229 bytes after. The operator's server was read before and after
the run and all three reads were identical: 28 sessions, `history-limit` 25000, `exit-empty` off.

**What the real Electron harness proved**, `npm run smoke:execplane`, nine steps, all green. An
unconfirmed machine refuses Prepare and starts no ssh process. A confirmed machine prepared in
395 ms, with the server born and 12 of 12 settings stuck. A second Prepare found the server already
running, read back byte equal settings, and started no new ssh process. All three exec plane
refusals fired from the shipped bundle, two of them driven with a ledger row built at runtime
because production has no way to reach them. A machine whose program reports `0.0-p69-made-up` was
refused, and the refusal named the versions Tortie has measured.

**Two screenshots, driven by pressing the real controls and read rather than collected.** The
prepared row shows the headline `This machine is ready.`, the sentence naming
`/opt/homebrew/bin/tmux` and version 3.6a, the label `Version on that machine:` with 3.6a beside it,
the line saying the program was already running so Tortie left it running, the line saying Tortie
read the list of places that machine looks for programs, and the settings table. The refused row
shows the headline `Tortie has not measured the program this machine runs.`, the found version
`0.0-p69-made-up`, the measured list `3.6a, 3.7b`, the sentence `Nothing was changed on either
machine.` and the remedy. What the reader can see is absent from the refused row is any settings
table at all, which is the point, because nothing was started on that machine.

**Gates, from the committer's own runs.** typecheck, build, test, `smoke:t1`,
`assert-bundle-refusals`, `contract-inventory --check`, `conformance-machines`, `conformance:agents`
and `smoke:t3` all exited 0, with no flake to dismiss. Three contract lines were added and the
baseline was re-based in this commit: the `machines:prepare` channel, the `exec-plane` smoke mode,
and the machine refusal count moving from 6 to 10.

**What is not true.** The operator's four machines were never contacted, so their tmux versions are
unknown and every one of them is refused today. They join the list only after a measurement he
attends. Control mode was not opened against any remote tmux, so every row on the list says so and
M4 must measure before it opens one. The keepalive numbers were measured on loopback against a
frozen far side, which reproduces a hung pipe and says nothing about a tailnet with real packet loss
and real roaming, so research 51 section 7 question 3 stays open. No remote pane is created by this
rung, so nothing here proves a remote pane receives the captured program search list. The probe
writes the plane's option list a second time in its own file rather than importing the composer, so
the byte exact product argv is proven by the conformance gate and by the Electron harness rather
than by the probe. One ssh client was measured, being `OpenSSH_9.9p2, LibreSSL 3.3.6`, and the
golden files carry that client's wording. The prepared block states the same fact twice on screen,
once in main's own sentence and once in the honesty line under it, which is honest and repetitive.
No attach, create, kill, rename, machine badge, session list, restore or control plane was built,
and the verb ledger refuses most of that in code.

## Phase 68 — a machine you confirmed once is a place sessions can live (research 51, M1) ✅ SHIPPED 2026-08-17 (this commit, 0.32.0)

The M1 rung of the remote ladder. A machine is now a thing Tortie holds: a row in a file, a person's
agreement bound to a hash of the four fields that decide what runs, and one visible connection test
that proves Tortie can reach it. No session opens on a machine yet, and the section says so on every
visit.

**What shipped.** `machines.json` sits beside `agents.json` under `<userData>/gmux/config/`, read at
three moments and no others: boot, an explicit reload, and a file watcher with a 300 ms debounce.
Reading it starts nothing, and `whileReadingMachines` closes the connect gate for the length of the
read so a later round that wires "the file changed, so connect to it" fails at once and says why. A
row that fails a check is dropped whole with a sentence naming the field and the reason, and the
valid rows beside it survive.

The gate is `src/main/machines/confirm.ts`, with its own field type rather than the agent gate's
thirteen-field one, so the compiled ssh options stay out of the hash and a keepalive value Phase 69
measures cannot invalidate machines a person already confirmed. The hash covers `host`, `user`,
`port`, `remoteTmuxPath` and the prefixed row id. Confirmations share one sealed file with the agent
gate, `<userData>/gmux/config-confirmations.json`, under `machine:` keys, so a machine and a
configured agent with the same bare id can never share an agreement. Six refusals are asserted
against `out/main/index.js` by `build/assert-bundle-refusals.mjs`.

Settings then Machines is the only surface that can add, confirm, withdraw or remove one. The Add
flow runs the pinned Tailscale program to offer names, shows the absolute path it ran before it runs
anything, and never a name served by PATH. The one visible connection test runs ssh once in a pty,
shows every byte the program printed with ANSI stripped, and lets a person answer the program's own
question. It is the only `BatchMode=no` call site in the tree, counted by the gate.
`npm run conformance:machines` is the fourth gate of its shape, about a second, spawning nothing.

**The Add button could not add a machine, and that is the fix this round is mostly about.** The
renderer composed its own confirm sheet from four labels of its own and sent `hashRead: ''`. Main
compared that against the hash it had just computed and refused every add with "Tortie did not add
scratch-box, because the machine changed after it was shown." The list still read "No machines yet."
and no `machines.json` was written. Both builders reported it and neither fix landed. The hash covers
the absolute program path, and the machine only reports that path at the end of the connection test,
so a hash the renderer invents can never be the hash main computes. Main now composes the sheet at
the end of the test and sends the hash and the lines together on
`MachineTestOutcome.sheet`; the surface draws those exact lines and sends that exact hash back. The
four labels are gone from `machines-copy.ts` and `machines-copy.test.ts` fails if any of them
returns. `machines-store.test.ts` is new and reads the payload that crosses the bridge, because every
component test passed while the payload was wrong.

**The connection test wrote into the operator's home directory.** Measured read only: 932 bytes in
`~/.ssh/known_hosts` before a probe run and 1229 bytes after, three lines added, and Tortie's own
window said so. The command carried `StrictHostKeyChecking=ask` and named no host key file, so ssh
used its default, and ssh finds the home directory through `getpwuid` rather than `HOME`, so setting
`HOME` for the child moves nothing. Research 51 section 4.2 promised the opposite in as many words.
The command now names two files with `UserKnownHostsFile`. First is
`<userData>/gmux/machines/known-machines`, a file Tortie owns, and being first is what makes it the
only file a new key is ever added to. Second is the person's own file, read and never written, so a
machine they have known for years whose key has since changed still raises the alarm on Tortie's
first contact. Measured against a scratch sshd: 99 bytes written to Tortie's file and 0 to the
second; a wrong key placed in the second file produced REMOTE HOST IDENTIFICATION HAS CHANGED and
left that file byte for byte as it was. `conformance:machines` now reads the argv and fails when the
option is missing, when either file is absent from it, when the order is reversed, or when Tortie's
path is unquoted, and a deliberate reversal was watched failing. Research 51 section 4.2 is amended
in the same commit, and the section states the whole of it on screen in `HONESTY_OWN_RECORD`.

**One spec sentence moved to match the code.** Research 51 section 4.2 said the first ssh process for
a machine spawns on the person's confirm click. It spawns on their Test the connection click, which
comes first in the same flow, because there is nothing to confirm until the machine has reported the
program path. Measured: the confirm click starts zero ssh processes, sampled at 150 ms. The sentence
moved rather than the code, because making the confirm click open a second connection would add one
nobody asked for. The property the sentence protects is unchanged: it is a person's own click in
Settings, out of band of any agent turn.

**What the live probe measured.** `node build/probe-machines.mjs`, ten steps, six screenshots, green.
The carriage is a real `/usr/sbin/sshd` on 127.0.0.1 on a high port with keys generated in the run's
own directory, and a private key holder started by the probe holding exactly one key. Without that
holder the client had no way to use the key the scratch server accepts, so step 3 returned
`auth-refused` in 366 ms and steps 4 to 6 cascaded to "there is no machines.json to edit". Steps 3, 4
and 8 are driven by typing into the real fields and clicking the real controls, because a bridge run
cannot see a broken button: the previous round's three screenshots for the connection test, the
confirmed row and the alarm were all the same photograph of an empty section. The numbers: the test
came back `ok` in 693 ms with `/opt/homebrew/bin/tmux` reported by the machine; the sheet on screen
read `Machine: 127.0.0.1`, `Port: <port>`, `Runs this program on that machine:
/opt/homebrew/bin/tmux`; the Add button was enabled, the click wrote one row and
`machines.json` on disk carried the machine's own path; a stale hash was refused and wrote nothing;
an edit from outside the app moved the row to unusable in main 429 ms after the write landed, and the
screen showed it after the person pressed Check the file again; a label change
alone left the hash byte for byte; a port with nothing on it drew calm copy and a changed host key
drew the alarm, with the alarm block inside the 532 px the capture photographs; the client died with
the app, 0 survivors; and `~/.ssh/known_hosts` was 1229 bytes before the run and 1229 bytes after.
The operator's tmux server was counted at 28 sessions before and 28 after.

**Two things the probe found on the screen, and both are now fixed.** First, a row that stops being
usable kept its two lists behind the disclosure, because the open state only decided how the row
first rendered. The chip and the sentence changed and the evidence did not appear. `MachineRow` now
opens itself once, on that transition, and a person can still shut an unusable row and have it stay
shut. Second, and this is the one that took two probe runs to see: the window never learned that the
file had changed at all. Main knew 429 ms after the write landed and the row on screen still read
Confirmed, because nothing pushes a machines file change to a renderer and the only button that
re-reads appeared when a row had failed a check. Nothing unsafe happened, because the gate refuses on
the connect path whatever the screen says, but the screen said one thing and Tortie would have done
another. `Check the file again` is now always in the section toolbar. The configured agents surface
has the same shape and the same limitation, and it was left alone rather than given a new event
channel in a fix round.

**What is not true.** No session opens on a machine, and no code in this phase could open one. No
machine of the operator's was contacted, no remote tmux server was started and no remote tmux version
was measured; the dialect survey and the M5 fault matrix on a real tailnet machine stay owed and run
only when he is present. The failure taxonomy is pinned by fixtures rather than by golden files per
tested remote version, so an ssh release that rewords its messages is caught by the fixture tests and
by nothing else. The row that opens itself is proven by the live probe alone, because the unit tests
render statically in the node environment and `useEffect` never runs there. Nothing pushes a machines
file change to a window, so a person who edits the file by hand while Settings is open sees the old
rows until they press Check the file again; an event channel for that was deliberately not added in a
fix round. Step 5 and step 6 of the probe still poll main through the bridge, since no control on the
screen can edit the file from outside the app, and the stale-hash refusal is driven the same way for
the same reason. The
tailnet picker was exercised against the operator's real Tailscale program, which reported one peer
and no other machines, so the multi-peer list is drawn only in unit tests. `remoteProgram` had to be
typed into the Advanced field for the probe to reach a confirmed row, because a connection to this
same Mac runs a login shell whose PATH does not carry Homebrew's directory and `command -v tmux`
answers with nothing; the bare-name path is therefore proven to produce `no-program` and not to
produce a resolved path. Fourteen contract lines were added and the baseline was re-based in this
commit: the ten `machines:*` channels, `GMUX_SSH_BIN` and `GMUX_TAILSCALE_BIN` as development only
overrides both refused when packaged, the `machines` smoke mode, and `machines=6` in the bundle
refusal counts.

## Phase 67 — unreachable is not dead: the `unknown` status gets its producer (research 51, M0) ✅ SHIPPED 2026-08-17 (95aa770, 0.31.2, gates green)

The M0 rung of the remote ladder, landed against the local socket because the local bug was the
point. `SessionStatus` has carried `unknown` since Phase 19 item 6 and nothing wrote it. `refresh()`
read every `TMUX_UNREACHABLE` failure as death, reconciled against an empty list, and flipped every
non-exited row to `restorable`. One dropped link therefore drew a wall of Restore buttons over
agents that were still running, and pressing one starts a second agent on the same conversation.

**What shipped.** A failed list is now judged before it is believed. `serverProbeVerdict` in
src/main/tmux/errors.ts answers `no-server` or `not-confirmed` from the stderr the classifier
already stores, and only `no-server` reaches the empty-list reconcile. Everything else goes to
`markLocalServerUnreachable` in src/main/sessions/core.ts, which writes `unknown` on every row that
still claims liveness and schedules a retry 2 s later. The decision itself is pure and lives in
src/main/sessions/reconcile-plan.ts as `unreachableFlips`, `listAttemptOutcome` and the `MachineId`
type the M2 rung replaces with real ids. The write goes through `updateSession`, not `setStatus`,
because `setStatus` stamps `lastSeen` and nothing was seen. `liveIds` and `byTmuxId` are kept, since
they answer which tmux session to attach to and that answer is still right during an outage. No
capture sync runs on the flip, so the death backstop still fires exactly once, at confirmation.
Three skip sets gained `unknown`: the activity poll, the detected-status writer and the snapshot
pass. Only a completed list moves a row back out.

The presentation is derived from the rows, with no new channel. `machineUnreachable` in
src/renderer/app/status.ts reads the condition off the session list, `RegionBars` shows the one
condition line and hides RestoreAllBar while it holds, dock rows and strip tabs dim through a
`session-unreachable` class, and `statusVisual('unknown')` reads `unreachable` with the existing
hollow dot. The pane keeps its attach mounted and draws an overlay with no button. Input is refused
at the source, in `term.onData` and `term.onBinary` through a status ref, so keystrokes are dropped
rather than queued into a socket nobody has proven alive. The menu for an `unknown` row offers only
`Show what it loaded…` and `Copy directory path`, the × does nothing, and image drop refuses.

**One measurement moved the spec.** The spec drafted a second confirming pattern for
`error connecting to … (Connection refused)`. It is gone, because this client never prints those
words. Measured against tmux 3.6a on scratch sockets by the builder and again, independently, by the
verifier: `no server running on <path>` is printed only for a refused connect, and
`error connecting to <path> (<reason>)` covers every other errno. A socket file that does not exist
and a live server whose socket file was deleted print the same bytes, so a missing file can never be
read as death. `execTmux` also had to move from the default SIGTERM to SIGKILL: the tmux client
catches SIGTERM and exits 0, so a timed-out list resolved with empty stdout and read as a completed
probe with zero sessions, which is the same wall of Restore buttons by another route.

**What the live probes measured.** The verifier drove the real app three times on a scratch socket
with an isolated profile. Dropping the link to a live server put both rows at `unknown` in 0.98 s
and never at `restorable` across 29 samples, and a keystroke typed during the outage was absent from
the pane after recovery while the control keystroke typed before it was present. Restoring the link
returned the rows to `running` in 402 ms. In the decisive run the server was killed for real while
the link was still down: the rows held `unknown` for the whole 12.0 s the server was genuinely dead
and flipped to `restorable` 646 ms after the transport came back. Nothing was written to any exit
field in any run. The operator's tmux server was counted at 28 sessions before and 28 after.

**What is not true.** No remote transport was exercised. ssh, keepalives and master death are M2 and
M4. The wake path was not proven on real hardware; the chmod stand-in exercises the same branch,
which is all the classifier distinguishes. Nothing polls list-sessions on a timer, so the producer
only fires when something already schedules a refresh, and a link loss that leaves the attach client
alive keeps showing the old statuses until the next create, kill, boot, wake or control event. The
pane right-click menu in src/renderer/terminal/terminal-menu.ts is still gated on mount state rather
than status, so Split Session, Clear and the capture items stay clickable on an `unknown` row. The
verifier traced each one and none can duplicate an agent on a conversation, the worst outcome being
a visible error where a disabled item belonged. Paste is genuinely refused, because it arrives
through `term.onData`. A row whose death was already confirmed keeps its `restorable` status during
someone else's outage but loses the Restore-all bar for the length of it, since RegionBars suppresses
that bar whenever any visible row reads `unknown`; the row's own menu still offers Restore. After a
recovery the pane can show the pre-existing `This session has ended` overlay, because the attach
client died during the outage, even though the row itself is live. The confirming stderr set is only
as good as the fixtures for the bundled tmux, and a tmux upgrade that changes those sentences is
caught by the fixture tests rather than by any probe. This phase added no IPC channel, no `gmux.*`
key and no `GMUX_*` env, and the contract inventory matched its baseline byte for byte with no
re-baseline.

**Two more observations from the verifier, carried forward rather than fixed.** The first is the one
the operator will see. During an outage the same sentence prints twice on one screen, once in the
condition bar and once in the pane overlay, about six hundred pixels apart. Nothing is wrong with
either surface on its own and neither can be removed without deciding which one owns the message, so
it waits for a round that owns both. The second is a drift risk rather than a defect.
`machineUnreachable` in src/renderer/app/status.ts and `paneAccepts` in
src/renderer/dnd/drop/target.ts read `session.status` directly, where the spec says every surface
reads through `effectiveStatusOf`. The behaviour is identical today because nothing else rewrites
the status on the way out. It stops being identical the moment M4 gives each machine its own
reconcile, so Phase 71 fixes both call sites as part of its own work.

## Phase 80 — research: session focus mode (operator requested 2026-08-17) RESEARCH LANDED

Window full screen still shows the title bar, the activity bar, the sidebar and the session strip.
The operator asked for a keystroke that grows the session they are in, including a split group,
until only that work remains, with a quiet status-coloured wash and a short Mac-like flight.

**This phase is research only, and it was renumbered from 77 to 80 because Phase 77 is the quit and suspend contract queued the same evening.** The deliverable is `docs/research/53-session-focus-mode.md`.
Nothing under `src` changes until the operator queues a build. The document names the product
shape, weights mechanism and library options, and attacks the winner.

**What it decided, so a later build does not re-litigate it.**

- In-window focus of the active surface. Not window full screen. Not a second BrowserWindow.
- The unit is the surface, including every split leaf. Not one leaf pulled out of a group.
- Flight is a still copy, then one live swap. Never a width transition on a live terminal.
- Engine is the Web Animations API. No new npm package. GSAP is refused on license. Motion is
  refused as weight for one tween.
- Glow is a status wash on vacated chrome. Not a halo on the terminal. Not an agent brand colour.
- Never persist. Copy the editor-fill memento.
- DESIGN.md section 5 gains one sentence if this is built. Duration stays `--dur-panel`.

**What a later build must not regress.** Control-Command-F and the single packaged full screen
row from Phase 62.1. Editor fill. Hidden sessions stay detached. Activity status rules. The
terminal resize rule in `work-area.css`.

**Tier** of a later build: 2 for enter and leave, 3 for the claim that a live split group is not
resized until the flight ends. **Semver** of a later build: feat. Chord is chosen at build time
against the keymap and the operator's recorded per-agent hotkeys. Shift-Command-C stays free.
