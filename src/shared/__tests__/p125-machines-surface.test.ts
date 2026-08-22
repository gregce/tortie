/**
 * The machines contract's member list, held by name (Phase 125).
 *
 * Phase 125 split src/shared/ipc/machines.ts into nine domain files and left
 * the file itself as the barrel. Nothing a person can see changed, and this
 * file is what keeps that true. It holds three things a compiler cannot:
 *
 *  1. The 105 names the contract had before the split are the 105 it has
 *     after it, and every one is in the list below where a reviewer can read
 *     what moved and where it went.
 *  2. Only the barrel is a door. No file under src/shared/ipc/machines/ names
 *     the barrel, so the nine and the one cannot form a loop, and there is no
 *     machines/index.ts, so './machines' resolves to exactly one thing.
 *  3. The nine files add no member to the contract. Each declares two internal
 *     interfaces the barrel composes, being its channel map and its bridge
 *     methods, and those eighteen are the only extra exported names allowed.
 *
 * REACHABILITY IS PROVED BY THE COMPILER, not by this test. The `Reachable`
 * tuple at the bottom names all 105 through src/shared/ipc/index.ts, so a member
 * the barrel stops re-exporting fails `npm run typecheck` and names itself.
 *
 * build/assert-import-boundaries.mjs holds the other half, being that nothing
 * OUTSIDE src/shared/ipc/ imports one of the nine. Its FACADE_ONLY rule has
 * seven fixtures and they run before any real file is read.
 */

import { existsSync, readFileSync } from 'node:fs';
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
  MachineLink,
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
  MachineWriteSheetInput,
  MachineAllowWritesInput,
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
  MachineSessionLinesMode,
  MachineSessionLinesInput,
  MachineSessionLinesResult,
  REMOTE_SESSION_LINES_MAX,
  REMOTE_SESSION_LINES_DEFAULT,
  REMOTE_SESSION_LINES_BYTES_MAX,
  REMOTE_SESSION_LINE_DEPTHS,
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
  'sessions',
  'search',
  'context'
] as const;

/**
 * Every contract member, by the file it lives in. A reviewer reads this list
 * to see what Phase 125 moved. It is 105 names and it is not sorted, because
 * the order is the order the split put them in.
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
  // connection.ts, 10
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
  // presence.ts, 8
  'MachineLink',
  'MachineStateView',
  'EVT_MACHINE_STATE',
  'MachineAgentPresence',
  'MachineAgentReading',
  'MachineAgentsView',
  'EVT_MACHINE_AGENTS',
  'MachinesEventPayloadMap',
  // filesystem.ts, 30
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
  'MachineWriteSheetInput',
  'MachineAllowWritesInput',
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
  // scm.ts, 22
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
  'REMOTE_HISTORY_PAGE',
  'REMOTE_HISTORY_MAX_COMMITS',
  'MachineHistoryMode',
  'MachineHistoryInput',
  'MachineHistoryResult',
  // projects.ts, 8
  'REMOTE_PROJECT_MATCH_MAX',
  'RemoteProjectFindOutcome',
  'RemoteProjectFindInput',
  'RemoteProjectMatch',
  'RemoteProjectFindResult',
  'RemoteCloneOutcome',
  'RemoteCloneInput',
  'RemoteCloneResult',
  // sessions.ts, 7
  'MachineSessionLinesMode',
  'MachineSessionLinesInput',
  'MachineSessionLinesResult',
  'REMOTE_SESSION_LINES_MAX',
  'REMOTE_SESSION_LINES_DEFAULT',
  'REMOTE_SESSION_LINES_BYTES_MAX',
  'REMOTE_SESSION_LINE_DEPTHS',
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
    expect([...found].sort()).toEqual([...MEMBERS].sort());
  });

  it('adds no member beyond the two each family declares for the barrel', () => {
    for (const f of FAMILIES) {
      const plumbing = (domainExports.get(f) ?? []).filter(isPlumbing);
      expect(plumbing.length, `${f}.ts`).toBe(2);
    }
  });

  it('re-exports all nine families from the barrel', () => {
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
  MachineLink,
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
  MachineWriteSheetInput,
  MachineAllowWritesInput,
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
  MachineSessionLinesMode,
  MachineSessionLinesInput,
  MachineSessionLinesResult,
  typeof REMOTE_SESSION_LINES_MAX,
  typeof REMOTE_SESSION_LINES_DEFAULT,
  typeof REMOTE_SESSION_LINES_BYTES_MAX,
  typeof REMOTE_SESSION_LINE_DEPTHS,
  MachineSearchMode,
  MachineSearchInput,
  MachineSearchResult,
  MachineContextMode,
  MachineContextInput,
  MachineContextResult,
  MachinesInvokeChannelMap,
  GmuxMachinesExtras
];
