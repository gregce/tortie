/**
 * Standing guardrail 1, made executable — "one typed preload bridge".
 *
 * The renderer half of the guardrail held for fifteen phases because there is
 * exactly one `contextBridge.exposeInMainWorld` and everybody could see it.
 * The MAIN half did not, and nothing was watching: by the Phase-15.5
 * re-baseline, `src/main/restore/ipc.ts` had grown a second copy of the typed
 * `handle` wrapper, eighteen handlers were registered with raw `ipc.handle`
 * and a hand-cast payload, and seven of the ten static event channels had no
 * payload type at either end — main sent whatever it liked and the preload
 * asserted whatever it liked.
 *
 * That was fixed in Phase 16. This test is what stops it happening again, and
 * like the keymap guardrail beside it, it is deliberately blunt:
 *
 *   1. Nothing registers an invoke handler except `main/typed-ipc.ts`.
 *   2. Nothing sends a static event except `main/typed-events.ts`.
 *   3. Nothing subscribes to a static event except the preload's `on()`.
 *   4. Every declared `EVT_*` channel has a payload in `AllEventPayloadMap`.
 *   5. Every channel in `AllEventPayloadMap` is subscribed by the preload.
 *
 * (4) and (5) together are the event-half analogue of the invoke-half channel
 * closure: a channel main can push that no renderer listens to is dead weight;
 * a channel the renderer listens to that main cannot push is a feature that
 * silently never fires.
 *
 * The fix when this fails is never to widen an allow-list. It is to route the
 * new call through `handle` / `sendEvent` / `broadcastEvent` / `on`, and to
 * give the channel a payload entry in src/shared/ipc/.
 *
 * TEMPLATE channels are out of scope by construction, and the exemptions
 * below are exactly those: `term:data:<id>`, `term:exit:<id>`,
 * `term:input:<id>` and `search:results:<id>` compute their channel name per
 * session or per search, so there is no key a payload map could hold and no
 * static subscription to close. Each exemption names its mechanism.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// The scanner this guardrail shares with keymap-single-source.test.ts.
import { SRC, relPath as rel, sourceFiles, stripComments } from './source-scan';

/**
 * Files allowed to touch the raw Electron IPC primitives, and why. Every
 * entry describes a MECHANISM — which is the test for whether a new one
 * belongs.
 */
const RAW_IPC_ALLOWED: Readonly<Record<string, string>> = {
  'main/typed-ipc.ts': 'THE typed ipcMain.handle wrapper',
  'main/typed-events.ts': 'THE typed main→renderer event senders',
  'preload/bridge.ts': 'THE bridge: the one typed invoke and the one typed on',
  'main/attach/attach-host.ts':
    'per-session TEMPLATE channels (term:data/exit) — computed names',
  'main/search/ipc.ts':
    'per-search TEMPLATE channel (search:results:<id>) — computed name'
};

function scan(pattern: RegExp): string[] {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const name = rel(file);
    if (RAW_IPC_ALLOWED[name] !== undefined) continue;
    stripComments(readFileSync(file, 'utf8'))
      .split('\n')
      .forEach((line, i) => {
        if (pattern.test(line)) offenders.push(`${name}:${i + 1}: ${line.trim()}`);
      });
  }
  return offenders;
}

// Phase 42 stage 2 split both single files by domain. The contract's names
// and the preload's subscriptions are unchanged; the scans below now read the
// whole directory each lived in, concatenated, instead of one file.
const IPC_SOURCE = sourceFiles(join(SRC, 'shared', 'ipc'))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');
const PRELOAD_SOURCE = sourceFiles(join(SRC, 'preload'))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

/**
 * Resolve `AllEventPayloadMap` to its channel names by following the one
 * intersection and reading the string keys out of each member interface.
 */
function staticEventChannels(): Set<string> {
  const alias = /export type AllEventPayloadMap =([\s\S]*?);/.exec(IPC_SOURCE);
  expect(alias, 'AllEventPayloadMap must exist').not.toBeNull();
  const members = (alias?.[1] ?? '').match(/\b\w*EventPayloadMap\b/g) ?? [];
  expect(members.length).toBeGreaterThan(0);
  const channels = new Set<string>();
  for (const member of members) {
    const body = new RegExp(
      `export interface ${member} \\{([\\s\\S]*?)\\n\\}`
    ).exec(IPC_SOURCE);
    expect(body, `${member} must be an interface in shared/ipc/`).not.toBeNull();
    for (const key of (body?.[1] ?? '').matchAll(/^\s*'([^']+)':/gm)) {
      channels.add(key[1] as string);
    }
  }
  return channels;
}

/** `export const EVT_X = 'channel' as const;` → channel name. */
function declaredEventConstants(): Map<string, string> {
  const found = new Map<string, string>();
  for (const m of IPC_SOURCE.matchAll(
    /export const (EVT_\w+) = '([^']+)' as const;/g
  )) {
    found.set(m[1] as string, m[2] as string);
  }
  return found;
}

describe('guardrail 1 — one typed bridge, both directions', () => {
  it('registers every invoke handler through main/typed-ipc.ts', () => {
    expect(scan(/\b(?:ipcMain|ipc)\.handle\s*\(/)).toEqual([]);
  });

  it('sends every static event through main/typed-events.ts', () => {
    // A raw send of a NAMED channel constant. Template-channel sends live in
    // the two allow-listed hosts above.
    expect(scan(/\.send\(\s*EVT_/)).toEqual([]);
  });

  it('subscribes to renderer-side IPC only in the preload', () => {
    expect(scan(/\bipcRenderer\b/)).toEqual([]);
  });

  it('gives every declared EVT_* channel a payload type', () => {
    const channels = staticEventChannels();
    const missing = [...declaredEventConstants()]
      .filter(([, channel]) => !channels.has(channel))
      .map(([name, channel]) => `${name} ('${channel}')`);
    expect(missing).toEqual([]);
  });

  it('closes the event half — the preload subscribes to every channel', () => {
    const channels = staticEventChannels();
    const constants = declaredEventConstants();
    // Preload subscribes by constant, never by literal: `on(EVT_X, cb)`.
    const subscribed = new Set(
      [...PRELOAD_SOURCE.matchAll(/\bon\((EVT_\w+)[,)]/g)].flatMap((m) => {
        const channel = constants.get(m[1] as string);
        return channel === undefined ? [] : [channel];
      })
    );
    const orphans = [...channels].filter((c) => !subscribed.has(c)).sort();
    expect(orphans).toEqual([]);
  });

  it('keeps the allow-list honest — every entry still exists', () => {
    const present = new Set(sourceFiles(SRC).map(rel));
    for (const name of Object.keys(RAW_IPC_ALLOWED)) {
      expect(present.has(name), `${name} is allow-listed but gone`).toBe(true);
    }
  });
});
