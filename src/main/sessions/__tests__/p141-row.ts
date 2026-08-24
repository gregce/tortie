/**
 * The manifest row both Phase 141 test files start from.
 *
 * It was written twice, once in each file, and the two copies were the same
 * eleven lines apart from the two fields the second one adds. Extracted at
 * integration, because CLAUDE.md asks for a duplicated block of ten lines or
 * more to become one thing, and because a fixture that drifts between two
 * files is how two tests end up proving different rules while both pass.
 *
 * The cast is the same one both copies made. A test row names the fields the
 * rule under test reads and nothing else, and `ManifestSessionRecord` carries
 * a great deal a claim rule never looks at.
 */

import type { ManifestSessionRecord } from '../../manifest';

/** A live claude row, with whatever the caller wants different about it. */
export function p141Row(
  over: Partial<ManifestSessionRecord> = {}
): ManifestSessionRecord {
  return {
    id: 'sess-1',
    name: 'claude-1',
    agent: 'claude',
    status: 'running',
    cwd: '/tmp',
    projectPath: '/tmp',
    createdAt: 1,
    argv: ['/usr/local/bin/claude'],
    ...over
  } as unknown as ManifestSessionRecord;
}
