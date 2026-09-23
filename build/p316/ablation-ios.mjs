#!/usr/bin/env node
/**
 * `npm run ablation:p316` — the attack on `conformance:ios` (Phase 316.2,
 * build/p316/SPEC.md §4 S2).
 *
 * A GREEN GATE IS ONLY EVIDENCE IF IT CAN GO RED. `conformance:ios` reads the
 * phone app as text for eleven refusals, (a) to (k), and every one of them is
 * a line a later round can add in a hurry: a colour typed straight into a
 * screen, a sentence in a `Text`, a `URLSession` outside the door client, a
 * DEBUG seam that leaked into Release, a second ATS exception, a background
 * mode, a VPN entitlement, a web view, the person's words run through
 * markdown, a screenshot, a vector edited by hand, a sum on a number the door
 * sends that traps (k1 and k2 are the two the reverify of 2026-09-23 ended
 * the app with, put back exactly as they shipped). THIS SCRIPT PLANTS EACH ONE
 * IN A CLONE OF THE SHIPPING TREE AND PROVES IT REDDENS THE RULE THAT OWNS IT.
 *
 * THE DELTA RULE. The base is run first. An arm passes only when its own rule
 * was GREEN at the base and is RED with the plant, so a rule that was already
 * red proves nothing and says so. An arm whose anchor is gone from the tree
 * FAILS BY NAME — it never skips — because an ablation that quietly stops
 * applying is how a gate's proof rots.
 *
 * IT NEVER WRITES INTO THE WORKING TREE. Several builders work in one worktree
 * during a phase, so the plants go into a CLONE: `cp -Rc` (APFS clonefile) of
 * `ios/`, `src/` and `build/` under `/private/tmp/p316-ablation-<pid>`, with
 * `package.json` and the tsconfigs copied and `node_modules` symlinked, and the
 * clone's OWN `build/conformance-ios.mjs` run there, so rule (j) checks the
 * clone's own vectors against the clone's own sources. Each planted file is put
 * back and its sha256 checked against the working tree's before the next arm;
 * the clone is removed in a `finally` and on SIGINT, SIGTERM and SIGHUP; and
 * the run ends by asserting the working tree's own bytes never moved.
 *
 * It starts nothing but `conformance:ios` (one plain node, and the pinned tsx
 * for rule (j)). No Xcode, no Simulator, no Electron, no socket, nothing under
 * the person's home.
 *
 *   node build/p316/ablation-ios.mjs
 *   P316_ONLY=a1,h node build/p316/ablation-ios.mjs     named arms only
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p316-ablation]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------------------
// The arms. Each names its rule, the file it plants into (relative to the
// clone), and an edit that must CHANGE that file or the arm fails by name.
// ---------------------------------------------------------------------------

const APP = 'ios/Tortie';
/** The first app Swift file under a screens directory, found rather than named. */
const aScreen = (root) => {
  const dir = join(root, APP, 'Screens');
  const names = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.swift')).sort() : [];
  return names.length === 0 ? null : `${APP}/Screens/${names[0]}`;
};
const aTest = (root) => {
  for (const d of ['ios/TortieUITests', 'ios/TortieTests']) {
    const dir = join(root, d);
    const names = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.swift')).sort() : [];
    if (names.length > 0) return `${d}/${names[0]}`;
  }
  return null;
};
/** The first app Swift file whose text matches `re`. */
const fileMatching = (root, re) => {
  const out = [];
  const walk = (dir) => {
    for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.swift')) out.push(p);
    }
  };
  walk(join(root, APP));
  const hit = out.sort().find((p) => re.test(readFileSync(p, 'utf8')));
  return hit === undefined ? null : relative(root, hit).split(sep).join('/');
};
const append = (text) => (src) => `${src}${src.endsWith('\n') ? '' : '\n'}${text}`;

