#!/usr/bin/env node
/**
 * `npm run ablation:p331`. THE ATTACK ON PHASE 331'S OWN CLAUSES
 * (build/p331/SPEC.md §2.10, the Phase 331 entry in docs/BACKLOG.md).
 *
 * About a minute. It launches no Electron, starts no tmux server, spawns no
 * agent, makes no request and spends no token. It starts nothing but `cp` and
 * `node` (vitest, and `build/conformance-agents.mjs` with the pinned tsx it
 * runs), and it reads nothing under the person's home.
 *
 * ## Why it exists
 *
 * Phase 331 launches and resumes Codex with `-c tui.fullscreen_transcript=false`
 * and Claude Code with `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1`, sets a row's
 * fixed launch tokens aside in one helper so a person's own flags are neither
 * lost nor doubled, brings recorded rows across in one boot pass, and records a
 * compiled screen class on every launchable row. Research 133 §6 item 9 is why
 * this script exists: `conformance:agents` section 2 compares the row with the
 * registry, so both sides move together, and a splice that covered nothing
 * stayed green there. So THIS SCRIPT PROVES THE OWNERSHIP: it breaks one clause
 * at a time in the SHIPPING source and requires the row that owns it to go red
 * BY NAME — a vitest row by its `it` title (SPEC §3), or a `conformance:agents`
 * row by the `Phase 331 11.N (` line that gate prints when that row fails.
 *
 * ## It never writes into the working tree
 *
 * Three builders work in one worktree during a phase, and a harness that
 * writes into `src/` even for the seconds a test takes can lose another
 * builder's edit. So it builds a CLONE, `build/p321/ablation.mjs`'s shape:
 * `cp -Rc` (APFS clonefile) of `src/`, `resources/` and every entry of `build/`
 * but `build/vendor` (symlinked, never copied) under
 * `/private/tmp/p331-ablation-<pid>-…`, the config files copied,
 * `node_modules` symlinked, and vitest and the gate run there with that
 * directory as their cwd. Each edited file is put back and CHECKED BY SHA256
 * against the worktree's bytes before the next arm; the clone is removed in a
 * `finally` and on SIGINT, SIGTERM and SIGHUP; and the run ends by asserting
 * that the worktree's own bytes never moved.
 *
 * ## The rules each arm is held to
 *
 *   - Its needle matches the shipping source EXACTLY ONCE. Zero means the
 *     clause moved and this arm moves with it in the same commit (SPEC §2.10:
 *     the integrator moves the needle, not the code, and says so); two means an
 *     edit could land on the wrong occurrence and prove nothing.
 *   - Every row it names as the OWNER goes red. Other rows going red too is
 *     printed, and is not a failure.
 *   - An UNEDITED CONTROL, every owning file and the gate, is green first, and
 *     again at the end.
 *
 * ## The fix round's arms
 *
 * X1 to X9 hold what the Phase 331 fix round changed after its verifiers: the
 * harness answering Claude Code 2.1.285's refusal-first folder question (and
 * reading the highlight at the pane's real bottom, and not pressing twice), a
 * reading taken at an unanswered trust question counting as none, the run's
 * detection scan walking only the agents asked for, Codex's update check off
 * in the harness, a moved install named, and the boot pass writing ONE column
 * rather than the whole decoded row. B4 and L2 moved their needles with the
 * clauses they break (a third argument to `failed`, and the one-column write).
 *
 * ## Phase 350's arms
 *
 * P1 to P21 hold pi's inline token behind its floor (build/p350/SPEC.md §7.1,
 * §4.1, §4.2): the token and the floor spelled as pi reads them, the floor rule
 * the SpecStory reader's, the composers putting the token in only when their
 * caller says the floor holds, `fixedLaunchTokens` naming it at every version,
 * every production caller naming the floor (the far ones `false`, Restart
 * `true`, the create and the harvest from the scan), the pi arm of the boot
 * pass reading local pi rows alone, never moving one on an unread version and
 * inserting at index 1 only, restore's strip on `armableResume`'s one way out,
 * Rule 1 of the arming composer naming the fixed tokens, pi's record a switch
 * behind its floor, and D18's warm and D19's pass on their edges. Each is
 * owned by a `Phase 350 11.N (` row of `conformance:agents` and by the vitest
 * rows the pi builder wrote, and B2 and C9 moved their needles with Phase 350
 * (pi's new `measured` string, and the Codex arm's explicit `false`). A vitest
 * title written in its file as a template (`at a floor that reads ${floor}`)
 * names its written form third, so the title check reads the file's own text.
 *
 * P22 to P29 are the fix round's (build/p350/SPEC.md §As built, "The fix
 * round"): the floor read for one FILE, so a row of a second pi install or of
 * a pi reinstalled since the scan is never handed the token (P22, P23, P28);
 * the strip and the below-floor pass taking out only Tortie's copy, never a
 * person's own leading `--tui-mode` (P24, P25); the pass judging each row by
 * its own binary (P26); the latch never set by a pass that read no floor
 * (P27); and the first answer settled only by a scan that read every probe
 * (P29, the verifier's m33). P7, P13, P18 and P21 moved their needles with the
 * per-binary reader. P30 and P31 are the floor reader's: the version alone, as
 * `pi -v` prints it, and a prerelease of the floor below it; P5 moved its
 * needle with them. P32 is the row's own composition read with its own launch
 * flags, so a person's flags put first by a confirmed row are told apart.
 *
 * P33 to P36 are the ruled round's (his ruling of 2026-11-02, R1: the token
 * only for a pi whose real file is inside pi's own installed package): the
 * package gate taken out of the floor reader, so a version manager's shim, a
 * wrapper or a copy is handed the token again (P33); any package read as pi's
 * (P34); a package.json that cannot be read or parsed read as pi's (P35); and a
 * nearer package.json passed over for one further up (P36). Each is owned by
 * `conformance:agents` 11.10 or by the planted install shapes of
 * p350-pi-package.test.ts.
 *
 * P37 to P41 are the second ruled round's (his ruling of 2026-11-02, "Check the
 * file that runs"): a relative PATH entry read from this process's folder and
 * not the session's (P37); empty PATH entries passed over (P38); the pane's file
 * told from the checked one by its spelling, not its device and inode (P39); the
 * create asking the floor for the file it records and not the file its pane runs
 * (P40); and, the reverify's nit, pi's package name read by its unscoped half
 * under any scope (P41). Each is owned by `conformance:agents` 11.11 or by the
 * planted rows of p350-pi-bare-name.test.ts and p350-pi-package.test.ts. P7 and
 * P28 moved their needles with the create's new words.
 *
 * P43 is the third ruled round's (his ruling of 2026-11-03): the walk handed the
 * project's folder instead of the session's (the reverify's B2), red on a
 * DRIVEN row whose session sits in a subfolder of its project.
 *
 * PHASE 353 TOOK P42 AND P44 OUT (build/p353/SPEC.md D354-5), with the two
 * clauses they broke: his rulings of 2026-11-03 and 2026-11-04 read a folder
 * holding a `#`, or ending in `;`, as unread, because tmux read `-c` as a format
 * and ended a command at a final `;`. Every create now hands tmux the folder
 * held back (src/main/tmux/argument.ts), the pane starts in that folder, and
 * the resolver walks it like any other, so there is no clause left to break.
 * Their owners went with them: N60, N61 and N63 to N68, whose rows flipped to
 * holding the token; 11.11 now requires the guard to name neither term.
 *
 * P45 to P47 are Phase 353's, the attack on what replaced them: the `#` term
 * (P45) and the final-`;` term (P46) put back into the resolver's guard, red on
 * 11.11 and on the flipped rows that now hold the token (N69 to N76); and the
 * create handing tmux the folder raw (P47), red on 11.11, which requires the
 * create to hold the folder back because the walk reads the folder the pane
 * starts in.
 *
 * Usage:
 *   node build/p331/ablation.mjs
 *   P331_ONLY=C1,L2 node build/p331/ablation.mjs        named arms only
 *   node build/p331/ablation.mjs --only P1,P2            the same, as an argument
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[ablation:p331]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------------------
// The shipping files each arm breaks, and the files that own each clause
// ---------------------------------------------------------------------------

const REGISTRY = 'src/main/agents/registry.ts';
const EXTRAS = 'src/main/restart/extras.ts';
const REMOTE_RECORD = 'src/main/machines/remote-record.ts';
const HARVEST = 'src/main/sessions/id-harvest.ts';
const PASS = 'src/main/sessions/inline-repair.ts';
const OVERLAY = 'src/shared/agent-overlay.ts';
const SCREEN = 'src/main/conformance/screen-class.ts';
const CASES = 'src/main/conformance/cases.ts';
const PANE = 'src/main/conformance/pane.ts';
const RESUME = 'src/main/conformance/resume.ts';
const REPORT = 'src/main/conformance/report.ts';

const SWITCH_TEST = 'src/main/agents/__tests__/p331-inline-switch.test.ts';
const FLAGS_TEST = 'src/main/sessions/__tests__/p331-own-flags.test.ts';
const PASS_TEST = 'src/main/sessions/__tests__/p331-inline-repair.test.ts';
const SCREEN_TEST = 'src/main/conformance/__tests__/p331-screen.test.ts';
const HARNESS_TEST = 'src/main/conformance/__tests__/p331-harness.test.ts';
// Phase 350: the files that own pi's token, its floor, the pass and the arming.
const CORE = 'src/main/sessions/core.ts';
const DETECTION = 'src/main/agents/detection.ts';
const RESTORE = 'src/main/restore/restore.ts';
const ARM = 'src/main/machines/remote-arm.ts';
const REMOTE_SESSIONS = 'src/main/machines/remote-sessions.ts';
const CREATE = 'src/main/sessions/create-local.ts';
// Phase 353: the create every local pane starts through, whose `-c` 11.11 now holds.
const TMUX_SESSIONS = 'src/main/tmux/sessions.ts';
const TOKEN_TEST = 'src/main/agents/__tests__/p350-pi-token.test.ts';
const PI_PASS_TEST = 'src/main/sessions/__tests__/p350-pi-pass.test.ts';
const PI_RESTORE_TEST = 'src/main/restore/__tests__/p350-pi-restore.test.ts';
const ARM_TEST = 'src/main/machines/__tests__/remote-arm.test.ts';
const EXTRAS_TEST = 'src/main/restart/__tests__/extras.test.ts';
const WARM_TEST = 'src/main/agents/__tests__/p164-boot-warm.test.ts';
// The ruled round (his ruling of 2026-11-02, R1): every install shape, planted.
const PKG_TEST = 'src/main/agents/__tests__/p350-pi-package.test.ts';
// The second ruled round: the file a bare-name spawn runs, and every create that spawns pi so.
const BARE_TEST = 'src/main/agents/__tests__/p350-pi-bare-name.test.ts';
const TEST_FILES = [
  SWITCH_TEST, FLAGS_TEST, PASS_TEST, SCREEN_TEST, HARNESS_TEST,
  TOKEN_TEST, PI_PASS_TEST, PI_RESTORE_TEST, ARM_TEST, EXTRAS_TEST, WARM_TEST, PKG_TEST, BARE_TEST
];
/** The planted shapes' one row title, written in its file as a template. */
const SHAPE_ROW = '${name}: reads ${VERDICT[name]!}, and composes, keeps and passes the token exactly where it holds';
const shapeRow = (name) => [PKG_TEST, `${name}: reads unread, and composes, keeps and passes the token exactly where it holds`, SHAPE_ROW];
/** The bare-name creates' one row title, written in its file as a template. */
const BARE_ROW = "${row.id} reads ${row.verdict}: the desk, the phone and Restart spawn pi ${row.verdict === 'holds' ? 'with the token' : 'as today'}, byte for byte";
const bareRow = (id, verdict) => [
  BARE_TEST,
  `${id} reads ${verdict}: the desk, the phone and Restart spawn pi ${verdict === 'holds' ? 'with the token' : 'as today'}, byte for byte`,
  BARE_ROW
];

