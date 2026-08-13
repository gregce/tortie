/**
 * Plugins and extensions — bespoke everywhere, and they read each other's
 * manifests.
 *
 * Claude Code has plugins and marketplaces, Codex has plugins and marketplace
 * snapshots inside its TOML, Gemini and Qwen call the same idea extensions,
 * Cursor and Antigravity keep directories of them, and muse ships a bundled
 * cache. There is no shared format. What they do share is the edges: the Codex
 * binary carries string literals for `.codex-plugin/plugin.json`,
 * `.claude-plugin/plugin.json` AND `.cursor-plugin/plugin.json`, and
 * `qwen extensions install` accepts a Claude marketplace URL.
 *
 * So this reader looks for the three manifest names in a plugin directory
 * rather than branching on the agent, and counts what the plugin CONTRIBUTES
 * by listing its own subdirectories. That count is the answer to the question
 * the plugin row exists to answer: a plugin is not one thing, it is a bundle
 * of skills, hooks, MCP servers and agents that all arrive together.
 */

import { basename, join } from 'node:path';
import type { PluginPayload } from '@shared/context';
import type { Candidate, ReadContext } from '../candidate';
import type { ContextLocation } from '../agent-context';
import { asRecord, asString, parseJsonc, type JsonRecord } from '../parse/jsonc';
import { parseToml, tomlBoolean, tomlTable } from '../parse/toml';
import { CONTEXT_READ_LIMITS } from '../port';
import { maskInline } from '../secrets';
import { fileLabel, resolveLocations } from './locations';

const MANIFESTS = [
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  'plugin.json',
  'gemini-extension.json',
  'qwen-extension.json',
  'package.json'
] as const;

const emptyContributions = (): PluginPayload['contributes'] => ({
  skills: 0,
  hooks: 0,
  mcpServers: 0,
  agents: 0,
  commands: 0
});

async function countDir(ctx: ReadContext, dir: string): Promise<number> {
  const entries = await ctx.fs.readDir(dir);
  if (!entries) return 0;
  return entries.filter((entry) => !entry.name.startsWith('.')).length;
}

/** What a plugin brings with it, counted from its own directory. */
async function contributionsOf(
  ctx: ReadContext,
  dir: string
): Promise<PluginPayload['contributes']> {
  const [skills, hooks, agents, commands] = await Promise.all([
    countDir(ctx, join(dir, 'skills')),
    countDir(ctx, join(dir, 'hooks')),
    countDir(ctx, join(dir, 'agents')),
    countDir(ctx, join(dir, 'commands'))
  ]);
  const mcpServers = (await ctx.fs.exists(join(dir, '.mcp.json')))
    ? 1
    : (await ctx.fs.exists(join(dir, 'mcp_config.json')))
      ? 1
      : 0;
  return { skills, hooks, agents, commands, mcpServers };
}

/**
 * A plugin cache entry is one level deeper than it looks. Codex stores
 * `plugins/cache/<marketplace>/<plugin>/<version>/`, so counting what
 * `<plugin>/` contributes finds nothing at all. When a directory holds no
 * manifest and exactly one subdirectory, that subdirectory is the plugin.
 */
async function resolvePluginDir(ctx: ReadContext, dir: string): Promise<string> {
  if (await readManifest(ctx, dir)) return dir;
  const entries = await ctx.fs.readDir(dir);
  if (!entries) return dir;
  const children = entries.filter((entry) => entry.isDirectory && !entry.name.startsWith('.'));
  const only = children.length === 1 ? children[0] : undefined;
  return only ? join(dir, only.name) : dir;
}

async function readManifest(ctx: ReadContext, dir: string): Promise<JsonRecord | null> {
  for (const relative of MANIFESTS) {
    const path = join(dir, relative);
    const text = await ctx.fs.readText(path, 512 * 1024);
    if (text === null) continue;
    const parsed = parseJsonc<unknown>(text, fileLabel(path));
    if (parsed.problem) {
      ctx.addProblem({
        path,
        line: parsed.problem.line,
        message: parsed.problem.message,
        kind: 'parse',
        category: 'plugin'
      });
      continue;
    }
    const record = asRecord(parsed.value);
    if (record) return record;
  }
  return null;
}

