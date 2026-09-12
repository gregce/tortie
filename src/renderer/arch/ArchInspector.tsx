/**
 * THE INSPECTOR (Phase 258): what one selected part is, below the map at
 * full width, runstory's shape (research 118 §3.2 item 6) in Tortie's tokens.
 *
 * With nothing selected it is one line. With a box selected it is ONE header
 * row and SEVEN field rows, every value COMPUTED from the counts the map
 * composer put on the box: the region it belongs to, the surfaces it
 * exposes, the stores it keeps, what it reaches outside, the gates under it,
 * the test share, and the evidence rung with its counts. Four of the fields
 * carry a Show disclosure that asks `arch:facts` for the rows, and nothing
 * is fetched until one opens.
 *
 * PHASE 259 BROUGHT THE MODEL FIELDS IN: Receives, Does, Returns and Where it
 * stops, each a sentence an agent wrote with its graded citations beside it,
 * and Runs in keeps its COMPUTED value and gains the read sentence on a line
 * of its own under it, labelled `read by <agent>`, so the computed half and
 * the read half are never the same line. A field nothing has read is ABSENT
 * rather than empty, because an empty row is a paragraph about nothing.
 *
 * THE HEADER IS NOT RENAMED BY ANY MODEL. The box keeps the label rule P
 * computed for it even when the model wrote a `name` claim, because research
 * 118 §6.4 measured a part renamed "Billing and card capture" keeping every
 * green chip it had: a wrong name on true citations is the failure this
 * surface cannot detect, so the one place a person's eye lands first stays
 * computed. No number here is a badge: every count is inside a phrase a
 * person reads.
 */

import React from 'react';
import { ARCH_FACT_KINDS } from '@shared/arch';
import type {
  ArchClaimField,
  ArchClaimReading,
  ArchFactCategory,
  ArchPartReading
} from '@shared/arch';
import type { ArchMapGroup, ArchMapRegion } from './bridge';
import { Codicon } from '../icons';
import {
  ARCH_INSPECT_DOES,
  ARCH_INSPECT_EXPOSES,
  ARCH_INSPECT_GUARDS,
  ARCH_INSPECT_KEEPS,
  ARCH_INSPECT_LIMIT,
  ARCH_INSPECT_NONE,
  ARCH_INSPECT_NO_SURFACE,
  ARCH_INSPECT_NOTHING,
  ARCH_INSPECT_OPEN,
  ARCH_INSPECT_REACHES,
  ARCH_INSPECT_RECEIVES,
  ARCH_INSPECT_RETURNS,
  ARCH_INSPECT_RUNG,
  ARCH_INSPECT_RUNS_IN,
  ARCH_INSPECT_TESTS,
  ARCH_SURFACE_KINDS,
  archFilesWord,
  archGatesWord,
  archKindWord,
  archTestsSentence,
  ARCH_INSPECT_READING,
  ARCH_PART_NOT_READ
} from './copy';
import { FactDisclosure } from './ArchFactRows';
import { ClaimBody, ReadBy } from './ArchClaim';
import { RUNG_FACES, isRung, rungClass, rungShortLine } from './rung';

/** The non-zero kinds of one category as `229 IPC channels, 6 jobs`, or null at zero. */
export function kindPhrase(
  category: string,
  counts: Readonly<Record<string, number>> | undefined
): string | null {
  if (counts === undefined) return null;
  // The closed table's own order for the category, the surfaces list's for
  // surfaces, and any kind a newer main sends after them, sorted.
  const order =
    category === 'surface'
      ? ARCH_SURFACE_KINDS.map((k) => k.kind)
      : [...((ARCH_FACT_KINDS as Record<string, readonly string[] | undefined>)[category] ?? [])];
  const seen = new Set(order);
  for (const k of Object.keys(counts).sort()) if (!seen.has(k)) order.push(k);
  const parts = order
    .filter((k) => (counts[k] ?? 0) > 0)
    .map(
      (k) =>
        `${(counts[k] ?? 0).toLocaleString('en-US')} ${archKindWord(category, k, counts[k] ?? 0)}`
    );
  return parts.length === 0 ? null : parts.join(', ');
}

