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

You run six coding agents across four repos, and every one of them dies when
the window closes. Tortie is one calm window where named sessions host your
agents, and the sessions outlive the app. Quit Tortie, update it, reboot the
Mac. The work keeps running, and what ended comes back with its scrollback
and its conversation, one keypress from continuing.

## Sessions that refuse to die

- **Quit the app and the agents keep working.** Sessions live outside the app process, so the window is just a view.
- **Reboot and everything comes back.** Scrollback replayed, and each agent's own resume command typed and waiting for your Enter.
- **Your session list keeps five verified backups of itself,** refreshed on launch, sleep, quit and change.
- **Restore tells the truth.** A session that did not come back says so, instead of pretending.

## One window for everything

- **Every project is a tab.** Switch with `⌘1` through `⌘9`, and each tab scopes its own sessions, git state, tree and editor.
- **See who needs you at a glance.** Status dots on sessions, roll-ups on tabs, `⌘J` to jump to the session waiting on you.
- **Split, zoom and drag.** Drop one session onto another to split, zoom any pane, drag an image from the tree into an agent.
- **No multiplexer vocabulary.** Sessions have names. That is the entire model you learn.

## Your agents, first class

- **Twelve agents ship supported.** Claude Code, Codex, Cursor, Gemini, Qwen, Muse, Pi, CodeWhale, Antigravity, Droid and plain shells, each with its own icon, hotkey and launch flags.
- **Add your own with one JSON file.** No rebuild, nothing in the file runs as code, and anything that could start a process asks you first.
- **See what your agents actually load.** The Context view lists every skill, MCP server, hook, plugin and instruction file on your machine, per agent, and installs skills from GitHub.
- **Conversations are captured.** The bundled SpecStory integration records each session's conversation as it happens.

## The IDE you already know

- **A real git sidebar.** Staging, history, branches and a commit graph, built from VS Code's own parsers.
- **Click a file, see the diff.** Monaco opens modified files as a diff against HEAD by default, and plain editing is one toggle away.
- **A decorated file tree** with git status colors and the icons you are used to.
- **Search everything at once.** ripgrep across every open project, fast on large trees.
- **Rich previews.** Markdown and HTML render in place, and untrusted pages are locked in a frame that can do nothing.

## What Tortie refuses to do

- It never touches your own tmux server or `~/.tmux.conf`.
- It never adopts a terminal session it did not create.
- It never renders a key file or anything that looks like a secret as a friendly preview.
- It never runs third party code inside its own processes. Configuration selects, it never executes.

## Install

macOS on Apple silicon.

1. [Download the latest release](https://github.com/gregce/tortie/releases/latest) and open the DMG.
2. Drag **Tortie** to Applications and open it.
3. Point it at a project folder. A git repository gets the full sidebar; any folder works.

## More

- Philosophy: [`docs/ZEN-OF-TORTIE.md`](docs/ZEN-OF-TORTIE.md)
- Release notes: [`CHANGELOG.md`](CHANGELOG.md)
- Building from source and contributing: [`DEVELOPMENT.md`](DEVELOPMENT.md)
- License: Apache 2.0, see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE)

<p align="center">Made by <a href="https://github.com/gregce">Itavero</a>.<br /><i>The sessions were never interrupted.</i></p>
