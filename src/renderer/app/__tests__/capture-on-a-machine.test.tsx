/**
 * Phase 91 — the Capture row stays on screen when a machine is picked.
 *
 * THE DEFECT. The row simply disappeared. A person could read a missing
 * checkbox as capture they had turned off, as capture that did not apply, or
 * as capture that silently worked. Removing an option fixes a refusal by
 * teaching nothing, which is the rule Phase 84 settled for a machine that
 * cannot hold a session and Phase 86 settled for an agent tile that cannot
 * run.
 *
 * WHAT THESE TESTS HOLD.
 *  - The row is in BOTH markups. That is the whole half.
 *  - The refused row is disabled and drawn off, and the caption names the
 *    machine.
 *  - The sheet decides the row on `captureSupported`, so a later edit cannot
 *    quietly restore the vanishing row.
 *  - The sentence the live gate expects and the sentence this module composes
 *    are the same text. Main cannot import renderer code, so the gate writes
 *    the sentence out, and this is what stops the two drifting.
 *
 * The environment is node, so the row is read as static markup.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// The modal's module graph reaches the app store, whose slices read
// `window.gmux` while the store object is being created.
vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = {
    gmux: undefined,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout,
    clearTimeout
  };
});

import { captureNotOnMachine } from '../../machines/presentation';
import { CaptureField } from '../CreateSessionModal';

const LOCAL_CAPTION = 'Saved in this folder under .specstory/history.';

describe('the Capture row when this create may be captured', () => {
  it('is drawn on, usable, with the transcript sentence', () => {
    const html = renderToStaticMarkup(
      <CaptureField offered checked caption={LOCAL_CAPTION} />
    );
    expect(html).toContain('Save this session');
    expect(html).not.toContain('disabled');
    expect(html).toContain(LOCAL_CAPTION);
  });
});

describe('the Capture row when the session runs on another machine', () => {
  const caption = captureNotOnMachine('Greg’s Mac Pro');
  const html = renderToStaticMarkup(
    <CaptureField offered={false} checked caption={caption} />
  );

  it('is still on screen', () => {
    // The point of the phase. A row that vanishes teaches nothing.
    expect(html).toContain('Capture');
    expect(html).toContain('Save this session');
  });

  it('is disabled and drawn off, whatever the person answered before', () => {
    expect(html).toContain('disabled');
    expect(html).not.toContain('checked');
    expect(html).toContain('preset-row off');
  });

  it('says why, naming the machine', () => {
    expect(html).toContain(caption);
  });
});

describe('the sentence itself', () => {
  it('reads as one plain line, byte for byte', () => {
    expect(captureNotOnMachine('Studio')).toBe(
      'Tortie runs SpecStory on this Mac only, so a session on Studio is not ' +
        'captured.'
    );
  });

  it('is the same text the live gate expects', () => {
    // src/main/harness/capture-remote.ts writes the sentence out, because main
    // cannot import renderer code. This is what stops a reword in one place
    // from leaving the other behind.
    const gate = readFileSync(
      resolve(import.meta.dirname, '../../../main/harness/capture-remote.ts'),
      'utf8'
    );
    expect(gate).toContain(
      'Tortie runs SpecStory on this Mac only, so a session on ${label} is ' +
        'not captured.'
    );
  });
});

describe('the sheet decides the row on the right question', () => {
  const source = readFileSync(
    resolve(import.meta.dirname, '../CreateSessionModal.tsx'),
    'utf8'
  );

  it('draws the row from captureSupported, not from captureOffered', () => {
    expect(source).toContain('{captureSupported ? (');
    expect(source).not.toContain('{captureOffered ? (');
  });

  it('still sends the field only when the create may be captured', () => {
    // Unchanged by this phase, and named here so a later edit cannot lose it.
    expect(source).toContain('...(captureOffered && capture ? { capture: true } : {})');
  });
});
