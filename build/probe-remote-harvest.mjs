#!/usr/bin/env node
/**
 * `node build/probe-remote-harvest.mjs`. The Tier 3 live probe of Phase 73 item
 * 1, being reading an agent's own store on another machine while connected to
 * it.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT BELOW
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE OTHER MACHINE IS THIS MAC. So five rules, all in this file:
 *
 *  1. The target is 127.0.0.1 on a high port and the probe refuses anything
 *     else. The operator's four machines and every tailnet host are never
 *     contacted.
 *  2. `refuseRealSockets` refuses the socket names `gmux` and `default` before
 *     anything is started.
 *  3. Every store this probe reads is inside its own run directory. It plants
 *     nothing in the operator's home and reads nothing there. The far side's
 *     real home is asked for once, printed, and then not used.
 *  4. Every pid is recorded as it is created and only recorded pids are killed.
 *     There is no `pkill` and no `kill-server` in this file.
 *  5. The operator's own server is counted before and after. A difference is a
 *     failure whatever else passed.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PROBE PROVES, AND WHAT IT DOES NOT
 * ---------------------------------------------------------------------------
 * IT PROVES THE WIRE. Every read below crosses a real ssh connection to a real
 * sign in server, runs one of Tortie's own constant scripts through Tortie's
 * own door, and comes back through Tortie's own parsers into Tortie's own
 * decision. The bytes, the wall clock, the refusals and the process counts are
 * all measured here.
 *
 * IT DOES NOT PROVE THE MANIFEST. There is no Electron process here, so there
 * is no session list, no manifest row, no `resume_argv` and no arming verdict.
 * Those are proven by `GMUX_SMOKE=remote-sessions` steps 10e to 10h, which run
 * in a real Electron process against a real database, and by nothing else.
 *
 * THE FAR SIDE IS THIS MAC IN EVERY RUN. Every store path pattern measured here
 * is a macOS one. The Linux patterns are OWED and are recorded in
 * docs/BACKLOG.md and in docs/research/52-remote-env-and-review.md.
 *
 * ---------------------------------------------------------------------------
 * HOW IT REACHES TORTIE'S OWN CODE
 * ---------------------------------------------------------------------------
 * The modules are TypeScript with path aliases, so this probe writes one driver
 * into its own run directory and runs it with `npx tsx`. The driver registers a
 * remote context by hand, because building one through `prepare.ts` needs the
 * confirm gate and the gate is sealed through `safeStorage`, which needs
 * Electron. Everything after the registration is Tortie's own code: the door,
 * the catalogue, the parsers and the decision.
 *
 * Every scratch file carries a `p73-` prefix.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  refuseRealSockets,
  scratchMachine,
  scratchYard
} from './scratch-machine.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOCKET = process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p73-${String(process.pid)}`;
refuseRealSockets(SOCKET, 'p73');

const root = join(
  process.env['TMPDIR'] ?? '/tmp',
  `gmux-p73-harvest-${String(process.pid)}`
);
const recordedPids = [];
const record = (pid) => {
  if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
};

let failures = 0;
const say = (line) => process.stdout.write(`[p73] ${line}\n`);
const fail = (line) => {
  failures += 1;
  process.stdout.write(`[p73] FAIL: ${line}\n`);
};

function sh(file, args, options = {}) {
  const out = spawnSync(file, args, {
    encoding: 'utf8',
    timeout: 180_000,
    ...options
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? '',
    stderr: out.stderr ?? ''
  };
}

/** The operator's own server, read only, counted. */
function operatorSessions() {
  try {
    return Number(
      execFileSync(
        '/bin/sh',
        ['-c', 'tmux -L gmux list-sessions 2>/dev/null | wc -l'],
        { encoding: 'utf8' }
      ).trim()
    );
  } catch {
    return -1;
  }
}

