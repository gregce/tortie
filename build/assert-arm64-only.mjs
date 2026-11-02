#!/usr/bin/env node
/**
 * assert-arm64-only.mjs. Every Mach-O file in a packaged Tortie.app holds
 * arm64 code (Phase 351, issue 43).
 *
 * ## Why this gate exists
 *
 * On an Apple silicon Mac, macOS 26 showed "Support Ending for Intel-based
 * Apps" for Tortie 0.113.0: the app "includes a component that will not work
 * with a future release of macOS" (issue 43, Sean Johnson). It carried three
 * Intel-only (x86_64) files, none of which it ever loads, all under
 * Contents/Resources/app.asar.unpacked/node_modules/:
 *
 *   better-sqlite3/prebuilds/darwin-x64.node     the issue names it
 *   node-pty/prebuilds/darwin-x64/pty.node       the issue names it
 *   node-pty/prebuilds/darwin-x64/spawn-helper   it does not
 *
 * electron-builder.yml's `files` now leaves every prebuild that is not
 * darwin-arm64 out of the package, and this gate is what keeps them out.
 *
 * The issue's own check had two blind spots, and this gate is written against
 * both. Its `find` judged a file by its name and mode (`.node`, `.dylib` or an
 * execute bit), so it never saw the third file, a 0644 `spawn-helper` with no
 * extension. Its `grep -v arm64` judged a line by its path, so over
 * release/mac-arm64/Tortie.app, where every package build puts the app, it
 * dropped every line and printed nothing on the broken app. So this gate finds
 * a Mach-O file by its first bytes, never by its name, mode or path.
 *
 * ## What it asserts (every fixture and every ablation names its clause)
 *
 *   R1 thin. A file whose first four bytes are `cf fa ed fe` or `ce fa ed fe`
 *      (little-endian on disk), or `fe ed fa cf` or `fe ed fa ce`
 *      (big-endian), is a one-architecture Mach-O: its cputype is the word at
 *      offset 4 and its cpusubtype the word at 8, in the magic's byte order.
 *   R2 fat. `ca fe ba be` (20-byte entries) or `ca fe ba bf` (32-byte entries
 *      with a 64-bit offset and size), big-endian: nfat_arch at offset 4,
 *      entries from 8.
 *   R3 not Mach-O. A `ca fe ba be` or `bf` file under 8 bytes, or whose
 *      nfat_arch is 0 or above 30, is not Mach-O. That is libmagic's rule: a
 *      Java class shares the magic and keeps its version there (61 for Java
 *      17). So is a file under 4 bytes, or one with any other first bytes.
 *   R4 unreadable. A thin file under 12 bytes; a fat table that runs past the
 *      end of the file; a slice that runs past it, is too short to hold its
 *      cpusubtype or does not begin with an R1 magic; a 64-bit offset or size
 *      above Number.MAX_SAFE_INTEGER. Each is Mach-O shaped and unreadable,
 *      and it is NAMED, never skipped.
 *   R5 arm64. A Mach-O passes when one of its slices has cputype exactly
 *      0x0100000c, being arm64 or arm64e. Nothing else passes: not x86_64,
 *      i386, arm, ppc or ppc64, and not arm64_32 (0x0200000c), which shares
 *      arm64's low byte.
 *   W1 walk. Every regular file in every folder at any depth, dot-named ones
 *      included. A symlink is counted, never followed and never judged: every
 *      link in a Tortie bundle points at a regular file inside it, which is
 *      walked in its own right.
 *   W2 bytes only. A file's name, extension, mode, size and path play no
 *      part.
 *   W3 fail closed. A file or folder the gate cannot open or read is named,
 *      with its error code.
 *   F1 a bundle. At least one regular file directly in Contents/MacOS, not
 *      below it and not in a nested app's, reads as Mach-O, or the bundle is
 *      refused. A gate that judged nothing has not passed.
 *
 * It reads at most the first 4,096 bytes of a file, plus each slice's first
 * four bytes by a positioned read.
 *
 * ## Where it runs
 *
 *   - FIRST in build/after-pack.cjs, before that hook writes or signs anything
 *     and before electron-builder signs, notarizes, cuts the DMG and ZIP or
 *     publishes, so every package build in every lane stops on Intel-only
 *     code.
 *   - `npm run gate:arm64` runs the self-test alone, and
 *     `npm run gate:arm64 -- <path to an .app>` runs it, then judges that app.
 *   - The app inside a DMG:
 *       hdiutil attach -nobrowse -readonly <dmg>
 *       npm run gate:arm64 -- "/Volumes/<name>/Tortie.app"
 *       hdiutil detach "/Volumes/<name>"
 *
 * ## It proves itself on every run
 *
 * Every invocation, the afterPack one included, first plants three bundles
 * under the system temporary directory, 41 fixtures in all, and judges them
 * with the shipped rules: every file must read as written, an unreadable one
 * by its exact reason. The fixtures spell the format's bytes themselves, never
 * through the reader's constants, so a constant broken in the reader is not
 * broken in step in what it reads. Then it runs 34 ablations, each breaking
 * one rule in memory, and each must turn red every fixture it names, each of
 * which owns that rule's clause. The bundles are removed in a `finally`. An
 * ablated rule judges nothing but those fixtures: no export, argument, flag or
 * environment variable can select one, and the one place this file follows a
 * symlink is ablation X13, over its own planted links. Under root, which opens
 * a mode-000 file or folder, the unreadable fixtures f21 and f38 and their
 * ablations X16 and X31 are skipped and say so.
 *
 * ## Limits, stated rather than fixed
 *
 *   - On disk only. A Mach-O packed inside app.asar is not a file macOS or
 *     this gate sees, and none is.
 *   - Not archives. A static library, or a Mach-O inside a zip, is not judged;
 *     none ships.
 *   - A symlink is not followed, so a link out of the bundle would go
 *     unjudged; every link in a Tortie bundle points inside it.
 *   - arm64 only, on purpose: a package built for another architecture fails.
 *   - macOS's rule is not published. This one, a Mach-O with no arm64 slice, is
 *     the issue's check made exact.
 *   - It is the backstop for electron-builder.yml's `!(…)` exclusions. If a
 *     later electron-builder stops reading them, the Intel prebuilds come back
 *     and this gate fails the package; the Linux and Windows ones come back
 *     unannounced, as dead weight.
 *
 * It spawns nothing, follows no symlink in a bundle it judges, and writes
 * nothing but its planted bundles. Exit 0 when green; 1 for an offender, a
 * refused bundle or a self-test problem; 2 when its argument names nothing or
 * not a directory.
 */

