# Tortie from AppleScript

Tortie's dictionary (`Tortie.sdef`) adds two commands over the agent API Tortie already has. It adds no
operations of its own, and agent access must be switched on in Settings.

- `submit request <json>` returns a request identifier at once. That means the request was **admitted**,
  not that it succeeded.
- `request result <identifier>` returns JSON text: `{"state":"pending"}`,
  `{"state":"completed","response":<the API's response, unmodified>}`, or `{"state":"missing"}` for an
  unknown or expired identifier. Reading never runs the request again, and results are kept about a minute.

The request is the exact JSON the agent socket takes, including an **existing** session id as its context
(`session`). Ask `capabilities` first to learn the operations and `whoami` for the context. A completed
response can itself be a refusal; read its `ok` field. Up to 16 requests are held; a full Tortie refuses the
next submit rather than dropping one. macOS may ask for Automation permission before another app
may control Tortie. This transport does not use the Keychain; a “Tortie Safe Storage” password prompt
is separate from AppleScript permission.

Agents running inside Tortie must continue using `GMUX_AGENT_SOCKET`, as the bundled skill documents.
They must not use this AppleScript interface as a fallback or request Automation or Keychain access.

```applescript
tell application "Tortie"
	set req to "{\"version\":1,\"operation\":\"whoami\",\"session\":\"SESSION-ID\"}"
	set rid to submit request req
	repeat 20 times
		set r to request result rid
		if r does not contain "\"pending\"" then exit repeat
		delay 0.25
	end repeat
	return r
end tell
```

Do not retry a mutating request blindly: poll the same identifier instead.
