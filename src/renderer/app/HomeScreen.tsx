/**
 * The home screen — the full-window state with no project open.
 * Specification: docs/research/35-home-screen.md §1 and §2. Phase 18.6 item 1.
 *
 * It stops being an empty state. The other two full-window states (§6.2 no
 * sessions, §6.4 tmux missing) name an absence inside chrome that is already
 * there. This one is the whole window on launch, it carries the product's
 * name, and it holds its own data and its own three verbs. That is why it
 * lives in its own module instead of growing EmptyStates.tsx into two
 * unrelated domains, which is the split trigger in CLAUDE.md.
 *
 * The shape is one 460px column, centred in the window, with its contents left
 * aligned inside it (§1.1). Left aligned because the screen contains a list,
 * and a centred list gives the eye no stable left edge to return to. This is a
 * deliberate break from the centred family DESIGN-SPEC S9 gives the other
 * full-window states, and §1.1 records the reason and the cost.
 *
 * Vertically it is the TALLEST state that is centred, and every shorter state
 * keeps that same top edge, so the mark's height depends on the window and
 * never on how many recents exist. The mechanism is a `min-height` in
 * home-screen.css and the reasoning is written there. Read it before changing
 * either half: centring the column plainly, or anchoring it to the top, each
 * satisfies one of the two requirements and breaks the other.
 *
 * Since Phase 92 there are two values for that box, one for a window taller
 * than 760 px and one for a window at or below it, because a short window
 * draws three recent rows rather than five. The box is still a constant from
 * the first frame, because the window's height is known then. It is never
 * sized from the machines list or the recents list, because both of those
 * arrive after the first paint.
 *
 * Five parts, in this order (§0):
 *   1. the lockup, which is the mark at 48px beside the TORTIE.sh wordmark
 *   2. the promise, one sentence, the only line that says why Tortie exists
 *   3. the action rows, Open then Open on a machine then New then Clone
 *   4. up to five recent projects
 *   5. one hint about dropping a folder
 *
 * What is NOT here, and must not come back (§5): a status dot on a recent
 * row, a needs-input count badge, a pulse, a last-opened time, a session
 * count and a branch name. The Zen forbids a number that rises on its own on
 * a screen where the user cannot act on it, and the menu bar tray already
 * lists every live session. Read §5.1 before adding any of them back.
 *
 * PHASE 92 ADDED TWO THINGS AND NEITHER IS ON THAT LIST. The first is a fourth
 * action row that opens a folder on another machine, and it appears only when
 * this person has confirmed at least one machine. The second is the machine's
 * name, drawn as one quiet run of muted text after the path on a recent row.
 *
 * A machine's name is IDENTITY and not status. It says where the folder is,
 * which is a fact that does not change while a person watches, and it is the
 * only way to tell two rows apart when the same path exists on two computers.
 * Nothing about the link reaches this screen: no dot, no colour, no badge, no
 * icon and no tooltip about whether that machine is answering. A row on
 * another machine is never marked missing either, because checking would mean
 * asking another computer on every paint, and this screen never waits on a
 * filesystem, let alone a network. If the folder has gone over there, the
 * click says so.
 *
 * There is no motion on this screen at all (§1.12). DESIGN.md §5 says nothing
 * animates on app load, and the one thing that could have pulsed is cut.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { AddRemoteProjectResult, MachineStateView } from '@shared/ipc';
import { keyDisplay } from '@shared/keymap';
import { Codicon } from '../icons';
import { Keycap } from '../keys';
import { canReveal, reveal } from '../tree/fs-bridge';
import { useApp } from '../state/store';
// Phase 92. The confirmed set and the label lookup are two pure reads over the
// machine list main last sent. The screen holds no other machine knowledge.
import { confirmedMachines, machineLabelFor } from '../state/machines-slice';
// Recents are their own leaf store (Phase 18.6 item 2). The screen reads the
// rows, each one already carrying its key, its machine and whether the folder
// is gone, and asks the store to forget one. It owns nothing else
// about them: the file, the native File > Open Recent menu and the after-paint
// existence check all live behind that module.
import { useHomeRecents, useRecents } from '../state/recents';
import type { HomeRecentRow } from '../state/recents';
import { displayPath, parentDir, truncateMiddle } from '../format';
// Every sentence this screen says about a machine comes from the one file the
// vocabulary audit reads, including the refusal a click can produce.
import {
  addRemoteRefusal,
  OPEN_ON_ANY_MACHINE_TITLE,
  OPEN_ON_MACHINE_SUBTITLE,
  openOnMachineTitle,
  remoteRecentTooltip
} from '../machines/presentation';
// Phase 62.1. The one line that mirrors the update ring's state, because
// this screen has no activity bar and a manual check started here was
// silent. It is text only and its slot is reserved, so nothing shifts.
import { HomeUpdateLine } from './HomeUpdateLine';
import { recentMenuItems } from './recent-menu';
// Phase 92. The harness drive that injects machine rows and reads the column's
// geometry. It assigns one function to `window` and changes nothing else, so
// outside the harness it is one unused property. Registered here rather than in
// a component body, exactly as the tree's own drives are.
import { registerHomeMachinesDrive } from './home-machines-drive';
// Phase 12.85: the ONE in-window Tortie mark, copied from the brand package
// (docs/brand/tortie/dock/tortie-dock-128.png) by `npm run icon`. §1.7 keeps
// the shipping mark at full opacity: its outline and shell measure 10.39:1 on
// --bg-canvas and carry the form, and a logotype beside real text is exempt
// from the 3:1 floor. A dark-ground variant is brand work, not a gate here.
import tortieMark from '../assets/brand/tortie-128.png';
import './home-screen.css';

registerHomeMachinesDrive();

// ---------------------------------------------------------------------------
// Copy — §1.11 is the authority on every string on this screen
// ---------------------------------------------------------------------------

const PROMISE = 'Sessions you start keep running even when Tortie is closed.';
const HINT = 'Drop a folder anywhere in this window to open it.';
const MISSING = 'Tortie cannot find this folder.';

/**
 * Characters kept in the mono parent path before truncateMiddle folds it.
 * 28 characters of the mono stack at 11px is about 185px, which leaves the name
 * more than half of the 460px column even when the path is long. The face that
 * draws is Menlo. Phase 73.1 deleted the name `SF Mono` from this note, because
 * nothing on this Mac is registered under it and the note read as if it were
 * the face being measured. The 185px figure is unchanged, because the face that
 * produced it is the face that draws.
 */
