# Phase 83 evidence

Four files, each the raw output of one command, kept so a later reader does not
have to take a sentence on trust. Every run was made on this Mac on 2026-08-18.

| File | What produced it | What it shows |
| --- | --- | --- |
| `p83-local-3.7c.json` | written by hand from the two runs below | the four exec shapes and the eight control steps for tmux 3.7c, in one place. `GMUX_P83_LOCAL` points at this file so `npm run probe:realmachine` can print the local answer beside the far machine's |
| `p83-execplane-3.7c.txt` | `PATH=build/vendor/tmux-probe/3.7c/bin:$PATH node build/probe-execplane.mjs` | 19 steps, all measured, exit 0. Step 10 reads the version and reports ACCEPTED, which is the row this phase added |
| `p83-controldialect-3.7c.txt` | `npm run probe:controldialect` against the built 3.7c | 22 rows. The 3.7c control stream matched a local child of the same version on all eight comparable steps |
| `p83-controldeadline.txt` | `npm run probe:controldeadline` | a live connection that is opened and never greeted is taken away inside the deadline and the machine keeps the timer feed. This is the phase's proof that a hang is impossible |

## What these files are not

They were all taken against a scratch sign in program on 127.0.0.1, whose far
side is this Mac. No number here came from another computer. The 3.7c binary is
an upstream tarball built by `node build/build-tmux-version.mjs 3.7c`, and it is
not Homebrew's build, which is what the operator's Mac Pro runs.
