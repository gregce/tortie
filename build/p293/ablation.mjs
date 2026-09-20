#!/usr/bin/env node
/**
 * `npm run ablation:p293`. The attack on `conformance:manager` (Phase 293, the
 * session manager).
 *
 * A GREEN GATE IS ONLY EVIDENCE IF IT CAN GO RED. The gate beside this file
 * asserts every rule the sheet enforces: the batch loop's five rules, the
 * freeze at the press, the run id a stop is bound to, who a batch may end, the
 * one gates predicate, the rule of the press, the parity rule, the grouping,
 * the view, the cells, and the source rules. This script breaks ONE CLAUSE AT
 * A TIME in the shipping source and proves it reddens THE RULE THAT OWNS IT.
 *
 * An ablation that leaves the gate green is a hole in the gate. An ablation
 * that reddens only rules OTHER than its own is a finding about the gate rather
 * than about the build, and it is printed as one.
 *
 * ## The ones that matter most, said first
 *
 * The phase's blocking findings were a batch that ended sessions nobody named
 * and a stale press that ended or removed a live one. Four entries below are
 * the whole of the defence against them, and each must redden its own rule:
 *
 *   - 7, the freeze: an id that was NOT named when the confirmation opened is a
 *     target at the press. The first pass of the spec REQUIRED this shape to be
 *     green. It is two locks, one in actions.ts and one in the store, and each
 *     has its own entry (7 and 7b), because removing either alone leaves the
 *     other refusing and an end-to-end check green.
 *   - 9, the run id: an old loop reads a NEW batch's clear stop flag as its own
 *     and ends a target after the manager closed.
 *   - 13 and 14, the press: a menu pick or a Retry acts on a row that changed
 *     since it was drawn.
 *
 * ## It never writes into the working tree
 *
 * Seven builders work in one worktree at once during a phase, and a harness
 * that writes into `src/` even for the second a gate takes can lose another
 * builder's edit. So it builds a CLONE, the shape of build/p276/ablation.mjs:
 * `cp -Rc` (APFS clonefile) of `src/` and `build/` under
 * `/private/tmp/p293-ablation-<pid>`, every tsconfig and package.json copied,
 * `node_modules` symlinked, and every gate run there with that directory as
 * its cwd. Each edited file is put back and CHECKED BY SHA256 against the
 * worktree's bytes before the next entry, and the clone is removed in a
 * `finally` and on a signal. Nothing under the operator's home is touched.
 *
 * ## It starts nothing
 *
 * No Electron, no tmux, no ssh, no agent, no token and no network. The gate
 * spawns one plain node per run, its own TypeScript probe. About 50 s for the
 * whole list, one gate run per entry plus the base and the restore; it runs
 * once per phase beside the gate it attacks, and is not in the commit battery.
 *
 * ## The delta rule
 *
 * The base's red rules are recorded first, and each ablation must make its own
 * rule NEWLY red. That proves the ablation CAUSED the reddening rather than
 * inheriting it, and it lets the harness run while a sibling's half is not
 * landed. A red base is still reported and still fails the run unless
 * `P293_ALLOW_RED_BASE=1` says the operator knows why.
 *
 * Usage:
 *   node build/p293/ablation.mjs
 *   P293_ONLY=7,7b,9 node build/p293/ablation.mjs     named entries only
 *   P293_ALLOW_RED_BASE=1 node build/p293/ablation.mjs
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p293-ablation]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);

const BATCH = 'src/renderer/session-manager/batch-end.ts';
const ACTIONS = 'src/renderer/session-manager/actions.ts';
const VIEW = 'src/renderer/session-manager/view.ts';
const COPY = 'src/renderer/session-manager/copy.ts';
const PROJECTION = 'src/renderer/session-manager/projection.ts';
const PAST_LIST = 'src/renderer/session-manager/PastList.tsx';
const REFRESH = 'src/renderer/session-manager/use-sheet-refresh.ts';
const GRID = 'src/renderer/session-manager/ManagedGrid.tsx';
const SLICE = 'src/renderer/state/session-manager-slice.ts';
const RESUME = 'src/renderer/state/resume.ts';
const POLICY = 'src/renderer/app/session-actions.tsx';
const ACTIVITY = 'src/main/overview/activity-map.ts';
const SHEET = 'src/renderer/session-manager/SessionManagerSheet.tsx';
const REPEAT = 'src/renderer/session-manager/repeat-click.ts';
const OPEN = 'src/renderer/session-manager/open.ts';
const KEYBOARD = 'src/renderer/app/keyboard.ts';
const MENU = 'src/renderer/app/menu-actions.ts';
const LAUNCH = 'src/renderer/settings/launch-agent.ts';

/**
 * The ablations. `n` is the row of build/p293/SPEC.md §7's table where it has
 * one (1 to 26), or a letter for the ones this gate adds. `rule` is the gate
 * rule that must go newly red. `why` is what the clause is FOR.
 */
