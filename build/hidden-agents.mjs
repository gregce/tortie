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
 * be probed either. Since Phase 335 a `GMUX_SMOKE` or `GMUX_SHOT` launch probes
 * none at all (the hold in src/main/agents/detection.ts, held by
 * `npm run conformance:harnessprobes`), and this file is what still guards a
 * `GMUX_PROBES` launch.
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
 * ## Every row but the stand-ins (Phase 348's second fix round, 2026-10-20)
 *
 * The five were never every row a `GMUX_PROBES` launch version-probes. Its
 * scan resolves each compiled row's binaries through the app's own extra
 * folders as well as the PATH a probe hands it, and Phase 348's reverify
 * found `/opt/homebrew/bin/omp` (Oh My Pi, registry id `omp`) resolved and
 * run with `--version` on every `probe:p316` launch of that phase (Phase 346's
 * probe review had accepted it as an exception). So a probe may now hide
 * every row it does not use rather than a list: every
 * export above takes an optional `ids`, `PROBED_AGENT_IDS` is every launchable
 * row the app version-probes (the registry's two IDE rows read a store and
 * run nothing), `hiddenAgentsBesides(standIns)` is all of them but the run's
 * stand-ins, `standInsOnlyVerdict` holds the app's own answer to "nothing
 * resolved but the stand-ins, and those under the run", and the precheck,
 * asked with `standIns`, holds `PROBED_AGENT_IDS` to the checkout's own
 * registry, so a row added there later is a refused launch rather than one
 * more agent run for its version. The five-id default is kept for the probes
 * that pass no `ids`, because Phase 346's probe runs `omp` and four more rows
 * as stand-ins of its own (`build/p346/probe-p346.mjs`).
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

/**
 * Every launchable row the app runs a version probe for (Phase 348's second
 * fix round), in the registry's order, each with its compiled binary names:
 * `src/main/agents/registry.ts`'s rows whose `kind` is `cli` and whose
 * `versionProbe` is set. `hiddenAgentsPrecheck` asked with `standIns` reads the
 * registry and refuses a launch when it does not say exactly this.
 */
export const PROBED_AGENT_BINARIES = Object.freeze({
  claude: Object.freeze(['claude']),
  cursor: Object.freeze(['cursor-agent']),
  codex: Object.freeze(['codex']),
  gemini: Object.freeze(['gemini']),
  droid: Object.freeze(['droid']),
  deepseek: Object.freeze(['codewhale', 'codew', 'deepseek']),
  antigravity: Object.freeze(['agy']),
  muse: Object.freeze(['muse']),
  qwen: Object.freeze(['qwen']),
  pi: Object.freeze(['pi']),
  omp: Object.freeze(['omp']),
  grok: Object.freeze(['grok']),
  opencode: Object.freeze(['opencode'])
});
export const PROBED_AGENT_IDS = Object.freeze(Object.keys(PROBED_AGENT_BINARIES));
/** The registry's IDE rows: a binary resolved for display only, a store read, and nothing ever run. */
export const IDE_AGENT_IDS = Object.freeze(['cursoride', 'copilotide']);

/** Every probed row but the run's stand-ins, the rows such a probe hides. */
export function hiddenAgentsBesides(standIns) {
  const keep = [...standIns];
  for (const id of keep) if (!PROBED_AGENT_IDS.includes(id)) throw new Error(`hidden-agents: the stand-in ${J(id)} is not a probed row`);
  return Object.freeze(PROBED_AGENT_IDS.filter((id) => !keep.includes(id)));
}

/** Every compiled binary name of `ids`, for a login shell asked where each resolves. */
export function hiddenAgentBinaries(ids) {
  return Object.freeze(ids.flatMap((id) => PROBED_AGENT_BINARIES[id] ?? []));
}

/** The name a hidden row's binary and launch argv are renamed to. */
export const neverName = (prefix, id) => `${prefix}-never-${id}`;

/**
 * Phase 331's overlay shape: schema 1, one row per hidden id, its binaries and
 * its launch argv both renamed, so nothing the app composes for these rows names
 * a real file.
 */