import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  truncateSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[arm64-only]';

/** The cputype every Mach-O in the app must carry in at least one slice. */
export const CPU_TYPE_ARM64 = 0x0100000c;

const CPU_TYPE_X86_64 = 0x01000007;
const CPU_TYPE_I386 = 7;
const CPU_TYPE_ARM = 12;
const CPU_TYPE_ARM64_32 = 0x0200000c;
const CPU_TYPE_PPC = 18;
const CPU_TYPE_PPC64 = 0x01000012;
const CPU_SUBTYPE_ARM64E = 2;

/** R1's four magics, each as its first four bytes read big-endian. */
const THIN_LITTLE_ENDIAN = new Set([0xcffaedfe, 0xcefaedfe]);
const THIN_BIG_ENDIAN = new Set([0xfeedfacf, 0xfeedface]);
/** R2's two, and the size of one table entry under each. */
const FAT_MAGIC = 0xcafebabe;
const FAT_MAGIC_64 = 0xcafebabf;
const FAT_ARCH = 20;
const FAT_ARCH_64 = 32;
/** R3: libmagic's bound, below every Java class file version. */
const FAT_ARCH_MAX = 30;
/** R4: a thin header must reach its cpusubtype. */
const THIN_MIN = 12;
const HEAD_BYTES = 4096;
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

// ---------------------------------------------------------------------------
// The reader
// ---------------------------------------------------------------------------

/** Up to `length` bytes at `position`, fewer at the end of the file. */
function readAt(fd, position, length) {
  const buffer = Buffer.alloc(length);
  let got = 0;
  while (got < length) {
    const n = readSync(fd, buffer, got, length - got, position + got);
    if (n === 0) break;
    got += n;
  }
  return buffer.subarray(0, got);
}

const unreadable = (why) => ({ macho: true, unreadable: why });

/**
 * One file's verdict from its bytes under `rules`: `{ macho: false }`,
 * `{ macho: true, slices }` or `{ macho: true, unreadable }`. It opens with
 * O_NOFOLLOW, so a symlink is never read through even if one appears between
 * the walk and the open. A file it cannot open or read THROWS: W3 belongs to
 * the walker.
 */
function readWith(path, rules) {
  const fd = openSync(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    return fromBytes(fd, fstatSync(fd).size, rules);
  } finally {
    closeSync(fd);
  }
}

function fromBytes(fd, size, rules) {
  const head = readAt(fd, 0, Math.min(size, HEAD_BYTES));
  if (head.length < 4) return { macho: false }; // R3
  const magic = head.readUInt32BE(0);

  const order = rules.thinOrder(magic); // R1
  if (order !== null) {
    if (head.length < THIN_MIN) return rules.shortThin(); // R4
    const word =
      rules.cpuOrder(order) === 'le'
        ? (at) => head.readUInt32LE(at)
        : (at) => head.readUInt32BE(at);
    return { macho: true, slices: [{ cputype: word(4), cpusubtype: word(8) }] };
  }

  const entry = rules.fatEntry(magic); // R2
  if (entry === null || head.length < 8) return { macho: false }; // R3
  const count = head.readUInt32BE(4);
  if (!rules.fatCount(count)) return { macho: false }; // R3
  const tableEnd = 8 + count * entry;
  const pastTheEnd = unreadable('its fat table runs past the end of the file'); // R4
  if (tableEnd > size) return pastTheEnd;
  const table = tableEnd <= head.length ? head : readAt(fd, 0, tableEnd);
  if (table.length < tableEnd) return pastTheEnd;
  const slices = [];
  for (let i = 0; i < count; i += 1) {
    const at = 8 + i * entry;
    const slice = `slice ${String(i + 1)}`;
    let offset;
    let length;
    if (entry === FAT_ARCH_64) {
      const wide = [table.readBigUInt64BE(at + 8), table.readBigUInt64BE(at + 16)];
      if (rules.wideBound && wide.some((value) => value > MAX_SAFE)) {
        return unreadable(`${slice}'s offset or size is above Number.MAX_SAFE_INTEGER`); // R4
      }
      [offset, length] = wide.map(Number);
    } else {
      offset = table.readUInt32BE(at + 8);
      length = table.readUInt32BE(at + 12);
    }
    // R4: the slice lies inside the file, holds a cpusubtype and is itself a thin Mach-O.
    if (rules.sliceBounds && offset + length > size) {
      return unreadable(`${slice} runs past the end of the file`);
    }
    if (rules.sliceMin && length < THIN_MIN) {
      return unreadable(`${slice} is too short to hold its cpusubtype`);
    }
    if (rules.sliceMagic) {
      const first = readAt(fd, offset, 4);
      if (first.length < 4 || rules.thinOrder(first.readUInt32BE(0)) === null) {
        return unreadable(`${slice} does not begin with a Mach-O magic`);
      }
    }
    slices.push({ cputype: table.readUInt32BE(at), cpusubtype: table.readUInt32BE(at + 4) });
  }
  return { macho: true, slices };
}

/** R5's names for a slice, `lipo -archs` style. */
function archName({ cputype, cpusubtype }) {
  switch (cputype) {
    case CPU_TYPE_ARM64:
      return (cpusubtype & 0xff) === CPU_SUBTYPE_ARM64E ? 'arm64e' : 'arm64';
    case CPU_TYPE_X86_64:
      return 'x86_64';
    case CPU_TYPE_I386:
      return 'i386';
    case CPU_TYPE_ARM64_32:
      return 'arm64_32';
    case CPU_TYPE_ARM:
      return 'arm';
    case CPU_TYPE_PPC:
      return 'ppc';
    case CPU_TYPE_PPC64:
      return 'ppc64';
    default:
      return `cputype 0x${cputype.toString(16).padStart(8, '0')}`;
  }
}

// ---------------------------------------------------------------------------
// The rules. selfTest() alone swaps one member for an ablation; every export
// and the command line use SHIPPED, and nothing selects anything else.
// ---------------------------------------------------------------------------

