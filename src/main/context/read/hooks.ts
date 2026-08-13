/**
 * Hooks — the category with no precedence at all.
 *
 * Skills resolve broadest-wins, MCP servers resolve narrowest-wins-whole-entry,
 * and hooks are not resolved. Every entry from every settings level merges and
 * every one of them runs. That is why the view groups hooks by EVENT rather
 * than by scope: printing them in a precedence order would imply a resolution
 * that does not happen, and the real question with hooks is not "which one
 * wins" but "how many are about to run".
 *
 * Two shapes are read. Claude Code's, copied structurally by Antigravity and
 * paraphrased by Gemini CLI, is `{ Event: [{ matcher, hooks: [...] }] }` in a
 * settings file. Codex's is one TOML table per hook whose KEY encodes the
 * plugin, the file, the event and two indices, and whose body carries
 * `trusted_hash`. Codex is the only agent in the survey that pins a hook to a
 * hash and refuses to run it when the file changed, which is the same control
 * the MCP research recommends against a rug pull.
 *
 * A hook is a shell command that runs on a lifecycle event with no prompt at
 * all, and hooks committed to a repository were the subject of three CVEs. So
 * a hook whose script is not on disk is BROKEN in the error colour, not a
 * warning: the amber in this product is reserved for "an agent needs you".
 */

import { isAbsolute } from 'node:path';
import type { ContextProblem, HookPayload } from '@shared/context';
import type { Candidate, ReadContext } from '../candidate';
import type { ContextLocation } from '../agent-context';
import {
  asNumber,
  asRecord,
  asString,
  dig,
  parseJsonc,
  type JsonRecord
} from '../parse/jsonc';
import { parseToml, tomlBoolean, tomlString, tomlTable } from '../parse/toml';
import { CONTEXT_READ_LIMITS } from '../port';
import { maskInline } from '../secrets';
import { fileLabel, resolveLocations } from './locations';

const HANDLER_TYPES = new Set(['command', 'http', 'mcp_tool', 'prompt', 'agent']);

/**
 * The last path segment of a command, which is what the row shows.
 *
 * It runs on the MASKED command, never the raw one. An earlier version took
 * the first quoted string when the executable had no slash in it, so
 * `curl -H "Authorization: sk-…"` put a live credential in the row's name
 * while the summary next to it was correctly masked.
 */
export function commandLeaf(command: string): string {
  const first = command.trim().split(/\s+/);
  const executable = first[0] ?? command;
  const quoted = /["']([^"']*\/[^"']*)["']/.exec(command);
  const path = executable.includes('/') ? executable : (quoted?.[1] ?? executable);
  const segments = path.split('/').filter((part) => part !== '');
  return segments[segments.length - 1] ?? command;
}

/**
 * The script a hook runs, when one can be named without guessing. A command
 * full of `${CLAUDE_SKILL_DIR}` cannot be resolved without running the shell,
 * and running someone's hook to find out where it points is exactly what this
 * feature must not do. So an unresolvable command yields null, which the view
 * renders as "Tortie could not tell which file this runs" rather than as
 * broken.
 */
export function scriptPathOf(command: string): string | null {
  const tokens = command.match(/(?:"[^"]*"|'[^']*'|\S)+/g) ?? [];
  for (const raw of tokens) {
    const token = raw.replace(/^["']|["']$/g, '');
    if (token.includes('$') || token.includes('`')) continue;
    if (!isAbsolute(token)) continue;
    if (!/\.(?:sh|bash|zsh|mjs|cjs|js|ts|py|rb|pl|php|go|exe)$/.test(token)) continue;
    return token;
  }
  return null;
}

async function toCandidate(
  ctx: ReadContext,
  location: ContextLocation,
  sourcePath: string,
  event: string,
  matcher: string | null,
  handler: JsonRecord,
  order: number
): Promise<Candidate> {
  const rawCommand = asString(handler.command);
  const declaredType = asString(handler.type)?.toLowerCase() ?? null;
  const handlerType: HookPayload['handlerType'] =
    declaredType && HANDLER_TYPES.has(declaredType)
      ? (declaredType as HookPayload['handlerType'])
      : rawCommand
        ? 'command'
        : 'unknown';
  const scriptPath = rawCommand ? scriptPathOf(rawCommand) : null;
  const scriptMissing = scriptPath ? !(await ctx.fs.exists(scriptPath)) : false;

  const masked = rawCommand ? maskInline(rawCommand) : null;
  const payload: HookPayload = {
    kind: 'hook',
    event,
    matcher,
    handlerType,
    command: masked,
    commandLeaf: masked ? commandLeaf(masked) : null,
    timeoutSeconds: asNumber(handler.timeout),
    statusMessage: asString(handler.statusMessage),
    scriptPath,
    scriptMissing,
    trustedHash: null
  };

  let problem: ContextProblem | null = null;
  if (scriptMissing && scriptPath) {
    problem = {
      path: scriptPath,
      line: null,
      message: 'The script this hook runs is not on disk. The agent will log an error and keep going.',
      kind: 'missing',
      category: 'hook'
    };
    ctx.addProblem(problem);
  }

  return {
    category: 'hook',
    agent: ctx.agent,
    name: payload.commandLeaf ?? `${event} hook`,
    identity: `hook:${event}:${matcher ?? ''}:${handlerType}:${payload.command ?? ''}`,
    scope: location.scope,
    rank: location.rank,
    sourcePath,
    realPath: sourcePath,
    evidence: location.evidence,
    bundled: false,
    summary: payload.command ?? '',
    payload,
    problem,
    disabled: false,
    managed: location.scope === 'managed',
    hashTarget: { kind: 'file', path: scriptPath ?? sourcePath },
    executes: null,
    order
  };
}

/** `{ Event: [{ matcher, hooks: [handler] }] }`, and the flatter variants. */
async function readHooksJson(
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
      category: 'hook'
    });
    return [];
  }
  const root = asRecord(parsed.value);
  const table = asRecord(location.key ? dig(root, location.key) : root);
  if (!table) return [];

  const out: Candidate[] = [];
  let order = 0;
  for (const [event, value] of Object.entries(table)) {
    const groups = Array.isArray(value) ? value : [value];
    for (const group of groups) {
      const groupRecord = asRecord(group);
      if (!groupRecord) continue;
      const matcher = asString(groupRecord.matcher);
      const handlers = Array.isArray(groupRecord.hooks) ? groupRecord.hooks : [groupRecord];
      for (const handler of handlers) {
        const handlerRecord = asRecord(handler);
        if (!handlerRecord) continue;
        if (!handlerRecord.command && !handlerRecord.type) continue;
        out.push(
          await toCandidate(ctx, location, path, event, matcher, handlerRecord, order)
        );
        order += 1;
      }
    }
  }
  return out;
}

