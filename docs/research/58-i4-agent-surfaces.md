# Research 58, investigator 4. Every surface that lists agents, and what each must say when the tab's files are on a machine

Checked against the working tree on 2026-08-19. Every path and symbol below was read this session.

## The answer

There are **15 surfaces that name an agent**, of which **12 list more than one** and **3 name exactly
one and start it**. Only **4 of the 15 change** in this round. The other 11 must not change, and for 8
of them the reason is mechanical rather than a preference: they live in the Settings window, which has
no active project and therefore cannot know which tab is in front.

The four that change are the agent board (one shared component behind two surfaces), the quick create
menu, and the store's own `createSession`. The store is the important one. Every create surface already
reaches `createSession` in `src/renderer/state/sessions-slice.ts`, which is what Phase 94 established,
so the refusal is written there once and the per-agent hotkeys, the split verb and any future create
surface inherit it without code of their own.

**No new pattern is invented.** Phase 84 item 8 already solved the neighbouring case and its four rules
are copied byte for byte in shape. **No badge, no dot, no count, no animation and no tmux vocabulary
appear anywhere in the draft below**, and section 7 checks the draft against each of those.

**One measurement decides the most visible piece of copy.** The agent tile's right hand slot cannot
carry a machine label. `src/renderer/app/agent-grid.css` records that `Antigravity · not installed`
measures 192 px, being a 73 px name plus a 67 px label plus the icon, gaps and padding, and that the
grid track floor is `clamp(140px, 45%, 190px)`. A label of unknown length in that slot takes the space
the agent's own name needs, which is the exact failure the 190 px floor was measured to prevent. So the
tile keeps the two words `not installed` unchanged and **the machine is named once under the board**,
which is also what `MACHINE_NOT_SIGNED_IN_HINT` already does for the machine field.

---

## 1. The Phase 84 item 8 pattern, stated as four rules

Read from `machineNotSignedInOption` and `MACHINE_NOT_SIGNED_IN_HINT` in
`src/renderer/app/machine-copy.ts`, and from `MachineOptions` and `anyMachineNotReady` in
`src/renderer/app/CreateSessionModal.tsx`.

| # | The rule | Where it is written today |
| --- | --- | --- |
| A | The row stays in the list. It is drawn off, never removed. Removing it fixes the refusal by teaching nothing | `MachineOptions`, `<option ... disabled={row.ready !== true}>` |
| B | The reason rides the row's own text, lower case, appended to the label | `machineNotSignedInOption` returns `` `${label} (not signed in)` `` |
| C | The fix sentence is drawn once under the list, not per row, because the answer is the same for every row | `MACHINE_NOT_SIGNED_IN_HINT`, guarded by `anyMachineNotReady` |
| D | The keyboard path refuses with the same rule the button uses, so Enter cannot do what the disabled button will not | `submit()` returns early on `tabMachineUnusable`; the Create button is disabled on the same flag |

The agent board already follows A, B and D for its own three unusable states. `AgentTile` in
`src/renderer/app/AgentGrid.tsx` computes `unusable = !option.installed || blocked !== null`, draws the
`missing` class, sets `aria-disabled`, withholds `ENTER_SUBMITS_ATTR`, and puts one of `not installed`,
`confirm first` or `changed` in the `agent-tile-meta` span. `focusChoosesTile` keeps the choice off such
a tile. **The board does not follow rule C at all**, and that is the one gap this round fills.

## 2. The 15 surfaces, counted, with the verdict on each

