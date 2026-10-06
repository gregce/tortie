/**
 * The machines contract's member list, held by name (Phase 125).
 *
 * Phase 125 split src/shared/ipc/machines.ts into nine domain files (eight
 * since Phase 320.2 deleted sessions.ts) and left the file itself as the
 * barrel. Nothing a person can see changed, and this file is what keeps that
 * true. It holds three things a compiler cannot:
 *
 *  1. The 105 names the contract had before the split are the 105 it has
 *     after it, and every one is in the list below where a reviewer can read
 *     what moved and where it went. PHASE 229 ADDED THE 106TH,
 *     `MachineGitIdentity` in scm.ts, and the list and the tuple name it.
 *  2. Only the barrel is a door. No file under src/shared/ipc/machines/ names
 *     the barrel, so the eight and the one cannot form a loop, and there is no
 *     machines/index.ts, so './machines' resolves to exactly one thing.
 *  3. The eight files add no member to the contract. Each declares two internal
 *     interfaces the barrel composes, being its channel map and its bridge
 *     methods, and those sixteen are the only extra exported names allowed.
 *
 * PHASE 336 REMOVED TWO, `MachineWriteSheetInput` and `MachineAllowWritesInput`
 * in filesystem.ts, with the two channels that took them, so the list holds
 * 103. PHASE 340 ADDED TWO in connection.ts, `MachineCheckView` and
 * `MachineTestAsk`, so it holds 105.
 *
 * REACHABILITY IS PROVED BY THE COMPILER, not by this test. The `Reachable`
 * tuple at the bottom names all 105 through src/shared/ipc/index.ts, so a member
 * the barrel stops re-exporting fails `npm run typecheck` and names itself.
 *
 * build/assert-import-boundaries.mjs holds the other half, being that nothing
 * OUTSIDE src/shared/ipc/ imports one of the eight. Its FACADE_ONLY rule has
 * seven fixtures and they run before any real file is read.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type {
  MachineConfirmState,
  MachineRowView,
  MachinesResult,
  TailscalePeerView,
  TailscaleSourceResult,
  MachineDraft,
  MachineConfirmSheet,
  MachineAddInput,
  MachineConfirmInput,
  MachineAcceptVersionInput,
  MachinePreparedOption,
  MachinePrepareResult,
  MachineTestInput,
  MachineTestStarted,
  MachineTestClass,
  MachineTestOutcome,
  EVT_MACHINE_TEST,
  MachineTestEvent,
  MachineTestEventPayloadMap,
  MachineKeySheet,
  MachineKeyInstallInput,
  MachineKeyInstallResult,
  MachineCheckView,
  MachineTestAsk,
  MachineLink,
  MachineFeed,
  MachineStateView,
  EVT_MACHINE_STATE,
  MachineAgentPresence,
  MachineAgentReading,
  MachineAgentsView,
  EVT_MACHINE_AGENTS,
  MachinesEventPayloadMap,
  REMOTE_DIR_LIST_MAX,
  RemoteDirEntry,
  RemoteDirListInput,
  RemoteDirRefusal,
  RemoteDirListing,
  REMOTE_TREE_DEPTH,
  REMOTE_TREE_MAX_ENTRIES,
  RemoteTreeListInput,
  RemoteTreeEntry,
  RemoteTreeListing,
  REMOTE_FILE_LIST_MAX,
  REMOTE_FILE_LIST_MAX_BYTES,
  MachineFileListMode,
  MachineFileListInput,
  MachineFileListResult,
  REMOTE_FILE_MAX_BYTES,
  MachineFilePutInput,
  MachineFilePutOutcome,
  MachineFilePutResult,
  MachineMakeDirInput,
  MachineMakeDirOutcome,
  MachineMakeDirResult,
  MachineRenameInput,
  MachineRenameOutcome,
  MachineRenameResult,
  REMOTE_IMAGE_MAX_BYTES,
  MachineImagePutInput,
  MachineImagePlacement,
  MachineReviewInput,
  MachineReviewFile,
  MachineReviewList,
  MachineReviewFileInput,
  MachineReviewPair,
  MachineIndexWriteInput,
  MachineIndexWriteOutcome,
  MachineIndexWriteResult,
  MachineCommitInput,
  MachineCommitOutcome,
  MachineCommitResult,
  MachineRunsMode,
  MachineRunsInput,
  MachineRunsResult,
  MachineBranchMode,
  MachineBranchInput,
  MachineBranchResult,
  MachineGitIdentity,
  REMOTE_HISTORY_PAGE,
  REMOTE_HISTORY_MAX_COMMITS,
  MachineHistoryMode,
  MachineHistoryInput,
  MachineHistoryResult,
  REMOTE_PROJECT_MATCH_MAX,
  RemoteProjectFindOutcome,
  RemoteProjectFindInput,
  RemoteProjectMatch,
  RemoteProjectFindResult,
  RemoteCloneOutcome,
  RemoteCloneInput,
  RemoteCloneResult,
  MachineSearchMode,
  MachineSearchInput,
  MachineSearchResult,
  MachineContextMode,
  MachineContextInput,
  MachineContextResult,
  MachinesInvokeChannelMap,
  GmuxMachinesExtras
} from '../ipc';

/** src/shared/ipc/, the one directory this file reads. */
const IPC = join(__dirname, '..', 'ipc');

