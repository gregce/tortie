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
  // Phase 242.2. It stays `pure`: condition 88g runs the shipping image-put
  // text under /bin/sh, synchronously, over a scratch directory it removes in
  // a finally, which needs node and the repository install and nothing else on
  // the host. `conformance:redline-write` below is the same shape.
  pure('conformance:machines'),
  // Phase 187's guard. It is a vitest file rather than a tsx probe because the
  // exec plane is replaced by a function, which is the seam vitest owns, and it
  // drives the real feed's own state machine over 25 closes per arm.
  pure('conformance:remoteclose', NEEDS.vitest),
  pure('conformance:installs'),
  pure('conformance:context'),
  pure('conformance:overview'),
  pure('conformance:redline'),
  // Phase 226. The guarded write channel: build/conformance-redline-write.mjs
  // drives the SHIPPING src/main/fs/guarded-write.ts under node over a scratch
  // directory the probe makes and removes in a finally, one arm per refusal
  // and per protection, then over ablated copies of the channel one clause
  // each. It launches no Electron and reads nothing under the person's home.
  pure('conformance:redline-write'),
  pure('conformance:save'),
  // Phase 247. Which door a path in a transcript takes:
  // build/conformance-pathdoors.mjs drives the SHIPPING sequence under node
  // over hostile shapes it builds on a real disk, then over ablated copies of
  // it one clause each. It launches no Electron, and `shell.openPath` is
  // never called by anything it runs, because electron is not in the probe's
  // module graph at all.
  pure('conformance:pathdoors'),
  pure('conformance:filehistory'),
  pure('conformance:historysearch'),
  // Phase 202. The logins domain: it runs build/conformance-logins.mjs, which
  // scans the shipping source for the refusals and runs the shipping store
  // over a scratch root and over four ablated copies of itself.
  pure('conformance:logins'),
  // Phase 204. The credential store Tortie owns: it runs
  // build/conformance-credentials.mjs, which scans the shipping source for the
  // refusals, being the payload never on a command line, -A never passed and
  // the person's own location refused by name, and runs the shipping domain
  // over an injected keychain and over twelve ablated copies of itself. It
  // opens no keychain and reads nothing under the person's home.
  pure('conformance:credentials'),
  pure('conformance:arch'),
  pure('conformance:arch:modules'),
  pure('conformance:reading'),
  // Phase 257. The fact base: build/conformance-facts.mjs runs the shipping
  // reader, extractor and store under the pinned tsx over eight committed
  // fixtures, this checkout's own src/ and a scratch arch.db, then over
  // twenty-two ablated copies of src/main. One plain node for the watcher
  // gate, no git, no Electron, nothing under the person's home.
  pure('conformance:facts'),
  // Phase 258. The computed ladder, the units and the reading surface's
  // numbers: build/conformance-evidence.mjs runs the SHIPPING evidence,
  // skeleton, map and store modules under node over six committed fixture
  // trees and eight planted graphs, then over an ablated copy of src/main
  // once per clause. It launches no Electron, starts no git, and its one
  // write is a scratch arch.db under a directory it removes in a finally.
  pure('conformance:evidence'),
  // Phase 259. The bounded semantic pass: build/conformance-semantic.mjs runs
  // the SHIPPING block composer, validator, citation grader and floor under
  // the pinned tsx over the committed fixtures in build/fixtures/semantic/,
  // measures the seven planted lies against the shipping refusals, then runs
  // the same probe over an ablated copy of src/main once per clause. It
  // spawns NO AGENT, starts no Electron and spends NO TOKEN; its only writes
  // are the ablated copies under a directory it removes in a finally.
  pure('conformance:semantic'),
  // Phase 207. The frame hue: build/conformance-hue.mjs runs the shipping
  // rotation and text rule under node over all 360 degrees and a synthetic
  // ground, then over twelve ablated copies of the code, one clause each.
  pure('conformance:hue'),
  // PHASE 248. The wide block in the markdown preview: it runs
  // build/p248/assert-wide-blocks.mjs, which reads the shipped stylesheet by
  // matching braces, evaluates the shipped width expression in node at every
  // pane the app run drove and compares it with what the browser drew, and
  // re-derives the affordance's contrast on both bases from tokens.css. It
  // then runs the same rules over twelve ablated copies of the stylesheet, one
  // clause each. It launches no Electron, starts no tmux server, spawns
  // nothing at all and reads nothing under the person's home.
  pure('conformance:wideblocks'),
  // PHASE 255. The windowed markdown preview: it runs
  // build/p255/assert-preview-window.mjs, which drives the SHIPPING window
  // scanner, chunk parser, rehype plugin lists and deferral guard under node
  // over this repository's own markdown, the research 116 twins and fixtures
  // it writes itself, compares the drawn page with a re-derived old
  // react-markdown render, and then runs the same probe over 23 ablated copies
  // of the module directory, one clause each, removed in a finally. It
  // launches no Electron, starts no tmux server, spawns only the pinned tsx
  // and reads nothing under the person's home.
  pure('conformance:preview'),
  pure('conformance:watcher'),
  // PHASE 215. The shared question every harvest descriptor must answer, the
  // codex sub agent predicate, the chain walk and the boot repair.
  // build/conformance-derived.mjs writes every fixture itself into a scratch
  // directory it removes in a finally block, drives the SHIPPING repair over a
  // fixture manifest and a fixture codex store, and then runs the same probe
  // over fourteen ablated copies of the pure module, one clause each.
  pure('conformance:derived'),
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
  // PHASE 206 ITEM 5. The same rule for anything else a script starts, being a
  // shell, a server, a sleeper or a load generator. It scans build/ for an
  // asynchronous spawn that is detached or is a runner that does not stop by
  // itself, and refuses one whose kill is not inside a `finally` read by
  // matching braces. Nineteen fixtures, thirteen of which must make it fail,
  // including the exact shape that leaked on 2026-09-02, and it runs inside
  // npm run build so nothing that builds can skip it.
  pure('gate:background'),
  // PHASE 166. The cache policy imports no file system, names no durable
  // path, and neither it nor any file reading it calls a deletion API; no
  // production file under src/main calls a session cache deletion at all.
  // Four fixtures it writes itself prove the scanner fails when it should.
  pure('gate:cache-policy'),
  // PHASE 193. No file under build/ except build/ssh-run.mjs hands ssh, scp,
  // sftp or ssh-keyscan to a spawn, none hands ssh-keygen a known_hosts flag,
  // and none names one on a shell command line. Every one of the nineteen
  // scripts that runs one still reaches the helper, which emits
  // -o UserKnownHostsFile= from a single place, refuses an empty value, gives
  // knownHosts no default so forgetting it throws, prepends it so nothing
  // later in an argv can win, and puts Tortie's own record file first. The 36
  // shapes in build/known-hosts-fixtures.mjs prove the scanner fails when it
  // should: 32 must be caught and 4 are controls that must not be. It runs
  // inside npm run build, so nothing that builds can skip it.
  pure('gate:knownhosts'),
  // PHASE 189. A project tab is never again drawn as one letter and an
  // ellipsis. The fix is three declarations and one deletion, and every one of
  // them is a single line a later round can undo without noticing: the name's
  // measured 46px floor, the absence of `min-width: 0` on the tab and its
  // wrapper, the scrolling `.ptab-list`, the machine badge's own floor, and no
  // JavaScript pre-truncation of a tab name. Seven fixtures it writes itself
  // prove the scanner fails when it should. It runs inside npm run build, so
  // nothing that builds can skip it.
  pure('gate:tab-floor'),
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
  // PHASE 193. The reproduction behind npm run gate:knownhosts, run rather
  // than read: the mechanism is proved live against this run's own sshd, a
  // caller that forgets the record file is proved to throw before anything is
  // spawned, a scoped run is proved to write only where it was told, and the
  // two file form is proved to write only its FIRST file. The person's own
  // ~/.ssh/known_hosts is read for its size and its sha256 at both ends and
  // nothing else. It is not in any battery: the gate is what runs every time.
  remote('probe:p193'),
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
  // PHASE 234. build/probe-p234-arch.mjs: the Architecture face on a tab whose
  // folder is on the operator's Mac Pro, beside the SAME repository opened
  // locally, read off the DOM in one app run and compared row for row. It
  // builds and removes ONE scratch repository under his home, starts a scratch
  // tmux server on a socket named for its own pid and unlinks that socket on
  // both machines in a `finally`, lists his own `-L gmux` server and never
  // touches it, spawns no agent and spends no token. It EXITS NON ZERO on a
  // difference between the two faces, including a word the remote face carries
  // and the local one does not, which is the operator's rule of 2026-09-07 made
  // a check. `P234_PARENT=1` grades the other way round, for a run at the
  // parent commit.
  realRemote('probe:p234'),
  // PHASE 235. build/probe-p235-nits.mjs: the five nits of the remote round,
  // driven once against the operator's Mac Pro and GRADED, being the editor
  // tab strip's two verbs on a remote tab, the sentence for a machine nothing
  // reached, the tab of a machine whose confirm hash moved, and the agent
  // board one connection after the answer it holds. It builds and removes ONE
  // scratch repository under his home, starts a scratch tmux server on a
  // socket named for its own pid and unlinks that socket on both machines in a
  // `finally`, lists his own `-L gmux` server and never touches it, saves and
  // restores the person's own pasteboard, spawns no agent and spends no token.
  // It EXITS NON ZERO when any of the five readings is the parent's.
  // `--self-test` proves the grader on 14 fixtures and launches nothing.
  realRemote('probe:p235'),
  // PHASE 242. build/probe-p242-write-path.mjs: EVERY write verb Tortie has,
  // driven in one run against the machine the operator names, over the real
  // link, with every result read back from that machine by an ssh Tortie did
  // not compose. Four launches on ONE scratch profile, each one a different
  // persisted state: the row confirmed with no folder, every verb refused on
  // that row with both faces read side by side, the folder confirmed through
  // the real sheet, then every verb again with the containment attack and the
  // redline. It builds and removes THREE scratch paths under his home, all
  // carrying its own `tortie-p242-scratch-<pid>` prefix and all removed in a
  // `finally`; it starts a scratch tmux server on a socket named for its own
  // pid and ENDS AND UNLINKS that socket on both machines in the same
  // `finally`; it lists his own `-L gmux` server and never touches it; it
  // never writes his `~/.gitconfig` or either `~/.ssh`; it spawns no agent and
  // spends no token. It EXITS NON ZERO when a verb aimed at a path outside the
  // confirmed folder is not refused, when the far side moved, when a verb on a
  // row with no folder wrote anything, or when the remote face draws a
  // sentence the local face does not that is not a disabled control's own
  // label, which is the operator's rule of 2026-09-07 made a check.
  // `--self-test` proves the grader on 16 fixtures and launches nothing.
  realRemote('probe:p242'),

  // Phase 242.2. The picture put on a machine, driven against the real one.
  // Two Electrons one after the other on one scratch profile and the
  // gmux-p242-2-<pid> socket, no agent, no token, no keychain. It plants a
  // symbolic link and a hard link at the staged name `<name>.part` inside
  // `~/.tortie/images` on the far side and drives `machines.putImage` at each,
  // then reads the victim outside that directory with an `ssh` Tortie did not
  // compose. It fails when any victim holds the picture's bytes, when a landed
  // name is a link rather than a picture, when a hard-linked victim still
  // carries two names, or when a save that used to succeed refuses. Every far
  // side path carries this run's own `tortie-p242-2-scratch-<pid>` prefix or is
  // `~/.tortie`, and the scratch tmux socket is ended AND unlinked on both
  // machines in a `finally`. `--self-test` proves the grader on 8 fixtures and
  // launches nothing.
  realRemote('probe:p2422'),

  // Phase 242.2's FIX ROUND, and it is the round's VERIFIER's probe rather
  // than its builder's, kept because it is the only thing that drove the
  // picture's OWN name. Two Electrons one after the other on one scratch
  // profile and the gmux-p242-2v-<pid> socket, no agent, no token, no
  // keychain. Reading A drives the parent's and HEAD's `image-put` text on the
  // far machine's own shell over six plant shapes each, three of which the
  // builder's own arms never drove; reading B drives `machines.putImage` over
  // four of them, with the far side read by an `ssh` Tortie did not compose.
  // It fails when anything outside `~/.tortie/images` reads differently after
  // a put than before it, which includes a file this run planted as the
  // person's own being replaced and any name appearing out there that was not
  // there before. Every far side path carries this run's own
  // `tortie-p242-2v-scratch-<pid>` prefix or is `~/.tortie`, which it refuses
  // to run at all unless it is absent first, and the scratch tmux socket is
  // ended AND unlinked on both machines in a `finally`. `--self-test` proves
  // the grader on 6 fixtures and launches nothing.
  realRemote('probe:p2422v'),

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
  // PHASE 201. Does the sidebar read? One launch on a scratch profile opens
  // the repository named in P201_PROJECT, a COPY and never the checkout it
  // runs from, flips the Architecture switch in that profile, waits for the
  // cold scan and the tree read, and reads the header icons, the repository
  // line, the model slot, every row's sentence and hover facts, the contract
  // section's place and the map's boxes off the DOM, against the approved
  // mock when the repository is the gmux copy. It spawns no agent, spends no
  // token, and proves the repository was only read by comparing git status
  // before and after.
  electron('probe:p201'),
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
  // PHASE 189. Does the row of project tabs stay readable when there are too
  // many? ONE launch on a scratch profile opens the operator's own twelve
  // project names as tabs and drives the whole journey in that one session:
  // three window widths and three project counts, a live resize sweep, a
  // project opened and closed while narrow, the ⌘ digit chord onto a tab the
  // row has scrolled away from, a pointer reorder that has to auto-scroll to
  // reach its landing gap, a wheel over the row, and the machine badge in a
  // real tab. At every reading it re-derives the readability floor off the DOM
  // with canvas measureText using the label's own computed font, so the drawn
  // label is checked against measured text rather than against the component's
  // belief. It spawns no agent, spends no token, opens no repository of the
  // operator's and makes no request.
  electron('probe:p189'),
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
  // PHASE 202. Does a session run under the login a person chose? Two launches
  // on one scratch profile and the p202 socket drive the whole matrix over a
  // FIXTURE second login per provider: the pane environment read from inside
  // the pane, the login name on the row, the plan the meter reached, the card
  // read off the DOM, restore by name after the server holding the sessions is
  // gone, the fallback with its sentence when the login is removed, and the
  // attacks, being a switch mid launch, a deleted directory, a hand edited
  // store file naming a directory Tortie does not own, and posts from the
  // wrong login. NO VENDOR BINARY RUNS: claude and codex are two stub scripts
  // the probe writes, which record the environment their pane really got. NO
  // CREDENTIAL OF THE PERSON IS OPENED: the transport is a file and the
  // keychain is refused, and the run points CLAUDE_CONFIG_DIR and CODEX_HOME
  // at scratch directories, so the default login of the run is a folder the
  // probe made. It spends no token, runs no sign in, and hashes the person's
  // three credential files before and after. `node
  // build/probe-p202-logins.mjs --self-test` proves the graders on thirteen
  // fixtures and launches nothing.
  electron('probe:p202'),
  // PHASE 206. ONE launch on one scratch profile, reading two of the fourth
  // nits round's five items off the real DOM. Item 1: a login added through
  // the shipped store, the exact stray the Phase 203 verifier found on the
  // operator's disk planted beside it, being a directory whose id no row names
  // with a credential inside, then Remove pressed through the shipped path,
  // and the login list, `logins.json` and the provider root's own listing read
  // back. Item 3: the real Settings window's Custom font family field, one
  // planted invisible character per family of the two Unicode properties,
  // committed by blur the way a person commits it, and the value read back off
  // the input. It creates no session, spawns no agent, makes no request and
  // spends no token; it asks the keychain for ATTRIBUTES only, never `-g` and
  // never `-w`, and hashes the person's credentials before and after. `node
  // build/probe-p206-nits.mjs --self-test` proves the graders on eight
  // fixtures and launches nothing.
  electron('probe:p206'),
  // PHASE 209. The selection is the history, not the screen, driven in ONE app
  // run over one real shell session on a scratch profile and the scratch
  // socket gmux-p209. Six arms: the eight second hold above the top edge with
  // the lines copied counted against the lines travelled, a hold below the
  // bottom from a parked view, a drag that reverses past its anchor, a hold
  // that reaches the top of the history, a streaming pane under a live drag,
  // and byte identity between the history path and xterm's own over the same
  // range. It presses command C for real, so the system pasteboard is saved
  // with every flavour of every item before the run and put back in the same
  // finally, by build/pasteboard-keep.swift compiled into the run directory;
  // the flavours are printed before and after and must agree. It spawns no
  // agent, spends no token, opens no native menu and touches `-L gmux` in one
  // place only, a read only session count taken before and after. `node
  // build/probe-p209-selection.mjs --self-test` proves the six graders on
  // sixteen fixtures and launches nothing.
  electron('probe:p209'),
  // PHASE 208. One app run on a scratch profile over a SCRATCH KEYCHAIN the
  // probe makes with `security create-keychain` under the harness directory,
  // never adds to the search list and deletes in a finally. It plants a
  // credential in the scratch default store, lets the boot observe run, and
  // reads the planted bytes back out of the scoped slot in the scratch
  // keychain under this profile's digest, while an unscoped item planted
  // beside it is left untouched and the boot line says the migration was
  // refused. It then drives the shipping migration over the real security on
  // the same file, six arms, and inventories his own keychain by attributes
  // before and after with NO -g and NO -w against it. `node
  // build/probe-p208-vault.mjs --self-test` proves the graders on fifteen
  // fixtures and launches nothing.
  electron('probe:p208'),
  // PHASE 211. One launch on a scratch profile and a scratch keychain: a codex
  // session opens on the default login, a second account signs into the default
  // store and promotes the first, the promoted login is chosen while the
  // default session runs and the default store is read back holding it (the
  // default lift), and a fresh sign in written from OUTSIDE redraws the menu
  // with no hover and no visit (the watcher). It writes only scratch codex
  // files, opens no keychain of his, spawns no agent and spends no token, and
  // inventories his keychain by attributes before and after with NO -g and NO
  // -w. The lock is proved by the conformance gate's claudeLock arm, not by an
  // app-run log, because the credentials domain may write no log line.
  // `node build/probe-p211-switch.mjs --self-test` proves the graders on
  // fourteen fixtures and launches nothing.
  electron('probe:p211'),
  // PHASE 203. Two launches on ONE scratch profile over SIX fixture logins,
  // one per shape a login row can take, being the default and an added login
  // each signed in with an address, signed in without one, and not signed in
  // at all. The first launch turns both meters on the way a person does, opens
  // the meter's card with a real pointer event and reads the list, the native
  // menu the shipped composer would be handed, and every card line. The second
  // drives the real Settings window and reads every login row off its DOM. It
  // creates no session, spawns no agent, makes no request, spends no token,
  // and opens NO KEYCHAIN: the usage fixture refuses it for the meter and for
  // the list alike, so every presence answer comes from a file the probe
  // wrote. It hashes the person's three credential files before and after.
  // `node build/probe-p203-account.mjs --self-test` proves the graders on
  // thirteen fixtures and launches nothing.
  electron('probe:p203'),
  // Phase 204. One app run over FIXTURE stores on a scratch profile: it reads
  // the login rows off the real Settings window's DOM, rewrites both default
  // stores while the app is running the way the vendor's own /login does, and
  // reads them again. It opens no keychain, spawns no agent and spends no
  // token, and it hashes his own three credentials at both ends.
  electron('probe:p204'),
  // PHASE 205. The three defects the operator reported on 2026-09-02, driven
  // in ONE app run over one real session on a scratch profile and the scratch
  // socket gmux-p205: the scroll position across a blur and a focus with every
  // byte the pane sent, the glyph on every row of the COMPOSED session menu
  // matched by rasterising the closed set and comparing pixels, and a
  // selection extended by a drag held at the top edge and by a wheel during a
  // live drag. It carries every must-not-change arm too, being a pane already
  // at the live bottom, Enter returning a scrolled pane, a plain scroll with
  // no drag, and a click. It spawns no agent, spends no token and touches the
  // system pasteboard never: the native menu is answered with a label no row
  // carries, so no item ever runs. `node build/probe-p205-terminal.mjs
  // --self-test` proves the three graders on twelve fixtures and launches
  // nothing.
  electron('probe:p205'),
  // Phase 207. build/probe-p207-hue.mjs: one Electron on a scratch profile
  // and the gmux-p207 socket, one shell session, one file in the editor,
  // and five readings of the frame at four hues plus the synthetic ground,
  // every colour read off the DOM. `--self-test` proves the grader on
  // fixtures and launches nothing.
  electron('probe:p207'),
  // Phase 210. build/probe-p210-ramp.mjs: TWO Electrons one after the other
  // on one scratch profile and the gmux-p210 socket, one shell session and
  // one file in the editor, six frames read off six surfaces, then the
  // SETTINGS window read for the resting face. Spawns no agent, spends no
  // token, opens no keychain.
  electron('probe:p210'),
  // PHASE 213. build/probe-p213-scheme.mjs: THREE Electrons one after the
  // other and never at once, on one scratch profile and the gmux-p213 socket,
  // one shell session, a file in Monaco, a Pierre diff, the Redline and the
  // Architecture map. It reads the first frame at boot on each scheme, every
  // surface on both bases, the crossfade frame by frame, the mock by
  // rectangle and by colour, the window fill through main, Match the Mac
  // flipped once and then ten times in a second, and a hand edited settings
  // file that must read as dark. Spawns no agent, spends no token, opens no
  // keychain. `--self-test` proves the graders on 24 fixtures and launches
  // nothing.
  electron('probe:p213'),
  // PHASE 214. build/probe-p214-light-face.mjs: ONE Electron on a scratch
  // profile and the gmux-p214 socket. It reads the Appearance face on both
  // bases and asserts the Shade row is ABSENT on paper and drawn on graphite,
  // drives the round trip through the settings file, and reads the commit
  // graph at SIX LIVE LANES off a repository it builds itself with an octopus
  // merge, measuring every pair on the widest row under a dichromat
  // simulation of its own and photographing it. Spawns no agent, spends no
  // token, opens no keychain, reads nothing under the person's home.
  // `--self-test` proves the graders on 19 fixtures and launches nothing.
  electron('probe:p214'),
  // PHASE 217. build/probe-p217-tmux.mjs: TWO Electrons one after the other
  // and never at once, on one scratch profile and the gmux-p217 socket. Launch
  // A reproduces the operator's 2026-09-06 report exactly, being a scratch
  // server made by an installed Tortie's own tmux at 3.7b against a client
  // forced to the machine's 3.6a, and reads the refusal off the DOM. Launch B
  // drops the override and proves a development build now resolves the copy
  // the checkout carries and boots. It spawns no agent, spends no token, opens
  // no keychain, and never addresses socket gmux. `--self-test` proves the
  // graders on 17 fixtures and launches nothing.
  electron('probe:p217'),
  // PHASE 218. build/probe-p218-dots.mjs: ONE Electron on a scratch profile
  // and the gmux-p218 socket, with HOME inside the scratch directory. It
  // makes one repository of its own and two plain shell sessions on that
  // socket, ends one of them by typing at it, and reads the IDLE disc, the
  // ENDED ring and the unknown ring off REAL SELECTED ROWS at five frames:
  // the shipped one on graphite, the worst frame graphite offers, the same
  // frame with the parent's two declarations planted on the live root, and
  // the shipped and worst frames on paper. The ground under each mark is
  // found by walking up from the dot to the first opaque fill rather than by
  // naming a token, and the ratio is computed with WCAG arithmetic of this
  // file's own, so the reading is not the gate's instrument. Spawns no agent,
  // spends no token, opens no keychain, makes no request, reads nothing under
  // the person's home. `--self-test` proves the graders on 23 fixtures and
  // launches nothing.
  electron('probe:p218'),
  // PHASE 219, ITEM 9. The GEOMETRY reading, which no unit test can take. One
  // app run on a scratch profile creates a real shell session whose name is
  // 137 characters, opens the diagnostics report, and reads the sessions
  // table's own floor four ways in ONE window: at the shipped 22ch cap, with
  // the cap rule switched off in the CSSOM, which is the parent reading taken
  // in the same build rather than another one, and with the cap driven to
  // zero, which is the irreducible width of the other seven columns. Each is
  // read at the natural pane width and at EDITOR_MIN, the narrowest pane the
  // app will give this tab. It spawns no agent, spends no token, opens no
  // keychain, and never addresses socket gmux.
  //
  // PHASE 221 ADDED THE RULING'S OWN READINGS to the same window and made them
  // EXIT NON ZERO, so it is a check and not a printout: the floor with the
  // project column at its own 22ch cap, which this fixture's seven character
  // directory name cannot reach and which is the real worst case; the first
  // column pinned at EDITOR_MIN with the card scrolled to its far end, being
  // the head and the cell both holding the card's left edge, the fill being
  // the card's own and not the canvas behind it, and the rule that keeps the
  // row hover on that cell; and a sample of the PHOTOGRAPH at the header's
  // hairline inside the pinned column and beside it, which is the one question
  // a computed style cannot answer, because border-collapse gives that
  // hairline to the TABLE and paints it before any cell background.
  //
  // THE FIX ROUND ADDED READING 9 AND GAVE READING 8 A FAILING CASE. Reading 9
  // is the REGRESSION the pin introduced: .diag-head has been sticky at
  // z-index 1 since Phase 163, the pin arrived sticky at the same number, and
  // nothing between the pinned cell and the tab makes a stacking context, so
  // the two are siblings and tree order decides — the table is later, so the
  // pinned column painted over the report's own head and took its clicks at
  // EVERY pane width. It walks the ancestors to prove the context claim, then
  // scrolls a row under the head and asks elementFromPoint who is really
  // there. Reading 8 asked whether the sampled pixel merely DIFFERED from the
  // card's fill, which could not fail: with the border taken off every th both
  // samples read a distance of one and it stayed green. It is asked against
  // the resolved --border now, and a sample that lands outside the card is a
  // failure rather than a reading, which is what the static ablation was
  // quietly passing on.
  //
  // AND THE COMMITTER'S ROUND WIDENED READING 9, because as written it could
  // not see the defect the fix for it introduced. Its ancestor walk stopped at
  // .diag and printed "none, so the two sticky layers are siblings" without
  // ever NAMING the context they are siblings in. It was the DOCUMENT ROOT:
  // overflow makes no stacking context and every ancestor up to BODY is static
  // or position: relative with z-index: auto, so raising the head to 2 tied it
  // with the editor pane's own .ed-divider, the 5px drag handle, which is
  // earlier in tree order and therefore lost 2 of its 5 pixels wherever the
  // two overlap. The walk now runs to the document root and names its answer,
  // enumerates every positioned peer sharing that context, and hit tests the
  // rightmost pixel of the handle inside the head's band. Both clauses go red
  // at the parent of `isolation: isolate` on .diag, where the peer list reads
  // .xterm-helpers 5, .xterm-link-layer 2, .ed-divider 2, .sidebar-resizer 2
  // and eight more.
  electron('probe:p219'),
  // PHASE 225, the fix round. The shadow baseline's app run: ONE launch on a
  // scratch profile, a scratch HOME and its own socket over a repository it
  // builds itself, taking the projection property off the live DOM inside the
  // real EditorPanel tree at nineteen readings and the baseline generation at
  // every step. The outside writes are a synchronous /bin/sh. It spawns no
  // agent, spends no token, opens no keychain, and touches `-L gmux` in one
  // place only, a read only session count taken before and after.
  electron('probe:p225'),
  // PHASE 227. The rewind's app run: ONE launch on a scratch profile, a scratch
  // HOME and its own socket over a repository it builds itself, driving the
  // keyboard rewind and undo, a stale-file refusal, and the person's own
  // paragraph, reading the file FROM DISK at each. Outside writes are a
  // synchronous /bin/sh. No agent, no token, no keychain; `-L gmux` touched
  // only by a read-only session count before and after.
  electron('probe:p227'),
  electron('probe:p240'),
  // PHASE 247. A path in a transcript, pressed: ONE launch on a scratch
  // profile, a scratch HOME and its own socket, over a project it builds
  // itself, with a plain shell echoing SEVEN paths into the transcript. It
  // hovers the cell tmux says each path occupies and presses it. NOTHING IS
  // EVER OPENED BY macOS: GMUX_PATH_OPEN_RECORD is set for the whole run, so
  // the external door records the path and starts nothing. No agent, no
  // token, no keychain, no request; `-L gmux` touched only by a read-only
  // session count before and after. THE FIX ROUND gave every arm its own
  // geometry and its own capture, because an open editor tab narrows the pane
  // from 144 columns to 78 and tmux reflows its history underneath: arms C, D
  // and E had been pressing a stale cell and passing by pressing nothing.
  // Arm F is the fix round's own, and reads the cell rule off the running app
  // — 2 findings at the parent and 0 at HEAD.
  electron('probe:p247'),
  // PHASE 260. Editor tabs follow the project: ONE launch on a scratch profile,
  // a scratch HOME and its own socket, over three git projects it builds
  // itself. It types, rewinds a redline change, switches projects and reads
  // the strip empty, opens eleven files for keeps in the second project, comes
  // back and reads the dirty dot, the baseline generation, ⌥⇧⌫ undoing the
  // rewind and ⌘Z undoing the typing, presses a path in the first project's
  // terminal that names a file in the second and reads it open under the
  // second, closes the first project with its dirty tab and reads the prompt,
  // then reads renderer memory at ten tabs in each of three projects against
  // the Phase 167 plateau rule. At the parent the switch shows the first
  // project's tabs under the second and the eleventh open evicts a hidden one.
  electron('probe:p260'),
  // PHASE 248. The block that got the pane: ONE launch on a scratch profile, a
  // scratch HOME and its own socket, over a one-document project it writes
  // itself. It drags the editor's divider to four pane widths and reads the
  // prose column, the table's box, every column's visible fraction, the code
  // fence's box and whether the DOCUMENT scrolls sideways off the live DOM,
  // sweeps the pane to find where the box stops growing, injects two
  // measurement-only ablations removed in a `finally`, and reads the same
  // rectangles on paper. No agent, no token, no keychain, no request; `-L
  // gmux` touched only by a read-only session count before and after.
  electron('probe:p248'),
  // PHASE 252. The box fits its content: ONE launch on a scratch profile, a
  // scratch HOME and its own socket, over a one-document project it writes
  // itself carrying the operator's five screenshot shapes plus the two the
  // width classes need. It reads every block's used width against the clamp
  // (content between the column and the cap) and its centre against the prose
  // column's axis at three panes, on both bases and at zoom stops above and
  // below 1, injects the PARENT'S rule as a measurement-only stylesheet
  // removed in a `finally` to prove the defect comes back and the good tables
  // are unmoved byte for byte, ablates the centring the same way, measures
  // the losing grid candidate, and proves the translated box still scrolls,
  // hit-tests and takes a caret. No agent, no token, no keychain, no request;
  // `-L gmux` touched only by a read-only session count before and after.
  electron('probe:p252'),
  // PHASE 254. The large-file open path's app run: ONE launch on a scratch
  // profile, a scratch HOME and its own socket over a repository it builds
  // from research 116's SYNTHESIZED twins (sizes and line shapes only — no
  // byte of the operator's files). It single-clicks the 2.56 MB untracked
  // twin and reads click-to-first-paint and click-to-interactive off an
  // in-page rAF + longtask recorder (Monaco under the budget, the rendered
  // preview deferred to the chip with its one-clause title), proves a small
  // .md still opens rendered and the 3.26 MB tracked twin still opens as the
  // fast diff, then clicks Preview on the chip and proves the deferred render
  // still happens, publishing its cost. RED AT THE PARENT: the same click
  // there renders the whole document at ~5.5 s with no first paint until the
  // end. No agent, no token, no keychain; `-L gmux` touched only by a
  // read-only session count before and after. --self-test proves the grader
  // and the twin synthesizer and launches nothing.
  electron('probe:p254'),
  // PHASE 255. The preview paints fast: ONE launch on a scratch profile, a
  // scratch HOME and its own socket, over a scratch git repository holding the
  // research 116 twins, this checkout's own docs/BACKLOG.md and two table-first
  // files. It clicks Preview on the mode chip and reads first paint, the worst
  // long task, a PageDown's delay mid-stream and the settled page's element
  // count, heading ids, text digest, scrollHeight, bottom, last heading and a
  // backwards find, graded against the committed parent readings. No agent, no
  // token, no keychain; `-L gmux` only counted before and after. --self-test
  // proves the grader and launches nothing.
  electron('probe:p255'),
  electron('probe:p250'),
  // PHASE 236. The redline chip's app run, written by the VERIFIER: ONE launch
  // on a scratch profile, a scratch HOME and its own socket over a repository
  // it builds itself. It takes the document's height and every change's
  // getClientRects()[0] with no chip and with one, which must be identical to
  // the pixel, and takes them a third time with a real IN-FLOW copy spliced in,
  // which must move, so the ruler is proved able to see the shape research 83
  // refused. It then drives the chip's Rewind and Undo and reads the file FROM
  // DISK, drags the divider to a 380px pane and proves the chip sits on the
  // change's first fragment, copies the document to the real pasteboard and
  // proves no glyph of the chip is in it, and reads the Edit menu out of main.
  // Outside writes are a synchronous /bin/sh. No agent, no token, no keychain;
  // `-L gmux` touched only by a read-only session count before and after, and
  // the person's own pasteboard saved and put back in a finally.
  electron('probe:p236'),
  electron('probe:p185'),
  electron('probe:p194'),
  // PHASE 237. Typing in the redline, driven in the real app with real key
  // events through CDP `Input.dispatchKeyEvent` and `Input.imeSetComposition`,
  // never `execCommand`, which research 83 records fires no `beforeinput` in
  // Chromium. One launch on a scratch profile with a scratch HOME and its own
  // git repository: it types a word and reads it back as an insertion with the
  // baseline projection and the generation unmoved, presses Enter and reads no
  // div and no br, saves and reads the FILE off disk, commits a Japanese
  // composition into the insertion, takes the typing back with ⌘Z, rewinds a
  // change with ⌥⌫ and puts it back with ⌥⇧⌫, and reads the one line that
  // names both undos. It creates no session, spawns no agent, spends no token
  // and opens no keychain, and touches `-L gmux` in one place only, a read
  // only session count taken before and after.
  electron('probe:p237'),
  // PHASE 238's MEASURE STEP. It answers one question with a number: how many
  // ordinary acts it takes to lose a baseline that only memory holds, which is
  // the shape research 83 B.3 gives an accept. ONE launch on a scratch profile
  // with a scratch HOME and its own socket, over a repository it builds itself
  // holding an UNTRACKED prose file, whose baseline is seeded at the first read
  // and lives nowhere else. It drives a single Explorer click, the same click
  // with the tab pinned, files opened for keeps past the ten tab cap, a tab
  // close and a window reload, and reads the change count, the sentence on the
  // face and the toasts off the DOM after each; a CONTROL arm under the cap
  // must SURVIVE, so a detector that only ever says "died" cannot read as a
  // finding. Outside writes are a synchronous /bin/sh. It creates no session,
  // spawns no agent, spends no token and opens no keychain, and touches
  // `-L gmux` in one place only, a read only session count before and after.
  electron('probe:p238'),
  // PHASE 238's FIX ROUND. The app run behind the one defect this phase put
  // into a neighbouring feature: after an accept, the undo of a rewind can
  // only refuse, and the face went on promising it. One launch on a scratch
  // profile with a scratch HOME opens a committed prose file in Redline,
  // rewinds a change through the real chord and reads the file FROM DISK,
  // accepts a DIFFERENT change and reads the digest unmoved, reads the undo
  // sentence and the chip's Undo button gone, presses ⌥⇧⌫ anyway and reads
  // the refusal sentence with the file still where the rewind left it — with
  // a CONTROL rewind and undo, no accept between, that must WRITE and come
  // back byte for byte, so a reading that refused whatever happened could not
  // pass. It also measures where the keyboard lands on the first two ⌥↓ and
  // reports it. Outside writes are a synchronous /bin/sh. It creates no
  // session, spawns no agent, spends no token and opens no keychain, and
  // touches `-L gmux` in one place only, a read only session count before and
  // after. `--self-test` proves its grader on ten fixtures and launches
  // nothing.
  electron('probe:p238u'),
  // PHASE 243. THE DURABLE BASELINE, and the only way to show a marking
  // outlives the tab is to end the app and start it again. TWO launches, one
  // after the other and never at once, on ONE scratch profile with a scratch
  // HOME: the first opens a committed prose file in Redline, has a
  // synchronous /bin/sh rewrite it from outside, accepts two changes through
  // the real chords with the file's digest unmoved across both, and reads the
  // store's own record naming the accept. The second reads the same file back
  // through the FOUR ACTS Phase 238's measure step used — the quit, a window
  // reload, the tab closed and opened, and eleven files opened for keeps past
  // MAX_TABS — and then attacks it by COMMITTING the file underneath, which
  // the stored baseline must be refused for rather than offered as a
  // narrowing across the commit. It creates no session, spawns no agent,
  // spends no token and opens no keychain, every byte it writes is under
  // GMUX_HARNESS_DIR, and it touches `-L gmux` in one place only, a read only
  // session count before and after. `--self-test` proves its grader on eleven
  // fixtures and launches nothing.
  // PHASE 251. The room and the wash, read off the running app at three pane
  // widths on BOTH bases (research 114 §8). It is the other half of
  // conformance:redline rules 33 to 36: that gate reads the stylesheet, and a
  // stylesheet reading cannot see a face substitution, so the ONE guard on the
  // long side of the wash — where two vertically adjacent washes would overlap
  // and paint ink over the neighbouring line — is this probe's painted-height
  // row and nothing else. It also counts the positioned boxes the current
  // change draws OVER EVERY CHANGE rather than over whichever one happens to
  // be current, which is the row the design's own first version got wrong. One
  // Electron on a scratch profile with a scratch HOME and its own tmux socket,
  // ended in a finally; it creates no session, spawns no agent, spends no
  // token and opens no keychain, every byte it writes is under
  // GMUX_HARNESS_DIR, and it touches `-L gmux` in one place only, a read only
  // session count before and after. `--self-test` proves its graders on 23
  // fixtures and launches nothing; `--compare` prints the parent commit's
  // readings beside HEAD's and launches nothing either.
  electron('probe:p249'),
  electron('probe:p243'),
  // Phase 257. The corpus run: shallow read-only clones under the harness
  // directory, the reference driver in process, then ONE Electron on a
  // scratch profile whose arch.db is read back and held against it.
  electron('probe:p257'),
  electron('probe:p258'),
  // Phase 259. THE ONE CHECK IN THIS REPOSITORY THAT SPENDS A TOKEN, and only
  // in its live mode, which is the integrator's. It drives the SHIPPED
  // arch:enrich channel through one Electron on a scratch profile with a
  // scratch HOME, over a scratch clone of this checkout, under the operator's
  // narrow lift of 2026-09-12. `--dry-run` is what a builder and a verifier
  // run: it drives the same chain and reads the refusal back, spawning no
  // agent and spending nothing. `--self-test` launches nothing at all.
  electron('measure:semantic'),
  // PHASE 198. The File history section over a REAL repository, a copy of a
  // Tortie checkout named with --project, never the one the probe runs from.
  // One launch on a scratch profile right clicks the fixture's row in the
  // Explorer, has main answer the row's own menu with History, reads the 31
  // rows and the rename boundary off the DOM against git's own --follow walk,
  // clicks the boundary and reads back a two sided diff from the editor store,
  // then walks the journey to the last tab closed. It creates no session,
  // spawns no agent and spends no token, and touches `-L gmux` in one place
  // only, a read only session count taken before and after.
  electron('probe:p198'),
  // Phase 197: the third nits round's one app run over its rendered items.
  electron('probe:p197'),
  // PHASE 199. One launch on a scratch profile over a COPY of a Tortie
  // checkout named in P199_PROJECT, which types into the History section's
  // search field one character at a time, reads each keystroke's walk time
  // off the store, holds every row set against git's own answer composed
  // with the probe's own argv, expands a row, opens a file, loads more,
  // runs the changes button, types a burst and a race, and presses Escape.
  // Spawns no agent and spends no token, and touches `-L gmux` in one place
  // only, a read only session count taken before and after.
  electron('probe:p199'),
  // PHASE 190. Does the inline control say what it can tell apart? One launch
  // on a scratch profile opens five diffs it wrote itself, being the
  // operator's own pure deletion, a replacement in the shape of his prose
  // commit, both in one file, a pure addition, and a hostile hundred pair
  // diff, clicks all four modes on each and reads the spans, a hash of the
  // rendered markup, and the line beside the control, so sameness is a byte
  // claim and the line is read off the DOM rather than the code. It reads the
  // comparison's cost in the running app over the large diff. It creates no
  // session, spawns no agent and spends no token, and touches `-L gmux` in
  // one place only, a read only session count taken before and after.
  electron('probe:p190'),
  // PHASE 182. The status line tap, with the REAL claude in the loop. It
  // writes Tortie's own generated managed script and settings file into a
  // scratch directory, binds a loopback server on an ephemeral port, launches
  // claude in a tmux pane on a scratch socket stamped the way paneEnvFor
  // stamps one, spends ONE short turn, and reads the post that arrives. Then
  // it feeds that body through the real usage service, whose transport and
  // credential reader both THROW, so a number on the meter can only be the
  // tap's. It reads no credential, prints no usage value, touches nothing
  // under ~/.claude and launches no Electron. NOT in the commit battery,
  // because it spends a real turn.
  {
    name: 'probe:p182',
    type: 'tmux harness',
    needs: 'the real claude binary on PATH and a logged in Claude subscription, plus a scratch tmux socket and a scratch directory of its own; it spends ONE real turn and reads no credential',
    skip: 'never skips; the scratch tmux server and the scratch directory are ended in a finally block'
  },
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
  // PHASE 197. The Architecture view's own drive, Phase 63's proof item, in a
  // script at last: it had been in no npm script and red at every commit
  // since Phase 158 replaced the seeding prompt its one check was written for.
  electron('probe:p63'),
  electron('probe:p64arch'),
  electron('probe:shellpath'),
  electron('probe:p101shot'),
  electron('probe:p102shot'),
  electron('probe:p103shot'),
  electron('probe:p104shot'),
  electron('probe:p120shot')
];
