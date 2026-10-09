/**
 * What Tortie knows about one machine's tmux in this run (Phase 342,
 * build/p342/SPEC.md D3, D24, D25), and who may ask it.
 *
 * `../far-tmux.ts` holds two facts in memory: the version the machine's SERVER
 * last reported, and the verdict of the one program read Prepare makes beside a
 * warm server whose row carries `programs`. The verdict is KEYED BY THE SERVER
 * VERSION it was read against, so a refusal stops counting the moment any read
 * notes another server version, which is what the first read after the far
 * machine restarts does, and nothing has to clear it.
 *
 * The first half drives the leaf. The second reads the tree for the rules the
 * leaf's answers rest on: it imports only the version table and the error door,
 * the attach, the create and the restore ask it and nothing else does, and its
 * memory goes wherever the row's other memory goes. Nothing here runs a
 * command.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { GmuxError } from '../../errors';
import {
  MACHINE_TMUX_UPDATED_HEADLINE,
  assertFarPairUsable,
  farPairBlocksLive,
  farPairOf,
  farPairRefusal,
  farServerRow,
  farServerVersion,
  forgetFarTmux,
  noteFarPair,
  noteFarServerVersion,
  resetFarTmuxForTests
} from '../far-tmux';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', '..');

/** A file under src/, read whole. */
function source(rel: string): string {
  return readFileSync(join(SRC, rel), 'utf8');
}

/**
 * `text` with its comments taken out, by a walk that knows a string from a
 * comment, so a name in the prose that explains a call is not read as one.
 */
function codeOf(text: string): string {
  let out = '';
  let quote: string | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charAt(i);
    const next = text.charAt(i + 1);
    if (quote !== null) {
      out += c;
      if (c === '\\') {
        out += next;
        i += 1;
      } else if (c === quote) {
        quote = null;
      }
      continue;
    }
    if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
      continue;
    }
    if (c === '/' && next === '/') {
      const end = text.indexOf('\n', i);
      i = end === -1 ? text.length : end - 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    out += c;
  }
  return out;
}

beforeEach(() => {
  resetFarTmuxForTests();
});

describe('the server version', () => {
  it('is remembered per machine, and a read that named none changes nothing', () => {
    expect(farServerVersion('studio')).toBeNull();
    noteFarServerVersion('studio', '3.4');
    noteFarServerVersion('attic', '3.7c');
    expect(farServerVersion('studio')).toBe('3.4');
    noteFarServerVersion('studio', null);
    noteFarServerVersion('studio', '');
    expect(farServerVersion('studio')).toBe('3.4');
    expect(farServerVersion('attic')).toBe('3.7c');
  });

  it('answers the measured row for it, with that row\'s quirks, or null', () => {
    noteFarServerVersion('studio', '3.4');
    expect(farServerRow('studio')?.version).toBe('3.4');
    expect(farServerRow('studio')?.quirks).toEqual({ dollarOnRead: true });
    noteFarServerVersion('studio', '3.2a');
    expect(farServerRow('studio')?.quirks).toEqual({ joinedCapturePads: true });
    noteFarServerVersion('studio', '3.9z');
    expect(farServerRow('studio')).toBeNull();
    expect(farServerRow('nobody')).toBeNull();
  });
});

