#!/usr/bin/env node
/**
 * `npm run ablation:p374`. THE ATTACK ON PHASE 374'S OWN RULES
 * (build/p374/SPEC.md §7.1, §7.3): each clause of the Antigravity meter taken
 * out of the SHIPPING source, one at a time, in a clone, and the row that owns
 * it required red BY NAME.
 *
 * Several minutes. It launches no Electron, starts no tmux server, spawns no
 * agent, makes no request and reads nothing under the person's home. It starts
 * nothing but `cp` and this node running vitest, which itself runs `/bin/sh`
 * and the three programs the generated script names, over scratch folders.
 *
 * ## It never writes into the working tree
 *
 * `cp -Rc` (APFS clonefile) of `src/`, `build/`, `resources/` and the configs
 * into a scratch folder, `node_modules` a link, and vitest run there. Each
 * edited file is put back and CHECKED BY SHA256 before the next arm; the clone
 * goes in a `finally` and on a signal; and the run ends by asserting that the
 * worktree's own bytes never moved.
 *
 * ## The rules each arm is held to
 *
 *   - Every needle matches the shipping source EXACTLY ONCE. Zero means the
 *     clause moved and this arm moves with it in the same commit; two means an
 *     edit could land on the wrong occurrence and prove nothing.
 *   - Every row it names as the OWNER exists and goes red, and not because the
 *     edit itself could not run (a ReferenceError or a SyntaxError is not the
 *     clause speaking). Other rows going red too is printed, and is not a
 *     failure.
 *   - An UNEDITED CONTROL over every file named here is green first, and again
 *     at the end.
 *   - Every row of §7.1 has at least one arm (`ROWS`).
 *
 * L3 and L8 and S2 hold a rule that lives in two places at once, so some arms
 * take both out; such an arm says so in its own words.
 *
 * Usage:
 *   node build/p374/ablation.mjs
 *   P374_ONLY=U1,S3a node build/p374/ablation.mjs    named arms only
 *   P374_SCRATCH=<dir>                               where the clone is made
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[ablation:p374]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const SERVICE = 'src/main/usage/service.ts';
const PROVIDERS = 'src/main/usage/providers.ts';
const RECEIVE = 'src/main/usage/antigravity/receive.ts';
const SCRIPT = 'src/main/usage/antigravity/script.ts';
const FOLDER = 'src/main/usage/antigravity/folder.ts';
const LAUNCH = 'src/main/usage/antigravity/launch.ts';
const OWN = 'src/main/usage/antigravity/own-status-line.ts';
const SHARED = 'src/shared/usage.ts';
const SETTINGS = 'src/shared/settings.ts';
const DETECTION = 'src/main/agents/detection.ts';
const CREATE = 'src/main/sessions/create-local.ts';
const CORE = 'src/main/sessions/core.ts';
const COMMAND = 'src/main/restore/command.ts';
const IPC = 'src/main/usage/ipc.ts';
const MONITOR = 'src/main/activity/monitor.ts';
const RUNS = 'src/main/activity/status-line-runs.ts';
const METER = 'src/renderer/app/UsageMeter.tsx';
const COPY = 'src/renderer/app/usage-copy.ts';
const GROUP = 'src/renderer/settings/UsageGroup.tsx';

const T = {
  fall: 'src/main/usage/__tests__/p374-fallthrough.test.ts',
  service: 'src/main/usage/__tests__/p374-service.test.ts',
  pulse: 'src/main/usage/__tests__/p374-pulse.test.ts',
  receive: 'src/main/usage/__tests__/p374-receive.test.ts',
  script: 'src/main/usage/antigravity/__tests__/p374-script.test.ts',
  folder: 'src/main/usage/antigravity/__tests__/p374-folder.test.ts',
  launch: 'src/main/usage/antigravity/__tests__/p374-launch.test.ts',
  own: 'src/main/usage/antigravity/__tests__/p374-own-status-line.test.ts',
  probed: 'src/main/agents/__tests__/p374-probed-version.test.ts',
  create: 'src/main/sessions/__tests__/p374-antigravity-create.test.ts',
  core: 'src/main/sessions/__tests__/p374-core-lifetimes.test.ts',
  runs: 'src/main/activity/__tests__/p374-status-line-runs.test.ts',
  shared: 'src/shared/__tests__/p1812-usage-plan-and-bar.test.ts',
  meter: 'src/renderer/app/__tests__/p374-antigravity-meter.test.tsx',
  settings: 'src/renderer/settings/__tests__/p374-usage-antigravity-row.test.tsx'
};

/** Every row of SPEC §7.1, and the fix round's L9, L10 and A1 (its §As built). Each must have an arm. */
const ROWS = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'U10', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'A1', 'S1', 'S2', 'S3', 'S4', 'S5', 'F1', 'R1', 'R2', 'R3', 'R4'];

const one = (file, from, to) => [{ file, from, to }];

