/**
 * Phase 91 — the one rule that says a session on another machine is not
 * captured.
 *
 * THE RULE LIVES IN ONE FUNCTION on purpose. It used to live nowhere at all:
 * a remote create left `GmuxCore.createSession` before the wrap could run, so
 * capture was already impossible and it was impossible SILENTLY. That
 * impossibility rested on one `return` sitting above one `if`, and nothing in
 * the tree objected if either moved.
 *
 * The sentence is asserted byte for byte because `build/assert-bundle-refusals.mjs`
 * holds two fragments of it, and the two must not drift apart.
 */

import { describe, expect, it } from 'vitest';
import {
  CAPTURE_NOT_ON_ANOTHER_MACHINE,
  captureRefusedOnMachine
} from '../capture';

describe('capture on a session that runs on another machine', () => {
  it('says nothing when no machine was named', () => {
    // Absent is this Mac, which is every create before the Phase 70 release.
    expect(captureRefusedOnMachine('claude', undefined)).toBeNull();
  });

  it('says nothing for the literal this Mac', () => {
    expect(captureRefusedOnMachine('claude', 'local')).toBeNull();
  });

  it('refuses, with the sentence, when a machine was named', () => {
    expect(captureRefusedOnMachine('claude', 'studio')).toBe(
      CAPTURE_NOT_ON_ANOTHER_MACHINE
    );
  });

  it('says nothing for a shell, because a shell was never captured', () => {
    // Naming the machine here would put a second reason on screen beside a
    // first one that is not the machine at all.
    expect(captureRefusedOnMachine('shell', 'studio')).toBeNull();
  });
});

describe('the sentence itself', () => {
  it('is what the bundle gate pins, byte for byte', () => {
    expect(CAPTURE_NOT_ON_ANOTHER_MACHINE).toBe(
      'SpecStory capture is off for this session. Tortie runs SpecStory on ' +
        'this Mac only, and this session runs on another machine.'
    );
  });

  it('obeys the writing rules a later reword could break', () => {
    // No em dash, no en dash, and no colon. Its three siblings in
    // `declineSentence` join two clauses with a colon and are deliberately not
    // reworded by this phase, because moving three pinned strings buys nothing
    // a person can see.
    expect(CAPTURE_NOT_ON_ANOTHER_MACHINE).not.toContain('—');
    expect(CAPTURE_NOT_ON_ANOTHER_MACHINE).not.toContain('–');
    expect(CAPTURE_NOT_ON_ANOTHER_MACHINE).not.toContain(':');
  });
});
