# Research 45. GitHub Actions in the SCM view

**Research phase R45. Decision document. Written 2026-08-15.**

Provenance. The data path numbers were measured on 2026-08-14 and 2026-08-15 against
github.com/gregce/tortie, using the operator's own gh login, read only. No workflow was
triggered and nothing on the remote was mutated. The field survey came from direct fetches of
known pages, because the session's search budget was spent before this task started. The SCM
surface facts come from reading the Tortie source at main. The app was not launched during this
research.

## The verdict

Spawn the gh CLI, read only, from a new `src/main/actions` domain modeled on the git and search
siblings. Add a fourth SCM section named Runs. It ships collapsed, renders only for repos whose
origin is a github.com remote, and shows the latest runs for the current branch. A push arms a
bounded watch that discovers the runs for the pushed SHA and polls their jobs and steps every 5
seconds until every run for that SHA completes. Version 1 ships zero mutations and zero presence
outside the SCM view. One phase at Tier 2, with one live probe against a real push to
gregce/tortie.

## 1. The problem, and why it passes the parity guardrail

The operator pushes commits that agents wrote. After the push, the question is whether the gates
passed. Today answering it forces one of two moves:

- ask an agent in a session to check the run, or
- leave the window for the browser.

This session proved the loop directly. Every push tonight was followed by `gh run watch` in a
separate terminal.

The parity case. Agents write commits all day and the human pushes them. Whether the push passed
is a question about the agent's work, not IDE furniture. Answering it should not cost the one
window promise. That is the same shape as project wide search, which passed the guardrail because
agents rewrite repos and the human must see the result. This is not "an IDE has it". Tower and
Fork are 2 mature paid git GUIs and neither ships any CI surface, so a Runs section is not even
parity with the category.

## 2. The measured data paths

### 2.1 The machine

- gh 2.95.0 (2026-06-17) at /opt/homebrew/bin/gh, logged in to github.com as gregce.
- The token lives in the macOS login keychain as item "gh:github.com", account gregce, created
  2025-09-10. Scopes are gist, project, read:org, repo and workflow.
- `gh auth token` prints the token in 0.11 s. Tortie never needs to store a token. Any spawned gh
  inherits auth from the keychain.

### 2.2 Timings

| Call | Wall time | Payload |
|---|---|---|
| `gh run list -R gregce/tortie --limit 20 --json` (14 fields) | 0.95 s | 8,429 bytes |
| `gh run list --commit <headSha>` | 0.85 s | one matching run |
| `gh run view <id> --json jobs,...` (1 job, 11 steps) | 0.87 s | 2,351 bytes |
| `gh api repos/.../actions/runs/{id}/jobs` | 0.97 s | 2,792 bytes |
| curl GET `/actions/runs?per_page=5` | 0.33 s | 74,825 bytes |
| curl GET `/actions/runs/{id}/jobs` | 0.29 s | 4,012 bytes |
| curl repeat GET with `If-None-Match` | 0.32 s, HTTP 304 | 0 bytes |
| curl GET `/actions/jobs/{id}/logs` (completed job) | 0.21 s, HTTP 302 | redirect only |

About 0.1 s of every gh call is gh process startup. The rest is config and keyring reads plus the
network.

### 2.3 What each path gives

The gh CLI path works today with zero new auth surface. `gh run list --json` offers these fields
per run. attempt, conclusion, createdAt, databaseId, displayTitle, event, headBranch, headSha,
name, number, startedAt, status, updatedAt, url, workflowDatabaseId and workflowName. `gh run
view --json jobs` adds per job steps, and each step carries number, name, status, conclusion,
startedAt and completedAt. That is enough to draw a phase by phase view of a run. The push to run
join exists on the CLI. `gh run list --commit <sha>` returned exactly the matching run, verified
in 0.85 s.

The raw REST path is about 3 times faster per request. Its decisive property is that conditional
requests work. An ETag is a version stamp the server sends with a response. Sending it back on
the next request asks the server to reply "nothing changed" instead of resending the data. The
repeat GET with `If-None-Match` returned HTTP 304 in 0.32 s with 0 bytes, and the rate limit
counter did not move (x-ratelimit-used stayed at 6). A poller that sends ETags pays quota only
when the data changed, against a budget of 5,000 authenticated requests per hour. The raw
payloads are about 15 KB per run because they nest repository, head_commit and pull_requests
objects that gh strips. The Actions endpoints send `cache-control: private max-age=60` and no
X-Poll-Interval header.

