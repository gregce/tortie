#!/usr/bin/env node
/**
 * `node build/p3333/sample.mjs [--check | --self-test]` — See a sample's book,
 * written by the Mac's SHIPPING composer over a made-up world (Phase 333.3,
 * build/p3333/SPEC.md §5.1.2 to §5.1.5).
 *
 * WHY IT EXISTS. The phone's See a sample draws made-up sessions with no Mac
 * and no network. Nothing on the phone composes an answer (build/p316/SPEC.md
 * §4.0: no arithmetic on status, age or order), so every answer the sample
 * serves is composed HERE, by the very code a paired Mac answers with, over the
 * five sessions of `./world.mjs`, and written to `ios/Tortie/Sample/sample.json`,
 * which the app bundles and decodes through `Door/Contract.swift`. A later Mac
 * change to what the door composes turns `--check` red until this file is
 * re-run in that change's commit, so the sample cannot drift from the door.
 *
 * WHAT IT COMPOSES, for each of the 36 states (every session in one of its
 * variants, the product in session order) with `createPocketRoutes`
 * (src/main/pocket/routes.ts) over facts built as `src/main/pocket/facts.ts`
 * builds them: `/v1/blocked`, and `/v1/sessions` for every Show × Group by ×
 * Sort by × agent filter (54), the query spelled as `DoorClient.sessionsTarget`
 * spells it. Per session and variant: `/v1/session` and `/v1/turns?limit=20`.
 * Per live variant the screen, `composeScreen` with `readingRevisionOf`
 * through `routes.screen`; per ended variant the screen's absence. Per live
 * session one page of history, `composePage` through `routes.scrollback` over
 * the ask `from=0&count=60&depth=60&wrap=80&keep=bottom`, and the page's two
 * absences, `ended` and `moved`. Every End is the shipping `endOfferOf`, every
 * status word `statusVisual`, every agent's name the registry's
 * `displayName`, Catch Me Up the shipping `buildProjectLine`, and the turns the
 * shipping `readPocketTurns`.
 *
 * THE FILE (§5.1.3) is ASCII (every character past U+007F written `\uXXXX`),
 * deterministic, with one newline at the end. The lists are SKELETONS of
 * indexes into shared PIECES, because 1,980 answers whole are about 2 MB and
 * their distinct rows are about 14 KB; the phone assembles a skeleton by index
 * into one JSON object and decodes it, and orders, filters, counts and words
 * nothing. A skeleton holds no `at` (the phone writes its own clock), no
 * `asked` (the phone writes the query it answers) and no `emptyLine` or
 * `ageNote` (the file's `constants`); this script proves each of those equal.
 *
 * --check (§5.1.4) regenerates everything in memory and:
 *   (1) compares it with the committed bytes;
 *   (2) re-assembles every skeleton by plain dereference and compares it, field
 *       for field, with the shipping composer's own answer, every state and
 *       every query (1,980), `at` set aside and `asked` equal to the query; and
 *       reads every per-session answer back against what the world was chosen
 *       to produce, in every state;
 *   (3) holds the file complete: every state, every query, every index in
 *       range, every piece used;
 *   (4) holds the screens: each prompt row covers exactly its column and holds
 *       nothing after it, each note row is empty, both inside the screen and
 *       distinct, each style an index of the screen's table, every picture at
 *       depth 60 in one space that is its history's, every history 60 rows at
 *       wrap 80 with its first row inked; and, at composition, every captured
 *       row drawn whole, the cursor where the prompt is, a question asked only
 *       on a waiting screen, and the shipping detector reading the world's own
 *       question and options back off it;
 *   (5) refuses the deny list (§5.1.5) anywhere in the file, `\uXXXX` read back;
 * and prints the PASS line. Before any of that, each clause is proved on
 * copies it breaks itself (`--self-test` runs only those proofs): a clause
 * whose proof stays green has stopped checking, and the run is refused.
 * Without a flag the file is written, and only when clauses 2 to 5 hold: the
 * writer refuses to write a book that breaks one.
 *
 * WHAT IT DOES NOT DO. It opens no socket, starts nothing but the pinned tsx
 * that runs it, reads nothing under anybody's home, and prints no conversation
 * line. It runs itself under the pinned tsx (`build/ts-runner.mjs`) so it can
 * import the TypeScript it composes with, as `build/p316/vectors.mjs` does.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const OUT_NAME = 'ios/Tortie/Sample/sample.json';
const OUT = join(ROOT, ...OUT_NAME.split('/'));
const TAG = '[p3333 sample]';
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

if (process.env.P3333_SAMPLE_INNER !== '1') {
  // THE OUTER RUN: the same file again, under the repository's pinned tsx.
  const { tsxCli } = await import('../ts-runner.mjs');
  const run = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', HERE, ...process.argv.slice(2)],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, P3333_SAMPLE_INNER: '1' }
    }
  );
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  if (run.error !== undefined) {
    process.stdout.write(`${TAG} FAIL: ${String(run.error.message)}\n`);
    process.exit(1);
  }
  process.exit(run.status ?? 1);
}

// ---------------------------------------------------------------------------
// THE INNER RUN, under tsx: the made-up world and the shipping modules.
// ---------------------------------------------------------------------------

const world = await import('./world.mjs');
const { createPocketRoutes, screenLive } = await import('../../src/main/pocket/routes.ts');
const { readPocketTurns, pocketTurnOf, pocketLineKind } = await import('../../src/main/pocket/facts.ts');
const { composeScreen, composePage, spaceOf } = await import('../../src/main/screen/compose.ts');
const { parseScreenDisplay } = await import('../../src/main/screen/read.ts');
const { readingRevisionOf, screenRevisionOf } = await import('../../src/main/screen/watch.ts');
const { endOfferOf } = await import('../../src/main/sessions/pocket-writes.ts');
const { buildProjectLine } = await import('../../src/shared/overview-line.ts');
const { statusVisual } = await import('../../src/shared/status-words.ts');
const { getRegistryEntry } = await import('../../src/main/agents/registry.ts');
const { NOTHING_NEEDS_YOU } = await import('../../src/main/tray/attention.ts');
const { toTurnView } = await import('../../src/main/overview/turn-view.ts');
const { detectDialogRows, normalizeCapture } = await import('../../src/main/activity/screen.ts');
const { SCREEN_ENDED, SCROLLBACK_MOVED } = await import('../../src/shared/screen-copy.ts');
const { POCKET_SESSIONS_SHOW, POCKET_SESSIONS_GROUP, POCKET_SESSIONS_SORT, POCKET_NO_REPLY, POCKET_AGE_HONESTY } = await import(
  '../../src/shared/ipc/pocket.ts'
);

const { T, COLS, ROWS, HISTORY, SESSIONS, PROJECTS, QUESTIONS } = world;

/** The words of every sessions question, in the order the file holds them (§5.1.2). */
const SHOWS = ['all', 'active', 'ended'];
const GROUPS = ['project', 'none'];
const SORTS = ['recent', 'name', 'oldest'];
/** The agent filter: none, then each agent the sample's sessions run. */
const AGENT_FILTERS = [null, 'claude', 'codex'];
/** The one history page every live session answers. */
const PAGE_ASK = Object.freeze({ from: 0, count: HISTORY, depth: HISTORY, wrap: COLS, keep: 'bottom' });
const PAGE_QUERY = (id) =>
  new URLSearchParams(
    `id=${id}&from=${String(PAGE_ASK.from)}&count=${String(PAGE_ASK.count)}&depth=${String(PAGE_ASK.depth)}&wrap=${String(PAGE_ASK.wrap)}&keep=${PAGE_ASK.keep}`
  );

/** Problems found while composing, each naming its clause. */
const composeProblems = [];
const fail = (what) => composeProblems.push(what);

