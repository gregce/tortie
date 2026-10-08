/**
 * Settings → Phone (Phase 316.1; rewritten for Phase 330, build/p330/SPEC.md
 * §4.10; laid out in three steps by Phase 333.1, build/p3331/SPEC.md §5.4).
 *
 * The one surface that switches the door on, pairs a phone with it and takes a
 * phone away. Top to bottom, and nothing else:
 *
 *   1. "Let my phone reach this Mac" and its switch, with ONE caption that
 *      never changes: what each side needs (D1).
 *   2. THE THREE STEPS (Phase 333.1): Tailscale on this Mac, Publish this Mac,
 *      Pair your phone. Each says where it stands on the right, and the step
 *      that waits on the person has one button, with a quiet Try again beside
 *      it while Tailscale is waited on (his ruling 3). `phone/steps.ts`
 *      composes the faces from main's predicates and `phone/StepsCard.tsx`
 *      draws the frame; this file fills the bodies.
 *      - Step 2 draws, whenever the door's details are not the ones a person
 *        agreed to, TODAY'S CONFIRM BLOCK, whole and at rest (his ruling 2):
 *        the lines to read, both warnings, and Allow. Those lines name the
 *        internet, the tailnet, the public port and the program that publishes
 *        it, so nothing starts until a person has read them (CLAUDE.md refusal
 *        8). While Tailscale waits on its own approval page, Approve in
 *        Tailscale.
 *      - Step 3 is the pair card: on a first setup the code shows by itself
 *        once the door answers and the name is live (D17); with a phone
 *        paired, ONE Pair button, which turns the door on when it is off. The
 *        code, the time it has left, the fingerprint to match on the phone,
 *        the lines, and Allow. While the Mac's name is not yet on the internet
 *        (Phase 332), the check: a dot per name server (Phase 332.1).
 *   3. The phones, each with Remove.
 *   4. Alerts (Phase 316.5, research 136): the Apple push key row, Choose…
 *      (the file panel opens IN MAIN) and Forget, and the caption that only
 *      Tortie's publisher can send alerts for now; then, ONLY while a key is
 *      kept or the alerts are already on, Phase 314's alert switch and the
 *      push's standing sentence under it. Alerts are the key holder's alone,
 *      so a Mac with no key shows no switch and promises no alert.
 *
 * COMING BACK TO THE WINDOW CHECKS AGAIN BY ITSELF (D16): the section hears a
 * return through the one `onWindowLooked` helper and asks main, which reads
 * Tailscale only while its own `rechecks` says a read could now see the step
 * finished. No timer and no poll.
 *
 * THERE IS NO KEY FIELD (Phase 330): the phone never joins the tailnet, so
 * there is no tailnet key to paste, no grant to copy and no policy to narrow.
 * Two shut disclosures hold what a person needs once (What’s this? on step 1,
 * What this allows while Tailscale's page is waited on), and the confirm at
 * Allow is never inside one.
 *
 * JUST ENOUGH WORDS (CLAUDE.md UI rule). The resting face is labels and one
 * line each. Every sentence of explanation is main's, from the shared contract.
 * The sheet draws no link: every address is words, and every page it opens is
 * main's to open on a press.
 *
 * WHY THERE ARE TWO EXPORTS, on MachinesSection's precedent. `PhoneView` draws,
 * and takes everything it draws as a prop, so the unit tests can render it on
 * a server with no bridge. `PhoneSection` reads the bridge and hands it over.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  POCKET_CONFIRM_WARNING,
  POCKET_FUNNEL_APPROVAL,
  POCKET_FUNNEL_APPROVAL_ELSEWHERE,
  POCKET_FUNNEL_RIGHT_WARNING,
  POCKET_NAME_ROUND_RULE,
  POCKET_NAME_SENTENCES,
  POCKET_NAME_WAIT_NOTE,
  POCKET_SETUP_LINE,
  POCKET_DOOR_HONESTY,
  type PocketNameAnswer,
  type PocketNameProgress,
  type PocketPairingOffer,
  type PocketPairingView,
  type PocketSetupAction,
  type PocketStatus
} from '@shared/ipc';
import { PUSH_PUBLISHER_ONLY, PUSH_TOKEN_STOPPED } from '@shared/push-copy';
import { gmuxBridge } from '../bridge';
import { onWindowLooked } from '../machines/remote-writes';
import { errorText } from '../state/errors';
import { Qr } from './phone/Qr';
import { StepsCard } from './phone/StepsCard';
import {
  BTN_COPY_LINK,
  BTN_GET_TAILSCALE,
  BTN_OPEN_TAILSCALE_APP,
  DOOR_NOT_LISTENING,
  DOOR_OPENING,
  checklistOf,
  doorListening,
  doorMayRetry,
  doorNeedsConfirm,
  type PairingStage,
  type StepFace,
  type StepPiece
} from './phone/steps';
import { Switch } from './Switch';
import './phone-section.css';

// Moved to phone/steps.ts with unchanged bodies (Phase 333.1, D19) and
// re-exported here, so every reader of this module keeps working.
export { DOOR_NOT_LISTENING, DOOR_OPENING, doorListening, doorMayRetry, doorNeedsConfirm, type PairingStage };

// ---------------------------------------------------------------------------
// The words this surface owns. Every other sentence it draws is main's. A word
// the phone quotes (`ios/Tortie/Style/Copy.swift`, `/// Names:` and `/// Mac:`)
// must not move by a byte: PHONE_TITLE, BTN_PAIR, BTN_TRY_AGAIN, CODE_EXPIRED,
// BTN_REMOVE, BTN_CANCEL, ALERTS_GROUP, and since Phase 333.1 BTN_ALLOW. The
// steps' own words, which the phone does not quote, are phone/steps.ts's.
// ---------------------------------------------------------------------------

export const PHONE_TITLE = 'Phone';
export const DOOR_LABEL = 'Let my phone reach this Mac';
export const BTN_ALLOW = 'Allow';
export const BTN_TRY_AGAIN = 'Try again';
/**
 * The approval page's button (Phase 330), whose words became "Approve in
 * Tailscale" in Phase 333.1 (D14): the page asks Tailscale's OK, once. The
 * name keeps its role, because `probe:p330` picks it by name. The button that
 * opens the Tailscale app is phone/steps.ts's `BTN_OPEN_TAILSCALE_APP`.
 */
export const BTN_OPEN_TAILSCALE = 'Approve in Tailscale';