/** Remove the `#if DEBUG` line opening the first region whose body matches `re`, and its `#endif`. */
function unguard(re) {
  return (src) => {
    const lines = src.split('\n');
    for (let k = 0; k < lines.length; k += 1) {
      if (lines[k].trim() !== '#if DEBUG') continue;
      let depth = 0;
      let end = -1;
      for (let j = k; j < lines.length; j += 1) {
        const t = lines[j].trim();
        if (/^#if\b/.test(t)) depth += 1;
        else if (/^#endif\b/.test(t)) {
          depth -= 1;
          if (depth === 0) {
            end = j;
            break;
          }
        }
      }
      if (end === -1) continue;
      if (!re.test(lines.slice(k + 1, end).join('\n'))) continue;
      const kept = lines.filter((_, i) => i !== k && i !== end);
      return kept.join('\n');
    }
    return src;
  };
}

const ARMS = [
  {
    id: 'a1',
    rule: 'a',
    what: 'one hex digit of a token changed in Tokens.swift',
    file: () => `${APP}/Style/Tokens.swift`,
    edit: (src) => src.replace(/0x([0-9a-fA-F]{5})([0-9a-fA-F])/, (_, head, last) => `0x${head}${last.toLowerCase() === 'f' ? '0' : 'f'}`)
  },
  {
    id: 'a2',
    rule: 'a',
    what: 'a colour typed straight into a screen',
    file: aScreen,
    edit: append('let p316AblationColour = Color(red: 1, green: 0, blue: 0)\n')
  },
  {
    id: 'a3',
    rule: 'a',
    what: 'a named system colour in a modifier',
    file: aScreen,
    edit: append('func p316AblationTint(_ v: some View) -> some View { v.foregroundStyle(.white) }\n')
  },
  {
    id: 'b1',
    rule: 'b',
    what: 'a string literal drawn through Text in a screen',
    file: aScreen,
    edit: append('let p316AblationText = Text("Everything is fine")\n')
  },
  {
    id: 'b2',
    rule: 'b',
    what: 'a sentence written outside Copy.swift, away from any Text',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: append('let p316AblationWhy = "Your Mac said no to this."\n')
  },
  {
    id: 'c1',
    rule: 'c',
    what: 'a URLSession outside the door client',
    file: aScreen,
    edit: append('let p316AblationSession = URLSession.shared\n')
  },
  {
    id: 'c2',
    rule: 'c',
    what: 'the door client building http',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.split('"https"').join('"http"')
  },
  {
    id: 'd1',
    rule: 'd',
    what: 'the direct loopback transport taken out of #if DEBUG',
    file: () => `${APP}/Door/Transport.swift`,
    edit: unguard(/\b(struct|class|enum|actor)\s+\w*(Loopback|Debug|Direct)\w*/)
  },
  {
    id: 'd2',
    rule: 'd',
    what: 'the pairing payload injection taken out of #if DEBUG',
    file: (root) => fileMatching(root, /#if DEBUG[\s\S]*?(ProcessInfo\s*\.\s*processInfo|CommandLine\s*\.|launchArguments)[\s\S]*?#endif/),
    edit: unguard(/ProcessInfo\s*\.\s*processInfo|CommandLine\s*\.|launchArguments/)
  },
  {
    id: 'e1',
    rule: 'e',
    what: 'NSAllowsArbitraryLoads added to the ATS dictionary',
    file: () => `${APP}/Info.plist`,
    edit: (src) => src.replace(/(<key>NSAppTransportSecurity<\/key>\s*<dict>)/, '$1\n\t\t<key>NSAllowsArbitraryLoads</key>\n\t\t<true/>')
  },
  {
    id: 'e2',
    rule: 'e',
    what: 'a background mode added',
    file: () => `${APP}/Info.plist`,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>UIBackgroundModes</key>\n\t<array>\n\t\t<string>fetch</string>\n\t</array>')
  },
  {
    id: 'e3',
    rule: 'e',
    what: 'a second ATS exception domain',
    file: () => `${APP}/Info.plist`,
    edit: (src) =>
      src.replace(
        /(<key>NSExceptionDomains<\/key>\s*<dict>)/,
        '$1\n\t\t\t<key>192.0.2.0/24</key>\n\t\t\t<dict>\n\t\t\t\t<key>NSExceptionAllowsInsecureHTTPLoads</key>\n\t\t\t\t<true/>\n\t\t\t</dict>'
      )
  },
  {
    id: 'e4',
    rule: 'e',
    what: 'a background mode injected by a build setting the plist does not show',
    file: () => 'ios/Tortie.xcodeproj/project.pbxproj',
    edit: (src) => src.replace(/(\n(\s*)INFOPLIST_FILE = )/, '\n$2INFOPLIST_KEY_UIBackgroundModes = fetch;$1')
  },
  {
    id: 'f1',
    rule: 'f',
    what: 'import NetworkExtension',
    file: aScreen,
    edit: (src) => `import NetworkExtension\n${src}`
  },
  {
    id: 'f2',
    rule: 'f',
    what: 'a networking entitlement',
    file: () => `${APP}/Tortie.entitlements`,
    edit: (src) => {
      const entry = '\t<key>com.apple.developer.networking.networkextension</key>\n\t<array>\n\t\t<string>packet-tunnel-provider</string>\n\t</array>\n';
      return src.includes('<dict/>') ? src.replace('<dict/>', `<dict>\n${entry}</dict>`) : src.replace('<dict>', `<dict>\n${entry}`);
    }
  },
  {
    id: 'g',
    rule: 'g',
    what: 'a web view that could run what the door sends',
    file: aScreen,
    edit: append('import WebKit\nlet p316AblationWeb = WKWebView()\n')
  },
  {
    id: 'h',
    rule: 'h',
    what: 'the ask drawn as markdown',
    file: (root) => fileMatching(root, /Text\s*\(\s*verbatim\s*:[^)\n]*askText/),
    edit: (src) => src.replace(/Text\s*\(\s*verbatim\s*:\s*([^)\n]*askText)\s*\)/, 'Text(try! AttributedString(markdown: $1))')
  },
  {
    id: 'i1',
    rule: 'i',
    what: 'screenshots switched back on in the test plan',
    file: () => 'ios/Tortie.xctestplan',
    edit: (src) => src.replace(/("uiTestingScreenshotsEnabled"\s*:\s*)false/, '$1true')
  },
  {
    id: 'i2',
    rule: 'i',
    what: 'a test that takes a screenshot',
    file: aTest,
    edit: append('import XCTest\nfunc p316Ablation(_ app: XCUIApplication) { _ = app.screenshot() }\n')
  },
  {
    id: 'j',
    rule: 'j',
    what: 'a vector edited by hand',
    file: () => 'ios/TortieTests/Fixtures/vectors.json',
    edit: (src) => src.replace(/"([0-9a-f])([0-9a-f]{31,})"/, (_, first, rest) => `"${first === '0' ? '1' : '0'}${rest}"`)
  },
  // (k), his ruling of 2026-09-23: the two sums the reverify trapped with
  // `Int.max`, put back as they shipped, then the three halves of the rule.
  {
    id: 'k1',
    rule: 'k',
    what: "the list's shipped trap put back: `others.count + max(0, answer.othersOmitted)`",
    file: () => `${APP}/Screens/ListScreen.swift`,
    edit: (src) =>
      src.replace(
        /guard let otherCount = DoorNumber\.sum\(others\.count, answer\.othersOmitted\) else \{\s*throw DoorFailure\.malformed\s*\}/,
        'let otherCount = others.count + max(0, answer.othersOmitted)'
      )
  },
  {
    id: 'k2',
    rule: 'k',
    what: "the session's shipped trap put back: `counts.user + replies`, a sum that names no door field",
    file: () => `${APP}/Screens/ActivityCells.swift`,
    edit: (src) => src.replace(/let total = try together\(counts\.user, replies\)/, 'let total = counts.user + replies')
  },
  {
    id: 'k3',
    rule: 'k',
    what: 'the paging sum taken bare: `heldLast.index + 1`',
    file: () => `${APP}/Door/Contract.swift`,
    edit: (src) => src.replace(/DoorNumber\.sum\(heldLast\.index, 1\)/, 'Optional(heldLast.index + 1)')
  },
  {
    id: 'k4',
    rule: 'k',
    what: 'a door number decoded with no bound',
    file: () => `${APP}/Door/Contract.swift`,
    edit: (src) => src.replace(/othersOmitted = try c\.doorNumber\(forKey: \.othersOmitted\)/, 'othersOmitted = try c.decode(Int.self, forKey: .othersOmitted)')
  },
  {
    id: 'k5',
    rule: 'k',
    what: 'the one checked helper adding bare',
    file: () => `${APP}/Door/Contract.swift`,
    edit: (src) => src.replace(/\ba\.addingReportingOverflow\(b\)/, '(a + b, false)')
  }
];

// ---------------------------------------------------------------------------
// The clone
// ---------------------------------------------------------------------------

let scratch = null;
const cleanup = () => {
  if (scratch !== null) {
    rmSync(scratch, { recursive: true, force: true });
    scratch = null;
  }
};
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    cleanup();
    process.exit(1);
  });
}

