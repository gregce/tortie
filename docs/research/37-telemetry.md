# 37. Telemetry. Who downloads Tortie, and how long they use it

**Written 2026-08-12. Every price, limit and count below was fetched live on 2026-08-12 or in the
first hour of 2026-08-13 UTC.** Nothing is recalled from training. No event was sent to any
analytics service during this work, including a test event. Nothing outside this file was written.

Machine state at the time of writing: `gregce/tortie` is private, created 2026-08-12T18:58:54Z, 0
stars, 0 forks, 0 watchers. The build target in `electron-builder.yml` is dmg plus zip, arm64 only.
Runtime dependencies number 23. There is no public release yet.

---

## 1. The recommendation

> ### OPERATOR DECISION, 2026-08-12: stage 1 ships at launch
>
> The staging below is **superseded**. The operator wants downloads **and** usage measured from the
> first public release. Stage 1 is therefore not gated on the 240 install trigger in section 9. Both
> stages are built together and ship with the release.
>
> **The argument for waiting is not withdrawn, and the operator has heard it.** At 30 installs no
> value of "time in Tortie" changes what gets built next, and a 10 percent change cannot be told from
> ordinary variation below roughly 240 installs per comparison period. The numbers will not be
> decision grade for some time.
>
> **The argument the analysis undervalued, and which supports the operator.** Instrumentation cannot
> be applied retroactively. A product that ships uninstrumented can never learn anything about its
> first hundred users, because that cohort has already passed. The cost of building now is about four
> days of work. The cost of building later is those four days plus a permanent hole at the start of
> every retention curve the product will ever draw. That asymmetry is real and section 9 priced it at
> zero.
>
> **Nothing else in this document changes.** The event set in section 7 is unchanged at seven fields
> and one event per install per day. The refusals in section 7.2 stand, including the permanent
> refusal of error events. The privacy structure in section 8 stands. The consent model in section 5
> stands, being a forced choice on first run with no pre-selected answer.
>
> One consequence to carry into the build. Section 5.2 records that the participation rate for a
> first run choice is **the largest reasoned rather than verified item in this document**. Shipping at
> launch means that rate is measured against the free download denominator from day one, which is a
> better position than estimating it, and the phase should report it once there is a month of data.

**Collect nothing from inside the application at launch.** Ship the downloads measurement, which
needs no code in Tortie at all, and write down the number at which the usage question gets
reopened. The design for that later stage is specified in §6 to §8 so that it is a decision already
made, not a decision to be made again under pressure.

The deciding argument is not privacy and it is not cost. It is sample size. The operator's first
question is whether the user count is growing or shrinking, and that is a comparison between two
periods. Telling a 10 percent relative fall apart from ordinary variation, at the usual 5 percent
two-sided test with 80 percent power, needs roughly 240 installs in each period. Tortie has 1
install today and 0 stars. At 30 installs a genuine 10 percent fall is 3 people, and chance alone
moves the weekly count by 2 to 3 people. Both consent models fail at that size, so the consent
argument that the investigations spent most of their effort on does not decide anything yet.

What the operator gets for free instead is in §2. It is a growth signal, not a headcount, and it
arrives with no code, no dependency, no endpoint and no privacy cost.

| Question | Answer at launch | Cost |
|---|---|---|
| How many people downloaded it | Homebrew tap install counts plus GitHub release asset counts. Public, daily, free. | $0 |
| Is that number growing or shrinking | The same two sources, compared across 30 day windows. | $0 |
| How many installs are alive and being launched | `latest-mac.yml` download count on the newest release, divided by days since release. A trend, not a headcount. | $0 |
| How long does one person spend in Tortie | **Not answered.** Nothing measures it, and nothing will until the trigger in §9 fires. | $0 |

**What must never be collected, at any stage.** No record of what a person did inside Tortie. No
feature usage, no agent name, no panel opened, no project count, no session count, no error events,
no funnels. No field anywhere in the payload that can hold text a person typed or a path from their
disk. No identifier the person cannot see and reset. This is the operator's own narrowing from
2026-08-12, and §7 turns it from a promise into a property of the schema.

**Two defects found today that must be closed before any of this, and before release copy claims
Tortie sends nothing.** Both are verified on this machine and both are described in §3.

### 1.1 The cost, stated once

| Stage | Recurring cost | New runtime dependencies | New outbound host from Tortie |
|---|---|---|---|
| Stage 0, at launch | $0 per month | 0 | 0 |
| Stage 1, after the trigger | $0 per month up to about 3,700 installs, then $5 per month | 0 | 1, an endpoint the operator owns |
| PostHog, for comparison | $0 per month up to 1,000,000 events, then $84.30 per month at 100,000 installs | 1, `posthog-node`, 815 KB unpacked | 1, a third party |

PostHog is free at Tortie's likely scale for the next year. Cheapness is therefore not the argument
against it. The arguments are that it is a product analytics platform bought to store one number
per install per day, that it adds a dependency to a codebase whose rule is to justify every
addition, and that installing it installs the ability to answer the behavioural questions the
operator has already refused. A refusal is easier to keep when the tool cannot do the thing.

---

## 2. Downloads, which need no telemetry

The two halves of the question have different answers and must not be merged. Downloads can be
measured entirely outside the application. Usage cannot.

