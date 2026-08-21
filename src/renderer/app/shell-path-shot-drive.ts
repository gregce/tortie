/**
 * Harness only driver for the login shell PATH gate (Phase 81 verification).
 *
 * Driven from the GMUX_SHOT_DRIVE spec (`shellPath: {…}`) and inert
 * otherwise. It exists because the four claims this phase makes are about
 * WHEN things happen, and no screenshot and no unit test can see a moment.
 *
 * THE CLAIMS IT MEASURES.
 *
 *  1. The session list arrives before the login shell answers. The probe
 *     makes the shell slow on purpose, so the two moments are far apart and
 *     the order between them is readable rather than inferred.
 *  2. A restore started before the shell answers still gets the captured
 *     PATH. This driver starts that restore on purpose, early, which is what
 *     puts main's own wait under test rather than the renderer's.
 *  3. Every Restore control is disabled and carries its sentence while the
 *     flag is false, and none of them is after it flips.
 *  4. A create started in the same window does not resolve before the shell
 *     answers.
 *
 * THE TWO HALVES, and the reason they are separate. `armShellPathProbe()`
 * runs at module load, which is the only moment early enough to see the
 * session list arrive. It takes four timestamps and nothing else. The rest is
 * `driveShellPath`, which main calls through the shot hook and which is where
 * every side effect lives.
 *
 * WHAT THE ARM COSTS A REAL RUN. One `Date.now()`, one assignment on
 * `window`, and one store subscription that removes itself as soon as the
 * first session list has arrived. It sends nothing, reads no bridge and
 * draws nothing.
 *
 * Findings go to `console.log`, which GMUX_SHOT_VERBOSE=1 tees into the
 * harness output, and to `window.__gmuxShellPathProbe`, which GMUX_SHOT_JS
 * can read back.
 */

import { useApp } from '../state/store';
import { gmuxBridge } from '../bridge';

/** What the harness asks this driver to do. */
export interface ShellPathProbeSpec {
  /** Wait this long after the drive starts before the verbs are called. */
  armMs?: number;
  /** Restore this many restorable rows, oldest row first. 0 restores none. */
  restore?: number;
  /** Create one session with this agent and name, at the same moment. */
  create?: { agent: string; name: string; args?: string[] };
  /** Launch flags every prepared session takes, and keeps through a restore. */
  prepareArgs?: string[];
  /** How often the Restore controls are read out of the document. */
  pollMs?: number;
  /** Stop reading and report after this long. */
  runMs?: number;
  /**
   * Prep only. Create this many shell sessions, wait for them, and report
   * nothing else.
   *
   * The probe needs restorable rows, and the only honest way to get them is
   * to make real sessions and then end their tmux sessions from outside. This
   * is the first half of that.
   */
  prepare?: number;
}

/** One reading of one Restore control in the document. */
export interface ControlSample {
  /** Which control, by the class the shipped markup gives it. */
  label: string;
  disabled: boolean;
  title: string;
  /** Milliseconds since the module was armed. */
  tMs: number;
}

/** What one verb did, and when. */
export interface VerbReport {
  name: string;
  /** Milliseconds since the module was armed, at the call. */
  startedMs: number;
  /** Milliseconds since the module was armed, at the answer. */
  settledMs: number;
  ok: boolean;
  detail: string;
}

/** Everything the run measured. */
export interface ShellPathProbeReport {
  /** `Date.now()` when this module was evaluated. Every tMs is from here. */
  armedAtEpochMs: number;
  /**
   * When the store first held main's session list, in milliseconds since the
   * module was armed.
   *
   * The moment measured is `ready`, which `hydrateAppState` sets after
   * `sessions:list` and `projects:list` have both answered. A profile with no
   * sessions in it reaches that moment with an empty list, which is still the
   * moment the window stops being blank, so the number means the same thing
   * on a fresh profile as on a full one. Null when the boot never got there.
   */
  listMs: number | null;
  /** When `shellPathReady` first read true. Null on a build without it. */
  shellReadyMs: number | null;
  /** True when this build's store carries a `shellPathReady` field at all. */
  hasFlag: boolean;
  /** An own read of the three channels the phase says must not wait. */
  reads: VerbReport[];
  /** The restores and the create. */
  verbs: VerbReport[];
  /** Every reading of every Restore control. */
  controls: ControlSample[];
  /** The session ids this run restored, for the probe to read panes from. */
  restoredIds: string[];
}

const armedAtEpochMs = Date.now();

const report: ShellPathProbeReport = {
  armedAtEpochMs,
  listMs: null,
  shellReadyMs: null,
  hasFlag: false,
  reads: [],
  verbs: [],
  controls: [],
  restoredIds: []
};

const sinceArm = (): number => Date.now() - armedAtEpochMs;

interface ProbeWindow extends Window {
  __gmuxShellPathProbe?: ShellPathProbeReport;
}

/**
 * Take the two boot timestamps. Called at module load from App.tsx, because
 * the moment the session list arrives is over before any drive can start.
 *
 * The subscription removes itself as soon as it has both answers, so a real
 * run carries it for about one second and then carries nothing.
 */
export function armShellPathProbe(): void {
  const w = window as ProbeWindow;
  w.__gmuxShellPathProbe = report;
  const read = (state: unknown): void => {
    const s = state as { ready?: boolean; shellPathReady?: boolean };
    if (typeof s.shellPathReady === 'boolean') report.hasFlag = true;
    if (report.listMs === null && s.ready === true) {
      report.listMs = sinceArm();
    }
    if (report.shellReadyMs === null && s.shellPathReady === true) {
      report.shellReadyMs = sinceArm();
    }
  };
  read(useApp.getState());
  const stop = useApp.subscribe((state) => {
    read(state);
    // A build with the flag needs both answers. A build without it needs one.
    const done =
      report.listMs !== null &&
      (!report.hasFlag || report.shellReadyMs !== null);
    if (done) stop();
  });
}

