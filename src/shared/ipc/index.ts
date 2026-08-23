/**
 * gmux IPC contract — the facade.
 *
 * Phase 42 stage 2 split the single src/shared/ipc.ts into the domain files
 * beside this one. Every name the old file exported is re-exported here, so
 * `import ... from '../shared/ipc'` (and `@shared/ipc`) resolves to this
 * index and nothing that imports the contract had to change. This file owns
 * the three compositions that span every domain:
 *
 *   - `GmuxInvokeChannelMap` — every invoke channel, one flat intersection.
 *   - `AllEventPayloadMap`   — every static event channel main can broadcast.
 *   - `InstalledGmuxApi`     — the TRUTHFUL type of the installed
 *     `window.gmux` object: the base `GmuxApi` plus every extras interface
 *     the preload actually assembles, with the member surfaces (`sessions`,
 *     `git`, ...) widened to what the preload really installs. The preload's
 *     `api` const and the renderer's `Window.gmux` declaration are BOTH this
 *     type, so the two can never drift again (the audit found `Window.gmux`
 *     declaring only the older base API while the runtime object carried 26
 *     intersected interfaces).
 *
 * A future stream appends its channels to its domain file (or a new one) and
 * adds ONE line to each composition here.
 */

import type {
  EventPayloadMap,
  GmuxApi,
  InvokeChannelMap
} from './base';
import type {
  GmuxAgentExtras,
  GmuxMenuExtras,
  GmuxPopupMenuExtras,
  GmuxPowerExtras,
  GmuxQuitExtras,
  GmuxSessionExtras,
  GmuxSettingsExtras,
  GmuxUpdatesExtras,
  GmuxViewMenuExtras,
  HardeningInvokeChannelMap,
  MenuEventPayloadMap,
  PowerEventPayloadMap,
  QuitEventPayloadMap,
  QuitInvokeChannelMap,
  SettingsEventPayloadMap,
  SettingsInvokeChannelMap,
  ShellInvokeChannelMap,
  UpdatesEventPayloadMap,
  UpdatesInvokeChannelMap,
  ViewMenuInvokeChannelMap
} from './app';
import type {
  ActionsEventPayloadMap,
  ActionsInvokeChannelMap,
  GmuxActionsExtras
} from './actions';
import type {
  AgentsInvokeChannelMap,
  ConfigInvokeChannelMap,
  GmuxAgentRegistryExtras,
  GmuxConfigExtras,
  GmuxMultilineExtras,
  MultilineInvokeChannelMap
} from './agents';
import type {
  ContextInvokeChannelMap,
  ContextSnapshotInvokeChannelMap,
  GmuxContextExtras,
  GmuxContextSnapshotExtras
} from './context';
import type {
  FileOpsInvokeChannelMap,
  FsDuplicateInvokeChannelMap,
  GmuxFsDuplicateExtras,
  GmuxFsExtras,
  GmuxFsOpsExtras,
  GmuxOpenWithExtras,
  GmuxPreviewExtras,
  OpenWithInvokeChannelMap,
  PreviewInvokeChannelMap,
  TreeInvokeChannelMap
} from './files';
import type {
  GitBranchesInvokeChannelMap,
  GitDepthInvokeChannelMap,
  GitGraphInvokeChannelMap,
  GitIgnoreInvokeChannelMap,
  GitSyncInvokeChannelMap,
  GmuxGitBranchExtras,
  GmuxGitDepthExtras,
  GmuxGitExtras,
  GmuxGitGraphExtras,
  GmuxGitIgnoreExtras,
  GmuxGitSyncExtras,
  ScmInvokeChannelMap
} from './git';
import type {
  CloneInvokeChannelMap,
  GmuxImageExtras,
  GmuxProjectCloneExtras,
  GmuxProjectCreateExtras,
  GmuxProjectPickerExtras,
  GmuxRecentsExtras,
  ImageProjectInvokeChannelMap,
  GmuxRemoteProjectExtras,
  ProjectPickerInvokeChannelMap,
  RecentsEventPayloadMap,
  RecentsInvokeChannelMap,
  RemoteProjectInvokeChannelMap
} from './projects';
import type {
  GmuxQuickOpenExtras,
  GmuxSearchExtras,
  GmuxSymbolsExtras,
  QuickOpenInvokeChannelMap,
  SearchInvokeChannelMap,
  SymbolsEventPayloadMap,
  SymbolsInvokeChannelMap
} from './search';
import type {
  GmuxShellExtras,
  ShellCommandInvokeChannelMap
} from './shell';
import type {
  ActivityEventPayloadMap,
  ActivityInvokeChannelMap,
  AskRestoreProjectInvokeChannelMap,
  DurabilityInvokeChannelMap,
  GmuxActivityExtras,
  GmuxAskRestoreProjectExtras,
  GmuxLoginItemExtras,
  GmuxNoticeExtras,
  GmuxPastSessionsChannelMap,
  GmuxPastSessionsExtras,
  GmuxSessionRestartExtras,
  GmuxSessionRestoreExtras,
  GmuxShellPathExtras,
  RestoreInvokeChannelMap,
  ShellPathInvokeChannelMap
} from './sessions';
import type { GmuxLogExtras, LogInvokeChannelMap } from './log';
import type {
  GmuxMachinesExtras,
  MachinesEventPayloadMap,
  MachinesInvokeChannelMap,
  MachineTestEventPayloadMap
} from './machines';
import type {
  GmuxOverviewExtras,
  OverviewInvokeChannelMap
} from './overview';
import type {
  GmuxSpecStoryExtras,
  CaptureEventPayloadMap,
  SpecStoryStatusInvokeChannelMap
} from './specstory';
import type {
  DropInvokeChannelMap,
  GmuxCaptureExtras,
  GmuxDropExtras,
  GmuxScrollbackExtras,
  GmuxScrollExtras,
  GmuxTermStreamExtras,
  ScrollbackEventPayloadMap,
  ScrollbackInvokeChannelMap,
  TerminalCaptureInvokeChannelMap,
  TerminalScrollInvokeChannelMap
} from './terminal';

