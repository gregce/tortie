/**
 * build/p331/mock-responses.mjs. A LOCAL Responses provider for the real
 * installed Codex, in the probe's own process (research 133's adversary
 * shape, `scratchpad/p331/adv/adv-arm.mjs`), so `probe:p331` can make Codex
 * open a real approval and write a real rollout (and so a harvested id)
 * WITHOUT A MODEL TURN, A TOKEN, OR ANY BYTE LEAVING THE MAC FOR A MODEL.
 *
 * WHAT IT ANSWERS. `POST …/responses`, as a server-sent event stream:
 *   - a request carrying the APPROVAL MARKER and no tool output yet is answered
 *     with ONE `exec_command` function call whose `sandbox_permissions` is
 *     `require_escalated`, which is what makes Codex 0.158 open its approval
 *     overlay under `approval_policy = "on-request"` (measured, research 133
 *     §4.5). The probe never approves it: it declines with Esc.
 *   - anything else is answered with one assistant message, `REPLY`, which is
 *     the text the probe later looks for in the restored pane's history.
 * Every other request gets `404 {}`. Nothing here runs a command, writes a file
 * or opens any socket but this one listener on 127.0.0.1.
 *
 * It records a summary of each request (method, path, size, whether it
 * carried the marker or a tool output) and never a request body, because a
 * body carries the scratch prompt and nothing a report needs.
 *
 * `close()` ends the listener and every open connection. The probe calls it in
 * its `finally`.
 */

import { createServer } from 'node:http';

/** The marker a prompt carries to be answered with the escalated command. */
export const APPROVAL_MARKER = 'P331-APPROVAL';
/** The assistant message every other prompt is answered with. */
export const REPLY = 'P331-MOCK-REPLY-ONE';
/** The command the approval asks to run, which the probe never lets run. */
export const APPROVAL_COMMAND = 'touch p331-never-approved.txt';

function sse(events) {
  return events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
}

const completed = (id) => ({
  type: 'response.completed',
  response: {
    id,
    usage: { input_tokens: 0, input_tokens_details: null, output_tokens: 0, output_tokens_details: null, total_tokens: 0 }
  }
});

/**
 * Start the provider on 127.0.0.1 at a port the system picks.
 *
 * @returns {Promise<{ port: number, requests: object[], close: () => Promise<void> }>}
 */
export async function startMockResponses() {
  const requests = [];
  const sockets = new Set();
  let n = 0;
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      if (body.length < 4 * 1024 * 1024) body += chunk;
    });
    req.on('end', () => {
      const marked = body.includes(APPROVAL_MARKER);
      const toolOutput = body.includes('function_call_output');
      requests.push({ at: Date.now(), method: req.method, path: (req.url ?? '').split('?')[0], bytes: body.length, marked, toolOutput });
      if (req.method === 'POST' && /\/responses$/.test((req.url ?? '').split('?')[0])) {
        n += 1;
        const id = `resp_p331_${String(n)}`;
        const events =
          marked && !toolOutput
            ? [
                { type: 'response.created', response: { id } },
                {
                  type: 'response.output_item.done',
                  item: {
                    type: 'function_call',
                    call_id: `call_p331_${String(n)}`,
                    name: 'exec_command',
                    arguments: JSON.stringify({
                      cmd: APPROVAL_COMMAND,
                      sandbox_permissions: 'require_escalated',
                      justification: 'probe:p331 approval arm; it is declined, never run'
                    })
                  }
                },
                completed(id)
              ]
            : [
                { type: 'response.created', response: { id } },
                {
                  type: 'response.output_item.done',
                  item: { type: 'message', role: 'assistant', id: `msg_p331_${String(n)}`, content: [{ type: 'output_text', text: REPLY }] }
                },
                completed(id)
              ];
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.end(sse(events));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end('{}');
    });
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;
  return {
    port,
    requests,
    close: () =>
      new Promise((resolve) => {
        for (const s of sockets) s.destroy();
        server.close(() => resolve());
      })
  };
}