/**
 * Every owner by its short name, and the `it` title it stands for (SPEC §3),
 * with the file that holds it. A title renamed in its file reads here as an
 * owner that stayed green, never as a pass.
 */
const TITLES = {
  A1: [SWITCH_TEST, 'the codex launch argv carries the scrollback pair once, from the constant'],
  A2: [SWITCH_TEST, 'the codex resume argv carries the scrollback pair once, from the constant'],
  A4: [SWITCH_TEST, 'the claude launch env carries CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1 from the constant, and create records it'],
  A6: [SWITCH_TEST, 'both passthrough lists refuse the claude variable, with a true sentence'],
  A7: [SWITCH_TEST, 'every launchable row declares a screen record, and only the IDE pair declares none'],
  A9: [SWITCH_TEST, 'a configuration row carrying screen is dropped whole with the refusal sentence'],
  F2: [FLAGS_TEST, 'a row written after this phase: the pair is set aside and its own flags follow'],
  F6: [FLAGS_TEST, 'the harvest, the rescue and the remote harvest compose byte-identical resume argvs for the same row'],
  F7: [FLAGS_TEST, 'the remote harvest composes the pair once and keeps the far binary'],
  F8: [FLAGS_TEST, 'Restart keeps --yolo on a row written before this phase'],
  R3: [PASS_TEST, 'a pre-phase codex row whose own flags already end with the pair is byte identical'],
  R5: [PASS_TEST, 'a captured row whose wrap cannot be rebuilt is left exactly as it is'],
  R6: [PASS_TEST, 'a codex row on another machine has its tail recomposed and keeps its far argv[0]'],
  R9: [PASS_TEST, 'a local claude row with no env gains a one-key record'],
  R11: [PASS_TEST, 'a claude row whose env holds "0" is byte identical'],
  R12: [PASS_TEST, 'a claude row on another machine is byte identical'],
  R15: [PASS_TEST, 'two passes: the second writes nothing and the digests are equal'],
  R18: [PASS_TEST, 'resumeIdHarvests runs the pass after the codex repair and still runs the rescue when the pass throws'],
  S1: [SCREEN_TEST, 'a switch-to-inline row on the alternate screen fails'],
  // Phase 331's fix round (build/p331/SPEC.md, "§As built — the fix round").
  R20: [PASS_TEST, 'a row carrying a column this build cannot read keeps those bytes when the pass writes it'],
  H1: [HARNESS_TEST, "Claude Code's folder question with its focus on No is answered by one Down and then Enter, and only when the accept is then highlighted"],
  H2: [HARNESS_TEST, 'a create reading taken at a trust question the harness could not answer is no reading, and fails a switch'],
  H3: [HARNESS_TEST, 'the detection scan a conformance run starts covers only the agents it was asked for'],
  H4: [HARNESS_TEST, 'Codex is created with its update check off, with and without the bypass flags, and the harvest carries it to the resume argv'],
  H5: [HARNESS_TEST, 'an agent install that moved during the run is named, and one that stayed is not'],
  // Phase 350 (build/p350/SPEC.md §6 items 3 and 4, §7.1): the pi builder's rows.
  N1: [TOKEN_TEST, 'PI_INLINE_ARGS and PI_INLINE_FLOOR are spelled as pi reads them'],
  N2: [TOKEN_TEST, "piInlineFloor reads §7.1 11.8's nine versions byte for byte"],
  N3: [TOKEN_TEST, "M2's composition: launch and resume are one argv with the floor, today's without it"],
  N4: [TOKEN_TEST, 'exactly three switch rows, and only pi names a floor'],
  N5: [TOKEN_TEST, 'fixedLaunchTokens names the token at every version, and ownLaunchFlags sets it aside only when it leads'],
  N6: [TOKEN_TEST, 'starts nothing, and settles with the first scan that resolves'],
  N7: [PI_PASS_TEST, 'at a floor that reads holds', 'at a floor that reads ${floor}'],
  N8: [PI_PASS_TEST, 'at a floor that reads unread', 'at a floor that reads ${floor}'],
  N9: [PI_PASS_TEST, "never touches another machine's pi row, nor any other agent's, whatever their argv holds"],
  N10: [PI_PASS_TEST, 'the far callers pass the literal false: no pi on another machine is handed the token (D2)'],
  N11: [PI_PASS_TEST, 'a create reads the version ONCE, before the launch is composed, and asks the floor of the binary it runs'],
  N12: [PI_PASS_TEST, "the harvest and the admission both ask the floor with pi's own name, and the two Codex paths say false"],
  N13: [PI_RESTORE_TEST, 'takes the token out of indices 1 and 2 while the floor does not hold, an unanswered scan included'],
  N14: [PI_RESTORE_TEST, 'arms a HEAD row as today before the scan answers, and as recorded once it reads the floor'],
  N15: [PI_RESTORE_TEST, 'composes a HEAD row with the token while the floor holds, and without it while not'],
  N16: [ARM_TEST, "holds pi's inline token and nothing more of pi's than before"],
  N17: [EXTRAS_TEST, "M2's eight planted rows, each byte for byte"],
  N18: [WARM_TEST, 'starts nothing for a discarded pi row, a pi row on another machine, or no pi row'],
  N19: [WARM_TEST, 'PHASE 350: no pi warm at boot, and the pi pass waits on the first answer behind the disposed flag'],
  N20: [WARM_TEST, 'asks the pi warm once, after the milestone, behind its own latch, in a try'],
  // The fix round's rows (build/p350/SPEC.md §As built, "The fix round").
  N21: [TOKEN_TEST, 'answers for the very file the scan read, by what it is and not by its name (the fix round)'],
  N22: [TOKEN_TEST, 'reads unread for the scanned file once it is rewritten, and again holds after a fresh scan (the fix round)'],
  N23: [TOKEN_TEST, 'settles only once the scan has read every probe, so the pass it wakes reads the floor (the fix round)'],
  N24: [PI_PASS_TEST, "a pass that read no row's floor leaves the latch open, and moved nothing"],
  N25: [PI_PASS_TEST, "below the floor: one copy is the person's and stays; of two, the first is Tortie's and comes out"],
  N26: [PI_PASS_TEST, 'a row recorded against a second pi install is never moved, at any reading of the scanned one'],
  N27: [PI_RESTORE_TEST, 'a row that records a second pi install loses the token though the scanned pi holds (the fix round)'],
  N28: [PI_RESTORE_TEST, "a person's own leading --tui-mode regular is armed as recorded; only Tortie's copy comes out (the fix round)"],
  N29: [PI_PASS_TEST, 'the admission composes no token for a row that records another pi install, though the scanned one holds'],
  N30: [PI_PASS_TEST, 'the floor is asked for the binary each row records, and for nothing else'],
  N31: [TOKEN_TEST, 'reads only the version alone, as pi -v prints it, and a prerelease of the floor as below it (the fix round)'],
  N32: [PI_PASS_TEST, "a row whose own launch flags come first and lead with the words keeps the person's copy; only Tortie's comes out (the fix round)"],
  N33: [PI_RESTORE_TEST, "a person's own launch flags put first and leading with the words are armed as recorded (the fix round)"],
  N34: [TOKEN_TEST, "composes a row's own resume with its own recorded flags and no token of Tortie's (the fix round)"],
  // The ruled round's rows (his ruling of 2026-11-02, R1): each planted shape that must read unread.
  N35: shapeRow('miseShim'),
  N36: shapeRow('asdfShim'),
  N37: shapeRow('voltaShim'),
  N38: shapeRow('pnpmShim'),
  N39: shapeRow('wrapper'),
  N40: shapeRow('copy'),
  N41: shapeRow('otherPackage'),
  N42: shapeRow('unreadable'),
  N43: shapeRow('notJson'),
  N44: [PKG_TEST, 'insidePiPackage answers each planted shape as his ruling says, and starts nothing'],
  N45: shapeRow('namelessNearer'),
  N46: [PKG_TEST, "pnpm's package is real, but its shim is not inside it: the shim reads unread though pi's own file holds"],
  // The second ruled round's rows (his ruling of 2026-11-02, "Check the file that runs").
  N47: [BARE_TEST, "a relative entry is read from the session's own folder, never from this process's"],
  N48: [BARE_TEST, "an empty entry, leading, doubled or trailing, is the session's folder itself"],
  N49: [BARE_TEST, 'one file is one file by device and inode, never by its spelling'],
  N50: bareRow('npm project, node_modules/.bin', 'unread'),
  N51: bareRow('pnpm project, ./node_modules/.bin', 'unread'),
  N52: bareRow('npm project, .', 'unread'),
  N53: bareRow('npm project, a leading empty entry', 'unread'),
  N54: bareRow('pnpm project, a doubled empty entry', 'unread'),
  N55: bareRow('npm project, bin (a project binstub)', 'unread'),
  N56: bareRow('npm project through a link, node_modules/.bin', 'unread'),
  N57: bareRow('plain project, a relative entry to the global itself', 'holds'),
  // The reverify's nit: pi's unscoped name under another scope, and under its old one.
  N58: shapeRow('someoneScope'),
  N59: shapeRow('oldScope'),
  // The third ruled round (his ruling of 2026-11-03): a session in a subfolder of its project. N60, N61, N63 and N64,
  // the `#` rows, went with P42 in Phase 353, and N65 to N68, the `;` rows, with P44: their rows flipped to holding
  // the token, because every create now hands tmux the folder held back.
  N62: [BARE_TEST, 'a session in a subfolder of its project that pins its own pi 0.83.0 reads unread from that subfolder: the desk and Restart spawn pi there as today, and the phone, which starts in the project folder, holds, byte for byte'],
  // Phase 353: the rows that flipped to holding the token, owned by P45 (the `#` term back) and P46 (the `;` term back).
  N69: bareRow('C#Tools, a project with no pi, HOME holding its own pi 0.83.0, node_modules/.bin', 'holds'),
  N70: bareRow('C#/app, the # in a parent folder, HOME holding its own pi 0.83.0, node_modules/.bin', 'holds'),
  N71: [BARE_TEST, "a folder whose name holds a # is walked like any other, wherever HOME's own pi is: the create now holds the folder back, so the pane starts there"],
  N72: [BARE_TEST, "a # in a parent folder's name is walked like any other"],
  N73: bareRow('semi\\;, a project with no pi whose name ends in a backslash and a semicolon, HOME holding its own pi 0.83.0, node_modules/.bin', 'holds'),
  N74: bareRow('twin\\;, a project with no pi whose twin twin; pins its own pi 0.83.0, a HOME holding none, node_modules/.bin', 'holds'),
  N75: [BARE_TEST, "a folder whose name ends in a backslash and a semicolon is walked like any other, wherever HOME's own pi is: the create now hands its final ; held back"],
  N76: [BARE_TEST, 'a folder ending in a backslash and a semicolon is walked as itself, never as its ; twin, and the twin, which pins its own pi, runs that pi']
};
/**
 * The `conformance:agents` rows, owned by the line the gate prints when one
 * fails: `Phase 331 11.N (` for Phase 331's five and, since Phase 350,
 * `Phase 350 11.N (` for the four rows that hold pi's token.
 */
