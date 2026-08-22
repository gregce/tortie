/**
 * The machines contract (Phase 68, M1). Thirty seven invoke channels behind ONE
 * optional preload extra, `window.gmux.machines`, plus three event channels,
 * one for the connection test's own bytes, one for the link state and one for
 * which agents each machine has.
 *
 * THIS COUNT HAD GONE STALE and Phase 108 says so rather than quietly fixing
 * it: this line read twenty four while the map below held twenty seven. The
 * per phase count lines above the channel table are the ones each phase moves,
 * and Phase 108 moved this line to agree with them at twenty eight.
 *
 * IT WENT STALE TWICE MORE and Phase 125 says so rather than quietly fixing it.
 * This line read thirty two, the paragraph above the channel table read twenty
 * six, and the map held thirty seven. Both lines now say thirty seven. The
 * event count was stale in the same sentence, reading two while three channels
 * existed, because Phase 109 added `machines:agentsChanged` without moving it.
 *
 * PHASE 125 SPLIT THIS FILE AND THIS FILE IS NOW THE BARREL. The one hundred
 * and three shapes moved into nine domain files under src/shared/ipc/machines/,
 * one per capability family, and each of the nine declares its own channels and
 * its own bridge methods. What stays here is the two compositions that span
 * every family, being `MachinesInvokeChannelMap` and `GmuxMachinesExtras`, plus
 * the whole contract table below.
 *
 *   rows.ts        the machine as a configuration row a person confirms
 *   connection.ts  the connection test and the key install
 *   presence.ts    the link state and which agents a machine has
 *   filesystem.ts  folders, files and image bytes on a machine
 *   scm.ts         git on a machine
 *   projects.ts    finding and cloning a folder on a machine
 *   sessions.ts    reading a session's lines from a machine
 *   search.ts      searching a machine's files
 *   context.ts     the Context panel's read of a folder on a machine
 *
 * NOTHING OUTSIDE src/shared/ipc/ IMPORTS ONE OF THE NINE. This file is the one
 * door and src/shared/ipc/index.ts re-exports it, which is the shape Phase 42
 * set when it split src/shared/ipc.ts. The FACADE_ONLY rule in
 * build/assert-import-boundaries.mjs fails a second door, and
 * src/shared/__tests__/p125-machines-surface.test.ts holds the member list.
 *
 * WHAT THESE ARE FOR. A machine is a configuration row that names a computer
 * Tortie may sign in to as the user. Before Tortie signs in, a person reads what
 * it will run there and agrees to it once, out of band of any agent turn, and
 * the agreement is bound to a hash of the six fields that decide what runs.
 * Change one of those fields and it asks again. Phase 68 shipped four of them,
 * Phase 83 added the accepted tmux version as the fifth, and Phase 101 added
 * the folder Tortie may save under as the sixth.
 *
 * WHAT NO CHANNEL HERE DOES, and this is the point of the list rather than a
 * caveat on it.
 *
 *  - No channel opens a session on a machine. This phase builds no such path.
 *  - No channel starts anything on a file change. `machines:reload` returns rows
 *    and does nothing else.
 *  - No channel writes a passphrase or an ssh config file, on either machine.
 *  - No channel sets a session's status.
 *
 * PHASE 79.1 CHANGED ONE OF THOSE LINES, and the old one is written out above
 * rather than quietly edited. It used to say that no channel writes a key. One
 * now does. `machines:installKey` makes a key for one machine, keeps the
 * private half in Tortie's own data directory, and adds the public half to one
 * file on that machine. It never reads, writes or moves anything under the
 * person's own `~/.ssh` on this Mac. It asks a hash of what the person read
 * before it starts anything, and a hash that is not the one main would compute
 * now refuses and sends nothing.
 *
 * The one process this contract can start is ssh, and it starts on a person
 * pressing a button in Settings. `machines:test` and `machines:installKey` are
 * those buttons. Everything else reads memory, or writes one row and one
 * record.
 *
 * MAIN: src/main/machines/ipc.ts, the one `machines:*` registrar.
 */

