# Opening a file in Tortie

`open` puts a file from one of the user's open projects into the Tortie editor
they are already looking at, with the cursor where you name it. This is the
useful half of "here is the file": the user does not have to copy a path out of
your answer and find it themselves.

The path and the search text travel Base64 encoded. Encode dynamic values with
`/usr/bin/base64` and substitute only the encoded text plus the validated
session id — never a raw path or raw search text inside the JSON.

## At a line

`line` and the optional `endLine` are 1-based, and `endLine` may not be before
`line`.

```sh
path_b64="$(printf '%s' '/the/project/path.ts' | /usr/bin/base64)"
{ printf '{"version":1,"operation":"open","session":"%s","pathBase64":"%s","line":12}\n' \
    "$GMUX_SESSION_ID" "$path_b64"; sleep 6; } | /usr/bin/nc -w 8 -U "$GMUX_AGENT_SOCKET"

**The `sleep` is not padding, and leaving it out is the single easiest way to
see a phantom failure.** `open` asks the editor to confirm it drove, so its
answer can take a few seconds. The system `nc` on this Mac closes the whole
connection the moment its standard input reaches end-of-file, so a plain
`printf ... | nc` hands you EOF and zero bytes before the answer is written —
indistinguishable from a refusal, and reported by agents as "no response".
Hold the pipe open for six seconds and the answer arrives. The other three
operations answer at once; this is the only one where it matters, and doing it
everywhere costs nothing.
```

## At the first exact text match

Case-sensitive, non-overlapping, first match of possibly several. No regular
expressions, no fuzzy matching, no replacement, no multi-file search.

```sh
path_b64="$(printf '%s' '/the/project/path.ts' | /usr/bin/base64)"
find_b64="$(printf '%s' 'the exact text' | /usr/bin/base64)"
{ printf '{"version":1,"operation":"open","session":"%s","pathBase64":"%s","findBase64":"%s"}\n' \
    "$GMUX_SESSION_ID" "$path_b64" "$find_b64"; sleep 6; } | /usr/bin/nc -w 8 -U "$GMUX_AGENT_SOCKET"

(Same held pipe, same reason as above.)
```

Send exactly one locator: `line` (`endLine` optional) or `findBase64`. Both at
once, or neither, is `bad-request`.

## How the path is resolved

A relative path resolves only against this session's own current project. An
absolute path is tried against each open local project in turn. A file in a
project the user does not have open cannot be opened — say so, and offer the
path instead.

## What comes back

- `opened` — with the project, path and selection that were opened.
- `not-found` — no match, with `matches: 0`. Say you could not find that exact
  text rather than guessing.
- `refused` — with one closed reason and nothing opened: `no-project`,
  `outside-projects`, `missing`, `not-file`, `credential`, `not-text`,
  `too-large`, `changed`, `line-out-of-range`, `renderer-unavailable` — or
  `session-gone`, which means the session that asked is no longer around,
  and is the honest answer when the agent replays a stale id.

A `refused` answer means the file is not something Tortie will show — a
credential file, a binary, a directory, something outside the open projects,
or something that changed under it. Report the reason plainly; do not retry
with a different spelling to get around it.
