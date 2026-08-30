/**
 * Unit tests for src/main/cache/policy.ts (Phase 166). Spawns nothing, opens
 * no profile, touches no file system.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  applyCachePolicy,
  cachePolicyFor,
  CEILING_OVERRIDE_ENV,
  CHROMIUM_CODE_CACHE_CEILING_BYTES,
  CHROMIUM_DEFAULT_HTTP_CACHE_CEILING_BYTES,
  DEV_HTTP_CACHE_CEILING_BYTES,
  DISK_CACHE_SIZE_SWITCH,
  isDevShape,
  parseCeilingOverride
} from '../policy';
import * as policy from '../policy';

const DEV_URL = 'http://localhost:5173';

function fakeApp(isPackaged: boolean) {
  const switches: Array<[string, string | undefined]> = [];
  return {
    switches,
    app: {
      isPackaged,
      commandLine: {
        appendSwitch(name: string, value?: string) {
          switches.push([name, value]);
        }
      }
    }
  };
}

function fakeLog() {
  const lines: Array<{ msg: string; fields: Record<string, unknown> | undefined }> = [];
  return { lines, log: { info: (msg: string, fields?: Record<string, unknown>) => lines.push({ msg, fields }) } };
}

describe('the constants say what Chromium does', () => {
  it('pins the dev ceiling at 128 MiB and the Chromium defaults at 1,280 and 320 MiB', () => {
    assert.equal(DEV_HTTP_CACHE_CEILING_BYTES, 134_217_728);
    assert.equal(CHROMIUM_DEFAULT_HTTP_CACHE_CEILING_BYTES, 1_342_177_280);
    assert.equal(CHROMIUM_CODE_CACHE_CEILING_BYTES, 335_544_320);
    assert.ok(DEV_HTTP_CACHE_CEILING_BYTES < CHROMIUM_DEFAULT_HTTP_CACHE_CEILING_BYTES);
  });
  it('names the switch Chromium reads', () => {
    assert.equal(DISK_CACHE_SIZE_SWITCH, 'disk-cache-size');
  });
});

describe('isDevShape', () => {
  it('is true only for an unpackaged launch with a renderer url', () => {
    assert.equal(isDevShape({ ELECTRON_RENDERER_URL: DEV_URL }, false), true);
    assert.equal(isDevShape({ ELECTRON_RENDERER_URL: DEV_URL }, true), false);
    assert.equal(isDevShape({}, false), false);
    assert.equal(isDevShape({ ELECTRON_RENDERER_URL: '' }, false), false);
  });
});

describe('parseCeilingOverride', () => {
  it('accepts a whole positive number of bytes', () => {
    assert.equal(parseCeilingOverride('4194304'), 4_194_304);
    assert.equal(parseCeilingOverride('1'), 1);
  });
  it('ignores everything that is not one, so a typo can never set zero', () => {
    for (const bad of [undefined, '', '0', '-1', '+5', '1.5', '4MiB', '4e6', ' 42', '42 ', '0x10', '00', '01']) {
      assert.equal(parseCeilingOverride(bad), null, JSON.stringify(bad));
    }
  });
  it('refuses a number longer than sixteen digits', () => {
    assert.equal(parseCeilingOverride('1'.repeat(16)), 1_111_111_111_111_111);
    assert.equal(parseCeilingOverride('1'.repeat(17)), null);
  });
});

describe('cachePolicyFor', () => {
  it('leaves the packaged app on Chromium default with no ceiling', () => {
    const p = cachePolicyFor({ ELECTRON_RENDERER_URL: DEV_URL }, true);
    assert.equal(p.mode, 'chromium-default');
    assert.equal(p.httpCacheCeilingBytes, null);
    assert.match(p.reason, /packaged/);
    assert.match(p.reason, /never stores/);
  });
  it('leaves an unpackaged launch of the built files on Chromium default', () => {
    const p = cachePolicyFor({ GMUX_SMOKE: 'basic' }, false);
    assert.equal(p.mode, 'chromium-default');
    assert.equal(p.httpCacheCeilingBytes, null);
    assert.match(p.reason, /built files/);
  });
  it('caps the dev shape at 128 MiB', () => {
    const p = cachePolicyFor({ ELECTRON_RENDERER_URL: DEV_URL }, false);
    assert.equal(p.mode, 'dev-ceiling');
    assert.equal(p.httpCacheCeilingBytes, DEV_HTTP_CACHE_CEILING_BYTES);
    assert.match(p.reason, /128 MiB on the http cache/);
    assert.match(p.reason, /code cache cannot be capped/);
    assert.match(p.reason, /320 MiB/);
  });
  it('honours the probe override in the dev shape only', () => {
    const dev = cachePolicyFor({ ELECTRON_RENDERER_URL: DEV_URL, [CEILING_OVERRIDE_ENV]: '4194304' }, false);
    assert.equal(dev.httpCacheCeilingBytes, 4_194_304);
    assert.match(dev.reason, /4 MiB on the http cache from GMUX_HTTP_CACHE_CEILING_BYTES/);
    const packaged = cachePolicyFor({ ELECTRON_RENDERER_URL: DEV_URL, [CEILING_OVERRIDE_ENV]: '4194304' }, true);
    assert.equal(packaged.httpCacheCeilingBytes, null);
    const built = cachePolicyFor({ [CEILING_OVERRIDE_ENV]: '4194304' }, false);
    assert.equal(built.httpCacheCeilingBytes, null);
  });
  it('falls back to 128 MiB when the override is malformed', () => {
    const p = cachePolicyFor({ ELECTRON_RENDERER_URL: DEV_URL, [CEILING_OVERRIDE_ENV]: '0' }, false);
    assert.equal(p.httpCacheCeilingBytes, DEV_HTTP_CACHE_CEILING_BYTES);
    assert.doesNotMatch(p.reason, /from GMUX_HTTP_CACHE_CEILING_BYTES/);
  });
  it('is pure: the same record answers the same policy twice', () => {
    const env = { ELECTRON_RENDERER_URL: DEV_URL };
    assert.deepEqual(cachePolicyFor(env, false), cachePolicyFor(env, false));
  });
});

describe('applyCachePolicy', () => {
  it('appends exactly one switch in the dev shape and logs one line', () => {
    const { app, switches } = fakeApp(false);
    const { log, lines } = fakeLog();
    const p = applyCachePolicy(app, log, { ELECTRON_RENDERER_URL: DEV_URL });
    assert.deepEqual(switches, [['disk-cache-size', '134217728']]);
    assert.equal(lines.length, 1);
    assert.match(lines[0]!.msg, /^cache policy: dev-ceiling, /);
    assert.equal(lines[0]!.fields?.['httpCacheCeilingBytes'], 134_217_728);
    assert.equal(lines[0]!.fields?.['codeCacheCeilingBytes'], CHROMIUM_CODE_CACHE_CEILING_BYTES);
    assert.equal(p.mode, 'dev-ceiling');
  });
  it('appends nothing in the packaged shape and still logs one line', () => {
    const { app, switches } = fakeApp(true);
    const { log, lines } = fakeLog();
    const p = applyCachePolicy(app, log, { ELECTRON_RENDERER_URL: DEV_URL });
    assert.deepEqual(switches, []);
    assert.equal(lines.length, 1);
    assert.match(lines[0]!.msg, /^cache policy: chromium-default, /);
    assert.equal(lines[0]!.fields?.['httpCacheCeilingBytes'], null);
    assert.equal(lines[0]!.fields?.['chromiumDefaultHttpCacheCeilingBytes'], CHROMIUM_DEFAULT_HTTP_CACHE_CEILING_BYTES);
    assert.equal(p.mode, 'chromium-default');
  });
  it('appends nothing for an unpackaged launch of the built files', () => {
    const { app, switches } = fakeApp(false);
    const { log, lines } = fakeLog();
    applyCachePolicy(app, log, {});
    assert.deepEqual(switches, []);
    assert.equal(lines.length, 1);
  });
  it('passes the override through to the switch as bytes', () => {
    const { app, switches } = fakeApp(false);
    const { log } = fakeLog();
    applyCachePolicy(app, log, { ELECTRON_RENDERER_URL: DEV_URL, [CEILING_OVERRIDE_ENV]: '4194304' });
    assert.deepEqual(switches, [['disk-cache-size', '4194304']]);
  });
  it('reads process.env when no record is handed in', () => {
    const { app, switches } = fakeApp(true);
    const { log, lines } = fakeLog();
    applyCachePolicy(app, log);
    assert.deepEqual(switches, []);
    assert.equal(lines.length, 1);
  });
});

describe('the module never deletes', () => {
  it('exports no function whose name suggests a clear, a prune or a removal', () => {
    const names = Object.keys(policy);
    for (const n of names) {
      assert.doesNotMatch(n, /clear|prune|remove|delete|unlink|retire|sweep/i, n);
    }
  });
});
