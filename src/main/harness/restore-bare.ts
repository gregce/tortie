/**
 * Declining capture on restore — GMUX_SMOKE=restore-bare (Phase 119, Tier 3).
 *
 * THE CLAIM THIS HARNESS MAKES EXECUTABLE. A person can bring a captured
 * session back with SpecStory turned off, the choice sticks to the row, and the
 * ordinary restore and the ordinary restart are unchanged by it.
 *
 * Before this phase there was no way to ask for that. `armableResumeArgv` in
 * src/main/restore/restore.ts reached its bare arm only when the recorded
 * `specstory.bin` had gone missing, and a bundled binary is always on disk, so
 * the arm was unreachable by choice. This is insurance against the next wrapper
 * that breaks rather than a repair of one that is broken now.
 *
 * TWO REAL CAPTURED SESSIONS, ONE APP RUN. Session A takes the declined path
 * and session B takes the ordinary one, so the two answers are measured against
 * the same binary, the same manifest and the same tmux server. Step 7 is the
 * one that decides the phase: insurance that breaks the normal restore is worse
 * than no insurance.
 *
 * The ten steps:
 *
 *   1. resolve SpecStory and create session A with capture on
 *   2. read the wrapped resume argv back, verbatim, as the before state
 *   3. end A out of band, with its recorded binary still on disk
 *   4. restore A with `{ withoutCapture: true }` and read the armed pane line
 *   5. read the row: capture off, agentArgv kept, resume argv bare, no capture
 *      on the projection
 *   6. press Enter and prove the pane runs the agent with no specstory over it
 *   7. session B, the ORDINARY restore, armed line byte for byte the recorded
 *      one and specstory over the agent again
 *   8. restart B with `{ withoutCapture: true }`: the replacement row records
 *      no capture at all and the old row is gone
 *   9. a forged row whose wrap cannot be taken apart: nothing armed, the
 *      failure sentence returned, the capture setting untouched
 *  10. clean up, and prove the harness socket holds no session
 *
 * SAFETY. It refuses to start without an isolated profile AND an isolated tmux
 * socket, it kills only sessions whose name it composed, and cloud sync is
 * forced off by the harness rather than by the operator, because it creates
 * real captured sessions and a scratch session must never reach anyone's
 * SpecStory Cloud. `npm run smoke:restore:bare`.
 */

import { app } from 'electron';
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { CreateSessionInput } from '@shared/types';
import type { ManifestSessionRecord } from '../manifest';
import { DECLINE_UNWRAP_FAILED, buildArmedCommand, stripAnsi } from '../restore';
import { restartSession } from '../restart';
import { getGmuxCore, shutdownGmuxCore, type GmuxCore } from '../sessions';
import { resolveSpecstory, unwrapArgv } from '../specstory';
import * as tmux from '../tmux';
import { assertHarnessIsolation, teardownHarnessServer } from './isolation';
import { armWatchdog, panePs, smokeFail, smokeLog } from './support';

/**
 * The only thing that authorises a kill in this file. A session whose name
 * does not begin with it is somebody's work, whatever this harness's own
 * bookkeeping says.
 */
const PREFIX = 'zz-p119-';

const delay = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** Fail with a sentence that names the measurement, never an adjective. */
function fail(sentence: string): never {
  throw new Error(sentence);
}

/** The manifest row for an id, or a failure that says the row is gone. */
function row(core: GmuxCore, id: string): ManifestSessionRecord {
  const rec = core.listSessionRecords().find((r) => r.id === id);
  if (rec === undefined) fail(`no manifest row for ${id}`);
  return rec;
}

/** The live tmux `$-id` for one of OUR sessions, or null. */
async function liveIdFor(tmuxName: string): Promise<string | null> {
  const live = await tmux.listSessions().catch(() => []);
  return live.find((s) => s.tmuxName === tmuxName)?.sessionId ?? null;
}

/** Kill a tmux session, and only one this harness named. */
async function killOwn(tmuxName: string): Promise<boolean> {
  if (!tmuxName.startsWith(PREFIX)) {
    fail(`refusing to kill "${tmuxName}", which is not a ${PREFIX} session`);
  }
  const id = await liveIdFor(tmuxName);
  if (id === null) return false;
  await tmux.killSession(id);
  return true;
}

/** Drive a reconcile until the row reaches `want`, or give up and say so. */
async function waitForStatus(
  core: GmuxCore,
  sessionId: string,
  want: string,
  maxMs: number
): Promise<string> {
  const deadline = Date.now() + maxMs;
  for (;;) {
    await core.refresh().catch(() => undefined);
    const status = row(core, sessionId).status;
    if (status === want) return status;
    if (Date.now() >= deadline) return status;
    await delay(500);
  }
}

