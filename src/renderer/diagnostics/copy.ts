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
export const COL_PROJECT = 'Project';
export const COL_AGENT = 'Agent';
export const COL_PROCESSES = 'Processes';
export const COL_MEMORY = 'Memory';
export const COL_STARTED = 'Started';
/**
 * PHASE 188. NOT "Last active", and the difference is not pedantry. The
 * manifest field behind this column is `last_seen`, which its own schema and
 * repository comments define as "last confirmed alive". It moves on a
 * reconcile, on a status change and on a death, and never on a keystroke, so a
 * session running an agent flat out for four hours carries a four hour old
 * value. "Last active" would read as "quiet for four hours" about a session
 * that is working right now, which is wrong in the most misleading direction.
 */
export const COL_LAST_SEEN = 'Last seen';

export const COL_PROJECT_HOVER =
  'The project this session belongs to. Sessions are numbered per project, so two projects each have their own claude-1.';
export const COL_STARTED_HOVER = 'When this session was created.';
export const COL_LAST_SEEN_HOVER =
  'The last time Tortie confirmed this session, not the last time you typed in it.';

export const COL_PRIVATE_HOVER =
  'Memory this process alone holds. Read from the process itself where it runs JavaScript and from the OS footprint elsewhere.';
export const COL_RSS_HOVER =
  'Resident set as ps reports it. It counts shared pages more than once, so it overstates.';
export const COL_CPU_HOVER =
  'Percent of one core. Sampled over the capture window for Tortie’s own processes, a lifetime average for the rest.';

/** The section labels below the two tables. */
export const SECTION_NOW = 'Open right now';
export const SECTION_RENDERER = 'This window';
export const SECTION_MAIN = 'Main process';
export const SECTION_STARTUP = 'Startup';
export const SECTION_DISK = 'On disk';
export const SECTION_WATCHERS = 'File watching';
export const SECTION_ELECTRON = 'Every Electron process';

export const SECTION_STARTUP_HOVER =
  'Time from the moment Tortie started until each milestone landed, fixed once for this launch.';
export const SECTION_NOW_HOVER =
  'What Tortie holds open, counted with each capture.';

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

/** Phase 168. The glance strip: the summary before the detail. */
export const GLANCE_TORTIE = 'Tortie itself';
export const GLANCE_AGENTS = 'Your agents';
export const GLANCE_TOGETHER = 'Together';
export const GLANCE_TOGETHER_SUB = 'Tortie plus your agents';
export const GLANCE_TORTIE_HOVER =
  'The Tortie table’s own total, repeated here so the answer comes first.';
export const GLANCE_AGENTS_HOVER =
  'The sessions table’s own total, repeated here so the answer comes first.';
export const GLANCE_TOGETHER_HOVER =
  'The one place the two totals are added. The two tables below keep their own.';
export const GLANCE_CPU_HOVER =
  'Percent of one core over the capture window, read from one top sample taken inside it.';
export const GLANCE_MEMORY_HOVER =
  'Private memory where a process could answer, the OS footprint elsewhere, summed over the table’s rows.';
export const FIG_ENERGY = 'Energy impact';
export const ENERGY_UNAVAILABLE = 'unavailable';
export const ENERGY_HOVER =
  'An impact score in the style of Activity Monitor, summed from the power figure top reports for every Tortie and agent process. It is a score rather than watts, because the exact energy counter needs native code Tortie does not ship.';

/** Phase 168. The machine sentence, and the rule its hover states. */
export const MACHINE_HOVER =
  'Ranked by resident memory from one machine wide read taken with the capture. The other apps’ names appear here only and are never part of a copied report.';

/** Phase 168. The GPU row shows the OS footprint; the hover says why. */
export const GPU_FOOTPRINT_HOVER =
  'OS footprint, the number the machine pays for this process. Its own private figure leaves out the graphics memory it holds with the system.';

/** Phase 170. Live sampling, the operator's own override of the one capture stance. */
export const LIVE = 'Live';
export const LIVE_EVERY = 'every 2 s';
export const LIVE_PAUSED = 'Paused';
export const LIVE_HOVER =
  'Samples about every two seconds, only while this tab is visible. Hidden or closed, nothing runs.';
export const PAUSE = 'Pause';
export const RESUME = 'Resume';

/** Phase 170. The rows that carry more detail than their line, and the sortable heads. */
export const DETAIL_HOVER = 'More about this process';
export const COL_SORT_HOVER = 'Sort by this column';

/** Phase 170. Watcher rows with nothing to report rest behind a disclosure. */
export const WATCHERS_ALL_QUIET = 'Nothing dropped, nothing rescanned.';
export const WATCHERS_QUIET_ONE = 'quiet repository';
export const WATCHERS_QUIET_MANY = 'quiet repositories';
export const WATCHERS_QUIET_HOVER =
  'Watched repositories with no drops and no rescans since launch.';