const SHIPPED = Object.freeze({
  /** R1: which byte order a thin magic says, or null. */
  thinOrder: (magic) =>
    THIN_LITTLE_ENDIAN.has(magic) ? 'le' : THIN_BIG_ENDIAN.has(magic) ? 'be' : null,
  /** R1: the cputype and cpusubtype are read in the magic's own order. */
  cpuOrder: (order) => order,
  /** R2: the size of one fat table entry under a fat magic, or null. */
  fatEntry: (magic) =>
    magic === FAT_MAGIC ? FAT_ARCH : magic === FAT_MAGIC_64 ? FAT_ARCH_64 : null,
  /** R3: a nfat_arch a real fat file can carry. */
  fatCount: (count) => count >= 1 && count <= FAT_ARCH_MAX,
  /** R4: a thin magic with too few bytes behind it. */
  shortThin: () => unreadable(`a thin header under ${String(THIN_MIN)} bytes`),
  /** R4: a 64-bit offset or size a Number holds exactly. */
  wideBound: true,
  /** R4: a slice lies inside the file. */
  sliceBounds: true,
  /** R4: a slice is long enough to hold its cpusubtype. */
  sliceMin: true,
  /** R4: a slice begins with a thin magic. */
  sliceMagic: true,
  /** R5: one slice is arm64, by its exact cputype. */
  holdsArm64: (slices) => slices.some((slice) => slice.cputype === CPU_TYPE_ARM64),
  /** W1: every depth. */
  maxDepth: Infinity,
  /** W1: a symlink is counted, never followed. */
  followLinks: false,
  /** W2: every regular file is judged, whatever it is called. */
  judged: () => true,
  /** W3: a file that cannot be read is named. */
  unreadableFile: true,
  /** W3: a folder that cannot be read is named. */
  unreadableFolder: true,
  /** F1: a bundle with no Mach-O executable is refused. */
  bundleCheck: true,
  /** F1: the app's executable sits directly in Contents/MacOS. */
  executableAt: (path) => IN_MACOS.test(path)
});

// ---------------------------------------------------------------------------
// The walker
// ---------------------------------------------------------------------------

const PASS = 'pass';
const IN_MACOS = /^Contents\/MacOS\/[^/]+$/;
const NO_EXECUTABLE =
  'no Mach-O in Contents/MacOS: not an app bundle, or the walk saw none of it';

const codeOf = (error) =>
  typeof error?.code === 'string' ? error.code : String(error?.message ?? error);

/** By UTF-16 code unit, so the order never depends on a locale. */
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byPath = (a, b) => byText(a.path, b.path);

/** Walks one bundle under `rules`. Every offender's path is relative to the bundle. */
function walk(app, rules) {
  const seen = {
    files: 0,
    symlinks: 0,
    machO: 0,
    executable: 0,
    offenders: [],
    verdicts: new Map(),
    links: new Set()
  };
  const name = (path, holds) => {
    seen.offenders.push({ path, holds });
    seen.verdicts.set(path, holds);
  };
  const judge = (full, path) => {
    seen.files += 1;
    if (!rules.judged(path, full)) return; // W2
    let verdict;
    try {
      verdict = readWith(full, rules);
    } catch (error) {
      if (rules.unreadableFile) name(path, `unreadable: ${codeOf(error)}`); // W3
      return;
    }
    if (!verdict.macho) {
      seen.verdicts.set(path, PASS);
      return;
    }
    seen.machO += 1;
    if (rules.executableAt(path)) seen.executable += 1; // F1
    if (verdict.unreadable !== undefined) name(path, `unreadable: ${verdict.unreadable}`); // R4
    else if (rules.holdsArm64(verdict.slices)) seen.verdicts.set(path, PASS); // R5
    else name(path, verdict.slices.map(archName).join(' '));
  };
  const visit = (dir, rel, depth) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      if (rel === '') throw error; // the bundle itself: the caller's to report
      if (rules.unreadableFolder) name(rel, `unreadable: ${codeOf(error)}`); // W3
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const path = rel === '' ? entry.name : `${rel}/${entry.name}`;
      if (entry.isSymbolicLink()) {
        if (!rules.followLinks) {
          seen.symlinks += 1; // W1
          seen.links.add(path);
          continue;
        }
        // Ablation X13 alone, over its own planted links: judge the target.
        const target = realpathSync(full);
        if (statSync(target).isFile()) judge(target, path);
        continue;
      }
      if (entry.isDirectory()) {
        if (depth < rules.maxDepth) visit(full, path, depth + 1); // W1
        continue;
      }
      if (entry.isFile()) judge(full, path); // W1: any other entry type is skipped
    }
  };
  visit(app, '', 0);
  seen.offenders.sort(byPath);
  return seen;
}

/** F1's refusal of a walked bundle, or null. */
const refusalOf = (judgement, rules) =>
  rules.bundleCheck && judgement.executable === 0 ? NO_EXECUTABLE : null;

// ---------------------------------------------------------------------------
// The exports, every one on the shipped rules
// ---------------------------------------------------------------------------

/**
 * One file's verdict from its bytes: `{ macho: false }`,
 * `{ macho: true, archs }` or `{ macho: true, unreadable }`. Throws when the
 * file cannot be opened or read, or is a symlink.
 */
export function readMachO(path) {
  const verdict = readWith(path, SHIPPED);
  if (!verdict.macho) return { macho: false };
  if (verdict.unreadable !== undefined) return { macho: true, unreadable: verdict.unreadable };
  return { macho: true, archs: verdict.slices.map(archName) };
}

/**
 * Walks one bundle: `{ files, symlinks, machO, executable, offenders }`, where
 * `executable` counts the Mach-O files directly in Contents/MacOS (F1 refuses
 * a bundle where it is 0) and `offenders` is `[{ path, holds }]`, each path
 * relative to the bundle, sorted by path.
 */
export function judgeBundle(app) {
  const { files, symlinks, machO, executable, offenders } = walk(app, SHIPPED);
  return { files, symlinks, machO, executable, offenders };
}

// ---------------------------------------------------------------------------
// The self-test: 41 planted fixtures and 34 ablations, on every invocation
// ---------------------------------------------------------------------------

const NOT_JUDGED = 'not judged';
const REFUSED = 'refused by F1';
const PREBUILDS = 'Contents/Resources/app.asar.unpacked/node_modules/m/prebuilds';

