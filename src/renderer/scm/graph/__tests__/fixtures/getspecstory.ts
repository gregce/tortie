/**
 * A REAL merge tangle, captured read-only from /Users/gdc/getspecstory on
 * 2026-08-11 — the repository research 24 measured against.
 *
 *     git log -z --topo-order --decorate=full --max-count=400 \
 *             --format=%h%x1f%p%x1f%D%x1f%s \
 *             refs/heads/dev refs/remotes/origin/dev
 *
 * That is the DEFAULT scope ("this branch + upstream") the History header
 * offers, on a repository with 752 commits, 132 refs and genuine merge
 * topology — 185 merges overall, including pull-request merges, dev↔main
 * cross-merges and branches that reopen weeks later. Synthetic DAGs cannot
 * produce those shapes, and they are exactly where lane algorithms fail.
 *
 * Abbreviated SHAs (git's own `%h`, unique within this repo) keep the fixture
 * readable in assertion output; the fold only ever compares them for equality.
 *
 * Anchors at capture time: HEAD `210d609` (dev), upstream `3de8b77`
 * (origin/dev), merge base `210d609` — i.e. local is 0 ahead / 1 behind, a
 * real "you have not pulled" state.
 *
 * Line format: `hash|parents|decoration|subject` (subject truncated).
 * Regenerate by re-running the command above; nothing here is hand-edited.
 */

