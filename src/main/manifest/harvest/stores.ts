/**
 * What each harvesting agent's session store LOOKS LIKE — the per-agent data
 * half of Phase 13.5's single store watcher (docs/research/22-resume-audit.md
 * §3.2/§3.3). The generic watch/settle algorithm that consumes this lives
 * next door in ./watch.ts; nothing here knows how to watch anything.
 *
 * WHY THE SEAM IS HERE. Until Phase 13.5 exactly one agent had a harvester:
 * codex, hand-written as `watchForRollout`. Every other agent hit a
 * `default:` branch in buildLaunchSpec that set `idCapture: 'store-watch'`
 * and left `resumeArgv` undefined forever, because no store watcher existed.
 * `'store-watch'` read like a strategy and was a TODO with a nice name — the
 * user's live manifest (muse-1, qwen-1, pi-1, pi1 with no resume armed) is
 * what that costs after a reboot. The fix is deliberately NOT "one bespoke
 * harvester per agent": every store in the field is the same shape — a
 * directory tree, a filename or directory name that carries the id, and one
 * record inside that proves whose session it is — so adding an agent is a
 * HarvestDescriptor here, never a new watcher.
 *
 * WHAT "PROVE" MEANS, per agent (all measured; see the registry notes):
 *  - muse  — stamps the tmux pane it runs in (`$371:@371.%372`) into its own
 *            transcript at session OPEN. gmux spawned that pane, so the match
 *            is an identity, not a heuristic: it survives two muse sessions
 *            in one directory, which cwd-matching never can.
 *  - qwen  — writes `<id>.runtime.json` next to the transcript carrying
 *            `{pid, session_id, work_dir}`. The pid is NOT the pane pid: the
 *            launcher forks twice (measured 1615 -> 1622 -> 1644, and 1644 is
 *            what lands in the file), so gmux matches any DESCENDANT of the
 *            pane pid.
 *  - codex — filename uuid + line-1 `session_meta.cwd`, with a grace timer
 *            for records that cannot be classified yet (.zst, not flushed).
 *  - deepseek — WEAK by construction. Its only cwd signal is inside a file
 *            it does not write until the first turn, so two panes started
 *            together in one directory are not separable, and the UI says so
 *            instead of promising a conversation that may be the wrong one.
 *            Phase 34 probed the PROCESS as well, and it holds nothing: no
 *            open descriptor on the store, no pid file, no lock file, no id
 *            in the content that names a process or a pane. The descriptor
 *            below carries the measurements.
 *  - antigravity — the DISK is still mute (nothing in the store links a
 *            conversation id to a directory), but the PROCESS is not: the
 *            owning agy holds open descriptors inside brain/<id> and on
 *            presence/<id>.lock, and it is a descendant of its pane. Phase 32
 *            keys on that (./agy-owner.ts). The grace timer stays as the
 *            fallback for a pane whose agy died before it could confirm.
 *
 * Ownership: src/main/manifest/**. Pure Node (no Electron import).
 */

import { open, realpath } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import type { LaunchableAgentId } from '@shared/types';
import type { AgentHarvestKey } from '../../agents/registry';
// The probe stays in its own module so the race test can mock process truth
// whole; the antigravity descriptor below calls it inside confirm().
import { agyOwnedConversations } from './agy-owner';
// The shared leaves both this file and ./agy-owner.ts read. They lived here
// until Phase 42 stage 8; moving them out removed the stores <-> agy-owner
// import cycle.
import { isDescendantOf, UUID_RE } from './process-table';

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

/** What gmux knows about the pane it just spawned into. */
export interface HarvestContext {
  /**
   * The launch cwd, ALREADY resolved by the caller.
   *
   * Two things read it and both need the folder itself rather than a path
   * that leads to it: pi and qwen build their store directory out of it, and
   * the ownership rules in ./claim-strength.ts compare it as a string. On
   * macOS one folder has more than one spelling, e.g. /tmp and /private/tmp,
   * so an unresolved value gives pi and qwen a directory that does not exist
   * and gives the claim map two folders where there is one.
   *
   * `sessions/core.ts` resolves it at every call. The claim map resolves it
   * again on the way in, because a caller that forgets produces a wrong owner
   * rather than an empty listing.
   */
  cwd: string;
  /** Epoch ms captured just before spawn — nothing older can be ours. */
  sinceTs: number;
  /** `#{pane_pid}` as tmux reported it at create. */
  panePid?: number;
  /** The pane's tmux session id, e.g. "$371" (muse's exact key). */
  tmuxSessionId?: string;
}

