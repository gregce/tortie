/**
 * Settings → Phone, drawn (Phase 316.1; rewritten for Phase 330, build/p330/
 * SPEC.md §4.10).
 *
 * The vitest environment is node, so these read static markup from
 * react-dom/server. They render `PhoneView`, which takes everything it draws
 * as a prop, and drive the pure decisions beside it directly.
 *
 * What these tests hold, each red if its clause is taken out of
 * PhoneSection.tsx:
 *
 * - THE ORDER: the switch, Pair a phone, the phones, the alert switch, and NO
 *   disclosure: there is no grant, no narrowing and no key field any more.
 * - THE SWITCH'S LINE says what is true: off, starting Funnel, Tortie trying
 *   again, answering at the public name and port, waiting for the person to
 *   allow it, or main's own refusal sentence.
 * - NOTHING STARTS BEFORE A PERSON READS. The lines main hashed, with main's
 *   warnings, the standing-right warning when Funnel still needs approving,
 *   and Allow — never while a read is under way.
 * - THE APPROVAL: Open Tailscale only for the page main will open; any other
 *   page as selectable text, never a link.
 * - THE PAIR CARD'S FIVE FACES, and one Pair button whether the door is off or
 *   answering; the code with its private line and its countdown.
 * - THE REMOVE NOTICE is keyed to the phone it names (316.4 owed item 1): a
 *   removed phone's "Paired with" is never drawn.
 * - A FIRST CODE that shuts with nobody presenting says why, only when it was
 *   shown while main could not check the Mac's name (Phase 332).
 * - PAIR AFTER ALLOW asks for the code once, when main says one may show.
 * - THE NAMING FACE (Phase 332): while main says a code may not show yet, one
 *   line in place of Pair; over a name main could not check, its line above
 *   Pair. Both decided by main's `pairable`, never worked out here.
 * - THE WORDS THE PHONE QUOTES stay byte for byte.
 * - THE APPLE PUSH KEY'S ROW (Phase 316.5, build/p3165/SPEC.md §5.2.5, as
 *   research 136 moved it): drawn first in the Alerts card whenever main has
 *   answered, `Not chosen.` or `Key <id>`, Choose… always and Forget only when
 *   a key is kept, a refusal in the sheet's one error line; and THE SWITCH
 *   ONLY WHILE A KEY IS KEPT OR THE ALERTS ARE ALREADY ON, with main's
 *   standing sentence under it. A Mac with no key promises no alert.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  POCKET_CONFIRM_WARNING,
  POCKET_FUNNEL_APPROVAL,
  POCKET_FUNNEL_APPROVAL_ELSEWHERE,
  POCKET_FUNNEL_SENTENCES,
  POCKET_FUNNEL_RESTARTING,
  POCKET_FUNNEL_RIGHT_WARNING,
  POCKET_NAME_SENTENCES,
  POCKET_REACH_HONESTY,
  POCKET_READ_ONLY_HONESTY,
  type PocketPairingOffer,
  type PocketPairingView,
  type PocketStatus
} from '@shared/ipc';
import { PUSH_NO_KEY, PUSH_TOKEN_STOPPED } from '@shared/push-copy';

import {
  ALERTS_GROUP,
  BTN_CHOOSE_KEY,
  BTN_FORGET_KEY,
  BTN_OPEN_TAILSCALE,
  CODE_EXPIRED,
  CODE_FIRST_NAME,
  CODE_PRIVATE,
  DOOR_LABEL,
  DOOR_OFF,
  DOOR_OPENING,
  DOOR_WAITING,
  PAIR_GROUP,
  PAIR_WAITING,
  ALERTS_ON_CHIP,
  PHONES_DROPPED,
  PHONES_GROUP,
  PUSH_CAPTION,
  PUSH_KEY_LABEL,
  PUSH_KEY_NONE,
  PUSH_LABEL,
  PhoneView,
  SCAN_LINE,
  doorLine,
  doorMayRetry,
  doorNeedsConfirm,
  expiredNotice,
  noticeToDraw,
  onlyOneLineMoved,
  pairAfterAllowNext,
  pairedWith,
  pairingStage,
  pushKeyChosen,
  pushSwitchShown,
  alertsReachPhones,
  shutsIn,
  type PhoneViewProps
} from '../PhoneSection';
import * as phoneSection from '../PhoneSection';

const NOW = 1_790_000_000_000;
const NAME = 'mac.tail00000.ts.net';

const LINES = [
  `Answers on the internet at https://${NAME}:8443, through Tailscale Funnel on example.github`,
  'Publishes it with /Applications/Tailscale.app/Contents/MacOS/Tailscale',
  'Starts answering when Tortie starts',
  'Answers these and nothing else: blocked, pair, session, turns',
  'Tells your phone nothing through Apple',
  'Allows no phone yet'
];

/**
 * A status as main composes one. `pairable` and `nameCheck` default to what
 * main answers for the state: a listening door whose name is confirmed is
 * pairable, and nothing else is (main's one predicate, build/p332/SPEC.md §4.9).
 */
