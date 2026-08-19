/**
 * GMUX_SMOKE=capture-remote. A session on another machine is not captured, and
 * a person is told so (Phase 91).
 *
 * ## What only this can prove
 *
 * Three things, and none of them is provable by a unit test.
 *
 * A create with `capture: true` and a machine RESOLVES. A refused capture must
 * never cost a person the session they asked for, and the only way to know
 * that is to make the call in a real process against a real machine.
 *
 * The notice reaches a renderer through the real preload bridge. The sentence
 * a person reads is composed in main, crosses the context bridge and lands in
 * the window. A unit test can hold either end and neither crossing.
 *
 * Nothing wrapped the agent over there. The assertion is a question asked OF
 * THE FAR SIDE about the session's own folder, rather than a reading of this
 * Mac's code.
 *
 * ## What it does NOT prove, said here so nobody reads a green line as more
 *
 * It does not prove that capture can never run on another machine. That was
 * already true before this phase, because the SpecStory program is inside
 * Tortie on this Mac and nothing installs it over there. This gate proves that
 * Tortie now says so.
 *
 * Nobody watched the toast appear. Step 6 reads the payload the renderer
 * received through the bridge, which is one step short of a person's eye.
 *
 * ## Safety
 *
 * It refuses to run unless the profile is inside `GMUX_CONFIG_ROOT` and the
 * tmux socket is not the real one, using the same guard the fault harness
 * makes, from the same module. It also refuses the real socket BY NAME, for
 * the reason `../machines/remote-smoke.ts` gives: the far side of its
 * connection is this same Mac, so a remote `new-session` on socket `gmux`
 * would land on the server holding the operator's live work.
 *
 * The machine it talks to is the scratch sshd `build/with-scratch-machine.mjs`
 * starts and takes away again. `npm run smoke:capture:remote` is the only
 * supported way to run it.
 */

import { app, BrowserWindow } from 'electron';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { SessionCaptureNotice } from '@shared/types';
import { assertHarnessIsolation } from './isolation';
import { armWatchdog, smokeFail } from './support';
import { activeTmuxSocket, TMUX_SOCKET } from '../tmux/resolve';
import { listDetectedAgents } from '../agents/detection';
import {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  confirmMachine,
  describeMachine,
  type MachineExecutionFields
} from '../machines/confirm';
import { machineContext, type RemoteMachineContext } from '../machines/context';
import { listRemoteDir } from '../machines/dir-list';
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
import { CAPTURE_NOT_ON_ANOTHER_MACHINE, capturableAgents } from '../specstory';

function log(line: string): void {
  console.log(`[gmux-capture-remote] ${line}`);
}

function fail(message: string): never {
  throw new Error(message);
}

/** The machine this gate makes, and the label the picture has to show. */
const ID = 'p91capture';
const LABEL = 'Capture Probe';

/**
 * The caption the create sheet draws under a Capture row it is refusing.
 *
 * IT IS WRITTEN OUT HERE, and that is not a second source of truth by
 * accident. Main cannot import renderer code, so the sentence cannot be shared
 * as a value. `src/renderer/app/__tests__/capture-on-a-machine.test.tsx` reads
 * BOTH this file and `machine-copy.ts` and fails when the two texts differ, so
 * a reword in one place cannot leave the other behind.
 */
function expectedCaption(label: string): string {
  return `Tortie runs SpecStory on this Mac only, so a session on ${label} is not captured.`;
}

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

/** The operator's own server, read only, counted. */
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

