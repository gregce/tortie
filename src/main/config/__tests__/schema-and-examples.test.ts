/**
 * The schema on disk, and the six worked examples.
 *
 * The examples are the authoring story. A user opens a session in the
 * configuration folder, points their agent at the guide and the schema, and
 * says what they want. **So a worked example that does not load is a defect**,
 * and this file is what makes that sentence executable rather than an
 * intention.
 *
 * Every example is checked three ways.
 *
 *  1. It validates against `resources/config/agents.schema.json`, which is what
 *     an authoring agent reads.
 *  2. It loads through Tortie's real loader with no problems at all.
 *  3. It merges over the compiled registry and produces the agent it claims to.
 *
 * The first and the second are separate checks on purpose. The schema is
 * weaker than the loader, because JSON Schema cannot say "argv[0] equals
 * binaries[0]" or "this environment name is refused". An example that passed
 * the schema and failed the loader would be exactly the trap this file exists
 * to catch.
 *
 * ## Regenerating the schema
 *
 * `resources/config/agents.schema.json` is generated from
 * `AGENT_OVERLAY_JSON_SCHEMA` in src/shared/agent-overlay.ts, which is the
 * constant the loader's own limits and patterns come from. After changing the
 * type, run:
 *
 *     UPDATE_CONFIG_SCHEMA=1 npx vitest run src/main/config/__tests__/schema-and-examples.test.ts
 *
 * and commit the file it writes. Without that, a schema that has drifted from
 * the build fails here rather than shipping and misleading somebody's agent.
 */

import Ajv2020 from 'ajv/dist/2020';
import type { ValidateFunction } from 'ajv';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AGENT_OVERLAY_JSON_SCHEMA } from '@shared/agent-overlay';
import { AGENT_REGISTRY } from '../../agents/registry';
import { mergeAgentOverlay, parseAgentOverlay } from '../overlay';

const REPO_ROOT = resolve(__dirname, '../../../..');
const SCHEMA_PATH = join(REPO_ROOT, 'resources/config/agents.schema.json');
const EXAMPLES_DIR = join(REPO_ROOT, 'resources/config/examples');

/** The exact bytes the schema file should hold. */
function schemaText(): string {
  return `${JSON.stringify(AGENT_OVERLAY_JSON_SCHEMA, null, 2)}\n`;
}

function compiledSchema(): ValidateFunction {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  return ajv.compile(JSON.parse(schemaText()) as object);
}

function exampleFiles(): string[] {
  return readdirSync(EXAMPLES_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
}

describe('the generated JSON Schema', () => {
  it('is on disk and matches the type it is generated from', () => {
    const expected = schemaText();
    if (process.env['UPDATE_CONFIG_SCHEMA'] === '1') {
      writeFileSync(SCHEMA_PATH, expected, 'utf8');
    }
    const actual = readFileSync(SCHEMA_PATH, 'utf8');
    expect(actual).toBe(expected);
  });

  it('compiles as draft 2020-12', () => {
    expect(() => compiledSchema()).not.toThrow();
  });

  it('refuses a file that is not schema 1', () => {
    const validate = compiledSchema();
    expect(validate({ schema: 2, agents: [] })).toBe(false);
  });

  it('refuses a row field the contract does not carry', () => {
    const validate = compiledSchema();
    expect(
      validate({
        schema: 1,
        agents: [{ id: 'owl', displayName: 'Owl', flagPresets: [] }]
      })
    ).toBe(false);
  });
});

describe('the worked examples', () => {
  it('ships six of them', () => {
    expect(exampleFiles()).toHaveLength(6);
  });

  for (const name of exampleFiles()) {
    describe(name, () => {
      const raw = readFileSync(join(EXAMPLES_DIR, name), 'utf8');

      it('validates against the shipped schema', () => {
        const validate = compiledSchema();
        const ok = validate(JSON.parse(raw));
        expect(
          ok ? [] : (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`)
        ).toEqual([]);
        expect(ok).toBe(true);
      });

      it('loads through the real loader with no problems', () => {
        const parsed = parseAgentOverlay(raw);
        expect(parsed.problems.map((p) => `${p.field}: ${p.message}`)).toEqual([]);
        expect(parsed.rows.length).toBeGreaterThan(0);
      });

      it('merges over the compiled registry with no problems', () => {
        const parsed = parseAgentOverlay(raw);
        const merged = mergeAgentOverlay(parsed.rows, AGENT_REGISTRY);
        expect(merged.problems.map((p) => `${p.field}: ${p.message}`)).toEqual([]);
        for (const row of parsed.rows) {
          const entry = merged.agents.find((a) => a.id === row.id);
          expect(entry, `${row.id} is missing from the merged table`).toBeDefined();
          expect(entry?.source).not.toBe('builtin');
        }
      });

      it('keeps all twelve compiled agents', () => {
        const parsed = parseAgentOverlay(raw);
        const merged = mergeAgentOverlay(parsed.rows, AGENT_REGISTRY);
        for (const compiled of AGENT_REGISTRY) {
          expect(merged.agents.some((a) => a.id === compiled.id)).toBe(true);
        }
      });
    });
  }

  it('arms the confirm gate for every example that can start a program', () => {
    for (const name of exampleFiles()) {
      const parsed = parseAgentOverlay(readFileSync(join(EXAMPLES_DIR, name), 'utf8'));
      const merged = mergeAgentOverlay(parsed.rows, AGENT_REGISTRY);
      for (const row of parsed.rows) {
        const entry = merged.agents.find((a) => a.id === row.id);
        const canRun =
          row.binaries !== undefined ||
          row.launch !== undefined ||
          row.resume !== undefined ||
          row.versionProbe !== undefined ||
          row.extraProbeDirs !== undefined;
        if (canRun) {
          expect(entry?.executionHash, `${name} ${row.id}`).toMatch(/^[0-9a-f]{64}$/);
        } else {
          expect(entry?.executionHash, `${name} ${row.id}`).toBeNull();
        }
      }
    }
  });

  it('leaves the presentation-only patch outside the gate', () => {
    // 05 patches a compiled agent's display name and store directory. Nothing
    // in it can cause a program to run, so it must not ask the user to confirm
    // a command line they never wrote. If this ever flips, renaming Claude Code
    // would stop Claude Code launching.
    const raw = readFileSync(join(EXAMPLES_DIR, '05-patch-a-built-in-agent.json'), 'utf8');
    const parsed = parseAgentOverlay(raw);
    const merged = mergeAgentOverlay(parsed.rows, AGENT_REGISTRY);
    const claude = merged.agents.find((a) => a.id === 'claude');
    expect(claude?.source).toBe('patched');
    expect(claude?.executionHash).toBeNull();
    // The compiled launch and resume are untouched by a presentation patch.
    const compiled = AGENT_REGISTRY.find((e) => e.id === 'claude');
    expect(claude?.launch).toEqual(compiled?.launch);
    expect(claude?.resume).toEqual(compiled?.resume);
  });
});
