/**
 * Phase 127. Four controllers moved out of FileTree.tsx and nothing a person
 * sees changed.
 *
 * ## Why most of this file reads source text rather than driving a tree
 *
 * The claim of this phase is that an extraction changed nothing. The thing that
 * can break that claim silently is an effect whose DEPENDENCY LIST or CLEANUP
 * moved by one word. TypeScript cannot see it, and a behaviour test cannot see
 * it either without mounting @pierre/trees in a real shadow DOM, which the node
 * test environment here does not have. So each of the ten moved effects is
 * named below with the exact dependency array it had before the move, and the
 * assertion is that the array is in the file that now holds the effect and is
 * gone from the file that used to.
 *
 * The dependency arrays are copied from src/renderer/tree/FileTree.tsx at
 * commit 1dfbee8, which is the last commit before this phase.
 *
 * ## What this file does NOT claim
 *
 * It does not say the tree still draws rows. That is the integrator's live app
 * pass. It does not check the effects that STAYED in the component beyond
 * asserting they are still there, because they did not move.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (name: string): string =>
  readFileSync(join(HERE, '..', name), 'utf8');

const component = read('FileTree.tsx');
const model = read('use-tree-model.ts');
const rename = read('use-tree-rename.ts');
const menu = read('use-tree-menu.ts');
const drag = read('use-tree-drag.ts');

/** Every effect that moved, with the dependency array it had before it moved. */
const MOVED_EFFECTS: { what: string; file: string; deps: string }[] = [
  {
    what: 'the listing diff, fed into the model as a batch',
    file: 'use-tree-model.ts',
    deps: '}, [model, treeInput, initial, isHeld, syncTick]);'
  },
  {
    what: 're-list the folders a previous run had open',
    file: 'use-tree-model.ts',
    deps: '}, [rootLoaded, initial, rootPath, loadDir]);'
  },
  {
    what: 'git status into the model',
    file: 'use-tree-model.ts',
    deps: '}, [model, gitState]);'
  },
  {
    what: 'ask git what it ignores',
    file: 'use-tree-model.ts',
    deps:
      '  }, [\n' +
      '    isRepo,\n' +
      '    isRemote,\n' +
      '    rootPath,\n' +
      '    treeInput,\n' +
      '    ignoredEpoch,\n' +
      '    syncIgnored,\n' +
      '    resetIgnored\n' +
      '  ]);'
  },
  {
    what: 'the false dirty-descendant dot, taken back off',
    file: 'use-tree-model.ts',
    deps: '}, [dotSuppression, treeShadow]);'
  },
  {
    what: 'the expansion watch, being lazy listing plus persistence',
    file: 'use-tree-model.ts',
    deps: '}, [model, rootPath, storeKey, loadDir, openDirs, setExpandedCount]);'
  },
  {
    what: 'build the verbs for this mounted root',
    file: 'use-tree-rename.ts',
    deps: '}, [model, rootPath, hold, editorBridge, remote, remoteWriteRoot]);'
  },
  {
    what: 'the create editor listeners on the host',
    file: 'use-tree-rename.ts',
    deps: '}, [pendingVerdict, refreshNameError]);'
  },
  {
    what: 'hide or re-place the reason on every model emit',
    file: 'use-tree-rename.ts',
    deps: '}, [model, refreshNameError]);'
  },
  {
    what: 'reposition the reason on scroll and resize',
    file: 'use-tree-rename.ts',
    deps: '}, [nameErrorShown, treeShadow, refreshNameError]);'
  }
];

/** Every effect that stayed in the component, with the same array. */
const KEPT_EFFECTS: { what: string; deps: string }[] = [
  {
    what: 'register the tree handle the header drives',
    deps:
      '  }, [\n' +
      '    model,\n' +
      '    rootPath,\n' +
      '    registerHandle,\n' +
      '    openDirs,\n' +
      '    opsCreated,\n' +
      '    sanctionFilterClose,\n' +
      // PHASE 155. The Refresh button reaches the model through this handle
      // now, so the effect that registers it depends on the model's own
      // `reconcile`. It is stable while `model` is, which is already here.
      '    reconcile\n' +
      '  ]);'
  },
  { what: 'push the filter open state', deps: '}, [search.isOpen, setFilterOpen]);' },
  { what: 'name the filter field', deps: '}, [search.isOpen]);' },
  { what: 'the reopen subscription', deps: '}, [model]);' },
  { what: 'the stash guard', deps: '}, [model, sanctionFilterClose]);' },
  { what: 'place the clear button', deps: '}, [search.isOpen, treeShadow]);' }
];

