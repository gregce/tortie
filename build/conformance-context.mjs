/**
 * `npm run conformance:context` — the cheap capture gate that keeps the
 * substrate matrix executable rather than documented.
 *
 * WHAT IT IS FOR. Research 29 §2 is a table of twelve agents, five categories
 * and at least seven mutually incompatible precedence models, and the panel's
 * whole value is drawing it correctly. A table in a markdown file cannot fail a
 * build. This prints the table Tortie's own code will actually use, and it
 * fails when a row loses the thing the panel needs to draw it.
 *
 * WHAT IT CHECKS, and each one is a defect the panel had:
 *
 *  1. Every agent that declares locations for a category has a precedence model
 *     and a non-empty scope order. Without the order the view falls back to
 *     Claude Code's ladder and draws another agent's groups upside down.
 *  2. Claude Code's two ladders still run in opposite directions. Skills go
 *     global before project; MCP servers go project before global. That
 *     inversion inside one product is why this view exists.
 *  3. Gemini's skills ladder is the inverse of Claude Code's. If those two ever
 *     agree, either the research changed or a table edit flattened them.
 *  4. No precedence order contains `bundled`. A vendor bundle competes with
 *     nothing and must never appear in a ladder.
 *  5. Every agent and category has a live-reload cell, with `unknown` a real
 *     value rather than a missing key.
 *
 * It runs in about a second, spawns nothing, makes no request, starts no tmux
 * server and reads no file under the user's home. It is safe to run anywhere.
 */

import { spawnSync } from 'node:child_process';
import { tsxCli } from './ts-runner.mjs';

const probe = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/context-matrix-probe.mts'],
  { encoding: 'utf8', cwd: process.cwd() }
);

if (probe.status !== 0) {
  process.stderr.write(probe.stderr || 'the probe did not run\n');
  process.exit(1);
}

/** @type {{agent:string,displayName:string,category:string,model:string,evidence:string,scopeOrder:string[],note:string,reload:string}[]} */
let rows;
try {
  rows = JSON.parse(probe.stdout);
} catch {
  process.stderr.write(`the probe did not print JSON:\n${probe.stdout}\n`);
  process.exit(1);
}

const failures = [];

// 1. Every declared pair carries a model, a sentence and an order.
for (const row of rows) {
  // A category whose only locations are VENDOR BUNDLES has nothing to order.
  // Muse's plugins are the live example: the agent ships them and the user has
  // no scope of their own there, so an empty order is the correct answer rather
  // than a missing one.
  if (row.scopeOrder.length === 0 && row.ownLocations > 0) {
    failures.push(`${row.agent}/${row.category} declares locations and has no scope order.`);
  }
  if (!row.note || row.note.length === 0) {
    failures.push(`${row.agent}/${row.category} has no precedence sentence.`);
  }
  if (!row.reload) {
    failures.push(`${row.agent}/${row.category} has no live-reload answer.`);
  }
  // 4. A vendor bundle competes with nothing.
  if (row.scopeOrder.includes('bundled')) {
    failures.push(`${row.agent}/${row.category} puts a bundled scope in a precedence order.`);
  }
}

const find = (agent, category) =>
  rows.find((row) => row.agent === agent && row.category === category) ?? null;

// 2. The two directions inside Claude Code.
const claudeSkill = find('claude', 'skill');
const claudeMcp = find('claude', 'mcp');
if (claudeSkill === null || claudeMcp === null) {
  failures.push('Claude Code no longer declares both skills and MCP servers.');
} else {
  if (claudeSkill.scopeOrder.indexOf('global') > claudeSkill.scopeOrder.indexOf('project')) {
    failures.push("Claude Code's skills no longer resolve global before project.");
  }
  if (claudeMcp.scopeOrder.indexOf('project') > claudeMcp.scopeOrder.indexOf('global')) {
    failures.push("Claude Code's MCP servers no longer resolve project before global.");
  }
}

// 3. Gemini inverts Claude Code.
const geminiSkill = find('gemini', 'skill');
if (geminiSkill === null) {
  failures.push('Gemini no longer declares skills.');
} else if (
  claudeSkill !== null &&
  geminiSkill.scopeOrder.join('|') === claudeSkill.scopeOrder.join('|')
) {
  failures.push('Gemini and Claude Code now order skills the same way, which the research says they do not.');
}

// The table, printed whatever the verdict, because the point is that a person
// can read it against research 29 §2.
const pad = (value, width) => String(value).padEnd(width);
process.stdout.write('\nagent        category     model             evidence     reload        order\n');
process.stdout.write('-'.repeat(110) + '\n');
for (const row of rows) {
  process.stdout.write(
    `${pad(row.agent, 12)} ${pad(row.category, 12)} ${pad(row.model, 17)} ` +
      `${pad(row.evidence, 12)} ${pad(row.reload, 13)} ${row.scopeOrder.join(' > ')}\n`
  );
}

const agents = new Set(rows.map((row) => row.agent));
process.stdout.write(
  `\n${rows.length} agent-and-category pairs across ${agents.size} agents.\n`
);

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${failures.length}:\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}

process.stdout.write('\nPASS. Every declared pair carries a model, an order and a reload answer.\n');
