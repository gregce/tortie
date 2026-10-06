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
 * - THE MAC'S NAME CHECK, DRAWN (Phase 332.1, build/p3321/SPEC.md §5.5 and
 *   §7.2): the composers row by row; when the block is drawn, cell by cell;
 *   the naming face's block with its dots, its moving line and its quiet line;
 *   the unreadable sentence inside the block above Pair; `live` only for the
 *   mount that watched the wait, and otherwise today's resting face byte for
 *   byte; no decision moved by the progress; one stamp for every status, a
 *   tick only while the check runs; and the stylesheet's dots and its one
 *   breath, read as text.
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
  POCKET_NAME_ROUND_RULE,
  POCKET_NAME_SENTENCES,
  POCKET_REACH_HONESTY,
  POCKET_DOOR_HONESTY,
  type PocketNameAnswer,
  type PocketNameCheck,
  type PocketNameProgress,
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
  NAME_CHECKING_NOW,
  NAME_DOT_WORDS,
  NAME_LIVE,
  NAME_PUBLISHING,
  PhoneView,
  SCAN_LINE,
  nameBlockShown,
  nameCardWords,
  nameDotsLabel,
  nameElapsed,
  nameNextIn,
  nameSeeing,
  nameTicking,
  nameTimeLine,
  nameTook,
  nameWatchedNext,
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
  type PairAfterAllow,
  type PairingStage,
  type PhoneViewProps
} from '../PhoneSection';
import * as phoneSection from '../PhoneSection';

const NOW = 1_790_000_000_000;
const NAME = 'mac.tail00000.ts.net';

