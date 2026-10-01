/**
 * hidden-agents.mjs. The five agents a probe's Electron must never start, and
 * the read-back that proves it did not (Phase 326, build/p326/SPEC.md §8).
 *
 * ## Why this file exists
 *
 * The app version-probes every agent its detection scan resolves: the boot warm
 * on an empty profile and every `agents:list` run `--version` on each one found.
 * Two Phase 331 verifiers measured a scan over this Mac's PATH resolving
 * gemini, qwen, antigravity (agy) and grok, and those four update themselves, so
 * the operator's default of 2026-09-29 is that no probe starts them in any form.
 * droid is not installed and is hidden the same way, so a later install cannot
 * be probed either.
 *
 * `build/p331/probe-p331.mjs` wrote the first copy of this: before EACH launch
 * a scratch `<profile>/gmux/config/agents.json` renames the binaries and the
 * launch argv of those five rows to names nothing on this Mac carries, and the
 * app's own `agents:list` is read back before any arm. Phase 326 needs the same
 * guard and takes it from here; p331 keeps its own copy for now, and moving it
 * onto this file is a named follow-up extraction rather than part of Phase 326
 * (SPEC §12).
 *
 * ## The four exports a probe uses
 *
 *   HIDDEN_AGENT_IDS              the five registry ids
 *   hiddenAgentsOverlay(prefix)   Phase 331's overlay shape, every binary and
 *                                 launch argv renamed to `<prefix>-never-<id>`
 *   writeHiddenAgents(profile, prefix)
 *                                 writes it as the profile's agents.json and
 *                                 answers the path
 *   hiddenAgentsScanVerdict(list) `{ ok, said }` over the app's own
 *                                 `agents:list` answer: none of the five may
 *                                 carry a binPath, a version or `installed`
 *   AGENTS_LIST_EXPR              the page expression that reads that answer
 *
 * `hiddenAgentsPrecheck` is the optional fifth: the checkout's OWN overlay
 * parser, merge and resolver run over the overlay through the pinned tsx,
 * before anything starts, so a build whose parser refused the file (and so
 * fell back to the real binaries) is found before its boot warm runs them.
 *
 * It starts nothing but that one pinned tsx, synchronously, and reads nothing
 * under the person's home. It is not a check script and is in no battery.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tsxCli } from './ts-runner.mjs';

const J = (v) => JSON.stringify(v);

/** The rows a probe's app must resolve NOWHERE, by registry id. */
export const HIDDEN_AGENT_IDS = Object.freeze(['gemini', 'qwen', 'antigravity', 'grok', 'droid']);

/** The name a hidden row's binary and launch argv are renamed to. */
export const neverName = (prefix, id) => `${prefix}-never-${id}`;

/**
 * Phase 331's overlay shape: schema 1, one row per hidden id, its binaries and
 * its launch argv both renamed, so nothing the app composes for these rows names
 * a real file.
 */
export function hiddenAgentsOverlay(prefix) {
  if (!/^[a-z0-9-]+$/.test(String(prefix))) throw new Error(`hidden-agents: the prefix ${J(prefix)} is not a plain name`);
  return {
    schema: 1,
    agents: HIDDEN_AGENT_IDS.map((id) => ({ id, binaries: [neverName(prefix, id)], launch: { argv: [neverName(prefix, id)] } }))
  };
}

/** Write the overlay as `<profile>/gmux/config/agents.json`, and answer that path. */
export function writeHiddenAgents(profile, prefix) {
  const dir = join(profile, 'gmux', 'config');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = join(dir, 'agents.json');
  writeFileSync(path, `${J(hiddenAgentsOverlay(prefix), null, 1)}\n`, 'utf8');
  return path;
}

/**
 * The app's own scan, read back through `agents:list`: every hidden row must
 * answer no binary, no version and not installed. A hidden row missing from the
 * list is not resolved either. `{ ok, said }`.
 */