/**
 * A conversation id, plus how strongly it was tied to this pane.
 *
 * PHASE 21 MADE THIS THE PROVENANCE RECORD. Until then the caller kept the id
 * and dropped everything else, so an exact correlation and a timing guess
 * reached the manifest as the same value. Every field below now travels into
 * `ResumeProvenance` (../agents.ts) and is persisted with the row.
 */
export interface HarvestedSessionId {
  agent: LaunchableAgentId;
  sessionId: string;
  /** Absolute path of the store record that carried it. */
  storePath: string;
  /** The descriptor root that record was found under. */
  storeRoot: string;
  key: AgentHarvestKey;
  /**
   * The DESCRIPTOR's rating of the key, before rivals are counted. It says
   * how good this agent's key is in general, not how good this answer is.
   * `deriveResumeConfidence` turns the two into the claim that gets stored.
   */
  confidence: 'exact' | 'weak';
  /**
   * TRUE when the record was accepted on the grace timer without its key ever
   * confirming (an unflushed file, a .zst rollout, antigravity's missing
   * id→cwd link). The id is probably right; it is not proven right.
   */
  viaGraceTimer: boolean;
  /**
   * How many candidates were still in play when this one was accepted, this
   * one included. Records the watcher had already ruled out are not counted.
   *
   * 1 means there was nothing to confuse the answer with. Anything above 1
   * means the winner was chosen by being the EARLIEST record at or after the
   * spawn, and for a directory keyed store that is a timing guess: two codex
   * sessions started in one folder both carry that folder, so both confirm.
   * That is the case G6 names, and it cannot be seen after the fact unless
   * this number is kept.
   *
   * It is what was known AT ACCEPTANCE. A confirmed candidate wins
   * immediately, so a rival that would have appeared a second later is not
   * counted, and this number can only understate the ambiguity.
   */
  rivals: number;
  /** Epoch ms the watcher settled on this record. */
  acceptedAt: number;
  /**
   * Phase 32. Present on a winner whose exact confirm displaced another
   * session's grace claim: the claimant that lost the id. The loser's own
   * manifest row is corrected by the reclaim handler in sessions/core.ts.
   */
  reclaimedFrom?: string;
  /**
   * Phase 32. Present on a grace acceptance: how many OTHER watches for the
   * same agent were still pending at that moment. Above 0 means the guess was
   * contested, and the claim it produced stays provisional, so a rival's
   * exact confirm can still take the id back.
   */
  contestedByWatches?: number;
  /**
   * Phase 34. Present on any acceptance where another watch of the same agent
   * was pending IN THE SAME FOLDER. It is the fact `rivals` cannot carry: a
   * neighbour whose own record had not been written yet would have confirmed
   * this one too, because the only ownership field these records hold is the
   * folder the two panes share. Above 0 makes the recorded confidence 'weak'
   * for a non identity key, however few files the directory held.
   */
  sameCwdWatches?: number;
}

export interface SessionIdWatch {
  /** Resolves with the harvested id; rejects on timeout or cancel(). */
  promise: Promise<HarvestedSessionId>;
  /** Stop watching. The promise rejects with a 'cancelled' error. */
  cancel(): void;
}

export interface HarvestOptions {
  /** Override the whole timeout (default is per-agent, see DESCRIPTORS). */
  timeoutMs?: number;
  /** Polling fallback interval at the start (default is per-agent). */
  pollIntervalMs?: number;
  /** Ceiling the poll interval backs off to. Default 10 s. */
  maxPollIntervalMs?: number;
  /** How long an unconfirmable candidate waits (default is per-agent). */
  graceMs?: number;
  /** Env override hook for tests — defaults to process.env. */
  env?: NodeJS.ProcessEnv;
  /** Home override hook for tests — defaults to os.homedir(). */
  home?: string;
  /**
   * Who this watch is harvesting FOR, normally the Tortie session id.
   *
   * It decides one thing: a conversation another session in this process has
   * already taken is not a candidate here, and the same claimant may retake
   * its own id when the watch is started again (the boot rescue). A caller
   * that omits it gets a distinct claimant of its own, so the protection is
   * on by default. See `claimedConversations` in ./watch.ts.
   */
  claimant?: string;
}

/** 'match' = proven ours; 'unknown' = cannot tell YET; 'mismatch' = not ours. */
export type HarvestVerdict = 'match' | 'mismatch' | 'unknown';

// ---------------------------------------------------------------------------
// Descriptors — one per harvesting agent, no code per agent
// ---------------------------------------------------------------------------

