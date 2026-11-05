/**
 * Phase 350, his ruling of 2026-11-02 (R1): pi's inline token ONLY for a pi whose
 * real file is inside pi's own installed package.
 *
 * The reverify's major: with a version manager (mise, rtx, asdf, volta, proto),
 * pi resolves to a SHIM whose real file is the manager's dispatcher, and the
 * dispatcher picks pi's version by the folder it runs in. The scan read the
 * global 1.4.0 from that one unchanged file, so a session created or restored in
 * a project that pins pi below 0.84.0 was handed `--tui-mode regular`, and pi
 * stopped after its trust question at every launch, where today's pi lives. His
 * ruling: the token is composed, kept at restore and put in by the pass only
 * when the package.json above pi's real file names pi's own package, and the
 * version read is that same file's; anything else reads `unread`, and pi runs
 * exactly as it does today.
 *
 * Every install shape a pi reaches a Mac by is planted here as it lies on disk,
 * found by the SHIPPING scan over a faked login PATH (each shape's executable is
 * a `/bin/sh` stand-in that prints a version; no agent on this Mac can answer),
 * and graded byte for byte against the literal argvs this file writes down:
 *
 *   - the verdict (`piInlineFloorFor`) and the predicate (`insidePiPackage`);
 *   - the create's argv, composed by `resolveLaunchSpec` with create-local's own
 *     expression for a pane that runs the binary it names (`piInlineFloorFor(binPath)
 *     === 'holds'`; a pane spawned by its bare name whose lookup finds that same file
 *     reads the same, and p350-pi-bare-name.test.ts drives every lookup that does not);
 *   - the harvest's and the admission's resume, `composeResumeArgv` with
 *     id-harvest's own expression (`piInlineFloorFor(resumeBinOf(rec, agent))`);
 *   - what restore and resume in place arm for a row recorded with the token
 *     (`withoutPiTokenBelowFloor`, armableResume's one way out);
 *   - the boot pass, `repairPiInline` with the session core's own readers;
 *   - Restart: `recoverLaunchExtras`, then the replacement's create.
 */

import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManifestSessionRecord } from '../../manifest';
import { linkTo, PI_PACKAGE, plantNpmPi, writeExecutable } from './pi-install';

const root = mkdtempSync(join(tmpdir(), 'gmux-p350-package-'));
const extraDir = join(root, 'extra');
mkdirSync(extraDir, { recursive: true });
/** The login PATH the scan reads, set by each shape to the one folder its `pi` sits in. */
let loginPath = '';

vi.mock('../../tmux/resolve', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux/resolve')>();
  return {
    ...actual,
    getUserPath: () => Promise.resolve(loginPath),
    extraBinDirs: () => [extraDir]
  };
});

const { PI_PACKAGE_NAME, getRegistryEntry } = await import('../registry');
const {
  insidePiPackage,
  listDetectedAgents,
  piInlineFloorFor,
  piOwnResumeArgv,
  resetAgentTableSource,
  resetDetectionCache,
  setAgentTableSource
} = await import('../detection');
const { resolveLaunchSpec } = await import('../../manifest/agents');
const { composeResumeArgv, resumeBinOf } = await import('../../sessions/resume-argv');
const { repairPiInline } = await import('../../sessions/inline-repair');
const { withoutPiTokenBelowFloor } = await import('../../restore/restore');
const { recoverLaunchExtras } = await import('../../restart/extras');

const TOK = ['--tui-mode', 'regular'];
const U = '019a0000-0000-7000-8000-0000000003a1';
const U2 = '019a0000-0000-7000-8000-0000000003a2';

/** The version every planted pi prints, and the one a pinned project's folder names. */
const versionFile = join(root, 'pi-version');
writeFileSync(versionFile, '1.4.0\n');
const PINNED = join(root, 'projects', 'pinned');
mkdirSync(PINNED, { recursive: true });
writeFileSync(join(PINNED, '.pi-band'), '0.83.0\n');

/** pi's own file: a stand-in that prints the version file. */
const PI_TEXT = `#!/bin/sh\n/bin/cat '${versionFile}'\n`;
/**
 * A version manager's dispatcher, as mise's and asdf's behave: ONE file whose pi
 * version is chosen at each run by the folder it runs in (a `.pi-band` found
 * walking up from $PWD), else the global version. Its identity never changes.
 */
