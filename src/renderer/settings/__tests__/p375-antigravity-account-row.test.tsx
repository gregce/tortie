/**
 * Settings then Agents, Logins: the Antigravity account line (Phase 375;
 * build/p375/SPEC.md D9, D10, D15, rows C6 and C7), run rather than read.
 *
 * One row after Codex's logins and before the captions, read only: the
 * address and one sentence saying it is switched in the Antigravity CLI. It is
 * drawn only while the Antigravity switch is on and an address is known, it
 * carries no control, and Claude's and Codex's blocks are drawn as the parent
 * drew them. The address is read through `usage:account` and followed through
 * `usage.onChanged`, never through `usage:read`, which may ask a vendor.
 *
 * This repository carries no jsdom, so the page renders through
 * `renderToStaticMarkup` and no effect runs: the row is drawn directly, and
 * the watcher the effect calls is driven over a fake bridge. Every address is
 * invented.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LoginsSnapshot } from '@shared/logins';
import { defaultLoginRow } from '@shared/logins';
import type { UsageProviderSnapshot, UsageSnapshot } from '@shared/usage';
import { defaultGmuxSettings } from '@shared/settings';
import { emptyUsageProvider } from '@shared/usage';
import { useLogins } from '../../state/logins';
import { useSettingsStore } from '../settings-store';
import {
  AntigravityAccountRow,
  UsageGroup,
  watchAntigravityAccount
} from '../UsageGroup';
import {
  USAGE_ABOUT_KEPT,
  USAGE_ANTIGRAVITY_ACCOUNT_NOTE,
  USAGE_ANTIGRAVITY_LABEL,
  USAGE_LOGINS_LABEL,
  USAGE_LOGIN_REMOVE
} from '../usage-copy';

const A = 'p375-face-a@example.invalid';
const B = "o'brien.p375+b@example.invalid";

const settingsInitial = useSettingsStore.getInitialState();
const shippedSettings = settingsInitial.settings;
const loginsInitial = useLogins.getInitialState();
const shippedLogins = loginsInitial.snapshot;

function switchOn(on: boolean): void {
  const settings = defaultGmuxSettings();
  settingsInitial.settings = { ...settings, usage: { ...settings.usage, antigravity: on } };
}

function decode(markup: string): string {
  return markup.replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
}

afterEach(() => {
  settingsInitial.settings = shippedSettings;
  loginsInitial.snapshot = shippedLogins;
});

describe('C6: the row', () => {
  it('C6: draws the address and its one sentence, with no control, only while on and known', () => {
    switchOn(true);
    for (const address of [A, B]) {
      const markup = decode(renderToStaticMarkup(<AntigravityAccountRow address={address} />));
      expect(markup).toBe(
        '<div class="set-row tall" data-logins="antigravity"><div class="set-row-text">' +
          `<span class="set-row-label">${USAGE_ANTIGRAVITY_LABEL}</span>` +
          `<span class="set-row-caption" data-antigravity-account="1">${address} · ${USAGE_ANTIGRAVITY_ACCOUNT_NOTE}</span>` +
          '</div></div>'
      );
      expect(markup).not.toContain('<button');
      expect(markup).not.toContain(USAGE_LOGIN_REMOVE);
      expect(markup).not.toMatch(/choose/i);
    }
  });

  it('C6: draws nothing while off, address or not', () => {
    switchOn(false);
    expect(renderToStaticMarkup(<AntigravityAccountRow address={A} />)).toBe('');
    expect(renderToStaticMarkup(<AntigravityAccountRow address={null} />)).toBe('');
  });

  it('C6: draws nothing while on with no address, or with one the shared check refuses', () => {
    switchOn(true);
    for (const address of [null, '', 'jö@example.invalid', 'a"b@example.invalid', `${'x'.repeat(250)}@example.invalid`]) {
      expect(renderToStaticMarkup(<AntigravityAccountRow address={address} />), String(address)).toBe('');
    }
  });

  it('C6: sits between Codex\'s logins and the captions, and the page draws none before an answer', () => {
    const source = readFileSync(join(__dirname, '..', 'UsageGroup.tsx'), 'utf8');
    const codex = source.indexOf('<LoginsBlock provider="codex"');
    const row = source.indexOf('<AntigravityAccountRow address={antigravityAccount} />');
    const captions = source.indexOf('<LoginsCaptions />');
    expect(codex).toBeGreaterThan(-1);
    expect(row).toBeGreaterThan(codex);
    expect(captions).toBeGreaterThan(row);
    expect(source.split('<AntigravityAccountRow').length - 1).toBe(1);
    // The address is asked for on mount and again on every flip of the switch.
    expect(source).toMatch(
      /function useAntigravityAccount\(\)[\s\S]*?React\.useEffect\(\(\) => \{\s*setAddress\(null\);\s*return watchAntigravityAccount\(gmuxBridge\(\)\?\.usage, setAddress\);\s*\}, \[on\]\);/
    );
    switchOn(true);
    expect(renderToStaticMarkup(<UsageGroup />)).not.toContain('data-logins="antigravity"');
  });
});

describe('C6: Claude and Codex are the parent\'s', () => {
  const logins: LoginsSnapshot = {
    logins: [
      defaultLoginRow('claude', true, true, 'claude-own@example.com'),
      {
        provider: 'claude',
        name: 'Work',
        isDefault: false,
        chosen: false,
        present: true,
        email: 'work@example.com',
        kept: false,
        restores: false
      },
      defaultLoginRow('codex', true, true, null)
    ],
    problems: [],
    at: 1
  };

  /** The Logins card, recorded from the parent's static render (8d58c391). */
  const PARENT_LOGINS_CARD =
    '<div class="set-group-label">Logins</div><div class="set-card"><div class="set-row tall" data-logins="claude"><div class="set-row-text"><span class="set-row-label">Claude</span><span class="set-row-caption" data-login="Default" data-login-account="claude-own@example.com" data-login-kept="0" data-login-restores="0">claude-own@example.com · Your own sign in · Chosen</span><span class="set-row-caption" data-login="Work" data-login-account="work@example.com" data-login-kept="0" data-login-restores="0">work@example.com · Work<button type="button" class="set-inline-btn" data-login-remove="Work">Remove</button></span></div></div><div class="set-row tall" data-logins="codex"><div class="set-row-text"><span class="set-row-label">Codex</span><span class="set-row-caption" data-login="Default" data-login-account="" data-login-kept="0" data-login-restores="0">Your own sign in · Account not known yet · Chosen</span></div></div><div class="set-row"><div class="set-row-text"><span class="set-row-caption">Which sign in a new session runs under. Choose one from the usage meter. Running sessions keep the one they started with.</span><span class="set-row-caption">Removing deletes only the folder Tortie made. Sessions on that login come back on your own sign in.</span></div></div></div>';

  function loginsCard(on: boolean): string {
    switchOn(on);
    loginsInitial.snapshot = logins;
    const markup = renderToStaticMarkup(<UsageGroup />);
    const from = markup.indexOf(`<div class="set-group-label">${USAGE_LOGINS_LABEL}</div>`);
    const until = markup.indexOf('<details', from);
    expect(from).toBeGreaterThan(-1);
    return markup.slice(from, until);
  }

  it('C6: draws their blocks byte for byte as the parent did, on and off', () => {
    expect(loginsCard(false)).toBe(PARENT_LOGINS_CARD);
    expect(loginsCard(true)).toBe(PARENT_LOGINS_CARD);
  });
});

