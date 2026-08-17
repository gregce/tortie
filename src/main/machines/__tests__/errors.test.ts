/**
 * The failure vocabulary, and the one class that is allowed to alarm.
 *
 * The property that matters here is not that each phrase maps to a class. It is
 * that exactly one class sets `alarm`, that the class is `host-key-changed`,
 * and that the classes which look similar to a person are deliberately calm.
 * An expired key, a changed permission and a machine that is switched off are
 * ordinary. A changed host key is the program saying somebody may be reading
 * the connection, and it may never share calm copy with the other three.
 *
 * The fixtures are the text those clients print. They are pinned here rather
 * than captured per tested remote version, and that limit is stated in the
 * module's own header. Golden files per version belong to Phase 69.
 */

import { describe, expect, it } from 'vitest';
import {
  MACHINE_ALARM_CLASS,
  MACHINE_OUTCOME_CLASSES,
  classifyMachineOutput,
  composeOutcomeCopy,
  lastPrintedLine,
  machineOutcomeCopy
} from '../errors';

/** One piece of real output per class this table can name from text. */
const FIXTURES: Readonly<Record<string, string>> = {
  'host-key-changed':
    '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n' +
    '@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @\n' +
    '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n' +
    'IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!\n' +
    'Host key verification failed.\n',
  'dns-spoof':
    'WARNING: POSSIBLE DNS SPOOFING DETECTED!\n' +
    'Host key verification failed.\n',
  unreachable: 'ssh: connect to host box.example port 22: No route to host\n',
  'unreachable-timeout':
    'ssh: connect to host box.example port 22: Operation timed out\n',
  refused: 'ssh: connect to host 127.0.0.1 port 2222: Connection refused\n',
  'not-resolved': 'ssh: Could not resolve hostname nope.invalid: nodename nor servname provided, or not known\n',
  'auth-refused': 'greg@box.example: Permission denied (publickey).\n',
  'auth-too-many': 'Received disconnect from 10.0.0.4 port 22:2: Too many authentication failures\n',
  unknown: 'Something nobody wrote a rule for happened.\n'
};

describe('the class each fixture is read as', () => {
  it('names a changed host key', () => {
    expect(classifyMachineOutput(FIXTURES['host-key-changed'] ?? '')).toBe(
      'host-key-changed'
    );
  });

  it('names possible DNS spoofing as the same class', () => {
    expect(classifyMachineOutput(FIXTURES['dns-spoof'] ?? '')).toBe(
      'host-key-changed'
    );
  });

  it('names a machine that cannot be reached', () => {
    expect(classifyMachineOutput(FIXTURES['unreachable'] ?? '')).toBe('unreachable');
    expect(classifyMachineOutput(FIXTURES['unreachable-timeout'] ?? '')).toBe(
      'unreachable'
    );
  });

  it('names a refused connection', () => {
    expect(classifyMachineOutput(FIXTURES['refused'] ?? '')).toBe('refused');
  });

  it('names an address that does not resolve', () => {
    expect(classifyMachineOutput(FIXTURES['not-resolved'] ?? '')).toBe('not-resolved');
  });

  it('names a refused sign in', () => {
    expect(classifyMachineOutput(FIXTURES['auth-refused'] ?? '')).toBe('auth-refused');
    expect(classifyMachineOutput(FIXTURES['auth-too-many'] ?? '')).toBe('auth-refused');
  });

  it('answers unknown for anything it does not recognise', () => {
    expect(classifyMachineOutput(FIXTURES['unknown'] ?? '')).toBe('unknown');
  });

  it('does not call a plain verification failure a changed host key', () => {
    // This is what a FIRST contact refusal prints. It is not the alarm.
    expect(classifyMachineOutput('Host key verification failed.\n')).toBe('unknown');
  });
});

describe('exactly one class alarms', () => {
  it('and it is host-key-changed', () => {
    const alarming = MACHINE_OUTCOME_CLASSES.filter(
      (cls) => machineOutcomeCopy(cls).alarm
    );
    expect(alarming).toEqual([MACHINE_ALARM_CLASS]);
    expect(MACHINE_ALARM_CLASS).toBe('host-key-changed');
  });

  it('and the three that look similar to a person are calm', () => {
    for (const cls of ['auth-refused', 'unreachable', 'refused'] as const) {
      expect(machineOutcomeCopy(cls).alarm).toBe(false);
      expect(machineOutcomeCopy(cls).class).not.toBe(MACHINE_ALARM_CLASS);
    }
  });
});

describe('every class carries copy', () => {
  it('has a headline and a detail that are complete sentences', () => {
    for (const cls of MACHINE_OUTCOME_CLASSES) {
      const copy = machineOutcomeCopy(cls);
      expect(copy.headline.length).toBeGreaterThan(10);
      expect(copy.headline.endsWith('.')).toBe(true);
      expect(copy.detail.length).toBeGreaterThan(10);
    }
  });

  it('carries all eleven classes', () => {
    expect(MACHINE_OUTCOME_CLASSES).toHaveLength(11);
  });

  it('uses no em dash and no en dash anywhere', () => {
    for (const cls of MACHINE_OUTCOME_CLASSES) {
      const copy = machineOutcomeCopy(cls);
      const text = `${copy.headline} ${copy.detail}`;
      expect(text).not.toContain('—');
      expect(text).not.toContain('–');
    }
  });
});

describe('the two classes that carry a fact from the run', () => {
  it('names the path the machine reported for ok', () => {
    const copy = composeOutcomeCopy('ok', { resolvedPath: '/usr/bin/tmux' });
    expect(copy.detail).toBe('Tortie will run /usr/bin/tmux on it.');
    expect(copy.alarm).toBe(false);
  });

  it('names the last line the program printed for unknown', () => {
    const copy = composeOutcomeCopy('unknown', {
      lastLine: 'Something nobody wrote a rule for happened.'
    });
    expect(copy.detail).toContain('Something nobody wrote a rule for happened.');
  });

  it('says so plainly when the program printed nothing', () => {
    const copy = composeOutcomeCopy('unknown', { lastLine: '' });
    expect(copy.detail).toBe('The program printed nothing Tortie could read.');
  });

  it('leaves every other class exactly as the table has it', () => {
    for (const cls of MACHINE_OUTCOME_CLASSES) {
      if (cls === 'ok' || cls === 'unknown') continue;
      expect(composeOutcomeCopy(cls, {})).toEqual(machineOutcomeCopy(cls));
    }
  });
});

describe('the last printed line', () => {
  it('skips trailing blank lines', () => {
    expect(lastPrintedLine('one\ntwo\n\n\n')).toBe('two');
  });

  it('is empty for empty output', () => {
    expect(lastPrintedLine('\n\n')).toBe('');
  });
});