const ABLATIONS = [
  // -------------------------------------------------------------------------
  // The batch loop, §4.9
  // -------------------------------------------------------------------------
  {
    n: '1',
    rule: 'B1',
    name: 'the pre-call list() dropped: one read serves the whole batch',
    why: 'a sheet is the first surface where a row can sit for minutes while another window changes it, and a batch that ends on a read taken before the target before it ends a session on stale news.',
    edits: [
      { file: BATCH, from: 'export type { BatchRowOutcome, BatchSkipReason };', to: 'export type { BatchRowOutcome, BatchSkipReason };\nlet firstRead: readonly Session[] | null | undefined;' },
      { file: BATCH, from: '    const sessions = await deps.list();', to: '    const sessions = (firstRead ??= await deps.list());' }
    ]
  },
  {
    n: '2',
    rule: 'B2',
    name: 'the target found by NAME',
    why: 'two sessions may share a name in two projects, and a lookup by name reads the other one.',
    file: BATCH,
    from: '    const session = sessions.find((one) => one.id === sessionId);',
    to: '    const byId = sessions.find((one) => one.id === sessionId);\n    const session = sessions.find((one) => one.name === byId?.name);'
  },
  {
    n: '3',
    rule: 'B3',
    name: 'end called for an id main no longer lists',
    why: 'an absent id is a row another window removed, a session that was started over, or a changed identity, and none of them is the session a person named.',
    file: BATCH,
    from: "    if (session === undefined) return { state: 'skipped', reason: 'gone' };",
    to: "    if (session === undefined) {\n      await deps.end(sessionId);\n      return { state: 'skipped', reason: 'gone' };\n    }"
  },
  {
    n: '4',
    rule: 'B4',
    name: 'the batch stops at the first failure',
    why: 'one machine that is not ready must not leave every later session running with no word said about them.',
    file: BATCH,
    from: "    if (outcome.state === 'ended') summary.ended += 1;",
    to: "    if (outcome.state === 'failed') stopped = true;\n    if (outcome.state === 'ended') summary.ended += 1;"
  },
  {
    n: '5',
    rule: 'B5',
    name: 'stopRequested ignored',
    why: 'Stop, and a manager that closed, are the only ways a person has to say "no more", and a loop that never asks ends everything out of sight.',
    file: BATCH,
    from: '    stopped = stopped || readStop(deps);',
    to: '    void readStop;'
  },
  // -------------------------------------------------------------------------
  // The freeze and the run, §4.9 steps 0, 1 and 8, and §2.10
  // -------------------------------------------------------------------------
  {
    n: '6',
    rule: 'B6',
    name: 'the press-time re-check skipped: targets = named',
    why: 'a named session that ended by itself, or turned unreachable, between the confirmation and the press is no longer what the person agreed to end.',
    file: ACTIONS,
    from: "    if (fresh === null || eligibleNow(s, fresh) !== 'yes') continue;\n    targets.push(id);",
    to: '    if (fresh === null) continue;\n    targets.push(id);'
  },
  {
    n: '7',
    rule: 'B7',
    name: 'an id that was not named at open admitted at the press (actions.ts)',
    why: 'THE FIRST PASS\'S DEFECT. A machine that reconnects while the confirmation is open turns `End 3` into `End 8`, and the five nobody read are ended.',
    file: ACTIONS,
    from: '    if (!named.has(id) || sheet.checked[id] !== true) continue;',
    to: '    if (sheet.checked[id] !== true) continue;'
  },
  {
    n: '7b',
    rule: 'B7',
    name: 'the store freezes an id that was not named',
    why: 'the second lock of the same rule. Removing either lock alone leaves the other refusing, so each has its own entry and its own check.',
    file: SLICE,
    from: '          (id) => named.has(id) && sheet.checked[id] === true',
    to: '          (id) => sheet.checked[id] === true'
  },
  {
    n: '8',
    rule: 'B8',
    name: 'a checked id the filters hide kept: the view is not intersected at naming or at the press',
    why: 'a row a person cannot see is never ended by a batch, and the batch never trusts that the prune has run.',
    file: ACTIONS,
    from: '  return visibleGroups(\n    projection.managed,',
    to: '  void visibleGroups;\n  return projection.managed;\n  return visibleGroups(\n    projection.managed,'
  },
  {
    n: '9',
    rule: 'B9',
    name: 'stopRequested() without the run id comparison',
    why: 'an old loop whose manager was closed and reopened reads the NEW batch\'s clear stop flag as its own and goes on ending its targets with no report drawn.',
    file: ACTIONS,
    from: '      return !(batch !== null && batch.runId === runId && !batch.stopRequested);',
    to: '      return !(batch !== null && !batch.stopRequested);'
  },
  {
    n: '10',
    rule: 'E1',
    name: 'a target on a machine this run holds no row for made eligible',
    why: 'such a row draws its RECORDED status, and main would end it by sending nothing and writing exited: a batch would report Ended for a process it never touched (R11).',
    file: BATCH,
    from: "  if (session.machine !== undefined && !machineKnown(session.machine.id)) {\n    return 'unreachable';\n  }",
    to: '  void machineKnown;'
  },
  // -------------------------------------------------------------------------
  // The gates, §4.1
  // -------------------------------------------------------------------------
  {
    n: '11',
    rule: 'G1',
    name: 'an unknown row passes canEnd',
    why: 'Tortie cannot see an unknown session, and acting on one that may be alive is how a second agent lands on one conversation.',
    file: RESUME,
    from: '    canEnd: live,',
    to: '    canEnd: live || unknown,'
  },
  {
    n: '12',
    rule: 'G1',
    name: 'a removed row passes canEnd',
    why: 'a removed session runs nowhere, and a kill of its id writes exited over the tombstone.',
    file: RESUME,
    from: '    canEnd: live,',
    to: '    canEnd: live || removed,'
  },
  // -------------------------------------------------------------------------
  // The press, §4.0 and §4.3
  // -------------------------------------------------------------------------
  {
    n: '13',
    rule: 'P1',
    name: 'a host method acts without re-reading its row (Remove)',
    why: 'a native menu runs a closure that can be seconds old; a Remove drawn on an ended row that has since turned live would tombstone a running session and leave its process with no row.',
    file: ACTIONS,
    from: "    if (freshRow(sessionId, 'managed', CAN_REMOVE) === null) return;",
    to: '    void CAN_REMOVE;'
  },
  {
    n: '14',
    rule: 'P2',
    name: 'Retry calls the lifecycle verb without the gate',
    why: 'Retry is pressed on a panel that can be minutes old, and the row under it may have turned live.',
    file: ACTIONS,
    from: "  if (freshRow(id, 'managed', CAN_REMOVE) === null) return;\n  const s = useApp.getState();\n  if (!s.markSessionSheetInlineBusy(id)) return;\n  const result = await s.removeSessionNow(id);",
    to: '  const s = useApp.getState();\n  if (!s.markSessionSheetInlineBusy(id)) return;\n  const result = await s.removeSessionNow(id);'
  },
  {
    n: '15',
    rule: 'P3',
    name: 'a continuation settles a panel that is not its own busy one',
    why: 'a failure written under another row puts a Retry there, and that Retry would act on a session the person never confirmed.',
    file: SLICE,
    from: '      if (inline.id !== id || inline.busy !== true) return false;',
    to: '      void id;'
  },
  {
    n: 'Z',
    rule: 'Z1',
    name: 'End reaches the kill bridge directly, spelled so no source rule can see it',
    why: 'the source rules read spellings, and a bridge reached through an element access is a spelling they do not know; the driven run is what catches a call that got past them.',
    file: ACTIONS,
    from: '  const result = await s.endSessionNow(id);',
    to: "  const result = await s.endSessionNow(id);\n  void (window as unknown as Record<string, Record<string, Record<string, (id: string) => unknown>>>)['gmux']?.['sessions']?.['kill']?.(id);"
  },
  // -------------------------------------------------------------------------
  // The policy's menu, §4.1 and §4.2
  // -------------------------------------------------------------------------
  {
    n: '16',
    rule: 'H1',
    name: "Remove's PRESENCE made to depend on canRemove",
    why: 'a build that cannot discard has always drawn Remove greyed; a presence folded into enablement makes the row vanish, and a parity test would pass because both arms share the regression.',
    file: POLICY,
    from: '    ...(gates.showsRemove\n',
    to: '    ...(gates.canRemove\n'
  },
  {
    n: '17',
    rule: 'H2',
    name: 'an item added under the host',
    why: 'THE PARITY RULE: a host changes what run does and nothing else, or the sheet is a second action policy.',
    file: POLICY,
    from: '  ].map(underHost(host));\n}\n\n/**\n * The × affordance',
    to: "  ].map(underHost(host)).concat(host === undefined ? [] : [{ label: 'Go there first', run: () => undefined }]);\n}\n\n/**\n * The × affordance"
  },
  // -------------------------------------------------------------------------
  // The projection and the view, §3.2, §2.4, §2.5, §2.10
  // -------------------------------------------------------------------------
  {
    n: '18',
    rule: 'R1',
    name: 'groups keyed by basename',
    why: 'two folders named app are two projects, and a batch named by the group would reach both.',
    file: PROJECTION,
    from: '    key: targetKey(resolved),',
    to: '    key: baseName(resolved.path),'
  },
  {
    n: '19',
    rule: 'R2',
    name: 'the machine dropped from the group key',
    why: 'one path on this Mac and on a machine are two folders on two computers.',
    file: PROJECTION,
    from: '    key: targetKey(resolved),',
    to: '    key: resolved.path,'
  },
  {
    n: '20',
    rule: 'V1',
    name: 'a null sorted first',
    why: 'the study sorted a dash as -1 and put every shell first on an ascending Messages sort; a dash is the absence of a number.',
    file: VIEW,
    from: '      return a.value === null ? 1 : -1;',
    to: '      return a.value === null ? -1 : 1;'
  },
  {
    n: '21',
    rule: 'V2',
    name: 'select-all over the unfiltered rows',
    why: 'select-all checks what the person can see; over the whole tab it checks rows the filters hide and a batch reaches them.',
    file: REFRESH,
    from: '    visibleIds: pastList === null ? visibleIds(groups) : pastListIds(pastList)',
    to: '    visibleIds: pastList === null ? visibleIds(all) : pastListIds(pastList)'
  },
  {
    n: '22',
    rule: 'V3',
    name: 'an indeterminate select-all click selects everything',
    why: 'it would widen a batch a person had narrowed by hand.',
    file: VIEW,
    from: '  if (on.length === 0) return { ids: [...visible], on: true };',
    to: '  if (on.length !== visible.length) return { ids: [...visible], on: true };'
  },
  {
    n: '23',
    rule: 'C1',
    name: 'a null reply count mapped to 0',
    why: 'gemini keeps asks and almost never replies; a zero there is a fact about the record and not about the conversation.',
    file: COPY,
    from: "  return { user, agent: typeof agent === 'number' ? agent : null };",
    to: '  return { user, agent: agent ?? 0 };'
  },
  {
    n: '24',
    rule: 'C2',
    name: 'clock ask drawn as clock message',
    why: 'cursor records no reply time; drawing the prompt\'s time as the reply\'s says "Agent reply, 3h ago" about the moment the person typed.',
    file: COPY,
    from: '      return { small: AGENT_REPLY_WORD, note: ASK_CLOCK_NOTE };',
    to: '      return { small: AGENT_REPLY_WORD, note: null };'
  },
  {
    n: '25',
    rule: 'C3',
    name: 'createdAt 0 drawn through dayLabel',
    why: 'a feed-only row whose far field was unreadable reads 0, and "Dec 31, 1969" beside "20,000d old" is a lie about that row.',
    file: COPY,
    from: '  if (!(createdAt > 0)) return dashCell(null);\n',
    to: ''
  },
  {
    n: '26',
    rule: 'V4',
    name: "the state filter's Running drawn as running alone",
    why: 'Running is every status End acts on; a filter that drops idle and needs-input hides live sessions from a select-all meant to end them.',
    file: VIEW,
    from: "  running: ['running', 'needs_input', 'idle'],",
    to: "  running: ['running'],"
  },
  {
    n: 'A',
    rule: 'A1',
    name: 'a record never read counted as zero asks',
    why: 'row 6 of the truth table: no-file is also what a resolver miss looks like, so it is a dash and never a zero.',
    file: ACTIVITY,
    from: '      stored.turns !== null && stored.turns > 0 ? stored.userMessages : null;',
    to: '      stored.turns !== null && stored.turns > 0 ? stored.userMessages : 0;'
  },
  // -------------------------------------------------------------------------
  // The source rules
  // -------------------------------------------------------------------------
  {
    n: 'T1',
    rule: 'T1',
    name: 'a DOM menu role drawn on the ellipsis',
    why: 'every row menu is native through ui:popupMenu; a DOM menu is a second one nobody can photograph as the same.',
    file: GRID,
    from: '      aria-haspopup="menu"',
    to: '      aria-haspopup="menu"\n      role="menu"'
  },
  {
    n: 'T2',
    rule: 'T2',
    name: 'the row menu drawn through a second call',
    why: 'setMenu is the one door to the native menu, and ContextMenu.tsx is where its items become the bridge\'s.',
    file: ACTIONS,
    from: '  useApp.getState().setMenu({',
    to: '  (window as unknown as { gmux: { ui: { popupMenu(v: unknown): void } } }).gmux.ui.popupMenu({'
  },
  {
    n: 'T3',
    rule: 'T3',
    name: 'a stacked confirm raised from the sheet',
    why: 'a ConfirmDialog over the sheet puts the keyboard on its destructive button; every sheet confirmation is an inline panel.',
    file: ACTIONS,
    from: '  useApp.getState().requestSessionSheetBatchStop();',
    to: '  useApp.getState().setConfirm(null);\n  useApp.getState().requestSessionSheetBatchStop();'
  },
  {
    n: 'T4',
    rule: 'T4',
    name: 'data-session-id stamped on a row',
    why: 'focusedSessionRowId() and menuPointFor() read it, and a second bearer behind a modal is how the remote review menu lands on the wrong row.',
    file: GRID,
    from: '      data-manage-row={row.id}',
    to: '      data-manage-row={row.id}\n      data-session-id={row.id}'
  },
  {
    n: 'T5',
    rule: 'T5',
    name: 'the discard bridge reached from the domain',
    why: 'sessions:discard tombstones and kills nothing; it is reached through removeSessionNow, which re-checks the row, and from nowhere else.',
    file: ACTIONS,
    from: '  if (useApp.getState().closeSessionSheetBatch()) {',
    to: "  void (window as unknown as { gmux: { sessions: { discard(id: string): void } } }).gmux.sessions.discard('x');\n  if (useApp.getState().closeSessionSheetBatch()) {"
  },
  {
    n: 'T6',
    rule: 'T6',
    name: 'the kill bridge reached from the domain',
    why: 'End is endSessionNow, which re-checks the row and answers main\'s sentence; a second path ends with neither.',
    file: ACTIONS,
    from: '  const result = await s.endSessionNow(id);',
    to: "  const result = await s.endSessionNow(id);\n  void (window as unknown as { gmux: { sessions: { kill(id: string): void } } }).gmux.sessions.kill(id);"
  },
  {
    n: 'T7',
    rule: 'T7',
    name: 'Restart called with no freshRow above it',
    why: 'Restart is the one verb here that ends in a HARD DELETE of the old row; a stale pick over a row that turned live kills a person\'s running work and leaves nothing to restore.',
    file: ACTIONS,
    from: "  if (freshRow(id, 'managed', (g) => g.offersRestart) === null) return;\n  restarting.add(id);",
    to: '  restarting.add(id);'
  },
  {
    n: 'T8',
    rule: 'T8',
    name: 'batch-end.ts spells another verb',
    why: 'the loop ends sessions and does nothing else, and the gate cannot tell a refusal of another verb from a call of it.',
    file: BATCH,
    from: 'export interface BatchEndSummary {',
    to: '// A restore is never part of a batch.\nexport interface BatchEndSummary {'
  },
  {
    n: 'T9',
    rule: 'T9',
    name: 'the drawn row\'s session read in manageMenuItems',
    why: 'the projection is what is DRAWN and never what is ACTED ON; a session read off a drawn row is seconds old.',
    file: ACTIONS,
    from: '  const { id, tab } = row;',
    to: '  const { id, tab, session: drawn } = row;\n  void drawn;'
  },
  {
    n: 'T10',
    rule: 'T10',
    name: 'a tmux word in the sheet\'s copy',
    why: 'sessions have names; the words pane, window and prefix belong to the machinery under them.',
    file: COPY,
    from: "export const SESSION_CHANGED = 'This session changed. Nothing was done.';",
    to: "export const SESSION_CHANGED = 'This pane changed. Nothing was done.';"
  },
  {
    n: 'T11',
    rule: 'T11',
    name: 'a ?? 0 in copy.ts',
    why: 'invariant 2 makes the counts numbers where they may be drawn, so a default to zero is only ever a null drawn as a digit.',
    file: COPY,
    from: '  return user + agent;',
    to: '  return user + (agent ?? 0);'
  },
  {
    n: 'T12',
    rule: 'T12',
    name: 'a session name handed to a lifecycle call',
    why: 'two sessions may share a name; every call is by session ID.',
    file: ACTIONS,
    from: '    const result = await useApp.getState().restartSessionNow(id);',
    to: '    const result = await useApp.getState().restartSessionNow(useApp.getState().sessions.find((one: { id: string }) => one.id === id)?.name ?? id);'
  },
  {
    n: 'T13',
    rule: 'T13',
    name: 'the projection imports from diagnostics',
    why: 'a diagnostics row can carry no session id, and nothing without one is ever a target; the sheet\'s only inputs are the session lists.',
    file: PROJECTION,
    from: "import { baseName } from '../editor/paths';",
    to: "import { baseName } from '../editor/paths';\nimport type {} from '@shared/ipc/diagnostics';"
  },
  // -------------------------------------------------------------------------
  // The fix round: what the verifiers measured worse than today, or unsafe
  // -------------------------------------------------------------------------
  {
    n: 'W1',
    rule: 'L1',
    name: 'a Past restore keeps the sheet open and lands nowhere',
    why: 'today one press on Restore closed Past Sessions and put the person in the session; the first build left them in the sheet with a toast that went in five seconds (the no-regression verifier\'s W1).',
    file: ACTIONS,
    from: "  if (tab === 'past') {\n    landPastRestore(restored, outcome.note);\n    return;\n  }\n",
    to: '  void landPastRestore;\n'
  },
  {
    n: 'W2',
    rule: 'R3',
    name: 'the Past tab grouped by project under All again',
    why: 'today Past Sessions is one list in removal order, and the operator ruled it stays one (2026-09-19); grouped, removals that alternate between projects lose their order and the second newest fell from row 2 to row 22 of 22 (the reverify\'s X5).',
    file: VIEW,
    from: "  if (filters.project !== 'all') return null;",
    to: '  return null;'
  },
  {
    n: 'W2b',
    rule: 'R3',
    name: 'the single list taken group by group',
    why: 'one list drawn project after project is the grouped order without the headings, and it moves the second newest removal exactly as grouping did.',
    file: PROJECTION,
    from: '    pastRows: past.inOrder,',
    to: '    pastRows: past.groups.flatMap((group) => group.rows),'
  },
  {
    n: 'W2c',
    rule: 'R3',
    name: 'the single list re-sorted by removal time',
    why: 'the order is main\'s, copied; today\'s panel never re-sorted what main answered, and a second sort is a second policy that can disagree with the first.',
    file: VIEW,
    from: '  const out: PastEntry[] = [];\n  for (const row of rows) {',
    to: '  const out: PastEntry[] = [];\n  for (const row of [...rows].sort((a, b) => (b.session.removedAt ?? 0) - (a.session.removedAt ?? 0))) {'
  },
  {
    n: 'W2d',
    rule: 'T16',
    name: "the project's name back on a Past row in place of its folder",
    why: 'two projects can be named alike; with the label alone /nr/one/app and /nr/two/app drew the same line and a person could not tell which row was which (the reverify, R1).',
    file: PAST_LIST,
    from: '    !underHead || isOutsideProject(session) ? displayPath(session.cwd) : null;',
    to: '    !underHead ? group.label : isOutsideProject(session) ? displayPath(session.cwd) : null;'
  },
  {
    n: 'W2e',
    rule: 'T16',
    name: "the whole folder dropped from a Past row's hover",
    why: "a shortened path is the only thing on the row, so without the hover two folders that shorten alike are still one line.",
    file: PAST_LIST,
    from: '          title={row.session.cwd}\n',
    to: ''
  },
  {
    n: 'W2f',
    rule: 'T16',
    name: 'the folder cut down to its last segment',
    why: "the last segment of /nr/one/app IS `app`, the project's name by another road, so the two rows read alike again (the reverify's RV-1, a shape the first T16 stayed green on).",
    file: PAST_LIST,
    from: '    !underHead || isOutsideProject(session) ? displayPath(session.cwd) : null;',
    to: "    !underHead || isOutsideProject(session)\n      ? displayPath(session.cwd).split('/').slice(-1)[0]\n      : null;"
  },
  {
    n: 'W2g',
    rule: 'T16',
    name: 'the single list left without its folder',
    why: 'with the !underHead arm gone an in-project session draws no folder at all under All, which is the defect with the folder missing rather than wrong (the reverify\'s RV-1).',
    file: PAST_LIST,
    from: '    !underHead || isOutsideProject(session) ? displayPath(session.cwd) : null;',
    to: '    isOutsideProject(session) ? displayPath(session.cwd) : null;'
  },
  {
    n: 'W3',
    rule: 'O1',
    name: 'the doors refuse under the Catch Me Up page again',
    why: 'today Past Sessions opens over the page and closes back onto it; a refusal there is a silent no-op (W3).',
    file: OPEN,
    from: '    s.confirm !== null ||\n    s.newProjectOpen ||',
    to: '    s.confirm !== null ||\n    s.overview !== null ||\n    s.newProjectOpen ||'
  },
  {
    n: 'W3b',
    rule: 'O1',
    name: 'the doors refuse under the New Session sheet again',
    why: 'the second half of W3: today Past Sessions opens over the create sheet.',
    file: OPEN,
    from: '    s.confirm !== null ||\n    s.newProjectOpen ||',
    to: '    s.confirm !== null ||\n    s.createOpen ||\n    s.newProjectOpen ||'
  },
  {
    n: 'W4',
    rule: 'V5',
    name: 'the stored path out of the search text',
    why: 'today a pasted absolute path, or a user name, finds its removed sessions; under /Users the drawn form is ~/… and found nothing (W4).',
    file: PROJECTION,
    from: '            identity.path,\n            session.cwd === identity.path ? null : session.cwd,\n',
    to: ''
  },
  {
    n: 'W7',
    rule: 'F1',
    name: 'a gone folder not read as gone',
    why: 'today the first press says the folder no longer exists; the first build drew an ask promising a shell in it (W7).',
    file: ACTIONS,
    from: '    return /\\b(ENOENT|ENOTDIR)\\b/.test(detail);',
    to: '    return detail === null;'
  },
  {
    n: 'Bt',
    rule: 'K1',
    name: 'the closed toast always says there was a rest',
    why: 'closed during the last target\'s own call, nothing was left running, and the sentence was false (the batch attack\'s P2).',
    file: COPY,
    from: '  return notRun > 0\n',
    to: '  return notRun >= 0\n'
  },
  {
    n: 'Dc',
    rule: 'T14',
    name: 'the root no longer swallows the second click of a double click',
    why: 'THE MAJOR FINDING OF THE ROUND. The second click landed on an ended row\'s Restore that slid under the pointer and restored a session nobody named, four times in four.',
    file: SHEET,
    from: '        onClickCapture={swallowRepeatClick}\n',
    to: ''
  },
  {
    n: 'Db',
    rule: 'T14',
    name: 'a repeated click read as a first one',
    why: 'the same finding: the rule is detail > 1, and nothing else tells a double click\'s second click from a first.',
    file: REPEAT,
    from: '  if (!(e.detail > 1)) return false;',
    to: '  if (!(e.detail > 2)) return false;'
  },
  {
    n: 'Ar',
    rule: 'T15',
    name: 'the split arrows act behind the sheet again',
    why: 'they selected a session behind the sheet and its terminal took the keyboard (the press attack\'s P1).',
    file: KEYBOARD,
    from: '      if (useApp.getState().sessionSheet !== null) {\n        e.preventDefault();\n        return;\n      }\n',
    to: ''
  },
  {
    n: 'Hk',
    rule: 'T15',
    name: 'an agent hotkey starts a session behind the sheet again',
    why: 'a process a person cannot see, started by a key they may have meant for the list (the press attack\'s P3).',
    file: LAUNCH,
    from: '  if (s.sessionSheet !== null) return;\n  const project = s.activeProject();',
    to: '  const project = s.activeProject();'
  },
  {
    n: 'Cp',
    rule: 'T15',
    name: 'Close Project… stacks its confirmation on the sheet again',
    why: 'a question about the tab behind the sheet, focus on its primary button; closing the sheet first asks it over the tab it names (the press attack\'s P2, W6).',
    file: MENU,
    from: '        leaveSessionManagerFor(() => useApp.getState().closeProject(projectId));',
    to: '        useApp.getState().closeProject(projectId);'
  }
];