// The words this file spells are the contract's words, in another order.
for (const [mine, theirs, name] of [
  [SHOWS, POCKET_SESSIONS_SHOW, 'Show'],
  [GROUPS, POCKET_SESSIONS_GROUP, 'Group by'],
  [SORTS, POCKET_SESSIONS_SORT, 'Sort by']
]) {
  if ([...mine].sort().join(',') !== [...theirs].sort().join(',')) {
    fail(`(3) the ${name} words ${mine.join(', ')} are not the contract's ${theirs.join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

/** Structural equality over JSON values: the same keys (in any order), the same arrays, the same scalars. */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}

/** A copy of a JSON value without its top-level `at`. */
const withoutAt = (answer) => {
  const { at: _at, ...rest } = answer;
  return rest;
};

/** A JSON value copied, so a proof can break a copy and never the original. */
const clone = (value) => JSON.parse(JSON.stringify(value));

/** A count as a person reads it: 1,980. */
const counted = (n) => n.toLocaleString('en-US');

/** The ESC a styled capture opens each SGR with. */
const ESC = String.fromCharCode(0x1b);

/** A capture row's text without its SGR sequences and trailing blanks: what `capture-pane -p` would print. */
const plainRow = (row) => row.replace(new RegExp(`${ESC}\\[[0-9;:]*m`, 'g'), '').replace(/\s+$/, '');

/** The state key (§5.1.3): each session's variant, in `ids` order. */
const stateKey = (variants) => SESSIONS.map((s) => variants[s.id]).join('.');

/** Every state, the product of the variant lists in session order, the first session outermost. */
function allStates() {
  const out = [];
  const walk = (i, acc) => {
    if (i === SESSIONS.length) {
      out.push({ ...acc });
      return;
    }
    for (const variant of SESSIONS[i].variants) walk(i + 1, { ...acc, [SESSIONS[i].id]: variant });
  };
  walk(0, {});
  return out;
}

/** A sessions question's key in the file and its query, spelled as `DoorClient.sessionsTarget` spells it. */
function sessionsQueries() {
  const out = [];
  for (const show of SHOWS) {
    for (const group of GROUPS) {
      for (const sort of SORTS) {
        for (const agent of AGENT_FILTERS) {
          const key = `${show}.${group}.${sort}.${agent ?? '*'}`;
          const query = `show=${show}&group=${group}&sort=${sort}${agent === null ? '' : `&agent=${agent}`}`;
          out.push({ key, query, asked: { show, group, sort, agent, machine: null } });
        }
      }
    }
  }
  return out;
}

const STATES = allStates();
const QUERIES = sessionsQueries();
const sessionOf = new Map(SESSIONS.map((s) => [s.id, s]));
const liveVariant = (variant) => variant !== 'ended';

// ---------------------------------------------------------------------------
// The world, read once: turns, captures, screens and histories
// ---------------------------------------------------------------------------

const storedTurns = new Map(SESSIONS.map((s) => [s.id, world.storedTurnsOf(s)]));
/** The overview store's two readers' semantics, as `build/p316/vectors.mjs` keeps them: ascending, the LAST `limit` of the range. */
const store = {
  listTurns(sessionId, limit) {
    const all = storedTurns.get(sessionId) ?? [];
    return limit === undefined ? [...all] : all.slice(Math.max(0, all.length - limit));
  },
  listTurnsBetween(sessionId, from, to, limit) {
    const range = (storedTurns.get(sessionId) ?? []).filter((t) => t.index >= from && t.index <= to);
    return limit === undefined ? range : range.slice(Math.max(0, range.length - limit));
  }
};

const captures = new Map(SESSIONS.map((s) => [s.id, world.capturesOf(s)]));

/** The style a pen takes in a composed screen, by composing one cell in it. */
function styleOfSgr(sgr) {
  const page = composePage(`${sgr === '' ? '' : `${ESC}[${sgr}m`}x`, 0, COLS, { from: 0, count: 1, keep: 'bottom' });
  return page.styles[0] ?? null;
}

/**
 * Each live variant's screen, composed ONCE by the shipping composer, with the
 * revision the watcher would give it, and where its echo's rows are.
 */
const screens = new Map();
for (const session of SESSIONS) {
  for (const variant of session.variants) {
    if (!liveVariant(variant)) continue;
    const capture = captures.get(session.id)?.[variant];
    if (capture === undefined || capture === null) {
      fail(`(4) ${session.id} ${variant}: the world draws no capture for a live variant`);
      continue;
    }
    const display = parseScreenDisplay(capture.displayLine);
    if (display === null) {
      fail(`(4) ${session.id} ${variant}: the shipping parseScreenDisplay refuses the world's display line`);
      continue;
    }
    const reading = { styled: capture.styled, display, displayLine: capture.displayLine, steady: true };
    const status = world.statusOf(session, variant);
    const turn = world.questionIdOf(session.id, variant === 'answered' ? 2 : 1);
    const composed = composeScreen(reading, { turn, status, typable: true });
    if (composed === 'large') {
      fail(`(4) ${session.id} ${variant}: the shipping composer answers large`);
      continue;
    }
    const revision = readingRevisionOf(session.id, reading, turn, status === 'needs_input', true);
    const styleIndex = (sgr) => {
      const style = styleOfSgr(sgr);
      return composed.screen.styles.findIndex((s) => deepEqual(s, style));
    };
    const prompt = capture.prompt === null ? null : { row: capture.prompt.row, column: capture.prompt.column, style: styleIndex(capture.prompt.sgr) };
    const note = capture.note === null ? null : { row: capture.note.row, style: styleIndex(capture.note.sgr) };
    screens.set(`${session.id}.${variant}`, { session, variant, capture, composed, revision, turn, status, prompt, note });
  }
}

/** Each live session's history, its styled lines as tmux would hand a page read. */
const histories = new Map();
for (const session of SESSIONS) {
  const history = captures.get(session.id)?.history ?? null;
  if (history === null) continue;
  histories.set(session.id, history.join('\n'));
}

// ---------------------------------------------------------------------------
// The facts for one state, built as src/main/pocket/facts.ts builds them
// ---------------------------------------------------------------------------

/** The registry's drawn name. */
const agentLabelOf = (agent) => getRegistryEntry(agent).displayName;

/** A page's absence as the page reader answers it; the door fills the sentence. */
const pageAbsent = (sessionId, why) => ({
  sessionId,
  at: T,
  from: null,
  depth: null,
  wrap: null,
  space: null,
  styles: [],
  rows: [],
  why,
  sentence: null
});

/**
 * The facts of one state. `pages` is how the page reader answers a live
 * session: `page` composes the history, `moved` answers the index space moved.
 */
function factsFor(variants, pages = 'page') {
  const rows = SESSIONS.map((s) => world.sessionRowOf(s, variants[s.id]));
  const rowOf = new Map(rows.map((r) => [r.id, r]));
  const statusNow = (id) => rowOf.get(id)?.status ?? 'idle';
  return {
    sessions: () => rows,
    projects: () => PROJECTS,
    blockedSince: () =>
      new Map(SESSIONS.filter((s) => rowOf.get(s.id)?.status === 'needs_input').map((s) => [s.id, s.waitingSince])),
    wakes: () => [],
    activity: (id) => {
      const session = sessionOf.get(id);
      if (session === undefined) return undefined;
      const question = QUESTIONS[id];
      if (variants[id] === 'waiting' && question !== undefined) {
        return {
          question: question.question,
          choice: { atChoice: true, options: question.options.map((o) => ({ marker: o.marker, text: o.text })) },
          lastActivityAt: session.lastOutputAt
        };
      }
      return { lastActivityAt: session.lastOutputAt };
    },
    statusWord: (session) => {
      const word = statusVisual(session.status, session);
      return { dot: word.dot, label: word.label };
    },
    agentLabel: agentLabelOf,
    machineLabel: (session) => session.machine?.label ?? null,
    emptyLine: NOTHING_NEEDS_YOU,
    refresh: async (id) => {
      const session = sessionOf.get(id);
      return session === undefined ? null : world.activityCountsOf(session);
    },
    // As facts.ts:299-333 builds it: the newest turn, read as the store left it.
    catchUp: async (id) => {
      const session = rowOf.get(id);
      if (session === undefined) return null;
      const newest = store.listTurns(id, 1);
      const line = pocketLineKind(session, { readState: 'ok' }, newest.length > 0);
      const view = {
        sessionId: id,
        name: session.name,
        agent: session.agent,
        agentLabel: agentLabelOf(session.agent),
        model: null,
        branch: null,
        line,
        lineDetail: null,
        askOnly: false,
        noTurnClock: false,
        startedAt: session.createdAt,
        lastTouchedAt: null,
        turns: line === 'turns' ? newest.map((turn) => toTurnView(turn, turn.gitVerdict ?? 'nothing-to-check', false)) : [],
        summary: null,
        summaryWrittenAt: null
      };
      const built = buildProjectLine(view, session.status, T);
      return { ask: built.ask, outcome: built.outcome };
    },
    // As facts.ts:335-349.
    lastTurn: async (id) => {
      const session = rowOf.get(id);
      if (session === undefined) return { answerText: null, turnCount: 0 };
      const newest = store.listTurns(id, 1);
      const line = pocketLineKind(session, { readState: 'ok' }, newest.length > 0);
      const last = newest[0];
      return {
        answerText: line === 'turns' && last !== undefined ? pocketTurnOf(last, session.status).answerText : null,
        turnCount: (storedTurns.get(id) ?? []).length
      };
    },
    // As facts.ts:351-355.
    turns: async (id, range) => readPocketTurns(store, id, range, statusNow(id)),
    handoff: () => null,
    endOffer: (session) => endOfferOf(session, { status: session.status }, () => true),
    replyOffer: async (session) => {
      const question = QUESTIONS[session.id];
      const waiting = screens.get(`${session.id}.waiting`);
      if (variants[session.id] !== 'waiting' || question === undefined || waiting === undefined) return POCKET_NO_REPLY;
      return {
        question: world.questionIdOf(session.id, 1),
        mark: waiting.composed.screen.dialog,
        pressable: question.options.map((o) => o.marker),
        command: question.command,
        canSay: false
      };
    },
    screen: async (session, since) => {
      if (!screenLive(session)) {
        return {
          sessionId: session.id,
          revision: screenRevisionOf([session.id, 'ended']),
          at: T,
          unchanged: false,
          screen: null,
          why: 'ended',
          sentence: null
        };
      }
      const live = screens.get(`${session.id}.${variants[session.id]}`);
      if (live === undefined) return { sessionId: session.id, revision: screenRevisionOf([session.id, 'unreachable']), at: T, unchanged: false, screen: null, why: 'unreachable', sentence: null };
      const unchanged = since === live.revision;
      return { sessionId: session.id, revision: live.revision, at: T, unchanged, screen: unchanged ? null : live.composed.screen, why: null, sentence: null };
    },
    scrollback: async (session, ask) => {
      if (!screenLive(session)) return pageAbsent(session.id, 'ended');
      const styled = histories.get(session.id);
      // The page reader's own refusals over an agreed frame: another width, a
      // depth the history never had, or a first row past it.
      if (pages === 'moved' || styled === undefined || ask.wrap !== COLS || ask.depth > HISTORY || ask.from >= HISTORY) {
        return pageAbsent(session.id, 'moved');
      }
      const page = composePage(styled, 0, COLS, { from: ask.from, count: Math.min(ask.count, HISTORY - ask.from), keep: ask.keep });
      return {
        sessionId: session.id,
        at: T,
        from: page.from,
        depth: HISTORY,
        wrap: COLS,
        space: spaceOf(sessionOf.get(session.id).pane),
        styles: page.styles,
        rows: page.rows,
        why: null,
        sentence: null
      };
    },
    now: () => T
  };
}

// ---------------------------------------------------------------------------
// Composing: every state's lists, every session's answers
// ---------------------------------------------------------------------------

/** A table of pieces, each distinct JSON value once, in the order first met. */
function pieceTable() {
  const index = new Map();
  const list = [];
  return {
    list,
    add(value) {
      const key = JSON.stringify(value);
      let at = index.get(key);
      if (at === undefined) {
        at = list.length;
        index.set(key, at);
        list.push(value);
      }
      return at;
    }
  };
}

const blockedRows = pieceTable();
const sessionsRows = pieceTable();
const groupPieces = pieceTable();
const choicePieces = pieceTable();

/** Every composed list answer, by state and question, for clause 2. */
const composedLists = new Map();
const lists = {};
let constants = null;
let agentsOrder = null;

for (const variants of STATES) {
  const key = stateKey(variants);
  const routes = createPocketRoutes(factsFor(variants));
  const blocked = routes.blocked();
  const answers = { blocked, sessions: new Map() };
  constants ??= { blockedAgeNote: blocked.ageNote, sessionsAgeNote: null, emptyLine: blocked.emptyLine };
  const entry = {
    blocked: {
      rows: blocked.rows.map((row) => blockedRows.add(row)),
      others: blocked.others.map((row) => blockedRows.add(row)),
      othersOmitted: blocked.othersOmitted
    },
    sessions: {}
  };
  for (const question of QUERIES) {
    const answer = routes.sessions(new URLSearchParams(question.query));
    if (answer === null) {
      fail(`(2) state ${key}, ${question.key}: the shipping routes.sessions answered null to ${question.query}`);
      continue;
    }
    answers.sessions.set(question.key, answer);
    constants.sessionsAgeNote ??= answer.ageNote;
    if (agentsOrder === null && question.key === 'all.project.recent.*') agentsOrder = answer.agents.map((a) => a.id);
    entry.sessions[question.key] = {
      rows: answer.rows.map((row) => sessionsRows.add(row)),
      groups: answer.groups.map((group) => groupPieces.add(group)),
      agents: answer.agents.map((choice) => choicePieces.add(choice)),
      machines: answer.machines.map((choice) => choicePieces.add(choice)),
      total: answer.total,
      omitted: answer.omitted
    };
  }
  composedLists.set(key, answers);
  lists[key] = entry;
}

/**
 * Per session and variant, the session, turns and screen answers, composed in
 * EVERY state that holds that variant: the first is the book's, and every other
 * must be the same answer, because the phone reads one per variant whatever the
 * other sessions are doing.
 */
const sessionAnswers = {};
const turnsAnswers = {};
const screenEntries = {};
/** Every state's per-session answers, for the independence clause: `state` → `id` → the three answers. */
const perState = new Map();
for (const variants of STATES) {
  const answered = {};
  perState.set(stateKey(variants), answered);
  const routes = createPocketRoutes(factsFor(variants));
  for (const session of SESSIONS) {
    const id = session.id;
    const variant = variants[id];
    const got = {
      session: await routes.session(id),
      turns: await routes.turns(id, { limit: '20' }),
      screen: await routes.screen(new URLSearchParams(`id=${id}`), () => false)
    };
    for (const [what, answer] of Object.entries(got)) {
      if (answer === null) fail(`(2) state ${stateKey(variants)}: the shipping routes.${what} answered null for ${id}`);
    }
    answered[id] = got;
    sessionAnswers[id] ??= {};
    turnsAnswers[id] ??= {};
    screenEntries[id] ??= {};
    if (sessionAnswers[id][variant] === undefined) {
      sessionAnswers[id][variant] = got.session;
      turnsAnswers[id][variant] = got.turns;
      const live = screens.get(`${id}.${variant}`);
      screenEntries[id][variant] = { answer: got.screen, prompt: live?.prompt ?? null, note: live?.note ?? null };
    }
  }
}

/** The history, and the page's two absences, for every live session. */
const historyAnswers = {};
const pageEndedAnswers = {};
const pageMovedAnswers = {};
{
  const start = STATES[0];
  const allEnded = STATES[STATES.length - 1];
  const live = createPocketRoutes(factsFor(start));
  const moved = createPocketRoutes(factsFor(start, 'moved'));
  const ended = createPocketRoutes(factsFor(allEnded));
  for (const session of SESSIONS) {
    if (!histories.has(session.id)) continue;
    if (!liveVariant(start[session.id]) || allEnded[session.id] !== 'ended') {
      fail(`(3) ${session.id}: the first state does not hold it live or the last does not hold it ended`);
      continue;
    }
    historyAnswers[session.id] = await live.scrollback(PAGE_QUERY(session.id), () => false);
    pageEndedAnswers[session.id] = await ended.scrollback(PAGE_QUERY(session.id), () => false);
    pageMovedAnswers[session.id] = await moved.scrollback(PAGE_QUERY(session.id), () => false);
    for (const [what, answer] of [
      ['history', historyAnswers[session.id]],
      ['pageEnded', pageEndedAnswers[session.id]],
      ['pageMoved', pageMovedAnswers[session.id]]
    ]) {
      if (answer === null) fail(`(2) ${session.id}: the shipping routes.scrollback answered null for its ${what}`);
    }
  }
}

const book = {
  format: 1,
  clock: T,
  ids: SESSIONS.map((s) => s.id),
  variants: SESSIONS.map((s) => [...s.variants]),
  agents: agentsOrder ?? [],
  constants: constants ?? { blockedAgeNote: null, sessionsAgeNote: null, emptyLine: null },
  pieces: {
    blockedRows: blockedRows.list,
    sessionsRows: sessionsRows.list,
    groups: groupPieces.list,
    choices: choicePieces.list
  },
  lists,
  session: sessionAnswers,
  turns: turnsAnswers,
  screen: screenEntries,
  history: historyAnswers,
  pageEnded: pageEndedAnswers,
  pageMoved: pageMovedAnswers
};

// ---------------------------------------------------------------------------
// The file's text: deterministic, diff-friendly, ASCII
// ---------------------------------------------------------------------------

/** Which containers are written one member a line; everything below them is one line each. */
function expanded(path) {
  const [top, second, third] = path;
  if (path.length === 0) return true;
  if (path.length === 1) return ['constants', 'pieces', 'lists', 'session', 'turns', 'screen', 'history', 'pageEnded', 'pageMoved'].includes(top);
  if (path.length === 2) return ['pieces', 'lists', 'session', 'turns', 'screen'].includes(top);
  if (path.length === 3) return top === 'lists' && second !== undefined && third === 'sessions';
  return false;
}

function render(value, path) {
  if (value === null || typeof value !== 'object' || !expanded(path)) return JSON.stringify(value);
  const pad = '  '.repeat(path.length + 1);
  const close = '  '.repeat(path.length);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[\n${value.map((v, i) => `${pad}${render(v, [...path, i])}`).join(',\n')}\n${close}]`;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) return '{}';
  return `{\n${keys.map((k) => `${pad}${JSON.stringify(k)}: ${render(value[k], [...path, k])}`).join(',\n')}\n${close}}`;
}

/** Every character past U+007F written `\uXXXX`, so the file is ASCII. */
const asciiOnly = (text) => text.replace(/[\u0080-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

/** The file's text for a book. */
const textOf = (value) => `${asciiOnly(render(value, []))}\n`;

const TEXT = textOf(book);

// ---------------------------------------------------------------------------
// The clauses (§5.1.4), each a pure function answering its problems
// ---------------------------------------------------------------------------

/** (1) The regenerated text against the committed bytes. */
function bytesClause(text, committed) {
  if (committed === null) return [`(1) ${OUT_NAME} is missing; run node build/p3333/sample.mjs`];
  if (committed === text) return [];
  const lines = text.split('\n');
  const had = committed.split('\n');
  const first = lines.findIndex((line, i) => line !== had[i]);
  return [`(1) ${OUT_NAME} is not what the shipping composer makes of the made-up world now (first difference at line ${String(first + 1)}); run node build/p3333/sample.mjs`];
}

/** A piece by index, or undefined when the index is not one. */
const pieceAt = (list, i) => (Number.isInteger(i) && i >= 0 && i < list.length ? list[i] : undefined);

/**
 * (2) Every skeleton re-assembled by dereference, as the phone assembles it,
 * equals the shipping composer's answer field for field, `at` set aside and
 * `asked` the query's own words.
 */
function assemblyClause(parsed, composed) {
  const problems = [];
  const p = parsed.pieces ?? {};
  const k = parsed.constants ?? {};
  for (const [state, answers] of composed) {
    const entry = parsed.lists?.[state];
    if (entry === undefined) {
      problems.push(`(2) state ${state}: the file holds no lists`);
      continue;
    }
    const blocked = {
      rows: (entry.blocked?.rows ?? []).map((i) => pieceAt(p.blockedRows ?? [], i)),
      others: (entry.blocked?.others ?? []).map((i) => pieceAt(p.blockedRows ?? [], i)),
      othersOmitted: entry.blocked?.othersOmitted,
      emptyLine: k.emptyLine,
      ageNote: k.blockedAgeNote
    };
    if (!deepEqual(blocked, withoutAt(answers.blocked))) problems.push(`(2) state ${state}, blocked: the assembled answer is not the shipping composer's`);
    for (const question of QUERIES) {
      const want = answers.sessions.get(question.key);
      const skeleton = entry.sessions?.[question.key];
      if (want === undefined || skeleton === undefined) {
        problems.push(`(2) state ${state}, ${question.key}: no ${want === undefined ? 'composed answer' : 'skeleton'}`);
        continue;
      }
      const assembled = {
        asked: question.asked,
        rows: (skeleton.rows ?? []).map((i) => pieceAt(p.sessionsRows ?? [], i)),
        groups: (skeleton.groups ?? []).map((i) => pieceAt(p.groups ?? [], i)),
        agents: (skeleton.agents ?? []).map((i) => pieceAt(p.choices ?? [], i)),
        machines: (skeleton.machines ?? []).map((i) => pieceAt(p.choices ?? [], i)),
        total: skeleton.total,
        omitted: skeleton.omitted,
        ageNote: k.sessionsAgeNote
      };
      if (!deepEqual(assembled, withoutAt(want))) problems.push(`(2) state ${state}, ${question.key}: the assembled answer is not the shipping composer's`);
    }
  }
  return problems;
}