/**
 * The fixtures spell the format's bytes themselves. Every magic, entry size and
 * cputype they write is written out here, never taken from the reader's
 * constants, so a constant broken in the reader is not broken in step in the
 * bytes it reads.
 */
const CPU = Object.freeze({
  x86_64: 0x01000007,
  arm64: 0x0100000c,
  i386: 7,
  arm: 12,
  arm64_32: 0x0200000c,
  ppc: 18,
  ppc64: 0x01000012
});
const SLICE_BYTES = 64;

/**
 * A Mach-O header, filetype MH_BUNDLE, padded to 64 bytes: a mach_header_64
 * (feedfacf) or, `bits: 32`, a mach_header (feedface), little-endian on disk
 * unless `littleEndian: false`.
 */
function thin(cputype, cpusubtype, { bits = 64, littleEndian = true } = {}) {
  const bytes = Buffer.alloc(SLICE_BYTES);
  const put = (value, at) =>
    littleEndian ? bytes.writeUInt32LE(value, at) : bytes.writeUInt32BE(value, at);
  put(bits === 64 ? 0xfeedfacf : 0xfeedface, 0);
  put(cputype, 4);
  put(cpusubtype, 8);
  put(8, 12);
  return bytes;
}

/**
 * A fat file, big-endian: cafebabe and 20-byte entries or, `wide`, cafebabf and
 * 32-byte entries with a 64-bit offset and size. Each entry is its slice's
 * cputype, cpusubtype, offset, `size` (64 unless the slice says) and align 12.
 * A slice's `body` is written at its offset, a thin header of its cputype
 * unless it says, and `null` writes nothing. `end` cuts the file there.
 */
function fat(wide, slices, end) {
  const entry = wide ? 32 : 20;
  const bodies = slices.map((s) => (s.body === undefined ? thin(s.cputype, s.cpusubtype) : s.body));
  const length =
    end ??
    Math.max(
      8 + slices.length * entry,
      ...slices.map((s, i) => (bodies[i] === null ? 0 : Number(s.offset) + bodies[i].length))
    );
  const bytes = Buffer.alloc(length);
  bytes.writeUInt32BE(wide ? 0xcafebabf : 0xcafebabe, 0);
  bytes.writeUInt32BE(slices.length, 4);
  slices.forEach((s, i) => {
    const at = 8 + i * entry;
    const size = s.size ?? SLICE_BYTES;
    bytes.writeUInt32BE(s.cputype, at);
    bytes.writeUInt32BE(s.cpusubtype, at + 4);
    if (wide) {
      bytes.writeBigUInt64BE(BigInt(s.offset), at + 8);
      bytes.writeBigUInt64BE(BigInt(size), at + 16);
      bytes.writeUInt32BE(12, at + 24);
    } else {
      bytes.writeUInt32BE(s.offset, at + 8);
      bytes.writeUInt32BE(size, at + 12);
      bytes.writeUInt32BE(12, at + 16);
    }
    if (bodies[i] !== null && s.offset < length) bodies[i].copy(bytes, Number(s.offset));
  });
  return bytes;
}

/** Big-endian 32-bit words. */
function words(...values) {
  const bytes = Buffer.alloc(values.length * 4);
  values.forEach((value, i) => bytes.writeUInt32BE(value, i * 4));
  return bytes;
}

/** Leading bytes, zero filled to a length. */
function led(prefix, length) {
  const bytes = Buffer.alloc(length);
  Buffer.from(prefix).copy(bytes);
  return bytes;
}

const X86_64 = { cputype: CPU.x86_64, cpusubtype: 3 };
const ARM64 = { cputype: CPU.arm64, cpusubtype: 0 };
const TEXT = 'Not Mach-O: a note planted by build/assert-arm64-only.mjs.\n';
/** f35 is extended to 16 MiB, sparse where the filesystem allows. */
const BIG = 16 * 2 ** 20;
/** f36 sits 40 folders below Contents/Library, four times deeper than any file in the app. */
const DEEP = `Contents/Library/${Array.from({ length: 40 }, (_, i) => `d${String(i + 1).padStart(2, '0')}`).join('/')}/deep.node`;

/**
 * The 41 fixtures. `expect` is PASS, NOT_JUDGED (a symlink), REFUSED (the
 * bundle), or the exact `holds` string, an unreadable reason included. `owns`
 * is the clauses a mismatch on this fixture proves. A row with `folder` plants
 * a folder holding those files; `size` extends a file to that many bytes.
 * f23 to f41 are the fix round's (build/p351/SPEC.md, "The fix round"): each
 * is read wrongly by one single break a self-test of 22 could not see.
 */
