/**
 * Folders, files and image bytes on a machine (Phase 125, from Phases 73, 84,
 * 90.3, 99, 101 and 102).
 *
 * Thirty members and nine invoke channels. Five of the nine WRITE on another
 * computer, being `putImage`, `putFile`, `makeDir` and `renameEntry`, plus
 * `allowWrites`, which writes the confirmed folder into the row on this Mac and
 * sends nothing anywhere. What bounds every remote write is one field on the
 * machine row, being `writeRoot`. Main reads it off the row, so nothing chosen
 * in the renderer decides what is written under.
 *
 * THE READS CANNOT COMPOSE WHAT THEY ASK. Every command that crosses is chosen
 * by name from the frozen catalogue in src/main/machines/remote-scripts.ts,
 * with paths and caps arriving there as positional parameters.
 *
 * ONE DOOR. Nothing outside src/shared/ipc/ imports this file. The barrel is
 * src/shared/ipc/machines.ts and src/shared/ipc/index.ts re-exports that. The
 * FACADE_ONLY rule in build/assert-import-boundaries.mjs fails a second door.
 *
 * MAIN: src/main/machines/ipc.ts, the one `machines:*` registrar.
 */

import type {
  MachineConfirmSheet,
  MachineRowView
} from './rows';

// ---------------------------------------------------------------------------
// The folder picker for another machine (Phase 84, item 6)
// ---------------------------------------------------------------------------
//
// WHAT THIS IS FOR. The create sheet's Directory field names a folder on the
// other computer. Until this phase a person had to know that path by heart and
// type it, because the picker beside the field walks THIS Mac's disk and a
// path chosen here names nothing over there. This one channel lets Tortie draw
// a picker for the machine itself.
//
// WHAT IT DOES NOT DO. It lists folders and never files, so it is a folder
// chooser and not a file browser. It writes nothing on either computer. It
// carries no file contents. It cannot be reached while Tortie is not connected
// to the machine.

/**
 * The most entries one listing carries. 500.
 *
 * CHOSEN, not measured. No load test set it. It is here so a home directory
 * holding thousands of folders cannot make one answer megabytes long, and
 * {@link RemoteDirListing.total} is what keeps the number honest on screen.
 */
export const REMOTE_DIR_LIST_MAX = 500;

/** One folder inside a folder on another machine. */
export interface RemoteDirEntry {
  /** The entry's own name. It holds no path and no slash. */
  name: string;
}

export interface RemoteDirListInput {
  machineId: string;
  /**
   * The absolute path to read. An empty string means that machine's own home
   * directory, which the machine itself resolves. Tortie composes no home path
   * for another computer.
   */
  path: string;
}

/** Why a folder could not be listed. Null when it was. */
export type RemoteDirRefusal = 'missing' | 'notdir' | 'denied' | 'unreachable';

export interface RemoteDirListing {
  /** The absolute path that was read, as the machine reported it. */
  path: string;
  /** The parent of `path`, or null when `path` is the root. */
  parent: string | null;
  /** The folders inside it, sorted, at most REMOTE_DIR_LIST_MAX of them. */
  entries: RemoteDirEntry[];
  /** How many folders are really in there. Never smaller than entries.length. */
  total: number;
  /** Null when the folder was read. */
  refusal: RemoteDirRefusal | null;
  /**
   * Main's own sentence for the refusal, or null.
   *
   * THE PICKER DOES NOT DRAW IT, and that is deliberate rather than an
   * oversight. The three answers a machine gives about a folder are fixed, so
   * their sentences live in src/renderer/app/machine-copy.ts where the
   * vocabulary audit reads them, and `unreachable` is composed on this side
   * because main never sends it. The field is here for a surface that has no
   * copy of its own and for a log line that wants one string.
   */
  refusalText: string | null;
}

