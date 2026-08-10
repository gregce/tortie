/**
 * AgentIcon — the real vendor mark for every place a session appears
 * (tab strip, right-docked session list, ⌘T create modal, ⌘J attention
 * overlay). Logos live in src/renderer/assets/agents/*.svg, normalized
 * copies of the SpecStory sync-cloud asset set; monochrome marks were
 * converted to `currentColor` so they tint with the surrounding text
 * (rest: --text-secondary), while inherently multi-tone marks (droid's
 * disc) render as-is. Crisp at 14–16 px: all marks are simple filled
 * geometry on 24-ish grids, inlined as SVG (no <img> rasterization).
 *
 * `codex` wears the OpenAI mark (codex.svg IS the OpenAI logo — the CLI
 * has no separate logo). Plain shells and unknown agents get a terminal
 * glyph drawn in the app's Lucide stroke style (1.5px, currentColor).
 */
import type { FC } from 'react';
import { InlineSvg } from './InlineSvg';
import ampSvg from '../assets/agents/amp.svg?raw';
import claudeSvg from '../assets/agents/claude.svg?raw';
import codexSvg from '../assets/agents/codex.svg?raw';
import cursorSvg from '../assets/agents/cursor.svg?raw';
import deepseekSvg from '../assets/agents/deepseek.svg?raw';
import droidSvg from '../assets/agents/droid.svg?raw';
import geminiSvg from '../assets/agents/gemini.svg?raw';
import githubcopilotSvg from '../assets/agents/githubcopilot.svg?raw';

/** Lucide `terminal` (matches src/renderer/app/icons.tsx stroke family). */
const TERMINAL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m4 17 6-6-6-6"/><path d="M12 19h8"/></svg>';

const LOGOS: Record<string, string> = {
  amp: ampSvg,
  claude: claudeSvg,
  codex: codexSvg,
  cursor: cursorSvg,
  deepseek: deepseekSvg,
  droid: droidSvg,
  gemini: geminiSvg,
  githubcopilot: githubcopilotSvg
};

/** Normalized-name aliases → canonical logo key. */
const ALIASES: Record<string, string> = {
  claudecode: 'claude',
  anthropic: 'claude',
  openai: 'codex',
  google: 'gemini',
  googlegemini: 'gemini',
  geminicli: 'gemini',
  ampcode: 'amp',
  sourcegraph: 'amp',
  cursoragent: 'cursor',
  factory: 'droid',
  factorydroid: 'droid',
  copilot: 'githubcopilot',
  ghcopilot: 'githubcopilot',
  githubcopilotcli: 'githubcopilot'
};

export interface AgentIconProps {
  /** Agent identifier — AgentKind ('claude' | 'codex' | 'shell') or any
   *  vendor name; matching is case/punctuation-insensitive ("GitHub Copilot"
   *  → githubcopilot). Unknown values and 'shell' render a terminal glyph. */
  agent: string;
  /** Square edge in px (default 16; designed for 14–16). */
  size?: number;
  className?: string;
}

export const AgentIcon: FC<AgentIconProps> = ({ agent, size = 16, className }) => {
  const key = agent.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const canonical = ALIASES[key] ?? key;
  const svg = LOGOS[canonical] ?? TERMINAL_SVG;
  return <InlineSvg svg={svg} size={size} {...(className !== undefined ? { className } : {})} />;
};
