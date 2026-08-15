# Tortie configuration

This folder is how you tell Tortie about a coding agent it does not already know,
and how you change something about one it does.

**The answer first.** Write a file called `agents.json` next to this one. Tortie
reads it when it starts. A row that can cause a program to run is loaded as data
straight away, and Tortie will not launch that agent until you have confirmed the
row once inside the app. You confirm it in Settings, then Agents, under the
heading "From your configuration file".

Tortie ships with twelve agents compiled in. You do not need this folder to use
them. You need it when you have a thirteenth, or when a compiled row has the
wrong detail for your machine.

---

## Paste this into an agent

Start a Tortie session with its working directory set to this folder. Then paste
the text below, and say what you want after it.

```text
Read README.md in this directory. It is the contract for agents.json, which is
Tortie's agent configuration file. Then write or edit ./agents.json to do what I
ask next. Use only the fields the contract lists, because any other field drops
the whole row. Check your file against ./agents.schema.json and against the seven
files in ./examples/ before you tell me you are done. When you are done, tell me
whether the change needs me to confirm it inside Tortie.
```

An example of what to say next: "add my company's `owl` CLI. It launches as
`owl`, and it resumes a conversation with `owl --resume <id>`."

---

## What is in this folder

| File | Who writes it | What it is |
| --- | --- | --- |
| `agents.json` | you | Your agent rows. Tortie never writes this file. |
| `README.md` | Tortie | This file. It is rewritten to match the installed build. |
| `agents.schema.json` | Tortie | The JSON Schema for `agents.json`. It is generated from the type Tortie parses, and a test fails the build when the two differ, so it cannot drift from the code. |
| `examples/` | Tortie | Seven complete files you can copy over `agents.json` and edit. |

Do not edit `README.md`, `agents.schema.json` or anything in `examples/`. Tortie
restores them when it starts. Your work goes in `agents.json`. Any other file you
leave here is yours and Tortie does not touch it.

The folder itself is at `~/Library/Application Support/Tortie/gmux/config/`. The
inner directory is called `gmux` because that is a name live sessions are bound
to, and renaming it would strand sessions that are running now.

---

## The file

`agents.json` is one JSON object. It has a schema number and a list of agents.

```json
{
  "schema": 1,
  "agents": []
}
```

`schema` must be the number `1` or the number `2`. It is how Tortie knows which
shape your file is in, and this build reads both.

A file that uses envPassthrough must say "schema": 2. A file that says "schema": 1
keeps working and cannot carry this field. Nothing else differs between the two,
so moving a working file to schema 2 is a one character edit.

A new field arrives as a new schema number with a converter, never as an extra
block bolted onto an older version. `launch.envPassthrough` is the field that
made this file schema 2.

Each entry in `agents` is one agent. An `id` Tortie does not already have creates
a new agent. An `id` Tortie does have patches that agent.

**A patch replaces a field, it never blends into it.** If you supply `binaries`,
your list is the whole list. If you leave a field out, the compiled value is kept
exactly as it was.

The twelve ids that already exist are `claude`, `cursor`, `codex`, `gemini`,
`droid`, `deepseek`, `antigravity`, `muse`, `qwen`, `pi`, `cursoride` and
`copilotide`. The last two are watchers for an IDE rather than terminal agents.
You cannot make them launchable, and you cannot make a row of your own into one.

---

## The fields of an agent

`id` is the only field that is always required. A row whose `id` is new to Tortie
also needs `displayName`, `binaries` and `launch`, because those are what it
takes to start anything. A row that patches an agent Tortie already has may carry
any subset.

| Field | Type | What it does |
| --- | --- | --- |
| `id` | string | The identity of the agent. Lower case, starting with a letter, then letters, digits and hyphens, up to 32 characters. `shell` is reserved, because that is what Tortie calls a pane with no agent in it. |
| `displayName` | string | What a person sees, e.g. `Owl CLI`. Up to 64 characters. |
| `binaries` | string array | Candidate executables, most likely first. Up to 8. |
| `launch` | object | How the agent starts. See below. |
| `resume` | object | How a conversation comes back. Leave it out when the agent has none. See below. |
| `extraProbeDirs` | string array | Extra directories to look in for the binary, beyond your login shell's PATH. `~/` and `$VAR` are expanded, and one `*` path segment is expanded. Up to 16. |
| `storeDirs` | string array | Where the agent keeps its own conversation files. Tortie reads whether these exist, which is how it tells "installed" from "installed and in use". It never writes them. Up to 16. |
| `versionProbe` | object | How to ask the binary who it is. See below. |
| `iconKey` | string | Which shipped icon to draw. Same shape as an id. An unrecognised key draws the terminal glyph, which is the same honest fallback a plain shell pane gets. |
| `notes` | string | Free text for you. Tortie displays it and never parses it. Up to 512 characters. |

