/**
 * The live text of a tab: the Monaco working model while one exists (so an
 * unsaved edit shows through immediately), the last on-disk contents before
 * File mode has ever mounted.
 *
 * Two surfaces need exactly this and had grown the same debounced
 * subscription independently — the diff (its RIGHT side) and the markdown
 * preview (its Split source). One hook, one debounce, one place to be wrong.
 *
 * `track: false` means "this tab's text cannot change under me" — a history
 * tab, or a preview that is not live — and short-circuits to the saved
 * contents without touching the model registry at all.
 */

import { useEffect, useState } from 'react';
import { getWorkingModel } from './monaco-loader';

/** Model → consumer re-render debounce while an agent (or the user) types. */
export const MODEL_SYNC_DEBOUNCE_MS = 150;

export function useLiveTabText(
  tabId: string,
  savedContents: string,
  track: boolean
): string {
  const [modelText, setModelText] = useState<string | null>(() =>
    track ? (getWorkingModel(tabId)?.getValue() ?? null) : null
  );

  useEffect(() => {
    if (!track) {
      setModelText(null);
      return;
    }
    const model = getWorkingModel(tabId);
    setModelText(model?.getValue() ?? null);
    if (model === null) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sub = model.onDidChangeContent(() => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        setModelText(model.getValue());
      }, MODEL_SYNC_DEBOUNCE_MS);
    });
    return () => {
      if (timer !== null) clearTimeout(timer);
      sub.dispose();
    };
  }, [tabId, track]);

  return modelText ?? savedContents;
}
