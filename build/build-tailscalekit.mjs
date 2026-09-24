#!/usr/bin/env node
/**
 * build-tailscalekit.mjs — build the pinned TailscaleKit.xcframework from
 * source so the iPhone app can carry its own tailnet node.
 *
 * Phase 316.3. `ios/Tortie.xcodeproj` embeds and signs
 * `build/vendor/tailscalekit/TailscaleKit.xcframework`; THIS script is what
 * puts it there. Run it by hand: `npm run vendor:tailscalekit`. Nothing runs it
 * automatically, because nothing in the desktop build needs it.
 *
 * WHY A NODE INSIDE THE APP, AND WHY FROM SOURCE. research 128 §2: an
 * app-private userspace node needs no entitlement and is never a
 * NetworkExtension. Tailscale publishes no binary of TailscaleKit (aperture-plus
 * builds it from the libtailscale submodule, and so does this), and committing
 * a prebuilt xcframework would be a third-party binary blob in git. So the
 * integrity gate is on the SOURCE: one commit of github.com/tailscale/libtailscale,
 * fetched as GitHub's archive of that commit, whose sha256 was recorded on the
 * first fetch and is checked on every fetch after it, and whose own pax header
 * must name the pinned commit. The built bytes are not a gate, because Go, the
 * SDK and the linker decide them; what is gated on the product is its SHAPE
 * (assertXcframework below).
 *
 * WHAT IT RUNS. Upstream's own `make ios-fat` in `swift/`, which builds the Go
 * c-archive for iOS and the Simulator and wraps it with xcodebuild into an
 * xcframework (`-derivedDataPath build`, so inside the unpacked tree, and
 * `CODE_SIGNING_ALLOWED=NO`: the app's Embed and Sign signs it). Measured on
 * the operator's Mac (build/p316/SPEC.md §3.5): exit 0 in about 50 s.
 *
 * KEEPING GO OUT OF HIS HOME (SPEC §3.7). With `GOTELEMETRY=off` exported,
 * `cmd/go` still wrote 7 telemetry files into `HOME`. So every command this
 * script starts gets `HOME`, `GOPATH`, `GOMODCACHE` and `GOCACHE` under
 * `build/vendor/tailscalekit/.cache/`, plus `GOTOOLCHAIN=local` (never download
 * a toolchain), `GOTELEMETRY=off` and `GOFLAGS=-modcacherw` (so the module
 * cache can be deleted), and every other `GO*` and `CGO_*` variable of the
 * calling shell is dropped, so his own Go settings cannot reach the build. The
 * `.cache` directory is deleted in a `finally` when this run made it (SPEC §4.0).
 * `make`'s xcodebuild inherits the same `HOME`.
 *
 * THE PRIVACY MANIFEST (SPEC §3.6, his decision 8). Upstream ships none (PR
 * #57 is open). The Go runtime calls `stat`, `fstat`, `lstat` and
 * `mach_absolute_time`, which Apple lists under FileTimestamp and
 * SystemBootTime, so an empty manifest would be inaccurate. This script writes
 * `PrivacyInfo.xcprivacy` at each slice's framework ROOT (an iOS framework is
 * shallow, SPEC §2 row 25) declaring C617.1 and 35F9.1, and it DERIVES the
 * categories from the built binary's undefined symbols first: a category the
 * binary needs that the pin does not declare refuses the build, because its
 * reason is his decision and not this script's.
 *
 * THE MODULES (SPEC §3.6, research 128). `go list -deps -tags ios` for iOS
 * arm64 names the modules that are compiled into the device slice (43 at this
 * pin), each with its licence re-read from the module's own licence file; and
 * `go list -m all` names the whole build list. Both are recorded in the pin and
 * the build refuses when either drifts, so a change is noticed.
 *
 * RECORDING. The pin's `source.sha256`, `modules` and `buildList` start null
 * for a new commit. `--record` fills a null field from what this run measured
 * and never overwrites one that is set; without it, a null field refuses. A pin
 * bump therefore clears those three fields in the same commit that moves
 * `commit`, and the first build records them.
 *
 * `build/vendor/` is gitignored, so the whole output tree needs no new rule.
 *
 * Usage:
 *   node build/build-tailscalekit.mjs            build, or say it is already built
 *   node build/build-tailscalekit.mjs --force    rebuild even when it is built
 *   node build/build-tailscalekit.mjs --record   fill the pin's null fields
 *   node build/build-tailscalekit.mjs --self-test  the pure checks, on fixtures
 */

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

/** Repo root — this file lives in <root>/build. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The pin. One source of truth. */
const PIN_PATH = join(ROOT, 'build', 'tailscalekit-release.json');

/** Everything vendored lands under here; `build/vendor/` is gitignored. */
const VENDOR_DIR = join(ROOT, 'build', 'vendor', 'tailscalekit');
/** The fetched source archive, kept so a rebuild costs no source fetch. */
const CACHE_DIR = join(VENDOR_DIR, 'cache');
/** The unpacked tree `make` runs in. Made fresh by each build, removed when it succeeds. */
const WORK_DIR = join(VENDOR_DIR, 'work');
/** Go's caches and the redirected HOME. Deleted in a finally when a run made it. */
const GO_DIR = join(VENDOR_DIR, '.cache');
/** What ios/Tortie.xcodeproj embeds. Version-free, so the pin is said once. */
const XCFRAMEWORK = join(VENDOR_DIR, 'TailscaleKit.xcframework');
/** Written LAST, after the product passed every assertion. */
const STAMP = join(VENDOR_DIR, 'TailscaleKit.stamp.json');

/** The app project this product is embedded by, read for its floor and its reference. */
const PBXPROJ = join(ROOT, 'ios', 'Tortie.xcodeproj', 'project.pbxproj');

/** The two slices `make ios-fat` writes, and the architectures each must hold. */
const SLICES = [
  { id: 'ios-arm64', platform: 'ios', variant: null, archs: ['arm64'] },
  { id: 'ios-arm64_x86_64-simulator', platform: 'ios', variant: 'simulator', archs: ['arm64', 'x86_64'] }
];

/** The main module, recorded at the pinned commit. */
const MAIN_MODULE = 'github.com/tailscale/libtailscale';

/** The one sentence every refusal about the vendored copy ends with. */
const RUN_ME = 'Run npm run vendor:tailscalekit in the repository.';

// ---------------------------------------------------------------------------
// The pin
// ---------------------------------------------------------------------------

const HEX40 = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;

/**
 * Validate a parsed pin. Pure, so the self-test drives it. `recording` admits
 * the three fields a first build fills; without it each must be set.
 */
export function checkPin(pin, { recording = false } = {}) {
  const problems = [];
  if (typeof pin !== 'object' || pin === null) return ['the pin is not a JSON object'];
  if (typeof pin.commit !== 'string' || !HEX40.test(pin.commit)) problems.push('"commit" is not a 40-character commit id');
  if (typeof pin.goModGo !== 'string' || !/^\d+\.\d+(\.\d+)?$/.test(pin.goModGo)) problems.push('"goModGo" is not a Go version');
  const src = pin.source;
  if (typeof src !== 'object' || src === null || typeof src.url !== 'string') {
    problems.push('"source.url" is missing');
  } else {
    if (typeof pin.commit === 'string' && !src.url.endsWith(`/${pin.commit}`)) problems.push('"source.url" does not end with the pinned commit');
    if (!src.url.startsWith('https://')) problems.push('"source.url" is not https');
    if (src.sha256 === null) {
      if (!recording) problems.push('"source.sha256" has not been recorded');
    } else if (typeof src.sha256 !== 'string' || !HEX64.test(src.sha256)) {
      problems.push('"source.sha256" is not a sha256');
    }
  }
  const privacy = pin.privacy;
  if (typeof privacy !== 'object' || privacy === null || typeof privacy.categories !== 'object' || privacy.categories === null) {
    problems.push('"privacy.categories" is missing');
  } else {
    for (const [category, reasons] of Object.entries(privacy.categories)) {
      if (!Object.hasOwn(REQUIRED_REASON_CATEGORIES, category)) problems.push(`"privacy.categories" names ${category}, which is not one of Apple's required-reason categories`);
      if (!Array.isArray(reasons) || reasons.length === 0 || reasons.some((r) => typeof r !== 'string' || !/^[0-9A-F]{4}\.\d$/.test(r))) {
        problems.push(`"privacy.categories.${category}" is not a list of reason codes`);
      }
    }
  }
  for (const field of ['modules', 'buildList']) {
    const list = pin[field];
    if (list === null) {
      if (!recording) problems.push(`"${field}" has not been recorded`);
    } else if (!Array.isArray(list) || list.length === 0) {
      problems.push(`"${field}" is not a list`);
    }
  }
  if (Array.isArray(pin.modules)) {
    for (const m of pin.modules) {
      if (typeof m?.path !== 'string' || typeof m?.version !== 'string' || typeof m?.licence !== 'string' || typeof m?.notice !== 'boolean') {
        problems.push(`a "modules" entry is not {path, version, licence, notice}: ${JSON.stringify(m)}`);
        break;
      }
    }
  }
  if (Array.isArray(pin.buildList) && pin.buildList.some((e) => typeof e !== 'string' || !e.includes('@'))) {
    problems.push('a "buildList" entry is not path@version');
  }
  return problems;
}

function readPin({ recording = false } = {}) {
  const pin = JSON.parse(readFileSync(PIN_PATH, 'utf8'));
  const problems = checkPin(pin, { recording });
  if (problems.length > 0) {
    const hint = problems.some((p) => p.includes('has not been recorded'))
      ? ' A new commit records its facts once: run node build/build-tailscalekit.mjs --record.'
      : '';
    throw new Error(`build/tailscalekit-release.json is not a complete pin: ${problems.join('; ')}.${hint}`);
  }
  return pin;
}

// ---------------------------------------------------------------------------
// Running commands
// ---------------------------------------------------------------------------

