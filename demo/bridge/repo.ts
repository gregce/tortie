/**
 * The demo repos: three projects, one source of truth each for the file
 * tree (fs.readDir), the editor (fs.readFile / git.showHead) and the git
 * sidebar (git.status / git.log).
 *
 *  - rookery    — a small job-queue library; the agent transcript in
 *                 ./scripts edits src/queue.ts, so that file is modified.
 *  - heron      — a web app mid-feature; two files modified on a branch.
 *  - tern-docs  — a docs site, clean tree, quiet history; its session is
 *                 'restorable' (the durability story).
 *
 * Every read dispatches on the repo that owns the path, so adding a fourth
 * project is one more entry in REPOS.
 */
import type {
  FsDirEntry,
  GitCommitDetail,
  GitCommitFileDiff,
  GitCommitFileState,
  GitFileStatus,
  GitLogEntryDetailed,
  GitStatusDetailed,
  ReadDirResult,
  ReadFileResult
} from '@shared/types';

/** One changed file in a fixture commit (the expanded history row). */
export interface CommitFileFixture {
  path: string;
  status: GitCommitFileState;
  insertions: number;
  deletions: number;
}

export interface DemoRepoFixture {
  root: string;
  branch: string;
  /** Absent = no remote (a just-created local project). */
  upstream?: string;
  ahead: number;
  /** path (relative to root) -> working-tree contents */
  files: Record<string, string>;
  /** Contents at HEAD where they differ from the working tree. */
  headOverrides: Record<string, string>;
  /** Relative paths with unstaged worktree edits (must exist in files). */
  modified: string[];
  log: {
    subject: string;
    hoursAgo: number;
    body?: string;
    files: CommitFileFixture[];
  }[];
  author: { name: string; email: string };
}

// --------------------------------------------------------------------------
// rookery
// --------------------------------------------------------------------------

const QUEUE_TS_HEAD = `import { sleep } from './retry';

export interface Job<T> {
  run(): Promise<T>;
  retries: number;
}

export class Queue {
  private jobs: Job<unknown>[] = [];

  enqueue<T>(job: Job<T>): void {
    this.jobs.push(job);
  }

  async drain(): Promise<void> {
    for (const job of this.jobs) {
      try {
        await job.run();
      } catch (err) {
        if (job.retries > 0) {
          job.retries -= 1;
          await sleep(5);
          await job.run();
        } else {
          throw err;
        }
      }
    }
  }
}
`;

const QUEUE_TS_WORKING = QUEUE_TS_HEAD.replace(
  `  async drain(): Promise<void> {
    for (const job of this.jobs) {`,
  `  async drain(): Promise<void> {
    // completion order is the queue's promise, not the timer's
    let previous: Promise<unknown> = Promise.resolve();
    for (const job of this.jobs) {
      const settled = previous;
      previous = (async () => {
        await settled;
      })();`
);

const ROOKERY: DemoRepoFixture = {
  root: '/Users/you/rookery',
  branch: 'main',
  upstream: 'origin/main',
  ahead: 0,
  author: { name: 'Robin Crow', email: 'robin@rookery.dev' },
  files: {
    'package.json': `{
  "name": "rookery",
  "private": true,
  "version": "0.4.2",
  "scripts": {
    "test": "vitest run"
  }
}
`,
    'README.md': `# rookery

A small job queue with retries. This repository is the tortie.sh demo
fixture — poke around, open files, watch the agent work.
`,
    'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true
  }
}
`,
    'src/index.ts': `export { Queue } from './queue';
export { sleep } from './retry';
`,
    'src/queue.ts': QUEUE_TS_WORKING,
    'src/retry.ts': `export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
`,
    'test/queue.test.ts': `import { describe, expect, it } from 'vitest';
import { Queue } from '../src/queue';