const DISPATCHER_TEXT = [
  '#!/bin/sh',
  `band=$(/bin/cat '${versionFile}')`,
  'd="$PWD"',
  'while [ -n "$d" ] && [ "$d" != "/" ]; do',
  '  if [ -r "$d/.pi-band" ]; then band=$(/bin/cat "$d/.pi-band"); break; fi',
  '  d=$(/usr/bin/dirname "$d")',
  'done',
  'echo "$band"',
  ''
].join('\n');

interface Shape {
  /** The folder the login PATH names. */
  readonly pathDir: string;
  /** The `pi` the scan must resolve there. */
  readonly bin: string;
}

/** Every shape, planted once, by name. */
const SHAPES: Record<string, () => Shape> = {
  npm: () => {
    const p = plantNpmPi(join(root, 'npm'), PI_TEXT);
    return { pathDir: join(root, 'npm', 'bin'), bin: p.bin };
  },
  secondLink: () => {
    const p = plantNpmPi(join(root, 'npm2'), PI_TEXT);
    const second = linkTo(join(root, 'npm2-second', 'bin', 'pi'), p.bin);
    return { pathDir: join(root, 'npm2-second', 'bin'), bin: second };
  },
  bun: () => {
    // bun links its global bins into its global node_modules, relative, as npm
    // does (read on this Mac: ~/.bun/bin/codex -> ../install/global/node_modules/@openai/codex/bin/codex.js).
    const pkg = join(root, 'bun', 'install', 'global', 'node_modules', ...PI_PACKAGE.split('/'));
    mkdirSync(pkg, { recursive: true });
    writeFileSync(join(pkg, 'package.json'), `${JSON.stringify({ name: PI_PACKAGE, version: '0.0.0-p350' })}\n`);
    const cli = writeExecutable(join(pkg, 'dist', 'cli.js'), PI_TEXT);
    return { pathDir: join(root, 'bun', 'bin'), bin: linkTo(join(root, 'bun', 'bin', 'pi'), cli) };
  },
  npmLink: () => {
    // `npm link` from a checkout: the package folder in the prefix is itself a link.
    const checkout = join(root, 'src', 'pi', 'packages', 'coding-agent');
    mkdirSync(checkout, { recursive: true });
    writeFileSync(join(checkout, 'package.json'), `${JSON.stringify({ name: PI_PACKAGE, version: '1.5.0-dev' })}\n`);
    writeExecutable(join(checkout, 'dist', 'cli.js'), PI_TEXT);
    const linked = join(root, 'linked', 'lib', 'node_modules', ...PI_PACKAGE.split('/'));
    mkdirSync(join(linked, '..'), { recursive: true });
    symlinkSync(checkout, linked);
    return { pathDir: join(root, 'linked', 'bin'), bin: linkTo(join(root, 'linked', 'bin', 'pi'), join(linked, 'dist', 'cli.js')) };
  },
  standalone: () => {
    // pi's own binary beside the package.json its build copies there (0.84.2's `copy-binary-assets`).
    const dir = join(root, 'standalone');
    writeExecutable(join(dir, 'pi'), PI_TEXT);
    writeFileSync(join(dir, 'package.json'), `${JSON.stringify({ name: PI_PACKAGE, version: '1.4.0' })}\n`);
    return { pathDir: dir, bin: join(dir, 'pi') };
  },
  pnpmShim: () => {
    // pnpm's global bin is a shell script that runs the package's file; the package is real.
    const p = plantNpmPi(join(root, 'pnpm', 'global', '5'), PI_TEXT);
    const shim = writeExecutable(join(root, 'pnpm', 'pi'), `#!/bin/sh\nbasedir=$(/usr/bin/dirname "$0")\nexec '${p.cli}' "$@"\n`);
    return { pathDir: join(root, 'pnpm'), bin: shim };
  },
  miseShim: () => {
    // mise's shim is a link to mise itself, which dispatches by folder.
    const dispatcher = writeExecutable(join(root, 'mise', 'bin', 'mise'), DISPATCHER_TEXT);
    return { pathDir: join(root, 'mise', 'shims'), bin: linkTo(join(root, 'mise', 'shims', 'pi'), dispatcher) };
  },
  asdfShim: () => {
    // asdf's shim is a script of its own, which dispatches by folder.
    const shim = writeExecutable(join(root, 'asdf', 'shims', 'pi'), DISPATCHER_TEXT);
    return { pathDir: join(root, 'asdf', 'shims'), bin: shim };
  },
  voltaShim: () => {
    // volta links every tool to volta-shim, which picks the version itself.
    const shim = writeExecutable(join(root, 'volta', 'bin', 'volta-shim'), DISPATCHER_TEXT);
    return { pathDir: join(root, 'volta', 'bin'), bin: linkTo(join(root, 'volta', 'bin', 'pi'), shim) };
  },
  copy: () => {
    const p = plantNpmPi(join(root, 'copied-from'), PI_TEXT);
    mkdirSync(join(root, 'copy'), { recursive: true });
    copyFileSync(p.cli, join(root, 'copy', 'pi'));
    chmodSync(join(root, 'copy', 'pi'), 0o755);
    return { pathDir: join(root, 'copy'), bin: join(root, 'copy', 'pi') };
  },
  wrapper: () => {
    const p = plantNpmPi(join(root, 'wrapped'), PI_TEXT);
    const wrap = writeExecutable(join(root, 'wrap', 'pi'), `#!/bin/sh\nexec '${p.cli}' "$@"\n`);
    return { pathDir: join(root, 'wrap'), bin: wrap };
  },
  otherPackage: () => {
    const p = plantNpmPi(join(root, 'fork'), PI_TEXT, { name: '@someone/pi-fork' });
    return { pathDir: join(root, 'fork', 'bin'), bin: p.bin };
  },
  // The second ruled round (the reverify's nit): pi's own unscoped name under another scope,
  // and under the scope pi was published from before 0.73.1, each answering 1.4.0.
  someoneScope: () => {
    const p = plantNpmPi(join(root, 'someone'), PI_TEXT, { name: '@someone/pi-coding-agent' });
    return { pathDir: join(root, 'someone', 'bin'), bin: p.bin };
  },
  oldScope: () => {
    const p = plantNpmPi(join(root, 'mariozechner'), PI_TEXT, { name: '@mariozechner/pi-coding-agent' });
    return { pathDir: join(root, 'mariozechner', 'bin'), bin: p.bin };
  },
  unreadable: () => {
    const p = plantNpmPi(join(root, 'locked'), PI_TEXT);
    chmodSync(join(p.root, 'package.json'), 0o000);
    return { pathDir: join(root, 'locked', 'bin'), bin: p.bin };
  },
  namelessNearer: () => {
    const p = plantNpmPi(join(root, 'typed'), PI_TEXT);
    writeFileSync(join(p.root, 'dist', 'package.json'), '{"type":"module"}\n');
    return { pathDir: join(root, 'typed', 'bin'), bin: p.bin };
  },
  notJson: () => {
    const p = plantNpmPi(join(root, 'broken'), PI_TEXT, { manifest: `{ "name": "${PI_PACKAGE}",\n` });
    return { pathDir: join(root, 'broken', 'bin'), bin: p.bin };
  }
};

