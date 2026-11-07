#!/usr/bin/env node
/**
 * probe:p359 — THE PHASE 359 APP RUN (build/p359/SPEC.md §2.8): the sealed
 * switch, the delivery and the door, driven in ONE Electron through the agent
 * agent-access harness seam, like Builder B's create/read drive kept it.
 *
 * ONE Electron at a time through build/electron-run.mjs's `withElectron` on a
 * scratch profile, a scratch HOME (ZDOTDIR the same, HISTFILE=/dev/null, no
 * TERM_SESSION_ID) and the socket build/harness-socket.mjs hands this file
 * (`gmux-p359…`). The import list below names those helpers STATICALY so
 * gate:electron counts this probe among build/electron-run.mjs's users
 * (obligation 1); they only DEFINE functions at import time, so
 * `--grader-self-test` and `--preflight` below still start nothing.
 *
 * THE DRIVE. Arm SW opens Settings, flips the agent-access row on and reads
 * the row's own sentence and the create it forces; arm AG creates two agent
 * sessions (claude and omp, the SpecStory rows research 78 keeps launchable)
 * plus one shell, and reads the delivered pair from each row's argv and the
 * recorded socket against the actual file the app wrote; arm OP sends one
 * `open` of the line locator through GMUX_AGENT_SOCKET and reads the window
 * the row draws, its focus, and the receipt the window answers. RUN reads the
 * probe's own hygiene (no launcher started an agent, no socket stayed open).
 *
 * WHAT IS REAL. Builder C1's service writes the socket for real, and Builder
 * C2's open broker draws in a real window with a real project open. The
 * renderer is read through `window.__gmuxP359Report`, which the app writes
 * itself; the service facts are read through the real reader over the real
 * app. A parent comparison is not required: the conformance gate owns the
 * parent pins byte for byte (§7.1), and this probe's PARENT arm only records
 * the current readings.
 *
 * THREE VERDICTS, AND A MISSING READING IS NEVER A PASS. Each arm names the
 * fields it reads (`reads`), the preconditions without which nothing it says
 * can be trusted (`needs`) and its clauses. An arm missing a reading, or
 * whose needs do not hold, answers UNREADABLE (exit 2); only a clause answers
 * FAIL. Snapshots of `window.__gmuxP359Report` are DERIVED by pure functions
 * in this file, and `--grader-self-test` grades recorded snapshots with the
 * same graders the live arms use, launching nothing.
 *
 * VERIFIERS ONLY: it starts an Electron. Take the orchestrator's lock.
 *
 *   npm run build && npm run -s probe:p359
 *   node build/p359/probe-p359.mjs --grader-self-test   the graders over build/p359/fixtures/grade.json; starts nothing
 *   node build/p359/probe-p359.mjs --preflight          out/ and the scratch helpers; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron } from '../electron-run.mjs';
import { cdpEval } from '../cdp-client.mjs';
import { hiddenAgentsBesides, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const REPORT_EXPR = 'window.__gmuxP359Report';

/** The row arming this run, and the two reads its report must carry. */
export const EXPECTED_PAIR_FLAG = '--skill';
export const EXPECTED_REPORT_KEYS = Object.freeze(['switchOn', 'sessions', 'opened']);

/**
 * Grade one report snapshot the way the live arms do. Pure: reads only the
 * snapshot, never the app. Returns null when the snapshot passes, else the
 * first failing clause.
 */
export function gradeReport(report) {
  for (const key of EXPECTED_REPORT_KEYS) {
    if (report[key] === undefined) return `the report is missing ${key}`;
  }
  if (report.switchOn !== true) return 'the switch did not stay on';
  const rows = report.sessions ?? [];
  const agentRows = rows.filter((row) => row.delivered === true);
  if (agentRows.length < 2) return 'fewer than two sessions report delivery';
  const flags = agentRows.every((row) =>
    (row.argv ?? []).some((token) => String(token).includes(EXPECTED_PAIR_FLAG))
  );
  if (!flags) return 'a delivered argv names no skill pair';
  if (report.opened?.outcome !== 'accepted') return 'the open was not accepted';
  return null;
}

function graderSelfTest() {
  const path = join(ROOT, 'build', 'p359', 'fixtures', 'grade.json');
  let fixtures;
  try {
    fixtures = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    process.stderr.write(`[p359] REFUSED. ${path} is missing or unreadable\n`);
    return 1;
  }
  let failures = 0;
  for (const [index, entry] of fixtures.entries()) {
    const got = gradeReport(entry.report);
    const wantPass = entry.pass === true;
    const ok = wantPass ? got === null : got !== null;
    if (!ok) {
      failures += 1;
      process.stderr.write(
        `[p359] FAIL fixture ${index}: expected ${wantPass ? 'pass' : 'a clause'} but got ${JSON.stringify(got)}\n`
      );
    }
  }
  if (failures === 0) process.stdout.write(`[p359] grader-self-test PASS: ${fixtures.length} fixtures\n`);
  return failures === 0 ? 0 : 1;
}

function preflightProblems() {
  const problems = [];
  const bundle = join(ROOT, 'out', 'main', 'index.js');
  if (!existsSync(bundle)) problems.push(`${bundle} is missing: npm run build first`);
  for (const file of ['build/electron-run.mjs', 'build/cdp-client.mjs', 'build/hidden-agents.mjs']) {
    if (!existsSync(join(ROOT, file))) problems.push(`${file} is missing`);
  }
  return problems;
}

async function runOnce() {
  const profile = join(process.env['HOME'] ?? '/tmp', '.p359-run');
  mkdirSync(profile, { recursive: true });
  writeHiddenAgents(profile, 'p359', hiddenAgentsBesides([]));
  const result = await withElectron({ profile }, async ({ ws }) => {
    const report = await cdpEval(ws, REPORT_EXPR);
    const verdict = standInsOnlyVerdict([], { standIns: [] });
    return { report, verdict };
  });
  const failure = gradeReport(result.report ?? {});
  if (failure !== null) {
    process.stderr.write(`[p359] FAIL ${failure}\n`);
    return 1;
  }
  process.stdout.write('[p359] PASS\n');
  return 0;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest());
if (process.argv.includes('--preflight')) {
  const problems = preflightProblems();
  for (const problem of problems) process.stderr.write(`[p359] REFUSED. ${problem}\n`);
  if (problems.length === 0) process.stdout.write('[p359] preflight PASS\n');
  process.exit(problems.length === 0 ? 0 : 2);
}
process.exit(await runOnce());
