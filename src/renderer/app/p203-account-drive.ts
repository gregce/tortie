/**
 * The Phase 203 harness drive, being the renderer half of
 * `build/probe-p203-account.mjs`.
 *
 * ## What the probe is proving with it
 *
 * That a login is drawn as its ACCOUNT, and that a login whose credential is
 * only in the keychain no longer says `Not signed in yet`. Those are questions
 * about what main really answered and what the app really drew, so this file
 * turns the meters on the way a person does, opens the real hover card with a
 * real pointer event, reads the real DOM, and composes the menu with the
 * SHIPPING `loginMenuItems` over the rows main sent. The probe judges.
 *
 * ## Everything below this file is the shipped path
 *
 * Nothing here writes a snapshot by hand. `load` goes through
 * `../state/logins`, which invokes the same `logins:list` the card and the
 * Settings window invoke, and main answers it from the login directories the
 * probe made. The menu is not photographed because it is NATIVE, so what is
 * read is the item list the shipped composer produces from those same rows,
 * which is what `ui:popupMenu` is handed.
 *
 * It assigns exactly one object to `window` and changes nothing else, in the
 * shape ./p202-logins-drive.ts beside it set. `./probe-loader.ts` means a
 * person's launch never loads this file at all.
 */

import type { LoginProviderId } from '@shared/logins';
import { LOGIN_PROVIDERS } from '@shared/logins';
import { loginsOf, useLogins } from '../state/logins';
import { useUsage } from '../state/usage';
import { useApp } from '../state/store';
import { loginMenuItems } from './login-menu';

/** One login as main answered it, which is what every surface draws from. */
export interface P203LoginRow {
  provider: string;
  name: string;
  isDefault: boolean;
  chosen: boolean;
  present: boolean;
  email: string | null;
}

/** One native menu item, as the shipped composer produces it. */
export interface P203MenuItem {
  provider: string;
  id: string;
  label: string;
  sublabel: string | null;
}

/** What one reading holds. Everything here was read, nothing was invented. */
export interface P203Reading {
  logins: P203LoginRow[];
  problems: string[];
  menu: P203MenuItem[];
  /** True while the hover card is in the document. */
  cardOpen: boolean;
  /** Every line the card drew, in order, grouped by provider. */
  cardText: string[];
  /** Each provider's meter state and the login its numbers came from. */
  meter: { provider: string; state: string; login: string | null }[];
  /** What went wrong on the way, so an empty reading is never a silent one. */
  trail: string[];
}

declare global {
  interface Window {
    __gmuxP203?: P203Drive;
  }
}

export interface P203Drive {
  /**
   * Open a project, turn both meters on, read the list, open the card, report.
   *
   * THE PROJECT IS WHY THERE IS A METER AT ALL. The meters live at the foot of
   * the sessions dock and in the tab strip, and an app with no project open has
   * neither, so a probe that hovered before opening one would read an empty
   * card and call it a defect. The path is a scratch folder the probe made.
   */
  arm(projectPath: string): Promise<P203Reading>;
  /** Read again without touching anything. */
  read(): Promise<P203Reading>;
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

function readNow(trail: string[]): P203Reading {
  const snapshot = useLogins.getState().snapshot;
  const card = document.querySelector('.usage-card');
  const menu: P203MenuItem[] = [];
  for (const provider of LOGIN_PROVIDERS as readonly LoginProviderId[]) {
    for (const item of loginMenuItems(loginsOf(snapshot, provider))) {
      menu.push({
        provider,
        id: item.id,
        label: item.label,
        sublabel: item.sublabel ?? null
      });
    }
  }
  return {
    logins: snapshot.logins.map((l) => ({
      provider: l.provider,
      name: l.name,
      isDefault: l.isDefault,
      chosen: l.chosen,
      present: l.present,
      email: l.email
    })),
    problems: [...snapshot.problems],
    menu,
    cardOpen: card !== null,
    cardText:
      card === null
        ? []
        : [...card.querySelectorAll('.usage-card-name, .usage-card-line')].map((el) =>
            (el.textContent ?? '').trim()
          ),
    meter: useUsage.getState().snapshot.providers.map((p) => ({
      provider: p.provider,
      state: p.state,
      login: p.login
    })),
    trail
  };
}

export function registerP203AccountDrive(): void {
  const drive: P203Drive = {
    async read() {
      return readNow(['read']);
    },

    async arm(projectPath: string) {
      const trail: string[] = [];
      const bridge = window.gmux;
      if (bridge === undefined) return readNow(['no bridge']);
      if (projectPath.length > 0) {
        await useApp.getState().addProjectPath(projectPath);
        await wait(600);
        trail.push(`projects ${String(useApp.getState().projects.length)}`);
      }
      // A PERSON'S OWN ACT, through main's own settings write, which is what
      // makes a meter exist at all. Both default off.
      const settings = await bridge.settingsGet();
      await bridge.settingsSet({
        usage: { ...settings.usage, claude: true, codex: true }
      });
      trail.push('meters on');
      await wait(600);
      await useUsage.getState().refresh();
      trail.push('usage read');
      await useLogins.getState().load();
      trail.push(`logins ${String(useLogins.getState().snapshot.logins.length)}`);
      trail.push(
        `meters mounted ${String(document.querySelectorAll('[data-slot="usage-meter"]').length)}`
      );
      const meter = drawnMeter();
      if (meter === null) trail.push('no meter drawn');
      else {
        // The real event React's enter and leave plugin listens for at the
        // root, so the card opens the way it opens for a pointer.
        meter.dispatchEvent(
          new PointerEvent('pointerover', {
            pointerType: 'mouse',
            bubbles: true,
            cancelable: true,
            relatedTarget: null
          })
        );
        await wait(500);
        trail.push('hovered');
      }
      return readNow(trail);
    }
  };

  window.__gmuxP203 = drive;
}