/** `~/.claude/plugins/installed_plugins.json` plus the settings enable map. */
async function readClaudePlugins(
  ctx: ReadContext,
  location: ContextLocation,
  path: string
): Promise<Candidate[]> {
  const text = await ctx.fs.readText(path, CONTEXT_READ_LIMITS.bigJsonMaxBytes);
  if (text === null) return [];
  const parsed = parseJsonc<unknown>(text, fileLabel(path));
  if (parsed.problem) {
    ctx.addProblem({
      path,
      line: parsed.problem.line,
      message: parsed.problem.message,
      kind: 'parse',
      category: 'plugin'
    });
    return [];
  }
  const plugins = asRecord(asRecord(parsed.value)?.plugins);
  if (!plugins) return [];

  const enabled = await readEnabledPlugins(ctx);
  const out: Candidate[] = [];
  for (const [key, value] of Object.entries(plugins)) {
    const installs = Array.isArray(value) ? value : [value];
    const install = asRecord(installs[installs.length - 1]);
    const [name, marketplace] = key.split('@');
    const installPath = asString(install?.installPath);
    const manifest = installPath ? await readManifest(ctx, installPath) : null;
    const payload: PluginPayload = {
      kind: 'plugin',
      version: asString(install?.version) ?? asString(manifest?.version),
      description: asString(manifest?.description)
        ? maskInline(String(manifest?.description))
        : null,
      author: readAuthor(manifest),
      homepage: asString(manifest?.homepage),
      marketplace: marketplace ?? null,
      commitSha: asString(install?.gitCommitSha),
      installPath,
      enabled: enabled.get(key) ?? true,
      contributes: installPath ? await contributionsOf(ctx, installPath) : emptyContributions()
    };
    out.push({
      category: 'plugin',
      agent: ctx.agent,
      name: name ?? key,
      identity: `plugin:${key}`,
      scope: asString(install?.scope) === 'project' ? 'project' : location.scope,
      rank: location.rank,
      sourcePath: installPath ?? path,
      realPath: installPath ?? path,
      evidence: location.evidence,
      bundled: false,
      summary: payload.description ?? (marketplace ? `from ${marketplace}` : ''),
      payload,
      problem: null,
      disabled: !payload.enabled,
      managed: false,
      hashTarget: { kind: 'file', path },
      executes: null
    });
  }
  return out;
}

function readAuthor(manifest: JsonRecord | null): string | null {
  const author = manifest?.author;
  if (typeof author === 'string') return author;
  const record = asRecord(author);
  return asString(record?.name);
}

/**
 * `enabledPlugins` lives in the SETTINGS files, which resolve narrowest-wins:
 * a project settings file beats your personal one. That is the opposite
 * direction from skills in the same product, and it is why the enable map is
 * read in settings order rather than folded in with the install record.
 */
async function readEnabledPlugins(ctx: ReadContext): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  const files = [
    join(ctx.homes.claude, 'settings.json'),
    ctx.projectRoot ? join(ctx.projectRoot, '.claude', 'settings.json') : null,
    ctx.projectRoot ? join(ctx.projectRoot, '.claude', 'settings.local.json') : null
  ].filter((path): path is string => path !== null);
  for (const path of files) {
    const text = await ctx.fs.readText(path, CONTEXT_READ_LIMITS.bigJsonMaxBytes);
    if (text === null) continue;
    const parsed = parseJsonc<unknown>(text, fileLabel(path));
    const map = asRecord(asRecord(parsed.value)?.enabledPlugins);
    for (const [key, value] of Object.entries(map ?? {})) {
      if (typeof value === 'boolean') out.set(key, value);
    }
  }
  return out;
}

