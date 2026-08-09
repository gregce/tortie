/**
 * Context menu — interim DOM implementation. DESIGN.md §3 specifies native
 * macOS menus via Electron Menu.popup; that needs a main-process channel the
 * frozen contract doesn't carry yet. Same menu contents, same trigger
 * surfaces — swap the rendering when the integrator adds `ui:popupMenu`.
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
          }
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