export async function runCaptureRemoteSmoke(deps: {
  createWindow(): BrowserWindow;
}): Promise<void> {
  armWatchdog(300_000);
  let localProject: string | null = null;
  let farDir: string | null = null;
  try {
    // --- 1. The two isolations, and the carriage file -----------------------
    const iso = assertHarnessIsolation('GMUX_CONFIG_ROOT');
    if (activeTmuxSocket() === TMUX_SOCKET) {
      fail(
        `the socket is "${TMUX_SOCKET}", the real one. This gate creates a ` +
          `session on a machine, and on this socket that machine is this Mac.`
      );
    }
    // The far side is this same Mac, so a connected time pass would read the
    // operator's own agent stores under their own home directory. Both
    // cadences are off for the whole of this gate, exactly as the Phase 70
    // gate turns them off and for the same reason.
    stopRemoteHarvest();
    stopRemoteStoreSync();
    const operatorBefore = operatorSessionCount();
    log(`profile ${iso.userData}, socket ${iso.socket}`);
    log(`the operator's own server holds ${String(operatorBefore)} session(s)`);

    // THE CORE IS BOOTED HERE, BEFORE THE MACHINE EXISTS, and the order is not
    // cosmetic. `getGmuxCore` fires `signInToConfirmedMachines` without waiting
    // for it, and that loop prepares every confirmed machine again. A second
    // prepare registers the context again, which moves the generation and drops
    // the program search list captured for the old one. MEASURED on the first
    // run of this gate: the create refused with "no program search list is
    // recorded for p91capture's current connection". Booting first means that
    // loop finds an empty machines file and does nothing.
    const core = await getGmuxCore();

    const carriage = readCarriage(iso.root);
    if (carriage === null) {
      // ABSENT IS A FAILURE, never a skip. Every step below needs a machine to
      // talk to, so a run without one has proved nothing and must not pass.
      fail(
        `no scratch machine details at ${CARRIAGE_FILE} inside ${iso.root}. ` +
          `Run this through "npm run smoke:capture:remote", which starts the ` +
          `machine and writes that file.`
      );
    }
    const fields: MachineExecutionFields = {
      host: carriage.host,
      user: carriage.user,
      port: carriage.port,
      remoteTmuxPath: carriage.remoteTmuxPath
    };
    log(`1/10 isolated, and the machine details are at ${CARRIAGE_FILE}`);

    // --- 2. A real machine, confirmed and prepared --------------------------
    //
    // The one first contact is done by hand, exactly as the Phase 70 gate does
    // it: the exec plane carries StrictHostKeyChecking=yes, so it refuses a
    // machine whose identity is not recorded and it cannot ask. In the product
    // that answer comes from the visible connection test.
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
      color: 'magenta',
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
    // `prepareMachine` starts the machine's own feed in its success arm since
    // Phase 84, so nothing here starts a second one.
    const ctx = machineContext(ID) as RemoteMachineContext;
    const farBefore = await farSideIds(ctx);
    log(
      `2/10 ${LABEL} is confirmed and prepared, and it holds ` +
        `${String(farBefore.length)} session(s) before this run`
    );

    // --- 3. An agent this Mac could capture ---------------------------------
    const capturable = new Set<string>(await capturableAgents());
    const scan = await listDetectedAgents();
    const pick = scan.agents.find(
      (a) => a.launchable && a.installed && capturable.has(a.id)
    );
    if (pick === undefined) {
      // A FAILURE with the reason named, never a silent pass. A gate that runs
      // with nothing to capture has measured nothing at all.
      fail(
        `no agent on this Mac is both installed and capturable, so there is ` +
          `nothing to ask for. SpecStory can capture ` +
          `${[...capturable].join(', ') || '(none)'} and this Mac has ` +
          `${scan.agents.filter((a) => a.installed).map((a) => a.id).join(', ') || '(none)'}.`
      );
    }
    log(`3/10 asking for capture on ${pick.id} (${pick.displayName})`);

    // --- 4. A window, subscribed through the REAL preload -------------------
    //
    // It is opened BEFORE the create, because the notice is a push and a
    // subscriber that arrives afterwards would read nothing and call it a pass.
    const win = deps.createWindow();
    await new Promise<void>((resolve) => {
      if (!win.webContents.isLoading()) resolve();
      else win.webContents.once('did-finish-load', () => resolve());
    });
    const bridged = (await win.webContents.executeJavaScript(
      `(() => {
         window.__p91Notices = [];
         const s = window.gmux && window.gmux.specstory;
         if (!s || typeof s.onNotice !== 'function') return 'no-bridge';
         s.onNotice((n) => { window.__p91Notices.push(n); });
         return 'subscribed';
       })()`,
      true
    )) as string;
    if (bridged !== 'subscribed') {
      fail(`the preload does not expose specstory.onNotice (${bridged})`);
    }
    const notices = async (): Promise<SessionCaptureNotice[]> =>
      (await win.webContents.executeJavaScript(
        'JSON.parse(JSON.stringify(window.__p91Notices))',
        true
      )) as SessionCaptureNotice[];
    log('4/10 a real window is subscribed to the capture notice through the preload');

    // --- 5. The create that asks for capture on that machine ----------------
    //
    // The far side is this same Mac, so a directory made here is a directory
    // that is there. That is a property of this harness and of nothing else.
    farDir = mkdtempSync(join(tmpdir(), 'p91-capture-far-'));
    const captured = await core.createSession({
      name: `p91-capture-${String(process.pid)}`,
      projectPath: farDir,
      cwd: farDir,
      agent: pick.id as 'claude',
      machineId: ID,
      capture: true
    });
    log(`5/10 the create RESOLVED and gave back ${captured.id}`);

    // --- 6. The manifest row carries no capture -----------------------------
    const rec = core.listSessionRecords().find((r) => r.id === captured.id);
    if (rec === undefined) fail('the create wrote no row for this session');
    if (rec.specstory !== undefined) {
      fail(`the row records a capture: ${JSON.stringify(rec.specstory)}`);
    }
    if ((rec.argv[0] ?? '').includes('specstory')) {
      fail(`the recorded command is wrapped: ${JSON.stringify(rec.argv)}`);
    }
    log(
      `6/10 the row records no capture, and its command starts with ` +
        `${JSON.stringify(rec.argv[0] ?? '')}`
    );

    // --- 7. Exactly one notice, and it says the sentence byte for byte ------
    await until('the capture notice', async () => (await notices()).length > 0);
    const seen = await notices();
    if (seen.length !== 1) {
      fail(`${String(seen.length)} notices arrived: ${JSON.stringify(seen)}`);
    }
    const one = seen[0] as SessionCaptureNotice;
    if (one.kind !== 'declined') fail(`the notice kind is ${one.kind}`);
    if (one.sessionId !== captured.id) {
      fail(`the notice names session ${one.sessionId}`);
    }
    if (one.message !== CAPTURE_NOT_ON_ANOTHER_MACHINE) {
      fail(
        `the notice says ${JSON.stringify(one.message)} and it should say ` +
          JSON.stringify(CAPTURE_NOT_ON_ANOTHER_MACHINE)
      );
    }
    log(`7/10 one declined notice, byte for byte: ${one.message}`);

    // --- 8. Nothing wrapped anything over there -----------------------------
    //
    // Asked OF THE MACHINE, through the folder listing door, rather than read
    // off this Mac's disk. The listing marks folders, and `.specstory` is a
    // folder, so its absence from the listing is the answer.
    const listing = await listRemoteDir({ machineId: ID, path: farDir });
    if (listing.refusal !== null) {
      fail(`the machine would not list the session's folder: ${listing.refusal}`);
    }
    if (listing.entries.some((e) => e.name === '.specstory')) {
      fail('.specstory exists on the far side, so something wrapped the agent');
    }
    log(
      `8/10 the machine says its folder holds ` +
        `${String(listing.entries.length)} folder(s) and none of them is .specstory`
    );

    // --- 9. A create that did not ask for capture is told nothing -----------
    const quiet = await core.createSession({
      name: `p91-quiet-${String(process.pid)}`,
      projectPath: farDir,
      cwd: farDir,
      agent: pick.id as 'claude',
      machineId: ID
    });
    await new Promise((r) => setTimeout(r, 1_500));
    const after = await notices();
    if (after.length !== 1) {
      fail(
        `a create that asked for nothing raised a notice: ${JSON.stringify(after)}`
      );
    }
    log(`9/10 ${quiet.id} asked for no capture and was told nothing`);

    // --- 10. The picture, and the far side loses exactly what it gained -----
    //
    // The create sheet is opened in the real window with this machine picked,
    // and the Capture row is read out of the live DOM before the capture. A
    // step that could not be landed is REPORTED as not landed. It is never
    // quietly dropped, and this gate never claims a picture it did not take.
    localProject = mkdtempSync(join(tmpdir(), 'p91-capture-project-'));
    const shotPath = join(process.cwd(), 'out', 'p91-capture-row.png');
    const drawn = await driveCreateSheet(win, localProject, pick.displayName);
    if (drawn.state !== 'read') {
      log(`10/10 THE PICTURE WAS NOT TAKEN: ${drawn.reason}`);
      fail(`the create sheet could not be read: ${drawn.reason}`);
    }
    if (!drawn.rowPresent) fail('the Capture row is not on screen for a machine');
    if (!drawn.disabled) fail('the Capture checkbox is not disabled');
    if (drawn.checked) fail('the Capture checkbox is drawn on');
    if (drawn.caption !== expectedCaption(LABEL)) {
      fail(
        `the caption says ${JSON.stringify(drawn.caption)} and it should say ` +
          JSON.stringify(expectedCaption(LABEL))
      );
    }
    win.show();
    win.moveTop();
    win.focus();
    await win.webContents
      .executeJavaScript(
        'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(1))))',
        true
      )
      .catch(() => undefined);
    mkdirSync(dirname(shotPath), { recursive: true });
    await writeFile(shotPath, (await win.webContents.capturePage()).toPNG());
    log(`10/10 the row is on screen, off, and captioned. Picture: ${shotPath}`);

    await core.killSession(captured.id).catch(() => undefined);
    await core.killSession(quiet.id).catch(() => undefined);
    await until('the far side to lose both sessions', async () => {
      const now = await farSideIds(ctx);
      return now.length === farBefore.length;
    });
    const farAfter = await farSideIds(ctx);
    if (farAfter.join(',') !== farBefore.join(',')) {
      fail(
        `the far side holds ${farAfter.join(', ')} and it held ` +
          `${farBefore.join(', ')} before this run`
      );
    }
    const operatorAfter = operatorSessionCount();
    if (operatorAfter !== operatorBefore) {
      fail(
        `the operator's own server held ${String(operatorBefore)} session(s) ` +
          `and now holds ${String(operatorAfter)}`
      );
    }
    log(
      `PASS (capture-remote). The create resolved, nothing was captured, one ` +
        `sentence said so, and the operator's server still holds ` +
        `${String(operatorAfter)} session(s).`
    );
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  } finally {
    for (const dir of [localProject, farDir]) {
      if (dir !== null) rmSync(dir, { recursive: true, force: true });
    }
  }
}

