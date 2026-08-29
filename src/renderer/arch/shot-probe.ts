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
 * ## What it deliberately does not do (rewritten in Phase 158)
 *
 * It never presses the draft control and never presses the run control. Both
 * now ask MAIN to write under `docs/arch/`, and the run control asks main to
 * start the one confirmed agent under the person's own credentials; a
 * screenshot probe is not the place for either. `spec.onePath` READS the
 * surfaces instead: that the offer carries exactly one action, that the
 * pasted-prompt surface is gone, that the run face is on screen with its
 * words, and that the accept controls sit on the failing rows. Pressing the
 * real gestures is the phase probe's job, over a scratch repository, through
 * `build/electron-run.mjs`.
 */

import type { ArchVerdict } from '@shared/arch';
// The channel ANSWER shapes live in the ipc domain file; the record shapes
// they carry live in `@shared/arch`. Both reach here through the one facade.
import type { ArchLoadResult } from '@shared/ipc';
import { localTarget } from '@shared/workspace-target';
import { useApp } from '../state/store';
import { installShellOps, shellOps } from '../state/shell-ops';
import {
  acceptAvailable,
  archAvailable,
  passAvailable,
  seedAvailable,
  skeletonAvailable
} from './bridge';
import { archDivergences } from './divergences';
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
  /**
   * PRESS the one offer, being the shipped Draft button, and read back what
   * the gesture did (Phase 158). The press is a real click, so the whole
   * chain runs: the store's `draft`, main's seed write under `docs/arch/`,
   * and the same gesture continuing into the pass, which main refuses with
   * `no-choice` when no agent is picked. The line printed is what the phase
   * probe reads to prove the skeleton only path is inert and honest.
   */
  press?: boolean;
  /**
   * PHASE 158, the one-path surfaces, READ and never pressed: the offer's
   * single action, the absence of the pasted prompt, the run face's words,
   * and the accept controls on the failing rows.
   */
  onePath?: boolean;
  /**
   * The repository the drive stages itself against, default `/fixtures`.
   *
   * PHASE 64'S FIX ROUND ADDED THIS, and the reason is worth stating. The
   * fixture target was a path that does not exist, which is fine for every
   * claim above, because all of them are layout claims about rows already in
   * the store. It is NOT fine for the level 2 module view: that section asks
   * MAIN what a part is made of, over a real `docs/arch/` and a real
   * `git ls-files`, so at `/fixtures` it can only ever reach the state that
   * says the contract has no part with that name. Pointing the drive at a real
   * repository is what lets the boxes, the matrix and the two lists be
   * rendered at all.
   */
  cwd?: string;
  /** Re-check before measuring, so the arch database holds this tree's imports. */
  check?: boolean;
  /**
   * A part id to open the level 2 view on, and report what it actually drew.
   *
   * It reads the RENDERED section rather than the answer that produced it, so
   * what is printed is what a person would see.
   */
  modules?: string;
  /**
   * Press the REAL picker chord and report what menu it raised.
   *
   * ## Why the menu is caught at `shellOps` and not at the bridge
   *
   * The obvious instrument, wrapping `window.gmux.popupMenu` from the page,
   * DOES NOT WORK and the reason is worth writing down so nobody spends an
   * afternoon on it again. That object comes from
   * `contextBridge.exposeInMainWorld` under `contextIsolation: true`, so it is
   * frozen: the assignment silently does nothing, the real bridge runs, and a
   * REAL macOS popup opens over the window and waits for a person who is not
   * there. That is what held the first version of `build/probe-p64-arch.mjs`
   * open until its ceiling.
   *
   * `installShellOps` is the seam the store already uses and already exports
   * for exactly this, and `setMenu` has one implementation which goes through
   * it. So the recorder sits there for the length of the press and is taken
   * out again, and what it proves is that a real keydown reaches the picker
   * and produces the rows a native menu would have been built from. The last
   * hop, being `showNativeMenu` to `ui:popupMenu` to
   * `Menu.buildFromTemplate().popup()`, is not exercised here and is not
   * claimed to be; a native popup cannot be read from outside the app, which
   * Phases 119, 152 and 153 each measured separately.
   *
   * The DOM is counted across the press either way, because "no menu is ever
   * drawn in the DOM" is a claim this can settle and does.
   */
  aim?: boolean;
  /**
   * PHASE 160 — press the cockpit's OPEN THE MAP control for real, wait for
   * the map tab to draw, and read the boxes and edges back off the model and
   * the rendered SVG. `refocus` presses it a second time and proves the press
   * focused the one tab rather than opening a twin.
   *
   * The wait is long on purpose: the first reading of a large repository is
   * seconds of parsing (2.3 s measured on this repository in the phase spec),
   * and the claim under test is that the map draws the moment it lands, not
   * that the landing is instant.
   */
  map?: {
    open: boolean;
    refocus?: boolean;
  };
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
  const cwd = spec.cwd ?? '/fixtures';
  if (spec.live !== true) {
    // Straight into the store. There is no channel to stub: `bridge.ts` is
    // feature detected and this build may have no reader at all, which is
    // exactly the build in which the layout claims still have to hold.
    useArch.setState({
      target: localTarget(cwd),
      status: 'ready',
      error: null,
      lastCheck: null,
      // Phase 64 widened the selection to a list. Empty is the probe's start
      // state exactly as `null` was.
      selected: [],
      // `present: false` IS the empty state, so the teaching surface is
      // reached through the view's own condition rather than through a flag
      // only the probe can set.
      load:
        spec.empty === true
          ? {
              ...fixtures(),
              cwd,
              present: false,
              contract: null,
              components: [],
              edges: [],
              problems: [],
              verdicts: [],
              freshness: []
            }
          : { ...fixtures(), cwd }
    });
  }

  if (spec.live === true && spec.cwd !== undefined) {
    // The REAL reader, over a real repository. `ensureLoaded` is idempotent
    // and `check` is what puts this tree's imports in the arch database, which
    // is where the level 2 view's edges come from.
    await useArch.getState().ensureLoaded(localTarget(cwd));
    if (spec.check === true) await useArch.getState().check();
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

  // THE COPY RULING'S NUMBER (2026-08-28): the words a person reads on the
  // pane at rest. `innerText` respects visibility, so a collapsed disclosure
  // and every hover title stay out of the count, which is the point: the
  // ruling is about the resting face, and this line is what the verifier
  // reads before and after. Data the person put there (names, reasons) is
  // in the count too, because the person reads it too.
  const pane = document.querySelector<HTMLElement>('.arch');
  const restText = pane === null ? '' : pane.innerText;
  const restWords = restText.split(/\s+/).filter((w) => w.length > 0).length;
  log(`restWords: ${String(restWords)}`);

  // The rows Source Control will draw, from the same verdicts. Printed here
  // rather than in a second probe, because they are a derivation of what is
  // already on screen and a second launch would buy nothing.
  const rows = archDivergences(useArch.getState().verdicts());
  log(
    `divergences: ${String(rows.length)} · ${rows
      .map((r) => `${r.path}:${String(r.line)} ${r.status}`)
      .join(' | ')}`
  );

  if (spec.onePath === true) {
    // READ, never pressed. The claims: one action in the offer, no pasted
    // prompt surface anywhere, the run face present with its state words,
    // and an accept control on every failing row that has a target path.
    const text = (sel: string): string =>
      document.querySelector<HTMLElement>(sel)?.textContent ?? '';
    const entry =
      useArch.getState().passFor(cwd) ??
      (spec.cwd !== undefined ? useArch.getState().passFor(spec.cwd) : null);
    log(
      `onePath: ${JSON.stringify({
        bridges: {
          seed: seedAvailable(),
          pass: passAvailable(),
          accept: acceptAvailable()
        },
        offerActions: document.querySelectorAll('.arch-empty-action:not(.arch-pass-run)')
          .length,
        promptSurface: document.querySelectorAll('.arch-empty-prompt').length,
        passFace: document.querySelectorAll('.arch-pass').length,
        passWords: text('.arch-pass').slice(0, 300),
        passRunning: entry?.status?.running ?? null,
        passChosen: entry?.status?.chosen ?? null,
        passLastVerdict: entry?.status?.lastRun?.verdict ?? null,
        acceptButtons: document.querySelectorAll('.arch-accept-open').length,
        acceptForms: document.querySelectorAll('.arch-accept').length,
        offendingRows: document.querySelectorAll('.arch-offending').length
      })}`
    );
  }

  if (spec.press === true) {
    await pressDraft(cwd);
  }

  if (spec.map !== undefined && spec.map.open) {
    await driveMap(cwd, spec.map);
  }

  if (spec.modules !== undefined) {
    await driveModules(spec.modules);
  }

  if (spec.aim === true) {
    await driveAim();
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

/**
 * The one offer, PRESSED (Phase 158). A real click on the Draft button, then
 * a wait for the store's own `drafting` and `enriching` flags to drop, then
 * one line with what main answered: whether the contract is present now, how
 * many parts it has, what refusal stopped the pass, and the words the pass
 * face carries. Nothing here reads a file; the probe on the node side reads
 * `docs/arch/` back and counts processes.
 */
async function pressDraft(cwd: string): Promise<void> {
  // The offer's own button, scoped to the offer: the map open and the pass
  // run share the action class and must not be the thing pressed here.
  const button = document.querySelector<HTMLButtonElement>(
    '.arch-empty .arch-empty-action'
  );
  if (button === null) {
    log('press: SKIP (no offer button on screen)');
    return;
  }
  const disabledBefore = button.disabled;
  button.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })
  );
  const t0 = Date.now();
  // The draft flips `drafting` synchronously on the click; wait for both
  // flags to drop, or for 30 s, whichever comes first.
  await new Promise((r) => setTimeout(r, 100));
  while (Date.now() - t0 < 30_000) {
    const now = useArch.getState();
    if (!now.drafting && !now.enriching) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  await new Promise((r) => setTimeout(r, 600));
  const now = useArch.getState();
  const entry = now.passFor(cwd);
  const text = (sel: string): string =>
    document.querySelector<HTMLElement>(sel)?.textContent ?? '';
  log(
    `press: ${JSON.stringify({
      disabledBefore,
      waitedMs: Date.now() - t0,
      present: now.load?.present ?? null,
      components: now.components().length,
      edges: now.edges().length,
      drafting: now.drafting,
      enriching: now.enriching,
      refusal: entry?.refusal ?? null,
      running: entry?.status?.running ?? null,
      chosen: entry?.status?.chosen ?? null,
      lastRun: entry?.status?.lastRun ?? null,
      offerStill: document.querySelectorAll('.arch-empty').length,
      passWords: text('.arch-pass').slice(0, 300),
      error: now.error
    })}`
  );
}

