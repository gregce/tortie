/**
 * Settings → Phone (Phase 316.1; rewritten for Phase 330, build/p330/SPEC.md
 * §4.10).
 *
 * The one surface that switches the door on, pairs a phone with it and takes a
 * phone away. Top to bottom, and nothing else:
 *
 *   1. "Let my phone reach this Mac", its state line, and, whenever the door's
 *      details are not the ones a person agreed to, the lines to read and
 *      Allow. Those lines name the internet, the tailnet, the public port and
 *      the program that publishes it, so nothing starts until a person has read
 *      them (CLAUDE.md refusal 8). While Tailscale waits on its own approval
 *      page, Open Tailscale.
 *   2. Pair a phone: with the door off, ONE Pair button, which turns it on and
 *      reads Tailscale; once it answers, the code, the time it has left, the
 *      fingerprint to match on the phone, the lines, and Allow. While the Mac's
 *      name is not yet on the internet (Phase 332), one line in place of Pair.
 *   3. The phones, each with Remove.
 *   4. Alerts (Phase 316.5, research 136): the Apple push key row, Choose…
 *      (the file panel opens IN MAIN) and Forget; then, ONLY while a key is
 *      kept or the alerts are already on, Phase 314's alert switch and the
 *      push's standing sentence under it. Alerts are the key holder's alone,
 *      so a Mac with no key shows no switch and promises no alert.
 *
 * THERE IS NO KEY FIELD AND NO DISCLOSURE (Phase 330): the phone never joins
 * the tailnet, so there is no tailnet key to paste, no grant to copy and no
 * policy to narrow.
 *
 * JUST ENOUGH WORDS (CLAUDE.md UI rule). The resting face is labels and one
 * line each. Every sentence of explanation is main's, from the shared contract.
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
  POCKET_FUNNEL_RESTARTING,
  POCKET_FUNNEL_RIGHT_WARNING,
  POCKET_NAME_SENTENCES,
  POCKET_REACH_HONESTY,
  POCKET_READ_ONLY_HONESTY,
  type PocketPairingOffer,
  type PocketPairingView,
  type PocketStatus
} from '@shared/ipc';
import { PUSH_TOKEN_STOPPED } from '@shared/push-copy';
import { gmuxBridge } from '../bridge';
import { errorText } from '../state/errors';
import { Qr } from './phone/Qr';
import { Switch } from './Switch';
import './phone-section.css';

// ---------------------------------------------------------------------------
// The words this surface owns. Every other sentence it draws is main's. A word
// the phone quotes (`ios/Tortie/Style/Copy.swift`, `/// Names:` and `/// Mac:`)
// must not move by a byte: PHONE_TITLE, BTN_PAIR, BTN_TRY_AGAIN, CODE_EXPIRED.
// ---------------------------------------------------------------------------

export const PHONE_TITLE = 'Phone';
export const DOOR_LABEL = 'Let my phone reach this Mac';
export const DOOR_OFF = 'Off. Nothing is listening.';
export const DOOR_OPENING = 'Starting Tailscale Funnel…';
export const DOOR_WAITING = 'Read what it answers, then allow it.';
export const DOOR_NOT_LISTENING = 'Not listening.';
export const BTN_ALLOW = 'Allow';
export const BTN_TRY_AGAIN = 'Try again';
export const BTN_OPEN_TAILSCALE = 'Open Tailscale';

export const PAIR_GROUP = 'Pair a phone';
export const PAIR_WAITING = 'The code shows once this Mac is answering.';
export const BTN_PAIR = 'Pair';
export const BTN_CANCEL = 'Cancel';
export const QR_LABEL = 'Pairing code';
export const SCAN_LINE = 'Scan it with Tortie on your iPhone.';
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

/** `Answering at https://mac.tail0000.ts.net:8443`, what a phone is told. */
export function doorListening(publicName: string, publicPort: number): string {
  return `Answering at https://${publicName}:${String(publicPort)}`;
}

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
 * True when the door is on, its lines may be agreed to, and they are not the
 * ones a person agreed to, so the lines and Allow are drawn.
 *
 * `confirmable` is MAIN'S answer and is never spelled here (the Phase 330 fix
 * round): with no public name, no public port, or a Tailscale read or port
 * choice that just failed, the lines name no address or one Tailscale said it
 * cannot publish, so main's refusal is drawn instead and nobody is asked to
 * agree to it.
 */