// ---------------------------------------------------------------------------
// The clone, and the gate run inside it
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join('/private/tmp', `p293-ablation-${String(process.pid)}-`));
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

function buildClone() {
  for (const name of ['src', 'build']) {
    const r = spawnSync('cp', ['-Rc', join(REPO, name), join(scratch, name)], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`cp -Rc ${name} failed: ${r.stderr}`);
  }
  // EVERY tsconfig: tsx resolves project references out of tsconfig.json, and
  // a clone holding one alone dies on a missing sibling (ablation:p275's lesson).
  for (const name of ['package.json', ...readdirSync(REPO).filter((f) => /^tsconfig(\.[a-z]+)?\.json$/.test(f))]) {
    writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
  }
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
}

function runGate() {
  const r = spawnSync(process.execPath, [join(scratch, 'build/p293/conformance-manager.mjs')], {
    cwd: scratch,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120_000
  });
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const red = [...new Set([...text.matchAll(/\[p293 ([A-Z]+[0-9]*)\]/g)].map((m) => m[1]))];
  return { code: r.status ?? 1, red, text };
}

/** Put one clone file back and prove it by sha256 against the worktree. */
function restore(rel) {
  const want = readFileSync(join(REPO, rel));
  writeFileSync(join(scratch, rel), want);
  const got = readFileSync(join(scratch, rel));
  if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
}

