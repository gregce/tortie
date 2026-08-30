/**
 * The DIAGNOSTICS REPORT tab (Phase 163): one capture of what Tortie is
 * running, drawn as two tables and a few short sections.
 *
 * THE SPLIT IS THE SURFACE. The first table is Tortie: main, its windows,
 * the GPU and utility processes, the session server, the clients and
 * helpers it runs. The second is Your sessions: one row per session, the
 * process the session was started with plus everything under it, which is
 * the work Tortie supervises and would exist in a plain terminal too. Each
 * table carries its own total and the two are never added, because their
 * sum is the number every generic tool already shows and it explains
 * nothing. That attribution is what no generic tool can make, and it is the
 * reason this surface passes the parity guardrail.
 *
 * NOT A DASHBOARD. The report is taken once, when the tab opens, and again
 * only when a person presses Capture again. There is no interval, no auto
 * refresh, no sparkline and no live number. Opening the tab arms a long
 * task observer and an IPC count in main for the capture window only, and
 * `captureReport` stops both in the same call. Closing the tab leaves
 * nothing behind, which the capture suite proves.
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
  DiagnosticsReport,
  DiagnosticsSessionWorkload
} from '@shared/ipc';
import { gmuxBridge } from '../bridge';
import { showNativeMenu } from '../app/ContextMenu';
import { Codicon, menuGlyph } from '../icons';
import { useApp } from '../state/store';
import { captureReport, DiagnosticsUnavailable } from './capture';
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
  shellRows,
  type ShellRow
} from './format';
import './diagnostics.css';

type Phase =
  | { kind: 'capturing'; previous: DiagnosticsReport | null }
  | { kind: 'ready'; report: DiagnosticsReport }
  | { kind: 'unavailable' }
  | { kind: 'failed'; previous: DiagnosticsReport | null };

export function DiagnosticsTab(): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>({ kind: 'capturing', previous: null });
  const alive = useRef(true);
  const inFlight = useRef(false);

  const capture = useCallback((): void => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPhase((p) => ({
      kind: 'capturing',
      previous: p.kind === 'ready' ? p.report : p.kind === 'failed' ? p.previous : p.kind === 'capturing' ? p.previous : null
    }));
    void captureReport()
      .then((report) => {
        if (alive.current) setPhase({ kind: 'ready', report });
      })
      .catch((err: unknown) => {
        if (!alive.current) return;
        if (err instanceof DiagnosticsUnavailable) {
          setPhase({ kind: 'unavailable' });
          return;
        }
        setPhase((p) => ({
          kind: 'failed',
          previous: p.kind === 'capturing' ? p.previous : null
        }));
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  // ONE capture when the tab opens. Nothing here re-runs on its own.
  useEffect(() => {
    alive.current = true;
    capture();
    return () => {
      alive.current = false;
    };
  }, [capture]);

  return (
    <DiagnosticsBody
      phase={phase}
      onCapture={capture}
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
 * proved by rendering THIS with a report as a prop.
 */
