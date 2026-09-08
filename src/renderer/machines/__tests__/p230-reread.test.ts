/**
 * Phase 230. One hook re-reads a remote view, and it retries exactly once per
 * sign in and never on a folder's own refusal.
 *
 * THE CLAIM. Phase 90.3's fix round gave two views one extra read the moment
 * their machine started answering, and wrote the same eight lines into each.
 * Research 85 section 4.1 measured the other five views without it: a sentence
 * saying the machine did not answer stayed on screen with the link long since
 * connected. Phase 230 lifts the shape into ../reread.ts and one hook,
 * ../use-remote-reread.ts, and every remote view reads through it.
 *
 * WHAT THIS PINS, and each clause goes red on its own when ablated:
 *
 *   1. one extra read per sign in, and not two: the second consider with the
 *      same key, the same link and the same refusal answers false
 *   2. a second sign in buys a second read: quiet then connected answers true
 *      again for the same key
 *   3. never on a folder's own refusal: `missing`, `denied`, `notRepo` and
 *      the rest fold to `answered`, and `answered` never retries
 *   4. never while a read is in flight, and the retry is not spent by it
 *   5. a local tab is inert and forgets what it spent
 *   6. the looked, focus and write moments read only when there is something
 *      on screen to bring up to date and the machine is answering
 *   7. the two buses attach nothing until asked and release the last listener,
 *      which is what the leak probe counts
 *   8. the seven views reach the hook, and none of them carries a copy of the
 *      eight lines any more (extract, never copy five times)
 *   9. the hook has one timer, the coalescing window, and no interval
 *
 * There is no document in this test runner, so the hook itself is not
 * rendered; its decisions are the pure functions here, and the hook's own text
 * is read for which of them it calls at which moment.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createSignInRetry,
  heldOfMode,
  rereadNow,
  type RereadHeld
} from '../reread';
import { createLookedBus, createRemoteWriteBus } from '../remote-writes';

const ROOT = resolve(import.meta.dirname, '../../../..');
const read = (rel: string): string =>
  readFileSync(resolve(ROOT, rel), 'utf8');

const KEY = 'studio:/Users/greg/rookery';

describe('the sign in retry', () => {
  it('reads once when the machine starts answering over a link refusal', () => {
    const retry = createSignInRetry();
    // The tab was opened on a link that was not up: the first read was refused.
    expect(retry.consider(KEY, false, 'refused')).toBe(false);
    // The link comes up. One more read.
    expect(retry.consider(KEY, true, 'refused')).toBe(true);
  });

  it('never reads twice on one sign in (clause 1)', () => {
    const retry = createSignInRetry();
    expect(retry.consider(KEY, true, 'refused')).toBe(true);
    // The read it caused was refused again: the sentence stays up.
    expect(retry.consider(KEY, true, 'refused')).toBe(false);
    expect(retry.consider(KEY, true, 'refused')).toBe(false);
  });

  it('reads again on the next sign in (clause 2)', () => {
    const retry = createSignInRetry();
    expect(retry.consider(KEY, true, 'refused')).toBe(true);
    expect(retry.consider(KEY, true, 'refused')).toBe(false);
    // The machine drops.
    expect(retry.consider(KEY, false, 'refused')).toBe(false);
    // And answers again: the second sign in buys a second read.
    expect(retry.consider(KEY, true, 'refused')).toBe(true);
    expect(retry.consider(KEY, true, 'refused')).toBe(false);
  });

  it("never reads on the folder's own refusal (clause 3)", () => {
    const retry = createSignInRetry();
    for (const own of [
      'missing',
      'denied',
      'notdir',
      'notRepo',
      'noBranch',
      'noCommits',
      'noDetails',
      'notGitHub',
      'noHome',
      'badPattern',
      'ok',
      'repo',
      'walk',
      'context'
    ]) {
      expect(heldOfMode(own, false)).toBe('answered');
      expect(retry.consider(KEY, true, heldOfMode(own, false))).toBe(false);
    }
    // Only the two link words are a refusal the retry acts on.
    expect(heldOfMode('notConnected', false)).toBe('refused');
    expect(heldOfMode('unreachable', false)).toBe('refused');
    expect(heldOfMode(null, false)).toBe('none');
  });

  it('does not spend the retry while a read is in flight (clause 4)', () => {
    const retry = createSignInRetry();
    expect(heldOfMode('notConnected', true)).toBe('reading');
    expect(retry.consider(KEY, true, 'reading')).toBe(false);
    // The read lands refused: the retry is still owed.
    expect(retry.consider(KEY, true, 'refused')).toBe(true);
  });

  it('is inert on a local tab and forgets what it spent (clause 5)', () => {
    const retry = createSignInRetry();
    expect(retry.consider(KEY, true, 'refused')).toBe(true);
    expect(retry.consider(null, true, 'refused')).toBe(false);
    // Back on the machine tab with the link still up: a fresh retry.
    expect(retry.consider(KEY, true, 'refused')).toBe(true);
  });

  it('spends one retry per key, so a second folder on the machine gets its own', () => {
    const retry = createSignInRetry();
    expect(retry.consider(KEY, true, 'refused')).toBe(true);
    expect(retry.consider('studio:/Users/greg/orca', true, 'refused')).toBe(
      true
    );
  });

  it('never reads on nothing asked, because the store owns the first read', () => {
    const retry = createSignInRetry();
    expect(retry.consider(KEY, true, 'none')).toBe(false);
    expect(retry.consider(KEY, true, 'answered')).toBe(false);
  });
});

describe('the looked, focus and write moments (clause 6)', () => {
  const table: [RereadHeld, boolean, boolean, boolean][] = [
    // held, answering, active, want
    ['answered', true, true, true],
    ['refused', true, true, true],
    ['none', true, true, false],
    ['reading', true, true, false],
    ['answered', false, true, false],
    ['answered', true, false, false],
    ['refused', false, true, false]
  ];
  for (const [held, answering, active, want] of table) {
    it(`${held}, answering ${String(answering)}, active ${String(active)} → ${String(want)}`, () => {
      expect(rereadNow({ key: KEY, held, answering, active })).toBe(want);
    });
  }

  it('never reads a local tab', () => {
    expect(
      rereadNow({ key: null, held: 'answered', answering: true, active: true })
    ).toBe(false);
  });
});

describe('the write bus (clause 7)', () => {
  it('hands every write to every listener, and releases one that left', () => {
    const bus = createRemoteWriteBus();
    const heard: string[] = [];
    const offA = bus.subscribe((w) => heard.push(`a:${w.kind}:${w.by}`));
    const offB = bus.subscribe((w) => heard.push(`b:${w.kind}:${w.by}`));
    expect(bus.size()).toBe(2);
    bus.announce({ machineId: 'studio', path: '/p', kind: 'file', by: 'editor' });
    expect(heard).toEqual(['a:file:editor', 'b:file:editor']);
    offA();
    bus.announce({ machineId: 'studio', path: '/p', kind: 'commit', by: 'changes' });
    expect(heard).toEqual([
      'a:file:editor',
      'b:file:editor',
      'b:commit:changes'
    ]);
    offB();
    expect(bus.size()).toBe(0);
  });

  it('survives a listener that unsubscribes while being run', () => {
    const bus = createRemoteWriteBus();
    let count = 0;
    const off = bus.subscribe(() => {
      count += 1;
      off();
    });
    bus.subscribe(() => {
      count += 1;
    });
    bus.announce({ machineId: 'm', path: '/p', kind: 'index', by: 'changes' });
    expect(count).toBe(2);
    expect(bus.size()).toBe(1);
  });
});

describe('the looked bus (clause 7)', () => {
  it('attaches on the first listener, fires every one, and detaches with the last', () => {
    let attached = 0;
    let detached = 0;
    let fire: (() => void) | null = null;
    const bus = createLookedBus((f) => {
      attached += 1;
      fire = f;
      return () => {
        detached += 1;
        fire = null;
      };
    });
    expect(attached).toBe(0);
    const heard: string[] = [];
    const offA = bus.subscribe(() => heard.push('a'));
    const offB = bus.subscribe(() => heard.push('b'));
    expect(attached).toBe(1);
    expect(bus.size()).toBe(2);
    (fire as (() => void) | null)?.();
    expect(heard).toEqual(['a', 'b']);
    offA();
    expect(detached).toBe(0);
    offB();
    expect(detached).toBe(1);
    expect(fire).toBe(null);
    // A new subscriber attaches again.
    const offC = bus.subscribe(() => heard.push('c'));
    expect(attached).toBe(2);
    offC();
    expect(detached).toBe(2);
  });
});

/** Strip block and line comments, so a record of the deletion cannot trip a scan. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('the seven views reach the hook (clause 8)', () => {
  const VIEWS = [
    'src/renderer/tree/FilesSection.tsx',
    'src/renderer/scm/ScmSection.tsx',
    'src/renderer/scm/RemoteHistorySection.tsx',
    'src/renderer/scm/RemoteBranchSection.tsx',
    'src/renderer/scm/RemoteRunsSection.tsx',
    'src/renderer/search/SearchView.tsx',
    'src/renderer/context/ContextView.tsx'
  ];
  for (const view of VIEWS) {
    it(`${view} calls useRemoteReread and carries no copy of the retry`, () => {
      const text = code(read(view));
      expect(text).toContain('useRemoteReread(');
      // The Phase 90.3 shape, as it was written twice: a ref named `retried`
      // holding the target the retry was spent on. It lives in ../reread.ts
      // now and nowhere else.
      expect(text).not.toMatch(/retried\s*=\s*useRef/);
      expect(text).not.toContain('retried.current');
    });
  }

  it('the hook holds the retry, and the retry holds the one ref', () => {
    const hook = code(read('src/renderer/machines/use-remote-reread.ts'));
    expect(hook).toContain('createSignInRetry()');
    expect(hook).toContain('rereadNow(');
    expect(hook).toContain('onWindowLooked(');
    expect(hook).toContain('onRemoteWrite(');
  });
});

describe('every write that lands announces itself (the write moment)', () => {
  const SITES: [string, string, number][] = [
    // file, announcer, how many landing sites
    ['src/renderer/editor/tab-io.ts', 'editor', 1],
    ['src/renderer/tree/tree-ops.ts', 'explorer', 3],
    ['src/renderer/scm/remote-changes.ts', 'changes', 2]
  ];
  for (const [file, by, count] of SITES) {
    it(`${file} announces as ${by} at ${String(count)} site(s)`, () => {
      const text = code(read(file));
      expect(text.split('announceRemoteWrite({').length - 1).toBe(count);
      expect(text.split(`by: '${by}'`).length - 1).toBe(count);
    });
  }

  it('the six sites are the six write words the charter names', () => {
    // putFile → wrote (the editor's save and the Explorer's new file), makeDir
    // → made, renameEntry → moved or done, stage and unstage, commit.
    const tabIo = code(read('src/renderer/editor/tab-io.ts'));
    expect(tabIo).toMatch(/outcome === 'wrote'[\s\S]{0,600}announceRemoteWrite/);
    const ops = code(read('src/renderer/tree/tree-ops.ts'));
    expect(ops).toMatch(/outcome !== 'wrote'[\s\S]{0,900}announceRemoteWrite/);
    expect(ops).toMatch(/outcome !== 'made'[\s\S]{0,900}announceRemoteWrite/);
    expect(ops).toMatch(/outcome !== 'moved' && result.outcome !== 'done'[\s\S]{0,1600}announceRemoteWrite/);
    const changes = code(read('src/renderer/scm/remote-changes.ts'));
    expect(changes).toMatch(/outcome === 'done' \|\| outcome === 'partial'[\s\S]{0,200}kind: 'index'/);
    expect(changes).toMatch(/outcome === 'committed'[\s\S]{0,200}kind: 'commit'/);
  });
});

describe('the hook has one timer and no interval (clause 9)', () => {
  it('names setTimeout once, for the coalescing window, and setInterval never', () => {
    const hook = code(read('src/renderer/machines/use-remote-reread.ts'));
    expect(hook.split('setTimeout(').length - 1).toBe(1);
    expect(hook).toContain('REMOTE_REREAD_COALESCE_MS');
    expect(hook).not.toContain('setInterval');
    expect(hook).not.toContain('requestAnimationFrame');
    const bus = code(read('src/renderer/machines/remote-writes.ts'));
    expect(bus).not.toContain('setTimeout');
    expect(bus).not.toContain('setInterval');
    const gate = code(read('src/renderer/machines/reread.ts'));
    expect(gate).not.toContain('setTimeout');
    expect(gate).not.toContain('setInterval');
  });

  it('the coalescing window is the local watcher bus window', () => {
    const hook = read('src/renderer/machines/use-remote-reread.ts');
    const local = read('src/renderer/state/repo-changed.ts');
    const want = /REPO_CHANGED_DEBOUNCE_MS = (\d+)/.exec(local)?.[1];
    const have = /REMOTE_REREAD_COALESCE_MS = (\d+)/.exec(hook)?.[1];
    expect(want).toBeDefined();
    expect(have).toBe(want);
  });
});
