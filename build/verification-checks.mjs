/**
 * verification-checks.mjs, every check in package.json, classified (Phase 145
 * stage 5).
 *
 * The plan's rule: every check is one of five types, and each states its
 * environment requirement and its skip rule, so a missing SSH key can block a
 * remote probe without ever making a static gate ambiguous. This file is the
 * record, and `node build/assert-hermetic-checks.mjs` is the gate that keeps
 * it complete in both directions: a check script without an entry here fails
 * the build, and an entry naming a script that no longer exists fails it too.
 *
 * The five types, and what each requires of the host:
 *
 *   pure contract or state test   node and the repository install from
 *                                 package-lock.json. Nothing else. Never
 *                                 skips, never reaches the network for a
 *                                 runner, and a red one always means the tree.
 *   adapter integration test      a real local tool or native primitive is
 *                                 driven: the platform file event stream, the
 *                                 live process table, git, /bin/sh, codesign,
 *                                 the vendored specstory. Still no network
 *                                 and no operator state.
 *   electron harness              starts the built app through
 *                                 build/electron-run.mjs on a scratch profile
 *                                 and a scratch tmux socket, ended in a
 *                                 finally block.
 *   tmux harness                  drives the vendored tmux on a scratch -L
 *                                 socket of its own. The operator's server is
 *                                 read only, always.
 *   remote machine probe          needs a machine on the far side of ssh.
 *                                 Almost all make their own, a loopback sshd
 *                                 with keys they generate; the three marked
 *                                 "real machine" need one the operator names
 *                                 and a loaded SSH key, and refuse with a
 *                                 sentence when either is absent.
 *
 * `aggregate` is not a sixth type. It marks a script that only runs other
 * classified checks, and its members are named so the gate can follow them.
 */

export const CHECK_TYPES = [
  'pure contract or state test',
  'adapter integration test',
  'electron harness',
  'tmux harness',
  'remote machine probe'
];

/** The default statements, so the table below stays readable. */
const NEEDS = {
  pure: 'node and the repository install from package-lock.json; nothing else on the host',
  vitest:
    'node and the repository install; every effect is injected, no native stream is subscribed and no live process table is read',
  native:
    'the platform native primitives behind the injected seams: FSEvents delivery through the installed @parcel/watcher binding, /bin/ps, git',
  electron:
    'the electron dist under node_modules (placed at install time, never fetched during a check), the vendored tmux, a scratch profile and a scratch tmux socket of its own',
  tmux: 'the vendored tmux on a scratch -L socket of its own; the operator server is read only',
  loopback:
    'a loopback sshd scratch machine the harness starts itself with keys it generates; no operator credential is read',
  realMachine:
    'a real second machine the operator names, plus an SSH identity the operator has loaded'
};

const SKIP = {
  never: 'never skips',
  neverFinally:
    'never skips; the Electron and any scratch tmux server are ended in a finally block through build/electron-run.mjs',
  refuse:
    'refuses with a sentence naming the missing machine or key; it never silently passes and no static gate reads its result',
  release:
    'runs only against a packaged release artifact; without one it fails with the reason, it does not skip'
};

const pure = (name, needs = NEEDS.pure, skip = SKIP.never) => ({
  name,
  type: 'pure contract or state test',
  needs,
  skip
});
const adapter = (name, needs, skip = SKIP.never) => ({
  name,
  type: 'adapter integration test',
  needs,
  skip
});
const electron = (name, needs = NEEDS.electron, skip = SKIP.neverFinally) => ({
  name,
  type: 'electron harness',
  needs,
  skip
});
const tmux = (name) => ({
  name,
  type: 'tmux harness',
  needs: NEEDS.tmux,
  skip: SKIP.never
});
const remote = (name, needs = NEEDS.loopback, skip = SKIP.neverFinally) => ({
  name,
  type: 'remote machine probe',
  needs,
  skip
});
const realRemote = (name) => remote(name, NEEDS.realMachine, SKIP.refuse);

