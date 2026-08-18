/**
 * The folders inside one folder on another machine (Phase 84, item 6).
 *
 * The parse and the two pure helpers are tested for real. The read itself
 * crosses to another computer, and a mocked spawn would prove the mock, so the
 * live listing is driven in `GMUX_SMOKE=remote-sessions` against a scratch
 * machine and by `npm run probe:realunknowns` against a real one.
 *
 * The parse is the part that matters. A wrong answer here is a picker that
 * names a file as a folder, or a create refused for a folder that is there.
 */

import { describe, expect, it } from 'vitest';
import {
  REMOTE_DIR_CHECK_CAP,
  dirRefusalText,
  parentOfRemoteDir,
  parseDirList
} from '../dir-list';
import {
  REMOTE_DIR_DENIED,
  REMOTE_DIR_MISSING,
  REMOTE_DIR_NOT_A_FOLDER
} from '../remote-copy';

describe('reading what the machine listed', () => {
  it('reads the count, the path and the names', () => {
    const answer = parseDirList('ok 3 /Users/gdc\nsrc/\ndocs/\nbuild/');
    expect(answer).toEqual({
      status: 'ok',
      path: '/Users/gdc',
      total: 3,
      names: ['src', 'docs', 'build']
    });
  });

  /**
   * The count comes before the path because a folder on another computer can
   * hold a space in its name, so the path is the rest of the line.
   */
  it('keeps a path that holds a space', () => {
    expect(parseDirList('ok 1 /Users/gdc/my work\na/')?.path).toBe(
      '/Users/gdc/my work'
    );
  });

  it('keeps a folder name that holds a space', () => {
    expect(parseDirList('ok 1 /tmp\nmy folder/')?.names).toEqual(['my folder']);
  });

  /**
   * `ls -A -p` marks a directory with a trailing slash. A line without one is
   * not a folder and is dropped rather than guessed at, which is what makes a
   * file name holding a newline unable to appear in a folder picker.
   */
  it('drops a line that is not a folder', () => {
    expect(parseDirList('ok 1 /tmp\nreal/\nnot-a-folder')?.names).toEqual([
      'real'
    ]);
  });

  it('never reports fewer folders than it listed', () => {
    // A machine whose count and listing disagree is a machine mid change. The
    // larger of the two is the honest one, because the names are proof.
    expect(parseDirList('ok 0 /tmp\na/\nb/')?.total).toBe(2);
  });

  it('reads a folder holding nothing', () => {
    expect(parseDirList('ok 0 /tmp/empty\n')).toEqual({
      status: 'ok',
      path: '/tmp/empty',
      total: 0,
      names: []
    });
  });

  it('reads each refusal word and the path it names', () => {
    expect(parseDirList('missing /nope\n')).toEqual({
      status: 'missing',
      path: '/nope',
      total: 0,
      names: []
    });
    expect(parseDirList('notdir /tmp/a.txt\n')?.status).toBe('notdir');
    expect(parseDirList('denied /root\n')?.status).toBe('denied');
  });

  it('answers null for anything it was not written to read', () => {
    expect(parseDirList('')).toBeNull();
    expect(parseDirList('ok')).toBeNull();
    expect(parseDirList('ok /tmp')).toBeNull();
    expect(parseDirList('something /tmp')).toBeNull();
    expect(parseDirList('ok notanumber /tmp')).toBeNull();
  });
});

describe('the folder one level up', () => {
  it('cuts the machine’s own answer rather than composing a path', () => {
    expect(parentOfRemoteDir('/Users/gdc/code')).toBe('/Users/gdc');
    expect(parentOfRemoteDir('/Users')).toBe('/');
  });

  it('has no level up at the root', () => {
    expect(parentOfRemoteDir('/')).toBeNull();
  });

  it('has no level up for anything that is not an absolute path', () => {
    expect(parentOfRemoteDir('')).toBeNull();
    expect(parentOfRemoteDir('code')).toBeNull();
  });

  it('ignores a trailing slash the machine put there', () => {
    expect(parentOfRemoteDir('/Users/gdc/')).toBe('/Users');
  });
});

describe('the sentence a person reads', () => {
  it('gives each refusal the sentence written for it', () => {
    expect(dirRefusalText('missing', 'Studio')).toBe(REMOTE_DIR_MISSING);
    expect(dirRefusalText('notdir', 'Studio')).toBe(REMOTE_DIR_NOT_A_FOLDER);
    expect(dirRefusalText('denied', 'Studio')).toBe(REMOTE_DIR_DENIED);
  });

  it('names the machine when the machine did not answer', () => {
    expect(dirRefusalText('unreachable', 'Studio')).toContain('Studio');
  });

  it('names no transport and carries no dash', () => {
    for (const refusal of ['missing', 'notdir', 'denied', 'unreachable'] as const) {
      const sentence = dirRefusalText(refusal, 'Studio');
      expect(sentence).not.toMatch(/[—–]/);
      for (const word of ['ssh', 'tmux', 'socket', 'pane', 'prefix']) {
        expect(sentence.toLowerCase(), refusal).not.toContain(word);
      }
    }
  });
});

describe('the cap the folder check asks for', () => {
  /**
   * It cannot ask for none. BSD `head -n 0` refuses with "illegal line count",
   * and a script that prints an error on the ordinary path is a script whose
   * answer nobody can read.
   */
  it('is one rather than zero', () => {
    expect(REMOTE_DIR_CHECK_CAP).toBe(1);
  });
});
