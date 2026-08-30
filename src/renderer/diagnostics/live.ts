/**
 * The live subscription (Phase 170), the renderer's half of live mode.
 *
 * THE RULING THIS FILE KEEPS. The operator overrode the one capture stance
 * himself on 2026-08-30: the report may sample continuously WHILE THE TAB
 * IS VISIBLE, and it must go completely quiet the instant the tab is
 * hidden or closed. Nothing ever samples in the background. The dashboard
 * refusal survives because a person watching a diagnostics tab is a person
 * who asked.
 *
 * THE TIMER LIVES IN MAIN, NOT HERE. Main runs one tick per interval only
 * while a subscription from a visible tab is standing
 * (src/main/diagnostics/live.ts), and stops itself when the subscribing
 * window is destroyed. This class holds the renderer's end: subscribed
 * exactly while the tab is visible, unpaused and mounted, and torn down
 * synchronously the moment any of those stops being true. Tearing down
 * removes the sample listener FIRST, so a tick already in the pipe is
 * dropped rather than drawn, then tells main to stop. After teardown this
 * end holds no listener, no timer of its own (it never has one) and makes
 * no further channel call. The unit suite drives the hide ten times over,
 * the way the Phase 163 teardown proof was driven.
 *
 * The bridge surface is injected so the suite can count every call without
 * a browser.
 */

import type { DiagnosticsLiveSample, DiagnosticsLiveStartResult } from '@shared/ipc';

export interface LiveSubscriptionDeps {
  /** Ask main to start ticking. Visible false is a refusal, not a deferral. */
  liveStart(visible: boolean): Promise<DiagnosticsLiveStartResult>;
  /** Ask main to stop ticking. Idempotent on main's side. */
  liveStop(): Promise<unknown>;
  /** Listen for samples. Answers the unsubscribe. */
  onLiveSample(cb: (sample: DiagnosticsLiveSample) => void): () => void;
  /** Deliver one sample to the face. */
  onSample(sample: DiagnosticsLiveSample): void;
  /**
   * Optional. Called when the subscription comes to stand; answers the
   * disarm, called in the same synchronous teardown that removes the
   * listener. The tab arms its long task observer here, so the observer
   * exists exactly as long as the subscription and not one tick longer.
   */
  arm?(): () => void;
}

export class LiveSubscription {
  private readonly deps: LiveSubscriptionDeps;
  private unsubscribe: (() => void) | null = null;
  private disarm: (() => void) | null = null;
  private visible = false;
  private paused = false;
  private held = false;
  private disposed = false;

  constructor(deps: LiveSubscriptionDeps) {
    this.deps = deps;
  }

  /** True while the sample listener is standing. The quiet proof reads it. */
  get subscribed(): boolean {
    return this.unsubscribe !== null;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.update();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.update();
  }

  /**
   * A manual capture is running. The subscription stands down for exactly
   * that long, so main's one capture window is never shared between a tick
   * and the capture, which used to hand the face a report over a window a
   * few milliseconds wide. Released, the subscription comes back on its own.
   */
  setHeld(held: boolean): void {
    this.held = held;
    this.update();
  }

  /** The tab closed. Quiet now and forever. */
  dispose(): void {
    this.disposed = true;
    this.update();
  }

  private update(): void {
    const should = this.visible && !this.paused && !this.held && !this.disposed;
    if (should && this.unsubscribe === null) {
      this.unsubscribe = this.deps.onLiveSample((sample) => {
        this.deps.onSample(sample);
      });
      this.disarm = this.deps.arm?.() ?? null;
      void this.deps.liveStart(true).catch(() => undefined);
    } else if (!should && this.unsubscribe !== null) {
      // The listener goes first, synchronously, so a tick already in the
      // pipe lands on nobody. Then main is told to put its timer down.
      const un = this.unsubscribe;
      this.unsubscribe = null;
      un();
      const disarm = this.disarm;
      this.disarm = null;
      disarm?.();
      void this.deps.liveStop().catch(() => undefined);
    }
  }
}
