/**
 * MCP servers — one wire protocol, nine file conventions, four
 * serializations, and a credential in at least three of them.
 *
 * Every agent speaks MCP and the server ENTRY has converged hard:
 * `command`/`args`/`env` for a local process, a URL for a remote one. The file
 * that holds the entry has not converged at all — `~/.claude.json` plus
 * `.mcp.json`, `[mcp_servers.*]` in a TOML file, `mcpServers` nested inside a
 * settings file, and Amp's literal dotted key `"amp.mcpServers"`. So the
 * shapes are read by four small readers and the entry is parsed once.
 *
 * Two things this reader does that a naive one would not:
 *
 *  - **It never loads an env VALUE.** `~/.cursor/mcp.json` on the operator's
 *    machine carries a live API key. The payload has a field for env KEYS and
 *    no field an env value could ever reach.
 *  - **It reads Claude Code's approval state.** A server in `.mcp.json` is not
 *    running until someone approved it interactively, and the approval lives
 *    in a different file from the server. Two similarly named key pairs in
 *    that file mean different things and the docs call the pair a footgun:
 *    `enabledMcpjsonServers`/`disabledMcpjsonServers` are the project-file
 *    approvals, and `enabledMcpServers`/`disabledMcpServers` are per-project
 *    toggles for user and local servers. They are not conflated here.
 */

import type { ContextProblem, McpPayload } from '@shared/context';
import type { Candidate, ReadContext } from '../candidate';
import type { ContextLocation } from '../agent-context';
import {
  asBoolean,
  asRecord,
  asString,
  asStringArray,
  dig,
  parseJsonc,
  type JsonRecord
} from '../parse/jsonc';
import { parseToml, tomlBoolean, tomlString, tomlStringArray, tomlTable } from '../parse/toml';
import { CONTEXT_READ_LIMITS } from '../port';
import { envKeysOnly, maskArgs, maskInline, maskUrl } from '../secrets';
import { fileLabel, resolveLocations } from './locations';

/** A parsed server definition, before it becomes a candidate. */
interface ServerDefinition {
  transport: McpPayload['transport'];
  command: string | null;
  args: string[];
  url: string | null;
  cwd: string | null;
  envKeys: string[];
  hiddenValueCount: number;
  enabled: boolean | null;
}

function summarise(definition: ServerDefinition): string {
  if (definition.url) return definition.url;
  if (!definition.command) return '';
  const firstArg = definition.args[0];
  return firstArg ? `${definition.command} ${firstArg}` : definition.command;
}

/** The converged entry shape, read out of a JSON object. */
function readJsonDefinition(raw: JsonRecord): ServerDefinition {
  const url = asString(raw.url) ?? asString(raw.serverUrl) ?? asString(raw.endpoint);
  const commandValue = raw.command;
  // OpenCode writes `command: ["binary", "arg"]` rather than command + args.
  const commandList = asStringArray(commandValue);
  const command =
    asString(commandValue) ?? (commandList.length > 0 ? (commandList[0] ?? null) : null);
  const args = asString(commandValue) ? asStringArray(raw.args) : commandList.slice(1);
  const declaredType = asString(raw.type)?.toLowerCase() ?? null;
  const env = envKeysOnly(raw.env);
  const transport: McpPayload['transport'] = url
    ? declaredType === 'sse'
      ? 'sse'
      : 'http'
    : command
      ? 'stdio'
      : 'unknown';
  const disabled = asBoolean(raw.disabled);
  return {
    transport,
    command: command ? maskInline(command) : null,
    args: maskArgs(args),
    url: url ? maskUrl(url) : null,
    cwd: asString(raw.cwd),
    envKeys: env.envKeys,
    hiddenValueCount: env.hiddenValueCount,
    enabled: asBoolean(raw.enabled) ?? (disabled === null ? null : !disabled)
  };
}

/** The same entry, out of a TOML table. */
function readTomlDefinition(raw: ReturnType<typeof tomlTable>): ServerDefinition {
  if (!raw) {
    return {
      transport: 'unknown',
      command: null,
      args: [],
      url: null,
      cwd: null,
      envKeys: [],
      hiddenValueCount: 0,
      enabled: null
    };
  }
  const url = tomlString(raw.url);
  const command = tomlString(raw.command);
  const env = envKeysOnly(tomlTable(raw.env));
  return {
    transport: url ? 'http' : command ? 'stdio' : 'unknown',
    command: command ? maskInline(command) : null,
    args: maskArgs(tomlStringArray(raw.args)),
    url: url ? maskUrl(url) : null,
    cwd: tomlString(raw.cwd),
    envKeys: env.envKeys,
    hiddenValueCount: env.hiddenValueCount,
    enabled: tomlBoolean(raw.enabled)
  };
}