/** Everything on a pane's screen, with the escape codes taken off. */
async function paneText(target: string): Promise<string> {
  return stripAnsi(await tmux.capturePane(target, 400).catch(() => ''));
}

/** The last non-empty line on a pane. */
async function paneTail(target: string): Promise<string> {
  const lines = (await paneText(target))
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  return lines[lines.length - 1] ?? '';
}

/**
 * Every space taken out.
 *
 * THIS IS WHAT MAKES A BYTE FOR BYTE COMPARE POSSIBLE AT ALL. A restored pane
 * is 80 columns wide and the armed command is several hundred characters, so
 * tmux wraps it and `capture-pane` reports the wrap as newlines. Squashing the
 * whitespace out of both sides compares the characters the pane actually holds
 * against the characters the manifest actually recorded, and nothing else.
 */
const squash = (text: string): string => text.replace(/\s+/g, '');

/** Poll a pane until its screen holds `wanted`, ignoring where it wrapped. */
async function waitForPane(
  target: string,
  wanted: string,
  maxMs: number,
  label: string
): Promise<string> {
  const want = squash(wanted);
  const deadline = Date.now() + maxMs;
  let last = '';
  for (;;) {
    last = await paneText(target);
    if (squash(last).includes(want)) return last;
    if (Date.now() >= deadline) break;
    await delay(300);
  }
  fail(
    `${label}: the pane never held the expected command within ` +
      `${Math.round(maxMs / 1000)}s.\nwanted: ${wanted}\nlast screen tail:\n` +
      last.split('\n').slice(-12).join('\n')
  );
}

/**
 * Every process descended from one pid, at any depth, as `ps` sees it.
 *
 * WHY NOT `ps -g`, which is what `psChildren` in ./support uses. That reads a
 * process GROUP, and zsh puts each foreground job in a group of its own. A
 * restore arms a command rather than running one, so whatever the person's
 * Enter starts is a job of the pane's login shell and is in a DIFFERENT group
 * from the pane. Measured: the first draft of this harness read the group,
 * found no agent across 121 samples, and the pane was showing the agent's own
 * trust question at the time. Walking parent to child finds it.
 */
async function descendantsOf(rootPid: number): Promise<string[]> {
  const raw = await new Promise<string>((resolve) => {
    execFile('ps', ['-o', 'pid=,ppid=,command=', '-ax'], (_err, stdout) => {
      resolve(stdout);
    });
  });
  const byParent = new Map<number, { pid: number; command: string }[]>();
  for (const line of raw.split('\n')) {
    const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (match === null) continue;
    const pid = Number(match[1]);
    const ppid = Number(match[2]);
    const kids = byParent.get(ppid) ?? [];
    kids.push({ pid, command: match[3] ?? '' });
    byParent.set(ppid, kids);
  }
  const found: string[] = [];
  const seen = new Set<number>();
  const queue: number[] = [rootPid];
  while (queue.length > 0) {
    const pid = queue.shift() as number;
    if (seen.has(pid)) continue;
    seen.add(pid);
    for (const kid of byParent.get(pid) ?? []) {
      found.push(kid.command);
      queue.push(kid.pid);
    }
  }
  return found;
}

/** The pane's own process and everything under it. */
async function paneTree(target: string): Promise<string[]> {
  const pane = await panePs(target).catch(() => null);
  if (pane === null) return [];
  return [pane.command, ...(await descendantsOf(pane.pid))];
}

/** Create one captured session in its own scratch directory. */
async function makeCaptured(
  core: GmuxCore,
  agent: string,
  name: string,
  dir: string
): Promise<{ id: string; tmuxName: string }> {
  const session = await core.createSession({
    name,
    projectPath: dir,
    cwd: dir,
    agent: agent as CreateSessionInput['agent'],
    capture: true
  });
  return { id: session.id, tmuxName: session.tmuxName };
}

