/**
 * The map, being one hand written `<svg>`, the whole picture (Phase 160,
 * drill and reflow 161, regions and the rung chip 258).
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
 * ## The camera (Phase 162)
 *
 * Every scene child sits inside ONE `<g class="arch-map-camera">` whose
 * transform is the camera; `<defs>` stays outside because markers are
 * definitions, not scenery. The svg's viewBox is the measured viewport in
 * CSS pixels, so one viewBox unit is one screen pixel and the gesture
 * layer's pointer math needs no fitting correction; the rest camera is the
 * FIT transform of the layout against that viewport, clamped by
 * MAP_MAX_UPSCALE, which draws the exact picture the Phase 161 `meet`
 * fitting drew. The camera engine (`./camera/useCamera`) writes the
 * transform attribute imperatively at 120 Hz during a gesture and commits
 * through React at rest, so a given camera state always renders one exact,
 * byte stable picture. Without the `canvas` seam the picture is exactly as
 * static as Phase 161 left it.
 *
 * ## Regions, wires and the rung chip (Phase 258)
 *
 * A model that carries regions draws each region as a FRAME around the band
 * layout of its own boxes (SPEC §4.2), its label uppercase and its sub and
 * starts line under it, with the labelled transports as WIRES between
 * adjacent frames and inside the dashed Outside band. Every box's label
 * gains the rung chip after the provenance glyph: a codicon in one of two
 * tokens, the rung word on `data-rung`, and the sentence with its counts on
 * the hover. NO NUMBER IS DRAWN ON A NODE; a transport's count is on the
 * wire, which is not a node, and that is the whole difference.
 *
 * ## Selection is one gesture short of the drill (Phase 258, SPEC D5)
 *
 * When the container hands `onSelectGroup` in, a single click or Enter on a
 * box SELECTS it (`aria-pressed`), a double click or Enter on the box that is
 * already selected DRILLS, and Escape clears. Without that prop a click
 * drills exactly as Phase 161 wired it, which is what the scoped picture and
 * the older suites still do.
 *
 * ## What is deliberately absent
 *
 * No number appears on any node or edge, because weight is size and
 * thickness, and the dashboard refusal survives. The interactions are the
 * drill and the selection (a box is a button when the container hands a
 * handler in) and the camera (when the container hands `canvas` in); the
 * frame stubs of a scoped picture are context, never buttons, because the
 * ladder is the navigation.
 */

import { useMemo, type FC, type KeyboardEvent } from 'react';
import { Codicon } from '../../icons/Codicon';
import { isOurs, provenanceIcon, provenanceTitle, provenanceWord } from '../provenance';
import type { ArchEvidenceRung } from '@shared/arch';
import { RUNG_FACES, isRung, rungClass, rungTitle } from '../rung';
import { ARCH_OUTSIDE_EMPTY } from '../copy';
import {
  MAP_BAND_COL,
  MAP_BOX_R,
  MAP_LABEL_INSET,
  MAP_PAD,
  MAP_REGION_PAD,
  MAP_REGION_HEAD_H,
  MAP_WIRE_H,
  edgeMarkerId,
  edgeMaxCount,
  edgeVerdictClass,
  planEdges,
  planFrameEdges
} from './geometry';
import {
  drawableEdges,
  layoutMap,
  MAP_DEFAULT_VIEWPORT,
  type MapBox,
  type MapRegionFrame,
  type MapStub,
  type MapViewport,
  type MapWire
} from './layout';
import { bandWord, type ArchMapModel } from './types';
import { useCamera } from './camera/useCamera';
import type { ArchCanvasSeam } from './camera/seam';
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
   * Phase 161, the drill seam: when present, every box is a button and the
   * drill gesture hands back the box's group id. Absent, the picture is as
   * static as Phase 160 drew it.
   */
  onOpenGroup?: (groupId: string) => void;
  /**
   * Phase 258, the selection seam: when present, a single click selects
   * rather than drills, the drill moves to a double click or a second
   * Enter, and `null` is Escape clearing the selection.
   */
  onSelectGroup?: (groupId: string | null) => void;
  /** Phase 258: the box the container holds selected, drawn `aria-pressed`. */
  selectedId?: string | null;
  /**
   * Phase 162, the canvas seam: the kept camera in, the live camera handle
   * and the at-rest saves out. When present the map pans, zooms and glides;
   * absent, the camera stands at the fit and no listener attaches.
   */
  canvas?: ArchCanvasSeam;
}

