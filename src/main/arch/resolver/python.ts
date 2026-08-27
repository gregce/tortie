/**
 * The Python arm (Phase 157).
 *
 * It turns one Python import specifier written in one file into one of three
 * answers, and never into the fourth. `first-party` names a tracked `.py` file.
 * `external` is returned ONLY when the standard library or a distribution the
 * repository's own packaging files DECLARE accounts for the name. Everything
 * else is `unresolved`.
 *
 * ## THE RULE THIS ARM IS BUILT AROUND
 *
 * An arm that cannot answer returns `unresolved`, NEVER `external`. Phase 63's
 * verifier caught the script arm answering `external` because it had run out of
 * ideas, and named the cost exactly: `src/main/arch/checkers/imports.ts` drops
 * an `external` out of BOTH sides of the ledger, so it is neither a crossing
 * nor an unresolved count, and a `must-not` promise across a first party import
 * wearing `external` renders CONVERGENT. Green. Before this phase every Python
 * import was `unverifiable`, which is counted, so no Python `must-not` promise
 * could ever be green and the defect could not bite. This arm is what arms it.
 * That is why the order below is first party FIRST and the two `external` tests
 * second: a repository whose own directory happens to share a name with a
 * dependency resolves to its own file, and a name this arm has no account of
 * comes back grey rather than green.
 *
 * ## WHAT THIS ARM MAY NOT CLAIM, stated on its own face
 *
 * **Module level only.** "Does `api` import from `ir`" is answerable here.
 * "Does `api` use `ir.IRNode`" is not, and this arm never pretends otherwise.
 * `from lift_sys.ir.node import IRNode` resolves to `lift_sys/ir/node.py` and
 * says nothing at all about `IRNode`.
 *
 * **A re-export chain resolves to the file that FORWARDS, not the file that
 * defines.** `from lift_sys.ir import IRNode`, where `lift_sys/ir/__init__.py`
 * carries `from .node import IRNode`, resolves to `lift_sys/ir/__init__.py`.
 * The file that defines `IRNode` is `lift_sys/ir/node.py` and this arm does not
 * name it, because naming it would be an item level claim.
 *
 * **`from package import submodule` USED TO UNDERSTATE the edge, and the fix is
 * in the query rather than here.** The query in ../../symbols/queries.ts once
 * captured `module_name` alone, so `from lift_sys.ir import node` arrived here
 * as `lift_sys.ir` and got the DEFINITE answer `lift_sys/ir/__init__.py` while
 * the real edge to `lift_sys/ir/node.py` went unrecorded and uncounted. Phase
 * 157's verifier drove that through the real checker and found it green on a
 * promise the source violates. The query now captures the imported name too and
 * this arm is handed BOTH `lift_sys.ir` and `lift_sys.ir.node`, which is the
 * pair of modules Python really executes. Nothing in this arm changed for it:
 * the walk below already stops at the last real file, so `lift_sys.ir.IRNode`
 * where `IRNode` is a class still answers `lift_sys/ir/__init__.py`.
 *
 * **What is still not claimed.** `from lift_sys.ir import IRNode` says nothing
 * about `IRNode` itself. The extra row resolves to the same package file the
 * module row did, which is a duplicate edge and never a wrong one.
 *
 * **`import a.b` is resolved as `a/b.py` rather than as `a`.** Python's own
 * semantics bind the name `a` in the importing scope, but the file that gets
 * executed is `a/b.py` and the query hands this arm the whole dotted name. The
 * dependency being recorded is on the module, so the deeper answer is the
 * useful one. This is a choice and it is written down rather than assumed.
 *
 * **`sys.path` manipulation is invisible, and this is the biggest single cost.**
 * A repository that inserts a directory at run time and then imports a bare
 * name from it gets `unresolved` for that name, because nothing this arm reads
 * says the directory is a package root. Measured over lift-sys at `ff1f696`,
 * 263 tracked `.py` files, by this build's own extractor and this arm: 2,826
 * imports found, 1,718 first party, 1,018 external and 90 unresolved, and 49 of
 * the 90 are this shape, being a bare name that IS a tracked file sitting
 * beside the importing file, reached only because Python puts the running
 * script's own directory on the path. 29 of the 49 are
 * `from performance_benchmark import ...` inside `debug/`. Treating the
 * importing file's own directory as a package root would resolve all 49 and
 * would also revive Python 2 implicit relative imports for every other file in
 * that repository, so it is refused and those 49 are reported honestly as
 * unresolved. Unresolved is counted, so a `must-not` promise across one of them
 * goes grey rather than green, which is the direction that is safe to be wrong
 * in.
 *
 * THOSE NUMBERS ARE THE ONES AFTER THE QUERY LEARNED THE IMPORTED NAME, and the
 * difference is worth knowing. An earlier draft of this header read 24 of 42,
 * measured while `from a.b import c` reached this arm as `a.b` alone. Every
 * such statement now arrives as the pair `a.b` and `a.b.c`, so both the total
 * and the unresolved count roughly double, and neither number means what the
 * old one meant. Re-measure this paragraph whenever the query changes.
 *
 * **`importlib.import_module("x")` and `__import__` are not captured at all**,
 * by the query rather than by this arm, so a dynamic import is not in the fact
 * base and is not counted as unresolved either. It is invisible. The same is
 * true of `from __future__ import annotations`, which tree-sitter-python parses
 * as its own `future_import_statement` node that the query does not match, so
 * it never reaches this arm at all. Both were confirmed by running the real
 * query over a fixture carrying every shape, on 2026-08-26.
 *
 * **A `.pyi` stub is not searched, and a namespace package has no file.** A
 * dotted name whose last segment is a directory with no `__init__.py` resolves
 * to the deepest tracked file its prefix named, which may be one level short.
 *
 * NOTHING HERE SPAWNS ANYTHING and no specifier ever reaches an argv. Every
 * answer is set membership against the file list the caller enumerated with the
 * one fixed `git ls-files -z`, plus the packaging files ./pyproject.ts read.
 */

