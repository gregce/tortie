/**
 * Every main to renderer push, and every renderer to main call, is counted
 * (Phase 163, fix round).
 *
 * The diagnostics report calls its IPC figure "pushes back, counted over the
 * capture window". The first build counted only the two typed senders in
 * src/main/typed-events.ts, and the four raw senders that carry the bulk of
 * the traffic, being terminal bytes and exits, search results and clone
 * progress, went out uncounted. On a profile with a streaming terminal the
 * figure read 1 or 2 while hundreds of chunks crossed.
 *
 * This scan finds every raw WebContents send under src/main and asserts that
 * the line before it is `noteEvent();`. The fix when this fails is never to
 * relabel the figure. It is to add the one branch beside the new sender.
 *
 * The up direction had the mirror defect. The typed registrar in
 * src/main/typed-ipc.ts counts every invoke, but the two raw `ipcMain.on`
 * listeners in src/main/attach/attach-host.ts, keystrokes and the ack the
 * renderer sends for every data chunk, went uncounted: 100 acks crossed and
 * the sample read 0. The second scan finds every raw `ipcMain.on` or
 * `ipcMain.handle` under src/main outside the registrar and asserts the
 * file carries at least one `noteInvoke();` per raw registration.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SRC, relPath, sourceFiles, stripComments } from '../../../shared/__tests__/source-scan';

/** A push to a renderer through the raw Electron primitive. */
const RAW_SEND = /\b(?:sender|webContents|target)\.send\(/;

function uncountedSends(): string[] {
  const offenders: string[] = [];
  for (const file of sourceFiles(join(SRC, 'main'))) {
    if (file.includes('__tests__')) continue;
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, i) => {
      if (!RAW_SEND.test(line)) return;
      let j = i - 1;
      while (j >= 0 && lines[j]!.trim() === '') j -= 1;
      if ((lines[j] ?? '').trim() !== 'noteEvent();') {
        offenders.push(`${relPath(file)}:${String(i + 1)}: ${line.trim()}`);
      }
    });
  }
  return offenders;
}

/** A renderer to main listener registered through the raw primitive. */
const RAW_LISTEN = /\bipcMain\.(?:on|once|handle|handleOnce)\(/;
const NOTE_INVOKE = /\bnoteInvoke\(\);/;

/** The one typed registrar, which counts inside its wrapper. */
const REGISTRAR = 'main/typed-ipc.ts';

function uncountedListeners(): string[] {
  const offenders: string[] = [];
  for (const file of sourceFiles(join(SRC, 'main'))) {
    if (file.includes('__tests__') || relPath(file) === REGISTRAR) continue;
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
    const registrations = lines.filter((l) => RAW_LISTEN.test(l)).length;
    if (registrations === 0) continue;
    const counted = lines.filter((l) => NOTE_INVOKE.test(l)).length;
    if (counted < registrations) {
      offenders.push(
        `${relPath(file)}: ${String(registrations)} raw listeners, ${String(counted)} noteInvoke()`
      );
    }
  }
  return offenders;
}

describe('the IPC sample counts every call up', () => {
  it('finds the raw listeners it is meant to guard', () => {
    let sites = 0;
    for (const file of sourceFiles(join(SRC, 'main'))) {
      if (file.includes('__tests__') || relPath(file) === REGISTRAR) continue;
      for (const line of stripComments(readFileSync(file, 'utf8')).split('\n')) {
        if (RAW_LISTEN.test(line)) sites += 1;
      }
    }
    // Keystrokes and acks in the attach host. A new raw listener lands here
    // on purpose, and the registrar still counts every typed invoke.
    expect(sites).toBeGreaterThanOrEqual(2);
    const registrar = stripComments(
      readFileSync(join(SRC, REGISTRAR), 'utf8')
    );
    expect(NOTE_INVOKE.test(registrar)).toBe(true);
  });

  it('has noteInvoke() inside every file with a raw listener', () => {
    expect(uncountedListeners()).toEqual([]);
  });
});

describe('the IPC sample counts every push', () => {
  it('finds the senders it is meant to guard', () => {
    let sites = 0;
    for (const file of sourceFiles(join(SRC, 'main'))) {
      if (file.includes('__tests__')) continue;
      for (const line of stripComments(readFileSync(file, 'utf8')).split('\n')) {
        if (RAW_SEND.test(line)) sites += 1;
      }
    }
    // The two typed senders plus terminal data, terminal exit, search
    // results and clone progress. A new sender lands here on purpose.
    expect(sites).toBeGreaterThanOrEqual(6);
  });

  it('has noteEvent() on the line before every raw send', () => {
    expect(uncountedSends()).toEqual([]);
  });
});
