/**
 * The path index extractor, section 6.5 of the Phase 137 spec.
 *
 * At parse time the reader keeps the distinct path shaped strings each turn
 * named, from tool calls and from the text of asks, answers and shell
 * commands, and throws the payload away. On the operator's own driving
 * session that is 218 paths at 8.0 KB against 2.13 MB of payload. The git
 * mark and the store read this list and never the tool output behind it.
 */

import { relative, resolve, sep } from 'node:path';

export interface PathMention {
  /** Project relative when inside, absolute when outside. */
  path: string;
  mentions: number;
  source: 'command' | 'tool' | 'text';
  inside: boolean;
}

/** A token with none of these still names a file the git mark can check. */
const PATH_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.css', '.py', '.go',
  '.rs', '.sh', '.yml', '.yaml', '.toml', '.txt', '.html', '.sql', '.swift',
  '.rb', '.java', '.kt', '.c', '.h', '.cpp'
];

const LEAD_STRIP = new Set(['(', '[', "'", '"', '`']);
const TRAIL_STRIP = new Set(['.', ',', ';', ':', ')', ']', "'", '"', '`']);

const MAX_TOKEN = 300;
const MAX_PATHS_PER_TURN = 200;

function stripToken(raw: string): string {
  let a = 0;
  let b = raw.length;
  while (a < b && LEAD_STRIP.has(raw[a] as string)) a++;
  while (b > a && TRAIL_STRIP.has(raw[b - 1] as string)) b--;
  return raw.slice(a, b);
}

function hasPathExtension(token: string): boolean {
  const lower = token.toLowerCase();
  return PATH_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function normalizeRoot(p: string): string {
  return p.length > 1 && p.endsWith(sep) ? p.slice(0, -1) : p;
}

function isUnder(child: string, root: string): boolean {
  return child === root || child.startsWith(root + sep);
}

/**
 * Scan free text for path shaped tokens. The rule set is mechanical, section
 * 6.5. A token qualifies when it holds a `/` or ends in a known source file
 * extension, holds no `://` and no `${`, is not a `--` flag, and is at most
 * 300 characters once wrapping punctuation is stripped. An absolute token
 * inside the project is recorded project relative. A relative token is
 * resolved against the cwd and dropped when it escapes the project.
 */
export function extractPathsFromText(
  text: string,
  cwd: string,
  projectPath: string,
  source: PathMention['source'] = 'text'
): PathMention[] {
  const root = normalizeRoot(projectPath);
  const found = new Map<string, PathMention>();
  if (!text) return [];
  for (const raw of text.split(/\s+/)) {
    if (raw === '') continue;
    const token = stripToken(raw);
    if (token === '' || token.length > MAX_TOKEN) continue;
    if (token.startsWith('--')) continue;
    if (token.includes('://') || token.includes('${')) continue;
    if (!token.includes('/') && !hasPathExtension(token)) continue;
    let recorded: string;
    let inside: boolean;
    if (token.startsWith('/')) {
      if (isUnder(token, root)) {
        recorded = token === root ? '.' : relative(root, token);
        inside = true;
      } else {
        recorded = token;
        inside = false;
      }
    } else {
      const abs = resolve(cwd, token);
      if (!isUnder(abs, root)) continue;
      recorded = abs === root ? '.' : relative(root, abs);
      inside = true;
    }
    if (recorded === '') continue;
    const prev = found.get(recorded);
    if (prev) prev.mentions++;
    else found.set(recorded, { path: recorded, mentions: 1, source, inside });
  }
  return capAndSort([...found.values()]);
}

/**
 * Merge per source lists into one per turn list. Mentions are summed and the
 * strongest source wins, a tool argument over a shell command over prose,
 * because a path a tool was pointed at is direct evidence and a path in a
 * sentence is only a mention. Sorted by mentions descending, capped at 200.
 */
const SOURCE_RANK: Record<PathMention['source'], number> = { tool: 2, command: 1, text: 0 };

export function mergePathMentions(lists: PathMention[][]): PathMention[] {
  const merged = new Map<string, PathMention>();
  for (const list of lists) {
    for (const m of list) {
      const prev = merged.get(m.path);
      if (prev) {
        prev.mentions += m.mentions;
        if (SOURCE_RANK[m.source] > SOURCE_RANK[prev.source]) prev.source = m.source;
      } else {
        merged.set(m.path, { ...m });
      }
    }
  }
  return capAndSort([...merged.values()]);
}

function capAndSort(list: PathMention[]): PathMention[] {
  return list.sort((a, b) => b.mentions - a.mentions).slice(0, MAX_PATHS_PER_TURN);
}