// ---------------------------------------------------------------------------
// One folder tree on another machine (Phase 90.3)
// ---------------------------------------------------------------------------
//
// WHAT THIS IS FOR. A project can now be a folder on another machine, and the
// Explorer in that tab has to list that machine's files. Phase 84's
// `machines:listDir` cannot do it: it lists folders and never files, and it
// answers about one folder per call.
//
// WHAT IT DOES NOT DO. It carries no file contents. It writes nothing on
// either computer. It reaches nothing outside the folder it was asked about,
// because the far side is given that folder as a positional parameter and
// walks down from it. It cannot be reached while Tortie is not connected to
// the machine.
//
// NO TIMER READS IT. The Explorer calls it when a tab is opened, when a folder
// is expanded past the fetched depth, and when a person presses Refresh. It is
// never called on a clock. Research 55 section 5.4 offered a two second poll
// and this phase does not take it, because nothing counts calls in flight to
// one machine and the far machine's effective ceiling is 10, measured in
// research 56 section 1.5.

/**
 * How deep one listing walks by default. 3.
 *
 * It is `find -maxdepth 3` from the folder that was asked about, so the
 * folder's own entries, their entries, and one level under those. A person
 * expanding past it costs exactly one more call, rooted where they expanded.
 *
 * MEASURED by `build/probe-remote-tree.mjs` against a real second machine.
 *
 * THE RULE the number is checked against is written in that probe before the
 * numbers are read, and it is a BOUND rather than a pick. Let ALLOWED be the
 * depths whose median is at or under 1,500 ms, whose answer is at or under
 * 262,144 bytes and whose entry count is at or under
 * {@link REMOTE_TREE_MAX_ENTRIES}. The shipped depth has to be in ALLOWED, and
 * it has to be at or above the smallest allowed depth carrying at least 95% of
 * the entries the deepest allowed depth carries.
 *
 * THE MEASUREMENTS, both on the operator's Mac Pro on 2026-08-19. On
 * /Users/gdc/.oh-my-zsh, which holds 1,492 entries, depth 3 measured 101.0 ms,
 * 68,610 bytes and 1,445 entries, being 96.8% of what depth 5 carried, so the
 * bound was "at or above 3" and 3 is inside it. On
 * /Users/gdc/Desktop/Meditations on Tech, which holds 51 entries at every
 * depth, the bound was "at or above 2" and the probe printed that the run
 * learned nothing about depth from a folder shallower than the walk.
 *
 * WHY IT IS A BOUND AND NOT A PICK, because the Phase 90.3 fix round got this
 * wrong twice before writing it down. A rule that picks one number from one
 * folder picks whatever that folder happens to be shaped like: "largest depth
 * inside the ceilings" picked 5 on a folder no ceiling bound, and "smallest
 * depth carrying 95%" picked 3 on one folder and 2 on the next. One folder on
 * one network can bound this number. It cannot choose it.
 *
 * WHAT IS NOT CLAIMED. Nothing here says 3 is the best depth. Too deep is
 * guarded by the three ceilings and by nothing else.
 */
export const REMOTE_TREE_DEPTH = 3;

/**
 * The most entries one listing carries. 4,000.
 *
 * Research 55 measured a whole 1,695 entry repository at 112,574 bytes and
 * 65.5 ms, so 4,000 entries stays well inside the 2,097,152 byte read cap.
 * {@link RemoteTreeListing.total} is what keeps the number honest on screen
 * when a folder holds more than this.
 */
export const REMOTE_TREE_MAX_ENTRIES = 4_000;

export interface RemoteTreeListInput {
  machineId: string;
  /** The folder to walk. Absolute, ON THAT MACHINE. */
  root: string;
  /** How deep to walk. Omitted means {@link REMOTE_TREE_DEPTH}. */
  depth?: number;
}

/** One entry under a folder on another machine. */
export interface RemoteTreeEntry {
  /** The absolute path ON THAT MACHINE. */
  path: string;
  /** Only these two. A link and a socket are reported as files. */
  kind: 'dir' | 'file';
}

/** Why a tree could not be read, or the tree. */
export type RemoteTreeListing =
  | {
      status: 'ok';
      /** The root, as the machine reported it. */
      root: string;
      /** Every entry the machine printed, sorted by path. */
      entries: readonly RemoteTreeEntry[];
      /** How many entries the machine counted before the cap. */
      total: number;
      /** True when the machine held more than it printed. */
      truncated: boolean;
      /** Epoch ms ON THIS MAC when the answer arrived. */
      readAt: number;
    }
  | {
      status: 'missing' | 'notdir' | 'denied' | 'unreachable' | 'notConnected';
      root: string;
    };

