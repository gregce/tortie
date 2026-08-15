/**
 * The schema on disk, and the seven worked examples.
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

  it('accepts both schema numbers this build reads, and no others', () => {
    // Phase 33 added `launch.envPassthrough` and bumped the file to schema 2.
    // Schema 1 stays readable, because a file that never uses the new field is
    // still correct and nobody should have to edit it. Anything else is a shape
    // this build does not know, and the reader refuses it rather than guessing.
    const validate = compiledSchema();
    expect(validate({ schema: 1, agents: [] })).toBe(true);
    expect(validate({ schema: 2, agents: [] })).toBe(true);
    expect(validate({ schema: 3, agents: [] })).toBe(false);
    expect(validate({ schema: '2', agents: [] })).toBe(false);
  });

  it('carries the passthrough field, its cap and its name pattern', () => {
    // The schema is what an authoring agent reads first. A field that reached
    // the loader without reaching the schema would be written wrong on the
    // first attempt every time.
    const validate = compiledSchema();
    expect(
      validate({
        schema: 2,
        agents: [
          {
            id: 'owl',
            displayName: 'Owl',
            binaries: ['owl'],
            launch: { argv: ['owl'], envPassthrough: ['OWL_API_KEY'] }
          }
        ]
      })
    ).toBe(true);
    // A name that is not a usable environment variable name.
    expect(
      validate({
        schema: 2,
        agents: [{ id: 'owl', launch: { argv: ['owl'], envPassthrough: ['9-nope'] } }]
      })
    ).toBe(false);
    // Seventeen names, against the cap of sixteen.
    expect(
      validate({
        schema: 2,
        agents: [
          {
            id: 'owl',
            launch: {
              argv: ['owl'],
              envPassthrough: Array.from({ length: 17 }, (_, i) => `OWL_${i}`)
            }
          }
        ]
      })
    ).toBe(false);
  });

  it('refuses a launch field the contract does not carry', () => {
    // `additionalProperties: false` on the launch block is what makes the
    // passthrough field's spelling load-bearing. A near miss must fail here
    // rather than be quietly ignored.
    const validate = compiledSchema();
    expect(
      validate({
        schema: 2,
        agents: [{ id: 'owl', launch: { argv: ['owl'], envPassthroughs: ['OWL_API_KEY'] } }]
      })
    ).toBe(false);
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
  it('ships seven of them', () => {
    expect(exampleFiles()).toHaveLength(7);
  });

  it('keeps five of them on schema 1, so the converter path is exercised', () => {
    // Examples 01 to 05 stay at schema 1 on purpose. They are the proof that a
    // file written before Phase 33 still loads, and every check below runs them
    // through the real reader.
    const byName = new Map(
      exampleFiles().map((name) => [
        name,
        (JSON.parse(readFileSync(join(EXAMPLES_DIR, name), 'utf8')) as { schema: number }).schema
      ])
    );
    expect([...byName].filter(([, schema]) => schema === 1).map(([name]) => name)).toEqual([
      '01-minimal.json',
      '02-resume-with-a-flag.json',
      '03-resume-is-a-subcommand.json',
      '04-id-from-a-side-command.json',
      '05-patch-a-built-in-agent.json'
    ]);
    expect([...byName].filter(([, schema]) => schema === 2).map(([name]) => name)).toEqual([
      '06-every-field.json',
      '07-env-passthrough.json'
    ]);
  });

  it('the passthrough example carries names and no value at all', () => {
    // The whole promise of the field is that a secret is never written down.
    // The example is what a person copies, so it must not be the first place
    // that promise is broken.
    const raw = readFileSync(join(EXAMPLES_DIR, '07-env-passthrough.json'), 'utf8');
    const parsed = parseAgentOverlay(raw);
    const merged = mergeAgentOverlay(parsed.rows, AGENT_REGISTRY);
    const pi = merged.agents.find((a) => a.id === 'pi');
    expect(pi?.source).toBe('patched');
    expect(pi?.launch?.envPassthrough).toEqual(['FIREWORKS_API_KEY']);
    // A patch replaces `launch` whole, so the restated argv is the compiled one.
    expect(pi?.launch?.argv).toEqual(['pi']);
    // The row can start a program, so it arms the confirm gate.
    expect(pi?.executionHash).toMatch(/^[0-9a-f]{64}$/);
    // There is no field for a value, and the file contains none.
    expect(pi?.launch?.env).toBeUndefined();
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
