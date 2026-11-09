# Phase 363 — AppleScript as a thin adapter over the existing agent API

## Charter

Operator: “implement .sdef please”; it must be a thin layer over what is already
implemented, never an independent session/project implementation. Keep the existing
uncommitted Phase 362 work. End is removed; file opening requires an absolute path
inside the requesting session's project. Docs and messaging remain excluded.

Tier 3: first-party native code in main, external automation, process-creating
operations behind the existing dispatcher. Independent verifier must run native
transport tests plus a hostile fixture and compare against the socket/API results.
No installed app, real profile, existing demo, default tmux or -L gmux in tests.
No new Automation prompts from internal skill calls. No consent prompt requested
by an automated test. External scripting remains subject to macOS permissions.

## Banked measurements and decision

SCRATCH/automation-experiment built a first-party N-API receiver and dictionary.
A second prototype at /private/tmp/p362-ae-84112 received self-targeted events and
returned synchronous validation errors, but suspended asynchronous replies to self
failed (-1712). External preflight previously returned consent-required (-1744).

Do not repeat suspend/resume or implement a nested Node/Cocoa event loop. Use two
synchronous transport commands with bounded asynchronous work between them:

1. `submit request <text>`: the exact existing JSON request, including its session
   context. Return a generated request identifier immediately; this is admission,
   NOT success of the requested operation.
2. `request result <identifier>`: text containing JSON with state pending,
   completed plus the unmodified existing API response, or missing for an unknown
   or expired identifier. Polling a completed result never reruns the action.

The adapter does not invent a session identity. Existing request shape/caller rules
apply. These two commands expose all current compiled API operations through the
one dispatcher, not a parallel set of lifecycle handlers.

## Implementation boundaries (one builder, sequential ownership)

- First-party native receiver, e.g. src/native/apple-events.mm: register fixed
  submit/result event IDs; native text/byte bounds; bounded request/result memory;
  stable identifiers; expiry; cleanup; nonblocking N-API callback to JS. No business
  logic, filesystem/session readers, spawn, arbitrary JS execution, or payload logs.
- resources/automation/Tortie.sdef: exactly the transport dictionary, parameters,
  result semantics, permission note. No unimplemented domain commands.
- src/main/agent-access/apple-events.ts: resolve own signed addon, register on macOS
  readiness, invoke the existing installed-dispatch entry, publish exact results.
- src/main/agent-access/service.ts: extract the socket's existing dependency mapping
  into ONE installed-dispatch entry shared by socket and Apple Events. No duplicate
  handler registry or validation. Request liveness/expiry prevents queued actions
  after expiry; one execution per submitted request, no automatic retry.
- src/main/capabilities.ts: installation/shutdown only. No new operation semantics.
- build/build-apple-events.mjs plus build configuration: reproducible source-built
  N-API addon on macOS; no checked-in binary; no ffi/npm native dependency; local
  official Node N-API headers; standard compiler/SDK discovery with actionable
  missing-tools error. Existing macOS SDK workaround may be supplied via SDKROOT.
- electron-builder.yml/after-pack as needed: .sdef in Contents/Resources, matching
  OSAScriptingDefinition and NSAppleScriptEnabled, native addon outside asar,
  correct arm64 architecture/signing. Never relax CSP or entitlements.
- Tests/probe/build checks: classify new scripts; raise Electron helper caller floor
  if adding a build/ script that launches through withElectron. Process cleanup in
  finally. Contract baseline changes, if any, explicit and intentional.
- User-facing automation example and relevant brainstorming/backlog updates.
  Internal skill continues using socket; no mandatory Apple Events/native steps.

## Bounds and outcomes

Native request and response caps must agree with existing shared 64 KiB / 256 KiB
caps. Use a small fixed pending/completed job bound and finite retention. Refuse
admission when full rather than evict an executing request. Late completion after
expiry is ignored. Unknown result ID returns missing and executes nothing.
Shutdown unregisters event handlers, cancels admission, and clears pending jobs.
The plain agentAccess switch remains the operation gate; no keychain additions.

## Required live proof

1. Compile and load first-party addon in an isolated real Electron; establish
   submit -> queued JS callback -> result using self-targeted native events with
   synchronous replies. Prove before integrating into product bootstrap.
2. Run the built Tortie application with the adapter and actual dispatcher in a
   fresh scratch profile/socket. Compare capabilities and own-session response
   against socket; execute one harmless project/session operation and read the
   real app state independently. Poll repeated result: no repeated side effect.
3. Attack malformed/oversize request, wrong descriptor kind, unknown and expired
   result IDs, capacity, disabled switch, shutdown, and removed End operation.
4. Package and read the actual dictionary through /usr/bin/sdef; compile a sample
   AppleScript against it without sending external events. Check packaged addon
   and dictionary paths, signature and arm64. No decorative .sdef-only PASS.
5. External sender execution may remain consent-blocked: distinguish that from
   successful in-process transport proof and disclose it, never request consent
   or claim external roundtrip was observed when it was not.

## Completion

