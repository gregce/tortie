/**
 * The three formats other people's tools write, and the shapes they actually
 * write them in.
 *
 * Every input below was taken from a real file on the operator's machine, or
 * is a shape research 29 recorded: Cursor's folded block scalars, a skill that
 * declares hooks in its own frontmatter, `~/.claude.json` at 1.17 MB, and
 * Codex's `[hooks.state."plugin@mkt:hooks/f.json:event:0:0"]` table keys.
 *
 * These parsers are subsets and they are written to say so. A file that uses
 * something outside the subset is reported as a problem rather than half-read,
 * because a skill shown with the wrong description is worse than one shown as
 * broken.
 */

import { describe, expect, it } from 'vitest';
import { parseFrontmatter, parseYamlHead, yamlList, yamlString } from '../parse/frontmatter';
import { asRecord, dig, parseJsonc, stripJsonc } from '../parse/jsonc';
import { parseToml, tomlString, tomlTable } from '../parse/toml';

describe('SKILL.md frontmatter', () => {
  it('reads the plain case', () => {
    const parsed = parseFrontmatter('---\nname: govuk-style\ndescription: Write plainly.\n---\n\nBody.\n');
    expect(yamlString(parsed.data.name)).toBe('govuk-style');
    expect(yamlString(parsed.data.description)).toBe('Write plainly.');
    expect(parsed.body.trim()).toBe('Body.');
    expect(parsed.bodyStartLine).toBe(5);
    expect(parsed.problem).toBeNull();
  });

  it("reads Cursor's folded block scalar", () => {
    const parsed = parseFrontmatter(
      '---\nname: babysit\ndescription: >-\n  Keep a PR merge-ready by triaging comments, resolving clear conflicts, and\n  fixing CI in a loop.\n---\n# Babysit PR\n'
    );
    expect(yamlString(parsed.data.description)).toBe(
      'Keep a PR merge-ready by triaging comments, resolving clear conflicts, and fixing CI in a loop.'
    );
  });

  it('reads a literal block scalar without folding the lines together', () => {
    const parsed = parseFrontmatter('---\nnotes: |\n  one\n  two\n---\n');
    expect(yamlString(parsed.data.notes)).toBe('one\ntwo');
  });

  it('reads an empty quoted description rather than inventing one', () => {
    const parsed = parseFrontmatter("---\nname: canvas\ndescription: ''\n---\n");
    expect(yamlString(parsed.data.description)).toBeNull();
  });

  it('reads the nested map a skill declares its own hooks in', () => {
    const parsed = parseFrontmatter(
      '---\nname: lore\nhooks:\n  PreToolUse:\n    - matcher: "ExitPlanMode"\n      hooks:\n        - type: command\n          command: "node script.mjs"\n---\n'
    );
    const hooks = parsed.data.hooks;
    expect(hooks && typeof hooks === 'object' && !Array.isArray(hooks)).toBe(true);
    expect(Object.keys(hooks as Record<string, unknown>)).toEqual(['PreToolUse']);
  });

  it('reads a sequence of maps', () => {
    const parsed = parseFrontmatter(
      '---\nname: govuk-style\nargs:\n  - name: target\n    description: The document\n    required: false\n---\n'
    );
    const args = parsed.data.args;
    expect(Array.isArray(args)).toBe(true);
    expect((args as Record<string, unknown>[])[0]).toMatchObject({
      name: 'target',
      required: false
    });
  });

  it('reads allowed-tools whether it is a list or a string', () => {
    expect(yamlList(parseFrontmatter('---\nallowed-tools: Bash, Read\n---\n').data['allowed-tools'])).toEqual([
      'Bash',
      'Read'
    ]);
    expect(yamlList(parseFrontmatter('---\nallowed-tools: [Bash, Read]\n---\n').data['allowed-tools'])).toEqual([
      'Bash',
      'Read'
    ]);
  });

  it('a file with no frontmatter is not an error', () => {
    const parsed = parseFrontmatter('# Just markdown\n');
    expect(parsed.data).toEqual({});
    expect(parsed.problem).toBeNull();
  });

  it('an unclosed block is reported rather than half-read', () => {
    const parsed = parseFrontmatter('---\nname: broken\ndescription: nothing closes this\n');
    expect(parsed.problem?.message).toBe('The frontmatter block is never closed.');
  });

  it('a YAML feature outside the subset is reported, with its line', () => {
    const parsed = parseYamlHead('name: x\nbase: &anchor value\n');
    expect(parsed.problem?.line).toBe(2);
  });
});

