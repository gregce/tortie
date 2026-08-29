/**
 * The boundary Phase 23 is built on, checked by measurement rather than by
 * reading the code and believing it.
 *
 * Research 31 wrote this rule as a list of files that must not import the
 * configuration modules. The re-baseline found that list wrong: it named
 * `src/main/manifest/agents.ts`, which is the CREATE path and which now has to
 * read the merged agent table for a configured agent to launch at all. So the
 * list is re-derived here from what the rule actually protects.
 *
 * There are two rules and they are not the same rule.
 *
 *  1. **The restore path must not reach the configuration modules at all.**
 *     Phase 21 moved restore off the live registry and onto the manifest row.
 *     A session created by a configured agent and a session created by a
 *     compiled one are the same shape in the row, and restore cannot tell them
 *     apart. That is what makes deleting `agents.json` safe: removing a row
 *     changes what you can create, never what comes back. An import from
 *     restore into `src/main/config/` would undo Phase 21 quietly, so the walk
 *     below follows every value import transitively and fails on the first one
 *     that lands in the configuration domain.
 *
 *  2. **The create path may read the merged table, but never the disk.** It
 *     reads memory. `agentOverlayDiskReads()` counts the reads that really
 *     happened, and the second block drives the create path for every compiled
 *     agent and asserts the count did not move. This is the difference between
 *     a rule and a promise.
 *
 * A third block pins the thing bb had to delete the day after shipping it: the
 * merge must never write into `AGENT_REGISTRY`. If it did, both rules above
 * would be true and both would be pointless, because the compiled table every
 * other module reads would already carry the user's rows.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { LaunchableAgentId } from '@shared/types';

let userData = '/tmp/gmux-boundary-test-userdata';

vi.mock('electron', () => ({
  app: { getPath: () => userData },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: () => Buffer.from(''),
    decryptString: () => ''
  }
}));

const REPO = resolve(__dirname, '../../../..');
const SRC = join(REPO, 'src');
const CONFIG_DIR = join(SRC, 'main', 'config');

/**
 * Every module specifier a file imports FOR ITS VALUE.
 *
 * `import type` and `export type` are dropped, because TypeScript erases them
 * and an erased import cannot pull a module into the bundle at runtime. That
 * distinction is load bearing here: `src/main/restore/restore.ts` type-imports
 * `ManifestSessionRecord` from `../manifest`, whose barrel does reach the
 * configuration modules, and that import is genuinely not a breach.
 */
function valueImportsOf(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  const specifiers: string[] = [];
  // One pass over `import ... from '<spec>'`, `export ... from '<spec>'` and
  // bare `import '<spec>'`. The leading group captures the clause so a `type`
  // keyword directly after import/export can be recognised and skipped.
  const re = /(?:^|\n)\s*(?:import|export)(\s+type\b)?([^'"\n;]*?)from\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const isTypeOnly = m[1] !== undefined;
    if (isTypeOnly) continue;
    const clause = m[2] ?? '';
    // `import { type A, type B } from 'x'` is also fully erased. It is only a
    // value import if at least one named binding has no `type` prefix, or the
    // clause has a default or namespace binding.
    if (clause.includes('{') && clause.includes('}')) {
      const inner = clause.slice(clause.indexOf('{') + 1, clause.lastIndexOf('}'));
      const before = clause.slice(0, clause.indexOf('{')).replace(/[,\s]/g, '');
      const names = inner
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n.length > 0);
      const anyValue = names.some((n) => !/^type\s/.test(n));
      if (!anyValue && before.length === 0) continue;
    }
    specifiers.push(m[3] as string);
  }
  const bare = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
  while ((m = bare.exec(text)) !== null) specifiers.push(m[1] as string);
  return specifiers;
}

