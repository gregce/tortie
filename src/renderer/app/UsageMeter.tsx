/**
 * The subscription usage meter (Phase 181): ONE component, three densities.
 *
 * The operator's placement, from his own screenshots of 2026-08-30: the meters
 * live at the FOOT of the sessions pane, they stay present when the dock is
 * collapsed to the right rail, and they are present when sessions are
 * organized on top. So this is mounted three times and written once.
 *
 *   full     the foot of the expanded dock. Icon, bar, `2% 5h · 56% wk`, and
 *            a refresh control.
 *   compact  the control end of the top tab strip. The same row without the
 *            separate control, because clicking the meter refreshes it.
 *   mini     the collapsed 48px rail. Bars only, and the numbers move to the
 *            hover card, because at 48px there is no room for a number that
 *            can read 100.
 *
 * EVERY NUMBER HERE IS SERVED. Nothing is estimated, no token is counted and
 * no log is parsed. The percentages come from the vendor's own answer and this
 * file clamps, rounds once and draws a width.
 *
 * WHAT IT DRAWS WHEN NOTHING IS ON: nothing at all. Both providers default to
 * off, and an off provider is absent from the snapshot's numbers, so a default
 * install has no meter and no empty frame where one would be.
 *
 * PHASE 181.2 ANSWERED TWO THINGS THE OPERATOR REPORTED. The bar now fills to
 * the window a person chose in Settings, shipping as the five hour one so the
 * bar agrees with the number the line beside it leads with, and the hover
 * card names the plan each login is on so a person can tell whose quota is on
 * screen. The card names a PLAN and never an identifier, and a provider that
 * named no plan gets no line rather than a guess.
 *
 * PHASE 374 ADDED A ROW NOBODY ASKS FOR. Antigravity's numbers arrive from its
 * own sessions, so its row has no login, no Choose login and nothing a refresh
 * could do. Which rows those are is the shared table's answer, `usageIsReceiver`
 * and `usageLoginProvider`, and never a provider's name written here: a login
 * control drawn for a provider with no login would hand that provider's id to
 * a domain that reads credentials. The row's second model group is drawn on
 * the card alone, because the face has room for two numbers and the bar must
 * go on agreeing with the first of them.
 *
 * PHASE 375 NAMES THAT ROW'S ACCOUNT, and still offers no control for it. The
 * row carries the address its own sessions handed Tortie's script, and only
 * that row ever does, so the card draws Phase 203's `Login: <address>` from
 * it in the place Claude's and Codex's login line goes. The address is asked
 * of `usageAddress` once more here, is drawn on the hover card alone and never
 * in a row's resting accessible text, and a Claude or Codex row's own `email`
 * is never read: their addresses come from the logins store, as before.
 * Switching the account is the Antigravity CLI's, so no Choose login is drawn.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { UsageProviderId, UsageProviderSnapshot, UsageWindow } from '@shared/usage';
import {
  clampUsagePercent,
  usageAddress,
  usageHasNumbers,
  usageIsReceiver,
  usageLoginProvider
} from '@shared/usage';
import type { UsageBarWindow } from '@shared/settings';
import { AgentIcon, Codicon } from '../icons';
import { useNow } from '../format';
import { useUsage } from '../state/usage';
import type { LoginProviderId, LoginsSnapshot } from '@shared/logins';
import { DEFAULT_LOGIN_NAME } from '@shared/logins';
import { loginsOf, useLogins } from '../state/logins';
import { useApp } from '../state/store';
import { gmuxBridge } from '../bridge';
import { loginMenuItems, loginMenuPick } from './login-menu';

/**
 * Is this a macOS build? (Phase 211). The switch timing differs by platform,
 * and on macOS the vendor caches its keychain read for about half a minute
 * while everywhere else it re-reads the credential file at once.
 */
