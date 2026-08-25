/**
 * The rules around the story panel, made mechanical (Phase 143).
 *
 * The drawing itself is held by p143-story.test.tsx. This file holds the
 * things a picture cannot show: where Escape is asked, what the stylesheet is
 * allowed to say, what the strings may not carry, that the store clears when
 * the session under it changes, and that the probe drives the shipped control
 * rather than staging the store.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as copy from '../copy';
import {
  closeStory,
  moveStoryCursor,
  noteStorySession,
  pressStoryRow,
  setStoryCursor,
  storySnapshot,
  storyTookEscape,
  toggleStory
} from '../story';

const DIR = join(__dirname, '..');
const css = readFileSync(join(DIR, 'story.css'), 'utf8');
const probe = readFileSync(join(DIR, 'shot-probe.ts'), 'utf8');
const keyboard = readFileSync(join(DIR, '..', 'app', 'keyboard.ts'), 'utf8');

/** Every sentence this phase added, by its export name. */
const STORY_STRINGS = Object.entries(copy)
  .filter(([name]) => name.startsWith('STORY_'))
  .map(([, value]) => String(value));

describe('the Escape ladder', () => {
  it('asks the story before the ask rail, and both before stepping back', () => {
    const story = keyboard.indexOf('storyTookEscape()');
    const rail = keyboard.indexOf('askRailTookEscape()');
    const back = keyboard.indexOf('backOrLeaveOverview()');
    expect(story, 'the ladder never asks the story').toBeGreaterThan(-1);
    expect(story).toBeLessThan(rail);
    expect(rail).toBeLessThan(back);
  });

  it('closes an open panel and answers true exactly once', () => {
    closeStory();
    noteStorySession('one');
    expect(storyTookEscape()).toBe(false);
    toggleStory('one');
    expect(storySnapshot().open).toBe(true);
    expect(storyTookEscape()).toBe(true);
    expect(storySnapshot().open).toBe(false);
    expect(storyTookEscape()).toBe(false);
  });
});

describe('the store', () => {
  it('clears everything when the session under it changes', () => {
    closeStory();
    noteStorySession('one');
    toggleStory('one');
    expect(storySnapshot().open).toBe(true);
    noteStorySession('two');
    const after = storySnapshot();
    expect(after.open).toBe(false);
    expect(after.sessionId).toBe('two');
    expect(after.timeline).toBeNull();
    expect(after.expanded).toBeNull();
    expect(after.cursor).toBe(0);
  });

  it('says one sentence in a build whose bridge has no reader', () => {
    closeStory();
    noteStorySession('one');
    toggleStory('one');
    expect(storySnapshot().error).toBe(copy.STORY_BRIDGE_MISSING);
    expect(storySnapshot().loading).toBe(false);
  });

  it('presses nothing when there are no rows to press', () => {
    closeStory();
    noteStorySession('one');
    toggleStory('one');
    pressStoryRow(0);
    expect(storySnapshot().expanded).toBeNull();
  });
});

describe('story.css', () => {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');

  it('names no colour of its own', () => {
    expect(stripped, 'a hex literal').not.toMatch(/#[0-9a-fA-F]{3}/);
    for (const form of ['rgb(', 'rgba(', 'hsl(', 'hsla(']) {
      expect(stripped, `a ${form} literal`).not.toContain(form);
    }
  });

  it('takes every colour and every radius from a token', () => {
    const values = [
      ...stripped.matchAll(/(?:color|background|box-shadow)\s*:\s*([^;]+);/g)
    ]
      .map((m) => m[1]?.trim() ?? '')
      .filter((v) => v !== 'none' && v !== 'inherit');
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(value, `${value} is not a token`).toContain('var(--');
    }
  });

  it('says a row can be pressed, and that the turns inside it cannot', () => {
    const row = stripped.slice(
      stripped.indexOf('.overview-story-row {'),
      stripped.indexOf('.overview-story-row.cursor')
    );
    expect(row).toContain('cursor: pointer');
    const turns = stripped.slice(stripped.indexOf('.overview-story-turns {'));
    expect(turns).toContain('cursor: default');
  });

  it('declares no motion, so the page keeps riding one flight', () => {
    expect(stripped).not.toContain('@keyframes');
    expect(stripped).not.toMatch(/\btransition\b/);
    expect(stripped).not.toMatch(/\banimation\b/);
  });
});

