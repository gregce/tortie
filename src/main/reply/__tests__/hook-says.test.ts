/**
 * Whether a Claude Bash hook says its command whole (Phase 318,
 * build/p318/SPEC.md §5.3, D12, §Revision R4, R22, R27), over the four REAL
 * `PermissionRequest` bodies Claude Code 2.1.287 posted and hand-made ones.
 * Every hidden character is built from its code point at run time.
 */

import { describe, expect, it } from 'vitest';
import { questionFromHookBody } from '../../activity/question';
import { hidesCharacters, hookBashOf } from '../hook-says';
import { CLAUDE_BASH_SCREENS, hookBodies, realCaptures } from './fixtures';

/** The question the hook path composes, then what this module says of it: exactly core's two calls. */
function sayOf(body: string): 'whole' | 'partial' | null {
  const asked = questionFromHookBody(body);
  return asked === null ? null : hookBashOf(body, asked);
}

const bash = (command: unknown, extra: Record<string, unknown> = {}): string =>
  JSON.stringify({ hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command }, ...extra });

/** Every character R27 names, from its code point. */
const HIDDEN_POINTS = [
  0x00, 0x09, 0x0a, 0x0d, 0x1b, 0x1f, 0x7f, 0x80, 0x9f, 0x061c, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f,
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2060, 0x2061, 0x2062, 0x2063, 0x2064, 0x2066, 0x2067, 0x2068,
  0x2069, 0x206a, 0x206f, 0xfeff
];

describe('the real bodies (Claude Code 2.1.287)', () => {
  it('says the one-line command whole, and the multi-line, long and blank-line commands not', () => {
    const bodies = hookBodies();
    expect(bodies).toHaveLength(4);
    expect(bodies.map(sayOf)).toEqual(['whole', 'partial', 'partial', 'partial']);
  });

  it('whole exactly when the composed question is `Bash ` and the command the agent was asked to run', () => {
    const truth = new Map(realCaptures().map((c) => [c.files[0], c.truth.command]));
    hookBodies().forEach((body, i) => {
      const asked = questionFromHookBody(body);
      const command = truth.get(CLAUDE_BASH_SCREENS[i] ?? '');
      expect(asked, CLAUDE_BASH_SCREENS[i]).not.toBeNull();
      expect(sayOf(body) === 'whole', CLAUDE_BASH_SCREENS[i]).toBe(asked === `Bash ${String(command)}`);
    });
  });
});

describe('what it refuses to call whole', () => {
  it('a command the composer flattened: a newline reads as a space', () => {
    // research 135 / SPEC R4: drawn `Bash echo ok rm -rf ~`, which reads as one echo.
    expect(sayOf(bash('echo ok\nrm -rf ~'))).toBe('partial');
  });

  it('a command the composer collapsed, trimmed, redacted or cut', () => {
    expect(sayOf(bash('ls  -la'))).toBe('partial');
    expect(sayOf(bash(' ls'))).toBe('partial');
    expect(sayOf(bash('ls '))).toBe('partial');
    expect(sayOf(bash('curl -H "Authorization: Bearer sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789"'))).toBe(
      'partial'
    );
    expect(sayOf(bash(`echo ${'a'.repeat(250)}`))).toBe('partial');
  });

  it('a command 194 characters long is whole, and one that the 200 cut reaches is not', () => {
    expect(sayOf(bash(`echo ${'a'.repeat(189)}`))).toBe('whole');
    expect(sayOf(bash(`echo ${'a'.repeat(196)}`))).toBe('partial');
  });

  it('any hidden character, even one the composer leaves alone (R27)', () => {
    for (const cp of HIDDEN_POINTS) {
      const command = `ls${String.fromCodePoint(cp)}x`;
      const body = bash(command);
      // Asked directly with the very question a composer would have to draw.
      expect(hookBashOf(body, `Bash ${command}`), cp.toString(16)).toBe('partial');
      expect(hidesCharacters(command), cp.toString(16)).toBe(true);
    }
    expect(hidesCharacters('ls -la /tmp && echo "ok" é 👍🏽')).toBe(false);
  });

  it('a question that is not exactly the command, whatever the body says', () => {
    const body = bash('ls');
    expect(hookBashOf(body, 'Bash ls')).toBe('whole');
    expect(hookBashOf(body, 'Bash  ls')).toBe('partial');
    expect(hookBashOf(body, 'Bash')).toBe('partial');
    expect(hookBashOf(body, 'Read ls')).toBe('partial');
  });
});

describe('what is not a Bash request of the session at all', () => {
  it('reads null', () => {
    expect(hookBashOf('', 'Bash ls')).toBeNull();
    expect(hookBashOf('not json', 'Bash ls')).toBeNull();
    expect(hookBashOf('[]', 'Bash ls')).toBeNull();
    expect(hookBashOf('null', 'Bash ls')).toBeNull();
    expect(hookBashOf('"Bash"', 'Bash ls')).toBeNull();
    expect(hookBashOf(JSON.stringify({ tool_name: 'Edit', tool_input: { command: 'ls' } }), 'Edit ls')).toBeNull();
    expect(hookBashOf(JSON.stringify({ tool_name: 'bash', tool_input: { command: 'ls' } }), 'bash ls')).toBeNull();
    expect(hookBashOf(JSON.stringify({ tool_name: 'Bash' }), 'Bash')).toBeNull();
    expect(hookBashOf(JSON.stringify({ tool_name: 'Bash', tool_input: 'ls' }), 'Bash ls')).toBeNull();
    expect(hookBashOf(JSON.stringify({ tool_name: 'Bash', tool_input: ['ls'] }), 'Bash ls')).toBeNull();
    expect(hookBashOf(JSON.stringify({ tool_name: 'Bash', tool_input: { command: '' } }), 'Bash')).toBeNull();
    expect(hookBashOf(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 7 } }), 'Bash 7')).toBeNull();
  });

  it('a subagent never speaks for the session', () => {
    expect(hookBashOf(bash('ls', { agent_id: 'sub-1' }), 'Bash ls')).toBeNull();
    expect(hookBashOf(bash('ls', { agent_type: 'general' }), 'Bash ls')).toBeNull();
    expect(hookBashOf(bash('ls', { agent_id: null }), 'Bash ls')).toBeNull();
  });

  it('reads only own properties, never the prototype', () => {
    const inherited = '{"tool_name":"Bash","tool_input":{"__proto__":{"command":"ls"}}}';
    expect(hookBashOf(inherited, 'Bash ls')).toBeNull();
  });
});