/** What the Capture row looked like in the live sheet. */
type SheetReading =
  | { state: 'not-read'; reason: string }
  | {
      state: 'read';
      rowPresent: boolean;
      disabled: boolean;
      checked: boolean;
      caption: string;
    };

/**
 * Open the real create sheet, pick this machine, pick this agent, and read the
 * Capture row back out of the DOM.
 *
 * It drives the shipped surfaces rather than the store: a real click on the
 * agent tile, and a real change event on the machine field, which is what
 * React's own onChange listens for. Assigning `.value` alone is swallowed.
 */
async function driveCreateSheet(
  win: BrowserWindow,
  projectPath: string,
  agentLabel: string
): Promise<SheetReading> {
  const wc = win.webContents;
  const deadline = Date.now() + 40_000;
  let hooked = false;
  while (Date.now() < deadline) {
    hooked = (await wc.executeJavaScript(
      "typeof window.__gmuxShotDrive === 'function'"
    )) as boolean;
    if (hooked) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!hooked) return { state: 'not-read', reason: 'the drive hook never appeared' };
  await wc.executeJavaScript(
    `window.__gmuxShotDrive({ projectPath: ${JSON.stringify(projectPath)}, ui: 'create' })`,
    true
  );
  return (await wc.executeJavaScript(
    `(async () => {
       const wait = (ms) => new Promise((r) => setTimeout(r, ms));
       const pick = ${JSON.stringify(agentLabel)};
       let tile = null;
       for (let i = 0; i < 40 && tile === null; i++) {
         tile = Array.from(document.querySelectorAll('.agent-tile'))
           .find((el) => el.querySelector('.agent-tile-name')?.textContent === pick) ?? null;
         if (tile === null) await wait(250);
       }
       if (tile === null) return { state: 'not-read', reason: 'no tile is named ' + pick };
       tile.click();
       await wait(300);
       const sel = document.querySelector('#session-machine');
       if (sel === null) return { state: 'not-read', reason: 'the sheet drew no machine field' };
       const setter = Object.getOwnPropertyDescriptor(
         window.HTMLSelectElement.prototype, 'value'
       ).set;
       setter.call(sel, ${JSON.stringify(ID)});
       sel.dispatchEvent(new Event('change', { bubbles: true }));
       await wait(600);
       const caption = document.querySelector('#capture-caption');
       const box = document.querySelector('#capture-caption')
         ? document.querySelector('.preset-row.off .preset-check')
         : null;
       if (caption === null) {
         return { state: 'not-read', reason: 'the sheet drew no Capture row at all' };
       }
       return {
         state: 'read',
         rowPresent: true,
         disabled: box !== null && box.disabled === true,
         checked: box !== null && box.checked === true,
         caption: caption.textContent
       };
     })()`,
    true
  )) as SheetReading;
}
