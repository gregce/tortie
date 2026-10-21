/**
 * THE MADE-UP WORLD OF SEE A SAMPLE (Phase 333.3, build/p3333/SPEC.md §5.1.1).
 *
 * Five sessions that never ran, on two projects that do not exist, on this Mac.
 * `build/p3333/sample.mjs` composes every answer the phone's sample serves from
 * these facts with the Mac's SHIPPING composer, and writes
 * `ios/Tortie/Sample/sample.json`. Nothing here is composed: this module holds
 * the facts a composer reads (the sessions, their clocks, their questions and
 * turns) and the terminal output a screen read would have captured.
 *
 * THE AGENTS ARE REAL AND EVERYTHING ELSE IS MADE UP (his ruling of 10 October
 * 2026, which replaced research 140's "naming no agent maker"). Claude Code and
 * Codex CLI appear by their registry ids, so the app draws their real names and
 * icons as it draws any agent; the session names, the projects, the
 * conversations and every line of terminal output are fiction. No real session,
 * no path from anybody's machine, no person's name, no model name, no usage or
 * billing line, and no welcome banner: `sample.mjs --check` holds the composed
 * file to the deny list of §5.1.5, and a word that list refuses is changed HERE,
 * never removed from the list.
 *
 * THE SCREENS are tmux's `capture-pane -p -e` form: one string per row, SGR
 * escapes for the styles, 80 columns by 30 rows, drawn in each agent's own
 * shapes (Claude Code's input box and permission dialog; Codex CLI's approval
 * and prompt). Every styled piece resets the pen after itself, so no style is
 * carried from one row into the next.
 *
 * THE PROMPT'S SPACE. A screen with a prompt says where typed characters go
 * (`prompt.column`, the column after the agent's prefix) and the phone's echo
 * draws them as one run after the row's own runs, so the row's runs must cover
 * exactly that many cells. The composer drops a row's trailing blanks the way
 * `capture-pane -p` does, which would take the space after `❯` or `›` with it.
 * That space is therefore drawn with SGR 53 (overline): the composer keeps a
 * blank that carries an overline (src/main/screen/compose.ts `indexOf`'s
 * `droppable`) and the phone's style has no overline, so it draws a plain
 * space. `sample.mjs --check` clause 4 reads the composed row back and fails by
 * name if it ever covers anything but `column` cells.
 *
 * REMOVED (Phase 348, build/p348/SPEC.md D11, §4.2 step 9). Every session's
 * last variant is `removed`, after `ended`: the sample's Remove moves an ended
 * session there, and the composer lists no removed session (main's own
 * listing drops a removed record), so it leaves every list. A removed session
 * has no row, no answer of its own and no screen: nothing here describes it.
 *
 * PURE. It reads no clock, no file and no environment, and starts nothing. Its
 * one import is node's sha256, for the question ids.
 */

import { createHash } from 'node:crypto';

/** The fixed clock every answer is composed at: 2026-10-10T00:00:00Z. */
export const T = 1_791_590_400_000;

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The screen's size, and how many lines of history sit above it. */
export const COLS = 80;
export const ROWS = 30;
export const HISTORY = 60;

/** The two projects. Their paths are never drawn: two projects with distinct labels draw no folder. */
export const PROJECTS = Object.freeze([
  Object.freeze({ id: 'sample-project-lighthouse', path: '/sample/lighthouse', name: 'lighthouse' }),
  Object.freeze({ id: 'sample-project-orchard', path: '/sample/orchard', name: 'orchard' })
]);

/** What each variant's status is; `live` keeps the session's own start. A `removed` session has none: it is listed nowhere. */
export const VARIANT_STATUS = Object.freeze({ waiting: 'needs_input', answered: 'running', ended: 'exited' });

/** Phase 348: the variant after `ended`, which the sample's Remove moves a session to. */
export const REMOVED = 'removed';

/**
 * The five sessions (§5.1.1), in the order the state keys name them. `start` is
 * the status of the first variant; `pane` is the tmux pane a screen read would
 * name, which only `spaceOf` and the display line ever read.
 */
