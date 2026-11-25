#!/usr/bin/env node
/**
 * `npm run ablation:p375`. THE ATTACK ON PHASE 375'S OWN RULES
 * (build/p375/SPEC.md §7.1, §7.3): each clause that keeps the Antigravity
 * address where it may go taken out of the SHIPPING source, one at a time, in
 * a clone, and the row that owns it required red BY ITS ID.
 *
 * Several minutes. It launches no Electron, starts no tmux server, spawns no
 * agent, makes no request and reads nothing under the person's home. It starts
 * nothing but `cp` and this node running vitest, which itself runs `/bin/sh`,
 * `/bin/dash` and the three programs the generated script names, over scratch
 * folders.
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
 *   - THE OWNER IS A ROW ID. Every §7.1 title begins with its id (`A1: …`),
 *     so an arm names its row and nothing else: the files holding that row are
 *     found by its id, and at least one test of that row (its own title, or a
 *     `describe` around it, begins with the id) must go red, and not because
 *     the edit itself could not run (a ReferenceError or a SyntaxError is not
 *     the clause speaking). Other rows going red too is printed, and is not a
 *     failure.
 *   - An UNEDITED CONTROL over every file the arms reach is green first, and
 *     again at the end; and the CONTROL ARMS, edits that change no rule (a
 *     comment, a blank line), must leave every row of their files green.
 *   - Every row of §7.1 has at least one arm (`ROWS`).
 *
 * Usage:
 *   node build/p375/ablation.mjs
 *   P375_ONLY=A1a,B6b node build/p375/ablation.mjs    named arms only
 *   P375_SCRATCH=<dir>                               where the clone is made
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[ablation:p375]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const SCRIPT = 'src/main/usage/antigravity/script.ts';
const RECEIVE = 'src/main/usage/antigravity/receive.ts';
const FOLDER = 'src/main/usage/antigravity/folder.ts';
const SERVICE = 'src/main/usage/service.ts';
const IPC = 'src/main/usage/ipc.ts';
const SHARED = 'src/shared/usage.ts';
const METER = 'src/renderer/app/UsageMeter.tsx';
const GROUP = 'src/renderer/settings/UsageGroup.tsx';
const COPY = 'src/renderer/settings/usage-copy.ts';

/** Every row of SPEC §7.1. Each must have an arm. */
const ROWS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];

const one = (file, from, to) => [{ file, from, to }];

/** The parent's KEPT sentence (8d58c391), by value. */
const PARENT_KEPT = '"Claude and Codex numbers stay in memory until you quit. Antigravity\'s stay in Tortie\'s own folder until you turn that meter off or remove the session. No part of a login reaches a log or a file."';

