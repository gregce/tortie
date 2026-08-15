/**
 * The authoring guide, its worked examples, and the folder they are written to.
 *
 * Requirement 5 of this phase's authoring story is that the guide is validated
 * the way the schema is, because a worked example that does not load is a defect
 * rather than a typo the reader is expected to work around. So nothing here
 * re-implements the contract. Every example and every JSON block printed in the
 * guide goes through `validateAgentOverlayFile` and `mergeAgentOverlay`, which
 * are the same two functions the app calls at boot.
 *
 * The second half of this file is the drift check, and it is the one that earns
 * its place over time. The guide is prose, so nothing stops it describing a
 * field that was renamed or removed. These tests read the generated schema and
 * the exported constants and fail when the guide stops naming what they say. A
 * published contract that has quietly become wrong is worse than none, because
 * an authoring agent will follow it confidently.
 *
 * The last part covers the seeder, which puts all of this next to the file it
 * describes.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';

// `../guide` reaches the configuration directory through `../paths`, which
// imports electron at the top level. Every test here passes both directories
// explicitly, so the stub only has to exist.
vi.mock('electron', () => ({
  app: { getPath: (): string => '', getAppPath: (): string => '', isPackaged: false }
}));

import {
  AGENT_OVERLAY_ACCEPTED_SCHEMAS,
  AGENT_OVERLAY_JSON_SCHEMA,
  AGENT_SESSION_ID_SLOT,
  ENV_PASSTHROUGH_REFUSED,
  ENV_REFUSED_EXACT,
  ENV_REFUSED_PREFIXES,
  EXECUTION_BEARING_FIELDS,
  OVERLAY_LIMITS,
  RESERVED_AGENT_IDS
} from '@shared/agent-overlay';
import type { AgentOverlayV1 } from '@shared/agent-overlay';
import { mergeAgentOverlay, validateAgentOverlayFile } from '../overlay';
import { ensureConfigDirSeeded, USER_OWNED_CONFIG_FILES } from '../guide';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const TEMPLATE_DIR = join(REPO_ROOT, 'resources', 'config');
const EXAMPLES_DIR = join(TEMPLATE_DIR, 'examples');
const GUIDE = join(TEMPLATE_DIR, 'README.md');

const guideText = (): string => readFileSync(GUIDE, 'utf8');

function exampleFiles(): string[] {
  return readdirSync(EXAMPLES_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
}

function readExample(name: string): unknown {
  return JSON.parse(readFileSync(join(EXAMPLES_DIR, name), 'utf8'));
}

/** Every fenced JSON block printed in the guide, with the line it starts on. */
function guideJsonBlocks(): { line: number; text: string }[] {
  const lines = guideText().split('\n');
  const blocks: { line: number; text: string }[] = [];
  let start = -1;
  let buffer: string[] = [];
  for (const [index, line] of lines.entries()) {
    if (start === -1) {
      if (line.trim() === '```json') {
        start = index + 1;
        buffer = [];
      }
      continue;
    }
    if (line.trim() === '```') {
      blocks.push({ line: start, text: buffer.join('\n') });
      start = -1;
      continue;
    }
    buffer.push(line);
  }
  return blocks;
}

/** Load a file the way the app does, and report everything it refused. */
function load(input: unknown): { rows: AgentOverlayV1[]; problems: string[] } {
  const validated = validateAgentOverlayFile(input);
  const merged = mergeAgentOverlay(validated.rows);
  return {
    rows: validated.rows,
    problems: [...validated.problems, ...merged.problems].map(
      (p) => `${p.field}: ${p.message}`
    )
  };
}

// ---------------------------------------------------------------------------
// The worked examples, through the real reader
// ---------------------------------------------------------------------------

