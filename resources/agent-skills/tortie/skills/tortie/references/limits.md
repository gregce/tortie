# Limits

This skill offers four read-only or show-only questions and nothing else. If
the user asks for anything below, say it is not something this skill can do,
and do the Tortie part only through Tortie’s own UI.

- No session lifecycle: nothing here creates, restores, ends, removes,
  renames, or focuses a session, types into one, writes to a file, or sets a
  status. `open` is Tortie’s editor source view only: no diff, no Finder, no
  preview, no Settings navigation, no session navigation.
- No remote sessions: the socket answers on this Mac only, for a local pane.
  A session on another machine cannot reach it.
- No other operation words, no extra request members, no second request on one
  connection. Unknown members and extra requests are refused.
- No execution: this bundle declares no hook, no background command, no
  script to run at load, and no server. The only program it names is the
  system `/usr/bin/nc`, used after the user asks for an action.
- No installation: this bundle is passed to the agent for this launch only.
  Never copy it into a home directory, a project, a context folder, or any
  personal or project skill directory.
- Match semantics are exact: text search is case-sensitive and non-overlapping
  and selects the first match. No regular expressions, no fuzzy search, no
  replacement, no multi-file search.
- Answers are curated rows — id, name, agent, status, creation time, project,
  and machine. No launch commands, no stored conversations, no terminal bytes,
  no credential paths, no login names.
