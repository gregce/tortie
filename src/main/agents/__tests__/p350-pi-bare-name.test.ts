/**
 * Phase 350, his ruling of 2026-11-02, the second ruled round: "Check the file
 * that runs. Before adding the switch, find pi the way the terminal will,
 * starting from the session's folder. Add the switch only when that's the file
 * Tortie checked. Otherwise pi starts exactly as today. It reads files and runs
 * nothing."
 *
 * The second ruled reverify's major: a create spawns pi by its BARE NAME (Phase
 * 12.7 F3), and the pane's execvp walks the pane's PATH from the folder tmux
 * starts it in. With a relative entry (`node_modules/.bin`, the common
 * `export PATH=./node_modules/.bin:$PATH`) ahead of a global npm pi at 0.84.0 or
 * later, in a project that pins its own pi below 0.84.0, the scan read the
 * global file, the floor held for it, and the pane ran the project's own pi,
 * which stopped on `--tui-mode regular` after its trust question at every
 * create in that project, where the parent's create lived.
 *
 * Two halves, both planted on disk beside the fifteen install shapes of
 * p350-pi-package.test.ts and graded against literals written here from his
 * ruling, never from the code:
 *
 *   1. THE ONE RESOLVER, `bareNameSpawnFile`, and its comparison by device and
 *      inode, `bareNameSpawnRuns`, over every PATH entry shape execvp reads.
 *   2. EVERY CREATE THAT SPAWNS PI BY ITS BARE NAME, driven through the SHIPPING
 *      code: the desk's create (`createLocalSession`), the phone's start
 *      (`createPocketStart`'s `start`, which composes its input and calls that
 *      create) and Restart's replacement (`restartSession`, likewise), each in
 *      the same planted folder, the floor read by the SHIPPING scan of a planted
 *      global pi. What tmux was handed to spawn and the row the create records
 *      are graded byte for byte. Where the verdict is `unread` the argv is the
 *      parent's own, the token-free composition, so pi starts exactly as today.
 *
 * His ruling of 2026-11-03, the third ruled round: "No switch for # folders.
 * When the folder name has a #, pi starts exactly as today." tmux read
 * `new-session -c` as a format, so the pane of a folder holding a `#` could
 * start in the tmux server's HOME. Planted: `C#Tools`, a `#` in a parent folder,
 * the `CTools` control, and the reverify's nit, a session in a subfolder of its
 * project, which is walked from the subfolder.
 *
 * His ruling of 2026-11-04, the fourth ruled round: "Treat a trailing ; like #.
 * If the folder name ends in ;, pi starts exactly as it does today." tmux's
 * argument reader ended a command at an argument ending in `;` and read one
 * ending in `\;` as ending in `;`, so the pane of `semi\;` started in HOME, or
 * in its `;` twin when one existed. Planted: `semi\;`, `twin\;` beside a `twin;`
 * that pins its own pi, and the control `x;y`, a `;` that is not last.
 *
 * PHASE 353 (build/p353/SPEC.md D354-5) TOOK BOTH CLAUSES OUT. Every create now
 * hands tmux the folder held back (`tmuxFolderArgument`,
 * src/main/tmux/argument.ts), so the pane starts in exactly the folder the walk
 * starts from, and the `#` and `\;` rows above FLIPPED: each is walked like any
 * other folder, and where it holds no pi of its own the global pi the scan read
 * is the file that runs, so it holds the token. HOME's own pi is never reached
 * from them now, and the `;` twin is walked as its own folder, where its own pi
 * runs. The planted world is unchanged.
 *
 * HERMETIC. Every file is under one temp folder, and every pi is a `/bin/sh`
 * stand-in that prints its band and that nothing here runs but the scan's `-v`.
 * The scan's PATH, the create's PATH and the pane's PATH are the planted one;
 * tmux is a recorder, so no server is contacted; the launch context scan, which
 * reads an agent's configuration folders, is held; the agent table names no
 * folder of a real home; no agent store is read.
 */

import { chmodSync, copyFileSync, linkSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateSessionInput, Project } from '@shared/types';
import type { ManifestSessionRecord } from '../../manifest';
import { linkTo, PI_PACKAGE, plantNpmPi, writeExecutable } from './pi-install';

const root = mkdtempSync(join(tmpdir(), 'gmux-p350-bare-'));
const userData = join(root, 'user-data');
mkdirSync(userData, { recursive: true });

vi.mock('electron', () => ({
  app: {
    isReady: () => true,
    isPackaged: false,
    getPath: () => userData,
    getAppPath: () => process.cwd(),
    getVersion: () => '0.0.0-p350'
  },
  BrowserWindow: { getAllWindows: () => [] }
}));

/** The create's and the scan's extra folder (`extraBinDirs`), outside every planted PATH. */
const extraDir = join(root, 'extra');
mkdirSync(extraDir, { recursive: true });
/** The one PATH every reader of it sees: the scan, the create's resolve, and the pane. */
let loginPath = '';
/** The agent row's own folders to look in (`extraProbeDirs`), empty but for the absolute-spawn shape. */
let probeDirs: string[] = [];

vi.mock('../../tmux/resolve', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux/resolve')>();
  return {
    ...actual,
    getUserPath: () => Promise.resolve(loginPath),
    extraBinDirs: () => [extraDir],
    // The create's resolve, against the planted PATH and folder: the real one
    // reads its PATH through a login shell.
    resolveBinary: (bin: string, probeFirst: readonly string[] = []) =>
      Promise.resolve(actual.resolveBinaryAgainst(bin, loginPath, [...probeFirst, extraDir]))
  };
});