/** ssh processes this account is running right now. */
function sshProcessCount() {
  const out = sh('/bin/ps', ['-o', 'command=', '-ax']).stdout;
  return out.split('\n').filter((line) => /(^|\/)ssh /.test(line)).length;
}

const operatorBefore = operatorSessions();
say(`the operator's own server holds ${String(operatorBefore)} session(s)`);

// ---------------------------------------------------------------------------
// The scratch machine
// ---------------------------------------------------------------------------

mkdirSync(root, { recursive: true, mode: 0o700 });
const yard = scratchYard({ root, prefix: 'p73', record });
if (yard.authSock === '') {
  fail('no ssh agent holds this run’s key, so nothing could sign in at all');
  process.exit(1);
}
const machine = scratchMachine(yard, { id: 'one', port: 39_000 + (process.pid % 2000) });

function teardown() {
  machine.stop();
  for (const pid of recordedPids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  try {
    rmSync(machine.tmuxTmp, { recursive: true, force: true });
  } catch {
    /* nothing there */
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    teardown();
    process.exit(130);
  });
}

if (!machine.start()) {
  fail(`the scratch machine did not answer on port ${String(machine.port)}`);
  teardown();
  process.exit(1);
}
say(`machine on 127.0.0.1:${String(machine.port)} as ${machine.user}`);

// This Mac has to trust the machine's identity before Tortie's own commands
// will talk to it, because the door carries StrictHostKeyChecking=yes.
const hostKeys = join(root, 'p73-known-hosts');
writeFileSync(
  hostKeys,
  sh('/usr/bin/ssh-keyscan', ['-p', String(machine.port), machine.host]).stdout,
  'utf8'
);

// ---------------------------------------------------------------------------
// The scratch home, with one planted record per agent
// ---------------------------------------------------------------------------

const REMOTE_HOME = join(root, 'p73-remote-home');
const CWD = join(root, 'p73-work');
mkdirSync(CWD, { recursive: true });
const PANE = '$7';

const two = (n) => String(n).padStart(2, '0');
const now = new Date();
const shard = `${String(now.getFullYear())}/${two(now.getMonth() + 1)}/${two(now.getDate())}`;
const stamp =
  `${String(now.getFullYear())}-${two(now.getMonth() + 1)}-${two(now.getDate())}` +
  `T${two(now.getHours())}-${two(now.getMinutes())}-${two(now.getSeconds())}`;

const planted = {
  muse: {
    id: '11111111-2222-4333-8444-000000000001',
    relative: `.local/share/muse/sessions/${shard}/11111111-2222-4333-8444-000000000001/session.jsonl`,
    body:
      `${JSON.stringify({ payload_type: 'session.open' })}\n` +
      `${JSON.stringify({
        payload_type: 'runtime.session.route_facts',
        payload: { record: { tmux_pane: `${PANE}:@1.%1` } }
      })}\n`
  },
  codex: {
    id: '11111111-2222-4333-8444-000000000002',
    relative: `.codex/sessions/${shard}/rollout-${stamp}-11111111-2222-4333-8444-000000000002.jsonl`,
    body: `${JSON.stringify({ payload: { cwd: CWD } })}\n`
  },
  deepseek: {
    id: '11111111-2222-4333-8444-000000000003',
    relative: '.codewhale/sessions/11111111-2222-4333-8444-000000000003.json',
    body: JSON.stringify({ metadata: { workspace: CWD } })
  },
  pi: {
    id: '11111111-2222-4333-8444-000000000004',
    relative: `.pi/agent/sessions/--${CWD.replace(/^\//, '').replace(/\//g, '-')}--/${now
      .toISOString()
      .replace(/[:.]/g, '-')}_11111111-2222-4333-8444-000000000004.jsonl`,
    body: `${JSON.stringify({ type: 'session', cwd: CWD })}\n`
  }
};

for (const one of Object.values(planted)) {
  const path = join(REMOTE_HOME, one.relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, one.body, 'utf8');
  one.path = path;
  one.sha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
}
say(`four records planted under ${REMOTE_HOME}`);

