/**
 * p156-generate-main.cjs. The Electron half of the menu icon generator.
 *
 * ## What it does, in one paragraph
 *
 * It opens ONE offscreen window on the built renderer with `harness=1` on the
 * URL, which is the flag `src/renderer/app/probe-loader.ts` reads to decide
 * whether to load the probe chunk. That chunk installs
 * `window.__gmuxP156MenuIcons`, which awaits the product's own
 * `warmMenuIcons()` and returns the cache it filled. The result is written as
 * JSON and the app quits itself.
 *
 * ## Why the bytes are read rather than redrawn
 *
 * Phase 156's refusal is that there is no second icon table and no second
 * rasterizer. `src/renderer/icons/codicon-menu-icon.ts` is the one place in
 * this product that turns a codicon name into pixels: it mounts a hidden span,
 * asks `getComputedStyle` what the shipped stylesheet binds to `::before`, and
 * paints that character on a canvas. This generator asks that code for its
 * answer instead of doing any of it again, so the marks on the menu bar and the
 * marks on a right click menu cannot drift apart. They are the same bytes.
 *
 * ## Why it does not talk to main
 *
 * There is no ipcMain here, so every bridge call the page makes goes
 * unanswered. That is deliberate and it costs nothing: `loadProbes()` is
 * awaited in `src/renderer/main.tsx` BEFORE `createRoot`, and the drive calls
 * `warmMenuIcons()` itself, so neither the probe chunk nor the warm pass waits
 * on a session list, a project or a settings read. The window is never shown.
 *
 * It is launched through build/electron-run.mjs like every other Electron here,
 * and it quits itself so the teardown has nothing left to end.
 */
'use strict';

const { app, BrowserWindow } = require('electron');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

const out = process.env['P156_OUT'];
const repoRoot = join(__dirname, '..');

/** Everything that went wrong, written into the report rather than thrown. */
const failures = [];

async function run() {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(repoRoot, 'out', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Offscreen would not paint the font, and a canvas asked to draw a
      // character the font has not delivered paints a blank box. The window is
      // simply never shown.
      offscreen: false
    }
  });

  await win.loadFile(join(repoRoot, 'out', 'renderer', 'index.html'), {
    search: 'harness=1'
  });

  // The probe chunk is a dynamic import, so it lands a tick or two after the
  // load event. Poll for the one property rather than guessing a delay.
  let armed = false;
  for (let waited = 0; waited < 60_000; waited += 250) {
    armed = await win.webContents.executeJavaScript(
      "typeof window.__gmuxP156MenuIcons === 'function'"
    );
    if (armed) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!armed) {
    failures.push(
      'window.__gmuxP156MenuIcons never appeared, so the probe chunk did ' +
        'not load. Check that out/renderer was built from this tree.'
    );
    return {};
  }

  const icons = await win.webContents.executeJavaScript(
    'window.__gmuxP156MenuIcons()',
    true
  );
  return icons ?? {};
}

app.on('window-all-closed', () => {
  // Nothing: the run below quits explicitly once the report is written.
});

app.whenReady().then(
  async () => {
    let icons = {};
    try {
      icons = await run();
    } catch (err) {
      failures.push(String(err));
    }
    if (out) {
      writeFileSync(out, JSON.stringify({ icons, failures }, null, 2));
    }
    app.exit(failures.length === 0 ? 0 : 1);
  },
  (err) => {
    if (out) {
      writeFileSync(
        out,
        JSON.stringify({ icons: {}, failures: [String(err)] }, null, 2)
      );
    }
    app.exit(1);
  }
);