// ---------------------------------------------------------------------------
// The file names in one folder on one machine (Phase 99, research 57 section 6)
// ---------------------------------------------------------------------------
//
// ONE READ, ONE ANSWER. Nothing is written on either computer. The command that
// crosses is `repo-files` from the frozen catalogue in
// src/main/machines/remote-scripts.ts, chosen by name, with the folder and the
// name cap plus one arriving there as positional parameters. NOTHING IS SENT TO
// THAT MACHINE except that constant text.
//
// IT CARRIES NAMES AND NEVER CONTENTS. A person's source stays on the computer
// it is on. Opening one of these names is a separate read, and it lands in the
// read only tab Phase 90.3 shipped.
//
// WHY THE RENDERER ASKS AND MAIN'S RANKING WORKER DOES NOT. The worker reaches
// a local root by spawning ripgrep in it. It cannot spawn anything on another
// computer, and handing it a path that names a folder over there would make it
// read a DIFFERENT file here or nothing at all. So the palette reads the names
// through this channel and hands the whole list to the worker, which adopts it.
//
// NO PROSE CROSSES THIS CHANNEL. Every sentence a person reads about a name
// list is drawn by the renderer from src/renderer/app/machine-copy.ts, where
// the vocabulary audit reads it. This answer carries a mode word and counts.

/**
 * The most file names one read carries. 50,000.
 *
 * CHOSEN rather than measured, and bounded by two measured points from research
 * 57 section 6.3. On the operator's tailnet, 1,096 tracked files were 31,964
 * bytes and 15,581 files were 657,058 bytes in 108.6 to 201.0 ms, while 289,980
 * files were 43,954,137 bytes in 8,218 to 10,563 ms. 50,000 names is about
 * 2,100,000 bytes at the rate the middle point sets, which is well inside the
 * ceiling below and far away from the third point. The local palette holds
 * 200,000 paths per project. This number is smaller because these ones cross a
 * link.
 */
export const REMOTE_FILE_LIST_MAX = 50_000;

/**
 * The most bytes one name list may hold before encoding. 4,194,304.
 *
 * The same ceiling `REMOTE_SEARCH_MAX_BYTES` carries, and enforced the same
 * way: the script reads ONE BYTE PAST IT, counts what it read, and prints `1`
 * or `0`. The number is a constant in the script text as well, and condition 53
 * of `build/conformance-machines.mjs` asserts the two agree. Two copies of one
 * number is how one of them goes stale.
 */
export const REMOTE_FILE_LIST_MAX_BYTES = 4_194_304;

/** Which files the far side named, or why it named none. */
export type MachineFileListMode =
  /** The folder is a git repository. Its tracked and untracked files are here. */
  | 'repo'
  /** The folder is not a repository. Every file under it is here. */
  | 'walk'
  /** There is no folder at that path on that machine. */
  | 'missing'
  /** Tortie is not connected to that machine. Nothing was asked. */
  | 'notConnected'
  /** The machine did not answer, or answered something unreadable. */
  | 'unreachable';

/** One name list read against one folder on one machine. */
export interface MachineFileListInput {
  readonly machineId: string;
  /** The folder on that machine. Absolute, and never a path on this Mac. */
  readonly cwd: string;
  /** Clamped to {@link REMOTE_FILE_LIST_MAX}. Omitted means that number. */
  readonly maxPaths?: number;
}

/** What one machine answered about the names in one folder. */
export interface MachineFileListResult {
  readonly machineId: string;
  /** That machine's own label, so the renderer never composes one. */
  readonly machineLabel: string;
  /** The folder that was read, on that machine. */
  readonly cwd: string;
  readonly mode: MachineFileListMode;
  /** Relative to `cwd`, POSIX separators, no leading `./`. */
  readonly paths: readonly string[];
  /** The name cap cut the list. These are the first N, not all of them. */
  readonly capped: boolean;
  /** The byte ceiling cut the answer on that machine. */
  readonly truncated: boolean;
  /** Epoch ms ON THIS MAC when the answer arrived. */
  readonly readAt: number;
  /** Wall time from the call to the answer, in ms. The round trip is in it. */
  readonly elapsedMs: number;
}

