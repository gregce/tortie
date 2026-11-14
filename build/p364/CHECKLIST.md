# The diagnostic Tortie: your checklist

This is your Tortie with one addition: a checker inside its session list. If the damage that crashed 0.114.0 happens
again, the checker writes one line about it in Tortie's log and Tortie carries on. Same sessions, same settings, same
data folder. Nothing it finds leaves your Mac unless you send it.

## Before

1. If Tortie says an update is ready, let it install first: quit Tortie, open it, then carry on here.
2. Quit Tortie. Your sessions keep running.

## Install

1. Open the DMG the main session gives you from the workflow run.
2. Drag Tortie to Applications, and choose Replace.
3. Open Tortie.
4. Choose Tortie > About Tortie. The version line says "Diagnostic" after the commit, for example
   "Version 0.114.1 (3c0ac355 Diagnostic)". If it does not, you are on the normal app.

## What to look for

Nothing, normally. Use Tortie as you always do.

Every few days, and the same day Tortie says the session list stopped or quits when you did not ask it to, run this
in a terminal:

    grep diagnostic.pcache ~/Library/Application\ Support/Tortie/logs/app.log*

- No output: it has caught nothing.
- One line: it caught something. Keep a copy of the line, because the log keeps only its newest 4 MB.

To see that the checker is on:

    grep diagnostic.armed ~/Library/Application\ Support/Tortie/logs/app.log*

There is one line for each time you opened this build.

## Send

Read the line first. Its `pageBytes` field can hold 64 bytes of your session list, such as part of a session's name or
folder. Send what you choose, by the route you choose. Nothing is ever uploaded.

## Go back

Install the newest normal release the same way: quit Tortie, drag it to Applications, choose Replace. Before you
install this build, the main session tells you whether that release still reads the session list this build writes.

This build does not update itself. Check for Updates says "Updates are off in this build".

## Do not

- Install it while Tortie says an update is ready.
