/**
 * The anchor rewrite (Phase 20.5, research 39 section 2.6).
 *
 * The `gmux-preview:` handler serves a repository HTML file's bytes verbatim
 * with ONE exception, and this module is that exception. Every link that does
 * not point inside the same project is made inert before the bytes leave the
 * main process.
 *
 * ## Why a link has to be touched at all
 *
 * The application policy carries `frame-src gmux-preview:`, so a click on
 * `<a href="https://example.com/">` inside the preview frame is refused by
 * Chromium before any navigation event fires. The measured result is not a
 * warning. It is a blank frame: `document.body.innerText` came back empty. One
 * external link in a page and the reader's preview is an empty rectangle.
 *
 * ## Why the fix is NOT a sentinel URL, and this is a refusal
 *
 * An earlier draft rewrote external hrefs to
 * `gmux-preview://<token>/__external?u=<encoded>`, so that `will-frame-navigate`
 * would fire and the main process could call `shell.openExternal`. That is cut,
 * and it must stay cut. One line in a previewed file fired the event on load,
 * with no script and no click:
 *
 *     <iframe width=1 height=1 src="/__external?u=https%3A%2F%2Fevil.example%2F">
 *
 * The event carried the attacker's exact URL, and substituting
 * `file:///Applications/Calculator.app` produced the same event with the scheme
 * intact. So the scheme was the page author's choice as well as the address.
 *
 * **Nothing this module writes is ever a URL the main process acts on.** The
 * rewrite only ever REMOVES an attribute and adds a `title` string. There is no
 * path out of a previewed document into main, and a test asserts this file
 * never names `shell`, `openExternal` or a sentinel route.
 *
 * ## Why parse5 and not a regular expression
 *
 * A pattern over `href="..."` matches text that is not a link. Both of these
 * are in the fixture, and both fool a regular expression:
 *
 *     <!-- <a href="https://commented.example/">not a link</a> -->
 *     <div data-snippet='<a href="https://attr.example/">'>not a link either</div>
 *
 * Rewriting either one changes bytes the page never treats as a link, which is
 * how a "safe" transform corrupts a page's visible content. parse5 7.3.0 is
 * already in the tree under `rehype-raw`, so a real parse costs no new package.
 * It is promoted to a direct dependency rather than imported by accident.
 *
 * ## What this module is
 *
 * A pure function over a string. No file system, no Electron, no IPC. That is a
 * property worth keeping: it is why the rewrite can be unit tested against the
 * attacks above without an app.
 *
 * ## The two documents it refuses
 *
 * A document over `ANCHOR_PARSE_CAP_BYTES`, and a document nested deeper than
 * `MAX_NESTING_DEPTH`. Both refusals return the reason and NOT the bytes, so a
 * caller cannot serve an unrewritten document by mistake. The reason each
 * number is what it is sits on the constant.
 */

import { defaultTreeAdapter, parse, serialize } from 'parse5';
import type {
  DefaultTreeAdapterMap,
  DefaultTreeAdapterTypes,
  TreeAdapter
} from 'parse5';

type Node = DefaultTreeAdapterTypes.Node;
type Element = DefaultTreeAdapterTypes.Element;

/**
 * Largest document this module will parse.
 *
 * Deliberately the same number as `READ_CAP_BYTES` in `src/main/fs/ipc.ts`, the
 * cap on reading a file as text. Source and Preview must refuse the same file:
 * a tab that shows a rendered page it cannot show the source of, or the
 * reverse, reads as a bug in whichever half is missing. If one of the two
 * numbers moves, the other has to move with it.
 *
 * The cost of the cap, measured on this machine on 2026-08-13 with parse5
 * 7.3.0 on Node 24: a 1,048,709 byte document took 51 ms to parse and 12 ms to
 * serialise, and a 5,243,009 byte document took 143 ms and 105 ms. The parse
 * runs on the main process thread, so the worst case here is about 250 ms of
 * blocked main process, once, for a document the user asked to see. That is
 * the reason the number is written down rather than left implicit. Moving the
 * parse to a worker is the fix if it ever needs one.
 *
 * The byte count alone does NOT bound the cost. Nesting depth does, and
 * `MAX_NESTING_DEPTH` is the guard for that.
 */
