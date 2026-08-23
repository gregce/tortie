/**
 * CONTEXT — the sidebar's fourth view, beside Explorer, Search and Source
 * Control (research 29 §5).
 *
 * WHAT IT IS FOR. Tortie's registry already answers how a session STARTS:
 * binary, argv, resume argv, icon, hotkey. Nothing in Tortie answers what a
 * session can DO once it starts, and that lives entirely in sidecar
 * configuration which is invisible from inside the app. This view is that
 * answer: skills, MCP servers, hooks, plugins and the instruction files that
 * load alongside them.
 *
 * IT IS SPLIT HEADER / BODY like every other view here, because the sidebar
 * owns the 36px header band (S1) and exactly one label and one hairline cross
 * it whichever view is showing. This file is the BODY. The band is
 * `ContextHeader.tsx` and one row is `ContextRow.tsx`, each because it is its
 * own responsibility rather than because of any line count: the band is a
 * region of the window, and the row is the piece whose three responsive tiers
 * have to be reasoned about on their own.
 *
 * THE LIST SHOWS THE RESOLVED SET, NEVER THE UNION (§4). One row per effective
 * thing. A losing duplicate is not a row, it is a mark on the winner. A union
 * list is an inventory of files; a resolved list answers what the agent will
 * actually do, and that difference is the whole feature.
 *
 * SCOPE IS CARRIED BY THREE NON-CHROMATIC CHANNELS, in this order (§6.2):
 * position (the group a row sits in), then words (the group label, the chip,
 * the tooltips), then shape (codicons at the narrowest tier). Never colour.
 * DESIGN.md spends its whole colour budget on state — accent for selection,
 * amber for "an agent needs you", the git ramp for git — and a fourth
 * chromatic vocabulary for scope would be the first decoration in the product.
 *
 * REFUSED HERE, so a later round has something to point at: no rail badge
 * counting context (§5.1), no ambient signal when a file changes under a
 * running session (§8.4), and no featured, trending or recommended surface
 * (§13.4).
 *
 * A PROJECT ON ANOTHER MACHINE IS A READ AND NOTHING ELSE (Phase 108,
 * research 57 §12). The same scan shape arrives over `machines:readContext`
 * and the same groups draw it, with the same ladders and the same marks. What
 * is REFUSED there, permanently: install, enable, pin, remove, update,
 * create, open and reveal. The row actions are `{}` on a remote tab and the
 * menus carry a `remote` flag, so every one of those verbs is an absent menu
 * item rather than a dead control. Three note lines under the sections say
 * where the rows came from, that nested project skills are not listed, and
 * when a cut read left entries out.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { FilterField } from '../controls';
import { Codicon } from '../icons';
// A DEEP import on purpose. These three hooks are the SIDEBAR's section
// mechanism, not an SCM concept — DESIGN-SPEC S3 says the section-drag block
// "already applies to any view with ≥2 sections" — and they happen to live in
// scm/sections.ts because Source Control was the first view with two. Reusing
// them is the guardrail ("grep for an existing helper before writing one");
// re-exporting them through `scm/index.ts` would put them in SCM's public
// surface, which is where they least belong. Their real home is
// `renderer/controls/`, and moving them is a one-file change for whoever next
// runs the duplication scan.
import {
  usePersistedBool,
  useSectionDrag,
  useSectionOrder
} from '../scm/sections';
import {
  localPathOf,
  targetKey,
  targetOfProject
} from '@shared/workspace-target';
import {
  CONTEXT_NESTED_NOT_LISTED,
  CONTEXT_NO_BRIDGE,
  contextCutLine,
  contextElsewhereTitle,
  contextEmptyOnMachine,
  contextNoAnswer,
  contextNoHome,
  contextNotConnected,
  contextOnMachineLine,
  contextReadingOn
} from '../machines/presentation';
import { machineLabelFor } from '../state/machines-slice';
import { useApp } from '../state/store';
import { openFileAt, requestOpenContext } from './open-detail';
import {
  CONTEXT_COPY,
  CONTEXT_SECTION_CATEGORY,
  CONTEXT_SECTION_DEFAULT_OPEN,
  CONTEXT_SECTION_IDS,
  CONTEXT_SECTION_LABELS,
  countLabel,
  groupEntries,
  matchesAgent,
  matchesFilter,
  precedenceView,
  sectionCount,
  sectionHint
} from './groups';
import type {
  ContextGroup,
  ContextSectionId,
  PrecedenceView
} from './groups';
import { ContextRow } from './ContextRow';
import { EnableForDialog } from './enable/EnableForDialog';
import { ContextHoverCard } from './HoverCard';
import { toSnapshotRow } from './model';
import type {
  ContextEntry,
  ContextProblem,
  ContextRootReadout
} from './model';
import { groupMenuItems, menuAt, rowMenuItems } from './menus';
import type { ContextMenuDeps, ContextRowActions } from './menus';
import { useContext } from './store';
import { onContextChanged } from './bridge';
import { reveal } from '../tree/fs-bridge';
import { useSessionContext } from '../state/context-session';
import type { ContextDriftEntry } from '@shared/context-snapshot';
import type { ContextSkillPinCheck } from '@shared/ipc';
import { useInstallFlow } from './install/install-store';
import './context.css';


// ---------------------------------------------------------------------------
// The body
// ---------------------------------------------------------------------------

/**
 * PHASE 108. What a remote tab gets instead of the injected write verbs. One
 * frozen empty object rather than a literal in the component, so its identity
 * is stable across renders and the memoized menus do not rebuild for nothing.
 */
