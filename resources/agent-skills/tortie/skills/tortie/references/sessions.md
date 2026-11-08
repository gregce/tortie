# Sessions — yours and everyone else's

Tortie's session list is the one thing your shell cannot see: it names every
session across every project on every connected Mac, newest first, with each
one's agent, status, project and machine.

## whoami

This session's own row, which is also the name the door knows you by.

```sh
printf '{"version":1,"operation":"whoami","session":"%s"}\n' \
  "$GMUX_SESSION_ID" | /usr/bin/nc -w 2 -U "$GMUX_AGENT_SOCKET"
```

Answer shape: `name`, `agent`, `status`, `projectPath`, `machine`. If the door
cannot find this session it answers `unavailable`, and the honest thing to
say is that Tortie does not know your session right now.

## sessions

Up to 200 session rows (any beyond that become an `omitted` count), each with
the same fields as `whoami`. Ask for the whole list, then filter in your own
answer — by project, by agent, by status. There is no per-project parameter;
take the list and name the ones the user asked about.

```sh
printf '{"version":1,"operation":"sessions","session":"%s"}\n' \
  "$GMUX_SESSION_ID" | /usr/bin/nc -w 2 -U "$GMUX_AGENT_SOCKET"
```

A session that ended while you were looking simply stops appearing. A status
of `needs_input` means the agent is waiting on the person, not on you.
