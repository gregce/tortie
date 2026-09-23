/**
 * The pairing code, drawn (Phase 316.1).
 *
 * The bytes come from main's `pocket:beginPairing` answer and are encoded by
 * the vendored encoder in ./qrcodegen.ts, which is Project Nayuki's library
 * and the only QR encoder in the tree. This file only turns its modules into
 * one SVG path.
 *
 * THE PAYLOAD IS NEVER TEXT ON THE PAGE. When the person pasted a tailnet key,
 * the payload carries it, so it is drawn only as modules: no `title`, no
 * attribute and no accessible name repeats it. The accessible name is the
 * caller's words.
 *
 * DARK INK ON A LIGHT GROUND IN BOTH THEMES. The colours are ./qr-colors.ts's
 * and the element pins its own colour scheme, so a dark window still draws a
 * code a camera reads. `shape-rendering: crispEdges` keeps a module's edge on
 * a pixel boundary rather than blurring it into its neighbour.
 */

import React, { useMemo } from 'react';
import { QR_COLOR_SCHEME, QR_GROUND, QR_INK } from './qr-colors';
import { QrCode } from './qrcodegen';

/**
 * The light margin every side of the code keeps, in modules. The QR standard
 * asks for four, and a scanner that cannot find the edge of the code reads
 * nothing.
 */
export const QR_QUIET_ZONE = 4;

/**
 * About how wide the code is drawn, in CSS pixels, before it is rounded down
 * to a whole number of pixels per module. A module that straddles a pixel
 * boundary is drawn as two uneven widths, which is what a scanner misreads.
 */
export const QR_TARGET_PX = 320;

/** Whole CSS pixels per module for a code `size` modules wide, never below 2. */
export function qrModulePx(size: number): number {
  return Math.max(2, Math.floor(QR_TARGET_PX / size));
}

/** The drawn code: its side in modules, quiet zone included, and its path. */
export interface QrShape {
  /** Modules per side, the quiet zone on both sides included. */
  readonly size: number;
  /** One run of dark modules per subpath, `M x y h n v 1 h -n z`. */
  readonly d: string;
}

/**
 * Encode `payload` and draw its dark modules as one path.
 *
 * Medium error correction, which the encoder raises on its own when the same
 * version has room. A screen is not a torn label, so low would do; medium is
 * a margin against glare on a laptop screen. Consecutive
 * dark modules in a row are one subpath. Measured: a payload with no key is
 * 279 bytes, version 12, 4 px a module; the longest key main admits makes it
 * 543 bytes, version 18, 3 px a module and a path of about 29,000 characters.
 *
 * Null when the payload cannot be encoded at all, which only a payload far
 * past anything main composes could cause.
 */
export function qrShape(payload: string): QrShape | null {
  let code: QrCode;
  try {
    code = QrCode.encodeText(payload, QrCode.Ecc.MEDIUM);
  } catch {
    return null;
  }
  const parts: string[] = [];
  for (let y = 0; y < code.size; y += 1) {
    let x = 0;
    while (x < code.size) {
      if (!code.getModule(x, y)) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < code.size && code.getModule(x, y)) x += 1;
      const run = x - start;
      parts.push(
        `M${String(start + QR_QUIET_ZONE)} ${String(y + QR_QUIET_ZONE)}h${String(run)}v1h-${String(run)}z`
      );
    }
  }
  return { size: code.size + QR_QUIET_ZONE * 2, d: parts.join('') };
}

export interface QrProps {
  /** The bytes to encode. Never drawn as text. */
  payload: string;
  /** The accessible name. The caller's words, never the payload. */
  label: string;
}

export function Qr({ payload, label }: QrProps): React.JSX.Element | null {
  const shape = useMemo(() => qrShape(payload), [payload]);
  if (shape === null) return null;
  return (
    <svg
      className="phone-qr"
      viewBox={`0 0 ${String(shape.size)} ${String(shape.size)}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      style={{
        colorScheme: QR_COLOR_SCHEME,
        width: `${String(shape.size * qrModulePx(shape.size))}px`
      }}
      data-qr-modules={shape.size - QR_QUIET_ZONE * 2}
    >
      <rect
        width={shape.size}
        height={shape.size}
        style={{ fill: QR_GROUND }}
        data-qr-part="ground"
      />
      <path d={shape.d} style={{ fill: QR_INK }} data-qr-part="ink" />
    </svg>
  );
}
