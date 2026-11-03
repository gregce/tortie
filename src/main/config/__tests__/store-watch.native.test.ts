/**
 * The agents.json watcher over real FSEvents (Phase 145 stage 5).
 *
 * Check type: adapter integration test, native watcher lane. Environment
 * requirement: the platform's native file event stream through the
 * repository's installed @parcel/watcher binding, which is FSEvents on macOS.
 * Skip rule: none; a missing or broken binding here is a failure, never a
 * silent skip. Run this lane alone with `npm run test:native`; `npm test`
 * includes it.
 *
 * This is the live half of the split made when the watcher CONTRACT moved to
 * a mocked backend inside store.test.ts: what is proven here is only that the
 * native primitive really delivers a change on the overlay file to the
 * production subscription, end to end from a disk write to a re-read.
 * Delivery can lag about a second, so the wait is generous and the assertion
 * is on the result rather than on the timing.
 *
 * THE RULE THIS LANE ASSERTS BY (Phase 308), the same as
 * src/main/watcher/__tests__/repo-watcher.native.test.ts's: a native lane
 * asserts what the production contract promises, the contract promises a
 * re-read for a dropped batch, and a sleep never carries a negative assertion
 * alone. This file holds no negative assertion. Its one wait is a condition
 * with a 10 s give-up bound, and when the bound is reached it says how many
 * times the overlay was read from disk, so a repeat of the one failure seen in
 * the 0.109.0 battery reads as a delivery problem (no read after the boot
 * read) or a wiring problem (a read that did not take) rather than as neither.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: () => Buffer.from(''),
    decryptString: () => ''
  }
}));

const {
  agentEntry,
  agentOverlayDiskReads,
  loadAgentOverlay,
  resetAgentOverlayStoreForTests,
  startAgentOverlayWatch,
  stopAgentOverlayWatch
} = await import('../store');
const { agentOverlayPath, ensureConfigDir } = await import('../paths');

const OWL = {
  schema: 1,
  agents: [
    {
      id: 'owl',
      displayName: 'Owl',
      binaries: ['owl'],
      launch: { argv: ['owl'] }
    }
  ]
};

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-config-'));
  resetAgentOverlayStoreForTests();
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

describe('the watcher over the native stream', () => {
  it('re-reads the file after it changes on disk', async () => {
    ensureConfigDir();
    loadAgentOverlay('boot');
    expect(agentEntry('owl')).toBeNull();
    const watching = await startAgentOverlayWatch();
    expect(watching).toBe(true);
    try {
      writeFileSync(agentOverlayPath(), JSON.stringify(OWL, null, 2), 'utf8');
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline && agentEntry('owl') === null) {
        await new Promise((r) => setTimeout(r, 100));
      }
      const reads = agentOverlayDiskReads();
      const said =
        `agentOverlayDiskReads() = ${String(reads)}: ` +
        (reads > 1
          ? 'the change was delivered and the file re-read, and the entry still did not take, which is wiring'
          : 'nothing after the boot read, so the change was never delivered by the native stream');
      if (agentEntry('owl') === null) console.error(`store-watch.native: no entry within 10 s; ${said}`);
      expect(agentEntry('owl')?.displayName, said).toBe('Owl');
      expect(reads, said).toBeGreaterThan(1);
    } finally {
      await stopAgentOverlayWatch();
    }
  }, 20_000);
});
