/**
 * assert-agent-skills.cjs — prove the first-party `tortie` skill is in the
 * packed .app exactly as the source tree holds it.
 *
 * Phase 359. The launch pair points Claude Code, Pi and omp at
 * `Contents/Resources/agent-skills/tortie`; a package that omitted it would
 * hand every enabled launch a flag that points at nothing, and the failure
 * is invisible until a person asks an agent to use it — the same class of
 * defect `build/assert-skills-cli.cjs` records for the Context sidebar.
 * So this runs from `afterPack`, before the bundle is sealed, and it THROWS.
 *
 * Checks:
 *
 *  1. The exact five-file allowlist exists at the resolver's path, with no
 *     extra file, no symlink and no executable bit. An extra entry is as red
 *     as a missing one: the bundle is data, and a file nobody asked for is a
 *     refusal violation, not slack.
 *  2. Each packed file is byte-identical to the source file it answers.
 *  3. Both plugin manifests parse and carry exactly `name`, `version` and
 *     `description` — the three keys the whole resource is allowed — with
 *     the exact values the launch protocols were measured against. No
 *     hooks, MCP servers, commands, scripts, executable paths, URLs or
 *     contribution registries, in any spelling; anything that could name
 *     one reads red.
 */

const { lstatSync, readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { join } = require('node:path');

const RESOURCE_DIR = 'agent-skills/tortie';

/** The exact five files, relative to the resource root. Nothing else. */
const EXPECTED_FILES = [
  '.claude-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  'skills/tortie/SKILL.md',
  'skills/tortie/references/use-tortie.md',
  'skills/tortie/references/limits.md'
];

/** The whole resource manifest shape, key for key. */
const MANIFEST_FILES = [
  '.claude-plugin/plugin.json',
  '.cursor-plugin/plugin.json'
];

/** Manifest values the launch protocols were measured against. */
const MANIFEST_NAME = 'tortie-agent-access';
const MANIFEST_VERSION = '1.0.0';
/** Exactly one sentence about the door's rows, from the charter. */
const MANIFEST_DESCRIPTION =
  'Lets Tortie sessions ask this Tortie about their own session, the session list, and opening a validated project file.';

/** Words that must never appear as a key in a plugin manifest. */
const PROHIBITED_MANIFEST_KEYS = [
  'hooks',
  'mcpServers',
  'mcp_servers',
  'mcp',
  'commands',
  'scripts',
  'command',
  'entrypoint',
  'entryPoint',
  'main',
  'bin',
  'executable',
  'url',
  'homepage',
  'repository',
  'activationEvents',
  'contributes',
  'contributionPoints',
  'capabilities',
  'permissions',
  'server',
  'servers',
  'lifecycle',
  'preload',
  'background'
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Fail the pack when the bundled skill is absent, partial, polluted, or
 * unreadable. Mirrors the other `assert*` helpers: it throws with the path,
 * the expectation, and the repair.
 */
function assertAgentSkills(context) {
  const appName = context.packager.appInfo.productFilename;
  const resources = join(
    context.appOutDir,
    `${appName}.app`,
    'Contents',
    'Resources'
  );
  const root = join(resources, RESOURCE_DIR);
  const sourceRoot =
    context.packager.projectDir !== undefined
      ? join(context.packager.projectDir, 'resources', 'agent-skills', 'tortie')
      : null;

  for (const rel of EXPECTED_FILES) {
    const packed = join(root, rel);
    let stat;
    try {
      stat = lstatSync(packed);
    } catch {
      throw new Error(
        `the packed app has no agent skill at ${packed}.\n` +
          `  Contents/Resources/${RESOURCE_DIR} is ${RESOURCE_DIR}.\n` +
          `  This is the electron-builder extraResources entry ` +
          '`from: resources/agent-skills/tortie`. Without it every enabled ' +
          'launch hands Claude Code, Pi or omp a flag that points at nothing.'
      );
    }
    if (stat.isSymbolicLink()) {
      throw new Error(
        `the packed agent skill ${rel} is a symlink: first-party resources ` +
          `are data, never a link out of the bundle.`
      );
    }
    if (!stat.isFile()) {
      throw new Error(
        `the packed agent skill ${rel} is not a regular file.`
      );
    }
    // No executable bit anywhere in the mode: nothing in the bundle runs.
    if ((stat.mode & 0o111) !== 0) {
      throw new Error(
        `the packed agent skill ${rel} is executable (mode ` +
          `${(stat.mode & 0o777).toString(8)}): the skill declares no hook, ` +
          `no server and no command, so no file in it may execute.`
      );
    }
    if (sourceRoot === null) continue;
    const source = join(sourceRoot, rel);
    let a;
    let b;
    try {
      a = readFileSync(packed);
    } catch {
      throw new Error(`the packed agent skill ${rel} cannot be read.`);
    }
    try {
      b = readFileSync(source);
    } catch {
      throw new Error(
        `the source agent skill ${rel} is missing from the checkout: the ` +
          `packaged byte-compare has nothing to compare against.`
      );
    }
    if (sha256(a) !== sha256(b)) {
      throw new Error(
        `the packed agent skill ${rel} differs from the source tree ` +
          `(sha256 ${sha256(a)} vs ${sha256(b)}).\n` +
          `  Rebuild the package from this tree rather than signing a stale bundle.`
      );
    }
  }

  // Both manifests parse, with exactly the three allowed keys.
  for (const rel of MANIFEST_FILES) {
    const bytes = readFileSync(join(root, rel));
    let manifest;
    try {
      manifest = JSON.parse(bytes.toString('utf8'));
    } catch {
      throw new Error(`the packed agent skill manifest ${rel} is not JSON.`);
    }
    if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
      throw new Error(
        `the packed agent skill manifest ${rel} is not an object.`
      );
    }
    const keys = Object.keys(manifest).sort();
    const wanted = ['description', 'name', 'version'];
    if (keys.join(',') !== wanted.join(',')) {
      throw new Error(
        `the packed agent skill manifest ${rel} must hold exactly ` +
          `${wanted.join(', ')} (found ${keys.join(', ') || 'nothing'}).`
      );
    }
    if (manifest['name'] !== MANIFEST_NAME) {
      throw new Error(
        `the packed agent skill manifest ${rel} names ${JSON.stringify(manifest['name'])}, ` +
          `expected ${JSON.stringify(MANIFEST_NAME)}.`
      );
    }
    if (manifest['version'] !== MANIFEST_VERSION) {
      throw new Error(
        `the packed agent skill manifest ${rel} versions ${JSON.stringify(manifest['version'])}, ` +
          `expected ${JSON.stringify(MANIFEST_VERSION)}.`
      );
    }
    if (manifest['description'] !== MANIFEST_DESCRIPTION) {
      throw new Error(
        `the packed agent skill manifest ${rel} describes itself differently ` +
          `than the measured fixture. The text is user-visible copy; move it ` +
          `with the source, never in a stale bundle.`
      );
    }
    for (const key of PROHIBITED_MANIFEST_KEYS) {
      if (Object.hasOwn(manifest, key)) {
        throw new Error(
          `the packed agent skill manifest ${rel} carries ${JSON.stringify(key)}: ` +
            `the first-party skill declares no hook, MCP server, command, ` +
            `script, executable, URL or contribution registry.`
        );
      }
    }
  }
}

module.exports = { assertAgentSkills, RESOURCE_DIR, EXPECTED_FILES };
