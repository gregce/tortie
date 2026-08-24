/**
 * `node build/probe-p108-context.mjs`. The live probe of Phase 108, being the
 * Context of a folder on another machine.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT BELOW
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE OTHER MACHINE IS THIS MAC. So six rules, all of them here:
 *
 *  1. The target is 127.0.0.1 and the probe refuses to run against anything
 *     else. The operator's machines and every tailnet host are never contacted.
 *  2. `refuseRealSockets` refuses the socket names `gmux` and `default` before
 *     anything is started.
 *  3. Every pid is recorded as it is created and only recorded pids are killed.
 *     There is no `pkill` and no `kill-server` in this file.
 *  4. Everything this probe reads through the door is a READ. The only files
 *     it writes are its own scratch fixtures under one directory whose name
 *     carries this process id, and row 8 proves the read itself wrote nothing.
 *  5. Every ssh this probe causes names Tortie's OWN known hosts file under
 *     the scratch root. Nothing is added to the person's `~/.ssh/known_hosts`,
 *     and that file's size is read before and after and printed.
 *  6. `tmux -L gmux list-sessions` is counted before and after and both
 *     numbers are printed. A difference is a failure.
 *
 * Every scratch file carries a `p108-` prefix. The scratch root is spelled
 * `/private/tmp` rather than `/tmp` ON PURPOSE: they are one directory on this
 * Mac, but `/tmp` is a symlink, and the local reader resolves it while the far
 * side prints literal paths, so the unresolved spelling would fail row 2 on
 * the spelling rather than on a real difference.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES, AND HOW EACH ONE IS MEASURED RATHER THAN ASSERTED
 * ---------------------------------------------------------------------------
 *  1. The operator's session count before anything started.
 *  2. THE ORDERING PROOF THE ENTRY ASKS FOR. A real Context read through the
 *     loopback scratch machine, against `scanContext` run locally over the
 *     same disk with the same environment, `hash: 'none'`,
 *     `includeNested: false`. Per agent and per category, the entry ids, their
 *     order, the winners and the shadow marks are equal. The loopback being
 *     this Mac is what makes the comparison byte for byte. ONE TIE RULE: the
 *     shipped sort orders rows by category, scope and name, so two DIFFERENT
 *     entries tying on all three, e.g. one skill name installed as separate
 *     copies into two agent directories, have no promised order between
 *     themselves, and the comparison puts the tied twins in one order by id
 *     while comparing the visible reading order as a sequence.
 *  3. A seeded scratch project holding a project skill, a project `.mcp.json`
 *     and an instruction file with one `@import`: the remote read finds all
 *     three, the same equality as row 2 holds, and the passes and calls are
 *     printed.
 *  4. THE SECONDS, REPORTED. Wall time per whole read and the average per
 *     call, for the real-home read and the seeded read.
 *  5. A `cwd` that does not exist over there answers mode `context` with the
 *     project rows absent and `exists: false` in the readouts, and no error.
 *  6. A facts payload with an empty home refuses with mode `noHome` and zero
 *     `context-read` calls, driven at the module seam with a stubbed runner.
 *  7. THE PROGRAM COUNT, MEASURED AND NOT INHERITED. Counting wrappers on PATH
 *     ahead of every external program the script names, five runs of the
 *     SHIPPED text against each shape. The measurement wins over any table.
 *  8. THE READ WROTE NOTHING. Size and modification time of every file under
 *     the seeded world, identical before and after a second read.
 *  9. THE CAPS ARE REAL. A read list composed over 100,000 bytes splits into
 *     more calls through the shipped planner and every path still answers
 *     through the real door; a file over 33,554,432 bytes comes back cut at
 *     exactly that byte count while its `F` record names the true size, and
 *     the scan lands it as a problem row rather than a crash.
 * 10. A hostile value through the real door appears only in the quoted tail,
 *     and no file it would have created exists afterwards.
 * 11. The operator's session count after, equal to row 1, and the known hosts
 *     sizes, equal.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE
 * ---------------------------------------------------------------------------
 * The far side is this Mac. No Linux machine and no machine of the operator's
 * is contacted, so GNU stat, GNU find and GNU coreutils are reasoned about
 * from POSIX rather than measured. The milliseconds below are a loopback and
 * they are a floor rather than an expectation. Row 8 pins the SEEDED world
 * only: the real home was not byte-compared, because the operator's own
 * agents write their configuration while this probe runs and a change of
 * theirs is not a write of Tortie's. Nothing here drives the app's renderer;
 * the shot harness covers the panel.
 *
 * Exit 0 when every row passes, 1 with every failing row named, 2 when it
 * refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  machineTmuxTmp,
  refuseRealSockets,
  scratchMachine,
  scratchYard
} from './scratch-machine.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The only address this probe may ever contact over ssh. */
const TARGET = '127.0.0.1';
const PORT = 45811;

