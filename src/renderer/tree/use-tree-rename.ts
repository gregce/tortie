/**
 * The tree's file VERBS and the create editor's live refusal.
 *
 * This is a hook behind FileTree.tsx. It owns three things and no more:
 *  - it builds `createTreeOps` once per mounted root and fills the `opsRef`
 *    the model was constructed with, then bumps `opsCreated` so the handle
 *    effect in FileTree can wait for the verbs to exist;
 *  - it resolves the rename editor's bridge lazily and keeps it for the mount;
 *  - it judges every keystroke in a New File or New Folder editor and places
 *    the reason under the box.
 *
 * The rules the verbs enforce are in ./tree-ops.ts and the name rules are in
 * ./entry-name.ts. Nothing here writes a sentence of its own.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  MachineFilePutResult,
  MachineMakeDirResult,
  MachineRenameResult
} from '@shared/ipc';
import { gmuxBridge } from '../bridge';
import { entryNameVerdict } from './entry-name';
import type { EntryNameVerdict } from './entry-name';
import {
  canWriteEntries,
  makeDir as makeRemoteDir,
  renameEntry as renameRemoteEntry
} from './remote-bridge';
import { resolveTreeEditor } from './rename-view';
import type { TreeEditorBridge } from './rename-view';
import { useFileTree } from './store';
import { createTreeOps } from './tree-ops';
import { baseNameOf, parentOf } from './tree-paths';
import type { TreeModelBridge, TreeRemote } from './use-tree-model';

/** Where the reason for a bad name is drawn, and what it says. */
export interface TreeNameError {
  message: string;
  top: number;
  left: number;
  maxWidth: number;
}

export interface TreeRenameOptions
  extends Pick<
    TreeModelBridge,
    'model' | 'hostRef' | 'treeShadow' | 'opsRef' | 'fedRef' | 'hold'
  > {
  rootPath: string;
  remote: TreeRemote | null;
  remoteWriteRoot: string | null;
}

export interface TreeRenameResult {
  /** Bumped when the verbs exist, so the handle effect can wait for them. */
  opsCreated: number;
  /** The refusal under the create editor, or null when the name is fine. */
  nameError: TreeNameError | null;
}