/**
 * (2) Every per-session answer says what the world was chosen to make it say:
 * the waiting session offers its three options under its question id and its
 * screen's mark, every other offers nothing, a live variant has a Screen and an
 * End with the Mac's confirmation, an ended one neither, the answers carry
 * the composer's clock, and the file's constants are main's own words.
 */
function readBackClause(parsed) {
  const problems = [];
  const k = parsed.constants ?? {};
  if (k.blockedAgeNote !== POCKET_AGE_HONESTY || k.sessionsAgeNote !== POCKET_AGE_HONESTY || k.emptyLine !== NOTHING_NEEDS_YOU) {
    problems.push("(2) the constants are not main's own words: the door's age note and the tray's empty line");
  }
  for (const session of SESSIONS) {
    for (const variant of session.variants) {
      const answer = parsed.session?.[session.id]?.[variant];
      const turns = parsed.turns?.[session.id]?.[variant];
      if (answer === undefined || turns === undefined) continue;
      const detail = answer.session ?? {};
      const live = liveVariant(variant);
      const question = QUESTIONS[session.id];
      const waiting = variant === 'waiting' && question !== undefined;
      const wantReply = waiting
        ? {
            question: world.questionIdOf(session.id, 1),
            mark: parsed.screen?.[session.id]?.waiting?.answer?.screen?.dialog ?? null,
            pressable: question.options.map((o) => o.marker),
            command: question.command,
            canSay: false
          }
        : { question: null, mark: null, pressable: [], command: null, canSay: false };
      if (!deepEqual(detail.reply, wantReply)) problems.push(`(2) ${session.id} ${variant}: the session answer's reply is not the offer the world chose`);
      if (waiting && (detail.reply?.mark ?? null) === null) problems.push(`(2) ${session.id} waiting: no mark, so no press could be offered`);
      if (detail.screen !== live) problems.push(`(2) ${session.id} ${variant}: the session answer says screen ${String(detail.screen)}`);
      if (live !== (detail.end?.state === 'offered')) problems.push(`(2) ${session.id} ${variant}: End is ${detail.end?.state ?? 'absent'}`);
      if (live !== (detail.endConfirm !== null && typeof detail.endConfirm === 'object')) problems.push(`(2) ${session.id} ${variant}: the End confirmation is ${detail.endConfirm === null ? 'missing' : 'there on an ended session'}`);
      if (detail.agentLabel !== agentLabelOf(session.agent)) problems.push(`(2) ${session.id} ${variant}: the agent is drawn ${String(detail.agentLabel)}`);
      if (answer.at !== T || turns.at !== T) problems.push(`(2) ${session.id} ${variant}: an answer's at is not the composer's clock`);
      const count = world.TURNS[session.id].length;
      if ((turns.turns ?? []).length !== count || detail.turnCount !== count) problems.push(`(2) ${session.id} ${variant}: the turns are not the world's ${String(count)}`);
      if (count < 3 || count > 6) problems.push(`(2) ${session.id}: ${String(count)} turns, where the world holds 3 to 6`);
      if (turns.more !== false) problems.push(`(2) ${session.id} ${variant}: the turns say an older page exists`);
    }
  }
  return problems;
}

