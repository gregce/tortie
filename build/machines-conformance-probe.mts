/**
 * The probe half of `npm run conformance:machines` (Phase 68).
 *
 * It prints, as JSON, everything the checker beside it needs to decide whether
 * the machine confirm gate binds a person's agreement to the right four fields
 * and to nothing else. The checker (`conformance-machines.mjs`) decides pass or
 * fail and prints the two tables a person reads.
 *
 * It is a separate file rather than an inline `--eval` because the modules are
 * TypeScript with path aliases, and a probe that cannot resolve `@shared/*`
 * silently prints nothing. That is the same reason `agents-conformance-probe.mts`
 * exists next to it.
 *
 * IT SPAWNS NOTHING. It starts no ssh, no tmux server and no Electron. It opens
 * no manifest, reads no file under the person's home, makes no request and
 * writes nothing anywhere. Every function it calls is pure. It is safe to run
 * on a machine with live sessions on it.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT CANNOT PROVE, said here so nobody reads more into a pass
 * ---------------------------------------------------------------------------
 * The confirm record is sealed through `safeStorage`, which needs an Electron
 * process, so this gate never watches a confirmed machine pass and an
 * unconfirmed one refuse. That belongs to `npm run smoke:machines`, which runs
 * in a real Electron process against the real keychain.
 *
 * It also connects to nothing. No ssh runs, no remote tmux is started and no
 * version is measured. The connection test is proven pure here, live by the
 * probe in `build/probe-machines.mjs`, and by nothing else in this phase.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MACHINE_EXECUTION_FIELDS,
  MACHINE_PRESENTATION_FIELDS
} from '../src/shared/machines';
import {
  MACHINE_CONFIRM_ID_PREFIX,
  canonicalMachineText,
  describeMachine,
  machineExecutionHash,
  machineRecordKey,
  type MachineExecutionFields
} from '../src/main/machines/confirm';
import {
  CONFIG_EXECUTION_HASH_ALGORITHM,
  EMPTY_EXECUTION_FIELDS,
  canonicalExecutionText,
  executionHash
} from '../src/main/config/confirm';
import {
  MACHINE_ALARM_CLASS,
  MACHINE_OUTCOME_CLASSES,
  machineOutcomeCopy
} from '../src/main/machines/errors';
import {
  KNOWN_HOSTS_OPTION,
  SSH_BATCH_MODE_INTERACTIVE,
  SSH_BATCH_MODE_STEADY,
  composeTestArgv,
  userHostKeysPath
} from '../src/main/machines/connection-test';
import { validateMachinesFile } from '../src/main/machines/schema';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const machinesDir = join(repoRoot, 'src', 'main', 'machines');

/** The machine every comparison below is made against. */
const BASE: MachineExecutionFields = {
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 22,
  remoteTmuxPath: '/usr/bin/tmux'
};

const ID = 'pop-os';

/**
 * The two files a run checks a machine's identity against.
 *
 * These are shapes, not this machine's real paths. The probe reads no file
 * under the person's home and writes nothing anywhere, so it composes the argv
 * against a Tortie path with a space in it, which is what the real one has, and
 * against the person's file for a home directory that is not theirs.
 */
const HOST_KEYS = {
  tortie: '/Users/x/Library/Application Support/Tortie/gmux/machines/known-machines',
  user: userHostKeysPath('/Users/x')
};

/** One variation per execution bearing field, changed and unset. */
const CHANGED: Record<string, MachineExecutionFields> = {
  host: { ...BASE, host: 'attic.tail1a2b.ts.net' },
  user: { ...BASE, user: 'root' },
  port: { ...BASE, port: 2222 },
  remoteTmuxPath: { ...BASE, remoteTmuxPath: '/opt/homebrew/bin/tmux' }
};

const UNSET: Record<string, MachineExecutionFields> = {
  user: { ...BASE, user: null },
  port: { ...BASE, port: null },
  remoteTmuxPath: { ...BASE, remoteTmuxPath: null }
};

