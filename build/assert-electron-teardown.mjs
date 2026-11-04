#!/usr/bin/env node
/**
 * assert-electron-teardown.mjs. Every script under build/ that starts an
 * Electron starts it through build/electron-run.mjs (Phase 140).
 *
 * ## Why this file exists
 *
 * A rule with no gate is a rule that drifts back, and this one has already
 * drifted. `build/probe-p139-caption.mjs` states the rule in its own header,
 * being that the pid it started is killed in a `finally` block whatever
 * happened. On 2026-08-23, 51 scripts under build/ started an Electron and 8 of
 * them ended it in a `finally` block. The other 43 ended it only on the happy
 * path, so any assertion that threw before the kill line left about 480 MB
 * running. Stacking those is how the operator's machine ran out of memory on
 * 2026-08-22.
 *
 * Phase 140 moved the launch into one helper. This gate is what keeps it there.
 * It earned that job before it shipped. Phase 138 landed
 * build/probe-p138-fold.mjs while this phase was being written, that probe
 * started an Electron of its own, and this gate is what found it. It was moved
 * onto the helper in the same commit, which is why the recorded list below
 * holds 50 files rather than the 49 that were converted by hand.
 *
 * ## What it asserts, and both directions matter
 *
 *   1. FORWARD. No file under build/ except electron-run.mjs passes an Electron
 *      program to spawn, spawnSync, execFile, execFileSync or exec. The
 *      helper's teardown cannot end a process the helper never started.
 *   2. REVERSE. The POPULATION of files that reach the helper is not shrinking.
 *      Without this direction the gate would go on passing after somebody
 *      deleted every probe, which is the same lesson
 *      build/assert-probe-containment.mjs records about itself at its line 27.
 *
 *      This rule was a HAND LIST of 50 names until Phase 219, and the hand list
 *      is what it exists to refuse. On 2026-09-06 the tree held 87 files that
 *      reach the helper and the list named 56 of them, so 30 real scripts had
 *      drifted off it, going back to Phase 140, while the gate printed a green
 *      sentence claiming "56 reach build/electron-run.mjs". That sentence was
 *      the list's own length rather than a measurement, and reciting a constant
 *      is how the drift stayed invisible for eighty phases.
 *
 *      So the set is DERIVED now, by the same usesHelper() this file already
 *      exported, and rule 2 is a FLOOR on its size rather than a roll call.
 *      Deriving the set alone would be a tautology, since a list computed by
 *      usesHelper and then checked with usesHelper can never disagree with
 *      itself, and that tautology is exactly the vacuity rule 2 was written to
 *      prevent. The floor is what keeps the assertion real: adding a probe can
 *      never turn this gate red, and deleting one, renaming one, or quietly
 *      taking one off the helper does. A deliberate deletion lowers
 *      HELPER_USER_FLOOR in the same commit and says so in the commit body, the
 *      way the deleted row used to.
 *
 *      What is given up is per name identity in the failure message. That is
 *      the right trade, because the value was never in the names: it was in the
 *      assertion that the population is not shrinking, and the names are one
 *      `--list` away.
 *   3. THE HELPER ITSELF. electron-run.mjs kills inside a `finally` block, read
 *      by matching braces rather than by searching for a string. A gate that
 *      greps for the word "finally" passes on a file that mentions it in a
 *      comment.
 *   4. THE FIXTURES. The scanner is run over three files this script writes
 *      itself: one that launches through the helper, one that spawns the shim
 *      directly, and one that spawns it through a variable called "bin", which
 *      is how a rule like this gets around by accident. The first must produce
 *      no finding and the other two must produce exactly one each. A checker
 *      nobody has seen fail is a checker nobody has seen work. Rule 2's floor
 *      is proved the same way, against a count one below the floor and against
 *      the floor itself, because a floor nobody has seen refuse anything is
 *      indistinguishable from no floor at all.
 *   5. THE SOCKET REFUSAL, THE ANNOUNCEMENT AND THE CENSUS (Phase 261, judged
 *      by identity since Phase 285). See the section that runs it below.
 *   6. THE CEILING (Phase 285). The scripts under build/ besides the helper
 *      and this gate that aim an argv at `-L gmux` may only fall in number.
 *      Phase 285 took the bare counts out of the probes it runs, and the rest
 *      are held here so the sweep can finish over later rounds without a new
 *      bare count ever arriving. Proved against a count one above it. Since
 *      the probe review of Phase 352 a second count holds, the same way, the
 *      scripts that hand a shell a command line aimed at it, which the argv
 *      count never read.
 *
 * ## What it does not assert
 *
 * Three launches under build/ sit outside the helper, and all three are here on
 * purpose rather than by oversight.
 *
 * It does not read package.json. Several npm scripts run `electron .` from a
 * shell line inside build/harness-socket.mjs, e.g. every `smoke:*` entry. Those
 * launches are the harness's own child and the harness ends with them, so they
 * are a different shape from a probe holding an app open across assertions.
 *
 * It does not catch build/probe-openwith.mjs either, for the same reason. That
 * probe builds a shell line naming `electron` and hands it to
 * build/harness-socket.mjs to run inside a tmux pane, so the string never
 * reaches a spawn call in that file.
 *
 * It does not see `runKeychainApp` in build/probe-p133-login-session.mjs at its
 * line 599. That function builds an Electron command line as a string at its
 * lines 607 to 609 and hands it to tmux as a pane's direct command, so no spawn
 * call in that file names an Electron and the forward rule reads nothing. It is left
 * alone on purpose. The pane's own pid is killed by a 20 second watchdog, and
 * build/harness-socket.mjs ends the scratch tmux server on close, so that
 * Electron cannot outlive the probe the way an app held across assertions can.
 * Moving it into the helper would mean giving the helper a tmux pane mode for
 * one caller.
 *
 * ## Two shapes the forward rule would miss
 *
 * Both were found by attacking the gate with fixtures on 2026-08-23. Neither
 * exists in this tree, and both are written down here so a later round reads
 * them rather than rediscovers them.
 *
 *   1. A program returned by a function whose name does not contain the word
 *      "electron", e.g. `spawn(pick(), args)` where `pick()` returns the shim
 *      path. The rule reads declarations and argument text, and it does not
 *      follow return values. A function named `electronProgram()` is caught,
 *      because its name carries the word.
 *   2. A declaration written with no trailing semicolon, because
 *      electronVariables() needs a `;` to close the value it reads. Every file
 *      under build/ is written with semicolons and there is no formatter in
 *      this repository that would remove them, so this miss is theoretical.
 *
 * Run it with `npm run gate:electron`. It spawns nothing, opens no profile,
 * launches no Electron and never reaches tmux, and it takes about 2 s, most of
 * it the ablated copies of the helper that rule 5 loads (2.4 s measured on
 * 2026-11-02 on a loaded machine, 4 to 5 s at a load average above 100).
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The lexer both this gate and build/assert-known-hosts-scoped.mjs read source
// with. It was extracted from this file in Phase 193 rather than copied.
import { buildScriptNames } from './build-scripts.mjs';
import {
  blockAt,
  callArguments,
  closeOf,
  functionBodyOf,
  lineAt,
  stripComments
} from './scan-source.mjs';

export { stripComments };

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(repoRoot, 'build');
const HELPER = 'electron-run.mjs';

/**
 * The size the derived population may never fall below.
 *
 * This replaced a hand written list of 50 names in Phase 219. It was 56 names
 * by then and the tree held 87 files that reach the helper, so it had drifted
 * by 30 and nothing noticed, because the list was both the claim and the thing
 * checked. The floor is the part of that rule that can still fail: adding a
 * probe never turns this gate red, and removing one, renaming one, or taking
 * one off the helper does.
 *
 * Measured on 2026-09-06 with `node build/assert-electron-teardown.mjs --list`,
 * which printed 86 names, re-measured at 87 the same day when Phase 219's
 * fix round added `probe-p219-geometry.mjs`, and at 88 on 2026-09-07 when
 * Phase 225's fix round added `probe-p225-baseline.mjs`, and at 89 on 2026-09-08 when
 * Phase 227 added `probe-p227-rewind.mjs`, at 90 the same day when Phase 236
 * committed the verifier's own redline probe, at 91 when Phase 234 added
 * `probe-p234-arch.mjs`, the Architecture app run against the operator's Mac
 * Pro, at 92 when Phase 237 added `probe-p237-typing.mjs`, and at 95 the same
 * day when Phase 237's verifier's three attack probes were kept, and at 96 on
 * 2026-09-08 when Phase 241's measure step added `probe-p241-actions.mjs`, the
 * app run that asks the live editor which of its menu rows really do something.
 *
 * THAT PROBE WAS WRITTEN UNDER `build/p241/` FIRST AND THIS GATE COULD NOT SEE
 * IT. `buildFiles()` is a FLAT `readdirSync(buildDir)`, so a script in a phase
 * subdirectory beside it — `build/p214/`, `build/p218/`, `build/p241/` — is
 * read by neither rule 1 nor rule 2, and one of those that started an Electron
 * would be exactly the 2026-08-22 shape with nothing watching it. Today none
 * of them does, and the answer chosen here was to move the one that does up to
 * this directory rather than to widen the walk, because widening it would sweep
 * in fixture trees the rules were never written for. A round that puts an
 * Electron in a subdirectory has to make the walk recursive first.
 *
 * PHASE 240'S COMMITTER'S ROUND WIDENED THE WALK ANYWAY, and the paragraph
 * above is kept because it is the reasoning this replaced. `buildFiles()` is
 * recursive now and the import pattern is widened with it, which is what
 * finally brought `build/p240/save-loss.mjs` and `build/p240/save-choice.mjs`
 * into the population they had always been outside of. Part of the rise in the
 * floor below is therefore a measurement rather than new files, and a round
 * that puts an Electron in a subdirectory no longer has to move it up first.
 * PHASE 261 RAISED IT FROM 129 TO 131, for the two probes that round added:
 * build/p261/probe-p261-socket.mjs, the app run for the socket refusal, and
 * build/p261/probe-p261-cmdt.mjs, the app run for the name selection race.
 * Adding a probe cannot turn this gate red, so a floor left where it was is a
 * floor that would let either of them be deleted again in silence.
 *
 * PHASE 268 RAISED IT FROM 131 TO 132, for build/p268/probe-p268-autosave.mjs.
 * PHASE 269 RAISED IT FROM 132 TO 133, for build/p269/probe-p269-env.mjs, the
 * app run that proves a shell variable a person named in Settings reaches a
 * real pane, is written nowhere, rotates with no restart, and that a name
 * written straight into settings.json is refused. Both rounds were in flight at
 * once and each raised 131 to 132; the rebase is what made it 133.
 *
 * Lower it ONLY in the same commit
 * that deletes a probe on purpose, and say in the commit body which file went
 * and why. Do not lower it to make a red gate green: red here means either a
 * probe left the tree or a probe stopped routing its launch through the helper,
 * and the second one is the 2026-08-22 crash coming back.
 *
 * PHASE 274 RAISED IT FROM 134 TO 135, for build/p274/probe-p274.mjs, the app
 * run that opens one folder under two spellings and reads ONE tab, ONE project
 * row and one session strip back.
 *
 * PHASE 276 RAISED IT FROM 137 TO 138, for build/p276/probe-p276.mjs, the app
 * run that counts login shells from OUTSIDE the app off a wrapper's own log —
 * six warm creates and a second agent must start none — and then rotates a
 * scratch `~/.zshrc` eleven ways a real editor writes a file and reads back
 * which GENERATION of an invented sentinel each pane received.
 *
 * PHASE 281 RAISED IT FROM 139 TO 140, for build/p281/probe-p281-meter.mjs, the
 * app run that reads the Claude meter's state at the parent and at HEAD over
 * the person's real keychain, two polls apart.
 * PHASE 282 RAISED IT FROM 139 TO 140, for the two helper users that each
 * counted themselves as the 139th: build/p277/probe-p277-save.mjs (`probe:p277`,
 * Phase 277's app run for the save that clears newer typing) and
 * build/probe-redline-move-on.mjs (`probe:redlinemoveon`, PR 28's app run for
 * the press that moves on). The two rounds were in flight at once and each
 * raised 138 to 139, so after the merge the gate read 140 users against a floor
 * of 139 and either probe could have been deleted with it green.
 *
 * PHASE 282 RAISES IT AGAIN, from 140 to 141, because Phase 281 and this round
 * landed within an hour of each other and each had raised it to 140 on its own
 * branch: main carries both probes and the floor must count both.
 *
 * PHASE 284 RAISED IT FROM 141 TO 142, for build/p284/probe-p284.mjs
 * (`probe:p284`), the app run for the quiet surround: one Electron at a time
 * through eleven states, reading the work's one outline, its 8px gutters, the
 * nine hairlines that lost their colour and kept their pixel, and both
 * resizers under a real pointer and a real Tab, with a second Electron from
 * P284_PARENT_CHECKOUT afterwards and never beside it. Measured at 142 names
 * on 2026-09-17 with `node build/assert-electron-teardown.mjs --list`, which
 * derives the population and never reads this constant.
 *
 * PHASE 292 RAISED IT FROM 143 TO 144, for build/p292/probe-p292.mjs
 * (`probe:p292`), the app run for scrollback that holds its place: one
 * Electron, the issue's own loop typed with real keys, real wheel events back
 * a hundred lines, and the screen, tmux's own numbers and the thumb's
 * rectangle read together through a hold, a held drag, a window resize and the
 * way back to live. Measured at 144 names on 2026-09-18 with `--list`.
 *
 * PHASE 293 RAISED IT FROM 144 TO 145, for build/p293/probe-p293.mjs
 * (`probe:p293`), the session manager's app run: one Electron beside the
 * loopback scratch machine, driving both doors, the inline End, Remove and
 * Restore, the select-all and the batch confirmation with real pointer and key
 * events. It was built beside Phase 292 and landed second, so it raised the
 * floor once more at its rebase.
 *
 * PHASE 300 RAISED IT FROM 145 TO 146, for build/p300/probe-p300.mjs
 * (`probe:p300`), the app run for what a first read costs the person waiting:
 * one Electron on a scratch profile and a scratch HOME, over codex records it
 * SYNTHESISES from the committed fixture rather than reading any of the
 * operator's, measuring main's unavailability from OUTSIDE main with a 20 ms
 * ping on an existing channel. Its three siblings under build/p300/ —
 * generate-codex-records.mjs, split.mjs and ablation.mjs — launch no Electron
 * APP and are correctly absent from the population: since the fix round
 * split.mjs runs the electron dist's binary AS A NODE under
 * ELECTRON_RUN_AS_NODE=1, with no window, no profile and no tmux, which is a
 * child it waits for and not a launch this gate owns. Measured at 146 names on
 * 2026-09-20 with `node build/assert-electron-teardown.mjs --list`, which
 * derives the population and never reads this constant.
 *
 * PHASE 304 RAISED IT FROM 146 TO 147, for build/probe-p304.mjs
 * (`probe:p304`), the sealed vault's app run: four Electrons one at a time,
 * three of them killed on purpose at a named step of the keychain
 * read-through and the fourth keeping a 4,193 byte and a 1 MB payload through
 * the shipping vault over the real `safeStorage`, every one ended by the
 * helper's `finally` whether it was killed or not. Phase 300 was built beside
 * it and landed first at 146, so this phase is the one that lands at 147.
 *
 * PHASE 311 RAISED IT FROM 147 TO 148, for build/p311/probe-p311.mjs
 * (`probe:p311`), the app run for what a blocked row SAYS: one Electron on a
 * scratch profile and a scratch HOME, a nine line /bin/sh `claude` printing the
 * committed dialog fixtures so no vendor process runs and no token is spent, and
 * a real `PermissionRequest` POSTed to the app's own loopback route with the
 * token read out of the settings file the app itself wrote. It names its own
 * socket rather than taking one from a wrapper, so the helper's `finally` ends
 * the tmux server and the app together. It was written in the phase's FIX ROUND,
 * because the phase had named its one app run and nobody had written it.
 *
 * PHASE 314 RAISED IT FROM 148 TO 149, for build/probe-p314.mjs
 * (`probe:p314`), the push driven inside the real app: one Electron on a
 * scratch profile under a harness directory, a scratch HOME, the socket
 * gmux-p314-<pid>, a looped /bin/sh `claude` printing the committed dialog
 * fixture so no vendor process runs, a scratch P-256 key generated in the probe
 * and deleted in its `finally`, and the APNs stand-in as two loopback listeners
 * IN THE PROBE'S OWN PROCESS, closed in the same `finally`. The phase entry
 * said the floor rose from 147 at :272; it was 148 at :282, which the Phase 313
 * entry had already recorded.
 *
 * PHASE 320 RAISED IT FROM 149 TO 150, for build/p320/probe-p320.mjs
 * (`probe:p320`), the app run for the wheel over a program on another machine:
 * one Electron on a scratch profile and a scratch HOME inside
 * build/with-scratch-machine.mjs's loopback machine, two stand-ins under
 * build/p320/ typed into the panes as its rulers, and a `P320_CHECKOUT` knob so
 * the parent is measured by a second invocation and never beside the first.
 * The two stand-ins do not reach the helper and are not counted.
 *
 * PHASE 316.1 RAISED IT FROM 150 TO 151, for build/probe-p313.mjs
 * (`probe:p313`), the door switched on and read by a node phone: one Electron
 * at a time on ONE scratch profile under a harness directory, a scratch HOME and
 * the socket gmux-p313-<pid>, the door on 127.0.0.1 and never a real
 * interface (a loopback override then; since Phase 330 the door binds only
 * 127.0.0.1 and is published through a stand-in Tailscale), a /bin/sh `claude` printing the
 * committed dialog fixture and planting the committed transcript fixture so no
 * vendor process runs and no token is spent, and three launches in sequence
 * (the order, the relaunch, and the relaunch with nothing confirmed), each
 * ended by the helper's `finally`. Phase 313 named `probe:p313` and never wrote
 * it; build/p316/SPEC.md §4 S1 is where it was specified. Phases 314 and 320
 * each raised the floor while this phase was built, so it lands at 151.
 *
 * PHASE 321 RAISED IT FROM 151 TO 152, for build/p321/probe-p321.mjs
 * (`probe:p321`), the questions real agents draw driven inside the real app:
 * one Electron on a scratch profile and a scratch HOME, its own tmux socket
 * unlinked in the helper's `finally`, and stand-ins run under the agent's bare
 * name that print committed, redacted question screens, so no vendor process
 * runs and no token is spent. Phases 314, 320 and 316.1 each raised the floor
 * while this phase was built, so it lands at 152.
 *
 * PHASE 316.2 RAISED IT FROM 152 TO 153, for build/p316/probe-p316.mjs
 * (`probe:p316`), the iPhone app driven in the Simulator against the real door:
 * ONE Electron with the door on loopback beside Simulators made one at a time by
 * build/simulator-run.mjs, each shut down and deleted in its `finally`. Phase 321
 * raised the floor while this phase was built, so it lands at 153.
 *
 * PHASE 330 RAISED IT FROM 153 TO 154, for build/p330/probe-p330.mjs
 * (`probe:p330`), the door published through Tailscale Funnel with the Funnel
 * driven through a STAND-IN Tailscale (build/p330/tailscale-standin.mjs, never
 * the real program): ONE Electron for arms 1 to 10 on a scratch profile, a
 * scratch HOME and the socket gmux-p330-<pid>, then two launches one after the
 * other for the orphan, each ended by the helper's `finally`. The orphan arm
 * SIGKILLs the app's MAIN pid, never the shim, so the helper's own teardown is
 * what still ends the tree; the stand-in's children and the decoy are ended by
 * pid in the probe's `finally`.
 * PHASE 331 RAISED IT FROM 154 TO 155, for build/p331/probe-p331.mjs
 * (`probe:p331`), the wheel over Codex and the screen of every agent driven
 * at the parent and at HEAD: TWO Electrons one after the other on one scratch
 * profile, the parent's launched with no socket so its tmux server lives on
 * into HEAD's, which ends it; each ended by the helper's `finally`.
 *
 * PHASE 332 RAISED IT FROM 155 TO 156, for build/p332/probe-p332.mjs
 * (`probe:p332`), pairing that waits for the Mac's public name, measured at the
 * parent and at HEAD against a loopback DNS stand-in the probe runs in its own
 * process (build/p332/dns-standin.mjs): ONE Electron at a time on a scratch
 * profile, a scratch HOME and the socket gmux-p332-<pid>, two launches one
 * after the other at HEAD, each ended by the helper's `finally`. The stand-in
 * Tailscale's pids are ended by pid in the probe's `finally`, and the DNS
 * stand-in is closed there.
 * PHASE 323 RAISED IT FROM 156 TO 157, for build/p323/probe-p323.mjs
 * (`probe:p323`), End and Restart driven over real agents and planted
 * processes at the parent and at HEAD: ONE Electron at a time on a scratch
 * profile, a scratch HOME and its own tmux socket, with a second scratch
 * server of its own for the stranger, and every process it recorded ended by
 * pid in its `finally`.
 * PHASE 326 RAISED IT FROM 157 TO 158, for build/p326/probe-p326.mjs
 * (`probe:p326`), the first session in a remote tab drawn at a build: TWO
 * Electrons one after the other on one scratch profile, a scratch HOME and the
 * socket gmux-p326-<pid>, over build/with-scratch-machine.mjs's loopback
 * machine whose tmux is build/p326/far-tmux.sh; each ended by the helper's
 * `finally`, and the far tmux server ended by the pid it reports.
 * PHASE 332.1 RAISED IT FROM 158 TO 159, for build/p3321/probe-p3321.mjs
 * (`probe:p3321`), the Pair card's name check drawn at the parent and at HEAD:
 * ONE Electron per build through the helper, on a scratch profile, a scratch
 * HOME and the socket gmux-p3321-<pid>, with four build/p332/dns-standin.mjs
 * stand-ins in the probe's own process on 127.0.0.1, closed in its `finally`,
 * and the stand-in Tailscale's pids ended by pid there.
 * PHASE 333.2 RAISED IT FROM 159 TO 160, for build/p3332/probe-p3332.mjs
 * (`probe:p3332`), the scan line that names where the phone app comes from,
 * read at the parent and at HEAD: ONE Electron per build through the helper,
 * on a scratch profile, a scratch HOME and the socket gmux-p3332-<pid>, with
 * one build/p332/dns-standin.mjs and Phase 314's APNs stand-in in the probe's
 * own process on 127.0.0.1, closed in its `finally`, a scratch key deleted
 * there, and the stand-in Tailscale's pids ended by pid there.
 * PHASE 306 RAISED IT FROM 160 TO 161, for build/p306/probe-p306.mjs
 * (`probe:p306`), a remote tab a person closed held closed, measured at the
 * parent and at HEAD over the loopback machine build/with-scratch-machine.mjs
 * starts: TWO Electrons one after the other on one scratch profile, because
 * the relaunch is the claim, each ended by the helper's `finally`; the far
 * sessions it makes on that machine's scratch server end with that server.
 * PHASE 334 RAISED IT FROM 161 TO 162, for build/p334/probe-p334.mjs
 * (`probe:p334`), the editor's re-read on a return and Redline's per-tab place,
 * measured at the parent and at HEAD: TWO Electrons one after the other, each
 * on a scratch profile, a scratch HOME and the socket gmux-p334-<pid>, each
 * ended by the helper's `finally`; its outside writer is a synchronous /bin/sh.
 * PHASE 317 RAISED IT FROM 162 TO 163, for build/p317/probe-p317.mjs
 * (`probe:p317`), End from the phone through the door's one write:
 * ONE Electron at HEAD through the helper, and with P317_PARENT_CHECKOUT the
 * parent's first, one after the other and never at once, on one scratch
 * profile, a scratch HOME and the socket gmux-p317…, inside the loopback
 * machine build/with-scratch-machine.mjs starts, with the stand-in Tailscale
 * behind its preflight and sampler and build/p332/dns-standin.mjs in the
 * probe's own process; the scratch machine's sshd pids it pauses for W6b are
 * resumed in its `finally` and on exit.
 * PHASE 318 RAISED IT FROM 162 TO 163, for build/p318/probe-p318.mjs
 * (`probe:p318`), a numbered choice answered and one message sent from the
 * phone through the door's two new writes: ONE Electron at HEAD through the
 * helper, and with P318_PARENT_CHECKOUT the parent's second, one after the
 * other and never at once, on one scratch profile, a scratch HOME and the
 * socket gmux-p318…, inside the loopback machine
 * build/with-scratch-machine.mjs starts, with the stand-in Tailscale behind
 * its preflight and sampler, build/p332/dns-standin.mjs in the probe's own
 * process and build/p318/stand-in.mjs as every agent the run answers; every
 * stand-in pid it saw is ended by pid in its `finally`.
 * PHASE 316.7 RAISED IT FROM 163 TO 165, landing second: by one for
 * build/p318/probe-p318.mjs, which 318's landing owed (main read 164 helper
 * users against a floor of 163, because 317's and 318's snapshots each raised
 * 162 to 163 and main took the raise once, beside b07c12f1's for
 * build/p334/probe-p334.mjs), and by one for
 * build/p3167/probe-p3167.mjs (`probe:p3167`), the phone's Sessions read over
 * a 2,000-row world seeded by build/p3167/seed-sessions.mts through the
 * shipping store before the launch: ONE Electron at HEAD through the helper,
 * and with P3167_PARENT_CHECKOUT the parent's first, one after the other and
 * never at once, on one scratch profile, a scratch HOME and the socket
 * gmux-p3167…, inside the loopback machine build/with-scratch-machine.mjs
 * starts, with the stand-in Tailscale behind its preflight and sampler and
 * build/p332/dns-standin.mjs in the probe's own process. It signals no
 * process of its own.
 *
 * PHASE 336 RAISED IT FROM 165 TO 166, by one for build/p336/probe-p336.mjs
 * (`probe:p336`), saving in a project on another machine the way it is saved
 * on this Mac: ONE Electron at a time through the helper, the parent's first
 * with P336_PARENT_CHECKOUT and then HEAD's on the same scratch profile, a
 * scratch HOME and the socket gmux-p336…, inside the loopback machine
 * build/with-scratch-machine.mjs starts with the quiet shell and its scratch
 * HOME. The five drives of the Settings sheet Phase 336 removed
 * (build/probe-p242-write-path.mjs and build/probe-p10{1,2,3,4}-shot.mjs) now
 * refuse at start and keep their import of the helper, so none left the
 * population.
 *
 * PHASE 340 RAISED IT FROM 166 TO 167, by one for build/p340/probe-p340.mjs
 * (`probe:p340`), adding a machine in three steps: ONE Electron at a time
 * through the helper, the parent's first with P340_PARENT_CHECKOUT and then
 * HEAD's, each on a scratch profile with a scratch HOME and the socket
 * gmux-p340…, against its OWN loopback machine (build/scratch-machine.mjs's
 * scratchYard and scratchMachine, never build/with-scratch-machine.mjs, whose
 * isolated() reads the person's ~/.ssh/config) behind an ssh wrapper and a
 * Tailscale stand-in it preflights by sha256. The five drives of the old
 * Settings › Machines face (build/probe-machines.mjs,
 * build/probe-p130-prose.mjs, build/probe-p130-spacing.mjs,
 * build/probe-p131-row.mjs and build/probe-p235-nits.mjs) now refuse at start
 * and keep their import of the helper, so none left the population. Phase
 * 337, building at the same time, raises the same constant from 166 to 167
 * for build/p337's probe; whichever of the two lands second makes it 168.
 * PHASE 337 RAISED IT FROM 166 TO 167, by one for build/p337/probe-p337.mjs
 * (`probe:p337`), a session's own screen read and typed into from a node
 * phone: ONE Electron at a time through the helper, the parent's first with
 * P337_PARENT_CHECKOUT and then HEAD's on the same scratch profile, a scratch
 * HOME and the socket gmux-p337…, inside the loopback machine
 * build/with-scratch-machine.mjs starts with the quiet shell and none of the
 * person's keys, with the stand-in Tailscale behind its preflight and sampler
 * and build/p332/dns-standin.mjs in the probe's own process. The only process
 * it signals that it did not start is the scratch machine's own sshd, paused
 * for S8 and resumed in its `finally` and on exit.
 * Landed after Phases 341 and 340, so the floor is 169 (166, then 341, 340 and 337 one each).
 * PHASE 343 RAISED IT FROM 169 TO 170, by one for build/p343/probe-p343.mjs
 * (`probe:p343`), a link to a folder opened in the Explorer on this Mac and on
 * another machine: ONE Electron at a time through the helper, the parent's
 * first with P343_PARENT_CHECKOUT and then HEAD's, each on its own scratch
 * profile with a scratch HOME and ZDOTDIR and the socket gmux-p343…, inside the
 * loopback machine build/with-scratch-machine.mjs starts with the quiet shell
 * and the scratch home, the five hidden agents renamed before each launch and
 * read back through agents:list. It counts the far side's walks through a find
 * wrapper named only by a .zshenv in the yard's own ZDOTDIR, removed in its
 * `finally`, and it never empties anything into the Trash. Phase 337.1,
 * building at the same time, may raise this too; whichever lands second makes
 * the floor the count of both.
 * PHASE 333.1 RAISED IT FROM 170 TO 171, by one for build/p3331/probe-p3331.mjs
 * (`probe:p3331`), a stranger's first run on the Mac: Settings then Phone's
 * three steps, read in the real app at the parent (P3331_PARENT_CHECKOUT,
 * required) and then at HEAD, never two Electrons at once, each launch through
 * the helper on a scratch profile inside a harness directory, a scratch HOME
 * and ZDOTDIR and the socket gmux-p3331-<pid>, with build/p330/tailscale-standin.mjs
 * behind its preflight and sampler, build/p332/dns-standin.mjs and
 * build/p314/apns-stand-in.mjs in the probe's own process and node phones
 * from build/p316/node-phone.mjs. It never presses Get Tailscale, Open
 * Tailscale, Approve in Tailscale or Copy link, never calls pocket:setupAction,
 * and ends every stand-in read it left alive by pid in its `finally`.
 *
 * Phase 342 raises it to 171 for `build/p342/probe-p342.mjs`, the Linux matrix
 * in the app: one Electron per build through the helper, the parent first
 * when `P342_PARENT_CHECKOUT` names a built checkout, each on its own scratch
 * profile, HOME and harness socket, reaching throwaway containers in his
 * Docker (made and ended only by `build/docker-run.mjs`) through an ssh
 * wrapper and the tailnet stand-in, every one ended in a `finally`.
 *
 * PHASE 347 RAISED IT FROM 172 TO 173, by one for build/p347/probe-p347.mjs
 * (`probe:p347`), three of John's bugs in the real app: ⌘C with nothing
 * selected, a path broken over rows, and a file in an ignored folder that an
 * outside writer changes. The parent first (P347_PARENT_CHECKOUT, required),
 * then HEAD, never two Electrons at once, each launch through the helper on a
 * scratch profile, HOME and ZDOTDIR with HISTFILE=/dev/null, the five hidden
 * agents renamed before it; every session a plain shell running
 * build/p347/stand-in.sh, and every other process it starts synchronous.
 *
 * PHASE 345 RAISED IT BY ONE (175 TO 176 once rebased past 333.12 and 333.12.1), for build/p345/probe-p345.mjs
 * (`probe:p345`), one iPhone and several Macs: TWO Electrons AT ONCE through
 * the helper, the second launched inside the first's body so each is ended
 * in its own `finally`, each on its own scratch profile, HOME (ZDOTDIR and
 * HISTFILE=/dev/null) and socket gmux-p345a-<pid> and gmux-p345b-<pid>, the
 * five hidden agents renamed before each launch, each door published through
 * its own build/p330/tailscale-standin.mjs behind its preflight and sampler and
 * named by its own build/p332/dns-standin.mjs, with build/p314/apns-stand-in.mjs
 * and build/p345/sni-relay.mjs in the probe's own process and three node doors
 * of build/p316/hostile-door.mjs ended in its `finally`, beside Simulators made
 * one at a time by build/simulator-run.mjs.
 *
 * PHASE 346 RAISED IT FROM 176 TO 177, by one for build/p346/probe-p346.mjs
 * (`probe:p346`), a session started from the phone: ONE Electron at HEAD
 * through the helper and, with P346_PARENT_CHECKOUT, the parent's first on the
 * same profile, one after the other and never at once, on a scratch profile,
 * HOME and ZDOTDIR with HISTFILE=/dev/null and the socket gmux-p346…, inside
 * build/with-scratch-machine.mjs's loopback machine, the five hidden agents
 * renamed before every launch, every agent a stand-in behind its bare name,
 * and every stand-in pid and paused sshd pid ended or resumed in its
 * `finally`.
 *
 * PHASE 348 RAISED IT FROM 177 TO 178, by one for build/p348/probe-p348.mjs
 * (`probe:p348`), the Mac side of Remove and paste from the phone: ONE
 * Electron at HEAD through the helper, the parent's (`P348_PARENT_CHECKOUT`,
 * required) FIRST on the same profile, one after the other and never at once,
 * on a scratch profile, HOME and ZDOTDIR with HISTFILE=/dev/null and the socket
 * gmux-p348…, inside build/with-scratch-machine.mjs's loopback machine with the
 * quiet shell and its own far HOME, the five hidden agents renamed before
 * every launch, `claude` and `codex` build/p318/stand-in.mjs behind their bare
 * names, every key read by build/p337/key-recorder.mjs, and every stand-in
 * pid, recorder pid and paused sshd pid ended or resumed in its `finally`.
 *
 * PHASE 349 RAISED IT FROM 178 TO 179, by one for build/p349/probe-p349.mjs
 * (`probe:p349`), the Mac side of renaming a session from the phone: ONE
 * Electron at HEAD through the helper, the parent's (`P349_PARENT_CHECKOUT`,
 * required) FIRST on the same profile, one after the other and never at once,
 * on a scratch profile, HOME and ZDOTDIR with HISTFILE=/dev/null and the socket
 * gmux-p349…, inside build/with-scratch-machine.mjs's loopback machine with the
 * quiet shell and its own far HOME, every probed registry row but the two
 * stand-ins hidden before every launch, a shadow copy of a stand-in's name
 * refused, `claude` and `codex` build/p318/stand-in.mjs behind their bare
 * names, and every stand-in pid ended in its `finally`.
 *
 * RAISE IT WHEN YOU ADD ONE, in the same commit, and that is not optional
 * bookkeeping. Adding a probe cannot turn this gate red, so a floor left where
 * it was is a floor that would let the probe you just added be deleted again in
 * silence, which is the drift this constant replaced a hand list to stop.
 */
