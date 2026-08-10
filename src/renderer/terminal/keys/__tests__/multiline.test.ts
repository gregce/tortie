/**
 * Phase 12.5 — Shift+Enter must insert a newline and must NEVER submit.
 *
 * Which bytes each agent accepts was established hands-on
 * (docs/research/20-shift-enter.md); what is worth pinning here is the branch
 * logic around them, because every way of getting it wrong ends in the same
 * user-visible disaster — a half-written prompt sent to a model.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Terminal } from '@xterm/xterm';
import type { ScrollSurface } from '../../scroll/surface';

// The ⌘C/⌘A/⌘K actions are the handler's OTHER branch and reach the zustand
// store, which needs a `window` this node-environment suite does not have.
// Nothing below exercises them, so stub the module rather than the browser.
vi.mock('../../capture', () => ({
  clearSession: vi.fn(),
  copySelection: vi.fn(),
  selectAll: vi.fn()
}));

import { terminalKeyHandler } from '../index';
import {
  __setMultilineKeyTable,
  DEFAULT_MULTILINE_KEY,
  LF,
  multilineKeyFor,
  multilineSequenceFor
} from '../multiline';

/** ASCII escape — the prefix of every sequence this feature must not emit. */
const ESC = '\u001b';

interface Harness {
  handler: (event: KeyboardEvent) => boolean;
  /** Everything the handler wrote into xterm, in order. */
  written: string[];
  /** Pages the scroll surface was asked to move, in order. */
  scrolled: number[];
}

function harness(sequence: string | null = LF): Harness {
  const written: string[] = [];
  const scrolled: number[] = [];
  const term = {
    input: (data: string) => written.push(data),
    hasSelection: () => false
  } as unknown as Terminal;
  const surface = {
    view: { owned: true },
    scrollPages: (pages: number) => scrolled.push(pages)
  } as unknown as ScrollSurface;
  return {
    handler: terminalKeyHandler(
      's1',
      term,
      () => 'zz',
      surface,
      () => sequence
    ),
    written,
    scrolled
  };
}

/** A keydown carrying only the fields the handler reads. */
function keydown(init: Partial<KeyboardEvent> & { key: string }): {
  event: KeyboardEvent;
  prevented: () => boolean;
} {
  const preventDefault = vi.fn();
  const event = {
    type: 'keydown',
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    preventDefault,
    ...init
  } as unknown as KeyboardEvent;
  return { event, prevented: () => preventDefault.mock.calls.length > 0 };
}

describe('Shift+Enter', () => {
  it('writes the newline and swallows the key', () => {
    const h = harness();
    const { event, prevented } = keydown({ key: 'Enter', shiftKey: true });
    expect(h.handler(event)).toBe(false);
    expect(h.written).toEqual([LF]);
    // preventDefault is load-bearing, not cosmetic: xterm's _keyPress
    // re-consults the handler and would emit a second CR without it.
    expect(prevented()).toBe(true);
  });

  it('leaves plain Enter entirely alone — submit must never break', () => {
    const h = harness();
    const { event, prevented } = keydown({ key: 'Enter' });
    expect(h.handler(event)).toBe(true);
    expect(h.written).toEqual([]);
    expect(prevented()).toBe(false);
  });

  it('leaves ⌥Enter, ⌃Enter and ⌘Enter to xterm and to the agent', () => {
    for (const mod of ['altKey', 'ctrlKey', 'metaKey'] as const) {
      const h = harness();
      const { event } = keydown({ key: 'Enter', shiftKey: true, [mod]: true });
      expect(h.handler(event)).toBe(true);
      expect(h.written).toEqual([]);
    }
  });

  it('hands the key back untouched when the agent has no multiline input', () => {
    // The documented fallback: return true WITHOUT preventDefault, so xterm
    // sends its usual CR. gmux never invents a sequence it has not measured.
    const h = harness(null);
    const { event, prevented } = keydown({ key: 'Enter', shiftKey: true });
    expect(h.handler(event)).toBe(true);
    expect(h.written).toEqual([]);
    expect(prevented()).toBe(false);
  });

  it('does not shadow ⇧PageUp (Phase 12.3)', () => {
    const h = harness();
    const { event } = keydown({ key: 'PageUp', shiftKey: true });
    h.handler(event);
    expect(h.scrolled).toEqual([1]);
    expect(h.written).toEqual([]);
  });

  it('ignores keyup, so one press is one newline', () => {
    const h = harness();
    const { event } = keydown({ key: 'Enter', shiftKey: true });
    (event as { type: string }).type = 'keyup';
    expect(h.handler(event)).toBe(true);
    expect(h.written).toEqual([]);
  });
});

/**
 * The TABLE itself now lives in the main-process registry
 * (src/main/agents/registry.ts `multilineKey`) and is asserted there —
 * src/main/agents/__tests__/registry.test.ts owns the per-agent matrix. What
 * is left here is the renderer-side CACHE in front of `agents:multilineKeys`,
 * whose only interesting behavior is what it answers before, during and after
 * the table arrives.
 */
describe('the multiline cache', () => {
  const AGENTS = [
    'claude',
    'codex',
    'cursor',
    'gemini',
    'deepseek',
    'antigravity',
    'muse',
    'qwen',
    'pi',
    'opencode',
    'amp',
    'droid',
    'shell',
    'a-cli-that-does-not-exist'
  ];

  afterEach(() => {
    __setMultilineKeyTable(null);
  });

  it('answers the measured LF for everyone before the table arrives', () => {
    // The pre-prime window is CORRECT, not merely safe: every agent measured
    // to date takes LF, so an early ⇧↩ does the right thing.
    for (const agent of AGENTS) {
      expect(multilineSequenceFor(agent)).toBe(LF);
      expect(multilineKeyFor(agent)).toBe(DEFAULT_MULTILINE_KEY);
    }
  });

  it('never hands out CSI-u or ESC CR — tmux turns both into a submit', () => {
    __setMultilineKeyTable({
      agents: { claude: { sequence: LF, verified: true } },
      fallback: { sequence: LF, verified: false }
    });
    for (const agent of AGENTS) {
      const sequence = multilineSequenceFor(agent);
      expect(sequence === null || !sequence.includes(ESC)).toBe(true);
      expect(sequence === null || !sequence.includes('\r')).toBe(true);
    }
  });

  it('serves the registry row once primed, and the table fallback otherwise', () => {
    const claude = { sequence: LF, verified: true };
    const fallback = { sequence: LF, verified: false };
    __setMultilineKeyTable({ agents: { claude }, fallback });
    expect(multilineKeyFor('claude')).toBe(claude);
    // A shell has no registry row by construction, and an id this build has
    // never heard of must not throw its way into a submit.
    expect(multilineKeyFor('shell')).toBe(fallback);
    expect(multilineKeyFor('a-cli-that-does-not-exist')).toBe(fallback);
  });

  it('honors an agent with no multiline input at all', () => {
    // No agent measured so far needs this, but the null contract is what
    // keeps a future one from having Enter broken: no sequence → xterm's own
    // CR, never an invented escape.
    __setMultilineKeyTable({
      agents: { droid: { sequence: null, verified: false } },
      fallback: { sequence: LF, verified: false }
    });
    expect(multilineSequenceFor('droid')).toBeNull();
    expect(multilineSequenceFor('claude')).toBe(LF);
  });
});