import {
  external,
  firstParty,
  unresolved,
  type ArchResolution
} from './answers';
import type { ArchResolveContext } from './index';
import { normalizeDistribution } from './pyproject';

/**
 * The Python standard library, as a compiled in list rather than a manifest
 * fact, and the justification for calling it one.
 *
 * A repository never declares a dependency on `os`, so the only way to answer
 * `external` for it is a list this build carries. That is the same species of
 * fact as `node:module`'s `builtinModules`, which the script arm already
 * trusts, and it is a fact about the LANGUAGE rather than a guess about the
 * repository. It is checked AFTER the first party walk, so a repository that
 * ships its own `types/` or `code/` package resolves to its own file and this
 * list never steals the answer.
 *
 * Taken from `sys.stdlib_module_names` on CPython 3.14.4 on 2026-08-26, plus
 * the twenty five modules removed in 3.12 and 3.13, because a repository that
 * imports `distutils` or `telnetlib` is importing the standard library of the
 * interpreter it was written for. Erring towards a longer list is safe here
 * only because of the ordering above.
 */
const PYTHON_STDLIB: ReadonlySet<string> = new Set([
  '__future__', '_abc', '_aix_support', '_android_support', '_apple_support',
  '_ast', '_ast_unparse', '_asyncio', '_bisect', '_blake2', '_bz2', '_codecs',
  '_codecs_cn', '_codecs_hk', '_codecs_iso2022', '_codecs_jp', '_codecs_kr',
  '_codecs_tw', '_collections', '_collections_abc', '_colorize',
  '_compat_pickle', '_contextvars', '_csv', '_ctypes', '_curses',
  '_curses_panel', '_datetime', '_dbm', '_decimal', '_elementtree',
  '_frozen_importlib', '_frozen_importlib_external', '_functools', '_gdbm',
  '_hashlib', '_heapq', '_hmac', '_imp', '_interpchannels', '_interpqueues',
  '_interpreters', '_io', '_ios_support', '_json', '_locale', '_lsprof',
  '_lzma', '_markupbase', '_md5', '_multibytecodec', '_multiprocessing',
  '_opcode', '_opcode_metadata', '_operator', '_osx_support', '_overlapped',
  '_pickle', '_posixshmem', '_posixsubprocess', '_py_abc', '_py_warnings',
  '_pydatetime', '_pydecimal', '_pyio', '_pylong', '_pyrepl', '_queue',
  '_random', '_remote_debugging', '_scproxy', '_sha1', '_sha2', '_sha3',
  '_signal', '_sitebuiltins', '_socket', '_sqlite3', '_sre', '_ssl', '_stat',
  '_statistics', '_string', '_strptime', '_struct', '_suggestions',
  '_symtable', '_sysconfig', '_thread', '_threading_local', '_tkinter',
  '_tokenize', '_tracemalloc', '_types', '_typing', '_uuid', '_warnings',
  '_weakref', '_weakrefset', '_winapi', '_wmi', '_zoneinfo', '_zstd', 'abc',
  'aifc', 'annotationlib', 'antigravity', 'argparse', 'array', 'ast',
  'asynchat', 'asyncio', 'asyncore', 'atexit', 'audioop', 'base64', 'bdb',
  'binascii', 'bisect', 'builtins', 'bz2', 'cProfile', 'calendar', 'cgi',
  'cgitb', 'chunk', 'cmath', 'cmd', 'code', 'codecs', 'codeop', 'collections',
  'colorsys', 'compileall', 'compression', 'concurrent', 'configparser',
  'contextlib', 'contextvars', 'copy', 'copyreg', 'crypt', 'csv', 'ctypes',
  'curses', 'dataclasses', 'datetime', 'dbm', 'decimal', 'difflib', 'dis',
  'distutils', 'doctest', 'email', 'encodings', 'ensurepip', 'enum', 'errno',
  'faulthandler', 'fcntl', 'filecmp', 'fileinput', 'fnmatch', 'fractions',
  'ftplib', 'functools', 'gc', 'genericpath', 'getopt', 'getpass', 'gettext',
  'glob', 'graphlib', 'grp', 'gzip', 'hashlib', 'heapq', 'hmac', 'html',
  'http', 'idlelib', 'imaplib', 'imghdr', 'imp', 'importlib', 'inspect', 'io',
  'ipaddress', 'itertools', 'json', 'keyword', 'lib2to3', 'linecache',
  'locale', 'logging', 'lzma', 'mailbox', 'mailcap', 'marshal', 'math',
  'mimetypes', 'mmap', 'modulefinder', 'msilib', 'msvcrt', 'multiprocessing',
  'netrc', 'nis', 'nntplib', 'nt', 'ntpath', 'nturl2path', 'numbers',
  'opcode', 'operator', 'optparse', 'os', 'ossaudiodev', 'pathlib', 'pdb',
  'pickle', 'pickletools', 'pipes', 'pkgutil', 'platform', 'plistlib',
  'poplib', 'posix', 'posixpath', 'pprint', 'profile', 'pstats', 'pty', 'pwd',
  'py_compile', 'pyclbr', 'pydoc', 'pydoc_data', 'pyexpat', 'queue', 'quopri',
  'random', 're', 'readline', 'reprlib', 'resource', 'rlcompleter', 'runpy',
  'sched', 'secrets', 'select', 'selectors', 'shelve', 'shlex', 'shutil',
  'signal', 'site', 'smtpd', 'smtplib', 'sndhdr', 'socket', 'socketserver',
  'spwd', 'sqlite3', 'sre_compile', 'sre_constants', 'sre_parse', 'ssl',
  'stat', 'statistics', 'string', 'stringprep', 'struct', 'subprocess',
  'sunau', 'symtable', 'sys', 'sysconfig', 'syslog', 'tabnanny', 'tarfile',
  'telnetlib', 'tempfile', 'termios', 'textwrap', 'this', 'threading', 'time',
  'timeit', 'tkinter', 'token', 'tokenize', 'tomllib', 'trace', 'traceback',
  'tracemalloc', 'tty', 'turtle', 'turtledemo', 'types', 'typing',
  'unicodedata', 'unittest', 'urllib', 'uu', 'uuid', 'venv', 'warnings',
  'wave', 'weakref', 'webbrowser', 'winreg', 'winsound', 'wsgiref', 'xdrlib',
  'xml', 'xmlrpc', 'zipapp', 'zipfile', 'zipimport', 'zlib', 'zoneinfo'
]);