describe('C6: following the account', () => {
  function row(email?: unknown): UsageProviderSnapshot {
    const base = emptyUsageProvider('antigravity', 'ok');
    return email === undefined ? base : ({ ...base, email } as UsageProviderSnapshot);
  }
  function snapshot(antigravity: UsageProviderSnapshot): UsageSnapshot {
    return {
      at: 1,
      providers: [
        { ...emptyUsageProvider('claude', 'ok'), email: 'claude-row@example.invalid' },
        emptyUsageProvider('codex', 'ok'),
        antigravity
      ]
    };
  }
  function fake(answer: () => Promise<string | null>): {
    api: Parameters<typeof watchAntigravityAccount>[0];
    push: (s: UsageSnapshot) => void;
    listening: () => number;
    asked: () => number;
  } {
    const listeners = new Set<(s: UsageSnapshot) => void>();
    let asked = 0;
    return {
      api: {
        account: () => {
          asked += 1;
          return answer();
        },
        onChanged: (cb) => {
          listeners.add(cb);
          return () => listeners.delete(cb);
        }
      },
      push: (s) => {
        for (const cb of listeners) cb(s);
      },
      listening: () => listeners.size,
      asked: () => asked
    };
  }
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

  it('C6: reads the held address once, then follows the push, the Antigravity row alone', async () => {
    const seen: (string | null)[] = [];
    const f = fake(() => Promise.resolve(A));
    const stop = watchAntigravityAccount(f.api, (a) => seen.push(a));
    await settle();
    expect(f.asked()).toBe(1);
    expect(seen).toEqual([A]);
    f.push(snapshot(row(B)));
    f.push(snapshot(row()));
    f.push(snapshot(row('jö@example.invalid')));
    f.push(snapshot(row(42)));
    expect(seen).toEqual([A, B, null, null, null]);
    expect(f.asked()).toBe(1);
    stop();
    expect(f.listening()).toBe(0);
    f.push(snapshot(row(A)));
    expect(seen).toEqual([A, B, null, null, null]);
  });

  it('C6: draws nothing for a failed read, a refused answer or a read answered after the stop', async () => {
    const failed: (string | null)[] = [];
    watchAntigravityAccount(fake(() => Promise.reject(new Error('x'))).api, (a) => failed.push(a));
    const refused: (string | null)[] = [];
    watchAntigravityAccount(fake(() => Promise.resolve('a"b@example.invalid')).api, (a) => refused.push(a));
    const late: (string | null)[] = [];
    let release: (v: string) => void = () => undefined;
    const stop = watchAntigravityAccount(
      fake(() => new Promise<string | null>((resolve) => { release = resolve; })).api,
      (a) => late.push(a)
    );
    stop();
    release(A);
    await settle();
    expect(failed).toEqual([null]);
    expect(refused).toEqual([null]);
    expect(late).toEqual([]);
  });

  it('C6: asks nothing and draws nothing on a build with no account member', () => {
    const seen: (string | null)[] = [];
    let subscribed = 0;
    const stop = watchAntigravityAccount(
      { onChanged: () => { subscribed += 1; return () => undefined; } },
      (a) => seen.push(a)
    );
    stop();
    expect(watchAntigravityAccount(undefined, (a) => seen.push(a))).toBeTypeOf('function');
    expect(subscribed).toBe(0);
    expect(seen).toEqual([]);
  });

  it('C6: never asks the reads that may start a vendor request', () => {
    const source = readFileSync(join(__dirname, '..', 'UsageGroup.tsx'), 'utf8');
    expect(source).not.toMatch(/\.read\(\)|\.refresh\(\)/);
  });
});

