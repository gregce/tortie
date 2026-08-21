/**
 * The machine confirm gate.
 *
 * The tests are written as the adversary rather than as the happy path, because
 * the thing this gate defends against is not a mistake. It is an agent process
 * running as the same user, with write access to the same home directory, that
 * can write `machines.json` and can compute a sha256 as easily as Tortie can.
 * So the cases that matter are: a machine nobody confirmed, a machine whose
 * address moved after the confirmation, a record forged beside a real one, and
 * a record whose seal cannot be read at all.
 *
 * `safeStorage` is faked with a reversible transform that stands in for the
 * keychain. It is not encryption and it is not meant to be. What it models is
 * the one property the gate depends on: Tortie can produce the value and the
 * file's author cannot.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';
let ready = true;
let keystore = true;

const MARKER = '\u0000tortie-test-key\u0000';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => ready },
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

const {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  MACHINE_CONFIRM_ID_PREFIX,
  MACHINE_CONFIRM_WARNING,
  MACHINE_PATH_HONESTY,
  MACHINE_WRITE_HONESTY,
  assertMachineMayConnect,
  canonicalMachineText,
  confirmMachine,
  describeMachine,
  forgetMachine,
  isMachineConfirmed,
  listMachineConfirmations,
  machineExecutionHash,
  machineRecordKey,
  machineRowStatus,
  whileReadingMachines,
  writeHonestyOf
} = await import('../confirm');
const { confirmPath } = await import('../../config/confirm-record');
const {
  CONFIG_CONFIRM_ACKNOWLEDGEMENT,
  EMPTY_EXECUTION_FIELDS,
  confirmConfigRow,
  describeExecution,
  executionHash,
  configRowStatus
} = await import('../../config/confirm');

type Fields = Parameters<typeof machineExecutionHash>[1];

const ROW: Fields = {
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 22,
  remoteTmuxPath: '/usr/bin/tmux'
};

const ID = 'pop-os';

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-machines-confirm-'));
  mkdirSync(join(userData, 'gmux'), { recursive: true });
  ready = true;
  keystore = true;
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

/** Confirm the way the IPC handler does, from what the sheet showed. */
function confirmAsAPerson(id: string, fields: Fields): void {
  const summary = describeMachine(id, fields);
  const recorded = confirmMachine(id, fields, {
    acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
    hashRead: summary.hash,
    linesRead: summary.lines
  });
  expect(recorded).not.toBeNull();
}

describe('the hash', () => {
  it('is stable for the same machine', () => {
    expect(machineExecutionHash(ID, ROW)).toBe(machineExecutionHash(ID, { ...ROW }));
  });

  it('moves for host', () => {
    expect(machineExecutionHash(ID, { ...ROW, host: 'other.example' })).not.toBe(
      machineExecutionHash(ID, ROW)
    );
  });

  it('moves for user, including set to unset', () => {
    expect(machineExecutionHash(ID, { ...ROW, user: 'root' })).not.toBe(
      machineExecutionHash(ID, ROW)
    );
    expect(machineExecutionHash(ID, { ...ROW, user: null })).not.toBe(
      machineExecutionHash(ID, ROW)
    );
  });

  it('moves for port, including set to unset', () => {
    expect(machineExecutionHash(ID, { ...ROW, port: 2222 })).not.toBe(
      machineExecutionHash(ID, ROW)
    );
    expect(machineExecutionHash(ID, { ...ROW, port: null })).not.toBe(
      machineExecutionHash(ID, ROW)
    );
  });

  it('moves for remoteTmuxPath, including set to unset', () => {
    expect(
      machineExecutionHash(ID, { ...ROW, remoteTmuxPath: '/opt/bin/tmux' })
    ).not.toBe(machineExecutionHash(ID, ROW));
    expect(machineExecutionHash(ID, { ...ROW, remoteTmuxPath: null })).not.toBe(
      machineExecutionHash(ID, ROW)
    );
  });

  it('moves when the id changes, so a machine cannot inherit an approval', () => {
    expect(machineExecutionHash('other', ROW)).not.toBe(machineExecutionHash(ID, ROW));
  });

  it('carries no label and no colour, because there is nowhere to put one', () => {
    const text = canonicalMachineText(ID, ROW);
    expect(text).not.toContain('label');
    expect(text).not.toContain('color');
    expect(text).not.toContain('blue');
  });

  it('names its own algorithm', () => {
    expect(canonicalMachineText(ID, ROW).startsWith('sha256-machine-exec-v1')).toBe(
      true
    );
  });
});

