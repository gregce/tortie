// Phase 261 item 6, class 1. An msw handler DECLARES a route a test will
// answer and reaches nothing. It lives HERE, under src/mocks/, rather than
// under a test path, which is exactly why `isTestPath` never caught it and
// why the refusal has to be the FILE naming msw, the way NAMES_CLAP is in
// rules-surface.ts. Both calls are decoys: no fact under network.client.
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example/v1/users', () => HttpResponse.json({})),
  http.post('/local', () => HttpResponse.json({}))
];