export function hiddenAgentsOverlay(prefix, ids = HIDDEN_AGENT_IDS) {
  if (!/^[a-z0-9-]+$/.test(String(prefix))) throw new Error(`hidden-agents: the prefix ${J(prefix)} is not a plain name`);
  return {
    schema: 1,
    agents: ids.map((id) => ({ id, binaries: [neverName(prefix, id)], launch: { argv: [neverName(prefix, id)] } }))
  };
}

/** Write the overlay as `<profile>/gmux/config/agents.json`, and answer that path. */
export function writeHiddenAgents(profile, prefix, ids = HIDDEN_AGENT_IDS) {
  const dir = join(profile, 'gmux', 'config');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = join(dir, 'agents.json');
  writeFileSync(path, `${J(hiddenAgentsOverlay(prefix, ids), null, 1)}\n`, 'utf8');
  return path;
}

/**
 * The app's own scan, read back through `agents:list`: every hidden row must
 * answer no binary, no version and not installed. A hidden row missing from the
 * list is not resolved either. `{ ok, said }`.
 */
export function hiddenAgentsScanVerdict(list, ids = HIDDEN_AGENT_IDS) {
  if (!Array.isArray(list)) return { ok: false, said: 'agents:list answered no list' };
  const found = list.filter(
    (a) =>
      ids.includes(a?.id) &&
      ((a.binPath !== null && a.binPath !== undefined) || (a.version !== null && a.version !== undefined) || a.installed === true)
  );
  return found.length === 0
    ? { ok: true, said: `${ids.join(', ')} resolve nowhere in the app's own scan` }
    : { ok: false, said: `the app's scan resolved ${found.map((a) => `${String(a.id)} at ${String(a.binPath)} (version ${String(a.version)})`).join(', ')}` };
}

/**
 * The app's own scan says nothing resolved but the run's stand-ins (Phase
 * 348's second fix round): every row of the list that is neither a stand-in
 * nor an IDE row (which runs nothing) carries no binPath, no version and is
 * not installed, a row this file does not know included; and each stand-in
 * that resolved did so under `under`, the run's own folder, when it is given.
 * `{ ok, said }`.
 */
export function standInsOnlyVerdict(list, { standIns, under = null }) {
  if (!Array.isArray(list)) return { ok: false, said: 'agents:list answered no list' };
  const problems = [];
  for (const a of list) {
    const id = String(a?.id);
    if (IDE_AGENT_IDS.includes(id)) continue;
    const resolved = (a.binPath !== null && a.binPath !== undefined) || (a.version !== null && a.version !== undefined) || a.installed === true;
    if (standIns.includes(id)) {
      if (under !== null && a.binPath !== null && a.binPath !== undefined && !String(a.binPath).startsWith(`${under}/`)) problems.push(`the stand-in ${id} resolved at ${String(a.binPath)}, outside the run's ${under}`);
      continue;
    }
    if (resolved) problems.push(`${PROBED_AGENT_IDS.includes(id) ? '' : 'a row this file does not know, '}${id}, resolved at ${String(a.binPath)} (version ${String(a.version)})`);
  }
  return problems.length === 0
    ? { ok: true, said: `nothing resolved in the app's own scan but the stand-ins ${standIns.join(' and ')}${under === null ? '' : `, under ${under}`}` }
    : { ok: false, said: problems.join('; ') };
}

/** The page expression answering `[{ id, installed, binPath, version }]` as JSON text. */
export const AGENTS_LIST_EXPR =
  'window.gmux.agentsList().then((r) => JSON.stringify(r.agents.map((a) => ({ id: a.id, installed: a.installed, binPath: a.binPath ?? null, version: a.version ?? null }))))';

/**
 * The pre-launch check's verdict over one build's own parser, merge and
 * resolver: no problem, every hidden row merged with exactly its renamed binary,
 * and no copy of that name anywhere. `{ ok, said }`.
 */