const FAMILIES = [
  'rows',
  'connection',
  'presence',
  'filesystem',
  'scm',
  'projects',
  'search',
  'context'
] as const;

/**
 * Every contract member, by the file it lives in. A reviewer reads this list
 * to see what Phase 125 moved. It was 105 names, 106 since Phase 229, 107 since
 * Phase 231 and 112 since Phase 233, 105 since Phase 320.2 removed
 * sessions.ts's seven, and 103 since Phase 336 removed filesystem.ts's two
 * inputs for the sheet that typed a folder to save under, and 105 since Phase
 * 340 added connection.ts's `MachineCheckView` and `MachineTestAsk`,
 * and it is not sorted, because the order is the order the split put them in.
 */
const MEMBERS: readonly string[] = [
  // rows.ts, 12
  'MachineConfirmState',
  'MachineRowView',
  'MachinesResult',
  'TailscalePeerView',
  'TailscaleSourceResult',
  'MachineDraft',
  'MachineConfirmSheet',
  'MachineAddInput',
  'MachineConfirmInput',
  'MachineAcceptVersionInput',
  'MachinePreparedOption',
  'MachinePrepareResult',
  // connection.ts, 10, and 12 since Phase 340 added the check's view and the
  // question a running check is waiting on
  'MachineTestInput',
  'MachineTestStarted',
  'MachineTestClass',
  'MachineTestOutcome',
  'EVT_MACHINE_TEST',
  'MachineTestEvent',
  'MachineTestEventPayloadMap',
  'MachineKeySheet',
  'MachineKeyInstallInput',
  'MachineKeyInstallResult',
  'MachineCheckView',
  'MachineTestAsk',
  // presence.ts, 9
  'MachineLink',
  'MachineFeed',
  'MachineStateView',
  'EVT_MACHINE_STATE',
  'MachineAgentPresence',
  'MachineAgentReading',
  'MachineAgentsView',
  'EVT_MACHINE_AGENTS',
  'MachinesEventPayloadMap',
  // filesystem.ts, 30, and 28 since Phase 336 removed the two inputs of the
  // sheet that typed a folder to save under
  'REMOTE_DIR_LIST_MAX',
  'RemoteDirEntry',
  'RemoteDirListInput',
  'RemoteDirRefusal',
  'RemoteDirListing',
  'REMOTE_TREE_DEPTH',
  'REMOTE_TREE_MAX_ENTRIES',
  'RemoteTreeListInput',
  'RemoteTreeEntry',
  'RemoteTreeListing',
  'REMOTE_FILE_LIST_MAX',
  'REMOTE_FILE_LIST_MAX_BYTES',
  'MachineFileListMode',
  'MachineFileListInput',
  'MachineFileListResult',
  'REMOTE_FILE_MAX_BYTES',
  'MachineFilePutInput',
  'MachineFilePutOutcome',
  'MachineFilePutResult',
  'MachineMakeDirInput',
  'MachineMakeDirOutcome',
  'MachineMakeDirResult',
  'MachineRenameInput',
  'MachineRenameOutcome',
  'MachineRenameResult',
  'REMOTE_IMAGE_MAX_BYTES',
  'MachineImagePutInput',
  'MachineImagePlacement',
  // scm.ts, 22, 23 since Phase 229 added MachineGitIdentity, and 28 since
  // Phase 233 added the five for what one commit changed on a machine
  'MachineReviewInput',
  'MachineReviewFile',
  'MachineReviewList',
  'MachineReviewFileInput',
  'MachineReviewPair',
  'MachineIndexWriteInput',
  'MachineIndexWriteOutcome',
  'MachineIndexWriteResult',
  'MachineCommitInput',
  'MachineCommitOutcome',
  'MachineCommitResult',
  'MachineRunsMode',
  'MachineRunsInput',
  'MachineRunsResult',
  'MachineBranchMode',
  'MachineBranchInput',
  'MachineBranchResult',
  'MachineGitIdentity',
  'REMOTE_HISTORY_PAGE',
  'REMOTE_HISTORY_MAX_COMMITS',
  'MachineHistoryMode',
  'MachineHistoryInput',
  'MachineHistoryResult',
  'MachineCommitFile',
  'MachineCommitFilesInput',
  'MachineCommitFilesResult',
  'MachineCommitFileInput',
  'MachineCommitFilePair',
  // projects.ts, 8
  'REMOTE_PROJECT_MATCH_MAX',
  'RemoteProjectFindOutcome',
  'RemoteProjectFindInput',
  'RemoteProjectMatch',
  'RemoteProjectFindResult',
  'RemoteCloneOutcome',
  'RemoteCloneInput',
  'RemoteCloneResult',
  // search.ts, 3
  'MachineSearchMode',
  'MachineSearchInput',
  'MachineSearchResult',
  // context.ts, 3
  'MachineContextMode',
  'MachineContextInput',
  'MachineContextResult',
  // machines.ts, the barrel's own 2
  'MachinesInvokeChannelMap',
  'GmuxMachinesExtras',
];

