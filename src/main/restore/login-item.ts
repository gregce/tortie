/**
 * 'Launch gmux at login' — the T3 trigger (FINAL-REPORT §2.4 Step 3.1).
 *
 * Electron's app.setLoginItemSettings uses SMAppService on macOS 13+, which
 * registers gmux.app itself as the login item. That matters for TCC: gmux
 * spawns the tmux server as its own child, so the whole restored agent tree
 * is attributed to gmux.app (the cmux failure mode — research 09 §C.2).
 *
 * The setter returns the OS-read-back state, not the request — System
 * Settings > Login Items can refuse silently, and the UI must show truth.
 */

import { app } from 'electron';

export interface LoginItemState {
  openAtLogin: boolean;
}

export function getLoginItemState(): LoginItemState {
  try {
    return { openAtLogin: app.getLoginItemSettings().openAtLogin };
  } catch {
    return { openAtLogin: false };
  }
}

export function setLoginItemState(openAtLogin: boolean): LoginItemState {
  app.setLoginItemSettings({ openAtLogin });
  // Readback — macOS may decline (MDM policy, unsigned build, user veto).
  return getLoginItemState();
}
