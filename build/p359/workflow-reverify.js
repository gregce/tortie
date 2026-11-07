const COMMON = [
  "You are the INDEPENDENT REVERIFIER for Phase 359 in /private/var/tmp/tortie-wt/wt-p359. You did not write the fix and you must not accept any fix report or green gate as proof — re-run the FAILED items live and read the result yourself.",
  "HARD TIME BOX: about 25 minutes. At 18 minutes stop launching and write the verdict with what you have; anything unreached goes in problems as 'not run: <item>'.",
  "Never commit. Never touch the operator's checkout, his running Tortie (pid 84957, /Applications/Tortie.app), his tmux -L gmux, or his userData. Scratch under /private/var/tmp/tortie-wt/scratch/p359/reverify/ removed in a finally. Electron only through build/electron-run.mjs. No model turn, network, Apple Events, keychain.",
  "WHAT WAS FIXED (verify, do not trust):",
  "  FIX 1 — src/main/capabilities.ts used `pocketCore` (the phone door's core, null until the phone door opens) for agent access, so every operation answered `unavailable` in a real app run. Now agentAccessSessions/agentAccessProjects are async and read the live core through getGmuxCore(); listSessions/listProjects are now `() => Promise<...>` in service.ts, dispatch.ts and open.ts, and dispatch awaits them.",
  "  FIX 2 — src/main/agent-access/dispatch.ts `finally` called outcomeOfResponse(response!) which threw when the try body threw before assigning, masking the handler's reason as a generic `unavailable` and logging operation:\"unknown\". Now `response` starts null, the finally reports 'threw' without calling outcomeOfResponse, and the report call is wrapped so a throwing reporter cannot change the outcome.",
  "Verdict schema, last in your message: {verdict:'pass'|'needs_work', independentMethods:[...], evidence:[...], problems:[...], whatIsNotTrue:[...]}."
].join("\n");

const tasks = [
  {
    key: "rv-live-open",
    agent: "worker",
    output: "p359-reverify-open.md",
    task: [
      COMMON,
      "TASK: re-run SLICE B's failed rows live. One scratch Electron through withElectron, two local projects A/B, one local shell session created through the renderer, the sealed switch turned on through window.gmux.settingsSet({agentAccess:true}), then a raw socket client (your own, not the shipped skill) sending: capabilities, whoami, sessions for the live session's own GMUX_SESSION_ID, then open rows for — same-project exact line; same-project range; a file in project B while A is active; outside-all-projects; credential (.env); directory; missing file; 10 MiB file; NUL/binary file; line past end; find absent; find with 300 matches; multiline/emoji find coordinates; git-ignored file.",
      "For each: record the socket answer verbatim, the renderer's captured gmux:open-file request (CDP), the tab that appeared and the Monaco selection text, and for every opened file the sha256 of the editor's text against the post-validation disk file. The previous run proved the caller id byte-equal to the pane's GMUX_SESSION_ID from outside the app — repeat that proof so a null result cannot be blamed on a wrong id.",
      "Report the specific reason if any row still fails (read app.log's agent-access line for that request: it must now name the operation and a real outcome word, not 'unknown').",
      "Independent methods: drive the real app + re-derive from outside it."
    ].join("\n")
  },
  {
    key: "rv-reason",
    agent: "worker",
    output: "p359-reverify-dispatch.md",
    task: [
      COMMON,
      "TASK: prove FIX 2 behaves, with no Electron. Import the SHIPPING dispatch.ts under the pinned tsx and drive:",
      "  1) an open handler that throws OpenUnavailableError → the client-visible answer must be the closed `unavailable` code, and the report line must name operation 'open' and outcome that reflects the failure (not 'unknown'), and must NOT throw out of dispatch;",
      "  2) an open handler that throws a plain Error → dispatch must still return a closed response and must not crash the caller;",
      "  3) a `report` callback that itself throws → the request's response must be unaffected;",
      "  4) the honest happy paths (capabilities/whoami/sessions) still report their own operation name and 'ok';",
      "  5) a fake/remote caller still answers `unavailable` with the report line naming the operation.",
      "Also re-run `npm run conformance:agentaccess` and `npm run ablation:p359` once and quote their PASS lines, and state explicitly that you did not treat them as your proof.",
      "Independent method: attack, plus driving the shipping module rather than any test file."
    ].join("\n")
  }
];
const results = await runs.all(tasks);
return results.map((r) => r.output);
