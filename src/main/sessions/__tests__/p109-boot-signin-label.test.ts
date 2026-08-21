/**
 * The boot sign-in hands the machine's label to prepareMachine (Phase 109
 * fix round).
 *
 * Phase 109 put a `label` input on `prepareMachine` so a refusal composed one
 * machine away can name the machine the way the person named it. The ipc door
 * passed it. The boot door did not, and the miss was PHOTOGRAPHED live: after
 * a restart, a create against a machine with no such agent drew a block whose
 * heading said "Muse was not found on Loft" while the body said "Tortie could
 * not find muse on loft", because the boot sign-in's context carried label
 * null and every far side refusal after it named the id.
 *
 * This is a SOURCE-SHAPE test, the instrument boot-refresh-guard.test.ts
 * established for core.ts invariants that would otherwise need a live tmux
 * server, a manifest and a machines file to exercise. The property is one
 * line long: the `prepareMachine` call inside `signInToConfirmedMachines`
 * carries `label: machineLabelOf(row)`. The behavioural evidence for the
 * label reaching the sentence lives in prepare.test.ts and context.test.ts,
 * which prove the context carries the label and the refusal copy uses it.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', 'core.ts');

function signInBody(): string {
  const src = readFileSync(CORE, 'utf8');
  const start = src.indexOf('private async signInToConfirmedMachines()');
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('\n  }', start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('signInToConfirmedMachines', () => {
  it('hands prepareMachine the label, so a boot sign-in refusal names the machine as the person named it', () => {
    const body = signInBody();
    const call = body.indexOf('prepareMachine({');
    expect(call).toBeGreaterThan(-1);
    const close = body.indexOf('});', call);
    expect(close).toBeGreaterThan(call);
    expect(body.slice(call, close)).toContain('label: machineLabelOf(row)');
  });
});
