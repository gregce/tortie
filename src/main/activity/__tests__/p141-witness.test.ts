/**
 * Phase 141 — the witness, as pure rules with no tmux server behind them.
 *
 * The one that matters most is the last describe block. A session Tortie has
 * just restored, sitting with its command armed and unpressed, has the same
 * screen and the same process table as a session whose agent has left, and
 * three designs died on that fact. Here it is written down as cases: no
 * witness, no drop, no verb, whatever the shape says.
 */

import { describe, expect, it } from 'vitest';
import { parseClaudeSessionFile } from '../claude-registry';
import {
  foregroundChildOf,
  holdsTerminal,
  parseProcTable,
  parseWitnessLine,
  witnessFromSnapshot
} from '../process';
import {
  commandNamesAgent,
  dropIsSafeToDeclare,
  freshState,
  needsReturnBaseline,
  noteAgentLeft,
  noteHandbackResolved,
  noteReturn,
  noteWitness,
  offersResume,
  returnTriggered,
  witnessCandidate,
  witnessEligible,
  witnessVerdict,
  type ClaudeLookup
} from '../state-machine';
import type { PaneFacts } from '../panes';
import type { AgentActivityProfile } from '../../agents/registry';

const NOW = 1_800_000_000_000;

const pane = (over: Partial<PaneFacts> = {}): PaneFacts => ({
  tmuxId: '$1',
  paneId: '%1',
  panePid: 500,
  active: true,
  dead: false,
  activityAt: NOW,
  currentCommand: 'zsh',
  keypad: true,
  alternate: false,
  inMode: false,
  historySize: 10,
  historyLimit: 25_000,
  title: 'auth',
  ...over
});

const CLAUDE_PROFILE: AgentActivityProfile = {
  tier: 'native',
  native: 'claude-session-registry',
  animatesWhenIdle: false,
  verified: 'verified'
};

const CODEX_PROFILE: AgentActivityProfile = {
  tier: 'native',
  native: 'pane-title-oracle',
  animatesWhenIdle: false,
  verified: 'verified'
};

const emptyClaude: ClaudeLookup = {
  forPane: () => undefined,
  unmapped: () => []
};

/** `ps -axo pid=,ppid=,time=,stat=` lines, as the fleet reader parses them. */
const table = (rows: string): ReturnType<typeof parseProcTable> =>
  parseProcTable(rows, NOW);

describe('the command line is what makes the witness a NAMED process', () => {
  it('matches a bare name and an absolute path', () => {
    expect(commandNamesAgent('codex', ['codex'])).toBe(true);
    expect(commandNamesAgent('/Users/g/.local/bin/codex resume', ['codex'])).toBe(
      true
    );
  });

  it('matches an agent launched through node', () => {
    expect(
      commandNamesAgent('node /opt/lib/node_modules/qwen/bin/qwen.js', ['qwen'])
    ).toBe(true);
  });

  it('walks every binary name an id may wear', () => {
    const names = ['codewhale', 'codew', 'deepseek'];
    expect(commandNamesAgent('/usr/local/bin/deepseek', names)).toBe(true);
    expect(commandNamesAgent('/usr/local/bin/codew', names)).toBe(true);
  });

  it('refuses the ordinary commands that killed candidate C', () => {
    for (const command of [
      'npm test',
      'less /var/log/system.log',
      'git log --oneline',
      '/bin/zsh -l',
      'vim src/main.ts',
      'node build/assert-no-runtime-cycles.mjs'
    ]) {
      expect(commandNamesAgent(command, ['codex'])).toBe(false);
    }
  });

  it('never matches on an environment assignment', () => {
    expect(commandNamesAgent('EDITOR=codex git commit', ['codex'])).toBe(false);
  });

  it('says no when there is nothing to match', () => {
    expect(commandNamesAgent('', ['codex'])).toBe(false);
    expect(commandNamesAgent('codex', [])).toBe(false);
  });

  /**
   * Both command lines below were MEASURED on this Mac in the Phase 141 fix
   * round, by reading each launcher and the process it execs. Neither carries
   * the agent's own name anywhere, and the rule above found neither of them,
   * so muse and qwen got no witness, no drop and no verb at all.
   */
  it('matches the two agents whose process never says their name', () => {
    // muse's launcher ends in a plain `exec "$binary" "$@"` with no `-a`.
    expect(
      commandNamesAgent('/Users/g/.local/bin/muse-bin-0.2.1-R1215.1', ['muse'])
    ).toBe(true);
    // qwen's launcher execs its own bundled node on its own entry script.
    expect(
      commandNamesAgent(
        '/Users/g/.local/lib/qwen-code/node/bin/node ' +
          '/Users/g/.local/lib/qwen-code/lib/cli-entry.js',
        ['qwen']
      )
    ).toBe(true);
  });

  it('refuses a file that merely lives in the agent\'s own folder', () => {
    expect(
      commandNamesAgent(
        'vim /Users/g/.local/lib/qwen-code/README.md',
        ['qwen']
      )
    ).toBe(false);
    expect(
      commandNamesAgent('less /Users/g/.local/lib/muse-notes/todo.txt', ['muse'])
    ).toBe(false);
  });
});