function status(over: Partial<PocketStatus> = {}): PocketStatus {
  const listening = (over.state ?? 'listening') === 'listening';
  return {
    state: 'listening',
    publicName: NAME,
    publicPort: 8443,
    bindAtLaunch: true,
    certificateFingerprint: 'f'.repeat(64),
    refusal: null,
    phones: [],
    droppedPhones: 0,
    funnel: { state: 'publishing', asksApproval: false, approvalOpens: false, approvalText: null },
    confirmState: 'confirmed',
    confirmLines: LINES,
    confirmHash: 'h'.repeat(64),
    confirmable: true,
    nameCheck: listening ? 'confirmed' : 'none',
    pairable: listening,
    routes: ['pair', 'blocked', 'session', 'turns'],
    pushAlerts: false,
    pushKeyId: null,
    pushSentence: null,
    ...over
  };
}

function offer(expiresAt = NOW + 170_000): PocketPairingOffer {
  return {
    payload: JSON.stringify({ v: 3, host: NAME, port: 8443, fp: 'p', dk: 'd', dx: 'x', ps: 's', exp: expiresAt }),
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
    onOpenApproval: noop,
    onPair: noop,
    onCancelPairing: noop,
    onAllowPhone: noop,
    onRemovePhone: noop,
    onSetPushAlerts: noop,
    onChooseKey: noop,
    onForgetKey: noop,
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

const phone = {
  id: 'p1',
  label: 'An iPhone',
  fingerprint: 'ab12 cd34 ef56 0718 293a 4b5c',
  addedAt: 0,
  alerts: 'none' as const
};

describe('the order the SPEC gives', () => {
  it('draws the switch, pairing, the phones and the alerts, in that order, and no disclosure', () => {
    const html = draw();
    const page = text(html);
    const at = [DOOR_LABEL, PAIR_GROUP, PHONES_GROUP, ALERTS_GROUP].map((w) => page.indexOf(w));
    for (const i of at) expect(i).toBeGreaterThanOrEqual(0);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html).not.toContain('<details');
    expect(page).not.toMatch(/grant|narrow|autogroup|Keep the phone to this door/i);
  });

  it('says under the title how the phone reaches this Mac', () => {
    expect(POCKET_REACH_HONESTY).toBe(
      'Your phone reaches this Mac through Tailscale Funnel. Only a phone you pair gets an answer.'
    );
    expect(text(draw())).toContain(POCKET_REACH_HONESTY);
  });

  it('has no key field on any face', () => {
    for (const html of [
      draw(),
      draw({ status: status({ state: 'off' }) }),
      draw({ status: status({ state: 'opening' }) }),
      draw({ offer: offer(), view: pairing() })
    ]) {
      expect(html).not.toContain('type="password"');
      expect(html).not.toContain('data-phone-field');
      expect(text(html)).not.toMatch(/tailnet key/i);
    }
  });
});

describe('the switch’s one line', () => {
  it('says off, starting Funnel, and trying again', () => {
    expect(doorLine(status({ state: 'off' }))).toBe(DOOR_OFF);
    expect(DOOR_OPENING).toBe('Starting Tailscale Funnel…');
    expect(doorLine(status({ state: 'opening', funnel: { ...status().funnel, state: 'starting' } }))).toBe(DOOR_OPENING);
    expect(doorLine(status({ state: 'opening', funnel: { ...status().funnel, state: 'restarting' } }))).toBe(
      POCKET_FUNNEL_RESTARTING
    );
  });

  it('names the public name and port a phone is told when answering', () => {
    expect(doorLine(status())).toBe(`Answering at https://${NAME}:8443`);
  });

  it('asks the person to read and allow while the details are not agreed to', () => {
    expect(doorLine(status({ state: 'refused', confirmState: 'never', refusal: 'main says why' }))).toBe(DOOR_WAITING);
  });

  it('draws main’s own refusal sentence otherwise, never one of its own', () => {
    const sentence = 'Tailscale is not running on this Mac. Open Tailscale, then try again.';
    expect(doorLine(status({ state: 'refused', refusal: sentence }))).toBe(sentence);
    expect(doorLine(status({ state: 'refused', publicName: null, confirmState: 'never', refusal: sentence }))).toBe(
      sentence
    );
  });

  it('draws the switch on for every state but off', () => {
    expect(draw({ status: status({ state: 'off' }) })).toMatch(
      /role="switch" aria-checked="false"[^>]*aria-label="Let my phone reach this Mac"/
    );
    expect(draw()).toMatch(/role="switch" aria-checked="true"[^>]*aria-label="Let my phone reach this Mac"/);
  });
});

describe('nothing starts before a person reads', () => {
  const unagreed = status({ state: 'refused', confirmState: 'changed' });

  it('draws main’s lines, in main’s order, with the warnings and Allow', () => {
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
    expect(POCKET_CONFIRM_WARNING).toContain('over the internet');
    expect(page).toContain(POCKET_READ_ONLY_HONESTY);
    expect(page).not.toContain(POCKET_FUNNEL_RIGHT_WARNING);
    expect(html).toMatch(/<button[^>]*data-phone-action="confirm-door"[^>]*>/);
    expect(/<button[^>]*data-phone-action="confirm-door"[^>]*>/.exec(html)?.[0]).not.toContain('disabled');
  });

  it('draws the standing-right warning when the first start will ask Tailscale’s approval', () => {
    const asks = status({ state: 'refused', confirmState: 'never', funnel: { ...status().funnel, asksApproval: true } });
    expect(text(draw({ status: asks }))).toContain(POCKET_FUNNEL_RIGHT_WARNING);
  });

  it('never offers Allow while a read is under way', () => {
    const reading = status({ state: 'opening', confirmState: 'changed', funnel: { ...status().funnel, state: 'reading' } });
    expect(/<button[^>]*data-phone-action="confirm-door"[^>]*>/.exec(draw({ status: reading }))?.[0]).toContain(
      'disabled'
    );
  });

  it('draws none of it when the door is agreed to, off, or unread', () => {
    expect(doorNeedsConfirm(status())).toBe(false);
    expect(doorNeedsConfirm(status({ state: 'off', confirmState: 'never' }))).toBe(false);
    expect(doorNeedsConfirm(status({ state: 'refused', publicName: null, confirmState: 'never' }))).toBe(false);
    expect(draw()).not.toContain('data-phone-confirm');
  });

  it('offers Try again, and not Allow, for an agreed door that did not start', () => {
    const html = draw({ status: status({ state: 'refused', refusal: 'port taken' }) });
    expect(html).toContain('data-phone-action="retry-door"');
    expect(html).not.toContain('data-phone-action="confirm-door"');
  });

  // THE FIX ROUND'S FACES (lens 2, F1 and F4): main answered `confirmable`
  // false, so its refusal is drawn with Try again and nobody is asked to agree
  // to a line that names port 0, or a Mac whose Tailscale is not running.
  const faces: [string, Partial<PocketStatus>][] = [
    [
      'both ports held on a first Pair (the lines would name :0)',
      {
        state: 'refused',
        confirmState: 'never',
        confirmable: false,
        publicPort: 0,
        refusal: POCKET_FUNNEL_SENTENCES['ports-taken'],
        confirmLines: [`Answers on the internet at https://${NAME}:0, through Tailscale Funnel on example.github`]
      }
    ],
    [
      'Tailscale stopped, the gate never agreed to',
      { state: 'refused', confirmState: 'never', confirmable: false, refusal: POCKET_FUNNEL_SENTENCES['not-running'] }
    ],
    [
      'Tailscale stopped, the gate changed',
      { state: 'refused', confirmState: 'changed', confirmable: false, refusal: POCKET_FUNNEL_SENTENCES['not-running'] }
    ]
  ];
  for (const [name, over] of faces) {
    it(`draws main’s refusal and Try again, never the lines or Allow: ${name}`, () => {
      const face = status(over);
      expect(doorNeedsConfirm(face)).toBe(false);
      expect(doorMayRetry(face)).toBe(true);
      expect(doorLine(face)).toBe(face.refusal);
      const html = draw({ status: face });
      expect(text(html)).toContain(face.refusal ?? 'no refusal');
      expect(html).not.toContain('data-phone-confirm');
      expect(html).not.toContain('data-phone-action="confirm-door"');
      expect(html).toContain('data-phone-action="retry-door"');
      expect(text(html)).not.toContain(':0,');
      expect(pairAfterAllowNext('on', face)).toEqual({ phase: 'no', pair: false });
    });
  }

  it('draws the lines again once main says they may be agreed to', () => {
    const face = status({ state: 'refused', confirmState: 'never', confirmable: true, refusal: 'the gate says why' });
    expect(doorNeedsConfirm(face)).toBe(true);
    expect(doorMayRetry(face)).toBe(false);
    expect(draw({ status: face })).toContain('data-phone-action="confirm-door"');
  });
});

describe('Tailscale’s approval', () => {
  it('offers Open Tailscale only for the page main will open', () => {
    const waiting = status({
      state: 'opening',
      funnel: { ...status().funnel, state: 'approval', approvalOpens: true, approvalText: null }
    });
    const html = draw({ status: waiting });
    expect(text(html)).toContain(POCKET_FUNNEL_APPROVAL);
    expect(html).toContain('data-phone-action="open-approval"');
    expect(text(html)).toContain(BTN_OPEN_TAILSCALE);
  });

  it('draws any other page as selectable text, never a link, with no button to open it', () => {
    const url = 'https://example.invalid/f/funnel';
    const elsewhere = status({
      state: 'opening',
      funnel: { ...status().funnel, state: 'approval', approvalOpens: false, approvalText: url }
    });
    const html = draw({ status: elsewhere });
    expect(text(html)).toContain(POCKET_FUNNEL_APPROVAL_ELSEWHERE);
    expect(html).toContain(url);
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('href=');
    expect(html).not.toContain('data-phone-action="open-approval"');
  });

  it('draws nothing of it when there is no approval to wait on', () => {
    expect(draw()).not.toContain('data-phone-approval');
  });
});

describe('the pairing card', () => {
  it('wears one Pair button when the door is off, and the same when it answers', () => {
    expect(pairingStage(status({ state: 'off' }), null, null, NOW)).toBe('start');
    const off = draw({ status: status({ state: 'off' }) });
    expect(off).toContain('data-phone-stage="start"');
    expect(off).toContain('data-phone-action="pair"');
    expect(pairingStage(status(), null, null, NOW)).toBe('ready');
    const ready = draw();
    expect(ready).toContain('data-phone-stage="ready"');
    expect(ready).toContain('data-phone-action="pair"');
  });

  it('waits, with no button, while the door is on and not answering', () => {
    expect(pairingStage(status({ state: 'opening' }), null, null, NOW)).toBe('waiting');
    expect(pairingStage(status({ state: 'refused' }), null, null, NOW)).toBe('waiting');
    const html = draw({ status: status({ state: 'opening' }) });
    expect(text(html)).toContain(PAIR_WAITING);
    expect(html).not.toContain('data-phone-action="pair"');
  });

  it('wears the naming face, one line and no button, while the door answers and main says no code may show (Phase 332)', () => {
    const naming = status({ pairable: false, nameCheck: 'checking' });
    expect(pairingStage(naming, null, null, NOW)).toBe('naming');
    const html = draw({ status: naming });
    expect(html).toContain('data-phone-stage="naming"');
    expect(text(html)).toContain(POCKET_NAME_SENTENCES.checking);
    expect(html).not.toContain('data-phone-action="pair"');
    expect(html).not.toContain('data-phone-name-unreadable');
    expect(POCKET_NAME_SENTENCES.checking).toBe(
      'Pair opens once your Mac’s name is on the internet, which can take a few minutes.'
    );
    // The switch's line is still the door's own.
    expect(text(html)).toContain(`Answering at https://${NAME}:8443`);
    // Just enough words: the resting face gains one line, and only this one.
    expect(text(draw())).not.toContain(POCKET_NAME_SENTENCES.checking);
  });

  it('decides the face from main’s pairable and never from the name check itself', () => {
    expect(pairingStage(status({ pairable: false, nameCheck: 'confirmed' }), null, null, NOW)).toBe('naming');
    expect(pairingStage(status({ pairable: false, nameCheck: 'unreadable' }), null, null, NOW)).toBe('naming');
    expect(pairingStage(status({ pairable: true, nameCheck: 'checking' }), null, null, NOW)).toBe('ready');
    expect(pairingStage(status({ pairable: true, nameCheck: 'none' }), null, null, NOW)).toBe('ready');
    // A door that is not answering waits as before, whatever pairable says.
    expect(pairingStage(status({ state: 'opening', pairable: true }), null, null, NOW)).toBe('waiting');
    expect(pairingStage(status({ state: 'off', pairable: false }), null, null, NOW)).toBe('start');
  });

  it('draws the unreadable line above Pair only when main could not confirm the name (Phase 332)', () => {
    const unread = draw({ status: status({ pairable: true, nameCheck: 'unreadable' }) });
    expect(unread).toContain('data-phone-stage="ready"');
    expect(unread).toContain('data-phone-name-unreadable');
    const page = text(unread);
    expect(page).toContain(POCKET_NAME_SENTENCES.unreadable);
    // "confirm", not "check" (the fix round): the line also stands over a no that lasted 18 rounds.
    expect(POCKET_NAME_SENTENCES.unreadable).toBe('Tortie could not confirm your Mac’s name, so a first scan may fail.');
    expect(unread.indexOf('data-phone-name-unreadable')).toBeLessThan(unread.indexOf('data-phone-action="pair"'));
    for (const nameCheck of ['confirmed', 'checking', 'none'] as const) {
      const html = draw({ status: status({ pairable: true, nameCheck }) });
      expect(html, nameCheck).toContain('data-phone-action="pair"');
      expect(html, nameCheck).not.toContain('data-phone-name-unreadable');
      expect(text(html), nameCheck).not.toContain(POCKET_NAME_SENTENCES.unreadable);
    }
    // The door off with an unreadable word left over: the start face never says it.
    expect(draw({ status: status({ state: 'off', pairable: false, nameCheck: 'unreadable' }) })).not.toContain(
      'data-phone-name-unreadable'
    );
  });

  it('presses Pair into the code only on main’s pairable; otherwise the carried press (onPair’s branch)', () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'PhoneSection.tsx'), 'utf8');
    const onPair = /onPair=\{\(\) => \{([\s\S]*?)\n      \}\}/.exec(source)?.[1] ?? '';
    expect(onPair).not.toBe('');
    // The first branch asks main's predicate and opens the code; the rest turns the door on and carries the press.
    const first = /if \(([^)]*)\) \{\s*beginPairing\(\);\s*return;\s*\}/.exec(onPair)?.[1] ?? '';
    expect(first).toBe("status?.pairable === true");
    expect(onPair).not.toContain("state === 'listening'");
    expect(onPair.indexOf("setPairAfterAllow('pressed')")).toBeGreaterThan(onPair.indexOf('beginPairing()'));
    expect(onPair).toContain('setDoor(true)');
  });

  it('shows the code, with its private line, only while main says it is waiting and the deadline has not passed', () => {
    expect(pairingStage(status(), offer(), pairing(), NOW)).toBe('showing');
    expect(pairingStage(status(), offer(NOW), pairing(), NOW)).toBe('ready');
    expect(pairingStage(status(), offer(), pairing({ state: 'idle' }), NOW)).toBe('ready');
    const html = draw({ offer: offer(), view: pairing() });
    expect(html).toContain('<svg');
    expect(text(html)).toContain(SCAN_LINE);
    expect(SCAN_LINE).toBe('Scan it with Tortie on your iPhone.');
    expect(text(html)).toContain(CODE_PRIVATE);
  });

  it('counts down in minutes and seconds, never below zero', () => {
    expect(shutsIn(170_000)).toBe('Shuts in 2:50');
    expect(shutsIn(-5_000)).toBe('Shuts in 0:00');
    expect(text(draw({ offer: offer(NOW + 61_000), view: pairing() }))).toContain('Shuts in 1:01');
  });

  it('draws the phone, main’s fingerprint, main’s lines and main’s warning to match', () => {
    const view = pairing({
      state: 'presented',
      label: 'An iPhone',
      fingerprint: 'ab12 cd34 ef56 0718 293a 4b5c',
      lines: ['Allows the phone "An iPhone", key ab12 cd34 ef56 0718 293a 4b5c'],
      hash: 'p'.repeat(64)
    });
    const html = draw({ offer: offer(), view });
    expect(pairingStage(status(), offer(), view, NOW)).toBe('match');
    const page = text(html);
    expect(page).toContain('ab12 cd34 ef56 0718 293a 4b5c');
    expect(page).toContain('Allows the phone "An iPhone", key ab12 cd34 ef56 0718 293a 4b5c');
    expect(page).toContain(POCKET_CONFIRM_WARNING);
    expect(html).toContain('data-phone-action="allow-phone"');
    expect(html).not.toContain('<svg');
  });
});

