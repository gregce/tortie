/**
 * drive-p342.mts — the shipping-module half of `npm run measure:p342` (Phase
 * 342, build/p342/SPEC.md §7.4).
 *
 * IT IS RUN BY `build/p342/measure-p342.mjs` and never by hand. The
 * orchestrator makes the throwaway Linux machines through build/docker-run.mjs,
 * writes ONE ssh stand-in per machine (the helper's `writeSshStandIn`, which
 * hands only its LAST argument to `/bin/sh -c` inside that one container, as
 * an account Tortie made there, the way sshd runs a no-pty command), and spawns
 * this file through `tsxCli()` with that stand-in named by `P342_SSH`. So every
 * far string below is the SHIPPING composer's, through the SHIPPING exec plane
 * and control client, onto a real distribution's own tmux, and this file never
 * names the container program: only the helper may (gate:docker).
 *
 * MODES (`P342_MODE`):
 *   emit   print the shipping facts the orchestrator's own arms need, from
 *          `src/` byte for byte: the twelve rows and their argv, the list
 *          format, the control child's argv, the phone's key names and the
 *          version rows. Starts nothing.
 *   row    drive ONE machine (`P342_ROW`, `P342_RUN` its scratch):
 *            prepare  `readRemoteTmuxVersion` (the program's `-V`, no server
 *                     yet), then `ensureRemoteServer` with that version, born,
 *                     and again warm, so D6's reader meets that version's real
 *                     refusal words and D9's re-read meets a real server.
 *            list     a session stamped with `$` values (D13), listed with
 *                     REMOTE_LIST_FORMAT and read by `parseRemoteListLine`, and
 *                     by `undoDollarEscape` exactly when the version's row
 *                     carries `dollarOnRead`.
 *            control  the shipping `TmuxControlClient` over
 *                     `remoteControlTransport` (its precheck and gate
 *                     included): the greeting, the list over the connection
 *                     against the same list over the exec plane, the scroll
 *                     shapes through the shipping scroll.ts over a runner on
 *                     `sendCommand` (a machine's runner, so the entry carries
 *                     `-H`, D11) with every argv asked of the carriage's table,
 *                     and the 35 key names the phone may send.
 *            attach   the shipping attach plan's far command, run in an outer
 *                     tmux of the probe's own inside that machine, beside a
 *                     decoy: `=$N` must attach the right session (§Attack M-A5).
 *
 * IT PRINTS ONE LINE OF JSON, its last, beginning `{"id":"p342-drive"`.
 *
 * WHAT IT NEVER DOES. No Electron, no real ssh, no network but the stand-in's
 * own docker exec. It reads no server of the operator's: the server it starts
 * is on the scratch socket `p342drv` INSIDE the container, which the
 * orchestrator ends after this file exits. Every control client it starts is
 * stopped in a `finally`.
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.env['P342_ROOT'] ?? process.cwd();
const MODE = process.env['P342_MODE'] ?? '';
const M = `${ROOT}/src/main`;

const out: Record<string, unknown> = { id: 'p342-drive', mode: MODE };
const say = (line: string): void => {
  process.stderr.write(`[p342-drive] ${line}\n`);
};

const tryAsync = async <T>(f: () => Promise<T>): Promise<{ value: T | null; threw: string | null }> => {
  try {
    return { value: await f(), threw: null };
  } catch (err) {
    return { value: null, threw: err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 600) : String(err) };
  }
};

if (MODE === 'emit') {
  const options = await import(`${M}/tmux/server-options.ts`);
  const version = await import(`${M}/tmux/version.ts`);
  const sessions = await import(`${M}/machines/remote-sessions.ts`);
  const client = await import(`${M}/tmux/control-client.ts`);
  const pocket = await import(`${ROOT}/src/shared/ipc/pocket.ts`).catch(() => null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (options.SERVER_OPTIONS as any[]).map((r) => ({
    name: r.name,
    scope: r.scope,
    value: r.value,
    argv: options.setOptionArgs(r, r.value),
    show: options.showOptionArgs(r)
  }));
  out['serverOptions'] = rows;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  out['bootOrder'] = (options.remoteBootOptions() as any[]).map((r) => r.name);
  out['listFormat'] = sessions.REMOTE_LIST_FORMAT;
  out['controlArgs'] = [...client.CONTROL_ATTACH_ARGS];
  out['keyNames'] = pocket === null ? null : [...(pocket.POCKET_SCREEN_KEY_NAMES ?? [])];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  out['tested'] = (version.TESTED_REMOTE_TMUX_VERSIONS as any[]).map((r) => ({
    version: r.version,
    measured: r.measured,
    programs: r.programs ?? null,
    lacks: r.lacks ?? null,
    quirks: r.quirks ?? null
  }));
  process.stdout.write(`${JSON.stringify(out)}\n`);
  process.exit(0);
}

if (MODE !== 'row') {
  process.stderr.write('drive-p342: P342_MODE is emit or row\n');
  process.exit(2);
}

const SSH = process.env['P342_SSH'];
const RUN = process.env['P342_RUN'];
const ROW = process.env['P342_ROW'];
if (SSH === undefined || RUN === undefined || ROW === undefined) {
  process.stderr.write('drive-p342: P342_SSH, P342_RUN and P342_ROW are all required in row mode\n');
  process.exit(2);
}
mkdirSync(RUN, { recursive: true });
const trace = (line: string): void => {
  appendFileSync(join(RUN, 'drive.log'), `${line}\n`);
};

const ctxMod = await import(`${M}/machines/context.ts`);
const { execOn } = await import(`${M}/machines/exec-plane.ts`);
const { readRemoteTmuxVersion } = await import(`${M}/machines/prepare.ts`);
const { ensureRemoteServer } = await import(`${M}/machines/remote-server.ts`);
const leaf = await import(`${M}/machines/far-tmux.ts`);
const sessionsMod = await import(`${M}/machines/remote-sessions.ts`);
const planeMod = await import(`${M}/machines/control-plane.ts`);
const clientMod = await import(`${M}/tmux/control-client.ts`);
const scrollMod = await import(`${M}/tmux/scroll.ts`);
const shapesMod = await import(`${M}/machines/scroll-shapes.ts`);
const planMod = await import(`${M}/attach/attach-plan.ts`);
const pocket = await import(`${ROOT}/src/shared/ipc/pocket.ts`).catch(() => null);

const machineId = `p342-${ROW}`;
const SOCKET = 'p342drv';
const ctx = ctxMod.registerRemoteMachineContext({
  kind: 'remote',
  machineId,
  sshBin: SSH,
  host: `p342-${ROW}.invalid`,
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: SOCKET,
  controlPath: `${RUN}/cp-${ROW}-%C`,
  hostKeys: { tortie: `${RUN}/kh-tortie`, user: `${RUN}/kh-user` },
  acceptedTmuxVersion: null,
  label: null,
  identityFile: null
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clients: any[] = [];
try {
  // --- prepare ---------------------------------------------------------------
  const read = await tryAsync(() => readRemoteTmuxVersion(ctx));
  out['read'] = read.value ?? { threw: read.threw };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const version: string | null = (read.value as any)?.kind === 'version' ? (read.value as any).version : null;
  leaf.noteFarServerVersion(machineId, version);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shape = (r: any) =>
    r === null
      ? null
      : {
          born: r.born,
          options: (r.options ?? []).map((o: { name: string; agrees: boolean; observed: string }) => ({ name: o.name, agrees: o.agrees, observed: o.observed })),
          disagreed: (r.disagreed ?? []).length,
          refused: r.refused ?? null
        };
  const first = await tryAsync(() => ensureRemoteServer(ctx, version === null ? {} : { version }));
  out['born'] = first.value === null ? { threw: first.threw } : shape(first.value);
  out['bornNoted'] = leaf.farServerVersion(machineId);
  out['bornPair'] = leaf.farPairOf(machineId);
  const warm = await tryAsync(() => ensureRemoteServer(ctx, {}));
  out['warm'] = warm.value === null ? { threw: warm.threw } : shape(warm.value);
  trace(`prepare: read ${JSON.stringify(out['read'])}`);

  // --- list ------------------------------------------------------------------
  const row = leaf.farServerRow(machineId);
  const dollarOnRead = row?.quirks?.dollarOnRead === true;
  out['dollarOnRead'] = dollarOnRead;
  const stamps = { name: '$HOME notes', project: 'cost $d' };
  const created = await tryAsync(async () =>
    (
      await execOn(ctx, ['new-session', '-d', '-P', '-F', '#{session_id}', '-s', 'p342-list', '-c', '/tmp/p342 $d', '--', '/bin/sh'])
    ).trim()
  );
  const sid = created.value;
  out['listCreated'] = sid ?? { threw: created.threw };
  if (sid !== null) {
    for (const [key, value] of [
      ['@gmux-id', 'p342-session-1'],
      ['@gmux-agent', 'shell'],
      ['@gmux-name', stamps.name],
      ['@gmux-project', stamps.project]
    ] as const) {
      await tryAsync(() => execOn(ctx, ['set-option', '-t', sid, key, value]));
    }
    const listed = await tryAsync(() => execOn(ctx, ['list-sessions', '-F', sessionsMod.REMOTE_LIST_FORMAT]));
    const lines = (listed.value ?? '').split('\n').filter((l: string) => l.length > 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = lines.map((l: string) => sessionsMod.parseRemoteListLine(l)).filter((r: any) => r !== null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mine = parsed.find((r: any) => r.tmuxId === sid) ?? null;
    const read3 = (field: string) => (dollarOnRead ? sessionsMod.undoDollarEscape(field) : field);
    out['list'] = {
      lines: lines.length,
      fields: lines.map((l: string) => l.split(' ').length),
      raw: mine === null ? null : { name: mine.name, projectPath: mine.projectPath, cwd: mine.cwd },
      read: mine === null ? null : { name: read3(mine.name), projectPath: read3(mine.projectPath), cwd: read3(mine.cwd) },
      wanted: { name: stamps.name, projectPath: stamps.project, cwd: '/tmp/p342 $d' }
    };
  }

  // --- control ---------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = new clientMod.TmuxControlClient(planeMod.remoteControlTransport(machineId));
  clients.push(client);
  client.on('error', () => undefined);
  const t0 = Date.now();
  const connected = new Promise<number>((resolve) => client.once('connected', () => resolve(Date.now() - t0)));
  const started = await tryAsync(() => client.start());
  const greetMs = started.threw !== null ? 'refused' : await Promise.race([connected, new Promise<'hung'>((r) => setTimeout(() => r('hung'), 12_000))]);
  out['control'] = { greetMs, refusal: started.threw };
  if (typeof greetMs === 'number') {
    const overControl = await tryAsync(async () => (await client.sendCommand(`list-sessions -F '${sessionsMod.REMOTE_LIST_FORMAT}'`)).join('\n'));
    const overExec = await tryAsync(() => execOn(ctx, ['list-sessions', '-F', sessionsMod.REMOTE_LIST_FORMAT]));
    const idsOf = (text: string | null) =>
      (text ?? '')
        .split('\n')
        .filter((l) => l.length > 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((l) => sessionsMod.parseRemoteListLine(l) as any)
        .filter((r) => r !== null)
        .map((r) => `${String(r.tmuxId)} ${String(r.tmuxName)} ${String(r.gmuxId)} ${String(r.name)}`)
        .sort();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (out['control'] as any).listAgrees = JSON.stringify(idsOf(overControl.value)) === JSON.stringify(idsOf(overExec.value ?? null));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (out['control'] as any).listOverControl = idsOf(overControl.value);

    // Scroll: a session with history, a machine's runner on sendCommand.
    const scrollSid = (
      await execOn(ctx, ['new-session', '-d', '-P', '-F', '#{session_id}', '-s', 'p342-scroll', '-x', '80', '-y', '24', '--', '/bin/sh', '-c', 'seq 1 3000; exec sleep 7200'])
    ).trim();
    await new Promise((r) => setTimeout(r, 1200));
    const calls: { args: string[]; verdict: unknown }[] = [];
    const runner = Object.assign(
      async (args: readonly string[]): Promise<string> => {
        calls.push({ args: [...args], verdict: shapesMod.admitScrollArgv(args) });
        const line = args.map((a: string) => clientMod.quoteTmuxArg(a)).join(' ');
        return (await client.sendCommand(line)).join('\n');
      },
      { server: machineId, ordered: true }
    );
    const steps: Record<string, unknown> = {};
    steps['live'] = (await tryAsync(() => scrollMod.readPaneScroll(runner, scrollSid))).value;
    steps['back30'] = await tryAsync(() => scrollMod.scrollPaneBy(runner, scrollSid, 30));
    steps['to1500'] = await tryAsync(() => scrollMod.scrollPaneTo(runner, scrollSid, 1500));
    steps['exit'] = await tryAsync(() => scrollMod.exitPaneScroll(runner, scrollSid));
    steps['after'] = (await tryAsync(() => scrollMod.readPaneScroll(runner, scrollSid))).value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (out['control'] as any).scroll = {
      steps,
      calls: calls.map((c) => ({ args: c.args, verdict: c.verdict })),
      entries: calls.filter((c) => c.args[0] === 'copy-mode').map((c) => c.args)
    };

    // The 35 key names, into a pane that only reads.
    const keySid = (
      await execOn(ctx, ['new-session', '-d', '-P', '-F', '#{session_id}', '-s', 'p342-keys', '--', '/bin/sh', '-c', 'stty raw -echo; exec cat > /dev/null'])
    ).trim();
    await new Promise((r) => setTimeout(r, 600));
    const names: string[] = pocket === null ? [] : [...(pocket.POCKET_SCREEN_KEY_NAMES ?? [])];
    const keyRefused: { name: string; threw: string }[] = [];
    for (const name of names) {
      const sent = await tryAsync(() => client.sendCommand(`send-keys -t ${keySid} ${name}`));
      if (sent.threw !== null) keyRefused.push({ name, threw: sent.threw });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (out['control'] as any).keys = { sent: names.length, refused: keyRefused };
  }

  // --- attach ----------------------------------------------------------------
  // The shipping plan's far command, inside an outer tmux of this file's own
  // (socket p342ao) in that machine, beside a decoy.
  const targetSid = (await tryAsync(async () => (await execOn(ctx, ['new-session', '-d', '-P', '-F', '#{session_id}', '-s', 'a b', '--', '/bin/sh'])).trim())).value;
  await tryAsync(() => execOn(ctx, ['new-session', '-d', '-s', 'decoy', '--', '/bin/sh']));
  if (targetSid !== null) {
    const plan = planMod.attachPlan({ kind: 'remote', ctx, tmuxName: targetSid });
    const far = String(plan.argv[plan.argv.length - 1] ?? '');
    const quote = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;
    const cmd = `tmux -L p342ao -f /dev/null kill-server >/dev/null 2>&1; tmux -L p342ao -f /dev/null new-session -d -x 80 -y 24 -s outer ${quote(`env -u TMUX TERM=xterm-256color ${far}`)}`;
    const r = spawnSync(SSH, [cmd], { encoding: 'utf8', timeout: 30_000 });
    await new Promise((res) => setTimeout(res, 1500));
    const attached = await tryAsync(async () => (await execOn(ctx, ['display-message', '-p', '-t', targetSid, '#{session_attached}'])).trim());
    // The decoy's count read from the list by its name, which answers for
    // every session at once: a display aimed at `=decoy` read an empty answer
    // on every version, and an empty answer proved nothing either way.
    const decoy = await tryAsync(async () => {
      const listed = await execOn(ctx, ['list-sessions', '-F', '#{session_attached} #{session_name}']);
      const line = listed.split('\n').find((l) => l.endsWith(' decoy'));
      return line === undefined ? 'absent' : (line.split(' ')[0] ?? '');
    });
    spawnSync(SSH, ['tmux -L p342ao -f /dev/null kill-server >/dev/null 2>&1; true'], { encoding: 'utf8', timeout: 30_000 });
    out['attach'] = { target: targetSid, far, outerStatus: r.status, attached: attached.value, decoyAttached: decoy.value, threw: attached.threw ?? decoy.threw };
  }
} catch (err) {
  out['threw'] = err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 800) : String(err);
  say(`threw: ${String(out['threw'])}`);
} finally {
  for (const c of clients) {
    try {
      c.stop();
    } catch {
      /* stopped */
    }
  }
  try {
    planeMod.closeEveryControlPlane?.();
  } catch {
    /* none open */
  }
}

process.stdout.write(`${JSON.stringify(out)}\n`);
process.exit(0);