/** A folder name built to break a script that composed its own text. */
const HOSTILE = "/private/tmp/p108-'; touch /private/tmp/p108-pwned; echo '";

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p108-context-${String(process.pid)}`,
  'p108-context'
);

// `/private/tmp` rather than `/tmp`, for the reason in the header.
const root = join('/private/tmp', `p108-context-${String(process.pid)}`);
const recordedPids = [];
const failures = [];

const say = (text) => process.stdout.write(`[p108-context] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p108-context] FAIL: ${text}\n`);
};
const step = (n, what, evidence) =>
  process.stdout.write(`[p108-context] ${String(n)}. ${what}: ${evidence}\n`);

function sh(file, args, options = {}) {
  const out = spawnSync(file, args, {
    encoding: 'utf8',
    timeout: 300_000,
    maxBuffer: 256 * 1024 * 1024,
    ...options
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? '',
    stderr: out.stderr ?? '',
    both: `${out.stdout ?? ''}${out.stderr ?? ''}`
  };
}

/** How many sessions the operator's own tmux server holds. Read only. */
function operatorSessions() {
  const out = sh('/bin/sh', [
    '-c',
    'tmux -L gmux list-sessions 2>/dev/null | wc -l'
  ]);
  return out.stdout.trim();
}

/** The size of the person's own known hosts file, so rule 5 is measured. */
function personKnownHostsBytes() {
  const path = join(homedir(), '.ssh', 'known_hosts');
  try {
    return String(statSync(path).size);
  } catch {
    return 'no such file';
  }
}

const sessionsBefore = operatorSessions();
const knownHostsBefore = personKnownHostsBytes();
step(1, 'the operator’s sessions on -L gmux, before', sessionsBefore);

mkdirSync(root, { recursive: true, mode: 0o700 });

// ---------------------------------------------------------------------------
// The scratch worlds, made here and nowhere near the operator's own files
// ---------------------------------------------------------------------------

// An empty project, so the real-home read of row 2 has a project root with
// nothing in it and the volume comes from the real home.
const plainProj = join(root, 'p108-plain-project');
mkdirSync(plainProj, { recursive: true, mode: 0o700 });

// The seeded project of row 3: a project skill, a project `.mcp.json`, and an
// instruction file whose one `@import` costs the read one more pass.
const seededProj = join(root, 'p108-seeded-project');
mkdirSync(join(seededProj, '.claude', 'skills', 'p108-seeded-skill'), {
  recursive: true,
  mode: 0o700
});
writeFileSync(
  join(seededProj, '.claude', 'skills', 'p108-seeded-skill', 'SKILL.md'),
  '---\nname: p108-seeded-skill\ndescription: the seeded probe skill\n---\nA fixture.\n',
  'utf8'
);
writeFileSync(
  join(seededProj, '.mcp.json'),
  `${JSON.stringify(
    { mcpServers: { 'p108-server': { command: '/usr/bin/true', args: [] } } },
    null,
    2
  )}\n`,
  'utf8'
);
mkdirSync(join(seededProj, 'notes'), { recursive: true, mode: 0o700 });
writeFileSync(
  join(seededProj, 'CLAUDE.md'),
  'Project rules.\n\n@notes/p108-imported.md\n',
  'utf8'
);
writeFileSync(
  join(seededProj, 'notes', 'p108-imported.md'),
  'The imported half of the fixture.\n',
  'utf8'
);
// A skill directory whose name holds a SPACE, because the record grammar
// promises the path is the rest of its line.
mkdirSync(join(seededProj, '.claude', 'skills', 'p108 with space'), {
  recursive: true,
  mode: 0o700
});
writeFileSync(
  join(seededProj, '.claude', 'skills', 'p108 with space', 'SKILL.md'),
  '---\nname: p108-spaced\ndescription: a path holding a space\n---\nBody.\n',
  'utf8'
);

// Row 9a. A wide world: enough files that their paths compose a read list
// over 100,000 bytes, so the shipped planner must split it.
const wideDir = join(root, 'p108-wide');
mkdirSync(wideDir, { recursive: true, mode: 0o700 });
const widePaths = [];
for (let at = 0; at < 1500; at += 1) {
  const name = `p108-wide-file-${String(at).padStart(4, '0')}-abcdefghijklmnopqrstuvwxyz.txt`;
  const path = join(wideDir, name);
  writeFileSync(path, `wide ${String(at)}\n`, 'utf8');
  widePaths.push(path);
}

// Row 9b. A file over the byte cap, being 34,000,000 bytes of one letter with
// a JSON-breaking head so a parse of the cut text lands as a problem row.
const bigFile = join(root, 'p108-big.json');
writeFileSync(bigFile, `{"p108": "${'x'.repeat(34_000_000)}"`, 'utf8');

// Row 5. A folder that was never made.
const absentProj = join(root, 'p108-never-made');

// Row 7. The spawn-count fixtures.
const emptyDir = join(root, 'p108-empty-dir');
mkdirSync(emptyDir, { recursive: true, mode: 0o700 });
const smallDir = join(root, 'p108-small-dir');
mkdirSync(join(smallDir, 'p108-sub'), { recursive: true, mode: 0o700 });
writeFileSync(join(smallDir, 'p108-file.md'), 'small\n', 'utf8');
const smallFile = join(root, 'p108-one-file.md');
writeFileSync(smallFile, 'one small file\n', 'utf8');

/** Every file under one directory, with its size and its mtime. */
function treeFacts(dir) {
  const facts = new Map();
  const walk = (at) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const path = join(at, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      try {
        const st = statSync(path);
        facts.set(path, `${String(st.size)}:${String(st.mtimeMs)}`);
      } catch {
        /* a file that vanished between the listing and the read */
      }
    }
  };
  walk(dir);
  return facts;
}

const seededBefore = treeFacts(seededProj);

// ---------------------------------------------------------------------------
// The driver. Every read below is Tortie's own code
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p108-context-driver.ts');
writeFileSync(
  driverPath,
  String.raw`
import { readFileSync, writeFileSync } from 'node:fs';
import { tsxCli } from './ts-runner.mjs';

// An async main rather than top level await: the driver is compiled to a
// CommonJS module and top level await is not available there.
async function main(): Promise<void> {

const REPO = '__REPO__';
const input = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8'));
const outPath = process.argv[3] ?? '';

const context = await import(REPO + '/src/main/machines/context');
const remotePath = await import(REPO + '/src/main/machines/remote-path');
const control = await import(REPO + '/src/main/machines/control-plane');
const driver = await import(REPO + '/src/main/machines/remote-agent-context');
const door = await import(REPO + '/src/main/machines/remote-run');
const catalogue = await import(REPO + '/src/main/machines/remote-scripts');
const image = await import(REPO + '/src/main/machines/remote-image');
const scanMod = await import(REPO + '/src/main/context/scan');
const recording = await import(REPO + '/src/main/context/recording-fs');
const quote = await import(REPO + '/src/main/restore/command');

const ctx = {
  kind: 'remote' as const,
  machineId: input.machineId,
  sshBin: '/usr/bin/ssh',
  host: input.host,
  user: input.user,
  port: input.port,
  remoteTmuxPath: input.remoteTmuxPath,
  socket: input.socket,
  controlPath: input.controlPath,
  hostKeys: { tortie: input.hostKeys, user: input.userHostKeys }
};

/** The stable projection two scans are compared by. */
function projectScan(scan: {
  cwd: string | null;
  truncated: boolean;
  entries: readonly {
    id: string;
    category: string;
    name: string;
    scope: string;
    sourcePath: string;
    realPath: string;
    agents: readonly string[];
    resolution: string;
    shadows: readonly {
      scope: string;
      sourcePath: string;
      losesFor: readonly string[];
    }[];
  }[];
  problems: readonly { path: string; message: string }[];
  sections: readonly unknown[];
  agents: readonly {
    agent: string;
    roots: readonly { path: string; category: string; exists: boolean }[];
  }[];
} | null): unknown {
  if (scan === null) return null;
  return {
    cwd: scan.cwd,
    truncated: scan.truncated,
    entries: scan.entries.map((one) => ({
      id: one.id,
      category: one.category,
      name: one.name,
      scope: one.scope,
      sourcePath: one.sourcePath,
      realPath: one.realPath,
      agents: [...one.agents],
      resolution: one.resolution,
      shadows: one.shadows.map((shadow) => ({
        scope: shadow.scope,
        sourcePath: shadow.sourcePath,
        losesFor: [...shadow.losesFor]
      }))
    })),
    problems: scan.problems
      .map((one) => ({ path: one.path, message: one.message }))
      .sort((a, b) => (a.path + a.message).localeCompare(b.path + b.message)),
    sections: scan.sections,
    roots: scan.agents.map((agent) => ({
      agent: agent.agent,
      roots: agent.roots
    }))
  };
}

const out: Record<string, unknown> = {};

try {
  context.registerRemoteMachineContext(ctx);
  await remotePath.captureRemotePath(ctx);
  // The link has to read as answering for the one door to open at all.
  control.noteMachineAnswered(ctx.machineId, Date.now());

  // The facts, read once, so the local comparison scans see EXACTLY the
  // environment the remote read used.
  const factsAnswer = await door.runRemoteRead(ctx, 'machine-facts', []);
  const facts = image.parseMachineFacts(factsAnswer.payload);
  const env = { HOME: facts.home, ...facts.env };
  out.factsHome = facts.home;

  const read = async (name: string, cwd: string) => {
    const answer = await driver.readContextOnMachine({
      machineId: ctx.machineId,
      cwd
    });
    return {
      name,
      mode: answer.mode,
      passes: answer.passes,
      calls: answer.calls,
      cut: answer.cut,
      elapsedMs: answer.elapsedMs,
      projected: projectScan(answer.scan),
      entryCount: answer.scan === null ? 0 : answer.scan.entries.length,
      problemPaths:
        answer.scan === null
          ? []
          : answer.scan.problems.map((one) => one.path)
    };
  };

  out.real = await read('real', input.plainProj);
  out.realAgain = await read('realAgain', input.plainProj);
  out.seeded = await read('seeded', input.seededProj);
  out.seededAgain = await read('seededAgain', input.seededProj);
  out.absent = await read('absent', input.absentProj);
  out.hostile = await read('hostile', input.hostile);

  const local = async (cwd: string) =>
    projectScan(
      await scanMod.scanContext({
        cwd,
        agent: null,
        hash: 'none',
        includeNested: false,
        env
      })
    );
  out.localReal = await local(input.plainProj);
  out.localSeeded = await local(input.seededProj);

  // Row 6. The refusal at the seam, with a stubbed runner. Nothing crosses.
  {
    const calls: string[] = [];
    const answer = await driver.readRemoteContextWithRunner(
      { machineId: ctx.machineId, cwd: input.plainProj },
      async (scriptId: string) => {
        calls.push(scriptId);
        if (scriptId === 'machine-facts') return 'home=\nuname=Darwin\n';
        return 'none';
      }
    );
    out.noHome = {
      mode: answer.mode,
      scanNull: answer.scan === null,
      contextReadCalls: calls.filter((one) => one === 'context-read').length
    };
  }

  // Row 9a. The wide list through the shipped planner and the real door.
  {
    const plan = driver.planContextReadCalls([], input.widePaths, () => 10);
    const bundle = recording.createEmptyRemoteBundle();
    let calls = 0;
    let listBytesMax = 0;
    for (const one of plan) {
      calls += 1;
      const listBytes =
        Buffer.byteLength(one.enumerate.join('\n'), 'utf8') +
        Buffer.byteLength(one.read.join('\n'), 'utf8');
      if (listBytes > listBytesMax) listBytesMax = listBytes;
      const answer = await door.runRemoteRead(
        ctx,
        'context-read',
        [
          one.enumerate.join('\n'),
          String(driver.CONTEXT_ENUM_DEPTH),
          one.read.join('\n')
        ],
        { timeoutMs: driver.REMOTE_CONTEXT_TIMEOUT_MS }
      );
      recording.foldContextReadAnswer(
        bundle,
        {
          enumerate: one.enumerate,
          depth: driver.CONTEXT_ENUM_DEPTH,
          read: one.read
        },
        recording.parseContextReadPayload(answer.payload)
      );
    }
    let answered = 0;
    for (const path of input.widePaths) {
      if (bundle.texts.has(path)) answered += 1;
    }
    out.wide = {
      totalListBytes:
        Buffer.byteLength(input.widePaths.join('\n'), 'utf8'),
      planned: plan.length,
      calls,
      listBytesMax,
      asked: input.widePaths.length,
      answered
    };
  }

  // Row 9b. The file over the byte cap, through the real door.
  {
    const answer = await door.runRemoteRead(
      ctx,
      'context-read',
      ['', String(driver.CONTEXT_ENUM_DEPTH), input.bigFile],
      { timeoutMs: driver.REMOTE_CONTEXT_TIMEOUT_MS }
    );
    const records = recording.parseContextReadPayload(answer.payload);
    const file = records.find(
      (one: { type: string }) => one.type === 'file'
    ) as { size: number; data: { length: number } } | undefined;
    out.big = {
      recordSize: file === undefined ? null : file.size,
      fetchedBytes: file === undefined ? null : file.data.length
    };
  }

  // Row 10. The exact bytes that would cross for a hostile value.
  const script = catalogue.remoteScript('context-read');
  out.composed =
    script === null
      ? ''
      : door.composeRemoteScriptCommand(script, [
          String(input.hostile),
          '2',
          ''
        ]);
  out.hostileQuoted = quote.shellQuoteArgv([String(input.hostile)]);
  out.scriptText = script === null ? '' : script.text;
} catch (err) {
  out.error = String((err as Error).stack ?? (err as Error).message);
}

writeFileSync(outPath, JSON.stringify(out), 'utf8');
process.exit(0);
}

void main();
`.replace('__REPO__', repoRoot),
  'utf8'
);

let driverCalls = 0;

function drive(input) {
  driverCalls += 1;
  const inPath = join(root, `p108-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p108-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const out = sh(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      timeout: 600_000,
      env: {
        ...process.env,
        // Without both of these `activeTmuxSocket` refuses to leave the real
        // socket, and the far side of this probe is the machine holding the
        // operator's live sessions.
        GMUX_SMOKE: 'probe-p108-context',
        GMUX_TMUX_SOCKET: SOCKET,
        SSH_AUTH_SOCK: yard?.authSock ?? process.env['SSH_AUTH_SOCK'] ?? ''
      }
    }
  );
  if (!existsSync(outPath)) {
    fail(
      `the driver did not answer. It printed:\n` +
        `${out.both.trim().split('\n').slice(-12).join('\n')}`
    );
    return null;
  }
  return JSON.parse(readFileSync(outPath, 'utf8'));
}