export * from './base';
export * from './app';
export * from './actions';
export * from './agents';
export * from './context';
export * from './files';
export * from './git';
export * from './log';
export * from './machines';
export * from './overview';
export * from './projects';
export * from './search';
export * from './sessions';
export * from './shell';
export * from './specstory';
export * from './terminal';

/**
 * THE preload bridge map (standing guardrail 1): every channel this build's
 * preload can invoke, as ONE flat intersection of per-domain maps.
 *
 * Phase 16 (G9) flattened it. Fifteen phases of parallel streams had each
 * appended a channel map AND a new superset alias over the previous superset —
 * Extended ⊂ All ⊂ Full ⊂ Complete ⊂ Depth ⊂ Registry ⊂ Branches ⊂ Gmux, nine
 * levels, each with its own `<X>InvokeChannel` / `Req` / `Res` trio. Every one
 * of those aliases was referenced only by the next alias in the chain (the
 * `Req`/`Res` trios were referenced by nothing at all), so reading the bridge
 * meant walking eight indirections to learn a set union. The set is unchanged
 * — the same 77 channels, verified key-for-key before and after — and it is
 * now readable in one screen.
 *
 * A future stream adds ONE line here: its own `<Domain>InvokeChannelMap`,
 * imported from its domain file above.
 */
export type GmuxInvokeChannelMap = InvokeChannelMap &
  ShellInvokeChannelMap &
  ScmInvokeChannelMap &
  TreeInvokeChannelMap &
  RestoreInvokeChannelMap &
  HardeningInvokeChannelMap &
  QuitInvokeChannelMap &
  GitDepthInvokeChannelMap &
  AgentsInvokeChannelMap &
  SettingsInvokeChannelMap &
  GitBranchesInvokeChannelMap &
  GitSyncInvokeChannelMap &
  DropInvokeChannelMap &
  TerminalCaptureInvokeChannelMap &
  TerminalScrollInvokeChannelMap &
  ActivityInvokeChannelMap &
  MultilineInvokeChannelMap &
  FileOpsInvokeChannelMap &
  ImageProjectInvokeChannelMap &
  FsDuplicateInvokeChannelMap &
  ViewMenuInvokeChannelMap &
  SearchInvokeChannelMap &
  QuickOpenInvokeChannelMap &
  SymbolsInvokeChannelMap &
  ScrollbackInvokeChannelMap &
  GitGraphInvokeChannelMap &
  GitIgnoreInvokeChannelMap &
  SpecStoryStatusInvokeChannelMap &
  CloneInvokeChannelMap &
  RecentsInvokeChannelMap &
  DurabilityInvokeChannelMap &
  PreviewInvokeChannelMap &
  ContextSnapshotInvokeChannelMap &
  ContextInvokeChannelMap &
  ConfigInvokeChannelMap &
  UpdatesInvokeChannelMap &
  GmuxPastSessionsChannelMap &
  OpenWithInvokeChannelMap &
  ActionsInvokeChannelMap &
  LogInvokeChannelMap &
  AskRestoreProjectInvokeChannelMap &
  ShellCommandInvokeChannelMap &
  MachinesInvokeChannelMap &
  ProjectPickerInvokeChannelMap &
  RemoteProjectInvokeChannelMap &
  ShellPathInvokeChannelMap &
  OverviewInvokeChannelMap;

export type GmuxInvokeChannel = keyof GmuxInvokeChannelMap;

export type GmuxInvokeReq<C extends GmuxInvokeChannel> =
  GmuxInvokeChannelMap[C]['req'];
export type GmuxInvokeRes<C extends GmuxInvokeChannel> =
  GmuxInvokeChannelMap[C]['res'];

/**
 * Every event channel main can broadcast: the frozen three plus the appends.
 * Event channels added after the freeze (menu actions, quit requests,
 * settings changes) are wired bespoke in the preload, exactly as this one is
 * — EventPayloadMap itself is never edited.
 */
