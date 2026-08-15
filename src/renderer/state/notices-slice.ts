/**
 * Toasts — the one surface the store speaks to the user through.
 *
 * The SENTENCES for durability and capture notices are not here: they live
 * in ./subscriptions with the event handlers that receive those notices,
 * because a sentence and the channel it arrives on belong to one owner.
 * This slice owns only the queue and its two verbs.
 */

import type { StateCreator } from 'zustand';
import type { AppState } from './app-state';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
  sticky?: boolean;
  action?: { label: string; run: () => void };
}

export interface NoticesSlice {
  toasts: Toast[];

  toast(kind: ToastKind, text: string, opts?: Partial<Toast>): void;
  dismissToast(id: number): void;
}

let toastSeq = 1;

export const createNoticesSlice: StateCreator<AppState, [], [], NoticesSlice> = (
  set,
  get
) => ({
  toasts: [],

  toast(kind, text, opts) {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, text, ...opts }] }));
    const sticky = opts?.sticky ?? kind === 'error';
    if (!sticky) {
      setTimeout(() => get().dismissToast(id), 5_000);
    }
  },

  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  }
});
