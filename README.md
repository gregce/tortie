# TORTIE.sh

**A calm, durable home for your coding agents.**

Tortie is a macOS shell for agentic work. You open your projects, you start
Claude Code or Codex or Cursor or any of twelve supported agents by hotkey, and the work
keeps running whether the window is open or not. Close the app, update it,
reboot the machine. Your sessions come back, with their conversations.

![Tortie](docs/brand/tortie/dock/tortie-dock-128.png)

## One window for your projects

Every project is a tab in one window. Switch with `⌘1` through `⌘9`. No more
one editor window per repository, no more hunting through a window switcher to
find the agent you left working. The file tree, the git sidebar and the
terminal sessions all scope to the project you are looking at.

## Durable agent sessions

This is the reason Tortie exists. Sessions started in Tortie live in a private tmux server
that runs outside the app, so the app is just a window projecting them.

- Quit Tortie. The agents keep working.
- Tortie crashes or updates itself. The agents keep working.
- Reboot your Mac. Tortie will restore every session, replays its scrollback, and
  arms each agent's own resume command so one keypress continues the
  conversation where it stopped.

Your session list is copied and verified continuously, generations deep, so even the record of your work has a backup.

## Intuitive multiplexing

Name a long running session and Tortie will retain it. Split panes by dragging one session
onto another. Zoom any pane. Drag an image from the file tree into an agent.
See at a glance which session needs your input, and jump to it with `⌘J`.

There is a full terminal multiplexer underneath, and you don't need to learn it. No
prefix keys, no detach commands, no configuration files. Sessions have names,
and the Tortie window is the whole interface.

## Feels like VS Code

Tortie has the IDE features you already know, so there is little to nothing to learn.

- A rich git sidebar with staging, history, branches and a commit graph.
- A file tree based on @pierre/trees with git status colouring and the icons like you are used to. 
- Click a file to read it, edit it with Monaco, diff it with @pierre/diffs against HEAD. 
- Project-wide search on ripgrep, fast on very large trees.
- Search is available against all open projects in your Tortie window so you can easily find files across your projects.

### Agent Era Specific Features
- A full context menu so that you can easily see all of the Skills, MCP Servers, Hooks, Plugins and Instruction files installed across your machine and manage them.
  - You can easily 
- Markdown and HTML files offer rich preview by default in Tortie. Untrusted pages are locked in a frame.

## The agents

Claude Code, Codex, Cursor, Qwen, Muse, Pi, Codewhale, Antigravity, Gemini
Droid and plain shells. Each with its own icon, its own hotkey, its own
launch flags, and its own resume strategy.

A new agent Tortie has never heard of? Add it yourself with one JSON file. 

No rebuild, nothing runs as code, and anything that could start an agent you add will ask you directly.

## What Tortie refuses to do

- It never touches your own tmux server or `~/.tmux.conf`.
- It never adopts a terminal session it did not create.
- It never renders a `.env`, a key file or anything that looks like a secret as a friendly preview.

## Install

macOS on Apple silicon. Download the latest release, drag Tortie to
Applications, open it, and point it at a project folder. A git repository gets
the full sidebar; any folder works.

## More

- Philosophy: [`docs/ZEN-OF-TORTIE.md`](docs/ZEN-OF-TORTIE.md)
- Building from source and contributing: [`DEVELOPMENT.md`](DEVELOPMENT.md)
- Licence: Apache 2.0, see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE)

Made by [Itavero](https://github.com/gregce). The sessions were never
interrupted.