const GATE_PHASE = {
  '11.1': '331', '11.2': '331', '11.3': '331', '11.4': '331', '11.5': '331',
  '11.6': '350', '11.7': '350', '11.8': '350', '11.9': '350', '11.10': '350', '11.11': '350'
};
const GATE_ROWS = Object.keys(GATE_PHASE);
const isGateRow = (owner) => GATE_ROWS.includes(owner);

// ---------------------------------------------------------------------------
// The two needles computed from the shipping source, braces matched
// ---------------------------------------------------------------------------

/**
 * pi's record is anchored on its `measured` string, which SPEC §2.2 requires to
 * be unique in the file. Phase 350 rewrote it with the record (a switch behind
 * its floor), and the anchor moved with it.
 */
const PI_MEASURED = "measured: '0.84.2 live, 2026-09-29 (research 134); 1.0.0 to 1.4.0 read as text, 2026-10-31 (Phase 350)',";

/**
 * pi's whole `screen: { … },` property, from the start of its line to the
 * newline after its comma, the braces matched from the `{` the property opens.
 * Null when the anchor or the braces cannot be read.
 */
function piScreenBlock(source) {
  const anchor = source.indexOf(PI_MEASURED);
  if (anchor < 0 || source.indexOf(PI_MEASURED, anchor + 1) >= 0) return null;
  const open = source.lastIndexOf('screen: {', anchor);
  if (open < 0) return null;
  let depth = 0;
  let end = -1;
  let quote = null;
  for (let i = source.indexOf('{', open); i < source.length; i += 1) {
    const ch = source[i];
    if (quote !== null) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0 || source[end + 1] !== ',') return null;
  const lineStart = source.lastIndexOf('\n', open) + 1;
  const lineEnd = source.indexOf('\n', end);
  return lineEnd < 0 ? null : source.slice(lineStart, lineEnd + 1);
}