export function doorNeedsConfirm(status: PocketStatus): boolean {
  return (
    status.state !== 'off' &&
    status.confirmable &&
    status.publicName !== null &&
    status.confirmState !== 'confirmed'
  );
}

/**
 * True when the door is on and not answering, and either it was agreed to (a
 * start that was refused) or there is nothing to agree to yet (Tailscale's own
 * refusal, or lines never read). Try again is the switch's own press again: it
 * reads Tailscale and records no agreement.
 */
export function doorMayRetry(status: PocketStatus): boolean {
  return (
    status.state === 'refused' &&
    (status.confirmState === 'confirmed' || !status.confirmable)
  );
}

/** The one line under the switch. */
export function doorLine(status: PocketStatus): string {
  if (status.state === 'off') return DOOR_OFF;
  if (status.state === 'opening') {
    return status.funnel.state === 'restarting' ? POCKET_FUNNEL_RESTARTING : DOOR_OPENING;
  }
  if (status.state === 'listening') {
    return doorListening(status.publicName ?? '', status.publicPort);
  }
  if (doorNeedsConfirm(status)) return DOOR_WAITING;
  return status.refusal ?? DOOR_NOT_LISTENING;
}

/**
 * Which of the six faces the pairing card wears. `naming`: the door answers
 * and main says a code may not show yet, because the Mac's name is not on the
 * internet (Phase 332).
 */
export type PairingStage = 'start' | 'waiting' | 'naming' | 'ready' | 'showing' | 'match';

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
 * Where "pair after Allow" stands (SPEC §4.10). `pressed`: Pair was pressed
 * with the door off, and main has not yet answered with the door on. `on`:
 * the door is on and the sheet is waiting for it to answer. `no`: nothing.
 */
export type PairAfterAllow = 'no' | 'pressed' | 'on';

/**
 * The next step of "pair after Allow" for a status main pushed, and whether
 * to ask for the code NOW. The code is asked for ONCE, when a push shows main
 * will show one (`pairable`, Phase 332): a door that answers while its name is
 * checked keeps the wish. The wish is dropped when the door goes off after it
 * was on, or when a start is refused with nothing more coming (no lines to
 * Allow).
 */