const IS_MAC =
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);
import {
  USAGE_FIVE_HOUR,
  USAGE_PROVIDER_LABEL,
  USAGE_REFRESH,
  USAGE_SEVEN_DAY,
  USAGE_LOGIN_SWITCHING,
  USAGE_FIRST_GROUP_LABEL,
  USAGE_STALE_MARK,
  USAGE_LOGIN_CONTROL,
  USAGE_TITLE,
  usageLoginLine,
  usageOtherLoginsLine,
  usagePercentText,
  usagePlanLine,
  usageReportedLine,
  usageResetIn,
  usageSeverity,
  usageStateLine
} from './usage-copy';
import './usage-meter.css';

export type UsageDensity = 'full' | 'compact' | 'mini';

/** Distance the hover card keeps from the top and bottom of the window. */
const VIEWPORT_MARGIN = 8;

/**
 * How full the one bar per provider is drawn, and the window it means.
 *
 * PHASE 181 FILLED IT TO THE MAXIMUM OF THE TWO WINDOWS and put no label on
 * the bar, so a person read the bar against the first number in the line
 * beside it and the two disagreed. The operator's screenshot of 2026-08-31
 * reads 32 percent 5h next to a bar filled to 62. So the window is now the
 * person's choice, the shipped answer is the five hour one, and the maximum
 * is still available and now says what it is on the page that offers it.
 *
 * A CHOSEN WINDOW THE VENDOR DID NOT NAME FALLS BACK TO THE ONE IT DID, which
 * keeps the promise the setting is for rather than breaking it: on the
 * operator's own machine Codex names the weekly window and no five hour one,
 * so the line reads one number and the bar is filled to that same number.
 * Drawing nothing there would take a bar off the face, and drawing zero would
 * be a number no vendor served.
 *
 * The value is clamped here, so what leaves this function is always a length
 * a browser will accept. The fix round of 2026-08-31 found that it was not:
 * a width of `NaN%` is not a length, so React leaves the element at the width
 * it already had, and one hostile snapshot kept the bar from the one before
 * it. Exported for the test that holds that.
 */
export function barPercent(
  p: UsageProviderSnapshot,
  bar: UsageBarWindow
): number | null {
  const five = clampUsagePercent(p.fiveHour?.percent);
  const week = clampUsagePercent(p.sevenDay?.percent);
  if (bar === 'five-hour') return five ?? week;
  if (bar === 'seven-day') return week ?? five;
  const values = [five, week].filter((v): v is number => v !== null);
  return values.length === 0 ? null : Math.max(...values);
}

/** The `2% 5h · 56% wk` line, with a window omitted when the vendor named none. */
export function usageLine(p: UsageProviderSnapshot): string {
  const parts = [
    p.fiveHour === null ? '' : usagePercentText(p.fiveHour.percent, USAGE_FIVE_HOUR),
    p.sevenDay === null ? '' : usagePercentText(p.sevenDay.percent, USAGE_SEVEN_DAY)
  ];
  return parts.filter((part) => part !== '').join(' · ');
}

function UsageBar({ percent }: { percent: number }): React.JSX.Element {
  return (
    <span className={`usage-bar sev-${usageSeverity(percent)}`}>
      <span className="usage-bar-fill" style={{ width: `${percent}%` }} />
    </span>
  );
}

/** One provider's row at the two wider densities. */
function UsageRow({
  p,
  now,
  bar
}: {
  p: UsageProviderSnapshot;
  now: number;
  bar: UsageBarWindow;
}): React.JSX.Element {
  const percent = barPercent(p, bar);
  const line = usageLine(p);
  return (
    <span className="usage-row">
      <AgentIcon agent={p.provider} size={14} className="usage-icon" />
      {percent === null ? null : <UsageBar percent={percent} />}
      {line === '' ? (
        <span className="usage-none">{USAGE_PROVIDER_LABEL[p.provider]}</span>
      ) : (
        <span className="usage-text num">{line}</span>
      )}
      {p.state === 'stale' ? (
        <Codicon name="warning" size={11} className="usage-stale" />
      ) : null}
      <span className="usage-hidden">{cardLines(p, now).join('. ')}</span>
    </span>
  );
}

