/**
 * The machines half of the bridge (Phase 68, one call added in Phase 69, one
 * more in Phase 71, one more in Phase 79.1, one more in Phase 83, one more in
 * Phase 84, two more in Phase 90.2, one more in Phase 90.3, one more in
 * Phase 98, one more in Phase 99, one more in Phase 100, one more in Phase 105,
 * one more in Phase 106, one more in Phase 107, one more in Phase 108 and one
 * call plus one subscription in Phase 109, three more in Phase 101 and two
 * more in Phase 102 and two more in Phase 103). One object, thirty six calls
 * and three subscriptions,
 * typed from the shared contract. THE COUNT HAD GONE
 * STALE and Phase 108 says so rather than quietly fixing it: this header named
 * neither Phase 107 nor its call while the object already carried
 * `readHistory`.
 *
 * SEVEN of these calls write on another computer, being `putImage`,
 * `cloneProject`, `putFile`, `makeDir`, `renameEntry`, `stage` and `unstage`.
 * The last two are the only ones that change a git repository over there.
 * `allowWrites` writes on THIS Mac, being one field of one row and one record.
 * Everything else on this bridge reads.
 *
 * Four of these calls can start a process from Settings, and every one of them
 * is a person pressing a button there. `tailscaleNames` runs the Tailscale program at
 * a pinned absolute path, `test` runs ssh once, `prepare` runs ssh and starts
 * the program a machine's work will live in, and `installKey` runs the program
 * macOS ships for making a key and then one ssh. Everything else reads memory
 * in main, writes one row, or writes one record.
 *
 * The renderer never supplies the acknowledgement sentence and never supplies
 * the hash it wants recorded. It sends back the hash the sheet was drawn from
 * and the lines that were on it, and main refuses a stale hash, so "a person
 * agreed to THESE details" cannot be forged from this side of the bridge.
 *
 * There is deliberately no `connect` and no `open a session`. Phase 68 builds
 * neither, and a later phase adds them through their own channels rather than
 * by widening one of these.
 */

import type { GmuxMachinesExtras } from '../shared/ipc';
import {
  EVT_MACHINE_AGENTS,
  EVT_MACHINE_STATE,
  EVT_MACHINE_TEST
} from '../shared/ipc';
import { invoke, on } from './bridge';

