#!/usr/bin/env node
/**
 * assert-bundle-refusals.mjs — the durability refusals must survive the
 * bundler (Phase 20 fix round).
 *
 * ## The defect that made this file exist
 *
 * `applyReconstruction` refuses to run unless the caller passes the exact
 * acknowledgement sentence. That refusal is in `src/main/manifest/reconstruct.ts`,
 * a unit test pins it, and the unit test passes. It was not in
 * `out/main/index.js`, which is the file `npm run package` ships. The whole
 * `if` statement was gone, message and all.
 *
 * The cause is ordinary and it will happen again. Rollup tracks the value of a
 * parameter when a function has exactly one call site it can see. There was one
 * call site, it passed the constant, so rollup proved the branch dead and
 * deleted it. Nothing misbehaved, because the one caller was correct. What was
 * false was the claim: the shipped artifact did not contain the check the phase
 * said it contained.
 *
 * Vitest runs the source, so no test in this repo can see this class of defect.
 * This script reads the artifact.
 *
 * ## What it checks, and why it checks both directions
 *
 * Every entry names a refusal, the source file it lives in, and the text
 * fragments its message is built from.
 *
 *  1. Each fragment must be in the SOURCE file. If it is not, someone reworded
 *     a refusal and this table went stale. The run fails and says so, rather
 *     than passing on a check that no longer tests anything, or failing with a
 *     message that sends the reader hunting in the bundle.
 *  2. Each fragment must then be in the BUNDLE. If it is not, the bundler
 *     removed a guard the product claims to have.
 *
 * A fragment is a static piece of the message, so a template literal is listed
 * as the parts around its holes.
 *
 * Run by `npm run build`, so it cannot be skipped by anything that builds,
 * including `npm run package`.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = join(repoRoot, 'out', 'main', 'index.js');

/**
 * The refusals that must reach the shipped artifact.
 *
 * Every one of these has a cost attached if it silently disappears: adopting a
 * session that is not ours, rebuilding over the live manifest, ending the
 * operator's tmux server, attaching across a tmux version pair nobody tested,
 * keeping a copy that was never verified, or publishing bytes that were never
 * read back.
 */