/**
 * The identity two agents must share to be one row. It is the DEFINITION, not
 * the name: two agents that start the same binary the same way are running one
 * server, and two that use the same name for different commands are running
 * two things and must not be folded together.
 */
function identityOf(name: string, definition: ServerDefinition): string {
  return `mcp:${name}:${definition.transport}:${definition.command ?? ''}:${definition.args.join(' ')}:${definition.url ?? ''}`;
}

function toCandidate(
  ctx: ReadContext,
  location: ContextLocation,
  sourcePath: string,
  name: string,
  definition: ServerDefinition,
  approval: McpPayload['approval']
): Candidate {
  const payload: McpPayload = {
    kind: 'mcp',
    transport: definition.transport,
    command: definition.command,
    args: definition.args,
    url: definition.url,
    cwd: definition.cwd,
    envKeys: definition.envKeys,
    hiddenValueCount: definition.hiddenValueCount,
    enabled: definition.enabled,
    approval
  };
  return {
    category: 'mcp',
    agent: ctx.agent,
    name,
    identity: identityOf(name, definition),
    scope: location.scope,
    rank: location.rank,
    sourcePath,
    realPath: sourcePath,
    evidence: location.evidence,
    bundled: location.bundled === true,
    summary: summarise(definition),
    payload,
    problem: null,
    disabled: definition.enabled === false || approval === 'rejected',
    managed: location.scope === 'managed',
    hashTarget: { kind: 'file', path: sourcePath },
    executes: null
  };
}

async function readJsonFile(
  ctx: ReadContext,
  path: string,
  category: 'mcp' | 'hook'
): Promise<JsonRecord | null> {
  const text = await ctx.fs.readText(path, CONTEXT_READ_LIMITS.bigJsonMaxBytes);
  if (text === null) return null;
  const parsed = parseJsonc<unknown>(text, fileLabel(path));
  if (parsed.problem) {
    const problem: ContextProblem = {
      path,
      line: parsed.problem.line,
      message: parsed.problem.message,
      kind: 'parse',
      category
    };
    ctx.addProblem(problem);
    return null;
  }
  return asRecord(parsed.value);
}

/** `mcpServers`, `mcp`, `amp.mcpServers` — one key, a map of name to entry. */
async function readMcpJson(
  ctx: ReadContext,
  location: ContextLocation,
  path: string
): Promise<Candidate[]> {
  const root = await readJsonFile(ctx, path, 'mcp');
  const servers = asRecord(dig(root, location.key ?? 'mcpServers'));
  if (!servers) return [];
  const out: Candidate[] = [];
  for (const [name, value] of Object.entries(servers)) {
    const raw = asRecord(value);
    if (!raw) continue;
    out.push(toCandidate(ctx, location, path, name, readJsonDefinition(raw), 'not-required'));
  }
  return out;
}

async function readMcpToml(
  ctx: ReadContext,
  location: ContextLocation,
  path: string
): Promise<Candidate[]> {
  const text = await ctx.fs.readText(path, CONTEXT_READ_LIMITS.bigJsonMaxBytes);
  if (text === null) return [];
  const parsed = parseToml(text, fileLabel(path));
  if (parsed.problem) {
    ctx.addProblem({
      path,
      line: parsed.problem.line,
      message: parsed.problem.message,
      kind: 'parse',
      category: 'mcp'
    });
  }
  const servers = tomlTable(parsed.value[location.key ?? 'mcp_servers']);
  if (!servers) return [];
  const out: Candidate[] = [];
  for (const [name, value] of Object.entries(servers)) {
    out.push(
      toCandidate(ctx, location, path, name, readTomlDefinition(tomlTable(value)), 'not-required')
    );
  }
  return out;
}

