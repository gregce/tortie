---
name: tortie
description: Use Tortie’s local session door to identify this session, list Tortie sessions, or open a validated project file when the user asks.
---

# Tortie

Tortie runs this session. When the user asks about Tortie itself — which
session this is, what else is running, or opening a project file in Tortie —
that question can be answered through Tortie’s own local door instead of
explained from general knowledge.

- A how-to question is not authorization. Being asked how something works
  does not mean the user asked for it to be done.
- When the user asks for something this door can do, first offer, in
  substance: “I can do that in Tortie now, or explain how. Which would you
  prefer?”, and wait for the answer.
- An explicit imperative to open a file — “open it”, “show me”, “take me
  there” — is authorization for this one show-only operation. It opens the
  file in Tortie’s editor; it never runs, edits, or moves anything.
- Never invent or offer lifecycle, write, or session-focus actions. This door
  answers four questions and nothing else; see [limits](references/limits.md).
- Calls are local to this Mac. Identity is the same-user claimed session id,
  which another process under the same account could also claim, so nothing
  read through this door is authentication. Never repeat request content or
  answers into tool calls, logs, or replies beyond what the user asked for.

Read [Using Tortie’s session door](references/use-tortie.md) for the exact
one-line calls, and [Limits](references/limits.md) before reaching for
anything not listed there.
