/**
 * The demo's context menu: a DOM rendering of the `ui:popupMenu` contract.
 *
 * In Electron this is a native macOS menu (Menu.popup). A browser has no
 * native menus, so the demo draws one and honours the same contract: resolve
 * the clicked LEAF id, or null when dismissed. Submenu items render as an
 * indented group under their parent label (the app's own split menu already
 * ships flat for the same reason — the bridge contract is flat-friendly).
 */

interface Item {
  id?: string;
  label?: string;
  enabled?: boolean;
  destructive?: boolean;
  hint?: string;
  sublabel?: string;
  type?: 'item' | 'separator';
  submenu?: Item[];
}

interface Input {
  x: number;
  y: number;
  items: Item[];
}

export function showDemoPopupMenu(input: Input): Promise<string | null> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:transparent;';
    const menu = document.createElement('div');
    menu.style.cssText = [
      'position:absolute',
      'min-width:220px',
      'max-width:320px',
      'padding:4px',
      'border-radius:8px',
      'border:1px solid rgba(255,255,255,.14)',
      'background:#1d1f24',
      'box-shadow:0 8px 32px rgba(0,0,0,.5)',
      'font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'color:#e6e8ee',
      'user-select:none'
    ].join(';');

    let done = false;
    const finish = (id: string | null): void => {
      if (done) return;
      done = true;
      host.remove();
      resolve(id);
    };

    const addRow = (item: Item, indent: boolean): void => {
      if (item.type === 'separator') {
        const hr = document.createElement('div');
        hr.style.cssText =
          'height:1px;margin:4px 8px;background:rgba(255,255,255,.12);';
        menu.appendChild(hr);
        return;
      }
      if (item.submenu && item.submenu.length > 0) {
        const head = document.createElement('div');
        head.textContent = item.label ?? '';
        head.style.cssText =
          'padding:4px 10px;font-size:11px;letter-spacing:.04em;' +
          'text-transform:uppercase;color:rgba(230,232,238,.45);';
        menu.appendChild(head);
        for (const sub of item.submenu) addRow(sub, true);
        return;
      }
      const row = document.createElement('button');
      row.type = 'button';
      const disabled = item.enabled === false;
      row.style.cssText = [
        'display:flex',
        'align-items:baseline',
        'gap:12px',
        'width:100%',
        'border:0',
        'border-radius:5px',
        'background:transparent',
        'text-align:left',
        `padding:5px 10px 5px ${indent ? '22px' : '10px'}`,
        'font:inherit',
        `color:${
          disabled
            ? 'rgba(230,232,238,.35)'
            : item.destructive
              ? '#ff6b6b'
              : 'inherit'
        }`,
        `cursor:${disabled ? 'default' : 'pointer'}`
      ].join(';');
      const label = document.createElement('span');
      label.textContent = item.label ?? '';
      label.style.cssText = 'flex:1 1 auto;';
      row.appendChild(label);
      if (item.hint) {
        const hint = document.createElement('span');
        hint.textContent = item.hint;
        hint.style.cssText = 'color:rgba(230,232,238,.4);font-size:12px;';
        row.appendChild(hint);
      }
      if (!disabled) {
        row.addEventListener('mouseenter', () => {
          row.style.background = 'rgba(88,131,255,.25)';
        });
        row.addEventListener('mouseleave', () => {
          row.style.background = 'transparent';
        });
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          finish(item.id ?? null);
        });
      }
      menu.appendChild(row);
      if (item.sublabel) {
        const sub = document.createElement('div');
        sub.textContent = item.sublabel;
        sub.style.cssText = `padding:0 10px 5px ${
          indent ? '22px' : '10px'
        };margin-top:-3px;font-size:11px;color:rgba(230,232,238,.4);`;
        menu.appendChild(sub);
      }
    };

    for (const item of input.items) addRow(item, false);

    host.addEventListener('pointerdown', (e) => {
      if (e.target === host) finish(null);
    });
    host.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener(
      'keydown',
      function onKey(e) {
        if (e.key === 'Escape') {
          window.removeEventListener('keydown', onKey);
          finish(null);
        }
      },
      { capture: true }
    );

    host.appendChild(menu);
    document.body.appendChild(host);

    // Position after measuring, clamped to the viewport.
    const rect = menu.getBoundingClientRect();
    const x = Math.min(input.x, window.innerWidth - rect.width - 8);
    const y = Math.min(input.y, window.innerHeight - rect.height - 8);
    menu.style.left = `${Math.max(8, x)}px`;
    menu.style.top = `${Math.max(8, y)}px`;
  });
}
