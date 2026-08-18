/**
 * The drop whole rule, applied to `machines.json`.
 *
 * Every case below is a bad row beside a good one, because the property that
 * matters is not "the bad row was refused". It is "the bad row was refused and
 * the good row beside it survived". A validator that takes a whole file down
 * over one typo costs a person every machine they have.
 *
 * The second property is that every drop names the field and the reason. A
 * silent drop is the failure mode this rule exists to prevent, so each case
 * asserts the field name as well as the refusal.
 */

import { describe, expect, it } from 'vitest';
import {
  parseMachines,
  serializeMachines,
  validateMachinesFile
} from '../schema';

/** A row that passes everything, used as the survivor in each case. */
const GOOD = {
  id: 'pop-os',
  label: 'Pop OS',
  color: 'blue' as const,
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 22,
  remoteTmuxPath: '/usr/bin/tmux'
};

/** One file holding the good row and one other row. */
function fileWith(other: unknown): unknown {
  return { schema: 1, machines: [GOOD, other] };
}

/** Check that `other` was dropped, that GOOD survived, and name the field. */
function expectDropped(other: unknown, fieldFragment: string): string {
  const out = validateMachinesFile(fileWith(other));
  expect(out.rows.map((r) => r.id)).toEqual(['pop-os']);
  expect(out.problems).toHaveLength(1);
  const problem = out.problems[0];
  expect(problem).toBeDefined();
  expect(problem?.field).toContain(fieldFragment);
  expect(problem?.message.length).toBeGreaterThan(10);
  return problem?.message ?? '';
}

describe('a valid file', () => {
  it('parses every field', () => {
    const out = validateMachinesFile({ schema: 1, machines: [GOOD] });
    expect(out.problems).toEqual([]);
    expect(out.rows).toEqual([GOOD]);
  });

  it('accepts a row carrying only the two required fields', () => {
    const out = validateMachinesFile({
      schema: 1,
      machines: [{ id: 'box', host: '192.168.1.20' }]
    });
    expect(out.problems).toEqual([]);
    expect(out.rows[0]).toEqual({ id: 'box', host: '192.168.1.20' });
  });

  it('accepts an empty list', () => {
    const out = validateMachinesFile({ schema: 1, machines: [] });
    expect(out.problems).toEqual([]);
    expect(out.rows).toEqual([]);
  });
});

describe('a row is dropped whole and the good row beside it survives', () => {
  it('refuses a missing id', () => {
    expectDropped({ host: 'a.example' }, 'id');
  });

  it('refuses an id that is not the closed shape', () => {
    expectDropped({ id: 'Pop OS', host: 'a.example' }, 'id');
  });

  it('refuses a missing host', () => {
    expectDropped({ id: 'nohost' }, 'host');
  });

  it('refuses a host that starts with a hyphen, and says why', () => {
    const message = expectDropped({ id: 'dash', host: '-oProxyCommand=x' }, 'host');
    expect(message).toContain('hyphen');
    expect(message).toContain('its own options');
  });

  it('refuses a user that starts with a hyphen, and says why', () => {
    const message = expectDropped(
      { id: 'dashuser', host: 'a.example', user: '-oX=y' },
      'user'
    );
    expect(message).toContain('hyphen');
  });

  it('refuses a host with a space in it', () => {
    expectDropped({ id: 'spacey', host: 'a b.example' }, 'host');
  });

  it('refuses a port that is not a whole number', () => {
    expectDropped({ id: 'p', host: 'a.example', port: 22.5 }, 'port');
  });

  it('refuses a port outside 1 to 65535', () => {
    expectDropped({ id: 'p', host: 'a.example', port: 70000 }, 'port');
  });

  it('refuses a relative program path', () => {
    expectDropped(
      { id: 'rel', host: 'a.example', remoteTmuxPath: 'tmux' },
      'remoteTmuxPath'
    );
  });

  it('refuses a program path holding a single quote', () => {
    const message = expectDropped(
      { id: 'q', host: 'a.example', remoteTmuxPath: "/usr/bin/it's" },
      'remoteTmuxPath'
    );
    expect(message).toContain('single quote');
  });

  it('accepts a program path holding a space', () => {
    const out = validateMachinesFile({
      schema: 1,
      machines: [{ id: 'sp', host: 'a.example', remoteTmuxPath: '/opt/my tools/tmux' }]
    });
    expect(out.problems).toEqual([]);
    expect(out.rows[0]?.remoteTmuxPath).toBe('/opt/my tools/tmux');
  });

  it('refuses a colour outside the six', () => {
    expectDropped({ id: 'c', host: 'a.example', color: 'puce' }, 'color');
  });

  it('refuses a label longer than 40 characters', () => {
    expectDropped({ id: 'l', host: 'a.example', label: 'x'.repeat(41) }, 'label');
  });

  it('refuses an unknown key', () => {
    const message = expectDropped(
      { id: 'u', host: 'a.example', sshOptions: ['-o', 'X=y'] },
      'sshOptions'
    );
    expect(message).toContain('does not know');
  });

  it('refuses a row that is not an object', () => {
    expectDropped('pop-os', 'machines[1]');
  });

  it('keeps the first of two rows with one id', () => {
    const out = validateMachinesFile({
      schema: 1,
      machines: [GOOD, { ...GOOD, host: 'second.example' }]
    });
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0]?.host).toBe(GOOD.host);
    expect(out.problems[0]?.field).toContain('id');
  });
});