export function DiagnosticsBody({
  phase,
  onCapture,
  onCopy,
  onHeapSnapshot
}: {
  phase: Phase;
  onCapture: () => void;
  onCopy: (text: string) => Promise<void> | void;
  onHeapSnapshot: (target: DiagnosticsHeapTarget) => Promise<void> | void;
}): React.JSX.Element {
  const report =
    phase.kind === 'ready'
      ? phase.report
      : phase.kind === 'capturing' || phase.kind === 'failed'
        ? phase.previous
        : null;
  const capturing = phase.kind === 'capturing';
  const [copied, setCopied] = useState(false);
  // The one timer this tab makes. Cleared on unmount so closing the tab
  // within two seconds of Copy leaves nothing behind.
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
          <ShellTable report={report} />
          <SessionsTable report={report} />
          <NowSection report={report} />
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

function ShellTable({ report }: { report: DiagnosticsReport }): React.JSX.Element {
  // Strays an earlier launch left running sit behind one disclosure under
  // the table, with their own count, and the total above never includes
  // them: a left over client is not what this app costs, and twenty of
  // them on the resting face would push the sessions below the fold.
  const all = shellRows(report.shell);
  const rows = all.filter((r) => r.process.kind !== 'orphan');
  const leftover = all.filter((r) => r.process.kind === 'orphan');
  const t = report.shellTotal;
  const l = report.leftoverTotal;
  const draw = ({ process: p, depth }: ShellRow): React.JSX.Element => (
    <tr key={p.pid} className={depth > 0 ? 'diag-child' : undefined}>
      <td className="diag-name">
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
  );
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
              <th scope="col">{words.COL_PROCESS}</th>
              <th scope="col" className="diag-num">{words.COL_PID}</th>
              <th scope="col" className="diag-num" title={words.COL_CPU_HOVER}>{words.COL_CPU}</th>
              <th scope="col" className="diag-num" title={words.COL_PRIVATE_HOVER}>{words.COL_PRIVATE}</th>
              <th scope="col" className="diag-num" title={words.COL_RSS_HOVER}>{words.COL_RSS}</th>
            </tr>
          </thead>
          <tbody>{rows.map(draw)}</tbody>
        </table>
      </div>
      {leftover.length > 0 ? (
        <details className="diag-leftover" title={words.LEFTOVER_HOVER}>
          <summary>
            {`${words.LEFTOVER}: ${String(l.processCount)} processes, ${bytesLabel(l.privateBytes)}`}
          </summary>
          <div className="diag-scroll">
            <table className="diag-table">
              <tbody>{leftover.map(draw)}</tbody>
            </table>
          </div>
        </details>
      ) : null}
    </section>
  );
}

function SessionsTable({ report }: { report: DiagnosticsReport }): React.JSX.Element {
  const t = report.sessionsTotal;
  const rows: DiagnosticsSessionWorkload[] = [...report.sessions].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
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
                <th scope="col">{words.COL_SESSION}</th>
                <th scope="col">{words.COL_AGENT}</th>
                <th scope="col" className="diag-num">{words.COL_PROCESSES}</th>
                <th scope="col" className="diag-num" title={words.COL_CPU_HOVER}>{words.COL_CPU}</th>
                <th scope="col" className="diag-num" title={words.COL_PRIVATE_HOVER}>{words.COL_MEMORY}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.sessionId ?? s.name}>
                  <td className="diag-name">
                    <span className="diag-proc">{s.name}</span>
                  </td>
                  <td>{s.agent}</td>
                  <td className="diag-num">{s.processCount}</td>
                  <td className="diag-num">{cpuLabel(s.cpuPercent)}</td>
                  <td className="diag-num">{bytesLabel(s.memory.privateBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
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

function NowSection({ report }: { report: DiagnosticsReport }): React.JSX.Element {
  const c = report.counts;
  const r = report.renderer;
  const m = report.main;
  const lt = r.longTasks;
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
        <Figure
          label={words.FIG_IPC}
          value={`${String(report.ipc.invokes)} up, ${String(report.ipc.events)} down`}
          hover={words.FIG_IPC_HOVER}
        />
        <Figure
          label={words.FIG_LONG_TASKS}
          value={lt === null ? words.NOT_READ : lt.count === 0 ? words.NONE : `${String(lt.count)}, ${msLabel(lt.totalMs)}`}
          hover={lt !== null && lt.buffered ? `${words.FIG_LONG_TASKS_HOVER} Some landed before the capture began.` : words.FIG_LONG_TASKS_HOVER}
        />
      </div>
      {c.listeners.length > 0 ? (
        <div className="diag-chips" title="What Tortie keeps open, by name.">
          <span className="diag-chips-label">{words.FIG_LISTENERS}</span>
          {c.listeners.map((name) => (
            <span key={name} className="diag-chip">{name}</span>
          ))}
        </div>
      ) : null}
      <div className="diag-two">
        <div className="diag-sub">
          <div className="diag-sub-head">{words.SECTION_RENDERER}</div>
          <div className="diag-figs">
            <Figure label={words.FIG_PRIVATE} value={bytesLabel(r.memory?.privateBytes ?? null)} />
            <Figure label={words.FIG_HEAP} value={r.memory === null ? words.NOT_READ : `${bytesLabel(r.memory.heapUsedBytes)} of ${bytesLabel(r.memory.heapTotalBytes)}`} hover="Used JavaScript heap, of the heap V8 has reserved." />
            <Figure label={words.FIG_BLINK} value={bytesLabel(r.memory?.blinkAllocatedBytes ?? null)} hover="Memory the page engine holds for this window." />
          </div>
        </div>
        <div className="diag-sub">
          <div className="diag-sub-head">{words.SECTION_MAIN}</div>
          <div className="diag-figs">
            <Figure label={words.FIG_PRIVATE} value={bytesLabel(m.privateBytes)} />
            <Figure label={words.FIG_HEAP} value={`${bytesLabel(m.heapUsedBytes)} of ${bytesLabel(m.heapTotalBytes)}`} hover="Used JavaScript heap, of the heap V8 has reserved." />
          </div>
        </div>
      </div>
    </section>
  );
}

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
      <div className="diag-figs diag-milestones">
        {names.map((name) => {
          const ms = at.get(name);
          return (
            <Figure
              key={name}
              label={milestoneLabel(name)}
              value={ms === undefined ? words.NOT_YET : msLabel(ms)}
            />
          );
        })}
      </div>
    </section>
  );
}