export const SESSIONS = Object.freeze([
  Object.freeze({
    id: 'sample-1',
    name: 'fix-login-redirect',
    agent: 'claude',
    project: 'lighthouse',
    start: 'needs_input',
    variants: Object.freeze(['waiting', 'answered', 'ended', 'removed']),
    createdAt: T - 3 * HOUR,
    lastOutputAt: T - 4 * MINUTE,
    waitingSince: T - 4 * MINUTE,
    pane: '%301'
  }),
  Object.freeze({
    id: 'sample-2',
    name: 'migrate-orders',
    agent: 'codex',
    project: 'orchard',
    start: 'needs_input',
    variants: Object.freeze(['waiting', 'answered', 'ended', 'removed']),
    createdAt: T - 2 * HOUR,
    lastOutputAt: T - 9 * MINUTE,
    waitingSince: T - 9 * MINUTE,
    pane: '%302'
  }),
  Object.freeze({
    id: 'sample-3',
    name: 'add-rate-limits',
    agent: 'claude',
    project: 'lighthouse',
    start: 'running',
    variants: Object.freeze(['live', 'ended', 'removed']),
    createdAt: T - 50 * MINUTE,
    lastOutputAt: T - 5 * SECOND,
    waitingSince: null,
    pane: '%303'
  }),
  Object.freeze({
    id: 'sample-4',
    name: 'tidy-readme',
    agent: 'codex',
    project: 'orchard',
    start: 'idle',
    variants: Object.freeze(['live', 'ended', 'removed']),
    createdAt: T - DAY,
    lastOutputAt: T - 40 * MINUTE,
    waitingSince: null,
    pane: '%304'
  }),
  Object.freeze({
    id: 'sample-5',
    name: 'bump-dependencies',
    agent: 'claude',
    project: 'lighthouse',
    start: 'exited',
    variants: Object.freeze(['ended', 'removed']),
    createdAt: T - 3 * DAY,
    lastOutputAt: T - 2 * DAY,
    waitingSince: null,
    pane: null
  })
]);

/** A session's status in one of its variants. */
export function statusOf(session, variant) {
  return variant === 'live' ? session.start : VARIANT_STATUS[variant];
}

/** The project a session is in. */
export function projectOf(session) {
  return PROJECTS.find((p) => p.name === session.project);
}

/** The row main would list for a session in one variant: a `Session`, on this Mac, ended cleanly when it ended. */
export function sessionRowOf(session, variant) {
  const status = statusOf(session, variant);
  const path = projectOf(session).path;
  return {
    id: session.id,
    name: session.name,
    tmuxName: session.name,
    projectPath: path,
    cwd: path,
    agent: session.agent,
    status,
    createdAt: session.createdAt,
    ...(status === 'exited' ? { exitCode: 0 } : {})
  };
}

/**
 * A session's question id (§5.1.2): the first 16 hex of sha256 over a public
 * label, then `-` and the count. The waiting screen's `turn` and the offer's
 * `question` are `-1`; the `answered` screen's `-2`, because the press moved
 * it, as the Mac's does.
 */
export function questionIdOf(sessionId, n) {
  const prefix = createHash('sha256').update(`tortie-p3333 sample ${sessionId}`, 'utf8').digest('hex').slice(0, 16);
  return `${prefix}-${String(n)}`;
}

// ---------------------------------------------------------------------------
// The questions, in each agent's own words and shape
// ---------------------------------------------------------------------------

/**
 * The two numbered questions (§5.1.1). `question` and `options` are what the
 * Mac's monitor reads off the waiting screen below (sample.mjs proves the
 * shipping detector reads exactly these back); `command` is the line the phone
 * draws under Codex CLI's question, and null for Claude Code.
 */
export const QUESTIONS = Object.freeze({
  'sample-1': Object.freeze({
    question: 'Do you want to make this edit to redirect.ts?',
    options: Object.freeze([
      Object.freeze({ marker: '1', text: 'Yes' }),
      Object.freeze({ marker: '2', text: 'Yes, allow all edits during this session (shift+tab)' }),
      Object.freeze({ marker: '3', text: 'No, and tell Claude what to do differently (esc)' })
    ]),
    command: null
  }),
  'sample-2': Object.freeze({
    question: 'Would you like to run the following command?',
    options: Object.freeze([
      Object.freeze({ marker: '1', text: 'Yes, proceed (y)' }),
      Object.freeze({ marker: '2', text: "Yes, and don't ask again for commands that start with `npm run` (p)" }),
      Object.freeze({ marker: '3', text: 'No, and tell Codex what to do differently (esc)' })
    ]),
    command: 'npm run migrate -- --plan'
  })
});

// ---------------------------------------------------------------------------
// The turns: plain prose, markdown off (his ruling of 2026-10-02)
// ---------------------------------------------------------------------------

