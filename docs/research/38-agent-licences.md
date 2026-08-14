# 38. Licences of the coding agent harnesses, and what they mean for Tortie going public

**Written 2026-08-12. Every claim carries the date it was checked, which is 2026-08-12 unless the row says otherwise.**

**Scope.** This document does two things. It records the licence of every coding agent harness in the
field, with the twelve that Tortie's registry supports done exhaustively and 28 more surveyed around
them. It then says what those licences mean for putting `github.com/gregce/tortie` on the public
internet under MIT.

**Standard of evidence.** Every licence claim comes from one of three places. The first is the LICENSE
file in the vendor's own repository. The second is the `license` field in the vendor's own published
package, or a licence file extracted from the package tarball. The third is the vendor's own terms
page. No summary was used. No README badge was used. No shields.io image was used. Nothing came from
memory. Where a source could not be read, the row says so and the licence is written as unknown.

**Why the bar is set there.** An earlier round of research on this project asserted that
`mhutchie/vscode-git-graph` was MIT. It is not. Its LICENSE denies derivative works. A licence claim
that is wrong looks exactly like one that is right, so the only defence is reading the document.

**The same trap was found again in this survey, three times.** All three are described below. The
sharpest one has the identical shape to the git-graph mistake, meaning a famous organisation, a public
repository and a licence that forbids derivative works.

---

## 1. The answer

Of the twelve tools Tortie launches, five are open source, six are proprietary with the source closed,
and one is split between an MIT source tree and a proprietary shipped build. Two of the six proprietary
tools publish no licence document of any kind, so their licence is recorded as unknown rather than
guessed. Nothing in the set is copyleft. Publishing Tortie under MIT therefore creates no licence
conflict with any of the twelve.

Across the wider field of 28 further products, 19 are permissive open source, 2 are copyleft, 1 is open
core, 1 is source available with restrictions, and 6 are proprietary with no source. The direction of
travel over the last sixteen months is toward open licences on the harness. Section 4 gives the dated
moves that evidence this, and it also gives the reason the count flatters the picture.

**Three findings would surprise someone who assumed the obvious.**

| # | The finding | Where |
|---|---|---|
| 1 | The Copilot extension inside the Visual Studio Code that Microsoft ships is **not** MIT. The file `extensions/copilot/LICENSE.txt` is MIT in the `microsoft/vscode` repository and is GitHub's proprietary extension terms in the installed application. Same path, same filename, two different licences. The app's own `package.json` says `"license": "MIT"`, which is inherited from Code-OSS and is wrong for the Microsoft build. | §2.1 |
| 2 | **GitHub Copilot CLI declared itself MIT for two days.** Reading the `license` field across all 788 published versions of `@github/copilot` shows `MIT` from 2026-01-21 to 2026-01-23, with `SEE LICENSE IN LICENSE.md` on either side. The actual licence forbade derivative works throughout. A survey of today's state alone would miss this. | §3.2 |
| 3 | **Charm Crush was MIT and is not any more.** Its licence changed to FSL-1.1-MIT on 2025-07-28. Crush still appears in roundups of open source coding agents. It is source available with a competing-use restriction. | §4.1 |

**The exposure that matters for Tortie is not licences, it is trademarks.** Tortie compiles twelve
vendor logo files into the shipped app. An MIT licence tells the world it may copy and sell everything
in the repository, and Tortie cannot grant that for someone else's logo. Five of the twelve files need
a change before the repository is public. Section 6.2 gives the per-file verdict and the fix. The fix is
a NOTICE file, a README line and three replacement glyphs. It is not removing the icons.

---

## 2. The twelve in Tortie's registry

Every row was read on 2026-08-12. "Source available" answers whether the source of the shipped product
can be read, not whether a client binary can be downloaded.

| # | Tortie name | Binary | Who makes it | Category | Exact licence | Source available | Primary source read |
|---|---|---|---|---|---|---|---|
| 1 | Claude Code | `claude` | Anthropic PBC | Proprietary, source closed | No SPDX identifier. "© Anthropic PBC. All rights reserved." npm `license` field is `SEE LICENSE IN README.md`. | No. The installed binary at `/Users/gdc/.local/share/claude/versions/2.1.229` is a 294,720,528-byte Mach-O executable. | `registry.npmjs.org/@anthropic-ai/claude-code/latest` (2.1.229); `/usr/local/lib/node_modules/@anthropic-ai/claude-code/LICENSE.md`; `www.anthropic.com/legal/commercial-terms`, effective 2025-06-17 |
| 2 | Cursor CLI | `cursor-agent` | Anysphere | Proprietary, source closed | No SPDX identifier. Cursor Terms of Service, last updated 2026-01-13. | No. See the npm trap below. | `cursor.com/terms-of-service`; `/Users/gdc/.local/share/cursor-agent/versions/2026.08.11-e8db854/package.json` |
| 3 | Codex CLI | `codex` | OpenAI | Open source | Apache-2.0, "Copyright 2025 OpenAI" | Yes | `raw.githubusercontent.com/openai/codex/main/LICENSE`, 10,926 bytes; npm `@openai/codex` 0.77.0 field `Apache-2.0` |
| 4 | Gemini CLI | `gemini` | Google | Open source | Apache-2.0 | Yes | `raw.githubusercontent.com/google-gemini/gemini-cli/main/LICENSE`, 11,357 bytes; npm `@google/gemini-cli` 0.54.0 field `Apache-2.0` |
| 5 | Factory Droid CLI | `droid` | Factory AI | Proprietary, source closed | **No licence at all.** The `Factory-AI/factory` repository returns `license: null`. Use is governed by the Factory terms of service, last updated 2026-07-14. | No | `api.github.com/repos/factory-ai/factory`; `www.factory.ai/legal/terms-of-service` |
| 6 | DeepSeek TUI | `deepseek` | **Hmbown, an individual. Not DeepSeek.** | Open source | MIT, "Copyright (c) 2024-2025 DeepSeek CLI Contributors" | Yes | `raw.githubusercontent.com/Hmbown/CodeWhale/main/LICENSE`; npm `deepseek-tui` 0.8.47 field `MIT` |
| 7 | Antigravity CLI | `agy` | Google | Proprietary, source closed | **Unknown.** No licence file in the install. No public source repository found. The terms page grants no licence to the software. | No. `/Users/gdc/.local/bin/agy` is a 172,267,536-byte prebuilt binary. | `antigravity.google/terms`; the installed binary and its config directory |
| 8 | Muse Code | `muse` | Meta | Proprietary, source closed | **Unknown.** No licence file. No terms URL located. No public source. | No. `muse-bin-0.1.0-R708.1` is 101,945,920 bytes. | `/Users/gdc/.local/bin/muse`, which downloads from `lookaside.facebook.com` and authenticates at `auth.meta.com` |
| 9 | Qwen Code | `qwen` | Alibaba Qwen team | Open source | Apache-2.0, dual copyright "Copyright 2025 Google LLC" and "Copyright 2025 Qwen", because Qwen Code is a fork of Gemini CLI. | Yes | `raw.githubusercontent.com/QwenLM/qwen-code/main/LICENSE` lines 190 and 191; `/Users/gdc/.local/lib/qwen-code/LICENSE`, 203 lines |
| 10 | Pi | `pi` | Mario Zechner, earendil-works | Open source | MIT, "Copyright (c) 2025 Mario Zechner" | Yes | `raw.githubusercontent.com/earendil-works/pi/main/LICENSE`; npm `@earendil-works/pi-coding-agent` 0.84.1 field `MIT` |
| 11 | Cursor IDE | `cursor` | Anysphere | Proprietary, source closed | Same terms as row 2. | No | `cursor.com/terms-of-service` |
| 12 | VS Code Copilot | `code` | Microsoft and GitHub | **Split. Three layers with three different answers.** | See §2.1 | Partly | See §2.1 |

