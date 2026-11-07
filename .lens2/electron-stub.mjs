/* The minimal Electron surface the agent-access service, facts, dispatch and the
 * settings store touch, all aimed at a scratch root. Nothing here is the operator's. */
const root = process.env['LENS2_ROOT'] ?? '/tmp/lens2-stub';
export const app = {
  getPath: (name) => (name === 'userData' ? `${root}/ud` : `${root}/${name}`),
  getAppPath: () => process.env['LENS2_REPO'] ?? '/private/var/tmp/tortie-wt/wt-p359',
  isReady: () => true,
  getVersion: () => '0.114.1-lens2',
};
export const safeStorage = {
  isEncryptionAvailable: () => false,
  encryptString: (s) => Buffer.from(String(s)),
  decryptString: (b) => Buffer.from(b).toString(),
};
export const ipcMain = { handle: () => {}, on: () => {}, removeHandler: () => {} };
export const webContents = { getAllWebContents: () => [] };
export default { app, safeStorage, ipcMain, webContents };
