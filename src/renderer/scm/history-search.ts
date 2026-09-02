/**
 * The History section's search field (Phase 199): what the typed text
 * means, and nothing about how it is drawn. This half stays free of React
 * and of `window`, which is what lets the same module run under node in
 * `npm run conformance:historysearch` and in the unit tests.
 *
 * WHAT A QUERY IS. Bare text searches messages. Five operators, borrowed
 * from GitLens as vocabulary rather than as a parser, name the other four
 * things a person remembers about a commit, and the one that costs seconds:
 *
 *   author:<name>     who wrote it            --author=
 *   message:<text>    what it says            --grep=
 *   commit:<name>     one commit by name      rev-parse, one row
 *   file:<path>       what it touched         -- :(literal)<path>
 *   change:<text>     what it added or took   -S, from the button only
 *
 * A value runs to the next space, or is quoted to hold spaces. Bare words
 * join into one phrase. A bare word that is only hex, four to forty of it
 * and nothing else typed, is a commit first and a message if no commit
 * answers to it, which is what a pasted sha wants. An operator with nothing
 * after it contributes nothing, so a query that is only an operator is the
 * plain walk. Line breaks fold to a space here as well as in main, so the
 * argv the service composes and the text a person sees agree.
 *
 * Nothing here touches a shell, and no value is ever split by this module
 * into more than one thing: every field is one string, and the service
 * hands each one to git as one argv element.
 */

import type { GitHistorySearch } from '@shared/types';

export interface HistoryQuery {
  /** Bare words and `message:` values, joined by one space. Empty for none. */
  message: string;
  author: string;
  commit: string;
  /**
   * The commit came from a bare hex word rather than `commit:`. When no
   * commit answers to it, the same word is searched as a message instead.
   */
  commitIsBare: boolean;
  file: string;
  /** Runs from the button, never from a keystroke. */
  change: string;
}

export const EMPTY_QUERY: HistoryQuery = {
  message: '',
  author: '',
  commit: '',
  commitIsBare: false,
  file: '',
  change: ''
};

/**
 * How long the field waits after a keystroke before it walks. Measured in the
 * running app over the gmux copy (741 commits, commit graph present): a
 * keystroke's whole round trip, being the walk plus graphLog's own Round A,
 * lands in 40 to 90 ms, and the measure agent's raw walks on git's 82,130
 * commits read 22 to 41 ms with `--topo-order` dropped. 150 ms is the
 * smallest round figure that lets one walk finish between keystrokes at an
 * ordinary typing pace and still folds a burst into one walk; the queue on
 * the main side ends whatever a burst still starts.
 */
export const SEARCH_DEBOUNCE_MS = 150;

const OPERATOR_RE = /^(author|message|commit|file|change):/i;
const BARE_SHA_RE = /^[0-9a-f]{4,40}$/i;

type Operator = 'author' | 'message' | 'commit' | 'file' | 'change';

/** One token: an operator with its value, or a bare word. */
interface Token {
  op: Operator | null;
  value: string;
}

/**
 * Read one value starting at `i`: a quoted run up to the closing quote, or
 * to the end when none closes it, else a run up to the next space.
 */
function readValue(text: string, i: number): { value: string; next: number } {
  if (text[i] === '"') {
    const close = text.indexOf('"', i + 1);
    if (close === -1) return { value: text.slice(i + 1), next: text.length };
    return { value: text.slice(i + 1, close), next: close + 1 };
  }
  let j = i;
  while (j < text.length && text[j] !== ' ') j++;
  return { value: text.slice(i, j), next: j };
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === ' ') {
      i++;
      continue;
    }
    const m = OPERATOR_RE.exec(text.slice(i));
    if (m !== null) {
      const op = (m[1] ?? '').toLowerCase() as Operator;
      const { value, next } = readValue(text, i + m[0].length);
      tokens.push({ op, value });
      i = next;
      continue;
    }
    const { value, next } = readValue(text, i);
    tokens.push({ op: null, value });
    i = next;
  }
  return tokens;
}

/** The typed text as a query. Never throws; unknown shapes are message text. */
export function parseHistoryQuery(text: string): HistoryQuery {
  const folded = text.replace(/[\r\n]+/g, ' ');
  const q: HistoryQuery = { ...EMPTY_QUERY };
  const words: string[] = [];
  let bareCount = 0;
  let operatorCount = 0;
  for (const t of tokenize(folded)) {
    const value = t.value.trim();
    if (t.op === null) {
      if (value.length === 0) continue;
      bareCount++;
      words.push(value);
      continue;
    }
    operatorCount++;
    if (value.length === 0) continue;
    if (t.op === 'message') words.push(value);
    else q[t.op] = value;
  }
  q.message = words.join(' ');
  // A pasted sha, alone: try it as a commit before searching it as a word.
  if (
    bareCount === 1 &&
    operatorCount === 0 &&
    words.length === 1 &&
    BARE_SHA_RE.test(words[0] ?? '')
  ) {
    q.commit = words[0] ?? '';
    q.commitIsBare = true;
    q.message = '';
  }
  return q;
}

export function isEmptyQuery(q: HistoryQuery): boolean {
  return (
    q.message === '' &&
    q.author === '' &&
    q.commit === '' &&
    q.file === '' &&
    q.change === ''
  );
}

export function sameQuery(a: HistoryQuery, b: HistoryQuery): boolean {
  return (
    a.message === b.message &&
    a.author === b.author &&
    a.commit === b.commit &&
    a.commitIsBare === b.commitIsBare &&
    a.file === b.file &&
    a.change === b.change
  );
}

/** The same query with the slow half taken out: what a keystroke may run. */
export function withoutChange(q: HistoryQuery): HistoryQuery {
  return q.change === '' ? q : { ...q, change: '' };
}

/** The bare sha nothing answered to, searched as a word instead. */
export function bareCommitAsMessage(q: HistoryQuery): HistoryQuery {
  return { ...q, commit: '', commitIsBare: false, message: q.commit };
}

/**
 * The wire shape for `git:graphLog`, or undefined for the plain walk. Each
 * field is the one string the person typed for it; the service composes one
 * argv element from each.
 */
export function toSearch(q: HistoryQuery): GitHistorySearch | undefined {
  if (isEmptyQuery(q)) return undefined;
  const s: GitHistorySearch = {};
  if (q.message !== '') s.message = q.message;
  if (q.author !== '') s.author = q.author;
  if (q.commit !== '') s.commit = q.commit;
  if (q.file !== '') s.path = q.file;
  if (q.change !== '') s.change = q.change;
  return s;
}
