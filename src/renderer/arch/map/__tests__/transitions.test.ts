/**
 * The staged drill transition and the gesture gate (Phase 162).
 *
 * WHAT IS HELD HERE.
 *
 *  - The FLIP math is exact: the start transform maps the destination
 *    rectangle back onto the origin, and the rest transform is identity.
 *  - REDUCED MOTION means ZERO DOM WRITES: no overlay, no class, resolved
 *    synchronously. The charter's cut-to-end-state sentence, executable.
 *  - CLEANUP IS UNCONDITIONAL: finish and cancel both remove the overlay,
 *    the dim class and the hide class, so an interrupted stage strands
 *    nothing.
 *  - The stage box is KEYED BY ID on `data-group`, the object constancy
 *    device, and only `transform` is ever animated.
 *  - The stylesheet spends tokens only, and the gesture gate kills filter
 *    and transition with `!important`, the 15.8 ms measured rule.
 *
 * No jsdom in this repository, so the driver runs over structural fakes
 * that record every mutation.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DRILL_STAGE_MS,
  GESTURE_CLASS,
  STAGE_BOX_CLASS,
  STAGE_HIDE_CLASS,
  STAGE_OUT_CLASS,
  STAGE_TRANSFORM_REST,
  runDrillStage,
  setGesturing,
  stageTransform,
  type StageRect
} from '../transitions';

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(HERE, '..', 'transitions.css'), 'utf8');
const TS = readFileSync(join(HERE, '..', 'transitions.ts'), 'utf8');

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

interface FakeAnimation {
  keyframes: Record<string, string>[];
  options: Record<string, unknown>;
  onfinish: (() => void) | null;
  oncancel: (() => void) | null;
}

interface FakeBox {
  className: string;
  dataset: Record<string, string>;
  style: Record<string, string>;
  parentNode: FakeContainer | null;
  animations: FakeAnimation[];
  animate(
    keyframes: Record<string, string>[],
    options: Record<string, unknown>
  ): FakeAnimation;
}

interface FakeContainer {
  classes: Set<string>;
  classList: { add(c: string): void; remove(c: string): void };
  children: FakeBox[];
  appendChild(child: FakeBox): void;
  removeChild(child: FakeBox): void;
  ownerDocument: { createElement(tag: string): FakeBox };
  writes: number;
}

function makeClassList(classes: Set<string>, count: () => void): {
  add(c: string): void;
  remove(c: string): void;
} {
  return {
    add(c: string): void {
      count();
      classes.add(c);
    },
    remove(c: string): void {
      count();
      classes.delete(c);
    }
  };
}

function makeContainer(withAnimate = true): FakeContainer {
  const container: FakeContainer = {
    classes: new Set<string>(),
    classList: undefined as unknown as FakeContainer['classList'],
    children: [],
    writes: 0,
    appendChild(child: FakeBox): void {
      container.writes += 1;
      container.children.push(child);
      child.parentNode = container;
    },
    removeChild(child: FakeBox): void {
      container.writes += 1;
      container.children = container.children.filter((c) => c !== child);
      child.parentNode = null;
    },
    ownerDocument: {
      createElement(): FakeBox {
        const box: FakeBox = {
          className: '',
          dataset: {},
          style: {},
          parentNode: null,
          animations: [],
          animate(keyframes, options): FakeAnimation {
            const animation: FakeAnimation = {
              keyframes,
              options,
              onfinish: null,
              oncancel: null
            };
            box.animations.push(animation);
            return animation;
          }
        };
        if (!withAnimate) {
          (box as { animate?: unknown }).animate = undefined;
        }
        return box;
      }
    }
  };
  container.classList = makeClassList(container.classes, () => {
    container.writes += 1;
  });
  return container;
}

function makeHideTarget(): { classes: Set<string>; classList: ReturnType<typeof makeClassList> } {
  const classes = new Set<string>();
  return { classes, classList: makeClassList(classes, () => {}) };
}

const asContainer = (c: FakeContainer): HTMLElement => c as unknown as HTMLElement;

const FROM: StageRect = { x: 40, y: 60, w: 100, h: 50 };
const TO: StageRect = { x: 0, y: 0, w: 400, h: 300 };

// ---------------------------------------------------------------------------
// The pure math
// ---------------------------------------------------------------------------

describe('stageTransform', () => {
  it('maps the destination back onto the origin', () => {
    expect(stageTransform(FROM, TO)).toBe(
      `translate(40px, 60px) scale(${100 / 400}, ${50 / 300})`
    );
  });

  it('rests at identity', () => {
    expect(STAGE_TRANSFORM_REST).toBe('translate(0px, 0px) scale(1, 1)');
  });

  it('guards a zero sized destination', () => {
    expect(stageTransform(FROM, { x: 0, y: 0, w: 0, h: 0 })).toBe(
      'translate(40px, 60px) scale(1, 1)'
    );
  });

  it('sits inside the research window of 200 to 300 ms', () => {
    expect(DRILL_STAGE_MS).toBeGreaterThanOrEqual(200);
    expect(DRILL_STAGE_MS).toBeLessThanOrEqual(300);
  });
});

// ---------------------------------------------------------------------------
// The driver
// ---------------------------------------------------------------------------

describe('runDrillStage', () => {
  it('reduced motion resolves synchronously with zero DOM writes', async () => {
    const container = makeContainer();
    await runDrillStage({
      container: asContainer(container),
      groupId: 'app',
      from: FROM,
      to: TO,
      reduced: () => true
    });
    expect(container.writes).toBe(0);
    expect(container.children.length).toBe(0);
    expect(container.classes.size).toBe(0);
  });

  it('stages the keyed box, dims the picture, then cleans everything', async () => {
    const container = makeContainer();
    const hide = makeHideTarget();
    const promise = runDrillStage({
      container: asContainer(container),
      groupId: 'app',
      from: FROM,
      to: TO,
      hide: hide as unknown as Element,
      reduced: () => false
    });

    // Mid flight: overlay up, keyed, at the destination geometry.
    expect(container.classes.has(STAGE_OUT_CLASS)).toBe(true);
    expect(hide.classes.has(STAGE_HIDE_CLASS)).toBe(true);
    expect(container.children.length).toBe(1);
    const box = container.children[0] as FakeBox;
    expect(box.className).toBe(STAGE_BOX_CLASS);
    expect(box.dataset['group']).toBe('app');
    expect(box.style['left']).toBe('0px');
    expect(box.style['top']).toBe('0px');
    expect(box.style['width']).toBe('400px');
    expect(box.style['height']).toBe('300px');

    // Only transform is animated, from the FLIP start to identity.
    const animation = box.animations[0] as FakeAnimation;
    expect(animation.keyframes.length).toBe(2);
    for (const frame of animation.keyframes) {
      expect(Object.keys(frame)).toEqual(['transform']);
    }
    expect(animation.keyframes[0]?.['transform']).toBe(stageTransform(FROM, TO));
    expect(animation.keyframes[1]?.['transform']).toBe(STAGE_TRANSFORM_REST);
    expect(animation.options['duration']).toBe(DRILL_STAGE_MS);

    animation.onfinish?.();
    await promise;
    expect(container.children.length).toBe(0);
    expect(container.classes.has(STAGE_OUT_CLASS)).toBe(false);
    expect(hide.classes.has(STAGE_HIDE_CLASS)).toBe(false);
  });

  it('cancel cleans up exactly like finish', async () => {
    const container = makeContainer();
    const promise = runDrillStage({
      container: asContainer(container),
      groupId: 'cli',
      from: FROM,
      to: TO,
      reduced: () => false
    });
    const box = container.children[0] as FakeBox;
    const animation = box.animations[0] as FakeAnimation;
    animation.oncancel?.();
    await promise;
    expect(container.children.length).toBe(0);
    expect(container.classes.size).toBe(0);
  });

  it('a platform without Element.animate gets the end state at once', async () => {
    const container = makeContainer(false);
    await runDrillStage({
      container: asContainer(container),
      groupId: 'app',
      from: FROM,
      to: TO,
      reduced: () => false
    });
    expect(container.children.length).toBe(0);
    expect(container.classes.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The gesture gate
// ---------------------------------------------------------------------------

describe('setGesturing', () => {
  it('toggles the one class', () => {
    const container = makeContainer();
    setGesturing(asContainer(container), true);
    expect(container.classes.has(GESTURE_CLASS)).toBe(true);
    setGesturing(asContainer(container), false);
    expect(container.classes.has(GESTURE_CLASS)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The stylesheet, reviewed the way map-render reviews map.css
// ---------------------------------------------------------------------------

describe('transitions.css', () => {
  const withoutComments = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

  it('spends tokens only, no colour literals', () => {
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(withoutComments).not.toMatch(/rgba?\(/);
    expect(withoutComments).toContain('var(--graph-dim)');
    expect(withoutComments).toContain('var(--bg-raised)');
    expect(withoutComments).toContain('var(--border)');
  });

  it('the gesture gate kills filter and transition with teeth', () => {
    expect(withoutComments).toContain(`.${GESTURE_CLASS} .arch-map-svg`);
    expect(withoutComments).toMatch(/filter:\s*none\s*!important/);
    expect(withoutComments).toMatch(/transition:\s*none\s*!important/);
  });

  it('cuts to the end state under reduced motion', () => {
    expect(withoutComments).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('the stage box transforms about its top left corner', () => {
    expect(withoutComments).toMatch(/transform-origin:\s*0 0/);
  });

  it('names every class the module exports', () => {
    for (const cls of [STAGE_OUT_CLASS, STAGE_HIDE_CLASS, STAGE_BOX_CLASS, GESTURE_CLASS]) {
      expect(withoutComments).toContain(`.${cls}`);
    }
  });
});

// ---------------------------------------------------------------------------
// The module source, the refusals that keep the motion honest
// ---------------------------------------------------------------------------

describe('transitions.ts source', () => {
  it('animates no layout property', () => {
    // The keyframes name transform and nothing else; the geometry writes
    // happen once, before the animation starts.
    const keyframesAt = TS.indexOf('box.animate(');
    expect(keyframesAt).toBeGreaterThan(-1);
    const call = TS.slice(keyframesAt, TS.indexOf('animation.onfinish'));
    expect(call).toContain('transform:');
    for (const banned of ['left:', 'top:', 'width:', 'height:', 'opacity:']) {
      expect(call).not.toContain(banned);
    }
  });

  it('never loops: no interval, no recursive rAF of its own', () => {
    expect(TS).not.toContain('setInterval');
    expect(TS).not.toContain('requestAnimationFrame');
  });
});