describe('queue', () => {
  it('preserves completion order', async () => {
    const queue = new Queue();
    const seen: number[] = [];
    queue.enqueue({ retries: 0, run: async () => void seen.push(1) });
    queue.enqueue({ retries: 0, run: async () => void seen.push(2) });
    await queue.drain();
    expect(seen).toEqual([1, 2]);
  });
});
`
  },
  headOverrides: { 'src/queue.ts': QUEUE_TS_HEAD },
  modified: ['src/queue.ts'],
  log: [
    {
      subject: 'queue: retry failed jobs once before surfacing',
      hoursAgo: 3,
      body: 'A transient failure deserves one quiet second chance; a second failure is real and the caller should see it.',
      files: [
        { path: 'src/queue.ts', status: 'M', insertions: 9, deletions: 2 },
        { path: 'test/queue.test.ts', status: 'M', insertions: 14, deletions: 0 }
      ]
    },
    {
      subject: 'test: cover poisoned-job handling',
      hoursAgo: 8,
      files: [
        { path: 'test/queue.test.ts', status: 'M', insertions: 22, deletions: 3 }
      ]
    },
    {
      subject: 'retry: extract sleep helper',
      hoursAgo: 26,
      files: [
        { path: 'src/retry.ts', status: 'A', insertions: 3, deletions: 0 },
        { path: 'src/queue.ts', status: 'M', insertions: 2, deletions: 6 },
        { path: 'src/index.ts', status: 'M', insertions: 1, deletions: 0 }
      ]
    },
    {
      subject: 'scaffold vitest config',
      hoursAgo: 30,
      files: [
        { path: 'package.json', status: 'M', insertions: 4, deletions: 1 },
        { path: 'test/queue.test.ts', status: 'A', insertions: 13, deletions: 0 }
      ]
    },
    {
      subject: 'initial commit',
      hoursAgo: 31,
      files: [
        { path: 'package.json', status: 'A', insertions: 8, deletions: 0 },
        { path: 'README.md', status: 'A', insertions: 4, deletions: 0 },
        { path: 'tsconfig.json', status: 'A', insertions: 7, deletions: 0 },
        { path: 'src/index.ts', status: 'A', insertions: 2, deletions: 0 },
        { path: 'src/queue.ts', status: 'A', insertions: 24, deletions: 0 }
      ]
    }
  ]
};

// --------------------------------------------------------------------------
// heron
// --------------------------------------------------------------------------

const ONBOARDING_HEAD = `import { sendEmail } from '../lib/email';

export async function welcome(userId: string): Promise<void> {
  await sendEmail(userId, 'welcome');
}
`;

const ONBOARDING_WORKING = `import { sendEmail } from '../lib/email';
import { schedule } from '../lib/schedule';

export async function welcome(userId: string): Promise<void> {
  await sendEmail(userId, 'welcome');
  // Day-3 check-in goes out only if the user hasn't created a project yet.
  await schedule(userId, 'day-3-checkin', { days: 3 });
}
`;

const HERON: DemoRepoFixture = {
  root: '/Users/you/heron',
  branch: 'feat/onboarding-emails',
  upstream: 'origin/feat/onboarding-emails',
  ahead: 2,
  author: { name: 'Wren Sable', email: 'wren@heron.app' },
  files: {
    'package.json': `{
  "name": "heron",
  "private": true,
  "version": "1.8.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  }
}
`,
    'README.md': `# heron

The signup and onboarding surface. Runs on Next.js; deploys from main.
`,
    'app/page.tsx': `export default function Home() {
  return <main>Welcome to Heron.</main>;
}
`,
    'app/onboarding/welcome.ts': ONBOARDING_WORKING,
    'app/onboarding/steps.ts': `export const STEPS = [
  'create-account',
  'verify-email',
  'first-project'
] as const;
`,
    'lib/email.ts': `export async function sendEmail(
  userId: string,
  template: string
): Promise<void> {
  await fetch('/api/email', {
    method: 'POST',
    body: JSON.stringify({ userId, template })
  });
}
`,
    'lib/schedule.ts': `export async function schedule(
  userId: string,
  job: string,
  delay: { days: number }
): Promise<void> {
  await fetch('/api/schedule', {
    method: 'POST',
    body: JSON.stringify({ userId, job, delay })
  });
}
`
  },
  headOverrides: { 'app/onboarding/welcome.ts': ONBOARDING_HEAD },
  modified: ['app/onboarding/welcome.ts', 'lib/schedule.ts'],
  log: [
    {
      subject: 'onboarding: scaffold the day-3 check-in job',
      hoursAgo: 1,
      files: [
        { path: 'app/onboarding/welcome.ts', status: 'M', insertions: 3, deletions: 0 },
        { path: 'lib/schedule.ts', status: 'A', insertions: 11, deletions: 0 }
      ]
    },
    {
      subject: 'email: template lookup by name',
      hoursAgo: 5,
      files: [
        { path: 'lib/email.ts', status: 'M', insertions: 6, deletions: 2 }
      ]
    },
    {
      subject: 'steps: verify-email before first-project',
      hoursAgo: 22,
      files: [
        { path: 'app/onboarding/steps.ts', status: 'M', insertions: 1, deletions: 1 }
      ]
    },
    {
      subject: 'landing page copy pass',
      hoursAgo: 28,
      files: [
        { path: 'app/page.tsx', status: 'M', insertions: 5, deletions: 4 }
      ]
    },
    {
      subject: 'initial commit',
      hoursAgo: 96,
      files: [
        { path: 'package.json', status: 'A', insertions: 10, deletions: 0 },
        { path: 'README.md', status: 'A', insertions: 3, deletions: 0 },
        { path: 'app/page.tsx', status: 'A', insertions: 3, deletions: 0 },
        { path: 'app/onboarding/welcome.ts', status: 'A', insertions: 5, deletions: 0 },
        { path: 'app/onboarding/steps.ts', status: 'A', insertions: 5, deletions: 0 },
        { path: 'lib/email.ts', status: 'A', insertions: 9, deletions: 0 }
      ]
    }
  ]
};

// --------------------------------------------------------------------------
// tern-docs
// --------------------------------------------------------------------------

const TERN: DemoRepoFixture = {
  root: '/Users/you/tern-docs',
  branch: 'main',
  upstream: 'origin/main',
  ahead: 0,
  author: { name: 'Robin Crow', email: 'robin@rookery.dev' },
  files: {
    'README.md': `# tern-docs

