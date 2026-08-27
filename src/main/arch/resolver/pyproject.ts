/**
 * What a Python repository says about itself, read once per scan (Phase 157).
 *
 * The Python arm needs exactly two facts, and this module exists to get them
 * without adding a package to the 49 this product already carries:
 *
 *  1. **The package roots.** The repository relative directories a dotted
 *     import is resolved from. Without them `import lift_sys.ir.node` cannot be
 *     turned into a path at all.
 *  2. **The declared distribution names.** These are the ONLY thing that
 *     licenses the answer `external`. A bare name nobody declared is
 *     `unresolved`, which is grey rather than green, and that is the whole
 *     rule the Phase 63 verifier was caught by.
 *
 * ## It is hand parsed, and that is deliberate
 *
 * There is no TOML parser in this product's dependencies and Phase 157 adds no
 * package. So `pyproject.toml` is read by the small line scanner below, the way
 * `readGoModule` in ./manifest.ts reads `go.mod` line by line. The scanner
 * understands the shapes packaging files actually use: a table header, a quoted
 * string, an array of quoted strings that may run over several lines, and an
 * inline table. It understands nothing else and it says so by ignoring it. A
 * shape it cannot read costs the repository some `external` answers, which
 * become `unresolved`, which is the safe side to be wrong on.
 *
 * NOTHING HERE RUNS ANYTHING. `setup.py` is Python source code and it is read
 * as TEXT with two narrow regular expressions. It is never evaluated, never
 * imported and never handed to an interpreter. No value read by this module
 * ever reaches an argv.
 *
 * ## WHAT IT DOES NOT READ, stated because the last round was caught by the
 * ## opposite habit
 *
 * **It reads only the repository ROOT.** A `pyproject.toml` in a subdirectory
 * of a monorepo is invisible to it, exactly as `readGoModule` cannot see a
 * nested `go.mod`. The consequence is stated where it lands: a nested project's
 * dependencies are not declared as far as this module is concerned, so imports
 * of them answer `unresolved` rather than `external`. Grey, never green.
 *
 * It also does not read a lock file, an `environment.yml`, a `Pipfile` or a
 * `requirements.txt`. The first three are not this repository's own
 * declaration, and `requirements.txt` names distributions with no table
 * structure at all, so the arm would be reading a pinned transitive closure and
 * calling every name in it something the repository said. That is exactly the
 * over-claim the `external` rule forbids.
 */

import { join } from 'node:path';
import { normalizeRel, readTextOrNull } from './paths';
import {
  bracketDepth,
  indexOfTopLevel,
  splitKeyPath,
  splitTopLevelCommas,
  stringLiterals,
  stripTomlComment
} from './toml';

/** Everything the Python arm learned from one repository's packaging files. */
export interface PythonProject {
  /**
   * The project's own name, normalised the way an import writes it, or null.
   *
   * `lift-sys` in the manifest is `lift_sys` on disk, and that rewrite is
   * mandatory rather than a courtesy: without it the package root guess misses
   * every hyphenated project.
   */
  name: string | null;
  /**
   * Every distribution name the repository DECLARES, normalised.
   *
   * Normalised means lowercased with every run of `-`, `_` and `.` collapsed to
   * a single `_`, which is PEP 503's rule written for comparison against an
   * import head rather than against a URL.
   */
  dependencies: Set<string>;
  /**
   * Package roots the packaging files DECLARE, repository relative, in the
   * order they were found. The conventional roots are added by the arm rather
   * than here, so this set stays a record of what the repository said.
   */
  declaredRoots: string[];
  /** Which files these facts came from, so a matrix row can say what it read. */
  sources: string[];
}

/** An empty project, for a repository with no Python packaging file at all. */
export function emptyPythonProject(): PythonProject {
  return { name: null, dependencies: new Set(), declaredRoots: [], sources: [] };
}

/**
 * PEP 503 normalisation, written for comparing against an import head.
 *
 * The specification collapses runs of `-`, `_` and `.` to a single `-`; this
 * uses `_` instead because that is the character an import name may legally
 * carry. `Google-Generative.AI` and `google_generative_ai` both become
 * `google_generative_ai`.
 */
