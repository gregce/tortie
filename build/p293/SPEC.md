# Phase 293 — the Tabbed sheet. SPEC

Written 2026-09-18 against `origin/main` `ac011d9d`. REVISED the same day after two adversaries
attacked the first pass, one on lifecycle safety and one on truthfulness and buildability. §10
answers every finding by its number and says where the fix is or why the text stands. Builders
build from this file and verifiers verify against it. The operator's instruction, verbatim:
"Implement direction D, the Tabbed sheet, including the compact header, activity columns, inline
actions, and batch End."

The study is at `/Users/gdc/gmux/designs/` and is UNTRACKED in his checkout. Read it by absolute
path, read only. Never copy it into the worktree and never commit it. In this file `V:` is
`session-manager/views.js`, `A:` is `app.js`, `S:` is `styles.css`.

**Tier 3.** It ends processes, one and many at a time; it claims every project, machine and agent;
a batch is a new way to be wrong about a target. Independent methods: a per-row matrix over real
data, an attack on batch End and on identity, and the aggregate re-derived over the Phase 137
corpus. Fix once, reverify, stop.

Every path below is relative to the worktree root unless it starts with `/`. Every line number was
read from the tree at `ac011d9d`.

---

## §1 What a person can do when this lands

1. From Session → Manage Sessions… a person sees every session Tortie manages, across every project
   and machine, grouped by the folder and machine it belongs to, whether or not that project has an
   open tab, and the door works with no project open at all.
2. Each row says what state the session is in, when it was created, how many messages its current
   conversation holds and how long ago the last one was, and the columns sort.
3. One visible button ends a running session or restores an ended one, and the confirmation, the
   rename, the saved output, the details and any error open inside the sheet under that row.
4. Checkboxes select rows, the header checkbox selects every row the filters leave, and one
   confirmation ends the running ones together: it names each one first, it never ends a session
   it did not name, and it reports row by row what happened.
5. Session → Past Sessions… opens the same sheet on its second tab, where a removed session is
   restored without opening its project first. **The tab is one list, newest removal first, as
   today's panel is**, each row naming its project, and it groups only when the project filter
   names one project (§12, the operator's ruling). **A restore from the Past tab closes the sheet and
   puts the person in the session, as today's Past Sessions panel did** (§11, W1): the first build
   kept the sheet open and offered the way there only in a toast, which the no-regression verifier
   measured as worse than today. A restore from the Managed tab keeps the sheet open and offers the
   way to the session in its toast, because a person managing sessions works down the list.

**What is deliberately not true.**

- **"Agent messages" are closing replies on record, at most one per turn.** The store keeps one
  answer per turn (`src/main/overview/reader/fold.ts:107-114`), because research 63 measured the
  narration between tool calls as noise. The study's sample of 26 you and 58 agent cannot come out
  of this store. The agent count never exceeds the turn count.
- **The count is of the CURRENT conversation record.** When an agent starts writing a different
  record file (claude after `/clear`, a resume that mints a new id), the reader drops its watermark
  (`src/main/overview/service.ts:263-268`) and replaces every stored turn
  (`service.ts:306-314`). A row can read `8d old` beside `Messages 2` with coverage complete. The
  Messages heading says "in the current conversation" for that reason.
- **A codex goal-loop session under-reports.** `dropTurnsWithNoAsk` drops those turns whole
  (`fold.ts:100-106`), so their replies are not counted and the last-message time can be hours
  stale while the agent works. The reader DOES count the dropped turns on each read
  (`fold.ts:101-104`, `reader/containers.ts:383 droppedByReason`); the store has no column to keep
  the number, so nothing downstream can see it. One integer column would fix this and R3 together,
  and is the operator's ruling (R3, R12). It is a stated limit and a row in the verifier's matrix.
- **Two agents record no time per reply.** cursor records a minute-resolution time on the prompt
  and none on the reply (`src/main/overview/keep-map.json:1976`, `:2019`); deepseek records no
  time per message at all (`:1739`, `:1776`). The Last message cell says which clock it drew
  (§3.4) and never draws a prompt's time, or a session's, as a reply's.
- **A `0` means a record was read and held no message Tortie keeps.** It cannot tell a new
  conversation from a vendor format change that made the keep map stop matching.
  `conformance:overview` is the gate for that failure. Stated limit, R14.
- **A session on another machine shows a dash for messages.** Its history is not on this Mac.
- **A session created on another machine by something other than Tortie may show a dash for
  Created.** The far side's tmux field can be unreadable and then reads 0
  (`src/main/machines/remote-sessions.ts:952`).
- **Nothing ends by itself.** No timer, no policy on closing a project. Issue 27's second half is
  the operator's ruling and is not made here.
- **No batch Remove, no batch Restore, no memory or CPU meters.** No NEW path reaches the hard
  delete. Restart, a shipped verb the policy already offers on ended local rows, reaches it for the
  old row only and only after the replacement exists (§4.6).
- **"Last confirmed alive" is not drawn.** `lastSeen` never reaches the renderer
  (`remote-sessions.ts:1141-1163` projects nine fields). Diagnostics keeps it.
- **A row Tortie cannot reach offers reads only**, exactly as it does on every other surface.
- **A batch never ends a session on a machine Tortie has no row for in this run.** Such a row draws
  its RECORDED status, and ending it sends nothing anywhere (R11).
- ~~**The counts are only as right as the reader and the manifest's binding**~~ (the aggregate
  verifier's C1 to C3): a codex reply written only as an `AgentMessage` whose part type is `Text`
  is not read (C1); a codex row bound by the weak harvest keys can draw another folder's
  conversation (C2); a slash command with no arguments is not counted as the person's message, so
  a session driven only by one can read `No messages yet` (C3). **C1 and C3 were FIXED in Phase 299**:
  the codex answer slot accepts both spellings and codex's map version went to 2; the bare-command
  rule moved out of the engine into the keep map and claude's version went to 2. **C2 WAS BUILT AND
  THEN REMOVED from Phase 299 before it landed, and it is Phase 300's**: its refusal was sound (28
  good folder classes, none refused) but the comparison ran AFTER the read and threw away a full
  synchronous read on every ask for ever, and the cheap repair (a stored watermark) makes the next
  read a tail read that never reaches a codex record's folder, which reinstates the defect. So this
  limit STILL STANDS at 299's build, and C4 and C5 below are still true and still queued. **Phase 300
  did not build C2 either**: it landed the cache alone (below), so the folder comparison is still
  carried as a note and a counts read from byte 0 still answers the same folder as today.
- **One row's first read can hold main for as long as that record takes, AND PHASE 300 LEFT THAT
  EXACTLY WHERE IT WAS**: up to about 0.8 s for a 196 MB codex record, measured with the page cache
  warm, and about 1.7 s for a record the size of the largest on the operator's Mac, measured in the
  app on 2026-09-21 over a synthesised 960 MiB record (1692 to 1834 ms across four quiet runs). The
  refresh yields between rows, not inside one. Catch Me Up's own read yields nowhere, so this is no
  worse than today (C4). Phase 300 built two things for C4 and landed neither, and this limit says
  so because a SPEC that stated the win would be a SPEC a later round builds back: a reduced counts
  read that skipped the path index measured FASTER under node 22 and 15 to 47 percent SLOWER under
  the engine main actually runs (that same 960 MiB record 1692 to 1834 ms today against 2103 to
  2513 ms with it, four of four pairs), and it was removed under the operator's rule; and the flag
  that skipped the index, which alone bought about a quarter off the sheet's first read of a large
  codex record, cost a full re-read of that record on every Catch Me Up and every automatic fold
  while the sheet was open on a session still talking — about 1.7 s a cycle on 960 MiB against under
  a millisecond today — and the operator dropped it on 2026-09-21. The measured direction for the
  queue is the scanner not copying a line it is about to reject: 1122 ms on the 960 MiB record with
  no main-thread block, and a line spanning chunks (his largest is 18.5 MB) still needs the copy
  path. Whether a row may ever say something honest about a number it has not finished counting —
  the tail-first read — is the operator's ruling and no phase has taken it. **C5 is closed for the
  repeat ask and unchanged for the first.** A claude row with no record still costs one scan of
  `~/.claude/projects`, about 19.5 ms over 2,776 directories, the FIRST time it is asked in a
  window; the fallback's negative answer is now remembered per home, provider and id for 30 s,
  bounded at 512 keys, handed in on `ResolveEnv` and never module-level, so the second and every
  later ask inside the window costs one `statSync` of the direct path: a repeat pass over 161 such
  rows fell from about 1.9 s to about 11 ms in the app, and a repeat ask of one such row from about
  9 ms to under 1. The first pass over N never-asked rows still pays N scans, because those are N
  distinct ids and nothing is shared within one pass.
