<p align="center">
  <img src="docs/brand/tortie/dock/tortie-dock-256.png" width="128" alt="Tortie" />
</p>

<h1 align="center">Tortie</h1>

<p align="center"><b>A calm agent multiplexer with familiar IDE features, for macOS.</b></p>

<p align="center">
  <a href="https://github.com/gregce/tortie/releases/latest">
    <img src="https://img.shields.io/badge/Download_for_macOS-Apple_silicon-4D9DE8?style=for-the-badge&logo=apple&logoColor=white" alt="Download for macOS" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/gregce/tortie/releases/latest"><img src="https://img.shields.io/github/v/release/gregce/tortie?style=flat-square&label=release&color=4D9DE8" alt="Latest release" /></a>
  <a href="https://github.com/gregce/tortie/releases"><img src="https://img.shields.io/github/downloads/gregce/tortie/total?style=flat-square&label=downloads&color=2A2E36" alt="Downloads" /></a>
  <a href="https://github.com/gregce/tortie/actions/workflows/gates.yml"><img src="https://img.shields.io/github/actions/workflow/status/gregce/tortie/gates.yml?style=flat-square&label=gates" alt="Gates" /></a>
  <a href="https://github.com/gregce/tortie/actions/workflows/durability.yml"><img src="https://img.shields.io/github/actions/workflow/status/gregce/tortie/durability.yml?style=flat-square&label=durability" alt="Durability" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/gregce/tortie?style=flat-square&label=license&color=2A2E36" alt="License" /></a>
</p>

---