export function pairAfterAllowNext(
  phase: PairAfterAllow,
  status: PocketStatus | null
): { phase: PairAfterAllow; pair: boolean } {
  if (phase === 'no' || status === null) return { phase, pair: false };
  if (phase === 'pressed' && status.state === 'off') return { phase, pair: false };
  if (status.pairable) return { phase: 'no', pair: true };
  if (status.state === 'off') return { phase: 'no', pair: false };
  if (status.state === 'refused' && !doorNeedsConfirm(status)) return { phase: 'no', pair: false };
  return { phase: 'on', pair: false };
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
  /** One line after a pairing ended: paired, or expired. */
  notice: PhoneNotice | null;
  /** Main's sentence for the last press that was refused. */
  error: string | null;
  busy: boolean;
  onSetDoor(on: boolean): void;
  onConfirmDoor(): void;
  onRetryDoor(): void;
  onOpenApproval(): void;
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

function PairCard(props: PhoneViewProps): React.JSX.Element {
  const { status, offer, view, now, busy } = props;
  const stage = pairingStage(status, offer, view, now);
  const notice = noticeToDraw(props.notice, status);

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
    return (
      <div className="phone-block" data-phone-stage="waiting">
        {notice === null ? null : <p className="phone-notice">{notice}</p>}
        <p className="phone-line">{PAIR_WAITING}</p>
      </div>
    );
  }

  if (stage === 'naming') {
    return (
      <div className="phone-block" data-phone-stage="naming">
        {notice === null ? null : <p className="phone-notice">{notice}</p>}
        <p className="phone-line">{POCKET_NAME_SENTENCES.checking}</p>
      </div>
    );
  }

  // `start` (the door is off) and `ready` (it is answering) both wear ONE
  // Pair button; what it does is the connected section's to decide. `ready`
  // over a name main could not confirm says so above it.
  return (
    <div className="phone-block" data-phone-stage={stage}>
      {notice === null ? null : <p className="phone-notice">{notice}</p>}
      {stage === 'ready' && status?.nameCheck === 'unreadable' ? (
        <p className="phone-line" data-phone-name-unreadable>
          {POCKET_NAME_SENTENCES.unreadable}
        </p>
      ) : null}
      <PairButton busy={busy || status === null} onPair={props.onPair} />
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

  const confirm = status !== null && doorNeedsConfirm(status);
  const retry = status !== null && doorMayRetry(status);
  const on = status !== null && status.state !== 'off';

  return (
    <section aria-label={PHONE_TITLE} className="phone-section">
      <h1 className="set-title">{PHONE_TITLE}</h1>
      <div className="set-section-caption">{POCKET_REACH_HONESTY}</div>

      {error === null ? null : (
        <div className="set-row-error phone-error" role="alert">
          {error}
        </div>
      )}

      <div className="set-card">
        <div className="set-row tall">
          <div className="set-row-text">
            <span className="set-row-label">{DOOR_LABEL}</span>
            <span className="set-row-caption" data-phone-door-line>
              {status === null ? '' : doorLine(status)}
            </span>
          </div>
          <Switch
            checked={on}
            disabled={busy || status === null}
            label={DOOR_LABEL}
            onChange={props.onSetDoor}
          />
        </div>
        {confirm && status !== null ? (
          <div className="phone-block" data-phone-confirm>
            <Lines lines={status.confirmLines} />
            <p className="set-config-warning">{POCKET_CONFIRM_WARNING}</p>
            <p className="set-config-warning">{POCKET_READ_ONLY_HONESTY}</p>
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
        ) : null}
        {status === null ? null : (
          <ApprovalBlock status={status} busy={busy} onOpenApproval={props.onOpenApproval} />
        )}
        {retry ? (
          <div className="phone-block">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              data-phone-action="retry-door"
              onClick={props.onRetryDoor}
            >
              {BTN_TRY_AGAIN}
            </button>
          </div>
        ) : null}
      </div>

      <div className="set-group-label">{PAIR_GROUP}</div>
      <div className="set-card">
        <PairCard {...props} />
      </div>

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
  const [view, setView] = useState<PocketPairingView | null>(null);
  const [offer, setOffer] = useState<PocketPairingOffer | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState<PhoneNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * Pair was pressed with the door off: once main says the door is answering,
   * the code is asked for, once. Cleared by off, a refusal, and leaving (it is
   * state, so it goes with the section).
   */
  const [pairAfterAllow, setPairAfterAllow] = useState<PairAfterAllow>('no');
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
        if (alive) setStatus(s);
      })
      .catch(() => undefined);
    readView();
    const off = api.onChanged((s) => {
      if (!alive) return;
      setStatus(s);
      readView();
    });
    return () => {
      alive = false;
      off();
      if (offerRef.current !== null) {
        void api.cancelPairing().catch(() => undefined);
      }
    };
  }, [api]);

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
  // off or a refusal with nothing more coming drops the wish.
  useEffect(() => {
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
        notice={null}
        error={null}
        busy={false}
        onSetDoor={() => undefined}
        onConfirmDoor={() => undefined}
        onRetryDoor={() => undefined}
        onOpenApproval={() => undefined}
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
    setStatus(result.status);
    if (!result.allowed) setError(result.refusal);
  };

  const setDoor = (on: boolean): void => {
    void run(() => api.setDoor({ on })).then((s) => {
      if (s !== null) setStatus(s);
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
      notice={notice}
      error={error}
      busy={busy}
      onSetDoor={(on) => {
        setNotice(null);
        if (!on) setPairAfterAllow('no');
        setDoor(on);
      }}
      onConfirmDoor={() => {
        if (status !== null) void confirmDoor(status);
      }}
      onRetryDoor={() => setDoor(true)}
      onOpenApproval={() => {
        void run(() => api.openApproval());
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
          setStatus(result.status);
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
          if (s !== null) setStatus(s);
        });
      }}
      onSetPushAlerts={(on) => {
        const before = status;
        void run(() => api.setPushAlerts({ on })).then((after) => {
          if (after === null) return;
          setStatus(after);
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
          if (s !== null) setStatus(s);
        });
      }}
    />
  );
}