export interface DescriptorEnv {
  home: string;
  env: NodeJS.ProcessEnv;
}

export interface HarvestDescriptor {
  key: AgentHarvestKey;
  confidence: 'exact' | 'weak';
  /**
   * TRUE when this store is a REPAIR route, not a capture strategy: the agent
   * pre-assigns its id, so a healthy session never needs a watcher, and one
   * started at create time would find nothing (pi writes no session file
   * until the first turn). It exists for rows that have no id and never will
   * get one from the launch path — the ones the user reported, created before
   * pre-assignment shipped. `agentHarvestsId()` stays FALSE for these, so the
   * create path is untouched; only the boot rescue looks them up.
   */
  rescueOnly?: boolean;
  /** Directories to watch and scan. May not exist yet — that is fine. */
  roots(ctx: HarvestContext, de: DescriptorEnv): string[];
  /** Are candidates files or directories? */
  entry: 'file' | 'dir';
  /** Descend into this directory? Depth 0 = a direct child of a root. */
  recurse?(name: string, depth: number, path: string): boolean;
  /** Deepest directory level to walk. */
  maxDepth: number;
  /** Full path → the id it carries, or null when it is not a candidate. */
  identify(path: string): { sessionId: string; nameTs?: number } | null;
  /**
   * TRUE when a filename timestamp IS the session's start time, so a name
   * older than the spawn settles the question and the file's mtime must not
   * get a second vote. pi needs this: resuming an old conversation rewrites
   * that file's mtime, and the generic "name OR mtime is fresh enough" rule
   * would then let a months-old session look like it started with this pane —
   * and, being the earliest candidate, WIN. Off elsewhere, where a filename
   * time can lag the write or be lost to an archive move.
   */
  nameTsIsAuthoritative?: boolean;
  /** Prove the candidate is THIS pane's session. */
  confirm(path: string, ctx: HarvestContext): Promise<HarvestVerdict>;
  /** Accept an unconfirmed candidate after this long with no rival. */
  graceMs: number;
  timeoutMs: number;
  pollIntervalMs: number;
}

/**
 * rollout-YYYY-MM-DDThh-mm-ss-<uuid>.jsonl or .jsonl.zst
 * (filename layout documented in codex-rs rollout/src/list.rs).
 */
const ROLLOUT_RE =
  /^rollout-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\.jsonl(\.zst)?$/;

/**
 * qwen's project-dir encoding: every character outside [a-zA-Z0-9] becomes
 * '-'. It is CHARACTER SUBSTITUTION, not a hash (the registry used to say
 * "hashes"; the real dir names are plainly readable), and it is applied to
 * the RESOLVED cwd — a symlinked launch dir keys on its target.
 */
export function sanitizeQwenCwd(realCwd: string): string {
  return realCwd.replace(/[^a-zA-Z0-9]/g, '-');
}

/**
 * pi's project-dir encoding (registry `pi.resume.sessionStore`): the cwd
 * without its leading slash, `[/\:]` replaced by '-', wrapped in '--'.
 * `/Users/gdc/pi` → `--Users-gdc-pi--`. Unlike qwen's, it is NOT a blanket
 * non-alphanumeric substitution: dots and underscores in a path survive.
 */
export function sanitizePiCwd(cwd: string): string {
  return `--${cwd.replace(/^\//, '').replace(/[/\\:]/g, '-')}--`;
}

/**
 * pi filenames: `<ISO timestamp with : and . as ->_<uuid>.jsonl`, e.g.
 * `2026-08-10T17-11-05-496Z_019feca8-1218-74e5-9422-208fd4070739.jsonl`.
 * The timestamp is the session's START, which is what makes a rescue precise
 * rather than a guess — two pi sessions in one directory are separable by it.
 */
const PI_SESSION_FILE_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z_([0-9a-fA-F-]{36})\.jsonl$/;

/**
 * How long a harvest keeps watching. Deliberately long, and the reason is a
 * MEASUREMENT, not caution: codex and muse both open a "do you trust this
 * directory?" gate in a directory they have never seen, and neither writes
 * anything to its store until it is answered. codex 0.147.0 goes further —
 * even trusted and fully painted, it writes NO rollout and NO row in
 * state_5.sqlite until the FIRST TURN. The shipped 120 s window therefore
 * gave up on exactly the sessions this phase exists for: the ones the user
 * opened, left at a prompt, and came back to after lunch.
 *
 * Cost of watching this long is one FSEvents subscription plus a readdir that
 * backs off to once every 10 s. Cost of not watching is the conversation.
 */