describe('reading one process', () => {
  it('parses the stat and the parent', () => {
    expect(parseWitnessLine('S+   500\n')).toEqual({
      found: true,
      stat: 'S+',
      ppid: 500
    });
  });

  it('reads an empty answer as gone, which is what ps prints', () => {
    expect(parseWitnessLine('')).toEqual({ found: false, stat: '', ppid: null });
    expect(parseWitnessLine('\n\n')).toEqual({
      found: false,
      stat: '',
      ppid: null
    });
  });

  it('takes the same three fields out of a fleet table', () => {
    const snap = table('500 1 0:01.00 Ss+\n900 500 0:04.00 S+\n');
    expect(witnessFromSnapshot(snap, 900)).toEqual({
      found: true,
      stat: 'S+',
      ppid: 500
    });
    expect(witnessFromSnapshot(snap, 901).found).toBe(false);
  });

  it('keeps "not in the foreground" apart from "never heard of it"', () => {
    const snap = table('500 1 0:01.00 Ss+\n900 500 0:04.00 SN\n');
    expect(holdsTerminal(snap, 500)).toBe(true);
    expect(holdsTerminal(snap, 900)).toBe(false);
    expect(holdsTerminal(snap, 901)).toBe(null);
  });

  it('offers the foreground child and ignores a background job', () => {
    const snap = table(
      '500 1 0:01.00 Ss+\n' + '900 500 0:04.00 SN\n' + '901 500 0:02.00 S+\n'
    );
    expect(foregroundChildOf(snap, 500)).toBe(901);
    expect(foregroundChildOf(snap, 999)).toBe(null);
  });
});