/** (3) The file is complete: every state, every query, every index in range, every piece used. */
function completeClause(parsed) {
  const problems = [];
  const p = parsed.pieces ?? {};
  const used = { blockedRows: new Set(), sessionsRows: new Set(), groups: new Set(), choices: new Set() };
  const take = (kind, indexes, where) => {
    for (const i of indexes ?? []) {
      if (pieceAt(p[kind] ?? [], i) === undefined) problems.push(`(3) ${where}: ${kind} index ${JSON.stringify(i)} is out of range`);
      else used[kind].add(i);
    }
  };
  const stateKeys = STATES.map(stateKey);
  const fileStates = Object.keys(parsed.lists ?? {});
  if (fileStates.length !== stateKeys.length || stateKeys.some((key, i) => fileStates[i] !== key)) {
    problems.push(`(3) the file holds ${String(fileStates.length)} states, not the ${String(stateKeys.length)} the variants make, in their order`);
  }
  for (const key of stateKeys) {
    const entry = parsed.lists?.[key];
    if (entry === undefined) {
      problems.push(`(3) state ${key} is missing`);
      continue;
    }
    take('blockedRows', entry.blocked?.rows, `state ${key} blocked`);
    take('blockedRows', entry.blocked?.others, `state ${key} blocked others`);
    const keys = Object.keys(entry.sessions ?? {});
    if (keys.length !== QUERIES.length || QUERIES.some((q, i) => keys[i] !== q.key)) {
      problems.push(`(3) state ${key}: ${String(keys.length)} sessions questions, not the ${String(QUERIES.length)} in their order`);
    }
    for (const question of QUERIES) {
      const skeleton = entry.sessions?.[question.key];
      if (skeleton === undefined) continue;
      take('sessionsRows', skeleton.rows, `state ${key} ${question.key}`);
      take('groups', skeleton.groups, `state ${key} ${question.key}`);
      take('choices', skeleton.agents, `state ${key} ${question.key}`);
      take('choices', skeleton.machines, `state ${key} ${question.key}`);
    }
  }
  for (const kind of Object.keys(used)) {
    const list = p[kind] ?? [];
    if (list.length === 0) problems.push(`(3) there are no ${kind} pieces`);
    for (let i = 0; i < list.length; i += 1) if (!used[kind].has(i)) problems.push(`(3) ${kind} piece ${String(i)} is used by no skeleton`);
  }
  for (const session of SESSIONS) {
    for (const variant of session.variants) {
      for (const member of ['session', 'turns', 'screen']) {
        if (parsed[member]?.[session.id]?.[variant] === undefined) problems.push(`(3) ${member} ${session.id} ${variant} is missing`);
      }
    }
    const live = session.variants.some(liveVariant);
    for (const member of ['history', 'pageEnded', 'pageMoved']) {
      if (live !== (parsed[member]?.[session.id] !== undefined)) problems.push(`(3) ${member} ${session.id} is ${live ? 'missing' : 'there for a session with no terminal'}`);
    }
  }
  if (!deepEqual(parsed.ids, SESSIONS.map((s) => s.id))) problems.push('(3) ids are not the world\'s sessions in order');
  if (!deepEqual(parsed.variants, SESSIONS.map((s) => [...s.variants]))) problems.push('(3) variants are not the world\'s');
  if (!deepEqual([...(parsed.agents ?? [])].sort(), ['claude', 'codex'])) problems.push(`(3) agents are ${JSON.stringify(parsed.agents)}, not Claude Code's and Codex CLI's ids`);
  if (parsed.format !== 1 || parsed.clock !== T) problems.push('(3) format or clock is not the one this script writes');
  return problems;
}