const REFUSALS = [
  {
    id: 'tmux.kill-server-on-real-socket',
    // PHASE 69 moved the declaration to ./resolve.ts and changed nothing about it.
    // It had to leave the supervisor so the exec plane could ask it for a machine
    // as well as for this Mac without the two files importing each other, and the
    // question is now asked the same way for both: a kill-server aimed at socket
    // gmux is refused whichever machine it is aimed at.
    source: 'src/main/tmux/resolve.ts',
    why: 'the refusal that stands between any caller and the operator sessions',
    fragments: [
      'Tortie does not end the session server.',
      'it would end every ',
      'Move the harness to its own socket with '
    ]
  },
  {
    id: 'tmux.untested-version-pair',
    source: 'src/main/tmux/version.ts',
    why:
      'a tmux server outlives the app that made it, and attaching across a ' +
      'version pair nobody tested can HANG rather than fail: measured, a ' +
      '3.7b control client against a 3.5a server printed "%exit" and was ' +
      'still running 8 s later. Without this branch the product attaches ' +
      'anyway and the user sees Tortie freeze on live sessions',
    fragments: [
      'has not tested that pair',
      'will not attach',
      'It will not attach to a server it cannot identify.'
    ]
  },
  {
    id: 'tmux.packaged-binary-override-ignored',
    source: 'src/main/tmux/resolve.ts',
    why:
      'a packaged Tortie runs the tmux inside its own signed bundle and ' +
      'nothing else. If this branch goes, an environment variable decides ' +
      'which tmux holds every session on the machine, and that binary is one ' +
      'nobody signed and nobody tested',
    fragments: [
      'is ignored in a packaged Tortie',
      'always uses the copy of tmux inside its own bundle'
    ]
  },
  {
    id: 'harness.root-unset',
    source: 'src/main/harness/isolation.ts',
    why: 'a harness with no isolated root must not run at all',
    fragments: [' is not set. Refusing to run.']
  },
  {
    id: 'harness.profile-outside-root',
    source: 'src/main/harness/isolation.ts',
    why: 'a harness must never run against the operator profile',
    fragments: ['userData ', ' is outside ', '. Refusing to run.']
  },
  {
    id: 'harness.socket-is-the-real-one',
    source: 'src/main/harness/isolation.ts',
    why: 'a harness must never run against socket gmux',
    fragments: [', the real one. Set GMUX_TMUX_SOCKET and try again.']
  },
  {
    id: 'harness.teardown-checks-socket-first',
    source: 'src/main/harness/isolation.ts',
    why: 'teardown resolves and checks the socket before it kills anything',
    fragments: ['not ending the tmux server: the socket is ']
  },
  {
    id: 'reconstruct.acknowledgement',
    source: 'src/main/manifest/reconstruct.ts',
    why: 'reconstruction runs only on an explicit human decision',
    fragments: [
      'Reconstruction needs an explicit decision. Pass ',
      'RECONSTRUCTION_ACKNOWLEDGEMENT exactly.'
    ]
  },
  {
    id: 'reconstruct.decided-by',
    source: 'src/main/manifest/reconstruct.ts',
    why: 'the report has to record who decided',
    fragments: ['Reconstruction needs the name of who decided.']
  },
  {
    id: 'reconstruct.plan-token',
    source: 'src/main/manifest/reconstruct.ts',
    why: 'a plan cannot be synthesised, and cannot be applied twice',
    fragments: ['This plan did not come from surveyReconstruction in this process, or ']
  },
  {
    id: 'reconstruct.never-the-live-directory',
    source: 'src/main/manifest/reconstruct.ts',
    why: 'a rebuild never lands on the live manifest',
    fragments: ['Refusing to write the rebuild into the live manifest']
  },
  {
    id: 'reconstruct.never-overwrite',
    source: 'src/main/manifest/reconstruct.ts',
    why: 'a rebuild never overwrites an earlier rebuild',
    fragments: ['A manifest is already at ', 'Refusing to overwrite it.']
  },
  {
    id: 'reconstruct.nothing-included',
    source: 'src/main/manifest/reconstruct.ts',
    why: 'an empty decision set writes no file at all',
    fragments: ['No candidate was included, so there is nothing to reconstruct.']
  },
  {
    id: 'ring.body-too-large',
    source: 'src/main/manifest/recovery.ts',
    why: 'the ring refuses a body it cannot hold',
    fragments: ['and the ring refuses bodies ']
  },
  {
    id: 'ring.prune-keeps-a-verified-generation',
    source: 'src/main/manifest/recovery.ts',
    why: 'pruning can never leave the ring with no verified predecessor',
    fragments: ['the survivor set held no verified generation, so nothing was removed']
  },
  {
    id: 'restore.never-over-an-existing-database',
    source: 'src/main/manifest/recovery.ts',
    why: 'restoring never writes over a database that is already there',
    fragments: [
      ' already exists. Nothing was written. Move the ',
      'existing database aside first, and never delete it.'
    ]
  },
  {
    id: 'restore.no-generation-proved-out',
    source: 'src/main/manifest/recovery.ts',
    why: 'an unverified generation is never restored',
    fragments: ['proved out, so nothing was restored']
  },
  {
    id: 'durable.read-back-size',
    source: 'src/main/durable/write.ts',
    why: 'a durable write is published only after its bytes are read back',
    fragments: [' read back as ', ' and should be ']
  },
  {
    id: 'durable.read-back-hash',
    source: 'src/main/durable/write.ts',
    why: 'a durable write is published only after its hash matches',
    fragments: [' read back with sha256 ']
  },
  {
    id: 'schema.refuse-a-file-that-is-too-new',
    source: 'src/main/db/schema-version.ts',
    why:
      'an older build must refuse a newer manifest rather than write NULLs ' +
      'into a column the restore path reads',
    fragments: [
      'This copy of Tortie is older than your ',
      'are safe and they are still running. This copy understands format ',
      ' or newer. Open the newer Tortie '
    ]
  },
  {
    id: 'schema.refuse-another-application-database',
    source: 'src/main/db/schema-version.ts',
    why: 'a wrong file is refused rather than migrated, which cannot be undone',
    fragments: [' is not a Tortie ', 'It carries ', 'application id ']
  },
  {
    id: 'schema.the-screen-that-says-the-refusal',
    source: 'src/main/manifest/refusal.ts',
    why:
      'a refusal the user is never shown is a refusal that reads to them as ' +
      'their sessions being gone',
    fragments: [
      'This copy of Tortie is older than your session list.',
      'Your sessions are safe and they are still running.',
      'Open the newer Tortie to see your sessions again.',
      'Reveal Data Folder'
    ]
  },
  {
    id: 'schema.version-matches-the-migration-count',
    source: 'src/main/manifest/schema.ts',
    why:
      'a manifest that lies about which schema it is at is a manifest the ' +
      'refusal cannot protect',
    fragments: [
      'MANIFEST_SCHEMA_VERSION is ',
      ' migrations. They are the same number. '
    ]
  },
  // PHASE 72 DELETED `manifest.machine-id-nonlocal` FROM THIS LIST, and the
  // deletion is recorded here rather than left as a shorter array.
  //
  // Phase 71 added it because migration 013 left MANIFEST_MIN_COMPATIBLE_VERSION
  // at 8, so a build at schema 12 could still open and write the manifest and
  // would read every row as a session on this Mac. The refusal declined to write
  // any machine id other than `local`, which kept that reading true.
  //
  // Phase 72 is the build that records a real machine id. It moved the minimum
  // from 8 to 13 in the same commit, so an older build is now refused at the
  // OPEN rather than relying on this build to decline a write. The number does
  // the work the sentence was standing in for, and it does it in the one place
  // that protects a manifest from a build that has already shipped.
  // `schema.version-matches-the-migration-count` above still pins the assertion
  // that keeps the number honest.
];

/**
 * Phase 22's skills refusals, counted SEPARATELY from the 23 above.
 *
 * They belong in this artifact for the same reason: a refusal that the bundler
 * removed is a refusal the product only claims to have. They are not folded into
 * `REFUSALS` because that number is quoted in the phase records as the count of
 * DURABILITY refusals, being the ones whose loss costs a user their sessions or
 * their manifest. These cost something different. A skills refusal that vanishes
 * lets a write discard the user's update pins, run a command whose arguments the
 * CLI silently drops, or spawn a command line that is not the one a person read
 * and agreed to. That is worth its own line in the log rather than a bigger
 * number on the old one.
 */
const SKILLS_REFUSALS = [
  {
    id: 'skills.lock-unreadable',
    source: 'src/main/skills/lock.ts',
    why:
      'a lock file the CLI cannot parse is one it OVERWRITES, and the write ' +
      'has to stop before that rather than report success afterwards',
    fragments: ['could not be read as a skills lock file']
  },
  {
    id: 'skills.lock-would-lose-pins',
    source: 'src/main/skills/lock.ts',
    why:
      'a CLI that writes an older lock version discards the entries it does ' +
      'not understand, and those entries are the pins update depends on',
    fragments: ['drop the update pins for ']
  },
  {
    id: 'skills.single-agent-becomes-a-copy',
    source: 'src/main/skills/commands.ts',
    why:
      'an add with exactly one target switches the CLI from a symlink to a ' +
      'full copy and the re-add afterwards is a silent no-op that reports ' +
      'success, so there is no such thing as enabling a skill for one agent',
    fragments: ['full copy instead of a symlink']
  },
  {
    id: 'skills.equals-form-is-discarded',
    source: 'src/main/skills/commands.ts',
    why:
      'the parser matches exact flag tokens, so --skill=foo matches nothing, ' +
      'is dropped, and the command runs with a wider meaning and exits 0',
    fragments: ['which the CLI discards silently']
  },
  {
    id: 'skills.plan-changed-after-the-confirm',
    source: 'src/main/skills/run.ts',
    why:
      'the confirm is only worth anything if the command that runs is the ' +
      'command that was read, and a confirm sits on screen while a person ' +
      'reads it',
    fragments: ['the command changed after it was shown']
  },
  {
    id: 'skills.remove-left-the-skill-on-disk',
    source: 'src/main/skills/run.ts',
    why:
      'the pinned CLI exits 0 when a remove matches nothing, so a remove that ' +
      'leaves the folder on disk would close the dialog as if it worked; the ' +
      'post-run disk check is what turns that silent no-op into a visible failure',
    fragments: ['is still on disk at ', 'does not treat this as removed']
  }
];