const HELPER_USER_FLOOR = 179;

/**
 * This file is not a helper user, and it reads as one to its own scanner.
 *
 * usesHelper() looks for an import of ./electron-run.mjs and a call to
 * withElectron or runElectron. Both appear in THIS file as text: the first
 * inside usesHelper's own regular expression literal, the second inside
 * GOOD_FIXTURE. stripComments() removes comments and strings but not regular
 * expression literals, so the derived set counted the gate itself and the count
 * was permanently one too high. The gate spawns nothing and launches no
 * Electron, so excluding it by name is the honest reading rather than a
 * convenience: it does not reach the helper, it quotes it.
 */
const NOT_A_HELPER_USER = new Set(['assert-electron-teardown.mjs']);

/**
 * RULE 6, THE CEILING (Phase 285). How many scripts under build/, besides the
 * helper and this gate, may aim an argv at `-L gmux` at all, being `'-L',
 * 'gmux'` in their code once build/scan-source.mjs's stripComments has blanked
 * comments (see OPERATOR_ARGV below for the one spelling it does not read).
 *
 * WHY A CEILING AND NOT A SWEEP. About a hundred probes carry a hand written
 * count of the operator's own server, and each of them fails when HE starts or
 * ends a session while it runs: on 2026-09-17 `probe:p277` passed every arm and
 * exited 1 because his count went from 52 to 53. Phase 285 took the count out
 * of the seven probes this repository still runs (the Phase 237 four,
 * `probe:p268`, `probe:p277` and `probe:redlinemoveon`), whose launches the
 * helper's census now guards by identity, and his ruling of 2026-11-02 left
 * the helper as the one reader of his server. Rewriting the rest in one commit
 * is not this phase. Holding their number is: a ceiling lets the sweep finish
 * over later rounds, and no NEW bare count can arrive without turning this
 * gate red.
 *
 * Measured at 109 at 8b63abc1 (build/p352/SPEC.md §2.5, the spec's own reader)
 * and 102 once the seven are converted. LOWER IT, in the same commit, when a
 * round takes another count out. Raising it puts a new bare count of his
 * server back, and that is what it exists to refuse.
 *
 * 105 SINCE THE FIX ROUND OF PHASE 352, AND NO SCRIPT WAS ADDED. The detector
 * now counts every spelling rule 5f reads (a name the script declares as
 * `'gmux'`, the attached `-Lgmux`, a `-S` path to his socket), and that reads
 * three scripts the literal pair alone never saw, each as it stood at
 * 8b63abc1: build/update-rehearsal.mjs:423 and build/tmux-pair.mjs:122, each
 * `['-L', OPERATOR_SOCKET, 'list-sessions']`, and build/p245/corpus-scan.mjs:187,
 * `['-L', SOCKET, ...a]`.
 *
 * 98 SINCE 2026-11-03, his answer to Phase 352's question 5, "Delete them":
 * the seven research scripts that could aim any verb at his server are gone,
 * build/p245/corpus-scan.mjs, refused-family.mjs and root-cost.mjs,
 * build/p247/offer-cost.mjs, build/p253/funnel-before-after.mts and
 * vscode-catches.mts deleted, and build/p250/funnel.mts kept without its live
 * measurement, because conformance:pathdoors rule 15 runs its self-test.
 */
const OPERATOR_ARGV_CEILING = 98;

/**
 * RULE 6, ITS SECOND COUNT (the probe review of Phase 352). The scripts under
 * build/, besides the helper and this gate, that aim `-L gmux` through a
 * command line a shell is handed: `tmux … -L gmux` inside one string in their
 * code. The p98 to p131 family counts his server as
 * `'tmux -L gmux list-sessions 2>/dev/null | wc -l'` under `/bin/sh -c`, and
 * the argv count above never reads that spelling, so a NEW bare count written
 * that way arrived with this gate green while its header said none could.
 * Rule 5f does not read these lines either (build/electron-run.mjs's header
 * states that limit), which is one more reason no new one may arrive.
 * Measured at 32 at 8b63abc1 and at this phase's HEAD alike (the seven probes
 * Phase 285 converted counted in argv form), and re-derived by the probe review
 * with a comment stripper of its own over the same 32 files. LOWER IT in the
 * same commit as a round that takes one out; never raise it.
 */
const OPERATOR_SHELL_CEILING = 32;

/**
 * The one file that is allowed to name an Electron program in a spawn, plus the
 * one packing hook that runs the packed executable once with --version and
 * exits. That hook runs inside electron-builder's own process during
 * `npm run package`, before any window exists, and it uses execFileSync with a
 * timeout, so it cannot outlive its own call.
 */
const EXEMPT = new Set([HELPER, 'assert-skills-cli.cjs']);

// ---------------------------------------------------------------------------
// Reading source
// ---------------------------------------------------------------------------

// stripComments, lineAt, callArguments and blockAt were this file's own until
// Phase 193, which needed the same four to ask the same question about ssh.
// They are in build/scan-source.mjs now, unchanged, and the reason each one is
// written the way it is stays in that file's header. This file still exports
// stripComments, because that name was part of its surface.

/**
 * The four program paths that start Tortie, plus the bare name the shell
 * resolves through node_modules/.bin. A caller that computes one of these into
 * a variable is caught by the identifier rule below instead.
 */
const PROGRAM_PATHS = [
  'node_modules/.bin/electron',
  'Electron.app/Contents/MacOS/Electron',
  'Tortie.app/Contents/MacOS/Tortie',
  // The packaged bundle assembled with join(), which is how
  // build/update-rehearsal.mjs used to name it.
  "'Contents', 'MacOS', 'Tortie'",
  "'Contents', 'MacOS', 'Electron'"
];

/**
 * The variables in one file that were assigned an Electron path, whatever they
 * were called. Without this a file could spawn `bin` and pass, which is exactly
 * how the first draft of this gate was defeated on 2026-08-23 by a variable
 * named `bin` holding node_modules/.bin/electron.
 */
