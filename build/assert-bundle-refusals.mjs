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
 * operator's tmux server, keeping a copy that was never verified, or publishing
 * bytes that were never read back.
 */
const REFUSALS = [
  {
    id: 'tmux.kill-server-on-real-socket',
    source: 'src/main/tmux/supervisor.ts',
    why: 'the refusal that stands between any caller and the operator sessions',
    fragments: [
      'Tortie does not end the session server.',
      'it would end every ',
      'Move the harness to its own socket with '
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
  }
];

/**
 * Phase 22's skills refusals, counted SEPARATELY from the 21 above.
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
 * update installed nothing and said nothing. The third is the ready dialog's
 * promise sentence: a user who was told "downloading" must later be told
 * "ready", or the quit promise is a guess, because the download event and
 * the staged event are seconds apart and only the second one is true. The
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
    id: 'updater.ready-after-user-check',
    source: 'src/main/updates/ui.ts',
    why:
      'a user who was told "downloading" must be told "ready", or the quit ' +
      'promise is a guess',
    fragments: [
      'It installs when you quit. To install it now, use the Tortie menu.'
    ]
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
  }
];

/** Copy that only exists on the confirm surface. */
const CONFIRM_SURFACE_COPY = [
  'From your configuration file',
  'Show what it runs'
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

function main() {
  if (!existsSync(bundlePath)) {
    console.error(
      `[refusals] ${bundlePath} is not there. Run the build before this check.`
    );
    process.exit(1);
  }
  const bundle = readFileSync(bundlePath, 'utf8');
  const sources = new Map();
  const staleTable = [];
  const missingFromBundle = [];

  for (const refusal of [
    ...REFUSALS,
    ...SKILLS_REFUSALS,
    ...CONFIG_REFUSALS,
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
    for (const fragment of refusal.fragments) {
      if (!source.includes(fragment)) {
        staleTable.push(`${refusal.id}: ${refusal.source} no longer contains ${JSON.stringify(fragment)}`);
        continue;
      }
      if (!bundle.includes(fragment)) {
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
    `[refusals] ${String(UPDATER_REFUSALS.length)} updater refusals are in out/main/index.js.`
  );
  console.log(
    `[refusals] ${String(LOG_REFUSALS.length)} crash-capture refusal is in out/main/index.js.`
  );

  assertNoUpload();
  assertReachable(bundle);
}

main();