/** `2% 5h, Resets in 3h 0m` for each of a group's windows that has a number. */
function windowLines(
  fiveHour: UsageWindow | null,
  sevenDay: UsageWindow | null,
  now: number
): string[] {
  const out: string[] = [];
  const windows: [string, UsageWindow | null][] = [
    [USAGE_FIVE_HOUR, fiveHour],
    [USAGE_SEVEN_DAY, sevenDay]
  ];
  for (const [label, win] of windows) {
    if (win === null) continue;
    const text = usagePercentText(win.percent, label);
    if (text === '') continue;
    const reset = win.resetsAt === null ? '' : usageResetIn(win.resetsAt, now);
    out.push(reset === '' ? text : `${text}, ${reset}`);
  }
  return out;
}

/** The lines the hover card shows, and the accessible text the row carries. */
export function cardLines(
  p: UsageProviderSnapshot,
  now: number,
  /**
   * PHASE 202. How many RUNNING sessions of this agent are on a login other
   * than the one these numbers came from, keyed by that login's name. Empty
   * for every install with one login, which is every install before a person
   * adds a second.
   */
  elsewhere: Map<string, number> = new Map(),
  /**
   * PHASE 203. The address of the login these numbers came from, when the
   * vendor's own file names one. Null is ordinary and means the card names the
   * login the way it did before.
   *
   * PHASE 375. For a provider with no login it is the account the row's own
   * sessions reported, and it is drawn only when it is handed here: a row's
   * resting accessible text calls this with none, so the address is on the
   * hover card alone.
   */
  email: string | null = null
): string[] {
  const out: string[] = [USAGE_PROVIDER_LABEL[p.provider]];
  // WHOSE NUMBERS THESE ARE, in one short line under the vendor's name
  // (Phase 181.2). It is the plan word the vendor itself names and nothing
  // else, and a provider that named no plan gets no line rather than a guess.
  const plan = usagePlanLine(p.plan);
  if (plan !== '') out.push(plan);
  // PHASE 202. WHICH LOGIN these numbers belong to. The person's own default
  // sign in gets no line, because naming it would put a word on the card of
  // every install that has only ever had one login.
  // PHASE 374. A provider with no login names none, whatever a snapshot holds.
  // PHASE 375. It names its account when one is handed, and still never the
  // login name a snapshot holds.
  const hasLogin = usageLoginProvider(p.provider) !== null;
  const login = usageLoginLine(hasLogin ? p.login : null, email);
  if (login !== '') out.push(login);
  const first = windowLines(p.fiveHour, p.sevenDay, now);
  out.push(...(p.second != null ? first.map((text) => `${USAGE_FIRST_GROUP_LABEL} ${text}`) : first));
  // PHASE 374. The second group, on the card and nowhere else. The comparison
  // is loose on purpose: an older harness stages rows with no such field.
  if (p.second != null) {
    for (const text of windowLines(p.second.fiveHour, p.second.sevenDay, now)) {
      out.push(`${p.second.label} ${text}`);
    }
  }
  const scoped = p.scoped === null ? null : clampUsagePercent(p.scoped.percent);
  if (p.scoped !== null && scoped !== null) {
    out.push(`${p.scoped.label} ${Math.round(scoped)}% ${USAGE_SEVEN_DAY}`);
  }
  if (p.state === 'stale') {
    // PHASE 202 FIX ROUND. Stale has two causes and they want different
    // words: a read that failed, and a person who chose another account a
    // moment ago, whose numbers on screen are still the previous account's.
    // PHASE 374. And a third: a row nobody asks for has only its age.
    const mark = usageIsReceiver(p.provider)
      ? usageReportedLine(p.readAt, now)
      : p.loginChanged
        ? USAGE_LOGIN_SWITCHING
        : USAGE_STALE_MARK;
    if (mark !== '') out.push(mark);
  }
  const line = usageStateLine(p.provider, p.state, p.waitingFor);
  if (line !== '') out.push(line);
  // PHASE 202. A running session keeps the login it started with, so a person
  // who has just switched has sessions in front of them that these numbers are
  // not about. Research 72's rule is that the meter never lies across
  // accounts, and this is the line that keeps it honest about them.
  const others = hasLogin ? usageOtherLoginsLine(elsewhere) : '';
  if (others !== '') out.push(others);
  return out;
}