// ---- PHASE 101 BLOCK ----
// Editing and saving a file that lives on another machine.
//
// WHAT THIS IS FOR. A person can already read a file on another machine in a
// Tortie tab. This block is what lets them change it and press Save, and what
// lets them make a new empty file there.
//
// WHAT DECIDES WHETHER A BYTE EVER LANDS. One confirmed field on the machine
// row, being `writeRoot`. A machine that carries none cannot be saved to at
// all, and it hashes exactly as it did before this block existed. A person
// turns saving on for one machine, once, by reading a sheet and pressing a
// button in Settings, then Machines. Nothing automates past that moment.
//
// WHAT NONE OF THESE THREE CALLS DOES. None of them removes anything on either
// computer. None of them makes a folder, renames anything or moves anything to
// a Trash. None of them carries a root chosen in the renderer: main reads the
// confirmed root out of the row and refuses a path that does not sit under it,
// before it composes anything.

/**
 * The largest file this door will save, in bytes. 90,000.
 *
 * IT IS THE SAME NUMBER AS {@link REMOTE_IMAGE_MAX_BYTES} AND IT IS A SEPARATE
 * CONSTANT ON PURPOSE. Research 57 section 4.2 said to reuse the image cap.
 * This deviates from that: a later change to what an image may weigh would
 * otherwise silently change what a person may save, and the two are different
 * questions asked by different people.
 *
 * The reason for the number is the carriage rather than a choice. The bytes
 * travel encoded, inside one command, and that command reaches the far side as
 * ONE argument of that machine's own login shell. Linux caps one argument of
 * one program at 131,072 bytes. Encoding adds a third. So 90,000 bytes of file
 * becomes 120,000 bytes of payload and fits.
 *
 * A larger file is refused on this Mac before anything is sent, and a remote
 * file larger than this is refused at OPEN when saving is on for that machine,
 * because a tab that can never be saved is worse than a refusal that says why.
 */
export const REMOTE_FILE_MAX_BYTES = 90_000;

/**
 * What the renderer sends to read the sheet for a folder a person typed.
 *
 * IT READS ONLY. It starts nothing, sends nothing to any machine and writes
 * nothing. It exists because the renderer may never compose a sheet's lines or
 * its hash, and there is no prior result to take this sheet from: the person
 * types the folder. A root that fails validation throws the validator's own
 * sentence.
 */
export interface MachineWriteSheetInput {
  id: string;
  /** The absolute folder on that machine, as the person typed it. */
  writeRoot: string;
}

/**
 * What the renderer sends when a person turns saving on for one machine.
 *
 * It is the shape {@link MachineAcceptVersionInput} takes, because it IS a
 * confirmation: main writes the field into the row and records the agreement in
 * one call, over the sheet the person read. A stale hash refuses and writes
 * nothing.
 */
export interface MachineAllowWritesInput {
  id: string;
  /** The absolute folder on that machine. Main validates it again. */
  writeRoot: string;
  /** The hash the sheet was drawn from. Main refuses a stale one. */
  hashRead: string;
  /** The lines that were on the sheet. Recorded verbatim. */
  linesRead: string[];
}

/** Which file on which machine is being saved, and what it should hold. */
export interface MachineFilePutInput {
  machineId: string;
  /** The absolute path ON THAT MACHINE. Main refuses one outside the root. */
  path: string;
  /** The whole file, as text. Main refuses more than REMOTE_FILE_MAX_BYTES. */
  contents: string;
  /**
   * The sha256 of the file as Tortie last read it, or the word `new`.
   *
   * `new` means make a file that is not there, and the machine refuses a
   * destination that already exists. A checksum means replace a file whose
   * contents still match what Tortie read, and the machine refuses when they
   * do not.
   */
  expect: string;
}

/**
 * What happened to one save. Nine words, and six of them come from the machine.
 *
 * `wrote` is the only one that means bytes landed. `writesOff`, `outsideRoot`
 * and `tooLarge` are decided on this Mac before anything is sent. `stale`,
 * `missing`, `exists`, `nomode` and `nosum` are what the machine reported, and
 * every one of them means nothing was written there, because the script prints
 * all five of them above the line that writes and none of them below it. The
 * gate's condition 80 reads that property out of the script text.
 *
 * THE SCRIPT HAS ONE MORE WORD AND IT IS NOT HERE ON PURPOSE. `unsure` is what
 * it prints when the bytes are already in place and it cannot describe them.
 * That is not an outcome, because an outcome is something a person is told
 * happened, so `parseFilePutAnswer` does not know the word and the save fails
 * with the sentence that says Tortie cannot tell whether the file was saved.
 */
