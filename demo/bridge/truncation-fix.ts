/**
 * Neutralize @pierre/trees' measurement-based name truncation in the demo.
 *
 * The library's OverflowText draws file names through a container-query
 * measurement trick (visible + overflow copies, a `container: measure/size`
 * marker cell, `1lh` heights). In Electron's Chromium it is exact; in the
 * wild — observed in the operator's browser on 2026-08-27 — the measurement
 * collapses and every name renders as "packag……on" at generous widths. A
 * marketing demo runs in whatever browser arrives, so the demo swaps the
 * whole mechanism for plain CSS ellipsis, which is boring and identical
 * everywhere.
 *
 * The tree renders in OPEN shadow roots, where document stylesheets cannot
 * reach, so the override is adopted into every shadow root as it appears
 * (adoptedStyleSheets + one MutationObserver per root, recursively).
 */

const OVERRIDE_CSS = `
  [data-truncate-marker-cell],
  [data-truncate-fill],
  [data-truncate-content="overflow"] { display: none !important; }
  [data-truncate-container] {
    display: block !important;
    height: auto !important;
    min-width: 0;
    overflow: hidden !important;
  }
  [data-truncate-grid] { display: block !important; min-width: 0; }
  [data-truncate-content="visible"] {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    direction: ltr !important;
  }
  [data-truncate-group-container="middle"] {
    display: flex !important;
    min-width: 0;
    max-width: 100%;
  }
  [data-truncate-group-container="middle"] > * { min-width: 0; }
  /* The stem yields under pressure; the extension keeps itself whole. */
  [data-truncate-group-container="middle"] > *:first-child { flex: 0 1 auto; }
  [data-truncate-group-container="middle"] > *:last-child { flex: none; }
`;

export function installTruncationFallback(): void {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(OVERRIDE_CSS);

  // The bridge installs before any renderer module evaluates, so every
  // shadow root the app will ever create goes through this patch — no
  // MutationObserver races with custom-element upgrade timing.
  const original = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init: ShadowRootInit) {
    const root = original.call(this, init);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    return root;
  };

  // Belt for anything attached before this ran (nothing today).
  for (const el of document.querySelectorAll('*')) {
    if (el.shadowRoot)
      el.shadowRoot.adoptedStyleSheets = [
        ...el.shadowRoot.adoptedStyleSheets,
        sheet
      ];
  }
}