const HARVEST_WINDOW_MS = 6 * 60 * 60 * 1_000;

/**
 * How far back a date-sharded store is walked. codex's `sessions/` holds
 * every session the user has ever run (nine months of day-directories here),
 * and a poll that walks all of them every few seconds is the fd-exhaustion
 * lesson from research 02 waiting to happen. Nothing older than this window
 * can belong to a spawn that just happened.
 *
 * PHASE 73 GAVE IT A SECOND READER, being the connected harvest in
 * `../../machines/remote-harvest.ts`, which walks back this far from a remote
 * row's create instant when it asks a machine for a listing. It is exported
 * rather than copied, because two 8 day windows in one product is how they come
 * to disagree.
 */
export const DATE_SHARD_WINDOW_MS = 8 * 24 * 60 * 60 * 1_000;

/**
 * Recursion filter for a `<root>/<YYYY>/<MM>/<DD>/` store: descend only into
 * shards that could contain something newer than DATE_SHARD_WINDOW_MS.
 * `path` is the candidate directory, so its parents name the coarser fields.
 */
function withinDateShardWindow(
  name: string,
  depth: number,
  path: string
): boolean {
  const cutoff = Date.now() - DATE_SHARD_WINDOW_MS;
  const n = Number(name);
  if (!Number.isFinite(n)) return false;
  if (depth === 0) {
    if (!/^\d{4}$/.test(name)) return false;
    return n >= new Date(cutoff).getFullYear();
  }
  if (depth === 1) {
    if (!/^\d{2}$/.test(name)) return false;
    const year = Number(basename(dirname(path)));
    // End of that month: the shard is live if ANY day in it is in window.
    return new Date(year, n, 1).getTime() >= cutoff;
  }
  if (depth === 2) {
    if (!/^\d{2}$/.test(name)) return false;
    const month = Number(basename(dirname(path)));
    const year = Number(basename(dirname(dirname(path))));
    return new Date(year, month - 1, n + 1).getTime() >= cutoff;
  }
  return false;
}

/** `${XDG_DATA_HOME:-~/.local/share}` — muse's store root. */
function xdgDataHome(de: DescriptorEnv): string {
  const xdg = de.env['XDG_DATA_HOME'];
  return xdg !== undefined && xdg.length > 0
    ? xdg
    : join(de.home, '.local', 'share');
}

