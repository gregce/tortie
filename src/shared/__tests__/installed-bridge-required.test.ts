/**
 * Every member of an installed bridge is required. Phase 122, from the second
 * half of phase 3 of the architecture audit.
 *
 * WHY THIS IS TRUE OF THE PRODUCT and not only of the types. There is one
 * preload file, it makes one `contextBridge.exposeInMainWorld('gmux', api)`
 * call, and `api` is one object literal annotated `InstalledGmuxApi`. Electron
 * ships the preload and the renderer in the same asar, so no build exists in
 * which the renderer is new and the preload is old. Either the whole bridge is
 * installed or none of it is.
 *
 * Before this file 93 members of that bridge were declared optional while the
 * bridge itself was declared required, which is the opposite of what a build
 * can produce. Renderer code then wrote a cast to put back what the
 * declaration took away, and each new surface copied the nearest cast it could
 * find. There were 144 of those casts in 57 files.
 *
 * TWO CHECKS LIVE HERE and neither replaces the other:
 *
 *   1. A compile-time fixture. The `Assert<...>` aliases below fail
 *      `npm run typecheck` with TS2344 the moment any member gains a `?`.
 *      They are exported because `noUnusedLocals` reports an unused local type
 *      alias.
 *   2. A source scan, in the style of `ipc-invoke-closure.test.ts` beside
 *      this one. It follows the composition rather than sweeping the
 *      directory, so an interface that is declared and never joined is
 *      correctly not counted, and a failure names the interface and the
 *      member rather than pointing at a type error.
 *
 * The second check catches what the first cannot, which is a NEW surface that
 * nobody wrote a fixture line for.
 *
 * WHAT IS DELIBERATELY NOT HERE. No test asserts that the preload's object
 * literal carries all 93 keys. `npm run typecheck` already proves it, because
 * `src/preload/index.ts` annotates `api` as `InstalledGmuxApi` and a missing
 * required member is a compile error that names the member. A second check
 * would restate the compiler's own answer.
 *
 * TWO INTERFACES ARE CORRECTLY STILL OPTIONAL and a later round must not
 * "finish them off". `GmuxProjectExtras.rename` and `GmuxAppExtras.setBadgeCount`
 * are declared contract that the preload has never installed. Neither is
 * joined into `InstalledGmuxApi`, so neither is scanned here, and making them
 * required would make the installed type a lie in the other direction.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SRC, sourceFiles, stripComments } from './source-scan';
import type {
  InstalledFsApi,
  InstalledGitApi,
  InstalledGmuxApi,
  InstalledProjectsApi,
  InstalledSessionsApi,
  InstalledTermApi
} from '../ipc';

// ---------------------------------------------------------------------------
// 1. The compile-time fixture
// ---------------------------------------------------------------------------

/** The keys of `T` that a caller may leave out. */
type OptionalKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? K : never;
}[keyof T];

/** True when every member of `T` is required. */
type NoOptionalMembers<T> = [OptionalKeys<T>] extends [never] ? true : false;

/** Compiles only when `T` is `true`. A `false` fails with TS2344. */
type Assert<T extends true> = T;

export type BridgeHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi>
>;
export type SessionsHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledSessionsApi>
>;
export type ProjectsHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledProjectsApi>
>;
export type GitHasNoOptionalMembers = Assert<NoOptionalMembers<InstalledGitApi>>;
export type FsHasNoOptionalMembers = Assert<NoOptionalMembers<InstalledFsApi>>;
export type TermHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledTermApi>
>;
export type MachinesHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['machines']>
>;
export type ContextHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['context']>
>;
export type ConfigHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['config']>
>;
export type SearchHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['search']>
>;
export type SymbolsHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['symbols']>
>;
export type QuickOpenHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['quickOpen']>
>;
export type ScrollbackHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['scrollback']>
>;
export type SpecStoryHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['specstory']>
>;
export type RecentsHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['recents']>
>;
export type NoticeHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['notice']>
>;
export type PreviewHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['preview']>
>;
export type DropHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['drop']>
>;
export type CaptureHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['capture']>
>;
export type ScrollHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['scroll']>
>;
export type LogHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['log']>
>;
export type ActionsHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['actions']>
>;
export type UpdatesHasNoOptionalMembers = Assert<
  NoOptionalMembers<InstalledGmuxApi['updates']>
>;

/**
 * A bridge missing one member is not the bridge.
 *
 * This is the direct statement of the finding. It compiles to `true` only
 * while `machines` is required, and it is the assertion a renderer file was
 * really making every time it cast a member back on.
 */
export type OmittingOneMemberIsNotTheBridge = Assert<
  Omit<InstalledGmuxApi, 'machines'> extends InstalledGmuxApi ? false : true
>;

// ---------------------------------------------------------------------------
// 2. The source scan
// ---------------------------------------------------------------------------

/** Every production source under `SRC/shared/ipc`, comments blanked, joined. */
const IPC_SOURCE = sourceFiles(join(SRC, 'shared', 'ipc'))
  .map((file) => stripComments(readFileSync(file, 'utf8')))
  .join('\n');