/** The sum of one category's counts. */
export function kindTotal(counts: Readonly<Record<string, number>> | undefined): number {
  if (counts === undefined) return 0;
  let n = 0;
  for (const v of Object.values(counts)) n += v;
  return n;
}

/** The Reaches phrase joins two categories: effects, then network. */
export function reachesPhrase(group: ArchMapGroup): string | null {
  const effect = kindPhrase('effect', group.counts?.effect);
  const network = kindPhrase('network', group.counts?.network);
  const parts = [effect, network].filter((p): p is string => p !== null);
  return parts.length === 0 ? null : parts.join(', ');
}

/** One field's claim out of a part's reading, or null when none stood. */
export function claimOf(
  reading: ArchPartReading | null,
  field: ArchClaimField
): ArchClaimReading | null {
  return reading?.claims.find((c) => c.field === field) ?? null;
}

/**
 * PHASE 259. One model row: the label, the sentence, its chips, and who read
 * it. The whole row is ABSENT when nothing has read the field, which is why
 * this returns a fragment and the caller spreads it into the definition list.
 */
export function ClaimRow({
  label,
  claim,
  repoKey
}: {
  label: string;
  claim: ArchClaimReading | null;
  repoKey: string | null;
}): React.JSX.Element | null {
  if (claim === null) return null;
  return (
    <>
      <dt>{label}</dt>
      <dd data-field={claim.field}>
        <span className="arch-inspector-value">
          <ClaimBody claim={claim} repoKey={repoKey} />
          <ReadBy agentId={claim.agentId} />
        </span>
      </dd>
    </>
  );
}

