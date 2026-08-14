/**
 * Phase 28. The process death log lines.
 *
 * Nothing here kills a real process. The emitter is injected, so the tests
 * fire both events by hand and read what was logged.
 */

import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatChildGone,
  formatRendererGone,
  installProcessGoneLogging,
  type AppGoneEvents
} from '../process-gone';

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
});