export function normalizeDistribution(name: string): string {
  return name.toLowerCase().replace(/[-_.]+/g, '_');
}

/**
 * The distribution name at the head of one PEP 508 requirement string.
 *
 * `z3-solver>=4.13.0` is `z3-solver`, `pytest[extra]>=8` is `pytest`, and
 * `thing @ git+https://example.invalid/x` is `thing`. Everything after the
 * first character that can begin a version, an extra, a marker or a URL is
 * dropped, because none of it is a name.
 */
function requirementName(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const cut = trimmed.search(/[\s[(<>=!~;@,]/);
  const name = (cut === -1 ? trimmed : trimmed.slice(0, cut)).trim();
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return null;
  return name;
}

export function readPythonProject(repoPath: string): PythonProject {
  const project = emptyPythonProject();
  readPyprojectToml(repoPath, project);
  readSetupCfg(repoPath, project);
  readSetupPy(repoPath, project);
  return project;
}

// ---------------------------------------------------------------------------
// pyproject.toml
// ---------------------------------------------------------------------------

function readPyprojectToml(repoPath: string, project: PythonProject): void {
  const text = readTextOrNull(join(repoPath, 'pyproject.toml'));
  if (text === null) return;
  project.sources.push('pyproject.toml');
  const toml = scanToml(text);

  // PEP 621, which is what a modern project writes.
  const name = stringOf(toml, 'project', 'name');
  if (name !== null) project.name = normalizeDistribution(name);
  addRequirements(project, arrayOf(toml, 'project', 'dependencies'));
  for (const [table, keys] of toml) {
    if (table === 'project.optional-dependencies' || table === 'dependency-groups') {
      for (const value of keys.values()) {
        if (value.kind === 'array') addRequirements(project, value.values);
      }
    }
  }

  // Poetry, which writes its own name and states dependencies as table KEYS
  // rather than as requirement strings.
  if (project.name === null) {
    const poetryName = stringOf(toml, 'tool.poetry', 'name');
    if (poetryName !== null) project.name = normalizeDistribution(poetryName);
  }
  for (const [table, keys] of toml) {
    const poetryDeps =
      table === 'tool.poetry.dependencies' ||
      table === 'tool.poetry.dev-dependencies' ||
      (table.startsWith('tool.poetry.group.') && table.endsWith('.dependencies'));
    if (!poetryDeps) continue;
    for (const key of keys.keys()) {
      if (key === 'python') continue;
      project.dependencies.add(normalizeDistribution(key));
    }
  }

  // Where setuptools was told the packages live. Both spellings of the key are
  // accepted because `pyproject.toml` uses the hyphen and `setup.cfg` uses the
  // underscore for the same field.
  for (const key of ['package-dir', 'package_dir']) {
    const table = toml.get('tool.setuptools')?.get(key);
    if (table?.kind === 'table') {
      for (const [, value] of table.entries) addRoot(project, value);
    }
  }
  for (const where of arrayOf(toml, 'tool.setuptools.packages.find', 'where')) {
    addRoot(project, where);
  }
  // Hatch's src layout, written as a build target mapping.
  const hatchSources = toml.get('tool.hatch.build.targets.wheel')?.get('sources');
  if (hatchSources?.kind === 'array') {
    for (const source of hatchSources.values) addRoot(project, source);
  }
}

function addRequirements(project: PythonProject, values: readonly string[]): void {
  for (const value of values) {
    const name = requirementName(value);
    if (name !== null) project.dependencies.add(normalizeDistribution(name));
  }
}

function addRoot(project: PythonProject, raw: string): void {
  const clean = normalizeRel(raw);
  if (clean.includes('*')) return;
  if (project.declaredRoots.includes(clean)) return;
  project.declaredRoots.push(clean);
}

// ---------------------------------------------------------------------------
// setup.cfg
// ---------------------------------------------------------------------------

/**
 * `setup.cfg` is an INI file, and the two fields worth reading are written in
 * two different shapes: `name` is one line, and `install_requires` is a key
 * with an empty value followed by indented continuation lines. Both are read
 * here and nothing else is.
 */
function readSetupCfg(repoPath: string, project: PythonProject): void {
  const text = readTextOrNull(join(repoPath, 'setup.cfg'));
  if (text === null) return;
  project.sources.push('setup.cfg');
  let section = '';
  let continuing: 'requires' | 'where' | 'package_dir' | null = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      continue;
    }
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      section = trimmed.slice(1, -1).trim();
      continuing = null;
      continue;
    }
    const indented = /^\s/.test(line);
    if (indented && continuing !== null) {
      if (continuing === 'requires') addRequirements(project, [trimmed]);
      else if (continuing === 'where') addRoot(project, trimmed);
      else addPackageDirEntry(project, trimmed);
      continue;
    }
    continuing = null;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (section === 'metadata' && key === 'name' && value.length > 0) {
      project.name = normalizeDistribution(value);
      continue;
    }
    if (section === 'options' && key === 'install_requires') {
      if (value.length === 0) continuing = 'requires';
      else addRequirements(project, [value]);
      continue;
    }
    if (section === 'options' && key === 'package_dir') {
      if (value.length === 0) continuing = 'package_dir';
      else addPackageDirEntry(project, value);
      continue;
    }
    if (section === 'options.packages.find' && key === 'where') {
      if (value.length === 0) continuing = 'where';
      else addRoot(project, value);
    }
  }
}