/** `{ id, row, what, edits, test, red }`: `red` names the owners, each a piece of a full test name. */
const ARMS = [
  // ------------------------------------------------------------------ the usage domain
  { id: 'U1', row: 'U1', what: 'the entry made a Codex fetch (the parent’s defect)', test: T.fall, red: ['asks nobody and opens no sign in, on read', 'asks nobody and opens no sign in, on refresh'],
    edits: one(PROVIDERS, "antigravity: { kind: 'receiver' }", "antigravity: { kind: 'fetch', login: 'codex', host: CODEX_USAGE_HOST, path: CODEX_USAGE_PATH, headers: (c: UsageCredential) => codexUsageHeaders(c.token, c.accountId ?? ''), credential: (d: CredentialDeps, dir: string | null) => readCodexCredential(d, dir), parse: (b: unknown, _c: UsageCredential, n: number) => parseCodexUsage(b, n) }") },
  { id: 'U1b', row: 'U1', what: 'the receiver branch asks the entry after it', test: T.service, red: ['sends nothing, opens no sign in and asks no login, on read'],
    edits: one(SERVICE, "        else receiverOff();\n        continue;", "        else receiverOff();\n        deps.logins('codex');\n        continue;") },
  { id: 'U2', row: 'U2', what: 'a receiver counted in lastAttemptAt', test: T.service, red: ['byte for byte, with the third switch on and off'],
    edits: one(SERVICE, "        if (on[provider]) receive(now);", "        if (on[provider]) {\n          receive(now);\n          for (const other of held.values()) other.lastAttemptAt = now;\n        }") },
  { id: 'U3', row: 'U3', what: 'the lookup answers codex', test: T.fall, red: ['answers no login for Antigravity'], edits: one(SHARED, '  antigravity: null\n', "  antigravity: 'codex'\n") },
  { id: 'U4a', row: 'U4', what: 'staleness is not decided at compose time', test: T.receive, red: ['is ok at 29 minutes, stale at 31'], edits: one(RECEIVE, "now - reading.at > USAGE_STALE_MS ? 'stale' : 'ok'", "'ok'") },
  { id: 'U4b', row: 'U4', what: 'a passed reset does not void its window', test: T.receive, red: ['voids the five hour window at its reset'], edits: one(RECEIVE, "  if (reset !== null && reset <= now) return { kind: 'void' };\n", '') },
  { id: 'U4c', row: 'U4', what: 'a window older than it is long is still drawn', test: T.receive, red: ['voids a window older than it is long'], edits: one(RECEIVE, "  if (now - at > lengthMs) return { kind: 'void' };\n", '') },
  { id: 'U4d', row: 'U4', what: 'every window void reads as no windows', test: T.receive, red: ['waits when every window has passed'], edits: one(RECEIVE, "    if (all.some((one) => one.kind === 'void')) return waiting();\n", '') },
  { id: 'U5a', row: 'U5', what: 'the range check out', test: T.receive, red: ['draws nothing from a value out of range'], edits: one(RECEIVE, ' || f < 0 || f > 1', '') },
  { id: 'U5b', row: 'U5', what: 'the disabled check out', test: T.receive, red: ['draws nothing from a disabled bucket'], edits: one(RECEIVE, 'bucket === undefined || bucket.disabled || bucket.amount', 'bucket === undefined || bucket.amount') },
  { id: 'U5c', row: 'U5', what: 'the amount check out', test: T.receive, red: ['draws nothing from a bucket that states an amount'], edits: one(RECEIVE, 'bucket === undefined || bucket.disabled || bucket.amount', 'bucket === undefined || bucket.disabled') },
  { id: 'U5d', row: 'U5', what: 'a full bucket keeps its reset', test: T.receive, red: ['draws a full bucket at 0 with NO reset'], edits: one(RECEIVE, 'const reset = f === 1 ? null : bucket.r;', 'const reset = bucket.r;') },
  { id: 'U6a', row: 'U6', what: 'merged per bucket across files', test: T.receive, red: ['draws every bucket of the newest file and none of an older one'],
    edits: one(RECEIVE, '    best = { ...reading, at };', '    best = { ...reading, at, buckets: { ...(files.map((x) => parseAntigravityFile(x.text)?.buckets ?? {}).reduce((x, y) => ({ ...x, ...y }), {})), ...reading.buckets } };') },
  { id: 'U6b', row: 'U6', what: 'a file with no account is a reading', test: T.receive, red: ['IGNORES A FILE WITH NO ACCOUNT'], edits: one(RECEIVE, "  if (typeof hash !== 'string' || !HASH.test(hash)) return null;\n", "  if (typeof hash !== 'string') obj['h'] = '';\n") },
  { id: 'U6c', row: 'U6', what: 'a future time stands', test: T.receive, red: ['counts a future time as now, ONCE'], edits: one(RECEIVE, '    } else if (at > now) {', '    } else if (at > now + 1e15) {') },
  { id: 'U6d', row: 'U6', what: 'removing the newest session brings the older one back', test: T.service, red: ['removing the newest session does not bring the older one back'], edits: one(RECEIVE, '  return next.at >= held.at ? next : held;', '  return next;') },
  { id: 'U7', row: 'U7', what: 'a sticky lowest', test: T.service, red: ['follows an alternation step for step'],
    edits: one(RECEIVE, '  return next.at >= held.at ? next : held;', "  return next.at >= held.at && (next.buckets['gemini-5h']?.f ?? 0) <= (held.buckets['gemini-5h']?.f ?? 1) ? next : held;") },
  { id: 'U8', row: 'U8', what: 'the pulse composes every row afresh', test: T.service, red: ["repeats Claude's and Codex's last ANSWERED rows while a read is half done"], edits: one(SERVICE, '      deps.onChanged?.({ at: now, providers });', '      deps.onChanged?.(compose());') },
  { id: 'U8b', row: 'U8', what: 'the pulse sends before any answer', test: T.service, red: ['tells nothing before a window has been answered'], edits: one(SERVICE, '      const told = lastAnswered;\n', '      const told = lastAnswered ?? compose().providers.map((r) => emptyUsageProvider(r.provider));\n') },
  { id: 'U8c', row: 'U8', what: 'a row whose switch went off stays on the broadcast', test: T.service, red: ['empties a row whose switch has gone off since'], edits: one(SERVICE, '        if (!on[row.provider]) return emptyUsageProvider(row.provider);\n        if (!usageIsReceiver', '        if (!usageIsReceiver') },
  { id: 'U8d', row: 'U8', what: 'the pulse looks behind a window', test: T.service, red: ['opens nothing while no window is in front'], edits: one(SERVICE, '      if (!deps.receiver.focused()) return true;\n', '') },
  { id: 'U9a', row: 'U9', what: 'the folder read before the switch is asked', test: T.service, red: ['reads no folder, on read, refresh, current, pulse or shutdown', 'takes the numbers off and clears the folder once'], edits: one(SERVICE, "        if (on[provider]) receive(now);\n        else receiverOff();", "        receive(now);\n        if (!on[provider]) receiverOff();") },
  { id: 'U9b', row: 'U9', what: 'off keeps the files', test: T.service, red: ['takes the numbers off and clears the folder once'], edits: one(SERVICE, '      deps.receiver.clear();', '      void deps.receiver;') },
  { id: 'U9c', row: 'U9', what: 'a read after shutdown opens the folder', test: T.service, red: ['after shutdown a read answers what is held and opens nothing'], edits: one(SERVICE, '    if (stopped) return compose();', '    if (stopped) {\n      receive(deps.now());\n      return compose();\n    }') },
  { id: 'U9d', row: 'U9', what: 'the clock outlives the disposal', test: T.pulse, red: ['is cleared by the disposal'],
    edits: one('src/main/usage/ipc.ts', 'export async function disposeUsageService(): Promise<UsageShutdownReport> {\n  shuttingDown = true;\n  stopUsagePulse();', 'export async function disposeUsageService(): Promise<UsageShutdownReport> {\n  shuttingDown = true;') },
  { id: 'U10', row: 'U10', what: 'Boolean(x) for the third switch', test: T.shared, red: [''], edits: one(SETTINGS, "antigravity: obj['antigravity'] === true,", "antigravity: Boolean(obj['antigravity']),") },

  // ------------------------------------------------------------------ the launch
  { id: 'L1a', row: 'L1', what: 'spliced whatever the agent', test: T.create, red: ['every other launchable agent and a plain shell'], edits: one(CREATE, "const meterOn = (input.agent as LaunchableAgentKind) === 'antigravity' && antigravityMeterOn();", 'const meterOn = antigravityMeterOn();') },
  { id: 'L1b', row: 'L1', what: 'spliced with the switch off (both questions out)', test: T.create, red: ['antigravity, off: the bare name'],
    edits: [...one(CREATE, "=== 'antigravity' && antigravityMeterOn();", "=== 'antigravity';"), ...one(LAUNCH, '    if (!antigravityMeterOn()) return [];\n', '')] },
  { id: 'L1c', row: 'L1', what: 'a captured session spliced', test: T.create, red: ['a captured session, on'], edits: one(LAUNCH, "    if (input.captured) return none('captured');\n", '') },
  { id: 'L2a', row: 'L2', what: 'the flag recorded on the row', test: T.create, red: ['the pane has it, the row does not'],
    edits: one(CREATE, '  const [program, ...programArgs] = launchArgv;\n', '  const [program, ...programArgs] = launchArgv;\n  if (meterArgs.length > 0) deps.manifest.updateSession(id, { argv: [spec.argv[0] ?? "", ...meterArgs, ...spec.argv.slice(1)] } as never);\n  if (meterArgs.length > 0) record.argv = [spec.argv[0] ?? "", ...meterArgs, ...spec.argv.slice(1)];\n') },
  { id: 'L2b', row: 'L2', what: 'the flag after the person’s own words', test: T.create, red: ['the pane has it, the row does not'], edits: one(CREATE, '[program, ...meterArgs, ...programArgs];', '[program, ...programArgs, ...meterArgs];') },
  { id: 'L2c', row: 'L2', what: 'a spawn that fails keeps its place', test: T.create, red: ['a spawn that fails leaves no row and no place'], edits: one(CREATE, '    if (meterArgs.length > 0) forgetAntigravitySession(id);\n', '') },
  { id: 'L3', row: 'L3', what: 'the flag composed into the typed line', test: T.create, red: ['the armed resume of a row made with the switch on is the parent’s line'],
    edits: one(COMMAND, '  return shellQuoteArgv(resumeArgv);', "  return shellQuoteArgv([resumeArgv[0] ?? '', ...((resumeArgv[0] ?? '').endsWith('agy') ? ['--settings', '{}'] : []), ...resumeArgv.slice(1)]);") },
  { id: 'L4a', row: 'L4', what: 'below the floor carries it', test: T.launch, red: ['is 1.4.10, read whole'], edits: one(LAUNCH, ' || !floorHolds(version)) return', ') return') },
  { id: 'L4b', row: 'L4', what: 'a version not read whole counts', test: T.launch, red: ['is 1.4.10, read whole'], edits: one(LAUNCH, '  if (read === null || read !== version) return false;', '  if (read === null) return false;') },
  { id: 'L4c', row: 'L4', what: 'a script counts', test: T.launch, red: ['a script, and a program whose real file is not agy'], edits: one(LAUNCH, '    if (!native || basename', '    if (basename') },
  { id: 'L4d', row: 'L4', what: 'any program’s name counts', test: T.launch, red: ['a script, and a program whose real file is not agy'], edits: one(LAUNCH, 'basename(identity.real) !== AGY_PROGRAM || ', '') },
  { id: 'L4e', row: 'L4', what: 'no reading counts', test: T.launch, red: ['no reading of the file that runs'], edits: one(LAUNCH, "    if (input.probed === null) return none('session');\n    const { version, identity, native, copies } = input.probed;", "    const { version, identity, native, copies } = input.probed ?? { version: '1.6.0', native: true, copies: [], identity: { real: '/x/agy', dev: 1, ino: 1, size: 1, mtimeMs: 1, ctimeMs: 1 } as FileIdentity };") },
  { id: 'L4f', row: 'L4', what: 'a file replaced since the scan still has a reading', test: T.probed, red: ['is null once the file was replaced, rewritten or touched since the scan'], edits: one(DETECTION, '    if (version === null || one?.readFrom === undefined || !sameFile(one.readFrom, now)) continue;', '    if (version === null) continue;') },
  { id: 'L4g', row: 'L4', what: 'a bare name that finds another file still has a reading', test: T.probed, red: ['a bare name that finds another file'], edits: one(DETECTION, '  if (spawn !== undefined && !bareNameSpawnRuns(spawn, bin)) return null;\n  const now = fileIdentityOf(bin);\n  if (now === null) return null;', '  const now = fileIdentityOf(bin);\n  if (now === null) return null;') },
  { id: 'L4h', row: 'L4', what: 'the same file is read again and again', test: T.probed, red: ['a probe that answers nothing is not asked of that file again'], edits: one(DETECTION, '    if (rereadAsked.has(key)) return;\n', '') },
  { id: 'L4i', row: 'L4', what: 'a replaced file is never read again', test: T.create, red: ['a file replaced since the scan: that session none, exactly one reading more'], edits: one(CREATE, "      void rereadAgent('antigravity').catch(() => undefined);", '      void 0;') },
  { id: 'L5a', row: 'L5', what: 'the single dash spelling out', test: T.launch, red: ['stands aside'], edits: one(LAUNCH, 'const OWN_SETTINGS_FLAG = /^--?(', 'const OWN_SETTINGS_FLAG = /^--(') },
  { id: 'L5b', row: 'L5', what: 'gemini_dir out', test: T.launch, red: ['stands aside'], edits: one(LAUNCH, '(settings|gemini[-_]dir)', '(settings)') },
  { id: 'L5c', row: 'L5', what: 'the = spelling out', test: T.launch, red: ['stands aside'], edits: one(LAUNCH, 'gemini[-_]dir)(=|$)/;', 'gemini[-_]dir)$/;') },
  { id: 'L6a', row: 'L6', what: 'enabled: false read as owned', test: T.own, red: ['→ not owned'], edits: one(OWN, "    return (line as { enabled?: unknown }).enabled !== false;", '    return true;') },
  { id: 'L6b', row: 'L6', what: 'a parse failure read as absent', test: T.own, red: ['→ Tortie stands aside'], edits: one(OWN, "    return (line as { enabled?: unknown }).enabled !== false;\n  } catch {\n    return true;", "    return (line as { enabled?: unknown }).enabled !== false;\n  } catch {\n    return false;") },
  { id: 'L6c', row: 'L6', what: 'unreadable read as absent', test: T.own, red: ['→ Tortie stands aside'], edits: one(OWN, '  if (text === null) return true;', '  if (text === null) return false;') },
  { id: 'L6d', row: 'L6', what: 'never asked at all', test: T.launch, red: ['and for his own status line in his settings file'], edits: one(LAUNCH, "    if (agyOwnsStatusLine(input.home)) return none('own-status-line');\n", '') },
  { id: 'L7a', row: 'L7', what: 'the window out', test: T.launch, red: ['and 11 s do not'], edits: one(LAUNCH, '    if (Date.now() - one.at > BAD_START_MS) return;\n', '') },
  { id: 'L7b', row: 'L7', what: 'a signal counts', test: T.launch, red: ['a signal and 11 s do not'], edits: one(LAUNCH, '    if (signal !== undefined && signal.length > 0) return;\n', '') },
  { id: 'L7c', row: 'L7', what: 'any exit counts, a Ctrl-C too', test: T.launch, red: ['0, 128, 130, 137'], edits: one(LAUNCH, '    if (exitCode === undefined || exitCode < 1 || exitCode > 127) return;\n', '') },
  { id: 'L7d', row: 'L7', what: 'a changed file stays held', test: T.launch, red: ['survives a new process, and a changed file clears it there'], edits: one(LAUNCH, '  if (sameFile(heldGuard, identity)) return true;', '  if (heldGuard !== null) return true;') },
  { id: 'L7e', row: 'L7', what: 'forgotten by a new process', test: T.launch, red: ['survives a new process'], edits: one(LAUNCH, '    heldGuard = readAntigravityGuard();\n', '') },
  { id: 'L7f', row: 'L7', what: 'never heard', test: T.core, red: ['reaches the guard with the reaper’s own two facts'], edits: one(CORE, '      noteAntigravityDeath(sessionId, exitCode, deadSignal);\n', '') },
  { id: 'L8', row: 'L8', what: 'a fourth key', test: T.script, red: ['holds exactly statusLine with three keys'], edits: one(SCRIPT, '      stack_with_default: true\n', "      stack_with_default: true,\n      enabled: true\n") },

  { id: 'L7g', row: 'L7', what: 'off keeps the bad start it held', test: T.launch, red: ['turning the switch off forgets it'], edits: one(LAUNCH, 'export function clearAntigravityGuard(): void {\n  heldGuard = null;\n', 'export function clearAntigravityGuard(): void {\n') },
  { id: 'L7h', row: 'L7', what: 'off never reaches the guard', test: T.pulse, red: ['forgets a bad start with the folder'], edits: one(IPC, '      clearAntigravityGuard();\n', '') },
  { id: 'U9e', row: 'U9', what: 'off before any read keeps the place a create made', test: T.service, red: ['clears once too when a create made a place'], edits: one(SERVICE, '    if (!receiving && !deps.receiver.opened()) return;', '    if (!receiving) return;') },
  { id: 'L4j', row: 'L4', what: 'another agy below the floor does not count', test: T.create, red: ['another agy on the PATH below the floor'], edits: one(LAUNCH, "    if (byShellAndName && !copies.every((copy) => copy !== null && floorHolds(copy))) return none('version');\n", '') },
  { id: 'L4k', row: 'L4', what: 'another agy counts for a file that is known', test: T.launch, red: ['a plain create, which the person’s shell starts'], edits: one(LAUNCH, '    if (byShellAndName && !copies', '    if (!copies') },
  { id: 'L4l', row: 'L4', what: 'the other copies are never handed over', test: T.create, red: ['another agy on the PATH below the floor'], edits: one(DETECTION, "(one.agent?.shadowed ?? []).map((copy) => copy.version);", '[] as string[];') },
  { id: 'L9a', row: 'L9', what: 'a plain create taken off the person’s shell', test: T.create, red: ['a program with nothing after it stays ONE element'], edits: one(CREATE, '[antigravityShellLine(program, meterArgs)]', '[program, ...meterArgs]') },
  { id: 'L9b', row: 'L9', what: 'the value handed over as JSON.stringify spells it', test: T.script, red: ['every shell on this Mac hands agy the two words', 'the value holds nothing any shell reads'], edits: one(SCRIPT, '  return quotable(\n', '  return (\n') },
  { id: 'L9c', row: 'L9', what: 'csh’s own character left in', test: T.script, red: ['the value holds nothing any shell reads'], edits: one(SCRIPT, "/['!]|[^", "/[']|[^") },
  { id: 'L9d', row: 'L9', what: 'JSON’s own escapes left as they are', test: T.script, red: ['the value holds nothing any shell reads'], edits: one(SCRIPT, "    .replace(/\\\\([^u])/g, (_all, c: string) => hex(plain[c] ?? c))\n", '') },
  { id: 'L9e', row: 'L9', what: 'the value not quoted', test: T.script, red: ['every shell on this Mac hands agy the two words'], edits: one(SCRIPT, "word : `'${word}'`", 'word : word') },
  { id: 'L10a', row: 'L10', what: 'any command that ends in the script’s line is a run', test: T.script, red: ['and nothing else'], edits: one(SCRIPT, '    / -c $/.test(command.slice(0, Math.max(0, command.indexOf(COMMAND_HEAD)))) &&\n', '') },
  { id: 'L10b', row: 'L10', what: 'any command that begins as the script’s line is a run', test: T.script, red: ['and nothing else'], edits: one(SCRIPT, '    command.endsWith(`${SCRIPT_TAIL}${COMMAND_TAIL}`)\n', '    command.length > 0\n') },
  { id: 'L10c', row: 'L10', what: 'any --settings is Tortie’s', test: T.script, red: ['and nothing else'], edits: one(SCRIPT, `  return command.includes('--settings {"statusLine":{"type":"command","command":"trap ') &&\n    command.includes('/antigravity-usage/status.sh');`, "  return command.includes('--settings');") },

  // ------------------------------------------------------------------ a run is not a tool
  { id: 'A1a', row: 'A1', what: 'the runs are read as tools, as before the fix round', test: T.runs, red: ['in every shape a run can be met'], edits: one(MONITOR, 'proc: tables.get(e.session.id) ?? proc,', 'proc,') },
  { id: 'A1b', row: 'A1', what: 'asked of an agy with no flag', test: T.runs, red: ['under an agy whose line shows no flag', 'a child of a child that has gone is one'], edits: one(RUNS, '  if (parent === null || !carriesAntigravityStatusLine(parent)) return false;\n', '  if (parent === null) return false;\n') },
  { id: 'A1c', row: 'A1', what: 'a run that has gone is a tool', test: T.runs, red: ['in every shape a run can be met'], edits: one(RUNS, '  return command === null || command === parent || isEnding(command);', '  return command === parent || isEnding(command ?? \'\');') },
  { id: 'A1d', row: 'A1', what: 'a run that is ending is a tool', test: T.runs, red: ['in every shape a run can be met'], edits: one(RUNS, ' || isEnding(command);', ';') },
  { id: 'A1e', row: 'A1', what: 'a run that has not started its program is a tool', test: T.runs, red: ['in every shape a run can be met'], edits: one(RUNS, 'command === null || command === parent ||', 'command === null ||') },
  { id: 'A1f', row: 'A1', what: 'every child of a flagged agy is a run', test: T.runs, red: ['a tool of a flagged agy reads running', 'a command that only names the script'], edits: one(RUNS, '  return command === null || command === parent || isEnding(command);', '  return true;') },
  { id: 'A1g', row: 'A1', what: 'every agent is asked', test: T.runs, red: ['no other agent is asked'], edits: one(MONITOR, "        if (e.session.agent !== 'antigravity') return;\n        const leaders", '        const leaders') },
  { id: 'A1i', row: 'A1', what: 'the run by its own line forgotten', test: T.runs, red: ['in every shape a run can be met'], edits: one(RUNS, '  if (command !== null && isAntigravityStatusRun(command)) return true;\n', '') },
  { id: 'A1h', row: 'A1', what: 'a tool is asked about on every tick', test: T.runs, red: ['a tool of a flagged agy reads running'], edits: one(MONITOR, '              else if (command !== null && parent !== null) tools.add(pid);\n', '') },

  // ------------------------------------------------------------------ the script
  { id: 'S1a', row: 'S1', what: 'the charset of the reset widened', test: T.script, red: ['every hostile payload leaves its line, or nothing'], edits: one(SCRIPT, 't~/^"[0-9TZ:.+-]+"$/', 't~/^"[^"]+"$/') },
  { id: 'S1b', row: 'S1', what: 'the address at any depth', test: T.script, red: ['every hostile payload leaves its line, or nothing'], edits: one(SCRIPT, ' if(n==0)return\n', ' if(n==0)return\n if(key[n]=="email"&&k=="s")mail=t\n') },
  { id: 'S1c', row: 'S1', what: 'a bucket at any depth of the quota', test: T.script, red: ['every hostile payload leaves its line, or nothing'], edits: [...one(SCRIPT, ' if(key[1]!="quota")return\n q=key[2]\n', ' if(n<3||key[n-2]!="quota")return\n q=key[n-1];key[3]=key[n]\n'), ...one(SCRIPT, ' if(n==2){wipe(q);return}\n if(n!=3||typ[3]!="{")return\n', '')] },
  { id: 'S1d', row: 'S1', what: 'the plan word takes anything', test: T.script, red: ['every hostile payload leaves its line, or nothing'], edits: one(SCRIPT, 't~/^"[A-Za-z][A-Za-z0-9 _-]*"$/', 't~/^"[^"]*"$/') },
  { id: 'S1e', row: 'S1', what: 'a number JSON refuses is kept', test: T.script, red: ['every hostile payload leaves its line, or nothing'], edits: one(SCRIPT, 't~/^-?(0|[1-9][0-9]*)(', 't~/^-?([0-9]+)(') },
  { id: 'S1f', row: 'S1', what: 'a document that did not close is believed', test: T.script, red: ['every hostile payload leaves its line, or nothing'], edits: one(SCRIPT, ' if(!done||mail=="")exit\n', ' if(mail=="")exit\n') },
  { id: 'S1g', row: 'S1', what: 'no account is written all the same', test: T.script, red: ['every hostile payload leaves its line, or nothing'], edits: one(SCRIPT, ' if(!done||mail=="")exit\n', ' if(!done)exit\n if(mail=="")mail="\\"\\""\n') },
  { id: 'S1h', row: 'S1', what: 'an odd disabled is not disabled', test: T.script, red: ['every hostile payload leaves its line, or nothing'], edits: one(SCRIPT, 'di[q]=t;else di[q]="true"}', 'di[q]=t;else delete di[q]}') },
  { id: 'S1i', row: 'S1', what: 'the address is kept beside the hash', test: T.script, red: ['no address byte left anywhere'], edits: one(SCRIPT, 'tt_l="{\\\\"v\\\\":1,\\\\"h\\\\":\\\\"$tt_h\\\\",$tt_b}"', 'tt_l="{\\\\"v\\\\":1,\\\\"h\\\\":\\\\"$tt_h\\\\",\\\\"m\\\\":$tt_m$tt_b}"'), also: one(SCRIPT, 'tt_m=\ntt_o=\n', 'tt_o=\n') },
  { id: 'S1j', row: 'S1', what: 'the hash is not salted', test: T.script, red: ['two accounts read as two hashes'], edits: one(SCRIPT, '"$tt_k$tt_m"', '"$tt_m"') },
  { id: 'S1k', row: 'S1', what: 'an unmanaged run writes', test: T.script, red: ['it writes only for a managed session'], edits: one(SCRIPT, '[ "\\${GMUX_MANAGED:-}" = 1 ] || exit 0\n', '') },
  { id: 'S1l', row: 'S1', what: 'a place main did not make is written', test: T.script, red: ['it writes only for a managed session, only at the place main made'],
    edits: [...one(SCRIPT, '[ -f "$tt_f" ] || exit 0\n', ''), ...one(SCRIPT, ' && [ -f "$tt_f" ] && /bin/mv', ' && /bin/mv')] },
  { id: 'S2a', row: 'S2', what: 'the trap out', test: T.script, red: ['answers 0 and says nothing in every one'], edits: one(SCRIPT, "\"trap 'exit 0' 0; exec", '"exec') },
  { id: 'S2b', row: 'S2', what: 'the outputs left open', test: T.script, red: ['answers 0 and says nothing in every one'], edits: one(SCRIPT, 'exec >/dev/null 2>&1; [ -r ";', '[ -r ";') },
  { id: 'S2c', row: 'S2', what: 'the last exit 0 and the trap out', test: T.script, red: ['answers 0 and says nothing in every one'], edits: [...one(SCRIPT, "\"trap 'exit 0' 0; exec", '"exec'), ...one(SCRIPT, "const COMMAND_TAIL = '; exit 0';", "const COMMAND_TAIL = '';")] },
  { id: 'S2d', row: 'S2', what: 'the outputs closed on the sourcing alone, as before the fix round, and the failed write left where it was', test: T.script, red: ['/bin/sh: answers 0, says nothing, keeps the old line'], edits: [...one(SCRIPT, 'exec >/dev/null 2>&1; [ -r ";', '[ -r ";'), ...one(SCRIPT, "const COMMAND_TAIL = '; exit 0';", "const COMMAND_TAIL = ' >/dev/null 2>&1; exit 0';"), ...one(SCRIPT, '/bin/rm -f "$tt_t"\n', '')] },
  { id: 'S2e', row: 'S2', what: 'a write that could not land leaves its name behind', test: T.script, red: ['/bin/sh: answers 0, says nothing, keeps the old line', '/bin/dash: answers 0, says nothing, keeps the old line'], edits: one(SCRIPT, '/bin/rm -f "$tt_t"\n', '') },
  { id: 'S3a', row: 'S3', what: 'the countdown kept', test: T.script, red: ['a payload whose countdown moved writes nothing'],
    edits: [...one(SCRIPT, ' else if(key[3]=="reset_time")', ' else if(key[3]=="reset_in_seconds")cd[q]=t\n else if(key[3]=="reset_time")'), ...one(SCRIPT, ',\\"d\\":" ((id[i] in di)', ',\\"c\\":" cd[id[i]] ",\\"d\\":" ((id[i] in di)')] },
  { id: 'S3b', row: 'S3', what: 'an unchanged line is written again', test: T.script, red: ['a payload whose countdown moved writes nothing'], edits: one(SCRIPT, '[ "$tt_l" != "$tt_v" ] || exit 0\n', '') },
  { id: 'S3c', row: 'S3', what: 'the fractions compared at four decimals', test: T.script, red: ['every run of both recordings holds what that run must hold'], edits: one(SCRIPT, '[ "$tt_l" != "$tt_v" ] || exit 0\n', 'tt_l4=$(printf %s "$tt_l" | /usr/bin/awk \'{gsub(/[0-9][0-9]*,"r"/,",r");print}\')\ntt_v4=$(printf %s "$tt_v" | /usr/bin/awk \'{gsub(/[0-9][0-9]*,"r"/,",r");print}\')\n[ "$tt_l4" != "$tt_v4" ] || exit 0\n') },
  { id: 'S4', row: 'S4', what: 'written in place', test: T.script, red: ['200 SIGKILLs of the sh'], edits: one(SCRIPT, `printf '%s\\\\n' "$tt_l" >"$tt_t" && [ -f "$tt_f" ] && /bin/mv -f "$tt_t" "$tt_f" && exit 0\n/bin/rm -f "$tt_t"`, `printf '%s' "$tt_l" >"$tt_f"; /usr/bin/awk 'BEGIN{exit}' </dev/null; printf '\\\\n' >>"$tt_f"`) },
  { id: 'S5a', row: 'S5', what: 'a here-document in', test: T.script, red: ['names no other program, no clock, no network, no home and no here-document'], edits: one(SCRIPT, "tt_p=\ntt_l=\ntt_q=\ntt_c=0\nwhile IFS=", "tt_p=\ntt_l=\ntt_q=\ntt_c=0\n: <<X\nX\nwhile IFS=") },
  { id: 'S5b', row: 'S5', what: 'a background child', test: T.script, red: ['names no other program'], edits: one(SCRIPT, "umask 077\nLC_ALL=C\n", "umask 077\n: &\nLC_ALL=C\n") },
  { id: 'S5c', row: 'S5', what: 'a clock', test: T.script, red: ['names no other program, no clock'], edits: one(SCRIPT, "umask 077\nLC_ALL=C\n", "umask 077\ntt_v=$(/bin/date)\nLC_ALL=C\n") },

  // ------------------------------------------------------------------ the folder
  { id: 'F1a', row: 'F1', what: 'off removes the folder whole, a stranger’s file with it', test: T.folder, red: ['off removes every name that is this folder’s own, and leaves a folder that holds anything else'], edits: one(FOLDER, '    rmdirSync(dir);', "    (process.getBuiltinModule('node:fs') as typeof import('node:fs')).rmSync(dir, { recursive: true, force: true });") },
  { id: 'F1b', row: 'F1', what: 'the boot sweep keeps an unknown session’s file', test: T.folder, red: ['the boot sweep takes the unknown ids'], edits: one(FOLDER, "unrenamed || (known !== null && !known.has(found[1] ?? ''))", 'unrenamed') },
  { id: 'F1c', row: 'F1', what: 'a session list that cannot be read removes everything', test: T.folder, red: ['a session list that cannot be read lists nothing and removes nothing'], edits: one(FOLDER, "(known !== null && !known.has(found[1] ?? ''))", "!known?.has(found[1] ?? '')") },
  { id: 'F1d', row: 'F1', what: 'a removed session’s file stays', test: T.core, red: ['takes its file with it'], edits: one(CORE, '    forgetAntigravitySession(sessionId);', '    void sessionId;') },
  { id: 'F1e', row: 'F1', what: 'a removed row counts as a session', test: T.core, red: ['keeps every row a person has and drops a removed one'], edits: one(CORE, "        .filter((rec) => rec.status !== 'discarded')\n        .map((rec) => rec.id)\n    );", '        .map((rec) => rec.id)\n    );') },
  { id: 'F1f', row: 'F1', what: 'a link is followed', test: T.folder, red: ['nothing is removed through a link standing where the folder should be'], edits: one(FOLDER, '    return st.isDirectory() && (process.getuid', "    return (st.isDirectory() || st.isSymbolicLink()) && (process.getuid") },
  { id: 'F1g', row: 'F1', what: 'an unknown id is listed', test: T.folder, red: ['answers known ids alone'], edits: one(FOLDER, '    if (!known.has(id)) {\n      unknown += 1;\n      continue;\n    }', '    if (!known.has(id)) unknown += 1;') },
  { id: 'F1h', row: 'F1', what: 'listed before the boot says which ids are known', test: T.folder, red: ['lists nothing before boot says which ids are known'], edits: one(FOLDER, "  if (known === null) return [];\n", '') },

  // ------------------------------------------------------------------ the face and Settings
  { id: 'R1a', row: 'R1', what: 'the null check of the login control out', test: T.meter, red: ['draws Choose login for Claude and Codex and not for Antigravity'], edits: one(METER, '{onChooseLogin === null || login === null ? null : (', '{onChooseLogin === null ? null : (') },
  { id: 'R1b', row: 'R1', what: 'a login line drawn for a row with none', test: T.meter, red: ['draws no login line, even over a snapshot that names one'], edits: one(METER, '  const login = usageLoginLine(hasLogin ? p.login : null, email);', '  const login = usageLoginLine(p.login, email);') },
  { id: 'R1c', row: 'R1', what: 'the second group left off the card', test: T.meter, red: ['names the second group after the two windows of the face'], edits: one(METER, '      out.push(`${p.second.label} ${text}`);', '      void text;') },
  { id: 'R2a', row: 'R2', what: 'the last read failed, said of a row nobody reads', test: T.meter, red: ['says the age for a row nobody asks for, and never a failure'], edits: one(METER, '    const mark = usageIsReceiver(p.provider)\n', '    const mark = false\n') },
  { id: 'R2b', row: 'R2', what: 'every reason waits for a session', test: T.meter, red: ['says why it waits'], edits: one(COPY, "      return USAGE_WAITING_LINE[waitingFor ?? 'session'];", "      return USAGE_WAITING_LINE['session'];") },
  { id: 'R3a', row: 'R3', what: 'the control stays when nothing can be refreshed', test: T.meter, red: ['is absent when every drawn row is one nobody asks for'], edits: one(METER, '  return shown.some((p) => !usageIsReceiver(p.provider));', '  return shown.length > 0;') },
  { id: 'R3b', row: 'R3', what: 'the control goes when one row cannot be refreshed', test: T.meter, red: ['is there while any drawn row is one that is asked'], edits: one(METER, '  return shown.some((p) => !usageIsReceiver(p.provider));', '  return shown.every((p) => !usageIsReceiver(p.provider));') },
  // R4a and R4c: Phase 374.1 (c5f941d8) took the Google line out and named the
  // row's two remaining claims, so Phase 375 points both arms at them.
  { id: 'R4a', row: 'R4', what: 'a note drawn under the switch', test: T.settings, red: ['draws no note under it, on or off'], edits: one(GROUP, '          noteWarns={false}\n', '          note={USAGE_ANTIGRAVITY_CAPTION}\n          noteWarns={false}\n') },
  { id: 'R4b', row: 'R4', what: 'shipped on', test: T.settings, red: ['ships off, and draws off'], edits: one(SETTINGS, '    antigravity: false,\n', '    antigravity: true,\n') },
  { id: 'R4c', row: 'R4', what: 'the switch says nothing of what it does', test: T.settings, red: ['says what turning it on does, in the shape of the Claude and Codex rows'], edits: one(GROUP, '          caption={USAGE_ANTIGRAVITY_CAPTION}\n', "          caption=\"\"\n") }
];