/**
 * An absolute path as a terminal would print one: a `/` at the start of a row
 * or after a blank, a quote, a bracket or `=`, then a name. The screens are
 * made up and draw relative paths only (§5.1.1, "no absolute path"); the deny
 * list names the homes and volumes, and this names the shape.
 */
const ABSOLUTE_PATH = /(^|[\s'"(`=])\/[A-Za-z0-9._~-]/;

/** The text of a row of runs. */
const textOfRow = (row) => (row ?? []).map((run) => run?.text ?? '').join('');

/** Cells a row of runs covers. */
const cellsOfRow = (row) => (row ?? []).reduce((sum, run) => sum + (run?.cells ?? 0), 0);

/** (4) The screens, the echo's rows and the histories, as the file holds them. */
function screensClause(parsed) {
  const problems = [];
  for (const session of SESSIONS) {
    const history = parsed.history?.[session.id];
    const spaces = new Set();
    if (history !== undefined) {
      if (history.depth !== HISTORY || history.wrap !== COLS || history.from !== 0 || (history.rows ?? []).length !== HISTORY) {
        problems.push(`(4) ${session.id}: its history is not ${String(HISTORY)} rows at wrap ${String(COLS)} from 0`);
      }
      if ((history.rows?.[0] ?? []).length === 0) problems.push(`(4) ${session.id}: its history's first row is blank`);
      for (const row of history.rows ?? []) {
        for (const run of row) if (!(Number.isInteger(run.style) && run.style >= 0 && run.style < (history.styles ?? []).length)) problems.push(`(4) ${session.id}: a history run names a style the page does not hold`);
        if (cellsOfRow(row) > COLS) problems.push(`(4) ${session.id}: a history row is wider than ${String(COLS)}`);
      }
      spaces.add(history.space);
      (history.rows ?? []).forEach((row, i) => {
        if (ABSOLUTE_PATH.test(textOfRow(row))) problems.push(`(4) ${session.id}: history row ${String(i)} draws an absolute path`);
      });
      if (parsed.pageEnded?.[session.id]?.why !== 'ended' || parsed.pageEnded?.[session.id]?.sentence !== SCREEN_ENDED) problems.push(`(4) ${session.id}: its ended page is not main's ended absence`);
      if (parsed.pageMoved?.[session.id]?.why !== 'moved' || parsed.pageMoved?.[session.id]?.sentence !== SCROLLBACK_MOVED) problems.push(`(4) ${session.id}: its moved page is not main's moved absence`);
    }
    for (const variant of session.variants) {
      const entry = parsed.screen?.[session.id]?.[variant];
      if (entry === undefined) continue;
      const screen = entry.answer?.screen ?? null;
      if (!liveVariant(variant)) {
        if (screen !== null || entry.answer?.why !== 'ended' || entry.answer?.sentence !== SCREEN_ENDED) problems.push(`(4) ${session.id} ${variant}: not main's ended screen`);
        if (entry.prompt !== null || entry.note !== null) problems.push(`(4) ${session.id} ${variant}: an ended screen carries echo rows`);
        continue;
      }
      if (screen === null) {
        problems.push(`(4) ${session.id} ${variant}: a live variant has no picture`);
        continue;
      }
      if (screen.cols !== COLS || screen.rows !== ROWS) problems.push(`(4) ${session.id} ${variant}: the screen is ${String(screen.cols)}x${String(screen.rows)}`);
      (screen.lines ?? []).forEach((row, i) => {
        if (ABSOLUTE_PATH.test(textOfRow(row))) problems.push(`(4) ${session.id} ${variant}: row ${String(i)} draws an absolute path`);
      });
      if (screen.depth !== HISTORY) problems.push(`(4) ${session.id} ${variant}: the picture's depth is ${String(screen.depth)}, not ${String(HISTORY)}`);
      spaces.add(screen.space);
      const styles = screen.styles ?? [];
      const styleOk = (i) => Number.isInteger(i) && i >= 0 && i < styles.length;
      const inside = (row) => Number.isInteger(row) && row >= 0 && row < screen.rows;
      if ((entry.prompt === null) !== (entry.note === null)) problems.push(`(4) ${session.id} ${variant}: a prompt without a note row, or a note row without a prompt`);
      if (variant === 'waiting' && entry.prompt !== null) problems.push(`(4) ${session.id} waiting: a waiting screen carries a prompt`);
      if (variant !== 'waiting' && entry.prompt === null) problems.push(`(4) ${session.id} ${variant}: a screen at the agent's prompt carries no prompt row`);
      if (entry.prompt !== null && entry.note !== null) {
        const { row, column, style } = entry.prompt;
        if (!inside(row) || !inside(entry.note.row) || row === entry.note.row) problems.push(`(4) ${session.id} ${variant}: the prompt and note rows are not two rows of the screen`);
        if (!styleOk(style) || !styleOk(entry.note.style)) problems.push(`(4) ${session.id} ${variant}: an echo style is not an index of the screen's table`);
        if (!(Number.isInteger(column) && column >= 1 && column < screen.cols)) problems.push(`(4) ${session.id} ${variant}: the prompt column ${String(column)} leaves no cell to type in`);
        if (inside(row) && cellsOfRow(screen.lines[row]) !== column) problems.push(`(4) ${session.id} ${variant}: the prompt row's runs cover ${String(cellsOfRow(screen.lines[row]))} cells, not its column ${String(column)}`);
        if (inside(entry.note.row) && (screen.lines[entry.note.row] ?? []).length !== 0) problems.push(`(4) ${session.id} ${variant}: the note row is not empty`);
      }
    }
    if (spaces.size > 1) problems.push(`(4) ${session.id}: its pictures and its history name ${String(spaces.size)} spaces, not one`);
    if (spaces.size === 1 && [...spaces][0] !== spaceOf(session.pane ?? '')) problems.push(`(4) ${session.id}: its space is not its pane's`);
  }
  return problems;
}

/**
 * (4) At composition: every captured row drawn whole (nothing cut at the
 * screen's edge), the cursor where the prompt is, a question asked only on a
 * waiting screen, and the shipping detector reading the world's own question
 * and options back off the waiting screen.
 */
function composedClause(entries) {
  const problems = [];
  for (const { session, variant, capture, composed, prompt } of entries) {
    const where = `(4) ${session.id} ${variant}`;
    if (capture.rows.length !== ROWS) problems.push(`${where}: the world draws ${String(capture.rows.length)} rows, not ${String(ROWS)}`);
    const plain = composed.plain.split('\n');
    capture.rows.forEach((row, i) => {
      if ((plain[i] ?? '').replace(/\s+$/, '') !== plainRow(row)) problems.push(`${where}: row ${String(i)} is not drawn whole`);
    });
    const screen = composed.screen;
    if (variant === 'waiting') {
      if (!screen.asking || screen.dialog === null) problems.push(`${where}: the waiting screen asks nothing`);
      const read = detectDialogRows(normalizeCapture(composed.plain));
      const question = QUESTIONS[session.id];
      if (question === undefined || !read.atChoice || read.question !== question.question || !deepEqual(read.options, question.options)) {
        problems.push(`${where}: the shipping detector does not read the world's question and options off the screen`);
      }
      if (question?.command !== null && question !== undefined && !plain.some((line) => line.trim() === `$ ${question.command}`)) {
        problems.push(`${where}: the command is not drawn on its own $ row`);
      }
    } else {
      if (screen.asking || screen.dialog !== null) problems.push(`${where}: a screen at the prompt reads as a question`);
      if (prompt !== null && (screen.cursor.x !== prompt.column || screen.cursor.y !== prompt.row || !screen.cursor.visible)) {
        problems.push(`${where}: the cursor is not at the prompt's column`);
      }
    }
    if (prompt !== null && (prompt.style < 0)) problems.push(`${where}: the typed style is not in the screen's table`);
  }
  return problems;
}

/** The deny list (§5.1.5), each a pattern and a text it must catch. */
const DENY = [
  [/\/Users\//, 'in /Users/someone'],
  [/\/home\//, 'in /home/someone'],
  [/\/private\//, 'in /private/var'],
  [/\/tmp/, 'in /tmp'],
  [/\/var\//, 'in /var/folders'],
  [/\/Volumes\//, 'in /Volumes/disk'],
  [/~\//, 'in ~/work'],
  [/https?:\/\//, 'at https://example'],
  [/www\./, 'at www.example'],
  [/\w@\w+\.\w/, 'mail someone@example.org'],
  [/gdc/, 'by gdc'],
  [/gregce/, 'by gregce'],
  [/Greg/, 'by Greg'],
  [/Ceccarelli/, 'by Ceccarelli'],
  [/Ita Vero/, 'by Ita Vero'],
  [/itavero/, 'at itavero'],
  [/Mac Pro/, 'on the Mac Pro'],
  [/Opus/, 'Opus answered'],
  [/Sonnet/, 'Sonnet answered'],
  [/Haiku/, 'Haiku answered'],
  [/GPT/, 'GPT answered'],
  [/gpt-/, 'gpt-5 answered'],
  [/\bo[34](-mini)?\b/, 'o4-mini answered'],
  [/Gemini/, 'Gemini answered'],
  [/claude-[0-9a-z]/, 'claude-opus answered'],
  [/\$\d/, 'it cost $3'],
  [/\btokens?\b/i, '12k Tokens'],
  [/\bcost\b/i, 'Cost so far'],
  [/\bbilling\b/i, 'API Billing'],
  [/\busage\b/i, 'API Usage'],
  [/context left/i, '12% context left'],
  [/\bbeta\b/i, 'the Beta'],
  [/TestFlight/, 'on TestFlight']
];

/** How many patterns §5.1.5 names: a pattern taken out of DENY takes its own proof with it, so the count is held too. */
const DENY_PATTERNS = 33;

/** The file's text with every `\uXXXX` read back to its character. */
const unescaped = (text) => text.replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex) => String.fromCharCode(Number.parseInt(hex, 16)));

/** (5) No pattern of the deny list anywhere in the file. */
function denyClause(text) {
  const read = unescaped(text);
  const problems = [];
  if (DENY.length !== DENY_PATTERNS) problems.push(`(5) the deny list holds ${String(DENY.length)} patterns, not the ${String(DENY_PATTERNS)} SPEC §5.1.5 names`);
  for (const [pattern] of DENY) {
    const hit = pattern.exec(read);
    if (hit !== null) {
      const at = hit.index;
      problems.push(`(5) the file holds ${pattern} at character ${String(at)}: …${JSON.stringify(read.slice(Math.max(0, at - 24), at + 24))}…`);
    }
  }
  return problems;
}

/**
 * (2) One answer per variant is honest: a session's `/v1/session`, `/v1/turns`
 * and screen answers, composed in EVERY state that holds its variant, are the
 * very answers the file holds for that variant, because the phone reads one
 * per variant whatever the other sessions are doing.
 */
function independenceClause(parsed, states) {
  const problems = [];
  for (const [state, byId] of states) {
    const variants = state.split('.');
    SESSIONS.forEach((session, i) => {
      const variant = variants[i];
      const got = byId[session.id];
      if (got === undefined) return;
      const same =
        deepEqual(parsed.session?.[session.id]?.[variant], got.session) &&
        deepEqual(parsed.turns?.[session.id]?.[variant], got.turns) &&
        deepEqual(parsed.screen?.[session.id]?.[variant]?.answer, got.screen);
      if (!same) problems.push(`(2) ${session.id} ${variant}: its answers in state ${state} are not the file's, so one answer per variant would lie`);
    });
  }
  return problems;
}

/** Every clause but the bytes and the composition's own screens, over one text. */
function contentClauses(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return [`(3) the file is not JSON: ${String(err?.message ?? err)}`];
  }
  return [
    ...assemblyClause(parsed, composedLists),
    ...readBackClause(parsed),
    ...independenceClause(parsed, perState),
    ...completeClause(parsed),
    ...screensClause(parsed),
    ...denyClause(text)
  ];
}

/** The composition's screens, each as `composedClause` reads it. */
const ENTRIES = [...screens.values()];

/**
 * EVERY CLAUSE, the one function the run and every proof ask, so a clause
 * taken out of it turns its own proofs green and the run is refused: the
 * file's text, the composition's screens, and (when `committed` is given, as
 * `--check` gives it) the committed bytes.
 */
function verdict(text, entries, committed) {
  return [...(committed === undefined ? [] : bytesClause(text, committed)), ...contentClauses(text), ...composedClause(entries)];
}

// ---------------------------------------------------------------------------
// The proofs: each clause red on a copy it breaks, green on the book
// ---------------------------------------------------------------------------

/**
 * Each proof breaks ONE thing in a copy and names the clause that must turn
 * red, and every proof is judged by {@link verdict}, the very function the run
 * asks: a clause whose proof stays green has stopped checking what it says, or
 * has been taken out of the run, and the run is refused. The book itself must
 * be green under every clause.
 */
function proofs() {
  const out = [];
  const base = JSON.parse(TEXT);
  /**
   * Red on `clause`, and, where several checks share a clause number, red in
   * the words of the one check the break is aimed at (`needle`), so taking any
   * one check out of the run turns a proof green.
   */
  const red = (name, clause, problems, needle = '') => {
    out.push({ name, clause, ok: problems.some((p) => p.startsWith(`(${String(clause)})`) && p.includes(needle)) });
  };
  /** A copy of the book with one thing broken, as the file's text. */
  const broken = (fn) => {
    const copy = clone(base);
    fn(copy);
    return textOf(copy);
  };
  const judge = (fn) => verdict(broken(fn), ENTRIES);
  const judgeEntries = (entries) => verdict(TEXT, entries);
  const firstLive = SESSIONS.find((s) => s.variants.some((v) => v !== 'waiting' && liveVariant(v)));
  const liveVariantOf = firstLive.variants.find((v) => v !== 'waiting' && liveVariant(v));
  const firstState = Object.keys(base.lists)[0];

  // (1) one byte, and no file.
  red('a changed byte', 1, verdict(TEXT, ENTRIES, `${TEXT.slice(0, 40)}x${TEXT.slice(41)}`));
  red('a missing file', 1, verdict(TEXT, ENTRIES, null));
  // (2) a piece's word, two indexes swapped, a count, a constant; the read-backs; one answer per variant.
  red('a session row renamed', 2, judge((b) => { b.pieces.sessionsRows[0].name += 'x'; }), "the assembled answer is not the shipping composer's");
  red('a blocked row re-aged', 2, judge((b) => { b.pieces.blockedRows[0].ageText = '99d'; }), "the assembled answer is not the shipping composer's");
  red('two rows swapped', 2, judge((b) => {
    const skeleton = Object.values(b.lists).flatMap((e) => Object.values(e.sessions)).find((k) => k.rows.length > 1);
    skeleton.rows.reverse();
  }), "the assembled answer is not the shipping composer's");
  red('a total moved', 2, judge((b) => { b.lists[firstState].sessions['all.project.recent.*'].total += 1; }), "the assembled answer is not the shipping composer's");
  red('others omitted moved', 2, judge((b) => { b.lists[firstState].blocked.othersOmitted += 1; }), "the assembled answer is not the shipping composer's");
  red('the empty line changed', 2, judge((b) => { b.constants.emptyLine += '.'; }), "the assembled answer is not the shipping composer's");
  red('the age note changed', 2, judge((b) => { b.constants.sessionsAgeNote += '.'; }), "the assembled answer is not the shipping composer's");
  red('a constant that is not main\'s word', 2, judge((b) => { b.constants.emptyLine += '.'; }), "the constants are not main's own words");
  red('a reply missing an option', 2, judge((b) => { b.session['sample-1'].waiting.session.reply.pressable.pop(); }), 'is not the offer the world chose');
  red('a press on an answered session', 2, judge((b) => { b.session['sample-1'].answered.session.reply = b.session['sample-1'].waiting.session.reply; }), 'is not the offer the world chose');
  red('an End on an ended session', 2, judge((b) => { b.session['sample-5'].ended.session.end = { state: 'offered', batch: true }; }), 'End is offered');
  red('a turn missing', 2, judge((b) => { b.turns['sample-4'].live.turns.pop(); }), "are not the world's");
  red('an answer that is not every state\'s', 2, judge((b) => { b.session['sample-3'].live.session.lastMessageText = '1m'; }), 'would lie');
  // (3) a state, a question, an index, an unused piece, a history, a screen.
  red('a state missing', 3, judge((b) => { delete b.lists[Object.keys(b.lists)[5]]; }), 'is missing');
  red('a question missing', 3, judge((b) => { delete b.lists[firstState].sessions['ended.none.oldest.codex']; }), 'sessions questions, not the');
  red('an index out of range', 3, judge((b) => { b.lists[firstState].blocked.rows.push(9999); }), 'is out of range');
  red('an unused piece', 3, judge((b) => { b.pieces.groups.push({ id: 'unused' }); }), 'is used by no skeleton');
  red('a history missing', 3, judge((b) => { delete b.history['sample-3']; }), 'history sample-3 is missing');
  red('a screen missing', 3, judge((b) => { delete b.screen['sample-2'].answered; }), 'screen sample-2 answered is missing');
  // (4) the echo's rows, a style, a depth, a space, a history, an absence.
  red('the prompt column moved', 4, judge((b) => { b.screen[firstLive.id][liveVariantOf].prompt.column += 1; }), "the prompt row's runs cover");
  red('the note row on an inked row', 4, judge((b) => { b.screen[firstLive.id][liveVariantOf].note.row = 0; }), "the note row is not empty");
  red('the note row on the prompt row', 4, judge((b) => {
    const entry = b.screen[firstLive.id][liveVariantOf];
    entry.note.row = entry.prompt.row;
  }), 'are not two rows of the screen');
  red('a style past the table', 4, judge((b) => { b.screen[firstLive.id][liveVariantOf].prompt.style = 9999; }), "is not an index of the screen's table");
  red('a prompt on a waiting screen', 4, judge((b) => {
    b.screen['sample-1'].waiting.prompt = b.screen['sample-1'].answered.prompt;
    b.screen['sample-1'].waiting.note = b.screen['sample-1'].answered.note;
  }), 'a waiting screen carries a prompt');
  red('a depth moved', 4, judge((b) => { b.screen['sample-1'].answered.answer.screen.depth = 59; }), "the picture's depth");
  red('a second space', 4, judge((b) => { b.screen['sample-1'].answered.answer.screen.space = '000000000000'; }), "spaces, not one");
  red('a history row short', 4, judge((b) => { b.history['sample-4'].rows.pop(); }), "its history is not");
  red('an absolute path on a screen', 4, judge((b) => { b.screen['sample-3'].live.answer.screen.lines[0][0].text = 'cd /sample/lighthouse'; }), 'draws an absolute path');
  red('an absolute path in a history', 4, judge((b) => { b.history['sample-4'].rows[3] = [{ text: "open('/etc/hosts')", style: 0, cells: 18 }]; }), 'draws an absolute path');
  red('a blank first history row', 4, judge((b) => { b.history['sample-2'].rows[0] = []; }), "first row is blank");
  red('a moved page that is not main\'s', 4, judge((b) => { b.pageMoved['sample-3'].sentence = 'moved'; }), "its moved page");
  red('a picture on an ended screen', 4, judge((b) => { b.screen['sample-5'].ended.answer.screen = b.screen['sample-3'].live.answer.screen; }), "not main's ended screen");
  const waitingEntry = ENTRIES.find((e) => e.variant === 'waiting');
  const promptEntry = ENTRIES.find((e) => e.prompt !== null);
  const swap = (entry, changed) => ENTRIES.map((e) => (e === entry ? changed : e));
  red('a captured row cut', 4, judgeEntries(swap(promptEntry, { ...promptEntry, capture: { ...promptEntry.capture, rows: promptEntry.capture.rows.map((r, i) => (i === 0 ? `${r}${'x'.repeat(COLS + 1)}` : r)) } })), "is not drawn whole");
  red('the cursor off the prompt', 4, judgeEntries(swap(promptEntry, { ...promptEntry, prompt: { ...promptEntry.prompt, column: promptEntry.prompt.column + 1 } })), "the cursor is not at the prompt's column");
  red('a question the detector does not read', 4, judgeEntries(swap(waitingEntry, { ...waitingEntry, session: { ...waitingEntry.session, id: 'sample-3' } })), "does not read the world's question");
  red('a waiting screen that asks nothing', 4, judgeEntries(swap(waitingEntry, { ...waitingEntry, composed: { ...waitingEntry.composed, screen: { ...waitingEntry.composed.screen, asking: false } } })), "the waiting screen asks nothing");
  red('a prompt screen that reads as a question', 4, judgeEntries(swap(promptEntry, { ...promptEntry, composed: { ...promptEntry.composed, screen: { ...promptEntry.composed.screen, dialog: '000000000000' } } })), "reads as a question");
  // (5) every pattern on a text of its own, and through an escape.
  for (const [pattern, sample] of DENY) {
    red(`the deny pattern ${String(pattern)}`, 5, verdict(asciiOnly(JSON.stringify({ name: sample })), ENTRIES));
  }
  red('a denied word behind \\u escapes', 5, verdict('{"name":"\\u0054est\\u0046light"}', ENTRIES));
  red('a path inside escaped text', 5, verdict(asciiOnly(JSON.stringify({ name: '\u00e9 /Users/\u00e9' })), ENTRIES));
  // The book itself is green under every clause.
  const clean = verdict(TEXT, ENTRIES);
  out.push({ name: 'the book itself under every clause', clause: 0, ok: clean.length === 0, problems: clean });
  return out;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const proved = proofs();
const problems = [...composeProblems];
for (const p of proved.filter((one) => !one.ok)) {
  if (p.clause === 0) problems.push(...(p.problems ?? []));
  else problems.push(`(${String(p.clause)}) its proof stayed green on ${p.name}: the clause has stopped checking, or is no longer run`);
}

if (SELF_TEST) {
  if (problems.length > 0) {
    process.stdout.write(`${TAG} SELF-TEST FAIL, ${String(problems.length)}:\n`);
    for (const p of problems.slice(0, 60)) process.stdout.write(`  - ${p}\n`);
    process.exit(1);
  }
  process.stdout.write(`${TAG} SELF-TEST PASS: ${String(proved.length - 1)} breaks, each red on its own clause through the run's own verdict, and the book green under all five.\n`);
  process.exit(0);
}

if (CHECK) {
  let committed = null;
  try {
    committed = readFileSync(OUT, 'utf8');
  } catch {
    committed = null;
  }
  // The book's own clauses ran under the proofs' last line; the bytes are asked here, by the same verdict.
  problems.push(...verdict(TEXT, ENTRIES, committed).filter((p) => p.startsWith('(1)')));
}

if (problems.length > 0) {
  process.stdout.write(`${TAG} FAIL, ${String(problems.length)}:\n`);
  for (const p of problems.slice(0, 60)) process.stdout.write(`  - ${p}\n`);
  if (problems.length > 60) process.stdout.write(`  … and ${String(problems.length - 60)} more\n`);
  process.exit(1);
}

const pieceCount = book.pieces.blockedRows.length + book.pieces.sessionsRows.length + book.pieces.groups.length + book.pieces.choices.length;
const listAnswers = STATES.length * (1 + QUERIES.length);
const sessionCount = SESSIONS.reduce((n, s) => n + s.variants.length, 0);
const screenCount = Object.values(book.screen).reduce((n, byVariant) => n + Object.values(byVariant).filter((e) => e.answer?.screen !== null).length, 0);
const historyCount = Object.keys(book.history).length;
const numbers = `${String(SESSIONS.length)} sessions, ${String(STATES.length)} states, ${counted(listAnswers)} list answers from ${counted(pieceCount)} pieces, ${String(sessionCount)} sessions, ${String(screenCount)} screens, ${String(historyCount)} histories`;

if (CHECK) {
  process.stdout.write(`${TAG} PASS: ${OUT_NAME} is what the shipping composer makes of the made-up world: ${numbers}.\n`);
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, TEXT, 'utf8');
  process.stdout.write(
    `${TAG} wrote ${OUT_NAME}: ${numbers}; pieces ${String(book.pieces.blockedRows.length)} blocked rows, ${String(book.pieces.sessionsRows.length)} sessions rows, ${String(book.pieces.groups.length)} groups, ${String(book.pieces.choices.length)} choices; ${counted(Buffer.byteLength(TEXT, 'utf8'))} bytes.\n`
  );
}
