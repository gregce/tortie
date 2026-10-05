/**
 * build/p3167/seed-sessions.mts — the session worlds Phase 316.7's probes
 * stand on (build/p3167/SPEC.md §9.3, §9.4, §9.5 and §9.7).
 *
 * ONE GENERATOR, FOUR SHAPES, every one deterministic (a seeded LCG and a
 * fixed `now` when the caller passes one), so a verifier re-deriving an
 * answer re-derives it over the same rows:
 *
 *   probe   probe:p3167's world: 2,000 sessions over 60 folders, two of them
 *           named `app`, ended and live-RECORDED rows (main's boot reconcile
 *           reads every recorded-live row whose tmux session is absent as
 *           restorable, so in the app they are all Ended), a 300-character
 *           name carrying U+202E and U+2066 to U+2069, three rows with no
 *           creation clock, a closed-tab name on a folder's SECOND member
 *           (§15 F12), and the agents claude, codex and shell. Records only:
 *           nothing of theirs runs.
 *   p316    probe:p316's `sessions` group: 120 ended sessions over four
 *           folders, two named `app`, the bidi name among them.
 *   cap     the hostile door's `sessions-cap` arm, FACTS ONLY (no manifest):
 *           2,400 sessions, about 2,150 live, so Active passes the 2,000-row
 *           cap and `omitted` is above 0 under the default words; every name
 *           300 characters with a surrogate pair astride the 200-unit clip;
 *           the bidi name; three `app` groups, one of them on a second
 *           machine; two agents.
 *   his     §4's recorded shape of his manifest, COUNTS ONLY (§9.7, §15 F20):
 *           354 rows, 252 removed and 102 listed (55 idle, 9 running, 38
 *           restorable), 23 folders no two sharing a name, the busiest 27
 *           sessions, 7 agents, names 8.6 characters on average and 27 at
 *           most, the oldest listed 49 days old, all on this Mac. NO ROLE
 *           READS HIS MANIFEST: this is the shape §4 wrote down once.
 *
 * AS A MODULE it is pure: `worldOf(shape, options)` answers the records and
 * the `Session` objects, and `factsOf(sessions, options)` is a `PocketFacts`
 * adapter that projects them the way `core.listSessions()` would (no file is
 * statted, no home is read), which the hostile door hands the SHIPPING
 * `createPocketRoutes(facts).sessions`. Importing it opens no database.
 *
 * AS A SCRIPT, under the pinned tsx (`build/ts-runner.mjs`'s `tsxCli()`):
 *
 *   seed-sessions.mts --manifest <scratch>/manifest.db --shape probe|p316|his
 *                     [--root <folder root>] [--count N] [--out <file.json>]
 *                     [--check [--verbose]] [--now <epoch ms>]
 *
 * writes the shape's rows into a SCRATCH manifest through the SHIPPING
 * `ManifestStore.insertSession` (src/main/manifest/store.ts), reads them back
 * through `ManifestStore.listSessions`, and prints one JSON line of COUNTS.
 * `--out` writes what the probe's own scans need (ids, names, folders) to a
 * file the caller names; nothing of a name is printed. `--check` then runs
 * the shipping composer (`createPocketRoutes(facts).sessions`) over every
 * Show × Group × Sort, with and without each agent and machine filter, and
 * prints counts only: each row in one group, the counts summing to each
 * total, the bytes under the budget, `omitted` 0 (Method 3, §9.7).
 *
 * WHAT IT REFUSES. A manifest path that is not under a temporary directory
 * (`os.tmpdir()`, /tmp, /private/tmp or /private/var/folders), one under any
 * `Library/Application Support`, one under the HOME this process was handed,
 * and one that already exists. It spawns nothing, opens no socket and reads
 * nothing under any home.
 */

import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { statusVisual } from '@shared/status-words';
import { END_UNREACHABLE_TITLE } from '@shared/lifecycle-words';
import type { Project, Session } from '@shared/types';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const DAY = 86_400_000;

export type Shape = 'probe' | 'p316' | 'cap' | 'his';
export const SHAPES: readonly Shape[] = Object.freeze(['probe', 'p316', 'cap', 'his']);