/**
 * Codex's `[hooks.state."<plugin>@<mkt>:hooks/<file>.json:<event>:<i>:<j>"]`.
 * Everything the row needs is in the key, and the body carries the trust hash
 * and the enabled flag. The hook's own command lives in the plugin's file,
 * which Tortie names rather than opens.
 */
async function readHooksCodex(
  ctx: ReadContext,
  location: ContextLocation,
  path: string
): Promise<Candidate[]> {
  const text = await ctx.fs.readText(path, CONTEXT_READ_LIMITS.bigJsonMaxBytes);
  if (text === null) return [];
  const parsed = parseToml(text, fileLabel(path));
  const hooks = tomlTable(parsed.value.hooks);
  const state = tomlTable(hooks?.state);
  if (!state) return [];

  const out: Candidate[] = [];
  let order = 0;
  for (const [key, value] of Object.entries(state)) {
    const body = tomlTable(value);
    if (!body) continue;
    const parts = key.split(':');
    const plugin = parts[0] ?? key;
    const file = parts[1] ?? '';
    const event = parts[2] ?? 'unknown';
    const enabled = tomlBoolean(body.enabled);
    const payload: HookPayload = {
      kind: 'hook',
      event,
      matcher: null,
      handlerType: 'command',
      command: null,
      commandLeaf: file.split('/').pop() ?? file,
      timeoutSeconds: null,
      statusMessage: null,
      scriptPath: null,
      scriptMissing: false,
      trustedHash: tomlString(body.trusted_hash)
    };
    out.push({
      category: 'hook',
      agent: ctx.agent,
      name: `${plugin} ${event}`,
      identity: `hook:codex:${key}`,
      scope: location.scope,
      rank: location.rank,
      sourcePath: path,
      realPath: path,
      evidence: location.evidence,
      bundled: false,
      summary: file,
      payload,
      problem: null,
      disabled: enabled === false,
      managed: false,
      hashTarget: { kind: 'file', path },
      executes: null,
      order
    });
    order += 1;
  }
  return out;
}

/**
 * Hooks a skill declares in its OWN frontmatter. Verified in
 * `~/.agents/skills/lore/SKILL.md`, which carries a `PreToolUse` entry with a
 * `command` handler. They are real hooks that will fire, so leaving them out
 * of the hooks section would undercount what is about to run.
 */
export function readSkillFrontmatterHooks(skills: readonly Candidate[]): Candidate[] {
  const out: Candidate[] = [];
  let order = 10_000;
  for (const skill of skills) {
    const events = skill.skillBody?.hookEvents ?? [];
    if (events.length === 0) continue;
    for (const event of events) {
      const payload: HookPayload = {
        kind: 'hook',
        event,
        matcher: null,
        handlerType: 'command',
        command: null,
        commandLeaf: skill.name,
        timeoutSeconds: null,
        statusMessage: null,
        scriptPath: null,
        scriptMissing: false,
        trustedHash: null
      };
      out.push({
        category: 'hook',
        agent: skill.agent,
        name: `${skill.name} ${event}`,
        identity: `hook:skill:${skill.realPath}:${event}`,
        scope: skill.scope,
        rank: skill.rank,
        sourcePath: skill.sourcePath,
        realPath: skill.realPath,
        evidence: skill.evidence,
        bundled: skill.bundled,
        summary: `Declared by the ${skill.name} skill`,
        payload,
        problem: null,
        disabled: false,
        managed: skill.managed,
        hashTarget: { kind: 'file', path: skill.sourcePath },
        executes: null,
        order
      });
      order += 1;
    }
  }
  return out;
}

export async function readHooks(
  ctx: ReadContext,
  locations: readonly ContextLocation[]
): Promise<Candidate[]> {
  const resolved = await resolveLocations(ctx, locations);
  const out: Candidate[] = [];
  for (const { location, path } of resolved) {
    if (location.reader === 'hooks-codex') out.push(...(await readHooksCodex(ctx, location, path)));
    else if (location.reader === 'hooks-json') out.push(...(await readHooksJson(ctx, location, path)));
  }
  return out;
}