/** What an empty model says instead of a blank surface. */
export const ARCH_MAP_EMPTY = 'Nothing to draw yet.';

/** The sentence a grey box carries for the part whose imports are unknown. */
export const ARCH_MAP_UNKNOWN_WORD = 'imports unknown';
export const ARCH_MAP_UNKNOWN_TITLE =
  'Tortie cannot follow imports in this language yet, so this part draws grey rather than guessing.';

/** The four gestures a box answers. */
export type BoxGesture = 'click' | 'dblclick' | 'enter' | 'escape';

/** What a gesture does to a box: select it, open it, clear the selection, or nothing. */
export type BoxMove = 'select' | 'open' | 'clear' | null;

/**
 * THE GESTURE RULE (Phase 258, SPEC D5), pure so the suite pins it.
 *
 * Without the selection seam every press opens, which is exactly Phase 161.
 * With it, a click or Enter selects; a double click, or Enter on the box
 * that is already selected, opens; Escape clears. A click on the selected
 * box selects it again, which is a no-op the store folds, so a slow double
 * click can never drill by accident.
 */
export function boxMove(input: {
  selects: boolean;
  selectedId: string | null;
  id: string;
  gesture: BoxGesture;
}): BoxMove {
  const { selects, selectedId, id, gesture } = input;
  if (!selects) return gesture === 'click' || gesture === 'enter' ? 'open' : null;
  switch (gesture) {
    case 'click':
      return 'select';
    case 'dblclick':
      return 'open';
    case 'enter':
      return selectedId === id ? 'open' : 'select';
    case 'escape':
      return 'clear';
  }
}

/** The rung word a box carries, or null when the model has none it knows. */
function rungOf(box: MapBox): ArchEvidenceRung | null {
  const r = box.group.rung;
  return r !== undefined && isRung(r.rung) ? r.rung : null;
}

/**
 * The hover sentence for one box. Words only, never a count.
 *
 * PHASE 158: the purpose sentence rides early, right after the name. It is
 * the contract author's own first sentence about what the part is FOR, and
 * putting it here is what makes the purpose readable from the picture itself
 * rather than only from the cockpit's prose panel. A computed box has no
 * purpose sentence and says its provenance alone, exactly as before.
 *
 * PHASE 176: "Click to look inside" rides FIRST, before the purpose. It was
 * buried at the tail of the sentence while the drill was dead to the mouse,
 * so the one affordance line was the last thing a person read.
 *
 * PHASE 258: under the selection gesture the affordance names both moves.
 */
function boxTitle(box: MapBox, clickable: boolean, selects: boolean): string {
  const prov = provenanceTitle(box.group.provenance);
  const purpose =
    box.group.description != null && box.group.description.length > 0
      ? ` ${box.group.description}`
      : '';
  const unknown = box.group.unresolved ? ` ${ARCH_MAP_UNKNOWN_TITLE}` : '';
  const open = !clickable
    ? ''
    : selects
      ? ' Click to select, double click to look inside.'
      : ' Click to look inside.';
  return `${box.group.label}.${open}${purpose} ${prov}${unknown}`;
}