/**
 * THE MAP TAB, OPENED THROUGH THE SHIPPED GESTURE AND READ BACK OFF THE
 * SCREEN (Phase 160).
 *
 * The press is a real click on the cockpit's control, so what is proved is
 * the whole chain: the control, the open bus, the editor keying the tab
 * `arch-map:<repoPath>`, the lazy chunk mounting, the store reading the model
 * over the bridge, and the drawing landing as SVG. The counts printed are the
 * charter's own proof line, being the box and the edge counts written down,
 * and they are read from BOTH the model and the rendered picture so a drawing
 * that silently dropped a box cannot pass on the model alone.
 */
async function driveMap(
  cwd: string,
  spec: NonNullable<ArchProbeSpec['map']>
): Promise<void> {
  const control = document.querySelector<HTMLElement>('.arch-map-open');
  if (control === null) {
    log('map: SKIP (no open control on screen)');
    return;
  }
  const press = (): void => {
    control.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })
    );
  };
  press();

  // Wait for the tab body to leave its reading state: either the SVG landed
  // or the body settled on an error sentence. The ceiling covers a cold scan.
  const deadline = Date.now() + 30_000;
  for (;;) {
    await new Promise((r) => setTimeout(r, 250));
    const svg = document.querySelector('[data-slot="arch-map-tab"] svg');
    const failed = document.querySelector(
      '[data-slot="arch-map-tab"] .ed-state-body'
    );
    if (svg !== null || failed !== null || Date.now() > deadline) break;
  }

  const entry = useArch.getState().mapFor(cwd);
  const model = entry?.model ?? null;
  const tabs = (): number => document.querySelectorAll('.ed-tab').length;
  const tabsBefore = tabs();
  const activeTabName =
    document.querySelector('.ed-tab.active .ed-tab-name')?.textContent ?? null;

  const svg = document.querySelector('[data-slot="arch-map-tab"] svg');
  log(
    `map: ${JSON.stringify({
      status: entry?.status ?? 'none',
      error: entry?.error ?? null,
      // The charter's proof line: the box and edge counts, written down.
      modelGroups: model?.groups.length ?? 0,
      modelEdges: model?.edges.length ?? 0,
      groupLabels: model?.groups.map((g) => g.label) ?? [],
      provenances: model?.groups.map((g) => g.provenance) ?? [],
      building: model?.building ?? null,
      contractPresent: model?.contractPresent ?? null,
      svgPresent: svg !== null,
      // Generic marks rather than the drawing's own class names, so this
      // reader does not have to agree with the map component about its
      // internals: every box is some shape and every name is a text node.
      svgShapes:
        svg === null
          ? 0
          : svg.querySelectorAll('rect, path, polygon, ellipse, circle').length,
      svgTexts: svg === null ? 0 : svg.querySelectorAll('text').length,
      tabName: activeTabName,
      edTabs: tabsBefore
    })}`
  );

  if (spec.refocus === true) {
    press();
    await new Promise((r) => setTimeout(r, 600));
    const after = tabs();
    log(
      `map refocus: ${JSON.stringify({
        tabsBefore,
        tabsAfter: after,
        oneTab: after === tabsBefore
      })}`
    );
  }
}

