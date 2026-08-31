/**
 * Phase 178 — the resting face reads honest and thin (research 71 sections
 * 3, 3.4 and 5).
 *
 * Rookery's cockpit showed four faces that disagreed: a kept lead over a
 * contract a third of which would not load, a strip reading "9 checked and
 * holds" where the nine were anchor checks and `edges.json` was empty, a
 * wall of 34 near identical red rows, and the one honest sentence
 * about the unread languages stranded behind a broken drill. These tests
 * render the strip and the wall over that exact shape and hold the face the
 * fix promises: the thin sentence on the resting face, no promise wording
 * over zero edges, one folded summary line with the detail one click away.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ArchLoadResult } from '@shared/ipc';
import {
  ARCH_NO_PROMISES_NOTE,
  ARCH_PROBLEMS_MORE,
  archChecksHoldWord,
  archProblemsSummary
} from '../copy';
import { Problems, VerdictStrip } from '../ArchVerdicts';
import { useArch } from '../store';

/** Rookery's own shape: a present contract, zero edges, nine anchors holding. */
function rookeryLoad(over: Partial<ArchLoadResult>): ArchLoadResult {
  return {
    cwd: '/repo',
    present: true,
    contract: {
      version: 1,
      subject: 'rookery',
      strictness: 'not-wrong',
      layers: [],
      flows: []
    },
    components: [],
    edges: [],
    baseline: { version: 1, accepted: [] },
    problems: [],
    lastValid: false,
    verdicts: [],
    freshness: [],
    counts: {
      checkedHold: 9,
      broke: 0,
      cannotCheck: 0,
      accepted: 0,
      unresolvedImports: 47,
      totalImports: 382,
      // Measured over rookery's tracked files on 2026-08-31: git ls-files
      // holds 168 md, 87 swift and 43 kt. The 1276 swift and 166 c an earlier
      // build of this fixture carried were research 71's level 2 quote over
      // gitignored .var/ checkouts the scan never sees.
      // Since the Phase 180 fix round an extension label wears its dot, so a
      // Package.resolved reads as a file kind rather than a status word.
      unparsed: [
        { language: '.md', files: 168 },
        { language: '.swift', files: 87 },
        { language: '.kt', files: 43 }
      ]
    },
    checkedAtCommit: 'b'.repeat(40),
    narratedAtCommit: null,
    drift: { count: 0 },
    changes: null,
    ...over
  } as ArchLoadResult;
}

beforeEach(() => {
  useArch.setState({ load: null, lastCheck: null });
});

describe('the strip over a contract with zero promises', () => {
  it('says there are no promises and stops calling quotes promises', () => {
    useArch.setState({ load: rookeryLoad({}) });
    const html = renderToStaticMarkup(createElement(VerdictStrip, { scoped: null }));
    expect(html).toContain(ARCH_NO_PROMISES_NOTE);
    expect(html).toContain(`9 ${archChecksHoldWord(9)}`);
    expect(html).toContain('9 checks hold, none a promise');
    // Rookery's nine are anchor checks; the lane names no narrower kind.
    expect(html).not.toContain('evidence checks');
    expect(html).not.toContain('9 checked and holds');
  });

  it('carries the whole-repo thin sentence on the resting face', () => {
    useArch.setState({ load: rookeryLoad({}) });
    const html = renderToStaticMarkup(createElement(VerdictStrip, { scoped: null }));
    // The sentence that was stranded at level 2 behind a broken drill, now on
    // the face a person actually reads, with the unresolved count beside it.
    expect(html).toContain('Tortie does not read imports for every file here');
    expect(html).toContain('168 .md, 87 .swift, 43 .kt');
    expect(html).toContain('47 of 382 imports could not be resolved');
  });

  it('keeps the promise wording when the contract has real promises', () => {
    useArch.setState({
      load: rookeryLoad({
        edges: [
          {
            id: 'a-may-b',
            from: 'a',
            to: 'b',
            kind: 'imports',
            rule: 'may',
            checker: 'imports',
            evidence: []
          }
        ]
      })
    });
    const html = renderToStaticMarkup(createElement(VerdictStrip, { scoped: null }));
    expect(html).toContain('checked and holds');
    expect(html).not.toContain(ARCH_NO_PROMISES_NOTE);
  });

  it('says nothing about unread languages when every file was read', () => {
    const load = rookeryLoad({});
    load.counts = { ...load.counts, unparsed: [] };
    useArch.setState({ load });
    const html = renderToStaticMarkup(createElement(VerdictStrip, { scoped: null }));
    expect(html).not.toContain('Tortie does not read imports');
  });

  it('treats counts stored by an older build, with no unparsed field, as read', () => {
    const load = rookeryLoad({});
    delete (load.counts as { unparsed?: unknown }).unparsed;
    useArch.setState({ load });
    const html = renderToStaticMarkup(createElement(VerdictStrip, { scoped: null }));
    expect(html).not.toContain('Tortie does not read imports');
  });
});

describe('the folded would-not-load wall', () => {
  it('rests as one summary line with every row behind the disclosure', () => {
    const problems = Array.from({ length: 17 }, (_, i) => ({
      file: `docs/arch/components/legacy-${String(i)}.json`,
      field: 'component.kind',
      message: 'Not a Tortie component, so this file was skipped.'
    }));
    useArch.setState({ load: rookeryLoad({ problems }) });
    const html = renderToStaticMarkup(createElement(Problems));
    expect(html).toContain(archProblemsSummary(17));
    expect(html).toContain(ARCH_PROBLEMS_MORE);
    // Folded, not hidden: every row is still in the disclosure, whole.
    expect(html).toContain('<details');
    expect(html).toContain('legacy-16.json');
    expect(html).toContain('component.kind');
  });

  it('counts files, not rows, so two refusals in one file read as one file', () => {
    const problems = [
      { file: 'docs/arch/contract.json', field: 'contract.subject', message: 'x' },
      { file: 'docs/arch/contract.json', field: 'contract.version', message: 'y' }
    ];
    useArch.setState({ load: rookeryLoad({ problems }) });
    const html = renderToStaticMarkup(createElement(Problems));
    expect(html).toContain(archProblemsSummary(1));
  });

  it('draws nothing at all when every row loaded, the Phase 177 usual case', () => {
    useArch.setState({ load: rookeryLoad({ problems: [] }) });
    expect(renderToStaticMarkup(createElement(Problems))).toBe('');
  });
});
