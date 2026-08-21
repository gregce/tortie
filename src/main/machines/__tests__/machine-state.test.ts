/**
 * Phase 71 — the one statement Tortie can make about a machine that has not
 * answered.
 *
 * NOTHING HERE STARTS ANYTHING. Every function under test is pure: it takes a
 * machine row and a set of link facts and returns what a person reads. The live
 * half, being the read of the machines file and the subscription, is exercised
 * by the app and by `npm run smoke:partition`.
 *
 * What these tests hold:
 * - A row nobody confirmed is `refused` whatever the link says, and it carries
 *   the gate's own sentence. The gate decides whether Tortie may talk to a
 *   machine at all, so no later layer may overwrite its answer.
 * - A healthy link says nothing, because the badge and the bar beside it
 *   already say it.
 * - The sentence never names the transport, the program or any of its verbs.
 */

import { describe, expect, it } from 'vitest';
import type { MachineLinkFacts } from '../control-plane';
import {
  machineDetailSentence,
  machineStateViewOf,
  machineStateViewsOf,
  type MachineStateRow
} from '../machine-state';

const STUDIO: MachineStateRow = {
  id: 'studio',
  label: 'Studio',
  color: 'orange',
  confirmed: true,
  refusal: null,
  // PHASE 101. This machine grants no saving, which is what every row in every
  // file says today.
  writeRoot: null
};

function facts(over: Partial<MachineLinkFacts> = {}): MachineLinkFacts {
  return {
    machineId: 'studio',
    link: 'connected',
    everAnswered: true,
    lastAnsweredAt: 1_700_000_000_000,
    reason: null,
    ...over
  };
}

describe('machineDetailSentence', () => {
  it('says nothing while the link is healthy', () => {
    expect(machineDetailSentence('Studio', 'connected', null)).toBeNull();
    expect(machineDetailSentence('Studio', 'polling', null)).toBeNull();
  });

  it('puts the label in front of the link’s own clause', () => {
    expect(
      machineDetailSentence(
        'Studio',
        'quiet',
        'did not answer the last time Tortie asked'
      )
    ).toBe('Studio did not answer the last time Tortie asked.');
  });

  it('has a sentence for a clause it was given none of', () => {
    expect(machineDetailSentence('Studio', 'quiet', null)).toBe(
      'Studio did not answer.'
    );
  });

  it('names the machine when Tortie will not use it', () => {
    expect(
      machineDetailSentence(
        'Studio',
        'refused',
        'runs a version Tortie has not measured'
      )
    ).toBe(
      'Tortie will not use Studio, because it runs a version Tortie has not ' +
        'measured.'
    );
  });

  it('says a sign in is happening rather than that it failed', () => {
    expect(machineDetailSentence('Studio', 'connecting', null)).toBe(
      'Tortie is signing in to Studio now.'
    );
  });

  it('does not double the full stop the clause already carried', () => {
    expect(machineDetailSentence('Studio', 'quiet', 'did not answer.')).toBe(
      'Studio did not answer.'
    );
  });
});

describe('machineStateViewOf', () => {
  it('is refused for a row nobody confirmed, whatever the link says', () => {
    const view = machineStateViewOf(
      { ...STUDIO, confirmed: false, refusal: 'Tortie has not been told yes.' },
      facts({ link: 'connected' })
    );
    expect(view.link).toBe('refused');
    expect(view.detail).toBe('Tortie has not been told yes.');
    expect(view.everAnswered).toBe(false);
    expect(view.lastAnsweredAt).toBeNull();
  });

  it('carries the link, the answer times and no sentence when healthy', () => {
    const view = machineStateViewOf(STUDIO, facts());
    expect(view).toEqual({
      id: 'studio',
      label: 'Studio',
      color: 'orange',
      link: 'connected',
      everAnswered: true,
      lastAnsweredAt: 1_700_000_000_000,
      detail: null,
      // Phase 101. This machine grants no saving.
      writeRoot: null
    });
  });

  it('reports the folder only for a confirmed machine (Phase 101)', () => {
    const granting = { ...STUDIO, writeRoot: '/Users/gdc/code' };
    expect(machineStateViewOf(granting, facts()).writeRoot).toBe(
      '/Users/gdc/code'
    );
    // An unconfirmed root is not a confirmed fact, whatever machines.json says.
    expect(
      machineStateViewOf(
        { ...granting, confirmed: false, refusal: 'nobody has confirmed it' },
        facts()
      ).writeRoot
    ).toBeNull();
    // An empty folder reads as none.
    expect(
      machineStateViewOf({ ...granting, writeRoot: '' }, facts()).writeRoot
    ).toBeNull();
  });

  it('reads quiet for a confirmed machine with no facts at all', () => {
    // This is the startup hole itself: a machine confirmed in the file that
    // this run has not reached. It must not read as healthy.
    const view = machineStateViewOf(STUDIO, undefined);
    expect(view.link).toBe('quiet');
    expect(view.everAnswered).toBe(false);
    expect(view.detail).toBe('Studio did not answer.');
  });
});

describe('machineStateViewsOf', () => {
  it('keeps the file’s order and matches facts by machine id', () => {
    const rows: MachineStateRow[] = [
      { ...STUDIO, id: 'attic', label: 'Attic' },
      STUDIO
    ];
    const views = machineStateViewsOf(rows, [
      facts({ machineId: 'studio', link: 'connected' }),
      facts({ machineId: 'attic', link: 'quiet', reason: 'is asleep' })
    ]);
    expect(views.map((one) => one.id)).toEqual(['attic', 'studio']);
    expect(views[0]?.link).toBe('quiet');
    expect(views[0]?.detail).toBe('Attic is asleep.');
    expect(views[1]?.link).toBe('connected');
  });

  it('answers with nothing for a file holding no machines', () => {
    expect(machineStateViewsOf([], [])).toEqual([]);
  });
});
