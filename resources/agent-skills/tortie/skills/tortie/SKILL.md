---
name: tortie
description: Tortie is the agent-driven IDE this session is running inside. Use it to find out which session you are in, see the other Tortie sessions and what they are doing, or open a project file in Tortie's editor at a line or a piece of text, when the user asks.
---

# Tortie

Tortie is the IDE the user is running you in. It is not part of this codebase
and it is not a library you can read: it is a Mac app holding many agent
sessions across many projects, and it is the window in front of the user right
now. This session is one of those sessions.

That makes Tortie the only source for a few kinds of answer:

- **Who am I?** Tortie knows this session's own name, agent, project, status
  and machine. You cannot work that out from inside the repository.
- **What else is running?** Tortie holds the whole session list — across
  projects — with each one's state. Your shell sees only your own process.
- **Put something in front of the user.** You can print a path; Tortie can
  open the file in the editor the user is already looking at, at the exact
  line or the exact text you name.

## When to reach for it

Use it when the user's question is about Tortie itself or about their
workspace as a whole:

- "Which session are you in?" / "What's this session called?"
- "What else is running?" / "What are my other sessions doing?"
- "Open that file" / "Show me `src/foo.ts` line 40" / "Take me to where
  `handleSave` is."
- "Where am I?" when the agent needs its own project or status to answer.

Do **not** use it for things your own tools already do well: reading and
writing files, running commands, searching the codebase, git, or anything
about a single file's contents. Tortie is for Tortie's knowledge and Tortie's
window, not a second way to touch the repository.

## Ask before you act

A question about how something works is not a request to do it. When the user
asks how to do something this door can do, offer first — in substance, "I can
do that in Tortie now, or explain how. Which would you prefer?" — and wait for
the answer.

An explicit imperative to open something — "open it", "show me", "take me
there" — is authorization for that one show-only operation. It opens a file in
Tortie's editor; it never edits, runs or moves anything.

Anything the user did not ask for, do not do.

## How to call it

The door is a private Unix-domain socket on this Mac, named by the
`GMUX_AGENT_SOCKET` environment variable; the caller is named by
`GMUX_SESSION_ID`. Both are already in this pane's environment. Never invent
values for them, and never pass them anywhere off this Mac.

Every call is one JSON line through `/usr/bin/nc`, and every answer is one
JSON line:

```sh
printf '{"version":1,"operation":"whoami","session":"%s"}\n' \
  "$GMUX_SESSION_ID" | /usr/bin/nc -w 8 -U "$GMUX_AGENT_SOCKET"
```

Dynamic values travel Base64: encode with `/usr/bin/base64` and substitute
only the encoded text. Never put a raw path or raw search text inside the
JSON.

`ok: true` carries the answer. `ok: false` carries an `error.code` from a
closed set:

- `disabled` — the person has not turned agent access on in Settings then
  Agents. Say how; do not retry around it.
- `unknown-operation` — not one of the operations below. Check the spelling.
- `bad-request` — the line was malformed, over 64 KiB, or had a second request
  on one connection.
- `unavailable` — Tortie cannot answer this right now.

**One timing rule, and it is the easiest way to fake a failure.** `open` asks
the editor to confirm it drove, so its answer can take a few seconds, and the
system `nc` closes the connection the moment its own stdin ends. For `open`,
hold the pipe open:

```sh
{ printf '…'; sleep 6; } | /usr/bin/nc -w 8 -U "$GMUX_AGENT_SOCKET"
```

Without the held pipe you get zero bytes and an immediate close — which looks
exactly like a refusal, and is not one. The other operations answer at once.

## What it answers today

| Operation | Answers | Read |
| --- | --- | --- |
| `capabilities` | what this door can do, and which version answers | — |
| `whoami` | this session's own row | [sessions](references/sessions.md) |
| `sessions` | up to 200 session rows, newest first | [sessions](references/sessions.md) |
| `open` | opens a project file at a line, a range, or the first exact text match | [editor](references/editor.md) |

Every call is local to this Mac. The identity is a claimed session id that
another process under the same account could also claim, so nothing read
through this door is authentication — treat the answers as the app's record of
itself, not as proof of who asked.
