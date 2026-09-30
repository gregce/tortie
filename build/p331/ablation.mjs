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
 * Usage:
 *   node build/p331/ablation.mjs
 *   P331_ONLY=C1,L2 node build/p331/ablation.mjs        named arms only
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
const TEST_FILES = [SWITCH_TEST, FLAGS_TEST, PASS_TEST, SCREEN_TEST, HARNESS_TEST];

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
  H5: [HARNESS_TEST, 'an agent install that moved during the run is named, and one that stayed is not']
};
/** The `conformance:agents` rows, owned by the line the gate prints when one fails. */
const GATE_ROWS = ['11.1', '11.2', '11.3', '11.4', '11.5'];
const isGateRow = (owner) => GATE_ROWS.includes(owner);

// ---------------------------------------------------------------------------
// The two needles computed from the shipping source, braces matched
// ---------------------------------------------------------------------------

/** pi's record is anchored on its `measured` string, which SPEC §2.2 requires to be unique in the file. */
const PI_MEASURED = "measured: '0.84.2, 2026-09-29, live (research 134)',";

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
    { n: 'C9', name: "the pass rewrites a remote row's argv[0]", file: PASS,
      find: 'recorded[0]);', to: 'undefined);', owners: ['R6'] },
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
      find: '    const pane = attempt === 0 ? capture : bottomOfPane(capture);', to: '    const pane = capture;', owners: ['H1'] }
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
  const red = GATE_ROWS.filter((row) => text.includes(`Phase 331 ${row} (`));
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

const WATCHED = [REGISTRY, EXTRAS, REMOTE_RECORD, HARVEST, PASS, OVERLAY, SCREEN, CASES, PANE, RESUME, REPORT, ...TEST_FILES, 'build/conformance-agents.mjs', 'build/agents-conformance-probe.mts'];
const before = new Map(WATCHED.filter((f) => existsSync(join(REPO, f))).map((f) => [f, sha(readFileSync(join(REPO, f)))]));

try {
  for (const f of TEST_FILES) {
    if (!existsSync(join(REPO, f))) problems.push(`the owning test file ${f} is not in the tree, so its rows cannot own anything`);
  }
  if (problems.length > 0) throw new Error('control red');
  // Every title is written in its file, or it cannot be an owner.
  for (const [short, [file, title]] of Object.entries(TITLES)) {
    if (count(readFileSync(join(REPO, file), 'utf8'), title) === 0) problems.push(`${short}'s title is not written in ${file}: ${title}`);
  }

  buildClone();
  say(`clone at ${scratch}, node_modules and build/vendor symlinked, nothing under a home touched`);

  const list = arms(readFileSync(join(REPO, REGISTRY), 'utf8'), readFileSync(join(REPO, OVERLAY), 'utf8'));
  const only = (process.env['P331_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
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
  say(`control: ${String(control.ran)} rows green over the five files, and conformance:agents green`);

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