// ---------------------------------------------------------------------------
// Phase 83. The fifth field
// ---------------------------------------------------------------------------

describe('the version a person accepted', () => {
  /**
   * The hash of the four field row, taken on 2026-08-18 before Phase 83 added
   * the fifth field.
   *
   * It is hard coded because the one property that keeps every already
   * confirmed machine confirmed is that a row carrying no acceptance hashes to
   * exactly what it hashed to before. Every other value here is computed by the
   * same code that would be wrong.
   */
  const BEFORE_PHASE_83 =
    'dbd8aa39c1dd0154b556593a2a4ef56e2471afd575d98f3f8431abe20c445d46';

  it('leaves a row that accepted nothing hashing exactly as it did', () => {
    expect(machineExecutionHash(ID, ROW)).toBe(BEFORE_PHASE_83);
    expect(
      machineExecutionHash(ID, { ...ROW, acceptedTmuxVersion: null })
    ).toBe(BEFORE_PHASE_83);
  });

  it('keeps the key out of the hash text until a version is accepted', () => {
    expect(canonicalMachineText(ID, ROW)).not.toContain('acceptedTmuxVersion');
    expect(
      canonicalMachineText(ID, { ...ROW, acceptedTmuxVersion: '3.9a' })
    ).toContain('acceptedTmuxVersion');
  });

  it('moves the hash when a version is accepted, and again when it changes', () => {
    const none = machineExecutionHash(ID, ROW);
    const one = machineExecutionHash(ID, { ...ROW, acceptedTmuxVersion: '3.9a' });
    const two = machineExecutionHash(ID, { ...ROW, acceptedTmuxVersion: '3.8a' });
    expect(one).not.toBe(none);
    expect(two).not.toBe(one);
  });

  it('hashes back to the original when the acceptance is withdrawn', () => {
    const accepted: Fields = { ...ROW, acceptedTmuxVersion: '3.9a' };
    expect(machineExecutionHash(ID, accepted)).not.toBe(BEFORE_PHASE_83);
    expect(
      machineExecutionHash(ID, { ...accepted, acceptedTmuxVersion: null })
    ).toBe(BEFORE_PHASE_83);
  });

  it('names the version on the sheet, and only when there is one', () => {
    expect(describeMachine(ID, ROW).lines.join('\n')).not.toContain(
      'Accepts this version'
    );
    const lines = describeMachine(ID, {
      ...ROW,
      acceptedTmuxVersion: '3.9a'
    }).lines;
    expect(lines[lines.length - 1]).toBe(
      'Accepts this version of the program, which Tortie has not measured: 3.9a'
    );
  });

  it('refuses a confirmation whose sheet was drawn before the acceptance', () => {
    const stale = describeMachine(ID, ROW);
    expect(() =>
      confirmMachine(ID, { ...ROW, acceptedTmuxVersion: '3.9a' }, {
        acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
        hashRead: stale.hash,
        linesRead: stale.lines
      })
    ).toThrow(/changed after it was/);
  });

  it('stops a confirmed machine being usable when a version is accepted', () => {
    confirmAsAPerson(ID, ROW);
    expect(isMachineConfirmed(ID, ROW)).toBe(true);
    expect(isMachineConfirmed(ID, { ...ROW, acceptedTmuxVersion: '3.9a' })).toBe(
      false
    );
  });
});