### 2.1 The three free sources

Each of these was checked live. The Homebrew and GitHub figures below are real numbers pulled today
from other people's projects, used to show the mechanism works.

#### GitHub release asset counts

`GET https://api.github.com/repos/{owner}/{repo}/releases/tags/{tag}` returns an `assets` array, and
every asset carries its own `download_count`. Measured against `laurent22/joplin` v3.6.15 at
00:58 UTC on 2026-08-13, unauthenticated, HTTP 200, rate limit 60 per hour.

| Asset | Bytes | `download_count` | What the number means |
|---|---|---|---|
| `Joplin-3.6.15.dmg` | 163,040,360 | 14,394 | A person deliberately downloading the app. The closest available proxy for a new install. |
| `Joplin-3.6.15-mac.zip` | 156,512,860 | 435 | An auto-update applied by an existing install. electron-updater fetches the ZIP and never the DMG. |
| `latest-mac.yml` | 488 | 40,041 | An update check. See §2.2. |
| `Joplin-3.6.15.dmg.blockmap` | 170,227 | 44 | A differential update fetch. |

The split arrives free from electron-builder's normal macOS output. New downloads and applied
updates are separate numbers with no code in the app.

Three limits, and none of them can be fixed.

- The counter counts HTTP requests, not people. A 507 byte YAML file with 72,838 downloads is not
  72,838 people, it is one updater fetching it repeatedly.
- The API returns a running total and no history. Growth requires the operator to keep their own.
  A scheduled GitHub Action on a public repo, appending one CSV row per asset per day, costs
  nothing, because Actions minutes are free and unlimited on public repositories with standard
  runners.
- A company that mirrors the DMG internally is invisible. One fetch builds the mirror, and every
  install after that is never seen.

**Precondition the operator does not meet today.** `gregce/tortie` is private. I confirmed this by
requesting the unauthenticated API, which returned 404. Release asset counts on a private repo are
not publicly readable, and `update.electronjs.org` will not serve a private repo either. Everything
in this section requires the repo to be public.

#### A Homebrew tap the operator owns

This is the strongest free source, and the useful part is not the obvious one.

Homebrew's analytics live entirely in the `brew` client. Tortie needs no code, no dependency and no
endpoint. The documented behaviour, from `docs/Analytics.md`, is that collection is opt-out,
retention is 365 days, and the payload carries no user identifier and no IP address field.

The published API is documented as covering homebrew-core and homebrew-cask. That description is
incomplete, and the difference is what makes this work for a brand new project. I fetched
`https://formulae.brew.sh/api/analytics/cask-install/30d.json` at 00:58 UTC on 2026-08-13. It
returned HTTP 200 and 810,409 bytes, for the window 2026-07-14 to 2026-08-13.

| Measured | Value |
|---|---|
| Total entries in the file | 11,416 |
| Entries whose token has the `owner/tap/cask` shape, meaning a third-party tap | 4,895 |
| Distinct third-party taps represented | 3,837 |
| Third-party entries whose 30 day count is 3 or fewer | 3,235 |

Live examples from that file: `microsoft/git/microsoft-git` at 20,363, `openclaw/tap/goplaces` at
7,132, `nikitabobko/tap/aerospace` at 6,123.

So if the operator publishes `gregce/homebrew-tortie` with a cask, then `gregce/tortie/tortie`
appears in a public JSON file with a 30, 90 and 365 day install count, refreshed daily, resolved
down to single digits. That is the growth signal directly, with three windows already computed, and
it needs nothing added to the application and nobody's approval.

Two undercounts, both of which push the number down, so the Homebrew figure is a floor.

- Analytics are opt-out, so every user with `HOMEBREW_NO_ANALYTICS=1` is missing. Homebrew
  publishes no opt-out rate, so the size of this gap is unknown.
- The only category is `cask-install`, so an upgrade most likely lands in the same bucket as an
  install. I read `analytics.rb` and confirmed the event shape, but I did not trace the cask upgrade
  path to its call site. Treat "upgrades are counted as installs" as likely and unverified.

One cost the operator should decide deliberately rather than discover. Publishing a tap makes the
install count public to everyone, including at launch when it reads 4.

Getting into homebrew-cask proper is a separate and later thing. The notability bar for a
self-submitted package is 90 forks, or 90 watchers, or 225 stars, and a repository younger than 30
days is normally not eligible at all. `gregce/tortie` was created on 2026-08-12 and has 0 stars.
Own tap now. homebrew-cask later, if the stars arrive.

#### Direct download from a website

There is no equivalent free counter, and the answer is to not create the problem.

| Option | What it gives | Verdict |
|---|---|---|
| Host the file on GitHub Releases and link to it from the site | The `download_count` already being snapshotted | **Take this.** No new infrastructure, and one number instead of two. |
| Cloudflare R2 plus a Worker serving the DMG | Full control of the count. Free tier covers a 168 MB bundle easily. | Skip. The money is zero. The attention is not, and there is one maintainer. |
| Cloudflare Web Analytics | Views of the download page, not the download itself | Optional. It answers a question nobody asked. |

### 2.2 The update check, which is the honest middle ground

