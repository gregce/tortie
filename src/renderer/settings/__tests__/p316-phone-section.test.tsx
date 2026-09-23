/**
 * Phase 316.1. Settings → Phone, drawn.
 *
 * The vitest environment is node, so these read static markup from
 * react-dom/server. They render `PhoneView`, which takes everything it draws
 * as a prop, and drive the pure decisions beside it directly.
 *
 * What these tests hold, each red if its clause is taken out of
 * PhoneSection.tsx:
 *
 * - THE ORDER the SPEC gives (S1 mechanism 7): the switch, Pair a phone, the
 *   phones, the alert switch, then the one disclosure.
 * - THE SWITCH'S LINE says what is true: off, listening on the address and
 *   port a phone is told, waiting for the person to allow it, or main's own
 *   refusal sentence, never a word of the surface's in its place.
 * - NOTHING LISTENS BEFORE A PERSON READS. Whenever the door is on and its
 *   details are not the ones agreed to, the lines main hashed are drawn, in
 *   main's order, with main's warning and Allow. Confirmed or off, they are
 *   not.
 * - THE KEY IS HIS CREDENTIAL. The field is a password field with no
 *   autocomplete and no value in the markup, and a made-up key inside the
 *   code's payload appears nowhere on the page.
 * - THE CODE is drawn only while main says the pairing is waiting and its
 *   deadline has not passed; the match face draws main's fingerprint, lines
 *   and warning.
 * - A PHONE whose alerts Apple stopped draws Phase 314's sentence for it.
 * - THE ALERT SWITCH is main's `pushAlerts`, and it cannot be turned ON while
 *   the door is off.
 * - THE DISCLOSURE draws main's grant text unedited, the narrowing, the rule
 *   preview line and the residual, and the two rewritten honesty sentences
 *   say what is true.
 * - TURNING THE ALERTS OFF re-confirms only a sheet whose one moved line is
 *   the switch's.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  POCKET_CONFIRM_WARNING,
  POCKET_REACH_HONESTY,
  POCKET_READ_ONLY_HONESTY,
  POCKET_TAILNET_GRANT_HONESTY,
  pocketGrantText,
  type PocketPairingOffer,
  type PocketPairingView,
  type PocketStatus
} from '@shared/ipc';
import { PUSH_TOKEN_STOPPED } from '@shared/push-copy';

import {
  ALERTS_GROUP,
  CODE_EXPIRED,
  DOOR_LABEL,
  DOOR_OFF,
  DOOR_WAITING,
  GRANT_NO_ADDRESS,
  GRANT_SUMMARY,
  NAMES_RESIDUAL,
  NARROW_FROM,
  NARROW_PREVIEW,
  NARROW_TO,
  PAIR_CLOSED,
  PAIR_GROUP,
  PHONES_GROUP,
  PhoneView,
  doorLine,
  doorNeedsConfirm,
  onlyOneLineMoved,
  pairingStage,
  shutsIn,
  type PhoneViewProps
} from '../PhoneSection';

const NOW = 1_790_000_000_000;
const FAKE_KEY = `tskey-auth-kP316FAKE-${'Z'.repeat(40)}`;

const LINES = [
  "Answers on this Mac's tailnet address: 100.101.102.103",
  'Port: 8823',
  'Starts answering when Tortie starts',
  'Answers these and nothing else: blocked, pair, session, turns',
  'Tells your phone nothing through Apple',
  'Allows no phone yet'
];

function status(over: Partial<PocketStatus> = {}): PocketStatus {
  return {
    state: 'listening',
    address: '100.101.102.103',
    port: 8823,
    bindAtLaunch: true,
    certificateFingerprint: 'f'.repeat(64),
    refusal: null,
    phones: [],
    confirmState: 'confirmed',
    confirmLines: LINES,
    confirmHash: 'h'.repeat(64),
    routes: ['pair', 'blocked', 'session', 'turns'],
    pushAlerts: false,
    grant: pocketGrantText('100.101.102.103', 8823),
    ...over
  };
}

function offer(expiresAt = NOW + 170_000): PocketPairingOffer {
  return {
    payload: JSON.stringify({ v: 2, host: '100.101.102.103', port: 8823, tk: FAKE_KEY }),
    expiresAt
  };
}

function pairing(over: Partial<PocketPairingView> = {}): PocketPairingView {
  return {
    state: 'waiting',
    expiresAt: NOW + 170_000,
    label: null,
    fingerprint: null,
    lines: [],
    hash: null,
    warning: POCKET_CONFIRM_WARNING,
    ...over
  };
}

const noop = (): void => undefined;

function draw(over: Partial<PhoneViewProps> = {}): string {
  const props: PhoneViewProps = {
    supported: true,
    status: status(),
    offer: null,
    view: pairing({ state: 'idle', expiresAt: null }),
    now: NOW,
    notice: null,
    error: null,
    busy: false,
    onSetDoor: noop,
    onConfirmDoor: noop,
    onRetryDoor: noop,
    onPair: noop,
    onCancelPairing: noop,
    onAllowPhone: noop,
    onRemovePhone: noop,
    onSetPushAlerts: noop,
    ...over
  };
  return renderToStaticMarkup(<PhoneView {...props} />);
}

/** Text content, with tags and entities flattened, for order checks. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

describe('the order the SPEC gives', () => {
  it('draws the switch, pairing, the phones, the alerts and the disclosure, in that order', () => {
    const page = text(draw());
    const at = [DOOR_LABEL, PAIR_GROUP, PHONES_GROUP, ALERTS_GROUP, GRANT_SUMMARY].map((w) =>
      page.indexOf(w)
    );
    for (const i of at) expect(i).toBeGreaterThanOrEqual(0);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('says under the title how the phone and this Mac each reach the tailnet', () => {
    expect(text(draw())).toContain(POCKET_REACH_HONESTY);
  });
});

describe('the switch’s one line', () => {
  it('says off when the door is off', () => {
    expect(doorLine(status({ state: 'off' }))).toBe(DOOR_OFF);
  });

  it('names the address and port a phone is told when listening', () => {
    expect(doorLine(status())).toBe('Listening on 100.101.102.103:8823');
  });

  it('asks the person to read and allow while the details are not agreed to', () => {
    const s = status({ state: 'refused', confirmState: 'never', refusal: 'main says why' });
    expect(doorLine(s)).toBe(DOOR_WAITING);
  });

  it('draws main’s own refusal sentence otherwise, never one of its own', () => {
    const sentence = 'Something else on this Mac already holds that port.';
    expect(doorLine(status({ state: 'refused', refusal: sentence }))).toBe(sentence);
    const noAddress = status({ state: 'no-address', address: null, refusal: 'no address, main says' });
    expect(doorLine(noAddress)).toBe('no address, main says');
  });

  it('draws the switch on for every state but off', () => {
    expect(draw({ status: status({ state: 'off' }) })).toMatch(/role="switch" aria-checked="false"[^>]*aria-label="Let my phone reach this Mac"/);
    expect(draw()).toMatch(/role="switch" aria-checked="true"[^>]*aria-label="Let my phone reach this Mac"/);
  });
});

describe('nothing listens before a person reads', () => {
  const unagreed = status({ state: 'refused', confirmState: 'changed' });

  it('draws main’s lines, in main’s order, with the warning and Allow', () => {
    const html = draw({ status: unagreed });
    expect(html).toContain('data-phone-confirm');
    const page = text(html);
    let from = 0;
    for (const line of LINES) {
      const at = page.indexOf(line, from);
      expect(at, line).toBeGreaterThanOrEqual(from);
      from = at;
    }
    expect(page).toContain(POCKET_CONFIRM_WARNING);
    expect(page).toContain(POCKET_READ_ONLY_HONESTY);
    expect(html).toContain('data-phone-action="confirm-door"');
  });

  it('draws none of it when the door is agreed to, or off, or has no address', () => {
    expect(doorNeedsConfirm(status())).toBe(false);
    expect(doorNeedsConfirm(status({ state: 'off', confirmState: 'never' }))).toBe(false);
    expect(
      doorNeedsConfirm(status({ state: 'no-address', address: null, confirmState: 'never' }))
    ).toBe(false);
    expect(draw()).not.toContain('data-phone-confirm');
  });

  it('asks again while listening if a change was not agreed to', () => {
    expect(doorNeedsConfirm(status({ confirmState: 'changed' }))).toBe(true);
  });

  it('offers Try again, and not Allow, for an agreed door that did not bind', () => {
    const html = draw({ status: status({ state: 'refused', refusal: 'port taken' }) });
    expect(html).toContain('data-phone-action="retry-door"');
    expect(html).not.toContain('data-phone-action="confirm-door"');
  });
});

describe('the tailnet key is his credential', () => {
  it('is asked for in a password field with no autocomplete and no value', () => {
    const html = draw();
    const field = /<input[^>]*data-phone-field="tailnet-key"[^>]*>/.exec(html)?.[0] ?? '';
    expect(field).toContain('type="password"');
    expect(field).toMatch(/autocomplete="off"/i);
    expect(field).toMatch(/spellcheck="false"/i);
    expect(field).not.toContain('value=');
  });

  it('never appears on the page while the code that carries it shows', () => {
    const html = draw({ offer: offer(), view: pairing() });
    expect(html).toContain('<svg');
    expect(html).not.toContain('tskey-auth-');
    expect(html).not.toContain('P316FAKE');
  });
});

describe('the pairing card', () => {
  it('is shut until this Mac is listening', () => {
    expect(pairingStage(status({ state: 'off' }), null, null, NOW)).toBe('closed');
    const html = draw({ status: status({ state: 'off' }) });
    expect(text(html)).toContain(PAIR_CLOSED);
    expect(html).not.toContain('data-phone-field="tailnet-key"');
  });

  it('shows the code only while main says it is waiting and the deadline has not passed', () => {
    expect(pairingStage(status(), offer(), pairing(), NOW)).toBe('showing');
    expect(pairingStage(status(), offer(NOW), pairing(), NOW)).toBe('ready');
    expect(pairingStage(status(), offer(), pairing({ state: 'idle' }), NOW)).toBe('ready');
    expect(pairingStage(status(), offer(), pairing({ state: 'expired' }), NOW)).toBe('ready');
    expect(pairingStage(status(), null, pairing(), NOW)).toBe('ready');
  });

  it('counts down in minutes and seconds, never below zero', () => {
    expect(shutsIn(170_000)).toBe('Shuts in 2:50');
    expect(shutsIn(1)).toBe('Shuts in 0:01');
    expect(shutsIn(-5_000)).toBe('Shuts in 0:00');
    const html = draw({ offer: offer(NOW + 61_000), view: pairing() });
    expect(text(html)).toContain('Shuts in 1:01');
  });

  it('draws the phone, main’s fingerprint, main’s lines and main’s warning to match', () => {
    const view = pairing({
      state: 'presented',
      label: 'An iPhone',
      fingerprint: 'ab12 cd34 ef56 0718 293a 4b5c',
      lines: ['Allows the phone "An iPhone" at 100.101.102.104, key ab12'],
      hash: 'p'.repeat(64)
    });
    const html = draw({ offer: offer(), view });
    expect(pairingStage(status(), offer(), view, NOW)).toBe('match');
    const page = text(html);
    expect(page).toContain('An iPhone');
    expect(page).toContain('ab12 cd34 ef56 0718 293a 4b5c');
    expect(page).toContain('Allows the phone "An iPhone" at 100.101.102.104, key ab12');
    expect(page).toContain(POCKET_CONFIRM_WARNING);
    expect(html).toContain('data-phone-action="allow-phone"');
    expect(html).not.toContain('<svg');
  });

  it('says when the code shut with nothing paired', () => {
    expect(text(draw({ notice: CODE_EXPIRED }))).toContain(CODE_EXPIRED);
  });
});

describe('the phones', () => {
  const phone = {
    id: 'p1',
    label: 'An iPhone',
    fingerprint: 'ab12 cd34 ef56 0718 293a 4b5c',
    addedAt: 0,
    address: '100.101.102.104'
  };

  it('draws each phone with Remove, and says so when there is none', () => {
    expect(text(draw())).toContain('No phone yet.');
    const html = draw({ status: status({ phones: [{ ...phone, alerts: 'none' }] }) });
    expect(html).toContain('data-phone-id="p1"');
    expect(html).toContain('data-phone-action="remove-phone"');
    expect(text(html)).toContain('100.101.102.104');
  });

  it('draws Phase 314’s sentence for a phone whose alerts Apple stopped', () => {
    const stopped = draw({ status: status({ phones: [{ ...phone, alerts: 'stopped' }] }) });
    expect(text(stopped)).toContain(PUSH_TOKEN_STOPPED);
    const live = draw({ status: status({ phones: [{ ...phone, alerts: 'on' }] }) });
    expect(text(live)).not.toContain(PUSH_TOKEN_STOPPED);
  });
});

describe('the alert switch', () => {
  function pushSwitch(html: string): string {
    return /<button[^>]*aria-label="Alert my phone when a session waits"[^>]*>/.exec(html)?.[0] ?? '';
  }

  it('is main’s pushAlerts', () => {
    expect(pushSwitch(draw({ status: status({ pushAlerts: true }) }))).toContain('aria-checked="true"');
    expect(pushSwitch(draw())).toContain('aria-checked="false"');
  });

  it('cannot be turned on while the door is off, and can always be turned off', () => {
    expect(pushSwitch(draw({ status: status({ state: 'off' }) }))).toContain('disabled=""');
    expect(
      pushSwitch(draw({ status: status({ state: 'off', pushAlerts: true }) }))
    ).not.toContain('disabled=""');
  });
});

describe('the disclosure', () => {
  it('draws main’s grant text unedited, the narrowing, the preview line and the residual', () => {
    const html = draw();
    const grant = /<pre[^>]*data-phone-grant[^>]*>([\s\S]*?)<\/pre>/.exec(html)?.[1] ?? '';
    expect(text(grant).trim()).toBe(text(pocketGrantText('100.101.102.103', 8823)).trim());
    const page = text(html);
    expect(page).toContain(POCKET_TAILNET_GRANT_HONESTY);
    expect(page).toContain(NARROW_FROM);
    expect(page).toContain(NARROW_TO);
    expect(page).toContain(NARROW_PREVIEW);
    expect(page).toContain(NAMES_RESIDUAL);
    expect(html).toMatch(/<details[^>]*>\s*<summary>Keep the phone to this door<\/summary>/);
  });

  it('says the grant waits for an address rather than drawing one with a hole in it', () => {
    const html = draw({ status: status({ state: 'no-address', address: null, grant: null }) });
    expect(html).not.toContain('data-phone-grant');
    expect(text(html)).toContain(GRANT_NO_ADDRESS);
  });
});

describe('the two sentences Phase 316.1 rewrote', () => {
  it('says the phone brings its own connection and this Mac still uses the Tailscale app', () => {
    expect(POCKET_REACH_HONESTY).toContain('phone brings its own connection');
    expect(POCKET_REACH_HONESTY).toContain('This Mac still reaches your tailnet through the Tailscale app');
    expect(POCKET_REACH_HONESTY).not.toContain('Your phone reaches this Mac through the Tailscale app');
  });

  it('no longer says the paste alone confines the phone', () => {
    expect(POCKET_TAILNET_GRANT_HONESTY).not.toMatch(/^Until you paste this/);
    expect(POCKET_TAILNET_GRANT_HONESTY).toContain('only adds a rule');
    expect(POCKET_TAILNET_GRANT_HONESTY).toContain('narrow that default');
    expect(POCKET_TAILNET_GRANT_HONESTY).toContain('Tortie never edits your tailnet policy');
  });
});

describe('turning the alerts off re-confirms only the one line it moved', () => {
  const on = [...LINES.slice(0, 4), 'Tells your phone through Apple when a session starts waiting on you, never what it asks, and nothing while this Mac sleeps', LINES[5] ?? ''];

  it('when exactly the switch’s line moved', () => {
    expect(onlyOneLineMoved(on, LINES)).toBe(true);
  });

  it('never when anything else moved too, or a line came or went', () => {
    const alsoPort = [...LINES];
    alsoPort[1] = 'Port: 9000';
    expect(onlyOneLineMoved(on, alsoPort)).toBe(false);
    expect(onlyOneLineMoved(on, [...LINES, 'Allows the phone "Another" at 100.1.1.1, key 0000'])).toBe(false);
    expect(onlyOneLineMoved(LINES, LINES)).toBe(false);
  });
});
