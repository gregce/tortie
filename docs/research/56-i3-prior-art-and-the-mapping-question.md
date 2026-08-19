# Research 56, investigator 3: prior art on remote project models, and the mapping question

Author: prior art investigator for Research 56.
Date written: 2026-08-18.
Method: live web only. I did not read Tortie's codebase, as instructed. Every external claim below carries a URL and the date I fetched it. All fetches happened on 2026-08-18.

---

## The three answers the decision needs

### 1. Does the prior art support building model A, a remote project as its own tab?

It supports it, and it supports it unanimously. Every product I checked that solved this problem binds one window, or one project, to exactly one host. VS Code Remote SSH does it. VS Code Remote Tunnels does it. Zed does it. JetBrains Gateway does it. Two of them refused the alternative in writing when users asked for it, with dates and names attached.

Model A is the same answer four independent teams reached. I found no product that shipped anything else and kept it.

The prior art adds one detail. Tortie's unit should be the tab rather than the window. VS Code could not do that, because a VS Code window connects to a stateful server process on the far machine and everything in the window inherits that connection. Tortie holds one long lived ssh connection per machine at the app level, so the connection is not what forces the boundary. Tortie can therefore put two machines in one window as two tabs, which is a better shape than any of them managed.

### 2. Model B was refused because none of the operator's 11 project folders exists on his Mac Pro today. Does the prior art treat "the same repository checked out on both machines" as the normal case?

Yes, it treats it as the normal case, and it treats it as the dangerous case. The refusal of B is correct. The reason recorded for it is not, and it will expire.

The reason as given is an argument about an empty inventory. It is true today and it stops being true the first time the operator runs `git clone` on the Mac Pro, which he set up hours ago. A design rule that a person can invalidate with one command in one afternoon is not a design rule.