export const ANCHOR_PARSE_CAP_BYTES = 5 * 1024 * 1024;

/**
 * Deepest element nesting this module will accept.
 *
 * ## The two defects this number exists for, both measured on 2026-08-13
 *
 * **parse5's serialiser is recursive and overflows the stack.** With a plain
 * Node stack of 9,181 frames, a tree 1,000 elements deep serialised fine and
 * one 2,000 deep threw `RangeError: Maximum call stack size exceeded`. That is
 * a 22,026 byte file. parse5's PARSER has no such limit and built a tree
 * 100,004 deep without complaining, so without this guard a small file in a
 * cloned repository throws out of the protocol handler.
 *
 * **The parse is quadratic in depth.** 20,000 nested `<div>` elements in a
 * 220,001 byte file took 1,136 ms, 60,000 took about 11 s and 100,000 took
 * about 31 s. The same 20,000 elements as SIBLINGS took 10 ms. The main
 * process supervises tmux, so a 31 s stall there is not a delay, and it is
 * reachable from a file well under the byte cap above.
 *
 * ## Why the guard is a tree adapter and not a scan of the text
 *
 * The cheap version is to scan the bytes counting `<` against `</`. It is
 * wrong, and the measurement says how wrong. HTML closes many tags implicitly,
 * so 20,000 `<li>` elements written without a single `</li>` look 20,000 deep
 * to a scan and are 4 deep in the tree, parsing in 8 ms. The same is true of
 * 20,000 `<tr><td>` cells, which are 6 deep and parse in 14 ms. Both are
 * ordinary generated HTML and both would have been refused.
 *
 * So the depth is counted by parse5's own tree adapter as the tree is built,
 * which is exact and which aborts the parse at the moment the limit is
 * crossed. The 100,000 deep file is then refused in 4 ms rather than 31 s, and
 * the guard costs 13 ms on a 5 MB flat document, 179 ms against 166 ms.
 *
 * 512 is chosen for the margin: it is between 2 and 4 times under the measured
 * serialiser ceiling, which leaves room for a smaller stack in the Electron
 * main process than the one these numbers were taken on.
 */
export const MAX_NESTING_DEPTH = 512;

/** What the rewrite did, or the honest reason it did nothing. */
export type AnchorRewrite =
  | AnchorRewriteOk
  | AnchorRewriteTooLarge
  | AnchorRewriteTooDeep;

export interface AnchorRewriteOk {
  status: 'ok';
  /** The document to serve. Never the input string. */
  html: string;
  /**
   * Links that pointed outside this project and are now dead. This is the
   * number the line under the frame reports, so the reader knows the page had
   * links and that they are not broken by accident.
   */
  inertLinks: number;
  /**
   * Link attributes removed outright, counted across the whole document. See
   * `STRIPPED_LINK_ATTRIBUTES` for the two and the reason for each. Diagnostic
   * rather than user facing: the line under the frame reports `inertLinks`.
   */
  strippedAttributes: number;
}

/**
 * Over the cap, and the bytes are NOT returned.
 *
 * Leaving the input out of this result is the point. A caller cannot fall back
 * to serving the file unrewritten by accident, because it does not have it
 * here. Over the cap means refuse the preview and say why, which is the same
 * answer the editor gives for a text file it could only read half of.
 */
export interface AnchorRewriteTooLarge {
  status: 'too-large';
  bytes: number;
  capBytes: number;
}

/**
 * Nested deeper than `MAX_NESTING_DEPTH`, and the bytes are NOT returned, for
 * the same reason they are not returned above.
 *
 * The observed depth is deliberately absent. The parse stops at the moment the
 * limit is crossed, so the only honest thing to report is that the document is
 * deeper than the limit, and the limit itself.
 */
export interface AnchorRewriteTooDeep {
  status: 'too-deep';
  maxDepth: number;
}

/** Thrown by the guarded tree adapter, caught in this file, never escapes. */
class DocumentTooDeep extends Error {}

