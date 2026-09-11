/**
 * Phase 256 prototype — the NON-SOURCE half of the deterministic pass.
 *
 * RESEARCH PROTOTYPE. Nothing here ships.
 *
 * Half of what a person needs in order to read a repository is not in the
 * source at all: which binary this project produces, what the container is
 * told to run, which job runs on a timer, where the schema lives. Every fact
 * below carries a file and a LINE, found by scanning the file's own lines so a
 * reader can go to it, which is why these are hand line scans rather than a
 * TOML or YAML parse that would give a key and lose its position.
 */

import { readFileSync } from 'node:fs';
import type { Fact } from './rules.mts';

function lineOf(lines: readonly string[], needle: RegExp, from = 0): number {
  for (let i = from; i < lines.length; i += 1) if (needle.test(lines[i])) return i + 1;
  return 1;
}

function fact(f: Omit<Fact, 'lang' | 'evidence'> & { evidence?: string }, lines: readonly string[]): Fact {
  return {
    ...f,
    lang: 'manifest',
    evidence: f.evidence ?? (lines[f.line - 1] ?? '').trim().slice(0, 200)
  };
}

/** Every manifest fact for one non-source file. */
export function readManifest(rel: string, abs: string): Fact[] {
  const base = rel.split('/').pop()!.toLowerCase();
  let text: string;
  try {
    text = readFileSync(abs, 'utf8');
  } catch {
    return [];
  }
  if (text.length > 2 * 1024 * 1024) return [];
  const L = text.split('\n');
  const out: Fact[] = [];
  const add = (category: Fact['category'], kind: string, subject: string, line: number, rule: string) =>
    out.push(fact({ category, kind, subject, file: rel, line, rule }, L));

  if (base === 'package.json') {
    let j: Record<string, unknown>;
    try {
      j = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return out;
    }
    const main = j.main;
    if (typeof main === 'string') add('entrypoint', 'package-main', `node entry ${main}`, lineOf(L, /"main"\s*:/), 'entrypoint.pkg.main');
    const bin = j.bin;
    if (typeof bin === 'string') add('entrypoint', 'bin', `command ${String(j.name ?? '?')} → ${bin}`, lineOf(L, /"bin"\s*:/), 'entrypoint.pkg.bin');
    else if (bin !== null && typeof bin === 'object') {
      for (const [k, v] of Object.entries(bin as Record<string, string>)) {
        add('entrypoint', 'bin', `command ${k} → ${v}`, lineOf(L, new RegExp(`"${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`)), 'entrypoint.pkg.bin');
      }
    }
    const ws = j.workspaces;
    if (ws !== undefined) add('boundary', 'workspace', `npm workspaces declared`, lineOf(L, /"workspaces"\s*:/), 'boundary.pkg.workspaces');
    const scripts = j.scripts;
    if (scripts !== null && typeof scripts === 'object') {
      for (const [k] of Object.entries(scripts as Record<string, string>)) {
        if (/^(test|test:.*|lint|build|start|dev|serve)$/.test(k)) {
          add('entrypoint', 'script', `npm run ${k}`, lineOf(L, new RegExp(`"${k}"\\s*:`)), 'entrypoint.pkg.script');
        }
      }
    }
  }

  if (base === 'cargo.toml') {
    L.forEach((ln, i) => {
      if (/^\s*\[\[bin\]\]/.test(ln)) add('entrypoint', 'bin', `cargo bin (see name below)`, i + 1, 'entrypoint.cargo.bin');
      if (/^\s*\[lib\]/.test(ln)) add('boundary', 'library', `cargo library target`, i + 1, 'boundary.cargo.lib');
      if (/^\s*members\s*=/.test(ln)) add('boundary', 'workspace', `cargo workspace members`, i + 1, 'boundary.cargo.workspace');
      const nm = /^\s*name\s*=\s*"([^"]+)"/.exec(ln);
      if (nm && i < 12) add('entrypoint', 'package', `crate ${nm[1]}`, i + 1, 'entrypoint.cargo.name');
    });
  }

  if (base === 'go.mod') {
    const m = /^module\s+(\S+)/m.exec(text);
    if (m) add('entrypoint', 'package', `go module ${m[1]}`, lineOf(L, /^module\s/), 'entrypoint.go.module');
  }

  if (base === 'pyproject.toml' || base === 'setup.py' || base === 'setup.cfg') {
    L.forEach((ln, i) => {
      if (/^\s*\[project\.scripts\]|^\s*\[tool\.poetry\.scripts\]|console_scripts/.test(ln)) {
        add('entrypoint', 'bin', `python console script table`, i + 1, 'entrypoint.py.scripts');
      }
      const cs = /^\s*([A-Za-z0-9_\-]+)\s*=\s*"([^"]+:[^"]+)"/.exec(ln);
      if (cs) add('entrypoint', 'bin', `command ${cs[1]} → ${cs[2]}`, i + 1, 'entrypoint.py.script');
    });
  }

  if (base === 'gemfile' || base.endsWith('.gemspec') || base === 'rakefile') {
    add('entrypoint', 'package', `ruby project file ${base}`, 1, 'entrypoint.ruby.project');
  }
  if (base === 'procfile') {
    L.forEach((ln, i) => {
      const m = /^([A-Za-z0-9_\-]+):\s*(.+)$/.exec(ln.trim());
      if (m) add('entrypoint', 'process', `${m[1]}: ${m[2].slice(0, 80)}`, i + 1, 'entrypoint.procfile');
    });
  }

  if (base === 'dockerfile' || base.startsWith('dockerfile.')) {
    L.forEach((ln, i) => {
      const m = /^\s*(CMD|ENTRYPOINT)\s+(.+)$/i.exec(ln);
      if (m) add('entrypoint', 'container', `${m[1].toUpperCase()} ${m[2].slice(0, 90)}`, i + 1, 'entrypoint.docker.cmd');
      const e = /^\s*EXPOSE\s+(.+)$/i.exec(ln);
      if (e) add('surface', 'port', `exposes port ${e[1].trim()}`, i + 1, 'surface.docker.expose');
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

  if (/\.github\/workflows\//.test(rel) && /\.ya?ml$/.test(base)) {
    // A two-space key is a CI JOB only while the scan is inside `jobs:`.
    // Without the section flag the trigger keys under `on:` — `push`,
    // `pull_request`, `workflow_dispatch`, `issues` — were reported as jobs,
    // which was 10 of 20 entrypoint facts on fastapi-app, measured 2026-09-10.
    let inJobs = false;
    L.forEach((ln, i) => {
      if (/^jobs:\s*$/.test(ln)) inJobs = true;
      else if (/^[A-Za-z]/.test(ln)) inJobs = false;
      if (/^\s*schedule:/.test(ln)) add('surface', 'job', `CI schedule`, i + 1, 'surface.ci.schedule');
      const c = /^\s*-?\s*cron:\s*['"]?([^'"]+)/.exec(ln);
      if (c) add('surface', 'job', `cron ${c[1].trim()}`, i + 1, 'surface.ci.cron');
      const j = /^  ([A-Za-z0-9_\-]+):\s*$/.exec(ln);
      if (inJobs && j) add('entrypoint', 'ci-job', `CI job ${j[1]}`, i + 1, 'entrypoint.ci.job');
    });
  }

  if (base === 'package.swift') {
    L.forEach((ln, i) => {
      const m = /\.(executableTarget|target|library|executable)\(\s*name:\s*"([^"]+)"/.exec(ln);
      if (m) {
        const isExec = m[1].startsWith('executable');
        add(isExec ? 'entrypoint' : 'boundary', isExec ? 'bin' : 'library', `swift ${m[1]} ${m[2]}`, i + 1, 'entrypoint.swiftpm.target');
      }
      const t = /\.testTarget\(\s*name:\s*"([^"]+)"/.exec(ln);
      if (t) add('test', 'test-target', `swift test target ${t[1]}`, i + 1, 'test.swiftpm.target');
    });
  }

  if (base === 'androidmanifest.xml') {
    L.forEach((ln, i) => {
      const m = /android:name="([^"]+)"/.exec(ln);
      if (m && /activity|service|receiver/i.test(L.slice(Math.max(0, i - 2), i + 1).join(' '))) {
        add('entrypoint', 'android', `android component ${m[1]}`, i + 1, 'entrypoint.android.component');
      }
      if (/android\.intent\.action\.MAIN/.test(ln)) add('entrypoint', 'android', `android launcher activity`, i + 1, 'entrypoint.android.launcher');
    });
  }

  if (base === 'build.gradle' || base === 'build.gradle.kts' || base === 'pom.xml') {
    L.forEach((ln, i) => {
      const m = /mainClass(?:Name)?\s*[=:]\s*['"]([^'"]+)/.exec(ln) ?? /<mainClass>([^<]+)</.exec(ln);
      if (m) add('entrypoint', 'bin', `jvm main class ${m[1]}`, i + 1, 'entrypoint.jvm.mainclass');
      const app = /applicationId\s*[=:]?\s*['"]([^'"]+)/.exec(ln);
      if (app) add('entrypoint', 'android', `android applicationId ${app[1]}`, i + 1, 'entrypoint.android.appid');
    });
  }

  if (/\.csproj$/.test(base) || /\.sln$/.test(base)) {
    L.forEach((ln, i) => {
      if (/<OutputType>\s*Exe/i.test(ln)) add('entrypoint', 'bin', `.NET executable project`, i + 1, 'entrypoint.dotnet.exe');
    });
  }

  if (base === 'crontab' || base === 'crontab.txt') {
    L.forEach((ln, i) => {
      if (/^\s*[\d*]/.test(ln)) add('surface', 'job', `cron ${ln.trim().slice(0, 80)}`, i + 1, 'surface.crontab');
    });
  }

  // SQL / migration files: the store DEFINITIONS.
  if (/\.sql$/.test(base) || /(^|\/)(migrations?|migrate|db\/migrate)\//.test(rel) || base === 'schema.rb' || /\.prisma$/.test(base)) {
    L.forEach((ln, i) => {
      const m = /\b(CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE|CREATE\s+INDEX)\s+`?"?\[?([A-Za-z_][A-Za-z0-9_.]*)/i.exec(ln);
      if (m) add('store', 'store-def', `${m[1].toUpperCase().replace(/\s+/g, ' ')} ${m[2]}`, i + 1, 'store.sql.file');
      const rb = /^\s*create_table\s+[:"']([A-Za-z0-9_]+)/.exec(ln);
      if (rb) add('store', 'store-def', `table ${rb[1]}`, i + 1, 'store.rails.schema');
      const pr = /^\s*model\s+([A-Za-z0-9_]+)\s*\{/.exec(ln);
      if (pr) add('store', 'store-def', `prisma model ${pr[1]}`, i + 1, 'store.prisma.model');
    });
  }

  return out;
}

/** Files this module has a rule for. */
export function isManifest(rel: string): boolean {
  const base = rel.split('/').pop()!.toLowerCase();
  if (/\.github\/workflows\/.*\.ya?ml$/.test(rel)) return true;
  if (/(^|\/)(migrations?|migrate|db\/migrate)\//.test(rel)) return true;
  if (/\.(sql|prisma|csproj|sln|gemspec)$/.test(base)) return true;
  return new Set([
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
    'androidmanifest.xml',
    'build.gradle',
    'build.gradle.kts',
    'pom.xml',
    'schema.rb',
    'crontab'
  ]).has(base) || base.startsWith('dockerfile.');
}
