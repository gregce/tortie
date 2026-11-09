---
name: tortie
description: Tortie is the agent-driven IDE this session is running inside. Use it to find out which session you are in, see what the other Tortie sessions are doing, or open a project, start or rename a session, or put the user in front of a session. Use it only when the user asks.
---

# Tortie

Tortie is the IDE the user is running you in. It is not part of this codebase
and it is not a library you can read: it is a Mac app holding many agent
sessions across many projects, and it is the window in front of the user right
now. This session is one of those sessions.

That makes Tortie the only source for a few kinds of answer:

- **Who am I?** Tortie knows this session's own name, agent, project, status
  and machine. You cannot work that out from inside the repository.
- **What is everything else doing?** Tortie holds the whole session list —
  across projects — with each one's state, each blocked one's waiting, and the
  one-line summary it already wrote. Your shell sees only your own process.
- **Put something in front of the user.** You can print a path; Tortie can
  open a project, start a named session, or put the user in front of one.
  Tortie can also open a file in the editor the user is already looking at,
  at the exact line or the exact text you name.

## When to reach for it

Use it when the user's question is about Tortie itself or about their
workspace as a whole:

- "Which session are you in?" / "What's this session called?"
- "What are my other sessions doing?" / "Who is waiting on me?" / "What did
  that session accomplish so far?"
- "Open that file" / "Show me `src/foo.ts` line 40" / "Take me to where
  `handleSave` is."
- "Open the project" / "Start a session called X" / "Rename this session to
  Y" / "Take me to that session".
- "Where am I?" when the agent needs its own project or status to answer.

Do **not** use it for things your own tools already do well: reading and
writing files, running commands, searching the codebase, git, or anything
about a single file's contents. Tortie is for Tortie's knowledge and Tortie's
window, not a second way to touch the repository.

## Ask before you act

A question about how something works is not a request to do it. When the user
asks how to do something Tortie supports, offer first — in substance, "I can
do that in Tortie now, or explain how. Which would you prefer?" — and wait for
the answer.

An explicit imperative to open something — "open it", "show me", "take me
there" — is authorization for that one show-only operation. It opens a file in
Tortie's editor; it never edits, runs or moves anything.

Starting a session, renaming one, or putting the user in front of one needs an
explicit imperative naming what to do. There is no operation that ends a
session.

Anything the user did not ask for, do not do.

## How to call it

Tortie's API uses a private Unix-domain socket on this Mac, named by the
`GMUX_AGENT_SOCKET` environment variable; the caller is named by
`GMUX_SESSION_ID`. Both are already in this pane's environment. Never invent
values for them, and never pass them anywhere off this Mac.

Internal agents must use this socket, not AppleScript, JXA, the `.sdef`, or
GUI automation. This API needs no Automation or Keychain permission. If the
socket is unavailable, report that; do not switch transports or ask the user
to unlock the Keychain. AppleScript is a separate interface for external callers.

Every call is one JSON line through `/usr/bin/nc`, and every answer is one
JSON line:

```sh
printf '{"version":1,"operation":"whoami","session":"%s"}\n' \
  "$GMUX_SESSION_ID" | /usr/bin/nc -w 20 -U "$GMUX_AGENT_SOCKET"
```

Dynamic values travel Base64: encode with `/usr/bin/base64` and substitute
only the encoded text. Never put a raw path or raw search text inside the
JSON.

For an acting operation the answer carries a `state` — `opened`, `created`,
`renamed` or `focused` — or `refused` with one closed reason.

`ok: true` carries the answer. `ok: false` carries an `error.code` from a
closed set:

- `disabled` — the person has not turned agent access on in Settings then
  Agents. Say how; do not retry around it.
- `unknown-operation` — not one of the operations below. Check the spelling.
- `bad-request` — the line was malformed, over 64 KiB, or had a second request
  on one connection.
- `unavailable` — Tortie cannot answer this right now.

**Timing and retries.** Use `nc -w 20` for ordinary requests; the app's
request deadline is 15 seconds. An empty reply
or a timeout means the outcome is **unknown**, not refused. Re-read the
session/project list before deciding what happened. Never automatically
repeat a create, rename, focus, or open-project request: the first one
may already have acted. Read-only requests may be retried once. No `sleep`
is needed.

## What it answers today

| Operation | Answers | Read |
| --- | --- | --- |
| `capabilities` | which operations this running app supports, and its version | — |
| `whoami` | this session's own row | [sessions](references/sessions.md) |
| `sessions` | up to 200 session rows, newest first | [sessions](references/sessions.md) |
| `activity` | what every session is doing, blocked ones first | [sessions](references/sessions.md) |
| `summaries` | Tortie's own one-line summary per session, or the honest `none` | [sessions](references/sessions.md) |
| `open` | opens a project file at a line, a range, or the first exact text match | [editor](references/editor.md) |
| `open-project` | opens a folder path as a NEW project tab, or puts an existing project's tab in front | [sessions](references/sessions.md) |
| `create` | starts a NAMED session with a launchable agent, through Tortie's own start | [sessions](references/sessions.md) |
| `rename` | renames a session by id, with no confirmation because a name is reversible | [sessions](references/sessions.md) |
| `focus` | puts a project, and optionally one of its sessions, in front of the user | [sessions](references/sessions.md) |

Every call is local to this Mac. The identity is a claimed session id that
another process under the same account could also claim, so nothing through
this API is authentication — treat the answers as the app's record of itself,
not as proof of who asked.

## Opening a file: absolute path inside your own project

`open` needs an ABSOLUTE path, built from `whoami.project.path` (your own
session's project), never from a visible tab or your cwd guess. The file must
be inside that project; a path in any other project is refused
(`outside-projects`), even if that project is open. Focusing another tab does
not change which project your session belongs to. If the user names a file in
another project, say so and ask them to use that project's session.