/** How many segments a dotted name may carry before this arm stops walking. */
const MAX_SEGMENTS = 64;

/**
 * Resolve one Python specifier.
 *
 * `specifier` is what ../../symbols/queries.ts captured, which is either a
 * clean dotted name such as `lift_sys.ir.node`, or a relative import token that
 * begins with one or more dots such as `.`, `..` or `.ir.node`. There are no
 * quotes, no braces and no aliases in it: the query captures the `dotted_name`
 * inside an `aliased_import`, so `import numpy as np` arrives here as `numpy`.
 *
 * `fromPath` is repository relative and is used only to find the importing
 * file's own package directory. It is never handed to anything that runs.
 */
export function resolvePython(
  specifier: string,
  fromPath: string,
  ctx: ArchResolveContext
): ArchResolution {
  const raw = specifier.trim();
  if (raw.length === 0) return unresolved();
  if (raw.startsWith('.')) return resolveRelative(raw, fromPath, ctx);
  if (!isDottedName(raw)) {
    // Not a shape Python can import. The query should never produce one, and
    // an unrecognised shape is a thing this arm cannot answer rather than a
    // thing it knows is outside the repository.
    return unresolved();
  }

  const segments = raw.split('.');
  if (segments.length > MAX_SEGMENTS) return unresolved();

  // FIRST PARTY FIRST. See the header: this order is what stops the standard
  // library list or a dependency name stealing a repository's own module.
  for (const root of packageRoots(ctx)) {
    const hit = walk(root, segments, ctx);
    if (hit !== null) return firstParty(hit);
  }

  const head = segments[0] ?? '';
  if (PYTHON_STDLIB.has(head)) return external();

  // THE REPOSITORY HAS TO HAVE SAID SO. A name in a dependency table is
  // `external`, which is a definite answer. A name in no table is `unresolved`,
  // which is not, and being grey about a package nobody declared is the safe
  // half of the trade.
  if (isDeclaredDistribution(segments, ctx)) return external();
  return unresolved();
}