/** One exact replacement inside the clone; a function replacer, so `$&` in the text stays literal. */
function ablate(rel, from, to) {
  const path = join(scratch, rel);
  const text = readFileSync(path, 'utf8');
  if (!text.includes(from)) return false;
  writeFileSync(path, text.replace(from, () => to), 'utf8');
  return true;
}

let cleaned = false;
const clean = () => {
  if (cleaned) return;
  cleaned = true;
  try {
    rmSync(scratch, { recursive: true, force: true });
  } catch {
    /* under /private/tmp; not fatal */
  }
};
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    clean();
    process.exit(130);
  });
}

// The worktree's bytes for every file an entry touches, before anything runs,
// so the report can say the worktree was never written.
const touchedFiles = [...new Set(ABLATIONS.flatMap((a) => (a.edits ?? [{ file: a.file }]).map((e) => e.file)))];
const worktreeBefore = new Map(touchedFiles.map((f) => [f, sha(readFileSync(join(REPO, f)))]));

const problems = [];
const table = [];
let ran = 0;
const started = Date.now();

try {
  buildClone();
  say(`clone at ${scratch}, node_modules symlinked, nothing under a home touched`);
  const base = runGate();
  const baseRed = new Set(base.red);
  if (base.code === 0) {
    say('base: the gate is green, 0 rules red');
  } else {
    say(`base: THE GATE IS ALREADY RED on ${baseRed.size === 0 ? 'no numbered rule, so it failed to run' : [...baseRed].join(', ')}`);
    for (const line of base.text.split('\n').filter((l) => l.includes('  - ')).slice(0, 8)) say(`  base failure: ${line.trim().slice(0, 240)}`);
    if (process.env['P293_ALLOW_RED_BASE'] !== '1') {
      problems.push('the gate was red before any ablation ran. Every reading below is still a DELTA against that base, but re-run with P293_ALLOW_RED_BASE=1 once you know why.');
    }
  }
  const only = (process.env['P293_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
  for (const entry of ABLATIONS) {
    if (only.length > 0 && !only.includes(entry.n)) continue;
    const edits = entry.edits ?? [{ file: entry.file, from: entry.from, to: entry.to }];
    const files = [...new Set(edits.map((e) => e.file))];
    const missed = edits.filter((e) => !ablate(e.file, e.from, e.to));
    if (missed.length > 0) {
      for (const m of missed) {
        problems.push(`${entry.n} "${entry.name}": the shape to ablate is not in ${m.file}. Either the clause moved, and this entry moves with it in the same commit, or it is gone and ${entry.rule} is unproven. It looked for: ${JSON.stringify(m.from).slice(0, 200)}`);
      }
      for (const f of files) restore(f);
      table.push([entry.n, entry.rule, 'SHAPE MISSING', '']);
      continue;
    }
    ran += 1;
    const out = runGate();
    const newlyRed = out.red.filter((r) => !baseRed.has(r));
    const own = newlyRed.includes(entry.rule);
    table.push([entry.n, entry.rule, out.code === 0 ? 'GREEN' : own ? 'red' : 'RED ELSEWHERE', newlyRed.join(',')]);
    say(`${entry.n.padEnd(3)} ${entry.rule.padEnd(4)} ${entry.name}: exit ${String(out.code)}, newly red ${newlyRed.join(', ') || 'nothing'}`);
    if (out.code === 0) {
      problems.push(`${entry.n} "${entry.name}": the gate stayed GREEN. ${entry.why} Nothing in the gate notices, so ${entry.rule} is decoration.`);
    } else if (!own) {
      const lines = out.text.split('\n').filter((l) => l.trim().startsWith('- ')).slice(0, 4).map((l) => l.trim().slice(0, 240));
      const tail = lines.length > 0 ? lines : out.text.split('\n').filter((l) => l.trim() !== '').slice(-4).map((l) => l.trim().slice(0, 240));
      problems.push(`${entry.n} "${entry.name}": the gate went red but ${entry.rule} did not (red instead: ${newlyRed.join(', ') || 'nothing numbered'}). ${tail.join(' // ')}`);
    }
    for (const f of files) restore(f);
  }
  const after = runGate();
  if (after.code !== base.code) {
    problems.push(`after every file was restored the gate exited ${String(after.code)} where the base exited ${String(base.code)}, so a restore did not land.`);
  } else {
    say(`restored: every touched clone file matches the worktree by sha256, and the gate is back where it started (exit ${String(after.code)})`);
  }
} catch (err) {
  problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  clean();
}

// The worktree was never written: every file an entry names has the bytes it had.
for (const [file, before] of worktreeBefore) {
  const now = sha(readFileSync(join(REPO, file)));
  if (now !== before) problems.push(`${file} in the WORKTREE changed during the run (${before.slice(0, 12)} to ${now.slice(0, 12)}); this harness writes only its clone, so another process wrote it`);
}

process.stdout.write('\n');
for (const [n, rule, verdict, red] of table) process.stdout.write(`${TAG}   ${n.padEnd(4)} ${rule.padEnd(5)} ${verdict.padEnd(14)} ${red}\n`);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (problems.length > 0) {
  process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS in ${seconds} s. ${String(ran)} ablations, one clause each, and every one reddened THE RULE THAT OWNS IT, ` +
    'measured as a DELTA against the base. Every clone file was restored and proved by sha256, the worktree was ' +
    'never written, and the clone is gone. No Electron, no tmux, no ssh, no agent, no token.\n'
);