const RAW = `
3de8b77|6afa678|refs/remotes/origin/dev|SpecStory histories.
6afa678|0e4e470 210d609|tag: refs/tags/specstory-cli/v2.8.0, refs/remotes/specstoryai/main, refs/remotes/origin/main, refs/remotes/origin/HEAD|Merge branch 'dev' of github.com:specstoryai
210d609|93d9d53|HEAD -> refs/heads/dev, tag: refs/tags/v2.8.0, refs/remotes/specstoryai/dev, refs/remotes/specstoryai/HEAD|Feasibility doc: build inventory up top, spa
93d9d53|57503af||Research: can SpecStory ship as an agent plu
0e4e470|57503af||Changelog.
57503af|2046ca6||Fixes to markdown code fence runs, inspired 
2046ca6|fdb8297|tag: refs/tags/v2.7.0, tag: refs/tags/specstory-cli/v2.7.0, refs/remotes/specstoryai/copilot-ide, refs/remotes/origin/copilot-ide|Changelog.
fdb8297|290661e||Fix 'resume' with Copilot IDE as the target.
290661e|0b0e15c||Improve 'run' and 'watch' for Copilot IDE.
0b0e15c|84372c6||Tool rendering fixes and improvements for Co
84372c6|48b947c||A LOT of work on the Copilot IDE provider's 
48b947c|d6caa06||Less verbose output on the VSC Copilot IDE v
d6caa06|2061475||Minor code cleanup from Copilot observations
2061475|8c00845||Pick up a session customTitle only update in
8c00845|029f4ce||Fix a timing issue case where final message 
029f4ce|bec0205||Code improvements.
bec0205|d06f2f8||Updates to README for Cursor and Copilot IDE
d06f2f8|0bb8c42||Further code improvements for Copilot provid
0bb8c42|3a02cb9||Code level improvements to the Copilot IDE p
3a02cb9|d8190c1 5d4575d||Merge branch 'dev' into copilot-ide
5d4575d|47a9874|tag: refs/tags/v2.6.0, tag: refs/tags/specstory-cli/v2.6.0, refs/heads/gregce/guangzhou|SpecStory histories.
47a9874|c4236af||Fix the FD exhaustion issue during 'watch'/'
c4236af|0047fd6||Update dependencies.
0047fd6|1e27b19||Fix for #266 - FD exhaustion from Codex prov
1e27b19|1acc2d8||SpecStory histories.
1acc2d8|c3e0a17 4a896f5||Merge pull request #221 from specstoryai/cur
4a896f5|60a5016||Final code/test cleanup.
60a5016|ec497e7||Minor code and test cleanup / improvements.
ec497e7|a4a4183 c3e0a17||Merge branch 'dev' into cursorcli-db-fixes
c3e0a17|e3ada17||Minor code cleanup. Don't allow -s and --pro
e3ada17|07ee003 2d6c782||Merge branch 'dev' into feat/providers-flag
2d6c782|5ff98dc||Handle Antigravity CLI in skills gen.
5ff98dc|69ca509|refs/heads/worktree-wf_d91bd193-266-4, refs/heads/worktree-wf_d91bd193-266-3, refs/heads/worktree-wf_d91bd193-266-2, refs/heads/worktree-wf_d91bd193-266-1|Update Antigravity min. version.
69ca509|842a93a||SpecStory histories.
842a93a|195266a||Add Antigravity to repo README.
195266a|f9d3e73|tag: refs/tags/v2.5.0, tag: refs/tags/specstory-cli/v2.5.0|3rd level fallback for cwd for Antigravity a
f9d3e73|e16a59a||Share Cursor IDE Windows aware file path han
e16a59a|44fa158||Comment fix
44fa158|9f91020||Comment fix
9f91020|7bbd03a||Comment fix
7bbd03a|b8fef3f||Comment fix
b8fef3f|98f40aa||Comment fix
98f40aa|64ae209||Code cleanup.
64ae209|1e3a9d9||Minor code cleanup.
1e3a9d9|2bc5a96||Minor code cleanup.
2bc5a96|d8c1c0f||Minor code cleanup.
d8c1c0f|13ab49d||Cleanup non-real tool renderers.
13ab49d|f45cab4||Remove workspace inference attempt in Antigr
f45cab4|6ad6e24||Antigravity tool rendering improvements.
6ad6e24|75f9f7d||Update Antigravity provider to latest SPI an
75f9f7d|4ebeccb d07ee59||Merge branch 'dev' into feat/antigravity-cli
4ebeccb|8cadb3f|refs/heads/feat/antigravity-cli-provider|Address Antigravity review comments
8cadb3f|7b205db||Map Antigravity sessions to projects from lo
7b205db|25a957a||Add Antigravity CLI provider
07ee003|5e0b06c 959bd86||Merge branch 'dev' into feat/providers-flag
5e0b06c|02710df||Cleanup comment
02710df|2fdd022||Some cleanup of the providers flag
2fdd022|49a3aab||Add a providers flag to pass in a comma sepa
a4a4183|b3a2029||Remove fileInfo parameter not being used any
b3a2029|25a957a||Fix WAL mode set and sqlite connection pool 
d8190c1|fddf321||Custom command toml also for all Copilot var
fddf321|d076f59 d07ee59||Merge branch 'dev' into copilot-ide
d07ee59|3a54ec2|tag: refs/tags/v2.4.0, tag: refs/tags/specstory-cli/v2.4.0|Claude Code indeterminism fix.
3a54ec2|d71ccb4||SpecStory histories.
d71ccb4|df26ecc||Omitted new files.
df26ecc|8799d06||DRY up autosave code paths to make sure all 
8799d06|5e1668d||Code cleanup.
5e1668d|ed6a4c7||Address performance in secret redaction. Add
ed6a4c7|4825c65||Small code and doc improvements around redac
4825c65|433c5ab||Switch from inline secret regex to Betterlea
433c5ab|5525cfb 74873f6||Merge branch 'dev' into pr-235
5525cfb|dfe1229||feat(redaction): automatically redact secret
d076f59|4a7ae42 74873f6||Merge branch 'dev' into copilot-ide
74873f6|b7547a5|tag: refs/tags/v2.3.0, tag: refs/tags/specstory-cli/v2.3.0|Update dependencies.
b7547a5|b858ac9||Dependency updates.
b858ac9|552911d||Changelog.
552911d|76c4105||Minor UX clarity text change.
76c4105|dfe1229 d620e14||Merge pull request #159 from specstoryai/cur
d620e14|6749d30 8f82e7b||Merge branch 'cursor-ide' of github.com:spec
8f82e7b|89713d8||Typo
6749d30|89713d8||Fix for resuming into a new Cursor IDE works
89713d8|8137813||Cursor >= 3.12 moved session/project associa
4a7ae42|080a8f7||feat(copilotide): launch via variant CLI and
080a8f7|7c76eac 8137813||Merge branch 'cursor-ide' into copilot-ide
8137813|24f9937||More efficient single pass.
24f9937|b47d66b||fix(cursoride): discover sessions via embedd
b47d66b|4d0f46f||Minor code cleanup items from code review.
7c76eac|4cebdb6 4d0f46f||Merge branch 'cursor-ide' into copilot-ide
4d0f46f|d5081e0||fix(watch): scope dedup by provider and fing
d5081e0|f2e46ca dfe1229||Merge branch 'dev' into cursor-ide
dfe1229|2ff2010|tag: refs/tags/v2.2.0, tag: refs/tags/specstory-cli/v2.2.0|Remove project reusable agent cap. Update ch
2ff2010|bad1bc6||Code cleanup.
bad1bc6|4cf89fd||Change location of 'u' hotkey browser open f
4cf89fd|97f518a||Comment cleanup.
97f518a|238cac9||Code cleanup.
238cac9|3778134||Code cleanup.
3778134|16449f8||CLI session resume of sessions from the web.
16449f8|4b247fb||Minor UX improvements to skills TUI, and add
4b247fb|c8780be||Alias space/enter to be equivalent in search
c8780be|6d28d75||UX fixes for cloud search/resume.
6d28d75|1a3f28d||Allow trailing slashes when specifying SpecS
1a3f28d|4daef66 7a08679||Merge branch 'dev' into cloud-resume
7a08679|982c152||fix(telemetry): probe collector reachability
4daef66|139407d||SpecStory histories.
139407d|2eaca35||Minor CLI/TUI copy/UX changes.
2eaca35|2a6bb61||Hotkey for upgrade from 'specstory resume'.
2a6bb61|4078963||Fixes to search and TUI.
4078963|9028c6f||Resume and browse cloud sessions and cloud p
9028c6f|dbfa819||Ignore
dbfa819|117f5d2 982c152||Merge branch 'dev' into cloud-resume
117f5d2|5719b0f||SpecStory histories.
5719b0f|293e32a||Initial chunk of Cloude resume work, DB upda
293e32a|dc16a5a 8930eeb||Merge branch 'dev' into skills-interface
dc16a5a|1574338|refs/heads/skills-interface|feat(skills): add 'skills agents --json' for
1574338|8db7edd||fix(skills): align selected row + add a crea
8db7edd|8eea7b4||polish(skills): visible drift, live run badg
8eea7b4|6573575||feat(skills): two-tab TUI — Library + Run Ac
6573575|0eff465||feat(cloud): SPECSTORY_CLOUD_URL env var to 
0eff465|94325df||feat(skills): kick off and watch mining runs
94325df|4a55fc0||refactor(skills): run TUI network actions as
4a55fc0|9237ccf||feat(skills): browse, approve, and install c
4cebdb6|90888b9||feat(copilotide): variant-driven provider fo
90888b9|f90f3b4||perf(cursoride): cap tool output runes witho
f90f3b4|453175d||polish(copilotide): resolve remaining review
453175d|a0b7116 f2e46ca||Merge branch 'cursor-ide' into copilot-ide
f2e46ca|1831422||fix(watch): dedupe callbacks by content fing
a0b7116|21fd78e||fix(watch): dedupe callbacks by content fing
21fd78e|ef021f2||fix(copilotide): dispatch watcher callbacks 
ef021f2|2562813||fix(copilotide): apply JSONL updates with nu
2562813|026969d||perf(copilotide): apply JSONL updates on a s
026969d|02cb996||fix(copilotide): don't debounce away retries
02cb996|e003caf||fix(copilotide): generate slugs via the shar
e003caf|0df119d||fix(copilotide): correct tool matching for h
0df119d|d81714e 1831422||Merge branch 'cursor-ide' into copilot-ide
1831422|8f36447||test(cursoride): use strings.Contains instea
8f36447|574fb37||fix(cursoride): emit thinking as a dedicated
574fb37|081bbaf||feat(cursoride): pre-render all tool invocat
d81714e|0c229eb||Rollback not needed change to session/markdo
0c229eb|c01abce 081bbaf||Merge branch 'cursor-ide' into copilot-ide
081bbaf|9ec3ab6||Improve workspace.codeWorkspaceContainsFolde
c01abce|0f4f95d||Rollback changes to cursoride provider
0f4f95d|5dee524||feat(copilotide): support Copilot IDE as a c
5dee524|501ec4d||fix(copilotide): reassemble fragmented respo
501ec4d|8561f53||feat(copilotide): implement resume-support S
8561f53|78d41e4 9ec3ab6||Merge branch 'cursor-ide' into copilot-ide
9ec3ab6|14e6738||feat(cursoride): match workspace entries via
78d41e4|891ba37 14e6738||Merge branch 'cursor-ide' into copilot-ide
14e6738|ccfcbc6 982c152||Merge branch 'dev' into cursor-ide
982c152|7fe838f|tag: refs/tags/v2.1.0, tag: refs/tags/specstory-cli/v2.1.0|Fix doc location.
7fe838f|8930eeb||Session and project delete from index. Searc
ccfcbc6|542322b||Fix more doc allucinations
542322b|cf003f4||fix(cursoride): remove nonexistent extension
cf003f4|c126a82 0861a84||Merge branch 'cursor-ide' of github.com:spec
0861a84|73382a4 7147f55||Merge branch 'cursor-ide' of github.com:spec
73382a4|5181c7f||fix(cursoride): escape directory path in glo
c126a82|7147f55||fix(cursoride): fall back to raw error text 
7147f55|785ccb0||fix(cursoride): stop nesting <details> block
785ccb0|f797e54||fix(cursoride): match vscode-remote://tunnel
f797e54|21cfa8f||fix(cursoride): escape directory path in glo
21cfa8f|5181c7f||fix(cursoride): match dev container workspac
5181c7f|c649675||fix(cursoride): percent-encode workspaceIden
c649675|d2925c1||fix(cursoride): escape backticks in markdown
d2925c1|d439d91||fix(cursoride): restrict basename workspace 
d439d91|804ce16||fix(cursoride): watch database parent direct
804ce16|e31ad66||fix(cursoride): address latest Copilot revie
e31ad66|6d7965e||fix(cursoride): address remaining Copilot re
6d7965e|a47fea7||fix(cursoride): correct markdown heading + b
a47fea7|91f465b||Remove specstory dir from git ignore
91f465b|ac93d1a||test(cursoride): add agent_session_test.go c
ac93d1a|3961c4b||fix(cursoride): populate SessionData.Workspa
3961c4b|2bea91d||fix(cursoride): pick most recently used work
2bea91d|14a9c1d||fix(cursoride): don't throttle the watcher's
14a9c1d|758273b||fix(cursoride): escape tool content before w
758273b|4dc845c||fix(cursoride): track watcher goroutines so 
4dc845c|0290b8c||fix(cursoride): assign exchangeId by index i
0290b8c|ae4a16a||fix(cursoride): don't advance watch watermar
ae4a16a|703f8aa||fix(cursoride): wire multi-workspace matchin
703f8aa|b5c8ca5||fix(cursoride): render tool invocations once
b5c8ca5|5515b29||fix(cursoride): sanitize session slug throug
5515b29|df8316f||fix(cursoride): recover panics in session ca
df8316f|4ec60b1||feat(cursoride): implement session reconstru
4ec60b1|d3eb797||Fix WAL mode set and sqlite connection pool 
d3eb797|713f3aa||feat(cursoride): implement ListAllAgentChatS
713f3aa|e07f682||Agent analysis of Cursor IDE provider gaps.
e07f682|f74f394 8930eeb||Merge branch 'dev' into cursor-ide
8930eeb|0a3cb77|tag: refs/tags/v2.0.0, tag: refs/tags/specstory-cli/v2.0.0|Doc update.
0a3cb77|3e1848e ceb4147||Merge pull request #244 from specstoryai/ses
ceb4147|148fc83||SpecStory histories.
148fc83|bae95a3||Code cleanup.
bae95a3|899c961||Code cleanup.
899c961|289d8bd||SpecStory histories.
289d8bd|e3b9ed0||Code cleanup.
e3b9ed0|d418eb0||Address a potential deadlock during reindex.
d418eb0|e20ed65||SpecStory histories.
e20ed65|ffe23b0||Code cleanup.
ffe23b0|ef5a52a 3e1848e||Merge branch 'dev' into session-portability
3e1848e|c197ec7 8f911b8||Merge #237: skip rendering content-less mess
8f911b8|9e530ef||review fixes: gate hasRenderableContent on r
9e530ef|367c97c||fix(markdown): skip rendering content-less m
ef5a52a|9237ccf||Fix flags for 'search' and 'resume' since th
9237ccf|4d1780d|refs/heads/session-portability|Minor code cleanup.
4d1780d|ee0a638 c197ec7||Merge branch 'dev' into session-portability
c197ec7|36f99b9 9098dde||Merge #238: respect CODEX_HOME when locating
9098dde|124064a||fix(codex): why-comment + hermetic table-dri
124064a|367c97c||fix(codex):respect CODEX_HOME when locating 
ee0a638|f7a7da9||SpecStory histories.
f7a7da9|cc138ae||Session.db index work.
cc138ae|4b0a15a||Remove quadratic perf. issue in 'sync' for C
4b0a15a|018da3f||SpecStory histories.
018da3f|50d0814||reindex: live scan progress + parallel Claud
50d0814|e45daa3||reindex: parallelize Codex enumeration scan 
e45daa3|bf2166e||Make 'specstory reindex' O(N) instead of O(N
bf2166e|be5d1f5|refs/heads/checkout|Improve UX of project selection in search.
be5d1f5|d7ff4cb||Minor UX improvements around agent filtering
d7ff4cb|9736a59||Minor UX improvements in resume/search.
9736a59|bf0d96e||Fix handling of punctuation in FTS so same p
bf0d96e|869f671||Keep session.db index up to date during 'spe
869f671|ed092bf 36f99b9||Merge branch 'dev' into session-portability
36f99b9|66c724a 12ad90d||Merge pull request #243 from specstoryai/geo
12ad90d|928ea01||chore: tidy .gitignore (terser deadreckon co
928ea01|f3473a4||fix: do not commit local .specstory artifact
f3473a4|378302d||fix: stop deleting dev-tracked .specstory; d
378302d|ffd3e49||docs: rename workthreads as-built file (AS-B
ffd3e49|2d06759||docs: replace per-run deadreckon audit docs 
2d06759|9fd73f2||refactor(lore): revert to dev - threads feat
9fd73f2|6d3dbe0||docs(workthreads): drop the inside-baseball 
6d3dbe0|3f17371||refactor(workthreads): make it a fully stand
3f17371|0a465d9||chore: stop tracking deadreckon-plan-consoli
0a465d9|097cb11||docs(workthreads): give the skill its own to
097cb11|ed5e6a5||test(workthreads): lock in clustering-qualit
ed5e6a5|149741d||fix(workthreads): robust clustering - within
149741d|eab2ac1||feat(workthreads): add threads subcommand + 
eab2ac1|66c724a||chore(workthreads): gitignore deadreckon/spe
ed092bf|c594490||SpecStory histories.
c594490|38ce396||Missed file.
38ce396|ad57f22||Stronger 3rd arg for agent in 'specstory res
ad57f22|8b4f1f8||Proper handling of phrase search in FTS of s
8b4f1f8|9d7d822 e70af01||Merge branch 'session-portability' of github
e70af01|3ab0db4||Fix cross-project resume loading source from
9d7d822|3ab0db4||Lazy snippets in FTS for 'resume' and 'searc
3ab0db4|522572c||Session for context for Jake.
522572c|2ed90fc||Address likely race condition it file writes
2ed90fc|e3f5509||Implement 'specstory search' based on the wo
e3f5509|b526afa||Improve FTS UX with the sqlite 'snippets' hi
b526afa|d68fda5||Fill some session naming gaps in 'specstory 
d68fda5|5119c4e||Cross-project resume in the resume TUI.
5119c4e|af21305||Initial 'specstory resume' TUI based on the 
af21305|6aa1696||Create a ~/.specstory/session.db with 'specs
6aa1696|cc01d7c 66c724a||Merge branch 'dev' into session-portability
66c724a|416dc0b||Update Go.
416dc0b|582ba1c 740c7f8||Merge pull request #229 from specstoryai/dep
740c7f8|959bd86||Bump go.opentelemetry.io/otel/exporters/otlp
582ba1c|959bd86 4a936b5||Merge pull request #225 from specstoryai/dep
4a936b5|959bd86||Bump actions/checkout from 4 to 7
959bd86|e1e01a1 654f64c||Merge pull request #226 from specstoryai/dep
654f64c|4e38e7b||Bump goreleaser/goreleaser-action from 6 to 
e1e01a1|c6343fc 698ad6b||Merge pull request #227 from specstoryai/dep
698ad6b|4e38e7b||Bump actions/setup-go from 5 to 6
c6343fc|bb774e7 fcbb688||Merge pull request #228 from specstoryai/dep
fcbb688|4e38e7b||Bump golangci/golangci-lint-action from 7 to
bb774e7|39dc4a5 c93df79||Merge pull request #230 from specstoryai/dep
c93df79|86a1d35||Bump go.opentelemetry.io/otel/sdk in /specst
cc01d7c|0981e7a||Add Cursor CLI as a target for cross-agent s
0981e7a|367c97c||Work on agent session portability.
f74f394|a1c8724 39dc4a5||Merge branch 'dev' into cursor-ide
891ba37|190bafa 39dc4a5||Merge branch 'dev' into copilot-ide
39dc4a5|86a1d35||SpecStory histories.
86a1d35|e1ab75f 6c0fec1||Merge pull request #232 from specstoryai/dep
6c0fec1|4e38e7b||Bump github.com/posthog/posthog-go in /specs
e1ab75f|367c97c d978183||Merge pull request #233 from specstoryai/dep
d978183|4e38e7b||Bump golang.org/x/term from 0.40.0 to 0.44.0
367c97c|e674092||Update README.md
e674092|525b4d8||docs(lore): warn dev installs about npx-skil
525b4d8|4486f3d|tag: refs/tags/lore/v3.9.0|fix(lore): redact secrets at the emit bounda
4486f3d|d3741ab||fix(lore): manifest homepage links use the d
d3741ab|1437da6||docs(lore): Cursor row in the invocation tab
1437da6|5b35f47||docs(readme): shorten Lore row's Supported A
5b35f47|2022177||docs(lore): plugin-marketplace install as th
2022177|2239feb||docs: Lore row in the Installation table; sc
2239feb|8dee8d6||docs(readme): simpler Lore section with inst
8dee8d6|0b2e8de||docs(lore): one-command install, npx update 
0b2e8de|88b582c||docs(lore): fix release badge - live tag-fil
88b582c|4e38e7b||docs(readme): full Lore section above SpecSt
4e38e7b|25a957a|tag: refs/tags/lore/v3.8.2|feat(lore): import SpecStory Lore at v3.8.2
190bafa|375f668 a1c8724||Merge branch 'cursor-ide' into copilot-ide
a1c8724|28c2fb9 25a957a||Merge branch 'dev' into cursor-ide
25a957a|e17cbed 89b52dc|refs/heads/main|Merge pull request #219 from danxtshake/fix/
89b52dc|49a3aab||fix: update install.sh filename prefix to Sp
e17cbed|c3379d3||Fix tarball artifact name in install.sh scri
c3379d3|8d9f7b8|tag: refs/tags/v1.13.0, tag: refs/tags/specstory-cli/v1.13.0|Update README for DeepSeek TUI.
8d9f7b8|a1c596c|refs/remotes/KiBlazer/feat/deepseek-provider|Very minor code and docs cleanup.
a1c596c|0a73359||Update pkg name for DeepSeek TUI provider.
0a73359|cdb5d18||Minor code cleanup.
cdb5d18|6675fa6||Update docs for DeepSeek TUI.
6675fa6|739d678||Minor code cleanup.
739d678|de22e59||Format provider registry for lint
de22e59|6c6f211||Add DeepSeek to config system for full provi
6c6f211|78b7287||Fix DeepSeek provider review issues
78b7287|49a3aab||feat: add DeepSeek TUI provider
375f668|e0bf988||Revert "Fix URI-to-path conversion for Windo
e0bf988|611c789||Fix URI-to-path conversion for Windows mappe
611c789|a1c4fb4||Use the same agent name as for sync during r
a1c4fb4|09437c3 28c2fb9||Merge branch 'cursor-ide' into copilot-ide
28c2fb9|97817dc||Use the same agent name as for sync during r
09437c3|4b4dbd8||Support .code-workspace file path as --proje
4b4dbd8|3f30928 97817dc||Merge branch 'cursor-ide' into copilot-ide
97817dc|7dbfdef||Fix cursoride session discovery for .code-wo
3f30928|75a4bf9 7dbfdef||Merge branch 'cursor-ide' into copilot-ide
7dbfdef|218351b 49a3aab||Merge branch 'main' into cursor-ide
49a3aab|eff57e9|tag: refs/tags/v1.12.0, tag: refs/tags/specstory-cli/v1.12.0|Fix Droid CLI provider dir watching.
75a4bf9|fe553f3 218351b||Merge branch 'cursor-ide' into copilot-ide
218351b|7154eb9||Support for Cursor 3
fe553f3|ab62730 7154eb9||Merge branch 'cursor-ide' into copilot-ide
7154eb9|9c5ecde eff57e9||Merge branch 'dev' into cursor-ide
eff57e9|52427c7||Update changelog.
52427c7|e5f5a13 111dde0||Merge branch 'dev' into lower-case-filenames
111dde0|d0b4811||Update changelog.
d0b4811|c0578d5||Update specstory-cli/pkg/spi/path_utils.go
c0578d5|addcf69||Minor code cleanup.
addcf69|db96db6||Some times the first user message is not a s
e5f5a13|865466e||Tests for lowercase filenames
865466e|db96db6||Make sure all filenames are lowercase for ba
ab62730|72fc500 9c5ecde||Merge branch 'cursor-ide' into copilot-ide
9c5ecde|9ccbe39||Fix secondary race condition where user mess
72fc500|eef7214 9ccbe39||Merge branch 'cursor-ide' into copilot-ide
9ccbe39|ab7309f||Resolve a race condition in Cursor IDE where
eef7214|70ca4f4 ab7309f||Merge branch 'cursor-ide' into copilot-ide
ab7309f|95c2aa4 ca3ff72||Merge branch 'cursor-ide' of https://github.
ca3ff72|eafe5d3||Further cleanup of file slugs in Claude Code
95c2aa4|eafe5d3||Fix cursoride tool stats missing from OTel t
70ca4f4|bf92a19||Handle Copilot kind 2 messages, append messa
bf92a19|9db3328 eafe5d3||Merge branch 'cursor-ide' into copilot-ide
eafe5d3|4f0cf64||Linting
4f0cf64|d0aa042 db96db6||Merge branch 'dev' into cursor-ide
db96db6|4932499|tag: refs/tags/v1.11.0, tag: refs/tags/specstory-cli/v1.11.0|Fix 2 issues w/ Gemini CLI provider.
4932499|8b88581||Minor code cleanup. Changelog.
8b88581|71d556c 3a5968d||Merge branch 'dev' into pr-178
3a5968d|3f29283||Minor update to Claude Code commands.
71d556c|56cbc6a||fix(claudecode): skip TEXTBLOCK title genera
9db3328|905757e d0aa042||Merge branch 'cursor-ide' into copilot-ide
d0aa042|ed1da72 3f29283||Merge branch 'dev' into cursor-ide
3f29283|4e5631b||Minor code cleanup.
4e5631b|fa5b983||Minor code cleanup
fa5b983|6ccd5a7||Code cleanup.
6ccd5a7|e08e757||Minor code cleanup.
e08e757|660068f||Adjust stats gathering read/writes to be jus
660068f|87bf0fb||Minor formatting change.
87bf0fb|ef0b7a4||Minor code cleanup.
ef0b7a4|677778f||Improve sync output. Remove statistics statu
677778f|822e255||Add 'agent_message_count' to 'statistics.jso
822e255|058791c||Fix CLI output when '--only-stats' flag is u
058791c|24ecaa5||Changelog for new version.
24ecaa5|f3126f1 26ae3b3||Merge branch 'dev' into feat/sync-stats
f3126f1|d58e9d1 56cbc6a||Merge branch 'dev' into feat/sync-stats
d58e9d1|38d123a fd493b8||Merge branch 'dev' into feat/sync-stats
38d123a|490366d 42484af||Merge branch 'dev' into feat/sync-stats
490366d|83ed8ed c35758b||Merge branch 'dev' into feat/sync-stats
83ed8ed|2adb8c2||Replace --no-local-save and --stats with a s
2adb8c2|d3e5c3b||Collect and write stats to .specstory/statis
905757e|0ca1d2e ed1da72||Merge branch 'cursor-ide' into copilot-ide
ed1da72|f029703 26ae3b3||Merge branch 'dev' into cursor-ide
26ae3b3|6d2016c|tag: refs/tags/v1.10.0, tag: refs/tags/specstory-cli/v1.10.0|Minor code improvements.
6d2016c|7d3ba13||SpecStory histories.
7d3ba13|ed31bf3||Minor code cleanup.
ed31bf3|c8ce831||Typo.
c8ce831|ef23aba||Typo.
ef23aba|b2062b1||Minor code cleanup.
b2062b1|4b86ec6||Minor code improvements.
4b86ec6|7b2ec16||Fix typo.
7b2ec16|0f3d2e0||Code cleanup.
0f3d2e0|c2a93b2||Remove committed binaries.
c2a93b2|1f76b5a||Telemetry logging. Improve docs.
1f76b5a|c08a443||Update docs.
c08a443|2df3ea5||Fix typo.
2df3ea5|b1bad58||Minor fixes.
b1bad58|3cff0ff||Minor code cleanup.
3cff0ff|c587667||Minor code cleanup.
c587667|74b5bb7||Move telemetry flags to the respective comma
74b5bb7|321e760 5ac1d6d||Merge branch 'dev' into otel-metrics
5ac1d6d|2d228dd||Update 'check' command help output.
2d228dd|4fddd2f|tag: refs/tags/v1.9.0, tag: refs/tags/specstory-cli/v1.9.0|Check config file validity with 'specstory c
4fddd2f|6a44268||Use provider command from config file for 's
6a44268|c44f03d||Create project level config on project level
c44f03d|435d9df||Work on config file creation, contents, and 
435d9df|0dbcf6b||Move config file location to existing cli di
0dbcf6b|d360750||Update agent directives.
d360750|9053122 6bbfcca||Merge branch 'dev' into config-file-support
321e760|339fc8a||Fixing telemetry no-op
339fc8a|726e7ca||Session helpers tests
726e7ca|ab90fc0||Fixing some more feedback
ab90fc0|4cca57f 9053122||Merge branch 'config-file-support' into otel
9053122|0be6367||Cleaning up unnecessary bits from tests
4cca57f|0b57325 0be6367||Merging in config file support branch
0be6367|8efd0ce||Fixing some issues and a small bit of code c
8efd0ce|0d2b33f 56cbc6a||Merge branch 'dev' into config-file-support
0b57325|41eb731 f241fed||Pulling latest
f241fed|135697d||Adding in Droid CLI token tracking support
135697d|9939523||Shift the token attribute information
9939523|c3169fb||Add telemetry for gemini cli token tracking
c3169fb|5f590c5||Adding in an option to disable sending of pr
`;

