/**
 * The NON-SOURCE half of the fact base (Phase 257).
 *
 * Half of what a person needs in order to read a repository is not in the
 * source at all: which binary this project produces, what the container is
 * told to run, which job runs on a timer, where the schema lives. Every fact
 * below carries a LINE, found by scanning the file's own lines so a reader
 * can go to it, which is why these are hand line scans rather than a TOML or
 * YAML parse that would give a key and lose its position.
 *
 * Two lessons from the corpus are written into the scans rather than around
 * them. A two space key is a CI JOB only while the scan is inside `jobs:`,
 * because without the section flag the trigger keys under `on:` were 10 of
 * 20 entrypoint facts on fastapi-app. The same lesson is applied to python
 * console scripts: `x = "a:b"` counts only inside a scripts table, because
 * under `[tool.something]` it is not a command.
 *
 * Nothing here is evaluated. `package.json` is parsed as JSON and every other
 * format is read as text; no value read from any file reaches an argv. The
 * five manifest kinds of the unexercised grammars, being AndroidManifest,
 * gradle, pom, csproj and sln, are not read (spec D4).
 */

import type { ArchFactDraft, ArchFactCategory } from '@shared/arch';
import { FACT_LIMITS } from './limits';

const MANIFEST_BASENAMES: ReadonlySet<string> = new Set([
  'package.json',
  'cargo.toml',
  'go.mod',
  'pyproject.toml',
  'setup.py',
  'setup.cfg',
  'gemfile',
  'rakefile',
  'procfile',
  'dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml',
  'package.swift',
  'schema.rb',
  'crontab',
  'crontab.txt'
]);