| # | Surface | Where | Lists | Verdict |
| --- | --- | --- | --- | --- |
| 1 | ⌘T create sheet, Agent field | `CreateSessionModal.tsx` draws `AgentGrid` at `mode="select"` | 12 tiles | **Changes** |
| 2 | No sessions fleet board | `EmptyStates.tsx` `NoSessions` draws `AgentGrid` at `mode="launch"` | 12 tiles | **Changes** |
| 3 | The ˅ quick create menu | `new-session-menu.ts` `quickCreateMenuItems`, drawn by `SessionDock.tsx` and `SessionStrip.tsx` | 12 items | **Changes** |
| 4 | Native Session menu, per agent hotkey items | `src/main/menu.ts` `agentHotkeyItems` | one item per recorded chord | No change, see 4.1 |
| 5 | Settings, Keyboard, the per agent rows | `KeyboardSection.tsx` through `agentKeymapEntries` in `src/shared/keymap.ts` | every launchable agent | No change, see 4.2 |
| 6 | The ⌘/ shortcuts overlay | `ShortcutsOverlay.tsx` through the same `agentKeymapEntries` | assigned chords only | No change, see 4.2 |
| 7 | Settings, Agents | `AgentsSection.tsx` | one row per launchable agent | No change, see 4.2 |
| 8 | Settings, Agents, from your configuration file | `ConfiguredAgents.tsx` | one row per configured agent | No change, see 4.2 |
| 9 | Settings, Launch defaults | `LaunchDefaultsSection.tsx` | one card per launchable agent | No change, see 4.2 |
| 10 | Settings, General, Default agent | `GeneralSection.tsx`, the select at its line 243 | installed launchable agents plus the persisted choice | No change, see 4.2 |
| 11 | Settings, SpecStory, per agent capture defaults | `SpecStorySection.tsx`, the filter at its line 584 | installed launchable agents | No change, see 4.2 |
| 12 | Context view, the per agent groups | `ContextView.tsx` with `src/renderer/context/groups.ts` | the agents Context knows | No change, see 4.3 |
| 13 | Per agent hotkey press | `launchAgent` in `src/renderer/settings/integration.ts` | names one agent | **Changes**, through the store |
| 14 | Terminal menu, Split | `splitSession` in `src/renderer/terminal/terminal-menu.ts`, which calls `quickCreate(session.agent)` | names one agent | Inherits, no code of its own |
| 15 | Restart of a remote session | `remote-restore.ts`, which calls `findRemoteProgram` at its line 339 | names one agent | Already refuses, see 4.4 |

### The counts behind that table

- `src/main/agents/registry.ts` holds **13** agent entries, being the ids `claude`, `cursor`, `codex`,
  `gemini`, `droid`, `deepseek`, `antigravity`, `muse`, `qwen`, `pi`, `grok`, `cursoride` and
  `copilotide`.
- `LaunchableAgentId` in `src/shared/types.ts` excludes `cursoride` and `copilotide`, so **11** agents
  are launchable.
- `buildAgentOptions` in `src/renderer/state/agents.ts` appends `shell`, so the board draws **12** tiles
  before any configured agent is added. `SEED_AGENTS` in the same file holds the same 11 ids.
- `AgentTile` has **3** unusable states today, being not installed, `confirm first` and `changed`.
- `agentBlockedReason` in `src/renderer/state/agents.ts` composes **3** sentences, one per config state.
- `rebuildAppMenu` in `src/main/menu.ts` has exactly **1** production caller,
  `src/main/settings/ipc.ts:79`, on `settings:set`.
- `machine-vocabulary.test.ts` reads **a hand written list of files**, and `AgentGrid.tsx`,
  `EmptyStates.tsx` and `new-session-menu.ts` are **not on it**.
- `build/assert-bundle-refusals.mjs` is 1,585 lines and pins 301 fragments. Neither `It looked in` nor
  `Install it on` appears in it, so `noRemoteProgramRefusal` is **not** pinned today.

## 3. What a person reads today, and it is wrong on every one of the three that change

Traced this session through `createSession` in `src/renderer/state/sessions-slice.ts`, then
`createRemoteSession` in `src/main/machines/remote-sessions.ts`, then `findRemoteProgram` in
`src/main/machines/remote-argv.ts`.

The board and the menu are built from `buildAgentOptions(scan, avail)`, where `scan` is this Mac's own
`agents:list` result. **Nothing in that call has ever heard of a machine.** So in a tab whose files are
on a machine, all three surfaces describe this Mac and say nothing about it.

`NoSessions` draws whenever the active project has zero sessions. `TerminalRegion.tsx:581` gates it on
`projectSessions.length === 0` and on nothing else, so a remote tab with no sessions gets a full window
board describing the wrong computer.

The create is refused **before anything starts**. Step 5 of `createRemoteSession` searches the machine,
step 7 writes the manifest row and step 8 sends `new-session`, in that order, so a missing program
throws before the row and before the session. What the person then reads is
`noRemoteProgramRefusal` in `src/main/machines/remote-copy.ts`:

