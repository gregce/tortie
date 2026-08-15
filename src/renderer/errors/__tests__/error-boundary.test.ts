/**
 * The root error boundary (Phase 35): what it writes and what it shows.
 *
 * No DOM here. The class methods are exercised directly, which is exactly
 * what React does to them, and the fallback tree is walked as data. The
 * boundary must write ONE bounded record through the shared writer (so it
 * rides the same 50 line cap as the window hooks) and its fallback must
 * carry the three drafted strings.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import type { RendererLogLine } from '@shared/ipc';
import { componentStackHead, ErrorBoundary } from '../ErrorBoundary';
import { resetRendererErrorCapture } from '../hooks';

let appended: RendererLogLine[] = [];

beforeEach(() => {
  appended = [];
  resetRendererErrorCapture();
  vi.stubGlobal('window', {
    gmux: {
      log: {
        append: (line: RendererLogLine) => {
          appended.push(line);
          return Promise.resolve();
        }
      }
    }
  });
});

/** Every string in a React element tree, in render order. */
function collectText(node: React.ReactNode, out: string[] = []): string[] {
  if (typeof node === 'string') {
    out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out);
    return out;
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    collectText(props.children ?? null, out);
  }
  return out;
}

describe('componentStackHead', () => {
  it('keeps the first frames and bounds the length', () => {
    const stack = [
      '',
      '    at Broken (app/Broken.tsx:3:5)',
      '    at App (app/App.tsx:10:3)',
      '    at ErrorBoundary (errors/ErrorBoundary.tsx:40:1)',
      '    at Root',
      '    at Deeper',
      '    at DeeperStill'
    ].join('\n');
    const head = componentStackHead(stack);
    expect(head).toContain('at Broken (app/Broken.tsx:3:5)');
    expect(head).toContain('at Root');
    expect(head).not.toContain('Deeper');
  });

  it('never exceeds its hard bound', () => {
    const stack = Array.from({ length: 40 }, () => `at ${'x'.repeat(200)}`).join(
      '\n'
    );
    expect(componentStackHead(stack).length).toBeLessThanOrEqual(512);
  });

  it('is empty for a missing stack', () => {
    expect(componentStackHead(null)).toBe('');
    expect(componentStackHead(undefined)).toBe('');
  });
});

describe('the boundary', () => {
  it('derives the failed state from any error', () => {
    expect(ErrorBoundary.getDerivedStateFromError()).toEqual({ failed: true });
  });

  it('componentDidCatch writes one bounded error record', () => {
    const boundary = new ErrorBoundary({ children: null });
    boundary.componentDidCatch(new TypeError('boom'), {
      componentStack: '\n    at Broken (app/Broken.tsx:3:5)\n    at App'
    });
    expect(appended).toHaveLength(1);
    expect(appended[0]).toEqual({
      level: 'error',
      scope: 'renderer',
      msg: 'TypeError: boom',
      fields: {
        componentStack: 'at Broken (app/Broken.tsx:3:5) at App'
      }
    });
  });

  it('renders its children until something throws', () => {
    const child = React.createElement('span', null, 'alive');
    const boundary = new ErrorBoundary({ children: child });
    expect(boundary.render()).toBe(child);
  });

  it('the fallback carries the three drafted strings', () => {
    const boundary = new ErrorBoundary({ children: null });
    boundary.state = { failed: true };
    const text = collectText(boundary.render());
    expect(text).toContain('This view hit an error.');
    expect(text).toContain('The details were written to the log.');
    expect(text).toContain('Reload');
  });
});
