/**
 * The fixture bridge: a browser implementation of `InstalledGmuxApi`.
 *
 * This is what makes the tortie.sh demo the REAL app: src/renderer runs
 * unmodified, and every `window.gmux` call lands here instead of Electron
 * IPC. The rule for every member: answer the way an idle, healthy, local
 * Tortie would. Fixture data lives in ./world; scripted terminal bytes in
 * ./term-engine + ./scripts.
 *
 * Members the demo storyline needs behave for real (projects, sessions,
 * terminal stream, settings). Everything else resolves to the calm empty
 * answer so no surface crashes and no control dangles mid-air.
 */
import { defaultGmuxSettings } from '@shared/settings';
import type { InstalledGmuxApi } from '@shared/ipc';
import { demoAgentsScan } from './agents';
import { demoContext } from './context-fixture';
import { withSafetyNet } from './magic';
import { showDemoPopupMenu } from './popup-menu';
import {
  demoCommitDetail,
  demoCommitFileDiff,
  demoGitLog,
  demoGitStatus,
  demoReadDir,
  demoReadFile,
  demoRepoTip,
  demoShowHead
} from './repo';
import { installTruncationFallback } from './truncation-fix';
import { createWorld } from './world';

type Unsub = () => void;

/** A subscription that never fires. */
const silent = (): Unsub => () => undefined;