/**
 * parse5's own tree adapter, with a depth counter on the three calls that
 * attach a node to a parent.
 *
 * A `WeakMap` from node to depth is what makes this cheap. Walking up
 * `parentNode` on every append would be O(depth) per node and would restore
 * the quadratic behaviour the guard exists to remove.
 *
 * `setTemplateContent` is here with the other two because a `<template>` holds
 * its children in a separate fragment rather than in `childNodes`. Without the
 * line, depth restarts at zero inside every template and a document could nest
 * past the limit one template at a time.
 */
function depthGuardedAdapter(): TreeAdapter<DefaultTreeAdapterMap> {
  const depthOf = new WeakMap<object, number>();
  const descend = (parent: object, child: object): void => {
    const depth = (depthOf.get(parent) ?? 0) + 1;
    if (depth > MAX_NESTING_DEPTH) throw new DocumentTooDeep();
    depthOf.set(child, depth);
  };
  return {
    ...defaultTreeAdapter,
    appendChild(parent, child) {
      descend(parent, child);
      defaultTreeAdapter.appendChild(parent, child);
    },
    insertBefore(parent, child, reference) {
      descend(parent, child);
      defaultTreeAdapter.insertBefore(parent, child, reference);
    },
    setTemplateContent(template, content) {
      descend(template, content);
      defaultTreeAdapter.setTemplateContent(template, content);
    }
  };
}

/** Elements that carry a clickable `href`. SVG has no `area`. */
const LINK_ELEMENTS: ReadonlySet<string> = new Set(['a', 'area']);

/**
 * Every element this module touches at all.
 *
 * `form` is here and is not in `LINK_ELEMENTS`, because a form has no `href`
 * and must not go through the inert-link branch. What it does have is
 * `target`, and the reason to take that away is the reason below.
 *
 * The layer is a second lock rather than the first one. A `target="_blank"`
 * form submit and a `target="_top"` form submit were both driven with real
 * mouse clicks in the running app on 2026-08-13, and both were stopped by
 * `form-action 'none'` in the response policy and by the sandbox, with no new
 * window and nothing reaching a local sink. Nothing got through. The attribute
 * is stripped anyway so that the set below covers what its own comment says it
 * covers.
 */
const TARGETED_ELEMENTS: ReadonlySet<string> = new Set(['a', 'area', 'form']);

/**
 * Attributes stripped from every element in `TARGETED_ELEMENTS`, whatever it
 * points at.
 *
 * `target` goes because under `sandbox=""` a popup is blocked, with no
 * `allow-popups` and no `allow-top-navigation`. So on an internal link `target`
 * can only turn a working navigation into a dead click, and on an external link
 * it is the `setWindowOpenHandler` route that research 39 section 2.6 records
 * as untested under a sandbox and explicitly not a plan. Neither case wants it.
 *
 * `ping` goes because it is a background POST to an address of the page's
 * choosing on every click. The child response policy already refuses it under
 * `default-src 'none'`, so this is the second lock and not the first one.
 */
const STRIPPED_LINK_ATTRIBUTES: ReadonlySet<string> = new Set([
  'target',
  'ping'
]);

/**
 * True when `href` resolves to a document inside THIS project's preview
 * origin, which is the only place a link may still go.
 *
 * Both halves of the test earn their place.
 *
 * The scheme check is the obvious one: `https:`, `file:`, `mailto:`,
 * `javascript:` and `data:` all fail it. Note that hand-rolling this check
 * would be wrong, because the URL parser strips leading whitespace and interior
 * tabs and newlines before reading a scheme, so `java&#9;script:alert(1)` is a
 * `javascript:` URL and a string comparison does not see it.
 *
 * The HOST check is the one that is easy to miss. A protocol-relative href of
 * `//evil.example/x` carries no scheme, so it inherits ours and resolves to
 * `gmux-preview://evil.example/x`, which passes a scheme-only test. The host
 * segment of this scheme is a per-project token, so comparing it also stops a
 * page in one project linking into another project's preview origin. Tortie
 * holds several projects in one window, which is why that case is real.
 */
function staysInsideProject(href: string, base: URL): boolean {
  let resolved: URL;
  try {
    resolved = new URL(href, base);
  } catch {
    return false;
  }
  return (
    resolved.protocol === base.protocol &&
    resolved.host.toLowerCase() === base.host.toLowerCase()
  );
}