/**
 * The environment every child gets. Pure over its inputs, so the self-test can
 * prove each clause.
 *
 * Dropped from the caller's environment: every `GO*` and `CGO_*` variable (his
 * own Go settings), `TMUX` (a build started inside tmux), `MAKEFLAGS`, `MFLAGS`
 * and `MAKELEVEL` (a jobserver from an outer make), and `SDKROOT` and every
 * `*_DEPLOYMENT_TARGET` (clang reads them as defaults, so a value exported in
 * his shell would move the slices' floor).
 */
export function childEnv(base, goDir) {
  const env = {};
  for (const [key, value] of Object.entries(base)) {
    if (/^(GO|CGO_)/.test(key)) continue;
    if (key === 'TMUX' || key === 'MAKEFLAGS' || key === 'MFLAGS' || key === 'MAKELEVEL') continue;
    if (key === 'SDKROOT' || key.endsWith('_DEPLOYMENT_TARGET')) continue;
    env[key] = value;
  }
  env.HOME = join(goDir, 'home');
  env.GOPATH = join(goDir, 'gopath');
  env.GOMODCACHE = join(goDir, 'gomodcache');
  env.GOCACHE = join(goDir, 'gocache');
  env.GOTOOLCHAIN = 'local';
  env.GOTELEMETRY = 'off';
  env.GOFLAGS = '-modcacherw';
  return env;
}

/** Run a command, throwing with the tail of its output on failure. */
function run(cmd, args, { cwd, env, label }) {
  const child = spawnSync(cmd, args, { cwd, env, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (child.error) throw new Error(`${label}: ${cmd} could not be started. ${child.error.message}`);
  if (child.status !== 0) {
    const tail = `${child.stdout ?? ''}${child.stderr ?? ''}`.split('\n').slice(-40).join('\n');
    throw new Error(`${label}: ${cmd} ${args.join(' ')} exited ${String(child.status)}.\n  in ${cwd}\n  last 40 lines:\n${tail}`);
  }
  return child.stdout ?? '';
}

/**
 * Run `fn` with the redirected Go environment, and delete the directory
 * afterwards when this call made it (SPEC §4.0), whatever `fn` did.
 *
 * WHETHER THIS CALL MADE IT IS DECIDED BEFORE ANY CHILD SEES THE ENVIRONMENT,
 * and the environment is handed out only here. The first build decided it after
 * the preflight's `go version`, which had already written Go's telemetry into
 * the redirected HOME (SPEC §3.7, seven files), so the directory existed, the
 * `finally` thought it had been there before, and 1.43 GiB of cache stayed
 * behind.
 */
export async function withGoDir(goDir, base, fn) {
  const made = !existsSync(goDir);
  try {
    for (const sub of ['home', 'gopath', 'gomodcache', 'gocache']) mkdirSync(join(goDir, sub), { recursive: true });
    return await fn(childEnv(base, goDir));
  } finally {
    if (made) rmSync(goDir, { recursive: true, force: true });
  }
}

/** One line of a tool's output, or null when the tool is absent or failed. */
function readLine(cmd, args, env = process.env) {
  const child = spawnSync(cmd, args, { encoding: 'utf8', env, timeout: 30_000 });
  if (child.error || child.status !== 0) return null;
  return (child.stdout ?? '').trim();
}

// ---------------------------------------------------------------------------
// Preflight: one sentence for each thing that is missing
// ---------------------------------------------------------------------------

/** "go version go1.26.0 darwin/arm64" → [1, 26, 0]; null when unreadable. */
export function parseGoVersion(line) {
  const m = /\bgo(\d+)\.(\d+)(?:\.(\d+))?/.exec(line ?? '');
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)] : null;
}

/** a ≥ b over [major, minor, patch]. */
export function versionAtLeast(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return true;
}

function preflight(pin, env) {
  if (process.platform !== 'darwin') {
    throw new Error('TailscaleKit is built on macOS only, because it needs Xcode and the iOS SDK.');
  }
  const go = readLine('go', ['version'], env);
  if (go === null) {
    throw new Error(`Go is not on PATH. TailscaleKit is built from source and needs Go ${pin.goModGo} or newer; install Go, then run npm run vendor:tailscalekit again.`);
  }
  const have = parseGoVersion(go);
  const need = parseGoVersion(`go${pin.goModGo}`);
  if (have === null || !versionAtLeast(have, need)) {
    throw new Error(`"${go}" is older than the Go ${pin.goModGo} the pinned go.mod asks for, and GOTOOLCHAIN=local never downloads another. Install a newer Go, then run npm run vendor:tailscalekit again.`);
  }
  const xcode = readLine('xcodebuild', ['-version'], env);
  if (xcode === null) {
    throw new Error('Xcode is missing (xcodebuild -version failed). TailscaleKit needs the full Xcode, not only the Command Line Tools; install it, then run npm run vendor:tailscalekit again.');
  }
  for (const sdk of ['iphoneos', 'iphonesimulator']) {
    if (readLine('xcrun', ['--sdk', sdk, '--show-sdk-path'], env) === null) {
      throw new Error(`The ${sdk} SDK is missing from this Xcode. Install the iOS platform in Xcode, then run npm run vendor:tailscalekit again.`);
    }
  }
  if (readLine('make', ['--version'], env) === null) {
    throw new Error('make is not on PATH. It comes with Xcode; run xcode-select --install, then run npm run vendor:tailscalekit again.');
  }
  return { go, xcode: xcode.split('\n').join(' ') };
}

// ---------------------------------------------------------------------------
// The source
// ---------------------------------------------------------------------------

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * The commit a GitHub (git archive) tarball says it is, read from the pax
 * global header's `comment` record. Null when the archive carries none.
 * Pure over the gzip bytes.
 */
export function paxCommit(gzipBytes) {
  const tar = gunzipSync(gzipBytes);
  if (tar.length < 512) return null;
  const typeflag = String.fromCharCode(tar[156]);
  if (typeflag !== 'g') return null;
  const size = Number.parseInt(tar.subarray(124, 136).toString('latin1').replace(/\0.*$/s, '').trim(), 8);
  if (!Number.isInteger(size) || size <= 0 || 512 + size > tar.length) return null;
  const body = tar.subarray(512, 512 + size).toString('utf8');
  for (const record of body.split('\n')) {
    const m = /^\d+ comment=([0-9a-f]{40})$/.exec(record);
    if (m) return m[1];
  }
  return null;
}

/**
 * Judge fetched source bytes against the pin. Pure, so the self-test drives
 * both refusals. Returns the measured sha256.
 */
export function judgeSource(bytes, pin, { recording = false } = {}) {
  const got = sha256(bytes);
  const commit = paxCommit(bytes);
  if (commit !== pin.commit) {
    throw new Error(`the source archive says it is commit ${String(commit)}, and the pin names ${pin.commit}. The archive is not the pinned source.`);
  }
  if (pin.source.sha256 === null) {
    if (!recording) throw new Error(`the pin has no recorded source sha256; this fetch measured ${got}. Run node build/build-tailscalekit.mjs --record to record it.`);
    return got;
  }
  if (got !== pin.source.sha256) {
    throw new Error(
      `the source archive's sha256 is ${got}, and the pin recorded ${pin.source.sha256} on the first fetch. ` +
        'Do not re-record the hash to make this pass: a changed archive of the same commit is either GitHub regenerating it or a different file, and those need different answers.'
    );
  }
  return got;
}

async function ensureSource(pin, { recording }, log) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cached = join(CACHE_DIR, `libtailscale-${pin.commit}.tar.gz`);
  if (!existsSync(cached)) {
    log(`  • fetching ${pin.source.url}`);
    const res = await fetch(pin.source.url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`GET ${pin.source.url} answered HTTP ${String(res.status)} ${res.statusText}.`);
    writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
  }
  const bytes = readFileSync(cached);
  let got;
  try {
    got = judgeSource(bytes, pin, { recording });
  } catch (err) {
    // A refused archive never stays in the cache for the next build to inherit,
    // unless it was refused only because nothing is recorded yet.
    if (pin.source.sha256 !== null || paxCommit(bytes) !== pin.commit) rmSync(cached, { force: true });
    throw err;
  }
  log(`  • source ${pin.commit.slice(0, 12)}: ${String(bytes.length)} bytes, sha256 ${got.slice(0, 16)}…, pax commit matches`);
  return { cached, sha256: got };
}

function unpack(cached, pin, log) {
  rmSync(WORK_DIR, { recursive: true, force: true });
  mkdirSync(WORK_DIR, { recursive: true });
  run('/usr/bin/tar', ['xzf', cached, '-C', WORK_DIR], { cwd: WORK_DIR, env: process.env, label: 'unpack' });
  const dir = join(WORK_DIR, `libtailscale-${pin.commit}`);
  if (!existsSync(join(dir, 'swift', 'Makefile'))) throw new Error(`the archive did not unpack to ${relative(ROOT, dir)}/swift/Makefile`);
  const goMod = readFileSync(join(dir, 'go.mod'), 'utf8');
  const goLine = /^go (\S+)$/m.exec(goMod)?.[1];
  if (goLine !== pin.goModGo) throw new Error(`the pinned go.mod says "go ${String(goLine)}", and the pin records ${pin.goModGo}`);
  log(`  • unpacked into ${relative(ROOT, dir)}; go.mod asks for go ${goLine}`);
  return dir;
}

// ---------------------------------------------------------------------------
// The one change to the pinned source: Tailscale's own logs, off
// ---------------------------------------------------------------------------