> Tortie could not find claude on Mac Pro. It looked in 17 folders, being the ones that machine lists
> for programs and the ones programs are usually kept in. Nothing was started there. Install it on
> Mac Pro, or start the session on a machine that has it.

That sentence is good and it stays. **Where it lands is the defect.** It is thrown as `INVALID_INPUT`,
and `submit`'s catch in `CreateSessionModal.tsx` matches `INVALID_INPUT` only against the words
`working directory`, so it falls through every branch to `setGenericError(errorText(err))` and draws as
the one line `.modal-error` row at the bottom of the sheet. The full `absent` block with its own title
and its own action, which `AGENT_NOT_FOUND` gets, is never reached. From surfaces 2, 3 and 13 it lands
as a sticky toast instead.

## 4. The eleven that do not change, with the deciding reason on each

### 4.1 The native Session menu's per agent hotkey items

`rebuildAppMenu` has one production caller and it fires on `settings:set`. Making these items tab aware
means rebuilding the whole application menu on every tab change and on every scan. A native menu item
also has no second line in which to say why it is grey, so a disabled item would teach nothing, which
is what rule A exists to prevent. **The refusal lands on the keypress instead**, at surface 13, where it
can be a full sentence a person can act on. Say this in the phase brief so a later round does not read
the unchanged menu as an oversight.

### 4.2 Everything in the Settings window, being surfaces 5, 7, 8, 9, 10 and 11

**The Settings window has no active project.** `src/renderer/settings/integration.ts` states it in its
own header, that the Settings window never mounts the integration because it has no app store. There is
no tab in front of it to be on a machine. A per agent row there cannot be tab aware because there is no
tab.

That is also the right answer on its merits. These rows record a preference that applies in every tab,
being a chord, a launch flag, a default and a capture answer. A row whose text changed with the front
tab would be a preference that describes one tab, which is not what any of them are.

**The operator's own ask is answered somewhere else.** He asked for "some sub field in the agents tab of
settings that shows what exists where". That is a machine by machine view, and it is investigator 5's
question. It is a new block, not a change to these rows, and this document hands it the constraint that
the Settings window can read a machine list but never a tab.

### 4.3 Surface 6, the ⌘/ overlay

It is a reference people read, in the main window, and it shows only chords a person assigned. A chord
is assigned once and applies in every tab. Marking a row because the front tab is on a machine would
make a cheat sheet describe one tab.

### 4.4 Surface 12, the Context view

It already draws nothing agent shaped in a remote tab. `ContextView.tsx` at its `status === 'elsewhere'`
branch replaces the whole body with `contextElsewhereTitle(label)` and `CONTEXT_ELSEWHERE_BODY`, being
"These agent files live on Mac Pro." and "Tortie reads skills, servers and hooks from this Mac only, so
nothing is listed here." Research 57 rules that remote Context should be built. When it is, its per agent
groups will describe that machine and the words belong to that phase. **This round changes nothing here
and must not, because a half machine aware Context is worse than an honest empty one.**

### 4.5 Surface 15, Restart of a remote session

`remote-restore.ts:339` already calls `findRemoteProgram` before it composes anything, so a restore of a
session whose agent has been uninstalled over there is already refused with the same sentence and starts
nothing. No copy change is owed. It is listed so the phase does not accidentally add a second check.

## 5. The three states a machine aware board can be in

This decides the words, so it is stated before them.

| state | what Tortie holds | what the board draws | what a wrong answer costs |
| --- | --- | --- | --- |
| known absent | an answer for that machine, and this agent is not in it | the tile off, rule C sentence under the board | a false absent hides an agent that is really there, and a person has no way to act |
| known present | an answer, and this agent is in it | the tile exactly as it is today | nothing |
| not asked | no answer for that machine yet | **every tile on**, one sentence under the board saying so | a false present costs one press and one clear sentence, and nothing is started |

**When Tortie has no answer, the board draws every tile on.** A false present is refused by
`findRemoteProgram` before the manifest row and before `new-session`, with a sentence that names the
program, the machine and how many folders were searched. A false absent has no such backstop and no
recovery on screen. That is the whole argument, and it is why the copy for the third state exists.

Investigator 3 rules on when Tortie asks and where the answer lives. This section only rules that the
third state must have words, and gives them.

## 6. The exact words