Build -> independent live verify -> one fix if needed -> independent reverify.
Parent commits only after accepted evidence and required gates. Research/measurement
findings and actual restrictions go in as-built notes. No release or installed-app
replacement in this phase.

## As built (2026-11-09, uncommitted)

Files: `src/native/apple-events.mm`, `resources/automation/Tortie.sdef`, `src/main/agent-access/apple-events.ts`
(+ `dispatchInstalledAgentAccess` in `service.ts`, install/shutdown lines in `capabilities.ts`),
`build/build-apple-events.mjs`, `build/assert-apple-events.cjs`, `build/p363/{self-send.mm,driver.cjs,measure-isolated.mjs,stage-product.mjs,probe-p363.mjs}`,
`electron-builder.yml` (extraResources, extendInfo, signIgnore), `build/sign-nested-binaries.cjs`, `docs/AUTOMATION-APPLE-EVENTS.md`.

Measured findings: (1) queue-reply self-sends never deliver their answer to a handler in Electron's main run loop;
a WAIT-reply send from a worker thread works because the handler is synchronous, so the probe-only `self-send.mm`
does that and is never part of the product. (2) The default SDK here (MacOSX27.0) fails linking on `.tbd` files; the
build script falls back through installed SDKs (SDKROOT wins). (3) In-process submit answers in 3 to 4 ms. (4) A
`NODE_OPTIONS --require` preload must resolve the builtin `electron` from `/`, since the repository's `electron` npm
package is a path string. (5) `sdef` takes a bundle, not the .sdef file. (6) The packed addon is the signed copy, so the
assertion verifies its signature rather than comparing bytes.

Limits: no external sender run (macOS Automation consent); the dictionary exists only in a build that ran
`build-apple-events.mjs` (dev, build and package scripts do); a missing addon logs `no-addon` and the socket is unaffected.

## Independent reverify — needs_work, stopped

The parent fixed the enabled/liveness check to run after asynchronous source reads,
preserved half-open socket replies, and made native shutdown unregister handlers.
Independent live reverify passed delayed-source expiry and switch-off across all
five acting handlers, native expiry/shutdown with zero late calls, real socket
half-close, native/socket response parity, and exactly-once rename. Full suite:
22,507 passed before subsequent documentation/routing guards; latest focused suite:
118 passed, typecheck green. Internal skill explicitly requires the socket and
forbids AppleScript/JXA/.sdef/GUI fallback or permission requests; regression tests
pin that boundary. Agent access remains a plain boolean with no Keychain seal.

The verdict is nevertheless **needs_work**: native install -> shutdown -> install
stops the Electron main loop. Production installs once and shuts down at quit,
so this is not reachable through today's UI, but the verifier rejected the native
lifecycle. Own-project file-open success through the adapter remains unobserved
(both transports returned renderer-unavailable), external AppleScript execution
is NOT RUN, and the verifier's first-self-event fixture was intermittent.

The independent verifier also found the stage-A launcher lacked the mock-Keychain
argument. It has now been added solely as a test-safety correction; it was already
present on stage B, the demo and the verifier's own runs. This does not establish
which process caused the reported Safe Storage prompt, and the safety-argument
change has not been exercised in a further live run. No real Keychain prompt was
answered, and neither transport adds Keychain APIs.

Per the one-fix-round contract, STOP here: no second native fix, no commit, no
release, no installed-app replacement. Further native lifecycle work needs a
revised brief. Report: this session's subagent-artifacts/outputs/
66bf7d74-f96f-4e18-8c12-e1000f6aa316/p363-parent-fix-independent-reverify.md.

## Packaged manual demo and additional signing finding

At the operator's subsequent request to see the actual `.sdef` app, a fresh package
was built successfully, but its real startup logged `apple events adapter failed`.
A direct dlopen under the packaged executable gave the precise reason: main was
signed by the locally discovered Apple Development identity while the addon was
ad-hoc signed; library validation rejected the different Team IDs. The earlier
packaging assertions did not establish runtime loadability. The build/signing
pipeline is NOT fixed and this is another outstanding defect.

For the requested manual demo ONLY, the package was copied to
`/private/tmp/tortie-p363-packaged-c8y2jz/bundle/Tortie.app`; its first-party addon
and outer bundle were signed with the same existing development identity, preserving
entitlements and runtime flags (no security relaxation). Strict signature checking
and packaged-executable dlopen passed. A fresh launch with mock Keychain, isolated
profile `/private/tmp/tortie-p363-packaged-7XPKEq/profile` and private socket
`gmux-p363pack-52163` logged `apple events adapter installed`. `/usr/bin/sdef`
read both commands from this exact copy. It is left open for the operator on
`applescript-test` / `Packaged AppleScript test` (main PID 52170, launcher 52163,
CDP 52579). OS activation was observed true. Internal skill calls remain socket-only.
External scripted execution is still not claimed. Other user demo sessions and
`/Applications/Tortie.app` were not changed. The earlier failed packaged launch
was closed only after independently confirming it contained zero sessions.


