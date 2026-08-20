#!/usr/bin/env node
/**
 * probe-specstory-entitlement.mjs — the local kill probe for the bundled
 * SpecStory binary (`npm run conformance:specstory:entitlement`, Phase 115,
 * research 59 sections 6 and 10).
 *
 * WHAT IT PROVES, in both directions, on this machine:
 *
 *   Copy A — the vendored binary signed ad hoc with the hardened runtime and
 *   NO entitlements (the exact shipped shape before Phase 115) — MUST be
 *   killed by SIGKILL when it saves a session that carries secret-shaped
 *   text. Every save runs the betterleaks secret scanner, which runs re2 as
 *   wasm through wazero, and wazero turns writable anonymous memory into
 *   executable memory, which the hardened runtime forbids without the
 *   entitlement (github issue 10). If copy A SURVIVES, that is a distinct
 *   "enforcement not observed on this machine" failure with exit code 2,
 *   never a pass, because a machine that cannot observe the kill proves
 *   nothing about the fix.
 *
 *   Copy B — the same binary signed with build/entitlements.specstory.plist
 *   (exactly com.apple.security.cs.allow-unsigned-executable-memory) — MUST
 *   exit 0 and write markdown containing a `[REDACTED:` marker, which proves
 *   the surviving copy executed the same generated code the killed copy died
 *   on.
 *
 * WHAT IT CANNOT PROVE: notarization acceptance, Gatekeeper on a real
 * install, and Developer ID behavior. Those belong to the operator's
 * notarized soak (docs/research/27-release-and-updates.md section 3.7 step
 * 5). smoke:capture cannot witness the kill either, because the vendored
 * binary it resolves carries no CS_RUNTIME flag.
 *
 * NOT IN CI. Nobody has measured whether hosted macOS runners enforce the
 * kill. One workflow_dispatch run must prove enforcement before any workflow
 * adds this script, because a probe that cannot observe its subject would
 * pass vacuously. Local only until then.
 *
 * SIDE EFFECTS, stated plainly. Each required kill makes macOS write a
 * specstory `.ips` crash report into ~/Library/Logs/DiagnosticReports of the
 * REAL user (the crash reporter ignores the scratch HOME the drive runs
 * under). The probe deletes the reports it caused, and names any it could
 * not delete. Everything else lands in a scratch directory that is removed
 * at the end.
 *
 * Exit codes: 0 both directions held, 1 probe failure, 2 enforcement not
 * observed on this machine.
 */

import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  copyFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILD_DIR = join(fileURLToPath(import.meta.url), '..');
const VENDORED = join(BUILD_DIR, 'vendor', 'specstory', 'bin', 'specstory');
const PLIST = join(BUILD_DIR, 'entitlements.specstory.plist');
const PIN_PATH = join(BUILD_DIR, 'specstory-release.json');

/**
 * The crash reporter writes to the real user's DiagnosticReports directory,
 * not the scratch HOME the drives run under. homedir() here reads the
 * probe's own untouched HOME.
 */
const REPORTS_DIR = join(homedir(), 'Library', 'Logs', 'DiagnosticReports');

/**
 * The exact sync drive research 59 measured the kill and the survival with.
 * Deliberately not widened: no --silent (the output is the diagnosis when a
 * direction fails) and no extra flags beyond the two the lab used.
 */
const SYNC_ARGV = ['sync', 'claude', '--no-cloud-sync', '--no-version-check'];

/** How long one sync may run before the probe calls it hung. */
const SYNC_TIMEOUT_MS = 120_000;