/** What each create handed tmux to spawn: the folder and the argv. */
const spawned: Array<{ cwd: string; argv: string[] }> = [];

vi.mock('../../tmux', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux')>();
  return {
    ...actual,
    // The PATH the one writer installs; never written into this process here.
    installUserPath: () => Promise.resolve(loginPath),
    createSession: (input: { displayName: string; cwd: string; argv?: string[] }) => {
      spawned.push({ cwd: input.cwd, argv: [...(input.argv ?? [])] });
      return Promise.resolve({
        sessionId: `$${String(spawned.length)}`,
        tmuxName: input.displayName,
        createdAt: 0,
        attached: false,
        windows: 1,
        panePid: 40_000 + spawned.length
      });
    },
    setSessionOption: () => Promise.resolve(),
    execTmux: () => Promise.resolve('')
  };
});

// The launch context walks the agent's configuration folders; nothing here may read them.
vi.mock('../../context/snapshot', () => ({ recordLaunchContext: () => undefined }));

vi.mock('../../settings/store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../settings/store')>()),
  getSettings: () => ({ envPassthrough: {}, envPassthroughShared: [], launchDefaults: {}, captureDefaults: {} })
}));

// The merged table's pi row, looking in no folder of a real home.
vi.mock('../../config/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/store')>();
  const row = (id: string): ReturnType<typeof actual.agentEntry> => {
    const entry = actual.agentEntry(id);
    return entry === null ? null : { ...entry, extraProbeDirs: id === 'pi' ? [...probeDirs] : [], storeDirs: [] };
  };
  return {
    ...actual,
    agentEntry: row,
    launchableAgentEntry: (id: string) => {
      const entry = row(id);
      return entry === null || !entry.launchable || entry.launch === null ? null : (entry as ReturnType<typeof actual.launchableAgentEntry>);
    }
  };
});

const { getRegistryEntry } = await import('../registry');
const {
  bareNameSpawnFile,
  bareNameSpawnRuns,
  detectionScanCount,
  listDetectedAgents,
  peekDetectedAgents,
  piInlineFloorFor,
  resetAgentTableSource,
  resetDetectionCache,
  setAgentTableSource,
  versionProbeCount
} = await import('../detection');
const { createLocalSession } = await import('../../sessions/create-local');
const { createPocketStart } = await import('../../sessions/pocket-start');
const { restartSession } = await import('../../restart/restart');

const TOK = ['--tui-mode', 'regular'];
const SYS = '/usr/bin:/bin';
const PI_TEXT = (band: string): string => `#!/bin/sh\necho '${band}'\n`;
const BINSTUB = '#!/bin/sh\nexec "$(dirname "$0")/../node_modules/.bin/pi" "$@"\n';

// ---------------------------------------------------------------------------
// The planted world
// ---------------------------------------------------------------------------

/** The global pi at 1.4.0, as npm installs it: the file the scan reads and the floor holds for. */
const G = plantNpmPi(join(root, 'g'), PI_TEXT('1.4.0'));
const GDIR = join(root, 'g', 'bin');
// The same file in the create's extra folder too, which no planted PATH names.
linkTo(join(extraDir, 'pi'), G.cli);
/** A second npm pi at 1.4.0 that only the agent row's own folder names (the absolute-spawn shape). */
const PROBED = plantNpmPi(join(root, 'probed'), PI_TEXT('1.4.0'));

/** pi at `band` as `npm install` in `dir` lays it out: the package under `dir/node_modules` and its `.bin` link, and nothing else. */
function npmInstalledIn(dir: string, band: string): string {
  const pkg = join(dir, 'node_modules', ...PI_PACKAGE.split('/'));
  mkdirSync(pkg, { recursive: true });
  writeFileSync(join(pkg, 'package.json'), `${JSON.stringify({ name: PI_PACKAGE, version: band, bin: { pi: 'dist/cli.js' } })}\n`);
  const cli = writeExecutable(join(pkg, 'dist', 'cli.js'), PI_TEXT(band));
  linkTo(join(dir, 'node_modules', '.bin', 'pi'), cli);
  return cli;
}

/** A project that pins pi at `band`, as npm installs it, with a link at its root (what `.` and an empty entry find) and a binstub. */
function npmProject(dir: string, band: string): string {
  const cli = npmInstalledIn(dir, band);
  linkTo(join(dir, 'pi'), cli);
  writeExecutable(join(dir, 'bin', 'pi'), BINSTUB);
  return dir;
}

/** The same, as pnpm installs it: the package under `.pnpm`, a link to it, and shell shims. */
function pnpmProject(dir: string, band: string): string {
  const inStore = `.pnpm/@earendil-works+pi-coding-agent@${band}/node_modules/${PI_PACKAGE}`;
  const store = join(dir, 'node_modules', ...inStore.split('/'));
  mkdirSync(store, { recursive: true });
  writeFileSync(join(store, 'package.json'), `${JSON.stringify({ name: PI_PACKAGE, version: band, bin: { pi: 'dist/cli.js' } })}\n`);
  writeExecutable(join(store, 'dist', 'cli.js'), PI_TEXT(band));
  linkTo(join(dir, 'node_modules', ...PI_PACKAGE.split('/')), store);
  writeExecutable(join(dir, 'node_modules', '.bin', 'pi'), `#!/bin/sh\nbasedir=$(dirname "$0")\nexec "$basedir/../${inStore}/dist/cli.js" "$@"\n`);
  writeExecutable(join(dir, 'pi'), `#!/bin/sh\nbasedir=$(dirname "$0")\nexec "$basedir/node_modules/${inStore}/dist/cli.js" "$@"\n`);
  writeExecutable(join(dir, 'bin', 'pi'), BINSTUB);
  return dir;
}

