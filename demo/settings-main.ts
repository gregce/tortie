/**
 * Demo entry for the Settings window: same fixture bridge, then the real
 * settings renderer. In Electron this is a second BrowserWindow; in the
 * demo it is a popup the bridge's `openSettings` opens (see install.ts).
 * The dynamic import is the same ordering guarantee ./main.ts explains.
 */
import { installDemoBridge } from './bridge/install';

installDemoBridge();

void import('../src/renderer/settings/main');
