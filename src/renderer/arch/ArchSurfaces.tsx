/**
 * THE SURFACES LIST (Phase 258, research 118 §7.6's second floor bullet):
 * every exposed surface the reader can see, grouped by region and then by
 * part in map order, with its denominator and its honest zeroes.
 *
 * Each region opens with the line that says how much of it was read. Each
 * box is one row: its label with the rung chip, then the SIX surface kinds
 * in a fixed order with a count each, and a zero is DRAWN in the muted
 * colour and never omitted, because `0 flags` on a repository with none is
 * the reader telling the truth about itself. A kind with a count opens its
 * rows under the row; a zero is not a control and its hover says so.
 */

import React, { useState } from 'react';
import type { ArchMapGroup, ArchMapRegion, ArchMapResult } from './bridge';
import { Codicon } from '../icons';
import {
  ARCH_SURFACE_KINDS,
  archRegionDenominator,
  archZeroSurfaceTitle
} from './copy';
import { FactDisclosure } from './ArchFactRows';
import { RUNG_FACES, isRung, rungClass, rungTitle } from './rung';

/** The regions to list, or one unnamed group of every box on a regionless model. */
export function surfaceRegions(model: ArchMapResult): {
  region: ArchMapRegion | null;
  groups: ArchMapGroup[];
}[] {
  const byId = new Map(model.groups.map((g) => [g.id, g]));
  const regions = (model.regions ?? []).filter((r) => r.kind !== 'outside');
  if (regions.length === 0) {
    return [{ region: null, groups: [...model.groups] }];
  }
  return regions.map((region) => ({
    region,
    groups: region.groupIds
      .map((id) => byId.get(id))
      .filter((g): g is ArchMapGroup => g !== undefined)
  }));
}

/** The chip a row wears, the same one the map draws. */
export function RungChip({ group }: { group: ArchMapGroup }): React.JSX.Element | null {
  const r = group.rung;
  if (r === undefined || !isRung(r.rung)) return null;
  return (
    <span
      className={`arch-map-rung ${rungClass(r.rung)}`}
      data-rung={r.rung}
      title={rungTitle(r)}
    >
      <Codicon name={RUNG_FACES[r.rung].icon} size="sm" />
    </span>
  );
}

function SurfaceRow({
  repoKey,
  group
}: {
  repoKey: string | null;
  group: ArchMapGroup;
}): React.JSX.Element {
  const [open, setOpen] = useState<string | null>(null);
  const counts = group.counts?.surface ?? {};
  return (
    <div className="arch-surfaces-row" data-group={group.id}>
      <span className="arch-surfaces-part" title={group.dir}>
        <RungChip group={group} />
        <span>{group.label}</span>
      </span>
      <span className="arch-surfaces-kinds">
        {ARCH_SURFACE_KINDS.map((k) => {
          const n = counts[k.kind] ?? 0;
          const text = `${k.label} ${n.toLocaleString('en-US')}`;
          return n === 0 ? (
            <span
              key={k.kind}
              className="arch-surfaces-kind zero"
              data-kind={k.kind}
              data-count={0}
              title={archZeroSurfaceTitle(k.label)}
            >
              {text}
            </span>
          ) : (
            <button
              key={k.kind}
              type="button"
              className="arch-surfaces-kind"
              data-kind={k.kind}
              data-count={n}
              aria-expanded={open === k.kind}
              onClick={() => setOpen((v) => (v === k.kind ? null : k.kind))}
            >
              {text}
            </button>
          );
        })}
      </span>
      {open !== null ? (
        <div className="arch-surfaces-open">
          <FactDisclosure
            key={open}
            repoKey={repoKey}
            scope={group.id}
            categories={['surface']}
            kind={open}
            defaultOpen
          />
        </div>
      ) : null}
    </div>
  );
}

export function ArchSurfaces({
  repoKey,
  model
}: {
  repoKey: string | null;
  model: ArchMapResult;
}): React.JSX.Element {
  return (
    <div className="arch-surfaces" data-slot="arch-surfaces">
      {surfaceRegions(model).map(({ region, groups }) => (
        <section
          key={region?.id ?? ''}
          className="arch-surfaces-region"
          data-region={region?.id ?? ''}
        >
          {region !== null ? (
            <div className="arch-surfaces-region-head">
              <span className="arch-surfaces-region-label" title={region.sub}>
                {region.label}
              </span>
              <span className="arch-surfaces-denominator">
                {archRegionDenominator(
                  region.parsed,
                  region.files,
                  region.vendored,
                  region.truncated
                )}
              </span>
            </div>
          ) : null}
          {groups.map((g) => (
            <SurfaceRow key={g.id} repoKey={repoKey} group={g} />
          ))}
        </section>
      ))}
    </div>
  );
}
