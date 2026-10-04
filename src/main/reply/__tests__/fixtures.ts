/**
 * The committed screens of Phase 318 (build/fixtures/reply/, build/p318/SPEC.md
 * §7.3), read the one way every test here reads them.
 *
 * Line 1 of every file names its source and is dropped. A `.txt` is
 * `capture-pane -p`; a `.ansi` is `capture-pane -p -e` with ESC, every other
 * byte below 0x20 but LF, and each trailing space written `\xNN`, and a
 * backslash written `\\`, decoded here with the capture step's own pattern.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
export const REPLY_FIXTURES = join(REPO, 'build', 'fixtures', 'reply');
export const ACTIVITY_FIXTURES = join(REPO, 'src', 'main', 'activity', '__tests__', 'fixtures');

/** A file's body, its first (source) line dropped. */
function bodyOf(path: string): string {
  const text = readFileSync(path, 'utf8');
  return text.slice(text.indexOf('\n') + 1);
}

/** A `.txt` screen of build/fixtures/reply. */
export function plainFixture(name: string): string {
  return bodyOf(join(REPLY_FIXTURES, name));
}

/** A `.ansi` screen of build/fixtures/reply, decoded to the bytes tmux printed. */
export function styledFixture(name: string): string {
  return bodyOf(join(REPLY_FIXTURES, name)).replace(/\\(\\|x[0-9a-f]{2})/g, (_m, g: string) =>
    g === '\\' ? '\\' : String.fromCharCode(parseInt(g.slice(1), 16))
  );
}

/** A committed screen of src/main/activity/__tests__/fixtures (no source line). */
export function activityFixture(name: string): string {
  return readFileSync(join(ACTIVITY_FIXTURES, name), 'utf8');
}

/** One row of real-captures.json. */
export interface RealCapture {
  files: string[];
  kind: 'press' | 'prompt';
  agent: 'Claude Code' | 'Codex';
  version: string;
  cursor: { x: number; y: number; visible: boolean };
  title: string;
  truth: { command?: string; typed?: string };
}

/** Every real capture, as the capture step recorded it. */
export function realCaptures(): RealCapture[] {
  const manifest = JSON.parse(readFileSync(join(REPLY_FIXTURES, 'real-captures.json'), 'utf8')) as {
    fixtures: RealCapture[];
  };
  return manifest.fixtures;
}

/** The four real `PermissionRequest` bodies, in the order of the claude-bash-*.txt screens. */
export function hookBodies(): string[] {
  const file = JSON.parse(
    readFileSync(join(REPLY_FIXTURES, 'claude-permission-requests-2.1.287.json'), 'utf8')
  ) as { bodies: unknown[] };
  return file.bodies.map((body) => JSON.stringify(body));
}

/** The claude-bash-*.txt screen each hook body belongs to, in order. */
export const CLAUDE_BASH_SCREENS = [
  'claude-bash-2.1.287.txt',
  'claude-bash-multiline-2.1.287.txt',
  'claude-bash-long-2.1.287.txt',
  'claude-bash-blank-line-2.1.287.txt'
] as const;

/** A window of build/fixtures/questions/*.jsonl, by id, its rows joined as a screen. */
export function questionWindow(file: string, id: string): string {
  const lines = readFileSync(join(REPO, 'build', 'fixtures', 'questions', file), 'utf8').split('\n');
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    const row = JSON.parse(line) as { id?: string; rows?: string[] };
    if (row.id === id) return (row.rows ?? []).join('\n');
  }
  throw new Error(`no window ${id} in ${file}`);
}
