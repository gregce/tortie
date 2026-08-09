/**
 * Context menu — DOM FALLBACK only. DESIGN.md §3 context menus are native
 * macOS menus via `ui:popupMenu` (Menu.popup in main); the store's setMenu
 * routes every trigger surface there when the bridge carries popupMenu, so
 * this component never renders in the packaged app. It remains for older
 * preloads and non-Electron test environments (same contents, same
 * keyboard behavior).
 */

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/store';

export function ContextMenu(): React.JSX.Element | null {
  const menu = useApp((s) => s.menu);
  const setMenu = useApp((s) => s.setMenu);
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  // Clamp into the viewport after first paint.
  useEffect(() => {
    if (!menu) {
      setPos(null);
      return;
    }
    setPos({ x: menu.x, y: menu.y });
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = Math.min(menu.x, window.innerWidth - r.width - 8);
      const y = Math.min(menu.y, window.innerHeight - r.height - 8);
      setPos({ x: Math.max(8, x), y: Math.max(8, y) });
    });
  }, [menu]);

  if (!menu || !pos) return null;

  return (
    <>
      <div
        className="menu-backdrop"
        onMouseDown={() => setMenu(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu(null);
        }}
      />
      <div
        ref={ref}
        className="menu"
        role="menu"
        style={{ left: pos.x, top: pos.y }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            setMenu(null);
            return;
          }
          // ↑↓ move between enabled items (native menus do; the DOM interim
          // must too), Home/End jump.
          if (
            e.key !== 'ArrowDown' &&
            e.key !== 'ArrowUp' &&
            e.key !== 'Home' &&
            e.key !== 'End'
          ) {
            return;
          }
          e.preventDefault();
          const items = Array.from(
            ref.current?.querySelectorAll<HTMLButtonElement>(
              '.menu-item:not(:disabled)'
            ) ?? []
          );
          if (items.length === 0) return;
          const current = items.findIndex(
            (el) => el === document.activeElement
          );
          let next = 0;
          if (e.key === 'ArrowDown') {
            next = current === -1 ? 0 : (current + 1) % items.length;
          } else if (e.key === 'ArrowUp') {
            next =
              current === -1
                ? items.length - 1
                : (current - 1 + items.length) % items.length;
          } else if (e.key === 'End') {
            next = items.length - 1;
          }
          items[next]?.focus();
        }}
      >
        {menu.items.map((item, i) =>
          item === 'sep' ? (
            <div key={`sep-${i}`} className="menu-sep" />
          ) : (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`menu-item${item.destructive ? ' destructive' : ''}`}
              disabled={item.disabled ?? false}
              autoFocus={i === 0}
              onClick={() => {
                setMenu(null);
                item.run();
              }}
            >
              {item.label}
              {item.hint !== undefined ? (
                <span className="menu-hint">{item.hint}</span>
              ) : null}
            </button>
          )
        )}
      </div>
    </>
  );
}