const files: Record<string, string> = {
  'use-tree-model.ts': model,
  'use-tree-rename.ts': rename
};

describe('every moved effect kept its dependency list', () => {
  for (const effect of MOVED_EFFECTS) {
    it(`${effect.what} -> ${effect.file}`, () => {
      expect(files[effect.file]).toContain(effect.deps);
      expect(component).not.toContain(effect.deps);
    });
  }
});

describe('every effect that stayed is still in the component', () => {
  for (const effect of KEPT_EFFECTS) {
    it(effect.what, () => {
      expect(component).toContain(effect.deps);
    });
  }
});

describe('every moved effect kept its cleanup', () => {
  it('the verbs drop the ref on unmount', () => {
    expect(rename).toContain(
      '    return () => {\n      opsRef.current = null;\n    };'
    );
  });

  it('the create editor listeners come off in the same phase', () => {
    expect(rename).toContain(
      "      host.removeEventListener('input', onInput);\n" +
        "      host.removeEventListener('keydown', onKeyDownCapture, true);"
    );
  });

  it('the model subscription is returned as the cleanup', () => {
    expect(rename).toContain('    return unsubscribe;\n  }, [model, refreshNameError]);');
  });

  it('the reposition listeners come off both targets', () => {
    expect(rename).toContain(
      "      shadow?.removeEventListener('scroll', reposition, true);\n" +
        "      window.removeEventListener('resize', reposition);"
    );
  });

  it('the expansion watch still saves on the way out', () => {
    expect(model).toContain(
      '      unsubscribe();\n' +
        '      if (saveTimer.current !== null) {\n' +
        '        clearTimeout(saveTimer.current);\n' +
        '        saveTimer.current = null;\n' +
        '        saveExpanded(storeKey, [...expandedRef.current]);\n' +
        '      }'
    );
  });
});

describe('the expansion watch still runs after the verbs are built', () => {
  /**
   * ORDER IS THE CLAIM. The watch calls `opsRef.current?.settle()` on its first
   * pass, and it has run after the verbs effect since Phase 12.9. It is a
   * second exported hook rather than part of useTreeModel so the component can
   * keep it in that position.
   */
  it('FileTree calls useTreeRename before useTreeExpansionWatch', () => {
    const renameAt = component.indexOf('useTreeRename({');
    const watchAt = component.indexOf('useTreeExpansionWatch({');
    expect(renameAt).toBeGreaterThan(-1);
    expect(watchAt).toBeGreaterThan(renameAt);
  });

  it('and useTreeModel before both', () => {
    expect(component.indexOf('useTreeModel({')).toBeLessThan(
      component.indexOf('useTreeRename({')
    );
  });
});

describe('the hooks are behind the component and nowhere else', () => {
  for (const hook of [
    'use-tree-model',
    'use-tree-rename',
    'use-tree-menu',
    'use-tree-drag'
  ]) {
    it(`${hook} has FileTree.tsx as its only production importer`, () => {
      // The tree's own hooks import each other's TYPES, which is what the
      // Pick<TreeModelBridge, ...> option shapes are made of. Those are
      // erased, so only a value import counts as a second importer.
      const importers = ['use-tree-rename.ts', 'use-tree-menu.ts', 'use-tree-drag.ts']
        .filter((f) => f !== `${hook}.ts`)
        .filter((f) => new RegExp(`^import \\{[^}]*\\} from '\\./${hook}'`, 'm').test(read(f)));
      expect(importers).toEqual([]);
      expect(component).toContain(`from './${hook}'`);
    });
  }

  it('FileTree still exports one component with the same name', () => {
    expect(component).toContain('export function FileTree({');
    expect(component.match(/^export /gm)?.length).toBe(1);
  });
});