### 2.4 gh run watch, read from source

`gh run watch` (cli/cli v2.95.0, pkg/cmd/run/watch/watch.go) polls every 3 seconds by default.
Each tick makes these calls:

- GetRun for the watched run
- GetJobs with per_page 100
- GetAnnotations for each job

It re-downloads full payloads every tick and sends no conditional requests. One watched 1 job run
costs about 2,400 to 3,600 requests per hour. A poller with ETags does strictly better on every
axis.

### 2.5 Logs

There is no public streaming log endpoint. GET `/actions/jobs/{id}/logs` for a completed job
returns a 302 to a signed Azure blob URL. The browser UI streams live logs over an internal
websocket service that is not in the REST API. gh's own source declines logs for a job that is
still running, with the message "still in progress; logs will be available when it is complete"
(view.go lines 312 to 316). A design that promises live logs promises something the API cannot
deliver.

### 2.6 Packages

@octokit/rest 22.0.1 installs 17.2 MB across 16 packages. The octokit 5.0.5 meta package installs
82.3 MB across 34 packages, of which 7.1 MB is generated .d.ts files. What they add over plain
fetch is typed endpoints, pagination helpers and retry plugins, and none of that is needed for 3
GET endpoints. Either library requires Tortie to hold the token in process memory, and the only
tokenless way to get one is to spawn `gh auth token` anyway. Spawning gh beats bundling a library
that wraps what the spawn already does.

### 2.7 Degrade behavior, measured

- Logged out, gh exits 4 with "To get started with GitHub CLI, please run: gh auth login" and
  "Alternatively, populate the GH_TOKEN environment variable".
- Absent, the spawn fails with ENOENT, which a shell reports as exit 127.

Both states are cleanly detectable, so a quiet empty state can name the exact remedy.

One measurement anomaly. The x-ratelimit-used counter read 6, then 7 after the jobs call, then 6
again on the logs redirect. The counter is eventually consistent across GitHub's edges. Treat it
as approximate and rely on the direct 304 measurement, which showed no quota cost.

## 3. The field