The release plan in `docs/research/27-release-and-updates.md` is electron-updater 6.x publishing ZIP
plus `latest-mac.yml` to GitHub Releases. An update check under that provider is two requests. The
second one fetches `latest-mac.yml`, which is a release asset, so **every update check increments a
public counter the operator can already read.**

```
  one running install, one check
  +---------------------------------------------------------------+
  | 1. GET github.com/{owner}/{repo}/releases.atom                 |  no counter
  |    -> resolve the newest tag                                   |
  | 2. GET github.com/{owner}/{repo}/releases/download/            |  IS an asset,
  |       {tag}/latest-mac.yml                                     |  so it counts
  +---------------------------------------------------------------+
```

Because the client resolves the newest tag first, the counter on the newest release is scoped to the
window since that release shipped rather than being cumulative forever. Joplin v3.6.15 published
2026-06-20 and shows 40,041 checks in 53 days, which is 755 macOS checks per day.

**What this supports.** A trend line. Checks per day rises and falls with the population of installs
that are actually being launched, and comparing that figure across consecutive releases answers
"growing or shrinking" without a byte of telemetry.

**What this does not support.** A headcount. Converting checks per day into installs needs a
divisor, being checks per install per day, and that divisor is a guess. Under the planned schedule
an install left running all day contributes about 5 and an install opened for 20 minutes
contributes 1. A machine where Tortie is installed but never launched contributes 0 and looks
exactly like a machine with no install. Any install number derived this way must always be written
with its divisor attached.

### 2.3 The identifier electron-updater already sends, which nobody chose

This changes the shape of the later design, so it is recorded here rather than in §6.

I read `AppUpdater.ts` on master today. Line 541 sets a request header on every check:

```ts
client.setRequestHeaders(this.computeFinalHeaders({ "x-user-staging-id": stagingUserId }))
```

`getOrCreateStagingUserId()` reads or creates `<userData>/.updaterId`, generating it as
`UUID.v5(randomBytes(4096), UUID.OID)`. That is a random value. It is not derived from a hardware
serial, a MAC address, a username or a path. It exists so a staged rollout bucket stays stable for a
given install. For Tortie the file would sit at `~/Library/Application Support/Tortie/.updaterId`.

Three consequences.

1. **With GitHub as the update provider, that stable per-install identifier goes to GitHub on every
   check, from the day the updater is wired up, whether or not anyone decided to send it.** The
   operator cannot read GitHub's logs, so it produces nothing for them. It is pure cost.
2. If the update feed is ever served from an endpoint the operator owns, counting distinct
   `x-user-staging-id` values per day is daily active installs directly, with no divisor and no
   estimate.
3. That makes the later usage design smaller than it looks, because the identifier and the transport
   both already exist. It does **not** make it consent-free. See §4.

---

## 3. Two defects found today, to close before release copy makes any claim

### 3.1 Tortie already sends repository paths to PostHog, through a subprocess

The claim "Tortie phones nowhere" is true of Tortie's own code and false of the process it launches.
I verified every step of this today.

`src/main/specstory/capture.ts:85` defines `--no-usage-analytics` and passes it at line 195. That is
only the provider probe. The argv composer that wraps every captured agent launch,
`src/main/specstory/wrap.ts:177`, uses a different and frozen flag list:

```ts
const WRAP_FLAGS = ['--no-version-check', '--silent'] as const;
```

`--no-usage-analytics` is not in it. So the composed command is
`<bin> run <provider> --no-version-check --silent -c "<the whole agent argv>"`, and the SpecStory
CLI's own analytics then attach two free-text properties to every one of its 31 events. Those two
properties, read at `/Users/gdc/getspecstory/specstory-cli/pkg/analytics/`, are `project_path`, set
from `os.Getwd()`, and `cli_command`, set from `strings.Join(os.Args, " ")`.

The shipped binary is not a key-less development build. `strings` on
`/Applications/Tortie.app/Contents/Resources/bin/specstory` returns the live project key
`phc_JgbJDmdcKNX1t1K1WxME30kHNMQdmXeMdqEEcSeGvHU` alongside `eu.posthog.com`. The shared identifier
file exists on this machine, at `~/Library/Application Support/SpecStory/analytics-id.json`, written
2025-06-20.

So for any Tortie user with capture enabled, the absolute path of their repository and the agent's
full command line leave the machine, to a third party, with no prompt and no setting visible
anywhere in Tortie. That is a larger disclosure than anything proposed in this document, it exists
today, and the fix is one array literal.

**Verification tier: 3.** It is a privacy defect of the data-loss class, so the fix must be proved
by running a wrapped capture against a network sink and reading the bytes, not by reading the diff.
`src/main/specstory/__tests__/wrap.integration.test.ts` already asserts on the flag for the probe
path and can assert the same for the wrap path.

### 3.2 The updater identifier goes to GitHub by default

Described in §2.3. It is not urgent, because the value is random and GitHub already sees the IP of
every check. It is worth a written decision rather than a default, because a stable per-install
identifier sent to a third party is exactly the thing §7 is built to prevent, and it would arrive
through the back door.

---

## 4. Prior art, and the pattern that separates the quiet from the burning

Nine projects. Every reaction count below came from the GitHub API today.