describe('the folder Tortie may save under (Phase 101)', () => {
  const ROOT = '/Users/gdc/code';

  it('does not move the hash of a machine that carries none', () => {
    // The one property that keeps every machine already confirmed confirmed.
    expect(machineExecutionHash(ID, ROW)).toBe(
      machineExecutionHash(ID, { ...ROW, writeRoot: null })
    );
    expect(canonicalMachineText(ID, ROW)).not.toContain('writeRoot');
  });

  it('moves the hash when a folder is named, and back when it is cleared', () => {
    const withRoot = machineExecutionHash(ID, { ...ROW, writeRoot: ROOT });
    expect(withRoot).not.toBe(machineExecutionHash(ID, ROW));
    expect(withRoot).not.toBe(
      machineExecutionHash(ID, { ...ROW, writeRoot: '/Users/gdc' })
    );
    expect(machineExecutionHash(ID, { ...ROW, writeRoot: null })).toBe(
      machineExecutionHash(ID, ROW)
    );
  });

  it('names the folder on the sheet and in the hash text', () => {
    const sheet = describeMachine(ID, { ...ROW, writeRoot: ROOT });
    expect(sheet.lines[sheet.lines.length - 1]).toBe(
      `May replace files under this folder on that machine: ${ROOT}`
    );
    expect(canonicalMachineText(ID, { ...ROW, writeRoot: ROOT })).toContain(ROOT);
  });

  it('draws no folder line for a machine that carries none', () => {
    expect(describeMachine(ID, ROW).lines.join('\n')).not.toContain(
      'May replace files under'
    );
  });

  it('answers the honesty paragraph only when a folder is named', () => {
    expect(writeHonestyOf({ ...ROW, writeRoot: ROOT })).toBe(
      MACHINE_WRITE_HONESTY
    );
    expect(writeHonestyOf(ROW)).toBeNull();
    expect(writeHonestyOf({ ...ROW, writeRoot: '' })).toBeNull();
    expect(describeMachine(ID, { ...ROW, writeRoot: ROOT }).writeHonesty).toBe(
      MACHINE_WRITE_HONESTY
    );
    expect(describeMachine(ID, ROW).writeHonesty).toBeNull();
  });

  it('keeps the honesty paragraph out of the lines and out of the hash', () => {
    const sheet = describeMachine(ID, { ...ROW, writeRoot: ROOT });
    expect(sheet.lines.join('\n')).not.toContain(MACHINE_WRITE_HONESTY);
    expect(canonicalMachineText(ID, { ...ROW, writeRoot: ROOT })).not.toContain(
      'Tortie replaces a file only after'
    );
  });

  it('survives an ordinary re-confirm, which is the second ruling', () => {
    // The operator corrects the address. The row goes changed, and the sheet he
    // then reads still carries the folder and still carries the paragraph.
    const moved = { ...ROW, writeRoot: ROOT, host: 'attic.example' };
    const sheet = describeMachine(ID, moved);
    expect(sheet.lines.join('\n')).toContain(ROOT);
    expect(sheet.writeHonesty).toBe(MACHINE_WRITE_HONESTY);
  });

  it('carries the paragraph on the row status as well', () => {
    expect(machineRowStatus(ID, { ...ROW, writeRoot: ROOT }).writeHonesty).toBe(
      MACHINE_WRITE_HONESTY
    );
    expect(machineRowStatus(ID, ROW).writeHonesty).toBeNull();
  });
});

describe('a machine and a configured agent with the same bare id', () => {
  it('do not produce the same hash', () => {
    const agent = executionHash(ID, {
      ...EMPTY_EXECUTION_FIELDS,
      launchable: true,
      binaries: [ID]
    });
    expect(machineExecutionHash(ID, ROW)).not.toBe(agent);
  });

  it('do not share a record key', () => {
    expect(machineRecordKey(ID)).toBe(`${MACHINE_CONFIRM_ID_PREFIX}${ID}`);
    expect(machineRecordKey(ID)).not.toBe(ID);
  });

  it('do not share a confirmation, in either direction', () => {
    // A person confirms the AGENT called pop-os. The MACHINE called pop-os must
    // still be refused, because the two agreements are about different things.
    const agentFields = {
      ...EMPTY_EXECUTION_FIELDS,
      launchable: true,
      binaries: [ID],
      launchArgv: [ID]
    };
    const agentSheet = describeExecution(ID, agentFields);
    confirmConfigRow(ID, agentFields, {
      acknowledgement: CONFIG_CONFIRM_ACKNOWLEDGEMENT,
      hashRead: agentSheet.hash,
      linesRead: agentSheet.lines
    });
    expect(configRowStatus(ID, agentFields).state).toBe('confirmed');
    expect(machineRowStatus(ID, ROW).state).toBe('never');

    // Now the machine as well. Both records live in one file and neither one
    // disturbs the other.
    confirmAsAPerson(ID, ROW);
    expect(machineRowStatus(ID, ROW).state).toBe('confirmed');
    expect(configRowStatus(ID, agentFields).state).toBe('confirmed');
  });
});

