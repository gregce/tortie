/**
 * TerminalPane — one xterm.js terminal bound to one gmux session.
 *
 * Mount = attach (main spawns a `tmux attach` client PTY and streams bytes
 * on term:data:<id>); unmount = detach (ONLY the attach client dies — the
 * tmux-side session keeps running). Mount panes only for visible sessions
 * (TerminalHost does this): hidden sessions cost no PTY and no xterm.
 *
 * - WebGL renderer, falling back to xterm's built-in DOM renderer when a
 *   WebGL context is unavailable or lost (@xterm/addon-canvas is not a
 *   dependency today).
 * - FitAddon re-fits on a ResizeObserver (rAF-coalesced); xterm's onResize
 *   is the single path that pushes new cols/rows to tmux.
 * - Flow control: each received chunk is acked back (bytes) after xterm
 *   finishes writing it, via the optional `term.ack` bridge method — the
 *   attach host pauses the PTY when too many bytes are unacked.
 * - Theme/fonts come from CSS custom properties with DESIGN.md §1.6 dark
 *   defaults (see ./theme.ts). Scrollback 10k (tmux holds 50k server-side).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import './terminal.css';
import type { GmuxApi, GmuxTermStreamExtras } from '@shared/ipc';
import type { GmuxErrorPayload, SessionStatus } from '@shared/types';
import {
  resolveTerminalFontFamily,
  resolveTerminalTheme,
  TERMINAL_FONT_SIZE,
  TERMINAL_LETTER_SPACING,
  TERMINAL_LINE_HEIGHT,
  TERMINAL_SCROLLBACK
} from './theme';

export interface TerminalPaneProps {
  sessionId: string;
  /** Latest known lifecycle status; 'restorable' panes never attach. */
  status?: SessionStatus;
  /** Grab keyboard focus (the active pane in the visible stack). */
  focused?: boolean;
}

interface OverlayState {
  title: string;
  detail?: string;
  /** Label for the retry button; omitted → no button. */
  action?: string;
}

/** Turn a main-process error (GmuxErrorPayload JSON) into friendly copy. */
function friendlyAttachError(err: unknown): OverlayState {
  const raw = err instanceof Error ? err.message : String(err);
  let payload: GmuxErrorPayload | null = null;
  // Electron prefixes invoke rejections ("Error invoking remote method…"),
  // so hunt for the JSON object anywhere in the message.
  const start = raw.indexOf('{');
  if (start !== -1) {
    try {
      payload = JSON.parse(raw.slice(start)) as GmuxErrorPayload;
    } catch {
      payload = null;
    }
  }
  switch (payload?.code) {
    case 'TMUX_NOT_FOUND':
      return {
        title: 'tmux is not installed',
        detail:
          'gmux needs tmux to keep sessions alive. Install it with ' +
          '"brew install tmux", then try again.',
        action: 'Try again'
      };
    case 'SESSION_NOT_FOUND':
      return {
        title: 'This session no longer exists',
        detail: payload.message
      };
    case 'TMUX_UNREACHABLE':
    case 'SPAWN_FAILED':
      return {
        title: "Can't connect to this session",
        detail: payload.message,
        action: 'Try again'
      };
    default:
      return {
        title: "Can't connect to this session",
        detail: payload?.message ?? raw,
        action: 'Try again'
      };
  }
}

