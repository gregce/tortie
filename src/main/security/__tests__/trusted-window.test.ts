/**
 * The trusted-window policy (Phase 42 stage 1) — the sender and navigation
 * halves of the protection suite the audit names ("Sender, navigation,
 * invoke-closure, and AttachHost cleanup tests"; the other two live in
 * src/shared/__tests__/ipc-single-bridge.test.ts and
 * src/main/attach/__tests__/attach-host.test.ts).
 *
 * Three groups:
 *
 * 1. The pure decisions — window.open is always denied (http(s) goes to the
 *    system browser), navigation is allowed only when it is a reload.
 * 2. The apply wiring — a fake BrowserWindow proves the policy installs the
 *    open handler, the will-navigate listener, and the sender registration,
 *    and that the registration dies with the WebContents.
 * 3. The application sites — source scans prove BOTH windows (main and
 *    Settings) apply the policy and that typed-ipc's `handle` asserts the
 *    sender before dispatch, so all 124 invoke channels are covered by the
 *    one check.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const openExternal = vi.fn();
vi.mock('electron', () => ({ shell: { openExternal } }));

const {
  applyTrustedWindowPolicy,
  assertTrustedIpcSender,
  decideNavigation,
  decideWindowOpen,
  isTrustedIpcSender,
  registerTrustedIpcSender
} = await import('../trusted-window');

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

let nextId = 1;

interface FakeWebContents {
  id: number;
  mainFrame: object;
  once: ReturnType<typeof vi.fn>;
  setWindowOpenHandler: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  getURL: () => string;
  emitDestroyed: () => void;
  openHandler:
    | ((details: { url: string }) => { action: string })
    | null;
  navListener:
    | ((event: { preventDefault: () => void }, url: string) => void)
    | null;
}

function makeWebContents(currentUrl = 'file:///app/index.html'): FakeWebContents {
  let destroyedCb: (() => void) | null = null;
  const wc: FakeWebContents = {
    id: nextId++,
    mainFrame: {},
    openHandler: null,
    navListener: null,
    once: vi.fn((event: string, cb: () => void) => {
      if (event === 'destroyed') destroyedCb = cb;
    }),
    setWindowOpenHandler: vi.fn((fn: FakeWebContents['openHandler']) => {
      wc.openHandler = fn;
    }),
    on: vi.fn((event: string, fn: FakeWebContents['navListener']) => {
      if (event === 'will-navigate') wc.navListener = fn;
    }),
    getURL: () => currentUrl,
    emitDestroyed: () => destroyedCb?.()
  };
  return wc;
}

function invokeEventFrom(
  wc: FakeWebContents,
  frame: object | null = wc.mainFrame
) {
  return { sender: wc, senderFrame: frame } as never;
}

beforeEach(() => {
  openExternal.mockClear();
});

// ---------------------------------------------------------------------------
// 1. Pure decisions
// ---------------------------------------------------------------------------

describe('decideWindowOpen', () => {
  it('denies every child window', () => {
    expect(decideWindowOpen('https://example.com').allow).toBe(false);
    expect(decideWindowOpen('file:///etc/passwd').allow).toBe(false);
    expect(decideWindowOpen('about:blank').allow).toBe(false);
  });

  it('sends http and https to the system browser, nothing else', () => {
    expect(decideWindowOpen('https://example.com').openExternally).toBe(true);
    expect(decideWindowOpen('HTTP://EXAMPLE.COM').openExternally).toBe(true);
    expect(decideWindowOpen('file:///etc/passwd').openExternally).toBe(false);
    expect(decideWindowOpen('javascript:alert(1)').openExternally).toBe(false);
  });
});

describe('decideNavigation', () => {
  const HOME = 'file:///app/index.html';

  it('allows only the reload (same URL)', () => {
    expect(decideNavigation(HOME, HOME)).toEqual({
      allow: true,
      openExternally: false
    });
  });

  it('blocks foreign navigation; http(s) goes to the browser', () => {
    expect(decideNavigation('https://example.com', HOME)).toEqual({
      allow: false,
      openExternally: true
    });
    expect(decideNavigation('file:///other.html', HOME)).toEqual({
      allow: false,
      openExternally: false
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Apply wiring + sender registry
// ---------------------------------------------------------------------------

describe('applyTrustedWindowPolicy', () => {
  function apply(wc: FakeWebContents) {
    applyTrustedWindowPolicy({ webContents: wc } as never);
  }

  it('denies window.open and hands http(s) to the system browser', () => {
    const wc = makeWebContents();
    apply(wc);

    expect(wc.openHandler).not.toBeNull();
    expect(wc.openHandler!({ url: 'https://example.com' })).toEqual({
      action: 'deny'
    });
    expect(openExternal).toHaveBeenCalledWith('https://example.com');

    openExternal.mockClear();
    expect(wc.openHandler!({ url: 'file:///x' })).toEqual({ action: 'deny' });
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('prevents navigation except the reload', () => {
    const wc = makeWebContents('file:///app/index.html');
    apply(wc);
    expect(wc.navListener).not.toBeNull();

    const blocked = { preventDefault: vi.fn() };
    wc.navListener!(blocked, 'https://example.com');
    expect(blocked.preventDefault).toHaveBeenCalledTimes(1);
    expect(openExternal).toHaveBeenCalledWith('https://example.com');

    const reload = { preventDefault: vi.fn() };
    wc.navListener!(reload, 'file:///app/index.html');
    expect(reload.preventDefault).not.toHaveBeenCalled();
  });

  it('registers the window as a trusted IPC sender for its lifetime', () => {
    const wc = makeWebContents();
    apply(wc);

    expect(isTrustedIpcSender(invokeEventFrom(wc))).toBe(true);
    wc.emitDestroyed();
    expect(isTrustedIpcSender(invokeEventFrom(wc))).toBe(false);
  });
});

describe('IPC sender trust', () => {
  it('refuses a WebContents that was never registered', () => {
    const stranger = makeWebContents();
    expect(isTrustedIpcSender(invokeEventFrom(stranger))).toBe(false);
    expect(() =>
      assertTrustedIpcSender(invokeEventFrom(stranger), 'settings:get')
    ).toThrow(/untrusted sender/);
  });

  it('accepts only the main frame of a registered WebContents', () => {
    const wc = makeWebContents();
    registerTrustedIpcSender(wc as never);

    expect(isTrustedIpcSender(invokeEventFrom(wc, wc.mainFrame))).toBe(true);
    // A subframe (e.g. the sandboxed preview iframe) is never trusted.
    expect(isTrustedIpcSender(invokeEventFrom(wc, {}))).toBe(false);
    // A frame disposed mid-flight does not turn a trusted call into a refusal.
    expect(isTrustedIpcSender(invokeEventFrom(wc, null))).toBe(true);
  });

  it('assert passes silently for a trusted sender', () => {
    const wc = makeWebContents();
    registerTrustedIpcSender(wc as never);
    expect(() =>
      assertTrustedIpcSender(invokeEventFrom(wc), 'settings:get')
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3. Application sites (source scans, like preview/__tests__/wiring.test.ts)
// ---------------------------------------------------------------------------

describe('the policy is applied where it must be', () => {
  const MAIN = join(__dirname, '..', '..');
  const code = (...p: string[]) => readFileSync(join(MAIN, ...p), 'utf8');

  it('the main window applies the trusted-window policy', () => {
    expect(code('index.ts')).toContain('applyTrustedWindowPolicy(win)');
  });

  it('the Settings window applies the trusted-window policy', () => {
    expect(code('settings', 'window.ts')).toContain(
      'applyTrustedWindowPolicy(win)'
    );
  });

  it('neither window keeps a private navigation policy of its own', () => {
    for (const file of [
      code('index.ts'),
      code('settings', 'window.ts')
    ]) {
      expect(file).not.toContain('setWindowOpenHandler');
      expect(file).not.toContain("on('will-navigate'");
    }
  });

  it('typed-ipc asserts the sender before dispatching any invoke', () => {
    const typedIpc = code('typed-ipc.ts');
    expect(typedIpc).toContain('assertTrustedIpcSender(event, channel)');
  });
});
