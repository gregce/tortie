/**
 * The Phase 202 harness drive, being the renderer half of
 * `build/probe-p202-logins.mjs`.
 *
 * ## What the probe is proving with it
 *
 * That the meter follows the login a person chose, that the hover card says
 * WHOSE numbers are on screen and which sessions are somewhere else, and that
 * a login control is offered at all. Those are questions about what is drawn
 * and what the shipped store actually did, so this file opens the real card,
 * calls the real store actions and reads the real DOM, and the probe judges.
 *
 * ## Everything below the store is the shipped path
 *
 * `choose`, `add` and `remove` go through `../state/logins`, which invokes the
 * same four channels the card and Settings invoke. Nothing here writes a
 * snapshot by hand: unlike the Phase 181.2 drive, which stages invented
 * numbers because it must read no credential at all, this drive reads what
 * main really answered, and main is answering from the probe's own fixture.
 *
 * The card is opened with a real `pointerover` carrying `pointerType: 'mouse'`,
 * which is the event React's enter and leave plugin listens for at the root,
 * so it opens the way it opens for a pointer rather than through a setter.
 *
 * It assigns exactly one object to `window` and changes nothing else, in the
 * shape ./p1812-usage-drive.ts beside it set. Outside the harness it is one
 * unused property, and `./probe-loader.ts` means a person's launch never loads
 * this file at all.
 */

import type { LoginProviderId } from '@shared/logins';
import { useLogins } from '../state/logins';
import { useUsage } from '../state/usage';
import { useApp } from '../state/store';

/** One login as the drive reports it, which is what the card's menu lists. */
export interface P202LoginRow {
  provider: string;
  name: string;
  isDefault: boolean;
  chosen: boolean;
  present: boolean;
  /** Phase 211: Tortie holds a copy, and choosing it would put one back. */
  kept: boolean;
  restores: boolean;
}

/** One provider's meter row, as main answered it. */
export interface P202MeterRow {
  provider: string;
  state: string;
  plan: string | null;
  login: string | null;
  fivePercent: number | null;
}

/** What one reading holds. Everything here was read, nothing was invented. */
export interface P202Reading {
  logins: P202LoginRow[];
  problems: string[];
  meter: P202MeterRow[];
  /** True while the hover card is in the document. */
  cardOpen: boolean;
  /** Every line the card drew, in order, grouped by provider. */
  cardText: string[];
  /** The label of every login control the card drew, one per provider group. */
  cardControls: string[];
  /** The provider each control belongs to, in the same order. */
  cardControlProviders: string[];
  /** Each session's id, agent, status and the login its row records. */
  sessions: {
    id: string;
    name: string;
    agent: string;
    status: string;
    login: string | null;
  }[];
  /** Every toast on screen, which is where a fallback sentence lands. */
  toasts: string[];
}

declare global {
  interface Window {
    __gmuxP202?: P202Drive;
  }
}