function electronVariables(code) {
  const names = new Set();
  const decl = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]*);/g;
  let m;
  while ((m = decl.exec(code)) !== null) {
    const value = m[2];
    if (PROGRAM_PATHS.some((path) => value.includes(path))) names.add(m[1]);
    else if (/'\.bin'\s*,\s*'electron'/.test(value)) names.add(m[1]);
    else if (/^\s*(['"])electron\1\s*$/.test(value)) names.add(m[1]);
  }
  return names;
}

/** Whether this argument text names a program that starts an Electron. */
function namesElectron(programText, secondText, variables) {
  const text = programText ?? '';
  for (const name of variables ?? []) {
    if (new RegExp(`\\b${name}\\b`).test(text)) return true;
  }
  for (const path of PROGRAM_PATHS) {
    if (text.includes(path)) return true;
  }
  if (/^(['"])electron\1$/.test(text)) return true;
  if (/^(['"])npx\1$/.test(text)) {
    return /^\[\s*(['"])electron\1/.test(secondText ?? '');
  }
  // A variable whose name says what it holds. This is what catches
  // `spawn(electronBin, ...)` and `spawn(packaged ? packagedBin : electronBin)`.
  if (/\belectron/i.test(text)) return true;
  if (/\bpackagedbin\b/i.test(text)) return true;
  if (/\btortiebin\b/i.test(text)) return true;
  // The two names the packaged probes give the bundle's own executable.
  if (/\bappbinary\b/i.test(text)) return true;
  if (/\bpristinebinary\b/i.test(text)) return true;
  return false;
}

/**
 * Every place in one file where an Electron program is handed to a spawn. The
 * result is what both the real scan and the fixtures read, so the fixtures
 * prove the same code the gate runs.
 */
export function electronSpawns(name, source) {
  const code = stripComments(source);
  const variables = electronVariables(code);
  const hits = [];
  const call = /\b(spawn|spawnSync|execFile|execFileSync|exec)\s*\(/g;
  let m;
  while ((m = call.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    const args = callArguments(code, open);
    if (!namesElectron(args[0], args[1], variables)) continue;
    hits.push({
      file: name,
      line: lineAt(code, m.index),
      call: `${m[1]}(${(args[0] ?? '').split('\n')[0].trim()}, ...)`
    });
  }
  return hits;
}

/**
 * Whether this file reaches the helper.
 *
 * THE IMPORT IS MATCHED AT ANY DEPTH since Phase 240's fix round, and that is
 * the other half of the walk above. The pattern was `./electron-run.mjs`
 * exactly, so a probe one directory down importing `../electron-run.mjs` read
 * as not reaching the helper even once the walk found it: making the walk
 * recursive ALONE would have raised the population by 51 files and left the
 * derived helper set at 95, counting neither of Phase 240's two probes and
 * moving no constant at all. Measured on 2026-09-08: 95 with the old pattern
 * over the walked population, 97 with this one.
 */
export function usesHelper(source) {
  const code = stripComments(source);
  const imported = /from\s+['"](?:\.\.?\/)+electron-run\.mjs['"]/.test(code);
  const called = /\b(withElectron|runElectron)\s*\(/.test(code);
  return { imported, called };
}

/**
 * Every file under build/ that reaches the helper, derived rather than listed.
 *
 * `read` is injected so the fixture arm can drive this over files that are not
 * in the tree, which is what lets rule 2's floor be proved rather than recited.
 */
export function helperUsers(names, read) {
  const found = [];
  for (const name of names) {
    if (NOT_A_HELPER_USER.has(name)) continue;
    const use = usesHelper(read(name));
    if (use.imported && use.called) found.push(name);
  }
  return found;
}

/**
 * Rule 2 itself, as a function, so the fixture arm can watch it refuse.
 * Returns a finding, or null when the population meets the floor.
 */
export function floorFinding(count, floor) {
  if (count >= floor) return null;
  return {
    what:
      `only ${String(count)} files under build/ reach build/${HELPER}, and ` +
      `the floor is ${String(floor)}`,
    detail:
      'The population that routes its Electron launch through the helper has ' +
      'SHRUNK. Either a probe left the tree, or a probe stopped calling ' +
      'withElectron/runElectron and now starts an Electron some other way, ' +
      'which is the shape that left about 480 MB running on 2026-08-22. Run ' +
      '`node build/assert-electron-teardown.mjs --list` and diff it against ' +
      'the same command at the parent commit to see which file went. If the ' +
      'deletion was deliberate, lower HELPER_USER_FLOOR in this file in that ' +
      'same commit and say which file went in the commit body.'
  };
}

/**
 * An argv aimed at the operator's own server: the pair `'-L', 'gmux'` in any of
 * the three quotes. A scratch socket such as `'gmux-p352'` is not it, because
 * the quote must close on `gmux`.
 *
 * The attached `-Lgmux` is not matched HERE, because reading it as text
 * counted a comment in prose: build/scan-source.mjs's stripComments loses its
 * place after a template holding a template inside `${…}`, so
 * build/p324/probe-p324.mjs:157, a comment that quotes `-Lgmux`, reached the
 * scan as code (measured for Phase 285). Since the fix round of Phase 352 it
 * IS counted, and so is every other spelling rule 5f reads, as an ELEMENT of
 * an argv {@link operatorSocketVerbs} finds (see {@link aimsOperatorSocket}).
 */
const OPERATOR_ARGV = /(['"`])-L\1\s*,\s*(['"`])gmux\2/;

/**
 * Whether one script aims an argv at `-L gmux` (rule 6), comments stripped:
 * the literal pair anywhere, or any spelling rule 5f reads inside an argv (the
 * fix round of Phase 352), so the ceiling counts what 5f refuses.
 */
export function aimsOperatorSocket(source) {
  return OPERATOR_ARGV.test(stripComments(source)) || operatorSocketVerbs(source).length > 0;
}

/**
 * A command line aimed at `-L gmux` inside one string (rule 6's second count):
 * the word `tmux`, then only flags and their values, then `-L gmux` or the
 * attached `-Lgmux`, on one line and inside one literal. A scratch socket such
 * as `-L gmux-p217` is not it, and neither is prose that names tmux and later
 * the socket (build/p342/measure-p342.mjs's "Never -L gmux, never this Mac's
 * tmux", which a looser reading counted).
 */
const OPERATOR_SHELL =
  /(['"`])[^'"`\n]*\btmux(?:\s+-[A-Za-z0-9]+(?:\s+[^\s'"`-][^\s'"`]*)?)*\s+-L\s*gmux(?![\w-])/;

/** Whether one script hands a shell a command line aimed at `-L gmux`, comments stripped. */
export function aimsOperatorSocketByShell(source) {
  return OPERATOR_SHELL.test(stripComments(source));
}

/**
 * Rule 6 itself, as a function, so the fixture arm can watch it refuse.
 * Returns a finding, or null when the count is at or under the ceiling.
 */
export function ceilingFinding(count, ceiling, how = 'aim an argv at', constant = 'OPERATOR_ARGV_CEILING') {
  if (count <= ceiling) return null;
  return {
    what:
      `${String(count)} scripts under build/ besides build/${HELPER} and this ` +
      `gate ${how} -L gmux, and the ceiling is ${String(ceiling)}`,
    detail:
      "A script has started counting or reading the operator's own tmux " +
      'server itself. Since Phase 285 build/electron-run.mjs is the one reader ' +
      'of that server, around a launch that names a scratch socket and by ' +
      'identity, so a probe that ' +
      'launches through it needs no count of its own, and a bare count fails ' +
      'the probe whenever he starts or ends a session of his own. Take the ' +
      `count out of the script rather than raising ${constant}.`
  };
}

// ---------------------------------------------------------------------------
// The helper's own shape
// ---------------------------------------------------------------------------
/**
 * Whether withElectron ends its launch inside a `finally` block. The braces are
 * matched rather than the word searched, because the word appears in this
 * file's own prose and in the helper's header.
 */
export function helperKillsInFinally(source) {
  const code = stripComments(source);
  const at = code.indexOf('export async function withElectron');
  if (at === -1) return { ok: false, why: 'withElectron is not exported from it.' };
  const bodyOpen = code.indexOf('{', code.indexOf(')', at));
  const body = blockAt(code, bodyOpen);
  if (body === null) return { ok: false, why: 'the braces of withElectron do not close.' };
  const fin = body.indexOf('finally');
  if (fin === -1) {
    return { ok: false, why: 'withElectron has no finally block.' };
  }
  const finBody = blockAt(body, body.indexOf('{', fin));
  if (finBody === null) {
    return { ok: false, why: 'the braces of the finally block do not close.' };
  }
  if (!/\bteardown\s*\(/.test(finBody)) {
    return {
      ok: false,
      why: 'the finally block of withElectron does not call teardown().'
    };
  }
  return { ok: true, why: null };
}

// ---------------------------------------------------------------------------
// The fixtures
// ---------------------------------------------------------------------------

/**
 * The three fixtures, written from a template.
 *
 * `LAUNCH` and `PROGRAM` are placeholders that are substituted immediately
 * before each file is written. They are placeholders for one reason: with the
 * real words in place, this file's own source would read as a direct launch and
 * would fail its own rule 1. The bytes that reach disk are exactly what a probe
 * looked like before Phase 140.
 */
function fixture(text) {
  return text.replace(/LAUNCH/g, 'spa' + 'wn').replace(/PROGRAM/g, 'bin');
}

/** Launches through the helper. The scanner must find nothing in it. */
const GOOD_FIXTURE = fixture(`
import { runElectron } from './electron-run.mjs';
const out = await runElectron({
  label: 'fixture',
  userDataDir: '/tmp/p140-fixture'
});
process.exit(out.code === 0 ? 0 : 1);
`);

/** Spawns the shim itself, which is the shape this gate exists to refuse. */
const BAD_FIXTURE = fixture(`
import { LAUNCH } from 'node:child_process';
const PROGRAM = 'node_modules/.bin/electron';
const child = LAUNCH(PROGRAM, ['.', '--user-data-dir=/tmp/p140-fixture']);
await new Promise((r) => child.on('exit', r));
child.kill('SIGKILL');
`);

/**
 * The same launch with the path assembled so no line reads as an Electron path,
 * under a variable name that says nothing. This is how a rule like this gets
 * around by accident, so the scanner has to catch it by the value the variable
 * was given rather than by what it was called.
 */
const SLY_FIXTURE = fixture(`
import { LAUNCH } from 'node:child_process';
const PROGRAM = ['node_modules', '.bin', 'electron'].join('/');
const child = LAUNCH(PROGRAM, ['.', '--user-data-dir=/tmp/p140-fixture']);
child.on('exit', () => {});
`);

/**
 * Run the scanner over three files this script writes, so a pass says the
 * scanner still separates the shapes. The files are written under a scratch
 * directory and removed afterwards. Nothing is launched.
 */
function runFixtures(failures) {
  const dir = mkdtempSync(join(tmpdir(), 'p140-gate-'));
  try {
    const good = join(dir, 'fixture-good.mjs');
    const bad = join(dir, 'fixture-bad.mjs');
    const sly = join(dir, 'fixture-sly.mjs');
    writeFileSync(good, GOOD_FIXTURE);
    writeFileSync(bad, BAD_FIXTURE);
    writeFileSync(sly, SLY_FIXTURE);

    const goodHits = electronSpawns('fixture-good.mjs', readFileSync(good, 'utf8'));
    const goodUse = usesHelper(readFileSync(good, 'utf8'));
    const badHits = electronSpawns('fixture-bad.mjs', readFileSync(bad, 'utf8'));
    const badUse = usesHelper(readFileSync(bad, 'utf8'));

    if (goodHits.length !== 0) {
      failures.push({
        what: 'the good fixture was reported as a direct launch',
        detail:
          `It launches through runElectron and the scanner found ` +
          `${String(goodHits.length)} direct spawn(s) in it. The scanner is ` +
          'reporting a false alarm, so every pass it prints is worthless.'
      });
    }
    if (!goodUse.imported || !goodUse.called) {
      failures.push({
        what: 'the good fixture was not seen to use the helper',
        detail: `imported=${String(goodUse.imported)} called=${String(goodUse.called)}.`
      });
    }
    if (badHits.length !== 1) {
      failures.push({
        what: 'the bad fixture was not caught',
        detail:
          `It spawns node_modules/.bin/electron directly and the scanner ` +
          `found ${String(badHits.length)} direct launch(es) rather than 1. ` +
          'This gate cannot catch a real one either.'
      });
    }
    if (badUse.imported || badUse.called) {
      failures.push({
        what: 'the bad fixture was seen to use the helper',
        detail: `imported=${String(badUse.imported)} called=${String(badUse.called)}.`
      });
    }
    const slyHits = electronSpawns('fixture-sly.mjs', readFileSync(sly, 'utf8'));
    if (slyHits.length !== 1) {
      failures.push({
        what: 'the fixture that hides the name was not caught',
        detail:
          'It assigns node_modules/.bin/electron to a variable called "bin" ' +
          `and spawns that, and the scanner found ${String(slyHits.length)} ` +
          'direct launch(es) rather than 1. A rule that only reads the ' +
          'variable name is defeated by renaming the variable.'
      });
    }
    // Rule 2's own fixture. A floor nobody has seen refuse a count is
    // indistinguishable from no floor at all, and the hand list it replaced
    // failed in exactly that way for eighty phases: it was both the claim and
    // the thing checked, so it could not disagree with itself. These two calls
    // are the disagreement made possible. The floor must refuse a population
    // one short of itself and accept one that meets it.
    let floorRefused = 0;
    const below = floorFinding(HELPER_USER_FLOOR - 1, HELPER_USER_FLOOR);
    const at = floorFinding(HELPER_USER_FLOOR, HELPER_USER_FLOOR);
    if (below === null) {
      failures.push({
        what: 'the floor accepted a population one file short of itself',
        detail:
          `floorFinding(${String(HELPER_USER_FLOOR - 1)}, ` +
          `${String(HELPER_USER_FLOOR)}) returned null. Rule 2 cannot notice ` +
          'a probe leaving the tree or leaving the helper, which is the only ' +
          'thing it is for.'
      });
    } else floorRefused += 1;
    if (at !== null) {
      failures.push({
        what: 'the floor refused a population that meets it',
        detail:
          `floorFinding(${String(HELPER_USER_FLOOR)}, ` +
          `${String(HELPER_USER_FLOOR)}) returned a finding. The floor is a ` +
          'minimum and not an equality, so adding a probe must never turn ' +
          'this gate red.'
      });
    }

    // And the derivation itself, over files that are not in the tree, so a
    // pass says helperUsers() still separates the shapes rather than that the
    // tree happens to be clean today.
    const derived = helperUsers(
      ['fixture-good.mjs', 'fixture-bad.mjs', 'fixture-sly.mjs'],
      (name) => readFileSync(join(dir, name), 'utf8')
    );
    if (derived.length !== 1 || derived[0] !== 'fixture-good.mjs') {
      failures.push({
        what: 'the derivation did not pick out the file that reaches the helper',
        detail:
          `It answered [${derived.join(', ')}] over three fixtures of which ` +
          'exactly one calls runElectron. A derivation that miscounts makes ' +
          'the floor meaningless in whichever direction it is wrong.'
      });
    }

    return {
      good: goodHits.length,
      bad: badHits.length,
      sly: slyHits.length,
      floorRefused
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Rule 5 (Phase 261). The socket refusal, the announcement and the census.
// ---------------------------------------------------------------------------
/**
 * WHY RULE 5 IS HERE AND WHY IT DRIVES RATHER THAN READS.
 *
 * Twice a probe launched with `GMUX_TMUX_SOCKET` set and no harness term, the
 * app therefore ignored it, and sessions appeared on `-L gmux`, the operator's
 * live server. Phase 86.1's table says the next round touching build/ must make
 * the HARNESS refuse such a launch rather than rely on a person reading a
 * warning, because a person reading it had been measured at 0 of 2.
 *
 * The refusal lives in build/electron-run.mjs, and this rule proves it by
 * CALLING the shipping `withElectron` rather than by reading it, for the reason
 * `conformance:redline-write` gives about the guarded write: a gate on a
 * refusal has to run the refusal, because reading it is what let the defect
 * ship. Nothing is launched. Every arm here is refused BEFORE a spawn, which is
 * exactly what arm 5b establishes.
 *
 * The arms:
 *
 *   5a  a composed env naming a socket with no harness term is refused, the
 *       message names GMUX_PROBES, and a sentinel proves the body never ran.
 *   5b  the same call with GMUX_PROBES added and a program that is not there
 *       is refused for the PROGRAM. That is how this rule proves 5a passed
 *       without launching anything: a different refusal is a refusal reached
 *       later.
 *   5c  a named tmuxSocket against an env naming a different socket, and
 *       against an env naming none. Both refused, both messages naming the pair.
 *   5d  the readers and the judgements, over fixture texts: the announcement,
 *       and since Phase 285 the census BY IDENTITY, being every clause of
 *       censusVerdict over planted rows, the reader's parse of tmux's own
 *       answers, the manifest read, and judgeCensus's order driven with
 *       readers of this gate's own, so no fixture ever reaches tmux.
 *   5e  build/harness-socket.mjs names a harness term inside the argument
 *       object of the same spawn() call that names GMUX_TMUX_SOCKET, read by
 *       matching brackets, proved on three planted texts.
 *   5f  every `-L gmux` argv in electron-run.mjs AND in every script under
 *       build/ that imports it is a list-sessions, the verb read past the
 *       client flags tmux takes before one and a spread or a computed verb
 *       refused, proved on planted texts; and the helper's reader carries the
 *       `-u` that keeps the census format's tabs (Phase 285). Since the probe
 *       review of Phase 352 what FOLLOWS list-sessions is read too: tmux runs a
 *       second command after any argument ending in `;`.
 *   5g  an env naming the operator's OWN server is refused whatever else the
 *       launch sets, with a control that must still reach the program check.
 *   5h  the two backstops are WIRED into withElectron rather than merely
 *       exported, read by matching braces and proved on planted texts; the
 *       census read is taken around a launch that names a scratch socket and
 *       only there (his allowance of 2026-11-02; the fix round of Phase 352
 *       refuses a read on every launch), sits above the spawn, is
 *       judged in the finally and has its failures thrown; and since the probe
 *       review of Phase 352 the verdict is handed this launch's own manifest,
 *       its scratch folders, the socket it asked for and what the app
 *       announced, each of which carries a clause.
 *
 * 5g AND 5h ARE THE FIX ROUND'S AND EACH CLOSES A HOLE A VERIFIER DROVE. 5g's
 * shape walked past all four layers: `GMUX_TMUX_SOCKET: 'gmux'` with a harness
 * term beside it and `tmuxSocket: null`, which is an override the app OBEYS
 * rather than one it ignores. 5h's hole was this gate's own: it drove the pure
 * `announcementFinding` and `censusFinding` and never asked whether anything
 * CALLED them, so deleting the three lines in `withElectron`'s reader that
 * reject on a disagreeing announcement, and replacing the census read with
 * `null`, each left this gate printing OK at exit 0 while the backstops did
 * nothing. A judgement nothing asks is not a backstop.
 *
 * And ablations, one clause each, every one of which must turn a named arm
 * red. Each ablated copy is required to LOAD and answer before its arm is
 * judged, because a copy that will not load fails for the wrong reason and
 * proves nothing about the clause, which is Phase 219's rule. Phase 285 added
 * one per clause of the census judgement, each moving the one fixture that
 * clause owns.
 *
 * NO ARM HERE EVER REACHES TMUX. Every driven launch is refused before the
 * census read, which sits below the program check, and every census fixture is
 * a planted row handed to a pure function or to judgeCensus with readers of
 * this gate's own. `-L gmux` is named by build/electron-run.mjs's reader alone.
 */

/** The four terms, scrubbed from a fixture env so 5a can be driven here. */
const HARNESS_TERM_NAMES = [
  'GMUX_SMOKE',
  'GMUX_SHOT',
  'GMUX_UPDATE_REHEARSAL',
  'GMUX_PROBES'
];

/**
 * A scratch profile path outside the repository and outside the home, so the
 * profile refusal is never what answers in these arms.
 */
function fixtureProfile() {
  return join(tmpdir(), 'p261-gate-profile-never-created');
}

/** Call `withElectron` and report what it did, never what it should have done. */
async function drive(helper, options) {
  let ran = false;
  try {
    await helper.withElectron(options, async () => {
      ran = true;
      return 'the body ran';
    });
    return { threw: false, message: '', ran };
  } catch (err) {
    return { threw: true, message: String(err?.message ?? err), ran };
  }
}

/**
 * The runtime arms, over one loaded copy of the helper. `tag` names which copy,
 * so an ablation's failures read as its own.
 *
 * Returns the readings rather than pushing failures, so the ablation half can
 * assert that a reading MOVED without repeating the expectations.
 */
async function socketReadings(helper) {
  const profile = fixtureProfile();
  // The process's own terms are scrubbed out of every fixture env, because this
  // gate may itself be run from inside a harness and an inherited GMUX_PROBES
  // would make 5a unable to fail.
  const scrub = {};
  for (const n of HARNESS_TERM_NAMES) scrub[n] = undefined;

  // EVERY ARM NAMES A PROGRAM THAT IS NOT THERE, and that is a safety property
  // rather than tidiness. An ablated copy of the 2a clause accepts the launch,
  // and with the default program it would then really start the operator's app
  // against -L gmux, which is the very thing this rule exists to stop. With no
  // program on disk the ablated copy is refused by the program check instead,
  // so the reading moves from one message to the other and nothing is ever
  // spawned. The ORDER, being that layer 2 sits above the profile refusal and
  // above the program check, is asked separately by the `order` arm below,
  // where the profile is the thing that is wrong.
  const dead = { program: '/nonexistent/p261', entry: false };

  const a = await drive(helper, {
    label: 'p261-5a',
    userDataDir: profile,
    ...dead,
    env: { ...scrub, GMUX_TMUX_SOCKET: 'gmux-p261-gate' }
  });
  const b = await drive(helper, {
    label: 'p261-5b',
    userDataDir: profile,
    ...dead,
    env: { ...scrub, GMUX_TMUX_SOCKET: 'gmux-p261-gate', GMUX_PROBES: '0' }
  });
  const order = await drive(helper, {
    label: 'p261-5a-order',
    userDataDir: 'not-absolute-and-not-a-profile',
    ...dead,
    env: { ...scrub, GMUX_TMUX_SOCKET: 'gmux-p261-gate' }
  });
  const cDiffers = await drive(helper, {
    label: 'p261-5c-differs',
    userDataDir: profile,
    ...dead,
    tmuxSocket: 'gmux-p261-teardown',
    env: { ...scrub, GMUX_TMUX_SOCKET: 'gmux-p261-other', GMUX_PROBES: '0' }
  });
  const cAbsent = await drive(helper, {
    label: 'p261-5c-absent',
    userDataDir: profile,
    ...dead,
    tmuxSocket: 'gmux-p261-teardown',
    env: { ...scrub, GMUX_TMUX_SOCKET: undefined }
  });
  // 5g's three, and the control is what stops a clause that refuses everything
  // reading as a clause that refuses the right thing.
  const liveGmux = await drive(helper, {
    label: 'p261-5g-gmux',
    userDataDir: profile,
    ...dead,
    tmuxSocket: null,
    env: { ...scrub, GMUX_TMUX_SOCKET: 'gmux', GMUX_PROBES: '0' }
  });
  const liveDefault = await drive(helper, {
    label: 'p261-5g-default',
    userDataDir: profile,
    ...dead,
    tmuxSocket: null,
    env: { ...scrub, GMUX_TMUX_SOCKET: 'default', GMUX_PROBES: '0' }
  });
  const liveControl = await drive(helper, {
    label: 'p261-5g-control',
    userDataDir: profile,
    ...dead,
    tmuxSocket: null,
    env: { ...scrub, GMUX_TMUX_SOCKET: 'gmux-p261-gate', GMUX_PROBES: '0' }
  });
  return { a, b, order, cDiffers, cAbsent, liveGmux, liveDefault, liveControl };
}

/**
 * Every driven launch that is in a shape layer 2 must refuse. The pass sentence
 * counts this list rather than quoting a number, so an arm added here moves the
 * sentence with it.
 */
const WRONG_SHAPES = (live) => [
  live.a,
  live.order,
  live.cDiffers,
  live.cAbsent,
  live.liveGmux,
  live.liveDefault
];

/** True when this reading is the layer 2 socket refusal and not a later one. */
function isSocketRefusal(reading) {
  return (
    reading.threw &&
    /GMUX_TMUX_SOCKET is |names the scratch tmux socket/.test(reading.message)
  );
}

/** 5d, over the pure reader and the pure judgement. */
function announcementReadings(helper) {
  const line = '[gmux-socket] local tmux socket: gmux-p261-1 (GMUX_TMUX_SOCKET=gmux-p261-1, harness launch: yes)';
  const wrong = '[gmux-socket] local tmux socket: gmux (GMUX_TMUX_SOCKET=gmux-p261-1, harness launch: no)';
  return {
    absent: helper.socketFromAnnouncement('nothing here at all\n'),
    present: helper.socketFromAnnouncement(`${line}\n`),
    twice: helper.announcedSockets(`${line}\n${wrong}\n`),
    leadingNoise: helper.socketFromAnnouncement(`some log\nmore log\n${line}\n`),
    // The line arriving as two chunks. The reader is asked of the accumulated
    // text, so what matters is that a half line followed by its other half
    // reads as one line once both have landed.
    chunked: helper.socketFromAnnouncement(
      '[gmux-socket] local tmux so' + 'cket: gmux-p261-1 (rest)\n'
    ),
    // A line the app quoted out of its own child's output. It is read, and that
    // is the fail-closed direction: it can only ever refuse a launch, never
    // pass one.
    quoted: helper.socketFromAnnouncement(`said: "x"\n${wrong}\n`),
    // The four combinations of the judgement.
    noWant: helper.announcementFinding({ wanted: '', announced: 'gmux' }),
    noAnswer: helper.announcementFinding({ wanted: 'gmux-p261-1', announced: null }),
    agrees: helper.announcementFinding({ wanted: 'gmux-p261-1', announced: 'gmux-p261-1' }),
    differs: helper.announcementFinding({ wanted: 'gmux-p261-1', announced: 'gmux' })
  };
}

// ---------------------------------------------------------------------------
// 5d's census half (Phase 285): every clause of the judgement, over rows.
// ---------------------------------------------------------------------------

/** One planted census row. The paths are made up and nothing reads them. */
const ROW = (id, gmuxId, name, path, extra = {}) => ({
  id,
  gmuxId,
  created: '1793000000',
  name,
  path,
  ...extra
});

/** A census reading tmux answered. */
const READ = (rows, unreadable = []) => ({ ok: true, why: null, rows, unreadable });

/** This launch's scratch folder, in both spellings, as scratchRootsFor answers it. */
const CENSUS_SCRATCH = ['/private/var/tmp/p285-gate-run', '/var/tmp/p285-gate-run'];

/** The socket this launch asked for. */
const CENSUS_WANTED = 'gmux-p285-gate';

/** His server before the launch: two of his sessions and his control session. */
const CENSUS_BEFORE = READ([
  ROW('$1', 'his-one', 'claude-1', '/Users/p285-operator/one'),
  ROW('$2', 'his-two', 'codex-2', '/Users/p285-operator/two'),
  ROW('$3', '', 'gmux-control', '/Users/p285-operator')
]);

/** This launch's own manifest, read and readable. */
const OWN_MANIFEST = { exists: true, ok: true, ids: ['own-0001'], why: null };

/**
 * Every census fixture, as the input censusVerdict is handed and what it must
 * answer. `failures` and `notes` are counts, and `says` a pattern one failure
 * (or, with no failure expected, one note) must hold.
 */
const CENSUS_FIXTURES = [
  {
    key: 'unchanged',
    name: 'nothing moved, the rows read in another order',
    input: { after: READ([...CENSUS_BEFORE.rows].reverse()) },
    failures: 0,
    notes: 0
  },
  {
    key: 'rename',
    name: 'he renamed one of his sessions, which keeps its $-id, and the app announced the scratch socket',
    // Since the fix round of Phase 352 a rename is judged as a session that
    // went is: a note after an agreeing announcement. It was nothing, so a
    // launch whose app renamed one of his sessions went unseen.
    input: {
      after: READ([
        ROW('$1', 'his-one', 'claude-1-renamed', '/Users/p285-operator/one'),
        ...CENSUS_BEFORE.rows.slice(1)
      ])
    },
    failures: 0,
    notes: 1,
    says: /\$1 "claude-1" was renamed "claude-1-renamed".*the operator's own/
  },
  {
    key: 'renameSilent',
    name: 'a session was renamed and the app announced nothing',
    input: {
      after: READ([
        ROW('$1', 'his-one', 'claude-1-renamed', '/Users/p285-operator/one'),
        ...CENSUS_BEFORE.rows.slice(1)
      ]),
      announced: []
    },
    failures: 1,
    notes: 0,
    says: /\$1 "claude-1" was RENAMED.*never said/
  },
  {
    key: 'restartAgreed',
    name: 'his server restarted and his app brought every session back, gmux-control among them, the app announcing the scratch socket',
    // Every session is new by identity, because a restarted server numbers
    // from $0 again with new creation times. His stamped ones are his by (c),
    // the ones that went are his after the agreeing announcement, and the
    // unstamped gmux-control answers for the gmux-control that went.
    input: {
      after: READ([
        ROW('$0', 'his-one', 'claude-1', '/Users/p285-operator/one', { created: '1793009999' }),
        ROW('$1', 'his-two', 'codex-2', '/Users/p285-operator/two', { created: '1793009999' }),
        ROW('$2', '', 'gmux-control', '/Users/p285-operator', { created: '1793009999' })
      ]),
      again: READ([
        ROW('$0', 'his-one', 'claude-1', '/Users/p285-operator/one', { created: '1793009999' }),
        ROW('$1', 'his-two', 'codex-2', '/Users/p285-operator/two', { created: '1793009999' }),
        ROW('$2', '', 'gmux-control', '/Users/p285-operator', { created: '1793009999' })
      ]),
      manifest: OWN_MANIFEST
    },
    failures: 0,
    notes: 6,
    says: /\$2 "gmux-control" appeared .*under the name of \$3 "gmux-control".*his server restarting/
  },
  {
    key: 'restartSilent',
    name: 'his server restarted the same way and the app announced nothing',
    input: {
      after: READ([
        ROW('$0', 'his-one', 'claude-1', '/Users/p285-operator/one', { created: '1793009999' }),
        ROW('$1', 'his-two', 'codex-2', '/Users/p285-operator/two', { created: '1793009999' }),
        ROW('$2', '', 'gmux-control', '/Users/p285-operator', { created: '1793009999' })
      ]),
      again: READ([
        ROW('$0', 'his-one', 'claude-1', '/Users/p285-operator/one', { created: '1793009999' }),
        ROW('$1', 'his-two', 'codex-2', '/Users/p285-operator/two', { created: '1793009999' }),
        ROW('$2', '', 'gmux-control', '/Users/p285-operator', { created: '1793009999' })
      ]),
      manifest: OWN_MANIFEST,
      announced: []
    },
    failures: 4,
    notes: 2,
    says: /\$2 "gmux-control" APPEARED .*no @gmux-id/
  },
  {
    key: 'restartOtherStamp',
    name: 'an unstamped session appeared under the name of a STAMPED one that went, which is no restart',
    input: {
      after: READ([CENSUS_BEFORE.rows[0], CENSUS_BEFORE.rows[2], ROW('$9', '', 'codex-2', '/Users/p285-operator/two')]),
      again: READ([CENSUS_BEFORE.rows[0], CENSUS_BEFORE.rows[2], ROW('$9', '', 'codex-2', '/Users/p285-operator/two')]),
      manifest: OWN_MANIFEST
    },
    failures: 1,
    notes: 1,
    says: /\$9 "codex-2" APPEARED .*no @gmux-id/
  },
  {
    key: 'restarted',
    name: "a $-id a restarted server numbered again, now this launch's own session",
    // A server that restarts numbers its sessions from $0 again, so the
    // creation time is half of a session's identity: keyed by $-id alone this
    // would read as a rename of his, which is nothing.
    input: {
      after: READ([
        ROW('$1', 'own-0001', 'shell-1-6', '/Users/p285-operator/three', { created: '1793000999' }),
        ...CENSUS_BEFORE.rows.slice(1)
      ]),
      manifest: OWN_MANIFEST
    },
    failures: 1,
    notes: 1,
    says: /\$1 "shell-1-6" .*this launch's own manifest/
  },
  {
    key: 'his',
    name: "his: a session stamped by an app that is not this launch, under a home-like folder",
    input: {
      after: READ([...CENSUS_BEFORE.rows, ROW('$9', 'his-nine', 'shell-1-7', '/Users/p285-operator/three')]),
      manifest: OWN_MANIFEST
    },
    failures: 0,
    notes: 1,
    says: /\$9 .*the operator's own/
  },
  {
    key: 'ownManifest',
    name: "(a) a session whose stamp is in this launch's own manifest",
    input: {
      after: READ([...CENSUS_BEFORE.rows, ROW('$9', 'own-0001', 'shell-1-6', '/Users/p285-operator/three')]),
      manifest: OWN_MANIFEST
    },
    failures: 1,
    notes: 0,
    says: /\$9 .*this launch's own manifest/
  },
  {
    key: 'scratchRaw',
    name: "(a') a session started under the scratch folder, spelled /var",
    input: {
      after: READ([...CENSUS_BEFORE.rows, ROW('$9', 'foreign-9', 'shell-1-6', '/var/tmp/p285-gate-run/project')]),
      manifest: OWN_MANIFEST
    },
    failures: 1,
    notes: 0,
    says: /\$9 .*scratch folder/
  },
  {
    key: 'scratchResolved',
    name: "(a') a session whose folder resolves under the scratch folder",
    input: {
      after: READ([
        ...CENSUS_BEFORE.rows,
        ROW('$9', 'foreign-9', 'shell-1-6', '/Users/p285-operator/link', {
          resolved: '/private/var/tmp/p285-gate-run/project'
        })
      ]),
      manifest: OWN_MANIFEST
    },
    failures: 1,
    notes: 0,
    says: /\$9 .*scratch folder/
  },
  {
    key: 'unstampedStill',
    name: '(b) an unstamped session still unstamped a second later',
    input: {
      after: READ([...CENSUS_BEFORE.rows, ROW('$9', '', 'shell-1-6', '/Users/p285-operator/three')]),
      again: READ([...CENSUS_BEFORE.rows, ROW('$9', '', 'shell-1-6', '/Users/p285-operator/three')]),
      manifest: OWN_MANIFEST
    },
    failures: 1,
    notes: 0,
    says: /\$9 .*no @gmux-id/
  },
  {
    key: 'unstampedGone',
    name: '(b) an unstamped session gone again a second later',
    input: {
      after: READ([...CENSUS_BEFORE.rows, ROW('$9', '', 'shell-1-6', '/Users/p285-operator/three')]),
      again: READ(CENSUS_BEFORE.rows),
      manifest: OWN_MANIFEST
    },
    failures: 1,
    notes: 0,
    says: /\$9 .*no @gmux-id/
  },
  {
    key: 'controlFresh',
    name: '(b) a fresh gmux-control on a server that had none',
    input: {
      before: READ(CENSUS_BEFORE.rows.slice(0, 2)),
      after: READ(CENSUS_BEFORE.rows),
      again: READ(CENSUS_BEFORE.rows)
    },
    failures: 1,
    notes: 0,
    says: /\$3 "gmux-control".*no @gmux-id/
  },
  {
    key: 'stampedLater',
    name: 'the re-read: unstamped at first, stamped by another app a second later',
    input: {
      after: READ([...CENSUS_BEFORE.rows, ROW('$9', '', 'claude-1-8', '/Users/p285-operator/three')]),
      again: READ([...CENSUS_BEFORE.rows, ROW('$9', 'his-late', 'claude-1-8', '/Users/p285-operator/three')]),
      manifest: OWN_MANIFEST
    },
    failures: 0,
    notes: 1,
    says: /\$9 .*his-late.*the operator's own/
  },
  {
    key: 'stampedLaterOwn',
    name: "the re-read: stamped a second later with this launch's own id",
    input: {
      after: READ([...CENSUS_BEFORE.rows, ROW('$9', '', 'shell-1-6', '/Users/p285-operator/three')]),
      again: READ([...CENSUS_BEFORE.rows, ROW('$9', 'own-0001', 'shell-1-6', '/Users/p285-operator/three')]),
      manifest: OWN_MANIFEST
    },
    failures: 1,
    notes: 0,
    says: /this launch's own manifest/
  },
  {
    key: 'manifestUnreadable',
    name: "a stamped session appeared and this launch's own manifest could not be read",
    input: {
      after: READ([...CENSUS_BEFORE.rows, ROW('$9', 'foreign-9', 'shell-1-6', '/Users/p285-operator/three')]),
      manifest: { exists: true, ok: false, ids: [], why: 'sqlite3 answered exit 1' }
    },
    failures: 1,
    notes: 0,
    says: /could not be told from his/
  },
  {
    key: 'manifestMissing',
    name: 'a stamped session appeared and this launch wrote no manifest at all',
    input: {
      after: READ([...CENSUS_BEFORE.rows, ROW('$9', 'foreign-9', 'shell-1-6', '/Users/p285-operator/three')]),
      manifest: { exists: false, ok: true, ids: [], why: null }
    },
    failures: 0,
    notes: 1,
    says: /the operator's own/
  },
  {
    key: 'manifestNeverAsked',
    name: 'a stamped session appeared and nothing asked the manifest',
    input: {
      after: READ([...CENSUS_BEFORE.rows, ROW('$9', 'foreign-9', 'shell-1-6', '/Users/p285-operator/three')])
    },
    failures: 1,
    notes: 0,
    says: /could not be told from his/
  },
  {
    key: 'wentSilent',
    name: 'a session WENT and the app announced nothing',
    input: { after: READ([CENSUS_BEFORE.rows[0], CENSUS_BEFORE.rows[2]]), announced: [] },
    failures: 1,
    notes: 0,
    says: /\$2 .*WENT.*never said/
  },
  {
    key: 'wentAgreed',
    name: 'a session WENT and every announcement named the scratch socket',
    input: {
      after: READ([CENSUS_BEFORE.rows[0], CENSUS_BEFORE.rows[2]]),
      announced: [CENSUS_WANTED, CENSUS_WANTED]
    },
    failures: 0,
    notes: 1,
    says: /\$2 .*went.*the operator's own/
  },
  {
    key: 'wentDisagreed',
    name: 'a session WENT and one announcement named his server',
    input: {
      after: READ([CENSUS_BEFORE.rows[0], CENSUS_BEFORE.rows[2]]),
      announced: [CENSUS_WANTED, 'gmux']
    },
    failures: 1,
    notes: 0,
    says: /\$2 .*WENT.*gmux/
  },
  {
    key: 'wentNoWant',
    name: 'a session WENT from a launch that asked for no socket',
    input: {
      after: READ([CENSUS_BEFORE.rows[0], CENSUS_BEFORE.rows[2]]),
      wanted: '',
      announced: ['gmux-p285-other']
    },
    failures: 1,
    notes: 0,
    says: /asked for none/
  },
  {
    key: 'unreadableFresh',
    name: 'a row that does not read as one appeared',
    input: { after: READ(CENSUS_BEFORE.rows, ['$9_foreign_1793000000_shell']) },
    failures: 1,
    notes: 0,
    says: /did not read as a session/
  },
  {
    key: 'unreadableKnown',
    name: 'the same unreadable row was there before the launch',
    input: {
      before: READ(CENSUS_BEFORE.rows, ['$7 a row of his']),
      after: READ(CENSUS_BEFORE.rows, ['$7 a row of his'])
    },
    failures: 0,
    notes: 0
  },
  {
    key: 'readFailed',
    name: 'tmux could not answer after the launch',
    input: {
      after: { ok: false, why: 'tmux answered exit 1: lost server', rows: [], unreadable: [] }
    },
    failures: 1,
    notes: 0,
    says: /could not be read after/
  }
];

/**
 * 5d's census half: every fixture through the verdict, the reader's parse,
 * the manifest read, and the order judgeCensus asks things in, driven with
 * readers of this gate's own. Readings rather than failures, so an ablation can
 * be shown to MOVE one.
 */
async function censusReadings(helper, rootsDir) {
  const verdicts = {};
  for (const f of CENSUS_FIXTURES) {
    verdicts[f.key] = helper.censusVerdict({
      before: CENSUS_BEFORE,
      scratchRoots: CENSUS_SCRATCH,
      wanted: CENSUS_WANTED,
      announced: [CENSUS_WANTED],
      ...f.input
    });
  }

  const parse = {
    ships: helper.censusReading({
      status: 0,
      stdout: '$1\this-one\t1793000000\tone two\t/a/b\tc\n$3\t\t1793000001\tgmux-control\t/x\n'
    }),
    fourFields: helper.censusReading({ status: 0, stdout: '$4\tid\t1793000000\tname\n' }),
    notAnId: helper.censusReading({ status: 0, stdout: 'x4\tid\t1793000000\tname\t/p\n' }),
    // The parent's measurement: with no UTF-8 locale tmux sends each tab as _.
    underscored: helper.censusReading({
      status: 0,
      stdout: '$0_p352-foreign-id_1793659956_/private/x_one two\n'
    }),
    noServer: helper.censusReading({
      status: 1,
      stderr: 'no server running on /private/tmp/tmux-501/gmux\n'
    }),
    noSocket: helper.censusReading({
      status: 1,
      stderr: 'error connecting to /private/tmp/tmux-501/gmux (No such file or directory)\n'
    }),
    refused: helper.censusReading({
      status: 1,
      stderr: 'error connecting to /private/tmp/tmux-501/gmux (Permission denied)\n'
    }),
    notRun: helper.censusReading({
      error: Object.assign(new Error('spawnSync tmux ENOENT'), { code: 'ENOENT' }),
      status: null
    })
  };

  // This launch's scratch folders, over directories this gate made under the
  // system temporary root, so nothing outside it is ever resolved.
  const roots = {
    spellings: [helper.bothSpellings('/private/var/tmp/x'), helper.bothSpellings('/tmp/y')],
    harnessAndProfile: helper.scratchRootsFor({
      harnessDir: join(rootsDir, 'harness'),
      userDataDir: join(rootsDir, 'harness', 'p', 'profile'),
      tmp: tmpdir(),
      home: join(rootsDir, 'home-like')
    }),
    profileInTmp: helper.scratchRootsFor({
      userDataDir: join(tmpdir(), 'p285-gate-profile-in-the-temporary-root'),
      tmp: tmpdir(),
      home: join(rootsDir, 'home-like')
    }),
    profileAtHome: helper.scratchRootsFor({
      userDataDir: join(rootsDir, 'home-like', 'profile'),
      tmp: tmpdir(),
      home: join(rootsDir, 'home-like')
    }),
    profileAboveHome: helper.scratchRootsFor({
      userDataDir: join(rootsDir, 'profile'),
      tmp: tmpdir(),
      home: join(rootsDir, 'home-like')
    }),
    harnessMissing: helper.scratchRootsFor({
      harnessDir: join(rootsDir, 'not-there'),
      userDataDir: join(tmpdir(), 'p285-gate-profile-in-the-temporary-root'),
      tmp: tmpdir(),
      home: join(rootsDir, 'home-like')
    })
  };

  const manifest = {
    good: helper.manifestReading({ status: 0, stdout: '0f2c8a3e-1b4d-4e5f-9a6b-7c8d9e0f1a2b\nown-0001\n' }),
    badId: helper.manifestReading({ status: 0, stdout: 'own-0001\nnot an id;\n' }),
    failed: helper.manifestReading({ status: 1, stderr: 'Error: no such table: sessions\n' })
  };

  // The order, with readers of this gate's own and no tmux anywhere.
  const order = async (reads, resolvePath = () => null) => {
    const log = { reads: 0, waited: [], manifests: 0 };
    const verdict = await helper.judgeCensus({
      before: CENSUS_BEFORE,
      read: () => {
        log.reads += 1;
        return reads[Math.min(log.reads, reads.length) - 1];
      },
      wait: async (ms) => {
        log.waited.push(ms);
      },
      manifest: () => {
        log.manifests += 1;
        return OWN_MANIFEST;
      },
      resolvePath,
      scratchRoots: CENSUS_SCRATCH,
      wanted: CENSUS_WANTED,
      announced: [CENSUS_WANTED]
    });
    return { ...log, verdict };
  };
  const nine = (gmuxId, path = '/Users/p285-operator/three') => ROW('$9', gmuxId, 'shell-1-6', path);
  const orders = {
    nothing: await order([CENSUS_BEFORE]),
    stamped: await order([READ([...CENSUS_BEFORE.rows, nine('his-nine')])]),
    unstamped: await order([
      READ([...CENSUS_BEFORE.rows, nine('')]),
      READ([...CENSUS_BEFORE.rows, nine('his-late')])
    ]),
    resolved: await order([READ([...CENSUS_BEFORE.rows, nine('his-nine', '/Users/p285-operator/link')])], (path) =>
      path === '/Users/p285-operator/link' ? '/private/var/tmp/p285-gate-run/project' : null
    )
  };
  return {
    verdicts,
    parse,
    roots,
    rootsDir: realpathSync(rootsDir),
    manifest,
    orders,
    format: helper.CENSUS_FORMAT,
    rereadMs: helper.CENSUS_REREAD_MS
  };
}

/** What 5d requires of the census readings, as failures. */
function censusExpectations(census) {
  const out = [];
  const say = (what, detail) => out.push({ what: `5d: ${what}`, detail });
  for (const f of CENSUS_FIXTURES) {
    const v = census.verdicts[f.key];
    const got = `${String(v.failures.length)} failure(s) and ${String(v.notes.length)} note(s)`;
    if (v.failures.length !== f.failures || v.notes.length !== f.notes) {
      say(
        `the census fixture "${f.name}" read ${got}`,
        `It must read ${String(f.failures)} failure(s) and ${String(f.notes)} note(s). It said: ` +
          `${JSON.stringify([...v.failures, ...v.notes]).slice(0, 400)}`
      );
      continue;
    }
    const said = f.failures > 0 ? v.failures : v.notes;
    if (f.says !== undefined && !said.some((s) => f.says.test(s))) {
      say(
        `the census fixture "${f.name}" said the wrong thing`,
        `It must match ${String(f.says)} and said ${JSON.stringify(said).slice(0, 400)}.`
      );
    }
  }
  const p = census.parse;
  const parseRight =
    p.ships.ok === true &&
    p.ships.rows.length === 2 &&
    p.ships.rows[0].path === '/a/b\tc' &&
    p.ships.rows[0].name === 'one two' &&
    p.ships.rows[1].gmuxId === '' &&
    p.ships.unreadable.length === 0;
  if (!parseRight) {
    say(
      'the census reader did not read its own format back',
      `It answered ${JSON.stringify(p.ships)}. Five fields split at the first four tabs, the folder taking the rest.`
    );
  }
  for (const [name, reading] of [
    ['four fields', p.fourFields],
    ['a first field that is not a $-id', p.notAnId],
    ["tabs sent as _ to a client with no UTF-8 locale", p.underscored]
  ]) {
    if (reading.ok !== true || reading.rows.length !== 0 || reading.unreadable.length !== 1) {
      say(`the census reader read a line with ${name} as a row`, `It answered ${JSON.stringify(reading)}. It is an unreadable row, and an unreadable row fails closed.`);
    }
  }
  for (const [name, reading] of [
    ['no server running', p.noServer],
    ['no socket at all', p.noSocket]
  ]) {
    if (reading.ok !== true || reading.rows.length !== 0) {
      say(`the census reader read ${name} as a failure`, `It answered ${JSON.stringify(reading)}. A server that is not there holds no sessions.`);
    }
  }
  for (const [name, reading] of [
    ['a refused connection', p.refused],
    ['a tmux that would not start', p.notRun]
  ]) {
    if (reading.ok !== false) {
      say(`the census reader read ${name} as an answer`, `It answered ${JSON.stringify(reading)}. A reading tmux could not give fails closed.`);
    }
  }
  const r = census.roots;
  const real = census.rootsDir;
  // This gate's own spelling rule, written again rather than borrowed.
  const spelled = (path) => {
    for (const [realRoot, link] of [
      ['/private/tmp', '/tmp'],
      ['/private/var', '/var']
    ]) {
      if (path.startsWith(`${realRoot}/`)) return [path, link + path.slice(realRoot.length)];
    }
    return [path];
  };
  const wantRoots = [...spelled(`${real}/harness`), ...spelled(`${real}/harness/p`)].sort();
  if (
    JSON.stringify(r.spellings) !==
    JSON.stringify([['/private/var/tmp/x', '/var/tmp/x'], ['/tmp/y', '/private/tmp/y']])
  ) {
    say('a scratch folder is not given both of its spellings', `It answered ${JSON.stringify(r.spellings)}.`);
  }
  if (JSON.stringify([...r.harnessAndProfile].sort()) !== JSON.stringify(wantRoots)) {
    say(
      "the scratch folders are not the harness directory and the profile's own folder",
      `It answered ${JSON.stringify(r.harnessAndProfile)} where ${JSON.stringify(wantRoots)} was due.`
    );
  }
  for (const [name, got] of [
    ['a profile straight under the system temporary root', r.profileInTmp],
    ['a profile straight under the home', r.profileAtHome],
    ['a profile in a folder above the home', r.profileAboveHome],
    ['a harness directory that is not there, beside a profile in the temporary root', r.harnessMissing]
  ]) {
    if (got.length !== 0) {
      say(
        `${name} made a scratch folder of a folder that is not this launch's own`,
        `It answered ${JSON.stringify(got)}. A session of the operator's that started there would ` +
          'read as one this launch made.'
      );
    }
  }
  const m = census.manifest;
  if (m.good.ok !== true || m.good.ids.length !== 2) {
    say("the manifest read refused this launch's own ids", `It answered ${JSON.stringify(m.good)}.`);
  }
  for (const [name, reading] of [
    ['a row that is not a session id', m.badId],
    ['a sqlite3 that failed', m.failed]
  ]) {
    if (reading.ok !== false || reading.exists !== true) {
      say(`the manifest read took ${name} as an answer`, `It answered ${JSON.stringify(reading)}.`);
    }
  }
  const o = census.orders;
  const orderRight =
    o.nothing.reads === 1 && o.nothing.waited.length === 0 && o.nothing.manifests === 0 &&
    o.stamped.reads === 1 && o.stamped.waited.length === 0 && o.stamped.manifests === 1 &&
    o.stamped.verdict.notes.length === 1 &&
    o.unstamped.reads === 2 && o.unstamped.waited.length === 1 &&
    o.unstamped.waited[0] >= 1000 && o.unstamped.manifests === 1 &&
    o.unstamped.verdict.failures.length === 0 && o.unstamped.verdict.notes.length === 1 &&
    o.resolved.verdict.failures.length === 1 && /scratch folder/.test(o.resolved.verdict.failures[0] ?? '');
  if (!orderRight) {
    say(
      'judgeCensus did not ask in the order the rule states',
      'It must read once, read ONE more time at least a second later only when a session that ' +
        'appeared is unstamped, ask the manifest only when one is stamped, and resolve a folder ' +
        `before judging it. It answered ${JSON.stringify(o).slice(0, 600)}.`
    );
  }
  if (census.format !== '#{session_id}\t#{@gmux-id}\t#{session_created}\t#{session_name}\t#{session_path}') {
    say('CENSUS_FORMAT moved', `It reads ${JSON.stringify(census.format)}. The folder is last and every field is split by a tab.`);
  }
  if (census.rereadMs < 1000) {
    say('the re-read is under a second', `CENSUS_REREAD_MS is ${String(census.rereadMs)}.`);
  }
  return out;
}

/** 5e's scanner, and the fixture texts that prove it. */
export function harnessTermBesideSocket(source) {
  const code = stripComments(source);
  const call = /\bspawn\s*\(/g;
  let m;
  let found = false;
  let sawSocket = false;
  while ((m = call.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    const args = callArguments(code, open);
    const carries = args.find((a) => a.includes('GMUX_TMUX_SOCKET'));
    if (carries === undefined) continue;
    sawSocket = true;
    if (HARNESS_TERM_NAMES.some((n) => carries.includes(n))) found = true;
  }
  return { sawSocket, found };
}

const TERM_FIXTURES = [
  {
    name: 'the shape that ships',
    text: `const c = spawn(cmd, { shell: true, env: { GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '0' } });`,
    want: true
  },
  {
    name: 'the socket with no term, which is what shipped before Phase 261',
    text: `const c = spawn(cmd, { shell: true, env: { GMUX_TMUX_SOCKET: socket, GMUX_HARNESS_DIR: runDir } });`,
    want: false
  },
  {
    name: 'the term in a comment beside the socket',
    text:
      `const c = spawn(cmd, { shell: true, env: {\n` +
      `  // GMUX_PROBES would go here\n` +
      `  GMUX_TMUX_SOCKET: socket\n} });`,
    want: false
  }
];

/**
 * 5h's scanner. Are the two backstops WIRED into `withElectron`, or merely
 * exported?
 *
 * This is asked of `withElectron`'s OWN braces, because the hole it closes was
 * a judgement that still answered while nothing asked it. Two properties, and
 * each is read structurally rather than by searching the file for a word:
 *
 *   announcement  the body calls `announcementFinding(`, assigns it a name, and
 *                 the guard that decides on THAT NAME holds a call to the
 *                 rejection. `if (false) {` therefore reads as unwired, which
 *                 is the ablation, and so does a block with the reject deleted.
 *   census        `censusBefore` is `tmuxSocket !== null ? liveSessionRows() :
 *                 null` and nothing else, so it is read around a launch that
 *                 names a scratch socket and only there, which is his
 *                 allowance of 2026-11-02 as it reads (Phase 285 had removed
 *                 the guard and the fix round of Phase 352 put it back, so a
 *                 read on every launch is refused here); that read
 *                 sits ABOVE the spawn; and the `finally` block hands it to
 *                 `judgeCensus` with the live reader beside it and throws the
 *                 verdict's failures. A census read after the spawn would miss
 *                 exactly the sessions it exists to see, and a verdict nobody
 *                 throws is a census nobody reads.
 *
 * @param {string} source
 * @returns {{announcement: boolean, census: boolean, why: string[]}}
 */
export function backstopWiring(source) {
  const why = [];
  const code = stripComments(source);
  const body = functionBodyOf(code, 'withElectron');
  if (body === null) {
    return {
      announcement: false,
      census: false,
      why: ['withElectron has no body this scanner can read']
    };
  }

  // The announcement half.
  let announcement = false;
  const call = body.indexOf('announcementFinding(');
  if (call === -1) why.push('withElectron never calls announcementFinding()');
  else {
    const named = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$/.exec(
      body.slice(0, call)
    );
    if (named === null) {
      why.push('the announcementFinding() call is not assigned to a name');
    } else {
      const name = named[1];
      const guards = /if\s*\(/g;
      guards.lastIndex = call;
      let g;
      while ((g = guards.exec(body)) !== null) {
        const open = g.index + g[0].length - 1;
        const shut = closeOf(body, open);
        if (shut === -1) break;
        const condition = body.slice(open + 1, shut);
        if (!new RegExp(`\\b${name}\\b`).test(condition)) continue;
        // Both spellings of a guarded statement: a braced block, and the one
        // statement form a refactor may well produce. Taking only the braced
        // one would read a correct refactor as unwired, which is a gate that
        // cries wolf, and this scanner has to be able to fail for the right
        // reason only.
        const rest = body.slice(shut + 1);
        const lead = /^\s*/.exec(rest)?.[0].length ?? 0;
        const guarded =
          rest[lead] === '{'
            ? blockAt(body, shut + 1 + lead)
            : rest.slice(lead, rest.indexOf(';', lead) + 1);
        // `announcementRejected` is a FLAG and not the rejection: the call is
        // what has to be there, so the name is read as a call rather than as a
        // substring.
        if (guarded !== null && /announcementReject\s*\??\.?\(/.test(guarded)) {
          announcement = true;
        }
        break;
      }
      if (!announcement) {
        why.push(
          `nothing in withElectron rejects on ${name}: the guard that names ` +
            'it is gone, or it no longer holds the rejection'
        );
      }
    }
  }

  // The census half, read around a launch that names a scratch socket and
  // judged by identity (Phase 285, and his allowance of 2026-11-02 as it reads).
  let census = false;
  const assigned = /\b(?:const|let|var)\s+censusBefore\s*=\s*([^;]+);/.exec(body);
  if (assigned === null) why.push('withElectron never reads censusBefore');
  else if (!/^tmuxSocket\s*!==\s*null\s*\?\s*liveSessionRows\s*\(\s*\)\s*:\s*null$/.test(assigned[1].trim())) {
    why.push(
      `censusBefore is ${assigned[1].trim()} rather than the live reading, taken ` +
        'around a launch that names a scratch socket and only there'
    );
  } else {
    // Asked as a pattern rather than as the literal text, because
    // build/assert-background-teardown.mjs discovers spawn call names by
    // scanning for exactly that literal and a string holding it reads as a
    // call this file makes.
    const spawnAt = body.search(/\bspawn\s*\(/);
    if (spawnAt !== -1 && assigned.index > spawnAt) {
      why.push('the census is read AFTER the spawn, so it cannot see the launch');
    } else {
      const fin = /\bfinally\s*\{/.exec(body);
      const block = fin === null ? null : blockAt(body, fin.index + fin[0].length - 1);
      const call = block === null ? -1 : block.search(/\bjudgeCensus\s*\(/);
      const argument =
        call === -1 ? '' : callArguments(block, block.indexOf('(', call)).join(', ');
      if (block === null) why.push('withElectron has no finally block to read');
      else if (call === -1) why.push('the finally block never hands the census to judgeCensus');
      else if (!/\bbefore\s*:\s*censusBefore\b/.test(argument)) {
        why.push('judgeCensus is never handed censusBefore');
      } else if (!/\bread\s*:\s*liveSessionRows\b/.test(argument)) {
        why.push('judgeCensus does not read the live server after the launch');
      } else if (!/\bmanifest\s*:\s*\(\s*\)\s*=>\s*launchManifestIds\s*\(\s*userDataDir\s*\)\s*[,}]/.test(argument)) {
        // THE VERDICT'S OTHER FOUR INPUTS (the probe review of Phase 352). Each
        // carries a clause: the manifest (a), the scratch folders (a'), and the
        // socket asked for with what the app announced, which decide whether a
        // session that went is his. Each was ablated in a copy of the helper
        // with this gate green until they were read here.
        why.push("judgeCensus is not asked this launch's own manifest, so clause (a) can never fire");
      } else if (!scratchRootsWired(argument)) {
        why.push("judgeCensus is not handed this launch's scratch folders, so clause (a') can never fire");
      } else if (!/\bwanted\s*:\s*wantedSocket\s*[,}]/.test(argument)) {
        why.push('judgeCensus is not handed the socket this launch asked for, so a session that went is judged against another');
      } else if (!/\bannounced\s*:\s*announcedSockets\s*\(\s*text\s*\)\s*[,}]/.test(argument)) {
        why.push('judgeCensus is not handed what the app announced, so a session that went can read as his whatever the app said');
      } else if (!/\.failures\b[\s\S]*\bthrow\b/.test(block.slice(call))) {
        why.push("the verdict's failures are never thrown");
      } else census = true;
    }
  }
  return { announcement, census, why };
}

/**
 * Whether judgeCensus is handed `scratchRootsFor` over BOTH of this launch's
 * scratch folders: the harness directory its composed environment names and
 * its profile (the probe review of Phase 352).
 */
function scratchRootsWired(argument) {
  const m = /\bscratchRoots\s*:\s*scratchRootsFor\s*\(\s*\{([^}]*)\}\s*\)\s*[,}]/.exec(argument);
  return m !== null && /\bGMUX_HARNESS_DIR\b/.test(m[1]) && /\buserDataDir\b/.test(m[1]);
}

/**
 * The arguments the shipping withElectron hands judgeCensus, written once so
 * every 5h fixture is one edit of them. `null` leaves an argument out.
 */
const JUDGE_ARGS = {
  before: 'before: censusBefore',
  read: 'read: liveSessionRows',
  manifest: 'manifest: () => launchManifestIds(userDataDir)',
  scratchRoots: "scratchRoots: scratchRootsFor({ harnessDir: childEnv['GMUX_HARNESS_DIR'], userDataDir })",
  wanted: 'wanted: wantedSocket',
  announced: 'announced: announcedSockets(text)'
};

/** The finally block's judgement, with the named arguments swapped, and what follows it. */
function judgedText(swap = {}, tail = 'if (census.failures.length > 0) throw new Error(censusSentence(census.failures));', order = null) {
  const args = { ...JUDGE_ARGS, ...swap };
  const keys = order ?? Object.keys(args);
  const list = keys.map((k) => args[k]).filter((v) => v !== null && v !== undefined);
  return `await teardown(entry, grace);
        const census = await judgeCensus({ ${list.join(',\n          ')} });
        ${tail}`;
}

/**
 * 5h's fixtures, built from one template so each differs from the shape that
 * ships in exactly the one place its name says. Three must make the scanner
 * answer true on both halves, the shipping shape and two spellings of it a
 * refactor might reasonably produce, and every other one must make one half
 * answer false, so the scanner is seen to fail AND seen not to be a tautology.
 */
const WIRED = {
  before: 'const censusBefore = tmuxSocket !== null ? liveSessionRows() : null;',
  reject: `if (finding !== null) {
            announcementRejected = true;
            announcementReject?.(new Error(finding));
          }`,
  judged: judgedText()
};

/** One withElectron, the shipping shape with the named parts swapped. */
function wiringText({ before = WIRED.before, after = '', reject = WIRED.reject, judged = WIRED.judged } = {}) {
  return `export async function withElectron(options, body) {
      ${before}
      try {
        const child = spawn(bin, argv, {});
        ${after}
        const onText = (b) => {
          const finding = announcementFinding({ wanted, announced: all });
          ${reject}
        };
      } finally {
        ${judged}
      }
    }`;
}

const WIRING_FIXTURES = [
  { name: 'the shape that ships', text: wiringText(), want: { announcement: true, census: true } },
  {
    name: 'a truthy guard spelled without the comparison',
    text: wiringText({ reject: 'if (finding) announcementReject?.(new Error(finding));' }),
    want: { announcement: true, census: true }
  },
  {
    name: 'the guard made constant, which is the ablation',
    text: wiringText({ reject: 'if (false) {\n            announcementReject?.(new Error(finding));\n          }' }),
    want: { announcement: false, census: true }
  },
  {
    name: 'the finding computed and thrown away',
    text: wiringText({ reject: 'if (finding !== null) {\n            announcementRejected = true;\n          }' }),
    want: { announcement: false, census: true }
  },
  {
    name: 'the census read replaced by null',
    text: wiringText({ before: 'const censusBefore = null;' }),
    want: { announcement: true, census: false }
  },
  {
    name: 'the census read on every launch, outside his allowance of 2026-11-02',
    text: wiringText({ before: 'const censusBefore = liveSessionRows();' }),
    want: { announcement: true, census: false }
  },
  {
    name: 'the census read after the spawn',
    text: wiringText({ before: '', after: 'const censusBefore = tmuxSocket !== null ? liveSessionRows() : null;' }),
    want: { announcement: true, census: false }
  },
  {
    name: 'the census never judged in the finally',
    text: wiringText({ judged: 'await teardown(entry, grace);' }),
    want: { announcement: true, census: false }
  },
  {
    name: 'the census judged against no live reading after the launch',
    text: wiringText({ judged: judgedText({ read: 'read: () => censusBefore' }) }),
    want: { announcement: true, census: false }
  },
  {
    name: "the verdict judged and its failures never thrown",
    text: wiringText({ judged: judgedText({}, "console.error(census.failures.join('; '));") }),
    want: { announcement: true, census: false }
  },
  // The probe review of Phase 352: the verdict's other four inputs, each taken
  // away alone, and the same six arguments in another order, which must pass.
  {
    name: 'the same six arguments in another order',
    text: wiringText({
      judged: judgedText({}, undefined, ['announced', 'wanted', 'scratchRoots', 'manifest', 'read', 'before'])
    }),
    want: { announcement: true, census: true }
  },
  {
    name: "the census judged with no manifest of this launch's own, clause (a)",
    text: wiringText({ judged: judgedText({ manifest: 'manifest: () => ({ exists: false, ok: true, ids: [], why: null })' }) }),
    want: { announcement: true, census: false }
  },
  {
    name: 'the census judged with no manifest argument at all',
    text: wiringText({ judged: judgedText({ manifest: null }) }),
    want: { announcement: true, census: false }
  },
  {
    name: "the census judged with no scratch folders, clause (a')",
    text: wiringText({ judged: judgedText({ scratchRoots: 'scratchRoots: []' }) }),
    want: { announcement: true, census: false }
  },
  {
    name: 'the census judged with the profile but not the harness directory',
    text: wiringText({ judged: judgedText({ scratchRoots: 'scratchRoots: scratchRootsFor({ userDataDir })' }) }),
    want: { announcement: true, census: false }
  },
  {
    name: 'the census judged with the socket the app announced taken as the one asked for',
    text: wiringText({ judged: judgedText({ wanted: "wanted: announcedSockets(text)[0] ?? ''" }) }),
    want: { announcement: true, census: false }
  },
  {
    name: 'the census judged with the announcement forged to agree',
    text: wiringText({ judged: judgedText({ announced: 'announced: [wantedSocket]' }) }),
    want: { announcement: true, census: false }
  }
];

/**
 * The tmux client flags a verb may sit behind, which change nothing the verb
 * does to a server: `-u` (UTF-8), `-2` and `-8` (colours), `-v` (verbose).
 */
const CLIENT_FLAGS = new Set(['-u', '-2', '-8', '-v']);

/** One argv element's literal value, or null when it is not a plain literal. */
function literalOf(text) {
  const m = /^(['"`])([^'"`\\]*)\1$/.exec(String(text ?? '').trim());
  if (m === null) return null;
  return m[1] === '`' && m[2].includes('${') ? null : m[2];
}

/**
 * The bracket that opens the argv or argument list holding `at`, read
 * BACKWARD from it, or -1 when it is in none.
 *
 * BACKWARD ON PURPOSE. A template literal holding another template inside its
 * `${…}` loses the place of any reader that walks the whole file forward from
 * its top, build/scan-source.mjs's stripComments included, and that is
 * measured rather than feared: build/probe-p64-arch.mjs's census argv at its
 * line 257 read as being inside a string to a forward reader. An argv is a
 * short run of elements just before the pair, so the walk only ever crosses
 * those: each string it meets is skipped back to its opening quote on the
 * same line, and one it cannot bound there is a place it does not claim to
 * know, answered -1, which 5f refuses.
 */
function openBracketBefore(code, at) {
  let depth = 0;
  for (let i = at - 1; i >= 0; i -= 1) {
    const c = code[i];
    if (c === "'" || c === '"' || c === '`') {
      const open = code.lastIndexOf(c, i - 1);
      if (open < code.lastIndexOf('\n', i - 1) + 1) return -1;
      i = open;
      continue;
    }
    if (c === ')' || c === ']' || c === '}') depth += 1;
    else if (c === '(' || c === '[' || c === '{') {
      if (depth === 0) return i;
      depth -= 1;
    }
  }
  return -1;
}

/**
 * 5f's scanner (Phase 261, widened by Phase 285): every argv in one file that
 * aims at `-L gmux`, with the verb it was given.
 *
 * It finds `'-L', 'gmux'` ANYWHERE in a bracketed argv or a call's argument
 * list, and reads the verb as the first element after the pair that is not a
 * client flag, so `['-u', '-L', 'gmux', 'list-sessions']` reads `list-sessions`
 * and `['-L', 'gmux', '-u', 'new-session']` reads `new-session`. A spread, a
 * name, a call or a template there is a verb nobody can read, answered as
 * `null`, and refused. Until Phase 285 the pattern wanted the verb straight
 * after `'gmux'`, so the first argv held no argv at all to it and the second
 * read `-u` as its verb.
 *
 * AND EVERY SPELLING OF HIS SERVER THE TEXT ITSELF SAYS (the fix round of
 * Phase 352). Since Phase 285 a session that went during an agreeing launch
 * reads as his, which is safe only while this rule sees every argv that could
 * end one. It read the literal pair alone, and a verify lens planted four
 * spellings in a script importing the helper, each passing this gate at exit 0
 * while the parent's census failed the end it made: `'-Lgmux'`, `'-L', HIS`
 * with `const HIS = 'gmux'`, `'-L', 'g' + 'mux'`, and `'-S',
 * '/private/tmp/tmux-501/gmux'`. So it reads, in any bracketed argv: `-L` with
 * a value that is `gmux`, the attached `-Lgmux`, and `-S` (or `-S…`) with a
 * path that is `gmux` or ends in `/gmux`, where a value is a literal, a name
 * the text declares as one, a template whose every `${…}` is such a name or a
 * `+` of these, and a path may also be a template or a `join` or `resolve`
 * whose last part says it. STATED LIMIT: a value computed at run time is not
 * read, and the new spellings outside any argv this scanner can read are not
 * read either; the literal pair keeps its refusal there.
 *
 * @returns {{verb: string|null, why: string|null, flags: string[], line: number}[]}
 */
export function operatorSocketVerbs(source) {
  const code = stripComments(source);
  const pair = new RegExp(OPERATOR_ARGV.source, 'g');
  const hits = [];
  const read = new Set();
  const opens = [];
  let m;
  while ((m = pair.exec(code)) !== null) {
    const open = openBracketBefore(code, m.index);
    if (open === -1 || code[open] === '{') {
      hits.push({ verb: null, why: 'it is in no argv this scanner can read', flags: [], line: lineAt(code, m.index) });
      continue;
    }
    opens.push(open);
  }
  // The other spellings: an argv holding a literal that opens with -L or -S,
  // or a name this text declares as one.
  const flag = /(['"`])-[LS]/g;
  while ((m = flag.exec(code)) !== null) {
    const open = openBracketBefore(code, m.index);
    if (open !== -1 && code[open] !== '{') opens.push(open);
  }
  for (const name of declaredFlagNames(code)) {
    const use = new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}(?![\\w$])`, 'g');
    while ((m = use.exec(code)) !== null) {
      const open = openBracketBefore(code, m.index);
      if (open !== -1 && code[open] !== '{') opens.push(open);
    }
  }
  for (const open of opens) {
    if (read.has(open)) continue;
    read.add(open);
    const line = lineAt(code, open);
    const elements = callArguments(code, open);
    for (let k = 0; k < elements.length; k += 1) {
      const past = socketAimAt(code, elements, k);
      if (past === null) continue;
      const flags = elements.slice(0, k).map(literalOf).filter((v) => CLIENT_FLAGS.has(v));
      let j = past;
      while (j < elements.length && CLIENT_FLAGS.has(literalOf(elements[j]))) {
        flags.push(literalOf(elements[j]));
        j += 1;
      }
      const element = elements[j];
      if (element === undefined || element === '') {
        hits.push({ verb: null, why: 'no verb follows it', flags, line });
      } else if (element.startsWith('...')) {
        hits.push({ verb: null, why: `its verb is a spread, ${element}`, flags, line });
      } else if (literalOf(element) === null) {
        hits.push({ verb: null, why: `its verb is computed, ${element.split('\n')[0]}`, flags, line });
      } else {
        // A verb other than list-sessions is refused as it stands; the one verb
        // allowed is asked what follows it as well.
        const verb = literalOf(element);
        const chained = verb === 'list-sessions' ? chainAfter(code, elements.slice(j + 1)) : null;
        hits.push(chained === null ? { verb, why: null, flags, line } : { verb: null, why: chained, flags, line });
      }
      k = j;
    }
  }
  return hits;
}

/**
 * Where element `k` of an argv aims at his server: the index of the element
 * after its socket, or null when it does not (the fix round of Phase 352).
 * `-L` then a value that is `gmux`, `-Lgmux`, and `-S` then a path, or `-S…`,
 * that is `gmux` or ends in `/gmux`.
 */
function socketAimAt(code, elements, k) {
  const v = staticValueOf(code, elements[k]);
  if (v === null) return null;
  if (v === '-L') return staticValueOf(code, elements[k + 1]) === 'gmux' ? k + 2 : null;
  if (v === '-Lgmux') return k + 1;
  if (v === '-S') return pathIsHisSocket(code, elements[k + 1]) ? k + 2 : null;
  if (v.startsWith('-S') && v.length > 2) return hisSocketPath(v.slice(2)) ? k + 1 : null;
  return null;
}

/** A socket path that is `gmux` or ends in `/gmux`. */
const hisSocketPath = (path) => path === 'gmux' || path.endsWith('/gmux');

/**
 * Whether a `-S` value names his socket: a value the text says, or a template
 * whose text after its last `${…}` says it, or a `join` or `resolve` whose
 * last part does.
 */
function pathIsHisSocket(code, text) {
  const v = staticValueOf(code, text);
  if (v !== null) return hisSocketPath(v);
  const t = String(text ?? '').trim();
  const tpl = /^`((?:\\.|[^\\`])*)`$/.exec(t);
  if (tpl !== null) return hisSocketPath(tpl[1].slice(tpl[1].lastIndexOf('}') + 1));
  if (/^(?:[A-Za-z_$][\w$]*\s*\.\s*)?(?:join|resolve)\s*\(/.test(t) && t.endsWith(')')) {
    const args = callArguments(t, t.indexOf('('));
    const last = staticValueOf(code, args[args.length - 1]);
    return last !== null && hisSocketPath(last);
  }
  return false;
}

/**
 * The value one element's text holds when the text itself says so, or null:
 * a literal with its escapes kept as written, a name the text declares as one
 * (`declaredLiteral`), a template whose every `${…}` is such a name, a `+` of
 * any of these, parenthesised or not. Anything computed at run time is null.
 */
function staticValueOf(code, text, depth = 0) {
  const t = String(text ?? '').trim();
  if (t === '' || depth > 6) return null;
  if (t.startsWith('(') && closeOf(t, 0) === t.length - 1) return staticValueOf(code, t.slice(1, -1), depth + 1);
  const parts = plusParts(t);
  if (parts.length > 1) {
    let out = '';
    for (const part of parts) {
      const v = staticValueOf(code, part, depth + 1);
      if (v === null) return null;
      out += v;
    }
    return out;
  }
  const quoted = /^(['"])((?:\\.|(?!\1)[^\\\n])*)\1$/.exec(t);
  if (quoted !== null) return quoted[2];
  const tpl = /^`((?:\\.|[^\\`])*)`$/.exec(t);
  if (tpl !== null) {
    let known = true;
    const v = tpl[1].replace(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (_all, name) => {
      const said = declaredLiteral(code, name);
      if (said === null) known = false;
      return said ?? '';
    });
    return known && !v.includes('${') ? v : null;
  }
  if (/^[A-Za-z_$][\w$]*$/.test(t)) return declaredLiteral(code, t);
  return null;
}

/** One expression's text split at every `+` outside a string or a bracket. */
function plusParts(t) {
  const parts = [];
  let depth = 0;
  let quote = '';
  let from = 0;
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];
    if (quote !== '') {
      if (c === '\\') i += 1;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') depth -= 1;
    else if (c === '+' && depth === 0 && t[i + 1] !== '+' && t[i - 1] !== '+' && t[i + 1] !== '=') {
      parts.push(t.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(t.slice(from));
  return parts;
}

/** The names this text declares as a literal that opens with `-L` or `-S`. */
function declaredFlagNames(code) {
  const names = new Set();
  for (const m of code.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(['"`])-[LS]/g)) {
    const v = declaredLiteral(code, m[1]);
    if (v !== null && /^-[LS]/.test(v)) names.add(m[1]);
  }
  return names;
}

/**
 * The literal a name is declared as in the same text, being `const NAME = '…';`
 * exactly once, its body as written with its escapes kept, or null.
 */
function declaredLiteral(code, name) {
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) return null;
  const re = new RegExp(
    '\\bconst\\s+' + name.replace(/\$/g, '\\$') + '\\s*=\\s*([\'"`])((?:\\\\.|(?!\\1)[^\\\\\\n])*)\\1\\s*;',
    'g'
  );
  const found = [...code.matchAll(re)];
  if (found.length !== 1) return null;
  const [, quote, body] = found[0];
  return quote === '`' && body.includes('${') ? null : body;
}

/**
 * WHY A VERB IS NOT THE WHOLE ARGV (the probe review of Phase 352). tmux ends
 * one command at any argument that ends in an unescaped `;` and runs the next,
 * measured on 3.6a and 3.7b over scratch servers: `list-sessions -F x ';'
 * kill-session -t v` and `list-sessions -F 'x;' kill-session -t v` each ended
 * `v`. So an argv whose verb is `list-sessions` can still end a session, and
 * since Phase 285 a session that went during an agreeing launch reads as his.
 * Every element after the verb must be a plain literal, or a name this text
 * declares as one (the helper's own `CENSUS_FORMAT`), and none may end in an
 * unescaped `;`. Returns why not, or null.
 */
function chainAfter(code, rest) {
  for (const element of rest) {
    const text = String(element ?? '').trim();
    if (text === '') continue;
    if (text.startsWith('...')) {
      return `an element after its verb is a spread, ${text}, which could hold a ';' and a second command`;
    }
    // A literal may hold escapes here (a format's `\t`), which literalOf, the
    // verb's own reader, refuses; its body is read as written.
    const quoted = /^(['"`])((?:\\.|(?!\1)[^\\])*)\1$/.exec(text);
    let value = quoted === null || (quoted[1] === '`' && quoted[2].includes('${')) ? null : quoted[2];
    if (value === null) value = declaredLiteral(code, text);
    if (value === null) {
      return `an element after its verb is computed, ${text.split('\n')[0]}, which could end in a ';' and run a second command`;
    }
    if (/(?:^|[^\\]);$/.test(value)) {
      return `an element after its verb, ${JSON.stringify(value)}, ends in ';', which tmux reads as the end of one command and the start of another`;
    }
  }
  return null;
}

/**
 * Whether one script imports the helper, statically or by a dynamic import of
 * a path built to it: a string in its code that ends in `electron-run.mjs`.
 */
export function importsHelper(source) {
  return /(['"`])[^'"`\n]*electron-run\.mjs\1/.test(stripComments(source));
}

const VERB_FIXTURES = [
  {
    name: 'the reader that ships',
    text: `export const CENSUS_FORMAT =\n  '#{session_id}\\t#{@gmux-id}\\t#{session_created}\\t#{session_name}\\t#{session_path}';\nspawnSync('tmux', ['-u', '-L', 'gmux', 'list-sessions', '-F', CENSUS_FORMAT])`,
    want: ['list-sessions'],
    flags: ['-u']
  },
  { name: "the parent's reader", text: `spawnSync('tmux', ['-L', 'gmux', 'list-sessions', '-F', 'x'])`, want: ['list-sessions'] },
  { name: 'a planted kill-server', text: `spawnSync('tmux', ['-L', 'gmux', 'kill-server'])`, want: ['kill-server'] },
  { name: 'a planted new-session', text: `spawnSync('tmux', ['-L', 'gmux', 'new-session', '-d'])`, want: ['new-session'] },
  { name: 'a client flag before the pair', text: `spawnSync('tmux', ['-u', '-L', 'gmux', 'list-sessions', '-F', 'x'])`, want: ['list-sessions'] },
  { name: 'a client flag before a planted kill-server', text: `spawnSync('tmux', ['-u', '-L', 'gmux', 'kill-server'])`, want: ['kill-server'] },
  { name: 'a client flag after the pair', text: `spawnSync('tmux', ['-L', 'gmux', '-u', 'new-session'])`, want: ['new-session'] },
  { name: 'a spread where the verb goes', text: `execFileSync('tmux', ['-L', 'gmux', ...a])`, want: [null] },
  { name: 'a name where the verb goes', text: `execFileSync('tmux', ['-L', 'gmux', verb, '-t', x])`, want: [null] },
  { name: "a wrapper's own argument list", text: `tmux('-L', 'gmux', 'kill-session', '-t', target)`, want: ['kill-session'] },
  { name: 'a pair in a comment', text: `// spawnSync('tmux', ['-L', 'gmux', 'kill-server'])\nconst x = 1;`, want: [] },
  { name: 'a scratch socket', text: `spawnSync('tmux', ['-L', 'gmux-p285', 'kill-server'])`, want: [] },
  // The probe review of Phase 352: what follows the verb, read as tmux reads it.
  { name: "a second command after a lone ';'", text: `spawnSync('tmux', ['-L', 'gmux', 'list-sessions', ';', 'kill-session', '-t', 'x'])`, want: [null] },
  { name: "a second command after a format ending in ';'", text: `spawnSync('tmux', ['-u', '-L', 'gmux', 'list-sessions', '-F', 'x;', 'kill-server'])`, want: [null] },
  { name: 'a format the file declares as a plain literal', text: `const FMT = '#{session_name}';\nspawnSync('tmux', ['-L', 'gmux', 'list-sessions', '-F', FMT])`, want: ['list-sessions'] },
  { name: "a format the file declares ending in ';'", text: `const FMT = 'x;';\nspawnSync('tmux', ['-L', 'gmux', 'list-sessions', '-F', FMT, 'kill-server'])`, want: [null] },
  { name: 'a format the file never declares', text: `spawnSync('tmux', ['-L', 'gmux', 'list-sessions', '-F', fmt])`, want: [null] },
  { name: 'a spread after the verb', text: `spawnSync('tmux', ['-L', 'gmux', 'list-sessions', ...more])`, want: [null] },
  // The fix round of Phase 352: the four spellings a verify lens planted in a
  // script importing the helper, each green here before, and the others the
  // text itself can say, beside the controls that must stay unread.
  { name: 'the attached spelling', text: `spawnSync('tmux', ['-Lgmux', 'kill-server'])`, want: ['kill-server'] },
  { name: 'a name the text declares as gmux', text: `const HIS = 'gmux';\nspawnSync('tmux', ['-L', HIS, 'kill-server'])`, want: ['kill-server'] },
  { name: 'the socket made by a +', text: `spawnSync('tmux', ['-L', 'g'+'mux', 'kill-server'])`, want: ['kill-server'] },
  { name: 'a -S path to his socket', text: `spawnSync('tmux', ['-S', '/private/tmp/tmux-501/gmux', 'kill-server'])`, want: ['kill-server'] },
  { name: 'the attached -S spelling', text: `spawnSync('tmux', ['-S/private/tmp/tmux-501/gmux', 'kill-session', '-t', x])`, want: ['kill-session'] },
  { name: 'a -S path a template ends in /gmux', text: "spawnSync('tmux', ['-S', `${tmp}/tmux-501/gmux`, 'kill-server'])", want: ['kill-server'] },
  { name: 'a -S path joined to gmux', text: `spawnSync('tmux', ['-S', join(dir, 'gmux'), 'kill-server'])`, want: ['kill-server'] },
  { name: 'a flag the text declares as a name', text: `const FLAG = '-Lgmux';\nspawnSync('tmux', [FLAG, 'new-session', '-d'])`, want: ['new-session'] },
  { name: 'a template of a declared name', text: "const S = 'gmux';\nspawnSync('tmux', ['-L', `${S}`, 'kill-server'])", want: ['kill-server'] },
  { name: 'the attached spelling with list-sessions', text: `spawnSync('tmux', ['-u', '-Lgmux', 'list-sessions', '-F', 'x'])`, want: ['list-sessions'] },
  { name: 'a scratch socket in a declared name', text: `const S = 'gmux-p285';\nspawnSync('tmux', ['-L', S, 'kill-server'])`, want: [] },
  { name: 'a -S path to a scratch socket', text: `spawnSync('tmux', ['-S', '/tmp/x/gmux-p285', 'kill-server'])`, want: [] },
  { name: "another program's -L", text: `spawnSync('curl', ['-L', url, '-o', out])`, want: [] },
  { name: 'a socket computed at run time, the stated limit', text: `spawnSync('tmux', ['-L', process.env.SOCK, 'kill-server'])`, want: [] }
];

/** Rule 6's detector, proved on texts before it is trusted on the tree. */
const CEILING_FIXTURES = [
  { name: 'a bare count of his server', text: `spawnSync('tmux', ['-L', 'gmux', 'list-sessions'])`, want: true },
  { name: 'the pair in double quotes', text: `spawnSync("tmux", ["-L", "gmux", "list-sessions"])`, want: true },
  { name: 'the pair in a comment', text: `// spawnSync('tmux', ['-L', 'gmux', 'list-sessions'])`, want: false },
  { name: 'a scratch socket', text: `spawnSync('tmux', ['-L', 'gmux-p285', 'list-sessions'])`, want: false },
  // The fix round of Phase 352: what rule 5f reads, counted here too.
  { name: 'a name declared as gmux', text: `const SOCKET = 'gmux';\nspawnSync('tmux', ['-L', SOCKET, ...a])`, want: true },
  { name: 'the attached spelling in an argv', text: `spawnSync('tmux', ['-Lgmux', 'list-sessions'])`, want: true },
  { name: 'a -S path to his socket', text: `spawnSync('tmux', ['-S', '/private/tmp/tmux-501/gmux', 'list-sessions'])`, want: true },
  { name: 'a scratch socket in a declared name', text: `const S = 'gmux-p285';\nspawnSync('tmux', ['-L', S, 'list-sessions'])`, want: false },
  { name: 'the attached spelling in prose', text: "const said = 'the shim refuses -Lgmux and -L gmux';", want: false }
];

/** Rule 6's second detector, proved on texts before it is trusted on the tree. */
const SHELL_CEILING_FIXTURES = [
  { name: 'the p98 family’s bare count', text: `spawnSync('/bin/sh', ['-c', 'tmux -L gmux list-sessions 2>/dev/null | wc -l'])`, want: true },
  { name: 'a path to tmux and a flag before the socket', text: `run("/usr/local/bin/tmux -f /dev/null -L gmux list-sessions")`, want: true },
  { name: 'the attached spelling in a template', text: "spawnSync('/bin/sh', ['-c', `tmux -Lgmux kill-server`])", want: true },
  { name: 'a scratch socket', text: `spawnSync('/bin/sh', ['-c', 'tmux -L gmux-p285 list-sessions'])`, want: false },
  { name: 'the line in a comment', text: `// spawnSync('/bin/sh', ['-c', 'tmux -L gmux list-sessions'])`, want: false },
  { name: 'the argv form, which the first count reads', text: `spawnSync('tmux', ['-L', 'gmux', 'list-sessions'])`, want: false },
  { name: 'prose that names tmux and then the socket', text: "const said = `the tmux its own package manager installs. Never -L gmux, never this Mac's tmux.`;", want: false }
];

/**
 * Rule 6's own proof: the detector over its fixtures, and the ceiling shown a
 * count one above itself, which it must refuse, and itself, which it must not.
 * A ceiling nobody has seen refuse a count is indistinguishable from none.
 */
function runCeilingFixtures(failures) {
  for (const f of CEILING_FIXTURES) {
    const got = aimsOperatorSocket(f.text);
    if (got !== f.want) {
      failures.push({
        what: `6: the ceiling's detector read "${f.name}" as ${String(got)}`,
        detail: `It must read ${String(f.want)}. A detector nobody has seen fail is not a detector.`
      });
    }
  }
  let refused = 0;
  if (ceilingFinding(OPERATOR_ARGV_CEILING + 1, OPERATOR_ARGV_CEILING) === null) {
    failures.push({
      what: 'the ceiling accepted a count one above itself',
      detail:
        `ceilingFinding(${String(OPERATOR_ARGV_CEILING + 1)}, ` +
        `${String(OPERATOR_ARGV_CEILING)}) returned null, so a new bare count of ` +
        "the operator's server would arrive with this gate green."
    });
  } else refused += 1;
  if (ceilingFinding(OPERATOR_ARGV_CEILING, OPERATOR_ARGV_CEILING) !== null) {
    failures.push({
      what: 'the ceiling refused a count that meets it',
      detail: 'The ceiling is a maximum and not an equality, so the sweep can finish one count at a time.'
    });
  }
  // The second count (the probe review of Phase 352), proved the same way.
  for (const f of SHELL_CEILING_FIXTURES) {
    const got = aimsOperatorSocketByShell(f.text);
    if (got !== f.want) {
      failures.push({
        what: `6: the shell count's detector read "${f.name}" as ${String(got)}`,
        detail: `It must read ${String(f.want)}. A detector nobody has seen fail is not a detector.`
      });
    }
  }
  let shellRefused = 0;
  if (ceilingFinding(OPERATOR_SHELL_CEILING + 1, OPERATOR_SHELL_CEILING) === null) {
    failures.push({
      what: 'the shell count accepted a count one above its ceiling',
      detail: "A new bare count of the operator's server handed to a shell would arrive with this gate green."
    });
  } else shellRefused += 1;
  if (ceilingFinding(OPERATOR_SHELL_CEILING, OPERATOR_SHELL_CEILING) !== null) {
    failures.push({
      what: "the shell count's ceiling refused a count that meets it",
      detail: 'The ceiling is a maximum and not an equality, so the sweep can finish one count at a time.'
    });
  }
  return { refused, shellRefused };
}

/** How many failures one census fixture read, for the ablations to compare. */
function censusFails(state, key) {
  return state.census.verdicts[key].failures.length;
}

/**
 * Whether every argv the helper aims at `-L gmux` carries `-u`, being what
 * keeps the census format's tabs from reaching it as `_` (Phase 285).
 */
function readerCarriesU(source) {
  const hits = operatorSocketVerbs(source);
  return hits.length > 0 && hits.every((h) => h.flags.includes('-u'));
}

/**
 * The ablations. Each is one clause of the shipping text, removed from a copy
 * of the file in a scratch directory, and the reading it must move.
 */
const SOCKET_ABLATIONS = [
  {
    name: 'the 2a clause, the refusal of a socket with no harness term',
    file: HELPER,
    from: `  if (want !== '' && terms.length === 0) {`,
    to: `  if (false) {`,
    moved: (before, after) =>
      isSocketRefusal(before.a) &&
      !isSocketRefusal(after.a) &&
      /is not there/.test(after.a.message)
  },
  {
    name: 'the 2b clause, the refusal of a teardown socket the app is not using',
    file: HELPER,
    from: `  if (typeof tmuxSocket === 'string' && tmuxSocket !== '') {`,
    to: `  if (false) {`,
    moved: (before, after) =>
      isSocketRefusal(before.cDiffers) &&
      isSocketRefusal(before.cAbsent) &&
      !isSocketRefusal(after.cDiffers) &&
      !isSocketRefusal(after.cAbsent)
  },
  {
    name: 'the announcement comparison',
    file: HELPER,
    from: `  const wrong = announced.filter((s) => s !== wanted);`,
    to: `  const wrong = [];`,
    moved: (before, after) =>
      before.announce.differs !== null && after.announce.differs === null
  },
  // ── Phase 285. One per clause of the census judgement, each moving the one
  //    fixture that clause owns, and the reader's two halves. ──
  {
    name: 'the census comparison, which finds the sessions that appeared',
    file: HELPER,
    from: `  const fresh = [...now.values()].filter((row) => !was.has(identityOf(row)));`,
    to: `  const fresh = [];`,
    moved: (before, after) =>
      censusFails(before, 'ownManifest') === 1 && censusFails(after, 'ownManifest') === 0
  },
  {
    name: "a session's identity, its $-id together with its creation time",
    file: HELPER,
    from: 'const identityOf = (row) => `${row.id}\\t${row.created}`;',
    to: 'const identityOf = (row) => row.id;',
    moved: (before, after) =>
      censusFails(before, 'restarted') === 1 && censusFails(after, 'restarted') === 0
  },
  {
    name: "(a), a stamp in this launch's own manifest",
    file: HELPER,
    from: `    if (stamp !== '' && own.has(stamp)) {`,
    to: `    if (false) {`,
    moved: (before, after) =>
      censusFails(before, 'ownManifest') === 1 && censusFails(after, 'ownManifest') === 0
  },
  {
    name: "(a'), a session started under this launch's scratch folder",
    file: HELPER,
    from: `    const root = scratchRootHolding(row, roots);`,
    to: `    const root = null;`,
    moved: (before, after) =>
      censusFails(before, 'scratchRaw') === 1 &&
      censusFails(after, 'scratchRaw') === 0 &&
      censusFails(after, 'scratchResolved') === 0
  },
  {
    name: '(b), a session still unstamped a second later',
    file: HELPER,
    from: `    if (stamp === '') {`,
    to: `    if (false) {`,
    moved: (before, after) =>
      censusFails(before, 'unstampedStill') === 1 && censusFails(after, 'unstampedStill') === 0
  },
  {
    name: 'the re-read, as the judgement reads it for an unstamped session',
    file: HELPER,
    from: `    const reread = again === null ? undefined : later.get(identityOf(row));`,
    to: `    const reread = undefined;`,
    moved: (before, after) =>
      censusFails(before, 'stampedLater') === 0 && censusFails(after, 'stampedLater') === 1
  },
  {
    name: 'the re-read, as judgeCensus takes it a second after the after-read',
    file: HELPER,
    from:
      "  const again = fresh.some((row) => row.gmuxId === '')\n" +
      '    ? await wait(CENSUS_REREAD_MS).then(() => resolved(read()))\n' +
      '    : null;',
    to: '  const again = null;',
    moved: (before, after) =>
      before.census.orders.unstamped.reads === 2 &&
      after.census.orders.unstamped.reads === 1 &&
      after.census.orders.unstamped.verdict.failures.length === 1
  },
  // ── The fix round of Phase 352: a rename, and his server restarting. ──
  {
    name: 'a rename judged as a session that went is',
    file: HELPER,
    from: `    if (old === undefined || old.name === row.name) continue;`,
    to: `    if (true) continue;`,
    moved: (before, after) =>
      censusFails(before, 'renameSilent') === 1 && censusFails(after, 'renameSilent') === 0
  },
  {
    name: "his server's restart read as his only after an agreeing announcement",
    file: HELPER,
    from: `const restored = stamp === '' && spoke && agreed ? restorable`,
    to: `const restored = stamp === '' ? restorable`,
    moved: (before, after) =>
      censusFails(before, 'restartSilent') === 4 && censusFails(after, 'restartSilent') === 3
  },
  {
    name: "his server's restart read as his at all",
    file: HELPER,
    from: `    if (restored !== -1) {`,
    to: `    if (false) {`,
    moved: (before, after) =>
      censusFails(before, 'restartAgreed') === 0 && censusFails(after, 'restartAgreed') === 1
  },
  {
    name: "his server's restart asked of an UNSTAMPED session that went, and only that",
    file: HELPER,
    from: `  const restorable = went.filter((row) => row.gmuxId === '');`,
    to: `  const restorable = went.filter(() => true);`,
    moved: (before, after) =>
      censusFails(before, 'restartOtherStamp') === 1 && censusFails(after, 'restartOtherStamp') === 0
  },
  {
    name: 'the flip of a session that went, first condition: the app announced at all',
    file: HELPER,
    from: `  const spoke = announced.length > 0;`,
    to: `  const spoke = true;`,
    moved: (before, after) =>
      censusFails(before, 'wentSilent') === 1 &&
      censusFails(after, 'wentSilent') === 0 &&
      censusFails(after, 'wentDisagreed') === 1
  },
  {
    name: 'the flip of a session that went, second condition: every announcement agreed',
    file: HELPER,
    from: `  const agreed = wanted !== '' && announced.every((s) => s === wanted);`,
    to: `  const agreed = true;`,
    moved: (before, after) =>
      censusFails(before, 'wentDisagreed') === 1 &&
      censusFails(after, 'wentDisagreed') === 0 &&
      censusFails(after, 'wentSilent') === 1
  },
  {
    name: 'the harness directory, the first of the scratch folders',
    file: HELPER,
    from: `    if (real !== null && isDirectory(real)) roots.add(real);`,
    to: `    void real;`,
    moved: (before, after) =>
      after.census.roots.harnessAndProfile.length < before.census.roots.harnessAndProfile.length
  },
  {
    name: "the profile's folder kept out of the scratch folders when it is a temporary root, the home or above it",
    file: HELPER,
    from: `    if (parent !== null && !temps.has(parent) && !aboveHome) roots.add(parent);`,
    to: `    if (parent !== null) roots.add(parent);`,
    moved: (before, after) =>
      before.census.roots.profileInTmp.length === 0 &&
      after.census.roots.profileInTmp.length > 0 &&
      after.census.roots.profileAtHome.length > 0
  },
  {
    name: "the manifest read that fails closed",
    file: HELPER,
    from: `    if (!readable) {`,
    to: `    if (false) {`,
    moved: (before, after) =>
      censusFails(before, 'manifestUnreadable') === 1 &&
      censusFails(after, 'manifestUnreadable') === 0
  },
  {
    name: 'a row that does not read as one, which fails closed',
    file: HELPER,
    from: `if (!knownLines.has(line)) strange.add(line);`,
    to: `void line;`,
    moved: (before, after) =>
      censusFails(before, 'unreadableFresh') === 1 && censusFails(after, 'unreadableFresh') === 0
  },
  {
    name: 'a reading tmux could not answer, which fails closed',
    file: HELPER,
    from: `    if (reading.ok !== true) {`,
    to: `    if (false) {`,
    moved: (before, after) =>
      censusFails(before, 'readFailed') === 1 &&
      !after.census.verdicts.readFailed.failures.some((f) => /could not be read/.test(f))
  },
  {
    name: 'the $-id a census row must lead with',
    file: HELPER,
    from: '  if (!/^\\$\\d+$/.test(id)) return null;',
    to: '  void id;',
    moved: (before, after) =>
      before.census.parse.notAnId.unreadable.length === 1 &&
      after.census.parse.notAnId.rows.length === 1
  },
  {
    name: "the -u that keeps the census format's tabs",
    file: HELPER,
    from: `['-u', '-L', 'gmux', 'list-sessions', '-F', CENSUS_FORMAT]`,
    to: `['-L', 'gmux', 'list-sessions', '-F', CENSUS_FORMAT]`,
    moved: (before, after) => before.readerU && !after.readerU
  },
  // ── The fix round's three. Each is a clause a verifier drove past, or one
  //    this gate could not see at all. ──
  {
    name: 'the 2c clause, the refusal of an env naming the operator\'s own server',
    file: HELPER,
    from: `    const notScratch = refuseSocketReason(want);`,
    to: `    const notScratch = null;`,
    moved: (before, after) =>
      isSocketRefusal(before.liveGmux) &&
      isSocketRefusal(before.liveDefault) &&
      !isSocketRefusal(after.liveGmux) &&
      !isSocketRefusal(after.liveDefault) &&
      /is not there/.test(after.liveGmux.message)
  },
  {
    name: 'the announcement rejection, wired into withElectron\'s own reader',
    file: HELPER,
    from: `          if (finding !== null) {`,
    to: `          if (false) {`,
    moved: (before, after) =>
      before.wiring.announcement && !after.wiring.announcement
  },
  {
    name: 'the census read that sits above the spawn',
    file: HELPER,
    from: `  const censusBefore = tmuxSocket !== null ? liveSessionRows() : null;`,
    to: `  const censusBefore = null;`,
    moved: (before, after) => before.wiring.census && !after.wiring.census
  },
  {
    name: 'the census read on every launch, which his allowance of 2026-11-02 does not cover',
    file: HELPER,
    from: `  const censusBefore = tmuxSocket !== null ? liveSessionRows() : null;`,
    to: `  const censusBefore = liveSessionRows();`,
    moved: (before, after) => before.wiring.census && !after.wiring.census
  },
  // ── The probe review of Phase 352. The verdict's other four inputs, each
  //    handed something that silences a clause. Each copy was driven against
  //    this gate before these arms existed and the gate stayed green. ──
  {
    name: "this launch's own manifest, handed to the census, which clause (a) reads",
    file: HELPER,
    from: '          manifest: () => launchManifestIds(userDataDir),\n          scratchRoots:',
    to: '          manifest: () => ({ exists: false, ok: true, ids: [], why: null }),\n          scratchRoots:',
    moved: (before, after) => before.wiring.census && !after.wiring.census
  },
  {
    name: "this launch's scratch folders, handed to the census, which clause (a') reads",
    file: HELPER,
    from: "          scratchRoots: scratchRootsFor({ harnessDir: childEnv['GMUX_HARNESS_DIR'], userDataDir }),\n",
    to: '          scratchRoots: [],\n',
    moved: (before, after) => before.wiring.census && !after.wiring.census
  },
  {
    name: 'the socket this launch asked for, handed to the census',
    file: HELPER,
    from: "userDataDir }),\n          wanted: wantedSocket,\n",
    to: "userDataDir }),\n          wanted: announcedSockets(text)[0] ?? '',\n",
    moved: (before, after) => before.wiring.census && !after.wiring.census
  },
  {
    name: 'what the app announced, handed to the census, which the flip of a session that went reads',
    file: HELPER,
    from: '          wanted: wantedSocket,\n          announced: announcedSockets(text)\n',
    to: '          wanted: wantedSocket,\n          announced: [wantedSocket]\n',
    moved: (before, after) => before.wiring.census && !after.wiring.census
  },
  {
    name: "the harness term build/harness-socket.mjs hands its child",
    file: 'harness-socket.mjs',
    from: `    GMUX_PROBES: process.env['GMUX_PROBES'] ?? '0'`,
    // The replacement is deliberately NOT a GMUX_* name. build/contract-
    // inventory.mjs sweeps build/ for that pattern, so an invented one here
    // would enter the contract baseline as a name nothing reads.
    to: `    TORTIE_ABLATED_NOT_A_HARNESS_TERM: '0'`,
    moved: (before, after) => before.term.found && !after.term.found
  }
];

/**
 * Run rule 5. Returns a one line summary for the pass sentence, or pushes
 * failures.
 */
async function runRule5(failures, files) {
  const helper = await import('./electron-run.mjs');
  const helperSource = readFileSync(join(buildDir, HELPER), 'utf8');
  const harnessSource = readFileSync(join(buildDir, 'harness-socket.mjs'), 'utf8');

  // 5a, 5b, 5c: the shipping refusals, driven.
  const live = await socketReadings(helper);
  if (!isSocketRefusal(live.a)) {
    failures.push({
      what: '5a: a launch naming a socket with no harness term was NOT refused',
      detail:
        'withElectron accepted it. That is the shape that put sessions on the ' +
        "operator's live -L gmux server twice, and it is what rule 5 exists for."
    });
  } else if (!/GMUX_PROBES/.test(live.a.message)) {
    failures.push({
      what: '5a: the refusal does not name GMUX_PROBES',
      detail:
        `It said "${live.a.message}". The message is the whole remedy a probe ` +
        'author gets, so it has to name the smallest correct fix.'
    });
  }
  if (live.a.ran) {
    failures.push({
      what: '5a: the body ran even though the launch was refused',
      detail:
        'The sentinel inside the body was reached, so the refusal happened ' +
        'after the launch rather than before it.'
    });
  }
  if (!isSocketRefusal(live.order)) {
    failures.push({
      what: '5a: the socket refusal is not the FIRST thing withElectron asks',
      detail:
        `A launch with a bad profile AND a socket with no harness term ` +
        `answered "${live.order.message}". Layer 2 must sit above the profile ` +
        'refusal and above the program check, so a launch in the wrong shape ' +
        'is refused before anything is created.'
    });
  }
  if (!live.b.threw || !/is not there/.test(live.b.message)) {
    failures.push({
      what: '5b: the same call with GMUX_PROBES did not reach the program check',
      detail:
        `It answered threw=${String(live.b.threw)} "${live.b.message}". This ` +
        'arm is how rule 5 proves 5a passed without launching anything: with ' +
        'a harness term set, the next refusal reached must be the program.'
    });
  }
  for (const [name, reading] of [
    ['differs', live.cDiffers],
    ['absent', live.cAbsent]
  ]) {
    if (!isSocketRefusal(reading)) {
      failures.push({
        what: `5c: a named tmuxSocket with the env socket ${name} was NOT refused`,
        detail:
          'The teardown would end one server while the app used another, ' +
          'which is build/p256/probe-explorers.mjs\'s shape exactly.'
      });
    } else if (!/gmux-p261-teardown/.test(reading.message)) {
      failures.push({
        what: `5c: the refusal for the ${name} case does not name the pair`,
        detail: `It said "${reading.message}".`
      });
    }
  }

  // 5d, the reader and the judgement.
  const announce = announcementReadings(helper);
  const expectations = [
    ['absent', announce.absent, null],
    ['present', announce.present, 'gmux-p261-1'],
    ['leadingNoise', announce.leadingNoise, 'gmux-p261-1'],
    ['chunked', announce.chunked, 'gmux-p261-1'],
    ['quoted', announce.quoted, 'gmux'],
    ['noWant', announce.noWant, null],
    ['noAnswer', announce.noAnswer, null],
    ['agrees', announce.agrees, null]
  ];
  for (const [name, got, want] of expectations) {
    if (got !== want) {
      failures.push({
        what: `5d: the ${name} fixture read ${JSON.stringify(got)}`,
        detail: `It must read ${JSON.stringify(want)}.`
      });
    }
  }
  if (announce.twice.length !== 2 || announce.twice[1] !== 'gmux') {
    failures.push({
      what: '5d: an app that announced twice was read as announcing once',
      detail:
        `The reader answered ${JSON.stringify(announce.twice)}. A second ` +
        'announcement naming a different socket must not be able to hide ' +
        'behind the first.'
    });
  }
  if (announce.differs === null || !/gmux/.test(String(announce.differs))) {
    failures.push({
      what: '5d: an announcement that disagrees was not a finding',
      detail:
        'announcementFinding answered null for a launch that asked for one ' +
        'socket and was told another, which is the reading that ends a run.'
    });
  }

  // 5d's other half, the census, by identity since Phase 285. Until then this
  // half REQUIRED a names difference to be a finding, which pinned the defect:
  // the operator starting a session of his own failed whatever launch was
  // running. Every clause of the judgement now has a fixture of its own. The
  // scratch folders are read over directories made here and removed at the end
  // of this rule.
  const rootsDir = mkdtempSync(join(tmpdir(), 'p285-roots-'));
  mkdirSync(join(rootsDir, 'harness', 'p'), { recursive: true });
  mkdirSync(join(rootsDir, 'home-like'), { recursive: true });
  try {
    const census = await censusReadings(helper, rootsDir);
    failures.push(...censusExpectations(census));

    // 5e, the harness term beside the socket.
    const term = harnessTermBesideSocket(harnessSource);
    if (!term.sawSocket) {
      failures.push({
        what: '5e: no spawn in build/harness-socket.mjs names GMUX_TMUX_SOCKET',
        detail:
          'The scanner found nothing to judge, so this rule cannot fail and is ' +
          'not a rule. Either the file moved or the scanner is broken.'
      });
    } else if (!term.found) {
      failures.push({
        what: '5e: build/harness-socket.mjs hands its child a socket and no harness term',
        detail:
          'The app ignores GMUX_TMUX_SOCKET unless one of ' +
          `${HARNESS_TERM_NAMES.join(', ')} is set, so every wrapped run that ` +
          "inherits its own environment runs on -L gmux, the operator's live " +
          "server. Put GMUX_PROBES: process.env['GMUX_PROBES'] ?? '0' back " +
          'beside GMUX_TMUX_SOCKET in that spawn.'
      });
    }
    for (const f of TERM_FIXTURES) {
      const got = harnessTermBesideSocket(f.text);
      if (got.found !== f.want) {
        failures.push({
          what: `5e: the fixture "${f.name}" read found=${String(got.found)}`,
          detail: `It must read found=${String(f.want)}. A scanner nobody has seen fail is not a scanner.`
        });
      }
    }

    // 5f, the one verb aimed at -L gmux, by the helper AND by every script that
    // imports it (Phase 285, 308's second clause). An agreeing announcement says
    // a session that went was not ended by the APP; this is what says it was not
    // ended by the script that launched it either, which is what makes that
    // session a note rather than a failure.
    const verbs = operatorSocketVerbs(helperSource);
    if (verbs.length === 0) {
      failures.push({
        what: `5f: build/${HELPER} composes no -L gmux argv at all`,
        detail:
          'liveSessionRows() is the census reader and it is supposed to be ' +
          'there. Either it went or the scanner is broken, and both make rule ' +
          '5f vacuous.'
      });
    }
    const readerU = readerCarriesU(helperSource);
    if (verbs.length > 0 && !readerU) {
      failures.push({
        what: `5f: the census reader in build/${HELPER} does not pass -u`,
        detail:
          'tmux sends every tab of the census format as _ to a client with no ' +
          'UTF-8 locale (measured on 3.6a and 3.7b), so every row would read as ' +
          'unreadable and the census would fail every launch closed.'
      });
    }
    const importers = files.filter(
      (name) => name !== HELPER && !NOT_A_HELPER_USER.has(name) && importsHelper(readFileSync(join(buildDir, name), 'utf8'))
    );
    for (const name of [HELPER, ...importers]) {
      const source = name === HELPER ? helperSource : readFileSync(join(buildDir, name), 'utf8');
      for (const hit of operatorSocketVerbs(source)) {
        if (hit.verb === 'list-sessions') continue;
        failures.push({
          what:
            hit.verb === null
              ? `5f: build/${name}:${String(hit.line)} aims an argv at -L gmux whose verb cannot be read (${String(hit.why)})`
              : `5f: build/${name}:${String(hit.line)} aims "${hit.verb}" at -L gmux`,
          detail:
            "list-sessions is the only verb any script that launches through the " +
            "helper may give the operator's private server, and a verb nobody can " +
            'read is refused for the same reason. Everything else writes to it, ' +
            'and since Phase 285 a session that went during an agreeing launch ' +
            'reads as his own, so a script that could end one must not exist.'
        });
      }
    }
    for (const f of VERB_FIXTURES) {
      const hits = operatorSocketVerbs(f.text);
      const got = hits.map((h) => h.verb);
      const flagsRight = f.flags === undefined || JSON.stringify(hits[0]?.flags ?? []) === JSON.stringify(f.flags);
      if (JSON.stringify(got) !== JSON.stringify(f.want) || !flagsRight) {
        failures.push({
          what: `5f: the fixture "${f.name}" read ${JSON.stringify(got)} with flags ${JSON.stringify(hits.map((h) => h.flags))}`,
          detail: `It must read ${JSON.stringify(f.want)}${f.flags === undefined ? '' : ` with flags ${JSON.stringify(f.flags)}`}.`
        });
      }
    }

    // 5g, the env that names the operator's own server. It is refused whatever
    // else the launch sets, and the control must still reach the program check,
    // because a clause that refuses everything is not this clause.
    for (const [name, reading] of [
      ['gmux', live.liveGmux],
      ['default', live.liveDefault]
    ]) {
      if (!isSocketRefusal(reading)) {
        failures.push({
          what: `5g: an env naming "${name}" with a harness term was NOT refused`,
          detail:
            `It answered threw=${String(reading.threw)} "${reading.message}". A ` +
            'harness term makes the app OBEY that name, so this launch would ' +
            "have run its sessions on the operator's live server, and with " +
            'tmuxSocket null the census never reads and layer 3 sees the app ' +
            'agree with what was asked for. Every layer passes it.'
        });
      } else if (!/OBEY/.test(reading.message)) {
        failures.push({
          what: `5g: the refusal for "${name}" does not say the app would obey it`,
          detail:
            `It said "${reading.message}". The message is the whole remedy, and ` +
            'the reason this shape is worse than the one 2a catches is that the ' +
            'override works.'
        });
      }
      if (reading.ran) {
        failures.push({
          what: `5g: the body ran for the env naming "${name}"`,
          detail: 'The sentinel inside the body was reached, so the refusal came too late.'
        });
      }
    }
    if (!live.liveControl.threw || !/is not there/.test(live.liveControl.message)) {
      failures.push({
        what: '5g: the control launch on a scratch socket did not reach the program check',
        detail:
          `It answered threw=${String(live.liveControl.threw)} ` +
          `"${live.liveControl.message}". A clause that refuses every env is ` +
          'not the clause 5g is about, and this arm is what tells the two apart.'
      });
    }

    // 5h, the wiring. The judgements above are pure and this gate drives them;
    // what nothing asked until the fix round is whether withElectron CALLS them.
    const wiring = backstopWiring(helperSource);
    if (!wiring.announcement) {
      failures.push({
        what: '5h: nothing in withElectron rejects a launch on a disagreeing announcement',
        detail:
          `${wiring.why.join('; ')}. announcementFinding can answer perfectly ` +
          'and change nothing, which is how layer 3 stops being a layer.'
      });
    }
    if (!wiring.census) {
      failures.push({
        what: '5h: withElectron does not read the census around the launch',
        detail:
          `${wiring.why.join('; ')}. The read has to happen before the spawn ` +
          'and be judged in the finally block, or layer 4 is a function nobody ' +
          'calls.'
      });
    }
    for (const f of WIRING_FIXTURES) {
      const got = backstopWiring(f.text);
      if (got.announcement !== f.want.announcement || got.census !== f.want.census) {
        failures.push({
          what: `5h: the fixture "${f.name}" read announcement=${String(got.announcement)} census=${String(got.census)}`,
          detail:
            `It must read announcement=${String(f.want.announcement)} ` +
            `census=${String(f.want.census)}. A scanner nobody has seen fail is ` +
            'not a scanner.'
        });
      }
    }

    // The ablations.
    const before = {
      ...live,
      announce,
      census,
      term,
      wiring,
      readerU
    };
    let ablationsRed = 0;
    const dir = mkdtempSync(join(tmpdir(), 'p261-ablate-'));
    try {
      // Each copy has a directory and an import URL of its own, by its index, so
      // two ablations in the same millisecond can never share a cached module.
      for (const [index, ab] of SOCKET_ABLATIONS.entries()) {
        const copyDir = join(dir, `ab-${String(index)}`);
        mkdirSync(copyDir, { recursive: true });
        const sources = {
          [HELPER]: helperSource,
          'harness-socket.mjs': harnessSource
        };
        if (!sources[ab.file].includes(ab.from)) {
          failures.push({
            what: `the ablation "${ab.name}" found nothing to edit`,
            detail:
              `It looks for ${JSON.stringify(ab.from)} in build/${ab.file} and ` +
              'that text is not there. An ablation that edits nothing proves ' +
              'nothing, so the clause moved and this list has to move with it.'
          });
          continue;
        }
        // Only the file being ablated is copied out; the other is read in place,
        // because these two do not import each other.
        const target = join(copyDir, ab.file);
        writeFileSync(target, sources[ab.file].replace(ab.from, () => ab.to));

        let after;
        if (ab.file === HELPER) {
          let copy;
          try {
            copy = await import(`${target}?p261=${String(index)}-${String(Date.now())}`);
          } catch (err) {
            failures.push({
              what: `the ablated copy for "${ab.name}" would not load`,
              detail:
                `${String(err?.message ?? err)}. A copy that fails to load fails ` +
                'this gate for the wrong reason and says nothing about the ' +
                'clause, which is Phase 219\'s rule.'
            });
            continue;
          }
          if (typeof copy.withElectron !== 'function') {
            failures.push({
              what: `the ablated copy for "${ab.name}" answered nothing`,
              detail: 'It loaded but exports no withElectron, so it was not driven.'
            });
            continue;
          }
          const ablatedText = readFileSync(target, 'utf8');
          after = {
            ...(await socketReadings(copy)),
            announce: announcementReadings(copy),
            census: await censusReadings(copy, rootsDir),
            term,
            // The wiring is a property of the TEXT, so an ablation of it is read
            // off the ablated copy rather than driven. It is the one reading here
            // that no drive can take, which is exactly why it was missing. The
            // reader's `-u` is read off the text the same way.
            wiring: backstopWiring(ablatedText),
            readerU: readerCarriesU(ablatedText)
          };
        } else {
          after = {
            ...before,
            term: harnessTermBesideSocket(readFileSync(target, 'utf8'))
          };
        }
        if (ab.moved(before, after)) ablationsRed += 1;
        else {
          failures.push({
            what: `the ablation "${ab.name}" moved no reading`,
            detail:
              'The clause was removed and rule 5 still passed, so nothing in ' +
              'this gate is holding it.'
          });
        }
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    return {
      // COUNTED, and the denominator is counted too, because a hand written
      // number beside a measured one is how this file's rule 2 used to lie.
      refusals: WRONG_SHAPES(live).filter(isSocketRefusal).length,
      shapes: WRONG_SHAPES(live).length,
      wiredBackstops: [wiring.announcement, wiring.census].filter(Boolean).length,
      censusFixtures: CENSUS_FIXTURES.length,
      importers: importers.length,
      ablationsRed
    };
  } finally {
    rmSync(rootsDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/**
 * Every script under build/ this gate reads, by the name it is reported under,
 * which is relative to build/.
 *
 * IT WALKS, AND UNTIL PHASE 240'S FIX ROUND IT DID NOT. `readdirSync(buildDir)`
 * read one level, and Phase 240 was the first phase to put an Electron starter
 * in a subdirectory: `build/p240/save-loss.mjs` and `build/p240/save-choice.mjs`
 * both launch through the helper and both were invisible to every rule in this
 * file. Nothing leaked, because both go through `withElectron`; what was missing
 * was the guard that says so. build/assert-known-hosts-scoped.mjs had walked for
 * exactly this reason since Phase 193, and its own header says why: "Costing
 * nothing today is exactly when a boundary is cheap to close." Phase 240 created
 * that future and this closes it.
 *
 * The walk itself is build/build-scripts.mjs, shared with the other two gates
 * that ask a question of every script under build/ rather than copied a third
 * time, and its header carries what it refuses to walk into and why.
 */
function buildFiles() {
  return buildScriptNames(buildDir);
}

/**
 * `--list` prints the derived population, one name per line, and asserts
 * nothing. It is what a person runs when the floor goes red, to diff against
 * the same command at the parent commit, and what they run to read the new
 * number when they lower the floor on purpose.
 */
function list() {
  const files = buildFiles();
  const read = (n) => readFileSync(join(buildDir, n), 'utf8');
  for (const name of helperUsers(files, read)) console.log(name);
}

async function main() {
  const failures = [];
  const files = buildFiles();

  // Rule 1, forward.
  let scanned = 0;
  for (const name of files) {
    if (EXEMPT.has(name)) continue;
    const source = readFileSync(join(buildDir, name), 'utf8');
    scanned += 1;
    for (const hit of electronSpawns(name, source)) {
      failures.push({
        what: `build/${hit.file}:${String(hit.line)} starts an Electron itself`,
        detail:
          `The call is ${hit.call}. A launch outside build/${HELPER} has no ` +
          'teardown that a finally block runs, so an assertion that throws ' +
          'before the kill line leaves about 480 MB running. Replace it with ' +
          'withElectron(options, async (handle) => { ... }) or with ' +
          'runElectron(options).'
      });
    }
  }

  // Rule 2, reverse. The population is derived and its size is the assertion.
  const users = helperUsers(files, (name) =>
    readFileSync(join(buildDir, name), 'utf8')
  );
  const shortfall = floorFinding(users.length, HELPER_USER_FLOOR);
  if (shortfall) failures.push(shortfall);

  // Rule 3, the helper's own shape.
  const helperSource = readFileSync(join(buildDir, HELPER), 'utf8');
  const shape = helperKillsInFinally(helperSource);
  if (!shape.ok) {
    failures.push({
      what: `build/${HELPER} does not kill inside a finally block`,
      detail: `${shape.why} That block is the whole guarantee of this phase.`
    });
  }

  // Rule 4, the fixtures.
  const fixtures = runFixtures(failures);

  // Rule 5, the socket refusal, driven rather than read.
  const socket = await runRule5(failures, files);

  // Rule 6, the ceiling (Phase 285): the scripts besides the helper and this
  // gate that aim an argv at -L gmux may only fall in number.
  const aiming = files.filter(
    (name) =>
      name !== HELPER &&
      !NOT_A_HELPER_USER.has(name) &&
      aimsOperatorSocket(readFileSync(join(buildDir, name), 'utf8'))
  );
  const over = ceilingFinding(aiming.length, OPERATOR_ARGV_CEILING);
  if (over !== null) failures.push(over);
  const byShell = files.filter(
    (name) =>
      name !== HELPER &&
      !NOT_A_HELPER_USER.has(name) &&
      aimsOperatorSocketByShell(readFileSync(join(buildDir, name), 'utf8'))
  );
  const overShell = ceilingFinding(
    byShell.length,
    OPERATOR_SHELL_CEILING,
    'hand a shell a command line aimed at',
    'OPERATOR_SHELL_CEILING'
  );
  if (overShell !== null) failures.push(overShell);
  const ceilingProof = runCeilingFixtures(failures);

  if (failures.length > 0) {
    console.error(
      '[electron-teardown] a launch under build/ is outside the helper.'
    );
    for (const { what, detail } of failures) {
      console.error(`  ${what}`);
      console.error(`    ${detail}`);
    }
    process.exit(1);
  }

  console.log(
    `[electron-teardown] ${String(scanned)} files under build/ were read and ` +
      `none starts an Electron itself. ${String(users.length)} of them reach ` +
      `build/${HELPER}, counted rather than listed, against a floor of ` +
      `${String(HELPER_USER_FLOOR)}. The helper's kill is inside a finally ` +
      `block. Fixtures: the good one produced ${String(fixtures.good)} ` +
      `findings, the bad one produced ${String(fixtures.bad)}, the one that ` +
      `hides the name produced ${String(fixtures.sly)}, and the floor refused ` +
      `${String(fixtures.floorRefused)} of the 2 populations it was shown. ` +
      `The socket refusal was CALLED rather than read: ` +
      `${String(socket.refusals)} of ${String(socket.shapes)} launches in ` +
      `the wrong shape were refused before anything was spawned, an env ` +
      `naming the operator's own server among them and a control beside it, ` +
      `the announcement reader judged its fixtures and the census judged ` +
      `${String(socket.censusFixtures)} by identity, being who made each ` +
      `session that appeared rather than how many there are, ` +
      `${String(socket.wiredBackstops)} of 2 backstops are wired into ` +
      `withElectron's own braces with the census read around a launch that ` +
      `names a scratch socket and only there, ` +
      `build/harness-socket.mjs hands its child a harness term beside the ` +
      `socket, list-sessions is the only verb aimed at -L gmux by the helper ` +
      `and by the ${String(socket.importers)} scripts that import it, and ` +
      `${String(socket.ablationsRed)} of ${String(SOCKET_ABLATIONS.length)} ` +
      `ablations each moved a reading. ${String(aiming.length)} other ` +
      `scripts aim an argv at -L gmux, under a ceiling of ` +
      `${String(OPERATOR_ARGV_CEILING)} that refused ${String(ceilingProof.refused)} ` +
      `of the 2 counts it was shown, and ${String(byShell.length)} hand a shell ` +
      `a command line aimed at it, under a ceiling of ` +
      `${String(OPERATOR_SHELL_CEILING)} that refused ` +
      `${String(ceilingProof.shellRefused)} of the 2.`
  );
}

if (process.argv.includes('--list')) list();
else await main();