let failures = 0;
function pass(name, detail) {
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail) {
  failures += 1;
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function run(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${cmdArgs.join(' ')} failed:\n${r.stdout}${r.stderr}`);
  }
  return `${r.stdout}${r.stderr}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A slack-bot-token-shaped string, assembled at run time so no secret-shaped
 * literal ever sits in this repository for a scanner to flag. It is not a
 * real credential; its SHAPE is what makes betterleaks run the wasm engine.
 */
function plantedToken() {
  return ['xoxb', '123456789012', '1234567890123', 'AbCdEfGhIjKlMnOpQrStUvWx'].join('-');
}

/**
 * Plant a Claude Code session for `projDir` inside `home`, in the record
 * shape the research 59 lab drove the real binary with
 * (docs/research/assets/r59-lab/driver.sh). SpecStory finds it under
 * ~/.claude/projects/<munged cwd>/, where the munged name is the project
 * path with every path separator turned into a dash. That is why the
 * scratch root must contain only letters, digits and dashes; see main().
 */
function plantSession(home, projDir) {
  const sessionId = randomUUID();
  const munged = projDir.replaceAll('/', '-');
  const dir = join(home, '.claude', 'projects', munged);
  mkdirSync(dir, { recursive: true });
  const t0 = new Date(Date.now() - 60_000);
  const at = (offsetSeconds) => new Date(t0.getTime() + offsetSeconds * 1000).toISOString();
  const base = {
    isSidechain: false,
    userType: 'external',
    cwd: projDir,
    sessionId,
    version: '1.0.83',
    gitBranch: ''
  };
  const u1 = randomUUID();
  const u2 = randomUUID();
  const u3 = randomUUID();
  const records = [
    {
      ...base,
      parentUuid: null,
      type: 'user',
      message: { role: 'user', content: 'Please print a sample token for the redaction probe.' },
      uuid: u1,
      timestamp: at(0)
    },
    {
      ...base,
      parentUuid: u1,
      type: 'assistant',
      message: {
        id: 'msg_probe_p115',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-4-1',
        content: [{ type: 'text', text: `Sample: ${plantedToken()} end.` }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 }
      },
      requestId: 'req_probe_p115',
      uuid: u2,
      timestamp: at(5)
    },
    {
      ...base,
      parentUuid: u2,
      type: 'user',
      message: { role: 'user', content: 'Thanks, that is all.' },
      uuid: u3,
      timestamp: at(10)
    }
  ];
  writeFileSync(
    join(dir, `${sessionId}.jsonl`),
    records.map((r) => JSON.stringify(r)).join('\n') + '\n'
  );
}

/** Copy the vendored binary and sign it ad hoc with the hardened runtime. */
function makeCopy(dir, identifier, entitlementsPlist) {
  mkdirSync(dir, { recursive: true });
  const bin = join(dir, 'specstory');
  copyFileSync(VENDORED, bin);
  chmodSync(bin, 0o755);
  run('/usr/bin/codesign', [
    '--force',
    '--sign',
    '-',
    '--identifier',
    identifier,
    '--options',
    'runtime',
    '--timestamp=none',
    ...(entitlementsPlist ? ['--entitlements', entitlementsPlist] : []),
    bin
  ]);
  return bin;
}

function driveSync(bin, projDir, home) {
  return spawnSync(bin, SYNC_ARGV, {
    cwd: projDir,
    env: { ...process.env, HOME: home },
    encoding: 'utf8',
    timeout: SYNC_TIMEOUT_MS
  });
}

/** The specstory crash reports currently on this machine, by file name. */
function specstoryReports() {
  if (!existsSync(REPORTS_DIR)) return new Set();
  return new Set(
    readdirSync(REPORTS_DIR).filter((f) => f.startsWith('specstory') && f.endsWith('.ips'))
  );
}

/** Any markdown under <proj>/.specstory/history that carries a redaction marker. */
function redactedMarkdown(projDir) {
  const history = join(projDir, '.specstory', 'history');
  if (!existsSync(history)) return null;
  for (const f of readdirSync(history)) {
    if (!f.endsWith('.md')) continue;
    const text = readFileSync(join(history, f), 'utf8');
    if (text.includes('[REDACTED:')) return join(history, f);
  }
  return null;
}

async function main() {
  console.log('probe-specstory-entitlement: the kill A/B (research 59)');

  // Preconditions: the pinned binary, byte for byte, and the plist.
  const pin = JSON.parse(readFileSync(PIN_PATH, 'utf8'));
  const asset = pin.assets['darwin-arm64'];
  if (!existsSync(VENDORED)) {
    fail('vendored binary present', `${VENDORED} missing — run: npm run vendor:specstory`);
    return 1;
  }
  const hash = sha256(VENDORED);
  if (hash !== asset.binarySha256) {
    fail(
      'vendored binary matches the pin',
      `sha256 ${hash} != pinned ${asset.binarySha256} — run: npm run vendor:specstory`
    );
    return 1;
  }
  pass('vendored binary matches the pin', `${pin.version}, sha256 ${hash.slice(0, 12)}…`);
  if (!existsSync(PLIST)) {
    fail('entitlements plist present', `${PLIST} missing`);
    return 1;
  }

  // The scratch root lives under /private/tmp ON PURPOSE: the planted
  // session's directory name is the project path with '/' turned into '-'
  // (see plantSession), so the path must contain only letters, digits and
  // dashes. os.tmpdir() on macOS goes through /var/folders names that break
  // that rule. mkdtemp appends only letters and digits.
  const root = mkdtempSync('/private/tmp/tortie-specstory-probe-');
  const reportsBefore = specstoryReports();
  let observedKill = false;
  try {
    // Direction A: the pre-Phase-115 shipped shape must die.
    const homeA = join(root, 'home-a');
    const projA = join(root, 'proj-a');
    mkdirSync(projA, { recursive: true });
    plantSession(homeA, projA);
    const binA = makeCopy(join(root, 'bin-a'), 'com.itavero.tortie.specstory.probe-a', null);
    const a = driveSync(binA, projA, homeA);
    const aKilled = a.signal === 'SIGKILL' || a.status === 137;
    if (aKilled) {
      observedKill = true;
      pass('copy A (hardened, no entitlements) killed', `signal=${a.signal ?? '137'}`);
    } else if (redactedMarkdown(projA) !== null) {
      // It ran the scanner to completion unentitled: this machine does not
      // enforce the kill, so neither direction can be trusted here.
      console.log(
        `  FAIL  copy A survived AND redacted — enforcement not observed on ` +
          `this machine (exit ${a.status}, signal ${a.signal}). This is not a ` +
          `pass: a machine that cannot observe the kill proves nothing about ` +
          `the fix. Do not put this probe in CI on the strength of this run.`
      );
      return 2;
    } else {
      fail(
        'copy A (hardened, no entitlements) killed',
        `neither killed nor saved (exit ${a.status}, signal ${a.signal}) — the ` +
          `planted session likely never reached the save path; probe bug, not ` +
          `an enforcement verdict.\n--- copy A output ---\n${a.stdout}${a.stderr}`
      );
      return 1;
    }

    // Direction B: the Phase 115 shape must survive and redact.
    const homeB = join(root, 'home-b');
    const projB = join(root, 'proj-b');
    mkdirSync(projB, { recursive: true });
    plantSession(homeB, projB);
    const binB = makeCopy(join(root, 'bin-b'), 'com.itavero.tortie.specstory.probe-b', PLIST);
    const b = driveSync(binB, projB, homeB);
    if (b.status === 0) {
      pass('copy B (entitled) exit 0');
    } else {
      fail(
        'copy B (entitled) exit 0',
        `exit ${b.status}, signal ${b.signal}\n--- copy B output ---\n${b.stdout}${b.stderr}`
      );
    }
    const md = redactedMarkdown(projB);
    if (md !== null) {
      pass('copy B wrote redacted markdown', md.slice(root.length + 1));
    } else {
      fail('copy B wrote redacted markdown', `no .md with a [REDACTED: marker under ${projB}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });

    // The kill above made macOS write a crash report into the real user's
    // DiagnosticReports. Wait for it, read its termination namespace as
    // evidence, then delete what this probe caused. Only files that appeared
    // during this run are touched.
    if (observedKill) {
      let fresh = [];
      for (let i = 0; i < 20; i += 1) {
        fresh = [...specstoryReports()].filter((f) => !reportsBefore.has(f));
        if (fresh.length > 0) break;
        await sleep(500);
      }
      if (fresh.length === 0) {
        console.log(
          '  note: no new specstory .ips appeared in DiagnosticReports within ' +
            '10 s — nothing to clean up, and the CODESIGNING field could not be read.'
        );
      }
      for (const f of fresh) {
        const p = join(REPORTS_DIR, f);
        let namespace = 'unreadable';
        try {
          namespace = readFileSync(p, 'utf8').includes('CODESIGNING')
            ? 'CODESIGNING'
            : 'no CODESIGNING field';
        } catch {
          /* the report is evidence, not a requirement */
        }
        try {
          unlinkSync(p);
          console.log(`  note: deleted the crash report this probe caused: ${f} (${namespace})`);
        } catch {
          console.log(`  note: could NOT delete the crash report this probe caused: ${p} (${namespace})`);
        }
      }
    }
  }
  return failures === 0 ? 0 : 1;
}

const code = await main();
console.log(
  code === 0
    ? '\nprobe-specstory-entitlement: PASS (killed unentitled, survived entitled)'
    : `\nprobe-specstory-entitlement: FAIL (exit ${code})`
);
process.exit(code);
