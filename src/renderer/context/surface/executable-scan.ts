/**
 * The executable-content scan, said out loud (research 29 §3.7).
 *
 * A SKILL.md BODY can run shell commands, and it runs them before the model is
 * involved at all. Claude Code's own documentation says so: each `` !`command` ``
 * executes immediately, its output replaces the placeholder, and the model then
 * receives the rendered text. A fenced ```` ```! ```` block does the same for a
 * multi-line command. They run through the Bash tool with the user's full
 * permissions.
 *
 * So the dangerous part of a skill can be the prose. A reviewer skimming a
 * SKILL.md for intent reads straight past `` !`curl … | sh` ``. That is the
 * whole reason this scan exists and the reason its result is shown BEFORE the
 * install control rather than after it.
 *
 * WHERE THE SCAN RUNS. Main owns the scan for anything on disk, and its result
 * arrives on `ContextEntry.executes`. `scanSkillBody` here is for the one case
 * main cannot cover: preview mode holds a body that was fetched and never
 * written, and a card with a hole where the scan should be is the worst
 * possible state for this surface. It is a regular expression over a string. It
 * executes nothing and it makes no request.
 */

import type { ContextExecutable, ContextExecutableScan } from '../model';

/** `!` followed by a backtick, at a line start or after whitespace. */
const INLINE = /(^|\s)!`([^`]*)`/g;
/** A fence opened with `!` — the multi-line form. */
const FENCE_OPEN = /^\s*```!\s*$/;
const FENCE_ANY = /^\s*```/;

/**
 * Scan a body that is not on disk. Line numbers are 1-based so they can be
 * handed to the editor's open-at-line without arithmetic at the call site.
 *
 * The scan deliberately does NOT skip ordinary fenced code blocks. Whether a
 * placeholder inside a plain fence is expanded is not documented, and a scanner
 * that under-reports on a supply-chain surface is worse than one that reports a
 * line the reader then judges for themselves.
 */
export function scanSkillBody(body: string, path = ''): ContextExecutableScan {
  const findings: ContextExecutable[] = [];
  const lines = body.split('\n');

  let fenceLine = -1;
  let fenced: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';

    if (fenceLine >= 0) {
      if (FENCE_ANY.test(line)) {
        findings.push({
          kind: 'fenced-command',
          detail: fenced.join('\n').trim(),
          path,
          line: fenceLine + 1
        });
        fenceLine = -1;
        fenced = [];
      } else {
        fenced.push(line);
      }
      continue;
    }

    if (FENCE_OPEN.test(line)) {
      fenceLine = i;
      fenced = [];
      continue;
    }

    INLINE.lastIndex = 0;
    let m = INLINE.exec(line);
    while (m !== null) {
      findings.push({
        kind: 'inline-command',
        detail: (m[2] ?? '').trim(),
        path,
        line: i + 1
      });
      m = INLINE.exec(line);
    }
  }

  // An unterminated `!` fence still ran everything after it, so it counts.
  if (fenceLine >= 0) {
    findings.push({
      kind: 'fenced-command',
      detail: fenced.join('\n').trim(),
      path,
      line: fenceLine + 1
    });
  }

  return { findings, truncated: false, filesRead: 1 };
}

/**
 * The whole scan for something that is NOT on disk yet: the body's own
 * placeholders plus the files the source ships under `scripts/`.
 *
 * The two halves come from different reads and they are both findings. The
 * research found the payload in `scripts/` more often than in the markdown, so
 * a preview scan that only read the body would miss the common case and then
 * report "No executable content" about a skill that ships a shell script.
 *
 * `files` are paths relative to the skill's own directory, which is what the
 * source layer returns.
 */
export function scanPreview(
  body: string | null,
  files: readonly string[],
  path = ''
): ContextExecutableScan {
  const fromBody =
    body === null
      ? { findings: [] as ContextExecutable[], truncated: false, filesRead: 0 }
      : scanSkillBody(body, path);
  const scripts: ContextExecutable[] = files
    .filter((file) => file.startsWith('scripts/'))
    .map((file) => ({
      kind: 'bundled-script' as const,
      detail: file,
      path,
      line: null
    }));
  return {
    findings: [...fromBody.findings, ...scripts],
    truncated: fromBody.truncated,
    // A body that was never read leaves this at 0, which is what makes
    // `scanRan` false and the install a refusal rather than a pass.
    filesRead: fromBody.filesRead
  };
}

/** Commands the body will run before the model reads it. */
export function commandFindings(
  scan: ContextExecutableScan
): ContextExecutable[] {
  return scan.findings.filter(
    (f) => f.kind === 'inline-command' || f.kind === 'fenced-command'
  );
}

/** Files shipped under `scripts/`, which is where the research found payloads. */
export function scriptFindings(
  scan: ContextExecutableScan
): ContextExecutable[] {
  return scan.findings.filter((f) => f.kind === 'bundled-script');
}

export function hookFindings(scan: ContextExecutableScan): ContextExecutable[] {
  return scan.findings.filter((f) => f.kind === 'frontmatter-hook');
}

export function hasExecutableContent(
  scan: ContextExecutableScan | null
): boolean {
  return scan !== null && scan.findings.length > 0;
}

/**
 * `filesRead: 0` means the scan found nothing to READ, which is not the same as
 * finding nothing. The two must never render as the same sentence.
 */
export function scanRan(scan: ContextExecutableScan | null): boolean {
  return scan !== null && scan.filesRead > 0;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? `1 ${one}` : `${n} ${many}`;
}

/**
 * The "What runs" line, in the user's words. Four shapes, and the last two are
 * the pair that must never collapse into one:
 *
 *   "Runs 2 shell commands when invoked. Ships 3 files under scripts/."
 *   "Declares 1 hook of its own."
 *   "No executable content."
 *   "Tortie has not read this one yet."
 */
export function whatRunsSentence(scan: ContextExecutableScan | null): string {
  if (!scanRan(scan) || scan === null)
    return 'Tortie has not read this one yet.';

  const parts: string[] = [];
  const commands = commandFindings(scan).length;
  const scripts = scriptFindings(scan).length;
  const hooks = hookFindings(scan).length;

  if (commands > 0) {
    parts.push(
      `Runs ${plural(commands, 'shell command', 'shell commands')} when invoked.`
    );
  }
  if (scripts > 0)
    parts.push(`Ships ${plural(scripts, 'file', 'files')} under scripts/.`);
  if (hooks > 0)
    parts.push(`Declares ${plural(hooks, 'hook', 'hooks')} of its own.`);

  if (parts.length === 0) return 'No executable content.';
  if (scan.truncated)
    parts.push('The scan stopped early, so there may be more.');
  return parts.join(' ');
}

/**
 * The clause the confirm repeats, because the incident data says the body is
 * where the payload hides. Reads as the tail of "Skills run inside your agents.
 * This one …".
 */
export function executableClause(
  scan: ContextExecutableScan | null
): string | null {
  if (!scanRan(scan) || scan === null) return null;
  const commands = commandFindings(scan).length;
  const scripts = scriptFindings(scan).length;

  const said: string[] = [];
  if (scripts > 0) said.push(`ships ${plural(scripts, 'script', 'scripts')}`);
  if (commands > 0) {
    said.push(`runs ${plural(commands, 'shell command', 'shell commands')}`);
  }
  if (said.length === 0) return null;
  return `${said.join(' and ')} with your permissions`;
}