export const DESCRIPTORS: Partial<Record<LaunchableAgentId, HarvestDescriptor>> = {
  /**
   * codex. The rollout's line 1 carries the cwd, so a record is proven to
   * belong to a FOLDER, which is not the same as proven to belong to a pane.
   *
   * THE SAME FOLDER RESIDUAL, audited in Phase 34 and not closed. Two
   * sessions of this agent started in one folder both confirm the same
   * record, because the record's only ownership field is the folder they
   * share. The winner is then the earliest record at or after the spawn,
   * which is a timing guess. Phase 34 stopped that guess from taking an
   * immovable claim: the winner holds it at 'matched', which an identity key
   * takes back. This agent has no identity key, so in practice nothing takes
   * it, and the honest gain is the number rather than the transfer. The
   * acceptance records `sameCwdWatches`, so the row says 'weak' instead of
   * 'exact'. What the other session does is wait for its OWN record, and its
   * watch times out at the end of the window when that session never takes a
   * turn and so never writes one. What is still not true is that the right
   * session gets the record. Nothing this agent writes says which pane wrote
   * it.
   */
  codex: {
    key: 'cwd-newest',
    confidence: 'exact',
    roots: (_ctx, de) => {
      const codexHome = de.env['CODEX_HOME'] ?? join(de.home, '.codex');
      return [join(codexHome, 'sessions'), join(codexHome, 'archived_sessions')];
    },
    entry: 'file',
    // sessions/YYYY/MM/DD, bounded to the recent shards, plus an
    // archived_sessions dir at any level (a rollout can be MOVED into one,
    // and the uuid lives in the filename so the move never loses it).
    recurse: (name, depth, path) =>
      name === 'archived_sessions' || withinDateShardWindow(name, depth, path),
    maxDepth: 4,
    identify: (path) => {
      const m = ROLLOUT_RE.exec(basename(path));
      if (m === null) return null;
      const [, y, mo, d, h, mi, s, uuid] = m;
      if (!y || !mo || !d || !h || !mi || !s || !uuid) return null;
      // Filename timestamps are the agent host's LOCAL time.
      const nameTs = new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(s)
      ).getTime();
      return { sessionId: uuid, nameTs };
    },
    // .zst cannot be parsed without a zstd dep; an empty file has not been
    // flushed yet. Both stay 'unknown' and ride the grace timer.
    confirm: async (path, ctx) => {
      if (path.endsWith('.zst')) return 'unknown';
      const first = await readFirstJsonLine(path);
      if (first === null) return 'unknown';
      const payload = first['payload'];
      const cwdRaw =
        payload !== null && typeof payload === 'object'
          ? (payload as Record<string, unknown>)['cwd']
          : first['cwd'];
      if (typeof cwdRaw !== 'string') return 'unknown';
      return (await samePath(cwdRaw, ctx.cwd)) ? 'match' : 'mismatch';
    },
    graceMs: 3_000,
    // MEASURED 2026-08-11 (0.147.0): codex writes NEITHER a rollout file NOR
    // a state_5.sqlite `threads` row at session open — a trusted, fully
    // painted TUI still has an empty store. Both appear on the FIRST TURN.
    // research 22 §1.1 says 'session-open'; that is wrong for this version,
    // and the 120 s window it justified is why an idle codex pane could lose
    // its resume id even though the harvester worked perfectly.
    timeoutMs: HARVEST_WINDOW_MS,
    pollIntervalMs: 1_000
  },

  qwen: {
    key: 'pid',
    confidence: 'exact',
    // ONE deterministic directory, a pure function of the cwd — no scan.
    roots: (ctx, de) => [
      join(de.home, '.qwen', 'projects', sanitizeQwenCwd(ctx.cwd), 'chats')
    ],
    entry: 'file',
    maxDepth: 0,
    identify: (path) => {
      const m = /^([0-9a-fA-F-]{36})\.runtime\.json$/.exec(basename(path));
      const id = m?.[1];
      if (id === undefined || !UUID_RE.test(id)) return null;
      return { sessionId: id };
    },
    confirm: async (path, ctx) => {
      const doc = await readJsonFile(path);
      if (doc === null) return 'unknown';
      const workDir = doc['work_dir'];
      if (typeof workDir === 'string' && !(await samePath(workDir, ctx.cwd))) {
        return 'mismatch';
      }
      const pid = doc['pid'];
      if (typeof pid !== 'number' || ctx.panePid === undefined) return 'unknown';
      // MEASURED: qwen's launcher forks twice, so the recorded pid is a
      // GRANDCHILD of the pane pid, never equal to it.
      return (await isDescendantOf(pid, ctx.panePid)) ? 'match' : 'unknown';
    },
    graceMs: 2_500,
    timeoutMs: HARVEST_WINDOW_MS,
    pollIntervalMs: 500
  },

  muse: {
    key: 'tmux-pane',
    confidence: 'exact',
    roots: (_ctx, de) => [join(xdgDataHome(de), 'muse', 'sessions')],
    entry: 'file',
    // sessions/<YYYY>/<MM>/<DD>/<sessionId>/session.jsonl — and never
    // subagent/, whose task-streams are not resumable sessions.
    recurse: (name, depth, path) => {
      if (name === 'subagent') return false;
      if (depth === 3) return UUID_RE.test(name);
      return withinDateShardWindow(name, depth, path);
    },
    maxDepth: 4,
    identify: (path) => {
      if (basename(path) !== 'session.jsonl') return null;
      const id = basename(dirname(path));
      return UUID_RE.test(id) ? { sessionId: id } : null;
    },
    confirm: async (path, ctx) => {
      const facts = await readMuseRouteFacts(path);
      if (facts === null) return 'unknown'; // not written yet
      const pane = facts['tmux_pane'];
      if (typeof pane === 'string' && ctx.tmuxSessionId !== undefined) {
        // "$371:@371.%372" — gmux gives every session exactly one pane, so
        // the session-id prefix is a complete identity.
        return pane.startsWith(`${ctx.tmuxSessionId}:`) ? 'match' : 'mismatch';
      }
      const pid = facts['pid'];
      if (typeof pid === 'number' && ctx.panePid !== undefined) {
        return (await isDescendantOf(pid, ctx.panePid)) ? 'match' : 'mismatch';
      }
      const workspace = facts['workspace_root'] ?? facts['cwd'];
      if (typeof workspace === 'string') {
        return (await samePath(workspace, ctx.cwd)) ? 'match' : 'mismatch';
      }
      return 'unknown';
    },
    graceMs: 3_000,
    timeoutMs: HARVEST_WINDOW_MS,
    pollIntervalMs: 1_000
  },

  /**
   * codewhale, still filed under the agent id `deepseek`. The key is WEAK,
   * and Phase 34 measured why it cannot be anything better. Its only ownership signal is
   * `metadata.workspace` inside a file it does not write until the first
   * turn, so two panes started in one folder both confirm the same record.
   * Everything else was probed on 2026-08-15 against 0.8.26 and is absent.
   * The process holds no descriptor on the store, which 46 lsof samples
   * across a live write showed. There is no pid file and no lock file
   * anywhere under the store root. `metadata.created_at` is the first turn
   * time and not the session open time, measured 28 seconds after the process
   * started, so it is no sharper than the file's own mtime.
   * `sessions/checkpoints/latest.json` is one global file and carries a
   * different id from the session written in the same second.
   * `snapshots/<hash>` is keyed on the workspace path, so every session in one
   * folder shares it. The CLI offers no pre-assign flag. The grace timer stays
   * at 5 seconds, and it is now the weakest rung of the claim ladder: a
   * session that can prove the record names ITS folder takes the guess back,
   * and the losing row is corrected.
   *
   * THE SAME FOLDER RESIDUAL, audited in Phase 34 and not closed. Two
   * sessions of this agent started in one folder both confirm the same
   * record, because the record's only ownership field is the folder they
   * share. The winner is then the earliest record at or after the spawn,
   * which is a timing guess. Phase 34 stopped that guess from taking an
   * immovable claim: the winner holds it at 'matched', which an identity key
   * takes back. This agent has no identity key, so in practice nothing takes
   * it, and the honest gain is the number rather than the transfer. The
   * acceptance records `sameCwdWatches`, so the row says 'weak' instead of
   * 'exact'. What the other session does is wait for its OWN record, and its
   * watch times out at the end of the window when that session never takes a
   * turn and so never writes one. What is still not true is that the right
   * session gets the record. Nothing this agent writes says which pane wrote
   * it.
   */
  deepseek: {
    key: 'cwd-newest',
    confidence: 'weak',
    // Phase 25.5: the package renamed itself to codewhale, and the successor
    // binary writes ~/.codewhale/sessions, keeping ~/.deepseek/sessions only
    // as a legacy fallback for upgraded installs. Watch both roots; the file
    // shape (<uuid>.json with metadata.workspace) is carried over.
    roots: (_ctx, de) => [
      join(de.home, '.codewhale', 'sessions'),
      join(de.home, '.deepseek', 'sessions')
    ],
    entry: 'file',
    maxDepth: 0,
    identify: (path) => {
      const m = /^([0-9a-fA-F-]{36})\.json$/.exec(basename(path));
      const id = m?.[1];
      if (id === undefined || !UUID_RE.test(id)) return null;
      return { sessionId: id };
    },
    confirm: async (path, ctx) => {
      const doc = await readJsonFile(path);
      const meta = doc?.['metadata'];
      if (meta === null || typeof meta !== 'object') return 'unknown';
      const workspace = (meta as Record<string, unknown>)['workspace'];
      if (typeof workspace !== 'string') return 'unknown';
      return (await samePath(workspace, ctx.cwd)) ? 'match' : 'mismatch';
    },
    // Flat GLOBAL store and the file only appears on the first turn, so the
    // window is long and the accept must never be a bare "newest file".
    graceMs: 5_000,
    timeoutMs: HARVEST_WINDOW_MS,
    pollIntervalMs: 2_000
  },

  /**
   * pi — REPAIR ONLY (rescueOnly). pi pre-assigns, so nothing here runs for a
   * session gmux launched after Phase 13.5a. It exists for the rows the user
   * reported: pi-1 and pi1, created 2026-08-10 with NULL agent_session_id,
   * which the boot rescue skipped because it only looked at harvesting agents
   * — so two sessions whose transcripts were sitting on disk the whole time
   * were still going to come back as bare directories.
   *
   * The correlation is strong, not a "newest file" guess: the store directory
   * is a pure function of the cwd, the FILENAME carries the session's start
   * time, and line 1 of the file is `{"type":"session",…,"cwd":"…"}`. On the
   * reported machine the two files' filename timestamps match the two
   * manifest rows' createdAt to within a second (17:11:05.496Z vs 13:11:05
   * local, 18:57:56.300Z vs 14:57:55), and the watcher's "earliest record at
   * or after spawn" rule separates them cleanly.
   *
   * THE SAME FOLDER RESIDUAL, audited in Phase 34 and not closed. Two
   * sessions of this agent started in one folder both confirm the same
   * record, because the record's only ownership field is the folder they
   * share. The winner is then the earliest record at or after the spawn,
   * which is a timing guess. Phase 34 stopped that guess from taking an
   * immovable claim: the winner holds it at 'matched', which an identity key
   * takes back. This agent has no identity key, so in practice nothing takes
   * it, and the honest gain is the number rather than the transfer. The
   * acceptance records `sameCwdWatches`, so the row says 'weak' instead of
   * 'exact'. What the other session does is wait for its OWN record, and its
   * watch times out at the end of the window when that session never takes a
   * turn and so never writes one. What is still not true is that the right
   * session gets the record. Nothing this agent writes says which pane wrote
   * it. The filename start time is the one thing that narrows it here, and a
   * rescue running long after the fact is the case where it narrows least.
   */
  pi: {
    rescueOnly: true,
    key: 'cwd-newest',
    confidence: 'exact',
    roots: (ctx, de) => {
      // Precedence per `pi --help` (registry notes): an explicit session dir
      // is FLAT — every project's sessions in one directory — so there is no
      // cwd key to append there, and confirm() does the whole job.
      const flat = de.env['PI_CODING_AGENT_SESSION_DIR'];
      if (flat !== undefined && flat.length > 0) return [flat];
      const cfg = de.env['PI_CODING_AGENT_DIR'];
      const base =
        cfg !== undefined && cfg.length > 0
          ? join(cfg, 'sessions')
          : join(de.home, '.pi', 'agent', 'sessions');
      return [join(base, sanitizePiCwd(ctx.cwd))];
    },
    entry: 'file',
    maxDepth: 0,
    nameTsIsAuthoritative: true,
    identify: (path) => {
      const m = PI_SESSION_FILE_RE.exec(basename(path));
      if (m === null) return null;
      const [, y, mo, d, h, mi, s, ms, id] = m;
      if (!y || !mo || !d || !h || !mi || !s || !ms || !id) return null;
      if (!UUID_RE.test(id)) return null;
      // The stamp is UTC (trailing Z), unlike codex's local-time filenames.
      const nameTs = Date.UTC(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(s),
        Number(ms)
      );
      return { sessionId: id, nameTs };
    },
    confirm: async (path, ctx) => {
      const first = await readFirstJsonLine(path);
      if (first === null || first['type'] !== 'session') return 'unknown';
      const cwd = first['cwd'];
      if (typeof cwd !== 'string') return 'unknown';
      return (await samePath(cwd, ctx.cwd)) ? 'match' : 'mismatch';
    },
    graceMs: 2_000,
    timeoutMs: HARVEST_WINDOW_MS,
    pollIntervalMs: 1_000
  },

  antigravity: {
    // Phase 32 (docs/research/40-antigravity-claim-race.md). The DISK still
    // links nothing: history.jsonl has a workspace and no id, and
    // conversation_summaries.db has an id and an empty workspace_uris. The
    // PROCESS does: the owning agy holds open descriptors inside brain/<id>
    // and on presence/<id>.lock, and it is a descendant of its pane. That is
    // a true identity while agy lives, so the key is 'fd-owner' and the
    // descriptor's own rating is 'exact'.
    key: 'fd-owner',
    confidence: 'exact',
    roots: (_ctx, de) => [join(de.home, '.gemini', 'antigravity-cli', 'brain')],
    entry: 'dir',
    maxDepth: 0,
    identify: (path) => {
      const id = basename(path);
      return UUID_RE.test(id) ? { sessionId: id } : null;
    },
    confirm: async (path, ctx) => {
      if (ctx.panePid === undefined) return 'unknown';
      const brainRoot = dirname(path);
      const owned = await agyOwnedConversations(brainRoot, ctx.panePid);
      // Tooling failure (ps or lsof could not run) is never a verdict in
      // either direction: the watch degrades to exactly the pre-Phase-32
      // grace-timer behavior, never below it.
      if (!owned.ok) return 'unknown';
      const id = basename(path);
      if (owned.ownedIds.has(id)) return 'match';
      // The pane's agy provably owns a DIFFERENT conversation, so this
      // candidate is not ours. An empty set is not that proof: agy may not
      // have opened its brain directory yet, or may have died.
      if (owned.ownedIds.size > 0) return 'mismatch';
      return 'unknown';
    },
    // The fallback for a pane whose agy died before it could confirm. A grace
    // acceptance is claimed PROVISIONALLY (./watch.ts), so the rightful
    // session's exact confirm can still take the id back.
    graceMs: 5_000,
    timeoutMs: HARVEST_WINDOW_MS,
    pollIntervalMs: 1_000
  }
};