export const machines: GmuxMachinesExtras['machines'] = {
  rows: () => invoke('machines:rows'),
  reload: () => invoke('machines:reload'),
  tailscaleNames: () => invoke('machines:tailscaleNames'),
  test: (input) => invoke('machines:test', input),
  testInput: (input) => invoke('machines:testInput', input),
  testCancel: (testId) => invoke('machines:testCancel', testId),
  add: (input) => invoke('machines:add', input),
  confirm: (input) => invoke('machines:confirm', input),
  // Phase 83. Records that a person accepted the version one machine reports,
  // and writes it into the row. It contacts no machine and starts nothing. The
  // renderer sends back the hash the sheet was drawn from and the lines that
  // were on it, and main refuses a stale hash.
  acceptVersion: (input) => invoke('machines:acceptVersion', input),
  forget: (id) => invoke('machines:forget', id),
  remove: (id) => invoke('machines:remove', id),
  // Phase 69. The first thing Tortie ever starts on another machine, and the one
  // production caller of the exec plane. Main asks the confirm gate before it
  // spawns anything.
  prepare: (id) => invoke('machines:prepare', id),
  // Phase 79.1. Makes a key for one machine and puts its public half on it. The
  // password crosses this one call and is kept nowhere: this side stores none
  // of it, and main writes it to the sign in program once and drops it.
  installKey: (input) => invoke('machines:installKey', input),
  // The connection test's own bytes, plus its end. Nothing is emitted at any
  // other time, so a build with no test running subscribes to silence.
  onTestEvent: (cb) => on(EVT_MACHINE_TEST, cb),
  // Phase 71. The link state of every machine. `state` reads memory in main and
  // answers, and the subscription is pushed whenever that answer changes. A
  // build with no machines file gets an empty list and no pushes.
  state: () => invoke('machines:state'),
  onStateChanged: (cb) => on(EVT_MACHINE_STATE, cb),
  // ---- PHASE 73 BLOCK B ----
  // Phase 73. Puts image bytes on one machine. It is the one call on this
  // bridge that writes on another computer, and main refuses it while it is
  // not connected to that machine.
  putImage: (input) => invoke('machines:putImage', input),
  // ---- END PHASE 73 BLOCK B ----
  // ---- PHASE 73 BLOCK C ----
  // Phase 73. The read only review of a folder on one machine. Both calls
  // read: nothing on either computer is written by either of them, and main
  // refuses both while it is not connected to that machine.
  reviewFiles: (input) => invoke('machines:reviewFiles', input),
  reviewFile: (input) => invoke('machines:reviewFile', input),
  // ---- END PHASE 73 BLOCK C ----
  // Phase 84. Reads the folders inside one folder on one machine. It reads and
  // never writes, and main refuses it while it is not connected to that
  // machine.
  listDir: (input) => invoke('machines:listDir', input),
  // ---- PHASE 90.2 BLOCK ----
  // Phase 90.2, item 2. THIS ONE READS. It reads this project's git remote on
  // this Mac, then asks that machine once for the git folders under its own
  // home directory, and answers with the ones whose remote matches. It writes
  // nothing on either computer and keeps nothing on disk.
  findProject: (input) => invoke('machines:findProject', input),
  // Phase 90.2, item 3. THIS ONE WRITES, and it is the second call on this
  // bridge that can write on another computer. The address that crosses is the
  // one main reads from the project folder on this Mac, never the one sent
  // from here: main compares its own read against `expectUrl` and refuses when
  // they differ. The machine checks the destination before it writes anything.
  cloneProject: (input) => invoke('machines:cloneProject', input),
  // ---- END PHASE 90.2 BLOCK ----
  // ---- PHASE 90.3 BLOCK ----
  // Phase 90.3. THIS ONE READS. It walks one folder tree on one machine to a
  // fixed depth in one call, so the Explorer of a project on that machine can
  // list rows without one call per folder. It writes nothing on either
  // computer, it carries no file contents, and main refuses it while it is not
  // connected to that machine. Nothing calls it on a clock.
  listTree: (input) => invoke('machines:listTree', input),
  // ---- END PHASE 90.3 BLOCK ----
  // Phase 98. THIS ONE READS. It searches one folder on one machine with that
  // machine's own grep, so the Search view of a project that lives over there
  // draws rows instead of a refusal. It sends no program, it writes nothing on
  // either computer, and main refuses it while it is not connected to that
  // machine.
  searchContent: (input) => invoke('machines:searchContent', input),
  // Phase 99. THIS ONE READS. It asks a machine which files are in one folder,
  // so Quick Open on a tab that lives over there can rank names. It carries no
  // file contents, it writes nothing on either computer, and main refuses it
  // while it is not connected to that machine.
  listFiles: (input) => invoke('machines:listFiles', input),
  // Phase 100. THIS ONE READS. It asks a machine for the last lines one session
  // over there printed, so a person can read back what an agent said instead of
  // being told that scrolling back is not available. It writes nothing on
  // either computer, it stores nothing on this Mac, and main refuses it while
  // it is not connected to that machine. It is not a scrollbar: research 57
  // section 3.1 refused one and this is the smaller affordance it adopted.
  readSessionLines: (input) => invoke('machines:readSessionLines', input),
  // Phase 105. THIS ONE READS. It asks a machine which branch is checked out in
  // one folder and which repository that folder is, then asks GitHub about that
  // branch with the gh on THIS Mac. No token, no gh invocation and no GitHub
  // host name crosses the link. It writes nothing on either computer and
  // nothing on GitHub, and main refuses it while it is not connected to that
  // machine. Nothing calls it on a clock.
  readRuns: (input) => invoke('machines:readRuns', input),
  // Phase 106. THIS ONE READS. It asks a machine which branch is checked out in
  // one folder, which branch that one follows, and how far ahead and how far
  // behind it is. It writes nothing on either computer, it cannot change what
  // is checked out over there, and main refuses it while it is not connected to
  // that machine. Nothing calls it on a clock.
  readBranch: (input) => invoke('machines:readBranch', input),
  // Phase 107. THIS ONE READS. It asks a machine for a page of the newest
  // commits in one folder, with the two anchors the swimlane picture needs. It
  // writes nothing on either computer, it cannot check out, branch or cherry
  // pick over there, and main refuses it while it is not connected to that
  // machine. Main also clamps the count to 500, so one answer stays under about
  // 162,000 bytes. Nothing calls it on a clock, and it does not read the files
  // one commit changed.
  readHistory: (input) => invoke('machines:readHistory', input),
  // Phase 108. THIS ONE READS. It asks a machine for the agent configuration
  // its agents will load, being directory listings and file bytes, and the
  // reader that resolves precedence runs on THIS Mac. It writes nothing on
  // either computer, it cannot install, enable or pin anything anywhere, and
  // main refuses it while it is not connected to that machine. Nothing calls
  // it on a clock.
  readContext: (input) => invoke('machines:readContext', input),
  // Phase 109. Which agents each machine has. With `fresh` false this READS
  // memory in main and starts nothing; with `fresh` true it sends ONE batched
  // read to that machine, which is a person pressing Rescan, and main refuses
  // it while it is not connected to the machine. The answer decides what a
  // tile looks like and never what a manifest row holds.
  agents: (id, fresh) => invoke('machines:agents', id, fresh),
  onAgentsChanged: (cb) => on(EVT_MACHINE_AGENTS, cb),
  // ---- PHASE 101 BLOCK ----
  // Phase 101. THIS ONE READS. It answers the sheet a person reads before they
  // let Tortie save on one machine. It starts nothing, sends nothing to any
  // machine and writes nothing. The renderer never composes a sheet's hash, and
  // this call is what makes that true for a folder the person typed.
  writeSheet: (input) => invoke('machines:writeSheet', input),
  // Phase 101. THIS ONE WRITES, on this Mac and nowhere else. It writes the
  // folder into the row and records the agreement, over the sheet the person
  // read. Main refuses a stale hash and writes nothing.
  allowWrites: (input) => invoke('machines:allowWrites', input),
  // Phase 101. THIS ONE WRITES ON ANOTHER COMPUTER, and it was the third call on
  // this bridge that could. Main asks the confirm gate, refuses a machine with
  // no confirmed folder, refuses a file that is too large and refuses a path
  // outside that folder, all before anything is sent.
  putFile: (input) => invoke('machines:putFile', input),
  // ---- END PHASE 101 BLOCK ----
  // ---- PHASE 102 BLOCK ----
  // Phase 102. THIS ONE WRITES ON ANOTHER COMPUTER, and it is the fourth call
  // on this bridge that can. It makes ONE folder, with no `-p`, under the same
  // confirmed folder a save is bounded by. Main asks the confirm gate, refuses
  // a machine with no confirmed folder and refuses a path outside that folder,
  // all before anything is sent. No folder chosen here decides what is written
  // under, because main reads the confirmed one off the row.
  makeDir: (input) => invoke('machines:makeDir', input),
  // Phase 102. THIS ONE WRITES ON ANOTHER COMPUTER, and it is the fifth. It
  // renames ONE file or folder with one `mv`, and BOTH paths are checked
  // against the confirmed folder before anything is composed. The machine
  // tests the destination before it moves, and between that test and the move
  // another writer on that machine can create the destination.
  renameEntry: (input) => invoke('machines:renameEntry', input),
  // ---- END PHASE 102 BLOCK ----
  // ---- PHASE 103 BLOCK ----
  // Phase 103. THIS ONE WRITES ON ANOTHER COMPUTER, and it is the sixth call on
  // this bridge that can. It is also the first that changes a git repository
  // over there. It puts a list of paths into one repository's index. Main asks
  // the confirm gate, runs its own review read on the tab's folder, refuses a
  // repository outside the confirmed folder and refuses every path that read
  // did not name, all before anything is sent. No repository root chosen here
  // decides where git runs.
  stage: (input) => invoke('machines:stage', input),
  // Phase 103. THIS ONE WRITES ON ANOTHER COMPUTER, and it is the seventh. It
  // takes the same list back out of that index. On a repository with no commit
  // that machine's git runs `rm --cached` over the same list instead, which
  // leaves every file in the folder. Neither call can discard a change, commit
  // or mark a conflict resolved.
  unstage: (input) => invoke('machines:unstage', input)
  // ---- END PHASE 103 BLOCK ----
};