const FIXTURES = [
  { id: 'f1', app: 'Fixture.app', path: 'Contents/MacOS/Fixture', make: () => thin(CPU.arm64, 0), mode: 0o755, expect: PASS, owns: ['R1', 'F1'] },
  { id: 'f2', app: 'Fixture.app', path: 'Contents/Frameworks/Lib.framework/Versions/A/Lib', make: () => thin(CPU.arm64, 2), mode: 0o755, expect: PASS, owns: ['R5'] },
  { id: 'f3', app: 'Fixture.app', path: 'Contents/Frameworks/Lib.framework/Lib', link: 'Versions/A/Lib', expect: NOT_JUDGED, owns: ['W1'] },
  { id: 'f4', app: 'Fixture.app', path: `${PREBUILDS}/darwin-x64.node`, make: () => thin(CPU.x86_64, 3), mode: 0o644, expect: 'x86_64', owns: ['R1', 'R5', 'W1'] },
  { id: 'f5', app: 'Fixture.app', path: `${PREBUILDS}/darwin-x64/spawn-helper`, make: () => thin(CPU.x86_64, 3), mode: 0o644, expect: 'x86_64', owns: ['W2', 'W1'] },
  { id: 'f6', app: 'Fixture.app', path: 'Contents/Resources/release/mac-arm64/intel.node', make: () => thin(CPU.x86_64, 3), mode: 0o644, expect: 'x86_64', owns: ['W2'] },
  { id: 'f7', app: 'Fixture.app', path: 'Contents/Resources/universal.node', make: () => fat(false, [{ ...X86_64, offset: 4096 }, { ...ARM64, offset: 8192 }]), mode: 0o644, expect: PASS, owns: ['R2', 'R5'] },
  { id: 'f8', app: 'Fixture.app', path: 'Contents/Resources/universal64.dylib', make: () => fat(true, [{ ...X86_64, offset: 4096 }, { ...ARM64, offset: 8192 }]), mode: 0o755, expect: PASS, owns: ['R2'] },
  { id: 'f9', app: 'Fixture.app', path: 'Contents/Resources/intel-fat.node', make: () => fat(false, [{ ...X86_64, offset: 4096 }]), mode: 0o644, expect: 'x86_64', owns: ['R2'] },
  { id: 'f10', app: 'Fixture.app', path: 'Contents/Resources/old.dylib', make: () => thin(CPU.i386, 3, { bits: 32 }), mode: 0o644, expect: 'i386', owns: ['R1'] },
  { id: 'f11', app: 'Fixture.app', path: 'Contents/Resources/watch.dylib', make: () => thin(CPU.arm64_32, 1), mode: 0o644, expect: 'arm64_32', owns: ['R5'] },
  { id: 'f12', app: 'Fixture.app', path: 'Contents/Resources/ppc.dylib', make: () => thin(CPU.ppc, 0, { bits: 32, littleEndian: false }), mode: 0o644, expect: 'ppc', owns: ['R1'] },
  { id: 'f13', app: 'Fixture.app', path: 'Contents/Resources/Big.class', make: () => led([0xca, 0xfe, 0xba, 0xbe, 0x00, 0x00, 0x00, 0x3d], 64), mode: 0o644, expect: PASS, owns: ['R3'] },
  { id: 'f14', app: 'Fixture.app', path: 'Contents/Resources/linux.node', make: () => led([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00], 64), mode: 0o644, expect: PASS, owns: ['R3'] },
  { id: 'f15', app: 'Fixture.app', path: 'Contents/Resources/win.node', make: () => led([0x4d, 0x5a, 0x90, 0x00], 64), mode: 0o644, expect: PASS, owns: ['R3'] },
  { id: 'f16', app: 'Fixture.app', path: 'Contents/Resources/notes.txt', make: () => Buffer.from(TEXT), mode: 0o644, expect: PASS, owns: ['R3'] },
  { id: 'f17', app: 'Fixture.app', path: 'Contents/Resources/empty.node', make: () => Buffer.alloc(0), mode: 0o644, expect: PASS, owns: ['R3'] },
  { id: 'f18', app: 'Fixture.app', path: 'Contents/Resources/short.node', make: () => Buffer.from([0xcf, 0xfa, 0xed, 0xfe, 0x0c, 0x00]), mode: 0o644, expect: 'unreadable: a thin header under 12 bytes', owns: ['R4'] },
  { id: 'f19', app: 'Fixture.app', path: 'Contents/Resources/badfat.node', make: () => fat(false, [{ ...ARM64, offset: 0x100000, body: null }, { ...X86_64, offset: 4096 }]), mode: 0o644, expect: 'unreadable: slice 1 runs past the end of the file', owns: ['R4'] },
  { id: 'f20', app: 'Fixture.app', path: 'Contents/Resources/link-to-intel.node', link: 'app.asar.unpacked/node_modules/m/prebuilds/darwin-x64.node', expect: NOT_JUDGED, owns: ['W1'] },
  { id: 'f21', app: 'Fixture.app', path: 'Contents/Resources/locked.node', make: () => thin(CPU.arm64, 0), mode: 0o000, expect: 'unreadable: EACCES', owns: ['W3'], unprivileged: true },
  { id: 'f22', app: 'Empty.app', path: 'Contents/Resources/readme.txt', make: () => Buffer.from(TEXT), mode: 0o644, expect: REFUSED, owns: ['F1'] },
  { id: 'f23', app: 'Fixture.app', path: 'Contents/Resources/intel-fat64.node', make: () => fat(true, [{ ...X86_64, offset: 4096 }]), mode: 0o644, expect: 'x86_64', owns: ['R2'] },
  { id: 'f24', app: 'Fixture.app', path: 'Contents/Resources/armv7.dylib', make: () => thin(CPU.arm, 9, { bits: 32 }), mode: 0o644, expect: 'arm', owns: ['R1', 'R5'] },
  { id: 'f25', app: 'Fixture.app', path: 'Contents/Resources/ppc64.dylib', make: () => thin(CPU.ppc64, 0, { littleEndian: false }), mode: 0o644, expect: 'ppc64', owns: ['R1'] },
  { id: 'f26', app: 'Fixture.app', path: 'Contents/Resources/three.node', make: () => Buffer.from([0xcf, 0xfa, 0xed]), mode: 0o644, expect: PASS, owns: ['R3'] },
  { id: 'f27', app: 'Fixture.app', path: 'Contents/Resources/shortfat.node', make: () => Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0x00, 0x00]), mode: 0o644, expect: PASS, owns: ['R3'] },
  { id: 'f28', app: 'Fixture.app', path: 'Contents/Resources/nfat0.node', make: () => words(0xcafebabe, 0, 0x01020304), mode: 0o644, expect: PASS, owns: ['R3'] },
  { id: 'f29', app: 'Fixture.app', path: 'Contents/Resources/nfat30.node', make: () => words(0xcafebabe, 30, CPU.x86_64, 3, 4096, 64, 12), mode: 0o644, expect: 'unreadable: its fat table runs past the end of the file', owns: ['R3', 'R4'] },
  { id: 'f30', app: 'Fixture.app', path: 'Contents/Resources/nfat31.node', make: () => led(words(0xcafebabe, 31), 64), mode: 0o644, expect: PASS, owns: ['R3'] },
  { id: 'f31', app: 'Fixture.app', path: 'Contents/Resources/cut-slice.node', make: () => fat(false, [{ ...X86_64, offset: 4096 }, { ...ARM64, offset: 8192 }], 8192 + 16), mode: 0o644, expect: 'unreadable: slice 2 runs past the end of the file', owns: ['R4'] },
  { id: 'f32', app: 'Fixture.app', path: 'Contents/Resources/short-slice.node', make: () => fat(false, [{ ...X86_64, offset: 4096 }, { ...ARM64, offset: 8192, size: 8, body: thin(CPU.arm64, 0).subarray(0, 8) }]), mode: 0o644, expect: 'unreadable: slice 2 is too short to hold its cpusubtype', owns: ['R4'] },
  { id: 'f33', app: 'Fixture.app', path: 'Contents/Resources/no-magic.node', make: () => fat(false, [{ ...X86_64, offset: 4096 }, { ...ARM64, offset: 8192, body: Buffer.alloc(SLICE_BYTES) }]), mode: 0o644, expect: 'unreadable: slice 2 does not begin with a Mach-O magic', owns: ['R4'] },
  { id: 'f34', app: 'Fixture.app', path: 'Contents/Resources/far.node', make: () => fat(true, [{ ...ARM64, offset: 2n ** 60n, body: null }]), mode: 0o644, expect: "unreadable: slice 1's offset or size is above Number.MAX_SAFE_INTEGER", owns: ['R4'] },
  { id: 'f35', app: 'Fixture.app', path: 'Contents/Resources/big intel.node', make: () => thin(CPU.x86_64, 3), size: BIG, mode: 0o644, expect: 'x86_64', owns: ['W2'] },
  { id: 'f36', app: 'Fixture.app', path: DEEP, make: () => thin(CPU.x86_64, 3), mode: 0o644, expect: 'x86_64', owns: ['W1'] },
  { id: 'f37', app: 'Fixture.app', path: 'Contents/Resources/.cache/.intel.node', make: () => thin(CPU.x86_64, 3), mode: 0o644, expect: 'x86_64', owns: ['W1', 'W2'] },
  { id: 'f38', app: 'Fixture.app', path: 'Contents/Resources/locked', folder: { 'intel.node': () => thin(CPU.x86_64, 3) }, mode: 0o000, expect: 'unreadable: EACCES', owns: ['W3'], unprivileged: true },
  { id: 'f39', app: 'Nested.app', path: 'Contents/MacOS/launcher', make: () => Buffer.alloc(0), mode: 0o755, expect: REFUSED, owns: ['F1'] },
  { id: 'f40', app: 'Nested.app', path: 'Contents/MacOS/bin/helper', make: () => thin(CPU.arm64, 0), mode: 0o755, expect: PASS, owns: ['F1'] },
  { id: 'f41', app: 'Nested.app', path: 'Contents/Resources/Inner.app/Contents/MacOS/Inner', make: () => thin(CPU.arm64, 0), mode: 0o755, expect: PASS, owns: ['F1'] }
];