/** Every Restore control the shipped markup draws, by its own class. */
const CONTROL_SELECTORS: Array<[label: string, selector: string]> = [
  ['restore-all', '.restore-strip .btn-restore'],
  ['session-card', '.empty-actions .btn-primary'],
  ['split-leaf', '.split-state-actions .btn-primary'],
  ['past-row', '.past-restore']
];

function sampleControls(): void {
  for (const [label, selector] of CONTROL_SELECTORS) {
    for (const node of Array.from(document.querySelectorAll(selector))) {
      const el = node as HTMLButtonElement;
      if (!/^Restore/.test(el.textContent ?? '')) continue;
      report.controls.push({
        label,
        disabled: el.disabled,
        title: el.title,
        tMs: sinceArm()
      });
    }
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function timed(
  name: string,
  run: () => Promise<string>
): Promise<VerbReport> {
  const startedMs = sinceArm();
  try {
    const detail = await run();
    const row: VerbReport = {
      name,
      startedMs,
      settledMs: sinceArm(),
      ok: true,
      detail
    };
    report.verbs.push(row);
    return row;
  } catch (err) {
    const row: VerbReport = {
      name,
      startedMs,
      settledMs: sinceArm(),
      ok: false,
      detail: String(err)
    };
    report.verbs.push(row);
    return row;
  }
}

/**
 * Run one measurement. Main calls this through the shot hook.
 *
 * The verbs are called through `window.gmux` rather than through the store,
 * on purpose. The renderer gate is the thing under test, and a driver that
 * went through the store's own actions would be testing the driver's patience
 * instead of main's wait.
 */
export async function driveShellPath(spec: ShellPathProbeSpec): Promise<void> {
  const pollMs = spec.pollMs ?? 100;
  const runMs = spec.runMs ?? 20_000;
  const gmux = gmuxBridge();
  console.log(`[shell-path-probe] arming, ${String(sinceArm())} ms since load`);

  if (spec.prepare !== undefined && spec.prepare > 0) {
    const project = useApp.getState().activeProject();
    if (project) {
      for (let i = 1; i <= spec.prepare; i++) {
        await timed(`prepare:p81-${String(i)}`, async () => {
          const made = await gmux!.sessions.create({
            name: `p81-${String(i)}`,
            projectPath: project.path,
            agent: 'shell',
            cwd: project.path,
            ...(spec.prepareArgs !== undefined
              ? { extraArgs: spec.prepareArgs }
              : {})
          });
          return `${made.id} ${made.status}`;
        });
      }
    }
    await wait(2_000);
    console.log(`[shell-path-probe] result ${JSON.stringify(report)}`);
    return;
  }

  const poll = setInterval(sampleControls, pollMs);
  sampleControls();

  // The three reads the phase says must not wait for the shell. Started at
  // once, and each one is its own row so a slow one cannot hide behind a fast
  // one.
  if (gmux) {
    void timedRead('sessions:list', async () => {
      const list = await gmux.sessions.list();
      return `${String(list.length)} sessions`;
    });
    void timedRead('projects:list', async () => {
      const list = await gmux.projects.list();
      return `${String(list.length)} projects`;
    });
  }

  await wait(spec.armMs ?? 300);

  const restorable = useApp
    .getState()
    .sessions.filter((x) => x.status === 'restorable' && x.machine === undefined);
  const wanted = restorable.slice(0, spec.restore ?? 0);
  const extras = gmux ? gmux.sessions : null;
  const pending: Array<Promise<unknown>> = [];
  for (const row of wanted) {
    if (extras?.restore === undefined) break;
    const restore = extras.restore.bind(extras);
    report.restoredIds.push(row.id);
    pending.push(
      timed(`restore:${row.name}`, async () => {
        const back = await restore(row.id);
        return `${back.id} ${back.status}`;
      })
    );
  }

  if (spec.create !== undefined && gmux) {
    const project = useApp.getState().activeProject();
    const created = spec.create;
    if (project) {
      pending.push(
        timed(`create:${created.name}`, async () => {
          const session = await gmux.sessions.create({
            name: created.name,
            projectPath: project.path,
            agent: created.agent as 'shell',
            cwd: project.path,
            ...(created.args !== undefined ? { extraArgs: created.args } : {})
          });
          report.restoredIds.push(session.id);
          return `${session.id} ${session.status}`;
        })
      );
    }
  }

  // An attach can only be measured against a pane that already exists, so it
  // runs after the first restore has answered and is reported as its own row.
  await Promise.all(pending);
  const live = useApp
    .getState()
    .sessions.find((x) => x.status === 'running' && x.machine === undefined);
  if (live !== undefined && gmux) {
    await timedRead('sessions:attach', async () => {
      await gmux.sessions.attach(live.id);
      return live.id;
    });
  }

  const deadline = Date.now() + runMs;
  while (Date.now() < deadline && report.shellReadyMs === null) {
    await wait(pollMs);
  }
  await wait(1_000);
  sampleControls();
  clearInterval(poll);
  console.log(`[shell-path-probe] result ${JSON.stringify(report)}`);
}

/** The same timing wrapper, for the reads. They land in their own list. */
async function timedRead(
  name: string,
  run: () => Promise<string>
): Promise<void> {
  const startedMs = sinceArm();
  try {
    const detail = await run();
    report.reads.push({
      name,
      startedMs,
      settledMs: sinceArm(),
      ok: true,
      detail
    });
  } catch (err) {
    report.reads.push({
      name,
      startedMs,
      settledMs: sinceArm(),
      ok: false,
      detail: String(err)
    });
  }
}