// ---------------------------------------------------------------------------
// The scratch machine
// ---------------------------------------------------------------------------

const yard = scratchYard({
  root,
  prefix: 'p108',
  record: (pid) => {
    if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
  }
});

const machine = scratchMachine(yard, { id: 'one', port: PORT });

function stopEverything() {
  try {
    machine.stop();
  } catch {
    /* already gone, which is the state we wanted */
  }
  for (const pid of [...recordedPids].reverse()) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  try {
    machine.cleanup();
  } catch {
    /* nothing to remove */
  }
  const tmuxTmp = machineTmuxTmp('p108', 'one');
  if (existsSync(tmuxTmp)) rmSync(tmuxTmp, { recursive: true, force: true });
  // Every scratch fixture, key and driver file this run wrote. Nothing outside
  // this one directory is removed, and the directory name carries this process
  // id, so a run cannot reach another run's files.
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
}

if (!machine.start()) {
  fail('the scratch sign in server did not start, so nothing could be measured.');
  stopEverything();
  process.exit(2);
}
say(`scratch machine on ${TARGET}:${String(PORT)}, socket ${SOCKET}`);

const ctxInput = {
  machineId: 'p108-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  remoteTmuxPath: yard.tmuxPath,
  socket: SOCKET,
  controlPath: join(root, 'p108-control'),
  hostKeys: join(root, 'p108-known-machines'),
  userHostKeys: join(root, 'p108-person-known-hosts'),
  hostile: HOSTILE,
  plainProj,
  seededProj,
  absentProj,
  widePaths,
  bigFile
};
writeFileSync(ctxInput.userHostKeys, '', 'utf8');