/** Each session's turns, oldest first. An open turn's answer is null: the newest turn of a waiting or working session. */
export const TURNS = Object.freeze({
  'sample-1': Object.freeze([
    {
      ask: 'People who sign in from a shared link end up on the home page instead of the page they opened. Can you find out why?',
      answer:
        'The sign-in form drops the page a person came from. The handler reads it from the query string, but the form posts without it, so every sign-in falls back to the home page. The fix is to carry it through the form as a hidden field and read it in the handler.'
    },
    {
      ask: 'Write a failing test for it first.',
      answer: 'Added a test that signs in from a link and expects to land on that page. It fails today, which is the bug.'
    },
    {
      ask: 'Good. Now fix the form, and keep the change small.',
      answer:
        'The form now carries the page as a hidden field. The handler still ignores it, so the new test still fails; the handler is the next edit.'
    },
    { ask: 'Fix the handler too, then run the sign-in tests.', answer: null }
  ]),
  'sample-2': Object.freeze([
    {
      ask: 'Plan a migration that stores order amounts in whole cents instead of decimals.',
      answer:
        'Four steps, each one reversible: add an amount_cents column, backfill it from the old amounts, switch every read to it, and drop the old column in a later release once nothing reads it.'
    },
    {
      ask: 'How long would the backfill take on a large table?',
      answer:
        'About four minutes for two million orders at a thousand a batch, timed on a local copy filled with generated orders. Each batch commits on its own, so it can stop and carry on where it left off.'
    },
    {
      ask: 'Write the first two steps as migrations.',
      answer:
        'Added two migrations. The first adds amount_cents; the second backfills it in batches of a thousand orders, so the table stays available while it runs.'
    },
    { ask: 'Check them against the local database and show me the plan.', answer: null }
  ]),
  'sample-3': Object.freeze([
    {
      ask: 'Add a rate limit to the sign-in endpoint: five tries a minute for each address.',
      answer:
        'Added a small fixed-window limiter in front of the sign-in handler. Over the limit it answers 429 with a Retry-After header, and the window is kept in memory.'
    },
    {
      ask: 'Cover it with tests, including the window resetting after a minute.',
      answer: 'Four tests cover it now: under the limit, at it, over it, and the window resetting on a fake clock. All four pass.'
    },
    {
      ask: 'Does the limit survive a restart?',
      answer:
        'No. The window lives in memory, so a restart clears it. With one server that is fine; with several, the window would need a shared store.'
    },
    { ask: 'Now apply the same limit to password resets.', answer: null }
  ]),
  'sample-4': Object.freeze([
    {
      ask: 'The README still describes the old setup. Bring it up to date.',
      answer: 'Rewrote Getting started for the current scripts and removed the section about the retired config file.'
    },
    {
      ask: 'Make the examples copyable: no prompt characters in front of the commands.',
      answer: 'Removed the leading prompt from every example, so each block pastes as it is.'
    },
    {
      ask: 'Add a short Troubleshooting section for the two questions people ask most.',
      answer:
        'Added Troubleshooting with two entries: a port that is already in use, and a stale lockfile after switching branches.'
    },
    {
      ask: 'Check that the links in the README still point somewhere.',
      answer: 'All eleven links resolve. Two pointed at an old page of the docs and now point at the new one.'
    },
    {
      ask: 'Put a table of contents at the top.',
      answer: 'Added a table of contents with the five sections, each one a link to its heading.'
    },
    {
      ask: 'Run the docs check once more to be sure it is clean.',
      answer: 'The docs check is clean: every link resolves and nothing warns.'
    }
  ]),
  'sample-5': Object.freeze([
    {
      ask: 'Bump the test runner and the date library to their latest minor versions.',
      answer: 'Both are bumped in the lockfile, and the whole suite passes on the new versions.'
    },
    {
      ask: 'Anything in their release notes we should act on?',
      answer:
        'One thing: the date library now warns when a time zone name is unknown. We never pass one, so nothing changes for us.'
    },
    {
      ask: 'Good. Write a one-line changelog entry.',
      answer: 'Added: Updated the test runner and the date library to their latest minor versions.'
    }
  ])
});

/** An ISO clock from epoch ms, to the second. */
function iso(ms) {
  return new Date(Math.round(ms / SECOND) * SECOND).toISOString();
}

/**
 * A session's turns as the overview store would hold them (`StoredTurn`): each
 * ask placed through the session's life and each answer after it, the newest
 * closed answer landing at the session's last output. Nothing is redacted,
 * because nothing here was ever a secret.
 */
export function storedTurnsOf(session) {
  const turns = TURNS[session.id];
  const span = session.lastOutputAt - session.createdAt;
  const n = turns.length;
  return turns.map((turn, index) => {
    const askAt = session.createdAt + Math.round((span * (index + 0.2)) / n);
    const answerAt = session.createdAt + Math.round((span * (index + 1)) / n);
    const closed = turn.answer !== null;
    return {
      sessionId: session.id,
      index,
      askText: turn.ask,
      askAt: iso(askAt),
      answerText: turn.answer,
      answerAt: closed ? iso(answerAt) : null,
      queued: 0,
      closed,
      interrupted: false,
      notice: null,
      stopReason: null,
      durationMs: null,
      paths: [],
      pathSource: 'text-only',
      gitVerdict: null,
      gitCheckedAt: null
    };
  });
}

/** The counts a refresh answers for a session (`OverviewSessionActivity`), agreeing with its turns. */
export function activityCountsOf(session) {
  const turns = storedTurnsOf(session);
  const last = turns[turns.length - 1];
  const lastAt = Date.parse(last.answerAt ?? last.askAt);
  return {
    sessionId: session.id,
    coverage: 'complete',
    reason: null,
    userMessages: turns.length,
    agentMessages: turns.filter((t) => t.closed).length,
    lastMessageAt: lastAt,
    lastMessageBy: last.closed ? 'agent' : 'you',
    lastMessageClock: 'message',
    readAt: T
  };
}