/**
 * THE ONE CHANGE THIS SCRIPT MAKES TO THE PINNED SOURCE (316.3's hardening
 * round; his ruling of 2026-09-23 on the node's diagnostic logs: "Turn them
 * off").
 *
 * tsnet uploads the node's own logs to log.tailscale.com unless
 * `TS_NO_LOGS_NO_SUPPORT` reads true when a node starts
 * (tailscale.com v1.94.1, logpolicy/logpolicy.go 874: the transport
 * tsnet.startLogger builds is a no-op when `envknob.NoLogsNoSupport()`). An
 * app cannot set that for itself: Go reads `os.Getenv` from a copy of the
 * environment it took when the library LOADED (runtime/runtime1.go
 * goenvs_unix, from the process's own startup block), so a `setenv` from Swift
 * never reaches it, and libtailscale exports no switch at this pin. So the
 * build adds one export, `tailscale_no_logs_no_support()`, which calls
 * `envknob.SetNoLogsNoSupport()` (the switch tailscaled's
 * `--no-logs-no-support` flips) and answers 0 only when tsnet now reads it
 * true. `Tailnet/Node.swift` calls it before every start, in every build, and
 * refuses to start a node when it does not answer 0 (conformance:ios rule q).
 *
 * Each edit is anchored on text that must appear EXACTLY ONCE in the pinned
 * source, or the build refuses: a pin bump that moved an anchor is noticed,
 * never patched in the wrong place. The patch is part of the stamp's digest,
 * so a copy built without it is not the pinned build.
 */
export const NO_LOGS_PATCH = Object.freeze([
  {
    file: 'tailscale.go',
    anchor: '\t"tailscale.com/hostinfo"\n',
    place: 'before',
    text: '\t"tailscale.com/envknob"\n'
  },
  {
    file: 'tailscale.go',
    anchor: '//export TsnetSetLogFD\n',
    place: 'before',
    text:
      '// TsnetNoLogsNoSupport turns off, for this whole process, the upload of\n' +
      '// every node\'s own logs to log.tailscale.com: envknob.SetNoLogsNoSupport,\n' +
      '// the switch tailscaled\'s --no-logs-no-support flips. A node reads it when\n' +
      '// it starts. Added by Tortie\'s build (build/build-tailscalekit.mjs), because\n' +
      '// an app cannot set TS_NO_LOGS_NO_SUPPORT for itself: Go copied the\n' +
      '// environment when this library loaded. Returns 0 when tsnet now reads\n' +
      '// it true, and -1 otherwise.\n' +
      '//\n' +
      '//export TsnetNoLogsNoSupport\n' +
      'func TsnetNoLogsNoSupport() C.int {\n' +
      '\tenvknob.SetNoLogsNoSupport()\n' +
      '\tif !envknob.NoLogsNoSupport() {\n' +
      '\t\treturn -1\n' +
      '\t}\n' +
      '\treturn 0\n' +
      '}\n\n'
  },
  {
    file: 'tailscale.c',
    anchor: 'extern int TsnetSetLogFD(int sd, int fd);\n',
    place: 'after',
    text: 'extern int TsnetNoLogsNoSupport(void);\n'
  },
  {
    file: 'tailscale.c',
    anchor: 'int tailscale_set_logfd(tailscale sd, int fd) {\n',
    place: 'before',
    text: 'int tailscale_no_logs_no_support(void) {\n\treturn TsnetNoLogsNoSupport();\n}\n\n'
  },
  ...['tailscale.h', 'swift/TailscaleKit/TailscaleKit.h'].map((file) => ({
    file,
    anchor: 'extern int tailscale_set_logfd(tailscale sd, int fd);\n',
    place: 'after',
    text:
      '\n' +
      '// tailscale_no_logs_no_support turns off, for this whole process, the\n' +
      '// upload of every node\'s own logs to log.tailscale.com (Tortie\'s build\n' +
      '// adds it). Call it before tailscale_start or tailscale_up.\n' +
      '//\n' +
      '// Returns zero when a node now uploads no logs, or -1.\n' +
      'extern int tailscale_no_logs_no_support(void);\n'
  }))
]);

/**
 * The patched texts, from `files` ({ relative path: text }). Pure. Throws,
 * naming the file and the anchor, when an anchor is not there exactly once.
 */
export function patchSource(files, patch = NO_LOGS_PATCH) {
  const out = { ...files };
  for (const edit of patch) {
    const text = out[edit.file];
    if (typeof text !== 'string') throw new Error(`the no-logs patch edits ${edit.file}, which the pinned source does not hold`);
    const count = text.split(edit.anchor).length - 1;
    if (count !== 1) throw new Error(`the no-logs patch anchors on ${JSON.stringify(edit.anchor.trim())} in ${edit.file}, which the pinned source holds ${String(count)} times; it must hold it exactly once`);
    out[edit.file] = text.replace(edit.anchor, () => (edit.place === 'before' ? `${edit.text}${edit.anchor}` : `${edit.anchor}${edit.text}`));
  }
  return out;
}

/** Apply the patch to the unpacked tree in place. */
function applyNoLogsPatch(srcDir, log) {
  const files = [...new Set(NO_LOGS_PATCH.map((e) => e.file))];
  const patched = patchSource(Object.fromEntries(files.map((f) => [f, readFileSync(join(srcDir, f), 'utf8')])));
  for (const f of files) writeFileSync(join(srcDir, f), patched[f]);
  log(`  • patched ${files.join(', ')}: tailscale_no_logs_no_support(), Tailscale's own logs off before every start`);
}

// ---------------------------------------------------------------------------
// The modules and their licences
// ---------------------------------------------------------------------------

/**
 * Name one licence file's licence. Pure. Returns null for a text it does not
 * know, which refuses the build: a licence nobody has read is not recorded.
 */
export function classifyLicence(text) {
  const t = text.replace(/\s+/g, ' ');
  if (/Apache License,? Version 2\.0/i.test(t)) return 'Apache-2.0';
  if (/Mozilla Public License,? (version|v\.?) ?2\.0/i.test(t)) return 'MPL-2.0';
  if (/Permission is hereby granted, free of charge, to any person obtaining a copy/i.test(t)) return 'MIT';
  if (/Permission to use, copy, modify, and\/?or distribute this software for any purpose/i.test(t)) return 'ISC';
  if (/Redistribution and use in source and binary forms/i.test(t)) {
    const third = /Neither the name|nor the names of (its|their) contributors|name of the copyright holder nor/i.test(t);
    return third ? 'BSD-3-Clause' : 'BSD-2-Clause';
  }
  return null;
}

const LICENCE_FILES = /^(LICEN[CS]E|COPYING)(\.(txt|md))?$/i;
const NOTICE_FILES = /^NOTICE(\.(txt|md))?$/i;

/** Read a module directory's licence and whether it carries a NOTICE. */
function licenceOf(dir) {
  const names = readdirSync(dir);
  const file = names.filter((n) => LICENCE_FILES.test(n)).sort()[0];
  if (file === undefined) return { licence: null, notice: names.some((n) => NOTICE_FILES.test(n)) };
  return { licence: classifyLicence(readFileSync(join(dir, file), 'utf8')), notice: names.some((n) => NOTICE_FILES.test(n)) };
}

/**
 * Compare what was derived with what is pinned. Pure. Each drift is one line;
 * an empty list means they agree exactly.
 */
export function moduleDrift(pinned, derived) {
  const drift = [];
  const key = (m) => (typeof m === 'string' ? m : `${m.path}@${m.version}`);
  const a = new Map(pinned.map((m) => [key(m), m]));
  const b = new Map(derived.map((m) => [key(m), m]));
  for (const k of a.keys()) if (!b.has(k)) drift.push(`pinned but not built: ${k}`);
  for (const k of b.keys()) if (!a.has(k)) drift.push(`built but not pinned: ${k}`);
  for (const [k, m] of a) {
    const d = b.get(k);
    if (d === undefined || typeof m === 'string') continue;
    if (m.licence !== d.licence) drift.push(`${k}: the pin says ${m.licence}, its licence file reads ${String(d.licence)}`);
    if (m.notice !== d.notice) drift.push(`${k}: the pin says notice ${String(m.notice)}, the module ${d.notice ? 'carries' : 'carries no'} NOTICE file`);
  }
  return drift;
}

/**
 * The modules compiled into the device slice, and the whole build list, read
 * from Go itself in the unpacked tree. This is the first Go command of a
 * build, so it is also the one that fetches the modules.
 */
function deriveModules(srcDir, pin, env) {
  const iosEnv = { ...env, GOOS: 'ios', GOARCH: 'arm64', CGO_ENABLED: '1' };
  const deps = run('go', ['list', '-deps', '-tags', 'ios', '-f', '{{with .Module}}{{if not .Main}}{{.Path}} {{.Version}}{{end}}{{end}}', '.'], {
    cwd: srcDir,
    env: iosEnv,
    label: 'go list -deps'
  });
  const shipped = [...new Set(deps.split('\n').filter((l) => l.trim() !== ''))].sort();
  const dirs = JSON.parse(
    `[${run('go', ['list', '-m', '-json', ...shipped.map((l) => l.replace(' ', '@'))], { cwd: srcDir, env: iosEnv, label: 'go list -m -json' })
      .trim()
      .replace(/\}\s*\{/g, '},{')}]`
  );
  const dirOf = new Map(dirs.map((m) => [`${m.Path} ${m.Version}`, m.Dir]));
  const modules = shipped.map((line) => {
    const [path, version] = line.split(' ');
    const dir = dirOf.get(line);
    if (typeof dir !== 'string' || !existsSync(dir)) throw new Error(`go list gave no directory for ${path}@${version}`);
    return { path, version, ...licenceOf(dir) };
  });
  // libtailscale itself, which go list marks Main: its Go and its Swift wrapper
  // are compiled into the framework too, so its licence is one of the facts.
  modules.push({ path: MAIN_MODULE, version: pin.commit, ...licenceOf(srcDir) });
  modules.sort((a, b) => a.path.localeCompare(b.path));
  const unread = modules.filter((m) => m.licence === null);
  if (unread.length > 0) {
    throw new Error(`these modules carry a licence file this script cannot name, so it is not recorded: ${unread.map((m) => `${m.path}@${m.version}`).join(', ')}`);
  }
  const all = run('go', ['list', '-m', 'all'], { cwd: srcDir, env, label: 'go list -m all' })
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
    .slice(1)
    .map((l) => l.split(' ').slice(0, 2).join('@'))
    .sort();
  return { modules, buildList: all };
}

/** Counts per licence, for the log line. */
export function licenceCounts(modules) {
  const counts = {};
  for (const m of modules) counts[m.licence] = (counts[m.licence] ?? 0) + 1;
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([l, n]) => `${String(n)} ${l}`)
    .join(', ');
}