// Tortie's own record file, seeded with the scratch machine's identity. In the
// product that line is written by the ONE visible connection test, where a
// person read the question and answered it. Nothing here writes to the
// person's own record file, which is why the second path above is an empty
// scratch file.
const hostKeyLine = readFileSync(`${yard.hostKey}.pub`, 'utf8')
  .trim()
  .split(' ')
  .slice(0, 2)
  .join(' ');
writeFileSync(
  ctxInput.hostKeys,
  `[${TARGET}]:${String(PORT)} ${hostKeyLine}\n`,
  'utf8'
);

// ---------------------------------------------------------------------------
// One process, every read, so the connection is opened once
// ---------------------------------------------------------------------------

const driven = drive(ctxInput);

if (driven === null) {
  stopEverything();
  process.exit(1);
}
if (typeof driven.error === 'string') {
  fail(`the driver failed:\n${driven.error}`);
  stopEverything();
  process.exit(1);
}

const equalJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Whether two scans are one answer, and where they first differ.
 *
 * THE TIE RULE, so this comparison holds exactly what the product promises.
 * `sortEntries` in `src/main/context/resolve.ts` orders rows by category,
 * scope and name, and a stable sort keeps arrival order for two DIFFERENT
 * entries that tie on all three, e.g. one skill name installed as separate
 * copies into two agent directories. Arrival order is disk listing order,
 * which no two readers of one disk are promised to share. So the reading
 * order a person sees, being the (category, scope, name) sequence, is
 * compared AS A SEQUENCE, and the full projections are compared with the tied
 * twins put in one order by id. A winner, a shadow mark or a membership
 * difference still fails; two tied twins swapping places does not, because
 * the shipped comparator itself calls them equal.
 */
