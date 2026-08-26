/**
 * The Architecture view's shot probe, in the shape `../context/shot-probe.ts`
 * and `../overview/shot-probe.ts` already use.
 *
 * ## Why it exists, and it is not "for tests"
 *
 * Research 49 section 9.6 makes one claim about this view that it admits is an
 * ESTIMATE rather than a measurement, in its own words: "The header carries 2
 * controls, so it is expected to fit at the 220 px minimum. That is an
 * estimate from the layout rules, not a measurement, because nobody launched
 * the app in this workflow, and the first slice's Tier 2 screenshot probe is
 * where it gets checked."
 *
 * This is that probe. It sets the sidebar to a width, reads the rendered
 * header and the rendered rows back out of the live layout engine, and prints
 * what each width actually dropped. Reading the stylesheet is not seeing it.
 *
 * ## It injects fixtures, and that is the point of the split
 *
 * The reader answers `arch:load`. The responsive behaviour and the verdict
 * arithmetic are properties of the view alone. A probe that needed the reader
 * could not run until the reader landed, and the view's own claims would go
 * unmeasured until then. Nothing here writes a file, spawns a process, starts
 * a session or touches the manifest. It puts rows in a store.
 *
 * ## The fixture set is the awkward one on purpose
 *
 * A promise that holds, one that broke with two offending lines, one that is
 * missing, one that can only be partly checked, one that cannot be checked at
 * all, an accepted divergence with its reason, a deprecated component, a
 * component that is not ours, a gap, and a row that would not load. Those are
 * the ten things the design has to get right, so they are the ten things the
 * picture shows.
 *
 * ## What it deliberately does not do
 *
 * It never presses the seeding control. That control opens the ordinary new
 * session sheet, which creates a real session running a real agent under the
 * person's own credentials, and a screenshot probe is not the place for that.
 * `spec.seed` COMPOSES the prompt and prints its bytes and its sha, which is
 * the deterministic claim, and stops there.
 */

import type { ArchVerdict } from '@shared/arch';
// The channel ANSWER shapes live in the ipc domain file; the record shapes
// they carry live in `@shared/arch`. Both reach here through the one facade.
import type { ArchLoadResult } from '@shared/ipc';
import { localTarget } from '@shared/workspace-target';
import { useApp } from '../state/store';
import { archAvailable, skeletonAvailable } from './bridge';
import { archDivergences } from './divergences';
import { seedPromptText } from './seed-prompt';
import { useArch } from './store';

export interface ArchProbeSpec {
  /** Sidebar width to measure at, in CSS px. The floor that matters is 220. */
  width?: number;
  /** Skip the fixtures and measure whatever the real reader returned. */
  live?: boolean;
  /** Draw the teaching empty state instead of a loaded contract. */
  empty?: boolean;
  /** Select a subject id, so the prose panel is on screen for the capture. */
  select?: string;
  /**
   * Click the FIRST offending row for real and report which tab opened and at
   * which line. This is the jump-to-line claim, driven through the shipped
   * gesture rather than through a call to the function the gesture reaches.
   */
  jump?: boolean;
  /** Compose the seeding prompt and print its bytes. Sends nothing. */
  seed?: boolean;
}

function log(line: string): void {
  console.log(`[arch-probe] ${line}`);
}

function verdict(over: Partial<ArchVerdict>): ArchVerdict {
  return {
    subjectId: 'edge:x',
    status: 'convergent',
    coverage: 'checked',
    checkedAtCommit: '0'.repeat(40),
    generation: 1,
    firstCheck: false,
    reason: null,
    durationMs: 0,
    ...over
  } as ArchVerdict;
}