The public documentation site. Plain markdown in, static site out.
`,
    'docs/getting-started.md': `# Getting started

Install the CLI, point it at a folder, and you have a site.
`,
    'docs/launch-post.md': `# Draft: the launch post

We build tools that keep working when you close the window.

<!-- The session working on this draft survived a reboot. Restore it and
     the conversation picks up where it left off. -->
`,
    'site.config.json': `{
  "title": "Tern",
  "theme": "seabird"
}
`
  },
  headOverrides: {},
  modified: [],
  log: [
    {
      subject: 'getting started: shorten the install section',
      hoursAgo: 50,
      files: [
        { path: 'docs/getting-started.md', status: 'M', insertions: 2, deletions: 9 }
      ]
    },
    {
      subject: 'seabird theme',
      hoursAgo: 120,
      files: [
        { path: 'site.config.json', status: 'M', insertions: 1, deletions: 1 }
      ]
    },
    {
      subject: 'initial commit',
      hoursAgo: 130,
      files: [
        { path: 'README.md', status: 'A', insertions: 3, deletions: 0 },
        { path: 'docs/getting-started.md', status: 'A', insertions: 3, deletions: 0 },
        { path: 'site.config.json', status: 'A', insertions: 4, deletions: 0 }
      ]
    }
  ]
};

// --------------------------------------------------------------------------
// sylva — the SPARE project. Not open at boot; "Open Project…" picks it, so
// opening a project lands on something real instead of an empty folder.
// --------------------------------------------------------------------------

const SYLVA: DemoRepoFixture = {
  root: '/Users/you/sylva',
  branch: 'main',
  upstream: 'origin/main',
  ahead: 0,
  author: { name: 'Wren Sable', email: 'wren@heron.app' },
  files: {
    'README.md': `# sylva

A tiny static-site generator: markdown in, forest of HTML out.
`,
    'package.json': `{
  "name": "sylva",
  "private": true,
  "version": "0.2.0",
  "bin": { "sylva": "./src/cli.ts" }
}
`,
    'src/cli.ts': `import { build } from './build';

const [, , source = '.', out = './dist'] = process.argv;
await build(source, out);
console.log('sylva: grove planted at', out);
`,
    'src/build.ts': `import { renderPage } from './render';