/** Fixture.app's counts, written down rather than derived from the table. */
const COUNTS = { files: 34, symlinks: 2, machO: 24, offenders: 22 };
/** Under root, f21 and f38 are not planted. */
const COUNTS_AS_ROOT = { files: 33, symlinks: 2, machO: 24, offenders: 20 };

/** R1 with one thin magic, as its first four bytes read big-endian, no longer recognised. */
const dropping = (gone) => (magic) => (magic === gone ? null : SHIPPED.thinOrder(magic));

/** Each arm breaks one rule in memory and must turn red every fixture it names. */
const ABLATIONS = [
  { arm: 'X1', clause: 'R1', rule: 'the 64-bit little-endian magic not recognised', change: { thinOrder: dropping(0xcffaedfe) }, reddens: ['f1', 'f4'] },
  { arm: 'X2', clause: 'R1', rule: 'the 32-bit big-endian magic not recognised', change: { thinOrder: dropping(0xfeedface) }, reddens: ['f12'] },
  { arm: 'X3', clause: 'R1', rule: 'a little-endian cputype read big-endian', change: { cpuOrder: () => 'be' }, reddens: ['f1', 'f4'] },
  { arm: 'X4', clause: 'R2', rule: 'the fat magic ca fe ba be not recognised', change: { fatEntry: (m) => (m === FAT_MAGIC ? null : SHIPPED.fatEntry(m)) }, reddens: ['f9'] },
  { arm: 'X5', clause: 'R2', rule: 'ca fe ba bf read with 20-byte entries', change: { fatEntry: (m) => (m === FAT_MAGIC || m === FAT_MAGIC_64 ? FAT_ARCH : null) }, reddens: ['f8'] },
  { arm: 'X6', clause: 'R3', rule: 'the nfat_arch bound removed', change: { fatCount: () => true }, reddens: ['f13'] },
  { arm: 'X7', clause: 'R4', rule: 'a slice that runs past the end of the file read on', change: { sliceBounds: false }, reddens: ['f19', 'f31'] },
  { arm: 'X8', clause: 'R4', rule: 'a thin file too short read as not Mach-O', change: { shortThin: () => ({ macho: false }) }, reddens: ['f18'] },
  { arm: 'X9', clause: 'R5', rule: 'any Mach-O passes', change: { holdsArm64: () => true }, reddens: ['f4', 'f11'] },
  { arm: 'X10', clause: 'R5', rule: 'every slice must be arm64', change: { holdsArm64: (slices) => slices.every((s) => s.cputype === CPU_TYPE_ARM64) }, reddens: ['f7'] },
  { arm: 'X11', clause: 'R5', rule: 'the ARM family by the low byte', change: { holdsArm64: (slices) => slices.some((s) => (s.cputype & 0xff) === CPU_TYPE_ARM) }, reddens: ['f11', 'f24'] },
  { arm: 'X12', clause: 'W1', rule: 'no descent below two levels', change: { maxDepth: 2 }, reddens: ['f4', 'f5'] },
  { arm: 'X13', clause: 'W1', rule: 'symlinks followed', change: { followLinks: true }, reddens: ['f3', 'f20'] },
  { arm: 'X14', clause: 'W2', rule: "only .node, .dylib or an execute bit judged (the issue's find)", change: { judged: (path, full) => /\.(node|dylib)$/.test(path) || (lstatSync(full).mode & 0o111) !== 0 }, reddens: ['f5'] },
  { arm: 'X15', clause: 'W2', rule: "a path holding arm64 skipped (the issue's grep)", change: { judged: (path) => !path.includes('arm64') }, reddens: ['f6'] },
  { arm: 'X16', clause: 'W3', rule: 'an unreadable file skipped', change: { unreadableFile: false }, reddens: ['f21'] },
  { arm: 'X17', clause: 'F1', rule: 'the bundle check removed', change: { bundleCheck: false }, reddens: ['f22', 'f39'] },
  { arm: 'X18', clause: 'R1', rule: 'the 64-bit big-endian magic not recognised', change: { thinOrder: dropping(0xfeedfacf) }, reddens: ['f25'] },
  { arm: 'X19', clause: 'R1', rule: 'the 32-bit little-endian magic not recognised', change: { thinOrder: dropping(0xcefaedfe) }, reddens: ['f10', 'f24'] },
  { arm: 'X20', clause: 'R2', rule: 'the fat magic ca fe ba bf not recognised', change: { fatEntry: (m) => (m === FAT_MAGIC_64 ? null : SHIPPED.fatEntry(m)) }, reddens: ['f23'] },
  { arm: 'X21', clause: 'R3', rule: 'nfat_arch 0 read as fat', change: { fatCount: (count) => count <= FAT_ARCH_MAX }, reddens: ['f28'] },
  { arm: 'X22', clause: 'R3', rule: 'the nfat_arch bound lowered by one', change: { fatCount: (count) => count >= 1 && count <= FAT_ARCH_MAX - 1 }, reddens: ['f29'] },
  { arm: 'X23', clause: 'R3', rule: 'the nfat_arch bound raised by one', change: { fatCount: (count) => count >= 1 && count <= FAT_ARCH_MAX + 1 }, reddens: ['f30'] },
  { arm: 'X24', clause: 'R4', rule: 'a slice too short to hold its cpusubtype read on', change: { sliceMin: false }, reddens: ['f32'] },
  { arm: 'X25', clause: 'R4', rule: 'a slice that does not begin with a Mach-O magic read on', change: { sliceMagic: false }, reddens: ['f33'] },
  { arm: 'X26', clause: 'R4', rule: 'a 64-bit offset above Number.MAX_SAFE_INTEGER read on', change: { wideBound: false }, reddens: ['f34'] },
  { arm: 'X27', clause: 'R5', rule: '32-bit ARM passes', change: { holdsArm64: (slices) => slices.some((s) => s.cputype === CPU_TYPE_ARM64 || s.cputype === CPU_TYPE_ARM) }, reddens: ['f24'] },
  { arm: 'X28', clause: 'W1', rule: 'descent stopped one folder above the deepest fixture', change: { maxDepth: DEEP.split('/').length - 2 }, reddens: ['f36'] },
  { arm: 'X29', clause: 'W2', rule: 'a file over 1 MiB skipped', change: { judged: (path, full) => lstatSync(full).size <= 2 ** 20 }, reddens: ['f35'] },
  { arm: 'X30', clause: 'W2', rule: 'a dot-named file or folder skipped', change: { judged: (path) => !path.split('/').some((part) => part.startsWith('.')) }, reddens: ['f37'] },
  { arm: 'X31', clause: 'W3', rule: 'an unreadable folder skipped', change: { unreadableFolder: false }, reddens: ['f38'] },
  { arm: 'X32', clause: 'F1', rule: 'any Mach-O satisfies F1', change: { executableAt: () => true }, reddens: ['f39'] },
  { arm: 'X33', clause: 'F1', rule: 'Contents/MacOS matched anywhere in the path', change: { executableAt: (path) => /Contents\/MacOS\/[^/]+$/.test(path) }, reddens: ['f39'] },
  { arm: 'X34', clause: 'F1', rule: 'a Mach-O below Contents/MacOS counts', change: { executableAt: (path) => path.startsWith('Contents/MacOS/') }, reddens: ['f39'] }
];