const LINES = [
  `Answers on the internet at https://${NAME}:8443, through Tailscale Funnel on example.github`,
  'Publishes it with /Applications/Tailscale.app/Contents/MacOS/Tailscale',
  'Starts answering when Tortie starts',
  // The ten routes since Phase 337 (build/p337/SPEC.md D35), after Phases 318
  // and 316.7 (build/p3167/SPEC.md §3 row 1), and the line the four writes add
  // after them, as main composes them.
  'Answers these and nothing else: blocked, choose, end, keys, pair, say, screen, session, sessions, turns',
  'Lets an allowed phone end a session, answer a numbered question, send a session one message and type into any session as you would at this Mac',
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
    nameProgress: null,
    routes: ['pair', 'blocked', 'session', 'turns', 'end', 'choose', 'say', 'sessions'],
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
    nameAgeMs: 0,
    nameWatched: false,
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
    expect(page).toContain(POCKET_DOOR_HONESTY);
    // PHASE 317 (SPEC D13, D19, §14 finding 12): the sentence says what an
    // allowed phone can do now, and claims no check the Mac cannot make.
    // PHASE 318 (build/p318/SPEC.md §5.1.7, D28) rewrote it: the phone can now
    // answer a numbered question and send one message too, named in the words
    // the confirm line uses, and "Nothing on it can type into a session" is
    // gone because it is no longer true.
    // PHASE 337 (build/p337/SPEC.md D35, D41) rewrote it again: a phone can
    // now see a session's own screen and type into it, so "It can change
    // nothing else on this Mac" is gone because it is no longer true, and it
    // says what the screen SHOWS because the Screen is not redacted.
    expect(POCKET_DOOR_HONESTY).toBe(
      'A phone you allow can see what any session\u2019s screen shows and type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.'
    );
    expect(POCKET_DOOR_HONESTY).not.toMatch(/change nothing else|cannot type|Nothing on it/);
    expect(POCKET_DOOR_HONESTY).not.toMatch(/Face ID|Touch ID|passcode/);
    expect(POCKET_DOOR_HONESTY).not.toMatch(/\b(pane|window|prefix|terminal|SSH|remote desktop)\b/i);
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
    expect(SCAN_LINE).toBe('Scan it with Tortie on your iPhone, from tortie.sh/iphone.');
    expect(text(html)).toContain(CODE_PRIVATE);
  });

  it('names where the phone app comes from in words, never a link (Phase 333.2)', () => {
    const html = draw({ offer: offer(), view: pairing() });
    // The code's column: everything from its opening tag to the end of the face.
    const at = html.indexOf('<div class="phone-qr-side">');
    expect(at).toBeGreaterThanOrEqual(0);
    const side = html.slice(at);
    const lines = [...side.matchAll(/<p class="phone-line">([\s\S]*?)<\/p>/g)].map((m) => m[1]);
    // The scan line is the column's first line and holds the words alone, no element; the private line second.
    expect(side.indexOf('<p class="phone-line">')).toBe('<div class="phone-qr-side">'.length);
    expect(lines[0]).toBe(SCAN_LINE);
    expect(lines[0]).not.toContain('<');
    expect(lines[1]).toBe(CODE_PRIVATE);
    // Where it comes from: the site's address as words, and no scheme, no store and no TestFlight.
    expect(SCAN_LINE).toContain('tortie.sh/iphone');
    expect(SCAN_LINE).not.toContain('://');
    expect(SCAN_LINE).not.toMatch(/TestFlight/i);
    expect(SCAN_LINE).not.toMatch(/App Store/i);
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
    ...LINES.slice(0, 5),
    'Tells your phone through Apple when a session starts waiting on you, never what it asks, and nothing while this Mac sleeps',
    LINES[6] ?? ''
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

// ---------------------------------------------------------------------------
// The Mac's name check, drawn (Phase 332.1, build/p3321/SPEC.md §5.5, §7.2)
// ---------------------------------------------------------------------------

const SHEET_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const sheetSource = (): string => readFileSync(join(SHEET_DIR, 'PhoneSection.tsx'), 'utf8');

const R: PocketNameAnswer = 'record';
const N: PocketNameAnswer = 'negative';
const U: PocketNameAnswer = 'unreadable';

/** A progress as main composes one: a first round out, unless told otherwise. */
function progress(over: Partial<PocketNameProgress> = {}): PocketNameProgress {
  return { answers: [], asking: true, elapsedMs: 0, nextInMs: null, ...over };
}

/** The naming face: the door answers, main says no code may show, and the check runs. */
function naming(p: PocketNameProgress | null): PocketStatus {
  return status({ pairable: false, nameCheck: 'checking', nameProgress: p });
}

/** The answered round of the flap: two of four see the name, one did not answer. */
const ANSWERED = progress({ answers: [R, N, U, R], asking: false, elapsedMs: 2_000, nextInMs: 20_000 });
/** Round five of his flap: four of four, confirmed at 157 s. */
const FROZEN = progress({ answers: [R, R, R, R], asking: false, elapsedMs: 157_000, nextInMs: null });

/** The opening tag of the first element carrying `attr`, or ''. */
function tagWith(html: string, attr: string): string {
  return new RegExp(`<[a-z]+ [^>]*${attr}[^>]*>`).exec(html)?.[0] ?? '';
}

/** The text of the first element carrying `attr`, or null. */
function textOf(html: string, attr: string): string | null {
  return new RegExp(`<([a-z]+) [^>]*${attr}[^>]*>([^<]*)</\\1>`).exec(html)?.[2] ?? null;
}

/** The value of `name` on an opening tag, or null. */
function attrOf(tag: string, name: string): string | null {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
}

describe('the name check’s words (Phase 332.1, SPEC §5.5.2)', () => {
  it('says them as the SPEC drafts them, with the right apostrophe', () => {
    expect(NAME_PUBLISHING).toBe('Publishing your Mac’s name');
    expect(NAME_LIVE).toBe('Your Mac’s name is live');
    expect(NAME_CHECKING_NOW).toBe('checking now');
    expect(NAME_DOT_WORDS).toEqual({
      record: 'Sees your Mac’s name',
      negative: 'Not there yet',
      unreadable: 'Did not answer'
    });
    expect(POCKET_NAME_ROUND_RULE).toBe(
      'Pair opens when a round finds your Mac’s name and no server says it is missing.'
    );
  });

  it('says the next check rounded UP to 5 s, and `checking now` at 0 or less', () => {
    const rows: [number, string][] = [
      [20_000, 'checking again in 20 s'],
      [19_999, 'checking again in 20 s'],
      [15_001, 'checking again in 20 s'],
      [15_000, 'checking again in 15 s'],
      [1, 'checking again in 5 s'],
      [0, 'checking now'],
      [-5, 'checking now']
    ];
    for (const [ms, words] of rows) expect(nameNextIn(ms), String(ms)).toBe(words);
  });

  it('says the elapsed time in whole minutes, floored, and nothing under one', () => {
    const rows: [number, string | null][] = [
      [59_999, null],
      [60_000, '1 min'],
      [119_999, '1 min'],
      [120_000, '2 min']
    ];
    for (const [ms, words] of rows) expect(nameElapsed(ms), String(ms)).toBe(words);
    expect(nameTook(59_999)).toBe('Took under a minute');
    expect(nameTook(157_000)).toBe('Took 2 min');
  });

  it('counts the servers that see the name, on the line and on the dot row', () => {
    expect(nameSeeing(3, 4)).toBe('3 of 4 see it');
    expect(nameDotsLabel(3, 4)).toBe('3 of 4 name servers see your Mac’s name');
  });

  it('joins the quiet line with the house separator and upper-cases its first letter', () => {
    expect(nameTimeLine(0, null)).toBe('Checking now');
    expect(nameTimeLine(5_000, 20_000)).toBe('Checking again in 20 s');
    expect(nameTimeLine(120_000, 40_000)).toBe('2 min · checking again in 40 s');
    expect(nameTimeLine(180_000, null)).toBe('3 min · checking now');
  });

  it('composes the block for a first round out, an answered round, 11 s later, and 97 s in', () => {
    expect(nameCardWords(naming(progress()), progress(), 0)).toEqual({
      state: 'checking',
      line: NAME_PUBLISHING,
      time: 'Checking now',
      answers: [],
      asking: true
    });
    expect(nameCardWords(naming(ANSWERED), ANSWERED, 0)).toEqual({
      state: 'checking',
      line: 'Publishing your Mac’s name · 2 of 4 see it',
      time: 'Checking again in 20 s',
      answers: [R, N, U, R],
      asking: false
    });
    // The renderer's tick, between pushes: the next check moves down.
    expect(nameCardWords(naming(ANSWERED), ANSWERED, 11_000).time).toBe('Checking again in 10 s');
    const fourth = progress({ answers: [N, R, R, N], asking: false, elapsedMs: 97_000, nextInMs: 60_000 });
    expect(nameCardWords(naming(fourth), fourth, 0).time).toBe('1 min · checking again in 60 s');
    // ... and the elapsed time moves on: 50 s from main and 11 s since is a minute.
    const late = progress({ answers: [R, N, R, N], asking: false, elapsedMs: 50_000, nextInMs: 45_000 });
    expect(nameCardWords(naming(late), late, 11_000).time).toBe('1 min · checking again in 35 s');
  });

  it('says `checking now` while a round is out, whatever is left over of the gap, and keeps the last round’s dots', () => {
    const out = progress({ answers: [R, N, R, N], asking: true, elapsedMs: 20_000, nextInMs: 5_000 });
    const words = nameCardWords(naming(out), out, 3_000);
    expect(words.time).toBe('Checking now');
    expect(words.asking).toBe(true);
    expect(words.answers).toEqual([R, N, R, N]);
    expect(words.line).toBe('Publishing your Mac’s name · 2 of 4 see it');
  });

  it('freezes on a confirmation, ignoring the age, and gives the moving line to main’s unreadable sentence', () => {
    const live = status({ pairable: true, nameCheck: 'confirmed', nameProgress: FROZEN });
    expect(nameCardWords(live, FROZEN, 60_000)).toEqual({
      state: 'live',
      line: NAME_LIVE,
      time: 'Took 2 min',
      answers: [R, R, R, R],
      asking: false
    });
    const silent = progress({ answers: [U, U, U, U], asking: false, elapsedMs: 2_000, nextInMs: 20_000 });
    const opened = status({ pairable: true, nameCheck: 'unreadable', nameProgress: silent });
    expect(nameCardWords(opened, silent, 0)).toEqual({
      state: 'unreadable',
      line: POCKET_NAME_SENTENCES.unreadable,
      time: 'Checking again in 20 s',
      answers: [U, U, U, U],
      asking: false
    });
  });
});

describe('when the name check’s block is drawn (Phase 332.1, SPEC §5.5.1)', () => {
  const STAGES: PairingStage[] = ['start', 'waiting', 'naming', 'ready', 'showing', 'match'];
  const CHECKS: PocketNameCheck[] = ['none', 'checking', 'confirmed', 'unreadable'];
  // The cells that draw it, listed rather than worked out: every naming face
  // with a progress; the ready face with a progress over an unreadable name,
  // or over a confirmed one this mount watched.
  const DRAWN = new Set([
    ...CHECKS.flatMap((c) => [`naming/progress/${c}/false`, `naming/progress/${c}/true`]),
    'ready/progress/unreadable/false',
    'ready/progress/unreadable/true',
    'ready/progress/confirmed/true'
  ]);

  it('draws it in exactly the cells the SPEC names, every stage by progress by name check by watched', () => {
    let cells = 0;
    for (const stage of STAGES) {
      for (const p of [null, ANSWERED]) {
        for (const nameCheck of CHECKS) {
          for (const watched of [false, true]) {
            const key = `${stage}/${p === null ? 'none' : 'progress'}/${nameCheck}/${String(watched)}`;
            const s = status({ nameCheck, nameProgress: p });
            expect(nameBlockShown(s, stage, watched), key).toBe(DRAWN.has(key));
            cells += 1;
          }
        }
      }
      expect(nameBlockShown(null, stage, true), `${stage}/no status`).toBe(false);
    }
    expect(cells).toBe(96);
  });

  it('remembers the wait from the naming face with a progress, until a code shows or the door is off', () => {
    expect(nameWatchedNext(false, 'naming', naming(ANSWERED))).toBe(true);
    expect(nameWatchedNext(false, 'naming', naming(null))).toBe(false);
    expect(nameWatchedNext(true, 'naming', naming(null))).toBe(true);
    for (const stage of ['waiting', 'ready', 'match'] as const) {
      expect(nameWatchedNext(true, stage, status({ nameProgress: FROZEN })), stage).toBe(true);
      expect(nameWatchedNext(false, stage, status({ nameProgress: FROZEN })), stage).toBe(false);
    }
    expect(nameWatchedNext(true, 'showing', status({ nameProgress: FROZEN }))).toBe(false);
    expect(nameWatchedNext(true, 'start', status({ state: 'off', nameProgress: null }))).toBe(false);
    expect(nameWatchedNext(true, 'naming', null)).toBe(true);
  });

  it('ticks only while the block is drawn and the check still runs', () => {
    expect(nameTicking(naming(ANSWERED), 'naming', false)).toBe(true);
    expect(nameTicking(status({ nameCheck: 'unreadable', nameProgress: ANSWERED }), 'ready', false)).toBe(true);
    // Frozen once confirmed, and drawn only for a mount that watched.
    expect(nameTicking(status({ nameCheck: 'confirmed', nameProgress: FROZEN }), 'ready', true)).toBe(false);
    expect(nameTicking(status({ nameCheck: 'confirmed', nameProgress: FROZEN }), 'ready', false)).toBe(false);
    expect(nameTicking(naming(null), 'naming', true)).toBe(false);
    expect(nameTicking(status({ state: 'off', nameCheck: 'checking', nameProgress: ANSWERED }), 'start', true)).toBe(false);
    expect(nameTicking(null, 'naming', true)).toBe(false);
  });
});

describe('the name check, drawn on the card (Phase 332.1, SPEC §5.5.3)', () => {
  it('draws the naming face’s block: its hover, four dots in server order, the count, the moving and the quiet line, and no Pair', () => {
    const html = draw({ status: naming(ANSWERED) });
    expect(html).toContain('data-phone-stage="naming"');
    const block = tagWith(html, 'data-phone-name="true"');
    expect(attrOf(block, 'data-phone-name-state')).toBe('checking');
    expect(attrOf(block, 'title')).toBe(POCKET_NAME_SENTENCES.checking);
    // The checking sentence moved to the hover: the visible text no longer says it.
    expect(text(html)).not.toContain(POCKET_NAME_SENTENCES.checking);
    expect([...html.matchAll(/data-answer="([a-z]+)"/g)].map((m) => m[1])).toEqual([R, N, U, R]);
    expect([...html.matchAll(/<span class="phone-name-dot" data-answer="([a-z]+)" title="([^"]*)"/g)].map((m) => [m[1], m[2]])).toEqual(
      [R, N, U, R].map((a) => [a, NAME_DOT_WORDS[a]])
    );
    const dots = tagWith(html, 'data-phone-name-dots');
    expect(attrOf(dots, 'data-asking')).toBe('false');
    expect(attrOf(dots, 'role')).toBe('img');
    expect(attrOf(dots, 'aria-label')).toBe('2 of 4 name servers see your Mac’s name');
    expect(attrOf(dots, 'aria-hidden')).toBeNull();
    const line = tagWith(html, 'data-phone-name-line');
    expect(attrOf(line, 'aria-live')).toBe('polite');
    expect(textOf(html, 'data-phone-name-line')).toBe('Publishing your Mac’s name · 2 of 4 see it');
    expect(html).not.toContain('data-phone-name-unreadable');
    expect(textOf(html, 'data-phone-name-time')).toBe('Checking again in 20 s');
    expect(attrOf(tagWith(html, 'data-phone-name-time'), 'title')).toBe(POCKET_NAME_ROUND_RULE);
    expect(html).not.toContain('data-phone-action="pair"');
    // The dots come first in the row, then the moving line, then the quiet line.
    expect(html.indexOf('data-phone-name-dots')).toBeLessThan(html.indexOf('data-phone-name-line'));
    expect(html.indexOf('data-phone-name-line')).toBeLessThan(html.indexOf('data-phone-name-time'));
  });

  it('marks the dot row while a round is out, and moves the quiet line by the age it is handed', () => {
    const out = progress({ answers: [R, N, R, N], asking: true, elapsedMs: 20_000, nextInMs: null });
    const html = draw({ status: naming(out) });
    expect(attrOf(tagWith(html, 'data-phone-name-dots'), 'data-asking')).toBe('true');
    expect(textOf(html, 'data-phone-name-time')).toBe('Checking now');
    expect(textOf(draw({ status: naming(ANSWERED), nameAgeMs: 11_000 }), 'data-phone-name-time')).toBe(
      'Checking again in 10 s'
    );
  });

  it('before any round answered: no dots, and the dot row hidden from assistive tech with no role', () => {
    const html = draw({ status: naming(progress()) });
    const dots = tagWith(html, 'data-phone-name-dots');
    expect(attrOf(dots, 'aria-hidden')).toBe('true');
    expect(attrOf(dots, 'role')).toBeNull();
    expect(attrOf(dots, 'aria-label')).toBeNull();
    expect(html).not.toContain('data-answer=');
    expect(textOf(html, 'data-phone-name-line')).toBe(NAME_PUBLISHING);
    expect(textOf(html, 'data-phone-name-time')).toBe('Checking now');
  });

  it('with no progress, still draws today’s one line on the naming face', () => {
    const html = draw({ status: naming(null) });
    expect(html).not.toContain('data-phone-name=');
    expect(text(html)).toContain(POCKET_NAME_SENTENCES.checking);
  });

  it('over a name main could not confirm: the unreadable sentence inside the block, the check going on under it, Pair below', () => {
    const silent = progress({ answers: [U, U, U, U], asking: false, elapsedMs: 2_000, nextInMs: 20_000 });
    const html = draw({ status: status({ pairable: true, nameCheck: 'unreadable', nameProgress: silent }) });
    expect(html).toContain('data-phone-stage="ready"');
    const block = tagWith(html, 'data-phone-name="true"');
    expect(attrOf(block, 'data-phone-name-state')).toBe('unreadable');
    // The block's hover belongs to the naming face alone.
    expect(attrOf(block, 'title')).toBeNull();
    // ONE unreadable line, and it is the block's moving line (probe:p332 H6 reads it there).
    expect(html.split('data-phone-name-unreadable')).toHaveLength(2);
    const line = tagWith(html, 'data-phone-name-unreadable');
    expect(line).toContain('data-phone-name-line');
    expect(textOf(html, 'data-phone-name-unreadable')).toBe(POCKET_NAME_SENTENCES.unreadable);
    expect(textOf(html, 'data-phone-name-time')).toBe('Checking again in 20 s');
    expect(attrOf(tagWith(html, 'data-phone-name-time'), 'title')).toBe(POCKET_NAME_ROUND_RULE);
    expect(html.indexOf('data-phone-name="true"')).toBeLessThan(html.indexOf('data-phone-action="pair"'));
    expect(html.indexOf('data-phone-name-unreadable')).toBeLessThan(html.indexOf('data-phone-action="pair"'));
  });

  it('confirmed while this mount watched: `live` and how long it took, frozen, before Pair', () => {
    const html = draw({
      status: status({ pairable: true, nameCheck: 'confirmed', nameProgress: FROZEN }),
      nameWatched: true,
      nameAgeMs: 60_000
    });
    const block = tagWith(html, 'data-phone-name="true"');
    expect(attrOf(block, 'data-phone-name-state')).toBe('live');
    expect(attrOf(block, 'title')).toBeNull();
    expect(textOf(html, 'data-phone-name-line')).toBe(NAME_LIVE);
    expect(textOf(html, 'data-phone-name-time')).toBe('Took 2 min');
    expect(attrOf(tagWith(html, 'data-phone-name-time'), 'title')).toBeNull();
    expect([...html.matchAll(/data-answer="([a-z]+)"/g)].map((m) => m[1])).toEqual([R, R, R, R]);
    expect(html).not.toContain('data-phone-name-unreadable');
    const page = text(html);
    expect(page.indexOf(NAME_LIVE)).toBeLessThan(page.indexOf('Took 2 min'));
    expect(html.indexOf('data-phone-name-time')).toBeLessThan(html.indexOf('data-phone-action="pair"'));
  });

  it('confirmed and NOT watched: today’s resting face, byte for byte', () => {
    const s = status({ pairable: true, nameCheck: 'confirmed', nameProgress: FROZEN });
    const html = draw({ status: s, nameWatched: false, nameAgeMs: 60_000 });
    expect(html).toBe(draw({ status: { ...s, nameProgress: null } }));
    expect(html).not.toContain('data-phone-name');
    expect(html).toContain('data-phone-action="pair"');
  });

  it('never on the start or the waiting face, whatever is left over', () => {
    for (const s of [
      status({ state: 'off', pairable: false, nameCheck: 'checking', nameProgress: ANSWERED }),
      status({ state: 'opening', pairable: false, nameCheck: 'checking', nameProgress: ANSWERED })
    ]) {
      for (const watched of [false, true]) {
        const html = draw({ status: s, nameWatched: watched });
        expect(html, s.state).not.toContain('data-phone-name');
      }
    }
  });

  it('is the first thing after the notice on both faces, so nothing above Pair moves when Pair appears', () => {
    const notice = { text: CODE_EXPIRED, phoneId: null };
    const before = draw({ status: naming(ANSWERED), notice });
    const after = draw({
      status: status({ pairable: true, nameCheck: 'unreadable', nameProgress: ANSWERED }),
      notice,
      nameWatched: true
    });
    for (const html of [before, after]) {
      const card = html.slice(html.indexOf('data-phone-stage='));
      expect(card.indexOf('phone-notice')).toBeLessThan(card.indexOf('data-phone-name="true"'));
      // Nothing between the notice and the block.
      const between = card.slice(card.indexOf(CODE_EXPIRED) + CODE_EXPIRED.length, card.indexOf('data-phone-name="true"'));
      expect(between).toMatch(/^<\/p><div class="phone-name" $/);
    }
  });
});

describe('the progress decides nothing (Phase 332.1, SPEC §5.5.6)', () => {
  const PROGRESSES: [string, PocketNameProgress | null][] = [
    ['none', null],
    ['asking', progress({ answers: [R, N, R, N], asking: true, elapsedMs: 20_000 })],
    ['answered', ANSWERED],
    ['frozen', FROZEN]
  ];
  const STATES = ['listening', 'off', 'opening', 'refused'] as const;
  const PHASES: PairAfterAllow[] = ['no', 'pressed', 'on'];

  it('pairingStage and pairAfterAllowNext answer the same for every progress, at every pairable', () => {
    for (const state of STATES) {
      for (const pairable of [false, true]) {
        for (const nameCheck of ['checking', 'confirmed', 'unreadable'] as const) {
          const bare = status({ state, pairable, nameCheck, nameProgress: null });
          for (const [name, p] of PROGRESSES) {
            const s = { ...bare, nameProgress: p };
            const key = `${state}/${String(pairable)}/${nameCheck}/${name}`;
            expect(pairingStage(s, null, null, NOW), key).toBe(pairingStage(bare, null, null, NOW));
            for (const phase of PHASES) {
              expect(pairAfterAllowNext(phase, s), `${key}/${phase}`).toEqual(pairAfterAllowNext(phase, bare));
            }
          }
        }
      }
    }
  });

  it('names no nameProgress in pairingStage, pairAfterAllowNext or onPair, and keeps main’s line byte for byte', () => {
    const source = sheetSource();
    const body = (name: string): string => {
      const at = source.indexOf(`export function ${name}(`);
      expect(at, name).toBeGreaterThanOrEqual(0);
      return source.slice(at, source.indexOf('\n}\n', at));
    };
    expect(body('pairingStage')).not.toContain('nameProgress');
    expect(body('pairAfterAllowNext')).not.toContain('nameProgress');
    const onPair = /onPair=\{\(\) => \{([\s\S]*?)\n      \}\}/.exec(source)?.[1] ?? '';
    expect(onPair).not.toBe('');
    expect(onPair).not.toContain('nameProgress');
    expect(source.split("  return status.pairable ? 'ready' : 'naming';\n")).toHaveLength(2);
  });
});

describe('the section stamps every status and ticks only while the check runs (Phase 332.1, SPEC §5.5.5)', () => {
  it('sets the status in ONE place, which stamps it on the renderer’s monotonic clock', () => {
    const source = sheetSource();
    expect(source.split('setStatus(')).toHaveLength(2);
    const adopt = /const adopt = useCallback\(\(s: PocketStatus\): void => \{([\s\S]*?)\n  \}, \[\]\);/.exec(source)?.[1] ?? '';
    expect(adopt).toContain('setStatus(s);');
    expect(adopt).toMatch(/const at = performance\.now\(\);/);
    expect(adopt).toContain('setStatusAt(at);');
    expect(adopt).toContain('setMono(at);');
    // The first pull, main's pushes, and the six press answers.
    expect(source.match(/\badopt\(/g)).toHaveLength(8);
    expect(source).toContain('nameAgeMs={Math.max(0, mono - statusAt)}');
    expect(source).not.toMatch(/Date\.now\(\)[^\n]*mono|mono[^\n]*Date\.now\(\)/);
  });

  it('keeps one interval of a second, only while nameTicking says so, and the watched flag by nameWatchedNext', () => {
    const source = sheetSource();
    expect(source).toContain('const ticking = nameTicking(status, stage, nameWatched);');
    expect(source).toMatch(
      /if \(!ticking\) return;\n\s*const id = window\.setInterval\(\(\) => setMono\(performance\.now\(\)\), 1000\);\n\s*return \(\) => window\.clearInterval\(id\);\n\s*\}, \[ticking\]\);/
    );
    expect(source).toContain('setNameWatched((watched) => nameWatchedNext(watched, stage, status));');
    expect(source).toContain('const stage = pairingStage(status, offer, view, now);');
    // The section with no bridge hands the view a still clock and no wait.
    expect(source).toMatch(/now=\{now\}\n\s*nameAgeMs=\{0\}\n\s*nameWatched=\{false\}/);
  });
});

describe('the name check’s look, read as text (Phase 332.1, SPEC §5.5.4)', () => {
  const css = readFileSync(join(SHEET_DIR, 'phone-section.css'), 'utf8');
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  /** Every rule whose selector names the name block, as [selector, body]. */
  const rules = [...bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => [(m[1] ?? '').trim(), m[2] ?? ''] as const)
    .filter(([selector]) => selector.includes('.phone-name'));
  const decl = (selector: string, property: string): string | null => {
    const rule = rules.find(([s]) => s === selector);
    return rule === undefined ? null : (new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+);`).exec(rule[1])?.[1]?.trim() ?? null);
  };

  it('has the block’s rules, and none of them animates, loops, or borrows a status or the accent', () => {
    expect(rules.map(([s]) => s)).toEqual([
      '.phone-name',
      '.phone-name-row',
      '.phone-name-row > .phone-line',
      '.phone-name-dots',
      ".phone-name-dots[data-asking='true']",
      '.phone-name-dot',
      ".phone-name-dot[data-answer='record']",
      '.phone-name-time'
    ]);
    for (const [selector, body] of rules) {
      expect(body, selector).not.toMatch(/animation|infinite|--status-|--accent/);
    }
    expect(bare).not.toContain('@keyframes');
    expect(bare).not.toMatch(/animation/);
  });

  it('breathes once a round: ONE transition, opacity on the dot row, at --dur-base, and half opacity while asking', () => {
    const transitions = rules.filter(([, body]) => /transition/.test(body));
    expect(transitions.map(([s]) => s)).toEqual(['.phone-name-dots']);
    expect(decl('.phone-name-dots', 'transition')).toBe('opacity var(--dur-base) var(--ease-out)');
    expect(decl(".phone-name-dots[data-asking='true']", 'opacity')).toBe('0.5');
    expect(rules.filter(([, body]) => /opacity/.test(body)).map(([s]) => s)).toEqual([
      '.phone-name-dots',
      ".phone-name-dots[data-asking='true']"
    ]);
  });

  it('draws its colours from --text-secondary and --text-muted alone: filled for the record, else the 1.5px ring', () => {
    const colours = new Set<string>();
    for (const [, body] of rules) {
      for (const m of body.matchAll(/(color|background|background-color|box-shadow|border[a-z-]*|outline[a-z-]*|fill|stroke)\s*:\s*([^;]+);/g)) {
        for (const v of (m[2] ?? '').matchAll(/var\((--[a-z0-9-]+)\)/g)) colours.add(v[1] ?? '');
        expect(m[2], m[0]).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(?:white|black|red|amber|orange|blue)\b/i);
      }
    }
    expect([...colours].sort()).toEqual(['--text-muted', '--text-secondary']);
    expect(decl('.phone-name-dot', 'box-shadow')).toBe('inset 0 0 0 1.5px var(--text-muted)');
    expect(decl('.phone-name-dot', 'background')).toBe('transparent');
    expect(decl(".phone-name-dot[data-answer='record']", 'background')).toBe('var(--text-secondary)');
    expect(decl(".phone-name-dot[data-answer='record']", 'box-shadow')).toBe('none');
    // The header names the one measure that is not a token.
    expect(css.slice(0, css.indexOf('*/'))).toContain('1.5px ring');
  });

  it('keeps its place: 6px dots in a four-dot slot, and both rows at their line height whatever they say', () => {
    expect(decl('.phone-name-dot', 'width')).toBe('var(--space-3)');
    expect(decl('.phone-name-dot', 'height')).toBe('var(--space-3)');
    expect(decl('.phone-name', '--phone-name-dots')).toBe('calc(4 * var(--space-3) + 3 * var(--space-2))');
    expect(decl('.phone-name-dots', 'width')).toBe('var(--phone-name-dots)');
    // One dot high before any dot: an empty row is otherwise 0px and moves when the first dots arrive.
    expect(decl('.phone-name-dots', 'height')).toBe('var(--space-3)');
    expect(decl('.phone-name-dots', 'flex')).toBe('0 0 auto');
    expect(decl('.phone-name-row', 'min-height')).toBe('var(--lh-sm)');
    expect(decl('.phone-name-time', 'min-height')).toBe('var(--lh-xs)');
    expect(decl('.phone-name-time', 'margin')).toBe('0 0 0 calc(var(--phone-name-dots) + var(--space-3))');
    expect(decl('.phone-name', 'align-self')).toBe('stretch');
  });

  it('names no session dot class anywhere in the sheet', () => {
    const source = sheetSource();
    const classes = [...source.matchAll(/className=(?:"([^"]*)"|\{[^}]*?['"`]([^'"`]*)['"`])/g)].flatMap((m) =>
      (m[1] ?? m[2] ?? '').split(/\s+/)
    );
    expect(classes.length).toBeGreaterThan(10);
    expect(classes).toContain('phone-name-dot');
    for (const name of classes) {
      expect(name === 'dot' || name.startsWith('dot-'), name).toBe(false);
    }
  });
});