export function hiddenAgentsPrecheckVerdict(out, prefix, ids = HIDDEN_AGENT_IDS) {
  if (out === null || typeof out !== 'object') return { ok: false, said: 'the check printed nothing readable' };
  if (out.parseProblems !== 0 || out.mergeProblems !== 0) {
    return { ok: false, said: `the overlay did not load whole (${String(out.parseProblems)} parse, ${String(out.mergeProblems)} merge problem(s)), so a hidden row would fall back to its real binary` };
  }
  // Asked with stand-ins (Phase 348's second fix round): the registry's own probed rows must be exactly this file's,
  // with the same binaries, or a row this file does not know would go unhidden.
  if (out.registry !== undefined) {
    const want = J(Object.entries(PROBED_AGENT_BINARIES).map(([id, bins]) => [id, [...bins]]));
    if (J(out.registry) !== want) return { ok: false, said: `the registry's probed rows ${J(out.registry)} are not this file's ${want}, so a row would go unhidden` };
  }
  const bad = ids.filter((id) => {
    const r = out.rows?.[id];
    return r === null || r === undefined || J(r.binaries) !== J([neverName(prefix, id)]) || r.copies !== 0;
  });
  const would = Object.entries(out.wouldResolve ?? {}).filter(([, at]) => at.length > 0).map(([id, at]) => `${id} at ${at.join(', ')}`);
  return bad.length === 0
    ? { ok: true, said: `${ids.join(', ')} merge with renamed binaries that resolve nowhere${would.length === 0 ? '' : ` (without the overlay ${would.join('; ')} would have resolved)`}` }
    : { ok: false, said: `not hidden: ${bad.map((id) => `${id} ${J(out.rows?.[id] ?? null)}`).join('; ')}` };
}

/**
 * Run the checkout's own overlay parser, merge and resolver over the overlay,
 * through the pinned tsx, synchronously. `home` and `userPath` are what the
 * resolver searches. Answers `{ exit, ok, said }`.
 */
export function hiddenAgentsPrecheck({ checkout, prefix, home, userPath, standIns = null }) {
  const ids = standIns === null ? HIDDEN_AGENT_IDS : hiddenAgentsBesides(standIns);
  const script = [
    "import { join } from 'node:path';",
    "import { parseAgentOverlay, mergeAgentOverlay } from './src/main/config/overlay.ts';",
    "import { AGENT_REGISTRY } from './src/main/agents/registry.ts';",
    "import { resolveBinaryAllAgainst, extraBinDirsFor } from './src/main/tmux/resolve.ts';",
    `const home = ${J(home)};`,
    `const userPath = ${J(userPath)};`,
    `const parsed = parseAgentOverlay(${J(J(hiddenAgentsOverlay(prefix, ids)))});`,
    'const merged = mergeAgentOverlay(parsed.rows, AGENT_REGISTRY);',
    "const dirsOf = (e) => [...e.extraProbeDirs.map((p) => (p.startsWith('~/') ? join(home, p.slice(2)) : p)), ...extraBinDirsFor(home)];",
    'const rows = {};',
    'const wouldResolve = {};',
    `for (const id of ${J(ids)}) {`,
    '  const e = merged.agents.find((a) => a.id === id);',
    '  if (e === undefined) { rows[id] = null; continue; }',
    '  rows[id] = { binaries: e.binaries, copies: e.binaries.flatMap((b) => resolveBinaryAllAgainst(b, userPath, dirsOf(e))).length };',
    '  const c = AGENT_REGISTRY.find((a) => a.id === id);',
    '  wouldResolve[id] = c === undefined ? [] : c.binaries.flatMap((b) => resolveBinaryAllAgainst(b, userPath, dirsOf(c)));',
    '}',
    // Asked with stand-ins: the registry's own probed rows, so a row this file does not know refuses the launch.
    standIns === null ? 'const registry = undefined;' : "const registry = AGENT_REGISTRY.filter((a) => a.kind === 'cli' && a.versionProbe !== null).map((a) => [a.id, [...a.binaries]]);",
    'process.stdout.write(JSON.stringify({ parseProblems: parsed.problems.length, mergeProblems: merged.problems.length, rows, wouldResolve, registry }));',
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
  return { exit: r.status, ids, wouldResolve: out?.wouldResolve ?? null, ...hiddenAgentsPrecheckVerdict(out, prefix, ids) };
}
