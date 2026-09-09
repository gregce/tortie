/**
 * PHASE 235's COMMITTER — the SIXTH reveal door, and it was measured rather
 * than reasoned.
 *
 * ## What was wrong
 *
 * Research 85 section 7 recorded Reveal as held in three places and lost in a
 * fourth; the fix round re-derived that as three of FIVE and closed the two
 * Context doors. The count was still short. The same `reveal(` grep returns
 * `src/renderer/editor/image/ImageView.tsx`, which named `remote` nowhere at
 * all, and its `too-large` state draws exactly one button — Reveal in Finder —
 * over the tab's own `path`.
 *
 * That state is REACHABLE on a machine, which is why this is a door and not a
 * theory. Section 7 item 7 says a picture on a machine cannot be previewed,
 * and that is true of a RASTER one: `store.ts` excludes it on
 * `commit === null && req.remote === undefined`. An SVG is text. It comes
 * through the ordinary reader, so `image` is true through the `svg ||` arm of
 * that same expression whatever `remote` says, Preview is offered on the mode
 * control, and a `.svg` over the remote review cap arrives with `truncated`
 * set, which `imageSourceFor` answers as `too-large`. The verifier drove
 * exactly that on his Mac Pro: a 3,300,099-byte SVG in a scratch repository,
 * opened from Source control on the remote tab, Preview taken off the mode
 * radiogroup, and `Reveal in Finder` read off the live DOM — read, never
 * pressed, because a press opens Finder on his Mac.
 *
 * Both machines' home is `/Users/gdc`, so the press would have opened Finder
 * HERE on whatever sits at the same path. The wrong folder rather than nothing,
 * which is item 1's own wrong answer in a sixth place.
 *
 * ## What this pins, each written so it can fail
 *
 * 1. The button is drawn in the `too-large` state on this Mac and is ABSENT on
 *    a machine, through the SHIPPING surface rather than a copy of it.
 * 2. Absent, not disabled and not re-worded: the state's title and sentence are
 *    byte for byte the same on both sides, because a remote tab feels almost
 *    identical to a local one and a sentence that appears only on the remote
 *    face is the thing the operator forbade.
 * 3. No other state grew a button, so the guard cannot be read as a pass by
 *    removing the only affordance the surface has.
 * 4. The wiring, read out of `ImageView.tsx`'s own source, with the scanner
 *    proved on the spelling that actually shipped first.
 * 5. The reachability above, re-derived from the shipping predicates and from
 *    `store.ts`'s own line, so a later round that narrows `image` learns from
 *    a red test rather than from this comment.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { isImagePath, isSvgPath } from '@shared/image-types';
import { ImageSurface } from '../ImageView';
import type { ImageSource } from '../source';

const HERE = resolve(import.meta.dirname, '..');

const TOO_LARGE: ImageSource = {
  kind: 'too-large',
  bytes: 3_300_099,
  capBytes: 3_300_099,
  mediaType: 'image/svg+xml'
};

function draw(source: ImageSource, remote: boolean): string {
  return renderToStaticMarkup(
    createElement(ImageSurface, {
      source,
      name: 'big.svg',
      path: '/Users/gdc/api/src/ui/big.svg',
      revision: 0,
      pixelate: false,
      remote
    })
  );
}

describe('the picture that is too big to draw', () => {
  it('offers Reveal in Finder for a file on this Mac', () => {
    expect(draw(TOO_LARGE, false)).toContain('Reveal in Finder');
  });

  it('offers nothing at all for a file on a machine', () => {
    expect(draw(TOO_LARGE, true)).not.toContain('Reveal in Finder');
    expect(draw(TOO_LARGE, true)).not.toContain('<button');
  });

  it('says the same words on both, so no sentence is remote-only', () => {
    const here = draw(TOO_LARGE, false);
    const there = draw(TOO_LARGE, true);
    expect(there).toContain('This image is too large to preview');
    // Everything the local face says, the remote face says too: the only
    // difference between the two markups is the button that was removed.
    const button = here.slice(here.indexOf('<button'), here.indexOf('</button>') + 9);
    expect(button).not.toBe('');
    expect(here.replace(button, '')).toBe(there);
  });

  it('is the only state with a control, on either side', () => {
    const others: ImageSource[] = [
      { kind: 'loading' },
      { kind: 'missing' },
      { kind: 'error', message: 'no' }
    ];
    for (const source of others) {
      for (const remote of [false, true]) {
        expect(draw(source, remote)).not.toContain('<button');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// The wiring, read out of the real source
// ---------------------------------------------------------------------------

/** True when the view hands the surface the TAB's own remote fact. */
function passesTheTabsFact(source: string): boolean {
  return source.includes('remote={tab.remote !== undefined}');
}

describe('the view hands the surface that fact', () => {
  const view = readFileSync(resolve(HERE, 'ImageView.tsx'), 'utf8');

  it('and the scanner fails on the spelling that actually shipped', () => {
    expect(passesTheTabsFact('focusOnOpen={!live}\n    />')).toBe(false);
    expect(passesTheTabsFact('remote={false}')).toBe(false);
  });

  it('reads it off the tab, never off a default', () => {
    expect(passesTheTabsFact(view)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Why the state is reachable on a machine at all
// ---------------------------------------------------------------------------

describe('an SVG on a machine still reaches the image surface', () => {
  it('because an SVG is an image and a picture at once', () => {
    expect(isImagePath('/Users/gdc/api/src/ui/big.svg')).toBe(true);
    expect(isSvgPath('/Users/gdc/api/src/ui/big.svg')).toBe(true);
    expect(isSvgPath('/Users/gdc/api/src/ui/chart.png')).toBe(false);
  });

  it('and the tab’s own expression lets it through on the svg arm', () => {
    const store = readFileSync(resolve(HERE, '../store.ts'), 'utf8');
    expect(store).toContain(
      '(svg || (commit === null && req.remote === undefined))'
    );
  });
});
