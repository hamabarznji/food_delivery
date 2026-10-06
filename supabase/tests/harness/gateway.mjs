// Tiny API gateway + key generator for the test harness. Mirrors the URL
// layout of a Supabase project: /auth/v1 -> GoTrue, /rest/v1 -> PostgREST.
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';
export const GATEWAY_PORT = 54421;
export const SUPABASE_URL = `http://127.0.0.1:${GATEWAY_PORT}`;
export const DB_URL = 'postgres://postgres:postgres@127.0.0.1:54422/postgres';

const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
export function signKey(role) {
  const body = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ role, iss: 'supabase-test', exp: 4102444800 })}`;
  return `${body}.${crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url')}`;
}
export const ANON_KEY = signKey('anon');
export const SERVICE_KEY = signKey('service_role');

const routes = { '/auth/v1': 54499, '/rest/v1': 54430 };

export function startGateway() {
  const server = http.createServer((req, res) => {
    const cors = {
      'access-control-allow-origin': req.headers.origin || '*',
      'access-control-allow-headers': req.headers['access-control-request-headers'] || '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-expose-headers': 'content-range, x-supabase-api-version',
      'access-control-allow-credentials': 'true',
    };
    if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();

    const prefix = Object.keys(routes).find((p) => req.url.startsWith(p));
    if (!prefix) return res.writeHead(501, cors).end('{"message":"not available in test harness"}');

    const headers = { ...req.headers, host: `127.0.0.1:${routes[prefix]}` };
    // like the real gateway: the apikey doubles as the bearer token when the client sends none
    if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;

    const upstream = http.request(
      { host: '127.0.0.1', port: routes[prefix], method: req.method, path: req.url.slice(prefix.length) || '/', headers },
      (up) => {
        const out = Object.fromEntries(
          Object.entries(up.headers).filter(([k]) => !k.startsWith('access-control-'))
        );
        res.writeHead(up.statusCode, { ...out, ...cors });
        up.pipe(res);
      }
    );
    upstream.on('error', () => res.writeHead(502, cors).end('{"message":"upstream unavailable"}'));
    req.pipe(upstream);
  });
  return new Promise((resolve) => server.listen(GATEWAY_PORT, '127.0.0.1', () => resolve(server)));
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  await startGateway();
  console.log(`NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}`);
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}`);
}