/**
 * TRUE when this agent's id has to be read back out of its store — i.e. the
 * launch path cannot know it. Deliberately FALSE for a rescueOnly descriptor:
 * pi pre-assigns, and starting a watch at create time for an agent that
 * writes nothing until the first turn would only invent a 'capturing' state
 * for a session that is already armed.
 */
export function agentHarvestsId(agent: LaunchableAgentId): boolean {
  const d = DESCRIPTORS[agent];
  return d !== undefined && d.rescueOnly !== true;
}

/**
 * TRUE when a row that somehow has NO id can still have one recovered from
 * the store — every harvesting agent, plus the rescueOnly ones. Used by the
 * boot rescue, which is the only caller that ever sees such a row.
 */
export function agentRescuesId(agent: LaunchableAgentId): boolean {
  return DESCRIPTORS[agent] !== undefined;
}

/**
 * TRUE when the rescue works on a session whose PROCESS IS GONE. A store
 * keyed on cwd + start time (pi) outlives the pane, so a restorable row can
 * still be repaired — that is the whole point after a reboot. A store keyed
 * on a live process (qwen's pid, muse's pane, antigravity's open descriptors)
 * cannot be correlated once the process is dead, and one keyed on a file the
 * agent writes late (deepseek) would ride the grace timer into somebody
 * else's conversation. Those get an honest 'unavailable' instead of a guess.
 */
