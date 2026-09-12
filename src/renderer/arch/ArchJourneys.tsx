/**
 * THE JOURNEYS VIEW (Phase 259): how setup reaches a result, as numbered
 * steps across the parts the map draws.
 *
 * It is the first surface in this pane whose sentences a model wrote, and its
 * whole design is that every one of them is attributable in one glance: a
 * step is its number, the part it happens in, one line saying what happens,
 * and the citation chips for it. Nothing else is on the resting face. The
 * `why` of a citation, the fact behind it and the grade's own sentence all
 * ride the hover, which is the just-enough-words rule.
 *
 * ## TWO SOURCES, AND THE PERSON'S OWN COMES FIRST
 *
 * A journey committed under `docs/arch/flows/` is the person's and is drawn
 * first, under `from this repository's own contract`. A journey an agent read
 * is drawn after it, under `read by <agent>`. A model journey never overwrites
 * one out of the contract: they are two groups and both are on screen, because
 * the disagreement between them is the interesting thing, not a conflict to
 * resolve. Nothing here writes anything to `docs/arch/` and no key of that
 * format moves.
 *
 * ## A STEP'S PART LABEL IS A LINK BACK TO THE PICTURE
 *
 * Clicking it selects that box on the Map tab, which is the same store record
 * the inspector follows, so the journey and the picture cannot disagree about
 * what is selected.
 *
 * ## WITH NO READING IT IS PRESENT AND SAYS SO
 *
 * Research 118 §7.6's decision, taken by the operator: a Mac with an agent and
 * a Mac without draw the same tabs. The view says one sentence about what has
 * not happened and offers the one door that would make it happen, being
 * Settings, and nothing here can start a process.
 */

import React from 'react';
import type { ArchJourneyReading } from '@shared/arch';
import type { ArchSemanticResult } from './bridge';
import { CiteChips, NoReading, RateLine, ReadBy } from './ArchClaim';
import { rateOf } from './cite';
import {
  ARCH_JOURNEYS_FROM_CONTRACT,
  ARCH_JOURNEYS_NONE,
  archStepNumber
} from './copy';

/** One source's journeys, in the order main answered with. */
export interface JourneyGroup {
  source: 'contract' | 'model';
  /** The agent that read them, or null for the contract group. */
  agentId: string | null;
  journeys: readonly ArchJourneyReading[];
}

/**
 * The groups, the person's own first.
 *
 * A model group is keyed by the agent that wrote it, so two agents that have
 * both read this repository are two groups and neither is drawn as the other.
 * The order inside a group is main's, which is the order the journeys were
 * written in.
 */
export function journeyGroups(
  journeys: readonly ArchJourneyReading[]
): JourneyGroup[] {
  const contract = journeys.filter((j) => j.source === 'contract');
  const groups: JourneyGroup[] = [];
  if (contract.length > 0) {
    groups.push({ source: 'contract', agentId: null, journeys: contract });
  }
  const byAgent = new Map<string, ArchJourneyReading[]>();
  for (const j of journeys) {
    if (j.source !== 'model') continue;
    const key = j.agentId ?? '';
    const held = byAgent.get(key);
    if (held === undefined) byAgent.set(key, [j]);
    else held.push(j);
  }
  for (const [agentId, list] of byAgent) {
    groups.push({
      source: 'model',
      agentId: agentId === '' ? null : agentId,
      journeys: list
    });
  }
  return groups;
}

export function ArchJourneys({
  repoKey,
  reading,
  onPart = null,
  labelOf = null
}: {
  repoKey: string | null;
  /** Main's whole answer, or null before the first read has landed. */
  reading: ArchSemanticResult | null;
  /**
   * The map's own label for a part id, or null to draw the id itself. A step
   * naming a part the map does not hold keeps its id on the face rather than
   * vanishing, because a journey with a hole in it is the news.
   */
  labelOf?: ((partId: string) => string | null) | null;
  /**
   * Select this step's box on the Map tab. It is the ONE selection record the
   * inspector already follows, so the two surfaces cannot disagree about what
   * is selected; null draws the part label as plain text.
   */
  onPart?: ((partId: string) => void) | null;
}): React.JSX.Element {
  const groups = journeyGroups(reading?.journeys ?? []);
  const rate = reading === null ? null : rateOf(reading.rates, 'repo');
  return (
    <div className="arch-journeys-view" data-slot="arch-journeys">
      {reading === null || reading.readAt === null ? <NoReading /> : null}
      {rate !== null && groups.length > 0 ? (
        <p className="arch-journeys-rate">
          <RateLine rate={rate} />
        </p>
      ) : null}
      {reading !== null && reading.readAt !== null && groups.length === 0 ? (
        <p className="arch-facts-note">{ARCH_JOURNEYS_NONE}</p>
      ) : null}
      {groups.map((g) => (
        <section
          key={`${g.source} ${g.agentId ?? ''}`}
          className="arch-journey-group arch-journeys"
          data-source={g.source}
        >
          <p className="arch-journeys-sub">
            {g.source === 'contract' ? (
              ARCH_JOURNEYS_FROM_CONTRACT
            ) : (
              <ReadBy agentId={g.agentId} />
            )}
          </p>
          {g.journeys.map((j) => (
            <JourneyRows
              key={j.journeyId}
              journey={j}
              repoKey={repoKey}
              onPart={onPart}
              labelOf={labelOf}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

/** One journey: its name, then its steps in order. */
export function JourneyRows({
  journey,
  repoKey = null,
  onPart,
  labelOf = null
}: {
  journey: ArchJourneyReading;
  repoKey?: string | null;
  /** Select the step's box on the Map tab, or null to draw the label plain. */
  onPart?: ((partId: string) => void) | null;
  /** The map's own label for a part id, or null to draw the id itself. */
  labelOf?: ((partId: string) => string | null) | null;
}): React.JSX.Element {
  const nameOf = (partId: string): string =>
    labelOf?.(partId) ?? partId;
  return (
    <div className="arch-journey" data-journey={journey.journeyId}>
      <p className="arch-journey-name">{journey.name}</p>
      <ol className="arch-journey-steps">
        {journey.steps.map((s) => (
          <li
            key={`${journey.journeyId} ${String(s.seq)}`}
            className="arch-journey-step"
            data-seq={String(s.seq)}
            data-part={s.partId}
            data-stale={s.stale ? 'true' : 'false'}
            {...(s.stale && s.staleReason !== null ? { title: s.staleReason } : {})}
          >
            <span className="arch-journey-seq">{archStepNumber(s.seq)}</span>
            {onPart === undefined || onPart === null ? (
              <span className="arch-journey-part">{nameOf(s.partId)}</span>
            ) : (
              <button
                type="button"
                className="arch-journey-part arch-gates-link"
                onClick={() => onPart(s.partId)}
              >
                {nameOf(s.partId)}
              </button>
            )}
            <span className="arch-journey-label">{s.label}</span>
            <CiteChips cites={s.cites} repoKey={repoKey} />
          </li>
        ))}
      </ol>
    </div>
  );
}
