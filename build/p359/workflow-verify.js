const lenses = [
  { key: "verify-lens1", agent: "worker", task: [
    "Build lane role, Phase 359, VERIFIER LENS 1: real-agent delivery/lifecycle matrix.",
    "Worktree: /private/var/tmp/tortie-wt/wt-p359. Never commit. Never touch the operator's checkout, his running Tortie, his tmux, or his userData.",
    "Read build/p359/SPEC.md section 6.1 fully and follow it exactly: safety setup, scratch everything, closed PATH wrappers for exactly claude, pi, omp under the fenced no-network/no-fork runner adapted from /Users/johnberryman/projects/github/gregce/tortie/SCRATCH/agent-tortie-skills-IMPLEMENTATION-NOTES.md:48-60, agents:list check before any session, no prompt/model turn, end real agents by pid/time/command.",
    "Fill every cell of the 6.1 table for Claude Code, Pi and omp (OFF create, ON create, catalog control/treatment/missing with Tortie's composed pair, captured create, retained relaunch, restore, retained restart, OFF after ON, parallel), plus the parent/off argv-env comparison for all thirteen launchable rows. Use extern process/tmux reads, not Tortie's self-report. Run the conformance:agentaccess gate exactly once as your baseline, then spend time on the independent matrix.",
    "Independent methods: (1) real data across every claimed provider, (2) re-derive pane argv/env from outside Tortie. Your verdict MUST be the typed JSON schema in SPEC 6 (verdict, independentMethods, evidence, problems, whatIsNotTrue) embedded in a return that also states versions and full PASS/FAIL cell rows. A null or missing verdict counts as needs_work. Read independent evidence ONLY; do not accept any builder, spec or integrator report as proof."
  ].join("\n") },
  { key: "verify-lens2", agent: "worker", task: [
    "Build lane role, Phase 359, VERIFIER LENS 2: hostile transport/settings attack plus live open drive.",
    "Worktree: /private/var/tmp/tortie-wt/wt-p359. Never commit. Never touch the operator's checkout, his running Tortie, his tmux, or his userData.",
    "Read build/p359/SPEC.md sections 6.2 (attack matrix 1-13), 6.3 (live open drive, one scratch Electron), 6.4 (seeded real-shape comparison), 6.5 (packaged proof) and follow them exactly with your own independently written raw Unix-socket client (not the shipped skill examples). Use one Electron session per 6.3; CDP for project/tab/editor/selection/focus; outside-process sha256 for disk-vs-editor bytes.",
    "Your verdict MUST be the typed JSON schema in SPEC 6 (verdict, independentMethods, evidence, problems, whatIsNotTrue). Independent methods: (1) attack that does not confirm, (2) outside-app re-derivation. Include every gate PASS line you relied on, socket modes/identity/deadlines, open matrix rows with socket answer plus project/tab/selection/focus plus hashes, real-shape counts, packaged assertion result, final census, and what is not true (no prompt/model proof, no unsupported agent, no remote, no mutating op, same-user identity not authentication). A null or missing verdict counts as needs_work."
  ].join("\n") }
];
const results = await runs.all(lenses);
return results.map((r) => r.output);
