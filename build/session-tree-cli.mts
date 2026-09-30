/**
 * session-tree-cli.mts: build/harness-socket.mjs's one way to reach
 * src/main/proc/session-tree.ts (Phase 323, build/p323/SPEC.md §4.5).
 *
 * WHY IT EXISTS. `harness-socket.mjs` ends a harness's scratch tmux server with
 * `kill-server`, which only hangs up every pane. A created Gemini session
 * survives that, and so does anything else in a pane's own group that ignores
 * or catches the hang-up; the survivors re-parent to launchd and run for good.
 * The product's End learned to end those in Phase 323, and the wrapper must end
 * them the same way. It may not do it with a second copy of the matching and
 * ending logic, because that would be a duplicated block and two answers to
 * one question, so the plain `.mjs` runs this file under the pinned tsx and this
 * file calls the product's module. The `.mjs` never parses a process table and
 * never signals a process.
 *
 * THE TWO MODES.
 *
 *   read <socket>  Runs `tmux -L <socket>` with the module's ALL_PANES_ARGV, one
 *                  read of the process table, and `readSessionTree`, and prints
 *                  the tree as one line of JSON. It must run while the panes are
 *                  still alive, because after the hang-up a survivor's parent is
 *                  launchd and nothing can say whose it was. It signals
 *                  nothing. It refuses the operator's own sockets, `gmux` and
 *                  `default`, before it reads anything.
 *   end <socket>   Reads that JSON on stdin, runs `endHangupSurvivors` with the
 *                  module's own `defaultEndDeps()`, and prints `{"ended":N}`.
 *                  Every pid it signals is signalled only after a re-read shows
 *                  the same start time, command line and group the tree read
 *                  recorded, one pid at a time, never a group, a pattern or a
 *                  name, and only after the server on `<socket>` no longer
 *                  shows its pane (the pane check, Phase 323's second fix
 *                  round): after a `kill-server` that worked the server
 *                  answers "no server running" and no pane is shown, and after
 *                  one that failed every pane is still shown and nothing is
 *                  signalled. That is the module's promise, not this file's:
 *                  this file hands it a tree and prints what it did.
 *
 * WHAT IT IMPORTS. From this repository, src/main/proc/session-tree.ts and
 * nothing else (conformance:endtree E7 pins the importers). From Node, the
 * child process and file system modules, to ask tmux and to read stdin.
 *
 * EXIT CODES. 0 with the JSON on stdout. 2 for a usage refusal. 3 when the
 * process table could not be read, with `{"readFailed":true}` on stdout, so the
 * caller sends only the hang-up, which is what happened before Phase 323.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import {
  ALL_PANES_ARGV,
  defaultEndDeps,
  endHangupSurvivors,
  livePanesVia,
  parsePaneRoots,
  readSessionTree,
  TREE_READ_TIMEOUT_MS,
  type SessionTree,
  type TreeEntry
} from '../src/main/proc/session-tree';

/** How long the one `list-panes` may take before the read gives up. */
const TMUX_READ_TIMEOUT_MS = 5_000;

/**
 * The pane check over one scratch server, asked with `-u` like every tmux
 * this runner starts, within the module's read bound. Only "no server running"
 * confirms the server is gone (the sentence tmux prints once `kill-server` has
 * ended it and its socket file is still there, measured on the vendored 3.7b on
 * 2026-09-30); any other failure is not an answer.
 */
function panesOn(socket: string): () => Promise<ReadonlySet<number> | null> {
  return livePanesVia(
    (argv) => {
      const r = spawnSync('tmux', ['-u', '-L', socket, ...argv], {
        encoding: 'utf8',
        timeout: TREE_READ_TIMEOUT_MS
      });
      if (r.status === 0) return Promise.resolve(r.stdout);
      return Promise.reject(new Error(r.stderr || 'tmux did not answer'));
    },
    (err) => /no server running/i.test(err instanceof Error ? err.message : '')
  );
}