/** The ten awkward cases, as one `arch:load` answer. */
function fixtures(): ArchLoadResult {
  return {
    cwd: '/fixtures',
    present: true,
    lastValid: false,
    contract: {
      version: 1,
      subject: 'An Electron and tmux shell for agentic coding.',
      strictness: 'not-wrong',
      layers: [
        { id: 'main', name: 'Main', order: 1 },
        { id: 'renderer', name: 'Renderer', order: 2 },
        { id: 'shared', name: 'Shared', order: 3 }
      ],
      flows: []
    },
    components: [
      {
        id: 'tmux-layer',
        name: 'tmux layer',
        kind: 'component',
        layer: 'main',
        provenance: 'first-party',
        anchors: ['src/main/tmux/**'],
        boundary: 'closed',
        description:
          'Owns every call to the private tmux server. Nothing else in the product names the socket.',
        evidence: [],
        deprecated: false,
        gaps: [
          'A session whose server died between launches is adopted, and that path has no test over a real server.'
        ]
      },
      {
        id: 'ripgrep',
        name: 'ripgrep',
        kind: 'process',
        layer: 'main',
        provenance: 'spawned-tool',
        anchors: [],
        boundary: 'open',
        description: 'Search is one spawn of the pinned binary per query.',
        evidence: [],
        deprecated: false,
        gaps: []
      },
      {
        id: 'legacy-bridge',
        name: 'Legacy bridge',
        kind: 'component',
        layer: 'shared',
        provenance: 'first-party',
        anchors: ['src/shared/legacy/**'],
        boundary: 'open',
        description: 'Superseded by the typed contract.',
        evidence: [],
        deprecated: true,
        gaps: []
      }
    ],
    edges: [
      {
        id: 'renderer-no-tmux',
        from: 'renderer',
        to: 'tmux-layer',
        kind: 'imports',
        rule: 'must-not',
        checker: 'imports',
        label: 'never',
        note: 'The renderer never names the socket.',
        evidence: []
      }
    ],
    baseline: {
      accepted: [
        {
          fromPath: 'src/renderer/zoom/regions.ts',
          toPath: 'src/renderer/state/sidebar-views.ts',
          because:
            'Zoom reads the view list on purpose. Phase 18.55 made that the point.',
          at: '2026-08-25'
        }
      ]
    },
    problems: [
      {
        file: 'docs/arch/components/orphan.json',
        field: 'anchors[0]',
        message: 'A path may not begin with a dash.'
      }
    ],
    verdicts: [
      verdict({ subjectId: 'edge:renderer-no-tmux', status: 'convergent' }),
      verdict({
        subjectId: 'component:tmux-layer',
        status: 'divergent',
        offending: [
          {
            fromPath: 'src/renderer/terminal/TerminalPane.tsx',
            toPath: 'src/main/tmux/socket.ts',
            line: 412,
            specifier: '../../main/tmux/socket'
          },
          {
            fromPath: 'src/renderer/app/App.tsx',
            toPath: 'src/main/tmux/socket.ts',
            line: 88,
            specifier: '@main/tmux/socket'
          }
        ]
      }),
      verdict({
        subjectId: 'component:legacy-bridge',
        status: 'absent',
        offending: [
          {
            fromPath: 'src/shared/legacy/index.ts',
            toPath: '',
            line: 1,
            specifier: ''
          }
        ],
        reason: 'No tracked file matches this component’s anchors.'
      }),
      verdict({
        subjectId: 'edge:main-spawns-ripgrep',
        status: 'convergent',
        coverage: 'partly-checked'
      }),
      verdict({
        subjectId: 'edge:swift-thing',
        status: 'unverifiable',
        coverage: 'unverifiable',
        reason: 'Imports are not checked for Swift.'
      }),
      verdict({
        subjectId: 'component:ripgrep',
        status: 'convergent',
        firstCheck: true
      })
    ],
    freshness: [
      { componentId: 'tmux-layer', commitsBehind: 26, uncommittedFiles: 3 },
      { componentId: 'ripgrep', commitsBehind: 0, uncommittedFiles: 0 },
      { componentId: 'legacy-bridge', commitsBehind: 4, uncommittedFiles: 0 }
    ],
    counts: {
      checkedHold: 2,
      broke: 1,
      cannotCheck: 1,
      accepted: 1,
      unresolvedImports: 412,
      totalImports: 9800
    },
    checkedAtCommit: '0'.repeat(40),
    narratedAtCommit: null
  };
}