**Nothing else is allowed.** A field this table does not list is not ignored. It
drops the whole row, and Tortie shows you the field name.

There is no field here for a hotkey, a launch flag preset, a paste behaviour, a
newline key or an activity tier. Those are either yours to choose in Settings or
measurements Tortie makes for itself. A configured agent gets the honest default
for each of them, and is marked unverified so you can see that nothing about it
has been measured.

### `binaries`

Write a bare name, e.g. `owl`. Tortie looks it up on your captured login shell
PATH and in the probe directories, which is how all twelve compiled agents are
found. A bare name is letters, digits, and the characters `.`, `_`, `+` and `-`,
up to 64 characters.

You may give a path instead. It must be absolute or start with `~/`. A relative
path is refused, because it would be resolved against whatever directory the
process happened to be in at the time.

### `launch`

| Field | Required | Type | What it does |
| --- | --- | --- | --- |
| `argv` | yes | string array | The command. Up to 32 entries, each up to 512 characters. |
| `env` | no | object of string to string | Environment values for this agent's panes only. Up to 16 names. |
| `envPassthrough` | no | string array | A list of environment variable names, up to 16. Tortie reads their values from your login shell each time this agent launches or restores, and passes them to that pane only. The values are never written to any file. Needs `"schema": 2`. |

Two rules on `argv`.

`argv[0]` must be the same text as `binaries[0]`. That is the name Tortie
resolves to a file and the name tmux runs, so a mismatch would start a different
program from the one you confirmed.

`argv` may not contain the `<sessionId>` slot. The slot belongs to `resume` only.

Some environment names are refused, and the row is dropped whole if it sets one.
Each of them turns "run this program" into "run this program after something else
has already run", or lets a pane claim an identity that is not its own.

| Refused | Why |
| --- | --- |
| `PATH` | It decides which file a name resolves to, which would undo the confirmation you gave on the binary. |
| `SHELL`, `BASH_ENV`, `ENV`, `ZDOTDIR` | Each names a file a shell reads before it runs anything. |
| `NODE_OPTIONS`, `ELECTRON_RUN_AS_NODE` | They change what a Node or Electron binary does before it reaches its own entry point. |
| `TMUX`, `TMUX_PANE`, `TMUX_TMPDIR` | They are how tmux is addressed. Configuration never names a tmux server, session or pane. |
| Anything starting `DYLD_` or `LD_` | They decide which libraries load into a process. |
| Anything starting `GMUX_` or `TORTIE_` | They are the pane stamp Tortie uses to know which sessions are its own. A session claiming another session's identity is the one thing the durability layer cannot survive. |

### `launch.envPassthrough`

**The problem it solves.** Tortie starts an agent pane by running the agent
directly. No shell runs in front of it, so none of your shell startup files run
either, and a key you exported in `~/.zshrc` is not in that pane. The same agent
works when you type its name in a terminal, because that terminal did read your
startup files. `envPassthrough` is how you name the variables that should cross
that gap.

```json
{
  "schema": 2,
  "agents": [
    {
      "id": "acme",
      "displayName": "Acme CLI",
      "binaries": ["acme"],
      "launch": {
        "argv": ["acme"],
        "envPassthrough": ["ACME_API_KEY", "ACME_REGION"]
      }
    }
  ]
}
```

**What Tortie does with it.** Each time it creates a session for this agent, and
each time it restores one, Tortie runs one interactive login shell that prints
only the variables you named. That shell reads `~/.zprofile` and `~/.zshrc` the
way your terminal does. It is given 3 seconds, and it is killed with its whole
process group if it takes longer, so a slow or broken startup file cannot hold a
launch open. The resolved values are handed to that one pane.

**What is stored, and what is not.** The list of names is stored in this file and
in Tortie's session records. The values are not stored anywhere. Here is the full
list of places a resolved value does not appear.

- `agents.json`, which holds names only.
- Tortie's session database, which holds names only.
- The confirm hash, which is computed from the names.
- The confirm sheet, which prints the names.
- The tmux server's own environment, which holds `PATH` and `LANG` and nothing
  else Tortie put there.

A value exists in one pane's process environment for as long as that pane lives.
That is the same exposure you accept when you export the variable in your own
terminal.

Because nothing is stored, a rotated key needs no edit here. The next launch
reads the new value. A restore re-reads it too, rather than replaying whatever
was there when the session was created.

