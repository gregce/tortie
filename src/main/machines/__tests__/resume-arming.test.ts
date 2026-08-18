/**
 * Phase 72 — may a restore type the command that continues a conversation?
 *
 * The module under test is pure, so this file is exhaustive rather than
 * representative. Two claims carry the phase and both are checked over every
 * combination rather than over a chosen one.
 *
 *  1. THE LOCAL PATH DOES NOT MOVE. A row on this Mac arms for every source,
 *     every confidence and every argv length. `src/main/restore/restore.ts` is
 *     untouched by this phase, and this is the assertion that says the new gate
 *     cannot reach it either.
 *  2. A remote row arms only on a record that was proved on the machine being
 *     restored on. When this file was written no producer wrote such a record,
 *     and Phase 73's connected time store harvest is now that producer for one
 *     agent of the thirteen, being muse. The tests below drive both directions
 *     with hand written records, which is what kept the gate honest before the
 *     producer existed and is what keeps it honest now.
 *
 * PHASE 72 FIX ROUND. The order of two arms moved and a fact was added. The
 * first cut asked whether the row had a resume command before it asked
 * anything else, and at that time no remote row had one, so every remote row
 * answered `nothing-to-arm` and the `not-collected` arm was reached by no row
 * at all. What decides now is whether the session's agent keeps a conversation,
 * which the caller supplies, and the empty command is asked about only after
 * the provenance has had its say.
 */

import { describe, expect, it } from 'vitest';
import type {
  ResumeConfidence,
  ResumeIdSource,
  ResumeProvenance
} from '../../manifest/agents';
import { RESUME_NOT_COLLECTED } from '../remote-copy';
import {
  ARMING_REFUSALS,
  RESUME_WEAKER_SOURCE,
  resumeArmingVerdict,
  resumeOtherMachine
} from '../resume-arming';

/** Every member of the source union, including the one Phase 72 added. */
const EVERY_SOURCE: readonly ResumeIdSource[] = [
  'preassigned',
  'preassign-command',
  'store-harvest',
  'boot-rescue',
  'none',
  'unavailable',
  'remote-not-collected'
];

/** Every member of the confidence union. */
const EVERY_CONFIDENCE: readonly ResumeConfidence[] = [
  'exact',
  'weak',
  'grace-accepted',
  'unknown',
  'none'
];

function provenance(
  source: ResumeIdSource,
  confidence: ResumeConfidence,
  machineId?: string
): ResumeProvenance {
  return {
    v: 1,
    source,
    confidence,
    at: 1_700_000_000_000,
    cwd: '/repo',
    ...(machineId !== undefined ? { machineId } : {})
  };
}

describe('a row on this Mac', () => {
  it('arms for every source, every confidence and every argv length', () => {
    for (const source of EVERY_SOURCE) {
      for (const confidence of EVERY_CONFIDENCE) {
        for (const resumeArgvLength of [0, 1, 5]) {
          const verdict = resumeArmingVerdict({
            machineId: 'local',
            targetMachineId: 'local',
            agentKeepsConversation: true,
            resumeArgvLength,
            provenance: provenance(source, confidence)
          });
          expect(
            verdict,
            `${source} / ${confidence} / argv ${String(resumeArgvLength)}`
          ).toEqual({ arm: true, refusal: null, reason: null });
        }
      }
    }
  });

  it('arms even when the record names another machine', () => {
    // The local branch is FIRST and it is unconditional. A provenance that
    // somehow carries a machine id on a local row cannot turn the local path
    // into a refusal, which is the whole point of putting that branch first.
    expect(
      resumeArmingVerdict({
        machineId: 'local',
        targetMachineId: 'local',
        agentKeepsConversation: true,
        resumeArgvLength: 3,
        provenance: provenance('store-harvest', 'exact', 'studio')
      }).arm
    ).toBe(true);
  });
});