function plant(dir, fixture) {
  const full = join(dir, fixture.app, fixture.path);
  mkdirSync(dirname(full), { recursive: true });
  if (fixture.link !== undefined) {
    symlinkSync(fixture.link, full);
    return;
  }
  if (fixture.folder !== undefined) {
    mkdirSync(full);
    for (const [name, make] of Object.entries(fixture.folder)) writeFileSync(join(full, name), make());
  } else {
    writeFileSync(full, fixture.make());
    if (fixture.size !== undefined) truncateSync(full, fixture.size);
  }
  chmodSync(full, fixture.mode);
}

/** One reading of the planted bundles: every mismatch, with the clauses it proves. */
function runSuite(dir, planted, rules, counts) {
  const red = [];
  const walked = new Map();
  for (const app of new Set(planted.map((f) => f.app))) {
    try {
      walked.set(app, walk(join(dir, app), rules));
    } catch (error) {
      red.push({ id: app, owns: [], text: `the walk of ${app} threw ${codeOf(error)}` });
    }
  }
  if (red.length > 0) return red;

  for (const f of planted) {
    const j = walked.get(f.app);
    const got =
      f.expect === REFUSED
        ? refusalOf(j, rules) === null
          ? 'not refused'
          : REFUSED
        : j.verdicts.get(f.path) ??
          (f.link === undefined || j.links.has(f.path) ? NOT_JUDGED : 'not seen');
    if (got !== f.expect) {
      red.push({ id: f.id, owns: f.owns, text: `${f.id} ${f.app}/${f.path} read "${got}", expected "${f.expect}"` });
    }
  }

  const fixture = walked.get('Fixture.app');
  const f1 = FIXTURES.find((f) => f.id === 'f1');
  if (refusalOf(fixture, rules) !== null) {
    red.push({ id: f1.id, owns: f1.owns, text: 'Fixture.app was refused by F1, though f1 is its Mach-O executable' });
  }
  for (const [app, j] of walked) {
    const rows = planted.filter((f) => f.app === app);
    const offenders = rows
      .filter((f) => ![PASS, NOT_JUDGED, REFUSED].includes(f.expect))
      .map((f) => f.path)
      .sort(byText);
    const named = j.offenders.map((o) => o.path);
    if (named.join('\n') !== offenders.join('\n')) {
      red.push({ id: `${app}'s offender list`, owns: [], text: `${app} named [${named.join(', ')}], expected the planted offenders in path order` });
    }
    const known = new Set(rows.map((f) => f.path));
    for (const path of j.verdicts.keys()) {
      if (!known.has(path)) red.push({ id: path, owns: [], text: `${app} judged ${path}, which no fixture planted` });
    }
  }
  const read = { ...fixture, offenders: fixture.offenders.length };
  for (const key of ['files', 'symlinks', 'machO', 'offenders']) {
    if (read[key] !== counts[key]) {
      red.push({ id: `the ${key} count`, owns: [], text: `Fixture.app counted ${String(read[key])} ${key}, expected ${String(counts[key])}` });
    }
  }
  return red;
}

