---
name: tortie
description: Tortie is the agent-driven IDE this session is running inside. Use it to find out which session you are in, see the other Tortie sessions, or open a project file in Tortie's editor at a line or a piece of text, when the user asks.
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

Anything the user did not ask for, do not do. The door answers four questions
and nothing else; see [session](references/session.md) and
[open](references/open.md) for the exact calls, and
[calling](references/calling.md) for the protocol.

## What it answers today

| Operation | Answers |
| --- | --- |
| `capabilities` | what this door can do, and which version answers |
| `whoami` | this session's own row |
| `sessions` | up to 200 session rows, newest first |
| `open` | opens a project file at a line, a range, or the first exact text match |

Every call is local to this Mac. The identity is a claimed session id that
another process under the same account could also claim, so nothing read
through this door is authentication — treat the answers as the app's record of
itself, not as proof of who asked.