**Restrictions in these twelve that bind a third party.** Only one of the twelve carries a clause that
reads on its face against another product launching it. That is Antigravity, and it is quoted in §6.1.
The other eleven restrict the user who accepted the terms, not a launcher.

**A note on Qwen's metadata.** The `license` field is absent from every one of the 581 published
versions of the `@qwen-code/qwen-code` package. Any tool that reads npm metadata will report Qwen Code
as unknown. The Apache-2.0 answer comes from the LICENSE file, which is the correct source.

### 2.1 Row 12 is three products, and the middle layer is the trap

Tortie's twelfth entry launches the Visual Studio Code application and watches Copilot chat inside it.
Three licences are stacked there and they are routinely conflated.

| Layer | Exact licence | Source available | Read at |
|---|---|---|---|
| The VS Code source tree | MIT, "Copyright (c) 2015 - present Microsoft Corporation" | Yes | `raw.githubusercontent.com/microsoft/vscode/main/LICENSE.txt` |
| The `Visual Studio Code` application Microsoft ships | Proprietary. "MICROSOFT SOFTWARE LICENSE TERMS / MICROSOFT VISUAL STUDIO CODE". Reverse engineering is banned. The page itself says the source is separately MIT. | No | `code.visualstudio.com/license` |
| The Copilot extension **as shipped inside that application** | **Proprietary.** "GITHUB LICENSE TERMS FOR EXTENSIONS, © GitHub, Inc. All rights reserved." | No | `/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/copilot/LICENSE.txt`, 8,154 bytes |
| The Copilot extension **as it appears in the repository** | MIT | Yes | `microsoft/vscode`, path `extensions/copilot/LICENSE.txt` |

**This is the git-graph shape and it is worth stating slowly.** The path is the same. The filename is
the same. The licence is different. The shipped file says you may install and use the extension "only
with GitHub approved software", it says "Extensions are licensed, not sold", and it does not grant a
right to make derivative works. The repository file is the MIT licence.

**The metadata makes the wrong answer easy to reach.** The file
`/Applications/Visual Studio Code.app/Contents/Resources/app/package.json` declares
`"license": "MIT"` at version 1.132.0. That field is inherited from the Code-OSS source tree and it does
not describe the Microsoft build or its bundled extensions. A scanner reading it would report the whole
application as MIT, and that is wrong twice over.

**One earlier claim about this row is corrected.** A prior draft cited
`microsoft/vscode-copilot-chat` as the home of the extension. That repository was archived on
2026-05-20 and stopped receiving commits. The extension now lives in `microsoft/vscode` under
`extensions/copilot`.

**One earlier claim about this row is softened.** A prior draft said the extension "went from closed
source to MIT on 2025-06-10". That date is when the `vscode-copilot-chat` repository was created. A
creation date says when an MIT repository first appeared. It is not evidence about what licence applied
before it. The direction is very likely right and the date is not proof of it.

### 2.2 Two more traps in the twelve

**The npm package named `cursor-agent` is not Cursor's CLI.** It is MIT, it was published on 2025-01-10
by the user `zalab-inc`, and its repository is `zalab-inc/cursor_agent`. Cursor's real CLI is
`@anysphere/agent-cli-runtime`, it is marked `private: true`, it has no `license` field, and it is not
published to npm at all. The three `*.LICENSE.txt` files inside its bundle are extracted dependency
notices, not the licence of the product. Anyone answering "what licence is Cursor CLI" by searching npm
gets MIT, and MIT is the wrong answer.

**Tortie ships DeepSeek's logo for a tool DeepSeek did not write.** `deepseek-tui` is an MIT project by
an individual whose npm account is `Hmbown`, and its repository is `Hmbown/CodeWhale`. The copyright
line reads "DeepSeek CLI Contributors". The author has already moved off the name. As of 2026-08-12 the
`deepseek-tui` package description reads "Legacy compatibility package. Renamed to `codewhale`". This
is dealt with in §6.2.

### 2.3 One finding that is not about licences

`deepseek-tui` 0.8.47 publishes an **empty `bin` field**, so it installs no executable. The successor
package `codewhale` 0.9.6 installs `codewhale` and `codew`. Tortie's registry probes for the binary
name `deepseek` at `src/main/agents/registry.ts` line 683. Detection works on this machine only because
the older 0.8.26, which did install a `deepseek` binary, is still present. A fresh install today would
not be detected. This belongs in the backlog as a detection bug. It has no licence consequence and is
recorded here only because it was found while reading the package metadata.

---

## 3. The wider field

28 further products, all read on 2026-08-12. The operator named Grok as an example, so that row is
first. Discovery for this section ran through the GitHub API and the npm registry rather than the open
web, which is stated as a limit in §7.

### 3.1 The table

