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
 *   dependency today). The pane logs the fallback and retries the WebGL
 *   addon once per power:resume broadcast (Phase 28).
 * - FitAddon re-fits on a ResizeObserver (rAF-coalesced); xterm's onResize
 *   is the single path that pushes new cols/rows to tmux.
 * - Flow control: each received chunk is acked back (bytes) after xterm
 *   finishes writing it, via the optional `term.ack` bridge method — the
 *   attach host pauses the PTY when too many bytes are unacked.
 * - Theme/fonts come from CSS custom properties with DESIGN.md §1.6 dark
 *   defaults (see ./theme.ts). The xterm scrollback option there is INERT —
 *   this client lives in the alternate buffer, which has no scrollback — so
 *   the real depth is tmux's, and it is scrolled through ./scroll/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import './terminal.css';
import type {
  GmuxApi,
  GmuxPowerExtras,
  GmuxTermStreamExtras
} from '@shared/ipc';
import type { GmuxErrorPayload, Session, SessionStatus } from '@shared/types';
import { useApp } from '../state/store';
// Phase 12.11: a terminal zooms by changing its FONT, never by CSS scaling —
// see src/renderer/zoom/regions.ts for why, and for the S1 band rule.
import { zoomedFontSize, useZoom } from '../zoom';
import { snapshotSelection } from './capture';
import { registerTerminal } from './drop/registry';
import { terminalKeyHandler } from './keys';
import { multilineSequenceFor, primeMultilineKeys } from './keys/multiline';
import { ScrollSurface } from './scroll/surface';
import { TerminalScrollbar } from './scroll/TerminalScrollbar';
import { canSplit, showTerminalMenu } from './terminal-menu';
// Phase 78: the work-area font preset. The pane subscribes because xterm owns
// an imperative `fontFamily` option that a custom property change cannot
// reach, and because the face has to be LOADED before anything measures a cell.
import {
  loadWorkAreaFace,
  useWorkAreaFont,
  workFont
} from '../theme/work-fonts';
import {
  resolveTerminalFontFamily,
  resolveTerminalTheme,
  terminalBaseFontSize,
  TERMINAL_LETTER_SPACING,
  TERMINAL_LINE_HEIGHT,
  TERMINAL_RIGHT_CLICK_SELECTS_WORD,
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

/**
 * True while the pane must swallow every byte the user types (Phase 67).
 *
 * An `unknown` session sits on a server Tortie cannot currently reach.
 * Keystrokes sent into the attach client would queue in a socket nobody has
 * proven alive and land later, all at once, in an agent conversation that
 * may have moved on. The gate drops keystrokes, mouse reports and
 * `noteTerminalInput` alike; the status semantics rule also requires the
 * last one, because the user's own input must never clear a machine
 * condition. Input flows again the moment a completed probe moves the row
 * out of `unknown`.
 */
export function paneRefusesInput(status: SessionStatus | undefined): boolean {
  return status === 'unknown';
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
    // Phase 41. The pane used to spell "brew install tmux" here, which became
    // wrong in two directions at once: a packaged Tortie carries its own copy,
    // so there is nothing to install, and a development build gets a sentence
    // main already composed. Main writes the words in all three cases now and
    // the pane shows them, so the pane and the boot screen can never disagree.
    case 'TMUX_NOT_FOUND':
      return {
        title: 'tmux is not installed',
        detail: payload.message,
        action: 'Try again'
      };
    case 'TMUX_BUNDLE_INCOMPLETE':
      return {
        title: 'Tortie cannot start sessions',
        detail: payload.message,
        action: 'Try again'
      };
    case 'TMUX_VERSION_MISMATCH':
      return {
        title: 'Tortie cannot reach this session',
        detail: payload.message,
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
  // Zoom re-fits an ALREADY-MOUNTED terminal, so the addon and the WebGL
  // renderer have to outlive the mount effect's closure.
  const fitRef = useRef<FitAddon | null>(null);
  const webglRef = useRef<WebglAddon | null>(null);
  // Phase 28: set inside the mount effect, called by the power:resume effect
  // so a pane that lost its WebGL context can try the addon again on wake.
  const retryWebglRef = useRef<(() => void) | null>(null);
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  // Phase 67: the input gate reads the CURRENT status, not the one the mount
  // effect closed over. The attach stays mounted across an unreachable spell
  // (deliberately, so a stall that resolves resumes the same view with no
  // churn), which means the onData handlers below outlive many status flips.
  const statusRef = useRef(status);
  statusRef.current = status;

  // Phase 12.11 — one level for the whole terminal region, not one per pane.
  // A split grid whose panes disagreed about font size would read as a
  // rendering fault, and ⌘0 resets "the focused region", which is the grid.
  const zoomFactor = useZoom((s) => s.levels.terminal);
  const zoomRef = useRef(zoomFactor);
  zoomRef.current = zoomFactor;

  // Phase 78. One preset for the whole work area, the same shape as the zoom
  // level above. `appliedFontRef` records which preset this xterm has actually
  // been measured against, so the font effect below does its work once per
  // change and once per fresh attach, and never twice for the same face.
  const workAreaFont = useWorkAreaFont((s) => s.preset);
  const workAreaFontRef = useRef(workAreaFont);
  workAreaFontRef.current = workAreaFont;
  const appliedFontRef = useRef<typeof workAreaFont | null>(null);

  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  // Bumping the epoch tears the terminal down and attaches fresh (retry).
  const [attachEpoch, setAttachEpoch] = useState(0);
  // The pane's scroll surface (tmux history). Published to state so the
  // scrollbar renders alongside the terminal it belongs to.
  const [surface, setSurface] = useState<ScrollSurface | null>(null);

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
        // The old detail read "window.gmux is missing — preload did not
        // load.", which named an identifier the user cannot act on and put
        // the pre-rename product name on screen. What they need instead is
        // the reassurance that this is a broken WINDOW, not lost work: the
        // sessions are in the private server either way (PRODUCT.md, P1).
        title: 'Terminal bridge unavailable',
        detail:
          'This window did not finish loading, so it cannot show your ' +
          'sessions. They are still running — quit Tortie and open it again.'
      });
      return undefined;
    }

    let disposed = false;
    setOverlay(null);

    // The ⇧↩ table is registry data fetched once per renderer (the lookup
    // below runs inside a keystroke handler and cannot await). Until it
    // lands every agent takes the measured LF default, so an early keypress
    // is right, not merely harmless.
    void primeMultilineKeys();

    const term = new Terminal({
      scrollback: TERMINAL_SCROLLBACK,
      fontFamily: resolveTerminalFontFamily(),
      // Open at the CURRENT zoom, not at 100%: a pane mounted into an
      // already-zoomed region (a new split, a project switch, a relaunch)
      // must never draw one frame at the base size and then jump.
      fontSize: zoomedFontSize(terminalBaseFontSize(), zoomRef.current),
      lineHeight: TERMINAL_LINE_HEIGHT,
      letterSpacing: TERMINAL_LETTER_SPACING,
      theme: resolveTerminalTheme(),
      cursorBlink: true,
      // Belt to the private server's `mouse off` brace: even if an app inside
      // the pane turns mouse tracking on, Option-click still selects locally.
      macOptionClickForcesSelection: true,
      // Phase 40. xterm defaults this to true on macOS, and it is what threw
      // the selection away before the menu could be built. See ./theme.ts.
      rightClickSelectsWord: TERMINAL_RIGHT_CLICK_SELECTS_WORD
    });
    termRef.current = term;
    // The constructor above read `--font-terminal`, so a pane mounting under
    // a preset that ships no face is already drawing the right one and has
    // nothing to await. A bundled preset leaves this null, so the font effect
    // loads the face and re-measures the new terminal once.
    appliedFontRef.current =
      workFont(workAreaFontRef.current).familyName === null
        ? workAreaFontRef.current
        : null;

    // Right-click is a gmux gesture, never a byte on the wire (see the mouse
    // note in resources/gmux-tmux.conf). xterm attaches its own NATIVE
    // mousedown listener to .xterm-screen and writes an SGR button-3 report
    // the moment an app has mouse tracking on — that is how one right-click
    // used to open BOTH gmux's native menu and tmux's own pane menu (Split /
    // Swap / Kill / Respawn), tmux vocabulary the user should never see. A
    // capture-phase listener on the mount (an ancestor of .xterm-screen) runs
    // first and stops the descent, so only React's onContextMenu below ever
    // sees the click.
    const swallowRightButton = (event: MouseEvent): void => {
      if (event.button !== 2) return;
      event.stopPropagation();
    };
    container.addEventListener('mousedown', swallowRightButton, true);
    container.addEventListener('mouseup', swallowRightButton, true);

    // Published for the features that must reach a terminal they do not own:
    // capture + the context menu (Phase 12 #1/#2) and file drop (#8).
    const unregister = registerTerminal(sessionId, term);

    // ---- scrollback (Phase 12.3) ------------------------------------------
    // `tmux attach` puts this client in the ALTERNATE buffer, so xterm has no
    // scrollback of its own and its wheel handler degrades to emitting cursor
    // keys — which agents read as prompt-history navigation. The session's
    // real history is tmux's, and this surface drives it.
    const scroll = new ScrollSurface(sessionId, term);
    setSurface(scroll);
    term.attachCustomWheelEventHandler((event) => scroll.handleWheel(event));

    // ⌘C / ⌘A / ⌘K, ⇧PageUp/⇧PageDown and ⇧Enter. ⌘C with a selection copies;
    // with NO selection it sends SIGINT — the renderer sees the key before the
    // app menu (see ./keys), so this handler, not `role:'copy'`, decides which.
    // The closures are read per keystroke, never captured: a session can be
    // renamed, and the agent it runs is what picks the ⇧Enter newline bytes.
    const sessionRow = (): Session | undefined =>
      useApp.getState().sessions.find((s) => s.id === sessionId);
    term.attachCustomKeyEventHandler(
      terminalKeyHandler(
        sessionId,
        term,
        () => sessionRow()?.tmuxName ?? '',
        scroll,
        () => multilineSequenceFor(sessionRow()?.agent ?? 'shell')
      )
    );

    const fit = new FitAddon();
    term.loadAddon(fit);
    fitRef.current = fit;
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
    // WebGL when available; on failure/context loss xterm keeps its built-in
    // DOM renderer (no @xterm/addon-canvas dependency today). Phase 28: the
    // pane logs the fallback, and on each power:resume broadcast it retries
    // the WebGL addon once if the context was lost.
    let webgl: WebglAddon | null = null;
    let webglLost = false;

    // ---- keystrokes / binary → main → pty --------------------------------
    // noteTerminalInput: every byte the user sends — including mouse reports,
    // which never reach keydown — answers whatever the session was blocked
    // on, so "needs input" clears without waiting for echo (CLAUDE.md: the
    // user's own input may never RAISE that status either). It is a cheap
    // no-op unless the session is currently reported as needing input.
    // Typing ALWAYS returns to live output first (scroll.sendInput): tmux
    // copy-mode has its own key table, so a keystroke sent while scrolled
    // would be eaten by it instead of reaching the agent.
    // Phase 67: while the session reads `unknown`, everything is dropped at
    // the source, including noteTerminalInput (see paneRefusesInput).
    const dataSub = term.onData((d) => {
      if (paneRefusesInput(statusRef.current)) return;
      useApp.getState().noteTerminalInput(sessionId);
      scroll.sendInput(d);
    });
    const binarySub = term.onBinary((d) => {
      if (paneRefusesInput(statusRef.current)) return;
      useApp.getState().noteTerminalInput(sessionId);
      scroll.sendInput(d);
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
    // If a font finishes loading AFTER the terminal opened (a bundled preset's
    // woff2 arriving late), stale atlas glyphs would keep rendering, so
    // re-apply the family and rebuild the atlas. No-op churn is cheap. This is
    // a BELT: the Phase 78 effect below is the path that also re-fits, and it
    // runs whether or not this listener fires.
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
      const attachWebgl = (): boolean => {
        try {
          const addon = new WebglAddon();
          addon.onContextLoss(() => {
            addon.dispose();
            webgl = null;
            webglRef.current = null;
            webglLost = true;
            console.warn(
              `[gmux] terminal ${sessionId}: webgl context lost, now on the DOM renderer`
            );
          });
          term.loadAddon(addon);
          webgl = addon;
          webglRef.current = addon;
          return true;
        } catch {
          webgl = null;
          webglRef.current = null;
          return false;
        }
      };
      attachWebgl();
      retryWebglRef.current = () => {
        if (disposed || !webglLost || webglRef.current !== null) return;
        if (attachWebgl()) {
          webglLost = false;
          console.log(`[gmux] terminal ${sessionId}: webgl restored after wake`);
        } else {
          console.warn(
            `[gmux] terminal ${sessionId}: webgl retry after wake failed, staying on the DOM renderer`
          );
        }
      };
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
        scroll.start();
      } catch (err) {
        if (!disposed) setOverlay(friendlyAttachError(err));
      }
    })();

    return () => {
      disposed = true;
      scroll.dispose();
      setSurface(null);
      unregister();
      container.removeEventListener('mousedown', swallowRightButton, true);
      container.removeEventListener('mouseup', swallowRightButton, true);
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
      fitRef.current = null;
      webglRef.current = null;
      retryWebglRef.current = null;
      // Kills only the attach client; the tmux session lives on.
      void gmux.sessions.detach(sessionId).catch(() => undefined);
    };
  }, [sessionId, restorable, attachEpoch]);

  useEffect(() => {
    if (focused) termRef.current?.focus();
  }, [focused, attachEpoch]);

  // ---- zoom (Phase 12.11) --------------------------------------------------
  // REAL terminal zoom: the font changes, the pane re-fits, and the new
  // cols/rows go to tmux through the SAME onResize path a window resize uses.
  // Consequences we accept and the agent sees: its viewport genuinely changes
  // and it redraws at the new width — that is what every terminal does.
  // Consequences we do NOT accept, and handle here:
  //
  //  - **The scrollbar must not drift.** 12.3 draws the thumb from tmux's own
  //    `rows`/`history`, polled once a second while live. A resize changes
  //    `rows` immediately, so without this refresh the thumb would be sized
  //    for the old geometry for up to a second. (The wheel's line height is
  //    safe by construction: metrics.ts MEASURES the cell box off the DOM on
  //    every event and never computes it from the font size.)
  //  - **A scrolled pane must keep its place.** tmux moves the copy-mode view
  //    with the reflow — measured A/B, a pane parked 40 lines back landed at
  //    30 when 42 rows became 27 — so the surface re-asserts the position
  //    once the resize lands (ScrollSurface.holdPositionAcrossResize: drift
  //    10 lines → 0).
  //  - **It must not read as activity.** A redraw is output, and Phase 13's
  //    detector would score it as `working`; main is told a geometry change
  //    happened (GmuxCore.resizeSession → activity.noteGeometryChange) and
  //    holds its verdict across the reflow.
  useEffect(() => {
    const term = termRef.current;
    const fit = fitRef.current;
    if (term === null || fit === null) return;
    const size = zoomedFontSize(terminalBaseFontSize(), zoomFactor);
    if (term.options.fontSize === size) return;
    term.options.fontSize = size;
    // The atlas is rasterized per glyph size; xterm rebuilds it on a char-size
    // change, and clearing is the same cheap belt the late-font path uses.
    try {
      webglRef.current?.clearTextureAtlas();
    } catch {
      /* renderer may have fallen back to DOM — nothing to clear */
    }
    try {
      fit.fit();
    } catch {
      /* fitting a pane with no size yet is a no-op, not an error */
    }
    surface?.refresh();
    surface?.holdPositionAcrossResize();
  }, [zoomFactor, surface, attachEpoch]);

  // ---- the work-area font preset (Phase 78) --------------------------------
  // Written as a copy of the zoom effect above, because zoom is the working
  // sibling for exactly this problem. The cell size changes, the pane re-fits,
  // and the new cols/rows reach tmux through the same onResize path a window
  // resize uses. The scrollbar refresh and the position hold are here for the
  // two reasons the zoom effect gives.
  //
  // THE ONE THING THAT IS NOT LIKE ZOOM, and it is the whole reason this is an
  // async effect. A `@font-face` is fetched only when something renders in it.
  // Assigning the family to xterm first makes xterm measure the cell and build
  // its WebGL glyph atlas in the FALLBACK face, and it stays wrong until the
  // next resize, with no error anywhere. So the face is awaited first and the
  // family is assigned second.
  //
  // One thing a reader will see and should not read as a fault. The two
  // bundled faces advance 0.6000 em where Menlo advances 0.6021, which is
  // 2.2 px over 80 columns, so at some pane widths the column count changes by
  // one when the preset changes. That is a correct re-fit, and tmux is told.
  useEffect(() => {
    const term = termRef.current;
    const fit = fitRef.current;
    if (term === null || fit === null) return;
    if (appliedFontRef.current === workAreaFont) return;
    let cancelled = false;
    void (async () => {
      await loadWorkAreaFace(
        workAreaFont,
        term.options.fontSize ?? terminalBaseFontSize()
      );
      if (cancelled) return;
      appliedFontRef.current = workAreaFont;
      // Assigned unconditionally rather than under an equality guard. The
      // `loadingdone` belt in the mount effect may have set the same string
      // already, and the geometry work below still has to run.
      term.options.fontFamily = resolveTerminalFontFamily();
      try {
        webglRef.current?.clearTextureAtlas();
      } catch {
        /* the renderer may have fallen back to DOM, so there is none */
      }
      try {
        fit.fit();
      } catch {
        /* fitting a pane with no size yet is a no-op, not an error */
      }
      surface?.refresh();
      surface?.holdPositionAcrossResize();
    })();
    return () => {
      cancelled = true;
    };
  }, [workAreaFont, surface, attachEpoch]);

  // ---- the machine woke up (Phase 19 item 11) -------------------------------
  // A WebGL texture atlas is a GPU resource, and it does not survive the GPU
  // process losing its context across a machine sleep. The pane comes back
  // drawing wrong or blank glyphs, and until now only a resize repaired it.
  //
  // This is the same handler VS Code wires in `terminalNativeContribution.ts`,
  // to the same event, calling the same public function from `@xterm/xterm@6`.
  // Main owns the event because only main receives `powerMonitor`; this
  // renderer owns the atlas. Feature-detected, so an older preload simply
  // leaves the behaviour as it was.
  useEffect(() => {
    const bridge = window.gmux as typeof window.gmux & GmuxPowerExtras;
    const subscribe = bridge.onPowerResume;
    if (typeof subscribe !== 'function') return;
    return subscribe(() => {
      // Phase 28: if the pane fell back to the DOM renderer at context loss,
      // try the WebGL addon again before repainting. One attempt per wake.
      retryWebglRef.current?.();
      const term = termRef.current;
      try {
        webglRef.current?.clearTextureAtlas();
      } catch {
        /* renderer may have fallen back to DOM — nothing to clear */
      }
      if (term !== null && term.rows > 0) term.refresh(0, term.rows - 1);
    });
  }, []);

  // Right-click anywhere in the session → the native menu (DESIGN.md §3).
  // A right click never changes what is selected (Phase 40): the option that
  // used to replace it is off in the Terminal constructor above, and the
  // selection is read ONCE here and carried to the menu. Copy, Copy as HTML
  // and Capture Selection then act on those bytes even though the item is
  // picked later, after a scrollback await and after the native menu closed.
  //
  // The React handler stays on the ancestor pane. A capture-phase contextmenu
  // swallow on the mount would also stop the event reaching React's root
  // listener, and the menu would never open at all.
  const onContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // First act, before anything moves focus or paints.
      const selection = snapshotSelection(sessionId);
      event.preventDefault();
      // xterm's own mousedown used to do this before we started swallowing
      // button 3 above. Paste (clipboard:paste → webContents.paste()) lands
      // on whatever has DOM focus, so the menu has to be opened over a
      // focused terminal or Paste would type into the editor instead.
      termRef.current?.focus();
      const session = useApp
        .getState()
        .sessions.find((s) => s.id === sessionId);
      if (session === undefined) return;
      showTerminalMenu(session, event.clientX, event.clientY, {
        splittable: !restorable && canSplit(session),
        selection
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
      {surface !== null ? <TerminalScrollbar surface={surface} /> : null}
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
      ) : status === 'unknown' ? (
        // Phase 67. The attach underneath stays mounted, so a stall that
        // resolves resumes the same view. This branch outranks the
        // attach-error overlay while the status holds: the machine condition
        // is the truer sentence, and it offers no button, because there is
        // nothing safe to retry against a server nobody has proven alive.
        // If the attach pty died during the gap, clearing the status reveals
        // the existing exit overlay with its Reconnect button.
        <div className="gmux-terminal-overlay">
          <div className="gmux-terminal-overlay-title">
            Machine unreachable
          </div>
          <div>Your sessions are untouched. Tortie just cannot see them.</div>
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