// ---------------------------------------------------------------------------
// Drawing: SGR pieces, each resetting the pen after itself
// ---------------------------------------------------------------------------

const ESC = String.fromCharCode(0x1b);
const sgr = (codes) => `${ESC}[${codes}m`;
const RESET = sgr('0');
/** `text` drawn in `codes`, the pen reset after it. */
const paint = (codes, text) => `${sgr(codes)}${text}${RESET}`;

/** Claude Code's secondary grey, its rules, its accent, its success dot, its selection, and the two diff grounds. */
const GREY = '38;5;246';
const RULE_GREY = '38;5;244';
const ACCENT = '38;5;174';
const DOT = '32';
const SELECTED = '38;5;153';
const DELETED = '48;5;52';
const ADDED = '48;5;22';
/** Codex CLI's dim, its bold, its cyan selection, and its counts. */
const DIM = '2';
const BOLD = '1';
const CYAN = '36';
const GREEN = '32';
const RED = '31';

/** A blank the composer keeps and the phone draws as a plain space (the header's "THE PROMPT'S SPACE"). */
const KEPT_SPACE = `${sgr('53')} ${sgr('55')}`;

/** Words wrapped to `width`, on spaces. */
function wrap(text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line === '') line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

/** A block: a first-line prefix, a continuation prefix two cells wide, the words wrapped to the screen, then a blank row. */
function block(first, text, width = COLS - 4) {
  return [...wrap(text, width).map((line, i) => (i === 0 ? `${first}${line}` : `  ${line}`)), ''];
}

const rule = (glyph, codes) => paint(codes, glyph.repeat(COLS));

// Claude Code's shapes.
const you = (text) => block(`❯ `, text);
const says = (text) => block(`⏺ `, text);
const tool = (name, arg) => `${paint(DOT, '⏺')} ${paint(BOLD, name)}(${arg})`;
const result = (text) => `  ${paint(GREY, '⎿')}  ${paint(GREY, text)}`;
const diff = (n, mark, code) => {
  const number = `      ${paint(GREY, String(n).padStart(2, ' '))} `;
  if (mark === '-') return `${number}${paint(DELETED, `-${code}`)}`;
  if (mark === '+') return `${number}${paint(ADDED, `+${code}`)}`;
  return `${number} ${code}`;
};
const working = (text) => `${paint(ACCENT, '✻')} ${paint(ACCENT, text)} ${paint(GREY, '(esc to interrupt)')}`;
/** Claude Code's input box at the foot of the screen: the rule, the prompt, the rule, the hint. */
const claudeBox = () => [rule('─', RULE_GREY), `❯${KEPT_SPACE}`, rule('─', RULE_GREY), `  ${paint(GREY, '? for shortcuts')}`];

// Codex CLI's shapes.
const youCx = (text) => block(`${paint(BOLD, '›')} `, text);
const saysCx = (text) => block('• ', text);
const ranCx = (command, output) => [
  `• ${paint(BOLD, 'Ran')} ${command}`,
  ...output.map((line, i) => (i === 0 ? `  └ ${paint(DIM, line)}` : `    ${paint(DIM, line)}`)),
  ''
];
const exploredCx = (lines) => [
  `• ${paint(BOLD, 'Explored')}`,
  ...lines.map((line, i) => (i === 0 ? `  └ ${paint(DIM, line)}` : `    ${paint(DIM, line)}`)),
  ''
];
const editedCx = (file, added, removed) => [
  `• ${paint(BOLD, 'Edited')} ${file} (${paint(GREEN, `+${String(added)}`)} ${paint(RED, `-${String(removed)}`)})`,
  ''
];
const workingCx = (text) => `${paint(DIM, '◦')} ${paint(BOLD, text)} ${paint(DIM, '(esc to interrupt)')}`;
/** Codex CLI's prompt at the foot of the screen: the prompt, a blank, the hint. */
const codexBox = () => [`${paint(BOLD, '›')}${KEPT_SPACE}`, '', `  ${paint(DIM, '? for shortcuts')}`];

/** The style a typed character takes on each agent's prompt, and the one Return's line is drawn in. */
const CLAUDE_ECHO = Object.freeze({ typed: '', note: GREY });
const CODEX_ECHO = Object.freeze({ typed: '', note: DIM });

// ---------------------------------------------------------------------------
// The conversations as the terminal drew them
// ---------------------------------------------------------------------------

