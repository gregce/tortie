# Research 58 evidence

Five files, kept so a later reader does not have to take a sentence in
`docs/research/58-agents-per-machine.md` on trust. Investigator 2 produced all
five on 2026-08-19. The committer copied them out of the scratch worktree
unchanged, so the byte counts below are the ones the document cites.

| File | Bytes | What it is |
| --- | --- | --- |
| `agents-find-hard.sh` | 975 | The measured text of the proposed thirteenth read script. It takes three values, tests `[ -f ]` together with `[ -x ]`, separates records with newlines and folders with colons, and names unreadable folders in a second payload section. Investigator 2 ran it under three shells with byte identical output |
| `answer.hard` | 270 | What the operator's Mac Pro answered for the 11 launchable registry entries. Eleven record lines, of which 2 name a path |
| `answer.hard13` | 305 | The same read widened to 13 names, which is the count section 2.7 rules against asking for |
| `cmd.hard` | 1703 | The whole composed command for the 11 launchable agents, being the number section 2.4 puts at 1.3 % of `REMOTE_SCRIPT_MAX_BYTES` |
| `cmd.hard13` | 1718 | The same composition for 13 names |

Check the two size claims with `wc -c docs/research/assets/58/cmd.hard
docs/research/assets/58/cmd.hard13`.

## What these files are not

They are not a script the product ships. Nothing here is wired to anything, and
Phase 109 is where the text becomes a row of `REMOTE_SCRIPTS` in
`src/main/machines/remote-scripts.ts`. The answers came from one Mac Pro over
one tailnet on one day, and no Linux machine was contacted by anybody in this
round. The scratch directory also held the operator's `known_hosts` and a
control socket, and neither was copied here.