/** `export <kind> <Name>` in one file's source text. */
function exportsOf(text: string): string[] {
  return [
    ...text.matchAll(/^export (?:type|interface|const|function|class|enum) ([A-Za-z0-9_]+)/gm)
  ].map((m) => m[1] as string);
}

function read(file: string): string {
  return readFileSync(join(IPC, file), 'utf8');
}

const domainExports = new Map<string, string[]>(
  FAMILIES.map((f) => [f, exportsOf(read(join('machines', `${f}.ts`)))])
);
const barrelExports = exportsOf(read('machines.ts'));

/** True for the two internal interfaces each family declares for the barrel. */
const isPlumbing = (name: string): boolean =>
  /^Machines[A-Z]\w*(InvokeChannelMap|Api)$/.test(name) && name !== 'MachinesInvokeChannelMap';

describe('the machines contract after the Phase 125 split', () => {
  it('holds every one of the 105 members, in one file each', () => {
    const found: string[] = [];
    for (const f of FAMILIES) {
      found.push(...(domainExports.get(f) ?? []).filter((n) => !isPlumbing(n)));
    }
    found.push(...barrelExports.filter((n) => !isPlumbing(n)));
    expect(found.length).toBe(MEMBERS.length);
    // PHASE 336. The count itself, so a member list edited in step with a
    // re-added export cannot hide it.
    // PHASE 340. 105, being Phase 336's 103 and the two the check added.
    expect(MEMBERS.length).toBe(105);
    expect([...found].sort()).toEqual([...MEMBERS].sort());
  });

  it('holds exactly the eight family files and no ninth', () => {
    // Every other case here reads only the families FAMILIES names, so a
    // family file put back beside them and re-exported would leave this file
    // green. The directory is held to the list.
    const onDisk = readdirSync(join(IPC, 'machines'))
      .filter((n) => n.endsWith('.ts'))
      .sort();
    expect(onDisk).toEqual(FAMILIES.map((f) => `${f}.ts`).sort());
  });

  it('adds no member beyond the two each family declares for the barrel', () => {
    for (const f of FAMILIES) {
      const plumbing = (domainExports.get(f) ?? []).filter(isPlumbing);
      expect(plumbing.length, `${f}.ts`).toBe(2);
    }
  });

  it('re-exports all eight families from the barrel', () => {
    const text = read('machines.ts');
    for (const f of FAMILIES) {
      expect(text, `machines.ts must re-export ${f}`).toContain(
        `export * from './machines/${f}';`
      );
    }
  });

  it('lets no family name the barrel', () => {
    for (const f of FAMILIES) {
      const text = read(join('machines', `${f}.ts`));
      expect(text, `${f}.ts`).not.toContain("from './machines'");
      expect(text, `${f}.ts`).not.toContain("from '../machines.ts'");
      expect(text, `${f}.ts`).not.toContain("from '../machines'");
    }
  });

  it('gives "./machines" exactly one thing to resolve to', () => {
    expect(existsSync(join(IPC, 'machines.ts'))).toBe(true);
    expect(existsSync(join(IPC, 'machines', 'index.ts'))).toBe(false);
    expect(existsSync(join(IPC, 'machines', 'index.tsx'))).toBe(false);
  });
});