describe('the drag half still performs three obligations and no more', () => {
  /**
   * The contract is written once in ../terminal/drop/tree-drag.ts. Two of the
   * three obligations are refusals, and a refusal is only checkable as an
   * absence, so they are checked as one.
   */
  it('it arms beginTreeDrag and installs no window listener', () => {
    expect(drag).toContain('beginTreeDrag(');
    expect(drag).not.toContain('window.addEventListener');
  });

  it('and it never stamps effectAllowed itself', () => {
    expect(drag).not.toContain('effectAllowed =');
  });
});

describe('the context menu is still the OS menu', () => {
  it('the menu hook raises through setMenu and draws nothing', () => {
    expect(menu).toContain('setMenu({ x, y, items });');
    expect(menu).not.toContain('createElement');
    expect(menu).not.toContain('renderContextMenu');
  });

  it('and the model still hands onOpen to the ref the menu hook fills', () => {
    expect(model).toContain(
      'onOpen: (item, context) => openMenuRef.current?.(item, context)'
    );
    expect(menu).toContain('openMenuRef.current = (item, context): void => {');
  });
});

describe('the once-captured options still read live state through refs', () => {
  /**
   * @pierre/trees captures its options ONCE at construction. A hook that took
   * `canRenameHere` as a value and closed over it would break F2 on a machine
   * the moment a person confirms a folder in Settings while the tree is
   * mounted, which is the defect the Phase 102 comment describes closing.
   */
  const captured = model.indexOf('usePierreModel({');

  it('canRenameHereRef is written on every render, before the model is built', () => {
    expect(model).toContain('canRenameHereRef.current = canRenameHere;');
    expect(model.indexOf('canRenameHereRef.current = canRenameHere;')).toBeLessThan(
      captured
    );
  });

  it('conflictsRef is written on every render, before the model is built', () => {
    expect(model).toContain('conflictsRef.current = gitState.conflicts;');
    expect(model.indexOf('conflictsRef.current = gitState.conflicts;')).toBeLessThan(
      captured
    );
  });

  it('opsRef and openMenuRef exist before the model is built', () => {
    expect(model.indexOf('const opsRef = useRef<TreeOps | null>(null);')).toBeLessThan(
      captured
    );
    expect(model.indexOf('const openMenuRef = useRef<')).toBeLessThan(captured);
  });
});

describe('row-events reads one event two ways', () => {
  class FakeElement {
    dataset: Record<string, string> = {};
  }
  class FakeInput extends FakeElement {}
  class FakeTextArea extends FakeElement {}

  const install = (): void => {
    vi.stubGlobal('HTMLElement', FakeElement);
    vi.stubGlobal('HTMLInputElement', FakeInput);
    vi.stubGlobal('HTMLTextAreaElement', FakeTextArea);
  };
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const eventOver = (path: unknown[]): Event =>
    ({ composedPath: () => path }) as unknown as Event;

  it('finds the row a click landed on, folder or file', async () => {
    install();
    const { rowFromEvent } = await import('../row-events');
    const folder = new FakeElement();
    folder.dataset = { itemPath: 'src/', itemType: 'folder' };
    expect(rowFromEvent(eventOver([folder]))).toEqual({
      rel: 'src/',
      type: 'folder'
    });
    const file = new FakeElement();
    file.dataset = { itemPath: 'src/a.ts', itemType: 'file' };
    expect(rowFromEvent(eventOver([file]))).toEqual({
      rel: 'src/a.ts',
      type: 'file'
    });
  });

  it('answers null on the empty space below the rows', async () => {
    install();
    const { rowFromEvent } = await import('../row-events');
    expect(rowFromEvent(eventOver([new FakeElement()]))).toBeNull();
  });

  it('names a keystroke that came out of a text field', async () => {
    install();
    const { fromTextField } = await import('../row-events');
    expect(fromTextField(eventOver([new FakeInput()]))).toBe(true);
    expect(fromTextField(eventOver([new FakeTextArea()]))).toBe(true);
    expect(fromTextField(eventOver([new FakeElement()]))).toBe(false);
  });
});