Every string below is a named export in `src/renderer/app/machine-copy.ts`, which is the rule the tree
already follows and the reason the vocabulary audit can read one file. `AgentGrid.tsx`, `EmptyStates.tsx`
and `new-session-menu.ts` must be **added to the `FILES` list** in
`src/renderer/app/__tests__/machine-vocabulary.test.ts` in the same commit, because each of them will
draw a sentence about a machine for the first time.

### 6.1 The agent board, surfaces 1 and 2

The tile, for an agent that machine does not have. Three of the four are unchanged bytes.

| slot | value | changed |
| --- | --- | --- |
| class | `agent-tile missing` | no |
| meta span | `not installed` | no, and section 0 gives the 192 px reason |
| `aria-disabled` | `true` | no |
| `aria-label` | `Claude Code — not installed on Mac Pro` | **yes**, and it is the one place the label may ride, because a screen reader has no width |

The separator in that `aria-label` is the byte `AgentTile` already composes for `not installed`, and it is left alone so the local and the remote forms stay one string shape.

Under the board, once, when at least one tile is off for this reason. This is rule C.

```ts
/**
 * Under the agent board, once, when the tab's files are on a machine and at
 * least one agent is not installed there.
 *
 * It is drawn once rather than per tile, for the reason
 * MACHINE_NOT_SIGNED_IN_HINT is drawn once, and because the tile's right hand
 * slot was measured at 67px and cannot hold a machine's label.
 */
export function agentsMissingOnMachine(label: string): string {
  return (
    `The files in this tab are on ${label}, so a session runs there. The ` +
    `agents drawn off are not installed on that machine.`
  );
}
```

Under the board, once, in the third state.

```ts
/** Under the agent board, when Tortie has no answer for the tab's machine. */
export function agentsNotAskedOnMachine(label: string): string {
  return (
    `Tortie has not asked ${label} which agents it has, so this list ` +
    `describes this Mac. A session that names an agent that machine does ` +
    `not have is refused and nothing is started.`
  );
}
```

The one caption row, when a person points at or clicks an off tile. It replaces
`HintedInstallCaption`'s first sentence in `EmptyStates.tsx` and the `Install {label}:` prefix in
`CreateSessionModal.tsx`, both of which mean this Mac and are false in a remote tab.

