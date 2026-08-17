/**
 * The extracted sealed record layer, and the one property the extraction was
 * for.
 *
 * Phase 68 moved `ConfirmRecord`, the parse, the seal lines, the read and the
 * write out of `../../config/confirm.ts` into `../../config/confirm-record.ts`,
 * so two gates share one file. The risk of a move like that is not that the
 * functions stop working. It is that the two key spaces start to interfere,
 * that a write by one gate drops the other gate's rows, or that the seal text
 * changed shape and every confirmation on every machine quietly stopped
 * counting.
 *
 * So the tests below are about the file rather than about either gate: two
 * kinds of row in one file, a write from each side, and a seal that cannot be
 * opened.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';
let keystore = true;

const MARKER = '\u0000tortie-test-key\u0000';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true },
  safeStorage: {
    isEncryptionAvailable: () => keystore,
    encryptString: (text: string) => Buffer.from(`${MARKER}${text}`, 'utf8'),
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

const { confirmPath, readConfirmRecords, writeConfirmRecords } = await import(
  '../../config/confirm-record'
);
const {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  confirmMachine,
  describeMachine,
  machineRowStatus,
  MACHINE_EXECUTION_HASH_ALGORITHM
} = await import('../confirm');
const {
  CONFIG_CONFIRM_ACKNOWLEDGEMENT,
  CONFIG_EXECUTION_HASH_ALGORITHM,
  EMPTY_EXECUTION_FIELDS,
  configRowStatus,
  confirmConfigRow,
  describeExecution
} = await import('../../config/confirm');

const MACHINE = {
  host: 'box.example',
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux'
};

const AGENT = {
  ...EMPTY_EXECUTION_FIELDS,
  launchable: true,
  binaries: ['box'],
  launchArgv: ['box']
};

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-confirm-record-'));
  mkdirSync(join(userData, 'gmux'), { recursive: true });
  keystore = true;
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

function confirmTheMachine(id: string): void {
  const sheet = describeMachine(id, MACHINE);
  confirmMachine(id, MACHINE, {
    acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
    hashRead: sheet.hash,
    linesRead: sheet.lines
  });
}

function confirmTheAgent(id: string): void {
  const sheet = describeExecution(id, AGENT);
  confirmConfigRow(id, AGENT, {
    acknowledgement: CONFIG_CONFIRM_ACKNOWLEDGEMENT,
    hashRead: sheet.hash,
    linesRead: sheet.lines
  });
}

describe('one file, two key spaces', () => {
  it('holds a machine record and an agent record with the same bare id', () => {
    confirmTheAgent('box');
    confirmTheMachine('box');
    const file = JSON.parse(readFileSync(confirmPath(), 'utf8')) as {
      confirmations: Record<string, unknown>;
    };
    expect(Object.keys(file.confirmations).sort()).toEqual(['box', 'machine:box']);
  });

  it('leaves the agent record alone when the machine is confirmed second', () => {
    confirmTheAgent('box');
    confirmTheMachine('box');
    expect(configRowStatus('box', AGENT).state).toBe('confirmed');
    expect(machineRowStatus('box', MACHINE).state).toBe('confirmed');
  });

  it('leaves the machine record alone when the agent is confirmed second', () => {
    confirmTheMachine('box');
    confirmTheAgent('box');
    expect(machineRowStatus('box', MACHINE).state).toBe('confirmed');
    expect(configRowStatus('box', AGENT).state).toBe('confirmed');
  });
});

describe('the seal', () => {
  it('drops a row it does not cover and keeps the rows it does', () => {
    confirmTheMachine('box');
    confirmTheAgent('box');
    const path = confirmPath();
    const file = JSON.parse(readFileSync(path, 'utf8')) as {
      confirmations: Record<string, unknown>;
      seal: string;
    };
    file.confirmations['smuggled'] = {
      id: 'smuggled',
      hash: 'a'.repeat(64),
      algorithm: CONFIG_EXECUTION_HASH_ALGORITHM,
      at: Date.now(),
      lines: []
    };
    writeFileSync(path, JSON.stringify(file, null, 2), 'utf8');

    const state = readConfirmRecords(CONFIG_EXECUTION_HASH_ALGORITHM);
    expect(state.sealKnown).toBe(true);
    expect(Object.keys(state.rows).sort()).toEqual(['box', 'machine:box']);
  });

  it('answers sealKnown false and confirms nothing when it cannot be opened', () => {
    confirmTheMachine('box');
    keystore = false;
    const state = readConfirmRecords(MACHINE_EXECUTION_HASH_ALGORITHM);
    expect(state.sealKnown).toBe(false);
    expect(state.rows).toEqual({});
  });

  it('writes nothing when it cannot seal a non empty map', () => {
    keystore = false;
    const written = writeConfirmRecords({
      'machine:box': {
        id: 'machine:box',
        hash: 'b'.repeat(64),
        algorithm: MACHINE_EXECUTION_HASH_ALGORITHM,
        at: 0,
        lines: []
      }
    });
    expect(written).toBe(false);
    expect(() => readFileSync(confirmPath(), 'utf8')).toThrow();
  });
});

describe('the fallback algorithm name', () => {
  it('is the caller’s own, so neither gate owns the other’s name', () => {
    confirmTheMachine('box');
    const path = confirmPath();
    const file = JSON.parse(readFileSync(path, 'utf8')) as {
      confirmations: Record<string, Record<string, unknown>>;
      seal: string;
    };
    // A record written by a build before the field existed.
    const row = file.confirmations['machine:box'];
    expect(row).toBeDefined();
    if (row !== undefined) delete row['algorithm'];
    writeFileSync(path, JSON.stringify(file, null, 2), 'utf8');

    const asMachine = readConfirmRecords(MACHINE_EXECUTION_HASH_ALGORITHM);
    expect(asMachine.rows['machine:box']?.algorithm).toBe(
      MACHINE_EXECUTION_HASH_ALGORITHM
    );
    const asAgent = readConfirmRecords(CONFIG_EXECUTION_HASH_ALGORITHM);
    expect(asAgent.rows['machine:box']?.algorithm).toBe(
      CONFIG_EXECUTION_HASH_ALGORITHM
    );
  });
});

describe('where the record lives', () => {
  it('is a sibling of the configuration directory, never inside it', () => {
    const path = confirmPath();
    expect(path.endsWith('gmux/config-confirmations.json')).toBe(true);
    expect(path).not.toContain('/config/');
  });
});