| Project | What is collected | Consent | Disclosure quality | Outcome |
|---|---|---|---|---|
| **Audacity, 2021** | Proposed session and usage events, through Google Analytics and Yandex Metrica | Opt-in in the proposal, but bundled into a build users did not choose | A pull request with no prior announcement | Fatal. Verified today: 1,091 comments, 4,364 reactions of which 3,312 are thumbs-down and 582 confused. Opened 2021-05-04, closed unmerged 2021-05-09. Two forks resulted. |
| **Audacity, today** | Update check sends version and OS. Error reports are opt-in. A random UUID for counting is opt-in behind an explicit accept or decline prompt. | Mixed, with the identifier opt-in | A dedicated desktop privacy notice, updated 2025-02-01 | Quiet since |
| **Homebrew** | Command names with option values stripped, package names, CPU, OS, prefix | Opt-out, with a notice shown before the first event | docs.brew.sh/Analytics, endpoint and payload readable in `analytics.rb`, aggregates public at analytics.brew.sh | Argued about in 2016, never resolved, never fatal |
| **VS Code** | Extensive behavioural telemetry, errors, crashes | Opt-out, `telemetry.telemetryLevel` | The reference standard. See below. | Persistent low-grade criticism, plus a de-telemetried fork ecosystem |
| **Zed** | File extensions opened, features used, project file counts, crash minidumps | Opt-out | zed.dev/docs/telemetry plus a local log viewer | Almost no controversy |
| **Ghostty** | Nothing leaves the machine. Crash reports are written to disk and stay there. | Not applicable | The README says so plainly | Cited approvingly by others |
| **Obsidian** | Nothing | Not applicable | A privacy page, and third-party plugins are forbidden from client-side telemetry | The absence is a selling point |
| **Docker Desktop** | Diagnostics, crash reports and usage data | Opt-out | One row in a settings table | Low heat on telemetry itself |
| **Insomnia** | Not a telemetry story. v8.0.0 required an account and locked out local users. | Forced | None in advance | Severe backlash |

### 4.1 The pattern

Four things separate the projects that shipped telemetry quietly from the ones that ignited, and
none of them is the consent model.

1. **Payload size and shape.** No project in that table caught fire over a version string and a
   duration. Every fatal case involved behaviour, identity or a forced account. The operator's own
   narrowing has already removed the category of thing that causes fires.
2. **Whether a third party receives it.** Audacity 2021 named Google and Yandex in the diff, and
   that single fact did more damage than the events themselves.
3. **Whether the disclosure arrived before the code.** Audacity announced by pull request. Homebrew
   shows a notice before the first event is sent, and has been arguing calmly ever since.
4. **Whether a suspicious person can check the claim.** Homebrew's endpoint and write token are in
   the open. Ghostty's claim is checkable in ten seconds with a network monitor. Nobody in that
   table was praised for their telemetry, and two were praised for its absence.

### 4.2 What VS Code cannot lend Tortie

VS Code is the reference for disclosure. Every event and property carries a machine-readable
`__GDPR__` annotation, a CI job re-extracts them on every pull request, `code --telemetry` dumps the
full set as JSON, and a command shows events live as they are produced. That part is worth copying
in spirit even at Tortie's size.

The measurement mechanism is not transferable, and this is worth stating because it is the obvious
thing to assume. VS Code has no session duration event. Duration is derived on the server as
`MAX(common.timesincesessionstart) GROUP BY sessionID`, using three properties that ride along on
every behavioural event. That is free precisely because thousands of behavioural events are already
flowing. Remove the behavioural events, which the operator has, and the last event is the first
event and the derived duration is always zero. Tortie therefore has to send a duration explicitly.
That is a different design with a different failure mode.

VS Code's identifier recipe should also not be copied. `common.machineId` is a SHA-256 of the MAC
address, which survives reinstalling the app, survives deleting all application data, and is
reproducible by anyone who applies the same recipe on the same machine. `common.devDeviceId`, a
random UUID in a deletable file, gives the same counting power with none of that. Of the eighteen
properties VS Code puts on every event, four are relevant here.

---

## 5. The consent decision

**The decision at launch is that there is no consent question, because nothing is collected.** When
the trigger in §9 fires, the model is **a forced choice on first run, with no pre-selected answer**.
Not silently on with a buried setting. Not a setting the user has to discover.

### 5.1 Why opt-out is wrong here, despite being the industry norm

Opt-out is what VS Code, Homebrew, Zed and Docker Desktop all do, and the participation argument for
it is genuinely strong. Verified today from go.dev/blog/gotelemetry, the Go team wrote that after
launching an off-by-default scheme "around 100 users enabled uploading", that 100 "isn't enough to
measure the types of things we want to measure", and that after a prompt rolled out to 5 percent of
VS Code Go users "the telemetry sample has grown to around 1800 weekly participants". Their own
design document sets 16,000 participants as the statistical target. Go has millions of users. Pure
discovery-based opt-in produced about 100.

Two things override that here.

**The law.** ePrivacy Directive Article 5(3) requires prior consent for "the storing of information,
or the gaining of access to information already stored, in the terminal equipment of a subscriber or
user", with exemptions only for transmitting a communication and for storage strictly necessary to
provide a service the user explicitly requested. A UUID file written into
`~/Library/Application Support/Tortie/` is storage in terminal equipment, and analytics is not
strictly necessary to run tmux sessions, so neither exemption applies. Enforcement against a solo
LLC with 30 users is not likely. That is not the point. The point is that opt-out is presented as
the safe default because organisations with legal departments do it, and the operator does not have
one.