export async function build(source: string, out: string): Promise<void> {
  // Walk source, render every .md, mirror the tree into out.
  await renderPage(source, out);
}
`,
    'src/render.ts': `export async function renderPage(
  from: string,
  to: string
): Promise<void> {
  // markdown -> html, one page at a time.
  void from;
  void to;
}
`
  },
  headOverrides: {},
  modified: [],
  log: [
    {
      subject: 'cli: default the output folder to ./dist',
      hoursAgo: 12,
      files: [{ path: 'src/cli.ts', status: 'M', insertions: 2, deletions: 2 }]
    },
    {
      subject: 'split render out of build',
      hoursAgo: 40,
      files: [
        { path: 'src/render.ts', status: 'A', insertions: 9, deletions: 0 },
        { path: 'src/build.ts', status: 'M', insertions: 3, deletions: 7 }
      ]
    },
    {
      subject: 'initial commit',
      hoursAgo: 45,
      files: [
        { path: 'README.md', status: 'A', insertions: 3, deletions: 0 },
        { path: 'package.json', status: 'A', insertions: 6, deletions: 0 },
        { path: 'src/cli.ts', status: 'A', insertions: 5, deletions: 0 },
        { path: 'src/build.ts', status: 'A', insertions: 8, deletions: 0 }
      ]
    }
  ]
};

export const SPARE_PROJECT_PATH = SYLVA.root;

// --------------------------------------------------------------------------
// Registry + dispatch. Runtime-registered repos (created/cloned projects)
// join the fixtures, so every surface answers for them too.
// --------------------------------------------------------------------------

const REGISTRY = new Map<string, DemoRepoFixture>(
  [ROOKERY, HERON, TERN, SYLVA].map((r) => [r.root, r])
);

export function knownRepo(root: string): boolean {
  return REGISTRY.has(root);
}

/**
 * Register a just-created (or just-"cloned") project's repo: a README, a
 * starter source file, and one initial commit — the way a fresh folder
 * actually looks.
 */
export function registerGenericRepo(
  root: string,
  opts: { cloneUrl?: string } = {}
): DemoRepoFixture {
  const existing = REGISTRY.get(root);
  if (existing) return existing;
  const name = root.split('/').pop() ?? 'project';
  const readme = opts.cloneUrl
    ? `# ${name}\n\nCloned from ${opts.cloneUrl} — well, "cloned": this is the\ntortie.sh demo, so the network was never touched.\n`
    : `# ${name}\n\nA brand-new project, created from inside the demo.\n`;
  const repo: DemoRepoFixture = {
    root,
    branch: 'main',
    ...(opts.cloneUrl ? { upstream: 'origin/main' } : {}),
    ahead: 0,
    author: { name: 'You', email: 'you@tortie.sh' },
    files: {
      'README.md': readme,
      'src/main.ts': `console.log('hello from ${name}');\n`
    },
    headOverrides: {},
    modified: [],
    log: [
      {
        subject: 'initial commit',
        hoursAgo: 0,
        files: [
          { path: 'README.md', status: 'A', insertions: 3, deletions: 0 },
          { path: 'src/main.ts', status: 'A', insertions: 1, deletions: 0 }
        ]
      }
    ]
  };
  REGISTRY.set(root, repo);
  return repo;
}

function repoFor(path: string): DemoRepoFixture {
  for (const repo of REGISTRY.values()) {
    if (path === repo.root || path.startsWith(`${repo.root}/`)) return repo;
  }
  return ROOKERY;
}

function rel(repo: DemoRepoFixture, path: string): string {
  return path === repo.root
    ? ''
    : path.startsWith(`${repo.root}/`)
      ? path.slice(repo.root.length + 1)
      : path;
}

export function demoReadDir(dirPath: string): ReadDirResult {
  const repo = repoFor(dirPath);
  const prefix = rel(repo, dirPath);
  const seen = new Map<string, FsDirEntry>();
  for (const filePath of Object.keys(repo.files)) {
    if (prefix !== '' && !filePath.startsWith(`${prefix}/`)) continue;
    const rest = prefix === '' ? filePath : filePath.slice(prefix.length + 1);
    const first = rest.split('/')[0]!;
    const isDir = rest.includes('/');
    if (!seen.has(first)) {
      const relPath = prefix === '' ? first : `${prefix}/${first}`;
      seen.set(first, {
        name: first,
        path: `${repo.root}/${relPath}`,
        kind: isDir ? 'dir' : 'file'
      });
    }
  }
  return { path: dirPath, entries: [...seen.values()] };
}

export function demoReadFile(path: string): ReadFileResult {
  const repo = repoFor(path);
  const contents = repo.files[rel(repo, path)];
  return {
    path,
    contents: contents ?? `// ${path} is not part of the demo fixture\n`,
    encoding: 'utf8',
    truncated: false
  };
}

export function demoShowHead(path: string): string {
  const repo = repoFor(path);
  const key = rel(repo, path);
  return repo.headOverrides[key] ?? repo.files[key] ?? '';
}

