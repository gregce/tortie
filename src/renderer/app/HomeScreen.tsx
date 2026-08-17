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
 * never on how many recents exist. The mechanism is one `min-height` in
 * home-screen.css and the reasoning is written there. Read it before changing
 * either half: centring the column plainly, or anchoring it to the top, each
 * satisfies one of the two requirements and breaks the other.
 *
 * Five parts, in this order (§0):
 *   1. the lockup, which is the mark at 48px beside the TORTIE.sh wordmark
 *   2. the promise, one sentence, the only line that says why Tortie exists
 *   3. three action rows, Open then New then Clone
 *   4. up to five recent projects
 *   5. one hint about dropping a folder
 *
 * What is NOT here, and must not come back (§5): a status dot on a recent
 * row, a needs-input count badge, a pulse, a last-opened time, a session
 * count and a branch name. The Zen forbids a number that rises on its own on
 * a screen where the user cannot act on it, and the menu bar tray already
 * lists every live session. Read §5.1 before adding any of them back.
 *
 * There is no motion on this screen at all (§1.12). DESIGN.md §5 says nothing
 * animates on app load, and the one thing that could have pulsed is cut.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RecentProject } from '@shared/ipc';
import { keyDisplay } from '@shared/keymap';
import { Codicon } from '../icons';
import { Keycap } from '../keys';
import { canReveal, reveal } from '../tree/fs-bridge';
import { useApp } from '../state/store';
// Recents are their own leaf store (Phase 18.6 item 2). The screen reads the
// rows and the missing set, and asks it to forget one. It owns nothing else
// about them: the file, the native File > Open Recent menu and the after-paint
// existence check all live behind that module.
import { useHomeRecents, useRecents } from '../state/recents';
import { displayPath, parentDir, truncateMiddle } from './format';
// Phase 62.1. The one line that mirrors the update ring's state, because
// this screen has no activity bar and a manual check started here was
// silent. It is text only and its slot is reserved, so nothing shifts.
import { HomeUpdateLine } from './HomeUpdateLine';
import { recentMenuItems } from './recent-menu';
// Phase 12.85: the ONE in-window Tortie mark, copied from the brand package
// (docs/brand/tortie/dock/tortie-dock-128.png) by `npm run icon`. §1.7 keeps
// the shipping mark at full opacity: its outline and shell measure 10.39:1 on
// --bg-canvas and carry the form, and a logotype beside real text is exempt
// from the 3:1 floor. A dark-ground variant is brand work, not a gate here.
import tortieMark from '../assets/brand/tortie-128.png';
import './home-screen.css';

// ---------------------------------------------------------------------------
// Copy — §1.11 is the authority on every string on this screen
// ---------------------------------------------------------------------------

const PROMISE = 'Sessions you start keep running even when Tortie is closed.';
const HINT = 'Drop a folder anywhere in this window to open it.';
const MISSING = 'Tortie cannot find this folder.';

/**
 * Characters kept in the mono parent path before truncateMiddle folds it.
 * 28 characters of SF Mono at 11px is about 185px, which leaves the name more
 * than half of the 460px column even when the path is long.
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

interface ActionSpec {
  id: string;
  /** Codicon id. Each one is the glyph the app already uses for that verb. */
  icon: string;
  title: string;
  subtitle: string;
  /** The keycap chip, or null for a verb with no chord. */
  chip: string | null;
  run: () => void;
}