describe('the keys the panel takes', () => {
  const view = readFileSync(join(DIR, 'SessionStory.tsx'), 'utf8');

  it('asks first whether the press belongs to whatever has focus', () => {
    const guard = view.indexOf('belongsToTheControl(e)');
    const arrows = view.indexOf("e.key === 'ArrowDown'");
    expect(guard, 'the listener never asks').toBeGreaterThan(-1);
    expect(guard).toBeLessThan(arrows);
  });

  it('steps aside for a chorded key, which the window ladder owns', () => {
    const listener = view.slice(
      view.indexOf('const onKeyDown = (e: KeyboardEvent)')
    );
    const guard = listener.indexOf('e.metaKey || e.altKey || e.ctrlKey');
    const asks = listener.indexOf('belongsToTheControl(e)');
    expect(guard, 'the listener reads no modifier at all').toBeGreaterThan(-1);
    expect(guard).toBeLessThan(asks);
  });

  it('leaves Return to a row as well, so one row is focused and pressed', () => {
    const guard = view.slice(view.indexOf('function belongsToTheControl'));
    expect(guard).toContain('[data-story-row]');
    expect(guard).toContain("control.hasAttribute('data-story-row')");
  });

  it('leaves Return to a button or a link, and every key to a field', () => {
    const guard = view.slice(view.indexOf('function belongsToTheControl'));
    expect(guard).toContain("control.tagName === 'BUTTON'");
    expect(guard).toContain("e.key === 'Enter'");
    for (const tag of ['input', 'textarea', 'select']) {
      expect(guard).toContain(tag);
    }
  });

  it('walks from the row the keyboard is on and takes the keyboard with it', () => {
    // A row answers Return itself, so the highlight and the keyboard must
    // never sit on two different rows. Both halves are read here, because a
    // walk that starts from the highlight or a walk that leaves the keyboard
    // behind is the same defect from either end.
    const listener = view.slice(
      view.indexOf("if (e.key === 'ArrowDown' || e.key === 'ArrowUp')")
    );
    const walk = listener.slice(0, listener.indexOf("if (e.key === 'Enter')"));
    expect(walk).toContain('focusedRow(listRef.current)');
    expect(walk).toContain('moveStoryCursor(e.key === \'ArrowDown\' ? 1 : -1, standingOn)');
    expect(walk).toContain('storySnapshot().cursor');
    expect(walk).toContain('focus({');
    // And nothing is taken from a keyboard that was somewhere else.
    expect(walk).toContain('standingOn !== undefined');
  });

  it('moves the highlight when Tab steps onto a row', () => {
    expect(view).toContain('onFocus=');
    const onFocus = view.slice(view.indexOf('onFocus='));
    expect(onFocus.slice(0, 400)).toContain('setStoryCursor(i)');
  });
});

describe('the highlight and the keyboard', () => {
  /**
   * Three drawn rows in the store, read the way the panel reads them, through
   * a bridge that answers with a chain of three. The fake bridge is taken away
   * again in every case, because the cases above ask what a build with no
   * reader says.
   */
  async function threeRows(): Promise<void> {
    const holder = globalThis as { window?: unknown };
    holder.window = {
      gmux: {
        overview: {
          timeline: () =>
            Promise.resolve({
              sessionId: 'cursor-test',
              chosen: true,
              modelChanged: false,
              entries: [0, 1, 2].map((i) => ({
                text: `sentence ${String(i)}`,
                writtenAt: 1,
                fromTurn: i,
                toTurn: i,
                harness: 'claude',
                model: 'one',
                repeated: false,
                gapBefore: false
              }))
            }),
          timelineTurns: () => Promise.resolve([])
        }
      }
    };
    try {
      noteStorySession('cursor-test');
      toggleStory('cursor-test');
      // The read is a promise, so the rows land on the next tick.
      await Promise.resolve();
      await Promise.resolve();
    } finally {
      delete holder.window;
    }
    expect(storySnapshot().timeline?.entries).toHaveLength(3);
  }

  it('walks from where Tab left the keyboard rather than from the highlight', async () => {
    await threeRows();
    expect(storySnapshot().cursor).toBe(0);
    // Tab stepped onto the last row, so the highlight goes there too.
    setStoryCursor(2);
    expect(storySnapshot().cursor).toBe(2);
    // And one step up walks from that row.
    moveStoryCursor(-1, 2);
    expect(storySnapshot().cursor).toBe(1);
    closeStory();
  });

  it('holds the walk inside the list at both ends', async () => {
    await threeRows();
    moveStoryCursor(-1, 0);
    expect(storySnapshot().cursor).toBe(0);
    moveStoryCursor(1, 2);
    expect(storySnapshot().cursor).toBe(2);
    closeStory();
  });

  it('walks from the highlight when the keyboard is not on a row', async () => {
    await threeRows();
    setStoryCursor(1);
    moveStoryCursor(1);
    expect(storySnapshot().cursor).toBe(2);
    closeStory();
  });
});

