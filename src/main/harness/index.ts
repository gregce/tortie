/**
 * The harness dispatch (Phase 42 stage 3, moved out of src/main/index.ts).
 *
 * Harnesses (all exit the process; parsed by CI / the orchestrator):
 *  - GMUX_SMOKE=basic   window + native modules + private tmux reachability
 *  - GMUX_SMOKE=create  create durable 'smoke-keeper' session, assert term
 *                       bytes arrive in main, exit LEAVING IT RUNNING
 *  - GMUX_SMOKE=verify  assert smoke-keeper survived (tmux ls + manifest),
 *                       re-attach, receive bytes, kill it, exit 0
 *    (create → verify across two processes = the P1/T1 restart acceptance test)
 *  - GMUX_SMOKE=migrate the gmux -> Tortie userData migration, against a
 *                       POPULATED fixture and real live tmux sessions: rows,
 *                       settings, hotkeys, tip flags, snapshots, adoption from
 *                       the migrated manifest, and the captured session whose
 *                       recorded specstory bin the rename kills (Phase 16.5a)
 *  - GMUX_SMOKE=capture-remote  a session on another machine is not captured,
 *                       and a person is told so (Phase 91). Ten steps against a
 *                       real scratch machine: a create that asks for capture
 *                       RESOLVES, its manifest row records none, exactly one
 *                       declined notice reaches a renderer through the real
 *                       preload with the sentence byte for byte, the far side
 *                       has no .specstory folder, a create that asked for
 *                       nothing is told nothing, the create sheet draws the
 *                       Capture row off with its reason, and the far side loses
 *                       exactly the sessions this run made. Isolated profile AND
 *                       isolated socket, and it refuses the real socket by name
 *                       because the far side of its connection is this same Mac.
 *                       `npm run smoke:capture:remote`.
 *  - GMUX_SMOKE=p156-menus  the application menu and the tray menu, walked out
 *    of the real Menu.getApplicationMenu() after the real installAppMenu() ran,
 *    with every row's label, accelerator, icon size and template flag. It
 *    photographs nothing, because a native macOS menu cannot be read or
 *    photographed from outside the app (Phases 119, 152 and 153 each measured
 *    it). `npm run probe:p156`.
 *
 *  - GMUX_SMOKE=identity  sessions bind by @gmux-id, never by name: external
 *                       rename, a foreign session squatting the freed name,
 *                       kill, stale-row reconcile, pane markers, and an
 *                       external SIGTERM recorded as a signal (Phase 12.7)
 *  - GMUX_SMOKE=conformance-resume  the per-agent RESUME CONFORMANCE matrix
 *                       (Phase 13.5): for every installed agent, create →
 *                       plant a nonce turn → assert gmux captured the id →
 *                       kill out-of-band → restore → prove the conversation
 *                       came back. `npm run conformance:resume`; the harness
 *                       itself is src/main/conformance/resume.ts.
 *  - GMUX_SMOKE=fault-work / fault-survey  the general fault harness (Phase
 *                       19 item 1). The work phase builds durable state and is
 *                       SIGKILLed part way through it; the survey phase
 *                       relaunches and reports what survived as JSON. Both run
 *                       under an isolated profile AND an isolated tmux socket,
 *                       and refuse to start without both. Driven by
 *                       build/fault-harness.mjs — `npm run smoke:fault`.
 *  - GMUX_SMOKE=power   the sleep and wake handlers (Phase 19 item 11): a real
 *                       session, a real snapshot on disk and a real renderer
 *                       subscribing through the real preload. The two macOS
 *                       events are injected, because the only way to make
 *                       macOS send them is to sleep a machine holding live
 *                       agent work. `npm run smoke:power`.
 *  - GMUX_SMOKE=reconstruct  rebuilding a lost session list from the snapshot
 *                       capsules and the identity stamps on live tmux sessions
 *                       (Phase 20 item 5). Creates two managed sessions and one
 *                       session carrying no identity, surveys, applies, and
 *                       asserts the foreign session was never a candidate and
 *                       the live manifest never changed. Isolated profile AND
 *                       isolated socket, refused without both.
 *                       `npm run smoke:reconstruct`.
 *  - GMUX_SMOKE=config  the configuration confirm gate (Phase 23), driven
 *                       against the real OS keychain and real forged records on
 *                       disk. Nine refusals and two confirmations, and no
 *                       process is started at any point. Isolated profile AND
 *                       isolated socket, refused without both.
 *                       `npm run smoke:config`.
 *  - GMUX_SMOKE=machines  the machine confirm gate (Phase 68), driven against
 *                       the real OS keychain and a real forged record on disk.
 *                       Twelve steps, and the last one asserts that a boot with
 *                       a confirmed machine in the file started ZERO ssh
 *                       processes, counted twice. Isolated profile AND isolated
 *                       socket, refused without both, reusing GMUX_CONFIG_ROOT
 *                       rather than adding a third variable.
 *                       `npm run smoke:machines`.
 *  - GMUX_SMOKE=exec-plane  the exec plane (Phase 69): an unconfirmed machine
 *                       refusing Prepare against the real keychain, a real
 *                       prepare twice over a scratch connection, and all three
 *                       exec plane refusals fired from the bundle, two of them
 *                       with a synthetic ledger row because production cannot
 *                       reach them. Isolated profile AND isolated socket, and it
 *                       refuses the real socket BY NAME because the far side of
 *                       its connection is this same Mac.
 *                       `npm run smoke:execplane`.
 *  - GMUX_SMOKE=p93-remote-clear a session on a machine outlives its tab and
 *                                is still ended by id (Phase 93)
 *  - GMUX_SMOKE=remote-sessions  create, list, rename and end a session on a
 *                       machine (Phase 70), in the shipped bundle against a
 *                       scratch sshd. Eleven steps: four refusals that start
 *                       zero processes, a create whose four stamps and two
 *                       environment variables are read back byte for byte, a
 *                       poll, a rename, an unbound kill that sends nothing, a
 *                       bound kill, the restore refusal, and a manifest write
 *                       count of zero across all of it. Isolated profile AND
 *                       isolated socket, and it refuses the real socket by name
 *                       for the same reason the exec plane smoke does.
 *                       `npm run smoke:remote`.
 *  - GMUX_SMOKE=partition  what Tortie says while the link to a machine is cut
 *                       (Phase 71). Five named moments: while a list is in the
 *                       air, between a create and its identity stamp, while a
 *                       terminal is attached and receiving bytes, while the
 *                       connection is connected and idle, and on the way back.
 *                       The scratch sshd belongs to the supervisor, which is
 *                       the only thing that kills it. This process asks for the
 *                       cut and samples every status at 250 ms, and the
 *                       supervisor reads those samples and decides the verdict,
 *                       so the thing being measured never grades itself.
 *                       Isolated profile AND isolated socket, and it refuses
 *                       the real socket by name for the same reason the two
 *                       above do. `npm run smoke:partition`.
 *  - GMUX_SMOKE=remote-matrix  the ten row fault matrix (Phase 72). Research
 *                       28 section 6.3's ten ways working on another machine
 *                       goes wrong, run against a real app holding real
 *                       connections to two scratch machines. It is the GATE on
 *                       remote restore rather than a report: research 51
 *                       section 6 requires all ten green before Tortie brings
 *                       back a session that lives on a machine. Four launches,
 *                       because two of the rows are about what a launch finds
 *                       rather than about what a running app does, and the
 *                       carriage file says which leg each launch is. This
 *                       process writes facts and never grades itself.
 *                       Isolated profile AND isolated socket, and it refuses
 *                       the real socket by name for the same reason the four
 *                       above do. `npm run smoke:matrix`.
 *  - GMUX_SMOKE=quit    the REAL app.quit() under a saturated uv threadpool
 *                       (Phase 36). Every other harness ends with app.exit,
 *                       which skips before-quit and FreeEnvironment — the
 *                       exact stretch where a fire-and-forget watcher
 *                       unsubscribe turns quit into a SIGABRT. Boots the
 *                       core, proves the agents.json watcher is live, queues
 *                       8 slow pbkdf2 jobs, quits for real. The process exit
 *                       code is the verdict: 0 is the pass, 134 is the bug.
 *                       When the first drain expires the quit logs the
 *                       leftover count, hides the window, and drains again
 *                       for up to 15 s, so a 0 with those lines is the
 *                       classified late quit. `npm run smoke:quit`.
 *  - GMUX_SMOKE=shutdown-refusal  the core fails closed once shutdown starts
 *                       (Phase 116, Tier 3). Holds the REAL shutdown inside
 *                       the snapshot pass, proves `getGmuxCore()` and a real
 *                       `createSession` are refused with the typed
 *                       SHUTTING_DOWN payload while manifest rows, tmux
 *                       sessions and pane pids stay unchanged, proves the
 *                       create admitted before shutdown resolved before the
 *                       snapshot, and proves a clean second boot in the same
 *                       process. `npm run smoke:shutdown`.
 *  - GMUX_SMOKE=quit-doors  every IPC door closes the moment quit starts
 *                       (Phase 144 stage 1, Tier 3). Starts the REAL quit
 *                       through the composition root, holds the shutdown
 *                       inside the snapshot pass, and drives four real
 *                       mutation handlers from the real renderer: all four
 *                       reject with the typed SHUTTING_DOWN payload, nothing
 *                       is written or spawned, and the create admitted before
 *                       quit still resolved. `npm run smoke:quitdoors`.
 *  - GMUX_SMOKE=p117-prep / p117-verify  a remote create whose answer was
 *                       lost keeps its row, and a later run binds the same
 *                       session (Phase 117, Tier 3). TWO launches against one
 *                       user data directory and one loopback scratch machine.
 *                       The prep leg runs a create the machine answers and
 *                       refuses, whose row is deleted as it always was, then a
 *                       create the far side really completes and whose reply is
 *                       really lost, because a program named as that machine's
 *                       remote tmux path ends the sign in server under the
 *                       answer. It proves the row survives with `unknown` in its
 *                       status column. The verify leg proves that declaration
 *                       survived the restart, that the row is shown and never
 *                       drawn as working, that Restore is refused with the
 *                       sentence naming the unconfirmed create, and that the
 *                       machine coming back binds the SAME id with no second
 *                       create. `npm run smoke:p117`.
 *  - GMUX_SMOKE=restore-bare  declining capture on restore (Phase 119, Tier 3).
 *                       Two real captured sessions in one app run. Session A
 *                       takes the declined path and B takes the ordinary one,
 *                       so the two answers are measured against the same
 *                       binary, the same manifest and the same tmux server.
 *                       Ten steps: the wrapped resume read back verbatim, an
 *                       out of band kill with the recorded binary still on
 *                       disk, a declined restore whose armed pane line names
 *                       no specstory, the durable flip on the row and the
 *                       projection, the person's one keypress with no wrapper
 *                       over the agent, the ORDINARY restore proved unchanged,
 *                       a declined restart that is bare from birth, and a
 *                       decline that cannot be honoured arming nothing.
 *                       Isolated profile AND isolated socket, refused without
 *                       both, and cloud sync forced off by the harness.
 *                       `npm run smoke:restore:bare`.
 *  - GMUX_SMOKE=p118-prep / p118-verify  a long running copy onto another
 *                       machine is owned, ended and written down, and a
 *                       machine removal is one transaction (Phase 118, Tier 3).
 *                       TWO launches against one user data directory and one
 *                       loopback scratch machine. The prep leg starts a copy
 *                       whose first git command really sleeps, so the ssh child
 *                       under it is alive for minutes, then runs the REAL quit
 *                       teardown, proves a later remote call is refused with
 *                       SHUTTING_DOWN, proves the ssh child is dead, and reads
 *                       the one unfinished row the manifest holds. The verify
 *                       leg proves the person is told once and never again,
 *                       then faults the removal transaction on row 3 of 5 and
 *                       compares the before and after fingerprints byte for
 *                       byte, then retries it, then removes a third time.
 *                       `npm run smoke:p118`.
 *  - GMUX_SMOKE=shadow  the bare-name invariant under a shadowed binary
 *                       (Phase 49, Tier 3): two scratch copies of `droid` are
 *                       planted at the head of a stubbed login-shell PATH, a
 *                       session is created, and the manifest row, the pane's
 *                       own printed $0, #{pane_start_command}, the collect-all
 *                       resolver and the scan's shadowed list are each
 *                       asserted. `npm run smoke:t3:shadow`.
 *  - GMUX_SMOKE=procid  what the OUTSIDE world sees of gmux (Phase 13.8):
 *                       app name, process.title, what `ps` prints, and the
 *                       gmux-owned process list (app + helpers + private tmux
 *                       server + sessions + strays). Read-only unless
 *                       GMUX_PROCID_REAP=1, which also runs the boot reap.
 *  - GMUX_SMOKE=shim    the `tortie` shell shim (Phase 51): install into a
 *                       fresh temp directory, byte-compare the content,
 *                       check mode 0755, remove, then prove remove refuses
 *                       a file without the ownership marker. Never touches
 *                       a real PATH directory.
 *  - GMUX_SHOT=<path>   capturePage after 3 s (GMUX_SHOT_DELAY_MS) → PNG → quit
 *                       (GMUX_SHOT_CAPTURE_OUT=<path> additionally writes the
 *                       image a DRIVEN capture produced — see shot-hook.ts;
 *                       GMUX_SHOT_JS=<expr> evaluates one expression in the
 *                       driven window and prints its JSON, so a verifier can
 *                       MEASURE the running app and not only photograph it)
 */