import type {
  MachinesRowsApi,
  MachinesRowsInvokeChannelMap
} from './machines/rows';
import type {
  MachinesConnectionApi,
  MachinesConnectionInvokeChannelMap
} from './machines/connection';
import type {
  MachinesPresenceApi,
  MachinesPresenceInvokeChannelMap
} from './machines/presence';
import type {
  MachinesFilesystemApi,
  MachinesFilesystemInvokeChannelMap
} from './machines/filesystem';
import type {
  MachinesScmApi,
  MachinesScmInvokeChannelMap
} from './machines/scm';
import type {
  MachinesProjectsApi,
  MachinesProjectsInvokeChannelMap
} from './machines/projects';
import type {
  MachinesSessionsApi,
  MachinesSessionsInvokeChannelMap
} from './machines/sessions';
import type {
  MachinesSearchApi,
  MachinesSearchInvokeChannelMap
} from './machines/search';
import type {
  MachinesContextApi,
  MachinesContextInvokeChannelMap
} from './machines/context';

// The one door. Every shape the nine families declare is re-exported here, so
// `export * from './machines'` in src/shared/ipc/index.ts still reaches all of
// them and no caller outside this directory changes one line.
export * from './machines/rows';
export * from './machines/connection';
export * from './machines/presence';
export * from './machines/filesystem';
export * from './machines/scm';
export * from './machines/projects';
export * from './machines/sessions';
export * from './machines/search';
export * from './machines/context';

// ---------------------------------------------------------------------------
// The channels
// ---------------------------------------------------------------------------

