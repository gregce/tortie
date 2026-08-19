/**
 * The boot environment snapshot (Phase 35, research 42 section 9).
 *
 * One boot.env record per boot, under 2 KB. Weird-environment bugs are
 * diagnosed from the versions, the arch, the display scale and the PATH
 * shape, not from the stack trace. PATH stores the ENTRY COUNT only, never
 * the values, because PATH values embed the home directory and the tool
 * inventory. The tmux -V probe is the one spawn in the snapshot (19.1 ms
 * measured); everything else totals under 2 ms.
 *
 * `buildBootEnvFields` is pure so the schema test can assert every field
 * name; `collectBootEnv` is the electron-facing collector and must run
 * after app ready (it reads `screen`).
 */

import { app, screen } from 'electron';
import { cpus, totalmem } from 'node:os';
import { runGuarded } from '../proc/guarded';
import { getTmuxContext } from '../tmux/supervisor';
// LEAF import for the same reason the line above is one: ../tmux re-exports
// the whole layer, and this file needs the one cached login shell capture.
import { getUserPath } from '../tmux/resolve';

export interface BootEnvRaw {
  appVersion: string;
  electronVersion: string;
  packaged: boolean;
  osVersion: string;
  arch: string;
  translated: boolean;
  cpuCount: number;
  memTotalBytes: number;
  displays: { w: number; h: number; scale: number; internal: boolean }[];
  locale: string;
  tmuxVersion: string | null;
  tmuxSocket: string | null;
  pathEntries: number;
}

/** The boot.env record's fields, exactly the research 42 section 9 shape. */
export function buildBootEnvFields(raw: BootEnvRaw): Record<string, unknown> {
  return {
    app: {
      version: raw.appVersion,
      electron: raw.electronVersion,
      packaged: raw.packaged
    },
    os: {
      version: raw.osVersion,
      arch: raw.arch,
      translated: raw.translated,
      cpus: raw.cpuCount,
      memTotalBytes: raw.memTotalBytes
    },
    displays: raw.displays,
    locale: raw.locale,
    tmux: { version: raw.tmuxVersion, socket: raw.tmuxSocket },
    path: { entries: raw.pathEntries }
  };
}

/** How long the one spawn may take before the snapshot goes on without it. */
const TMUX_VERSION_TIMEOUT_MS = 2_000;

/**
 * Collect the raw snapshot from the live process. After app ready only.
 * Never throws: a missing tmux reads as version null, not as a failed boot.
 * Also feeds the Copy diagnostics [boot] section (./diagnostics.ts).
 */
export async function collectBootEnvRaw(): Promise<BootEnvRaw> {
  let tmuxVersion: string | null = null;
  let tmuxSocket: string | null = null;
  try {
    const ctx = getTmuxContext();
    tmuxSocket = ctx.socket;
    const probe = await runGuarded(ctx.bin, ['-V'], {
      timeoutMs: TMUX_VERSION_TIMEOUT_MS
    });
    if (probe.code === 0) tmuxVersion = probe.stdout.trim() || null;
  } catch {
    /* no tmux on this machine — the snapshot says so with null */
  }

  let displays: BootEnvRaw['displays'] = [];
  try {
    displays = screen.getAllDisplays().map((d) => ({
      w: d.size.width,
      h: d.size.height,
      scale: d.scaleFactor,
      internal: d.internal
    }));
  } catch {
    /* headless test shells have no screen */
  }

  // PHASE 81. This used to read process.env['PATH'], which on every healthy
  // boot is the launchd PATH, because the snapshot is collected before the
  // capture lands. Six boots in the operator's log all recorded 4 entries
  // while the capture line in the same file recorded 30, so the one field in
  // this record that exists to diagnose a weird environment was the one field
  // that was never true. `getUserPath()` caches its promise, so this joins the
  // capture the boot already started rather than running a second one.
  //
  // THE ONE COST, stated so it is not discovered later. In a mode where the
  // session core never boots and file logging is on, this starts the login
  // shell probe that nothing else would have started. That is one bounded,
  // tracked, reaped probe, and the record it writes is a record that is true.
  const pathValue = await getUserPath();
  return {
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron ?? 'unknown',
    packaged: app.isPackaged,
    osVersion: process.getSystemVersion(),
    arch: process.arch,
    translated: app.runningUnderARM64Translation,
    cpuCount: cpus().length,
    memTotalBytes: totalmem(),
    displays,
    locale: app.getLocale(),
    tmuxVersion,
    tmuxSocket,
    pathEntries:
      pathValue === '' ? 0 : pathValue.split(':').filter((p) => p !== '').length
  };
}

/** The boot.env record's fields, collected live. After app ready only. */
export async function collectBootEnv(): Promise<Record<string, unknown>> {
  return buildBootEnvFields(await collectBootEnvRaw());
}