// ---------------------------------------------------------------------------

const only = (process.env['P374_ONLY'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const arms = only.length === 0 ? ARMS : ARMS.filter((a) => only.includes(a.id));
// A name that is no arm is a run of nothing, and nothing is never a pass.
const strangers = only.filter((o) => !ARMS.some((a) => a.id === o));
if (strangers.length > 0) {
  say(`FAIL: P374_ONLY names no arm called ${strangers.join(', ')}`);
  process.exit(2);
}
let failed = 0;
const bad = (what) => {
  failed += 1;
  say(`RED   ${what}`);
};
for (const r of ROWS) if (!ARMS.some((a) => a.row === r)) bad(`no arm for row ${r}`);
for (const a of ARMS) if (!ROWS.includes(a.row)) bad(`${a.id} names ${a.row}, which is no row`);
if (new Set(ARMS.map((a) => a.id)).size !== ARMS.length) bad('two arms share an id');

const base = (process.env['P374_SCRATCH'] ?? '').trim() || tmpdir();
mkdirSync(base, { recursive: true });
const clone = realpathSync(mkdtempSync(join(base, `p374-ablation-${String(process.pid)}-`)));
const clean = () => rmSync(clone, { recursive: true, force: true });
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    clean();
    process.exit(130);
  });
}
const editedFiles = [...new Set(ARMS.flatMap((a) => [...a.edits, ...(a.also ?? [])]).map((e) => e.file))];
const before = new Map(editedFiles.map((f) => [f, sha(readFileSync(join(REPO, f)))]));