| Product | Exact licence | Category | Source available | Read at |
|---|---|---|---|---|
| Grok Build, xAI's own harness | Apache-2.0, "Copyright 2023-2026 SpaceXAI" | Open source | Yes | `raw.githubusercontent.com/xai-org/grok-build/main/LICENSE` |
| grok-cli, the community client | MIT | Open source | Yes | `api.github.com/repos/superagent-ai/grok-cli` |
| Aider | Apache-2.0 | Open source | Yes | `raw.githubusercontent.com/Aider-AI/aider/main/LICENSE.txt` |
| OpenCode | MIT | Open source | Yes | `raw.githubusercontent.com/sst/opencode/dev/LICENSE` |
| Cline | Apache-2.0 | Open source | Yes | `raw.githubusercontent.com/cline/cline/main/LICENSE` |
| Continue | Apache-2.0 | Open source | Yes | `raw.githubusercontent.com/continuedev/continue/main/LICENSE` |
| Goose | Apache-2.0 | Open source | Yes | `api.github.com/repos/aaif-goose/goose` and its LICENSE |
| Freebuff, formerly Codebuff | Apache-2.0 | Open source | Yes | `api.github.com/repos/CodebuffAI/freebuff` and its NOTICE |
| OpenHands | MIT | Open source | Yes | `raw.githubusercontent.com/OpenHands/OpenHands/main/LICENSE` |
| SWE-agent | MIT | Open source | Yes | `raw.githubusercontent.com/SWE-agent/SWE-agent/main/LICENSE` |
| Kimi Code CLI | MIT | Open source | Yes | `raw.githubusercontent.com/MoonshotAI/kimi-code/main/LICENSE` |
| Kimi CLI, the Python one | Apache-2.0 | Open source | Yes | `raw.githubusercontent.com/MoonshotAI/kimi-cli/main/LICENSE` |
| Kilo Code | MIT | Open source | Yes | `raw.githubusercontent.com/Kilo-Org/kilocode/main/LICENSE` |
| Roo Code | Apache-2.0. **Archived 2026-05-15.** | Open source | Yes | `api.github.com/repos/RooCodeInc/Roo-Code` |
| Amazon Q Developer CLI | Apache-2.0 | Open source | Yes | `api.github.com/repos/aws/amazon-q-developer-cli` |
| Open Interpreter | Apache-2.0 | Open source | Yes | `raw.githubusercontent.com/openinterpreter/openinterpreter/main/LICENSE` |
| Plandex | MIT. Last pushed 2025-10-03. | Open source | Yes | `api.github.com/repos/plandex-ai/plandex` |
| Refact | BSD-3-Clause. **Archived 2026-05-30.** | Open source | Yes | `api.github.com/repos/smallcloudai/refact` |
| Void | Apache-2.0. **Archived 2026-06-02.** | Open source | Yes | `api.github.com/repos/voideditor/void` |
| Warp, and its Oz agent | AGPL-3.0. The repository also carries `LICENSE-MIT`, copyright "Denver Technologies, Inc. 2020-2026". Which parts each file covers was not established. | Copyleft open source | Yes | `warpdotdev/Warp`, files `LICENSE-AGPL` and `LICENSE-MIT`, branch `master` |
| Zed's agent | GPL-3.0. The repository root carries both `LICENSE-APACHE` and `LICENSE-GPL`, which is why the GitHub API reports `NOASSERTION`. | Copyleft open source | Yes | `zed-industries/zed`, file `crates/agent/LICENSE-GPL` |
| Tabby | Apache-2.0 outside the `ee/` directory, which is carved out | Open core | Partly | `raw.githubusercontent.com/TabbyML/tabby/main/LICENSE` |
| **Charm Crush** | **FSL-1.1-MIT**, the Functional Source License version 1.1 with an MIT future licence | **Source available with restrictions** | Yes | `raw.githubusercontent.com/charmbracelet/crush/main/LICENSE.md`; npm `@charmland/crush` field `FSL-1.1-MIT` |
| **GitHub Copilot CLI** | **Custom proprietary, the "GitHub Copilot CLI License"** | **Proprietary, no source** | No | `raw.githubusercontent.com/github/copilot-cli/main/LICENSE.md`; `/Users/gdc/.npm-global/lib/node_modules/@github/copilot/LICENSE.md` |
| **Auggie, from Augment** | **Custom proprietary.** The licence terminates when the subscription does. | **Proprietary, no source** | No | `raw.githubusercontent.com/augmentcode/auggie/main/LICENSE.md` |
| Amp | No SPDX identifier. The npm `license` field is the literal string `SEE LICENSE IN LICENSE.md`, and that file reads in full "© Sourcegraph Inc. All rights reserved. Use of Amp is subject to Amp's Terms of Service". | Proprietary, no source | No | npm `@ampcode/cli` and `@sourcegraph/amp`, both at 0.0.1786579933-ga2774d; `ampcode.com/terms` |
| Devin, from Cognition | Proprietary, terms only | Proprietary, no source | No | `cognition.com/legal/platform-terms-of-service`, last updated 2026-06-30 |
| Windsurf, from Cognition | Proprietary, terms only. The Windsurf terms URL redirects into the Cognition platform terms, so Windsurf and Devin now share one agreement. | Proprietary, no source | No | `windsurf.com` terms redirect |
| Kiro, from AWS | **Unknown** | Proprietary, no source | No | `kirodotdev/Kiro` is an issues-only repository with no LICENSE file |

### 3.2 The four entries that need reading twice

**Grok Build is xAI's harness and it is Apache-2.0.** The repository `xai-org/grok-build` was created on
2026-07-14. It is a Rust terminal interface. Note the two different things called Grok. The popular
`superagent-ai/grok-cli` is MIT and its own README says it is not affiliated with xAI. A sentence
saying "Grok CLI is MIT" describes the community client, not xAI's product.

**Grok Build is open source and closed to contribution.** Its CONTRIBUTING file says the repository
"does **not** accept external pull requests or unsolicited patches" and that "the public tree is
published for source transparency and local builds". A `SOURCE_REV` file holds one internal commit
hash. The licence is genuinely open. The development model is not. These are separate facts and both
are true.

**GitHub Copilot CLI is not open source, and its repository has 11,084 stars.** The repository
`github/copilot-cli` contains `.github`, `LICENSE.md`, `README.md`, `changelog.md` and `install.sh`.
There is no source in it. Section 3 of the licence says the licence does not grant the right to
"Modify, adapt, translate, or create derivative works of the Software". Section 2 does permit
redistribution of unmodified copies inside a larger application, quoted here because it is the most
explicit statement any vendor in this survey makes about bundling:

> "The Software is distributed only in unmodified form; The Software is redistributed solely as part of
> an application or service that provides material functionality beyond the Software itself; The
> Software is not distributed on a standalone basis or as a primary product; You include a copy of this
> License and retain all applicable copyright, trademark, and attribution notices; and Your application
> or service is licensed independently of the Software."

**GitHub Copilot CLI also declared itself MIT for two days.** Walking the `license` field of all 788
published versions of `@github/copilot` gives this sequence.

| From version | Published | `license` field |
|---|---|---|
| 0.0.350-8 | 2025-10-23 | `SEE LICENSE IN LICENSE.md` |
| 0.0.389-1 | 2026-01-21 | `MIT` |
| 0.0.393 | 2026-01-23 | `SEE LICENSE IN LICENSE.md` |

The licence document forbade derivative works throughout that window. The metadata was wrong for two
days. Anyone who cached the answer during it, or who reads a page that did, holds a wrong answer today.

**Amp's metadata gives a scanner nothing, and two legal entities appear.** The npm `license` field is
the string `SEE LICENSE IN LICENSE.md`, which no SPDX parser can resolve. The `LICENSE.md` extracted
from the current tarball names Sourcegraph Inc. The terms page at `ampcode.com/terms` opens with "ANY
TERMS THAT APPLY TO YOUR USE OF OTHER AMP FRONTIER CORPORATION ("AMP") PRODUCTS". The npm scope has also
moved, and `@sourcegraph/amp`'s own description now reads "Renamed to @ampcode/cli". Both package names
currently publish the same version.

**An earlier draft of this document got Amp wrong, and the reason is worth recording.** It said the
package has no `license` field and no licence file. That was read from the copy installed on this
machine, which is `@sourcegraph/amp` version 0.0.1760472128 dated 14 October 2025. That copy genuinely
has neither. The published package has had both since then. A local install is a snapshot of the day it
was installed and it is not a primary source for today's licence.

---

## 4. The trend, with dates

### 4.1 The moves that actually happened

| Date | Product | What changed | Direction |
|---|---|---|---|
| 2025-04-17 | Crush and OpenCode | Both first licensed MIT from the same shared codebase. | Baseline for the next row |
| 2025-07-28 | Charm Crush | MIT became FSL-1.1-MIT. Commit `2562b0dc`, "docs(legal): update license (#318)", removed the MIT `LICENSE` and added `LICENSE.md`. | Away from open |
| 2025-08-29 | Codebuff | An Apache-2.0 licence was added, having previously had none. First commit on the file is "Add open source license". | Toward open |
| 2026-01-21 to 2026-01-23 | GitHub Copilot CLI | The npm `license` field read `MIT` for two days. The licence document did not change. | Metadata error, not a relicensing |
| 2026-03-25 | Goose | The `aaif-goose` organisation was created and `block/goose` now redirects there. Licence unchanged at Apache-2.0. | Ownership, not licence |
| 2026-04-28 | Warp | First public source release under AGPL-3.0, commit "Initial public release of Warp." Warp had been closed since 2020. | Toward open |
| 2026-05-15 | Roo Code | Archived. | Attrition |
| 2026-05-20 | `microsoft/vscode-copilot-chat` | Archived. The extension moved into `microsoft/vscode`. | Repository move |
| 2026-05-22 | Kimi Code CLI | New repository, MIT from its first commit. | Toward open |
| 2026-05-30 | Refact | Archived. | Attrition |
| 2026-06-02 | Void | Archived. | Attrition |
| 2026-06-19 | Codebuff | Renamed to Freebuff, homepage `freebuff.com`, still Apache-2.0. | Naming, not licence |
| 2026-06-30 | Cognition | Platform terms last updated. Windsurf's terms URL now redirects into them, so Windsurf and Devin share one proprietary agreement. | Consolidation |
| 2026-07-14 | Grok Build | Repository created under Apache-2.0. | Toward open |
| unknown | OpenCode | Moved from the `sst` organisation to `anomalyco`. MIT throughout. | Ownership, not licence |