describe('the sentences this phase added', () => {
  it('found them at all', () => {
    expect(STORY_STRINGS.length).toBeGreaterThan(5);
  });

  it('carry no long dash of any kind', () => {
    for (const text of STORY_STRINGS) {
      expect(text, `"${text}" holds a long dash`).not.toMatch(/[–—]/);
    }
  });

  it('carry no session vocabulary a person never chose', () => {
    for (const text of STORY_STRINGS) {
      for (const word of ['pane', 'prefix', 'tmux', 'window']) {
        expect(text.toLowerCase(), `"${text}" says ${word}`).not.toContain(
          word
        );
      }
    }
  });

  it('carry no digit, because the formatters are the only digit sources', () => {
    for (const text of STORY_STRINGS) {
      expect(text, `"${text}" holds a digit`).not.toMatch(/\d/);
    }
  });

  it('answer the two empty cases with two different sentences', () => {
    expect(copy.STORY_NO_MODEL).not.toBe(copy.STORY_NOTHING_YET);
  });
});

describe('the footer while the panel stands in', () => {
  const layer = readFileSync(join(DIR, 'OverviewLayer.tsx'), 'utf8');

  it('says the story keys rather than the level keys', () => {
    expect(layer, 'the layer never reads the story store').toContain(
      'storySnapshot'
    );
    expect(layer).toContain('FOOTER_STORY');
    expect(layer.replace(/\s+/g, ' ')).toContain(
      'story.open ? FOOTER_STORY :'
    );
  });

  it('names Return and Escape and no session vocabulary', () => {
    expect(copy.FOOTER_STORY).toContain('⏎');
    expect(copy.FOOTER_STORY).toContain('esc back');
    expect(copy.FOOTER_STORY).not.toMatch(/[–—]/);
    expect(copy.FOOTER_STORY).not.toMatch(/\d/);
    for (const word of ['pane', 'prefix', 'tmux', 'window']) {
      expect(copy.FOOTER_STORY.toLowerCase()).not.toContain(word);
    }
  });
});

describe('the mount (Phase 147)', () => {
  const lines = readFileSync(join(DIR, 'ProjectLines.tsx'), 'utf8');
  const conversation = readFileSync(
    join(DIR, 'SessionConversation.tsx'),
    'utf8'
  );

  it('the project rows mount the panel and press the store through the one toggle', () => {
    expect(lines).toContain('SessionStory');
    expect(lines).toContain('toggleStory(session.sessionId)');
    expect(lines).toContain('overview-story-toggle');
  });

  it('every row gets the control, not only a written one', () => {
    // The toggle must not sit inside the summaryWrittenAt branch: the button
    // is rendered after that conditional block closes.
    const written = lines.indexOf('session.summaryWrittenAt !== null');
    const toggle = lines.indexOf('overview-story-toggle');
    expect(written).toBeGreaterThan(-1);
    expect(toggle).toBeGreaterThan(written);
    const between = lines.slice(written, toggle);
    expect(between, 'the toggle sits inside the written branch').toContain(
      ': null}'
    );
  });

  it('what announces the panel reads the same condition that draws it', () => {
    // One storyOpen per row decides the aria answer and the mount, so no
    // surface can announce what is not on screen. The label itself never
    // changes: his refinement of 2026-08-24 makes the control the one word,
    // and aria-expanded alone carries the open state.
    expect(lines).toContain('aria-expanded={storyOpen}');
    expect(lines.replace(/\s+/g, ' ')).toContain('{STORY_WORD}');
    expect(lines.replace(/\s+/g, ' ')).toContain('{storyOpen ? ( <div className="overview-line-story">');
  });

  it('the control is the one word, lowercase, and sits as its own far right cell', () => {
    // His refinement of 2026-08-24: the word is "story", and the button is a
    // cell of the row itself rather than inline with the sentence, so it
    // holds one shared x position on every row.
    expect(copy.STORY_WORD).toBe('story');
    expect(lines).not.toContain('what has been written');
    const right = lines.indexOf('className="overview-line-right"');
    const rightClose = lines.indexOf('</div>', right);
    const toggle = lines.indexOf('overview-story-toggle');
    expect(right).toBeGreaterThan(-1);
    expect(toggle, 'the toggle sits inline inside the sentence cell').toBeGreaterThan(rightClose);
    expect(css).toContain('margin-left: auto');
  });

  it('the conversation view no longer offers the story at all', () => {
    expect(conversation).not.toContain('SessionStory');
    expect(conversation).not.toContain('overview-story-toggle');
    expect(conversation).not.toContain('toggleStory');
    expect(conversation).not.toContain('STORY_WORD');
  });

  it('a press on the toggle never also opens the session under it', () => {
    const toggle = lines.slice(lines.indexOf('overview-story-toggle'));
    const button = toggle.slice(0, toggle.indexOf('</button>'));
    expect(button).toContain('e.stopPropagation()');
    expect(button, 'the keydown reaches the layer').toContain('onKeyDown=');
  });
});

describe('the probe', () => {
  it('drives the shipped control rather than the store', () => {
    expect(probe).toContain('.overview-story-toggle');
    expect(probe).toContain('.overview-story-row');
    expect(probe, 'the probe calls the store directly').not.toMatch(
      /\btoggleStory\s*\(/
    );
    expect(probe, 'the probe calls the store directly').not.toMatch(
      /\bpressStoryRow\s*\(/
    );
  });
});