/** The gap the card keeps from the meter when it sits beside it. */
const ANCHOR_GAP = 6;

/**
 * Leave grace before the card closes (Phase 202). The pointer has to be able
 * to cross the six pixel gap above and land on the login control, so the card
 * cannot close the instant the meter is left. It is the same number the SCM
 * hover cards use, in `../scm/hover-timing.ts`.
 */
const HOVER_CLOSE_GRACE_MS = 100;

/**
 * How many RUNNING sessions of this provider's agent are on a login other than
 * the one the meter just read, keyed by that login's name (Phase 202).
 *
 * EMPTY IS THE ORDINARY ANSWER, and it is the answer on every install that has
 * one login. It is not empty for exactly as long as a person keeps a session
 * that predates their switch, which is a real and ordinary state: a running
 * session keeps the login it started with for its whole life.
 *
 * A row with no login is on the default, which is why the comparison is made
 * against the snapshot's own null rather than against a word.
 */
export function sessionsElsewhere(
  sessions: readonly { agent: string; status: string; login?: string }[],
  p: UsageProviderSnapshot
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    if (s.agent !== p.provider) continue;
    if (s.status === 'exited' || s.status === 'discarded' || s.status === 'restorable') {
      continue;
    }
    const login = s.login ?? null;
    if (login === (p.login ?? null)) continue;
    const name = login ?? DEFAULT_LOGIN_NAME;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}

/**
 * The address of the login one provider's numbers came from (Phase 203).
 *
 * The snapshot carries the login's NAME, because a name is what a manifest row
 * holds and what a launch resolves. The address is on the login LIST, which the
 * card already reads for its own control, so the two are joined here rather
 * than by widening what the meter sends.
 *
 * A NULL NAME IS THE DEFAULT LOGIN, which is why the match is against
 * `isDefault` rather than against a word. A provider with no login is not
 * asked about on the list (Phase 374).
 *
 * PHASE 375. Its address is the one its own row carries, asked of the shared
 * shape check again, so a value main should never have sent is drawn as no
 * line. A login provider's row is never read for one: those addresses are the
 * logins store's, and a stray `email` there is ignored.
 */
export function loginEmailOf(
  snapshot: LoginsSnapshot,
  p: UsageProviderSnapshot
): string | null {
  const provider = usageLoginProvider(p.provider);
  if (provider === null) return usageAddress(p.email);
  const rows = loginsOf(snapshot, provider);
  const row =
    p.login === null || p.login.length === 0
      ? rows.find((r) => r.isDefault)
      : rows.find((r) => r.name === p.login);
  return row?.email ?? null;
}

/** The meter's own box, in raw viewport pixels. */
export interface UsageAnchor {
  /** Distance from the right edge of the window to the meter's left edge. */
  x: number;
  top: number;
  bottom: number;
}

/**
 * Where the card's top edge goes (Phase 181.2), and it is a pure function so
 * the test can drive both orientations without a window.
 *
 * CENTRED ON THE METER when there is room, which is what Phase 181 did and
 * what the dock's foot gets. When there is not, the card goes to the side of
 * the meter that has room instead of sliding along the window edge across the
 * band the meter sits in. That is the second half of the operator's defect:
 * raising the card above the tab strip stops the strip covering the card, and
 * this stops the card covering the tabs. With sessions organized on top the
 * meter sits in a 36px band under the project tabs, centring would put the
 * card's top at a negative number, and the old clamp parked it over the
 * project tabs and the traffic lights. Now it hangs under the band.
 *
 * The clamp is still the last answer, for a window too short to hold the card
 * anywhere, and it is what keeps the card inside both window edges.
 */