const P = join(root, 'projects');
const NPM = npmProject(join(P, 'npm'), '0.83.0');
const PNPM = pnpmProject(join(P, 'pnpm'), '0.83.0');
/** A project whose own pi is past the floor, but is not the file Tortie checked. */
const NEWER = npmProject(join(P, 'newer'), '0.99.2');
const PLAIN = join(P, 'plain');
mkdirSync(PLAIN, { recursive: true });
/** Session folders reached through a link. */
const NPM_LINK = join(P, 'npm-link');
symlinkSync('npm', NPM_LINK);
const PLAIN_LINK = join(P, 'plain-link');
symlinkSync('plain', PLAIN_LINK);

/**
 * HIS RULING OF 2026-11-03, the third ruled round. tmux read `new-session -c` as a format, so a session folder
 * holding a `#` was not always the folder the pane started in: measured on 3.7b and 3.6a, `C#Tools` started in the
 * tmux server's HOME, and a pane there found HOME's own pi behind `node_modules/.bin`. His words: "When the folder
 * name has a #, pi starts exactly as today." HOME holds its own pi 0.83.0 as `npm install` in a home folder lays
 * it out; a second HOME holds none, because the verdict may not depend on HOME. Since Phase 353 the create holds the
 * folder back, the pane starts in it, and these folders are walked like any other: HOME's own pi is never reached.
 */
const HOME_PI = join(root, 'home');
npmInstalledIn(HOME_PI, '0.83.0');
const HOME_BARE = join(root, 'home-bare');
mkdirSync(HOME_BARE, { recursive: true });
/** Projects holding no pi of their own: `#` in the folder's name, `#` in a parent folder's name, and the control. */
const HASH = join(P, 'C#Tools');
const HASH_PARENT = join(P, 'C#', 'app');
const NO_HASH = join(P, 'CTools');
/** Other spellings of a `#`, the ones tmux misreads (`#S`, `#{…}`, `##`, a trailing `#` on 3.7b) and one it keeps (`#p`). */
const HASH_SPELLINGS = ['#Sales', 'a#{b}', 'x##y', 'F#', 'my#project'].map((name) => join(P, name));
for (const dir of [HASH, HASH_PARENT, NO_HASH, ...HASH_SPELLINGS]) mkdirSync(dir, { recursive: true });
/** A link to `C#Tools` whose own name holds no `#`: tmux is handed the link's spelling, and changes into it. */
const HASH_LINK = join(P, 'csharp-link');
symlinkSync('C#Tools', HASH_LINK);
/** The nit: a session in a subfolder of its project, the subfolder pinning its own pi 0.83.0, the project's root none. */
const MONO = join(P, 'mono');
const MONO_SUB = join(MONO, 'packages', 'tool');
npmInstalledIn(MONO_SUB, '0.83.0');

/**
 * HIS RULING OF 2026-11-04, the fourth ruled round. tmux's argument reader ends a command at an argument ending in
 * `;` and reads one ending in `\;` as ending in `;`, so `new-session -c …/semi\;` started its pane in `…/semi;`:
 * measured on 3.7b and 3.6a, in HOME when no `semi;` existed, and in the twin when one did. His words: "Treat a
 * trailing ; like #. If the folder name ends in ;, pi starts exactly as it does today." Since Phase 353 the create
 * hands a final `;` held back, the pane starts in the folder itself, and each is walked as its own folder.
 */
const BSEMI = join(P, 'semi\\;');
const TWIN = join(P, 'twin\\;');
/** The folder tmux reads `twin\;` as, pinning its own pi 0.83.0 as `npm install` lays it out. */
const TWIN_READ = join(P, 'twin;');
/** The control: a `;` that is not last, and a `\;` ending a parent folder's name, both of which tmux takes as written. */
const SEMI_MID = join(P, 'x;y');
const SEMI_PARENT = join(P, 'pp\\;', 'app');
for (const dir of [BSEMI, TWIN, SEMI_MID, SEMI_PARENT]) mkdirSync(dir, { recursive: true });
npmInstalledIn(TWIN_READ, '0.83.0');

/** The same global file, spelled other ways: a second link, a hard link, a linked folder, a copy that is NOT it. */
linkTo(join(root, 'second', 'pi'), G.bin);
mkdirSync(join(root, 'hard'), { recursive: true });
linkSync(G.cli, join(root, 'hard', 'pi'));
symlinkSync('g/bin', join(root, 'alias'));
mkdirSync(join(root, 'copied'), { recursive: true });
copyFileSync(G.cli, join(root, 'copied', 'pi'));
chmodSync(join(root, 'copied', 'pi'), 0o755);
/**
 * A `..` read through a linked folder: deep/er/link is projects/plain, so the kernel reads
 * deep/er/link/../../g/bin as g/bin, where a string normalised first would read deep/g/bin.
 */