describe('JSON with comments and trailing commas', () => {
  it('strips both and keeps the offsets so the line stays right', () => {
    const text = '{\n  // a note\n  "a": 1,\n  /* block */\n  "b": [1, 2,],\n}';
    const parsed = parseJsonc<Record<string, unknown>>(text, 'settings.json');
    expect(parsed.problem).toBeNull();
    expect(parsed.value).toEqual({ a: 1, b: [1, 2] });
    expect(stripJsonc(text).split('\n')).toHaveLength(6);
  });

  it('does not treat a URL inside a string as a comment', () => {
    const parsed = parseJsonc<Record<string, string>>('{"u": "https://example.com/x"}', 'x.json');
    expect(parsed.value?.u).toBe('https://example.com/x');
  });

  it('names the file and points at a line when it will not parse', () => {
    const parsed = parseJsonc('{\n  "a": 1,\n  "b": \n}', '.mcp.json');
    expect(parsed.value).toBeNull();
    expect(parsed.problem?.message).toBe('.mcp.json could not be read.');
    expect(parsed.problem?.line).toBeGreaterThan(1);
  });

  it("finds Amp's literal dotted key as well as a nested path", () => {
    const flat = asRecord(parseJsonc('{"amp.mcpServers": {"s": {}}}', 'x').value);
    const nested = asRecord(parseJsonc('{"amp": {"mcpServers": {"s": {}}}}', 'x').value);
    expect(dig(flat, 'amp.mcpServers')).toEqual({ s: {} });
    expect(dig(nested, 'amp.mcpServers')).toEqual({ s: {} });
  });
});

describe('the TOML subset Codex and DeepSeek write', () => {
  const config = [
    '# a comment',
    'model = "gpt"',
    '',
    '[projects."/Users/gdc/some project"]',
    'trust_level = "trusted"',
    '',
    '[mcp_servers.openaiDeveloperDocs]',
    'url = "https://developers.openai.com/mcp"',
    '',
    '[mcp_servers.node_repl]',
    'args = []',
    'command = "/bin/node_repl"',
    'startup_timeout_sec = 120',
    '',
    '[mcp_servers.node_repl.env]',
    'NODE_REPL_NODE_PATH = "/bin/node"',
    '',
    '[plugins."specstory@specstory"]',
    'enabled = true',
    '',
    '[hooks.state."specstory@specstory:hooks/codex-hooks.json:session_start:0:0"]',
    'enabled = true',
    'trusted_hash = "sha256:61bcef00"',
    ''
  ].join('\n');

  it('reads quoted table keys, nested tables and typed values', () => {
    const parsed = parseToml(config, 'config.toml');
    expect(parsed.problem).toBeNull();
    const servers = tomlTable(parsed.value.mcp_servers);
    expect(Object.keys(servers ?? {})).toEqual(['openaiDeveloperDocs', 'node_repl']);
    expect(tomlString(tomlTable(servers?.node_repl)?.command)).toBe('/bin/node_repl');
    expect(tomlTable(tomlTable(servers?.node_repl)?.env)).toEqual({
      NODE_REPL_NODE_PATH: '/bin/node'
    });
    expect(tomlTable(parsed.value.plugins)).toHaveProperty('specstory@specstory');
  });

  it('keeps a hook key that contains colons, slashes and an at sign', () => {
    const parsed = parseToml(config, 'config.toml');
    const state = tomlTable(tomlTable(parsed.value.hooks)?.state);
    const key = 'specstory@specstory:hooks/codex-hooks.json:session_start:0:0';
    expect(Object.keys(state ?? {})).toEqual([key]);
    expect(tomlString(tomlTable(state?.[key])?.trusted_hash)).toBe('sha256:61bcef00');
  });

  it('reads inline tables, arrays and multi-line strings', () => {
    const parsed = parseToml(
      'a = { b = 1, c = ["x", "y"] }\nd = """\nline one\nline two\n"""\n',
      'x.toml'
    );
    expect(parsed.value.a).toEqual({ b: 1, c: ['x', 'y'] });
    expect(parsed.value.d).toBe('line one\nline two\n');
  });

  it('keeps reading after a line it cannot parse, and reports the first one', () => {
    const parsed = parseToml('good = 1\nthis is not toml\nalso_good = 2\n', 'config.toml');
    expect(parsed.value.good).toBe(1);
    expect(parsed.value.also_good).toBe(2);
    expect(parsed.problem?.line).toBe(2);
  });
});
