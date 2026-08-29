/**
 * `npm run conformance:installs` — the cheap gate on the install map
 * (Phase 49, research 47 §10).
 *
 * WHAT IT IS FOR. Every registry row carries an `AgentInstallInfo`: the
 * provider's own install command as a display string, the page it was read
 * from, the date it was read, and the path shapes that prove the canonical
 * route. Nothing in it is ever run. This gate is what keeps that promise
 * checkable instead of asserted, in about 1 second: it spawns no agent, opens
 * no manifest, makes no request and launches no Electron. The probe beside it
 * (`installs-conformance-probe.mts`) imports the one table and prints it.
 *
 * THE SIX RULES, each failure one sentence naming the row, the field and the
 * reason:
 *
 *  1. Every row carries `install`. Every launchable row has a non-null
 *     `canonical`, except the ids in CANONICAL_UNPUBLISHED, and every id in
 *     that set must carry a non-null `signature`. The gate fails when the set
 *     and the registry disagree in either direction.
 *  2. Every command is non-empty and never contains `sudo`. Tortie will not
 *     put `sudo` in front of a user even as a string.
 *  3. Every docUrl is https and its host is on that agent's pinned allowlist,
 *     held here. A bad edit cannot point a user at an unrelated domain.
 *  4. Every readOn parses as an ISO date and is not in the future.
 *  5. `canonicalIsPackageManager` agrees with the command's first word.
 *  6. Every signature path shape is bounded: `~/` roots, no `..` segment, and
 *     a sibling glob is a bare file pattern with no `/`.
 */

import { spawnSync } from 'node:child_process';
import { tsxCli } from './ts-runner.mjs';

/**
 * Launchable rows whose provider publishes NO install command. muse ships
 * with no command or it does not ship (research 47 §13); its launcher URL is
 * not a documented install command.
 */
const CANONICAL_UNPUBLISHED = ['muse'];

/**
 * The pinned host allowlist, per agent. A row whose docUrl moves off its
 * provider's own domain fails here until a person pins the new host on
 * purpose.
 */
const DOC_HOSTS = {
  claude: 'code.claude.com',
  codex: 'learn.chatgpt.com',
  cursor: 'cursor.com',
  gemini: 'geminicli.com',
  droid: 'docs.factory.ai',
  deepseek: 'github.com',
  antigravity: 'antigravity.google',
  qwen: 'github.com',
  pi: 'pi.dev',
  omp: 'omp.sh',
  grok: 'x.ai'
};

/** First words that mean "this route is a package manager". */
const PACKAGE_MANAGERS = [
  'npm', 'pnpm', 'yarn', 'bun', 'brew', 'cargo', 'pip', 'pipx',
  'port', 'winget', 'apt', 'apt-get', 'dnf', 'apk', 'conda'
];

const probe = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/installs-conformance-probe.mts'],
  { encoding: 'utf8', cwd: process.cwd() }
);

if (probe.status !== 0) {
  process.stderr.write(probe.stderr || 'the probe did not run\n');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(probe.stdout);
} catch {
  process.stderr.write(`the probe did not print JSON:\n${probe.stdout}\n`);
  process.exit(1);
}

const failures = [];
const fail = (message) => failures.push(message);

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const today = new Date().toISOString().slice(0, 10);

