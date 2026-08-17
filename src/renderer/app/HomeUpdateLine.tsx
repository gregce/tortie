/**
 * The home screen update line (Phase 62.1).
 *
 * The home screen and the activity bar are mutually exclusive surfaces, so
 * before this line a manual Check for Updates started with no project open
 * had nowhere to show. This is one quiet line of muted text directly under
 * the lockup. It mirrors the same four UpdateUiState fields the ring draws
 * and it draws exactly what the ring would draw, through the shared words in
 * update-words.ts.
 *
 * The renderer holds NO visibility policy here, exactly like the ring. Main
 * hides every journey the user did not start until it reaches ready
 * (src/main/updates/journey.ts), so background checks stay invisible on this
 * screen with no code in this file deciding it. A background journey that
 * reaches ready does show, because ready is always visible everywhere. That
 * decision is recorded in the Phase 62.1 spec.
 *
 * The line is NOT clickable and opens no menu. When the journey is ready,
 * the staged item under the Tortie menu carries the action. When it failed,
 * the words name the failed stage and Check for Updates in the Tortie menu
 * is the retry. No motion of any kind: research 35 section 1.12 forbids
 * motion on this screen. The slot keeps its height whether or not words are
 * showing, so the column never shifts (the top-edge rule in
 * home-screen.css).
 *
 * The bridge is the ring's own ringBridge(), reused with only its state and
 * onChanged members. An older preload without the updates extras draws
 * nothing but the empty slot.
 */

import React, { useEffect, useState } from 'react';
import type { UpdateUiState } from '@shared/ipc';
import type { RingBridge } from './UpdateRing';
import { ringBridge } from './UpdateRing';
import type { UpdateRingSnapshot } from './update-words';
import { updateStageWords } from './update-words';

/** The two bridge members this line uses. The full RingBridge satisfies it. */
export type HomeUpdateBridge = Pick<RingBridge, 'state' | 'onChanged'>;

/**
 * One state() read, then onChanged keeps the line live. A push always wins
 * over the mount read: once any push has arrived, a late first answer is
 * dropped whole, so a stale read can never overwrite a fresher event. The
 * returned disposer unsubscribes and also drops a mount read that resolves
 * after it ran. Exported as a plain function because the unit tests run in
 * a node environment where effects never fire.
 */
export function connectHomeUpdateLine(
  bridge: HomeUpdateBridge,
  set: (state: UpdateUiState) => void
): () => void {
  let alive = true;
  let pushed = false;
  void bridge.state().then(
    (s) => {
      if (alive && !pushed) set(s);
    },
    () => {
      // An unanswerable read draws nothing rather than a wrong line.
    }
  );
  const off = bridge.onChanged((s) => {
    if (!alive) return;
    pushed = true;
    set(s);
  });
  return () => {
    alive = false;
    off();
  };
}

/**
 * The presentational half, pure on its props so a test can render every
 * stage without a bridge. The slot element is ALWAYS rendered at its fixed
 * height, and only the words come and go, so the column never moves. It is
 * text only. There is no button, no handler and no menu on any path.
 * role="status" makes a screen reader announce a change once, and
 * data-stage lets the live probe read the stage without parsing words.
 */
export function HomeUpdateLineView({
  state
}: {
  state: UpdateRingSnapshot | null;
}): React.JSX.Element {
  const stage = state === null ? 'hidden' : state.ring;
  const words = state === null ? '' : updateStageWords(state);
  return (
    <p className="home-update-line" role="status" data-stage={stage}>
      {stage === 'hidden' ? '' : words}
    </p>
  );
}

/**
 * The mounted half. Renders the empty slot until main answers, and the
 * empty slot forever when the preload has no bridge.
 */
export function HomeUpdateLine(): React.JSX.Element {
  const [bridge] = useState(() => ringBridge());
  const [state, setState] = useState<UpdateUiState | null>(null);

  useEffect(() => {
    if (bridge === null) return;
    return connectHomeUpdateLine(bridge, setState);
  }, [bridge]);

  return <HomeUpdateLineView state={bridge === null ? null : state} />;
}
