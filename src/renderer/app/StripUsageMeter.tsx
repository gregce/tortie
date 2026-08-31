/**
 * The meter's cell in the top tab strip (Phase 181.1).
 *
 * THE METER WINS AND THE TABS YIELD. This cell does not shrink, so the tab
 * list beside it takes what is left and reaches its existing overflow chevron
 * one tab sooner. Nothing here computes a threshold: the reservation IS the
 * width the meter drew, read back off the DOM, so it moves on its own when a
 * second provider is switched on or a number grows a digit.
 *
 * The step down to `mini` and then to nothing is the FLOOR and not the normal
 * behaviour. It happens only when the band cannot hold one tab's own minimum
 * and the meter at once, which is a window narrow enough that something has
 * to give. ../app/usage-fit.ts owns that rule and knows no widths of its own.
 *
 * Phase 181's lesson, one hour older than this file: a surface that is only
 * right at mount is wrong. So the measurement runs on every render, on a
 * resize of the band, and on a resize of the meter itself, which is what a
 * provider being switched on looks like from here.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { UsageMeter } from './UsageMeter';
import {
  chooseStripDensity,
  stripTabFloor,
  type StripDensity,
  type StripWidths
} from './usage-fit';

export function StripUsageMeter({
  headerRef,
  listRef
}: {
  headerRef: React.RefObject<HTMLDivElement | null>;
  listRef: React.RefObject<HTMLDivElement | null>;
}): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widths = useRef<StripWidths>({ compact: null, mini: null });
  // The chevron cell comes and goes with the overflow it announces, and the
  // meter's own width is one of the things that decides whether tabs overflow.
  // Charging its width to the floor whether or not it is drawn right now is
  // what stops that feedback: the room this cell is judged against then
  // depends on the band's width and nothing else.
  const chevron = useRef(0);
  const [density, setDensity] = useState<StripDensity>('compact');

  const fit = useCallback((): void => {
    const host = hostRef.current;
    const header = headerRef.current;
    if (host === null || header === null) return;

    const own = Math.round(host.getBoundingClientRect().width);
    if (density !== 'none') {
      widths.current = { ...widths.current, [density]: own };
    }

    let controls = 0;
    for (const child of Array.from(header.children)) {
      if (child === host || child === listRef.current) continue;
      const width = (child as HTMLElement).getBoundingClientRect().width;
      if (child.querySelector('.strip-overflow') !== null) {
        chevron.current = width;
        continue;
      }
      controls += width;
    }

    const next = chooseStripDensity({
      headerWidth: header.getBoundingClientRect().width,
      controlsWidth: controls + chevron.current,
      tabFloor: stripTabFloor(listRef.current),
      widths: widths.current
    });

    setDensity((prev) => (prev === next ? prev : next));
    // Written straight onto the node rather than held in state. It is evidence
    // for build/probe-p1811-strip-fit.mjs and nothing in the app reads it, so
    // a state for it bought one extra render on every width change and drew
    // nothing different. It is not in the JSX either, so React never clobbers
    // it: this effect runs after every render that could have moved it.
    host.setAttribute('data-usage-reserve', String(own));
  }, [density, headerRef, listRef]);

  useLayoutEffect(fit);

  // WHAT THIS OBSERVER IS NOT. Electron throttles rendering in a background
  // window, and a throttled window delivers a ResizeObserver callback about
  // once and then stops: measured on 2026-08-31, an unfocused window resized
  // down a whole ladder kept the density it started with until something else
  // made it render, and one click on a tab corrected it instantly. So this is
  // a refresh and not a guarantee, and the surface can be a frame behind on
  // the moment a background window is brought forward. It is not the operator's
  // defect, because a person resizing a window is looking at it, and with the
  // window in front the same ladder is right at every step in both directions.
  useEffect(() => {
    const host = hostRef.current;
    const header = headerRef.current;
    if (host === null || header === null) return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(header);
    observer.observe(host);
    return () => observer.disconnect();
  }, [fit, headerRef]);

  return (
    <div
      ref={hostRef}
      className="strip-usage"
      data-slot="strip-usage"
      data-usage-density={density}
    >
      {density === 'none' ? null : <UsageMeter density={density} />}
    </div>
  );
}
