/**
 * Skills — the one artifact with a real standard, and the one whose
 * precedence surprises people.
 *
 * Agent Skills standardises the FILE: a directory holding `SKILL.md` with YAML
 * frontmatter carrying `name` and `description`. It says nothing about where
 * skills live, what scopes exist, or who wins a name collision, and every
 * agent invented those independently. So this reader produces candidates and
 * the resolver applies each agent's own rule.
 *
 * The measurement that shapes the whole thing: on the operator's machine one
 * physical `~/.agents/skills/govuk-style/SKILL.md` is reachable from nine
 * agent directories through symlinks. 107 directory entries across ten roots
 * are 33 distinct skills. A reader that keys on the path shows the 107. This
 * one keys on `realpath`, which also answers the hardest question the view
 * asks — which agents load this — for the price of a call it was making
 * anyway.
 */

import { basename, join, relative } from 'node:path';
import type { ContextProblem, SkillPayload } from '@shared/context';
import type { Candidate, ReadContext } from '../candidate';
import type { ContextLocation } from '../agent-context';
import { scanExecutableContent } from '../executes';
import { maskInline } from '../secrets';
import {
  parseFrontmatter,
  yamlBoolean,
  yamlList,
  yamlMap,
  yamlString
} from '../parse/frontmatter';
import { fileLabel, resolveLocations } from './locations';

/** A skill body larger than this is not a skill, it is a document dump. */
const MAX_SKILL_BYTES = 512 * 1024;

/** The nested-project walk is bounded so a monorepo cannot stall a refresh. */
const NESTED = {
  maxDepth: 3,
  maxDirs: 400,
  skip: new Set([
    'node_modules',
    '.git',
    'dist',
    'out',
    'build',
    'target',
    'vendor',
    '.next',
    'coverage',
    '.venv',
    '__pycache__'
  ])
} as const;

/** First clause of a description, for the 11px summary slot that never wraps. */
export function firstClause(text: string | null): string {
  if (!text) return '';
  const flat = text.replace(/\s+/g, ' ').trim();
  const stop = /\.\s+[A-Z]/.exec(flat);
  const clause = stop ? flat.slice(0, stop.index + 1) : flat;
  return clause.length > 200 ? `${clause.slice(0, 199)}…` : clause;
}

/**
 * The derived trigger sentence — the answer to "what actually makes this
 * fire", which is what someone opening this panel is nearly always asking. It
 * is not a field in the standard; it is three fields read together.
 */
export function triggerSentence(payload: {
  name: string;
  userInvokable: boolean | null;
  disableModelInvocation: boolean | null;
  paths: string[];
}): string {
  const slash = `/${payload.name}`;
  let base: string;
  if (payload.disableModelInvocation === true) {
    base = `Only when you type ${slash}.`;
  } else if (payload.userInvokable === true) {
    base = `The agent loads it when relevant, or you type ${slash}.`;
  } else if (payload.userInvokable === false) {
    base = 'The agent loads it when relevant.';
  } else {
    base = `The agent loads it when relevant, or you type ${slash}.`;
  }
  if (payload.paths.length > 0) {
    return `${base} Only when working on files matching ${payload.paths.join(', ')}.`;
  }
  return base;
}

async function countChildren(ctx: ReadContext, dir: string): Promise<number> {
  const entries = await ctx.fs.readDir(dir);
  if (!entries) return 0;
  return entries.filter((entry) => !entry.name.startsWith('.')).length;
}

interface SkillDirInput {
  ctx: ReadContext;
  location: ContextLocation;
  /** The skill's own directory. */
  dir: string;
  /** Name used when the frontmatter has none: the directory name, path-qualified. */
  fallbackName: string;
  lazy: boolean;
  wantExecutableScan: boolean;
}