const base = machineExecutionHash(ID, BASE);

// ---------------------------------------------------------------------------
// 1. The hash, per field
// ---------------------------------------------------------------------------

const fieldRows = [
  ...MACHINE_EXECUTION_FIELDS.map((field) => ({
    field,
    kind: 'execution',
    changedHash: CHANGED[field] === undefined ? null : machineExecutionHash(ID, CHANGED[field]),
    unsetHash: UNSET[field] === undefined ? null : machineExecutionHash(ID, UNSET[field])
  })),
  // The two presentation fields are not in the hash's type at all, so the only
  // way to ask "does the hash move for a label" is to ask whether the label
  // string can reach the canonical text. That is what the checker reads.
  ...MACHINE_PRESENTATION_FIELDS.map((field) => ({
    field,
    kind: 'presentation',
    changedHash: null,
    unsetHash: null
  }))
];

// ---------------------------------------------------------------------------
// 2. The canonical text, and what may not appear in it
// ---------------------------------------------------------------------------

const canonical = canonicalMachineText(ID, BASE);

// ---------------------------------------------------------------------------
// 3. The two key spaces
// ---------------------------------------------------------------------------

const agentFields = {
  ...EMPTY_EXECUTION_FIELDS,
  launchable: true,
  binaries: [ID],
  launchArgv: [ID]
};

// ---------------------------------------------------------------------------
// 4. The normalizer key set, read from the canonical text itself
// ---------------------------------------------------------------------------
//
// The normalizer object is private to confirm.ts, which is correct. What the
// gate needs is whether its key set and MACHINE_EXECUTION_FIELDS agree, and the
// canonical text is the honest place to read that from: it is exactly the keys
// the hash covered.

const hashedKeys = (JSON.parse(canonical.split('\n')[1] ?? '[]') as [string, unknown][])
  .map(([key]) => key)
  .filter((key) => key !== 'id')
  .sort();

// ---------------------------------------------------------------------------
// 5. The drop whole rule
// ---------------------------------------------------------------------------

const GOOD_ROW = {
  id: 'pop-os',
  label: 'Pop OS',
  color: 'blue',
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 22,
  remoteTmuxPath: '/usr/bin/tmux'
};

const BAD_ROWS: { name: string; row: unknown; field: string }[] = [
  { name: 'a host beginning with a hyphen', row: { id: 'dash', host: '-oProxyCommand=x' }, field: 'host' },
  { name: 'a user beginning with a hyphen', row: { id: 'du', host: 'a.example', user: '-oX=y' }, field: 'user' },
  { name: 'a relative program path', row: { id: 'rel', host: 'a.example', remoteTmuxPath: 'tmux' }, field: 'remoteTmuxPath' },
  { name: 'a program path holding a quote', row: { id: 'q', host: 'a.example', remoteTmuxPath: "/usr/bin/it's" }, field: 'remoteTmuxPath' },
  { name: 'a port outside the range', row: { id: 'p', host: 'a.example', port: 70000 }, field: 'port' },
  { name: 'a colour outside the six', row: { id: 'c', host: 'a.example', color: 'puce' }, field: 'color' },
  { name: 'an unknown key', row: { id: 'u', host: 'a.example', sshOptions: [] }, field: 'sshOptions' },
  { name: 'a missing address', row: { id: 'nohost' }, field: 'host' }
];

const dropRows = BAD_ROWS.map((entry) => {
  const out = validateMachinesFile({ schema: 1, machines: [GOOD_ROW, entry.row] });
  const problem = out.problems[0] ?? null;
  return {
    name: entry.name,
    expectField: entry.field,
    survivorKept: out.rows.length === 1 && out.rows[0]?.id === 'pop-os',
    droppedWhole: !out.rows.some((r) => r.id !== 'pop-os'),
    problemCount: out.problems.length,
    problemField: problem?.field ?? null,
    problemMessage: problem?.message ?? null
  };
});