export type AllEventPayloadMap = EventPayloadMap &
  ActivityEventPayloadMap &
  ScrollbackEventPayloadMap &
  CaptureEventPayloadMap &
  SymbolsEventPayloadMap &
  MenuEventPayloadMap &
  QuitEventPayloadMap &
  SettingsEventPayloadMap &
  RecentsEventPayloadMap &
  ActionsEventPayloadMap &
  PowerEventPayloadMap &
  UpdatesEventPayloadMap &
  MachineTestEventPayloadMap &
  // Phase 71. The machine link state, pushed on every change. It is a second
  // map rather than a member of the one above because that one is the
  // connection test's own bytes and this is not about a test at all.
  MachinesEventPayloadMap;

export type AllEventChannel = keyof AllEventPayloadMap;

// ---------------------------------------------------------------------------
// The installed surface — what the preload REALLY puts on window.gmux
// ---------------------------------------------------------------------------

/**
 * The `sessions` object the preload installs: the frozen base surface plus
 * discard, restore, restart, the Past Sessions list, and the Phase 60
 * restore ask.
 */
export type InstalledSessionsApi = GmuxApi['sessions'] &
  GmuxSessionExtras &
  GmuxSessionRestoreExtras &
  GmuxSessionRestartExtras &
  GmuxPastSessionsExtras &
  GmuxAskRestoreProjectExtras &
  GmuxShellPathExtras;

/**
 * The `projects` object the preload installs: the frozen base surface plus
 * create, the clone stream, and the Phase 74 folder picker that takes a
 * purpose. (`GmuxProjectExtras.rename` is declared in the contract but has
 * never been installed by the preload, so it is truthfully absent here.)
 */
export type InstalledProjectsApi = GmuxApi['projects'] &
  GmuxProjectCreateExtras &
  GmuxProjectCloneExtras &
  GmuxProjectPickerExtras &
  GmuxRemoteProjectExtras;

/** The `git` object the preload installs: base plus every appended stream. */
export type InstalledGitApi = GmuxApi['git'] &
  GmuxGitExtras &
  GmuxGitDepthExtras &
  GmuxGitBranchExtras &
  GmuxGitSyncExtras &
  GmuxGitGraphExtras &
  GmuxGitIgnoreExtras;

/**
 * The `fs` object the preload installs: base plus tree, ops, image and the
 * Phase 39 Open With pair.
 */
export type InstalledFsApi = GmuxApi['fs'] &
  GmuxFsExtras &
  GmuxFsOpsExtras &
  GmuxFsDuplicateExtras &
  GmuxImageExtras &
  GmuxOpenWithExtras;

/** The `term` object the preload installs: base plus acks and exit notices. */
export type InstalledTermApi = GmuxApi['term'] & GmuxTermStreamExtras;

/**
 * The whole installed bridge. The preload's `api` const is annotated with
 * this type and `Window.gmux` (src/renderer/env.d.ts) declares it, so the
 * declared surface and the installed one are the same type by construction.
 *
 * PHASE 122 made every member of it required, and that is what makes this
 * annotation carry the whole load. There is one preload file, it makes one
 * `contextBridge.exposeInMainWorld('gmux', api)` call, and `api` is one
 * object literal, so no build exists in which `machines` is installed and
 * `log` is not. If a required member is ever not installed,
 * `npm run typecheck` fails on src/preload/index.ts and names it. That is the
 * missing-member proof the audit asked for and it costs nothing at runtime.
 *
 * The intersection form stays. It is the assembly, and flattening it into one
 * hand-written interface would remove the very thing that proves the preload
 * installs all 93 members. The audit's "remove the Extras intersections" is
 * read as the intersections written at renderer CALL SITES, which are the
 * ones the finding says kept spreading. All 144 of those are gone.
 */
export type InstalledGmuxApi = GmuxApi & {
  sessions: InstalledSessionsApi;
  projects: InstalledProjectsApi;
  git: InstalledGitApi;
  fs: InstalledFsApi;
  term: InstalledTermApi;
} & GmuxLoginItemExtras &
  GmuxMenuExtras &
  GmuxAgentExtras &
  GmuxAgentRegistryExtras &
  GmuxPopupMenuExtras &
  GmuxQuitExtras &
  GmuxSettingsExtras &
  GmuxDropExtras &
  GmuxCaptureExtras &
  GmuxScrollExtras &
  GmuxActivityExtras &
  GmuxMultilineExtras &
  GmuxSearchExtras &
  GmuxSymbolsExtras &
  GmuxQuickOpenExtras &
  GmuxScrollbackExtras &
  GmuxSpecStoryExtras &
  GmuxRecentsExtras &
  GmuxNoticeExtras &
  GmuxPowerExtras &
  GmuxPreviewExtras &
  GmuxContextSnapshotExtras &
  GmuxContextExtras &
  GmuxConfigExtras &
  GmuxViewMenuExtras &
  GmuxUpdatesExtras &
  GmuxActionsExtras &
  GmuxLogExtras &
  GmuxShellExtras &
  GmuxMachinesExtras &
  GmuxOverviewExtras;
