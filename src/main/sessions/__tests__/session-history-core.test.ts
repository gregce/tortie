/**
 * Phase 29 — the core's slice of session history, pinned without a booted
 * core:
 *
 *  - `listSessions` drops tombstones (the one filter that keeps them out of
 *    the rail, search, Context and the tab rollup), while
 *    `listRemovedSessions` carries them newest removal first;
 *  - `claimStrengthOf`, the extracted strength rule the boot claim loop and
 *    the restore path now share.
 *
 * The two list methods read only `this.manifest`, so they are invoked on the
 * real prototype against a real on-disk store — the actual code, not a copy
 * of its expression.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ManifestStore,
  SESSION_CONTRACT_VERSION,
  type ManifestSessionRecord,
  type ResumeProvenance
} from '../../manifest';
import { claimStrengthOf, GmuxCore } from '../core';

let dir: string;
let store: ManifestStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-core-history-'));
  store = new ManifestStore(join(dir, 'manifest.db'));
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

function insert(id: string, createdAt: number): void {
  store.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath: '/w',
    cwd: '/w',
    agent: 'shell',
    status: 'exited',
    createdAt,
    argv: ['/bin/zsh'],
    lastSeen: createdAt
  });
}

/** The real methods, bound to a core that holds only the manifest. */
function coreOver(manifest: ManifestStore): GmuxCore {
  return { manifest } as unknown as GmuxCore;
}

describe('listSessions and listRemovedSessions', () => {
  it('the session list drops tombstones and the panel list carries them', () => {
    insert('live-1', 1_000);
    insert('gone-1', 2_000);
    store.updateSession('live-1', { status: 'idle' });
    store.markSessionRemoved('gone-1', 5_000);

    const core = coreOver(store);
    const listed = GmuxCore.prototype.listSessions.call(core);
    expect(listed.map((s) => s.id)).toEqual(['live-1']);

    const removed = GmuxCore.prototype.listRemovedSessions.call(core);
    expect(removed.map((s) => s.id)).toEqual(['gone-1']);
    expect(removed[0]?.removedAt).toBe(5_000);
  });

  it('orders the panel newest removal first, not by creation or last_seen', () => {
    // Created in one order, removed in another: removal time must win.
    insert('a', 1_000);
    insert('b', 2_000);
    insert('c', 3_000);
    store.markSessionRemoved('b', 50_000);
    store.markSessionRemoved('a', 70_000);
    store.markSessionRemoved('c', 60_000);

    const removed = GmuxCore.prototype.listRemovedSessions.call(
      coreOver(store)
    );
    expect(removed.map((s) => s.id)).toEqual(['a', 'c', 'b']);
  });

  it('a hand edited tombstone with no stamp sorts last', () => {
    insert('stamped', 1_000);
    insert('unstamped', 2_000);
    store.markSessionRemoved('stamped', 9_000);
    store.updateSession('unstamped', { status: 'discarded' });

    const removed = GmuxCore.prototype.listRemovedSessions.call(
      coreOver(store)
    );
    expect(removed.map((s) => s.id)).toEqual(['stamped', 'unstamped']);
  });
});

describe('claimStrengthOf', () => {
  const base: ManifestSessionRecord = {
    id: 's',
    name: 's',
    tmuxName: 's',
    projectPath: '/w',
    cwd: '/w',
    agent: 'codex',
    status: 'exited',
    createdAt: 1,
    argv: ['/usr/local/bin/codex'],
    lastSeen: 1
  };

  const provenance = (
    extra: Partial<ResumeProvenance>
  ): ResumeProvenance => ({
    v: SESSION_CONTRACT_VERSION,
    source: 'store-harvest',
    confidence: 'exact',
    at: 1,
    cwd: '/w',
    ...extra
  });

  it('no provenance recorded reads as confirmed (first claim wins)', () => {
    expect(claimStrengthOf(base)).toBe('confirmed');
  });

  it('an exact harvest is confirmed', () => {
    expect(
      claimStrengthOf({ ...base, resumeProvenance: provenance({}) })
    ).toBe('confirmed');
  });

  // Phase 34. The strength a row is claimed with at boot follows the KEY that
  // recorded it, so a restart cannot freeze a folder match into an immovable
  // claim. Without these rows a reboot puts the starvation back.
  it('a folder key reads as matched, so an identity proof can still take it', () => {
    expect(
      claimStrengthOf({
        ...base,
        resumeProvenance: provenance({ key: 'cwd-newest' })
      })
    ).toBe('matched');
  });

  it('an identity key reads as confirmed', () => {
    expect(
      claimStrengthOf({
        ...base,
        resumeProvenance: provenance({ key: 'fd-owner' })
      })
    ).toBe('confirmed');
  });

  it('a row with no key at all is confirmed, because a pre-assigned id is not a guess', () => {
    expect(
      claimStrengthOf({
        ...base,
        resumeProvenance: provenance({ source: 'preassigned' })
      })
    ).toBe('confirmed');
  });

  it('a grace row keeps provisional even when it carries a folder key', () => {
    expect(
      claimStrengthOf({
        ...base,
        resumeProvenance: provenance({ key: 'cwd-newest', viaGraceTimer: true })
      })
    ).toBe('provisional');
  });

  it('a grace timer acceptance stays provisional', () => {
    expect(
      claimStrengthOf({
        ...base,
        resumeProvenance: provenance({ viaGraceTimer: true })
      })
    ).toBe('provisional');
  });

  it('grace-accepted confidence stays provisional', () => {
    expect(
      claimStrengthOf({
        ...base,
        resumeProvenance: provenance({ confidence: 'grace-accepted' })
      })
    ).toBe('provisional');
  });
});