import type { BrowserWindow } from 'electron';
// Phase 23: the boot read of agents.json, awaited before a shot capture so
// the photograph shows a build that has opened the configuration file.
import { initAgentOverlay } from '../config/store';
import { runConfigConfirmSmoke } from '../config/confirm-smoke';
// Phase 68: the boot read of machines.json, awaited before a shot capture for
// the same reason the agents.json read is.
import { initMachines } from '../machines/store';
import { runResumeConformance } from '../conformance';
// LEAF import: ./fault/harness pulls in the session core, so it is imported
// directly rather than through ../fault, which production code imports.
import { runFaultSurvey, runFaultWork } from '../fault/harness';
// Phase 68: the machines confirm gate, and the second caller its six refusals
// need so the bundler cannot fold them away.
import { runMachinesSmoke } from '../machines/smoke';
// Phase 69: the exec plane, and the second caller its four refusals need. Two of
// them cannot be reached in production at all, so this harness drives them with a
// synthetic ledger row built at runtime.
import { runExecPlaneSmoke } from '../machines/exec-smoke';
// Phase 70: the four remote verbs, the poll and the two refusals this rung
// pins. It is the second caller `machine.restore-refused` and
// `machine.remote-target-unbound` need, and it counts manifest writes.
import { runRemoteSessionsSmoke } from '../machines/remote-smoke';
import { runP93RemoteClearSmoke } from './p93-remote-clear';
// Phase 117: the two legs of the lost create answer proof. LEAF import like
// ./p93-remote-clear, because it pulls in the session core.
import {
  runP117PrepSmoke,
  runP117VerifySmoke
} from './p117-create-unknown';
// Phase 118: the two legs of the long running ssh child proof and the removal
// transaction proof. LEAF import for the same reason ./p117-create-unknown is,
// because it pulls in the session core.
import {
  runP118PrepSmoke,
  runP118VerifySmoke
} from './p118-remote-children';
import { runMigrateSmoke } from '../migrate/smoke';
import { runReconstructSmoke } from '../manifest/reconstruct-smoke';
import { runRefusalSmoke } from '../manifest/refusal-smoke';
// Phase 19 item 11: the power smoke is a LEAF import for the same reason
// ../fault/harness is: it pulls in the session core, and going through
// ../power would make production code carry that edge.
import { runPowerSmoke } from '../power/smoke';
import { runSmokeAgent } from './agent';
import { runSmokeBasic } from './basic';
import { runSmokeCapture } from './capture';
// Phase 91: the refusal of capture on a session that runs on another machine.
// It is the second caller `machine.capture-never-on-another-machine` needs, and
// the only place the sentence is watched crossing the context bridge.
import { runCaptureRemoteSmoke } from './capture-remote';
import {
  runSmokeCreate,
  runSmokeT3Prep,
  runSmokeT3Verify,
  runSmokeVerify
} from './durability';
import { runSmokeIdentity } from './identity';
import { runP156MenusSmoke } from './p156-menus';
import { runSmokeProcId } from './procid';
import { runSmokeQuit } from './quit';
// Phase 119: declining capture on restore. LEAF-free like the capture smoke,
// and the only place the decline, the durable flip and the untouched ordinary
// restore are measured against one running app rather than read.
import { runRestoreBareSmoke } from './restore-bare';
// Phase 116: the shutdown refusal proof. LEAF import like ../fault/harness,
// because it pulls in the session core.
import { runShutdownRefusalSmoke } from './shutdown-refusal';
// Phase 144 stage 1: every IPC door closes the moment quit starts. Real
// handlers driven through the real window and the real preload while the real
// quit is held open inside the snapshot pass.
import { runQuitDoorsSmoke } from './quit-doors';
// Phase 71: the partition harness's Electron leg. It is the only place the
// "a cut link never says a session ended" rule is measured against a real app
// holding a real connection with a real terminal attached.
import { runPartitionSmoke } from './partition';
// Phase 72: the ten row fault matrix. It is the only place research 28's fault
// list is executed against a running app rather than read.
import { runRemoteMatrixSmoke } from './remote-matrix';
import { runSmokeShadow } from './shadow';
import { runSmokeShim } from './shim-smoke';
import { runShot } from './shot';
import { installFoldStub } from './fold-stub';
import { seedFold } from './fold-seed';
import { seedOverviewSessions } from './overview-seed';
import { seedSummaries } from './summary-seed';