describe('the notices', () => {
  it('draws a “Paired with” line only while the phone it names is paired (316.4 owed item 1)', () => {
    const notice = { text: pairedWith('An iPhone'), phoneId: 'p1' };
    expect(noticeToDraw(notice, status({ phones: [phone] }))).toBe('Paired with An iPhone.');
    expect(noticeToDraw(notice, status({ phones: [] }))).toBeNull();
    expect(text(draw({ status: status({ phones: [phone] }), notice }))).toContain('Paired with An iPhone.');
    // Removed: the page does not say it is paired.
    const after = draw({ status: status({ phones: [] }), notice });
    expect(text(after)).not.toContain('Paired with');
  });

  it('says the code expired, and why a first scan failed only for a code shown over an unchecked name (Phase 332)', () => {
    // Shown while main could not check the name, and nobody presented.
    expect(expiredNotice(true, false)).toEqual({
      text: `${CODE_EXPIRED} ${CODE_FIRST_NAME}`,
      phoneId: null
    });
    // A phone presented: it reached the door, so the name was not the trouble.
    expect(expiredNotice(true, true).text).toBe(CODE_EXPIRED);
    // Shown after the name answered: a first scan met a name that exists.
    expect(expiredNotice(false, false).text).toBe(CODE_EXPIRED);
    expect(expiredNotice(false, true).text).toBe(CODE_EXPIRED);
    expect(CODE_FIRST_NAME).toBe(
      'The first time, your Mac’s name can take several minutes to reach your phone. Press Pair again.'
    );
    const drawn = text(draw({ status: status({ state: 'off' }), notice: expiredNotice(true, false) }));
    expect(drawn).toContain(CODE_EXPIRED);
    expect(drawn).toContain(CODE_FIRST_NAME);
  });

  it('no longer times the first-name line from when the door was published', () => {
    expect('FIRST_NAME_MS' in phoneSection).toBe(false);
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'PhoneSection.tsx'), 'utf8');
    expect(source).not.toContain('FIRST_NAME_MS');
    expect(source).not.toContain('publishedAt');
    // The section records, when a code is shown, whether main could not check the name.
    expect(source).toMatch(/shownUnreadableRef\.current = statusRef\.current\?\.nameCheck === 'unreadable'/);
  });
});