/** `{ id, row, what, edits }`, one clause each; `control: true` arms change no rule and must leave every row green. */
const ARMS = [
  // ------------------------------------------------------------------ the script (A)
  { id: 'A1a', row: 'A1', what: 'the class widened to anything but a quote', edits: one(SCRIPT, 'ad="^\\"[A-Za-z0-9._%+" sq "-]+@[A-Za-z0-9-]+([.][A-Za-z0-9-]+)+\\"$"', 'ad="^\\"[^\\"]+@[^\\"]+\\"$"') },
  { id: 'A1b', row: 'A1', what: 'the 256 bound out', edits: one(SCRIPT, 'length(mail)<=256&&', '') },
  { id: 'A1c', row: 'A1', what: 'the local part bound out', edits: one(SCRIPT, 'if(at>=3&&at<=66)e=mail', 'e=mail') },
  { id: 'A1d', row: 'A1', what: 'the line break clause out', edits: one(SCRIPT, 'if(!nl&&length(mail)', 'if(length(mail)') },
  { id: 'A1f', row: 'A1', what: 'the line break mark kept from an earlier email', edits: one(SCRIPT, '{nl=0;if(k=="s"&&length(t)<=256)', '{if(k=="s"&&length(t)<=256)') },
  { id: 'A1e', row: 'A1', what: 'the raw token kept with no shape at all', edits: one(SCRIPT, ' if(!nl&&length(mail)<=256&&mail~ad){at=index(mail,"@");if(at>=3&&at<=66)e=mail}', ' e=mail') },
  { id: 'A2a', row: 'A2', what: '"e" written after "q"', edits: one(SCRIPT, 'print "\\"e\\":" e ",\\"p\\":" (plan==""?"null":plan) ",\\"q\\":{" o "}"', 'print "\\"p\\":" (plan==""?"null":plan) ",\\"q\\":{" o "},\\"e\\":" e') },
  { id: 'A2b', row: 'A2', what: 'the line says v 2', edits: one(SCRIPT, 'tt_l="{\\\\"v\\\\":1,', 'tt_l="{\\\\"v\\\\":2,') },
  { id: 'A3a', row: 'A3', what: 'the shell bound on the joined payload, newlines and all', edits: one(SCRIPT, '    [ $tt_c -le ${String(ANTIGRAVITY_PAYLOAD_CAP)} ] || exit 0\n    tt_p=$tt_p$tt_q$tt_l\n', '    tt_p=$tt_p$tt_q$tt_l\n    [ \\${#tt_p} -le ${String(ANTIGRAVITY_PAYLOAD_CAP)} ] || exit 0\n') },
  { id: 'A3b', row: 'A3', what: 'the reader’s cap on the payload with its newlines', edits: one(SCRIPT, ' if(bad||L>', ' if(bad||L+np-1>') },
  // The fix round: a blank line marked, and the reader parsing the marked text rather than 374's glued one.
  { id: 'A3c', row: 'A3', what: 'every blank line kept as a newline', edits: one(SCRIPT, "  '') ;;\n", "  '') tt_p=\"$tt_p\n\" ;;\n") },
  { id: 'A3d', row: 'A3', what: 'the reader parses the marked text, not the glued one', edits: one(SCRIPT, ' gsub(/\\n/,"",s);L=length(s)\n', ' L=length(s)\n') },
  { id: 'A4a', row: 'A4', what: 'written in place', edits: one(SCRIPT, 'printf \'%s\\\\n\' "$tt_l" >"$tt_t" && [ -f "$tt_f" ] && /bin/mv -f "$tt_t" "$tt_f" && exit 0\n/bin/rm -f "$tt_t"', 'printf \'%s\' "$tt_l" >"$tt_f"; /usr/bin/awk \'BEGIN{exit}\' </dev/null; printf \'\\\\n\' >>"$tt_f"') },
  { id: 'A4b', row: 'A4', what: 'the boot sweep keeps an unrenamed write of a known session', edits: one(FOLDER, "if (unrenamed || (known !== null && !known.has(found[1] ?? ''))) removeName(dir, name);", "if (known !== null && !known.has(found[1] ?? '')) removeName(dir, name);") },
  { id: 'A5a', row: 'A5', what: 'a write that could not land leaves its name behind', edits: one(SCRIPT, '/bin/rm -f "$tt_t"\nexit 0\n', 'exit 0\n') },
  { id: 'A6a', row: 'A6', what: 'tt_c not unset first', edits: one(SCRIPT, 'unset tt_p tt_l tt_o tt_m tt_b tt_h tt_v tt_f tt_s tt_t tt_k tt_c tt_q\n', 'unset tt_p tt_l tt_o tt_m tt_b tt_h tt_v tt_f tt_s tt_t tt_k tt_q\n') },
  { id: 'A6b', row: 'A6', what: 'a tt_ name exported', edits: one(SCRIPT, 'tt_c=0\nwhile', 'tt_c=0\nexport tt_l\nwhile') },

  // ------------------------------------------------------------------ main (B)
  { id: 'B1a', row: 'B1', what: 'the dot after the @ made optional', edits: one(SHARED, '[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)+$/.test(raw)', '[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*$/.test(raw)') },
  { id: 'B1b', row: 'B1', what: 'the length bound out', edits: one(SHARED, "if (typeof raw !== 'string' || raw.length > USAGE_ADDRESS_MAX) return null;", "if (typeof raw !== 'string') return null;") },
  { id: 'B2a', row: 'B2', what: 'email taken as the file’s e unchecked', edits: one(RECEIVE, "email: usageAddress(obj['e'])", "email: (obj['e'] as string | null) ?? null") },
  { id: 'B3a', row: 'B3', what: 'email: null on every row viewOf makes', edits: one(SERVICE, '    retryAfter: held.retryAfter\n  };\n}', '    retryAfter: held.retryAfter,\n    email: null as unknown as string\n  };\n}') },
  { id: 'B3b', row: 'B3', what: 'waiting carries the address', edits: one(RECEIVE, "    ...emptyUsageProvider('antigravity', 'waiting'),\n    waitingFor\n  });", "    ...emptyUsageProvider('antigravity', 'waiting'),\n    waitingFor,\n    ...(reading !== null && reading.email !== null ? { email: reading.email } : {})\n  });") },
  { id: 'B4a', row: 'B4', what: 'the address taken from an older file when the newer has none', edits: one(RECEIVE, '  for (const key of seen.keys()) if (!ahead.has(key)) seen.delete(key);\n  return best;', '  for (const key of seen.keys()) if (!ahead.has(key)) seen.delete(key);\n  if (best !== null && best.email === null) {\n    for (const f of files) {\n      const older = parseAntigravityFile(f.text);\n      if (older !== null && older.email !== null) {\n        best = { ...best, email: older.email };\n        break;\n      }\n    }\n  }\n  return best;') },
  { id: 'B5a', row: 'B5', what: 'the handler asks the service to read', edits: one(IPC, '      const row = service.current().providers.find((p) => usageIsReceiver(p.provider));', '      void service.read();\n      const row = service.current().providers.find((p) => usageIsReceiver(p.provider));') },
  { id: 'B6a', row: 'B6', what: 'no rewrite at boot', edits: one(FOLDER, '  if (scriptStands(dir)) ensureScript(dir);\n', '') },
  { id: 'B6b', row: 'B6', what: 'a fresh salt every time the script is written', edits: one(FOLDER, "const salt = (held === null ? null : saltOf(held)) ?? randomBytes(16).toString('hex');", "const salt = randomBytes(16).toString('hex');") },

  // ------------------------------------------------------------------ the face and Settings (C)
  { id: 'C1a', row: 'C1', what: 'the line drawn from the snapshot’s login for a row with none', edits: one(METER, 'const login = usageLoginLine(hasLogin ? p.login : null, email);', 'const login = usageLoginLine(p.login, email);') },
  { id: 'C2a', row: 'C2', what: 'a login provider’s own row read for an address', edits: one(METER, '  if (provider === null) return usageAddress(p.email);', '  if (provider === null || usageAddress(p.email) !== null) return usageAddress(p.email);') },
  { id: 'C3a', row: 'C3', what: 'its group’s login defaulted to a login provider', edits: one(METER, '    login: usageLoginProvider(p.provider),', "    login: usageLoginProvider(p.provider) ?? 'codex',") },
  { id: 'C4a', row: 'C4', what: 'the resting row hands the address to cardLines', edits: one(METER, "<span className=\"usage-hidden\">{cardLines(p, now).join('. ')}</span>", "<span className=\"usage-hidden\">{cardLines(p, now, undefined, p.email ?? null).join('. ')}</span>") },
  { id: 'C5a', row: 'C5', what: 'the renderer’s shape check skipped', edits: one(METER, '  if (provider === null) return usageAddress(p.email);', '  if (provider === null) return p.email ?? null;') },
  { id: 'C6a', row: 'C6', what: 'drawn while off', edits: one(GROUP, 'if (!on || shown === null) return null;', 'if (shown === null) return null;') },
  { id: 'C6b', row: 'C6', what: 'a Remove control on it', edits: one(GROUP, '{`${shown} · ${USAGE_ANTIGRAVITY_ACCOUNT_NOTE}`}\n        </span>', '{`${shown} · ${USAGE_ANTIGRAVITY_ACCOUNT_NOTE}`}\n        </span>\n        <button type="button" className="set-inline-btn">{USAGE_LOGIN_REMOVE}</button>') },
  { id: 'C7a', row: 'C7', what: 'the parent’s KEPT sentence restored', edits: one(COPY, `"Claude and Codex numbers stay in memory until you quit. Antigravity's numbers and the account they belong to stay in Tortie's own folder until you turn that meter off or remove the session. No part of a login reaches a log or any other file."`, PARENT_KEPT) },

  // ------------------------------------------------------------------ controls: edits that move no rule, every row must stay green
  { id: 'K1', row: 'A1', control: true, what: 'a comment added to the script’s module', edits: one(SCRIPT, "import { shellQuote } from '../statusline';\n", "import { shellQuote } from '../statusline';\n// ablation:p375 control: a comment and nothing else.\n") },
  { id: 'K2', row: 'B3', control: true, what: 'a comment added to the reader', edits: one(RECEIVE, '  if (reading === null) return waiting();\n', '  // ablation:p375 control.\n  if (reading === null) return waiting();\n') },
  { id: 'K3', row: 'C6', control: true, what: 'a blank line in the row', edits: one(GROUP, 'if (!on || shown === null) return null;', 'if (!on || shown === null) return null;\n') }
];

