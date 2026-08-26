# The Zen of Tortie

> Keep the work alive.  
> Keep the machinery invisible.  
> Bring the human only what needs a human.

Tortie is a calm, durable place for agentic work.

Coding agents may run for minutes or hours. They pause, ask questions, change
files and wait for decisions. The human should not have to keep every window,
process and conversation in their head just to keep that work moving.

Tortie carries it for them.

## The shell is a promise

Tortie lives in the shell, and the shell outlives the window.

Sessions belong to the work, not to the application displaying them. They run
where they were started and keep running once the interface is gone. Closing
the app should feel safe. A crash should be an interruption to the interface,
not to the work.

What comes back matters more than the fact that something came back. A
recovered process is table stakes. A conversation that resumes — the agent
still knowing what it was doing and why — is the promise.

The application may come and go. The session continues.

## Watch the work without hovering over it

Tortie is vigilant, not noisy.

It watches many sessions so the human does not have to. Most activity should
remain quiet. A working agent does not need supervision; an idle shell does not
need urgency. Only a question, decision or failure should rise above the
surface.

The interface should answer one question at a glance:

**What needs me now?**

Everything else can keep moving in the background.

## Give every thread a place

Agentic coding is not one conversation. It is a collection of parallel threads:
an implementation, a test run, a review, a migration, a question waiting for an
answer.

A tortie is one animal in several colours. The patches stay distinct — you can
always tell them apart — and not one of them is a separate cat.

That is the shape Tortie gives to work. Each thread gets a durable name, each
project a clear boundary, and the whole body of work stays one coherent thing
instead of a wall of terminals and a pile of editor windows.

One window is not the goal by itself. A coherent place for the whole body of
work is.

## The shape of the work is a promise, and promises are checked

Agents write more code than a person can read.

A file tree answers where something is. It cannot answer what the project is
made of, which parts are ours and which are leaned on, or whether the shape the
team agreed on is still true. When most of the code was written by an agent,
those are the questions a person needs answered, and today they live only in the
head of whoever last read the whole thing.

So Tortie holds the project's shape as a set of promises written into the
repository. Each promise names two parts and the way they are allowed to touch.
Tortie checks the promises against the code and says which ones hold, which ones
broke at exactly which line, and which ones it cannot check. The drawing is a
picture of the promises, never the source of truth, because the repository
always wins.

Two things keep it honest. A promise that fails names the offending line. A
promise Tortie cannot check says so on its face, because a map that goes quietly
stale is worse than no map at all.

## Hide the machinery

Durability requires machinery. Using Tortie should not.

There are no multiplexer concepts to learn, no server to tend and no recovery
ritual to memorise. People create named sessions inside projects. Tortie keeps
them alive and brings them back.

Complexity belongs beneath the surface. The stronger the machinery becomes,
the quieter the product should feel.

## Borrow the shape, not the feature list

Tortie does not ask developers to forget how they already work.

Projects look like projects. Files look like files. Source control behaves as
expected. Editors, terminals, tabs and shortcuts live where practiced hands go
looking for them. The shape is intentionally familiar because attention spent
learning the tool is attention taken from the work.

Familiarity is a starting posture, not a roadmap. Everything borrowed is the
price of admission, not the product, so anything proposed because an IDE has it
must first answer whether it serves the work agents actually do. Where
something is genuinely needed, assemble it from what already exists rather than
reinventing it. The code Tortie owns should be the part nothing else provides.

Tortie should feel less like entering a new IDE and more like discovering that
the one you already know can finally remember, persist and pay attention.

## Protect human attention

Compute can be multiplied. Human attention cannot.

Tortie does not try to make the human watch more agents. It lets more agents
work without demanding more vigilance from the human. It compresses a field of
activity into a small number of meaningful signals and preserves context until
the human is ready to return.

The product succeeds when the developer can look away without anxiety and come
back without reconstruction.

## What Tortie is not

A principle that forbids nothing is decoration. These are the refusals:

- **Not a dashboard.** No counters, no activity feeds, no progress theatre. A
  number that rises on its own is not a signal, it is noise in a nicer font.
- **Not an IDE rebuilt from scratch.** Search across projects earns its place,
  because agents rewrite code faster than a human can track it. A checked map of
  the project earns its place for the same reason. Structural search,
  replace-in-files, language servers, debuggers, task runners and extensions do
  not.
- **Not a diagram you maintain.** Tortie never asks a person to draw the
  architecture, keep a picture current, or learn a notation. The promises are
  stated once, in plain files, and the code is measured against them.
- **Not a map that acts.** Checking a promise is Tortie reading files. Writing
  or rewriting the promises is a person's decision, or a person's agent doing
  the work where they can see it. Nothing Tortie draws ever starts a process on
  its own, and no verdict ever touches a session's status.
- **Not a supervisor's console.** Tortie never asks the human to watch an agent
  work.
- **Not a tool that teaches its own internals.** No prefix keys, no attach
  ritual, no vocabulary borrowed from the layer underneath.
- **Not clever where it could be dull.** Anything durability-critical should be
  boring, inspectable and older than this product.

## Move patiently, never lose the path

Tortie should be fast, but it should never feel frantic. Powerful, but never
busy. Continuity over spectacle, clear state over animation, reliability over
cleverness.

Like its namesake, Tortie is patient, watchful and difficult to dislodge. It
keeps its place, notices everything, and speaks only when something is worth
the human's attention.

That is the Zen of Tortie:

**Your work continues. Your attention stays yours. Nothing important gets
lost.**