// ---------------------------------------------------------------------------
// The driver
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p73-driver.mts');
writeFileSync(
  driverPath,
  String.raw`
import { readFileSync, writeFileSync } from 'node:fs';

const REPO = '__REPO__';
const input = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8'));
const outPath = process.argv[3] ?? '';

const context = await import(REPO + '/src/main/machines/context');
const control = await import(REPO + '/src/main/machines/control-plane');
const run = await import(REPO + '/src/main/machines/remote-run');
const pure = await import(REPO + '/src/main/manifest/harvest/remote');
const sync = await import(REPO + '/src/main/machines/remote-store-sync');

const ID = 'p73probe';
const ctx = {
  kind: 'remote' as const,
  machineId: ID,
  sshBin: '/usr/bin/ssh',
  host: input.host,
  user: input.user,
  port: input.port,
  remoteTmuxPath: input.remoteTmuxPath,
  socket: input.socket,
  controlPath: input.controlPath,
  hostKeys: { tortie: input.hostKeys, user: input.hostKeys }
};
context.registerRemoteMachineContext(ctx);
context.setMachineRemotePath(ID, '/usr/bin:/bin:/usr/local/bin');
control.noteMachineAnswered(ID, Date.now());

const out: Record<string, unknown> = {};

async function readOne(scriptId: string, args: string[]) {
  const started = Date.now();
  try {
    const answer = await run.runRemoteRead(ctx, scriptId, args, {
      timeoutMs: 20_000
    });
    return {
      ok: true,
      payload: answer.payload,
      bytes: answer.bytes,
      generation: answer.generation,
      ms: Date.now() - started
    };
  } catch (err) {
    // A refused read carries Tortie's own sentence and its own detail. Both are
    // printed, because the sentence is what a person would read and the detail
    // is what says which of the two halves of connected only fired.
    const raw = (err as Error).message;
    let refusal = raw;
    let detail = '';
    try {
      const parsed = JSON.parse(raw) as { message?: string; detail?: string };
      refusal = parsed.message ?? raw;
      detail = parsed.detail ?? '';
    } catch {
      /* not one of Tortie's own errors */
    }
    return { ok: false, refusal, detail, ms: Date.now() - started };
  }
}

if (input.op === 'facts') {
  const answer = await readOne('machine-facts', []);
  out.answer = answer;
  out.parsed = answer.ok ? pure.parseMachineFacts(String(answer.payload)) : null;
} else if (input.op === 'harvest') {
  // The whole read path for one agent, exactly as ./remote-harvest.ts walks it.
  const rows: unknown[] = [];
  let bytes = 0;
  let reads = 0;
  const started = Date.now();
  for (const agent of input.agents as string[]) {
    const facts = { home: input.home, env: {}, platform: 'Darwin' };
    const plan = pure.remoteHarvestRoots(agent as never, input.cwd, facts);
    if (plan === null) {
      rows.push({ agent, error: 'no store for this agent' });
      continue;
    }
    const lines: string[] = [];
    for (const rootDir of plan.roots) {
      const answer = await readOne('store-list', [
        rootDir,
        String(plan.maxDepth + 1),
        String(input.sinceSeconds)
      ]);
      reads += 1;
      bytes += Number(answer.bytes ?? 0);
      if (!answer.ok || answer.payload === 'none') continue;
      for (const line of String(answer.payload).split('\n')) {
        if (line.trim().length > 0) lines.push(line);
      }
    }
    const candidates = pure.parseRemoteListing(agent as never, lines, input.sinceMs);
    const verdicts = new Map<string, string>();
    for (const candidate of [...candidates].sort((a, b) => a.orderTs - b.orderTs).slice(0, 3)) {
      const answer = await readOne('store-head', [candidate.path, '8192']);
      reads += 1;
      bytes += Number(answer.bytes ?? 0);
      if (!answer.ok || answer.payload === 'none') {
        verdicts.set(candidate.path, 'unknown');
        continue;
      }
      const head = Buffer.from(String(answer.payload).replace(/\s+/g, ''), 'base64').toString('utf8');
      verdicts.set(
        candidate.path,
        pure.confirmRemoteCandidate(agent as never, head, {
          cwd: input.cwd,
          remotePaneKey: input.paneKey
        })
      );
      if (verdicts.get(candidate.path) === 'match') break;
    }
    const winner = pure.decideRemoteHarvest(agent as never, candidates, verdicts as never);
    rows.push({
      agent,
      roots: plan.roots,
      candidates: candidates.length,
      winner:
        winner === null
          ? null
          : {
              conversationId: winner.candidate.sessionId,
              path: winner.candidate.path,
              key: winner.key,
              keyConfidence: winner.keyConfidence,
              strength: winner.strength,
              rivals: winner.rivals
            }
    });
  }
  out.rows = rows;
  out.reads = reads;
  out.bytes = bytes;
  out.ms = Date.now() - started;
} else if (input.op === 'cut') {
  // The link is told the machine did not answer. The door refuses BEFORE it
  // composes anything, so nothing is sent.
  control.noteMachineQuiet(ID, 'the probe cut it on purpose');
  out.connectedBefore = false;
  out.answer = await readOne('machine-facts', []);
} else if (input.op === 'generation') {
  // The connection is replaced while a read is in flight. The answer belongs to
  // a connection Tortie no longer has, so it is discarded.
  const inFlight = readOne('store-list', [input.home, '6', '0']);
  setTimeout(() => {
    context.bumpMachineGeneration(ID);
    context.setMachineRemotePath(ID, '/usr/bin:/bin');
  }, 15);
  out.answer = await inFlight;
} else if (input.op === 'copy') {
  const answer = await readOne('store-copy', [input.path, String(2 * 1024 * 1024)]);
  out.answer = answer;
  const parsed = answer.ok ? sync.parseStoreCopy(String(answer.payload)) : null;
  out.parsed =
    parsed === null
      ? null
      : {
          bytes: parsed.bytes,
          sha256: parsed.sha256,
          bodyBytes: parsed.body.byteLength,
          bodySha256: (await import('node:crypto'))
            .createHash('sha256')
            .update(parsed.body)
            .digest('hex')
        };
}

writeFileSync(outPath, JSON.stringify(out), 'utf8');
process.exit(0);
`.replace('__REPO__', repoRoot),
  'utf8'
);

