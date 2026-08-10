/**
 * StatusDetector BEL heuristics — Bug B (Phase 9.2).
 *
 * A BEL in the output stream must flip a session to needs_input ONLY when an
 * agent rings it unprovoked: shell beeps (tab-completion, ZLE rejecting
 * mouse reports) never demand attention, and any BEL arriving within
 * BEL_INPUT_IGNORE_MS of the user's own input to that session is a
 * self-inflicted echo (double-click → mouse report → zsh beep) for every
 * session kind.
 */

import { afterEach, describe, expect, it } from 'vitest';
import type { AgentKind } from '@shared/types';
import {
  BEL_INPUT_IGNORE_MS,
  StatusDetector
} from '../status-detector';
import type { DetectedStatus, TermStreamSource } from '../status-detector';

const BEL_CHUNK = new Uint8Array([0x07]);

interface Harness {
  detector: StatusDetector;
  statuses: DetectedStatus[];
  emit(sessionId: string, chunk: Uint8Array): void;
  advance(ms: number): void;
}

function makeHarness(): Harness {
  let now = 1_000_000; // arbitrary epoch; only deltas matter
  const listeners = new Map<string, (data: Uint8Array) => void>();
  const source: TermStreamSource = {
    onData(sessionId, cb) {
      listeners.set(sessionId, cb);
      return () => listeners.delete(sessionId);
    }
  };
  const statuses: DetectedStatus[] = [];
  const detector = new StatusDetector(
    source,
    {
      onStatus: (_id, status) => statuses.push(status),
      onExcerpt: () => undefined,
      onActivity: () => undefined
    },
    () => now
  );
  return {
    detector,
    statuses,
    emit: (sessionId, chunk) => listeners.get(sessionId)?.(chunk),
    advance: (ms) => {
      now += ms;
    }
  };
}

function watchAndRing(agent: AgentKind): Harness {
  const h = makeHarness();
  h.detector.watch('s1', agent);
  h.emit('s1', BEL_CHUNK);
  return h;
}

describe('StatusDetector BEL handling (Bug B)', () => {
  let harness: Harness | null = null;

  afterEach(() => {
    harness?.detector.dispose(); // clear pending silence timers
    harness = null;
  });

  it('shell + BEL → never needs_input (tab-completion/ZLE beeps)', () => {
    harness = watchAndRing('shell');
    expect(harness.statuses).not.toContain('needs_input');
    expect(harness.statuses).toEqual(['working']);
  });

  it('agent + BEL within the ignore window after user input → no flip', () => {
    harness = makeHarness();
    harness.detector.watch('s1', 'claude');
    harness.detector.noteUserInput('s1'); // e.g. a double-click's mouse report
    harness.advance(BEL_INPUT_IGNORE_MS / 2);
    harness.emit('s1', BEL_CHUNK); // echoed self-inflicted beep
    expect(harness.statuses).not.toContain('needs_input');
    expect(harness.statuses).toEqual(['working']);
  });

  it('agent + BEL cold (no recent user input) → needs_input', () => {
    harness = watchAndRing('claude');
    expect(harness.statuses).toEqual(['needs_input']);
  });
});