**When a variable is not set.** Nothing is injected for it, and Tortie tells you
once for that session, naming the variable. An empty value is treated the same as
an unset one, because passing an empty string is a way to make an agent fail
later with a confusing message. A value longer than 4096 bytes is also treated as
unset and named the same way, because that value would have to ride a command
line.

**Names that are refused.** Every name refused for `launch.env` in the table
above is refused here as well, for the same reasons. A `PATH` or a `ZDOTDIR` that
arrives from your shell is the same danger as one written into the file. Two more
names are refused on top of that list.

| Refused | Why |
| --- | --- |
| `PI_CODING_AGENT_DIR` | It moves where the agent keeps its sessions, and Tortie would keep looking in the old place and lose the conversation. |
| `PI_CODING_AGENT_SESSION_DIR` | It moves where the agent keeps its sessions, and Tortie would keep looking in the old place and lose the conversation. |

A name may not appear in both `launch.env` and `launch.envPassthrough`. Two
sources for one name would make any report about it wrong in one direction or the
other, so the row is dropped and Tortie names the field.

**A route that needs no configuration at all, for pi.** If you use pi with a
provider such as Fireworks, you do not have to wait for any of this. Run /login
fireworks inside pi once. The key is stored in ~/.pi/agent/auth.json with file
mode 0600, and auth.json beats environment variables in pi's credential order.
For a keychain, set the auth.json value to a command that starts with "!", for
example !security find-generic-password -s fireworks -w. pi runs the command when
it needs the key, so the key never sits in a file.

### `resume`

Leave `resume` out when the agent has no resume that Tortie can drive. The
session still restores its directory and its scrollback, and Tortie says the
conversation is not coming back rather than opening an empty one that looks
resumed.

| Field | Required | Type | What it does |
| --- | --- | --- | --- |
| `template` | yes | string array | The arguments that resume a conversation. Up to 16 entries. |
| `idCapture` | yes | object | How Tortie gets the id that fills the slot. See below. |
| `sessionStore` | no | string | Where the agent writes the conversation, in template form, e.g. `~/.owl/sessions/<sessionId>.json`. Tortie displays this and never parses it. |
| `requiresOriginalCwd` | no | boolean | True when resume only finds the conversation from the directory the session started in. |
| `bareResumeIsDangerous` | no | boolean | True when a resume that loses its id attaches to some other conversation instead of failing. |
| `resumeExtrasPosition` | no | `"leading"` or `"trailing"` | Where the original launch flags go in the resume command. Default is `trailing`. |

**`template` must contain exactly one entry that is the text `<sessionId>`, on its
own.** Not two, not zero, and not inside a longer string. Tortie replaces that one
entry with the conversation id. A resume command that lost its id does not fail.
It opens somebody else's conversation.

Do not repeat the binary in `template`. Tortie puts the binary in front of it.

**`requiresOriginalCwd` and `bareResumeIsDangerous` both default to true for a
configured agent**, which is the refusing direction in both cases. Restore then
never substitutes a different directory, and Tortie never builds a resume command
that lost its id. Set either to `false` only after you have measured it, and say
so in `notes`.

Use `resumeExtrasPosition: "leading"` for a CLI whose options must come before its
subcommand. The compiled DeepSeek row needs it, and the difference there is a
dead pane against a restored conversation.

Run `<binary> --help` before you write this block. Nine of the ten compiled
resume rows were wrong the first time they were written, and two of them produced
a dead pane. The usual mistake is assuming a flag where the CLI wants a
subcommand.

### `resume.idCapture`

One object. `mode` decides which other field it carries, and there are three
modes.

| `mode` | Other field | What it means |
| --- | --- | --- |
| `pre-assign` | `launchFlag`, a string array of 1 to 4 entries | Tortie makes the id before the agent starts and passes it on the launch command line, e.g. `["--session-id"]`. This is the strongest route. Prefer it whenever the CLI offers it. |
| `pre-assign-cmd` | `argv`, a string array | Tortie runs the same binary with these arguments and takes the id from its output, e.g. `["create-chat"]`. It cannot name a different program, because the binary is the one you already confirmed. |
| `none` | none | There is no id, so there is nothing to resume. Leaving `resume` out entirely says the same thing more clearly, because a `resume` block still has to carry a template with the slot in it, and that command could never be filled. |

Reading an id back out of an agent's own session files is not on this list. Those
readers are written per store format and compiled in, so a configured row that
asked for one would wait for an id that could never arrive.

### `versionProbe`

