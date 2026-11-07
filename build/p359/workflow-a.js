const REPORT = "report-a";
const SPEC_TAIL = `Build lane role, Phase 359, Builder A. Read build/p359/SPEC.md section "Builder A" and build ONLY the files it lists, following its contract in section 2 and its tests/commands. Constraints: worktree /private/var/tmp/tortie-wt/wt-p359 only (node_modules already cloned); never touch the operator checkout /Users/johnberryman/projects/github/gregce/tortie except reading the SCRATCH research notes; no Electron launches, no real agents, no commits; ` + "`npm run typecheck` and the section's exact `npm test` command before returning.";
const reports = await runs.all([{ key: REPORT, agent: "worker", task: "Phase 359 Builder A. " + SPEC_TAIL, output: "p359-builder-a.md" }]);
return reports[0].output;