// ---------------------------------------------------------------------------
// 6. The taxonomy
// ---------------------------------------------------------------------------

const taxonomy = MACHINE_OUTCOME_CLASSES.map((cls) => {
  const copy = machineOutcomeCopy(cls);
  return {
    class: cls,
    alarm: copy.alarm,
    headline: copy.headline,
    detailLength: copy.detail.length,
    hasDash: copy.headline.includes('—') || copy.detail.includes('—')
  };
});

// ---------------------------------------------------------------------------
// 7. The source scan: what these files may not mention, and what may appear once
// ---------------------------------------------------------------------------

/** Every production .ts under src/main/machines/, excluding the tests. */
function productionFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === '__tests__') continue;
      productionFiles(path, out);
    } else if (entry.endsWith('.ts')) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Lines mentioning a phrase, with the line text, so the checker can tell a
 * comment that says Tortie does not read something from code that reads it.
 */
function mentions(files: string[], phrase: string): { file: string; line: number; text: string }[] {
  const hits: { file: string; line: number; text: string }[] = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, index) => {
      if (text.includes(phrase)) {
        hits.push({ file: file.slice(repoRoot.length + 1), line: index + 1, text: text.trim() });
      }
    });
  }
  return hits;
}

const files = productionFiles(machinesDir);
const wholeTree = (() => {
  const collected: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '__tests__') continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry)) collected.push(path);
    }
  };
  walk(join(repoRoot, 'src'));
  return collected;
})();

process.stdout.write(
  JSON.stringify({
    id: ID,
    base,
    sameAgain: machineExecutionHash(ID, { ...BASE }),
    fields: fieldRows,
    executionFields: [...MACHINE_EXECUTION_FIELDS],
    presentationFields: [...MACHINE_PRESENTATION_FIELDS],
    hashedKeys,
    canonical,
    canonicalCarriesLabel: canonical.includes('Pop OS') || canonical.includes('label'),
    canonicalCarriesColor: canonical.includes('blue') || canonical.includes('color'),
    canonicalCarriesPrefix: canonical.includes(`"${MACHINE_CONFIRM_ID_PREFIX}${ID}"`),
    recordKey: machineRecordKey(ID),
    recordKeyIsPrefixed: machineRecordKey(ID) === `${MACHINE_CONFIRM_ID_PREFIX}${ID}`,
    agentHashForSameBareId: executionHash(ID, agentFields),
    agentCanonicalAlgorithm: CONFIG_EXECUTION_HASH_ALGORITHM,
    agentCanonicalCarriesPrefix: canonicalExecutionText(ID, agentFields).includes(
      MACHINE_CONFIRM_ID_PREFIX
    ),
    sheetLines: [...describeMachine(ID, BASE).lines],
    sheetCarriesSshPath: describeMachine(ID, BASE).lines.some((l) => l.includes('/usr/bin/ssh')),
    sheetCarriesHonesty: describeMachine(ID, BASE).lines.some((l) =>
      l.includes('Confirming seals')
    ),
    drops: dropRows,
    taxonomy,
    alarmClass: MACHINE_ALARM_CLASS,
    argv: composeTestArgv(BASE, HOST_KEYS),
    batchModeInteractive: SSH_BATCH_MODE_INTERACTIVE,
    batchModeSteady: SSH_BATCH_MODE_STEADY,
    hostKeys: HOST_KEYS,
    knownHostsOption: KNOWN_HOSTS_OPTION,
    scannedFiles: files.map((f) => f.slice(repoRoot.length + 1)),
    sshConfigMentions: mentions(files, '.ssh/config'),
    knownHostsMentions: mentions(files, 'known_hosts'),
    batchModeNoMentions: mentions(wholeTree, "'BatchMode=no'"),
    batchModeYesPresent: mentions(wholeTree, "'BatchMode=yes'").length > 0
  })
);