/** sample-1, fix-login-redirect: everything before the edit it asks about. */
const S1_TRANSCRIPT = [
  ...you(TURNS['sample-1'][0].ask),
  ...says("I'll trace the sign-in flow from the form to the handler."),
  tool('Search', 'pattern: "next", path: "src/auth"'),
  result('Found 4 files (ctrl+o to expand)'),
  '',
  tool('Read', 'src/auth/form.tsx'),
  result('Read 62 lines (ctrl+o to expand)'),
  '',
  tool('Read', 'src/auth/redirect.ts'),
  result('Read 41 lines (ctrl+o to expand)'),
  '',
  tool('Read', 'src/auth/form.test.ts'),
  result('Read 88 lines (ctrl+o to expand)'),
  '',
  tool('Read', 'src/auth/session.ts'),
  result('Read 73 lines (ctrl+o to expand)'),
  '',
  tool('Bash', 'npm test -- auth'),
  result('PASS  src/auth/session.test.ts'),
  `     ${paint(GREY, 'PASS  src/auth/form.test.ts')}`,
  `     ${paint(GREY, 'Tests: 18 passed, 18 total')}`,
  '',
  ...says(
    'The tests pass because none of them signs in from a link. The handler reads the page a person came from out of the query string, but the sign-in form posts without it, so every sign-in falls back to the home page.'
  ),
  ...says('The fix is to carry it through the form as a hidden field and read it in the handler.'),
  ...you(TURNS['sample-1'][1].ask),
  tool('Update', 'src/auth/form.test.ts'),
  result('Updated src/auth/form.test.ts with 6 additions'),
  diff(84, '+', "  it('returns to the page a link opened', async () => {"),
  diff(85, '+', '    const page = await signInFrom(orderLink)'),
  diff(86, '+', '    expect(page.url).toBe(orderLink)'),
  diff(87, '+', '  })'),
  '',
  tool('Bash', 'npm test -- auth'),
  result('FAIL  src/auth/form.test.ts'),
  `     ${paint(GREY, 'returns to the page a link opened')}`,
  `     ${paint(GREY, 'Tests: 1 failed, 18 passed, 19 total')}`,
  '',
  ...says(TURNS['sample-1'][1].answer),
  ...you(TURNS['sample-1'][2].ask),
  tool('Update', 'src/auth/form.tsx'),
  result('Updated src/auth/form.tsx with 1 addition'),
  diff(27, ' ', '    <form method="post" action={signInAction}>'),
  diff(28, '+', '      <input type="hidden" name="next" value={next} />'),
  diff(29, ' ', '      <EmailField />'),
  '',
  tool('Bash', 'npm test -- auth'),
  result('FAIL  src/auth/form.test.ts'),
  `     ${paint(GREY, 'returns to the page a link opened')}`,
  `     ${paint(GREY, 'Tests: 1 failed, 18 passed, 19 total')}`,
  '',
  ...says(TURNS['sample-1'][2].answer),
  ...you(TURNS['sample-1'][3].ask),
  tool('Read', 'src/auth/redirect.ts'),
  result('Read 41 lines (ctrl+o to expand)'),
  '',
  ...says(
    'The handler should take the hidden field first, and fall back to the home page only when the field is missing or names another site.'
  ),
  tool('Update', 'src/auth/redirect.ts')
];

/** sample-1's edit, as the dialog draws it and as the edit landed. */
const S1_EDIT = [
  [12, ' ', 'export function afterSignIn(request: Request, form: FormData) {'],
  [13, '-', '  return redirectTo(home)'],
  [13, '+', "  const next = safeNext(form.get('next'))"],
  [14, '+', '  return redirectTo(next ?? home)'],
  [15, ' ', '}']
];

/** Claude Code's permission dialog for that edit (§5.1.1): the rule, the file, the edit, the question, three options and the hint. */
function s1Dialog() {
  const q = QUESTIONS['sample-1'];
  return [
    rule('─', RULE_GREY),
    ` ${paint(BOLD, 'Edit file')}`,
    ` src/auth/redirect.ts`,
    rule('╌', RULE_GREY),
    ...S1_EDIT.map(([n, mark, code]) =>
      mark === '-'
        ? ` ${paint(GREY, String(n))} ${paint(DELETED, `-${code}`)}`
        : mark === '+'
          ? ` ${paint(GREY, String(n))} ${paint(ADDED, `+${code}`)}`
          : ` ${paint(GREY, String(n))}  ${code}`
    ),
    rule('╌', RULE_GREY),
    ` ${q.question}`,
    ` ${paint(SELECTED, `❯ 1. ${q.options[0].text}`)}`,
    `   2. ${q.options[1].text}`,
    `   3. ${q.options[2].text}`,
    '',
    ` ${paint(GREY, 'Esc to cancel · Tab to amend')}`
  ];
}

/** sample-1 after the press: the edit lands and the tests start. */
const S1_CARRYING_ON = [
  result('Updated src/auth/redirect.ts with 2 additions and 1 removal'),
  ...S1_EDIT.map(([n, mark, code]) => diff(n, mark, code)),
  '',
  tool('Bash', 'npm test -- auth'),
  result('Running…'),
  '',
  working('Running the sign-in tests…')
];