**The property being spent.** Today a suspicious developer can point a network monitor at Tortie and
see nothing. I re-verified the basis for that: the renderer CSP at `src/renderer/index.html:8` is
`default-src 'self'` with no `connect-src`, and the only network primitive in `src/main` is
`net.fetch` in `assets/protocol.ts:119`, called on a `file://` URL. Every other match is `git.fetch`,
a subprocess. After a silent ping, the claim moves from something checkable in ten seconds to a
written promise about bytes the user cannot read. For a tool that runs coding agents over private
source code, that verifiability is worth more than the chart.

### 5.2 Why plain opt-in also fails, and what to do instead

Honesty requires saying that opt-in has the same arithmetic problem.

At a 5 percent participation rate, the rate Go measured with a prompt, 300 installs gives 15
participants, and 15 is far below the 240 from §1. A stable participation rate does cancel out of a
week-over-week ratio, so a small sample still gives an unbiased trend estimate. It does not give a
trend estimate with usable error bars at 15.

The resolution is that the participation rate is a property of how the question is asked, not of
opt-in as a category. Go's 5 percent came from a setting users had to discover, and later from a
prompt shown inside an editor while the user was doing something else. A single screen on first
launch with two buttons and no default selected is a different instrument, and Audacity uses exactly
that shape for its counting UUID.

**I have no measured participation rate for a forced-choice first-run prompt in a developer tool.
That is the largest reasoned-not-verified item in this document.** The plan in §9 handles it by
measuring the rate rather than assuming it, which is possible because the free sources in §2 give an
independent denominator. If the Homebrew and DMG counts say 400 installs and the ping says 90
participants, the rate is 22 percent and it is known rather than guessed.

---

## 6. Vendors, and why none of them is warranted

Prices fetched 2026-08-12. Costs are monthly, at 30 events per install per month, meaning one daily
summary per install.

| Product | 1,000 installs | 10,000 installs | 100,000 installs | Free tier ends at | Reason rejected |
|---|---|---|---|---|---|
| **A Cloudflare Worker the operator owns** | **$0** | **$0** | **$5** | 100,000 requests per day | **Recommended for stage 1.** |
| PostHog | $0 | $0 | $84.30 | 1,000,000 events per month | Oversized. Adds `posthog-node`, 815 KB unpacked. Installs the ability to answer questions the operator refused. |
| TelemetryDeck | $0 | unpublished | unpublished | 50,000 signals per month | Best vendor fit, but the npm package was last published 2023-11-30 and the paid prices load from Stripe at runtime, so they cannot be read before signing up. |
| Aptabase | $10 | $20 | $75 | 20,000 events per month | **Cannot answer question 1 at all.** See below. |
| Umami Cloud | $0 | $20 | $80 | 100,000 events per month | Page-view model. Identifier resets daily. |
| Fathom | $15 | $45 | $140 | No free plan | Page-view model. |
| Plausible | $19 | $49 | $129 | No free plan | Page-view model. |
| OpenPanel | $20 | $50 | $250 | No free plan | Event-priced with page-view reporting. |
| GoatCounter | $0 | $0 | self host | "reasonable public usage", judged by one maintainer | Page-view model, and depending on one person's goodwill for a product metric is not a saving. |
| Matomo Cloud | from EUR 29 | not verified | not verified | No free plan | Page-view model, and heavy. |
| Countly | from $175 | from $175 | from $175 | Community edition only | Priced out. |

Two clarifications that change how this table reads.

**PostHog's free tier of 1,000,000 events per month was confirmed on posthog.com/pricing today, with
tiered rates starting at $0.0000500 per event.** The page as fetched does not separate anonymous from
identified rates, so the roughly five times multiplier for identified events reported elsewhere is
unconfirmed by me. It matters only if the operator's growth question later needs a retention chart,
which is a person-profile feature.

**The strict CSP is narrower than it first appears, and it is worth applying rather than citing.** It
governs renderer documents. Anything posted from the main process is unaffected. So the CSP does not
eliminate a vendor with a server-side HTTP API. What it eliminates is the documented install path of
every web analytics product in the table, all of which are a script tag. It also forces the correct
architecture, and that is a gift. The renderer is where the project tree, the session names, the
diffs and the terminal buffers live, and the renderer is the one place that cannot reach the
network. Do not weaken the CSP to accommodate anything.

### 6.1 Aptabase deserves its own line, because it is the obvious first guess

Aptabase is the one product here built for desktop applications, it is AGPL-3.0, it is maintained,
and it has an Electron SDK that posts from the main process. It should have won. It fails on the
operator's first question, and it says so itself in its own FAQ, which states that because its data
points have no unique user identifier it cannot report monthly active users or user retention. The
SDK confirms the mechanism. `_sessionId` is regenerated after an hour of inactivity and nothing is
persisted to disk, so there is no install to count.

Two further facts, either of which would be disqualifying on its own. The Electron SDK is version
0.3.1, last published 2023-11-04. It registers a custom scheme with `bypassCSP: true`, so installing
it punches a CSP-bypassing scheme into the app in order to send analytics.

---

