/**
 * WHAT THE ONE BUTTON ACTUALLY DOES, run rather than read (Phase 63 fix
 * round, rewritten whole in Phase 158).
 *
 * The Phase 63 version of this file existed because the shipped sentence
 * under the draft control promised one thing while the gesture did another,
 * and only driving the store action caught it. Phase 158 changed what the
 * gesture IS: the operator's amendment moved the write into main, so the
 * skeleton lands as an ordinary uncommitted change in Source Control and the
 * renderer opens no buffers and creates no folders. This file drives the
 * rewritten action and holds the new promises the same way the old file held
 * the old ones:
 *
 *  - the gesture is ONE ask to main's seed channel and nothing else reaches
 *    the filesystem from this side, not `fs.createFolder`, not `writeFile`,
 *    not an editor buffer;
 *  - the contract is read back after the write, so the cockpit draws what
 *    landed;
 *  - the same one gesture continues into the enriching pass when this build
 *    has one, and stops at the skeleton when it does not, which is the one
 *    path ruling made executable;
 *  - a build with no seed channel does nothing at all.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { localTarget } from '@shared/workspace-target';
import { ARCH_DRAFT_BODY } from '../copy';
import { useArch } from '../store';

interface Recorded {
  seeds: string[];
  enriches: string[];
  loads: string[];
  folders: string[];
  files: string[];
  opened: string[];
}

const seen: Recorded = {
  seeds: [],
  enriches: [],
  loads: [],
  folders: [],
  files: [],
  opened: []
};
const realWindow = (globalThis as { window?: unknown }).window;

/** One pass status shaped answer, enough for the store to hold. */
function status(cwd: string): Record<string, unknown> {
  return { cwd, running: false, suspended: null, chosen: false, lastRun: null };
}

function stand(over: { pass: boolean }): void {
  const arch: Record<string, unknown> = {
    load: (input: { cwd: string }) => {
      seen.loads.push(input.cwd);
      return Promise.resolve({
        cwd: input.cwd,
        present: true,
        contract: null,
        components: [],
        edges: [],
        baseline: { accepted: [] },
        problems: [],
        lastValid: false,
        verdicts: [],
        freshness: [],
        counts: {
          checkedHold: 0,
          broke: 0,
          cannotCheck: 0,
          accepted: 0,
          unresolvedImports: 0,
          totalImports: 0
        },
        checkedAtCommit: null,
        narratedAtCommit: null
      });
    },
    seed: (input: { cwd: string }) => {
      seen.seeds.push(input.cwd);
      return Promise.resolve({
        cwd: input.cwd,
        ok: true,
        reason: null,
        wrote: ['docs/arch/contract.json']
      });
    }
  };
  if (over.pass) {
    arch['enrich'] = (input: { cwd: string }) => {
      seen.enriches.push(input.cwd);
      // The gesture with no agent picked: refused before any spawn, and the
      // store still lands an honest face rather than an error.
      return Promise.resolve({
        cwd: input.cwd,
        started: false,
        refusal: 'no-choice',
        run: null,
        seeded: []
      });
    };
    arch['passStatus'] = (input: { cwd: string }) =>
      Promise.resolve(status(input.cwd));
    arch['onPass'] = () => () => undefined;
  }
  (globalThis as { window?: unknown }).window = {
    dispatchEvent: (e: Event) => {
      const detail = (e as CustomEvent<{ relPath: string }>).detail;
      seen.opened.push(detail.relPath);
      return true;
    },
    gmux: {
      arch,
      fs: {
        createFolder: (input: { root: string; path: string }) => {
          seen.folders.push(input.path);
          return Promise.resolve({ ok: true });
        },
        writeFile: () => {
          seen.files.push('writeFile');
          return Promise.resolve({ ok: true });
        }
      }
    }
  };
}

beforeEach(() => {
  seen.seeds = [];
  seen.enriches = [];
  seen.loads = [];
  seen.folders = [];
  seen.files = [];
  seen.opened = [];
  useArch.setState({
    target: localTarget('/repo'),
    drafting: false,
    enriching: false,
    passes: {}
  });
});

afterEach(() => {
  (globalThis as { window?: unknown }).window = realWindow;
  useArch.setState({
    target: null,
    drafting: false,
    enriching: false,
    passes: {}
  });
});

describe('the one path in, driven', () => {
  it('asks main to write the skeleton and touches nothing itself', async () => {
    stand({ pass: false });
    await useArch.getState().draft();
    expect(seen.seeds).toEqual(['/repo']);
    // The renderer creates no folder, writes no file and opens no buffer.
    // Main's one writer module owns all of that now.
    expect(seen.folders).toEqual([]);
    expect(seen.files).toEqual([]);
    expect(seen.opened).toEqual([]);
    // And the contract is read back so the cockpit draws what landed.
    expect(seen.loads).toContain('/repo');
  });

  it('continues the same gesture into the pass when this build has one', async () => {
    stand({ pass: true });
    await useArch.getState().draft();
    expect(seen.seeds).toEqual(['/repo']);
    // ONE gesture, no fork: the pass is asked without a second button. Main
    // holds the Settings choice and the confirm gate, so with no agent
    // picked that ask answers idle and starts nothing.
    expect(seen.enriches).toEqual(['/repo']);
  });

  it('stops at the skeleton when the build has no pass half', async () => {
    stand({ pass: false });
    await useArch.getState().draft();
    expect(seen.enriches).toEqual([]);
  });

  it('does nothing at all when the build has no seed channel', async () => {
    stand({ pass: false });
    const w = (
      globalThis as { window: { gmux: { arch: Record<string, unknown> } } }
    ).window;
    delete w.gmux.arch['seed'];
    await useArch.getState().draft();
    expect(seen.seeds).toEqual([]);
    expect(seen.folders).toEqual([]);
    expect(seen.opened).toEqual([]);
  });

  it('says the write out loud before the button is pressed', () => {
    // The control's sentence names the write and where to review it. The
    // Phase 63 lesson stands: the sentence and the gesture must not diverge.
    expect(ARCH_DRAFT_BODY).toContain('docs/arch');
    expect(ARCH_DRAFT_BODY).toContain('Source Control');
    expect(ARCH_DRAFT_BODY).toContain('uncommitted');
    // And it never claims the old buffer flow, which is gone.
    expect(ARCH_DRAFT_BODY).not.toContain('Save');
    expect(ARCH_DRAFT_BODY).not.toContain('drafts you have not saved');
  });
});