### 4.2 What the moves mean

**The direction is toward open licences on the harness.** Three dated moves support this. Codebuff added
Apache-2.0 in August 2025 after publishing with no licence at all. Warp published its whole source
under AGPL-3.0 in April 2026 after six years closed. xAI published Grok Build under Apache-2.0 in July
2026. One product moved the other way, and that is Crush.

**The openness is worth less than the count suggests, and there are two reasons.**

The first reason is that an open harness is not an open system. Most of the permissive column ships
pointed by default at one vendor's hosted model behind an account and a paid plan. The Apache-2.0
licence on Grok Build governs Rust code that draws a terminal interface. It governs nothing about the
model that code talks to. A user can read every line of Grok Build and still cannot run it without
xAI's API. The same holds for Amazon Q Developer CLI, for Kimi and for Copilot CLI. The licence is real
and the freedom it grants is narrow.

The second reason is that the restrictive licences cluster exactly where the harness itself is the
product. Charm sells the harness, so Charm relicensed to forbid a competing one. Augment sells the
harness, so its CLI licence terminates when the subscription does. Sourcegraph's Cody repository is gone
and its replacement Amp ships as a closed client. GitHub gives its client away and forbids derivatives
of it. In each of those four cases the revenue depends on the harness rather than on a model. Where the
company sells a model instead, the harness is given away openly, because the harness is how users reach
the model.

**A third pattern is attrition, and it flatters the count.** Roo Code was archived on 2026-05-15, Refact
on 2026-05-30 and Void on 2026-06-02. Plandex has not been pushed since 2025-10-03. Aider was last
pushed on 2026-05-22, which is nearly three months ago. Cline, Continue, OpenCode, Kilo Code and Goose
were all pushed within the last day. The number of permissively licensed harnesses under active
development is closer to 13 than to 19.

### 4.3 The shape of the field, counted

| Class | Count of 28 | Share |
|---|---|---|
| Permissive open source, meaning MIT, Apache-2.0 or BSD-3-Clause | 19 | 68% |
| Copyleft open source, meaning AGPL-3.0 or GPL-3.0 | 2 | 7% |
| Open core | 1 | 4% |
| Source available with restrictions | 1 | 4% |
| Proprietary with the source closed | 6 | 21% |
| Licence could not be established | 1, being Kiro | 4% |

Kiro is counted in two rows, so the shares add to more than 100%.

### 4.4 The four categories, kept apart

The brief asked for these four to be distinguished, because products in the third and fourth categories
are widely described as being in the first.

| Category | Plain definition | Which products |
|---|---|---|
| **Open source licence** | You get the source. You may read it, change it and redistribute it. The OSI would recognise the licence. | Codex CLI, Gemini CLI, Qwen Code, Pi, DeepSeek TUI, the VS Code source tree, and the 21 open rows in §3.1 |
| **Source available with restrictions** | You get the source, but the licence forbids something an open source licence allows, which is usually competing with the vendor. | Charm Crush. Tabby's `ee/` directory is the same idea applied to part of a repository. None of Tortie's twelve is in this category. |
| **Proprietary client, source closed** | You get a binary. You do not get the source and you may not derive from it. | Claude Code, Cursor CLI, Cursor IDE, Factory Droid, Antigravity CLI, Muse Code, the shipped Copilot extension, GitHub Copilot CLI, Auggie, Amp, Devin, Windsurf, Kiro, the Visual Studio Code application |
| **A free service with terms, not a licence** | There is no software licence, because what is granted is access to a hosted service. The document is a contract about the service. | The GitHub Copilot subscription, the Amp service, the Cursor service, the Factory service, the Antigravity service. Every proprietary row above also has one of these behind it. |

Two products are commonly put in the wrong category. **Antigravity is often called Google's open source
agent.** There is no public repository, the shipped `agy` binary carries no licence file, and the terms
page grants no licence to the software. The confusion is understandable, because Google's other agent
CLI is genuinely Apache-2.0. **Crush is still listed in roundups of open source coding agents.** It has
not been open source since 2025-07-28.

---

## 5. What this means for Tortie, part one: the licences

### 5.1 Launching a tool creates no licensing obligation

Tortie starts each agent as a separate operating system process inside a tmux pane. It does not link
against the agent. It does not embed the agent's code. It does not ship the agent's bytes to anyone.
Copyright licences attach to copying, to modifying and to distributing a work. Tortie does none of
those three for any of the eleven unbundled tools. Running a program is not one of the acts a software
licence controls.

**Rather than reason from principle, I looked for the exception.** Below is the clause in each of the
twelve that comes closest to reaching Tortie, quoted from the source. Two rows were missing from an
earlier draft and are now present, and one of them is the sharpest clause in the set.

| Tool | The closest clause, quoted | Does it reach Tortie? |
|---|---|---|
| **Antigravity CLI** | `antigravity.google/terms`: "You must not abuse, harm, interfere with, or disrupt the Service. This includes, but is not limited to, using the Service in connection with products not provided by us. Using third party software, tools, or services to access the Service (e.g. using OpenClaw with Antigravity OAuth) is a breach of this Agreement." | **This is the closest call in the set and it should be a decision, not an oversight.** On a plain reading it does not reach Tortie. The named example is a third party client using Antigravity's OAuth, meaning a different program authenticating as the user and calling the service directly. Tortie launches Google's own `agy` binary, handles no credentials and speaks to no Google endpoint. The service is being accessed by Google's own client. Tortie is the terminal that client runs in. The operator should nonetheless read this clause and decide it deliberately, because "using the Service in connection with products not provided by us" is written broadly enough that Google could take a different view. |
| Factory Droid CLI | Terms updated 2026-07-14: the licence is "for internal use only", customers may not "create derivative works based on the Services", and customers "may not use or display the Service in competition with Factory, to develop competing products or services". | This is the broadest contract in the set. It still does not reach Tortie as a licence matter, because Tortie neither distributes Droid nor derives from it. The phrase "display the Service in competition" is the only other place in the twelve where an argument could be started. Any such argument would run against the user who accepted Factory's terms, not against Tortie's MIT repository. |
| Claude Code | Commercial Terms section D.4: a customer may not "access the Services to build a competing product or service, including to train competing AI models or resell the Services except as expressly approved", may not "reverse engineer or duplicate the Services", and may not "support any third party's attempt at any of the conduct restricted". | No. This binds the person using Claude Code, and it binds them as a contract rather than as a licence on Tortie. Tortie resells nothing, duplicates nothing and is not a competing model service. The "support any third party's attempt" wording would only bite if Tortie were built to help users do one of the listed restricted things. |
| Cursor CLI and Cursor IDE | Terms of Service, updated 2026-01-13: users may not "reverse engineer, disassemble, decompile", may not "reproduce, modify, translate, or create derivative works of the Service", and may not "use the Service or any Suggestions to develop or train a model that is competitive with the Service". | No. Tortie does not decompile `cursor-agent`, does not modify it and does not train a model. The competitive clause is about training a model. |
| **Muse Code** | No licence document and no terms page were found, so there is no clause to quote. | Cannot be assessed. The absence of a document is not permission and it is not prohibition. Recorded as unknown in §7. |
| VS Code Copilot | The shipped extension terms: "You may install and use any number of copies of Extensions only with GitHub approved software to develop and test your applications." | No. Tortie launches the Visual Studio Code application, which is GitHub approved software running the extension in the ordinary way. Tortie does not redistribute the extension. |
| Codex CLI, Gemini CLI, Qwen Code, Pi, DeepSeek TUI | Apache-2.0 or MIT throughout. | No. Both licences permit everything Tortie does, including bundling, which Tortie does not do. |