const NO_REMOTE_ACTIONS: ContextRowActions = {};

/**
 * Requirement 2, as one boolean the row can draw.
 *
 * A pin whose hash could not be re-read counts as CHANGED. Reading an
 * unreadable directory as agreement is the failure mode the control exists to
 * prevent.
 */
function pinChanged(check: ContextSkillPinCheck | undefined): boolean {
  if (check === undefined) return false;
  return check.currentHash === null || check.currentHash !== check.pinnedHash;
}

/**
 * Phase 26 item 2 — the skill search box, INSIDE the skills section.
 *
 * The anatomy is the commit box's (ScmSection, DESIGN-SPEC S3): sticky section
 * header, then the box, then the rows. It is a separate surface from the
 * global filter above the sections, deliberately: this box searches the
 * REGISTRY, the filter narrows what is installed, and the two never share a
 * field, so filtering can never silently become a network search.
 *
 * Pressing return hands the query to the existing search plumbing from Phase
 * 22 — the sheet opens, runs the search at once, and its results lead into
 * the same preview and confirm flow. Nothing new touches the network here.
 */
function SkillSearchBox({
  onSearch
}: {
  onSearch: (query: string) => void;
}): React.JSX.Element {
  const [query, setQuery] = useState('');
  return (
    <form
      className="ctx-skill-search"
      // The sections container is a listbox with its own key bindings
      // (arrows, space, enter). Keys typed into this box belong to the box.
      onKeyDown={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        const q = query.trim();
        if (q !== '') onSearch(q);
      }}
    >
      {/* The shared `.input` from globals.css — the same class the global
          filter above the sections wears. The box's own class carries only
          its placement inside the section. */}
      <input
        type="text"
        className="input"
        placeholder="Search skills.sh (⏎ to see results)"
        aria-label="Search skills.sh for a new skill"
        value={query}
        spellCheck={false}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button
        type="submit"
        className="btn btn-secondary btn-sm ctx-skill-search-btn"
        disabled={query.trim() === ''}
        title={
          query.trim() === ''
            ? 'Type a skill name first'
            : `Search skills.sh for "${query.trim()}"`
        }
      >
        Search skills.sh
      </button>
    </form>
  );
}