/**
 * A relative import, which is first party by definition or it is nothing.
 *
 * The leading dots count from the importing file's own PACKAGE. For both
 * `pkg/sub/mod.py` and `pkg/sub/__init__.py` the package is `pkg/sub`, so one
 * dot is that directory in both cases and each further dot is one level up.
 * That is Python's own rule and the two shapes really do agree.
 *
 * NOTHING HERE CAN ANSWER `external`. A relative import names a file inside the
 * repository or it names nothing, so a miss is `unresolved`. In particular a
 * specifier with more dots than the file has parent directories has walked out
 * of the repository, and that is refused explicitly rather than clamped:
 * `normalizeRel` in ./manifest.ts silently drops a `..` it cannot honour, so
 * relying on it would turn a walk off the top of the tree into a resolution
 * against the repository root.
 */
function resolveRelative(
  raw: string,
  fromPath: string,
  ctx: ArchResolveContext
): ArchResolution {
  let dots = 0;
  while (dots < raw.length && raw[dots] === '.') dots += 1;
  const tail = raw.slice(dots);
  if (tail.length > 0 && !isDottedName(tail)) return unresolved();

  const parts = fromPath.split('/').filter((part) => part.length > 0);
  parts.pop(); // The file's own name. What is left is its package directory.
  // One dot is the package itself, so `dots - 1` levels are walked up.
  if (dots - 1 > parts.length) return unresolved();
  const base = parts.slice(0, parts.length - (dots - 1)).join('/');

  if (tail.length === 0) {
    // `from . import x`. The edge is to the package itself, which is its
    // `__init__.py`. A namespace package has no file to name, so it is honestly
    // unresolved rather than pointed at a directory.
    const init = join(base, '__init__.py');
    return ctx.files.has(init)
      ? firstParty(init)
      : unresolved();
  }
  const segments = tail.split('.');
  if (segments.length > MAX_SEGMENTS) return unresolved();
  const hit = walk(base, segments, ctx);
  return hit === null ? unresolved() : firstParty(hit);
}