// ---------------------------------------------------------------------------
// The privacy manifest
// ---------------------------------------------------------------------------

/**
 * Apple's required-reason categories, and the C symbols that name each one in
 * a binary's undefined symbol table. From Apple's list,
 * https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api
 * (read for build/p316/SPEC.md §3.6). The Swift and Objective-C spellings
 * (`systemUptime`, `modificationDate`, `UserDefaults`, `activeInputModes`, the
 * volume capacity keys) are selectors or properties that `nm -u` cannot see,
 * so `SELECTOR_NAMES` below is read from the binary's strings for those.
 * `getattrlist` and its siblings are listed by Apple under BOTH FileTimestamp
 * and DiskSpace; a binary that calls one is refused rather than guessed at.
 */
export const REQUIRED_REASON_CATEGORIES = {
  NSPrivacyAccessedAPICategoryFileTimestamp: ['stat', 'fstat', 'fstatat', 'lstat'],
  NSPrivacyAccessedAPICategorySystemBootTime: ['mach_absolute_time'],
  NSPrivacyAccessedAPICategoryDiskSpace: ['statfs', 'statvfs', 'fstatfs', 'fstatvfs'],
  NSPrivacyAccessedAPICategoryActiveKeyboards: [],
  NSPrivacyAccessedAPICategoryUserDefaults: []
};
const AMBIGUOUS_SYMBOLS = ['getattrlist', 'fgetattrlist', 'getattrlistat', 'getattrlistbulk'];
const SELECTOR_NAMES = {
  NSPrivacyAccessedAPICategoryFileTimestamp: ['fileModificationDate', 'contentModificationDateKey', 'creationDateKey'],
  NSPrivacyAccessedAPICategorySystemBootTime: ['systemUptime'],
  NSPrivacyAccessedAPICategoryDiskSpace: ['volumeAvailableCapacityKey', 'volumeAvailableCapacityForImportantUsageKey', 'volumeAvailableCapacityForOpportunisticUsageKey', 'volumeTotalCapacityKey', 'NSFileSystemFreeSize', 'NSFileSystemSize'],
  NSPrivacyAccessedAPICategoryActiveKeyboards: ['activeInputModes'],
  NSPrivacyAccessedAPICategoryUserDefaults: ['NSUserDefaults', '12UserDefaultsC']
};

/**
 * The categories a binary needs, from its undefined symbols (`nm -u`, leading
 * underscore and any `$VARIANT` suffix removed) and its strings. Pure.
 */
export function categoriesOf(undefinedSymbols, strings) {
  const bare = new Set(undefinedSymbols.map((s) => s.replace(/^_/, '').replace(/\$.*$/, '')));
  const found = new Map();
  const hit = (category, why) => {
    if (!found.has(category)) found.set(category, []);
    found.get(category).push(why);
  };
  for (const [category, symbols] of Object.entries(REQUIRED_REASON_CATEGORIES)) {
    for (const s of symbols) if (bare.has(s)) hit(category, s);
  }
  const ambiguous = AMBIGUOUS_SYMBOLS.filter((s) => bare.has(s));
  for (const [category, names] of Object.entries(SELECTOR_NAMES)) {
    for (const n of names) if (strings.some((s) => s.includes(n))) hit(category, n);
  }
  return { categories: found, ambiguous };
}

/**
 * Judge the derived categories against the pinned ones. Pure. The pin must
 * declare exactly what the binary needs: one more would be an inaccurate
 * manifest, one fewer an upload rejection.
 */
export function privacyDrift(declared, derived) {
  const drift = [];
  for (const [category, why] of derived.categories) {
    if (!Object.hasOwn(declared, category)) {
      drift.push(`the library calls ${why.join(', ')} (${category}), which the pin does not declare; the reason for it is his decision (build/p316/SPEC.md §6 decision 8)`);
    }
  }
  for (const category of Object.keys(declared)) {
    if (!derived.categories.has(category)) drift.push(`the pin declares ${category}, and the library no longer calls anything Apple lists under it`);
  }
  if (derived.ambiguous.length > 0) {
    drift.push(`the library calls ${derived.ambiguous.join(', ')}, which Apple lists under both FileTimestamp and DiskSpace; read what it asks for before declaring either`);
  }
  return drift;
}

const xmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The manifest's bytes for the pinned categories. Pure; two-space indent. */
export function privacyManifest(categories) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    '  <key>NSPrivacyTracking</key>',
    '  <false/>',
    '  <key>NSPrivacyTrackingDomains</key>',
    '  <array/>',
    '  <key>NSPrivacyCollectedDataTypes</key>',
    '  <array/>',
    '  <key>NSPrivacyAccessedAPITypes</key>',
    '  <array>'
  ];
  for (const category of Object.keys(categories).sort()) {
    lines.push('    <dict>');
    lines.push('      <key>NSPrivacyAccessedAPIType</key>');
    lines.push(`      <string>${xmlEscape(category)}</string>`);
    lines.push('      <key>NSPrivacyAccessedAPITypeReasons</key>');
    lines.push('      <array>');
    for (const reason of categories[category]) lines.push(`        <string>${xmlEscape(reason)}</string>`);
    lines.push('      </array>');
    lines.push('    </dict>');
  }
  lines.push('  </array>', '</dict>', '</plist>', '');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// The product
// ---------------------------------------------------------------------------

/** A property list (XML, binary or JSON) read through plutil as JSON. */
function plistJson(path) {
  return JSON.parse(run('/usr/bin/plutil', ['-convert', 'json', '-o', '-', path], { cwd: ROOT, env: process.env, label: 'plutil' }));
}

/** The app target's deployment target, read from the committed project. */
export function appDeploymentTarget(pbxproj) {
  const targets = [...pbxproj.matchAll(/IPHONEOS_DEPLOYMENT_TARGET = ([0-9.]+);/g)].map((m) => m[1]);
  const unique = [...new Set(targets)];
  if (unique.length !== 1) throw new Error(`ios/Tortie.xcodeproj names ${String(unique.length)} different iOS deployment targets (${unique.join(', ')}); expected one`);
  return unique[0];
}

/** "minos 18.1" out of `otool -l` / `vtool -show-build` text; every one found. */
export function minosOf(loadCommands) {
  return [...loadCommands.matchAll(/^\s*minos (\S+)$/gm)].map((m) => m[1]);
}

/** Linked libraries outside the system, from `otool -L` text. Pure. */
export function strayLinks(otoolL, installName) {
  return otoolL
    .split('\n')
    .slice(1)
    .map((l) => l.trim().split(' ')[0])
    .filter((p) => p !== '' && p !== installName && !p.startsWith('/usr/lib/') && !p.startsWith('/System/Library/'));
}

/**
 * Every assertion on the built xcframework. Returns what the log line and the
 * stamp record.
 */
function assertXcframework(xcf, pin, log) {
  const info = plistJson(join(xcf, 'Info.plist'));
  const libs = info.AvailableLibraries ?? [];
  const got = libs.map((l) => l.LibraryIdentifier).sort();
  const want = SLICES.map((s) => s.id).sort();
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    throw new Error(`the xcframework holds the slices ${got.join(', ')}, and make ios-fat should write ${want.join(', ')}`);
  }
  const floor = appDeploymentTarget(readFileSync(PBXPROJ, 'utf8'));
  const report = { slices: {} };
  for (const slice of SLICES) {
    const lib = libs.find((l) => l.LibraryIdentifier === slice.id);
    if (lib.SupportedPlatform !== slice.platform || (lib.SupportedPlatformVariant ?? null) !== slice.variant) {
      throw new Error(`slice ${slice.id} says platform ${String(lib.SupportedPlatform)} ${String(lib.SupportedPlatformVariant)}`);
    }
    const fw = join(xcf, slice.id, 'TailscaleKit.framework');
    const bin = join(fw, 'TailscaleKit');
    if (!existsSync(bin)) throw new Error(`slice ${slice.id} has no ${relative(xcf, bin)}`);
    if (existsSync(join(fw, 'Versions'))) throw new Error(`slice ${slice.id} is a deep framework; an iOS framework is shallow, and the manifest goes at its root`);
    const archs = (readLine('/usr/bin/lipo', ['-archs', bin]) ?? '').split(' ').filter(Boolean).sort();
    if (JSON.stringify(archs) !== JSON.stringify([...slice.archs].sort())) {
      throw new Error(`slice ${slice.id} holds ${archs.join(' ')}, expected ${slice.archs.join(' ')}`);
    }
    const header = readLine('/usr/bin/otool', ['-hv', '-arch', 'arm64', bin]) ?? '';
    if (!/\bDYLIB\b/.test(header)) throw new Error(`slice ${slice.id}'s TailscaleKit is not a dynamic library`);
    const loads = run('/usr/bin/otool', ['-l', '-arch', 'arm64', bin], { cwd: ROOT, env: process.env, label: 'otool -l' });
    const minos = [...new Set(minosOf(loads))];
    if (minos.length !== 1) throw new Error(`slice ${slice.id} carries ${String(minos.length)} minimum OS versions: ${minos.join(', ')}`);
    if (!versionAtLeast(floor.split('.').map(Number), minos[0].split('.').map(Number))) {
      throw new Error(`slice ${slice.id} needs iOS ${minos[0]}, above the app's deployment target ${floor} in ios/Tortie.xcodeproj`);
    }
    if (pin.expected?.minos !== undefined && minos[0] !== pin.expected.minos) {
      throw new Error(`slice ${slice.id} needs iOS ${minos[0]}, and the pin records ${pin.expected.minos}; a new floor is a new line in build/p316/SPEC.md §3.5 before it is a new pin`);
    }
    const linked = run('/usr/bin/otool', ['-L', '-arch', 'arm64', bin], { cwd: ROOT, env: process.env, label: 'otool -L' });
    const strays = strayLinks(linked, '@rpath/TailscaleKit.framework/TailscaleKit');
    if (strays.length > 0) throw new Error(`slice ${slice.id} links libraries outside the system that the app would not carry: ${strays.join(', ')}`);
    if (/NetworkExtension/.test(linked)) throw new Error(`slice ${slice.id} links NetworkExtension; the node is never a NetworkExtension (research 128 §2)`);
    const undefinedSymbols = run('/usr/bin/nm', ['-u', '-arch', 'arm64', bin], { cwd: ROOT, env: process.env, label: 'nm -u' })
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (undefinedSymbols.some((s) => /NEVPNManager|NEPacketTunnel|NETunnelProvider/.test(s))) {
      throw new Error(`slice ${slice.id} names a NetworkExtension class`);
    }
    // The hardening round: the switch Node.swift calls before every start is
    // in the binary and in the header Swift sees.
    const exported = run('/usr/bin/nm', ['-gU', '-arch', 'arm64', bin], { cwd: ROOT, env: process.env, label: 'nm -gU' });
    for (const symbol of ['_tailscale_no_logs_no_support', '_TsnetNoLogsNoSupport']) {
      if (!new RegExp(` T ${symbol}$`, 'm').test(exported)) throw new Error(`slice ${slice.id} does not export ${symbol}, so the node's logs could not be turned off`);
    }
    if (!/\bextern int tailscale_no_logs_no_support\(void\);/.test(readFileSync(join(fw, 'Headers', 'TailscaleKit.h'), 'utf8'))) {
      throw new Error(`slice ${slice.id}'s TailscaleKit.h does not declare tailscale_no_logs_no_support, so Swift could not call it`);
    }
    const strings = run('/usr/bin/strings', ['-a', bin], { cwd: ROOT, env: process.env, label: 'strings' }).split('\n');
    const derived = categoriesOf(undefinedSymbols, strings);
    const drift = privacyDrift(pin.privacy.categories, derived);
    if (drift.length > 0) throw new Error(`slice ${slice.id}'s privacy manifest would not be accurate: ${drift.join('; ')}`);
    report.slices[slice.id] = {
      archs,
      minos: minos[0],
      bytes: statSync(bin).size,
      links: linked.split('\n').slice(1).filter((l) => l.trim() !== '').length,
      categories: Object.fromEntries([...derived.categories].map(([c, why]) => [c, why]))
    };
  }
  report.floor = floor;
  const device = report.slices['ios-arm64'];
  log(
    `  • ${String(want.length)} slices, each needing iOS ${device.minos} (the app's floor is ${floor}), linking the system only, no NetworkExtension; ` +
      `the device binary calls ${Object.values(device.categories).flat().join(', ')}, which is exactly the pinned categories`
  );
  return report;
}