## 7. The event set, for stage 1

One event type. It has no name field, because a name field is a string field.

```jsonc
{
  "v": 1,                                         // schema version, integer
  "install": "b2b1e6f4-3c9a-4a51-9f0e-72d1c4a8e5b7",
  "day": "2026-08-11",                            // one COMPLETE UTC day
  "app": "0.19.0",
  "os": "24.6.0",                                 // Darwin release from os.release()
  "open_s": 41103,                                // integer, 0 to 86400
  "focus_s": 6820                                 // integer, 0 to 86400, never > open_s
}
```

Seven fields, about 190 bytes.

| Field | The decision it informs |
|---|---|
| `install` | Distinguishes one install from another. Without it there is no active user count and no retention. |
| `day` | Distinct days per install gives daily, weekly and monthly actives and a return-rate curve, from one event type. |
| `app` | Without it, a fall in actives cannot be told apart from a bad release, and update adoption is unknowable. |
| `os` | The only input to the decision of when to drop support for a macOS version. |
| `open_s` | How long the app was running. §7.1. |
| `focus_s` | How long the person was actually looking at it. §7.1. |

### 7.1 What "time in the application" means, and what it excludes

This is harder for Tortie than for most applications, and one number would be dishonest. The normal
state of this product is an unfocused window with an agent working behind it, and the second most
normal state is the app left open on a sleeping laptop.

- **`open_s`** is seconds during which the Tortie process was running and the machine was awake. The
  clock stops on the `suspend` power event and restarts on `resume`.
- **`focus_s`** is seconds during which a Tortie window held operating system focus.

What both exclude, stated so the number is never read as more than it is.

- Time after the window is closed while tmux sessions keep running. That work continues and is not
  measured, by design, because measuring it would mean measuring the sessions.
- Time while the machine is asleep.
- Any notion of work done. An agent running three hours behind an unfocused window adds 10,800 to
  `open_s` and 0 to `focus_s`. Neither number says whether that was productive.

### 7.2 The cuts, recorded

| Proposed | Cut, and why |
|---|---|
| `launches`, a count of app starts that day | Cut. Distinct `day` values already answer how often a person returns, and a launch count starts describing behaviour. |
| `arch` | Cut. `electron-builder.yml` builds arm64 only, so the field is a constant. Add it back on the day an x64 build exists. |
| `sessionID` and `sequence`, from the VS Code pattern | Cut. They exist to stitch behavioural events together, and there are no behavioural events. |
| Any error or failure event | Cut, and refused permanently. §8 explains why this one is not a preference. |
| Feature usage, agent launched, panel opened, project count, session count | Refused by the operator on 2026-08-12, and refused again here. |
| Country, city or region derived from the request | Not a field, and the Worker must not read it. §8. |

---

## 8. The privacy design, stated as structure

The requirement is that project paths, repository names, branch names, file names, session names,
terminal output and agent conversation content **cannot** leave the machine, not that they are
unlikely to. Four structural properties give that, and each is checkable.

### 8.1 The renderer cannot reach the network

```
  +---------------------------------+        +----------------------------------+
  |  RENDERER                       |        |  MAIN                            |
  |                                 |        |                                  |
  |  project tree, session names,   |        |  telemetry module                |
  |  branches, diffs, terminal      |        |  can reach the network           |
  |  buffers, agent output          |        |  cannot reach any of the         |
  |                                 |        |  material on the left            |
  |  CSP: default-src 'self'        |        |                                  |
  |  no connect-src, so no host     |        |                                  |
  +---------------------------------+        +----------------------------------+
        cannot post anywhere                        nothing to post
```

Verified at `src/renderer/index.html:8`. The sensitive material lives in the process that cannot
post, and the process that can post has none of it. This property already exists and costs nothing
to keep. It only has to not be weakened.

### 8.2 The schema admits no free text

This is the part that must be right, because it is where the leak would actually happen. An import
boundary alone does not stop it. This line imports nothing, reaches no forbidden module and would
pass any reachability test:

```js
try { /* ... */ } catch (e) { post({ v: 1, error: String(e) }) }
```

`String(e)` on a Node filesystem error yields
`Error: ENOENT: no such file or directory, open '/Users/alice/work/acme-secret-repo/.git/config'`.

So the guarantee is placed at the encoder rather than at the imports. The payload type permits
exactly two string fields, and each has a fixed form: `app` matches semver, `os` matches a dotted
numeric Darwin release, `install` matches a UUID, `day` matches `YYYY-MM-DD`. Everything else is an
integer with a stated range. One committed test serialises the payload and asserts the whole body
against a single regular expression, so any new field that can hold arbitrary text fails the build.

The import boundary from the design work is still worth keeping as a second layer. It should not be
described as the guarantee.

**There are no error events. Ever.** A telemetry failure is dropped silently and never reported. That
removes the one place a path could enter the payload, and it costs nothing, because a failed ping is
not information the operator would act on.

### 8.3 The identifier

A version 4 UUID generated on first run and written to a plain file inside the Tortie application
support directory. Not derived from a MAC address, a hardware serial, a hostname, a username or a
path. The person can read it, and deleting the file resets it, which the settings screen says in
those words. It is Tortie's own file and is not shared with any other product, because a shared
identifier links usage of two products without the person agreeing to the link.

