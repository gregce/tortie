/**
 * What runs when a skill loads, found by reading and never by running.
 *
 * The reason this is a first-class field rather than metadata: a `SKILL.md`
 * BODY can carry `` !`command` `` placeholders, and Claude Code's own
 * documentation says each one "executes immediately (before Claude sees
 * anything)". So the dangerous part of a skill can be the markdown, and a
 * reviewer skimming prose for intent reads straight past
 * `` !`curl … | sh` ``. Separately, the CSA and arXiv work found payloads
 * hidden in `scripts/` rather than in the body, which is why
 * "Bundles: scripts/ (4 files)" is a line the user sees rather than a count in
 * a tooltip.
 *
 * Two rules bind this file:
 *  1. **Nothing here executes anything, and nothing here touches the network.**
 *     It is a regex over text and a directory listing.
 *  2. **It runs and is shown BEFORE the install control, never after.** That is
 *     an operator requirement for Phase 22, and it is why this function is
 *     exported for a candidate directory as well as for an installed one:
 *     the install path scans a downloaded skill with the same code that scans
 *     one already on disk, so the two can never disagree.
 */

import { join, relative } from 'node:path';
import type { ContextExecutable, ContextExecutableScan } from '@shared/context';
import type { ContextFs } from './port';

/** Bounded so a pathological skill cannot stall a scan. */
const LIMITS = {
  maxFindings: 200,
  maxScriptFiles: 200,
  maxScriptDepth: 4,
  maxBodyBytes: 512 * 1024,
  maxCommandChars: 400
} as const;

/**
 * `` !`cmd` `` at the start of a line or after whitespace. The leading
 * character is captured so the match position can be corrected, because
 * JavaScript has no lookbehind guarantee across every runtime this ships on.
 */
const INLINE_COMMAND = /(^|\s)!`([^`\n]+)`/g;

/** A fenced ```! block: the multi-line form of the same thing. */
const FENCED_COMMAND = /^[ \t]*```!\s*\n([\s\S]*?)^[ \t]*```[ \t]*$/gm;

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) if (text[i] === '\n') line += 1;
  return line;
}

function clamp(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > LIMITS.maxCommandChars ? `${flat.slice(0, LIMITS.maxCommandChars)}…` : flat;
}

/**
 * Scan a skill body for the two injected-command forms. `bodyStartLine` is
 * where the body begins in the file, so a finding cites the file's own line
 * number rather than an offset into a substring.
 */
export function scanBodyCommands(
  body: string,
  path: string,
  bodyStartLine: number
): ContextExecutable[] {
  const findings: ContextExecutable[] = [];
  const text = body.length > LIMITS.maxBodyBytes ? body.slice(0, LIMITS.maxBodyBytes) : body;

  INLINE_COMMAND.lastIndex = 0;
  for (
    let match = INLINE_COMMAND.exec(text);
    match && findings.length < LIMITS.maxFindings;
    match = INLINE_COMMAND.exec(text)
  ) {
    const command = match[2];
    if (!command) continue;
    findings.push({
      kind: 'inline-command',
      detail: clamp(command),
      path,
      line: bodyStartLine + lineOf(text, match.index) - 1
    });
  }

  FENCED_COMMAND.lastIndex = 0;
  for (
    let match = FENCED_COMMAND.exec(text);
    match && findings.length < LIMITS.maxFindings;
    match = FENCED_COMMAND.exec(text)
  ) {
    const block = match[1];
    if (!block) continue;
    findings.push({
      kind: 'fenced-command',
      detail: clamp(block),
      path,
      line: bodyStartLine + lineOf(text, match.index) - 1
    });
  }

  return findings.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
}

/** Every file under `scripts/`, listed and never opened. */
async function listScripts(
  fs: ContextFs,
  skillDir: string
): Promise<{ findings: ContextExecutable[]; truncated: boolean }> {
  const root = join(skillDir, 'scripts');
  const findings: ContextExecutable[] = [];
  let truncated = false;
  const queue: { dir: string; depth: number }[] = [{ dir: root, depth: 0 }];
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    if (next.depth > LIMITS.maxScriptDepth) {
      truncated = true;
      continue;
    }
    const entries = await fs.readDir(next.dir);
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const path = join(next.dir, entry.name);
      if (entry.isDirectory) {
        queue.push({ dir: path, depth: next.depth + 1 });
        continue;
      }
      if (findings.length >= LIMITS.maxScriptFiles) {
        truncated = true;
        continue;
      }
      findings.push({
        kind: 'bundled-script',
        detail: relative(skillDir, path),
        path,
        line: null
      });
    }
  }
  findings.sort((a, b) => a.detail.localeCompare(b.detail));
  return { findings, truncated };
}

export interface ExecutableScanInput {
  /** The skill's own directory. `scripts/` is looked for directly under it. */
  skillDir: string;
  /** The `SKILL.md` body, already separated from its frontmatter. */
  body: string;
  /** Absolute path of the file the body came from. */
  bodyPath: string;
  /** 1-based line in `bodyPath` where the body starts. */
  bodyStartLine: number;
  /** Hook events declared in the skill's own frontmatter, if any. */
  frontmatterHooks?: readonly string[];
}

/**
 * The whole scan for one skill. Costs one regex pass over the body and one
 * listing of `scripts/`, and answers "what will run" rather than "might
 * something run".
 */
export async function scanExecutableContent(
  fs: ContextFs,
  input: ExecutableScanInput
): Promise<ContextExecutableScan> {
  const body = scanBodyCommands(input.body, input.bodyPath, input.bodyStartLine);
  const scripts = await listScripts(fs, input.skillDir);
  const hooks: ContextExecutable[] = (input.frontmatterHooks ?? []).map((event) => ({
    kind: 'frontmatter-hook' as const,
    detail: event,
    path: input.bodyPath,
    line: null
  }));
  const findings = [...body, ...hooks, ...scripts.findings].slice(0, LIMITS.maxFindings);
  return {
    findings,
    truncated:
      scripts.truncated ||
      body.length + hooks.length + scripts.findings.length > LIMITS.maxFindings ||
      input.body.length > LIMITS.maxBodyBytes,
    filesRead: 1
  };
}

/**
 * One plain sentence for a scan result, for the line that sits above an
 * install control. Empty findings get a sentence too, because "nothing was
 * found" and "nothing was checked" must not look the same.
 */
export function executableSummary(scan: ContextExecutableScan | null): string {
  if (!scan) return 'Tortie has not checked this one for anything that runs.';
  const commands = scan.findings.filter(
    (finding) => finding.kind === 'inline-command' || finding.kind === 'fenced-command'
  ).length;
  const scripts = scan.findings.filter((finding) => finding.kind === 'bundled-script').length;
  const hooks = scan.findings.filter((finding) => finding.kind === 'frontmatter-hook').length;
  const parts: string[] = [];
  if (commands > 0) {
    parts.push(
      commands === 1
        ? 'Runs 1 shell command when it loads, before the model sees the file.'
        : `Runs ${commands} shell commands when it loads, before the model sees the file.`
    );
  }
  if (scripts > 0) {
    parts.push(scripts === 1 ? 'Bundles 1 script.' : `Bundles ${scripts} scripts.`);
  }
  if (hooks > 0) {
    parts.push(hooks === 1 ? 'Declares 1 hook of its own.' : `Declares ${hooks} hooks of its own.`);
  }
  if (parts.length === 0) return 'Tortie found no commands and no bundled scripts in this one.';
  return parts.join(' ');
}
