# Calling Tortie's session door

The door is a private Unix-domain socket on this Mac, named by the
`GMUX_AGENT_SOCKET` environment variable. The caller is named by
`GMUX_SESSION_ID`. Both are already in this pane's environment; never invent
values for them, and never pass them anywhere off this Mac.

Every call is one JSON line through `/usr/bin/nc`:

```sh
printf '{"version":1,"operation":"<op>","session":"%s"}\n' \
  "$GMUX_SESSION_ID" | /usr/bin/nc -w 2 -U "$GMUX_AGENT_SOCKET"
```

Answers are one JSON line. `ok: true` carries the answer; `ok: false` carries
an `error.code` and a sentence. The closed codes:

- `disabled` — the person has not turned agent access on in Settings then
  Agents. Say how to turn it on; do not retry around it.
- `unknown-operation` — the operation is not one of the four. Check the
  spelling against the table in `SKILL.md`.
- `bad-request` — the line was malformed.
- `unavailable` — the thing you asked about could not be answered right now.
- `refused` — the door refused the specifics; the answer names a `reason`
  word (see [open](open.md)).

Dynamic values go Base64 — encode them with `/usr/bin/base64` and substitute
only the encoded text. Never interpolate a raw path, raw search text, or a
session id typed by hand into the JSON. A raw `/` inside a JSON string field
is the sign of a forged call.