export function usageCardTop(
  anchor: { top: number; bottom: number },
  height: number,
  viewportHeight: number
): number {
  const maxTop = viewportHeight - height - VIEWPORT_MARGIN;
  const centred = anchor.top + (anchor.bottom - anchor.top) / 2 - height / 2;
  if (centred >= VIEWPORT_MARGIN && centred <= maxTop) return Math.round(centred);
  const below = anchor.bottom + ANCHOR_GAP;
  if (below >= VIEWPORT_MARGIN && below <= maxTop) return Math.round(below);
  const above = anchor.top - ANCHOR_GAP - height;
  if (above >= VIEWPORT_MARGIN && above <= maxTop) return Math.round(above);
  return Math.round(
    Math.min(Math.max(centred, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, maxTop))
  );
}

/**
 * One provider's block on the card: its name, its lines, and its login control.
 *
 * PHASE 202 GAVE THE CARD ITS FIRST CONTROL, which is why the card stopped
 * being `aria-hidden` and started keeping itself open under the pointer. The
 * control is the same shape the SCM hover card's actions are: a button in the
 * card's own footer row, and the menu it opens is NATIVE, through the
 * ui:popupMenu bridge, because Tortie draws no DOM menus.
 */
export interface UsageCardGroup {
  provider: UsageProviderId;
  /** Whose logins Choose login offers, or null for no such control (Phase 374). */
  login: LoginProviderId | null;
  lines: string[];
}

/** Every drawn row's block on the card, in the order the rows are drawn. */
export function usageCardGroups(
  shown: readonly UsageProviderSnapshot[],
  now: number,
  sessions: readonly { agent: string; status: string; login?: string }[],
  logins: LoginsSnapshot
): UsageCardGroup[] {
  return shown.map((p) => ({
    provider: p.provider,
    login: usageLoginProvider(p.provider),
    lines: cardLines(p, now, sessionsElsewhere(sessions, p), loginEmailOf(logins, p))
  }));
}

/**
 * Is there a drawn row a refresh can do anything for? (Phase 374). A receiver
 * is asked nothing, so a meter of nothing but receivers draws no control that
 * would press and do nothing. One asked row is enough for the control to stay,
 * and it asks for that row alone.
 */
export function usageCanRefresh(shown: readonly UsageProviderSnapshot[]): boolean {
  return shown.some((p) => !usageIsReceiver(p.provider));
}

/** Exported for its test: this repository carries no jsdom and no portal. */
export function UsageCardBlock({
  group,
  onChooseLogin
}: {
  group: UsageCardGroup;
  onChooseLogin: ((provider: LoginProviderId, at: DOMRect) => void) | null;
}): React.JSX.Element {
  const login = group.login;
  return (
    <div className="usage-card-group">
      {group.lines.map((text, j) => (
        <div
          className={j === 0 ? 'usage-card-name' : 'usage-card-line'}
          key={text}
        >
          {text}
        </div>
      ))}
      {onChooseLogin === null || login === null ? null : (
        <button
          type="button"
          className="usage-card-action"
          data-login-control={login}
          onClick={(e) =>
            onChooseLogin(
              login,
              (e.currentTarget as HTMLElement).getBoundingClientRect()
            )
          }
        >
          {USAGE_LOGIN_CONTROL}
        </button>
      )}
    </div>
  );
}

/**
 * The hover card, portalled to the body and positioned in raw viewport pixels
 * for the reason ./SessionRail.tsx states: the dock is a CSS zoomable region
 * and a fixed position card inside a zoomed ancestor resolves in zoomed space.
 */