// ---------------------------------------------------------------------------

const only = (process.env['P375_ONLY'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const arms = only.length === 0 ? ARMS : ARMS.filter((a) => only.includes(a.id));
// A name that is no arm is a run of nothing, and nothing is never a pass.
const strangers = only.filter((o) => !ARMS.some((a) => a.id === o));
if (strangers.length > 0) {
  say(`FAIL: P375_ONLY names no arm called ${strangers.join(', ')}`);
  process.exit(2);
}
let failed = 0;
const bad = (what) => {
  failed += 1;
  say(`RED   ${what}`);
};
for (const r of ROWS) if (!ARMS.some((a) => a.row === r && a.control !== true)) bad(`no arm for row ${r}`);
for (const a of ARMS) if (!ROWS.includes(a.row)) bad(`${a.id} names ${a.row}, which is no row`);
if (new Set(ARMS.map((a) => a.id)).size !== ARMS.length) bad('two arms share an id');

/** Every Phase 375 test file of the tree. */
function testFiles(root) {
  const out = [];
  const walk = (dir) => {
    let names = [];
    try {
      names = readdirSync(dir);
    } catch {
      return;
    }
    for (const n of names) {
      const p = join(dir, n);
      if (n === 'node_modules') continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (/^p375-.*\.test\.tsx?$/.test(n) && p.includes('/__tests__/')) out.push(p.slice(root.length + 1));
    }
  };
  walk(join(root, 'src'));
  return out.sort();
}
/** The files holding a row: a test or a `describe` whose title begins with the id. */
const rowMark = (row) => new RegExp(`(?:it|test|describe)\\(\\s*['"\`]${row}: `);
const filesOf = (root, row) => testFiles(root).filter((f) => rowMark(row).test(readFileSync(join(root, f), 'utf8')));
/** Does a vitest result belong to the row? Its own title, or one around it, begins with the id. */
const ofRow = (t, row) => [t.title, ...(t.ancestorTitles ?? [])].some((x) => String(x).startsWith(`${row}: `));

// `--needles` asks only that every needle matches the working tree once, and that every row has a file; it runs nothing.
if (process.argv.includes('--needles')) {
  for (const a of ARMS) {
    for (const e of a.edits) {
      const n = readFileSync(join(REPO, e.file), 'utf8').split(e.from).length - 1;
      if (n !== 1) bad(`${a.id}: its needle matches ${e.file} ${String(n)} times: ${JSON.stringify(e.from.slice(0, 90))}`);
    }
  }
  for (const r of ROWS) if (filesOf(REPO, r).length === 0) bad(`row ${r}: no Phase 375 test file holds a test or describe titled "${r}: …"`);
  say(failed === 0 ? `needles PASS: ${String(ARMS.length)} arms, every needle once, every row in a file` : `needles FAIL: ${String(failed)}`);
  process.exit(failed === 0 ? 0 : 1);
}

const base = (process.env['P375_SCRATCH'] ?? '').trim() || tmpdir();
mkdirSync(base, { recursive: true });
const clone = realpathSync(mkdtempSync(join(base, `p375-ablation-${String(process.pid)}-`)));
const clean = () => rmSync(clone, { recursive: true, force: true });
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    clean();
    process.exit(130);
  });
}
const editedFiles = [...new Set(ARMS.flatMap((a) => a.edits).map((e) => e.file))];
const before = new Map(editedFiles.map((f) => [f, sha(readFileSync(join(REPO, f)))]));

