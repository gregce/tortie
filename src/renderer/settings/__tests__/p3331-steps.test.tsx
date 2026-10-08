/**
 * Settings then Phone in three steps (Phase 333.1, build/p3331/SPEC.md §5.4,
 * §7.2, D1, D16 to D19).
 *
 * The vitest environment is node, so the faces are read as static markup from
 * react-dom/server, and the connected section's effects and presses are run
 * by hand: `react`'s `useEffect` is recorded instead of dropped (a server
 * render drops it anyway), and the steps card is wrapped so the section's own
 * props, the presses included, can be read off the body it hands the card.
 * Nothing here is a copy of the shipping code: the effect run is the section's
 * own, over a window and a document of plain `EventTarget`s, through the one
 * `onWindowLooked` helper the section subscribes to. One harness more, `live`,
 * keeps the section's hooks across renders by call order, as React does, so a
 * press, main's answer to it and main's pushes reach its effects in order.
 *
 * What these tests hold, each red if its clause is taken out:
 *
 * - THE COMPOSER, `checklistOf`, row by row over §5.4.2 to §5.4.4, first match
 *   wins: step 1's seven rows, step 2's ten, step 3's six faces; the marks
 *   (done, current, not reached); and that it reads main's predicates
 *   (`tailscale`, `setupActions`, `confirmable`, `funnel.refused`) and never
 *   works them out, so a status whose fields contradict what a renderer could
 *   work out is drawn as main says.
 * - A REFUSAL IS DRAWN ONCE, by the step that owns it: step 1 for Tailscale's
 *   own states and its five words, step 2 for the rest, including a START that
 *   refused with one of step 1's words over a read that answered.
 * - THE FACES, drawn: the switch's one caption on every state; the three
 *   headers always; TODAY'S CONFIRM BLOCK BYTE FOR BYTE and never inside a
 *   disclosure; What’s this? and What this allows shut; no `<a` on any face;
 *   the setup buttons only when listed, the quiet Try again beside the one
 *   button; the publisher caption with and without a key; the code's two
 *   lines in words; the name check's wait note for exactly as long as the
 *   block.
 * - THE RETURN (D16): `recheck` once at mount while the window has the focus,
 *   none without it, once per focus and per visible `visibilitychange`, none
 *   for a hidden one, none on any clock, and the helper's count back where it
 *   was after unmount, with no recheck after.
 * - THE PRESSES: each button drawn calls the handler its `data-phone-action`
 *   hook names, and a setup press hands main its closed word alone (D12).
 * - THE WISH (D17): set by the switch's on press and by Try again only while
 *   main answered and no phone is paired, never while the status is unread,
 *   and kept across a refusal while main says `rechecks`. AND DRIVEN through
 *   the section's own effects across renders (a live render of its hooks):
 *   Try again over a refusal no return re-checks carries the wish to a code
 *   shown by itself, because a press is judged by main's answer to it and
 *   never by the refusal drawn before it; once main has answered, such a
 *   refusal still drops the wish, as today.
 * - THE SPLIT (D19): the composer is pure, imports neither PhoneSection.tsx
 *   nor React, names nothing of the name check, and PhoneSection.tsx
 *   re-exports what moved.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  POCKET_ASK_ADMIN,
  POCKET_CONFIRM_WARNING,
  POCKET_DOOR_HONESTY,
  POCKET_FUNNEL_APPROVAL,
  POCKET_FUNNEL_APPROVAL_ELSEWHERE,
  POCKET_FUNNEL_RESTARTING,
  POCKET_FUNNEL_RIGHT_WARNING,
  POCKET_FUNNEL_SENTENCES,
  POCKET_NAME_SENTENCES,
  POCKET_NAME_WAIT_NOTE,
  POCKET_REACH_HONESTY,
  POCKET_SETUP_LINE,
  POCKET_SIGN_IN,
  POCKET_SIGN_IN_LINE,
  POCKET_TURN_ON,
  POCKET_TURN_ON_LINE,
  type PocketFunnelRefusal,
  type PocketFunnelView,
  type PocketNameProgress,
  type PocketPairingView,
  type PocketSetupAction,
  type PocketStatus
} from '@shared/ipc';
import { PUSH_PUBLISHER_ONLY } from '@shared/push-copy';
import { lookedListenerCount } from '../../machines/remote-writes';
import * as phoneSection from '../PhoneSection';
import {
  ALERTS_GROUP,
  BTN_ALLOW,
  BTN_OPEN_TAILSCALE,
  BTN_TRY_AGAIN,
  CODE_PRIVATE,
  DOOR_LABEL,
  GET_PHONE_APP,
  PHONES_GROUP,
  PhoneSection,
  PhoneView,
  SCAN_LINE,
  pairAfterAllowNext,
  wishAwaitsAnswer,
  type PhoneViewProps
} from '../PhoneSection';
import * as steps from '../phone/steps';
import {
  BTN_COPY_LINK,
  BTN_GET_TAILSCALE,
  BTN_OPEN_TAILSCALE_APP,
  DISCLOSE_WHAT_ALLOWS,
  DISCLOSE_WHATS_THIS,
  DOOR_NOT_LISTENING,
  DOOR_OPENING,
  STATE_CHANGED,
  STATE_CHECKING,
  STATE_INSTALLED,
  STATE_NOT_INSTALLED,
  STATE_NOT_RUNNING,
  STATE_PAIRED,
  STATE_PUBLISHED,
  STATE_READ_ALLOW,
  STATE_SIGNED_OUT,
  STATE_WAITING_ADMIN,
  STATE_WAITING_TAILSCALE,
  STEP_PAIR,
  STEP_PUBLISH,
  STEP_TAILSCALE,
  checklistOf,
  doorListening,
  tailscaleLine,
  type PairingStage,
  type StepFace,
  type StepPiece
} from '../phone/steps';
import type { StepsCardProps } from '../phone/StepsCard';

// ---------------------------------------------------------------------------
// The two seams: react's effects recorded, and the steps card's props read
// ---------------------------------------------------------------------------

const hoisted = vi.hoisted(() => ({
  /** Every effect a render asked for, in order. */
  effects: [] as { fn: () => unknown; deps: readonly unknown[] | undefined }[],
  /** Every props object the steps card was drawn with. */
  cards: [] as unknown[],
  /** Every value the section handed the wish's setter. */
  wishes: [] as unknown[],
  /** A status the section's first `useState(null)` answers, for one render. */
  inject: null as null | { status: unknown; used: boolean },
  /**
   * THE LIVE MODE (see `live` below): while set, the section's four hooks keep
   * their values across renders, slot by slot in call order, as React keeps
   * them, so the section renders again after a press or a push and its effects
   * run when their dependencies moved. Only PhoneSection calls these hooks.
   */
  live: null as null | {
    slots: unknown[];
    at: number;
    dirty: boolean;
    pending: { fn: () => unknown; deps: readonly unknown[] | undefined }[];
  }
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  /** The live mode's next slot, made once by `make`. */
  const slot = <T,>(make: () => T): T => {
    const h = hoisted.live;
    if (h === null) throw new Error('no live render');
    const i = h.at;
    h.at += 1;
    if (!(i in h.slots)) h.slots[i] = make();
    return h.slots[i] as T;
  };
  const sameDeps = (a: readonly unknown[] | undefined, b: readonly unknown[] | undefined): boolean =>
    a !== undefined && b !== undefined && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const useEffect = (fn: () => unknown, deps?: readonly unknown[]): void => {
    if (hoisted.live !== null) {
      hoisted.live.pending.push({ fn, deps });
      return;
    }
    hoisted.effects.push({ fn, deps });
  };
  const useRef = (init: unknown): { current: unknown } =>
    hoisted.live !== null ? slot(() => ({ current: init })) : actual.useRef(init);
  const useCallback = <F,>(fn: F, deps: readonly unknown[]): F => {
    if (hoisted.live === null) return actual.useCallback(fn as never, deps) as F;
    const cell = slot(() => ({ fn, deps }));
    if (!sameDeps(cell.deps, deps)) {
      cell.fn = fn;
      cell.deps = deps;
    }
    return cell.fn;
  };
  const useState = (init: unknown): [unknown, (next: unknown) => void] => {
    const live = hoisted.live;
    if (live !== null) {
      const cell = slot(() => {
        const c = { value: typeof init === 'function' ? (init as () => unknown)() : init, set: (_next: unknown): void => undefined };
        c.set = (next: unknown): void => {
          const value = typeof next === 'function' ? (next as (v: unknown) => unknown)(c.value) : next;
          if (init === 'no') hoisted.wishes.push(value);
          if (Object.is(value, c.value)) return;
          c.value = value;
          live.dirty = true;
        };
        return c;
      });
      return [cell.value, cell.set];
    }
    const [value, set] = actual.useState(init) as [unknown, (next: unknown) => void];
    if (init === null && hoisted.inject !== null && !hoisted.inject.used) {
      hoisted.inject.used = true;
      return [hoisted.inject.status, set];
    }
    // The wish is the one state that starts at 'no' (PairAfterAllow).
    if (init === 'no') {
      return [
        value,
        (next) => {
          hoisted.wishes.push(next);
          set(next);
        }
      ];
    }
    return [value, set];
  };
  const hooks = { useCallback, useEffect, useRef, useState };
  return { ...actual, default: { ...actual, ...hooks }, ...hooks };
});

