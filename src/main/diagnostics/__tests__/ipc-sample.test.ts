/** Unit tests for src/main/diagnostics/ipc-sample.ts (Phase 163). */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  beginIpcSample,
  endIpcSample,
  ipcSampleArmed,
  noteEvent,
  noteInvoke
} from '../ipc-sample';

describe('the IPC sample', () => {
  it('counts nothing while no capture is open', () => {
    endIpcSample();
    noteInvoke();
    noteEvent();
    assert.equal(ipcSampleArmed(), false);
    assert.deepEqual(endIpcSample(), { invokes: 0, events: 0, windowMs: 0 });
  });

  it('counts between begin and end and reports the window', () => {
    beginIpcSample(1000);
    assert.equal(ipcSampleArmed(), true);
    noteInvoke();
    noteInvoke();
    noteEvent();
    assert.deepEqual(endIpcSample(1500), { invokes: 2, events: 1, windowMs: 500 });
    assert.equal(ipcSampleArmed(), false);
  });

  it('starts over on a second begin', () => {
    beginIpcSample(0);
    noteInvoke();
    beginIpcSample(10);
    noteEvent();
    assert.deepEqual(endIpcSample(20), { invokes: 0, events: 1, windowMs: 10 });
  });
});
