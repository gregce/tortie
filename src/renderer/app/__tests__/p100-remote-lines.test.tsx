/**
 * Phase 100, the panel that reads the last lines of a session on another
 * machine.
 *
 * WHAT THIS FILE IS FOR. The panel decides which sentence a person reads, and
 * two of those sentences describe two different facts that must never be on
 * screen together. Phase 99 carried a cut through main and never drew it, so a
 * list that had been cut was drawn as if it were whole, and that is recorded as
 * Phase 99.1. The table below is what stops the same shape happening here.
 *
 * THE TWO FACTS.
 *
 *  1. TORTIE CUT THE ANSWER. `truncated` is true. The bytes that came back were
 *     over the ceiling main holds, so main kept the newest ones.
 *  2. THE SESSION HAS NO MORE. `lines` came back under `asked`, with `asked`
 *     above zero and nothing cut. The read reached the start of what that
 *     session has kept.
 *
 * HOW THIS RENDERS. `environment` is node and this repository carries no jsdom
 * and no @testing-library/react, so the panel is rendered with
 * `renderToStaticMarkup`, which is the shape ./p95-strip-note.test.tsx uses.
 * That is also why `RemoteLinesPanel` is pure over its props and
 * `RemoteLinesModal` is a store connected wrapper with no markup: zustand
 * answers a server render from the store's INITIAL state, so the wrapper cannot
 * be driven by a test that renders to static markup.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MachineSessionLinesResult } from '@shared/ipc';
import type { Session, SessionMachine } from '@shared/types';

/** Repository root, from this file's own location. */
const ROOT = resolve(import.meta.dirname, '../../../..');

/**
 * One read the store started and has not been answered yet.
 *
 * The reads are held rather than answered, so a test can decide the ORDER the
 * answers arrive in. That order is the whole point of the race the store has to
 * win, and a bridge that answers immediately can never produce it.
 */
interface PendingRead {
  input: { sessionId: string; lines: number };
  answer: (result: MachineSessionLinesResult) => void;
  fail: (err: unknown) => void;
}

const pending: PendingRead[] = [];

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the modules under test are ever imported.
vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  requestAnimationFrame: () => 0,
  matchMedia: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  }),
  gmux: {
    sessions: {
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve()
    },
    setSessionsPosition: () => Promise.resolve(),
    machines: {
      readSessionLines: (input: { sessionId: string; lines: number }) =>
        new Promise<MachineSessionLinesResult>((answer, fail) => {
          pending.push({ input, answer, fail });
        })
    }
  }
});
vi.stubGlobal('requestAnimationFrame', () => 0);
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { RemoteLinesDepths, RemoteLinesPanel, scrollToNewest, showsAllThere } =
  await import('../RemoteLinesModal');
// Two files, because the panel's own words are in machines/read-lines.ts and the
// instant it prints is composed by machines/session-restore.ts.
const copy = {
  ...(await import('../../machines/read-lines')),
  ...(await import('../../machines/session-restore'))
};
const { REMOTE_SESSION_LINE_DEPTHS, REMOTE_SESSION_LINES_BYTES_MAX } =
  await import('@shared/ipc');
const { formatScrollbackBytes } = await import('@shared/scrollback');
const { useApp } = await import('../../state/store');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function machine(over: Partial<SessionMachine> = {}): SessionMachine {
  return {
    id: 'p100m',
    label: 'Studio',
    color: 'magenta',
    answering: true,
    canRestore: false,
    restoreReason: null,
    ...over
  } as SessionMachine;
}

function session(over: Partial<Session> = {}): Session {
  return {
    id: 'p100s',
    name: 'api-refactor',
    tmuxName: 'api-refactor',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'running',
    createdAt: 1,
    machine: machine(),
    ...over
  } as Session;
}

function result(
  over: Partial<MachineSessionLinesResult> = {}
): MachineSessionLinesResult {
  return {
    sessionId: 'p100s',
    machineId: 'p100m',
    machineLabel: 'Studio',
    mode: 'read',
    text: 'the last thing it printed\n',
    asked: 1_000,
    lines: 1_000,
    bytes: 26,
    truncated: false,
    readAt: 1_755_000_000_000,
    elapsedMs: 120,
    ...over
  };
}