/** sample-2, migrate-orders: everything before the command it asks to run. */
const S2_TRANSCRIPT = [
  ...youCx(TURNS['sample-2'][0].ask),
  ...exploredCx(['Read schema.sql, orders.ts, amounts.ts', 'Search amount in src']),
  ...ranCx('rg --count amount src', [
    'src/orders/amounts.ts:9',
    'src/orders/invoice.ts:4',
    'src/orders/refund.ts:3',
    'src/reports/daily.ts:2'
  ]),
  ...saysCx(
    'Amounts are read in four places. Invoices and refunds each round on their own, so moving them to cents also retires two rounding helpers.'
  ),
  ...saysCx('Plan, in four steps that can each be rolled back on their own:'),
  '  - add an amount_cents column next to amount',
  '  - backfill it from the old amounts, rounding half up',
  '  - switch every read to amount_cents',
  '  - drop amount in a later release, once nothing reads it',
  '',
  ...saysCx(
    'Orders keep their old amount while the backfill runs, so nothing that reads them has to change until the third step.'
  ),
  ...youCx(TURNS['sample-2'][1].ask),
  ...exploredCx(['Read scripts/seed.ts', 'Search batch in scripts']),
  ...ranCx('npm run db:seed -- --orders 2000000', ['seeded 2000000 orders into the local copy']),
  ...ranCx('npm run db:backfill -- --dry-run --batch 1000', ['2000 batches', 'took 3m 52s']),
  ...saysCx(TURNS['sample-2'][1].answer),
  ...youCx(TURNS['sample-2'][2].ask),
  ...editedCx('migrations/0042_add_amount_cents.sql', 7, 0),
  ...editedCx('migrations/0043_backfill_amount_cents.ts', 31, 0),
  ...editedCx('migrations/amounts.test.ts', 26, 0),
  ...ranCx('npm test -- migrations', ['PASS  migrations/amounts.test.ts', 'Tests: 6 passed, 6 total']),
  ...saysCx(TURNS['sample-2'][2].answer),
  ...saysCx(
    'Both run through the migrate script, so each one is recorded when it lands and can be rolled back with the same command.'
  ),
  ...youCx(TURNS['sample-2'][3].ask),
  ...exploredCx(['Read package.json, migrate.config.ts', 'Read migrations/0041_orders.sql']),
  ...ranCx('npm run migrate -- --status', [
    '0041_orders applied',
    '0042_add_amount_cents pending',
    '0043_backfill_amount_cents pending'
  ]),
  ...saysCx('The migrate script can print its plan without touching a table. I will run it that way first.'),
  `• ${paint(BOLD, 'Running')} ${QUESTIONS['sample-2'].command}`
];

/** Codex CLI's command approval (§5.1.1): the question, the reason, the command, three options and the hint. */
function s2Dialog() {
  const q = QUESTIONS['sample-2'];
  return [
    '',
    '',
    `  ${paint(BOLD, q.question)}`,
    '',
    `  Reason: ${paint(DIM, 'Show the plan for the two new migrations without changing a table')}`,
    '',
    `  $ ${q.command}`,
    '',
    '',
    `${paint(CYAN, `› 1. ${q.options[0].text}`)}`,
    `  2. ${q.options[1].text}`,
    `  3. ${q.options[2].text}`,
    '',
    `  ${paint(DIM, 'Press enter to confirm or esc to cancel')}`
  ];
}

/**
 * sample-2 after the press: the command's `Running` row becomes its `Ran` row,
 * as Codex CLI redraws it, the plan prints, and Codex reads it.
 */
const S2_CARRYING_ON = [
  ...ranCx(QUESTIONS['sample-2'].command, [
    'plan: 0042_add_amount_cents (add column, no rewrite)',
    'plan: 0043_backfill_amount_cents (batches of 1000)',
    'checked against the local copy',
    'nothing applied'
  ]),
  ...saysCx(
    'The plan matches the two migrations: the new column first, then the backfill in batches of a thousand. Nothing was applied, so every table is as it was, and the backfill can be timed again before it runs.'
  ),
  workingCx('Working')
];