describe('pair after Allow', () => {
  const on = (over: Partial<PocketStatus>): PocketStatus => status(over);

  it('waits through the press that turns the door on, and asks for the code once when main says one may show', () => {
    expect(pairAfterAllowNext('pressed', on({ state: 'off', pairable: false }))).toEqual({ phase: 'pressed', pair: false });
    expect(pairAfterAllowNext('pressed', on({ state: 'opening', pairable: false }))).toEqual({ phase: 'on', pair: false });
    expect(
      pairAfterAllowNext('on', on({ state: 'refused', confirmState: 'never', pairable: false }))
    ).toEqual({ phase: 'on', pair: false });
    expect(pairAfterAllowNext('on', on({ state: 'listening' }))).toEqual({ phase: 'no', pair: true });
    expect(pairAfterAllowNext('no', on({ state: 'listening' }))).toEqual({ phase: 'no', pair: false });
  });

  it('keeps the wish while the door answers and its name is checked, and carries it through (Phase 332)', () => {
    const naming = on({ state: 'listening', pairable: false, nameCheck: 'checking' });
    expect(pairAfterAllowNext('pressed', naming)).toEqual({ phase: 'on', pair: false });
    expect(pairAfterAllowNext('on', naming)).toEqual({ phase: 'on', pair: false });
    // Main's word, never the name check: confirmed but not pairable keeps waiting.
    expect(pairAfterAllowNext('on', on({ state: 'listening', pairable: false, nameCheck: 'confirmed' }))).toEqual({
      phase: 'on',
      pair: false
    });
    // Then main says a code may show: asked for once, with no other press.
    expect(pairAfterAllowNext('on', on({ state: 'listening', pairable: true, nameCheck: 'checking' }))).toEqual({
      phase: 'no',
      pair: true
    });
    expect(pairAfterAllowNext('on', on({ state: 'listening', pairable: true, nameCheck: 'unreadable' }))).toEqual({
      phase: 'no',
      pair: true
    });
  });

  it('is dropped by an off after it was on, and by a refusal with nothing to Allow', () => {
    expect(pairAfterAllowNext('on', on({ state: 'off' }))).toEqual({ phase: 'no', pair: false });
    expect(pairAfterAllowNext('on', on({ state: 'refused', publicName: null, confirmState: 'never' }))).toEqual({
      phase: 'no',
      pair: false
    });
    expect(pairAfterAllowNext('on', on({ state: 'refused', confirmState: 'confirmed' }))).toEqual({
      phase: 'no',
      pair: false
    });
  });
});