for (const row of data.rows) {
  // Rule 1 — presence, and the unpublished set in both directions.
  if (!row.hasInstall) {
    fail(`${row.id}: the row carries no install map at all.`);
    continue;
  }
  const unpublished = CANONICAL_UNPUBLISHED.includes(row.id);
  if (row.launchable && row.canonical === null && !unpublished) {
    fail(
      `${row.id}: canonical is null but the id is not in CANONICAL_UNPUBLISHED, ` +
        'so a launchable agent has no command to hand over.'
    );
  }
  if (unpublished && row.canonical !== null) {
    fail(
      `${row.id}: the id is in CANONICAL_UNPUBLISHED but canonical is not null. ` +
        'The set and the registry disagree.'
    );
  }
  if (unpublished && row.signature === null) {
    fail(
      `${row.id}: an unpublished canonical must carry a non-null signature, ` +
        'or Tortie can say nothing about where the copy came from.'
    );
  }

  // Rules 2 to 5 — the canonical route.
  if (row.canonical !== null) {
    const { command, docUrl, readOn } = row.canonical;
    if (typeof command !== 'string' || command.trim().length === 0) {
      fail(`${row.id}: canonical.command is empty.`);
    } else {
      if (/\bsudo\b/.test(command)) {
        fail(`${row.id}: canonical.command contains sudo.`);
      }
      const firstWord = command.trim().split(/\s+/)[0];
      const isPkg = PACKAGE_MANAGERS.includes(firstWord);
      if (isPkg && row.canonicalIsPackageManager !== true) {
        fail(
          `${row.id}: canonicalIsPackageManager is false but canonical.command ` +
            `begins with "${firstWord}".`
        );
      }
      if (!isPkg && row.canonicalIsPackageManager === true) {
        fail(
          `${row.id}: canonicalIsPackageManager is true but canonical.command ` +
            `begins with "${firstWord}", which is not a package manager.`
        );
      }
    }
    if (typeof docUrl !== 'string' || !docUrl.startsWith('https://')) {
      fail(`${row.id}: canonical.docUrl does not start with https://.`);
    } else {
      const want = DOC_HOSTS[row.id];
      let host = '';
      try {
        host = new URL(docUrl).host;
      } catch {
        fail(`${row.id}: canonical.docUrl is not a parseable URL.`);
      }
      if (want === undefined) {
        fail(
          `${row.id}: no pinned host exists for this agent. Pin its provider's ` +
            'domain in DOC_HOSTS in build/conformance-installs.mjs.'
        );
      } else if (host !== '' && host !== want) {
        fail(
          `${row.id}: canonical.docUrl host is "${host}", and the pinned host ` +
            `is "${want}".`
        );
      }
    }
    if (typeof readOn !== 'string' || !isoDate.test(readOn) || Number.isNaN(Date.parse(readOn))) {
      fail(`${row.id}: canonical.readOn is not an ISO date.`);
    } else if (readOn > today) {
      fail(`${row.id}: canonical.readOn (${readOn}) is in the future.`);
    }
  }

  // Rule 2, the alternates.
  for (const alt of row.alternates) {
    if (typeof alt.label !== 'string' || alt.label.trim().length === 0) {
      fail(`${row.id}: an alternate has no label.`);
    }
    if (alt.command === undefined) continue;
    if (typeof alt.command !== 'string' || alt.command.trim().length === 0) {
      fail(`${row.id}: the "${alt.label}" alternate has an empty command.`);
    } else if (/\bsudo\b/.test(alt.command)) {
      fail(`${row.id}: the "${alt.label}" alternate's command contains sudo.`);
    }
  }

  // Rule 6 — the signatures.
  if (row.signature !== null) {
    for (const sig of row.signature) {
      if (sig.kind === 'realpath-under' || sig.kind === 'marker-file') {
        const path = sig.kind === 'realpath-under' ? sig.dir : sig.path;
        const field = sig.kind === 'realpath-under' ? 'dir' : 'path';
        if (typeof path !== 'string' || !path.startsWith('~/')) {
          fail(`${row.id}: the ${sig.kind} signature's ${field} does not start with ~/.`);
        } else if (path.split('/').includes('..')) {
          fail(`${row.id}: the ${sig.kind} signature's ${field} contains a .. segment.`);
        }
      } else if (sig.kind === 'sibling-glob') {
        if (typeof sig.glob !== 'string' || sig.glob.length === 0 || sig.glob.includes('/')) {
          fail(
            `${row.id}: the sibling-glob signature is not a bare file pattern ` +
              `(it is ${JSON.stringify(sig.glob)}).`
          );
        }
      } else {
        fail(`${row.id}: unknown signature kind ${JSON.stringify(sig.kind)}.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The table, printed whatever the verdict, because the point is that a person
// can read it.
// ---------------------------------------------------------------------------

const pad = (value, width) => String(value).padEnd(width);

process.stdout.write(
  '\nagent        launch  pkgMgr  readOn      signature                    canonical\n'
);
process.stdout.write('-'.repeat(110) + '\n');
for (const row of data.rows) {
  const canonical =
    row.canonical === null
      ? '(none published)'
      : row.canonical.command.length > 48
        ? `${row.canonical.command.slice(0, 45)}...`
        : row.canonical.command;
  const sig =
    row.signature === null
      ? '-'
      : row.signature.map((s) => s.kind).join(', ');
  process.stdout.write(
    `${pad(row.id, 12)} ${pad(row.launchable ? 'yes' : 'no', 7)} ` +
      `${pad(row.canonicalIsPackageManager ? 'yes' : 'no', 7)} ` +
      `${pad(row.canonical?.readOn ?? '-', 11)} ${pad(sig, 28)} ${canonical}\n`
  );
}

const withCommand = data.rows.filter((r) => r.canonical !== null).length;
process.stdout.write(
  `\n${data.rows.length} registry rows, ${withCommand} with a published install command. ` +
    'Nothing here is ever run.\n'
);

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${failures.length}:\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. Every row carries a well-formed install map, no command carries sudo, ' +
    'and every doc link stays on its provider\'s own domain.\n'
);
