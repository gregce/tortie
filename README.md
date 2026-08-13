# TORTIE.sh

**A calm, durable home for your coding agents.**

Tortie is a macOS shell for agentic work. You open your projects, you start
Claude Code or Codex or Gemini or any of twelve agents by hotkey, and the work
keeps running whether the window is open or not. Close the app, update it,
reboot the machine. Your sessions come back, with their conversations.

![Tortie](docs/brand/tortie/dock/tortie-dock-128.png)

## One window for your projects

Every project is a tab in one window. Switch with `⌘1` through `⌘9`. No more
one editor window per repository, no more hunting through a window switcher to
find the agent you left working. The file tree, the git sidebar and the
terminal sessions all scope to the project you are looking at.

## Durable agent sessions

This is the reason Tortie exists. Sessions live in a private terminal server
that runs outside the app, so the app is just a window onto them.

- Quit Tortie. The agents keep working.
- Tortie crashes or updates itself. The agents never notice.
- Reboot the Mac. Tortie restores every session, replays its scrollback, and
  arms each agent's own resume command so one keypress continues the
  conversation where it stopped.

Your session list is copied and verified continuously, five generations deep,
so even the record of your work has spares.

## Intuitive multiplexing

Name a session and it keeps that name. Split panes by dragging one session
onto another. Zoom any pane. Drag an image from the file tree into an agent.
See at a glance which session needs your input, and jump to it with `⌘J`.

There is a full terminal multiplexer underneath, and you never see it. No
prefix keys, no detach commands, no configuration files. Sessions have names,
and the window is the whole interface.

## Feels like VS Code

The furniture you already know, so there is nothing to relearn.

- A git sidebar with staging, history, branches and a real commit graph.
- A file tree with git status colouring and the icons you are used to.
- Click a file to read it, edit it with Monaco, diff it against HEAD.
- Project-wide search on ripgrep, fast on very large trees.
- Markdown and HTML preview, with untrusted pages locked in a frame that can
  reach nothing.

## The agents

Claude Code, Codex, Cursor, Gemini, Qwen, Muse, Pi, DeepSeek, Antigravity,
Droid, Amp and plain shells. Each with its own icon, its own hotkey, its own
launch flags, and its own resume strategy, verified by an executable
conformance harness rather than asserted.

A new agent Tortie has never heard of? Add it yourself with one JSON file. No
rebuild, nothing runs as code, and anything that could start a program asks
you once, out loud.

## What Tortie refuses to do

- It never touches your own tmux server or `~/.tmux.conf`.
- It never adopts a terminal session it did not create.
- It sends nothing anywhere. There is no telemetry, and the app's own
  content-security policy makes the window unable to reach the network.
- It never renders a `.env`, a key file or anything that looks like a secret
  as a friendly preview.

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