**One further clause points in Tortie's favour and is worth recording.** The GitHub Copilot CLI licence,
which is the most restrictive redistribution licence in the whole survey, expressly permits shipping an
unmodified copy inside a larger application that adds material functionality. Tortie does not bundle it
and does not need to. The point is that even the strictest licence found here allows more than Tortie
requires.

### 5.2 Copyleft does not reach Tortie either

Two products in the wider field are copyleft, being Warp under AGPL-3.0 and Zed's agent under GPL-3.0.
Neither obligation is triggered, because both attach to distribution and Tortie distributes neither. The
same reasoning covers Crush's competing-use clause. That clause would only be reached if Tortie bundled
Crush or shipped a substitute for it. Detecting an installed binary and starting it is neither.

### 5.3 The derived registry data is fine

Tortie's registry records, for each agent, its flag catalogue, its resume argv template, its session
store path and its version probe. Those were derived by running each tool and reading its help output.
Three reasons this is not exposure, and one boundary to respect.

1. **Facts about how a program behaves are not the program.** Copyright protects the expression that was
   written, not the facts a user observes when running it. A record saying `codex resume <id>` is a fact
   about an interface, and it is the same fact whether it was learned from help text, from a public
   repository or from a blog post.
2. **Every proprietary vendor here publishes the same facts.** Cursor, Factory, Google and Anthropic all
   document their CLI flags publicly. Recording something the vendor documents cannot be a secret.
3. **The act each proprietary contract prohibits is reverse engineering, and observing an interface is a
   different act.** Cursor bans "reverse engineer, disassemble, decompile, decode, or otherwise attempt
   to derive or gain access to the source code". Factory bans attempts to "discover the source code".
   Tortie read help output and watched which files appeared on disk. It disassembled nothing.

**The boundary.** Do not paste a proprietary tool's help text verbatim and at length into the
repository. Help text is written expression and it is the one part of this that copyright covers.
Tortie's registry mostly records structured facts, e.g., `binaries: ['cursor-agent']`, which is the
right shape. The long prose notes in `registry.ts` are Tortie's own words describing what was observed,
which is also fine. If any note turns out to be a copied paragraph of vendor help output, shorten it to
a description. This is a tidy-up and not a risk.

### 5.4 The one bundled tool, and it is the only real obligation

**The SpecStory CLI is Apache-2.0, and bundling it is permitted.**

| Question | Answer | Read at |
|---|---|---|
| What is bundled | `specstory` 2.8.0, darwin-arm64, 43,189,586 bytes, into `Contents/Resources/bin/specstory` | `build/specstory-release.json`; `electron-builder.yml` lines 172 to 184 and line 234 |
| Where the pin points | `specstoryai/getspecstory` tag `v2.8.0`, with an asset SHA-256 and a binary SHA-256 recorded | `build/specstory-release.json` |
| Its licence | Apache-2.0 | `/Users/gdc/getspecstory/LICENSE.txt`, 11,356 bytes of full Apache-2.0 text; `api.github.com/repos/specstoryai/getspecstory` reports `spdx_id: Apache-2.0` |
| Whose product it is | SpecStory, which is the operator's own company | `api.github.com/repos/specstoryai/getspecstory` |

**Two things are true at once and only the first is obvious.** The operator owns the product, so
permission is not in question. Apache-2.0 nonetheless attaches a condition to redistribution that
applies to everyone, including the copyright holder's other projects, and Tortie is redistributing a
binary.

> "4. Redistribution. You may reproduce and distribute copies of the Work or Derivative Works thereof in
> any medium, with or without modifications, and in Source or Object form, provided that You meet the
> following conditions: (a) You must give any other recipients of the Work or Derivative Works a copy of
> this License"

**Tortie satisfies none of that today, because Tortie ships no licence text at all.** The cached tarball
`build/vendor/specstory/cache/v2.8.0-SpecStoryCLI_Darwin_arm64.tar.gz` contains exactly one member,
being the `specstory` binary with no LICENSE beside it. The repository root has no `LICENSE`, no
`NOTICE` and no third-party attribution file, verified by listing the root and searching for those
names. Meanwhile `package.json` declares `"license": "MIT"` with no file to back it, and also declares
`"private": true`.

**What would change if a future SpecStory version were licensed differently.** Three cases, and only one
is work.

| If SpecStory moved to | Effect on Tortie | What to do |
|---|---|---|
| MIT or BSD | Nothing meaningful. Both permit binary redistribution with an attribution notice. | Update the NOTICE text. |
| A source-available licence such as FSL-1.1-MIT or BSL | The competing-use clause would have to be read against Tortie, because Tortie embeds it. Since SpecStory owns both, the clean answer is a written internal grant rather than reliance on the public licence. | Record the grant in the repository. |
| Closed and proprietary | Tortie could no longer ship the binary in a public MIT repository's release artefacts without a written distribution right. | Obtain that right in writing, or stop bundling and detect an externally installed `specstory` the way Tortie already detects the twelve agents. `src/main/specstory/resolve.ts` already handles a non-bundled copy. |

The pin is what makes this manageable. Because `build/specstory-release.json` names one exact version
and two hashes, the licence that applies is the licence of 2.8.0, and it cannot change under Tortie
without someone editing that file.

---

## 6. What this means for Tortie, part two: the vendor marks

This is the section with consequences, so it gets the space.

### 6.1 Why MIT makes this sharper, not softer

**Trademark is a different regime from copyright and MIT says nothing about it.** Copyright asks whether
you copied a work. Trademark asks whether the public will be confused about who made or endorsed a
product. Different tests decide them and they can point in opposite directions. A logo file can be
freely copyable as a file and still be a mark you may not use.

**Putting MIT on Tortie makes a promise Tortie cannot keep for someone else's logo.** MIT tells every
reader they may "use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software". If the repository contains twelve vendor logos and nothing says otherwise, that sentence
appears to grant those rights over the logos too. Tortie has no authority to grant them. This is why a
NOTICE file is not paperwork. It is the sentence that limits the grant to Tortie's own code.

**Four vendors wrote the correct position themselves, and it is the strongest primary evidence in this
survey.** Codex CLI, Gemini CLI, Qwen Code and Grok Build are all Apache-2.0. Section 6 of that licence,
identical in all four LICENSE files, reads:

> "6. Trademarks. This License does not grant permission to use the trade names, trademarks, service
> marks, or product names of the Licensor, except as required for reasonable and customary use in
> describing the origin of the Work and reproducing the content of the NOTICE file."

So for four of the twelve, the vendor's own licence says in terms that open sourcing the code granted
nothing over the marks, while carving out exactly the referential use Tortie needs for the **names**.
MIT is silent on trademarks, which has the same practical effect of granting nothing.