export interface FixtureCommit {
  readonly hash: string;
  readonly parents: readonly string[];
  /** Raw `%D` decoration, kept so ref-driven behaviour can be tested too. */
  readonly decoration: string;
  readonly subject: string;
}

function parse(): readonly FixtureCommit[] {
  const commits: FixtureCommit[] = [];
  for (const line of RAW.split('\n')) {
    if (line.length === 0) continue;
    const [hash = '', parents = '', decoration = '', subject = ''] =
      line.split('|');
    if (hash.length === 0) continue;
    commits.push({
      hash,
      parents: parents.split(' ').filter((p) => p.length > 0),
      decoration,
      subject
    });
  }
  return commits;
}

/** Newest first, topological order, 400 commits. */
export const GETSPECSTORY_TANGLE: readonly FixtureCommit[] = parse();

/** HEAD's tip at capture time (`refs/heads/dev`). */
export const GETSPECSTORY_HEAD = '210d609';
/** The upstream's tip at capture time (`refs/remotes/origin/dev`). */
export const GETSPECSTORY_UPSTREAM = '3de8b77';
/** `git merge-base dev origin/dev` at capture time. */
export const GETSPECSTORY_MERGE_BASE = '210d609';

/**
 * Widest lane count `git log --graph` itself drew, per window, measured on the
 * same capture (2 prefix characters per lane).
 *
 * These are CEILINGS, not equalities. git compacts a freed column within the
 * row it frees it (its `|/` rows); the swimlane model holds the slot until the
 * next row, which is the honest price of one self-contained SVG per row. The
 * gap is a rendering choice, not a topology difference — research 24 §4.2.
 */
export const GIT_MAX_LANES: Readonly<Record<number, number>> = {
  50: 4,
  200: 9,
  400: 11
};
