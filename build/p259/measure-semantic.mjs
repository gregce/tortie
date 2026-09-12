#!/usr/bin/env node
/**
 * measure-semantic.mjs. The Phase 259 measurement: two agents read this
 * repository, through the SHIPPED enrich path, and the readings are written
 * down (spec build/p259/SPEC.md §5).
 *
 * ## THE TOKEN RULE, AND THE WHOLE SHAPE OF ITS LIFT
 *
 * The operator lifted "spend no token" on 2026-09-12, narrowly, in these
 * words: "use claude on this machine (with our sub) and codex on this machine
 * (with our sub) with Opus and Astra models respectively to measure the
 * ability to derive the semantic layer." Everything below is that sentence
 * made mechanical, and nothing below widens it.
 *
 *  - THE PATH IS THE SHIPPED ONE. This harness drives `arch:enrich` through
 *    the running app's own bridge. It composes no argv, it never calls
 *    `runFold`, it never spawns a CLI, and it has no model name of its own:
 *    the model is the one the profile's settings name, which the shipped
 *    recipe table has to admit. What is measured is what ships, which is the
 *    phase entry's own refusal.
 *  - THE GATE IS THE SHIPPED ONE. `ArchPassRunner` re-reads the Phase 23
 *    confirm gate at the spawn, applies the prompt cap, the minimum interval
 *    and the same-input-hash refusal. No agreement is forged: `claude` and
 *    `codex` are BUILTIN launchable registry rows, and `harnessConfirmedNow`
 *    answers true for a builtin with no seal at all, because refusal 8's gate
 *    exists for CONFIGURED agents and a builtin IS the compiled world.
 *  - THE REPOSITORY IS A SCRATCH CLONE of this worktree, made by
 *    build/p259/corpus.sh, which refuses eight of his directories by name and
 *    refuses a target equal to its source. Nothing else is read. No second
 *    repository, at his word.
 *  - THE PROFILE AND `HOME` ARE SCRATCH, and every Electron goes through
 *    build/electron-run.mjs, ended in a finally block with its socket file
 *    unlinked there too.
 *  - `CLAUDE_CONFIG_DIR` AND `CODEX_HOME` ARE NOT SET. The CLIs keep their own
 *    real logins, which is the whole point of his word; the containment is the
 *    recipe flags rather than a redirected home. His keychain is never opened,
 *    no `security` runs, and no token byte reaches any file this writes.
 *  - ONE FULL READING PER RECIPE, and at most one repeat if a run fails for a
 *    reason this prints. `--asks` bounds it further and never raises it, and
 *    `--only <scope>` narrows it to the part asks or to the journeys ask
 *    alone, which is what a repeat aimed at ONE defect costs rather than a
 *    whole reading. `--out <name>` writes that repeat beside the full record
 *    rather than over it, because a narrowed run is not a reading.
 *
 * ## `--dry-run` IS THE ONLY MODE A BUILDER RUNS, AND IT SPENDS NOTHING
 *
 * It drives the same clone, the same profile, the same Electron and the same
 * `arch:enrich` channel, and reads the REFUSAL back. When it was written both
 * semantic rows were drafts with no measurement date, so every ask answered
 * `no-recipe` and the dry run proved the "measured or disabled" rule end to
 * end. Since the codex row was measured on 2026-09-12 that row is LIVE, so a
 * dry run against `--agent codex` refuses at the choice rather than at the
 * table and `--agent claude` is the arm that still reads `no-recipe`. The dry
 * run proves the whole chain —
 * the clone, the seed, the window, the part list, the channel, the record —
 * AND proves the phase's own "measured or disabled" rule end to end: with
 * nothing measured, nothing can start. It also drives `agentId: null` and
 * reads `no-choice`, so a refusal that refused everything cannot read as a
 * pass.
 *
 * ## WHAT IS RECORDED
 *
 * Per recipe, into build/p259/measured/<agentId>.json: agentId, model,
 * recipeVersion, measuredOn, the ask count actually made, per-ask wallMs,
 * verdict, reason, detail, costUsd where the CLI reports one, the composed
 * prompt bytes, the answer bytes, claims, rowsDropped, and the totals. Honest
 * numbers included, refusals included, and a refusal's NAME is a result rather
 * than a failure of the run. codex reports no dollar figure, so its cost is
 * null and the two cost columns are not comparable.
 *
 * The grades reading (a) is taken from the shipped `arch:semantic` channel
 * after the asks and written beside it as <agentId>.reading.json. Readings (b)
 * and (c) are build/p259/agree.mts and build/p259/blind.mts, run after this.
 *
 * ## SAFETY
 *
 * His `-L gmux` server is READ ONLY and is counted before and after; nothing
 * attaches, sends keys or kills. Without GMUX_TMUX_SOCKET beginning
 * `gmux-p259` it makes `gmux-p259-<pid>` itself and unlinks that socket file
 * in its finally block. The clone is removed by corpus.sh in the finally block
 * whatever happened. `npm run shot` is never run. At most ONE Electron at a
 * time.
 *
 * Usage, from the worktree root:
 *   node build/p259/measure-semantic.mjs --dry-run
 *   node build/p259/measure-semantic.mjs --agent claude --model opus
 *   node build/p259/measure-semantic.mjs --agent codex  --model gpt-6-astra
 *   node build/p259/measure-semantic.mjs --self-test        (launches nothing)
 *
 * Exit 0 when the run finished, 1 when it did not, 2 when the harness refuses.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { withElectron } from '../electron-run.mjs';
import { seedArchSwitchOn } from '../probe-arch-switch.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p259-measure]';
const say = (line) => process.stdout.write(`${line}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The one place a repository path becomes an ask. Exported so `--self-test`
 * proves it: an ask is `part` once per box that carries a fact, in the map's
 * own order, then `journeys` once, and never more than `cap`.
 */