/**
 * Phase 23's confirm-gate refusals, counted SEPARATELY again, for the same
 * reason the skills ones are.
 *
 * What these cost if the bundler removes one is different from both lists
 * above. A configuration file can name a program, and Tortie runs it as the
 * user, with the user's files and the user's credentials. Every product that is
 * cited as precedent for trusting a configuration file has a human as the only
 * routine writer of it. Tortie does not: it runs many agent processes at once
 * under one account, several of them deliberately launchable with their
 * safeguards off, and all of them can write to the home directory. If one of
 * these four sentences disappears, a file an agent can write decides which
 * program starts, and the confirmation a person gave becomes a formality.
 */
const CONFIG_REFUSALS = [
  {
    id: 'config.row-nobody-confirmed',
    source: 'src/main/config/confirm.ts',
    why: 'a configured row that no person has agreed to must not start a process',
    fragments: [
      'Tortie will not start ',
      ' from a configuration file that nobody has ',
      'confirmed. Read what it will run and confirm it in Tortie first. '
    ]
  },
  {
    id: 'config.row-changed-since-the-confirmation',
    source: 'src/main/config/confirm.ts',
    why:
      'without this the first confirmation is a permanent key and the argv ' +
      'behind it can be swapped afterwards',
    fragments: [
      ', because its configuration changed after you ',
      'confirmed it. Read the change and confirm it again if it is what you '
    ]
  },
  {
    id: 'config.seal-unreadable',
    source: 'src/main/config/confirm.ts',
    why:
      'a record of what a person approved that cannot be read is not consent, ' +
      'so the gate fails closed rather than open',
    fragments: [
      'Tortie could not read its record of what you confirmed, so it will not ',
      'start '
    ]
  },
  {
    id: 'config.change-never-starts-anything',
    source: 'src/main/config/confirm.ts',
    why:
      'reading configuration must never be a way to start a process, because ' +
      'a file changing is not a person deciding',
    fragments: [
      'A configuration change never starts anything on its own. Reading ',
      'from the configuration file asked to launch it. Nothing was started.'
    ]
  },
  {
    id: 'config.confirmed-by-a-person-not-a-file',
    source: 'src/main/config/confirm.ts',
    why:
      'the acknowledgement sentence is what stops a later convenience path ' +
      'from confirming rows on the user behalf',
    fragments: [
      'A configuration row is confirmed by a person, not by a file. Pass ',
      'CONFIG_CONFIRM_ACKNOWLEDGEMENT exactly. Nothing was confirmed.'
    ]
  },
  {
    id: 'config.row-changed-while-the-sheet-was-open',
    source: 'src/main/config/confirm.ts',
    why:
      'a confirmation is only worth anything if the row that is recorded is ' +
      'the row that was read, and a sheet sits on screen while a person reads',
    fragments: [
      ', because the row changed after it was ',
      'shown. Read it again and confirm what it says now. Nothing was '
    ]
  }
];

/**
 * Phase 68's machine confirm-gate refusals, counted SEPARATELY again, for the
 * same reason the config ones are.
 *
 * What these cost if the bundler removes one is larger than any list above,
 * because the thing on the other side is a different computer. A machine row
 * names an address, an account and a program path, and Tortie signs in there as
 * the user with the user's files and the user's credentials. The same argument
 * that made the config gate necessary makes this one necessary and then some:
 * Tortie runs many agent processes at once under one account, several of them
 * deliberately launchable with their safeguards off, and all of them can write
 * to the home directory. If one of these sentences disappears, a file an
 * agent can write decides which computer Tortie reaches, and the confirmation a
 * person gave becomes a formality.
 *
 * PHASE 70 raised the count from ten to twelve, and the two it added are about
 * the sessions rather than the gate: one refused a restore Tortie could not do,
 * and one refuses a command aimed at a session no list from that machine
 * reported.
 *
 * PHASE 79.1 PUT SEVEN IN, so the count is twenty three. Six of them are the
 * sentences the key channel refuses with, and the seventh is the one that stops
 * a string that is not a public key from reaching another machine's shell. That
 * last one is the one this file exists for: `assertPublicKeyLine` has two call
 * sites in one module and both pass the same value, which is the shape rollup
 * proves through and deletes. The fix round added these rows because the phase's
 * own specification asked for them and no builder owned this file, so the gate's
 * count stayed at sixteen while seven new refusals shipped unpinned.
 *
 * PHASE 72 TOOK ONE OUT AND PUT FOUR IN, so the count was sixteen. The one that
 * left is `machine.restore-refused`, whose sentence said that bringing a session
 * back on another machine was coming in a later release. This is that release,
 * so the sentence became false. The four that arrived are the restore gate's own
 * sentences, one per condition that can fail, and losing any of them costs more
 * than losing anything else on this page: two agents writing to one conversation
 * on a machine nobody is watching.
 *
 * They are not folded into CONFIG_REFUSALS because that number is quoted in the
 * Phase 23 records as the count of the configured-agent gate's refusals, and
 * these are a second gate over a second file with its own hash and its own key
 * space in the shared record.
 */