| Field | Required | Type | What it does |
| --- | --- | --- | --- |
| `args` | yes | string array | The arguments that print a version, e.g. `["--version"]`. Up to 8. |
| `fallbackArgs` | no | string array | A second attempt, used when the first one errors. Codex answers `--version` with an error and `-V` with a version, and the compiled row for it carries exactly this. |
| `identitySubstring` | no | string | The output must contain this for the binary to count as this agent. The compiled Claude row requires `(Claude Code)`, because some other `claude` on your PATH is not the one the row means. |
| `postProcess` | no | `"first-line"` or `"strip-ansi-last-line"` | How to reduce the output to a version string. Default is `first-line`. |

A version probe runs the binary as a subprocess, so it arms the confirm gate.

### The limits

| Limit | Value |
| --- | --- |
| Rows in one file | 32 |
| File size | 256 KiB |
| Entries in `binaries` | 8 |
| Entries in `launch.argv` | 32 |
| Entries in `resume.template` | 16 |
| Names in `launch.env` | 16 |
| Names in `launch.envPassthrough` | 16 |
| Entries in `extraProbeDirs` and `storeDirs` | 16 each |

They are here because these values reach a command line, an environment and a
subprocess. A file asking for something far outside them is caught before the
value is handed on rather than after.

---

## The confirm gate

**A row that can cause a program to run does not launch until you have confirmed
it in the app, once.**

Here is where you do it. Open Tortie, then Settings, then Agents. Under the
heading "From your configuration file" you will find your row, a button that says
"Show what it runs", and the exact lines Tortie will use. Read them, then press
the button that says "Enable" and the agent's name. The confirmation is bound to
a hash of the fields below. Change one of them and Tortie asks again. Change
anything else and it does not.

The same screen has a "Withdraw confirmation" button, which puts the row back to
where it started.

| Field | Why it is on this list |
| --- | --- |
| `binaries` | It names the program. |
| `extraProbeDirs` | It decides which file of that name is found. A row that names `claude` and adds a directory it controls has chosen the program as surely as one that gives a path. |
| `launch.argv` | It is the command line. |
| `launch.env` | Environment values change what a program does, and some change which library loads into it. |
| `launch.envPassthrough` | Which variables reach the pane changes what the program does. The names are hashed. The values are read fresh at each launch and are never hashed, so rotating a key asks you nothing. |
| `versionProbe` | Tortie runs the binary with these arguments during detection. |
| `resume.template` | It is the command line a restore replays. |
| `resume.idCapture` | Both of its useful modes reach a command line, and one of them runs the binary a second time. |

`storeDirs` is deliberately not on that list. Tortie reads whether those paths
exist. It never runs anything from them.

**If you are an agent writing this file, say so.** Tell the person you wrote an
execution bearing field and that Tortie will ask them to confirm the agent before
it will start. Tell them where, being Settings, then Agents, then the section
called "From your configuration file". Otherwise the confirmation looks like a
failure, and they will think your file did not work.

Until they confirm it, the agent still appears in the New session board. It is
drawn as unpickable and marked "confirm first", so nobody spends a session name
finding out.

This gate exists in Tortie and not in the other products that read a
configuration file, and here is the reason. Those products have a human as the
only routine writer of that file. Tortie runs many agent processes at once under
one user account, some of them deliberately launched with their safeguards off,
all of them able to write to your home directory. A configuration folder that
Tortie reads and an agent can write would otherwise be a way for one agent to
start another one with arguments you never saw.

---

## What configuration cannot do

Every line here is a thing that is absent from the contract rather than a rule
somebody remembered. There is no field that expresses it.

| It cannot | The short reason |
| --- | --- |
| Run code inside Tortie | No JavaScript, no TypeScript, no WebAssembly and no native library from outside the signed application is ever loaded into any Tortie process. |
| Start anything on its own | A file changing on disk never starts a process. A person confirms the bytes first. |
| Name a tmux server, session or pane | There is no field for any of them, and the environment names that address tmux are refused. |
| Read or write the session database | Configuration is not storage. |
| Write any file | Tortie writes this folder. Nothing in this folder writes anything. |
| Change how an existing session restores | The launch and resume lines were copied into Tortie's own records the moment the session was created. Deleting your row cannot strand a session you already have. |
| Add a panel, a view, a tab, a toast, a badge or a menu item | There is no field for any of them. |
| Supply a colour, a class name, a stylesheet or any markup | An icon is a shipped image drawn in a fixed slot. It is never inlined, so it cannot carry script. |
| Add a way for Tortie to behave | The id capture modes and the two enumerated settings pick from a fixed list. An unknown value drops the row, it does not extend the list. |
| Set a session's status | Whether a session needs you is computed from what the session does. Nothing else may claim it. |
| Be fetched | Tortie never downloads configuration. There is no registry, no store and no install command. This file arrived because you put it here. |

