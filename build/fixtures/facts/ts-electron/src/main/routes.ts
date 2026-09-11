import { app } from './app';

function get(path: string, h: () => void): void {
  app.get(path, h);
}

get('/users', () => undefined);
app.get('--upload-pack=/x', () => undefined);
app.get('/x; rm -rf ~', () => undefined);
