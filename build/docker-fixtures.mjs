/**
 * docker-fixtures.mjs. The texts `gate:docker` (build/assert-docker-teardown.mjs)
 * runs its scanners over before it trusts them (Phase 342, build/p342/SPEC.md
 * §6.2).
 *
 * Two lists, and a gate nobody has seen fail is a gate nobody has seen work:
 *
 *   FILE_FIXTURES     whole files the FORWARD rule reads, each either CAUGHT (a
 *                     docker spawned from a file that is not the helper, a
 *                     prune, a removal by pattern, a mount of /Users, a run
 *                     line handed to a shell) or a CONTROL that must be left
 *                     alone (a Dockerfile read, a sentence that says the word,
 *                     a file that reaches the helper).
 *   HELPER_ABLATIONS  one-clause edits of the REAL helper, build/docker-run.mjs,
 *                     each of which the helper rules must refuse: the teardown
 *                     out of its `finally`, a name without the prefix, an
 *                     ephemeral `::22`, a run without `--rm` or `--pull never`,
 *                     an `image rm -f`, a `--platform` on a reference his list
 *                     holds, and the rest of §6.2 clause by clause.
 *
 * EVERY WORD THE FORWARD RULE LOOKS FOR IS SPELLED FROM PARTS here, so this
 * file carries no literal that names the program, and the gate also skips it by
 * name. A new shape that walks past gate:docker goes into this file in the same
 * commit as the fix (CLAUDE.md, the four obligations, item 2).
 */

const V = (s) => s.split('|').join('');
const D = V('dock|er');
const HELPER = 'docker-run.mjs';

export const FILE_FIXTURES = [
  {
    name: 'through the helper',
    caught: false,
    user: true,
    text: `import { withContainers } from './${HELPER}';\nawait withContainers({ label: 'x', rows: ['u2404'], scratch: '/private/tmp/x' }, async (h) => h);\n`
  },
  {
    name: 'through the helper from a subdirectory',
    caught: false,
    user: true,
    text: `import { withContainers, ROWS } from '../${HELPER}';\nconst rows = Object.keys(ROWS);\nawait withContainers({ label: 'y', rows, scratch: '/private/tmp/y' }, async (h) => h.u2204.sh('tmux -V'));\n`
  },
  {
    name: 'the program spawned from another file',
    caught: true,
    text: `import { spawn } from 'node:child_process';\nspawn('${D}', ['ps', '-a']);\n`
  },
  {
    name: 'the program by its absolute path',
    caught: true,
    text: `import { execFileSync } from 'node:child_process';\nexecFileSync('/usr/local/bin/${D}', ['images']);\n`
  },
  {
    name: 'a prune',
    caught: true,
    text: `import { execFileSync } from 'node:child_process';\nexecFileSync('${D}', ['system', 'prune', '-f']);\n`
  },
  {
    name: 'a removal by pattern, as one command line',
    caught: true,
    text: `import { execSync } from 'node:child_process';\nexecSync('${D} rm -f $(${D} ps -aq)');\n`
  },
  {
    name: 'a removal by filter',
    caught: true,
    text: `import { spawnSync } from 'node:child_process';\nspawnSync('${D}', ['container', 'prune', '--filter', 'label=x']);\n`
  },
  {
    name: 'a mount of /Users',
    caught: true,
    text: `import { spawn } from 'node:child_process';\nspawn('${D}', ['run', '--rm', '-v', '/Users/gdc:/mnt', 'ubuntu:24.04', 'true']);\n`
  },
  {
    name: 'the program held in a variable',
    caught: true,
    text: `const tool = '${D}';\nconst verb = 'run';\nspawn(tool, [verb, '-d', 'ubuntu:24.04', 'sleep', '7200']);\n`
  },
  {
    name: 'a run line handed to a shell after a separator',
    caught: true,
    text: `import { spawnSync } from 'node:child_process';\nspawnSync('/bin/sh', ['-c', 'cd /tmp && ${D} run -d ubuntu:24.04 sleep 7200']);\n`
  },
  {
    name: 'a container ended outside the helper',
    caught: true,
    text: `import { spawnSync } from 'node:child_process';\nspawnSync('${D}', ['rm', '-f', 'tortie-p342-u2404-1']);\n`
  },
  {
    name: 'a shell script that runs the program',
    caught: true,
    sh: true,
    text: `#!/bin/sh\nset -e\n${D} exec -i tortie-p342-x sh -c 'tmux -V'\n`
  },
  {
    name: 'a shell script that runs it after a separator',
    caught: true,
    sh: true,
    text: `#!/bin/sh\ntrue && ${D} image rm ubuntu:26.04\n`
  },
  {
    name: 'a shell script that names it only in a comment',
    caught: false,
    sh: true,
    text: `#!/bin/sh\n# runs INSIDE a container; ${D}-run.mjs puts it there\ntmux -V\n`
  },
  {
    name: 'a comment that names the program',
    caught: false,
    text: `// ${D} rm -f is the helper's, never this file's\nconst x = 1;\n`
  },
  {
    name: 'a file that reads a Dockerfile',
    caught: false,
    text: `const base = '${D}file';\nif (base === '${D}file' || base.startsWith('${D}file.')) add('entrypoint.${D}.cmd');\nconst names = ['${D}-compose.yml', 'compose.yaml'];\n`
  },
  {
    name: 'a sentence that names the program in prose',
    caught: false,
    text: `say('the probe read the row by its own ${D} exec, never the app');\nconst why = 'his ${D} holds his own work';\n`
  },
  {
    name: 'a credential file name',
    caught: false,
    text: `const CREDENTIAL = /^(auth\\.json|\\.${D}cfg|config\\.json)$/i;\n`
  }
];