export interface P202Drive {
  /** What is on screen and what main last answered. */
  read(): Promise<P202Reading>;
  /** Open the card with a real pointer event. False when no meter is drawn. */
  hover(): Promise<boolean>;
  /** Close it the same way. */
  leave(): Promise<void>;
  /** Ask main for the login list again. */
  loadLogins(): Promise<void>;
  /** Create an empty login directory. Starts nothing. */
  addLogin(provider: LoginProviderId, name: string): Promise<boolean>;
  /** Choose which login the NEXT sessions of this provider run under. */
  chooseLogin(provider: LoginProviderId, name: string | null): Promise<boolean>;
  /** Forget a login and delete the directory Tortie made for it. */
  removeLogin(provider: LoginProviderId, name: string): Promise<boolean>;
  /** Click the card's own login control, which raises the NATIVE menu. */
  clickLoginControl(provider: LoginProviderId): Promise<boolean>;
  /** Start one ordinary session, exactly as a person would. */
  createSession(
    name: string,
    agent: string,
    login?: string,
    signIn?: boolean
  ): Promise<boolean>;
  /** The usage meter's own refresh control, so a poll is not waited for. */
  refreshUsage(): Promise<void>;
  /**
   * ONE ORDINARY POLL, being `usage:read` rather than the refresh control.
   *
   * It is the honest way to ask whether the meter follows a chosen login
   * WITHIN ONE POLL: an ordinary read is refused by the fifteen minute
   * interval, so a read that comes back on the new login came back because the
   * login moved and for no other reason.
   */
  pollUsage(): Promise<P202MeterRow[]>;
  /** Restore a saved session, which is the path that re-resolves its login. */
  restoreSession(id: string): Promise<boolean>;
  /** End a session, the way a person does. */
  removeSession(id: string): Promise<void>;
  /** Forget every toast, so the next sentence read is the next one posted. */
  clearToasts(): Promise<void>;
  /** Turn a provider's meter on, which is a person's own act in Settings. */
  setUsageOn(provider: 'claude' | 'codex', on: boolean): Promise<void>;
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** The one meter that is actually drawn. Three are mounted; one has a box. */
function drawnMeter(): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(
    '[data-slot="usage-meter"]'
  )) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function readNow(): P202Reading {
  const card = document.querySelector('.usage-card');
  const controls = card === null ? [] : [...card.querySelectorAll<HTMLElement>('.usage-card-action')];
  return {
    logins: useLogins.getState().snapshot.logins.map((l) => ({
      provider: l.provider,
      name: l.name,
      isDefault: l.isDefault,
      chosen: l.chosen,
      present: l.present,
      kept: l.kept,
      restores: l.restores
    })),
    problems: [...useLogins.getState().snapshot.problems],
    meter: useUsage.getState().snapshot.providers.map((p) => ({
      provider: p.provider,
      state: p.state,
      plan: p.plan,
      login: p.login,
      fivePercent: p.fiveHour?.percent ?? null
    })),
    cardOpen: card !== null,
    cardText:
      card === null
        ? []
        : [...card.querySelectorAll('.usage-card-name, .usage-card-line')].map((el) =>
            (el.textContent ?? '').trim()
          ),
    cardControls: controls.map((el) => (el.textContent ?? '').trim()),
    cardControlProviders: controls.map((el) => el.dataset['loginControl'] ?? ''),
    sessions: useApp.getState().sessions.map((s) => ({
      id: s.id,
      name: s.name,
      agent: s.agent,
      status: s.status,
      login: s.login ?? null
    })),
    toasts: useApp.getState().toasts.map((t) => t.text)
  };
}

export function registerP202LoginsDrive(): void {
  const drive: P202Drive = {
    async read() {
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );
      return readNow();
    },

    async hover() {
      const meter = drawnMeter();
      if (meter === null) return false;
      meter.dispatchEvent(
        new PointerEvent('pointerover', {
          pointerType: 'mouse',
          bubbles: true,
          cancelable: true,
          relatedTarget: null
        })
      );
      await wait(250);
      return document.querySelector('.usage-card') !== null;
    },

    async leave() {
      const meter = drawnMeter();
      if (meter === null) return;
      meter.dispatchEvent(
        new PointerEvent('pointerout', {
          pointerType: 'mouse',
          bubbles: true,
          cancelable: true,
          relatedTarget: document.body
        })
      );
      await wait(250);
    },

    async loadLogins() {
      await useLogins.getState().load();
    },

    async addLogin(provider, name) {
      return useLogins.getState().add(provider, name);
    },

    async chooseLogin(provider, name) {
      return useLogins.getState().choose(provider, name);
    },

    async removeLogin(provider, name) {
      return useLogins.getState().remove(provider, name);
    },

    async clickLoginControl(provider) {
      const el = document.querySelector<HTMLElement>(
        `.usage-card-action[data-login-control="${provider}"]`
      );
      if (el === null) return false;
      el.click();
      await wait(400);
      return true;
    },

    async createSession(name, agent, login, signIn) {
      return useApp.getState().createSession({
        name,
        agent: agent as never,
        ...(login === undefined ? {} : { login }),
        ...(signIn === true ? { signIn: true } : {})
      });
    },

    async refreshUsage() {
      await useUsage.getState().refresh();
    },

    async pollUsage() {
      const api = window.gmux?.usage;
      if (api === undefined) return [];
      const snap = await api.read();
      return snap.providers.map((p) => ({
        provider: p.provider,
        state: p.state,
        plan: p.plan,
        login: p.login,
        fivePercent: p.fiveHour?.percent ?? null
      }));
    },

    async restoreSession(id) {
      const before = useApp.getState().sessions.find((s) => s.id === id);
      if (before === undefined) return false;
      await useApp.getState().restoreSession(id);
      await wait(1200);
      return useApp.getState().sessions.some((s) => s.id === id);
    },

    async removeSession(id) {
      await useApp.getState().removeSession(id);
      await wait(600);
    },

    async clearToasts() {
      for (const t of [...useApp.getState().toasts]) {
        useApp.getState().dismissToast(t.id);
      }
    },

    async setUsageOn(provider, on) {
      const bridge = window.gmux;
      if (bridge === undefined) return;
      const settings = await bridge.settingsGet();
      await bridge.settingsSet({ usage: { ...settings.usage, [provider]: on } });
      await wait(400);
    }
  };

  window.__gmuxP202 = drive;
}