/** Files this module has a rule for. */
export function isManifestPath(relPath: string): boolean {
  const base = relPath.slice(relPath.lastIndexOf('/') + 1).toLowerCase();
  if (/\.github\/workflows\/.*\.ya?ml$/.test(relPath)) return true;
  if (/(^|\/)(migrations?|migrate|db\/migrate)\//.test(relPath)) return true;
  if (/\.(sql|prisma|gemspec)$/.test(base)) return true;
  if (/^docker-compose(\.[a-z]+)?\.ya?ml$/.test(base)) return true;
  return MANIFEST_BASENAMES.has(base) || base.startsWith('dockerfile.');
}

function lineOf(lines: readonly string[], needle: RegExp, from = 0): number {
  for (let i = from; i < lines.length; i += 1) if (needle.test(lines[i]!)) return i + 1;
  return 1;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Every manifest fact for one non-source file, read from its text. */
export function readManifestFacts(relPath: string, text: string): ArchFactDraft[] {
  if (text.length > FACT_LIMITS.maxManifestBytes) return [];
  const base = relPath.slice(relPath.lastIndexOf('/') + 1).toLowerCase();
  const L = text.split('\n');
  const out: ArchFactDraft[] = [];
  const add = (category: ArchFactCategory, kind: string, subject: string, line: number, rule: string): void => {
    out.push({
      category,
      kind,
      subject: subject.slice(0, FACT_LIMITS.maxSubject),
      line,
      rule,
      evidence: (L[line - 1] ?? '').trim().slice(0, FACT_LIMITS.maxEvidence)
    });
  };

  if (base === 'package.json') readPackageJson(text, L, add);
  if (base === 'cargo.toml') readCargo(L, add);
  if (base === 'go.mod') {
    const m = /^module\s+(\S+)/m.exec(text);
    if (m) add('entrypoint', 'package', `go module ${m[1]}`, lineOf(L, /^module\s/), 'entrypoint.go.module');
  }
  if (base === 'pyproject.toml' || base === 'setup.py' || base === 'setup.cfg') readPythonScripts(L, add);
  if (base === 'gemfile' || base.endsWith('.gemspec') || base === 'rakefile') {
    add('entrypoint', 'package', `ruby project file ${base}`, 1, 'entrypoint.ruby.project');
  }
  if (base === 'procfile') {
    L.forEach((ln, i) => {
      const m = /^([A-Za-z0-9_\-]+):\s*(.+)$/.exec(ln.trim());
      if (m) add('entrypoint', 'process', `${m[1]}: ${m[2]!.slice(0, 80)}`, i + 1, 'entrypoint.procfile');
    });
  }
  if (base === 'dockerfile' || base.startsWith('dockerfile.')) {
    L.forEach((ln, i) => {
      const m = /^\s*(CMD|ENTRYPOINT)\s+(.+)$/i.exec(ln);
      if (m) add('entrypoint', 'container', `${m[1]!.toUpperCase()} ${m[2]!.slice(0, 90)}`, i + 1, 'entrypoint.docker.cmd');
      const e = /^\s*EXPOSE\s+(.+)$/i.exec(ln);
      if (e) add('surface', 'port', `exposes port ${e[1]!.trim()}`, i + 1, 'surface.docker.expose');
    });
  }
  if (/^docker-compose(\.[a-z]+)?\.ya?ml$/.test(base) || base === 'compose.yaml' || base === 'compose.yml') {
    let inServices = false;
    L.forEach((ln, i) => {
      if (/^services:/.test(ln)) inServices = true;
      else if (/^[a-z]/i.test(ln)) inServices = false;
      const m = /^  ([A-Za-z0-9_\-]+):\s*$/.exec(ln);
      if (inServices && m) add('boundary', 'service', `compose service ${m[1]}`, i + 1, 'boundary.compose.service');
    });
  }
  if (/\.github\/workflows\//.test(relPath) && /\.ya?ml$/.test(base)) {
    let inJobs = false;
    L.forEach((ln, i) => {
      if (/^jobs:\s*$/.test(ln)) inJobs = true;
      else if (/^[A-Za-z]/.test(ln)) inJobs = false;
      if (/^\s*schedule:/.test(ln)) add('surface', 'job', 'CI schedule', i + 1, 'surface.ci.schedule');
      const c = /^\s*-?\s*cron:\s*['"]?([^'"]+)/.exec(ln);
      if (c) add('surface', 'job', `cron ${c[1]!.trim()}`, i + 1, 'surface.ci.cron');
      const j = /^  ([A-Za-z0-9_\-]+):\s*$/.exec(ln);
      if (inJobs && j) add('entrypoint', 'ci-job', `CI job ${j[1]}`, i + 1, 'entrypoint.ci.job');
    });
  }
  if (base === 'package.swift') {
    L.forEach((ln, i) => {
      const m = /\.(executableTarget|target|library|executable)\(\s*name:\s*"([^"]+)"/.exec(ln);
      if (m) {
        const isExec = m[1]!.startsWith('executable');
        if (isExec) add('entrypoint', 'bin', `swift ${m[1]} ${m[2]}`, i + 1, 'entrypoint.swiftpm.target');
        else add('boundary', 'library', `swift ${m[1]} ${m[2]}`, i + 1, 'boundary.swiftpm.target');
      }
      const t = /\.testTarget\(\s*name:\s*"([^"]+)"/.exec(ln);
      if (t) add('test', 'test-target', `swift test target ${t[1]}`, i + 1, 'test.swiftpm.target');
    });
  }
  if (base === 'crontab' || base === 'crontab.txt') {
    L.forEach((ln, i) => {
      if (/^\s*[\d*]/.test(ln)) add('surface', 'job', `cron ${ln.trim().slice(0, 80)}`, i + 1, 'surface.crontab');
    });
  }
  // SQL / migration files: the store DEFINITIONS.
  if (/\.sql$/.test(base) || /(^|\/)(migrations?|migrate|db\/migrate)\//.test(relPath) || base === 'schema.rb' || /\.prisma$/.test(base)) {
    L.forEach((ln, i) => {
      const m = /\b(CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE|CREATE\s+INDEX)\s+`?"?\[?([A-Za-z_][A-Za-z0-9_.]*)/i.exec(ln);
      if (m) add('store', 'store-def', `${m[1]!.toUpperCase().replace(/\s+/g, ' ')} ${m[2]}`, i + 1, 'store.sql.file');
      const rb = /^\s*create_table\s+[:"']([A-Za-z0-9_]+)/.exec(ln);
      if (rb) add('store', 'store-def', `table ${rb[1]}`, i + 1, 'store.rails.schema');
      const pr = /^\s*model\s+([A-Za-z0-9_]+)\s*\{/.exec(ln);
      if (pr) add('store', 'store-def', `prisma model ${pr[1]}`, i + 1, 'store.prisma.model');
    });
  }
  return out;
}

type Add = (category: ArchFactCategory, kind: string, subject: string, line: number, rule: string) => void;

function readPackageJson(text: string, L: readonly string[], add: Add): void {
  let j: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    j = parsed as Record<string, unknown>;
  } catch {
    return;
  }
  const main = j['main'];
  if (typeof main === 'string') add('entrypoint', 'package-main', `node entry ${main}`, lineOf(L, /"main"\s*:/), 'entrypoint.pkg.main');
  const bin = j['bin'];
  const name = typeof j['name'] === 'string' ? (j['name'] as string) : '?';
  if (typeof bin === 'string') {
    add('entrypoint', 'bin', `command ${name} → ${bin}`, lineOf(L, /"bin"\s*:/), 'entrypoint.pkg.bin');
  } else if (bin !== null && typeof bin === 'object' && !Array.isArray(bin)) {
    for (const [k, v] of Object.entries(bin as Record<string, unknown>)) {
      if (typeof v !== 'string') continue;
      add('entrypoint', 'bin', `command ${k} → ${v}`, lineOf(L, new RegExp(`"${escapeRe(k)}"\\s*:`)), 'entrypoint.pkg.bin');
    }
  }
  if (j['workspaces'] !== undefined) {
    add('boundary', 'workspace', 'npm workspaces declared', lineOf(L, /"workspaces"\s*:/), 'boundary.pkg.workspaces');
  }
  const scripts = j['scripts'];
  if (scripts !== null && typeof scripts === 'object' && !Array.isArray(scripts)) {
    for (const k of Object.keys(scripts as Record<string, unknown>)) {
      if (/^(test|test:.*|lint|build|start|dev|serve)$/.test(k)) {
        add('entrypoint', 'script', `npm run ${k}`, lineOf(L, new RegExp(`"${escapeRe(k)}"\\s*:`)), 'entrypoint.pkg.script');
      }
    }
  }
}

/**
 * `Cargo.toml`. A `[[bin]]` fact reads the `name = "…"` on the lines that
 * follow inside its own table, so the subject names the binary; the
 * prototype wrote "(see name below)" and made the reader look.
 */
function readCargo(L: readonly string[], add: Add): void {
  let table = '';
  L.forEach((ln, i) => {
    const header = /^\s*\[+\s*([^\]\s]+)\s*\]+/.exec(ln);
    if (header) table = header[1]!;
    if (/^\s*\[\[bin\]\]/.test(ln)) {
      let name: string | null = null;
      for (let k = i + 1; k < L.length && k <= i + 12; k += 1) {
        const next = L[k]!;
        if (/^\s*\[/.test(next)) break;
        const nm = /^\s*name\s*=\s*"([^"]+)"/.exec(next);
        if (nm) {
          name = nm[1]!;
          break;
        }
      }
      add('entrypoint', 'bin', name === null ? 'cargo bin' : `cargo bin ${name}`, i + 1, 'entrypoint.cargo.bin');
    }
    if (/^\s*\[lib\]/.test(ln)) add('boundary', 'library', 'cargo library target', i + 1, 'boundary.cargo.lib');
    if (/^\s*members\s*=/.test(ln)) add('boundary', 'workspace', 'cargo workspace members', i + 1, 'boundary.cargo.workspace');
    // The crate's own name is the one inside `[package]`; a `[[bin]]` table
    // carries a `name` too and that one is the binary's.
    const nm = /^\s*name\s*=\s*"([^"]+)"/.exec(ln);
    if (nm && table === 'package') add('entrypoint', 'package', `crate ${nm[1]}`, i + 1, 'entrypoint.cargo.name');
  });
}

const SCRIPTS_TABLE = /^\s*\[(project\.scripts|project\.gui-scripts|project\.entry-points\.[^\]]+|tool\.poetry\.scripts)\]\s*$/;
const ANY_TABLE = /^\s*\[/;
const SCRIPT_ENTRY = /^\s*['"]?([A-Za-z0-9_\-]+)['"]?\s*=\s*['"]?([A-Za-z0-9_.]+:[A-Za-z0-9_.]+)['"]?/;

/**
 * pyproject, setup.py and setup.cfg. A `name = "mod:fn"` line is a console
 * script only while the scan is inside a scripts TABLE (pyproject, left at
 * the next `[` header) or under a `console_scripts` KEY (setup.cfg's
 * indented `name = mod:fn` lines and setup.py's quoted list entries, left at
 * the first unindented line or the list's `]`).
 */
function readPythonScripts(L: readonly string[], add: Add): void {
  let mode: 'none' | 'table' | 'key' = 'none';
  L.forEach((ln, i) => {
    if (SCRIPTS_TABLE.test(ln)) {
      mode = 'table';
      add('entrypoint', 'bin', 'python console script table', i + 1, 'entrypoint.py.scripts');
      return;
    }
    if (ANY_TABLE.test(ln)) {
      mode = 'none';
      return;
    }
    if (/console_scripts/.test(ln)) {
      mode = 'key';
      add('entrypoint', 'bin', 'python console script table', i + 1, 'entrypoint.py.scripts');
      return;
    }
    if (mode === 'none') return;
    if (mode === 'key' && ((/^\S/.test(ln) && ln.trim() !== '') || /\]/.test(ln))) {
      mode = 'none';
      return;
    }
    const cs = SCRIPT_ENTRY.exec(ln);
    if (cs) add('entrypoint', 'bin', `command ${cs[1]} → ${cs[2]}`, i + 1, 'entrypoint.py.script');
  });
}
