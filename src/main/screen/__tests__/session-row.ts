/**
 * One session row for the Screen's tests: Phase 337's watcher
 * (`watch.test.ts`) and Phase 337.1's page reader (`scrollback.test.ts`) each
 * hand the core a running shell on this Mac, or with `machine` set, one on
 * another machine. Shared so the two files describe the same row.
 */
import type { Session } from '@shared/types';

export function row(id: string, extra: Partial<Session> = {}): Session {
  return {
    id,
    name: id,
    tmuxName: id,
    projectPath: '/p',
    cwd: '/p',
    agent: 'shell',
    status: 'running',
    createdAt: 0,
    ...extra
  } as Session;
}
