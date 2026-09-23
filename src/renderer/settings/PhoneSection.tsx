/**
 * Settings → Phone (Phase 316.1, build/p316/SPEC.md S1 mechanism 7).
 *
 * The one surface that switches Phase 313's door on, pairs a phone with it and
 * takes a phone away. Top to bottom, and nothing else:
 *
 *   1. "Let my phone reach this Mac", its state line, and, whenever the door's
 *      details are not the ones a person agreed to, the lines to read and
 *      Allow. Turning the switch on moves a confirmed field, so nothing listens
 *      until the person has read the lines (CLAUDE.md refusal 8).
 *   2. Pair a phone: the tailnet key, then the code, the time it has left, the
 *      fingerprint to match on the phone, the lines, and Allow.
 *   3. The phones, each with Remove.
 *   4. Phase 314's alert switch.
 *   5. Behind one disclosure, "Keep the phone to this door": the grant to paste
 *      into his own admin console, the one-word narrowing, and what is still
 *      true after both.
 *
 * JUST ENOUGH WORDS (CLAUDE.md UI rule). The resting face is labels and one
 * line each. Every sentence of explanation is main's, from the shared contract,
 * or sits behind the disclosure.
 *
 * THE TAILNET KEY IS HIS CREDENTIAL. It is read from an uncontrolled password
 * field at the press, the field is emptied in the same call, and the key goes
 * to main once, as the argument of `pocket:beginPairing`. It is never held in
 * React state, never logged and never drawn. The code's payload carries it back
 * to the phone, so the payload is drawn only as modules (./phone/Qr.tsx) and
 * is dropped the moment the code shuts, whichever way it shuts.
 *
 * WHY THERE ARE TWO EXPORTS, on MachinesSection's precedent. `PhoneView` draws,
 * and takes everything it draws as a prop, so the unit tests can render it on
 * a server with no bridge. `PhoneSection` reads the bridge and hands it over.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  POCKET_CONFIRM_WARNING,
  POCKET_ORIGIN_HONESTY,
  POCKET_REACH_HONESTY,
  POCKET_READ_ONLY_HONESTY,
  POCKET_TAILNET_GRANT_HONESTY,
  type PocketPairingOffer,
  type PocketPairingView,
  type PocketStatus
} from '@shared/ipc';
import { PUSH_TOKEN_STOPPED } from '@shared/push-copy';
import { gmuxBridge } from '../bridge';
import { errorText } from '../state/errors';
import { CopyButton } from './CopyButton';
import { Qr } from './phone/Qr';
import { Switch } from './Switch';
// The key field wears the Machines sheet's field classes rather than a copy of
// them; see phone-section.css.
import './machines.css';
import './phone-section.css';

// ---------------------------------------------------------------------------
// The words this surface owns. Every other sentence it draws is main's.
// ---------------------------------------------------------------------------

export const PHONE_TITLE = 'Phone';
export const DOOR_LABEL = 'Let my phone reach this Mac';
export const DOOR_OFF = 'Off. Nothing is listening.';
export const DOOR_WAITING = 'Read what it answers, then allow it.';
export const DOOR_NOT_LISTENING = 'Not listening.';
export const BTN_ALLOW = 'Allow';
export const BTN_TRY_AGAIN = 'Try again';

export const PAIR_GROUP = 'Pair a phone';
export const PAIR_CLOSED = 'Pairing opens once this Mac is listening.';
export const KEY_LABEL = 'Tailnet key';
export const KEY_HINT = 'The one-off key you minted for the phone. Held only while the code shows.';
export const BTN_PAIR = 'Pair';
export const BTN_CANCEL = 'Cancel';
export const QR_LABEL = 'Pairing code';
/**
 * The window's line (S1 mechanism 6): the phone has the code's few minutes to
 * join the tailnet AND present itself, not only to scan.
 */
export const SCAN_LINE =
  'Scan it with Tortie on your iPhone. The phone must join and pair before this code shuts.';
export const MATCH_LABEL = 'Match this on your iPhone';
export const CODE_EXPIRED = 'The code expired. Nothing was paired.';

export const PHONES_GROUP = 'Phones';
export const NO_PHONES = 'No phone yet.';
export const BTN_REMOVE = 'Remove';
export const ALERTS_ON_CHIP = 'Alerts on';

export const ALERTS_GROUP = 'Alerts';
export const PUSH_LABEL = 'Alert my phone when a session waits';
export const PUSH_CAPTION = 'Sent through Apple. Never what it asks.';

