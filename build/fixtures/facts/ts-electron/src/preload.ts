import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('gmux', { ping: () => 1 });