export function planAsks(boxes, cap, only = null) {
  const parts = [];
  for (const box of boxes ?? []) {
    if (typeof box?.id !== 'string' || box.id.length === 0) continue;
    if ((box.facts ?? 0) <= 0) continue;
    if (parts.some((p) => p.partId === box.id)) continue;
    parts.push({ scope: 'part', partId: box.id });
  }
  const all = [...parts, { scope: 'journeys', partId: null }];
  // `only` NARROWS and can never add: an unknown word leaves the plan whole
  // rather than emptying it, because a run that silently asked nothing would
  // record a reading of nothing.
  const asks = only === 'part' || only === 'journeys' ? all.filter((a) => a.scope === only) : all;
  return typeof cap === 'number' && cap > 0 ? asks.slice(0, cap) : asks;
}

/**
 * What one ask's answer is reduced to for the record. Exported so
 * `--self-test` proves that a refusal is a ROW and never a silence, and that
 * no token byte can reach the file: only these keys are ever written.
 */
export function readAsk(ask, answer, wallMs) {
  const run = answer?.run ?? null;
  return {
    scope: ask.scope,
    partId: ask.partId,
    started: answer?.started === true,
    refusal: answer?.refusal ?? null,
    verdict: run?.verdict ?? null,
    reason: run?.reason ?? null,
    // The validator's own sentence names a field and a reason and carries no
    // model prose, which is why it is safe to record; it is cut all the same.
    detail: typeof run?.detail === 'string' ? run.detail.slice(0, 400) : null,
    wallMs: typeof run?.wallMs === 'number' ? run.wallMs : wallMs,
    costUsd: typeof run?.costUsd === 'number' ? run.costUsd : null,
    promptBytes: typeof run?.promptBytes === 'number' ? run.promptBytes : null,
    answerBytes: typeof run?.answerBytes === 'number' ? run.answerBytes : null,
    claims: typeof run?.claims === 'number' ? run.claims : null,
    rowsDropped: typeof run?.rowsDropped === 'number' ? run.rowsDropped : null
  };
}

/** The totals a reader wants without adding up 9 rows by hand. */
export function totalsOf(rows) {
  // A COLUMN NOBODY ANSWERED SUMS TO NULL AND NEVER TO ZERO, which is the
  // treatment `costUsd` already had and the other four did not. The Phase 259
  // fix round is why: `ArchPassRunFace` carried none of `costUsd`,
  // `promptBytes`, `answerBytes`, `claims` or `rowsDropped`, so `readAsk`
  // recorded null for every one of them on every ask, and this function
  // published `claims: 0` for a run that kept 90 claims and 199 citations. The
  // face answers all five now; a zero here is a run that really produced
  // nothing, and a null is a run that did not say.
  const n = (k) =>
    rows.some((r) => typeof r[k] === 'number')
      ? rows.reduce((a, r) => a + (typeof r[k] === 'number' ? r[k] : 0), 0)
      : null;
  return {
    asks: rows.length,
    started: rows.filter((r) => r.started).length,
    kept: rows.filter((r) => r.verdict === 'kept').length,
    refused: rows.filter((r) => r.verdict === 'refused').length,
    failed: rows.filter((r) => r.verdict === 'failed').length,
    refusedBeforeSpawn: rows.filter((r) => !r.started).length,
    wallMs: n('wallMs') ?? 0,
    costUsd: n('costUsd'),
    promptBytes: n('promptBytes'),
    answerBytes: n('answerBytes'),
    claims: n('claims'),
    rowsDropped: n('rowsDropped')
  };
}

