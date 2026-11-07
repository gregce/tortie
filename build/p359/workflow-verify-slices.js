const COMMON = [
  "You are verifying Phase 359 (Tortie agent access) in /private/var/tmp/tortie-wt/wt-p359.",
  "HARD TIME BOX: you have about 25 minutes. At 17 minutes stop launching anything new and WRITE YOUR VERDICT with what you already have. Never end without a verdict object. Items you did not reach must be listed in problems as 'not run: <item>', which counts as needs_work for that item — that is an acceptable, honest outcome; silently dropping them is not.",
  "Never commit. Never touch the operator's checkout, his running Tortie, his tmux -L gmux, or his userData. All scratch under /private/var/tmp/tortie-wt/scratch/p359/<yourname>/ and removed in a finally. Every Electron via build/electron-run.mjs. No model turn, no network, no Apple Events, no keychain.",
  "Existing work from the two timed-out lenses is reusable and you should reuse it rather than rewrite: /private/var/tmp/tortie-wt/scratch/p359/lens1/ (fenced catalog runner lens1-run.mjs, catalog outputs under cat*/logs/catalog/) and /private/var/tmp/tortie-wt/wt-p359/.lens2/ (lens2-attack.mjs/.mts, lens2-door-harness.mjs, drive-open.mjs, drive-shape.mts). Read them first; your job is to finish and grade, not to start over.",
  "Known findings already raised by the timed-out lens 1 that you must resolve with evidence, not repeat: (a) it reported 'profile path over the 103-byte socket guard' — measure the actual socket path string each run used and say whether that is a product limitation on the operator's real profile or an artifact of a long scratch path (the operator's real path is 70 bytes and fits); (b) it reported 'panes dying when the fenced CLI exits' — determine whether that is an artifact of the sandbox-exec wrapper being exec'd as the pane command, not a product defect.",
  "Verdict schema, always last, in your final message: {verdict: 'pass'|'needs_work', independentMethods: [...], evidence: [...], problems: [...], whatIsNotTrue: [...]}. A null or missing verdict counts as needs_work."
].join("\n");

const tasks = [
  {
    key: "v-a-transport",
    agent: "worker",
    output: "p359-verify-transport.md",
    task: [
      COMMON,
      "SLICE A — hostile transport and settings attack (no Electron, plain node). Reuse .lens2/lens2-door-harness.mjs and lens2-attack.mjs(mts).",
      "Cover SPEC 6.2 items 1-13 that do not need a live app: settings.json forged true + restart-equivalent reload; atomic rename over it; pre-359 seal replay; malformed/wrong-protocol/unknown-op/missing-extra-key/noncanonical-Base64/invalid-UTF8/NUL/overlong session-path-find/line-bounds refusals; honest request with keys reordered and split at every byte boundary; 64KiB+1 before parse; second request on one connection; slowloris vs absolute 2s deadline; fake/gone/remote session ids; stale socket replaced only when stale, planted regular file/symlink never unlinked; two owners on one profile; app-down bounded failure with /usr/bin/nc -w 2 -U; app.log canary scan and exactly one operation/outcome/duration line per request.",
      "Deliver per-item PASS/FAIL with the actual observed value (error string, exit code, byte count, elapsed ms).",
      "Independent method: attack, do not confirm — write your own raw Unix-socket client and compare against the shipping module's behaviour."
    ].join("\n")
  },
  {
    key: "v-b-open",
    agent: "worker",
    output: "p359-verify-open.md",
    task: [
      COMMON,
      "SLICE B — the live open drive, one scratch Electron, and only these claims: SPEC 6.3 rows for same-project open with an exact line and an exact range, outside-all-projects, credential file, directory, missing file, 10 MiB file, binary/NUL, line past end, find absent, find with 300 matches (matches and chosen index), multiline/emoji find coordinates, git-ignored file, and the disk-vs-editor sha256 equality for every opened file.",
      "Reuse .lens2/drive-open.mjs. CDP for project/tab/selection; outside process for sha256. Report socket answer, tab, selection coordinates and hash per row.",
      "Independent method: drive the real app and re-derive from outside it; a response alone is not proof.",
      "Out of scope for you (say 'not run' rather than doing them): focus/background/cross-project focus rules, the read-race checkpoint arm, switch-off-mid-flight, wrong-renderer completion, seeded real-shape comparison, packaged proof."
    ].join("\n")
  },
  {
    key: "v-c-delivery",
    agent: "worker",
    output: "p359-verify-delivery.md",
    task: [
      COMMON,
      "SLICE C — launch delivery composition and the fenced catalog matrix, with no Electron and no model turn.",
      "1) From the shipping code (not from a report), re-derive the exact delivery pair for claude, pi, omp with the switch on and assert every other launchable registry row composes exactly null: write a small script that imports the shipping composer/delivery module and prints the composed argv/env for all thirteen rows at on and off, and confirm off is byte-identical to the parent composition (use `git stash`-free method: read parent via `git show a9f18c06:<path>` into a temp file and compare, never mutate the worktree).",
      "2) Prove the captured (SpecStory) shape puts the pair inside the inner -c command and nowhere else, using the shipping wrap/unwrap helpers.",
      "3) Reuse lens1's fenced runner (/private/var/tmp/tortie-wt/scratch/p359/lens1/lens1-run.mjs and run-command-style fence) to run each of claude, pi and omp with Tortie's composed pair and read each agent's own catalog: control, treatment, missing path. Report each agent's version, the catalog record found (name/description), and whether a personal scratch skill planted in the scratch HOME remains listed in both control and treatment.",
      "Independent method: re-derive independently + run over real data (the installed CLIs), not by reading the builder's tests.",
      "Do NOT attempt retained relaunch, restore, retained restart, OFF-after-ON or parallel-session cells; list them as 'not run'."
    ].join("\n")
  }
];
const results = await runs.all(tasks);
return results.map((r) => r.output);