/** Write each slice's manifest and prove it reads back as written. */
function writeManifests(xcf, pin, log) {
  const text = privacyManifest(pin.privacy.categories);
  for (const slice of SLICES) {
    const path = join(xcf, slice.id, 'TailscaleKit.framework', 'PrivacyInfo.xcprivacy');
    writeFileSync(path, text);
    run('/usr/bin/plutil', ['-lint', '-s', path], { cwd: ROOT, env: process.env, label: 'plutil -lint' });
    const back = plistJson(path);
    const declared = Object.fromEntries((back.NSPrivacyAccessedAPITypes ?? []).map((e) => [e.NSPrivacyAccessedAPIType, e.NSPrivacyAccessedAPITypeReasons]));
    if (JSON.stringify(declared) !== JSON.stringify(Object.fromEntries(Object.keys(pin.privacy.categories).sort().map((c) => [c, pin.privacy.categories[c]])))) {
      throw new Error(`${relative(ROOT, path)} does not read back as the pinned categories`);
    }
  }
  log(`  • PrivacyInfo.xcprivacy at both framework roots: ${Object.entries(pin.privacy.categories).map(([c, r]) => `${c.replace('NSPrivacyAccessedAPICategory', '')} ${r.join(',')}`).join(', ')}`);
  return sha256(text);
}

/** What the stamp must say for the product on disk to be this pin's. */
export function stampDigest(pin, patch = NO_LOGS_PATCH) {
  return sha256(JSON.stringify({ commit: pin.commit, source: pin.source.sha256, manifest: privacyManifest(pin.privacy.categories), patch }));
}

/** Total bytes under a directory, following nothing. */
function bytesUnder(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) total += bytesUnder(p);
    else if (entry.isFile()) total += statSync(p).size;
  }
  return total;
}

/**
 * A digest of a framework directory WHOLE: every regular file, by its path
 * relative to the directory and the sha256 of its bytes (the hardening round).
 * The same bytes `find . -type f -print0 | LC_ALL=C sort -z | xargs -0 shasum
 * -a 256 | shasum -a 256` prints, so the Xcode phase "TailscaleKit is
 * vendored" computes it in shell and compares it with the stamp as this does.
 * A file missing, added, renamed or changed by one byte moves it; the size
 * alone did not (the reverify flipped one byte of a slice's binary, and
 * removed a slice's Modules and Headers, and the copy still read as built).
 */
export function frameworkTreeDigest(dir) {
  const files = [];
  const walk = (at, rel) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const path = join(at, entry.name);
      const name = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(path, name);
      else if (entry.isFile()) files.push({ path, name });
    }
  };
  walk(dir, '.');
  files.sort((a, b) => Buffer.compare(Buffer.from(a.name), Buffer.from(b.name)));
  return sha256(Buffer.from(files.map((f) => `${sha256(readFileSync(f.path))}  ${f.name}\n`).join('')));
}

/**
 * The product on disk is this pin's: stamp, digest, both manifests, and both
 * slices' binaries at the size the stamp recorded when the build proved them.
 * 316.3's verification deleted the simulator slice's binary from a copy whose
 * stamp and manifests were intact: this answered "already built", Xcode ended
 * in `ld: framework 'TailscaleKit' not found`, and the command the sentence
 * names could not repair it without `--force`.
 */
function alreadyBuilt(pin, { stampPath = STAMP, xcframework = XCFRAMEWORK } = {}) {
  if (!existsSync(stampPath) || !existsSync(join(xcframework, 'Info.plist'))) return null;
  let stamp;
  try {
    stamp = JSON.parse(readFileSync(stampPath, 'utf8'));
  } catch {
    return null;
  }
  if (stamp.commit !== pin.commit || stamp.digest !== stampDigest(pin)) return null;
  const text = privacyManifest(pin.privacy.categories);
  for (const slice of SLICES) {
    const path = join(xcframework, slice.id, 'TailscaleKit.framework', 'PrivacyInfo.xcprivacy');
    if (!existsSync(path) || readFileSync(path, 'utf8') !== text) return null;
    const bin = join(xcframework, slice.id, 'TailscaleKit.framework', 'TailscaleKit');
    const want = stamp.slices?.[slice.id]?.bytes;
    let got;
    try {
      const st = statSync(bin);
      got = st.isFile() ? st.size : -1;
    } catch {
      return null;
    }
    if (!Number.isInteger(want) || want <= 0 || got !== want) return null;
    // The whole directory, byte for byte (the hardening round).
    const tree = stamp.slices?.[slice.id]?.tree;
    if (typeof tree !== 'string' || !HEX64.test(tree)) return null;
    try {
      if (frameworkTreeDigest(join(xcframework, slice.id, 'TailscaleKit.framework')) !== tree) return null;
    } catch {
      return null;
    }
  }
  return stamp;
}

/**
 * Null when build/vendor/tailscalekit/ holds this pin's build, else the one
 * sentence naming the command that makes it. For the npm paths that build the
 * app (`test:ios`, `probe:p316`): an Xcode build with no copy at all stops
 * while it PLANS, with Xcode's own "There is no XCFramework found at" and
 * before the project's check phase can run, so these say the command first.
 * The same test the build's fast path asks, so the two never disagree.
 */
export function vendoredTailscaleKitProblem({ pinPath = PIN_PATH, stampPath = STAMP, xcframework = XCFRAMEWORK } = {}) {
  let pin;
  try {
    pin = JSON.parse(readFileSync(pinPath, 'utf8'));
  } catch (err) {
    return `${relative(ROOT, pinPath)} cannot be read (${String(err?.message ?? err)}), so the vendored TailscaleKit cannot be judged.`;
  }
  const problems = checkPin(pin);
  if (problems.length > 0) return `${relative(ROOT, pinPath)} is not a complete pin: ${problems.join('; ')}.`;
  return alreadyBuilt(pin, { stampPath, xcframework }) === null ? `TailscaleKit here is not the pinned build. ${RUN_ME}` : null;
}

// ---------------------------------------------------------------------------
// The one entry point
// ---------------------------------------------------------------------------

/**
 * Ensure build/vendor/tailscalekit/ holds the pinned TailscaleKit.xcframework.
 * Idempotent: a product whose stamp matches the pin is kept, with no fetch and
 * no Go.
 */