export function ArchInspector({
  repoKey,
  group,
  region,
  scope,
  onOpen,
  onGates,
  reading = null,
  repoRead = false
}: {
  repoKey: string | null;
  /** The selected box, or null with nothing selected. */
  group: ArchMapGroup | null;
  /** The region the box sits in, or null on a regionless picture. */
  region: ArchMapRegion | null;
  /** The `arch:facts` scope the disclosures ask under, or null to draw none. */
  scope: string | null;
  /** Drill into the selected box: the header's Open control. */
  onOpen: (() => void) | null;
  /** Open the Gates tab with this part named, the Guards field's link. */
  onGates: (() => void) | null;
  /**
   * PHASE 259. What an agent said this part is for, or null when nothing has
   * read it. Every row it feeds is absent rather than empty without it.
   */
  reading?: ArchPartReading | null;
  /**
   * True when SOMETHING has read this repository. With it true and `reading`
   * null the inspector says so in one line, because every model row is absent
   * by design and a part nobody reached would otherwise look like a part with
   * nothing to say.
   */
  repoRead?: boolean;
}): React.JSX.Element {
  if (group === null) {
    return (
      <div className="arch-inspector" data-slot="arch-inspector">
        <p className="arch-inspector-none">{ARCH_INSPECT_NONE}</p>
      </div>
    );
  }
  // The COMPUTED rung reading of this box, which is main's own and is not the
  // model's; Phase 259's prop is `reading` and the two never touch.
  const rungReading = group.rung;
  const rung =
    rungReading !== undefined && isRung(rungReading.rung) ? rungReading.rung : null;
  const face = rung === null ? null : RUNG_FACES[rung];
  const exposes = kindPhrase('surface', group.counts?.surface);
  const keeps = kindPhrase('store', group.counts?.store);
  const reaches = reachesPhrase(group);
  const gates = kindTotal(group.counts?.gate);
  const parsed = rungReading?.parsed ?? group.fileCount;
  // PHASE 259. The model's own sentence about where the part runs, drawn
  // UNDER the computed region rather than in place of it.
  const runsIn = claimOf(reading, 'runsIn');
  const disclose = (categories: readonly ArchFactCategory[]): React.JSX.Element | null =>
    scope === null ? null : (
      <FactDisclosure repoKey={repoKey} scope={scope} categories={categories} />
    );

  return (
    <div className="arch-inspector" data-slot="arch-inspector" data-group={group.id}>
      <div className="arch-inspector-head">
        <span className="arch-inspector-name" title={group.dir}>
          {group.label}
        </span>
        {region !== null ? (
          <span className="arch-inspector-region" title={region.sub}>
            {region.label}
          </span>
        ) : null}
        {face !== null && rung !== null ? (
          <span
            className={`arch-inspector-word ${rungClass(rung)}`}
            data-rung={rung}
            title={face.sentence}
          >
            <Codicon name={face.icon} size="sm" />
            <span>{face.word}</span>
          </span>
        ) : null}
        <span className="arch-inspector-files">
          {archFilesWord(group.fileCount, parsed)}
        </span>
        {onOpen !== null ? (
          <button type="button" className="arch-inspector-open" onClick={onOpen}>
            {ARCH_INSPECT_OPEN}
          </button>
        ) : null}
      </div>
      <dl className="arch-inspector-rows">
        <dt>{ARCH_INSPECT_RUNS_IN}</dt>
        <dd data-field="runs-in">
          <span className="arch-inspector-value">
            <span>
              {region === null
                ? ARCH_INSPECT_NOTHING
                : `${region.label} · ${region.sub}`}
            </span>
            {runsIn === null ? null : (
              <span className="arch-inspector-read">
                <ClaimBody claim={runsIn} repoKey={repoKey} />
                <ReadBy agentId={runsIn.agentId} />
              </span>
            )}
          </span>
        </dd>
        <ClaimRow
          label={ARCH_INSPECT_RECEIVES}
          claim={claimOf(reading, 'receives')}
          repoKey={repoKey}
        />
        <ClaimRow
          label={ARCH_INSPECT_DOES}
          claim={claimOf(reading, 'does')}
          repoKey={repoKey}
        />
        <ClaimRow
          label={ARCH_INSPECT_RETURNS}
          claim={claimOf(reading, 'returns')}
          repoKey={repoKey}
        />
        <dt>{ARCH_INSPECT_EXPOSES}</dt>
        <dd data-field="exposes">
          <span className="arch-inspector-value">
            <span>{exposes ?? ARCH_INSPECT_NO_SURFACE}</span>
            {exposes !== null ? disclose(['surface']) : null}
          </span>
        </dd>
        <dt>{ARCH_INSPECT_KEEPS}</dt>
        <dd data-field="keeps">
          <span className="arch-inspector-value">
            <span>{keeps ?? ARCH_INSPECT_NOTHING}</span>
            {keeps !== null ? disclose(['store']) : null}
          </span>
        </dd>
        <dt>{ARCH_INSPECT_REACHES}</dt>
        <dd data-field="reaches">
          <span className="arch-inspector-value">
            <span>{reaches ?? ARCH_INSPECT_NOTHING}</span>
            {reaches !== null ? disclose(['effect', 'network']) : null}
          </span>
        </dd>
        <dt>{ARCH_INSPECT_GUARDS}</dt>
        <dd data-field="guards">
          <span className="arch-inspector-value">
            {onGates !== null && gates > 0 ? (
              <button type="button" className="arch-gates-link" onClick={onGates}>
                {archGatesWord(gates)}
              </button>
            ) : (
              <span>{archGatesWord(gates)}</span>
            )}
            {gates > 0 ? disclose(['gate']) : null}
          </span>
        </dd>
        <ClaimRow
          label={ARCH_INSPECT_LIMIT}
          claim={claimOf(reading, 'limit')}
          repoKey={repoKey}
        />
        <dt>{ARCH_INSPECT_TESTS}</dt>
        <dd data-field="tests">
          {rungReading === undefined
            ? ARCH_INSPECT_NOTHING
            : archTestsSentence(rungReading.tested, rungReading.parsed)}
        </dd>
        {repoRead && (reading === null || reading.claims.length === 0) ? (
          <>
            <dt>{ARCH_INSPECT_READING}</dt>
            <dd data-field="reading">{ARCH_PART_NOT_READ}</dd>
          </>
        ) : null}
        <dt>{ARCH_INSPECT_RUNG}</dt>
        <dd data-field="rung">
          {face === null || rungReading === undefined ? (
            ARCH_INSPECT_NOTHING
          ) : (
            <span className="arch-inspector-value">
              <span>{face.sentence}</span>
              <span className="arch-inspector-files">
                {rungShortLine(rungReading)}
              </span>
            </span>
          )}
        </dd>
      </dl>
    </div>
  );
}