export const CHECKS = [
  // The vitest suite, in lanes (Phase 145 stage 5).
  {
    name: 'test',
    type: 'aggregate',
    members: ['test:hermetic', 'test:native'],
    needs: 'whatever its members need',
    skip: 'never skips'
  },
  pure('test:hermetic', NEEDS.vitest),
  adapter('test:native', NEEDS.native),

  // Static conformance gates. Every one runs from node and the lockfile
  // install alone, through the pinned tsx runner in build/ts-runner.mjs.
  pure('conformance:agents'),
  pure('conformance:machines'),
  pure('conformance:installs'),
  pure('conformance:context'),
  pure('conformance:overview'),
  pure('conformance:arch'),
  pure('conformance:arch:modules'),
  pure('conformance:watcher'),
  pure('conformance:handback'),
  adapter(
    'conformance:specstory:entitlement',
    'macOS codesign and the vendored specstory binary; it signs scratch copies and runs them'
  ),
  adapter(
    'conformance:watcher:cap',
    'clang from the Xcode command line tools and the macOS CoreServices ' +
      'framework; it compiles build/fsevents-cap.c and opens real FSEvents ' +
      'streams on a scratch directory it removes in a finally block',
    'on any platform other than macOS it prints SKIP and exits 0, because ' +
      'FSEventStreamSetExclusionPaths is what it measures and that API exists ' +
      'nowhere else. On macOS it never skips. It is not in the commit ' +
      'battery: it takes about 25 seconds, and npm run conformance:watcher is ' +
      'the fast gate that holds the code to the number it measures'
  ),
  tmux('conformance:tmux-pair'),
  electron('conformance:resume'),
  electron('conformance:resume:capture'),
  electron('conformance:resume:specstory'),
  // PHASE 156. Not a check: it WRITES src/main/menu-icons.generated.ts, by
  // starting the built renderer and reading back the marks the product's own
  // rasterizer produced. It is classified here because it starts an Electron
  // and this file is the record of everything that does, and it is run by hand
  // when the closed set in src/shared/menu-codicons.ts changes. The gate that
  // proves its output is gate:menu-glyphs, which runs in every build.
  electron(
    'gen:menu-icons',
    NEEDS.electron,
    'never skips, and it is not in any battery: it is a generator run by hand ' +
      'when the menu icon set changes, and build/assert-menu-glyphs.mjs is ' +
      'what holds the committed output to the table'
  ),

  // Build gates and pins.
  pure('gate:electron'),
  // PHASE 166. The cache policy imports no file system, names no durable
  // path, and neither it nor any file reading it calls a deletion API; no
  // production file under src/main calls a session cache deletion at all.
  // Four fixtures it writes itself prove the scanner fails when it should.
  pure('gate:cache-policy'),
  pure('gate:checks'),
  // PHASE 171. The contract inventory, byte compared against
  // docs/audits/contract-baseline.txt. It bundles the manifest store with
  // esbuild and runs the real migrations in a scratch directory under plain
  // node, so it needs the lockfile install and nothing on the host. It runs
  // inside npm run build, because a deterministic alarm nobody runs is
  // documentation: the baseline sat 16 channels, 22 env names and one smoke
  // mode behind the tree for thirteen phases while the check sat in no gate.
  pure('gate:contract'),
  pure('gate:menu-glyphs'),
  pure('gate:menu-accelerators'),
  pure('assert:doctypes'),
  pure('pin:tmux:check'),
  pure(
    'pin:skills:check',
    'network access to the npm registry, because drift against what the registry publishes is its subject',
    'not part of any battery chain; run it when touching the skills pin'
  ),
  adapter('verify:signed', 'macOS codesign and spctl over the packaged app', SKIP.release),

  // Electron smokes on scratch profiles and scratch tmux sockets.
  electron('smoke'),
  electron('smoke:create'),
  electron('smoke:verify'),
  electron('smoke:t1'),
  electron('smoke:t3'),
  electron('smoke:t3:agent'),
  electron('smoke:t3:shadow'),
  electron('smoke:quit'),
  electron('smoke:quitdoors'),
  electron('smoke:capture'),
  electron('smoke:migrate'),
  electron('smoke:identity'),
  electron('smoke:reconstruct'),
  electron('smoke:fault'),
  electron('smoke:power'),
  electron('smoke:procid'),
  electron('smoke:refusal'),
  electron('smoke:config'),
  electron('smoke:machines'),
  electron('smoke:restore:bare'),
  electron('smoke:execplane'),

  // Remote shapes over scratch machines the harnesses make themselves.
  remote('smoke:partition'),
  remote('smoke:matrix'),
  remote('smoke:p117'),
  remote('smoke:p118'),
  remote('smoke:p93remote'),
  remote('smoke:capture:remote'),
  remote('smoke:remote'),
  remote('probe:p95'),
  remote('probe:p131'),
  remote('probe:execplane'),
  remote('probe:remoteattach'),
  remote('probe:controldialect'),
  remote('probe:keyinstall'),
  remote('probe:remoteharvest'),
  remote('probe:remoteenv'),
  remote('probe:remoteimage'),
  remote('probe:remotereview'),
  remote('probe:controldeadline'),
  remote('probe:remoteclone'),
  remote('probe:remotearm'),
  remote('probe:p187'),

  // The three that need a machine the operator names and a loaded key.
  realRemote('probe:realmachine'),
  realRemote('probe:realunknowns'),
  realRemote('probe:remotetree'),

  // Driver probes: a pinned tsx driver over production modules and real
  // scratch git repositories, no Electron, no tmux, no ssh.
  adapter('probe:p98', 'git and the lockfile ripgrep over scratch repositories'),
  adapter('probe:p99', 'git over scratch repositories'),
  adapter('probe:p100', 'git over scratch repositories'),
  adapter('probe:p101', 'git over scratch repositories'),
  adapter('probe:p102', 'git over scratch repositories'),
  adapter('probe:p103', 'git over scratch repositories'),
  adapter('probe:p104', 'git over scratch repositories'),
  adapter('probe:p105', 'git over scratch repositories'),
  adapter('probe:p106', 'git over scratch repositories'),
  adapter('probe:p107', 'git over scratch repositories'),
  adapter('probe:p108', 'git over scratch repositories'),
  adapter('probe:p120', 'git over scratch repositories'),

  // Electron probes: the real window, driven and read back.
  electron('probe:openwith'),
  electron('probe:shellopen'),
  electron('probe:finderopen'),
  electron('probe:fullscreenmenu'),
  electron('probe:homeupdateline'),
  electron('probe:sessionfocus'),
  electron('probe:workspacetarget'),
  electron('probe:remoteproject'),
  electron('probe:p94hotkey'),
  electron('probe:p93'),
  electron('probe:p96'),
  electron('probe:p97'),
  electron('probe:p119menu'),
  electron('probe:p127'),
  electron('probe:p132'),
  electron('probe:p133'),
  electron('probe:p134about'),
  electron('probe:p137'),
  electron('probe:p1372columns'),
  electron('probe:p1372menu'),
  electron('probe:p138'),
  electron('probe:p143'),
  electron('probe:p149'),
  electron('probe:p150'),
  electron('probe:p156'),
  // PHASE 158. The one path in, driven: the skeleton press over a scratch
  // repository, the pass refused with no agent chosen, and the process count
  // at zero. It spawns no agent: the choice is None on its scratch profile
  // and the gate refuses before any spawn, which is the claim it proves.
  electron('probe:p158'),
  // PHASE 163. The diagnostics capture, driven four times: cold and warm on
  // a zero session profile and on a twenty five session profile, each pair on
  // its own scratch socket, every session a shell running a date loop so no
  // agent is spawned and no token is spent. It writes the four captures and
  // grades the milestones, the split of shell rows from session rows, and
  // what was left running afterwards.
  electron('probe:p163'),
  // PHASE 163, the surface. One app run: the report tab opened through its
  // door over a scratch socket carrying two shell sessions, the two tables
  // read off the DOM, the proof that no figure on the face is the sum of the
  // two totals, and one photograph. The numbers themselves are probe:p163's.
  electron('probe:p163surface'),
  // PHASE 164. What a launch spawns before a person has touched anything, on
  // three profile shapes launched cold and warm through the real app with a
  // spawn recorder in main. It grades zero agent version probes and zero
  // hidden project statuses on a reopen, the boot warm kept on a profile with
  // nothing to show, and, given a baseline directory, that first attach did
  // not regress. Phase 163's milestones are its ruler; it adds no second one.
  electron('probe:p164'),
  // PHASE 165. The bundle diet's window half: the warm paint ruler over five
  // launches of the real app, and the first open of every lazy surface with
  // the page offline, driven by real input events. The byte claim is the
  // probe containment gate's, read off the build; this is the two claims
  // only a window can answer. Given a baseline directory it prints the
  // parent's numbers beside the new ones under Phase 164's regression rule.
  electron('probe:p165'),
  // PHASE 166. What owns the bytes in the Chromium caches, on profiles it
  // makes itself: twenty launches of one build, five simulated version
  // changes, a 49 MB image document opened five times, the image viewer with
  // the recovery strip, the editor, then the dev shape through vite's Node
  // API with hot edits and a 4 MiB ceiling, and the Phase 163 capture in both
  // shapes. It hashes every file under the profile's gmux directory after
  // every launch and fails if one is removed or changed by anything but
  // Tortie's own durable writers. It spawns no agent and spends no token.
  electron('probe:p166'),
  // PHASE 171. The Phase 167 scale scenario as a check, on demand. One app run
  // on a scratch profile drives three of the audit's five profiles in blocks,
  // being project switches, surface open and close, and split, close and
  // reattach over four real shell sessions a cycle, and grades the blocks by
  // the plateau rule Phase 167 adopted: renderer heap, nodes and listeners
  // must stop growing, and main must hold exactly the pty descriptors it
  // started with. It spawns no agent and spends no token. Its grader is
  // proved on eight fixtures by --self-test, which launches nothing.
  electron('probe:p167'),
  // PHASE 175. Architecture behind a flag, driven in the real app. One launch
  // on a scratch profile reads the shipped default off, walks the real
  // `Menu.getApplicationMenu()` from the main process over the node
  // inspector, presses the view chord, and INJECTS the three Architecture
  // menu actions on `ui:menuAction` from main, which is how a stale queued
  // row would arrive and is the one thing a hidden icon does not prove. Then
  // it flips the switch through the shipped settings bridge and reads all of
  // it again on both sides of the flip, twice. It creates no session, spawns
  // no agent and spends no token.
  electron('probe:p175'),
  // PHASE 181 FIX ROUND. Does the usage meter follow its switch? One launch on
  // a scratch profile flips the Codex switch through the shipped settings
  // bridge three times and counts the meter out of the live DOM after each
  // flip. It reads NO credential and makes NO request: `CODEX_HOME` points at
  // an empty scratch directory, so the read answers missing and the row draws
  // in its signed out state, which is all the switch needs to prove. It never
  // turns the Claude switch on, creates no session and spawns no agent.
  electron('probe:p181'),
  // PHASE 181.1. WHICH SIDE YIELDS in the top strip. One launch on a scratch
  // profile puts six tabs on the strip, walks a ladder of window widths and
  // reads the drawn rectangles back out of the live DOM at each one: the
  // density, the reservation in pixels, whether the meter overlaps the tab
  // list or itself, and how many tabs are still drawn. It reads NO credential
  // and makes NO request, on the same terms as the row above, and it never
  // turns the Claude switch on.
  electron('probe:p1811'),
  // PHASE 181.2 FIX ROUND. Does the bar draw the number a person reads, and
  // does the hover card sit on top of the project tabs? One launch on a
  // scratch profile stages INVENTED numbers into the usage store through the
  // probe chunk's own drive, then at both orientations and at each of the three
  // window choices it divides the filled width by the track width and compares
  // that to the number read out of the TEXT beside it. It reads the card's box
  // against the tab strip's, and in a window too short to place the card clear
  // it asserts the computed stacking order, which is the case that can fail on
  // a z-index. It reads NO credential and makes NO request: BOTH usage switches
  // stay off for the whole run, so no keychain item and no credentials file is
  // opened and no vendor is asked anything, and the plan word it draws is the
  // word `probe`. `node build/probe-p1812-bar-and-card.mjs --self-test` proves
  // the graders on twelve fixtures and launches nothing.
  electron('probe:p1812'),
  // PHASE 185. Does the diff view's own control change WHAT IS DRAWN? One
  // launch on a scratch profile opens a real diff, being this repository's own
  // PierreDiff.tsx either side of one commit, clicks each of the four inline
  // segments with the diff open and counts the highlights the app really drew
  // each time, then reads the backgrounds answer as colour off the running
  // app. A second launch on the same profile proves the choice came back with
  // no click. It exists because an option that is passed but not honoured
  // looks exactly like one that works: @pierre/diffs takes `lineDiffType` on
  // the surface's options and the worker pool's copy wins, so nothing in the
  // unit tests fails if a later round deletes the push to the pool. It creates
  // no session, spawns no agent and spends no token, and it touches `-L gmux`
  // in one place only, a read only session count taken before and after.
  electron('probe:p185'),
  // PHASE 64. The multi line paste matrix. It is an Electron harness like the
  // rows around it, and two things about it are unlike them and are stated
  // here rather than discovered. It SPAWNS THE REAL AGENT BINARIES on this
  // machine, one session at a time, so it needs whatever those binaries need,
  // which for several of them is a credential the operator has already signed
  // in with. And it NEVER SKIPS A ROW: an agent that is not on PATH produces a
  // row saying so, because a quietly missing row would make the denominator a
  // fiction, which is the charter's own instruction.
  electron(
    'probe:p64',
    NEEDS.electron +
      ', plus the real agent CLIs installed on this machine and whatever ' +
      'credential each already holds; it spawns them, and it never moves, ' +
      'installs or removes one',
    'never skips, and no ROW skips either: an agent that is not installed is ' +
      'a row that says so. The Electron and the scratch tmux server are ended ' +
      'in a finally block, and every session it made is killed in one too'
  ),
  // PHASE 64's FIX ROUND. The app run the phase owed. It opens ONE window,
  // writes a small repository of its own and drives the level 2 module view
  // over it through the real `arch:modules` channel, then presses the real
  // picker chord with the native menu bridge wrapped so the rows it would have
  // drawn are readable. It creates no session and spawns no agent.
  // PHASE 174.1. The Custom font field in Settings then Appearance. One launch
  // on a scratch profile whose settings.json already picks the Custom face,
  // then the operator's own scenario keystroke by keystroke: the field's box is
  // read after every character, and the note's state crosses from quiet to
  // speaking and back, so the jump is a computed verdict rather than an
  // assertion. It also reads the suggestion list off the DOM and cross checks
  // it against `system_profiler SPFontsDataType`, which is Apple's own font
  // registry and a different route from the Chromium API the product uses. It
  // installs, moves and removes no font, creates no session and spawns no
  // agent. `--app <dir>` points it at another built worktree, which is how the
  // parent commit was measured with the same instrument.
  electron('probe:p1741'),
  electron('probe:p64arch'),
  electron('probe:shellpath'),
  electron('probe:p101shot'),
  electron('probe:p102shot'),
  electron('probe:p103shot'),
  electron('probe:p104shot'),
  electron('probe:p120shot')
];
