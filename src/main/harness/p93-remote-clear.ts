/**
 * GMUX_SMOKE=p93-remote-clear. A session on another computer, whose project
 * tab is closed, is still there and can still be ended (Phase 93, item 3).
 *
 * ## Why this file exists, and what it is answering
 *
 * The operator asked for one thing in his own words: store this so that a
 * remote session is still clearable if he detaches from that project on a
 * remote machine. `build/probe-p93-attention.mjs` drives the row a person sees,
 * but its two remote steps use one machine row with nothing signed in to it, so
 * they measure what the row draws and which sentence a refusal writes. They do
 * not end anything on a second computer. Before this file that half of his
 * question rested on reading the code.
 *
 * This gate ends a real session, on a real machine, after the tab for its
 * folder has been closed.
 *
 * ## The five claims, and every one is a measurement
 *
 *   1  a folder on the machine is opened as a tab and one session is created
 *      on it, and the machine's own session list holds it
 *   2  closing that tab stamps the session, in the manifest, with the tab that
 *      went away, and the stamp names the machine
 *   3  the session keeps its folder and its machine after the tab is gone, so
 *      a surface can still say where it lives
 *   4  the End the ⌘J row runs, which is `killSession` by session id, ends it
 *      ON THAT MACHINE, read from the machine's own list
 *   5  the operator's own session server is untouched from first line to last
 *
 * ## What it does NOT prove, said here so a green line is not read as more
 *
 * NOBODY PRESSED A KEY IN THIS RUN. The gesture half, being the ⌘J row, the
 * confirm and `closeSession`, is driven by `build/probe-p93-attention.mjs` on a
 * local session. The two runs meet at the session id: the row's End calls
 * `sessions.kill(id)`, and `killSession(id)` is what this file calls. Nothing
 * between those two is measured here.
 *
 * A REMOTE ROW CANNOT REACH THE ⌘J LIST TODAY. `needs input` is never set for a
 * session on another machine, by the operator's own decision of 2026-08-19, so
 * no remote row appears in that list in the product as it stands. What this
 * gate proves is that the DATA and the END are ready for one when it does.
 *
 * THE MACHINE IS THIS SAME MAC, reached over a loopback sign in that
 * `build/with-scratch-machine.mjs` starts and takes away again. That is what
 * every remote gate in this repository uses and its limits are the same ones.
 *
 * ## Safety
 *
 * It refuses to run unless the profile is inside `GMUX_CONFIG_ROOT`, and it
 * refuses the real socket by name, for the reason `../machines/remote-smoke.ts`
 * gives: the far side of this connection is this same Mac, so a remote
 * `new-session` on socket `gmux` would land on the server holding the
 * operator's live work. It counts the operator's sessions before and after and
 * fails when the two differ. It never uses `pkill` and never uses
 * `kill-server`.
 *
 * `npm run smoke:p93remote` is the only supported way to run it.
 */

import { app } from 'electron';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { assertHarnessIsolation } from './isolation';
import { armWatchdog, smokeFail } from './support';
import { activeTmuxSocket, TMUX_SOCKET } from '../tmux/resolve';
import {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  confirmMachine,
  describeMachine,
  type MachineExecutionFields
} from '../machines/confirm';
import { machineContext, type RemoteMachineContext } from '../machines/context';
import { execOn } from '../machines/exec-plane';
import { prepareMachine } from '../machines/prepare';
import {
  parseRemoteListLine,
  remoteListArgs
} from '../machines/remote-sessions';
import { stopRemoteHarvest } from '../machines/remote-harvest';
import { stopRemoteStoreSync } from '../machines/remote-store-sync';
import {
  addMachineRow,
  machineHostKeysPath,
  reloadMachines
} from '../machines/store';
import { getGmuxCore } from '../sessions';

function log(line: string): void {
  console.log(`[gmux-p93-remote] ${line}`);
}

function fail(message: string): never {
  throw new Error(message);
}

/** The machine this gate makes. */
const ID = 'p93clear';
const LABEL = 'Clear Probe';

/** What `build/with-scratch-machine.mjs` wrote for this run. */
interface Carriage {
  host: string;
  port: number;
  user: string;
  remoteTmuxPath: string;
}

const CARRIAGE_FILE = 'p69-carriage.json';

function readCarriage(root: string): Carriage | null {
  try {
    return JSON.parse(readFileSync(join(root, CARRIAGE_FILE), 'utf8')) as Carriage;
  } catch {
    return null;
  }
}