describe('the pair verdict, keyed by the server it was read against', () => {
  it('records the four verdicts', () => {
    noteFarServerVersion('a', '3.7c');
    noteFarPair('a', '3.7c', '3.8');
    expect(farPairOf('a')?.kind).toBe('server-only');
    noteFarServerVersion('b', '3.3a');
    noteFarPair('b', '3.3a', '3.5a');
    expect(farPairOf('b')?.kind).toBe('measured');
    noteFarServerVersion('c', '3.5a');
    noteFarPair('c', '3.5a', '3.6b');
    expect(farPairOf('c')).toEqual({ server: '3.5a', program: '3.6b', kind: 'refused' });
    noteFarServerVersion('d', '3.4');
    noteFarPair('d', '3.4', null);
    expect(farPairOf('d')).toEqual({ server: '3.4', program: null, kind: 'unreadable' });
  });

  it('refuses while the remembered server is the one it was read against, and stops once a read notes another', () => {
    noteFarServerVersion('studio', '3.5a');
    noteFarPair('studio', '3.5a', '3.6b');
    expect(farPairRefusal('studio')).toBe(MACHINE_TMUX_UPDATED_HEADLINE);
    expect(farPairBlocksLive('studio')).toBe(true);
    // The far machine restarted, and the first read names the new server.
    noteFarServerVersion('studio', '3.6b');
    expect(farPairOf('studio')).toBeNull();
    expect(farPairRefusal('studio')).toBeNull();
    expect(farPairBlocksLive('studio')).toBe(false);
    expect(() => assertFarPairUsable('studio')).not.toThrow();
  });

  it('answers nothing for a verdict recorded against a server version that was never the remembered one', () => {
    noteFarServerVersion('studio', '3.6b');
    noteFarPair('studio', '3.5a', '3.6b');
    expect(farPairRefusal('studio')).toBeNull();
    expect(() => assertFarPairUsable('studio')).not.toThrow();
  });

  it('refuses the live connection and NOT the attach for a program that named no version', () => {
    noteFarServerVersion('studio', '3.2a');
    noteFarPair('studio', '3.2a', null);
    expect(farPairBlocksLive('studio')).toBe(true);
    expect(farPairRefusal('studio')).toBeNull();
    expect(() => assertFarPairUsable('studio')).not.toThrow();
  });

  it('a later verdict about the same server replaces the earlier one, which is what clears a refusal', () => {
    noteFarServerVersion('studio', '3.5a');
    noteFarPair('studio', '3.5a', '3.6b');
    noteFarPair('studio', '3.5a', '3.5a');
    expect(farPairOf('studio')?.kind).toBe('measured');
    expect(farPairRefusal('studio')).toBeNull();
  });

  it('refuses an attach, a create and a restore with the pair\'s first line, synchronously', () => {
    noteFarServerVersion('studio', '3.5a');
    noteFarPair('studio', '3.5a', '3.6b');
    let thrown: unknown = null;
    try {
      assertFarPairUsable('studio');
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(GmuxError);
    expect((thrown as GmuxError).payload.code).toBe('INVALID_INPUT');
    expect((thrown as GmuxError).payload.message).toBe(MACHINE_TMUX_UPDATED_HEADLINE);
    expect((thrown as GmuxError).payload.detail).toContain('3.5a');
    expect((thrown as GmuxError).payload.detail).toContain('3.6b');
    // Another machine is not refused.
    expect(() => assertFarPairUsable('attic')).not.toThrow();
  });

  it('can only refuse: a machine nothing was read about refuses nothing', () => {
    expect(farPairOf('studio')).toBeNull();
    expect(farPairRefusal('studio')).toBeNull();
    expect(farPairBlocksLive('studio')).toBe(false);
    expect(() => assertFarPairUsable('studio')).not.toThrow();
  });

  it('forgets both facts about one machine, and only that machine', () => {
    for (const id of ['studio', 'attic']) {
      noteFarServerVersion(id, '3.5a');
      noteFarPair(id, '3.5a', '3.6b');
    }
    forgetFarTmux('studio');
    expect(farServerVersion('studio')).toBeNull();
    expect(farPairOf('studio')).toBeNull();
    expect(farPairRefusal('attic')).toBe(MACHINE_TMUX_UPDATED_HEADLINE);
  });

  it('says the pair sentence\'s first line, which names no command and never "could not reach"', () => {
    expect(MACHINE_TMUX_UPDATED_HEADLINE).toBe(
      "This machine's tmux was updated while its sessions kept running."
    );
    expect(MACHINE_TMUX_UPDATED_HEADLINE.toLowerCase()).not.toContain('could not reach');
  });
});

/**
 * PHASE 342'S SECOND FIX ROUND. A program this run saw say one version and
 * start a server that runs as another: the same program read again beside
 * that server is said as sentence (4)'s line, never as an update, because a
 * program that lies was not updated and a restart changes nothing.
 */
describe('a program this run saw lie about its version (the second fix round)', () => {
  const DISAGREES = "This machine's tmux is not the version it says.";

  it('says sentence (4) of the same program beside the server it started', async () => {
    const leaf = await import('../far-tmux');
    noteFarServerVersion('m', '3.2a');
    leaf.noteFarDisagreement('m', '3.7c', '3.2a');
    noteFarPair('m', '3.2a', '3.7c');
    expect(leaf.MACHINE_TMUX_DISAGREES_HEADLINE).toBe(DISAGREES);
    expect(leaf.farPairIsDisagreement('m')).toBe(true);
    expect(farPairRefusal('m')).toBe(DISAGREES);
    expect(() => assertFarPairUsable('m')).toThrow(DISAGREES);
  });

  it('says the update line of ANOTHER program beside that server, and stops once the server restarts', async () => {
    const leaf = await import('../far-tmux');
    noteFarServerVersion('m', '3.2a');
    leaf.noteFarDisagreement('m', '3.7c', '3.2a');
    noteFarPair('m', '3.2a', '3.6b');
    expect(farPairRefusal('m')).toBe(MACHINE_TMUX_UPDATED_HEADLINE);
    noteFarPair('m', '3.2a', '3.7c');
    noteFarServerVersion('m', '3.6');
    expect(leaf.farDisagreementOf('m')).toBeNull();
    expect(farPairRefusal('m')).toBeNull();
  });

  it('a server that agrees with its program clears it, and so does a forget', async () => {
    const leaf = await import('../far-tmux');
    noteFarServerVersion('m', '3.2a');
    leaf.noteFarDisagreement('m', '3.7c', '3.2a');
    leaf.noteFarDisagreement('m', '3.2a', '3.2a');
    expect(leaf.farDisagreementOf('m')).toBeNull();
    leaf.noteFarDisagreement('m', '3.7c', '3.2a');
    forgetFarTmux('m');
    expect(leaf.farDisagreementOf('m')).toBeNull();
  });
});

describe('the rules the leaf rests on, read from the tree', () => {
  it('imports only the version table and the error door', () => {
    const imports = [...codeOf(source('main/machines/far-tmux.ts')).matchAll(
      /\bfrom\s+'([^']+)'/g
    )].map((m) => m[1]);
    expect(imports.sort()).toEqual(['../errors', '../tmux/version']);
  });

  it('is asked by the attach, the create and the restore, and by nothing else', () => {
    const askers: string[] = [];
    for (const rel of [
      'main/sessions/core.ts',
      'main/machines/remote-sessions.ts',
      'main/machines/remote-restore.ts',
      'main/machines/ready-context.ts',
      'main/machines/control-plane.ts',
      'main/machines/prepare.ts',
      'main/machines/remote-server.ts',
      'main/machines/ipc.ts'
    ]) {
      const code = codeOf(source(rel));
      const calls = code.split('assertFarPairUsable(').length - 1;
      for (let n = 0; n < calls; n += 1) askers.push(rel);
    }
    expect(askers).toEqual([
      'main/sessions/core.ts',
      'main/machines/remote-sessions.ts',
      'main/machines/remote-restore.ts'
    ]);
  });

  it('is asked in attachListedRemote after its context, before the spawn, with nothing awaited between', () => {
    const core = codeOf(source('main/sessions/core.ts'));
    const start = core.indexOf('private attachListedRemote(');
    const body = core.slice(start, core.indexOf('\n  }\n', start));
    const ready = body.indexOf('readyRemoteContext(remote.machineId)');
    const ask = body.indexOf('assertFarPairUsable(remote.machineId)');
    const spawn = body.indexOf('this.attachHost.attach(');
    expect(ready).toBeGreaterThan(-1);
    expect(ask).toBeGreaterThan(ready);
    expect(spawn).toBeGreaterThan(ask);
    expect(body.slice(ask, spawn)).not.toMatch(/\bawait\b/);
  });

  it('is asked in the restore after its ensureRemoteServer, whose re-read can clear it', () => {
    const restore = codeOf(source('main/machines/remote-restore.ts'));
    const boot = restore.indexOf('await ensureRemoteServer(ctx)');
    const ask = restore.indexOf('assertFarPairUsable(machineId)');
    expect(boot).toBeGreaterThan(-1);
    expect(ask).toBeGreaterThan(boot);
  });

  it('goes with the row\'s other memory: beside forgetRowFacts on a confirm of changed details and on remove', () => {
    for (const [rel, arg] of [
      ['main/machines/ipc.ts', 'row.id'],
      ['main/machines/removal.ts', 'machineId']
    ] as const) {
      const code = codeOf(source(rel));
      expect(code).toContain(`forgetRowFacts(${arg});\n`);
      const facts = code.indexOf(`forgetRowFacts(${arg});`);
      const tmux = code.indexOf(`forgetFarTmux(${arg});`);
      expect(tmux, rel).toBeGreaterThan(facts);
      // Beside it: nothing but whitespace between the two calls.
      expect(code.slice(facts + `forgetRowFacts(${arg});`.length, tmux).trim(), rel).toBe('');
    }
  });

  it('is written by the reads that name a server version, and read in Prepare alone for the program', () => {
    // The program's own -V is read in ONE place, prepare.ts's reader, and the
    // live connection's module names neither that reader nor the shell door.
    const plane = codeOf(source('main/machines/control-plane.ts'));
    expect(plane).not.toMatch(/\bexecRemoteShell\b/);
    expect(plane).not.toMatch(/\breadRemoteProgramVersion\b/);
    expect(plane).toMatch(/\bnoteFarServerVersion\(machineId, version\)/);
    const prepare = codeOf(source('main/machines/prepare.ts'));
    expect(prepare.split('execRemoteShell(').length - 1).toBe(1);
    expect(prepare.split('readRemoteProgramVersion(ctx)').length - 1).toBe(2);
  });
});