The prior art shows the same-checkout-on-both-machines case is exactly what broke in the one product that let it happen. Microsoft's bug report reproduces it step by step, in the filer's own words ([microsoft/vscode issue 190566](https://github.com/microsoft/vscode/issues/190566), filed 2023-08-16, closed 2023-12-12, fetched 2026-08-18):

1. Clone a repo (r1) to a server s1.
2. Change any file (f1).
3. In Terminal, SSH to another server (s2).
4. Clone same repo r1 to that server s2 in the same location as on server s1.
5. List file (f1) on server s2.
6. Ctrl+click on that file name (f1).
7. Observe that editor will open f1 version from s1.

The filer's own summary of the harm is the sentence to quote. "In the first example file being opened is a local copy of that file as location of the file is the same both locally and on a remote server (as both machines have same file system type). This can lead to confusion as user will be looking at the wrong version of the file. ... Currently you get an editor and path in the tab name looks fine. In reality it's local copy of the file and not from a remote server."

So the correct sentence for the research document is not "there is no pair, so a mapping has nothing to hold". It is "a mapping is most dangerous exactly when the pair exists, and the pair existing is the normal case for everyone else who solved this".

B should be refused on the design argument, which is that a project holding two live paths keeps a live chance of resolving the wrong one, and on the record of three closed issues at Microsoft. Those are given in section 6 below.

One more thing the team lead should know. The investigator assigned to the mapping question died before reporting, so B was refused with no dedicated investigation. The ruling does not depend on that investigation. The prior art refuses B on its own. The ruling is safe. The reason under it is not.

### 3. Model C was refused because four stores return early on an unchanged path string. Is that a reason to refuse the design, or a bug in those four stores?

It is a bug in those four stores, and it would have to be fixed under any design including A. I am picking that conclusion plainly, as asked.

`useFileTree.setRoot`, `useTreeGitStatus.setRepo`, `useSearch.syncProject` and `useContext.syncProject` returning early when the path string is unchanged is wrong the moment a second machine exists. Under model A, a person with `/Users/gdc/gmux` on the Mac and `/Users/gdc/gmux` on the Mac Pro gets two tabs. Switching between those two tabs hands each store the same path string. All four early-return. The badge changes and the tree does not. That is the same silent wrong answer, in the model that was chosen, and building A does not avoid it.

The real finding in those four call sites is not "C is unsafe". It is "the cache key is a path string, and a path string is not an identity". That is the one thing every product in the prior art agrees on, and they agree on it across a 20 year gap. VS Code puts the host inside the identifier as `vscode-remote://ssh-remote+${host}${path}`. Emacs TRAMP puts the host inside the file name as `/ssh:user@host:path`. Neither will let an operation be built from a bare path.

The fix is to make the key the pair `(machine, path)` in all four stores. Under A that fix is required for correctness, not optional.

Refusing C is still the right call. It needs a different reason, and the prior art supplies two. First, C makes the host of every surface implicit and derived from focus, so a keystroke changes which machine your git reads run against, with no explicit act by the person. A makes it explicit. Second, the only product that ships C is Emacs with TRAMP, and its recorded cost is that connections start when nobody asked for them, because packages such as `recentf` and `desktop.el` touch remote file names at load time and block.

The document should also say plainly that C is more feasible for Tortie than it was for VS Code, rather than implying C is impossible. Rob Lourens's reason for closing the VS Code bug was that the window "doesn't know that you ran ssh and connected to a different machine". Tortie does know, because Tortie launched the session. The useful half of C survives inside A anyway, since focusing a session moves you to its tab and the surfaces re-target as a unit.

---

## 0. Ruling in one paragraph

The prior art supports candidate A, and it warns against candidate B by name and in writing. Every product studied that installs software on the far machine binds one window to exactly one host, and two of them refused the B shape in their issue trackers with reasons attached. Candidate C exists in exactly one shipped product, Emacs with TRAMP, and that is the one product in the set that installs nothing on the far machine, which is a signal for Tortie rather than a coincidence. The single deciding reason is this. Every product that solved this made the host part of the identity of every path, so that no operation can be built from a path alone, and candidate B is the only one of the three that keeps two live paths for one project and therefore keeps a live chance of resolving the wrong one. Microsoft has that failure written up as a closed bug where a person was silently shown the local copy of a file while the tab title looked correct.

---

## 1. VS Code Remote SSH

A VS Code window binds to one host through a resolved authority string such as `ssh-remote+myubuntubox`. Every path in that window becomes a URI of the form `vscode-remote://ssh-remote+${host}${path}` ([vscode-remote-release issue 8764](https://github.com/microsoft/vscode-remote-release/issues/8764), opened 2023-07-27, closed, fetched 2026-08-18). The host is inside the identifier, not beside it.

The CLI keeps the two apart as `code --remote <authority> <path>`. A request to merge them into one URI argument was closed without being adopted ([issue 1530](https://github.com/microsoft/vscode-remote-release/issues/1530), opened 2019-10-01, closed 2019-10-29, fetched 2026-08-18). That is a small precedent worth copying. Two typed fields survive better than one string that can pass for a path.

VS Code installs a server. The docs say the extension "will install VS Code Server on the remote OS" and that the server "is independent of any existing VS Code installation on the remote OS" ([code.visualstudio.com/docs/remote/ssh](https://code.visualstudio.com/docs/remote/ssh), fetched 2026-08-18). The same page lists a floor the remote machine must already meet, being an SSH server, `/bin/bash`, `tar`, `curl` or `wget`, kernel 3.10 or newer, glibc 2.17 or newer, and libstdc++ 3.4.18 or newer. It recommends at least 2 GB of RAM and a 2 core CPU, with 1 GB of RAM as the minimum. So even the product that markets itself as needing no manual setup states a requirements list. Tortie's floor is lower, and the research document should say so.

One window cannot hold both a local and a remote folder. Erich Gamma closed the request 14 minutes after it was filed ([issue 706](https://github.com/microsoft/vscode-remote-release/issues/706), opened 2019-06-17T06:38:29Z, closed 2019-06-17T06:52:25Z, fetched 2026-08-18):

> Having a mixed workspace would require that a workspace extension can be active both locally and remotely. Currently an extension can only be active once, either locally or remotely. So this is currently not possible and we have no plans to support this. The recommendation is to have separate windows open for the local and remote workspace.

The team gave a second reason that is about product design rather than about architecture. Eleanor Boyd, closing the request to open a local folder while connected over SSH ([issue 8088](https://github.com/microsoft/vscode-remote-release/issues/8088), closed 2023-02-27, follow-up comment 2023-02-28, fetched 2026-08-18):

> We by design only access the files which your remote has access to since our extension allows you act on your remote machine independent of your local one. We are only displaying a gateway to the remote and therefore do not want to confuse the two different file systems together. Our goal of the extension is the align with the natural behavior or ssh and this is ssh handles file systems (like when you ssh to a remote you can't access local files for example from that terminal you are connected with).

That is the sentence to quote in the final document. It is a deliberate refusal of B, stated as a product decision.

The window always says which host it is on. The docs state "You can always refer to the Status bar to see which host you are connected to."

Search does not depend on the remote machine having ripgrep. VS Code ships its own copy inside the server payload. A bug report gives the exact path on the remote, being `/home/user/.vscode-server/cli/servers/Stable-<hash>/server/node_modules/@vscode/ripgrep/bin/rg` ([issue 11556](https://github.com/microsoft/vscode-remote-release/issues/11556), fetched 2026-08-18). Read that bug twice. VS Code "passes that URI string verbatim as the `cwd` for the ripgrep process", so a `vscode-remote://` URI reaches a system call that wanted a filesystem path, and the process dies with `spawn ... rg ENOENT`, which names the wrong culprit. The lesson for Tortie is that every place a host-qualified identifier is converted back into a plain path is a bug site.

## 2. VS Code Remote Tunnels

Remote Tunnels changes the transport and changes nothing about the model. The person runs `code tunnel` on the remote machine, which downloads and starts VS Code Server there, and the client window still binds to one machine ([code.visualstudio.com/docs/remote/tunnels](https://code.visualstudio.com/docs/remote/tunnels), fetched 2026-08-18). Two stated limits matter here. An instance of the server is designed to be accessed by one user or client at a time. The remote machine is reachable only while VS Code keeps running there. Both are reasons this design does not transfer to Tortie, because both depend on a process Tortie has decided not to start.

## 3. JetBrains Gateway and Remote Development

JetBrains moved the whole IDE to the far machine. The remote host is "a physical or virtual machine to host the source code and run headless IntelliJ IDEA or other IDE that will perform most of the IDE features" ([jetbrains.com/help/idea/faq-about-remote-development.html](https://www.jetbrains.com/help/idea/faq-about-remote-development.html), fetched 2026-08-18). The local side is a thin client that draws a UI for one backend. Plugins are installed per project on the backend, using `remote-dev-server installPlugins <PLUGIN_ID1> <PLUGIN_ID2> ...` ([jetbrains.com/help/idea/remote-development-overview.html](https://www.jetbrains.com/help/idea/remote-development-overview.html), fetched 2026-08-18). Gateway supports Linux servers only, and the Toolbox App adds macOS and Windows.

The consequence for the project model is the strongest form of A in the set. A client window is a view of one backend IDE, and one backend IDE has one project loaded. There is no mechanism by which a JetBrains client window could show a local tree and a remote tree at once, because the tree is drawn by the far machine. This answer does not transfer to Tortie at all, since it depends entirely on running a full IDE on the far side.

## 4. JetBrains Fleet, which is the cautionary tale

Fleet is the one product that promised candidate B outright. JetBrains described an architecture split into frontend, backend, workspace server and file system watcher, and said that through a virtualized file system Fleet "can work with local and remote projects equally well", whether the project is "local, in a container, or in another country thousands of miles away" ([blog.jetbrains.com/blog/2021/11/29/welcome-to-fleet/](https://blog.jetbrains.com/blog/2021/11/29/welcome-to-fleet/), published 2021-11-29, fetched 2026-08-18).

JetBrains discontinued Fleet. "Starting December 22, 2025, Fleet will no longer be available for download." The stated reasons are about product strategy rather than about the remote model. "We could neither replace IntelliJ IDEA with Fleet nor narrow it into a clear, differentiated niche." The platform and team continue under a new agentic product ([blog.jetbrains.com/fleet/2025/12/the-future-of-fleet/](https://blog.jetbrains.com/fleet/2025/12/the-future-of-fleet/), fetched 2026-08-18).

I want to be careful here. Fleet was not killed by its remote model, and I found no JetBrains statement blaming the virtualized file system. What the record supports is narrower and still useful. The only vendor that built the transparent local-and-remote-are-the-same abstraction spent four years on it, shipped it to a market that did not adopt it, and no competitor copied the design in that time.

## 5. Zed

Zed is closest to Tortie's shape and is the most recent design in the set. It also installs a server. The docs say Zed checks `~/.zed_server` for a version-matched binary and downloads it from `https://zed.dev`, or downloads it locally and uploads it over ssh when `upload_binary_over_ssh` is set ([zed.dev/docs/remote-development](https://zed.dev/docs/remote-development), fetched 2026-08-18). Supported remotes are macOS Catalina or later on Intel or Apple Silicon, and Linux on x86_64 or arm64. Windows is not supported as a remote server.

The split is the same one Tortie already has. The local machine runs the UI, the model calls, the Tree-sitter parsing and the unsaved changes. "The source code, language servers, tasks, and the terminal all run on the remote server."

Zed reuses one ssh ControlMaster connection per host and runs the server as a daemon so that "when connections do drop the remote server continues running and on reconnect your language servers are still fully initialized" ([zed.dev/blog/remote-development](https://zed.dev/blog/remote-development), fetched 2026-08-18). Tortie already holds one long lived connection per machine, so that part of Tortie's design is confirmed by an independent build.

Zed's settings shape is `"projects": [{ "paths": [...] }]` nested under a single host. The host sits above the paths, which reads as one host per project. Zed's docs state one explicit limitation, being "You can't open files from the remote Terminal by typing the `zed` command", and note that Zed "does not currently handle opening very large directories (for example, `/` or `~` that may have >100,000 files) very well".

## 6. Multi-root workspaces as a model, which is candidate B in its purest form

VS Code's own docs state a limit Tortie should read carefully. "Only resource (file, folder) settings are applied when using a multi-root workspace. Settings that affect the entire editor (for example, UI layout) are ignored." Extensions that never adopted the multi-root API "will still work in the first folder of your multi-root workspace" ([code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces), fetched 2026-08-18). So a second root is a second class root, silently, for anything that did not opt in.

Combining multi-root with remote was refused twice.

- Mixed local and remote roots, [issue 706](https://github.com/microsoft/vscode-remote-release/issues/706), closed 2019-06-17 with "no plans to support this". Quoted in full in section 1.
- Roots on more than one remote host, [issue 9746](https://github.com/microsoft/vscode-remote-release/issues/9746), opened 2024-04-04, closed 2024-04-11 by Rob Lourens with "Thanks for the suggestion. This has come up before and would be cool but unfortunately the way our architecture works, this isn't really feasible currently." The issue carries the label `*out-of-scope`, whose description in that repository is "Posted issue is not in scope of VS Code". Fetched 2026-08-18. The filer asked for exactly candidate B, in these words: "Essentially multi-root workspaces but where the roots are on remote/container."

The container equivalent, [issue 1460](https://github.com/microsoft/vscode-remote-release/issues/1460), has been open since 2019-09-23 with comments still arriving on 2026-05-29 and no implementation. Fetched 2026-08-18.

There is also a shipped bug of the exact class B creates. Multi-root plus remote broke folder settings, filed 2019-05-10 and fixed 2019-07-31, labelled `bug` and `verified` ([issue 273](https://github.com/microsoft/vscode-remote-release/issues/273), fetched 2026-08-18).

## 7. Emacs and TRAMP, the only product that does candidate C

TRAMP puts the host inside the file name. A remote file is written `/method:user@host:path`, for example `/ssh:daniel@melancholia:.emacs` ([gnu.org/software/tramp/tramp-emacs.html](https://www.gnu.org/software/tramp/tramp-emacs.html), fetched 2026-08-18). There is no connection object a window binds to, so there was nothing to bind a window to.

The follow behaviour is exactly candidate C and it is one rule. "`process-file` and `start-file-process` work on the remote host when the variable `default-directory` is remote." The manual lists which surfaces were integrated with that rule, being `shell.el`, `eshell.el`, `compile.el` for compile and grep, and `gud.el` for debuggers such as gdb and perldb ([Remote processes node](https://www.gnu.org/software/emacs/manual/html_node/tramp/Remote-processes.html), fetched 2026-08-18). Focus a buffer whose directory is on another machine and your grep runs on that machine.

TRAMP is also the only prior art that runs against a machine with nothing installed, and its rule for that is worth copying directly. It "requires access to and rights to several commands on remote hosts: `ls`, `test`, `find` and `cat`", with `perl` and `grep` used to go faster when present. It discovers the remote search path once by running `getconf PATH` and caches the answer in `tramp-default-remote-path` ([Remote programs node](https://www.gnu.org/software/emacs/manual/html_node/tramp/Remote-programs.html), fetched 2026-08-18). Connection facts are cached in a persistence file, and that cache has to be thrown away by hand with `M-x tramp-cleanup-this-connection` when the remote changes underneath it.

TRAMP's recorded costs are the ones candidate C would import. Packages such as `desktop.el` and `recentf.el` access remote file names when loaded, and if the file is not reachable TRAMP blocks. `abbreviate-file-name` can start a connection through `directory-abbrev-alist`. Both are cases where a connection happens because of something the person did not ask for.

## 8. SSHFS and mounts

I did not find a primary vendor statement rejecting SSHFS for editing. What I found is that SSHFS appears in the VS Code issue tracker as the workaround people reach for once the product refuses multi-host, named as such by the filer of issue 9746 on 2024-04-04. No editor vendor in this set built on it. The performance claims about SSHFS that I found came from blogs rather than vendor documentation, so they are in the unverified list below.

---

## 9. What to copy and what to refuse

| Item | Source | Verdict for Tortie | Deciding reason |
| --- | --- | --- | --- |
| Host is part of every path identity | VS Code URI authority, TRAMP file name syntax | Copy | Two independent designs, 20 years apart, both refuse a bare path. It removes the wrong-machine class of bug at the type level. |
| Host and path kept as two fields, not one merged string | VS Code CLI `--remote <authority> <path>`, issue 1530 closed | Copy | The merged form leaked into a `cwd` argument and broke search, issue 11556. |
| One project tab is bound to exactly one machine | VS Code, Zed, JetBrains, all three | Copy | Every product that installs a server landed here independently. |
| A visible label naming the machine, shown always | VS Code status bar host indicator | Copy | It is the cheapest part of the whole design, and it is the part that stops silent mistakes. |
| One long lived multiplexed ssh connection per host | Zed ControlMaster, Tortie already does this | Confirmed, keep | Independent confirmation from the most recent build in the set. |
| Discover the remote tool set once, cache it, degrade instead of failing | TRAMP `getconf PATH`, requires only `ls`, `test`, `find`, `cat` | Copy | It is the only strategy in the set that survives an unprepared machine. |
| One window holding roots on two machines | VS Code issues 706 and 9746 | Refuse | Refused by the vendor twice, once as "no plans to support this", once labelled out of scope. |
| Transparent local and remote equivalence via a virtual file system | JetBrains Fleet | Refuse | Four years of work, discontinued 2025-12-22, and no competitor copied it. |
| Install a server, daemon or IDE on the far machine | VS Code Server, Zed remote_server, JetBrains backend | Already refused by Tortie | Named here so the research document can say plainly why their search and git answers do not transfer. |
| Mount the remote over SSHFS | Named as a workaround in issue 9746 | Refuse | No editor vendor in the set built on it. |

## 10. Failure modes, which are worth more than the designs

| Failure | Where it is recorded | What it means for Tortie |
| --- | --- | --- |
| The same path on two machines silently opens the wrong file | [vscode issue 190566](https://github.com/microsoft/vscode/issues/190566), 2023-08-16 | This is Tortie's dangerous case, already shipped by someone else. The tab title looked correct while the content came from the other machine. |
| A terminal that has ssh'd elsewhere makes the window's path resolution wrong | Same issue, Rob Lourens, 2023-12-12 | He wrote that link detection "only knows about the workspace open in the vscode window, it doesn't know that you ran ssh and connected to a different machine". Tortie is not in that position, because Tortie launched the session. That is the strongest argument that a Tortie session must carry its machine as data. |
| A remote URI reaching a system call that wanted a path | [issue 11556](https://github.com/microsoft/vscode-remote-release/issues/11556) | Search dies with `spawn ... rg ENOENT`, which names the wrong culprit. Expect the same shape wherever Tortie's scripts interpolate a path. |
| Second and later roots quietly behave differently from the first | VS Code multi-root docs | If Tortie ever allows two roots, some surface will serve only the first and will not say so. |
| A remote connection triggered by something unrelated, then blocking | TRAMP, `recentf` and `desktop.el` touching remote names at load | Candidate C's real cost. Any list of recent things that holds remote paths can start a connection nobody asked for. |
| Cached remote facts going stale when the remote changes underneath | TRAMP persistence file, manual cleanup required | Whatever Tortie caches from the remote needs an explicit way to be thrown away. |
| A path-string cache key that cannot tell two machines apart | Tortie's own four stores, reported by the codebase investigators | Not from the prior art, but the same class. See answer 3 above. Under model A this still bites, because two tabs can hold the same path on two machines. |

## 11. Answers to the six questions in the original brief

**Did anyone make the surfaces follow a focused thing.** One did. Emacs with TRAMP has done it since the 1990s, driven by `default-directory`, covering shell, eshell, compile, grep and the debuggers. Everyone else binds a whole window to one host. The reason nobody else does C is mechanical rather than philosophical. VS Code, Zed and JetBrains all connect a window to a stateful server process on the far machine, that process is expensive to start, so it is bound at window scope and everything in the window inherits it. Emacs has no such object, so it had nothing to bind and used the focused buffer instead. Tortie is in Emacs's position on this point and not in VS Code's, because Tortie's connections are held per machine at the app level rather than per window.

**The same path holding different work on both machines.** Nobody solves it by comparing content and nobody solves it by heuristics. All of them solve it by making the host part of the identifier so the question never arises. The one place VS Code let a bare path be resolved without a host, being terminal link detection, is exactly where it shipped the silent wrong-file bug.

**Search when the remote lacks the tool.** No product in the set achieves fast project-wide search on an unprepared machine. VS Code and Zed both ship their own search binary inside the server payload, so they answer the question by installing. TRAMP is the only one that faces the real question, and its answer is to require the POSIX baseline of `ls`, `test`, `find` and `cat`, to use `grep` and `perl` when present, and to discover once and cache. Under Tortie's settled no-install decision, remote search is a `find` and `grep` pipeline and it will be slower than ripgrep. The honest move is to say so in the UI rather than to present the two as one feature. Copying a static ripgrep binary is the only route to parity, and it is against the settled decision, so I am naming it and not recommending it.

**What each got wrong.** See section 10.

**The smallest shape that gives a person one window over two computers without a server on the far side.** A project is the pair `(machine, absolute path)` and that pair is the tab's identity. The machine is never defaulted and never inferred from a path. Every workspace surface reads through the frozen script catalogue against the tab's machine. A session opened on a machine can only live in a tab whose machine matches, so opening a remote session either focuses the existing tab for that pair or creates it. The tab shows the machine name at all times, including for the local machine, so that "no label" never means "no host". That is the whole thing, and it is candidate A with the tab, rather than the window, as the unit.

**Which candidate.** A, with two qualifications. The first is that the tab, not the window, is the unit, which is the part Tortie gets for free and VS Code could not have. The second is that the useful half of C survives inside A, since focusing a session moves you to its tab and the surfaces re-target as a unit. What the prior art rules out is the per-surface split, where the explorer is on one machine and the search is on another. B is refused, and it is refused with names and dates attached rather than on taste.

## 12. Two edits I would make to the document as ruled

1. Replace the reason against B. Drop the inventory argument about the operator's 11 folders, because it expires on his next `git clone`. Put in its place the design argument and Microsoft's three closed issues, being 706, 8088 and 9746, plus the reproduction in vscode 190566. The ruling does not change.
2. Move the four early-returning stores out of the case against C and into the work list for A. Change the cache key in `useFileTree.setRoot`, `useTreeGitStatus.setRepo`, `useSearch.syncProject` and `useContext.syncProject` from a path string to the pair `(machine, path)`. Under A that fix is required for correctness, not optional, because two tabs holding the same path on two machines will otherwise show one machine's data under the other's name.

## 13. What I could not verify

- Whether one Zed window can hold both a local project and a remote project. The docs do not say, and I found no issue asking. The settings shape puts the host above the project paths, which suggests one host per project, but that is my reading rather than a statement by Zed.
- Zed's internal Local and Remote pair behind one interface for Project, Worktree, GitStore and LspStore. My source is DeepWiki, which is generated from the repository rather than written by Zed. I did not read the Zed source.
- Whether Zed's remote server does its own search or shells out to a tool. I did not confirm either way.
- Any vendor statement that SSHFS performs badly for code editing. The claims I found were on blogs. The only primary trace is that SSHFS appears as a user workaround in VS Code issue 9746.
- The TRAMP FAQ page. I attempted it twice and got HTTP 429 from gnu.org both times. The TRAMP claims above come from the single page manual and from the Remote processes and Remote programs nodes instead.
- Whether JetBrains ever gave a reason for Fleet's end that touches the remote model. The announcement I read gives product strategy reasons only.
- Whether a JetBrains client window can hold two projects. The FAQ does not address it.
- Latency numbers for any of these products. I found no vendor-published measurement, so no number in this document came from a vendor.
- Tortie's own code. I did not read it, as instructed. My statements about `useFileTree.setRoot`, `useTreeGitStatus.setRepo`, `useSearch.syncProject` and `useContext.syncProject` take the codebase investigators' report of the early-return behaviour as given, and reason about what it means rather than confirming it.

## 14. What I did not get to

- The `vscode-remote` scheme's handling of nested remotes, such as a container inside an ssh host. Issue 8764 raises it and I did not follow it.
- Cursor, Windsurf and the other VS Code forks. I assumed they inherit the upstream model and did not check.
- Coder, DevPod and Gitpod, which are workspace provisioning products rather than editors, and which all provision a machine and then hand it to one of the editors above.
- The Warp terminal and any terminal-first product that might have a C-shaped design. I ran out of budget before checking.
- Whether ripgrep can be run over ssh with the binary streamed rather than installed. That is a Tortie engineering question rather than a prior art question, and it is against the settled no-install decision anyway.