/** Confirm a machine the way the IPC handler does, from what the sheet showed. */
function confirmAsAPerson(id: string, fields: MachineExecutionFields): void {
  const summary = describeMachine(id, fields);
  const recorded = confirmMachine(id, fields, {
    acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
    hashRead: summary.hash,
    linesRead: summary.lines
  });
  if (recorded === null) {
    fail(
      'the confirmation could not be sealed. safeStorage is unavailable in ' +
        'this build, so every machine would be refused in a person’s hands.'
    );
  }
}

/** The operator's own server, read only, counted. This is the only mention. */
function operatorSessionCount(): number {
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

/** Every session the far side holds right now, by its own immutable id. */
async function farSideIds(ctx: RemoteMachineContext): Promise<string[]> {
  const listed = await execOn(ctx, remoteListArgs());
  return listed
    .split('\n')
    .map(parseRemoteListLine)
    .flatMap((row) => (row === null ? [] : [row.tmuxId]))
    .sort();
}

/** Wait until `read` answers true, or give up and say what was waited for. */
async function until(
  what: string,
  read: () => Promise<boolean> | boolean,
  ms = 20_000
): Promise<void> {
  const deadline = Date.now() + ms;
  for (;;) {
    if (await read()) return;
    if (Date.now() > deadline) fail(`${what} did not happen within ${String(ms)} ms`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

export async function runP93RemoteClearSmoke(): Promise<void> {
  armWatchdog(300_000);
  let farDir: string | null = null;
  try {
    // --- 1. The isolations, and the carriage file ---------------------------
    const iso = assertHarnessIsolation('GMUX_CONFIG_ROOT');
    if (activeTmuxSocket() === TMUX_SOCKET) {
      fail(
        `the socket is "${TMUX_SOCKET}", the real one. This gate creates a ` +
          `session on a machine, and on this socket that machine is this Mac.`
      );
    }
    // The far side is this same Mac, so a connected time pass would read the
    // operator's own agent stores under their own home directory. Both cadences
    // are off for the whole of this gate, exactly as the Phase 70 and Phase 91
    // gates turn them off, and for the same reason.
    stopRemoteHarvest();
    stopRemoteStoreSync();
    const operatorBefore = operatorSessionCount();
    log(`profile ${iso.userData}, socket ${iso.socket}`);
    log(`the operator's own server holds ${String(operatorBefore)} session(s)`);

    // The core is booted BEFORE the machine exists, for the reason
    // ./capture-remote.ts gives: `getGmuxCore` fires the sign in loop without
    // waiting for it, and a second prepare drops the program search list
    // captured for the first one.
    const core = await getGmuxCore();

    const carriage = readCarriage(iso.root);
    if (carriage === null) {
      // ABSENT IS A FAILURE, never a skip. Every claim below needs a machine.
      fail(
        `no scratch machine details at ${CARRIAGE_FILE} inside ${iso.root}. ` +
          `Run this through "npm run smoke:p93remote", which starts the ` +
          `machine and writes that file.`
      );
    }
    const fields: MachineExecutionFields = {
      host: carriage.host,
      user: carriage.user,
      port: carriage.port,
      remoteTmuxPath: carriage.remoteTmuxPath
    };
    log(`1/7 isolated, and the machine details are at ${CARRIAGE_FILE}`);

    // --- 2. A real machine, confirmed and prepared --------------------------
    const record = machineHostKeysPath();
    mkdirSync(dirname(record), { recursive: true });
    writeFileSync(
      record,
      execFileSync(
        '/usr/bin/ssh-keyscan',
        ['-p', String(carriage.port), carriage.host],
        { encoding: 'utf8', timeout: 30_000 }
      ),
      'utf8'
    );
    addMachineRow({
      id: ID,
      label: LABEL,
      color: 'green',
      host: fields.host,
      ...(fields.user === null ? {} : { user: fields.user }),
      ...(fields.port === null ? {} : { port: fields.port }),
      ...(fields.remoteTmuxPath === null
        ? {}
        : { remoteTmuxPath: fields.remoteTmuxPath })
    });
    reloadMachines();
    confirmAsAPerson(ID, fields);
    const prepared = await prepareMachine({
      machineId: ID,
      fields,
      tortieHostKeys: machineHostKeysPath()
    });
    if (prepared.class !== 'prepared') {
      fail(`the prepare answered ${prepared.class}: ${prepared.detail}`);
    }
    const ctx = machineContext(ID) as RemoteMachineContext;
    const farBefore = await farSideIds(ctx);
    log(
      `2/7 ${LABEL} is signed in, and it holds ` +
        `${String(farBefore.length)} session(s) before this run`
    );

    // --- 3. A folder on that machine, opened as a tab -----------------------
    //
    // The far side is this same Mac, so a directory made here is a directory
    // that is there. That is a property of this harness and of nothing else.
    farDir = mkdtempSync(join(tmpdir(), 'p93-remote-clear-'));
    const added = await core.addRemoteProject({ machineId: ID, path: farDir });
    if (!added.ok) fail(`the folder on ${LABEL} was refused: ${added.reason}`);
    const project = added.project;
    log(`3/7 ${farDir} on ${LABEL} is a tab, project id ${project.id}`);

    // --- 4. One real session on that machine, in that folder ----------------
    const made = await core.createSession({
      name: `p93-remote-${String(process.pid)}`,
      projectPath: farDir,
      cwd: farDir,
      agent: 'shell',
      machineId: ID
    });
    await until('the machine to hold the new session', async () => {
      const now = await farSideIds(ctx);
      return now.length === farBefore.length + 1;
    });
    log(`4/7 ${made.id} is running on ${LABEL}, in the folder that tab names`);

    // --- 5. The tab is closed, and the session is stamped -------------------
    core.removeProject(project.id);
    if (core.listProjects().some((p) => p.id === project.id)) {
      fail('the tab is still open after removeProject');
    }
    const stamped = core.listSessionRecords().find((r) => r.id === made.id);
    if (stamped === undefined) {
      fail('the session lost its row when the tab closed. It must keep it.');
    }
    const tab = stamped.projectTombstone;
    if (tab === undefined) {
      fail(
        'the session carries no record of the tab that closed, so nothing ' +
          'durable says the folder ever had one'
      );
    }
    if (tab.machineId !== ID) {
      fail(
        `the record names machine ${JSON.stringify(tab.machineId)} and it ` +
          `should name ${ID}`
      );
    }
    if (tab.path !== farDir) {
      fail(`the record names folder ${tab.path} and it should name ${farDir}`);
    }
    // The projection a window reads carries the same tab without the machine
    // id, because the session's own machine field already answers that.
    const projected = core.listSessions().find((x) => x.id === made.id);
    if (projected?.closedProject === undefined) {
      fail('the record is on the row but the window would not see it');
    }
    log(
      `5/7 the tab is closed and the session carries it: ` +
        `${JSON.stringify(tab)}, drawn as ` +
        `${JSON.stringify(projected.closedProject)}`
    );

    // --- 6. The session still says where it lives ---------------------------
    if (stamped.projectPath !== farDir) {
      fail(`the row's folder is ${stamped.projectPath} and not ${farDir}`);
    }
    if (stamped.machineId !== ID) {
      fail(`the row's machine is ${String(stamped.machineId)} and not ${ID}`);
    }
    const shown = core.listSessions().find((s) => s.id === made.id);
    if (shown === undefined) {
      fail('the session is not in the list a window would draw');
    }
    if (shown.machine?.id !== ID) {
      fail(
        `the session a window would draw names machine ` +
          `${String(shown.machine?.id)} and not ${ID}`
      );
    }
    log(
      `6/7 with no tab at all, the row still reads ${shown.projectPath} on ` +
        `${shown.machine.label}`
    );

    // --- 7. The End the ⌘J row runs, by session id --------------------------
    //
    // This is the same call `sessions.kill(id)` makes, which is what
    // `closeSession` in src/renderer/app/session-actions.ts calls once a person
    // has answered the confirm. Nothing here needs the tab back first.
    await core.killSession(made.id);
    await until('the machine to lose that session', async () => {
      const now = await farSideIds(ctx);
      return now.length === farBefore.length;
    });
    const farAfter = await farSideIds(ctx);
    if (farAfter.join(',') !== farBefore.join(',')) {
      fail(
        `${LABEL} holds ${farAfter.join(', ') || 'nothing'} and it held ` +
          `${farBefore.join(', ') || 'nothing'} before this run`
      );
    }
    log(
      `7/7 the session was ended on ${LABEL} from its id alone, with no tab ` +
        `for its folder anywhere`
    );

    const operatorAfter = operatorSessionCount();
    if (operatorAfter !== operatorBefore) {
      fail(
        `the operator's own server held ${String(operatorBefore)} session(s) ` +
          `and now holds ${String(operatorAfter)}`
      );
    }
    log(
      `PASS (p93-remote-clear). A session on another computer outlived its ` +
        `tab, kept its folder and its machine, carried the record of the tab ` +
        `that closed, and was ended from its id. The operator's server still ` +
        `holds ${String(operatorAfter)} session(s).`
    );
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  } finally {
    if (farDir !== null) rmSync(farDir, { recursive: true, force: true });
  }
}