/** Each shape's verdict, written here from his ruling and from nothing in the code. */
const VERDICT: Record<string, 'holds' | 'unread'> = {
  npm: 'holds',
  secondLink: 'holds',
  bun: 'holds',
  npmLink: 'holds',
  standalone: 'holds',
  pnpmShim: 'unread',
  miseShim: 'unread',
  asdfShim: 'unread',
  voltaShim: 'unread',
  copy: 'unread',
  wrapper: 'unread',
  otherPackage: 'unread',
  someoneScope: 'unread',
  oldScope: 'unread',
  unreadable: 'unread',
  namelessNearer: 'unread',
  notJson: 'unread'
};

const planted: Record<string, Shape> = Object.fromEntries(Object.entries(SHAPES).map(([n, plant]) => [n, plant()]));

beforeEach(() => {
  for (const name of ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_PROBES', 'GMUX_UPDATE_REHEARSAL']) vi.stubEnv(name, undefined);
  resetDetectionCache();
  setAgentTableSource(() => [{ ...getRegistryEntry('pi'), binaries: ['pi'], extraProbeDirs: [], storeDirs: [] }]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetDetectionCache();
  resetAgentTableSource();
});

afterAll(() => {
  try {
    chmodSync(join(root, 'locked', 'lib', 'node_modules', ...PI_PACKAGE.split('/'), 'package.json'), 0o644);
  } catch {
    /* already gone */
  }
  rmSync(root, { recursive: true, force: true });
});

/** Run the shipping scan over one shape's folder; it must resolve that shape's `pi` and read 1.4.0 from it. */
async function scanOf(shape: Shape): Promise<void> {
  loginPath = shape.pathDir;
  resetDetectionCache();
  const scan = await listDetectedAgents();
  const pi = scan.agents.find((a) => a.id === 'pi');
  expect(pi?.binPath).toBe(shape.bin);
  expect(pi?.version).toBe('1.4.0');
}

/** A pi row on this Mac recording `argv` as both its launch and its resume. */
function piRow(id: string, argv: string[], conversation = U): ManifestSessionRecord {
  return {
    id,
    name: id,
    tmuxName: id,
    projectPath: PINNED,
    cwd: PINNED,
    agent: 'pi' as ManifestSessionRecord['agent'],
    status: 'restorable',
    createdAt: 1,
    lastSeen: 2,
    argv,
    resumeArgv: argv,
    agentSessionId: conversation
  };
}

/** A minted conversation id written back as `ID`, so two creates compare. */
const minted = (argv: readonly string[] | undefined, id: string | undefined): string[] => (argv ?? []).map((t) => (t === id ? 'ID' : t));

describe("pi's own package: the constant and the install map agree (R1)", () => {
  it('PI_PACKAGE_NAME is the name the install map installs and pi 0.84.2 carries', () => {
    expect(PI_PACKAGE_NAME).toBe(PI_PACKAGE);
    const npm = getRegistryEntry('pi').install.alternates.find((a) => a.label === 'npm');
    expect(npm?.command).toBe(`npm install -g --ignore-scripts ${PI_PACKAGE}`);
  });

  it('insidePiPackage answers each planted shape as his ruling says, and starts nothing', () => {
    for (const [name, shape] of Object.entries(planted)) {
      expect(insidePiPackage(shape.bin), name).toBe(VERDICT[name] === 'holds');
    }
    expect(insidePiPackage(join(root, 'no-such-pi'))).toBe(false);
    expect(insidePiPackage('')).toBe(false);
    expect(insidePiPackage('pi')).toBe(false);
  });

  it('the unreadable package.json cannot be read by this process, so the shape is what it says', () => {
    expect(() => readFileSync(join(root, 'locked', 'lib', 'node_modules', ...PI_PACKAGE.split('/'), 'package.json'))).toThrow();
  });

  it("a version manager's shim answers the version of the folder it runs in: the scan's reading says nothing of a pinned project", () => {
    for (const name of ['miseShim', 'asdfShim', 'voltaShim']) {
      const bin = planted[name]!.bin;
      const here = spawnSync(bin, ['-v'], { cwd: root, encoding: 'utf8' });
      const pinned = spawnSync(bin, ['-v'], { cwd: PINNED, encoding: 'utf8' });
      expect(here.stdout.trim(), name).toBe('1.4.0');
      expect(pinned.stdout.trim(), name).toBe('0.83.0');
    }
  });
});

describe('every install shape, its verdict and every argv it composes, byte for byte (R1)', () => {
  for (const name of Object.keys(SHAPES)) {
    it(`${name}: reads ${VERDICT[name]!}, and composes, keeps and passes the token exactly where it holds`, async () => {
      const shape = planted[name]!;
      await scanOf(shape);
      const holds = VERDICT[name] === 'holds';
      const bin = shape.bin;
      const tok = holds ? TOK : [];

      // The verdict, for the file the scan read.
      expect(piInlineFloorFor(bin)).toBe(VERDICT[name]);

      // The create, with create-local's own expression.
      const created = await resolveLaunchSpec('pi', ['--model', 'm'], bin, piInlineFloorFor(bin) === 'holds');
      expect(minted(created.argv, created.agentSessionId)).toEqual([bin, ...tok, '--session-id', 'ID', '--model', 'm']);
      expect(minted(created.resumeArgv, created.agentSessionId)).toEqual([bin, ...tok, '--session-id', 'ID', '--model', 'm']);

      // The harvest and the admission, with id-harvest's own expression.
      const bare = piRow('h', [bin, '--model', 'm']);
      const composed = composeResumeArgv(bare, 'pi', U, ['--model', 'm'], piInlineFloorFor(resumeBinOf(bare, 'pi')) === 'holds');
      expect(composed?.argv).toEqual([bin, ...tok, '--session-id', U, '--model', 'm']);

      // Restore and resume in place: a row recorded with the token, armed.
      const recorded = [bin, ...TOK, '--session-id', U, '--model', 'm'];
      expect(withoutPiTokenBelowFloor(piRow('r', recorded), [...recorded])).toEqual(holds ? recorded : [bin, '--session-id', U, '--model', 'm']);

      // The boot pass, with the session core's own readers.
      const rows = [piRow('pre', [bin, '--session-id', U]), piRow('tok', [bin, ...TOK, '--session-id', U2], U2)];
      const writes: Array<{ id: string; argv: string[] }> = [];
      const store = {
        listSessions: () => rows,
        setResumeArgvColumn: (id: string, argv: string[]) => {
          writes.push({ id, argv: [...argv] });
        },
        setEnvColumn: () => {
          throw new Error('the pi arm wrote an env column');
        }
      };
      const quiet = [vi.spyOn(console, 'log').mockImplementation(() => undefined), vi.spyOn(console, 'warn').mockImplementation(() => undefined)];
      let outcomes: Array<{ sessionId: string; verdict: string }>;
      try {
        outcomes = repairPiInline(store as never, { floorFor: piInlineFloorFor, ownResume: piOwnResumeArgv }) as never;
      } finally {
        for (const spy of quiet) spy.mockRestore();
      }
      expect(outcomes.map((o) => [o.sessionId, o.verdict])).toEqual(
        holds ? [['pre', 'rewritten'], ['tok', 'already-right']] : [['pre', 'no-floor'], ['tok', 'no-floor']]
      );
      expect(writes).toEqual(holds ? [{ id: 'pre', argv: [bin, ...TOK, '--session-id', U] }] : []);

      // Restart: the person's flags come back from either shape, and the replacement composes afresh.
      for (const argv of [recorded, [bin, '--session-id', U, '--model', 'm']]) {
        const extras = recoverLaunchExtras(piRow('x', argv));
        expect(extras, JSON.stringify(argv)).toEqual(['--model', 'm']);
        const replacement = await resolveLaunchSpec('pi', extras ?? [], bin, piInlineFloorFor(bin) === 'holds');
        expect(minted(replacement.argv, replacement.agentSessionId)).toEqual([bin, ...tok, '--session-id', 'ID', '--model', 'm']);
      }
    });
  }

  it('a second link to the scanned file is the same file, and holds; the scanned link itself holds too', async () => {
    const shape = planted['secondLink']!;
    await scanOf(shape);
    expect(piInlineFloorFor(shape.bin)).toBe('holds');
    expect(piInlineFloorFor(join(root, 'npm2', 'bin', 'pi'))).toBe('holds');
    expect(piInlineFloorFor(join(root, 'npm2', 'lib', 'node_modules', ...PI_PACKAGE.split('/'), 'dist', 'cli.js'))).toBe('holds');
  });

  it("pnpm's package is real, but its shim is not inside it: the shim reads unread though pi's own file holds", async () => {
    const shape = planted['pnpmShim']!;
    await scanOf(shape);
    expect(piInlineFloorFor(shape.bin)).toBe('unread');
    // pi's own file in pnpm's global folder IS pi's package; it is not the file the scan read.
    expect(insidePiPackage(join(root, 'pnpm', 'global', '5', 'bin', 'pi'))).toBe(true);
    expect(piInlineFloorFor(join(root, 'pnpm', 'global', '5', 'bin', 'pi'))).toBe('unread');
  });
});