export const GRANT_SUMMARY = 'Keep the phone to this door';
export const GRANT_COPY_LABEL = 'Copy the grant';
export const GRANT_NO_ADDRESS = 'The grant needs this Mac’s tailnet address.';
export const NARROW_LEAD = 'Then narrow your default rule by one word:';
export const NARROW_FROM = '"src": ["*"]';
export const NARROW_TO = '"src": ["autogroup:member"]';
export const NARROW_PREVIEW = 'Read the rule preview in your admin console before you save.';
/**
 * The residual research 128 section 3.1 names and no surface drew (the SPEC's
 * section 2 row 27): a grant bounds packets, not knowledge. A device the
 * narrowed rule still lets connect to the phone is in the phone's map of the
 * tailnet, so its name reaches the phone whatever the grant says.
 */
export const NAMES_RESIDUAL =
  'Even then, the phone still learns the name of every device on your tailnet.';

export const BRIDGE_MISSING = 'Phone is not available in this build.';

/** `Listening on 100.64.0.1:8823`, the address and port a phone is told. */
export function doorListening(address: string, port: number): string {
  return `Listening on ${address}:${String(port)}`;
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
 * True when the door is on, has an address to answer on, and its details are
 * not the ones a person agreed to, so the lines and Allow are drawn.
 *
 * With no address there is nothing to agree to: the first line would name an
 * empty address, and the door could not bind one anyway.
 */
export function doorNeedsConfirm(status: PocketStatus): boolean {
  return (
    status.state !== 'off' &&
    status.address !== null &&
    status.confirmState !== 'confirmed'
  );
}

/**
 * True when the door is on, agreed to, and still not listening, which is a
 * bind that failed (a taken port, an address that went away). Try again is the
 * switch's own press again; it records no agreement.
 */
export function doorMayRetry(status: PocketStatus): boolean {
  return status.state === 'refused' && status.confirmState === 'confirmed';
}

/** The one line under the switch. */
export function doorLine(status: PocketStatus): string {
  if (status.state === 'off') return DOOR_OFF;
  if (status.state === 'listening') {
    return doorListening(status.address ?? '', status.port);
  }
  if (doorNeedsConfirm(status)) return DOOR_WAITING;
  return status.refusal ?? DOOR_NOT_LISTENING;
}

/** Which of the four faces the pairing card wears. */
export type PairingStage = 'closed' | 'ready' | 'showing' | 'match';

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
  return status?.state === 'listening' ? 'ready' : 'closed';
}

/**
 * True when `next` differs from `prev` in exactly one line, in place.
 *
 * Turning the alerts OFF moves a hashed field, and Phase 314 ruled that the
 * sheet confirms that narrowing in the same press (build/p314/SPEC.md section
 * 1.1 row 2), because otherwise the door shuts until a person re-reads a sheet
 * whose only change is that his words go to Apple no longer. The sheet does so
 * ONLY when the door was agreed to before the press and the switch's line is
 * the one line that moved, so a press can never carry an agreement to anything
 * a person did not already agree to.
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
  notice: string | null;
  /** Main's sentence for the last press that was refused. */
  error: string | null;
  busy: boolean;
  onSetDoor(on: boolean): void;
  onConfirmDoor(): void;
  onRetryDoor(): void;
  /** The key as pasted and trimmed, or `''` when the field was empty. */
  onPair(tailnetKey: string): void;
  onCancelPairing(): void;
  onAllowPhone(): void;
  onRemovePhone(phoneId: string): void;
  onSetPushAlerts(on: boolean): void;
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