function UsageCard({
  anchor,
  groups,
  onEnter,
  onLeave,
  onChooseLogin
}: {
  anchor: UsageAnchor;
  groups: UsageCardGroup[];
  onEnter: () => void;
  onLeave: () => void;
  /** Null on a build whose preload has no logins member or no popup menu. */
  onChooseLogin: ((provider: LoginProviderId, at: DOMRect) => void) | null;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const h = el.getBoundingClientRect().height;
    setTop(usageCardTop(anchor, h, window.innerHeight));
  }, [anchor, groups]);

  return createPortal(
    <div
      ref={ref}
      className="usage-card"
      role="dialog"
      aria-label={USAGE_TITLE}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={
        top === null
          ? { top: 0, right: anchor.x, visibility: 'hidden' }
          : { top, right: anchor.x }
      }
    >
      {groups.map((group, i) => (
        <UsageCardBlock
          key={group.lines[0] ?? String(i)}
          group={group}
          onChooseLogin={onChooseLogin}
        />
      ))}
    </div>,
    document.body
  );
}

/**
 * The box the two smaller densities draw their rows in, and the press on it.
 *
 * The same box with no press when there is nothing to refresh (Phase 374): a
 * button that does nothing is a control a person presses twice, so it is not
 * one at all, and the box keeps its padding and its gaps so no row moves.
 */
