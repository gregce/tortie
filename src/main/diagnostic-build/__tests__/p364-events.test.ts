/**
 * Phase 364 (build/p364/SPEC.md D9): the diagnostic build's process events,
 * src/main/diagnostic-build/events.ts.
 *
 * One record per call, through logEvent, at scope `diagnostic`, level `info`,
 * event `diagnostic.<kind>`, message `<kind> <what>`, with the call site's
 * fields and `what` beside them. The call sites, each inside an
 * `if (DIAGNOSTIC_BUILD)` statement, are the events builder's and are tested
 * beside them (src/main/{watcher,attach,pocket}/__tests__/p364-events.test.ts);
 * this file holds the record's shape, and that the line reaches app.log's
 * writer whole, through the real log module.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  calls: [] as Array<{
    scope: string;
    level: string;
    event: string;
    msg: string;
    fields: Record<string, unknown> | undefined;
    options: unknown;
  }>,
  real: false
}));

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  return {
    ...real,
    logEvent: (
      scope: string,
      level: string,
      event: string,
      msg: string,
      fields?: Record<string, unknown>,
      options?: unknown
    ) => {
      h.calls.push({ scope, level, event, msg, fields, options });
      // The real writer too, when a test asks for it, so the console line
      // it builds is the one the file would get.
      if (h.real) real.logEvent(scope, level as 'info', event, msg, fields, options as { console?: boolean });
    }
  };
});

import { diagnosticEvent } from '../events';

afterEach(() => {
  h.calls = [];
  h.real = false;
  vi.restoreAllMocks();
});

describe('one record per event', () => {
  it.each([
    ['watcher', 'request', { op: 'subscribe', requestId: 7, generation: 2 }],
    ['watcher', 'exit', { code: 0, generation: 2 }],
    ['terminal', 'spawn', { sessionId: 's-1', kind: 'local', pid: 4242 }],
    ['terminal', 'exit', { sessionId: 's-1', code: 0, signal: 'none', expected: 'yes' }],
    ['door', 'start', { pid: 5151 }],
    ['door', 'open', { port: 61000, generation: 3 }]
  ] as const)('%s %s', (kind, what, fields) => {
    diagnosticEvent(kind, what, fields);
    expect(h.calls).toEqual([
      {
        scope: 'diagnostic',
        level: 'info',
        event: `diagnostic.${kind}`,
        msg: `${kind} ${what}`,
        fields: { ...fields, what },
        options: undefined
      }
    ]);
  });

  it('a field cannot relabel the record it rides in', () => {
    diagnosticEvent('door', 'stop', { what: 'open', generation: 4 });
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]?.msg).toBe('door stop');
    expect(h.calls[0]?.fields).toEqual({ what: 'stop', generation: 4 });
  });

  it('the fields object the call site passed is not changed', () => {
    const fields = { pid: 1, generation: 1 };
    diagnosticEvent('watcher', 'start', fields);
    expect(fields).toEqual({ pid: 1, generation: 1 });
  });
});

describe('through the real log module', () => {
  it('the record reaches the writer whole, at scope diagnostic', () => {
    h.real = true;
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
    diagnosticEvent('terminal', 'exit', { sessionId: 's-9', code: 1, signal: 'SIGHUP' });
    expect(lines).toEqual([
      '[gmux-diagnostic] terminal exit {"sessionId":"s-9","code":1,"signal":"SIGHUP","what":"exit"}'
    ]);
  });
});