function compareScans(remote, local) {
  const a = remote?.entries ?? [];
  const b = local?.entries ?? [];
  if (a.length !== b.length) {
    return `entry count ${String(a.length)} against ${String(b.length)}`;
  }
  const readingOrder = (list) =>
    list.map((one) => `${one.category}|${one.scope}|${one.name}`);
  const aOrder = readingOrder(a);
  const bOrder = readingOrder(b);
  for (let at = 0; at < aOrder.length; at += 1) {
    if (aOrder[at] !== bOrder[at]) {
      return (
        `the reading order at row ${String(at)}: remote ${aOrder[at]} ` +
        `against local ${bOrder[at]}`
      );
    }
  }
  const byId = (list) =>
    [...list].sort((one, two) => one.id.localeCompare(two.id));
  const aSorted = byId(a);
  const bSorted = byId(b);
  for (let at = 0; at < aSorted.length; at += 1) {
    if (!equalJson(aSorted[at], bSorted[at])) {
      return (
        `entry ${String(at)} by id: remote ` +
        `${JSON.stringify(aSorted[at]).slice(0, 200)} against local ` +
        `${JSON.stringify(bSorted[at]).slice(0, 200)}`
      );
    }
  }
  if (!equalJson(remote?.roots, local?.roots)) return 'the root readouts';
  if (!equalJson(remote?.sections, local?.sections)) return 'the section counts';
  if (!equalJson(remote?.problems, local?.problems)) return 'the problem rows';
  if (remote?.cwd !== local?.cwd) return 'the cwd';
  if (remote?.truncated !== local?.truncated) return 'the truncated flag';
  return null;
}

// ---------------------------------------------------------------------------
// Row 2. The ordering proof
// ---------------------------------------------------------------------------

