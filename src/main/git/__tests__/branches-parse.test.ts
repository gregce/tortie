/**
 * Unit tests for the branch-management parser (Phase 10 #7):
 * for-each-ref refs/remotes listing with <remote>/HEAD dedupe.
 */

import { describe, expect, it } from 'vitest';
import { REMOTE_BRANCH_FORMAT, parseForEachRefRemoteBranches } from '../parse';

const US = '\x1f';

function line(fields: string[]): string {
  return fields.join(US);
}

describe('parseForEachRefRemoteBranches', () => {
  it('field count matches REMOTE_BRANCH_FORMAT', () => {
    expect(REMOTE_BRANCH_FORMAT.split('%1f')).toHaveLength(5);
  });

  it('parses remote/short split and tip info', () => {
    const out = [
      line([
        'origin/main',
        'a'.repeat(40),
        'aaaaaaa',
        '',
        'latest work'
      ]),
      line([
        'origin/feat/registry',
        'b'.repeat(40),
        'bbbbbbb',
        '',
        'wip: registry'
      ]),
      line(['upstream/main', 'c'.repeat(40), 'ccccccc', '', 'upstream tip'])
    ].join('\n');

    const branches = parseForEachRefRemoteBranches(out + '\n');
    expect(branches).toHaveLength(3);

    const first = branches[0]!;
    expect(first.name).toBe('origin/main');
    expect(first.remote).toBe('origin');
    expect(first.shortName).toBe('main');
    expect(first.sha).toBe('a'.repeat(40));
    expect(first.shortSha).toBe('aaaaaaa');
    expect(first.subject).toBe('latest work');

    // Nested short names keep every segment after the remote.
    const nested = branches[1]!;
    expect(nested.remote).toBe('origin');
    expect(nested.shortName).toBe('feat/registry');

    expect(branches[2]!.remote).toBe('upstream');
  });

  it('dedupes the symbolic <remote>/HEAD entry via %(symref)', () => {
    const out = [
      line([
        'origin/HEAD',
        'a'.repeat(40),
        'aaaaaaa',
        'refs/remotes/origin/main',
        'latest work'
      ]),
      line(['origin/main', 'a'.repeat(40), 'aaaaaaa', '', 'latest work'])
    ].join('\n');

    const branches = parseForEachRefRemoteBranches(out);
    expect(branches).toHaveLength(1);
    expect(branches[0]!.name).toBe('origin/main');
  });

  it('drops a HEAD-named entry even without a symref value (defensive)', () => {
    const out = line([
      'origin/HEAD',
      'a'.repeat(40),
      'aaaaaaa',
      '',
      'latest work'
    ]);
    expect(parseForEachRefRemoteBranches(out)).toHaveLength(0);
  });

  it('rejoins subjects that contain the US separator', () => {
    const out = line([
      'origin/x',
      'd'.repeat(40),
      'ddddddd',
      '',
      `weird${US}subject`
    ]);
    const branches = parseForEachRefRemoteBranches(out);
    expect(branches[0]!.subject).toBe(`weird${US}subject`);
  });

  it('ignores blank and malformed lines', () => {
    const out = ['', 'not-a-record', line(['origin/ok', 'e'.repeat(40), 'eeeeeee', '', 's'])].join(
      '\n'
    );
    const branches = parseForEachRefRemoteBranches(out);
    expect(branches).toHaveLength(1);
    expect(branches[0]!.name).toBe('origin/ok');
  });
});
