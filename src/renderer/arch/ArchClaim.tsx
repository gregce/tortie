/**
 * THE MODEL-WRITTEN THING, drawn once (Phase 259).
 *
 * A claim on the inspector, a reason on the gates worksheet and a step in a
 * journey are the same object on the face: a sentence somebody's agent wrote,
 * the citations under it graded by what the deterministic half found at each
 * line, and a stale mark when a cited fact is gone. So there is ONE component
 * for it here and three callers, rather than three copies that can drift into
 * saying different things about the same evidence.
 *
 * ## WHAT IS NEVER DRAWN
 *
 * No verdict about the sentence. `cite.ts`'s header has the whole reason: this
 * product's refusals catch 3 of 7 planted lies, measured by
 * `conformance:semantic` rule 7 rather than inherited from research 118's own
 * checker, so a chip is attribution and a hover says a fact was found at a
 * line. The agent's name is drawn as
 * `read by <agent>`, which says who wrote it, not that it is right.
 *
 * ## STALE IS A MARK AND NEVER A DELETION
 *
 * A claim whose citation died keeps its sentence byte for byte and gains the
 * stale chip, and `staleReason` names the citation that went (SPEC §3.3).
 * Nothing on this side re-asks any agent: the refresh is main's pure
 * fingerprint pass, and the re-ask is a person's own gesture.
 *
 * ## THE RATE AND ITS FLOOR TRAVEL TOGETHER
 *
 * {@link RateLine} takes the whole reading, so the chance share is on screen
 * beside the count and the per grade breakdown rides the hover. There is no
 * one-argument form anywhere in this folder.
 */

import React from 'react';
import type {
  ArchCiteReading,
  ArchClaimReading,
  ArchRateReading
} from '@shared/arch';
import { Codicon } from '../icons';
import { gmuxBridge } from '../bridge';
import {
  citeClass,
  citeFaceOf,
  citeRate,
  citeRateTitle,
  citeTitle,
  citeChanceCount
} from './cite';
import {
  ARCH_NO_READING,
  ARCH_NO_READING_SETTINGS,
  ARCH_NO_READING_SUB,
  archReadBy
} from './copy';
import { openArchRow } from './open-row';

/**
 * One chip. The glyph and the word are the signal; the tone is the third
 * signal and never the only one. A click opens the cited line, the same door
 * a fact row goes through, so a person can go and look rather than believe.
 */
export function CiteChip({
  cite,
  repoKey = null
}: {
  cite: ArchCiteReading;
  /** The repository the line lives in, or null to draw the chip unclickable. */
  repoKey?: string | null;
}): React.JSX.Element | null {
  const face = citeFaceOf(cite);
  if (face === null) return null;
  const title = citeTitle(cite);
  const body = (
    <>
      <Codicon name={face.icon} size="sm" />
      <span>{face.word}</span>
    </>
  );
  if (repoKey === null) {
    return (
      <span
        className={citeClass(face.tone)}
        data-grade={cite.dead ? 'stale' : cite.grade}
        data-at={cite.at}
        title={title}
      >
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={citeClass(face.tone)}
      data-grade={cite.dead ? 'stale' : cite.grade}
      data-at={cite.at}
      title={title}
      onClick={() => {
        openArchRow({ repoKey, relPath: cite.relPath, line: cite.line });
      }}
    >
      {body}
    </button>
  );
}

/** The chips of one claim, in the order the model wrote them. */
export function CiteChips({
  cites,
  repoKey = null
}: {
  cites: readonly ArchCiteReading[];
  repoKey?: string | null;
}): React.JSX.Element | null {
  if (cites.length === 0) return null;
  return (
    <span className="arch-cite-chips">
      {cites.map((c, i) => (
        <CiteChip key={`${c.at} ${String(i)}`} cite={c} repoKey={repoKey} />
      ))}
    </span>
  );
}

/**
 * One claim: the sentence, its chips, and the stale reason behind the hover.
 *
 * `data-stale` is on the element rather than in a class, because the probe
 * reads it and a class list is a worse contract than an attribute.
 */
export function ClaimBody({
  claim,
  repoKey = null
}: {
  claim: ArchClaimReading;
  repoKey?: string | null;
}): React.JSX.Element {
  return (
    <span
      className="arch-claim"
      data-field={claim.field}
      data-stale={claim.stale ? 'true' : 'false'}
      {...(claim.stale && claim.staleReason !== null
        ? { title: claim.staleReason }
        : {})}
    >
      <span className="arch-claim-text">{claim.text}</span>
      <CiteChips cites={claim.cites} repoKey={repoKey} />
    </span>
  );
}

/** The `read by <agent>` label. Who wrote it, never that it is right. */
export function ReadBy({ agentId }: { agentId: string | null }): React.JSX.Element {
  return <span className="arch-read-by">{archReadBy(agentId)}</span>;
}

/**
 * The backing of one scope, as a pair. The chance count is drawn, never
 * implied, and the per grade breakdown and the gate shaped line ride the
 * hover so the resting face stays one line.
 */
export function RateLine({ rate }: { rate: ArchRateReading }): React.JSX.Element {
  return (
    <span
      className="arch-rate"
      data-backed={String(rate.backed)}
      data-total={String(rate.total)}
      data-floor={String(citeChanceCount(rate))}
      data-floor-within={String(rate.floorWithin)}
      data-floor-lines={String(rate.floorLines)}
      title={citeRateTitle(rate)}
    >
      {citeRate(rate)}
    </span>
  );
}

/**
 * The whole face of a repository nothing has read: one line, one button.
 *
 * The button opens the Settings WINDOW, which is the one surface the Phase 23
 * agreement lives behind. It renders without the button on a build whose
 * preload has no `openSettings`, because a control that cannot work is worse
 * than a sentence that names where to go.
 */
export function NoReading(): React.JSX.Element {
  const bridge = gmuxBridge();
  const openSettings =
    bridge?.openSettings === undefined ? null : bridge.openSettings.bind(bridge);
  return (
    <div className="arch-no-reading" data-slot="arch-no-reading">
      <p>
        <strong>{ARCH_NO_READING}</strong> {ARCH_NO_READING_SUB}
      </p>
      {openSettings === null ? null : (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void openSettings()}
        >
          {ARCH_NO_READING_SETTINGS}
        </button>
      )}
    </div>
  );
}
