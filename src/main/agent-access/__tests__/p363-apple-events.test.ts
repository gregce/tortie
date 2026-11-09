import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { AgentAccessResponse } from '@shared/agent-access';
import { AGENT_ACCESS_MAX_RESPONSE_BYTES } from '@shared/agent-access';

vi.mock('electron', () => ({ app: { isPackaged: false, getAppPath: () => '/scratch' } }));
vi.mock('../log', () => ({ getLog: () => ({ info: vi.fn() }) }));
vi.mock('../service', () => ({ dispatchInstalledAgentAccess: vi.fn() }));

import { responseText, startAppleEventsAdapter } from '../apple-events';

const ANSWER: AgentAccessResponse = {
  version: 1, ok: false,
  error: { code: 'unavailable', message: 'Unavailable.' }
};

function receiver() {
  const live = new Set<string>();
  let receive: (id: string, text: string) => void = () => {};
  const native = {
    install: vi.fn((callback: typeof receive) => { receive = callback; return true; }),
    isLive: (id: string) => live.has(id),
    complete: vi.fn((id: string, _text: string) => live.delete(id)),
    shutdown: vi.fn(() => { live.clear(); }),
    jobCount: () => live.size
  };
  return { native, live, send: (id: string, text: string) => receive(id, text) };
}

describe('agent transport boundaries', () => {
  it('keeps every internal skill example on the socket, with no AppleScript fallback', () => {
    const skillRoot = new URL('../../../../resources/agent-skills/tortie/skills/tortie/', import.meta.url);
    const entry = readFileSync(new URL('SKILL.md', skillRoot), 'utf8');
    expect(entry).toContain('Internal agents must use this socket');
    expect(entry).toContain('do not switch transports');
    for (const file of ['SKILL.md', 'references/sessions.md', 'references/editor.md']) {
      const text = readFileSync(new URL(file, skillRoot), 'utf8');
      expect(text).toContain('GMUX_AGENT_SOCKET');
      const commands = [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((match) => match[1]).join('\n');
      expect(commands).not.toMatch(/osascript|tell application|\.sdef|safeStorage|SecItem|security\s+(?:find|add|delete)/i);
    }
  });

  it('adds no Keychain API to either the native transport or its adapter', () => {
    for (const relative of ['../apple-events.ts', '../../../native/apple-events.mm']) {
      const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
      expect(source).not.toMatch(/safeStorage|SecItem|SecKeychain|#import\s*[<"]Security\//);
    }
  });
});

describe('thin Apple Events adapter', () => {
  it('passes the exact request and live predicate to one dispatcher', async () => {
    const { native, live, send } = receiver();
    const dispatch = vi.fn(async (_text: string, _options: { isLive: () => boolean }) => ANSWER);
    startAppleEventsAdapter(native, dispatch);
    live.add('job');
    const text = '{"version":1,"operation":"whoami","session":"caller"}';
    send('job', text);
    await vi.waitFor(() => expect(native.complete).toHaveBeenCalledOnce());
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledWith(text, { isLive: expect.any(Function) });
    expect(native.complete).toHaveBeenCalledWith('job', JSON.stringify(ANSWER));
  });

  it('never dispatches an expired or shut-down queued request', () => {
    const { native, send } = receiver();
    const dispatch = vi.fn(async () => ANSWER);
    const adapter = startAppleEventsAdapter(native, dispatch);
    send('expired', '{}');
    adapter.shutdown();
    send('stopped', '{}');
    expect(dispatch).not.toHaveBeenCalled();
    expect(native.shutdown).toHaveBeenCalledOnce();
  });

  it('keeps liveness dynamic across asynchronous dispatch', async () => {
    const { native, live, send } = receiver();
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const seen: boolean[] = [];
    startAppleEventsAdapter(native, async (_text, options) => {
      seen.push(options.isLive());
      await held;
      seen.push(options.isLive());
      return ANSWER;
    });
    live.add('job');
    send('job', '{}');
    live.clear();
    release();
    await vi.waitFor(() => expect(native.complete).toHaveBeenCalledOnce());
    expect(seen).toEqual([true, false]);
  });

  it('returns a closed response if the dispatcher throws', async () => {
    const { native, live, send } = receiver();
    startAppleEventsAdapter(native, async () => { throw new Error('private payload'); });
    live.add('job');
    send('job', '{}');
    await vi.waitFor(() => expect(native.complete).toHaveBeenCalledOnce());
    expect(native.complete).toHaveBeenCalledWith('job', JSON.stringify(ANSWER));
  });

  it('bounds serialization without exposing a rejected payload', () => {
    const oversized = {
      ...ANSWER, error: { code: 'unavailable', message: 'x'.repeat(AGENT_ACCESS_MAX_RESPONSE_BYTES) }
    } as AgentAccessResponse;
    expect(responseText(oversized)).toBe(JSON.stringify(ANSWER));
  });
});