/** A digest of every file under the working tree's ios/ plus tokens.css. */
function treeDigest() {
  const h = createHash('sha256');
  const walk = (dir) => {
    for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)) : []) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) h.update(relative(REPO, p)).update(readFileSync(p));
    }
  };
  walk(join(REPO, 'ios'));
  h.update(readFileSync(join(REPO, 'src', 'renderer', 'styles', 'tokens.css')));
  return h.digest('hex');
}

function buildClone() {
  scratch = mkdtempSync('/private/tmp/p316-ablation-');
  for (const name of ['ios', 'src', 'build']) {
    const r = spawnSync('cp', ['-Rc', join(REPO, name), join(scratch, name)], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`cp -Rc ${name} failed: ${String(r.stderr).trim()}`);
  }
  for (const name of readdirSync(REPO)) {
    if (name === 'package.json' || /^tsconfig.*\.json$/.test(name)) copyFileSync(join(REPO, name), join(scratch, name));
  }
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
}

/** One run of the CLONE's own conformance:ios. */
function runGate() {
  const r = spawnSync(process.execPath, [join(scratch, 'build', 'conformance-ios.mjs'), '--json'], {
    cwd: scratch,
    encoding: 'utf8',
    timeout: 180_000
  });
  const line = String(r.stdout ?? '').split('\n').find((l) => l.startsWith('CONFORMANCE_IOS:'));
  if (line === undefined) return { ok: false, rules: null, why: `the gate printed no verdict (exit ${String(r.status)}): ${String(r.stderr ?? '').trim().slice(-300)}` };
  const parsed = JSON.parse(line.slice('CONFORMANCE_IOS:'.length));
  return { ok: true, rules: parsed.rules, scannerFixturesFailed: parsed.scannerFixturesFailed };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const only = (process.env['P316_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
const arms = only.length === 0 ? ARMS : ARMS.filter((a) => only.includes(a.id));
const before = treeDigest();
let failed = 0;
const rows = [];
try {
  buildClone();
  const base = runGate();
  if (!base.ok) throw new Error(base.why);
  const baseRed = Object.entries(base.rules).filter(([, v]) => !v.ok).map(([k]) => k);
  say(`base: ${baseRed.length === 0 ? 'every rule green' : `red at the base: ${baseRed.join(', ')}`}${base.scannerFixturesFailed > 0 ? `; ${String(base.scannerFixturesFailed)} scanner fixture(s) failed` : ''}`);
  if (base.scannerFixturesFailed > 0) failed += 1;

  for (const arm of arms) {
    const relPath = arm.file(scratch);
    if (relPath === null) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: 'no file in the tree to plant into; the arm has lost its anchor' });
      continue;
    }
    const path = join(scratch, relPath);
    if (!existsSync(path)) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: `${relPath} does not exist; the arm has lost its anchor` });
      continue;
    }
    const original = readFileSync(path);
    const edited = arm.edit(original.toString('utf8'));
    if (edited === original.toString('utf8')) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: `the edit changed nothing in ${relPath}; its anchor is gone, so this rule is no longer proved` });
      continue;
    }
    writeFileSync(path, edited);
    let got;
    try {
      got = runGate();
    } finally {
      writeFileSync(path, original);
    }
    const back = sha(readFileSync(path));
    const worktree = existsSync(join(REPO, relPath)) ? sha(readFileSync(join(REPO, relPath))) : null;
    if (back !== sha(original) || (worktree !== null && worktree !== back)) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: `${relPath} was not put back byte for byte in the clone` });
      continue;
    }
    if (!got.ok) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: got.why });
      continue;
    }
    const wasGreen = base.rules[arm.rule]?.ok === true;
    const nowRed = got.rules[arm.rule]?.ok === false;
    const collateral = Object.entries(got.rules)
      .filter(([k, v]) => k !== arm.rule && !v.ok && base.rules[k]?.ok === true)
      .map(([k]) => k);
    if (wasGreen && nowRed) {
      rows.push({ arm, verdict: 'red', why: `(${arm.rule}) went red${collateral.length > 0 ? `; also red: ${collateral.join(', ')}` : ''}`, file: relPath });
    } else {
      failed += 1;
      rows.push({
        arm,
        verdict: 'FAIL',
        why: !wasGreen ? `(${arm.rule}) was already red at the base, so this arm proves nothing` : `(${arm.rule}) stayed GREEN with the plant in ${relPath}: that clause of the rule is not asserted`,
        file: relPath
      });
    }
  }
} catch (err) {
  failed += 1;
  say(`the run threw: ${String(err?.message ?? err)}`);
} finally {
  cleanup();
}

for (const row of rows) {
  process.stdout.write(`${row.verdict === 'red' ? 'ok  ' : 'FAIL'} ${row.arm.id.padEnd(3)} (${row.arm.rule}) ${row.arm.what}: ${row.why}\n`);
}
const after = treeDigest();
if (after !== before) {
  failed += 1;
  say('THE WORKING TREE MOVED during the run. This script never writes there, so another builder did, and these readings are of a moving tree; run it again.');
}
const rulesProved = new Set(rows.filter((r) => r.verdict === 'red').map((r) => r.arm.rule));
if (only.length === 0) {
  for (const rule of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']) {
    if (!rulesProved.has(rule)) {
      failed += 1;
      say(`rule (${rule}) has no arm that turned it red, so nothing here proves it can fail`);
    }
  }
}
if (failed > 0) {
  say(`FAIL: ${String(failed)} problem(s). ${String(rows.filter((r) => r.verdict === 'red').length)} of ${String(arms.length)} arms red on their own rule.`);
  process.exit(1);
}
say(`PASS: ${String(arms.length)} of ${String(arms.length)} arms red on the rule that owns them, every rule (a) to (k) proved able to fail, the clone removed, the working tree unmoved.`);
