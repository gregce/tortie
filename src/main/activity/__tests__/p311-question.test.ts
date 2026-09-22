/**
 * PHASE 311 — the question the hook already delivers.
 *
 * Three things are driven here, and they are the three seams the phase adds.
 *
 *  1. THE LEAF, ../question.ts, over the honest shapes and over the eight
 *     hostile ones the phase brief names: no `tool_name`, a 1 MiB `tool_input`,
 *     a token-shaped string, raw ANSI, a newline flood, a subagent payload,
 *     invalid UTF-8, and `{"tool_input":{"toString":…}}`. Each must answer
 *     either a value or null, never throw, never return an unredacted token
 *     shape, and never return more than `QUESTION_MAX` characters.
 *  2. THE HANDOVER, over a REAL bound loopback server, because the rule that
 *     an over-cap body is dropped WHOLE rather than truncated lives in the
 *     server's own read and cannot be read off the leaf.
 *  3. THE STAMP AND THE CLEAR in the monitor, over fake tmux output: the
 *     question rides the tick beside the excerpt, is not repeated, and is
 *     cleared the moment the session stops being blocked — here by the state
 *     machine's own release, so the clear is proved without a second hook.
 *
 * SECTION 3 WAS REWRITTEN WHEN PHASES 311 AND 312 LANDED TOGETHER, and the
 * rewrite is the one real interaction the two have. It asserted that a Claude
 * session sitting at the committed dialog fixture put NO question on the wire
 * until a hook fired, which was true of a tree where the screen's own `QUEST` row
 * was matched and thrown away. Phase 312 picks that row up for every agent, so
 * the same fixture now answers `Do you want to make this edit to note.txt?` off
 * the screen — which is the line this phase's own first paragraph says a person
 * wants and the hint row it says they get instead. The arms below therefore prove
 * MORE than they did: the PRECEDENCE live in the monitor (a hook's answer
 * replacing the screen's on the wire for the same gate), that a hook with no body
 * blanks nothing, that a gate whose question cannot be placed is still a miss and
 * not a lie, and every clear the old arms proved.
 *
 * It binds one ephemeral loopback port and closes it, writes no file outside a
 * temporary directory it removes, starts no agent, reads nothing under
 * anybody's home and spends no token.
 */

import { request } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SESSION_STATUSES, type SessionStatus } from '@shared/types';
import { GmuxHookServer } from '../hooks';
import {
  SessionActivityMonitor,
  type ActivitySession,
  type SessionActivityUpdate
} from '../monitor';
import { questionFromHookBody, QUESTION_MAX } from '../question';

const body = (value: unknown): string => JSON.stringify(value);

// ---------------------------------------------------------------------------
// 1 — the leaf
// ---------------------------------------------------------------------------

describe('the question the leaf composes', () => {
  it('says what a Bash permission is about to run', () => {
    expect(
      questionFromHookBody(
        body({
          hook_event_name: 'PermissionRequest',
          tool_name: 'Bash',
          tool_input: { command: 'rm -rf build', description: 'clean' }
        })
      )
    ).toBe('Bash rm -rf build');
  });

  it('says which file an edit is about to touch', () => {
    expect(
      questionFromHookBody(
        body({
          tool_name: 'Edit',
          tool_input: {
            file_path: '/Users/example/webapp/src/auth/session.ts',
            old_string: 'const a = 1;',
            new_string: 'const a = 2;'
          }
        })
      )
    ).toBe('Edit /Users/example/webapp/src/auth/session.ts');
  });

  it('never reads the body of a file or the text of a turn', () => {
    // `content`, `new_string`, `old_string` and `prompt` are deliberately not
    // in the key list: a row is not the place for either.
    const answer = questionFromHookBody(
      body({
        tool_name: 'Write',
        tool_input: { content: 'SECRET PROSE THE PERSON WROTE' }
      })
    );
    expect(answer).toBe('Write');
    const task = questionFromHookBody(
      body({
        tool_name: 'Task',
        tool_input: { prompt: 'a very long brief', description: 'read the tests' }
      })
    );
    expect(task).toBe('Task read the tests');
  });

  it('answers the tool alone when its input says nothing telling', () => {
    expect(questionFromHookBody(body({ tool_name: 'ExitPlanMode' }))).toBe(
      'ExitPlanMode'
    );
    expect(
      questionFromHookBody(body({ tool_name: 'X', tool_input: { nested: { a: 1 } } }))
    ).toBe('X');
    expect(questionFromHookBody(body({ tool_name: 'Y', tool_input: 42 }))).toBe('Y');
    expect(questionFromHookBody(body({ tool_name: 'Z', tool_input: [] }))).toBe('Z');
  });

  it('takes a string tool_input as the words themselves', () => {
    expect(questionFromHookBody(body({ tool_name: 'Glob', tool_input: '**/*.ts' }))).toBe(
      'Glob **/*.ts'
    );
  });

  it('asks the first telling key and stops', () => {
    expect(
      questionFromHookBody(
        body({ tool_name: 'Grep', tool_input: { pattern: 'TODO', path: 'src' } })
      )
    ).toBe('Grep TODO');
  });
});

