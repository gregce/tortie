/**
 * THE AIMING VERB'S ONE GUARD, AND ITS ONE SEND (Phase 64).
 *
 * This is the only module in the product that puts a composed block of text
 * into a running agent's prompt, and every refusal that decides whether it may
 * is in `canDeliverTo` below. There is deliberately ONE such function, so the
 * negative control the phase owes has exactly one thing to remove: delete the
 * body of `canDeliverTo`, rebuild, and a foreign pane accepts the block. That
 * is what makes the refusal the guard rather than luck.
 *
 * ## What "a session Tortie launched from the agent registry" actually means
 *
 * The charter names `src/main/agents/registry.ts` as where the restriction is
 * read from, and that is half right in a way worth writing down, because the
 * next reader will look there and not find it. The registry holds
 * `LAUNCHABLE_AGENT_IDS`, which answers which ids Tortie CAN launch. It cannot
 * answer whether THIS session WAS launched. That fact lives in two other
 * places and the renderer already holds the answer to both:
 *
 *  1. **Membership in the sessions slice.** `src/main/manifest/reconstruct.ts`
 *     states the identity rule: a live session carrying neither an `@gmux-id`
 *     nor a `GMUX_SESSION_ID` is NOT OURS, it is reported as foreign so a
 *     person can see it was left alone, and there is no decision, no option
 *     and no flag that turns it into a row. So a session that is in
 *     `useApp.getState().sessions` at all is one Tortie launched, and one that
 *     is not there was never adoptable. This is the load-bearing condition.
 *  2. **The `agent` column the manifest carries**, written from the registry
 *     at create time, which `src/main/sessions/launch-plan.ts` calls the one
 *     moment the live registry is the truth. A plain shell has no agent prompt
 *     to aim, so it is refused by name.
 *
 * The registry's own `launchable` flag reaches the renderer inside the
 * `agents:list` scan, and it is read here as a THIRD condition that can only
 * ever narrow the first two. When the scan has not landed yet it is skipped
 * rather than guessed at, because `src/renderer/state/agents.ts` states the
 * rule that no decision outliving the scan may read the seed list, and the two
 * conditions above have already answered the question this one refines.
 *
 * `src/main/arch/` could not have done any of this. `build/assert-import-
 * boundaries.mjs` walls that directory off from `main/manifest/`,
 * `main/restore/` and `main/context/`, so the composer cannot see a session
 * and does not take a session id. Composition happens in main over arch data
 * alone and the guard happens here, over data the renderer already holds.
 *
 * ## Why the send is the renderer's own drop path and not a tmux paste
 *
 * Research 49 guessed tmux `load-buffer` plus `paste-buffer -p`. The tree
 * settles it the other way and this phase rules on it. `load-buffer` with
 * `paste-buffer` appears in this repository at exactly one place,
 * `src/main/machines/remote-capsule.ts`, and it is a REFUSAL rather than an
 * implementation: the bytes arrive as pane INPUT and a shell executes them.
 * The shipping path, `../terminal/drop/insert.ts`, was measured in research 16
 * section 1 and gets four things for nothing that a main-side paste would have
 * to reimplement: bracketing that tracks the pane's real mode, the
 * `noteTerminalInput` call that keeps a person's own input from raising "needs
 * input", the copy-mode cancel in the scroll surface, and the Phase 67 refusal
 * that drops everything while a session reads `unknown`.
 *
 * ## What this module never does
 *
 * It never types the payload as keystrokes. It never presses Return. It never
 * sends an image and it never sends file bytes. It sets no session's status,
 * and it writes nothing to the sessions slice at all.
 */

import type { Session } from '@shared/types';
import { effectiveStatusOf, useApp } from '../state/store';
import { useSettingsStore } from '../settings/settings-store';
import { insertBlock } from '../terminal/drop/insert';
import { focusSession, paneAccepts, sessionById } from '../terminal/drop/target';
import {
  AIM_FOREIGN_SESSION,
  AIM_NOT_AN_AGENT,
  AIM_NOT_DELIVERED,
  AIM_NO_SESSION,
  AIM_SESSION_NOT_RUNNING,
  AIM_SESSION_UNKNOWN,
  AIM_SHELL_SESSION
} from './aim-copy';

