/**
 * The agent's answer, rendered as markdown (Phase 137.1).
 *
 * Agents answer in markdown, and Phase 137 drew those answers as plain
 * text, so backticks, lists and fences arrived as punctuation. This wrapper
 * hands the answer to the editor's own markdown chunk, which the shell only
 * pays for on first use, through the same loader the file preview uses. The
 * chain it renders with is `answerRehypePlugins`, which keeps
 * `rehype-sanitize` and leaves `rehype-raw` out, so raw HTML in an answer
 * is dropped before it can become a node.
 *
 * Until the chunk and the highlighter arrive, the answer stands as the
 * plain text it always was, and a failed chunk load leaves it that way. The
 * container carries data-quoted because every word inside is the agent's
 * own, digits included, which is how the integer rule accounts for them.
 *
 * YOUR OWN ASKS DO NOT COME HERE. The person types prose, and rendering a
 * person's words would change what they wrote, e.g. an asterisk typed as an
 * asterisk. TurnBlock keeps asks plain, and the project view's one-line
 * rows never render markdown at all.
 */

import React, { useEffect, useState } from 'react';
import type { MarkdownModule } from '../editor/markdown/markdown-loader';
import {
  getLoadedMarkdown,
  loadMarkdown
} from '../editor/markdown/markdown-loader';
import type { MarkdownHighlighter } from '../editor/markdown/markdown-impl';

export interface AnswerBodyProps {
  /** The agent's closing answer, redacted by the store before it got here. */
  text: string;
}

export function AnswerBody({ text }: AnswerBodyProps): React.JSX.Element {
  const [mod, setMod] = useState<MarkdownModule | null>(getLoadedMarkdown());
  const [highlighter, setHighlighter] = useState<MarkdownHighlighter | null>(
    null
  );

  useEffect(() => {
    let alive = true;
    void loadMarkdown()
      .then(async (m) => {
        // The shared highlighter attaches this answer's fence languages
        // before the first highlighted paint, and answers null when even
        // the base highlighter is unavailable — fences then render plain.
        const h = await m.prepareHighlighter(text);
        if (!alive) return;
        setMod(m);
        setHighlighter(h);
      })
      .catch(() => {
        // The chunk failed to load. The plain text below keeps standing,
        // and the next answer mounted retries through the loader.
      });
    return () => {
      alive = false;
    };
  }, [text]);

  if (mod === null) {
    return (
      <div className="md-answer" data-quoted>
        {text}
      </div>
    );
  }
  return (
    <div className="md-answer md-answer-rendered" data-quoted>
      <mod.AnswerMarkdown source={text} highlighter={highlighter} />
    </div>
  );
}
