/**
 * Renderer error capture (Phase 35): the window hooks and their bounds.
 *
 * The spec's rules are asserted rather than assumed: install is a no-op
 * without window.gmux.log, one window writes at most 50 lines per run, a
 * line identical to the one just written is suppressed, and nothing in the
 * module ever throws into a caller, because logging must never become the
 * thing that breaks the app.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererLogLine } from '@shared/ipc';
import {
  installRendererErrorCapture,
  rendererErrorCaptureState,
  resetRendererErrorCapture,
  writeErrorRecord
} from '../hooks';

type OnErrorHandler = (
  message: string | Event,
  source?: string,
  lineno?: number,
  colno?: number,
  error?: unknown
) => boolean;

let appended: RendererLogLine[] = [];
let appendImpl: (line: RendererLogLine) => Promise<void>;
let listeners: Record<string, ((event: unknown) => void)[]> = {};

/** A window with the bridge present. Returns the stubbed window object. */
function stubWindow(withLog: boolean): {
  onerror: OnErrorHandler | null;
  addEventListener: (type: string, cb: (event: unknown) => void) => void;
  gmux: Record<string, unknown>;
} {
  const win = {
    onerror: null as OnErrorHandler | null,
    addEventListener: (type: string, cb: (event: unknown) => void): void => {
      (listeners[type] ??= []).push(cb);
    },
    gmux: withLog
      ? {
          log: {
            append: (line: RendererLogLine) => appendImpl(line)
          }
        }
      : {}
  };
  vi.stubGlobal('window', win);
  return win;
}

beforeEach(() => {
  appended = [];
  listeners = {};
  appendImpl = (line) => {
    appended.push(line);
    return Promise.resolve();
  };
  resetRendererErrorCapture();
});

describe('feature detection', () => {
  it('does nothing when window.gmux.log is absent', () => {
    const win = stubWindow(false);
    installRendererErrorCapture('renderer');
    expect(rendererErrorCaptureState().scope).toBeNull();
    expect(win.onerror).toBeNull();
    expect(listeners['unhandledrejection']).toBeUndefined();
  });

  it('a write with no bridge is swallowed, not thrown', () => {
    stubWindow(false);
    expect(() => writeErrorRecord('renderer', 'boom')).not.toThrow();
    expect(appended).toHaveLength(0);
  });
});

describe('the hooks', () => {
  it('installs onerror and the rejection listener, once', () => {
    const win = stubWindow(true);
    installRendererErrorCapture('renderer');
    installRendererErrorCapture('renderer');
    expect(typeof win.onerror).toBe('function');
    expect(listeners['unhandledrejection']).toHaveLength(1);
    expect(rendererErrorCaptureState().scope).toBe('renderer');
  });

  it('onerror writes msg with source, line and column in fields', () => {
    const win = stubWindow(true);
    installRendererErrorCapture('renderer');
    win.onerror?.('boom', 'app/App.tsx', 12, 34, new Error('boom'));
    expect(appended).toHaveLength(1);
    expect(appended[0]).toEqual({
      level: 'error',
      scope: 'renderer',
      msg: 'boom',
      fields: { source: 'app/App.tsx', line: 12, col: 34 }
    });
  });

  it('unhandledrejection writes the reason stringified', () => {
    stubWindow(true);
    installRendererErrorCapture('settings');
    listeners['unhandledrejection']?.[0]?.({
      reason: new TypeError('x is not a function')
    });
    expect(appended).toHaveLength(1);
    expect(appended[0]?.scope).toBe('settings');
    expect(appended[0]?.msg).toBe('TypeError: x is not a function');
  });

  it('a non-Error rejection reason still becomes one line of text', () => {
    stubWindow(true);
    installRendererErrorCapture('renderer');
    listeners['unhandledrejection']?.[0]?.({ reason: { code: 7 } });
    expect(appended[0]?.msg).toBe('{"code":7}');
  });
});

describe('the bounds', () => {
  it('suppresses a consecutive duplicate and resumes on a new line', () => {
    stubWindow(true);
    installRendererErrorCapture('renderer');
    writeErrorRecord('renderer', 'same');
    writeErrorRecord('renderer', 'same');
    writeErrorRecord('renderer', 'other');
    writeErrorRecord('renderer', 'same');
    expect(appended.map((l) => l.msg)).toEqual(['same', 'other', 'same']);
  });

  it('stops at 50 lines for the run', () => {
    stubWindow(true);
    installRendererErrorCapture('renderer');
    for (let i = 0; i < 60; i += 1) {
      writeErrorRecord('renderer', `error ${i}`);
    }
    expect(appended).toHaveLength(50);
    expect(rendererErrorCaptureState().written).toBe(50);
  });

  it('truncates a message at 2048 characters before it travels', () => {
    stubWindow(true);
    installRendererErrorCapture('renderer');
    writeErrorRecord('renderer', 'x'.repeat(5000));
    expect(appended[0]?.msg).toHaveLength(2048);
  });

  it('a rejected append never surfaces', async () => {
    stubWindow(true);
    installRendererErrorCapture('renderer');
    appendImpl = () => Promise.reject(new Error('ipc gone'));
    expect(() => writeErrorRecord('renderer', 'boom')).not.toThrow();
    // Let the rejection settle; the .catch inside the writer swallows it.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('an append that throws synchronously never surfaces', () => {
    stubWindow(true);
    installRendererErrorCapture('renderer');
    appendImpl = () => {
      throw new Error('bridge tore down');
    };
    expect(() => writeErrorRecord('renderer', 'boom')).not.toThrow();
  });
});