/**
 * THE LEVEL 2 MODULE VIEW, OPENED AND READ BACK OFF THE SCREEN (Phase 64).
 *
 * The section fetches `arch:modules` in an effect, so this selects the part,
 * waits for the answer to land, and then reads the RENDERED drawing rather
 * than the answer. It reports the grade the element is carrying, how many of
 * each drawing is on the page, and the sentences under it, which is the only
 * form in which "the caps fell back" is a thing a person saw rather than a
 * thing a pure function returned.
 */
async function driveModules(componentId: string): Promise<void> {
  useArch.getState().select(`component:${componentId}`);
  // The effect's fetch crosses the bridge, so this waits for the section to
  // stop saying it is loading rather than for a fixed time.
  const deadline = Date.now() + 20_000;
  for (;;) {
    await new Promise((r) => setTimeout(r, 250));
    const section = document.querySelector<HTMLElement>('.arch-modules');
    const grade = section?.getAttribute('data-grade') ?? null;
    if (section !== null && grade !== 'none') break;
    if (Date.now() > deadline) break;
  }

  const section = document.querySelector<HTMLElement>('.arch-modules');
  const body = document.querySelector<HTMLElement>('.arch-modules-body');
  const text = (sel: string): string =>
    document.querySelector<HTMLElement>(sel)?.textContent ?? '';
  log(
    `modules: ${JSON.stringify({
      part: componentId,
      present: section !== null,
      grade: section?.getAttribute('data-grade') ?? null,
      drawing: body?.getAttribute('data-drawing') ?? null,
      boxes: document.querySelectorAll('.arch-module-box').length,
      matrixLabels: document.querySelectorAll('.arch-matrix-label').length,
      rankRows: document.querySelectorAll('.arch-modules-top li').length,
      broke: document.querySelectorAll('.arch-module-broke').length,
      // A refusal, checked rather than asserted: research 49 section 6.3
      // forbids a count badge on a node, so a box may carry a name and a
      // folder and nothing else that is a bare number.
      countBadges: document.querySelectorAll('.arch-module-box .arch-count, .arch-module-box [data-count]').length,
      sentences: text('.arch-modules-sentences').slice(0, 400),
      failed: text('.arch-modules-failed').slice(0, 200),
      rawHtmlNodes: document.querySelectorAll('.arch-modules [data-raw-html]').length
    })}`
  );
}