vi.mock('../phone/StepsCard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../phone/StepsCard')>();
  return {
    StepsCard: (props: StepsCardProps): React.JSX.Element => {
      hoisted.cards.push(props);
      return actual.StepsCard(props);
    }
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NAME = 'mac.tail00000.ts.net';
const NOW = 1_790_000_000_000;
const HERE = dirname(fileURLToPath(import.meta.url));
const SHEET_DIR = join(HERE, '..');
const LINES = [
  `Answers on the internet at https://${NAME}:8443, through Tailscale Funnel on example.github`,
  'Publishes it with /Applications/Tailscale.app/Contents/MacOS/Tailscale',
  'Starts answering when Tortie starts',
  'Allows no phone yet'
];

/**
 * A status as main composes one, defaulting to a first setup's door that is
 * on and refused with nothing read: Tailscale `installed`, no refusal word,
 * nothing listed, nothing to agree to.
 */
function st(over: Partial<PocketStatus> = {}, funnel: Partial<PocketFunnelView> = {}): PocketStatus {
  return {
    state: 'refused',
    publicName: NAME,
    publicPort: 8443,
    bindAtLaunch: true,
    certificateFingerprint: null,
    refusal: null,
    phones: [],
    droppedPhones: 0,
    funnel: { state: 'idle', asksApproval: false, approvalOpens: false, approvalText: null, refused: null, ...funnel },
    confirmState: 'never',
    confirmLines: LINES,
    confirmHash: 'h'.repeat(64),
    confirmable: false,
    nameCheck: 'none',
    pairable: false,
    tailscale: 'installed',
    account: null,
    tailnet: null,
    rechecks: false,
    setupActions: [],
    nameProgress: null,
    routes: ['pair', 'blocked', 'session', 'turns', 'end'],
    pushAlerts: false,
    pushKeyId: null,
    pushSentence: null,
    ...over
  };
}

/** His already-set-up Mac: ready, published, a phone paired. */
function setUp(over: Partial<PocketStatus> = {}): PocketStatus {
  return st(
    {
      state: 'listening',
      confirmState: 'confirmed',
      confirmable: true,
      tailscale: 'ready',
      account: 'person@example.com',
      tailnet: 'standin@example.com',
      nameCheck: 'confirmed',
      pairable: true,
      phones: [phone],
      ...over
    },
    { state: 'publishing' }
  );
}

const phone = { id: 'p1', label: 'An iPhone', fingerprint: 'ab12 cd34 ef56 0718 293a 4b5c', addedAt: 0, alerts: 'none' as const };

const sentence = (word: PocketFunnelRefusal): string => POCKET_FUNNEL_SENTENCES[word].replace('PORT', '8443');

const WHATS_THIS: StepPiece = { kind: 'disclosure', which: 'whats-this', summary: DISCLOSE_WHATS_THIS, text: POCKET_REACH_HONESTY };
const WHAT_ALLOWS: StepPiece = {
  kind: 'disclosure',
  which: 'what-allows',
  summary: DISCLOSE_WHAT_ALLOWS,
  text: POCKET_FUNNEL_RIGHT_WARNING
};
const QUIET: StepPiece = { kind: 'try-again-quiet' };
const RETRY: StepPiece = { kind: 'try-again' };
const button = (action: PocketSetupAction): StepPiece => ({ kind: 'setup-button', action });
const line = (text: string): StepPiece => ({ kind: 'line', text });

/** The step of `id`, for a status, a stage and a wish. */
function face(status: PocketStatus | null, id: StepFace['id'], stage: PairingStage = 'waiting', wished = false): StepFace {
  const found = checklistOf(status, stage, wished).find((f) => f.id === id);
  if (found === undefined) throw new Error(`no step ${id}`);
  return found;
}

const noop = (): void => undefined;

function draw(over: Partial<PhoneViewProps> = {}): string {
  return renderToStaticMarkup(<PhoneView {...viewProps(over)} />);
}

/** The view's props: his set-up Mac, every press a no-op, unless `over` says otherwise. */
function viewProps(over: Partial<PhoneViewProps> = {}): PhoneViewProps {
  return {
    supported: true,
    status: setUp(),
    offer: null,
    view: { state: 'idle', expiresAt: null, label: null, fingerprint: null, lines: [], hash: null, warning: POCKET_CONFIRM_WARNING },
    now: NOW,
    nameAgeMs: 0,
    nameWatched: false,
    notice: null,
    error: null,
    busy: false,
    wished: false,
    onSetDoor: noop,
    onConfirmDoor: noop,
    onRetryDoor: noop,
    onOpenApproval: noop,
    onSetupAction: noop,
    onPair: noop,
    onCancelPairing: noop,
    onAllowPhone: noop,
    onRemovePhone: noop,
    onSetPushAlerts: noop,
    onChooseKey: noop,
    onForgetKey: noop,
    ...over
  };
}

/**
 * Every press the view draws, by its `data-phone-action` hook, as the handler
 * its button calls: the element tree walked, each function component called
 * with its props. None of them holds a hook, but the code's (`Qr`), which is
 * drawn only on the showing face, so no face read here draws it.
 */
function pressesOf(props: PhoneViewProps): Map<string, () => void> {
  const found = new Map<string, () => void>();
  const walk = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    const el = node as { type?: unknown; props?: Record<string, unknown> };
    if (typeof el.type === 'function') {
      walk((el.type as (p: unknown) => unknown)(el.props));
      return;
    }
    const hook = el.props?.['data-phone-action'];
    const onClick = el.props?.onClick;
    if (typeof hook === 'string' && typeof onClick === 'function') found.set(hook, onClick as () => void);
    walk(el.props?.children);
  };
  walk(PhoneView(props));
  return found;
}

/** Text content, tags and entities flattened. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/** The whole element whose opening tag starts at `at`, by counting its own tag name. */
function elementAt(html: string, at: number): string {
  const name = /^<([a-z]+)/.exec(html.slice(at))?.[1];
  if (name === undefined) throw new Error(`no element at ${String(at)}`);
  const tags = new RegExp(`<(/?)${name}\\b[^>]*>`, 'g');
  tags.lastIndex = at;
  let depth = 0;
  for (let m = tags.exec(html); m !== null; m = tags.exec(html)) {
    depth += m[1] === '/' ? -1 : 1;
    if (depth === 0) return html.slice(at, m.index + m[0].length);
  }
  throw new Error('unbalanced');
}

/** The first element whose opening tag carries `attr`, whole, or ''. */
function elementWith(html: string, attr: string): string {
  const m = new RegExp(`<[a-z]+ [^>]*${attr}[^>]*>`).exec(html);
  return m === null ? '' : elementAt(html, m.index);
}

/** A step's whole element. */
const stepHtml = (html: string, id: StepFace['id']): string => elementWith(html, `data-phone-step="${id}"`);

// ---------------------------------------------------------------------------
// The composer
// ---------------------------------------------------------------------------