export type MachineFilePutOutcome =
  | 'wrote'
  | 'stale'
  | 'missing'
  | 'exists'
  | 'nomode'
  | 'nosum'
  | 'writesOff'
  | 'outsideRoot'
  | 'tooLarge';

/** What one save did, in the shape the surface that asked for it reads. */
export interface MachineFilePutResult {
  readonly outcome: MachineFilePutOutcome;
  /** The file's checksum after a `wrote`. Null otherwise. */
  readonly sha256: string | null;
  /** The bytes on the far side after a `wrote`, or the bytes refused for `tooLarge`. */
  readonly bytes: number | null;
  /** The confirmed root, for the two sentences that name it. Null when there is none. */
  readonly writeRoot: string | null;
}
// ---- END PHASE 101 BLOCK ----

// ---- PHASE 102 BLOCK ----
// Making a folder and renaming an entry on another machine.
//
// WHAT THIS IS FOR. Phase 101 lets a person change a file that lives on
// another machine and make a new empty one there. These two calls let them
// make a folder there and rename a file or a folder there, from the Explorer.
//
// WHAT DECIDES WHETHER ANYTHING HAPPENS. The same one confirmed field Phase
// 101 added, being `writeRoot`. NO NEW FIELD IS CONFIRMED BY THIS BLOCK, the
// hash still covers six fields, and no machine anybody already confirmed is
// asked again.
//
// NO ROOT CROSSES EITHER CHANNEL. Neither input type has a member called
// `root`. Main reads the confirmed folder off the machine row at call time and
// refuses every path that does not sit under it, before it composes anything.
// A folder chosen in the renderer therefore cannot decide what is written
// under, which is the shape Phase 101 shipped.
//
// NEITHER EVER THROWS FOR SOMETHING THE MACHINE SAID. A folder that is already
// there, a parent that is gone and a parent the account cannot write in all
// come back as a status word, the way `machines:listDir` and
// `machines:listTree` already answer. ONE SENTENCE STILL CROSSES AND IT IS
// NAMED HERE RATHER THAN DENIED: a machine Tortie is not signed in to throws
// `MACHINE_NOT_CONNECTED`, which is main's own sentence. Every sentence a
// person reads about one of these answers is composed in
// `src/renderer/app/machine-copy.ts`.
//
// WHAT NEITHER OF THEM DOES. Neither removes anything on either computer.
// Neither copies anything. The rename is a plain `mv`, so git on that machine
// sees a delete plus an untracked add until somebody stages it.

/** Which folder to make, on which machine. */
export interface MachineMakeDirInput {
  machineId: string;
  /** The absolute path of the new folder ON THAT MACHINE. */
  path: string;
}

/**
 * What happened to one new folder. Six words, and four come from the machine.
 *
 * `made` is the only one that means a folder is there that was not there
 * before. `writesOff` and `outsideRoot` are decided on this Mac before anything
 * is sent. `exists`, `denied` and `noparent` are what the machine reported, and
 * all three are printed above the `mkdir` and none below it, so every one of
 * them means nothing was created.
 */
export type MachineMakeDirOutcome =
  | 'made'
  | 'exists'
  | 'denied'
  | 'noparent'
  | 'writesOff'
  | 'outsideRoot';

/** What one new folder did, in the shape the surface that asked for it reads. */
export interface MachineMakeDirResult {
  readonly outcome: MachineMakeDirOutcome;
  /**
   * The mode of the folder the new one was made INSIDE, as octal digits, after
   * a `made`. Null otherwise, and null when that machine's `stat` said nothing.
   *
   * It is the parent's mode rather than the new folder's so that a verifier can
   * compare what Tortie decided against what `ls -ld` shows without a second
   * call. What the new folder gets is capped at two values: 755 when the
   * parent's last two octal digits are each 5 or 7, and 700 otherwise.
   */
  readonly mode: string | null;
  /** The confirmed folder, for the sentences that name it. Null when none. */
  readonly writeRoot: string | null;
  readonly tookMs: number;
}