const PATH_CHARS = 28;

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

export interface HomeScreenProps {
  /**
   * The Clone verb, or undefined on a build that cannot clone.
   *
   * `cloneAction()` in state/clone.ts returns exactly this, and undefined
   * hides the Clone row rather than offering a button that throws. That is
   * what §3.14 asks of a preload with no `projects:clone`. Taking it as a
   * prop rather than reading the clone store here keeps this screen free of
   * the dialog: the row cannot appear until something real is behind it.
   */
  onClone?: () => void;
}

export interface ActionSpec {
  id: string;
  /** Codicon id. Each one is the glyph the app already uses for that verb. */
  icon: string;
  title: string;
  subtitle: string;
  /** The keycap chip, or null for a verb with no chord. */
  chip: string | null;
  run: () => void;
}

/**
 * What the action list is decided from. Four facts and four verbs.
 *
 * PHASE 92 PULLED THIS OUT OF THE COMPONENT, for the reason ./recent-menu.ts is
 * its own module: the SHAPE of the list is the part that regresses in silence,
 * and this repository has no jsdom, so a rendered row cannot be clicked in a
 * test. A pure builder can be, and it is the same function the screen runs.
 */
export interface HomeActionsInput {
  /** Whether this build can create a project folder. */
  canCreateProject: boolean;
  /** Whether this build can open a folder on another machine. */
  canAddRemote: boolean;
  /** The confirmed machines, in the order the machines file holds them. */
  confirmed: readonly MachineStateView[];
  /** The Clone verb, or undefined on a build that cannot clone. */
  onClone?: () => void;
  openProject(): void;
  setNewProjectOpen(open: boolean): void;
  setRemoteProjectOpen(open: boolean): void;
}