/** What the guard answers. A refusal always carries the sentence to show. */
export type AimTarget =
  | { readonly ok: true; readonly session: Session }
  | { readonly ok: false; readonly reason: string };

/**
 * MAY THIS SESSION BE AIMED AT? Four conditions, in this order.
 *
 * The order is not cosmetic. Membership is asked first because it is the one
 * that answers "is this ours", and asking a foreign id about its status would
 * read a status Tortie has no business having an opinion about.
 */
export function canDeliverTo(sessionId: string | null): AimTarget {
  if (sessionId === null || sessionId.length === 0) {
    return { ok: false, reason: AIM_NO_SESSION };
  }

  // 1. Ours, or not ours. See the header: membership in this slice IS the
  //    launched-by-Tortie proof, because a session carrying no identity stamp
  //    is never adopted into it.
  const session = sessionById(sessionId);
  if (session === null) {
    return { ok: false, reason: AIM_FOREIGN_SESSION };
  }

  // 2. An agent prompt, rather than a shell. The `agent` column was written
  //    from the registry at create time.
  if (session.agent === 'shell') {
    return { ok: false, reason: AIM_SHELL_SESSION };
  }

  // 3. The registry's own launchable answer, when the scan has landed. It can
  //    only narrow conditions 1 and 2; it is never what admits a session.
  if (!agentIsLaunchable(session.agent)) {
    return { ok: false, reason: AIM_NOT_AN_AGENT };
  }

  // 4. Running, and reachable. `paneAccepts` is the one shared reading of
  //    status every surface that writes bytes into a session already uses; it
  //    refuses exited, restorable and unknown through `effectiveStatusOf`.
  //    Reading status a second way here is exactly what its own header
  //    forbids, so this asks it rather than deciding again.
  if (!paneAccepts(session)) {
    return {
      ok: false,
      reason:
        effectiveStatusOf(session) === 'unknown'
          ? AIM_SESSION_UNKNOWN
          : AIM_SESSION_NOT_RUNNING
    };
  }

  return { ok: true, session };
}

/**
 * Does the agent table say this id is launchable?
 *
 * True when the scan has not landed, because the seed list is explicitly not
 * a thing a decision may read (src/renderer/state/agents.ts), and conditions 1
 * and 2 in `canDeliverTo` have already established that Tortie started this
 * session with this agent. The scan is asked for when the picker opens, so in
 * practice it has landed.
 */
function agentIsLaunchable(agent: string): boolean {
  const scan = useSettingsStore.getState().scan;
  if (scan === null) return true;
  const row = scan.agents.find((a) => a.id === agent);
  // An id the scan does not carry at all is one a user added and then removed
  // from `agents.json`, which is not a reason to refuse a session that is
  // running right now.
  if (row === undefined) return true;
  return row.launchable;
}

/**
 * Put a composed block into a session's prompt. ONE bracketed paste.
 *
 * It re-asks the guard rather than trusting the caller's earlier answer,
 * because a session can end while a native menu is open and the picker's
 * answer is therefore always stale by the width of that menu. The verifier's
 * attack drives exactly that shape.
 *
 * The pane is focused first, through the same `focusSession` a drop uses, so
 * the block lands in the leaf a person is looking at rather than in whichever
 * leaf of a split last held the focus ring.
 *
 * It returns what happened rather than throwing, so the caller can say one
 * sentence about it. It presses no key afterwards.
 */
export function deliverPayload(sessionId: string, text: string): AimTarget {
  const target = canDeliverTo(sessionId);
  if (!target.ok) return target;
  if (text.length === 0) {
    return { ok: false, reason: AIM_NOT_DELIVERED };
  }
  focusSession(sessionId);
  if (!insertBlock(sessionId, text)) {
    return { ok: false, reason: AIM_SESSION_NOT_RUNNING };
  }
  return target;
}

/**
 * The session the verb aims at, being the one the person is looking at.
 *
 * There is no session picker in this phase and that is deliberate. The chord's
 * whole reason for existing is that it never leaves the terminal, and a second
 * menu asking which session would put the view switch back by another name.
 */
export function aimTargetSession(): AimTarget {
  return canDeliverTo(useApp.getState().activeSession()?.id ?? null);
}