/**
 * Walk a dotted name from one package root down to the deepest tracked file it
 * names, or null.
 *
 * The package directory is tried BEFORE the module file, because that is
 * CPython's own order: a directory holding `__init__.py` shadows a sibling
 * `.py` of the same name.
 *
 * The walk stops at the first segment that names neither, and answers with the
 * last file that did. `lift_sys.ir.node.IRNode` therefore resolves to
 * `lift_sys/ir/node.py` and this arm never claims to know what `IRNode` is. If
 * the FIRST segment names neither, the answer is null, which the caller turns
 * into `unresolved` and never into `external`.
 */
function walk(
  root: string,
  segments: readonly string[],
  ctx: ArchResolveContext
): string | null {
  let dir = root;
  let best: string | null = null;
  for (const segment of segments) {
    if (segment.length === 0) return best;
    const child = join(dir, segment);
    const init = join(child, '__init__.py');
    if (ctx.files.has(init)) {
      best = init;
      dir = child;
      continue;
    }
    const module = `${child}.py`;
    if (ctx.files.has(module)) {
      // A module file has no submodules, so every remaining segment is an item
      // and this is the deepest honest answer.
      return module;
    }
    if (ctx.directories.has(child)) {
      // A namespace package, which has no file of its own. Keep walking and
      // keep the last real file as the answer.
      dir = child;
      continue;
    }
    return best;
  }
  return best;
}

/**
 * Where a dotted name is resolved from, most specific first.
 *
 * The roots the packaging files DECLARED come first, because they are what the
 * repository said about itself. The repository root and `src` follow as the two
 * conventions, and they cost nothing when they are wrong because a root only
 * produces an answer when a tracked file is actually under it.
 *
 * The importing file's own directory is deliberately NOT a root. See the
 * header's `sys.path` paragraph for the measurement behind that refusal.
 */
function packageRoots(ctx: ArchResolveContext): string[] {
  const project = ctx.manifests.python;
  const out: string[] = [];
  for (const root of project.declaredRoots) {
    if (!out.includes(root)) out.push(root);
  }
  if (!out.includes('')) out.push('');
  if (ctx.directories.has('src') && !out.includes('src')) out.push('src');
  return out;
}

/**
 * Did the repository's own packaging files declare a distribution that accounts
 * for this dotted name?
 *
 * Two forms are tried and no more. The first segment, which covers the ordinary
 * case where `httpx` is declared as `httpx`. And the first two segments joined,
 * which covers a namespace distribution: `google.generativeai` is declared as
 * `google-generativeai`, and both normalise to `google_generativeai`.
 *
 * IT MISSES ON PURPOSE WHERE IT CANNOT BE SURE. A distribution whose import
 * name differs from its name, such as `python-dotenv` imported as `dotenv` or
 * `gitpython` imported as `git`, is NOT matched here, because matching it would
 * mean carrying a guess table of aliases and a wrong entry in that table is a
 * false `external`. Those imports answer `unresolved`, which is grey and
 * visible, rather than green and silent. Measured over lift-sys at `ff1f696`:
 * three of its 34 declared distributions import under a different name, being
 * `gitpython` as `git`, `z3-solver` as `z3` and `python-dotenv` as `dotenv`.
 * Two of the three are actually imported, and they account for 21 of that
 * repository's 90 unresolved.
 */
function isDeclaredDistribution(
  segments: readonly string[],
  ctx: ArchResolveContext
): boolean {
  const declared = ctx.manifests.python.dependencies;
  const head = normalizeDistribution(segments[0] ?? '');
  if (head.length > 0 && declared.has(head)) return true;
  if (segments.length >= 2) {
    const pair = normalizeDistribution(`${segments[0] ?? ''}_${segments[1] ?? ''}`);
    if (declared.has(pair)) return true;
  }
  return false;
}

/** A dotted name of Python identifiers and nothing else. */
function isDottedName(text: string): boolean {
  if (text.length === 0 || text.length > 512) return false;
  for (const segment of text.split('.')) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment)) return false;
  }
  return true;
}

function join(dir: string, name: string): string {
  return dir === '' ? name : `${dir}/${name}`;
}

/**
 * How many names the compiled standard library list holds.
 *
 * Exported so a test can pin it. The list is the one thing in this arm that can
 * answer `external` without a manifest, so it growing is a thing a person
 * should have to write down rather than something that happens.
 */
export const PYTHON_STDLIB_SIZE = PYTHON_STDLIB.size;