/** Codex's `[plugins."<name>@<marketplace>"] enabled = true`. */
async function readCodexPlugins(
  ctx: ReadContext,
  location: ContextLocation,
  path: string
): Promise<Candidate[]> {
  const text = await ctx.fs.readText(path, CONTEXT_READ_LIMITS.bigJsonMaxBytes);
  if (text === null) return [];
  const parsed = parseToml(text, fileLabel(path));
  const plugins = tomlTable(parsed.value[location.key ?? 'plugins']);
  if (!plugins) return [];
  const out: Candidate[] = [];
  for (const [key, value] of Object.entries(plugins)) {
    const body = tomlTable(value);
    const [name, marketplace] = key.split('@');
    const cacheDir = marketplace
      ? await resolvePluginDir(ctx, join(ctx.homes.codex, 'plugins', 'cache', marketplace, name ?? ''))
      : null;
    const payload: PluginPayload = {
      kind: 'plugin',
      version: null,
      description: null,
      author: null,
      homepage: null,
      marketplace: marketplace ?? null,
      commitSha: null,
      installPath: cacheDir,
      enabled: tomlBoolean(body?.enabled) !== false,
      contributes: cacheDir ? await contributionsOf(ctx, cacheDir) : emptyContributions()
    };
    out.push({
      category: 'plugin',
      agent: ctx.agent,
      name: name ?? key,
      identity: `plugin:${key}`,
      scope: location.scope,
      rank: location.rank,
      sourcePath: path,
      realPath: path,
      evidence: location.evidence,
      bundled: false,
      summary: marketplace ? `from ${marketplace}` : '',
      payload,
      problem: null,
      disabled: !payload.enabled,
      managed: false,
      hashTarget: { kind: 'file', path },
      executes: null
    });
  }
  return out;
}

/** A directory whose children are plugin or extension folders. */
async function readPluginDir(
  ctx: ReadContext,
  location: ContextLocation,
  root: string
): Promise<Candidate[]> {
  const entries = await ctx.fs.readDir(root);
  if (!entries) return [];
  const out: Candidate[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (!entry.isDirectory && !entry.isSymbolicLink) continue;
    const dir = await resolvePluginDir(ctx, join(root, entry.name));
    const manifest = await readManifest(ctx, dir);
    const payload: PluginPayload = {
      kind: 'plugin',
      version: asString(manifest?.version),
      description: asString(manifest?.description)
        ? maskInline(String(manifest?.description))
        : null,
      author: readAuthor(manifest),
      homepage: asString(manifest?.homepage),
      marketplace: null,
      commitSha: null,
      installPath: dir,
      enabled: true,
      contributes: await contributionsOf(ctx, dir)
    };
    out.push({
      category: 'plugin',
      agent: ctx.agent,
      name: asString(manifest?.name) ?? basename(dir),
      identity: `plugin:${await ctx.fs.realPath(dir)}`,
      scope: location.scope,
      rank: location.rank,
      sourcePath: dir,
      realPath: await ctx.fs.realPath(dir),
      evidence: location.evidence,
      bundled: location.bundled === true,
      summary: payload.description ?? '',
      payload,
      problem: null,
      disabled: false,
      managed: false,
      hashTarget: { kind: 'dir', path: dir },
      executes: null
    });
  }
  return out;
}

export async function readPlugins(
  ctx: ReadContext,
  locations: readonly ContextLocation[]
): Promise<Candidate[]> {
  const resolved = await resolveLocations(ctx, locations);
  const out: Candidate[] = [];
  for (const { location, path } of resolved) {
    switch (location.reader) {
      case 'plugins-claude':
        out.push(...(await readClaudePlugins(ctx, location, path)));
        break;
      case 'plugins-codex':
        out.push(...(await readCodexPlugins(ctx, location, path)));
        break;
      case 'plugin-dir':
        out.push(...(await readPluginDir(ctx, location, path)));
        break;
      default:
        break;
    }
  }
  return out;
}
