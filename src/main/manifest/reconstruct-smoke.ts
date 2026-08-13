/**
 * GMUX_SMOKE=reconstruct — drive reconstruction inside a real Electron process,
 * against real snapshot capsules and a real tmux server (Phase 20 item 5).
 *
 * WHY THIS EXISTS. A rebuild path that has never run in an Electron process is
 * a rebuild path nobody should reach for on the day they need it. This is the
 * Tier 3 evidence the phase asks for: reconstruct into an empty manifest from
 * capsules and tmux stamps, and assert foreign sessions are untouched.
 *
 * It is not the way a PERSON reaches reconstruction. That is the menu item in
 * `reconstruct-operator.ts`, and this harness refuses the real profile and the
 * real socket by design. For a whole phase this file was the only caller, and
 * that had a cost beyond the missing feature: rollup can prove the argument of
 * a function with one visible call site, and it deleted the acknowledgement
 * refusal from the shipped bundle. The refusals are now driven from inside this
 * harness, against the built artifact, before the real apply below.
 *
 * WHAT IT DOES, in order.
 *
 *  1. Refuses to run unless the profile and the tmux socket are both isolated.
 *     It is the same check `fault-work` makes, from the same module.
 *  2. Creates two managed sessions and captures their scrollback, so the
 *     profile holds capsules that carry a launch recipe.
 *  3. Creates ONE session with no identity on the same harness socket. That is
 *     the foreign session, and it is the point of the run.
 *  4. Surveys. Asserts the two managed sessions are candidates with recipes and
 *     that the foreign one is in `foreign` and in no candidate.
 *  5. Applies into a temporary root, with a decision for each managed session.
 *  6. Opens the rebuilt manifest with a second connection and compares every
 *     row against the live manifest, column by column.
 *  7. Proves the live manifest is byte identical to what it was before step 4.
 *
 * SAFETY. The foreign session is one this harness created moments earlier on
 * its own socket, so ending it is ending its own work. Nothing here sends
 * `kill-server`, and the isolation guard refuses the operator's socket before
 * any session is created.
 */

import { Menu, app, dialog } from 'electron';
import type { MenuItem } from 'electron';
import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { assertHarnessIsolation } from '../harness/isolation';
import { getGmuxCore, shutdownGmuxCore } from '../sessions';
import * as tmux from '../tmux';
import {
  RECONSTRUCTION_ACKNOWLEDGEMENT,
  RECONSTRUCTION_BODY_NAME,
  applyReconstruction,
  summarizePlan,
  surveyReconstruction,
  type CandidateDecision
} from './reconstruct';
import { defaultManifestDbPath } from './store';

function log(line: string): void {
  console.log(`[gmux-reconstruct] ${line}`);
}

/**
 * Stop the run.
 *
 * It THROWS rather than calling `app.exit` directly, and the difference is not
 * cosmetic. `app.exit` does not stop the JavaScript that follows it, so the
 * first draft of this file printed two failures and then went on to print a
 * PASS-shaped line for a check that had already failed. One thrower, one
 * reporter at the top.
 */
function fail(message: string): never {
  throw new Error(message);
}

/** The sessions this harness owns. `zz-` so no other tool reads them as work. */
const PREFIX = 'zz-reconstruct';

/** Printed once into each managed pane, so a capture has something to write. */
const MARKER = `GMUX-RECONSTRUCT-${String(process.pid)}`;

