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
import {
  runSmokeCreate,
  runSmokeT3Prep,
  runSmokeT3Verify,
  runSmokeVerify
} from './durability';
import { runSmokeIdentity } from './identity';
import { runSmokeProcId } from './procid';
import { runSmokeQuit } from './quit';
// Phase 71: the partition harness's Electron leg. It is the only place the
// "a cut link never says a session ended" rule is measured against a real app
// holding a real connection with a real terminal attached.
import { runPartitionSmoke } from './partition';
import { runSmokeShadow } from './shadow';
import { runSmokeShim } from './shim-smoke';
import { runShot } from './shot';

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
  if (smoke === 'identity') {
    await runSmokeIdentity();
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
  // Phase 71: the link to a machine cut at five named moments, in a real
  // Electron process against a scratch sshd the supervisor owns. It is the only
  // place the case table of research 51 section 4.4 is checked against a
  // running app rather than against a pure function.
  if (smoke === 'partition') {
    await runPartitionSmoke();
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
    await runShot(shot, deps);
    return true;
  }
  return false;
}