// ---------------------------------------------------------------------------
// Phase 83. The version a person accepted
// ---------------------------------------------------------------------------

describe('the accepted version field', () => {
  it('accepts a plain version', () => {
    const out = validateMachinesFile({
      schema: 1,
      machines: [{ id: 'box', host: 'a.example', acceptedTmuxVersion: '3.9a' }]
    });
    expect(out.problems).toEqual([]);
    expect(out.rows[0]?.acceptedTmuxVersion).toBe('3.9a');
  });

  it('drops a row whose accepted version carries a command', () => {
    const message = expectDropped(
      { id: 'bad', host: 'a.example', acceptedTmuxVersion: '3.7c; rm -rf /' },
      'acceptedTmuxVersion'
    );
    expect(message).toContain('A version looks like 3.7c.');
  });

  it('drops a row whose accepted version is a path', () => {
    expectDropped(
      { id: 'bad', host: 'a.example', acceptedTmuxVersion: '../../etc' },
      'acceptedTmuxVersion'
    );
  });

  it('drops a row whose accepted version is empty', () => {
    expectDropped(
      { id: 'bad', host: 'a.example', acceptedTmuxVersion: '' },
      'acceptedTmuxVersion'
    );
  });

  it('drops a row whose accepted version is forty characters', () => {
    expectDropped(
      {
        id: 'bad',
        host: 'a.example',
        acceptedTmuxVersion: '3.7c3.7c3.7c3.7c3.7c3.7c3.7c3.7c3.7c3.7c'
      },
      'acceptedTmuxVersion'
    );
  });

  it('drops a row whose accepted version carries a newline', () => {
    expectDropped(
      { id: 'bad', host: 'a.example', acceptedTmuxVersion: '3.7c\n3.6a' },
      'acceptedTmuxVersion'
    );
  });

  it('writes the field after the program path, and only when it is there', () => {
    const withOne = serializeMachines([
      {
        id: 'box',
        host: 'a.example',
        remoteTmuxPath: '/usr/bin/tmux',
        acceptedTmuxVersion: '3.9a'
      }
    ]);
    expect(withOne.indexOf('acceptedTmuxVersion')).toBeGreaterThan(
      withOne.indexOf('remoteTmuxPath')
    );
    const without = serializeMachines([{ id: 'box', host: 'a.example' }]);
    expect(without).not.toContain('acceptedTmuxVersion');
  });
});

describe('a whole file failure takes every row with it', () => {
  it('refuses a schema that is not 1', () => {
    const out = validateMachinesFile({ schema: 2, machines: [GOOD] });
    expect(out.rows).toEqual([]);
    expect(out.problems[0]?.field).toBe('schema');
  });

  it('refuses a top level value that is not an object', () => {
    const out = validateMachinesFile([GOOD]);
    expect(out.rows).toEqual([]);
    expect(out.problems[0]?.field).toBe('file');
  });

  it('refuses a machines value that is not an array', () => {
    const out = validateMachinesFile({ schema: 1, machines: { pop: GOOD } });
    expect(out.rows).toEqual([]);
    expect(out.problems[0]?.field).toBe('machines');
  });

  it('refuses more than 32 rows', () => {
    const many = Array.from({ length: 33 }, (_, i) => ({
      id: `m${String(i)}`,
      host: `m${String(i)}.example`
    }));
    const out = validateMachinesFile({ schema: 1, machines: many });
    expect(out.rows).toEqual([]);
    expect(out.problems[0]?.message).toContain('33');
  });

  it('reports an unknown top level field without dropping the rows', () => {
    const out = validateMachinesFile({ schema: 1, machines: [GOOD], extra: 1 });
    expect(out.rows).toHaveLength(1);
    expect(out.problems[0]?.field).toBe('extra');
  });
});

describe('parseMachines', () => {
  it('reports a JSON syntax error as one problem', () => {
    const out = parseMachines('{ not json');
    expect(out.rows).toEqual([]);
    expect(out.problems[0]?.field).toBe('file');
    expect(out.problems[0]?.message).toContain('not valid JSON');
  });

  it('round trips what Tortie writes', () => {
    const text = serializeMachines([GOOD]);
    const out = parseMachines(text);
    expect(out.problems).toEqual([]);
    expect(out.rows).toEqual([GOOD]);
  });

  it('writes no key for a field the row does not carry', () => {
    const text = serializeMachines([{ id: 'bare', host: 'a.example' }]);
    expect(text).not.toContain('label');
    expect(text).not.toContain('port');
    expect(text).not.toContain('remoteTmuxPath');
  });
});