/**
 * The thirty seven channels, and what each one may do. Each family declares
 * its own, and this table is the whole contract in one place.
 *
 * THE COUNT USED TO SAY THIRTEEN and the table listed thirteen rows, which was
 * true when Phase 68 wrote it. Phase 73, Phase 83, Phase 84 and Phase 90.2
 * each added channels without adding rows, so the table described a contract
 * the file no longer held. The missing seven were written out rather than left
 * to be counted by hand.
 *
 * IT WENT STALE AGAIN, and Phase 98 says so rather than quietly fixing it.
 * Phase 90.3 added `listTree` without a row, so the count read twenty while the
 * file held twenty one. Both that row and Phase 98's own are in the table now.
 * PHASE 99 ADDS ONE ROW AND MOVES THE COUNT WITH IT, being `listFiles`.
 *
 * IT WAS STALE AGAIN WHEN PHASE 105 ARRIVED, and this says so rather than
 * quietly fixing it. Phase 100 added `readSessionLines` without a row, so the
 * count read twenty three while the file held twenty four. That row and Phase
 * 105's own `readRuns` are both in the table below, and the count is twenty
 * five.
 *
 * PHASE 106 ADDS ONE ROW AND MOVES THE COUNT WITH IT, being `readBranch`. The
 * count is twenty six.
 *
 * PHASE 107 ADDS ONE ROW AND MOVES THE COUNT WITH IT, being `readHistory`. The
 * count is twenty seven.
 *
 * PHASE 108 ADDS ONE ROW AND MOVES THE COUNT WITH IT, being `readContext`. The
 * count is twenty eight.
 *
 * PHASE 109 ADDS ONE ROW AND MOVES THE COUNT WITH IT, being `agents`. The
 * count is twenty nine.
 *
 * PHASE 101 ADDS THREE ROWS AND MOVES THE COUNT WITH THEM, being `writeSheet`,
 * `allowWrites` and `putFile`. The count is thirty two.
 *
 * PHASE 102 ADDS TWO ROWS AND MOVES THE COUNT WITH THEM, being `makeDir` and
 * `renameEntry`. The count is thirty four.
 *
 * PHASE 103 ADDS TWO ROWS AND MOVES THE COUNT WITH THEM, being `stage` and
 * `unstage`. The count is thirty six. They are the sixth and the seventh
 * channels here that write on another computer, and the first two that change
 * a git repository over there.
 *
 * PHASE 104 ADDS ONE ROW AND MOVES THE COUNT WITH IT, being `commit`. The count
 * is thirty seven. It is the eighth channel here that writes on another
 * computer and the third that changes a git repository over there.
 *
 * | Channel | Reads | Writes | Spawns |
 * | --- | --- | --- | --- |
 * | rows | memory in main, plus the sealed record | nothing | nothing |
 * | reload | machines.json and the record | nothing | nothing |
 * | tailscaleNames | the tailnet state | nothing | the pinned Tailscale program |
 * | test | the form or one row | nothing | one ssh |
 * | testInput | nothing | the live pty | nothing |
 * | testCancel | nothing | nothing | nothing |
 * | add | the sheet's hash | machines.json and one record | nothing |
 * | confirm | the row | one record | nothing |
 * | acceptVersion | the sheet's hash and one row | machines.json and one record | nothing |
 * | forget | nothing | one record removed | nothing |
 * | remove | nothing | machines.json and one record removed | nothing |
 * | prepare | one row and the sealed record | settings on that machine | ssh |
 * | state | memory in main | nothing | nothing |
 * | installKey | the block's hash | one key here, one line on that machine | ssh-keygen, then ssh |
 * | putImage | one file on this Mac | one file on that machine | ssh |
 * | reviewFiles | one folder on that machine | nothing | ssh |
 * | reviewFile | one file on that machine | nothing | ssh |
 * | stage | one folder on that machine, twice | that repository's index | ssh |
 * | unstage | one folder on that machine, twice | that repository's index | ssh |
 * | listDir | one folder on that machine | nothing | ssh |
 * | findProject | one git config here, one folder walk there | nothing | ssh |
 * | cloneProject | one git config here | one folder on that machine | ssh |
 * | listTree | one folder tree on that machine | nothing | ssh |
 * | searchContent | one folder on that machine | nothing | ssh |
 * | listFiles | one folder on that machine | nothing | ssh |
 * | readSessionLines | the last lines of one session there | nothing | ssh |
 * | readRuns | one folder on that machine, then github.com | nothing | ssh, then gh ON THIS MAC |
 * | readBranch | one folder on that machine | nothing | ssh |
 * | readHistory | one folder on that machine | nothing | ssh |
 * | readContext | agent configuration files on that machine | nothing | ssh |
 * | agents | memory in main, or one batched read of that machine | nothing | ssh only when fresh is true |
 * | writeSheet | one row and the sealed record | nothing | nothing |
 * | allowWrites | the sheet's hash and one row | machines.json and one record | nothing |
 * | putFile | one row and one file's bytes from the renderer | one file on that machine | ssh |
 * | makeDir | one row and one path from the renderer | one folder on that machine | ssh |
 * | renameEntry | one row and two paths from the renderer | one entry moved on that machine | ssh |
 * | commit | one row, then one folder on that machine | one commit in that repository | ssh |
 *
 * `readRuns` is the one row whose Spawns column names two programs. The ssh is
 * the read of that machine's branch. The gh runs HERE and never leaves this Mac,
 * and nothing about it crosses the link.
 *
 * Every one of them that spawns does so on a person's click and from nowhere
 * else. EIGHT of them write on another computer, being `putImage`,
 * `cloneProject`, `putFile`, `makeDir`, `renameEntry`, `stage`, `unstage` and
 * `commit`, and that number is the number this product is allowed to have. It
 * moved from one to two in Phase 90.2, from two to three in Phase 101, from
 * three to five in Phase 102, from five to seven in Phase 103 and from seven to
 * eight in Phase 104, deliberately and once each time.
 *
 * THIS PARAGRAPH SAID FIVE UNTIL PHASE 104 AND IT IS WRITTEN OUT RATHER THAN
 * QUIETLY FIXED. It was already false at seven when Phase 103 shipped. The
 * count that is enforced lives in `ALLOWED_WRITERS` in
 * `build/conformance-machines.mjs` and in `remoteWriteScripts()`, and never in
 * this sentence.
 *
 * `machines:prepare` is Phase 69's one new channel, and it is the first thing
 * Tortie ever STARTS on another machine. It asks the confirm gate before it
 * spawns anything, it reads the version before it starts a server, and it refuses
 * a version nobody measured. It opens no session, because this release has no
 * path that could.
 */
export type MachinesInvokeChannelMap = MachinesRowsInvokeChannelMap &
  MachinesConnectionInvokeChannelMap &
  MachinesPresenceInvokeChannelMap &
  MachinesFilesystemInvokeChannelMap &
  MachinesScmInvokeChannelMap &
  MachinesProjectsInvokeChannelMap &
  MachinesSessionsInvokeChannelMap &
  MachinesSearchInvokeChannelMap &
  MachinesContextInvokeChannelMap;

/**
 * Extra on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 *
 * A build without it shows no Machines section, which is the ordinary case for
 * a person who has no other machine.
 */
export interface GmuxMachinesExtras {
  machines: MachinesRowsApi &
    MachinesConnectionApi &
    MachinesPresenceApi &
    MachinesFilesystemApi &
    MachinesScmApi &
    MachinesProjectsApi &
    MachinesSessionsApi &
    MachinesSearchApi &
    MachinesContextApi;
}
