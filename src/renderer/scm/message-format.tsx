/**
 * Markdown-lite commit-message formatter for the hover card (DESIGN-SPEC
 * S3A). Hand-rolled, zero deps, deliberately small: commit messages are not
 * markdown, so only the four constructs the spec sanctions are parsed —
 *
 *   - blank lines split paragraphs
 *   - runs of lines starting `- `, `* `, or `• ` become a bullet list
 *   - `backtick` spans render as inline code
 *   - bare http(s) URLs (and `#123` when a GitHub remote exists) become links
 *
 * Everything else renders literally — no headings, no bold, no HTML.
 */

import React from 'react';

// ---------------------------------------------------------------------------
// Block parsing (pure — unit-testable without React)
// ---------------------------------------------------------------------------

export type MessageBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] };

const BULLET_RE = /^\s*[-*•]\s+/;

/** Split a message body into paragraph / bullet-list blocks. */
export function parseMessageBlocks(body: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
      paragraph = [];
    }
  };
  const flushBullets = (): void => {
    if (bullets.length > 0) {
      blocks.push({ kind: 'bullets', items: bullets });
      bullets = [];
    }
  };

  for (const line of body.split('\n')) {
    if (line.trim().length === 0) {
      flushParagraph();
      flushBullets();
      continue;
    }
    if (BULLET_RE.test(line)) {
      flushParagraph();
      bullets.push(line.replace(BULLET_RE, ''));
      continue;
    }
    if (bullets.length > 0) {
      // Continuation line of the previous bullet (indented wrap).
      const last = bullets.length - 1;
      bullets[last] = `${bullets[last] ?? ''} ${line.trim()}`;
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushBullets();
  return blocks;
}

// ---------------------------------------------------------------------------
// Inline rendering
// ---------------------------------------------------------------------------

/** `code` spans, bare URLs, and #123 issue refs (GitHub remotes only). */
const INLINE_RE = /(`[^`\n]+`)|(https?:\/\/[^\s<>"'`)\]]+)|(#\d+)/g;

function renderInline(
  text: string,
  issueBase: string | null,
  keyPrefix: string
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(INLINE_RE)) {
    const idx = match.index;
    const token = match[0];
    if (idx > last) out.push(text.slice(last, idx));
    if (token.startsWith('`')) {
      out.push(
        <code key={`${keyPrefix}-c${i}`} className="scm-card-code">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('#')) {
      if (issueBase !== null) {
        out.push(
          // target=_blank routes through main's window-open handler, which
          // denies the window and hands the URL to the system browser.
          <a
            key={`${keyPrefix}-i${i}`}
            className="scm-card-link"
            href={`${issueBase}/issues/${token.slice(1)}`}
            target="_blank"
            rel="noreferrer"
          >
            {token}
          </a>
        );
      } else {
        out.push(token);
      }
    } else {
      out.push(
        <a
          key={`${keyPrefix}-u${i}`}
          className="scm-card-link"
          href={token}
          target="_blank"
          rel="noreferrer"
        >
          {token}
        </a>
      );
    }
    last = idx + token.length;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// ---------------------------------------------------------------------------
// The formatted message
// ---------------------------------------------------------------------------

export function FormattedMessage({
  subject,
  body,
  remoteUrl
}: {
  subject: string;
  body: string;
  /** GitHub https base (owner/repo) or null — enables #123 issue links. */
  remoteUrl: string | null;
}): React.JSX.Element {
  const blocks = parseMessageBlocks(body);
  return (
    <div className="scm-card-message">
      <p className="scm-card-subject">
        {renderInline(subject, remoteUrl, 'subj')}
      </p>
      {blocks.map((block, bi) =>
        block.kind === 'paragraph' ? (
          <p key={`b${bi}`} className="scm-card-para">
            {renderInline(block.text, remoteUrl, `b${bi}`)}
          </p>
        ) : (
          <ul key={`b${bi}`} className="scm-card-bullets">
            {block.items.map((item, ii) => (
              <li key={`b${bi}-${ii}`}>
                {renderInline(item, remoteUrl, `b${bi}-${ii}`)}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
