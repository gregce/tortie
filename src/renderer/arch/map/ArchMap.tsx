/**
 * The map, being one hand written `<svg>`, the whole picture (Phase 160).
 *
 * The thin React half of the map, in the `scm/graph/CommitGraph.tsx` mould:
 * layout and geometry are pure modules next door, and this file only walks
 * their output and emits elements. No store, no bridge, no IPC: the model
 * arrives as a prop and the same model always renders the same markup, which
 * is what the determinism test compares byte for byte.
 *
 * ## Why the labels live in `<foreignObject>`
 *
 * A box's label must truncate to its box. SVG `<text>` cannot ellipsize, and
 * every hand rolled character-width estimate is a lie in a proportional font.
 * A `foreignObject` holding ordinary HTML gets real CSS truncation for free,
 * and it also lets the provenance glyph reuse the house `Codicon` component,
 * whose icon font draws through a `::before` rule that SVG text can never
 * carry. The markup is still deterministic: truncation happens visually in
 * CSS, never in the emitted bytes.
 *
 * ## What is deliberately absent
 *
 * No number appears on any node or edge, because weight is size and thickness, and
 * the dashboard refusal survives. No pan, no zoom, no drag, no click: the
 * picture is static and scales to its container through the `viewBox`, so
 * Phase 162 adds a transform without touching the drawing, and Phase 161
 * re-renders this same component over a scoped model to drill down.
 */

import { useMemo, type FC } from 'react';
import { Codicon } from '../../icons/Codicon';
import { isOurs, provenanceIcon, provenanceTitle, provenanceWord } from '../provenance';
import {
  MAP_BAND_COL,
  MAP_BOX_R,
  MAP_LABEL_INSET,
  MAP_PAD,
  edgeMarkerId,
  edgeVerdictClass,
  planEdges
} from './geometry';
import { layoutMap, type MapBox } from './layout';
import { bandWord, type ArchMapModel } from './types';
import './map.css';

export interface ArchMapProps {
  model: ArchMapModel;
}

/** What an empty model says instead of a blank surface. */
export const ARCH_MAP_EMPTY = 'Nothing to draw yet.';

/** The sentence a grey box carries for the part whose imports are unknown. */
export const ARCH_MAP_UNKNOWN_WORD = 'imports unknown';
export const ARCH_MAP_UNKNOWN_TITLE =
  'Tortie cannot follow imports in this language yet, so this part draws grey rather than guessing.';

/** The hover sentence for one box. Words only, never a count. */
function boxTitle(box: MapBox): string {
  const prov = provenanceTitle(box.group.provenance);
  const unknown = box.group.unresolved ? ` ${ARCH_MAP_UNKNOWN_TITLE}` : '';
  return `${box.group.label}. ${prov}${unknown}`;
}

/** The class list one box wears. */
function boxClass(box: MapBox): string {
  const parts = ['arch-map-box'];
  if (!isOurs(box.group.provenance)) parts.push('arch-map-theirs');
  if (box.group.unresolved) parts.push('arch-map-grey');
  return parts.join(' ');
}

/**
 * One arrowhead marker. Fill comes from the class, so colour stays a token.
 * `userSpaceOnUse` keeps the head one size whatever the stroke, and 14 units
 * is wider than the thickest stroke, so a heavy edge never swallows its own
 * arrow and a thin one still reads as directed.
 */
const Arrow: FC<{ id: string; cls: string }> = ({ id, cls }) => (
  <marker
    id={id}
    viewBox="0 0 8 8"
    refX="7"
    refY="4"
    markerWidth="14"
    markerHeight="14"
    markerUnits="userSpaceOnUse"
    orient="auto-start-reverse"
  >
    <path d="M 0 0 L 8 4 L 0 8 z" className={cls} />
  </marker>
);

/**
 * The level 1 map of one repository: five to nine boxes, their imports as
 * edges. Size is file count, thickness is import count, provenance is style,
 * and the honest grey says whose imports nobody could read.
 */
export const ArchMap: FC<ArchMapProps> = ({ model }) => {
  const layout = useMemo(() => layoutMap(model), [model]);
  const edges = useMemo(() => planEdges(layout, model.edges), [layout, model.edges]);

  if (layout.boxes.length === 0) {
    return <p className="arch-map-empty">{ARCH_MAP_EMPTY}</p>;
  }

  return (
    <svg
      className="arch-map-svg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Map of the codebase"
    >
      <defs>
        <Arrow id="arch-map-arrow" cls="arch-map-head" />
        <Arrow id="arch-map-arrow-holds" cls="arch-map-head-holds" />
        <Arrow id="arch-map-arrow-broke" cls="arch-map-head-broke" />
      </defs>

      {layout.rows.map((row) => (
        <text
          key={row.band}
          className="arch-map-band"
          x={MAP_PAD}
          y={row.y + row.h / 2}
        >
          {bandWord(row.band)}
        </text>
      ))}

      {edges.map((planned) => {
        const cls = edgeVerdictClass(planned.edge.verdict);
        return (
          <path
            key={`${planned.edge.from}\u0000${planned.edge.to}`}
            className={`arch-map-edge${cls === '' ? '' : ` ${cls}`}`}
            d={planned.path}
            strokeWidth={planned.strokeWidth}
            fill="none"
            markerEnd={`url(#${edgeMarkerId(planned.edge.verdict)})`}
          >
            <title>{`${planned.edge.from} imports ${planned.edge.to}`}</title>
          </path>
        );
      })}

      {layout.boxes.map((box) => (
        <g key={box.group.id} className={boxClass(box)} data-group={box.group.id}>
          <title>{boxTitle(box)}</title>
          <rect
            className="arch-map-box-rect"
            x={box.x}
            y={box.y}
            width={box.w}
            height={box.h}
            rx={MAP_BOX_R}
          />
          <foreignObject
            x={box.x + MAP_LABEL_INSET}
            y={box.y + MAP_LABEL_INSET}
            width={Math.max(0, box.w - MAP_LABEL_INSET * 2)}
            height={Math.max(0, box.h - MAP_LABEL_INSET * 2)}
          >
            {/* The XHTML namespace matters only to an XML parser; Chromium's
                HTML parser puts foreignObject children in the HTML namespace
                by itself. Spread past the DOM typings, which do not know the
                attribute on a div. */}
            <div
              className="arch-map-label"
              {...{ xmlns: 'http://www.w3.org/1999/xhtml' }}
            >
              <span className="arch-map-name" title={box.group.label}>
                {box.group.label}
              </span>
              <span
                className="arch-map-prov"
                title={provenanceTitle(box.group.provenance)}
              >
                <Codicon name={provenanceIcon(box.group.provenance)} size={12} />
                <span>{provenanceWord(box.group.provenance)}</span>
              </span>
              {box.group.unresolved ? (
                <span className="arch-map-unknown" title={ARCH_MAP_UNKNOWN_TITLE}>
                  {ARCH_MAP_UNKNOWN_WORD}
                </span>
              ) : null}
            </div>
          </foreignObject>
        </g>
      ))}
      {
        // The band column separator, so the words read as a scale rather
        // than as strays. Drawn last and thin.
      }
      <line
        className="arch-map-band-rule"
        x1={MAP_BAND_COL - 12}
        y1={MAP_PAD}
        x2={MAP_BAND_COL - 12}
        y2={layout.height - MAP_PAD}
      />
    </svg>
  );
};