export async function ensureTailscaleKit({ force = false, recording = false, log = console.log } = {}) {
  let pin = readPin({ recording });

  if (!force && !recording) {
    const stamp = alreadyBuilt(pin);
    if (stamp !== null) {
      log(`  • TailscaleKit ${pin.commit.slice(0, 12)} already built (${relative(ROOT, XCFRAMEWORK)}, ${String(stamp.xcframeworkBytes)} bytes)`);
      return { xcframework: XCFRAMEWORK, cached: true, stamp };
    }
  }

  const started = Date.now();
  const { tools, source, srcDir } = await withGoDir(GO_DIR, process.env, async (env) => {
    const tools = preflight(pin, env);
    log(`  • ${tools.go}; ${tools.xcode}`);
    const source = await ensureSource(pin, { recording }, log);

    const srcDir = unpack(source.cached, pin, log);
    applyNoLogsPatch(srcDir, log);

    // 1. The modules, before the fifty seconds of make: a drift refuses first.
    const measured = deriveModules(srcDir, pin, env);
    if (recording && pin.modules === null) pin = { ...pin, modules: measured.modules };
    if (recording && pin.buildList === null) pin = { ...pin, buildList: measured.buildList };
    const drift = [...moduleDrift(pin.modules, measured.modules), ...moduleDrift(pin.buildList, measured.buildList)];
    if (drift.length > 0) {
      throw new Error(`the Go modules drifted from the pin, so the licence facts would be stale:\n  ${drift.join('\n  ')}`);
    }
    log(`  • ${String(measured.modules.length)} modules compiled into the device slice (${licenceCounts(measured.modules)}; ${String(measured.modules.filter((m) => m.notice).length)} carry a NOTICE), ${String(measured.buildList.length)} in the build list; both equal the pin`);

    // 2. Upstream's own build. Its recipes pipe xcodebuild into `cat` when
    // xcpretty is absent, which hides xcodebuild's exit status from make, so
    // the log is read as well as the exit code.
    const logPath = join(WORK_DIR, 'make.log');
    const fd = openSync(logPath, 'w');
    let child;
    try {
      child = spawnSync('make', ['ios-fat', 'XCPRETTIFIER=cat'], { cwd: join(srcDir, 'swift'), env: { ...env, PWD: join(srcDir, 'swift') }, stdio: ['ignore', fd, fd] });
    } finally {
      closeSync(fd);
    }
    const out = readFileSync(logPath, 'utf8');
    const failed = (out.match(/\*\* BUILD FAILED \*\*/g) ?? []).length;
    const succeeded = (out.match(/\*\* BUILD SUCCEEDED \*\*/g) ?? []).length;
    if (child.error || child.status !== 0 || failed > 0 || succeeded !== 2 || !/xcframework successfully written out/.test(out)) {
      throw new Error(
        `make ios-fat did not build the xcframework (exit ${String(child.status)}, ${String(succeeded)} of 2 builds succeeded, ${String(failed)} failed). ` +
          `The whole log is ${relative(ROOT, logPath)}; its last 30 lines:\n${out.split('\n').slice(-30).join('\n')}`
      );
    }
    log('  • make ios-fat: both xcodebuild builds succeeded and the xcframework was written');
    return { tools, source, srcDir };
  });

  const built = join(srcDir, 'swift', 'build', 'Build', 'Products', 'Release-iphonefat', 'TailscaleKit.xcframework');
  const report = assertXcframework(built, pin, log);
  const manifestSha = writeManifests(built, pin, log);
  // Last, once the manifests are in: each slice's whole directory, so a copy
  // missing a file, or holding one changed, is not the pinned build.
  for (const slice of SLICES) report.slices[slice.id].tree = frameworkTreeDigest(join(built, slice.id, 'TailscaleKit.framework'));

  // The old product is replaced only now, after the new one passed every
  // assertion, so a refused rebuild leaves the last good copy and its stamp in
  // place. The stamp goes first and is written last, so no stamp ever sits
  // beside an xcframework it does not describe.
  rmSync(STAMP, { force: true });
  rmSync(XCFRAMEWORK, { recursive: true, force: true });
  renameSync(built, XCFRAMEWORK);
  const xcframeworkBytes = bytesUnder(XCFRAMEWORK);
  const stamp = {
    commit: pin.commit,
    digest: stampDigest(pin),
    patch: 'no-logs-no-support: tailscale_no_logs_no_support()',
    sourceSha256: source.sha256,
    manifestSha256: manifestSha,
    go: tools.go,
    xcode: tools.xcode,
    builtAt: new Date().toISOString(),
    seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
    xcframeworkBytes,
    ...report
  };
  writeFileSync(STAMP, `${JSON.stringify(stamp, null, 2)}\n`);
  // The unpacked tree is about half a gigabyte (the source, upstream's derived
  // data and the two static archives) and nothing reads it once the product
  // has moved out. It is kept only when a build fails, because the refusal
  // names its make.log.
  rmSync(WORK_DIR, { recursive: true, force: true });

  if (recording) {
    const next = { ...pin, source: { ...pin.source, sha256: pin.source.sha256 ?? source.sha256 } };
    writeFileSync(PIN_PATH, `${JSON.stringify(next, null, 2)}\n`);
    log(`  • recorded the null fields of ${relative(ROOT, PIN_PATH)}`);
  }

  const device = report.slices['ios-arm64'];
  log(
    `  • TailscaleKit ${pin.commit.slice(0, 12)} built → ${relative(ROOT, XCFRAMEWORK)} ` +
      `(${String(xcframeworkBytes)} bytes; the device binary ${String(device.bytes)} bytes; ${String(stamp.seconds)} s)`
  );
  return { xcframework: XCFRAMEWORK, cached: false, stamp };
}

export { PIN_PATH, XCFRAMEWORK, STAMP, VENDOR_DIR, GO_DIR, RUN_ME };

// ---------------------------------------------------------------------------
// The self-test: every pure clause above, each driven to its refusal
// ---------------------------------------------------------------------------

/** A gzip'd tar whose first header is a pax global header with this comment. */
function fakeArchive(commit, extra = 'file body') {
  const block = (s) => {
    const b = Buffer.alloc(512);
    b.write(s);
    return b;
  };
  const header = (name, size, typeflag) => {
    const h = Buffer.alloc(512);
    h.write(name, 0);
    h.write('0000666\0', 100);
    h.write(`${size.toString(8).padStart(11, '0')}\0`, 124);
    h.write(typeflag, 156);
    return h;
  };
  const record = `comment=${commit}\n`;
  const len = String(record.length + String(record.length).length + 1);
  const pax = `${len} ${record}`;
  const parts = [header('pax_global_header', pax.length, 'g'), block(pax), header('x/README', extra.length, '0'), block(extra), Buffer.alloc(1024)];
  return gzipSync(Buffer.concat(parts));
}

