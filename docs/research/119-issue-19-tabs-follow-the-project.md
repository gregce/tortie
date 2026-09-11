# Research 119 — editor tabs should follow the project (issue 19)

**Read on 2026-09-11 at `88f42a89`.** Every line number below is from that tree.

## 0. The answer

Issue 19 asks that the editor's open documents belong to the project they were opened in, so
switching projects hides the other project's tabs without closing them, and their edit state — the
shadow baseline, the rewind journal, the dirty buffer — survives the switch. **Tortie already knows
which project every tab belongs to and already does this for every other surface. The editor is the
one surface that was never scoped.** The work is a filter over a list that already exists, two small
per-project maps in the house's own pattern, and one trap in the tab cap that would silently destroy
the very state the issue asks to keep.

## 1. What the tree already holds

- **Every tab carries its project root.** `EditorTab.repoPath` at `src/renderer/editor/tab-types.ts:52`
  is set from the open request at `src/renderer/editor/store.ts:497` for every kind of tab, and a
  remote tab's id carries `machineId` and `repoPath` besides (`tab-identity.ts:22-27`). Nothing new
  has to be recorded to know where a tab belongs.
- **The store is one global list with one active tab and one open flag.** `tabs`, `activeId` and
  `panelOpen` at `store.ts:121-123`, seeded at `:364-365`. `EditorTabs.tsx:212` draws `tabs.map(...)`
  unfiltered. `EditorPanel.tsx:413-421` reads `activeProjectId` for one thing only, a fallback
  `repoPath` of `'*'`.
- **Switching projects touches the editor nowhere.** `setActiveProject` at
  `src/renderer/state/projects-slice.ts:148` sets `activeProjectId` and nothing else. The Explorer
  (`FilesSection.tsx:129-135`), the sidebar view (`chrome-slice.ts:486-521`), sessions and SCM all
  read `activeProjectId`; the editor does not. Research 10 §2 named this in 2026-08: *"gmux's tab must
  scope everything (terminals, git sidebar, file tree) to the project — the thing VS Code refuses to
  do."* The editor was the exception nobody wrote down.
- **The house pattern for per-project UI state exists.** `sidebarViewByProject`, a map keyed by
  project id, written by `setSidebarView` and read by `activeSidebarView`
  (`chrome-slice.ts:486-521`). `activeId` and `panelOpen` become the same shape.
- **Tabs are not persisted across a restart.** The editor store writes only three preferences to
  localStorage (`store.ts:115-117`), so the per-project maps are in-memory too and no migration of
  stored state is needed.

## 2. The issue's caveat, and it is exactly right

The reporter wrote: *"I don't want to count the open files from the previous project as closed,
because I still want to keep track of their existing edit shadow DOM."* Closing a tab is destructive
in three ways, all at `forceCloseTab` (`store.ts:698-704`): `disposeModels` drops the Monaco model
and its undo stack, `dropViewState` drops scroll and selection, and `forgetRewindJournal` (Phase 244)
ends the rewind undo. The shadow baseline itself is a property of the tab OBJECT (Phase 244's own
finding) and is durable on disk since Phase 243, so a hidden tab keeps it and a closed one re-seeds
from the durable copy. **Hiding must therefore be a filter and never a close.** No call to
`forceCloseTab`, no `closeMany`, no preview-slot recycling across projects.

## 3. The trap — the tab cap would evict the hidden project's state first

`MAX_TABS = 10` at `store.ts:104`. When an eleventh tab opens, `:616-627` evicts the stalest clean
tab by `lastUsed`, excluding only the new tab and the one on screen, and eviction runs the same three
disposals as a close. **A hidden project's tabs are by construction the stalest**, so the moment the
active project opens its tenth or eleventh file, the other project's tabs are evicted — with their
rewind journals — while the person believes they were merely hidden. The cap has to become
per-project: ten per project, evicting only among the active project's own clean, unfocused tabs.
Cost: up to `10 × open projects` Monaco models resident. The build phase measures that against the
Phase 167 plateau rule rather than assuming it.

## 4. Every other place that reads the global list

Each of these must read the VISIBLE set, being the active project's tabs, or it leaks the other
project through a side door:

| site | what it does today |
| --- | --- |
| `EditorTabs.tsx:212` | draws every tab |
| `store.ts:756-767` | ⌃Tab walks MRU over every tab |
| `store.ts:708-716` | closing the active tab picks the next from every tab; sets `panelOpen` false only when ALL tabs are gone |
| `store.ts:738`, `closeOthers`/`closeAll` | act on every tab |
| `EditorTabs.tsx:39-46` | the tab menu's `tabCount`, `index`, `anySaved` |
| `store.ts:379-381` `onRepoChanged` | already scoped by `repoPath` — correct as is |
| `store.ts:290` `worktreeTabsIn` | already scoped by `repoPath` — correct as is |

## 5. Three decisions the phase makes, stated here so a builder does not invent them

1. **Which project a tab belongs to.** The project whose root contains the file when one is open,
   otherwise the project that was active when it opened. The first clause matters for a path clicked
   in project X's terminal that names a file in project Y (research 114 §4.6's "wrong copy" case): the
   tab belongs to Y. The second clause covers the reporter's *"rarely … a document that's not
   associated with a project"* — a global `CLAUDE.md`, a file in `/private/tmp`, the diagnostics tab —
   which follow the project they were opened from. A tab is never shown in two projects.
2. **Closing a project.** `closeProject` (`projects-slice.ts:299`) leaves the editor untouched today,
   so a closed project's tabs would become invisible forever under scoping. The phase closes them
   through the existing dirty prompt (`closeMany`, `store.ts:336-350`): unsaved work is asked about,
   clean tabs are dropped, and nothing is lost because the baseline is durable on disk. Sessions "keep
   running and reappear when you reopen" because they are processes; a buffer is not.
3. **The editor panel's open state is per project.** A project with no tabs shows no editor; switching
   to it closes the panel, switching back reopens it where it was. Same map pattern as the sidebar view.

## 6. What is refused

No tab persisted across a restart (a different issue). No "pin to all projects" control — the
reporter said the cross-project case is rare, and a control for a rare case is furniture. No change
to `MAX_TABS`'s number, only its scope. No change to tab identity (`tab-identity.ts`), so Phase 244's
journal-per-opening rule stands.