const MACHINE_REFUSALS = [
  {
    id: 'machine.never-confirmed',
    source: 'src/main/machines/confirm.ts',
    why: 'a machine no person has agreed to must not be signed in to',
    fragments: [
      'Tortie will not connect to ',
      ', because nobody has confirmed it. Read ',
      'what it will run and confirm it in Tortie first. Nothing was started.'
    ]
  },
  {
    id: 'machine.changed',
    source: 'src/main/machines/confirm.ts',
    why:
      'without this the first confirmation is a permanent key and the address ' +
      'behind it can be swapped afterwards',
    fragments: [
      ', because its details changed after you ',
      'confirmed them. Read the change and confirm it again if it is what you '
    ]
  },
  {
    id: 'machine.seal-unreadable',
    source: 'src/main/machines/confirm.ts',
    why:
      'a record of what a person approved that cannot be read is not consent, ' +
      'so the gate fails closed rather than open',
    fragments: [
      'Tortie could not read its record of what you confirmed, so it will not ',
      'connect to '
    ]
  },
  {
    id: 'machine.read-never-connects',
    source: 'src/main/machines/confirm.ts',
    why:
      'reading the machines file must never be a way to reach another ' +
      'computer, because a file changing is not a person deciding',
    fragments: [
      'A configuration change never starts anything on its own. Reading ',
      'from the machines file asked to connect to it. Nothing was started.'
    ]
  },
  {
    id: 'machine.acknowledgement',
    source: 'src/main/machines/confirm.ts',
    why:
      'the acknowledgement sentence is what stops a later convenience path ' +
      'from confirming machines on the user behalf',
    fragments: [
      'A machine is confirmed by a person, not by a file. Pass ',
      'MACHINE_CONFIRM_ACKNOWLEDGEMENT exactly. Nothing was confirmed.'
    ]
  },
  {
    id: 'machine.hash-moved',
    source: 'src/main/machines/confirm.ts',
    why:
      'a confirmation is only worth anything if the machine that is recorded ' +
      'is the machine that was read, and a sheet sits on screen while a person ' +
      'reads it',
    fragments: [
      ', because the machine changed after it was ',
      'shown. Read it again and confirm what it says now. Nothing was '
    ]
  },
  // ---------------------------------------------------------------------------
  // Phase 69 added these four, and two of them CANNOT BE REACHED in production
  // ---------------------------------------------------------------------------
  //
  // That is the exact case this whole file exists for. There is no `unsafe` row on
  // the verb ledger and there is no mutating verb, so nothing a person can do
  // makes either branch run, and rollup deletes a branch whose condition it can
  // prove. `src/main/machines/exec-smoke.ts` is the second caller, and it drives
  // both with a synthetic ledger row built at runtime, so each one is watched
  // firing rather than assumed to exist.
  {
    id: 'machine.verb-not-in-ledger',
    source: 'src/main/machines/exec-plane.ts',
    why:
      'a machine can sleep or drop after it ran a command and before the reply ' +
      'arrives, so only a command written down as safe to run twice may cross ' +
      'to one. This refusal is also what keeps new-session, kill-session, ' +
      'rename-session, attach-session, send-keys and respawn-pane out of this ' +
      'release in code rather than in prose',
    fragments: [
      'Tortie will not send that command to another machine. Only commands Tortie ',
      'has written down as safe to run twice may cross to a machine, and this one ',
      'is not on that list. Nothing was sent.'
    ]
  },
  {
    id: 'machine.repeat-unsafe',
    source: 'src/main/machines/exec-plane.ts',
    why:
      'the class has no members in this release, so a bundler that folds it away ' +
      'costs nothing today and costs the refusal on the day the first unsafe ' +
      'verb is added',
    fragments: [
      'Tortie will not send that command to another machine, because running it ',
      'twice could leave two of something and Tortie cannot yet tell one from the ',
      'other. Nothing was sent.'
    ]
  },
  {
    id: 'machine.path-before-mutation',
    source: 'src/main/machines/exec-plane.ts',
    why:
      'a pane takes its program search list from the client that created it, and ' +
      'a command over a connection runs a non login shell, so starting work ' +
      'before that list is read runs the wrong copy of a program or none at all',
    fragments: [
      'Tortie will not start work on a machine before it has read the list of ',
      'places that machine looks for programs. Without that list the wrong copy of ',
      'a program can run, or none at all. Nothing was started.'
    ]
  },
  // ---------------------------------------------------------------------------
  // Phase 70 added these two, and both stand in front of a person's work
  // ---------------------------------------------------------------------------
  //
  // The first is what stops Tortie promising a restore it cannot do. The second
  // is what stops Tortie ending a session on somebody else's machine. Neither is
  // reached often in production, which is exactly the case a bundler folds away
  // and exactly the case this file exists for.
  // `src/main/machines/remote-smoke.ts` is the second caller and it watches both
  // fire.
  // PHASE 72 RETIRED `machine.restore-refused`. Its sentence said that bringing
  // a session back on another machine was coming in a later release, and this is
  // that release, so the sentence became false and was deleted rather than
  // reworded. The four entries at the end of this list are what took its place,
  // one per condition the restore gate can fail. `machine.remote-target-unbound`
  // below is unchanged.
  {
    id: 'machine.remote-target-unbound',
    source: 'src/main/machines/remote-copy.ts',
    why:
      'a kill or a rename is composed only against an identifier a completed ' +
      'list from that machine reported. Without this refusal a session name ' +
      'that happens to match would be enough to end work on a machine Tortie ' +
      'never read that session from',
    fragments: [
      'Tortie will not send that command, because it has not seen this session in ',
      'a list from that machine. Acting on a session it cannot account for is how ',
      'work on somebody else’s machine gets ended. Nothing was sent.'
    ]
  },
  // ---------------------------------------------------------------------------
  // Phase 71 added this one, and it is the fails closed rung of the ladder
  // ---------------------------------------------------------------------------
  //
  // Control mode is a different wire protocol from one-shot verbs, so a version
  // measured on the exec plane says nothing about this one.
  // `build/probe-control-dialect.mjs` measured 3.6a and 3.7b and both matched,
  // so the branch this sentence lives on has no member in production today. That
  // is exactly the case a bundler folds away, and exactly the case this file
  // exists for.
  {
    id: 'machine.control-dialect-unmeasured',
    source: 'src/main/machines/control-plane.ts',
    why:
      'an untested wire pair hangs rather than errors, which is measured at the ' +
      'top of src/main/tmux/version.ts, and a hang reads to a person as Tortie ' +
      'freezing on work they care about. Without this refusal an unmeasured ' +
      'version would get a live connection instead of the timer feed that works',
    fragments: [
      'Tortie has not measured how this machine speaks over a live connection, so ',
      'it asks the machine for its list on a timer instead. Nothing was changed on ',
      'either machine.'
    ]
  },
  {
    id: 'machine.control-path-too-long',
    source: 'src/main/machines/ssh.ts',
    why:
      'a unix socket path is limited to 104 bytes and the failure otherwise ' +
      'lands when the client tries to connect, where it reads as the machine ' +
      'being broken rather than as a limit of this system',
    fragments: [
      'Tortie could not compose a short enough name for the connection it keeps ',
      'open to this machine. This is a limit of this system rather than a problem ',
      'with the machine. Nothing was started.'
    ]
  },
  // ---------------------------------------------------------------------------
  // Phase 72 added these four, and they are the restore gate's own sentences
  // ---------------------------------------------------------------------------
  //
  // Restore for a session on another machine ships ENABLED behind six conditions
  // that all have to hold at once. Each of these is the sentence for one of the
  // conditions that can fail, and the cost of losing one is the largest on this
  // page: a person presses Restore, Tortie brings back a session that never
  // stopped running, and two agents write to one conversation on a machine
  // nobody is watching. There is no undo for that.
  //
  // Three of the four are reached rarely in ordinary use, which is exactly the
  // branch a bundler folds away. `src/main/machines/remote-smoke.ts` is the
  // second caller and it watches each one fire.
  {
    id: 'machine.restore-unseen',
    source: 'src/main/machines/remote-copy.ts',
    why:
      'a link that dropped says nothing about what is running on the other ' +
      'side, and reading it as a death is what offers Restore over an agent ' +
      'that is still working',
    fragments: [
      'Tortie cannot see that machine right now, so it will not try to bring this ',
      'session back. Bringing a session back while the machine is out of sight can ',
      'start a second agent on the same conversation. Nothing was started.'
    ]
  },
  {
    id: 'machine.restore-wrong-machine',
    source: 'src/main/machines/remote-copy.ts',
    why:
      'the program path on a remote row was read on ONE machine with that ' +
      "machine's own search list, so using it anywhere else starts the wrong " +
      'program or none at all',
    fragments: [
      'This session was created on a different machine. The program path Tortie ',
      'recorded for it only means something there, so Tortie will not use it here. ',
      'Nothing was started.'
    ]
  },
  {
    id: 'machine.restore-forgotten',
    source: 'src/main/machines/remote-copy.ts',
    why:
      'a row for a machine a person removed survives as a record of what ' +
      'Tortie last knew, and a record is not a route back to the machine',
    fragments: [
      'You removed this machine from Tortie. This row is a record of what Tortie ',
      'last knew about the session, and Tortie can no longer reach the machine to ',
      'bring it back. Nothing was started.'
    ]
  },
  {
    id: 'machine.resume-not-collected',
    source: 'src/main/machines/remote-copy.ts',
    why:
      'a restore on another machine brings the session back and not the ' +
      'conversation, and a person who is not told that discovers it in an ' +
      'empty pane instead',
    fragments: [
      'Tortie has no conversation id for this session, because it does not read an ',
      "agent's own files on another machine yet. The session comes back with its ",
      'folder and its program. The conversation does not come back.'
    ]
  },
  // ---------------------------------------------------------------------------
  // Phase 79.1 added these seven. The channel makes a key and puts it on another
  // computer, so every one of them stands between a person's agreement and a
  // credential being installed somewhere.
  // ---------------------------------------------------------------------------
  {
    id: 'machine.key-stale',
    source: 'src/main/machines/key-install.ts',
    why:
      'the block sits on screen while a person reads it, and a key must be ' +
      'installed on the machine they read about rather than on whatever the ' +
      'row says by the time they press the button',
    fragments: [
      'Tortie did not set up a key, because the machine changed after it was ',
      'shown. Read what it says now and agree to that. Nothing was sent to the '
    ]
  },
  {
    id: 'machine.key-no-id',
    source: 'src/main/machines/key-install.ts',
    why:
      'the machine name is part of what is hashed and it is what tells one ' +
      "machine's key from another's, so a key with no machine behind it is a " +
      'credential nobody agreed to',
    fragments: [
      'Name this machine before Tortie makes a key for it. The name is part of ',
      "what you are agreeing to, and it is what tells one machine's key from "
    ]
  },
  {
    id: 'machine.key-keygen-missing',
    source: 'src/main/machines/key-install.ts',
    why:
      'without this sentence a Mac with no key program would fail somewhere ' +
      'later and the person would not know that nothing was ever sent',
    fragments: [
      'Tortie could not find the program macOS uses to make a key, at ',
      '/usr/bin/ssh-keygen. That program ships with macOS, so a missing one means '
    ]
  },
  {
    id: 'machine.key-password-refused',
    source: 'src/main/machines/key-install.ts',
    why:
      'a wrong password must end the attempt in words rather than in a silent ' +
      'retry, and the person has to be told that nothing was added and that ' +
      'no copy of what they typed was kept',
    fragments: [
      'That machine did not accept the password. Tortie stopped there and did not ',
      'try again. Nothing was added to that machine, and Tortie kept no copy of '
    ]
  },
  {
    id: 'machine.key-unknown-machine',
    source: 'src/main/machines/key-install.ts',
    why:
      "a password may never be typed at a machine whose identity nobody has " +
      'answered for, because the machine on the other end may not be the one ' +
      'the person means',
    fragments: [
      'Tortie has not met this machine yet, so it will not send a password to it. ',
      "Test the connection first. That is where you read the machine's "
    ]
  },
  {
    id: 'machine.key-not-written',
    source: 'src/main/machines/key-install.ts',
    why:
      'a sign in that worked and a key that was added are two different ' +
      'things, and reporting the first as the second would leave a person ' +
      'believing a machine is ready when it is not',
    fragments: [
      'Tortie signed in to that machine and the machine did not report that the ',
      'key was added. Nothing about this Mac changed. Read the lines above for '
    ]
  },
  {
    id: 'machine.key-not-a-public-key',
    source: 'src/main/machines/key-install.ts',
    why:
      'this is the one that keeps a string that is not a public key out of ' +
      "another computer's shell, and its two call sites are in one module and " +
      'both pass the same value, which is exactly the shape a bundler proves ' +
      'through and deletes',
    fragments: [
      'Tortie will not send that to another machine, because what it was given ',
      'is not one public key line. Nothing was sent.'
    ]
  }
];