describe('the sheet', () => {
  it('is exactly the four hashed facts, in order', () => {
    expect(describeMachine(ID, ROW).lines).toEqual([
      'Machine: pop-os.tail1a2b.ts.net',
      'Signs in as: greg',
      'Port: 22',
      'Runs this program on that machine: /usr/bin/tmux'
    ]);
  });

  it('leaves out a line for a field the machine does not carry', () => {
    expect(
      describeMachine(ID, { ...ROW, user: null, port: null }).lines
    ).toEqual([
      'Machine: pop-os.tail1a2b.ts.net',
      'Runs this program on that machine: /usr/bin/tmux'
    ]);
  });

  it('says plainly when no program has been chosen', () => {
    const lines = describeMachine(ID, { ...ROW, remoteTmuxPath: null }).lines;
    expect(lines[lines.length - 1]).toBe(
      'Runs this program on that machine: not chosen yet, so Tortie cannot use this machine.'
    );
  });

  it('carries the warning, so no surface can omit it', () => {
    expect(describeMachine(ID, ROW).warning).toBe(MACHINE_CONFIRM_WARNING);
  });

  it('does not carry the honesty line, because the hash does not cover it', () => {
    const sheet = describeMachine(ID, ROW);
    expect(sheet.lines.join('\n')).not.toContain(MACHINE_PATH_HONESTY);
    expect(canonicalMachineText(ID, ROW)).not.toContain('Confirming seals');
  });

  it('does not carry the pinned ssh path, for the same reason', () => {
    expect(describeMachine(ID, ROW).lines.join('\n')).not.toContain('/usr/bin/ssh');
  });
});

describe('the four states, and the six refusals', () => {
  it('refuses a machine nobody confirmed', () => {
    const status = machineRowStatus(ID, ROW);
    expect(status.state).toBe('never');
    expect(status.refusal).toContain('nobody has confirmed it');
    expect(() => {
      assertMachineMayConnect(ID, ROW);
    }).toThrow(/nobody has confirmed it/);
  });

  it('accepts a machine a person confirmed', () => {
    confirmAsAPerson(ID, ROW);
    expect(machineRowStatus(ID, ROW).state).toBe('confirmed');
    expect(machineRowStatus(ID, ROW).refusal).toBeNull();
    expect(isMachineConfirmed(ID, ROW)).toBe(true);
    expect(() => {
      assertMachineMayConnect(ID, ROW);
    }).not.toThrow();
  });

  it('refuses a machine whose details changed', () => {
    confirmAsAPerson(ID, ROW);
    const moved = { ...ROW, host: 'somewhere-else.example' };
    const status = machineRowStatus(ID, moved);
    expect(status.state).toBe('changed');
    expect(status.refusal).toContain('its details changed after you');
    expect(() => {
      assertMachineMayConnect(ID, moved);
    }).toThrow(/details changed/);
  });

  it('shows the lines the person really read, not the new ones', () => {
    confirmAsAPerson(ID, ROW);
    const moved = { ...ROW, host: 'somewhere-else.example' };
    const status = machineRowStatus(ID, moved);
    expect(status.confirmedLines.join('\n')).toContain('pop-os.tail1a2b.ts.net');
    expect(status.confirmedLines.join('\n')).not.toContain('somewhere-else.example');
    expect(status.lines.join('\n')).toContain('somewhere-else.example');
  });

  it('refuses everything when the seal cannot be read', () => {
    confirmAsAPerson(ID, ROW);
    keystore = false;
    const status = machineRowStatus(ID, ROW);
    expect(status.state).toBe('unknown');
    expect(status.refusal).toContain('could not read its record');
    expect(() => {
      assertMachineMayConnect(ID, ROW);
    }).toThrow(/could not read its record/);
  });

  it('refuses a connection asked for from inside the file read', () => {
    confirmAsAPerson(ID, ROW);
    whileReadingMachines(() => {
      const status = machineRowStatus(ID, ROW);
      expect(status.state).toBe('unknown');
      expect(status.refusal).toContain('never starts anything on its own');
      expect(status.refusal).toContain('from the machines file');
    });
    // And an ordinary connection after the read is unaffected.
    expect(machineRowStatus(ID, ROW).state).toBe('confirmed');
  });

  it('refuses a confirmation that does not carry the acknowledgement', () => {
    const sheet = describeMachine(ID, ROW);
    expect(() => {
      confirmMachine(ID, ROW, {
        acknowledgement: 'yes' as typeof MACHINE_CONFIRM_ACKNOWLEDGEMENT,
        hashRead: sheet.hash,
        linesRead: sheet.lines
      });
    }).toThrow(/confirmed by a person, not by a file/);
    expect(machineRowStatus(ID, ROW).state).toBe('never');
  });

  it('refuses a confirmation whose hash moved while the sheet was open', () => {
    expect(() => {
      confirmMachine(ID, ROW, {
        acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
        hashRead: 'a hash from an older sheet',
        linesRead: []
      });
    }).toThrow(/changed after it was/);
    expect(machineRowStatus(ID, ROW).state).toBe('never');
  });
});