### 8.4 What the operator receives that they did not ask for, and cannot remove

Two things, and neither can be designed away, so both are disclosed rather than denied.

**The IP address, and the location that comes with it.** Verified in the Cloudflare Workers runtime
documentation today: every request into a Worker carries a `cf` object with `country`, `city`,
`region`, `postalCode`, `latitude`, `longitude`, `asn` and `asOrganization`, available on all plans,
plus a `cf-connecting-ip` header. It arrives with the request and cannot be switched off. This is the
one claim from the vendor analysis that has to be corrected. A Worker the operator owns does not mean
no third party in the path. Cloudflare is a data processor and its edge holds this whether or not the
Worker reads it.

**The arrival time.** Even with no timezone field, a ping that arrives when the app starts reveals
working hours, weekends and holidays over a few weeks.

Both are handled at the server, which is why the server needs the same discipline as the client. Three
rules, written into the Worker and covered by its own committed test.

1. The Worker never reads `request.cf` and never reads `cf-connecting-ip`.
2. The Worker records no timestamp finer than the `day` field already in the payload.
3. The Worker source lives in the public repo, so the claim is checkable rather than promised.

The design work correctly stopped the leak at the process edge. The data is richest at the server,
and the server had no boundary at all. This closes that.

### 8.5 What the user sees

- **First run.** One screen, two buttons, nothing pre-selected. It names the seven fields in plain
  words, says the count is used to know whether anyone is using Tortie, and says it can be changed
  later. It is asked once and never again, because a nag costs attention.
- **Settings.** One switch, and the install identifier shown as text with a Reset button beside it.
- **A local log.** A menu item that opens the exact bytes last sent. Homebrew and VS Code both do a
  version of this, and it is what turns a promise into something a person can check.
- **On failure.** Nothing. No badge, no toast, no retry banner.

### 8.6 What is legally required, proportionately

The operator is a solo LLC shipping to unknown users. Three things are required and the rest is not.

1. Prior consent for the identifier, under ePrivacy Article 5(3). The first-run screen is that.
2. A privacy notice reachable from the app and the site, listing the fields and naming Cloudflare as
   a processor. One page is enough.
3. A way to withdraw consent that is as easy as giving it. The settings switch is that.

Not required at this size: a data protection officer, a data protection impact assessment, a cookie
banner, or a records-of-processing register. Saying otherwise would be alarming rather than accurate.

---

## 9. The plan, with real costs and written triggers

### Stage 0, at launch. Cost $0 per month. No code in Tortie.

| Action | Effort |
|---|---|
| Make `gregce/tortie` public. Everything else depends on it. | Minutes |
| Publish `gregce/homebrew-tortie` with a cask, and accept that the count is public from day one | Under an hour |
| Add a scheduled GitHub Action that appends one CSV row per release asset per day, plus the 14 day traffic figures, to a file in the repo | An hour |
| Close the SpecStory wrap defect in §3.1, at Tier 3 | Half a day including the network-sink proof |
| Decide in writing what happens to `x-user-staging-id` when the updater lands | Minutes |
| Write the privacy page now, saying Tortie collects nothing, so the claim is on the record before there is anything to disclose | An hour |

Read the numbers no more than once a day. I measured the GitHub counter and it does not update in
real time. Four requests to a low-traffic asset over twelve minutes moved the count by 0, and an
asset that had accumulated 23,273 downloads in 29 hours stayed frozen at 23,273 across an eleven
minute window. Either the counter is batched on a long cycle or non-browser clients are filtered. I
could not separate the two explanations, and the practical rule is the same either way.

### The trigger from stage 0 to stage 1

Build the usage ping when **either** of these is true, and not before.

1. The 30 day Homebrew install count plus the newest release DMG count together exceed **240**. That
   is the number from §1 at which a weekly comparison can detect a 10 percent change.
2. A specific decision is waiting on the answer, written down at the time, of the form "I will do X
   if time in app is above N and Y if it is below". If no such sentence can be written, the number
   would not change anything and the trigger has not fired.

The second condition matters more than the first. At 30 installs there is no threshold value of
"time in Tortie" that changes what gets built next, because the backlog is driven by durability and
the agent layer. Above about 240 installs there is also a cheaper option that should be tried first,
which is emailing every user and getting answers with names attached, in one afternoon.

### Stage 1, after the trigger. Cost $0 per month up to about 3,700 installs.

| Action | Effort |
|---|---|
| A Cloudflare Worker that serves `latest-mac.yml` and records the ping in the same request, with the three rules from §8.4 and its own test | One day |
| The client module in main: the local counter, the atomic daily ledger, the encoder, the schema test | Two days |
| The first-run screen, the settings switch, the reset button and the local log viewer | One day |
| The privacy page rewritten to describe the seven fields | An hour |

Verification tier 2 for the client, because it touches no durability path and cannot lose user data.
Tier 3 for one item only, which is proving with a network sink that the bytes on the wire match the
schema exactly. That is the claim the whole design rests on, so it gets evidence rather than
assurance.

Three engineering rules that must be written into the code as comments, because each one is a real
failure that has happened to other people.

1. The request is never awaited on any path that leads to a window appearing or to the app quitting.
   A machine behind a captive portal hangs on DNS, and a flush wired into `before-quit` turns a dead
   endpoint into an app that will not quit.