/** `~/.claude.json` top-level `mcpServers`: Claude Code's user scope. */
async function readClaudeUser(
  ctx: ReadContext,
  location: ContextLocation,
  path: string
): Promise<Candidate[]> {
  const root = await readJsonFile(ctx, path, 'mcp');
  const servers = asRecord(root?.mcpServers);
  if (!servers) return [];
  const disabled = new Set(asStringArray(root?.disabledMcpServers));
  const out: Candidate[] = [];
  for (const [name, value] of Object.entries(servers)) {
    const raw = asRecord(value);
    if (!raw) continue;
    const definition = readJsonDefinition(raw);
    const candidate = toCandidate(ctx, location, path, name, definition, 'not-required');
    out.push(disabled.has(name) ? { ...candidate, disabled: true } : candidate);
  }
  return out;
}

/**
 * `~/.claude.json` → `projects[cwd]`. Two jobs in one read: the LOCAL-scope
 * servers, which live in the user's home directory and are invisible to the
 * rest of the team, and the approval state for the servers `.mcp.json`
 * declares.
 *
 * The file is 1.17 MB with 2,038 project entries on this machine, so only the
 * one key is touched and the parse is shared with the user-scope read through
 * the port's cache.
 */
async function readClaudeLocal(
  ctx: ReadContext,
  location: ContextLocation,
  path: string
): Promise<{ candidates: Candidate[]; approvals: ProjectApprovals }> {
  const empty: ProjectApprovals = { enabled: new Set(), disabled: new Set(), known: false };
  const root = await readJsonFile(ctx, path, 'mcp');
  if (!root || !ctx.projectRoot) return { candidates: [], approvals: empty };
  const projects = asRecord(root.projects);
  const project = asRecord(projects?.[ctx.projectRoot]);
  if (!project) return { candidates: [], approvals: empty };

  const approvals: ProjectApprovals = {
    enabled: new Set(asStringArray(project.enabledMcpjsonServers)),
    disabled: new Set(asStringArray(project.disabledMcpjsonServers)),
    known: 'enabledMcpjsonServers' in project || 'disabledMcpjsonServers' in project
  };
  const perProjectOff = new Set(asStringArray(project.disabledMcpServers));

  const servers = asRecord(project.mcpServers);
  const candidates: Candidate[] = [];
  for (const [name, value] of Object.entries(servers ?? {})) {
    const raw = asRecord(value);
    if (!raw) continue;
    const candidate = toCandidate(
      ctx,
      location,
      path,
      name,
      readJsonDefinition(raw),
      'not-required'
    );
    candidates.push(perProjectOff.has(name) ? { ...candidate, disabled: true } : candidate);
  }
  return { candidates, approvals };
}

interface ProjectApprovals {
  enabled: Set<string>;
  disabled: Set<string>;
  /** False when the file carries no approval keys at all for this project. */
  known: boolean;
}

/**
 * Apply Claude Code's approval gate to the servers a project file declares.
 * An unapproved server is listed and is not running, and saying otherwise is
 * the exact class of quiet lie this view exists to end.
 */
function applyApprovals(candidates: Candidate[], approvals: ProjectApprovals): Candidate[] {
  return candidates.map((candidate) => {
    if (candidate.scope !== 'project' || candidate.payload.kind !== 'mcp') return candidate;
    const approval: McpPayload['approval'] = approvals.disabled.has(candidate.name)
      ? 'rejected'
      : approvals.enabled.has(candidate.name)
        ? 'approved'
        : 'pending';
    return {
      ...candidate,
      disabled: approval === 'rejected',
      payload: { ...candidate.payload, approval }
    };
  });
}

export async function readMcp(
  ctx: ReadContext,
  locations: readonly ContextLocation[]
): Promise<Candidate[]> {
  const resolved = await resolveLocations(ctx, locations);
  const out: Candidate[] = [];
  let approvals: ProjectApprovals = { enabled: new Set(), disabled: new Set(), known: false };
  let sawClaudeLocal = false;

  for (const { location, path } of resolved) {
    switch (location.reader) {
      case 'mcp-json':
        out.push(...(await readMcpJson(ctx, location, path)));
        break;
      case 'mcp-toml':
        out.push(...(await readMcpToml(ctx, location, path)));
        break;
      case 'mcp-claude-user':
        out.push(...(await readClaudeUser(ctx, location, path)));
        break;
      case 'mcp-claude-local': {
        const result = await readClaudeLocal(ctx, location, path);
        out.push(...result.candidates);
        approvals = result.approvals;
        sawClaudeLocal = true;
        break;
      }
      default:
        break;
    }
  }
  return sawClaudeLocal ? applyApprovals(out, approvals) : out;
}
