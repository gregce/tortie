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
 *
 * ## The runtime the checks are allowed to run on (Phase 262)
 *
 * Every check in the table below runs on whatever `node` npm found first on
 * PATH, and below a measured floor the TypeScript ones load two copies of
 * every module. `SUPPORTED_NODE` and `assertSupportedRuntime()` below are the
 * refusal that stops them.
 *
 * The split is NOT Node's own behaviour. It is tsx 4.23.12's feature gate:
 * `node_modules/tsx/dist/register-C4vWVmug.mjs` installs ONE synchronous
 * `module.registerHooks()` loader, serving the import path and the require
 * path from a single instance, only when `module.registerHooks` exists and
 * tsx's own `moduleRegisterHooks` table admits the running version. When it
 * does not, tsx falls back to the async `module.register()` ESM hook plus a
 * separate CJS path, which is two loaders, two module instances and two
 * copies of every module-level Map. A registration made through one is then
 * invisible to the other and a check can pass for the wrong reason.
 *
 * `SUPPORTED_NODE` IS TSX'S OWN TABLE, copied from
 * `node_modules/tsx/dist/node-features-JeyyvQz6.mjs`, and `nodeIsSupported()`
 * is tsx's own predicate re-derived: each row is matched on its major, and the
 * LAST row is the catch-all every higher major falls through to. On 2026-09-13
 * the prediction was checked against the registry fixture
 * `build/p262-registry-loader.mts` on five real runtimes and agreed 5 of 5:
 * 20.18.3 and 22.14.0 split the registry, 22.23.1, 24.20.0 and 26.8.2 did not.
 *
 * A TSX UPGRADE CAN MOVE THIS TABLE, AND THIS FILE MUST BE RE-MEASURED WHEN
 * TSX MOVES. `npm run conformance:runtime` is the measurement: it runs the
 * fixture under every Node it finds on the machine and asserts the prediction
 * matches each one's outcome. `npm run gate:checks` clause 6 is what keeps
 * this table, `package.json`'s `engines.node` and `.nvmrc` saying one thing.
 */

import { readFileSync } from 'node:fs';

/**
 * The per-line floors, as a table rather than a semver string, because this
 * file may not gain a dependency and a string would need a parser. It is
 * tsx's own `moduleRegisterHooks` table; see the header. `package.json`'s
 * `engines.node` says the same thing in npm's language, and `gate:checks`
 * clause 6 compares the two so neither can drift.
 */
export const SUPPORTED_NODE = [
  [22, 22, 3],
  [24, 11, 1],
  [25, 1, 0],
  [26, 0, 0]
];

/** `[major, minor, patch]`, or null when the string is not a version. */
function parseVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(version).trim());
  if (match === null) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Is `parts` at or above `floor`? */
function atLeast(parts, floor) {
  for (let i = 0; i < 3; i += 1) {
    if (parts[i] !== floor[i]) return parts[i] > floor[i];
  }
  return true;
}

/**
 * Can this Node run the TypeScript checks without splitting every module in
 * two? tsx's own predicate: the first row whose major matches decides, and the
 * last row is the catch-all every higher major falls through to, so 23.x and
 * 25.0.x are refused while 27 and above are admitted.
 */
export function nodeIsSupported(version = process.versions.node) {
  const parts = parseVersion(version);
  if (parts === null) return false;
  for (let i = 0; i < SUPPORTED_NODE.length; i += 1) {
    const floor = SUPPORTED_NODE[i];
    if (i === SUPPORTED_NODE.length - 1 || parts[0] === floor[0]) {
      return atLeast(parts, floor);
    }
  }
  return false;
}

/** The table written in npm's language, e.g. `^22.22.3 || ... || >=26.0.0`. */
export function supportedNodeRange() {
  return SUPPORTED_NODE.map((floor, i) => {
    const prefix = i === SUPPORTED_NODE.length - 1 ? '>=' : '^';
    return `${prefix}${floor[0]}.${floor[1]}.${floor[2]}`;
  }).join(' || ');
}

/** The version `.nvmrc` names, or null when it cannot be read. */
function nvmrcVersion() {
  try {
    const text = readFileSync(new URL('../.nvmrc', import.meta.url), 'utf8');
    const first = text.trim();
    return first === '' ? null : first;
  } catch {
    return null;
  }
}

/**
 * Refuse, before an expensive probe starts, when the runtime npm actually
 * invoked cannot run the TypeScript checks. `build/ts-runner.mjs` calls this
 * as the first statement of its `tsxCli` function, which is the one place every
 * TypeScript check resolves its runner, so one call reaches all of them.
 *
 * The sentence names the version found, the range, and the files that decide
 * it. It never prints a path under the person's home and never prints
 * `process.env`.
 */
