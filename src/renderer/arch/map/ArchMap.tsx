/**
 * The map, being one hand written `<svg>`, the whole picture (Phase 160,
 * drill and reflow 161).
 *
 * The thin React half of the map, in the `scm/graph/CommitGraph.tsx` mould:
 * layout and geometry are pure modules next door, and this file only walks
 * their output and emits elements. No store, no bridge, no IPC: the model
 * arrives as a prop and the same model in the same viewport always renders
 * the same markup, which is what the determinism test compares byte for byte.
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
 * ## How the picture fills the tab (Phase 161)
 *
 * The container measures itself and hands the size in as `viewport`. The
 * layout wraps its bands against that size, so the picture's aspect tracks
 * the tab's, and the `viewBox` with `meet` then scales it up to use the
 * surface. The one bound is `MAP_MAX_UPSCALE`, applied as an inline max size,
 * so a two box repository does not become a billboard. Without a measurement
 * the layout uses one fixed default viewport, which keeps the server render
 * and the tests deterministic.
 *
 * ## What is deliberately absent
 *
 * No number appears on any node or edge, because weight is size and
 * thickness, and the dashboard refusal survives. No pan, no zoom, no drag:
 * still Phase 162. The one interaction is the drill: a box is a button when
 * the container hands `onOpenGroup` in, and the frame stubs of a scoped
 * picture are context, never buttons, because the ladder is the navigation.
 */

import { useMemo, type FC, type KeyboardEvent } from 'react';
import { Codicon } from '../../icons/Codicon';
import { isOurs, provenanceIcon, provenanceTitle, provenanceWord } from '../provenance';
import {
  MAP_BAND_COL,
  MAP_BOX_R,
  MAP_LABEL_INSET,
  MAP_MAX_UPSCALE,
  MAP_PAD,
  edgeMarkerId,
  edgeMaxCount,
  edgeVerdictClass,
  planEdges,
  planFrameEdges
} from './geometry';
import { layoutMap, type MapBox, type MapStub, type MapViewport } from './layout';
import { bandWord, type ArchMapModel } from './types';
import './map.css';

export interface ArchMapProps {
  model: ArchMapModel;
  /**
   * The surface the picture is drawing into, in CSS pixels, measured by the
   * container. The layout wraps against it so the picture fills the tab.
   * Absent, one fixed default applies and the render stays deterministic.
   */
  viewport?: MapViewport;
  /**
   * Phase 161, the drill seam: when present, every box is a button and a
   * click or Enter hands back the box's group id. Absent, the picture is as
   * static as Phase 160 drew it.
   */
  onOpenGroup?: (groupId: string) => void;
}

/** What an empty model says instead of a blank surface. */
export const ARCH_MAP_EMPTY = 'Nothing to draw yet.';

/** The sentence a grey box carries for the part whose imports are unknown. */
export const ARCH_MAP_UNKNOWN_WORD = 'imports unknown';
export const ARCH_MAP_UNKNOWN_TITLE =
  'Tortie cannot follow imports in this language yet, so this part draws grey rather than guessing.';

/** The hover sentence for one box. Words only, never a count. */
function boxTitle(box: MapBox, clickable: boolean): string {
  const prov = provenanceTitle(box.group.provenance);
  const unknown = box.group.unresolved ? ` ${ARCH_MAP_UNKNOWN_TITLE}` : '';
  const open = clickable ? ' Click to look inside.' : '';
  return `${box.group.label}. ${prov}${unknown}${open}`;
}

/** The class list one box wears. */
function boxClass(box: MapBox, clickable: boolean): string {
  const parts = ['arch-map-box'];
  if (!isOurs(box.group.provenance)) parts.push('arch-map-theirs');
  if (box.group.unresolved) parts.push('arch-map-grey');
  if (clickable) parts.push('arch-map-click');
  return parts.join(' ');
}

/** The hover sentence for one frame stub. Direction as plain words. */
function stubTitle(stub: MapStub): string {
  return stub.direction === 'in'
    ? `${stub.label} imports this part. The drill stays inside the part; go up to visit it.`
    : `This part imports ${stub.label}. The drill stays inside the part; go up to visit it.`;
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

const NO_FRAME: readonly [] = [];

/**
 * The map of one scope: a repository's parts at level 1, or one part's
 * modules with its frame at level 2. Size is file count, thickness is import
 * count, provenance is style, and the honest grey says whose imports nobody
 * could read.
 */
export const ArchMap: FC<ArchMapProps> = ({ model, viewport, onOpenGroup }) => {
  const layout = useMemo(() => layoutMap(model, viewport), [model, viewport]);
  const frame = model.frame ?? NO_FRAME;
  const maxCount = useMemo(() => edgeMaxCount(model.edges, frame), [model.edges, frame]);
  const edges = useMemo(
    () => planEdges(layout, model.edges, maxCount),
    [layout, model.edges, maxCount]
  );
  const frameEdges = useMemo(
    () => planFrameEdges(layout, frame, maxCount),
    [layout, frame, maxCount]
  );

  if (layout.boxes.length === 0) {
    return <p className="arch-map-empty">{ARCH_MAP_EMPTY}</p>;
  }

  const clickable = onOpenGroup !== undefined;
  const keyOpen = (id: string) => (event: KeyboardEvent<SVGGElement>): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onOpenGroup?.(id);
  };

  return (
    <svg
      className="arch-map-svg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        maxWidth: layout.width * MAP_MAX_UPSCALE,
        maxHeight: layout.height * MAP_MAX_UPSCALE
      }}
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
            key={`${planned.edge.from} > ${planned.edge.to}`}
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

      {frameEdges.map((planned) => (
        <path
          key={`frame ${planned.edge.direction} ${planned.edge.outsideId} ${planned.edge.boxId}`}
          className="arch-map-edge arch-map-frame-edge"
          d={planned.path}
          strokeWidth={planned.strokeWidth}
          fill="none"
          markerEnd="url(#arch-map-arrow)"
        >
          <title>
            {planned.edge.direction === 'in'
              ? `${planned.edge.outsideLabel} imports ${planned.edge.boxId}`
              : `${planned.edge.boxId} imports ${planned.edge.outsideLabel}`}
          </title>
        </path>
      ))}

      {layout.stubs.map((stub) => (
        <g
          key={`stub ${stub.direction} ${stub.id}`}
          className="arch-map-stub"
          data-outside={stub.id}
        >
          <title>{stubTitle(stub)}</title>
          <rect
            className="arch-map-stub-rect"
            x={stub.x}
            y={stub.y}
            width={stub.w}
            height={stub.h}
            rx={MAP_BOX_R}
          />
          <foreignObject x={stub.x} y={stub.y} width={stub.w} height={stub.h}>
            <div
              className="arch-map-stub-label"
              {...{ xmlns: 'http://www.w3.org/1999/xhtml' }}
            >
              <span className="arch-map-stub-name" title={stub.label}>
                {stub.label}
              </span>
            </div>
          </foreignObject>
        </g>
      ))}

      {layout.boxes.map((box) => (
        <g
          key={box.group.id}
          className={boxClass(box, clickable)}
          data-group={box.group.id}
          {...(clickable
            ? {
                role: 'button',
                tabIndex: 0,
                'aria-label': `Look inside ${box.group.label}`,
                onClick: () => onOpenGroup(box.group.id),
                onKeyDown: keyOpen(box.group.id)
              }
            : {})}
        >
          <title>{boxTitle(box, clickable)}</title>
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