describe('where the witness comes from', () => {
  const recorded = (pid: number): ClaudeLookup => ({
    forPane: () => ({ pid, status: 'idle', statusUpdatedAt: NOW }),
    unmapped: () => []
  });

  it('asks for a reading of claude when no table proved the record', () => {
    // No table was read, so NOTHING has been read about this process: the
    // record is a file and a file outlives the process that wrote it. The
    // candidate carries that, and the parent is null because nothing read it.
    expect(witnessCandidate(pane(), CLAUDE_PROFILE, recorded(811), null)).toEqual(
      { pid: 811, confirm: 'descent', ppid: null }
    );
  });

  it('believes the record outright once the table places it under the pane', () => {
    const snap = table('500 1 0:01.00 Ss\n811 500 0:09.00 S+\n');
    expect(witnessCandidate(pane(), CLAUDE_PROFILE, recorded(811), snap)).toEqual(
      { pid: 811, confirm: 'none', ppid: 500 }
    );
  });

  /**
   * The table is one reading old, so a claude that started since it was taken
   * is missing from it. Refusing the pid here would refuse a healthy agent for
   * the whole life of the session because of a race, so the fresh read decides
   * instead of the stale one.
   */
  it('asks for a reading rather than refusing a pid the table never saw', () => {
    const snap = table('500 1 0:01.00 Ss+\n');
    expect(witnessCandidate(pane(), CLAUDE_PROFILE, recorded(811), snap)).toEqual(
      { pid: 811, confirm: 'descent', ppid: null }
    );
  });

  it('finds claude in the restore shape, under the login shell', () => {
    const claude: ClaudeLookup = {
      forPane: () => undefined,
      unmapped: () => [{ pid: 900, status: 'busy', statusUpdatedAt: NOW }]
    };
    const snap = table('500 1 0:01.00 Ss+\n900 500 0:09.00 S+\n');
    expect(witnessCandidate(pane(), CLAUDE_PROFILE, claude, snap)).toEqual({
      pid: 900,
      confirm: 'none',
      ppid: 500
    });
  });

  it('offers every other agent a candidate that must still be named', () => {
    const snap = table('500 1 0:01.00 Ss+\n900 500 0:09.00 S+\n');
    expect(witnessCandidate(pane(), CODEX_PROFILE, emptyClaude, snap)).toEqual({
      pid: 900,
      confirm: 'command',
      ppid: 500
    });
  });

  it('offers nothing when no process table was read this tick', () => {
    expect(witnessCandidate(pane(), CODEX_PROFILE, emptyClaude, null)).toBe(
      null
    );
  });

  it('never witnesses a session that is a shell', () => {
    expect(witnessEligible('shell')).toBe(false);
    expect(witnessEligible('codex')).toBe(true);
  });
});

describe('the drop edge', () => {
  it('says nothing at all when there is no witness', () => {
    const st = freshState(NOW);
    expect(witnessVerdict(st, parseWitnessLine(''))).toBe('none');
  });

  it('fires when the witnessed process is gone', () => {
    const st = freshState(NOW);
    noteWitness(st, pane(), 900, 500);
    expect(witnessVerdict(st, parseWitnessLine(''))).toBe('gone');
  });

  it('does NOT fire on Control Z, which leaves the process stopped', () => {
    const st = freshState(NOW);
    noteWitness(st, pane(), 900, 500);
    expect(witnessVerdict(st, parseWitnessLine('T    500'))).toBe('stopped');
  });

  it('fires when the pid was reused by something under another parent', () => {
    const st = freshState(NOW);
    noteWitness(st, pane(), 900, 500);
    expect(witnessVerdict(st, parseWitnessLine('S+   7'))).toBe('reused');
  });

  /**
   * A captured agent is a GRANDCHILD of its pane, so the pane's own process is
   * NOT its parent. The guard used to be handed the pane's own process on
   * faith, which made a healthy captured agent read as a reused pid on every
   * tick. The parent is now the one that was actually read, and null carries
   * no guard at all rather than a wrong one.
   */
  it('does not fire on a healthy agent that is a grandchild of its pane', () => {
    const st = freshState(NOW);
    noteWitness(st, pane(), 700, 600);
    expect(witnessVerdict(st, parseWitnessLine('S+   600'))).toBe('alive');
  });

  it('applies no guard when nothing read the parent', () => {
    const st = freshState(NOW);
    noteWitness(st, pane(), 700, null);
    expect(st.witnessPpid).toBe(null);
    expect(witnessVerdict(st, parseWitnessLine('S+   600'))).toBe('alive');
  });

  /**
   * The drop can be declared from claude's own hook, which arrives between two
   * ticks and carries the pane facts of the tick before it. On those facts the
   * pane's command still names the agent that has just gone, so recording it
   * as the return baseline made the very next tick read a change and cancel
   * the verb 199 ms after it appeared.
   */
  it('leaves the return baseline unset when the pane facts are stale', () => {
    const st = freshState(NOW);
    noteWitness(st, pane({ currentCommand: 'claude' }), 900, 500);
    expect(
      noteAgentLeft(st, pane({ currentCommand: 'claude' }), NOW + 1, false)
    ).toBe(true);
    expect(st.leftCommand).toBe(null);
    expect(needsReturnBaseline(st)).toBe(true);
    // Nothing is a return until a real tick has said what the session reads.
    expect(returnTriggered(st, pane({ currentCommand: 'zsh' }))).toBe(false);
  });

  it('applies no reuse guard when the agent is the pane program itself', () => {
    const st = freshState(NOW);
    noteWitness(st, pane({ panePid: 900 }), 900, null);
    expect(st.witnessPpid).toBe(null);
    expect(witnessVerdict(st, parseWitnessLine('S+   1'))).toBe('alive');
  });

  it('holds the edge back while something else owns the terminal', () => {
    const snap = table('500 1 0:01.00 Ss\n901 500 0:02.00 S+\n');
    expect(dropIsSafeToDeclare(pane(), snap)).toBe(false);
    expect(dropIsSafeToDeclare(pane(), null)).toBe(true);
    expect(dropIsSafeToDeclare(pane({ dead: true }), null)).toBe(false);
  });

  it('offers the verb once, and says the time the agent left', () => {
    const st = freshState(NOW);
    noteWitness(st, pane(), 900, 500);
    expect(noteAgentLeft(st, pane(), NOW + 5_000)).toBe(true);
    expect(noteAgentLeft(st, pane(), NOW + 9_000)).toBe(false);
    expect(st.leftAt).toBe(NOW + 5_000);
    expect(st.witnessPid).toBe(null);
    expect(offersResume(st)).toBe(true);
  });
});

