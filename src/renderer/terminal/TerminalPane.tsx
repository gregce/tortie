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
import { useApp } from '../state/store';
import { registerTerminal } from './drop/registry';
import { terminalKeyHandler } from './keys';
import { canSplit, showTerminalMenu } from './terminal-menu';
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

    // Published for the features that must reach a terminal they do not own:
    // capture + the context menu (Phase 12 #1/#2) and file drop (#8).
    const unregister = registerTerminal(sessionId, term);

    // ⌘C / ⌘A / ⌘K. ⌘C with a selection copies; with NO selection it sends
    // SIGINT — the renderer sees the key before the app menu (see ./keys.ts),
    // so this handler, not `role:'copy'`, decides which.
    term.attachCustomKeyEventHandler(
      terminalKeyHandler(
        sessionId,
        term,
        () =>
          useApp.getState().sessions.find((s) => s.id === sessionId)
            ?.tmuxName ?? ''
      )
    );

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(
      new WebLinksAddon((_event, uri) => {
        // Main should route window.open → shell.openExternal
        // (setWindowOpenHandler); see the stream report.
        window.open(uri, '_blank', 'noopener,noreferrer');
      })
    );
    // Opened inside the boot sequence below — AFTER document.fonts.ready —
    // so xterm never measures cells or builds its (WebGL) glyph atlas from
    // a not-yet-loaded font (Bug C hardening: a @font-face --font-mono
    // would otherwise rasterize as the fallback and stick until a resize).
    // WebGL when available; on failure/context loss xterm silently keeps
    // its built-in DOM renderer (no @xterm/addon-canvas dependency today).
    let webgl: WebglAddon | null = null;

    // ---- keystrokes / binary → main → pty --------------------------------
    // noteTerminalInput: the status detector must know about EVERY byte the
    // user sends — including mouse reports, which never reach keydown — so
    // an echoed BEL right after a click is not mistaken for "needs input".
    const dataSub = term.onData((d) => {
      useApp.getState().noteTerminalInput(sessionId);
      gmux.term.sendInput(sessionId, d);
    });
    const binarySub = term.onBinary((d) => {
      useApp.getState().noteTerminalInput(sessionId);
      gmux.term.sendInput(sessionId, d);
    });

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

    // ---- fonts: keep the glyph atlas honest --------------------------------
    // If a font finishes loading AFTER the terminal opened (late webfont,
    // user-changed --font-mono), stale atlas glyphs would keep rendering —
    // re-apply the family and rebuild the atlas. No-op churn is cheap.
    const onFontsLoaded = (): void => {
      if (disposed || !termRef.current) return;
      term.options.fontFamily = resolveTerminalFontFamily();
      webgl?.clearTextureAtlas();
      if (term.rows > 0) term.refresh(0, term.rows - 1);
    };
    document.fonts?.addEventListener('loadingdone', onFontsLoaded);

    // ---- open + attach ------------------------------------------------------
    void (async () => {
      // Bug C: wait for pending font loads so cell metrics and the WebGL
      // atlas are built from the real terminal font. Resolves immediately
      // for pure system-font stacks (the shipped default).
      try {
        await document.fonts?.ready;
      } catch {
        /* non-browser test envs have no FontFaceSet — proceed */
      }
      if (disposed) return;
      term.open(container);
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
      doFit(); // size the pty request window before the first paint lands
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
      unregister();
      document.fonts?.removeEventListener('loadingdone', onFontsLoaded);
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

  // Right-click anywhere in the session → the native menu (DESIGN.md §3).
  // Right-clicking inside a selection keeps it, so Copy still has something
  // to act on; right-clicking elsewhere behaves like a click.
  const onContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const session = useApp
        .getState()
        .sessions.find((s) => s.id === sessionId);
      if (session === undefined) return;
      showTerminalMenu(session, event.clientX, event.clientY, {
        splittable: !restorable && canSplit(session)
      });
    },
    [sessionId, restorable]
  );

  return (
    <div
      className="gmux-terminal-pane"
      data-session-id={sessionId}
      onContextMenu={onContextMenu}
    >
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