describe('a row on another machine', () => {
  const base = {
    machineId: 'studio',
    targetMachineId: 'studio',
    agentKeepsConversation: true,
    resumeArgvLength: 3
  };

  it('refuses every remote row this release writes, with the pinned sentence', () => {
    const verdict = resumeArmingVerdict({
      ...base,
      provenance: provenance('remote-not-collected', 'none', 'studio')
    });
    expect(verdict.arm).toBe(false);
    expect(verdict.refusal).toBe('not-collected');
    expect(verdict.reason).toBe(RESUME_NOT_COLLECTED);
    expect(RESUME_NOT_COLLECTED).toBe(
      "Tortie has no conversation id for this session. It reads an agent's " +
        'own files on a machine only while it is connected to that machine, ' +
        'and it did not get one for this session. The session comes back with ' +
        'its folder and its program. The conversation does not come back.'
    );
  });

  it('says nothing at all about a session whose agent keeps no conversation', () => {
    const verdict = resumeArmingVerdict({
      ...base,
      agentKeepsConversation: false,
      resumeArgvLength: 0,
      provenance: provenance('remote-not-collected', 'none', 'studio')
    });
    expect(verdict).toEqual({
      arm: false,
      refusal: 'nothing-to-arm',
      reason: null
    });
  });

  /**
   * THE ARM EVERY UNPROVED REMOTE AGENT ROW TAKES, and the reason the order
   * moved.
   *
   * A remote row the harvest could not prove an id for has a NULL resume
   * command. The empty command is the symptom of that rather than evidence that
   * there was nothing to collect, so the provenance is asked first and the
   * person is told their conversation is not coming back.
   */
  it('names the cause rather than the symptom on a row with no command yet', () => {
    const verdict = resumeArmingVerdict({
      ...base,
      resumeArgvLength: 0,
      provenance: provenance('remote-not-collected', 'none', 'studio')
    });
    expect(verdict.refusal).toBe('not-collected');
    expect(verdict.reason).toBe(RESUME_NOT_COLLECTED);
  });

  it('says nothing when an id was collected and no command survived it', () => {
    const verdict = resumeArmingVerdict({
      ...base,
      resumeArgvLength: 0,
      provenance: provenance('store-harvest', 'exact', 'studio')
    });
    expect(verdict).toEqual({
      arm: false,
      refusal: 'nothing-to-arm',
      reason: null
    });
  });

  it('refuses an id recorded on a different machine, and names both', () => {
    const verdict = resumeArmingVerdict({
      ...base,
      targetMachineId: 'attic',
      provenance: provenance('store-harvest', 'exact', 'studio')
    });
    expect(verdict.arm).toBe(false);
    expect(verdict.refusal).toBe('other-machine');
    expect(verdict.reason).toBe(resumeOtherMachine('studio', 'attic'));
    expect(verdict.reason).toContain('studio');
    expect(verdict.reason).toContain('attic');
  });

  it('outranks not-collected with other-machine, because it says more', () => {
    const verdict = resumeArmingVerdict({
      ...base,
      targetMachineId: 'attic',
      provenance: provenance('remote-not-collected', 'none', 'studio')
    });
    expect(verdict.refusal).toBe('other-machine');
  });

  it('refuses every confidence weaker than exact', () => {
    for (const confidence of EVERY_CONFIDENCE) {
      if (confidence === 'exact') continue;
      const verdict = resumeArmingVerdict({
        ...base,
        provenance: provenance('store-harvest', confidence, 'studio')
      });
      expect(verdict.arm, confidence).toBe(false);
      expect(verdict.refusal, confidence).toBe('weaker-source');
      expect(verdict.reason, confidence).toBe(RESUME_WEAKER_SOURCE);
    }
  });

  it('arms for a record whose id was proved on the machine in hand', () => {
    // The arm that says yes. It is driven by hand here, which is how it was
    // proven before Phase 73 built its first producer. The live producer is
    // driven end to end by the remote-sessions smoke, step 10f.
    const verdict = resumeArmingVerdict({
      ...base,
      provenance: provenance('store-harvest', 'exact', 'studio')
    });
    expect(verdict).toEqual({ arm: true, refusal: null, reason: null });
  });

  it('arms when the record names no machine and is exact', () => {
    // A row whose provenance predates the machine field. It is not evidence of
    // another machine, so the machine arm does not fire, and the confidence is
    // what decides.
    expect(
      resumeArmingVerdict({
        ...base,
        provenance: provenance('preassigned', 'exact')
      }).arm
    ).toBe(true);
  });
});

