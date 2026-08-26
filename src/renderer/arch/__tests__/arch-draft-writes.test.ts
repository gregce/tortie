/**
 * WHAT THE DRAFT BUTTON ACTUALLY WRITES, run rather than read (Phase 63 fix
 * round).
 *
 * The verification round found the shipped sentence under "Draft a contract"
 * promising that Tortie writes nothing, while pressing the button created
 * `docs/arch/` and `docs/arch/components/` on the person's disk. Two runs of
 * the live app measured the docs directory going from four entries to five
 * within five seconds of the click.
 *
 * The sibling test file checks the SOURCE TEXT of these modules, which is how
 * that defect survived: no file contained `fs.writeFile`, every ban held, and
 * the folder creation is a different verb. So this file drives the action
 * instead. It stands the bridge up, presses the same store action the button
 * presses, and records every path that reached `fs.createFolder`.
 *
 * THE ASSERTION THAT MATTERS is the last one: every folder the gesture creates
 * has to be NAMED in the sentence the person reads before pressing. If a later
 * round teaches the skeleton to write a fifth file in a new directory, this
 * test fails until the sentence says so.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ARCH_DIR, ARCH_FILES } from '@shared/arch';
import { localTarget } from '@shared/workspace-target';
import { ARCH_DRAFT_BODY } from '../copy';
import { useArch } from '../store';

/** The paths `src/main/arch/skeleton.ts` composes, from the shared names. */
const SKELETON_PATHS = [
  `${ARCH_DIR}/${ARCH_FILES.contract}`,
  `${ARCH_DIR}/${ARCH_FILES.components}/tmux-layer.json`,
  `${ARCH_DIR}/${ARCH_FILES.components}/renderer.json`,
  `${ARCH_DIR}/${ARCH_FILES.edges}`,
  `${ARCH_DIR}/${ARCH_FILES.baseline}`
];

interface Recorded {
  folders: string[];
  opened: string[];
  files: string[];
}

const seen: Recorded = { folders: [], opened: [], files: [] };
const realWindow = (globalThis as { window?: unknown }).window;

beforeEach(() => {
  seen.folders = [];
  seen.opened = [];
  seen.files = [];
  (globalThis as { window?: unknown }).window = {
    dispatchEvent: (e: Event) => {
      const detail = (e as CustomEvent<{ relPath: string }>).detail;
      seen.opened.push(detail.relPath);
      return true;
    },
    gmux: {
      arch: {
        load: () => Promise.resolve({}),
        skeleton: () =>
          Promise.resolve({
            files: SKELETON_PATHS.map((path) => ({ path, text: '{}\n' }))
          })
      },
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
  useArch.setState({ target: localTarget('/repo'), drafting: false });
});

afterEach(() => {
  (globalThis as { window?: unknown }).window = realWindow;
  useArch.setState({ target: null, drafting: false });
});

describe('the one write the drafting gesture makes', () => {
  it('creates the ancestor folders and nothing else', async () => {
    await useArch.getState().draft();
    // Shallowest first, because `docs/arch` cannot be made before `docs`.
    expect(seen.folders).toEqual([
      'docs',
      `${ARCH_DIR}`,
      `${ARCH_DIR}/${ARCH_FILES.components}`
    ]);
    // No file is written. Every byte lands in an unsaved editor buffer.
    expect(seen.files).toEqual([]);
    expect(seen.opened).toEqual(SKELETON_PATHS);
  });

  it('says out loud, before it is pressed, every folder it will create', async () => {
    await useArch.getState().draft();
    // `docs` is the person's own folder and every project already has it, so
    // the sentence names the two this gesture brings into being.
    const brought = seen.folders.filter((d) => d !== 'docs');
    expect(brought.length).toBeGreaterThan(0);
    for (const dir of brought) {
      expect(
        ARCH_DRAFT_BODY,
        `the button never mentions ${dir}, which pressing it creates`
      ).toContain(dir);
    }
    // And it never claims the opposite, which is the sentence that shipped.
    expect(ARCH_DRAFT_BODY).not.toContain('writes nothing until');
  });

  it('creates nothing at all when the build has no skeleton bridge', async () => {
    const w = (globalThis as { window: { gmux: { arch: Record<string, unknown> } } })
      .window;
    delete w.gmux.arch.skeleton;
    await useArch.getState().draft();
    expect(seen.folders).toEqual([]);
    expect(seen.opened).toEqual([]);
  });
});