describe('the phones', () => {
  it('draws each phone with its fingerprint and Remove, no address, and says so when there is none', () => {
    expect(text(draw())).toContain('No phone yet.');
    const html = draw({ status: status({ phones: [phone] }) });
    expect(html).toContain('data-phone-id="p1"');
    expect(html).toContain('data-phone-action="remove-phone"');
    expect(text(html)).toContain(phone.fingerprint);
    expect(text(html)).not.toMatch(/100\.\d+\.\d+\.\d+/);
  });

  it('says once that phones paired before this version must pair again', () => {
    expect(PHONES_DROPPED).toBe('Phones paired before this version must pair again.');
    const html = draw({ status: status({ droppedPhones: 2 }) });
    expect(text(html).split(PHONES_DROPPED)).toHaveLength(2);
    expect(draw()).not.toContain('data-phone-dropped');
  });

  it('draws `Alerts on` for a phone only while this Mac can send (316.5 fix round, research 136)', () => {
    const on = { ...phone, alerts: 'on' as const };
    const can = { pushAlerts: true, confirmState: 'confirmed' as const, pushKeyId: 'ABCDE12345' };
    expect(alertsReachPhones(status(can))).toBe(true);
    expect(text(draw({ status: status({ ...can, phones: [on] }) }))).toContain(ALERTS_ON_CHIP);
    for (const [why, over] of [
      ['the key forgotten', { ...can, pushKeyId: null }],
      ['the switch off', { ...can, pushAlerts: false }],
      ['the agreement changed', { ...can, confirmState: 'changed' as const }]
    ] as const) {
      expect(alertsReachPhones(status(over)), why).toBe(false);
      expect(text(draw({ status: status({ ...over, phones: [on] }) })), why).not.toContain(ALERTS_ON_CHIP);
    }
  });

  it('draws Phase 314’s sentence for a phone whose alerts Apple stopped', () => {
    expect(text(draw({ status: status({ phones: [{ ...phone, alerts: 'stopped' }] }) }))).toContain(PUSH_TOKEN_STOPPED);
    expect(text(draw({ status: status({ phones: [{ ...phone, alerts: 'on' }] }) }))).not.toContain(PUSH_TOKEN_STOPPED);
  });
});

