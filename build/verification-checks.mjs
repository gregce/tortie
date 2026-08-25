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
const electron = (name) => ({
  name,
  type: 'electron harness',
  needs: NEEDS.electron,
  skip: SKIP.neverFinally
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
  pure('conformance:handback'),
  adapter(
    'conformance:specstory:entitlement',
    'macOS codesign and the vendored specstory binary; it signs scratch copies and runs them'
  ),
  tmux('conformance:tmux-pair'),
  electron('conformance:resume'),
  electron('conformance:resume:capture'),
  electron('conformance:resume:specstory'),

  // Build gates and pins.
  pure('gate:electron'),
  pure('gate:checks'),
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
  electron('probe:shellpath'),
  electron('probe:p101shot'),
  electron('probe:p102shot'),
  electron('probe:p103shot'),
  electron('probe:p104shot'),
  electron('probe:p120shot')
];