/** Which entry to rename, on which machine. */
export interface MachineRenameInput {
  machineId: string;
  /** The absolute path it has now, ON THAT MACHINE. Main bounds it. */
  from: string;
  /** The absolute path wanted, ON THAT MACHINE. Main bounds this one too. */
  to: string;
  /** What the renderer believes it is renaming. Echoed back on the result. */
  kind: 'file' | 'dir';
}

/**
 * What happened to one rename. Six words, and four come from the machine.
 *
 * `moved` means the entry is at the new path and it was this call that moved
 * it. `done` means the machine already held the end state the person asked for,
 * which is what a repeat after a lost answer looks like. IT CANNOT TELL THAT
 * APART from a machine where somebody else already held a file at the
 * destination while the source never existed, and the product does not pretend
 * to. `exists` and `gone` mean nothing was moved. `writesOff` and `outsideRoot`
 * are decided on this Mac before anything is sent.
 */
export type MachineRenameOutcome =
  | 'moved'
  | 'done'
  | 'exists'
  | 'gone'
  | 'writesOff'
  | 'outsideRoot';

/** What one rename did, in the shape the surface that asked for it reads. */
export interface MachineRenameResult {
  readonly outcome: MachineRenameOutcome;
  readonly from: string;
  readonly to: string;
  /**
   * Echoed back, so the tab follower reads one source rather than guessing.
   *
   * A folder rename reported as a file leaves every open tab beneath it
   * pointing at a path that is no longer on that machine, because the follower
   * only does prefix arithmetic for descendants when this says `dir`.
   */
  readonly kind: 'file' | 'dir';
  /** The confirmed folder, for the sentences that name it. Null when none. */
  readonly writeRoot: string | null;
  readonly tookMs: number;
}
// ---- END PHASE 102 BLOCK ----

// ---- PHASE 73 BLOCK B ----
// Putting image bytes on one machine (Phase 73, M6, item 3).
//
// WHAT THIS IS FOR. Dropping an image on a session that runs on another
// machine used to insert THIS Mac's path into the prompt, and that path names
// nothing on the far side, so the agent there could not read the picture. This
// call carries the bytes to that machine and answers with the path they landed
// at, which is what goes into the prompt instead.
//
// WHAT IT DOES NOT DO. It carries nothing but images: a folder, a text file and
// anything whose leading bytes are not an image are all refused, and the file
// stays on this Mac. It never removes anything on either computer. It writes
// only under `~/.tortie/images` on the machine, in a directory it creates mode
// 0700 with files mode 0600.

/**
 * The largest image this door will carry, in bytes. 90,000.
 *
 * IT IS NOT THE LOCAL DROP LIMIT, and the reason is a limit of the carriage
 * rather than a choice. The bytes travel encoded, inside one command, and that
 * command reaches the far side as ONE argument of that machine's own login
 * shell. Linux caps one argument of one program at 131,072 bytes. Encoding adds
 * a third. So 90,000 bytes of image becomes 120,000 bytes of payload and fits,
 * and 25 MB, which is what a drop on a session on this Mac accepts, does not
 * fit by a factor of about 280.
 *
 * NOT MEASURED ON LINUX. No Linux machine was contacted by the phase that wrote
 * this. The 131,072 is the kernel's own documented constant. The far side in
 * every probe was this Mac, whose limit is 1,048,576 bytes on the whole
 * invocation rather than on one argument.
 *
 * A larger image is refused with a sentence naming this number, and it is
 * refused on this Mac before anything is sent.
 */
export const REMOTE_IMAGE_MAX_BYTES = 90_000;

/** Which images go to which machine, for which session. */
export interface MachineImagePutInput {
  machineId: string;
  /** The session the images are for. It names the files on the far side. */
  sessionId: string;
  /** Absolute paths ON THIS MAC. Every one is read and sniffed before it goes. */
  paths: string[];
}

