// Phase 363: build the first-party Apple Events N-API addon from source.
// macOS only; elsewhere it exits 0 with a note so non-mac typechecks are untouched.
// Discovery: SDKROOT or `xcrun --show-sdk-path`; headers from NODE_API_HEADERS,
// the running node's own include dir, or node-gyp's cache. Output: out/native/.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = [{ src: 'src/native/apple-events.mm', out: 'apple-events.node' }];
if (process.env.P363_WITH_SELF_SEND === '1') SOURCES.push({ src: 'build/p363/self-send.mm', out: 'self-send.node' });

function die(msg) { console.error(`build-apple-events: ${msg}`); process.exit(1); }

if (process.platform !== 'darwin') { console.log('build-apple-events: not macOS, skipped'); process.exit(0); }

function sdks() {
  // SDKROOT wins. Otherwise the default SDK first, then every installed SDK
  // newest first: a beta default SDK can carry .tbd files the linker cannot read.
  if (process.env.SDKROOT) return [process.env.SDKROOT];
  const list = [];
  try { list.push(execFileSync('xcrun', ['--show-sdk-path'], { encoding: 'utf8' }).trim()); }
  catch { die('no macOS SDK. Install Xcode or the Command Line Tools (xcode-select --install), or set SDKROOT to a macOS SDK path.'); }
  for (const dir of ['/Library/Developer/CommandLineTools/SDKs', '/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs']) {
    if (!existsSync(dir)) continue;
    for (const n of readdirSync(dir).filter((x) => /^MacOSX\d+(\.\d+)?\.sdk$/.test(x)).sort().reverse()) list.push(join(dir, n));
  }
  return [...new Set(list)];
}
function headers() {
  const cands = [process.env.NODE_API_HEADERS, join(dirname(process.execPath), '..', 'include', 'node')];
  const cache = join(homedir(), 'Library', 'Caches', 'node-gyp');
  if (existsSync(cache)) cands.push(join(cache, process.versions.node, 'include', 'node'));
  for (const c of cands) if (c && existsSync(join(c, 'node_api.h'))) return c;
  die('node_api.h not found. Set NODE_API_HEADERS to a directory holding it (Node headers, e.g. from `npx node-gyp install`).');
}
const inc = headers();
const outDir = join(root, 'out', 'native');
mkdirSync(outDir, { recursive: true });
for (const { src, out } of SOURCES) {
  let last = '';
  let built = false;
  for (const sysroot of sdks()) {
    const args = ['clang++', '-isysroot', sysroot, '-arch', 'arm64', '-std=c++17', '-fobjc-arc', '-O2', '-shared',
      '-undefined', 'dynamic_lookup', '-DNODE_GYP_MODULE_NAME=addon', '-DNAPI_VERSION=8', '-I', inc,
      '-framework', 'Foundation', '-framework', 'ApplicationServices', '-o', join(outDir, out), join(root, src)];
    const r = spawnSync('xcrun', args, { encoding: 'utf8' });
    if (r.status === 0) { console.log(`build-apple-events: built out/native/${out} (SDK ${sysroot})`); built = true; break; }
    last = `${sysroot}: ${r.stderr || r.error}`;
  }
  if (!built) die(`compile of ${src} failed with every SDK tried (needs Xcode CLT clang++ and a usable macOS SDK; set SDKROOT to choose one). Last error:\n${last.slice(0, 1500)}`);
}