/** The panel's markup for one set of props. */
function panelHtml(
  over: {
    session?: Session | null;
    result?: MachineSessionLinesResult | null;
    loading?: boolean;
    failed?: boolean;
    depth?: number;
  } = {}
): string {
  return renderToStaticMarkup(
    <RemoteLinesPanel
      session={over.session === undefined ? session() : over.session}
      result={over.result === undefined ? result() : over.result}
      loading={over.loading ?? false}
      failed={over.failed ?? false}
      depth={over.depth ?? 1_000}
      read={() => undefined}
      close={() => undefined}
    />
  );
}

/** Markup with the entities React escapes put back, for a sentence compare. */
function readable(html: string): string {
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

// ---------------------------------------------------------------------------
// The read state
// ---------------------------------------------------------------------------

describe('the read state', () => {
  it('draws the title, the header, the not live line, the counts and the text', () => {
    const html = readable(panelHtml());
    expect(html).toContain(copy.readLinesTitle('api-refactor'));
    expect(html).toContain(
      copy.readLinesHeader('Studio', copy.savedWhen(1_755_000_000_000))
    );
    expect(html).toContain(copy.READ_LINES_NOT_LIVE);
    expect(html).toContain(copy.readLinesCount(1_000, 26));
    expect(html).toContain('the last thing it printed');
  });

  it('puts the text in a pre, so nothing in it can become markup', () => {
    const html = panelHtml({
      result: result({ text: '<script>alert(1)</script>\n' })
    });
    expect(html).toContain('remote-lines-body');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ---------------------------------------------------------------------------
// The cut, which is the Phase 99.1 rule
// ---------------------------------------------------------------------------

describe('the cut sentence', () => {
  it('is drawn whenever Tortie cut the answer', () => {
    const html = readable(
      panelHtml({ result: result({ truncated: true, lines: 4_000 }) })
    );
    expect(html).toContain(copy.READ_LINES_CUT);
  });

  it('is drawn for a cut answer at every depth the panel offers', () => {
    // The rule is about `truncated` and nothing else. A depth that happens to
    // be shallow must not hide it.
    for (const asked of REMOTE_SESSION_LINE_DEPTHS) {
      const html = readable(
        panelHtml({ result: result({ truncated: true, asked, lines: 12 }) })
      );
      expect([asked, html.includes(copy.READ_LINES_CUT)]).toEqual([asked, true]);
    }
  });

  it('is never drawn when nothing was cut', () => {
    const html = readable(panelHtml({ result: result({ truncated: false }) }));
    expect(html).not.toContain(copy.READ_LINES_CUT);
  });

  it('names the ceiling main cuts at, so the two sizes cannot be read as one', () => {
    // THE PAIRING IS THE DEFECT THIS GUARDS. The counts sentence states the
    // size of the text on screen, which has had the escape sequences removed,
    // and the cut was applied to the bytes before that. A cut answer of
    // 1.5 MB under a ceiling of 8.0 MB read as one claim that contradicts
    // itself, so the cut sentence states the ceiling as a number and says why
    // the size above it is smaller.
    const ceiling = formatScrollbackBytes(REMOTE_SESSION_LINES_BYTES_MAX);
    expect(ceiling).toBe('8.0 MB');
    expect(copy.READ_LINES_CUT).toContain(ceiling);
    expect(copy.READ_LINES_CUT).toContain('smaller');

    // Both sentences are on screen together for a cut answer, so the panel is
    // rendered and read rather than the constants being read on their own.
    const html = readable(
      panelHtml({ result: result({ truncated: true, lines: 8_552, bytes: 1_572_864 }) })
    );
    expect(html).toContain(copy.readLinesCount(8_552, 1_572_864));
    expect(html).toContain(ceiling);
  });
});

describe('the all there sentence', () => {
  it('is drawn when the session has kept less than was asked for', () => {
    const html = readable(
      panelHtml({ result: result({ asked: 1_000, lines: 220 }) })
    );
    expect(html).toContain(copy.READ_LINES_ALL_THERE);
  });

  it('is never drawn for the screen alone', () => {
    // `asked` is 0 there, so "everything this session has kept" would be a
    // claim about nothing.
    const html = readable(
      panelHtml({ result: result({ asked: 0, lines: 40 }), depth: 0 })
    );
    expect(html).not.toContain(copy.READ_LINES_ALL_THERE);
  });

  it('is never drawn when the full depth came back', () => {
    const html = readable(
      panelHtml({ result: result({ asked: 1_000, lines: 1_000 }) })
    );
    expect(html).not.toContain(copy.READ_LINES_ALL_THERE);
  });
});

describe('the two sentences are never both on screen', () => {
  // One table, so a later change to either rule has to face both at once.
  const table: {
    name: string;
    over: Partial<MachineSessionLinesResult>;
    cut: boolean;
    allThere: boolean;
  }[] = [
    {
      name: 'the full depth came back',
      over: { asked: 1_000, lines: 1_000, truncated: false },
      cut: false,
      allThere: false
    },
    {
      name: 'the session had less than was asked for',
      over: { asked: 1_000, lines: 220, truncated: false },
      cut: false,
      allThere: true
    },
    {
      name: 'Tortie cut it and the count is under the depth',
      over: { asked: 25_000, lines: 9_100, truncated: true },
      cut: true,
      allThere: false
    },
    {
      name: 'Tortie cut it and the count still equals the depth',
      over: { asked: 1_000, lines: 1_000, truncated: true },
      cut: true,
      allThere: false
    },
    {
      name: 'the screen alone came back',
      over: { asked: 0, lines: 40, truncated: false },
      cut: false,
      allThere: false
    },
    {
      name: 'the screen alone was cut',
      over: { asked: 0, lines: 40, truncated: true },
      cut: true,
      allThere: false
    }
  ];

  it.each(table)('$name', ({ over, cut, allThere }) => {
    const one = result(over);
    const html = readable(panelHtml({ result: one }));
    expect([
      html.includes(copy.READ_LINES_CUT),
      html.includes(copy.READ_LINES_ALL_THERE)
    ]).toEqual([cut, allThere]);
    expect(showsAllThere(one)).toBe(allThere);
    // The point of the table, stated once more as the thing it exists for.
    expect(cut && allThere).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Every state that is not a body
// ---------------------------------------------------------------------------

describe('the three modes that mean no lines', () => {
  it.each([
    ['noSession' as const, copy.READ_LINES_NO_SESSION],
    ['notConnected' as const, copy.readLinesNotConnected('Studio')],
    ['unreachable' as const, copy.readLinesUnreachable('Studio')]
  ])('%s draws its own sentence and no text block', (mode, sentence) => {
    const html = readable(
      panelHtml({ result: result({ mode, text: '', lines: 0, bytes: 0 }) })
    );
    expect(html).toContain(sentence);
    expect(html).not.toContain('remote-lines-body');
    // None of the three is a read, so none of them draws the header, the not
    // live line or a counts sentence about a body that never arrived.
    expect(html).not.toContain(copy.READ_LINES_NOT_LIVE);
    expect(html).not.toContain('remote-lines-counts');
  });
});

describe('the other states', () => {
  it('says the session printed nothing when the body is empty', () => {
    const html = readable(
      panelHtml({ result: result({ text: '', lines: 0, bytes: 0 }) })
    );
    expect(html).toContain(copy.READ_LINES_EMPTY);
    expect(html).not.toContain('remote-lines-body');
  });

  it('says it is reading while the one read is in flight', () => {
    const html = readable(panelHtml({ loading: true, result: null }));
    expect(html).toContain(copy.readLinesReading('Studio'));
  });

  it('draws no answer at all while a second read is in flight', () => {
    // The previous answer is still in the store while a deeper read runs.
    // Drawing it would put a counts sentence describing 1,000 lines above a
    // panel on its way to holding 25,000, which is the Phase 99.1 shape again.
    const html = readable(
      panelHtml({ loading: true, result: result({ lines: 1_000 }) })
    );
    expect(html).toContain(copy.readLinesReading('Studio'));
    expect(html).not.toContain(copy.readLinesCount(1_000, 26));
    expect(html).not.toContain('remote-lines-body');
  });

  it('gives the in-flight sentence its own class', () => {
    // THE SENTENCE THAT IS NOT AN ANSWER. Every other sentence in that box is
    // settled, so a reader of the markup that cannot tell them apart reads
    // "Tortie is reading this session on Studio." as a result. A probe did
    // exactly that and reported four empty reads for a feature that works.
    const inFlight = readable(panelHtml({ loading: true, result: null }));
    expect(inFlight).toContain('remote-lines-reading');
    expect(inFlight).not.toContain('remote-lines-empty');

    const settled = readable(
      panelHtml({ result: result({ text: '', lines: 0, bytes: 0 }) })
    );
    expect(settled).toContain('remote-lines-empty');
    expect(settled).not.toContain('remote-lines-reading');
  });

  it('says an older build cannot do this when there is no answer at all', () => {
    const html = readable(panelHtml({ loading: false, result: null }));
    expect(html).toContain(copy.READ_LINES_NO_BRIDGE);
  });

  it('says the read failed when the call was rejected', () => {
    // A REJECTED CALL IS NOT AN OLDER BUILD. The first build of this phase drew
    // the older build sentence for both, so a build that has the bridge and
    // whose call failed was told it cannot do this at all.
    const html = readable(
      panelHtml({ loading: false, failed: true, result: null })
    );
    expect(html).toContain(copy.READ_LINES_FAILED);
    expect(html).not.toContain(copy.READ_LINES_NO_BRIDGE);
  });

  it('draws the bare title when the session row has gone', () => {
    const html = readable(panelHtml({ session: null, result: null }));
    expect(html).toContain(copy.READ_LINES_TITLE);
    expect(html).not.toContain('Last lines of ');
  });
});

// ---------------------------------------------------------------------------
// The depth buttons
// ---------------------------------------------------------------------------

describe('the depth buttons', () => {
  it('draws the label and the four depths in order', () => {
    const html = readable(panelHtml());
    expect(html).toContain(copy.READ_LINES_DEPTH_LABEL);
    // Only the depth row is searched. The counts sentence above it also holds
    // the characters "1,000 lines", so a search over the whole panel would find
    // the second button before the first one.
    const row = html.slice(html.indexOf('remote-lines-depths'));
    const labels = [
      copy.READ_LINES_DEPTH_SCREEN,
      copy.readLinesDepthLabel(1_000),
      copy.readLinesDepthLabel(10_000),
      copy.readLinesDepthLabel(25_000)
    ];
    const at = labels.map((one) => row.indexOf(one));
    expect(at.filter((i) => i < 0)).toEqual([]);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('offers exactly the four depths the contract holds', () => {
    expect([...REMOTE_SESSION_LINE_DEPTHS]).toEqual([0, 1_000, 10_000, 25_000]);
  });

  it('calls the store with its own number, one button at a time', () => {
    // The row is its own component precisely so this can happen. It calls no
    // hook, so it can be called as a plain function, and what comes back is the
    // element tree with the SHIPPED handler on each button. That is a real
    // press rather than a claim about one, which markup alone cannot give.
    const asked: number[] = [];
    const row = RemoteLinesDepths({
      depth: 1_000,
      read: (lines) => asked.push(lines)
    });
    const children = row.props.children as {
      key: string;
      props: { children: string; onClick: () => void };
    }[];
    expect(children.length).toBe(4);
    expect(children.map((one) => one.props.children)).toEqual([
      copy.READ_LINES_DEPTH_SCREEN,
      copy.readLinesDepthLabel(1_000),
      copy.readLinesDepthLabel(10_000),
      copy.readLinesDepthLabel(25_000)
    ]);
    for (const one of children) one.props.onClick();
    expect(asked).toEqual([0, 1_000, 10_000, 25_000]);
  });

  it('marks the depth the panel last asked for', () => {
    const html = panelHtml({ depth: 25_000 });
    // One pressed button, and it is the one whose label follows it.
    expect(html.split('aria-pressed="true"').length - 1).toBe(1);
    const at = html.indexOf('aria-pressed="true"');
    expect(html.slice(at, at + 120)).toContain(
      copy.readLinesDepthLabel(25_000)
    );
  });
});

// ---------------------------------------------------------------------------
// The box opens on the newest line
// ---------------------------------------------------------------------------

describe('the text block', () => {
  it('is put at its bottom, which is where the last lines are', () => {
    // THE FEATURE IS CALLED READING THE LAST LINES. The first build of this
    // phase opened the panel at the OLDEST line of the answer, so a person who
    // asked for 25,000 lines had to scroll 25,000 lines to reach the ones they
    // opened the panel for. The panel does it from a ref callback, which React
    // calls while it commits, and a static render commits nothing. So the
    // function that callback calls is pressed here directly.
    const box = { scrollTop: 0, scrollHeight: 41_200 };
    scrollToNewest(box);
    expect(box.scrollTop).toBe(41_200);
  });

  it('does nothing when there is no box, which is every state but the body', () => {
    expect(() => scrollToNewest(null)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// The two Phase 95 strings, read off disk
// ---------------------------------------------------------------------------

describe('the two sentences Phase 100 made false', () => {
  const GONE = ['Cannot scroll back', 'Scrolling back is not available'];

  /** Every file under src/, walked once. */
  function filesUnder(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push(...filesUnder(full));
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
    return out;
  }

  it('appear in no file under src', () => {
    const offenders: string[] = [];
    for (const file of filesUnder(resolve(ROOT, 'src'))) {
      // ONE FILE NAMES BOTH STRINGS ON PURPOSE, and it is this one, because a
      // rule written out is a rule a reader can check. Every other file under
      // src fails on either string. The screenshot hook, which reads the live
      // document for the same two, is passed them by
      // build/probe-p100-lines.mjs rather than holding them, so that it is
      // covered by this rule too.
      if (file.endsWith('p100-remote-lines.test.tsx')) continue;
      let source: string;
      try {
        source = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      for (const word of GONE) {
        if (source.includes(word)) offenders.push(`${file}: ${word}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('are no longer exported by presentation.ts', () => {
    const all = copy as unknown as Record<string, unknown>;
    expect(all.NO_SCROLLBACK_HERE).toBeUndefined();
    expect(all.NO_SCROLLBACK_HERE_TITLE).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The writing rules, over the sentences this phase adds
// ---------------------------------------------------------------------------

describe('the writing rules', () => {
  const sentences = [
    copy.READ_LAST_LINES_HERE_TITLE,
    copy.READ_LINES_NOT_LIVE,
    copy.READ_LINES_CUT,
    copy.READ_LINES_ALL_THERE,
    copy.READ_LINES_EMPTY,
    copy.READ_LINES_NO_SESSION,
    copy.READ_LINES_NO_BRIDGE,
    copy.READ_LINES_FAILED,
    copy.readLinesCount(1_000, 421_888),
    copy.readLinesReading('Studio'),
    copy.readLinesNotConnected('Studio'),
    copy.readLinesUnreachable('Studio')
  ];

  it('holds no em dash and no en dash anywhere', () => {
    const all = [
      ...sentences,
      copy.READ_LAST_LINES_HERE,
      copy.READ_LAST_LINES_ITEM,
      copy.READ_LINES_DEPTH_LABEL,
      copy.READ_LINES_DEPTH_SCREEN,
      copy.READ_LINES_TITLE,
      copy.readLinesTitle('api-refactor'),
      copy.readLinesDepthLabel(10_000)
    ];
    expect(all.filter((one) => one.includes('—') || one.includes('–'))).toEqual(
      []
    );
  });

  it('is complete sentences with no colon in any of them', () => {
    expect(sentences.filter((one) => one.includes(':'))).toEqual([]);
    expect(sentences.filter((one) => !one.endsWith('.'))).toEqual([]);
  });

  it('is a complete sentence in the header too, whose colon is a clock', () => {
    // The header is not in the list above, because the instant it carries holds
    // a clock time and a clock time is not punctuation. It is a complete
    // sentence either way, and it names the machine and the moment.
    const header = copy.readLinesHeader('Studio', '17 August 2026 at 14:02');
    expect(header).toBe('Tortie read this from Studio at 17 August 2026 at 14:02.');
    expect(header.endsWith('.')).toBe(true);
  });

  it('uses its one colon to introduce the four depths', () => {
    expect(copy.READ_LINES_DEPTH_LABEL).toBe('How far back to read:');
  });

  it('says the counts with numbers rather than adjectives', () => {
    expect(copy.readLinesCount(1_000, 421_888)).toBe(
      'Tortie brought back 1,000 lines and 0.4 MB.'
    );
  });
});

// ---------------------------------------------------------------------------
// The store, and the race it must not lose
// ---------------------------------------------------------------------------

/** Let every already resolved promise settle before the store is read. */
const flush = (): Promise<void> =>
  new Promise((r) => {
    setTimeout(r, 0);
  });

describe('the store', () => {
  beforeEach(() => {
    pending.length = 0;
    useApp.getState().closeRemoteLines();
  });

  it('opens the panel and reads at the default depth', () => {
    useApp.getState().openRemoteLines('p100s');
    expect(useApp.getState().remoteLinesSessionId).toBe('p100s');
    expect(useApp.getState().remoteLinesLoading).toBe(true);
    expect(useApp.getState().remoteLinesDepth).toBe(1_000);
    expect(pending.length).toBe(1);
    expect(pending[0]?.input).toEqual({ sessionId: 'p100s', lines: 1_000 });
  });

  it('lets the NEWEST read of the same session win, whatever the order', async () => {
    // THE RACE THIS GUARD EXISTS FOR. A person opens the panel, which starts a
    // 1,000 line read, then presses 25,000 before the first has answered. The
    // deeper read is bigger, so it can finish LAST. Without the request number
    // the shallow answer would land in a panel that now says it is showing
    // 25,000 lines, and the counts sentence would describe a body that is not
    // the one on screen.
    useApp.getState().openRemoteLines('p100s');
    useApp.getState().readRemoteLines(25_000);
    expect(pending.length).toBe(2);
    expect(useApp.getState().remoteLinesDepth).toBe(25_000);

    pending[1]?.answer(result({ asked: 25_000, lines: 25_000, bytes: 4_200 }));
    await flush();
    expect(useApp.getState().remoteLines?.asked).toBe(25_000);
    expect(useApp.getState().remoteLinesLoading).toBe(false);

    // The older answer arrives afterwards and changes nothing.
    pending[0]?.answer(result({ asked: 1_000, lines: 1_000, bytes: 26 }));
    await flush();
    expect(useApp.getState().remoteLines?.asked).toBe(25_000);
  });

  it('lets a second open of a DIFFERENT session win', async () => {
    useApp.getState().openRemoteLines('p100s');
    useApp.getState().openRemoteLines('other');
    expect(useApp.getState().remoteLinesSessionId).toBe('other');

    pending[0]?.answer(result({ sessionId: 'p100s' }));
    await flush();
    expect(useApp.getState().remoteLines).toBeNull();

    pending[1]?.answer(result({ sessionId: 'other' }));
    await flush();
    expect(useApp.getState().remoteLines?.sessionId).toBe('other');
  });

  it('stops loading when a read fails and keeps the panel open', async () => {
    useApp.getState().openRemoteLines('p100s');
    pending[0]?.fail(new Error('the link went down'));
    await flush();
    expect(useApp.getState().remoteLinesLoading).toBe(false);
    expect(useApp.getState().remoteLinesSessionId).toBe('p100s');
    // The panel must be able to tell a rejected call from a preload with no
    // bridge method, because it says a different sentence for each.
    expect(useApp.getState().remoteLinesFailed).toBe(true);
  });

  it('drops the older body when a later read fails', async () => {
    // Keeping it would leave a body read at 1,000 lines under a depth row
    // showing 25,000 as pressed, which is the mismatch the request number
    // exists to stop, arriving by the other door.
    useApp.getState().openRemoteLines('p100s');
    pending[0]?.answer(result({ asked: 1_000, lines: 1_000 }));
    await flush();
    expect(useApp.getState().remoteLines?.asked).toBe(1_000);

    useApp.getState().readRemoteLines(25_000);
    expect(useApp.getState().remoteLinesFailed).toBe(false);
    pending[1]?.fail(new Error('the link went down'));
    await flush();
    expect(useApp.getState().remoteLines).toBeNull();
    expect(useApp.getState().remoteLinesFailed).toBe(true);
  });

  it('clears the failure when the next read is started', async () => {
    useApp.getState().openRemoteLines('p100s');
    pending[0]?.fail(new Error('the link went down'));
    await flush();
    expect(useApp.getState().remoteLinesFailed).toBe(true);
    useApp.getState().readRemoteLines(10_000);
    expect(useApp.getState().remoteLinesFailed).toBe(false);
    expect(useApp.getState().remoteLinesLoading).toBe(true);
  });

  it('drops the text when the panel is closed', async () => {
    useApp.getState().openRemoteLines('p100s');
    pending[0]?.answer(result());
    await flush();
    expect(useApp.getState().remoteLines).not.toBeNull();
    useApp.getState().closeRemoteLines();
    expect(useApp.getState().remoteLines).toBeNull();
    expect(useApp.getState().remoteLinesSessionId).toBeNull();
  });

  it('sends nothing when the panel is not open', () => {
    // `readRemoteLines` is reachable from the panel alone, and the panel is not
    // mounted when no session is open. A depth press that arrived anyway must
    // not compose a read with no session to read.
    useApp.getState().closeRemoteLines();
    useApp.getState().readRemoteLines(10_000);
    expect(pending.length).toBe(0);
  });
});
