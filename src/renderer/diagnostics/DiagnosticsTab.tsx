/**
 * The DIAGNOSTICS REPORT tab (Phase 163, regrouped and made live in Phase
 * 170): what Tortie is running, drawn as a glance strip, two tables and
 * four short sections.
 *
 * THE SPLIT IS THE SURFACE. The first table is Tortie: main, its windows,
 * the GPU and utility processes, the session server, the clients and
 * helpers it runs. The second is Your sessions: one row per session, the
 * process the session was started with plus everything under it, which is
 * the work Tortie supervises and would exist in a plain terminal too. Each
 * table carries its own total and the two are never added, because their
 * sum is the number every generic tool already shows and it explains
 * nothing. Both tables sort by a clicked column head, stable, with the
 * default order standing until the first click.
 *
 * THE BOTTOM HALF IS GROUPED BY THE QUESTION A PERSON ASKS (Phase 170):
 * what is open right now, how fast did it start (the milestones as one
 * horizontal ladder), what is on disk (the ceiling beside the cache it
 * caps), and what the watcher did (active rows on the face, quiet rows
 * behind a disclosure). The window's and the main process's own memory
 * figures live as expandable detail on their rows in the Tortie table,
 * where those pids already are. Nothing the Phase 163 face carried was
 * dropped; the unit suite pins every figure's new home.
 *
 * LIVE WHILE VISIBLE, QUIET THE INSTANT IT IS NOT. The operator overrode
 * the one capture stance on 2026-08-30: main ticks a sample every two
 * seconds while this tab holds a live subscription, and the subscription
 * stands only while the tab is visible, unpaused and mounted (./live.ts).
 * Hiding or closing the tab tears it down synchronously and main puts its
 * timer down, so nothing runs in the background. Pause holds the picture
 * still; Capture again is the manual refresh, and it is also the first
 * paint, because a tick takes an interval to arrive.
 *
 * JUST ENOUGH WORDS. Short labels, one line per row, and every explanation
 * lives in a hover title or behind one disclosure, never on the resting
 * face. The words are all in ./copy.ts.
 *
 * The body is exported with the report as a prop so the unit suite can
 * render every state through `renderToStaticMarkup` without a browser.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DiagnosticsHeapTarget,
  DiagnosticsIpcSample,
  DiagnosticsMainMemory,
  DiagnosticsRendererFacts,
  DiagnosticsReport
} from '@shared/ipc';
import { gmuxBridge } from '../bridge';
import { showNativeMenu } from '../app/ContextMenu';
import { Codicon, menuGlyph } from '../icons';
import { useApp } from '../state/store';
import {
  DiagnosticsUnavailable,
  type LongTaskWatch,
  captureReport,
  realLongTaskWatch,
  withRendererFacts
} from './capture';
import * as words from './copy';
import {
  bytesLabel,
  capturedAtLabel,
  cpuLabel,
  kindLabel,
  machineSentence,
  MILESTONE_ORDER,
  milestoneKey,
  milestoneLabel,
  msLabel,
  nextSort,
  shellRows,
  sortSessionRows,
  sortShellRows,
  type SessionSortCol,
  type ShellRow,
  type ShellSortCol,
  type SortSpec
} from './format';
import { LiveSubscription } from './live';
import { formatAge } from '../format';
import { formatAbsolute } from '../scm/format';
import { liveTerminalCount } from '../terminal/drop/registry';
import './diagnostics.css';

type Phase =
  | { kind: 'capturing'; previous: DiagnosticsReport | null }
  | { kind: 'ready'; report: DiagnosticsReport }
  | { kind: 'unavailable' }
  | { kind: 'failed'; previous: DiagnosticsReport | null };

export function DiagnosticsTab(): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>({ kind: 'capturing', previous: null });
  const [paused, setPaused] = useState(false);
  const alive = useRef(true);
  const inFlight = useRef<Promise<void> | null>(null);
  const sub = useRef<LiveSubscription | null>(null);

  /** One capture, shared by the loop and the button. Never two at once. */
  const captureOnce = useCallback((): Promise<void> => {
    const running = inFlight.current;
    if (running !== null) return running;
    // Live stands down while the manual capture holds main's window.
    sub.current?.setHeld(true);
    setPhase((p) => ({
      kind: 'capturing',
      previous:
        p.kind === 'ready' ? p.report : p.kind === 'unavailable' ? null : p.previous
    }));
    const done = captureReport()
      .then((report) => {
        if (alive.current) setPhase({ kind: 'ready', report });
      })
      .catch((err: unknown) => {
        if (!alive.current) return;
        if (err instanceof DiagnosticsUnavailable) {
          // No bridge means no later sample can arrive either. End the
          // subscription so nothing waits against a wall.
          sub.current?.dispose();
          setPhase({ kind: 'unavailable' });
          return;
        }
        setPhase((p) => ({
          kind: 'failed',
          previous: p.kind === 'capturing' ? p.previous : null
        }));
      })
      .finally(() => {
        inFlight.current = null;
        sub.current?.setHeld(false);
      });
    inFlight.current = done;
    return done;
  }, []);

  // The subscription stands only while this tab is VISIBLE. Hiding the
  // window tears it down through visibilitychange; closing the tab
  // unmounts this component and the cleanup below disposes it and removes
  // the one listener, so nothing runs in the background. A live sample
  // replaces the report directly, with no capturing flash, because the
  // picture on screen is never stale by more than one interval.
  useEffect(() => {
    alive.current = true;
    const api = gmuxBridge()?.diagnostics;
    // Phase 170 fix round. Main's live sample carries this window's facts as
    // null, because main never asks a renderer to run code. This side fills
    // them on receipt: private memory and heap from the preload, mounted
    // surfaces from the registry, long tasks from an observer that is armed
    // exactly while the subscription stands and re-armed each tick so the
    // figure is per interval. A sample overtaken by a newer one is dropped.
    let watch: LongTaskWatch | null = null;
    let latestTick = 0;
    const s = new LiveSubscription({
      liveStart: (visible) =>
        api !== undefined
          ? api.liveStart(visible)
          : Promise.resolve({ started: false, intervalMs: 0 }),
      liveStop: () => (api !== undefined ? api.liveStop() : Promise.resolve()),
      onLiveSample: (cb) =>
        api !== undefined ? api.onLiveSample(cb) : () => undefined,
      onSample: (sample) => {
        latestTick = sample.tick;
        const longTasks = watch === null ? null : watch.read();
        watch?.stop();
        watch = watch === null ? null : realLongTaskWatch();
        const mountedSurfaces = liveTerminalCount();
        const read =
          api !== undefined ? api.rendererMemory() : Promise.resolve(null);
        void read
          .catch(() => null)
          .then((memory) => {
            if (!alive.current || sample.tick !== latestTick) return;
            const report = withRendererFacts(sample.report, {
              memory,
              mountedSurfaces,
              longTasks
            });
            setPhase({ kind: 'ready', report });
          });
      },
      arm: () => {
        watch = realLongTaskWatch();
        return () => {
          watch?.stop();
          watch = null;
        };
      }
    });
    sub.current = s;
    const onVisibility = (): void => {
      s.setVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();
    // The first paint: a tick takes an interval to arrive, a capture is now.
    void captureOnce();
    return () => {
      alive.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
      s.dispose();
      sub.current = null;
    };
  }, [captureOnce]);

  const onTogglePause = useCallback((): void => {
    setPaused((p) => {
      const next = !p;
      sub.current?.setPaused(next);
      return next;
    });
  }, []);

  return (
    <DiagnosticsBody
      phase={phase}
      paused={paused}
      onTogglePause={onTogglePause}
      onCapture={() => void captureOnce()}
      onCopy={(text) => navigator.clipboard.writeText(text)}
      onHeapSnapshot={saveHeapSnapshot}
    />
  );
}