/**
 * The action rows, in order.
 *
 * Order is the hierarchy (§1.8). Open is first because it is the common case.
 * There is no accent fill, no coloured icon and no visual primary, so the order
 * and the initial keyboard focus carry the rank.
 */
export function homeActions(input: HomeActionsInput): ActionSpec[] {
  const list: ActionSpec[] = [
    {
      id: 'open',
      icon: 'folder-opened',
      title: 'Open project…',
      subtitle: 'Any folder works. A git repository gets the full sidebar.',
      chip: keyDisplay('project.open'),
      run: () => input.openProject()
    }
  ];
  // PHASE 92. Between Open and New, because it is a kind of Open.
  //
  // TWO CONDITIONS AND BOTH ARE REQUIRED. The build has to carry the verb at
  // all, which an older preload does not, and this person has to have confirmed
  // at least one machine. Without the second the row would open a sheet with
  // nothing in it to choose.
  //
  // ONE ROW, however many machines exist. One row per machine was refused: this
  // screen's height is fixed, and a list that grows with the machines file
  // pushes the recent projects off the bottom. With exactly one usable machine
  // the sheet already preselects it, so the row hands over no argument and this
  // phase writes no second picker.
  const onlyMachine =
    input.confirmed.length === 1 ? input.confirmed[0] : undefined;
  if (input.canAddRemote && input.confirmed.length > 0) {
    list.push({
      id: 'open-remote',
      // The glyph the Machines section of Settings already uses, so the two
      // surfaces name the same thing with the same mark.
      icon: 'vm',
      title:
        onlyMachine === undefined
          ? OPEN_ON_ANY_MACHINE_TITLE
          : openOnMachineTitle(onlyMachine.label),
      subtitle: OPEN_ON_MACHINE_SUBTITLE,
      // No chord, for the reason Clone has none. Every built-in chord leaves
      // the pool a person may record as a per-agent hotkey.
      chip: null,
      run: () => input.setRemoteProjectOpen(true)
    });
  }
  // An older preload with no projects:create hides the verb rather than
  // offering one that cannot work. Same guard as project-menu.ts.
  if (input.canCreateProject) {
    list.push({
      id: 'new',
      icon: 'new-folder',
      title: 'New project…',
      subtitle: 'Create an empty folder and start a git repository in it.',
      chip: keyDisplay('project.new'),
      run: () => input.setNewProjectOpen(true)
    });
  }
  const clone = input.onClone;
  if (clone !== undefined) {
    list.push({
      id: 'clone',
      icon: 'repo-clone',
      title: 'Clone repository…',
      subtitle: 'Download a git repository and open it as a project.',
      // No chord, on purpose (§0). Every built-in chord leaves the pool the
      // user may record for a per-agent hotkey, and that is a bad trade for a
      // weekly action. Clone lives in three places already.
      chip: null,
      run: clone
    });
  }
  return list;
}

/** What a click on a recent row is decided from. */
export interface OpenRecentInput {
  /** The machine list, for the label a refusal sentence names. */
  machineStates: readonly MachineStateView[];
  addRemoteProject(
    machineId: string,
    path: string
  ): Promise<AddRemoteProjectResult>;
  addProjectPath(path: string): Promise<void> | void;
  openProject(): Promise<void> | void;
  toast(kind: 'error', text: string): void;
}

/**
 * PHASE 92. The click branches on which computer the folder is on, and the two
 * branches share nothing.
 *
 * A local row keeps exactly what it did before, including handing over the
 * picker when the folder is gone. A row on another machine asks that machine,
 * and a refusal becomes the sentence presentation.ts already writes for that
 * reason word. It cannot hang: main's own add checks the link first and answers
 * `notConnected` without contacting anything when the machine is not signed in.
 */