export function installDemoBridge(): void {
  const world = createWorld();
  const settings = defaultGmuxSettings();

  // ---- fake clone stream --------------------------------------------------
  // The caller mints a cloneId, subscribes, then calls clone(); frames land
  // on a timer with git's own phase names. Cancelling emits the honest
  // cancelled frame. On success the project is added BEFORE the done frame,
  // matching main's contract ("already added to the manifest").
  const cloneSubscribers = new Map<string, Set<(frame: unknown) => void>>();
  const cancelledClones = new Set<string>();
  const emitClone = (cloneId: string, frame: object): void => {
    for (const cb of cloneSubscribers.get(cloneId) ?? [])
      cb({ cloneId, ...frame });
  };
  const runFakeClone = (input: {
    cloneId: string;
    url: string;
    parentDir: string;
    name: string;
  }): void => {
    const { cloneId } = input;
    const steps: { delay: number; frame: object }[] = [
      { delay: 120, frame: { phase: 'starting' } },
      { delay: 420, frame: { phase: 'enumerating' } },
      { delay: 380, frame: { phase: 'counting', percent: 100, done: 128, total: 128 } },
      { delay: 300, frame: { phase: 'receiving', percent: 34, done: 44, total: 128, bytes: '1.12 MiB' } },
      { delay: 420, frame: { phase: 'receiving', percent: 82, done: 105, total: 128, bytes: '2.61 MiB' } },
      { delay: 320, frame: { phase: 'receiving', percent: 100, done: 128, total: 128, bytes: '3.18 MiB' } },
      { delay: 260, frame: { phase: 'resolving', percent: 100, done: 54, total: 54 } },
      { delay: 240, frame: { phase: 'checkingOut', percent: 100, done: 17, total: 17 } }
    ];
    let at = 0;
    for (const step of steps) {
      at += step.delay;
      setTimeout(() => {
        if (cancelledClones.has(cloneId)) return;
        emitClone(cloneId, step.frame);
      }, at);
    }
    setTimeout(() => {
      if (cancelledClones.has(cloneId)) {
        emitClone(cloneId, { done: true, cancelled: true });
        return;
      }
      const path = `${input.parentDir.replace(/\/$/, '')}/${input.name}`;
      const project = world.addProject(path, { cloneUrl: input.url });
      emitClone(cloneId, { done: true, project, path, branch: 'main' });
    }, at + 260);
  };

  const api = {
    // ---- sessions ---------------------------------------------------------
    sessions: {
      list: async () => [...world.sessions],
      create: async (input: {
        name: string;
        agent: 'claude' | 'codex' | 'shell';
        projectPath?: string;
        cwd?: string;
      }) => world.addSession(input),
      attach: async (sessionId: string) => {
        world.terminalFor(sessionId).attach();
      },
      detach: async (_sessionId: string) => undefined,
      resize: async (_input: unknown) => undefined,
      restore: async (sessionId: string) => {
        const row = world.restoreSession(sessionId);
        if (!row) throw new Error('demo: unknown session');
        // The terminal replays "saved scrollback" and arms the resume
        // command the moment the pane attaches (see restoredScript).
        return row;
      },
      onChanged: (cb: (s: unknown[]) => void): Unsub => {
        world.listeners.sessionsChanged.add(cb);
        return () => world.listeners.sessionsChanged.delete(cb);
      },
      onStatusChanged: (cb: (id: string, st: unknown) => void): Unsub => {
        world.listeners.statusChanged.add(cb);
        return () => world.listeners.statusChanged.delete(cb);
      },
      shellPathReady: async () => undefined
    },

    // ---- projects ---------------------------------------------------------
    // Open/new/clone are all supported. The "native" folder picker cannot
    // exist in a browser, so picking answers with a prepared fixture: the
    // spare sylva repo first, fresh generic folders after it.
    projects: {
      list: async () => [...world.projects],
      add: async (path: string) => world.addProject(path),
      remove: async (projectId: string) => {
        world.removeProject(projectId);
      },
      pickDirectory: async () => world.pickProjectDir(),
      pickDirectoryFor: async (purpose: string) =>
        purpose === 'new-project-parent' ? '/Users/you' : world.pickProjectDir(),
      create: async (input: {
        parentDir: string;
        name: string;
        gitInit: boolean;
      }) => {
        const path = `${input.parentDir.replace(/\/$/, '')}/${input.name}`;
        const project = world.addProject(path);
        return { project, path, isRepo: input.gitInit };
      },
      clonePreflight: async (input: { raw: string }) => {
        const raw = input.raw.trim();
        // scp/ssh form → https, credentials dropped; enough truth for a demo.
        const normalized = raw
          .replace(/^git@([^:]+):/, 'https://$1/')
          .replace(/^ssh:\/\//, 'https://')
          .replace(/^(https?:\/\/)[^@/]+@/, '$1')
          .replace(/\.git$/, '');
        const url = /^https?:\/\//.test(normalized)
          ? normalized
          : `https://github.com/${normalized}`;
        const parts = url.replace(/^https?:\/\//, '').split('/');
        const host = parts[0] ?? 'github.com';
        const owner = parts[1];
        const repoName = parts[2];
        const suggestedName = repoName ?? owner ?? 'repository';
        return {
          url,
          host,
          ...(owner ? { owner } : {}),
          ...(repoName ? { repo: repoName } : {}),
          suggestedName,
          defaultBranch: 'main',
          ...(raw.startsWith('git@') || raw.startsWith('ssh://')
            ? { rewrittenFromSsh: true }
            : {})
        };
      },
      clone: async (input: {
        cloneId: string;
        url: string;
        parentDir: string;
        name: string;
      }) => {
        runFakeClone(input);
        return { cloneId: input.cloneId };
      },
      cancelClone: async (cloneId: string) => {
        cancelledClones.add(cloneId);
      },
      onCloneProgress: (
        cloneId: string,
        cb: (frame: unknown) => void
      ): Unsub => {
        let subs = cloneSubscribers.get(cloneId);
        if (!subs) {
          subs = new Set();
          cloneSubscribers.set(cloneId, subs);
        }
        subs.add(cb);
        return () => subs?.delete(cb);
      }
    },

    // ---- terminal byte stream --------------------------------------------
    term: {
      onData: (sessionId: string, cb: (chunk: Uint8Array) => void): Unsub =>
        world.terminalFor(sessionId).subscribe(cb),
      sendInput: (sessionId: string, data: string | Uint8Array): void => {
        world.terminalFor(sessionId).input(data);
      },
      ack: (_sessionId: string, _bytes: number): void => undefined,
      onExit: (_sessionId: string, _cb: unknown): Unsub => silent()
    },

    // ---- projects/recents extras -----------------------------------------
    recents: {
      list: async () => [],
      onChanged: silent
    },

    // ---- git (one modified file, matching the agent transcript) -----------
    git: {
      onChanged: silent,
      status: async (repoPath: string) => demoGitStatus(repoPath),
      log: async (input: { repoPath: string }) => demoGitLog(input.repoPath),
      showHead: async (input: { path: string }) => demoShowHead(input.path),
      stage: async () => undefined,
      unstage: async () => undefined,
      discard: async () => undefined,
      commit: async () => 'demo',
      checkIgnore: async () => [],
      commitDetail: async (input: { repoPath: string; sha: string }) =>
        demoCommitDetail(input.repoPath, input.sha),
      commitFileDiff: async (
        input: Parameters<typeof demoCommitFileDiff>[0]
      ) => demoCommitFileDiff(input),
      remoteUrl: async (repoPath: string) => {
        const tip = demoRepoTip(repoPath);
        return tip.repo.upstream === undefined
          ? null
          : `https://github.com/demo/${tip.repo.root.split('/').pop()}`;
      },
      branches: async (repoPath: string) => {
        const tip = demoRepoTip(repoPath);
        return [
          {
            name: tip.repo.branch,
            current: true,
            sha: tip.sha,
            shortSha: tip.shortSha,
            ...(tip.repo.upstream ? { upstream: tip.repo.upstream } : {}),
            ahead: tip.repo.ahead,
            behind: 0,
            subject: tip.subject
          }
        ];
      },
      remotes: async (repoPath: string) => {
        const tip = demoRepoTip(repoPath);
        if (tip.repo.upstream === undefined) {
          return { remotes: [], branch: tip.repo.branch, upstream: null };
        }
        const url = `https://github.com/demo/${tip.repo.root.split('/').pop()}`;
        return {
          remotes: [
            { name: 'origin', fetchUrl: url, pushUrl: url, tracked: true }
          ],
          branch: tip.repo.branch,
          upstream: tip.repo.upstream
        };
      },
      remoteBranches: async (input: { repoPath: string }) => {
        const tip = demoRepoTip(input.repoPath);
        if (tip.repo.upstream === undefined)
          return { branches: [], lastFetchedAt: null };
        return {
          branches: [
            {
              name: tip.repo.upstream,
              remote: 'origin',
              shortName: tip.repo.branch,
              sha: tip.sha,
              shortSha: tip.shortSha,
              subject: tip.subject
            }
          ],
          lastFetchedAt: Date.now() - 8 * 60_000
        };
      },
      graphLog: async (input: { repoPath: string }) => {
        const tip = demoRepoTip(input.repoPath);
        const branch = tip.repo.branch;
        const upstream = tip.repo.upstream;
        const entries = demoGitLog(input.repoPath).map((entry, i) => ({
          ...entry,
          refs:
            i === 0
              ? [
                  { kind: 'head', name: branch },
                  ...(upstream ? [{ kind: 'remote', name: upstream }] : [])
                ]
              : [],
          // Local-only commits ahead of the upstream wear the unpushed dot.
          ...(i < tip.repo.ahead ? { unpushed: true as const } : {})
        }));
        return {
          repoPath: tip.repo.root,
          scope: 'branch',
          refs: [
            `refs/heads/${branch}`,
            ...(upstream ? [`refs/remotes/${upstream}`] : [])
          ],
          entries,
          hasMore: false,
          isRepo: true,
          hasCommitGraph: true,
          divergence: {
            branch,
            upstream: upstream ?? null,
            upstreamRef: upstream ? `refs/remotes/${upstream}` : null,
            upstreamGone: false,
            ahead: tip.repo.ahead,
            behind: 0,
            headSha: tip.sha,
            upstreamSha: upstream ? tip.sha : null,
            mergeBase: upstream ? tip.sha : null,
            lastFetchedAt: upstream ? Date.now() - 8 * 60_000 : null,
            truncated: false
          }
        };
      }
    },

    // ---- fs (the fixture repo in ./repo) ----------------------------------
    fs: {
      readDir: async (dirPath: string) => demoReadDir(dirPath),
      readFile: async (path: string) => demoReadFile(path),
      reveal: async () => undefined
    },

    // ---- boot notices / durability ---------------------------------------
    notice: {
      pending: async () => []
    },

    // ---- machines (none in the demo: a single local Mac) ------------------
    machines: {
      state: async () => [],
      agents: async () => [],
      onStateChanged: silent,
      onAgentsChanged: silent,
      rows: async () => ({
        rows: [],
        errors: [],
        directory: '/Users/you/.config/tortie',
        path: '/Users/you/.config/tortie/machines.json',
        present: false
      })
    },

    // ---- agents registry --------------------------------------------------
    agentAvailability: async () => ({ claude: true, codex: true }),
    agentsList: async () => demoAgentsScan(),
    agentsRescan: async () => demoAgentsScan(),
    agentFlagPresets: async () => ({}),
    agentMultilineKeys: async () => ({
      agents: {},
      fallback: { sequence: null, verified: false }
    }),

    // ---- updates: nothing to update in a demo -----------------------------
    updates: {
      state: async () => ({
        currentVersion: 'demo',
        stagedVersion: null,
        lastCheckedAt: null,
        needsUpdateRepair: false,
        ring: 'hidden',
        ringVersion: null,
        ringPercent: null,
        failedDuring: null
      }),
      restartNow: async () => undefined,
      whyFailed: async () => null,
      repair: async () => undefined,
      onChanged: silent
    },

    // ---- drop / scroll / capture / scrollback -----------------------------
    drop: {
      strategies: async () => ({
        agents: {},
        fallback: { strategy: 'path-text', insert: 'paste', verified: false }
      })
    },
    scrollback: {
      onNotice: silent,
      stats: async () => ({
        sessions: world.sessions.filter((s) => s.status !== 'restorable')
          .length,
        lines: 41_872,
        bytes: 9_600_000,
        perLine: { bytes: 229, estimated: false },
        deepest: {
          name: 'fix flaky retry test',
          lines: 18_400,
          limit: 25_000
        },
        saved: { files: 3, bytes: 1_200_000, largestBytes: 640_000 },
        diskFreeBytes: 182_000_000_000
      })
    },

    // ---- log / diagnostics ------------------------------------------------
    log: {
      append: async (line: { level?: string } | undefined) => {
        if (line?.level !== 'error') return undefined;
        // Surface renderer error records on the demo console — this is the
        // demo's only log sink, and a silent record is an unfixable bug.
        console.error('[demo-bridge] renderer error record:', line);
        // CRASH BELT. A render crash can be CAUSED by persisted UI state
        // (the active sidebar view, a saved layout): the ErrorBoundary's
        // Reload would then restore the same state and crash again, forever.
        // Clearing the app's own keys (all 'gmux.'-prefixed) makes Reload
        // start from defaults instead of looping. Scoped by prefix because
        // the demo shares the marketing site's origin and must not touch the
        // site's storage.
        try {
          for (const key of Object.keys(localStorage)) {
            if (key.startsWith('gmux.')) localStorage.removeItem(key);
          }
        } catch {
          /* storage may be unavailable; the reload still helps */
        }
        return undefined;
      },
      level: async () => 'info',
      setLevel: async () => undefined,
      openFolder: async () => undefined,
      diagnostics: async () =>
        'Tortie demo — no diagnostics; nothing here runs on your machine.'
    },

    // ---- symbols / search / quick open ------------------------------------
    symbols: {
      onProgress: silent
    },
    quickOpen: {
      warm: async () => undefined
    },

    // ---- terminal scrollback poll (live bottom, nothing scrolled) ---------
    scroll: {
      state: async () => ({
        hasPane: true,
        position: 0,
        history: 0,
        rows: 24,
        inMode: false,
        innerAlt: false,
        innerMouse: false
      })
    },

    // ---- context view: skills, MCP, instructions (see ./context-fixture) --
    context: demoContext,
    // Per-session launch snapshot: null renders the honest "Tortie has no
    // record of what this session loaded" sentence.
    contextSnapshot: async (_sessionId: string) => null,

    // ---- context view / config rows ---------------------------------------
    config: {
      rows: async () => ({
        rows: [],
        errors: [],
        directory: '/Users/you/.config/tortie'
      })
    },

    // ---- architecture view: ABSENT on purpose -----------------------------
    // An explicit `undefined` (not a fabrication): archBridge() checks
    // `typeof api?.load === 'function'` and renders its calm no-contract
    // state when the surface is missing. The fabricated stand-in passed that
    // typeof check and then crashed the view on nonsense data. The activity
    // bar button is hidden separately in installDemoBridge below.
    arch: undefined,

    // ---- catch me up ------------------------------------------------------
    overview: {
      foldOptions: async () => ({
        harnesses: [],
        suggestedAgentId: null,
        suspended: null
      })
    },

    // ---- specstory (no capture in the demo: no binary found) --------------
    specstory: {
      onNotice: silent,
      status: async () => ({
        binary: null,
        auth: {
          signedIn: false,
          email: null,
          since: null,
          lastCloudActivity: null
        },
        captureAgents: [],
        loginUrl: 'https://cloud.specstory.com',
        authPath: '/Users/you/.specstory/auth.json',
        otherBinaries: [],
        blockedCaptureAgents: [],
        providers: []
      })
    },

    // ---- shell shim / pending opens ---------------------------------------
    takePendingOpen: async () => null,
    shellCommandStatus: async () => ({
      state: 'unavailable' as const,
      target: null,
      reason: 'The tortie shim installs from the real app, not the demo.'
    }),
    installShellCommand: async () => ({
      state: 'unavailable' as const,
      target: null,
      reason: 'The tortie shim installs from the real app, not the demo.'
    }),
    removeShellCommand: async () => ({
      state: 'unavailable' as const,
      target: null
    }),
    getLoginItem: async () => ({ openAtLogin: false }),
    setLoginItem: async (_open: boolean) => ({ openAtLogin: false }),

    // ---- window/menu wiring ----------------------------------------------
    setSessionsPosition: async () => undefined,
    setProjectsPosition: async () => undefined,
    onMenuAction: silent,
    onQuitRequested: silent,
    onActivityChanged: silent,
    onPowerResume: silent,
    noteTerminalInput: async () => undefined,
    popupMenu: (input: Parameters<typeof showDemoPopupMenu>[0]) =>
      showDemoPopupMenu(input),
    quit: async () => undefined,

    // ---- settings ---------------------------------------------------------
    settingsGet: async () => settings,
    settingsSet: async (patch: object) => {
      Object.assign(settings, patch);
      return settings;
    },
    onSettingsChanged: silent,
    // A second BrowserWindow in Electron; a popup here. Sized like the real
    // Settings window. Resolved relative to the current document so the demo
    // works at any mount path (/demos/app/… on the site, / standalone).
    openSettings: async () => {
      window.open(
        new URL('settings.html', window.location.href).toString(),
        'tortie-demo-settings',
        'width=780,height=680'
      );
    },

    // ---- meta -------------------------------------------------------------
    meta: {
      platform: 'darwin',
      versions: { electron: 'demo', chrome: 'demo', node: 'demo' }
    },
    pathForFile: () => ''
  };

  window.gmux = withSafetyNet<InstalledGmuxApi>(api);

  // The Architecture view is out of the demo (its bridge surface is absent,
  // see `arch` above), so its activity-bar button would only lead to an
  // empty-state sentence. Hide the button rather than fork the renderer.
  const style = document.createElement('style');
  style.textContent =
    'nav[aria-label="Views"] button[aria-label^="Architecture"] { display: none; }';
  document.head.appendChild(style);

  // File-name truncation: swap pierre's measurement trick for plain CSS
  // ellipsis before the tree's shadow roots exist. See ./truncation-fix.
  installTruncationFallback();
}