/** What happened to one image. One of these per path, in the order asked. */
export interface MachineImagePlacement {
  /** The path on this Mac that was read. */
  localPath: string;
  /** The absolute path on the machine, or null when nothing was written. */
  remotePath: string | null;
  /**
   * What the machine reported doing.
   *
   * 'added' means the file was written. 'present' means a file of that name was
   * already there and nothing was written, which is the ordinary answer for the
   * same image sent twice. Null means nothing was written and `refusal` says
   * why.
   */
  outcome: 'added' | 'present' | null;
  /** One sentence when nothing was written. Null when something was. */
  refusal: string | null;
}
// ---- END PHASE 73 BLOCK B ----

// ---------------------------------------------------------------------------
// The channels this family declares
// ---------------------------------------------------------------------------

export interface MachinesFilesystemInvokeChannelMap {
  // PHASE 84. One READ of one folder on one machine, for the folder picker in
  // the create sheet. It lists folders and never files, it writes nothing on
  // either computer, and main refuses it while it is not connected to that
  // machine. A folder it could not read comes back as a refusal with a
  // sentence, never as an exception a surface has to read prose out of.
  'machines:listDir': { req: [input: RemoteDirListInput]; res: RemoteDirListing };
  // PHASE 90.3. One READ of one folder TREE on one machine, for the Explorer
  // of a project that lives over there. It writes nothing on either computer,
  // it carries no file contents, and main refuses it while it is not connected
  // to that machine.
  //
  // ONE CALL AND NEVER ONE CALL PER ROW. Research 55 measured nine folders as
  // nine calls at 409.7 ms and the same nine answers in one subtree call at
  // 42.3 ms, so the Explorer asks for a whole subtree at once. A folder that
  // could not be read comes back as a status word, never as an exception a
  // surface has to read prose out of, and never as prose main composed.
  'machines:listTree': {
    req: [input: RemoteTreeListInput];
    res: RemoteTreeListing;
  };
  // PHASE 99. One READ of the FILE NAMES in one folder on one machine, for the
  // Quick Open palette on a tab whose project lives over there. It carries
  // names and never contents, it writes nothing on either computer, and main
  // refuses it while it is not connected to that machine.
  //
  // IT CANNOT COMPOSE WHAT IT ASKS. The command that crosses is `repo-files`
  // from the frozen catalogue in src/main/machines/remote-scripts.ts, chosen by
  // name, with the folder and the name cap plus one arriving there as
  // positional parameters.
  //
  // NOTHING CALLS IT ON A CLOCK. The palette asks when a person opens it, and
  // it skips a root it read less than QUICK_OPEN_WARM_STALE_MS ago.
  //
  // A folder that is not there, a machine that did not answer and a machine
  // Tortie is not signed in to all come back as a mode word. No prose crosses
  // this channel: the renderer draws every sentence from
  // src/renderer/app/machine-copy.ts, where the vocabulary audit reads it.
  'machines:listFiles': {
    req: [input: MachineFileListInput];
    res: MachineFileListResult;
  };
  // ---- PHASE 101 BLOCK ----
  // THIS ONE READS. It answers the sheet for the row as it is now plus the
  // folder a person typed, so the renderer never composes a sheet's hash. It
  // starts nothing, sends nothing to any machine and writes nothing. A folder
  // that fails validation throws the validator's own sentence.
  //
  // A `machines:allowWrites` that previewed when `hashRead` was null was
  // rejected. A channel that both previews and writes is a channel where one
  // wrong argument writes.
  'machines:writeSheet': {
    req: [input: MachineWriteSheetInput];
    res: MachineConfirmSheet;
  };
  // THIS ONE WRITES, on this Mac and nowhere else. It writes the folder into
  // the row and records the agreement in one call, over the sheet the person
  // read. A stale hash refuses before either write. It starts no process, opens
  // no connection and sends nothing to any machine.
  'machines:allowWrites': {
    req: [input: MachineAllowWritesInput];
    res: MachineRowView;
  };
  // THIS ONE WRITES ON ANOTHER COMPUTER, and it was the third channel in this
  // contract that could. Phase 102 added the fourth and the fifth. Main asks the confirm gate, refuses a machine with no
  // confirmed folder, refuses a file over REMOTE_FILE_MAX_BYTES and refuses a
  // path outside the confirmed folder, all before anything is composed. The
  // machine then refuses again unless the file's contents still match what
  // Tortie read.
  'machines:putFile': {
    req: [input: MachineFilePutInput];
    res: MachineFilePutResult;
  };
  // ---- END PHASE 101 BLOCK ----
  // ---- PHASE 102 BLOCK ----
  // BOTH OF THESE WRITE ON ANOTHER COMPUTER, and they are the fourth and the
  // fifth channels in this contract that can. Main asks the confirm gate,
  // refuses a machine with no confirmed folder and refuses every path outside
  // that folder, all before anything is composed. NEITHER CARRIES A ROOT: main
  // reads the confirmed folder off the row, so nothing chosen in the renderer
  // decides what is written under.
  //
  // Neither throws for anything the machine said. A machine Tortie is not
  // signed in to throws `MACHINE_NOT_CONNECTED`, which is main's own sentence
  // and the one exception that crosses this boundary.
  'machines:makeDir': {
    req: [input: MachineMakeDirInput];
    res: MachineMakeDirResult;
  };
  'machines:renameEntry': {
    req: [input: MachineRenameInput];
    res: MachineRenameResult;
  };
  // ---- END PHASE 102 BLOCK ----
  // ---- PHASE 73 BLOCK B ----
  // The ONE write this product can make on another computer. It puts image
  // bytes under that machine's own home directory and answers with the path
  // there, so a prompt on that machine names a file that machine has. It
  // refuses while Tortie is not connected to the machine, it refuses a file
  // whose bytes are not an image, and it refuses a file over the size limit.
  // Running it twice writes one file, because the name is a checksum of the
  // bytes and a file that is already there is never opened for writing.
  'machines:putImage': {
    req: [input: MachineImagePutInput];
    res: MachineImagePlacement[];
  };
  // ---- END PHASE 73 BLOCK B ----
}