export interface HarnessDeps {
  /** The real app window factory, owned by the composition root. */
  createWindow(): BrowserWindow;
}

/**
 * Run the harness this launch asked for, if it asked for one.
 *
 * Returns true when a harness mode was dispatched: the harness owns the
 * process from that point (every one of them ends in app.exit or, for the
 * quit smoke, the real app.quit), and the composition root must not start
 * normal startup behind it.
 */
export async function dispatchHarness(deps: HarnessDeps): Promise<boolean> {
  const smoke = process.env['GMUX_SMOKE'];
  const shot = process.env['GMUX_SHOT'];

  if (smoke === 'basic') {
    await runSmokeBasic(deps);
    return true;
  }
  if (smoke === 'create') {
    await runSmokeCreate();
    return true;
  }
  if (smoke === 'verify') {
    await runSmokeVerify();
    return true;
  }
  // Phase 36: the only harness that ends with the real app.quit(), because
  // the bug it guards against lives between before-quit and FreeEnvironment.
  if (smoke === 'quit') {
    await runSmokeQuit();
    return true;
  }
  // Phase 116: the core fails closed once shutdown starts. Holds the real
  // shutdown inside the snapshot pass and proves the typed refusal of
  // acquisition and mutation with manifest, tmux and pid counts unchanged,
  // proves the admitted create was joined before the snapshot, and proves a
  // clean second boot in the same process. `npm run smoke:shutdown`.
  if (smoke === 'shutdown-refusal') {
    await runShutdownRefusalSmoke();
    return true;
  }
  // Phase 144 stage 1: after the first before-quit pass, every renderer
  // invoke is refused by the one typed wrapper. Proven against four real
  // mutation handlers through the real window while the real quit is held
  // open inside the snapshot pass, which is before the remote execution
  // ledger closes. `npm run smoke:quitdoors`.
  if (smoke === 'quit-doors') {
    await runQuitDoorsSmoke(deps);
    return true;
  }
  if (smoke === 't3-prep') {
    await runSmokeT3Prep();
    return true;
  }
  if (smoke === 't3-verify') {
    await runSmokeT3Verify();
    return true;
  }
  if (smoke === 'agent') {
    await runSmokeAgent();
    return true;
  }
  // Phase 15: the captured-launch acceptance test (wrap + resume + flush).
  if (smoke === 'capture') {
    await runSmokeCapture();
    return true;
  }
  // Phase 91: a create that asks for capture on another machine still starts
  // the session, records no capture, and says one sentence about it. Driven
  // against a real scratch machine, with the notice read back through the real
  // preload and the create sheet photographed with the row drawn off.
  if (smoke === 'capture-remote') {
    await runCaptureRemoteSmoke(deps);
    return true;
  }
  if (smoke === 'identity') {
    await runSmokeIdentity();
    return true;
  }
  // Phase 156: the application menu and the tray menu, read back from the real
  // main process after the real installAppMenu() ran. It photographs nothing,
  // because a native macOS menu cannot be photographed from outside the app,
  // and it says so at its own head. `npm run probe:p156`.
  if (smoke === 'p156-menus') {
    await runP156MenusSmoke();
    return true;
  }
  // Phase 119: a captured session can come back bare, and the ordinary restore
  // is unchanged by it. Two real captured sessions in one app run, because the
  // insurance and the normal path have to be measured against the same binary.
  if (smoke === 'restore-bare') {
    await runRestoreBareSmoke();
    return true;
  }
  // Phase 49: the bare-name invariant, proven live with a shadowed binary.
  // A session created with a shadowed copy launches the file the manifest
  // recorded, and the spawn still uses the bare name (F3).
  if (smoke === 'shadow') {
    await runSmokeShadow();
    return true;
  }
  // Phase 19 item 1: the general fault harness. `fault-work` builds durable
  // state and is SIGKILLed part way through it; `fault-survey` relaunches and
  // reports what survived. Both refuse to run unless the profile and the tmux
  // socket are isolated. The supervisor is build/fault-harness.mjs.
  if (smoke === 'fault-work') {
    await runFaultWork();
    return true;
  }
  if (smoke === 'fault-survey') {
    await runFaultSurvey();
    return true;
  }
  // Phase 19 item 11: the sleep and wake handlers, driven against a real
  // session, a real snapshot and a real renderer. The two macOS events are
  // injected, because the only way to make macOS send them is to sleep a
  // machine that is holding the operator's live work.
  if (smoke === 'power') {
    await runPowerSmoke();
    return true;
  }
  // Phase 16.5a: the rename upgrade, driven against a populated fixture and
  // REAL live tmux sessions (src/main/migrate/smoke.ts). Never reads the real
  // userData; the guard it asserts first is what keeps it that way.
  if (smoke === 'migrate') {
    await runMigrateSmoke();
    return true;
  }
  // Phase 20 item 5: reconstruction, driven in a real Electron process against
  // real capsules and a real tmux server. It builds its own foreign session on
  // its own socket, so the "not ours, untouched" claim is proved rather than
  // asserted. Same isolation guard as the fault harness.
  if (smoke === 'reconstruct') {
    await runReconstructSmoke();
    return true;
  }
  // Phase 21 fix round: the screen a person is shown when this build must not
  // touch their session list. Real Electron process, real refusal, and the one
  // thing replaced is the person clicking the buttons.
  if (smoke === 'refusal') {
    await runRefusalSmoke();
    return true;
  }
  // Phase 23: the confirm gate, driven in a real Electron process against the
  // real OS keychain and real forged records on disk. It is also the second
  // caller two of its refusals need, because rollup deletes a branch whose one
  // caller passes a constant, and that is what the refusal gate caught here.
  if (smoke === 'config') {
    await runConfigConfirmSmoke();
    return true;
  }
  // Phase 68: the machine confirm gate, driven in a real Electron process
  // against the real OS keychain and a real forged record on disk. It is also
  // the second caller the six machine refusals need. It starts no process, and
  // the last of its twelve steps proves that by two independent counts.
  if (smoke === 'machines') {
    await runMachinesSmoke();
    return true;
  }
  // Phase 69: the exec plane, driven in a real Electron process. It is the second
  // caller the four new machine refusals need, and two of them are unreachable in
  // production, so a synthetic ledger row is what makes them fire. It refuses to
  // run on the real socket by name, because the far side of its connection is this
  // same Mac and a remote set-option there would land on the operator's server.
  if (smoke === 'exec-plane') {
    await runExecPlaneSmoke();
    return true;
  }
  // Phase 70: sessions on a machine, driven in a real Electron process against a
  // scratch sshd. It is the second caller the two new machine refusals need, and
  // it is the only place the "no manifest write on any remote path" claim is a
  // measurement rather than a reading of the code.
  if (smoke === 'remote-sessions') {
    await runRemoteSessionsSmoke();
    return true;
  }
  // Phase 93: a session on a machine outlives its project tab and can still be
  // ended by id. It is the only gate that ends a session on another computer
  // after the tab for its folder is gone, which is the half of the operator's
  // question the ⌘J probe cannot reach.
  if (smoke === 'p93-remote-clear') {
    await runP93RemoteClearSmoke();
    return true;
  }
  // Phase 117: a remote create whose answer was lost. The prep leg makes the
  // fault and reads the durable row it now leaves behind; the verify leg is a
  // second launch on the same user data directory, which is what makes the
  // restart real rather than described. `build/p117-create-unknown.mjs` owns
  // the machine, the wrapper and the verdict, so this process never grades
  // itself.
  if (smoke === 'p117-prep') {
    await runP117PrepSmoke();
    return true;
  }
  if (smoke === 'p117-verify') {
    await runP117VerifySmoke();
    return true;
  }
  // Phase 118: a long running copy onto another machine is owned, ended and
  // written down, and a machine removal is one transaction. The prep leg starts
  // a copy that really takes minutes, runs the REAL quit teardown under it, and
  // reads the durable row it leaves behind. The verify leg is a second launch
  // on the same user data directory, so the person being told once is a fact
  // about a restart rather than about a variable. It then faults the removal
  // transaction and compares the before and after fingerprints byte for byte.
  // `build/p118-remote-children.mjs` owns the machine, the wrapper and the
  // verdict, so this process never grades itself.
  if (smoke === 'p118-prep') {
    await runP118PrepSmoke();
    return true;
  }
  if (smoke === 'p118-verify') {
    await runP118VerifySmoke();
    return true;
  }
  // Phase 71: the link to a machine cut at five named moments, in a real
  // Electron process against a scratch sshd the supervisor owns. It is the only
  // place the case table of research 51 section 4.4 is checked against a
  // running app rather than against a pure function.
  if (smoke === 'partition') {
    await runPartitionSmoke();
    return true;
  }
  // Phase 72: the ten row fault matrix, in a real Electron process against two
  // scratch machines. It is the gate on remote restore, so a red run is a
  // release that ships restore refused rather than a note in a report. This
  // process writes facts and `build/remote-matrix.mjs` decides the verdict.
  if (smoke === 'remote-matrix') {
    await runRemoteMatrixSmoke();
    return true;
  }
  // Phase 13.8: what the outside world sees of gmux (read-only).
  if (smoke === 'procid') {
    await runSmokeProcId();
    return true;
  }
  // Phase 51: the `tortie` shim install and removal proof, run entirely
  // against a fresh temp directory injected through the shim module's deps
  // parameter. It can never touch a real PATH directory.
  if (smoke === 'shim') {
    await runSmokeShim();
    return true;
  }
  // Phase 13.5 item 5 — `npm run conformance:resume`. Lives in
  // src/main/conformance/ rather than here: it is a per-agent matrix with its
  // own report format, not a pass/fail smoke, and it is the one harness meant
  // to be run against agent CLIs that change under us.
  if (smoke === 'conformance-resume') {
    await runResumeConformance();
    return true;
  }
  if (shot !== undefined && shot !== '') {
    // PHASE 23 FIX ROUND. The screenshot harness used to return here, before
    // the boot read below, so `npm run shot` photographed a build that had
    // never opened `agents.json`. A verifier noticed and had to state that no
    // screenshot of any Phase 23 behaviour was obtainable through the harness,
    // which means a whole class of evidence was closed off for this phase and
    // for every phase after it that touches the configured agents.
    //
    // The read is cheap and it is the same one normal startup does. It is
    // awaited here rather than fired and forgotten, because a capture that
    // races the read would be worse than no capture at all: it would show
    // whichever of the two answers won.
    await initAgentOverlay().catch((err: unknown) => {
      console.error(
        `[gmux] the configuration file was not read: ${(err as Error).message}`
      );
    });
    // Phase 68, for the same reason. A screenshot of the Machines section must
    // show a build that has opened machines.json, and the read is awaited so a
    // capture cannot race it and photograph whichever answer won.
    await initMachines().catch((err: unknown) => {
      console.error(
        `[gmux] the machines file was not read: ${(err as Error).message}`
      );
    });
    // Phase 137: the Catch Me Up photograph probe seeds manifest rows for its
    // scratch project before the window opens. The seed refuses to run
    // outside an isolated harness launch on a harness profile.
    if ((process.env['GMUX_OVERVIEW_SEED'] ?? '') !== '') {
      await seedOverviewSessions();
    }
    // Phase 138: the fold's stub binary, so a probe can drive the whole fold
    // path and spend nothing. It carries the same two refusals the seed above
    // carries, and it returns null rather than throwing when either fires.
    installFoldStub();
    // Phase 138: the fold's own seed, which sets the sealed choice and drives
    // one real fold per named session against the stub above. It runs after
    // the stub is installed and after the manifest rows exist, and it carries
    // the same two refusals both of those carry.
    if ((process.env['GMUX_FOLD_SEED'] ?? '') !== '') {
      await seedFold();
    }
    // Phase 143: the story's own seed, which writes version chains straight
    // through the shipped appendSummary path so a probe can photograph a
    // chain of three, a chain of two hundred, a run of identical sentences
    // and a switch of model without asking a model anything. It carries the
    // same two refusals the two seeds above carry.
    if ((process.env['GMUX_SUMMARY_SEED'] ?? '') !== '') {
      await seedSummaries();
    }
    await runShot(shot, deps);
    return true;
  }
  return false;
}
