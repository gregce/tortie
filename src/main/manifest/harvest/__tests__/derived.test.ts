/**
 * Phase 215 — the sub agent predicate, over every rollout shape the
 * measurement found in the operator's own store.
 *
 * It is the FALLBACK half of the codex answer: `~/.codex/state_5.sqlite`
 * states the same thing as data and is asked first, and this predicate is what
 * answers when the database is absent, older than the `thread_source` column,
 * locked, or missing the row. Over his 25,973 rollouts the database says
 * nothing about 25,038 of them, so that is a measured state rather than a
 * hypothetical.
 *
 * Each fixture below names the population it stands for, from research 81 §1.
 * The shapes are the four the three tests separate (`...`, `.2.`, `12.`,
 * `123`), the two alpha-build records that carry `source.subagent` with no
 * parent anywhere, and the two false-positive shapes the narrowing exists for.
 *
 * WHAT THIS FILE CANNOT SHOW. It reads no file and opens no database, so it
 * cannot show that a real rollout parses, that the database and the rollout
 * agree, or that the repair rewrites a real row.
 * `npm run conformance:derived` does the first two over fixtures it writes
 * itself and drives the repair over a fixture manifest.
 */

import { describe, expect, it } from 'vitest';
import {
  codexDerivedRecord,
  codexParentThreadId,
  codexRecordId,
  derivedByPath,
  derivedByRecords,
  derivedRecordLines,
  type DerivedStreamRule
} from '../derived';
import { DESCRIPTORS } from '../stores';

const OWN = '01a0696a-75d1-7af1-8f22-de5903c5ebeb';
const PARENT = '01a06966-7253-7a72-afc1-ae84664a7cd5';

/** A `session_meta` line as codex writes it, payload wrapped. */
function meta(payload: Record<string, unknown>): Record<string, unknown> {
  return { timestamp: '2026-09-03T18:36:19.000Z', type: 'session_meta', payload };
}

describe('codexDerivedRecord — the four tests over the measured shapes', () => {
  it('an ordinary modern session is not derived (25,452 records, "...")', () => {
    expect(
      codexDerivedRecord([
        meta({
          id: PARENT,
          session_id: PARENT,
          cwd: '/Users/gdc/runstory',
          thread_source: 'user',
          // MEASURED: on a modern SESSION record `source` is a plain STRING.
          // Without the typeof guard this shape misreads or throws.
          source: 'cli',
          cli_version: '0.160.0'
        })
      ])
    ).toBe(false);
  });

  it('the modern sub agent is derived by all three (404 records, "123")', () => {
    const record = meta({
      id: OWN,
      session_id: PARENT,
      parent_thread_id: PARENT,
      forked_from_id: PARENT,
      cwd: '/Users/gdc/runstory',
      thread_source: 'subagent',
      agent_nickname: 'Hegel',
      agent_path: '/root/gmux_forensics',
      multi_agent_version: 2,
      source: {
        subagent: {
          thread_spawn: {
            parent_thread_id: PARENT,
            depth: 1,
            agent_path: '/root/gmux_forensics',
            agent_nickname: 'Hegel'
          }
        }
      }
    });
    expect(codexDerivedRecord([record])).toBe(true);
    expect(codexParentThreadId(record)).toBe(PARENT);
    expect(codexRecordId(record)).toBe(OWN);
  });

  it('0.116.0 to 0.128.0 sub agents carry ONLY source.subagent (68 records, ".2.")', () => {
    // No thread_source column and no top level parent_thread_id yet. T1 and
    // T3 both miss these, which is why three tests are asked together.
    const record = meta({
      id: OWN,
      cwd: '/Users/gdc/runstory',
      cli_version: '0.128.0',
      source: {
        subagent: { thread_spawn: { parent_thread_id: PARENT, depth: 1 } }
      }
    });
    expect(codexDerivedRecord([record])).toBe(true);
    // AND the parent is only in the NESTED place: 115 of his 521 derived
    // records are this way and a repair that read the top level alone would
    // fail on 22 per cent of them.
    expect(codexParentThreadId(record)).toBe(PARENT);
  });

  it('the middle build has thread_source but the nested parent only (49 records, "12.")', () => {
    const record = meta({
      id: OWN,
      thread_source: 'subagent',
      cwd: '/Users/gdc/runstory',
      source: {
        subagent: { thread_spawn: { parent_thread_id: PARENT, depth: 1 } }
      }
    });
    expect(codexDerivedRecord([record])).toBe(true);
    expect(codexParentThreadId(record)).toBe(PARENT);
  });

  it('the 0.125.0-alpha.3 pair is derived and has NO parent anywhere', () => {
    // Both of these exist in his store, and they are the LEFT ALONE case: the
    // predicate refuses them and the repair can prove no parent, so the row
    // keeps the id it has rather than being guessed at or emptied.
    const record = meta({
      id: '019dca82-33fd-7200-ad0e-e27bb7f6fe9e',
      cwd: '/Users/gdc/runstory',
      cli_version: '0.125.0-alpha.3',
      source: { subagent: {} }
    });
    expect(codexDerivedRecord([record])).toBe(true);
    expect(codexParentThreadId(record)).toBeNull();
  });

  it('a legacy session that predates every one of the fields is not derived', () => {
    expect(
      codexDerivedRecord([
        meta({ id: PARENT, cwd: '/Users/gdc/runstory', cli_version: '0.90.0' })
      ])
    ).toBe(false);
  });

  it('the flat shape, with no payload wrapper, reads the same', () => {
    expect(
      codexDerivedRecord([{ id: OWN, parent_thread_id: PARENT, cwd: '/x' }])
    ).toBe(true);
    expect(codexParentThreadId({ id: OWN, parent_thread_id: PARENT })).toBe(PARENT);
  });

  it('nothing to read is not derived, so an unparseable line never refuses', () => {
    // The reader returns no records for a line that is not JSON, for a .zst
    // and for a file that has not been flushed. All three must ride the
    // existing grace path rather than be called a sub agent.
    expect(codexDerivedRecord([])).toBe(false);
  });

  it('a parent equal to its own id, in any case, is not a parent', () => {
    expect(
      codexDerivedRecord([
        meta({ id: OWN, parent_thread_id: OWN.toUpperCase(), thread_source: 'user' })
      ])
    ).toBe(false);
    expect(
      codexDerivedRecord([meta({ id: OWN, parent_thread_id: OWN.toUpperCase() })])
    ).toBe(false);
  });
});

