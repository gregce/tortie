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
import { workspaceTarget } from '@shared/workspace-target';
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
import { useRemoteChanges } from '../scm/remote-changes';
import { createTreeOps } from './tree-ops';
import { baseNameOf, NO_TREE_LINKS, parentOf } from './tree-paths';
import type { TreeModelBridge, TreeRemote } from './use-tree-model';

/**
 * PHASE 230. What the Explorer reads again after its own write landed on a
 * machine: the rows, as before, and the decorations beside them, which come
 * from the remote Changes store's entry for that folder (FilesSection.tsx
 * says why). The Explorer names itself to the shared re-read hook so its own
 * write does not read the tree twice, and this is the one read it does run.
 */
async function refreshRemoteTree(
  rootPath: string,
  machineId: string
): Promise<void> {
  await Promise.all([
    useFileTree.getState().refreshLoaded(),
    useRemoteChanges
      .getState()
      .reread(workspaceTarget(rootPath, machineId))
  ]);
}

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
    | 'model'
    | 'hostRef'
    | 'treeShadow'
    | 'opsRef'
    | 'fedRef'
    | 'linksRef'
    | 'hold'
  > {
  rootPath: string;
  remote: TreeRemote | null;
  remoteWriteFolder: string | null;
}

export interface TreeRenameResult {
  /** Bumped when the verbs exist, so the handle effect can wait for them. */
  opsCreated: number;
  /** The refusal under the create editor, or null when the name is fine. */
  nameError: TreeNameError | null;
  /**
   * ISSUE 22 / PHASE 267. True while a create has a placeholder row open in the
   * model. Model-driven (rises when the placeholder is added, falls when it is
   * settled or removed), so FileTree can hide the empty-folder hint under the
   * row rather than letting the hint cover it. It is NOT `rootEmpty`, which is
   * fed-based and stays true through a create.
   */
  createPending: boolean;
}

export function useTreeRename({
  rootPath,
  remote,
  remoteWriteFolder,
  model,
  hostRef,
  treeShadow,
  opsRef,
  fedRef,
  linksRef,
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
  //
  // PHASE 341. THEY ARE REBUILT ONLY WHEN WHAT THEY CLOSE OVER CHANGES, which
  // is the machine's id and the folder Tortie may write under, and never when
  // the `remote` OBJECT is merely new. FilesSection composes that object from
  // the machine states, and main pushes the whole list after every completed
  // session poll of that machine (`noteMachineAnswered`, every 5 s while the
  // window is focused), so the object was new every few seconds. Each new one
  // rebuilt these verbs, and a rebuilt set starts with no pending create: a New
  // Folder box open across one poll committed into verbs that had never heard
  // of it, which sent `machines:renameEntry` for `untitled folder`, a folder
  // nobody had made, and the machine answered `gone`. Measured at the parent by
  // build/p341/probe-p341.mjs: every create whose box stayed open past a push
  // did that, and every one pressed within 150 ms made its folder. A tree on
  // this Mac has no `remote`, which is why the same press never failed there.
  const machineId = remote?.machineId ?? null;
  useEffect(() => {
    // PHASE 101. The one member that says where a create lands. It is absent
    // for a folder on this Mac and for a tree in no folder Tortie may write
    // under (Phase 336), and `finishCreate` in ./tree-ops.ts branches on
    // exactly that.
    const remoteCreate =
      machineId === null || remoteWriteFolder === null
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
              await refreshRemoteTree(rootPath, machineId);
            }
          };
    // PHASE 102. The sibling member that says where a new folder and a rename
    // land. It is built under the same condition as the create above, and it is
    // absent for a folder on this Mac, for a tree in no folder Tortie may write
    // under, and for a build whose preload predates the two channels.
    const remoteEntry =
      machineId === null || remoteWriteFolder === null || !canWriteEntries()
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
              await refreshRemoteTree(rootPath, machineId);
            }
          };
    const ops = createTreeOps({
      rootPath,
      model,
      readFed: () => fedRef.current,
      writeFed: (next) => {
        fedRef.current = next;
      },
      hold,
      // PHASE 343. Read through the ref at call time, so the verbs see every
      // listing's links and are still NOT rebuilt on a listing (Phase 341's
      // rule above: a rebuild forgets an open New File box). A harness that
      // mounts this hook with no tree model behind it hands no ref, and reads
      // as a tree with no link rows.
      links: () => linksRef?.current ?? NO_TREE_LINKS,
      renameView: () => editorBridge()?.view ?? null,
      selectOnly: (canonical) => editorBridge()?.selectOnly(canonical),
      ...(remoteCreate === undefined ? {} : { remoteCreate }),
      ...(remoteEntry === undefined ? {} : { remoteEntry })
    });
    opsRef.current = ops;
    setOpsCreated((n) => n + 1);
    return () => {
      // PHASE 341. A New File or New Folder box these verbs opened ends with
      // them, the way Esc ends it, so the next set never receives its commit
      // as a rename of a row that was never made, and its hold on the row is
      // released rather than leaked.
      ops.dispose();
      opsRef.current = null;
    };
  }, [model, rootPath, hold, editorBridge, machineId, remoteWriteFolder]);

  // ----- the create editor's live refusal (Phase 37) ------------------------
  // While a New File / New Folder editor is open, every keystroke is judged
  // by entryNameVerdict and a bad name shows its reason under the box; Enter
  // on a bad name is stopped in the CAPTURE phase on this host, so the
  // library's own commit (bubble phase, inside the shadow root) never runs.
  const [nameError, setNameError] = useState<TreeNameError | null>(null);
  const nameErrorShownRef = useRef(false);
  nameErrorShownRef.current = nameError !== null;

  // ISSUE 22 / PHASE 267. The empty-folder hint in FileTree hides the moment a
  // create places its placeholder row, driven off the model rather than the
  // fed listing (see TreeRenameResult.createPending).
  const [createPending, setCreatePending] = useState(false);

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
    // ISSUE 22 / PHASE 267. Read the pending placeholder once on subscribe so a
    // create already in flight when this effect re-runs is reflected, then keep
    // it in step on every model emit — the placeholder is added on create and
    // removed on Esc / empty commit / a real create, so the flag rises and
    // falls with the row, no polling.
    setCreatePending(opsRef.current?.pendingPath() != null);
    const unsubscribe = model.subscribe(() => {
      setCreatePending(opsRef.current?.pendingPath() != null);
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

  return { opsCreated, nameError, createPending };
}