/** Poll the harness's own server until every managed pane shows the marker. */
async function waitForMarkers(count: number): Promise<void> {
  const deadline = Date.now() + 20_000;
  for (;;) {
    const live = await tmux.listSessions();
    let seen = 0;
    for (const s of live.filter((x) => x.tmuxName.startsWith(PREFIX))) {
      const target = await tmux.resolvePaneTarget(s.sessionId);
      if ((await tmux.capturePane(target, 200)).includes(MARKER)) seen += 1;
    }
    if (seen >= count) return;
    if (Date.now() > deadline) {
      fail(`only ${String(seen)} of ${String(count)} markers appeared`);
    }
    await new Promise<void>((r) => setTimeout(r, 200));
  }
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * Assert that a call is refused, and print what the refusal actually said.
 *
 * A refusal that has been optimised out of the artifact does not throw. It
 * returns a result, and the run then fails here with the thing it produced,
 * which is the sentence a reader needs.
 */
async function assertRefusedInThisArtifact(
  what: string,
  run: () => Promise<unknown>
): Promise<void> {
  try {
    await run();
  } catch (err) {
    log(`refused ${what}: ${(err as Error).message}`);
    return;
  }
  fail(
    `${what} was NOT refused by this build. The check is in the source and it ` +
      'is not in out/main/index.js. See build/assert-bundle-refusals.mjs.'
  );
}

/**
 * sha256 of the manifest file itself, and the set of session ids inside it.
 *
 * NOT the `-wal` and NOT the `-shm`, and that is a correction this run forced.
 * The app is running throughout, its 1 Hz status poll and its reconcile are
 * writing, and both sidecars therefore change under any measurement taken while
 * it lives. Hashing them proves nothing about reconstruction. The two things
 * that do prove something are the database file's own bytes and the rows a
 * second connection can read out of it.
 */
function manifestState(dbPath: string): { sha256: string; ids: string[] } {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    return {
      sha256: existsSync(dbPath) ? sha256(dbPath) : 'absent',
      ids: (db.prepare('SELECT id FROM sessions ORDER BY id').all() as { id: string }[])
        .map((r) => r.id)
    };
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// The door, driven through the real menu
// ---------------------------------------------------------------------------

/** One `dialog.showMessageBox` call, as the harness saw it. */
interface SeenBox {
  message: string;
  detail: string;
  buttons: string[];
}

/** Find a menu item by label anywhere in the installed application menu. */
function findMenuItem(label: string): MenuItem | null {
  const menu = Menu.getApplicationMenu();
  if (menu === null) return null;
  const walk = (items: readonly MenuItem[]): MenuItem | null => {
    for (const item of items) {
      if (item.label === label) return item;
      // Electron hands back `null` for an item with no submenu in some builds
      // and `undefined` in others, and a role item can carry either. One
      // nullish check rather than a guess about which.
      const sub = item.submenu as { items?: readonly MenuItem[] } | null | undefined;
      if (sub?.items !== undefined) {
        const found = walk(sub.items);
        if (found !== null) return found;
      }
    }
    return null;
  };
  return walk(menu.items);
}

/**
 * Drive `Rebuild the Session List…` the way a person does, and prove both
 * halves: cancelling writes nothing, and confirming writes a usable rebuild.
 *
 * WHAT IS REAL HERE. The menu item is the one `installAppMenu()` put in the
 * running application menu. Its click handler is the real one. The survey, the
 * apply, the refusals and the file it writes are the real ones, in the built
 * bundle. The ONE thing replaced is `dialog.showMessageBox`, because that is
 * the person, and a harness cannot be the person. Every box is recorded and
 * checked, so what the person would have read is part of the evidence rather
 * than something this run assumed.
 */
async function driveTheMenuDoor(
  liveSha256: string,
  dbPath: string,
  foreignName: string
): Promise<void> {
  const item = findMenuItem('Rebuild the Session List…');
  if (item === null) {
    fail(
      'the application menu has no "Rebuild the Session List…" item, so a ' +
        'person has no way to reach reconstruction'
    );
  }
  if (!item.enabled) fail('the rebuild menu item is disabled');

  const reconstructions = join(app.getPath('userData'), 'gmux', 'reconstructions');
  if (existsSync(reconstructions)) {
    fail(`${reconstructions} exists before the menu item was ever used`);
  }

  const seen: SeenBox[] = [];
  const realShowMessageBox = dialog.showMessageBox.bind(dialog);
  /** Which button this run's person clicks on the FIRST box. */
  let answerFirstBox = 0;
  const install = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dialog as any).showMessageBox = (options: {
      message?: string;
      detail?: string;
      buttons?: string[];
    }) => {
      seen.push({
        message: options.message ?? '',
        detail: options.detail ?? '',
        buttons: options.buttons ?? []
      });
      // The first box is the question. Every later box is a report, and a
      // report is dismissed with its default button.
      return Promise.resolve({
        response: seen.length === 1 ? answerFirstBox : 0,
        checkboxChecked: false
      });
    };
  };

  try {
    // --- The person opens it and says no ------------------------------------
    install();
    answerFirstBox = 0; // Cancel is always button 0.
    item.click();
    await waitFor('the question box after Cancel', () => seen.length >= 1);
    if (seen.length !== 1) {
      fail(`cancelling showed ${String(seen.length)} boxes, expected 1`);
    }
    const question = seen[0];
    if (question === undefined || question.buttons[0] !== 'Cancel') {
      fail(`the question's first button is "${question?.buttons[0] ?? '?'}", not Cancel`);
    }
    if (!question.detail.includes(foreignName)) {
      fail('the question does not tell the person about the foreign session');
    }
    if (existsSync(reconstructions)) {
      fail(`cancelling wrote ${reconstructions}. It must write nothing.`);
    }
    log(`the menu door asked "${question.message}" and wrote nothing on Cancel`);

    // --- The person opens it again and says yes -----------------------------
    seen.length = 0;
    answerFirstBox = 1; // "Rebuild N Sessions".
    item.click();
    await waitFor('the report box after Rebuild', () => seen.length >= 2);
    if (seen.length !== 2) {
      fail(`confirming showed ${String(seen.length)} boxes, expected 2`);
    }
    const report = seen[1];
    if (report === undefined) fail('no report box after confirming');
    if (!report.message.startsWith('Rebuilt ')) {
      fail(`the report box says "${report.message}", which is not a rebuild`);
    }
    const roots = readdirSync(reconstructions);
    if (roots.length !== 1) {
      fail(`${String(roots.length)} rebuild folders, expected 1`);
    }
    const body = join(reconstructions, roots[0] ?? '', RECONSTRUCTION_BODY_NAME);
    if (!existsSync(body)) fail(`the menu door wrote no manifest at ${body}`);
    const rebuilt = manifestState(body);
    if (rebuilt.ids.length === 0) fail('the menu door wrote an empty manifest');
    // The trap recovery.ts documented and reconstruct.ts fell into: the profile
    // migration copies every *.db it finds, and this folder is in the profile.
    for (const name of readdirSync(join(reconstructions, roots[0] ?? ''))) {
      if (name.endsWith('.db')) {
        fail(`${name} ends in .db, which migrate/userdata.ts would copy`);
      }
    }
    log(
      `the menu door rebuilt ${String(rebuilt.ids.length)} row(s) into ${body}, ` +
        'and no file it wrote ends in .db'
    );
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dialog as any).showMessageBox = realShowMessageBox;
  }

  // --- The live manifest is still the live manifest -------------------------
  const after = manifestState(dbPath);
  if (after.sha256 !== liveSha256) {
    fail(
      `the menu door changed the live manifest's bytes: ${liveSha256} then ` +
        after.sha256
    );
  }
  log('the menu door left the live manifest byte identical');
}