mkdirSync(join(root, 'deep', 'er'), { recursive: true });
symlinkSync('../../projects/plain', join(root, 'deep', 'er', 'link'));
/** Entries that hold no runnable pi, and things that cannot be read. */
writeExecutable(join(root, 'noexec', 'pi'), PI_TEXT('0.83.0'));
chmodSync(join(root, 'noexec', 'pi'), 0o644);
mkdirSync(join(root, 'folderpi', 'pi'), { recursive: true });
linkTo(join(root, 'dangling', 'pi'), join(root, 'nowhere'));
writeFileSync(join(root, 'afile'), 'not a folder\n');
mkdirSync(join(root, 'loop'), { recursive: true });
symlinkSync('pi', join(root, 'loop', 'pi'));
writeExecutable(join(root, 'locked', 'pi'), PI_TEXT('0.83.0'));
chmodSync(join(root, 'locked'), 0o000);
mkdirSync(join(root, 'shut'), { recursive: true });
chmodSync(join(root, 'shut'), 0o000);

beforeEach(() => {
  for (const name of ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_PROBES', 'GMUX_UPDATE_REHEARSAL']) vi.stubEnv(name, undefined);
  probeDirs = [];
  resetDetectionCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetDetectionCache();
  resetAgentTableSource();
});

afterAll(() => {
  for (const dir of ['locked', 'shut']) chmodSync(join(root, dir), 0o755);
  rmSync(root, { recursive: true, force: true });
});

/** The walk's own spelling of what it found, under the world's root, or null. */
const found = (path: string, folder: string): string | null => {
  const hit = bareNameSpawnFile({ name: 'pi', path, folder });
  return hit === null ? null : hit.at.startsWith(`${root}/`) ? hit.at.slice(root.length + 1) : hit.at;
};
const runs = (path: string, folder: string, bin = G.bin): boolean => bareNameSpawnRuns({ name: 'pi', path, folder }, bin);

// ---------------------------------------------------------------------------
// 1. The one resolver and its comparison
// ---------------------------------------------------------------------------

describe("the one resolver walks the pane's PATH from the session's own folder, as execvp does", () => {
  it("a relative entry is read from the session's own folder, never from this process's", () => {
    // The project's own pi: through node_modules/.bin, ./node_modules/.bin, `.` and a binstub in bin/.
    expect(found(`node_modules/.bin:${GDIR}:${SYS}`, NPM)).toBe('projects/npm/node_modules/.bin/pi');
    expect(found(`./node_modules/.bin:${GDIR}:${SYS}`, PNPM)).toBe('projects/pnpm/./node_modules/.bin/pi');
    expect(found(`.:${GDIR}:${SYS}`, NPM)).toBe('projects/npm/./pi');
    expect(found(`bin:${GDIR}:${SYS}`, NPM)).toBe('projects/npm/bin/pi');
    // A folder with no pi of its own passes the entry over, whatever this process's folder holds.
    expect(found(`node_modules/.bin:.:bin:${GDIR}:${SYS}`, PLAIN)).toBe('g/bin/pi');
    // A `..` is the kernel's, through the folder's own link: deep/er/link is projects/plain.
    expect(found(`../../g/bin:${SYS}`, join(root, 'deep', 'er', 'link'))).toBe('deep/er/link/../../g/bin/pi');
    expect(runs(`../../g/bin:${SYS}`, join(root, 'deep', 'er', 'link'))).toBe(true);
    // An entry after the global's folder is never reached.
    expect(found(`${GDIR}:node_modules/.bin:${SYS}`, NPM)).toBe('g/bin/pi');
  });

  it("an empty entry, leading, doubled or trailing, is the session's folder itself", () => {
    expect(found(`:${GDIR}:${SYS}`, NPM)).toBe('projects/npm/pi');
    expect(found(`/usr/bin::${GDIR}:/bin`, PNPM)).toBe('projects/pnpm/pi');
    expect(found(`${SYS}:`, NPM)).toBe('projects/npm/pi');
    expect(found(`:${GDIR}:${SYS}`, PLAIN)).toBe('g/bin/pi');
    expect(found(`${SYS}:`, PLAIN)).toBeNull();
  });

  it('an entry holding no runnable file of that name is passed over, as execvp passes it', () => {
    expect(found(`${join(root, 'noexec')}:${GDIR}:${SYS}`, PLAIN)).toBe('g/bin/pi');
    expect(found(`${join(root, 'folderpi')}:${GDIR}:${SYS}`, PLAIN)).toBe('g/bin/pi');
    expect(found(`${join(root, 'dangling')}:${GDIR}:${SYS}`, PLAIN)).toBe('g/bin/pi');
    expect(found(`${join(root, 'afile')}:${join(root, 'nowhere')}:${GDIR}:${SYS}`, PLAIN)).toBe('g/bin/pi');
    expect(found(SYS, PLAIN)).toBeNull();
  });

  it('a folder or a link it cannot read, and a folder tmux cannot enter, read as no file', () => {
    expect(found(`${join(root, 'locked')}:${GDIR}:${SYS}`, PLAIN)).toBeNull();
    expect(found(`${join(root, 'loop')}:${GDIR}:${SYS}`, PLAIN)).toBeNull();
    expect(found(`${GDIR}:${SYS}`, join(root, 'shut'))).toBeNull();
    expect(found(`${GDIR}:${SYS}`, 'projects/plain')).toBeNull();
    expect(found(`${GDIR}:${SYS}`, join(root, 'nowhere'))).toBeNull();
    expect(bareNameSpawnFile({ name: 'bin/pi', path: `${root}:${SYS}`, folder: PLAIN })).toBeNull();
    expect(bareNameSpawnFile({ name: '', path: `${GDIR}:${SYS}`, folder: PLAIN })).toBeNull();
    for (const path of [`${join(root, 'locked')}:${GDIR}`, `${join(root, 'loop')}:${GDIR}`]) expect(runs(path, PLAIN)).toBe(false);
  });

  it('one file is one file by device and inode, never by its spelling', () => {
    expect(found(`${join(root, 'second')}:${SYS}`, PLAIN)).toBe('second/pi');
    expect(runs(`${join(root, 'second')}:${SYS}`, PLAIN)).toBe(true);
    expect(runs(`${join(root, 'hard')}:${SYS}`, PLAIN)).toBe(true);
    expect(runs(`${join(root, 'alias')}:${SYS}`, PLAIN)).toBe(true);
    expect(runs(`${GDIR}:${SYS}`, PLAIN, G.cli)).toBe(true);
    // The same bytes in another file, the project's own pi and its binstub are other files.
    expect(runs(`${join(root, 'copied')}:${SYS}`, PLAIN)).toBe(false);
    expect(runs(`node_modules/.bin:${GDIR}`, NPM)).toBe(false);
    expect(runs(`bin:${GDIR}`, NPM)).toBe(false);
    // A file that is gone is no file.
    expect(runs(`${GDIR}:${SYS}`, PLAIN, join(root, 'nowhere'))).toBe(false);
  });

  it('reads files and starts nothing: no scan, no version probe', () => {
    const scans = detectionScanCount();
    const probes = versionProbeCount();
    for (const folder of [NPM, PNPM, PLAIN, NPM_LINK]) found(`node_modules/.bin:.:bin:${GDIR}:${SYS}`, folder);
    runs(`node_modules/.bin:${GDIR}`, NPM);
    expect(detectionScanCount()).toBe(scans);
    expect(versionProbeCount()).toBe(probes);
    expect(peekDetectedAgents()).toBeNull();
  });
});

describe('his ruling of 2026-11-03, taken out by Phase 353: a folder holding a #, and a session in a subfolder of its project', () => {
  const path = `node_modules/.bin:${GDIR}:${SYS}`;

  it("a folder whose name holds a # is walked like any other, wherever HOME's own pi is: the create now holds the folder back, so the pane starts there", () => {
    for (const home of [HOME_PI, HOME_BARE]) {
      vi.stubEnv('HOME', home);
      expect(found(path, HASH)).toBe('g/bin/pi');
      expect(runs(path, HASH)).toBe(true);
    }
    for (const dir of HASH_SPELLINGS) {
      expect(found(path, dir)).toBe('g/bin/pi');
      expect(runs(path, dir)).toBe(true);
    }
  });

  it("a # in a parent folder's name is walked like any other", () => {
    expect(found(path, HASH_PARENT)).toBe('g/bin/pi');
    expect(runs(path, HASH_PARENT)).toBe(true);
  });

  it("the control CTools is walked as before, and so is a link to C#Tools, which tmux is handed by the link's own name", () => {
    expect(found(path, NO_HASH)).toBe('g/bin/pi');
    expect(runs(path, NO_HASH)).toBe(true);
    expect(found(path, HASH_LINK)).toBe('g/bin/pi');
    expect(runs(path, HASH_LINK)).toBe(true);
  });

  it('a session in a subfolder of its project is walked from the subfolder, never from the project', () => {
    expect(found(path, MONO_SUB)).toBe('projects/mono/packages/tool/node_modules/.bin/pi');
    expect(runs(path, MONO_SUB)).toBe(false);
    expect(found(path, MONO)).toBe('g/bin/pi');
    expect(runs(path, MONO)).toBe(true);
  });
});

describe('his ruling of 2026-11-04, taken out by Phase 353: a folder whose name ends in ;', () => {
  const path = `node_modules/.bin:${GDIR}:${SYS}`;

  it("a folder whose name ends in a backslash and a semicolon is walked like any other, wherever HOME's own pi is: the create now hands its final ; held back", () => {
    for (const home of [HOME_PI, HOME_BARE]) {
      vi.stubEnv('HOME', home);
      expect(found(path, BSEMI)).toBe('g/bin/pi');
      expect(runs(path, BSEMI)).toBe(true);
    }
  });

  it('a folder ending in a backslash and a semicolon is walked as itself, never as its ; twin, and the twin, which pins its own pi, runs that pi', () => {
    expect(found(path, TWIN)).toBe('g/bin/pi');
    expect(runs(path, TWIN)).toBe(true);
    expect(found(path, TWIN_READ)).toBe('projects/twin;/node_modules/.bin/pi');
    expect(runs(path, TWIN_READ)).toBe(false);
  });

  it('the control: a ; that is not last, and a backslash and a semicolon ending a parent folder, are walked as before', () => {
    expect(found(path, SEMI_MID)).toBe('g/bin/pi');
    expect(runs(path, SEMI_MID)).toBe(true);
    expect(found(path, SEMI_PARENT)).toBe('g/bin/pi');
    expect(runs(path, SEMI_PARENT)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Every create that spawns pi by its bare name
// ---------------------------------------------------------------------------

/** A recording manifest: the row each create writes, by id. */
function fakeManifest(): {
  rows: Map<string, ManifestSessionRecord>;
  insertSession: (rec: ManifestSessionRecord) => void;
  updateSession: (id: string, patch: Partial<ManifestSessionRecord>) => void;
  getSession: (id: string) => ManifestSessionRecord | undefined;
  deleteSession: (id: string) => void;
} {
  const rows = new Map<string, ManifestSessionRecord>();
  return {
    rows,
    insertSession: (rec) => {
      rows.set(rec.id, { ...rec });
    },
    updateSession: (id, patch) => {
      const rec = rows.get(id);
      if (rec !== undefined) rows.set(id, { ...rec, ...patch });
    },
    getSession: (id) => rows.get(id),
    deleteSession: (id) => {
      rows.delete(id);
    }
  };
}

function depsOf(manifest: ReturnType<typeof fakeManifest>): Parameters<typeof createLocalSession>[1] {
  return {
    manifest: manifest as never,
    hookServer: {} as never,
    liveIds: new Map(),
    byTmuxId: new Map(),
    createsInFlight: new Map(),
    broadcastSessions: () => undefined,
    startIdCapture: () => undefined,
    // The session core's own reader (id-harvest.ts): the last resolved scan.
    cachedAgentVersion: (agent) => peekDetectedAgents()?.agents.find((a) => a.id === agent)?.version ?? null
  };
}

/** What one create came to: the folder and argv tmux was handed, and the row it recorded, each id written `ID`. */
interface Made {
  readonly folder: string;
  readonly pane: string[];
  readonly argv: string[];
  readonly resume: string[];
}

function made(manifest: ReturnType<typeof fakeManifest>, id: string, at: number): Made {
  const rec = manifest.getSession(id);
  const spawn = spawned[at];
  if (rec === undefined || spawn === undefined) throw new Error(`the create left no row or no spawn (${id})`);
  const minted = (argv: readonly string[] | undefined): string[] => (argv ?? []).map((t) => (t === rec.agentSessionId ? 'ID' : t));
  return { folder: spawn.cwd, pane: minted(spawn.argv), argv: minted(rec.argv), resume: minted(rec.resumeArgv) };
}

/** The desk: the create ⌘T and the toolbar reach, with a person's own flags, in `cwd` when the session's folder is not the project's. */
async function deskCreate(folder: string, cwd?: string): Promise<Made> {
  const manifest = fakeManifest();
  const at = spawned.length;
  const input: CreateSessionInput = {
    name: 'desk',
    projectPath: folder,
    ...(cwd === undefined ? {} : { cwd }),
    agent: 'pi' as CreateSessionInput['agent'],
    extraArgs: ['--model', 'm']
  };
  const session = await createLocalSession(input, depsOf(manifest));
  return made(manifest, session.id, at);
}

/** The phone's start: the SHIPPING start composes its input and calls the same create. */
async function phoneStart(folder: string): Promise<Made> {
  const manifest = fakeManifest();
  const at = spawned.length;
  const project: Project = { id: 'p350-project', path: folder, name: 'project' };
  let id = '';
  const starter = createPocketStart({
    core: () => ({
      listProjects: () => [project],
      listSessions: () => [],
      createSession: async (input) => {
        const session = await createLocalSession(input, depsOf(manifest));
        id = session.id;
        return session;
      }
    }),
    settings: () => ({ launchDefaults: {}, captureDefaults: {} }) as never,
    catalogs: () => ({}) as never,
    localAgents: () => ['pi']
  });
  const out = await starter.start({ project: 'p350-project', agent: 'pi' }, () => true);
  expect(out.outcome).toBe('done');
  return made(manifest, id, at);
}

/** Restart: the SHIPPING restart of a desk row, whose replacement is the same create, in the folder the row records. */
async function restartReplacement(folder: string, cwd?: string): Promise<Made> {
  const manifest = fakeManifest();
  const first = await createLocalSession(
    {
      name: 'restart-me',
      projectPath: folder,
      ...(cwd === undefined ? {} : { cwd }),
      agent: 'pi' as CreateSessionInput['agent'],
      extraArgs: ['--model', 'm']
    },
    depsOf(manifest)
  );
  const at = spawned.length;
  const outcome = await restartSession(
    {
      manifest: { getSession: (id) => manifest.getSession(id) },
      createSession: (input) => createLocalSession(input, depsOf(manifest)),
      killSession: () => Promise.resolve(),
      discardSession: () => undefined,
      broadcastSessions: () => undefined
    },
    first.id
  );
  expect(outcome.extras).toEqual(['--model', 'm']);
  return made(manifest, outcome.session.id, at);
}

/** Run the SHIPPING scan over the planted PATH; it must read the global pi (or the probed one) at 1.4.0. */
async function scan(path: string, wantBin: string): Promise<void> {
  loginPath = path;
  resetDetectionCache();
  setAgentTableSource(() => [{ ...getRegistryEntry('pi'), binaries: ['pi'], extraProbeDirs: [...probeDirs], storeDirs: [] }]);
  const result = await listDetectedAgents();
  const pi = result.agents.find((a) => a.id === 'pi');
  expect(pi?.binPath).toBe(wantBin);
  expect(pi?.version).toBe('1.4.0');
}

interface Row {
  /** The project's layout and the PATH's shape, as the title says it. */
  readonly id: string;
  readonly folder: string;
  readonly path: string;
  /** His ruling's verdict for this create, written here and from nothing in the code. */
  readonly verdict: 'holds' | 'unread';
  /** The binary the create resolves and the scan reads. */
  readonly bin: string;
  /** Set when argv[0] stays absolute: the pane runs `bin` itself, and no walk is asked. */
  readonly absolute?: true;
  readonly probe?: string[];
  /** The HOME the create runs under, when the row plants one (his ruling of 2026-11-03). */
  readonly home?: string;
}

const SHAPES: Record<string, string> = {
  'node_modules/.bin': `node_modules/.bin:${GDIR}:${SYS}`,
  './node_modules/.bin': `./node_modules/.bin:${GDIR}:${SYS}`,
  '.': `.:${GDIR}:${SYS}`,
  'a leading empty entry': `:${GDIR}:${SYS}`,
  'a doubled empty entry': `/usr/bin::${GDIR}:/bin`,
  // The global pi only in the create's extra folder, so the empty entry comes first.
  'a trailing empty entry': `${SYS}:`,
  'bin (a project binstub)': `bin:${GDIR}:${SYS}`
};

const ROWS: Row[] = [
  // The reverify's major and every shape of it: the project's own pi, below the floor, runs.
  ...Object.entries(SHAPES).flatMap(([shape, path]): Row[] => [
    { id: `npm project, ${shape}`, folder: NPM, path, verdict: 'unread', bin: shape === 'a trailing empty entry' ? join(extraDir, 'pi') : G.bin },
    { id: `pnpm project, ${shape}`, folder: PNPM, path, verdict: 'unread', bin: shape === 'a trailing empty entry' ? join(extraDir, 'pi') : G.bin }
  ]),
  // The same PATHs in a project with no pi of its own: the file that runs is the one checked. With a
  // trailing empty entry the pane's PATH holds no pi at all, at the parent too, so no token.
  ...Object.entries(SHAPES).map(([shape, path]): Row => ({
    id: `plain project, ${shape}`,
    folder: PLAIN,
    path,
    verdict: shape === 'a trailing empty entry' ? 'unread' : 'holds',
    bin: shape === 'a trailing empty entry' ? join(extraDir, 'pi') : G.bin
  })),
  // The stated trade: a project's own pi past the floor is not the file Tortie checked.
  { id: 'a project whose own pi is 0.99.2, node_modules/.bin', folder: NEWER, path: SHAPES['node_modules/.bin']!, verdict: 'unread', bin: G.bin },
  // Entries after the global's folder are never reached.
  { id: 'npm project, node_modules/.bin after the global', folder: NPM, path: `${GDIR}:node_modules/.bin:${SYS}`, verdict: 'holds', bin: G.bin },
  { id: 'npm project, an empty entry after the global', folder: NPM, path: `${GDIR}:${SYS}:`, verdict: 'holds', bin: G.bin },
  // A relative entry that leads back to the global file from the session's folder: one file, spelled otherwise.
  { id: 'plain project, a relative entry to the global itself', folder: PLAIN, path: `../../g/bin:${GDIR}:${SYS}`, verdict: 'holds', bin: G.bin },
  // A session folder reached through a link.
  { id: 'npm project through a link, node_modules/.bin', folder: NPM_LINK, path: SHAPES['node_modules/.bin']!, verdict: 'unread', bin: G.bin },
  { id: 'plain project through a link, node_modules/.bin', folder: PLAIN_LINK, path: SHAPES['node_modules/.bin']!, verdict: 'holds', bin: G.bin },
  // pi not on the login PATH, found in the agent's own folder: argv[0] stays absolute and runs the file it names.
  {
    id: 'npm project, pi only in its own folder (argv[0] absolute)',
    folder: NPM,
    path: `node_modules/.bin:${SYS}`,
    verdict: 'holds',
    bin: PROBED.bin,
    absolute: true,
    probe: [join(root, 'probed', 'bin')]
  },
  // His ruling of 2026-11-03 read a folder holding a `#`, in its own name or a parent's, as unread, because the pane
  // would have run HOME's own 0.83.0. PHASE 353 holds the folder back at the create, so the pane starts in the
  // folder, which holds no pi, and the global pi the scan read is the file that runs: these rows HOLD the token now,
  // as the control beside them always did.
  { id: 'C#Tools, a project with no pi, HOME holding its own pi 0.83.0, node_modules/.bin', folder: HASH, path: SHAPES['node_modules/.bin']!, verdict: 'holds', bin: G.bin, home: HOME_PI },
  { id: 'C#/app, the # in a parent folder, HOME holding its own pi 0.83.0, node_modules/.bin', folder: HASH_PARENT, path: SHAPES['node_modules/.bin']!, verdict: 'holds', bin: G.bin, home: HOME_PI },
  { id: 'CTools, the control, HOME holding its own pi 0.83.0, node_modules/.bin', folder: NO_HASH, path: SHAPES['node_modules/.bin']!, verdict: 'holds', bin: G.bin, home: HOME_PI },
  // His ruling of 2026-11-04 read a folder whose name ends in `;` as unread, because the pane would have run HOME's
  // own 0.83.0, or its `;` twin's. PHASE 353 hands the final `;` held back, so the pane starts in the folder itself
  // and these rows HOLD the token; a `;` twin that pins its own pi is its own folder, walked to its own pi, unread.
  { id: 'semi\\;, a project with no pi whose name ends in a backslash and a semicolon, HOME holding its own pi 0.83.0, node_modules/.bin', folder: BSEMI, path: SHAPES['node_modules/.bin']!, verdict: 'holds', bin: G.bin, home: HOME_PI },
  { id: 'twin\\;, a project with no pi whose twin twin; pins its own pi 0.83.0, a HOME holding none, node_modules/.bin', folder: TWIN, path: SHAPES['node_modules/.bin']!, verdict: 'holds', bin: G.bin, home: HOME_BARE },
  { id: 'twin;, a project ending in a plain ; that pins its own pi 0.83.0, node_modules/.bin', folder: TWIN_READ, path: SHAPES['node_modules/.bin']!, verdict: 'unread', bin: G.bin, home: HOME_BARE },
  { id: 'x;y, the control, a ; that is not last, HOME holding its own pi 0.83.0, node_modules/.bin', folder: SEMI_MID, path: SHAPES['node_modules/.bin']!, verdict: 'holds', bin: G.bin, home: HOME_PI }
];

describe("every create that spawns pi by its bare name: the desk, the phone's start and Restart, byte for byte", () => {
  for (const row of ROWS) {
    it(`${row.id} reads ${row.verdict}: the desk, the phone and Restart spawn pi ${row.verdict === 'holds' ? 'with the token' : 'as today'}, byte for byte`, async () => {
      if (row.home !== undefined) vi.stubEnv('HOME', row.home);
      probeDirs = [...(row.probe ?? [])];
      await scan(row.path, row.bin);
      const tok = row.verdict === 'holds' ? TOK : [];
      const head = row.absolute === true ? row.bin : 'pi';

      // What the shipping creates handed tmux and recorded comes FIRST, so a broken resolver, gate or create reads
      // red here, on what the pane would run, and not only on the verdict asked directly below.
      const desk = await deskCreate(row.folder);
      expect(desk.folder).toBe(row.folder);
      expect(desk.pane).toEqual([head, ...tok, '--session-id', 'ID', '--model', 'm']);
      expect(desk.argv).toEqual([row.bin, ...tok, '--session-id', 'ID', '--model', 'm']);
      expect(desk.resume).toEqual([row.bin, ...tok, '--session-id', 'ID', '--model', 'm']);

      const phone = await phoneStart(row.folder);
      expect(phone.folder).toBe(row.folder);
      expect(phone.pane).toEqual([head, ...tok, '--session-id', 'ID']);
      expect(phone.argv).toEqual([row.bin, ...tok, '--session-id', 'ID']);
      expect(phone.resume).toEqual([row.bin, ...tok, '--session-id', 'ID']);

      const restart = await restartReplacement(row.folder);
      expect(restart.folder).toBe(row.folder);
      expect(restart.pane).toEqual([head, ...tok, '--session-id', 'ID', '--model', 'm']);
      expect(restart.argv).toEqual([row.bin, ...tok, '--session-id', 'ID', '--model', 'm']);
      expect(restart.resume).toEqual([row.bin, ...tok, '--session-id', 'ID', '--model', 'm']);

      // The verdict, as the create asks it.
      const spawn = row.absolute === true ? undefined : { name: 'pi', path: row.path, folder: row.folder };
      expect(piInlineFloorFor(row.bin, spawn)).toBe(row.verdict);
      // The file the scan read holds on its own: only the pane's lookup moves the verdict.
      expect(piInlineFloorFor(row.bin)).toBe('holds');
    });
  }

  // The third ruled round's nit: the walk starts in the SESSION's folder, which the desk and Restart can set apart
  // from the project's. The phone's start sends no folder (composeStartInput), so it starts in the project's own.
  it('a session in a subfolder of its project that pins its own pi 0.83.0 reads unread from that subfolder: the desk and Restart spawn pi there as today, and the phone, which starts in the project folder, holds, byte for byte', async () => {
    const path = SHAPES['node_modules/.bin']!;
    await scan(path, G.bin);

    const desk = await deskCreate(MONO, MONO_SUB);
    expect(desk.folder).toBe(MONO_SUB);
    expect(desk.pane).toEqual(['pi', '--session-id', 'ID', '--model', 'm']);
    expect(desk.argv).toEqual([G.bin, '--session-id', 'ID', '--model', 'm']);
    expect(desk.resume).toEqual([G.bin, '--session-id', 'ID', '--model', 'm']);

    const restart = await restartReplacement(MONO, MONO_SUB);
    expect(restart.folder).toBe(MONO_SUB);
    expect(restart.pane).toEqual(['pi', '--session-id', 'ID', '--model', 'm']);
    expect(restart.argv).toEqual([G.bin, '--session-id', 'ID', '--model', 'm']);
    expect(restart.resume).toEqual([G.bin, '--session-id', 'ID', '--model', 'm']);

    const phone = await phoneStart(MONO);
    expect(phone.folder).toBe(MONO);
    expect(phone.pane).toEqual(['pi', ...TOK, '--session-id', 'ID']);
    expect(phone.argv).toEqual([G.bin, ...TOK, '--session-id', 'ID']);
    expect(phone.resume).toEqual([G.bin, ...TOK, '--session-id', 'ID']);

    // The verdict, as each create asks it: from the session's own folder.
    expect(piInlineFloorFor(G.bin, { name: 'pi', path, folder: MONO_SUB })).toBe('unread');
    expect(piInlineFloorFor(G.bin, { name: 'pi', path, folder: MONO })).toBe('holds');
  });
});