**Every published policy read in this survey draws the same line in the same place.** Using a vendor's
name in text to say truthfully that your product works with theirs is permitted. Using the vendor's logo
is a separate permission and it is usually withheld. Microsoft states both halves plainly. Its
trademark page says:

> "our logos, app and product icons, illustrations, photographs, videos, and designs can never be used
> without an express license"

and the same page permits a phrase of the form "Contoso app works with Microsoft Teams". So Tortie's
twelve **names** are on solid ground everywhere. Tortie's twelve **logos** carry the risk, and the risk
is highest exactly where a vendor has written the rule down.

### 6.2 What Tortie actually ships, and the per-file verdict

The directory `src/renderer/assets/agents/` holds twelve SVG files. The file
`src/renderer/icons/AgentIcon.tsx` imports every one with `?raw`, which inlines the file into the
compiled renderer bundle. They are in the shipped application, not merely in the repository.

Tortie's own commit history records where each came from, and it is a primary source about Tortie.
Commit `1794a1d`, "icons: agent logos, codicons, material file-icon theme":

> "AgentIcon: real vendor marks (claude, codex=OpenAI, gemini, amp, cursor, droid, githubcopilot,
> deepseek) inlined from normalized SVGs in src/renderer/assets/agents; monochrome marks converted to
> currentColor"

Commit `9522e6b`, "Phase 10.1: verifier fixes":

> "Agent identity: commissioned monochrome currentColor marks for antigravity (traced from vendor PNG),
> pi (vendor mark normalized), muse + qwen (authored)"

So ten of the twelve derive from a vendor mark and two are Tortie's own drawings. The commits also
record that the vendor marks were recoloured, and eleven of the twelve files now use `currentColor`.
Only `droid.svg` keeps literal colours, being `#020202` and `#FAFAFA`. The recolouring matters for two
vendors, because both wrote a rule against it.

In the table below, "Fine" means either that the published policy permits the use or that no policy
forbidding it was found, and in the second case the absence is stated. "Change" means a published policy
forbids the current file as it stands.

| File | Whose mark | What the vendor publishes | Verdict | The change |
|---|---|---|---|---|
| `githubcopilot.svg` | GitHub | `brand.github.com/foundations/logo` lists two separate prohibitions under "Don't do these things". One is headed "Use without permission" and reads "Do not use GitHub trademarks, logos, or artwork without GitHub's prior written permission". The other is headed "Modify the logo" and reads "Do not modify the permitted GitHub logos, including changing the color, dimensions". The same page also says "Beginning in 2025, GitHub Copilot no longer has a standalone logo". Microsoft's trademark page says logos "can never be used without an express license". | **Change** | Two rules are broken. The Copilot mark is not in GitHub's permitted set, and the file is recoloured to `currentColor`. Replace with a Tortie-drawn neutral glyph and keep the text label "VS Code Copilot". The same GitHub page does say "Use a permitted GitHub logo to inform others that your project integrates with GitHub", which would help if the mark were a permitted GitHub logo. It is not, and the file is recoloured, so the verdict stands. |
| `gemini.svg` | Google | The Google brand guidance says "To use a Google product icon in your work, create a Partner Marketing Hub account to find assets and request permission through our approval form". The same page says "Never use Google's brand colors or brand fonts in your work". A separate rule on that page, "Don't combine your logo with the Google G or modify the Google G in any way, including changing the color", governs the Google G specifically and not the Gemini product mark. | **Change** | The applicable rule is the product icon rule, which requires permission through the Partner Marketing Hub. Either request permission or replace with a Tortie-drawn glyph. |
| `antigravity.svg` | Google, and Tortie's own commit says "traced from vendor PNG" | The same Google product icon guidance. Tracing a vendor mark produces a derivative of that mark. | **Change** | Replace with an original glyph. This one is cheap, because the current file is a simple nine-point path. |
| `deepseek.svg` | **DeepSeek the company** | Nothing readable. `deepseek.com/en/terms` returned HTTP 404. | **Change, and this is the one that could mislead a user** | The problem is not permission, it is that the logo is wrong. Tortie labels the agent "DeepSeek TUI" and shows DeepSeek's whale beside it. The tool is `deepseek-tui`, an MIT project by an individual whose npm account is `Hmbown`, with the repository `Hmbown/CodeWhale` and the copyright line "DeepSeek CLI Contributors". DeepSeek did not write it. Showing one company's mark for another party's product is the exact confusion trademark law exists to prevent. The author has already moved off the name. Rename the row to CodeWhale, keep "DeepSeek TUI" as a legacy alias, and drop the whale. |
| `amp.svg` | Sourcegraph | Nothing about marks was found at `ampcode.com/terms`. Amp is not one of the twelve registry agents, yet the file is imported at `AgentIcon.tsx` line 35, mapped at line 56 and aliased at lines 78 and 79. | **Change, and it is free** | Delete the file, the import and the two aliases. Tortie does not support Amp, so there is no referential use to justify carrying its mark into the bundle. |
| `claude.svg` | Anthropic | No public trademark policy was found. `anthropic.com/legal/trademark` and `anthropic.com/legal/trademark-policy` both returned 404. Commercial terms section F says "these Terms do not grant either party any rights to the other's content or intellectual property, by implication or otherwise". | **Fine, with a note** | Referential use of a mark to identify a supported product is the ordinary case, and no published policy forbids it. Anthropic having no policy means there is no permission and no prohibition. Keep it and cover it with the README disclaimer. |
| `codex.svg` | OpenAI | Apache-2.0 §6 grants nothing over marks and permits "reasonable and customary use in describing the origin of the Work". The brand page could not be read, returning HTTP 403. | **Fine, with a note** | Identifying the supported product is describing the origin of the work. Keep it and cover it with the disclaimer. |
| `cursor.svg` | Anysphere | `cursor.com/brand` publishes downloadable logos and app icons. Its only stated restriction is "Refer to us as Cursor. Not Cursor AI or Cursor Code." | **Fine** | Cursor is the only vendor in the set that publishes assets for third parties with no permission gate found. Check that Tortie's copy tracks the current official asset, and check that no user-visible string says "Cursor AI". |
| `droid.svg` | Factory AI | No brand policy was found. | **Fine, with a note** | Referential use. This is the only unmodified full-colour file, at 6,042 bytes, so no recolouring rule can be broken by it. |
| `pi.svg` | earendil-works, and the commit says "vendor mark normalized" | An MIT project by an individual developer with no brand policy. | **Fine** | Lowest risk in the set. |
| `muse.svg` | Nobody. The commit says "authored". | Not applicable. | **Fine** | Tortie's own drawing. Confirm by eye that it does not resemble Meta's mark. |
| `qwen.svg` | Nobody. The commit says "authored". | Not applicable. | **Fine** | Tortie's own drawing. |
| `brand/specstory.svg` | SpecStory, the operator's own company | Not applicable. | **Fine** | Established in research 30. |

**Summary of the marks.** Five need a change and eight are fine. The five are `githubcopilot`, `gemini`,
`antigravity`, `deepseek` and `amp`. Four of the five are cheap, because the fix is either a deletion or
a replacement glyph. The fifth, `deepseek`, needs a label change as well as an icon change, and it is
the only one where the current state could actually mislead a user about who made something.