/** The opt in artifact, behind its own action. Never part of a report. */
async function saveHeapSnapshot(target: DiagnosticsHeapTarget): Promise<void> {
  const api = gmuxBridge()?.diagnostics;
  if (api === undefined) return;
  try {
    const result = await api.saveHeapSnapshot(target);
    if (result.outcome === 'saved' && result.path !== undefined) {
      useApp.getState().toast('info', `Heap snapshot saved to ${result.path}`);
    }
  } catch {
    useApp.getState().toast('error', 'The heap snapshot was not saved');
  }
}

/**
 * The face, with the state handed in. Exported for the unit suite: this
 * repository carries no jsdom, so the states a screenshot cannot reach are
 * proved by rendering THIS with a report as a prop. The three harness props
 * below the callbacks seed sort and row detail state, because static markup
 * cannot click.
 */
export function DiagnosticsBody({
  phase,
  paused,
  onTogglePause,
  onCapture,
  onCopy,
  onHeapSnapshot,
  expandedPids,
  initialShellSort,
  initialSessionSort
}: {
  phase: Phase;
  paused: boolean;
  onTogglePause: () => void;
  onCapture: () => void;
  onCopy: (text: string) => Promise<void> | void;
  onHeapSnapshot: (target: DiagnosticsHeapTarget) => Promise<void> | void;
  /** Harness only: pids whose detail rows start open. */
  expandedPids?: readonly number[];
  /** Harness only: the Tortie table's sort at first render. */
  initialShellSort?: SortSpec<ShellSortCol> | null;
  /** Harness only: the sessions table's sort at first render. */
  initialSessionSort?: SortSpec<SessionSortCol> | null;
}): React.JSX.Element {
  const report =
    phase.kind === 'ready'
      ? phase.report
      : phase.kind === 'capturing' || phase.kind === 'failed'
        ? phase.previous
        : null;
  const capturing = phase.kind === 'capturing';
  const [copied, setCopied] = useState(false);
  // The copied flip's timer. Cleared on unmount so closing the tab within
  // two seconds of Copy leaves nothing behind.
  const copiedTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current !== null) clearTimeout(copiedTimer.current);
    },
    []
  );

  const copy = (): void => {
    if (report === null) return;
    void Promise.resolve(onCopy(report.text)).then(() => {
      setCopied(true);
      if (copiedTimer.current !== null) clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => {
        copiedTimer.current = null;
        setCopied(false);
      }, 2_000);
    });
  };

  const heapMenu = (e: React.MouseEvent): void => {
    showNativeMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: words.HEAP_MAIN,
          ...menuGlyph('save'),
          run: () => void onHeapSnapshot('main')
        },
        {
          label: words.HEAP_WINDOW,
          ...menuGlyph('save'),
          run: () => void onHeapSnapshot('window')
        }
      ]
    });
  };

  return (
    <div
      className="diag"
      aria-label={words.DIAGNOSTICS_TITLE}
      // HARNESS ONLY. The exact bytes Copy report carries, so a verifier can
      // scan the copied text for a secret without a clipboard. It is the same
      // string the button writes, and it is present only once a report has
      // landed. No product surface reads it.
      {...(report !== null ? { 'data-copy': report.text } : {})}
    >
      <header className="diag-head">
        <span className="diag-title">{words.DIAGNOSTICS_TITLE}</span>
        <span className="diag-when">
          {report !== null
            ? `${capturedAtLabel(report.generatedAt)}, ${msLabel(report.windowMs)} window`
            : phase.kind === 'unavailable'
              ? words.STATE_NO_BRIDGE
              : phase.kind === 'failed'
                ? words.STATE_FAILED
                : words.STATE_CAPTURING}
        </span>
        <span className="diag-head-spacer" />
        {phase.kind !== 'unavailable' ? (
          <>
            <span
              className={`diag-live${paused ? ' diag-live-paused' : ''}`}
              title={words.LIVE_HOVER}
            >
              <span className="diag-live-dot" aria-hidden="true" />
              {paused ? words.LIVE_PAUSED : `${words.LIVE}, ${words.LIVE_EVERY}`}
            </span>
            <button
              type="button"
              className="btn btn-secondary diag-btn"
              title={words.LIVE_HOVER}
              onClick={onTogglePause}
            >
              <Codicon name={paused ? 'play' : 'debug-pause'} size={14} />
              {paused ? words.RESUME : words.PAUSE}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="btn btn-secondary diag-btn"
          disabled={capturing || phase.kind === 'unavailable'}
          onClick={onCapture}
        >
          <Codicon name="refresh" size={14} />
          {capturing ? words.CAPTURING : words.CAPTURE_AGAIN}
        </button>
        <button
          type="button"
          className="btn btn-secondary diag-btn"
          disabled={report === null}
          onClick={copy}
        >
          <Codicon name={copied ? 'check' : 'copy'} size={14} />
          {copied ? words.COPIED : words.COPY_REPORT}
        </button>
        <button
          type="button"
          className="btn btn-secondary diag-btn"
          title={words.HEAP_SNAPSHOT_HOVER}
          disabled={phase.kind === 'unavailable'}
          onClick={heapMenu}
        >
          <Codicon name="save" size={14} />
          {words.HEAP_SNAPSHOT}
        </button>
      </header>

      {report === null ? (
        <div className="diag-note">
          {phase.kind === 'unavailable'
            ? words.STATE_NO_BRIDGE
            : phase.kind === 'failed'
              ? words.STATE_FAILED
              : words.STATE_CAPTURING}
        </div>
      ) : (
        <div className={`diag-body${capturing ? ' diag-body-stale' : ''}`}>
          <GlanceStrip report={report} />
          <ShellTable
            report={report}
            initialSort={initialShellSort ?? null}
            expandedPids={expandedPids}
          />
          <SessionsTable report={report} initialSort={initialSessionSort ?? null} />
          <OpenNowSection report={report} />
          <StartupSection report={report} />
          <DiskSection report={report} />
          <WatchersSection report={report} />
          <ElectronProof report={report} />
        </div>
      )}
    </div>
  );
}

/**
 * Phase 168: the summary before the detail. Three columns above the two
 * tables, which stay exactly as they are. The Together column is the ONE
 * place the two totals are added, and it says what it sums. The machine
 * sentence below ranks Tortie on this Mac; the other apps' names live on
 * this face alone and never enter the copied report.
 */
function GlanceStrip({ report }: { report: DiagnosticsReport }): React.JSX.Element {
  const g = report.glance;
  const sentence = machineSentence(report.machine);
  const cpuValue = (cpu: number | null): string =>
    cpu === null ? words.NOT_READ : cpuLabel(cpu);
  const col = (
    label: string,
    hover: string,
    c: typeof g.tortie,
    sub?: string,
    extra?: React.ReactNode
  ): React.JSX.Element => (
    <div
      className={`diag-glance-col${sub !== undefined ? ' diag-glance-col-together' : ''}`}
      title={hover}
    >
      <div className="diag-glance-label">{label}</div>
      {sub !== undefined ? <div className="diag-glance-sub">{sub}</div> : null}
      <div className="diag-figs">
        <Figure
          label={words.COL_MEMORY}
          value={bytesLabel(c.privateBytes)}
          hover={words.GLANCE_MEMORY_HOVER}
        />
        <Figure
          label={words.COL_CPU}
          value={cpuValue(c.cpuPercent)}
          hover={words.GLANCE_CPU_HOVER}
        />
        {extra}
      </div>
    </div>
  );
  return (
    <section className="diag-glance">
      <div className="diag-glance-cols">
        {col(words.GLANCE_TORTIE, words.GLANCE_TORTIE_HOVER, g.tortie)}
        {col(words.GLANCE_AGENTS, words.GLANCE_AGENTS_HOVER, g.agents)}
        {col(
          words.GLANCE_TOGETHER,
          words.GLANCE_TOGETHER_HOVER,
          g.together,
          words.GLANCE_TOGETHER_SUB,
          <Figure
            label={words.FIG_ENERGY}
            value={
              g.energyImpact === null
                ? words.ENERGY_UNAVAILABLE
                : String(g.energyImpact)
            }
            hover={words.ENERGY_HOVER}
          />
        )}
      </div>
      {sentence !== null ? (
        <div className="diag-machine" title={words.MACHINE_HOVER}>
          {sentence}
        </div>
      ) : null}
    </section>
  );
}

function GroupHead({
  label,
  hover,
  total
}: {
  label: string;
  hover: string;
  total: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="diag-group-head" title={hover}>
      <span className="diag-group-label">{label}</span>
      <span className="diag-group-total">{total}</span>
    </div>
  );
}

/** A sortable column head. The default order stands until the first click. */
function SortableHead<C extends string>({
  col,
  label,
  sort,
  onSort,
  num,
  hover
}: {
  col: C;
  label: string;
  sort: SortSpec<C> | null;
  onSort: (col: C) => void;
  num?: boolean;
  hover?: string;
}): React.JSX.Element {
  const sorted = sort !== null && sort.col === col;
  return (
    <th
      scope="col"
      className={num === true ? 'diag-num' : undefined}
      {...(sorted
        ? { 'aria-sort': sort.dir === 'asc' ? ('ascending' as const) : ('descending' as const) }
        : {})}
    >
      <button
        type="button"
        className="diag-th-btn"
        title={hover ?? words.COL_SORT_HOVER}
        onClick={() => onSort(col)}
      >
        {label}
        {sorted ? (
          <span className="diag-sort-ind" aria-hidden="true">
            {sort.dir === 'asc' ? '▴' : '▾'}
          </span>
        ) : null}
      </button>
    </th>
  );
}

function ShellTable({
  report,
  initialSort,
  expandedPids
}: {
  report: DiagnosticsReport;
  initialSort: SortSpec<ShellSortCol> | null;
  expandedPids?: readonly number[];
}): React.JSX.Element {
  const [sort, setSort] = useState<SortSpec<ShellSortCol> | null>(initialSort);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(
    () => new Set(expandedPids ?? [])
  );
  // Strays an earlier launch left running sit behind one disclosure under
  // the table, with their own count, and the total above never includes
  // them: a left over client is not what this app costs, and twenty of
  // them on the resting face would push the sessions below the fold.
  const all = shellRows(report.shell);
  const rows = sortShellRows(all.filter((r) => r.process.kind !== 'orphan'), sort);
  const leftover = all.filter((r) => r.process.kind === 'orphan');
  const t = report.shellTotal;
  const l = report.leftoverTotal;

  // Phase 170: THIS WINDOW and MAIN PROCESS fold into the table as detail
  // on the rows those pids already have. The window detail lands on the
  // renderer row that answered for itself, else the first renderer row.
  const mainPid = report.shell.find((p) => p.kind === 'main')?.pid ?? null;
  const windowPid =
    report.shell.find(
      (p) => p.kind === 'renderer' && p.memory.privateSource === 'electron'
    )?.pid ??
    report.shell.find((p) => p.kind === 'renderer')?.pid ??
    null;
  const detailOf = (pid: number): 'main' | 'window' | null =>
    pid === mainPid ? 'main' : pid === windowPid ? 'window' : null;
  const toggle = (pid: number): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const onSort = (col: ShellSortCol): void => {
    setSort((s) => nextSort(s, col));
  };

  const draw = ({ process: p, depth }: ShellRow): React.JSX.Element[] => {
    const detail = detailOf(p.pid);
    const isOpen = detail !== null && expanded.has(p.pid);
    const out: React.JSX.Element[] = [
      <tr key={p.pid} className={depth > 0 && sort === null ? 'diag-child' : undefined}>
        <td className="diag-name">
          {detail !== null ? (
            <button
              type="button"
              className="diag-expand"
              title={words.DETAIL_HOVER}
              aria-expanded={isOpen}
              onClick={() => toggle(p.pid)}
            >
              <Codicon name={isOpen ? 'chevron-down' : 'chevron-right'} size={12} />
            </button>
          ) : (
            <span className="diag-expand-pad" />
          )}
          <span className="diag-kind">{kindLabel(p.kind)}</span>
          <span className="diag-proc">{p.name}</span>
          {p.detail !== undefined ? (
            <span className="diag-detail">{p.detail}</span>
          ) : null}
        </td>
        <td className="diag-num">{p.pid}</td>
        <td className="diag-num" title={p.cpuSource === 'sampled' ? 'Over the capture window' : 'Lifetime average'}>
          {cpuLabel(p.cpuPercent)}
        </td>
        <td className="diag-num" title={p.memory.privateSource === null ? words.NOT_READ : p.memory.privateSource === 'electron' ? 'Read from the process' : p.kind === 'gpu' ? words.GPU_FOOTPRINT_HOVER : 'OS footprint'}>
          {bytesLabel(p.memory.privateBytes)}
        </td>
        <td className="diag-num diag-dim">{bytesLabel(p.memory.rssBytes)}</td>
      </tr>
    ];
    if (isOpen && detail === 'main') {
      out.push(
        <tr key={`${String(p.pid)}-detail`} className="diag-detail-row">
          <td colSpan={5}>
            <MainDetail main={report.main} />
          </td>
        </tr>
      );
    }
    if (isOpen && detail === 'window') {
      out.push(
        <tr key={`${String(p.pid)}-detail`} className="diag-detail-row">
          <td colSpan={5}>
            <WindowDetail renderer={report.renderer} ipc={report.ipc} />
          </td>
        </tr>
      );
    }
    return out;
  };

  return (
    <section className="diag-group diag-group-shell">
      <GroupHead
        label={words.GROUP_SHELL}
        hover={words.GROUP_SHELL_HOVER}
        total={`${String(t.processCount)} processes, ${bytesLabel(t.privateBytes)} private`}
      />
      <div className="diag-scroll">
        <table className="diag-table">
          <thead>
            <tr>
              <SortableHead col={'process' as ShellSortCol} label={words.COL_PROCESS} sort={sort} onSort={onSort} />
              <SortableHead col={'pid' as ShellSortCol} label={words.COL_PID} sort={sort} onSort={onSort} num />
              <SortableHead col={'cpu' as ShellSortCol} label={words.COL_CPU} sort={sort} onSort={onSort} num hover={words.COL_CPU_HOVER} />
              <SortableHead col={'private' as ShellSortCol} label={words.COL_PRIVATE} sort={sort} onSort={onSort} num hover={words.COL_PRIVATE_HOVER} />
              <SortableHead col={'resident' as ShellSortCol} label={words.COL_RSS} sort={sort} onSort={onSort} num hover={words.COL_RSS_HOVER} />
            </tr>
          </thead>
          <tbody>{rows.flatMap(draw)}</tbody>
        </table>
      </div>
      {leftover.length > 0 ? (
        <details className="diag-leftover" title={words.LEFTOVER_HOVER}>
          <summary>
            {`${words.LEFTOVER}: ${String(l.processCount)} processes, ${bytesLabel(l.privateBytes)}`}
          </summary>
          <div className="diag-scroll">
            <table className="diag-table">
              <tbody>{leftover.flatMap(draw)}</tbody>
            </table>
          </div>
        </details>
      ) : null}
    </section>
  );
}

/**
 * Phase 170: the main process row, opened. The figures the MAIN PROCESS
 * section used to carry, on the row whose pid they describe.
 */
function MainDetail({ main }: { main: DiagnosticsMainMemory }): React.JSX.Element {
  return (
    <>
      <div className="diag-detail-head">{words.SECTION_MAIN}</div>
      <div className="diag-figs">
        <Figure label={words.FIG_PRIVATE} value={bytesLabel(main.privateBytes)} />
        <Figure
          label={words.FIG_HEAP}
          value={`${bytesLabel(main.heapUsedBytes)} of ${bytesLabel(main.heapTotalBytes)}`}
          hover="Used JavaScript heap, of the heap V8 has reserved."
        />
      </div>
    </>
  );
}

/**
 * Phase 170: this window's row, opened. The figures the THIS WINDOW section
 * used to carry, plus the capture window's message counts and long tasks,
 * which belong to this window's conversation with main.
 */
function WindowDetail({
  renderer,
  ipc
}: {
  renderer: DiagnosticsRendererFacts;
  ipc: DiagnosticsIpcSample;
}): React.JSX.Element {
  const m = renderer.memory;
  const lt = renderer.longTasks;
  return (
    <>
      <div className="diag-detail-head">{words.SECTION_RENDERER}</div>
      <div className="diag-figs">
        <Figure label={words.FIG_PRIVATE} value={bytesLabel(m?.privateBytes ?? null)} />
        <Figure
          label={words.FIG_HEAP}
          value={
            m === null
              ? words.NOT_READ
              : `${bytesLabel(m.heapUsedBytes)} of ${bytesLabel(m.heapTotalBytes)}`
          }
          hover="Used JavaScript heap, of the heap V8 has reserved."
        />
        <Figure
          label={words.FIG_BLINK}
          value={bytesLabel(m?.blinkAllocatedBytes ?? null)}
          hover="Memory the page engine holds for this window."
        />
        <Figure
          label={words.FIG_LONG_TASKS}
          value={lt === null ? words.NOT_READ : lt.count === 0 ? words.NONE : `${String(lt.count)}, ${msLabel(lt.totalMs)}`}
          hover={lt !== null && lt.buffered ? `${words.FIG_LONG_TASKS_HOVER} Some landed before the capture began.` : words.FIG_LONG_TASKS_HOVER}
        />
        <Figure
          label={words.FIG_IPC}
          value={`${String(ipc.invokes)} up, ${String(ipc.events)} down`}
          hover={words.FIG_IPC_HOVER}
        />
      </div>
    </>
  );
}

function SessionsTable({
  report,
  initialSort
}: {
  report: DiagnosticsReport;
  initialSort: SortSpec<SessionSortCol> | null;
}): React.JSX.Element {
  const [sort, setSort] = useState<SortSpec<SessionSortCol> | null>(initialSort);
  const t = report.sessionsTotal;
  const rows = sortSessionRows(report.sessions, sort);
  // PHASE 188. The ages are measured against THIS REPORT'S instant, not
  // against the wall clock. One report is one moment, so every cell on a row
  // agrees about when it was true; a paused live view freezes the ages with
  // the memory numbers beside them instead of letting them creep on their own;
  // and the pane needs no age timer of its own, since live mode already
  // re-renders it every couple of seconds with a fresh instant. Parsed once
  // for the whole table rather than once per row.
  const now = Date.parse(report.generatedAt);
  const onSort = (col: SessionSortCol): void => {
    setSort((s) => nextSort(s, col));
  };
  return (
    <section className="diag-group diag-group-sessions">
      <GroupHead
        label={words.GROUP_SESSIONS}
        hover={words.GROUP_SESSIONS_HOVER}
        total={
          rows.length === 0
            ? words.NONE
            : `${String(t.processCount)} processes, ${bytesLabel(t.privateBytes)}`
        }
      />
      {rows.length === 0 ? (
        <div className="diag-note">{words.SESSIONS_NONE}</div>
      ) : (
        <div className="diag-scroll">
          <table className="diag-table">
            <thead>
              <tr>
                <SortableHead col={'session' as SessionSortCol} label={words.COL_SESSION} sort={sort} onSort={onSort} />
                <SortableHead col={'project' as SessionSortCol} label={words.COL_PROJECT} sort={sort} onSort={onSort} hover={words.COL_PROJECT_HOVER} />
                <SortableHead col={'agent' as SessionSortCol} label={words.COL_AGENT} sort={sort} onSort={onSort} />
                <SortableHead col={'processes' as SessionSortCol} label={words.COL_PROCESSES} sort={sort} onSort={onSort} num />
                <SortableHead col={'cpu' as SessionSortCol} label={words.COL_CPU} sort={sort} onSort={onSort} num hover={words.COL_CPU_HOVER} />
                <SortableHead col={'memory' as SessionSortCol} label={words.COL_MEMORY} sort={sort} onSort={onSort} num hover={words.COL_PRIVATE_HOVER} />
                <SortableHead col={'started' as SessionSortCol} label={words.COL_STARTED} sort={sort} onSort={onSort} num hover={words.COL_STARTED_HOVER} />
                <SortableHead col={'lastSeen' as SessionSortCol} label={words.COL_LAST_SEEN} sort={sort} onSort={onSort} num hover={words.COL_LAST_SEEN_HOVER} />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.sessionId ?? s.name}>
                  <td className="diag-name">
                    <span className="diag-proc">{s.name}</span>
                  </td>
                  <td className="diag-project" title={s.projectPath ?? undefined}>
                    {s.projectName ?? ''}
                  </td>
                  <td>{s.agent}</td>
                  <td className="diag-num">{s.processCount}</td>
                  <td className="diag-num">{cpuLabel(s.cpuPercent)}</td>
                  <td className="diag-num">{bytesLabel(s.memory.privateBytes)}</td>
                  <AgeCell epochMs={s.createdAt} now={now} />
                  <AgeCell epochMs={s.lastSeen} now={now} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * PHASE 188. An age on the face, the exact instant on hover, which is the pair
 * the rest of the app already uses: `formatAge` is what the session rail, the
 * attention overlay and three Settings sections draw, and `formatAbsolute` is
 * what the SCM hover card draws for this same job. A value that was never read
 * draws an empty cell with no title and no placeholder, because a dash or a
 * word would be a claim about a row this table does not know.
 */
function AgeCell({
  epochMs,
  now
}: {
  epochMs: number | null;
  now: number;
}): React.JSX.Element {
  if (epochMs === null) return <td className="diag-num" />;
  return (
    <td className="diag-num" title={formatAbsolute(epochMs)}>
      {formatAge(epochMs, now)}
    </td>
  );
}

function Figure({
  label,
  value,
  hover
}: {
  label: string;
  value: string;
  hover?: string;
}): React.JSX.Element {
  return (
    <div className="diag-fig" title={hover}>
      <span className="diag-fig-value">{value}</span>
      <span className="diag-fig-label">{label}</span>
    </div>
  );
}

/**
 * Phase 170: what is open right now. The counts, and the names of what
 * Tortie holds open. The window's and main's own memory moved into the
 * Tortie table as row detail; the message and long task figures moved with
 * this window's row, where their pid is.
 */
function OpenNowSection({ report }: { report: DiagnosticsReport }): React.JSX.Element {
  const c = report.counts;
  return (
    <section className="diag-section">
      <div className="diag-section-head" title={words.SECTION_NOW_HOVER}>
        {words.SECTION_NOW}
      </div>
      <div className="diag-figs">
        <Figure
          label={words.FIG_SESSIONS}
          value={String(c.sessions)}
          hover={`${String(c.localSessions)} on this Mac, ${String(c.remoteSessions)} on other machines`}
        />
        <Figure label={words.FIG_SURFACES} value={c.mountedSurfaces === null ? words.NOT_READ : String(c.mountedSurfaces)} hover="Terminals mounted in this window. Hidden sessions keep none." />
        <Figure label={words.FIG_WINDOWS} value={String(c.windows)} />
        <Figure label={words.FIG_WATCHERS} value={c.pendingWatcherCloses > 0 ? `${String(c.watchers)} +${String(c.pendingWatcherCloses)} closing` : String(c.watchers)} />
        <Figure label={words.FIG_REMOTE} value={String(c.remoteFeeds)} />
      </div>
      {c.listeners.length > 0 ? (
        <div className="diag-chips" title="What Tortie keeps open, by name.">
          <span className="diag-chips-label">{words.FIG_LISTENERS}</span>
          {c.listeners.map((name) => (
            <span key={name} className="diag-chip">{name}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Phase 170: the milestones as ONE horizontal ladder, left to right in
 * time, instead of seven floating figures. A mark that never landed keeps
 * its honest "not yet" and a dimmed dot.
 */
function StartupSection({ report }: { report: DiagnosticsReport }): React.JSX.Element {
  const at = new Map(report.milestones.map((m) => [milestoneKey(m.name), m.atMs]));
  const names = [
    ...MILESTONE_ORDER,
    ...report.milestones
      .map((m) => milestoneKey(m.name))
      .filter((n) => !MILESTONE_ORDER.includes(n))
  ];
  return (
    <section className="diag-section">
      <div className="diag-section-head" title={words.SECTION_STARTUP_HOVER}>
        {words.SECTION_STARTUP}
      </div>
      <div className="diag-scroll">
        <div className="diag-ladder">
          {names.map((name) => {
            const ms = at.get(name);
            return (
              <div
                key={name}
                className={`diag-ladder-step${ms === undefined ? ' diag-ladder-not-yet' : ''}`}
              >
                <div className="diag-ladder-rail">
                  <span className="diag-ladder-dot" />
                </div>
                <span className="diag-ladder-value">
                  {ms === undefined ? words.NOT_YET : msLabel(ms)}
                </span>
                <span className="diag-ladder-label">{milestoneLabel(name)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Phase 170: the ceiling sits directly under the cache it caps. */
function DiskSection({ report }: { report: DiagnosticsReport }): React.JSX.Element {
  const d = report.disk;
  const rows: [string, string, string | undefined, boolean][] = [
    [words.DISK_HTTP, bytesLabel(d.httpCacheBytes), undefined, false],
    [
      words.DISK_CEILING,
      d.httpCacheCeilingBytes === null
        ? words.DISK_CEILING_DEFAULT
        : bytesLabel(d.httpCacheCeilingBytes),
      d.cachePolicy.reason,
      true
    ],
    [words.DISK_CODE, bytesLabel(d.codeCacheBytes), undefined, false],
    [words.DISK_DURABLE, bytesLabel(d.durableBytes), undefined, false],
    [words.DISK_PROFILE, bytesLabel(d.profileBytes), undefined, false],
    [words.DISK_FREE, bytesLabel(d.freeBytes), undefined, false]
  ];
  return (
    <section className="diag-section">
      <div className="diag-section-head" title={d.profilePath}>
        {words.SECTION_DISK}
      </div>
      <div className="diag-lines">
        {rows.map(([label, value, hover, sub]) => (
          <div key={label} className={`diag-line${sub ? ' diag-line-sub' : ''}`} title={hover}>
            <span className="diag-line-label">{label}</span>
            <span className="diag-line-value">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Phase 170: what the watcher did. Rows with activity on the face; rows
 * with nothing to report behind one disclosure, counted.
 */
function WatchersSection({ report }: { report: DiagnosticsReport }): React.JSX.Element {
  const activity = (w: { drops: number; rescansScheduled: number; rescansCompleted: number }): number =>
    w.drops + w.rescansScheduled + w.rescansCompleted;
  const active = report.watchers.filter((w) => activity(w) > 0);
  const quiet = report.watchers.filter((w) => activity(w) === 0);
  const line = (w: (typeof report.watchers)[number]): React.JSX.Element => (
    <div key={w.repo} className="diag-line">
      <span className="diag-line-label">{w.repo}</span>
      <span className="diag-line-value">
        {`${String(w.drops)} ${words.WATCHER_DROPS}, ${String(w.rescansScheduled)} ${words.WATCHER_SCHEDULED}, ${String(w.rescansCompleted)} ${words.WATCHER_COMPLETED}`}
      </span>
    </div>
  );
  return (
    <section className="diag-section">
      <div className="diag-section-head" title="One row per repository with a live file watcher, and what the system dropped since it opened.">
        {words.SECTION_WATCHERS}
      </div>
      {report.watchers.length === 0 ? (
        <div className="diag-note">{words.WATCHERS_NONE}</div>
      ) : (
        <>
          {active.length === 0 ? (
            <div className="diag-note">{words.WATCHERS_ALL_QUIET}</div>
          ) : (
            <div className="diag-lines">{active.map(line)}</div>
          )}
          {quiet.length > 0 ? (
            <details className="diag-disclosure" title={words.WATCHERS_QUIET_HOVER}>
              <summary>
                {`${String(quiet.length)} ${quiet.length === 1 ? words.WATCHERS_QUIET_ONE : words.WATCHERS_QUIET_MANY}`}
              </summary>
              <div className="diag-lines">{quiet.map(line)}</div>
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}

/**
 * The audit's second proof, on the face behind a disclosure: every pid
 * Electron's own metrics listed, and whether the Tortie table named it.
 */
function ElectronProof({ report }: { report: DiagnosticsReport }): React.JSX.Element {
  const named = report.electronPids.filter((p) => p.named).length;
  return (
    <details className="diag-disclosure">
      <summary>
        {`${words.SECTION_ELECTRON}: ${String(report.electronPids.length)} listed, ${String(named)} named`}
      </summary>
      <div className="diag-lines">
        {report.electronPids.map((p) => (
          <div key={p.pid} className="diag-line">
            <span className="diag-line-label">{`${p.type} ${String(p.pid)}`}</span>
            <span className={`diag-line-value${p.named ? '' : ' diag-unnamed'}`}>
              {p.named ? 'named' : 'not named'}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
