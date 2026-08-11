/**
 * fetch-specstory.cjs — vendor the pinned specstory-cli release so it can ride
 * inside gmux.app.
 *
 * Phase 15. `electron-builder.yml` copies `build/vendor/specstory/bin/` into
 * `gmux.app/Contents/Resources/bin/`; THIS script is what puts a binary there.
 * It runs automatically from the `beforePack` hook (build/before-pack.cjs) and
 * can be run by hand: `npm run vendor:specstory`.
 *
 * Three decisions, all from docs/research/13-specstory-integration.md §2.1:
 *
 *  1. **Download the official GoReleaser artifact, never build from source.**
 *     A `go build` of the CLI reports `version="dev"` and carries an empty
 *     analytics key — a binary that lies about itself is a binary Settings
 *     cannot describe and support cannot triage.
 *  2. **arm64 only.** gmux ships `mac.target.arch: [arm64]`; one arch, one
 *     Mach-O, no lipo. If a universal build ever happens, per-arch app builds
 *     beat a fat binary here.
 *  3. **The blob is NOT in git.** 41 MB per bump is not a thing a source repo
 *     should carry. `build/specstory-release.json` holds the pin (tag +
 *     version + two SHA-256s) and this script materialises it, so the tree
 *     stays small while the build stays exactly reproducible.
 *
 * Integrity is checked TWICE and both checks are fatal: the downloaded tarball
 * against the hash published in the release's checksums file, and the
 * extracted Mach-O against a hash we recorded ourselves. A mismatch aborts the
 * build rather than shipping an unexpected binary inside a signed app.
 *
 * Offline / air-gapped: drop the release tarball anywhere and point
 * `GMUX_SPECSTORY_TARBALL` at it. It is verified against the same pin, so the
 * escape hatch cannot smuggle a different build in. There is deliberately NO
 * "just use this binary" override — that would defeat the pin.
 */

const { createHash } = require('node:crypto');
const {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

/** Repo root — this file lives in <root>/build. */
const ROOT = join(__dirname, '..');

/** The pin. One source of truth, read here and nowhere else. */
const PIN_PATH = join(__dirname, 'specstory-release.json');

/** Everything vendored lands under here; the whole dir is gitignored. */
const VENDOR_DIR = join(ROOT, 'build', 'vendor', 'specstory');
/** Downloaded tarballs, kept so a rebuild costs no network. */
const CACHE_DIR = join(VENDOR_DIR, 'cache');
/**
 * What electron-builder copies. Version-free ON PURPOSE: the pin lives in one
 * JSON file, and a version inside a path in electron-builder.yml would be a
 * second copy of it that drifts on the first bump.
 */
const BIN_DIR = join(VENDOR_DIR, 'bin');
/** The bundled binary's own name inside the app — see src/main/specstory. */
const BIN_NAME = 'specstory';
/** Spawn-free version metadata for Settings — read by src/main/specstory. */
const META_NAME = 'specstory.json';

/** Only arm64 macOS is bundled; see decision 2. */
const PLATFORM_KEY = 'darwin-arm64';

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readPin() {
  const pin = JSON.parse(readFileSync(PIN_PATH, 'utf8'));
  const asset = pin.assets?.[PLATFORM_KEY];
  if (!asset) {
    throw new Error(
      `build/specstory-release.json has no "${PLATFORM_KEY}" asset — the pin is incomplete.`
    );
  }
  return { pin, asset };
}

/** Where the vendored copy and its metadata live (also used by the resolver). */
function vendoredPaths() {
  return { dir: BIN_DIR, bin: join(BIN_DIR, BIN_NAME), meta: join(BIN_DIR, META_NAME) };
}

async function download(url, dest) {
  // Node 22 global fetch follows GitHub's redirect to objects.githubusercontent.
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status} ${res.statusText}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

/**
 * Ensure build/vendor/specstory/bin holds the pinned binary + its metadata.
 * Idempotent and network-free once the hash on disk already matches.
 *
 * @returns {Promise<{dir: string, bin: string, meta: string, version: string, cached: boolean}>}
 */
async function ensureSpecstoryBinary({ log = console.log } = {}) {
  const { pin, asset } = readPin();
  const out = vendoredPaths();

  if (existsSync(out.bin) && existsSync(out.meta)) {
    if (sha256(out.bin) === asset.binarySha256) {
      log(`  • specstory ${pin.version} already vendored (${out.bin})`);
      return { ...out, version: pin.version, cached: true };
    }
    log('  • vendored specstory does not match the pin — refetching');
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  const tarball =
    process.env['GMUX_SPECSTORY_TARBALL'] ?? join(CACHE_DIR, `${pin.tag}-${asset.name}`);

  if (!existsSync(tarball)) {
    const url = `https://github.com/${pin.repo}/releases/download/${pin.tag}/${asset.name}`;
    log(`  • downloading ${url}`);
    await download(url, tarball);
  }

  const got = sha256(tarball);
  if (got !== asset.assetSha256) {
    // Never leave a bad tarball in the cache to poison the next build.
    if (tarball.startsWith(CACHE_DIR)) rmSync(tarball, { force: true });
    throw new Error(
      `specstory ${pin.version} tarball SHA-256 mismatch\n` +
        `  expected ${asset.assetSha256}\n  actual   ${got}\n  file     ${tarball}`
    );
  }

  const staging = mkdtempSync(join(tmpdir(), 'gmux-specstory-'));
  try {
    // Name the member explicitly: this tarball has exactly one entry and a
    // build hook has no business unpacking whatever else might appear.
    execFileSync('/usr/bin/tar', ['xzf', tarball, '-C', staging, asset.member], {
      stdio: 'pipe'
    });
    const extracted = join(staging, asset.member);
    const binHash = sha256(extracted);
    if (binHash !== asset.binarySha256) {
      throw new Error(
        `specstory ${pin.version} binary SHA-256 mismatch\n` +
          `  expected ${asset.binarySha256}\n  actual   ${binHash}`
      );
    }
    const bytes = statSync(extracted).size;
    if (bytes !== asset.binaryBytes) {
      throw new Error(
        `specstory ${pin.version} binary is ${bytes} bytes, pin says ${asset.binaryBytes}`
      );
    }

    mkdirSync(out.dir, { recursive: true });
    copyFileSync(extracted, out.bin);
    chmodSync(out.bin, 0o755);
    writeFileSync(
      out.meta,
      JSON.stringify(
        {
          // Read at runtime by src/main/specstory/resolve.ts so Settings can
          // name the bundled version without spawning anything.
          version: pin.version,
          tag: pin.tag,
          asset: asset.name,
          source: `https://github.com/${pin.repo}/releases/tag/${pin.tag}`,
          // The hash of the PRISTINE upstream binary. The copy that ships is
          // re-signed by build/after-pack.cjs, so its hash differs by design —
          // verify a shipped app with `codesign`, this field with `curl`.
          upstreamBinarySha256: asset.binarySha256,
          upstreamBinaryBytes: asset.binaryBytes
        },
        null,
        2
      ) + '\n'
    );
    log(`  • specstory ${pin.version} vendored → ${out.bin} (${bytes} bytes)`);
    return { ...out, version: pin.version, cached: false };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

module.exports = { ensureSpecstoryBinary, vendoredPaths, BIN_NAME, META_NAME };

if (require.main === module) {
  ensureSpecstoryBinary().catch((err) => {
    console.error(`fetch-specstory: ${err.message}`);
    process.exit(1);
  });
}