export async function selfTest() {
  const results = [];
  const check = (name, ok) => results.push({ name, ok: Boolean(ok) });
  const throws = (fn, re) => {
    try {
      fn();
      return false;
    } catch (err) {
      return re.test(err.message);
    }
  };

  const commit = '59d4bb82744915815178e0f0776d60026a397ee7';
  const other = '0000000000000000000000000000000000000001';
  const archive = fakeArchive(commit);
  const pin = {
    commit,
    goModGo: '1.25.5',
    source: { url: `https://codeload.github.com/tailscale/libtailscale/tar.gz/${commit}`, sha256: sha256(archive) },
    privacy: { categories: { NSPrivacyAccessedAPICategoryFileTimestamp: ['C617.1'], NSPrivacyAccessedAPICategorySystemBootTime: ['35F9.1'] } },
    modules: [{ path: 'a.example/x', version: 'v1.0.0', licence: 'MIT', notice: false }],
    buildList: ['a.example/x@v1.0.0']
  };

  // The pin's shape.
  check('a complete pin is accepted', checkPin(pin).length === 0);
  check('a pin whose sha256 is not recorded refuses without --record', checkPin({ ...pin, source: { ...pin.source, sha256: null } }).some((p) => p.includes('has not been recorded')));
  check('--record admits the three null fields', checkPin({ ...pin, source: { ...pin.source, sha256: null }, modules: null, buildList: null }, { recording: true }).length === 0);
  check('a url that does not end in the commit refuses', checkPin({ ...pin, source: { ...pin.source, url: 'https://codeload.github.com/tailscale/libtailscale/tar.gz/main' } }).length > 0);
  check('a privacy category Apple does not list refuses', checkPin({ ...pin, privacy: { categories: { NSPrivacyAccessedAPICategoryMadeUp: ['C617.1'] } } }).length > 0);
  check('a modules entry without its licence refuses', checkPin({ ...pin, modules: [{ path: 'a', version: 'v1' }] }).length > 0);

  // The source.
  check('the pax reader finds the commit', paxCommit(archive) === commit);
  check('an archive of another commit refuses even with its own sha256 pinned', throws(() => judgeSource(fakeArchive(other), { ...pin, source: { ...pin.source, sha256: sha256(fakeArchive(other)) } }), /is not the pinned source/));
  check('the pinned archive is accepted', judgeSource(archive, pin) === sha256(archive));
  check('a different archive of the pinned commit refuses on sha256', throws(() => judgeSource(fakeArchive(commit, 'changed body'), pin), /sha256 is/));
  check('an unrecorded sha256 refuses without --record and prints the measurement', throws(() => judgeSource(archive, { ...pin, source: { ...pin.source, sha256: null } }), new RegExp(sha256(archive))));
  check('--record accepts an unrecorded sha256', judgeSource(archive, { ...pin, source: { ...pin.source, sha256: null } }, { recording: true }) === sha256(archive));

  // The environment: every clause of childEnv.
  const env = childEnv({ PATH: '/usr/bin', HOME: '/Users/someone', GOPATH: '/Users/someone/go', GOFLAGS: '-mod=mod', GOPROXY: 'direct', CGO_CFLAGS: '-O0', TMUX: 'x', MAKEFLAGS: 'j', SDKROOT: 'x', IPHONEOS_DEPLOYMENT_TARGET: '12.0' }, '/v/.cache');
  check('HOME is redirected under the vendor .cache', env.HOME === '/v/.cache/home');
  check('GOPATH is redirected', env.GOPATH === '/v/.cache/gopath');
  check('GOMODCACHE is redirected', env.GOMODCACHE === '/v/.cache/gomodcache');
  check('GOCACHE is redirected', env.GOCACHE === '/v/.cache/gocache');
  check('GOTOOLCHAIN is local', env.GOTOOLCHAIN === 'local');
  check('GOTELEMETRY is off', env.GOTELEMETRY === 'off');
  check('GOFLAGS is exactly -modcacherw', env.GOFLAGS === '-modcacherw');
  check("the caller's other GO* and CGO_* variables are dropped", env.GOPROXY === undefined && env.CGO_CFLAGS === undefined);
  check('TMUX and MAKEFLAGS are dropped', env.TMUX === undefined && env.MAKEFLAGS === undefined);
  check('SDKROOT and deployment targets are dropped', env.SDKROOT === undefined && env.IPHONEOS_DEPLOYMENT_TARGET === undefined);
  check('PATH is kept', env.PATH === '/usr/bin');

  // The Go directory's lifetime: a child that writes into HOME before anything
  // else (Go's telemetry, SPEC §3.7) must not make the directory look as if it
  // had been there before.
  const scratch = join(VENDOR_DIR, `.self-test-${String(process.pid)}`);
  try {
    rmSync(scratch, { recursive: true, force: true });
    const seen = await withGoDir(join(scratch, 'go'), { PATH: '/usr/bin' }, async (e) => {
      // A HOME that is not redirected is its own red check above; this block
      // still writes inside the directory, as Go's telemetry does.
      const telemetry = join(typeof e.HOME === 'string' ? e.HOME : join(scratch, 'go', 'home'), 'Library', 'Application Support', 'go', 'telemetry');
      mkdirSync(telemetry, { recursive: true });
      writeFileSync(join(telemetry, 'count'), 'x');
      return e;
    });
    check('withGoDir hands out HOME under its directory', seen.HOME === join(scratch, 'go', 'home'));
    check('withGoDir deletes the directory it made, even after a child wrote into HOME', !existsSync(join(scratch, 'go')));
    let threw = false;
    try {
      await withGoDir(join(scratch, 'go'), {}, async () => {
        throw new Error('refused');
      });
    } catch (err) {
      threw = err.message === 'refused';
    }
    check('withGoDir passes a refusal on and still deletes what it made', threw && !existsSync(join(scratch, 'go')));
    mkdirSync(join(scratch, 'kept'), { recursive: true });
    await withGoDir(join(scratch, 'kept'), {}, async () => null);
    check('withGoDir keeps a directory that was there before it', existsSync(join(scratch, 'kept')));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  // The question test:ios and probe:p316 ask before they build the app.
  const kit = join(VENDOR_DIR, `.self-test-kit-${String(process.pid)}`);
  try {
    rmSync(kit, { recursive: true, force: true });
    const xcf = join(kit, 'TailscaleKit.xcframework');
    const slices = {};
    for (const [k, slice] of SLICES.entries()) {
      mkdirSync(join(xcf, slice.id, 'TailscaleKit.framework'), { recursive: true });
      writeFileSync(join(xcf, slice.id, 'TailscaleKit.framework', 'PrivacyInfo.xcprivacy'), privacyManifest(pin.privacy.categories));
      writeFileSync(join(xcf, slice.id, 'TailscaleKit.framework', 'TailscaleKit'), Buffer.alloc(64 + k));
      slices[slice.id] = { bytes: 64 + k };
    }
    writeFileSync(join(xcf, 'Info.plist'), '<plist/>');
    for (const slice of SLICES) {
      mkdirSync(join(xcf, slice.id, 'TailscaleKit.framework', 'Modules'), { recursive: true });
      writeFileSync(join(xcf, slice.id, 'TailscaleKit.framework', 'Modules', 'module.modulemap'), 'framework module TailscaleKit {}\n');
      slices[slice.id].tree = frameworkTreeDigest(join(xcf, slice.id, 'TailscaleKit.framework'));
    }
    const pinPath = join(kit, 'pin.json');
    writeFileSync(pinPath, JSON.stringify(pin));
    const stampPath = join(kit, 'stamp.json');
    const where = { pinPath, stampPath, xcframework: xcf };
    const stampWith = (fields) => writeFileSync(stampPath, JSON.stringify({ commit: pin.commit, digest: stampDigest(pin), slices, ...fields }));
    check('a missing stamp is not the pinned build, and says the command', vendoredTailscaleKitProblem(where)?.endsWith(RUN_ME) === true);
    stampWith({});
    check("a stamp naming this pin's commit and digest, over both slices' binaries, is the pinned build", vendoredTailscaleKitProblem(where) === null);
    stampWith({ commit: '0'.repeat(40) });
    check("a stamp naming another commit is not the pinned build", vendoredTailscaleKitProblem(where)?.endsWith(RUN_ME) === true);
    stampWith({ slices: undefined });
    check('a stamp that records no slice sizes is not the pinned build', vendoredTailscaleKitProblem(where)?.endsWith(RUN_ME) === true);
    stampWith({});
    const simBinary = join(xcf, SLICES[1].id, 'TailscaleKit.framework', 'TailscaleKit');
    rmSync(simBinary);
    check("a slice without its binary is not the pinned build (the verification's partial copy)", vendoredTailscaleKitProblem(where)?.endsWith(RUN_ME) === true);
    writeFileSync(simBinary, Buffer.alloc(3));
    check('a slice binary of another size is not the pinned build', vendoredTailscaleKitProblem(where)?.endsWith(RUN_ME) === true);
    rmSync(simBinary);
    mkdirSync(simBinary);
    check('a directory where the binary should be is not the pinned build', vendoredTailscaleKitProblem(where)?.endsWith(RUN_ME) === true);
    rmSync(simBinary, { recursive: true });
    writeFileSync(simBinary, Buffer.alloc(65));
    check('the same copy with its binary back is the pinned build again', vendoredTailscaleKitProblem(where) === null);
    // The hardening round: the whole directory, byte for byte.
    stampWith({ slices: Object.fromEntries(Object.entries(slices).map(([k, v]) => [k, { bytes: v.bytes }])) });
    check('a stamp that records no directory digest is not the pinned build', vendoredTailscaleKitProblem(where)?.endsWith(RUN_ME) === true);
    stampWith({});
    const simDir = join(xcf, SLICES[1].id, 'TailscaleKit.framework');
    const flipped = Buffer.alloc(65);
    flipped[32] = 1;
    writeFileSync(simBinary, flipped);
    check('a slice binary of the same size with one byte changed is not the pinned build (the reverify\'s flipped byte)', vendoredTailscaleKitProblem(where)?.endsWith(RUN_ME) === true);
    writeFileSync(simBinary, Buffer.alloc(65));
    rmSync(join(simDir, 'Modules'), { recursive: true });
    check("a slice without its Modules is not the pinned build (the reverify's partial copy)", vendoredTailscaleKitProblem(where)?.endsWith(RUN_ME) === true);
    mkdirSync(join(simDir, 'Modules'));
    writeFileSync(join(simDir, 'Modules', 'module.modulemap'), 'framework module TailscaleKit {}\n');
    check('the same copy with its Modules back is the pinned build again', vendoredTailscaleKitProblem(where) === null);
    writeFileSync(join(simDir, 'Extra'), 'x');
    check('a slice holding a file the build did not write is not the pinned build', vendoredTailscaleKitProblem(where)?.endsWith(RUN_ME) === true);
    rmSync(join(simDir, 'Extra'));
    check('the directory digest reads paths and bytes, not the directory it sits in', frameworkTreeDigest(simDir) === slices[SLICES[1].id].tree);
    check('two slices of different bytes have different digests', slices[SLICES[0].id].tree !== slices[SLICES[1].id].tree);
    rmSync(join(xcf, SLICES[1].id, 'TailscaleKit.framework', 'PrivacyInfo.xcprivacy'));
    check('a slice without its manifest is not the pinned build', vendoredTailscaleKitProblem(where)?.endsWith(RUN_ME) === true);
    rmSync(xcf, { recursive: true, force: true });
    check('no xcframework at all is not the pinned build', vendoredTailscaleKitProblem(where)?.endsWith(RUN_ME) === true);
  } finally {
    rmSync(kit, { recursive: true, force: true });
  }

  // Go's version.
  check('go1.26.0 reads as 1.26.0', JSON.stringify(parseGoVersion('go version go1.26.0 darwin/arm64')) === '[1,26,0]');
  check('1.26.0 is at least 1.25.5', versionAtLeast([1, 26, 0], [1, 25, 5]));
  check('1.25.4 is below 1.25.5', !versionAtLeast([1, 25, 4], [1, 25, 5]));
  check('18.1 is at least 18.1', versionAtLeast([18, 1], [18, 1]));

  // Licences.
  check('an Apache text is Apache-2.0', classifyLicence('Apache License\n Version 2.0, January 2004') === 'Apache-2.0');
  check('an MIT text is MIT', classifyLicence('Permission is hereby granted, free of charge, to any person obtaining a copy') === 'MIT');
  check('a BSD text with the third clause is BSD-3-Clause', classifyLicence('Redistribution and use in source and binary forms ... Neither the name of Google Inc. nor') === 'BSD-3-Clause');
  check('a BSD text without it is BSD-2-Clause', classifyLicence('Redistribution and use in source and binary forms, with or without modification') === 'BSD-2-Clause');
  check('an unknown text is not named', classifyLicence('All rights reserved.') === null);

  // Module drift.
  check('equal lists do not drift', moduleDrift(pin.modules, pin.modules).length === 0);
  check('a new module drifts', moduleDrift(pin.modules, [...pin.modules, { path: 'b', version: 'v1', licence: 'MIT', notice: false }]).length === 1);
  check('a moved version drifts', moduleDrift(pin.modules, [{ ...pin.modules[0], version: 'v1.0.1' }]).length === 2);
  check('a changed licence drifts', moduleDrift(pin.modules, [{ ...pin.modules[0], licence: 'Apache-2.0' }]).length === 1);
  check('a NOTICE that appears drifts', moduleDrift(pin.modules, [{ ...pin.modules[0], notice: true }]).length === 1);
  check('a build list entry that moves drifts', moduleDrift(pin.buildList, ['a.example/x@v1.0.1']).length === 2);

  // The privacy categories.
  const goRuntime = categoriesOf(['_stat', '_fstat', '_lstat', '_mach_absolute_time', '_sysctl', '_clock_gettime'], []);
  check('stat, fstat and lstat are FileTimestamp', goRuntime.categories.get('NSPrivacyAccessedAPICategoryFileTimestamp')?.length === 3);
  check('mach_absolute_time is SystemBootTime', goRuntime.categories.has('NSPrivacyAccessedAPICategorySystemBootTime'));
  check('sysctl and clock_gettime are no category', goRuntime.categories.size === 2);
  check('the pinned categories match the Go runtime exactly', privacyDrift(pin.privacy.categories, goRuntime).length === 0);
  check('a binary that starts calling statfs refuses', privacyDrift(pin.privacy.categories, categoriesOf(['_stat', '_mach_absolute_time', '_statfs'], [])).some((d) => d.includes('DiskSpace')));
  check('a binary that stops calling mach_absolute_time refuses', privacyDrift(pin.privacy.categories, categoriesOf(['_stat'], [])).some((d) => d.includes('no longer calls')));
  check('getattrlist refuses as ambiguous', privacyDrift(pin.privacy.categories, categoriesOf(['_stat', '_mach_absolute_time', '_getattrlist'], [])).some((d) => d.includes('both')));
  check('an ObjC UserDefaults string refuses', privacyDrift(pin.privacy.categories, categoriesOf(['_stat', '_mach_absolute_time'], ['NSUserDefaults'])).some((d) => d.includes('UserDefaults')));
  check('a $INODE64 variant still counts', categoriesOf(['_stat$INODE64'], []).categories.has('NSPrivacyAccessedAPICategoryFileTimestamp'));

  // The manifest's bytes.
  const xml = privacyManifest(pin.privacy.categories);
  check('the manifest declares FileTimestamp with C617.1', /<string>NSPrivacyAccessedAPICategoryFileTimestamp<\/string>\s*<key>NSPrivacyAccessedAPITypeReasons<\/key>\s*<array>\s*<string>C617\.1<\/string>/.test(xml));
  check('the manifest declares SystemBootTime with 35F9.1', /<string>NSPrivacyAccessedAPICategorySystemBootTime<\/string>\s*<key>NSPrivacyAccessedAPITypeReasons<\/key>\s*<array>\s*<string>35F9\.1<\/string>/.test(xml));
  check('the manifest says no tracking', /<key>NSPrivacyTracking<\/key>\s*<false\/>/.test(xml));
  check('the manifest collects no data', /<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\/>/.test(xml));
  check('the manifest holds no tab or other control byte', !/[\u0000-\u0009\u000b-\u001f\u007f]/.test(xml));
  check('the stamp digest moves with the manifest', stampDigest(pin) !== stampDigest({ ...pin, privacy: { categories: { NSPrivacyAccessedAPICategoryFileTimestamp: ['C617.1'] } } }));
  check('the stamp digest moves with the commit', stampDigest(pin) !== stampDigest({ ...pin, commit: other }));
  check('the stamp digest moves with the no-logs patch', stampDigest(pin) !== stampDigest(pin, []));

  // The no-logs patch (the hardening round), over texts holding each anchor once.
  const pinned = {
    'tailscale.go': 'package main\n\nimport (\n\t"tailscale.com/hostinfo"\n)\n\n//export TsnetSetLogFD\nfunc TsnetSetLogFD(sd, fd C.int) C.int { return 0 }\n',
    'tailscale.c': 'extern int TsnetSetLogFD(int sd, int fd);\n\nint tailscale_set_logfd(tailscale sd, int fd) {\n\treturn TsnetSetLogFD(sd, fd);\n}\n',
    'tailscale.h': 'extern int tailscale_set_logfd(tailscale sd, int fd);\n',
    'swift/TailscaleKit/TailscaleKit.h': 'extern int tailscale_set_logfd(tailscale sd, int fd);\n'
  };
  const patched = patchSource(pinned);
  const go = patched['tailscale.go'];
  check('the patch imports envknob', go.includes('\t"tailscale.com/envknob"\n\t"tailscale.com/hostinfo"\n'));
  check('the patch exports TsnetNoLogsNoSupport, which calls envknob.SetNoLogsNoSupport', /\/\/export TsnetNoLogsNoSupport\nfunc TsnetNoLogsNoSupport\(\) C\.int \{\n\tenvknob\.SetNoLogsNoSupport\(\)\n/.test(go));
  check('the export answers 0 only when tsnet reads it true', /\tif !envknob\.NoLogsNoSupport\(\) \{\n\t\treturn -1\n\t\}\n\treturn 0\n\}/.test(go));
  check('the C wrapper calls the export', /int tailscale_no_logs_no_support\(void\) \{\n\treturn TsnetNoLogsNoSupport\(\);\n\}/.test(patched['tailscale.c']) && patched['tailscale.c'].includes('extern int TsnetNoLogsNoSupport(void);'));
  check('both headers declare it, the one Swift reads included', ['tailscale.h', 'swift/TailscaleKit/TailscaleKit.h'].every((f) => patched[f].includes('extern int tailscale_no_logs_no_support(void);')));
  check('every other line of the pinned source is kept', Object.keys(pinned).every((f) => pinned[f].split('\n').every((line) => patched[f].includes(line))));
  check('the patch holds no key and names no host but the log host it turns off', !/tskey|controlplane|https?:\/\/(?!log\.tailscale\.com)/.test(JSON.stringify(NO_LOGS_PATCH)));
  check('an anchor the pinned source does not hold refuses', throws(() => patchSource({ ...pinned, 'tailscale.c': 'int x;\n' }), /holds 0 times/));
  check('an anchor the pinned source holds twice refuses', throws(() => patchSource({ ...pinned, 'tailscale.h': `${pinned['tailscale.h']}${pinned['tailscale.h']}` }), /holds 2 times/));
  check('a file the pinned source does not hold refuses', throws(() => patchSource({ 'tailscale.go': pinned['tailscale.go'] }), /does not hold/));

  // The product's shape, over otool text.
  check('minos is read from LC_BUILD_VERSION text', JSON.stringify(minosOf('Load command 9\n      cmd LC_BUILD_VERSION\n platform 2\n    minos 18.1\n      sdk 26.2')) === '["18.1"]');
  check('a Homebrew dylib is a stray link', strayLinks('bin:\n\t@rpath/TailscaleKit.framework/TailscaleKit (x)\n\t/usr/lib/libSystem.B.dylib (x)\n\t/System/Library/Frameworks/Network.framework/Network (x)\n\t/opt/homebrew/lib/libfoo.dylib (x)', '@rpath/TailscaleKit.framework/TailscaleKit').join() === '/opt/homebrew/lib/libfoo.dylib');

  // The committed project agrees with where this script writes.
  const pbx = readFileSync(PBXPROJ, 'utf8');
  const rel = relative(join(ROOT, 'ios'), XCFRAMEWORK);
  const ref = new RegExp(`\\/\\* TailscaleKit\\.xcframework \\*\\/ = \\{isa = PBXFileReference; lastKnownFileType = wrapper\\.xcframework; name = TailscaleKit\\.xcframework; path = ${rel.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}; sourceTree = SOURCE_ROOT; \\};`);
  check('the project references the xcframework this script writes', ref.test(pbx));
  check('the project links it', /TailscaleKit\.xcframework in Frameworks \*\/ = \{isa = PBXBuildFile;/.test(pbx));
  check('the project embeds and signs it', /TailscaleKit\.xcframework in Embed Frameworks \*\/ = \{isa = PBXBuildFile; fileRef = \w+ \/\* TailscaleKit\.xcframework \*\/; settings = \{ATTRIBUTES = \(CodeSignOnCopy, RemoveHeadersOnCopy, \); \}; \};/.test(pbx));
  check('the embed phase copies into Frameworks (dstSubfolderSpec 10)', /\/\* Embed Frameworks \*\/ = \{\s*isa = PBXCopyFilesBuildPhase;[^}]*dstSubfolderSpec = 10;/.test(pbx));
  check("the app's floor is one deployment target", appDeploymentTarget(pbx) === '18.1');

  // The Xcode check phase names this script's command and compares the stamp.
  const phase = /\/\* TailscaleKit is vendored \*\/ = \{\s*isa = PBXShellScriptBuildPhase;[\s\S]*?shellScript = "((?:[^"\\]|\\.)*)";/.exec(pbx);
  const script = phase === null ? '' : phase[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  check('the Xcode check phase exists', phase !== null);
  check('the Xcode check phase names npm run vendor:tailscalekit', script.includes(RUN_ME));
  check('the Xcode check phase reads the stamp this script writes', script.includes(relative(join(ROOT, 'ios'), STAMP)));
  check('the Xcode check phase compares the commit with the pin', script.includes(relative(join(ROOT, 'ios'), PIN_PATH)) && /-extract commit raw/.test(script));
  check(
    "the Xcode check phase holds each slice's binary to the stamp's size",
    SLICES.every((slice) => script.includes(slice.id)) && /-extract "slices\.\$slice\.bytes" raw/.test(script) && /\/usr\/bin\/stat -f %z/.test(script)
  );
  check(
    "the Xcode check phase holds each slice's whole directory to the stamp's digest, in the pipeline frameworkTreeDigest mirrors",
    /-extract "slices\.\$slice\.tree" raw/.test(script) &&
      script.includes('/usr/bin/find . -type f -print0 | LC_ALL=C /usr/bin/sort -z | /usr/bin/xargs -0 /usr/bin/shasum -a 256 | /usr/bin/shasum -a 256 | /usr/bin/cut -d " " -f 1')
  );
  check("the Xcode check phase asks each slice's header for the no-logs switch", /\/usr\/bin\/grep -q tailscale_no_logs_no_support "\$fw\/Headers\/TailscaleKit\.h"/.test(script));
  const buildPhases = /316A00000000000000000030 \/\* Tortie \*\/ = \{[\s\S]*?buildPhases = \(\s*([^)]*)\);/.exec(pbx)?.[1] ?? '';
  check('the Xcode check phase runs first in the app target', /^\s*\w+ \/\* TailscaleKit is vendored \*\//.test(buildPhases));

  const failed = results.filter((r) => !r.ok);
  for (const r of failed) console.error(`build-tailscalekit self-test: FAILED — ${r.name}`);
  console.log(`build-tailscalekit self-test: ${String(results.length - failed.length)} of ${String(results.length)} checks green.`);
  return failed.length === 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  if (args.has('--self-test')) {
    selfTest().then(
      (ok) => process.exit(ok ? 0 : 1),
      (err) => {
        console.error(`build-tailscalekit self-test: ${err.message}`);
        process.exit(1);
      }
    );
  } else {
    ensureTailscaleKit({ force: args.has('--force'), recording: args.has('--record') }).catch((err) => {
      console.error(`build-tailscalekit: ${err.message}`);
      process.exit(1);
    });
  }
}
