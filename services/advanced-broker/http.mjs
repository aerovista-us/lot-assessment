import { createServer } from 'node:http';

/** Loopback-only server: no public listener, proxy, or CORS authorization implied. */
export function createAdvancedBrokerHttp({ handle, hostname = '127.0.0.1', maxBytes = 2_000_000 }) {
  if (typeof handle !== 'function' || !['127.0.0.1', '::1'].includes(hostname))
    throw Error('broker_must_bind_loopback');
  return createServer(async (request, response) => {
    const headers = { 'cache-control': 'private, no-store', 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff' };
    const send = (status, body) => { response.writeHead(status, headers); response.end(JSON.stringify(body)); };
    let size = 0; const parts = [];
    try {
      for await (const chunk of request) {
        size += chunk.length;
        if (size > maxBytes) { send(413, { error: 'payload_too_large' }); return; }
        parts.push(chunk);
      }
      const result = await handle({ method: request.method, path: request.url, headers: request.headers, rawBody: Buffer.concat(parts).toString('utf8') });
      send(result.status, result.body);
    } catch {
      if (!response.headersSent) send(503, { error: 'broker_unavailable' });
    }
  });
}
