/**
 * The settle window, and the asymmetry that is the whole of it (Phase 63).
 *
 * A downgrade waits for a second opinion. An upgrade publishes at once. The
 * reason is that an agent rewriting forty files leaves the tree half written
 * for seconds, so a promise can LOOK broken and not be, while a promise that
 * has started holding again cannot be transiently right.
 */

import { afterEach, describe, expect, it } from 'vitest';
import type { ArchVerdict } from '@shared/arch';
import {
  ARCH_SETTLE_MS,
  applySettleWindow,
  stopArchWatch,
  unwatchArchRepo,
  watchArchRepo,
  watchedArchRepos
} from '../watch';
import { DEFAULT_DEBOUNCE_MS } from '../../watcher';

const REPO = '/somewhere/project';

function verdict(
  subjectId: string,
  status: ArchVerdict['status'],
  coverage: ArchVerdict['coverage'] = 'checked'
): ArchVerdict {
  return {
    subjectId,
    status,
    coverage,
    checkedAtCommit: 'a'.repeat(40),
    generation: 1,
    firstCheck: false,
    reason: null,
    durationMs: 1
  };
}

afterEach(() => {
  stopArchWatch();
});

describe('the settle window', () => {
  it('states itself as a multiple of the watcher own window, never as a copy of 150', () => {
    // Research 49 wrote the coalescing window down as 150 ms and the file has
    // read 300 ms since before that was written.
    expect(DEFAULT_DEBOUNCE_MS).toBe(300);
    expect(ARCH_SETTLE_MS).toBe(DEFAULT_DEBOUNCE_MS * 8);
    expect(ARCH_SETTLE_MS).toBeLessThan(5_000);
  });

  it('holds a downgrade once, then publishes it when the second run agrees', () => {
    watchArchRepo(REPO);
    const held = applySettleWindow(
      REPO,
      [verdict('edge:one', 'convergent')],
      [verdict('edge:one', 'divergent')]
    );
    expect(held.held).toEqual(['edge:one']);
    expect(held.publish[0]?.status).toBe('convergent');

    const again = applySettleWindow(
      REPO,
      [verdict('edge:one', 'convergent')],
      [verdict('edge:one', 'divergent')]
    );
    expect(again.held).toEqual([]);
    expect(again.publish[0]?.status).toBe('divergent');
  });

  it('publishes an upgrade at once, because it cannot be transiently right', () => {
    watchArchRepo(REPO);
    const result = applySettleWindow(
      REPO,
      [verdict('edge:one', 'divergent')],
      [verdict('edge:one', 'convergent')]
    );
    expect(result.held).toEqual([]);
    expect(result.publish[0]?.status).toBe('convergent');
  });

  it('does not hold a failure that is merely moving, so a break is never hidden behind a stale one', () => {
    watchArchRepo(REPO);
    const result = applySettleWindow(
      REPO,
      [verdict('edge:one', 'divergent')],
      [verdict('edge:one', 'absent')]
    );
    expect(result.held).toEqual([]);
    expect(result.publish[0]?.status).toBe('absent');
  });

  it('holds a fall out of checked coverage too, not only a status change', () => {
    watchArchRepo(REPO);
    const result = applySettleWindow(
      REPO,
      [verdict('edge:one', 'convergent')],
      [verdict('edge:one', 'unverifiable', 'unverifiable')]
    );
    expect(result.held).toEqual(['edge:one']);
    expect(result.publish[0]?.coverage).toBe('checked');
  });

  it('publishes a brand new subject with no history at once', () => {
    watchArchRepo(REPO);
    const result = applySettleWindow(REPO, [], [verdict('edge:new', 'divergent')]);
    expect(result.held).toEqual([]);
    expect(result.publish[0]?.status).toBe('divergent');
  });

  it('arms a repository once and drops it when its tab closes', () => {
    expect(watchArchRepo(REPO)).toBe(true);
    expect(watchArchRepo(REPO)).toBe(false);
    expect(watchedArchRepos()).toEqual([REPO]);
    unwatchArchRepo(REPO);
    expect(watchedArchRepos()).toEqual([]);
  });
});