function PairCard(props: PhoneViewProps): React.JSX.Element {
  const { status, offer, view, now, notice, busy } = props;
  const keyRef = useRef<HTMLInputElement>(null);
  const stage = pairingStage(status, offer, view, now);

  // The key is read at the press and the field emptied in the same call, so
  // it is never React state and never outlives the press on this side.
  const press = (): void => {
    const field = keyRef.current;
    const key = field?.value.trim() ?? '';
    if (field !== null) field.value = '';
    props.onPair(key);
  };

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

  if (stage === 'closed') {
    return (
      <div className="phone-block" data-phone-stage="closed">
        {notice === null ? null : <p className="phone-notice">{notice}</p>}
        <p className="phone-line">{PAIR_CLOSED}</p>
      </div>
    );
  }

  return (
    <div className="phone-block" data-phone-stage="ready">
      {notice === null ? null : <p className="phone-notice">{notice}</p>}
      <label className="mach-field-row">
        <span className="mach-field-label">{KEY_LABEL}</span>
        <input
          ref={keyRef}
          type="password"
          className="mach-field"
          data-phone-field="tailnet-key"
          autoComplete="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !busy) press();
          }}
        />
      </label>
      <div className="mach-hint">{KEY_HINT}</div>
      <div className="set-config-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          data-phone-action="pair"
          onClick={press}
        >
          {BTN_PAIR}
        </button>
      </div>
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
            <div className="set-config-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                data-phone-action="confirm-door"
                onClick={props.onConfirmDoor}
              >
                {BTN_ALLOW}
              </button>
            </div>
          </div>
        ) : null}
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
        {status === null || status.phones.length === 0 ? (
          <div className="set-empty-line">{NO_PHONES}</div>
        ) : (
          status.phones.map((phone) => (
            <div className="set-row tall" key={phone.id} data-phone-id={phone.id}>
              <div className="set-row-text">
                <span className="set-row-label">{phone.label}</span>
                <span className="set-row-caption">
                  <span className="phone-mono">{phone.address}</span>
                  {' · '}
                  <span className="phone-mono">{phone.fingerprint}</span>
                </span>
                {phone.alerts === 'stopped' ? (
                  <span className="set-row-caption phone-warn">
                    {PUSH_TOKEN_STOPPED}
                  </span>
                ) : null}
              </div>
              {phone.alerts === 'on' ? (
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
        <div className="set-row tall">
          <div className="set-row-text">
            <span className="set-row-label">{PUSH_LABEL}</span>
            <span className="set-row-caption">{PUSH_CAPTION}</span>
          </div>
          <Switch
            checked={status?.pushAlerts === true}
            // Off can always be pressed. On waits for the door, because an
            // alert opens a session the phone then reads through it.
            disabled={
              busy || status === null || (!on && !status.pushAlerts)
            }
            label={PUSH_LABEL}
            onChange={props.onSetPushAlerts}
          />
        </div>
      </div>

      <details className="set-disclosure phone-disclosure">
        <summary>{GRANT_SUMMARY}</summary>
        <p className="set-section-caption">{POCKET_TAILNET_GRANT_HONESTY}</p>
        {status?.grant === null || status?.grant === undefined ? (
          <p className="set-section-caption">{GRANT_NO_ADDRESS}</p>
        ) : (
          <div className="phone-grant-row">
            <pre className="phone-grant" data-phone-grant>
              {status.grant}
            </pre>
            <CopyButton text={status.grant} label={GRANT_COPY_LABEL} />
          </div>
        )}
        <p className="set-section-caption">
          {NARROW_LEAD} <code className="phone-code">{NARROW_FROM}</code>
          {' → '}
          <code className="phone-code">{NARROW_TO}</code>. {NARROW_PREVIEW}
        </p>
        <p className="set-section-caption">{NAMES_RESIDUAL}</p>
        <p className="set-section-caption">{POCKET_ORIGIN_HONESTY}</p>
      </details>
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
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The open code, for the unmount below, which runs after state is gone.
  const offerRef = useRef<PocketPairingOffer | null>(null);
  offerRef.current = offer;

  // Pull once when the section opens, then follow main's pushes. Leaving the
  // section shuts an open code, and main drops the key it held for it.
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

  // The code is dropped the moment it shuts, whichever way: its deadline, or
  // main saying the pairing is no longer open. What the pairing is doing is
  // read once more after, because the ticking read above stops with the code
  // and a phone that presented and was never allowed would otherwise still be
  // drawn waiting for Allow.
  useEffect(() => {
    if (offer === null) return;
    const shut =
      now >= offer.expiresAt || view?.state === 'idle' || view?.state === 'expired';
    if (!shut) return;
    setOffer(null);
    setNotice(CODE_EXPIRED);
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
        onPair={() => undefined}
        onCancelPairing={() => undefined}
        onAllowPhone={() => undefined}
        onRemovePhone={() => undefined}
        onSetPushAlerts={() => undefined}
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
        void run(() => api.setDoor({ on })).then((s) => {
          if (s !== null) setStatus(s);
        });
      }}
      onConfirmDoor={() => {
        if (status !== null) void confirmDoor(status);
      }}
      onRetryDoor={() => {
        void run(() => api.setDoor({ on: true })).then((s) => {
          if (s !== null) setStatus(s);
        });
      }}
      onPair={(tailnetKey) => {
        setNotice(null);
        void run(async () => {
          const opened = await api.beginPairing({
            tailnetKey: tailnetKey.length === 0 ? null : tailnetKey
          });
          const pairing = await api.pairingState();
          return { opened, pairing };
        }).then((answer) => {
          if (answer === null) return;
          setNow(Date.now());
          setView(answer.pairing);
          setOffer(answer.opened);
        });
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
        const input = { linesRead: view.lines, hashRead: view.hash };
        void run(() => api.allowPhone(input)).then((result) => {
          if (result === null) return;
          setStatus(result.status);
          if (result.allowed) {
            setOffer(null);
            setNotice(pairedWith(label));
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
    />
  );
}
