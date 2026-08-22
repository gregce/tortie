/**
 * The invoke half of the bridge closes. Phase 121, from phase 3 of the
 * architecture audit.
 *
 * Three sets exist and, before this file, nothing checked that they are one
 * set:
 *
 *   src/shared/ipc/              src/preload/            src/main/
 *   GmuxInvokeChannelMap   <->   invoke('<channel>' <->  handle([ipc, ]'<channel>'
 *   the DECLARED set             the PRELOAD set         the MAIN set
 *
 * Each gap is a different failure that nothing else catches:
 *
 *   1. Declared with no preload call is a contract line no renderer can reach.
 *   2. A preload call with no declaration is a call with no types on it.
 *   3. Declared with no main handler is a call that rejects at runtime.
 *   4. A main handler with no declaration is code no typed caller can name.
 *   5. A channel registered twice in main is a handler silently replaced by a
 *      later one, because ipcMain.handle keeps the last registration.
 *
 * `ipc-single-bridge.test.ts` beside this one closes the EVENT half the same
 * way and proves that only one module registers and only one subscribes. It
 * never compares the three invoke sets, so this file is not a duplicate of it
 * and neither replaces the other.
 *
 * `node build/contract-inventory.mjs --check` is also not this. That check
 * compares the DECLARED list against a baseline file so a channel cannot be
 * added or renamed unnoticed. It never opens the preload and never opens main.
 * The two checks stay separate and neither is folded into the other.
 *
 * PHASE 125 CHANGED HOW THE DECLARED SET IS FOUND, and nothing about what is
 * checked. `GmuxInvokeChannelMap` used to name interfaces only. It now names
 * `MachinesInvokeChannelMap`, which is itself an intersection of nine domain
 * interfaces, so the walk below follows an alias to an alias.
 *
 * WHEN THIS FAILS, the fix is never to widen an allow list. There is no allow
 * list here on purpose. The fix is to declare the channel in its domain file
 * under src/shared/ipc/, call it exactly once from src/preload/, and register
 * it exactly once in src/main/.
 *
 * Measured when this file was written: 174 declared, 174 in the preload, 174
 * in main, 46 members of the intersection and no orphan map.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// The scanner shared with ipc-single-bridge.test.ts and keymap-single-source.
import { SRC, sourceFiles, stripComments } from './source-scan';

/**
 * Every production source under `SRC/<dir>`, comments blanked, joined.
 *
 * Comments are stripped first so a channel name written in a doc comment is
 * never counted as a declaration, a call or a registration. `sourceFiles`
 * skips `__tests__`, so this file never scans itself.
 */
function sourceOf(...dir: string[]): string {
  return sourceFiles(join(SRC, ...dir))
    .map((file) => stripComments(readFileSync(file, 'utf8')))
    .join('\n');
}

const IPC_SOURCE = sourceOf('shared', 'ipc');
const PRELOAD_SOURCE = sourceOf('preload');
const MAIN_SOURCE = sourceOf('main');

/**
 * The channel-map names one `export type X = A & B;` alias joins, or null when
 * no alias of that name exists.
 */
function aliasMembers(name: string): string[] | null {
  const alias = new RegExp(`export type ${name} =([\\s\\S]*?);`).exec(IPC_SOURCE);
  if (alias === null) return null;
  return (alias[1] ?? '').match(/\b[A-Z]\w*ChannelMap\b/g) ?? [];
}

/**
 * Every channel-map INTERFACE `GmuxInvokeChannelMap` reaches, following an
 * alias that names another alias.
 *
 * It used to read one level, because every member was an interface. Phase 125
 * split the machines contract into nine domain files, so
 * `MachinesInvokeChannelMap` is an intersection of nine interfaces rather than
 * one interface with thirty seven keys. This walk is the same rule at any
 * depth, so a later domain split needs no edit here. An alias that names
 * itself is stopped by `seen`.
 */
function intersectionMembers(): string[] {
  const top = aliasMembers('GmuxInvokeChannelMap');
  expect(top, 'GmuxInvokeChannelMap must exist').not.toBeNull();
  const leaves: string[] = [];
  const seen = new Set<string>();
  const queue = [...(top ?? [])];
  while (queue.length > 0) {
    const name = queue.shift() as string;
    if (seen.has(name)) continue;
    seen.add(name);
    const nested = aliasMembers(name);
    if (nested === null) leaves.push(name);
    else queue.push(...nested);
  }
  return leaves;
}