/** Run vitest over files in the clone; `{ ran, red: [full names], passed }`. */
function vitest(files) {
  const out = join(clone, 'vitest.json');
  rmSync(out, { force: true });
  const r = spawnSync(process.execPath, [join(clone, 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--reporter=json', `--outputFile=${out}`, ...files], { cwd: clone, encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, CI: '1' } });
  if (!existsSync(out)) return { ran: false, red: [], passed: 0, said: String(r.stderr ?? '').slice(-400) };
  const json = JSON.parse(readFileSync(out, 'utf8'));
  const tests = json.testResults.flatMap((f) => f.assertionResults);
  const broken = json.testResults.filter((f) => f.status === 'failed' && f.assertionResults.length === 0);
  // A row that died because the EDIT itself cannot run (a name it misses, text that does not parse) says nothing of the clause.
  const cannotRun = (t) => /\bReferenceError\b|\bSyntaxError: (?!Unexpected .*JSON)|is not defined\b|Transform failed/.test(String((t.failureMessages ?? [])[0] ?? '').split('\n')[0]);
  return { ran: broken.length === 0, red: tests.filter((t) => t.status === 'failed' && !cannotRun(t)).map((t) => t.fullName), crashed: tests.filter((t) => t.status === 'failed' && cannotRun(t)).map((t) => `${t.fullName}: ${String(t.failureMessages[0]).split('\n')[0].slice(0, 160)}`), names: tests.map((t) => t.fullName), passed: tests.filter((t) => t.status === 'passed').length, said: broken.map((f) => `${f.name}: ${String(f.message).slice(0, 300)}`).join('; ') };
}

const started = Date.now();
try {
  for (const d of ['src', 'build', 'resources']) {
    const r = spawnSync('/bin/cp', ['-Rc', join(REPO, d), join(clone, d)], { encoding: 'utf8', timeout: 300_000 });
    if (r.status !== 0) throw new Error(`cp -Rc ${d}: ${r.stderr}`);
  }
  for (const n of readdirSync(REPO)) if (/^(tsconfig.*\.json|vitest\.config\.ts|electron\.vite\.config\.ts|package\.json)$/.test(n)) copyFileSync(join(REPO, n), join(clone, n));
  symlinkSync(join(REPO, 'node_modules'), join(clone, 'node_modules'));
  const all = [...new Set(arms.map((a) => a.test))];
  const control = vitest(all);
  if (!control.ran || control.red.length > 0) throw new Error(`the unedited control is red: ${control.said} ${control.red.slice(0, 8).join(' | ')}`);
  say(`control green: ${String(control.passed)} rows in ${String(all.length)} files`);
  for (const a of arms) {
    const edits = [...a.edits, ...(a.also ?? [])];
    const bytes = new Map(edits.map((e) => [e.file, readFileSync(join(clone, e.file))]));
    let applied = true;
    for (const e of edits) {
      const text = readFileSync(join(clone, e.file), 'utf8');
      const n = text.split(e.from).length - 1;
      if (n !== 1) {
        bad(`${a.id}: its needle matches ${e.file} ${String(n)} times: ${JSON.stringify(e.from.slice(0, 80))}`);
        applied = false;
        break;
      }
      writeFileSync(join(clone, e.file), text.replace(e.from, () => e.to));
    }
    if (applied) {
      const r = vitest([a.test]);
      const missing = a.red.filter((o) => !control.names.some((n) => n.includes(o)));
      const green = a.red.filter((o) => !r.red.some((n) => n.includes(o)));
      if (missing.length > 0) bad(`${a.id}: no row is called ${missing.map((m) => JSON.stringify(m)).join(', ')}`);
      else if (!r.ran && r.red.length === 0) bad(`${a.id}: the edited source did not run: ${r.said}`);
      else if (green.length > 0) bad(`${a.id} (${a.what}): its owner stayed green: ${green.map((g) => JSON.stringify(g)).join(', ')}; red: ${r.red.slice(0, 4).join(' | ') || 'nothing'}${r.crashed?.length > 0 ? `; the edit could not run: ${r.crashed[0]}` : ''}`);
      else say(`ok    ${a.id} ${a.row}: ${a.what}; red: ${r.red.slice(0, 3).join(' | ')}${r.red.length > 3 ? ` and ${String(r.red.length - 3)} more` : ''}`);
    }
    for (const [f, b] of bytes) {
      writeFileSync(join(clone, f), b);
      if (sha(readFileSync(join(clone, f))) !== before.get(f)) throw new Error(`${a.id}: ${f} was not put back`);
    }
  }
  const again = vitest(all);
  if (!again.ran || again.red.length > 0) bad(`the control is red at the end: ${again.red.slice(0, 5).join(' | ')}`);
} catch (err) {
  bad(String(err?.message ?? err));
} finally {
  clean();
}
for (const [f, h] of before) if (sha(readFileSync(join(REPO, f))) !== h) bad(`${f} moved in the worktree while this ran`);
const secs = ((Date.now() - started) / 1000).toFixed(0);
say(failed === 0 ? `PASS: ${String(arms.length)} arms, each red on the row that owns it, over ${String(new Set(arms.map((a) => a.row)).size)} rows; the control green before and after; ${secs} s` : `FAIL: ${String(failed)} in ${secs} s`);
process.exitCode = failed === 0 ? 0 : 1;
