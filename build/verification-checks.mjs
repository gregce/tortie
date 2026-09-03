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
  // Phase 187's guard. It is a vitest file rather than a tsx probe because the
  // exec plane is replaced by a function, which is the seam vitest owns, and it
  // drives the real feed's own state machine over 25 closes per arm.
  pure('conformance:remoteclose', NEEDS.vitest),
  pure('conformance:installs'),
  pure('conformance:context'),
  pure('conformance:overview'),
  pure('conformance:redline'),
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
  // Phase 207. The frame hue: build/conformance-hue.mjs runs the shipping
  // rotation and text rule under node over all 360 degrees and a synthetic
  // ground, then over twelve ablated copies of the code, one clause each.
  pure('conformance:hue'),
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
  electron('probe:p185'),
  electron('probe:p194'),
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