export function assertSupportedRuntime(version = process.versions.node) {
  if (nodeIsSupported(version)) return;
  const pinned = nvmrcVersion();
  const lines = [
    `Node ${version} cannot run Tortie's TypeScript checks.`,
    `They need ${supportedNodeRange()}.`,
    'Below those lines the TypeScript runner loads two copies of every ' +
      'module, so a registration made through one is invisible to the other ' +
      'and a check can pass for the wrong reason.',
    pinned === null
      ? '.nvmrc names the version this repository is verified on.'
      : `.nvmrc names ${pinned}, the version this repository is verified on.`,
    "The range is declared in package.json's engines field and in " +
      'build/verification-checks.mjs.'
  ];
  throw new Error(lines.join(' '));
}

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
  //
  // Phase 262. The runtime that runner is allowed to run on:
  // build/conformance-runtime.mjs runs the committed registry regression
  // build/p262-registry-loader.mts under the pinned tsx on every Node it
  // finds already installed on the machine, and asserts SUPPORTED_NODE above
  // predicts each one's outcome. It installs nothing, launches no Electron,
  // starts no tmux server and opens no ssh; a Node line this machine does not
  // have is reported and skipped rather than failed.
  pure('conformance:runtime'),
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
  // PHASE 293. The session manager: build/p293/conformance-manager.mjs runs
  // build/p293/manager-conformance-probe.mts under the pinned tsx, which drives
  // the SHIPPING gates predicate, batch loop, projection, view, cells and truth
  // table, and the press and the batch in actions.ts over the REAL renderer
  // store with every lifecycle verb replaced by a recorder, then reads the
  // domain's source with the TypeScript parser for the refusals: no DOM menu,
  // no stacked confirm, no data-session-id, the discard and kill bridges
  // reached only through the store's verbs, every per-row verb below a
  // freshRow(, no name handed to a lifecycle call. One plain node, no
  // Electron, no tmux, no ssh, no agent; its one write is an asset stub under a
  // mkdtemp in the system temporary directory, removed in a finally.
  pure('conformance:manager'),
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
  // Phase 273. The containment gate every fs mutation asks:
  // build/conformance-containment.mjs drives the SHIPPING src/main/fs/paths.ts
  // under node over a fixture the probe builds and removes in a finally — the
  // phase's escape checklist, row by row — then over ten ablated copies of the
  // guard, one clause each, each naming the rows it owns. It launches no
  // Electron and reads nothing under the person's home.
  pure('conformance:containment'),
  // Phase 274. The identity question this phase added: do these two paths name
  // ONE folder. build/p274/conformance-samefolder.mjs drives the SHIPPING
  // src/main/fs/folder-identity.ts under node over a fixture it builds in a
  // mkdtemp under /private/tmp, and AGAIN over a case-sensitive APFS disk image
  // it creates with hdiutil (no sudo) and detaches and deletes in a finally —
  // because a gate that only ever sees the operator's case-insensitive boot
  // disk cannot catch the merge danger. Then it reads the identity door, the
  // answer spelling and the no-case-folding refusal out of the shipping source,
  // and drives nine ablated copies of the module, one clause each. It launches no
  // Electron, spawns no agent and reads nothing under the person's home.
  adapter(
    'conformance:samefolder',
    'macOS hdiutil, to create and attach a case-sensitive APFS disk image with no sudo, detached and deleted in a finally; and a mkdtemp under /private/tmp so the /tmp row has its own twin spelling',
    'never skips; on a host with no hdiutil it says in ONE LINE which column is therefore not covered rather than passing quietly, and P274_REQUIRE_IMAGE=1 turns that degradation into a failure'
  ),
  // Phase 276. The login-shell answer, cached once per launch instead of once
  // per session: build/conformance-shellenv.mjs runs three lanes of
  // build/shellenv-conformance-probe.mts, which drives the SHIPPING cache in
  // src/main/tmux/resolve.ts and the SHIPPING watcher in src/main/env/ over the
  // modules' own seams — a counting fake for the capture, a fake directory
  // watcher the gate fires by hand, a fake clock so the 400 ms debounce and the
  // 5,000 ms floor are read as numbers rather than waited out — then reads the
  // refusals out of the tree. It SPAWNS NO SHELL, which is the point rather than
  // a convenience: the phase exists because `zsh -lic` is about a second on the
  // operator's machine. No Electron, no tmux, no ssh, nothing under the person's
  // home, and nothing written anywhere.
  pure('conformance:shellenv'),
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
  // PHASE 311. The phone mock may not invent a word Tortie does not say.
  // build/p311/copy-drift.mjs extracts every user-visible string the screens in
  // docs/design/phone/ draw, splits each at Tortie's own ` · ` separator, and
  // judges every segment against a declared ledger: owned by a named module and
  // compared to it byte for byte, or data with its reason, or owed by a named
  // later phase and printed on every run. A segment no rule covers fails by
  // name. Its --self-test arm re-judges in-memory mutations of the mock — a
  // curly quote straightened, a letter dropped, a status word swapped, an
  // undeclared sentence added, an agent name the registry does not carry — and
  // each must go red. It spawns nothing, writes nothing and reads only the mock
  // and the modules the ledger names.
  pure('conformance:phonecopy'),
  // PHASE 313, the door. Two checks, and they are two because they are two
  // different METHODS against the same domain and neither is the other's
  // proof.
  //
  // `conformance:pocket` READS the source with the TypeScript parser: one
  // `listen`, the address from the allowlist function alone, the string
  // 0.0.0.0 nowhere, the route table closed and every row a read, no write
  // verb and no credential import, no Authorization and no cookie, nothing
  // secret in a path, /pair dead outside its window, Referrer-Policy from one
  // place, the disposer owning the listener, and nothing secret reachable from
  // a log call. It binds nothing and opens nothing.
  //
  // `conformance:pocket:hostile` DRIVES a live door on 127.0.0.1 on a port it
  // found for itself, with a throwaway self-signed identity under a mkdtemp,
  // all of it ended in a `finally`. It is the phase's attack, and its honest
  // arms are in the same table as its refusals so a door that is merely OFF
  // fails it.
  //
  // THERE WAS A THIRD, `conformance:pocket:page`, and it is gone with the thing
  // it judged. `src/main/pocket/page/` was built and could not be reached under
  // this phase's own mechanism 5 — no script, no cookie, no bearer, no URL
  // token — and the operator ruled "lets skip the web app" on 2026-09-22. The
  // page's three rules came out of `conformance:pocket` and five arms out of
  // `ablation:p313` in the same change. The seven screens the page implemented
  // are still at `docs/design/phone/` and are Phase 316's to build in Swift.
  //
  // Neither of the two starts an Electron, a tmux server, an ssh or an agent,
  // spends a token, or reads anything under the person's home. NEITHER BINDS A
  // REAL INTERFACE: `host` and `port` are deps of the server and every check
  // passes 127.0.0.1 and 0, which is what build/p313/SPEC.md §4 exists to make
  // true rather than promised.
  pure('conformance:pocket'),
  pure('conformance:pocket:hostile'),
  // PHASE 311's app run, and the only reading of what a blocked row SAYS. ONE
  // Electron on a scratch profile with a scratch HOME and the socket
  // gmux-p311-<pid>, over one git project it builds itself. The `claude` on that
  // HOME's PATH is a nine line /bin/sh script printing the COMMITTED dialog
  // fixtures, so the screen half is the tree's own bytes, NO VENDOR PROCESS RUNS
  // AND NO TOKEN IS SPENT; the hook half is real, POSTed to the app's own
  // loopback route with the 128-bit token read out of the settings file the app
  // itself wrote. Ten arms: today's row live, the row after the hook, the
  // rectangle (one line, tail-truncated, and the whole question in the row's own
  // label), the Catch Me Up line and the question under it, the 200 cap, the
  // redaction on the drawn row, the clear when a SECOND committed dialog arrives
  // with no hook, a control shell row byte for byte, and app.log afterwards with
  // no byte of any body in it. P311_CHECKOUT points it at a parent build.
  electron('probe:p311'),
  // PHASE 312. The choices the agent drew. build/conformance-choices.mjs reads
  // this repository's own source and asserts twenty clauses over it: the
  // verdict's own loop pinned byte for byte with OPT1, OPT2, HINT and QUEST, the
  // five measured literals and the 24-row window, one spelling of the predicate
  // with one production call site, every carried string redacted BEFORE it is
  // clipped, the three caps and the ink bound each with one definition and one
  // call site and none of them in the renderer, no new SessionStatus member, the
  // channel's fields optional with an option's halves required, ONE composer for
  // the question, ONE draw site used by all three Catch Me Up levels and holding
  // no control, and the four clauses the fix round added from defects a verifier
  // drove. It SPAWNS NOTHING — not even the pinned tsx — starts no Electron and
  // no tmux, and reads nothing under the person's home; the behaviour itself is
  // driven over thirteen committed captures in six vitest files. About
  // 1 s. `ablation:p312` is the attack beside it.
  pure('conformance:choices'),
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
  // PHASE 293's app run: the session manager, driven with real pointer and key
  // events over the DevTools protocol, ONE Electron through
  // build/electron-run.mjs's withElectron on a scratch profile, a scratch HOME
  // and the socket gmux-p293-<pid>, over three scratch git projects it builds
  // itself, AND the loopback scratch machine from build/scratch-machine.mjs
  // (its own sshd on 127.0.0.1, its own keys and agent, its own TMUX_TMPDIR),
  // reached only through build/ssh-run.mjs and stopped in a `finally` that
  // names it. That sshd is why this is `remote` and not `electron`. Its drive
  // window.__p293 (src/renderer/app/p293-session-manager-drive.ts) supplies only
  // what a probe cannot do for real: the menu door through runMenuAction, the
  // native row menu's items as labels, a captured item run late, a held status
  // painted over a live row (needs_input, and since Phase 303 unknown,
  // restorable and running too, several at once), and Phase 303's prune
  // attack, a filter and a checked set in one store write. P293_ARMS picks
  // the arms so a run fits a budget. Env names
  // are P293_*, never GMUX_*, so the contract's env list does not move. It
  // spawns no agent and spends no token.
  remote('probe:p293'),
  // PHASE 300's app run: what a first read costs the person waiting. ONE
  // Electron through build/electron-run.mjs's withElectron on a scratch profile,
  // a scratch HOME and the socket gmux-p300-<pid>, over one scratch git project
  // it builds itself. It needs NO machine and no ssh, which is why this is
  // `electron` and not `remote`.
  //
  // IT READS NOTHING OF THE PERSON'S. Every codex record it reads it SYNTHESISED
  // from the committed fixture at docs/research/assets/63-fixtures/ through
  // build/p300/generate-codex-records.mjs, at the four sizes the operator's own
  // distribution names (p50 68 KB, p99 5.9 MB, 200 MiB, 960 MiB) plus a second
  // 200 MiB record for the page arm, and every generated byte is deleted in a
  // `finally`. The claude project directories C5 is about are empty directories
  // it creates under the scratch HOME. It spawns no agent and spends no token:
  // every seeded session is a manifest row.
  //
  // Its instrument is a 20 ms ping on the EXISTING `settings:get` channel from
  // inside the renderer, which measures main's unavailability from outside main
  // and adds no channel, no GMUX_* name and no harness smoke mode, so
  // gate:contract does not move. Since the fix round the pinger is DRAINED
  // before its worst is read, because the ping stuck behind a read lands one
  // task after the invoke and the first build graded every reading one label
  // late; a pass is graded on its wall and everything else on that drained
  // ping, against the worst of one or more parent runs. It has two page arms,
  // Catch Me Up's read after the sheet's and Catch Me Up's read first, because
  // the first build made the page read slower while its probe never took a
  // page reading. Env names are P300_*.
  electron('probe:p300'),

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
  // reads it back out of Tortie's own store, which since Phase 304 is a
  // `safeStorage`-sealed FILE under the profile: the file exists, is 0600, is
  // not the plant by sha256 and holds no window of it, and the scratch
  // keychain holds NO `Tortie-credentials-*` item at all afterwards, because
  // the app writes no such item any more (until Phase 304 the same reading was
  // a scoped item under this profile's digest). The boot line says the
  // migration was refused. It then drives the shipping migration over the
  // real security on the same file, the Phase 208 arms over the sealed vault
  // plus the Phase 304 duplicate sweep, and inventories his own keychain by
  // attributes before and after with NO -g and NO -w against it. `node
  // build/probe-p208-vault.mjs --self-test` proves the graders on its
  // fixtures and launches nothing.
  electron('probe:p208'),
  // PHASE 211. One launch on a scratch profile and a scratch keychain: a codex
  // session opens on the default login, a second account signs into the default
  // store and promotes the first, the promoted login is chosen while the
  // default session runs and the default store is read back holding it (the
  // default lift), and a fresh sign in written from OUTSIDE redraws the menu
  // with no hover and no visit (the watcher). It writes only scratch codex
  // files, opens no keychain of his, spawns no agent and spends no token. The
  // lock is proved by the conformance gate's claudeLock arm, not by an app-run
  // log, because the credentials domain may write no log line.
  //
  // PHASE 287 ADDED THE TOO-LARGE ARM to the same launch, steps 6 to 11: a
  // 4,193 byte codex credential, the size `stat` read of his own store, is
  // written into the default store and into two login stores from outside, and
  // the arm reads what a switch does when one `security` line cannot carry it.
  // Choosing a kept login while a default session runs must leave the default
  // store holding its own bytes (at the parent it is written over and the
  // person's sign in is gone), must say so once with Restart now and must not
  // also say it switched; a login whose store holds a DIFFERENT over-cap
  // account is refused with the sentence; a login whose store grew past the cap
  // under the SAME account is answered rather than refused for ever, with both
  // stores untouched; and the scratch keychain holds no item whose payload is
  // any of the three. Every `tooLarge` and `problem` reading is GRADED rather
  // than waited on, because the parent's drive carries neither field, and each
  // step waits instead on a promotion both builds make.
  //
  // Phase 287 also made a SCRATCH `HOME` the default for every `security` call
  // and for the app: `default-keychain` under it must answer "could not be
  // found" before anything is created and again at the end, `list-keychains`
  // reads that HOME's list, the `dump-keychain` inventory of the search list is
  // not run at all because it names no keychain, his two credential files are
  // compared by `lstat` rather than opened, and the app gets
  // `--use-mock-keychain`. `P211_REAL_HOME=1` restores Phase 211's behaviour
  // for its own reruns, and `P211_PARENT_CHECKOUT` points the same run at a
  // built parent worktree.
  //
  // PHASE 304 RE-SPECIFIED THE TOO-LARGE ARM for a vault that keeps
  // everything: Tortie's own store is a sealed file with no ceiling, so the
  // 4,193 byte credential is KEPT rather than refused, the account it belongs
  // to gets a row that can be chosen, and choosing it puts the bytes back
  // exactly; the scratch keychain holds no `Tortie-credentials-*` item at all,
  // and the only refusal left is the vendor's own keychain entry, which no
  // codex arm meets because a codex store is a file. `node
  // build/probe-p211-switch.mjs --self-test` proves the graders and launches
  // nothing.
  electron('probe:p211'),
  // PHASE 304. Tortie's own vault is a sealed file, and a sign in of any size
  // is kept. FOUR launches on one scratch profile over one scratch keychain
  // and a scratch HOME, ONE AT A TIME and never beside another: three logins
  // whose credentials are planted as the scoped keychain items an older build
  // kept are read through by the boot observe, and the app is ended with
  // SIGKILL at a named step of each read-through through the harness seam
  // `src/main/harness/vault-drive.ts` (before the sealed file is written,
  // before it is read back, before the item is deleted), with a copy proved
  // to exist from outside after every kill; the fourth launch keeps a 4,193
  // byte and a 1 MB payload through the shipping `vaultPut` and `vaultGet`
  // over the REAL `safeStorage` under Chromium's mock keychain, compared by
  // sha256 and never by content, with the sealed files 0600, not the payload,
  // holding no window of it and beginning `v10`; reads a 4,193 byte codex
  // store as kept at boot and puts it back byte exact once the store is
  // emptied and the login chosen; and proves a link planted at each of the
  // slot's two staged names sent nothing to the stand in it pointed at. The
  // one `security` call aimed at his search list is an attributes-only count
  // of `Tortie Safe Storage` by exit code, before and after, which must not
  // move. `P304_PARENT_CHECKOUT` points the same four launches at a built
  // parent worktree, where the seam is absent and the size arm is graded
  // unreadable, the items are read in place and never move, and the 4,193
  // byte store is refused. `node build/probe-p304.mjs --self-test` proves the
  // graders on 38 fixtures and launches nothing.
  electron('probe:p304'),
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
  // PHASE 268. Auto save, through the guarded door, with a REAL concurrent
  // writer. ONE Electron on a scratch profile with a scratch HOME under its
  // own GMUX_HARNESS_DIR and the socket gmux-p268-<pid>, over one git project
  // it builds itself. Eleven arms: off is off, it saves, it debounces to one
  // write, a /bin/sh writing the file underneath the buffer leaves the tab
  // dirty with the outsider's bytes intact and ONE toast, the stop is per tab,
  // ⌘S's three-answer dialog is the only way forward, Phase 260's promise
  // survives an eleventh open, a file outside every project never moves on a
  // timer, onFocusChange lands at the blur, and the File menu action moves the
  // mode both ways. It spawns no agent and spends no token.
  electron('probe:p268'),
  // PHASE 268's attack. It breaks conformance:save one clause at a time, the
  // count living in the script rather than here,
  // and proves each reddens the rule that owns it — then restores the tree in
  // a finally block. It launches no Electron and starts no process but node.
  pure('ablation:p268'),
  // PHASE 273's attack on the other half. It breaks conformance:save five
  // ways, one clause each — the moved sentence reworded, that sentence put
  // back on `outside` as well, the parent's one-word containment catch, the
  // causes enumerated in that catch instead of read off the stamp, and the
  // file's bytes in the refusal log line — and proves each reddens the rule
  // that owns it, then restores all three source files in a finally block. It
  // launches no Electron and starts no process but node.
  pure('ablation:p273'),
  // PHASE 274's attack on its own gate. conformance:samefolder ablates
  // src/main/fs/folder-identity.ts by COPYING it; its other rules are read out
  // of the shipping source at its real path, where there is no copy to break.
  // So this script breaks the real file thirteen ways, one clause each — the
  // identity lookup, the order of its two questions, the tombstone it clears,
  // the ON CONFLICT clause, the local-only guard, the volume word in the
  // duplicate line, a write API reaching the identity module, the one
  // canonicalisation door, entry()'s composed path, the absolute fallback in
  // relPath, a line of code in workspace-target.ts, a case-folded path and a
  // normalised one — runs the gate in its source-only mode, asserts the rule
  // that OWNS each edit is the one that went red, and puts all eight files
  // back byte for byte in a finally,
  // checked by sha256 after every ablation and again at the end. It launches no
  // Electron and starts no process but node.
  pure('ablation:p274'),
  // PHASE 275's attack on `conformance:agents` section 9, the rules about the
  // SHARED shell-variable list every agent reads, and on the two renderer suites
  // that carry the picker. It breaks THIRTY-ONE clauses one at a time in two
  // lanes — 27 against the gate (the two seal refusals both directions, the
  // isDangerStateEmpty clause a new sealed field is most likely to be forgotten
  // in, the union's order, the module that may import nothing, the cap sentence
  // and the launch paths) and 4 against the picker suites (a row that must
  // exist, a row that must be shown rather than hidden, a state that must be
  // said while ticking, and the element the keyboard model rests on) — and
  // proves each reddens THE RULE THAT OWNS IT, measured as a delta against the
  // base so an inherited failure cannot be mistaken for a caused one. The count
  // is the one the run prints; a lane added without moving this line is the
  // drift it exists to stop. Unlike the two harnesses above it never writes
  // into the working tree: it clones src/ and build/ with `cp -Rc` under
  // /private/tmp, symlinks node_modules, edits the CLONE and removes it in a
  // `finally` and on a signal, because a phase runs three builders in one
  // worktree at once. It launches no Electron, starts no tmux server, spawns no
  // agent and spends no token.
  pure('ablation:p275'),
  // PHASE 273's app run, and the reading the phase exists for. ONE Electron on
  // a scratch profile and a scratch HOME, over a project the probe builds and
  // then opens THROUGH A REAL SYMLINK — belucid's shape, issue 25. Seven arms:
  // the tab really carries the alias spelling, ⌘S writes and the bytes are read
  // back off disk at the REAL path, a second save runs the compare-and-swap
  // through the alias too, the Explorer's New Folder / New File / Rename /
  // Trash all land, an escaping path and a .git path are still refused and now
  // say `outside` and `protected` where the parent said one word for both, the
  // refusal log line carries exactly four fields with the home redacted, and
  // the operator's own tmux server is counted before and after. P273_PARENT_BUILD
  // points it at a build of the parent commit for the before-and-after; the
  // expectations never flip, so the findings ARE the parent reading. It spawns
  // no agent and spends no token.
  electron('probe:p273'),
  // PHASE 274's app run, and the reading the phase exists for. TWO Electrons on
  // one scratch profile with a scratch HOME, ONE AT A TIME AND NEVER AT ONCE,
  // over a project the probe builds at <scratch>/Source/proj and also opens as
  // <scratch>/source/proj — belucid's exact shape, issue 25, a case-insensitive
  // volume rather than a symlink. Seven arms: the volume is proved to fold case
  // before anything launches and the run refuses otherwise; two spellings make
  // ONE tab and ONE row in `projects`, read both through the shipped bridge and
  // by /usr/bin/sqlite3 off a copy of the manifest; a session created under each
  // spelling lands in one strip with one project_path; fs:createFile answers a
  // path under the root the CALLER named; ⌘S writes and the bytes are read back
  // off disk at the REAL path; the 23-step tree battery runs against a control
  // and the three rows Phase 273 declared come back green; a second launch
  // restores every session; and the operator's own tmux server is counted before
  // and after. P274_PARENT_BUILD points it at a build of the parent commit for
  // the before-and-after; the expectations never flip, so the findings ARE the
  // parent reading. It spawns no agent and spends no token.
  electron('probe:p274'),
  // PHASE 275's BEFORE number, and it is a measurement rather than an assertion.
  // ONE Electron on a scratch profile, a scratch HOME whose .zshrc exports a set
  // of INVENTED variable names, and three stand-in agent executables so three
  // cards draw. It counts the gestures it takes to put one variable name on one
  // agent and then the same name on three, dispatching every gesture as a real
  // DOM event on the real shipped control — except the pick from the native
  // <datalist> popup, which Chromium draws outside the document and which is the
  // defect the phase exists to fix, charged at its cheapest possible price so the
  // before number is a floor. No session is created, no agent is launched, no
  // token is spent, and not one name in it is a name the operator's own shell
  // exports.
  electron('probe:p275:gestures'),
  // PHASE 275, THE APP RUN. ONE Electron on a scratch profile with a scratch
  // HOME whose .zshrc exports 52 INVENTED names and its own tmux socket, all
  // ended by build/electron-run.mjs in a finally. It drives the shared card,
  // the picker, the batch confirm, a per-agent narrowing beside it and a real
  // login shell that exports nothing, then starts three sessions whose agents
  // are STAND-IN scripts this probe writes — each reads its OWN environ and
  // records which NAMES it received, never a value. No real agent runs, no
  // token is spent, and the one sentinel value is grepped for afterwards in
  // the profile, the manifest, the logs and settings.json and must be in none
  // of them.
  electron('probe:p275'),
  // PHASE 276, THE APP RUN. ONE Electron at a time on a scratch profile with a
  // scratch HOME whose .zshrc sleeps 900 ms before it exports anything — the
  // calibrated slow home, because on the operator's machine oh-my-zsh, nvm and
  // rbenv init are what make `zsh -lic` 970 to 1160 ms while `zsh -lc` is 10 ms.
  // $SHELL points at a WRAPPER named `zsh` that appends one line per login shell
  // and then execs the real one, so the headline is counted from OUTSIDE the app
  // by a different method from anything the app instruments: six warm creates and
  // a create for a second agent must start ZERO shells, and a settings write that
  // is not a shell variable must start zero too. Then eleven save shapes — append,
  // truncate, rename-over, unlink-and-recreate, a file created for the first time,
  // a write through a symlinked path, an edit to a dotfiles-repo target, a touch,
  // and the one indirection the watcher provably cannot see — each followed by a
  // real session whose stand-in agent reads its OWN environ and writes down which
  // GENERATION of an invented sentinel it received, never a value. The sourced-file
  // row must read STALE and the Re-read shell button must then deliver it.
  // P276_BOOT_ONLY=1 is the boot arm: six launches with the feature on and six with
  // GMUX_NO_ENV_CACHE=1, reading `window-shown` through the shipped diagnostics
  // channel, with `path-ready` as the control that SHOULD move. It spawns no agent
  // and spends no token.
  electron('probe:p276'),
  // PHASE 277. A save may not mark newer typing clean, and a timer may not
  // outlive its policy (audit F1 and F2). ONE Electron on a scratch profile with
  // a scratch HOME under its own GMUX_HARNESS_DIR and the socket gmux-p277-<pid>,
  // over one git project it builds itself. It starts ⌘S's save and types in the
  // same turn, reads the newer typing still dirty and the older text on disk,
  // presses close and reads the question off the DOM, presses the real Cancel,
  // lets the surviving timer write the newer text, then with a 10 s delay types
  // and switches to Off, to On focus change and to Off through File > Auto Save,
  // reading the file's bytes and mtime unchanged past each deadline, with a
  // control that the same delay unchanged does write. It spawns no agent and
  // spends no token.
  electron('probe:p277'),
  // PHASE 284's app run: the work gets the one outline, and the surround goes
  // quiet. ONE Electron at a time on a scratch profile with a scratch HOME under
  // its own GMUX_HARNESS_DIR and the socket gmux-p284-<pid>, over one git project
  // it builds itself and plain shell sessions. Eleven states in one session —
  // sessions right and top, a two-way split with a tab dragged over it, the
  // editor split, overlay and fill, both sidebars away, focus mode in and out,
  // the projects on the left, the light base and one turned hue — and fourteen
  // readings taken off rectangles, computed styles and hit tests, never pixels:
  // the 8px gutters, the line drawn 1px OUTSIDE the work's box, the children's
  // clip, exactly ONE region-sized outline (and Phase 40's focused-split box
  // beside it, named), the nine hairlines at alpha 0 and STILL 1px (the spec's
  // eight and Source Control's own header, read in the Explorer too), the line's
  // contrast against both grounds computed from the computed colours, the four
  // corners hit tested, both resizers under a real pointer and a real Tab, the
  // band in accent while a terminal has the keyboard, the selection fills, the
  // regions summing to the window, the 38px titlebar and the flying copy's
  // corners. P284_PARENT_CHECKOUT names a BUILT parent worktree for a second
  // Electron, one after the other and never at once; the run passes when HEAD
  // has 0 findings and the parent fails R1, R2, R4, R5 and R11. It writes
  // photographs under out/p284. It spawns no agent and spends no token.
  electron('probe:p284'),
  // PHASE 288's app run: the meters keep the foot of an empty session list.
  // ONE Electron on a scratch profile with a scratch HOME under its own
  // GMUX_HARNESS_DIR and the socket gmux-p288-<pid>, over one git project it
  // builds itself, opened with NO session, which is the state the operator
  // photographed. The meters are answered from a GMUX_USAGE_FIXTURE file
  // exactly as probe:p202 launches, keyed by two synthetic bearers under
  // scratch CLAUDE_CONFIG_DIR and CODEX_HOME, and it REFUSES to turn a meter
  // on until main has said the fixture is installed, so no credential of the
  // person is opened. Six arms, each able to run alone, read RECTANGLES and
  // never a photograph: the rail and the expanded list with no session, both
  // providers off, one provider on, one shell session for the populated case
  // every rectangle of which must equal the other build's, and both densities
  // at their width floors; focus mode is stated NOT DRIVEN because the mode
  // refuses with no session. P288_PARENT_CHECKOUT points the same run at a
  // BUILT parent worktree, one Electron and never two, and the parent must
  // read the rail's gap as half the free height and the full meter under the
  // stub. It writes readings under out/p288, spawns no agent and spends no
  // token. `node build/p288/probe-p288.mjs --self-test` proves the graders on
  // 36 fixtures and launches nothing. BUILD FIRST: the script carries no
  // `npm run build &&` on purpose, so a verifier's re-run does not wait for a
  // second build, and it REFUSES (exit 2, "out/ is older than the
  // stylesheets; build first") when any of the five sources the geometry
  // depends on is newer than the newest bundle under out/renderer/assets of
  // the checkout it measures, before anything is launched.
  electron('probe:p288'),
  // PHASE 292's app run: the reader's line stays where they put it (GitHub
  // issue 29 and pull request 30, John Berryman). ONE Electron on a scratch
  // profile with a scratch HOME under its own GMUX_HARNESS_DIR and the socket
  // gmux-p292-<pid>, one plain shell session. The issue's own loop is TYPED
  // with real keys, a line every 50 ms, the pane is scrolled back 100 lines
  // with real mouse-wheel events, and three rulers are read together: the
  // SCREEN (the pane's xterm buffer rows, which is what a person sees, because
  // capture-pane answers the live screen and cannot see a scrolled-back view),
  // tmux's own scroll_position and history_size on the harness socket, and the
  // scrollbar thumb's rectangle. Five arms, each able to run alone: the top
  // line holds for 8 s while at least 100 lines print; the thumb moves UP and
  // sits within 2 px of position + (history - historyAtEntry) over the live
  // history, the entry history read off the probe's own screen ruler; a held
  // thumb drag under real pointer events, where the thumb must not slide DOWN
  // under a still pointer and stays on the same formula, so it goes up as
  // lines print; a window resize while parked, TWICE,
  // the first at least 33 s after the attach, where tmux asks the terminal for
  // its colours again and xterm's OSC 10 and 11 answers must not be sent the
  // way a keystroke is, and the second inside tmux's rate limit, where what is
  // read is tmux's own rows - 1 move and the app's hold; and the way back to
  // live. P292_CHECKOUT points the same run at another BUILT
  // worktree, one Electron and never two: origin/main must fail the hold at
  // about -1.0 lines per line printed, and pull request 30's head before this
  // phase must fail the thumb, the drag's slide and the resize. GMUX_TMUX_BIN
  // is passed through so a run reads the bundled 3.7b or the system 3.6a, and
  // the run prints the version the server reports. It writes readings and two
  // photographs under out/p292, spawns no agent and spends no token. `node
  // build/p292/probe-p292.mjs --self-test` proves the graders on 60 fixtures
  // and launches nothing. BUILD FIRST: the script carries no `npm run build &&`
  // on purpose, because a run against another checkout must not rebuild this
  // one, and it REFUSES (exit 2) an out/ older than the scroll sources.
  electron('probe:p292'),
  // PHASE 281's app run, and the ONE probe in this table whose app reads the
  // person's real login keychain: the Claude meter's shipping reader, at the
  // parent and at HEAD, never at once, with P281_EXPECT naming the answer. A
  // harness launch with no knob gives the credentials domain a FILE store whose
  // security seam refuses every call, HOME is scratch and the Codex switch stays
  // off, so the meter is the only thing that reads his item. It runs only with
  // his approval, after a turn in a default-login claude session.
  electron('probe:p281'),
  // PHASE 276's attack on its own gate. It breaks THIRTY-TWO clauses one at a time —
  // the coverage key weakened to "there is a slot", the projection handing out the
  // slot's own record and iterating the slot's order, a miss that narrows, a cap
  // that truncates, the in-flight pointer assigned behind an await, a join taken
  // without the coverage test, the generation stamp a drop must beat, the
  // probeFailed install guard, `??` changed to `||` for ZDOTDIR, both watch arms,
  // the basename filter, the immediate drop, the five second floor, the settings
  // comparison, the env knob and the late-landing refusal — and proves each reddens
  // THE RULE THAT OWNS IT, measured as a DELTA against the base so an inherited
  // failure cannot be mistaken for a caused one. Like ablation:p275 it never writes
  // into the working tree: it clones src/ and build/ with `cp -Rc` under
  // /private/tmp, symlinks node_modules, edits the CLONE and removes it in a
  // `finally` and on a signal, because a phase runs three builders in one worktree
  // at once. About 44 s. No Electron, no tmux, no shell, no agent, no token.
  pure('ablation:p276'),
  // PHASE 293's attack on its own gate. It breaks FORTY-TWO clauses one at a
  // time — the batch loop's fresh read, lookup by id, the absent id, the
  // failure that must not stop it and the stop it must ask; the freeze at the
  // press in both of its locks, the hidden checked id and the run id a stop is
  // bound to; who a batch may end; canEnd for an unknown and a removed row; the
  // rule of the press for a menu pick and a Retry; the continuation's own
  // panel; Remove's presence and the parity rule; the grouping, the view and
  // the cells; the truth table's row 6; and every source rule — and proves each
  // reddens THE RULE THAT OWNS IT, as a DELTA against the base. Like
  // ablation:p276 it never writes into the working tree: it clones src/ and
  // build/ with `cp -Rc` under /private/tmp, symlinks node_modules, restores
  // each edited clone file and proves it by sha256, and removes the clone in a
  // `finally` and on a signal. About 50 s. No Electron, no tmux, no ssh, no
  // agent, no token.
  pure('ablation:p293'),
  // PHASE 313's attack on the three checks above. A GREEN GATE IS ONLY EVIDENCE
  // IF IT CAN GO RED: this one breaks ONE CLAUSE AT A TIME in the shipping
  // source of src/main/pocket/ and proves each break reddens THE RULE THAT OWNS
  // IT, as a DELTA against the base. It never writes into the working tree —
  // seven builders work in one worktree during a phase — so it clones src/ and
  // build/ with `cp -Rc` under /private/tmp, symlinks node_modules, restores
  // every edited clone file and proves it by sha256, and removes the clone in a
  // `finally` and on a signal. No Electron, no tmux, no ssh, no agent, no
  // token, and no listener but the one the hostile client opens on loopback and
  // closes in its own `finally`.
  pure('ablation:p313'),
  // PHASE 296's attack on `conformance:handback`'s menu section, and the reason
  // that phase is worth doing: the section had been RED SINCE 25 AUGUST because a
  // needle stopped matching a row nobody moved, and nothing could tell that from
  // a gate that was working. Eleven arms over sibling copies of
  // `src/main/menu.ts`. Seven break one clause each — the End Session row
  // deleted with the :876 comment kept, the action id appearing twice, End
  // Session moved below the resume row, the resume row moved below the hotkeys,
  // the hotkey spread deleted, the resume row reflowed with `accel(` on a line of
  // its own (green before this phase), and the probe's comment blanking removed
  // over the real menu — and each must go red ON THE SENTENCE OF THE CLAUSE IT
  // BREAKS, with the printed `placed after End Session` tick reading NO wherever a
  // row was not found or is out of order. Four must go GREEN: the three shapes
  // that turned the gate red on 25 August, being End Session in its pre-156
  // two-argument shape, End Session reflowed across lines and End Session with an
  // argument added after its mark; and the naive id-only needle, which finds the
  // :876 comment where the deleted row used to be and passes, which is what makes
  // the comment blanking load-bearing rather than decorative. Like ablation:p293
  // it never writes into the working tree: it clones src/ and build/ with `cp -Rc`
  // under /private/tmp, copies docs/audits/contract-baseline.txt because section 1
  // reads it, symlinks node_modules, restores each edited clone file and proves it
  // by sha256, and removes the clone in a `finally` and on a signal. About 10 s.
  // No Electron, no tmux, no ssh, no agent, no token.
  pure('ablation:p296'),
  // PHASE 300's attack on this phase's own rules, the five clauses of the
  // resolve cache: keyed without the home, no TTL, covering the direct stat,
  // unbounded, and a provider other than claude. It breaks the SHIPPING source
  // one clause at a time, runs the cache's own vitest file, and restores every
  // file by sha256 in a `finally`, on a throw and on a signal. The four clauses
  // that attacked the reduced counts read went with it in the fix round. About
  // 4 s. No Electron, no tmux, no ssh, no agent, no token.
  pure('ablation:p300'),
  // PHASE 312's attack on its own rules, sixteen arms, one clause each, every one
  // red on the check that owns it. Nine break the SHIPPING source where
  // `conformance:choices` reads it and seven where the p312 vitest files drive it,
  // and the FIRST is the arm the entry names: the verdict made to read the
  // generalised collector, which must go red on the sentence that owns the
  // detector's measured floor. Like ablation:p300 it reads every original once
  // before it writes anything, restores all four files in a `finally`, on a throw
  // and on a signal, and proves the restore by sha256 after every single arm. One
  // needle carries the comment above it on purpose, because `forget` deletes from
  // the same set four hundred lines higher with the same indentation and an
  // ablation that edits the wrong occurrence reads green. About 25 s. No Electron,
  // no tmux, no ssh, no agent, no token.
  pure('ablation:p312'),
  // PHASE 261 item 1. The harness socket refusal, DRIVEN. ONE Electron at a
  // time, never two, on a scratch profile with a scratch HOME under its own
  // GMUX_HARNESS_DIR and the socket gmux-p261-<pid>. Five arms: the real app
  // in the right shape announcing its own socket with a tmux server really
  // there; the same launch with the harness term removed refused before
  // anything is spawned; an app that ANSWERS `gmux` ended in flight, which is
  // driven against a six line stand-in written by the probe rather than
  // against the real app, so the answer `gmux` is proved without ever putting
  // Tortie on the operator's live server; a copy of the helper with the
  // refusal clause removed, so the refusal arm is shown able to read the other
  // answer; and the census over four fixtures. It spawns no agent, spends no
  // token, opens no keychain and makes no request, and `-L gmux` is read twice
  // with list-sessions and never written.
  electron('probe:p261socket'),
  // PHASE 261 item 3. The ⌘T name selection race, measured on PAINTED FRAMES
  // at HEAD and at the parent. ONE Electron on a scratch profile with a
  // scratch HOME and its own socket, over a project it writes itself. It opens
  // and Escapes the sheet only: no session is created, no agent is spawned and
  // no token is spent.
  electron('probe:p261cmdt'),
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
  // THE PRESS THAT MOVES ON, 2026-09-16. PR 28's author's three asks: ⌥↩ on
  // a change should forward to the next one, ⌥⌫ should do the same, and both
  // arrows should loop at the ends instead of stopping. ONE launch on a
  // scratch profile, a scratch HOME and its own socket over a repository it
  // builds itself, with eight changes written by a synchronous /bin/sh. It
  // presses ⌥↓ once, walks both ends to prove the loop, then drives each verb
  // and reads the live DOM after it: the picture loses the change that was
  // pressed, the change that FOLLOWED it becomes current with the keyboard on
  // it, a SECOND ⌥↩ with no ⌥↓ accepts the next one, the arrows still loop
  // after a press, and the file's digest separates the verbs — an accept
  // moves no byte and a rewind writes. Its arms are graded the other way
  // round at the build PR 28's author reported, which is why
  // `ACCEPT_ADVANCE_PARENT=1` must report the defect instead of the feature.
  // PHASE 282 added five arms in the same launch, each over changes it writes
  // itself: O, an outside write above the current change on disk the moment
  // before ⌥⌫, and the move lands on the change that followed; L, ⌥⌫ on the
  // only change keeps the keyboard in the view and ⌥⇧⌫ brings it back; C, ⌥⌫
  // and ⌥↩ back to back draw nothing backwards and a refused accept says the
  // one-press sentence; R, a held ⌥⌫ rewinds one change; T, a word and Enter
  // at 30 ms a key then ⌘S leaves exactly that on disk. They are graded the
  // other way round at PR 28's head (`ACCEPT_ADVANCE_PARENT=282`).
  // No agent, no token, no keychain; the -L gmux sessions of the machine that
  // runs it counted before and after rather than touched.
  // `node build/probe-redline-move-on.mjs --self-test` proves the graders and
  // the arms' own fixture texts on thirty-seven fixtures and launches nothing.
  electron('probe:redlinemoveon'),
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
  // Phase 274's measurement and its ATTACK, not in the commit battery for the
  // same reason conformance:watcher:cap is not. It creates and attaches a
  // case-sensitive APFS image with hdiutil (no sudo), prints the §8 table's two
  // columns side by side with the per-volume timings, and then attacks this
  // phase's own central ruling from both directions: it tries to make
  // sameFolder answer 'same' for two genuinely different folders and
  // 'different' for one folder reached through a symlink chain, a firmlink,
  // /tmp, an NFD spelling and a '..' climb. It demonstrates that macOS refuses
  // to hard link a DIRECTORY rather than claiming it. The image is detached and
  // the .dmg deleted in a finally. No Electron, no agent, no token.
  adapter(
    'measure:p274-volumes',
    'macOS hdiutil, to create and attach a case-sensitive APFS disk image with no sudo, detached and deleted in a finally',
    'never skips; on a host with no hdiutil it reports the missing column as a finding'
  ),
  // PHASE 300's stage split, DEMOTED in the fix round from the deciding
  // instrument to a measurement. It runs the SHIPPING reader through
  // `conformance:overview --real --stages` over codex records it SYNTHESISES
  // from the committed fixture, times the scan, the decide and the parse, arms
  // `perf_hooks.monitorEventLoopDelay` beside its own wall clock, and deletes
  // every generated byte in a `finally`. It takes those stages UNDER ELECTRON'S
  // OWN NODE — `ELECTRON_RUN_AS_NODE=1` on the electron dist's binary, no
  // window, no renderer, no profile — and prints `process.versions.v8`, because
  // the first build took them under node 22 and the engine main runs answered
  // the same read in the opposite direction; `P300_SPLIT_ENGINE=node` is the
  // comparison. It is an adapter and not `pure` for that one reason. It reads
  // nothing of the person's: every number the entry states about his 11.76 GB
  // store was measured for the entry and is not re-measurable. About 3 s at
  // p50 and p99; P300_SIZES adds the 200 MiB and 960 MiB records.
  adapter(
    'measure:p300-split',
    'node, the repository install, and the electron dist under node_modules run as a node with ELECTRON_RUN_AS_NODE=1 (no app, no window, no profile). It writes up to about 1.2 GB of synthesised records under out/p300-split/ and removes them in a finally',
    'never skips; it decides nothing and fails only on a read that failed or two instruments more than a frame apart'
  ),
  // PHASE 259 FIX ROUND. The APP RUN the phase shipped without. One Electron
  // on a scratch profile with a scratch HOME, over a repository it builds
  // itself, drives the deterministic pass, the `arch:enrich` channel under a
  // part scope and under the journeys scope, and reads the two new views off
  // the LIVE DOM: the numbered steps, the chips and their grades, the rate
  // beside its floor, the gates worksheet, and a claim made STALE by an edit
  // from outside. It spends NOTHING: GMUX_FOLD_BIN points the fold at a stub
  // that answers out of the prompt it was handed, so the citations are real
  // lines of that repository and the grader really grades them. `--self-test`
  // launches nothing.
  electron('probe:p259'),
  // PHASE 269. The shell variables an agent needs. One Electron on a scratch
  // profile with a scratch HOME and a scratch ZDOTDIR drives four arms — the
  // value reaches a real pane, nothing is written down, a rotated value is
  // picked up by the next session with no restart, and the env-unresolved
  // notice fires — then a SECOND Electron, after the first has fully exited,
  // runs the attack: a passthrough name written straight into settings.json is
  // refused on read while the one Tortie wrote survives. It launches a
  // stand-in executable rather than any agent, so no token is spent, and it
  // touches `-L gmux` in one place only, a read only session count.
  electron('probe:p269'),
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
