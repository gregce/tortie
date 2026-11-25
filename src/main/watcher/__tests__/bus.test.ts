/**
 * The repo-changed fan-out. Small, but it now sits between the ONE watcher
 * per repo and BOTH of its consumers, so "git still gets every event it used
 * to" is a property worth pinning down rather than assuming.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emitRepoChanged,
  onRepoChanged,
  resetRepoChangedListeners
} from '../bus';

describe('repo-changed bus', () => {
  beforeEach(() => {
    resetRepoChangedListeners();
  });

  it('delivers every emit to every subscriber, in order', () => {
    const git: string[] = [];
    const search: string[] = [];
    onRepoChanged((p) => git.push(p));
    onRepoChanged((p) => search.push(p));

    emitRepoChanged('/a');
    emitRepoChanged('/b');

    expect(git).toEqual(['/a', '/b']);
    expect(search).toEqual(['/a', '/b']);
  });

  it('stops delivering after unsubscribe', () => {
    const seen: string[] = [];
    const off = onRepoChanged((p) => seen.push(p));
    emitRepoChanged('/a');
    off();
    emitRepoChanged('/b');
    expect(seen).toEqual(['/a']);
  });

  it('one throwing subscriber cannot silence the others', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const seen: string[] = [];
    onRepoChanged(() => {
      throw new Error('boom');
    });
    onRepoChanged((p) => seen.push(p));

    expect(() => emitRepoChanged('/a')).not.toThrow();
    expect(seen).toEqual(['/a']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  // PHASE 371, B1: the one bit it carries beside the repository.
  it('says git\'s own data may have moved unless the caller says it did not', () => {
    const heard: unknown[][] = [];
    onRepoChanged((...args) => heard.push(args));

    emitRepoChanged('/a');
    emitRepoChanged('/b', false);
    emitRepoChanged('/c', true);

    expect(heard).toEqual([
      ['/a', true],
      ['/b', false],
      ['/c', true]
    ]);
  });

  it('a throwing subscriber costs no other its value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const heard: unknown[][] = [];
    onRepoChanged(() => {
      throw new Error('boom');
    });
    onRepoChanged((...args) => heard.push(args));

    emitRepoChanged('/a', false);
    emitRepoChanged('/a');

    expect(heard).toEqual([
      ['/a', false],
      ['/a', true]
    ]);
    warn.mockRestore();
  });

  it('emitting with no subscribers is a no-op', () => {
    expect(() => emitRepoChanged('/a')).not.toThrow();
  });
});