async function readOneSkill(input: SkillDirInput): Promise<Candidate | null> {
  const { ctx, location, dir } = input;
  const sourcePath = join(dir, 'SKILL.md');
  const text = await ctx.fs.readText(sourcePath, MAX_SKILL_BYTES);
  if (text === null) return null;

  const realPath = await ctx.fs.realPath(sourcePath);
  const parsed = parseFrontmatter(text);
  let problem: ContextProblem | null = null;
  if (parsed.problem) {
    problem = {
      path: sourcePath,
      line: parsed.problem.line,
      message: `${fileLabel(sourcePath)} could not be read. ${parsed.problem.message}`,
      kind: 'parse',
      category: 'skill'
    };
    ctx.addProblem(problem);
  }

  const declaredName = yamlString(parsed.data.name);
  const directoryName = basename(dir);
  const name = declaredName ?? input.fallbackName;
  const description = yamlString(parsed.data.description);
  const paths = yamlList(parsed.data.paths);
  const hookMap = yamlMap(parsed.data.hooks);
  const hookEvents = hookMap ? Object.keys(hookMap) : [];

  const payload: SkillPayload = {
    kind: 'skill',
    description: description ? maskInline(description) : null,
    license: yamlString(parsed.data.license),
    compatibility: yamlString(parsed.data.compatibility),
    allowedTools: yamlList(parsed.data['allowed-tools']),
    argumentHint: yamlString(parsed.data['argument-hint']),
    userInvokable:
      yamlBoolean(parsed.data['user-invokable']) ?? yamlBoolean(parsed.data['user-invocable']),
    disableModelInvocation: yamlBoolean(parsed.data['disable-model-invocation']),
    paths,
    trigger: '',
    bundles: {
      scripts: await countChildren(ctx, join(dir, 'scripts')),
      references: await countChildren(ctx, join(dir, 'references')),
      assets: await countChildren(ctx, join(dir, 'assets'))
    },
    declaresHooks: hookEvents.length > 0,
    nameMatchesDirectory: declaredName === null || declaredName === directoryName,
    startupBytes: Buffer.byteLength(`${name}\n${description ?? ''}`),
    startupTokens: 0,
    lazy: input.lazy
  };
  payload.trigger = triggerSentence({ name, ...payload });
  payload.startupTokens = Math.ceil(payload.startupBytes / 4);

  // Phase 26.2 — ownership decides what a name-folder disagreement becomes.
  // The two names are kept as data, because the final sentence needs the
  // per-agent verdicts and those do not exist until the resolver has run.
  // A mismatch inside a vendor's own installation produces no problem at all:
  // the user cannot act on it, so it becomes a quiet note in
  // `routeNamingMismatch` (resolve.ts). A user-owned mismatch is a real
  // problem whose message is finished in the same place, and it reaches the
  // section list from `scan.ts` once the message is final, which is why
  // nothing here calls `ctx.addProblem`.
  if (!payload.nameMatchesDirectory && declaredName !== null) {
    payload.namingMismatch = { declared: declaredName, folder: directoryName };
    if (location.bundled !== true) {
      const mismatch: ContextProblem = {
        path: sourcePath,
        line: null,
        message: `This skill is named ${declaredName} but its folder is ${directoryName}.`,
        kind: 'invalid',
        category: 'skill'
      };
      problem = problem ?? mismatch;
    }
  }

  const candidate: Candidate = {
    category: 'skill',
    agent: ctx.agent,
    name,
    identity: `skill:${realPath}`,
    scope: location.scope,
    rank: location.rank,
    sourcePath,
    realPath,
    evidence: location.evidence,
    bundled: location.bundled === true,
    summary: firstClause(payload.description) || payload.trigger,
    payload,
    problem,
    disabled: false,
    managed: location.scope === 'managed',
    hashTarget: { kind: 'file', path: sourcePath },
    executes: null,
    skillDir: dir,
    skillBody: {
      body: parsed.body,
      path: sourcePath,
      startLine: parsed.bodyStartLine,
      hookEvents
    }
  };

  if (input.wantExecutableScan) {
    candidate.executes = await scanExecutableContent(ctx.fs, {
      skillDir: dir,
      body: parsed.body,
      bodyPath: sourcePath,
      bodyStartLine: parsed.bodyStartLine,
      frontmatterHooks: hookEvents
    });
  }
  return candidate;
}

/** Every skill folder directly under one root. */
async function readRoot(
  ctx: ReadContext,
  location: ContextLocation,
  root: string,
  wantExecutableScan: boolean,
  pluginName?: string
): Promise<Candidate[]> {
  const entries = await ctx.fs.readDir(root);
  if (!entries) return [];
  const out: Candidate[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (!entry.isDirectory && !entry.isSymbolicLink) continue;
    const candidate = await readOneSkill({
      ctx,
      location,
      dir: join(root, entry.name),
      fallbackName: entry.name,
      lazy: false,
      wantExecutableScan
    });
    if (!candidate) continue;
    // A plugin's skills are addressed `plugin:skill`, which is what stops them
    // colliding with a skill of the same name in the user's own directory.
    out.push(pluginName ? { ...candidate, name: `${pluginName}:${candidate.name}` } : candidate);
  }
  return out;
}

/**
 * Skills in `.claude/skills` BELOW the project root. They are not loaded at
 * startup: they load the first time the agent reads or edits a file in that
 * subtree, and on a name clash the deeper one is addressed as
 * `apps/web:deploy`. A panel that showed them like the rest would be showing
 * things that are available but not yet loaded.
 */
async function readNested(
  ctx: ReadContext,
  location: ContextLocation,
  wantExecutableScan: boolean
): Promise<Candidate[]> {
  const root = ctx.projectRoot;
  if (!root || !ctx.includeNested) return [];
  const suffix = location.at.replace('<project>/', '');
  const out: Candidate[] = [];
  let budget = NESTED.maxDirs;
  const queue: { dir: string; depth: number }[] = [{ dir: root, depth: 0 }];
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    if (budget <= 0) {
      ctx.markTruncated();
      break;
    }
    const entries = await ctx.fs.readDir(next.dir);
    if (!entries) continue;
    for (const entry of entries) {
      if (!entry.isDirectory || entry.name.startsWith('.')) continue;
      if (NESTED.skip.has(entry.name)) continue;
      const child = join(next.dir, entry.name);
      budget -= 1;
      const nestedRoot = join(child, suffix);
      const found = await readRoot(ctx, location, nestedRoot, wantExecutableScan);
      for (const candidate of found) {
        const prefix = relative(root, child);
        out.push({
          ...candidate,
          name: `${prefix}:${candidate.name}`,
          payload: { ...(candidate.payload as SkillPayload), lazy: true }
        });
      }
      if (next.depth + 1 < NESTED.maxDepth) queue.push({ dir: child, depth: next.depth + 1 });
    }
  }
  return out;
}

export async function readSkills(
  ctx: ReadContext,
  locations: readonly ContextLocation[],
  wantExecutableScan: boolean
): Promise<Candidate[]> {
  const resolved = await resolveLocations(ctx, locations);
  const out: Candidate[] = [];
  for (const { location, path, pluginName } of resolved) {
    out.push(...(await readRoot(ctx, location, path, wantExecutableScan, pluginName)));
    if (location.nested) out.push(...(await readNested(ctx, location, wantExecutableScan)));
  }
  return out;
}