/**
 * Phase 24's updater refusals, counted SEPARATELY again.
 *
 * What these cost if the bundler removes one is different from every list
 * above. The updater is the one subsystem that replaces the application on a
 * machine holding live work. The first refusal is the feed override gate: a
 * rehearsal can point the updater at a local feed, and the gate is what stops
 * a stray TORTIE_UPDATE_FEED variable from redirecting a production launch's
 * checks. Squirrel would still refuse foreign bytes at install time, so what
 * the gate protects is narrower and still worth having: where the check
 * itself goes. The second is the post update self check's one log line, a
 * failure the update flow may raise above the surface. If the bundler drops
 * it, a bundle swap that lost the tmux config degrades every session's
 * scrollback and nothing anywhere says so.
 *
 * Phase 31 added the third and the fourth, after the operator's first live
 * update installed nothing and said nothing. The third is the ready
 * promise sentence: a user who was told "downloading" must later be told
 * "ready", or the quit promise is a guess, because the download event and
 * the staged event are seconds apart and only the second one is true.
 * Phase 58 removed the ready dialog and moved that promise into the update
 * ring's ready hover, which is renderer code, so that one entry scans the
 * renderer asset bundles instead of out/main/index.js. The
 * fourth is the refusal sentence: an install the OS updater refused must be
 * said out loud once with its reason, or it reads to the user as an update
 * that never existed.
 *
 * Phase 43 added the fifth through the eighth, after the operator's machine
 * reached a state on 2026-08-15 where no update could ever install again.
 * The diagnosis is docs/research/46-updater-wreckage.md.
 *
 * The fifth is the cause. Every check that runs after a download has
 * finished re-stages the update, and every Squirrel staging deletes the
 * staged bundle the pending install is waiting on. If the bundler removes
 * that guard, the product makes the wreck again and the recovery below is a
 * mop under a running tap.
 *
 * The sixth is the recovery's own refusal. The verb deletes Squirrel's
 * staging directories, so a version of it that ran while a healthy update
 * sat staged would destroy an install that was about to succeed. That
 * sentence is the whole difference between a repair and a defect.
 *
 * The seventh and the eighth are what the user is told. Without them the two
 * new failure shapes are silent, which is exactly the condition that made
 * this phase necessary. The eighth also carries the attempt count, and the
 * count is read out of the log rather than assumed, because the limit of 3
 * is Squirrel's number and not one this codebase owns.
 */