/**
 * Wait for something to become true, then wait a little longer.
 *
 * A menu click is fire and forget: Electron calls the handler and the promise
 * inside it belongs to nobody. So the harness waits on the OUTCOME rather than
 * on a handle. The grace period afterwards is what makes a negative claim
 * honest. "Cancel wrote nothing" is only worth saying if the run gave a write
 * time to appear, and a check that fires the instant the box is answered would
 * pass on a build that writes a moment later.
 */
async function waitFor(
  what: string,
  predicate: () => boolean,
  graceMs = 750
): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (!predicate()) {
    if (Date.now() > deadline) fail(`timed out waiting for ${what}`);
    await new Promise<void>((r) => setTimeout(r, 25));
  }
  await new Promise<void>((r) => setTimeout(r, graceMs));
}

export async function runReconstructSmoke(): Promise<void> {
  const watchdog = setTimeout(() => {
    fail('120 s watchdog expired');
  }, 120_000);
  watchdog.unref?.();

  let foreignTmuxId: string | null = null;
  try {
    const iso = assertHarnessIsolation('GMUX_RECONSTRUCT_ROOT');
    log(`start socket=-L ${iso.socket} userData=${iso.userData}`);

    const core = await getGmuxCore();
    const home = homedir();
    const managed: { id: string; name: string }[] = [];
    for (let i = 1; i <= 2; i += 1) {
      const session = await core.createSession({
        name: `${PREFIX}-${String(i)}`,
        projectPath: home,
        cwd: home,
        agent: 'shell',
        // The marker is printed once and the pane then stays alive. It has to
        // be there: `captureSessionSnapshot` writes nothing for an empty pane,
        // so a silent pane produces no capsule and the run would be measuring
        // a fixture rather than the product. The first draft of this harness
        // ran a bare sleep loop and reported "no recipe" for both sessions.
        extraArgs: ['-c', `echo ${MARKER}; while true; do sleep 1; done`]
      });
      managed.push({ id: session.id, name: session.name });
      log(`created ${session.name} (${session.id})`);
    }

    // The capsules are what reconstruction reads. Without this pass there is a
    // manifest and no evidence, which is the opposite of the case under test.
    await waitForMarkers(managed.length);
    await core.snapshotAllSessions();
    log('capsules written');

    // The foreign session. `new-session` straight through execTmux, with no
    // `@gmux-id` and no pane environment stamp, which is exactly the shape of a
    // tmux session a user started themselves.
    const foreignName = `${PREFIX}-foreign`;
    await tmux.execTmux([
      'new-session',
      '-d',
      '-s',
      foreignName,
      '-c',
      home,
      'sh',
      '-c',
      'while true; do sleep 1; done'
    ]);
    const live = await tmux.listSessions({ includeControl: true });
    foreignTmuxId = live.find((s) => s.tmuxName === foreignName)?.sessionId ?? null;
    if (foreignTmuxId === null) fail('the foreign session was not created');
    log(`created a foreign session with no identity: ${foreignTmuxId} ${foreignName}`);

    const dbPath = defaultManifestDbPath();
    const before = manifestState(dbPath);

    // ---- Survey -----------------------------------------------------------
    const plan = await surveyReconstruction();
    for (const line of summarizePlan(plan)) log(`plan: ${line}`);

    const foreignIds = plan.foreign.map((f) => f.tmuxId);
    if (!foreignIds.includes(foreignTmuxId)) {
      fail(
        `the foreign session ${foreignTmuxId} is not in the plan's foreign list ` +
          `(${foreignIds.join(', ') || 'empty'})`
      );
    }
    for (const m of managed) {
      const candidate = plan.candidates.find((c) => c.sessionId === m.id);
      if (candidate === undefined) fail(`${m.name} is not a candidate`);
      if (candidate.recipe === null) fail(`${m.name} has no recipe`);
      if (candidate.decisionRequired) {
        fail(`${m.name} has a full recipe and still asks for a decision`);
      }
    }
    // A foreign session has no session id, so the only way it could reach a row
    // is under some other name. Assert on the tmux id and on the tmux name.
    for (const c of plan.candidates) {
      if (c.live.some((l) => l.tmuxId === foreignTmuxId)) {
        fail(`candidate ${c.sessionId} claims the foreign session`);
      }
    }

    // ---- Apply ------------------------------------------------------------
    const outputRoot = join(iso.root, 'rebuild');
    const decisions: Record<string, CandidateDecision> = {};
    for (const m of managed) decisions[m.id] = { include: true };

    // The refusals, driven against THIS artifact before the real apply.
    //
    // WHY IT IS HERE AND NOT ONLY IN A UNIT TEST. Vitest runs the TypeScript
    // source. The thing `npm run package` ships is out/main/index.js, and those
    // are not the same program: rollup deleted the acknowledgement refusal from
    // the bundle for a whole phase, because `applyReconstruction` had one call
    // site and rollup could prove the argument. The source had the check, the
    // unit test passed, and the shipped app did not have it. This runs the
    // refusals inside the built artifact, in a real Electron process.
    //
    // Both attempts are refused BEFORE the plan token is spent and before any
    // path is prepared, so the real apply below still has its one use of the
    // plan. That ordering is a property of applyReconstruction, and if it ever
    // changes this step fails loudly on the next line rather than silently.
    await assertRefusedInThisArtifact('a wrong acknowledgement', () =>
      applyReconstruction(plan, {
        // Built at runtime so no bundler can fold this branch away and quietly
        // turn this check into a check of nothing.
        acknowledgement: `not the acknowledgement ${String(
          process.pid
        )}` as typeof RECONSTRUCTION_ACKNOWLEDGEMENT,
        decidedBy: 'GMUX_SMOKE=reconstruct',
        outputRoot,
        decisions
      })
    );
    await assertRefusedInThisArtifact('an empty decidedBy', () =>
      applyReconstruction(plan, {
        acknowledgement: RECONSTRUCTION_ACKNOWLEDGEMENT,
        decidedBy: '   ',
        outputRoot,
        decisions
      })
    );
    if (existsSync(outputRoot)) {
      fail(`a refused apply created ${outputRoot}. It must write nothing.`);
    }

    const result = await applyReconstruction(plan, {
      acknowledgement: RECONSTRUCTION_ACKNOWLEDGEMENT,
      decidedBy: 'GMUX_SMOKE=reconstruct',
      outputRoot,
      decisions
    });
    log(
      `wrote ${String(result.written.length)} row(s) into ${result.manifestPath}, ` +
        `verified=${String(result.verified)}`
    );
    if (!result.verified) fail(`rows did not read back: ${result.mismatches.join('; ')}`);
    for (const m of managed) {
      if (!result.written.includes(m.id)) fail(`${m.name} was not written`);
    }
    if (result.foreignUntouched.every((f) => f.tmuxId !== foreignTmuxId)) {
      fail('the report does not record the foreign session as untouched');
    }

    // ---- Compare the rebuild against the live manifest ---------------------
    compareRows(dbPath, result.manifestPath, managed.map((m) => m.id));

    // ---- The live manifest did not move ------------------------------------
    const after = manifestState(dbPath);
    if (before.sha256 !== after.sha256) {
      fail(
        `the live manifest's bytes changed during the reconstruction: ` +
          `${before.sha256} then ${after.sha256}`
      );
    }
    if (before.ids.join(',') !== after.ids.join(',')) {
      fail('the live manifest gained or lost a session row');
    }
    log(
      `the live manifest is byte identical (${before.sha256}) and still holds ` +
        `${String(after.ids.length)} row(s)`
    );

    // ---- The foreign session is still there, untouched ---------------------
    const stillLive = await tmux.listSessions({ includeControl: true });
    const foreign = stillLive.find((s) => s.sessionId === foreignTmuxId);
    if (foreign === undefined) fail('the foreign session is gone');
    if (foreign.tmuxName !== foreignName) {
      fail(`the foreign session was renamed to ${foreign.tmuxName}`);
    }
    if (foreign.gmuxId !== undefined) {
      fail(`the foreign session was stamped with ${foreign.gmuxId}`);
    }
    log('the foreign session is alive, unrenamed and unstamped');

    // ---- The door a person actually uses -----------------------------------
    await driveTheMenuDoor(before.sha256, dbPath, foreignName);

    log('PASS');
    // Ours, created seconds ago, on this harness's own socket. By $-id.
    await tmux.killSession(foreignTmuxId).catch(() => undefined);
    foreignTmuxId = null;
    await shutdownGmuxCore();
    app.exit(0);
  } catch (err) {
    if (foreignTmuxId !== null) {
      await tmux.killSession(foreignTmuxId).catch(() => undefined);
    }
    console.error(`[gmux-reconstruct] FAIL: ${(err as Error).message}`);
    app.exit(1);
  }
}