| Tool | CI surface | Live update | Failure surfacing | Auth |
|---|---|---|---|---|
| VS Code official extension (8.2M installs, 3 of 5 stars) | Workflows, runs, jobs, steps, logs | Live for a watched re-run; new runs need a manual refresh (issue #229, open since July 2023) | Tree row state | Editor auth session |
| GitHub Desktop 3.0 | Checks badge with jobs and steps, re-run verb | On PR checks | Badge, plus a system notification for failed required checks on your own PRs | Own OAuth |
| Tower | None | n/a | n/a | n/a |
| Fork | None | n/a | n/a | n/a |
| GitLens (52M installs) | PR readiness buckets, no run detail | n/a | n/a | Editor auth session |
| gh run watch | One run with steps | 3 s poll | Terminal rows, exit status | gh token |
| watchgha | All runs for one push event, compact steps | Poll | Terminal rows | gh token |
| gh-dash (12.3k stars) | A 3 character ci column, one icon in one of 3 colors | Poll | Icon color | gh token |
| gama (482 stars) | Workflows and runs, can trigger | Live mode, 15 s to 1 m interval | TUI rows | PAT or gh token |
| CCMenu | Menu bar icon over all watched pipelines | Poll, interval undocumented | Icon change, optional notification | Own OAuth in keychain |

What the field teaches:

- The deepest surface is the official VS Code extension, and it holds 3 of 5 stars at 8.2M
  installs. Its most persistent complaint is the refresh defect, in the user's own words from
  issue #229. "When I re-run a workflow, I see the steps progress" but "When I run a new
  workflow, I have to hit refresh to see it." Depth is wanted. Discovery of new runs is the part
  that fails.
- watchgha exists because a push can start more than one run and `gh run watch` follows one. The
  right unit to watch is the set of runs for one push.
- The minimal useful surface across the dedicated watchers is one line per run with live phase
  progress, polled every 3 to 60 seconds.
- Failure norms. Every tool shows failure as inline color at the place you look. Exactly 2 tools
  send a system notification, and both scope it to work the user personally owns. No surveyed
  tool uses a dock badge.
- Auth norms. None of the dedicated watchers implements its own OAuth. They all ride the gh CLI
  token. CCMenu is the one exception and it stores its token in the macOS keychain.

## 4. The SCM surface map

The repo already contains every pattern the phase needs.

| Need | What exists today | Where |
|---|---|---|
| A fourth section slot | SCM_SECTION_IDS = ['changes', 'history', 'branches'], a sections record, render in persisted order | src/renderer/scm/ScmSection.tsx lines 68 and 924 to 945 |
| Safe order migration | sanitizeOrder appends ids missing from a stored order, so adding 'runs' cannot break existing users | src/renderer/scm/sections.tsx lines 37 to 55 |
| Reorder and move verbs | Sections drag to reorder and get native "Move section up / down" for free | sections.tsx lines 139 to 366 |
| Lazy loading | BranchesView ships collapsed and calls ensure(repoPath) on first expand | sections.tsx lines 374 to 408, BranchesView lines 77 to 91 |
| Per repo scoping | Stores hold state as Records keyed by repoPath, so tab switches swap state without refetching | src/renderer/scm/depth.ts |
| The GitHub gate | remoteUrl() normalizes origin to https://github.com/owner/repo and returns null otherwise; the renderer caches it per repo | src/main/git/service.ts lines 942 to 951, depth.ts lines 472 to 485 |
| A gh precedent | clone.ts resolves gh with resolveBinary('gh') and runs `gh auth status`, read only, with a 3 second timeout (Phase 18.6) | src/main/projects/clone.ts lines 95 and 240 to 255 |
| Binary resolution | getUserPath() captures the login shell PATH once per boot; resolveBinary finds the absolute executable | src/main/tmux/resolve.ts lines 258 to 300 |
| Request and response IPC | The git domain, one service per repo root spawning system git, a per domain registrar | src/main/git/ipc.ts |
| A live stream sibling | The search domain spawns ripgrep, streams to a per window sink and cancels when the WebContents is destroyed | src/main/search/ipc.ts lines 32 to 78 |
| Push moment, in app | Typed GitPushResult {status, remote, branch}; main broadcasts EVT_GIT_CHANGED after a push | src/shared/types.ts lines 918 to 921, src/main/git/depth-ipc.ts lines 129 to 136 |
| Push moment, from a terminal | RepoWatcher watches .git/refs/** including refs/remotes, debounced 300 ms, arriving as EVT_GIT_CHANGED | src/main/watcher/repo-watcher.ts lines 44 to 67 |
| Native row menus | ui:popupMenu with an "Open on GitHub" precedent on commit rows | HistorySection.tsx lines 528 to 536 |
| Age copy | "last fetched 3 hours ago" prose already exists | src/renderer/scm/freshness.ts lines 38 to 62 |

One caveat the design must carry. EVT_GIT_CHANGED carries only repoPath, not what changed. An in
app push gives a typed result with the branch and remote. A terminal push gives only the coarse
event, so arming a watch on it requires reading the remote tracking ref to learn the pushed SHA.

## 5. The judged design

### 5.1 Data path

| Option | Verdict | Deciding reason |
|---|---|---|
| Spawn the gh CLI (`gh run list`, `gh run view --json`) | **Chosen** | Zero new auth surface. The token stays in the macOS keychain where gh put it and Tortie never sees it. Both degrade states are already measured. |
| Raw REST fetch with a token from `gh auth token` | Rejected for v1 | Puts the token in Tortie process memory. That is the new auth surface the boundaries name, and it buys a speed gain (0.3 s versus 0.9 s per call) that a bounded watch does not need. |
| octokit or @octokit/rest | Rejected | 17.2 to 82.3 MB of packages to call 3 GET endpoints, plus the same token in process problem. Assemble, never reimplement does not mean bundle what a spawn already does. |

The rate limit math is what makes gh affordable despite having no ETag support. The watch is
armed by a push and stops when the runs complete. It is not an always on poller. A watch tick
costs 2 requests. At a 5 second cadence, a 10 minute run costs about 240 requests. The measured
workflows run 3.5 to 10 minutes. Ten pushes in an evening cost about 2,400 requests spread across
hours, against a budget of 5,000 per hour. ETags and free 304s only matter for an unbounded
poller, which this design refuses to be. If a future version wants always on polling across many
repos, the measured lever is conditional requests with the token piped per call, and that becomes
a new judged decision.

The Phase 23 reading, stated so nobody relitigates it. gh here is a choice the compiled world
makes, exactly like git and ripgrep. Tortie's own code names the executable. No configuration row
names it, so the Settings confirm gate does not apply. The clone.ts precedent from Phase 18.6
already spawns `gh auth status` on this reasoning. Binary resolution reuses resolveBinary from
src/main/tmux/resolve.ts, in a single src/main/actions/resolve.ts, per the growth guardrails.

Every spawned gh argv must start with a read verb. A unit test asserts the allowlist of `run
list`, `run view` and `auth status`. That keeps "read only" executable rather than promised.

### 5.2 Panel anatomy

Placement.

| Option | Verdict | Deciding reason |
|---|---|---|
| A fourth SCM section (a 'runs' id in SCM_SECTION_IDS) | **Chosen** | Inherits reorder, collapse, per repo scoping and the order sanitizer for free, and the request names the SCM view. |
| A new activity rail view | Rejected | Promotes CI to a top level destination the Zen does not grant. The SCM view is where the push happened. |
| A BranchHeader badge only | Rejected | No room for jobs and steps, and steps are the operator's actual question. |

At rest, with the section expanded, the panel shows up to 10 runs for the current branch via
`gh run list --branch <branch> --limit 10 --json`. Each run row shows:

- a status icon
- the workflow name
- the display title
- the age, in the existing freshness prose
- the duration, once the run has completed

The section ships collapsed and loads nothing until first expand, following BranchesView. It
renders only when repo.remoteUrl is non null. It refreshes on three triggers:

- first expand
- EVT_GIT_CHANGED
- a refresh button in the section header

No timer runs when no watch is armed.

Expanding a run row shows its jobs and steps from `gh run view <id> --json jobs`, each step with
its name, status and duration. This is the phase by phase view the operator asked for. The
measured payload is 2,351 bytes for an 11 step run, so the rendering cost is nothing.

Row verbs, all through the native ui:popupMenu bridge:

- Open on GitHub, using the run URL, following the HistorySection precedent.
- Copy run URL.
- On a failed job or step, Open on GitHub targets the job URL instead, because there is no
  streaming log endpoint. Version 1 must not promise logs the API cannot deliver.

Mutations.

| Option | Verdict | Deciding reason |
|---|---|---|
| No mutations in v1 | **Chosen** | The sanction and the argv allowlist test cover reads only. Open on GitHub puts every mutation one click away. |
| Cancel run | Rejected | Mutates the remote, needs a confirm dialog and an error surface, and nothing tonight needed it. |
| Re-run failed jobs | Rejected for v1 | The first candidate for a judged v2, following GitHub Desktop, using the existing destructive item and ConfirmSpec patterns. |

### 5.3 Watch mechanics

- Arm on either push moment. An in app push gives the typed GitPushResult with the exact branch
  and remote. A terminal push arrives as EVT_GIT_CHANGED from the refs watcher, and the poller
  reads the remote tracking ref to get the pushed SHA.
- Discover with `gh run list --commit <sha>` every 5 seconds, up to 24 tries (120 seconds), then
  stop quietly if nothing appears. Discovery by pushed SHA fixes the exact defect that earned the
  official VS Code extension its 3 of 5 stars, and it watches the whole set of runs for the push,
  which is the watchgha lesson.
- Watch each discovered run every 5 seconds while any is incomplete. One poller per repo. A tick
  is skipped if the previous spawn, about 0.9 s, has not returned.
- Stop on any of three conditions:
  - every run for the SHA has completed
  - a 30 minute hard cap
  - the project tab closes
- The watch is disposable app state, never durable, per the architecture invariants.
- A collapsed section does not stop the watch, because the cost is bounded and the section header
  icon should be honest when the operator returns.

### 5.4 Failure surfacing, judged against the Zen text

A failed run gets exactly 2 presences, both inside the SCM view:

- a red icon on the run row
- the latest run's status icon on the Runs section header, so a collapsed section is still honest

Nothing outside the view. No dock badge. No toast. No system notification. No color on the
activity rail.

The defense comes from the text, not taste. The Zen document states that Tortie is a calm place,
that surfaces are quiet, and that human attention cannot be multiplied. The push is the human's
own act, so the question "did it pass" is one they already hold. They know where to go, and the
panel answers instantly when they arrive. The frozen rule stays absolute. A run failing is not
session behavior, so it can never set needs input. The field agrees with this reading. Every
surveyed tool shows failure as inline color at the place you look, no tool uses a dock badge, and
the only 2 tools that notify scope it to pull requests the user personally owns, a model Tortie
does not have. If a notification is ever wanted, it is a new judged decision with that ownership
scoping, not a default.

### 5.5 The degrade ladder

Every state is an inline line in the section body. No dialogs and no toasts.

| State | Detection | What the section shows |
|---|---|---|
| No GitHub remote | remoteUrl is null | The section does not render at all. |
| gh not installed | spawn ENOENT | "Runs need the GitHub CLI. Install gh to see them here." |
| gh logged out | exit 4 | "Sign in with gh auth login to see runs." |
| Rate limited | gh API error naming the limit | Keep the last rows with their fetched age. Add "GitHub is limiting requests. Runs will refresh when the limit resets." Suspend the poller until reset. |
| Offline or network failure | spawn returns a network error | Keep the last rows with their fetched age, e.g. "last fetched 3 hours ago". Add "Could not reach GitHub." Retry on the next expand, push or refresh. |

## 6. The phase shape

One phase, Tier 2. It touches no durability path, no tmux, no manifest and no restore. Two phases
would only be right if mutations or notifications shipped, and they do not.

- Files. src/main/actions/{service,ipc,resolve,parse,index}.ts beside git/ and search/, appended
  `actions:*` channels and one event in src/shared/ipc.ts, the single preload bridge extended,
  src/renderer/scm/RunsSection.tsx plus a store slice, feature detected like hasGitSync() so
  older preloads degrade.
- Unit seams. parse.ts is a pure function from gh JSON to typed rows, tested against fixtures
  captured in the measurement session. The poller is a pure state machine (arm, discover, watch,
  stop) with an injected clock and fetcher, so the 120 second give up, the 30 minute cap and the
  completion stop are tested without spawning anything. The argv allowlist test asserts every
  composed gh command is a read. Per the Phase 23 mechanical rule, a row with a missing field is
  dropped whole with a visible reason naming the field, never a crash.
- Gates. typecheck, build, test and smoke:t1. No conformance suite applies, because this touches
  neither the agent table nor resume nor context.
- The one live probe. With the app open on gregce/tortie, make a real push and watch the section
  discover the run, show steps moving, and settle at the conclusion, with one screenshot read.
  This probe doubles as the missing measurement, because mid run step visibility was never
  observed live.

## 7. What is not true

- Mid run job and step progress was not observed live. All 30 recent runs had completed during
  the measurement window and triggering one was out of bounds. gh run watch renders exclusively
  from these endpoints every 3 seconds, which is strong indirect evidence, and the Tier 2 live
  probe closes the gap.
- Whether the logs endpoint returns partial logs for a job that is still running was not tested.
  Only the completed job 302 was measured, and gh's own source treats those logs as unavailable.
- The terminal push chain (a refs/remotes move, the watcher firing, EVT_GIT_CHANGED arriving) was
  read from code, not driven in the app.
- gh's exact exit code and message on a rate limit response was not measured. The logged out and
  absent states were.
- The gh --json field set could drift across gh versions. The parser rule above is the guard.
- ETag stability across GitHub's edge caches was measured only once. It is moot for the chosen
  path and matters only if a v2 revisits raw REST.
- The x-ratelimit-used counter regressed from 7 back to 6 during measurement. This was not
  explained and is assumed to be eventual consistency at the edge.
- The bundled runtime size of octokit after tree shaking was not measured, only the install
  sizes. The auth surface argument does not depend on size.
- The field survey came from direct fetches of known URLs, because the search budget was already
  spent. Meercode's domain failed DNS and minor menu bar CI apps were not surveyed.