const UPDATER_REFUSALS = [
  {
    id: 'updater.feed-override-refused',
    source: 'src/main/updates/updater.ts',
    why:
      'a stray environment variable must never redirect where a production ' +
      'launch checks for updates',
    fragments: [
      'TORTIE_UPDATE_FEED is set, but this launch is not a confirmed rehearsal, so the override is ignored.',
      'The update feed stays the release feed.'
    ]
  },
  {
    id: 'updater.self-check-missing-resources',
    source: 'src/main/updates/self-check.ts',
    why:
      'a bundle swap that lost a resource must be said out loud once, or it ' +
      'reads as every downstream feature quietly breaking',
    fragments: ['the update left resources missing: ']
  },
  {
    id: 'updater.ready-ring-promise',
    source: 'src/renderer/app/update-words.ts',
    // Phase 58 moved the ready promise from the ready dialog (removed) into
    // the ring's ready hover, which is RENDERER code, so this entry scans
    // the renderer asset bundles rather than out/main/index.js. Phase 62.1
    // moved the words into update-words.ts, shared by the ring's hover and
    // the home screen line, so the source path follows them.
    bundle: 'renderer',
    why:
      'a user who was told downloading must be told ready, or the quit ' +
      'promise is a guess',
    fragments: [' is ready. It installs when you quit.']
  },
  {
    id: 'updater.refused-install-says-why',
    source: 'src/main/updates/ui.ts',
    why:
      'an install Squirrel refused must be said out loud once with its ' +
      'reason, or it reads as an update that never existed',
    fragments: [
      'The update to ',
      ' did not install because another copy of Tortie was running. It installs the next time you quit.'
    ]
  },
  {
    id: 'updater.no-second-staging',
    source: 'src/main/updates/updater.ts',
    why:
      'a second staging in the same run deletes the copy the pending ' +
      'install is waiting on, which is how the operator reached a state ' +
      'where no update could install at all',
    fragments: [
      'Tortie is not checking for updates again, because it already handed an update to the installer in this run.',
      'A second check would delete the copy the installer is waiting on.'
    ]
  },
  {
    id: 'updater.repair-never-touches-a-ready-update',
    source: 'src/main/updates/recovery.ts',
    why:
      'the recovery deletes staging directories, so a run of it against a ' +
      'healthy staged update would destroy an install that was about to work',
    fragments: [
      'Tortie is not clearing the updater state, because the update it prepared is still on disk and ready to install.'
    ]
  },
  {
    id: 'updater.staged-bundle-missing-says-why',
    source: 'src/main/updates/ui.ts',
    why:
      'an install that failed because the prepared copy was gone must be ' +
      'said out loud, or it reads as an update that never existed',
    fragments: [
      'Tortie had prepared a copy of the new version, and that copy was gone from disk when the installer ran.'
    ]
  },
  {
    id: 'updater.too-many-attempts-says-why',
    source: 'src/main/updates/ui.ts',
    why:
      'once the installer has saved that it gave up, no later install can ' +
      'succeed until it is cleared, and the number of tries is read from ' +
      'the log rather than assumed',
    fragments: ['The installer tried ', ' times and then saved that it had given up.']
  }
];