describe('the way back', () => {
  it('triggers on the command field moving, and on nothing else', () => {
    const st = freshState(NOW);
    noteWitness(st, pane(), 900, 500);
    noteAgentLeft(st, pane({ currentCommand: 'zsh' }), NOW);
    expect(returnTriggered(st, pane({ currentCommand: 'zsh' }))).toBe(false);
    expect(returnTriggered(st, pane({ currentCommand: 'node' }))).toBe(true);
  });

  it('hides the verb the moment something is running', () => {
    const st = freshState(NOW);
    noteWitness(st, pane(), 900, 500);
    noteAgentLeft(st, pane(), NOW);
    noteReturn(st, pane(), 951);
    expect(st.handback).toBe('returning');
    expect(offersResume(st)).toBe(false);
    expect(st.witnessPid).toBe(951);
  });

  it('keeps the time the AGENT left when a second thing comes and goes', () => {
    const st = freshState(NOW);
    noteWitness(st, pane(), 900, 500);
    noteAgentLeft(st, pane(), NOW + 1_000);
    noteReturn(st, pane(), 951);
    expect(noteAgentLeft(st, pane(), NOW + 60_000)).toBe(true);
    expect(st.leftAt).toBe(NOW + 1_000);
    expect(offersResume(st)).toBe(true);
  });

  it('clears everything when the conversation is the one the row holds', () => {
    const st = freshState(NOW);
    noteWitness(st, pane(), 900, 500);
    noteAgentLeft(st, pane(), NOW);
    noteReturn(st, pane(), 951);
    noteHandbackResolved(st, 'adopted');
    expect(st.handback).toBe('none');
    expect(st.leftAt).toBe(0);
  });

  it('says so, and offers no verb, when it cannot be sure', () => {
    const st = freshState(NOW);
    noteWitness(st, pane(), 900, 500);
    noteAgentLeft(st, pane(), NOW);
    noteReturn(st, pane(), 951);
    noteHandbackResolved(st, 'unconfirmed');
    expect(st.handback).toBe('unconfirmed');
    expect(offersResume(st)).toBe(false);
  });
});