If you run coding agents in VS Code or Cursor terminals, but you're tired of
cmd+\`'ing between windows and losing running agents to every restart,
Tortie is for you. I built it to scratch my own itch. I don't want an agent
super app, and I don't want to think about tmux. I just want all of my
projects in one window and be able to easily organize and not lose my agent
sessions.

<p align="center">
  <img src="tortie.png" alt="The Tortie window: project tabs, session list, terminal and git sidebar" width="900" />
</p>

## Key Features

### One Window pane for your projects

- **Every project is a tab.** Switch with `⌘1` through `⌘9`, and each tab scopes its own sessions, git state, file tree explorer and editor.
- **Universal project search.** Quickly find a file in your active project or any opened project with cmd+P. 
- **Context is first class.** The new context pane lists every skill, MCP server, hook, plugin and instruction file on your machine, per agent. Install skills from Skills.sh built in.

### Durable Agent Sessions

- **Quit the app and the agents keep working.** Sessions are named and live outside the app process in a private tmux server so the window is just a view.
- **Reboot and everything comes back.** Scrollback replayed. Each agent's own resume command is typed and waiting for you to hit Enter.
- **Split, zoom and drag.** Drop one session onto another to split, zoom any pane, drag an image from the tree into an agent. Learning tmux is not required.
- **Your session list keeps backups,** refreshed automatically as it changes.

### The Agents

- **Thirteen agents supported out of the box.** Claude Code, Codex, Cursor, Gemini, Qwen, Muse, Pi, CodeWhale, Antigravity, Droid and Grok in the terminal. Each agent has its own icon, a settable hotkey and launch flags.
- **Add your own with one JSON file.** No rebuild required. Anything that could start a process asks you first. See [how here](https://github.com/gregce/tortie/blob/main/resources/config/README.md).
- **Conversations are captured.** The bundled SpecStory integration can record each session's conversation as markdown as it happens.

### Work on another machine

- **A folder on another Mac can be a project tab.** Add the machine once in Settings, confirm it, and open a folder there. The Explorer, search, Quick Open, the git sidebar, history, branches and workflow runs all read from that machine, and the band under the Explorer title names it.
- **Sessions run over there, not here.** Start an agent on the machine, see what is already running, and bring a session back after a restart with its resume command typed and waiting. A session on a machine carries that machine's badge in its row, its tab and its identity strip.
- **Editing is off until you turn it on, per machine.** Under Settings then Machines you name one folder on that machine, and Tortie may write only under it. Saving a file, making a folder and renaming are then available, and everything outside that folder is refused with a sentence saying why. Tortie keeps no copy of what it replaced, so there is no undo.
- **Silence is never read as proof.** If a machine stops answering, Tortie says it does not know rather than deleting the row or claiming the session ended, and it rebinds the same session when the machine comes back.
- **Nothing is installed on the far side.** Tortie uses that machine's own tmux over ssh, it makes and installs a key for you if you ask, and it never touches your own ssh keys, your `~/.tmux.conf` or the record your terminal keeps.

**What it needs, and what is untested.** The machine needs ssh reachable, Remote Login on, and its own tmux, at a version Tortie has measured or one you accept yourself. Every machine measured so far has been a Mac. The scripts Tortie sends are written for both BSD and GNU tools and nothing refuses a Linux host, so a Linux VM is expected to work, but none has ever been contacted and it is untested rather than supported. One thing is refused on any machine: passing an environment value through to a remote session, because other accounts on some systems can read it from the command line and that was never measured.

### Familiar IDE features

- **A full git sidebar.** Staging, history, branches, a rich commit graph, built from VS Code's own parsers. See action runs in Tortie if you have gh cli installed.
- **Click a file, see the diff.** Monaco opens modified files as a diff against HEAD by default, and plain editing is a toggle away.
- **A decorated file tree** with git status colors, the icons you are used to and fast file search (very helpful!)
- **Search everything at once.** ripgrep across every open project, fast on large trees.
- **Rich previews.** Markdown and HTML render in place. Untrusted pages open in a sandboxed frame with no scripts and no network.

## What Tortie doesn't do

- It won't touches your own tmux server or `~/.tmux.conf`, on this Mac or on a machine you add.
- It won't render a key file or anything that looks like a secret as a friendly preview.
- It won't runs third party plugin code inside its own processes. Adding an agent is configuration, not code.

## Install

macOS on Apple silicon. Nothing has to be installed first. Tortie carries its
own copy of tmux, so a fresh Mac needs no Homebrew and no command line setup.

1. [Download the latest release](https://github.com/gregce/tortie/releases/latest) and open the DMG.
2. Drag **Tortie** to Applications and open it.
3. Point it at a project folder. A git repository gets the full sidebar; any folder works.

## Built with

Tortie is deliberately assembled from open source rather than written from
scratch. The code it owns is the durability layer and the glue.

- [tmux](https://github.com/tmux/tmux) holds the sessions. It is the reason your agents survive. Tortie ships its own copy, so the version is chosen by the release and not by whatever the machine happens to have.
- [Electron](https://www.electronjs.org/) is the window.
- [xterm.js](https://github.com/xtermjs/xterm.js) draws the terminals.
- [Monaco](https://github.com/microsoft/monaco-editor) is the editor, the same one inside VS Code.
- [Pierre](https://pierre.co/)'s [@pierre/trees](https://www.npmjs.com/package/@pierre/trees) and [@pierre/diffs](https://www.npmjs.com/package/@pierre/diffs) render the file tree and the diffs.
- [ripgrep](https://github.com/BurntSushi/ripgrep) runs the search.
- [VS Code](https://github.com/microsoft/vscode) is the source of the vendored git parsers, fuzzy scorer, commit graph layout and [codicons](https://github.com/microsoft/vscode-codicons), all with attribution.
- [material-icon-theme](https://github.com/material-extensions/vscode-material-icon-theme) supplies the file icons.
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) stores the session manifest.
- [node-pty](https://github.com/microsoft/node-pty) connects the shells.
- [skills.sh](https://skills.sh) installs and manages the skills behind the Context view.
- [SpecStory](https://specstory.com/) captures agent conversations.

The full list with licenses is in [`NOTICE`](NOTICE).

## More

- Philosophy: [`docs/ZEN-OF-TORTIE.md`](docs/ZEN-OF-TORTIE.md)
- Release notes: [`CHANGELOG.md`](CHANGELOG.md)
- Building from source and contributing: [`DEVELOPMENT.md`](DEVELOPMENT.md)
- License: Apache 2.0, see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE)

Tortie is not affiliated with, endorsed by, or sponsored by any of the companies whose products it launches. All product names and logos are the property of their respective owners, and are used here only to identify the supported product.

<p align="center">Made by <a href="https://github.com/gregce">gregce</a>.<br /><i>Your sessions are never interrupted.</i></p>