**One note on the icons' lineage.** The SVG paths closely track `simple-icons` revisions. Tortie's
`deepseek.svg` path begins `M23.748 4.482` where today's upstream copy begins `M23.748 4.651`, so the
lineage is the same and Tortie's revision is older. Which exact icon set the files passed through was
not pinned down, and it does not change the answer, because the trademark position is identical
whatever the intermediate source was. `simple-icons` says the same thing in its own disclaimer.

### 6.3 The change list before the repository goes public

Ordered by cost, cheapest first.

| # | Change | Why, in one line | Where |
|---|---|---|---|
| 1 | Add a root `LICENSE` file with the MIT text and a copyright line. | `package.json` claims MIT and no licence text exists anywhere in the repository. | new file `LICENSE` |
| 2 | Add a root `NOTICE` file listing the bundled and vendored third-party components with their licences. | Apache-2.0 §4(a) makes this a condition of shipping the SpecStory binary. It also covers codicons under CC-BY-4.0, material-icon-theme under MIT, Monaco under MIT, and anything copied from VS Code. | new file `NOTICE` |
| 3 | Add one line to the NOTICE saying the MIT grant covers Tortie's own code and not third-party marks. | MIT on its own appears to grant rights over the twelve vendor logos, and Tortie cannot grant those. | `NOTICE` |
| 4 | Ship the Apache-2.0 text next to the bundled binary in the app. | The same Apache-2.0 condition, applied to the distributed artefact rather than the repository. | `electron-builder.yml` `extraResources`, alongside `Contents/Resources/bin/specstory` |
| 5 | Delete `amp.svg`, its import and its two aliases. | Tortie does not support Amp, so carrying its mark has no referential justification. | `src/renderer/assets/agents/amp.svg`; `src/renderer/icons/AgentIcon.tsx` lines 35, 56, 78 and 79 |
| 6 | Replace `githubcopilot.svg` with a Tortie-drawn glyph. | GitHub's brand page forbids using its marks without written permission, and separately forbids recolouring a permitted logo. This file breaks both rules. Microsoft's trademark page forbids logo use without an express licence. | `src/renderer/assets/agents/githubcopilot.svg` |
| 7 | Replace `gemini.svg` and `antigravity.svg` with Tortie-drawn glyphs, or request Google's permission through the Partner Marketing Hub. | Google's guidance requires permission to use a Google product icon, and says never to use Google's brand colours. `antigravity.svg` is additionally a trace of a vendor image. | `src/renderer/assets/agents/gemini.svg` and `antigravity.svg` |
| 8 | Fix the DeepSeek row. Rename the display name to CodeWhale with "DeepSeek TUI" kept as an alias, and replace `deepseek.svg` with a neutral glyph. | The tool is a third party's MIT project and not a DeepSeek product, and the upstream author has already renamed it. | `src/main/agents/registry.ts` row `deepseek`; `src/renderer/assets/agents/deepseek.svg` |
| 9 | Add a short trademark disclaimer to the README, near the supported-agents list. | Covers the eight marks that stay. Suggested wording: "Tortie is not affiliated with, endorsed by, or sponsored by any of the companies whose products it launches. All product names and logos are the property of their respective owners, and are used here only to identify the supported product." | `README.md` |
| 10 | Read `registry.ts` once for any long block of copied vendor help text and shorten it to a description. | Facts about behaviour are fine. Verbatim help text is the vendor's writing. | `src/main/agents/registry.ts` |
| 11 | Decide the Antigravity question deliberately and record the decision. | The Antigravity terms say using third party tools to access the Service is a breach. On a plain reading Tortie is fine, because it launches Google's own client and handles no credentials. This should be a decision rather than an oversight. | a note in `docs/` or the README |

Items 1 to 5 are mechanical. Items 6 to 8 need three small glyphs drawn. Item 9 is one paragraph. Items
10 and 11 are a read-through and a decision.

**One thing this list deliberately does not do.** It does not remove the vendor names. Every published
policy read in this survey permits using a product's name in text to say truthfully that your product
works with it, and four vendors wrote that permission into their own licence at Apache-2.0 §6. The names
are the point of a registry of supported agents, and they are safe.

**The risk that actually runs the other way.** Naming a product in a picker is nominative use and is
ordinary. The exposure is in describing Tortie as supporting a vendor's product in wording that implies
the vendor endorses Tortie. The README disclaimer in item 9 is what closes that.

---

## 7. What is not established

Listed rather than hidden, with what would settle each one.

| Item | Status | What would settle it |
|---|---|---|
| Muse Code's licence | **Unknown** | No licence file exists in the launcher, the binary or the config directory, and no terms URL was found in the launcher script or in the 101 MB binary. No licence was inferred from Meta's other products, because Meta ships both Apache-2.0 and bespoke-licensed software. The one Apache-2.0 file found in the Muse tree covers a bundled skill pack and not the CLI. A licence page from Meta, or a licence file in a future build, would settle it. |
| Antigravity CLI's licence | **Unknown** | `antigravity.google/terms` grants no licence to the software. No licence was inferred from Gemini CLI being Apache-2.0. A published repository or a licence file in the install would settle it. |
| Kiro's licence | **Unknown** | `kirodotdev/Kiro` is an issues-only repository with no LICENSE file. No licence was inferred from AWS publishing the Amazon Q Developer CLI under Apache-2.0. |
| Sourcegraph Cody's fate | **Unknown** | `github.com/sourcegraph/cody` returns HTTP 404 today. No primary source was found for when or why it was removed. |
| Open Interpreter before 2025-04-16 | **Unknown** | It is Apache-2.0 now. Its LICENSE file has one commit, "Initial commit" dated 2025-04-16, so the history was rewritten and no earlier licence is verifiable from the repository. |
| Which parts of Warp each licence file covers | **Unknown** | The repository carries `LICENSE-AGPL` and `LICENSE-MIT`. The split between them was not established. Reading the repository's own licensing note would settle it. |
| OpenAI's brand guidelines | **Could not read** | `openai.com/brand`, `openai.com/brand/` and `openai.com/policies/brand-guidelines/` all returned HTTP 403 to both WebFetch and curl from this machine. The Codex verdict in §6.2 therefore rests on Apache-2.0 §6, which is a primary source and is sufficient. |
| Anthropic's trademark policy | **Does not appear to exist as a public page** | `anthropic.com/legal/trademark`, `anthropic.com/legal/trademark-policy` and the related support article all returned 404. |
| DeepSeek's brand policy | **Could not read** | `deepseek.com/en/terms` returned 404. This does not change the §6.2 verdict for that row, because the problem there is misattribution rather than permission. |
| Amp's terms last-updated date | **Not published** | The page at `ampcode.com/terms` shows no date. |
| Mistral's own coding agent | **Not found** | `mistralai` publishes client libraries and an agent-client-protocol repository, all Apache-2.0. No harness of their own was found. Recorded as not found rather than as non-existent. |
| Google Jules | **Not found** | No public repository was found under a Google organisation. |
| Whether `microsoft/vscode`'s `extensions/copilot` is the same code as the shipped extension | **Not established** | Licence files were compared. Builds were not. |
| Whether any vendor would in fact object | **Not knowable from documents** | This document reports what published policies say. It does not predict enforcement and nothing here is legal advice. |

**A limit on the wider-field survey's coverage.** Discovery for §3 ran through the GitHub API and the npm
registry rather than through open web search, because the search budget was spent before that section
began. A product that arrived in 2026 with no GitHub presence and no npm package would be invisible to
that method.

---

## 8. Sources

All read on 2026-08-12 unless stated. Local paths were read on this machine. Every repository under
`/Users/gdc` was treated as read-only.