/** One `package_dir` line, which is written as `= src` or as `pkg = lib/pkg`. */
function addPackageDirEntry(project: PythonProject, line: string): void {
  const eq = line.indexOf('=');
  if (eq === -1) return;
  addRoot(project, line.slice(eq + 1).trim());
}

// ---------------------------------------------------------------------------
// setup.py
// ---------------------------------------------------------------------------

/**
 * `setup.py` IS PYTHON SOURCE AND IT IS NEVER EVALUATED.
 *
 * It is read as text, and only two literal shapes are taken out of it: the
 * `name=` keyword argument when it is a plain quoted string, and the string
 * literals inside an `install_requires=[ ... ]` list. A `setup.py` that
 * computes either of those at run time gives up nothing here except some
 * `external` answers, which become `unresolved`.
 */
function readSetupPy(repoPath: string, project: PythonProject): void {
  const text = readTextOrNull(join(repoPath, 'setup.py'));
  if (text === null) return;
  project.sources.push('setup.py');
  if (project.name === null) {
    const named = /\bname\s*=\s*['"]([^'"\n]+)['"]/.exec(text);
    if (named?.[1] !== undefined) project.name = normalizeDistribution(named[1]);
  }
  const requires = /\binstall_requires\s*=\s*\[([^\]]*)\]/.exec(text);
  if (requires?.[1] !== undefined) {
    for (const literal of requires[1].matchAll(/['"]([^'"\n]*)['"]/g)) {
      addRequirements(project, [literal[1] ?? '']);
    }
  }
  const dirs = /\bpackage_dir\s*=\s*\{([^}]*)\}/.exec(text);
  if (dirs?.[1] !== undefined) {
    for (const pair of dirs[1].split(',')) {
      const colon = pair.indexOf(':');
      if (colon === -1) continue;
      const value = /['"]([^'"\n]*)['"]/.exec(pair.slice(colon + 1));
      if (value?.[1] !== undefined && value[1].length > 0) addRoot(project, value[1]);
    }
  }
}

// ---------------------------------------------------------------------------
// The small TOML scanner
// ---------------------------------------------------------------------------

/** The three value shapes this scanner understands. Everything else is dropped. */
type TomlValue =
  | { kind: 'string'; value: string }
  | { kind: 'array'; values: string[] }
  | { kind: 'table'; entries: [string, string][] };

type TomlTables = Map<string, Map<string, TomlValue>>;

/** How many lines this scanner will read before it stops. A packaging file is small. */
const MAX_TOML_LINES = 20_000;

