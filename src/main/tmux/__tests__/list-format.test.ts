/**
 * The `list-sessions` / `new-session -P -F` line parser.
 *
 * Two things make this fiddly, and both are real: session names contain
 * SPACES (one of the user's is literally "zen of tortie"), so the name goes
 * last; and `#{@gmux-id}` expands to NOTHING for a session gmux did not
 * create, which puts two spaces in the middle of the line. Every field
 * before the name is space-free, which is what makes the split safe.
 */

import { describe, expect, it } from 'vitest';
import { parseListLine } from '../sessions';

describe('parseListLine', () => {
  it('reads the @gmux-id of a gmux session', () => {
    const info = parseListLine(
      '$367 1786400000 0 1 42a236db-75b6-485d-a927-3d763d774f6e cursor-1'
    );
    expect(info?.sessionId).toBe('$367');
    expect(info?.tmuxName).toBe('cursor-1');
    expect(info?.gmuxId).toBe('42a236db-75b6-485d-a927-3d763d774f6e');
    expect(info?.createdAt).toBe(1786400000 * 1000);
    expect(info?.attached).toBe(false);
  });

  it('leaves gmuxId undefined for a session gmux did not create', () => {
    // tmux emits an EMPTY field for an unset user option — two spaces.
    const info = parseListLine('$1 1786400000 1 2  gmux-control');
    expect(info?.tmuxName).toBe('gmux-control');
    expect(info?.gmuxId).toBeUndefined();
    expect(info?.attached).toBe(true);
    expect(info?.windows).toBe(2);
  });

  it('keeps spaces in the session name', () => {
    const info = parseListLine(
      '$335 1786400000 0 1 7e0549d0-27fe-4d7d-b81b-db9771bf80d2 zen of tortie'
    );
    expect(info?.tmuxName).toBe('zen of tortie');
    expect(info?.gmuxId).toBe('7e0549d0-27fe-4d7d-b81b-db9771bf80d2');
  });

  it('reads the pane pid from the create format only', () => {
    // `new-session -P -F` resolves #{pane_pid} against the one pane it just
    // made; list-sessions has no such target, hence the two formats.
    const created = parseListLine('$435 1786406381 0 1  49688 zz-probe', true);
    expect(created?.panePid).toBe(49688);
    expect(created?.tmuxName).toBe('zz-probe');
    expect(created?.gmuxId).toBeUndefined();

    const listed = parseListLine('$435 1786406381 0 1  zz-probe');
    expect(listed?.panePid).toBeUndefined();
  });

  it('rejects a line that is not a session', () => {
    expect(parseListLine('no such thing')).toBeNull();
    expect(parseListLine('')).toBeNull();
  });
});