/**
 * Every element in the tree, including the contents of a `<template>`.
 *
 * ## Why this holds its own stack instead of recursing
 *
 * A recursive walk adds a second stack ceiling on top of the one parse5's
 * serialiser already has, at a depth nobody would know until a file hit it.
 * `MAX_NESTING_DEPTH` keeps both of them out of reach, so this is the cheaper
 * of two safe choices rather than a fix for a measured failure here. An
 * explicit stack has no ceiling at all, which is the right shape for a walk
 * over a document from a cloned repository.
 *
 * A template's children live in `content`, not in `childNodes`. Nothing in a
 * template renders and no script runs here to clone one, so an anchor in there
 * can never be clicked. It is still walked, because parse5 serialises
 * `content` and the served bytes should not carry a live external href
 * anywhere. That makes "no external href survives" something a verifier can
 * check with grep, rather than a claim about which nodes render.
 */
function walk(root: Node, visit: (el: Element) => void): void {
  const pending: Node[] = [root];
  for (;;) {
    const node = pending.pop();
    if (node === undefined) return;
    if ('tagName' in node) visit(node);
    if ('content' in node && node.content) pending.push(node.content);
    if ('childNodes' in node) {
      for (const child of node.childNodes) pending.push(child);
    }
  }
}

/**
 * Make every link that leaves this project inert, and return the document to
 * serve.
 *
 * `documentUrl` is the handler's own `request.url`. It is the base every
 * relative href resolves against, and it is where the project token comes from.
 * It must be a URL: the handler builds it from a request it received, so a
 * string that does not parse is a programming error and this throws rather than
 * quietly treating every link on the page as external.
 *
 * On an external link the `href` is removed, the visible text is left exactly
 * as the author wrote it, and the address moves to `title` so hovering still
 * shows where the link pointed. An author's own `title` is not overwritten,
 * which does lose the address on those links. That is the smaller harm: the
 * page's own words are what the reader came for.
 */
export function rewriteExternalAnchors(
  html: string,
  documentUrl: string
): AnchorRewrite {
  const bytes = Buffer.byteLength(html, 'utf8');
  if (bytes > ANCHOR_PARSE_CAP_BYTES) {
    return { status: 'too-large', bytes, capBytes: ANCHOR_PARSE_CAP_BYTES };
  }

  const base = new URL(documentUrl);
  let document: DefaultTreeAdapterTypes.Document;
  try {
    document = parse(html, { treeAdapter: depthGuardedAdapter() });
  } catch (error) {
    if (error instanceof DocumentTooDeep) {
      return { status: 'too-deep', maxDepth: MAX_NESTING_DEPTH };
    }
    throw error;
  }
  let inertLinks = 0;
  let strippedAttributes = 0;

  walk(document, (element) => {
    const tag = element.tagName.toLowerCase();
    if (!TARGETED_ELEMENTS.has(tag)) return;

    const kept = element.attrs.filter(
      (attr) => !STRIPPED_LINK_ATTRIBUTES.has(attr.name.toLowerCase())
    );
    strippedAttributes += element.attrs.length - kept.length;

    // A form is stripped and then left alone. Its `action` is not a link and
    // is not rewritten: `form-action 'none'` in the response policy is what
    // stops a submit, and removing the attribute here would change what the
    // page shows without adding a lock.
    if (!LINK_ELEMENTS.has(tag)) {
      element.attrs = kept;
      return;
    }

    // `name` and not `prefix`: an `<a xlink:href>` inside inline SVG is a link
    // the same way an HTML one is, and parse5 gives it the name 'href' with the
    // prefix held separately.
    const href = kept.find((attr) => attr.name.toLowerCase() === 'href');
    if (href && !staysInsideProject(href.value, base)) {
      const address = href.value.trim();
      element.attrs = kept.filter((attr) => attr !== href);
      const titled = element.attrs.some(
        (attr) => attr.name.toLowerCase() === 'title'
      );
      if (!titled && address !== '') {
        element.attrs.push({ name: 'title', value: address });
      }
      inertLinks += 1;
      return;
    }
    element.attrs = kept;
  });

  return {
    status: 'ok',
    html: serialize(document),
    inertLinks,
    strippedAttributes
  };
}