/**
 * THE PICKER CHORD, PRESSED FOR REAL, with the one door it opens recorded.
 *
 * See {@link ArchProbeSpec.aim} for why the recorder sits at `shellOps` rather
 * than at the frozen preload bridge, and for what this does and does not
 * claim.
 */
async function driveAim(): Promise<void> {
  const raised: { items: readonly unknown[] }[] = [];
  const real = shellOps();
  installShellOps({
    ...real,
    showNativeMenu(menu) {
      raised.push(menu as unknown as { items: readonly unknown[] });
    }
  });

  const nodes = (): number => document.querySelectorAll('*').length;
  const domMenus = (): number =>
    document.querySelectorAll('[role=menu], .context-menu, .dom-menu').length;
  const before = { nodes: nodes(), domMenus: domMenus() };

  try {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'P',
        code: 'KeyP',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true
      })
    );
    await new Promise((r) => setTimeout(r, 2500));
  } finally {
    // Put the real door back whatever happened, so nothing after this point
    // runs against a recorder.
    installShellOps(real);
  }

  const after = { nodes: nodes(), domMenus: domMenus() };
  log(
    `aim: ${JSON.stringify({
      raised: raised.length,
      rows: raised.map((m) =>
        m.items.map((i) =>
          i === 'sep' ? '—' : ((i as { label?: string }).label ?? '?')
        )
      ),
      before,
      after,
      domNodesAdded: after.nodes - before.nodes
    })}`
  );
}