```ts
/** The caption for an off tile, when the provider publishes a command. */
export function agentInstallOnMachine(agent: string, label: string): string {
  return `${agent} is not installed on ${label}. Copy this command and run it there.`;
}

/** The caption for an off tile, when the provider publishes no command. */
export function agentNoCommandOnMachine(agent: string, label: string): string {
  return (
    `${agent} is not installed on ${label}. Tortie finds it as soon as it ` +
    `is on that machine's login shell PATH.`
  );
}
```

`INSTALL_NOTE_LINE` in `src/renderer/state/agents.ts`, being "Tortie does not run install commands for
you.", is **unchanged and now does more work**. It is what stops "run it there" reading as an offer, and
it is what keeps the install map's promise legible on a surface that names a second computer.

### 6.2 The ˅ quick create menu, surface 3

`quickCreateMenuItems` already sets `disabled: !opt.installed` and `sublabel: 'not installed'`. A native
menu row has a sublabel slot and no measured width limit, so here the label **may** ride the row, which
is rule B in its literal form.

```ts
/** The quick create menu's sublabel for an agent the tab's machine lacks. */
export function agentNotOnMachineSublabel(label: string): string {
  return `not installed on ${label}`;
}
```

Lower case, to match the `not installed` already beside it. The menu draws no sentence of its own, because
a native menu has nowhere to put one, and the refusal that follows a press is section 6.3.

### 6.3 The store's refusal, which every create surface inherits

One new branch in `createSession` in `src/renderer/state/sessions-slice.ts`, immediately after the
Phase 94 machine check and before the name dedupe.

```
Claude Code is not installed on Mac Pro, so Tortie started nothing. The files
in this tab are on that machine, so the session would run there. Install it on
Mac Pro, or pick an agent that machine has.
```

Three sentences, sticky, in the shape of the four sentence Phase 94 refusal directly above it. The last
clause differs from `noRemoteProgramRefusal` on purpose. That sentence ends "or start the session on a
machine that has it", and from inside a tab a person cannot change the machine, because the ⌘T sheet
locks the Machine field to the tab's machine when `tabIsRemote`. Offering an action the surface forbids
is the defect Phase 84 item 8 exists to remove.

### 6.4 The ⌘T sheet's own block, for the third state only

When the board drew every tile on and the far side refused anyway, the sheet must draw the full block
rather than the one line row it draws today. That needs a new code on the wire.

Add `AGENT_NOT_ON_MACHINE` to the `GmuxError` code union in `src/shared/types.ts`, which holds 16 codes
today, with `detail` carrying the machine label. The precedent is Phase 48, which added
`AGENT_INTERPRETER_MISSING` for exactly this reason, being that the agent is present and telling a
person to install it again is the wrong instruction.

```
Title   Claude Code is not installed on Mac Pro
Body    (the existing noRemoteProgramRefusal sentence, unchanged)
Action  Ask Mac Pro again
```

**The action is not `Try again`.** `tryAgain` in `CreateSessionModal.tsx` calls
`resetAgentAvailabilityCache()` and `rescanAgents()`, both of which scan this Mac. Reusing it here would
rescan the wrong computer and then re-submit, so the person would press a button, wait, and read the same
sentence. The new action asks the machine and nothing else.

## 7. The Zen rules, checked against the draft rather than asserted

| rule | how the draft obeys it |
| --- | --- |
| No badge | Nothing is added to the activity rail, the tab spine or the session rows. Every change is on a surface a person opened to choose an agent |
| No dot | No colour and no glyph carries the answer. The tile uses the dashed recessive outline `agent-grid.css` already draws for `missing`, which was chosen because dropping the border punched holes in the grid |
| No count that rises on its own | No number appears anywhere in section 6. The word `some` is used where a count would have been |
| Nothing animates | No new transition, no spinner and no pulse. The third state's sentence is a sentence, not a progress line |
| No tmux vocabulary | No draft string contains pane, window, prefix, socket, session id, attach or a verb name. Machines have labels and sessions have names |
| Not a marketplace, CLAUDE.md refusal 3 | Nothing offers to install anything. The command shown is the provider's own published text, `INSTALL_NOTE_LINE` says Tortie does not run it, and the copy button writes to this Mac's clipboard |
| Nothing starts on configuration alone | No draft string is an action. The only thing any of them can cause is a person opening a terminal themselves |

One more, from CLAUDE.md's UI rules. Nothing here sets a session's status, and no draft string uses the
words `needs input`.

## 8. How this composes with Phase 94, rather than duplicating it

Phase 94 made the no modal create carry the tab's machine and refuse when that machine cannot hold a
session. Read this session in `createSession`: it computes `tabMachineId` from `project.machineId`, then
`effectiveMachineId`, then when the caller named no machine it reads `gmux.machines.rows()` and refuses
unless a row with that id has `usable` true.

**Three refusals now sit in sequence and exactly one can fire.**

```
  a create arrives at createSession, from any of the 5 surfaces that reach it
        |
        v
  1. is the tab on a machine, and can that machine hold a session?
        |  no  -> Phase 94's sentence. Unchanged. The agent question is never
        |         asked, because with no connection Tortie has no answer
        |         about that machine's agents either.
        v yes
  2. does Tortie hold an agent answer for that machine, and is this agent
     absent from it?
        |  yes -> section 6.3's sentence. Nothing crosses to the machine.
        v no, or Tortie holds no answer
  3. the create is sent. findRemoteProgram searches the machine at step 5,
     before the manifest row at step 7 and before new-session at step 8.
        |  not found -> noRemoteProgramRefusal, unchanged, drawn as section
        |               6.4's block rather than as a one line row.
        v found
     the session starts on that machine
