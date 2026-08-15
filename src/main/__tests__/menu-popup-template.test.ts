/**
 * The native menu TEMPLATE (Phase 39).
 *
 * `Menu.popup` opens an OS-owned window, so no screenshot and no live probe
 * can read the menu macOS drew. The template handed to `Menu.buildFromTemplate`
 * is the last point where the shape is still data, which makes it the only
 * place the submenu can be proved. `toMenuTemplate` was extracted from the
 * handler so this file can call it without an Electron window.
 */

import { describe, expect, it, vi } from 'vitest';
import type { PopupMenuItem } from '@shared/ipc';
import { toMenuTemplate } from '../menu-popup';

interface TemplateEntry {
  label?: string;
  type?: string;
  enabled?: boolean;
  accelerator?: string;
  click?: () => void;
  submenu?: TemplateEntry[];
}

function item(id: string, label: string, extra: Partial<PopupMenuItem> = {}): PopupMenuItem {
  return { id, label, ...extra };
}

describe('a flat menu', () => {
  it('gives every item a click and turns separators into separators', () => {
    const clicked: string[] = [];
    const template = toMenuTemplate(
      [
        item('item-0', 'Open'),
        { id: 'sep-1', label: '', type: 'separator' },
        item('item-2', 'Rename…', { hint: 'F2' })
      ],
      (id) => clicked.push(id)
    ) as TemplateEntry[];

    expect(template.map((e) => e.label ?? e.type)).toEqual([
      'Open',
      'separator',
      'Rename…'
    ]);
    expect(template[2]?.accelerator).toBe('F2');
    template[0]?.click?.();
    expect(clicked).toEqual(['item-0']);
  });
});

describe('an item with a submenu', () => {
  const items: PopupMenuItem[] = [
    item('item-0', 'Open'),
    item('item-1', 'Open in New Tab'),
    item('item-2', 'Open With', {
      submenu: [
        item('item-2-0', 'Preview (default)'),
        { id: 'sep-2-1', label: '', type: 'separator' },
        item('item-2-2', 'Bear'),
        item('item-2-3', 'Safari'),
        { id: 'sep-2-4', label: '', type: 'separator' },
        item('item-2-5', 'Other…')
      ]
    })
  ];

  it('nests the whole submenu, in order, with its separators', () => {
    const template = toMenuTemplate(items, vi.fn()) as TemplateEntry[];
    const parent = template[2];
    expect(parent?.label).toBe('Open With');
    expect(parent?.submenu).toHaveLength(6);
    expect(parent?.submenu?.map((e) => e.label ?? e.type)).toEqual([
      'Preview (default)',
      'separator',
      'Bear',
      'Safari',
      'separator',
      'Other…'
    ]);
  });

  it('gives the parent NO click, so no id it owns can come back', () => {
    const template = toMenuTemplate(items, vi.fn()) as TemplateEntry[];
    expect(template[2]?.click).toBeUndefined();
  });

  it('reports the leaf id when a nested item is picked', () => {
    const clicked: string[] = [];
    const template = toMenuTemplate(items, (id) => clicked.push(id)) as TemplateEntry[];
    template[2]?.submenu?.[3]?.click?.();
    expect(clicked).toEqual(['item-2-3']);
  });
});