/** sample-3, add-rate-limits: working on its fourth turn. */
const S3_TRANSCRIPT = [
  ...you(TURNS['sample-3'][0].ask),
  tool('Read', 'src/auth/signin.ts'),
  result('Read 58 lines (ctrl+o to expand)'),
  '',
  ...says(
    'A fixed window is enough here: count the tries for each address in the current minute and refuse past five. It needs no new dependency and keeps the handler unchanged.'
  ),
  tool('Write', 'src/auth/limit.ts'),
  result('Wrote 34 lines to src/auth/limit.ts'),
  '',
  tool('Update', 'src/auth/signin.ts'),
  result('Updated src/auth/signin.ts with 3 additions'),
  diff(8, ' ', "import { verify } from './verify'"),
  diff(9, '+', "import { fixedWindow } from './limit'"),
  diff(10, '+', ''),
  diff(11, '+', 'const limit = fixedWindow({ tries: 5, windowMs: 60_000 })'),
  '',
  tool('Bash', 'npm test -- auth'),
  result('PASS  src/auth/signin.test.ts'),
  `     ${paint(GREY, 'PASS  src/auth/session.test.ts')}`,
  `     ${paint(GREY, 'PASS  src/auth/form.test.ts')}`,
  `     ${paint(GREY, 'Tests: 24 passed, 24 total')}`,
  '',
  ...says(TURNS['sample-3'][0].answer),
  ...you(TURNS['sample-3'][1].ask),
  tool('Update', 'src/auth/limit.ts'),
  result('Updated src/auth/limit.ts with 2 additions and 1 removal'),
  diff(5, '-', 'export function fixedWindow({ tries, windowMs }: Limits) {'),
  diff(5, '+', 'export function fixedWindow({ tries, windowMs }: Limits, clock = Date) {'),
  diff(6, '+', '  const now = () => clock.now()'),
  '',
  tool('Write', 'src/auth/limit.test.ts'),
  result('Wrote 52 lines to src/auth/limit.test.ts'),
  '',
  tool('Bash', 'npm test -- limit'),
  result('PASS  src/auth/limit.test.ts'),
  `     ${paint(GREY, 'allows five tries in a minute')}`,
  `     ${paint(GREY, 'answers the sixth with 429 and Retry-After')}`,
  `     ${paint(GREY, 'keeps counting while the window is full')}`,
  `     ${paint(GREY, 'opens again when the window resets')}`,
  `     ${paint(GREY, 'Tests: 4 passed, 4 total')}`,
  '',
  ...says(TURNS['sample-3'][1].answer),
  ...you(TURNS['sample-3'][2].ask),
  tool('Read', 'src/auth/limit.ts'),
  result('Read 34 lines (ctrl+o to expand)'),
  '',
  tool('Read', 'src/server.ts'),
  result('Read 29 lines (ctrl+o to expand)'),
  '',
  ...says(TURNS['sample-3'][2].answer),
  ...you(TURNS['sample-3'][3].ask),
  tool('Search', 'pattern: "reset", path: "src/auth"'),
  result('Found 3 files (ctrl+o to expand)'),
  '',
  tool('Read', 'src/auth/reset.ts'),
  result('Read 47 lines (ctrl+o to expand)'),
  '',
  tool('Read', 'src/auth/reset.test.ts'),
  result('Read 61 lines (ctrl+o to expand)'),
  '',
  ...says(
    'Password resets go through their own handler, so the limiter can sit in front of it the same way. I will key it by address, as sign-in does.'
  ),
  tool('Update', 'src/auth/reset.ts'),
  result('Updated src/auth/reset.ts with 3 additions'),
  diff(3, ' ', "import { sendResetLink } from './mail'"),
  diff(4, '+', "import { fixedWindow } from './limit'"),
  diff(5, '+', ''),
  diff(6, '+', 'const limit = fixedWindow({ tries: 5, windowMs: 60_000 })'),
  '',
  working('Applying the same limit to password resets…')
];

/** sample-4, tidy-readme: idle after its sixth turn. */
const S4_TRANSCRIPT = [
  ...youCx(TURNS['sample-4'][0].ask),
  ...exploredCx(['Read README.md, package.json', 'List docs']),
  ...ranCx('npm run', ['dev, build, test, lint, docs:links, docs:check']),
  ...saysCx(
    'The README still tells people to copy a config file that the setup script now writes for them, and it names two scripts that no longer exist.'
  ),
  ...editedCx('README.md', 24, 31),
  ...ranCx('npm run docs:check', ['checked 9 links', 'no warnings']),
  ...saysCx(TURNS['sample-4'][0].answer),
  ...youCx(TURNS['sample-4'][1].ask),
  ...exploredCx(['Search prompt characters in README.md']),
  ...editedCx('README.md', 9, 9),
  ...saysCx(TURNS['sample-4'][1].answer),
  ...youCx(TURNS['sample-4'][2].ask),
  ...exploredCx(['Read docs/faq.md', 'Search port in docs']),
  ...saysCx(
    'The two that come up most are a port that is already taken when the dev server starts, and a lockfile left over from another branch.'
  ),
  ...editedCx('README.md', 14, 0),
  ...editedCx('docs/faq.md', 1, 0),
  ...saysCx(TURNS['sample-4'][2].answer),
  ...youCx(TURNS['sample-4'][3].ask),
  ...exploredCx(['Read README.md', 'Search links in README.md']),
  ...ranCx('npm run docs:links', ['checked 11 links', '2 moved, 0 missing']),
  ...editedCx('README.md', 2, 2),
  ...saysCx(TURNS['sample-4'][3].answer),
  ...saysCx('The other nine already pointed at pages that exist, so they are unchanged.'),
  ...youCx(TURNS['sample-4'][4].ask),
  ...exploredCx(['Read README.md']),
  ...ranCx('npm run docs:toc', ['wrote 5 entries']),
  ...editedCx('README.md', 8, 0),
  ...saysCx(TURNS['sample-4'][4].answer),
  ...youCx(TURNS['sample-4'][5].ask),
  ...ranCx('npm run docs:check', ['checked 16 links', '0 moved, 0 missing', 'no warnings']),
  ...saysCx(TURNS['sample-4'][5].answer)
];

