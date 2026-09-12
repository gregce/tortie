/**
 * Phase 258 (the integrator's round). A hook after an early return.
 *
 * `Reading` in ArchDrill.tsx returned `null` while a repository had no map
 * yet and called `useArch((s) => s.inspectBox)` AFTER that return, so the
 * first render counted N hooks and the render with the model counted N + 1.
 * That is React error #310, the boundary above the Sidebar caught it, and
 * the whole Architecture pane vanished 303 ms after it mounted in the
 * running app — while every unit suite stayed green, because they render a
 * face once with `renderToStaticMarkup` and never cross the transition.
 *
 * This tree has no DOM environment and no lint gate carrying
 * rules-of-hooks, so the rule is read as TEXT over every component under
 * src/renderer/arch: inside a function whose name starts with a capital
 * letter, no line at the body's own depth may call a `useX(` hook after a
 * line at that depth that returns. The scanner is proved on the exact shape
 * that shipped (which must be caught) and on the repaired shape.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== '__tests__') out.push(...walk(full));
    } else if (/\.tsx$/.test(name)) out.push(full);
  }
  return out;
}

/** Component bodies as arrays of lines, keyed by name, by brace matching. */
export function componentBodies(source: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const head = /^(?:export )?function ([A-Z]\w*)\(/.exec(lines[i] ?? '');
    if (head === null) continue;
    // Find the line holding the body's opening brace: the first line at or
    // after the head whose trailing text is `{` after the parameter list and
    // the return type.
    let j = i;
    while (j < lines.length && !/\{\s*$/.test(lines[j] ?? '')) j += 1;
    let depth = 0;
    const body: string[] = [];
    for (let k = j; k < lines.length; k += 1) {
      const line = lines[k] ?? '';
      const opens = (line.match(/\{/g) ?? []).length;
      const closes = (line.match(/\}/g) ?? []).length;
      if (k > j) body.push(line);
      depth += opens - closes;
      if (depth <= 0 && k > j) break;
    }
    out.set(head[1] as string, body);
  }
  return out;
}

/** The names of components in `source` that call a hook after an early return. */
export function hooksAfterReturn(source: string): string[] {
  const offenders: string[] = [];
  for (const [name, body] of componentBodies(source)) {
    let depth = 0;
    let returned = false;
    for (const line of body) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
      const opens = (line.match(/\{/g) ?? []).length;
      const closes = (line.match(/\}/g) ?? []).length;
      const atTop = depth === 0;
      if (atTop && /^\s*(if \(.*\) )?return\b/.test(line) && !/^\s*return \($/.test(line)) returned = true;
      if (atTop && returned && /\buse[A-Z]\w*\(/.test(line)) offenders.push(name);
      depth += opens - closes;
    }
  }
  return [...new Set(offenders)];
}

const SHIPPED = `
export function Reading({ repoKey }: { repoKey: string | null }): React.JSX.Element | null {
  const entry = useArch((s) => s.maps[repoKey]);
  const model = entry?.model ?? null;
  if (repoKey === null || model === null) return null;
  const inspectBox = useArch((s) => s.inspectBox);
  return <Face model={model} />;
}
`;

const REPAIRED = `
export function Reading({ repoKey }: { repoKey: string | null }): React.JSX.Element | null {
  const entry = useArch((s) => s.maps[repoKey]);
  const inspectBox = useArch((s) => s.inspectBox);
  const model = entry?.model ?? null;
  if (repoKey === null || model === null) return null;
  const onOpen = () => {
    if (model === null) return;
    useArch.getState().inspectBox(repoKey, 'x');
  };
  return <Face model={model} onOpen={onOpen} />;
}
`;

describe('no hook after an early return in the Architecture pane', () => {
  it('the scanner catches the shape that shipped and passes the repaired one', () => {
    expect(hooksAfterReturn(SHIPPED)).toEqual(['Reading']);
    expect(hooksAfterReturn(REPAIRED)).toEqual([]);
  });

  it('every component under src/renderer/arch calls its hooks before any return', () => {
    const files = walk(ROOT);
    expect(files.length).toBeGreaterThan(10);
    const findings: string[] = [];
    for (const file of files) {
      for (const name of hooksAfterReturn(readFileSync(file, 'utf8'))) {
        findings.push(`${file.slice(ROOT.length + 1)}: ${name}`);
      }
    }
    expect(findings).toEqual([]);
  });
});