/**
 * PHASE 35 — crash dumps never leave the machine.
 *
 * Research 42's lab read a live CLAUDE_CODE_MESSAGING_TOKEN value out of a
 * minidump's environment block, so research 37's refusal of transmission is
 * confirmed by bytes rather than by reasoning. `uploadToServer: false` is
 * the one line that keeps every dump local, and it is a plain object
 * property passed to an Electron API. That makes it exactly the shape the
 * bundler is free to reshape, so it is pinned in the artifact here.
 *
 * The second direction, `assertNoUpload` below, is the one this table cannot
 * express: the literal `uploadToServer: true` must appear NOWHERE in src/.
 * A later edit that flips it fails the build rather than shipping.
 */
const LOG_REFUSALS = [
  {
    id: 'log.crash-dumps-stay-local',
    source: 'src/main/log/crash.ts',
    why:
      'a minidump embeds the process environment block, including live ' +
      'token values, so no dump may ever be uploaded',
    fragments: ['uploadToServer: false']
  }
];

/** The literal that must never exist in src/. */
const UPLOAD_ENABLED_LITERALS = ['uploadToServer: true', 'uploadToServer:true'];

/** Every .ts/.tsx/.mjs under src/, so the scan misses nothing. */
function collectSourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(path, out);
    else if (/\.(tsx?|mjs|cjs|js)$/.test(entry.name)) out.push(path);
  }
  return out;
}

function assertNoUpload() {
  const offenders = [];
  for (const file of collectSourceFiles(join(repoRoot, 'src'))) {
    const text = readFileSync(file, 'utf8');
    for (const literal of UPLOAD_ENABLED_LITERALS) {
      if (text.includes(literal)) {
        offenders.push(`${file.slice(repoRoot.length + 1)} contains ${JSON.stringify(literal)}`);
      }
    }
  }
  if (offenders.length > 0) {
    console.error(
      '[refusals] crash dump upload was switched on. research 42 §13 refuses ' +
        'this permanently, and research 42 §6 read a live token value out of a ' +
        'minidump to show why. uploadToServer stays false.'
    );
    for (const line of offenders) console.error(`  ${line}`);
    process.exit(1);
  }
  console.log(
    '[refusals] no source file enables crash dump upload; dumps stay local.'
  );
}

/**
 * PHASE 23 FIX ROUND — a gate is not a gate if nobody can pass it.
 *
 * ## The defect that made this check exist
 *
 * Main registered `config:rows`, `config:confirm` and `config:forget`, and all
 * three were live in the running app. Nothing exposed them. The preload had no
 * `config` member, so `window.gmux.config` was `undefined`, and there was no
 * renderer surface at all. `grep -c "config:rows" out/preload/index.js`
 * returned 0.
 *
 * The consequence was that every configured row was stuck at "never confirmed"
 * for ever and every create of one was refused. The only way to confirm a row
 * on the whole machine was to attach a Node inspector to main and call the
 * handler by hand. The phase's stated deliverable could not be used.
 *
 * Nothing in the unit tests could see this. Vitest runs the source, and each
 * half was correct on its own. What was missing was the join between them, and
 * a join only exists in the shipped artifacts.
 *
 * ## What this checks
 *
 * For every channel: the string is in the MAIN bundle, so a handler exists, and
 * the string is in the PRELOAD bundle, so a renderer can reach it. Then one
 * piece of copy from the confirm surface must be in a renderer bundle, so the
 * button a person presses is actually shipped.
 *
 * The renderer bundles are searched by content rather than by name because the
 * settings window's chunk carries a content hash.
 */
const REACHABLE_CHANNELS = [
  {
    channel: 'config:rows',
    why: 'the list of configured rows, and the errors for rows Tortie dropped'
  },
  {
    channel: 'config:confirm',
    why: 'the one place a person can agree to what a configured row will run'
  },
  {
    channel: 'config:forget',
    why: 'withdrawing an agreement, so the row asks again'
  },
  // Phase 68. Three of the ten machines channels, chosen because they are the
  // three a person cannot get past without: the list they read, the agreement
  // they give, and the one visible test that produces the program path the
  // agreement is bound to. A build where any of them stops at the preload has a
  // Machines section nobody can use, which is the exact defect this check was
  // written for.
  {
    channel: 'machines:rows',
    why: 'the list of machines, and the errors for rows Tortie dropped'
  },
  {
    channel: 'machines:add',
    why: 'the one place a person can add a machine and agree to what it runs'
  },
  {
    channel: 'machines:test',
    why: 'the one visible connection test, which is where the program path comes from'
  }
];

/** Copy that only exists on the confirm surface. */
const CONFIRM_SURFACE_COPY = [
  'From your configuration file',
  'Show what it runs',
  // Phase 68. Two sentences that exist only on the Machines surface, and both
  // are the renderer's OWN copy rather than a string main sends. The honesty
  // line about the program's bytes is deliberately NOT here: it rides on
  // `MachinesResult.honesty` from main, so it never appears as a literal in a
  // renderer bundle and a check for it would fail on a build where the surface
  // is perfectly present.
  //
  // Phase 79 replaced the second sentence. It used to read "You cannot open a
  // session on a machine yet." Phase 70 shipped sessions on another machine,
  // so that sentence was false and Phase 79 deleted it from the renderer. The
  // sentence that took its place states the confirm rule itself, which is a
  // better thing for this check to anchor on: while it is in a renderer
  // bundle, the surface that asks a person to agree is reachable.
  'Tortie never adopts work that is already running on your machines',
  'Tortie will not sign in to a machine until you have read what it runs'
];