/** Every `'<channel>':` key on one interface, or null when it is not there. */
function channelsOfInterface(name: string): string[] | null {
  const body = new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`).exec(
    IPC_SOURCE
  );
  if (body === null) return null;
  return [...(body[1] ?? '').matchAll(/^\s*'([^']+)':/gm)].map(
    (m) => m[1] as string
  );
}

/**
 * The DECLARED set, resolved through the one intersection.
 *
 * It follows the intersection rather than sweeping every `*ChannelMap` in the
 * directory, so a map that is declared and never joined is NOT counted as
 * declared. Assertion 2 below is what catches that case instead. This is the
 * technique `staticEventChannels()` in ipc-single-bridge.test.ts already uses
 * for the event half.
 */
function declaredChannels(): string[] {
  const out: string[] = [];
  for (const member of intersectionMembers()) {
    out.push(...(channelsOfInterface(member) ?? []));
  }
  return out;
}

/** Every `invoke('<channel>'` in the preload. */
function preloadChannels(): string[] {
  return [...PRELOAD_SOURCE.matchAll(/\binvoke\('([^']+)'/g)].map(
    (m) => m[1] as string
  );
}

/**
 * Every `handle('<channel>'` in main, in both shapes that exist.
 *
 * The domain registrars call `handle(ipcMain, 'x', ...)` and src/main/ipc.ts
 * calls a curried `handle('x', ...)`, so the identifier and its comma are
 * optional. The whitespace is `\s`, not a literal space, because
 * src/main/menu-popup.ts and src/main/context/ipc.ts wrap the argument list
 * onto the next line. It does not match `ipc.handle(channel, ...)` in
 * src/main/typed-ipc.ts or `this.handle(req, res)` in src/main/activity/hooks,
 * because neither is followed by a quoted string.
 */
function mainChannels(): string[] {
  return [
    ...MAIN_SOURCE.matchAll(/\bhandle\(\s*(?:[A-Za-z_$][\w$]*\s*,\s*)?'([^']+)'/g)
  ].map((m) => m[1] as string);
}

/** Everything in `a` that is not in `b`, sorted, so a failure names names. */
function missing(a: readonly string[], b: readonly string[]): string[] {
  const have = new Set(b);
  return [...new Set(a)].filter((one) => !have.has(one)).sort();
}

/** Every name that appears more than once, with its count. */
function duplicates(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  for (const name of names) seen.set(name, (seen.get(name) ?? 0) + 1);
  return [...seen]
    .filter(([, n]) => n > 1)
    .map(([name, n]) => `${name} x${String(n)}`)
    .sort();
}

describe('the invoke half closes', () => {
  it('resolves every member of the intersection to an interface', () => {
    const members = intersectionMembers();
    expect(members.length).toBeGreaterThan(0);
    const unresolved = members.filter(
      (name) => channelsOfInterface(name) === null
    );
    expect(unresolved).toEqual([]);
  });

  it('joins every channel map in shared/ipc into the intersection', () => {
    const members = new Set(intersectionMembers());
    const orphans = [
      ...IPC_SOURCE.matchAll(/export interface ([A-Z]\w*ChannelMap)\s*\{/g)
    ]
      .map((m) => m[1] as string)
      .filter((name) => !members.has(name))
      .sort();
    expect(orphans).toEqual([]);
  });

  it('gives every declared channel a preload call', () => {
    expect(missing(declaredChannels(), preloadChannels())).toEqual([]);
  });

  it('gives every preload call a declaration', () => {
    expect(missing(preloadChannels(), declaredChannels())).toEqual([]);
  });

  it('gives every declared channel a handler in main', () => {
    expect(missing(declaredChannels(), mainChannels())).toEqual([]);
  });

  it('gives every handler in main a declaration', () => {
    expect(missing(mainChannels(), declaredChannels())).toEqual([]);
  });

  it('registers each channel once in main and invokes it once in the preload', () => {
    expect(duplicates(mainChannels())).toEqual([]);
    expect(duplicates(preloadChannels())).toEqual([]);
  });

  it('finds a real number of channels in all three places', () => {
    // A sanity floor, NOT a baseline. It stops a broken extractor that finds
    // nothing from passing by matching three empty sets against each other.
    // The number is never written down and it moves freely as channels are
    // added or removed.
    const declared = new Set(declaredChannels());
    const preload = new Set(preloadChannels());
    const main = new Set(mainChannels());
    expect(declared.size).toBeGreaterThan(100);
    expect(preload.size).toBe(declared.size);
    expect(main.size).toBe(declared.size);
  });
});