describe('C7: the words', () => {
  const SENTENCES = [USAGE_ANTIGRAVITY_ACCOUNT_NOTE, USAGE_ABOUT_KEPT];

  it('C7: are the spec\'s, and KEPT names where the account is kept', () => {
    expect(USAGE_ANTIGRAVITY_ACCOUNT_NOTE).toBe('Signed in to the Antigravity CLI. Switch accounts there.');
    expect(USAGE_ABOUT_KEPT).toContain(
      "Antigravity's numbers and the account they belong to stay in Tortie's own folder"
    );
    expect(USAGE_ABOUT_KEPT).toContain('No part of a login reaches a log or any other file.');
    expect(USAGE_ABOUT_KEPT).not.toContain('reaches a log or a file.');
  });

  it('C7: keep the copy rules: no dash, no standalone it, no token, no tmux, no choosing', () => {
    for (const text of SENTENCES) {
      expect(text).not.toMatch(/[‐-―]/);
      expect(text).not.toContain(' - ');
      expect(text).not.toContain(' it ');
      expect(text).not.toContain(' it.');
      expect(text.toLowerCase()).not.toMatch(/token|bearer|tmux|pane|prefix|credit|google/);
    }
    expect(USAGE_ANTIGRAVITY_ACCOUNT_NOTE.split('. ').length).toBe(2);
    expect(USAGE_ANTIGRAVITY_ACCOUNT_NOTE).not.toMatch(/choose|from tortie/i);
  });
});