Two more limits are worth stating, because an agent will otherwise try them.

**There is no project scope in this version.** A `.tortie` folder inside a
repository does nothing at all. Configuration is per user, and it lives here.

**Settings still decides what Settings already decided.** Your hotkeys, your
launch defaults and your capture choices live in Tortie's own settings, and a row
here does not set them. A row describes the agent. Settings records what you
chose.

---

## When a row is wrong

**An invalid row is dropped whole.** It is never partly applied, it is never
dropped in silence, and it never stops Tortie starting. Tortie shows you an error
naming the row, the field and the reason.

You read those errors in the same place you confirm a row. Open Settings, then
Agents, then "From your configuration file". Dropped rows are listed there in
red, one sentence each. There is also a "Check the file again" button, which
re-reads what Tortie has in memory after you have edited the file.

One bad row does not cost you the others. The remaining rows load.

| Shape | What you see |
| --- | --- |
| The file will not parse as JSON | One error for the file. No rows load, and the twelve compiled agents are unaffected. |
| The file has the wrong `schema` number | One error for the file, and no rows load. Tortie never guesses at a shape it does not read. |
| A row breaks the contract | One error naming that row's `id`, the field and the reason. Every other row loads. |
| The file has a field at the top level that is not `schema` or `agents` | One error naming that field. It is not fatal, and every valid row still loads. One typo at the top of the file should not cost you the whole file. |
| A row inside `agents` has a field Tortie does not know | That row is dropped whole, with an error naming the field. A row is a contract, so a field Tortie ignores inside one could mean the row does something it does not. |
| A file that says `"schema": 1` uses `launch.envPassthrough` | That row is dropped, with an error telling you to change the schema number to `2`. Every other row loads. |
| Two rows carry the same `id` | The first one is used. The second is dropped with an error saying so. |
| The file lists more rows than Tortie reads | An error naming the count. The first rows load and the rest are ignored. |
| A row is fine but not confirmed | No error. The agent appears, marked "confirm first", and it will not launch until you confirm it. |

---

## When Tortie reads this

At three moments, and no others.

1. When Tortie starts.
2. When you ask it to reload the configuration.
3. Shortly after the file changes on disk, once the writing has settled.

It is never read while a session is being created, and never while a session is
being restored. That is on purpose. A session that exists must not depend on a
file you can delete.

---

## Removing an agent

Delete the row and reload. Sessions you already created with it keep working,
including across a quit and a restart, because their exact launch and resume
lines were written into Tortie's own records when the session was created.

Deleting `agents.json` entirely puts you back to the twelve compiled agents. That
is also the fastest way to rule this file out when something looks wrong.

---

## The examples

Seven complete files. Each one can be copied over `agents.json` as it stands.

| File | What it shows |
| --- | --- |
| `01-minimal.json` | The smallest file that adds a working agent. It has no resume. |
| `02-resume-with-a-flag.json` | The common case. Tortie makes the conversation id before launch and passes it on a flag. |
| `03-resume-is-a-subcommand.json` | Resume is a subcommand rather than a flag, and the launch flags have to come before it. |
| `04-id-from-a-side-command.json` | A second run of the same binary mints the conversation id, and the first launch resumes into it. |
| `05-patch-a-built-in-agent.json` | Changing a compiled agent. This example touches nothing execution bearing, so it never asks you to confirm anything. |
| `06-every-field.json` | Every field the contract allows, in one row, so you can see the whole surface. It says `"schema": 2`, because it uses `launch.envPassthrough`. |
| `07-env-passthrough.json` | Handing one variable from your login shell to one agent's panes. It patches the compiled `pi` row for a Fireworks key. |

Copy one and edit it:

```text
cp examples/02-resume-with-a-flag.json agents.json
```

---

## The schema

`agents.schema.json` in this folder is a JSON Schema for the whole file. It is
generated from the type Tortie parses. Point your editor at it, or hand its path
to an agent.

It is deliberately weaker than Tortie's own reader in three places. It cannot say
that `argv[0]` equals `binaries[0]`. It cannot carry the refused environment
names. It cannot say that `launch.envPassthrough` needs `"schema": 2`, so a
schema 1 file that uses the field passes the schema and is then dropped by the
reader with an error naming the schema number. All three are checked when the
file is read, and all three drop the row in the ordinary way. The schema is there
so an authoring agent gets the shape right on the first attempt, not so it can
stand in for the reader.

Every example in this folder is run through both the schema and the real reader
by Tortie's own tests. An example that does not load is a defect, not a typo you
are expected to work around.