describe('the alert switch', () => {
  function pushSwitch(html: string): string {
    return /<button[^>]*aria-label="Alert my phone when a session waits"[^>]*>/.exec(html)?.[0] ?? '';
  }

  it('is main’s pushAlerts, cannot be turned on while the door is off, and can always be turned off', () => {
    const key = { pushKeyId: 'ABCDE12345' };
    expect(pushSwitch(draw({ status: status({ ...key, pushAlerts: true }) }))).toContain('aria-checked="true"');
    expect(pushSwitch(draw({ status: status({ ...key, state: 'off' }) }))).toContain('disabled=""');
    expect(pushSwitch(draw({ status: status({ ...key, state: 'off', pushAlerts: true }) }))).not.toContain('disabled=""');
    // Alerts left on by an earlier version, with no key: still drawn, so off can be pressed.
    expect(pushSwitch(draw({ status: status({ state: 'off', pushAlerts: true }) }))).not.toContain('disabled=""');
  });
});

describe('turning the alerts off re-confirms only the one line it moved', () => {
  const onLines = [
    ...LINES.slice(0, 4),
    'Tells your phone through Apple when a session starts waiting on you, never what it asks, and nothing while this Mac sleeps',
    LINES[5] ?? ''
  ];

  it('when exactly the switch’s line moved, and never otherwise', () => {
    expect(onlyOneLineMoved(onLines, LINES)).toBe(true);
    const alsoPort = [...LINES];
    alsoPort[0] = `Answers on the internet at https://${NAME}:10000, through Tailscale Funnel on example.github`;
    expect(onlyOneLineMoved(onLines, alsoPort)).toBe(false);
    expect(onlyOneLineMoved(LINES, LINES)).toBe(false);
  });
});