describe('THE HOSTILE FIXTURE — the eight shapes', () => {
  it('1. no tool_name is null, in every way it can be missing', () => {
    expect(questionFromHookBody(body({ tool_input: { command: 'ls' } }))).toBeNull();
    expect(questionFromHookBody(body({ tool_name: '' }))).toBeNull();
    expect(questionFromHookBody(body({ tool_name: '   ' }))).toBeNull();
    expect(questionFromHookBody(body({ tool_name: 123 }))).toBeNull();
    expect(questionFromHookBody(body({ tool_name: null }))).toBeNull();
    expect(questionFromHookBody(body({ tool_name: { toString: 'Bash' } }))).toBeNull();
    // Nothing may reach through a key name into Object.prototype.
    expect(questionFromHookBody(body({ __proto__: { tool_name: 'Bash' } }))).toBeNull();
    expect(questionFromHookBody('[]')).toBeNull();
    expect(questionFromHookBody('"a string"')).toBeNull();
    expect(questionFromHookBody('null')).toBeNull();
    expect(questionFromHookBody('')).toBeNull();
    expect(questionFromHookBody('not json at all')).toBeNull();
    expect(questionFromHookBody('{"tool_name":"Bash"')).toBeNull();
  });

  it('2. a 1 MiB tool_input answers one drawn line', () => {
    const huge = 'x'.repeat(1024 * 1024);
    const answer = questionFromHookBody(
      body({ tool_name: 'Bash', tool_input: { command: huge } })
    );
    expect(answer).not.toBeNull();
    expect(answer?.length).toBe(QUESTION_MAX);
    expect(answer?.startsWith('Bash xxx')).toBe(true);
  });

  it('3. a token-shaped string is masked, and the shape is gone', () => {
    const fake = `ghp_${'A'.repeat(24)}`;
    const answer = questionFromHookBody(
      body({ tool_name: 'Bash', tool_input: { command: `curl -H "token: ${fake}"` } })
    );
    expect(answer).not.toBeNull();
    expect(answer).not.toContain(fake);
    expect(answer).toContain('[REDACTED:');
    // The two Tortie rules ride along with the vendored extract.
    const aws = questionFromHookBody(
      body({ tool_name: 'Bash', tool_input: { command: `aws ${'AKIA' + 'B'.repeat(16)}` } })
    );
    expect(aws).toContain('[REDACTED:aws-key]');
    const mail = questionFromHookBody(
      body({ tool_name: 'Bash', tool_input: { command: 'mail someone@example.com' } })
    );
    expect(mail).toContain('[REDACTED:email]');
  });

  it('4. raw ANSI leaves no escape and no orphaned parameters', () => {
    const answer = questionFromHookBody(
      body({
        tool_name: 'Bash',
        // A CSI colour, a cursor move, and a bare escape with no sequence.
        tool_input: { command: '\u001b[31mred\u001b[0m \u001b[2Kline \u001bx' }
      })
    );
    expect(answer).toBe('Bash red line x');
    expect(answer).not.toContain('\u001b');
    expect(answer).not.toContain('31m');
  });

  it('5. a newline flood is one line', () => {
    const answer = questionFromHookBody(
      body({
        tool_name: 'Bash',
        tool_input: { command: `a${'\n'.repeat(500)}b\r\n\tc` }
      })
    );
    expect(answer).toBe('Bash a b c');
    expect(answer).not.toContain('\n');
  });

  it('6. a subagent payload never speaks for the session', () => {
    expect(
      questionFromHookBody(
        body({ agent_id: 'abc', tool_name: 'Bash', tool_input: { command: 'ls' } })
      )
    ).toBeNull();
    expect(
      questionFromHookBody(
        body({ agent_type: 'explore', tool_name: 'Bash', tool_input: { command: 'ls' } })
      )
    ).toBeNull();
    expect(
      questionFromHookBody(body({ agent_id: null, tool_name: 'Bash' }))
    ).toBeNull();
  });

  it('7. invalid UTF-8 and a lone surrogate answer a value or null, never a throw', () => {
    // What the server hands over: every invalid byte is already U+FFFD,
    // because the read does `chunk.toString('utf8')`.
    const replaced = Buffer.from(
      '{"tool_name":"Bash","tool_input":{"command":"ls \xff\xfe"}}',
      'binary'
    ).toString('utf8');
    expect(() => questionFromHookBody(replaced)).not.toThrow();
    // A JSON escape may carry a lone surrogate, which is valid JSON and
    // invalid UTF-8. It must not throw and must not be half a character at the
    // cap: the cut drops a trailing high surrogate.
    const lone = questionFromHookBody('{"tool_name":"Bash","tool_input":"\\ud800a"}');
    expect(lone).not.toBeNull();
    const pairs = questionFromHookBody(
      body({ tool_name: 'B', tool_input: { command: '\u{1f600}'.repeat(200) } })
    );
    expect(pairs).not.toBeNull();
    expect(pairs?.length).toBeLessThanOrEqual(QUESTION_MAX);
    expect(/[\ud800-\udbff]$/.test(pairs ?? '')).toBe(false);
  });

  it('8. {"tool_input":{"toString":…}} coerces nothing', () => {
    expect(
      questionFromHookBody('{"tool_name":"Bash","tool_input":{"toString":"pwned"}}')
    ).toBe('Bash');
    expect(
      questionFromHookBody(
        '{"tool_name":"Bash","tool_input":{"command":{"toString":"pwned"}}}'
      )
    ).toBe('Bash');
  });

  it('never throws and never exceeds the cap, over every shape above', () => {
    const shapes = [
      '',
      '{',
      '[]',
      'true',
      '{"tool_name":"Bash"}',
      body({ tool_name: 'Bash', tool_input: { command: 'x'.repeat(70_000) } }),
      body({ tool_name: 'a'.repeat(5_000) }),
      // The third character is a C1 byte, written as an ESCAPE. It arrived as a
      // RAW U+009F in the commit that landed this file, which reads as an ASCII
      // line carrying two escapes and is not one — the point of the shape is the
      // C1 block, so the source says so. The composed string is identical.
      body({ tool_name: 'Bash', tool_input: { command: '\u0000\u0007\u009f' } })
    ];
    for (const shape of shapes) {
      let answer: string | null = null;
      expect(() => {
        answer = questionFromHookBody(shape);
      }).not.toThrow();
      if (answer !== null) expect((answer as string).length).toBeLessThanOrEqual(QUESTION_MAX);
    }
  });

  it('draws no control character, whatever arrives', () => {
    const answer = questionFromHookBody(
      body({ tool_name: 'Bash', tool_input: { command: 'a\u0000\u0008\u001f\u007fb' } })
    );
    expect(answer).toBe('Bash a b');
  });

  it('holds the cap exactly, and does not clip what fits', () => {
    const fits = 'y'.repeat(QUESTION_MAX - 'Bash '.length);
    expect(
      questionFromHookBody(body({ tool_name: 'Bash', tool_input: { command: fits } }))
        ?.length
    ).toBe(QUESTION_MAX);
    const over = `${fits}z`;
    expect(
      questionFromHookBody(body({ tool_name: 'Bash', tool_input: { command: over } }))
        ?.length
    ).toBe(QUESTION_MAX);
  });
});