function UsagePress({
  onPress,
  busy,
  children
}: {
  onPress: (() => void) | null;
  busy: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  if (onPress === null) {
    return <div className="usage-press usage-press-still">{children}</div>;
  }
  return (
    <button
      type="button"
      className="usage-press"
      aria-label={USAGE_REFRESH}
      title={USAGE_REFRESH}
      disabled={busy}
      onClick={onPress}
    >
      {children}
    </button>
  );
}

export function UsageMeter({
  density
}: {
  density: UsageDensity;
}): React.JSX.Element | null {
  const snapshot = useUsage((s) => s.snapshot);
  const refreshing = useUsage((s) => s.refreshing);
  const refresh = useUsage((s) => s.refresh);
  const ensurePolling = useUsage((s) => s.ensurePolling);
  // The window the bar means (Phase 181.2). It is one setting for every meter
  // and every provider, and it arrives on the settings broadcast, so a change
  // made in Settings moves the bar in the meter that is already on screen and
  // in a card that is already open, rather than at the next poll or mount.
  const bar = useUsage((s) => s.barWindow);
  const now = useNow(60_000);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [card, setCard] = useState<UsageAnchor | null>(null);
  // PHASE 202. The card now carries a control, so the pointer has to be able
  // to travel into it. The gap between the meter and the card is six pixels,
  // and this is the grace that crossing it costs.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loginsSnapshot = useLogins((s) => s.snapshot);
  const loadLogins = useLogins((s) => s.load);
  const loginsAvailable = useLogins((s) => s.available);
  const chooseLogin = useLogins((s) => s.choose);
  const sessions = useApp((s) => s.sessions);
  const openAddLogin = useApp((s) => s.setAddLoginProvider);

  useEffect(() => {
    ensurePolling();
  }, [ensurePolling]);

  useEffect(() => () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
  }, []);

  const shown = snapshot.providers.filter((p) => p.state !== 'off');
  if (shown.length === 0) return null;

  const groups = usageCardGroups(shown, now, sessions, loginsSnapshot);
  const canRefresh = usageCanRefresh(shown);

  const cancelClose = (): void => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const scheduleClose = (): void => {
    cancelClose();
    closeTimer.current = setTimeout(() => setCard(null), HOVER_CLOSE_GRACE_MS);
  };

  const showCard = (): void => {
    const el = hostRef.current;
    if (el === null) return;
    cancelClose();
    // A card that names no login asks for none (Phase 374).
    if (groups.some((group) => group.login !== null)) void loadLogins();
    const r = el.getBoundingClientRect();
    setCard({
      x: Math.max(VIEWPORT_MARGIN, window.innerWidth - r.left + ANCHOR_GAP),
      top: r.top,
      bottom: r.bottom
    });
  };

  const hover = {
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      showCard();
    },
    onPointerLeave: () => scheduleClose()
  };

  /**
   * The login control. NATIVE, through the ui:popupMenu bridge, and absent
   * altogether on a build whose preload has no popup menu or no logins member,
   * because Tortie draws no DOM menu as a fallback.
   *
   * Picking a login writes one name. It sends nothing to any running process:
   * a session keeps the login it started with, and the card's own line says so
   * when they differ. Add login opens the one dialog that asks for a name.
   */
  const popup = gmuxBridge()?.popupMenu;
  const onChooseLogin =
    popup === undefined || !loginsAvailable
      ? null
      : (provider: LoginProviderId, at: DOMRect): void => {
          const rows = loginsOf(loginsSnapshot, provider);
          void popup
            .call(gmuxBridge(), {
              x: Math.round(at.left),
              y: Math.round(at.bottom),
              items: loginMenuItems(rows, IS_MAC)
            })
            .then((picked) => {
              const action = loginMenuPick(picked);
              if (action === null) return;
              if (action.kind === 'add') {
                setCard(null);
                openAddLogin(provider);
                return;
              }
              const row = rows.find((r) => r.name === action.name);
              // PHASE 211. The sentence after a switch and its `Restart now`
              // are the store's, in `../state/logins`, so the Settings list
              // and this card say the same thing.
              void chooseLogin(provider, row?.isDefault === true ? null : action.name);
            })
            .catch(() => undefined);
        };

  const press = canRefresh ? (): void => void refresh() : null;

  if (density === 'full') {
    return (
      <div
        ref={hostRef}
        className="usage-meter usage-full"
        data-slot="usage-meter"
        {...hover}
      >
        <div className="usage-rows">
          {shown.map((p) => (
            <UsageRow key={p.provider} p={p} now={now} bar={bar} />
          ))}
        </div>
        {canRefresh ? (
          <button
            type="button"
            className="icon-btn usage-refresh"
            aria-label={USAGE_REFRESH}
            title={USAGE_REFRESH}
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            <Codicon name="refresh" size="sm" />
          </button>
        ) : null}
        {card !== null ? (
          <UsageCard
            anchor={card}
            groups={groups}
            onEnter={cancelClose}
            onLeave={scheduleClose}
            onChooseLogin={onChooseLogin}
          />
        ) : null}
      </div>
    );
  }

  if (density === 'compact') {
    return (
      <div
        ref={hostRef}
        className="usage-meter usage-compact"
        data-slot="usage-meter"
        {...hover}
      >
        <UsagePress onPress={press} busy={refreshing}>
          {shown.map((p) => (
            <UsageRow key={p.provider} p={p} now={now} bar={bar} />
          ))}
        </UsagePress>
        {card !== null ? (
          <UsageCard
            anchor={card}
            groups={groups}
            onEnter={cancelClose}
            onLeave={scheduleClose}
            onChooseLogin={onChooseLogin}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className="usage-meter usage-mini"
      data-slot="usage-meter"
      {...hover}
    >
      <UsagePress onPress={press} busy={refreshing}>
        {shown.map((p) => {
          const percent = barPercent(p, bar);
          return (
            <span className="usage-mini-row" key={p.provider}>
              <AgentIcon agent={p.provider} size={11} className="usage-icon" />
              {percent === null ? (
                <span className="usage-bar sev-none" />
              ) : (
                <UsageBar percent={percent} />
              )}
              <span className="usage-hidden">
                {usageHasNumbers(p) || p.second != null
                  ? cardLines(p, now).join('. ')
                  : usageStateLine(p.provider, p.state, p.waitingFor)}
              </span>
            </span>
          );
        })}
      </UsagePress>
      {card !== null ? (
        <UsageCard
          anchor={card}
          groups={groups}
          onEnter={cancelClose}
          onLeave={scheduleClose}
          onChooseLogin={onChooseLogin}
        />
      ) : null}
    </div>
  );
}
