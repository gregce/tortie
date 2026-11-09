# Sessions and projects

Use Tortie's recorded workspace state to find sessions, inspect their activity
and existing summaries, open projects, and manage named sessions. The common
request format and timeout rules are in `SKILL.md`.

## Identity and discovery

`whoami` returns this session's `id`, `name`, `agent`, `status`, lifecycle
`phase`, `createdAt`, `project` (`id`, `name`, `path`, or null), and `machine`.

```sh
printf '{"version":1,"operation":"whoami","session":"%s"}\n' \
  "$GMUX_SESSION_ID" | /usr/bin/nc -w 20 -U "$GMUX_AGENT_SOCKET"
```

`sessions` returns up to 200 rows, newest first, plus `omitted`. Finished and
restorable sessions can still appear: `restorable` means not currently running,
not idle. `needs_input` means waiting for the person.

```sh
printf '{"version":1,"operation":"sessions","session":"%s"}\n' \
  "$GMUX_SESSION_ID" | /usr/bin/nc -w 20 -U "$GMUX_AGENT_SOCKET"
```

`sessions`, `activity`, and `summaries` accept `"project":"<project-id>"`.
Use a returned `project.id`, not its name or path. Filtering happens before
capping results; an unknown project returns an empty list.

## Activity and existing summaries

`activity` returns counts of `working`, `idle`, `waiting`, and `finished`;
a `waiting` list; and up to 50 session rows with a `doing` word. The word
`other` means the app cannot classify the state, not that work has finished.

```sh
printf '{"version":1,"operation":"activity","session":"%s"}\n' \
  "$GMUX_SESSION_ID" | /usr/bin/nc -w 20 -U "$GMUX_AGENT_SOCKET"
```

`summaries` reads sentences Tortie has **already stored**, never the conversation
and never a model turn of its own. Model-written summaries are
optional: a session may have none. This is how to inspect topics without
rereading transcripts.

```sh
printf '{"version":1,"operation":"summaries","session":"%s"}\n' \
  "$GMUX_SESSION_ID" | /usr/bin/nc -w 20 -U "$GMUX_AGENT_SOCKET"
```

Optionally add `"sessions":["<session-id>","<another-id>"]` (up to 50).
The response has `summaries` and `omitted`. Join summary rows to `sessions`
by `sessionId`, not name. Each row is either:

- `state:"kept"`: `text` (at most 400 characters), `fromTurn`, `toTurn`,
  `writtenAt`, and `staleTurns`. Zero stale turns means current; otherwise
  describe the sentence as older than the latest recorded turns.
- `state:"none"`: no usable stored sentence. Say so rather than inventing
  a topic or automatically reading the transcript. A newer rejected sentence
  is not replaced with an older accepted one.

## Open projects

To open an absolute local folder as a new project tab, encode its path and
send `pathBase64`. To select an already-open tab, send its `project` id.
Use exactly one of those fields.

```sh
path_b64="$(printf '%s' '/absolute/project/folder' | /usr/bin/base64)"
printf '{"version":1,"operation":"open-project","session":"%s","pathBase64":"%s"}\n' \
  "$GMUX_SESSION_ID" "$path_b64" | /usr/bin/nc -w 20 -U "$GMUX_AGENT_SOCKET"
```

The reply is `state:"opened"` with the project row. Reopening a folder uses
Tortie's normal folder identity rather than deliberately creating a duplicate.
For bringing Tortie itself forward, use `focus`.

## Create and rename sessions

`create` requires an open `project` id and `name`; optional `agent` is a
launchable agent id. Without `agent`, Tortie's default is used. Normal launch
and capture defaults apply. Arbitrary launch flags and environment values are
not part of this request. `created` includes the new session row.

```sh
printf '{"version":1,"operation":"create","session":"%s","project":"%s","name":"Build helper","agent":"pi"}\n' \
  "$GMUX_SESSION_ID" "$PROJECT_ID" | /usr/bin/nc -w 20 -U "$GMUX_AGENT_SOCKET"
```

`rename` requires `target` (the exact session id) and `name`. It is reversible
and does not ask for another confirmation. `renamed` includes the updated row.

```sh
printf '{"version":1,"operation":"rename","session":"%s","target":"%s","name":"Review helper"}\n' \
  "$GMUX_SESSION_ID" "$TARGET_SESSION_ID" | /usr/bin/nc -w 20 -U "$GMUX_AGENT_SOCKET"
```

The names above are fixed examples. For user-supplied names, build the JSON
with `JSON.stringify` (for example in Node) so quotes and backslashes remain
part of the name, rather than interpolating raw text into a JSON template.

## Focus a project or session

`focus` takes `project` and optionally `target` (a session within that project).
It brings Tortie forward and selects the requested project/session. With no
`target`, it only changes the project. A session from a different project is
refused rather than silently selecting something else.

```sh
printf '{"version":1,"operation":"focus","session":"%s","project":"%s","target":"%s"}\n' \
  "$GMUX_SESSION_ID" "$PROJECT_ID" "$TARGET_SESSION_ID" | /usr/bin/nc -w 20 -U "$GMUX_AGENT_SOCKET"
```

## Action refusals

Actions return `state:"refused"` with a reason such as `project-missing`,
`session-missing`, `session-not-in-project`, `gone`, `agent-unknown`,
`agent-not-launchable`, `empty`, `long`, `character`, `not-confirmed`, or
`failed`. Report the returned reason; do not infer one from an empty reply.