export async function openRecentRow(
  row: HomeRecentRow,
  input: OpenRecentInput
): Promise<void> {
  const entry = row.entry;
  if (row.remote) {
    const label = machineLabelFor(input.machineStates, row.machineId);
    const result = await input.addRemoteProject(row.machineId, entry.path);
    if (!result.ok) {
      input.toast('error', addRemoteRefusal(result.reason, entry.path, label));
    }
    return;
  }
  if (row.missing) {
    // The folder moved or was deleted, so the row hands the user the picker to
    // point at where it went. Seeding the picker at the last known parent is
    // not possible today: projects:pickDirectory is a frozen channel that takes
    // no argument. Phase 74 appended projects:pickDirectoryFor beside it, and
    // that sentence is still true, because the new channel takes which question
    // the panel asks and not a folder to start in. Seeding would need a third
    // argument that neither channel has.
    await input.openProject();
    return;
  }
  await input.addProjectPath(entry.path);
}

/**
 * The machine's label for a recent row, or null when the folder is on this Mac.
 *
 * The id is the fallback inside {@link machineLabelFor}, because a person can
 * forget a machine while its row is on screen. A short unfamiliar word says
 * more than a blank, which is what the three sidebars already decided.
 */
export function recentRowMachineLabel(
  row: HomeRecentRow,
  machineStates: readonly MachineStateView[]
): string | null {
  return row.remote ? machineLabelFor(machineStates, row.machineId) : null;
}

/** The row's hover title. The pair when the folder is on another machine. */
export function recentRowTitle(
  row: HomeRecentRow,
  label: string | null
): string {
  if (row.missing) return MISSING;
  if (label === null) return row.entry.path;
  return remoteRecentTooltip(row.entry.path, label);
}

/**
 * What is inside a recent row's button.
 *
 * IT IS ITS OWN COMPONENT so a test can hold the markup. This repository has no
 * jsdom and zustand answers a server render from its INITIAL state, so
 * rendering the whole screen would draw the empty first-launch shape whatever a
 * test put in the stores. A component that takes its row as a prop draws the
 * row the test asked for.
 */
export function HomeRecentRowBody({
  row,
  label
}: {
  row: HomeRecentRow;
  label: string | null;
}): React.JSX.Element {
  return (
    <>
      <span className="home-recent-name">{row.entry.name}</span>
      {/* Mono, because DESIGN.md §1.8 reserves it for terminal adjacent truth
          and names a path shown as a path. The machine id is passed so a path
          on another machine is drawn exactly as that machine states it, with
          no `~`. */}
      <span className="home-recent-path">
        {truncateMiddle(
          displayPath(parentDir(row.entry.path), row.machineId),
          PATH_CHARS
        )}
      </span>
      {/* The machine's name, on a row whose folder is elsewhere. One quiet run
          of muted text in the UI font, with no dot, no fill, no border and no
          icon, because it says WHERE the folder is and never how that machine
          is doing. A screen reader reads it as part of the button, so the row
          needs no aria-label of its own. */}
      {label === null ? null : (
        <span className="home-recent-machine">{label}</span>
      )}
      {/* Reserved on every row, so marking one causes no reflow. Three
          redundant channels carry the missing state: the name steps down, the
          path is struck through, and this icon appears. No state is ever colour
          alone. A row on another machine is never marked, so this slot is
          always empty there. */}
      <span className="home-recent-warn">
        {row.missing ? <Codicon name="warning" size={12} /> : null}
      </span>
    </>
  );
}

