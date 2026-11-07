# Using Tortie’s session door

The door is a private Unix-domain socket on this Mac, named by the
`GMUX_AGENT_SOCKET` environment variable. The caller is named by
`GMUX_SESSION_ID`. Both are already in this pane’s environment; never invent
values for them, and never pass them anywhere off this Mac.

Every call is one JSON line through `/usr/bin/nc`. JSON member order does not
matter. The session id below is the shell’s own — `$GMUX_SESSION_ID` expanded
by the shell, never typed by hand.

## capabilities

What this door answers. Fixed operation word, no other member.

```sh
printf '{"version":1,"operation":"capabilities","session":"%s"}\n' \
  "$GMUX_SESSION_ID" | /usr/bin/nc -w 2 -U "$GMUX_AGENT_SOCKET"
```

## whoami

This session’s own curated row: its name, agent, status, project, and machine.

```sh
printf '{"version":1,"operation":"whoami","session":"%s"}\n' \
  "$GMUX_SESSION_ID" | /usr/bin/nc -w 2 -U "$GMUX_AGENT_SOCKET"
```

## sessions

Up to 200 newest-first session rows with an omitted count. The same fixed
shape as `whoami`, with no other member.

```sh
printf '{"version":1,"operation":"sessions","session":"%s"}\n' \
  "$GMUX_SESSION_ID" | /usr/bin/nc -w 2 -U "$GMUX_AGENT_SOCKET"
```

## open

Ask Tortie to open a validated text file from an open local project, at a line
or at the first exact text match. The path and the search text travel Base64
encoded — encode dynamic values with `/usr/bin/base64` and substitute only
the encoded text plus the validated session id. Never interpolate a raw path
or raw search text into the JSON.

Line form (`line` and optional `endLine` are 1-based, `endLine` not before
`line`):

```sh
path_b64="$(printf '%s' '/the/project/relative/path.ts' | /usr/bin/base64)"
printf '{"version":1,"operation":"open","session":"%s","pathBase64":"%s","line":12}\n' \
  "$GMUX_SESSION_ID" "$path_b64" | /usr/bin/nc -w 2 -U "$GMUX_AGENT_SOCKET"
```

Exact-text form (case-sensitive, first of possibly several matches):

```sh
path_b64="$(printf '%s' '/the/project/relative/path.ts' | /usr/bin/base64)"
find_b64="$(printf '%s' 'the exact text' | /usr/bin/base64)"
printf '{"version":1,"operation":"open","session":"%s","pathBase64":"%s","findBase64":"%s"}\n' \
  "$GMUX_SESSION_ID" "$path_b64" "$find_b64" | /usr/bin/nc -w 2 -U "$GMUX_AGENT_SOCKET"
```

A relative path resolves only against this session’s own current project. An
absolute path is tried against each open local project in order.

## Answers

One JSON line comes back. An accepted answer carries `"ok":true` with the
operation and its value. A refusal carries `"ok":false` with a closed code:

- `disabled`: the person turned the switch off, or the socket is gone.
- `unknown-operation`: never send anything but the four words above.
- `bad-request`: the line was malformed, over 64 KiB, a second request on one
  connection, or an `open` whose locator was not exactly one of the two forms.
- `unavailable`: the caller is not a live local Tortie session, the matcher
  found nothing, or the renderer could not take the open.

`open` answers `opened` (with the project, path, and selection), `not-found`
(no match, `matches: 0`), or `refused` with one closed reason:
`no-project`, `outside-projects`, `missing`, `not-file`, `credential`,
`not-text`, `too-large`, `changed`, `line-out-of-range`, or
`renderer-unavailable`. A refusal opens nothing.
