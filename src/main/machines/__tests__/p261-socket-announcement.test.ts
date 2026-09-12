/**
 * Phase 261 item 1, layer 3. The line the app prints saying which tmux socket
 * it really chose, and which build/electron-run.mjs reads back.
 *
 * WHY IT IS PINNED HERE AS WELL AS IN THE GATE. The gate asserts that the
 * helper's READER separates the shapes; this asserts that the WRITER still
 * composes a line that reader can find. Either half moving alone is a launch
 * that asserts nothing while printing a green sentence, which is the class the
 * two incidents in build/electron-run.mjs's header belong to.
 *
 * It is pure, it starts no tmux server, it launches nothing and it reads
 * nothing under the person's home.
 */
import { describe, expect, it } from 'vitest';

import { socketAnnouncement } from '../context';

/**
 * The reader, copied from build/electron-run.mjs's `announcedSockets` rather
 * than imported, because that file is a build script this suite must not load.
 * A copy that drifts is exactly what this test would then miss, so the copy is
 * ONE regular expression and the gate reads the shipping one.
 */
function announcedSocket(text: string): string | null {
  const m = /^\[gmux-socket\] local tmux socket: (\S+)/m.exec(text);
  return m === null ? null : (m[1] as string);
}

describe('socketAnnouncement', () => {
  it('names the socket the app chose, and the reader finds it', () => {
    const line = socketAnnouncement('gmux-p261-1234', {
      GMUX_TMUX_SOCKET: 'gmux-p261-1234',
      GMUX_PROBES: '0'
    });
    expect(line).toBe(
      '[gmux-socket] local tmux socket: gmux-p261-1234 ' +
        '(GMUX_TMUX_SOCKET=gmux-p261-1234, harness launch: yes)'
    );
    expect(announcedSocket(line)).toBe('gmux-p261-1234');
  });

  it('says so when the override was ignored, which is the failure it exists for', () => {
    // The shape of both incidents: a socket set, no harness term, so
    // activeTmuxSocket answers `gmux` and the app runs on the operator's live
    // server. The reader must be able to see the mismatch in this one line.
    const line = socketAnnouncement('gmux', {
      GMUX_TMUX_SOCKET: 'gmux-p134-about-1234'
    });
    expect(line).toContain('harness launch: no');
    expect(announcedSocket(line)).toBe('gmux');
    expect(announcedSocket(line)).not.toBe('gmux-p134-about-1234');
  });

  it('reads "unset" rather than an empty gap when no override was given', () => {
    const line = socketAnnouncement('gmux', {});
    expect(line).toBe(
      '[gmux-socket] local tmux socket: gmux ' +
        '(GMUX_TMUX_SOCKET=unset, harness launch: no)'
    );
  });

  it('counts every one of the four harness terms, at any value', () => {
    for (const term of [
      'GMUX_SMOKE',
      'GMUX_SHOT',
      'GMUX_UPDATE_REHEARSAL',
      'GMUX_PROBES'
    ]) {
      const line = socketAnnouncement('gmux-p261-1', {
        GMUX_TMUX_SOCKET: 'gmux-p261-1',
        [term]: '0'
      });
      expect(line, term).toContain('harness launch: yes');
    }
  });

  it('is one line, so a reader anchored at the start of a line finds it', () => {
    const line = socketAnnouncement('gmux-p261-1', {
      GMUX_TMUX_SOCKET: 'gmux-p261-1',
      GMUX_PROBES: '1'
    });
    expect(line.includes('\n')).toBe(false);
    expect(announcedSocket(`noise\n${line}\nmore noise\n`)).toBe('gmux-p261-1');
  });
});
