# The browser demo (tortie.sh hero)

The REAL renderer — the same `src/renderer` the Electron window loads —
running in a plain browser against a fixture bridge. No Electron, no main
process, no tmux: every `window.gmux` call lands in `bridge/install.ts`
instead of IPC. The goal is the opensession.com-style hero: a fully
interactive mocked app on the marketing site.

## Run it

```sh
npx vite --config demo/vite.config.ts          # dev, http://localhost:5173
npx vite build --config demo/vite.config.ts    # static bundle -> demo/dist
```

## How it works

- `main.ts` installs the bridge, THEN dynamic-imports `src/renderer/main` —
  the ordering guarantee initAppearance() and the store's boot need.
- `bridge/install.ts` is the fixture implementation of `InstalledGmuxApi`.
  Implemented members answer the way an idle healthy local Tortie would.
- `bridge/magic.ts` wraps the whole object in a safety net: any member NOT
  implemented yet fabricates a harmless callable/thenable answer and logs
  `[demo-bridge] unmocked member used: gmux.<path>` on the console. That log
  is the to-do list — open a surface, watch the console, implement what it
  names with real fixture data.
- `bridge/world.ts` is the mutable model (projects, sessions, listeners);
  `bridge/repo.ts` the fixture repo (tree, file contents, git status/log —
  keep these coherent with the transcript); `bridge/scripts.ts` the terminal
  content; `bridge/term-engine.ts` the byte-stream fake (scripted transcript
  playback + an interactive echo shell); `bridge/popup-menu.ts` a DOM
  rendering of the `ui:popupMenu` contract (the app has no DOM menu fallback
  by design, so the demo draws its own and resolves the clicked id).

## What works (verified 2026-08-27, dev + prod build, embedded on the site)

Three projects (rookery / heron / tern-docs — see bridge/repo.ts), each with
its own tree, git status, history and sessions. The session strip with live
status (running / idle / needs-input badges), the interactive shell, two
auto-playing agent transcripts (claude in rookery, codex in heron), and the
full durability arc in tern-docs: a 'restorable' session whose Restore
replays saved scrollback, arms `claude --resume`, and answers when the
visitor presses Enter. Explorer with git decorations, diff editor against
HEAD, SCM view (graph gutter, ref badges), the ⌘T modal with the real
13-agent registry grid (claude + codex startable — new agent sessions greet
and reply to typed input), context menus, Open-in-split multiplexing, the
Context view (skills with agent badges, MCP, instructions — see
bridge/context-fixture.ts), and the Settings WINDOW as a popup
(demo/settings.html, a second vite entry running the real settings
renderer).

Project verbs all work: the ＋ menu's Open Project… "picks" the spare
sylva fixture (then fresh generic folders), New Project… creates and opens a
folder (bridge/repo.ts registerGenericRepo), Clone Repository… runs the real
preflight (ssh→https rewrite, suggested name) and a staged progress stream
before opening the "cloned" repo, and closing a tab goes through the app's
own confirm. History entries expand into per-commit file lists
(git.commitDetail from each fixture commit's `files`), and clicking one
serves a synthesized parent→commit pair (git.commitFileDiff).

Deliberately out: the Architecture view (`arch: undefined` + a hidden rail
button — its fabricated stand-in used to crash the view). Crash belt: any
renderer error record clears the app's `gmux.*` localStorage keys so the
ErrorBoundary's Reload always boots clean instead of looping into the same
persisted state. File-name truncation uses plain CSS ellipsis via
bridge/truncation-fix.ts (adopted into pierre's shadow roots by patching
attachShadow) because the library's measurement trick collapses in some
browsers.

## Not yet

- A typed pass replacing the safety net: annotate the bridge object with
  `InstalledGmuxApi` and let tsc name every remaining member (see
  bridge/API-CATALOG.md).
- Search / quick open / symbols answer empty.
- Fixture content is first-draft; transcript pacing and repo stories can
  carry more of the product's voice.

## Shipping to tortie.sh

The site embeds `demo/dist` as static files: build, then
`cp -R demo/dist/. ~/tortiedotsh/public/demos/app/`. The hero
(src/components/Hero.astro over there) shows the PNG as a click-to-activate
poster and cross-fades into an iframe at /demos/app/index.html.