{
  const remote = driven.real ?? {};
  const differs = compareScans(remote.projected, driven.localReal);
  step(
    2,
    'a real Context through the loopback, against scanContext over the same disk',
    `mode ${String(remote.mode)}, ${String(remote.entryCount)} entr(ies), ` +
      `${String(remote.passes)} pass(es), ${String(remote.calls)} call(s), ` +
      `cut ${String(remote.cut)}; the ids, the reading order, the winners and ` +
      `the shadow marks are ${differs === null ? 'EQUAL' : 'DIFFERENT'}, tied ` +
      `twins compared in one order because the shipped sort calls them equal`
  );
  if (remote.mode !== 'context') {
    fail(`the real-home read answered mode ${String(remote.mode)}.`);
  }
  if (differs !== null) {
    fail(
      `the remote read and the local scan of the same disk disagree at: ` +
        `${differs}. One reader produced two answers over one disk, and the ` +
        `operator's own agents writing their configuration between the two ` +
        `scans is the one known innocent cause; rerun before reading more ` +
        `into it.`
    );
  }
}

// ---------------------------------------------------------------------------
// Row 3. The seeded project
// ---------------------------------------------------------------------------

{
  const remote = driven.seeded ?? {};
  const projected = remote.projected ?? { entries: [] };
  const differs = compareScans(remote.projected, driven.localSeeded);
  const names = projected.entries.map((one) => one.name);
  const sources = projected.entries.map((one) => one.sourcePath);
  const hasSkill = names.includes('p108-seeded-skill');
  // The folder name holds the space; the row's NAME is its frontmatter name.
  const hasSpaced = sources.some((one) =>
    one.endsWith('/p108 with space/SKILL.md')
  );
  const hasServer = names.includes('p108-server');
  const hasImport = sources.some((one) => one.endsWith('p108-imported.md'));
  step(
    3,
    'the seeded project, being one skill, one server, one import and one space',
    `skill ${String(hasSkill)}, skill in a folder holding a space ` +
      `${String(hasSpaced)}, server ${String(hasServer)}, imported ` +
      `instruction ${String(hasImport)}; ${String(remote.passes)} pass(es) ` +
      `and ${String(remote.calls)} call(s); against the local scan ` +
      `${differs === null ? 'EQUAL' : 'DIFFERENT'}`
  );
  if (!hasSkill || !hasServer || !hasImport || !hasSpaced) {
    fail(
      'the seeded project is missing rows: the read has to find the project ' +
        'skill, the skill whose folder name holds a space, the .mcp.json ' +
        'server and the file the instruction imported.'
    );
  }
  if (differs !== null) {
    fail(
      `the seeded remote read and the local scan disagree at: ${differs}.`
    );
  }
}

// ---------------------------------------------------------------------------
// Row 4. The seconds
// ---------------------------------------------------------------------------

{
  const real = driven.real ?? {};
  const seeded = driven.seeded ?? {};
  const per = (row) =>
    row.calls > 0 ? (row.elapsedMs / row.calls).toFixed(1) : 'n/a';
  step(
    4,
    'THE SECONDS',
    `the real home: ${String(real.elapsedMs)} ms across ` +
      `${String(real.calls)} call(s), ${per(real)} ms per call on average; ` +
      `the seeded project: ${String(seeded.elapsedMs)} ms across ` +
      `${String(seeded.calls)} call(s), ${per(seeded)} ms per call on average`
  );
}

// ---------------------------------------------------------------------------
// Row 5. The absent cwd
// ---------------------------------------------------------------------------

{
  const absent = driven.absent ?? {};
  const roots = (absent.projected?.roots ?? []).flatMap((one) => one.roots);
  const projectRoots = roots.filter((one) =>
    one.path.startsWith(`${absentProj}/`)
  );
  const anyThere = projectRoots.some((one) => one.exists === true);
  step(
    5,
    'a cwd that does not exist over there',
    `mode ${String(absent.mode)}, ${String(projectRoots.length)} project ` +
      `root(s) in the readouts, every one exists: false ${String(!anyThere)}`
  );
  if (absent.mode !== 'context') {
    fail(
      `a missing folder answered mode ${String(absent.mode)}. It answers ` +
        `context with the project rows absent, because a folder that is not ` +
        `there is an ordinary state of a machine rather than an error.`
    );
  }
  if (projectRoots.length === 0) {
    fail('the readouts carry no project roots for the missing folder at all.');
  }
  if (anyThere) {
    fail('a project root under a folder that is not there reads exists: true.');
  }
}

// ---------------------------------------------------------------------------
// Row 6. noHome, at the seam
// ---------------------------------------------------------------------------

{
  const noHome = driven.noHome ?? {};
  step(
    6,
    'a facts payload with an empty home',
    `mode ${String(noHome.mode)}, scan null ${String(noHome.scanNull)}, ` +
      `context-read calls ${String(noHome.contextReadCalls)}`
  );
  if (
    noHome.mode !== 'noHome' ||
    noHome.scanNull !== true ||
    noHome.contextReadCalls !== 0
  ) {
    fail(
      'an empty far side HOME has to refuse with noHome, a null scan and ' +
        'ZERO context-read calls, because the path resolver would otherwise ' +
        "fall back to THIS Mac's home and draw this Mac's skills under the " +
        "machine's name."
    );
  }
}

// ---------------------------------------------------------------------------
// Row 7. THE PROGRAM COUNT, measured against the shipped text
// ---------------------------------------------------------------------------