/**
 * The interface names one `export type <name> = A & B & ...;` joins.
 *
 * The end of the alias is found by walking to the first `;` at brace depth 0,
 * NOT by a lazy regex. `InstalledGmuxApi` contains an inline object literal
 * whose own members end in `;`, and a lazy match stops at the first of those
 * and silently reads a third of the composition.
 */
function joinedInterfaces(alias: string): string[] {
  const head = new RegExp(`export type ${alias} =`).exec(IPC_SOURCE);
  if (head === null) return [];
  let depth = 0;
  let end = head.index + head[0].length;
  for (; end < IPC_SOURCE.length; end += 1) {
    const ch = IPC_SOURCE[end];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === ';' && depth === 0) break;
  }
  const body = IPC_SOURCE.slice(head.index + head[0].length, end);
  return body.match(/\bGmux[A-Z]\w*\b/g) ?? [];
}

/**
 * Every interface an installed surface is built from.
 *
 * It follows the compositions in src/shared/ipc/index.ts rather than sweeping
 * every `*Extras` in the directory. That is what keeps `GmuxProjectExtras` and
 * `GmuxAppExtras` correctly out of the set: both are declared and neither is
 * joined.
 */
function scannedInterfaces(): string[] {
  const aliases = [
    'InstalledGmuxApi',
    'InstalledSessionsApi',
    'InstalledProjectsApi',
    'InstalledGitApi',
    'InstalledFsApi',
    'InstalledTermApi'
  ];
  const out = new Set<string>();
  for (const alias of aliases) {
    for (const name of joinedInterfaces(alias)) out.add(name);
  }
  return [...out].sort();
}

/** The body of one `export interface <name> { ... }`, or null. */
function bodyOf(name: string): string | null {
  const body = new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`).exec(
    IPC_SOURCE
  );
  return body === null ? null : (body[1] ?? '');
}

/**
 * Every member of `name` declared optional, at every nesting level, as
 * `<interface>.<member>`.
 *
 * A MEMBER is matched at the start of a line, which is what leaves an optional
 * PARAMETER alone: `options?: CaptureChoice` inside `restore(` sits on its own
 * line but is preceded by the open paren rather than by an interface brace, so
 * it is excluded by requiring the line to end in a member position (`:`, `(`
 * or `<`) AND the enclosing text to not be an argument list. The two cases in
 * `sessions.ts` are the reason this rule exists.
 */
function optionalMembersOf(name: string): string[] {
  const body = bodyOf(name);
  if (body === null) return [];
  const out: string[] = [];
  let parens = 0;
  for (const line of body.split('\n')) {
    const hit = /^\s+([A-Za-z_$][\w$]*)\?[:(<]/.exec(line);
    if (hit !== null && parens === 0) out.push(`${name}.${hit[1] ?? ''}`);
    parens += (line.match(/\(/g) ?? []).length;
    parens -= (line.match(/\)/g) ?? []).length;
  }
  return out;
}

/**
 * Every member of `name` at every nesting level, optional or not, for the
 * sanity floor. It skips an argument list the same way `optionalMembersOf`
 * does, so a parameter is never counted as a member.
 */
function membersOf(name: string): string[] {
  const body = bodyOf(name);
  if (body === null) return [];
  const out: string[] = [];
  let parens = 0;
  for (const line of body.split('\n')) {
    const hit = /^\s+([A-Za-z_$][\w$]*)\??[:(<]/.exec(line);
    if (hit !== null && parens === 0) out.push(`${name}.${hit[1] ?? ''}`);
    parens += (line.match(/\(/g) ?? []).length;
    parens -= (line.match(/\)/g) ?? []).length;
  }
  return out;
}

describe('an installed bridge has no optional members', () => {
  it('resolves every interface the installed surfaces are built from', () => {
    const names = scannedInterfaces();
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => bodyOf(name) === null)).toEqual([]);
  });

  it('declares every member of every one of them required', () => {
    const offenders = scannedInterfaces().flatMap(optionalMembersOf).sort();
    expect(offenders).toEqual([]);
  });

  it('leaves an optional PARAMETER alone', () => {
    // `restore(sessionId, options?)` and `restart(sessionId, options?)` are
    // the two in the tree. They are arguments, not members, and the check
    // above must not report them. If this ever fails the extractor is wrong,
    // not the contract.
    expect(optionalMembersOf('GmuxSessionRestoreExtras')).toEqual([]);
    expect(optionalMembersOf('GmuxSessionRestartExtras')).toEqual([]);
    expect(bodyOf('GmuxSessionRestoreExtras')).toContain('options?: CaptureChoice');
  });

  it('does not count an interface that is declared and never joined', () => {
    const names = new Set(scannedInterfaces());
    expect(names.has('GmuxProjectExtras')).toBe(false);
    expect(names.has('GmuxAppExtras')).toBe(false);
  });

  it('finds a real number of members', () => {
    // A sanity floor, NOT a baseline. It stops a broken extractor that finds
    // nothing from passing. The number is never written down and it moves
    // freely as members are added or removed.
    const total = scannedInterfaces().flatMap(membersOf).length;
    expect(total).toBeGreaterThan(80);
  });
});