/**
 * Enough TOML to read a packaging file, and no more.
 *
 * It handles a table header, an array of tables header (recorded once, because
 * nothing here needs the repeats), a basic or literal quoted string, an array
 * of quoted strings that may run over several lines, and a single line inline
 * table of quoted strings. A dotted key on the left of `=` is joined onto the
 * current table name, so `[tool.setuptools]` with `packages.find = ...` and
 * `[tool.setuptools.packages]` with `find = ...` both land in the same place.
 *
 * It does NOT handle multi line basic strings, escapes beyond `\"`, or a
 * nested inline table. Those never appear in the four fields this module
 * reads, and a value it cannot read is dropped rather than guessed at.
 */
function scanToml(text: string): TomlTables {
  const tables: TomlTables = new Map();
  let table = '';
  const lines = text.split('\n');
  for (let i = 0; i < lines.length && i < MAX_TOML_LINES; i += 1) {
    let line = stripTomlComment(lines[i] ?? '').trim();
    if (line.length === 0) continue;
    if (line.startsWith('[')) {
      const doubled = line.startsWith('[[');
      const close = line.indexOf(doubled ? ']]' : ']');
      if (close === -1) continue;
      table = splitKeyPath(line.slice(doubled ? 2 : 1, close).trim()).join('.');
      continue;
    }
    const eq = indexOfTopLevel(line, '=');
    if (eq === -1) continue;
    const keyPath = splitKeyPath(line.slice(0, eq).trim());
    let rest = line.slice(eq + 1).trim();
    // An array may run over several lines. Keep pulling lines in until the
    // brackets balance outside of a string, or the file ends.
    if (rest.startsWith('[')) {
      let depth = bracketDepth(rest, 0);
      while (depth > 0 && i + 1 < lines.length && i + 1 < MAX_TOML_LINES) {
        i += 1;
        const next = stripTomlComment(lines[i] ?? '').trim();
        rest = `${rest} ${next}`;
        depth = bracketDepth(next, depth);
      }
    }
    const value = parseValue(rest);
    if (value === null || keyPath.length === 0) continue;
    // A dotted key joins onto the table name, and the LAST segment is the key.
    // The split is quote aware, so `"ruamel.yaml" = "*"` is one key rather than
    // a table named `ruamel` holding a key named `yaml`. Getting that wrong lost
    // a real Poetry dependency in the first build of this scanner.
    const key = keyPath[keyPath.length - 1] ?? '';
    const owner = [...(table === '' ? [] : [table]), ...keyPath.slice(0, -1)].join('.');
    let bucket = tables.get(owner);
    if (bucket === undefined) {
      bucket = new Map();
      tables.set(owner, bucket);
    }
    if (!bucket.has(key)) bucket.set(key, value);
  }
  return tables;
}

/** The index of the `=` that begins the value, ignoring one inside a quoted key. */
function parseValue(raw: string): TomlValue | null {
  const text = raw.trim();
  if (text.startsWith('[')) {
    const close = text.lastIndexOf(']');
    if (close === -1) return null;
    return { kind: 'array', values: stringLiterals(text.slice(1, close)) };
  }
  if (text.startsWith('{')) {
    const close = text.lastIndexOf('}');
    if (close === -1) return null;
    const entries: [string, string][] = [];
    for (const pair of splitTopLevelCommas(text.slice(1, close))) {
      const eq = indexOfTopLevel(pair, '=');
      if (eq === -1) continue;
      const key = splitKeyPath(pair.slice(0, eq).trim()).join('.');
      const values = stringLiterals(pair.slice(eq + 1));
      if (values.length === 1) entries.push([key, values[0] ?? '']);
    }
    return { kind: 'table', entries };
  }
  const values = stringLiterals(text);
  if (values.length === 1 && (text.startsWith('"') || text.startsWith("'"))) {
    return { kind: 'string', value: values[0] ?? '' };
  }
  return null;
}

function stringOf(toml: TomlTables, table: string, key: string): string | null {
  const value = toml.get(table)?.get(key);
  return value?.kind === 'string' ? value.value : null;
}

function arrayOf(toml: TomlTables, table: string, key: string): string[] {
  const value = toml.get(table)?.get(key);
  return value?.kind === 'array' ? value.values : [];
}
