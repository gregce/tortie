# PR draft for gregce/tortie

**Title:** [RFC] Let agents drive Tortie through an opt-in API and AppleScript

**Head:** `JnBrymn/tortie:agent-driven-tortie`

**Base:** `gregce/tortie:main`

**Status:** Draft RFC, explicitly authorized for publication with the known issues below. Not merge-ready.

---

## A question in software form

What if an agent running in Tortie could help the person use Tortie itself?

This is an exploratory implementation of that idea, not a request to land the change as-is. I think there are interesting workflows here, and I wanted to make them concrete enough to try. If this gets Tortie closer to something useful, please use or adapt whatever helps; the particular implementation is not the point.

I had my coding agent implement this, and I have not personally audited the code. There are automated tests and some independent live verification, but I make no guarantees about the safety or correctness of the change as a whole. It is off by default, and it has known unfinished work. Please treat it as a proposal to discuss, not production-ready code.

## Goal and rationale

An agent already knows which files it changed and why. Instead of telling the user to find a file, it can open that file in Tortie and select the relevant lines, so the person can immediately see the change. The selection is in the editor; it does not rewrite the file.

The same interface lets the user ask for a cross-session overview: what sessions exist, which projects they belong to, what they are doing, which need input, and what stored summaries are available. They can also ask to open a project, start a named session, rename one, or bring a session into view.

This is especially interesting when interacting with a running agent from a phone: the conversation could become a way to open another project or start another session on the Mac, without adding a separate remote-app screen for every action. That is a motivation, not a verified end-to-end phone workflow in this change. Current project/session mutations are local to the Mac; this does not add creation of sessions on other machines.

## How to turn it on

1. Open Tortie’s **Settings** (`⌘,`).
2. Select **Agents**.
3. Turn on **Allow agents to use Tortie**.
4. Start a **new Claude Code, Pi, or omp session** in Tortie. These are the three supported skill-delivery integrations today.

New supported sessions receive Tortie’s bundled skill for that launch. An already-running agent keeps what it started with; enabling the switch does not inject a skill into it retroactively. Nothing is installed into the user’s personal or project skill directories.

Internal agents use the private local socket API supplied in their environment. They do **not** use AppleScript, GUI automation, or a Keychain-backed access seal. The switch is a plain off-by-default setting. Turning it off makes further API requests refuse. Unrelated credential storage and existing confirmations for sensitive app settings are not removed.

## Things to ask

### Orient yourself

- “What can you do with Tortie?”
- “Which Tortie session and project are you running in?”
- “List my sessions, their projects, and what they’re doing.”
- “Which sessions are waiting for my input?”
- “Show the available stored summaries for sessions in this project.”

### See the work

- “Open this project’s AGENTS.md and select lines 3–5.”
- “Show me the function you just changed, highlighted in Tortie.”
- “Open the file at the first occurrence of `calculateTotal`.”

The agent resolves an absolute path from its own session’s project. File opening is restricted to that project even when another project is visible. Selecting or focusing another project does not change the requesting agent’s identity or file scope.

### Organize and continue work

- “Rename your Tortie session to ‘API work’.”
- “Start a new Pi session named ‘Review helper’ in this project.”
- “Bring the Review helper session into view.”
- “Open `/Users/me/projects/another-repo` as a project.”
- “Focus my existing backend project.”

Opening a new project here means opening an existing local folder as a project tab, not scaffolding a repository or creating a directory. Starting a session does not send it a task; inter-session messaging is not implemented.

The ten operations are `capabilities`, `whoami`, `sessions`, `activity`, `summaries`, `open`, `open-project`, `create`, `rename`, and `focus`. Summaries are existing stored summaries, not newly generated accounts of arbitrary conversations. Session lists are bounded, and their project fields are not a complete catalog of open projects: empty project tabs are not discoverable through a dedicated projects-list operation.

## External automation: `.sdef` and AppleScript

I also added `Tortie.sdef` because, for Rook, I’m standardizing interactions with native Mac apps around scripting dictionaries and AppleScript.

The dictionary is deliberately a thin transport, not a second implementation of Tortie’s features:

- `submit request` accepts an existing API request and returns an identifier.
- `request result` retrieves its pending/completed result without repeating the action.

Apple Events and the internal socket use the same dispatcher, validation, and handlers. External AppleScript callers are subject to normal macOS Automation permissions. The transport adds no Keychain access, and internal skills must not fall back to it.

The current external interface still requires an existing local session ID as request context. It is not yet a self-contained discovery/bootstrap interface for an external client. See [the AppleScript notes](AUTOMATION-APPLE-EVENTS.md).

## Boundaries and known issues

- **No agent End/kill operation.** This was deliberately removed; ordinary GUI/phone End remains unchanged.
- **Not a security boundary against other processes under the same macOS account.** The session ID is claimed context, not authenticated identity. Off by default is not a security audit.
- **Local control only.** Reads can describe listed remote sessions, but these new actions do not create or manage remote-machine sessions.
- **Packaging needs a signing fix.** The normal package can sign main and the first-party native addon with different Team IDs, causing macOS to reject the addon. The manual demo worked only after matching signatures on a scratch copy; the packaging pipeline remains unfixed.
- **Native lifecycle is incomplete.** Installing the adapter after shutting it down stops the main loop. Today’s app installs it once and shuts it down at quit, but independent verification still returned `needs_work`.
- **External AppleScript execution is not verified end to end.** Dictionary discovery, script compilation, native self-event roundtrips, and shared-dispatch parity were checked; this is not proof that an independently launched external client works through macOS consent.
- **Live verification has gaps.** Own-project file selection passed prior two-project socket/UI checks, but the later adapter harness could not demonstrate a successful own-file open: both transports returned `renderer-unavailable`. A focus anomaly and intermittent self-event fixture failures also remain unexplained.
- **The async transport is intentionally small.** It retains at most 16 requests for about a minute; timeouts or missing results must not trigger blind retries of mutations.

## Verification so far—not a merge-readiness claim

A full suite run passed 22,507 tests, and the latest focused API/settings checks passed 118 tests plus typechecking. Live checks exercised project opening, exactly-once rename, native/socket response parity, file-scope refusals, disabled access, expired requests, shutdown, and half-open socket replies. The dictionary is discoverable in the packaged app, and the manually re-signed test copy loads the native adapter.

Nevertheless, independent re-verification returned **`needs_work`**, and the normal packaged startup revealed the signing issue above. Green tests do not supersede those findings.

## Future work

### Documentation-aware help and settings navigation

I would like Tortie’s agent to have an authoritative, maintained view of Tortie’s documentation: explain settings, navigate to the right settings section or dialog, and help the user set things up conversationally. “How do I add another remote server?” is a good example.

I held off because this experiment does not establish that documentation/help contract. This is not a claim that the repository has no documentation; the missing piece is a supported agent-facing source of truth and navigation interface. Some harmless settings might eventually be changed conversationally, while sensitive or process-starting changes should retain their existing human confirmations outside the agent turn.

### Inter-session messaging

Let an agent send a task or message to another running session. That could enable interesting handoffs and coordination, but it is a separate piece of work: targeting, permission, delivery, feedback, and failure semantics all need a deliberate design. It is not included here.

### Finish the experiment before treating it as a product interface

Fix the signing and lifecycle issues, verify real external clients such as Rook, design external bootstrap/discovery and a complete project inventory, exercise the phone-to-agent workflow, and make the broader change easier to review. Then decide which parts belong in Tortie’s supported interface.

I’m interested in whether this direction is useful—not in asking you to accept every implementation choice in this branch.