```

Check 1 stays first and is untouched. Check 2 is new and is the only thing this round adds to the store.
Check 3 already exists and only its drawing changes. **Check 2 can never fire when check 1 fired**, because
check 1 returns false, and it can never fire on a machine Tortie has not asked, because it tests an answer
Tortie holds rather than the absence of one.

**Nothing is duplicated into a surface.** Phase 94's own lesson, written into the comment above
`tabMachineId`, is that a guard living in one surface covers that surface and misses the next one added,
which is the failure mode Phase 84 found in Restart. Check 2 obeys it. Surfaces 13 and 14 get the new
refusal with no code of their own, and so does any create surface a later phase adds.

## 9. What must not regress

- A tab whose files are on this Mac draws exactly the board it draws today, with the same 12 tiles, the
  same three unusable states and no machine sentence anywhere. This is the local control the Phase 94
  drive already runs first, at `readings.local` in `src/renderer/settings/p94-create-drive.ts`.
- `focusChoosesTile` in `AgentGrid.tsx` keeps the choice off any tile that cannot run. A tile that is off
  because the machine lacks the agent is a fourth reason to be unusable and must reach the same function,
  not a parallel one. The measured defect it fixed was one Shift+Tab landing on the Shell tile and Enter
  creating `claude-1`.
- The `absent` block's `Try again`, for a tab on this Mac, still rescans this Mac. Section 6.4 adds a
  branch beside it and changes nothing in it.
- `machineNotSignedInOption` and `MACHINE_NOT_SIGNED_IN_HINT` are untouched. This round adds a second
  reason a create can be refused, and it must not fold into the machine reason. They are different facts
  with different fixes, which is the same argument `ready` and `usable` already won in
  `src/shared/ipc/machines.ts`.

## 10. What would prove this, and it is Tier 2 for the copy

The copy is Tier 1 by CLAUDE.md's own list, being labels and captions. The board's behaviour is Tier 2,
because it is a feature touching one subsystem and a wrong answer costs a person one press, not their
work. It is **not** Tier 3, because nothing here can lose or destroy work and nothing here claims to work
across every agent. The claim that a scan works across every agent belongs to investigator 2 and is Tier 3
by the rule in CLAUDE.md, and this round should not be promoted to sit beside it.

The drive already exists and should be extended rather than replaced.
`src/renderer/settings/p94-create-drive.ts` calls the product's own `launchAgent` and the store's own
`quickCreate` inside a tab whose files are on a machine, and reads what happened. It takes three readings
today, being a local control, a refused hotkey and a refused board. **Add a fourth and a fifth**, being an
agent absent from a machine that IS usable, and the third state where Tortie holds no answer and the tile
stays on. The drive supplies exactly one thing, the second computer, and the phase report must say so the
way that file's header already does.

Two screenshot reads earn their cost, because both surfaces are visual and neither has been photographed:
the ⌘T board in a remote tab with at least one tile off, and the full window `NoSessions` board in the
same tab. Phase 84's own report records that no screenshot was taken of its create sheet, so this is a
gap the programme already carries.

## 11. What I did not measure, said plainly

- **Nothing was run against the Mac Pro and no machine was contacted.** Every claim above is a read of the
  tree in this worktree. The 17 folder figure in section 3 is quoted from the charter's own recorded
  measurement of 2026-08-19, not taken by me.
- **No screenshot was taken and no app was launched.** The 192 px and 67 px figures in section 0 are read
  from the comment in `src/renderer/app/agent-grid.css`, which records them as measured, and I did not
  re-measure them. Measuring them again would mean rendering the board at a fixed track width and reading
  the computed widths of `.agent-tile-name` and `.agent-tile-meta`, which the harness could do in the same
  run as the screenshots in section 10.
- **I did not read the operator's machines file, his manifest or his userData**, so I do not know how many
  machines he has confirmed or what their labels are. `Mac Pro` is used above as an example label only.
  Where the drafted copy interpolates a label, nothing in it assumes a length, except the deliberate rule
  that the tile's meta slot never receives one.
- **I did not verify the copy against the vocabulary audit by running it.** The audit strips comments,
  imports and exports and then reads every string literal. I read its word list by eye and no drafted
  string contains a transport word. Running `npx vitest run src/renderer/app/__tests__/machine-vocabulary.test.ts`
  after the three files are added to `FILES` is the check.
- **I did not count how many of the 301 fragments in `build/assert-bundle-refusals.mjs` would need to
  grow.** I checked only that `noRemoteProgramRefusal` is absent from it today, by grepping for
  `It looked in` and `Install it on` and finding zero hits. Whether the section 6.3 refusal should be
  pinned there is a question for the phase, and the argument for pinning it is that a person can reach it
  in ordinary use, which is the standard that file states for itself.
- **I did not rule on when Tortie asks a machine, how the answer is stored or how it is invalidated.**
  That is investigator 3's question. Section 5 depends on it only through the third state, and the words
  for that state hold whatever the answer turns out to be.