describe('the words the phone quotes stay byte for byte', () => {
  it('declares them exactly as ios/Tortie/Style/Copy.swift quotes them', () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'PhoneSection.tsx'), 'utf8');
    for (const line of [
      "PHONE_TITLE = 'Phone'",
      "BTN_PAIR = 'Pair'",
      "BTN_TRY_AGAIN = 'Try again'",
      "CODE_EXPIRED = 'The code expired. Nothing was paired.'"
    ]) {
      expect(source).toContain(line);
    }
  });
});

describe('the Apple push key (Phase 316.5, research 136)', () => {
  /** The alert switch's button, or '' when none is drawn. */
  const pushSwitch = (html: string): string =>
    /<button[^>]*aria-label="Alert my phone when a session waits"[^>]*>/.exec(html)?.[0] ?? '';

  it('at rest, with no key, draws the key row alone: no switch, no caption and no sentence promise an alert', () => {
    const rest = status();
    expect(pushSwitchShown(rest)).toBe(false);
    const html = draw({ status: rest });
    expect(html).toContain('data-phone-key');
    expect(/data-phone-key-line[^>]*>([^<]*)</.exec(html)?.[1]).toBe(PUSH_KEY_NONE);
    expect(html).toMatch(/<button[^>]*data-phone-action="choose-key"[^>]*>Choose…<\/button>/);
    expect(html).not.toContain('data-phone-action="forget-key"');
    expect(pushSwitch(html)).toBe('');
    expect(html).not.toContain('data-phone-alerts');
    expect(html).not.toContain('data-phone-alert-sentence');
    const page = text(html);
    expect(page).not.toContain(PUSH_LABEL);
    expect(page).not.toContain(PUSH_CAPTION);
    // Before the first read answers there is nothing to draw either from.
    const none = draw({ status: null });
    expect(none).not.toContain('data-phone-key');
    expect(pushSwitch(none)).toBe('');
  });

  it('with a key kept, draws the key by its id with Forget, and the switch after it', () => {
    const kept = status({ pushAlerts: false, pushKeyId: '6782V6SJJ7' });
    expect(pushSwitchShown(kept)).toBe(true);
    const html = draw({ status: kept });
    expect(/data-phone-key-line[^>]*>([^<]*)</.exec(html)?.[1]).toBe('Key 6782V6SJJ7');
    expect(html).toMatch(/<button[^>]*data-phone-action="forget-key"[^>]*>Forget<\/button>/);
    expect(html).toContain('data-phone-action="choose-key"');
    expect(pushSwitch(html)).toContain('aria-checked="false"');
    const page = text(html);
    expect(page.indexOf(PUSH_KEY_LABEL)).toBeGreaterThan(page.indexOf(ALERTS_GROUP));
    expect(page.indexOf(PUSH_LABEL)).toBeGreaterThan(page.indexOf(PUSH_KEY_LABEL));
  });

  it('with the alerts already on and no key, draws the switch too, so it can be turned off', () => {
    const on = status({ pushAlerts: true });
    expect(pushSwitchShown(on)).toBe(true);
    const html = draw({ status: on });
    expect(/data-phone-key-line[^>]*>([^<]*)</.exec(html)?.[1]).toBe(PUSH_KEY_NONE);
    expect(pushSwitch(html)).toContain('aria-checked="true"');
    expect(html).not.toContain('data-phone-action="forget-key"');
  });

  it('disables both presses while a press is under way', () => {
    const html = draw({ status: status({ pushAlerts: true, pushKeyId: 'ABCDE12345' }), busy: true });
    expect(/<button[^>]*data-phone-action="choose-key"[^>]*>/.exec(html)?.[0]).toContain('disabled');
    expect(/<button[^>]*data-phone-action="forget-key"[^>]*>/.exec(html)?.[0]).toContain('disabled');
  });

  it('draws a refusal in the sheet’s one error line', () => {
    const refusal = 'That file is too large to be an Apple push key. Nothing was changed.';
    const html = draw({ status: status(), error: refusal });
    expect(/<div[^>]*role="alert"[^>]*>([^<]*)</.exec(html)?.[1]).toBe(refusal);
  });

  it('draws main’s standing sentence under the switch in the warn style, only when there is one', () => {
    const html = draw({ status: status({ pushAlerts: true, pushSentence: PUSH_NO_KEY }) });
    const line = /<span[^>]*data-phone-alert-sentence[^>]*>([^<]*)</.exec(html);
    expect(line?.[1]).toBe(PUSH_NO_KEY);
    expect(line?.[0]).toContain('phone-warn');
    expect(html.indexOf('data-phone-alert-sentence')).toBeGreaterThan(html.indexOf('data-phone-alerts'));
    expect(draw({ status: status({ pushAlerts: true }) })).not.toContain('data-phone-alert-sentence');
  });

  it('says its words exactly as the SPEC pins them', () => {
    expect(PUSH_KEY_LABEL).toBe('Apple push key');
    expect(PUSH_KEY_NONE).toBe('Not chosen.');
    expect(pushKeyChosen('6782V6SJJ7')).toBe('Key 6782V6SJJ7');
    expect(BTN_CHOOSE_KEY).toBe('Choose…');
    expect(BTN_FORGET_KEY).toBe('Forget');
  });

  it('asks main for the panel and draws main’s refusal, and never reads a file itself', () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'PhoneSection.tsx'), 'utf8');
    const choose = /onChooseKey=\{\(\) => \{([\s\S]*?)\n      \}\}/.exec(source)?.[1] ?? '';
    expect(choose).toContain('api.choosePushKey()');
    expect(choose).toContain('setError(result.refusal)');
    const forget = /onForgetKey=\{\(\) => \{([\s\S]*?)\n      \}\}/.exec(source)?.[1] ?? '';
    expect(forget).toContain('api.forgetPushKey()');
    expect(source).not.toMatch(/showOpenDialog|<input[^>]*type="file"/);
  });
});