export const BTN_PAIR = 'Pair';
export const BTN_CANCEL = 'Cancel';
export const QR_LABEL = 'Pairing code';
/**
 * Beside the code (Phase 333.2, research 136 §5; two lines since Phase 333.1):
 * what to do with it, and where the phone app comes from. Words only, never a
 * link, a button or a badge. tortie.sh/iphone is the site's redirect, which
 * 333.7 makes on launch day; no Mac release carries this line before it.
 */
export const SCAN_LINE = 'Scan with Tortie on your iPhone.';
export const GET_PHONE_APP = 'Get it at tortie.sh/iphone.';
/** Research 132 §7.7: the code is a way in for anybody who sees it in time. */
export const CODE_PRIVATE = 'Do not show this code on a shared screen.';
export const MATCH_LABEL = 'Match this on your iPhone';
export const CODE_EXPIRED = 'The code expired. Nothing was paired.';
/**
 * His measurement (SPEC M5): the first time Tailscale publishes the door, the
 * Mac's public name took about eight minutes to reach a resolver, and the
 * window is three. Said when a code shuts with nobody presenting and it was
 * shown while the name could not be confirmed (Phase 332): a code shown after
 * the name answered is not a first scan that met a missing name.
 */
export const CODE_FIRST_NAME =
  'The first time, your Mac’s name can take several minutes to reach your phone. Press Pair again.';

// The Mac's name check, drawn (Phase 332.1, build/p3321/SPEC.md §5.5.2):
// labels only. Its two sentences of explanation, the block's hover and the
// quiet line's, are main's, from the shared contract.

/** The moving line while the name is checked. */
export const NAME_PUBLISHING = 'Publishing your Mac’s name';
/** The moving line once main confirmed the name. */
export const NAME_LIVE = 'Your Mac’s name is live';
/** The quiet line while a round is out, or due. */
export const NAME_CHECKING_NOW = 'checking now';
/** Each dot's hover: what that name server answered in the last round. */
export const NAME_DOT_WORDS: Readonly<Record<PocketNameAnswer, string>> = {
  record: 'Sees your Mac’s name',
  negative: 'Not there yet',
  unreadable: 'Did not answer'
};

/** The next check is said in steps of this, rounded up, so the line moves calmly. */
const NAME_NEXT_STEP_MS = 5_000;
const MINUTE_MS = 60_000;

/** `3 of 4 see it`. */
export function nameSeeing(seeing: number, asked: number): string {
  return `${String(seeing)} of ${String(asked)} see it`;
}

/** `3 of 4 name servers see your Mac’s name`: the dot row's label. */
export function nameDotsLabel(seeing: number, asked: number): string {
  return `${String(seeing)} of ${String(asked)} name servers see your Mac’s name`;
}

/** `checking again in 40 s`, rounded UP to 5 s; `checking now` at 0 or less. */
export function nameNextIn(ms: number): string {
  if (!(ms > 0)) return NAME_CHECKING_NOW;
  return `checking again in ${String(Math.ceil(ms / NAME_NEXT_STEP_MS) * (NAME_NEXT_STEP_MS / 1000))} s`;
}

/**
 * `2 min`, whole minutes floored, or null under a minute: `0 min` says nothing
 * true and `1 min` something false (build/p3321/SPEC.md §3 row 14).
 */
export function nameElapsed(ms: number): string | null {
  return ms >= MINUTE_MS ? `${String(Math.floor(ms / MINUTE_MS))} min` : null;
}

/** `Took 8 min`, or `Took under a minute`. */
export function nameTook(ms: number): string {
  const elapsed = nameElapsed(ms);
  return elapsed === null ? 'Took under a minute' : `Took ${elapsed}`;
}

/**
 * The quiet line while the check runs: how long it has run (from a minute on)
 * and when it asks next, joined by the house separator, its first letter
 * upper-cased. `nextInMs` null is a round out: `checking now`.
 */