export function hiddenAgentsScanVerdict(list) {
  if (!Array.isArray(list)) return { ok: false, said: 'agents:list answered no list' };
  const found = list.filter(
    (a) =>
      HIDDEN_AGENT_IDS.includes(a?.id) &&
      ((a.binPath !== null && a.binPath !== undefined) || (a.version !== null && a.version !== undefined) || a.installed === true)
  );
  return found.length === 0
    ? { ok: true, said: `${HIDDEN_AGENT_IDS.join(', ')} resolve nowhere in the app's own scan` }
    : { ok: false, said: `the app's scan resolved ${found.map((a) => `${String(a.id)} at ${String(a.binPath)} (version ${String(a.version)})`).join(', ')}` };
}

/** The page expression answering `[{ id, installed, binPath, version }]` as JSON text. */
export const AGENTS_LIST_EXPR =
  'window.gmux.agentsList().then((r) => JSON.stringify(r.agents.map((a) => ({ id: a.id, installed: a.installed, binPath: a.binPath ?? null, version: a.version ?? null }))))';

/**
 * The pre-launch check's verdict over one build's own parser, merge and
 * resolver: no problem, every hidden row merged with exactly its renamed binary,
 * and no copy of that name anywhere. `{ ok, said }`.
 */
export function hiddenAgentsPrecheckVerdict(out, prefix) {
  if (out === null || typeof out !== 'object') return { ok: false, said: 'the check printed nothing readable' };
  if (out.parseProblems !== 0 || out.mergeProblems !== 0) {
    return { ok: false, said: `the overlay did not load whole (${String(out.parseProblems)} parse, ${String(out.mergeProblems)} merge problem(s)), so a hidden row would fall back to its real binary` };
  }
  const bad = HIDDEN_AGENT_IDS.filter((id) => {
    const r = out.rows?.[id];
    return r === null || r === undefined || J(r.binaries) !== J([neverName(prefix, id)]) || r.copies !== 0;
  });
  return bad.length === 0
    ? { ok: true, said: `${HIDDEN_AGENT_IDS.join(', ')} merge with renamed binaries that resolve nowhere` }
    : { ok: false, said: `not hidden: ${bad.map((id) => `${id} ${J(out.rows?.[id] ?? null)}`).join('; ')}` };
}

/**
 * Run the checkout's own overlay parser, merge and resolver over the overlay,
 * through the pinned tsx, synchronously. `home` and `userPath` are what the
 * resolver searches. Answers `{ exit, ok, said }`.
 */
export function hiddenAgentsPrecheck({ checkout, prefix, home, userPath }) {
  const script = [
    "import { join } from 'node:path';",
    "import { parseAgentOverlay, mergeAgentOverlay } from './src/main/config/overlay.ts';",
    "import { AGENT_REGISTRY } from './src/main/agents/registry.ts';",
    "import { resolveBinaryAllAgainst, extraBinDirsFor } from './src/main/tmux/resolve.ts';",
    `const home = ${J(home)};`,
    `const userPath = ${J(userPath)};`,
    `const parsed = parseAgentOverlay(${J(J(hiddenAgentsOverlay(prefix)))});`,
    'const merged = mergeAgentOverlay(parsed.rows, AGENT_REGISTRY);',
    'const rows = {};',
    `for (const id of ${J(HIDDEN_AGENT_IDS)}) {`,
    '  const e = merged.agents.find((a) => a.id === id);',
    '  if (e === undefined) { rows[id] = null; continue; }',
    "  const dirs = [...e.extraProbeDirs.map((p) => (p.startsWith('~/') ? join(home, p.slice(2)) : p)), ...extraBinDirsFor(home)];",
    '  rows[id] = { binaries: e.binaries, copies: e.binaries.flatMap((b) => resolveBinaryAllAgainst(b, userPath, dirs)).length };',
    '}',
    'process.stdout.write(JSON.stringify({ parseProblems: parsed.problems.length, mergeProblems: merged.problems.length, rows }));',
    ''
  ].join('\n');
  const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', '-'], {
    cwd: checkout,
    input: script,
    encoding: 'utf8',
    timeout: 120_000,
    env: { ...process.env, HOME: home }
  });
  let out = null;
  try {
    out = JSON.parse(r.stdout);
  } catch {
    out = null;
  }
  return { exit: r.status, ...hiddenAgentsPrecheckVerdict(out, prefix) };
}