/**
 * The 300-character name every world carries once: U+202E (right-to-left
 * override) and U+2066 to U+2069 (the isolates and their close), so a drawn
 * label that reorders or swallows them is a label that is not its characters.
 */
export const BIDI_NAME = (() => {
  // Built from code points, so no bidi control is ever a literal in this file.
  const [rlo, pdf, lri, rli, fsi, pdi] = [0x202e, 0x202c, 0x2066, 0x2067, 0x2068, 0x2069].map((c) => String.fromCharCode(c));
  const piece = `p3167 bidi ${rlo}reversed${pdf} ${lri}left${pdi} ${rli}right${pdi} ${fsi}first${pdi} end `;
  let text = '';
  while (text.length < 300) text += piece;
  return text.slice(0, 300);
})();

/** The second machine of the `cap` world: an id the query reader accepts, a label the menu draws. */
export const CAP_MACHINE = Object.freeze({ id: 'farbox', label: 'Far box' });
/** The closed-tab name the `probe` world gives a folder's SECOND member (§15 F12). */
export const CLOSED_TAB_NAME = 'Payments service';

/** Agents' drawn names, the registry's `displayName`s spelled again for the adapter. */
export const AGENT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  claude: 'Claude Code',
  codex: 'Codex',
  shell: 'Shell',
  cursor: 'Cursor',
  opencode: 'OpenCode',
  pi: 'Pi',
  deepseek: 'DeepSeek'
});

const WORDS = ['fix', 'login', 'pocket', 'door', 'list', 'sort', 'phone', 'bug', 'tests', 'redline', 'arch', 'deploy', 'ios', 'review', 'search', 'notes', 'build', 'cache'];
const FOLDER_WORDS = ['api', 'web', 'docs', 'infra', 'billing', 'notes', 'site', 'cli', 'mobile', 'auth', 'search', 'data', 'tools', 'ops', 'design', 'mail', 'chat', 'maps', 'feed', 'shop'];

/** A seeded LCG: the same seed answers the same world. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** One record the manifest takes, the fields a listed session reads and nothing more. */
export interface SeedRecord {
  id: string;
  name: string;
  tmuxName: string;
  projectPath: string;
  cwd: string;
  agent: string;
  status: Session['status'];
  createdAt: number;
  lastSeen: number;
  argv: string[];
  exitCode?: number;
  projectTombstone?: { v: 1; projectId: string; projectName: string; path: string; closedAt: number };
}

/** What the generator answers. `live` is the cap world's facts: activity and wait stamps. */
export interface World {
  shape: Shape;
  now: number;
  records: SeedRecord[];
  sessions: Session[];
  folders: string[];
  bidiId: string | null;
  activity: Map<string, number>;
  stamps: Map<string, number>;
}