export function TerminalPane({
  sessionId,
  status,
  focused = false
}: TerminalPaneProps): React.JSX.Element {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const focusedRef = useRef(focused);
  focusedRef.current = focused;

  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  // Bumping the epoch tears the terminal down and attaches fresh (retry).
  const [attachEpoch, setAttachEpoch] = useState(0);

  const retry = useCallback(() => {
    setOverlay(null);
    setAttachEpoch((e) => e + 1);
  }, []);

  const restorable = status === 'restorable';

  useEffect(() => {
    const container = mountRef.current;
    if (!container || restorable) return undefined;

    const gmux: GmuxApi | undefined = window.gmux;
    if (!gmux) {
      setOverlay({
        title: 'Terminal bridge unavailable',
        detail: 'window.gmux is missing — preload did not load.'
      });
      return undefined;
    }

    let disposed = false;
    setOverlay(null);

    const term = new Terminal({
      scrollback: TERMINAL_SCROLLBACK,
      fontFamily: resolveTerminalFontFamily(),
      fontSize: TERMINAL_FONT_SIZE,
      lineHeight: TERMINAL_LINE_HEIGHT,
      letterSpacing: TERMINAL_LETTER_SPACING,
      theme: resolveTerminalTheme(),
      cursorBlink: true,
      // Option-click selects text even while tmux mouse mode is on.
      macOptionClickForcesSelection: true
    });
    termRef.current = term;

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(
      new WebLinksAddon((_event, uri) => {
        // Main should route window.open → shell.openExternal
        // (setWindowOpenHandler); see the stream report.
        window.open(uri, '_blank', 'noopener,noreferrer');
      })
    );
    term.open(container);

    // WebGL when available; on failure/context loss xterm silently keeps
    // its built-in DOM renderer (no @xterm/addon-canvas dependency today).
    let webgl: WebglAddon | null = null;
    try {
      const addon = new WebglAddon();
      addon.onContextLoss(() => {
        addon.dispose();
        webgl = null;
      });
      term.loadAddon(addon);
      webgl = addon;
    } catch {
      webgl = null;
    }

    // ---- keystrokes / binary → main → pty --------------------------------
    const dataSub = term.onData((d) => gmux.term.sendInput(sessionId, d));
    const binarySub = term.onBinary((d) => gmux.term.sendInput(sessionId, d));

    // ---- single resize path: fit → xterm onResize → tmux client ----------
    const resizeSub = term.onResize(({ cols, rows }) => {
      void gmux.sessions.resize({ sessionId, cols, rows }).catch(() => {
        /* hidden/unattached panes may race a resize; harmless */
      });
    });

    // ---- output stream + flow-control acks (subscribe BEFORE attach so
    //      the initial redraw burst is never missed) ------------------------
    const extras = gmux.term as GmuxApi['term'] & GmuxTermStreamExtras;
    const ack =
      typeof extras.ack === 'function' ? extras.ack.bind(extras) : null;
    const unsubData = gmux.term.onData(sessionId, (chunk) => {
      const bytes = chunk.byteLength;
      term.write(chunk, ack ? () => ack(sessionId, bytes) : undefined);
    });

    // ---- exit notices ------------------------------------------------------
    // Preferred: term.onExit (attach client died unexpectedly). Fallback that
    // needs no preload extras: the frozen sessions.onStatusChanged event.
    const unsubExit =
      typeof extras.onExit === 'function'
        ? extras.onExit(sessionId, (p) => {
            if (disposed) return;
            setOverlay({
              title:
                p.exitCode === 0
                  ? 'This session has ended'
                  : 'This session ended unexpectedly',
              detail:
                p.exitCode === 0
                  ? undefined
                  : `connection closed (code ${p.exitCode})`,
              action: 'Reconnect'
            });
          })
        : null;
    const unsubStatus = gmux.sessions.onStatusChanged((id, st) => {
      if (disposed || id !== sessionId) return;
      if (st === 'exited') {
        setOverlay((prev) =>
          prev ?? { title: 'This session has ended', action: 'Reconnect' }
        );
      }
    });

    // ---- fit on container resize ------------------------------------------
    let raf = 0;
    const doFit = (): void => {
      if (disposed) return;
      try {
        fit.fit(); // no-op while the container has no size
      } catch {
        /* fitting mid-teardown is harmless */
      }
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(doFit);
    });
    observer.observe(container);

    // ---- attach -------------------------------------------------------------
    doFit(); // size the pty request window before the first paint lands
    void (async () => {
      try {
        await gmux.sessions.attach(sessionId);
        if (disposed) return;
        doFit();
        // Push the real size even if fit produced the 80×24 default.
        void gmux.sessions
          .resize({ sessionId, cols: term.cols, rows: term.rows })
          .catch(() => undefined);
        if (focusedRef.current) term.focus();
      } catch (err) {
        if (!disposed) setOverlay(friendlyAttachError(err));
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      unsubData();
      unsubExit?.();
      unsubStatus();
      dataSub.dispose();
      binarySub.dispose();
      resizeSub.dispose();
      try {
        webgl?.dispose();
      } catch {
        /* context-loss handler may have disposed it already */
      }
      term.dispose();
      termRef.current = null;
      // Kills only the attach client; the tmux session lives on.
      void gmux.sessions.detach(sessionId).catch(() => undefined);
    };
  }, [sessionId, restorable, attachEpoch]);

  useEffect(() => {
    if (focused) termRef.current?.focus();
  }, [focused, attachEpoch]);

  return (
    <div className="gmux-terminal-pane" data-session-id={sessionId}>
      <div ref={mountRef} className="gmux-terminal-mount" />
      {restorable ? (
        <div className="gmux-terminal-overlay">
          <div className="gmux-terminal-overlay-title">
            Ready to restore
          </div>
          <div>
            This session is saved but not running — restore it to pick up
            where it left off.
          </div>
        </div>
      ) : overlay ? (
        <div className="gmux-terminal-overlay">
          <div className="gmux-terminal-overlay-title">{overlay.title}</div>
          {overlay.detail ? (
            <div className="gmux-terminal-overlay-detail">
              {overlay.detail}
            </div>
          ) : null}
          {overlay.action ? (
            <button type="button" onClick={retry}>
              {overlay.action}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
