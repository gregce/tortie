/**
 * Every word the diagnostics report surface says (Phase 163), in one file so
 * a test can pin them and so the resting face stays short.
 *
 * THE RULE THIS FILE KEEPS. The operator's rule for a surface is just enough
 * words: short labels, one line each, and the explanation lives behind a
 * hover or a disclosure, never on the resting face. So there are two kinds
 * of string here. A LABEL is one to three words and is what a person sees.
 * A HOVER is one sentence and is what a person reads when they want to know
 * why. Nothing here is a paragraph.
 */

export const DIAGNOSTICS_TITLE = 'Diagnostics report';

/** The two group labels. The split is the reason this surface exists. */
export const GROUP_SHELL = 'Tortie';
export const GROUP_SESSIONS = 'Your sessions';

export const GROUP_SHELL_HOVER =
  'What Tortie itself costs: the app, its windows, the session server and the helpers it runs.';
export const GROUP_SESSIONS_HOVER =
  'The work Tortie supervises, one row per session. It would exist in a plain terminal too, so it is never added to the Tortie total.';

/** Strays an earlier launch left running, under the Tortie table and never in its total. */
export const LEFTOVER = 'Left over from earlier launches';
export const LEFTOVER_HOVER =
  'Session views and probes an earlier Tortie left running. Shown so you can see them, and not counted in the Tortie total.';

/** The controls. */
export const CAPTURE_AGAIN = 'Capture again';
export const CAPTURING = 'Capturing';
export const COPY_REPORT = 'Copy report';
export const COPIED = 'Copied';
export const HEAP_SNAPSHOT = 'Heap snapshot';
export const HEAP_SNAPSHOT_HOVER =
  'Writes a heap snapshot to a file you choose. It can carry paths and text, so it is never part of a report.';
export const HEAP_MAIN = 'Save for the main process…';
export const HEAP_WINDOW = 'Save for this window…';

/** The column heads on the two tables. */
export const COL_PROCESS = 'Process';
export const COL_PID = 'PID';
export const COL_CPU = 'CPU';
export const COL_PRIVATE = 'Private';
export const COL_RSS = 'Resident';
export const COL_SESSION = 'Session';
export const COL_AGENT = 'Agent';
export const COL_PROCESSES = 'Processes';
export const COL_MEMORY = 'Memory';

export const COL_PRIVATE_HOVER =
  'Memory this process alone holds. Read from the process itself where it runs JavaScript and from the OS footprint elsewhere.';
export const COL_RSS_HOVER =
  'Resident set as ps reports it. It counts shared pages more than once, so it overstates.';
export const COL_CPU_HOVER =
  'Percent of one core. Sampled over the capture window for Tortie’s own processes, a lifetime average for the rest.';

/** The section labels below the two tables. */
export const SECTION_NOW = 'Right now';
export const SECTION_RENDERER = 'This window';
export const SECTION_MAIN = 'Main process';
export const SECTION_STARTUP = 'Startup';
export const SECTION_DISK = 'On disk';
export const SECTION_WATCHERS = 'File watching';
export const SECTION_ELECTRON = 'Every Electron process';

export const SECTION_STARTUP_HOVER =
  'Time from the moment Tortie started until each milestone landed, fixed once for this launch.';
export const SECTION_NOW_HOVER =
  'Counted when this capture was taken. Nothing here updates on its own.';

/** Short figure labels. */
export const FIG_SESSIONS = 'Sessions';
export const FIG_WINDOWS = 'Windows';
export const FIG_WATCHERS = 'Watched repositories';
export const FIG_REMOTE = 'Machine feeds';
export const FIG_SURFACES = 'Terminal surfaces';
export const FIG_LISTENERS = 'Held open';
export const FIG_HEAP = 'JavaScript heap';
export const FIG_BLINK = 'Page memory';
export const FIG_PRIVATE = 'Private memory';
export const FIG_LONG_TASKS = 'Long tasks';
export const FIG_IPC = 'Messages';
export const FIG_IPC_HOVER =
  'Calls from this window to the main process, and pushes back, counted over the capture window only.';
export const FIG_LONG_TASKS_HOVER =
  'Work that held this window for more than 50 milliseconds at a stretch, observed over the capture window.';

export const DISK_HTTP = 'HTTP cache';
export const DISK_CODE = 'Code cache';
export const DISK_DURABLE = 'Your sessions and settings';
export const DISK_PROFILE = 'Whole profile';
export const DISK_FREE = 'Free on this volume';
/** Phase 166. The ceiling row: a size in the dev shape, else Chromium's own. */
export const DISK_CEILING = 'HTTP cache ceiling';
export const DISK_CEILING_DEFAULT = 'Chromium default';

export const WATCHER_DROPS = 'dropped';
export const WATCHER_SCHEDULED = 'scheduled';
export const WATCHER_COMPLETED = 'completed';
export const WATCHERS_NONE = 'No repository is being watched.';

/** The states with nothing to draw. */
export const STATE_CAPTURING = 'Taking one capture.';
export const STATE_NO_BRIDGE = 'Diagnostics are not available in this build.';
export const STATE_FAILED = 'The capture failed.';
export const NOT_YET = 'not yet';
export const NOT_READ = 'not read';
export const NONE = 'none';
export const SESSIONS_NONE = 'No sessions are running.';