describe('step 1, Tailscale on this Mac (§5.4.2), first match wins', () => {
  it('says Checking… while a read is under way, before any state main sends', () => {
    const f = face(st({ state: 'opening', tailscale: 'missing', setupActions: ['get-tailscale'] }, { state: 'reading' }), 'tailscale');
    expect([f.state, f.stateKey]).toEqual([STATE_CHECKING, 'checking']);
    expect(f.body).toEqual([WHATS_THIS]);
  });

  it('Not installed: Get Tailscale only when main lists it, and the quiet Try again only while the door is refused', () => {
    const off = face(st({ state: 'off', tailscale: 'missing', setupActions: ['get-tailscale'] }), 'tailscale');
    expect([off.state, off.stateKey]).toEqual([STATE_NOT_INSTALLED, 'missing']);
    expect(off.body).toEqual([button('get-tailscale'), WHATS_THIS]);
    const refused = { tailscale: 'missing' as const, refusal: sentence('no-tailscale') };
    expect(face(st({ ...refused, setupActions: ['get-tailscale'] }, { refused: 'no-tailscale' }), 'tailscale').body).toEqual([
      button('get-tailscale'),
      QUIET,
      WHATS_THIS
    ]);
    // Not listed: no button, whatever the state says.
    expect(face(st(refused, { refused: 'no-tailscale' }), 'tailscale').body).toEqual([QUIET, WHATS_THIS]);
    // Queued but not refused: no Try again.
    expect(face(st({ ...refused, state: 'opening' }, { refused: 'no-tailscale' }), 'tailscale').body).toEqual([WHATS_THIS]);
  });

  it('Not running and Signed out: their own line, Open Tailscale only when listed, the quiet Try again', () => {
    for (const [state, word, words, key, said, plain] of [
      ['stopped', 'not-running', STATE_NOT_RUNNING, 'stopped', POCKET_TURN_ON_LINE, POCKET_TURN_ON],
      ['signed-out', 'signed-out', STATE_SIGNED_OUT, 'signed-out', POCKET_SIGN_IN_LINE, POCKET_SIGN_IN]
    ] as const) {
      // "then come back" only while main says a return checks again (the fix round).
      const base = { tailscale: state, refusal: sentence(word), rechecks: true };
      const listed = face(st({ ...base, setupActions: ['open-tailscale'] }, { refused: word }), 'tailscale');
      expect([listed.state, listed.stateKey], state).toEqual([words, key]);
      expect(listed.body, state).toEqual([line(said), button('open-tailscale'), QUIET, WHATS_THIS]);
      expect(face(st(base, { refused: word }), 'tailscale').body, state).toEqual([line(said), QUIET, WHATS_THIS]);
      // Main says no return would check (most often a restart is armed): the
      // line asks for the fix alone and promises no return.
      expect(face(st({ ...base, rechecks: false }, { refused: word }), 'tailscale').body, state).toEqual([line(plain), QUIET, WHATS_THIS]);
      expect(
        face(st({ ...base, rechecks: false, state: 'opening', setupActions: ['open-tailscale'] }, { refused: word, state: 'restarting' }), 'tailscale').body,
        state
      ).toEqual([line(plain), button('open-tailscale'), WHATS_THIS]);
      // A start the person pressed is still running: the words hold still under them.
      expect(face(st({ ...base, rechecks: false, state: 'opening' }, { refused: word, state: 'starting' }), 'tailscale').body, state).toEqual([
        line(said),
        WHATS_THIS
      ]);
    }
    expect(POCKET_TURN_ON_LINE).toBe('Turn it on, then come back.');
    expect(POCKET_SIGN_IN_LINE).toBe('Sign in, then come back.');
    expect(POCKET_TURN_ON).toBe('Turn it on.');
    expect(POCKET_SIGN_IN).toBe('Sign in.');
  });

  it('ready: the check, and the account and tailnet drawn once each', () => {
    const f = face(setUp(), 'tailscale');
    expect(f.done).toBe(true);
    expect([f.state, f.stateKey]).toEqual(['person@example.com · standin@example.com', 'ready']);
    expect(f.body).toEqual([WHATS_THIS]);
    expect(face(setUp({ account: null }), 'tailscale').state).toBe('standin@example.com');
    expect(face(setUp({ account: 'standin@example.com' }), 'tailscale').state).toBe('standin@example.com');
    expect(tailscaleLine('a@example.com', 'a@example.com')).toBe('a@example.com');
    expect(tailscaleLine(null, null)).toBe('');
    expect(face(setUp({ account: null, tailnet: null }), 'tailscale').state).toBeNull();
  });

  it('ready: one line, cut with an ellipsis where the row is short, and the whole of it is the hover (the fix round)', () => {
    // The composer hands the whole line twice: as the state, which the row
    // cuts, and as its hover, which holds what the cut hides.
    const f = face(setUp(), 'tailscale');
    expect(f.hover).toBe(f.state);
    const long = `${'w'.repeat(240)}@example.com`;
    const longFace = face(setUp({ account: long }), 'tailscale');
    expect(longFace.state).toBe(`${long} · standin@example.com`);
    expect(longFace.hover).toBe(longFace.state);
    // No line, no hover; and step 1 hovers nothing but its ready line.
    expect(face(setUp({ account: null, tailnet: null }), 'tailscale').hover).toBeNull();
    expect(face(st({ tailscale: 'stopped' }, { refused: 'not-running' }), 'tailscale').hover).toBeNull();
    // Drawn: the whole line is the span's title, never shortened in the text.
    const drawn = stepHtml(draw({ status: setUp({ account: long }) }), 'tailscale');
    expect(drawn).toContain(`<span class="phone-step-state" title="${long} · standin@example.com">${long} · standin@example.com</span>`);
    // And the row is what cuts it: one line, hidden past the edge, an
    // ellipsis, while the title keeps its words whole and gives no room.
    const css = readFileSync(join(SHEET_DIR, 'phone-section.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = (selector: string): string => new RegExp(`(?:^|\\})\\s*${selector.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
    const state = rule('.phone-step-state');
    expect(state).toMatch(/white-space:\s*nowrap;/);
    expect(state).toMatch(/overflow:\s*hidden;/);
    expect(state).toMatch(/text-overflow:\s*ellipsis;/);
    expect(state).not.toMatch(/overflow-wrap/);
    expect(rule('.phone-step-title')).toMatch(/flex:\s*1 0 auto;/);
  });

  it('a refusal that is not a state of Tailscale: main’s sentence and Try again, for each of its five words', () => {
    for (const word of ['no-name', 'unreadable', 'override-unusable', 'ports-taken', 'funnel-ports'] as const) {
      const f = face(st({ refusal: sentence(word) }, { refused: word }), 'tailscale');
      expect([f.state, f.stateKey], word).toEqual([null, null]);
      expect(f.body, word).toEqual([line(sentence(word)), RETRY, WHATS_THIS]);
      // Drawn once: step 2 leaves it alone.
      expect(face(st({ refusal: sentence(word) }, { refused: word }), 'publish').body, word).toEqual([]);
    }
  });

  it('Installed otherwise: with the switch off the switch is the next press, and a refusal step 2 owns', () => {
    const off = face(st({ state: 'off' }), 'tailscale');
    expect([off.state, off.stateKey, off.body]).toEqual([STATE_INSTALLED, 'installed', [WHATS_THIS]]);
    // A held port a return found on unconfirmed fields (D9) is not step 1's word.
    expect(face(st({ refusal: sentence('port-taken') }, { refused: 'port-taken' }), 'tailscale').state).toBe(STATE_INSTALLED);
  });

  it('decides from main’s `tailscale`, never from the refusal word or the lines', () => {
    // Main says ready while a stale refusal word stands: ready.
    expect(face(setUp({ state: 'refused' }), 'tailscale').stateKey).toBe('ready');
    // Main says missing and lists only Open Tailscale: no button at all, because
    // Not installed offers Get Tailscale alone, and only when listed.
    expect(face(st({ state: 'off', tailscale: 'missing', setupActions: ['open-tailscale'] }), 'tailscale').body).toEqual([
      WHATS_THIS
    ]);
    // Main says stopped and lists Get Tailscale: Not running offers Open Tailscale alone.
    expect(
      face(st({ tailscale: 'stopped', setupActions: ['get-tailscale'], rechecks: true }, { refused: 'not-running' }), 'tailscale').body
    ).toEqual([line(POCKET_TURN_ON_LINE), QUIET, WHATS_THIS]);
  });
});

describe('step 2, Publish this Mac (§5.4.3), its body only while the door is on, first match wins', () => {
  it('draws nothing with the switch off, whatever else is left over', () => {
    const f = face(st({ state: 'off', confirmable: true }), 'publish');
    expect([f.state, f.stateKey, f.body]).toEqual([null, null, []]);
    // Its header only: a restart, a refusal word or a sentence left over from
    // before the off draws nothing in its body.
    for (const funnel of [{ state: 'restarting' as const }, { refused: 'not-approved' as const }, { refused: 'shields-up' as const }]) {
      const off = face(st({ state: 'off', refusal: 'left over' }, funnel), 'publish');
      expect([off.state, off.body], JSON.stringify(funnel)).toEqual([null, []]);
    }
  });

  it('restarting, starting, and Tailscale’s page waited on', () => {
    expect(face(st({ state: 'opening' }, { state: 'restarting' }), 'publish').body).toEqual([line(POCKET_FUNNEL_RESTARTING)]);
    const starting = face(st({ state: 'opening', confirmState: 'confirmed' }, { state: 'starting' }), 'publish');
    expect([starting.state, starting.stateKey, starting.body]).toEqual([DOOR_OPENING, 'starting', []]);
    expect(DOOR_OPENING).toBe('Starting Tailscale Funnel…');
    const opens = face(st({ state: 'opening' }, { state: 'approval', approvalOpens: true }), 'publish');
    expect([opens.state, opens.stateKey]).toEqual([STATE_WAITING_TAILSCALE, 'approval']);
    expect(opens.body).toEqual([{ kind: 'approval' }, WHAT_ALLOWS]);
    // A page Tortie does not open: today's text arm, and no disclosure.
    const elsewhere = face(st({ state: 'opening' }, { state: 'approval', approvalText: 'https://example.invalid/x' }), 'publish');
    expect(elsewhere.body).toEqual([{ kind: 'approval' }]);
    // First match wins: the page waited on comes before lines to agree to,
    // which a hashed field moved during the wait (the alert switch) can make.
    const both = face(st({ state: 'opening', confirmable: true, confirmState: 'changed' }, { state: 'approval', approvalOpens: true }), 'publish');
    expect([both.stateKey, both.body]).toEqual(['approval', [{ kind: 'approval' }, WHAT_ALLOWS]]);
  });

  it('Published, with the address a phone is told on hover', () => {
    const f = face(setUp(), 'publish');
    expect([f.done, f.state, f.stateKey, f.body]).toEqual([true, STATE_PUBLISHED, 'published', []]);
    expect(f.hover).toBe(doorListening(NAME, 8443));
    expect(f.hover).toBe(`Answering at https://${NAME}:8443`);
  });

  it('the lines to agree to: Read, then allow, or Changed since you allowed it', () => {
    const never = face(st({ confirmable: true }), 'publish');
    expect([never.state, never.stateKey, never.body]).toEqual([STATE_READ_ALLOW, 'confirm', [{ kind: 'confirm' }]]);
    const changed = face(st({ confirmable: true, confirmState: 'changed' }), 'publish');
    expect([changed.state, changed.stateKey]).toEqual([STATE_CHANGED, 'changed']);
    // Main's confirmable, never worked out: a never-agreed door with lines
    // main says may not be agreed to draws no block.
    expect(face(st({ confirmable: false }), 'publish').body).not.toContainEqual({ kind: 'confirm' });
  });

  it('not-approved: ask the admin, Copy link only when main lists it, the quiet Try again, and no address', () => {
    const base = { confirmState: 'confirmed' as const, confirmable: true, tailscale: 'ready' as const, refusal: sentence('not-approved') };
    const listed = face(st({ ...base, setupActions: ['copy-admin-link'] }, { refused: 'not-approved' }), 'publish');
    expect([listed.state, listed.stateKey]).toEqual([STATE_WAITING_ADMIN, 'admin']);
    expect(listed.body).toEqual([line(POCKET_ASK_ADMIN), button('copy-admin-link'), QUIET]);
    expect(face(st(base, { refused: 'not-approved' }), 'publish').body).toEqual([line(POCKET_ASK_ADMIN), QUIET]);
  });

  it('shields-up: main’s sentence, Open Tailscale only when listed, and Try again', () => {
    const base = { confirmState: 'confirmed' as const, confirmable: true, tailscale: 'ready' as const, refusal: sentence('shields-up') };
    expect(face(st({ ...base, setupActions: ['open-tailscale'] }, { refused: 'shields-up' }), 'publish').body).toEqual([
      line(sentence('shields-up')),
      button('open-tailscale'),
      RETRY
    ]);
    expect(face(st(base, { refused: 'shields-up' }), 'publish').body).toEqual([line(sentence('shields-up')), RETRY]);
  });

  it('any other refusal: main’s sentence, or Not listening., and Try again, as today', () => {
    const agreed = { confirmState: 'confirmed' as const, confirmable: true, tailscale: 'ready' as const };
    for (const word of ['busy', 'failed', 'approval-timeout', 'port-taken'] as const) {
      expect(face(st({ ...agreed, refusal: sentence(word) }, { refused: word }), 'publish').body, word).toEqual([
        line(sentence(word)),
        RETRY
      ]);
    }
    // A sentence that is not Tailscale's (the door process's, the sessions).
    expect(face(st({ ...agreed, refusal: 'The door did not open.' }), 'publish').body).toEqual([line('The door did not open.'), RETRY]);
    expect(face(st(agreed), 'publish').body).toEqual([line(DOOR_NOT_LISTENING), RETRY]);
    expect(DOOR_NOT_LISTENING).toBe('Not listening.');
  });

  it('a start that refused with one of step 1’s words over a read that answered is step 2’s to draw, or nobody draws it', () => {
    // Funnel's child exits `funnel-ports` (funnel.ts classifyFunnelExit) while the read was good.
    const s = st({ confirmState: 'confirmed', confirmable: true, tailscale: 'ready', refusal: sentence('funnel-ports') }, { refused: 'funnel-ports' });
    expect(face(s, 'tailscale').body).toEqual([WHATS_THIS]);
    expect(face(s, 'publish').body).toEqual([line(sentence('funnel-ports')), RETRY]);
  });

  it('leaves to step 1 the refusal step 1 drew, and draws one Try again in all', () => {
    for (const [tailscale, word] of [
      ['missing', 'no-tailscale'],
      ['stopped', 'not-running'],
      ['signed-out', 'signed-out']
    ] as const) {
      const s = st({ tailscale, refusal: sentence(word) }, { refused: word });
      expect(face(s, 'publish').body, word).toEqual([]);
      const html = draw({ status: s });
      expect(html.split('data-phone-action="retry-door"'), word).toHaveLength(2);
    }
  });

  it('a held port a return found draws its sentence and Try again, and never Allow (§Attack F3)', () => {
    const s = st({ confirmable: false, refusal: sentence('port-taken'), rechecks: false }, { refused: 'port-taken' });
    expect(face(s, 'publish').body).toEqual([line(sentence('port-taken')), RETRY]);
    const html = draw({ status: s });
    const step = stepHtml(html, 'publish');
    expect(text(step)).toContain(sentence('port-taken'));
    expect(step).toContain('data-phone-action="retry-door"');
    expect(html).not.toContain('data-phone-action="confirm-door"');
    expect(html).not.toContain('data-phone-confirm');
  });

  it('draws nothing when there is nothing to retry and nothing to agree to', () => {
    // No public name yet: nothing to agree to, and lines main may still agree to.
    expect(face(st({ publicName: null, confirmable: true }), 'publish').body).toEqual([]);
  });
});

describe('step 3, Pair your phone (§5.4.4)', () => {
  it('Paired, with the check, whenever a phone is', () => {
    const f = face(setUp(), 'pair', 'ready');
    expect([f.done, f.state, f.stateKey]).toEqual([true, STATE_PAIRED, 'paired']);
    const none = face(st({ state: 'off' }), 'pair', 'start');
    expect([none.done, none.state, none.stateKey]).toEqual([false, null, null]);
  });

  it('Pair on the start face only with a phone paired, and on the ready face unless the code is on its way', () => {
    const pairOf = (s: PocketStatus, stage: PairingStage, wished: boolean): unknown =>
      face(s, 'pair', stage, wished).body;
    expect(pairOf(st({ state: 'off' }), 'start', false)).toEqual([{ kind: 'pair-card', pair: false }]);
    expect(pairOf(setUp({ state: 'off' }), 'start', false)).toEqual([{ kind: 'pair-card', pair: true }]);
    const ready = setUp({ phones: [] });
    expect(pairOf(ready, 'ready', false)).toEqual([{ kind: 'pair-card', pair: true }]);
    expect(pairOf(ready, 'ready', true)).toEqual([{ kind: 'pair-card', pair: false }]);
    expect(pairOf(setUp(), 'ready', true)).toEqual([{ kind: 'pair-card', pair: true }]);
    for (const stage of ['waiting', 'naming', 'showing', 'match'] as const) {
      expect(pairOf(setUp(), stage, false), stage).toEqual([{ kind: 'pair-card', pair: false }]);
    }
  });
});

describe('the marks (§5.4.1)', () => {
  it('done is step 1 ready, step 2 listening, step 3 a phone; current is the first not done', () => {
    const marks = (s: PocketStatus | null): [boolean, boolean][] =>
      checklistOf(s, 'ready', false).map((f) => [f.done, f.current]);
    expect(marks(setUp())).toEqual([
      [true, false],
      [true, false],
      [true, false]
    ]);
    expect(marks(setUp({ phones: [] }))).toEqual([
      [true, false],
      [true, false],
      [false, true]
    ]);
    expect(marks(st({ state: 'off' }))).toEqual([
      [false, true],
      [false, false],
      [false, false]
    ]);
    // On and not answering: step 2 is not done until the door listens.
    for (const state of ['opening', 'refused'] as const) {
      expect(marks(st({ state, tailscale: 'ready', tailnet: 'example.github' })), state).toEqual([
        [true, false],
        [false, true],
        [false, false]
      ]);
    }
    // Step 2 done before step 1 (a door that answers while this run read nothing).
    expect(marks(setUp({ tailscale: 'installed', account: null, tailnet: null }))).toEqual([
      [false, true],
      [true, false],
      [true, false]
    ]);
  });

  it('before main answers: the three headers, no state, and step 1’s disclosure', () => {
    const faces = checklistOf(null, 'waiting', false);
    expect(faces.map((f) => [f.id, f.title, f.state, f.done])).toEqual([
      ['tailscale', STEP_TAILSCALE, null, false],
      ['publish', STEP_PUBLISH, null, false],
      ['pair', STEP_PAIR, null, false]
    ]);
    expect(faces[0]?.body).toEqual([WHATS_THIS]);
    expect(faces[2]?.body).toEqual([{ kind: 'pair-card', pair: false }]);
  });

  it('says its words as the SPEC pins them', () => {
    expect([STEP_TAILSCALE, STEP_PUBLISH, STEP_PAIR]).toEqual(['Tailscale on this Mac', 'Publish this Mac', 'Pair your phone']);
    expect([
      STATE_CHECKING,
      STATE_NOT_INSTALLED,
      STATE_NOT_RUNNING,
      STATE_SIGNED_OUT,
      STATE_INSTALLED,
      STATE_WAITING_TAILSCALE,
      STATE_PUBLISHED,
      STATE_READ_ALLOW,
      STATE_CHANGED,
      STATE_WAITING_ADMIN,
      STATE_PAIRED
    ]).toEqual([
      'Checking…',
      'Not installed',
      'Not running',
      'Signed out',
      'Installed',
      'Waiting for Tailscale',
      'Published',
      'Read, then allow',
      'Changed since you allowed it',
      'Waiting for your admin',
      'Paired'
    ]);
    expect([BTN_GET_TAILSCALE, BTN_OPEN_TAILSCALE_APP, BTN_COPY_LINK]).toEqual(['Get Tailscale', 'Open Tailscale', 'Copy link']);
    expect([DISCLOSE_WHATS_THIS, DISCLOSE_WHAT_ALLOWS]).toEqual(['What’s this?', 'What this allows']);
    expect(BTN_OPEN_TAILSCALE).toBe('Approve in Tailscale');
    expect(POCKET_SETUP_LINE).toBe('Your iPhone needs only the Tortie app. This Mac needs Tailscale (free).');
    expect(POCKET_FUNNEL_APPROVAL).toBe('Tailscale needs your OK, once.');
    expect(POCKET_NAME_WAIT_NOTE).toBe('This can take several minutes. You can leave this open or come back later.');
    expect(PUSH_PUBLISHER_ONLY).toBe('Only Tortie’s publisher can send alerts for now.');
    expect([SCAN_LINE, GET_PHONE_APP]).toEqual(['Scan with Tortie on your iPhone.', 'Get it at tortie.sh/iphone.']);
  });

  it('never says beta, TestFlight, remote desktop, mirror, stream or SSH (his answer 3, research 140 §10)', () => {
    const exported: unknown[] = [...Object.values(steps), ...Object.values(phoneSection)];
    const words = exported.filter((v): v is string => typeof v === 'string');
    expect(words.length).toBeGreaterThan(40);
    for (const w of [...words, POCKET_SETUP_LINE, POCKET_TURN_ON_LINE, POCKET_SIGN_IN_LINE, POCKET_TURN_ON, POCKET_SIGN_IN, POCKET_ASK_ADMIN, POCKET_NAME_WAIT_NOTE, PUSH_PUBLISHER_ONLY]) {
      expect(w).not.toMatch(/\bbeta\b|\btestflight\b|\bremote desktop\b|\bmirror(s|ed|ing)?\b|\bstream(s|ed|ing)?\b|\bssh\b/i);
    }
  });
});

// ---------------------------------------------------------------------------
// The faces, drawn
// ---------------------------------------------------------------------------

describe('the faces, drawn', () => {
  it('lays out the switch with its one caption, the three steps, the phones and the alerts, in that order', () => {
    const page = text(draw());
    const at = [DOOR_LABEL, POCKET_SETUP_LINE, STEP_TAILSCALE, STEP_PUBLISH, STEP_PAIR, PHONES_GROUP, ALERTS_GROUP].map((w) =>
      page.indexOf(w)
    );
    for (const i of at) expect(i).toBeGreaterThanOrEqual(0);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(draw()).toContain('<div class="set-card phone-steps">');
  });

  it('says the same one caption under the switch in every state, and the three headers always', () => {
    for (const s of [null, st({ state: 'off' }), st({ state: 'opening' }, { state: 'reading' }), st(), setUp()]) {
      const html = draw({ status: s });
      const caption = /<span class="set-row-label">Let my phone reach this Mac<\/span><span class="set-row-caption">([^<]*)<\/span>/.exec(html);
      expect(caption?.[1], String(s?.state)).toBe(POCKET_SETUP_LINE);
      for (const id of ['tailscale', 'publish', 'pair']) expect(html, `${String(s?.state)}/${id}`).toContain(`data-phone-step="${id}"`);
    }
  });

  it('draws the marks for the eye: the check when done, the number otherwise, the current one marked', () => {
    const html = draw({ status: setUp({ phones: [] }) });
    const one = stepHtml(html, 'tailscale');
    expect(one).toMatch(/^<div class="phone-step" data-phone-step="tailscale" data-phone-step-state="ready" data-done="true">/);
    expect(one).toContain('<span class="codicon codicon-check phone-step-mark phone-step-done" aria-hidden="true"></span>');
    const three = stepHtml(html, 'pair');
    expect(three).toMatch(/^<div class="phone-step" data-phone-step="pair" data-phone-step-state="" data-current="true">/);
    expect(three).toContain('<span class="phone-step-mark phone-step-num" aria-hidden="true">3</span>');
    expect(three).not.toContain('codicon-check');
    // The state words are what a screen reader reads: never hidden.
    // Step 1's state is one line, cut with an ellipsis, and the whole of it is
    // its hover (the fix round).
    expect(one).toContain('<span class="phone-step-state" title="person@example.com · standin@example.com">person@example.com · standin@example.com</span>');
    expect(stepHtml(html, 'publish')).toContain(`<span class="phone-step-state" title="Answering at https://${NAME}:8443">Published</span>`);
  });

  it('names each state by its key', () => {
    const key = (s: PocketStatus, id: StepFace['id']): string | undefined =>
      new RegExp(`data-phone-step="${id}" data-phone-step-state="([^"]*)"`).exec(draw({ status: s }))?.[1];
    expect(key(st({ state: 'off', tailscale: 'missing' }), 'tailscale')).toBe('missing');
    expect(key(st({ tailscale: 'stopped' }, { refused: 'not-running' }), 'tailscale')).toBe('stopped');
    expect(key(st({ tailscale: 'signed-out' }, { refused: 'signed-out' }), 'tailscale')).toBe('signed-out');
    expect(key(st({ state: 'off' }), 'tailscale')).toBe('installed');
    expect(key(st({ state: 'opening' }, { state: 'reading' }), 'tailscale')).toBe('checking');
    expect(key(st({ state: 'opening', confirmState: 'confirmed' }, { state: 'starting' }), 'publish')).toBe('starting');
    expect(key(st({ state: 'opening' }, { state: 'approval', approvalOpens: true }), 'publish')).toBe('approval');
    expect(key(st({ confirmable: true }), 'publish')).toBe('confirm');
    expect(key(st({ confirmable: true, confirmState: 'changed' }), 'publish')).toBe('changed');
    expect(key(st({ confirmState: 'confirmed', confirmable: true }, { refused: 'not-approved' }), 'publish')).toBe('admin');
    expect(key(setUp(), 'publish')).toBe('published');
    expect(key(setUp(), 'pair')).toBe('paired');
    expect(key(st({ confirmState: 'confirmed', confirmable: true }, { refused: 'busy' }), 'publish')).toBe('');
  });

  it('draws today’s confirm block byte for byte, and never inside a disclosure (his ruling 2, D18)', () => {
    for (const [why, s, busy] of [
      ['never agreed', st({ confirmable: true }), false],
      ['changed, Funnel asks approval', st({ confirmable: true, confirmState: 'changed' }, { asksApproval: true }), false],
      ['a press under way', st({ confirmable: true }), true],
      ['a read under way', st({ confirmable: true, state: 'opening' }, { state: 'reading' }), false]
    ] as const) {
      const html = draw({ status: s, busy });
      const block = elementWith(html, 'data-phone-confirm');
      expect(block, why).toBe(renderToStaticMarkup(todaysConfirmBlock(s, busy)));
      // Not inside a <details>: no disclosure opens before the block that has not closed.
      const before = html.slice(0, html.indexOf(block));
      expect((before.match(/<details/g) ?? []).length, why).toBe((before.match(/<\/details>/g) ?? []).length);
      expect(block, why).not.toContain('<details');
      const page = text(block);
      for (const l of LINES) expect(page, why).toContain(l);
      expect(page, why).toContain(POCKET_CONFIRM_WARNING);
      expect(page, why).toContain(POCKET_DOOR_HONESTY);
      expect(block.includes(POCKET_FUNNEL_RIGHT_WARNING), why).toBe(s.funnel.asksApproval);
      expect(block, why).toContain('data-phone-action="confirm-door"');
    }
  });

  it('holds What’s this? and What this allows shut, the approval face’s without the confirm block’s hook', () => {
    const rest = draw({ status: st({ state: 'off' }) });
    const whats = elementWith(rest, 'data-phone-whats-this');
    expect(whats).toMatch(/^<details class="set-disclosure" data-phone-whats-this="true">/);
    expect(whats).not.toMatch(/\sopen[=\s>]/);
    expect(whats).toContain(`<summary>${DISCLOSE_WHATS_THIS}</summary>`);
    expect(text(whats)).toContain(POCKET_REACH_HONESTY);
    // Step 1's own, in every state.
    for (const s of [null, st({ state: 'off' }), st(), setUp()]) {
      expect(stepHtml(draw({ status: s }), 'tailscale'), String(s?.state)).toContain('data-phone-whats-this');
    }
    const approval = draw({ status: st({ state: 'opening' }, { state: 'approval', approvalOpens: true }) });
    const allows = elementWith(approval, 'data-phone-what-allows');
    expect(allows).toMatch(/^<details class="set-disclosure" data-phone-what-allows="true">/);
    expect(allows).not.toMatch(/\sopen[=\s>]/);
    expect(text(allows)).toContain(POCKET_FUNNEL_RIGHT_WARNING);
    expect(allows).not.toContain('data-phone-funnel-right');
    expect(approval).not.toContain('data-phone-funnel-right');
    // Today's approval block, Approve in Tailscale.
    const block = elementWith(approval, 'data-phone-approval');
    expect(text(block)).toContain(POCKET_FUNNEL_APPROVAL);
    expect(block).toMatch(/<button[^>]*data-phone-action="open-approval"[^>]*>Approve in Tailscale<\/button>/);
    expect(stepHtml(approval, 'publish')).not.toContain('data-phone-action="retry-door"');
    // A page Tortie does not open: selectable text, no disclosure, no button.
    const elsewhere = draw({ status: st({ state: 'opening' }, { state: 'approval', approvalText: 'https://example.invalid/f' }) });
    expect(text(elementWith(elsewhere, 'data-phone-approval'))).toContain(POCKET_FUNNEL_APPROVAL_ELSEWHERE);
    expect(elsewhere).toContain('data-phone-approval-text');
    expect(elsewhere).not.toContain('data-phone-what-allows');
  });

  it('draws Get Tailscale only when listed, the quiet Try again whenever the door is refused, and neither while a read is under way', () => {
    const missing = { tailscale: 'missing' as const, refusal: sentence('no-tailscale') };
    const listed = stepHtml(draw({ status: st({ ...missing, setupActions: ['get-tailscale'] }, { refused: 'no-tailscale' }) }), 'tailscale');
    const row = elementWith(listed, 'phone-step-actions');
    expect(row).toMatch(
      /^<div class="set-config-actions phone-step-actions"><button type="button" class="btn btn-primary" data-phone-action="get-tailscale">Get Tailscale<\/button><button type="button" class="set-inline-btn" data-phone-action="retry-door">Try again<\/button><\/div>$/
    );
    const unlisted = stepHtml(draw({ status: st(missing, { refused: 'no-tailscale' }) }), 'tailscale');
    expect(unlisted).not.toContain('get-tailscale');
    expect(unlisted).toContain('class="set-inline-btn" data-phone-action="retry-door"');
    const reading = draw({ status: st({ ...missing, state: 'opening', setupActions: ['get-tailscale'] }, { state: 'reading' }) });
    expect(reading).not.toContain('get-tailscale');
    expect(reading).not.toContain('retry-door');
    // With the switch off: the button, no Try again.
    const off = stepHtml(draw({ status: st({ state: 'off', tailscale: 'missing', setupActions: ['get-tailscale'] }) }), 'tailscale');
    expect(off).toContain('data-phone-action="get-tailscale"');
    expect(off).not.toContain('retry-door');
    // Deleted after a read that answered, with the switch on (the fix round,
    // main's half in p3331-setup.test.ts): no refusal word, lines read before
    // it went, and main says missing and lists the press. Get Tailscale is drawn.
    const gone = stepHtml(
      draw({ status: st({ tailscale: 'missing', setupActions: ['get-tailscale'], confirmable: true }, { refused: null }) }),
      'tailscale'
    );
    expect(gone).toContain('data-phone-step-state="missing"');
    expect(elementWith(gone, 'phone-step-actions')).toMatch(
      /^<div class="set-config-actions phone-step-actions"><button type="button" class="btn btn-primary" data-phone-action="get-tailscale">Get Tailscale<\/button><button type="button" class="set-inline-btn" data-phone-action="retry-door">Try again<\/button><\/div>$/
    );
  });

  it('draws Open Tailscale and Copy link only when listed, each by its hook', () => {
    const stopped = draw({ status: st({ tailscale: 'stopped', setupActions: ['open-tailscale'], rechecks: true }, { refused: 'not-running' }) });
    expect(stepHtml(stopped, 'tailscale')).toMatch(/<button type="button" class="btn btn-primary" data-phone-action="open-tailscale">Open Tailscale<\/button>/);
    expect(text(stepHtml(stopped, 'tailscale'))).toContain(POCKET_TURN_ON_LINE);
    const armed = draw({ status: st({ tailscale: 'stopped', setupActions: ['open-tailscale'] }, { refused: 'not-running' }) });
    expect(text(stepHtml(armed, 'tailscale'))).toContain(POCKET_TURN_ON);
    expect(text(stepHtml(armed, 'tailscale'))).not.toContain(POCKET_TURN_ON_LINE);
    expect(draw({ status: st({ tailscale: 'stopped' }, { refused: 'not-running' }) })).not.toContain('open-tailscale');
    const admin = { confirmState: 'confirmed' as const, confirmable: true, tailscale: 'ready' as const, refusal: sentence('not-approved') };
    const copy = stepHtml(draw({ status: st({ ...admin, setupActions: ['copy-admin-link'] }, { refused: 'not-approved' }) }), 'publish');
    expect(copy).toMatch(/<button type="button" class="btn btn-secondary" data-phone-action="copy-link">Copy link<\/button>/);
    expect(text(copy)).toContain(POCKET_ASK_ADMIN);
  });

  it('draws no address on the not-approved face when main holds no link it would open (D6)', () => {
    const admin = { confirmState: 'confirmed' as const, confirmable: true, tailscale: 'ready' as const, refusal: sentence('not-approved') };
    const step = stepHtml(draw({ status: st(admin, { refused: 'not-approved', approvalText: null }) }), 'publish');
    expect(step).not.toContain('copy-link');
    expect(step).not.toContain('://');
    expect(step).not.toContain('data-phone-approval-text');
    expect(step).toContain('class="set-inline-btn" data-phone-action="retry-door"');
  });

  it('draws no link on any face', () => {
    const faces: PocketStatus[] = [
      st({ state: 'off', tailscale: 'missing', setupActions: ['get-tailscale'] }),
      st({ tailscale: 'stopped', setupActions: ['open-tailscale'] }, { refused: 'not-running' }),
      st({ confirmable: true }, { asksApproval: true }),
      st({ state: 'opening' }, { state: 'approval', approvalOpens: true }),
      st({ state: 'opening' }, { state: 'approval', approvalText: 'https://example.invalid/f' }),
      st({ confirmState: 'confirmed', confirmable: true, setupActions: ['copy-admin-link'] }, { refused: 'not-approved' }),
      setUp(),
      setUp({ phones: [], pushKeyId: 'ABCDE12345' })
    ];
    for (const s of faces) {
      const html = draw({ status: s });
      expect(html).not.toMatch(/<a\b/i);
      expect(html).not.toContain('href=');
    }
  });

  it('wires each press to the handler its hook names, and a setup press to main by its closed word alone', () => {
    const calls: unknown[][] = [];
    const spy =
      (name: string) =>
      (...args: unknown[]): void => {
        calls.push([name, ...args]);
      };
    const handlers: Partial<PhoneViewProps> = {
      onSetDoor: spy('setDoor'),
      onConfirmDoor: spy('confirmDoor'),
      onRetryDoor: spy('retryDoor'),
      onOpenApproval: spy('openApproval'),
      onSetupAction: spy('setupAction'),
      onPair: spy('pair'),
      onCancelPairing: spy('cancelPairing'),
      onAllowPhone: spy('allowPhone'),
      onRemovePhone: spy('removePhone'),
      onSetPushAlerts: spy('setPushAlerts'),
      onChooseKey: spy('chooseKey'),
      onForgetKey: spy('forgetKey')
    };
    const press = (s: PocketStatus, hook: string): unknown[] => {
      calls.length = 0;
      const onClick = pressesOf(viewProps({ status: s, ...handlers })).get(hook);
      if (onClick === undefined) throw new Error(`no ${hook} drawn`);
      onClick();
      expect(calls, hook).toHaveLength(1);
      return calls[0] ?? [];
    };
    const missing = st({ tailscale: 'missing', setupActions: ['get-tailscale'] }, { refused: 'no-tailscale' });
    expect(press(missing, 'get-tailscale')).toEqual(['setupAction', 'get-tailscale']);
    expect(press(missing, 'retry-door')).toEqual(['retryDoor']);
    expect(press(st({ tailscale: 'stopped', setupActions: ['open-tailscale'] }, { refused: 'not-running' }), 'open-tailscale')).toEqual([
      'setupAction',
      'open-tailscale'
    ]);
    const admin = st({ confirmState: 'confirmed', confirmable: true, tailscale: 'ready', setupActions: ['copy-admin-link'] }, { refused: 'not-approved' });
    expect(press(admin, 'copy-link')).toEqual(['setupAction', 'copy-admin-link']);
    expect(press(admin, 'retry-door')).toEqual(['retryDoor']);
    const shieldsUp = st({ confirmState: 'confirmed', confirmable: true, tailscale: 'ready', setupActions: ['open-tailscale'] }, { refused: 'shields-up' });
    expect(press(shieldsUp, 'open-tailscale')).toEqual(['setupAction', 'open-tailscale']);
    expect(press(shieldsUp, 'retry-door')).toEqual(['retryDoor']);
    expect(press(st({ state: 'opening' }, { state: 'approval', approvalOpens: true }), 'open-approval')).toEqual(['openApproval']);
    expect(press(st({ confirmable: true }), 'confirm-door')).toEqual(['confirmDoor']);
    expect(press(setUp({ phones: [] }), 'pair')).toEqual(['pair']);
    expect(press(setUp({ state: 'off' }), 'pair')).toEqual(['pair']);
    expect(press(setUp(), 'remove-phone')).toEqual(['removePhone', 'p1']);
    expect(press(setUp(), 'choose-key')).toEqual(['chooseKey']);
    expect(press(setUp({ pushKeyId: '6782V6SJJ7' }), 'forget-key')).toEqual(['forgetKey']);
  });

  it('draws the publisher line on the Alerts card with a key and without one', () => {
    for (const pushKeyId of [null, '6782V6SJJ7']) {
      const html = draw({ status: setUp({ pushKeyId }) });
      const key = elementWith(html, 'data-phone-key');
      expect(key, String(pushKeyId)).toContain(`<span class="set-row-caption" data-phone-publisher="true">${PUSH_PUBLISHER_ONLY}</span>`);
      // Under the key's own line, in the key row's text.
      expect(key.indexOf('data-phone-key-line')).toBeLessThan(key.indexOf('data-phone-publisher'));
    }
    expect(draw({ status: null })).not.toContain('data-phone-publisher');
  });

  it('says the code’s two lines in words, never an address with a scheme', () => {
    const offer = { payload: JSON.stringify({ v: 3 }), expiresAt: NOW + 170_000 };
    const view: PocketPairingView = { state: 'waiting', expiresAt: NOW + 170_000, label: null, fingerprint: null, lines: [], hash: null, warning: '' };
    const html = draw({ status: setUp({ phones: [] }), offer, view });
    const side = elementWith(html, 'class="phone-qr-side"');
    const lines = [...side.matchAll(/<p class="phone-line"[^>]*>([^<]*)<\/p>/g)].map((m) => m[1]);
    expect(lines).toEqual([SCAN_LINE, GET_PHONE_APP, CODE_PRIVATE]);
    expect(side).toContain(`<p class="phone-line" data-phone-get-app="true">${GET_PHONE_APP}</p>`);
    for (const w of [SCAN_LINE, GET_PHONE_APP]) expect(w).not.toContain('://');
  });

  it('draws the name check’s wait note under the block for exactly as long as the block is', () => {
    const progress: PocketNameProgress = { answers: ['record', 'negative'], asking: false, elapsedMs: 2_000, nextInMs: 20_000 };
    const naming = draw({ status: setUp({ phones: [], pairable: false, nameCheck: 'checking', nameProgress: progress }) });
    const note = `<p class="phone-line" data-phone-name-note="true">${POCKET_NAME_WAIT_NOTE}</p>`;
    expect(naming).toContain(note);
    expect(naming.indexOf('data-phone-name-time')).toBeLessThan(naming.indexOf('data-phone-name-note'));
    // Pair appears below the same block and note: nothing above it moves.
    const opened = draw({ status: setUp({ phones: [], nameCheck: 'unreadable', nameProgress: progress }) });
    expect(opened).toContain(note);
    expect(opened.indexOf('data-phone-name-note')).toBeLessThan(opened.indexOf('data-phone-action="pair"'));
    // No block, no note: the naming face's one line, and the resting ready face.
    const bare = draw({ status: setUp({ phones: [], pairable: false, nameCheck: 'checking' }) });
    expect(text(bare)).toContain(POCKET_NAME_SENTENCES.checking);
    expect(bare).not.toContain('data-phone-name-note');
    expect(draw({ status: setUp({ phones: [] }) })).not.toContain('data-phone-name-note');
  });

  it('keeps the pair card’s six stages on step 3, and Pair as the composer says', () => {
    const card = (html: string): string => elementWith(stepHtml(html, 'pair'), 'data-phone-stage');
    expect(card(draw({ status: st({ state: 'off' }) }))).toBe('<div class="phone-block" data-phone-stage="start"></div>');
    expect(card(draw({ status: setUp({ state: 'off' }) }))).toContain('data-phone-action="pair"');
    expect(card(draw({ status: st() }))).toBe('<div class="phone-block" data-phone-stage="waiting"></div>');
    expect(card(draw({ status: setUp({ phones: [] }) }))).toContain('data-phone-action="pair"');
    expect(card(draw({ status: setUp({ phones: [] }), wished: true }))).toBe('<div class="phone-block" data-phone-stage="ready"></div>');
    expect(card(draw({ status: setUp(), wished: true }))).toContain('data-phone-action="pair"');
  });
});

/** cb8d52a6:src/renderer/settings/PhoneSection.tsx:495-503 and :774-797, TODAY'S BLOCK, verbatim but for `props.`. */
function todaysConfirmBlock(status: PocketStatus, busy: boolean): React.JSX.Element {
  return (
    <div className="phone-block" data-phone-confirm>
      <ul className="set-config-lines">
        {status.confirmLines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
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
          onClick={noop}
        >
          {BTN_ALLOW}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The connected section: the return and the wish
// ---------------------------------------------------------------------------

interface FakePocket {
  status: ReturnType<typeof vi.fn>;
  pairingState: ReturnType<typeof vi.fn>;
  onChanged: ReturnType<typeof vi.fn>;
  recheck: ReturnType<typeof vi.fn>;
  setDoor: ReturnType<typeof vi.fn>;
  setupAction: ReturnType<typeof vi.fn>;
  cancelPairing: ReturnType<typeof vi.fn>;
}

interface Mounted {
  api: FakePocket;
  win: EventTarget;
  doc: EventTarget & { visibilityState: string };
  /** The section's own props, as it handed them to the steps card's body. */
  props(): PhoneViewProps;
  unmount(): void;
}

const IDLE_VIEW: PocketPairingView = { state: 'idle', expiresAt: null, label: null, fingerprint: null, lines: [], hash: null, warning: '' };

/** A window holding the bridge and a document of plain `EventTarget`s, installed as the globals. */
function installWindow(api: FakePocket, focused: boolean): Pick<Mounted, 'win' | 'doc'> {
  const win = Object.assign(new EventTarget(), {
    gmux: { pocket: api },
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval
  });
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible', hasFocus: () => focused });
  const g = globalThis as unknown as { window?: unknown; document?: unknown };
  g.window = win;
  g.document = doc;
  return { win, doc };
}

/** The section's own props, as it handed them to the steps card's body in its last render. */
function sectionProps(): PhoneViewProps {
  const card = hoisted.cards.at(-1) as StepsCardProps | undefined;
  const first = card?.faces[0];
  if (card === undefined || first === undefined) throw new Error('the steps card was not drawn');
  return (card.body(first) as React.ReactElement<PhoneViewProps>).props;
}

/**
 * Render the connected section once over a bridge of fakes, with `status` as
 * its first state when given, and run every effect it asked for, as a mount.
 */
function mount(opts: { focused: boolean; status?: PocketStatus }): Mounted {
  hoisted.effects.length = 0;
  hoisted.cards.length = 0;
  hoisted.wishes.length = 0;
  hoisted.inject = opts.status === undefined ? null : { status: opts.status, used: false };
  const answer = opts.status ?? st();
  const api: FakePocket = {
    status: vi.fn(async () => answer),
    pairingState: vi.fn(async () => IDLE_VIEW),
    onChanged: vi.fn(() => () => undefined),
    recheck: vi.fn(async () => answer),
    setDoor: vi.fn(async () => answer),
    setupAction: vi.fn(async () => true),
    cancelPairing: vi.fn(async () => IDLE_VIEW)
  };
  const { win, doc } = installWindow(api, opts.focused);
  renderToStaticMarkup(<PhoneSection />);
  hoisted.inject = null;
  const cleanups = hoisted.effects.map((e) => e.fn()).filter((c): c is () => void => typeof c === 'function');
  return {
    api,
    win,
    doc,
    props: sectionProps,
    unmount: () => {
      for (const c of cleanups) c();
    }
  };
}

afterEach(() => {
  const g = globalThis as unknown as { window?: unknown; document?: unknown };
  delete g.window;
  delete g.document;
  hoisted.inject = null;
  vi.useRealTimers();
});

describe('the return (D16)', () => {
  it('asks main once at mount while the window has the focus, and not without it', () => {
    const focused = mount({ focused: true });
    expect(focused.api.recheck).toHaveBeenCalledTimes(1);
    focused.unmount();
    const blurred = mount({ focused: false });
    expect(blurred.api.recheck).toHaveBeenCalledTimes(0);
    blurred.unmount();
  });

  it('asks once per focus and per visible page, never for a hidden one and never on a clock, and lets go on unmount', () => {
    vi.useFakeTimers();
    const start = lookedListenerCount();
    const m = mount({ focused: false });
    expect(lookedListenerCount()).toBe(start + 1);
    for (let i = 0; i < 3; i += 1) m.win.dispatchEvent(new Event('focus'));
    expect(m.api.recheck).toHaveBeenCalledTimes(3);
    m.doc.visibilityState = 'hidden';
    m.doc.dispatchEvent(new Event('visibilitychange'));
    expect(m.api.recheck).toHaveBeenCalledTimes(3);
    m.doc.visibilityState = 'visible';
    m.doc.dispatchEvent(new Event('visibilitychange'));
    expect(m.api.recheck).toHaveBeenCalledTimes(4);
    // No timer and no poll: ten minutes of clock asks nothing.
    vi.advanceTimersByTime(10 * 60_000);
    expect(m.api.recheck).toHaveBeenCalledTimes(4);
    m.unmount();
    expect(lookedListenerCount()).toBe(start);
    m.win.dispatchEvent(new Event('focus'));
    expect(m.api.recheck).toHaveBeenCalledTimes(4);
  });

  it('is ONE effect over the existing helper, named nowhere else, with no listener of its own', () => {
    const source = readFileSync(join(SHEET_DIR, 'PhoneSection.tsx'), 'utf8');
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code.match(/\brecheck\(/g)).toHaveLength(2);
    expect(code).toMatch(
      /useEffect\(\(\) => \{\n\s*if \(api === null\) return;\n\s*const off = onWindowLooked\(\(\) => \{\n\s*void api\.recheck\(\)\.then\(adopt\)\.catch\(\(\) => undefined\);\n\s*\}\);\n\s*if \(document\.hasFocus\(\)\) void api\.recheck\(\)\.then\(adopt\)\.catch\(\(\) => undefined\);\n\s*return off;\n\s*\}, \[api, adopt\]\);/
    );
    expect(code).toContain("import { onWindowLooked } from '../machines/remote-writes';");
    for (const file of surfaceFiles()) {
      const body = readFileSync(file, 'utf8');
      expect(body, file).not.toMatch(/addEventListener\(\s*['"](focus|visibilitychange)['"]/);
      expect(body, file).not.toMatch(/(setInterval|setTimeout|requestAnimationFrame)\([^)]*recheck/);
    }
  });
});

describe('the code asked for (D17)', () => {
  it('the switch’s on press asks for it while main answered and no phone is paired', async () => {
    const m = mount({ focused: false, status: st({ state: 'off' }) });
    m.props().onSetDoor(true);
    expect(hoisted.wishes).toEqual(['pressed']);
    await Promise.resolve();
    expect(m.api.setDoor).toHaveBeenCalledWith({ on: true });
    m.unmount();
  });

  it('Try again asks for it under the same condition, and is the switch’s own press again', () => {
    const m = mount({ focused: false, status: st({ tailscale: 'missing' }, { refused: 'no-tailscale' }) });
    m.props().onRetryDoor();
    expect(hoisted.wishes).toEqual(['pressed']);
    expect(m.api.setDoor).toHaveBeenCalledWith({ on: true });
    m.unmount();
  });

  it('neither asks with a phone paired, so his Mac is never handed a code it did not ask for', () => {
    const m = mount({ focused: false, status: setUp({ state: 'off' }) });
    m.props().onSetDoor(true);
    m.props().onRetryDoor();
    expect(hoisted.wishes).toEqual([]);
    expect(m.api.setDoor).toHaveBeenCalledTimes(2);
    m.unmount();
  });

  it('the switch does not ask while main has not answered, and the off press drops the wish', () => {
    const m = mount({ focused: false });
    m.props().onSetDoor(true);
    m.props().onRetryDoor();
    expect(hoisted.wishes).toEqual([]);
    m.props().onSetDoor(false);
    expect(hoisted.wishes).toEqual(['no']);
    m.unmount();
  });

  it('hands the steps the wish, and a setup press to main by its word', async () => {
    const m = mount({ focused: false, status: st({ state: 'off', tailscale: 'missing', setupActions: ['get-tailscale'] }) });
    expect(m.props().wished).toBe(false);
    m.props().onSetupAction('get-tailscale');
    await Promise.resolve();
    expect(m.api.setupAction).toHaveBeenCalledWith('get-tailscale');
    m.unmount();
  });

  it('keeps the wish across a refusal while main says a return re-checks it, and drops it otherwise as today', () => {
    const refused = st({ tailscale: 'missing', refusal: sentence('no-tailscale') }, { refused: 'no-tailscale' });
    expect(pairAfterAllowNext('pressed', { ...refused, rechecks: true })).toEqual({ phase: 'on', pair: false });
    expect(pairAfterAllowNext('on', { ...refused, rechecks: true })).toEqual({ phase: 'on', pair: false });
    expect(pairAfterAllowNext('on', { ...refused, rechecks: false })).toEqual({ phase: 'no', pair: false });
    // Main's word, never worked out: shields-up with rechecks true keeps it, as main says.
    const shields = st({ confirmState: 'confirmed', confirmable: true, rechecks: true }, { refused: 'shields-up' });
    expect(pairAfterAllowNext('on', shields)).toEqual({ phase: 'on', pair: false });
    // Then the door answers and main says a code may show: asked for once.
    expect(pairAfterAllowNext('on', setUp({ phones: [] }))).toEqual({ phase: 'no', pair: true });
    // An off still drops it, rechecks or not.
    expect(pairAfterAllowNext('on', { ...refused, state: 'off', rechecks: true })).toEqual({ phase: 'no', pair: false });
  });

  it('is written exactly as D17 pins it, in the live presses', () => {
    const source = readFileSync(join(SHEET_DIR, 'PhoneSection.tsx'), 'utf8');
    const setDoorPress = /onSetDoor=\{\(on\) => \{([\s\S]*?)\n      \}\}/.exec(source)?.[1] ?? '';
    expect(setDoorPress).toMatch(
      /if \(!on\) setPairAfterAllow\('no'\);\n\s*else if \(status !== null && status\.phones\.length === 0\) setPairAfterAllow\('pressed'\);\n\s*setDoor\(on\);/
    );
    const retryPress = /onRetryDoor=\{\(\) => \{([\s\S]*?)\n      \}\}/.exec(source)?.[1] ?? '';
    expect(retryPress).toMatch(/if \(status !== null && status\.phones\.length === 0\) setPairAfterAllow\('pressed'\);\n\s*setDoor\(true\);/);
    expect(source).not.toContain('phones.length ?? 0');
    expect(source.match(/setPairAfterAllow\('pressed'\)/g)).toHaveLength(3);
    const next = source.slice(source.indexOf('export function pairAfterAllowNext('));
    expect(next.slice(0, next.indexOf('\n}\n'))).toContain(
      "  if (status.state === 'refused' && !doorNeedsConfirm(status) && !status.rechecks) return { phase: 'no', pair: false };"
    );
  });
});

// ---------------------------------------------------------------------------
// The section across renders: a press, main's answer to it, and main's pushes
// ---------------------------------------------------------------------------

interface LivePocket extends FakePocket {
  beginPairing: ReturnType<typeof vi.fn>;
}

interface Live {
  api: LivePocket;
  /** Main pushes a status, as `onChanged` delivers it. */
  push(status: PocketStatus): void;
  /** Render again while anything the section holds moved, the bridge's answers landing between. */
  settle(): Promise<void>;
  /** The section's own props, from its last render. */
  props(): PhoneViewProps;
  /** The markup of its last render. */
  html(): string;
  unmount(): void;
}

/**
 * The connected section, LIVE: its hooks keep their values across renders and
 * each effect runs when its dependencies moved, as React runs them, so a
 * press, main's answer to it and main's pushes reach the section's own effects
 * in the order the bridge delivers them. `answers` is what main answers each
 * `setDoor` with, in order: an on press is answered at once, the door opening
 * (`src/main/pocket/ipc.ts` setDoor counts `opening` before it returns).
 */
function live(opts: { status: PocketStatus; answers: PocketStatus[] }): Live {
  hoisted.cards.length = 0;
  hoisted.wishes.length = 0;
  const h = { slots: [] as unknown[], at: 0, dirty: false, pending: [] as { fn: () => unknown; deps: readonly unknown[] | undefined }[] };
  const ran: ({ deps: readonly unknown[] | undefined; cleanup: (() => void) | undefined } | undefined)[] = [];
  let pushTo: ((s: PocketStatus) => void) | null = null;
  let last = '';
  const answers = [...opts.answers];
  const offer = { payload: JSON.stringify({ v: 3, host: NAME }), expiresAt: Date.now() + 170_000 };
  const waiting: PocketPairingView = { ...IDLE_VIEW, state: 'waiting', expiresAt: offer.expiresAt };
  const api: LivePocket = {
    status: vi.fn(async () => opts.status),
    pairingState: vi.fn(async () => (api.beginPairing.mock.calls.length > 0 ? waiting : IDLE_VIEW)),
    onChanged: vi.fn((cb: (s: PocketStatus) => void) => {
      pushTo = cb;
      return () => {
        pushTo = null;
      };
    }),
    recheck: vi.fn(async () => opts.status),
    setDoor: vi.fn(async () => {
      const next = answers.shift();
      if (next === undefined) throw new Error('main was pressed more often than this test said');
      return next;
    }),
    setupAction: vi.fn(async () => true),
    cancelPairing: vi.fn(async () => IDLE_VIEW),
    beginPairing: vi.fn(async () => offer)
  };
  installWindow(api, false);
  const same = (a: readonly unknown[] | undefined, b: readonly unknown[] | undefined): boolean =>
    a !== undefined && b !== undefined && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const render = (): void => {
    h.at = 0;
    h.pending = [];
    h.dirty = false;
    hoisted.live = h;
    try {
      last = renderToStaticMarkup(<PhoneSection />);
    } finally {
      hoisted.live = null;
    }
    h.pending.forEach((effect, i) => {
      const before = ran[i];
      if (before !== undefined && same(before.deps, effect.deps)) return;
      before?.cleanup?.();
      const cleanup = effect.fn();
      ran[i] = { deps: effect.deps, cleanup: typeof cleanup === 'function' ? (cleanup as () => void) : undefined };
    });
  };
  render();
  return {
    api,
    push: (s) => {
      if (pushTo === null) throw new Error('the section never subscribed to main’s pushes');
      pushTo(s);
    },
    settle: async () => {
      for (let round = 0; round < 50; round += 1) {
        if (h.dirty) {
          render();
          continue;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (!h.dirty) return;
      }
      throw new Error('the section never settled');
    },
    props: sectionProps,
    html: () => last,
    unmount: () => {
      for (const r of ran) r?.cleanup?.();
    }
  };
}

describe('the code asked for, through the section’s own effects (D17)', () => {
  /** A start Tailscale refused `shields-up`, which no return re-checks (D7 (g)). */
  const shields = (): PocketStatus =>
    st({ confirmState: 'confirmed', confirmable: true, tailscale: 'ready', tailnet: 'example.github', refusal: sentence('shields-up') }, { refused: 'shields-up' });
  /** Main's answer to an on press: the door opening, a read under way. */
  const opening = (): PocketStatus =>
    st({ state: 'opening', confirmState: 'confirmed', confirmable: true, tailscale: 'ready', tailnet: 'example.github' }, { state: 'reading', refused: 'shields-up' });

  it('waits for main’s answer only while the wish was just set over the status drawn before the press', () => {
    const before = st();
    expect(wishAwaitsAnswer('pressed', before, before)).toBe(true);
    expect(wishAwaitsAnswer('pressed', { ...before }, before)).toBe(false);
    expect(wishAwaitsAnswer('on', before, before)).toBe(false);
    expect(wishAwaitsAnswer('no', before, before)).toBe(false);
  });

  it('Try again carries the wish over a refusal no return re-checks, judged by main’s answer and never by the refusal drawn before the press, and the code shows by itself', async () => {
    const s = live({ status: shields(), answers: [opening()] });
    try {
      await s.settle();
      expect([s.props().status?.funnel.refused, s.props().status?.rechecks]).toEqual(['shields-up', false]);
      s.props().onRetryDoor();
      await s.settle();
      // The refusal drawn before the press did not drop it; main's answer, the
      // door opening, moved it on, exactly as the switch's own press does.
      expect(hoisted.wishes).toEqual(['pressed', 'on']);
      expect(s.api.setDoor).toHaveBeenCalledWith({ on: true });
      expect(s.props().wished).toBe(true);
      // Funnel publishes and the name answers: the code, with no other press.
      s.push(setUp({ phones: [] }));
      await s.settle();
      expect(s.api.beginPairing).toHaveBeenCalledTimes(1);
      expect(hoisted.wishes.at(-1)).toBe('no');
      expect(stepHtml(s.html(), 'pair')).toContain('data-phone-stage="showing"');
    } finally {
      s.unmount();
    }
  });

  it('a refusal no return re-checks, once main answered the press, still drops the wish, as today', async () => {
    const s = live({ status: shields(), answers: [opening()] });
    try {
      await s.settle();
      s.props().onRetryDoor();
      await s.settle();
      // The start refuses again: nothing more is coming, so the wish goes.
      s.push(shields());
      await s.settle();
      expect(hoisted.wishes).toEqual(['pressed', 'on', 'no']);
      s.push(setUp({ phones: [] }));
      await s.settle();
      expect(s.api.beginPairing).not.toHaveBeenCalled();
      expect(stepHtml(s.html(), 'pair')).toContain('data-phone-action="pair"');
    } finally {
      s.unmount();
    }
  });

  it('the switch’s on press keeps the wish across a refusal a return re-checks, and the code shows once the door answers', async () => {
    const s = live({ status: st({ state: 'off' }), answers: [st({ state: 'opening' }, { state: 'reading' })] });
    try {
      await s.settle();
      s.props().onSetDoor(true);
      await s.settle();
      expect(hoisted.wishes).toEqual(['pressed', 'on']);
      // Tailscale is not installed: a refusal a return re-checks (main's rechecks).
      s.push(st({ tailscale: 'missing', refusal: sentence('no-tailscale'), rechecks: true, setupActions: ['get-tailscale'] }, { refused: 'no-tailscale' }));
      await s.settle();
      expect(hoisted.wishes.at(-1)).toBe('on');
      // The return after installing reads the lines to Allow; Allow; the door answers.
      s.push(st({ tailscale: 'ready', tailnet: 'example.github', confirmable: true }));
      await s.settle();
      expect(hoisted.wishes.at(-1)).toBe('on');
      s.push(setUp({ phones: [] }));
      await s.settle();
      expect(s.api.beginPairing).toHaveBeenCalledTimes(1);
    } finally {
      s.unmount();
    }
  });

  it('with a phone paired neither press asks, and the door answering draws Pair', async () => {
    const paired = (): PocketStatus => ({ ...shields(), phones: [phone] });
    const s = live({ status: paired(), answers: [{ ...opening(), phones: [phone] }] });
    try {
      await s.settle();
      s.props().onRetryDoor();
      await s.settle();
      expect(hoisted.wishes).toEqual([]);
      s.push(setUp());
      await s.settle();
      expect(s.api.beginPairing).not.toHaveBeenCalled();
      expect(stepHtml(s.html(), 'pair')).toContain('data-phone-action="pair"');
    } finally {
      s.unmount();
    }
  });
});

// ---------------------------------------------------------------------------
// The split (D19)
// ---------------------------------------------------------------------------

/** Every file of the sheet's surface: PhoneSection.tsx and phone/**. */
function surfaceFiles(): string[] {
  const dir = join(SHEET_DIR, 'phone');
  return [join(SHEET_DIR, 'PhoneSection.tsx'), ...readdirSync(dir).filter((n) => /\.tsx?$/.test(n)).map((n) => join(dir, n))];
}

describe('the split (D19)', () => {
  const composer = readFileSync(join(SHEET_DIR, 'phone', 'steps.ts'), 'utf8');
  const frame = readFileSync(join(SHEET_DIR, 'phone', 'StepsCard.tsx'), 'utf8');

  it('the composer and the frame import nothing of PhoneSection.tsx, and the composer nothing of React', () => {
    // Every module a file names: `import … from`, a bare `import '…'`, and `export … from`.
    const importsOf = (body: string): string[] =>
      [...body.matchAll(/^(?:import\s[^;]*?|export\s[^;]*?\bfrom\s*)['"]([^'"]+)['"];/gm)].map((m) => m[1] ?? '');
    for (const [name, body] of [
      ['steps.ts', composer],
      ['StepsCard.tsx', frame]
    ] as const) {
      const imports = importsOf(body);
      expect(imports.length, name).toBeGreaterThan(0);
      for (const from of imports) expect(from, name).not.toMatch(/PhoneSection/);
    }
    expect(importsOf(composer)).toEqual(['@shared/ipc']);
    expect(importsOf(frame)).toEqual(['react', '../../icons', './steps']);
  });

  it('names nothing of the name check in the composer or the frame', () => {
    for (const body of [composer, frame]) {
      expect(body).not.toMatch(/nameCheck|nameProgress/);
    }
  });

  it('re-exports from PhoneSection.tsx what moved, the same functions', () => {
    expect(phoneSection.doorNeedsConfirm).toBe(steps.doorNeedsConfirm);
    expect(phoneSection.doorMayRetry).toBe(steps.doorMayRetry);
    expect(phoneSection.DOOR_OPENING).toBe(steps.DOOR_OPENING);
    expect(phoneSection.DOOR_NOT_LISTENING).toBe(steps.DOOR_NOT_LISTENING);
    expect(phoneSection.doorListening).toBe(steps.doorListening);
    for (const gone of ['DOOR_OFF', 'DOOR_WAITING', 'PAIR_WAITING', 'PAIR_GROUP', 'doorLine']) {
      expect(gone in phoneSection, gone).toBe(false);
    }
  });

  it('keeps main’s two lines in PhoneSection.tsx byte for byte, where D6 and D10 read them', () => {
    const source = readFileSync(join(SHEET_DIR, 'PhoneSection.tsx'), 'utf8');
    expect(source.split("  return status.pairable ? 'ready' : 'naming';\n")).toHaveLength(2);
    expect(source.split("  if (status.pairable) return { phase: 'no', pair: true };\n")).toHaveLength(2);
    // The quoted words stay declared here.
    for (const l of [
      "PHONE_TITLE = 'Phone'",
      "BTN_PAIR = 'Pair'",
      "BTN_TRY_AGAIN = 'Try again'",
      "BTN_ALLOW = 'Allow'",
      "BTN_CANCEL = 'Cancel'",
      "BTN_REMOVE = 'Remove'",
      "ALERTS_GROUP = 'Alerts'",
      "CODE_EXPIRED = 'The code expired. Nothing was paired.'",
      "BTN_OPEN_TAILSCALE = 'Approve in Tailscale'",
      "SCAN_LINE = 'Scan with Tortie on your iPhone.'"
    ]) {
      expect(source).toContain(l);
    }
  });

  it('draws every colour of the steps from a token', () => {
    const css = readFileSync(join(SHEET_DIR, 'phone-section.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => (m[1] ?? '').includes('.phone-step'));
    expect(rules.length).toBeGreaterThan(8);
    const colours = new Set<string>();
    for (const m of rules) {
      for (const d of (m[2] ?? '').matchAll(/(color|background[a-z-]*|border[a-z-]*)\s*:\s*([^;]+);/g)) {
        expect(d[2], d[0]).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
        for (const v of (d[2] ?? '').matchAll(/var\((--[a-z0-9-]+)\)/g)) colours.add(v[1] ?? '');
      }
    }
    expect([...colours].sort()).toEqual(['--accent', '--success', '--text-muted', '--text-primary', '--text-secondary']);
    expect(css).toMatch(/\.phone-step\[data-current\] \.phone-step-num \{\s*color: var\(--accent\);\s*\}/);
    expect(css).toMatch(/\.phone-step-done \{\s*color: var\(--success\);\s*\}/);
  });
});

// Unused-import guard for the words the faces above draw by value.
void [BTN_TRY_AGAIN, CODE_PRIVATE];