/** Run vitest over files in the clone. */
function vitest(files) {
  const out = join(clone, 'vitest.json');
  rmSync(out, { force: true });
  const r = spawnSync(process.execPath, [join(clone, 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--reporter=json', `--outputFile=${out}`, ...files], { cwd: clone, encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, CI: '1' } });
  if (!existsSync(out)) return { ran: false, tests: [], red: [], passed: 0, said: String(r.stderr ?? '').slice(-400) };
  const json = JSON.parse(readFileSync(out, 'utf8'));
  const tests = json.testResults.flatMap((f) => f.assertionResults);
  const broken = json.testResults.filter((f) => f.status === 'failed' && f.assertionResults.length === 0);
  // A row that died because the EDIT itself cannot run (a name it misses, text that does not parse) says nothing of the clause.
  const cannotRun = (t) => /\bReferenceError\b|\bSyntaxError: (?!Unexpected .*JSON)|is not defined\b|Transform failed/.test(String((t.failureMessages ?? [])[0] ?? '').split('\n')[0]);
  return {
    ran: broken.length === 0,
    tests,
    red: tests.filter((t) => t.status === 'failed' && !cannotRun(t)),
    crashed: tests.filter((t) => t.status === 'failed' && cannotRun(t)).map((t) => `${t.fullName}: ${String(t.failureMessages[0]).split('\n')[0].slice(0, 160)}`),
    passed: tests.filter((t) => t.status === 'passed').length,
    said: broken.map((f) => `${f.name}: ${String(f.message).slice(0, 300)}`).join('; ')
  };
}

const started = Date.now();
try {
  for (const d of ['src', 'build', 'resources']) {
    const r = spawnSync('/bin/cp', ['-Rc', join(REPO, d), join(clone, d)], { encoding: 'utf8', timeout: 300_000 });
    if (r.status !== 0) throw new Error(`cp -Rc ${d}: ${r.stderr}`);
  }
  for (const n of readdirSync(REPO)) if (/^(tsconfig.*\.json|vitest\.config\.ts|electron\.vite\.config\.ts|package\.json)$/.test(n)) copyFileSync(join(REPO, n), join(clone, n));
  symlinkSync(join(REPO, 'node_modules'), join(clone, 'node_modules'));
  const fileMap = new Map(ROWS.map((r) => [r, filesOf(clone, r)]));
  for (const [r, f] of fileMap) if (f.length === 0) bad(`row ${r}: no Phase 375 test file holds a test or describe titled "${r}: …"`);
  const all = [...new Set(arms.flatMap((a) => fileMap.get(a.row) ?? []))];
  const control = vitest(all);
  if (!control.ran || control.red.length > 0) throw new Error(`the unedited control is red: ${control.said} ${control.red.slice(0, 8).map((t) => t.fullName).join(' | ')}`);
  say(`control green: ${String(control.passed)} rows in ${String(all.length)} files`);
  for (const r of ROWS) if (!control.tests.some((t) => ofRow(t, r)) && arms.some((a) => a.row === r)) bad(`row ${r}: the control ran no test of it`);
  for (const a of arms) {
    const bytes = new Map(a.edits.map((e) => [e.file, readFileSync(join(clone, e.file))]));
    let applied = true;
    for (const e of a.edits) {
      const text = readFileSync(join(clone, e.file), 'utf8');
      const n = text.split(e.from).length - 1;
      if (n !== 1) {
        bad(`${a.id}: its needle matches ${e.file} ${String(n)} times: ${JSON.stringify(e.from.slice(0, 90))}`);
        applied = false;
        break;
      }
      writeFileSync(join(clone, e.file), text.replace(e.from, () => e.to));
    }
    if (applied) {
      const files = fileMap.get(a.row) ?? [];
      const r = vitest(files);
      const owners = r.red.filter((t) => ofRow(t, a.row));
      if (a.control === true) {
        if (!r.ran || r.red.length > 0 || r.crashed.length > 0) bad(`${a.id} (control: ${a.what}) went red: ${r.said} ${[...r.red.map((t) => t.fullName), ...r.crashed].slice(0, 4).join(' | ')}`);
        else say(`ok    ${a.id} control: ${a.what}; ${String(r.passed)} rows green`);
      } else if (!r.ran && r.red.length === 0) bad(`${a.id}: the edited source did not run: ${r.said}`);
      else if (owners.length === 0) bad(`${a.id} (${a.what}): row ${a.row} stayed green; red: ${r.red.slice(0, 4).map((t) => t.fullName).join(' | ') || 'nothing'}${r.crashed.length > 0 ? `; the edit could not run: ${r.crashed[0]}` : ''}`);
      else {
        const others = r.red.filter((t) => !ofRow(t, a.row));
        say(`ok    ${a.id} ${a.row}: ${a.what}; red: ${owners.slice(0, 2).map((t) => JSON.stringify(t.title)).join(' | ')}${owners.length > 2 ? ` and ${String(owners.length - 2)} more of ${a.row}` : ''}${others.length > 0 ? `; beside it ${String(others.length)} of other rows` : ''}`);
      }
    }
    for (const [f, b] of bytes) {
      writeFileSync(join(clone, f), b);
      if (sha(readFileSync(join(clone, f))) !== before.get(f)) throw new Error(`${a.id}: ${f} was not put back`);
    }
  }
  const again = vitest(all);
  if (!again.ran || again.red.length > 0) bad(`the control is red at the end: ${again.red.slice(0, 5).map((t) => t.fullName).join(' | ')}`);
  else say(`control green again: ${String(again.passed)} rows`);
} catch (err) {
  bad(String(err?.message ?? err));
} finally {
  clean();
}
for (const [f, h] of before) if (sha(readFileSync(join(REPO, f))) !== h) bad(`${f} moved in the worktree while this ran`);
const secs = ((Date.now() - started) / 1000).toFixed(0);
const real = arms.filter((a) => a.control !== true);
say(failed === 0 ? `PASS: ${String(real.length)} arms, each red on the row that owns it, over ${String(new Set(real.map((a) => a.row)).size)} rows; ${String(arms.length - real.length)} control arms green; the control green before and after; ${secs} s` : `FAIL: ${String(failed)} in ${secs} s`);
process.exitCode = failed === 0 ? 0 : 1;