export function agentRescuesIdAfterExit(agent: LaunchableAgentId): boolean {
  const d = DESCRIPTORS[agent];
  return d !== undefined && d.rescueOnly === true && d.confidence === 'exact';
}

// ---------------------------------------------------------------------------
// Small readers (shared by the descriptors — never duplicated per agent)
// ---------------------------------------------------------------------------

/** Read up to 64 KiB and JSON.parse the first line. */
async function readFirstJsonLine(
  path: string
): Promise<Record<string, unknown> | null> {
  const lines = await readLeadingJsonLines(path, 1);
  return lines[0] ?? null;
}

/** Read the first `max` parseable JSON lines of a JSONL file. */
async function readLeadingJsonLines(
  path: string,
  max: number
): Promise<Record<string, unknown>[]> {
  let fh;
  try {
    fh = await open(path, 'r');
    const buf = Buffer.alloc(256 * 1024);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    if (bytesRead === 0) return [];
    const text = buf.subarray(0, bytesRead).toString('utf8');
    const out: Record<string, unknown>[] = [];
    let cut = 0;
    while (out.length < max) {
      const nl = text.indexOf('\n', cut);
      // A truncated trailing line is not parseable — stop rather than guess.
      if (nl === -1) break;
      const line = text.slice(cut, nl);
      cut = nl + 1;
      if (line.trim().length === 0) continue;
      try {
        const parsed: unknown = JSON.parse(line);
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          out.push(parsed as Record<string, unknown>);
        }
      } catch {
        break; // format drift — the caller degrades to 'unknown'
      }
    }
    return out;
  } catch {
    return [];
  } finally {
    await fh?.close().catch(() => undefined);
  }
}