describe('claude names its own conversation, and Tortie now keeps it', () => {
  it('keeps the conversation and the directory', () => {
    const entry = parseClaudeSessionFile(
      JSON.stringify({
        kind: 'interactive',
        status: 'idle',
        pid: 811,
        tmux: 'claude-1:@126.%126',
        sessionId: '7f891378-5855-4776-ae75-57efeeb67bb6',
        cwd: '/Users/g/projects/auth',
        statusUpdatedAt: NOW
      })
    );
    expect(entry?.sessionId).toBe('7f891378-5855-4776-ae75-57efeeb67bb6');
    expect(entry?.cwd).toBe('/Users/g/projects/auth');
    expect(entry?.paneId).toBe('%126');
  });

  it('leaves both absent rather than empty when claude said nothing', () => {
    const entry = parseClaudeSessionFile(
      JSON.stringify({
        kind: 'interactive',
        status: 'busy',
        pid: 811,
        sessionId: '',
        statusUpdatedAt: NOW
      })
    );
    expect(entry).not.toBe(null);
    expect(entry?.sessionId).toBeUndefined();
    expect(entry?.cwd).toBeUndefined();
  });
});

describe('THE RESTORED SESSION, which is the case that killed three designs', () => {
  /**
   * Every reading below is the reading a restored session actually gives: the
   * pane's own program is the login shell, it holds the terminal, it has no
   * children, and its command armed and unpressed is sitting on the screen.
   * That is byte for byte the shape of a session whose agent has left.
   */
  const restored = pane({ currentCommand: 'zsh', keypad: true });
  const restoredTable = table('500 1 0:00.31 Ss+\n');

  it('is offered no witness, whichever agent the row names', () => {
    for (const profile of [CLAUDE_PROFILE, CODEX_PROFILE]) {
      expect(
        witnessCandidate(restored, profile, emptyClaude, restoredTable)
      ).toBe(null);
    }
  });

  /**
   * THE LEFTOVER RECORD, found by the re-verifier driving the shipped modules
   * against a real tmux server. The two conditions arrive together in reality:
   * a crash or a reboot kills claude without letting it delete its records AND
   * takes the tmux server with it, so pane ids start again at %0 and the
   * sessions Tortie restores wear exactly the ids the stale records name. This
   * machine did all of that on 2026-08-22.
   *
   * The rule alone cannot refuse the pid, because refusing a pid the table has
   * not heard of would refuse a claude that started since the table was taken.
   * What it does is say that nothing has been read about the process, which is
   * the truth, and the loop reads it. The whole case, with a real leftover file
   * and a real restored session, is in the drop edge tests next door, and the
   * real-process version of it belongs to the re-verifier.
   */
  it('hands a leftover claude record out as unproven, never as a witness', () => {
    const stale: ClaudeLookup = {
      // The record names this pane, and its pid died with the last boot.
      forPane: () => ({ pid: 811, status: 'idle', statusUpdatedAt: NOW }),
      unmapped: () => []
    };
    expect(
      witnessCandidate(restored, CLAUDE_PROFILE, stale, restoredTable)
    ).toEqual({ pid: 811, confirm: 'descent', ppid: null });
  });

  it('can never drop, because there is nothing to have gone away', () => {
    const st = freshState(NOW);
    expect(witnessVerdict(st, parseWitnessLine(''))).toBe('none');
    expect(offersResume(st)).toBe(false);
  });

  it('offers no verb after an ordinary command runs in it and ends', () => {
    // He types `npm test` at the armed prompt. A child appears and leaves,
    // which is the shape of an agent leaving. The command line refuses it.
    const st = freshState(NOW);
    const running = table('500 1 0:00.31 Ss\n930 500 0:12.00 S+\n');
    const candidate = witnessCandidate(
      restored,
      CODEX_PROFILE,
      emptyClaude,
      running
    );
    expect(candidate).toEqual({ pid: 930, confirm: 'command', ppid: 500 });
    expect(commandNamesAgent('npm test', ['codex'])).toBe(false);
    // So nothing is recorded, and the edge has nothing to fire on.
    expect(st.witnessPid).toBe(null);
    expect(witnessVerdict(st, parseWitnessLine(''))).toBe('none');
    expect(offersResume(st)).toBe(false);
  });
});