const scriptText = String(driven.scriptText ?? '');
const wrapDir = join(root, 'p108-wrappers');
const spawnLog = join(root, 'p108-spawns.log');
mkdirSync(wrapDir, { recursive: true, mode: 0o700 });

// A counting wrapper for every external program the script could reach for. A
// program that is a shell builtin in dash and in bash is never seen by one of
// these, which is why `printf`, `cd`, `pwd` and `[` are not in the numbers.
for (const name of [
  'find',
  'stat',
  'head',
  'base64',
  'tr',
  'realpath',
  'wc',
  'sh'
]) {
  const real = sh('/bin/sh', ['-c', `command -v ${name}`]).stdout.trim();
  if (real.length === 0) continue;
  writeFileSync(
    join(wrapDir, name),
    `#!/bin/sh\nprintf '%s\\n' "${name}" >> ${spawnLog}\nexec ${real} "$@"\n`,
    'utf8'
  );
  chmodSync(join(wrapDir, name), 0o755);
}

/** How many external programs one run of the shipped text makes, and which. */
function countSpawns(enumerateList, readList) {
  writeFileSync(spawnLog, '', 'utf8');
  sh(
    '/bin/sh',
    ['-c', scriptText, 'tortie-context-read', enumerateList, '2', readList],
    { env: { ...process.env, PATH: `${wrapDir}:/usr/bin:/bin` } }
  );
  const lines = readFileSync(spawnLog, 'utf8')
    .split('\n')
    .filter((one) => one.length > 0);
  const tally = new Map();
  for (const name of lines) tally.set(name, (tally.get(name) ?? 0) + 1);
  return {
    total: lines.length,
    which: [...tally.entries()]
      .sort()
      .map(([n, c]) => `${n} x${String(c)}`)
      .join(', ')
  };
}

if (scriptText.length === 0) {
  step(
    7,
    'the external programs the far side runs',
    'SKIPPED. The driver returned no script text, so nothing was measured. A skipped row is not a pass.'
  );
  fail(
    'the shipped script text did not reach this probe, so the spawn count was never measured.'
  );
} else {
  const shapes = [
    ['both lists empty', '', ''],
    ['enumerate an empty directory', emptyDir, ''],
    ['enumerate a directory holding one folder and one file', smallDir, ''],
    ['read one small file back', '', smallFile],
    ['one root and one file together', smallDir, smallFile],
    [
      'every path absent',
      join(root, 'p108-no-dir'),
      join(root, 'p108-no-file.md')
    ],
    ['one file over the byte cap', '', bigFile]
  ];
  const readings = [];
  for (const [what, enumerateList, readList] of shapes) {
    const runs = [];
    for (let at = 0; at < 5; at += 1) {
      runs.push(countSpawns(enumerateList, readList));
    }
    const totals = runs.map((one) => one.total);
    const steady = totals.every((one) => one === totals[0]);
    readings.push(`${what}: ${totals.join(', ')} (${runs[0].which || 'none'})`);
    if (!steady) {
      fail(
        `${what} ran a different number of programs across five runs: ` +
          `${totals.join(', ')}.`
      );
    }
  }
  step(
    7,
    'the external programs the far side runs, five runs of each shape',
    readings.join('; ')
  );
}

// ---------------------------------------------------------------------------
// Row 8. THE READ WROTE NOTHING, over the seeded world
// ---------------------------------------------------------------------------

{
  const seededAfter = treeFacts(seededProj);
  const moved = [];
  for (const [path, facts] of seededAfter) {
    const before = seededBefore.get(path);
    if (before === undefined) {
      moved.push(`${path} appeared`);
      continue;
    }
    if (before !== facts) moved.push(`${path} ${before} became ${facts}`);
  }
  for (const path of seededBefore.keys()) {
    if (!seededAfter.has(path)) moved.push(`${path} vanished`);
  }
  const again = driven.seededAgain ?? {};
  step(
    8,
    'the seeded world across two whole reads',
    `${String(seededAfter.size)} file(s), ` +
      `${moved.length === 0 ? 'all unchanged in size and modification time' : moved.join('; ')}; ` +
      `the second read answered mode ${String(again.mode)} with the same ` +
      `entry count ${String(
        (driven.seeded ?? {}).entryCount === again.entryCount
      )}`
  );
  if (moved.length > 0) {
    fail(`a read changed ${String(moved.length)} file(s) in the seeded world.`);
  }
  if (!equalJson((driven.seeded ?? {}).projected, again.projected)) {
    fail('two reads of one unchanged world answered two different lists.');
  }
}

// ---------------------------------------------------------------------------
// Row 9. The caps are real
// ---------------------------------------------------------------------------