/**
 * The `screen:` entry of `REFUSED_ROW_FIELDS`: the key and its sentence, up to
 * the next key or the object's close. When it is the last entry the comma
 * before it stays as a trailing comma, which an object literal allows, so the
 * edited file still parses and the owner goes red on what it asserts rather
 * than on a module that did not load. A comment above the key stays too.
 */
function refusalEntry(source) {
  const obj = source.indexOf('export const REFUSED_ROW_FIELDS');
  if (obj < 0) return null;
  const close = source.indexOf('\n};', obj);
  const start = source.indexOf('\n  screen:\n', obj);
  if (close < 0 || start < 0 || start > close) return null;
  const next = /\n {2}[A-Za-z_$][\w$]*:/g;
  next.lastIndex = start + 1;
  const m = next.exec(source);
  const end = m !== null && m.index < close ? m.index : close;
  return source.slice(start, end);
}

// ---------------------------------------------------------------------------
// The arms, SPEC §2.10's table exactly
// ---------------------------------------------------------------------------

function arms(registry, overlay) {
  const pi = piScreenBlock(registry);
  const refusal = refusalEntry(overlay);
  return [
    { n: 'C1', name: 'the scrollback pair off the codex launch argv', file: REGISTRY,
      find: "      argv: ['codex', ...CODEX_SCROLLBACK_ARGS],", to: "      argv: ['codex'],", owners: ['A1', '11.2'] },
    { n: 'C2', name: 'the scrollback pair off the codex resume template', file: REGISTRY,
      find: "      template: ['resume', SESSION_ID_SLOT, ...CODEX_SCROLLBACK_ARGS],", to: "      template: ['resume', SESSION_ID_SLOT],", owners: ['A2', '11.2'] },
    { n: 'C3', name: 'ownLaunchFlags no longer sets the fixed tokens aside', file: REGISTRY,
      find: '  if (fixed.length > 0 && fixed.every((token, i) => rest[i] === token)) return rest.slice(fixed.length);\n', to: '', owners: ['F2', 'F6'] },
    { n: 'C4', name: 'recoverLaunchExtras without the pre-phase shape', file: EXTRAS,
      find: '  const asLaunched = [bin, ...fixedLaunchTokens(agent), ...ownLaunchFlags(agent, argv)];', to: '  const asLaunched = [...argv];', owners: ['F8'] },
    { n: 'C5', name: 'the remote harvest no longer calls the helper', file: REMOTE_RECORD,
      find: '    ownLaunchFlags(input.agent, record.argv),', to: '    record.argv.slice(1),', owners: ['F7', 'F6'] },
    { n: 'C6', name: 'the boot pass not called', file: HARVEST,
      find: '    repairInlineSwitchesOnce(deps.manifest);\n', to: '', owners: ['R18'] },
    { n: 'C7', name: 'the pass arms a captureLost row bare', file: PASS,
      find: "    if (composed.captureLost) return left('capture-lost');\n", to: '', owners: ['R5'] },
    { n: 'C8', name: 'the pass rewrites a row that already carries the pair', file: PASS,
      find: "  if (carriesPair(recordedInner)) return left('already-right');\n", to: '', owners: ['R3'] },
    // Phase 350 (D20): the Codex arm's floor is the explicit `false` now, so the needle carries it.
    { n: 'C9', name: "the pass rewrites a remote row's argv[0]", file: PASS,
      find: 'recorded[0], false);', to: 'undefined, false);', owners: ['R6'] },
    { n: 'L1', name: 'the claude variable taken out of launch.env', file: REGISTRY,
      find: '      env: { ...CLAUDE_INLINE_ENV },\n', to: '', owners: ['A4', 'A6', '11.3'] },
    { n: 'L2', name: 'the pass does not merge env', file: PASS,
      find: '  manifest.setEnvColumn(rec.id, merged);\n', to: '', owners: ['R9'] },
    { n: 'L3', name: 'the pass merges into a claude row on another machine', file: PASS,
      find: "  if (rec.agent === 'claude' && isLocalRow(rec)) return envArm(manifest, rec);",
      to: "  if (rec.agent === 'claude') return envArm(manifest, rec);", owners: ['R12'] },
    { n: 'L4', name: 'the pass overwrites a present "0"', file: PASS,
      find: "  if (Object.hasOwn(env, name)) return left('already-right');", to: "  if (env[name] === '1') return left('already-right');", owners: ['R11'] },
    { n: 'B1', name: 'the pass writes on its second run', file: PASS,
      find: "  if (Object.hasOwn(env, name)) return left('already-right');\n", to: '', owners: ['R15'] },
    { n: 'B2', name: "pi's screen record removed", file: REGISTRY, find: pi, to: '', owners: ['A7', '11.1'] },
    { n: 'B3', name: 'the screen refusal dropped from REFUSED_ROW_FIELDS', file: OVERLAY, find: refusal, to: '', owners: ['A9', '11.4'] },
    { n: 'B4', name: 'the conformance:resume failure for a switch taken out', file: SCREEN,
      find: "  if (record.class === 'switch-to-inline' && (reading === null || reading.alternateOn)) return failed(agent, reading, unread);\n",
      to: '', owners: ['S1'] },
    // THE FIX ROUND'S ARMS, one clause each (build/p331/SPEC.md, "§As built — the fix round").
    { n: 'X1', name: "the harness no longer answers Claude Code's refusal-first folder question", file: CASES,
      find: "  if (SELECTED_REFUSAL_THEN_AFFIRMATIVE.test(pane)) return 'down-then-enter';\n", to: '', owners: ['H1'] },
    { n: 'X2', name: 'a reading taken at an unanswered trust question counts as a reading', file: SCREEN,
      find: '  if (gate.seen === null || gate.answered) return null;', to: '  return null;', owners: ['H2'] },
    { n: 'X3', name: 'the run no longer restricts its detection scan', file: RESUME,
      find: '    setAgentTableSource(() => conformanceDetectionTable(cfg.agents));\n', to: '', owners: ['H3'] },
    { n: 'X4', name: 'the detection table is every compiled row again', file: CASES,
      find: '  return AGENT_REGISTRY.filter((entry) => wanted.has(entry.id));', to: '  return [...AGENT_REGISTRY];', owners: ['H3'] },
    { n: 'X5', name: "Codex's update check left on in the harness", file: CASES,
      find: "  codex: ['-c', 'check_for_update_on_startup=false']\n", to: '', owners: ['H4'] },
    { n: 'X6', name: 'an install rewritten in place is not named', file: REPORT,
      find: '    else if (now.mtimeMs !== was.mtimeMs || now.size !== was.size) out.push(`${agent} (${was.real} was rewritten)`);\n', to: '', owners: ['H5'] },
    { n: 'X7', name: 'the pass writes the whole row back again', file: PASS,
      find: '  manifest.setEnvColumn(rec.id, merged);', to: '  (manifest as unknown as ManifestStore).updateSession(rec.id, { env: merged });', owners: ['R20'] },
    { n: 'X8', name: 'the highlight after the Down read in a window the blank rows fill', file: PANE,
      find: '      const moved = bottomOfPane(await readPane(target), since);', to: '      const moved = currentScreen(afterMarker(await readPane(target), since));', owners: ['H1'] },
    { n: 'X9', name: 'the second look reads the whole pane again', file: PANE,
      find: '    const pane = attempt === 0 ? capture : bottomOfPane(capture);', to: '    const pane = capture;', owners: ['H1'] },
    // PHASE 350'S ARMS, one clause each (build/p350/SPEC.md §7.1, §4.1, §4.2).
    { n: 'P1', name: "pi's token spelled as another mode", file: REGISTRY,
      find: "export const PI_INLINE_ARGS = ['--tui-mode', 'regular'] as const;", to: "export const PI_INLINE_ARGS = ['--tui-mode', 'fullscreen'] as const;", owners: ['N1', '11.6'] },
    { n: 'P2', name: 'the floor lowered below the first pi that knows the flag', file: REGISTRY,
      find: "export const PI_INLINE_FLOOR = '0.84.0';", to: "export const PI_INLINE_FLOOR = '0.80.0';", owners: ['N2', '11.6', '11.8'] },
    { n: 'P3', name: 'the composers put the token in whatever the floor says', file: REGISTRY,
      find: "  return floorHolds && id === 'pi' ? PI_INLINE_ARGS : [];", to: "  return id === 'pi' ? PI_INLINE_ARGS : [];", owners: ['N3', '11.7'] },
    { n: 'P4', name: "fixedLaunchTokens no longer names pi's token", file: REGISTRY,
      find: '  return [...flooredTokensOf(entry.id, true), ...entry.launch.argv.slice(1)];', to: '  return entry.launch.argv.slice(1);', owners: ['N5', '11.6'] },
    { n: 'P5', name: 'the floor read as a string comparison of its own', file: REGISTRY,
      find: "  return compareSpecStoryVersions(read, PI_INLINE_FLOOR) > 0 || read === PI_INLINE_FLOOR ? 'holds' : 'below';", to: "  return read >= PI_INLINE_FLOOR ? 'holds' : 'below';", owners: ['11.8'] },
    { n: 'P6', name: 'the far launch hands pi the token', file: REMOTE_SESSIONS,
      find: '  return launchArgvFor(entry, extraArgs, undefined, agentSessionId, false);', to: '  return launchArgvFor(entry, extraArgs, undefined, agentSessionId, true);', owners: ['N10', '11.7'] },
    { n: 'P7', name: 'the create composes with no floor read', file: CREATE,
      find: "    (input.agent as LaunchableAgentKind) === 'pi' && piInlineFloorFor(binPath, spawnedBy) === 'holds'", to: '    false', owners: ['N11', '11.7'] },
    { n: 'P8', name: 'Restart compares against an argv composed without the token', file: EXTRAS,
      find: '  const launch = registryLaunchArgv(agent, [], bin, rec.agentSessionId, true);', to: '  const launch = registryLaunchArgv(agent, [], bin, rec.agentSessionId, false);', owners: ['N17', '11.7'] },
    { n: 'P9', name: "the pass reads another machine's pi row", file: PASS,
      find: "    if ((rec.agent as LaunchableAgentKind) !== 'pi' || !isLocalRow(rec)) continue;", to: "    if ((rec.agent as LaunchableAgentKind) !== 'pi') continue;", owners: ['N9', '11.9'] },
    { n: 'P10', name: 'the pass moves rows on an unread version', file: PASS,
      find: "  if (floor === 'unread') return left('no-floor');\n", to: '', owners: ['N8', 'N26', '11.9'] },
    { n: 'P11', name: 'the pass puts the token after the id rather than at index 1', file: PASS,
      find: '      ...recorded.slice(0, 1),\n      ...PI_INLINE_ARGS,\n      ...recorded.slice(1)\n', to: '      ...recorded,\n      ...PI_INLINE_ARGS\n', owners: ['N7', '11.9'] },
    { n: 'P12', name: 'armableResume hands back the ladder without the strip', file: RESTORE,
      find: '  const argv = withoutPiTokenBelowFloor(rec, decided.argv);', to: '  const argv = decided.argv;', owners: ['N14', '11.9'] },
    { n: 'P13', name: 'the strip keeps the token while the floor does not hold', file: RESTORE,
      find: "  if (piInlineFloorFor(argv[0]) === 'holds') return argv;", to: "  if (piInlineFloorFor(argv[0]) !== 'holds') return argv;", owners: ['N13', '11.9'] },
    { n: 'P14', name: "Rule 1 no longer admits the composers' fixed tokens", file: ARM,
      find: '  for (const token of fixedLaunchTokens(agent)) tokens.add(token);\n', to: '', owners: ['N16', 'N15', '11.9'] },
    { n: 'P15', name: "pi's record without its floor", file: REGISTRY,
      find: '      floor: PI_INLINE_FLOOR,\n', to: '', owners: ['N4', '11.5'] },
    { n: 'P16', name: "pi's record back to inline-already", file: REGISTRY,
      find: "      class: 'switch-to-inline',\n      carriage: 'argv',\n      tokens: PI_INLINE_ARGS,\n      floor: PI_INLINE_FLOOR,\n", to: "      class: 'inline-already',\n", owners: ['N4', 'S1', '11.5'] },
    { n: 'P17', name: 'the pi warm at the first terminal bytes taken out', file: CORE,
      find: '            warmDetectionForLocalPi(this.manifest.listSessions());\n', to: '', owners: ['N20'] },
    { n: 'P18', name: 'the boot pass never run when the scan answers', file: CORE,
      find: '        repairPiInlineOnce(core.manifest, { floorFor: piInlineFloorFor, ownResume: piOwnResumeArgv });\n', to: '', owners: ['N19'] },
    { n: 'P19', name: 'the warm starts a scan for a discarded pi row', file: DETECTION,
      find: "      row.status !== 'discarded' &&\n", to: '', owners: ['N18'] },
    { n: 'P20', name: 'the first answer settled by no scan', file: DETECTION,
      find: '  answer.settle(result);\n', to: '', owners: ['N6'] },
    { n: 'P21', name: 'the harvest hands pi the token whatever the scan read', file: HARVEST,
      find: "        agent === 'pi' && piInlineFloorFor(resumeBinOf(rec, agent)) === 'holds'\n", to: '        true\n', owners: ['N12', '11.7'] },
    // THE FIX ROUND'S ARMS (build/p350/SPEC.md §As built, "The fix round").
    { n: 'P22', name: "the floor read for the scanned pi whatever file a row names", file: DETECTION,
      find: "  return read !== undefined && now !== null && sameFile(read, now) ? reading : 'unread';", to: '  return reading;', owners: ['N21', 'N22', 'N27', 'N29'] },
    { n: 'P23', name: 'a rewritten file read as the one the scan read', file: DETECTION,
      find: '    a.ino === b.ino &&\n    a.size === b.size &&\n    a.mtimeMs === b.mtimeMs &&\n    a.ctimeMs === b.ctimeMs\n', to: '    a.ino === b.ino\n', owners: ['N22'] },
    { n: 'P24', name: "the strip taking a person's own leading copy", file: RESTORE,
      find: "  if (!piTokenIsTortiesIn(argv, piOwnResumeArgv(rec.agentSessionId ?? '', rec.specstory?.agentArgv ?? rec.argv))) return argv;", to: '  if (!piTokenIsTortiesIn(argv, [])) return argv;', owners: ['N28', '11.9'] },
    { n: 'P25', name: "the below-floor pass taking a person's own leading copy", file: PASS,
      find: "  if (!piTokenIsTortiesIn(recorded, readers.ownResume(id, rec.specstory?.agentArgv ?? rec.argv))) return left('already-right');", to: "  if (!piTokenLeads(recorded)) return left('already-right');", owners: ['N25', '11.9'] },
    { n: 'P26', name: 'the pass judging every row by no binary of its own', file: PASS,
      find: "  const floor = readers.floorFor(recorded[0] ?? '');", to: "  const floor = readers.floorFor(getRegistryEntry('pi').binaries[0] ?? '');", owners: ['N30', '11.9'] },
    { n: 'P27', name: 'the latch set by a pass that read no floor', file: PASS,
      find: '  if (floorsRead > 0 || outcomes.length === 0) piPassed = true;', to: '  piPassed = true;', owners: ['N24'] },
    { n: 'P28', name: 'the create asking the floor of the scanned pi, not its own binary', file: CREATE,
      find: "piInlineFloorFor(binPath, spawnedBy) === 'holds'", to: "piInlineFloorFor(input.agent, spawnedBy) === 'holds'", owners: ['N11'] },
    { n: 'P29', name: 'the first answer settled before the scan read anything (the m33 shape)', file: DETECTION,
      find: '  const answer = firstAnswer;\n', to: '  const answer = firstAnswer;\n  answer.settle({ agents: [], scannedAt: 0 });\n', owners: ['N23'] },
    // The fix round's floor reader: the version ALONE, and a prerelease of the floor below it.
    { n: 'P30', name: 'the floor read off a line with words around the version', file: REGISTRY,
      find: "  if (read === null || read !== version) return 'unread';", to: "  if (read === null) return 'unread';", owners: ['N31', '11.8'] },
    { n: 'P31', name: 'a prerelease of the floor read as holding it', file: REGISTRY,
      find: "  return compareSpecStoryVersions(read, PI_INLINE_FLOOR) > 0 || read === PI_INLINE_FLOOR ? 'holds' : 'below';", to: "  return compareSpecStoryVersions(read, PI_INLINE_FLOOR) >= 0 ? 'holds' : 'below';", owners: ['N31', '11.8'] },
    // The fix round's own composition: a person's launch flags read off the row, so ones put first are told apart.
    { n: 'P32', name: "a row's own composition read with none of its own launch flags", file: DETECTION,
      find: '        flags = launched.slice(at + pair.length);\n', to: '', owners: ['N32', 'N33', 'N34'] },
    // THE RULED ROUND'S ARMS (his ruling of 2026-11-02, R1): only pi's own package.
    { n: 'P33', name: "the floor read for any file the scan read, a shim's, a wrapper's or a copy's", file: DETECTION,
      find: "  if (!insidePiPackage(bin)) return 'unread';\n", to: '', owners: ['11.10', 'N35', 'N36', 'N37', 'N38', 'N39', 'N40', 'N46'] },
    { n: 'P34', name: "any package read as pi's own", file: DETECTION,
      find: '(parsed as { name?: unknown }).name === PI_PACKAGE_NAME', to: '(parsed as { name?: unknown }).name !== undefined', owners: ['11.10', 'N41', 'N44'] },
    { n: 'P35', name: "a package.json that cannot be read or parsed read as pi's", file: DETECTION,
      find: '      } catch {\n        return false;\n      }\n    }\n    const up = dirname(dir);', to: '      } catch {\n        return true;\n      }\n    }\n    const up = dirname(dir);', owners: ['N42', 'N43', 'N44'] },
    { n: 'P36', name: 'a nearer package.json passed over for one further up', file: DETECTION,
      find: '        return typeof parsed === \'object\' && parsed !== null && (parsed as { name?: unknown }).name === PI_PACKAGE_NAME;',
      to: '        if (typeof parsed === \'object\' && parsed !== null && (parsed as { name?: unknown }).name === PI_PACKAGE_NAME) return true;',
      owners: ['N45', 'N44'] },
    // THE SECOND RULED ROUND'S ARMS (his ruling of 2026-11-02, "Check the file that runs").
    { n: 'P37', name: "a relative PATH entry read from this process's folder, not the session's", file: DETECTION,
      find: "    const dir = entry.length === 0 ? folder : entry.startsWith('/') ? entry : `${folder}/${entry}`;", to: '    const dir = entry.length === 0 ? folder : entry;',
      owners: ['11.11', 'N47', 'N50', 'N51', 'N52', 'N55', 'N56'] },
    { n: 'P38', name: 'empty PATH entries passed over', file: DETECTION,
      find: '  for (const entry of path.split(delimiter)) {\n', to: '  for (const entry of path.split(delimiter)) {\n    if (entry.length === 0) continue;\n',
      owners: ['11.11', 'N48', 'N53', 'N54'] },
    { n: 'P39', name: "the pane's file told from the checked one by its spelling", file: DETECTION,
      find: '    const st = statSync(bin, { bigint: true });\n    return st.dev === runs.dev && st.ino === runs.ino;\n', to: '    return runs.at === bin;\n',
      owners: ['11.11', 'N49', 'N57'] },
    { n: 'P40', name: 'the create asking the floor for the file it records, not the file its pane runs', file: CREATE,
      find: 'piInlineFloorFor(binPath, spawnedBy)', to: 'piInlineFloorFor(binPath)',
      owners: ['11.11', 'N50', 'N51', 'N52', 'N53', 'N54', 'N55', 'N56'] },
    { n: 'P41', name: "pi's package name read by its unscoped half under any scope", file: DETECTION,
      find: '(parsed as { name?: unknown }).name === PI_PACKAGE_NAME', to: "String((parsed as { name?: unknown }).name).split('/').pop() === PI_PACKAGE_NAME.split('/').pop()",
      owners: ['N58', 'N59', 'N44'] },
    // THE THIRD RULED ROUND'S ARM (his ruling of 2026-11-03). Its sibling P42, and the fourth ruled round's P44,
    // went in Phase 353 with the two clauses they broke (see the header).
    { n: 'P43', name: "the walk handed the project's folder, not the session's", file: CREATE,
      find: 'folder: cwd }', to: 'folder: input.projectPath }',
      owners: ['11.11', 'N62'] },
    // PHASE 353'S ARMS (build/p353/SPEC.md D354-5): what replaced P42 and P44, broken in the shipping source.
    { n: 'P45', name: "the # term of 2026-11-03 put back into the resolver's guard", file: DETECTION,
      find: "|| !folder.startsWith('/')) return null;", to: "|| !folder.startsWith('/') || folder.includes('#')) return null;",
      owners: ['11.11', 'N69', 'N70', 'N71', 'N72'] },
    { n: 'P46', name: "the ; term of 2026-11-04 put back into the resolver's guard", file: DETECTION,
      find: "|| !folder.startsWith('/')) return null;", to: "|| !folder.startsWith('/') || folder.endsWith(';')) return null;",
      owners: ['11.11', 'N73', 'N74', 'N75', 'N76'] },
    { n: 'P47', name: 'the create handing tmux the folder raw, which the walk can no longer start from', file: TMUX_SESSIONS,
      find: 'input.folderAsRecorded === true ? input.cwd : tmuxFolderArgument(input.cwd)', to: 'input.cwd',
      owners: ['11.11'] }
  ];
}