/** Turn a specifier into a file under src/, or null when it leaves the repo. */
function resolveSpecifier(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@shared/')) base = join(SRC, 'shared', spec.slice('@shared/'.length));
  else if (spec.startsWith('@main/')) base = join(SRC, 'main', spec.slice('@main/'.length));
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else return null; // a node builtin or a package — neither is ours
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx')
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Every file reachable from an entry point by value imports, with its path. */
function reachableFrom(entry: string): Map<string, string[]> {
  const seen = new Map<string, string[]>();
  const queue: { file: string; path: string[] }[] = [{ file: entry, path: [entry] }];
  while (queue.length > 0) {
    const next = queue.shift();
    if (next === undefined) break;
    if (seen.has(next.file)) continue;
    seen.set(next.file, next.path);
    for (const spec of valueImportsOf(next.file)) {
      const target = resolveSpecifier(next.file, spec);
      if (target === null || seen.has(target)) continue;
      queue.push({ file: target, path: [...next.path, target] });
    }
  }
  return seen;
}

function short(file: string): string {
  return relative(REPO, file);
}

describe('the walk above can actually find a breach', () => {
  // A test that only ever reports "nothing found" is worth nothing, because a
  // scanner that returns an empty set for every input passes it. This is the
  // positive control. `src/main/manifest/agents.ts` is the CREATE path and it
  // genuinely does reach the configuration domain, on purpose, because that is
  // how a configured agent launches. So the walk must find it, by the exact
  // route the create path takes.
  it('finds the create path reaching src/main/config/, which it must', () => {
    const entry = join(SRC, 'main', 'manifest', 'agents.ts');
    const reachable = reachableFrom(entry);
    const hits = [...reachable.keys()].filter((f) => f.startsWith(`${CONFIG_DIR}/`));
    expect(hits.map(short).sort()).toContain('src/main/config/store.ts');
    expect(hits.map(short).sort()).toContain('src/main/config/confirm.ts');
  });

  it('walks further than the entry file', () => {
    // The second way this could pass vacuously is a resolver that never
    // resolves anything, leaving a one-file graph.
    // 18 files at the time of writing. The floor is lower so an ordinary
    // refactor does not fail this, but a resolver that broke would return 1.
    const reachable = reachableFrom(join(SRC, 'main', 'restore', 'restore.ts'));
    expect(reachable.size).toBeGreaterThan(12);
  });
});

describe('the restore path cannot reach the configuration modules', () => {
  it('src/main/restore/restore.ts imports nothing under src/main/config/', () => {
    const entry = join(SRC, 'main', 'restore', 'restore.ts');
    expect(existsSync(entry), `${short(entry)} must exist`).toBe(true);
    const reachable = reachableFrom(entry);
    const breaches = [...reachable.entries()]
      .filter(([file]) => file.startsWith(`${CONFIG_DIR}/`))
      .map(([, path]) => path.map(short).join('\n      -> '));
    expect(
      breaches,
      breaches.length === 0
        ? ''
        : `restore reached the configuration domain:\n      ${breaches.join('\n\n      ')}`
    ).toEqual([]);
  });

  it('every other module under src/main/restore/ is clean too', () => {
    // restore.ts is the path a session comes back through, and the test above
    // is the one that matters. This one catches a helper that grows a
    // configuration import before anything routes through it, which is how the
    // breach would actually arrive.
    const dir = join(SRC, 'main', 'restore');
    const files = ['restore.ts', 'command.ts', 'snapshots.ts']
      .map((f) => join(dir, f))
      .filter((f) => existsSync(f));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const reachable = [...reachableFrom(file).keys()];
      const breaches = reachable.filter((f) => f.startsWith(`${CONFIG_DIR}/`));
      expect(breaches.map(short), `${short(file)} reached the config domain`).toEqual(
        []
      );
    }
  });
});

describe('the create path reads memory, never the disk', () => {
  it('building a launch spec for every compiled agent moves no read counter', async () => {
    const store = await import('../store');
    const registry = await import('../../agents/registry');
    const manifest = await import('../../manifest/agents');

    // One boot read, exactly as the app does it. There is no file at this
    // path, which is the ordinary case and is the point: the compiled table
    // survives and the counter is at one.
    store.resetAgentOverlayStoreForTests();
    store.loadAgentOverlay('boot');
    const after = store.agentOverlayDiskReads();
    expect(after).toBe(1);

    // The filter removes the capture-only IDE pair at runtime, but the type of
    // `e.id` is still the full thirteen, so the cast says what the filter proved.
    const ids = registry.AGENT_REGISTRY.filter(
      (e) => e.launchable && e.launch !== null
    ).map((e) => e.id) as LaunchableAgentId[];
    expect(ids.length).toBe(12);

    for (const id of ids) {
      const spec = manifest.buildLaunchSpec(id, ['--flag'], `/abs/${id}`);
      expect(spec.argv[0], id).toBe(`/abs/${id}`);
      manifest.buildRecoveryContract(id, {
        at: 1,
        bin: `/abs/${id}`,
        cwdReal: '/tmp',
        projectReal: '/tmp',
        agentVersion: null
      });
    }
    manifest.buildLaunchSpec('shell', [], '/bin/zsh');

    // Ten launch specs and ten recovery contracts later, the file has still
    // been read exactly once, at boot.
    expect(store.agentOverlayDiskReads()).toBe(after);
  });
});

describe('the merge never writes into the compiled registry', () => {
  it('AGENT_REGISTRY is byte identical before and after a merge', async () => {
    const registry = await import('../../agents/registry');
    const overlay = await import('../overlay');
    const before = JSON.stringify(registry.AGENT_REGISTRY);
    const lengthBefore = registry.AGENT_REGISTRY.length;

    overlay.mergeAgentOverlay(
      [
        {
          id: 'claude',
          displayName: 'Something Else Entirely',
          binaries: ['not-claude'],
          launch: { argv: ['not-claude', '--dangerous'] }
        },
        {
          id: 'a-brand-new-agent',
          displayName: 'A Brand New Agent',
          binaries: ['brand-new'],
          launch: { argv: ['brand-new'] }
        }
      ],
      registry.AGENT_REGISTRY
    );

    expect(registry.AGENT_REGISTRY.length).toBe(lengthBefore);
    expect(JSON.stringify(registry.AGENT_REGISTRY)).toBe(before);
    // And the compiled lookup still answers with the compiled agent.
    expect(registry.getLaunchableEntry('claude').launch.argv[0]).toBe('claude');
  });
});
