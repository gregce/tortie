/**
 * The confirm copy is final in research 29. These tests hold it to the two
 * rules it was written under: sentence case with no exclamation marks, and a
 * primary button that names the consequence rather than the verb.
 *
 * The third assertion is the one worth keeping: trashing a skill and trashing a
 * link to a skill are different acts and must never share a sentence.
 */

import { describe, expect, it } from 'vitest';
import {
  addMcpCopy,
  changedAfterApprovalCopy,
  commandFailureCopy,
  enablePluginCopy,
  installSkillCopy,
  projectArrivalSentence,
  removeSkillCopy,
  unpinnedCommandCopy
} from '../install-copy';
import { scanSkillBody } from '../../surface/executable-scan';
import type { ContextExecutableScan } from '../../model';
import type { ConfirmCopy } from '../install-copy';

/** A scan that never ran. It must never read as clean. */
const UNSCANNED: ContextExecutableScan = {
  findings: [],
  truncated: false,
  filesRead: 0
};

/** Bundled scripts, which main finds by listing the directory. */
function withScripts(
  scan: ContextExecutableScan,
  n: number
): ContextExecutableScan {
  return {
    ...scan,
    findings: [
      ...scan.findings,
      ...Array.from({ length: n }, (_, i) => ({
        kind: 'bundled-script' as const,
        detail: `scripts/run-${i}.sh`,
        path: `/skills/x/scripts/run-${i}.sh`,
        line: null
      }))
    ]
  };
}

const NOW = Date.parse('2026-08-12T00:00:00Z');

const ALL: ConfirmCopy[] = [
  installSkillCopy(
    'govuk-style',
    'github.com/alphagov/skills',
    UNSCANNED,
    null,
    NOW
  ),
  addMcpCopy('supabase', ['SUPABASE_ACCESS_TOKEN']),
  changedAfterApprovalCopy('claude-tools'),
  unpinnedCommandCopy('npx -y @playwright/mcp@latest'),
  enablePluginCopy(
    'security-guidance',
    'Claude Code',
    'Sessions running now are not affected.'
  ),
  removeSkillCopy('govuk-style', false),
  removeSkillCopy('govuk-style', true)
];

describe('every confirm', () => {
  it('has no exclamation mark anywhere', () => {
    for (const copy of ALL) {
      expect(copy.title).not.toContain('!');
      for (const line of copy.body) expect(line).not.toContain('!');
      expect(copy.confirmLabel).not.toContain('!');
    }
  });

  it('names the consequence on the primary button, never "OK"', () => {
    for (const copy of ALL) {
      expect(copy.confirmLabel.toLowerCase()).not.toBe('ok');
      expect(copy.confirmLabel.length).toBeGreaterThan(1);
    }
  });

  it('reserves the destructive fill for the confirms that destroy something', () => {
    expect(removeSkillCopy('x', false).destructive).toBe(true);
    expect(installSkillCopy('x', 'y', UNSCANNED, null, NOW).destructive).toBe(
      false
    );
    expect(enablePluginCopy('x', 'Claude Code', 'z').destructive).toBe(false);
  });
});

describe('installing a skill', () => {
  it('repeats what the scan found, because the body is where the payload hides', () => {
    const scan = withScripts(scanSkillBody('!`sh -c x`'), 3);
    const copy = installSkillCopy(
      'govuk-style',
      'github.com/alphagov/skills',
      scan,
      null,
      NOW
    );
    expect(copy.title).toBe(
      'Install govuk-style from github.com/alphagov/skills?'
    );
    expect(copy.body[0]).toBe(
      'Skills run inside your agents. This one ships 3 scripts and runs 1 shell command with your permissions.'
    );
  });

  it('says it has not read the skill rather than implying it is clean', () => {
    const copy = installSkillCopy('x', 'y', UNSCANNED, null, NOW);
    expect(copy.body[0]).toContain('has not read this one');
  });

  it('carries the audit sentence as its own line', () => {
    const copy = installSkillCopy('x', 'y', scanSkillBody('prose'), null, NOW);
    expect(copy.body[1]).toBe('Not scanned.');
  });
});

describe('adding an MCP server', () => {
  it('names the variables it needs, and never their values', () => {
    const copy = addMcpCopy('supabase', ['SUPABASE_ACCESS_TOKEN']);
    expect(copy.title).toBe('Add the supabase server?');
    expect(copy.body[1]).toBe('It needs SUPABASE_ACCESS_TOKEN.');
    expect(copy.confirmLabel).toBe('Add server');
  });

  it('lists several variables in one sentence', () => {
    expect(addMcpCopy('x', ['B_TOKEN', 'A_KEY']).body[1]).toBe(
      'It needs A_KEY and B_TOKEN.'
    );
  });
});

describe('removing', () => {
  it('never shares a sentence between a skill and a link to one', () => {
    const skill = removeSkillCopy('govuk-style', false);
    const link = removeSkillCopy('govuk-style', true);
    expect(skill.title).toBe('Delete "govuk-style"?');
    expect(link.title).toBe('Remove the link to "govuk-style"?');
    expect(skill.body[0]).not.toBe(link.body[0]);
    expect(link.body[0]).toContain('~/.agents/skills');
  });
});

describe('the rug-pull confirm', () => {
  it('offers a way to see what changed, and does not re-enable by default', () => {
    const copy = changedAfterApprovalCopy('claude-tools');
    expect(copy.title).toBe('claude-tools changed since you approved it.');
    expect(copy.altLabel).toBe('Show what changed');
    expect(copy.cancelLabel).toBe('Leave it disabled');
  });
});

describe('a command that did not work', () => {
  it('names the operation and what happened to it', () => {
    expect(commandFailureCopy('install', 1, false)).toBe(
      'The install exited 1.'
    );
    expect(commandFailureCopy('install', null, true)).toBe(
      'Tortie stopped the install because it did not finish.'
    );
    expect(commandFailureCopy('install', null, false)).toBe(
      'The install did not run.'
    );
  });
});

describe('what a project brings with it', () => {
  it('says the config came from the repository rather than from the user', () => {
    expect(projectArrivalSentence(2, 1)).toEqual([
      'This project adds 2 MCP servers and 1 hook.',
      'They come from the repository, not from you. Review them before enabling.'
    ]);
    expect(projectArrivalSentence(0, 0)).toEqual([]);
  });
});

describe('the unpinned server', () => {
  it('names the command that resolves fresh code at every launch', () => {
    const copy = unpinnedCommandCopy('npx -y @playwright/mcp@latest');
    expect(copy.body[0]).toContain('npx -y @playwright/mcp@latest');
    expect(copy.confirmLabel).toBe('Pin the current version');
  });
});