function usage(why: string): never {
  process.stderr.write(`[session-tree-cli] ${why}\n`);
  process.exit(2);
}

/**
 * A scratch harness socket and nothing else. The wrapper already refuses these
 * before it composes a name; this is the same refusal again at the one door
 * that reads a server's tree, so no caller can point it at his live work.
 */
function scratchSocket(name: string | undefined): string {
  if (name === undefined || name.length === 0) usage('read and end need a socket name');
  if (name === 'gmux' || name === 'default') {
    usage(`refusing to read the tree of -L ${name}: that is not a scratch server`);
  }
  if (!/^gmux-[A-Za-z0-9._-]+$/.test(name)) {
    usage(`refusing to read the tree of -L ${name}: not a gmux-<something> scratch socket`);
  }
  return name;
}

async function readMode(socket: string): Promise<number> {
  // `-u`, because a tmux client whose locale is not UTF-8 (`LC_ALL=C`, or no
  // locale at all, which is what a launchd job gets) is sent every tab and
  // every character outside ASCII as `_`: measured on 2026-09-29 on tmux 3.6a
  // and the vendored 3.7b, `12_0_34` for `12\t0\t34`, which parsed to no pane
  // and ended nothing, silently. PANE_ROOT_FORMAT is space separated since the
  // fix round, so it no longer depends on this; `-u` stays so nothing this
  // runner asks tmux depends on the caller's locale.
  const panes = spawnSync('tmux', ['-u', '-L', socket, ...ALL_PANES_ARGV], {
    encoding: 'utf8',
    timeout: TMUX_READ_TIMEOUT_MS
  });
  // No server, or no live pane: an empty tree, and the caller ends nothing.
  const roots = panes.status === 0 ? parsePaneRoots(panes.stdout) : [];
  if (roots.length === 0) {
    process.stdout.write(`${JSON.stringify({ all: [], targets: [] })}\n`);
    return 0;
  }
  const table = await defaultEndDeps(panesOn(socket)).readTable();
  if (table === null) {
    process.stdout.write(`${JSON.stringify({ readFailed: true })}\n`);
    return 3;
  }
  const tree = readSessionTree(table, roots, process.pid);
  process.stdout.write(
    `${JSON.stringify({ all: tree.all, targets: tree.targets })}\n`
  );
  return 0;
}

/** One recorded process, or null when the JSON does not hold exactly that shape. */
function entryOf(value: unknown): TreeEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const { pid, pgid, lstart, command } = v;
  if (typeof pid !== 'number' || !Number.isSafeInteger(pid) || pid <= 1) return null;
  if (typeof pgid !== 'number' || !Number.isSafeInteger(pgid) || pgid <= 1) return null;
  if (typeof lstart !== 'string' || lstart.length === 0) return null;
  if (typeof command !== 'string' || command.length === 0) return null;
  return { pid, pgid, lstart, command };
}

function entriesOf(value: unknown): TreeEntry[] {
  if (!Array.isArray(value)) return [];
  const out: TreeEntry[] = [];
  for (const item of value) {
    const e = entryOf(item);
    if (e !== null) out.push(e);
  }
  return out;
}

async function endMode(socket: string): Promise<number> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    usage('end needs the tree read printed on stdin');
  }
  const raw = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<
    string,
    unknown
  >;
  const tree: SessionTree = {
    all: entriesOf(raw['all']),
    targets: entriesOf(raw['targets'])
  };
  const report = await endHangupSurvivors(tree, defaultEndDeps(panesOn(socket)));
  process.stdout.write(
    `${JSON.stringify(
      report.readFailed
        ? { ended: report.ended.length, readFailed: true }
        : { ended: report.ended.length }
    )}\n`
  );
  return 0;
}

const [mode, arg] = process.argv.slice(2);
let code: number;
if (mode === 'read') code = await readMode(scratchSocket(arg));
else if (mode === 'end') code = await endMode(scratchSocket(arg));
else usage("usage: session-tree-cli.mts read <socket> | end <socket> < tree.json");
process.exitCode = code;
