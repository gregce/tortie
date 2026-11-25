/**
 * The received row's port, for tests (Phase 374). It is a bag of strings and a
 * clock, so no test of this domain needs a folder or Electron.
 */

import type { UsageWaitingFor } from '@shared/usage';
import type { AntigravityFile } from '../antigravity/receive';
import { newestReading } from '../antigravity/receive';
import type { UsageReceiverPort } from '../service';

/** A port that says nothing has arrived, for every test about something else. */
export function noReceiver(): UsageReceiverPort {
  return {
    read: () => null,
    clear: () => undefined,
    opened: () => false,
    waiting: () => 'session',
    mtime: () => null,
    focused: () => true
  };
}

/**
 * A port whose every member throws: what `off` must never reach. The service
 * catches what a folder throws, so a caller that needs to say NOTHING WAS ASKED
 * hands `asked` in and reads that it stayed empty.
 */
export function forbiddenReceiver(asked: string[] = []): UsageReceiverPort {
  const no = (what: string) => (): never => {
    asked.push(what);
    throw new Error(`the received folder was asked to ${what} while off`);
  };
  return {
    read: no('read'),
    clear: no('clear'),
    // Memory alone, and it is asked while off on purpose: it opens nothing.
    opened: () => false,
    waiting: no('say what it waits for'),
    mtime: no('read its time'),
    focused: no('say whether a window is in front')
  };
}

export interface FakeFolder {
  files: AntigravityFile[];
  mtime: number | null;
  focused: boolean;
  waiting: UsageWaitingFor;
  opened: boolean;
  /** Every call, by member, in order. */
  calls: string[];
  port: UsageReceiverPort;
}

/** A folder in memory, with the calls it met. */
export function fakeFolder(now: () => number): FakeFolder {
  const seen = new Map<string, number>();
  const folder: FakeFolder = {
    files: [],
    mtime: null,
    focused: true,
    waiting: 'session',
    opened: false,
    calls: [],
    port: {
      read: () => {
        folder.calls.push('read');
        return newestReading(folder.files, now(), seen);
      },
      clear: () => {
        folder.calls.push('clear');
        folder.files = [];
        folder.mtime = null;
        folder.opened = false;
      },
      opened: () => folder.opened,
      waiting: () => folder.waiting,
      mtime: () => {
        folder.calls.push('mtime');
        return folder.mtime;
      },
      focused: () => folder.focused
    }
  };
  return folder;
}

/** An invented account hash. */
export const HASH_A = 'a'.repeat(64);
export const HASH_B = 'b'.repeat(64);

export interface LineBucket {
  f?: unknown;
  r?: unknown;
  d?: unknown;
  a?: unknown;
}

/** The one line Tortie's script writes, with every value invented by the test. */
export function line(
  q: Record<string, LineBucket>,
  over: Record<string, unknown> = {}
): string {
  const full: Record<string, unknown> = {};
  for (const [id, bucket] of Object.entries(q)) {
    full[id] = { f: null, r: null, d: null, a: false, ...bucket };
  }
  return JSON.stringify({ v: 1, h: HASH_A, p: null, q: full, ...over });
}