interface SectionProps {
  id: ContextSectionId;
  entries: readonly ContextEntry[];
  roots: readonly ContextRootReadout[];
  /** §11 item 4 — files that would not parse, for this section only. */
  problems: readonly ContextProblem[];
  cwd: string;
  filter: string;
  /**
   * Phase 26 item 2 — present only when the write channels are wired, and
   * only the skills section renders it. Absent means no box, never a dead one.
   */
  onSearchRegistry?: (query: string) => void;
  agentId: string | null;
  /** How the SELECTED agent orders and explains this category (§2.9, R4). */
  precedence: PrecedenceView;
  selected: string | null;
  showAgentChip: boolean;
  marks: ReadonlyMap<string, ContextDriftEntry>;
  /** Requirement 2 — rows whose bytes no longer match what was approved. */
  pins: ReadonlyMap<string, ContextSkillPinCheck>;
  onSelect(id: string): void;
  onActivate(entry: ContextEntry, keep: boolean): void;
  onMenu(entry: ContextEntry, at: { x: number; y: number }): void;
  onGroupMenu(group: ContextGroup, at: { x: number; y: number }): void;
  onHover(entry: ContextEntry | null, el: HTMLElement | null): void;
  onOpenProblem(problem: ContextProblem): void;
  /** Phase 26.2 — the Open Folder affordance beside a guided fix. */
  onRevealDir(path: string): void;
}