/** The class list one box wears. */
function boxClass(box: MapBox, clickable: boolean, selected: boolean): string {
  const parts = ['arch-map-box'];
  if (!isOurs(box.group.provenance)) parts.push('arch-map-theirs');
  if (box.group.unresolved) parts.push('arch-map-grey');
  if (clickable) parts.push('arch-map-click');
  if (selected) parts.push('selected');
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

/** The XHTML namespace attribute, spread past the DOM typings. */
const XHTML = { xmlns: 'http://www.w3.org/1999/xhtml' };

/**
 * PHASE 258. One region's frame: the rounded rectangle, the heading block
 * with the label, the sub and the starts line, and the band words of the
 * boxes inside it. The Outside band wears the dashed class and says its
 * one sentence instead of band words.
 */
const RegionFrame: FC<{ frame: MapRegionFrame }> = ({ frame }) => {
  const r = frame.region;
  const outside = r.kind === 'outside';
  return (
    <g
      className={`arch-map-region arch-map-region-${r.kind}`}
      data-region={r.id}
    >
      <rect
        className="arch-map-region-rect"
        x={frame.x}
        y={frame.y}
        width={frame.w}
        height={frame.h}
        rx={MAP_BOX_R + 2}
      />
      <foreignObject
        x={frame.x + MAP_REGION_PAD}
        y={frame.y + MAP_REGION_PAD / 2}
        width={Math.max(0, frame.w - MAP_REGION_PAD * 2)}
        height={MAP_REGION_HEAD_H - MAP_REGION_PAD / 2}
      >
        <div className="arch-map-region-head" {...XHTML}>
          <span className="arch-map-region-label" title={r.label}>
            {r.label}
          </span>
          <span className="arch-map-region-sub" title={r.sub}>
            {r.sub}
          </span>
          {outside ? (
            <span className="arch-map-region-empty">{ARCH_OUTSIDE_EMPTY}</span>
          ) : r.startsLine !== null ? (
            <span
              className="arch-map-starts"
              title={r.startsTitle ?? undefined}
            >
              {r.startsLine}
            </span>
          ) : null}
        </div>
      </foreignObject>
      {frame.rows.map((row) => (
        <text
          key={row.band}
          className="arch-map-band"
          x={frame.bandX}
          y={row.y + row.h / 2}
        >
          {bandWord(row.band)}
        </text>
      ))}
      {frame.rows.length > 0 ? (
        <line
          className="arch-map-band-rule"
          x1={frame.bandX + MAP_BAND_COL - MAP_PAD - 12}
          y1={frame.y + MAP_REGION_HEAD_H}
          x2={frame.bandX + MAP_BAND_COL - MAP_PAD - 12}
          y2={frame.y + frame.h - MAP_REGION_PAD}
        />
      ) : null}
    </g>
  );
};

/**
 * PHASE 258. One wire: the label with its arrow, the count in it, and the
 * hairline under it, in the mock's own `.wire` shape. A foreignObject so
 * the text ellipsises to its column instead of running into a frame.
 */
const Wire: FC<{ wire: MapWire }> = ({ wire }) => (
  <g
    className={`arch-map-wire arch-map-wire-${wire.direction}`}
    data-kind={wire.transport.kind}
    data-from={wire.transport.from}
    data-to={wire.transport.to}
    data-count={wire.transport.count}
  >
    <foreignObject x={wire.x} y={wire.y} width={wire.w} height={MAP_WIRE_H}>
      <div className="arch-map-wire-label" {...XHTML} title={wire.transport.title}>
        <span>{wire.text}</span>
      </div>
    </foreignObject>
  </g>
);

/**
 * The map of one scope: a repository's parts at level 1, or one part's
 * modules with its frame at level 2. Size is file count, thickness is import
 * count, provenance is style, and the honest grey says whose imports nobody
 * could read.
 */
export const ArchMap: FC<ArchMapProps> = ({
  model,
  viewport,
  onOpenGroup,
  onSelectGroup,
  selectedId,
  canvas
}) => {
  const layout = useMemo(() => layoutMap(model, viewport), [model, viewport]);
  const frame = model.frame ?? NO_FRAME;
  const modelEdges = useMemo(() => drawableEdges(model, layout), [model, layout]);
  const maxCount = useMemo(() => edgeMaxCount(modelEdges, frame), [modelEdges, frame]);
  const edges = useMemo(
    () => planEdges(layout, modelEdges, maxCount),
    [layout, modelEdges, maxCount]
  );
  const frameEdges = useMemo(
    () => planFrameEdges(layout, frame, maxCount),
    [layout, frame, maxCount]
  );

  // The pixel space the svg draws in: the measured viewport, or the layout
  // default, so a bare render stays deterministic. Hooks run before the
  // empty-model return, per the rules of hooks.
  const vp = viewport ?? MAP_DEFAULT_VIEWPORT;
  const camera = useCamera(layout, vp, canvas);

  if (layout.boxes.length === 0) {
    return <p className="arch-map-empty">{ARCH_MAP_EMPTY}</p>;
  }

  const clickable = onOpenGroup !== undefined || onSelectGroup !== undefined;
  const selects = onSelectGroup !== undefined;
  // One decision for every gesture, through the pure rule below, so the
  // suite can pin it without a DOM.
  const act = (id: string, gesture: BoxGesture): void => {
    const move = boxMove({ selects, selectedId: selectedId ?? null, id, gesture });
    if (move === 'select') onSelectGroup?.(id);
    else if (move === 'clear') onSelectGroup?.(null);
    else if (move === 'open') onOpenGroup?.(id);
  };
  const keyOn = (id: string) => (event: KeyboardEvent<SVGGElement>): void => {
    const gesture: BoxGesture | null =
      event.key === 'Escape'
        ? 'escape'
        : event.key === 'Enter' || event.key === ' '
          ? 'enter'
          : null;
    if (gesture === null) return;
    if (gesture === 'escape' && !selects) return;
    event.preventDefault();
    act(id, gesture);
  };

  return (
    <svg
      ref={camera.bindSvg}
      className="arch-map-svg"
      viewBox={`0 0 ${vp.width} ${vp.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Map of the codebase"
    >
      <defs>
        <Arrow id="arch-map-arrow" cls="arch-map-head" />
        <Arrow id="arch-map-arrow-holds" cls="arch-map-head-holds" />
        <Arrow id="arch-map-arrow-broke" cls="arch-map-head-broke" />
      </defs>

      {/* THE CAMERA: one transform over the whole scene, defs excluded.
          The engine rewrites this attribute imperatively while a gesture,
          glide or flight is live; at rest React renders the same bytes. */}
      <g
        ref={camera.bindScene}
        className="arch-map-camera"
        transform={camera.transform}
      >
      {/* PHASE 258: the frames draw first, under everything, so a box and
          its edges sit on the region's ground. */}
      {layout.regions.map((f) => (
        <RegionFrame key={f.region.id} frame={f} />
      ))}

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
            <div className="arch-map-stub-label" {...XHTML}>
              <span className="arch-map-stub-name" title={stub.label}>
                {stub.label}
              </span>
            </div>
          </foreignObject>
        </g>
      ))}

      {layout.wires.map((wire) => (
        <Wire
          key={`wire ${wire.transport.from} ${wire.transport.to} ${wire.transport.kind}`}
          wire={wire}
        />
      ))}

      {layout.boxes.map((box) => {
        const rung = rungOf(box);
        const reading = box.group.rung;
        const selected = selects && selectedId === box.group.id;
        const word = rung === null ? '' : `, ${RUNG_FACES[rung].word}`;
        return (
          <g
            key={box.group.id}
            className={boxClass(box, clickable, selected)}
            data-group={box.group.id}
            data-region={box.group.regionId}
            {...(rung === null ? {} : { 'data-rung': rung })}
            {...(clickable
              ? {
                  role: 'button',
                  tabIndex: 0,
                  'aria-label': `Look inside ${box.group.label}${word}`,
                  ...(selects ? { 'aria-pressed': selected } : {}),
                  onClick: () => act(box.group.id, 'click'),
                  ...(selects
                    ? { onDoubleClick: () => act(box.group.id, 'dblclick') }
                    : {}),
                  onKeyDown: keyOn(box.group.id)
                }
              : {})}
          >
            <title>{boxTitle(box, clickable, selects)}</title>
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
              <div className="arch-map-label" {...XHTML}>
                <span className="arch-map-name" title={box.group.label}>
                  {box.group.label}
                </span>
                <span className="arch-map-prov">
                  <span
                    className="arch-map-prov-word"
                    title={provenanceTitle(box.group.provenance)}
                  >
                    <Codicon name={provenanceIcon(box.group.provenance)} size="sm" />
                    <span>{provenanceWord(box.group.provenance)}</span>
                  </span>
                  {rung !== null && reading !== undefined ? (
                    // PHASE 258: the rung chip. The glyph alone on the face;
                    // the word is on the box's data-rung and the sentence
                    // with its counts on the hover. Never a number here.
                    <span
                      className={`arch-map-rung ${rungClass(rung)}`}
                      data-rung={rung}
                      title={rungTitle({ ...reading, rung })}
                    >
                      <Codicon name={RUNG_FACES[rung].icon} size="sm" />
                    </span>
                  ) : null}
                </span>
                {box.group.unresolved ? (
                  <span className="arch-map-unknown" title={ARCH_MAP_UNKNOWN_TITLE}>
                    {ARCH_MAP_UNKNOWN_WORD}
                  </span>
                ) : null}
              </div>
            </foreignObject>
          </g>
        );
      })}
      {
        // The band column separator, so the words read as a scale rather
        // than as strays. Drawn last and thin. A regioned picture draws one
        // per frame instead, inside RegionFrame.
      }
      {layout.regions.length === 0 ? (
        <line
          className="arch-map-band-rule"
          x1={MAP_BAND_COL - 12}
          y1={MAP_PAD}
          x2={MAP_BAND_COL - 12}
          y2={layout.height - MAP_PAD}
        />
      ) : null}
      </g>
    </svg>
  );
};