describe('the narrowing, which is what stops a good row being refused', () => {
  it('a FORK that says thread_source user keeps its parent and is a session', () => {
    // T3 never fires alone in his 25,973 records, so it adds nothing today and
    // carries the only untested false positive risk in the set: a deliberate
    // fork of a resumable thread would plausibly carry a parent too. Refusing
    // one costs a conversation that never arms.
    expect(
      codexDerivedRecord([
        meta({
          id: OWN,
          parent_thread_id: PARENT,
          forked_from_id: PARENT,
          thread_source: 'user',
          source: 'cli'
        })
      ])
    ).toBe(false);
  });

  it("a person's own NAMED agent thread is a session", () => {
    expect(
      codexDerivedRecord([
        meta({ id: OWN, thread_source: 'user', agent_nickname: 'Hegel' })
      ])
    ).toBe(false);
  });

  it('but a nickname on a record that does not claim to be a user thread is derived', () => {
    // 519 of his 521 derived records carry it and 0 of the 25,452 sessions do.
    expect(codexDerivedRecord([meta({ id: OWN, agent_nickname: 'Hegel' })])).toBe(true);
  });

  it('an empty nickname is not a nickname', () => {
    expect(codexDerivedRecord([meta({ id: OWN, agent_nickname: '' })])).toBe(false);
  });
});

describe('the shared question is asked of the descriptor, not of the agent id', () => {
  it('every shipped descriptor answers it', () => {
    for (const [agent, d] of Object.entries(DESCRIPTORS)) {
      expect(d?.derivedStream, `${agent} answers`).toBeDefined();
      expect(d?.derivedStream.measured.length, `${agent} says how it looked`)
        .toBeGreaterThan(40);
    }
  });

  it('codex is the record form and muse is the path form', () => {
    expect(DESCRIPTORS.codex?.derivedStream.kind).toBe('record');
    expect(DESCRIPTORS.muse?.derivedStream.kind).toBe('path');
    expect(derivedRecordLines(DESCRIPTORS.codex!.derivedStream)).toBe(1);
    expect(derivedRecordLines(DESCRIPTORS.muse!.derivedStream)).toBe(0);
  });

  it("muse's folded-in rule refuses a subagent segment at any depth", () => {
    const rule = DESCRIPTORS.muse!.derivedStream;
    const roots = ['/home/.local/share/muse/sessions'];
    expect(
      derivedByPath(rule, roots, `${roots[0]}/2026/09/03/subagent/x/session.jsonl`)
    ).toBe(true);
    expect(
      derivedByPath(rule, roots, `${roots[0]}/2026/09/03/${OWN}/session.jsonl`)
    ).toBe(false);
    // A path outside every root is not this store's business.
    expect(derivedByPath(rule, roots, '/elsewhere/subagent/session.jsonl')).toBe(false);
  });

  it('a none rule refuses nothing and reads nothing', () => {
    const rule: DerivedStreamRule = DESCRIPTORS.omp!.derivedStream;
    expect(rule.kind).toBe('none');
    expect(derivedByPath(rule, ['/root'], '/root/subagent/a.jsonl')).toBe(false);
    expect(derivedByRecords(rule, [{ thread_source: 'subagent' }])).toBe(false);
    expect(derivedRecordLines(rule)).toBe(0);
  });

  it('the record form is only asked of a record rule', () => {
    expect(
      derivedByRecords(DESCRIPTORS.codex!.derivedStream, [
        meta({ id: OWN, thread_source: 'subagent' })
      ])
    ).toBe(true);
    expect(derivedByPath(DESCRIPTORS.codex!.derivedStream, ['/r'], '/r/subagent/x')).toBe(
      false
    );
  });
});
