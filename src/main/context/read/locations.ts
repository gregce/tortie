/**
 * Turning a declared location into paths on this machine.
 *
 * Two jobs, both small, both shared by every reader:
 *
 *  1. **Expand.** `<claude>/plugins/cache/*&#47;*&#47;*&#47;skills` becomes the real
 *     directories that exist, by listing rather than by guessing. A `*`
 *     segment costs one `readdir` per level and the expansion is bounded, so a
 *     cache with a thousand plugins in it cannot turn a sidebar refresh into a
 *     tree walk.
 *  2. **Pick the file out of a group.** `~/.claude.json` moves into
 *     `CLAUDE_CONFIG_DIR` when that variable is set, and both spellings are
 *     declared. Members of a group are the same file in two possible places,
 *     so the first one that exists is read and the rest are skipped. Reading
 *     both would list every MCP server twice on a machine mid-migration.
 */

import type { ContextLocation } from '../agent-context';
import { expandLocation } from '../env';
import type { ReadContext } from '../candidate';

/** A declared location, resolved to one path that may or may not exist. */
export interface ResolvedLocation {
  location: ContextLocation;
  path: string;
  /**
   * The plugin that owns this path, for `<pluginInstall>` locations. Plugin
   * skills are namespaced `plugin:name` by the agents themselves, so they
   * cannot collide with a user's own skill of the same name.
   */
  pluginName?: string;
}

const MAX_GLOB_RESULTS = 256;

/**
 * The install directory of an enabled plugin. It is not a path template
 * because it is not knowable from the environment: it comes from the plugin
 * read, which runs first for exactly this reason.
 */
const PLUGIN_INSTALL = '<pluginInstall>';

async function expandGlob(ctx: ReadContext, template: string): Promise<string[]> {
  const parts = template.split('/');
  let heads: string[] = [''];
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i] ?? '';
    if (part !== '*') {
      heads = heads.map((head) => (head === '' ? part : `${head}/${part}`));
      continue;
    }
    const next: string[] = [];
    for (const head of heads) {
      const entries = await ctx.fs.readDir(head);
      if (!entries) continue;
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        if (!entry.isDirectory && !entry.isSymbolicLink) continue;
        if (next.length >= MAX_GLOB_RESULTS) {
          ctx.markTruncated();
          break;
        }
        next.push(`${head}/${entry.name}`);
      }
    }
    heads = next;
    if (heads.length === 0) return [];
  }
  return heads;
}

/**
 * Every path a location list points at, in declaration order, with group
 * members collapsed to the first that exists.
 */
export async function resolveLocations(
  ctx: ReadContext,
  locations: readonly ContextLocation[]
): Promise<ResolvedLocation[]> {
  const out: ResolvedLocation[] = [];
  const groupTaken = new Set<string>();
  for (const location of locations) {
    if (location.group && groupTaken.has(location.group)) continue;
    if (location.at.startsWith(PLUGIN_INSTALL)) {
      const suffix = location.at.slice(PLUGIN_INSTALL.length);
      for (const root of ctx.pluginRoots) {
        out.push({ location, path: `${root.path}${suffix}`, pluginName: root.name });
      }
      continue;
    }
    const base = expandLocation(location.at, ctx.homes, ctx.projectRoot);
    if (!base) continue;
    if (!base.includes('*')) {
      if (location.group) {
        if (!(await ctx.fs.exists(base))) continue;
        groupTaken.add(location.group);
      }
      out.push({ location, path: base });
      continue;
    }
    for (const path of await expandGlob(ctx, base)) out.push({ location, path });
  }
  return out;
}

/** A file label for a problem message: the base name, or the last two segments. */
export function fileLabel(path: string): string {
  const parts = path.split('/').filter((part) => part !== '');
  const name = parts[parts.length - 1] ?? path;
  const parent = parts[parts.length - 2];
  return parent && (parent.startsWith('.') || name.startsWith('settings'))
    ? `${parent}/${name}`
    : name;
}