export function HomeScreen({ onClone }: HomeScreenProps): React.JSX.Element {
  const openProject = useApp((s) => s.openProject);
  const setNewProjectOpen = useApp((s) => s.setNewProjectOpen);
  const canCreateProject = useApp((s) => s.canCreateProject());
  const addProjectPath = useApp((s) => s.addProjectPath);
  const setMenu = useApp((s) => s.setMenu);
  const toast = useApp((s) => s.toast);
  const { recents, missing } = useHomeRecents();
  const removeRecent = useRecents((s) => s.remove);

  // Order is the hierarchy (§1.8). Open is first because it is the common
  // case. There is no accent fill, no coloured icon and no visual primary —
  // the order and the initial keyboard focus carry the rank.
  const actions = useMemo<readonly ActionSpec[]>(() => {
    const list: ActionSpec[] = [
      {
        id: 'open',
        icon: 'folder-opened',
        title: 'Open project…',
        subtitle: 'Any folder works. A git repository gets the full sidebar.',
        chip: keyDisplay('project.open'),
        run: () => void openProject()
      }
    ];
    // An older preload with no projects:create hides the verb rather than
    // offering one that cannot work. Same guard as project-menu.ts.
    if (canCreateProject) {
      list.push({
        id: 'new',
        icon: 'new-folder',
        title: 'New project…',
        subtitle: 'Create an empty folder and start a git repository in it.',
        chip: keyDisplay('project.new'),
        run: () => setNewProjectOpen(true)
      });
    }
    if (onClone !== undefined) {
      list.push({
        id: 'clone',
        icon: 'repo-clone',
        title: 'Clone repository…',
        subtitle: 'Download a git repository and open it as a project.',
        // No chord, on purpose (§0). Every built-in chord leaves the pool the
        // user may record for a per-agent hotkey, and that is a bad trade for
        // a weekly action. Clone lives in three places already.
        chip: null,
        run: onClone
      });
    }
    return list;
  }, [canCreateProject, onClone, openProject, setNewProjectOpen]);

  // -- one list, one tab stop (§1.13) ---------------------------------------
  // The three actions and the recents are walked by Up and Down as a single
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

  const openRecent = (entry: RecentProject): void => {
    if (missing.has(entry.path)) {
      // The folder moved or was deleted, so the row hands the user the picker
      // to point at where it went. Seeding the picker at the last known
      // parent is not possible today: projects:pickDirectory is a frozen
      // channel that takes no argument. Phase 74 appended
      // projects:pickDirectoryFor beside it, and that sentence is still true,
      // because the new channel takes which question the panel asks and not a
      // folder to start in. Seeding would need a third argument that neither
      // channel has.
      void openProject();
      return;
    }
    void addProjectPath(entry.path);
  };

  const recentMenu = (e: React.MouseEvent, entry: RecentProject): void => {
    e.preventDefault();
    const items = recentMenuItems(
      { path: entry.path, missing: missing.has(entry.path) },
      {
        open: () => openRecent(entry),
        reveal: () => {
          void reveal(entry.path).catch(() =>
            toast('error', 'Could not reveal the folder in Finder')
          );
        },
        copyPath: () => void navigator.clipboard.writeText(entry.path),
        remove: () => void removeRecent(entry.path)
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
            {recents.map((entry, n) => {
              const i = actions.length + n;
              const gone = missing.has(entry.path);
              const parent = parentDir(entry.path);
              return (
                <button
                  key={entry.path}
                  type="button"
                  className="home-row home-recent"
                  data-missing={gone ? 'true' : undefined}
                  ref={(el) => {
                    rows.current[i] = el;
                  }}
                  tabIndex={active === i ? 0 : -1}
                  onFocus={() => setActive(i)}
                  onClick={() => openRecent(entry)}
                  onContextMenu={(e) => recentMenu(e, entry)}
                  title={gone ? MISSING : entry.path}
                  {...(gone
                    ? { 'aria-label': `${entry.name}. ${MISSING}` }
                    : {})}
                >
                  <span className="home-recent-name">{entry.name}</span>
                  {/* Mono, because DESIGN.md §1.8 reserves it for terminal
                      adjacent truth and names a path shown as a path. */}
                  <span className="home-recent-path">
                    {truncateMiddle(displayPath(parent), PATH_CHARS)}
                  </span>
                  {/* Reserved on every row, so marking one causes no reflow.
                      Three redundant channels carry the missing state: the
                      name steps down, the path is struck through, and this
                      icon appears. No state is ever colour alone. */}
                  <span className="home-recent-warn">
                    {gone ? <Codicon name="warning" size={12} /> : null}
                  </span>
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