// ---------------------------------------------------------------------------
// 2 — the handover, over a real bound server
// ---------------------------------------------------------------------------

const TOKEN = 'aaaaaaaabbbbbbbbccccccccdddddddd';
const MAX_BODY_BYTES = 64 * 1024;

interface SeenEvent {
  sessionId: string;
  event: string;
  body: string | undefined;
}

describe('the hook route hands the body over', () => {
  let server: GmuxHookServer;
  let seen: SeenEvent[];
  let port: number;

  beforeEach(async () => {
    seen = [];
    server = new GmuxHookServer({
      onEvent: (sessionId, _state, event, payload) =>
        seen.push({ sessionId, event, body: payload }),
      onSessionEnd: () => undefined
    });
    port = await server.start(0);
    server.register(TOKEN, 'sess-1');
  });

  afterEach(async () => {
    await server.stop();
  });

  const post = (event: string, payload: string): Promise<number> =>
    new Promise((resolve, reject) => {
      const req = request(
        {
          host: '127.0.0.1',
          port,
          path: `/h/${TOKEN}?e=${event}`,
          method: 'POST',
          headers: { 'content-type': 'application/json' }
        },
        (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode ?? 0));
        }
      );
      req.on('error', reject);
      req.end(payload);
    });

  it('carries the PermissionRequest body raw and unparsed', async () => {
    const payload = body({ tool_name: 'Edit', tool_input: { file_path: '/p/note.txt' } });
    expect(await post('PermissionRequest', payload)).toBe(200);
    expect(seen).toEqual([
      { sessionId: 'sess-1', event: 'PermissionRequest', body: payload }
    ]);
    expect(questionFromHookBody(seen[0]?.body ?? '')).toBe('Edit /p/note.txt');
  });

  it('drops an over-cap body WHOLE, so no prefix of one composes anything', async () => {
    const payload = body({
      tool_name: 'Bash',
      tool_input: { command: 'x'.repeat(MAX_BODY_BYTES + 1) }
    });
    expect(await post('PermissionRequest', payload)).toBe(200);
    // The event still arrives — the state is the load-bearing half and it must
    // not depend on a body at all.
    expect(seen.length).toBe(1);
    expect(seen[0]?.body).toBe('');
    expect(questionFromHookBody(seen[0]?.body ?? '')).toBeNull();
  });

  it('never delivers a subagent payload at all', async () => {
    expect(
      await post(
        'PermissionRequest',
        body({ agent_id: 'sub', tool_name: 'Bash', tool_input: { command: 'ls' } })
      )
    ).toBe(200);
    expect(seen).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3 — the stamp and the clear, over fake tmux output
// ---------------------------------------------------------------------------

const fixture = (name: string): string =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf8');

class Harness {
  now = 1_800_000_000_000;
  /** What `capture-pane` answers this tick. */
  capture = fixture('claude-permission-prompt.txt');
  /**
   * `#{pane_in_mode}` — the person has scrolled back in this pane. The monitor
   * captures no pane in copy mode, so a blocked session in this state gets NO
   * reading of its screen for as long as the person is reading it.
   */
  inMode = false;
  readonly statuses: Array<[string, SessionStatus]> = [];
  readonly updates: SessionActivityUpdate[] = [];
  readonly monitor: SessionActivityMonitor;
  readonly claudeDir = mkdtempSync(join(tmpdir(), 'gmux-p311-'));
  readonly sessions: ActivitySession[] = [
    { id: 's1', tmuxId: '$1', agent: 'claude', cwd: '/Users/example/work' }
  ];

  constructor() {
    this.monitor = new SessionActivityMonitor({
      sessions: () => this.sessions,
      exec: (async (args: readonly string[]) => {
        if (args[0] !== 'list-panes') throw new Error(`unexpected ${args[0]}`);
        return [
          '$1',
          '%1',
          '100',
          '1',
          '0',
          '',
          '',
          String(Math.floor(this.now / 1000) - 60),
          '0',
          '0',
          this.inMode ? '1' : '0',
          '0',
          '25000',
          'zsh',
          ''
        ].join('\t');
      }) as never,
      run: async () => this.capture,
      readProc: async () => null,
      readWitness: async () => ({ found: false, stat: '', ppid: null }),
      readCommand: async () => null,
      readChildren: async () => [],
      claudeSessionsDir: this.claudeDir,
      onStatus: (id, status) => this.statuses.push([id, status]),
      onActivity: (updates) => this.updates.push(...updates),
      onDead: () => undefined,
      now: () => this.now
    });
  }

  async tick(): Promise<void> {
    this.now += 1000;
    await this.monitor.tick();
  }

  /** Every question this tick put on the wire for s1, clears included. */
  questions(): (string | undefined)[] {
    return this.updates
      .filter((u) => u.sessionId === 's1' && u.question !== undefined)
      .map((u) => u.question);
  }

  cleanup(): void {
    rmSync(this.claudeDir, { recursive: true, force: true });
  }
}

describe('the monitor stamps the question and clears it', () => {
  let h: Harness;
  beforeEach(() => {
    h = new Harness();
  });
  afterEach(() => {
    h.cleanup();
  });

  it('puts it on the wire once, beside the excerpt, then clears it once', async () => {
    // TWO TICKS OF THE COMMITTED DIALOG FIXTURE, which is the whole of both
    // phases in three assertions. The detector blocks the session; the excerpt
    // is still the LAST INKED LINE of that screen, being the hint row, because
    // nothing in either phase changed what the excerpt is; and the question is
    // line 18 of the same fixture, which Phase 312 picks up off the screen for
    // every agent and which Phase 311's first paragraph is about.
    await h.tick();
    await h.tick();
    expect(h.statuses.at(-1)).toEqual(['s1', 'needs_input']);
    expect(h.updates.map((u) => u.excerpt).filter((x) => x !== undefined)).toEqual([
      'Esc to cancel · Tab to amend'
    ]);
    expect(h.questions()).toEqual([
      'Do you want to make this edit to note.txt?'
    ]);

    h.monitor.noteHookEvent('s1', 'needs_input', 'Edit /p/note.txt');

    // THE PRECEDENCE, LIVE. The screen has not changed and still reads its own
    // question, and the hook's answer REPLACES it on the wire, because a hook
    // body is what the agent asked and a screen row is this repository's guess
    // at which drawn row was the question. The excerpt it replaces on the row is
    // left exactly as it was.
    h.updates.length = 0;
    await h.tick();
    expect(h.questions()).toEqual(['Edit /p/note.txt']);
    expect(h.questions()).not.toContain(
      'Do you want to make this edit to note.txt?'
    );
    expect(h.updates.every((u) => u.excerpt === undefined)).toBe(true);

    // It is said once. Two more ticks of the same wait repeat neither it nor a
    // clear, so the channel carries news and not a heartbeat.
    h.updates.length = 0;
    await h.tick();
    await h.tick();
    expect(h.questions()).toEqual([]);

    // The dialog leaves the screen. needs_input is released after two captures
    // with it gone, and the clear is an EXPLICIT empty string on the same tick
    // rather than an absence the renderer would have to read.
    h.capture = 'a quiet screen\n';
    h.updates.length = 0;
    await h.tick();
    expect(h.questions()).toEqual([]);
    await h.tick();
    expect(h.statuses.at(-1)).toEqual(['s1', 'running']);
    expect(h.questions()).toEqual(['']);

    // And the clear is not repeated either.
    h.updates.length = 0;
    await h.tick();
    expect(h.questions()).toEqual([]);
  });

  /**
   * A second readable gate, so a session can move from one gate to another
   * WITHOUT leaving `needs_input` and without a second hook. Claude's theme
   * picker and its trust gate both do this in the running app: they fire no
   * `PermissionRequest` at all, so Phase 311's own clear — which runs when the
   * WAIT ends — never runs, and the hook's sentence about the gate the person
   * just answered would go on being drawn over the gate now in front of them.
   */
  const SECOND_GATE = [
    '⏺ Running the suite',
    '',
    '────────────────────────────────────────────',
    ' Do you want to run the whole suite?',
    ' ❯ 1. Yes',
    '   2. No',
    '',
    ' Esc to cancel',
    ''
  ].join('\n');

  it('drops the hook’s sentence when the screen draws a DIFFERENT gate', async () => {
    await h.tick();
    await h.tick();
    h.monitor.noteHookEvent('s1', 'needs_input', 'Edit /p/note.txt');
    h.updates.length = 0;
    await h.tick();
    expect(h.questions()).toEqual(['Edit /p/note.txt']);

    // The person answers, and claude draws a second gate with no hook behind it.
    // The session never leaves needs_input, so nothing about the WAIT ending can
    // help here: the only signal is the screen's own choice moving from one real
    // gate to a different real one.
    h.capture = SECOND_GATE;
    h.updates.length = 0;
    await h.tick();
    expect(h.statuses.at(-1)).toEqual(['s1', 'needs_input']);
    expect(h.questions()).not.toContain('Edit /p/note.txt');
    expect(h.questions()).toEqual(['Do you want to run the whole suite?']);
  });

  it('holds the screen’s question through ticks that capture nothing', async () => {
    // WHY THE SCREEN'S READING IS HELD RATHER THAN RECOMPUTED. A blocked session
    // is not captured on every tick: `MAX_CAPTURES_PER_TICK` is 6, and a pane the
    // person has scrolled back in is not captured at all. A composer that read the
    // screen only when a capture arrived would blank the question on every one of
    // those ticks and send it again on the next, so a person reading their own
    // scrollback would watch the row flicker at 1 Hz.
    await h.tick();
    await h.tick();
    expect(h.questions()).toEqual([
      'Do you want to make this edit to note.txt?'
    ]);

    h.inMode = true;
    h.updates.length = 0;
    await h.tick();
    await h.tick();
    await h.tick();
    expect(h.statuses.at(-1)).toEqual(['s1', 'needs_input']);
    // Not blanked, and not repeated either: the channel says nothing, because
    // nothing about the question moved.
    expect(h.questions()).toEqual([]);
    expect(h.updates.every((u) => !Object.hasOwn(u, 'question'))).toBe(true);
  });

  it('keeps the hook’s sentence while the screen holds the SAME gate', async () => {
    // The control for the arm above, and the reason its condition is a move
    // between two REAL choices. A hook arrives BEFORE claude's frontend paints
    // the dialog, so the first reading of a gate is the hook's own gate showing
    // up — dropping the sentence there would throw away the agent's own words
    // every single time, in favour of a reading of the screen they describe.
    h.capture = 'a quiet screen\n';
    await h.tick();
    h.monitor.noteHookEvent('s1', 'needs_input', 'Edit /p/note.txt');
    await h.tick();
    expect(h.questions()).toEqual(['Edit /p/note.txt']);

    h.capture = fixture('claude-permission-prompt.txt');
    h.updates.length = 0;
    await h.tick();
    await h.tick();
    expect(h.statuses.at(-1)).toEqual(['s1', 'needs_input']);
    expect(h.questions()).toEqual([]);
  });

  it('keeps no question for an event that does not mean the agent is waiting', async () => {
    h.capture = 'a quiet screen\n';
    await h.tick();
    h.monitor.noteHookEvent('s1', 'working', 'Bash rm -rf build');
    await h.tick();
    await h.tick();
    expect(h.questions()).toEqual([]);
  });

  it('a hook with no question of its own adds nothing and BLANKS nothing', async () => {
    // What a null or an empty hook question means, and it is not the same as a
    // clear: an over-cap `PermissionRequest` body arrives as '' (the server drops
    // it whole rather than truncating), and a tool whose input says nothing
    // telling composes null. Either way the hook has nothing to say, and the row
    // must keep whatever the screen can still read — `composeQuestion`'s own
    // rule, asked here of the monitor rather than of the function.
    await h.tick();
    h.monitor.noteHookEvent('s1', 'needs_input', null);
    await h.tick();
    expect(h.questions()).toEqual([
      'Do you want to make this edit to note.txt?'
    ]);
    h.updates.length = 0;
    h.monitor.noteHookEvent('s1', 'needs_input', '');
    await h.tick();
    expect(h.questions()).toEqual([]);

    // And the hook contributes nothing OF ITS OWN: on a screen the reading
    // answers nothing about, a null hook leaves the channel silent rather than
    // putting a blank or a sentence of Tortie's on it.
    const quiet = new Harness();
    try {
      quiet.capture = 'a quiet screen\n';
      await quiet.tick();
      quiet.monitor.noteHookEvent('s1', 'needs_input', null);
      await quiet.tick();
      expect(quiet.questions()).toEqual([]);
      expect(quiet.updates.every((u) => !Object.hasOwn(u, 'question'))).toBe(true);
    } finally {
      quiet.cleanup();
    }
  });

  it('clears it after a forget that keeps the handback', async () => {
    // claude's own `SessionEnd` hook forgets the session while keeping the
    // witness, and the row lives on. What the window holds has to be cleared
    // or it would keep a question nothing is waiting on.
    await h.tick();
    await h.tick();
    // The screen's own reading goes first, because the fixture is a gate this
    // repository can read; the hook's answer then replaces it.
    expect(h.questions()).toEqual([
      'Do you want to make this edit to note.txt?'
    ]);
    h.monitor.noteHookEvent('s1', 'needs_input', 'Edit /p/note.txt');
    h.updates.length = 0;
    await h.tick();
    expect(h.questions()).toEqual(['Edit /p/note.txt']);

    // A handback in any state but `none` is what makes the forget keep a
    // state at all, which is the branch this line guards.
    h.monitor.noteHandbackResolved('s1', 'unconfirmed');
    h.monitor.forget('s1', true);
    h.capture = 'a quiet screen\n';
    h.updates.length = 0;
    await h.tick();
    expect(h.questions()).toEqual(['']);
  });

  // -------------------------------------------------------------------------
  // THE FIX ROUND'S ARMS. Both verifiers drove the SHIPPING monitor over the
  // paths this suite never reached and found the same hole: a forget that keeps
  // nothing emitted no clear, so a session restored under the same id drew the
  // previous life's question, and — because the row prefers a question it holds
  // over the true screen line — never fell back to it. Claude's own
  // workspace-trust dialog fires no hook, which is why the first blocked row
  // after a restore was exactly the row that was wrong. These three arms are
  // what stop that coming back.
  // -------------------------------------------------------------------------

  it('clears it after a forget that keeps NOTHING', async () => {
    await h.tick();
    await h.tick();
    expect(h.questions()).toEqual([
      'Do you want to make this edit to note.txt?'
    ]);
    h.monitor.noteHookEvent('s1', 'needs_input', 'Bash rm -rf build');
    h.updates.length = 0;
    await h.tick();
    expect(h.questions()).toEqual(['Bash rm -rf build']);

    // End, a dead pane, a release and a session leaving the list all land here.
    h.monitor.forget('s1', false);
    h.updates.length = 0;
    await h.tick();
    expect(h.questions()).toEqual(['']);

    // And the clear is said ONCE. What the next tick says is the GATE'S OWN
    // question — the dialog never left this fixture's screen, so the new life
    // reaches needs_input on it and is genuinely blocked on it — and never a
    // second clear and never the sentence the previous life was asking.
    h.updates.length = 0;
    await h.tick();
    expect(h.questions()).not.toContain('');
    expect(h.questions()).not.toContain('Bash rm -rf build');
    expect(h.questions()).toEqual([
      'Do you want to make this edit to note.txt?'
    ]);
    // Said once here too: the window holds it now, so the tick after says nothing.
    h.updates.length = 0;
    await h.tick();
    expect(h.questions()).toEqual([]);
  });

  it('draws the true screen line on a session restored at a dialog that fires no hook', async () => {
    // The whole regression in one arm. The session is blocked with a question,
    // it leaves Tortie's list, it comes back under the same id, and it reaches
    // needs_input from a DIFFERENT committed dialog — one that hands Tortie no
    // hook body at all AND whose question `QUEST` cannot place, because the words
    // are `Is this a project you created or one you trust?` six inked rows above
    // the options. So neither source has an answer and the row falls back to the
    // gate's own last inked line. That is the MISS `screen.ts` prefers to a lie,
    // and it is what makes this arm still worth its name after Phase 312.
    await h.tick();
    await h.tick();
    expect(h.questions()).toEqual([
      'Do you want to make this edit to note.txt?'
    ]);
    h.monitor.noteHookEvent('s1', 'needs_input', 'Bash rm -rf build');
    h.updates.length = 0;
    await h.tick();
    expect(h.questions()).toEqual(['Bash rm -rf build']);

    // It leaves the list, which is what an End does to the monitor.
    h.sessions.length = 0;
    await h.tick();

    h.sessions.push({
      id: 's1',
      tmuxId: '$1',
      agent: 'claude',
      cwd: '/Users/example/work'
    });
    h.capture = fixture('claude-workspace-trust.txt');
    h.updates.length = 0;
    await h.tick();
    await h.tick();

    // Blocked again, from the screen and from no hook, and the only thing the
    // channel says about the question is that there is none — so the row draws
    // this fixture's own last inked line.
    expect(h.statuses.at(-1)).toEqual(['s1', 'needs_input']);
    expect(h.questions()).toEqual(['']);
    expect(
      h.updates.map((u) => u.excerpt).filter((x) => x !== undefined)
    ).toEqual(['Enter to confirm · Esc to cancel']);
  });

  it('draws the SCREEN’S question on a session restored at a gate it can read', async () => {
    // THE OTHER HALF OF THE ARM ABOVE, and it is the reconciliation's own claim.
    // The same restore, at a gate whose question this repository CAN place: the
    // previous life's hook answer is cleared and the screen's reading takes its
    // place, so the row asks what the gate asks instead of drawing
    // `Esc to cancel · Tab to amend`. A build that filtered the screen's reading
    // out for Claude would answer the empty string here and draw the hint row.
    await h.tick();
    await h.tick();
    h.monitor.noteHookEvent('s1', 'needs_input', 'Bash rm -rf build');
    await h.tick();
    expect(h.questions().at(-1)).toBe('Bash rm -rf build');

    h.sessions.length = 0;
    await h.tick();

    h.sessions.push({
      id: 's1',
      tmuxId: '$1',
      agent: 'claude',
      cwd: '/Users/example/work'
    });
    h.updates.length = 0;
    await h.tick();
    await h.tick();

    expect(h.statuses.at(-1)).toEqual(['s1', 'needs_input']);
    // The previous life's answer is gone and the gate's own question is what the
    // wire ends on, whether that took one message or two.
    expect(h.questions()).not.toContain('Bash rm -rf build');
    expect(h.questions().at(-1)).toBe(
      'Do you want to make this edit to note.txt?'
    );
  });

  it('says nothing about the question on an ordinary tick, first tick included', async () => {
    // The control the fix must not break, and it is why the memory was hoisted
    // out of the state rather than seeded with a sentinel inside it: a sentinel
    // makes the FIRST tick of every session carry an explicit clear, and this
    // channel's promise is that it carries news.
    //
    // THE ORDINARY SESSION IS THE ONE THAT NEVER BLOCKS, which is what this arm
    // drives now. It used to drive the DIALOG fixture for three ticks and assert
    // silence, which was only true while the screen's own question row was matched
    // and thrown away: a blocked session at a gate this repository can read is
    // news, and saying nothing about it is the defect both phases exist to fix.
    h.capture = 'a quiet screen\n';
    await h.tick();
    await h.tick();
    await h.tick();
    expect(h.statuses.at(-1)).not.toEqual(['s1', 'needs_input']);
    expect(h.updates.every((u) => !Object.hasOwn(u, 'question'))).toBe(true);
    h.updates.length = 0;
    await h.tick();
    await h.tick();
    expect(h.updates.every((u) => !Object.hasOwn(u, 'question'))).toBe(true);
  });

  it('says the screen’s question ONCE, and then carries news and not a heartbeat', async () => {
    // The same promise asked of the screen's half, which is the half no arm
    // covered before the two phases landed together: the reading is taken on
    // every capture and put on the wire only when it MOVES, so a gate a person
    // leaves up for a minute costs one message rather than sixty.
    await h.tick();
    await h.tick();
    expect(h.questions()).toEqual([
      'Do you want to make this edit to note.txt?'
    ]);
    h.updates.length = 0;
    await h.tick();
    await h.tick();
    await h.tick();
    expect(h.questions()).toEqual([]);
    expect(h.updates.every((u) => !Object.hasOwn(u, 'question'))).toBe(true);
  });

  it('never makes the question a status', async () => {
    await h.tick();
    h.monitor.noteHookEvent('s1', 'needs_input', 'Edit /p/note.txt');
    await h.tick();
    // Every status this monitor has ever emitted is a member of the pinned
    // list, read from the contract rather than copied, and the question never
    // became one of them.
    expect(h.statuses.length).toBeGreaterThan(0);
    for (const [, status] of h.statuses) {
      expect(SESSION_STATUSES as readonly string[]).toContain(status);
      expect(status).not.toContain('Edit');
    }
  });
});