/**
 * Every column a reconstructed row is supposed to carry, compared against the
 * live manifest's own row.
 *
 * This is the check that says the rebuild holds the user's sessions rather than
 * holding some rows. Status is left out on purpose: reconstruction writes
 * `running` for a live candidate and reconcile is the authority the moment the
 * app next refreshes.
 */
function compareRows(livePath: string, rebuiltPath: string, ids: string[]): void {
  const columns = [
    'name',
    'project_path',
    'cwd',
    'agent',
    'argv',
    'resume_argv',
    'agent_session_id'
  ];
  const live = new Database(livePath, { readonly: true, fileMustExist: true });
  const rebuilt = new Database(rebuiltPath, { readonly: true, fileMustExist: true });
  try {
    const select = `SELECT ${columns.join(', ')} FROM sessions WHERE id = ?`;
    for (const id of ids) {
      const a = live.prepare<[string]>(select).get(id) as Record<string, unknown>;
      const b = rebuilt.prepare<[string]>(select).get(id) as Record<string, unknown>;
      if (b === undefined) fail(`${id} is missing from the rebuild`);
      const differ = columns.filter((c) => String(a[c]) !== String(b[c]));
      if (differ.length > 0) {
        fail(`${id} differs from the live row on ${differ.join(', ')}`);
      }
      log(`${id}: ${String(columns.length)} of ${String(columns.length)} columns match the live row`);
    }
  } finally {
    live.close();
    rebuilt.close();
  }
}