async function readJsonFile(
  path: string
): Promise<Record<string, unknown> | null> {
  let fh;
  try {
    fh = await open(path, 'r');
    const buf = Buffer.alloc(256 * 1024);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    if (bytesRead === 0) return null;
    const parsed: unknown = JSON.parse(buf.subarray(0, bytesRead).toString('utf8'));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null; // still being written, or not JSON
  } finally {
    await fh?.close().catch(() => undefined);
  }
}

/**
 * muse stamps the pane into `runtime.session.route_facts`, which is line 2 of
 * session.jsonl and written at session OPEN, before any prompt.
 */
async function readMuseRouteFacts(
  path: string
): Promise<Record<string, unknown> | null> {
  const lines = await readLeadingJsonLines(path, 8);
  for (const line of lines) {
    if (line['payload_type'] !== 'runtime.session.route_facts') continue;
    const payload = line['payload'];
    if (payload === null || typeof payload !== 'object') continue;
    const record = (payload as Record<string, unknown>)['record'];
    if (record === null || typeof record !== 'object') continue;
    return record as Record<string, unknown>;
  }
  return null;
}

/**
 * Compare two paths that may differ only by symlink resolution (/tmp vs
 * /private/tmp is the everyday case on macOS and would otherwise turn every
 * scratch-dir match into a mismatch).
 */
async function samePath(a: string, b: string): Promise<boolean> {
  if (a === b) return true;
  try {
    return (await realpath(a)) === (await realpath(b));
  } catch {
    return false;
  }
}