/** What the rendered header and the rendered rows are actually carrying. */
function measure(): Record<string, unknown> {
  const px = (el: Element | null): number =>
    el === null ? 0 : Math.round(el.getBoundingClientRect().width);
  const shown = (sel: string): boolean => {
    const el = document.querySelector<HTMLElement>(sel);
    return el !== null && el.getBoundingClientRect().width > 0;
  };
  const header = document.querySelector<HTMLElement>(
    '.sidebar-view[data-view="arch"] .view-header'
  );
  const title = header?.querySelector<HTMLElement>('.view-header-title') ?? null;
  const row = document.querySelector<HTMLElement>('.arch-row');
  return {
    sidebar: px(document.querySelector('.sidebar')),
    header: px(header),
    // The section 9.6 estimate, measured: does the title still have room once
    // the one control has taken its place on the row?
    headerTitle: px(title),
    headerTitleClipped:
      title !== null && title.scrollWidth > title.clientWidth + 1,
    headerActions: header?.querySelectorAll('.view-header-action').length ?? 0,
    row: row === null ? 0 : Math.round(row.getBoundingClientRect().height),
    rowName: row?.querySelector('.arch-row-name')?.textContent ?? null,
    // The one responsive rule this view has: the provenance WORD goes at 260px
    // and the glyph and the name never do.
    provWord: shown('.arch-row-prov'),
    provGlyph: shown('.arch-row .codicon'),
    lanes: document.querySelectorAll('.arch-lane').length,
    failures: document.querySelectorAll('.arch-failures li').length,
    offending: document.querySelectorAll('.arch-offending').length,
    gaps: document.querySelectorAll('.arch-gap').length,
    accepted: document.querySelectorAll('.arch-accepted li').length,
    schemaErrors: document.querySelectorAll('.arch-schema li').length,
    prose: shown('.arch-prose'),
    // The refusal, checked rather than asserted. Nothing on this surface may
    // render HTML somebody else wrote.
    rawHtmlNodes: document.querySelectorAll('.arch [data-raw-html]').length
  };
}

export async function driveArch(spec: ArchProbeSpec): Promise<void> {
  if (spec.live !== true) {
    // Straight into the store. There is no channel to stub: `bridge.ts` is
    // feature detected and this build may have no reader at all, which is
    // exactly the build in which the layout claims still have to hold.
    useArch.setState({
      target: localTarget('/fixtures'),
      status: 'ready',
      error: null,
      lastCheck: null,
      selected: null,
      // `present: false` IS the empty state, so the teaching surface is
      // reached through the view's own condition rather than through a flag
      // only the probe can set.
      load:
        spec.empty === true
          ? {
              ...fixtures(),
              present: false,
              contract: null,
              components: [],
              edges: [],
              problems: [],
              verdicts: [],
              freshness: []
            }
          : fixtures()
    });
  }

  if (spec.select !== undefined) useArch.getState().select(spec.select);

  await new Promise((r) => setTimeout(r, 400));

  if (spec.live === true) {
    const now = useArch.getState();
    log(
      `bridge: load=${String(archAvailable())} skeleton=${String(skeletonAvailable())}`
    );
    log(
      `live: status=${now.status} components=${String(
        now.components().length
      )} edges=${String(now.edges().length)} verdicts=${String(
        now.verdicts().length
      )} schemaErrors=${String(now.problems().length)} error=${now.error ?? 'none'}`
    );
  }

  log(`measure: ${JSON.stringify(measure())}`);

  // The rows Source Control will draw, from the same verdicts. Printed here
  // rather than in a second probe, because they are a derivation of what is
  // already on screen and a second launch would buy nothing.
  const rows = archDivergences(useArch.getState().verdicts());
  log(
    `divergences: ${String(rows.length)} · ${rows
      .map((r) => `${r.path}:${String(r.line)} ${r.status}`)
      .join(' | ')}`
  );

  if (spec.seed === true) {
    // COMPOSED AND PRINTED, never sent. Two runs must produce the same bytes,
    // which is the only claim this control makes.
    const a = seedPromptText('/fixtures');
    const b = seedPromptText('/fixtures');
    log(
      `seed: bytes=${String(new TextEncoder().encode(a).length)} ` +
        `deterministic=${String(a === b)} lines=${String(a.split('\n').length)}`
    );
    log(`seed first line: ${a.split('\n')[0] ?? ''}`);
  }

  if (spec.jump === true) {
    const target = document.querySelector<HTMLElement>('.arch-offending');
    if (target === null) {
      log('jump: SKIP (no offending row on screen)');
      return;
    }
    const before = useApp.getState().sidebarVisible;
    target.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })
    );
    await new Promise((r) => setTimeout(r, 1200));
    const tab = document.querySelector<HTMLElement>('.ed-tab.active, .ed-tab.on');
    log(
      `jump: label=${target.textContent ?? '?'} tab=${tab?.textContent ?? 'none'} ` +
        `sidebarStayed=${String(before === useApp.getState().sidebarVisible)}`
    );
  }
}