describe('the sealed record', () => {
  it('drops a row the seal does not cover, and keeps the real one', () => {
    confirmAsAPerson(ID, ROW);
    const path = confirmPath();
    const file = JSON.parse(readFileSync(path, 'utf8')) as {
      confirmations: Record<string, unknown>;
      seal: string;
    };
    const forged = { host: 'attacker.example', user: 'root', port: null, remoteTmuxPath: '/tmp/x' };
    file.confirmations[machineRecordKey('forged')] = {
      id: machineRecordKey('forged'),
      hash: machineExecutionHash('forged', forged),
      algorithm: 'sha256-machine-exec-v1',
      at: Date.now(),
      lines: ['Machine: attacker.example']
    };
    writeFileSync(path, JSON.stringify(file, null, 2), 'utf8');

    expect(machineRowStatus('forged', forged).state).toBe('never');
    expect(machineRowStatus(ID, ROW).state).toBe('confirmed');
  });

  it('is worth nothing when it was sealed by another key', () => {
    confirmAsAPerson(ID, ROW);
    const path = confirmPath();
    const file = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    file['seal'] = Buffer.from('not tortie', 'utf8').toString('base64');
    writeFileSync(path, JSON.stringify(file, null, 2), 'utf8');
    expect(machineRowStatus(ID, ROW).state).toBe('never');
  });

  it('writes nothing at all when a confirmation is refused', () => {
    const sheet = describeMachine(ID, ROW);
    expect(() => {
      confirmMachine(ID, ROW, {
        acknowledgement: 'no' as typeof MACHINE_CONFIRM_ACKNOWLEDGEMENT,
        hashRead: sheet.hash,
        linesRead: sheet.lines
      });
    }).toThrow();
    expect(() => readFileSync(confirmPath(), 'utf8')).toThrow();
  });

  it('returns null rather than writing when the keystore refuses', () => {
    keystore = false;
    const sheet = describeMachine(ID, ROW);
    const out = confirmMachine(ID, ROW, {
      acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
      hashRead: sheet.hash,
      linesRead: sheet.lines
    });
    expect(out).toBeNull();
  });

  it('lists only machine records', () => {
    confirmAsAPerson(ID, ROW);
    const agentFields = { ...EMPTY_EXECUTION_FIELDS, launchable: true, binaries: ['x'] };
    const agentSheet = describeExecution('x', agentFields);
    confirmConfigRow('x', agentFields, {
      acknowledgement: CONFIG_CONFIRM_ACKNOWLEDGEMENT,
      hashRead: agentSheet.hash,
      linesRead: agentSheet.lines
    });
    const listed = listMachineConfirmations();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(machineRecordKey(ID));
  });

  it('puts the machine back when a person withdraws the agreement', () => {
    confirmAsAPerson(ID, ROW);
    forgetMachine(ID);
    expect(machineRowStatus(ID, ROW).state).toBe('never');
  });

  it('does nothing when a machine that was never confirmed is forgotten', () => {
    expect(() => {
      forgetMachine('never-there');
    }).not.toThrow();
  });
});