/**
 * One-clause edits of the REAL helper. Each must make the helper rules answer
 * at least one finding, and each must find its anchor (an edit that changes
 * nothing is itself a failure: the anchor moved and the clause is unproved).
 */
export const HELPER_ABLATIONS = [
  {
    what: 'the teardown moved out of the finally',
    edit: (src) => src.replace(/\} finally \{\n(\s*\/\/[^\n]*\n)*\s*await teardown\(entry\);/, '}\n  {\n    await teardown(entry);')
  },
  { what: 'SIGHUP taken out of the net', edit: (src) => src.replace("['SIGINT', 'SIGTERM', 'SIGHUP']", "['SIGINT', 'SIGTERM']") },
  { what: 'the exit handler taken out', edit: (src) => src.replace("process.on('exit', () => {", "process.on('beforeExit', () => {") },
  {
    what: 'the net installed after the first create',
    edit: (src) =>
      src
        .replace('  installNet();\n  live.set(id, entry);\n', '  live.set(id, entry);\n')
        .replace("      handles[row] = makeHandle(", '      installNet();\n      handles[row] = makeHandle(')
  },
  { what: 'a name without the prefix', edit: (src) => src.replace("export const NAME_PREFIX = 'tortie-p342-';", "export const NAME_PREFIX = 'p342-';") },
  {
    what: 'the prefix rule loosened so any name passes',
    edit: (src) => src.replace('const PREFIX_RE = /^tortie-p[0-9]{3}(?:[0-9])?-$/;', 'const PREFIX_RE = /^.*$/;')
  },
  { what: 'an ephemeral ::22', edit: (src) => src.replace("`127.0.0.1:${String(spec.port)}:22`", "'127.0.0.1::22'") },
  { what: 'every address, not 127.0.0.1', edit: (src) => src.replace("`127.0.0.1:${String(spec.port)}:22`", "`0.0.0.0:${String(spec.port)}:22`") },
  { what: 'a run without --rm', edit: (src) => src.replace("const argv = ['run', '-d', '--rm', '--pull', 'never',", "const argv = ['run', '-d', '--pull', 'never',") },
  { what: 'a run without --pull never', edit: (src) => src.replace("const argv = ['run', '-d', '--rm', '--pull', 'never',", "const argv = ['run', '-d', '--rm',") },
  { what: 'a main process that never ends', edit: (src) => src.replace("spec.ref, 'sleep', String(MAIN_PROCESS_SECONDS));", "spec.ref, 'sleep', 'infinity');") },
  { what: 'a main process of a day and more', edit: (src) => src.replace('export const MAIN_PROCESS_SECONDS = 7200;', 'export const MAIN_PROCESS_SECONDS = 999999;') },
  { what: 'a mount of /Users in the run', edit: (src) => src.replace("argv.push('-p', `127.0.0.1:", "argv.push('-v', '/Users/gdc:/mnt', '-p', `127.0.0.1:") },
  { what: 'an image rm -f', edit: (src) => src.replace("dockerSync(['image', 'rm', ref], 120_000);", "dockerSync(['image', 'rm', '-f', ref], 120_000);") },
  {
    what: 'a --platform on a reference his list holds',
    edit: (src) => src.replace('const platform = spec.platform !== undefined && !haveRefs.has(spec.ref) ? spec.platform : null;', 'const platform = spec.platform ?? null;')
  },
  {
    what: 'a pull of a reference his list holds',
    edit: (src) => src.replace('      if (haveRefs.has(spec.ref)) continue;\n', '')
  },
  {
    what: 'the before-list refusal taken out of the image removal',
    edit: (src) => src.replace("  if (before.has(ref)) {\n    report.kept.push(ref + ' (in the before list)');\n    return;\n  }\n", '')
  },
  {
    what: 'the id check taken out of the image removal',
    edit: (src) => src.replace('  if (now !== recordedId) {', '  if (false) {')
  },
  {
    what: 'the container ledgered after it is made',
    edit: (src) =>
      src
        .replace('      ledger(entry, `container ${name}`);\n      entry.containers.add(name);\n      const made = await docker(argv, { timeoutMs: 120_000 });\n', '      const made = await docker(argv, { timeoutMs: 120_000 });\n      ledger(entry, `container ${name}`);\n      entry.containers.add(name);\n')
  },
  {
    what: 'the pull ledgered after it runs',
    edit: (src) =>
      src.replace(
        '      ledger(entry, `pull ${spec.ref}`);\n      entry.pulls.add(spec.ref);\n',
        ''
      ).replace("      const pulled = await docker(pullArgs, { timeoutMs: 900_000 });\n", "      const pulled = await docker(pullArgs, { timeoutMs: 900_000 });\n      ledger(entry, `pull ${spec.ref}`);\n      entry.pulls.add(spec.ref);\n")
  },
  { what: 'the lock not taken', edit: (src) => src.replace('  const lockWhy = takeLock(label);\n  if (lockWhy !== null) throw', '  const lockWhy = null;\n  if (lockWhy !== null) throw') },
  { what: 'the lock opened without wx', edit: (src) => src.replace("openSync(LOCK_PATH, 'wx', 0o600)", "openSync(LOCK_PATH, 'w', 0o600)") },
  { what: 'a prune in the teardown', edit: (src) => src.replace('  endChildrenSync();\n  for (const name of [...entry.containers])', "  endChildrenSync();\n  dockerSync(['system', 'prune', '-f']);\n  for (const name of [...entry.containers])") },
  { what: 'a removal by filter in the teardown', edit: (src) => src.replace("  dockerSync(['rm', '-f', name], 120_000);", "  dockerSync(['rm', '-f', '--filter', `name=${name}`], 120_000);") },
  { what: 'the sweep taken out', edit: (src) => src.replace('export function sweepLedger(path) {', 'export function sweepOld(path) {') },
  { what: 'the disk floor lowered', edit: (src) => src.replace('export const DOCKER_MIN_FREE_KB = 10 * 1024 * 1024;', 'export const DOCKER_MIN_FREE_KB = 1 * 1024 * 1024;') },
  { what: 'the teardown comparing nothing', edit: (src) => src.replace('  report.differences = compareDockerLists(entry.before, after);', '  report.differences = [];') },
  { what: 'a container name the removal does not check', edit: (src) => src.replace("  if (!name.startsWith('tortie-')) {", '  if (false) {') },
  // The builder's round of 2026-10-07 (the successor's): one more per clause
  // the gate reads that the list above did not yet break.
  { what: 'the disk not asked about before anything is made', edit: (src) => src.replace('  const why = dockerPreflight(options);\n', '  const why = null;\n') },
  {
    what: 'the run registered with the net after the first create',
    edit: (src) =>
      src
        .replace('  installNet();\n  live.set(id, entry);\n', '  installNet();\n')
        .replace("      handles[row] = makeHandle(", '      live.set(id, entry);\n      handles[row] = makeHandle(')
  },
  { what: 'a container name not composed from the prefix', edit: (src) => src.replace('      const name = `${prefix}${row}-${runId}`;', '      const name = `${row}-${runId}`;') },
  { what: 'a verb off the closed list', edit: (src) => src.replace("await docker(['restart', '-t', '2', name], { timeoutMs: 120_000 });", "await docker(['kill', name], { timeoutMs: 120_000 });") },
  { what: 'only container ids listed, the first half of a removal by pattern', edit: (src) => src.replace("dockerSync(['ps', '-a', '--no-trunc', '--format',", "dockerSync(['ps', '-a', '-q', '--no-trunc', '--format',") },
  { what: 'a pull removed with no id recorded at it', edit: (src) => src.replace('removePulledImage(ref, entry.pulled.get(ref), before, report)', 'removePulledImage(ref, undefined, before, report)') },
  { what: 'the run argv not checked before it runs', edit: (src) => src.replace('      const refusal = runArgvRefusal(argv, prefix);\n', '      const refusal = null;\n') },
  // The proof builder's hardening, one clause each: the scratch rule, the
  // config folder, and every spelling the run argv refusal reads.
  { what: 'the scratch rule reading HOME alone', edit: (src) => src.replace('[homedir(), accountHome]', '[homedir()]') },
  { what: 'the scratch rule naming no temporary root', edit: (src) => src.replace("temps: [...new Set(['/', '/tmp', '/var/tmp', tmpdir()].flatMap(spellings))]", 'temps: []') },
  { what: 'the scratch rule admitting a temporary root itself', edit: (src) => src.replace('    if (path === root || path === root.replace(/\\/+$/, \'\')) return', '    if (false) return') },
  { what: 'the scratch rule admitting the repository', edit: (src) => src.replace('  if (under(world.repo)) return', '  if (false) return') },
  { what: 'the config folder made by a fixed name', edit: (src) => src.replace("const configDir = mkdtempSync(join(scratch, 'config-'));\n  cliPath", "const configDir = join(scratch, 'config');\n  mkdirSync(configDir, { recursive: true });\n  cliPath") },
  { what: 'the teardown removing a fixed config folder', edit: (src) => src.replace('    rmSync(entry.configDir, { recursive: true, force: true });', "    for (const f of ['config']) rmSync(join(entry.scratch, f), { recursive: true, force: true });") },
  { what: 'a second publish admitted', edit: (src) => src.replace("if (publishes.length !== 1 || publishes[0] !== '-p') return", 'if (publishes.length === 0) return') },
  { what: 'an attached -v admitted', edit: (src) => src.replace("    if (a === '-v' || /^-v./.test(a)) return", "    if (a === '-v') return") },
  { what: 'a --flag=value mount admitted', edit: (src) => src.replace('LONG.some((flag) => a === flag || a.startsWith(`${flag}=`))', 'LONG.some((flag) => a === flag)') },
  { what: 'a host namespace admitted', edit: (src) => src.replace("'--pid', '--ipc', '--uts', '--userns', ", '') },
  { what: 'a device admitted', edit: (src) => src.replace("'--device', '--device-cgroup-rule', ", '') },
  { what: "another run's prefix admitted", edit: (src) => src.replace('!name.startsWith(prefix)) return', "!name.startsWith('tortie-')) return") },
  { what: 'the run asking its refusal with no prefix of its own', edit: (src) => src.replace('runArgvRefusal(argv, prefix);', 'runArgvRefusal(argv, NAME_PREFIX);') }
];