- **At 300 sessions a sort, a filter change or a search keystroke takes two to four frames**, not
  one: measured 12 to 26 ms of work and 15 to 72 ms to paint, with three other probes running (the
  press verifier's P5). The grid is not windowed. That is the stated budget.

---

## §2 The surface

### 2.1 Rules that bind every line of CSS and copy

- **Tokens only.** No colour literal in any file this phase adds. `src/renderer/styles/tokens.css`
  is NOT edited and no token is added, so `conformance:hue` (13 minutes) is not owed. Geometry
  numbers (52, 47, 46, 1180) are not colours and live as custom properties on `.session-sheet`.
- **`--text-muted` only on `--bg-surface`.** `tokens.css:39` measures it at 4.91 on surface and
  4.15 on `--bg-active`. On `--bg-raised` and `--bg-active` grounds use `--text-secondary`.
- **A hairline drawn ON `--bg-active` is `--border-active`** (`tokens.css:25`). Between regions it
  is `--border`.
- **No tmux vocabulary.** No "pane", "window", "prefix", "attach", "detach", "socket", "server".
- **Just enough words.** The resting face carries labels. Explanation lives in a heading's hover
  title or inside the Details expansion.
- **Class prefix `sm-`.** The root is `.modal.session-sheet`. Overrides of shared modal classes
  carry the second class so they win on specificity and never on bundle order
  (`src/renderer/app/past-sessions.css:1-15` states the rule).
- **The shipped vocabulary wins over the study's** wherever they differ, because a second wording
  is a second policy. The rulings are listed in §9.
- **Every press re-reads.** Nothing in the sheet acts on a `Session` object it was handed earlier.
  §4.0 is the rule and every handler in this section obeys it.

### 2.2 Geometry

| Element | Value | Token or reason |
| --- | --- | --- |
| Scrim | the shipped `.modal-scrim` (`src/renderer/styles/app.css:1432`) plus `.session-sheet-scrim` | `--bg-scrim`, `--z-modal`. `.session-sheet-scrim::before { flex: 0 0 var(--space-8) }` replaces the 20vh headroom |
| Sheet | `.modal.session-sheet`: `width: min(1180px, calc(100vw - 48px))`, `flex: 1 1 auto`, `min-height: 0`, `max-height: none`, `padding: 0`, `overflow: hidden`, `display: flex`, `flex-direction: column` | ground `--bg-surface`, border `1px solid var(--border)`, shadow `--shadow-3`, all inherited from `.modal` |
| Corner | `var(--r-lg)`, 10px | `src/renderer/app/frame-geometry.css:36-52`: `--r-frame` has exactly one user and `--r-lg` is reserved for modals. The study's 14px is ruling R2 in §9 |
| Title bar | `height: 52px; min-height: 52px; padding: 0 var(--space-7); gap: var(--space-8); border-bottom: 1px solid var(--border)` | `--sm-title-h: 52px` |
| Toolbar | `height: 47px; box-sizing: border-box; padding: 0 var(--space-7); gap: var(--space-4); align-items: center; flex-wrap: nowrap; border-bottom: 1px solid var(--border)` | `--sm-toolbar-h: 47px`. STATED OUTRIGHT in both modes. Tortie's `--field-h` is 28px and `.btn-sm` is 24px, so the study's arithmetic gives 45 and the equality would not hold by itself |
| Selection toolbar | the same element, `data-mode="selection"`, ground `--accent-wash` | the same 47px |
| Grid scroller | `.sm-scroll { flex: 1; min-height: 0; overflow: auto }`. The batch panel and the grid both live inside it, and the batch panel draws above whatever state replaces the grid | |
| Sticky headings | `thead th { position: sticky; top: 0; z-index: 1; background: var(--bg-raised); padding: var(--space-3) var(--space-5); font-size: var(--text-xs); line-height: var(--lh-xs); font-weight: var(--weight-medium); text-transform: uppercase; letter-spacing: var(--track-caps); text-align: left; white-space: nowrap; color: var(--text-secondary) }` — **28px**, `--sm-head-h` (Phase 298 mechanism 4) | Draw the rule under it with `box-shadow: inset 0 -1px 0 var(--border-strong)`. A border on a sticky `th` under `border-collapse: collapse` drops out in Chromium. The app's heading idiom is unanimous across 26 rules; the colour is the ONE deliberate deviation from it and stays `--text-secondary`, because `--text-muted` measures 4.15 on `--bg-raised` and is under the floor |
| Grid | a real `<table class="sm-grid">`, one `<tbody>` per group: `border-collapse: collapse; width: 100%; table-layout: auto; font-variant-numeric: tabular-nums`. NO `font-size`: it inherits `body`'s `--text-base` / `--lh-base` (Phase 298 mechanism 2) | the grid's own `--text-sm` made `.sm-name` draw 12px here and 13px in the Past list, for the same name |
| Row | `tr.sm-row { height: var(--sm-row-h) }` where `--sm-row-h: calc(28px + 2 * var(--space-3))` — box **40**, pitch **41** (Phase 298 mechanism 1) | row height = tallest child + 2 × `--space-n`, and the tallest child is `.btn`'s own 28px. `border-collapse: collapse` puts the hairline BETWEEN two rows, which is the pixel between 40 and 41; the Past list's `box-sizing: border-box` holds its own hairline inside the box, so its box and pitch are both 40. The two readings are taken SEPARATELY by `probe:p293` arm 11 so the two layout models are never conflated |
| Data cell | `padding: var(--space-3) var(--space-5); border-bottom: 1px solid var(--border); vertical-align: middle; white-space: nowrap`. `.sm-cell-small { font-size: var(--text-xs); line-height: var(--lh-xs); margin-left: var(--space-3); color: var(--text-secondary) }`, INLINE (Phase 298 mechanisms 3 and 17) | row hover `--bg-raised`, `transition: background var(--dur-fast) var(--ease-out)`. The class replaces `td > small` AND `.sm-name small`, whose two different top margins were two spellings of one thing, and the ratio `line-height: 1.5` they shared was the only ratio line-height in either tree |
| Checked row | ground `--bg-active`, hairline `--border-active` | |
| Select column | `width: 46px; padding: 0 0 0 var(--space-4)`. Hit target 32 by 32, input 14 by 14, `accent-color: var(--accent)` | precedent `app.css:1764` |
| Session column | `min-width: 155px`. Name `flex: 0 1 auto; min-width: var(--sm-name-min); max-width: 175px`, ellipsis, at `--text-base` / `--lh-base` and `--weight-medium` | `--sm-name-min` is MEASURED and never chosen: canvas `measureText` on the live `.sm-name strong`, with that element's own computed font, over the run's own session names and the operator's twelve, taking the first FOUR characters of each — the shortest prefix that both reads as a word and tells the operator's twelve apart — and rounding up onto the 4px grid, which is the method `app.css:198-220` records for `.ptab-name`'s 46px. `probe:p293` arm 11 re-reads the number the CSS declares and holds it to a BAND: the prefix alone is the floor, the prefix plus the ellipsis glyph is the ceiling. The two differ because `text-overflow: ellipsis` takes its own width out of the visible text, so only the stricter form guarantees four characters are still there once it has; the tab's 46 does not, and the entry points at the tab. A number outside the band was chosen rather than measured. It is NOT a row in `gate:tab-floor`'s table: that gate measures a different surface at a different size |
| Actions column | `min-width: var(--sm-actions-min); padding-right: var(--space-7)`. `.sm-row-actions { display: flex; justify-content: flex-end; gap: var(--space-3) }` | `--sm-actions-min` is re-derived from what the cell HOLDS — a `.btn.btn-sm` reading `End session…`, a 28px ellipsis and one `--space-3` gap — and arm 11 reads it. The 170px it replaces was given rather than derived, and it had a second job as the Past row's flex basis, which now has its own name, `--sm-past-identity-min` |
| Group header | `<tr class="sm-group"><th colspan="7" scope="rowgroup">`, padding `var(--space-2) var(--space-8)` — box **28**, pitch **29** — ground `--bg-surface`, bottom rule `--border`. It scrolls. It does not stick and does not collapse | the study's 26px inset has no token; `--space-8` is 24. The 28 is `.section-header`'s height without its uppercase, and it is exact because the label is `--text-base` / `--lh-base`: 20 + 2 × `--space-2` |
| Inline panel | `padding: var(--space-6); border: 1px solid var(--border-strong); border-radius: var(--r-md); background: var(--bg-raised); scroll-margin-top: calc(var(--sm-head-h) + var(--space-6))`. Its row's ground is `--bg-active` | title `--text-base` at `--weight-semibold`, body `--text-sm` at `--lh-base`, `max-width: 80ch`, buttons right, Cancel first. The scroll margin is what 60px always was: the sticky heading's height plus a gap |
| Footer | `padding: var(--space-3) var(--space-8); border-top: 1px solid var(--border); font-size: var(--text-2xs); line-height: var(--lh-2xs); color: var(--text-muted)` — **29px** | kept at the 10px step deliberately: a footer is a footnote, which is what that step is for, and it is the sheet's ONE user of `--text-2xs` outside a chip |
| Icon button | 28 by 28, `--r-sm`, and it carries the shipped `icon-btn` class — `.sm-icon-btn` keeps only placement, size and hover | hover `--bg-raised`, the value twenty `.icon-btn` sites use, except on a row, where the row's own hover has already taken `--bg-raised` so the row's button goes to `--bg-active` |
| Chips | the shipped `.chip-sm` (`globals.css:345-349`: `height: 16px; font-size: var(--text-2xs); padding: 0 var(--space-2)`) with `min-width: 16px` from `.ab-badge`, for the tab counts and the group header's `Open tab` / `Tab closed` | the 19px min-width, the `2px 5px` and the `1px 6px` it replaces are on no grid, and the result is the same 16px box the machine badge beside them already is |
| Focus | `box-shadow: var(--focus-ring)` on `:focus-visible` | `tokens.css:364`. There is exactly ONE focus rule in the tree and it is the global; the sheet states all three declarations on `.sm-select:focus-visible` so a later reader can tell the ring is intended, and the sheet CONTAINER's suppressed ring stays, because the sheet takes focus when a person clicks its empty ground and that is not a control |
| Title | `Sessions`, `font-size: var(--text-lg); line-height: var(--lh-lg); font-weight: var(--weight-semibold)` | `.modal-title` and `.empty-title` are the app's title step, and a 28px line box clears the 52px bar with 12px to spare. The earlier note here said 20px was too tall for the bar; it was about 20px beside a 15px tab label, not about the bar's height |
| Status dot | the shipped `.dot .dot-working .dot-attention .dot-idle .dot-ended .dot-failed` (`src/renderer/styles/globals.css:281-315`), 8px | the kind comes from `statusVisual`. NO dashed ring: `status.ts` says no new shape is invented for a state a person cannot act on |
| Buttons | End: `.btn.btn-secondary.btn-sm`, and on hover `background: var(--error-wash); border-color: var(--error); color: var(--error)`. Restore: `.btn.btn-secondary.btn-sm`, and on the Past tab it ALSO carries `past-restore`, which `src/renderer/app/shell-path-shot-drive.ts:170` reads. Confirm: `.btn.btn-destructive`. Primary inline: `.btn.btn-primary` | `globals.css:157` |
| Narrow | the grid scroller scrolls sideways. Below 1100px the cell padding drops to `var(--space-3) var(--space-4)` and the name to 135px | only the HORIZONTAL term moves, so the narrow row can never be TALLER than the wide one, which the first spelling of this row would have made it. The 1100 stays a literal because a custom property is not readable in a media query |
| Toast strip | `.sm-toasts`, a `flex: 0 0 auto` column between `.sm-scroll` and the footer: `align-items: flex-end; gap: var(--space-4); padding: var(--space-4) var(--space-8)`, and `:empty { display: none; padding: 0 }` | while the sheet is open the toast host portals its stack into `[data-sm="toast-outlet"]`, so a toast takes height from the scroller and covers nothing. Empty it takes no height, which is what keeps the rows-per-sheet reading honest. `pointer-events: none` is refused: a sticky toast's only exit is its own × and its action button |

Motion: rows and the Past rows ease `background var(--dur-fast) var(--ease-out)`; the icon buttons,
the tabs and the sort headings ease background and colour; `.btn.sm-end` names `background,
border-color, color`, because its hover moves three. The sheet still uses `.modal`'s own
`gmux-modal-in` and nothing MOVES. **No `prefers-reduced-motion` block in either stylesheet**:
`tokens.css:655-697` drops the duration tokens to 1ms and sets `transition-property: none !important`
on `*` app-wide, which is the reason to write the durations as tokens in the first place.

### 2.3 The title bar, left to right

- `<h1 title="Sessions across every project and machine">Sessions</h1>`.
- The tablist: `role="tablist" aria-label="Session lifecycle"`. Two `role="tab"` buttons,
  `id="sm-tab-managed"` and `id="sm-tab-past"`, `aria-controls="sm-panel"`, `aria-selected`. BOTH
  are `tabIndex={0}`: `trapTabKey` (`src/renderer/app/focus-trap.ts:20-45`) counts a
  `tabindex="-1"` button as focusable, so a roving tabindex breaks its wrap, and that file is not
  edited. Labels `Managed` with a `terminal` codicon and `Past Sessions` with a `history` codicon.
  Each carries a count chip: `--text-xs`, `--r-sm`, padding `2px 5px`, min-width 19px, ground
  `--bg-raised`. **The counts are whole-tab totals**, `sessions.length` and `pastSessions.length`.
  Filters never change them. The selected tab has `--text-primary` and a 2px `--accent` underline at
  `bottom: -1px`. The panel is `id="sm-panel" role="tabpanel" aria-labelledby="<tab id>"`.
- **A tab is NEVER `disabled`.** While a batch runs both tabs carry `aria-disabled="true"` and the
  store refuses the change (§2.10). A disabled button cannot take focus, and the selected tab is
  the last stop of every focus chain (§2.13), so it must always be able to.
- Right cluster, `margin-left: auto; gap: var(--space-4)`: a refresh icon button,
  `aria-label="Refresh session list"`, codicon `refresh`; a close icon button,
  `aria-label="Close session manager"`, codicon `close`.
- The study's `All machines` label is NOT drawn (ruling R6).

### 2.4 The toolbar, filters mode

- Search: `FilterField` (`src/renderer/controls/FilterField.tsx`), `inputRef`, `flex: 1;
  min-width: 180px`, placeholder `Search sessions or projects`. Give its input `id="sm-search"`
  through the wrapper's ref on mount if the control takes no id.
- `#sm-filter-project`, a native `<select>`, 170px, `aria-label="Filter by project"`. Options:
  `All projects`, then one per group of the CURRENT tab in group order. An option reads the group
  label, then ` · <machine label>` for a group on another machine, then ` · tab closed` when it has
  no open tab. The value is the group key. **A chosen key whose group no longer exists resets to
  `all` and clears the selection** (§3.6).
- `#sm-filter-tab`, 136px, `aria-label="Filter by open or closed project"`: `All project tabs`,
  `Tab closed`, `Tab open`.
- `#sm-filter-state`, 114px, Managed tab only, `aria-label="Filter by session state"`:

| Option | Statuses it keeps |
| --- | --- |
| `All states` | every one |
| `Running` | `running`, `needs_input`, `idle` |
| `Working` | `running` |
| `Needs input` | `needs_input` |
| `Idle` | `idle` |
| `Ended` | `exited`, `restorable` |
| `Unreachable` | `unknown` |

- All selects are 28px high (`--field-h`), `--text-sm` since Phase 298. The five controls combine
  with AND: since Phase 303 the lifecycle control `All | Active | Ended` sits BEFORE the State
  select on Managed and reads the row's own gates — Active is `row.gates.live || row.gates.unknown`,
  Ended is `row.gates.ended`, no status named — and State refines inside it; its DOM is in §2.14.
- Search is a trimmed, lowercased substring match over the row's `searchText`, which is
  `name`, `agentShortLabel(agent)`, the group label, `displayPath(path, machineId)`, the group's
  path AS MAIN STORED IT, the session's own folder when it differs, and the machine label joined by
  spaces. The stored path is there because today's Past Sessions matched a pasted absolute path and
  a user name, and under `/Users/<name>` the drawn form is `~/…` (§11, W4). Lowercasing a haystack for display matching is not a path comparison.
  NOTHING in this phase compares two paths case-folded (`src/shared/workspace-target.ts:114-136`).

### 2.5 The Managed grid: seven columns

| # | Heading | Hover title on the heading button | Sort key |
| --- | --- | --- | --- |
| 1 | the select-all checkbox `#sm-select-all` | | none |
| 2 | `Session` | `Session` | `name`, `localeCompare` |
| 3 | `State` | `State` | the drawn state label, `localeCompare` |
| 4 | `Created` | `When the session was first created, not when its project tab was last opened.` | `createdAt`, or null when it is not above 0 |
| 5 | `Messages` | `User messages plus agent replies in the current conversation. Tool events and shell output excluded.` | the drawn total, or null |
| 6 | `Last message` | `Time since the most recent recorded user or agent message. Not the last time the process was seen alive.` | `lastMessageAt`, or null |
| 7 | `<span class="sr-only">Actions</span>` | | none |

**Sort.** Each heading is a `<button data-sort="<key>">`. First click ascending, second click on
the same column flips. Glyph `arrow-both` unsorted (Phase 298 mechanism 9; `unfold` reads as ✕ at 12px, which `search/ResultsList.tsx:371` already refused in those words), `arrow-up` ascending, `arrow-down`
descending. The `th` carries `aria-sort`. On first open nothing is sorted and rows keep main's
order. **Sorting reorders rows inside each group. Groups never reorder.** **A null sorts LAST in
both directions.** The study sorts null as -1, which puts every shell first on an ascending Messages
sort; that is a study bug and is not copied. Sorting keeps the selection, the open expansion and
focus on the heading button.

**Cells.**

- **Session.** `<button class="sm-name" data-manage-name="<id>">` holding `AgentIcon` at 19px,
  `<strong>` the name, `MachineBadge` for a session on another machine (it draws nothing for a
  local one, `src/renderer/app/MachineBadge.tsx:30`), and `<small>` `agentShortLabel(agent)`
  (`src/renderer/state/agents.ts:254`). A click opens Details.
- **State.** `<span class="dot dot-<visual.dot>">` and the label from
  `statusVisual(status, session)` (`src/renderer/app/status.ts:296`), drawn with its first letter
  raised by CSS: `.sm-state-label { display: inline-block } .sm-state-label::first-letter {
  text-transform: uppercase }`. So a person reads `Working`, `Needs input`, `Idle`, `Ended`,
  `Failed (exit 1)`, `Killed (SIGTERM)`, `Saved`, `Not running`, `Unreachable`. `Needs input` is
  drawn in `--status-attention`. For an ended LOCAL row a `<small>` reads `Conversation saved` when
  `resumeReadiness(session) === 'conversation'`, otherwise `Output saved` when the row is
  `restorable` or has saved material, and nothing when it has none: `Output saved` would be false
  there, and its disabled Restore already says why (corrected from the matrix verifier's P5). A row on another machine
  draws no small there, because the projection carries neither `resumeArgv` nor `resumeCapture` and
  the renderer cannot know (`sessions-slice.ts:1084-1093`).
- **Created.** Main: `dayLabel(createdAt, now)`, being `Today`, `Yesterday`, `Sep 16`, or
  `Sep 16, 2025` for another year, by the local calendar day. `title` is `exactTime(createdAt)`.
  Small: `<ageTwoUnits> old`. **When `createdAt` is not above 0 the cell is `—` with no small and
  no title**, and the row sorts last on this column. A feed-only row on another machine reads 0
  when the far side's field is unreadable (`remote-sessions.ts:952`), and `Dec 31, 1969` beside
  `20,000d old` is a lie.
- **Messages and Last message.** §3.4 owns the mapping. Pending, before the first answer for that
  row: main `…` with `aria-busy="true"` and no small. A shell and a session on another machine do
  not wait: they draw their final dash at once. **No row stays pending**: a call that rejects
  settles every id it asked for (§3.5).
- **Actions.** ONE visible button, then the ellipsis `<button data-manage-more="<id>"
  aria-haspopup="menu" aria-label="Actions for <name>">`, codicon `ellipsis`.

**Formats**, all in `src/renderer/session-manager/format.ts`:

- `ageTwoUnits(thenMs, nowMs)`: under 60 s `Ns`; under 60 min `Nm`; under 24 h `Nh Mm`; otherwise
  `Nd Nh`. Never "now". It is NOT `formatAge` (`src/renderer/format.ts:6`), whose callers want one
  unit, and `formatAge` is not edited.
- `exactTime(ms)`: `new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', year:
  'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })`. No zone suffix. The study's
  `ET` is a fixture artefact.
- `removedDate(removedAtMs, nowMs)`: `Aug 12`, or `Aug 12, 2025` for another year. It replaces
  `removedDateLabel` (`PastSessionsModal.tsx:59`), whose word moves into the slot's own prefix.
- Ages re-render on `useNow(10_000)` (`src/renderer/format.ts`), the ⌘J overlay's interval.

**Footer, Managed:** left `<n> managed session` or `sessions`, counting the rows the filters leave.
Right: nothing. The study's key is ruling R6.

### 2.6 Group headers

- A group is ONE workspace target (§3.2). Left: a `folder` codicon, `<strong>` the label at
  `--text-sm` semibold, the count of rows visible in that group after filters in `--text-muted`,
  and a chip: `Open tab` (transparent border, `--text-muted`) or `Tab closed` (`1px solid
  var(--border-strong)`, `--text-secondary`), `--text-2xs`, padding `1px 6px`, `--r-sm`.
- Right: `displayPath(path, machineId)` (`src/renderer/format.ts:61`) at `--text-xs`, ellipsis,
  `max-width: 40%`, the full path as `title`; a group on another machine adds ` · <machine label>`.
  A local group adds nothing. Remote reads like local.
- Groups with no visible row are left out.

### 2.7 Row states, the visible button, and the refusals

`status` is `effectiveStatusOf(session)` (`src/renderer/state/store.ts:173`). The gates are
`sessionActionGates` (§4.1), never a fourth inline copy.

| State | Statuses | Visible button | Refused on this row |
| --- | --- | --- | --- |
| Live | `running`, `needs_input`, `idle` | `End session…`, codicon `close`, `data-verb="end"` | Restore, Restart, Remove |
| Ended, restore offered | `exited` with material, `restorable`, or a remote row with `machine.canRestore` | `Restore`, codicon `history`, `data-verb="restore"`. Title: `restoreActionCopy(session)` for `restorable`, `restoreExitedCopy(session)` for `exited`, none for a remote row. Disabled with `SHELL_PATH_PENDING_TITLE` while `!shellPathReady`. Reads `Restoring…` and is disabled while `restoringIds[id]` | End |
| Ended, restore refused | a remote row with `!machine.canRestore` | `Restore` disabled, title `machine.restoreReason` | End, Restore, Restart |
| Ended, nothing to restore | `exited`, local, `!hasRestoreMaterial` | `Restore` disabled, title `NOTHING_TO_RESTORE_TITLE` | End, Restore |
| Unreachable | `unknown` | `End session…` DISABLED, title `END_UNREACHABLE_TITLE` | every verb that acts: Rename, Restore, Restart, End, Remove, Go to session |
| Past | `discarded` | `Restore` | everything but Restore and the reads |
| Past, machine removed | `discarded` with `machineGone` | `Restore` disabled, title `tombstoneRestoreRefused(label)` | everything but the reads |

- **A busy row is inert.** While `restoringIds[id]` is set, or while the row's own inline verb is
  busy (`sessionSheet.inline.id === id && inline.busy`), that row's visible button, its ellipsis
  and its checkbox are `disabled`.
- **The visible button can change verb under a finger.** A row that ends by itself flips
  `End session…` to `Restore` in place, and an Enter meant for End would restore. So a focused
  `[data-manage-primary]` whose `data-verb` changes moves focus to the row's
  `[data-manage-name]` in the same commit (a `useLayoutEffect` on the verb). When the button lost
  the keyboard BEFORE that commit, the sheet's reclaim does the same: it remembers the verb the
  button carried when it took the keyboard and never hands the keyboard back to a button whose verb
  changed (§2.13, the press verifier's P4).
- A row whose `id` is an empty string cannot occur by type. It is drawn with no checkbox, no button
  and no ellipsis, the projection test plants one, and `visibleIds` never contains `''`. **Nothing
  without a session id is ever a target.** The sheet's only inputs are `useApp().sessions` and
  `useApp().pastSessions`. No diagnostics row reaches it, and a source-text pin holds that the
  domain imports nothing from diagnostics.

### 2.8 The ellipsis menu: NATIVE, through `ui:popupMenu`

`setMenu({ x: rect.left, y: rect.bottom, items: manageMenuItems(row) })`
(`src/renderer/state/overlays-slice.ts:103-124` → `src/renderer/app/ContextMenu.tsx:75-94`). There
is no DOM menu and no fallback. The study's `#row-menu` popover is not built.

`manageMenuItems(row)` is, in order:

1. `Session details`, no glyph. It opens the Details expansion.
2. `Go to session`, no glyph, Managed rows only, omitted for `unknown`. §4.7.
3. `'sep'`.
4. Every item of `sessionMenuItems(session, 'manage:' + id, sheetHost)`, UNCHANGED in set, order,
   label, glyph, hint, sublabel, `disabled` and `destructive`. The host changes what `run` does and
   nothing else (§4.2).

**A native menu runs the closure that was built when the menu was drawn**
(`ContextMenu.tsx:74-93`), which can be seconds old. So every `run` under the host carries the
session's ID and nothing else, and the host re-reads and re-checks at the pick (§4.0).

Both sheet-own items are bare on purpose: no mark in `MENU_CODICONS` is true of "open this
expansion", and `terminal` is already worn by `Resume conversation` in the same menu. Write that
reason at the call site. The shipped labels stand: `Rename`, `Restore`, `Restart`, `Remove`,
`End session…`. The study's `Rename…`, `Restart fresh…`, `Remove…` and `Go to project` are not
used.

### 2.9 Inline expansions

An expansion is `<tr class="sm-inline-row" data-manage-inline="<id>" data-kind="<kind>"><td
colspan="7"><div class="sm-inline">` directly under its row. On the Past tab it is a sibling `div`
under the row. **Its React key is `` `${id}:${kind}` ``**, so a panel that changes kind remounts
and a held key never lands on the button that replaced the one it was pressed on.

- **One at a time, and never beside a batch panel**: opening one closes the other.
- **While an inline verb is busy no other expansion opens**, on any row, and no batch opens. While
  a batch runs no expansion opens. The store refuses both (§6, `setSessionSheetInline`,
  `openSessionSheetBatch`).
- On open the panel scrolls into view with `block: 'nearest'` and focus goes to the text input for
  rename, otherwise to the panel's close icon button (`aria-label="Close session action"`).
  **Initial focus never goes to a destructive button.** `ConfirmDialog.tsx:16` does the opposite
  and the sheet does not copy it.
- A panel that turns `failed` focuses its `Close` button, never `Retry`.
- On close focus goes down the chain `[data-manage-name="<id>"]`, then the selected tab (§2.13).
- Any panel may carry an error line, `role="alert"`, in `--error`, above its buttons, and a busy
  state that disables its buttons. A confirm button acts ONCE per panel: the press marks the panel
  busy through the store, and a second press, a double click or a repeating Enter finds it busy
  and does nothing.

| Kind | Heading | Body | Buttons |
| --- | --- | --- | --- |
| `details` | the session name | The facts, three columns. Then the help line | close icon only |
| `rename` | `<label>`: `Rename '<name>'` | an `<input class="input" maxlength="120">` filled with the name. Enter saves unless `e.nativeEvent.isComposing` or `e.repeat`; the trimmed name must be non-empty and different | `Cancel`, primary `Save name` |
| `output` | `Saved output: <name>` | `SavedOutputBody` over the store trio (§4.8) | close icon only |
| `end` | `endSessionConfirm(session).title` | `.body` | `Cancel`, destructive `.confirmLabel` |
| `remove` | `removeSessionConfirm(session).title` | `.body` | `Cancel`, destructive `.confirmLabel` |
| `restore-open` | `Open '<group label>' and restore?` | `This project’s tab is closed.` then one sentence: `The conversation continues when you press Enter in its terminal.` when `pastSessionPromise(session) === 'continues'`, otherwise `A fresh shell opens in the same folder.` | `Cancel`, primary `Open project and restore` |
| `restore-bare` | `bareRestoreConfirm(session).title` | `.body` | `Cancel`, primary `.confirmLabel`. Not destructive, as shipped |
| `restart-bare` | `bareRestartConfirm(session).title` | `.body` | `Cancel`, primary `.confirmLabel` |
| `failed` | by verb: `The session couldn’t be restored`, `The session couldn’t be ended`, `The session couldn’t be removed`, `The session couldn’t be restarted` | the failing layer's own sentence VERBATIM (main's, or `reach-copy.ts`'s). A failed restore adds `The saved session is still here.` | `Close`, primary `Retry` |

**When the row changed under the panel.** A Confirm, a Retry or a menu pick whose gate is no
longer true calls nothing, closes the panel, and raises ONE info toast, `SESSION_CHANGED`:
`This session changed. Nothing was done.` The row already reads its new state in front of the
person.

The End and Remove words are the SHIPPED ones, byte for byte (`sessions-slice.ts:1096-1104` and
`:1162-1166`), extracted and not rewritten (§4.3). The study's `ready to restore` and `saves its
output` are promises the renderer cannot make for a row on another machine (ruling R5).

**The Details facts.**

- `Created`: `exactTime`, or `—` when `createdAt` is not above 0.
- `Messages`: `detailsMessages(activity, agent, remote)`. With both counts:
  `<total><+> · <u> you / <a> agent`. With `agentMessages` null (gemini, §3.4 row 8):
  `<u>+ · <u> you · replies not recorded`. **`null` is never printed and never read as 0.** With
  no count, the cell's own small word.
- `Last message`: `detailsLastMessage(activity, agent)`. With a time: `<exactTime> · <small>`,
  where `<small>` is the cell's small word, and for the clocks `ask` and `session` the cell's
  explaining sentence follows it (§3.4). With no time, the cell's small word. A shell reads
  `Not applicable` here as it does in the grid; the study says `Not recorded` in one and
  `Not applicable` in the other, which is a study bug.
- `Project`: `displayPath(path, machineId)`, plus ` · <machine label>` for another machine.
- `Recovery`: for a local row `Continues the conversation` or `Starts fresh` from
  `pastSessionPromise`; for a remote row with `!machine.canRestore`, `machine.restoreReason`;
  otherwise the fact is omitted.
- The help line, verbatim: `“Created” is when the session first opened. Message counts cover the
  current conversation and exclude tool events and terminal output. A + indicates only part of the
  history is available.`
- Opening Details on a Past row asks the activity for that one id (§3.5).

Not built: the study's `Restart with a fresh session?` confirm (shipped Restart acts at once,
ruling R7), its `Directory path` clipboard fallback (the shipped `copyMenuItem` already answers a
failed copy), and its `Illustrative…` notes.

### 2.10 Selection and batch End

**THE INVARIANT: `checked ⊆ visibleIds(current filters)`.** An id the filters hide is unchecked
on the commit that hides it (`useSheetRefresh` calls `pruneSessionSheetChecked(visibleIds)`), and
the batch NEVER trusts that the prune has run: it intersects with `visibleIds` again when it names
and again at the press. A row a person cannot see is never ended by a batch.

- **Row checkbox** `<input type="checkbox" data-manage-check="<id>" aria-label="Select <name> in
  <group label>">`. CONTROLLED from the store by id. A checked row gets `.checked`. A click
  elsewhere on the row does not toggle it.
- **Header checkbox** `#sm-select-all`, `aria-label="Select all <n> visible sessions"`. `checked`
  when every visible row is checked, `indeterminate` when some are. **A click with NOTHING checked
  checks every visible row, BY ID. A click with anything checked, some or all, CLEARS.** An
  indeterminate click that selected everything would widen a batch a person had narrowed by hand.
  When a state replaces the grid there is no header checkbox.
- Any write to `checked`, by ANY route (a checkbox, select-all, the prune, a filter, a tab
  change), closes an open expansion that is not busy and closes a batch panel in its `confirm`
  phase. The slice enforces it, not the components. A checkbox change keeps focus on that
  checkbox.
- **Selection is cleared by** a search edit, any of the three filters, a tab change, `Clear
  filters` and `Clear selection`. **It survives** a sort, a refresh and a push that hides nothing.
  An id that is no longer a Managed row, or that the filters now hide, is pruned.
- **The toolbar swap.** On Managed, while anything is checked, the same 47px element draws
  `data-mode="selection"`: an icon button `aria-label="Clear selection"`; `<strong><n>
  selected</strong>`; `<e> running`, plus ` · <r> ended or unreachable` when `r > 0`; a spacer; the
  button `<button data-sm="end-selected">End selected sessions…</button>` with a `debug-stop`
  codicon, disabled when `e` is 0, while a batch exists, or while an inline verb is busy. `Clear
  selection` sends focus down the chain `#sm-search`, then the selected tab.

**Who is eligible.** `batchEligibility(session, gates, machineKnown)` in `batch-end.ts` answers
`'yes'` or a skip reason. It is `gates.canEnd` NARROWED by one named case and never widened:

| Row | Answer |
| --- | --- |
| `gates.unknown` | `unreachable` |
| `gates.ended` | `ended` |
| `session.machine` exists and `machineStates` holds no row with that id | `unreachable`. Such a row draws its RECORDED status (`remote-sessions.ts:1245`), and main would end it by sending nothing and writing `exited` (`core.ts:2797-2841`). A batch never reports `Ended` for a process it did not touch (R11) |
| `gates.canEnd` | `yes` |
| anything else | `gone` |

`machineKnown` reads `useApp.getState().machineStates`. Before that list has loaded every remote
target is skipped, which is the safe direction.

**The one confirmation** is `<section class="sm-batch" data-phase="confirm"
aria-labelledby="sm-batch-title">` at the top of the grid scroller, margin `var(--space-5)
var(--space-7)`, styled as an inline panel.

- **The toolbar's running count is asked NOW and the confirmation's is frozen.** While a
  confirmation stands they differ in one direction only: a row that became eligible after it
  opened raises the toolbar's count and is never named. The confirmation's heading and skipped line
  say what a press will do; the skipped line keeps the reason each row had AT OPEN (the batch
  verifier's P3).
- **The ids NAMED when the confirmation opens are an upper bound.** On `End selected
  sessions…`, `named` is `checked ∩ visibleIds ∩ eligible`, in drawn order, by session ID, each
  re-read from `useApp.getState().sessions` at that instant. `skippedAtOpen` counts the rest of
  the selection by reason. **The list may shrink while the panel is open and it never grows**: on
  every render a named id that is no longer eligible leaves the list and joins the skipped line
  under its present reason; an id that BECAME eligible after the panel opened (a machine that
  reconnected, a session restored from another window) is never named, is never a target, and
  stays in the skipped count it had at open.
- Heading `End <n> running session?` or `sessions?`, where `n` is the named ids still eligible,
  with an icon button `aria-label="Cancel ending selected sessions"`.
- Body, `batchBody(anyRemote)`, composed from the truths `endSessionConfirm` already tells and
  from nothing the renderer cannot know. Always: `This stops what is running in them, including
  sessions in closed projects. What each printed is saved first, and they stay in Managed as
  Ended.` When any named target is on another machine, a second sentence, the shipped remote
  body's last clause made plural-safe: `For a session on another machine, bringing it back always
  returns the folder, and it returns the conversation only when Tortie recorded one for this
  agent.` The study's `Saved output and conversations are kept` is NOT used: it is false for a row
  with no recorded conversation and unknowable for a remote one (R5).
- Targets: `<ul class="sm-batch-targets">`, `max-height: calc(4 * 33px + var(--space-5))` — four whole
  rows and a visible hint of the fifth, where the 144px it replaces cut the fifth 33px row mid-row and
  read as the end of the list — scrolling, ruled. Each item is
  `<li data-batch-target="<id>"><strong><name></strong><span><group label> · <State></span>`,
  the name and state read from the store by id at render. A group on another machine reads
  `<group label> · <machine label> · <State>`.
- Skipped records are a count WITH the reason, and are not listed: `<k> selected session stays
  unchanged:` or `sessions stay unchanged:` then the non-zero parts joined by `, `:
  `<a> already ended`, `<b> unreachable`, `<c> no longer here`.
- Buttons `Cancel`, then destructive `End <n> session` or `sessions`, disabled at 0.
- On open it scrolls into view and focus goes to the cancel icon button, never to the
  destructive one.
- **At the press**, `targets` is `named ∩ checked ∩ visibleIds ∩ eligible NOW` (§4.9 step 1).

**Cancel**, by either control or by Escape, closes the confirmation and KEEPS the selection.
Focus goes down the chain `[data-sm="end-selected"]`, `#sm-select-all`, the selected tab.

**Running**, `data-phase="running"`: heading `Ending <n> sessions…`, each target gains a trailing
outcome word and `data-outcome`, one button `Stop`, mounted with its own React key so it never
inherits the focus or the held key of the confirm button it replaced. Row buttons, the ellipsis
and the checkboxes are disabled while a batch runs, both tabs are `aria-disabled`, and
`setSessionSheetTab` refuses.

**Done**, `data-phase="done"`, only when something did not end: heading `<e> of <n> sessions
ended`, every target listed with its outcome, one button `Done`, its own React key, focused. When
EVERY target ended the panel closes by itself, the selection clears, and one success toast reads
`<n> sessions ended.` or `1 session ended.` The study's `1 sessions ended` is a bug. Focus goes
down the chain `#sm-select-all`, `[data-sm="clear-filters"]`, the selected tab: under the
`Running` filter the grid has just been replaced by `No matching sessions` and `#sm-select-all`
is no longer drawn.

- Outcome words: `Ending…`, `Ended`, `Already ended`, `Unreachable`, `No longer here`, `Not ended.
  <the failing layer's sentence>`, `Not run`.
- After `Done`: ended and skipped targets are unchecked, failed and not-run targets stay checked
  while they are still visible, so a second press names exactly those.
- The Managed count does not move: ending keeps every row under Managed as ended. Under the
  `Running` filter the view then reads `No matching sessions` and the filter stays on.

### 2.11 The Past tab

Not a table: no headings, no checkboxes, no sort. ONE list of flex rows in main's order; the group
header of §2.6 is drawn only when the project filter names one project (§9, the operator's ruling of
2026-09-19; §12).

| Slot | Content |
| --- | --- |
| Identity | `<button class="sm-name" data-manage-name="<id>">`: `AgentIcon`, `<strong>` name, `MachineBadge` when a machine is known, and `<small>` `pastRowSmall(agentShortLabel(agent), <project>, <machine>, <promise>, <own folder>)`: the agent; in the single list the row's project (its group's label) and its machine when that is not this Mac (its group's machine label), in the project filter's own `label · machine` form, both null under a project's heading, which says them; the promise (`Continues the conversation` or `Starts fresh`, `pastSessionPromise`, `src/renderer/state/resume.ts:277`); and `displayPath(cwd)` when `isOutsideProject(session)`, a worktree. Today's panel drew the agent and the folder on every row (§11, W5; §12). A machine-removed row draws `tombstoneLine(label, forgottenAt, lastSeenAt, lastStatus)` as the promise (`src/renderer/settings/machines-copy.ts:463`). **Phase 298 draws that line INLINE BESIDE the name rather than stacked under it, and makes it the field that gives way.** It stays ONE joined string in one `.sm-cell-small` element inside `.sm-name-line`, at `flex: 0 100 auto; min-width: 0` with `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` — an order of magnitude above the name's shrink factor, which is inline rule 3, and truncating from the RIGHT, which is rule 6, because `search.css:357-362` refuses `direction: rtl` for a path: bidi reordering moves the `/` and `.` runs and a path can land mid-word with no ellipsis at all. The `white-space` is load-bearing: `.sm-past-row` sets none of its own, so without it a long folder wraps and the 40px row becomes 56. Rule 5's trailing mark is `.sm-past-state` at `flex: 0 0 auto` with `margin-left: auto` for the slack, which is rule 4 without a field taking it. `smallOf` keeps its name, still calls `displayPath(session.cwd)`, still asks `!underHead`, and `title={row.session.cwd}` stays on the row (`conformance:manager` T16). **SPLITTING THE LINE INTO PER-PART ELEMENTS IS DEFERRED, and the integrator's round says so rather than leaving a documented shape unbuilt.** It only earns its keep together with turning the promise into the ↺ mark `.srow-saved` already draws, with the sentence in the hover and the inline panel (`session-rail.css:207-218`: the resume sentence is "a paragraph under the scan line, not part of it"), and that takes `Starts fresh` off a resting row — a FOURTH change to what a person reads where this phase names three and the no-regression rule asks for the side-by-side. It also needs a four-part answer (agent, folder, promise, tombstone), which `PastList.tsx`'s `promiseOf` computes and collapses into `detail` before `copy.ts` ever sees it, so it is a prop reshape on a `NameButton` the Managed grid shares. Its own entry |
| State slot, content sized (`flex: 0 0 auto`) | `Removed <removedDate>`, with `exactTime(removedAt)` as its hover title, because the day alone cannot tell two removals on one day apart. Phase 298 deleted the 145px it was given: a trailing mark is sized by its own content and right-aligned, and 145px of slot for `Removed Sep 16` was the widest thing on the row after the promise |
| Actions | `Restore` with a `history` codicon and the class `past-restore`; `Restoring…` while busy; disabled when the machine was removed, when `machine.canRestore` is false, or while `!shellPathReady`. Then the ellipsis |
| Full-width note, machine-removed rows only | `tombstoneRestoreRefused(label)` (`machines-copy.ts:489`). Two DIFFERENT sentences, as shipped. The study prints one sentence twice |

The row is `<div class="sm-past-row" data-manage-row="<id>" data-row-group="<groupKey>"
data-machine-gone="yes|no">`, `min-height: var(--sm-row-h)` with `padding: var(--space-3)
var(--space-8)` — box **40** and pitch **40**, because `* { box-sizing: border-box }` holds this
row's own hairline inside its declared height where the grid's sits between two rows (Phase 298
mechanism 1). Only the vertical padding moved: the horizontal stays `--space-8` so the row is still
aligned with its own group header. Its identity block is `flex: 0 1 auto; min-width:
var(--sm-past-identity-min)`, which reads the Managed Session cell's own floor because it holds what
that cell holds. A machine-removed row keeps its note on its own line and is the ONE row in the
sheet above 40px, because a tombstone is a sentence. It carries its group itself because the single
list draws no heading. The Past menu is `Session details`, `'sep'`, then what `sessionMenuItems`
answers for a `discarded` row (§4.2). Footer left `<n> session(s)`, plus ` across <k> projects`
when the project filter is All. Footer right `Kept for 90 days.`, whose hover title carries
today's other two footer sentences, `Restore one to pick it back up. Capture files stay in each
project’s history folder.` (§11, W8).

**Order.** **One list in main's order**, newest removal first, exactly as `sessions:listRemoved`
answers it (`listRemovedSessions`, `src/main/sessions/core.ts`) and as today's Past Sessions drew
it: the session removed last is the top row and the one removed before it is the second, whichever
projects they were in. The renderer COPIES that order and never re-sorts it
(`ManageProjection.pastRows`, each row written back at its session's index). Under a search the
list keeps the same order. **Only when the project filter names one project** is the tab drawn as
that project's group, under its heading, with its rows in the same order. The project filter lists
the groups in the Managed order (open tabs first, then closed by label). This replaces the fix
round's group ordering (§11, W2), which the reverify measured as worse than today (§12).

### 2.12 The states that replace the grid

Each replaces the grid, headings included. The title bar, toolbar and footer stay. The block is
centred, `max-width: 540px`, padding `70px var(--space-8)`, a **24px** codicon, the heading
(`.sm-state-heading`) at `--text-lg` / `--lh-lg` and the body (`.sm-state-body`) at `--text-base` /
`--lh-base` (Phase 298 mechanisms 5, 9 and 17). 24 is the app's ceiling and one of the four sizes
`<Codicon>`'s own doc sanctions off the 12/14/16 scale; the 28 it replaces was larger than anything
the app draws.

| State | Codicon | Heading | Body | Button |
| --- | --- | --- | --- | --- |
| Empty, Managed | `search` | `No sessions to manage` | `Start a session from the Session menu. Projects don’t need to stay open for sessions to appear here.` | none |
| Empty, Past | `history` | `No past sessions yet` | `Sessions you remove will appear here for 90 days.` | none |
| No match | `search`, or `history` on Past | `No matching sessions` | `Try another project or clear your filters.` | `<button data-sm="clear-filters">Clear filters</button>`: resets project, search, tab filter, state filter and the selection |
| Loading, `role="status"`, Past tab while `pastLoading` and no row is held | | | `Loading sessions…` over five skeleton rows at `var(--sm-row-h)` in `--bg-raised`, with `.sm-loading`'s gap at 0 so the loading pitch is the row's own | none |
| Read failure, when `refreshSessionSheet` could not read | `warning` | `Sessions couldn’t be read` | `Your sessions haven’t changed. Try reading the list again.` | primary `Try again` |

These five are recorded in `DESIGN.md` §6 as items 16 to 20 (builder F), because that section's
heading says its copy is final and a state that is not in it is not a state.

### 2.13 Keyboard and focus

- **Open.** Focus goes to `#sm-search`.
- **Tab** wraps inside the sheet through `trapTabKey(e, sheetEl)` on the sheet's `onKeyDown`.
  `modalKeyDown` is NOT used: it `preventDefault`s Enter on every input
  (`focus-trap.ts:76-112`) and the sheet has no single submit.
- **Focus never rests outside the sheet while the sheet is the top layer.** `trapTabKey` is bound
  to the sheet, so it never sees a Tab pressed from `body`, which is where focus falls when the
  node that held it unmounts. From there Tab, Enter, Enter reaches a row's × BEHIND the scrim and
  then a `ConfirmDialog` whose focus is on its destructive button. Three things close it:
  1. **Every focus return names a CHAIN that ends at the selected tab**, which is always drawn and
     never disabled. `focusChain(selectors)` in `SessionManagerSheet.tsx` takes the first that is
     connected, enabled and takes focus. The chains are written beside each return in §2.9 and
     §2.10.
  2. **A `useLayoutEffect` with no dependency list on the sheet root** runs after every commit:
     when `sheetIsTopLayer()` and `document.activeElement` is `body`, `null` or outside
     `.session-sheet`, focus goes to the selected tab.
  3. **The window-capture ladder traps Tab too** (§5.4): with the sheet the top layer and the
     active element outside it, Tab is prevented and `reclaimSessionSheetFocus()` moves focus to
     the selected tab.
  4. **A `focusin` listener on the document, capture phase, while the sheet is mounted** (the fix
     round, from the press verifier's P1 and P3): a terminal behind the scrim takes the keyboard
     when its session attaches, hundreds of milliseconds after the commit that selected it, so a
     commit-time reclaim alone left typed characters reaching that session. When focus lands
     outside the sheet while it is the top layer it comes straight back, through
     `reclaimSheetKeyboard` (`open.ts`), which prefers where the keyboard WAS in the sheet: that
     element when it is still drawn, enabled and not a visible button whose verb changed; then its
     row's name; then the selected tab. The commit-time reclaim of item 2 uses the same order. A
     toast's button still takes its click, which lands on what is under the pointer.
  "The top layer" is `sheetIsTopLayer()` in `open.ts`: the sheet is open and no other layer drawn
  OVER it is, and neither palette is. The Catch Me Up page and the New Session sheet are always
  UNDER an open sheet (§5.2) and do not count. ⌘P and ⇧⌘O open over any modal by the ladder's
  own design (`keyboard.ts:112-122`), and the rule yields to them.
- **No sheet handler acts on a keydown with `repeat === true`.** The sheet root's
  `onKeyDownCapture` prevents the default of a repeating Enter or Space whose target is a button,
  because Chromium fires `click` on every repeat of Enter.
- **The second click of a double click presses nothing** (the fix round, the batch verifier's P1,
  major). The first click of a double click on `End 2 sessions` ran the batch, the panel closed
  itself when everything ended, the grid slid up, and the second click restored an ended row whose
  Restore had slid under the pointer, four times in four. The sheet root's `onClickCapture` is
  `swallowRepeatClick` (`repeat-click.ts`): a click whose `detail` is above 1 on a button, an
  input or a label is prevented and stopped at the root before any control sees it. Every control
  acts on the first click, and a key press (`detail` 0) is never touched.
- **Tablist.** Left and Right switch tabs. Home goes to Managed, End goes to Past. Focus follows.
  Refused while a batch runs.
- **Escape, one layer at a time**, through ONE rung of the ladder (§5.4): a focused non-empty
  search field clears; a busy inline verb swallows the key and does nothing (its answer is about
  to land in that panel; the create sheet's precedent is `keyboard.ts:130-138`); then a running
  batch is asked to stop; then a batch panel closes, keeping the selection in `confirm`; then an
  open expansion closes and focus returns to the row's name; then the sheet closes. The native
  row menu swallows its own Escape before the renderer sees it.
- **F2** on a focused sheet row opens its rename expansion when the row's gates allow, and NEVER
  renames the session behind the sheet (§5.3).
- **Close** is the close button, a mouse-down on the scrim itself, or Escape with nothing else
  open. The keyboard goes back to the element that held it at the opening gesture when that
  element is still connected and takes it, and otherwise to `focusTerminal()`
  (`src/renderer/app/session-focus.ts:82`), which is the ONLY spelling of the terminal's textarea
  allowed (`p289-focus-terminal.test.ts:394-515`). The give-back waits one animation frame after
  the store write, because an element under a layer that is still drawn may refuse focus
  (Phase 289's measured lesson, `src/renderer/overview/open-overview.ts:266-290`).
- **A known hazard this phase inherits and does not rule on.** `focusTerminal()` falls back to the
  first LIVE terminal in document order (`session-focus.ts:68-75`). A person who ends their own
  session from the sheet and closes it may find the keyboard in ANOTHER agent's prompt. Phase 289
  measured this and left it as the operator's ruling; it is R16 here.

### 2.14 The DOM contract the probe and the verifiers read

`.modal-scrim.session-sheet-scrim` › `.modal.session-sheet[role="dialog"][aria-modal="true"]
[aria-label="Session manager"]`. `[data-sm="toolbar"][data-mode="filters|selection"]`.
`div.sm-lifecycle[role="radiogroup"][aria-label][data-sm="lifecycle"]` (Phase 303), Managed tab only
and filters mode only, between `#sm-search` and `#sm-filter-project`, holding three
`button[role="radio"][aria-checked][data-manage-lifecycle="all|active|ended"]`, the chosen one `.on`.
`[data-sm="end-selected"]`. `[data-sm="clear-filters"]`. `table.sm-grid`.
`tr.sm-group[data-manage-group="<groupKey>"][data-tab-open="yes|no"]`.
`tr.sm-row[data-manage-row="<id>"][data-status="<SessionStatus>"]`.
`.sm-past-row[data-manage-row="<id>"][data-row-group="<groupKey>"]`, and
`section.sm-past-group` › `.sm-group[data-manage-group="<groupKey>"]` only when the project filter
names one project (§2.11).
`[data-manage-primary="<id>"][data-verb="end|restore"]`. `[data-manage-check="<id>"]`.
`section.sm-batch[data-phase]` › `li[data-batch-target="<id>"][data-outcome]`. `[data-sm="foot"]`.
`.sm-toasts[data-sm="toast-outlet"]`, between `.sm-scroll` and the footer, ALWAYS drawn and never
conditional (Phase 298, rough edge 1): `src/renderer/app/Toasts.tsx` finds that node and portals its
stack into it while the sheet is open, so a stamp deleted as unused would silently un-dock the toasts.
Rows NEVER stamp `data-session-id`: `focusedSessionRowId()` and `menuPointFor()`
(`session-actions.tsx:554-562`) read it, and a second bearer behind a modal is how the remote
review menu would land on the wrong row. F2 is closed separately (§5.3), because with no bearer in
the sheet `focusedSessionRowId()` answers null and the key falls through to `activeSession()`.

---

## §3 The data

### 3.1 The inputs already exist

- `useApp().sessions` is ALREADY the global managed list: `src/main/sessions/core.ts:2536`
  `listSessions()` walks every project and machine, and `src/renderer/state/subscriptions.ts:726`
  applies every `sessions:changed` push. A closed tab filters nothing out.
- `useApp().pastSessions` is `sessions:listRemoved`, `core.ts:2644`, newest removal first, with NO
  push event. The contract comment at `src/shared/ipc/sessions.ts:316-322` says a removal cannot
  happen while the panel is open. The sheet makes that false, so the sheet refetches (§3.6).
- `useApp().projects` holds ONLY the open tabs (`src/renderer/state/projects-slice.ts:63`). The
  renderer has no list of closed projects. A closed project's group is derived from its sessions.

### 3.2 The projection

`src/renderer/session-manager/projection.ts`. Pure. It lives outside `src/renderer/state/` because
`state/` may not import `app/` (`build/assert-import-boundaries.mjs:253-261`) and the projection
joins `statusVisual`, which lives in `app/`.

```ts
export interface ManageProjectionInput {
  sessions: readonly Session[];
  pastSessions: readonly Session[];
  projects: readonly Project[];            // open tabs, already in sortProjects order
  machineStates: readonly MachineStateView[];
  handbacks: Record<string, SessionHandback | undefined>;
  activity: Record<string, OverviewSessionActivity>;
  restoringIds: Record<string, boolean>;
  shellPathReady: boolean;
  canRestore: boolean;
  canDiscard: boolean;
}
export type ManagePrimary =
  | { verb: 'end'; enabled: true; title: null }
  | { verb: 'end'; enabled: false; title: string }
  | { verb: 'restore'; enabled: boolean; title: string | null; busy: boolean };
export interface ManageRow {
  id: string;
  tab: 'managed' | 'past';
  session: Session;
  status: SessionStatus;
  visual: StatusVisual;
  groupKey: string;
  target: WorkspaceTarget | null;          // null only for a machine-removed past row
  tabOpen: boolean;
  gates: SessionActionGates;
  primary: ManagePrimary;
  activity: OverviewSessionActivity | null; // null: not answered yet
  searchText: string;
}
export interface ManageGroup {
  key: string; label: string; path: string; machineId: string | null;
  machineLabel: string | null; tabOpen: boolean; rows: ManageRow[];
}
export interface ManageProjection {
  managed: ManageGroup[]; past: ManageGroup[];
  pastRows: ManageRow[];                   // the Past rows as ONE list, in main's order (§2.11, §12)
  managedTotal: number; pastTotal: number;
}
export function buildManageProjection(input: ManageProjectionInput): ManageProjection;
```

**The projection is what is DRAWN. It is never what is ACTED ON.** A handler takes `row.id` from
it and nothing else (§4.0).

**Grouping is by workspace target, machine identity included, and NEVER by basename.**

- The key is `targetKey(targetOfSession(session))` (`src/shared/workspace-target.ts:179`, `:214`),
  being the bare path for this Mac and `<machineId>:<path>` for another machine.
- A Past row whose machine a person removed carries `machineGone` and no machine id, by design
  (`src/main/manifest/codecs.ts:926-933`). Its key is `` `!gone:${machineGone.label}:${projectPath}` ``
  and its `target` is null. `!` cannot start a machine id (`^[a-z][a-z0-9-]{0,31}$`) or a path.
- **Open or closed** is `projects.some((p) => sameTarget(targetOfProject(p), target))`. A
  machine-removed group is always closed.
- **The label**, first that exists: the open project's `name`; `session.closedProject?.name`
  (`src/shared/types.ts:327-334`); `baseName(projectPath)` from `src/renderer/editor/paths.ts:11`.
- **The machine label**: `session.machine?.label`, else `machineLabelFor(machineStates, id)`
  (`src/renderer/state/machines-slice.ts:145`), else `machineGone.label`. Null for this Mac.
- **Group order**: groups with an open tab first, in the order of `projects`; then closed groups by
  label with `localeCompare`, ties by key with `<`. Labels are names. No path is ever compared
  folded or normalised.
- **Row order** inside a group is the incoming order.
- **The Past rows as one list**, `pastRows`, are the same row objects in the incoming order: each
  is written back at the index its session had in `pastSessions`, so the order is main's, copied,
  and nothing re-sorts it (§2.11, §12).

**The view**, `src/renderer/session-manager/view.ts`, pure:
`visibleGroups(groups, { search, project, tabFilter, stateFilter }, sort)` answers the filtered,
sorted groups, and `visibleIds(groups)` the ids select-all and the batch act on. `visibleIds`
never contains `''`. `visiblePastList(pastRows, past, filters)` answers the Past tab's single list,
each row with its group, in main's order, or null when the project filter names one project, where
the tab draws `visibleGroups`. `selectSheetView` carries it as `pastList`, and its `visibleIds` are
then that list's ids in its order (`pastListIds`).

### 3.3 The main-side defect the Past tab would inherit, fixed here (finding F1)

`toSession` never sets `Session.machine`. A removed session on another machine whose machine is
STILL registered carries neither `machine` nor `machineGone`, so `targetOfSession` answers this
Mac's target, the row groups under this Mac, and a restore would ask to open a local folder with
another machine's path, which is the Phase 90.3 defect again. **Fix, in
`core.ts:2644 listRemovedSessions`:** for a record with `machineId !== LOCAL_MACHINE` and no
`machineTombstone`, answer `atHomeOnItsMachine({ ...toSession(rec), machine:
remoteSessionMachine(rec.machineId, rec.id) })` (`remote-sessions.ts:1088`, `core.ts:401`). Do NOT
route it through `projectRemoteRecord`, which replaces `'discarded'` with `remoteRecordStatus`.
The restore gate the row then carries is the one main's own restore asks
(`remote-sessions.ts:2355-2389`), so the button and the verb cannot disagree.

### 3.4 The activity aggregate

**Shared types**, APPENDED to `src/shared/overview.ts`:

```ts
export type OverviewActivityCoverage = 'complete' | 'partial' | 'unavailable' | 'not-applicable';
export type OverviewActivityReason =
  | 'shell' | 'remote' | 'unknown-session' | 'no-id' | 'not-yet' | 'no-store'
  | 'unreadable' | 'wrong-conversation' | 'ask-only' | 'record-gone';
/** Which clock `lastMessageAt` was read from. */
export type OverviewActivityClock = 'message' | 'ask' | 'session';
export interface OverviewSessionActivity {
  sessionId: string;
  coverage: OverviewActivityCoverage;
  reason: OverviewActivityReason | null;        // null exactly when coverage is 'complete'
  userMessages: number | null;                   // SUM(turn.queued)
  agentMessages: number | null;                  // COUNT(turn.answer_text), at most one per turn
  lastMessageAt: number | null;                  // epoch ms
  lastMessageBy: 'you' | 'agent' | null;
  lastMessageClock: OverviewActivityClock | null; // null exactly when lastMessageAt is null
  readAt: number | null;                         // session.last_read_at
}
export interface OverviewActivityInput { sessionIds: string[] }
export interface OverviewActivity { readAt: number; sessions: OverviewSessionActivity[] }
export const OVERVIEW_ACTIVITY_MAX_IDS = 200;
```

**THE TWO INVARIANTS.**

1. When coverage is `unavailable` or `not-applicable`, every one of the five value fields is null.
   Zero is drawn only after a record was read.
2. When coverage is `complete` or `partial`, `userMessages` is a NUMBER, never null. So the
   renderer never writes `?? 0` on it, and `p293-copy.test.ts` pins that `copy.ts` holds no
   `?? 0` at all. `agentMessages` may be null under `partial` (row 8), and a null there is drawn
   as words, never as a digit.

**The channel**, a member INSERTED inside `OverviewInvokeChannelMap`
(`src/shared/ipc/overview.ts:36-71`):

```ts
'overview:activity': { req: [input: OverviewActivityInput]; res: OverviewActivity }
```

Bridge: `window.gmux.overview.activity(input)`, a method INSERTED inside `GmuxOverviewExtras`
(`:78-89`) and in `src/preload/overview.ts`. Registered once, in `registerOverviewIpc`
(`src/main/overview/ipc.ts:90-117`). Its doc comment says what its siblings say: it reads agent
logs read only, writes only Tortie's own overview store, spawns nothing, writes no manifest row,
touches no tmux and changes no session's state. **No comment or string under
`src/main/overview/` may spell `setStatus`, `applyStatus` or `sessions:status`**:
`conformance:overview` rule 7 scans raw text, comments included
(`build/conformance-overview.mjs:497-520`). It answers one row per asked id, in the asked order.
More than `OVERVIEW_ACTIVITY_MAX_IDS` ids, or a non-array, is `INVALID_INPUT`; a non-string member
is dropped; duplicates collapse.

**The main-side modules.** Two files, one responsibility each.

`src/main/overview/activity-map.ts`, PURE, no disk and no store:

```ts
export interface ActivityRowFacts {
  id: string; agent: string; machineId: string;   // 'local' for this Mac
  agentSessionId: string | null; known: boolean;  // false: the id is not in this Mac's manifest
}
export function classifyActivityRow(facts: ActivityRowFacts): OverviewSessionActivity | null;
export function toActivity(
  facts: ActivityRowFacts, stored: StoredActivity | undefined
): OverviewSessionActivity;
```

`src/main/overview/activity.ts`, the orchestration, `sessionActivity(deps, input)`:

1. Read manifest rows by id, `discarded` INCLUDED, because Details on a Past row asks. **The
   filters in `buildOverview` (`service.ts:140-147`) and `refreshSessionForFold`
   (`service.ts:363`) do NOT move**, and the test title at `service.test.ts:293` stays true of
   `projectOverview`. What changes is stated: the store gains rows for removed sessions, which the
   manifest prunes at 90 days and the store never prunes.
2. `classifyActivityRow` decides rows 1 to 4 of the table without touching disk.
3. Refresh each remaining row through the existing read path, ONE row at a time, yielding with
   `setImmediate` between rows. The seam is a new export from `service.ts`:
   `refreshRowForActivity(deps, store, row, recordedProviders, now): void`, a wrapper over the
   private `readOneRow` (`service.ts:196`) with `projectPath` being `row.projectPath`, `turnLimit`
   1 and no git. **The wrapper catches, per row**: `resolveSessionLog` runs outside any `try` in
   `readOneRow` (`service.ts:216-225`), and one row's throw must not reject the call. A caught row
   writes nothing and maps by what the store already holds. `refreshSessionForFold` lists up to
   200 turns per row and is NOT used. **The refresh is not optional**: the store is written only
   when Catch Me Up opens that project or the fold runs, and the fold refuses closed projects, so
   a pure SELECT would answer stale for exactly the rows this sheet exists for.
4. `OverviewStore.listActivity(ids)`, below. Calls are serialised through one module-level promise
   chain, so two callers never read at once.
5. Map through `toActivity(facts, stored)`.

**The statement** (`src/main/overview/store/store.ts`, no schema change, `OVERVIEW_SCHEMA_VERSION`
stays 2, `store-schema.test.ts` does not move). `listActivity(ids: readonly string[]):
StoredActivity[]` runs ONE prepared statement once per asked id, inside one read transaction. It
NEVER scans the store: the first pass had no `WHERE`, walked every turn of every session the store
has ever held on every call, and the store never prunes. That contradicted the backlog's "never
whole histories loaded per row".

```sql
SELECT s.session_id, s.provider, s.read_state, s.last_read_at, s.last_touched_at,
  a.turns, a.user_messages, a.agent_replies, l.ask_at AS last_ask_at, l.answer_at AS last_answer_at,
  CASE WHEN l.session_id IS NULL THEN NULL ELSE (l.answer_text IS NOT NULL) END AS last_has_answer
FROM session s
LEFT JOIN (SELECT session_id, COUNT(*) AS turns, SUM(queued) AS user_messages,
    COUNT(answer_text) AS agent_replies, MAX(turn_index) AS last_index
  FROM turn WHERE session_id = ?1 GROUP BY session_id) a ON a.session_id = s.session_id
LEFT JOIN turn l ON l.session_id = s.session_id AND l.turn_index = a.last_index
WHERE s.session_id = ?1
```

- The per-id form is the shape `countTurns` already has (`store.ts:452-454`), it needs no JSON1
  function the tree has never used, and the primary key `(session_id, turn_index)` serves both
  reads of `turn`. **A pins the plan**: `EXPLAIN QUERY PLAN` over it names the primary key on
  `turn` and holds no `SCAN turn` line.
- What the aggregate still costs is stated, not hidden: `queued` sits after `ask_text` and
  `answer_text` in the row (`store/schema.ts:62-71`), so `SUM(queued)` reads each of THAT
  session's turn rows, overflow pages included. It is bounded by one session's own turns, it stays
  inside SQLite, and no text crosses into JS. The verifier times it (§8.3).
- `StoredActivity` is those eleven columns: `{ sessionId: string; provider: string; readState:
  StoredReadState; lastReadAt: number | null; lastTouchedAt: string | null; turns: number | null;
  userMessages: number | null; agentReplies: number | null; lastAskAt: string | null;
  lastAnswerAt: string | null; lastHasAnswer: boolean | null }`, exported from `store/index.ts`.
- The last turn is read BY INDEX, never by `MAX()` over time strings: clock shapes differ per
  provider and research 63 rules position is the safe order. Times are parsed with `parseIsoMs`
  (`service.ts:578`), which becomes an export; do not write a second parser.

**`toActivity`, in this order:**

| # | When | Coverage / reason | Values |
| --- | --- | --- | --- |
| 1 | `known` is false: the id is not in this Mac's manifest (a feed-only remote row, `core.ts:2603-2620`) | `unavailable` / `unknown-session` | all null |
| 2 | `machineId !== LOCAL_MACHINE_ROW` | `unavailable` / `remote` | all null |
| 3 | `agent === 'shell'` | `not-applicable` / `shell` | all null |
| 4 | no `agentSessionId` | `unavailable` / `no-id` | all null |
| 0 | `stored` is `undefined`: the refresh threw, or wrote nothing | `unavailable` / `unreadable` | all null. Asked AFTER rows 1 to 4. Without it a row stays `…` with `aria-busy` forever |
| 5 | `read_state` is `no-store` (droid, and any agent the resolver answers `unsupported` for, which `readOneRow` stores the same way, `service.ts:256-259`) | `unavailable` / `no-store` | all null |
| 6 | `read_state` is `no-file`, `unreadable` or `wrong-conversation` and NO turn is stored | `unavailable` / `not-yet`, `unreadable`, `wrong-conversation` | all null. `not-yet` is a dash and never a zero: it is also what a resolver miss looks like |
| 7 | the same three states WITH stored turns | `partial` / `record-gone` | the stored counts |
| 8 | `read_state` is `ok`, provider `gemini` | `partial` / `ask-only` | `userMessages` is the count, **NULL from the LEFT JOIN mapped to 0 because a record WAS read**; `agentMessages` is the count when above zero, else null |
| 9 | `read_state` is `ok`, anything else | `complete` / null | both counts, NULL from the LEFT JOIN mapped to 0 |
| 10 | anything else (a stored `shell` or `remote` state the classifier did not catch) | `unavailable` / `unreadable` | all null |

Rows 8 and 9 are the ONLY places a zero is made, and only under `read_state = 'ok'`.

**The last message, rows 7 to 9 with at least one turn.** `lastMessageBy` is `agent` when
`last_has_answer`, else `you`. Then the time, first that parses:

1. `parseIsoMs(last_has_answer ? last_answer_at : last_ask_at)`: clock `message`.
2. When `last_has_answer` and the answer has no clock, `parseIsoMs(last_ask_at)`: clock **`ask`**.
   This is cursor today (`keep-map.json:2019`, `"time": null` on the answer slot), and the rule
   names no provider, so the next agent with the same shape is already right. The first pass drew
   this as `Agent reply · 3h ago` where 3h was the PROMPT's time.
3. `parseIsoMs(last_touched_at)`: clock **`session`**. This is deepseek today (both slots
   `"time": null`), whose only clock is `metadata.updated_at` (`reader/containers.ts:556-567`).
4. Otherwise `lastMessageAt` and the clock are null and `lastMessageBy` stands.

With no turns, all three are null. cursor's prompt clock is a text tag, minute resolution, of the
shape `Thursday, Aug 20, 2026, 9:14 AM (UTC-4)` (`reader/expr.ts:234-237`); `Date.parse` reads it
in THIS Mac's zone and ignores the parenthesis. It is the zone cursor wrote it in on this Mac, and
A's test pins that the fixture yields a non-null time and clock `ask` or `message`, never the
millisecond.

**The per-provider truth table** (fixtures in `docs/research/assets/63-fixtures`; adversary 2 ran
the PRODUCT reader over them and the numbers reproduce, and they agree with
`build/conformance-overview.mjs:145-195` EXPECT):

| Provider | Turns | User | Agent | Coverage | Clock | Note |
| --- | ---: | ---: | ---: | --- | --- | --- |
| claude | 3 | 3 | 3 | complete | message | sidechains, meta, compaction and task notifications are dropped by the keep map. The count restarts when the record file changes (§1) |
| codex | 3 | 4 | 3 | complete | message | one turn has `queued` 2, so user is `SUM(queued)` and never `COUNT(*)`. Goal-loop turns under-report (§1) |
| grok | 3 | 3 | 3 | complete | message | |
| antigravity | 3 | 3 | 2 | complete | message | the last turn has no answer, so the last author is `you` |
| qwen | 4 | 4 | 4 | complete | message | tool results wearing the user role are dropped |
| pi, omp, muse | 2 | 2 | 2 | complete | message | |
| gemini | 3 | 3 | 3 in the fixture | partial / `ask-only` | message | real files hold answers in 1 of 216, so a zero there is drawn as words |
| deepseek | 3 | 3 | 1 | complete | **session** | `lastTouchedAt` `2026-08-10T19:57:47.358535Z`, which `Date.parse` reads. `metadata.message_count` includes tool results and is NEVER used |
| cursor | 3 | 3 | 2 | complete | **ask** on a turn that holds an answer | `conformance-overview.mjs:193`. A's test reads the fixture through the product reader and its report says which turn is last |
| droid | | | | unavailable / `no-store` | | |
| shell | | | | not-applicable / `shell` | | NULL, never 0 |
| id known, nothing on disk | | | | unavailable / `not-yet` | | NULL, never 0 |
| the refresh threw | | | | unavailable / `unreadable` | | row 0 |
| `ok` with zero turns | 0 | 0 | 0 | complete | | the zero of §1's stated limit (R14) |

`cursoride` and `copilotide` are in the keep map and are not launchable, so no managed row wears
them.

**The dead remote guard, fixed in the same file (finding F3).** `readOneRow` and
`refreshSessionForFold` test `row.machine !== undefined` (`service.ts:207`, `:364`), but a manifest
record carries `machineId` and never `machine` (`ManifestSessionRecord extends Session` at
`codecs.ts:44`, and the decoder sets `machineId` only, `:829-834`), so the guard is dead for every
real row and a session on another machine is resolved against THIS Mac's home. Both guards become
`row.machineId !== undefined && row.machineId !== LOCAL_MACHINE_ROW`.
**The test instruction, corrected:** `service.test.ts:298` plants
`row({ id: 'C', machine: { machineId: 'm1' } })`. After the change that row IS read and lines
308-309 go red, so row C is REPLACED with `row({ id: 'C', machineId: 'm1' })`, not joined by a
second row. Red before, green after. **This changes a shipped surface**: Catch Me Up on a project
on another machine now draws the `remote` line where it drew `no-file` (or, at worst, a stranger's
file with the same id). That goes in the commit body as a second fixed thing; F's one CHANGELOG
line does not cover it, so F writes a second line under `### Fixed`.

**The renderer's cell mapping**, in `src/renderer/session-manager/copy.ts`. Both functions answer
ONE type, which E's Details reads too:

```ts
export interface ActivityCell { main: string; small: string | null; title: string | null; busy: boolean }
export function messagesCell(activity: OverviewSessionActivity | null, agent: string, remote: boolean): ActivityCell;
export function lastMessageCell(activity: OverviewSessionActivity | null, agent: string, now: number): ActivityCell;
```

**THE TABLE IS ASKED IN THIS ORDER, and the first two rows are keyed on the AGENT rather than on the
activity.** That is not a bug in the code and it was a bug in this table: see the two corrections
under it.

| Activity | Messages main / small / title |
| --- | --- |
| `agent === 'shell'`, on ANY machine, whatever the activity says | `—` / `Shell` / none. Decided FIRST, before `remote` and before the answer, so a shell never draws the pending mark and a shell on another machine reads `Shell` and not `Unavailable` |
| `remote`, and the agent is not a shell | `—` / `Unavailable` / none. Decided without the answer, so a remote row never draws the pending mark either |
| null (not answered) | `…` / none / none, `busy: true` |
| complete | `<total>` with `toLocaleString()` / `<u> you · <a> agent` / `<u> user messages + <a> agent replies. Tool events excluded.` |
| partial, `agentMessages` a number | `<total>+` / `Partial history` / `Only the available history is counted.` |
| partial, `agentMessages` null AND `userMessages` 0 | `—` / `No messages yet` / none. **The clause this table lacked** (Phase 298, rough edge 2): `0+` promises more where the cell beside it says there is none, and `lastMessageOf` already computes `No messages yet` from the same two halves. `drawnMessageTotal` answers **null** here, so the Messages column sorts by what a person sees in the cell, which is that function's own stated promise, and a dash sorts with the other dashes |
| partial, `agentMessages` null (`userMessages` above 0) | `<u>+` / `Replies not recorded` / `This agent’s record keeps your messages and not its replies.` |
| not-applicable | `—` / `Shell` / none |
| unavailable, reason `remote` or `unknown-session` | `—` / `Unavailable` / none |
| unavailable, any other reason | `—` / `Not recorded` / none |

`<total>` is `userMessages + agentMessages` and is computed ONLY where both are numbers.

| Last message | main / small / title |
| --- | --- |
| `agent === 'shell'`, on ANY machine, whatever the activity says | `—` / `Not applicable` / none. Decided FIRST, as in the table above, so a shell on another machine reads `Not applicable` and not `Not recorded` |
| clock `message` | `<age> ago` / `Your prompt` or `Agent reply` / `<exactTime>` |
| clock `ask` | `<age> ago` / `Agent reply` / `<exactTime>. Time of your last prompt. This agent records no reply time.` |
| clock `session` | `<age> ago` / `Session updated` / `<exactTime>. This agent records no time per message.` |
| counts present, total 0 | `—` / `No messages yet` / none |
| counts present, total above 0, no time | `—` / `Not recorded` / none |
| not-applicable | `—` / `Not applicable` / none |
| unavailable | `—` / `Not recorded` / none |

A remote row gets the same dash a local row with no record gets and no sentence about being
remote. **In the renderer a shell is decided before remote** (`copy.ts`), so a shell on another
machine reads `— / Shell` and `— / Not applicable` rather than `— / Unavailable`: a shell has no
messages on any machine, which is the truer word (the matrix verifier's P4). Main's classifier
answers `remote` for it, and the renderer never asks main about a remote row.

**THE PRODUCT WAS RIGHT AND THIS TABLE WAS WRONG** (Phase 298, rough edge 6). As first written both
tables above were keyed on the ACTIVITY alone, and `remoteActivity()` answers `coverage:
'unavailable', reason: 'remote'` for a shell on another machine, so BY THE TABLE such a row read
`— / Unavailable` and `— / Not recorded`. `messagesCell` and `lastMessageOf` short-circuit on
`agent === 'shell'` FIRST, so the shipping product reads `— / Shell` and `— / Not applicable` — and
the prose in this very paragraph blessed that behaviour while the tables contradicted it. The fix is
to the tables, which now carry the shell as their first row on both sides, plus a driven case in
`build/p293/manager-conformance-probe.mts` so a later round cannot silently flip it back.
**No product code changes and no word a person reads changes.**

### 3.5 When the activity is asked, and who owns the triggers

The slice verb `loadSessionActivity(ids)` (builder C) asks in chunks of 100, in the order given,
one after another, and merges answers into `sessionSheet.activity` by id. **A chunk that rejects,
or that main refuses as `INVALID_INPUT`, settles EVERY id it asked for** to `{ coverage:
'unavailable', reason: 'unreadable' }` with all values null, so no cell stays pending. A build
whose preload has no `overview.activity` settles every agent row the same way, with no error
drawn.

**Every trigger lives in ONE hook**, `useSheetRefresh()` in
`src/renderer/session-manager/use-sheet-refresh.ts` (builder D), mounted by the sheet. The first
pass named the debounces and gave them to nobody.

| Trigger | What it asks |
| --- | --- |
| the sheet opens | every Managed id, in drawn order |
| the refresh button | `refreshSessionSheet()`, then every Managed id |
| an id appears that `sessionSheet.activity` has never held | that id |
| an id's status changed since the last push | that id, debounced 1,500 ms and joined into one call, because a turn ending is what moves the numbers |
| **every 30 s while the sheet is open on Managed and `document.visibilityState` is `visible`** | the ids whose status is `running`, joined into the same debounced call. claude's answer slot is REPLACED by each later assistant text (`fold.ts:111-113`), so `answer_at` moves with no status change, and without this a row reads `Working` beside `58m ago` (R15) |
| Details opens on a Past row | that one id |

The same hook owns the 250 ms debounce of `refreshPastSessions()` (§3.6) and the prune of
`checked` (§2.10). It clears every timer on unmount.

### 3.6 Refresh without losing the place

`sessionSheet` is `null` in the slice's initial state, NEVER `undefined`: `modalLayerOpen`,
`SavedOutputModal`, `lazy.tsx` and the Escape rung all ask `!== null`, and `undefined !== null`
would read as an open sheet.

| What | Where it lives | Keyed by | Survives |
| --- | --- | --- | --- |
| tab, search, project filter, tab filter, state filter, sort | `sessionSheet` in the store | the project filter by GROUP KEY | every refresh and every push. A tab change resets the state filter and the selection, closes any expansion that is not busy and any batch in `confirm`, and keeps the rest. A project key whose group is gone resets to `all` and clears the selection |
| selection | `sessionSheet.checked` | session id | sort, refresh, pushes that hide nothing. **Pruned to `visibleIds` on every commit** |
| expansion | `sessionSheet.inline` | session id | refresh and pushes. Closed when its row leaves the list and it is not busy |
| batch | `sessionSheet.batch` | session ids: `named` frozen at open, `targets` frozen at the press | refresh and pushes. Closed in `confirm` by ANY write to `checked` |
| activity | `sessionSheet.activity` | session id | refresh; replaced per id |
| scroll | a ref in the sheet component, one per tab | | every render. Rows and groups are keyed by id and group key, NEVER by index, so React never remounts the scroller |
| focus | the DOM | `data-manage-*` ids | a row re-rendering keeps its node. A node that unmounts under focus is answered by §2.13 |

**A change from anywhere.** While the sheet is open, a change to `useApp().sessions` refetches
`listRemoved` through `refreshPastSessions()`, debounced 250 ms, and the sheet's own Remove and
Restore refetch it at once. A project tab opening or closing re-renders the chips from
`useApp().projects`, and the prune then unchecks whatever the tab filter now hides. The refresh
button calls `refreshSessionSheet()`, which re-reads `sessions.list()`, `listRemoved()` and
`projects.list()`, then the activity. Nothing here is persisted: no `gmux.*` localStorage key is
added, so `[localStorage.keys]` does not move.

---

## §4 The actions

**The refusal that governs this section: no second action policy.** Every gate is
`sessionMenuItems()`'s and the existing lifecycle methods'. The sheet presents them.

### 4.0 THE RULE OF THE PRESS: an ID, a fresh read, the verb's own gate

A sheet is the first surface where a row can sit on screen for minutes while another window, a
machine reconnecting or the session itself changes it. A `Session` object captured when a row was
drawn, a menu was built or a panel was opened is STALE by the time it is used. At the parent, a
stale `exited` row whose menu says `Restart` would, once restored elsewhere, have main KILL the
live session and HARD DELETE its row (`src/main/restart/restart.ts:186-204`), and a stale
`Remove` would tombstone a live row without killing it (`core.ts:2890-2938` has no status gate),
leaving a process running with no row pointing at it. That is issue 27 made by this phase.

**So, with no exception:**

1. **Every host method, every inline Confirm, every Retry and every sheet-own menu item takes a
   session ID and nothing else.**
2. **At the press it re-reads the row by id** from `useApp.getState().sessions`, or
   `pastSessions` for a Past row.
3. **It re-evaluates THAT VERB'S OWN field of `sessionActionGates`** over the fresh row and the
   fresh env: End `canEnd`, Remove `canRemove`, Restore `canRestoreNow` (Managed) or
   `canRestorePastNow` (Past), Restart `offersRestart`, the bare rows `offersBare` with their
   verb's gate, Rename `canRename`, Resume conversation `offersResumeInPlace`, Go to session
   `!unknown && !removed`.
4. **When the row is absent or the gate is false, NOTHING is called.** Any open panel closes and
   one info toast says `SESSION_CHANGED`.
5. **Retry re-enters at step 1.** It never calls a `*Now` verb directly.
6. A row that is busy (§2.7) accepts no press at all.

One function in `actions.ts` does steps 2 to 4 for every caller:
`freshRow(id, tab): { session, gates } | null`. `conformance:manager` reads the source and holds
that no function in `actions.ts` other than `freshRow` reads `.session` off a `ManageRow`.

### 4.1 One gates predicate, consumed by the policy itself

The Restore gate is written three times today: `session-actions.tsx:775-780`,
`TerminalRegion.tsx:585-590`, and `split/SplitSurface.tsx:194-197`, which has already drifted (no
`machine.canRestore` arm). A fourth copy for the visible button and the batch is the refused second
policy. APPEND to `src/renderer/state/resume.ts`, where `hasRestoreMaterial`, `offersBareRecovery`
and `showsResumeVerb` already live because `state/` cannot import `app/`:

```ts
export interface SessionGateEnv {
  canRestore: boolean; canDiscard: boolean; shellPathReady: boolean;
  handback: SessionHandback | undefined;
}
export interface SessionActionGates {
  unknown: boolean; removed: boolean; ended: boolean; live: boolean; remote: boolean;
  canRename: boolean;           // !unknown && !removed
  offersRestore: boolean;       // the ROW IS PRESENT: !unknown && !removed && env.canRestore &&
                                //   (machine ? machine.canRestore
                                //            : restorable || (exited && hasRestoreMaterial))
  canRestoreNow: boolean;       // offersRestore && env.shellPathReady
  canRestorePastNow: boolean;   // removed && env.canRestore && env.shellPathReady &&
                                //   machineGone === undefined && (machine ? machine.canRestore : true)
  offersRestart: boolean;       // ended && !remote
  offersBare: boolean;          // !unknown && !removed && offersBareRecovery(session)
  offersResumeInPlace: boolean; // !unknown && !removed && showsResumeVerb(session, env.handback, status)
  canEnd: boolean;              // live
  showsRemove: boolean;         // ended: the ROW IS PRESENT
  canRemove: boolean;           // ended && env.canDiscard: the row is ENABLED
}
export function sessionActionGates(
  session: Session, status: SessionStatus, env: SessionGateEnv
): SessionActionGates;
```

`live` is `running | idle | needs_input`. `removed` is `discarded`. **Presence and enablement are
two fields on purpose.** The shipped `Remove` row is PRESENT whenever the row is ended and
DISABLED when `!canDiscard` (`session-actions.tsx:910-921`), and the shipped `Restore` row is
present on `offersRestore` and disabled on `!shellPathReady`. A rewrite that made Remove's
presence depend on `canRemove` would pass a host-parity test, because both arms would share the
regression.

**So the rewrite is pinned from the PARENT.** Builder E writes
`src/renderer/app/__tests__/p293-menu-characterisation.test.ts` FIRST, against the UNTOUCHED
`sessionMenuItems`: for every status × local and remote × material and none × a handback and none
× `canDiscard` true and false × `shellPathReady` true and false, it records each item's label,
order, glyph, hint, sublabel, `disabled` and `destructive` as a literal table in the test file
(not a snapshot file a later run can regenerate). E's report shows that run green BEFORE the
rewrite. Then `sessionMenuItems` and `closeSession()` (`session-actions.tsx:938`) are rewritten
to READ the gates, and the test must be green UNCHANGED, except for the one row this phase adds on
purpose: `discarded` (§4.2), which E records as the single named difference. `closeSession` does
nothing for `unknown` and nothing for `discarded`.

`TerminalRegion.tsx` and `SplitSurface.tsx` are NOT touched; their drift is a finding for the
orchestrator to queue (§9).

### 4.2 The host: the policy's items, the sheet's presentation

`sessionMenuItems` gains an optional third parameter. APPEND to `src/renderer/app/session-actions.tsx`:

```ts
export interface SessionActionHost {
  rename(sessionId: string): void;
  restore(sessionId: string, options?: CaptureChoice): void;
  restart(sessionId: string, options?: CaptureChoice): void;
  end(sessionId: string): void;
  remove(sessionId: string): void;
  savedOutput(sessionId: string): void;
  /** A verb that draws OVER everything and needs no session in front of it. The host leaves, then runs. */
  leaveThen(run: () => void): void;
  /** A verb that acts ON a session the host covers. The host goes to that session first and
   *  runs ONLY when the jump answered ok. */
  goThen(sessionId: string, run: () => void): void;
}
export function sessionMenuItems(
  session: Session, renameTarget: string, host?: SessionActionHost
): (MenuItemSpec | 'sep')[];
```

- **Every host method takes an ID**, because the closure that calls it may be seconds old (§2.8,
  §4.0).
- With no host every `run` is byte for byte what it is today, and all four existing callers
  (`AttentionOverlay.tsx:277`, `TerminalRegion.tsx:169`, `split/SplitSurface.tsx:114`,
  `split/surface-dnd.ts:360`) are untouched.
- With a host, `Rename`, `Restore`, `Restart`, both bare rows, the saved-output row, `Remove` and
  `End session…` call the host's method with `session.id`.
- **`Resume conversation` runs through `host.goThen(session.id, run)`.** `resumeInPlace(id)` types
  into a session by id wherever it is, and `keyboard.ts:332-344` already rules that nothing types
  into a session a person cannot see. The sheet's `goThen` re-checks the gate (§4.0), then
  `jumpToSession(id).then((r) => { if (r.ok) { closeSessionManager({ give: 'terminal' }); run(); } })`.
  A refused jump leaves the sheet open and types nothing.
- `Show what it loaded…` and the remote review row run through `goThen` too: the first opens the
  Context sidebar, which is not mounted with no project open and belongs to whichever project is
  active (`src/renderer/context/open-session.ts:65`), and the second draws a native menu at
  `menuPointFor(session.id)`, which finds the row BEHIND the sheet only after the jump.
- `Catch me up…` runs through `host.leaveThen(run)`: the page draws over the whole work area for
  any session, with or without a project (`App.tsx:312`). The sheet closes with `give: 'nobody'`,
  because the page's own flight takes the keyboard.
- The identity rows and `Copy directory path` are unchanged.
- **THE PARITY RULE, pinned by a test:** for every status and both local and remote, the items with
  a host and without one are equal in everything except `run`.
- **A `discarded` row gets its own arm**, beside the `unknown` arm at `:744`: it returns
  `[...sessionIdentityItems(session), copyDirectoryPathItem(session)]`. Today a `discarded` row is
  neither `unknown` nor `ended`, so the function offers `Rename` and `End session…` on it
  (`session-actions.tsx:760`, `:910-930`). Nothing calls it with one today; the Past tab is the
  first caller, and the policy learns the status rather than the sheet filtering its output. The
  saved-output row is left out because Remove deletes the snapshot generations
  (`core.ts:2885-2890`).

### 4.3 End, one row

- **Exists:** `endSession(sessionId)`, `sessions-slice.ts:1066`, over `gmux.sessions.kill(id)`,
  `sessions:kill`, `core.ts:2743 killSession`. Its confirm is `setConfirm`, a STACKED modal, and
  its kill is fire and forget with a toast.
- **Adapted:** two extractions, and `endSession` is re-composed from both so the confirm it sets is
  byte identical. `src/renderer/state/__tests__/end-remote-copy.test.ts:128-205` pins those words
  through `useApp.getState().confirm` and must stay green UNTOUCHED.
  - APPEND to `resume.ts`, shaped like `BareRecoveryConfirm` (`:392`):
    `endSessionConfirm(session): LifecycleConfirm` and `removeSessionConfirm(session):
    LifecycleConfirm`, where `LifecycleConfirm` is `{ title; body; confirmLabel }`. The three End
    bodies move there verbatim.
  - APPEND to the slice: `endSessionNow(sessionId): Promise<LifecycleResult>`, where
    `LifecycleResult` is `{ ok: true } | { ok: false; message: string }`. It awaits the kill and
    answers `errorText(err)` on a rejection. It raises no confirm and no toast. **With no bridge
    it answers `{ ok: false, message: LIFECYCLE_BRIDGE_MISSING }`**, the constant `'This build
    cannot change sessions.'` in `resume.ts`, the shape of `OVERVIEW_BRIDGE_MISSING`
    (`src/renderer/state/overview-slice.ts:64`). Every `*Now` verb answers it the same way when
    its bridge method is missing.
- **In the sheet:** the button and the menu row both reach `sheetHost.end(id)`, which runs §4.0
  on `canEnd` and opens the `end` expansion. Confirm runs §4.0 AGAIN, marks the panel busy through
  `markSessionSheetInlineBusy(id)` (false means a second press: do nothing), then calls
  `endSessionNow`.
- **The continuation writes ONLY into its own panel.** It calls `settleSessionSheetInline(id,
  next)`, which writes only when `inline.id === id && inline.busy`, always a whole
  `SessionSheetInline`, and answers whether it wrote. It NEVER calls `patchSessionSheet`, whose
  type cannot carry `inline` (§6). On `ok`, `next` is null: the row is unchecked, reads ended with
  `Restore`, and focus goes down its chain. On a failure, `next` is `failed` with main's sentence
  and `retry: 'end'`. There is no success toast: the row changes in front of the person.
- **When the panel is gone.** `settleSessionSheetInline` answers false when the sheet closed, or
  the panel is no longer this id's. Then a failure is ONE sticky error toast carrying main's
  sentence, which is what the shipped verb does (`sessions-slice.ts:1107-1109`), and a success is
  the toast the shipped verb shows, which for End is none. A person who confirmed End on a remote
  row and pressed Escape is never left believing a session ended that did not. The same rule binds
  Remove, Restore, Restart and Rename.
- **A capture that failed is not a failed End.** Main still kills (`core.ts:2770-2836`) and posts
  its own `snapshot-failed` notice through `scrollback.onNotice`. N of those are N toasts; the
  sheet does not collect them.

### 4.4 Remove

- **Exists:** `removeSession(sessionId)`, `sessions-slice.ts:1155`, over `sessionExtras.discard`,
  `sessions:discard`, whose handler calls `core.removeSession` (`src/main/restore/ipc.ts:58-64`,
  `core.ts:2890`), the 90 day tombstone. The channel's old comment at
  `src/shared/ipc/app.ts:45-48` still says "manifest delete" and "Never valid for a live
  session"; the second half is true and NOTHING enforces it. The shipped `removeSession`
  re-checks nothing at its confirm.
- **Adapted:** `removeSessionConfirm` above, and `removeSessionNow(sessionId):
  Promise<LifecycleResult>`, which discards, applies `sessions.list()` and calls
  `refreshPastSessions()`. `removeSession` is re-composed from both, words unchanged.
- **Main now refuses it for a live LOCAL row** (§4.9, `removeRefusal`). The renderer's press-time
  re-check closes the stale panel; main closes the window between that read and the write, for
  every caller.
- **In the sheet:** menu only (the study keeps it off the row). `sheetHost.remove(id)` runs §4.0
  on `canRemove`, opens `remove`, runs §4.0 again at Confirm. The row leaves Managed, the Past
  count rises, focus goes to the selected tab. A refusal from main is the `failed` panel with
  main's sentence.

### 4.5 Restore

- **Exists, Managed:** `restoreSession(id, options)`, `sessions-slice.ts:1243`, over `runRestore`
  `:592`. It calls `setActiveSession(restored.id)` UNCONDITIONALLY at `:607`, which writes the
  ACTIVE project's slot whatever project the session belongs to (`:746-755`). No surface today
  reaches it for a session outside the active project; the sheet is the first.
- **Exists, Past:** `restorePastSession(id)`, declared `:293`, implemented `:1308`. It asks through
  a NATIVE dialog (`src/main/restore/ask-open-project.ts`), sets `pastOpen: false` at `:1350`, and
  lands on the session at `:1357-1364`. It returns `void`.
- **Adapted:**
  - APPEND to `resume.ts`: `restoreLandedNote(before, restored, withoutCapture): RestoreNote`,
    `{ kind: 'success' | 'error'; text: string; sticky: boolean }`, being the three sentences
    `runRestore` toasts today (`:615-658`), moved verbatim. `runRestore` reads it.
  - `RestoreOutcome` is `{ kind: 'restored'; session: Session; note: RestoreNote } | { kind:
    'busy' } | { kind: 'failed'; message: string }`.
  - `restoreSessionNow(id, options?): Promise<RestoreOutcome>`: the restoring flag, the restore,
    `applySessions(await list())`. No confirm, no toast, NO landing.
  - `restorePastSession(id): Promise<RestoreOutcome>` is REWRITTEN in place: no ask, no close, no
    landing, no toast; on a failure it refetches the removed list, as it does today.
  - `runRestore` and `runRestart` land ONLY when the restored session's target is the active
    project's: `sameTarget(targetOfSession(restored), targetOfProject(activeProject))`. That is a
    correction for every caller, and it is what stops the sheet moving another project's selection.
    Because it moves a landing every caller shares, `probe:p167` is owed once (§7).
  - `restartSessionNow(id, options?): Promise<LifecycleResult>` exposes `runRestart` without the
    bare confirm and without its error toast; `restartSession` keeps both, so the shipped verb is
    unchanged.
  - `pastRestoreNeedsAsk` (`resume.ts:291`) compares BARE paths, so a remote tab with the same path
    suppresses the ask for a local row. It is replaced by `restoreNeedsOpenAsk(session,
    openTargets: readonly WorkspaceTarget[]): boolean`: true exactly when the session is on THIS
    Mac, has no `machineGone`, and no open target is `sameTarget`. Its tests in
    `src/renderer/app/__tests__/resume.test.ts` move with it.
- **In the sheet**, one path for the button, the menu row and Retry, on both tabs:
  1. §4.0 on `canRestoreNow` or `canRestorePastNow`. **Retry starts HERE.**
  2. `options.withoutCapture` opens `restore-bare`, whose Confirm returns to step 1 with the
     option kept.
  3. `restoreNeedsOpenAsk` opens `restore-open`. **The ask is INLINE** (ruling R1). A row on
     another machine never asks and never opens a tab here: main re-homes it
     (`src/main/machines/remote-rehome.ts`). Its Confirm runs §4.0 again. **Before the ask is
     drawn the folder is asked about** (§11, W7): today's native ask statted it and said on the
     FIRST press that it no longer exists; the first build promised `A fresh shell opens in the
     same folder` over a folder that was not there. The one read the tree has, `fs:readDir`, is
     asked, and only ENOENT or ENOTDIR reads as gone: then the `failed` panel opens at once with
     `noFolderThere` and `retry: 'restore'`, and no tab is opened. Any other failure, and a build
     with no reader, draws the ask as before, so this can never refuse a restore that would work.
     No channel is added.
  4. On `Open project and restore`: remember `activeProjectId`, then
     `openTargetProject(target)` (`projects-slice.ts:270`). A refusal becomes `failed` with
     `targetOpenRefusal(...)`'s sentence and NO restore is attempted. This is the one intentional
     difference from the old verb, which restored anyway: the sheet can say why and offer Retry,
     and the old verb could not. The group has just moved to the open section, so the expansion is
     followed ONCE with `scrollIntoView({ block: 'nearest' })`.
  5. The verb. `restored` on the MANAGED tab: the expansion closes, `refreshSessionSheet()`, the
     row is Managed and live, and ONE toast carries `note` with `action: { label: 'Go to session',
     run }` (`notices-slice.ts:20` already carries an action). The sheet stays open and the person
     chooses whether to go there. `restored` on the PAST tab (§11, W1): the sheet closes and the
     person lands, as today's Past Sessions landed them: when an open tab is `sameTarget` to the
     restored session, that project is made active and the session selected, the sheet closes with
     the keyboard given to nobody and the terminal takes it when its pane mounts (a give-back one
     frame later could hand it to another live pane first, R16's hazard); the note is toasted
     without an action. With no open tab (a row main re-homes) the sheet still closes, the keyboard
     goes back where it was, and the toast keeps `Go to session`. `failed`: the row KEEPS its place, the expansion is `failed`
     with main's sentence plus `The saved session is still here.`, `retry: 'restore'`, and, when
     step 4 opened a tab for this attempt, the project that was active before is activated again
     if it is still open.
- `targetOpenRefusal(result, shown, machineLabel): string` is EXTRACTED from `jumpToSession`
  (`session-focus.ts:166-177`) and exported from that file, and `jumpToSession` reads it. No
  behaviour moves there.

### 4.6 Restart, Show what it loaded, Catch me up, Review changes

**Restart is the one shipped verb that reaches `core.discardSession`, the hard delete**, for the
OLD row only and only after the replacement exists (`restart.ts:180-204`, reached through
`sessions:restart`, `src/main/restart/ipc.ts:17`). The first pass said no renderer channel
reaches the hard delete; that was false, and a spelling pin would have passed green over it. The
sheet offers Restart EXACTLY where the policy does, on `offersRestart`, never on the visible
button, NEVER in a batch, and only through `sheetHost.restart(id)`, which runs §4.0 first. A row
that turned live since its menu was drawn gets `SESSION_CHANGED` and nothing else.

Restart keeps its shipped behaviour otherwise: it acts at once, its label is `Restart`, and it has
no confirmation (ruling R7). Only `restart-bare` asks, inline, and its Confirm runs §4.0 again. On
success the old row is replaced by a new one in front of the person and there is no toast, except
the shipped `started fresh and does not save its history` for the bare form. A failure opens the
`failed` panel under the row with `retry: 'restart'` or `'restart-bare'`.

The `goThen` and `leaveThen` rows are §4.2's. A verb with no inline panel answers the way it
answers on every other surface, with a toast. "No modal above the sheet" is about modals; toasts
draw at `--z-toast`, above the scrim.

### 4.7 Go to session

`jumpToSession(id)` (`src/renderer/app/session-focus.ts:132`), AS IS, after §4.0 on
`!unknown && !removed`. It finds the session by ID, composes the target with the machine, lands in
an open tab, or opens the CORRECT target through `openTargetProject`: local through
`projects.add`, remote through `addRemoteProject`, and a remote path is never opened as a local
folder. The sheet closes ONLY on `ok`, the ⌘J overlay's pattern
(`AttentionOverlay.tsx:201-205`), with `closeSessionManager({ give: 'terminal' })`: one frame
after the close reaches the DOM it calls `focusTerminal()`, because `land()`'s own
`requestAnimationFrame(focusTerminal)` can fire while the sheet is still drawn and §2.13's rule
would take the keyboard straight back. On a refusal `jumpToSession` has already raised its own
sticky sentence; the sheet stays open, the row stays, focus returns to its name, and no second
copy is drawn inline.

### 4.8 Rename, saved output, details

- **Rename.** `renameSessionNow(id, name): Promise<LifecycleResult>` is appended and
  `renameSession` (`:1055`) re-composed from it. The panel holds a plain `.input`, NOT
  `RenameInput`: that input has `autoFocus` and commits on blur
  (`session-actions.tsx:1036`, `:1045`), and a blur is what a click on `Cancel` causes. Save runs
  §4.0 on `canRename`. `sessions:rename` goes by id, so it works in a closed project. A failure is
  the panel's error line and the panel stays open.
- **Saved output.** `sheetHost.savedOutput(id)` calls the shipped `openSavedOutput(id)`
  (`sessions-slice.ts:1392`) and opens `output`. The body is `SavedOutputBody({ session, output,
  loading })`, a NEW file `src/renderer/app/SavedOutputBody.tsx` holding what
  `SavedOutputPanel` draws between its title and its buttons (`SavedOutputModal.tsx:157-173`), and
  `SavedOutputPanel` reads it. `SavedOutputModal` answers null while `sessionSheet !== null`, so the
  panel never stacks. Closing the expansion calls `closeSavedOutput()`.
  `src/renderer/app/__tests__/saved-output.test.tsx` (builder E) keeps its case at `:178` green
  over the REAL store, whose `sessionSheet` starts `null`, and gains one: with the sheet open and
  a saved output open, the modal renders `''`.
- **Details** reads the projection and the activity. It calls nothing.

### 4.9 Batch End: orchestration over the per-session End

There is no batch lifecycle call in the tree, and none is added to main. The confirmation and every
gate live in the renderer, main has no state gate on `killSession` (finding F2), `sessions:kill`
already answers per target with main's own sentence, and the backlog's one new channel is spent on
the aggregate. A main-side batch would need a second copy of the policy.

`src/renderer/session-manager/batch-end.ts`, pure over injected dependencies:

```ts
export type BatchSkipReason = 'ended' | 'unreachable' | 'gone';
export type BatchRowOutcome =
  | { state: 'pending' } | { state: 'ending' } | { state: 'ended' }
  | { state: 'skipped'; reason: BatchSkipReason }
  | { state: 'failed'; message: string } | { state: 'not-run' };
export function batchEligibility(
  session: Session, gates: SessionActionGates, machineKnown: (machineId: string) => boolean
): 'yes' | BatchSkipReason;                       // the table of §2.10
export interface BatchEndDeps {
  targetIds: readonly string[];
  list(): Promise<readonly Session[] | null>;      // main's truth; null when it could not be read
  eligibility(session: Session): 'yes' | BatchSkipReason;
  end(sessionId: string): Promise<LifecycleResult>;
  stopRequested(): boolean;
  report(sessionId: string, outcome: BatchRowOutcome): void;
}
export interface BatchEndSummary { ended: number; skipped: number; failed: number; notRun: number }
export function runBatchEnd(deps: BatchEndDeps): Promise<BatchEndSummary>;
```

`list()` is the slice verb `refreshSessions(): Promise<Session[] | null>` (builder C): it awaits
`gmux.sessions.list()`, APPLIES the answer with `applySessions`, and answers the list; it answers
null on a throw or with no bridge, and it never throws. `end` is `endSessionNow`.

**THE ALGORITHM.**

0. **Name.** `startBatch()` (on `End selected sessions…`): refused while a batch exists or an
   inline verb is busy. It reads `useApp.getState()` at that instant and computes `named = checked
   ∩ visibleIds ∩ { id : batchEligibility(...) === 'yes' }`, in drawn order, by session ID, and
   `skippedAtOpen`, the count by reason of every other checked id. It calls
   `openSessionSheetBatch({ named, skippedAtOpen })`. **`named` is an UPPER BOUND and never
   grows.**
1. **Freeze, at the press of `End <n> sessions`.** `confirmBatch()` is SYNCHRONOUS up to here: it
   reads `useApp.getState()` again and computes `targets = named ∩ checked ∩ visibleIds ∩
   eligible NOW`, in drawn order. It reads `checked` from the store and NEVER a copy kept on the
   batch. It calls `beginSessionSheetBatchRun(targets)`, which in ONE `set` returns null unless
   `batch.phase === 'confirm'`, and otherwise flips the phase to `running`, stores `targets`, and
   mints `runId` from a module-level counter that never resets. A null answer means a second
   press or a closed panel: return. **An id that was not named is never a target, however
   eligible it has become. An id that was named and is no longer eligible is not a target
   either.** A name is never a key, in the list or in any call.
2. **One target at a time, in order.** Sequential, as `restoreAllSessions` is
   (`sessions-slice.ts:1270-1279`). Only one batch runs at once.
3. **Before EACH call**, first `stopRequested()`: if true, this target and every later one are
   `not-run` and the loop ends. Then `await list()`. A null is `failed` with `BATCH_LIST_FAILED`,
   `Tortie could not read the session list, so it did not end this one.`, and the loop goes on:
   **never call End without a fresh read.**
4. **Find the row BY ID** in that answer. Absent is `skipped: gone`, which is what a row removed
   from another window, a restarted session and a changed identity all look like: a tombstoned id
   is not in `listSessions()`.
5. **Re-check the capability** with `eligibility(session)`, the SAME `batchEligibility` over the
   SAME `sessionActionGates`: a reason is `skipped` with that reason. `ended` is also the target
   that ended by itself.
6. **Call** `end(id)`. `ok` is `ended`. A refusal is `failed` with main's sentence:
   `TARGET_UNBOUND`, `MACHINE_NOT_READY`, `Session not found.`, the `lifecycle-gate.ts` sentence,
   the shutdown refusal, or a transport error. **Skip and record, never throw**: each iteration is
   wrapped, and a throw is `failed` with `errorText`. One failure never stops the batch.
7. A target that dies between the re-check and the call still ends: `tmux.killSession` is
   idempotent on a missing session (`src/main/tmux/sessions.ts:230-239`) and the row ends.
8. **`stopRequested()` is bound to THIS run.** It is `true` UNLESS
   `get().sessionSheet?.batch?.runId === myRunId && !batch.stopRequested`. A closed sheet reads
   true; so does a sheet that was closed and reopened with a NEW batch, whose `stopRequested:
   false` the old loop must never read as its own. The first pass read
   `batch?.stopRequested ?? true` with no run id, and an old loop would have resumed its targets
   under a new batch's flag with no report drawn.
9. **If the sheet closes mid-batch** the batch STOPS after the call in flight. Nothing ends out of
   a person's sight. `report` carries `runId`, and `reportSessionSheetBatch` drops a report whose
   run is not the current one. When the loop returns and its run is no longer current, ONE sticky
   info toast reads `batchClosedToast(e, n)`: `<e> of <n> sessions ended. The rest were left
   running because the manager closed.` `Stop` sets the same flag with the sheet open (R10).
10. Ending keeps saved material and leaves each row under Managed as ended. Nothing is removed.

**What cannot happen while a batch exists.** `setSessionSheetTab` is refused while `phase ===
'running'`; a tab change in `confirm` closes the batch; any write to `checked` in `confirm` closes
it; opening an expansion in `confirm` closes it, and none opens while it runs; the Session menu's
two doors are refused while any layer OTHER than the sheet is open (§5.2).

**The main-side hardening that goes with it (findings F2 and B2).** NEW
`src/main/sessions/lifecycle-gate.ts`, pure, two functions, each answering a sentence or null:

- `endRefusal(record: Pick<ManifestSessionRecord, 'status'> | undefined): string | null` answers
  `This session was removed, so there is nothing to end. Nothing was changed.` for `discarded`.
  `killSessionAdmitted` (`core.ts:2752`) asks it FIRST, above the remote branch, over
  `this.manifest.getSession(sessionId)`, and throws `gmuxError('INVALID_INPUT', sentence,
  sessionId)`. Without it, between step 3 and step 6 another window's Remove can land and the kill
  writes `exited` over `discarded` (`core.ts:2841`) while `removed_at` stays set and the snapshot
  is already deleted: the row silently leaves Past and returns to Managed. A removed REMOTE row is
  caught too, because `forgetRemoteRow` has taken it out of the feed maps and it falls to the local
  branch. A feed-only remote row has no record and passes.
- `removeRefusal(record: Pick<ManifestSessionRecord, 'status' | 'machineId'>): string | null`
  answers, for a LOCAL record (`machineId` undefined or `LOCAL_MACHINE_ROW`) whose status is
  `running`, `idle` or `needs_input`, `This session is still running, so it was not removed. End
  it first.`, and for `unknown`, `Tortie cannot see whether this session is running, so it was not
  removed.` `core.removeSession` asks it on its LOCAL path, directly after
  `this.mustGetSession(sessionId)` (`core.ts:2928`), and throws the same way. Local statuses are
  persisted (`toSession` reads `record.status`, `codecs.ts:883`), so the record IS what is drawn.
  **A record on another machine passes**: its recorded status is not the truth
  (`remote-sessions.ts:1240-1260`) and the remote branch is untouched, so `conformance:remoteclose`
  holds as it did. Every harness that removes a session kills it first
  (`probe-registry.ts:712-716`, `shot-hook.ts:1499-1503`, `build/probe-p167-scale.mjs:1455`,
  `remote-smoke.ts:3102-3111`), so none of them meets the refusal.
- **One harness line moves with `endRefusal`.** `src/main/harness/durability.ts:41-44` kills every
  leftover `smoke-keeper` whose status is not `exited`, UNCAUGHT, over `listSessionRecords()`,
  which includes tombstones. Its condition gains `&& rec.status !== 'discarded'`, so a leftover
  tombstone goes straight to the hard delete on the next line instead of aborting the smoke.
- **NOT included: refusing `restorable`.** A kill of a `restorable` row demotes it to `exited`,
  and for a row with no material the policy then withdraws Restore
  (`src/renderer/state/resume.ts:223`). The renderer never asks for it (`canEnd` is false, checked
  at the press and before every batch call); the window is the instant between a batch's re-read
  and its call in which the session host itself dies; and that same `durability.ts` loop kills
  leftover `restorable` rows on purpose and uncaught. A main behaviour change for callers this
  phase does not own, to close a window that narrow with a consequence that mild, is not taken.
  Queued (§9).
- **NOT included: refusing a remote record that no feed map holds.** `remoteRecordStatus`
  (`remote-sessions.ts:1245`) answers the RECORDED status for a machine that is not registered,
  and for such a row a single, confirmed End is the only way a person can clear it. The BATCH
  never counts such a row (`batchEligibility`, §2.10), so it never reports `Ended` for a process
  it did not touch. The single End keeps its shipped behaviour on every surface, and its shipped
  confirm body says `This stops what is running in it on <machine>`, which is false for that row.
  That is a lifecycle ruling and it is the operator's: R11.

---

## §5 The doors and the menus

### 5.1 The rows

`src/main/menu.ts`, the Session submenu, directly above the row at `:932`:

```ts
// Phase 293. `list-selection`: the sheet is a list a person selects rows in, and selecting is what
// its one new verb, End selected sessions…, acts on. Unaccelerated for the reason the row below
// gives: it ends processes, so a person reads a name first.
item('Manage Sessions…', 'manage-sessions', undefined, 'list-selection'),
item('Past Sessions…', 'past-sessions', undefined, 'history')
```

- **Action ids.** `'past-sessions'` stays (`src/shared/ipc/sessions.ts:355`). APPEND
  `export type ManageSessionsMenuActionId = 'manage-sessions';` to that file. In
  `src/shared/ipc/app.ts` it takes TWO edits: the import at `:18` becomes `import type {
  ManageSessionsMenuActionId, PastSessionsMenuActionId } from './sessions';`, and one union member
  goes directly below `| PastSessionsMenuActionId` at `:550`. `MenuActionWithFind` (`:715`), the
  type `item()` takes, folds it in through `AnyMenuActionWithProjects`. Menu action ids are not in
  the contract baseline.
- **No accelerator, argued.** Both neighbours are unaccelerated on purpose, the sheet ends
  processes, and no free chord is spent. `build/assert-menu-accelerators.mjs` scans
  `src/main/menu.ts`, the tray and recents for chord literals and none is written.
- **The glyph gate.** `list-selection` is already in `MENU_CODICONS`
  (`src/shared/menu-codicons.ts:74`) with its PNG in `src/main/menu-icons.generated.ts`, so
  `build/generate-menu-icons.mjs`, which launches Electron, is NOT run.
  `build/assert-menu-glyphs.mjs` stays green. The wearer list in that file's comment at `:183`
  names two wearers today; builder A adds the third, with the reason above, because the house rule
  is that a shared mark says who wears it and why.
- `src/main/__tests__/view-menu.test.ts:446` gains
  `expect(markOf(session, 'Manage Sessions…')).toBe('list-selection')`.
  `build/handback-conformance-probe.mts:290` reads positions above the hotkey rows only, and the
  new row sits below them.

### 5.2 The renderer's arms

`src/renderer/app/menu-actions.ts`, in source order directly above `case 'past-sessions'`:

```ts
case 'manage-sessions':
case 'past-sessions': {
  if (s.bootBlock !== null) return;
  if (otherLayerOpen()) return;
  openSessionManager(action === 'past-sessions' ? 'past' : 'managed');
  return;
}
```

- **No project guard**, so both doors work with no project open. The door mounts OUTSIDE the
  no-projects branch, at `App.tsx:373+`, where the other sheets mount.
- **`otherLayerOpen()`**, in `src/renderer/session-manager/open.ts`, is true when a layer is open
  that is drawn OVER an open sheet or that the door may not open over: every field
  `modalLayerOpen()` names except three, plus the two palettes. The three are the sheet's own, the
  Catch Me Up page (`overview`, a page at `--z-overview`, under every modal) and the New Session
  sheet (`createOpen`, which nothing opens while the sheet is open, so when both are open the
  sheet came second and is mounted after it in `App.tsx`). **The doors open OVER both**, as today's
  Past Sessions did; the first build refused there with no word, which the no-regression verifier
  measured as worse than today (§11, W3). The create sheet's Escape rung yields to the sheet's
  (`s.createOpen && s.sessionSheet === null`), so Escape closes the sheet on top first. The first pass wrote `layerOpen && s.sessionSheet === null`, which let the door switch
  the sheet's tab while a `ConfirmDialog` or the ⌘J overlay covered it. F's test reads both
  functions as text and holds that `otherLayerOpen` names every field `modalLayerOpen` names but
  those three, so a NEW layer is put on one side or the other by whoever adds it. It cannot live in `shell-actions.ts`, which `p127-keyboard.test.ts:185-195` pins at exactly
  four exports.
- A second press while the sheet is the top layer switches its tab, through
  `setSessionSheetTab`, which the store REFUSES while a batch runs and which closes a batch in
  `confirm` and any expansion that is not busy. So the door can never leave an armed confirmation
  standing on a tab a person is no longer looking at, and can never unmount the panel of a running
  batch.
- Under a boot block no modal mounts (`App.tsx:291-301`), so an open flag would hold
  `modalLayerOpen()` true over nothing. Hence the first guard.
- `src/renderer/app/__tests__/p127-menu-actions.test.ts:63-112`: `'manage-sessions'` enters `ARMS`
  directly above `'past-sessions'`, and the title becomes `answers all 51 actions and no more`.

### 5.3 The modal layer, and every door that must not act under it

- `modalLayerOpen()` (`src/renderer/app/shell-actions.ts:92`): `s.pastOpen` is REPLACED by
  `s.sessionSheet !== null`. `runMenuAction`'s `layerOpen` guards and `focusChordSwallowed()`
  (`keyboard.ts:84`) read it, so **⇧⌘↩ is swallowed** while the sheet is open, as it is for every
  layer (Phases 80.1, 286), and so is the ⌃⇧P picker (`keyboard.ts:345-358`).
  `p127-keyboard.test.ts:210-222` replaces `'s.pastOpen'` with `'s.sessionSheet !== null'`; the
  count stays seven.
- **⇧⌘U is NOT swallowed by any modal today**: the branch at `keyboard.ts:372-377` and
  `case 'show-overview'` (`menu-actions.ts:375`) ask nothing about layers. For THIS sheet both gain
  `if (useApp.getState().sessionSheet !== null)`: the key branch `preventDefault`s and returns, the
  menu arm returns. The general case is a finding for the orchestrator to queue, not this phase's:
  `modalLayerOpen()` includes `s.overview !== null` and ⇧⌘U must still CLOSE an open page.
- **F2 — the KEYDOWN branch is the one that matters.** `keyboard.ts:216-224` handles F2 with no
  layer guard. No sheet row carries `data-session-id`, so `focusedSessionRowId() ??
  s.activeSession()?.id` resolves to the ACTIVE session, the branch `preventDefault`s, and this
  ladder runs before the native accelerator, so the menu arm is never reached while any session is
  active. A person with focus on sheet row X who presses F2, types and presses Enter would rename
  the session BEHIND the scrim, through a `RenameInput` whose `autoFocus` has just pulled focus
  out of the modal. The branch gains, as its FIRST statement:

  ```ts
  if (s.sessionSheet !== null) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.repeat && sheetIsTopLayer()) renameFocusedManageRow();
    return;
  }
  ```

  `case 'rename-session'` (`menu-actions.ts:129-136`) gains the same branch ABOVE its `layerOpen`
  guard, for a real click on the menu row. `renameFocusedManageRow()` lives in the eager leaf
  `open.ts`: it reads `focusedManageRowId()`, the closest `[data-manage-row]` of the active
  element, runs §4.0 on `canRename` over a fresh read, and calls `setSessionSheetInline({ id,
  kind: 'rename' })`. It imports the store and `resume.ts` and nothing from the lazy chunk.
  **F's test drives the KEYDOWN path with an active session present** and asserts
  `renamingSessionId` stays null. RED at the parent shape.
- **The other doors, as the fix round settled them (§11, W6 and the press verifier's P1 to P3).**
  The rule is read off TODAY's Past Sessions panel, because the operator's rule is that nothing a
  person does today may get worse. A door whose result today is a usable layer drawn ABOVE the
  panel **closes the sheet first and then opens** (`leaveSessionManagerFor` in `open.ts`, keyboard
  to nobody, because the door's own layer takes it on mount): ⌘J and the ⌘J menu row, ⌘/ and the
  shortcuts row, Session → End Session… (only when there is a live active session to ask about;
  otherwise nothing moves) and Project → Close Project…. The person gets the layer they asked for,
  over the session it names, and nothing is ever stacked on the sheet (§9's refusal holds). A door
  whose result today is hidden BEHIND the panel is a hazard today, not a capability, and **returns
  before it acts**: the table below, plus Session → Next and Previous Session and the split arrows
  (they selected a session behind the sheet and its terminal took the keyboard; the chord is
  prevented so the menu rows never fire), an agent hotkey (`launch-agent:<id>`, refused in
  `launchAgent` itself) and File → New Project…, Open Remote Project… and Clone Repository… (each
  drew its dialog under the sheet with the keyboard in a hidden field). At the parent every one of
  them acts on the session or the surface BEHIND the sheet:

| Door | Where | What it would have done |
| --- | --- | --- |
| `end-session` | `menu-actions.ts:138-144` | raised a stacked `ConfirmDialog`, focus on its destructive button, for the ACTIVE session behind the sheet |
| `resume-conversation` | `menu-actions.ts:111-119` | typed into a hidden session |
| `new-session`, and ⌘T | `menu-actions.ts:122-128`, `keyboard.ts:432-439` | stacked the create sheet |
| `attention`, and ⌘J | `menu-actions.ts:280-282`, `keyboard.ts:444-447` | its rows call `sessionMenuItems` with NO host, so they reach `setConfirm`, and `Catch me up…` opens the page UNDER the sheet |
| `shortcuts`, and ⌘/ | `menu-actions.ts:283-285`, `keyboard.ts:458-461` | stacked the overlay |
| `toggle-session-focus` | `menu-actions.ts:277-279` | flew a region a person cannot see |

  The keydown cases `preventDefault()` first and then return. ⌘O and ⌘1 to ⌘9 are left alone:
  they change what is behind the sheet and end nothing, §2.10's invariant already answers a tab
  that opens under a `Tab closed` filter, and §2.13's `focusin` reclaim brings back a keyboard a
  terminal behind the scrim takes. The table's `end-session`, `attention` and `shortcuts` rows now
  close the sheet first, as the paragraph above says.
- **The tray and menu-bar door.** `focus-session:` (`menu-actions.ts:429-436`) lands
  `focusTerminal` behind the scrim today. It becomes `void jumpToSession(id).then((r) => { if
  (r.ok && useApp.getState().sessionSheet !== null) closeSessionManager({ give: 'terminal' });
  })`. A person who asked for a session from outside the window gets it.

### 5.4 Escape, and Tab

ONE rung in `keyboard.ts`, directly below the `s.shortcutsOpen` rung (`:149-157`) (the
`s.createOpen` rung above it yields to it since the fix round, because the sheet can open over the
create sheet and is then the one on top), ABOVE
`s.overview` (`:158`) and ABOVE `s.sessionFocus` (`:179`), which would otherwise swallow Escape
and toggle focus mode under an open sheet (a latent defect the old Past modal has today):

```ts
} else if (s.sessionSheet !== null) {
  e.preventDefault();
  e.stopPropagation();
  if (e.repeat) return;
  if (!sessionSheetTookEscape()) closeSessionManager();
}
```

`sessionSheetTookEscape` lives in the eager leaf `src/renderer/session-manager/escape.ts`, the
shape of `src/renderer/app/shortcuts-escape.ts`: the sheet registers a closure while it is mounted
and drops it on unmount. The ladder is capture phase on `window` and stops propagation, so
`FilterField`'s own Escape never runs; the closure clears the search itself. Its order is §2.13's.
The rungs above it (`attentionOpen`, `confirm`, `createOpen` and the rest) cannot be open over the
sheet after §5.3, except the two palettes, which own their Escape by design.

**Tab**, in the same handler, above the Escape block:

```ts
if (e.key === 'Tab' && s.sessionSheet !== null && reclaimSessionSheetFocus()) {
  e.preventDefault();
  e.stopPropagation();
  return;
}
```

`reclaimSessionSheetFocus()` (`open.ts`) answers true, and moves focus to the selected tab, only
when `sheetIsTopLayer()` and the active element is outside `.session-sheet`. Inside the sheet it
answers false and `trapTabKey` does the wrap.

### 5.5 The lazy door and the old modal

- New domain directory `src/renderer/session-manager/`, its own chunk, the shape of
  `src/renderer/overview/lazy.tsx`: `lazy.tsx` exports `SessionManagerSheetLazy`, which reads
  `useApp((s) => s.sessionSheet !== null)` and imports `./SessionManagerSheet` only through
  `import()`. `App.tsx` mounts it where `<PastSessionsModalLazy />` stood. The eager chunk gains
  two leaves only, `open.ts` and `escape.ts`, which import the store and nothing drawn.
- `open.ts` exports `openSessionManager(tab)`, `closeSessionManager(opts?: { give?: 'origin' |
  'terminal' | 'nobody' })`, `otherLayerOpen()`, `sheetIsTopLayer()`,
  `reclaimSessionSheetFocus()`, `focusedManageRowId()` and `renameFocusedManageRow()`.
  `give: 'origin'` is the default and is §2.13's Close. `'terminal'` calls `focusTerminal()` one
  frame after the close. `'nobody'` gives the keyboard to no one, for a verb that takes it itself.
  It records `document.activeElement` at the opening gesture when that is neither `body` nor
  inside `.session-sheet`. It is written local and small because the give-back helpers in
  `overview/open-overview.ts:246-272` are module private and pinned by Phase 289's tests; Phase 291
  is the round that may fold the three into one.
- **The old modal is DELETED**: `src/renderer/app/PastSessionsModal.tsx`, `past-sessions.css`, the
  `PastSessionsModalLazy` wrapper, the `modals.ts` re-export, and `pastOpen` and `setPastOpen` in
  the slice. `pastSessions`, `pastLoading`, `restoringIds` and `shellPathReady` stay.
  `SavedOutputModal.tsx:197` and `RemoteLinesModal.tsx:353` keep reading `pastSessions`.
- `src/renderer/app/__tests__/p165-lazy-doors.test.ts`: `DOORS` gains
  `['session-manager/lazy.tsx', './SessionManagerSheet', ['session-manager/lazy.tsx']]`; the pairs
  row `['app/lazy-modals.tsx', 's.pastOpen', 'app/PastSessionsModal.tsx']` becomes
  `['session-manager/lazy.tsx', 's.sessionSheet !== null', 'session-manager/SessionManagerSheet.tsx']`.

### 5.6 The native menus, as the phase brief must say it

Added: Session → Manage Sessions…. Kept: Session → Past Sessions…, which now opens the same sheet
on its second tab, also over the Catch Me Up page and the New Session sheet. Every row menu in the
sheet is native, through `ui:popupMenu`, and is `sessionMenuItems()` with two sheet-own rows above
it. No DOM menu is drawn. While the sheet is open, Session → Resume Conversation, New Session…,
Rename (F2), Next Session, Previous Session, View → Catch Me Up, File → New Project…, Open Remote
Project… and Clone Repository… act on the sheet or not at all, never on what is behind it; Session
→ End Session…, Project → Close Project… and the ⌘J and shortcuts rows close the sheet first and
then open over the app.

---

## §6 File ownership

Seven builders. **No file is in two lists.** Every `src/shared/*` edit is builder A's. Every name
other builders depend on is fixed HERE so all seven work at once.

### The names, fixed

| Name | File | Owner |
| --- | --- | --- |
| `OverviewActivityCoverage`, `OverviewActivityReason`, `OverviewActivityClock`, `OverviewSessionActivity`, `OverviewActivityInput`, `OverviewActivity`, `OVERVIEW_ACTIVITY_MAX_IDS` | `src/shared/overview.ts` | A |
| channel `'overview:activity'`; bridge `window.gmux.overview.activity(input)` | `src/shared/ipc/overview.ts`, `src/preload/overview.ts` | A |
| `ManageSessionsMenuActionId = 'manage-sessions'` | `src/shared/ipc/sessions.ts`, folded in `src/shared/ipc/app.ts` | A |
| `sessionActivity(deps, input)` | `src/main/overview/activity.ts` | A |
| `ActivityRowFacts`, `classifyActivityRow(facts)`, `toActivity(facts, stored)` | `src/main/overview/activity-map.ts` | A |
| `refreshRowForActivity(deps, store, row, recordedProviders, now): void`, exported `parseIsoMs` | `src/main/overview/service.ts` | A |
| `OverviewStore.listActivity(ids: readonly string[]): StoredActivity[]`, `StoredActivity` (the eleven columns of §3.4) | `src/main/overview/store/store.ts`, re-exported from `store/index.ts` | A |
| `endRefusal(record)`, `removeRefusal(record)` | `src/main/sessions/lifecycle-gate.ts` | B |
| `SessionGateEnv`, `SessionActionGates`, `sessionActionGates`, `LifecycleConfirm`, `endSessionConfirm`, `removeSessionConfirm`, `LifecycleResult`, `RestoreNote`, `restoreLandedNote`, `RestoreOutcome`, `restoreNeedsOpenAsk`, `LIFECYCLE_BRIDGE_MISSING` (`'This build cannot change sessions.'`, answered by every `*Now` verb whose bridge method is missing) | `src/renderer/state/resume.ts` | C |
| `endSessionNow`, `removeSessionNow`, `renameSessionNow`, `restoreSessionNow`, `restartSessionNow`, `restorePastSession` (rewritten), `refreshPastSessions(): Promise<void>`, `refreshSessions(): Promise<Session[] \| null>` (reads `sessions.list()`, APPLIES it, answers it; null on a throw or no bridge; never throws. It is §4.9's `list()`) | `src/renderer/state/sessions-slice.ts` | C |
| `SessionManagerSlice`, `SessionSheetState`, `SessionSheetTab`, `SessionSheetInline`, `SessionSheetInlineKind`, `SessionSheetRetry`, `SessionSheetBatch`, `SessionSheetBatchTarget`, `SessionSheetFilterPatch`; the state field `sessionSheet`, INITIALLY `null`; the verbs of the table below | `src/renderer/state/session-manager-slice.ts` | C |
| `BatchSkipReason`, `BatchRowOutcome` | declared in `session-manager-slice.ts` (C), because the slice stores them and `state/` does not import the domain. `batch-end.ts` re-exports them | C |
| `buildManageProjection`, `ManageProjectionInput`, `ManageProjection`, `ManageGroup`, `ManageRow`, `ManagePrimary` | `src/renderer/session-manager/projection.ts` | D |
| `visibleGroups`, `visibleIds`, `ManageFilters` | `src/renderer/session-manager/view.ts` | D |
| `ageTwoUnits`, `dayLabel`, `exactTime`, `removedDate` | `src/renderer/session-manager/format.ts` | D |
| `useSheetRefresh()` | `src/renderer/session-manager/use-sheet-refresh.ts` | D |
| every string of §2, as named exports; the ones E reads are `SESSION_CHANGED`, `END_UNREACHABLE_TITLE`, `NOTHING_TO_RESTORE_TITLE`, `INLINE_FAILED_HEADING` (a record by `SessionSheetRetry`), `RESTORE_STILL_HERE`, `restoreOpenHeading(label)`, `restoreOpenBody(promise)`, `renameLabel(name)`, `batchHeading(n)`, `batchBody(anyRemote)`, `batchSkippedLine(counts)`, `batchConfirmLabel(n)`, `batchRunningHeading(n)`, `batchDoneHeading(e, n)`, `batchOutcomeWord(outcome)`, `batchEndedToast(n)`, `batchClosedToast(e, n)`, `BATCH_LIST_FAILED`, `GO_TO_SESSION`, `SESSION_DETAILS`, `DETAILS_HELP`, `ActivityCell`, `messagesCell(activity, agent, remote)`, `lastMessageCell(activity, agent, now)`, `detailsMessages(activity, agent, remote)`, `detailsLastMessage(activity, agent)` | `src/renderer/session-manager/copy.ts` | D |
| `SessionManagerSheet`, `focusChain(selectors)`, `SessionManagerSheetLazy`, `openSessionManager`, `closeSessionManager`, `otherLayerOpen`, `sheetIsTopLayer`, `reclaimSessionSheetFocus`, `focusedManageRowId`, `renameFocusedManageRow`, `sessionSheetTookEscape`, `setSessionSheetEscape` | `session-manager/SessionManagerSheet.tsx`, `lazy.tsx`, `open.ts`, `escape.ts` | D |
| `SessionActionHost` (every method by ID, plus `leaveThen` and `goThen`), `sessionMenuItems(session, renameTarget, host?)` | `src/renderer/app/session-actions.tsx` | E |
| `targetOpenRefusal` | `src/renderer/app/session-focus.ts` | E |
| `SavedOutputBody` | `src/renderer/app/SavedOutputBody.tsx` | E |
| `sheetHost`, `freshRow(id, tab)`, `manageMenuItems(row)`, `openRowMenu(row, rect)`, `runPrimary(id, tab)`, `openDetails(id, tab)`, `confirmInline()`, `retryInline()`, `cancelInline()`, `saveRename(id, name)`, `goToSession(id)`, `startBatch()`, `confirmBatch()`, `stopBatch()`, `dismissBatch()`, `cancelBatch()` | `src/renderer/session-manager/actions.ts` | E |
| `runBatchEnd`, `batchEligibility`, `BatchEndDeps`, `BatchEndSummary` | `src/renderer/session-manager/batch-end.ts` | E |
| `InlinePanel({ row, inline })`, `BatchPanel({ batch, rowsById })` | `session-manager/InlinePanel.tsx`, `BatchPanel.tsx` | E |
| `window.__p293` | `src/renderer/app/p293-session-manager-drive.ts` | G |
| scripts `conformance:manager`, `ablation:p293`, `probe:p293` | `package.json` | G |

`SessionSheetState` is:

```ts
{ tab: SessionSheetTab; search: string; project: string /* 'all' or a group key */;
  tabFilter: 'all' | 'open' | 'closed';
  stateFilter: 'all' | 'running' | 'working' | 'needs-input' | 'idle' | 'ended' | 'unreachable';
  sort: { key: 'name' | 'state' | 'created' | 'messages' | 'last-message'; dir: 1 | -1 } | null;
  checked: Record<string, true>; inline: SessionSheetInline | null; batch: SessionSheetBatch | null;
  listError: string | null; activity: Record<string, OverviewSessionActivity> }
```

- `SessionSheetFilterPatch` is `Partial<Pick<SessionSheetState, 'search' | 'project' | 'tabFilter'
  | 'stateFilter' | 'sort' | 'listError'>>`. **It cannot carry `inline`, `batch` or `checked`**,
  so no continuation can write a panel through it.
- `SessionSheetInline` is `{ id: string; kind: SessionSheetInlineKind; retry?: SessionSheetRetry;
  message?: string; busy?: boolean; options?: CaptureChoice }`. `SessionSheetInlineKind` is
  `'details' | 'rename' | 'output' | 'end' | 'remove' | 'restore-open' | 'restore-bare' |
  'restart-bare' | 'failed'`. `SessionSheetRetry` is `'end' | 'remove' | 'restore' |
  'restore-bare' | 'restart' | 'restart-bare'`.
- `SessionSheetBatchTarget` is `{ id: string; where: string }`. `SessionSheetBatch` is `{ runId:
  number /* 0 until the press */; phase: 'confirm' | 'running' | 'done'; named:
  SessionSheetBatchTarget[]; skippedAtOpen: { ended: number; unreachable: number }; targets:
  string[] /* [] until the press */; outcomes: Record<string, BatchRowOutcome>; stopRequested:
  boolean }`. There is NO copy of the selection on it: the freeze reads `checked`.

**The slice's verbs, and what each refuses.** These rules live in the STORE, so no component and
no door can walk past them.

| Verb | Rule |
| --- | --- |
| `openSessionSheet(tab)` | opens on a fresh state, or switches the tab of an open one through `setSessionSheetTab` |
| `closeSessionSheet()` | sets `sessionSheet` to null. A running loop then reads `stopRequested()` true |
| `patchSessionSheet(patch: SessionSheetFilterPatch)` | a change to `search`, `project`, `tabFilter` or `stateFilter` clears `checked` |
| `setSessionSheetTab(tab): boolean` | REFUSED (false) while `batch?.phase === 'running'`. Otherwise resets the state filter, clears `checked`, closes an inline that is not busy and a batch in `confirm` |
| `setSessionSheetChecked(ids, on)`, `clearSessionSheetChecked()`, `pruneSessionSheetChecked(keep: readonly string[])` | refused while a batch runs, except the prune. ANY of them that changes `checked` closes a batch in `confirm` and an inline that is not busy |
| `setSessionSheetInline(next): boolean` | REFUSED while the current inline is busy, and while a batch is `running` or `done`. Opening one CLOSES a batch in `confirm`: the person moved on, and an armed confirmation never stands beside another panel |
| `markSessionSheetInlineBusy(id): boolean` | true only when `inline.id === id && !inline.busy`; a second press answers false |
| `settleSessionSheetInline(id, next): boolean` | writes only when `inline.id === id && inline.busy`; always a whole `SessionSheetInline` or null; answers whether it wrote |
| `openSessionSheetBatch({ named, skippedAtOpen }): boolean` | refused while a batch exists or an inline is busy; closes an inline |
| `beginSessionSheetBatchRun(targets): number \| null` | ONE `set`: null unless `phase === 'confirm'`; else `running`, `targets`, and a `runId` from a module counter that never resets |
| `reportSessionSheetBatch(runId, id, outcome)` | dropped unless `runId` is the current batch's |
| `finishSessionSheetBatch(runId)` | dropped unless current. All ended: the batch closes and `checked` clears. Otherwise `done`, and the ended and skipped ids are unchecked |
| `requestSessionSheetBatchStop()`, `closeSessionSheetBatch()` | `close` is refused while `running` |
| `refreshSessionSheet()`, `loadSessionActivity(ids)` | §3.5, §3.6 |

### The builders

| Builder | Owns | May assume |
| --- | --- | --- |
| **A. Contract and aggregate** | `src/shared/overview.ts` (APPEND the types); `src/shared/ipc/overview.ts` (**an IN-PLACE INSERT, not an append**: one member inside `OverviewInvokeChannelMap` at `:36-71`, one method inside `GmuxOverviewExtras` at `:78-89`, and the header's count); `src/shared/ipc/sessions.ts` (APPEND the action id after `:355`; INSERT a Phase 293 paragraph under the `listRemoved` comment at `:316-322` saying the no-push reason no longer holds and the sheet refetches); `src/shared/ipc/app.ts` (TWO in-place edits: the import at `:18`, one union member below `:550`); `src/shared/menu-codicons.ts` (the wearer comment at `:183` names `Manage Sessions…` and why); `src/shared/__tests__/overview-contract.test.ts` (six to seven); `src/preload/overview.ts`; `src/main/overview/activity.ts` (new); `src/main/overview/activity-map.ts` (new); `src/main/overview/service.ts`; `src/main/overview/store/store.ts`; `src/main/overview/store/index.ts`; `src/main/overview/ipc.ts`; `src/main/overview/__tests__/activity.test.ts` (new); `src/main/overview/__tests__/activity-map.test.ts` (new); `src/main/overview/__tests__/store-activity.test.ts` (new); `src/main/overview/__tests__/ipc.test.ts` (six to seven); `src/main/overview/__tests__/service.test.ts` (row C REPLACED, §3.4); `build/conformance-overview.mjs`; `build/overview-conformance-probe.mts` | nothing |
| **B. Main lifecycle and the menu row** | `src/main/sessions/core.ts` (`listRemovedSessions`; `endRefusal` first in `killSessionAdmitted`; `removeRefusal` on `removeSession`'s local path); `src/main/sessions/lifecycle-gate.ts` (new); `src/main/harness/durability.ts` (the one condition at `:42`); `src/main/sessions/__tests__/p293-lifecycle-gate.test.ts` (new); `src/main/sessions/__tests__/p293-removed-remote-row.test.ts` (new, the real prototype over a real on-disk store, the shape of `session-history-core.test.ts`); `src/main/menu.ts`; `src/main/__tests__/view-menu.test.ts` | A's `'manage-sessions'` |
| **C. Renderer state** | `src/renderer/state/resume.ts`; `src/renderer/state/sessions-slice.ts`; `src/renderer/state/session-manager-slice.ts` (new); `src/renderer/state/app-state.ts`; `src/renderer/state/store.ts`; `src/renderer/state/__tests__/p293-session-gates.test.ts` (new); `src/renderer/state/__tests__/p293-lifecycle-now.test.ts` (new); `src/renderer/state/__tests__/p293-session-manager-slice.test.ts` (new); `src/renderer/state/__tests__/past-sessions-store.test.ts` (rewritten to the new `restorePastSession` and `refreshPastSessions`); `src/renderer/app/__tests__/resume.test.ts` (ONLY the `pastRestoreNeedsAsk` block, which becomes `restoreNeedsOpenAsk`) | A's shared types and the bridge method name |
| **D. The sheet** | `src/renderer/session-manager/projection.ts`; `view.ts`; `format.ts`; `copy.ts`; `use-sheet-refresh.ts`; `SessionManagerSheet.tsx`; `ManagedGrid.tsx`; `PastList.tsx`; `session-manager.css`; `lazy.tsx`; `open.ts`; `escape.ts`; `src/renderer/session-manager/__tests__/p293-projection.test.ts`; `p293-view.test.ts`; `p293-format.test.ts`; `p293-copy.test.ts`; `p293-sheet-refresh.test.ts`; `p293-open.test.ts`; `p293-sheet-render.test.tsx`; `p293-css-tokens.test.ts` (reads EVERY `.css` under the directory, E's included) | C's slice and gates, E's `actions.ts`, `InlinePanel` and `BatchPanel` signatures above |
| **E. Inline actions, the host, batch End** | `src/renderer/app/session-actions.tsx`; `src/renderer/app/session-focus.ts` (the one extraction); `src/renderer/app/SavedOutputBody.tsx` (new); `src/renderer/app/SavedOutputModal.tsx`; `src/renderer/app/__tests__/saved-output.test.tsx` (one case added); `src/renderer/app/__tests__/p293-menu-characterisation.test.ts` (new, written and run BEFORE the rewrite); `src/renderer/app/__tests__/p293-menu-host.test.ts` (new); `src/renderer/session-manager/actions.ts`; `batch-end.ts`; `InlinePanel.tsx`; `BatchPanel.tsx`; `session-manager-panels.css`; `src/renderer/session-manager/__tests__/p293-batch-end.test.ts`; `p293-actions.test.ts`; `p293-panels.test.tsx` | C's verbs and slice, D's `ManageRow`, `view.ts`, `copy.ts` exports, `closeSessionManager` and `focusChain` |
| **F. Doors, the layer, the old modal, the documents** | `src/renderer/app/menu-actions.ts`; `src/renderer/app/shell-actions.ts`; `src/renderer/app/keyboard.ts`; `src/renderer/app/App.tsx`; `src/renderer/app/lazy-modals.tsx`; `src/renderer/app/modals.ts`; DELETE `src/renderer/app/PastSessionsModal.tsx` and `src/renderer/app/past-sessions.css`; `src/renderer/app/__tests__/past-sessions.test.ts` (keeps the `pastSessionPromise` block only); `src/renderer/app/__tests__/p127-menu-actions.test.ts`; `src/renderer/app/__tests__/p127-keyboard.test.ts`; `src/renderer/app/__tests__/p165-lazy-doors.test.ts`; `src/renderer/app/__tests__/machine-vocabulary.test.ts` (add `src/renderer/session-manager/copy.ts`, `SessionManagerSheet.tsx`, `ManagedGrid.tsx`, `PastList.tsx`, `InlinePanel.tsx`, `BatchPanel.tsx`; `resume.ts` stays off the list for the reason the list gives for `sessions-slice.ts`, and its sentences are checked by review); `src/renderer/app/__tests__/p293-doors.test.ts` (new); `docs/BACKLOG.md` (the Phase 293 ENTRY in place only, NEVER the running log); `docs/DESIGN-SPEC.md` (APPEND `## S15 — Session manager (Session → Manage Sessions…) — Phase 293`, geometry and the token map of §2.2, no build story); `DESIGN.md` (§6 gains items 16 to 20, the five states of §2.12, copy byte for byte); `CHANGELOG.md` (a new `## Unreleased`: under `### Added` ONE unwrapped line for the sheet, under `### Fixed` ONE for Catch Me Up on a project on another machine, the operator's style; the committer ends each with the commit link) | C's `sessionSheet`, D's `open.ts`, `escape.ts` and `lazy.tsx` names |
| **G. The gate, the ablations, the probe** | `build/p293/conformance-manager.mjs`; `build/p293/manager-conformance-probe.mts`; `build/p293/ablation.mjs`; `build/p293/probe-p293.mjs`; `src/renderer/app/p293-session-manager-drive.ts` (new); `src/renderer/app/probe-registry.ts` (one import and one `register` call); `package.json` (three scripts); `build/verification-checks.mjs` (`pure('conformance:manager')`, `pure('ablation:p293')`, **`remote('probe:p293')`**, each with its header comment); `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 143 to 144) | every name above |

**`CLAUDE.md` is in NO builder's list.** A builder is a subagent, and no agent message authorises
an edit to it; the first pass gave it to F, who would have refused or stalled. F RETURNS the one
row for the path-triggered gates table as TEXT in its report (`conformance:manager`: what it
touches, its cost, what it proves, one line). The main session applies it at the commit under the
operator's standing rule that a new path-triggered gate gets a row, or leaves it for him.

**The running log in `docs/BACKLOG.md` is the COMMITTER's**: one line at the very end when the
phase lands, with the date, the hash and the version. F never touches the log.

**`probe:p293` is `remote(...)`, not `electron(...)`.** It holds the loopback sshd, and every
script that does is classed `remote` with `NEEDS.loopback`
(`build/verification-checks.mjs:226`, `:500-526`). `gate:checks` does not validate the class, so
the wrong one would have passed.

**Order.** A, B, C, D, E, F and G start together. E's FIRST act is the characterisation test over
the untouched policy. G's probe and ablations need the others' files to RUN, so G writes against
the names here and runs last. Nobody edits `build/p293/SPEC.md`.

**The backlog corrections F makes in place**, because the entry is what the next round reads:
`restorePastSession` is declared at `sessions-slice.ts:293` and implemented at `:1308`; the restore
ask is drawn inline and the native ask is not called (R1); the skip reasons are already ended,
unreachable, and no longer here, because no row without an id can enter the sheet; "never core's
`discardSession`" is true of every NEW path, and Restart, which the policy already offers, reaches
it for the old row after the replacement exists; and a line pointing at `build/p293/SPEC.md` §9.

### The integrator's seams

1. `docs/audits/contract-baseline.txt`: `node build/contract-inventory.mjs --out
   docs/audits/contract-baseline.txt`. EXACTLY these move: `[ipc.invoke.channels] count=234`
   (`:5`) becomes `235`, and one line `overview:activity` is inserted between `:162
   notice:pending` and `:163 overview:project`. Any other moved line is a defect. The commit body
   names both. `P293_*` env names move nothing: the sweep matches `\bGMUX_[A-Z0-9_]+\b` only
   (`build/contract-inventory.mjs:307`), and the probe arms through the existing `GMUX_PROBES`.
2. `src/renderer/state/store.ts` and `app-state.ts` compose `createSessionManagerSlice` and
   `SessionManagerSlice`; `useApp.getState().sessionSheet === null` on a fresh store; confirm
   nothing still names `pastOpen` or `setPastOpen`:
   `grep -rn "pastOpen\|setPastOpen\|PastSessionsModal" src build` answers only comments.
3. D's components call E's `actions.ts` and render `InlinePanel` and `BatchPanel`; E's `actions.ts`
   reads D's `ManageRow`, `view.ts` and `copy.ts`. Reconcile the signatures against §6's table,
   not against either builder's guess.
4. `manageMenuItems` with and without the host: run E's parity test over D's real projection, and
   E's characterisation test one more time over the integrated tree.
5. The `past-restore` class is on the Past tab's Restore button
   (`shell-path-shot-drive.ts:170`).
6. `App.tsx` mounts `<SessionManagerSheetLazy />` outside the no-projects branch.
7. After parallel work: scan for duplicated 10+ line blocks, the restore gate, the open-refusal
   mapping and the two layer predicates (`modalLayerOpen`, `otherLayerOpen`) first.
8. `HELPER_USER_FLOOR` reads 144 and `probe:p293` reaches `build/electron-run.mjs` through
   `withElectron`, and ssh only through `build/scratch-machine.mjs` and `build/ssh-run.mjs`.
9. F's returned `CLAUDE.md` row is handed to the main session with the commit.
10. The full battery of §7.

---

## §7 The proof each builder owes, and the gates

**A behaviour that changes is red before and green after**, and the builder's report names the
test and shows both runs. **Every rule the sheet enforces has an ablation** that turns its own rule
red.

| Builder | Tests, each named for what it holds |
| --- | --- |
| A | `toActivity`: every row of §3.4's table, ROW 0 included (`stored` undefined is `unavailable / unreadable`, never pending); BOTH invariants, the second over every complete and partial row (`userMessages` is a number); NULL from the LEFT JOIN is 0 only under `ok`, for gemini's `userMessages` too; codex `SUM(queued)` is 4 over 3 turns; antigravity's last author is `you`; **a last turn WITH an answer and NO answer clock is clock `ask` with the ask's time, for ANY provider name**, RED against the first-pass rule; deepseek's clock is `session`; nothing parses is null with `lastMessageBy` kept; gemini with zero answers is null and partial. `listActivity(ids)` over a scratch store built by the PRODUCT reader from the committed fixtures, against the truth table, cursor's row included; an id the store does not hold answers no row; **`EXPLAIN QUERY PLAN` names the primary key on `turn` and holds no `SCAN turn`**. `sessionActivity`: the asked order is the answered order; over the cap is `INVALID_INPUT`; a `discarded` id is answered while `projectOverview` still skips it; a `resolveSessionLog` that THROWS for one row leaves the others answered and that row at row 0; two concurrent calls never overlap a read (a counting fake). The remote guard: a record with `machineId: 'm1'` and NO `machine` never reaches `resolveSessionLog`, RED at the parent, with row C of `service.test.ts:298` REPLACED. Both "six channels" pins read seven. `conformance:overview` gains the activity matrix beside EXPECT, with rows for a shell, a `no-file` row, `ok` with zero turns and cursor, and its rule 7 still finds no banned word, comments included |
| B | `endRefusal`: `discarded` refuses with the sentence, every other status and `undefined` pass. The kill over a real store: a tombstoned row keeps `status: 'discarded'` and its `removed_at`, RED at the parent where it reads `exited`. `removeRefusal`: a local `running`, `idle`, `needs_input` and `unknown` each refuse with their sentence; `exited` and `restorable` pass; every status passes for `machineId: 'm1'`. Remove over a real store: a live local row is NOT tombstoned and keeps its status, RED at the parent. `listRemovedSessions`: a removed record with `machineId: 'm1'` and no tombstone carries `machine.id === 'm1'` and the re-homed `projectPath`, RED at the parent; a machine-removed row carries `machineGone` and no `machine`; a local row carries neither; the order is unchanged. The menu row's mark |
| C | `sessionActionGates` over every status, local and remote, with and without material, a handback, `canDiscard` and `shellPathReady`: `showsRemove` without `canRemove` when `!canDiscard`; `offersRestore` without `canRestoreNow` when `!shellPathReady`; every acting field false for `unknown` and for `discarded`. `endSession` still sets the byte-identical confirm (`end-remote-copy.test.ts` UNTOUCHED and green). `endSessionNow`, `removeSessionNow`, `renameSessionNow`, `restartSessionNow`: `ok`, a rejection's `errorText`, `LIFECYCLE_BRIDGE_MISSING` with no bridge, and NO confirm and NO toast in any of them. `refreshSessions` applies and answers, and answers null on a throw. `restoreSessionNow` and `restorePastSession`: no `setActiveSession`, no `setActiveProject`, a failure refetches the removed list. **The landing guard, RED at the parent:** restoring a session of project B while A is active leaves `activeSessionByProject[A]` alone. `restoreNeedsOpenAsk`: a remote tab with the same path does NOT suppress a local row's ask, RED at the parent's `pastRestoreNeedsAsk`. **The slice, one test per row of §6's verb table**: `sessionSheet` is strictly `null` at rest; `setSessionSheetTab` refused while running, and closing a `confirm` batch otherwise; ANY write to `checked` closes a `confirm` batch; `setSessionSheetInline` refused over a busy inline; `markSessionSheetInlineBusy` false on the second press; `settleSessionSheetInline` writes nothing for another id, for a non-busy panel, or with the sheet closed; `beginSessionSheetBatchRun` null on the second call and its `runId` never repeats across a close and reopen; a stale `runId` report is dropped; `patchSessionSheet`'s type cannot carry `inline` (a `// @ts-expect-error` line); `loadSessionActivity` settles every id of a rejected chunk |
| D | The projection: two folders with one basename on two machines are TWO groups; one folder spelled the same on this Mac and on a machine are two groups; a closed tab filters nothing out; a machine-removed past row keys under `!gone:`; an empty `id` draws no checkbox and no button and is never in `visibleIds`; labels fall through the three sources; nothing in the file calls `toLowerCase`, `normalize` or `localeCompare` on a path, and the domain imports nothing from diagnostics (source-text pins). The view: the four filters AND together; `Running` is three statuses; sort is inside groups and null is LAST both ways, a `createdAt` of 0 included; `visibleIds` under the `Running` filter is exactly the live rows. The formats: `48s`, `5h 14m`, `2d 1h`, `Today`, `Yesterday`, a year boundary, and **`createdAt` 0 draws `—` with no small**. The copy: every sentence of §2 byte for byte, the plural rules including `1 session ended.`; both cell tables of §3.4 row by row, the clocks `ask` and `session` and the `agentMessages: null` row included; **`copy.ts` holds no `?? 0`**; no output ever contains the text `null`. `useSheetRefresh`, with fake timers: the 1,500 ms and 250 ms debounces, the first-seen id, the 30 s re-ask of `running` ids only and only while visible, the prune on a filter change AND on a push that hides a checked row, a project key whose group is gone resets to `all`, every timer cleared on unmount. `open.ts`: `otherLayerOpen` names every `modalLayerOpen` field but the sheet's; `reclaimSessionSheetFocus` false inside the sheet and under a palette. The render, server side: both toolbar modes carry the one 47px class; no `data-session-id` anywhere; the counts ignore filters; both tabs `tabIndex={0}` and never `disabled`; checkboxes are controlled by id. The CSS: no colour literal (`#`, `rgb(`, `hsl(`, a named colour other than `transparent` and `currentColor`) and no `--text-muted` inside a rule whose ground is `--bg-raised` or `--bg-active` |
| E | **The characterisation test, green over the UNTOUCHED policy first, then unchanged after the rewrite**, its one named difference being the `discarded` arm. **The parity rule:** for every status, local and remote, `sessionMenuItems(s, t, host)` equals `sessionMenuItems(s, t)` in everything but `run`. A `discarded` row offers no `Rename` and no `End session…`, RED at the parent. **§4.0, per verb:** a host method handed the id of a row that has CHANGED since the menu was built (`exited` then `running` for Restart and for Remove; `running` then `exited` for End) calls no slice verb and toasts `SESSION_CHANGED`; the same for every inline Confirm; **Retry re-enters the gate** and a Retry over a changed row calls nothing; no function but `freshRow` reads `.session` off a row. A double Confirm calls the verb once. A continuation whose panel was replaced, or whose sheet closed, writes NO panel and raises the failure toast. `Resume conversation`, `Show what it loaded…` and the review row run only after `jumpToSession` answers ok; a refused jump runs nothing and leaves the sheet open. `runBatchEnd`, every arm of §4.9: `list()` is called once per target BEFORE its `end`; a target absent from the fresh list is `gone` and `end` is never called for it; one that reads `unknown` is `unreachable`; one on a machine `machineKnown` denies is `unreachable` and `end` is never called; one that ended by itself is `ended`; a rejected `end` is `failed` and the NEXT target still runs; a null `list` is `failed` and `end` is not called; `stopRequested` mid-run marks the rest `not-run`; no dependency ever receives a name. **The freeze:** an id NOT named at open that is eligible at the press is not a target; a named id that is no longer eligible is not a target; a checked id the filters hide is not named; a second `confirmBatch()` starts nothing. **`stopRequested` under a NEW batch:** an old loop whose sheet was closed and reopened with a fresh batch ends no further target. The restore flow: a closed local target asks, a remote one never does, a refused open attempts NO restore, a failure keeps the row, offers Retry and re-activates the project that was active, a success toasts with the action and does not close the sheet. `SavedOutputModal` answers null while the sheet is open |
| F | The doors: both arms open the right tab with `projects: []`; a second press switches the tab; **a `ConfirmDialog`, the ⌘J overlay or a palette over the sheet refuses the door**; a boot block refuses. `modalLayerOpen()` is true while the sheet is open. The Escape rung sits above `s.overview` and `s.sessionFocus` (a source-order pin) and ignores a repeat. **F2, the KEYDOWN path, with an active session present and focus on a sheet row: `renamingSessionId` stays null and the sheet's rename opens**, RED at the parent shape; the same for the `rename-session` arm. With the sheet open, `end-session`, `resume-conversation`, `new-session` and ⌘T, `attention` and ⌘J, `shortcuts` and ⌘/, and `toggle-session-focus` each change nothing in the store; ⇧⌘U and `show-overview` do nothing. The Tab rung moves focus into the sheet from `body`. The `focus-session:` door closes the sheet only on `ok` |
| G | `conformance:manager`: one plain node through `tsxCli()`, no Electron, no tmux, no ssh, no agent, reads nothing under his home. It drives the SHIPPING pure modules (`resume.ts`'s gates, `projection.ts`, `view.ts`, `batch-end.ts`, `format.ts`, `copy.ts`, `activity-map.ts`) and reads source as text for: no DOM menu in the domain (`role="menu"`, `popover`), `setMenu(` as the only menu call, no `setConfirm(` in the domain, no `data-session-id`, no `discardSession` and no `sessions:discard` spelling outside the slice, `kill(` reached only through `endSessionNow`, `restartSessionNow(` and `removeSessionNow(` named only inside `actions.ts` and only below a `freshRow(` call in the same function, `batch-end.ts` naming none of `restart`, `remove`, `discard`, `restore`, no function but `freshRow` reading `.session` off a row, no tmux vocabulary in `copy.ts`, no `?? 0` in `copy.ts`, and no `.name` or `tmuxName` passed to any lifecycle call. `ablation:p293` works on a CLONE under `/private/tmp/p293-ablation-<pid>` removed in a `finally`, the shape of `build/p276/ablation.mjs`, and never writes into the worktree. The list is below |

**The ablations, each red on the rule that owns it.**

| # | Break | Owner rule |
| --- | --- | --- |
| 1 | drop the pre-call `list()` | §4.9 step 3 |
| 2 | find the target by name | step 4 |
| 3 | call `end` for an absent id | step 4 |
| 4 | stop on the first failure | step 6 |
| 5 | ignore `stopRequested` | step 3 |
| 6 | **skip the press-time re-check**: `targets = named` | step 1 |
| 7 | **admit an id that was not named at open**: `targets = checked ∩ eligible at the press` | step 1. The first pass REQUIRED this shape to be green; it is the defect |
| 8 | keep a checked id the filters hide: drop `∩ visibleIds` at naming and at the press | §2.10's invariant |
| 9 | `stopRequested()` without the `runId` comparison | step 8 |
| 10 | let a target on a machine `machineStates` does not hold be eligible | §2.10's table |
| 11 | let an `unknown` row pass `canEnd` | §4.1 |
| 12 | let a `discarded` row pass `canEnd` | §4.1 |
| 13 | a host method acts on the session its closure was built with | §4.0 |
| 14 | Retry calls the `*Now` verb without the gate | §4.0 step 5 |
| 15 | a continuation writes `failed` without `inline.id === id && busy` | §4.3 |
| 16 | make Remove's PRESENCE depend on `canRemove` | §4.1, caught by the characterisation test |
| 17 | add an item under the host | the parity rule |
| 18 | group by basename | §3.2 |
| 19 | drop the machine from the group key | §3.2 |
| 20 | sort null first | §2.5 |
| 21 | select-all over unfiltered rows | §2.10 |
| 22 | an indeterminate select-all click selects everything | §2.10 |
| 23 | map a null count to 0 (`?? 0` on `userMessages` or `agentMessages`) | §3.4 |
| 24 | draw clock `ask` as clock `message` | §3.4 |
| 25 | draw `createdAt` 0 through `dayLabel` | §2.5 |
| 26 | draw the state filter's `Running` as `running` alone | §2.4 |

**The sixteen things adversary 1 found correct, each pinned so a later round cannot undo it.**

| # | What holds | Pinned by |
| --- | --- | --- |
| 1 | initial focus goes to the close or cancel icon, never to `.btn-destructive` | E, `p293-panels.test.tsx` |
| 2 | the sheet uses `trapTabKey`, never `modalKeyDown` | D, a source-text pin in `p293-sheet-render.test.tsx` |
| 3 | no `data-session-id` anywhere in the sheet | D's render test and G's gate |
| 4 | the batch loop: one fresh `list()` per target, lookup by id, sequential, skip and record, no name to any dependency, a closed sheet reads stop | E, `p293-batch-end.test.ts` |
| 5 | `endRefusal` runs first in `killSessionAdmitted` | B, red at the parent |
| 6 | the `discarded` arm in `sessionMenuItems` | E, red at the parent |
| 7 | the Escape rung sits above `s.overview` and `s.sessionFocus`; the door is refused over the page and under a boot block; ⇧⌘U is blocked | F |
| 8 | the landing guard; `restoreSessionNow` and `restorePastSession` never land and never close the sheet | C, red at the parent |
| 9 | F1's stamp, `restoreNeedsOpenAsk` by target, a refused open attempts no restore | B, C, E |
| 10 | the rename panel is a plain `.input`, never `RenameInput` | E, a source-text pin |
| 11 | `SavedOutputModal` answers null while the sheet is open | E |
| 12 | Go to session closes the sheet only on `ok` | E |
| 13 | the sheet's only inputs are `sessions` and `pastSessions`; the domain imports nothing from diagnostics | D |
| 14 | selection and the project filter keyed by id and group key; every search, filter or tab change clears the selection; checkboxes controlled by id; rows keyed by id | C and D |
| 15 | Cancel keeps the selection; after Done only failed and not-run targets stay checked | C |
| 16 | no main-side batch channel; `sessions:discard` reached only through `removeSessionNow` | G's gate |

**The gates the commit must pass**, run by the integrator:

- `npm run typecheck && npm run build && npm run smoke:t1`, then the battery: `test`, `smoke`,
  `smoke:t3`, `package`. `gate:electron`, `gate:background`, `gate:knownhosts`, `gate:checks` and
  `gate:contract` run inside the build.
- `gate:contract` with the baseline REGENERATED and the two moved lines named in the commit body.
- `conformance:overview` (~3 s): `src/main/overview/**` is touched. Its rule 7 reads comments too.
- `conformance:remoteclose` (~0.6 s): `core.ts` is touched beside its remove path.
- `conformance:facts` ONCE (~46 s): it reads the served-channel count from the baseline, and the
  new channel must be read as `IPC serves`.
- `conformance:handback`: the Session submenu moved.
- `build/assert-menu-glyphs.mjs` and `build/assert-menu-accelerators.mjs`, inside the build.
- `gate:checks`: three new scripts classified, `probe:p293` as `remote`, every new `*.test.ts`
  resolving no home through the passwd entry.
- `gate:electron`: `HELPER_USER_FLOOR` 144. `gate:background` and `gate:knownhosts`: the probe
  ends the sshd it holds in a `finally` that names it and reaches ssh only through
  `build/ssh-run.mjs`.
- `conformance:manager` and `ablation:p293`.
- `probe:p293`, once, and `probe:p284` still green.
- **`probe:p167`, ONCE (10 to 20 min).** The first pass called it not owed because "nothing about
  how a session closes moved". That premise is false: §4.5 changes where `runRestore` and
  `runRestart` land for EVERY caller, in a split included, and §4.9 puts a refusal first in
  `killSessionAdmitted` and one in `removeSession`, which that probe's cycles drive twelve times
  a block.
- NOT owed: `conformance:hue` (no listed path is touched, and D's CSS test holds rule 26's question
  for the two new stylesheets), `conformance:resume:capture` (no listed path is touched).

---

## §8 The verification plan, Tier 3

Two verifiers, independent of the builders and of each other. Each names in its verdict the thing
it did that the builders did not. One app run each. Count Electrons ONCE, at the end, with
`ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`.

### 8.1 The per-row matrix over REAL data (mandatory, it is the evidence of universality)

A scratch profile, a scratch `HOME`, its own tmux socket from `build/harness-socket.mjs --fresh`,
and ONE real second machine from `build/scratch-machine.mjs` (`scratchYard`, `scratchMachine`), the
loopback sshd `smoke:remote` uses, held by the run so it can be stopped AND STARTED AGAIN mid-run,
everything ended in a `finally`. Sessions are plain shells plus whatever agents the verifier can
start WITHOUT spending a turn. The probe's drive may hold ONE real row at `needs_input`, because a
shell can never ask (`p93-attention-drive.ts` states why), and that is the only supplied status.

**Rows:** local and remote, each with an open tab and a closed tab, in every state: working,
needs input, idle, ended with material, ended with none, restorable, unknown (the scratch sshd
stopped), a row whose machine was taken out of the machines file while its record reads `running`
(R11's row), and, on the Past tab, removed, removed on a machine that is still registered (F1's
row), and machine removed (the machine deleted in Settings).

**Columns, one line per row:** the group it drew under, against `targetKey`; the chip; the drawn
state label and dot, against `statusVisual`; the visible button, its `disabled` and its title; **the
offered actions, being the labels and `disabled` of `manageMenuItems(row)` minus its two own rows,
compared item for item with `sessionMenuItems(session, id)` for the SAME session from the SAME
store**; the refused actions of §2.7; whether a checkbox drew; `batchEligibility` for it and what a
batch then did with it, read from the MANIFEST and the far machine, not the screen; the Created,
Messages and Last message cells against §2.5 and §3.4. Any cell that differs is a finding.

### 8.2 The attack, on batch End, on the press, and on identity

| Attack | What must hold |
| --- | --- |
| **The machine that comes back.** Stop the scratch sshd. Select-all: N live local rows and M `Unreachable` remote rows. Open the confirmation, which reads `End N`. START the sshd and wait for the M rows to read live. Press | the heading never rises above N, the press ends exactly the N named ids, and the M remote sessions are still running ON THE FAR MACHINE, read there |
| **The stale menu.** Draw the ellipsis menu data for an `exited` row X (`menuItemsFor`), restore X from a second window until it reads working, then run the captured `Restart`, and separately `Remove` | nothing is called; X is still running, its manifest row is unchanged and NOT tombstoned, no replacement row exists, one `SESSION_CHANGED` toast. At the PARENT shape (the shipped `removeSession` and `restartSession` handed the stale object) measure what happens instead: that is the defect |
| **A stale Retry.** Fail a restore, fix the row from another window so its gate is false, press Retry | nothing is called |
| **The same through main**, a direct `sessions.discard` of a live local id | refused with the `lifecycle-gate.ts` sentence, the row not tombstoned, its process alive. At the parent it is tombstoned and the process runs on with no row: measure it |
| **F2.** An active session behind the sheet, focus on sheet row X, press F2, type `zz`, press Enter | X's rename panel opened and X is renamed; the ACTIVE session's name is byte identical before and after. Measure the parent shape |
| **The hidden selection.** Filter `Tab closed`, check three rows in project P, `Open project and restore` a fourth so P's tab opens | the three are unchecked on that commit, the toolbar leaves selection mode, and a batch opened by any route names none of them |
| **Two batches.** Start a batch over a slow remote End, close the sheet, reopen, start a second batch | the first loop ends no further target after the close; every outcome drawn belongs to the second run; one `batchClosedToast` |
| **The silent failure.** Confirm End on a remote row, press Escape then the close button, make the kill fail (`MACHINE_NOT_READY`) | one sticky error toast with main's sentence; the row still reads live |
| **The wandering panel.** End on X busy (a slow remote), try Details on Y | Y's panel does not open; when X fails, `failed` is under X and Retry acts on X |
| **Focus.** `Running` filter, select-all, End, all ended | `document.activeElement` is inside `.session-sheet`; Tab, Enter, Enter from there reaches NOTHING behind the scrim and no `ConfirmDialog` mounts. Repeat after any row unmounts under focus |
| **The other doors**, each with the sheet open: Resume Conversation, New Session…, ⌘T, ⇧⌘↩, ⇧⌘U, the split arrows, Next and Previous Session, an agent hotkey, New Project…, Open Remote Project…, Clone Repository…, and the Session menu's two doors with a palette open over the sheet | the store is unchanged by each, no second layer mounts, no session receives a character |
| **The doors that close the sheet first** (the fix round, W6): ⌘J, ⌘/, Session → End Session…, Project → Close Project… | the sheet is gone BEFORE the layer mounts; the layer is the one the same door opens with no sheet; nothing is stacked on the sheet at any instant |
| **The doors over a page and a sheet** (the fix round, W3): Session → Past Sessions… with the Catch Me Up page open, and with the New Session sheet open | the sheet opens over each; Escape closes the sheet and leaves the page or the create sheet as it was |
| A held Enter on `End <n> sessions`, and a double click | one run; `Stop` is not pressed by the repeat; the second click of a double click presses NOTHING, whatever has slid under the pointer (the fix round: it restored an ended row four times in four) |
| Two sessions with the SAME NAME in two projects, one selected | only the selected id ends. Read the manifest after, not the screen |
| A target ends by itself between the confirmation and its call | `Already ended`, `end` never called for it, the rest run |
| A target is Removed from a SECOND WINDOW between the confirmation and its call | `No longer here`, and the manifest row still reads `discarded` with its `removed_at`. At the PARENT commit, a direct `sessions.kill` of a tombstoned id writes `exited`: measure it there |
| The same, inside the window between the re-check and the call (a drive that removes on the `list()` return) | nothing is ended, the outcome is `Not ended.` plus the sentence of whichever gate refused first (the renderer's `endSessionNow` gate answers `This session changed. Nothing was done.` before main is asked; main's `lifecycle-gate.ts` sentence when the renderer's read was still live), the row is still in Past (the batch verifier's P4) |
| The scratch machine goes unreachable mid-batch | its remaining targets read `Unreachable` or `Not ended.` with main's sentence; local targets after it still end; nothing on that machine is marked ended that was not ended |
| R11's row (a record on a machine no longer in the machines file, recorded `running`) checked with live rows | the confirmation does not name it, it is counted `unreachable`, and its manifest status is unchanged after the batch |
| A session restarted between the confirmation and its call (the old id is hard deleted) | `No longer here`; the replacement, which the person never selected, is untouched |
| A process with no session id | the diagnostics report lists rows with `sessionId: null` (`src/shared/ipc/diagnostics.ts:123`); none appears in the sheet, none can be checked, and `runBatchEnd` given an empty id refuses it |
| A project whose folder is gone | End still works by id. Restore says so on the FIRST press, with no ask promising a shell in it: the `failed` panel reads `noFolderThere(<path>)` then `The saved session is still here.`, with Retry, and keeps its row (corrected from `The folder for "<name>" no longer exists.`, which §4.5 never wrote; the press verifier's P6). Go to session raises `folderGone` and the sheet stays open |
| The sheet is closed mid-batch | the call in flight finishes, no later target ends, one sticky toast says how many, and reopening shows the truth |
| 300 sessions | the sheet opens, a sort click and a filter change each settle inside the budget the verifier measured (§1: two to four frames under load, 12 to 26 ms of work), scroll holds its place across a push, and select-all checks 300 |
| The keyboard | Tab wraps both ways on both tabs; Escape peels one layer at a time in §2.13's order and does nothing over a busy panel; after close a typed string arrives where the keyboard was. Report R16's case as MEASURED, not as a finding: end your own session, close, and say where the next character lands |
| Attack the ruling that the projection groups by target | a symlinked spelling, a case-different spelling on a case-insensitive volume, and an NFC against NFD name. The projection compares STORED strings only, so each stays whatever main stored; the finding would be a merge or a split main did not make |

### 8.3 The aggregate, re-derived independently

Over the Phase 137 corpus, the 35 real sessions across twelve providers, READ ONLY: the verifier
writes its OWN counter from the provider logs, by a different method than the store's SQL (count
kept asks and closing answers from the reader's output, or by hand for small files), and compares
per session: user count, agent count, last-message time, author AND CLOCK, and coverage. It must
include:

- a codex goal-loop session, REPORTING the under-count as the stated limit and the number of
  dropped turns the reader counted (`droppedByReason`), which is what R3 and R12's one column
  would keep;
- a cursor session, whose Last message must read clock `ask` wherever the last turn holds a
  reply, with the prompt's time and the explaining title, and never `Agent reply` over a bare age;
- a deepseek session: clock `session`, small `Session updated`;
- a gemini session: `<u>+` and `Replies not recorded`, and the text `null` nowhere on the sheet;
- **a claude session whose record file changed** (a `/clear`, or a resume that minted a new id):
  the count restarted, coverage complete, reported as §1's stated limit;
- a shell, a session with no record on disk, a droid row, a session on another machine, and a
  feed-only remote row whose `createdAt` is 0 (Created reads `—`);
- a row whose refresh THROWS (a record path made unreadable): the cell settles to `—` /
  `Not recorded` and never stays `…`.

A shell reads not applicable and never zero. It also times `overview:activity` cold and warm over
the corpus, reads the main-thread stall between rows, and times `listActivity` for 100 ids over a
store holding at least 300 sessions of 50 turns, reporting the plan line with it.

### 8.4 `probe:p293`, one Electron through `build/electron-run.mjs`

`npm run build && node build/harness-socket.mjs --fresh gmux-p293 'node
build/p293/probe-p293.mjs'`. One scratch profile, a scratch `HOME`, its own socket, three scratch
git projects and the scratch machine, all ended and unlinked in a `finally`. It spawns no agent and
spends no token. Env names are `P293_*`, never `GMUX_*`, so `[env.names]` does not move. It drives
real pointer and key events over the DevTools protocol and reads the DOM contract of §2.14; the
drive `window.__p293` supplies only what a probe cannot do for real: `open(tab)` through the SAME
`runMenuAction` the menu event reaches, `menuItemsFor(id)` and `policyItemsFor(id)` as labels and
`disabled` (a native menu cannot be photographed or clicked from a probe), `runMenuItem(id,
label)`, which runs the CAPTURED item so a stale pick can be driven, and the one `needs_input`
hold.

Arms, in one session: **(1)** both doors with NO project open; **(2)** a closed-tab project's
sessions visible under `Tab closed`; **(3)** End, Cancel once, then Confirm, the row ended and
still there; **(4)** Remove to Past, the counts moved; **(5)** Restore into a closed project, the
inline ask, the tab opened, the sheet still open, the row Managed; **(6)** a restore failure (the
folder renamed away) keeping its row, then Retry succeeding after it is renamed back; **(7)**
select-all under the `Running` filter, then a second click clearing; **(8)** the batch
confirmation's eligible and skipped counts against the fixture's own truth; **(9)** a batch in
which one target is killed by the probe between the confirmation and its call; **(10)** the matrix
of §8.1 for the rows it can stand up; **(11)** both toolbar modes measured at 47px and the title
bar at 52px — which Phase 298 keeps as its CONTROL and widens around: the box and the pitch of every
row surface read SEPARATELY, the hit areas each at or above the parent's reading, the rows a 900px
sheet holds counted over twenty one rows it stands up itself, `--sm-name-min` and `--sm-actions-min`
measured against what the stylesheet declares, the hover, checked, open, focus and transition states
computed against the tokens' own resolved values and again under an emulated
`prefers-reduced-motion`, every icon size, the clipping attack at three widths, and every text
node's contrast through the app's own `contrastOf` on both colour bases, with
`P293_PARENT_CHECKOUT` pointing the same run at `f6c11f57` for the parent reading;
**(12)** Go to session on a live session in a closed project, local and remote, the
keyboard in that session's terminal after; **(13)** F2 on a sheet row with an active session
behind it, the active session's name unchanged; **(14)** after arm 9's batch under the `Running`
filter, `document.activeElement` inside the sheet; **(15)** the machine that comes back, §8.2's
first attack, when the sshd restart is stable in the harness, and otherwise the verifier's alone.
The fix round adds four: **(L)** Restore from Past into a project that is open and not active:
the sheet closes, that project and the session are selected, and the keyboard is in its terminal;
**(O)** Past Sessions… over the Catch Me Up page, and Escape closing the sheet alone; **(J)** ⌘J
closing the sheet first; **(D)** a double click at the centre of `End 2 sessions` whose panel
closes itself and slides an ended row's Restore under the pointer, restoring nothing. Arms 5 and 6
now hold the landing (W1) and the first-press folder sentence (W7). Arm R's session sits in an OPEN
tab, because creating a session on a machine opens one, so the remote half of arm 12 is not
driven here (the matrix verifier's P3).
It writes readings and photographs under `out/p293/`. `P293_PARENT_CHECKOUT` is not needed: there
is no parent surface to compare.

---

## §9 The operator's rulings, each with the default the build uses, and the refusals

**Open questions. None blocks the build.**

| # | Question | Default built |
| --- | --- | --- |
| R1 | Restoring into a closed project asks INLINE, as the study draws and its `verification.md` records, and the native ask (`src/main/restore/ask-open-project.ts`, whose header says dialogs are native and main stats the folder) is no longer called. `sessions:askRestoreProject` stays registered and unused until he rules | Inline. Main's folder check is kept in effect: the tab open and the restore preflight both refuse a missing folder |
| R2 | The sheet's corner: the study draws 14px; `frame-geometry.css` gives `--r-frame` exactly one user and reserves `--r-lg` for modals | `--r-lg`, 10px |
| R3 | "Agent messages" are closing replies on record, at most one per turn. Counting every agent text record needs a `turn.answer_count` column, a migration step `ensureOverviewSchema` does not have, and a full re-read of every log, and research 63 rules that count is narration. ONE integer column on `session` for the turns the fold dropped would fix R12 too, at the same migration cost | No schema change |
| R4 | The word for a session Tortie cannot reach: the shipped `unreachable` or the study's `Unavailable` | The shipped word, everywhere on the sheet. `Unavailable` stays only as the Messages small for a history that is not on this Mac |
| R5 | The End, Remove and batch confirmations say the SHIPPED truths (Phases 26.3, 84, 89), not the study's promises | Shipped, byte for byte for End and Remove; the batch body composed from the same truths (§2.10) |
| R6 | The study's footer key and its `All machines` label are not on the resting face, under "just enough words"; the heading hover titles and the Details help line carry the same content | Dropped |
| R7 | Restart keeps its shipped behaviour: label `Restart`, no confirmation. The study draws `Restart fresh…` with one. Restart is also the one verb on the sheet that ends in a hard delete of the old row (§4.6) | Shipped, behind §4.0's re-check |
| R8 | The old Past Sessions modal is deleted, not kept beside the sheet | Deleted |
| R9 | No accelerator for Manage Sessions… | None |
| R10 | Closing the sheet mid-batch STOPS the batch after the call in flight. The alternative is to refuse the close, as the create sheet refuses Escape during a remote copy | Stop |
| R11 | **A LIFECYCLE RULING.** A record on a machine that is no longer in the machines file draws its RECORDED status (`remote-sessions.ts:1245`). Ending it sends nothing to anybody and writes `exited` (`core.ts:2797-2841`); the shipped confirm says `This stops what is running in it on <machine>`, which is false for that row; and that End is today the only way a person can clear the row. Should main refuse it, should the row draw `Unreachable`, or should it stay | A BATCH never names or counts such a row. The single, confirmed End keeps its shipped behaviour on every surface. Main refuses a removed row and a live local Remove, and nothing else |
| R12 | A codex goal-loop session under-reports replies and last-message time. The reader counts the dropped turns on every read; the store has no column for the number (R3) | Shipped as a stated limit |
| R13 | "Last confirmed alive" is not drawn, because `lastSeen` does not reach the renderer and adding it is a second contract change | Not drawn |
| R14 | A `0` cannot tell a new conversation from a keep map that stopped matching after a vendor format change. Carrying the record's size out of the refresh and drawing a dash above some size would need a threshold nobody has measured | Stated limit. `conformance:overview` is the gate for that failure |
| R15 | The sheet re-asks the activity of `running` rows every 30 s while it is open and visible, because an agent's reply time moves with no status change | 30 s. Each re-ask is a watermark read, about 6 microseconds for an unchanged session (research 63 §18) |
| R16 | After a person ends their own session from the sheet and closes it, `focusTerminal()` gives the keyboard to the first LIVE terminal in document order, which may be another agent's prompt. Phase 289 measured this and left it to him | Inherited, measured by the verifier, not changed |

**Rulings given.**

- **Operator's ruling, 2026-09-19: the Past tab is one list in removal order, grouped only when
  filtered to one project; option A.** Newest removal first, exactly as today's Past Sessions draws
  it, with each row carrying its project, and its machine when it is not this Mac, in its small
  line. The order is main's, copied and never re-derived. Built as §2.11 and §12 describe.

**Findings for the orchestrator to queue, not built here:**

- `split/SplitSurface.tsx:194-197`'s Restore gate has drifted from the policy (no
  `machine.canRestore` arm), and it and `TerminalRegion.tsx:585-590` should read
  `sessionActionGates`.
- **The shipped `removeSession` and `restartSession` re-check nothing at their confirm** on the
  dock, the strip, the split and ⌘J. The sheet's §4.0 closes it for the sheet, and main's
  `removeRefusal` closes the worst half for every surface. A stale Restart from another surface
  can still kill a live session.
- **The `end-session` menu arm (`menu-actions.ts:138-144`) offers End on an `unknown` active
  session**, which the policy refuses everywhere else.
- ⇧⌘U is not refused under any OTHER modal layer.
- A kill of a `restorable` row demotes it to `exited` and can withdraw Restore (§4.9).
- The comment on `sessions:discard` at `src/shared/ipc/app.ts:45-48` still says "manifest delete".
- If R1 stands, `sessions:askRestoreProject` and its main module come out in a later round with
  the baseline moved.
- **From the verification (the fix round), each outside this phase's charter and none worse than
  today:** main's remote re-home re-adds a remote project a person closed, so a refresh that re-reads
  `projects.list()`, the sheet's included, brings the tab back (the matrix verifier's P2); ~~the codex
  keep map's `AgentMessage` branch asks for part type `text` and every real record since 0.149
  writes `Text`, so those replies are never read, in Catch Me Up too~~ (C1: **FIXED in Phase 299** —
  the slot accepts both spellings with `or`, codex's map version went to 2 so every stored codex
  read retires, and the committed codex fixture gained a `Text` part on a turn closing with no
  `last_agent_message`, which moved `conformance:overview`'s codex row from 3 answers to 4);
  weakly bound codex rows can draw another folder's conversation (C2: **STILL OPEN — built in Phase
  299 and removed before it landed, now Phase 300's.** The comparison was sound but ran AFTER the
  read, discarding a full synchronous read on every ask for ever; a stored watermark makes the next
  read a tail read that never reaches a codex record's folder, which reinstates the defect; and a
  record's folder is a property of the PASS, not the record, so a tail after a resume can answer a
  different folder from byte 0. 300 owns the read path and takes the comparison with it — **and 300
  landed without it**, so it is still a note and still open); ~~an argument-less slash command is
  not counted as the person's message~~ (C3: **FIXED in Phase 299** — the rule moved out of
  `reader/expr.ts` into the keep map as `bareCommand`, claude's version went to 2, `dropCommands`
  still wins, and `claude-bare-command.jsonl` is the fixture that can fail); one large record's
  first read holds main (C4: **STILL OPEN after Phase 300, and not by a worker or slices.** 300 built
  a counts read that skipped the path index, found it 15 to 47 percent SLOWER on Electron's own
  engine although faster under node 22, and took it out; the flag that skipped the index alone
  bought a quarter off the first read and cost a full re-read on every Catch Me Up and automatic
  fold while the sheet watched a talking session, and the operator dropped it on 2026-09-21. The
  measured direction is the scanner not copying a line it is about to reject, 1122 ms on 960 MiB
  with no block, queued as a build); ~~a claude row with no record scans `~/.claude/projects` on
  every ask~~ (C5: **FIXED in Phase 300 for the repeat ask** — the fallback's negative answer is
  remembered per home, provider and id for 30 s, bounded at 512 keys, handed in on `ResolveEnv`,
  never the direct stat and never another provider; the first ask in a window still scans).
- **The wording of `No messages yet` for a record that holds agent text but no kept ask** (C3), and
  `0+` beside it for a gemini record with no kept ask (C6), are copy the operator rules on.

**The refusals, restated. They are what stop a later round widening the work.**

- **No second action policy.** Every gate is `sessionMenuItems()`'s and the existing lifecycle
  methods'. One gates predicate, read by the policy itself. The host changes `run` and nothing else.
  The batch is NARROWER than the policy in one named case and never wider.
- **Nothing acts on a stale row.** An id, a fresh read, the verb's own gate, at every press.
- **A batch never ends a session it did not name.** The named list shrinks and never grows.
- **No permanent delete by any NEW path. No batch Remove. No batch Restore.** Restart, which the
  policy already offers, is the one verb that reaches `core.discardSession`, for the old row after
  the replacement exists, and it is never in a batch. D draws batch End only.
- **No policy that ends or suspends a session by itself**, on a timer or when a project closes.
- **No memory or CPU meters on the sheet.**
- **Unknown state never gains a destructive action.** A process with no stable session identity is
  never a target. Every call is by session ID and never by name.
- **No DOM-drawn menu. No modal above the sheet, and no door that opens one under it. No colour
  literal. No new token. No tmux vocabulary. No new localStorage key. No accelerator.**
- **No main-side batch channel.** The one new channel is `overview:activity`.
- **No schema change to the overview store.**
- **Null is never drawn as zero, and one clock is never drawn as another.**
- Directions A, B and C stay in the study. The study is not copied and not committed.
- No release.

---

## §10 Attacks answered

Two adversaries attacked the first pass. Every blocking and major finding is FIXED; none stands.
One minor is declined, with its reason. The text they found correct is unchanged and is now pinned
(§7's table of sixteen).

### Adversary 1, lifecycle safety

| Finding | Verdict | Where |
| --- | --- | --- |
| **B1** The batch could end sessions a person never saw named: eligibility was recomputed at every render and at the press, so a machine reconnecting turned `End 3` into `End 8` | FIXED. The ids named at open are an upper bound; `targets = named ∩ checked ∩ visibleIds ∩ eligible now`; the list shrinks and never grows. The first pass's ablation REQUIRED the growth; it is now two ablations, 6 and 7, both red | §2.10, §4.9 steps 0 and 1, §7, §8.2's first attack |
| **B2** A stale gate could Restart (kill, then HARD DELETE) or Remove (tombstone without killing) a session that had turned live; the claim that no renderer channel reaches `discardSession` was false; Retry skipped the gate | FIXED. §4.0 is one rule for every host method, Confirm, Retry and menu pick: an ID, a fresh read, the verb's own gate, else nothing and `SESSION_CHANGED`. The host's methods take ids. The false claim is corrected in §4.4 and §4.6. A busy row is inert (§2.7). Main's `removeRefusal` is BUILT, not queued, because an orphaned agent with its snapshots deleted is exactly issue 27 | §4.0, §4.2, §4.4, §4.5 step 1, §4.6, §4.9, §2.7 |
| **B3** F2 under the sheet renamed the ACTIVE session behind it; the arm the first pass added in `menu-actions.ts` was never reached | FIXED. The KEYDOWN branch at `keyboard.ts:216` gets the sheet branch as its first statement, the menu arm keeps one for a real click, and F's test drives the keydown with an active session present | §5.3 |
| **M1** Checked rows the filters hide still ended | FIXED. `checked ⊆ visibleIds`, pruned on every commit, and asserted again at naming and at the press. A project key whose group is gone resets to `all` | §2.10, §3.6, ablation 8 |
| **M2** `stopRequested()` carried no `runId` | FIXED as written. The id is minted synchronously in one `set` that also refuses a second press | §4.9 steps 1 and 8, ablation 9 |
| **M3** The menu door bypassed the disabled tabs and an armed confirmation survived a tab switch | FIXED in the STORE: `setSessionSheetTab` refused while running and closing a `confirm` batch; any write to `checked` closes a `confirm` batch; the batch holds no copy of the selection; the door is refused under any other layer | §6's verb table, §5.2 |
| **M4** A single verb failed silently when the sheet closed mid-call | FIXED. `settleSessionSheetInline` answers whether it wrote; when it did not, a failure is a sticky toast with main's sentence | §4.3 |
| **M5** A `failed` panel could land under another row and Retry would act on it unconfirmed | FIXED. No expansion opens over a busy one; continuations write only into their own busy panel; `patchSessionSheet` cannot carry `inline`; the panel's key is id and kind | §2.9, §4.3, §6 |
| **M6** Focus fell to `body` and Tab reached controls behind the scrim | FIXED three ways: chains ending at a tab that is never `disabled`, a reclaim after every commit, and a Tab rung in the window-capture ladder | §2.3, §2.13, §5.4 |
| **M7** Other doors acted under the sheet | FIXED. Six doors return; the tray door closes the sheet on `ok` | §5.3 |
| **M8** `Resume conversation` typed into a session nobody was looking at | FIXED through `goThen`, which also carries `Show what it loaded…` and the review row, for the reasons given there | §4.2 |
| **M9** The batch body promised what R5 refuses | FIXED. `batchBody(anyRemote)` is composed from `endSessionConfirm`'s own truths | §2.10 |
| **M10** The policy rewrite had no before-and-after pin | FIXED. A characterisation test recorded over the UNTOUCHED policy, green before the rewrite and unchanged after it; presence and enablement are separate gate fields; `closeSession` reads the same gates | §4.1, ablation 16 |
| **M11** R11 let a batch report `Ended` for a process it never touched | FIXED differently from the sentence offered, and more strongly. The renderer cannot see whether main bound a remote row, because `sessions:kill` answers void. It CAN see that the machine is not in `machineStates`, which is the one case the recorded status is drawn. So such a row is never eligible: it is not named, not counted as running, and `end` is never called for it, at open and again before each call. R11 is surfaced as a lifecycle ruling | §2.10's table, §4.9, §9 R11 |

One sentence offered was changed on purpose. The adversary's `closeSessionManager({ keepKeyboard:
true })` is `give: 'terminal'` here: with M6's reclaim in place, `land()`'s `focusTerminal` can
fire while the sheet is still drawn and lose the keyboard back to the sheet, so the close itself
gives it to the terminal one frame after it reaches the DOM (§4.7).

| Minor | Verdict |
| --- | --- |
| 1 Key repeat and double click | TAKEN. §2.9, §2.10, §2.13 |
| 2 The visible button flips verb under a focused Enter | TAKEN. §2.7 |
| 3 An indeterminate select-all click clears | TAKEN. §2.10, ablation 22 |
| 4 The rename input's Enter guards `isComposing` | TAKEN. §2.9 |
| 5 `endRefusal` should also refuse `restorable` | **DECLINED.** `src/main/harness/durability.ts:41-44` kills leftover `restorable` rows on purpose and uncaught, the renderer never asks for it, and the window is one instant wide with a mild consequence. Queued in §9. The same read found that `endRefusal` for `discarded` needs that harness's condition moved, which B now owns (§4.9) |
| 6 Follow the expansion after the group jumps; re-activate the old project when the restore then fails | TAKEN. §4.5 steps 4 and 5 |
| 7 After ending your own session the keyboard can land in another agent's prompt | CITED as Phase 289's open ruling, R16, and measured by the verifier |
| 8 Nobody owned `src/shared/menu-codicons.ts:183` | TAKEN. Builder A |

### Adversary 2, truthfulness and buildability

| Finding | Verdict | Where |
| --- | --- | --- |
| **T1** cursor has no answer clock; the cell read `Agent reply · 3h ago` over the PROMPT's time | FIXED. `OverviewActivityClock` is `'message' \| 'ask' \| 'session'`; the rule names no provider; cursor has a truth-table row and a fixture test | §3.4 |
| **T2** `lastMessageClock` was computed and never drawn | FIXED. Both clocks have a small word and a title, in the grid and in Details, pinned byte for byte | §3.4's second table, §2.9 |
| **T3** null drawn as zero in three places | FIXED. (a) Details prints words for a null agent count; (b) the second invariant makes `userMessages` a number whenever coverage is complete or partial, row 8 maps its NULL to 0 because a record was read, and `copy.ts` may hold no `?? 0`; (c) a `createdAt` of 0 is `—` and sorts last | §2.5, §2.9, §3.4 |
| **T4** A row could stay pending forever | FIXED. Row 0, a per-row catch in the refresh, and a rejected chunk settling every id it asked for | §3.4, §3.5 |
| **T5** The aggregate scanned the whole store on every call | FIXED. `listActivity(ids)`, one prepared statement per id over the primary key, the plan pinned. The per-id form was chosen over `json_each` because the tree has never used a JSON1 function and `countTurns` already has this shape. The remaining cost, reading one session's own turn rows, is stated | §3.4 |
| **T6** Last message went stale on a Working row and nobody owned the triggers | FIXED. `useSheetRefresh()` is D's, owns every debounce, and re-asks `running` ids every 30 s (R15) | §3.5 |
| **T7** The count restarts when the agent changes its record file | STATED in §1, in the heading's hover title, in the Details help line, and a verifier row | §1, §2.5, §8.3 |
| **T8** "The store cannot detect it" was inaccurate | CORRECTED: the reader counts the dropped turns, the store has no column, and one column fixes R3 and R12 | §1, §9 |
| **T9** `ok` with zero turns is indistinguishable from a map that stopped matching | STANDS as a stated limit, R14. The offered fix needs a size threshold nobody has measured, and CLAUDE.md forbids writing an unmeasured number | §1, §9 R14 |
| **T10** Reading `discarded` rows reverses a pinned property | STATED. The two filters do not move; only the new module reads removed rows; the store gains rows the manifest later prunes | §3.4 |
| **T11** The F3 test instruction was wrong | CORRECTED: row C is replaced, not joined; the Catch Me Up change is named for the commit body and gets its own `### Fixed` line | §3.4, §6 |
| **G2** A comment in `activity.ts` could turn `conformance:overview` red | TAKEN. The three banned spellings are forbidden in comments too | §3.4 |
| **G3** `probe:p167` was declared not owed on a false premise | FIXED. Owed once | §7 |
| **G4** `electron('probe:p293')` was the wrong class | FIXED. `remote(...)` | §6, §7 |
| **O2** `CLAUDE.md` was in F's list | FIXED. In no builder's list; F returns the row as text | §6 |
| **O3** Names builders depend on were not fixed | FIXED. `LIFECYCLE_BRIDGE_MISSING` has its text and its consumers, `refreshSessions` its contract, `ActivityCell`, `StoredActivity` and `ActivityRowFacts` their shapes | §3.4, §4.3, §4.9, §6 |
| **O4** Three things were unowned | FIXED. The refresh effect is D's, `DESIGN.md` §6 items 16 to 20 are F's, the running-log line is the committer's | §2.12, §6 |
| **O5** Three shared edits are inserts, not appends | STATED per file, with line numbers | §6 builder A |
| **O6** `sessionSheet` must start `null`; `saved-output.test.tsx` was unowned | FIXED. Pinned by C and the integrator; the test is E's and gains a case | §3.6, §4.8, §6 |


---

## §11 The fix round

Four verifiers passed and two answered `needs_work`. The operator's rule is that nothing a person
does today may get worse, so every finding measured as worse than today was fixed here rather than
queued. Each fix has its test beside it, and each one the app drove has a probe arm.

| Finding | Fix | Where it is held |
| --- | --- | --- |
| **W1** A Past restore no longer landed in the session | A Past restore closes the sheet and lands, as today's panel did (§1.5, §4.5 step 5). The Managed tab still stays open | `landPastRestore` in `actions.ts`; rule L1 and ablation W1; `p293-actions.test.ts`; probe arms 5 and L |
| **W2** Past lost newest-removal-first order | Groups were ordered by their newest removal, and the removal time is on hover (§2.11). **The group ordering was not enough and is replaced by §12**; the hover stays | superseded: §12 |
| **W3** Past Sessions… did nothing over the Catch Me Up page or the New Session sheet | The doors open over both; the create sheet's Escape rung yields (§5.2) | `otherLayerOpen` in `open.ts`; rule O1 and ablations W3 and W3b; `p293-doors.test.ts`, `p293-open.test.ts`; probe arm O |
| **W4** Past search lost the absolute path | The stored path and the session's own folder are in `searchText` (§2.4) | rule V5 and ablation W4; `p293-projection.test.ts` |
| **W5** A Past row lost its agent and its folder | The small line reads agent, promise and a worktree folder (§2.11), and in the single list its project and machine too (§12) | `pastRowSmall`; `p293-sheet-render.test.tsx` |
| **W6** ⌘J, ⌘/ and End Session… did nothing under the sheet | They close the sheet first and then open, and Close Project… does the same (§5.3) | `leaveSessionManagerFor` in `open.ts`; rule T15 and ablation Cp; `p293-doors.test.ts`; probe arm J |
| **W7** A gone folder was said only on the second press | The folder is asked about before the ask is drawn (§4.5 step 3) | `folderIsGone` in `actions.ts`; rule F1 and ablation W7; `p293-actions.test.ts`; probe arm 6 |
| **W8** The Past footer lost two sentences | They are the hover title on `Kept for 90 days.` | `PAST_FOOTER_HOVER`; `p293-sheet-render.test.tsx` |
| **Batch P1 (major)** A double click's second click restored an unnamed row | The sheet root swallows a repeated click on a control (§2.13) | `repeat-click.ts`; rule T14 and ablations Dc and Db; `p293-repeat-click.test.ts`; probe arm D, which reads the ended row restored with the swallow removed and nothing restored with it in place |
| **Batch P2** The closed toast named a rest that did not exist | The second sentence only when something was left not run | `batchClosedToast`; rule K1 and ablation Bt |
| **Press P1 and P3** The split arrows, Next and Previous Session, and an agent hotkey acted behind the sheet | Refused under the sheet, and a `focusin` reclaim brings back any keyboard a terminal takes (§2.13, §5.3) | rule T15 and ablations Ar and Hk; `p293-doors.test.ts`, `p94-hotkey-create.test.ts` |
| **Press P2** New Project…, Open Remote Project… and Clone Repository… opened under the sheet | Refused under the sheet (§5.3) | rule T15; `p293-doors.test.ts` |
| **Press P4** A verb that flipped under focus sent the keyboard to the tab | The reclaim goes back where the keyboard was and never to a flipped button (§2.7, §2.13) | `reclaimSheetKeyboard` in `open.ts`; `p293-open.test.ts` |
| Integrator: a restoring row that already reads live was not inert | `ManageRow.restoring` makes it inert (§2.7) | `p293-sheet-render.test.tsx`, `p293-projection.test.ts` |
| Nits: matrix P4 and P5, batch P3 and P4, press P5 and P6, aggregate C4 | The spec now says what the build does (§2.5, §2.10, §3.4, §8.2, §1) | this file |
| Matrix P1, a selection that widened once in five runs | Not reproduced in four further runs with the same drive, and its cause was not isolated. The two changes above that touch clicks, the double-click swallow and the `focusin` reclaim, act only on a repeated click and on focus that leaves the sheet, so neither explains it or cures it | open |
| Matrix P2, aggregate C1, C2, C3 and C5 | Outside this phase's charter and none worse than today; queued in §9 | §9 |

---

## §12 The Past order, fixed after the reverify

The Tier 3 no-regression reverify found that §11's W2 fix restored only the NEWEST removal. It
ordered the groups by their newest removal, so a person's second newest removal sat below every row
of the newest one's project. Live, with removals alternating between two projects (its scenario
X5), main answered ax2, bx1, ax1, wt1, d1, today's panel drew ax2, bx1, ax1, wt1, d1, and the fix
round drew ax2, ax1, wt1, bx1, d1, moving bx1 from row 2 to row 4. Through the projection, with
twenty older removals in the other project, it moved from row 2 to row 22 of 22. The operator's
standing rule is that nothing a person does today may get worse, and he ruled option A (§9).

| What | Now |
| --- | --- |
| The order | ONE list in main's order, newest removal first. `buildManageProjection` hands out `pastRows`, the same row objects as `past`, each written back at the index its session had in `pastSessions`, so the order is copied from main and never re-derived. `orderPastGroups` is gone; Past groups take the Managed order, which is what the project filter lists |
| When it groups | Only when the project filter names one project: `visiblePastList` answers null and the tab draws that group under its heading, its rows in the same order. Under All, with or without a search, it answers the single list |
| The row | The small line names the project, and the machine when it is not this Mac, in the project filter's own `label · machine` form, between the agent and the promise. Under a heading it leaves both to the heading. Each row carries `data-row-group`, which the probe's drive reads for arm 10 now that the single list has no heading to read |
| Kept from §11 | A Past restore closes the sheet and lands (W1); search covers the stored path and the session's own folder (W4); the worktree folder in the small line (W5); the footer hover (W8); a gone folder said on the first press (W7); the exact removal time on hover |
| Held by | `p293-projection.test.ts` (X5 with and without a search, the twenty-older case, one project filtered, and an order whose times disagree with it drawn as it came), `p293-sheet-render.test.tsx` (the markup's row order, no heading under All, one heading filtered, the small lines), `p293-copy.test.ts`. Rule R3 of `conformance:manager`, rewritten, drives the real store through `selectSheetView` over the same cases. Ablation W2 (grouped under All again), W2b (the single list taken group by group) and W2c (the single list re-sorted by removal time) each redden R3 alone |

The project filter's options now follow the Managed order rather than newest removal. That is not a
regression against today, whose panel had no project filter.

### 12.1 The folder back on the row, after the reverify

The reverify of the ruling read the order right everywhere and found ONE thing worse than today. The
first pass at the single list put the project's LABEL in each row's small line, and two projects can
be named alike: with `/nr/one/app` and `/nr/two/app` both removed, every row read
`Shell · app · Starts fresh`, where today's panel reads `…/one/app` and `…/two/app`. The folder is
what tells them apart and it is what today drew, so `pastRowSmall` now takes
(`agentLabel`, `folder`, `detail`) and `PastList`'s `smallOf` passes `displayPath(session.cwd)`
under All, and under a project's heading only when the session ran outside that project. The whole
folder is the row's `title`. The machine left the small line with it: the name line's badge says it,
and a machine a person removed is named by the tombstone sentence (R2, which read it three times).
The project filter adds a colliding project's folder to its option and nothing to the rest (R3).

`conformance:manager` gains rule T16, read as text over `PastList.tsx`: the small line names
`displayPath(session.cwd)`, it names neither `group.label` nor `group.machineLabel`, and the row
carries its whole folder as a hover. `ablation:p293` gains W2d (the project's name back in place of
the folder) and W2e (the hover dropped), each red on T16 alone: 58 ablations, 49 rules.