export function demoGitStatus(repoPath: string): GitStatusDetailed {
  const repo = repoFor(repoPath);
  const changes: GitFileStatus[] = repo.modified.map((path) => ({
    path,
    indexState: '.',
    worktreeState: 'M'
  }));
  return {
    repoPath: repo.root,
    branch: repo.branch,
    upstream: repo.upstream,
    ahead: repo.ahead,
    behind: 0,
    merging: false,
    isRepo: true,
    files: changes,
    groups: { merge: [], staged: [], changes, untracked: [] }
  };
}

const HOUR = 3_600_000;

export function demoGitLog(repoPath: string): GitLogEntryDetailed[] {
  const repo = repoFor(repoPath);
  const now = Date.now();
  const entries = repo.log.map<GitLogEntryDetailed>((row, i) => {
    // Stable per-repo fake SHAs: digit = position, letter block = repo.
    const hash = `${(i + 1).toString(16)}${repo.root.length.toString(16)}`
      .repeat(20)
      .slice(0, 40);
    const authorDate = now - row.hoursAgo * HOUR;
    return {
      hash,
      sha: hash,
      shortSha: hash.slice(0, 7),
      parents: [],
      authorName: repo.author.name,
      author: repo.author.name,
      authorEmail: repo.author.email,
      authorDate,
      dateISO: new Date(authorDate).toISOString(),
      subject: row.subject
    };
  });
  // Linear history: each commit's parent is the next-older one.
  for (let i = 0; i < entries.length - 1; i++)
    entries[i]!.parents = [entries[i + 1]!.hash];
  return entries;
}

/** git:commitDetail — the expanded history row / hover card. */
export function demoCommitDetail(
  repoPath: string,
  sha: string
): GitCommitDetail {
  const repo = repoFor(repoPath);
  const entries = demoGitLog(repoPath);
  const index = Math.max(
    0,
    entries.findIndex((e) => e.sha === sha || e.shortSha === sha)
  );
  const entry = entries[index]!;
  const fixture = repo.log[index]!;
  const files = fixture.files.map((f) => ({ ...f }));
  return {
    sha: entry.sha,
    shortSha: entry.shortSha,
    author: entry.authorName,
    email: entry.authorEmail,
    dateISO: entry.dateISO,
    subject: entry.subject,
    body: fixture.body ?? '',
    files,
    insertions: files.reduce((n, f) => n + f.insertions, 0),
    deletions: files.reduce((n, f) => n + f.deletions, 0)
  };
}

/**
 * git:commitFileDiff — the parent→commit content pair for one file. The
 * fixtures store no per-commit blobs, so the demo synthesizes a coherent
 * pair from today's contents: an added file diffs against nothing, and a
 * modified file's "before" is the current text with its first lines held
 * back — a plausible small change, honest enough for a demo.
 */
export function demoCommitFileDiff(input: {
  repoPath: string;
  sha: string;
  path: string;
  status: GitCommitFileState;
}): GitCommitFileDiff {
  const repo = repoFor(input.repoPath);
  const entries = demoGitLog(input.repoPath);
  const index = Math.max(
    0,
    entries.findIndex(
      (e) => e.sha === input.sha || e.shortSha === input.sha
    )
  );
  const entry = entries[index]!;
  const parent = entries[index + 1] ?? null;
  const key = input.path;
  const current = repo.headOverrides[key] ?? repo.files[key] ?? '';
  const added = input.status === 'A' || parent === null;
  let oldContents: string | null = null;
  if (!added) {
    const lines = current.split('\n');
    const held = Math.max(1, Math.min(4, Math.floor(lines.length / 4)));
    oldContents = lines.slice(held).join('\n');
  }
  return {
    sha: entry.sha,
    shortSha: entry.shortSha,
    parentSha: parent?.sha ?? null,
    oldPath: added ? null : key,
    newPath: key,
    oldContents,
    newContents: current,
    binary: false
  };
}

/** Head SHA + subject for the branch surfaces. */
export function demoRepoTip(repoPath: string): {
  repo: DemoRepoFixture;
  sha: string;
  shortSha: string;
  subject: string;
} {
  const repo = repoFor(repoPath);
  const head = demoGitLog(repoPath)[0]!;
  return {
    repo,
    sha: head.sha,
    shortSha: head.shortSha,
    subject: head.subject
  };
}