let calls = 0;
function drive(op) {
  calls += 1;
  const inPath = join(root, `p73-in-${String(calls)}.json`);
  const outPath = join(root, `p73-out-${String(calls)}.json`);
  writeFileSync(
    inPath,
    JSON.stringify({
      host: machine.host,
      user: machine.user,
      port: machine.port,
      remoteTmuxPath: machine.remoteTmuxPath,
      socket: SOCKET,
      controlPath: join(root, 'p73-control'),
      hostKeys,
      home: REMOTE_HOME,
      cwd: CWD,
      paneKey: PANE,
      ...op
    }),
    'utf8'
  );
  const out = sh(
    'npx',
    ['tsx', '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    { cwd: repoRoot, env: { ...process.env, SSH_AUTH_SOCK: yard.authSock } }
  );
  if (!existsSync(outPath)) {
    fail(
      `the driver did not answer for "${String(op.op)}". It printed:\n` +
        `${(out.stdout + out.stderr).trim().split('\n').slice(-14).join('\n')}`
    );
    return null;
  }
  return JSON.parse(readFileSync(outPath, 'utf8'));
}

const sinceMs = Date.now() - 8 * 24 * 60 * 60 * 1_000;
const sinceSeconds = Math.floor(sinceMs / 1_000);
const AGENTS = ['muse', 'codex', 'deepseek', 'pi'];

// ---------------------------------------------------------------------------
// Leg 1. What the machine says about itself
// ---------------------------------------------------------------------------

const facts = drive({ op: 'facts' });
if (facts?.parsed?.home === undefined || facts.parsed.home === null) {
  fail(`the machine-facts script answered ${JSON.stringify(facts?.answer)}`);
} else {
  say(
    `1. the machine says its home is ${facts.parsed.home} and its platform is ` +
      `${String(facts.parsed.platform)}, read in ${String(facts.answer.ms)} ms`
  );
  say(
    `   that home is the operator's own, so it is printed and then not used. ` +
      `Every read below is under ${REMOTE_HOME}`
  );
}

// ---------------------------------------------------------------------------
// Leg 2. The read path, per agent, against real planted records
// ---------------------------------------------------------------------------

const sshBeforePass = sshProcessCount();
const pass = drive({ op: 'harvest', agents: AGENTS, sinceMs, sinceSeconds });
const sshAfterPass = sshProcessCount();
if (pass === null) {
  fail('the read path answered nothing');
} else {
  say(`2. one pass over ${String(AGENTS.length)} session(s):`);
  say(
    `   | agent | candidates | conversation | key | strength | rivals |`
  );
  for (const row of pass.rows) {
    const winner = row.winner;
    say(
      `   | ${row.agent} | ${String(row.candidates)} | ` +
        `${winner === null ? 'none' : String(winner.conversationId).slice(-12)} | ` +
        `${winner === null ? '-' : winner.key} | ` +
        `${winner === null ? '-' : winner.strength} | ` +
        `${winner === null ? '-' : String(winner.rivals)} |`
    );
    const expected = planted[row.agent]?.id;
    if (winner === null || winner.conversationId !== expected) {
      fail(
        `${row.agent} answered ${JSON.stringify(winner?.conversationId ?? null)} ` +
          `and the planted record carried ${String(expected)}`
      );
    }
  }
  const muse = pass.rows.find((row) => row.agent === 'muse');
  if (muse?.winner?.strength !== 'confirmed' || muse.winner.keyConfidence !== 'exact') {
    fail(
      `muse's claim reads ${String(muse?.winner?.strength)} / ` +
        `${String(muse?.winner?.keyConfidence)} and it should read confirmed / exact`
    );
  }
  for (const agent of ['codex', 'deepseek', 'pi']) {
    const row = pass.rows.find((one) => one.agent === agent);
    if (row?.winner?.keyConfidence !== 'weak') {
      fail(
        `${agent}'s claim reads ${String(row?.winner?.keyConfidence)} and a ` +
          `folder key over a connection is worth weak`
      );
    }
  }
  say(
    `   ${String(pass.reads)} read(s), ${String(pass.bytes)} byte(s) of ` +
      `payload, ${String(pass.ms)} ms of wall clock, which is ` +
      `${String(Math.round(pass.bytes / AGENTS.length))} bytes and ` +
      `${String(Math.round(pass.ms / AGENTS.length))} ms per session`
  );
  say(
    `   ssh processes: ${String(sshBeforePass)} before the pass and ` +
      `${String(sshAfterPass)} after it`
  );
}

// ---------------------------------------------------------------------------
// Leg 3. The same pass at six sessions, for the shape of the cost
// ---------------------------------------------------------------------------

const six = drive({
  op: 'harvest',
  agents: [...AGENTS, 'muse', 'codex'],
  sinceMs,
  sinceSeconds
});
if (six !== null) {
  say(
    `3. the same pass over 6 session(s): ${String(six.reads)} read(s), ` +
      `${String(six.bytes)} byte(s), ${String(six.ms)} ms, which is ` +
      `${String(Math.round(six.ms / 6))} ms per session`
  );
}

// ---------------------------------------------------------------------------
// Leg 4. Connected only, watched refusing
// ---------------------------------------------------------------------------

const sshBeforeCut = sshProcessCount();
const cut = drive({ op: 'cut' });
const sshAfterCut = sshProcessCount();
if (cut?.answer?.ok !== false) {
  fail('a read over a machine that is not answering was not refused');
} else {
  say(`4. with the link not answering, the door refused and said:`);
  say(`   "${String(cut.answer.refusal)}"`);
  say(`   the detail reads: ${String(cut.answer.detail)}`);
  say(
    `   it took ${String(cut.answer.ms)} ms, and the ssh process count was ` +
      `${String(sshBeforeCut)} before and ${String(sshAfterCut)} after, so ` +
      `nothing was sent`
  );
  if (sshAfterCut > sshBeforeCut) {
    fail('the refused read started an ssh process');
  }
}

// ---------------------------------------------------------------------------
// Leg 5. The connection replaced while a read is in flight
// ---------------------------------------------------------------------------

const moved = drive({ op: 'generation' });
if (moved?.answer?.ok !== false) {
  fail(
    'a read whose connection was replaced in flight was not discarded, it ' +
      `answered ${JSON.stringify(moved?.answer?.payload ?? null).slice(0, 80)}`
  );
} else {
  say(`5. with the connection replaced while a read was in flight, the answer`);
  say(`   was discarded and the door said:`);
  say(`   "${String(moved.answer.refusal)}"`);
  say(`   the detail reads: ${String(moved.answer.detail)}`);
}

// ---------------------------------------------------------------------------
// Leg 6. The conversation copy, byte compared
// ---------------------------------------------------------------------------

const museRecord = planted.muse;
const copy = drive({ op: 'copy', path: museRecord.path });
if (copy?.parsed === null || copy?.parsed === undefined) {
  fail(`the copy answered ${JSON.stringify(copy?.answer ?? null).slice(0, 200)}`);
} else {
  const same =
    copy.parsed.sha256 === museRecord.sha256 &&
    copy.parsed.bodySha256 === museRecord.sha256;
  say(
    `6. the conversation copy: ${String(copy.parsed.bodyBytes)} byte(s) came ` +
      `back, the machine said ${String(copy.parsed.bytes)}`
  );
  say(
    `   this Mac hashes the file at ${museRecord.sha256.slice(0, 16)}, the ` +
      `machine said ${String(copy.parsed.sha256).slice(0, 16)}, and the bytes ` +
      `that arrived hash to ${String(copy.parsed.bodySha256).slice(0, 16)}`
  );
  if (!same) fail('the bytes that arrived are not the bytes on the machine');
}

// ---------------------------------------------------------------------------
// Leg 7. The machine killed by recorded pid, mid run
// ---------------------------------------------------------------------------

machine.stop();
const sshBeforeDead = sshProcessCount();
const dead = drive({ op: 'facts' });
const sshAfterDead = sshProcessCount();
if (dead?.answer?.ok !== false) {
  fail('a read against a machine that is gone answered something');
} else {
  say(
    `7. with the machine killed by its recorded pid, the read failed in ` +
      `${String(dead.answer.ms)} ms and no claim could be made from it`
  );
  say(
    `   ssh processes: ${String(sshBeforeDead)} before and ` +
      `${String(sshAfterDead)} after`
  );
}

// ---------------------------------------------------------------------------
// The operator's own server, and the kill list
// ---------------------------------------------------------------------------

teardown();
const operatorAfter = operatorSessions();
if (operatorAfter !== operatorBefore) {
  fail(
    `the operator's own server held ${String(operatorBefore)} session(s) ` +
      `before this run and ${String(operatorAfter)} after it`
  );
} else {
  say(
    `the operator's own server held ${String(operatorBefore)} session(s) before ` +
      `and after`
  );
}
say(`killed only the pids this run recorded: ${recordedPids.join(', ')}`);
try {
  rmSync(root, { recursive: true, force: true });
} catch {
  /* leave it for a person to read */
}

if (failures > 0) {
  say(`FAIL: ${String(failures)} check(s) did not hold`);
  process.exit(1);
}
say('PASS');
