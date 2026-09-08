(() => {
  const live = () => document.querySelector('.ed-redline-doc');
  const rep = () => document.getElementById('v237-replica');
  const rootOf = (which) => (which === 'replica' ? rep() : live());
  const under = (node, root, attr) => {
    let at = node;
    while (at !== null && at !== root) {
      if (at.nodeType === 1 && at.hasAttribute(attr)) return true;
      at = at.parentNode;
    }
    return false;
  };
  const textNodes = (root) => {
    const out = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n !== null; n = w.nextNode()) out.push(n);
    return out;
  };
  const currentNodes = (root) => textNodes(root).filter((n) => !under(n, root, 'data-redline-del'));
  const join = (list) => list.map((n) => n.nodeValue).join('');
  const offsetIn = (list, node, off) => {
    let total = 0;
    for (const n of list) {
      if (n === node) return total + off;
      total += n.length;
    }
    return -1;
  };
  const placeIn = (list, offset) => {
    let total = 0;
    for (const n of list) {
      if (offset <= total + n.length) return { node: n, offset: offset - total };
      total += n.length;
    }
    const last = list[list.length - 1];
    return last === undefined ? null : { node: last, offset: last.length };
  };
  window.__v237 = {
    rootOf,
    /** Every projection of one root, plus the structure counts. */
    read: (which) => {
      const root = rootOf(which);
      if (root === null) return { drawn: false };
      const all = textNodes(root);
      const sel = getSelection();
      const cur = currentNodes(root);
      let caret = -1;
      let caretDrawn = -1;
      if (sel !== null && sel.rangeCount > 0 && sel.focusNode !== null && root.contains(sel.focusNode)) {
        caret = offsetIn(cur, sel.focusNode, sel.focusOffset);
        caretDrawn = offsetIn(all, sel.focusNode, sel.focusOffset);
      }
      const current = join(cur);
      return {
        drawn: true,
        editable: root.isContentEditable === true,
        contentEditable: root.getAttribute('contenteditable'),
        current,
        baseline: join(all.filter((n) => !under(n, root, 'data-redline-ins'))),
        drawnText: join(all),
        changes: root.querySelectorAll('.ed-redline-change').length,
        generations: [...new Set([...root.querySelectorAll('.ed-redline-change')].map((w) => w.dataset.changeGen))],
        dels: root.querySelectorAll('[data-redline-del]').length,
        inses: root.querySelectorAll('[data-redline-ins]').length,
        insTexts: [...root.querySelectorAll('[data-redline-ins]')].map((e) => e.textContent),
        delTexts: [...root.querySelectorAll('[data-redline-del]')].map((e) => e.textContent),
        insInsideAChange: [...root.querySelectorAll('[data-redline-ins]')].every((e) => e.closest('.ed-redline-change') !== null),
        divs: root.querySelectorAll('div').length,
        brs: root.querySelectorAll('br').length,
        bolds: root.querySelectorAll('b, strong, i, em, span[style]').length,
        topLevel: root.childNodes.length,
        caret,
        caretDrawn,
        caretContext: caret < 0 ? null : current.slice(Math.max(0, caret - 8), caret) + '|' + current.slice(caret, caret + 8),
        since: document.querySelector('.ed-redline-since .banner-text')?.textContent ?? null,
        undoNote: document.querySelector('.ed-redline-undo .banner-text')?.textContent ?? null,
        toast: [...document.querySelectorAll('[class*="toast"]')].map((e) => e.textContent).join(' | ')
      };
    },
    /** Put the caret at a CURRENT-side offset in a root. */
    put: (which, offset) => {
      const r = rootOf(which);
      if (r === null) return false;
      const p = placeIn(currentNodes(r), offset);
      if (p === null) return false;
      const range = document.createRange();
      range.setStart(p.node, p.offset);
      range.collapse(true);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(range);
      r.focus();
      return true;
    },
    /** Put the caret at a DRAWN offset (deletions included). */
    putDrawn: (which, offset) => {
      const r = rootOf(which);
      if (r === null) return false;
      const p = placeIn(textNodes(r), offset);
      if (p === null) return false;
      const range = document.createRange();
      range.setStart(p.node, p.offset);
      range.collapse(true);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(range);
      r.focus();
      return true;
    },
    /** A selection over two CURRENT-side offsets. */
    select: (which, a, b) => {
      const r = rootOf(which);
      if (r === null) return false;
      const list = currentNodes(r);
      const p = placeIn(list, a);
      const q = placeIn(list, b);
      if (p === null || q === null) return false;
      const s = getSelection();
      s.removeAllRanges();
      s.setBaseAndExtent(p.node, p.offset, q.node, q.offset);
      r.focus();
      return true;
    },
    /** Where the first deletion of at least n characters sits, in DRAWN offsets. */
    delSpan: (which, least) => {
      const r = rootOf(which);
      if (r === null) return null;
      const all = textNodes(r);
      let total = 0;
      for (const n of all) {
        if (under(n, r, 'data-redline-del') && n.length >= least) {
          return { start: total, end: total + n.length, text: n.nodeValue };
        }
        total += n.length;
      }
      return null;
    },
    /** A client point inside the document, for a drag. */
    pointAt: (which, drawnOffset) => {
      const r = rootOf(which);
      if (r === null) return null;
      const p = placeIn(textNodes(r), drawnOffset);
      if (p === null) return null;
      const range = document.createRange();
      range.setStart(p.node, p.offset);
      range.setEnd(p.node, Math.min(p.node.length, p.offset + 1));
      const rect = range.getClientRects()[0];
      return rect === undefined ? null : { x: rect.left + 1, y: rect.top + rect.height / 2 };
    },
    /**
     * THE PARENT PLANT. A deep clone of the live document with
     * contenteditable="true" on it and Phase 237's contenteditable="false"
     * stripped off every deletion, outside the React tree, so not one of the
     * phase's listeners is on it. This is research 83 D.2's naive
     * contenteditable, over this tree's own markup.
     */
    plant: () => {
      const old = rep();
      if (old !== null) old.remove();
      const src = live();
      if (src === null) return false;
      const clone = src.cloneNode(true);
      clone.id = 'v237-replica';
      clone.setAttribute('contenteditable', 'true');
      for (const d of clone.querySelectorAll('[data-redline-del]')) d.removeAttribute('contenteditable');
      clone.style.position = 'fixed';
      clone.style.left = '0px';
      clone.style.top = '0px';
      clone.style.width = '640px';
      clone.style.height = '420px';
      clone.style.overflow = 'auto';
      clone.style.zIndex = '2147483000';
      clone.style.background = 'var(--bg-canvas)';
      document.body.appendChild(clone);
      return true;
    },
    unplant: () => {
      const old = rep();
      if (old !== null) old.remove();
      return true;
    }
  };
  return true;
})()