// ---------------------------------------------------------------------------
// The bridge methods this family declares
// ---------------------------------------------------------------------------

export interface MachinesFilesystemApi {
  // ---- PHASE 73 BLOCK B ----
  // Phase 73. Puts image bytes on one machine and answers with the paths
  // there. It is the one call in this contract that writes on another
  // computer.
  putImage(input: MachineImagePutInput): Promise<MachineImagePlacement[]>;
  // ---- END PHASE 73 BLOCK B ----
  // Phase 84. Reads the folders inside one folder on one machine, for the
  // picker beside the create sheet's Directory field. It reads and never
  // writes.
  listDir(input: RemoteDirListInput): Promise<RemoteDirListing>;
  // Phase 90.3. Reads one folder tree on one machine, to a fixed depth, in
  // one call. It reads and never writes.
  listTree(input: RemoteTreeListInput): Promise<RemoteTreeListing>;
  // Phase 99. Reads the file NAMES in one folder on one machine, so Quick
  // Open on a tab that lives over there can rank them. It carries no file
  // contents. It reads and never writes.
  listFiles(input: MachineFileListInput): Promise<MachineFileListResult>;
  // ---- PHASE 101 BLOCK ----
  // Phase 101. Reads the sheet for the row as it is now plus the folder a
  // person typed. It starts nothing, sends nothing and writes nothing.
  writeSheet(input: MachineWriteSheetInput): Promise<MachineConfirmSheet>;
  // Phase 101. Turns saving on for one machine. It writes the folder into
  // the row and records the agreement, on this Mac and nowhere else. It
  // contacts no machine and starts nothing.
  allowWrites(input: MachineAllowWritesInput): Promise<MachineRowView>;
  // Phase 101. Saves one file on one machine. It was the third call in this
  // contract that writes on another computer, and Phase 102 added two more.
  putFile(input: MachineFilePutInput): Promise<MachineFilePutResult>;
  // ---- END PHASE 101 BLOCK ----
  // ---- PHASE 102 BLOCK ----
  // Phase 102. Makes one folder on one machine. It is the fourth call in
  // this contract that writes on another computer.
  makeDir(input: MachineMakeDirInput): Promise<MachineMakeDirResult>;
  // Phase 102. Renames one file or one folder on one machine. It is the
  // fifth. The rename is a plain `mv`, so git over there sees a delete plus
  // an untracked add until somebody stages it.
  renameEntry(input: MachineRenameInput): Promise<MachineRenameResult>;
  // ---- END PHASE 102 BLOCK ----
}