/**
 * The compile-time half. Every member named through the facade, so a name the
 * barrel stops re-exporting is a typecheck failure that names itself. It is a
 * type and it is exported, so nothing here runs and nothing is unused.
 */
export type Reachable = [
  MachineConfirmState,
  MachineRowView,
  MachinesResult,
  TailscalePeerView,
  TailscaleSourceResult,
  MachineDraft,
  MachineConfirmSheet,
  MachineAddInput,
  MachineConfirmInput,
  MachineAcceptVersionInput,
  MachinePreparedOption,
  MachinePrepareResult,
  MachineTestInput,
  MachineTestStarted,
  MachineTestClass,
  MachineTestOutcome,
  typeof EVT_MACHINE_TEST,
  MachineTestEvent,
  MachineTestEventPayloadMap,
  MachineKeySheet,
  MachineKeyInstallInput,
  MachineKeyInstallResult,
  MachineCheckView,
  MachineTestAsk,
  MachineLink,
  MachineFeed,
  MachineStateView,
  typeof EVT_MACHINE_STATE,
  MachineAgentPresence,
  MachineAgentReading,
  MachineAgentsView,
  typeof EVT_MACHINE_AGENTS,
  MachinesEventPayloadMap,
  typeof REMOTE_DIR_LIST_MAX,
  RemoteDirEntry,
  RemoteDirListInput,
  RemoteDirRefusal,
  RemoteDirListing,
  typeof REMOTE_TREE_DEPTH,
  typeof REMOTE_TREE_MAX_ENTRIES,
  RemoteTreeListInput,
  RemoteTreeEntry,
  RemoteTreeListing,
  typeof REMOTE_FILE_LIST_MAX,
  typeof REMOTE_FILE_LIST_MAX_BYTES,
  MachineFileListMode,
  MachineFileListInput,
  MachineFileListResult,
  typeof REMOTE_FILE_MAX_BYTES,
  MachineFilePutInput,
  MachineFilePutOutcome,
  MachineFilePutResult,
  MachineMakeDirInput,
  MachineMakeDirOutcome,
  MachineMakeDirResult,
  MachineRenameInput,
  MachineRenameOutcome,
  MachineRenameResult,
  typeof REMOTE_IMAGE_MAX_BYTES,
  MachineImagePutInput,
  MachineImagePlacement,
  MachineReviewInput,
  MachineReviewFile,
  MachineReviewList,
  MachineReviewFileInput,
  MachineReviewPair,
  MachineIndexWriteInput,
  MachineIndexWriteOutcome,
  MachineIndexWriteResult,
  MachineCommitInput,
  MachineCommitOutcome,
  MachineCommitResult,
  MachineRunsMode,
  MachineRunsInput,
  MachineRunsResult,
  MachineBranchMode,
  MachineBranchInput,
  MachineBranchResult,
  MachineGitIdentity,
  typeof REMOTE_HISTORY_PAGE,
  typeof REMOTE_HISTORY_MAX_COMMITS,
  MachineHistoryMode,
  MachineHistoryInput,
  MachineHistoryResult,
  typeof REMOTE_PROJECT_MATCH_MAX,
  RemoteProjectFindOutcome,
  RemoteProjectFindInput,
  RemoteProjectMatch,
  RemoteProjectFindResult,
  RemoteCloneOutcome,
  RemoteCloneInput,
  RemoteCloneResult,
  MachineSearchMode,
  MachineSearchInput,
  MachineSearchResult,
  MachineContextMode,
  MachineContextInput,
  MachineContextResult,
  MachinesInvokeChannelMap,
  GmuxMachinesExtras
];