describe('the worked examples', () => {
  it('ships seven of them, which is what the guide claims', () => {
    expect(exampleFiles()).toHaveLength(7);
  });

  it.each(exampleFiles())('%s loads with no problems', (name) => {
    const result = load(readExample(name));
    expect(result.problems).toEqual([]);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it.each(exampleFiles())('%s is a complete file that can replace agents.json', (name) => {
    const parsed = readExample(name) as Record<string, unknown>;
    // Both schema numbers this build reads are legal here. Phase 33 added
    // schema 2 for `launch.envPassthrough`, and five of the seven examples stay
    // on schema 1 so the older shape keeps being exercised.
    expect(AGENT_OVERLAY_ACCEPTED_SCHEMAS).toContain(parsed['schema']);
    expect(Array.isArray(parsed['agents'])).toBe(true);
    // A file that only patches would still be complete, so the check is that
    // the merge produced the row rather than that the array is non-empty.
    expect(load(parsed).rows).toHaveLength((parsed['agents'] as unknown[]).length);
  });

  it('covers both id capture modes that produce an id, a new agent with no resume, and one patch', () => {
    const modes = new Set<string>();
    let newAgentsWithoutResume = 0;
    let patches = 0;
    const compiled = new Set(mergeAgentOverlay([]).agents.map((a) => a.id));
    for (const name of exampleFiles()) {
      for (const row of load(readExample(name)).rows) {
        if (compiled.has(row.id)) {
          patches += 1;
          continue;
        }
        if (row.resume === undefined) newAgentsWithoutResume += 1;
        else modes.add(row.resume.idCapture.mode);
      }
    }
    // `none` is the third mode and no example uses it on purpose. A resume
    // block still has to carry a template with the slot in it, so a row that
    // captures no id has written a command Tortie can never fill. Omitting
    // `resume` says the same thing without the contradiction, and that is what
    // 01-minimal.json shows.
    expect([...modes].sort()).toEqual(['pre-assign', 'pre-assign-cmd']);
    expect(newAgentsWithoutResume).toBe(1);
    // Two patches since Phase 33: 05 renames a compiled agent, and 07 gives the
    // compiled pi row an environment variable name to pass through.
    expect(patches).toBe(2);
  });

  it('shows a subcommand resume and a leading extras position, which are the two traps', () => {
    // Read the files rather than the parsed rows. The name of the extras field
    // is taken from the schema, so this test keeps working through a rename
    // instead of pinning one spelling of it into a second place.
    const extrasKey = [...schemaPropertyNames(AGENT_OVERLAY_JSON_SCHEMA)].find((name) =>
      name.toLowerCase().includes('extrasposition')
    );
    expect(extrasKey, 'the schema declares no extras position field').toBeDefined();
    const resumes = exampleFiles()
      .flatMap((name) => (readExample(name) as { agents: Record<string, unknown>[] }).agents)
      .map((row) => row['resume'] as Record<string, unknown> | undefined)
      .filter((resume): resume is Record<string, unknown> => resume !== undefined);
    expect(resumes.some((resume) => resume[extrasKey as string] === 'leading')).toBe(true);
    expect(
      resumes.some((resume) => !((resume['template'] as string[])[0] ?? '-').startsWith('-'))
    ).toBe(true);
  });

  it('gives every new agent an id the build does not already ship', () => {
    // A row whose id is compiled is a patch, and a patch is meant to name a
    // compiled id. The check is on the rest: an example that invents an agent
    // must invent an id too, or it would silently rewrite a shipped row when a
    // reader copies it. The examples that patch are named in the next test, so
    // this one cannot be satisfied by patching everything.
    const compiled = new Set(mergeAgentOverlay([]).agents.map((a) => a.id));
    const patchIds: string[] = [];
    for (const name of exampleFiles()) {
      for (const row of load(readExample(name)).rows) {
        if (compiled.has(row.id)) {
          patchIds.push(`${name}:${row.id}`);
          continue;
        }
        expect(row.displayName, `${name} adds an agent with no display name`).toBeDefined();
      }
    }
    expect(patchIds.sort()).toEqual([
      '05-patch-a-built-in-agent.json:claude',
      '07-env-passthrough.json:pi'
    ]);
  });

  it('the patch example changes nothing that can start a program', () => {
    const patched = mergeAgentOverlay(
      load(readExample('05-patch-a-built-in-agent.json')).rows
    ).agents.filter((a) => a.source === 'patched');
    expect(patched).toHaveLength(1);
    // No execution bearing field means no hash, which is what "Tortie applies
    // it without asking you to confirm anything" means in the guide.
    expect(patched[0]?.executionHash).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The guide, against the generated schema
// ---------------------------------------------------------------------------

/** Every property name the schema declares, at any depth. */
function schemaPropertyNames(node: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof node !== 'object' || node === null) return out;
  if (Array.isArray(node)) {
    for (const item of node) schemaPropertyNames(item, out);
    return out;
  }
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === 'properties' && typeof value === 'object' && value !== null) {
      for (const name of Object.keys(value as Record<string, unknown>)) out.add(name);
    }
    schemaPropertyNames(value, out);
  }
  return out;
}

/** Does the guide name this field, on its own or as part of a dotted path? */
function guideNames(field: string): boolean {
  const text = guideText();
  if (text.includes(`\`${field}\``)) return true;
  return new RegExp('`[A-Za-z.\\[\\]0-9]*\\.' + field + '`').test(text);
}

describe('the guide', () => {
  it('prints at least one JSON block, and every one of them loads', () => {
    const blocks = guideJsonBlocks();
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      let parsed: unknown;
      expect(
        () => {
          parsed = JSON.parse(block.text);
        },
        `README.md line ${block.line} is not JSON`
      ).not.toThrow();
      expect(load(parsed).problems, `README.md line ${block.line}`).toEqual([]);
    }
  });

  it('names every field the schema declares', () => {
    const missing = [...schemaPropertyNames(AGENT_OVERLAY_JSON_SCHEMA)].filter(
      (name) => !guideNames(name)
    );
    expect(missing, 'the guide never names these fields').toEqual([]);
  });

  it('names no field the contract dropped', () => {
    // Each of these is a registry field that the overlay type deliberately does
    // not carry, or an earlier draft's spelling of one it does. A guide that
    // names one of them is telling an authoring agent to write a row that will
    // be dropped whole.
    const declared = schemaPropertyNames(AGENT_OVERLAY_JSON_SCHEMA);
    const gone = [
      'flagPresets',
      'imageDrop',
      'multilineKey',
      'activity',
      'defaultHotkeyHint',
      'fallbackArgs',
      'extrasPosition',
      'resumeExtrasPosition',
      'reconstructionTarget',
      'launchable',
      'confidence'
    ];
    // A name the schema declares is not gone, whatever this list says. The
    // schema is the contract and this list is only a memory of what was tried.
    const named = gone.filter((field) => !declared.has(field) && guideNames(field));
    expect(named, 'the guide names fields the contract does not carry').toEqual([]);
  });

  it('names every execution bearing field in the section about the confirm gate', () => {
    const text = guideText();
    const start = text.indexOf('## The confirm gate');
    const end = text.indexOf('## What configuration cannot do');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const gate = text.slice(start, end);
    for (const field of EXECUTION_BEARING_FIELDS) {
      expect(gate, `the confirm gate section never names ${field}`).toContain(`\`${field}\``);
    }
  });

  it('names every refused environment variable, so a reader is never surprised', () => {
    const text = guideText();
    for (const name of ENV_REFUSED_EXACT) {
      expect(text, `the guide never names the refused ${name}`).toContain(`\`${name}\``);
    }
    for (const prefix of ENV_REFUSED_PREFIXES) {
      expect(text, `the guide never names the refused prefix ${prefix}`).toContain(prefix);
    }
    // Phase 33. These two are refused only for `launch.envPassthrough`, and the
    // reason is mechanical rather than cautious, so the guide states the reason
    // beside the name.
    for (const refused of ENV_PASSTHROUGH_REFUSED) {
      expect(text, `the guide never names the refused ${refused.name}`).toContain(
        `\`${refused.name}\``
      );
      expect(text, `the guide never says why ${refused.name} is refused`).toContain(refused.why);
    }
  });

  it('states both schema numbers, and which one the new field needs', () => {
    // Phase 33. An authoring agent that writes `envPassthrough` into a
    // `"schema": 1` file gets the row dropped, so the guide has to say the
    // number out loud rather than leave the reader to infer it.
    const text = guideText();
    for (const version of AGENT_OVERLAY_ACCEPTED_SCHEMAS) {
      expect(text, `the guide never states schema ${version}`).toContain(`\`${version}\``);
    }
    expect(text).toContain(
      'A file that uses envPassthrough must say "schema": 2. A file that says "schema": 1'
    );
  });

  it('states the reserved ids, the row limit and the session id slot', () => {
    const text = guideText();
    for (const id of RESERVED_AGENT_IDS) {
      expect(text).toContain(`\`${id}\``);
    }
    expect(text).toContain(String(OVERLAY_LIMITS.maxRows));
    expect(text).toContain(AGENT_SESSION_ID_SLOT);
  });

  it('says what the gate is for, what cannot be done, and what a wrong row does', () => {
    const text = guideText();
    expect(text).toContain('## The confirm gate');
    expect(text).toContain('## What configuration cannot do');
    expect(text).toContain('## When a row is wrong');
    expect(text).toContain('## When Tortie reads this');
    // Requirement 3 of the authoring story. An agent that writes an execution
    // bearing field has to tell the person a confirmation is coming, or the
    // gate reads as a failure and they conclude the file did not work.
    expect(text).toContain('If you are an agent writing this file, say so.');
  });

  it('names every example that exists, and names no example that does not', () => {
    const text = guideText();
    for (const name of exampleFiles()) {
      expect(text, `the guide never mentions ${name}`).toContain(name);
    }
    for (const match of text.matchAll(/(\d\d-[a-z0-9-]+\.json)/g)) {
      expect(exampleFiles(), 'the guide names an example that is not here').toContain(match[1]);
    }
  });

  it('carries a prompt a person can paste, and it points at the schema', () => {
    const text = guideText();
    expect(text).toContain('## Paste this into an agent');
    expect(text).toContain('agents.schema.json');
  });

  // The guide tells a person and an authoring agent that the schema is in this
  // folder. That sentence is only true if the file is here and is the schema
  // the build actually reads, so both halves are checked.
  it('ships the schema it points at, and it is the one the build reads', () => {
    const path = join(TEMPLATE_DIR, 'agents.schema.json');
    expect(existsSync(path), 'resources/config/agents.schema.json is missing').toBe(true);
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(AGENT_OVERLAY_JSON_SCHEMA);
  });
});

// ---------------------------------------------------------------------------
// The seeder
// ---------------------------------------------------------------------------

describe('seeding the configuration folder', () => {
  let root = '';
  let dir = '';

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'tortie-config-'));
    dir = join(root, 'userData', 'gmux', 'config');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('creates the folder and writes the guide and the examples into it', () => {
    const result = ensureConfigDirSeeded({ from: TEMPLATE_DIR, to: dir });
    expect(result.problem).toBeNull();
    expect(result.created).toBe(true);
    expect(existsSync(join(dir, 'README.md'))).toBe(true);
    // The guide tells the reader the schema is here, so the seeder has to put
    // it here. It is the file an authoring agent is pointed at.
    expect(existsSync(join(dir, 'agents.schema.json'))).toBe(true);
    for (const name of exampleFiles()) {
      expect(existsSync(join(dir, 'examples', name)), name).toBe(true);
    }
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe(guideText());
    expect(JSON.parse(readFileSync(join(dir, 'agents.schema.json'), 'utf8'))).toEqual(
      AGENT_OVERLAY_JSON_SCHEMA
    );
  });

  it('writes nothing on a second run, so a watcher sees no change at rest', () => {
    ensureConfigDirSeeded({ from: TEMPLATE_DIR, to: dir });
    const again = ensureConfigDirSeeded({ from: TEMPLATE_DIR, to: dir });
    expect(again.written).toEqual([]);
    expect(again.created).toBe(false);
    expect(again.problem).toBeNull();
  });

  it('restores its own files when they differ, which is what an update needs', () => {
    ensureConfigDirSeeded({ from: TEMPLATE_DIR, to: dir });
    writeFileSync(join(dir, 'README.md'), 'an older build wrote this\n', 'utf8');
    const result = ensureConfigDirSeeded({ from: TEMPLATE_DIR, to: dir });
    expect(result.written).toContain('README.md');
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe(guideText());
  });

  it('never writes agents.json, and never touches one that is there', () => {
    mkdirSync(dir, { recursive: true });
    const mine = join(dir, 'agents.json');
    writeFileSync(mine, '{"schema":1,"agents":[]}\n', 'utf8');
    ensureConfigDirSeeded({ from: TEMPLATE_DIR, to: dir });
    expect(readFileSync(mine, 'utf8')).toBe('{"schema":1,"agents":[]}\n');
    expect(USER_OWNED_CONFIG_FILES).toContain('agents.json');
  });

  it('leaves a file the user put there alone', () => {
    mkdirSync(dir, { recursive: true });
    const scratch = join(dir, 'my-notes.md');
    writeFileSync(scratch, 'mine\n', 'utf8');
    ensureConfigDirSeeded({ from: TEMPLATE_DIR, to: dir });
    expect(readFileSync(scratch, 'utf8')).toBe('mine\n');
  });

  it('copies only markdown and JSON, so the folder can hold no program', () => {
    const template = join(root, 'template');
    mkdirSync(template, { recursive: true });
    writeFileSync(join(template, 'README.md'), 'hello\n', 'utf8');
    writeFileSync(join(template, 'install.sh'), '#!/bin/sh\necho no\n', 'utf8');
    const result = ensureConfigDirSeeded({ from: template, to: dir });
    expect(result.written).toEqual(['README.md']);
    expect(existsSync(join(dir, 'install.sh'))).toBe(false);
  });

  it('says so plainly when it cannot read its own template', () => {
    const result = ensureConfigDirSeeded({ from: join(root, 'not-here'), to: dir });
    expect(result.problem).toContain('could not read its own configuration guide');
    expect(existsSync(dir)).toBe(true);
  });
});
