/**
 * The demo's canned terminal content: one agent transcript that auto-plays
 * (the hero moment) and one interactive shell prompt.
 *
 * ANSI only — no tmux. The real app attaches xterm to a tmux client; here
 * the bytes just have to look like a working session.
 */
import type { ScriptStep } from './term-engine';

const R = '\x1b[0m';
const DIM = '\x1b[2m';
const B = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';

const CRLF = '\r\n';

function lines(...xs: string[]): string {
  return xs.join(CRLF) + CRLF;
}

/** An agent mid-run: what a visitor should see within the first seconds. */
export const AGENT_SCRIPT: ScriptStep[] = [
  {
    delay: 300,
    text: lines(
      `${DIM}$${R} claude "fix the flaky retry test in queue.test.ts"`,
      ''
    )
  },
  {
    delay: 700,
    text: lines(
      `${MAGENTA}✳${R} ${B}Reading queue.test.ts…${R}`
    )
  },
  {
    delay: 1400,
    text: lines(
      '',
      `  The test asserts on wall-clock ordering: it enqueues two jobs with a`,
      `  5ms delay and expects strict completion order. Under CI load the`,
      `  first job's timer can fire late.`
    )
  },
  {
    delay: 1200,
    text: lines(
      '',
      `${MAGENTA}✳${R} ${B}Editing src/queue.ts${R}  ${DIM}+7 -2${R}`
    )
  },
  {
    delay: 900,
    text: lines(
      `  ${GREEN}+${R} ${DIM}// completion order is the queue's promise, not the timer's${R}`,
      `  ${GREEN}+${R} await previous.settled;`,
      `  ${DIM}…${R}`
    )
  },
  {
    delay: 1100,
    text: lines('', `${MAGENTA}✳${R} ${B}Running tests…${R}`)
  },
  {
    delay: 1600,
    text: lines(
      '',
      `  ${GREEN}✓${R} queue retries the failed job once      ${DIM}12ms${R}`,
      `  ${GREEN}✓${R} queue preserves completion order       ${DIM}9ms${R}`,
      `  ${GREEN}✓${R} queue drops poisoned jobs after 3      ${DIM}14ms${R}`,
      '',
      `  ${B}Tests: ${GREEN}3 passed${R}${B}, 0 failed${R}`
    )
  },
  {
    delay: 800,
    text: lines(
      '',
      `${CYAN}●${R} Fixed. The test raced its own timers; ordering now comes from`,
      `  the queue itself. Ready to commit when you are.`
    )
  }
];

/** A second transcript for the heron project: codex mid-feature. */
export const CODEX_SCRIPT: ScriptStep[] = [
  {
    delay: 400,
    text: lines(`${DIM}$${R} codex "add a day-3 check-in email to onboarding"`, '')
  },
  {
    delay: 900,
    text: lines(`${CYAN}◆${R} ${B}Reading app/onboarding/welcome.ts…${R}`)
  },
  {
    delay: 1300,
    text: lines(
      '',
      `  The welcome email sends on signup and nothing follows it. I'll add a`,
      `  scheduled check-in through lib/schedule so it cancels itself if the`,
      `  user is already active.`
    )
  },
  {
    delay: 1200,
    text: lines(
      '',
      `${CYAN}◆${R} ${B}Editing app/onboarding/welcome.ts${R}  ${DIM}+3 -0${R}`,
      `  ${GREEN}+${R} import { schedule } from '../lib/schedule';`,
      `  ${GREEN}+${R} await schedule(userId, 'day-3-checkin', { days: 3 });`
    )
  },
  {
    delay: 1400,
    text: lines(
      '',
      `${CYAN}◆${R} ${B}Editing lib/schedule.ts${R}  ${DIM}+9 -0${R}`,
      `  ${DIM}new helper: POST /api/schedule with a day-count delay${R}`,
      '',
      `${YELLOW}●${R} Two files changed. Want me to wire the cancel-on-activity`,
      `  check next, or is scheduling enough for this branch?`
    )
  }
];

/**
 * A restored session's opening bytes: the saved scrollback replayed as inert
 * history, then the recorded resume command TYPED at the prompt but never
 * run — Tortie's rule is that the person presses Enter.
 */
export function restoredScript(prompt: string, resumeCommand: string): ScriptStep[] {
  return [
    {
      delay: 250,
      text: lines(
        `${DIM}── saved scrollback from before the reboot ─────────────────${R}`,
        `${DIM}✳ Drafting docs/launch-post.md…${R}`,
        `${DIM}  The opening line should say what stays true when the window${R}`,
        `${DIM}  closes. Working titles are in the doc.${R}`,
        `${DIM}────────────────────────────────────────────────────────────${R}`,
        ''
      )
    },
    {
      delay: 700,
      text: prompt + resumeCommand
    }
  ];
}

/** The interactive prompt's canned answers. */
export const SHELL_PROMPT = `${CYAN}tortie-demo${R} ${DIM}~/rookery${R} ${B}❯${R} `;

/** Per-project shell prompt. */
export function shellPrompt(dir: string): string {
  return `${CYAN}tortie-demo${R} ${DIM}${dir}${R} ${B}❯${R} `;
}

/** What a freshly created demo AGENT session says, per agent. */
export function newAgentScript(agent: string, projectDir: string): ScriptStep[] {
  const glyph = agent === 'codex' ? `${CYAN}◆${R}` : `${MAGENTA}✳${R}`;
  return [
    {
      delay: 300,
      text: lines(`${DIM}$${R} ${agent}`, '')
    },
    {
      delay: 700,
      text: lines(
        `${glyph} ${B}Ready in ${projectDir}.${R} This is the tortie.sh demo, so I'm`,
        `  a stand-in — type something and press Enter to see the flow.`,
        ''
      )
    }
  ];
}

/** The stand-in agent's reply to anything typed at it. */
export const AGENT_DEFAULT_REPLY = [
  `\x1b[35m✳\x1b[0m Noted — in the real Tortie this is where the agent would get to`,
  `  work on "{input}", and the session would keep running even if you`,
  `  closed the window.`
].join('\n');

export const SHELL_COMMANDS: Record<string, string> = {
  ls: `${CYAN}src${R}  ${CYAN}test${R}  package.json  README.md  tsconfig.json`,
  pwd: '/Users/you/rookery',
  'git status': [
    'On branch main',
    'Changes not staged for commit:',
    `  ${YELLOW}modified:   src/queue.ts${R}`,
    '',
    'no changes added to commit'
  ].join('\n'),
  whoami: 'you — trying Tortie in a browser. Nothing here touches your machine.',
  help: `This shell is part of the tortie.sh demo. Try: ls, pwd, git status, whoami`
};