export async function runRestoreBareSmoke(): Promise<void> {
  armWatchdog(300_000);
  const dirs: string[] = [];
  try {
    // --- 1. isolation, the resolver, and session A ---------------------------
    const isolation = assertHarnessIsolation('GMUX_HARNESS_DIR');
    process.env['GMUX_SPECSTORY_NO_CLOUD'] = '1';
    const agent = process.env['GMUX_SMOKE_AGENT'] ?? 'claude';
    const core = await getGmuxCore();
    const { active } = await resolveSpecstory();
    if (active === null) {
      fail(
        'no specstory binary resolved. Run `npm run vendor:specstory` for the ' +
          'bundled copy, or install the CLI.'
      );
    }
    smokeLog(
      `1/10 isolated on socket ${isolation.socket} under ${isolation.userData}; ` +
        `cloud sync FORCED OFF; specstory ${active.path} ${active.version ?? '?'}`
    );

    const dirA = mkdtempSync(join(isolation.root, 'p119-a-'));
    dirs.push(dirA);
    const a = await makeCaptured(core, agent, `${PREFIX}a-${process.pid}`, dirA);
    const recA0 = row(core, a.id);
    if (recA0.specstory?.enabled !== true) {
      fail(
        `capture was asked for and not recorded on A: ` +
          JSON.stringify(recA0.specstory)
      );
    }
    if (recA0.argv[0] !== active.path) {
      fail(`A's launch argv[0] is ${String(recA0.argv[0])}, not ${active.path}`);
    }

    // --- 2. the before state, recorded verbatim ------------------------------
    const recordedResume = [...(recA0.resumeArgv ?? [])];
    if (recordedResume.length === 0 || recordedResume[0] !== active.path) {
      fail(
        `A's resume argv is not wrapped, so there is nothing to decline: ` +
          JSON.stringify(recordedResume)
      );
    }
    const bareExpected = unwrapArgv(recordedResume);
    if (bareExpected.length === 0) {
      fail('A’s recorded resume argv could not be taken apart at all');
    }
    smokeLog(
      `2/10 A records a wrapped resume: ${recordedResume.join(' ')}\n` +
        `      the bare command inside it is: ${bareExpected.join(' ')}`
    );

    // --- 3. end A out of band, with the recorded binary still on disk --------
    await delay(4_000);
    await killOwn(recA0.tmuxName);
    const statusA = await waitForStatus(core, a.id, 'restorable', 30_000);
    if (statusA !== 'restorable' && statusA !== 'exited') {
      fail(`after an out of band kill A reads "${statusA}", not restorable`);
    }
    const binOnDisk = existsSync(recA0.specstory.bin);
    if (!binOnDisk) {
      fail(
        `A's recorded specstory binary ${recA0.specstory.bin} is gone, so this ` +
          'run would take the healing arm rather than the decline arm'
      );
    }
    smokeLog(
      `3/10 A is "${statusA}" and its recorded binary is still on disk, which ` +
        'is the condition that made the bare arm unreachable before this phase'
    );

    // --- 4. the declined restore --------------------------------------------
    const restoredA = await core.restoreSession(a.id, { withoutCapture: true });
    const liveA = await liveIdFor(restoredA.tmuxName);
    if (liveA === null) fail('the declined restore produced no tmux session');
    const agentBin = bareExpected[0] as string;
    // Byte for byte against the bare command the manifest's own wrap held,
    // never against a command this harness rebuilt.
    const expectedBare = buildArmedCommand(bareExpected);
    await waitForPane(liveA, expectedBare, 20_000, 'declined arm');
    const screenA = squash(await paneText(liveA));
    if (screenA.includes(squash(`${active.path} run`))) {
      fail(
        'the declined restore armed a line that still runs SpecStory. Last ' +
          `line: ${await paneTail(liveA)}`
      );
    }
    smokeLog(
      `4/10 the armed line is the bare command, ${expectedBare.length} ` +
        `characters, and no "<specstory> run" is anywhere on the screen`
    );

    // --- 5. the durable flip -------------------------------------------------
    const recA1 = row(core, a.id);
    if (recA1.specstory?.enabled !== false) {
      fail(
        `A's capture setting is ${JSON.stringify(recA1.specstory?.enabled)}, ` +
          'not false, so the decline did not stick and the next harvest would ' +
          'wrap the resume command again'
      );
    }
    const keptArgv = recA1.specstory.agentArgv.join(' ');
    if (keptArgv !== recA0.specstory.agentArgv.join(' ')) {
      fail(
        `A's recorded agent argv changed from "${recA0.specstory.agentArgv.join(' ')}" ` +
          `to "${keptArgv}", so a later Restart would lose its launch flags`
      );
    }
    const resumeA1 = recA1.resumeArgv ?? [];
    if (resumeA1[0] === active.path || resumeA1.join(' ') !== bareExpected.join(' ')) {
      fail(
        `A's stored resume argv is ${JSON.stringify(resumeA1)}, not the bare ` +
          `${JSON.stringify(bareExpected)}`
      );
    }
    const projectedA = core.listSessions().find((s) => s.id === a.id);
    if (projectedA?.capture !== undefined) {
      fail(
        'the projection still claims A is captured: ' +
          JSON.stringify(projectedA.capture)
      );
    }
    smokeLog(
      `5/10 the flip is durable: enabled=false, agentArgv kept as "${keptArgv}", ` +
        `resumeArgv=${resumeA1.join(' ')}, and the projection carries no capture`
    );

    // --- 6. the person's one keypress ---------------------------------------
    await tmux.execTmux(['send-keys', '-t', liveA, 'Enter']);
    // The match is on the RECORDED agent binary at the head of the command
    // line, not on the word "claude" anywhere in it. The first draft matched a
    // `printf` of the login PATH, because that PATH contains `/.claude/local`.
    const wrapperMark = `${active.path} run`;
    let sawAgent = '';
    let samples = 0;
    const deadline6 = Date.now() + 25_000;
    for (;;) {
      const tree = await paneTree(liveA);
      samples += 1;
      const wrapperProc = tree.find((c) => c.startsWith(wrapperMark));
      if (wrapperProc !== undefined) {
        fail(
          'a SpecStory process is running in the restored pane after a ' +
            `decline: ${wrapperProc}`
        );
      }
      const agentProc = tree.find((c) => c.startsWith(agentBin));
      if (agentProc !== undefined && sawAgent === '') sawAgent = agentProc;
      // One more sample after the agent appears, so a wrapper that starts
      // alongside it rather than before it is still seen.
      if (sawAgent !== '' && samples > 1) break;
      if (Date.now() >= deadline6) break;
      await delay(200);
    }
    if (sawAgent === '') {
      fail(
        `no process starting with ${agentBin} was seen in the restored pane ` +
          `within 25s of Enter, across ${samples} samples of the process ` +
          `group. Last pane line: ${await paneTail(liveA)}`
      );
    }
    smokeLog(
      `6/10 after Enter the pane group ran the agent with no SpecStory over ` +
        `it, seen in ${samples} samples: ${sawAgent.slice(0, 90)}`
    );

    // --- 7. THE ORDINARY RESTORE, and it decides the phase --------------------
    const dirB = mkdtempSync(join(isolation.root, 'p119-b-'));
    dirs.push(dirB);
    const b = await makeCaptured(core, agent, `${PREFIX}b-${process.pid}`, dirB);
    const recB0 = row(core, b.id);
    const recordedB = [...(recB0.resumeArgv ?? [])];
    if (recordedB.length === 0 || recordedB[0] !== active.path) {
      fail(`B's resume argv is not wrapped: ${JSON.stringify(recordedB)}`);
    }
    await delay(4_000);
    await killOwn(recB0.tmuxName);
    const statusB = await waitForStatus(core, b.id, 'restorable', 30_000);
    if (statusB !== 'restorable' && statusB !== 'exited') {
      fail(`after an out of band kill B reads "${statusB}", not restorable`);
    }
    const restoredB = await core.restoreSession(b.id);
    const liveB = await liveIdFor(restoredB.tmuxName);
    if (liveB === null) fail('the ordinary restore produced no tmux session');
    // BYTE FOR BYTE against the recorded resume argv, and this is the assertion
    // the phase turns on. Insurance that breaks the normal restore is worse
    // than no insurance.
    const expectedB = buildArmedCommand(recordedB);
    await waitForPane(liveB, expectedB, 20_000, 'ordinary arm');
    const recB1 = row(core, b.id);
    if (recB1.specstory?.enabled !== true) {
      fail(
        `the ordinary restore changed B's capture setting to ` +
          `${JSON.stringify(recB1.specstory?.enabled)}`
      );
    }
    if ((recB1.resumeArgv ?? []).join(' ') !== recordedB.join(' ')) {
      fail(
        `the ordinary restore rewrote B's resume argv to ` +
          `${JSON.stringify(recB1.resumeArgv)}`
      );
    }
    await tmux.execTmux(['send-keys', '-t', liveB, 'Enter']);
    let wrapperProcB = '';
    let agentProcB = '';
    const deadline7 = Date.now() + 25_000;
    for (;;) {
      const tree = await paneTree(liveB);
      wrapperProcB = tree.find((c) => c.startsWith(wrapperMark)) ?? '';
      agentProcB = tree.find((c) => c.startsWith(agentBin)) ?? '';
      if (wrapperProcB !== '' && agentProcB !== '') break;
      if (Date.now() >= deadline7) break;
      await delay(200);
    }
    if (wrapperProcB === '') {
      fail(
        'the ordinary restore did not put SpecStory back over the agent. The ' +
          `pane group held: ${(await paneTree(liveB)).join(' | ').slice(0, 300)}`
      );
    }
    smokeLog(
      `7/10 THE ORDINARY RESTORE IS UNCHANGED: the armed line matches the ` +
        `recorded resume argv character for character over ${expectedB.length} ` +
        `characters, the row still reads enabled=true, and the pane group runs ` +
        `${wrapperProcB.slice(0, 70)}`
    );

    // --- 8. the declined restart ---------------------------------------------
    const outcome = await restartSession(core, b.id, { withoutCapture: true });
    if (outcome.capture) {
      fail('the declined restart reported capture: true');
    }
    const recNew = row(core, outcome.session.id);
    if (recNew.specstory !== undefined) {
      fail(
        'the replacement row carries a capture record: ' +
          JSON.stringify(recNew.specstory)
      );
    }
    if (recNew.argv[0] === active.path) {
      fail(`the replacement's argv[0] is still ${active.path}`);
    }
    const oldStillThere = core
      .listSessionRecords()
      .filter((r) => r.id === b.id && r.status !== 'discarded');
    if (oldStillThere.length !== 0) {
      fail(`the old row for B was not discarded: ${oldStillThere.length} left`);
    }
    smokeLog(
      `8/10 the declined restart is bare from birth: no capture record, ` +
        `argv[0]=${String(recNew.argv[0])}, and the old row is gone`
    );
    await core.killSession(outcome.session.id).catch(() => undefined);
    core.discardSession(outcome.session.id);

    // --- 9. the decline that cannot be honoured ------------------------------
    const dirC = mkdtempSync(join(isolation.root, 'p119-c-'));
    dirs.push(dirC);
    const c = await makeCaptured(core, agent, `${PREFIX}c-${process.pid}`, dirC);
    const recC0 = row(core, c.id);
    await delay(3_000);
    await killOwn(recC0.tmuxName);
    await waitForStatus(core, c.id, 'restorable', 30_000);
    // A wrap this build cannot take apart: `-c` is the last word, so there is
    // no command string after it to split.
    const unsplittable = [active.path, 'run', 'claude', '--silent', '-c'];
    core.manifest.updateSession(c.id, { resumeArgv: unsplittable });
    const restoredC = await core.restoreSession(c.id, { withoutCapture: true });
    const recC1 = row(core, c.id);
    const armFailure = recC1.restore?.armFailure;
    if (armFailure !== DECLINE_UNWRAP_FAILED) {
      fail(
        `the unhonourable decline recorded armFailure=${JSON.stringify(armFailure)}, ` +
          `not the sentence ${JSON.stringify(DECLINE_UNWRAP_FAILED)}`
      );
    }
    if (recC1.specstory?.enabled !== true) {
      fail(
        `the unhonourable decline changed C's capture setting to ` +
          `${JSON.stringify(recC1.specstory?.enabled)}`
      );
    }
    if ((recC1.resumeArgv ?? []).join(' ') !== unsplittable.join(' ')) {
      fail(
        `the unhonourable decline rewrote C's resume argv to ` +
          `${JSON.stringify(recC1.resumeArgv)}`
      );
    }
    const liveC = await liveIdFor(restoredC.tmuxName);
    if (liveC !== null) {
      const tailC = await paneTail(liveC);
      if (tailC.includes(active.path)) {
        fail(
          `the unhonourable decline armed the wrapper it was asked to avoid: ${tailC}`
        );
      }
    }
    smokeLog(
      '9/10 a decline that could not be honoured armed nothing, returned the ' +
        'failure sentence, and left the capture setting at true'
    );

    // --- 10. clean up ---------------------------------------------------------
    for (const id of [a.id, c.id]) {
      const rec = core.listSessionRecords().find((r) => r.id === id);
      if (rec === undefined) continue;
      if (rec.status !== 'exited' && rec.status !== 'restorable') {
        await core.killSession(id).catch(() => undefined);
      }
      await killOwn(rec.tmuxName).catch(() => undefined);
      core.discardSession(id);
    }
    for (const live of await tmux.listSessions().catch(() => [])) {
      if (!live.tmuxName.startsWith(PREFIX)) continue;
      await tmux.killSession(live.sessionId).catch(() => undefined);
    }
    const leftovers = (await tmux.listSessions().catch(() => [])).length;
    if (leftovers !== 0) {
      fail(`${leftovers} sessions are still on the harness socket at the end`);
    }
    await core.captureSyncsIdle().catch(() => undefined);
    await shutdownGmuxCore();
    await teardownHarnessServer();
    smokeLog(
      '10/10 PASS (restore-bare) — a declined restore arms the bare command ' +
        'and sticks, the ordinary restore is unchanged, a declined restart is ' +
        'bare from birth, and a decline that cannot be honoured arms nothing'
    );
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  } finally {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  }
}