{
  const wide = driven.wide ?? {};
  step(
    9,
    'the caps',
    `a read list of ${String(wide.totalListBytes)} bytes planned into ` +
      `${String(wide.planned)} call(s), largest list parameter ` +
      `${String(wide.listBytesMax)} bytes, ${String(wide.answered)} of ` +
      `${String(wide.asked)} path(s) answered; the 34,000,000 byte file came ` +
      `back at ${String((driven.big ?? {}).fetchedBytes)} bytes with its ` +
      `record naming ${String((driven.big ?? {}).recordSize)}`
  );
  if (!(wide.totalListBytes > 100_000)) {
    fail(
      `the wide fixture composed only ${String(wide.totalListBytes)} list ` +
        `bytes, so the split was never exercised.`
    );
  }
  if (!(wide.planned > 1)) {
    fail('a read list over 100,000 bytes did not split into more calls.');
  }
  if (wide.listBytesMax > 100_000) {
    fail(
      `one call carried ${String(wide.listBytesMax)} list bytes, over the ` +
        `100,000 byte cap.`
    );
  }
  if (wide.answered !== wide.asked) {
    fail(
      `${String(wide.asked)} path(s) were asked across the split calls and ` +
        `${String(wide.answered)} answered. The split must lose nothing.`
    );
  }
  const big = driven.big ?? {};
  if (big.fetchedBytes !== 33_554_432) {
    fail(
      `the over-cap file came back at ${String(big.fetchedBytes)} bytes. ` +
        `head -c cuts it at exactly 33,554,432.`
    );
  }
  if (!(big.recordSize > 33_554_432)) {
    fail(
      `the F record names ${String(big.recordSize)} bytes. It names the true ` +
        `size, which is how this end knows the fetch was cut.`
    );
  }
  // The problem row: the seeded scan is the shape that proves a truncated
  // parse lands as a row rather than a crash, and row 3 already held the
  // whole-scan equality, so here it is enough that the driver survived and
  // answered every row above.
}

// ---------------------------------------------------------------------------
// Row 10. The hostile value
// ---------------------------------------------------------------------------

{
  const composed = String(driven.composed ?? '');
  const hostileQuoted = String(driven.hostileQuoted ?? '');
  const quotedInCommand =
    hostileQuoted.length === 0 ? -1 : composed.split(hostileQuoted).length - 1;
  const rawInCommand = composed.split(HOSTILE).length - 1;
  const hostileInScript = scriptText.includes(HOSTILE);
  const hostileRead = driven.hostile ?? {};
  step(
    10,
    'a hostile folder value, in the bytes that actually cross',
    `${String(composed.length)} bytes, the value appears ` +
      `${String(quotedInCommand)} time(s) quoted and ${String(rawInCommand)} ` +
      `time(s) raw, it ${hostileInScript ? 'IS' : 'is not'} inside the script ` +
      `text; a whole read with that value as the cwd answered mode ` +
      `${String(hostileRead.mode)}; /private/tmp/p108-pwned exists ` +
      `${String(existsSync('/private/tmp/p108-pwned'))}`
  );
  if (quotedInCommand !== 1 || rawInCommand !== 0 || hostileInScript) {
    fail(
      'a hostile value must appear exactly once in the composed command, in ' +
        'its quoted form, and never inside the script text.'
    );
  }
  if (hostileRead.mode !== 'context') {
    fail(
      `a hostile cwd answered mode ${String(hostileRead.mode)}. It is just a ` +
        `folder that is not there.`
    );
  }
  if (existsSync('/private/tmp/p108-pwned')) {
    fail(
      'the hostile value ran as a command somewhere. /private/tmp/p108-pwned exists.'
    );
  }
}

// ---------------------------------------------------------------------------
// Row 11. The operator's own server, counted and never touched
// ---------------------------------------------------------------------------

stopEverything();

const sessionsAfter = operatorSessions();
const knownHostsAfter = personKnownHostsBytes();
step(
  11,
  'the operator’s sessions on -L gmux, after, and their own known hosts file',
  `${sessionsBefore} before, ${sessionsAfter} after; ~/.ssh/known_hosts ` +
    `${knownHostsBefore} bytes before, ${knownHostsAfter} bytes after`
);
if (sessionsBefore !== sessionsAfter) {
  fail(
    `the operator's session count moved from ${sessionsBefore} to ` +
      `${sessionsAfter}. This probe reads that server and never writes to it.`
  );
}
if (knownHostsBefore !== knownHostsAfter) {
  fail(
    `the person's own ~/.ssh/known_hosts moved from ${knownHostsBefore} to ` +
      `${knownHostsAfter} bytes. Every ssh this probe causes names Tortie's ` +
      `own known hosts file under the scratch root.`
  );
}

say(`pids recorded: ${recordedPids.join(', ') || 'none'}`);
say(
  'WHAT THIS DID NOT PROVE. The far side was this Mac, so GNU stat, GNU find ' +
    'and GNU coreutils are reasoned about from POSIX rather than measured, ' +
    'and the milliseconds above are a loopback floor rather than an ' +
    'expectation. Row 8 pinned the seeded world only: the real home was not ' +
    'byte-compared, because the operator’s own agents write their ' +
    'configuration while this probe runs. Nothing here drove the renderer; ' +
    'the shot harness covers the panel.'
);
if (failures.length > 0) {
  say(`FAILED with ${String(failures.length)} problem(s).`);
  process.exit(1);
}
say('PASS');
process.exit(0);