/**
 * How many admitted facts sit under one map box, read off `ArchMapKindCounts`,
 * which is five kind maps and never a `byCategory`. Exported so `--self-test`
 * proves it over the shipped shape: a box with no fact is never asked about,
 * so a count read out of the wrong field would silently plan one ask instead
 * of nine.
 */
export function factsUnder(group) {
  let total = 0;
  for (const kinds of Object.values(group?.counts ?? {})) {
    if (kinds === null || typeof kinds !== 'object') continue;
    for (const n of Object.values(kinds)) if (typeof n === 'number') total += n;
  }
  return total;
}

/** His server, counted and never touched. */
function gmuxSessions() {
  const r = spawnSync('tmux', ['-L', 'gmux', 'list-sessions', '-F', '#{session_id}'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 15_000
  });
  return r.status === 0 ? r.stdout.split('\n').filter(Boolean).length : 0;
}

/** The two CLI versions, read without a turn and without a keychain. */
function preflight() {
  const one = (bin) => {
    // EVERY READ HERE CARRIES A DEADLINE AND NO INHERITED STDIN. A CLI that
    // waits on a terminal would otherwise hold the whole run with nothing
    // printed at all, and a harness that hangs is worse than one that refuses.
    const r = spawnSync(bin, ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 20_000
    });
    if (r.error !== undefined && r.error !== null) return null;
    return r.status === 0 ? (r.stdout || r.stderr).trim().split('\n')[0] : null;
  };
  return { claude: one('claude'), codex: one('codex') };
}

