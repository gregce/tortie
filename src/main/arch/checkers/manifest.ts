/**
 * The manifest checker (Phase 63, research 49 section 4.4).
 *
 * **It proves that a dependency a contract names really is declared, and that a
 * dependency a contract forbids really is absent.** It is the cheapest of the
 * five and the only one that can prove an absence outright, because a manifest
 * is a closed list rather than a search.
 *
 * ## The five manifest kinds, and what is read from each
 *
 * The parsers are deliberately shallow. Each one wants the set of names a
 * project declares and nothing else, so none of them is a real parser for its
 * format and none of them ever will be. A shape a parser here does not
 * understand yields no names from that file, and the checker then answers
 * `unverifiable` naming the file, which is the conservative rule again.
 *
 * - `package.json`, every key of the four dependency objects.
 * - `go.mod`, the module path on a `require` line or inside a `require` block.
 * - `Cargo.toml`, the keys under `[dependencies]` and its two siblings.
 * - `Package.swift`, the string after `.package(url:`.
 * - `requirements.txt`, the name before any version marker.
 *
 * ## Which end of the promise this checker reads
 *
 * A dependency is written as a component with provenance `package`, and its
 * `name` is what is looked for. So a promise reading "the editor may depend on
 * monaco-editor" is judged by asking whether the manifest declares
 * `monaco-editor`, and a promise reading "nothing may depend on ajv" is judged
 * by asking whether it does not.
 */

import { ARCH_LIMITS } from '@shared/arch';
import type {
  ArchCheckerResult,
  ArchCheckerVerdict,
  ArchFactBase,
  ArchManifestFacts
} from './facts';

/** The manifest files this build reads, by their base name. */
export const ARCH_MANIFEST_FILES: readonly string[] = [
  'package.json',
  'go.mod',
  'Cargo.toml',
  'Package.swift',
  'requirements.txt'
];

/** Read one manifest's declared names. An unreadable file yields nothing at all. */
export function parseManifest(fileName: string, text: string): string[] {
  try {
    if (fileName === 'package.json') return parsePackageJson(text);
    if (fileName === 'go.mod') return parseGoMod(text);
    if (fileName === 'Cargo.toml') return parseCargoToml(text);
    if (fileName === 'Package.swift') return parsePackageSwift(text);
    if (fileName === 'requirements.txt') return parseRequirements(text);
  } catch {
    return [];
  }
  return [];
}

function parsePackageJson(text: string): string[] {
  const parsed = JSON.parse(text) as Record<string, unknown>;
  const out: string[] = [];
  for (const key of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies'
  ]) {
    const block = parsed[key];
    if (typeof block === 'object' && block !== null && !Array.isArray(block)) {
      out.push(...Object.keys(block as Record<string, unknown>));
    }
  }
  return out;
}

function parseGoMod(text: string): string[] {
  const out: string[] = [];
  let inBlock = false;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    if (line.length === 0) continue;
    if (/^require\s*\($/.test(line)) {
      inBlock = true;
      continue;
    }
    if (inBlock && line === ')') {
      inBlock = false;
      continue;
    }
    const single = /^require\s+(\S+)/.exec(line);
    if (single?.[1] !== undefined) {
      out.push(single[1]);
      continue;
    }
    if (inBlock) {
      const first = line.split(/\s+/)[0];
      if (first !== undefined && first.length > 0) out.push(first);
    }
  }
  return out;
}

function parseCargoToml(text: string): string[] {
  const out: string[] = [];
  let inDeps = false;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (line.startsWith('[')) {
      inDeps = /^\[(dependencies|dev-dependencies|build-dependencies)\]$/.test(line);
      continue;
    }
    if (!inDeps || line.length === 0) continue;
    const name = /^([A-Za-z0-9_.-]+)\s*=/.exec(line);
    if (name?.[1] !== undefined) out.push(name[1]);
  }
  return out;
}

function parsePackageSwift(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/\.package\s*\(\s*url:\s*"([^"]+)"/g)) {
    const url = match[1] ?? '';
    const last = url.split('/').pop() ?? '';
    out.push(last.replace(/\.git$/, ''));
  }
  return out;
}

function parseRequirements(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (line.length === 0 || line.startsWith('-')) continue;
    const name = /^([A-Za-z0-9_.-]+)/.exec(line);
    if (name?.[1] !== undefined) out.push(name[1]);
  }
  return out;
}