function assertReachable(bundle) {
  const preloadPath = join(repoRoot, 'out', 'preload', 'index.js');
  const rendererDir = join(repoRoot, 'out', 'renderer', 'assets');
  const problems = [];

  if (!existsSync(preloadPath)) {
    problems.push(`${preloadPath} is not there.`);
  } else {
    const preload = readFileSync(preloadPath, 'utf8');
    for (const { channel, why } of REACHABLE_CHANNELS) {
      if (!bundle.includes(channel)) {
        problems.push(`${channel} has no handler in out/main/index.js (${why}).`);
      }
      if (!preload.includes(channel)) {
        problems.push(
          `${channel} is registered in main and is NOT in out/preload/index.js, ` +
            `so no renderer can reach it (${why}).`
        );
      }
    }
  }

  if (!existsSync(rendererDir)) {
    problems.push(`${rendererDir} is not there.`);
  } else {
    const files = readdirSync(rendererDir)
      .filter((name) => name.endsWith('.js'))
      .map((name) => readFileSync(join(rendererDir, name), 'utf8'));
    for (const copy of CONFIRM_SURFACE_COPY) {
      if (!files.some((text) => text.includes(copy))) {
        problems.push(
          `no renderer bundle contains ${JSON.stringify(copy)}, so the confirm ` +
            `gate has no surface a person can use.`
        );
      }
    }
  }

  if (problems.length > 0) {
    console.error(
      '[reachable] a channel or a surface the product depends on did not reach ' +
        'the shipped artifacts. A gate nobody can pass is not a gate, it is a ' +
        'feature nobody can use.'
    );
    for (const line of problems) console.error(`  ${line}`);
    process.exit(1);
  }

  console.log(
    `[reachable] ${String(REACHABLE_CHANNELS.length)} config channels reach the ` +
      `preload, and the confirm surface is in the renderer.`
  );
}

/**
 * Every renderer asset bundle as one concatenated string (Phase 58). The
 * ring's ready promise is renderer code, so its shipped artifact is
 * out/renderer/assets rather than out/main/index.js. Searched by content
 * rather than by name because the chunks carry content hashes.
 */
function readRendererBundles() {
  const rendererDir = join(repoRoot, 'out', 'renderer', 'assets');
  if (!existsSync(rendererDir)) return null;
  return readdirSync(rendererDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => readFileSync(join(rendererDir, name), 'utf8'))
    .join('\n');
}

function main() {
  if (!existsSync(bundlePath)) {
    console.error(
      `[refusals] ${bundlePath} is not there. Run the build before this check.`
    );
    process.exit(1);
  }
  const bundle = readFileSync(bundlePath, 'utf8');
  const rendererBundle = readRendererBundles();
  const sources = new Map();
  const staleTable = [];
  const missingFromBundle = [];

  for (const refusal of [
    ...REFUSALS,
    ...SKILLS_REFUSALS,
    ...CONFIG_REFUSALS,
    ...MACHINE_REFUSALS,
    ...UPDATER_REFUSALS,
    ...LOG_REFUSALS
  ]) {
    const sourcePath = join(repoRoot, refusal.source);
    if (!sources.has(refusal.source)) {
      sources.set(
        refusal.source,
        existsSync(sourcePath) ? readFileSync(sourcePath, 'utf8') : null
      );
    }
    const source = sources.get(refusal.source);
    if (source === null) {
      staleTable.push(`${refusal.id}: ${refusal.source} does not exist`);
      continue;
    }
    const shipped = refusal.bundle === 'renderer' ? rendererBundle : bundle;
    if (shipped === null) {
      staleTable.push(
        `${refusal.id}: out/renderer/assets is not there. Run the build before this check.`
      );
      continue;
    }
    for (const fragment of refusal.fragments) {
      if (!source.includes(fragment)) {
        staleTable.push(`${refusal.id}: ${refusal.source} no longer contains ${JSON.stringify(fragment)}`);
        continue;
      }
      if (!shipped.includes(fragment)) {
        missingFromBundle.push({ refusal, fragment });
      }
    }
  }

  if (staleTable.length > 0) {
    console.error(
      '[refusals] this table is stale. A refusal was reworded or moved and ' +
        'build/assert-bundle-refusals.mjs was not updated with it, so it is no ' +
        'longer checking anything.'
    );
    for (const line of staleTable) console.error(`  ${line}`);
    process.exit(1);
  }

  if (missingFromBundle.length > 0) {
    console.error(
      '[refusals] the bundler removed a refusal that is present in the source.'
    );
    console.error(
      '  This is what happens when a guarded function has one call site the ' +
        'bundler can prove the argument of. Give it a second caller the bundler ' +
        'cannot see through, then run the build again.'
    );
    for (const { refusal, fragment } of missingFromBundle) {
      console.error(`  ${refusal.id}  (${refusal.source})`);
      console.error(`    why it exists: ${refusal.why}`);
      console.error(`    missing text : ${JSON.stringify(fragment)}`);
    }
    process.exit(1);
  }

  console.log(
    `[refusals] ${String(REFUSALS.length)} durability refusals are in out/main/index.js.`
  );
  console.log(
    `[refusals] ${String(SKILLS_REFUSALS.length)} skills-write refusals are in out/main/index.js.`
  );
  console.log(
    `[refusals] ${String(CONFIG_REFUSALS.length)} config confirm-gate refusals are in out/main/index.js.`
  );
  console.log(
    `[refusals] ${String(MACHINE_REFUSALS.length)} machine confirm-gate refusals are in out/main/index.js.`
  );
  console.log(
    `[refusals] ${String(UPDATER_REFUSALS.length)} updater refusals are in the shipped bundles (one, the ring's ready promise, is renderer code).`
  );
  console.log(
    `[refusals] ${String(LOG_REFUSALS.length)} crash-capture refusal is in out/main/index.js.`
  );

  assertNoUpload();
  assertReachable(bundle);
}

main();