async function cdpForAppWindow(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const answer = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`, 5000);
          if (typeof answer === 'string') return { cdp, url: answer };
          cdp.close();
        } catch {
          if (cdp !== null) {
            try { cdp.close(); } catch { /* the window is not up yet */ }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('the app window never appeared');
    await sleep(250);
  }
}

/** One bridge call, as JSON, never throwing into the drive. */
async function call(cdp, expression, ms) {
  return JSON.parse(
    await cdpEval(
      cdp,
      `(${expression}).then((r) => JSON.stringify(r)).catch((e) => JSON.stringify({ error: String(e) }))`,
      ms
    )
  );
}

// ---------------------------------------------------------------------------
// --self-test: the graders, over planted answers. Launches nothing.
// ---------------------------------------------------------------------------

function selfTest() {
  const problems = [];
  const eq = (what, got, want) => {
    const a = JSON.stringify(got);
    const b = JSON.stringify(want);
    if (a !== b) problems.push(`${what}: got ${a}, wanted ${b}`);
  };

  // planAsks: a box with no fact is never asked, a duplicate is asked once,
  // the journeys ask is last, and the cap cuts rather than reorders.
  eq(
    'planAsks over four boxes of which one is empty',
    planAsks([{ id: 'src-main', facts: 9 }, { id: 'docs', facts: 0 }, { id: 'build', facts: 2 }, { id: 'src-main', facts: 3 }], 0),
    [{ scope: 'part', partId: 'src-main' }, { scope: 'part', partId: 'build' }, { scope: 'journeys', partId: null }]
  );
  eq('planAsks with no box at all still asks for journeys', planAsks([], 0), [{ scope: 'journeys', partId: null }]);
  // `--only` NARROWS. A word nothing knows leaves the plan whole, because a
  // run that silently asked nothing would write down a reading of nothing.
  eq(
    'planAsks --only journeys',
    planAsks([{ id: 'a', facts: 1 }, { id: 'b', facts: 1 }], 0, 'journeys'),
    [{ scope: 'journeys', partId: null }]
  );
  eq(
    'planAsks --only part',
    planAsks([{ id: 'a', facts: 1 }], 0, 'part'),
    [{ scope: 'part', partId: 'a' }]
  );
  eq(
    'planAsks --only nonsense leaves the plan whole',
    planAsks([{ id: 'a', facts: 1 }], 0, 'nonsense').length,
    2
  );
  eq('planAsks capped at 2', planAsks([{ id: 'a', facts: 1 }, { id: 'b', facts: 1 }], 2), [
    { scope: 'part', partId: 'a' },
    { scope: 'part', partId: 'b' }
  ]);

  // factsUnder over the shipped ArchMapKindCounts shape, and over the shape
  // this harness first GUESSED, which read zero for every box.
  eq(
    'factsUnder over five kind maps',
    factsUnder({ counts: { surface: { 'ipc-channel': 229 }, store: { 'store-write': 12 }, effect: { spawn: 30, 'fs-write': 4 }, network: {}, gate: { refusal: 14 } } }),
    289
  );
  eq('factsUnder over a box with every kind at zero', factsUnder({ counts: { surface: { 'ipc-channel': 0 }, store: {}, effect: {}, network: {}, gate: {} } }), 0);
  eq('factsUnder over a box with no counts at all', factsUnder({}), 0);
  // A member that is not a kind map is skipped rather than thrown over, so a
  // map shape that grows a field does not take the plan down with it.
  eq('factsUnder skips a member that is not a kind map', factsUnder({ counts: { surface: { a: 2 }, note: 'grew a field', missing: null } }), 2);

  // readAsk: a refusal before any spawn is a ROW.
  eq(
    'readAsk over a refusal before any spawn',
    readAsk({ scope: 'part', partId: 'src-main' }, { started: false, refusal: 'no-recipe', run: null }, 12),
    {
      scope: 'part', partId: 'src-main', started: false, refusal: 'no-recipe', verdict: null,
      reason: null, detail: null, wallMs: 12, costUsd: null, promptBytes: null, answerBytes: null,
      claims: null, rowsDropped: null
    }
  );
  // readAsk: nothing outside the closed key set reaches the record, so a
  // model's own prose cannot be written down by accident.
  const kept = readAsk(
    { scope: 'part', partId: 'src-main' },
    { started: true, refusal: null, run: { verdict: 'kept', reason: null, detail: null, wallMs: 9100, costUsd: 0.04, promptBytes: 10240, answerBytes: 3011, claims: 7, rowsDropped: 1, text: 'SECRET MODEL PROSE', token: 'sk-should-never-appear' } },
    9200
  );
  eq('readAsk keys', Object.keys(kept).sort(), [
    'answerBytes', 'claims', 'costUsd', 'detail', 'partId', 'promptBytes', 'reason',
    'refusal', 'rowsDropped', 'scope', 'started', 'verdict', 'wallMs'
  ]);
  if (JSON.stringify(kept).includes('SECRET') || JSON.stringify(kept).includes('sk-')) {
    problems.push('readAsk: the record carried something outside its closed key set');
  }
  eq('readAsk keeps the CLI cost when there is one', kept.costUsd, 0.04);

  // totalsOf: a run where nothing reported a cost records null rather than 0,
  // because codex reports no dollar figure and a 0 would read as free.
  const rows = [
    readAsk({ scope: 'part', partId: 'a' }, { started: true, refusal: null, run: { verdict: 'kept', wallMs: 100, claims: 7, rowsDropped: 0, promptBytes: 10, answerBytes: 20 } }, 0),
    readAsk({ scope: 'part', partId: 'b' }, { started: true, refusal: null, run: { verdict: 'refused', reason: 'invented-number', wallMs: 50, claims: 0, rowsDropped: 0, promptBytes: 10, answerBytes: 5 } }, 0),
    readAsk({ scope: 'journeys', partId: null }, { started: false, refusal: 'interval', run: null }, 1)
  ];
  const t = totalsOf(rows);
  eq('totalsOf counts', [t.asks, t.started, t.kept, t.refused, t.refusedBeforeSpawn, t.wallMs, t.claims], [3, 2, 1, 1, 1, 151, 7]);
  eq('totalsOf cost is null when no CLI reported one', t.costUsd, null);
  // A COLUMN NOBODY ANSWERED IS NULL AND NEVER A SUMMED ZERO. This is the fix
  // round's own arm: the run of 2026-09-12 recorded null for all five and this
  // function published `claims: 0` for 90 kept claims.
  const silent = totalsOf([
    readAsk({ scope: 'part', partId: 'a' }, { started: true, refusal: null, run: { verdict: 'kept', wallMs: 10 } }, 0)
  ]);
  eq(
    'totalsOf answers null for every column no ask reported',
    [silent.claims, silent.rowsDropped, silent.promptBytes, silent.answerBytes, silent.costUsd],
    [null, null, null, null, null]
  );
  eq('totalsOf still counts a real zero as zero', totalsOf([
    readAsk({ scope: 'part', partId: 'a' }, { started: true, refusal: null, run: { verdict: 'refused', wallMs: 10, claims: 0, rowsDropped: 0 } }, 0)
  ]).claims, 0);

  if (problems.length > 0) {
    for (const p of problems) process.stderr.write(`${TAG} SELF-TEST FAIL: ${p}\n`);
    process.exit(1);
  }
  say(`${TAG} self-test OK: 18 graders behaved, nothing was launched, no token was spent`);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {
    dryRun: false, agent: null, model: null, asks: 0, budgetMs: 0, selfTest: false,
    only: null, out: null
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--self-test') out.selfTest = true;
    else if (a === '--agent') out.agent = argv[++i] ?? null;
    else if (a === '--model') out.model = argv[++i] ?? null;
    else if (a === '--asks') out.asks = Number(argv[++i] ?? '0');
    else if (a === '--only') out.only = argv[++i] ?? null;
    else if (a === '--out') out.out = argv[++i] ?? null;
    // THE FOREGROUND CAP MADE HONEST. A measurement runs in the foreground
    // under a 600 s cap, and a run hard-killed at that cap never reaches the
    // finally block that ends the Electron and removes the clone. So the
    // harness owns its own wall budget: it starts no NEW ask once the budget
    // is spent, records `stoppedEarly` on the record, and leaves through its
    // own finally. It never shortens an ask that has already begun and never
    // changes what an ask is, so a run that fits the budget is byte for byte
    // the run it would have been without one.
    else if (a === '--budget-ms') out.budgetMs = Number(argv[++i] ?? '0');
  }
  return out;
}

/**
 * MAKE THE AGENT CLIs' OWN LOGINS REACHABLE FROM THE SCRATCH HOME, and change
 * nothing else about them.
 *
 * The operator's word of 2026-09-12 is that the CLIs keep their own real
 * logins on this Mac under his own subscriptions. Tortie itself runs on a
 * scratch `HOME` so it writes nothing into his, and the model child inherits
 * that `HOME` from the app exactly as it inherits it in production. Measured
 * on 2026-09-12 with nothing linked, the child answered
 * `Not logged in · Please run /login` in 458 ms and the record read
 * `failed/success`, which is this phase's first measurement and its first
 * defect both.
 *
 * A SYMBOLIC LINK IS THE MECHANISM, and it is chosen over the two obvious
 * alternatives on purpose. `CLAUDE_CONFIG_DIR` and `CODEX_HOME` are NOT set,
 * because the brief forbids pointing either of them anywhere and because a
 * redirected home is exactly what the recipe header says the containment is
 * NOT. Giving the app his real `HOME` is refused too, because then Tortie
 * writes into his home rather than into scratch. So the ONLY things reachable
 * outside the scratch home are the two agent configuration entries themselves,
 * which is precisely and only what his word asked for.
 *
 * NOTHING HERE READS A CREDENTIAL. It makes a link and stats a path; it never
 * opens a file, never runs `security`, and never copies a byte. The child
 * reads its own login the way it does in production, which is the point.
 */
function linkRealLogins(home) {
  const real = process.env.P259_REAL_HOME ?? realHome();
  if (real === null || real === home) return;
  const linked = [];
  for (const entry of ['.claude', '.claude.json', '.codex']) {
    const from = join(real, entry);
    if (!existsSync(from)) continue;
    try {
      symlinkSync(from, join(home, entry));
      linked.push(entry);
    } catch {
      /* it is already there, which is the same outcome */
    }
  }
  say(`${TAG} the scratch HOME links the CLIs' own logins: ${linked.join(', ') || '(nothing found to link)'}`);
}