/**
 * PHASE 342'S FIX ROUND (major 1). A setting Tortie cannot do without that the
 * server would not keep is recorded here by the set-up, KEYED BY THE SERVER
 * VERSION it was met on, as the pair is, and a create asks it synchronously
 * before its create line, because the set-up captured the PATH before it
 * wrote the options and a create that carries no names never runs the set-up
 * again. An attach never asks it.
 */
describe('a setting Tortie cannot do without, refused (the fix round)', () => {
  const SENTENCE =
    "tmux 3.7c would not keep a session's screen when its program fails, so Tortie will not start sessions there.";

  it('refuses a create with sentence (1) while the server it was met on is the one this run last noted', async () => {
    const leaf = await import('../far-tmux');
    noteFarServerVersion('m', '3.7c');
    leaf.noteFarSettingsRefused('m', { server: '3.7c', name: 'remain-on-exit', sentence: SENTENCE });
    expect(leaf.farSettingsRefusal('m')?.name).toBe('remain-on-exit');
    let thrown: unknown = null;
    try {
      leaf.assertFarSettingsHeld('m');
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(GmuxError);
    expect((thrown as GmuxError).payload.code).toBe('INVALID_INPUT');
    expect((thrown as GmuxError).payload.message).toBe(SENTENCE);
  });

  it('stops counting the moment a read notes another server version, and a set-up that holds every row clears it', async () => {
    const leaf = await import('../far-tmux');
    noteFarServerVersion('m', '3.7c');
    leaf.noteFarSettingsRefused('m', { server: '3.7c', name: 'mouse', sentence: SENTENCE });
    noteFarServerVersion('m', '3.7d');
    expect(leaf.farSettingsRefusal('m')).toBeNull();
    expect(() => leaf.assertFarSettingsHeld('m')).not.toThrow();
    noteFarServerVersion('m', '3.7c');
    expect(leaf.farSettingsRefusal('m')?.name).toBe('mouse');
    leaf.noteFarSettingsHeld('m');
    expect(leaf.farSettingsRefusal('m')).toBeNull();
  });

  it('a refusal met while no read had named a version counts until a set-up clears it', async () => {
    const leaf = await import('../far-tmux');
    leaf.noteFarSettingsRefused('m', { server: null, name: 'exit-empty', sentence: SENTENCE });
    noteFarServerVersion('m', '3.6a');
    expect(leaf.farSettingsRefusal('m')?.name).toBe('exit-empty');
    leaf.noteFarSettingsHeld('m');
    expect(() => leaf.assertFarSettingsHeld('m')).not.toThrow();
  });

  it('goes with the row’s other memory, one machine at a time', async () => {
    const leaf = await import('../far-tmux');
    leaf.noteFarSettingsRefused('m', { server: null, name: 'mouse', sentence: SENTENCE });
    leaf.noteFarSettingsRefused('n', { server: null, name: 'mouse', sentence: SENTENCE });
    forgetFarTmux('m');
    expect(leaf.farSettingsRefusal('m')).toBeNull();
    expect(leaf.farSettingsRefusal('n')?.name).toBe('mouse');
  });

  it('is asked by the create beside the pair, after its set-up and before its create line, and never by the attach', () => {
    const sessions = codeOf(source('main/machines/remote-sessions.ts'));
    const create = sessions.slice(sessions.indexOf('export async function remoteCreate('));
    const pair = create.indexOf('assertFarPairUsable(input.machineId)');
    const held = create.indexOf('assertFarSettingsHeld(input.machineId)');
    const line = create.indexOf('remoteCreateArgs(');
    expect(pair).toBeGreaterThan(-1);
    expect(held).toBeGreaterThan(pair);
    expect(line).toBeGreaterThan(held);
    expect(create.slice(held, line)).not.toMatch(/\bawait\b/);
    expect(codeOf(source('main/sessions/core.ts'))).not.toContain('assertFarSettingsHeld');
    expect(codeOf(source('main/machines/remote-restore.ts'))).not.toContain('assertFarSettingsHeld');
  });

  it('the set-up records a required refusal before it throws, and clears it when every row is held', () => {
    const server = codeOf(source('main/machines/remote-server.ts'));
    const refuse = server.slice(server.indexOf('function refuseRequired('));
    expect(refuse.indexOf('noteFarSettingsRefused(')).toBeGreaterThan(-1);
    expect(refuse.indexOf('noteFarSettingsRefused(')).toBeLessThan(refuse.indexOf('throw err;'));
    expect(server).toContain('noteFarSettingsHeld(ctx.machineId);');
  });
});
