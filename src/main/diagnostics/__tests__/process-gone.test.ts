/**
 * Phase 28. The process death log lines. Phase 35 added the durable record
 * beside them and the field assertions at the bottom of this file.
 *
 * Nothing here kills a real process. The emitter is injected, so the tests
 * fire both events by hand and read what was logged. The shared log is
 * mocked, so these tests stay in plain node with no Electron and no file.
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface RecordedEvent {
  scope: string;
  level: string;
  event: string;
  msg: string;
  fields?: Record<string, unknown>;
  options?: { console?: boolean };
}
const recorded: RecordedEvent[] = [];

vi.mock('../../log', () => ({
  logEvent: (
    scope: string,
    level: string,
    event: string,
    msg: string,
    fields?: Record<string, unknown>,
    options?: { console?: boolean }
  ) => {
    recorded.push({ scope, level, event, msg, fields, options });
  }
}));

import {
  childGoneFields,
  formatChildGone,
  formatRendererGone,
  installProcessGoneLogging,
  rendererGoneFields,
  type AppGoneEvents
} from '../process-gone';

beforeEach(() => {
  recorded.length = 0;
});

describe('formatChildGone', () => {
  it('decodes a raw wait status that is a multiple of 256', () => {
    const line = formatChildGone({
      type: 'GPU',
      reason: 'crashed',
      exitCode: 8704
    });
    expect(line).toBe(
      '[gmux] helper process gone: type=GPU reason=crashed' +
        ' exitCode=8704 realCode=34'
    );
  });

  it('leaves a plain exit code alone', () => {
    expect(
      formatChildGone({ type: 'GPU', reason: 'killed', exitCode: 34 })
    ).not.toContain('realCode');
    expect(
      formatChildGone({ type: 'GPU', reason: 'clean-exit', exitCode: 0 })
    ).not.toContain('realCode');
  });

  it('decodes 256 as real code 1', () => {
    expect(
      formatChildGone({ type: 'Utility', reason: 'abnormal-exit', exitCode: 256 })
    ).toContain('realCode=1');
  });

  it('appends the name only when one of the two is a non empty string', () => {
    expect(
      formatChildGone({
        type: 'Utility',
        reason: 'crashed',
        exitCode: 5,
        serviceName: 'network.mojom.NetworkService'
      })
    ).toContain(' name=network.mojom.NetworkService');
    expect(
      formatChildGone({
        type: 'Utility',
        reason: 'crashed',
        exitCode: 5,
        name: 'Audio Service',
        serviceName: 'audio.mojom.AudioService'
      })
    ).toContain(' name=Audio Service');
    expect(
      formatChildGone({ type: 'GPU', reason: 'crashed', exitCode: 5, name: '' })
    ).not.toContain(' name=');
  });
});

describe('formatRendererGone', () => {
  it('carries reason and exit code', () => {
    expect(formatRendererGone({ reason: 'oom', exitCode: 0 })).toBe(
      '[gmux] renderer process gone: reason=oom exitCode=0'
    );
  });

  it('decodes the wait status the same way', () => {
    expect(formatRendererGone({ reason: 'crashed', exitCode: 512 })).toBe(
      '[gmux] renderer process gone: reason=crashed exitCode=512 realCode=2'
    );
  });
});

describe('installProcessGoneLogging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs one warn line per emitted event', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const emitter = new EventEmitter();
    installProcessGoneLogging(emitter as unknown as AppGoneEvents);

    emitter.emit('child-process-gone', {}, {
      type: 'GPU',
      reason: 'crashed',
      exitCode: 8704
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenLastCalledWith(
      '[gmux] helper process gone: type=GPU reason=crashed' +
        ' exitCode=8704 realCode=34'
    );

    emitter.emit('render-process-gone', {}, {}, {
      reason: 'killed',
      exitCode: 9
    });
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenLastCalledWith(
      '[gmux] renderer process gone: reason=killed exitCode=9'
    );
  });

  it('writes one durable record per event, and never a second console line', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const emitter = new EventEmitter();
    installProcessGoneLogging(emitter as unknown as AppGoneEvents);

    emitter.emit('child-process-gone', {}, {
      type: 'GPU',
      reason: 'crashed',
      exitCode: 8704,
      name: 'GPU'
    });
    emitter.emit('render-process-gone', {}, {}, {
      reason: 'killed',
      exitCode: 9
    });

    expect(recorded).toHaveLength(2);
    for (const entry of recorded) {
      expect(entry.scope).toBe('proc');
      expect(entry.level).toBe('warn');
      expect(entry.event).toBe('process.gone');
      // The Phase 28 console line above it is the only console output.
      expect(entry.options?.console).toBe(false);
    }
    expect(recorded[0]?.msg).toBe('helper process gone');
    expect(recorded[1]?.msg).toBe('renderer process gone');
  });
});

/**
 * Phase 35. The record half, field by field, against research 42 §9. Phase
 * 28's decode rule is asserted here in the shape the file actually stores,
 * because a decoded 8704 that reads as 34 in the console and as nothing in
 * the file is the same bug the console line was written to catch.
 */
describe('childGoneFields', () => {
  it('is the research 42 §9 shape, byte for byte on the 2026-08-14 event', () => {
    expect(
      childGoneFields({
        type: 'GPU',
        reason: 'crashed',
        exitCode: 8704,
        name: 'GPU'
      })
    ).toEqual({
      kind: 'child',
      ptype: 'GPU',
      reason: 'crashed',
      exitCode: 8704,
      realCode: 34,
      name: 'GPU'
    });
  });

  it('omits realCode when the wait status does not decode', () => {
    const fields = childGoneFields({
      type: 'GPU',
      reason: 'killed',
      exitCode: 34
    });
    expect(fields).not.toHaveProperty('realCode');
    expect(fields['exitCode']).toBe(34);
  });

  it('omits realCode for a clean exit code of 0', () => {
    expect(
      childGoneFields({ type: 'GPU', reason: 'clean-exit', exitCode: 0 })
    ).not.toHaveProperty('realCode');
  });

  it('prefers name over serviceName, and omits an empty one', () => {
    expect(
      childGoneFields({
        type: 'Utility',
        reason: 'crashed',
        exitCode: 5,
        name: 'Audio Service',
        serviceName: 'audio.mojom.AudioService'
      })['name']
    ).toBe('Audio Service');
    expect(
      childGoneFields({
        type: 'Utility',
        reason: 'crashed',
        exitCode: 5,
        serviceName: 'network.mojom.NetworkService'
      })['name']
    ).toBe('network.mojom.NetworkService');
    expect(
      childGoneFields({ type: 'GPU', reason: 'crashed', exitCode: 5, name: '' })
    ).not.toHaveProperty('name');
  });
});

describe('rendererGoneFields', () => {
  it('carries kind renderer, the reason and the raw exit code', () => {
    expect(rendererGoneFields({ reason: 'oom', exitCode: 0 })).toEqual({
      kind: 'renderer',
      reason: 'oom',
      exitCode: 0
    });
  });

  it('decodes the wait status with the same rule as the child half', () => {
    expect(rendererGoneFields({ reason: 'crashed', exitCode: 512 })).toEqual({
      kind: 'renderer',
      reason: 'crashed',
      exitCode: 512,
      realCode: 2
    });
  });
});