describe('the sheet draws no link in any face (Phase 333.2, build/p3332/SPEC.md §4.3)', () => {
  // The hostile half of "text only": the scan line names tortie.sh/iphone in
  // words, and a later round that turns those words, or anything else on the
  // sheet, into a link fails here. Every face this file's fixtures draw.
  const key = { pushKeyId: 'ABCDE12345' };
  const presented = pairing({
    state: 'presented',
    label: 'An iPhone',
    fingerprint: 'ab12 cd34 ef56 0718 293a 4b5c',
    lines: ['Allows the phone "An iPhone", key ab12 cd34 ef56 0718 293a 4b5c'],
    hash: 'p'.repeat(64)
  });
  const FACES: [string, Partial<PhoneViewProps>][] = [
    ['no bridge', { supported: false }],
    ['before the first read', { status: null }],
    ['door off', { status: status({ state: 'off' }) }],
    ['waiting', { status: status({ state: 'opening' }) }],
    ['naming, one line', { status: naming(null) }],
    ['naming, the block', { status: naming(ANSWERED) }],
    ['ready', {}],
    ['the unreadable line', { status: status({ pairable: true, nameCheck: 'unreadable', nameProgress: ANSWERED }) }],
    [
      'live, watched',
      { status: status({ pairable: true, nameCheck: 'confirmed', nameProgress: FROZEN }), nameWatched: true }
    ],
    ['showing', { offer: offer(), view: pairing() }],
    ['showing, with a key and the alerts on', { status: status({ ...key, pushAlerts: true }), offer: offer(), view: pairing() }],
    ['match', { offer: offer(), view: presented }],
    ['the confirm lines', { status: status({ state: 'refused', confirmState: 'changed' }) }],
    [
      'the confirm lines, with the standing-right warning',
      { status: status({ state: 'refused', confirmState: 'never', funnel: { ...status().funnel, asksApproval: true } }) }
    ],
    [
      'the approval, Open Tailscale',
      {
        status: status({
          state: 'opening',
          funnel: { ...status().funnel, state: 'approval', approvalOpens: true, approvalText: null }
        })
      }
    ],
    [
      'the approval, another page as text',
      {
        status: status({
          state: 'opening',
          funnel: {
            ...status().funnel,
            state: 'approval',
            approvalOpens: false,
            approvalText: 'https://example.invalid/f/funnel'
          }
        })
      }
    ],
    ['a refusal and Try again', { status: status({ state: 'refused', refusal: 'port taken' }) }],
    ['with no key', { status: status() }],
    ['with a key', { status: status(key) }],
    ['with a key and the alerts on', { status: status({ ...key, pushAlerts: true, pushSentence: PUSH_NO_KEY }) }],
    ['alerts on with no key', { status: status({ pushAlerts: true }) }],
    [
      'a phone, its alerts, a notice and an error',
      {
        status: status({ ...key, pushAlerts: true, phones: [{ ...phone, alerts: 'on' }], droppedPhones: 1 }),
        notice: { text: pairedWith('An iPhone'), phoneId: 'p1' },
        error: 'main says why'
      }
    ],
    ['the code expired', { status: status({ state: 'off' }), notice: expiredNotice(true, false) }]
  ];

  for (const [name, over] of FACES) {
    it(`holds no <a and no href=: ${name}`, () => {
      const html = draw(over);
      expect(html.length, name).toBeGreaterThan(0);
      expect(html, name).not.toMatch(/<a\b/i);
      expect(html, name).not.toContain('href=');
    });
  }

  it('reached the scan line: the showing faces draw it', () => {
    const showing = FACES.filter(([name]) => name.startsWith('showing'));
    expect(showing).toHaveLength(2);
    for (const [name, over] of showing) expect(text(draw(over)), name).toContain(SCAN_LINE);
  });
});
