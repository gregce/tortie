/**
 * The BOUNDARY rules that are call shaped (Phase 257): a worker, a thread,
 * a utility process. These are the build-and-start half research 118 §7.6
 * measured at 15 of 15; the module root half is a path rule in
 * `./path-rules.ts` and the schema keeps the two apart by kind.
 */

import type { FactRule } from './types';

export const BOUNDARY_RULES: readonly FactRule[] = [
  {
    id: 'boundary.worker',
    category: 'boundary',
    kind: 'worker',
    langs: '*',
    match: (s) => {
      if (s.form !== 'new' && s.form !== 'call') return null;
      if (/^(Worker|SharedWorker|Thread|NSThread|ThreadPoolExecutor|ProcessPoolExecutor)$/.test(s.last)) {
        return `starts a ${s.last}`;
      }
      if (s.recv === 'threading' && /^(Thread|Timer)$/.test(s.last)) return 'starts a thread';
      if (s.recv === 'multiprocessing' && /^(Process|Pool)$/.test(s.last)) return 'starts a process';
      return null;
    }
  },
  {
    id: 'boundary.spawn-thread',
    category: 'boundary',
    kind: 'thread',
    langs: ['rust', 'go', 'swift'],
    match: (s) => {
      if (s.last !== 'spawn') return null;
      if (/^(thread|tokio|task|rayon|async_std)$/.test(s.recv)) return `starts a task on ${s.recv}`;
      return null;
    }
  },
  {
    id: 'boundary.utilityprocess',
    category: 'boundary',
    kind: 'process',
    langs: ['typescript', 'tsx', 'javascript'],
    match: (s) => (s.recv === 'utilityProcess' && s.last === 'fork' ? 'starts a utility process' : null)
  }
];