export function useTreeRename({
  rootPath,
  remote,
  remoteWriteRoot,
  model,
  hostRef,
  treeShadow,
  opsRef,
  fedRef,
  hold
}: TreeRenameOptions): TreeRenameResult {
  /** Bumped when the verbs exist, so the handle effect can wait for them. */
  const [opsCreated, setOpsCreated] = useState(0);

  // ----- the rename-editor bridge (Phase 37) -------------------------------
  // Resolved lazily and kept for the mount: the controller the adapter finds
  // lives exactly as long as this model does. A null result is retried (the
  // tree may not have been mounted yet); a resolved bridge never changes.
  const editorBridgeRef = useRef<TreeEditorBridge | null>(null);
  const editorBridge = useCallback((): TreeEditorBridge | null => {
    editorBridgeRef.current ??= resolveTreeEditor(hostRef.current);
    return editorBridgeRef.current;
  }, []);

  // ----- the verbs ---------------------------------------------------------
  // Built once per mounted root: they hold the model and the feed baseline,
  // which are exactly the two things a file operation has to keep in step.
  useEffect(() => {
    // PHASE 101. The one member that says where a create lands. It is absent
    // for a folder on this Mac and for a machine nobody confirmed a folder
    // for, and `finishCreate` in ./tree-ops.ts branches on exactly that.
    const machineId = remote?.machineId ?? null;
    const remoteCreate =
      machineId === null || remoteWriteRoot === null
        ? undefined
        : {
            machineId,
            putFile: async (absPath: string): Promise<MachineFilePutResult> => {
              const machines = gmuxBridge()?.machines;
              if (
                machines === undefined ||
                typeof machines.putFile !== 'function'
              ) {
                throw new Error(
                  'This build cannot save files on another machine.'
                );
              }
              return machines.putFile({
                machineId,
                path: absPath,
                // A new file starts empty, and `new` is what makes the far
                // side refuse a name that is already there.
                contents: '',
                expect: 'new'
              });
            },
            refresh: async (): Promise<void> => {
              await useFileTree.getState().refreshLoaded();
            }
          };
    // PHASE 102. The sibling member that says where a new folder and a rename
    // land. It is built under the same condition as the create above, and it is
    // absent for a folder on this Mac, for a machine nobody confirmed a folder
    // for, and for a build whose preload predates the two channels.
    const remoteEntry =
      machineId === null || remoteWriteRoot === null || !canWriteEntries()
        ? undefined
        : {
            machineId,
            makeDir: async (
              absPath: string
            ): Promise<MachineMakeDirResult> =>
              makeRemoteDir({ machineId, path: absPath }),
            renameEntry: async (
              fromAbs: string,
              toAbs: string,
              kind: 'file' | 'dir'
            ): Promise<MachineRenameResult> =>
              renameRemoteEntry({ machineId, from: fromAbs, to: toAbs, kind }),
            refresh: async (): Promise<void> => {
              await useFileTree.getState().refreshLoaded();
            }
          };
    opsRef.current = createTreeOps({
      rootPath,
      model,
      readFed: () => fedRef.current,
      writeFed: (next) => {
        fedRef.current = next;
      },
      hold,
      renameView: () => editorBridge()?.view ?? null,
      selectOnly: (canonical) => editorBridge()?.selectOnly(canonical),
      ...(remoteCreate === undefined ? {} : { remoteCreate }),
      ...(remoteEntry === undefined ? {} : { remoteEntry })
    });
    setOpsCreated((n) => n + 1);
    return () => {
      opsRef.current = null;
    };
  }, [model, rootPath, hold, editorBridge, remote, remoteWriteRoot]);

  // ----- the create editor's live refusal (Phase 37) ------------------------
  // While a New File / New Folder editor is open, every keystroke is judged
  // by entryNameVerdict and a bad name shows its reason under the box; Enter
  // on a bad name is stopped in the CAPTURE phase on this host, so the
  // library's own commit (bubble phase, inside the shadow root) never runs.
  const [nameError, setNameError] = useState<TreeNameError | null>(null);
  const nameErrorShownRef = useRef(false);
  nameErrorShownRef.current = nameError !== null;

  /** The verdict on the pending create's current text, or null when idle. */
  const pendingVerdict = useCallback((): EntryNameVerdict | null => {
    const pendingPath = opsRef.current?.pendingPath() ?? null;
    if (pendingPath === null) return null;
    const view = editorBridge()?.view ?? null;
    if (view === null || view.getPath() !== pendingPath) return null;
    const parent = parentOf(pendingPath);
    const taken = new Set<string>();
    for (const path of fedRef.current) {
      if (parentOf(path) === parent) taken.add(baseNameOf(path).toLowerCase());
    }
    return entryNameVerdict(view.getValue(), taken);
  }, [editorBridge]);

  /** Show, move or hide the reason element to match the live verdict. */
  const refreshNameError = useCallback((): void => {
    const verdict = pendingVerdict();
    const input = treeShadow()?.querySelector('[data-item-rename-input]');
    if (verdict === null || verdict.kind !== 'bad') {
      if (input instanceof HTMLElement) input.removeAttribute('aria-invalid');
      setNameError(null);
      return;
    }
    const host = hostRef.current;
    if (!(input instanceof HTMLElement) || host === null) {
      setNameError(null);
      return;
    }
    input.setAttribute('aria-invalid', 'true');
    const inputRect = input.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    setNameError({
      message: verdict.reason,
      top: inputRect.bottom - hostRect.top + 2,
      left: Math.max(0, inputRect.left - hostRect.left),
      maxWidth: Math.max(120, hostRect.right - inputRect.left - 8)
    });
  }, [pendingVerdict, treeShadow]);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    // `input` is a composed event, so it crosses the shadow boundary and
    // bubbles to this host — one listener judges every keystroke.
    const onInput = (): void => {
      if (opsRef.current?.pendingPath() != null) refreshNameError();
    };
    const onKeyDownCapture = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' || event.isComposing) return;
      const verdict = pendingVerdict();
      if (verdict === null || verdict.kind !== 'bad') return;
      // Bad name: the commit never runs, the editor stays open, focus stays
      // in the box, and the reason stays visible. Ok and empty fall through.
      event.preventDefault();
      event.stopPropagation();
      refreshNameError();
    };
    host.addEventListener('input', onInput);
    host.addEventListener('keydown', onKeyDownCapture, true);
    return () => {
      host.removeEventListener('input', onInput);
      host.removeEventListener('keydown', onKeyDownCapture, true);
    };
  }, [pendingVerdict, refreshNameError]);

  // Hide (or re-place) the reason when the editor closes or the rows move —
  // every one of those emits on the model.
  useEffect(() => {
    const unsubscribe = model.subscribe(() => {
      queueMicrotask(() => {
        if (nameErrorShownRef.current) refreshNameError();
      });
    });
    return unsubscribe;
  }, [model, refreshNameError]);

  // Scroll does not compose, so a host listener would never hear the shadow
  // tree scrolling under the box — the capture listener sits on the shadow
  // root itself, and only while the reason is showing.
  const nameErrorShown = nameError !== null;
  useEffect(() => {
    if (!nameErrorShown) return;
    const shadow = treeShadow();
    const reposition = (): void => {
      refreshNameError();
    };
    shadow?.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      shadow?.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [nameErrorShown, treeShadow, refreshNameError]);

  return { opsCreated, nameError };
}
