/**
 * drop:* IPC — everything a dropped or pasted file needs from main.
 *
 *   drop:strategies  the per-agent file-reference table, read off the agent
 *                    registry (the table lives ONCE, in src/main/agents/
 *                    registry.ts — this channel just serves it)
 *   drop:prepare     stat + classify the absolute paths the renderer got from
 *                    webUtils: directory vs file, image sniff, newline rescue
 *   drop:persist     write bytes that have no file of their own (⌘V of raw
 *                    image data, browser drags) into the drop store
 *
 * Ownership: src/main/drop/**.
 */

import type { IpcMain } from 'electron';
import type { DropPersistInput } from '@shared/types';
import { imageDropTable } from '../agents/registry';
import { handle } from '../typed-ipc';
import { gmuxError } from '../errors';
import { preparePaths } from './prepare';
import { persistDroppedBytes } from './store';

function toPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function toPersistInput(value: unknown): DropPersistInput {
  const v = value as Partial<DropPersistInput> | undefined;
  const bytes = v?.bytes;
  if (!(bytes instanceof Uint8Array)) {
    throw gmuxError('INVALID_INPUT', 'That drop carried no file data.');
  }
  return {
    name: typeof v?.name === 'string' ? v.name : 'image',
    mime: typeof v?.mime === 'string' ? v.mime : '',
    bytes
  };
}

export function registerDropIpc(ipc: IpcMain): void {
  handle(ipc, 'drop:strategies', () => imageDropTable());
  // The two validators below still take `unknown` on purpose: the declared
  // channel types are a compile-time contract with the preload, not a promise
  // about what an actual IPC frame carries.
  handle(ipc, 'drop:prepare', (_event, paths) => preparePaths(toPaths(paths)));
  handle(ipc, 'drop:persist', (_event, input) =>
    persistDroppedBytes(toPersistInput(input))
  );
}