/**
 * Plants the fixtures, reads them with the shipped rules and then under each
 * ablation, and removes them in a `finally`:
 * `{ fixtures, ablations, skipped, problems }`.
 */
export function selfTest() {
  const root = typeof process.getuid === 'function' && process.getuid() === 0;
  const counts = root ? COUNTS_AS_ROOT : COUNTS;
  const skipped = [];
  const problems = [];
  const dir = mkdtempSync(join(tmpdir(), 'tortie-arm64-'));
  try {
    const planted = [];
    for (const f of FIXTURES) {
      if (f.unprivileged === true && root) {
        skipped.push(`${f.id} ${f.path}, because root opens a mode-000 ${f.folder === undefined ? 'file' : 'folder'}`);
        continue;
      }
      plant(dir, f);
      planted.push(f);
    }
    for (const bad of runSuite(dir, planted, SHIPPED, counts)) {
      problems.push(`the shipped rules: ${bad.text}${bad.owns.length > 0 ? ` (owns ${bad.owns.join(' ')})` : ''}`);
    }
    let ablations = 0;
    for (const arm of ABLATIONS) {
      const label = `${arm.arm} (${arm.clause}: ${arm.rule})`;
      const strangers = arm.reddens.filter(
        (id) => !FIXTURES.some((f) => f.id === id && f.owns.includes(arm.clause))
      );
      if (strangers.length > 0) {
        problems.push(`${label} names ${strangers.join(', ')}, not a fixture of ${arm.clause}`);
        continue;
      }
      const absent = arm.reddens.filter((id) => !planted.some((f) => f.id === id));
      if (absent.length > 0) {
        skipped.push(`${label}, because ${absent.join(', ')} is not planted under root`);
        continue;
      }
      ablations += 1;
      const red = runSuite(dir, planted, Object.freeze({ ...SHIPPED, ...arm.change }), counts);
      const missed = arm.reddens.filter((id) => !red.some((bad) => bad.id === id));
      if (missed.length > 0) problems.push(`${label} left ${missed.join(', ')} reading as written`);
    }
    return { fixtures: planted.length, ablations, skipped, problems };
  } finally {
    for (const f of FIXTURES.filter((one) => one.unprivileged === true)) {
      try {
        chmodSync(join(dir, f.app, f.path), f.folder === undefined ? 0o644 : 0o755);
      } catch {
        // not planted
      }
    }
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// The verdict
// ---------------------------------------------------------------------------

function selfTestGreen(test) {
  return [
    `${TAG} self-test: ${String(test.fixtures)} fixtures read as written, ${String(test.ablations)} ablations each red on the clause it breaks`,
    ...test.skipped.map((line) => `${TAG} skipped: ${line}`)
  ];
}

function selfTestRed(test) {
  if (test.problems.length === 0) return [];
  return [
    `${TAG} self-test: ${String(test.problems.length)} problem${test.problems.length === 1 ? '' : 's'}:`,
    ...test.problems.map((line) => `  ${line}`),
    ...test.skipped.map((line) => `${TAG} skipped: ${line}`)
  ];
}

function bundleRed(app, judgement, refusal) {
  const lines = [];
  if (refusal !== null) lines.push(`${TAG} ${app}: ${refusal}`);
  if (judgement.offenders.length > 0) {
    lines.push(
      `${TAG} ${app}: ${String(judgement.offenders.length)} of ${String(judgement.machO)} Mach-O files hold no arm64 code, and macOS warns about an app that carries Intel-only code:`
    );
    for (const { path, holds } of judgement.offenders) lines.push(`  ${holds}  ${path}`);
    lines.push('Leave each out of the package (electron-builder.yml, files) or ship an arm64 build of it.');
  }
  return lines;
}

const bundleGreen = (app, judgement) =>
  `${TAG} ${app}: ${String(judgement.machO)} Mach-O files of ${String(judgement.files)}, every one holds arm64 code`;

/**
 * The self-test, then one bundle, on the shipped rules. Throws one Error that
 * names every problem and every offender; returns
 * `{ machO, files, fixtures, ablations }`. build/after-pack.cjs calls this.
 */
export function assertArm64Only(app) {
  const test = selfTest();
  const judgement = walk(app, SHIPPED);
  const red = [...selfTestRed(test), ...bundleRed(app, judgement, refusalOf(judgement, SHIPPED))];
  if (red.length > 0) throw new Error(red.join('\n'));
  return {
    machO: judgement.machO,
    files: judgement.files,
    fixtures: test.fixtures,
    ablations: test.ablations
  };
}

// ---------------------------------------------------------------------------
// The command line: no argument runs the self-test alone; one names a bundle
// ---------------------------------------------------------------------------

function main(args) {
  if (args.length > 1) {
    console.error(`${TAG} give one packaged .app, or nothing to run the self-test alone.`);
    return 2;
  }
  const [app] = args;
  if (app !== undefined) {
    let stat;
    try {
      stat = statSync(app);
    } catch (error) {
      const code = codeOf(error);
      console.error(
        `${TAG} ${app} ${code === 'ENOENT' ? 'names nothing' : `cannot be read (${code})`}: give the path of a packaged .app.`
      );
      return 2;
    }
    if (!stat.isDirectory()) {
      console.error(`${TAG} ${app} is not a directory: give the path of a packaged .app.`);
      return 2;
    }
  }

  const test = selfTest();
  const testRed = selfTestRed(test);
  if (testRed.length > 0) console.error(testRed.join('\n'));
  else console.log(selfTestGreen(test).join('\n'));
  if (app === undefined) return testRed.length > 0 ? 1 : 0;

  const judgement = walk(app, SHIPPED);
  const red = bundleRed(app, judgement, refusalOf(judgement, SHIPPED));
  if (red.length > 0) {
    console.error(red.join('\n'));
    return 1;
  }
  console.log(bundleGreen(app, judgement));
  return testRed.length > 0 ? 1 : 0;
}

/** By realpath, because /var is a link to /private/var and a gate that runs nothing exits 0. */
function invokedDirectly() {
  if (process.argv[1] === undefined) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`${TAG} ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