/**
 * A transcript cut into its history and the top of its screen: the first
 * `HISTORY` lines are the history and the rest the top of the screen. The
 * transcripts are WRITTEN to exactly that length, so nothing is cut or padded
 * and history row 0 is the conversation's first ask; a length that does not
 * add up is refused by name rather than padded.
 */
function split(sessionId, transcript, top) {
  exact(sessionId, 'transcript', transcript, HISTORY + top);
  return { history: transcript.slice(0, HISTORY), top: transcript.slice(HISTORY) };
}

/** Refuses, by name, a list of rows that is not exactly `n` long. */
function exact(sessionId, what, rows, n) {
  if (rows.length !== n) {
    throw new Error(`world: ${sessionId}'s ${what} is ${String(rows.length)} rows, and the screen needs exactly ${String(n)}`);
  }
  return rows;
}

/**
 * One captured screen: its rows, the display a read would have framed it with
 * (`#{pane_id}` to `#{history_size}`, tab separated, as `SCREEN_FORMAT` asks),
 * and, for a screen with a prompt, where typed characters go and where
 * Return's line is drawn, with the SGR each is drawn in.
 */
function capture(session, rows, cursor, prompt, note) {
  return {
    styled: rows.join('\n'),
    rows,
    displayLine: [session.pane, String(COLS), String(ROWS), String(cursor.x), String(cursor.y), cursor.visible ? '1' : '0', '0', String(HISTORY)].join('\t'),
    prompt,
    note
  };
}

/** A screen with the agent's prompt at its foot: content, the empty note row, then the agent's own box. */
function promptScreen(session, content, box, promptAt, echo) {
  const rows = [...content, '', ...box];
  const noteRow = content.length;
  const promptRow = noteRow + promptAt;
  return capture(
    session,
    rows,
    { x: 2, y: promptRow, visible: true },
    { row: promptRow, column: 2, sgr: echo.typed },
    { row: noteRow, sgr: echo.note }
  );
}

/** A screen at a question: content then the dialog, the cursor hidden where the agent left it, no prompt. */
function questionScreen(session, content, dialog) {
  const rows = [...content, ...dialog];
  return capture(session, rows, { x: 0, y: ROWS - 1, visible: false }, null, null);
}

/** Rows in a Claude Code box screen besides the content: the note row and the box. */
const CLAUDE_FOOT = 1 + 4;
/** The same for Codex CLI. */
const CODEX_FOOT = 1 + 3;

/**
 * The made-up captures, keyed by session then variant (§5.1.1): one live
 * capture per live session and one `answered` capture per waiting session, and
 * each live session's history (60 lines, the screen's own width). An `ended`
 * variant has no capture: the session has no terminal.
 *
 * A waiting session's two screens sit under ONE history: the `answered`
 * screen keeps the waiting screen's top rows and draws the agent carrying on
 * where the dialog was, so the history above both is the same 60 lines in the
 * same pane (§5.1.4 clause 4: one `space`, one depth).
 */
export function capturesOf(session) {
  switch (session.id) {
    case 'sample-1': {
      const dialog = s1Dialog();
      const { history, top } = split(session.id, S1_TRANSCRIPT, ROWS - dialog.length);
      const content = exact(session.id, 'answered content', [...top, ...S1_CARRYING_ON], ROWS - CLAUDE_FOOT);
      return {
        history,
        waiting: questionScreen(session, top, dialog),
        answered: promptScreen(session, content, claudeBox(), 2, CLAUDE_ECHO)
      };
    }
    case 'sample-2': {
      const dialog = s2Dialog();
      const { history, top } = split(session.id, S2_TRANSCRIPT, ROWS - dialog.length);
      // The last row of the top is the command's `Running` row, which the press redraws.
      const content = exact(session.id, 'answered content', [...top.slice(0, -1), ...S2_CARRYING_ON], ROWS - CODEX_FOOT);
      return {
        history,
        waiting: questionScreen(session, top, dialog),
        answered: promptScreen(session, content, codexBox(), 1, CODEX_ECHO)
      };
    }
    case 'sample-3': {
      const { history, top } = split(session.id, S3_TRANSCRIPT, ROWS - CLAUDE_FOOT);
      return { history, live: promptScreen(session, top, claudeBox(), 2, CLAUDE_ECHO) };
    }
    case 'sample-4': {
      const { history, top } = split(session.id, S4_TRANSCRIPT, ROWS - CODEX_FOOT);
      return { history, live: promptScreen(session, top, codexBox(), 1, CODEX_ECHO) };
    }
    default:
      return { history: null };
  }
}