2. The Worker needs an uptime check. A Worker returning 500 for a week produces a chart reading
   "actives fell to zero", and the first reading of that chart is churn rather than an outage. A
   metric with no monitoring will one day lie in the most alarming direction available.
3. Nothing is queued to disk beyond the current day's ledger. A backlog of pings is a backlog of
   data sitting on a user's machine for no benefit.

### The costs at stage 1, verified today

| Item | Free tier | What it means here |
|---|---|---|
| Workers requests | 100,000 per day | At one ping per install per day, that is 100,000 installs. At a five minute heartbeat instead, it is about 3,700 installs. This is why the design is one daily summary and not a heartbeat. |
| Workers Paid | $5 per month, 10,000,000 requests included, $0.30 per additional million | The whole cost above the free tier. |
| Workers KV | 100,000 reads and **1,000 writes** per day | The write limit is the real constraint, not the request limit. A naive one-write-per-ping design breaks at 1,000 installs. Use D1 or batch, and decide it at the time. |

---

## 10. What this does not do, and what is reasoned rather than measured

**What is not answered, at any stage.**

- Who the users are. Every design here is a count, not a list of people.
- Anything about what a person does inside Tortie. Refused, not deferred.
- Whether a person found Tortie useful. `open_s` and `focus_s` do not measure value, and a rise in
  either could mean the product got better or that it got slower.
- Whether an install exists on a machine where Tortie is never launched. That install is invisible in
  every source here except the one-time DMG download.

**Residual risks, ordered by how likely each is to actually happen.**

| Risk | Standing after this design |
|---|---|
| IP address and the location that rides with it | Not eliminated. Disclosed in §8.4 and reduced by the Worker rules, which are enforceable by a test but only as good as one person's discipline. |
| Small population deanonymisation | Real and unfixable. The seven field payload is anonymous at 100,000 installs. At 30 installs the operator knows most users personally, and an install first appearing on the day someone emailed to say they installed it is that person. This is the strongest argument for stage 0 lasting a long time. |
| A one-off build's version string naming one person | Real. A debug build sent to a single user turns `app` into an identifier. The mitigation is procedural, being do not ship one-off versioned builds. |
| Arrival time revealing a work schedule | Reduced by the day-resolution rule in §8.4, not removed, since the operator could change the Worker. |
| A future field that holds free text | Blocked by the encoder test in §8.2, which fails the build. This is the one that is structurally closed. |
| The Worker being edited at 1am | Not closed by anything technical. The Worker is public and tested, and that is all. |

**Reasoned, not verified.** Named so the next person does not inherit them as facts.

1. **The participation rate for a forced-choice first-run prompt.** No measurement exists in this
   document. Go's 5 percent is for a different instrument. Stage 1 measures it against the free
   denominator from §2 rather than assuming it.
2. **The 240 install threshold.** A standard two-proportion power calculation at a 90 percent
   baseline, 5 percent two-sided, 80 percent power, detecting a 10 percent relative change. Change
   the baseline or the effect size and the number moves. The order of magnitude is the point.
3. **Homebrew counting upgrades as installs.** Likely, from the shape of the event in `analytics.rb`.
   The cask upgrade call site was not traced.
4. **Why the GitHub download counter did not move during an eleven minute observation.** Two
   explanations fit and neither was ruled out.
5. **PostHog's identified-event rate.** The pricing page as fetched today does not separate it from
   the anonymous rate. The five times multiplier reported elsewhere is not confirmed here.

**What is not currently true, and must be fixed before any release copy claims it.** Tortie's own
code phones nowhere. A subprocess Tortie launches sends the user's repository path and the agent's
full command line to PostHog on every captured session. Until §3.1 is closed, the sentence "Tortie
sends nothing" is false.

---

## 11. A position for the Zen of Tortie

Written to sit after "Protect human attention" and before "What Tortie is not". `ZEN-OF-TORTIE.md`
never mentions telemetry, so this is derived from four things it does say. "Not a dashboard. No
counters, no activity feeds, no progress theatre" is aimed at the user's screen, and it applies with
the same force to the maker's screen. "Protect human attention" means asking once and never again.
"Not clever where it could be dull" means no SDK and no framework. "Sessions belong to the work, not
to the application displaying them" draws the line between measuring the container and measuring the
contents.

> ## What leaves the machine
>
> Tortie holds the work. The work does not leave.
>
> Tortie may know that an installation exists, which version it is, and how long
> it was open. It may not know what was in it. Project paths, repository names,
> branch names, file names, session names, terminal output and agent
> conversations stay on the machine. The way they stay is not care. It is that no
> code able to read them is able to reach the network.
>
> A number is collected only when a decision is waiting on it. Until then the
> honest count is zero, and a product that measures nothing is easier to trust
> than one that promises to measure only a little.
>
> Measurement is machinery, so it obeys the same rule as the rest of the
> machinery. It is off until the person turns it on. It is asked about once. It
> can be read in full by the person it describes. It is never a reason for the
> app to be slower, later or less durable.
>
> The refusals: no record of what a person did inside Tortie, no field anywhere
> that can hold text a person typed, no identifier a person cannot see and reset,
> and no third party in the path who was not named to them.