/** The person's real home, read from the passwd record rather than from HOME. */
function realHome() {
  try {
    return userInfo().homedir ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    selfTest();
    return;
  }
  if (!args.dryRun && (args.agent === null || args.model === null)) {
    process.stderr.write(`${TAG} REFUSED: a live run names --agent and --model, or pass --dry-run\n`);
    process.exit(2);
  }
  // A live run is the integrator's, and it is the only step in this phase that
  // spends a token. A builder or a verifier runs --dry-run.
  const agentId = args.dryRun ? (args.agent ?? 'claude') : args.agent;
  const model = args.dryRun ? (args.model ?? 'opus') : args.model;
  /**
   * What this run's record and reading are called. `--out` is how a NARROWED
   * repeat is written down beside the full reading rather than over it: the
   * rows it holds are only the rows its own asks produced, so it is not a
   * reading of the repository and must never be filed as one.
   */
  const recordName =
    typeof args.out === 'string' && /^[a-z0-9.-]+$/.test(args.out) ? args.out : agentId;

  const scratch = join(tmpdir(), `p259-measure-${String(process.pid)}`);
  const home = join(scratch, 'home');
  const profile = join(scratch, 'profile');
  let socket = process.env.GMUX_TMUX_SOCKET ?? '';
  let ownSocket = false;
  if (!socket.startsWith('gmux-p259')) {
    socket = `gmux-p259-${String(process.pid)}`;
    ownSocket = true;
  }
  mkdirSync(home, { recursive: true });
  mkdirSync(profile, { recursive: true });
  linkRealLogins(home);

  const before = gmuxSessions();
  const versions = preflight();
  say(`${TAG} claude ${versions.claude ?? '(not installed)'} | codex ${versions.codex ?? '(not installed)'}`);
  say(`${TAG} his -L gmux sessions before: ${String(before)}`);
  say(`${TAG} mode: ${args.dryRun ? 'DRY RUN — no token is spent' : `LIVE — ${agentId} / ${model}`}`);

  const rows = [];
  let closeCdp = null;
  let stoppedEarly = null;
  let noChoice = null;
  let clone = null;
  let failed = null;
  try {
    const corpus = spawnSync('bash', [join(REPO, 'build', 'p259', 'corpus.sh'), scratch, REPO], { encoding: 'utf8' });
    process.stdout.write(corpus.stdout ?? '');
    if (corpus.status !== 0) throw new Error(`corpus.sh exited ${String(corpus.status)}: ${(corpus.stderr ?? '').slice(0, 400)}`);
    clone = join(scratch, 'repos', 'tortie');
    if (!existsSync(join(clone, '.git'))) throw new Error('the clone is not there');

    // The confirm-gate step. `claude` and `codex` are builtin launchable rows,
    // so this forges no agreement: it writes the person's CHOICE, which the
    // shipped gate then re-reads at the spawn.
    // The Architecture switch alone. THE CHOICE IS NOT SEEDED HERE, AND THAT
    // IS A MEASUREMENT RATHER THAN A PREFERENCE: `withSealedDangerState` in
    // src/main/settings/store.ts drops an arch choice back to None unless the
    // file's own seal covers that exact agent and model pair, so a choice
    // written into settings.json by anything but the app reads as no choice at
    // all. Driven on 2026-09-12, a seeded `claude`/`opus` refused every one of
    // the nine asks `no-choice`. That is refusal 8 working, and it is why the
    // choice below goes through the app's OWN door.
    seedArchSwitchOn(profile, { wrapperPass: true });

    await withElectron(
      {
        label: 'p259-measure',
        userDataDir: profile,
        tmuxSocket: null,
        args: ['--remote-debugging-port=0', '--inspect=0', '--use-mock-keychain'],
        env: { HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' },
        ceilingMs: 60 * 60 * 1000
      },
      async () => {
        const { cdp } = await cdpForAppWindow(profile, 120_000);
        // THE SOCKET IS CLOSED IN A FINALLY, whatever happened. Measured on
        // 2026-09-12: the run finished every ask, wrote both files and printed
        // its totals in 2.3 s, and then node stayed alive for twenty minutes
        // because this websocket was still open, so a foreground call looked
        // like a hung measurement and was killed by its cap. An open handle is
        // not a leaked process, but it reads exactly like one.
        closeCdp = () => {
          try { cdp.close(); } catch { /* it was already gone */ }
        };
        await cdp.call('Runtime.enable');
        for (;;) {
          if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
          await sleep(50);
        }
        // The choice, through the door the Settings window uses, which is the
        // one write that re-seals. It is READ BACK before any ask, because a
        // choice that did not stick would make every refusal below say
        // `no-choice` and the run would report nothing about the recipe table.
        await call(cdp, `window.gmux.settingsSet(${JSON.stringify({ arch: { enabled: true, agentId, model, wrapperPass: true } })})`, 30_000);
        const settings = await call(cdp, 'window.gmux.settingsGet()', 30_000);
        const chose = settings?.arch?.agentId === agentId && settings?.arch?.model === model;
        say(`${TAG} the choice reads ${String(settings?.arch?.agentId)}/${String(settings?.arch?.model)}${chose ? '' : '  <-- it did not stick, and every ask below will say no-choice'}`);
        await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify({ projectPath: clone })}).then(() => true)`, 180_000);
        say(`${TAG} the clone is open; waiting for the deterministic pass`);
        const check = await call(cdp, `window.gmux.arch.check(${JSON.stringify({ cwd: clone })})`, 30 * 60 * 1000);
        say(`${TAG} the arch check answered generation ${String(check.generation ?? check.error ?? 'none')}`);

        const map = await call(cdp, `window.gmux.arch.map(${JSON.stringify({ cwd: clone })})`, 5 * 60 * 1000);
        const boxes = (map.groups ?? []).map((g) => ({ id: g.id, facts: factsUnder(g) }));
        const asks = planAsks(boxes, args.asks, args.only);
        say(`${TAG} ${String(asks.length)} ask(s) planned over ${String(boxes.length)} box(es): ${asks.map((a) => a.partId ?? a.scope).join(', ')}`);

        const runStarted = Date.now();
        for (const ask of asks) {
          if (args.budgetMs > 0 && Date.now() - runStarted >= args.budgetMs) {
            stoppedEarly = `the wall budget of ${String(args.budgetMs)} ms was spent after ${String(rows.length)} of ${String(asks.length)} ask(s); no further ask was started`;
            say(`${TAG} ${stoppedEarly}`);
            break;
          }
          const t0 = Date.now();
          const input = { cwd: clone, scope: ask.scope, ...(ask.partId === null ? {} : { partId: ask.partId }) };
          const answer = await call(cdp, `window.gmux.arch.enrich(${JSON.stringify(input)})`, 10 * 60 * 1000);
          const row = readAsk(ask, answer, Date.now() - t0);
          rows.push(row);
          say(
            `${TAG}   ${ask.scope}${ask.partId === null ? '' : ` ${ask.partId}`}: ` +
              `${row.started ? String(row.verdict) : `refused before any spawn (${String(row.refusal)})`}` +
              `${row.reason === null ? '' : ` — ${row.reason}`}` +
              `${row.detail === null || row.detail === undefined ? '' : ` — the agent said: ${String(row.detail)}`}` +
              ` in ${String(row.wallMs)} ms` +
              `${row.costUsd === null ? '' : ` at $${String(row.costUsd)}`}`
          );
          if (args.dryRun && row.started) {
            failed = `the dry run SPAWNED: ask ${ask.scope} ${String(ask.partId)} started a child. A dry run must refuse before any spawn.`;
            break;
          }
        }

        // THE DRY RUN'S SECOND ARM, in the same Electron and never a second
        // one. With the choice EMPTIED the gate refuses `no-choice` before it
        // ever reaches the recipe table, so a refusal that refused everything
        // cannot read as a pass: the two arms have to answer DIFFERENTLY.
        if (args.dryRun) {
          await call(cdp, `window.gmux.settingsSet(${JSON.stringify({ arch: { enabled: true, agentId: null, model: null, wrapperPass: true } })})`, 30_000);
          await sleep(200);
          const ask = { scope: 'journeys', partId: null };
          const t0 = Date.now();
          const answer = await call(cdp, `window.gmux.arch.enrich(${JSON.stringify({ cwd: clone, scope: 'journeys' })})`, 60_000);
          const row = readAsk(ask, answer, Date.now() - t0);
          noChoice = row.refusal;
          say(`${TAG}   with no agent chosen at all: refused before any spawn (${String(row.refusal)}) in ${String(row.wallMs)} ms`);
        }

        // Reading (a), the grades against the floor, off the shipped channel.
        //
        // IT FOLLOWS `--out` FOR THE REASON THE RECORD DOES: a narrowed repeat
        // reads a profile that only ran the asks it was narrowed to, so its
        // reading holds only those rows. The fix round measured that the hard
        // way, writing a one journey reading over the 90 claim one the full
        // run of 2026-09-12 produced.
        const reading = await call(cdp, `window.gmux.arch.semantic(${JSON.stringify({ cwd: clone })})`, 2 * 60 * 1000);
        const readingPath = join(REPO, 'build', 'p259', 'measured', `${recordName}.reading.json`);
        if (!args.dryRun) {
          writeFileSync(readingPath, `${JSON.stringify(reading, null, 2)}\n`);
          say(`${TAG} wrote ${readingPath}`);
        } else if (reading.error !== undefined) {
          say(`${TAG} the arch:semantic channel answered: ${String(reading.error)}`);
        }
      }
    );
  } catch (err) {
    failed = String(err);
  } finally {
    if (closeCdp !== null) closeCdp();
    spawnSync('bash', [join(REPO, 'build', 'p259', 'corpus.sh'), scratch, 'clean'], { encoding: 'utf8' });
    rmSync(scratch, { recursive: true, force: true });
    if (ownSocket) {
      // END THE SERVER BEFORE UNLINKING ITS SOCKET, because unlinking the file
      // leaves the process running with nothing pointing at it. Measured on
      // 2026-09-12: five runs left five `tmux -L gmux-p259-<pid>` servers
      // behind, which is the rule in CLAUDE.md that says a probe ends its own
      // scratch tmux server in a finally block. The socket is this run's own
      // `gmux-p259-<pid>` and never `gmux`, which the name refuses by shape.
      if (socket.startsWith('gmux-p259')) {
        spawnSync(join(REPO, 'build', 'vendor', 'tmux', 'bin', 'tmux'), ['-L', socket, 'kill-server'], {
          encoding: 'utf8'
        });
      }
      for (const dir of [process.env.TMPDIR ?? '/tmp', '/tmp']) {
        for (const candidate of [join(dir, `tmux-${String(process.getuid?.() ?? 0)}`, socket), join(dir, socket)]) {
          try { unlinkSync(candidate); } catch { /* the socket was never made */ }
        }
      }
    }
  }

  const totals = totalsOf(rows);
  const record = {
    agentId,
    model,
    recipeVersion: 1,
    measuredOn: new Date().toISOString().slice(0, 10),
    dryRun: args.dryRun,
    stoppedEarly,
    cliVersion: versions[agentId] ?? null,
    timeoutMs: null,
    asks: rows,
    totals
  };
  if (!args.dryRun && failed === null) {
    const out = join(REPO, 'build', 'p259', 'measured', `${recordName}.json`);
    writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
    say(`${TAG} wrote ${out}`);
  }
  const after = gmuxSessions();
  say(`${TAG} his -L gmux sessions after: ${String(after)}${after === before ? '' : '  <-- MOVED, and nothing here may move it'}`);
  say(`${TAG} totals: ${JSON.stringify(totals)}`);
  if (failed !== null) {
    process.stderr.write(`${TAG} FAIL: ${failed}\n`);
    process.exit(1);
  }
  if (args.dryRun) {
    const spawned = rows.filter((r) => r.started).length;
    const reasons = [...new Set(rows.map((r) => String(r.refusal)))];
    const problems = [];
    if (spawned > 0) problems.push(`the dry run started ${String(spawned)} child(ren), and it spends nothing`);
    if (rows.length === 0) problems.push('the dry run planned no ask at all, so it drove nothing');
    // Both arms, and they must answer DIFFERENTLY. `no-recipe` is the phase's
    // own "measured or disabled" rule read end to end: a builtin agent and a
    // real model, confirmed by the shipped gate, and the live semantic table
    // is empty, so nothing can start. `no-choice` is the control.
    if (!reasons.includes('no-recipe')) {
      problems.push(
        `with ${agentId}/${model} chosen the asks refused ${reasons.join(', ') || '(nothing)'} and not no-recipe; ` +
          'either a semantic row has been measured, in which case this is a LIVE run and not a dry one, or the gate ' +
          'refused earlier for a reason that hides what this arm is for'
      );
    }
    if (noChoice !== 'no-choice') {
      problems.push(`with no agent chosen the gate answered ${String(noChoice)} and not no-choice, so the two arms do not answer differently and a gate that refused everything would read as a pass`);
    }
    if (problems.length > 0) {
      for (const one of problems) process.stderr.write(`${TAG} FAIL: ${one}\n`);
      process.exit(1);
    }
    say(`${TAG} DRY RUN OK: ${String(rows.length)} ask(s) refused before any spawn as ${reasons.join(', ')}, and the no-agent control refused as no-choice`);
  }
}

main()
  .then(() => {
    // EVERY PROCESS THIS STARTED IS ALREADY ENDED by the finally block above,
    // and the record is already written. What is left is an OPEN HANDLE
    // rather than a running child: measured twice on 2026-09-12, the run
    // finished every ask, wrote both files and printed its totals, and then
    // node sat for twenty minutes, which under a foreground cap is
    // indistinguishable from a hung measurement and got the run killed. The
    // work is done at this line, so the exit is explicit.
    process.exit(0);
  })
  .catch((err) => {
    process.stderr.write(`${TAG} FAIL: ${String(err)}\n`);
    process.exit(1);
  });