function Section({
  id,
  entries,
  roots,
  problems,
  cwd,
  filter,
  onSearchRegistry,
  agentId,
  precedence,
  selected,
  showAgentChip,
  marks,
  pins,
  onSelect,
  onActivate,
  onMenu,
  onGroupMenu,
  onHover,
  onOpenProblem,
  onRevealDir
}: SectionProps): React.JSX.Element {
  const category = CONTEXT_SECTION_CATEGORY[id];
  // Collapse state is per project, so a repo whose hooks matter opens with
  // hooks open and one whose hooks are noise does not.
  const [collapsed, setCollapsed] = usePersistedBool(
    `gmux.context.collapsed.${id}.${cwd}`,
    !CONTEXT_SECTION_DEFAULT_OPEN[id]
  );
  // A bundle group is collapsed by default and stays that way per project.
  const [bundleOpen, setBundleOpen] = usePersistedBool(
    `gmux.context.bundled.${id}.${cwd}`,
    false
  );

  const groups = useMemo(
    () => groupEntries(entries, category, agentId, filter, precedence),
    [entries, category, agentId, filter, precedence]
  );
  const count = useMemo(
    () => sectionCount(entries, category, agentId),
    [entries, category, agentId]
  );

  return (
    <section
      className={`section-ctx${collapsed ? ' collapsed' : ''}`}
      data-section-root={id}
    >
      <div
        className={`section-header${collapsed ? ' collapsed' : ''}`}
        data-section={id}
        title={sectionHint(category, roots, precedence)}
      >
        <button
          type="button"
          className="section-toggle"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="section-chevron">
            <Codicon name="chevron-down" size={12} />
          </span>
          {CONTEXT_SECTION_LABELS[id]}
          <span className="section-count num">
            {count > 0 ? countLabel(category, count) : ''}
          </span>
        </button>
        <span className="section-spacer" />
        <span className="section-gripper" aria-hidden="true">
          <Codicon name="gripper" size={14} />
        </span>
      </div>
      {collapsed ? null : (
        <div className="section-body ctx-body">
          {/* Phase 26 item 2 — the registry search box, skills only, above
              the rows the way the commit box sits above the changed files. */}
          {id === 'skills' && onSearchRegistry !== undefined ? (
            <SkillSearchBox onSearch={onSearchRegistry} />
          ) : null}
          {/* §11 item 4 — the section still renders. One bad file is one row
              in --error that opens the editor at the line the parser named; it
              is never a blank panel, and it is never a reason to hide the
              entries that DID read. */}
          {problems.map((problem) => (
            <div
              key={`${problem.path}:${String(problem.line ?? 0)}`}
              className="ctx-row ctx-row-problem"
              role="option"
              aria-selected={false}
              title={problem.path}
              onClick={() => onOpenProblem(problem)}
            >
              <Codicon name="error" size={16} className="ctx-mark-broken" />
              <span className="ctx-problem-body">
                <span className="ctx-problem-text">{problem.message}</span>
                {/* Phase 26.2 — a user-owned naming problem is actionable:
                    both fixes stated, and Open Folder beside them. Tortie
                    never applies a fix itself; it opens the folder and the
                    file and stops. */}
                {problem.fix !== undefined ? (
                  <span className="ctx-problem-fix">{problem.fix}</span>
                ) : null}
                {problem.revealDir !== undefined ? (
                  <button
                    type="button"
                    className="btn-text ctx-problem-open"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRevealDir(problem.revealDir ?? '');
                    }}
                  >
                    Open Folder
                  </button>
                ) : null}
              </span>
            </div>
          ))}
          {groups.length === 0 && problems.length === 0 ? (
            <div className="ctx-group-stub">
              {filter.trim() === ''
                ? 'None here.'
                : CONTEXT_COPY.noFilterMatch(filter.trim())}
            </div>
          ) : (
            groups.map((group) => {
              const hidden = group.bundled && !bundleOpen;
              return (
                <React.Fragment key={group.key}>
                  {/* An empty label is the FILTERED state: the rows flatten and
                      each carries its own scope chip, so there is no header to
                      draw (§5.3). */}
                  {group.label === '' ? null : (
                  <div
                    className={`ctx-group-row${group.bundled ? ' bundled' : ''}`}
                    title={group.hint}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onGroupMenu(group, { x: e.clientX, y: e.clientY });
                    }}
                    {...(group.bundled
                      ? {
                          role: 'button',
                          tabIndex: 0,
                          onClick: () => setBundleOpen(!bundleOpen),
                          onKeyDown: (
                            e: React.KeyboardEvent<HTMLDivElement>
                          ) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setBundleOpen(!bundleOpen);
                            }
                          }
                        }
                      : {})}
                  >
                    {group.bundled ? (
                      <span
                        className={`ctx-group-chevron${bundleOpen ? ' open' : ''}`}
                      >
                        <Codicon name="chevron-right" size={12} />
                      </span>
                    ) : null}
                    <span className="ctx-group-label">{group.label}</span>
                    <span className="ctx-group-space" />
                    <span className="ctx-group-count num">
                      {group.entries.length}
                    </span>
                  </div>
                  )}
                  {group.scope === 'managed' ? (
                    <div className="ctx-group-note">
                      {CONTEXT_COPY.managedNote}
                    </div>
                  ) : null}
                  {hidden
                    ? null
                    : group.entries.map((entry) => (
                        <ContextRow
                          key={entry.id}
                          entry={entry}
                          selected={selected === entry.id}
                          filtering={filter.trim() !== ''}
                          showAgentChip={showAgentChip}
                          drift={marks.get(entry.id)}
                          pin={pinChanged(pins.get(entry.id))}
                          onSelect={onSelect}
                          onActivate={onActivate}
                          onMenu={onMenu}
                          onHover={onHover}
                        />
                      ))}
                </React.Fragment>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

/**
 * The view body below the band.
 *
 * `actions` is INTEGRATION SEAM 3: the write verbs. Absent ones do not appear
 * in a menu at all rather than appearing greyed, because installing and
 * removing execute someone else's code and a control that looked wired but was
 * not would be worse than no control.
 */
export function ContextSection({
  actions = {}
}: {
  actions?: ContextRowActions;
} = {}): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const setMenu = useApp((s) => s.setMenu);
  const toast = useApp((s) => s.toast);
  const machineStates = useApp((s) => s.machineStates);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );
  // The pair, never the path (Phase 90.1).
  const target = useMemo(() => targetOfProject(project), [project]);
  // `cwd` is the folder THIS MAC may read, and it is null for a project on
  // another computer. Every use of it below already had a null branch, so a
  // project on another machine opens no file and reads no directory.
  const cwd = localPathOf(target);
  // PHASE 108. The rows on a remote tab come from the machine, and every
  // verb that writes, opens or reveals is refused there permanently.
  const remote = target !== null && cwd === null;

  const status = useContext((s) => s.status);
  const scan = useContext((s) => s.scan);
  const pins = useContext((s) => s.pins);
  const reviewPin = useInstallFlow((s) => s.reviewPin);
  const error = useContext((s) => s.error);
  const remoteMode = useContext((s) => s.remoteMode);
  const storeMachineLabel = useContext((s) => s.machineLabel);
  const remoteCut = useContext((s) => s.remoteCut);
  const filter = useContext((s) => s.filter);
  const setFilter = useContext((s) => s.setFilter);
  const agentId = useContext((s) => s.agentId);
  const mode = useContext((s) => s.mode);
  const sessionId = useContext((s) => s.sessionId);
  const syncProject = useContext((s) => s.syncProject);
  const refresh = useContext((s) => s.refresh);

  // PHASE 108. The machine's name for every sentence about it: the machine's
  // own label once an answer landed, the sidebar's list before that.
  const machineName =
    storeMachineLabel ??
    machineLabelFor(machineStates, target?.machineId ?? '');
  // PHASE 108. The write verbs are refused on a remote tab, permanently. An
  // empty object is how this view already draws an unwired verb: every one of
  // them is an absent menu item or an absent button, never a dead control.
  const verbs = remote ? NO_REMOTE_ACTIONS : actions;

  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{
    entry: ContextEntry;
    anchor: { top: number; bottom: number; right: number };
  } | null>(null);

  useEffect(() => {
    syncProject(target);
  }, [target, syncProject]);

  // The watcher re-reads. It never announces: no toast, no badge, no dot on a
  // session tab. A user who edits `.mcp.json` while three sessions run sees
  // nothing here, because they already know what they did (§8.4).
  useEffect(() => {
    if (cwd === null) return;
    return onContextChanged((changed) => {
      if (changed === cwd) refresh();
    });
  }, [cwd, refresh]);

  const entries = useMemo(() => scan?.entries ?? [], [scan]);
  // Every root every registry agent declared, flattened once. §2.4's whole
  // point is that a `?` cell becomes an absent key and an absent key becomes
  // an absent row, so this is a concatenation and never a lookup table.
  const roots = useMemo(
    () =>
      (scan?.agents ?? [])
        .filter((a) => agentId === null || a.agent === agentId)
        .flatMap((a) => a.roots),
    [scan, agentId]
  );
  const problems = useMemo(() => scan?.problems ?? [], [scan]);

  // R4 — the panel resolves per agent, so it explains per agent too. One view
  // per category, computed once here rather than inside each Section, because
  // `groupEntries` is also called flat for the keyboard order below and the two
  // must not be able to order the same rows differently.
  const precedence = useMemo(() => {
    const readouts = scan?.agents ?? [];
    const out = {} as Record<ContextSectionId, PrecedenceView>;
    for (const id of CONTEXT_SECTION_IDS) {
      out[id] = precedenceView(readouts, CONTEXT_SECTION_CATEGORY[id], agentId);
    }
    return out;
  }, [scan, agentId]);

  // §8.3 — the readout. The record comes from one IPC call that reads one
  // manifest column; the current set is the rows already resolved above; the
  // comparison is a pure function over the two. Main is never asked to walk
  // the configuration roots a second time to answer a question this process is
  // already holding the answer to.
  const snapshotRows = useMemo(() => entries.map(toSnapshotRow), [entries]);
  const readout = useSessionContext(
    mode === 'session' ? sessionId : null,
    snapshotRows
  );

  const sectionsRef = useRef<HTMLDivElement | null>(null);
  const { order, setOrder, moveSection } = useSectionOrder(
    'context',
    CONTEXT_SECTION_IDS
  );
  const sectionLabels = useMemo(
    () => ({ ...CONTEXT_SECTION_LABELS }),
    []
  );
  const sectionDrag = useSectionDrag(
    sectionsRef,
    order,
    setOrder,
    moveSection,
    sectionLabels
  );

  const menuDeps: ContextMenuDeps = useMemo(
    () => ({
      openPath: (path, line) => {
        if (cwd === null) return;
        openFileAt(path, cwd, {
          preview: false,
          ...(line !== undefined ? { line } : {})
        });
      },
      revealPath: (path) => {
        // PHASE 122. This was a cast of `window.gmux` to a hand written shape
        // with two optional members. Every member of an installed bridge is
        // required now, so the cast said nothing the declaration does not
        // already say. `ContextDetailTab.tsx` already reaches Finder through
        // the renderer's one reveal helper, and this call site now does too.
        void reveal(path).catch(() => undefined);
      },
      copyText: (text) => {
        void navigator.clipboard.writeText(text).then(
          () => toast('success', 'Copied.'),
          () => toast('error', 'Could not copy that.')
        );
      },
      // PHASE 108. On a remote tab the menus build no item that opens or
      // reveals, because the paths are on the other computer.
      remote
    }),
    [cwd, remote, toast]
  );

  const onActivate = useCallback(
    (entry: ContextEntry, keep: boolean): void => {
      if (cwd === null) return;
      requestOpenContext({ entry, repoPath: cwd, preview: !keep });
    },
    [cwd]
  );

  const onMenu = useCallback(
    (entry: ContextEntry, at: { x: number; y: number }): void => {
      const items = rowMenuItems(entry, menuDeps, verbs);
      // Requirement 2's way back. A row Tortie has switched off is asking a
      // question, and the answer has to be reachable from the row itself.
      const pin = pins.get(entry.id);
      if (pin !== undefined && pinChanged(pin)) {
        items.unshift(
          {
            label: 'Review what changed…',
            run: () => reviewPin(entry, pin)
          },
          'sep'
        );
      }
      setMenu(menuAt(at, items));
    },
    [menuDeps, pins, reviewPin, setMenu, verbs]
  );

  const onGroupMenu = useCallback(
    (group: ContextGroup, at: { x: number; y: number }): void => {
      const items = groupMenuItems(group.entries, menuDeps, group.scope);
      if (items.length > 0) setMenu(menuAt(at, items));
    },
    [menuDeps, setMenu]
  );

  const onOpenProblem = useCallback(
    (problem: ContextProblem): void => {
      if (cwd === null) return;
      openFileAt(problem.path, cwd, {
        preview: false,
        ...(problem.line !== null ? { line: problem.line } : {})
      });
    },
    [cwd]
  );

  const onHover = useCallback(
    (entry: ContextEntry | null, el: HTMLElement | null): void => {
      if (entry === null || el === null) {
        setHover(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setHover({
        entry,
        anchor: { top: r.top, bottom: r.bottom, right: r.right }
      });
    },
    []
  );

  // §7.5 — the list conventions the Explorer and SCM lists already implement.
  const flat = useMemo(() => {
    const out: ContextEntry[] = [];
    for (const id of order) {
      const sectionId = id as ContextSectionId;
      const category = CONTEXT_SECTION_CATEGORY[sectionId] ?? 'skill';
      for (const group of groupEntries(
        entries,
        category,
        agentId,
        filter,
        precedence[sectionId]
      )) {
        out.push(...group.entries);
      }
    }
    return out;
  }, [agentId, entries, filter, order, precedence]);

  const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (flat.length === 0) return;
    const index = flat.findIndex((entry) => entry.id === selected);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next =
        e.key === 'ArrowDown'
          ? Math.min(flat.length - 1, index + 1)
          : Math.max(0, index <= 0 ? 0 : index - 1);
      const entry = flat[next];
      if (entry !== undefined) {
        setSelected(entry.id);
        document
          .getElementById(`ctx-row-${entry.id}`)
          ?.scrollIntoView({ block: 'nearest' });
      }
      return;
    }
    const entry = index === -1 ? undefined : flat[index];
    if (entry === undefined) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      onActivate(entry, true);
      return;
    }
    if (e.key === ' ') {
      // The only way to reach the glance without a pointer (§7.5), which is
      // the only way to read a summary at 220px without opening a tab.
      e.preventDefault();
      const el = document.getElementById(`ctx-row-${entry.id}`);
      if (el !== null) onHover(entry, el);
      return;
    }
    if (e.key === 'Escape') {
      setHover(null);
      return;
    }
    if (e.key === 'F10' && e.shiftKey) {
      e.preventDefault();
      const r = document
        .getElementById(`ctx-row-${entry.id}`)
        ?.getBoundingClientRect();
      if (r !== undefined) onMenu(entry, { x: r.left + 16, y: r.bottom });
    }
  };

  const visible = useMemo(
    () =>
      entries.filter(
        (e) => matchesAgent(e, agentId) && matchesFilter(e, filter)
      ),
    [agentId, entries, filter]
  );

  const body = (): React.JSX.Element => {
    if (status === 'unavailable') {
      return <div className="section-stub">{CONTEXT_COPY.unavailable}</div>;
    }
    // PHASE 108 narrowed this state to one honest meaning: this build's
    // preload cannot ask a machine anything. A remote tab a current build can
    // read never lands here, because the store reads it instead.
    if (status === 'elsewhere') {
      return (
        <div className="ctx-empty">
          <p className="ctx-empty-title">
            {contextElsewhereTitle(machineName)}
          </p>
          <p className="ctx-empty-body">{CONTEXT_NO_BRIDGE}</p>
        </div>
      );
    }
    if (status === 'loading' && scan === null) {
      return (
        <div className="section-stub">
          {remote ? contextReadingOn(machineName) : CONTEXT_COPY.reading}
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div className="section-stub ctx-error">
          {error ?? 'Your agent configuration could not be read.'}
        </div>
      );
    }
    // PHASE 108. The machine was asked and answered a refusal word, or did
    // not answer. Each word is one sentence under the title that names the
    // machine, and none of them is an error: nothing failed on this Mac.
    if (remote && remoteMode !== null && remoteMode !== 'context') {
      return (
        <div className="ctx-empty">
          <p className="ctx-empty-title">
            {contextElsewhereTitle(machineName)}
          </p>
          <p className="ctx-empty-body">
            {remoteMode === 'notConnected'
              ? contextNotConnected(machineName)
              : remoteMode === 'noHome'
                ? contextNoHome(machineName)
                : contextNoAnswer(machineName)}
          </p>
        </div>
      );
    }
    // §11.1 — nothing anywhere. Not "no results": there is nothing to have
    // results from, and the two states read completely differently.
    if (entries.length === 0) {
      return (
        <div className="ctx-empty">
          <p className="ctx-empty-title">{CONTEXT_COPY.emptyTitle}</p>
          <p className="ctx-empty-body">
            {/* PHASE 108. On a remote tab the body says where adding happens,
                in place of the Find a skill button below: install is refused
                over there, so the button would be a dead control. */}
            {remote ? contextEmptyOnMachine(machineName) : CONTEXT_COPY.emptyBody}
          </p>
          {/* The one primary §11 item 1 gives this state, and only when
              something is actually wired to it. An empty state whose button
              did nothing would be worse than an empty state with no button. */}
          {verbs.newSkill !== undefined ? (
            <button
              type="button"
              className="btn btn-primary ctx-empty-action"
              onClick={verbs.newSkill}
            >
              Find a skill…
            </button>
          ) : null}
        </div>
      );
    }
    return (
      <>
      <div
        ref={sectionsRef}
        className="ctx-sections"
        role="listbox"
        aria-label="Agent configuration"
        {...(selected !== null
          ? { 'aria-activedescendant': `ctx-row-${selected}` }
          : {})}
        tabIndex={0}
        onKeyDown={onListKeyDown}
        {...sectionDrag.containerProps}
      >
        {order.map((id) => (
          <Section
            key={id}
            id={id as ContextSectionId}
            entries={entries}
            roots={roots}
            problems={problems.filter(
              (p) =>
                p.category === CONTEXT_SECTION_CATEGORY[id as ContextSectionId]
            )}
            // The persisted collapse keys. `targetKey` of a folder on this
            // Mac is the bare path, so every key written before Phase 108 is
            // still found, and a project on a machine gets its own key
            // instead of sharing one empty string with every other one.
            cwd={target === null ? '' : targetKey(target)}
            filter={filter}
            {...(verbs.searchFor !== undefined
              ? { onSearchRegistry: verbs.searchFor }
              : {})}
            agentId={agentId}
            precedence={precedence[id as ContextSectionId]}
            selected={selected}
            // §6.5 — in specific-agent mode the chip would say the same number
            // on every row, and redundancy at 24px is clutter, not reassurance.
            showAgentChip={agentId === null}
            marks={readout.marks}
            pins={pins}
            onSelect={setSelected}
            onActivate={onActivate}
            onMenu={onMenu}
            onGroupMenu={onGroupMenu}
            onHover={onHover}
            onOpenProblem={onOpenProblem}
            onRevealDir={menuDeps.revealPath}
          />
        ))}
        {sectionDrag.overlay}
      </div>
      {/* PHASE 108. The note under the sections whenever the scan came from
          a machine, in the position the search view's note already uses for
          the same job. The first two lines are always drawn together; the
          third only when the pass cap cut the read, so a cut list can never
          draw as a whole one. */}
      {remote && remoteMode === 'context' ? (
        <div className="ctx-remote-note">
          <p>{contextOnMachineLine(machineName)}</p>
          <p>{CONTEXT_NESTED_NOT_LISTED}</p>
          {remoteCut ? <p>{contextCutLine(machineName)}</p> : null}
        </div>
      ) : null}
      </>
    );
  };

  return (
    <>
      {/* §8.3 — session mode only. Every branch says what is TRUE, including
          the ones that say nothing is: "nothing has changed since" is a real
          answer to the question the user asked, and it is the answer most of
          the time. The sentences come from shared code, which also owns the
          one for a session Tortie has no record of, because "no drift" and "no
          record" look identical on screen and mean opposite things. */}
      {mode === 'session' && !readout.loading ? (
        <div className="ctx-drift-line">
          {readout.header.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      ) : null}
      <div className="ctx-filter">
        <FilterField
          icon="filter"
          value={filter}
          onChange={setFilter}
          placeholder="Filter context by name"
        />
      </div>
      {/* §11.3 — one quiet line, under the sections, not instead of them.
          The one row of storefront this design allows, and it is the whole
          storefront: a query with no local match offers to look for it. There
          is no featured row, no trending list and no recommendation anywhere
          (§13.4). */}
      {filter.trim() !== '' && visible.length === 0 && entries.length > 0 ? (
        <div className="ctx-no-match">
          <span>{CONTEXT_COPY.noFilterMatch(filter.trim())}</span>
          {verbs.searchFor !== undefined ? (
            <button
              type="button"
              className="btn-text ctx-search-source"
              onClick={() => verbs.searchFor?.(filter.trim())}
            >
              {`Search skills.sh for "${filter.trim()}"`}
            </button>
          ) : null}
        </div>
      ) : null}
      {body()}
      {hover !== null ? (
        <ContextHoverCard
          entry={hover.entry}
          anchor={hover.anchor}
          totalAgents={scan?.agents.length ?? 0}
          onCopyPath={(path) => menuDeps.copyText(path)}
        />
      ) : null}
      {/* Phase 26 item 3 — the "Enable for…" picker. A body portal, because a
          scrim clipped to the sidebar column is not a modal. The confirm it
          hands off to is the InstallDialog already mounted in App. */}
      <EnableForDialog />
    </>
  );
}

/** True while the keyboard is inside the Context view. */
export function focusInsideContext(): boolean {
  const el = document.activeElement;
  return el instanceof Element && el.closest('[data-view="context"]') !== null;
}
