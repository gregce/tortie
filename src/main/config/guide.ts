/**
 * The configuration folder's own documentation, and the one way into it.
 *
 * Phase 23 ships a door onto the agent table as data. This module is the part
 * of that door a person actually meets. It writes the guide, the generated
 * schema and the seven worked examples into
 * `<userData>/gmux/config/`, and it reveals that folder from one menu item.
 *
 * ## Why the guide lives on disk rather than in the app
 *
 * The operator's instruction was that this is discoverable subtly, and that the
 * guidance itself is not baked into the application chrome. So there is no
 * configuration editor, no template gallery and no onboarding flow. There is a
 * folder with a README in it, and one menu item that opens the folder. A user
 * of Tortie has twelve coding agents one keystroke away, so the scarce thing is
 * a contract an agent can read without guessing, not a form to fill in.
 *
 * ## What this module will and will not write
 *
 * It writes `README.md`, `agents.schema.json` and `examples/*.json`. Those are
 * Tortie's files. When the bytes on disk differ from the bytes in the installed
 * build they are rewritten, so an update cannot leave a user reading a contract
 * that no longer matches the parser.
 *
 * It never writes `agents.json`. That file is the user's, Tortie only ever
 * reads it, and no code path here can create, repair or delete it. Nothing else
 * in the folder is touched either: an unrecognised file a user leaves next to
 * their configuration is left exactly where they put it.
 *
 * Only `.md` and `.json` files are ever copied, and a symbolic link in the
 * template directory is skipped rather than followed. Neither is expected to
 * matter, because the source is inside the signed application. They are here so
 * that the seeder cannot become a way to place an executable file in a folder
 * Tortie tells people to open.
 *
 * ## Where the template comes from
 *
 * Packaged, it is `Contents/Resources/config/`, put there by the
 * `extraResources` entry in electron-builder.yml. Unpackaged, it is
 * `resources/config/` in the repository, which is the same directory the
 * packager copies. A development run therefore exercises the real path instead
 * of only ever testing the fallback.
 */

import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
// One module decides where the configuration directory is, and it is not this
// one. `configDir` is imported rather than reimplemented so the seeder and the
// overlay loader can never disagree about which folder they mean.
import { configDir } from './paths';

import { getLog } from '../log';

/**
 * Scope "config" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const configLog = getLog('config');

/**
 * Files in the configuration folder that belong to the user. They are never
 * written, never rewritten and never removed by anything in this module.
 */
export const USER_OWNED_CONFIG_FILES: readonly string[] = ['agents.json'];

/** The only file extensions the seeder will copy. */
const COPYABLE_EXTENSIONS: readonly string[] = ['.md', '.json'];

/** How deep the template directory is allowed to nest. `examples/` is one. */
const MAX_TEMPLATE_DEPTH = 2;

/** What one seeding run did. */
export interface ConfigSeedResult {
  /** The configuration folder, whether or not this run created it. */
  dir: string;
  /** True when this run created the folder for the first time. */
  created: boolean;
  /** Paths written this run, relative to the folder. Empty on a steady run. */
  written: string[];
  /** One sentence when something went wrong, otherwise null. */
  problem: string | null;
}

/** Lazy electron import, so this module loads in a plain node test. */
function electronApp(): { isPackaged: boolean; getAppPath(): string } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron');
    if (typeof app?.getAppPath !== 'function') return null;
    return { isPackaged: app.isPackaged, getAppPath: () => app.getAppPath() };
  } catch {
    return null;
  }
}

/** Where the shipped guide, schema and examples are read from. */
export function bundledConfigTemplateDir(): string {
  const app = electronApp();
  if (app?.isPackaged === true) return join(process.resourcesPath, 'config');
  const root = app?.getAppPath() ?? process.cwd();
  return join(root, 'resources', 'config');
}

/** Every file the seeder would copy, as paths relative to the template dir. */
function templateFiles(root: string, depth = 1): string[] {
  if (depth > MAX_TEMPLATE_DEPTH) return [];
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const name of entries.sort()) {
    const full = join(root, name);
    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(full);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      for (const nested of templateFiles(full, depth + 1)) out.push(join(name, nested));
      continue;
    }
    if (!stat.isFile()) continue;
    if (!COPYABLE_EXTENSIONS.includes(extname(name))) continue;
    if (USER_OWNED_CONFIG_FILES.includes(name)) continue;
    out.push(name);
  }
  return out;
}

function writeAtomic(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, text, 'utf8');
  renameSync(tmp, path);
}

/**
 * Create the configuration folder if it is not there, then make the guide, the
 * schema and the examples in it match the installed build.
 *
 * Both directories can be supplied, which is what the tests do. In the app both
 * are resolved here and nothing else needs to know either path.
 */
export function ensureConfigDirSeeded(
  options: { from?: string; to?: string } = {}
): ConfigSeedResult {
  const from = options.from ?? bundledConfigTemplateDir();
  const dir = options.to ?? configDir();
  const created = !existsSync(dir);
  const written: string[] = [];

  try {
    mkdirSync(dir, { recursive: true });
  } catch (err) {
    return {
      dir,
      created: false,
      written,
      problem: `Tortie could not create ${dir}. ${(err as Error).message}`
    };
  }

  const files = templateFiles(from);
  if (files.length === 0) {
    return {
      dir,
      created,
      written,
      problem: `Tortie could not read its own configuration guide at ${from}, so the folder is empty. The folder itself is fine to use.`
    };
  }

  for (const name of files) {
    const source = join(from, name);
    const target = join(dir, name);
    let wanted: string;
    try {
      wanted = readFileSync(source, 'utf8');
    } catch {
      continue;
    }
    let current: string | null = null;
    try {
      current = readFileSync(target, 'utf8');
    } catch {
      current = null;
    }
    if (current === wanted) continue;
    try {
      writeAtomic(target, wanted);
      written.push(name);
    } catch (err) {
      return {
        dir,
        created,
        written,
        problem: `Tortie could not write ${relative(dir, target)} into ${dir}. ${(err as Error).message}`
      };
    }
  }

  return { dir, created, written, problem: null };
}

/**
 * Seed the folder and open it.
 *
 * This is the whole of Tortie's configuration interface. One menu item, and a
 * folder in the Finder with a README at the top of it.
 */
export async function revealConfigFolder(): Promise<{ dir: string; problem: string | null }> {
  const seeded = ensureConfigDirSeeded();
  let shell: typeof import('electron').shell | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    shell = (require('electron') as typeof import('electron')).shell;
  } catch {
    shell = null;
  }
  if (shell === null) {
    return { dir: seeded.dir, problem: seeded.problem ?? 'No window server is available.' };
  }
  const opened = await shell.openPath(seeded.dir);
  const problem = opened === '' ? seeded.problem : opened;
  if (problem !== null && problem !== undefined && problem !== '') {
    configLog.warn(`configuration folder: ${problem}`);
  }
  return { dir: seeded.dir, problem: problem === '' ? null : (problem ?? null) };
}