function DiskSection({ report }: { report: DiagnosticsReport }): React.JSX.Element {
  const d = report.disk;
  const rows: [string, string, string | undefined][] = [
    [words.DISK_HTTP, bytesLabel(d.httpCacheBytes), undefined],
    [words.DISK_CODE, bytesLabel(d.codeCacheBytes), undefined],
    [words.DISK_DURABLE, bytesLabel(d.durableBytes), undefined],
    [words.DISK_PROFILE, bytesLabel(d.profileBytes), undefined],
    [words.DISK_FREE, bytesLabel(d.freeBytes), undefined],
    // Phase 166. One row for the ceiling, the reason behind hover, never on
    // the face.
    [
      words.DISK_CEILING,
      d.httpCacheCeilingBytes === null
        ? words.DISK_CEILING_DEFAULT
        : bytesLabel(d.httpCacheCeilingBytes),
      d.cachePolicy.reason
    ]
  ];
  return (
    <section className="diag-section">
      <div className="diag-section-head" title={d.profilePath}>
        {words.SECTION_DISK}
      </div>
      <div className="diag-lines">
        {rows.map(([label, value, hover]) => (
          <div key={label} className="diag-line" title={hover}>
            <span className="diag-line-label">{label}</span>
            <span className="diag-line-value">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function WatchersSection({ report }: { report: DiagnosticsReport }): React.JSX.Element {
  return (
    <section className="diag-section">
      <div className="diag-section-head" title="One row per repository with a live file watcher, and what the system dropped since it opened.">
        {words.SECTION_WATCHERS}
      </div>
      {report.watchers.length === 0 ? (
        <div className="diag-note">{words.WATCHERS_NONE}</div>
      ) : (
        <div className="diag-lines">
          {report.watchers.map((w) => (
            <div key={w.repo} className="diag-line">
              <span className="diag-line-label">{w.repo}</span>
              <span className="diag-line-value">
                {`${String(w.drops)} ${words.WATCHER_DROPS}, ${String(w.rescansScheduled)} ${words.WATCHER_SCHEDULED}, ${String(w.rescansCompleted)} ${words.WATCHER_COMPLETED}`}
              </span>
            </div>
          ))}
        </div>
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
