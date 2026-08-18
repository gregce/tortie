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
  MACHINE_VERSION_ACCEPTED_HONESTY,
  MACHINE_VERSION_ACCEPT_MISMATCH,
  MACHINE_VERSION_ACCEPT_OFFER,
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

  it('carries all sixteen classes', () => {
    // Eleven in Phase 68 and three more in Phase 69: `no-server` for a machine
    // that answered with nothing of Tortie's on it, `version-unmeasured` for one
    // running a version nobody measured, and `prepared` for the success answer.
    // Phase 79.1 added two, being `key-installed` and `password-required`.
    expect(MACHINE_OUTCOME_CLASSES).toHaveLength(16);
  });

  it('tells a machine asking for a password apart from one refusing a sign in', () => {
    // These two are one line apart on the same screen and they mean different
    // things. One machine is waiting for an answer and the other has given one.
    const asked = machineOutcomeCopy('password-required');
    const refused = machineOutcomeCopy('auth-refused');
    expect(asked.headline).toBe('That machine asked for a password.');
    expect(asked.alarm).toBe(false);
    expect(asked.detail).not.toBe(refused.detail);
    expect(asked.headline).not.toBe(refused.headline);
  });

  it('no longer says Tortie does not handle keys or passwords', () => {
    // PHASE 79.1 FIX ROUND. This sentence was drawn one line above a button
    // reading "Make a key and put it on this machine". Tortie makes a key and
    // sends a password now, so the claim is false wherever it appears.
    for (const cls of MACHINE_OUTCOME_CLASSES) {
      const copy = machineOutcomeCopy(cls);
      const both = `${copy.headline} ${copy.detail}`.toLowerCase();
      expect(both).not.toContain('does not handle keys or passwords');
      expect(both).not.toContain('handles no keys and no passwords');
    }
  });

  it('says the key is on the machine, and that the test comes next', () => {
    // It is deliberately NOT a claim that the machine is usable. The surface
    // starts the real connection test straight after it, so the answer a person
    // ends on is the machine's own rather than Tortie's.
    const copy = machineOutcomeCopy('key-installed');
    expect(copy.headline).toBe('The key is on that machine.');
    expect(copy.detail).toBe(
      'Tortie added its key to that machine and is testing the connection now.'
    );
    expect(copy.alarm).toBe(false);
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

describe('the four classes that carry a fact from the run', () => {
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

  it('names the path and the version for prepared, and says it started it', () => {
    const copy = composeOutcomeCopy('prepared', {
      resolvedPath: '/usr/bin/tmux',
      version: '3.6a',
      serverBorn: true
    });
    expect(copy.detail).toBe(
      'Tortie started the program at /usr/bin/tmux on this machine and set it ' +
        'up the way it needs. The machine reports version 3.6a.'
    );
    expect(copy.alarm).toBe(false);
  });

  it('says it LEFT the program running when it found one already there', () => {
    // The row draws an honesty line beside this sentence saying the same thing.
    // MEASURED 2026-08-17 in build/probe-machines.mjs step 11: the first build
    // said "Tortie started the program" whatever happened, and the photograph of
    // a prepared row carried that sentence directly above "The program was
    // already running on that machine, so Tortie left it running."
    const copy = composeOutcomeCopy('prepared', {
      resolvedPath: '/usr/bin/tmux',
      version: '3.6a',
      serverBorn: false
    });
    expect(copy.detail).toBe(
      'The program at /usr/bin/tmux was already running on this machine, so ' +
        'Tortie left it running and set it up the way it needs. The machine ' +
        'reports version 3.6a.'
    );
    expect(copy.detail).not.toContain('Tortie started the program');
    expect(copy.alarm).toBe(false);
  });

  it('names the found version, the measured list and the remedy', () => {
    const copy = composeOutcomeCopy('version-unmeasured', {
      resolvedPath: '/usr/bin/tmux',
      version: '2.8',
      supportedPhrase: '3.6a and 3.7b'
    });
    expect(copy.detail).toContain('reports version 2.8');
    expect(copy.detail).toContain('Tortie has measured 3.6a and 3.7b.');
    expect(copy.detail).toContain('Nothing was changed on either machine.');
    expect(copy.detail).toContain('then prepare it again.');
    // It is a machine that needs its program updated, not a security event.
    expect(copy.alarm).toBe(false);
  });

  it('says a program that would not identify itself is not used', () => {
    const copy = composeOutcomeCopy('version-unmeasured', {
      resolvedPath: '/usr/bin/tmux',
      version: null
    });
    expect(copy.detail).toBe(
      'The program at /usr/bin/tmux on this machine would not report its ' +
        'version. Tortie will not use a program it cannot identify. Nothing ' +
        'was changed on either machine.'
    );
  });

  it('names no install command, because it does not know that machine', () => {
    const copy = composeOutcomeCopy('version-unmeasured', {
      resolvedPath: '/usr/bin/tmux',
      version: '2.8',
      supportedPhrase: '3.6a'
    });
    for (const guess of ['brew ', 'apt ', 'apt-get', 'dnf ', 'yum ', 'pacman']) {
      expect(copy.detail).not.toContain(guess);
    }
  });

  it('leaves every other class exactly as the table has it', () => {
    for (const cls of MACHINE_OUTCOME_CLASSES) {
      if (
        cls === 'ok' ||
        cls === 'unknown' ||
        cls === 'prepared' ||
        cls === 'version-unmeasured'
      ) {
        continue;
      }
      expect(composeOutcomeCopy(cls, {})).toEqual(machineOutcomeCopy(cls));
    }
  });

  it('tells a machine with no server apart from one that refused', () => {
    // Research 51 section 4.4 requires these two be different answers, and both
    // shapes of the no-server text are real captures. See
    // src/main/machines/__tests__/golden/no-server.txt.
    expect(
      classifyMachineOutput('no server running on /tmp/tmux-501/gmux-p69')
    ).toBe('no-server');
    expect(
      classifyMachineOutput(
        'error connecting to /private/tmp/tmux-501/gmux-p69 (No such file or directory)'
      )
    ).toBe('no-server');
    expect(
      classifyMachineOutput('ssh: connect to host 127.0.0.1 port 22: Connection refused')
    ).toBe('refused');
  });
});

// ---------------------------------------------------------------------------
// Phase 83. Accepting a version Tortie has not measured
// ---------------------------------------------------------------------------

describe('the sentences about an accepted version', () => {
  const DASHES = /[\u2013\u2014]/;
  const EVERY = [
    MACHINE_VERSION_ACCEPT_MISMATCH,
    MACHINE_VERSION_ACCEPT_OFFER,
    MACHINE_VERSION_ACCEPTED_HONESTY
  ];

  it('uses no em dash and no en dash', () => {
    for (const text of EVERY) expect(DASHES.test(text)).toBe(false);
  });

  it('names no program, no protocol and no transport', () => {
    for (const text of EVERY) {
      for (const word of ['ssh', 'tmux', 'socket', 'pane', 'prefix']) {
        expect(text.toLowerCase()).not.toContain(word);
      }
    }
  });

  it('says what was not started when the versions disagree', () => {
    expect(MACHINE_VERSION_ACCEPT_MISMATCH).toContain('Nothing was started.');
    expect(MACHINE_VERSION_ACCEPT_MISMATCH).toContain(
      'Accept the version it runs now'
    );
  });

  it('says what accepting cannot promise', () => {
    expect(MACHINE_VERSION_ACCEPT_OFFER).toContain('a session may fail to start');
    expect(MACHINE_VERSION_ACCEPT_OFFER).toContain(
      'This acceptance covers this one version on this one machine.'
    );
  });

  it('offers the acceptance only when a sheet is being drawn beside it', () => {
    const without = composeOutcomeCopy('version-unmeasured', {
      resolvedPath: '/usr/bin/tmux',
      version: '3.9a',
      supportedPhrase: '3.6a, 3.7b and 3.7c'
    });
    expect(without.detail).not.toContain(MACHINE_VERSION_ACCEPT_OFFER);
    const withOne = composeOutcomeCopy('version-unmeasured', {
      resolvedPath: '/usr/bin/tmux',
      version: '3.9a',
      supportedPhrase: '3.6a, 3.7b and 3.7c',
      acceptOffered: true
    });
    expect(withOne.detail).toContain(MACHINE_VERSION_ACCEPT_OFFER);
    expect(withOne.detail).toContain('Nothing was changed on either machine.');
  });

  it('offers nothing for a machine that would not name a version', () => {
    const copy = composeOutcomeCopy('version-unmeasured', {
      resolvedPath: '/usr/bin/tmux',
      version: null,
      acceptOffered: true
    });
    expect(copy.detail).not.toContain(MACHINE_VERSION_ACCEPT_OFFER);
  });

  it('says the version was accepted rather than measured on a prepared row', () => {
    const measured = composeOutcomeCopy('prepared', {
      resolvedPath: '/usr/bin/tmux',
      version: '3.7c',
      serverBorn: false
    });
    expect(measured.detail).not.toContain(MACHINE_VERSION_ACCEPTED_HONESTY);
    const accepted = composeOutcomeCopy('prepared', {
      resolvedPath: '/usr/bin/tmux',
      version: '3.9a',
      serverBorn: false,
      versionAccepted: true
    });
    expect(accepted.detail).toContain(MACHINE_VERSION_ACCEPTED_HONESTY);
    expect(accepted.alarm).toBe(false);
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