/** A session id the shape of the ones Tortie writes (a UUID), the same for the same shape and index. */
const idOf = (shape: Shape, i: number): string => {
  const h = createHash('sha256').update(`p3167:${shape}:${String(i)}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const argvOf = (agent: string): string[] => (agent === 'shell' ? ['/bin/zsh', '-l'] : [`/usr/local/bin/${agent}`]);

function record(shape: Shape, i: number, fields: Omit<SeedRecord, 'id' | 'tmuxName' | 'cwd' | 'lastSeen' | 'argv'> & { argv?: string[] }): SeedRecord {
  const { argv, ...rest } = fields;
  return {
    ...rest,
    id: idOf(shape, i),
    tmuxName: `${shape}-${String(i)}`,
    cwd: fields.projectPath,
    lastSeen: fields.createdAt,
    argv: argv ?? argvOf(fields.agent)
  };
}

/** A manifest record as `core.listSessions()` hands it on: the Session fields, its closed tab drawn as `closedProject`. */
export function sessionOf(r: SeedRecord, machine?: Session['machine']): Session {
  const s: Session = {
    id: r.id,
    name: r.name,
    tmuxName: r.tmuxName,
    projectPath: r.projectPath,
    cwd: r.cwd,
    agent: r.agent as Session['agent'],
    status: r.status,
    createdAt: r.createdAt,
    ...(r.exitCode === undefined ? {} : { exitCode: r.exitCode }),
    ...(machine === undefined ? {} : { machine })
  };
  if (r.projectTombstone !== undefined) {
    s.closedProject = { name: r.projectTombstone.projectName, path: r.projectTombstone.path, closedAt: r.projectTombstone.closedAt };
  }
  return s;
}

const words = (r: () => number, n: number): string => Array.from({ length: n }, () => WORDS[Math.floor(r() * WORDS.length)]).join(' ');

/** The probe world (§9.3): 2,000 rows by default. */
function probeWorld(root: string, count: number, now: number): World {
  const r = rng(316_7001);
  const folders: string[] = [join(root, 'one', 'app'), join(root, 'two', 'app')];
  for (let f = 2; folders.length < 60; f += 1) folders.push(join(root, 'src', `${FOLDER_WORDS[f % FOLDER_WORDS.length]}-${String(f)}`));
  const records: SeedRecord[] = [];
  const membersOf = new Map<number, number>();
  for (let i = 0; i < count; i += 1) {
    const f = i < 120 ? i % 2 : Math.floor(r() * folders.length);
    const roll = r();
    const status: Session['status'] = roll < 0.7 ? 'exited' : roll < 0.9 ? 'restorable' : roll < 0.96 ? 'idle' : 'running';
    const agentRoll = r();
    const agent = agentRoll < 0.45 ? 'claude' : agentRoll < 0.75 ? 'codex' : 'shell';
    // A name a scan can find again: realistic words, then a tag of its own.
    const name = i === 7 ? BIDI_NAME : `${words(r, 1 + Math.floor(r() * 3)).slice(0, 18)} q${i.toString(36)}`;
    // Three rows with no creation clock (`createdAt` 0), which draw the dash (D11).
    const createdAt = [11, 23, count - 1].includes(i) ? 0 : now - Math.floor(r() * 90 * DAY) - 60_000;
    const seen = membersOf.get(f) ?? 0;
    membersOf.set(f, seen + 1);
    const projectPath = folders[f] as string;
    records.push(
      record('probe', i, {
        name,
        projectPath,
        agent,
        status,
        createdAt,
        ...(status === 'exited' && r() < 0.1 ? { exitCode: 1 } : {}),
        // §15 F12: the closed tab's name on the folder's SECOND member, never its first.
        ...(f === 2 && seen === 1 ? { projectTombstone: { v: 1 as const, projectId: 'p3167-closed-tab', projectName: CLOSED_TAB_NAME, path: projectPath, closedAt: now - DAY } } : {})
      })
    );
  }
  return { shape: 'probe', now, records, sessions: records.map((x) => sessionOf(x)), folders, bidiId: records[7]?.id ?? null, activity: new Map(), stamps: new Map() };
}

/** probe:p316's sessions group (§9.4): 120 ended rows over four folders. */
function p316World(root: string, count: number, now: number): World {
  const r = rng(316_7002);
  const folders = [join(root, 'one', 'app'), join(root, 'two', 'app'), join(root, 'src', 'billing'), join(root, 'src', 'notes')];
  const records: SeedRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    const f = i % folders.length;
    const agent = (['claude', 'codex', 'shell'] as const)[i % 3] as string;
    const name = i === 5 ? BIDI_NAME : `${words(r, 1 + (i % 3)).slice(0, 18)} c${i.toString(36)}`;
    records.push(
      record('p316', i, {
        name,
        projectPath: folders[f] as string,
        agent,
        status: r() < 0.6 ? 'exited' : 'restorable',
        createdAt: now - (2 + Math.floor(r() * 40)) * DAY - Math.floor(r() * DAY)
      })
    );
  }
  return { shape: 'p316', now, records, sessions: records.map((x) => sessionOf(x)), folders, bidiId: records[5]?.id ?? null, activity: new Map(), stamps: new Map() };
}

/**
 * A 300-character name with a surrogate pair (U+1F600) at units 198 and 199,
 * so the door's one clip (199 units then `…`, stepping back off a high
 * surrogate) is exercised on every row.
 */
function capName(r: () => number, i: number): string {
  let head = `${words(r, 3)} k${i.toString(36)} `;
  while (head.length < 198) head += `${WORDS[Math.floor(r() * WORDS.length)]} `;
  head = head.slice(0, 198);
  let tail = '\u{1F600} after the clip ';
  while (head.length + tail.length < 300) tail += 'x';
  return (head + tail).slice(0, 300);
}

/** The hostile door's `sessions-cap` world (§9.5), facts only. */
function capWorld(count: number, now: number): World {
  const r = rng(316_7003);
  const local = ['/Users/p316/one/app', '/Users/p316/two/app'];
  for (let f = 0; local.length < 38; f += 1) local.push(`/Users/p316/src/${FOLDER_WORDS[f % FOLDER_WORDS.length]}-${String(f)}`);
  const remote = ['/srv/app', '/srv/jobs'];
  const machine: Session['machine'] = { id: CAP_MACHINE.id, label: CAP_MACHINE.label, color: 'blue', answering: true, canRestore: false, restoreReason: null };
  const records: SeedRecord[] = [];
  const sessions: Session[] = [];
  const activity = new Map<string, number>();
  const stamps = new Map<string, number>();
  for (let i = 0; i < count; i += 1) {
    // Every tenth row elsewhere, the first ones in `/srv/app` so its group holds Active rows.
    const onRemote = i % 10 === 3;
    const projectPath = onRemote ? (remote[i % 20 === 3 ? 0 : i % 2] as string) : (local[i < 80 ? i % 2 : Math.floor(r() * local.length)] as string);
    const roll = r();
    // The bidi row (9) is idle and the newest output of all, so the cap always keeps it.
    const status: Session['status'] = i === 4 || i === 1_201 ? 'needs_input' : i === 9 ? 'idle' : roll < 0.6 ? 'idle' : roll < 0.9 ? 'running' : roll < 0.97 ? 'exited' : 'restorable';
    const agent = r() < 0.6 ? 'claude' : 'codex';
    const name = i === 9 ? BIDI_NAME : capName(r, i);
    const createdAt = now - Math.floor(r() * 60 * DAY) - 60_000;
    const rec = record('cap', i, { name, projectPath, agent, status, createdAt });
    records.push(rec);
    sessions.push(sessionOf(rec, onRemote ? machine : undefined));
    if (status === 'idle' || status === 'running' || status === 'needs_input') activity.set(rec.id, i === 9 ? now - 30_000 : now - 60_000 - Math.floor(r() * 3 * DAY));
    if (status === 'needs_input') stamps.set(rec.id, now - 120_000 - i);
  }
  return { shape: 'cap', now, records, sessions, folders: [...local, ...remote], bidiId: records[9]?.id ?? null, activity, stamps };
}

/**
 * His shape, from §4's recorded counts and nothing else: 102 listed rows
 * (55 idle, 9 running, 38 restorable) and 252 removed, 23 folders whose names
 * all differ, the busiest 27, 7 agents, names summing to 877 characters
 * (8.6 on average) with one of exactly 27, the oldest listed 49 days old.
 */
function hisWorld(root: string, now: number): World {
  const folders: string[] = [];
  const HIS_FOLDERS = ['gmux', 'tortiedotsh', 'webapp', 'api', 'infra', 'notes', 'blog', 'dotfiles', 'scripts', 'billing', 'mobile', 'docs', 'research', 'design', 'mail', 'search', 'maps', 'feed', 'shop', 'chat', 'ops', 'tools', 'cli'];
  for (const name of HIS_FOLDERS) folders.push(join(root, 'src', name));
  // Members per folder: 27, then nine of 4 and thirteen of 3 (27 + 36 + 39 = 102).
  const per = [27, ...Array.from({ length: 9 }, () => 4), ...Array.from({ length: 13 }, () => 3)];
  const statuses: Session['status'][] = [...Array.from({ length: 55 }, () => 'idle' as const), ...Array.from({ length: 9 }, () => 'running' as const), ...Array.from({ length: 38 }, () => 'restorable' as const)];
  const agents = ['claude', 'codex', 'shell', 'cursor', 'opencode', 'pi', 'deepseek'];
  // Lengths: one of 27, fifty-nine of 8, forty-two of 9 (27 + 472 + 378 = 877).
  const lengths = [27, ...Array.from({ length: 59 }, () => 8), ...Array.from({ length: 42 }, () => 9)];
  const POOL = ['auth', 'login', 'pocket', 'arch', 'notes', 'build', 'cache', 'deploy', 'phone', 'search', 'review', 'redline'];
  const nameOf = (i: number, length: number): string => {
    if (length === 27) return 'fix the login redirect loop';
    const base = `${POOL[i % POOL.length] as string}-${'abcdefghijklmnopqrstuvwxyz'.repeat(2)}`;
    return base.slice(0, length);
  };
  const records: SeedRecord[] = [];
  let i = 0;
  const r = rng(316_7004);
  per.forEach((n, f) => {
    for (let k = 0; k < n; k += 1) {
      // The oldest listed row is 49 days old exactly; the rest are younger.
      const createdAt = i === 0 ? now - 49 * DAY : now - Math.floor(r() * 48 * DAY) - 60_000;
      records.push(record('his', i, { name: nameOf(i, lengths[i] as number), projectPath: folders[f] as string, agent: agents[i % agents.length] as string, status: statuses[i] as Session['status'], createdAt }));
      i += 1;
    }
  });
  // The 252 removed rows (Past Sessions, never on the phone), over the same folders.
  for (let k = 0; k < 252; k += 1, i += 1) {
    records.push(record('his', i, { name: nameOf(i, 8), projectPath: folders[k % folders.length] as string, agent: agents[k % agents.length] as string, status: 'discarded', createdAt: now - Math.floor(r() * 120 * DAY) - DAY }));
  }
  const listed = records.filter((x) => x.status !== 'discarded');
  return { shape: 'his', now, records, sessions: listed.map((x) => sessionOf(x)), folders, bidiId: null, activity: new Map(), stamps: new Map() };
}

/** One shape's world. `root` is where its folders are said to be; `count` overrides the shape's row count. */
export function worldOf(shape: Shape, { root = '/Users/p3167-seed', count, now = Date.now() }: { root?: string; count?: number; now?: number } = {}): World {
  switch (shape) {
    case 'probe':
      return probeWorld(root, count ?? 2000, now);
    case 'p316':
      return p316World(root, count ?? 120, now);
    case 'cap':
      return capWorld(count ?? 2400, now);
    case 'his':
      return hisWorld(root, now);
  }
}

/** The facts one answer is composed over, as the door's own `facts.ts` hands them, built from plain rows. */
export interface FactsOptions {
  now?: number;
  projects?: Project[];
  stamps?: ReadonlyMap<string, number>;
  activity?: ReadonlyMap<string, number>;
  questions?: ReadonlyMap<string, string>;
  statusWord?: (s: Session) => { dot: string; label: string };
  agentLabel?: (id: string) => string;
  endOffer?: (s: Session) => unknown;
}

/**
 * A `PocketFacts` over plain sessions, projected as `core.listSessions()`
 * would hand them: removed rows dropped, nothing statted, no home read. Its
 * End offer is the two gates' (`src/main/sessions/pocket-writes.ts`'s reading:
 * live is offered, unknown is unreachable with the Mac's title, anything else
 * nothing), and its machine label is the session's own.
 */
export function factsOf(sessions: readonly Session[], options: FactsOptions = {}): Record<string, unknown> {
  const listed = sessions.filter((s) => s.status !== 'discarded');
  const live = (s: Session): boolean => s.status === 'running' || s.status === 'idle' || s.status === 'needs_input';
  return {
    ...(options.now === undefined ? {} : { now: () => options.now as number }),
    sessions: () => listed,
    projects: () => options.projects ?? [],
    blockedSince: () => options.stamps ?? new Map(),
    wakes: () => [],
    activity: (id: string) => {
      const at = options.activity?.get(id);
      const question = options.questions?.get(id);
      if (at === undefined && question === undefined) return undefined;
      return { ...(at === undefined ? {} : { lastActivityAt: at }), ...(question === undefined ? {} : { question }) };
    },
    statusWord: options.statusWord ?? ((s: Session) => {
      const v = statusVisual(s.status, s);
      return { dot: v.dot, label: v.label };
    }),
    agentLabel: options.agentLabel ?? ((id: string) => AGENT_LABELS[id] ?? id),
    machineLabel: (s: Session) => s.machine?.label ?? null,
    emptyLine: 'Nothing needs you',
    catchUp: async () => null,
    lastTurn: async () => ({ answerText: null, turnCount: 0 }),
    turns: async () => ({ turns: [], more: false }),
    handoff: () => null,
    endOffer:
      options.endOffer ??
      ((s: Session) => (live(s) ? { state: 'offered', batch: true } : s.status === 'unknown' ? { state: 'unreachable', title: END_UNREACHABLE_TITLE } : { state: 'none' }))
  };
}

/** Every Show × Group × Sort, as query strings the phone would send (show, group, sort, in that order). */
export const COMBINATIONS: ReadonlyArray<{ show: string; group: string; sort: string }> = Object.freeze(
  ['active', 'ended', 'all'].flatMap((show) => ['project', 'none'].flatMap((group) => ['recent', 'name', 'oldest'].map((sort) => ({ show, group, sort }))))
);

/** The shipping composer, loaded from the tree; null with the reason when the tree has none. */
export async function shippingSessions(): Promise<{ compose: ((facts: unknown, query: URLSearchParams) => unknown) | null; why: string | null; budget: number; maxRows: number }> {
  const routes = await import(pathToFileURL(join(ROOT, 'src', 'main', 'pocket', 'routes.ts')).href);
  const pocket = await import(pathToFileURL(join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts')).href);
  const budget = Number(pocket.POCKET_SESSIONS_BUDGET_BYTES);
  const maxRows = Number(pocket.POCKET_SESSIONS_MAX);
  const probe = routes.createPocketRoutes(factsOf([]));
  if (typeof probe.sessions !== 'function') return { compose: null, why: 'the shipping createPocketRoutes(facts) has no sessions member', budget, maxRows };
  return { compose: (facts, query) => routes.createPocketRoutes(facts).sessions(query), why: null, budget, maxRows };
}

/**
 * The counts one answer holds, and what is wrong with them, by the SPEC's
 * own rules (§6.1, §6.2 step 9): each row once and in range, every group named
 * by a row, each count its drawn rows plus its omitted, the groups' omitted
 * summing to no more than the top-level one (less only when the caps left out
 * every row of a project, which is then in no group), the kept rows the total
 * less what the words drop, and the
 * rows and groups under the byte budget. Counts only, never a name.
 */
export function countsOf(answer: any, budget: number, maxRows: number): { rows: number; groups: number; omitted: number; total: number; bytes: number; problems: string[] } {
  const problems: string[] = [];
  const rows: any[] = Array.isArray(answer?.rows) ? answer.rows : [];
  const groups: any[] = Array.isArray(answer?.groups) ? answer.groups : [];
  const ids = new Set<string>();
  const drawn = new Map<number, number>();
  for (const row of rows) {
    if (ids.has(row.sessionId)) problems.push('a row twice');
    ids.add(row.sessionId);
    if (!Number.isInteger(row.group) || row.group < 0 || row.group >= groups.length) problems.push('a row outside groups');
    drawn.set(row.group, (drawn.get(row.group) ?? 0) + 1);
  }
  let omittedSum = 0;
  groups.forEach((g, k) => {
    if (!drawn.has(k)) problems.push('a group no row names');
    if (g.count !== (drawn.get(k) ?? 0) + g.omitted) problems.push('a count that is not its drawn rows plus its omitted');
    omittedSum += Number(g.omitted);
  });
  if (omittedSum > answer?.omitted) problems.push('group omitted that sum above the total omitted');
  if (rows.length > maxRows) problems.push('more rows than the cap');
  const bytes = rows.reduce((n, r) => n + Buffer.byteLength(J(r)), 0) + groups.reduce((n, g) => n + Buffer.byteLength(J(g)), 0);
  if (bytes > budget) problems.push('rows and groups over the byte budget');
  return { rows: rows.length, groups: groups.length, omitted: Number(answer?.omitted), total: Number(answer?.total), bytes, problems };
}

// ---------------------------------------------------------------------------
// The script
// ---------------------------------------------------------------------------

/** The refusal for a manifest path, or null when it is a scratch path this file may write. */
export function manifestPathRefusal(path: string, home: string | undefined = process.env['HOME']): string | null {
  const abs = resolve(path);
  if (abs.includes('/Library/Application Support/')) return `${abs} is under Library/Application Support, where a person's Tortie keeps its manifest`;
  if (home !== undefined && home !== '' && (abs === resolve(home) || abs.startsWith(`${resolve(home)}/`))) return `${abs} is under the HOME this process was handed`;
  const real = (p: string): string => {
    try {
      return realpathSync(p);
    } catch {
      return resolve(p);
    }
  };
  const roots = [real(tmpdir()), '/tmp', '/private/tmp', '/private/var/folders', '/var/folders'];
  let parent = dirname(abs);
  while (!existsSync(parent) && parent !== dirname(parent)) parent = dirname(parent);
  const where = `${real(parent)}${abs.slice(parent.length)}`;
  if (!roots.some((r) => where === r || where.startsWith(`${r}/`))) return `${abs} is not under a temporary directory (${roots.join(', ')})`;
  if (existsSync(abs)) return `${abs} already exists; this file seeds a new scratch manifest and never one that holds rows`;
  return null;
}

async function main(argv: string[]): Promise<number> {
  const arg = (name: string): string | null => {
    const at = argv.indexOf(name);
    return at === -1 ? null : (argv[at + 1] ?? null);
  };
  const shape = (arg('--shape') ?? 'probe') as Shape;
  if (!SHAPES.includes(shape) || shape === 'cap') {
    process.stderr.write(`[seed-sessions] --shape takes probe, p316 or his (cap is facts only, for the hostile door), not ${J(shape)}\n`);
    return 2;
  }
  const manifest = arg('--manifest');
  if (manifest === null) {
    process.stderr.write('[seed-sessions] --manifest <scratch path> is required\n');
    return 2;
  }
  const refusal = manifestPathRefusal(manifest);
  if (refusal !== null) {
    process.stderr.write(`[seed-sessions] REFUSED: ${refusal}\n`);
    return 2;
  }
  const countRaw = arg('--count');
  const nowRaw = arg('--now');
  const world = worldOf(shape, {
    root: arg('--root') ?? join(dirname(resolve(manifest)), 'p3167-seed'),
    ...(countRaw === null ? {} : { count: Number(countRaw) }),
    ...(nowRaw === null ? {} : { now: Number(nowRaw) })
  });
  mkdirSync(dirname(resolve(manifest)), { recursive: true });
  // THE SHIPPING STORE, loaded only here, so importing this file opens nothing.
  const { ManifestStore } = await import(pathToFileURL(join(ROOT, 'src', 'main', 'manifest', 'store.ts')).href);
  const store = new ManifestStore(resolve(manifest));
  let listedBack = 0;
  let readBack: any[] = [];
  try {
    for (const rec of world.records) store.insertSession(rec);
    readBack = store.listSessions();
    listedBack = readBack.filter((x: { status: string }) => x.status !== 'discarded').length;
  } finally {
    store.close?.();
  }
  const listed = world.records.filter((x) => x.status !== 'discarded');
  const byStatus: Record<string, number> = {};
  for (const x of world.records) byStatus[x.status] = (byStatus[x.status] ?? 0) + 1;
  const perFolder = new Map<string, number>();
  for (const x of listed) perFolder.set(x.projectPath, (perFolder.get(x.projectPath) ?? 0) + 1);
  const basenames = new Set([...perFolder.keys()].map((p) => p.slice(p.lastIndexOf('/') + 1)));
  const nameChars = listed.map((x) => x.name.length);
  const summary = {
    shape,
    written: world.records.length,
    readBack: readBack.length,
    listed: listed.length,
    listedBack,
    byStatus,
    folders: perFolder.size,
    folderNames: basenames.size,
    busiestFolder: Math.max(0, ...perFolder.values()),
    agents: new Set(listed.map((x) => x.agent)).size,
    nameAverage: nameChars.length === 0 ? 0 : Math.round((nameChars.reduce((a, b) => a + b, 0) / nameChars.length) * 10) / 10,
    nameLongest: Math.max(0, ...nameChars),
    oldestDays: Math.floor((world.now - Math.min(...listed.map((x) => (x.createdAt > 0 ? x.createdAt : world.now)))) / DAY)
  };
  const out = arg('--out');
  if (out !== null) {
    writeFileSync(
      out,
      `${J({ ...summary, now: world.now, ids: world.records.map((x) => x.id), names: world.records.map((x) => x.name), folders: world.folders, bidiId: world.bidiId, closedTabName: shape === 'probe' ? CLOSED_TAB_NAME : null })}\n`,
      { mode: 0o600 }
    );
  }
  let checked: unknown = null;
  let failed = false;
  if (argv.includes('--check')) {
    const shipping = await shippingSessions();
    if (shipping.compose === null) {
      process.stdout.write(`${J({ ...summary, check: 'not run', why: shipping.why })}\n`);
      return 1;
    }
    // The rows as core.listSessions would hand them: read back from the store, removed ones dropped.
    const sessions = readBack.filter((x: { status: string }) => x.status !== 'discarded').map((x: any) => sessionOf(x as SeedRecord));
    const facts = factsOf(sessions, { now: world.now });
    const agents = [...new Set(sessions.map((s) => s.agent as string))];
    const rows: unknown[] = [];
    for (const c of COMBINATIONS) {
      for (const filter of [{}, ...agents.map((agent) => ({ agent })), { machine: 'local' }]) {
        const query = new URLSearchParams({ ...c, ...filter });
        const answer = shipping.compose(facts, query) as any;
        if (answer === null || answer === undefined) {
          failed = true;
          rows.push({ query: query.toString(), refused: true });
          continue;
        }
        const counts = countsOf(answer, shipping.budget, shipping.maxRows);
        const sumCounts = (answer.groups ?? []).reduce((n: number, g: { count: number }) => n + g.count, 0);
        if (answer.total !== listed.length) counts.problems.push('total is not every listed session');
        if (sumCounts !== counts.rows + counts.omitted) counts.problems.push('the counts do not sum to the rows plus the omitted');
        if (counts.omitted !== 0) counts.problems.push('omitted is not 0 at his size');
        if (counts.problems.length > 0) failed = true;
        rows.push({ query: query.toString(), rows: counts.rows, groups: counts.groups, omitted: counts.omitted, total: counts.total, bytes: counts.bytes, problems: counts.problems });
      }
    }
    // Counts only. Every combination's own line with --verbose; by default the
    // largest answer and every combination that failed.
    const failedRows = rows.filter((x: any) => x.refused === true || (x.problems ?? []).length > 0);
    checked = {
      combinations: rows.length,
      failed: failedRows.length,
      mostRows: Math.max(0, ...rows.map((x: any) => Number(x.rows ?? 0))),
      mostBytes: Math.max(0, ...rows.map((x: any) => Number(x.bytes ?? 0))),
      mostOmitted: Math.max(0, ...rows.map((x: any) => Number(x.omitted ?? 0))),
      ...(argv.includes('--verbose') ? { rows } : { failures: failedRows })
    };
  }
  process.stdout.write(`${J({ ...summary, ...(checked === null ? {} : { check: checked }) })}\n`);
  return failed ? 1 : 0;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === HERE) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`[seed-sessions] ${String((err as Error)?.stack ?? err)}\n`);
      process.exit(1);
    }
  );
}
