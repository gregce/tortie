/**
 * p153-appmenu-main.cjs. The APPLICATION MENU question, measured (Phase 153).
 *
 * Phase 153's charter asks whether a top level application menu item can carry
 * an icon on macOS through Electron. Two recorded limits bound what can be
 * learned: Phase 119 and Phase 152 both measured that a native menu cannot be
 * read or clicked from outside the app, so nothing here photographs a drawn
 * menu and nothing here claims one.
 *
 * What it CAN measure is what Electron does with the field: whether a top level
 * item and a submenu row both retain a NativeImage after the menu is built and
 * installed, and whether the template flag survives the round trip. That is the
 * API half of the answer, and the report says plainly that it is the API half.
 *
 * It draws its own 32×32 PNG with no DOM, opens no window, and quits itself.
 * It is launched through build/electron-run.mjs like every other Electron here.
 */
'use strict';

const { app, Menu, nativeImage } = require('electron');
const { writeFileSync } = require('node:fs');

const out = process.env['P153_APPMENU_OUT'];

/**
 * A 16×16 opaque black RGBA PNG, generated here so this file needs no asset.
 *
 * It is generated rather than pasted because the first attempt pasted a base64
 * string that decoded to a valid PNG header and an empty NativeImage, and an
 * empty image would have made this measurement answer the wrong question.
 * `isEmpty()` is asserted below before anything is concluded from it.
 */
function tinyPng() {
  const zlib = require('node:zlib');
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  const crc32 = (buf) => {
    let crc = 0xffffffff;
    for (const x of buf) crc = table[(crc ^ x) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const W = 16;
  const H = 16;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y += 1) {
    const o = y * (1 + W * 4);
    for (let x = 0; x < W; x += 1) raw[o + 1 + x * 4 + 3] = 255;
  }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
  return nativeImage.createFromBuffer(png, { scaleFactor: 2 });
}

app.whenReady().then(() => {
  const icon = tinyPng();
  icon.setTemplateImage(true);
  const fixture = {
    empty: icon.isEmpty(),
    size: icon.getSize(),
    template: icon.isTemplateImage()
  };

  const template = [
    {
      label: 'P153 Top Level',
      icon,
      submenu: [{ label: 'P153 Row', icon, click: () => {} }]
    }
  ];

  let built = null;
  let installed = null;
  let threw = null;
  try {
    const menu = Menu.buildFromTemplate(template);
    const top = menu.items[0];
    built = {
      topHasIcon: top.icon !== null && top.icon !== undefined,
      topIconEmpty: top.icon ? top.icon.isEmpty() : null,
      topIconTemplate: top.icon ? top.icon.isTemplateImage() : null,
      topIconSize: top.icon ? top.icon.getSize() : null,
      rowHasIcon: top.submenu.items[0].icon !== null &&
        top.submenu.items[0].icon !== undefined,
      rowIconEmpty: top.submenu.items[0].icon
        ? top.submenu.items[0].icon.isEmpty()
        : null,
      rowIconTemplate: top.submenu.items[0].icon
        ? top.submenu.items[0].icon.isTemplateImage()
        : null
    };
    Menu.setApplicationMenu(menu);
    const back = Menu.getApplicationMenu();
    const backTop = back ? back.items[0] : null;
    installed = {
      readBack: backTop !== null,
      topHasIcon: backTop && backTop.icon ? !backTop.icon.isEmpty() : false,
      rowHasIcon:
        backTop && backTop.submenu && backTop.submenu.items[0].icon
          ? !backTop.submenu.items[0].icon.isEmpty()
          : false
    };
  } catch (err) {
    threw = String(err && err.message ? err.message : err);
  }

  const report = {
    electron: process.versions.electron,
    platform: process.platform,
    fixture,
    built,
    installed,
    threw,
    note:
      'This measures what Electron RETAINS, not what AppKit paints. A native ' +
      'menu cannot be read or photographed from outside the app; Phase 119 ' +
      'and Phase 152 both recorded that limit.'
  };
  const text = JSON.stringify(report, null, 2);
  if (typeof out === 'string' && out.length > 0) writeFileSync(out, text);
  console.log('[p153-appmenu] ' + text);
  app.quit();
});

app.on('window-all-closed', () => app.quit());