// ---------------------------------------------------------------------------
// The clone, and vitest and the gate inside it
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join('/private/tmp', `p331-ablation-${String(process.pid)}-`));

function cloneOne(rel) {
  const r = spawnSync('cp', ['-Rc', join(REPO, rel), join(scratch, rel)], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`cp -Rc ${rel} failed: ${r.stderr}`);
}

function buildClone() {
  cloneOne('src');
  if (existsSync(join(REPO, 'resources'))) cloneOne('resources');
  mkdirSync(join(scratch, 'build'), { recursive: true });
  for (const name of readdirSync(join(REPO, 'build'))) {
    if (name === 'vendor') continue;
    cloneOne(join('build', name));
  }
  // The vendored binaries are large and nothing here writes them: linked, never copied.
  if (existsSync(join(REPO, 'build', 'vendor'))) symlinkSync(join(REPO, 'build', 'vendor'), join(scratch, 'build', 'vendor'));
  const configs = [
    'package.json',
    'vitest.config.ts',
    '.nvmrc',
    ...readdirSync(REPO).filter((f) => /^tsconfig(\.[a-z]+)?\.json$/.test(f))
  ];
  for (const name of configs) {
    if (existsSync(join(REPO, name))) writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
  }
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
}

/** Run the named test files in the clone and answer every failed row, by full name and by title. */
function runTests(files) {
  const out = join(scratch, `vitest-${String(Date.now())}.json`);
  const r = spawnSync(
    process.execPath,
    [join('node_modules', 'vitest', 'vitest.mjs'), 'run', '--no-cache', '--reporter=json', `--outputFile=${out}`, ...files],
    { cwd: scratch, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300_000 }
  );
  let report = null;
  try {
    report = JSON.parse(readFileSync(out, 'utf8'));
  } catch {
    report = null;
  }
  rmSync(out, { force: true });
  if (report === null) {
    return { failed: null, titles: null, ran: 0, tail: `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-12).join('\n') };
  }
  const failed = [];
  const titles = [];
  let ran = 0;
  for (const file of report.testResults ?? []) {
    for (const a of file.assertionResults ?? []) {
      ran += 1;
      if (a.status === 'failed') {
        failed.push([...(a.ancestorTitles ?? []), a.title].join(' > '));
        titles.push(`${file.name}::${a.title}`);
      }
    }
    // A file that failed to load has no rows; name it so it is not read as green.
    if ((file.assertionResults ?? []).length === 0 && file.status === 'failed') {
      failed.push(`${file.name} (did not load)`);
      titles.push(`${file.name}::(did not load)`);
    }
  }
  return { failed, titles, ran, tail: '' };
}

/** `conformance:agents` in the clone: which of its Phase 331 rows it printed as failed. */
function runGate() {
  const r = spawnSync(process.execPath, [join('build', 'conformance-agents.mjs')], {
    cwd: scratch,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 300_000
  });
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const red = GATE_ROWS.filter((row) => text.includes(`Phase ${GATE_PHASE[row]} ${row} (`));
  return { code: r.status ?? 1, red, tail: text.split('\n').slice(-8).join('\n') };
}

/** Did the owner go red in this run? A title matches in its own file, whatever describe it sits under. */
function ownerRed(owner, tests, gate) {
  if (isGateRow(owner)) return gate !== null && gate.code !== 0 && gate.red.includes(owner);
  const [file, title] = TITLES[owner] ?? [null, null];
  if (file === null || tests === null || tests.titles === null) return false;
  return tests.titles.some((t) => t.endsWith(`${file}::${title}`) || t === `${join(scratch, file)}::${title}`);
}

/** Put one clone file back and prove it by sha256 against the worktree. */
function restore(rel) {
  const want = readFileSync(join(REPO, rel));
  writeFileSync(join(scratch, rel), want);
  const got = readFileSync(join(scratch, rel));
  if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
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

const count = (text, needle) => (typeof needle !== 'string' || needle === '' ? 0 : text.split(needle).length - 1);

const problems = [];
const table = [];
const started = Date.now();
let ran = 0;
let owned = 0;

const WATCHED = [REGISTRY, EXTRAS, REMOTE_RECORD, HARVEST, PASS, OVERLAY, SCREEN, CASES, PANE, RESUME, REPORT, CORE, DETECTION, RESTORE, ARM, REMOTE_SESSIONS, CREATE, TMUX_SESSIONS, ...TEST_FILES, 'build/conformance-agents.mjs', 'build/agents-conformance-probe.mts'];
const before = new Map(WATCHED.filter((f) => existsSync(join(REPO, f))).map((f) => [f, sha(readFileSync(join(REPO, f)))]));

try {
  for (const f of TEST_FILES) {
    if (!existsSync(join(REPO, f))) problems.push(`the owning test file ${f} is not in the tree, so its rows cannot own anything`);
  }
  if (problems.length > 0) throw new Error('control red');
  // Every title is written in its file, or it cannot be an owner (a title the
  // file writes as a template names its written form third, Phase 350).
  for (const [short, [file, title, written]] of Object.entries(TITLES)) {
    if (count(readFileSync(join(REPO, file), 'utf8'), written ?? title) === 0) problems.push(`${short}'s title is not written in ${file}: ${written ?? title}`);
  }

  buildClone();
  say(`clone at ${scratch}, node_modules and build/vendor symlinked, nothing under a home touched`);

  const list = arms(readFileSync(join(REPO, REGISTRY), 'utf8'), readFileSync(join(REPO, OVERLAY), 'utf8'));
  // Phase 350: `--only A,B` (or `--only=A,B`) beside P331_ONLY, as ablation:p320 takes it.
  const at = process.argv.findIndex((a) => a === '--only' || a.startsWith('--only='));
  const argOnly = at < 0 ? '' : process.argv[at].startsWith('--only=') ? process.argv[at].slice('--only='.length) : (process.argv[at + 1] ?? '');
  const only = `${process.env['P331_ONLY'] ?? ''},${argOnly}`.split(',').map((s) => s.trim()).filter((s) => s !== '');
  for (const name of only) {
    if (name !== 'CTRL' && !list.some((a) => a.n === name)) problems.push(`P331_ONLY names ${JSON.stringify(name)}, which is no arm`);
  }

  // CTRL: every owner above green, over the unedited clone.
  const control = runTests(TEST_FILES);
  const controlGate = runGate();
  if (control.failed === null || control.failed.length > 0 || control.ran === 0 || controlGate.code !== 0) {
    problems.push(
      `the UNEDITED control is not green (vitest ${control.failed === null ? 'produced no report' : `${String(control.failed.length)} red of ${String(control.ran)}`}, ` +
        `conformance:agents exit ${String(controlGate.code)}${controlGate.red.length > 0 ? ` with ${controlGate.red.join(', ')} red` : ''}), ` +
        `so every arm below would mean nothing. ${(control.failed ?? []).slice(0, 5).join(' | ')}${control.tail}${controlGate.code !== 0 ? `\n${controlGate.tail}` : ''}`
    );
    throw new Error('control red');
  }
  table.push(['CTRL', 'green', `${String(control.ran)} vitest rows and conformance:agents, unedited`]);
  say(`control: ${String(control.ran)} rows green over the ${String(TEST_FILES.length)} files, and conformance:agents green`);

  for (const arm of list) {
    if (only.length > 0 && !only.includes(arm.n)) continue;
    const shipping = readFileSync(join(REPO, arm.file), 'utf8');
    const hits = count(shipping, arm.find);
    if (typeof arm.find !== 'string' || hits !== 1) {
      problems.push(
        `${arm.n} "${arm.name}": its needle matches ${typeof arm.find !== 'string' ? 'no clause it could compute' : `${String(hits)} times`} in ${arm.file}, ` +
          'not exactly once. A clause that moved moves its arm in the same commit.'
      );
      table.push([arm.n, 'NEEDLE', arm.name]);
      continue;
    }
    const files = [...new Set(arm.owners.filter((o) => !isGateRow(o)).map((o) => TITLES[o]?.[0]).filter((f) => f !== undefined))];
    const wantsGate = arm.owners.some(isGateRow);
    const path = join(scratch, arm.file);
    writeFileSync(path, shipping.replace(arm.find, () => arm.to), 'utf8');
    ran += 1;
    let tests = { failed: [], titles: [], ran: 0, tail: '' };
    let gate = null;
    try {
      if (files.length > 0) tests = runTests(files);
      if (wantsGate) gate = runGate();
    } finally {
      restore(arm.file);
    }
    if (tests.failed === null) {
      problems.push(`${arm.n} "${arm.name}": vitest produced no report. ${tests.tail}`);
      table.push([arm.n, 'NO REPORT', arm.name]);
      continue;
    }
    const missing = arm.owners.filter((o) => !ownerRed(o, tests, gate));
    const ownerTitles = arm.owners.filter((o) => !isGateRow(o)).map((o) => TITLES[o]?.[1]);
    const others = tests.failed.filter((f) => !ownerTitles.some((t) => f.endsWith(t)));
    const gateOthers = gate === null ? [] : gate.red.filter((row) => !arm.owners.includes(row));
    if (missing.length > 0) {
      problems.push(
        `${arm.n} "${arm.name}": its owner stayed GREEN: ${missing.map((o) => (isGateRow(o) ? `conformance:agents ${o}` : `${o} "${TITLES[o]?.[1] ?? '?'}"`)).join(' | ')}. ` +
          (others.length + gateOthers.length > 0
            ? `Red instead: ${[...others.slice(0, 4), ...gateOthers.map((g) => `conformance:agents ${g}`)].join(' | ')}`
            : 'Nothing went red, so the clause is decoration.')
      );
      table.push([arm.n, others.length + gateOthers.length > 0 ? 'RED ELSEWHERE' : 'NOTHING MOVED', arm.name]);
    } else {
      owned += 1;
      const extra = others.length + gateOthers.length;
      table.push([arm.n, 'owner red', `${arm.name} (${arm.owners.join(', ')})${extra > 0 ? ` and ${String(extra)} other row${extra === 1 ? '' : 's'}` : ''}`]);
    }
    say(
      `${arm.n.padEnd(4)} ${missing.length === 0 ? 'ok  ' : 'FAIL'} ${arm.name}: ${String(tests.failed.length)} red of ${String(tests.ran)}` +
        (gate === null ? '' : `, conformance:agents exit ${String(gate.code)} naming ${gate.red.join(', ') || 'no Phase 331 row'}`)
    );
  }

  const after = runTests(TEST_FILES);
  const afterGate = runGate();
  if (after.failed === null || after.failed.length > 0 || afterGate.code !== 0) {
    problems.push('after every file was restored the control is not green again, so a restore did not land');
  } else {
    say(`restored: every edited clone file matched the worktree by sha256, and the control is green again (${String(after.ran)} rows and conformance:agents)`);
  }
} catch (err) {
  if (!(err instanceof Error && err.message === 'control red')) {
    problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
  }
} finally {
  clean();
}

for (const [file, was] of before) {
  const now = sha(readFileSync(join(REPO, file)));
  if (now !== was) {
    problems.push(`${file} in the WORKTREE changed during the run (${was.slice(0, 12)} to ${now.slice(0, 12)}); this harness writes only its clone`);
  }
}

process.stdout.write('\n');
for (const [n, verdict, name] of table) process.stdout.write(`${TAG}   ${n.padEnd(4)} ${verdict.padEnd(14)} ${name}\n`);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (problems.length > 0) {
  process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS in ${seconds} s. ${String(ran)} arms, one clause each, and every one turned THE ROW THAT OWNS IT red ` +
    `by name (${String(owned)} of ${String(ran)}), with the unedited control green first and last. Every clone file was ` +
    'restored and proved by sha256, the worktree was never written, and the clone is gone. No Electron, no tmux, no ' +
    'agent, no token.\n'
);