**Licence files in repositories**
- `raw.githubusercontent.com/openai/codex/main/LICENSE`
- `raw.githubusercontent.com/google-gemini/gemini-cli/main/LICENSE`
- `raw.githubusercontent.com/QwenLM/qwen-code/main/LICENSE`
- `raw.githubusercontent.com/earendil-works/pi/main/LICENSE`
- `raw.githubusercontent.com/Hmbown/CodeWhale/main/LICENSE` and `docs/REBRAND.md`
- `raw.githubusercontent.com/microsoft/vscode/main/LICENSE.txt`, and the path `extensions/copilot/LICENSE.txt`
- `raw.githubusercontent.com/xai-org/grok-build/main/LICENSE` and its `CONTRIBUTING.md`
- `raw.githubusercontent.com/charmbracelet/crush/main/LICENSE.md`, plus the file at commit `e3a62736` and the change at commit `2562b0dc`
- `raw.githubusercontent.com/github/copilot-cli/main/LICENSE.md`
- `raw.githubusercontent.com/augmentcode/auggie/main/LICENSE.md`
- `raw.githubusercontent.com/Aider-AI/aider/main/LICENSE.txt`
- `raw.githubusercontent.com/sst/opencode/dev/LICENSE`
- `raw.githubusercontent.com/cline/cline/main/LICENSE`
- `raw.githubusercontent.com/continuedev/continue/main/LICENSE`
- `raw.githubusercontent.com/OpenHands/OpenHands/main/LICENSE`
- `raw.githubusercontent.com/SWE-agent/SWE-agent/main/LICENSE`
- `raw.githubusercontent.com/MoonshotAI/kimi-code/main/LICENSE` and `MoonshotAI/kimi-cli/main/LICENSE`
- `raw.githubusercontent.com/Kilo-Org/kilocode/main/LICENSE`
- `raw.githubusercontent.com/openinterpreter/openinterpreter/main/LICENSE`
- `raw.githubusercontent.com/TabbyML/tabby/main/LICENSE`
- `warpdotdev/Warp`, files `LICENSE-AGPL` and `LICENSE-MIT`, branch `master`
- `zed-industries/zed`, file `crates/agent/LICENSE-GPL`
- `raw.githubusercontent.com/simple-icons/simple-icons/develop/DISCLAIMER.md`

**Package metadata**
- `registry.npmjs.org/@anthropic-ai/claude-code/latest` (2.1.229)
- `registry.npmjs.org/@github/copilot`, all 788 published versions, for the `license` field history
- `registry.npmjs.org/@ampcode/cli/latest` and `@sourcegraph/amp/latest`, both 0.0.1786579933-ga2774d, plus the `LICENSE.md` extracted from the tarball `cli-0.0.1786579933-ga2774d.tgz`
- `registry.npmjs.org/deepseek-tui/latest` (0.8.47) and `registry.npmjs.org/codewhale/latest` (0.9.6)
- `registry.npmjs.org/@qwen-code/qwen-code`, all 581 published versions, for the absent `license` field
- `registry.npmjs.org/cursor-agent`, the unrelated MIT package published 2025-01-10 by `zalab-inc`
- `registry.npmjs.org/@charmland/crush`
- `api.github.com/repos/` for `factory-ai/factory`, `xai-org/grok-build`, `superagent-ai/grok-cli`, `microsoft/vscode-copilot-chat`, `specstoryai/getspecstory`, `sst/opencode`, `Aider-AI/aider`, `block/goose`, `aaif-goose/goose`, `CodebuffAI/freebuff`, `cline/cline`, `zed-industries/zed`, `aws/amazon-q-developer-cli`, `charmbracelet/crush`, `RooCodeInc/Roo-Code`, `smallcloudai/refact`, `voideditor/void`, `plandex-ai/plandex`, `kirodotdev/Kiro`

**Vendor terms and brand policies**
- `cursor.com/terms-of-service`, last updated 2026-01-13, and `cursor.com/brand`
- `www.factory.ai/legal/terms-of-service`, last updated 2026-07-14
- `www.anthropic.com/legal/commercial-terms`, effective 2025-06-17
- `antigravity.google/terms`
- `ampcode.com/terms`
- `cognition.com/legal/platform-terms-of-service`, last updated 2026-06-30
- `code.visualstudio.com/license`
- `brand.github.com/foundations/logo`
- `docs.github.com/en/site-policy/content-removal-policies/github-trademark-policy`
- `www.microsoft.com/en-us/legal/intellectualproperty/trademarks`
- `partnermarketinghub.withgoogle.com/brands/google/branding-guidelines/how-to-show-googles-brand/`

**Local primary sources on this machine**
- `/usr/local/lib/node_modules/@anthropic-ai/claude-code/LICENSE.md`
- `/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/copilot/LICENSE.txt`, 8,154 bytes
- `/Applications/Visual Studio Code.app/Contents/Resources/app/package.json`, version 1.132.0, `"license": "MIT"`
- `/Users/gdc/.npm-global/lib/node_modules/@github/copilot/LICENSE.md` (1.0.45)
- `/Users/gdc/.npm-global/lib/node_modules/@sourcegraph/amp/package.json` (0.0.1760472128, installed 2025-10-14, now stale)
- `/Users/gdc/.npm-global/lib/node_modules/deepseek-tui/package.json` (0.8.26)
- `/Users/gdc/.npm-global/lib/node_modules/@earendil-works/pi-coding-agent/package.json` (0.84.1)
- `/Users/gdc/.npm-global/lib/node_modules/@google/gemini-cli/{package.json,LICENSE}` (0.54.0)
- `/Users/gdc/.npm-global/lib/node_modules/@openai/codex/package.json` (0.77.0)
- `/Users/gdc/.local/share/cursor-agent/versions/2026.08.11-e8db854/package.json`, name `@anysphere/agent-cli-runtime`, `private: true`
- `/Users/gdc/.local/lib/qwen-code/LICENSE` and `package.json` (0.21.9)
- `/Users/gdc/.grok/README.md` licence section, and `/Users/gdc/.grok/bin/grok` version 1.0.3
- `/Users/gdc/.local/bin/muse` launcher and `/Users/gdc/.local/bin/muse-bin-0.1.0-R708.1`
- `/Users/gdc/.local/bin/agy`
- `/Users/gdc/.local/share/claude/versions/2.1.229`
- `/Users/gdc/getspecstory/LICENSE.txt`

**Tortie's own repository, read only**
- `src/renderer/assets/agents/*.svg`, all twelve files
- `src/renderer/icons/AgentIcon.tsx`
- `src/main/agents/registry.ts`
- `docs/research/11-agent-registry.md`
- `build/specstory-release.json`, `electron-builder.yml`, `package.json`
- `git log` commits `1794a1d` and `9522e6b`, which record where each icon came from

---

## 9. What this document is not

It is a survey of published licence and brand documents, read from primary sources on one day. It is not
legal advice and it does not predict whether any vendor would object to anything described here. Where a
document could not be read, §7 says so rather than filling the gap. Where a licence is not established,
the row says unknown, and no licence was inferred from a sibling product or from a company's usual
practice.

**Three claims in an earlier draft of this document were overturned by an independent check and are
corrected above.** The Amp entry was read from a ten-month-old local install rather than the published
package. The VS Code Copilot row cited an archived repository and reported MIT for a layer that ships
under GitHub's proprietary extension terms. The §5.1 clause table omitted Antigravity, which carries the
sharpest clause in the set. All three are now stated from the current primary source.