/** Fold every manifest read into the one set the checker asks. */
export function collectManifestFacts(
  files: readonly { path: string; text: string }[]
): ArchManifestFacts {
  const names = new Set<string>();
  const filesRead: string[] = [];
  for (const file of files) {
    const base = file.path.split('/').pop() ?? '';
    if (!ARCH_MANIFEST_FILES.includes(base)) continue;
    filesRead.push(file.path);
    for (const name of parseManifest(base, file.text)) names.add(name.toLowerCase());
  }
  return { names, filesRead: filesRead.sort() };
}

/**
 * Run the manifest checker.
 *
 * A promise whose far end is not a `package` component is not this checker's
 * business, and it says so rather than guessing. That is a real case: a person
 * can write `checker: "manifest"` on an edge between two of their own parts,
 * and the honest answer is that this checker has nothing to read.
 */
export function checkManifest(facts: ArchFactBase): ArchCheckerResult {
  const started = Date.now();
  const verdicts: ArchCheckerVerdict[] = [];
  const byId = new Map(facts.components.map((c) => [c.id, c]));

  for (const edge of facts.edges) {
    if (edge.checker !== 'manifest') continue;
    const subjectId = `edge:${edge.id}`;
    const target = byId.get(edge.to);
    if (target === undefined || target.provenance !== 'package') {
      verdicts.push({
        subjectId,
        status: 'unverifiable',
        coverage: 'unverifiable',
        reason:
          `This promise is checked against the dependency files, and its far ` +
          `end is not a package. Point it at a component whose provenance is ` +
          `package, or change the checker.`
      });
      continue;
    }
    if (facts.manifest.filesRead.length === 0) {
      verdicts.push({
        subjectId,
        status: 'unverifiable',
        coverage: 'unverifiable',
        reason:
          `No dependency file was found in this repository, so there is ` +
          `nothing to read this promise against. Tortie reads ` +
          `${ARCH_MANIFEST_FILES.join(', ')}.`
      });
      continue;
    }
    const declared = facts.manifest.names.has(target.name.toLowerCase());
    if (edge.rule === 'must-not') {
      verdicts.push(
        declared
          ? {
              subjectId,
              status: 'divergent',
              coverage: 'checked',
              reason:
                `${target.name} is declared in ` +
                `${facts.manifest.filesRead.join(', ')}, and this contract ` +
                `says nothing may depend on it.`
            }
          : { subjectId, status: 'convergent', coverage: 'checked', reason: null }
      );
      continue;
    }
    if (edge.rule === 'may') {
      verdicts.push({
        subjectId,
        status: 'convergent',
        coverage: 'checked',
        reason: 'This promise permits rather than requires, so nothing can break it.'
      });
      continue;
    }
    verdicts.push(
      declared
        ? { subjectId, status: 'convergent', coverage: 'checked', reason: null }
        : {
            subjectId,
            status: 'absent',
            coverage: 'checked',
            reason:
              `${target.name} is not declared in ` +
              `${facts.manifest.filesRead.join(', ')}, and this contract says ` +
              `it should be.`
          }
    );
  }

  // A `package` component with no promise pointing at it is still worth one
  // row, because the whole reason provenance is first class is that a person
  // wants to see what they did not write.
  //
  // One exception, and it is not a nicety. A package a `must-not` promise
  // already judges is a package the contract says should NOT be declared, so
  // reporting its absence a second time as a break would count a kept promise
  // as a broken one.
  const refused = new Set(
    facts.edges.filter((e) => e.rule === 'must-not').map((e) => e.to)
  );
  for (const component of facts.components) {
    if (component.provenance !== 'package') continue;
    if (refused.has(component.id)) continue;
    if (component.name.length > ARCH_LIMITS.maxName) continue;
    const declared = facts.manifest.names.has(component.name.toLowerCase());
    verdicts.push(
      declared
        ? {
            subjectId: `component:${component.id}#manifest`,
            status: 'convergent',
            coverage: 'checked',
            reason: null
          }
        : {
            subjectId: `component:${component.id}#manifest`,
            status: 'absent',
            coverage: 'checked',
            reason:
              `${component.name} is drawn as a package and no dependency file ` +
              `declares it. It may have been removed, or the name here may ` +
              `not be the name the manifest uses.`
          }
    );
  }

  return { checker: 'manifest', verdicts, durationMs: Date.now() - started };
}