describe('the refusal list', () => {
  it('names every arm the gate can return', () => {
    expect([...ARMING_REFUSALS].sort()).toEqual([
      'not-collected',
      'nothing-to-arm',
      'other-machine',
      'weaker-source'
    ]);
  });

  it('gives a sentence to every refusal that is worth one', () => {
    // `nothing-to-arm` is the one refusal with no sentence, because nothing was
    // lost. Every other one carries text a person can read in a pane.
    const cases: Array<{ refusal: string; reason: string | null }> = [
      resumeArmingVerdict({
        machineId: 'studio',
        targetMachineId: 'studio',
        agentKeepsConversation: false,
        resumeArgvLength: 0,
        provenance: provenance('none', 'none')
      }),
      resumeArmingVerdict({
        machineId: 'studio',
        targetMachineId: 'studio',
        agentKeepsConversation: true,
        resumeArgvLength: 2,
        provenance: provenance('remote-not-collected', 'none')
      }),
      resumeArmingVerdict({
        machineId: 'studio',
        targetMachineId: 'studio',
        agentKeepsConversation: true,
        resumeArgvLength: 2,
        provenance: provenance('boot-rescue', 'weak')
      }),
      resumeArmingVerdict({
        machineId: 'studio',
        targetMachineId: 'attic',
        agentKeepsConversation: true,
        resumeArgvLength: 2,
        provenance: provenance('store-harvest', 'exact', 'studio')
      })
    ].map((v) => ({ refusal: String(v.refusal), reason: v.reason }));
    expect(cases[0]?.reason).toBeNull();
    for (const one of cases.slice(1)) {
      expect(one.reason, one.refusal).not.toBeNull();
      expect((one.reason ?? '').length, one.refusal).toBeGreaterThan(40);
    }
  });

  /**
   * PHASE 84, item 9. A remote row whose conversation id TORTIE ITSELF chose,
   * which is a shape no row had before this phase.
   *
   * The gate says yes to it, for the same reason it already said yes to a muse
   * row the Phase 73 harvest proved: the source is the strongest there is and
   * the id was fixed on the machine being restored on.
   *
   * SAYING YES IS NOT TYPING, and `../remote-restore.ts` still reports
   * `resumeArmed: false` for it, because `send-keys` is on the permanently
   * refused verb list and nothing in this release types a resume command into a
   * pane on another machine. That is asserted in `remote-restore.test.ts`, and
   * the two tests together are the whole of the claim.
   */
  it('arms a row whose id Tortie put on the launch line itself', () => {
    expect(
      resumeArmingVerdict({
        machineId: 'studio',
        targetMachineId: 'studio',
        agentKeepsConversation: true,
        resumeArgvLength: 3,
        provenance: provenance('preassigned', 'exact', 'studio')
      })
    ).toEqual({ arm: true, refusal: null, reason: null });
  });

  it('refuses a pre-assigned row whose id was fixed on a different machine', () => {
    const verdict = resumeArmingVerdict({
      machineId: 'studio',
      targetMachineId: 'attic',
      agentKeepsConversation: true,
      resumeArgvLength: 3,
      provenance: provenance('preassigned', 'exact', 'studio')
    });
    expect(verdict.arm).toBe(false);
    expect(verdict.refusal).toBe('other-machine');
  });

  it('refuses a pre-assigned row that carries no command to type', () => {
    const verdict = resumeArmingVerdict({
      machineId: 'studio',
      targetMachineId: 'studio',
      agentKeepsConversation: true,
      resumeArgvLength: 0,
      provenance: provenance('preassigned', 'exact', 'studio')
    });
    expect(verdict.arm).toBe(false);
    expect(verdict.refusal).toBe('nothing-to-arm');
  });

  it('writes no dash of any kind into a sentence a person reads', () => {
    // The writing rules bind copy, and these three sentences are copy.
    for (const text of [
      RESUME_NOT_COLLECTED,
      RESUME_WEAKER_SOURCE,
      resumeOtherMachine('studio', 'attic')
    ]) {
      expect(text).not.toMatch(/[—–]/);
    }
  });
});