export function nameTimeLine(elapsedMs: number, nextInMs: number | null): string {
  const parts = [nameElapsed(elapsedMs), nextInMs === null ? NAME_CHECKING_NOW : nameNextIn(nextInMs)];
  const line = parts.filter((part): part is string => part !== null).join(' · ');
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** Everything the name check's block draws, composed once. */
export interface NameCardWords {
  readonly state: 'checking' | 'live' | 'unreadable';
  /** The moving line. */
  readonly line: string;
  /** The quiet line. */
  readonly time: string;
  /** The dots, in the order the servers were asked. */
  readonly answers: readonly PocketNameAnswer[];
  /** A round is out: the dots breathe once. */
  readonly asking: boolean;
}

/**
 * The block's words for a status, its progress and the seconds since main
 * sent it (`ageMs`, on the renderer's own clock). While the check runs the age
 * moves the elapsed time on and the next check down; once main confirmed the
 * name the block is frozen and the age is ignored.
 */
export function nameCardWords(status: PocketStatus, progress: PocketNameProgress, ageMs: number): NameCardWords {
  const answers = progress.answers;
  const asking = progress.asking;
  if (status.nameCheck === 'confirmed') {
    return { state: 'live', line: NAME_LIVE, time: nameTook(progress.elapsedMs), answers, asking };
  }
  const age = ageMs > 0 ? ageMs : 0;
  const time = nameTimeLine(
    progress.elapsedMs + age,
    asking || progress.nextInMs === null ? null : progress.nextInMs - age
  );
  if (status.nameCheck === 'unreadable') {
    return { state: 'unreadable', line: POCKET_NAME_SENTENCES.unreadable, time, answers, asking };
  }
  const seeing = answers.filter((answer) => answer === 'record').length;
  const line = answers.length === 0 ? NAME_PUBLISHING : `${NAME_PUBLISHING} · ${nameSeeing(seeing, answers.length)}`;
  return { state: 'checking', line, time, answers, asking };
}

export const PHONES_GROUP = 'Phones';
export const NO_PHONES = 'No phone yet.';
export const PHONES_DROPPED = 'Phones paired before this version must pair again.';
export const BTN_REMOVE = 'Remove';
export const ALERTS_ON_CHIP = 'Alerts on';

export const ALERTS_GROUP = 'Alerts';
export const PUSH_LABEL = 'Alert my phone when a session waits';
export const PUSH_CAPTION = 'Sent through Apple. Never what it asks.';

/**
 * The Apple push key's row (Phase 316.5). ALWAYS drawn once main has answered,
 * FIRST in the Alerts card, because the key comes before the switch (research
 * 136: alerts are his alone, since only the Mac that holds the phone app's key
 * can send). With no key it is the whole card: a label, `Not chosen.` and
 * Choose…, which promises nothing.
 */
export const PUSH_KEY_LABEL = 'Apple push key';
export const PUSH_KEY_NONE = 'Not chosen.';
export const BTN_CHOOSE_KEY = 'Choose…';
export const BTN_FORGET_KEY = 'Forget';

/** `Key 6782V6SJJ7`: Apple's own id, which is public, never the key. */
export function pushKeyChosen(keyId: string): string {
  return `Key ${keyId}`;
}

export const BRIDGE_MISSING = 'Phone is not available in this build.';

/** `Paired with <the label the phone presented>.` */
export function pairedWith(label: string): string {
  return `Paired with ${label}.`;
}

/** `Shuts in 2:41`, never below `0:00`. */
export function shutsIn(msLeft: number): string {
  const seconds = Math.max(0, Math.ceil(msLeft / 1000));
  const minutes = Math.floor(seconds / 60);
  return `Shuts in ${String(minutes)}:${String(seconds % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// What the sheet decides, as pure functions the tests drive
// ---------------------------------------------------------------------------

/**
 * One line after a pairing ended. `phoneId` is the phone a "Paired with" line
 * names, and the line is drawn only while that phone is still paired, so a
 * Remove never leaves it standing (316.4 owed item 1). Null for a line about
 * no phone.
 */
export interface PhoneNotice {
  readonly text: string;
  readonly phoneId: string | null;
}

/** The notice to draw right now, or null. */
export function noticeToDraw(notice: PhoneNotice | null, status: PocketStatus | null): string | null {
  if (notice === null) return null;
  if (notice.phoneId === null) return notice.text;
  return status?.phones.some((p) => p.id === notice.phoneId) === true ? notice.text : null;
}

/**
 * The line a code that shut with nothing paired earns: the expiry, and, when
 * nobody presented and the code was shown while main could not confirm the
 * Mac's name (`shownUnreadable`, Phase 332), why a first scan can fail.
 */
export function expiredNotice(shownUnreadable: boolean, presented: boolean): PhoneNotice {
  const firstName = !presented && shownUnreadable;
  return { text: firstName ? `${CODE_EXPIRED} ${CODE_FIRST_NAME}` : CODE_EXPIRED, phoneId: null };
}

/**
 * Which of the six faces the pairing card wears (the type is phone/steps.ts's
 * since Phase 333.1, D19). `naming`: the door answers and main says a code may
 * not show yet, because the Mac's name is not on the internet (Phase 332).
 */
export function pairingStage(
  status: PocketStatus | null,
  offer: PocketPairingOffer | null,
  view: PocketPairingView | null,
  now: number
): PairingStage {
  if (view?.state === 'presented') return 'match';
  if (offer !== null && now < offer.expiresAt && view?.state === 'waiting') {
    return 'showing';
  }
  if (status === null) return 'waiting';
  if (status.state === 'off') return 'start';
  if (status.state !== 'listening') return 'waiting';
  // MAIN'S ONE PREDICATE (Phase 332), never worked out here.
  return status.pairable ? 'ready' : 'naming';
}

/**
 * Where "pair after Allow" stands (SPEC §4.10). `pressed`: the code was asked
 * for (Pair with the door off; since Phase 333.1 also the switch's on press
 * and Try again while no phone is paired, D17), and main has not yet answered
 * with the door on. `on`: the door is on and the sheet is waiting for it to
 * answer. `no`: nothing.
 */
export type PairAfterAllow = 'no' | 'pressed' | 'on';

/**
 * The next step of "pair after Allow" for a status main pushed, and whether
 * to ask for the code NOW. The code is asked for ONCE, when a push shows main
 * will show one (`pairable`, Phase 332): a door that answers while its name is
 * checked keeps the wish. The wish is dropped when the door goes off after it
 * was on, or when a start is refused with nothing more coming (no lines to
 * Allow, and, since Phase 333.1, no return main would check again: while
 * `rechecks` holds, coming back to the window after fixing Tailscale goes on
 * by itself, so the code still shows by itself, D17).
 */
export function pairAfterAllowNext(
  phase: PairAfterAllow,
  status: PocketStatus | null
): { phase: PairAfterAllow; pair: boolean } {
  if (phase === 'no' || status === null) return { phase, pair: false };
  if (phase === 'pressed' && status.state === 'off') return { phase, pair: false };
  if (status.pairable) return { phase: 'no', pair: true };
  if (status.state === 'off') return { phase: 'no', pair: false };
  if (status.state === 'refused' && !doorNeedsConfirm(status) && !status.rechecks) return { phase: 'no', pair: false };
  return { phase: 'on', pair: false };
}

/**
 * True while a press that asked for the code waits for main's answer to it
 * (Phase 333.1, D17): the wish was just set, and the status is still the one
 * {@link pairAfterAllowNext} last judged, drawn BEFORE the press. Try again is
 * pressed over a refusal, and that refusal says nothing about the press, so
 * judged again it would drop the wish the press just set, before main had
 * read anything. Main answers an on press at once, with the door opening, and
 * that answer is the first status the wish is judged by.
 */
export function wishAwaitsAnswer(
  phase: PairAfterAllow,
  status: PocketStatus | null,
  judged: PocketStatus | null
): boolean {
  return phase === 'pressed' && status === judged;
}

/**
 * True when the name check's block is drawn (Phase 332.1, build/p3321/SPEC.md
 * §5.5.1). On the naming face whenever main sends a progress. On the ready
 * face, above Pair, only when main opened Pair without a confirmation, or
 * confirmed the name while this section watched the wait (`watched`), so a
 * later visit shows Pair alone, today's resting face. Never on another face.
 * It draws; Pair is still `pairable` alone, and nothing here decides it.
 */
export function nameBlockShown(status: PocketStatus | null, stage: PairingStage, watched: boolean): boolean {
  if (status === null || status.nameProgress === null) return false;
  if (stage === 'naming') return true;
  if (stage !== 'ready') return false;
  return status.nameCheck === 'unreadable' || (watched && status.nameCheck === 'confirmed');
}

/**
 * Whether this section watched the wait, after a status: set by the naming
 * face with a progress, cleared once a code shows or the door is off, and
 * otherwise kept, for the one mount.
 */
export function nameWatchedNext(watched: boolean, stage: PairingStage, status: PocketStatus | null): boolean {
  if (stage === 'naming' && status !== null && status.nameProgress !== null) return true;
  if (stage === 'showing' || stage === 'start') return false;
  return watched;
}

/**
 * Whether the block's one-second tick runs: only while the block is drawn and
 * the check still runs. A confirmed block is frozen and needs no clock.
 */
export function nameTicking(status: PocketStatus | null, stage: PairingStage, watched: boolean): boolean {
  return status !== null && nameBlockShown(status, stage, watched) && status.nameCheck !== 'confirmed';
}

/**
 * True when the alert switch is drawn: a key is kept, or the alerts are
 * already on (Phase 316.5, research 136). A Mac with no key shows no switch,
 * because it cannot send; alerts left on by an earlier version still show it,
 * so it can be turned off.
 */
export function pushSwitchShown(status: PocketStatus): boolean {
  return status.pushKeyId !== null || status.pushAlerts;
}

/**
 * True when this Mac can send an alert: the switch on, the door's fields the
 * ones a person confirmed, and a key kept (main's `alertsCanSend`, read from
 * the status). A phone's `Alerts on` is drawn only then (the 316.5 fix round:
 * a phone holding a token read `Alerts on` after the key was forgotten or the
 * switch turned off, which research 136 forbids: no copy promises alerts).
 */
export function alertsReachPhones(status: PocketStatus): boolean {
  return status.pushAlerts && status.confirmState === 'confirmed' && status.pushKeyId !== null;
}

/**
 * True when `next` differs from `prev` in exactly one line, in place.
 *
 * Turning the alerts OFF moves a hashed field, and Phase 314 ruled that the
 * sheet confirms that narrowing in the same press (build/p314/SPEC.md section
 * 1.1 row 2). The sheet does so ONLY when the door was agreed to before the
 * press and the switch's line is the one line that moved, so a press can never
 * carry an agreement to anything a person did not already agree to.
 */
export function onlyOneLineMoved(
  prev: readonly string[],
  next: readonly string[]
): boolean {
  if (prev.length !== next.length) return false;
  let moved = 0;
  for (let i = 0; i < prev.length; i += 1) {
    if (prev[i] !== next[i]) moved += 1;
  }
  return moved === 1;
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export interface PhoneViewProps {
  /** False when this build's preload has no pocket surface. */
  supported: boolean;
  /** Null until the first read answers. */
  status: PocketStatus | null;
  /** The open code, or null. Its payload is drawn only as modules. */
  offer: PocketPairingOffer | null;
  view: PocketPairingView | null;
  /** Epoch ms, for the time the code has left. */
  now: number;
  /**
   * How long ago main sent `status`, on the renderer's own monotonic clock
   * (Phase 332.1): moves the name check's elapsed time on and its next check
   * down between pushes.
   */
  nameAgeMs: number;
  /** This section watched the name check's wait (see {@link nameBlockShown}). */
  nameWatched: boolean;
  /** One line after a pairing ended: paired, or expired. */
  notice: PhoneNotice | null;
  /** Main's sentence for the last press that was refused. */
  error: string | null;
  busy: boolean;
  /**
   * The code was asked for in this section and is on its way (Phase 333.1,
   * D17), so a first setup's ready face draws no Pair.
   */
  wished: boolean;
  onSetDoor(on: boolean): void;
  onConfirmDoor(): void;
  onRetryDoor(): void;
  onOpenApproval(): void;
  /** One setup press main listed (Phase 333.1, D12): main acts, or does nothing. */
  onSetupAction(action: PocketSetupAction): void;
  /** Pair: with the door off, turn it on and pair once it answers. */
  onPair(): void;
  onCancelPairing(): void;
  onAllowPhone(): void;
  onRemovePhone(phoneId: string): void;
  onSetPushAlerts(on: boolean): void;
  /** Choose…: main opens the file panel, reads the key and keeps it (Phase 316.5). */
  onChooseKey(): void;
  onForgetKey(): void;
}

function Lines({ lines }: { lines: readonly string[] }): React.JSX.Element {
  return (
    <ul className="set-config-lines">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function PairButton(props: { busy: boolean; onPair(): void }): React.JSX.Element {
  return (
    <div className="set-config-actions">
      <button
        type="button"
        className="btn btn-primary"
        disabled={props.busy}
        data-phone-action="pair"
        onClick={props.onPair}
      >
        {BTN_PAIR}
      </button>
    </div>
  );
}

/**
 * The Mac's name check, drawn (Phase 332.1, build/p3321/SPEC.md §5.5.3): a dot
 * per name server beside the moving line, and the quiet line under it. Both
 * rows keep their height and the dot slot its width whatever they say (the
 * Phase 174.1 rule), so nothing above Pair moves when Pair appears below.
 */
function NameCheck(props: {
  status: PocketStatus;
  progress: PocketNameProgress;
  ageMs: number;
  /** The naming face: the block's hover says why Pair is not here yet. */
  titled: boolean;
}): React.JSX.Element {
  const words = nameCardWords(props.status, props.progress, props.ageMs);
  const answered = words.answers.length > 0;
  const seeing = words.answers.filter((answer) => answer === 'record').length;
  return (
    <div
      className="phone-name"
      data-phone-name
      data-phone-name-state={words.state}
      title={props.titled ? POCKET_NAME_SENTENCES.checking : undefined}
    >
      <div className="phone-name-row">
        <span
          className="phone-name-dots"
          data-phone-name-dots
          data-asking={words.asking ? 'true' : 'false'}
          role={answered ? 'img' : undefined}
          aria-label={answered ? nameDotsLabel(seeing, words.answers.length) : undefined}
          aria-hidden={answered ? undefined : true}
        >
          {words.answers.map((answer, i) => (
            // Positional: the i-th dot is the i-th server asked.
            <span key={String(i)} className="phone-name-dot" data-answer={answer} title={NAME_DOT_WORDS[answer]} />
          ))}
        </span>
        <p
          className="phone-line"
          data-phone-name-line
          aria-live="polite"
          data-phone-name-unreadable={words.state === 'unreadable' ? true : undefined}
        >
          {words.line}
        </p>
      </div>
      <p
        className="phone-name-time"
        data-phone-name-time
        title={words.state === 'live' ? undefined : POCKET_NAME_ROUND_RULE}
      >
        {words.time}
      </p>
    </div>
  );
}

/** The props a step's body is filled from: the view's, its stage, and the face. */
interface StepBodyProps extends PhoneViewProps {
  stage: PairingStage;
}

/**
 * Step 3's body (Phase 333.1, §5.4.4): today's pair card, `[data-phone-stage]`
 * with today's six values. `pair`: whether the start or the ready face draws
 * Pair, the composer's answer (D17).
 */
function PairCard(props: StepBodyProps & { pair: boolean }): React.JSX.Element {
  const { status, offer, view, now, busy, stage } = props;
  const notice = noticeToDraw(props.notice, status);
  // The name check's block, the first thing after the notice on the naming
  // and the ready faces alike (Phase 332.1).
  const progress = nameBlockShown(status, stage, props.nameWatched) ? (status?.nameProgress ?? null) : null;
  const nameBlock =
    status === null || progress === null ? null : (
      <NameCheck status={status} progress={progress} ageMs={props.nameAgeMs} titled={stage === 'naming'} />
    );
  // ONE MORE LINE UNDER THE BLOCK (Phase 333.1, D14), drawn for exactly as
  // long as the block is, so nothing above Pair moves when Pair appears.
  const nameNote =
    nameBlock === null ? null : (
      <p className="phone-line" data-phone-name-note>
        {POCKET_NAME_WAIT_NOTE}
      </p>
    );

  if (stage === 'match' && view !== null) {
    return (
      <div className="phone-block" data-phone-stage="match">
        <div className="set-row-label">{view.label}</div>
        <div className="phone-match-label">{MATCH_LABEL}</div>
        <div className="phone-fingerprint" data-phone-fingerprint>
          {view.fingerprint}
        </div>
        {view.expiresAt === null ? null : (
          <p className="phone-countdown" data-phone-countdown>
            {shutsIn(view.expiresAt - now)}
          </p>
        )}
        <Lines lines={view.lines} />
        <p className="set-config-warning">{view.warning}</p>
        <div className="set-config-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || view.hash === null}
            data-phone-action="allow-phone"
            onClick={props.onAllowPhone}
          >
            {BTN_ALLOW}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            data-phone-action="cancel-pairing"
            onClick={props.onCancelPairing}
          >
            {BTN_CANCEL}
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'showing' && offer !== null) {
    return (
      <div className="phone-block phone-showing" data-phone-stage="showing">
        <Qr payload={offer.payload} label={QR_LABEL} />
        <div className="phone-qr-side">
          <p className="phone-line">{SCAN_LINE}</p>
          <p className="phone-line" data-phone-get-app>
            {GET_PHONE_APP}
          </p>
          <p className="phone-line">{CODE_PRIVATE}</p>
          <p className="phone-countdown" data-phone-countdown>
            {shutsIn(offer.expiresAt - now)}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            data-phone-action="cancel-pairing"
            onClick={props.onCancelPairing}
          >
            {BTN_CANCEL}
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'waiting') {
    // The door is on and not answering: steps 1 and 2 say why (Phase 333.1).
    return (
      <div className="phone-block" data-phone-stage="waiting">
        {notice === null ? null : <p className="phone-notice">{notice}</p>}
      </div>
    );
  }

  if (stage === 'naming') {
    return (
      <div className="phone-block" data-phone-stage="naming">
        {notice === null ? null : <p className="phone-notice">{notice}</p>}
        {nameBlock ?? <p className="phone-line">{POCKET_NAME_SENTENCES.checking}</p>}
        {nameNote}
      </div>
    );
  }

  // `start` (the door is off) and `ready` (it is answering) wear ONE Pair
  // button when the composer says so; what it does is the connected
  // section's to decide. `ready` over a name main could not confirm says so
  // above it, inside the name check's block when there is one (Phase 332.1).
  return (
    <div className="phone-block" data-phone-stage={stage}>
      {notice === null ? null : <p className="phone-notice">{notice}</p>}
      {nameBlock ??
        (stage === 'ready' && status?.nameCheck === 'unreadable' ? (
          <p className="phone-line" data-phone-name-unreadable>
            {POCKET_NAME_SENTENCES.unreadable}
          </p>
        ) : null)}
      {nameNote}
      {props.pair ? <PairButton busy={busy || status === null} onPair={props.onPair} /> : null}
    </div>
  );
}

function ApprovalBlock({
  status,
  busy,
  onOpenApproval
}: {
  status: PocketStatus;
  busy: boolean;
  onOpenApproval(): void;
}): React.JSX.Element | null {
  if (status.funnel.state !== 'approval') return null;
  if (status.funnel.approvalOpens) {
    return (
      <div className="phone-block" data-phone-approval>
        <p className="phone-line">{POCKET_FUNNEL_APPROVAL}</p>
        <div className="set-config-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            data-phone-action="open-approval"
            onClick={onOpenApproval}
          >
            {BTN_OPEN_TAILSCALE}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="phone-block" data-phone-approval>
      <p className="phone-line">{POCKET_FUNNEL_APPROVAL_ELSEWHERE}</p>
      {status.funnel.approvalText === null ? null : (
        // Selectable TEXT, never a link: Tortie does not open this page.
        <p className="phone-mono phone-selectable" data-phone-approval-text>
          {status.funnel.approvalText}
        </p>
      )}
    </div>
  );
}

/**
 * The setup presses' faces (Phase 333.1, §5.4.1, §5.4.8): each word, its hook,
 * and whether it is the step's one button. Drawn only for a press main listed.
 */
const SETUP_BUTTONS: Readonly<Record<PocketSetupAction, { words: string; hook: string; primary: boolean }>> = {
  'get-tailscale': { words: BTN_GET_TAILSCALE, hook: 'get-tailscale', primary: true },
  'open-tailscale': { words: BTN_OPEN_TAILSCALE_APP, hook: 'open-tailscale', primary: true },
  'copy-admin-link': { words: BTN_COPY_LINK, hook: 'copy-link', primary: false }
};

/** One press of a step's actions row, or null for a piece that is not a press. */
function stepAction(props: StepBodyProps, piece: StepPiece, key: string): React.JSX.Element | null {
  const { busy } = props;
  if (piece.kind === 'setup-button') {
    const face = SETUP_BUTTONS[piece.action];
    return (
      <button
        key={key}
        type="button"
        className={face.primary ? 'btn btn-primary' : 'btn btn-secondary'}
        disabled={busy}
        data-phone-action={face.hook}
        onClick={() => props.onSetupAction(piece.action)}
      >
        {face.words}
      </button>
    );
  }
  if (piece.kind === 'try-again-quiet' || piece.kind === 'try-again') {
    // Try again is the switch's own press again: it reads Tailscale and
    // records no agreement. Quiet beside a step's one button while Tailscale
    // is waited on (his ruling 3).
    return (
      <button
        key={key}
        type="button"
        className={piece.kind === 'try-again-quiet' ? 'set-inline-btn' : 'btn btn-secondary'}
        disabled={busy}
        data-phone-action="retry-door"
        onClick={props.onRetryDoor}
      >
        {BTN_TRY_AGAIN}
      </button>
    );
  }
  return null;
}

/** One piece of a step's body that is not a press. */
function stepPiece(props: StepBodyProps, piece: StepPiece, key: string): React.JSX.Element | null {
  const { status, busy } = props;
  switch (piece.kind) {
    case 'line':
      return (
        <p key={key} className="phone-line">
          {piece.text}
        </p>
      );
    case 'disclosure':
      // The house disclosure, SHUT (§5.4.1). Never the confirm block's home.
      return (
        <details
          key={key}
          className="set-disclosure"
          data-phone-whats-this={piece.which === 'whats-this' ? true : undefined}
          data-phone-what-allows={piece.which === 'what-allows' ? true : undefined}
        >
          <summary>{piece.summary}</summary>
          <p className="set-section-caption">{piece.text}</p>
        </details>
      );
    case 'confirm':
      // TODAY'S BLOCK, BYTE FOR BYTE (his ruling 2, D18): every hashed line,
      // both warnings, the standing right while Funnel still needs approving,
      // and Allow. Nothing of it goes behind a disclosure.
      return status === null ? null : (
        <div key={key} className="phone-block" data-phone-confirm>
          <Lines lines={status.confirmLines} />
          <p className="set-config-warning">{POCKET_CONFIRM_WARNING}</p>
          <p className="set-config-warning">{POCKET_DOOR_HONESTY}</p>
          {status.funnel.asksApproval ? (
            <p className="set-config-warning" data-phone-funnel-right>
              {POCKET_FUNNEL_RIGHT_WARNING}
            </p>
          ) : null}
          <div className="set-config-actions">
            <button
              type="button"
              className="btn btn-primary"
              // Never while a read is under way: the lines may be about to move.
              disabled={busy || status.state === 'opening'}
              data-phone-action="confirm-door"
              onClick={props.onConfirmDoor}
            >
              {BTN_ALLOW}
            </button>
          </div>
        </div>
      );
    case 'approval':
      return status === null ? null : (
        <ApprovalBlock key={key} status={status} busy={busy} onOpenApproval={props.onOpenApproval} />
      );
    case 'pair-card':
      return <PairCard key={key} {...props} pair={piece.pair} />;
    default:
      return null;
  }
}

/**
 * A step's body, filled from its face's pieces in their order. Consecutive
 * presses share one actions row, so the quiet Try again sits beside the
 * step's one button.
 */
function StepBody(props: StepBodyProps & { face: StepFace }): React.JSX.Element {
  const out: React.JSX.Element[] = [];
  let row: React.JSX.Element[] = [];
  const endRow = (): void => {
    if (row.length === 0) return;
    out.push(
      <div key={`actions-${String(out.length)}`} className="set-config-actions phone-step-actions">
        {row}
      </div>
    );
    row = [];
  };
  props.face.body.forEach((piece, i) => {
    const key = `${piece.kind}-${String(i)}`;
    const press = stepAction(props, piece, key);
    if (press !== null) {
      row.push(press);
      return;
    }
    endRow();
    const drawn = stepPiece(props, piece, key);
    if (drawn !== null) out.push(drawn);
  });
  endRow();
  return <>{out}</>;
}

export function PhoneView(props: PhoneViewProps): React.JSX.Element {
  const { supported, status, error, busy } = props;

  if (!supported) {
    return (
      <section aria-label={PHONE_TITLE}>
        <h1 className="set-title">{PHONE_TITLE}</h1>
        <div className="set-card">
          <div className="set-empty-line">{BRIDGE_MISSING}</div>
        </div>
      </section>
    );
  }

  const on = status !== null && status.state !== 'off';
  // The pair card's face, worked out once: the composer reads it for step 3,
  // and the card draws it.
  const stage = pairingStage(status, props.offer, props.view, props.now);
  const faces = checklistOf(status, stage, props.wished);

  return (
    <section aria-label={PHONE_TITLE} className="phone-section">
      <h1 className="set-title">{PHONE_TITLE}</h1>

      {error === null ? null : (
        <div className="set-row-error phone-error" role="alert">
          {error}
        </div>
      )}

      <div className="set-card">
        <div className="set-row tall">
          <div className="set-row-text">
            <span className="set-row-label">{DOOR_LABEL}</span>
            {/* ONE caption that never changes (D1): what each side needs. */}
            <span className="set-row-caption">{POCKET_SETUP_LINE}</span>
          </div>
          <Switch
            checked={on}
            disabled={busy || status === null}
            label={DOOR_LABEL}
            onChange={props.onSetDoor}
          />
        </div>
      </div>

      <StepsCard faces={faces} body={(face) => <StepBody {...props} stage={stage} face={face} />} />

      <div className="set-group-label">{PHONES_GROUP}</div>
      <div className="set-card">
        {status !== null && status.droppedPhones > 0 ? (
          <div className="set-empty-line phone-warn" data-phone-dropped>
            {PHONES_DROPPED}
          </div>
        ) : null}
        {status === null || status.phones.length === 0 ? (
          <div className="set-empty-line">{NO_PHONES}</div>
        ) : (
          status.phones.map((phone) => (
            <div className="set-row tall" key={phone.id} data-phone-id={phone.id}>
              <div className="set-row-text">
                <span className="set-row-label">{phone.label}</span>
                <span className="set-row-caption">
                  <span className="phone-mono">{phone.fingerprint}</span>
                </span>
                {phone.alerts === 'stopped' ? (
                  <span className="set-row-caption phone-warn">
                    {PUSH_TOKEN_STOPPED}
                  </span>
                ) : null}
              </div>
              {phone.alerts === 'on' && alertsReachPhones(status) ? (
                <span className="set-chip">{ALERTS_ON_CHIP}</span>
              ) : null}
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                data-phone-action="remove-phone"
                onClick={() => props.onRemovePhone(phone.id)}
              >
                {BTN_REMOVE}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="set-group-label">{ALERTS_GROUP}</div>
      <div className="set-card">
        {status === null ? null : (
          <div className="set-row tall" data-phone-key>
            <div className="set-row-text">
              <span className="set-row-label">{PUSH_KEY_LABEL}</span>
              <span className="set-row-caption" data-phone-key-line>
                {status.pushKeyId === null ? PUSH_KEY_NONE : pushKeyChosen(status.pushKeyId)}
              </span>
              {/* True with a key and without one (Phase 333.1, D14; research 140 §6). */}
              <span className="set-row-caption" data-phone-publisher>
                {PUSH_PUBLISHER_ONLY}
              </span>
            </div>
            <div className="phone-key-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                data-phone-action="choose-key"
                onClick={props.onChooseKey}
              >
                {BTN_CHOOSE_KEY}
              </button>
              {status.pushKeyId === null ? null : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  data-phone-action="forget-key"
                  onClick={props.onForgetKey}
                >
                  {BTN_FORGET_KEY}
                </button>
              )}
            </div>
          </div>
        )}
        {status !== null && pushSwitchShown(status) ? (
          <div className="set-row tall" data-phone-alerts>
            <div className="set-row-text">
              <span className="set-row-label">{PUSH_LABEL}</span>
              <span className="set-row-caption">{PUSH_CAPTION}</span>
              {status.pushSentence === null ? null : (
                <span className="set-row-caption phone-warn" data-phone-alert-sentence>
                  {status.pushSentence}
                </span>
              )}
            </div>
            <Switch
              checked={status.pushAlerts}
              // Off can always be pressed. On waits for the door, because an
              // alert opens a session the phone then reads through it.
              disabled={busy || (!on && !status.pushAlerts)}
              label={PUSH_LABEL}
              onChange={props.onSetPushAlerts}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The connected section
// ---------------------------------------------------------------------------

export function PhoneSection(): React.JSX.Element {
  const api = gmuxBridge()?.pocket ?? null;
  const [status, setStatus] = useState<PocketStatus | null>(null);
  /**
   * The renderer's own monotonic clock when `status` arrived, and at the last
   * tick (Phase 332.1). Their difference is how old the name check's numbers
   * are; main's every push re-stamps both.
   */
  const [statusAt, setStatusAt] = useState(0);
  const [mono, setMono] = useState(0);
  /** This mount watched the name check's wait (see {@link nameWatchedNext}). */
  const [nameWatched, setNameWatched] = useState(false);
  const [view, setView] = useState<PocketPairingView | null>(null);
  const [offer, setOffer] = useState<PocketPairingOffer | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState<PhoneNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * The code was asked for (Pair with the door off, or, while no phone is
   * paired, the switch's on press or Try again: Phase 333.1, D17): once main
   * says one may show, it is asked for, once. Cleared by off, a refusal no
   * return will check again, and leaving (it is state, so it goes with the
   * section).
   */
  const [pairAfterAllow, setPairAfterAllow] = useState<PairAfterAllow>('no');
  /** The status the wish was last judged by (see {@link wishAwaitsAnswer}). */
  const wishJudgedRef = useRef<PocketStatus | null>(null);
  /** Whether a phone presented during the code that is showing. */
  const presentedRef = useRef(false);
  /**
   * Whether the code that is showing was shown while main could not confirm the
   * Mac's name (Phase 332): only such a code earns {@link CODE_FIRST_NAME}.
   */
  const shownUnreadableRef = useRef(false);
  /** The latest status, for the answer to a press that began before it. */
  const statusRef = useRef<PocketStatus | null>(null);
  statusRef.current = status;

  // The open code, for the unmount below, which runs after state is gone.
  const offerRef = useRef<PocketPairingOffer | null>(null);
  offerRef.current = offer;

  /** EVERY status the section holds arrives here, stamped (Phase 332.1). */
  const adopt = useCallback((s: PocketStatus): void => {
    const at = performance.now();
    setStatus(s);
    setStatusAt(at);
    setMono(at);
  }, []);

  // Pull once when the section opens, then follow main's pushes. Leaving the
  // section shuts an open code.
  useEffect(() => {
    if (api === null) return;
    let alive = true;
    const readView = (): void => {
      void api
        .pairingState()
        .then((v) => {
          if (alive) setView(v);
        })
        .catch(() => undefined);
    };
    void api
      .status()
      .then((s) => {
        if (alive) adopt(s);
      })
      .catch(() => undefined);
    readView();
    const off = api.onChanged((s) => {
      if (!alive) return;
      adopt(s);
      readView();
    });
    return () => {
      alive = false;
      off();
      if (offerRef.current !== null) {
        void api.cancelPairing().catch(() => undefined);
      }
    };
  }, [api, adopt]);

  // THE RETURN (Phase 333.1, D16): coming back to the window asks main again,
  // and so does opening the section in a window that has the focus. Main
  // reads Tailscale only while its own `rechecks` says a read could now see
  // the step finished, drops a return while one is under way, and counts no
  // press. ONE listener, the existing helper, which fires on the window's
  // focus and on the page becoming visible; no timer and no poll. Leaving the
  // section unsubscribes, so the helper's count returns to where it was.
  useEffect(() => {
    if (api === null) return;
    const off = onWindowLooked(() => {
      void api.recheck().then(adopt).catch(() => undefined);
    });
    if (document.hasFocus()) void api.recheck().then(adopt).catch(() => undefined);
    return off;
  }, [api, adopt]);

  // THE NAME CHECK (Phase 332.1): whether this mount watched the wait, and a
  // one-second tick only while the block is drawn and the check still runs.
  const stage = pairingStage(status, offer, view, now);
  useEffect(() => {
    setNameWatched((watched) => nameWatchedNext(watched, stage, status));
  }, [stage, status]);
  const ticking = nameTicking(status, stage, nameWatched);
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setMono(performance.now()), 1000);
    return () => window.clearInterval(id);
  }, [ticking]);

  // While a code shows: the clock for its countdown, and one read a second of
  // what the pairing is doing, because a phone presenting is main's to see.
  useEffect(() => {
    if (api === null || offer === null) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= offer.expiresAt) return;
      void api
        .pairingState()
        .then(setView)
        .catch(() => undefined);
    }, 1000);
    return () => window.clearInterval(id);
  }, [api, offer]);

  useEffect(() => {
    if (view?.state === 'presented') presentedRef.current = true;
  }, [view]);

  // The code is dropped the moment it shuts, whichever way: its deadline, or
  // main saying the pairing is no longer open.
  useEffect(() => {
    if (offer === null) return;
    const shut =
      now >= offer.expiresAt || view?.state === 'idle' || view?.state === 'expired';
    if (!shut) return;
    setOffer(null);
    setNotice(expiredNotice(shownUnreadableRef.current, presentedRef.current));
    void api
      ?.pairingState()
      .then(setView)
      .catch(() => undefined);
  }, [api, offer, view, now]);

  const run = useCallback(
    async <T,>(work: () => Promise<T>): Promise<T | null> => {
      setBusy(true);
      setError(null);
      try {
        return await work();
      } catch (err) {
        setError(errorText(err));
        return null;
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const beginPairing = useCallback((): void => {
    if (api === null) return;
    setNotice(null);
    void run(async () => {
      const opened = await api.beginPairing();
      const pairing = await api.pairingState();
      return { opened, pairing };
    }).then((answer) => {
      if (answer === null) return;
      presentedRef.current = false;
      shownUnreadableRef.current = statusRef.current?.nameCheck === 'unreadable';
      setNow(Date.now());
      setView(answer.pairing);
      setOffer(answer.opened);
    });
  }, [api, run]);

  // PAIR AFTER ALLOW: the push that says a code may show asks for it once; an
  // off, or a refusal with nothing more coming and no return main would check
  // again, drops the wish. A press is judged by main's answer to it, never by
  // the status drawn before it (see `wishAwaitsAnswer`).
  useEffect(() => {
    if (wishAwaitsAnswer(pairAfterAllow, status, wishJudgedRef.current)) return;
    wishJudgedRef.current = status;
    const next = pairAfterAllowNext(pairAfterAllow, status);
    if (next.phase !== pairAfterAllow) setPairAfterAllow(next.phase);
    if (next.pair) beginPairing();
  }, [pairAfterAllow, status, beginPairing]);

  if (api === null) {
    return (
      <PhoneView
        supported={false}
        status={null}
        offer={null}
        view={null}
        now={now}
        nameAgeMs={0}
        nameWatched={false}
        notice={null}
        error={null}
        busy={false}
        wished={false}
        onSetDoor={() => undefined}
        onConfirmDoor={() => undefined}
        onRetryDoor={() => undefined}
        onOpenApproval={() => undefined}
        onSetupAction={() => undefined}
        onPair={() => undefined}
        onCancelPairing={() => undefined}
        onAllowPhone={() => undefined}
        onRemovePhone={() => undefined}
        onSetPushAlerts={() => undefined}
        onChooseKey={() => undefined}
        onForgetKey={() => undefined}
      />
    );
  }

  const confirmDoor = async (current: PocketStatus): Promise<void> => {
    const result = await run(() =>
      api.confirmDoor({
        linesRead: current.confirmLines,
        hashRead: current.confirmHash
      })
    );
    if (result === null) return;
    adopt(result.status);
    if (!result.allowed) setError(result.refusal);
  };

  const setDoor = (on: boolean): void => {
    void run(() => api.setDoor({ on })).then((s) => {
      if (s !== null) adopt(s);
      else setPairAfterAllow('no');
    });
  };

  return (
    <PhoneView
      supported
      status={status}
      offer={offer}
      view={view}
      now={now}
      nameAgeMs={Math.max(0, mono - statusAt)}
      nameWatched={nameWatched}
      notice={notice}
      error={error}
      busy={busy}
      wished={pairAfterAllow !== 'no'}
      onSetDoor={(on) => {
        setNotice(null);
        // THE CODE ASKED FOR (Phase 333.1, D17): a first setup's on press
        // shows the code by itself once the door answers. Only while main has
        // answered and no phone is paired: a paired Mac is never handed a code
        // it did not ask for, and its step 3 keeps Pair.
        if (!on) setPairAfterAllow('no');
        else if (status !== null && status.phones.length === 0) setPairAfterAllow('pressed');
        setDoor(on);
      }}
      onConfirmDoor={() => {
        if (status !== null) void confirmDoor(status);
      }}
      onRetryDoor={() => {
        // Try again is the switch's own press again, so it asks for the code
        // under the same condition (D17).
        if (status !== null && status.phones.length === 0) setPairAfterAllow('pressed');
        setDoor(true);
      }}
      onOpenApproval={() => {
        void run(() => api.openApproval());
      }}
      onSetupAction={(action) => {
        // One closed word; main acts only on a press its status lists, and
        // takes no URL or path from here (D12).
        void run(() => api.setupAction(action));
      }}
      onPair={() => {
        if (status?.pairable === true) {
          beginPairing();
          return;
        }
        // The door is off: Pair turns it on, which reads Tailscale and draws
        // the lines; Allow is the one press after that, and the code follows.
        setNotice(null);
        setPairAfterAllow('pressed');
        setDoor(true);
      }}
      onCancelPairing={() => {
        setOffer(null);
        void run(() => api.cancelPairing()).then((v) => {
          if (v !== null) setView(v);
        });
      }}
      onAllowPhone={() => {
        if (view === null || view.hash === null) return;
        const label = view.label ?? '';
        const fingerprint = view.fingerprint;
        const input = { linesRead: view.lines, hashRead: view.hash };
        void run(() => api.allowPhone(input)).then((result) => {
          if (result === null) return;
          adopt(result.status);
          if (result.allowed) {
            setOffer(null);
            // The notice names the phone it is about, so a Remove takes it down.
            const phone = result.status.phones.find((p) => p.fingerprint === fingerprint);
            setNotice({ text: pairedWith(label), phoneId: phone?.id ?? null });
          } else {
            setError(result.refusal);
          }
          void api
            .pairingState()
            .then(setView)
            .catch(() => undefined);
        });
      }}
      onRemovePhone={(phoneId) => {
        if (notice?.phoneId === phoneId) setNotice(null);
        void run(() => api.removePhone(phoneId)).then((s) => {
          if (s !== null) adopt(s);
        });
      }}
      onSetPushAlerts={(on) => {
        const before = status;
        void run(() => api.setPushAlerts({ on })).then((after) => {
          if (after === null) return;
          adopt(after);
          // Off narrows where his words go, and Phase 314 ruled the sheet
          // confirms that in the same press. See `onlyOneLineMoved`.
          if (
            !on &&
            before !== null &&
            before.confirmState === 'confirmed' &&
            after.confirmState !== 'confirmed' &&
            after.state !== 'off' &&
            onlyOneLineMoved(before.confirmLines, after.confirmLines)
          ) {
            void confirmDoor(after);
          }
        });
      }}
      onChooseKey={() => {
        // Main opens the panel, reads the file and keeps it; main's broadcast
        // redraws the row. A refusal is main's own sentence, in the error line.
        void run(() => api.choosePushKey()).then((result) => {
          if (result !== null && !result.kept && result.refusal !== null) setError(result.refusal);
        });
      }}
      onForgetKey={() => {
        void run(() => api.forgetPushKey()).then((s) => {
          if (s !== null) adopt(s);
        });
      }}
    />
  );
}
