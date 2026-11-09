# Phase 362 checkpoint — latest scope, not committed or released

## Current implemented capabilities

Ten operations: capabilities, whoami, sessions, activity, summaries, open,
open-project, create, rename, focus.

- Open an existing project or a new absolute local folder, reusing folder identity.
- Create a named Pi session through normal launch composition; rename sessions.
- Focus a project or a session within it.
- Filter session/activity/summary lists by project.
- Read existing stored summaries without rereading raw conversations or generating a summary;
  freshness uses stored turn index and a newer rejected sentence does not resurrect an older one.
- Open a file at a real full-line/range selection using Monaco's manual-selection colors.

## Latest user ruling: End removed and opens scoped to the requesting session

Agent End has been removed entirely: no operation, handler, native dialog, or killSession
wiring. Raw end/End/close/kill/END requests return unknown-operation. Ordinary GUI/phone End
are unchanged. Docs API and intersession messaging remain excluded.

File open requires an absolute path within the requesting session's own open local project.
Relative paths return bad-request. Paths in another project return outside-projects even
when that project is open or currently visible. Focusing a tab does not change the originating
session's project. The renderer also rechecks that project id, repo path, and file agree.

## Independent live proof of these fixes

Fresh isolated Electron, real socket, two real bridge-created callers, and different AGENTS.md
files in projects A and B. The verifier read actual editor tab repoPath/path/content, active
project, and Monaco selected text independently of the API reply.

- A caller opening absolute A file while B was visible: only A's tab/content/lines 3–5 selected.
- A caller requesting B, and B caller requesting A: refused; UI/tab/text state unchanged.
- Relative AGENTS.md: bad-request, UI unchanged.
- B caller requesting B: only B's tab/content/lines 3–5 selected.
- End/close/kill variants: unknown-operation, zero native dialogs, both sessions still alive.
- Capabilities lists exactly ten operations without End.
- No model turn repeated for this narrow fix; live API/UI behavior proved, model compliance
  with the updated skill instructions not separately proved in this run.

Report: subagent-artifacts/outputs/0b469801-08b8-4819-8a67-ff7a233ce1a5/
p362-open-scope-end-removal-live.md under this Pi session.

## Checks after removal/scope change

- Full typecheck and build PASS; contract inventory matches.
- Focused shared/renderer/agent-access suites: 1,287 tests PASS.
- Full suite: 22,458 tests PASS in 1,198 files; 52 skipped in 4 files.
- Agent-access conformance: 24 rules PASS.
- T3/package and final complete landing battery are still outstanding.

## Remaining overall Phase 362 limitations

- Focus occasionally left neither window focused after earlier native-sheet tests; isolated
  focus passed 6/6. The native-sheet API has now been removed, but no claim is made that the
  broader focus anomaly was root-caused.
- The .sdef adapter is now implemented in Phase 363 (see `build/p363/SPEC.md`), using
  synchronous submit/result commands around the existing asynchronous dispatcher. Native
  self-event roundtrips, real project/rename actions, socket parity, packaged dictionary
  discovery and script compilation passed independent verification. External AppleScript
  execution remains NOT RUN due the previously measured consent requirement (-1744);
  no consent prompt was requested. Reverify passed the parent-review expiry/shutdown fixes but
  returned needs_work on native reinstallation after shutdown; Phase 363 is stopped without a
  second fix or commit. See its SPEC for the exact verdict and test-safety correction.

## Running demo safety

The existing test app /private/tmp/tortie-p362-demo-7e55JO contains user-created sessions.
The parent turned agentAccess OFF there while removing End; it was not restarted or killed.
Do not re-enable its older API or terminate its sessions to refresh it. Use a separate fresh
instance of the new build if demonstrating the fixes. Installed Tortie is untouched.
