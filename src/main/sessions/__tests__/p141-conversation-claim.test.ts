/**
 * Phase 141 — the one function that may bind a conversation to a row, and the
 * four cases in which it refuses.
 *
 * ## Why this file exists
 *
 * The failure this phase is most afraid of is not a missing verb. It is the
 * wrong conversation coming back later, because the right one has been hidden
 * behind it. Two of the three candidate designs lost the argument here: both
 * re-pointed `agent_session_id` on one unconfirmed press, both moved the old
 * value to a column nothing read, and neither rebuilt the resume argv, so the
 * row would have named one conversation on screen and armed a different one on
 * the next restart.
 *
 * So the rule is written as five cases and exactly one of them writes. This
 * file drives all five against a manifest that records every call, and the
 * assertion in four of them is that NOTHING was written.
 *
 * ## What is real here and what is not
 *
 * The claim map is REAL. `claimConversationId` is the shipped in memory
 * ownership map from `../../manifest/harvest/watch.ts`, not a stub, so the
 * refusal in the third case is the shipped refusal rather than a rehearsal of
 * one. The manifest is a recorder, because what is being proved is which calls
 * are made and with what, and a real SQLite file would prove the same thing
 * more slowly.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// The one real thing this file must not do is talk to a tmux server. Only the
// two verbs the write path uses are replaced; everything else is the shipped
// module, so no other import in the graph is quietly changed.
vi.mock(import('../../tmux'), async (importOriginal) => ({
  ...(await importOriginal()),
  setSessionOption: () => Promise.resolve(),
  execTmux: () => Promise.resolve('')
}));

const { claimAgentConversationId } = await import('../resume-in-place');
const { admitConfirmedConversationId } = await import('../id-harvest');
const { forgetConversationClaims, claimConversationId } = await import(
  '../../manifest/harvest'
);

import type { ManifestStore, ManifestSessionRecord } from '../../manifest';
import type { AgentKind } from '../../../shared/types';
import type { IdHarvestDeps } from '../id-harvest';
import { p141Row } from './p141-row';

const A_CONVERSATION = '11111111-2222-4333-8444-555555555555';
const ANOTHER_CONVERSATION = '99999999-8888-4777-8666-555555555555';

interface Written {
  id: string;
  conversationId: string;
  resumeArgv: string[];
}

function harness(rec: ManifestSessionRecord): {
  deps: IdHarvestDeps;
  writes: Written[];
  broadcasts: number;
} {
  const writes: Written[] = [];
  let broadcasts = 0;
  const manifest = {
    getSession: (id: string) => (id === rec.id ? rec : undefined),
    setAgentSessionId: (
      id: string,
      conversationId: string,
      resumeArgv: string[]
    ) => {
      writes.push({ id, conversationId, resumeArgv });
      return rec;
    },
    clearAgentSessionId: () => {
      throw new Error('this path may never clear a conversation id');
    }
  } as unknown as ManifestStore;
  const deps: IdHarvestDeps = {
    manifest,
    liveIds: new Map([[rec.id, '$7']]),
    idCaptureWatches: new Map(),
    isDisposed: () => false,
    broadcastSessions: () => {
      broadcasts += 1;
    }
  };
  return {
    deps,
    writes,
    get broadcasts() {
      return broadcasts;
    }
  };
}

const rowOf = p141Row;

beforeEach(() => {
  forgetConversationClaims();
});

describe('claimAgentConversationId — the five cases', () => {
  it('writes nothing when the confirmed id is the one the row already holds', () => {
    const rec = rowOf({ agentSessionId: A_CONVERSATION });
    const h = harness(rec);
    expect(claimAgentConversationId(h.deps, rec, A_CONVERSATION, 10)).toBe(
      'already-ours'
    );
    expect(h.writes).toEqual([]);
  });

  it('writes the id AND a rebuilt resume argv when the row holds none', () => {
    const rec = rowOf();
    const h = harness(rec);
    expect(claimAgentConversationId(h.deps, rec, A_CONVERSATION, 10)).toBe(
      'written'
    );
    expect(h.writes).toHaveLength(1);
    const write = h.writes[0];
    expect(write?.conversationId).toBe(A_CONVERSATION);
    // The argv is rebuilt in the SAME write, so the row cannot name one
    // conversation and arm another.
    expect(write?.resumeArgv).toContain(A_CONVERSATION);
    expect(write?.resumeArgv[0]).toBe('/usr/local/bin/claude');
  });

  it('writes nothing when another row already holds that conversation', () => {
    const rec = rowOf();
    const h = harness(rec);
    // The shipped map, not a stub: some other session got there first.
    expect(claimConversationId(A_CONVERSATION, 'some-other-row')).toBe(true);
    expect(claimAgentConversationId(h.deps, rec, A_CONVERSATION, 10)).toBe(
      'held-by-another'
    );
    expect(h.writes).toEqual([]);
  });

  it('writes nothing when the confirmed id DIFFERS from the row’s', () => {
    const rec = rowOf({ agentSessionId: A_CONVERSATION });
    const h = harness(rec);
    expect(
      claimAgentConversationId(h.deps, rec, ANOTHER_CONVERSATION, 10)
    ).toBe('different');
    expect(h.writes).toEqual([]);
  });

  it('writes nothing when nothing confirmed an id', () => {
    const rec = rowOf();
    const h = harness(rec);
    expect(claimAgentConversationId(h.deps, rec, null, 10)).toBe(
      'not-confirmed'
    );
    expect(claimAgentConversationId(h.deps, rec, '', 10)).toBe('not-confirmed');
    expect(h.writes).toEqual([]);
  });

  it('never binds a conversation to a row that is a plain shell', () => {
    const rec = rowOf({ agent: 'shell' });
    const h = harness(rec);
    expect(claimAgentConversationId(h.deps, rec, A_CONVERSATION, 10)).toBe(
      'not-confirmed'
    );
    expect(h.writes).toEqual([]);
  });
});

describe('admitConfirmedConversationId — the gate it lifts, and how far', () => {
  it('refuses a row that already holds a conversation, which is the gate', () => {
    const rec = rowOf({ agentSessionId: A_CONVERSATION });
    const h = harness(rec);
    expect(
      admitConfirmedConversationId(h.deps, rec, ANOTHER_CONVERSATION, 10)
    ).toBe('row-holds-one');
    expect(h.writes).toEqual([]);
  });

  it('refuses a row a person removed', () => {
    const rec = rowOf({ status: 'discarded' });
    const h = harness(rec);
    expect(admitConfirmedConversationId(h.deps, rec, A_CONVERSATION, 10)).toBe(
      'row-holds-one'
    );
    expect(h.writes).toEqual([]);
  });

  it('leaves NO claim behind when it could compose no resume argv', () => {
    // cursoride's resume is a row written into another program's database
    // rather than a command, so the registry composes no argv for it at all.
    // The important half is the second assertion: a row that wrote nothing
    // must not have taken the conversation on its way past.
    // `AgentKind` is still the narrow three, and the agent column carries a
  // widened registry id at runtime, so the cast is the house pattern rather
  // than a way past a real disagreement.
  const rec = rowOf({ agent: 'cursoride' as AgentKind });
    const h = harness(rec);
    expect(admitConfirmedConversationId(h.deps, rec, A_CONVERSATION, 10)).toBe(
      'no-resume-argv'
    );
    expect(h.writes).toEqual([]);
    expect(claimConversationId(A_CONVERSATION, 'somebody-else')).toBe(true);
  });

  it('tells every window once, and only when it wrote', () => {
    const rec = rowOf();
    const h = harness(rec);
    expect(admitConfirmedConversationId(h.deps, rec, A_CONVERSATION, 10)).toBe(
      'written'
    );
    expect(h.broadcasts).toBe(1);
  });
});