export function HomeScreen({ onClone }: HomeScreenProps): React.JSX.Element {
  const openProject = useApp((s) => s.openProject);
  const setNewProjectOpen = useApp((s) => s.setNewProjectOpen);
  const canCreateProject = useApp((s) => s.canCreateProject());
  const addProjectPath = useApp((s) => s.addProjectPath);
  const setMenu = useApp((s) => s.setMenu);
  const toast = useApp((s) => s.toast);
  // Phase 92. The four reads the machine row and the remote recents need.
  const machineStates = useApp((s) => s.machineStates);
  const canAddRemote = useApp((s) => s.canAddRemoteProject());
  const setRemoteProjectOpen = useApp((s) => s.setRemoteProjectOpen);
  const addRemoteProject = useApp((s) => s.addRemoteProject);
  const { rows: recents } = useHomeRecents();
  const removeRecent = useRecents((s) => s.remove);

  /**
   * The machines this person confirmed, whether or not they are answering now.
   *
   * It is memoised because the actions list below depends on it, and a fresh
   * array on every render would rebuild that list on every render.
   */
  const confirmed = useMemo(
    () => confirmedMachines(machineStates),
    [machineStates]
  );

  const actions = useMemo<readonly ActionSpec[]>(
    () =>
      homeActions({
        canCreateProject,
        canAddRemote,
        confirmed,
        onClone,
        openProject: () => void openProject(),
        setNewProjectOpen,
        setRemoteProjectOpen
      }),
    [
      canAddRemote,
      canCreateProject,
      confirmed,
      onClone,
      openProject,
      setNewProjectOpen,
      setRemoteProjectOpen
    ]
  );

  // -- one list, one tab stop (§1.13) ---------------------------------------
  // The action rows and the recents are walked by Up and Down as a single
  // list with a roving tabindex. They are buttons in labelled groups and not
  // a listbox, because each row performs an action rather than selecting a
  // value. Arrow handling is written by hand, which is what DESIGN.md §4 asks
  // of every list in the app.
  const rowCount = actions.length + recents.length;
  const rows = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive((at) => (at < rowCount ? at : 0));
  }, [rowCount]);

  // Focus lands on the first action row on arrival, every time. Focusing the
  // most recent project instead was rejected: the same keystroke would then
  // do one thing on a first launch and a different thing on the next, and a
  // default action that depends on history is not predictable (§1.13).
  useEffect(() => {
    rows.current[0]?.focus();
  }, []);

  const move = (delta: number): void => {
    // Rows hidden by the short-window cap are display:none and therefore have
    // no offsetParent, so the walk steps over them instead of focusing a row
    // nobody can see.
    const shown = rows.current
      .map((el, i) => ({ el, i }))
      .filter(
        (r): r is { el: HTMLButtonElement; i: number } =>
          r.el !== null && r.el.offsetParent !== null
      );
    if (shown.length === 0) return;
    const from = shown.findIndex((r) => r.i === active);
    // No wrapping, which is the macOS list convention (§1.13).
    const to = Math.min(
      shown.length - 1,
      Math.max(0, (from === -1 ? 0 : from) + delta)
    );
    const next = shown[to];
    if (next === undefined) return;
    setActive(next.i);
    next.el.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    }
  };

  // -- recents behaviour ----------------------------------------------------

  const openRecent = (row: HomeRecentRow): void => {
    void openRecentRow(row, {
      machineStates,
      addRemoteProject,
      addProjectPath,
      openProject,
      toast
    });
  };

  const recentMenu = (e: React.MouseEvent, row: HomeRecentRow): void => {
    e.preventDefault();
    const entry = row.entry;
    const items = recentMenuItems(
      { path: entry.path, missing: row.missing, remote: row.remote },
      {
        open: () => openRecent(row),
        reveal: () => {
          void reveal(entry.path).catch(() =>
            toast('error', 'Could not reveal the folder in Finder')
          );
        },
        copyPath: () => void navigator.clipboard.writeText(entry.path),
        // The pair, never the path. Two machines can hold the same path, and
        // forgetting one row must not forget the other.
        remove: () => void removeRecent(entry.path, entry.machineId)
      },
      canReveal()
    );
    setMenu({ x: e.clientX, y: e.clientY, items });
  };

  return (
    <div className="home" data-slot="terminal-stack">
      <div className="home-col">
        {/* The wordmark is the only h1 in the application (§1.6). Every other
            full-window state uses an h2, because those label a region and
            this one names the product. Both spans are hidden from assistive
            technology and the heading carries the name, so a screen reader
            announces "Tortie.sh" once rather than reading TORTIE and .sh as
            two runs. The mark is decorative for the same reason. */}
        <div className="home-lockup">
          <img className="home-mark" src={tortieMark} alt="" aria-hidden="true" />
          <h1 className="home-word" aria-label="Tortie.sh">
            <span aria-hidden="true">TORTIE</span>
            <span className="home-word-suffix" aria-hidden="true">
              .sh
            </span>
          </h1>
        </div>

        {/* Phase 62.1. The update signal, directly under the lockup. The
            slot renders in every state at a fixed height, so its words can
            appear without moving the column. Main decides visibility; this
            screen draws exactly what the ring would draw. */}
        <HomeUpdateLine />

        {/* The promise. It is the only line on the screen that says why
            Tortie exists, and it sits in the slot a reader uses to find out
            what a thing is. Secondary rather than primary on purpose: the
            action titles are what the user has to click, and a sentence that
            outranks them is the wrong order (§1.10). */}
        <p className="home-promise">{PROMISE}</p>

        <div
          className="home-group"
          role="group"
          aria-label="Ways to open a project"
          onKeyDown={onKeyDown}
        >
          {actions.map((action, i) => (
            <button
              key={action.id}
              type="button"
              className="home-row home-action"
              ref={(el) => {
                rows.current[i] = el;
              }}
              tabIndex={active === i ? 0 : -1}
              onFocus={() => setActive(i)}
              onClick={action.run}
            >
              <span className="home-row-icon">
                <Codicon name={action.icon} size={18} />
              </span>
              <span className="home-row-text">
                <span className="home-row-title">{action.title}</span>
                <span className="home-row-subtitle">{action.subtitle}</span>
              </span>
              {action.chip !== null ? <Keycap>{action.chip}</Keycap> : null}
            </button>
          ))}
        </div>

        {/* No recents means no section at all (§1.4). There is no header, no
            placeholder row and no reserved box, because an empty labelled
            section is a structure that describes nothing. The column's box is
            a fixed height, so removing the block moves nothing above it and
            the mark sits at the same y in both states. */}
        {recents.length > 0 ? (
          <div
            className="home-group home-recents"
            role="group"
            aria-label="Recent projects"
            onKeyDown={onKeyDown}
          >
            <div className="home-group-label">Recent</div>
            {recents.map((row, n) => {
              const entry = row.entry;
              const i = actions.length + n;
              const label = recentRowMachineLabel(row, machineStates);
              return (
                <button
                  // The PAIR, never the path (Phase 92). Two machines can hold
                  // the same path, and a duplicate key would make React draw
                  // one row where there are two projects.
                  key={row.key}
                  type="button"
                  className="home-row home-recent"
                  data-missing={row.missing ? 'true' : undefined}
                  ref={(el) => {
                    rows.current[i] = el;
                  }}
                  tabIndex={active === i ? 0 : -1}
                  onFocus={() => setActive(i)}
                  onClick={() => openRecent(row)}
                  onContextMenu={(e) => recentMenu(e, row)}
                  title={recentRowTitle(row, label)}
                  {...(row.missing
                    ? { 'aria-label': `${entry.name}. ${MISSING}` }
                    : {})}
                >
                  <HomeRecentRowBody row={row} label={label} />
                </button>
              );
            })}
          </div>
        ) : null}

        {/* The whole-window folder drop is unchanged. Only the sentence that
            advertises it changed: both shortcuts now print on their own rows,
            so the old "Press ⌘O, or…" half was redundant (§1.13). */}
        <p className="home-hint">{HINT}</p>
      </div>
    </div>
  );
}
